/* =========================================================
   중2 Ⅷ. 별과 우주 - 별의 밝기와 색  [9과15-01] 뒷부분
   탐구 흐름(4단계):
   ① 관찰: 겨울 밤하늘 — 별의 밝기와 등급(1등급 차 ≈ 2.5배, 5등급 차 = 100배)
   ② 실험: 디지털 조도 센서로 거리에 따른 빛의 세기(거리 2배 → 1/4, 3배 → 1/9)
   ③ 설명: 겉보기 등급과 절대 등급(10 pc 기준) → 거리 짐작
   ④ 탐구: 별 모형의 표면 온도와 색
   (식·로그·분광형·H-R도는 화면에 쓰지 않는다. 내부 계산에만 쓴다.)
   ========================================================= */
(function () {
  'use strict';
  const { $, Sound, clamp, lerp, approach, tween } = SciSim;
  const TAU = Math.PI * 2;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const JUA = '"Jua",' + FONT;
  const RM = SciSim.reduceMotion;
  const rgba = SciSim.color.rgba;
  const easeIO = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = SciSim.ease.outBack;

  /* ---------- 화면 배치 (wide 태블릿 / tall 휴대폰) ---------- */
  const LAYOUTS = {
    wide: { kind: 'wide', vw: 800, vh: 560 },
    tall: { kind: 'tall', vw: 520, vh: 860 },
  };
  const R_ = (x, y, w, h) => ({ x, y, w, h });

  /* ---------- 상태 ---------- */
  const SCENES = { sky: '🌌 겨울철 남쪽 밤하늘', lab: '🔦 불을 끈 실험실', map10: '🗺 10 pc 거리 지도', heater: '⭐ 별 모형과 색' };
  const SCENE_BY_LEVEL = ['sky', 'lab', 'map10', 'heater'];
  const S = {
    scene: 'sky', freeScene: null,
    // 1단계: 하늘 · 등급 비교기
    taps: [], tags: [], shake: {}, cmpOn: false, cmpM: 6, cmpVis: new Set([6]),
    // 2단계: 실험실
    sensor: 30, data: [], fresh: null, sensorDrag: false, sensorMoved: false,
    // 3단계: 10 pc 지도
    tokens: [], selTok: 'sun', tokDrag: null, sortMode: false, sortDone: false, sortT: 0,
    // 4단계: 별 모형
    T: 4000, tHold: { red: 0, yellow: 0, white: 0, blue: 0 }, tDrag: false, ladderMode: false, ladderDone: false, ladderT: 0,
  };
  const A = {
    sceneA: 1, cmpF: 1, readV: 1600, sensorV: 30, mV: -26.7, TV: 4000, flashA: 0, icons: new Array(100).fill(0),
  };
  let FEAT = new Set();
  let game = null;
  const on = (f) => (game && game.free) || FEAT.has(f);
  const sceneNow = () => (game && game.free && S.freeScene ? S.freeScene : SCENE_BY_LEVEL[game ? game.level : 0]);
  const particles = new SciSim.Particles();

  /* ---------- 데이터 ---------- */
  // 오리온자리 주변 (wide 가상 좌표, 등급, 색)
  const ORION = [
    { id: 'betel', name: '베텔게우스', x: 300, y: 150, m: 0.5, color: '#ffcfa0' },
    { id: 'bella', name: '벨라트릭스', x: 470, y: 160, m: 1.64, color: '#cfe0ff' },
    { id: 'meissa', name: '메이사', x: 385, y: 105, m: 3.4, color: '#dce8ff' },
    { id: 'alnitak', name: '알니탁', x: 355, y: 265, m: 1.77, color: '#d2e2ff' },
    { id: 'alnilam', name: '알닐람', x: 390, y: 255, m: 1.69, color: '#cfe0ff' },
    { id: 'mintaka', name: '민타카', x: 425, y: 245, m: 2.23, color: '#d6e4ff' },
    { id: 'saiph', name: '사이프', x: 330, y: 370, m: 2.09, color: '#d2e0ff' },
    { id: 'rigel', name: '리겔', x: 495, y: 360, m: 0.13, color: '#cfe0ff' },
    { id: 'sirius', name: '시리우스', x: 150, y: 340, m: -1.46, color: '#f2f6ff' },
  ];
  const RANK = [['sirius', -1.5], ['rigel', 0.1], ['bella', 1.6], ['mintaka', 2.2], ['meissa', 3.4]];   // 밝은 순서 (미션 1)
  const RING = { sirius: 'C', rigel: 'E', bella: 'A', mintaka: 'D', meissa: 'B' };
  const LINES = [['betel', 'meissa'], ['meissa', 'bella'], ['betel', 'alnitak'], ['bella', 'mintaka'], ['alnitak', 'alnilam'], ['alnilam', 'mintaka'], ['alnitak', 'saiph'], ['mintaka', 'rigel']];
  const ORI = (id) => ORION.find((s) => s.id === id);

  /* ---------- 그리기 도우미 ---------- */
  const spriteCache = {};
  function glowSprite(color) {
    if (spriteCache[color]) return spriteCache[color];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.1, 'rgba(255,255,255,.92)');
    gr.addColorStop(0.28, rgba(color, 0.55)); gr.addColorStop(0.62, rgba(color, 0.14)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (spriteCache[color] = c);
  }
  function flareSprite() {
    if (spriteCache.flare) return spriteCache.flare;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const h = g.createLinearGradient(0, 0, 128, 0);
    h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.5, 'rgba(255,255,255,.95)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = h; g.fillRect(0, 62, 128, 4);
    const v = g.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.5, 'rgba(255,255,255,.95)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(62, 0, 4, 128);
    return (spriteCache.flare = c);
  }
  /* 빛나는 별: 글로우 + (선택) 4갈래 빛살 (flare = 빛살의 반지름) */
  function star(ctx, x, y, r, color, o) {
    o = o || {};
    const a = o.alpha != null ? o.alpha : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    const R2 = r * (o.halo || 3.2);
    ctx.drawImage(glowSprite(color || '#cfe4ff'), x - R2, y - R2, R2 * 2, R2 * 2);
    if (o.flare) { const f = o.flare; ctx.globalAlpha = a * 0.8; ctx.drawImage(flareSprite(), x - f, y - f, f * 2, f * 2); }
    ctx.restore();
  }
  function txt(ctx, s, x, y, size, color, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || 700) + ' ' + size + 'px ' + (o.font || FONT);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color || '#fff';
    if (o.maxW) ctx.fillText(s, x, y, o.maxW); else ctx.fillText(s, x, y);
    ctx.restore();
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function pill(ctx, x, y, s, o) {
    o = o || {};
    const size = o.size || 13;
    ctx.save();
    ctx.font = '800 ' + size + 'px ' + FONT;
    const tw = ctx.measureText(s).width, pad = o.pad != null ? o.pad : 9, h = size + 11;
    let lx = x - tw / 2 - pad;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - tw - pad * 2;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    rr(ctx, lx, y - h / 2, tw + pad * 2, h, h / 2);
    ctx.fillStyle = o.bg || 'rgba(8,16,40,.78)'; ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(s, lx + pad, y + 1);
    ctx.restore();
    return { x: lx, y: y - h / 2, w: tw + pad * 2, h };
  }
  function glass(ctx, r, rad, alpha) {
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, rad || 16);
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha || 0.06) + ')'; ctx.fill();
    ctx.strokeStyle = 'rgba(180,205,255,.22)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.beginPath(); ctx.moveTo(r.x + 16, r.y + 0.8); ctx.lineTo(r.x + r.w - 16, r.y + 0.8); ctx.stroke();
    ctx.restore();
  }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function starPoly(ctx, x, y, R, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rad = i % 2 ? r : R, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath();
  }
  const fmtM = (m) => (m < 0 ? '−' : '') + Math.abs(m).toFixed(1);
  const fmtMs = (m) => (m < -0.05 ? '−' : m > 0.05 ? '+' : '') + Math.abs(m).toFixed(1);   // 부호를 붙인 등급

  /* ---------- 등급 → 그림 (STEP 1·3 공통) ---------- */
  const brightOf = (m) => Math.pow(10, -0.4 * (m + 1.5));
  function starVis(m) {
    let r = 1.5 + 10 * Math.pow(10, -0.2 * (m + 1.5)), wash = 0;
    if (r > 26) { wash = clamp((r - 26) / 260, 0, 1); r = 26 + Math.min(14, (r - 26) * 0.02); }
    const b = Math.sqrt(clamp(brightOf(m), 0, 1));
    return { r, wash, alpha: clamp(0.3 + 0.7 * b, 0.3, 1), glow: r * 3.5 };
  }
  function drawMagStar(ctx, x, y, m, color, tw, o) {
    o = o || {};
    const v = starVis(m);
    const k = (1 + (RM ? 0 : (tw || 0))) * (o.k || 1);
    star(ctx, x, y, v.r * k, color, { halo: 3.5, alpha: Math.max(v.alpha, o.minA || 0) * (o.alpha != null ? o.alpha : 1), flare: v.r > 5.5 ? v.r * 3.4 * k : 0 });
    ctx.fillStyle = '#fff'; ctx.globalAlpha = (o.alpha != null ? o.alpha : 1); ctx.beginPath(); ctx.arc(x, y, Math.max(1.1, v.r * 0.32 * k), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    return v;
  }
  /* 별 색: 표면 온도 → 색 (모든 온도에서 비슷한 밝기로 보이게 한 색 표) */
  const TEMP_COLORS = [[2500, '#ff4a22'], [3000, '#ff6a30'], [3600, '#ff8a42'], [4300, '#ffab5e'], [5000, '#ffc878'], [5800, '#ffe27a'], [6500, '#fff1b4'], [7500, '#f1f3ff'], [9000, '#d6e3ff'], [11000, '#bcd2ff'], [15000, '#9dbcff'], [30000, '#7fa3ff']];
  const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function tempColor(T) {
    T = clamp(T, 2500, 30000);
    let i = 0;
    while (i < TEMP_COLORS.length - 2 && T > TEMP_COLORS[i + 1][0]) i++;
    const a = TEMP_COLORS[i], b = TEMP_COLORS[i + 1], u = clamp((Math.log(T) - Math.log(a[0])) / (Math.log(b[0]) - Math.log(a[0])), 0, 1);
    const ca = hex2(a[1]), cb = hex2(b[1]);
    return 'rgb(' + ca.map((v, k) => Math.round(v + (cb[k] - v) * u)).join(',') + ')';
  }
  const tempHex = (T) => { const m = /(\d+),(\d+),(\d+)/.exec(tempColor(T)); return '#' + [1, 2, 3].map((k) => (+m[k]).toString(16).padStart(2, '0')).join(''); };
  function colorName(T) { return T < 3900 ? '붉은색' : T < 5000 ? '주황색' : T < 6600 ? '노란색' : T < 11000 ? '흰색' : '청백색'; }

  /* 하늘 · 우주 배경 (한 번만 그리고 재사용) */
  function skyCanvas(L, w, h, seed) {
    const key = '_sky' + w + 'x' + h;
    if (L[key]) return L[key];
    const sc = 1.5, c = document.createElement('canvas');
    c.width = Math.round(w * sc); c.height = Math.round(h * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#070d24'); gr.addColorStop(0.7, '#142450'); gr.addColorStop(1, '#1c2c5c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 130; i++) {
      const x = r() * w, y = r() * h * 0.86, s = 0.4 + r() * 0.9;
      g.fillStyle = 'rgba(210,225,255,' + (0.2 + r() * 0.5).toFixed(2) + ')';
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    // 도시 불빛
    const cg = g.createLinearGradient(0, h * 0.7, 0, h);
    cg.addColorStop(0, 'rgba(58,63,107,0)'); cg.addColorStop(1, 'rgba(58,63,107,.8)');
    g.fillStyle = cg; g.fillRect(0, h * 0.7, w, h * 0.3);
    // 산과 나무 실루엣
    g.fillStyle = '#080d1e';
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.9 + Math.sin(x * 0.012 + 1) * 12 + Math.sin(x * 0.03) * 5);
    g.lineTo(w, h); g.closePath(); g.fill();
    for (let i = 0; i < w / 26; i++) {
      const x = i * 26 + r() * 14, base = h * 0.9 + Math.sin(x * 0.012 + 1) * 12 + Math.sin(x * 0.03) * 5, th = 14 + r() * 20;
      g.beginPath(); g.moveTo(x, base - th); g.lineTo(x - 7, base + 2); g.lineTo(x + 7, base + 2); g.closePath(); g.fill();
    }
    L._tw = L._tw || [];
    return (L[key] = c);
  }

  /* =========================================================
     장면 1: 겨울 밤하늘 · 등급 눈금 · 등급 비교기
     ========================================================= */
  function skyGeo(L) {
    if (L.kind === 'wide') return { sky: R_(0, 0, 800, 470), scale: R_(0, 470, 800, 90), cmp: R_(548, 56, 244, 398), map: (x, y) => ({ x, y }) };
    return { sky: R_(0, 0, 520, 560), scale: R_(0, 566, 520, 128), cmp: R_(0, 704, 520, 150), map: (x, y) => ({ x: (x - 130) * 1.18 + 30, y: y * 1.1 + 12 }) };
  }
  const skyPos = (L, id) => { const s = ORI(id), g = skyGeo(L); return g.map(s.x, s.y); };
  function scaleGeo(L) {
    const g = skyGeo(L).scale;
    const x0 = g.x + (L.kind === 'wide' ? 52 : 36), x1 = g.x + g.w - (L.kind === 'wide' ? 52 : 36);
    return { rect: g, x0, x1, unit: (x1 - x0) / 8, barY: g.y + (L.kind === 'wide' ? 40 : 46), xOf: (m) => x0 + (m + 2) * ((x1 - x0) / 8) };
  }
  function drawScale(ctx, L) {
    const G = scaleGeo(L), g = G.rect;
    ctx.save();
    const bg = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
    bg.addColorStop(0, 'rgba(6,10,28,.0)'); bg.addColorStop(0.2, 'rgba(6,10,28,.82)'); bg.addColorStop(1, 'rgba(6,10,28,.95)');
    ctx.fillStyle = bg; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = 'rgba(190,210,255,.7)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(G.x0 - 14, G.barY); ctx.lineTo(G.x1 + 14, G.barY); ctx.stroke();
    for (let m = -2; m <= 6; m++) {
      const x = G.xOf(m);
      ctx.beginPath(); ctx.moveTo(x, G.barY - 6); ctx.lineTo(x, G.barY + 6); ctx.stroke();
      drawMagStar(ctx, x, G.barY + (L.kind === 'wide' ? 22 : 26), m, '#dce8ff', 0, { alpha: 0.95 });
      txt(ctx, (m < 0 ? '−' : '') + Math.abs(m), x, G.barY + (L.kind === 'wide' ? 46 : 58), 14, '#dbe6ff', { weight: 800 });
    }
    ctx.restore();
    txt(ctx, '← 밝다', G.x0 - 20, g.y + 16, 13, '#ffe9a8', { align: 'left', weight: 800 });
    txt(ctx, '어둡다 →', G.x1 + 20, g.y + 16, 13, '#9db4e8', { align: 'right', weight: 800 });
    
  }

  function drawSky(v, L, t) {
    const ctx = v.ctx, G = skyGeo(L), sk = G.sky;
    ctx.drawImage(skyCanvas(L, sk.w, sk.h, L.kind === 'wide' ? 31 : 47), sk.x, sk.y, sk.w, sk.h);
    // 별자리 선
    ctx.save(); ctx.strokeStyle = 'rgba(150,180,255,.18)'; ctx.lineWidth = 1.4;
    LINES.forEach((l) => { const a = skyPos(L, l[0]), b = skyPos(L, l[1]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    ctx.restore();
    txt(ctx, '오리온자리', skyPos(L, 'alnilam').x + 70, skyPos(L, 'alnilam').y + 6, 13, 'rgba(160,185,240,.75)', { weight: 700 });
    // 별
    const rankIds = RANK.map((r) => r[0]);
    ORION.forEach((s, i) => {
      const p = skyPos(L, s.id), tw = Math.sin(t * (2 + (i % 5) * 0.9) + i * 1.7) * 0.08;
      const sh = S.shake[s.id] > 0 ? Math.sin(S.shake[s.id] * 60) * 5 : 0;
      drawMagStar(ctx, p.x + sh, p.y, s.m, s.color, tw, { k: L.kind === 'wide' ? 1.45 : 1.3 });
    });
    // 번호 고리 (미션 1)
    if (S.ringOn) {
      rankIds.forEach((id) => {
        const p = skyPos(L, id), done = S.taps.indexOf(id);
        const pu = RM ? 0 : 0.5 + 0.5 * Math.sin(t * 3 + id.length);
        ctx.save();
        ctx.strokeStyle = done >= 0 ? 'rgba(34,197,94,.9)' : 'rgba(255,225,130,' + (0.6 + 0.3 * pu).toFixed(2) + ')'; ctx.lineWidth = 2.2;
        ctx.setLineDash(done >= 0 ? [] : [5, 4]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 21 + pu * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        pill(ctx, p.x + 22, p.y - 22, done >= 0 ? (done + 1) + '번째' : RING[id], { align: 'left', bg: done >= 0 ? '#16a34a' : '#f59e0b', color: done >= 0 ? '#fff' : '#3b2700', size: 14, pad: 7 });
      });
    }
    // 등급 눈금과 날아가는 이름표
    if (on('scale')) { drawScale(ctx, L); drawTags(ctx, L); }
    txt(ctx, '점의 크기는 밝기를 나타내요 (실제 크기 아님)', 14, G.sky.y + 26, 13, 'rgba(190,205,240,.85)', { align: 'left', weight: 700 });
    if (S.cmpOn || (game && game.free)) drawCompare(ctx, L, G.cmp, t);
  }
  function drawTags(ctx, L) {
    const G = scaleGeo(L);
    S.tags.forEach((tg) => {
      const u = clamp(tg.t / tg.dur, 0, 1);
      let x, y;
      if (u < 1) { const e = easeIO(u); x = lerp(tg.x0, tg.x1, e); y = lerp(tg.y0, tg.y1, e) - Math.sin(Math.PI * e) * 90; }
      else { const bt = tg.t - tg.dur; x = tg.x1; y = tg.y1 - Math.abs(Math.sin(bt * 11)) * 14 * Math.exp(-bt * 6); }
      pill(ctx, x, y, tg.name + ' ' + fmtM(tg.m), { bg: '#d99a00', size: 13, pad: 8 });
      if (u >= 1) { ctx.strokeStyle = 'rgba(255,211,107,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, G.barY - 2); ctx.stroke(); }
    });
  }

  function cmpGeo(L, c) {
    const wide = L.kind === 'wide';
    const refX = wide ? c.x + 64 : c.x + 70, tstX = wide ? c.x + 180 : c.x + 170, sY = wide ? c.y + 80 : c.y + 58;
    return { wide, refX, tstX, sY, l1: wide ? 46 : 38, l2: wide ? 62 : 54, dY: wide ? c.y + 160 : c.y + 122 };
  }
  /* 등급 비교기 (유리판 카드) */
  function drawCompare(ctx, L, c, t) {
    glass(ctx, c, 16, 0.07);
    const wide = L.kind === 'wide';
    txt(ctx, '⚖️ 등급 비교기', c.x + (wide ? c.w / 2 : 14), c.y + 24, 15, '#ffe9a8', { weight: 800, align: wide ? 'center' : 'left' });
    const m = S.cmpM, f = A.cmpF;
    const { refX, tstX, sY, l1, l2, dY } = cmpGeo(L, c);
    // 두 별
    const kk = wide ? 3.2 : 2.8;
    drawMagStar(ctx, refX, sY, 6, '#dce8ff', 0, { k: kk, minA: 0.85 });
    drawMagStar(ctx, tstX, sY, m, '#fff4d6', RM ? 0 : Math.sin(t * 3) * 0.04, { k: kk, minA: 0.85 });
    txt(ctx, '6등급 별', refX, sY + l1, 13, '#bcd0ff', { weight: 800 });
    txt(ctx, '(기준)', refX, sY + l2, 13, '#8fa6d6', { weight: 700 });
    txt(ctx, m + '등급 별', tstX, sY + l1, 14, '#ffe9a8', { weight: 800 });
    // 빛 알갱이 → 감지기
    [[refX, 0], [tstX, 1]].forEach((p) => {
      ctx.save();
      rr(ctx, p[0] - 38, dY, 76, 8, 4); ctx.fillStyle = 'rgba(160,190,255,.25)'; ctx.fill();
      ctx.restore();
    });
    txt(ctx, '빛 감지기', (refX + tstX) / 2, dY + 24, 13, '#8fa6d6', { weight: 700 });
    // 빛 알갱이 (초당 개수 ∝ 밝기, 화면상 상한)
    S.lightP.forEach((p) => {
      const u = p.age / p.life, x = p.x0 + (p.x1 - p.x0) * u, y = lerp(sY + 26, dY, easeIO(clamp(u, 0, 1)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9 * Math.sin(Math.PI * Math.min(1, u * 1.05));
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, 2.1, 0, TAU); ctx.fill(); ctx.restore();
    });
    // 숫자
    const nTxt = f < 9.95 ? (Math.round(f * 10) / 10).toFixed(f < 1.05 ? 0 : 1).replace(/\.0$/, '') : String(Math.round(f));
    if (wide) {
      txt(ctx, '6등급 별의', c.x + c.w / 2, c.y + 212, 14, '#bcd0ff', { weight: 700 });
      txt(ctx, nTxt + '배', c.x + c.w / 2, c.y + 248, 36, '#ffd36b', { weight: 900, font: JUA });
    } else {
      txt(ctx, '6등급 별의', c.x + 270, c.y + 62, 14, '#bcd0ff', { weight: 700 });
      txt(ctx, nTxt + '배', c.x + 270, c.y + 108, 40, '#ffd36b', { weight: 900, font: JUA });
    }
    // 10×10 별 격자 (밝기만큼 차오름)
    const gx = wide ? c.x + (c.w - 130) / 2 : c.x + 364, gy = wide ? c.y + 262 : c.y + 16, cs = wide ? 13 : 12;
    for (let i = 0; i < 100; i++) {
      const col = i % 10, row = Math.floor(i / 10), x = gx + col * cs + cs / 2, y = gy + row * cs + cs / 2;
      const fa = A.icons[i];
      ctx.save();
      starPoly(ctx, x, y, cs * 0.46, cs * 0.2);
      ctx.fillStyle = 'rgba(160,190,255,.14)'; ctx.fill();
      if (fa > 0.02) {
        const sc = easeBack(clamp(fa, 0, 1)) * (0.6 + 0.4 * Math.min(1, fa));
        ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
        starPoly(ctx, x, y, cs * 0.46, cs * 0.2);
        ctx.globalAlpha = 0.4 + 0.6 * clamp(fa, 0, 1); ctx.fillStyle = '#ffd36b'; ctx.fill();
      }
      ctx.restore();
    }
  }

  /* =========================================================
     장면 2: 불 끈 실험실 — 디지털 조도 센서 + 그래프
     ========================================================= */
  const I_OF = (d) => 640000 / (d * d);
  function labGeo(L) {
    if (L.kind === 'wide') return { bench: R_(0, 0, 800, 330), graph: R_(0, 336, 800, 224), xL: 70, pxcm: 6.6, lampY: 140, cell: 36, tableY: 262, ps: 1 };
    return { bench: R_(0, 0, 520, 440), graph: R_(0, 446, 520, 414), xL: 36, pxcm: 4.5, lampY: 184, cell: 26, tableY: 306, ps: 0.86 };
  }
  const OBL = { x: 0.5, y: 0.26 };
  function prj(G, Xpx, Y, Z) { return { x: G.xL + Xpx + OBL.x * Z, y: G.lampY - Y - OBL.y * Z }; }
  function planeAt(ctx, G, dcm, o) {
    const X = dcm * G.pxcm, h = X * (G.cell / 2) / (20 * G.pxcm), n = dcm / 20;
    const P = (Y, Z) => prj(G, X, Y, Z);
    ctx.save();
    // 바탕
    const c1 = P(h, h), c2 = P(h, -h), c3 = P(-h, -h), c4 = P(-h, h);
    ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y); ctx.closePath();
    ctx.fillStyle = 'rgba(255,224,150,' + ((o.fill != null ? o.fill : 0.16) / (n * n) + 0.015).toFixed(3) + ')'; ctx.fill();
    // 격자 (가운데 칸이 빛 축 위)
    ctx.strokeStyle = 'rgba(255,236,190,' + (o.line || 0.3) + ')'; ctx.lineWidth = o.lw || 1;
    const half = G.cell / 2;
    const lines = [];
    for (let k = 0; ; k++) { const v = half + k * G.cell; if (v >= h - 0.5) break; lines.push(v, -v); }
    lines.forEach((v) => {
      let a = P(v, h), b = P(v, -h); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      a = P(h, v); b = P(-h, v); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    // 센서가 보는 한 칸
    const k1 = P(half, half), k2 = P(half, -half), k3 = P(-half, -half), k4 = P(-half, half);
    ctx.beginPath(); ctx.moveTo(k1.x, k1.y); ctx.lineTo(k2.x, k2.y); ctx.lineTo(k3.x, k3.y); ctx.lineTo(k4.x, k4.y); ctx.closePath();
    ctx.fillStyle = 'rgba(255,205,70,' + (o.cellA != null ? o.cellA : 0.5) / (n * n) * (n >= 1.9 ? 1.5 : 1) + ')'; ctx.fill();
    ctx.strokeStyle = o.hi ? 'rgba(255,214,90,.98)' : 'rgba(255,214,90,.55)'; ctx.lineWidth = o.hi ? 2.4 : 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y); ctx.closePath();
    ctx.strokeStyle = o.hi ? 'rgba(255,236,170,.95)' : 'rgba(255,236,190,.45)'; ctx.lineWidth = o.hi ? 2 : 1.2; ctx.stroke();
    ctx.restore();
    return { top: Math.min(c1.y, c2.y), x: P(0, 0).x };
  }
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function seg7(ctx, x, y, w, h, d, on_, off) {
    const t = Math.max(2, w * 0.2), g = t * 0.3;
    const r = { a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t], f: [x, y + g, t, h / 2 - g - t / 2 + 0.5], b: [x + w - t, y + g, t, h / 2 - g - t / 2 + 0.5], e: [x, y + h / 2 + t / 2 - 0.5, t, h / 2 - g - t / 2 + 0.5], c: [x + w - t, y + h / 2 + t / 2 - 0.5, t, h / 2 - g - t / 2 + 0.5] };
    const lit = SEG[d] || '';
    'abcdefg'.split('').forEach((k) => { ctx.fillStyle = lit.indexOf(k) >= 0 ? on_ : off; ctx.fillRect(r[k][0], r[k][1], r[k][2], r[k][3]); });
  }
  function benchCanvas(L) {
    if (L._bench) return L._bench;
    const G = labGeo(L), b = G.bench, sc = 1.5, c = document.createElement('canvas');
    c.width = Math.round(b.w * sc); c.height = Math.round(b.h * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const bg = g.createLinearGradient(0, 0, 0, b.h);
    bg.addColorStop(0, '#04060c'); bg.addColorStop(1, '#0a0f1c'); g.fillStyle = bg; g.fillRect(0, 0, b.w, b.h);
    // 탁자
    const tg = g.createLinearGradient(0, G.tableY, 0, b.h);
    tg.addColorStop(0, '#5a4128'); tg.addColorStop(1, '#2d2012'); g.fillStyle = tg; g.fillRect(0, G.tableY, b.w, b.h - G.tableY);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, G.tableY, b.w, 2);
    // 광학대 눈금자
    const ry = G.tableY + 8, rh = L.kind === 'wide' ? 30 : 26;
    const rg = g.createLinearGradient(0, ry, 0, ry + rh); rg.addColorStop(0, '#e9eef6'); rg.addColorStop(1, '#aab6c8');
    g.fillStyle = rg; g.fillRect(G.xL - 20, ry, 100 * G.pxcm + 40, rh);
    g.strokeStyle = '#33415a'; g.fillStyle = '#26324a'; g.font = '700 13px ' + FONT; g.textAlign = 'center';
    for (let cm = 0; cm <= 100; cm += 5) {
      const x = G.xL + cm * G.pxcm, big = cm % 10 === 0;
      g.lineWidth = big ? 1.6 : 1; g.beginPath(); g.moveTo(x, ry); g.lineTo(x, ry + (big ? 12 : 7)); g.stroke();
      if (big && (L.kind === 'wide' || cm % 20 === 0)) g.fillText(cm, x, ry + rh - 4);
    }
    g.textAlign = 'left'; g.fillStyle = '#26324a'; g.fillText('cm', G.xL + 100 * G.pxcm + 16 - (L.kind === 'wide' ? 0 : 6), ry + rh - 4);
    return (L._bench = c);
  }

  function drawLab(v, L, t) {
    const ctx = v.ctx, G = labGeo(L), b = G.bench;
    ctx.drawImage(benchCanvas(L), b.x, b.y, b.w, b.h);
    const sX = A.sensorV * G.pxcm;
    // 빛이 퍼지는 원뿔 (아주 옅게)
    ctx.save();
    const far = 100 * G.pxcm, fh = far * (G.cell / 2) / (20 * G.pxcm);
    const e1 = prj(G, far, fh, fh), e2 = prj(G, far, fh, -fh), e3 = prj(G, far, -fh, -fh), e4 = prj(G, far, -fh, fh);
    const cg = ctx.createLinearGradient(G.xL, 0, G.xL + far, 0); cg.addColorStop(0, 'rgba(255,236,170,.16)'); cg.addColorStop(1, 'rgba(255,236,170,.02)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(G.xL, G.lampY); [e1, e2, e3, e4].forEach((e) => ctx.lineTo(e.x, e.y)); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 전구 · 탁자 반사광
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.ellipse(G.xL + 28, G.tableY + 14, 60 * G.ps, 9, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#2a2f3c'; rr(ctx, G.xL - 5, G.lampY + 24, 10, G.tableY - G.lampY - 24, 3); ctx.fill();
    ctx.fillStyle = '#1c2029'; rr(ctx, G.xL - 22, G.tableY - 8, 44, 8, 4); ctx.fill();
    // 평면 격자: 20 · 40 · 60 cm (1칸 · 2×2칸 · 3×3칸)
    const nearest = [20, 40, 60].reduce((a, c) => (Math.abs(c - A.sensorV) < Math.abs(a - A.sensorV) ? c : a), 20);
    [20, 40, 60].forEach((cm) => {
      const hi = Math.abs(cm - A.sensorV) < 5;
      const pl = planeAt(ctx, G, cm, { hi, fill: 0.2, line: 0.28, cellA: 0.5 });
      pill(ctx, pl.x + 4, pl.top - 14, (cm / 20) * (cm / 20) === 1 ? '1칸' : (cm / 20) + '×' + (cm / 20) + '=' + (cm / 20) * (cm / 20) + '칸', { bg: hi ? 'rgba(217,154,0,.95)' : 'rgba(40,50,80,.85)', size: 13, pad: 7 });
    });
    void nearest;
    // 센서 위치의 격자 (20·40·60이 아니면 따로)
    if ([20, 40, 60].every((cm) => Math.abs(cm - A.sensorV) >= 5)) planeAt(ctx, G, A.sensorV, { hi: true, fill: 0.2, line: 0.4, lw: 1.2 });
    // 빛 알갱이
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    S.photons.forEach((p) => {
      const X = p.x, a = 0.85 * (1 - clamp((X - sX + 6) / 36, 0, 1)) * Math.min(1, X / 30);
      if (a <= 0.01) return;
      const q = prj(G, X, p.a * X, p.b * X);
      ctx.globalAlpha = a; ctx.fillStyle = p.hit ? '#fff' : '#ffe9b0';
      ctx.beginPath(); ctx.arc(q.x, q.y, p.hit ? 2.4 : 1.7, 0, TAU); ctx.fill();
    });
    ctx.restore();
    // 전구
    star(ctx, G.xL, G.lampY, 26 * G.ps, '#ffd886', { halo: 5, alpha: 0.9 });
    const bg = ctx.createRadialGradient(G.xL - 5, G.lampY - 6, 2, G.xL, G.lampY, 22 * G.ps);
    bg.addColorStop(0, '#fffdf2'); bg.addColorStop(0.6, '#fff0c0'); bg.addColorStop(1, '#ffd886');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(G.xL, G.lampY, 19 * G.ps, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(G.xL, G.lampY, 19 * G.ps, 0, TAU); ctx.stroke();
    txt(ctx, '전구', G.xL, G.lampY - 34 * G.ps, 13, '#ffe9a8', { weight: 800 });
    drawSensor(ctx, G, t);
    pill(ctx, 14, b.h - 16, '💡 실제 실험에서는 주변 불을 끄고 측정해요', { align: 'left', bg: 'rgba(8,16,40,.7)', size: 13 });
    drawGraph(ctx, L, G, t);
  }
  function drawSensor(ctx, G, t) {
    const x = G.xL + A.sensorV * G.pxcm, s = G.ps, w = 60 * s, hgt = 134 * s, top = G.lampY - 14 * s;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = S.sensorDrag ? 16 : 8; ctx.shadowOffsetY = S.sensorDrag ? 8 : 3;
    const lift = S.sensorDrag ? -4 : 0;
    ctx.translate(0, lift);
    const bg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bg.addColorStop(0, '#2b3142'); bg.addColorStop(0.5, '#3b4358'); bg.addColorStop(1, '#202534');
    ctx.fillStyle = bg; rr(ctx, x - w / 2, top, w, hgt, 10 * s); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(190,205,235,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 센서 창 (전구를 향함)
    const wy = G.lampY - lift, hit = clamp(A.flashA, 0, 1);
    star(ctx, x, wy + lift, 11 * s, '#fff0b8', { halo: 2.6 + hit * 1.5, alpha: 0.35 + 0.65 * hit });
    ctx.fillStyle = '#0a0d16'; ctx.beginPath(); ctx.arc(x, wy + lift, 7 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,150,' + (0.3 + 0.7 * hit).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, wy + lift, 4 * s, 0, TAU); ctx.fill();
    // 화면 (7-세그먼트)
    const sx = x - w / 2 + 6 * s, sy = top + 34 * s, sw = w - 12 * s, sh = 62 * s;
    ctx.fillStyle = '#071510'; rr(ctx, sx, sy, sw, sh, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(80,160,120,.4)'; ctx.stroke();
    let val = Math.round(A.readV * (RM ? 1 : 1 + 0.01 * Math.sin(t * 9 + A.sensorV)));
    val = clamp(val, 0, 9999);
    const str = String(val).padStart(4, ' ');
    const dw = 9.5 * s, dh = 20 * s, gap = 3 * s, x0 = sx + (sw - (4 * dw + 3 * gap)) / 2;
    for (let i = 0; i < 4; i++) { const ch = str[i]; if (ch !== ' ') seg7(ctx, x0 + i * (dw + gap), sy + 8 * s, dw, dh, +ch, '#7dffb0', 'rgba(125,255,176,.08)'); else seg7(ctx, x0 + i * (dw + gap), sy + 8 * s, dw, dh, -1, '#7dffb0', 'rgba(125,255,176,.08)'); }
    txt(ctx, 'lx', sx + sw - 6 * s, sy + sh - 8 * s, 13, '#7dffb0', { align: 'right', weight: 800 });
    ctx.restore();
    // 이름표 · 끌기 안내
    txt(ctx, '조도 센서', x, top + hgt - 10 * s + lift, 13, '#cfe0ff', { weight: 800 });
    if (!S.sensorMoved && !RM) { const a = 0.5 + 0.4 * Math.sin(t * 3); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + w / 2 + 8, top + 50); ctx.lineTo(x + w / 2 + 30, top + 50); ctx.moveTo(x + w / 2 + 24, top + 44); ctx.lineTo(x + w / 2 + 30, top + 50); ctx.lineTo(x + w / 2 + 24, top + 56); ctx.stroke(); ctx.restore(); }
  }
  function drawGraph(ctx, L, G, t) {
    const g = G.graph, wide = L.kind === 'wide';
    glass(ctx, { x: g.x + 6, y: g.y + 4, w: g.w - 12, h: g.h - 8 }, 14, 0.05);
    const px = g.x + (wide ? 84 : 70), py = g.y + (wide ? 34 : 44), pw = g.w - (wide ? 124 : 100), ph = g.h - (wide ? 84 : 104);
    const X = (d) => px + (d - 20) / 80 * pw, Y = (i) => py + ph - clamp(i / 1700, 0, 1.02) * ph;
    ctx.save();
    ctx.strokeStyle = 'rgba(160,190,255,.16)'; ctx.lineWidth = 1;
    for (let d = 20; d <= 100; d += 10) { ctx.beginPath(); ctx.moveTo(X(d), py); ctx.lineTo(X(d), py + ph); ctx.stroke(); }
    [0, 400, 800, 1200, 1600].forEach((i) => { ctx.beginPath(); ctx.moveTo(px, Y(i)); ctx.lineTo(px + pw, Y(i)); ctx.stroke(); txt(ctx, String(i), px - 8, Y(i) + 5, 13, '#9db4e8', { align: 'right', weight: 700 }); });
    for (let d = 20; d <= 100; d += 20) txt(ctx, String(d), X(d), py + ph + 18, 13, '#9db4e8', { weight: 700 });
    ctx.strokeStyle = 'rgba(200,220,255,.7)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw + 4, py + ph); ctx.stroke();
    ctx.restore();
    txt(ctx, '📈 거리와 빛의 세기', g.x + 18, g.y + 24, 14, '#ffe9a8', { align: 'left', weight: 800 });
    if (!wide) txt(ctx, '빛의 세기 (lx)', g.x + g.w - 18, g.y + 24, 13, '#bcd0ff', { align: 'right', weight: 700 });
    txt(ctx, '거리 (cm)', px + pw / 2, py + ph + (wide ? 38 : 40), 13, '#bcd0ff', { weight: 700 });
    if (wide) { ctx.save(); ctx.translate(g.x + 18, py + ph / 2); ctx.rotate(-Math.PI / 2); txt(ctx, '빛의 세기 (lx)', 0, 0, 13, '#bcd0ff', { weight: 700 }); ctx.restore(); }
    // 곡선
    const pts = S.data.slice().sort((a, b) => a.d - b.d);
    if (pts.length >= 3) {
      ctx.save(); ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.globalAlpha = clamp(S.curveA, 0, 1);
      ctx.beginPath();
      const P0 = pts.map((p) => ({ x: X(p.d), y: Y(p.I) }));
      ctx.moveTo(P0[0].x, P0[0].y);
      for (let i = 0; i < P0.length - 1; i++) {
        const p0 = P0[Math.max(0, i - 1)], p1 = P0[i], p2 = P0[i + 1], p3 = P0[Math.min(P0.length - 1, i + 2)];
        const lo = Math.min(p1.y, p2.y), hi = Math.max(p1.y, p2.y), cy1 = clamp(p1.y + (p2.y - p0.y) / 6, lo, hi), cy2 = clamp(p2.y - (p3.y - p1.y) / 6, lo, hi);
        ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, cy1, p2.x - (p3.x - p1.x) / 6, cy2, p2.x, p2.y);
      }
      ctx.stroke(); ctx.restore();
    }
    // 지금 센서 값 (속이 빈 점)
    const dn = clamp(A.sensorV, 20, 100), iv = I_OF(dn);
    ctx.save();
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(125,255,176,.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(X(dn), Y(iv)); ctx.lineTo(X(dn), py + ph); ctx.stroke(); ctx.setLineDash([]);
    const pu = RM ? 0 : 0.5 + 0.5 * Math.sin(t * 4);
    ctx.strokeStyle = '#7dffb0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(X(dn), Y(iv), 6 + pu * 2, 0, TAU); ctx.stroke();
    ctx.restore();
    // 기록한 점
    S.data.forEach((p) => {
      const pop = easeBack(clamp(p.pop, 0, 1));
      ctx.save(); ctx.translate(X(p.d), Y(p.I)); ctx.scale(pop, pop);
      ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      if (p.pop > 0.6 && p.label > 0) pill(ctx, X(p.d) + 10, Y(p.I) + 20, p.d + ' cm · ' + p.I + ' lx', { align: 'left', bg: 'rgba(217,154,0,.92)', size: 13, pad: 7, alpha: clamp(p.label, 0, 1) });
    });
  }

  /* =========================================================
     카드 놓기 도우미 (3단계 분류 · 4단계 사다리)
     ========================================================= */
  const CS = { mode: null, items: [] };
  function csGeo(L, mode) {
    if (mode === 'sort') {
      if (L.kind === 'wide') {
        const slots = [14, 275, 536].map((x) => R_(x, 312, 250, 112));
        return { cw: 148, ch: 100, cap: 9, scIn: 0.8, slots, tray: [0, 1, 2, 3, 4].map((i) => ({ x: 10 + i * 158, y: 440 })), place: (s, i, n) => { const k = n <= 2 ? 2 : 3, sc = n <= 2 ? 0.8 : 0.56, w = 148 * sc, gap = 6, x0 = slots[s].x + (slots[s].w - (k * w + (k - 1) * gap)) / 2; return { x: x0 + (i % k) * (w + gap), y: slots[s].y + 26 + Math.floor(i / k) * (100 * sc + 4), sc }; } };
      }
      const slots = [8, 178, 348].map((x) => R_(x, 340, 164, 210));
      return { cw: 156, ch: 100, cap: 9, scIn: 0.8, slots, tray: [[8, 562], [178, 562], [348, 562], [8, 668], [178, 668]].map((p) => ({ x: p[0], y: p[1] })), place: (s, i, n) => { const sc = n <= 2 ? 0.8 : 0.58, w = 156 * sc; return { x: slots[s].x + (slots[s].w - w) / 2, y: slots[s].y + 28 + i * (100 * sc + 4), sc }; } };
    }
    // 사다리 (표면 온도가 높은 별부터)
    if (L.kind === 'wide') {
      const slots = [0, 1, 2, 3, 4].map((i) => R_(548, 70 + i * 84, 244, 68));
      return { cw: 150, ch: 62, cap: 1, scIn: 1, slots, tray: [[14, 232], [190, 232], [14, 306], [190, 306], [14, 380]].map((p) => ({ x: p[0], y: p[1] })), place: (s) => ({ x: slots[s].x + 6, y: slots[s].y + 3, sc: 1 }) };
    }
    const slots = [0, 1, 2, 3, 4].map((i) => R_(270, 40 + i * 78, 244, 68));
    return { cw: 150, ch: 62, cap: 1, scIn: 1, slots, tray: [[14, 430], [190, 430], [14, 514], [190, 514], [14, 598]].map((p) => ({ x: p[0], y: p[1] })), place: (s) => ({ x: slots[s].x + 6, y: slots[s].y + 3, sc: 1 }) };
  }
  function csInit(mode, defs, perm) {
    CS.mode = mode;
    CS.items = defs.map((d, i) => ({ def: d, slot: -1, fx: 0, fy: 0, sc: 1, lift: 0, drag: false, off: null, home: perm[i], init: false, shake: 0 }));
  }
  function csTarget(L, c) {
    const g = csGeo(L, CS.mode);
    if (c.slot < 0) { const p = g.tray[c.home]; return { x: p.x / L.vw, y: p.y / L.vh, sc: 1 }; }
    const mates = CS.items.filter((o) => o.slot === c.slot && !o.drag), idx = mates.indexOf(c), p = g.place(c.slot, Math.max(0, idx), mates.length);
    return { x: p.x / L.vw, y: p.y / L.vh, sc: p.sc };
  }
  const csPlaced = () => CS.items.filter((c) => c.slot >= 0).length;
  function csDrop(c, L) {
    const g = csGeo(L, CS.mode), cx = c.fx * L.vw + g.cw * c.sc / 2, cy = c.fy * L.vh + g.ch * c.sc / 2;
    let best = -1, bd = 1e9;
    g.slots.forEach((s, i) => { const d = Math.hypot(cx - (s.x + s.w / 2), cy - (s.y + s.h / 2)); if (d < bd) { bd = d; best = i; } });
    const prev = c.slot, lim = Math.max(g.slots[0].w, g.slots[0].h) * (g.cap > 1 ? 0.62 : 0.9);
    if (best >= 0 && bd < lim) {
      if (g.cap === 1) { const other = CS.items.find((o) => o !== c && o.slot === best); if (other) other.slot = prev; }
      c.slot = best; Sound.tick();
    } else c.slot = -1;
    c.drag = false;
  }
  function csAt(p, L) {
    const g = csGeo(L, CS.mode);
    for (let i = CS.items.length - 1; i >= 0; i--) {
      const c = CS.items[i], x = c.fx * L.vw, y = c.fy * L.vh;
      if (p.x >= x && p.x <= x + g.cw * c.sc && p.y >= y && p.y <= y + g.ch * c.sc) return c;
    }
    return null;
  }
  function csDraw(ctx, L, t, solved) {
    const g = csGeo(L, CS.mode);
    // 사다리·상자 배경
    g.slots.forEach((s, i) => {
      ctx.save();
      rr(ctx, s.x, s.y, s.w, s.h, 14);
      const drop = CS.items.some((c) => c.drag) && nearestSlot(L, g) === i;
      ctx.fillStyle = drop ? 'rgba(125,211,252,.16)' : 'rgba(255,255,255,.04)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = drop ? '#7dd3fc' : 'rgba(150,190,255,.42)'; ctx.lineWidth = drop ? 2.4 : 1.5; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      if (CS.mode === 'sort') {
        const names = ['10 pc보다 가깝다', '약 10 pc', '10 pc보다 멀다'], cols = ['#7dd3fc', '#ffd36b', '#f9a8d4'];
        txt(ctx, names[i], s.x + s.w / 2, s.y + 20, 14, cols[i], { weight: 800 });
      } else {
        txt(ctx, String(i + 1), s.x - 12, s.y + s.h / 2 + 6, 17, '#8fb0ee', { weight: 900, align: 'right' });
      }
    });
    CS.items.forEach((c) => drawStarCard(ctx, L, g, c, t, solved));
  }
  function nearestSlot(L, g) {
    const c = CS.items.find((o) => o.drag); if (!c) return -1;
    const cx = c.fx * L.vw + g.cw * c.sc / 2, cy = c.fy * L.vh + g.ch * c.sc / 2;
    let best = -1, bd = 1e9;
    g.slots.forEach((s, i) => { const d = Math.hypot(cx - (s.x + s.w / 2), cy - (s.y + s.h / 2)); if (d < bd) { bd = d; best = i; } });
    return bd < Math.max(g.slots[0].w, g.slots[0].h) * (g.cap > 1 ? 0.62 : 0.9) ? best : -1;
  }
  function drawStarCard(ctx, L, g, c, t, solved) {
    const x = c.fx * L.vw, y = c.fy * L.vh, w = g.cw, h = g.ch, lf = easeOut(c.lift);
    const sc = c.sc * (1 + 0.06 * lf), sh = c.shake > 0 ? Math.sin(c.shake * 70) * 6 * (c.shake / 0.3) : 0;
    ctx.save();
    ctx.translate(x + w * c.sc / 2 + sh, y + h * c.sc / 2 - 3 * lf); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = 'rgba(0,10,40,' + (0.35 + 0.15 * lf).toFixed(2) + ')'; ctx.shadowBlur = 8 + 14 * lf; ctx.shadowOffsetY = 2 + 8 * lf;
    rr(ctx, 0, 0, w, h, 14); ctx.fillStyle = '#0d1a3e'; ctx.fill(); ctx.shadowColor = 'transparent';
    const gl = ctx.createLinearGradient(0, 0, 0, h); gl.addColorStop(0, 'rgba(150,185,255,.30)'); gl.addColorStop(1, 'rgba(60,90,170,.22)');
    ctx.fillStyle = gl; ctx.fill();
    ctx.strokeStyle = c.slot >= 0 && !c.drag ? 'rgba(125,211,252,.8)' : 'rgba(190,210,255,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(w - 12, 1); ctx.stroke();
    const d = c.def;
    if (d.kind === 'mag') {
      star(ctx, 20, 24, 6, d.color, { halo: 3, flare: 15 });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(20, 24, 2.6, 0, TAU); ctx.fill();
      txt(ctx, d.name, 36, 30, 16, '#fff', { align: 'left', weight: 800, maxW: w - 44 });
      txt(ctx, '겉보기 ' + d.mTxt, 14, 58, 14, '#bcd0ff', { align: 'left', weight: 700 });
      txt(ctx, '절대 ' + d.MTxt, 14, 82, 15, '#ffd36b', { align: 'left', weight: 800 });
    } else {
      const col = d.color;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(22, h / 2, 13, 0, TAU); ctx.fill();
      star(ctx, 22, h / 2, 13, col, { halo: 2.2, alpha: 0.6 });
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(22, h / 2, 13, 0, TAU); ctx.stroke();
      txt(ctx, d.name, 42, h / 2 - 3, 15, '#fff', { align: 'left', weight: 800, maxW: w - 48 });
      txt(ctx, d.colorName, 42, h / 2 + 15, 13, '#bcd0ff', { align: 'left', weight: 700 });
    }
    ctx.restore();
  }

  /* =========================================================
     장면 3: 10 pc 거리 지도 · 지구에서 본 모습 · 분류
     ========================================================= */
  const LG_AU = Math.log10(4.848e-6);
  const STARS10 = {
    sun: { id: 'sun', name: '태양', m: -26.7, M: 4.83, lg: LG_AU, color: '#ffe27a', row: -1, dTxt: '1 AU' },
    polaris: { id: 'polaris', name: '북극성', m: 2.0, M: -3.6, lg: Math.log10(133), color: '#fff1b4', row: 1, dTxt: '약 133 pc' },
    sirius: { id: 'sirius', name: '시리우스', m: -1.5, M: 1.4, lg: Math.log10(2.6), color: '#f2f6ff', row: -1, dTxt: '2.6 pc' },
    vega: { id: 'vega', name: '베가', m: 0.0, M: 0.6, lg: Math.log10(7.7), color: '#e4ecff', row: 1, dTxt: '7.7 pc' },
    pollux: { id: 'pollux', name: '폴룩스', m: 1.1, M: 1.1, lg: Math.log10(10.4), color: '#ffc878', row: -1, dTxt: '10.4 pc' },
    rigel: { id: 'rigel', name: '리겔', m: 0.1, M: -7, lg: Math.log10(260), color: '#cadcff', row: -1, dTxt: '약 260 pc' },
  };
  const SORT_DEFS = [
    { id: 'sirius', kind: 'mag', name: '시리우스', color: '#f2f6ff', mTxt: '−1.5', MTxt: '+1.4', answer: 0 },
    { id: 'vega', kind: 'mag', name: '베가', color: '#e4ecff', mTxt: '0.0', MTxt: '+0.6', answer: 0 },
    { id: 'pollux', kind: 'mag', name: '폴룩스', color: '#ffc878', mTxt: '+1.1', MTxt: '+1.1', answer: 1 },
    { id: 'polaris', kind: 'mag', name: '북극성', color: '#fff1b4', mTxt: '+2.0', MTxt: '−3.6', answer: 2 },
    { id: 'rigel', kind: 'mag', name: '리겔', color: '#cadcff', mTxt: '+0.1', MTxt: '약 −7', answer: 2 },
  ];
  function g10(L) {
    if (L.kind === 'wide') return { map: R_(0, 0, 800, 296), axisY: 162, xAU: 90, xPc: 206, dec: 178, sky: R_(16, 306, 372, 246), info: R_(400, 306, 384, 246), rowD: 60, rowDn: 72, r: 17 };
    return { map: R_(0, 0, 520, 330), axisY: 172, xAU: 56, xPc: 132, dec: 118, sky: R_(10, 338, 500, 210), info: R_(10, 556, 500, 190), rowD: 66, rowDn: 66, r: 15 };
  }
  const rowY = (G, row) => G.axisY + (row > 0 ? G.rowDn : row * G.rowD);   // 아래 줄 별은 눈금 숫자(10, 100)와 이름이 겹치지 않게 조금 더 아래에
  const xOfLg = (G, lg) => (lg >= 0 ? G.xPc + lg * G.dec : G.xPc + (lg / LG_AU) * (G.xAU - G.xPc));
  const lgOfX = (G, x) => (x >= G.xPc ? (x - G.xPc) / G.dec : ((x - G.xPc) / (G.xAU - G.xPc)) * LG_AU);
  const magAt = (tk) => tk.def.M + 5 * (tk.lg - 1);
  function initTokens() {
    S.tokens = ['sun', 'polaris'].map((id) => ({ id, def: STARS10[id], lg: STARS10[id].lg, snapped: false, ghostA: 0, badge: 0 }));
    S.selTok = 'sun'; S.tokDrag = null; A.mV = -26.7;
  }
  const tokOf = (id) => S.tokens.find((t) => t.id === id);

  function drawMap10(v, L, t) {
    const ctx = v.ctx, G = g10(L);
    drawStarfield(ctx, L, G.map, 53);
    glass(ctx, G.map.w ? R_(6, 6, G.map.w - 12, G.map.h - 12) : G.map, 16, 0.035);
    txt(ctx, '🗺 거리 지도', 20, 32, 15, '#bcd0ff', { align: 'left', weight: 800 });
    txt(ctx, '눈금 한 칸 = 10배', G.map.w - 20, 32, 13, '#8fa6d6', { align: 'right', weight: 700 });
    const ay = G.axisY;
    // 축
    ctx.save();
    ctx.strokeStyle = 'rgba(190,215,255,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(G.xAU - 24, ay); ctx.lineTo(G.xAU + 20, ay); ctx.moveTo(G.xPc, ay); ctx.lineTo(xOfLg(G, 3) + 14, ay); ctx.stroke();
    const bx = (G.xAU + 20 + G.xPc) / 2;
    ctx.beginPath(); ctx.moveTo(bx - 14, ay + 9); ctx.lineTo(bx - 6, ay - 9); ctx.moveTo(bx + 6, ay + 9); ctx.lineTo(bx + 14, ay - 9); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(G.xAU + 20, ay); ctx.lineTo(bx - 10, ay); ctx.moveTo(bx + 10, ay); ctx.lineTo(G.xPc, ay); ctx.stroke(); ctx.setLineDash([]);
    [[0, '1'], [1, '10'], [2, '100'], [3, '1000 pc']].forEach((tk) => {
      const x = xOfLg(G, tk[0]);
      ctx.beginPath(); ctx.moveTo(x, ay - 7); ctx.lineTo(x, ay + 7); ctx.stroke();
      txt(ctx, tk[1], x + (tk[0] === 3 ? -6 : 0), ay + 28, 13, '#cfe0ff', { weight: 700 });
    });
    ctx.restore();
    txt(ctx, '≈', bx, ay - 14, 18, '#8fa6d6', { weight: 800 });
    // 지구 (관측자)
    ctx.save(); ctx.translate(G.xAU - 34, ay); ctx.fillStyle = '#3b8fe0'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4cb36b'; ctx.beginPath(); ctx.ellipse(-2, -2, 4, 3, 0.5, 0, TAU); ctx.fill(); ctx.restore();
    txt(ctx, '지구', G.xAU - 34, ay + 28, 13, '#9be7ff', { weight: 800 });
    txt(ctx, '1 AU', G.xAU, ay + 28, 13, '#cfe0ff', { weight: 700 });
    // 10 pc 기준선
    const x10 = xOfLg(G, 1);
    ctx.save();
    ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,214,90,.9)'; ctx.lineWidth = 2.4;
    const pulse = RM ? 0 : 0.5 + 0.5 * Math.sin(t * 3);
    ctx.shadowColor = 'rgba(255,214,90,.8)'; ctx.shadowBlur = 8 + pulse * 8;
    ctx.beginPath(); ctx.moveTo(x10, 46); ctx.lineTo(x10, G.map.h - 14); ctx.stroke(); ctx.restore();
    pill(ctx, x10, 48, '10 pc 기준선', { bg: '#d99a00', size: 13 });
    // 토큰
    const toks = S.sortMode ? sortTokens(L, G) : S.tokens;
    toks.forEach((tk) => {
      const x = tk.px != null ? tk.px : xOfLg(G, tk.lg), y = tk.py != null ? tk.py : rowY(G, tk.def.row || 1);
      const sel = !S.sortMode && S.selTok === tk.id;
      // 고스트와 겉보기 등급
      if (tk.ghostA > 0.01) {
        const gx = xOfLg(G, tk.def.lg);
        ctx.save(); ctx.globalAlpha = 0.4 * tk.ghostA; ctx.setLineDash([4, 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(gx, y, G.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        pill(ctx, gx, y + G.r + 22, '겉보기 ' + fmtMs(tk.def.m), { bg: 'rgba(60,70,110,.9)', size: 13, pad: 7, alpha: tk.ghostA });
      }
      if (S.tokDrag === tk) { ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#fff'; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(xOfLg(G, tk.def.lg), y); ctx.lineTo(x, y); ctx.stroke(); ctx.restore(); }
      const lift = S.tokDrag === tk ? 1.14 : 1;
      ctx.save(); ctx.translate(x, y - (S.tokDrag === tk ? 3 : 0)); ctx.scale(lift, lift);
      ctx.shadowColor = 'rgba(0,0,20,.55)'; ctx.shadowBlur = S.tokDrag === tk ? 14 : 6; ctx.shadowOffsetY = S.tokDrag === tk ? 6 : 2;
      ctx.fillStyle = '#10204a'; ctx.beginPath(); ctx.arc(0, 0, G.r, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
      star(ctx, 0, 0, G.r * 0.9, tk.def.color, { halo: 2.2, alpha: 0.9 });
      ctx.fillStyle = tk.def.color; ctx.beginPath(); ctx.arc(0, 0, G.r * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = sel ? '#ffd36b' : 'rgba(200,220,255,.75)'; ctx.lineWidth = sel ? 3 : 1.8; ctx.beginPath(); ctx.arc(0, 0, G.r, 0, TAU); ctx.stroke();
      ctx.restore();
      if (sel && !RM) { ctx.save(); ctx.strokeStyle = 'rgba(255,211,107,' + (0.3 + 0.3 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, G.r + 6 + pulse * 3, 0, TAU); ctx.stroke(); ctx.restore(); }
      txt(ctx, tk.def.name, x, y - G.r - 8, 14, '#fff', { weight: 800, stroke: 'rgba(0,0,20,.8)', sw: 4 });
      if (S.sortMode && tk.arrived) pill(ctx, x, y + G.r + 20, tk.def.dTxt, { bg: 'rgba(217,154,0,.92)', size: 13, pad: 7 });
      if (tk.badge > 0.01 && !S.sortMode) pill(ctx, x, y + G.r + 22, '절대 등급 ' + fmtMs(tk.def.M), { bg: '#d99a00', size: 13, pad: 8, alpha: tk.badge });
    });
    // 아래: 지구에서 본 모습 + 정보 또는 분류 상자
    if (S.sortMode) { csDraw(ctx, L, t, S.sortDone); }
    else { drawSkyWindow(ctx, L, G, t); drawInfo(ctx, L, G, t); }
  }
  function sortTokens(L, G) {
    if (!S.sortDone) return [];
    const g = csGeo(L, 'sort'), out = [];
    SORT_DEFS.forEach((d, i) => {
      const c = CS.items.find((o) => o.def === d), p = clamp((S.sortT - i * 0.15) / 0.9, 0, 1);
      if (!c || p <= 0) return;
      const def = STARS10[d.id], tx = xOfLg(G, def.lg), ty = rowY(G, def.row);
      const sx = c.fx * L.vw + g.cw * c.sc / 2, sy = c.fy * L.vh + g.ch * c.sc / 2, u = easeIO(p), mx = (sx + tx) / 2, my = Math.min(sy, ty) - 60;
      const bz = (a, b2, c2) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b2 + u * u * c2;
      out.push({ id: d.id, def, lg: def.lg, ghostA: 0, badge: 0, px: bz(sx, mx, tx), py: bz(sy, my, ty), arrived: p >= 1 });
    });
    return out;
  }
  function drawStarfield(ctx, L, r, seed) {
    const key = '_sf' + r.w + 'x' + r.h;
    if (!L[key]) {
      const sc = 1.5, c = document.createElement('canvas'); c.width = Math.round(r.w * sc); c.height = Math.round(r.h * sc);
      const g = c.getContext('2d'); g.scale(sc, sc);
      const gr = g.createRadialGradient(r.w * 0.5, r.h * 0.6, 20, r.w * 0.5, r.h * 0.5, Math.max(r.w, r.h) * 0.85); gr.addColorStop(0, '#0f1a3c'); gr.addColorStop(1, '#050a1c');
      g.fillStyle = gr; g.fillRect(0, 0, r.w, r.h);
      const rg = rng(seed);
      for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(210,225,255,' + (0.2 + rg() * 0.5).toFixed(2) + ')'; g.beginPath(); g.arc(rg() * r.w, rg() * r.h, 0.4 + rg() * 1, 0, TAU); g.fill(); }
      L[key] = c;
    }
    ctx.drawImage(L[key], r.x, r.y, r.w, r.h);
  }

  /* 지구에서 본 모습 (하늘 창) */
  function drawSkyWindow(ctx, L, G, t) {
    const w = G.sky, tk = tokOf(S.selTok) || S.tokens[0];
    ctx.save();
    rr(ctx, w.x, w.y, w.w, w.h, 16); ctx.clip();
    ctx.drawImage(skyCanvas(L, Math.round(w.w), Math.round(w.h), 91), w.x, w.y, w.w, w.h);
    const cx = w.x + w.w / 2, cy = w.y + w.h * 0.48, m = A.mV, v = starVis(m);
    if (v.wash > 0.01) {
      // 눈부신 태양: 하늘 전체가 밝아짐
      const wg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w.w, w.h) * 0.8);
      wg.addColorStop(0, 'rgba(255,248,214,' + (0.95 * v.wash).toFixed(3) + ')'); wg.addColorStop(0.5, 'rgba(255,214,120,' + (0.55 * v.wash).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(120,170,255,' + (0.35 * v.wash).toFixed(3) + ')');
      ctx.fillStyle = wg; ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    const sunLike = tk.id === 'sun';
    star(ctx, cx, cy, v.r * (sunLike ? 1.2 : 1), tk.def.color, { halo: 3.5 + v.wash * 6, alpha: Math.max(v.alpha, 0.6), flare: v.r > 5.5 ? Math.min(220, v.r * 3.6) : 0 });
    if (sunLike && v.r > 8) { const sg = ctx.createRadialGradient(cx - 4, cy - 5, 2, cx, cy, v.r * 0.9); sg.addColorStop(0, '#fffdf0'); sg.addColorStop(0.6, '#ffe27a'); sg.addColorStop(1, '#ffb52e'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, Math.min(v.r * 0.8, 46), 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.8, v.r * 0.32), 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,205,255,.3)'; ctx.lineWidth = 1.5; rr(ctx, w.x, w.y, w.w, w.h, 16); ctx.stroke();
    pill(ctx, w.x + 12, w.y + 22, '👀 지구에서 본 모습', { align: 'left', bg: 'rgba(14,60,110,.85)' });
    if (v.wash > 0.3) pill(ctx, w.x + w.w / 2, w.y + w.h - 18, '⚠ 태양은 맨눈으로 보면 안 돼요', { bg: 'rgba(146,64,14,.92)', size: 13 });
    else txt(ctx, '점의 크기는 밝기를 나타내요 (실제 크기 아님)', w.x + 12, w.y + w.h - 10, 13, 'rgba(190,205,240,.85)', { align: 'left', weight: 700 });
    if (S.msg && S.msgT > 0) pill(ctx, w.x + w.w / 2, w.y + w.h - 44, S.msg, { bg: 'rgba(217,154,0,.95)', size: 14, alpha: clamp(S.msgT, 0, 1) });
  }
  function drawInfo(ctx, L, G, t) {
    const r = G.info, tk = tokOf(S.selTok) || S.tokens[0], wide = L.kind === 'wide';
    glass(ctx, r, 16, 0.06);
    const mNow = A.mV;
    txt(ctx, tk.def.name, r.x + (wide ? 20 : 20), r.y + 40, 24, '#fff', { align: 'left', weight: 900, font: JUA });
    txt(ctx, tk.snapped ? '지금: 10 pc 거리' : (tk.lg === tk.def.lg ? '지금: 원래 자리' : '지금: 옮기는 중'), r.x + r.w - 18, r.y + 38, 14, tk.snapped ? '#ffd36b' : '#9db4e8', { align: 'right', weight: 800 });
    const col = (x, label, val, color) => { txt(ctx, label, x, r.y + (wide ? 92 : 80), 14, '#bcd0ff', { align: 'left', weight: 700 }); txt(ctx, val, x, r.y + (wide ? 150 : 128), wide ? 50 : 44, color, { align: 'left', weight: 900, font: JUA }); };
    col(r.x + 20, '겉보기 등급', fmtMs(mNow), '#fff');
    col(r.x + (wide ? 200 : 260), '절대 등급', tk.snapped ? fmtMs(tk.def.M) : '?', tk.snapped ? '#ffd36b' : 'rgba(255,255,255,.35)');
    txt(ctx, '지구에서 보이는 밝기', r.x + 20, r.y + (wide ? 176 : 148), 13, '#8fa6d6', { align: 'left', weight: 700 });
    txt(ctx, '10 pc에 두었을 때의 밝기', r.x + (wide ? 200 : 260), r.y + (wide ? 176 : 148), 13, '#8fa6d6', { align: 'left', weight: 700 });
    txt(ctx, S.tip || '별 배지를 끌어 10 pc 기준선에 놓아 보세요.', r.x + 20, r.y + r.h - (wide ? 24 : 14), 14, '#ffe9a8', { align: 'left', weight: 800, maxW: r.w - 36 });
  }

  /* =========================================================
     장면 4: 별 모형 · 온도 조절기 · 색 카드
     ========================================================= */
  const T_MIN = 2500, T_MAX = 30000;
  const fOfT = (T) => clamp(Math.log(T / T_MIN) / Math.log(T_MAX / T_MIN), 0, 1);
  const tOfF = (f) => T_MIN * Math.pow(T_MAX / T_MIN, clamp(f, 0, 1));
  const BANDS = [['붉은색', '약 3,000 K', 3000, 'red'], ['주황색', '약 4,500 K', 4500, null], ['노란색', '약 6,000 K', 6000, 'yellow'], ['흰색', '약 9,000 K', 9000, 'white'], ['청백색', '약 30,000 K', 20000, 'blue']];
  const bandIdx = (T) => (T < 3900 ? 0 : T < 5000 ? 1 : T < 6600 ? 2 : T < 11000 ? 3 : 4);
  const LADDER_DEFS = [
    { id: 'rigel', kind: 'col', name: '리겔', T: 12000, colorName: '청백색', answer: 0, tTxt: '약 12,000 K' },
    { id: 'sirius', kind: 'col', name: '시리우스', T: 9900, colorName: '흰색', answer: 1, tTxt: '약 9,900 K' },
    { id: 'sun', kind: 'col', name: '태양', T: 5800, colorName: '노란색', answer: 2, tTxt: '약 5,800 K' },
    { id: 'arcturus', kind: 'col', name: '아르크투루스', T: 4300, colorName: '주황색', answer: 3, tTxt: '약 4,300 K' },
    { id: 'betel', kind: 'col', name: '베텔게우스', T: 3600, colorName: '붉은색', answer: 4, tTxt: '약 3,600 K' },
  ];
  LADDER_DEFS.forEach((d) => { d.color = tempHex(d.T); });
  function gH(L) {
    if (L.kind === 'wide') return { ball: { x: 190, y: 190, r: 90 }, therm: R_(372, 54, 40, 290), forge: R_(462, 76, 318, 190), strip: R_(20, 356, 760, 50), dial: { x: 118, y: 474, r: 54 }, readX: 214, readY: 470, noteY: 548, small: { x: 170, y: 120, r: 62 } };
    return { ball: { x: 150, y: 168, r: 84 }, therm: R_(332, 56, 40, 270), forge: R_(240, 340, 272, 96), strip: R_(12, 456, 496, 56), dial: { x: 120, y: 618, r: 62 }, readX: 214, readY: 612, noteY: 780, small: { x: 135, y: 150, r: 64 } };
  }
  let granCanvas = null;
  function granulation() {
    if (granCanvas) return granCanvas;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = rng(9);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) {
      const x = r() * 256, y = r() * 256, rad = 4 + r() * 10, l = r() > 0.5 ? 255 : 0;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(' + l + ',' + l + ',' + l + ',.35)'); gr.addColorStop(1, 'rgba(' + l + ',' + l + ',' + l + ',0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
    return (granCanvas = c);
  }
  function drawStarBall(ctx, x, y, r, T, t, glowK) {
    const col = tempColor(T), hex = tempHex(T);
    star(ctx, x, y, r, hex, { halo: 1.9 + (glowK || 0), alpha: 0.8 });
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const gr = ctx.createRadialGradient(x - r * 0.12, y - r * 0.15, r * 0.05, x, y, r);
    gr.addColorStop(0, SciSim.color.mix(hex, '#ffffff', 0.32)); gr.addColorStop(0.55, col); gr.addColorStop(1, SciSim.color.shade(hex, -0.5));
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.55;
    ctx.translate(x, y); ctx.rotate(RM ? 0 : t * 0.04); ctx.drawImage(granulation(), -r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
    ctx.restore();
  }
  function drawHeater(v, L, t) {
    const ctx = v.ctx, G = gH(L);
    drawStarfield(ctx, L, R_(0, 0, L.vw, L.vh), 67);
    if (S.ladderMode) { drawLadder(ctx, L, G, t); return; }
    const f = fOfT(A.TV), hex = tempHex(A.TV);
    drawStarBall(ctx, G.ball.x, G.ball.y, G.ball.r, A.TV, t, f * 0.4);
    txt(ctx, '⭐ 별 모형', G.ball.x, G.ball.y + G.ball.r + 30, 14, '#bcd0ff', { weight: 800 });
    // 온도계 (로그 눈금)
    const th = G.therm, tx = th.x + th.w / 2;
    ctx.save();
    rr(ctx, th.x + 8, th.y, th.w - 16, th.h, (th.w - 16) / 2); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,215,255,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    const fh = (th.h - 8) * f;
    rr(ctx, th.x + 12, th.y + th.h - 4 - fh, th.w - 24, Math.max(6, fh), (th.w - 24) / 2); ctx.fillStyle = tempColor(A.TV); ctx.fill();
    ctx.restore();
    star(ctx, tx, th.y + th.h - 4 - fh, 12, hex, { halo: 2.6, alpha: 0.7 });
    [[3000, '3,000'], [5000, '5,000'], [10000, '10,000'], [30000, '30,000 K']].forEach((tk) => {
      const yy = th.y + th.h - 4 - (th.h - 8) * fOfT(tk[0]);
      ctx.strokeStyle = 'rgba(200,220,255,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(th.x + th.w - 6, yy); ctx.lineTo(th.x + th.w + 4, yy); ctx.stroke();
      txt(ctx, tk[1], th.x + th.w + 8, yy + 5, 13, '#cfe0ff', { align: 'left', weight: 700 });
    });
    txt(ctx, '표면 온도', tx, th.y - 12, 13, '#ffe9a8', { weight: 800 });
    // 대장간 쇠막대
    drawForge(ctx, L, G, f, t);
    // 색 이름 띠
    const st = G.strip, bw = st.w / 5, bi = bandIdx(A.TV);
    BANDS.forEach((b, i) => {
      const x = st.x + i * bw, cur = i === bi, ct = tempColor([3000, 4300, 5800, 8000, 15000][i]);
      ctx.save();
      rr(ctx, x + 2, st.y + (cur ? -4 : 0), bw - 4, st.h + (cur ? 4 : 0), 10);
      ctx.fillStyle = ct; ctx.globalAlpha = cur ? 1 : 0.55; ctx.fill();
      if (cur) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.stroke(); }
      ctx.restore();
      txt(ctx, b[0], x + bw / 2, st.y + 21, 15, '#10172b', { weight: 900 });
      txt(ctx, b[1], x + bw / 2, st.y + 40, 13, '#1b2540', { weight: 800 });
    });
    // 다이얼
    drawDial(ctx, L, G, f, t);
    const Tn = Math.round(A.TV / 10) * 10;
    txt(ctx, Tn.toLocaleString('en-US') + ' K', G.readX, G.readY, L.kind === 'wide' ? 44 : 40, '#fff', { align: 'left', weight: 900, font: JUA });
    pill(ctx, G.readX + 2, G.readY + 34, colorName(A.TV), { align: 'left', bg: hex, color: '#10172b', size: 15, pad: 12 });
    const note = 'K(켈빈)는 과학에서 쓰는 온도 단위로, 수천 도에서는 ℃ 값과 거의 같아요';
    if (L.kind === 'wide') txt(ctx, '※ ' + note, 214, G.noteY, 13, 'rgba(190,205,240,.85)', { align: 'left', weight: 700 });
    else { txt(ctx, '※ K(켈빈)는 과학에서 쓰는 온도 단위로,', 14, G.noteY, 13, 'rgba(190,205,240,.85)', { align: 'left', weight: 700 }); txt(ctx, '수천 도에서는 ℃ 값과 거의 같아요', 28, G.noteY + 20, 13, 'rgba(190,205,240,.85)', { align: 'left', weight: 700 }); }
  }
  function drawDial(ctx, L, G, f, t) {
    const d = G.dial, a0 = 135 * Math.PI / 180, span = 270 * Math.PI / 180;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineWidth = 12;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1.15) / N;
      ctx.strokeStyle = tempColor(tOfF((u0 + u1) / 2)); ctx.beginPath(); ctx.arc(d.x, d.y, d.r, a0 + span * u0, a0 + span * Math.min(1, u1)); ctx.stroke();
    }
    ctx.restore();
    // 몸통
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = S.tDrag ? 16 : 8; ctx.shadowOffsetY = S.tDrag ? 7 : 3;
    const kg = ctx.createRadialGradient(d.x - 8, d.y - 10, 4, d.x, d.y, d.r - 12);
    kg.addColorStop(0, '#59647f'); kg.addColorStop(1, '#262c3e');
    ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(d.x, d.y, d.r - 14, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(200,215,245,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.x, d.y, d.r - 14, 0, TAU); ctx.stroke();
    // 손잡이 (관성 있게 돎)
    const ang = a0 + span * A.dialF;
    const hx = d.x + Math.cos(ang) * (d.r - 8), hy = d.y + Math.sin(ang) * (d.r - 8);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(d.x + Math.cos(ang) * 8, d.y + Math.sin(ang) * 8); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.shadowColor = tempColor(A.TV); ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
    txt(ctx, '온도', d.x, d.y + 6, 14, '#cfe0ff', { weight: 800 });
    txt(ctx, '낮음', d.x - d.r + 4, d.y + d.r + 12, 13, '#ffb27a', { weight: 800 });
    txt(ctx, '높음', d.x + d.r - 4, d.y + d.r + 12, 13, '#a9c6ff', { weight: 800 });
    if (!S.dialTouched && !RM) { ctx.save(); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3); ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 12, a0 + span * 0.3, a0 + span * 0.7); ctx.stroke(); ctx.restore(); }
  }
  function drawForge(ctx, L, G, f, t) {
    const fg = G.forge, wide = L.kind === 'wide';
    glass(ctx, fg, 14, 0.04);
    const u = clamp(f / 0.45, 0, 1), capped = f >= 0.45;
    const RAMP = [[0, '#2a1f1f'], [0.2, '#7a1c0c'], [0.45, '#d8400f'], [0.7, '#ff8a1e'], [0.88, '#ffcb55'], [1, '#fff1c2']];
    let i = 0; while (i < RAMP.length - 2 && u > RAMP[i + 1][0]) i++;
    const k = clamp((u - RAMP[i][0]) / (RAMP[i + 1][0] - RAMP[i][0]), 0, 1);
    const rodC = SciSim.color.mix(RAMP[i][1], RAMP[i + 1][1], k);
    const rx = fg.x + 26, ry = fg.y + fg.h * (wide ? 0.46 : 0.5), rw = fg.w - 52, rh = wide ? 26 : 22;
    txt(ctx, '🔨 대장간 쇠막대', fg.x + 16, fg.y + 26, 14, '#ffe9a8', { align: 'left', weight: 800 });
    if (u > 0.08) star(ctx, rx + rw / 2, ry + rh / 2, rw * 0.32, '#ff8a3d', { halo: 1.9, alpha: 0.5 * u + (capped && !RM ? 0.08 * Math.sin(t * 8) : 0) });
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#2c313f'; rr(ctx, rx - 18, ry + rh / 2 - 5, 30, 10, 5); ctx.fill();
    const rg = ctx.createLinearGradient(0, ry, 0, ry + rh); rg.addColorStop(0, SciSim.color.mix(rodC, '#ffffff', 0.35)); rg.addColorStop(0.5, rodC); rg.addColorStop(1, SciSim.color.shade(rodC, -0.35));
    ctx.fillStyle = rg; rr(ctx, rx, ry, rw, rh, 7); ctx.fill(); ctx.restore();
    const celsius = Math.round((500 + 1000 * u) / 50) * 50;
    pill(ctx, fg.x + fg.w / 2, fg.y + fg.h - (wide ? 26 : 22), '약 ' + celsius.toLocaleString('en-US') + ' ℃', { bg: 'rgba(8,16,40,.8)', size: 14 });
    if (capped) pill(ctx, fg.x + fg.w / 2, ry - (wide ? 20 : 16), '이보다 뜨거우면 쇠가 녹아요', { bg: '#b45309', size: 13 });
  }
  function drawLadder(ctx, L, G, t) {
    const sm = G.small, T = A.cardT;
    drawStarBall(ctx, sm.x, sm.y, sm.r, T, t, 0.1);
    txt(ctx, '⭐ 별의 색', sm.x, sm.y + sm.r + 26, 14, '#bcd0ff', { weight: 800 });
    const g = csGeo(L, 'ladder'), top = g.slots[0], bot = g.slots[4];
    txt(ctx, '표면 온도 높음 ▲', top.x + top.w / 2, top.y - 12, 14, '#a9c6ff', { weight: 800 });
    txt(ctx, '표면 온도 낮음 ▼', bot.x + bot.w / 2, bot.y + bot.h + 22, 14, '#ffb27a', { weight: 800 });
    csDraw(ctx, L, t, S.ladderDone);
    if (S.ladderDone) {
      LADDER_DEFS.forEach((d, i) => {
        const a = clamp((S.ladderT - 0.4 - i * 0.28) / 0.4, 0, 1); if (a <= 0) return;
        const s = g.slots[d.answer];
        txt(ctx, d.tTxt, s.x + s.w - 6, s.y + s.h / 2 + 5, 13, '#ffd36b', { align: 'right', weight: 800, alpha: a });
      });
    }
    txt(ctx, S.ladderDone ? '파란빛일수록 표면 온도가 높아요!' : '카드를 끌어 사다리 칸에 놓아요', 16, L.vh - (L.kind === 'wide' ? 34 : 60), 14, '#bcd0ff', { align: 'left', weight: 800 });
  }

  /* =========================================================
     동작 · 입력 · 화면 연결
     ========================================================= */
  Object.assign(S, { photons: [], curveA: 0, lightP: [], ringOn: false, msg: '', msgT: 0, tip: '', dialTouched: false, lastCardT: null, spawnAcc: 0, lightAcc: [0, 0] });
  A.dialF = fOfT(4000); A.cardT = 5800;
  const dialSp = new SciSim.Spring(fOfT(4000), { stiffness: 90, damping: 11 });
  let curL = LAYOUTS.wide;
  const RATIO = [1, 2.5, 6.3, 16, 40, 100];
  const ratioOf = (m) => RATIO[clamp(6 - m, 0, 5)];
  const fOfMag = (m) => Math.pow(100, (6 - m) / 5);

  function tapStar(id, L) {
    const exp = RANK[S.taps.length] && RANK[S.taps.length][0];
    if (S.taps.indexOf(id) >= 0 || S.taps.length >= 5) return;
    const s = ORI(id);
    if (id === exp) {
      const G = scaleGeo(L), p = skyPos(L, id), m = RANK[S.taps.length][1], k = S.taps.length;
      S.taps.push(id); Sound.tick();
      S.tags.push({ name: s.name, m, x0: p.x, y0: p.y - 20, x1: G.xOf(m), y1: G.barY - 46 - (k % 2) * 26, t: 0, dur: RM ? 0.05 : 0.6 });
      particles.burst(p.x, p.y, { count: 8, size: 3, speed: 90, gravity: 0, life: 0.5, colors: ['#ffd36b', '#fff'] });
      if (S.taps.length === 5) Sound.tone(880, 0.14, 'triangle', 0.08);
    } else {
      S.shake[id] = 0.4; Sound.fail();
      SciSim.toast('더 밝아 보이는 별이 남아 있어요!', 'bad', 1800);
    }
  }
  const ringAt = (p, L) => RANK.map((r) => r[0]).find((id) => { const q = skyPos(L, id); return Math.hypot(p.x - q.x, p.y - q.y) < 30; });

  function setCmp(m) {
    m = clamp(m, 1, 6);
    if (m === S.cmpM) return;
    const up = m < S.cmpM;
    S.cmpM = m; S.cmpVis.add(m); Sound.tone(up ? 520 + (6 - m) * 90 : 420, 0.1, 'triangle', 0.08);
    $('#oCmp').textContent = m + '등급';
  }
  function setSensor(d, fromSlider) {
    d = clamp(Math.round(d / 10) * 10, 20, 100);
    if (d !== S.sensor) Sound.tick();
    S.sensor = d; S.sensorMoved = true;
    if (!fromSlider) sSensor.set(d);
  }
  function recordData() {
    const d = S.sensor;
    if (Math.abs(A.sensorV - d) > 3) return;
    if (S.data.some((x) => x.d === d)) { SciSim.toast('이미 기록한 거리예요. 센서를 옮겨 다른 거리에서 재어 보세요.', '', 1700); S.fresh = d; renderTable(); return; }
    S.data.push({ d, I: Math.round(I_OF(d)), pop: 0, label: 1 }); S.data.sort((a, b) => a.d - b.d); S.fresh = d;
    Sound.tick(); renderTable();
    particles.burst(curL.kind === 'wide' ? 400 : 260, labGeo(curL).graph.y + 80, { count: 8, size: 3.4, speed: 100, gravity: 80, life: 0.6, colors: ['#ffd36b', '#fff4c4'] });
  }
  function renderTable() {
    const rD = $('#rowD'), rP = $('#rowP');
    rD.innerHTML = '<th>거리 (cm)</th>'; rP.innerHTML = '<th>빛의 세기 (lx)</th>';
    if (!S.data.length) { rD.insertAdjacentHTML('beforeend', '<td class="empty">–</td>'); rP.insertAdjacentHTML('beforeend', '<td class="empty">–</td>'); }
    S.data.forEach((x) => {
      const cls = x.d === S.fresh ? ' class="fresh"' : '';
      rD.insertAdjacentHTML('beforeend', '<td' + cls + '>' + x.d + '</td>'); rP.insertAdjacentHTML('beforeend', '<td' + cls + '>' + x.I.toLocaleString('en-US') + '</td>');
    });
    $('#dataN').textContent = '기록 ' + S.data.length + '개';
  }
  function setTempF(f, fromSlider) {
    f = clamp(f, 0, 1); S.T = tOfF(f); dialSp.target = f;
    if (!fromSlider) sTemp.set(Math.round(f * 1000));
    $('#oTemp').textContent = (Math.round(S.T / 10) * 10).toLocaleString('en-US') + ' K';
  }
  function snapToken(tk, L) {
    tk.lg = 1; tk.snapped = true; Sound.tone(988, 0.14, 'triangle', 0.1);
    tween(tk, { ghostA: 1 }, { duration: 0.4 }); tween(tk, { badge: 1 }, { duration: 0.4, delay: 0.1 });
    const G = g10(L), x = xOfLg(G, 1), y = rowY(G, tk.def.row);
    particles.burst(x, y, { count: 14, size: 3.2, speed: 150, gravity: 40, life: 0.8, colors: ['#ffd36b', '#fff', '#9be7ff'] });
    S.msg = tk.id === 'sun' ? '태양도 10 pc에서는 희미한 별!' : '북극성이 −3.6등급으로 아주 밝아졌어요!'; S.msgT = 3.2;
  }
  function ensureSnapped() {
    S.tokens.forEach((tk) => { tk.lg = 1; tk.snapped = true; tk.ghostA = 1; tk.badge = 1; });
    S.sortMode = false; S.selTok = 'sun'; A.mV = magAt(tokOf('sun'));
  }
  const shuffleIdx = (n) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function resetScene() {
    const sc = S.scene;
    if (sc === 'sky') { S.taps = []; S.tags = []; S.cmpM = 6; S.cmpVis = new Set([6]); $('#oCmp').textContent = '6등급'; }
    else if (sc === 'lab') { S.data = []; S.fresh = null; S.curveA = 0; renderTable(); setSensor(30); }
    else if (sc === 'map10') { if (S.sortMode) { csInit('sort', SORT_DEFS, shuffleIdx(5)); S.sortDone = false; S.sortT = 0; } else initTokens(); }
    else if (sc === 'heater') { if (S.ladderMode) { csInit('ladder', LADDER_DEFS, shuffleIdx(5)); S.ladderDone = false; S.ladderT = 0; } else setTempF(fOfT(4000)); }
    Sound.click();
  }
  function enterScene(sc) {
    S.scene = sc;
    A.sceneA = 0; tween(A, { sceneA: 1 }, { duration: 0.35, ease: 'outCubic' });
    uiSig = '';
    if (sc === 'map10' && !S.tokens.length) initTokens();
  }

  /* ---------- 화면 요소 연결 ---------- */
  const sSensor = SciSim.bindRange($('#sSensor'), $('#oSensor'), (v) => v + ' cm', (v) => setSensor(v, true));
  const sTemp = SciSim.bindRange($('#sTemp'), null, null, (v) => setTempF(v / 1000, true));
  $('#cmpBright').addEventListener('click', () => setCmp(S.cmpM - 1));
  $('#cmpDim').addEventListener('click', () => setCmp(S.cmpM + 1));
  $('#recBtn').addEventListener('click', recordData);
  $('#clearBtn').addEventListener('click', () => { S.data = []; S.fresh = null; S.curveA = 0; renderTable(); Sound.click(); });
  $('#resetBtn').addEventListener('click', resetScene);
  document.querySelectorAll('#sceneTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.freeScene = b.getAttribute('data-scene'); }));

  let uiSig = '', roCache = ['', '', ''];
  function syncUI() {
    const sc = S.scene, free = !!(game && game.free);
    const cmpVis = sc === 'sky' && (S.cmpOn || free), tempVis = sc === 'heater' && !S.ladderMode;
    const sig = [sc, free, cmpVis, tempVis, S.sortMode, S.ladderMode].join('|');
    if (sig !== uiSig) {
      uiSig = sig;
      const show = (id, vis) => $('#' + id).classList.toggle('is-off', !vis);
      show('cCmp', cmpVis); show('cSensor', sc === 'lab'); show('cRec', sc === 'lab'); show('recCard', sc === 'lab'); show('cTemp', tempVis);
      $('#ctrlCard').hidden = !(cmpVis || sc === 'lab' || tempVis);
      show('sceneTabs', free);
      document.querySelectorAll('#sceneTabs button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-scene') === sc));
      $('#sceneLabel').textContent = SCENES[sc] + (sc === 'map10' && S.sortMode ? ' · 별 분류' : '') + (sc === 'heater' && S.ladderMode ? ' · 온도 사다리' : '');
      $('#readouts').classList.toggle('is-off', !(cmpVis || sc === 'lab' || (sc === 'map10' && !S.sortMode) || tempVis));
    }
    const ro = (i, label, html) => {
      const key = label + '|' + html, n = $('#ro' + i);
      if (roCache[i] === key) return;
      roCache[i] = key; n.classList.toggle('is-off', !label);
      if (label) { n.querySelector('.label').textContent = label; n.querySelector('.value').innerHTML = html; }
    };
    if (cmpVis) { ro(0, '시험 별의 등급', S.cmpM + '<small>등급</small>'); ro(1, '6등급 별의 몇 배?', '약 ' + ratioOf(S.cmpM) + '<small>배</small>'); ro(2, '', ''); }
    else if (sc === 'lab') { ro(0, '센서 위치', S.sensor + '<small>cm</small>'); ro(1, '빛의 세기', Math.round(I_OF(S.sensor)).toLocaleString('en-US') + '<small>lx</small>'); ro(2, '', ''); }
    else if (sc === 'map10' && !S.sortMode) { const tk = tokOf(S.selTok) || { def: STARS10.sun, snapped: false }; ro(0, '선택한 별', tk.def.name); ro(1, '겉보기 등급', fmtMs(A.mV)); ro(2, '절대 등급', tk.snapped ? fmtMs(tk.def.M) : '?'); }
    else if (tempVis) { ro(0, '표면 온도', (Math.round(A.TV / 10) * 10).toLocaleString('en-US') + '<small>K</small>'); ro(1, '별의 색', colorName(A.TV)); ro(2, '', ''); }
  }

  /* ---------- 캔버스 입력 ---------- */
  function sensorHit(p, L) { const G = labGeo(L), x = G.xL + A.sensorV * G.pxcm, top = G.lampY - 14 * G.ps; return Math.abs(p.x - x) < 38 && p.y > top - 12 && p.y < top + 134 * G.ps + 14; }
  function tokenAt(p, L) { const G = g10(L); return S.tokens.slice().reverse().find((tk) => { const x = xOfLg(G, tk.lg), y = rowY(G, tk.def.row); return Math.hypot(p.x - x, p.y - y) < G.r + 12; }); }
  function dialHit(p, L) { const d = gH(L).dial; return Math.hypot(p.x - d.x, p.y - d.y) < d.r + 18; }
  const cardMode = () => (S.scene === 'map10' && S.sortMode ? 'sort' : S.scene === 'heater' && S.ladderMode ? 'ladder' : null);
  const cardsLocked = () => (CS.mode === 'sort' ? S.sortDone : S.ladderDone) && !(game && game.free);
  function grabAt(p, L) {
    const cm = cardMode();
    if (cm) return !cardsLocked() && !!csAt(p, L);
    switch (S.scene) {
      case 'lab': return on('sensor') && sensorHit(p, L);
      case 'map10': return !!tokenAt(p, L);
      case 'heater': return dialHit(p, L);
    }
    return false;
  }
  function dialSet(p, L) {
    const d = gH(L).dial;
    let a = Math.atan2(p.y - d.y, p.x - d.x) * 180 / Math.PI; if (a < 0) a += 360;
    let rel = (a - 135 + 360) % 360;
    if (rel > 270) rel = rel > 315 ? 0 : 270;
    setTempF(rel / 270); S.dialTouched = true;
  }
  function attach(v, L) {
    SciSim.pointer(v, {
      hover(p) { return grabAt(p, L) ? 'grab' : S.scene === 'sky' && S.ringOn && ringAt(p, L) ? 'pointer' : null; },
      down(p) {
        curL = L;
        const sc = S.scene;
        if (sc === 'sky') { if (S.ringOn) { const id = ringAt(p, L); if (id) tapStar(id, L); } return false; }
        if (!grabAt(p, L)) return false;
        const cm = cardMode();
        if (cm) {
          const c = csAt(p, L); if (!c) return false;
          c.drag = true; c.off = { x: p.x - c.fx * L.vw, y: p.y - c.fy * L.vh };
          CS.items.splice(CS.items.indexOf(c), 1); CS.items.push(c); Sound.click();
          if (cm === 'ladder') S.lastCardT = c.def.T;
          if (cm === 'sort' && S.sortDone) { S.sortDone = false; }
          if (cm === 'ladder' && S.ladderDone) { S.ladderDone = false; }
          return true;
        }
        if (sc === 'lab') { S.sensorDrag = true; return true; }
        if (sc === 'map10') { const tk = tokenAt(p, L); S.tokDrag = tk; S.selTok = tk.id; tk.snapped = false; return true; }
        if (sc === 'heater') { S.tDrag = true; dialSet(p, L); return true; }
        return false;
      },
      move(p) {
        const cm = cardMode();
        if (cm) { const c = CS.items[CS.items.length - 1]; if (c && c.drag) { c.fx = (p.x - c.off.x) / L.vw; c.fy = (p.y - c.off.y) / L.vh; } return; }
        const sc = S.scene;
        if (sc === 'lab') { const G = labGeo(L); setSensor((p.x - G.xL) / G.pxcm); }
        else if (sc === 'map10' && S.tokDrag) {
          const G = g10(L), tk = S.tokDrag; let lg = clamp(lgOfX(G, p.x), LG_AU, 3);
          if (Math.abs(lg - 1) < 0.08) lg = 1; tk.lg = lg;
          tk.ghostA = Math.abs(lg - tk.def.lg) > 0.02 ? 1 : 0;
        } else if (sc === 'heater') dialSet(p, L);
      },
      up() {
        const cm = cardMode();
        if (cm) { const c = CS.items[CS.items.length - 1]; if (c && c.drag) csDrop(c, L); return; }
        const sc = S.scene;
        if (sc === 'lab') S.sensorDrag = false;
        else if (sc === 'map10' && S.tokDrag) { const tk = S.tokDrag; S.tokDrag = null; if (tk.lg === 1) snapToken(tk, L); else { tk.badge = 0; tk.snapped = false; } }
        else if (sc === 'heater') S.tDrag = false;
      },
    });
    if (L.kind === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => { const tc = e.touches[0]; if (tc && grabAt(v.toLocal(tc), L)) e.preventDefault(); }, { passive: false });
    }
  }
  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    attach(v, L);
    return { v, L };
  });
  function drawFrame(v, L, t) {
    const ctx = v.ctx;
    v.clear(); ctx.save(); ctx.globalAlpha = A.sceneA;
    if (S.scene === 'sky') drawSky(v, L, t);
    else if (S.scene === 'lab') drawLab(v, L, t);
    else if (S.scene === 'map10') drawMap10(v, L, t);
    else drawHeater(v, L, t);
    particles.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 도우미 · 그림 (SVG) ---------- */
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fmtN = (n) => (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
  const FIG_FONT = FONT.replace(/"/g, '');
  const svgHead = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FIG_FONT + '\'>';
  const FIG = {};
  FIG.spread = (function () {
    let s = svgHead(320, 140, '같은 빛이 1칸, 4칸, 9칸으로 퍼지는 그림') + '<rect width="320" height="140" rx="12" fill="#0e1838"/>';
    s += '<circle cx="34" cy="70" r="13" fill="#ffe9a8"/><circle cx="34" cy="70" r="22" fill="#ffe9a8" fill-opacity=".25"/>';
    [[1, 100], [2, 180], [3, 260]].forEach((p) => {
      const n = p[0], x = p[1], side = 30 * n, y0 = 70 - side / 2;
      s += '<rect x="' + (x - side / 2) + '" y="' + y0 + '" width="' + side + '" height="' + side + '" fill="#ffd36b" fill-opacity="' + (0.34 / (n * n)).toFixed(2) + '" stroke="#ffe9a8" stroke-opacity=".7"/>';
      for (let k = 1; k < n; k++) s += '<line x1="' + (x - side / 2 + 30 * k) + '" y1="' + y0 + '" x2="' + (x - side / 2 + 30 * k) + '" y2="' + (y0 + side) + '" stroke="#ffe9a8" stroke-opacity=".5"/><line x1="' + (x - side / 2) + '" y1="' + (y0 + 30 * k) + '" x2="' + (x + side / 2) + '" y2="' + (y0 + 30 * k) + '" stroke="#ffe9a8" stroke-opacity=".5"/>';
      s += '<text x="' + x + '" y="' + (y0 + side + 18) + '" text-anchor="middle" font-size="13" font-weight="800" fill="#ffe9a8">' + (n * n) + '칸 · ' + (n === 1 ? '1' : '1/' + n * n) + '</text>';
      s += '<text x="' + x + '" y="' + (y0 - 8) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#cfe0ff">' + (n * 20) + ' cm</text>';
    });
    return s + '</svg>';
  })();
  FIG.table = svgHead(320, 112, '거리와 빛의 세기 측정 결과표') + '<rect width="320" height="112" rx="12" fill="#0e1838"/>' +
    [['거리', '20 cm', '40 cm', '60 cm', '80 cm'], ['빛의 세기', '1600 lx', '400 lx', '178 lx', '100 lx']].map((row, r) => row.map((c, i) =>
      '<text x="' + (i === 0 ? 12 : 100 + (i - 1) * 68) + '" y="' + (42 + r * 44) + '" text-anchor="' + (i === 0 ? 'start' : 'middle') + '" font-size="' + (i === 0 ? 14 : 15) + '" font-weight="800" fill="' + (i === 0 ? '#9db4e8' : r ? '#ffd36b' : '#fff') + '">' + c + '</text>').join('')).join('') +
    '<line x1="8" y1="58" x2="312" y2="58" stroke="#3a4a7a"/></svg>';
  FIG.ladder = svgHead(320, 130, '별의 색과 표면 온도 순서') + '<rect width="320" height="130" rx="12" fill="#0e1838"/>' +
    [['리겔', '청백색', 12000], ['시리우스', '흰색', 9900], ['태양', '노란색', 5800], ['아르크투루스', '주황색', 4300], ['베텔게우스', '붉은색', 3600]].map((r, i) =>
      '<circle cx="' + (34 + i * 63) + '" cy="46" r="17" fill="' + tempHex(r[2]) + '"/><text x="' + (34 + i * 63) + '" y="88" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">' + r[0] + '</text><text x="' + (34 + i * 63) + '" y="106" text-anchor="middle" font-size="12.5" font-weight="700" fill="#cfe0ff">' + r[1] + '</text>').join('') +
    '<text x="10" y="20" font-size="13" font-weight="800" fill="#a9c6ff">표면 온도 높음 →</text><text x="310" y="20" text-anchor="end" font-size="13" font-weight="800" fill="#ffb27a">→ 낮음</text></svg>';

  /* ---------- 단계별 학습 ---------- */
  game = SciSim.game({
    simId: 'm2-star-properties',
    mount: '#game',
    badge: '별빛 분석가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      sky: '🌌 겨울 밤하늘', scale: '📏 등급 눈금', compare: '⚖️ 등급 비교기', lab: '🔦 빛의 세기 실험대', sensor: '📱 디지털 조도 센서',
      record: '📋 실험 결과 표 · 📈 그래프', map10: '🗺 10 pc 거리 지도', heater: '🌡 별 모형 온도 조절기', colorcards: '🃏 별 색 카드',
    },
    onFeatures(set) { FEAT = set; },
    onMissionStart() { S.ringOn = false; },
    levels: [
      /* ---------- STEP 1 · 관찰 ---------- */
      {
        title: '별의 밝기와 등급', short: '별의 등급', icon: '✨', phase: '관찰',
        features: ['sky', 'scale', 'compare'],
        intro: '<p class="si-q">❓ 탐구 질문: 밤하늘에서 밝게 보이는 별은 정말로 빛을 많이 내는 별일까?</p>' +
          '<p>먼저 겨울철 남쪽 하늘의 별들을 관찰하며, 별의 밝기를 <b>등급</b>으로 나타내는 방법을 알아봐요.</p>',
        setup() { S.taps = []; S.tags = []; S.ringOn = false; S.cmpOn = false; S.cmpM = 6; S.cmpVis = new Set([6]); $('#oCmp').textContent = '6등급'; },
        recap: '별의 밝기는 등급으로 나타내요. 밝을수록 등급의 숫자가 작고, 1등급 차이는 약 2.5배, 5등급 차이는 100배의 밝기 차이예요.',
        summary: '<ul><li>밝게 보이는 별일수록 등급의 숫자가 작다 (0등급, −1등급도 있다).</li><li>1등급 차이 → 밝기 약 2.5배, 5등급 차이 → 100배</li><li>맨눈으로 보이는 가장 어두운 별은 약 6등급</li></ul>',
        missions: [
          {
            title: '🌌 밝은 순서로 탭하기',
            goal: '번호 고리가 있는 별 5개를 <b>가장 밝아 보이는 별부터</b> 차례로 탭하세요.',
            setup() { S.ringOn = true; S.cmpOn = false; S.taps = []; S.tags = []; },
            check: () => S.taps.length === 5,
            hold: 0.8,
            status: () => '찾은 순서 <b>' + S.taps.length + '/5</b>',
            hint: '별 점이 크고 빛 번짐이 넓을수록 밝게 보이는 별이에요.',
            explain: '밝게 보이는 별일수록 등급의 숫자가 작아요: 시리우스 −1.5, 리겔 0.1, 벨라트릭스 1.6, 민타카 2.2, 메이사 3.4등급. 고대 그리스의 히파르코스는 맨눈으로 보이는 가장 밝은 별을 1등급, 가장 어두운 별을 6등급으로 정했고, 지금은 1등급보다 밝은 별을 0등급, −1등급처럼 나타내요.',
          },
          {
            title: '⚖️ 등급 비교기',
            goal: '등급 비교기에서 별의 등급을 6등급부터 한 등급씩 밝게 바꿔 <b>1등급</b>까지 만들어 보세요. 밝기가 몇 배씩 커지는지 보세요.',
            setup() { S.ringOn = false; S.cmpOn = true; S.cmpM = 6; S.cmpVis = new Set([6]); $('#oCmp').textContent = '6등급'; },
            check: () => [5, 4, 3, 2, 1].every((v) => S.cmpVis.has(v)) && S.cmpM === 1,
            hold: 0.6,
            status: () => '지금 <b>' + S.cmpM + '등급</b> · 6등급 별의 ' + (S.cmpM === 6 ? '밝기와 같아요' : '약 <b>' + ratioOf(S.cmpM) + '배</b>'),
            hint: '◀ 밝게 버튼을 한 번 누를 때마다 등급이 1씩 작아져요.',
            explain: '등급이 1 작아질 때마다 밝기는 약 2.5배씩 커졌어요: 1 → 2.5 → 6.3 → 16 → 40 → 100배. 1등급 별 하나는 6등급 별 100개를 모은 만큼 밝아요.',
          },
          {
            type: 'quiz', title: '❓ 1등급과 6등급',
            goal: '1등급인 별은 6등급인 별보다 약 몇 배 밝을까?',
            setup() { S.ringOn = false; S.cmpOn = true; },
            choices: ['5배', '약 2.5배', '100배', '6배'],
            answer: 2,
            feedback: ['등급 차이는 5지만, 한 등급마다 약 2.5배씩 \'곱해져요\'.', '약 2.5배는 1등급 차이일 때예요. 1등급과 6등급은 5등급 차이예요.', null, '등급의 숫자를 곱하거나 나누는 것이 아니에요.'],
            explain: '1등급 차이는 약 2.5배, 5등급 차이는 100배의 밝기 차이예요(2.5×2.5×2.5×2.5×2.5 ≈ 100).',
          },
        ],
      },
      /* ---------- STEP 2 · 실험 ---------- */
      {
        title: '거리에 따른 빛의 세기', short: '빛의 세기', icon: '💡', phase: '실험',
        features: ['lab', 'sensor', 'record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별의 밝기를 등급으로 나타냈어요.</div>' +
          '<p>그런데 똑같은 별이라도 멀리 있으면 더 어둡게 보이지 않을까요? 전구와 <b>디지털 조도 센서</b>로 광원으로부터의 거리에 따른 빛의 세기를 측정해 봐요.</p>',
        setup() { S.data = []; S.fresh = null; S.curveA = 0; S.sensorMoved = false; S.photons.length = 0; setSensor(30); A.sensorV = 30; A.readV = I_OF(30); renderTable(); },
        recap: '광원에서 멀어질수록 빛의 세기가 약해져요. 거리가 2배, 3배가 되면 빛의 세기는 1/4, 1/9이 돼요.',
        summary: '<ul><li>광원에서 멀어질수록 빛이 넓게 퍼져 빛의 세기가 약해진다.</li><li>거리 2배 → 1/4, 거리 3배 → 1/9 (거리의 제곱에 반비례)</li><li>⇒ 같은 별도 멀리 있을수록 어둡게 보인다.</li></ul><div class="note-fig">' + FIG.spread + '</div>',
        missions: [
          {
            title: '📍 측정하고 기록하기',
            goal: '센서를 <b>20 cm, 40 cm, 60 cm, 80 cm</b>에 놓고 빛의 세기를 각각 📍 기록하세요.',
            check: () => [20, 40, 60, 80].every((d) => S.data.some((x) => x.d === d)),
            hold: 0.8,
            status: () => [20, 40, 60, 80].map((d) => chk(S.data.some((x) => x.d === d), d + ' cm')).join(' · '),
            hint: '센서를 끌어 눈금에 맞춘 뒤 📍 기록을 누르세요. 실제 실험에서는 주변 불을 끄고 측정해요.',
            explain: '광원에서 멀어질수록 빛의 세기가 빠르게 약해졌어요. 20 cm에서 1600 lx였던 빛이 40 cm에서는 400 lx, 80 cm에서는 100 lx가 되었어요.',
          },
          {
            type: 'quiz', title: '❓ 거리가 2배가 되면',
            goal: '표를 보세요. 거리가 20 cm에서 40 cm로 <b>2배</b>가 되면 빛의 세기는 어떻게 될까?',
            figure: FIG.table,
            choices: ['1/2로 줄어든다', '1/4로 줄어든다', '2배로 커진다', '변하지 않는다'],
            answer: 1,
            feedback: ['1600 lx의 1/2은 800 lx예요. 40 cm에서 잰 값은 얼마였나요?', null, '멀어질수록 어두워졌어요.', '값이 달라졌어요. 표를 다시 보세요.'],
            explain: '빛은 사방으로 퍼져 나가요. 거리가 2배가 되면 같은 빛이 4배 넓은 면적에 퍼져 빛의 세기는 1/4, 3배가 되면 9배 넓은 면적에 퍼져 1/9이 돼요(빛의 세기는 거리의 제곱에 반비례). 별도 마찬가지로, 같은 별이 2배 멀리 있으면 1/4 밝기로 보여요.',
          },
        ],
      },
      /* ---------- STEP 3 · 설명 ---------- */
      {
        title: '겉보기 등급과 절대 등급', short: '절대 등급', icon: '🌠', phase: '설명',
        features: ['map10'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광원에서 멀어질수록 빛의 세기가 약해진다는 것을 확인했어요.</div>' +
          '<p>그렇다면 밝게 보이는 별이 정말 빛을 많이 내는 별일까요? 별들을 모두 같은 거리 <b>10 pc</b>에 옮겨 놓고 공정하게 비교해 봐요. (1 pc: 연주시차가 1″인 별까지의 거리)</p>',
        setup() { S.sortMode = false; S.sortDone = false; initTokens(); S.msg = ''; S.tip = ''; },
        recap: '겉보기 등급은 지구에서 보이는 밝기, 절대 등급은 10 pc에 두었을 때의 밝기예요. 실제 밝기는 절대 등급으로 비교하고, 두 등급을 비교하면 거리를 짐작할 수 있어요.',
        summary: '<ul><li><b>겉보기 등급</b>: 지구에서 보이는 밝기로 정한 등급 (거리에 따라 달라짐)</li><li><b>절대 등급</b>: 별을 10 pc 거리에 두었다고 할 때의 등급 → 실제 밝기 비교</li><li>겉보기 &lt; 절대: 10 pc보다 가까움 · 겉보기 = 절대: 약 10 pc · 겉보기 &gt; 절대: 10 pc보다 멂</li><li>예) 태양 −26.7 / +4.8, 북극성 +2.0 / −3.6</li></ul>',
        missions: [
          {
            title: '🗺 10 pc로 옮기기',
            goal: '<b>태양</b>과 <b>북극성</b>을 10 pc 기준선으로 옮겨, 같은 거리에서 밝기가 어떻게 달라지는지 보세요.',
            setup() { S.sortMode = false; S.sortDone = false; initTokens(); S.tip = '별 배지를 끌어 빛나는 10 pc 점선 위에 놓으세요.'; },
            check: () => S.tokens.length === 2 && S.tokens.every((tk) => tk.snapped),
            hold: 1.0,
            status: () => { const a = tokOf('sun'), b = tokOf('polaris'); return '태양: 겉보기 −26.7 → 절대 <b>' + (a && a.snapped ? '+4.8' : '?') + '</b> · 북극성: 겉보기 2.0 → 절대 <b>' + (b && b.snapped ? '−3.6' : '?') + '</b>'; },
            hint: '별 배지를 끌어 빛나는 10 pc 점선 위에 놓으세요.',
            explain: '태양을 10 pc에 두면 4.8등급의 희미한 별이 되고, 북극성은 −3.6등급으로 아주 밝아져요. 지구에서 보이는 밝기로 정한 등급을 <b>겉보기 등급</b>, 별을 10 pc 거리에 두었다고 할 때의 등급을 <b>절대 등급</b>이라고 해요.',
          },
          {
            type: 'quiz', title: '❓ 실제로 더 밝은 별',
            goal: '태양(겉보기 −26.7, 절대 +4.8)과 북극성(겉보기 +2.0, 절대 −3.6) 가운데 실제로 빛을 더 많이 내는 별은?',
            setup() { ensureSnapped(); S.tip = '10 pc에서 비교하면 실제 밝기를 알 수 있어요.'; },
            choices: ['태양 — 겉보기 등급이 훨씬 작으니까', '북극성 — 절대 등급이 더 작으니까', '두 별이 내는 빛의 양은 같다', '등급으로는 알 수 없다'],
            answer: 1,
            feedback: ['겉보기 등급은 거리의 영향을 받아요. 태양은 아주 가까워서 밝게 보일 뿐이에요.', null, '10 pc에서 두 별의 밝기는 크게 달랐어요.', '같은 거리(10 pc)에서의 밝기인 절대 등급을 비교하면 알 수 있어요.'],
            explain: '별이 실제로 내는 빛의 양은 절대 등급으로 비교해요. 절대 등급이 작을수록 실제로 밝은 별이에요. 북극성은 태양보다 실제로 약 2천 배 밝아요.',
          },
          {
            title: '🧮 거리 짐작하기', manual: true,
            goal: '겉보기 등급과 절대 등급을 비교해 별 카드 5장을 알맞은 상자에 넣고 ✔ 확인하기를 누르세요.',
            setup() { S.sortMode = true; S.sortDone = false; S.sortT = 0; csInit('sort', SORT_DEFS, shuffleIdx(5)); S.tip = ''; },
            check() {
              const n = csPlaced();
              if (n < 5) return '카드 5장을 모두 넣어 주세요.';
              const ok = CS.items.filter((c) => c.slot === c.def.answer).length;
              if (ok === 5) return true;
              return ok + '장이 맞았어요. 겉보기 등급이 절대 등급보다 작으면(더 밝게 보이면) 10 pc보다 가까워요.';
            },
            status: () => '넣은 카드 <b>' + csPlaced() + '/5</b>',
            hint: '10 pc보다 가까운 별을 10 pc로 옮기면 더 어두워져요. 그러면 절대 등급의 숫자가 겉보기 등급보다 커져요.',
            explain: '겉보기 등급 &lt; 절대 등급이면 10 pc보다 가깝고, 두 값이 같으면 약 10 pc, 겉보기 등급 &gt; 절대 등급이면 10 pc보다 멀어요. 두 등급을 비교하면 별까지의 거리를 짐작할 수 있어요.',
          },
        ],
      },
      /* ---------- STEP 4 · 탐구 ---------- */
      {
        title: '별의 색과 표면 온도', short: '색과 온도', icon: '🌡️', phase: '탐구',
        features: ['heater', 'colorcards'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별의 밝기를 겉보기 등급과 절대 등급으로 비교했어요.</div>' +
          '<p>오리온자리를 다시 보면 베텔게우스는 붉고 리겔은 청백색이에요. 스스로 빛을 내는 물체의 온도를 바꾸어 보며, 별의 색이 무엇을 알려 주는지 알아봐요.</p>',
        setup() { S.sortMode = false; S.ladderMode = false; S.tHold = { red: 0, yellow: 0, white: 0, blue: 0 }; S.dialTouched = false; setTempF(fOfT(4000)); dialSp.value = fOfT(4000); A.TV = 4000; },
        recap: '별의 색은 표면 온도에 따라 달라요. 파란빛에 가까울수록 표면 온도가 높고, 붉은빛에 가까울수록 낮아요.',
        summary: '<p>표면 온도: <b>청백색 &gt; 흰색 &gt; 노란색 &gt; 주황색 &gt; 붉은색</b></p><ul><li>리겔(청백색) &gt; 시리우스(흰색) &gt; 태양(노란색) &gt; 아르크투루스(주황색) &gt; 베텔게우스(붉은색)</li><li>별의 색은 거리와 관계없이 표면 온도로 정해진다.</li></ul><div class="note-fig">' + FIG.ladder + '</div>',
        missions: [
          {
            title: '🌡 온도를 바꾸며 색 관찰하기',
            goal: '온도 조절기로 별 모형의 표면 온도를 바꾸며 <b>붉은색 · 노란색 · 흰색 · 청백색</b>을 모두 만들어 보세요.',
            setup() { S.ladderMode = false; S.sortMode = false; S.tHold = { red: 0, yellow: 0, white: 0, blue: 0 }; },
            check: () => S.tHold.red >= 0.5 && S.tHold.yellow >= 0.5 && S.tHold.white >= 0.5 && S.tHold.blue >= 0.5,
            hold: 0.3,
            status: () => chk(S.tHold.red >= 0.5, '붉은색') + ' · ' + chk(S.tHold.yellow >= 0.5, '노란색') + ' · ' + chk(S.tHold.white >= 0.5, '흰색') + ' · ' + chk(S.tHold.blue >= 0.5, '청백색'),
            hint: '다이얼을 천천히 돌려 보세요. 온도가 높아질수록 색이 어떻게 바뀌나요?',
            explain: '온도가 낮으면 붉은빛, 높아질수록 주황 → 노랑 → 흰색 → 청백색 빛을 내요. 대장간의 쇠도 더 뜨겁게 달굴수록 붉은빛에서 노란빛, 흰빛으로 바뀌어요.',
          },
          {
            title: '🃏 표면 온도 순서', manual: true,
            goal: '별의 색을 보고 <b>표면 온도가 높은 별부터</b> 사다리 칸에 놓은 뒤 ✔ 확인하기를 누르세요.',
            setup() { S.ladderMode = true; S.ladderDone = false; S.ladderT = 0; S.lastCardT = null; csInit('ladder', LADDER_DEFS, shuffleIdx(5)); },
            check() {
              const n = csPlaced();
              if (n < 5) return '카드 5장을 모두 놓아 주세요.';
              const ok = CS.items.filter((c) => c.slot === c.def.answer).length;
              return ok === 5 ? true : ok + '장이 제자리예요. 파란빛에 가까울수록 표면 온도가 높아요.';
            },
            status: () => '놓은 카드 <b>' + csPlaced() + '/5</b>',
            hint: '별 모형에서 청백색을 만들 때 온도가 높았나요, 낮았나요?',
            explain: '별의 표면 온도는 청백색 별 &gt; 흰색 별 &gt; 노란색 별 &gt; 주황색 별 &gt; 붉은색 별 순서예요. 별의 색은 거리나 밝기가 아니라 표면 온도에 따라 달라요.',
          },
          {
            type: 'quiz', title: '❓ 붉은 별에 대한 오해',
            goal: '베텔게우스처럼 붉게 보이는 별에 대한 설명으로 옳은 것은?',
            setup() { S.ladderMode = false; setTempF(fOfT(3600)); },
            choices: ['붉은색은 뜨거운 색이므로 표면 온도가 가장 높다', '다른 별보다 표면 온도가 상대적으로 낮다', '스스로 빛을 내지 못하고 햇빛을 반사한다', '너무 멀리 있어서 붉게 보인다'],
            answer: 1,
            feedback: ['수도꼭지의 빨간색(뜨거운 물) 표시와 반대예요! 별은 표면 온도가 낮을수록 붉어요.', null, '별은 스스로 빛을 내는 천체예요.', '별의 색은 거리가 아니라 표면 온도로 정해져요.'],
            explain: '붉은 별은 표면 온도가 상대적으로 낮은 별이에요(그래도 약 3,000 K가 넘을 만큼 매우 뜨거워요). 파란빛을 띠는 별일수록 표면 온도가 높아요.',
          },
        ],
      },
    ],
  });

  /* ---------- 갱신 · 시작 ---------- */
  const sortSolved = () => CS.mode === 'sort' && CS.items.length === 5 && CS.items.every((c) => c.slot === c.def.answer);
  const ladderSolved = () => CS.mode === 'ladder' && CS.items.length === 5 && CS.items.every((c) => c.slot === c.def.answer);
  function update(dt, t) {
    const free = !!(game && game.free);
    if (!free) S.freeScene = null;
    const sc = sceneNow();
    if (sc !== S.scene) enterScene(sc);
    // 1. 하늘 · 비교기
    S.tags.forEach((tg) => { tg.t += dt; });
    Object.keys(S.shake).forEach((k) => { if (S.shake[k] > 0) S.shake[k] = Math.max(0, S.shake[k] - dt); });
    A.cmpF = approach(A.cmpF, fOfMag(S.cmpM), dt, 5);
    for (let i = 0; i < 100; i++) { const tg = clamp(A.cmpF - i, 0, 1); A.icons[i] = Math.abs(A.icons[i] - tg) < 0.002 ? tg : approach(A.icons[i], tg, dt, 11); }
    if (S.scene === 'sky' && (S.cmpOn || free)) {
      const cg = cmpGeo(curL, skyGeo(curL).cmp);
      const rates = [2, Math.min(2 * A.cmpF, 90)], xs = [cg.refX, cg.tstX];
      for (let k = 0; k < 2; k++) {
        S.lightAcc[k] += rates[k] * dt;
        while (S.lightAcc[k] >= 1 && S.lightP.length < 220) { S.lightAcc[k] -= 1; S.lightP.push({ x0: xs[k] + (Math.random() - 0.5) * 16, x1: xs[k] + (Math.random() - 0.5) * 40, age: 0, life: 0.9 + Math.random() * 0.4, c: k ? '#ffe9b0' : '#cfe0ff' }); }
        if (S.lightAcc[k] > 3) S.lightAcc[k] = 0;
      }
      for (let i = S.lightP.length - 1; i >= 0; i--) { const p = S.lightP[i]; p.age += dt; if (p.age >= p.life) S.lightP.splice(i, 1); }
    } else S.lightP.length = 0;
    // 2. 실험실
    A.sensorV = approach(A.sensorV, S.sensor, dt, 14);
    A.readV = approach(A.readV, I_OF(A.sensorV), dt, 10);
    A.flashA = approach(A.flashA, 0, dt, 7);
    if (S.scene === 'lab') {
      const G = labGeo(curL), tan = G.cell / (40 * G.pxcm), v = 50 * G.pxcm, sX = A.sensorV * G.pxcm;
      S.spawnAcc += 70 * dt;
      while (S.spawnAcc >= 1 && S.photons.length < 380) { S.spawnAcc -= 1; S.photons.push({ x: 0, a: (Math.random() * 2 - 1) * tan, b: (Math.random() * 2 - 1) * tan, hit: false }); }
      if (S.spawnAcc > 3) S.spawnAcc = 0;
      for (let i = S.photons.length - 1; i >= 0; i--) {
        const p = S.photons[i], x0 = p.x; p.x += v * dt;
        if (x0 < sX && p.x >= sX && Math.abs(p.a * sX) < G.cell / 2 && Math.abs(p.b * sX) < G.cell / 2) { A.flashA = Math.min(1, A.flashA + 0.22); S.photons.splice(i, 1); continue; }
        if (p.x > sX + 40) S.photons.splice(i, 1);
      }
    } else S.photons.length = 0;
    S.data.forEach((p) => { if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 3); else if (p.label > 0) p.label -= dt / 2.6; });
    S.curveA = approach(S.curveA, S.data.length >= 3 ? 1 : 0, dt, 3);
    // 3. 10 pc 지도
    const tk = tokOf(S.selTok);
    if (tk && !S.sortMode) A.mV = approach(A.mV, magAt(tk), dt, 4);
    if (S.msgT > 0) S.msgT -= dt;
    if (S.sortDone) S.sortT += dt;
    // 4. 별 모형
    dialSp.update(dt); A.dialF = dialSp.value;
    A.TV = Math.exp(approach(Math.log(A.TV), Math.log(S.T), dt, 7));
    if (S.scene === 'heater' && !S.ladderMode) {
      const T = A.TV;
      if (T <= 3500) S.tHold.red += dt; else if (T >= 5200 && T <= 6000) S.tHold.yellow += dt; else if (T >= 7500 && T <= 10000) S.tHold.white += dt; else if (T >= 12000) S.tHold.blue += dt;
    }
    A.cardT = Math.exp(approach(Math.log(A.cardT), Math.log(S.lastCardT || 5800), dt, 8));
    if (S.ladderDone) S.ladderT += dt;
    // 카드
    CS.items.forEach((c) => {
      const tg = csTarget(curL, c);
      if (!c.init) { c.fx = tg.x; c.fy = tg.y; c.sc = tg.sc; c.init = true; }
      else { if (!c.drag) { c.fx = approach(c.fx, tg.x, dt, 14); c.fy = approach(c.fy, tg.y, dt, 14); } c.sc = approach(c.sc, c.drag ? 1 : tg.sc, dt, 14); }
      c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 14);
    });
    if (game && game.phase === 'success') {
      if (S.sortMode && !S.sortDone && sortSolved()) { S.sortDone = true; S.sortT = 0; Sound.tone(660, 0.2, 'triangle', 0.08); }
      if (S.ladderMode && !S.ladderDone && ladderSolved()) { S.ladderDone = true; S.ladderT = 0; Sound.tone(660, 0.2, 'triangle', 0.08); }
    }
    particles.update(dt);
    syncUI();
  }
  renderTable();
  setTempF(fOfT(4000));
  SciSim.loop((dt, t) => {
    const vis = views.find((x) => x.v.canvas.offsetWidth > 0);
    if (vis) curL = vis.L;
    update(dt, t);
    views.forEach(({ v, L }) => { if (v.canvas.offsetWidth > 0) drawFrame(v, L, t); });
  });
  window.__sim = { S, A, CS, game, skyPos, tempHex, fOfT, tOfF, setCmp, setSensor, recordData, setTempF, tapStar, ensureSnapped, snapToken, STARS10, tokOf, g10, gH, csGeo, xOfLg, get curL() { return curL; } };
})();
