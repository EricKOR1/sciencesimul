/* =========================================================
   중1 Ⅱ. 생물의 구성과 다양성 — 생물의 구성 단계 [9과02-02]
   ① [관찰] 확대 탐험: 사람과 나무를 개체에서 세포까지 한 단계씩 확대
   ② [탐구] 동물의 구성 단계: 세포 → 조직 → 기관 → 기관계 → 개체
   ③ [모형] 식물의 구성 단계: 세포 → 조직 → 조직계 → 기관 → 개체 (식물에는 기관계가 없고 조직계가 있음)
   ④ [적용] 동물과 식물 비교
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // 고정 시드 난수 (그림이 매번 같도록)
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, seed) {
    const R = rng(seed), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    if (a.every((v, i) => v === arr[i])) a.push(a.shift());
    return a;
  }

  /* =========================================================
     무대: 태블릿 = 가로형 800×640, 휴대폰 = 세로형 460×800
     ========================================================= */
  const LAYOUTS = { wide: { w: 800, h: 640 }, tall: { w: 460, h: 800 } };
  const BG = '#eef4ef';
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, W = 800, H = 640, TALL = false, KIND = '';
  let LAY = null;

  /* =========================================================
     그리기 도우미
     ========================================================= */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) {
      while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); }
    }
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  const lineCache = new Map();
  function lines(s, maxW, size, weight) {
    const key = s + '|' + maxW + '|' + size + '|' + (weight || 700);
    let out = lineCache.get(key);
    if (out) return out;
    ctx.save();
    ctx.font = font(size, weight);
    out = [];
    s.split('\n').forEach((par) => {
      let cur = '';
      par.split(' ').forEach((w) => {
        const tryS = cur ? cur + ' ' + w : w;
        if (ctx.measureText(tryS).width <= maxW) { cur = tryS; return; }
        if (cur) out.push(cur);
        cur = w;
        while (ctx.measureText(cur).width > maxW && cur.length > 1) {
          let k = cur.length - 1;
          while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
          out.push(cur.slice(0, k)); cur = cur.slice(k);
        }
      });
      if (cur) out.push(cur);
    });
    ctx.restore();
    lineCache.set(key, out);
    return out;
  }
  function para(s, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || Math.round(size * 1.38);
    const ls = lines(s, maxW, size, o.weight);
    ls.forEach((ln, i) => txt(ln, x, y + i * lh, { size, weight: o.weight, color: o.color, align: o.align, base: o.base }));
    return ls.length * lh;
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save();
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    return { x: lx, y: y - h / 2, w, h };
  }
  function newRing(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(22,163,74,' + (0.35 + a * 0.5).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(r.x - 6, r.y - 6, r.w + 12, r.h + 12, (rad || 14) + 6); ctx.stroke();
    const tx = Math.min(r.x + r.w - 44, W - 56), ty = Math.max(r.y - 17, 3);
    ctx.fillStyle = '#16a34a'; rr(tx, ty, 50, 22, 11); ctx.fill();
    ctx.restore();
    txt('NEW', tx + 25, ty + 12, { size: 13, weight: 800, color: '#fff', align: 'center', base: 'middle' });
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r || 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r || 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const inC = (p, c, pad) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r + (pad || 0);
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  const rgba = SciSim.color.rgba;

  /* 부드러운 곡선 (Catmull-Rom → 베지어). c는 ctx 또는 Path2D */
  function smooth(c, pts, closed) {
    const n = pts.length;
    c.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p0 = closed || i > 0 ? pts[(i - 1 + n) % n] : p1;
      const p3 = closed || i < n - 2 ? pts[(i + 2) % n] : p2;
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  function lgrad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(c, x0, y0, r0, x1, y1, r1, stops) { const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }

  /* =========================================================
     구성 단계 정보
     ========================================================= */
  const LV = {
    cell:   { name: '세포',   color: '#12a06a', soft: '#dcf6ea', def: '생물의 몸을 이루는 기본 단위' },
    tissue: { name: '조직',   color: '#2f7fe8', soft: '#dfeafd', def: '모양과 기능이 비슷한 세포들의 모임' },
    tsys:   { name: '조직계', color: '#8b5cf6', soft: '#ece5fd', def: '기능이 비슷한 여러 조직의 모임 (식물에만 있어요)' },
    organ:  { name: '기관',   color: '#e8890c', soft: '#fdecd0', def: '여러 조직이 모여 고유한 모양과 기능을 갖춘 것' },
    osys:   { name: '기관계', color: '#e0457b', soft: '#fde1ec', def: '관련된 기능을 하는 여러 기관의 모임 (동물에만 있어요)' },
    body:   { name: '개체',   color: '#0e93a6', soft: '#d9f3f6', def: '여러 기관(계)이 모여 이루어진 하나의 생물' },
  };
  // 확대 순서 (큰 것 → 작은 것)
  const CHAINS = {
    human: [
      { lv: 'body', name: '사람', art: 'h0' },
      { lv: 'osys', name: '소화계', art: 'h1' },
      { lv: 'organ', name: '위', art: 'h2' },
      { lv: 'tissue', name: '근육 조직', art: 'h3' },
      { lv: 'cell', name: '근육 세포', art: 'h4' },
    ],
    tree: [
      { lv: 'body', name: '나무', art: 't0' },
      { lv: 'organ', name: '잎', art: 't1' },
      { lv: 'tsys', name: '표피 조직계', art: 't2' },
      { lv: 'tissue', name: '표피 조직', art: 't3' },
      { lv: 'cell', name: '표피 세포', art: 't4' },
    ],
  };
  const ORG_NAME = { human: '사람', tree: '나무' };
  const EX = {
    animal: {
      cell: ['근육 세포', '신경 세포', '적혈구', '상피 세포'],
      tissue: ['상피 조직', '근육 조직', '신경 조직', '결합 조직'],
      organ: ['위', '심장', '폐', '간', '뇌'],
      osys: ['소화계', '순환계', '호흡계', '배설계', '신경계'],
      body: ['사람', '토끼', '참새'],
    },
    plant: {
      cell: ['표피 세포', '공변 세포'],
      tissue: ['표피 조직', '울타리 조직', '해면 조직'],
      tsys: ['표피 조직계', '기본 조직계', '관다발 조직계'],
      organ: ['뿌리', '줄기', '잎', '꽃', '열매'],
      body: ['나무', '소나무', '벼'],
    },
  };
  const DESC = {
    '상피 조직': '몸의 표면이나 기관의 안쪽 면을 덮어 보호해요.',
    '근육 조직': '수축했다 이완하며 몸을 움직여요.',
    '신경 조직': '자극을 받아들이고 전달해요.',
    '결합 조직': '조직이나 기관을 서로 연결하고 지지해요.',
    '소화계': '음식물을 소화하고 영양소를 흡수해요.',
    '순환계': '혈액을 순환시켜 물질을 운반해요.',
    '호흡계': '산소를 받아들이고 이산화 탄소를 내보내요.',
    '배설계': '몸속 노폐물을 걸러 몸 밖으로 내보내요.',
    '신경계': '자극을 받아들이고 판단하여 반응하게 해요.',
    '표피 조직계': '식물의 표면을 덮어 안쪽을 보호해요.',
    '기본 조직계': '광합성을 하거나 양분을 저장하고 몸을 지탱해요.',
    '관다발 조직계': '물과 양분이 이동하는 통로예요. (물관, 체관)',
  };
  const KINDS = {
    animal: {
      title: '🐾 동물의 구성 단계', chain: ['cell', 'tissue', 'organ', 'osys', 'body'],
      names: ['근육 세포', '근육 조직', '위', '소화계', '사람'], art: ['h4', 'h3', 'h2', 'h1', 'h0'],
      hops: ['세포가 모여 조직이 돼요', '조직이 모여 기관이 돼요', '기관이 모여 기관계가 돼요', '기관계가 모여 하나의 개체가 돼요'],
    },
    plant: {
      title: '🌿 식물의 구성 단계', chain: ['cell', 'tissue', 'tsys', 'organ', 'body'],
      names: ['표피 세포', '표피 조직', '표피 조직계', '잎', '나무'], art: ['t4', 't3', 't2', 't1', 't0'],
      hops: ['세포가 모여 조직이 돼요', '조직이 모여 조직계가 돼요', '조직계가 모여 기관이 돼요', '기관이 모여 하나의 개체가 돼요'],
    },
  };
  // 소화계를 이루는 기관 (탐구)
  const ORGANS = {
    eso: { name: '식도', fn: '입에서 위로 음식물이 지나가는 통로예요.' },
    stom: { name: '위', fn: '음식물을 잘게 부수고 섞으며 소화시켜요.' },
    liver: { name: '간', fn: '소화를 돕는 쓸개즙을 만들어요.' },
    small: { name: '작은창자', fn: '소화를 마치고 영양소를 흡수해요.' },
    large: { name: '큰창자', fn: '남은 물을 흡수하고 찌꺼기를 모아요.' },
  };
  const ORGAN_KEYS = ['eso', 'stom', 'liver', 'small', 'large'];
  // 잎의 조직계 (탐구)
  const TSYS = {
    epi: { name: '표피 조직계', color: '#c9a21d', fn: DESC['표피 조직계'] },
    base: { name: '기본 조직계', color: '#2e9a45', fn: DESC['기본 조직계'] },
    vasc: { name: '관다발 조직계', color: '#2b8fd6', fn: DESC['관다발 조직계'] },
  };
  const TSYS_KEYS = ['epi', 'base', 'vasc'];

  /* =========================================================
     그림 모음 — 모든 그림은 가운데가 (0,0)인 가로세로 ±100 상자에 그려요.
     art(c, t, o): c = 그리기 도구, t = 시간(초), o = { bg: false 면 배경 없음, hl: 강조 }
     ========================================================= */
  const PH = {};   // 눌러 보기·그리기에 함께 쓰는 Path2D 모음
  function circleBg(c, top, bottom) {
    c.fillStyle = lgrad(c, 0, -100, 0, 100, [[0, top], [1, bottom]]);
    c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.fill();
  }
  function glowStroke(c, path, color, w) {
    c.save(); c.strokeStyle = rgba(color, 0.55); c.lineWidth = w || 8; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(path); c.restore();
  }
  function capsule(c, x, y, ang, a, b) {   // 둥근 막대 (미토콘드리아 등)
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath(); c.moveTo(-a + b, -b); c.lineTo(a - b, -b); c.arc(a - b, 0, b, -Math.PI / 2, Math.PI / 2); c.lineTo(-a + b, b); c.arc(-a + b, 0, b, Math.PI / 2, Math.PI * 1.5); c.closePath();
    c.restore();
  }
  function mitoAt(c, x, y, ang, s) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.fillStyle = lgrad(c, 0, -5, 0, 5, [[0, '#ffc1a3'], [0.5, '#f27b4b'], [1, '#c4492a']]);
    c.beginPath(); c.moveTo(-6, -5); c.lineTo(6, -5); c.arc(6, 0, 5, -Math.PI / 2, Math.PI / 2); c.lineTo(-6, 5); c.arc(-6, 0, 5, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.fill();
    c.strokeStyle = '#a63c1f'; c.lineWidth = 0.9; c.stroke();
    c.strokeStyle = 'rgba(255,233,220,.9)'; c.lineWidth = 0.9; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-8, 0); for (let k = 0; k < 6; k++) c.lineTo(-6 + k * 2.6, k % 2 ? 2.6 : -2.6); c.lineTo(8, 0); c.stroke();
    c.restore();
  }
  function nucleusAt(c, x, y, rx, ry, ang) {
    c.save(); c.translate(x, y); c.rotate(ang || 0);
    c.fillStyle = rgrad(c, -rx * 0.3, -ry * 0.35, rx * 0.1, 0, 0, Math.max(rx, ry), [[0, '#d9ccfa'], [0.55, '#9a7ce0'], [1, '#6443b8']]);
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(80,45,160,.8)'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#4b2a96'; c.beginPath(); c.arc(rx * 0.22, ry * 0.16, Math.min(rx, ry) * 0.27, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-rx * 0.36, -ry * 0.42, rx * 0.26, ry * 0.14, -0.5, 0, TAU); c.fill();
    c.restore();
  }

  // ----- 모양(Path2D) 만들기 -----
  (function buildPaths() {
    // 소화계
    PH.eso = new Path2D(); smooth(PH.eso, [[2, -100], [1, -76], [5, -60], [11, -47]], false);
    PH.liver = new Path2D(); smooth(PH.liver, [[-70, -34], [-52, -56], [-20, -64], [6, -52], [9, -32], [-12, -18], [-44, -13], [-66, -20]], true);
    PH.stom = new Path2D(); smooth(PH.stom, [[8, -46], [24, -60], [46, -56], [60, -38], [62, -16], [51, 1], [33, 8], [19, -1], [13, -18], [15, -34]], true);
    const sm = new Path2D(), rows = 5, x0 = -29, x1 = 29, y0 = 25, dy = 10.5;
    sm.moveTo(x1, y0);
    for (let i = 0; i < rows; i++) {
      const y = y0 + i * dy, dir = i % 2 === 0;       // 오른쪽 위(위와 이어지는 곳)에서 시작해 왼쪽 → 오른쪽 …
      sm.lineTo(dir ? x0 : x1, y);
      if (i < rows - 1) sm.quadraticCurveTo(dir ? x0 - 10 : x1 + 10, y + dy / 2, dir ? x0 : x1, y + dy);
    }
    PH.small = sm;
    PH.duo = new Path2D(); smooth(PH.duo, [[34, 2], [35, 12], [31, 19], [29, 25]], false);
    const lg = new Path2D();
    lg.moveTo(45, 80); lg.lineTo(45, 20); lg.quadraticCurveTo(45, 12, 36, 12); lg.lineTo(-36, 12); lg.quadraticCurveTo(-45, 12, -45, 20); lg.lineTo(-45, 70); lg.quadraticCurveTo(-45, 78, -37, 81); lg.lineTo(-24, 90);
    PH.large = lg;
    PH.torso = new Path2D(); smooth(PH.torso, [[-36, -104], [36, -104], [60, -72], [66, 0], [56, 72], [32, 104], [-32, 104], [-56, 72], [-66, 0], [-60, -72]], true);
    // 위(기관)
    PH.h2 = new Path2D(); smooth(PH.h2, [[-34, -84], [-12, -92], [12, -82], [30, -64], [56, -46], [78, -18], [86, 18], [76, 54], [50, 76], [14, 82], [-18, 72], [-44, 50], [-52, 18], [-48, -12], [-42, -38], [-48, -62]], true);
    // 잎(기관)
    PH.leaf = new Path2D();
    PH.leaf.moveTo(0, -94); PH.leaf.bezierCurveTo(32, -72, 68, -30, 63, 10); PH.leaf.bezierCurveTo(58, 46, 22, 68, 0, 74);
    PH.leaf.bezierCurveTo(-22, 68, -58, 46, -63, 10); PH.leaf.bezierCurveTo(-68, -30, -32, -72, 0, -94); PH.leaf.closePath();
    // 잎 단면: 조직계 영역
    const rEpi = new Path2D(); rEpi.rect(-96, -58, 192, 18); rEpi.rect(-96, 30, 192, 18);
    PH.epi = rEpi;
    PH.base = new Path2D(); PH.base.rect(-96, -40, 192, 70);
    PH.vasc = new Path2D(); PH.vasc.arc(-8, -6, 22, 0, TAU);
  })();

  // ----- ① 사람 (개체) -----
  function artH0(c, t, o) {
    o = o || {};
    if (o.bg !== false) circleBg(c, '#e6f3ff', '#c6e2f8');
    c.fillStyle = 'rgba(40,70,110,.16)'; c.beginPath(); c.ellipse(0, 92, 46, 6, 0, 0, TAU); c.fill();
    const br = RM ? 0 : Math.sin(t * 1.7);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#3f4f7d'; c.lineWidth = 17;
    c.beginPath(); c.moveTo(-10, 30); c.lineTo(-12, 82); c.moveTo(10, 30); c.lineTo(12, 82); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-14, 34); c.lineTo(-16, 80); c.moveTo(6, 34); c.lineTo(8, 80); c.stroke();
    c.fillStyle = '#2a334f'; c.beginPath(); c.ellipse(-14, 88, 12.5, 5.5, 0, 0, TAU); c.ellipse(14, 88, 12.5, 5.5, 0, 0, TAU); c.fill();
    [-1, 1].forEach((s) => {
      const sw = br * 0.8 * s;
      c.strokeStyle = '#4aa3e6'; c.lineWidth = 14; c.beginPath(); c.moveTo(s * 31, -44); c.lineTo(s * 41 + sw, -6); c.stroke();
      c.strokeStyle = '#f5c09a'; c.lineWidth = 11; c.beginPath(); c.moveTo(s * 41 + sw, -6); c.lineTo(s * 45 + sw, 24); c.stroke();
      c.fillStyle = '#f2b58c'; c.beginPath(); c.arc(s * 46 + sw, 30, 6.5, 0, TAU); c.fill();
    });
    c.save(); c.scale(1, 1 + br * 0.006);
    c.beginPath();
    c.moveTo(-31, -42); c.quadraticCurveTo(-31, -53, -20, -53); c.lineTo(20, -53); c.quadraticCurveTo(31, -53, 31, -42);
    c.lineTo(26, 6); c.quadraticCurveTo(26, 34, 24, 36); c.lineTo(-24, 36); c.quadraticCurveTo(-26, 34, -26, 6); c.closePath();
    c.fillStyle = lgrad(c, -30, 0, 30, 0, [[0, '#82cbf8'], [0.5, '#52aef0'], [1, '#3b8fd6']]); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-14, -30, 8, 18, 0.1, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = '#f5c09a'; c.fillRect(-6, -60, 12, 10);
    c.fillStyle = rgrad(c, -5, -77, 2, 0, -72, 20, [[0, '#ffe0c6'], [1, '#f2b58c']]);
    c.beginPath(); c.arc(0, -72, 17, 0, TAU); c.fill();
    c.fillStyle = '#3a2b24'; c.beginPath(); c.moveTo(-17, -74); c.bezierCurveTo(-18, -95, 18, -95, 17, -74); c.bezierCurveTo(10, -82, -8, -83, -17, -74); c.closePath(); c.fill();
    c.beginPath(); c.arc(-6, -70, 1.8, 0, TAU); c.arc(6, -70, 1.8, 0, TAU); c.fill();
    c.strokeStyle = '#c0674f'; c.lineWidth = 1.7; c.beginPath(); c.arc(0, -66.5, 5.5, 0.25, Math.PI - 0.25); c.stroke();
    c.restore();
    // 몸속이 살짝 비쳐 보이는 위
    const p = RM ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
    c.save(); c.translate(-11, 0); c.scale(0.5, 0.5);
    c.globalAlpha = 0.45 + 0.2 * p; c.fillStyle = '#ffffff'; c.fill(PH.stom);
    c.strokeStyle = '#ffd7cc'; c.lineWidth = 3; c.stroke(PH.stom);
    c.restore();
  }

  // ----- ② 소화계 (기관계) -----
  function artH1(c, t, o) {
    o = o || {};
    const hl = o.hl || null;
    const dim = (k) => (hl && hl !== k ? 0.4 : 1);
    if (o.bg !== false) circleBg(c, '#eaf4ff', '#d3e8f9');
    c.save();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fill(PH.torso);
    c.strokeStyle = 'rgba(110,160,205,.55)'; c.lineWidth = 2.4; c.stroke(PH.torso);
    c.restore();
    // 간
    c.save(); c.globalAlpha = dim('liver');
    c.fillStyle = lgrad(c, -60, -60, 10, -14, [[0, '#cb6a4f'], [1, '#8c3424']]); c.fill(PH.liver);
    c.strokeStyle = '#7a2b1d'; c.lineWidth = 1.8; c.lineJoin = 'round'; c.stroke(PH.liver);
    c.fillStyle = 'rgba(255,255,255,.24)'; c.beginPath(); c.ellipse(-36, -46, 18, 6, -0.3, 0, TAU); c.fill();
    if (hl === 'liver') glowStroke(c, PH.liver, '#ffe08a');
    c.restore();
    // 큰창자
    c.save(); c.globalAlpha = dim('large'); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#c47f5d'; c.lineWidth = 14; c.stroke(PH.large);
    c.strokeStyle = '#f0bd97'; c.lineWidth = 10; c.stroke(PH.large);
    c.strokeStyle = 'rgba(190,110,80,.5)'; c.lineWidth = 10; c.setLineDash([2.5, 7]); c.stroke(PH.large); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.save(); c.translate(-1.5, -1.5); c.stroke(PH.large); c.restore();
    if (hl === 'large') glowStroke(c, PH.large, '#ffe08a', 14);
    c.restore();
    // 작은창자
    c.save(); c.globalAlpha = dim('small'); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#d2606f'; c.lineWidth = 9.5; c.stroke(PH.small);
    c.strokeStyle = '#f7a1ad'; c.lineWidth = 6.6; c.stroke(PH.small);
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 2.3; c.setLineDash([3, 15]); c.lineDashOffset = RM ? 0 : -t * 18; c.stroke(PH.small); c.setLineDash([]);
    if (hl === 'small') glowStroke(c, PH.small, '#ffe08a', 14);
    c.restore();
    // 위와 작은창자를 잇는 부분
    c.save(); c.globalAlpha = dim('small'); c.lineCap = 'round';
    c.strokeStyle = '#d2606f'; c.lineWidth = 9.5; c.stroke(PH.duo); c.strokeStyle = '#f7a1ad'; c.lineWidth = 6.6; c.stroke(PH.duo);
    c.restore();
    // 위
    c.save(); c.globalAlpha = dim('stom');
    const sq = RM ? 0 : Math.sin(t * 1.5) * 0.022;
    c.translate(36, -26); c.scale(1 + sq, 1 - sq); c.translate(-36, 26);
    c.fillStyle = rgrad(c, 28, -44, 4, 36, -26, 42, [[0, '#ffc7b3'], [1, '#ea6d52']]); c.fill(PH.stom);
    c.strokeStyle = '#c2543d'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(PH.stom);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(28, -49, 11, 4, -0.4, 0, TAU); c.fill();
    if (hl === 'stom') glowStroke(c, PH.stom, '#ffe08a', 10);
    c.restore();
    // 식도
    c.save(); c.globalAlpha = dim('eso'); c.lineCap = 'round';
    c.strokeStyle = '#df766f'; c.lineWidth = 12; c.stroke(PH.eso);
    c.strokeStyle = '#f7aaa3'; c.lineWidth = 8; c.stroke(PH.eso);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2.2; c.setLineDash([2, 13]); c.lineDashOffset = RM ? 0 : -t * 22; c.stroke(PH.eso); c.setLineDash([]);
    if (hl === 'eso') glowStroke(c, PH.eso, '#ffe08a', 16);
    c.restore();
  }

  // ----- ③ 위 (기관) -----
  function artH2(c, t, o) {
    o = o || {};
    if (o.bg !== false) circleBg(c, '#fff1e9', '#fad8c8');
    c.lineCap = 'round';
    // 식도·샘창자(작은창자 시작)
    c.strokeStyle = '#df766f'; c.lineWidth = 26; c.beginPath(); c.moveTo(-26, -112); c.lineTo(-26, -66); c.stroke();
    c.strokeStyle = '#f7aaa3'; c.lineWidth = 17; c.beginPath(); c.moveTo(-26, -112); c.lineTo(-26, -66); c.stroke();
    c.strokeStyle = '#d2606f'; c.lineWidth = 20; c.beginPath(); c.moveTo(56, 66); c.lineTo(108, 92); c.stroke();
    c.strokeStyle = '#f7a1ad'; c.lineWidth = 13; c.beginPath(); c.moveTo(56, 66); c.lineTo(108, 92); c.stroke();
    const k = RM ? 1 : 1 + 0.016 * Math.sin(t * 1.3);
    c.save(); c.translate(6, 12); c.scale(0.86, 0.86); c.translate(16, -4); c.scale(k, 2 - k); c.translate(-16, 4);
    c.save(); c.translate(0, 5); c.fillStyle = 'rgba(150,60,40,.12)'; c.fill(PH.h2); c.translate(0, -2); c.scale(1.01, 1.01); c.fillStyle = 'rgba(150,60,40,.12)'; c.fill(PH.h2); c.restore();
    c.fillStyle = '#e8806a'; c.fill(PH.h2);
    c.fillStyle = rgrad(c, -10, -40, 10, 16, 0, 110, [[0, '#ffc9b6'], [0.55, '#f08e76'], [1, '#d9654d']]); c.fill(PH.h2);
    c.strokeStyle = '#b8472f'; c.lineWidth = 3.2; c.lineJoin = 'round'; c.stroke(PH.h2);
    // 근육층: 바깥 띠
    c.save(); c.translate(16, -4); c.scale(0.94, 0.94); c.translate(-16, 4);
    c.strokeStyle = 'rgba(176,60,45,.28)'; c.lineWidth = 6; c.setLineDash([9, 5]); c.stroke(PH.h2); c.setLineDash([]); c.restore();
    // 안쪽 (위 속)
    c.save(); c.translate(16, -4); c.scale(0.82, 0.82); c.translate(-16, 4);
    c.fillStyle = lgrad(c, 0, -80, 0, 80, [[0, '#ffd9cc'], [1, '#ffb7a3']]); c.fill(PH.h2);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke(PH.h2);
    c.clip(PH.h2);
    for (let i = 0; i < 6; i++) {
      const y0 = -72 + i * 26;
      c.beginPath();
      for (let x = -62; x <= 104; x += 6) { const y = y0 + Math.sin(x * 0.085 + (RM ? 0 : t * 0.9) + i * 1.3) * 5.5; if (x === -62) c.moveTo(x, y); else c.lineTo(x, y); }
      c.strokeStyle = 'rgba(190,80,62,.2)'; c.lineWidth = 7; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3.4; c.save(); c.translate(0, -2); c.stroke(); c.restore();
    }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-4, -66, 26, 8, -0.4, 0, TAU); c.fill();
    c.restore();
  }

  // ----- ④ 근육 조직 (조직) : 가늘고 긴 근육 세포들이 모여 있어요 -----
  const H3 = (function () {
    const R = rng(808), cells = [];
    for (let r = -9; r <= 9; r++) {
      for (let k = -4; k <= 4; k++) {
        const L = 60 + R() * 12, Wd = 7.5 + R() * 2.2;
        const x = k * 58 + (r & 1 ? 29 : 0) + (R() - 0.5) * 8, y = r * 12.4 + (R() - 0.5) * 3;
        if (Math.abs(x) > 150 || Math.abs(y) > 125) continue;
        if (Math.abs(x) < 36 && Math.abs(y) < 10) continue;    // 가운데는 주인공 세포 자리
        cells.push({ x, y, L, Wd, ph: R() * TAU, tilt: (R() - 0.5) * 0.14, nx: (R() - 0.5) * 16, tone: Math.floor(R() * 4) });
      }
    }
    return cells;
  })();
  const MUSCLE_TONE = ['#f4a1ae', '#ef8fa0', '#f7b0ba', '#e9798f'];
  function spindle(c, L, Wd) {
    c.beginPath(); c.moveTo(-L / 2, 0); c.quadraticCurveTo(0, -Wd * 1.75, L / 2, 0); c.quadraticCurveTo(0, Wd * 1.75, -L / 2, 0); c.closePath();
  }
  function artH3(c, t, o) {
    o = o || {};
    if (o.bg !== false) circleBg(c, '#fdecef', '#f7d3da');
    c.lineJoin = 'round';
    const tt = RM ? 0 : t;
    H3.forEach((cell) => {
      const w = 1 + 0.07 * Math.sin(tt * 1.3 + cell.ph), l = 1 - 0.035 * Math.sin(tt * 1.3 + cell.ph);
      c.save(); c.translate(cell.x, cell.y); c.rotate(cell.tilt);
      spindle(c, cell.L * l, cell.Wd * w);
      c.fillStyle = MUSCLE_TONE[cell.tone]; c.fill();
      c.strokeStyle = 'rgba(160,50,80,.55)'; c.lineWidth = 1; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-cell.L * 0.3, -cell.Wd * 0.45 * w); c.quadraticCurveTo(0, -cell.Wd * 0.85 * w, cell.L * 0.3, -cell.Wd * 0.45 * w); c.stroke();
      c.fillStyle = 'rgba(100,36,84,.78)'; c.beginPath(); c.ellipse(cell.nx, 0, 5.6, 2.4 * w, 0, 0, TAU); c.fill();
      c.restore();
    });
    // 주인공 세포
    const w = 1 + 0.05 * Math.sin(tt * 1.3), L0 = 68, W0 = 14.5 * w;
    c.save(); c.translate(0, 2.4); spindle(c, L0 + 3, W0 + 1); c.fillStyle = 'rgba(120,30,60,.22)'; c.fill(); c.restore();
    c.save(); spindle(c, L0, W0); c.fillStyle = lgrad(c, 0, -W0, 0, W0, [[0, '#ffc2ce'], [0.5, '#ee7b92'], [1, '#cf4f6b']]); c.fill();
    c.strokeStyle = '#a63a58'; c.lineWidth = 1.6; c.stroke(); c.restore();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-8, -6.5, 18, 2.6, 0, 0, TAU); c.fill();
    nucleusAt(c, 0, 0, 8, 4.6 * w, 0);
  }

  // ----- ⑤ 근육 세포 (세포) -----
  const H4M = [[-64, 6, 0.1], [-42, -20, -0.2], [-36, 22, 0.25], [38, 21, -0.15], [54, -17, 0.2], [68, 6, 0]];
  function artH4(c, t, o) {
    o = o || {};
    if (o.bg !== false) circleBg(c, '#fdecef', '#f7d3da');
    const tt = RM ? 0 : t;
    const ct = 1 - 0.03 * Math.sin(tt * 1.1);
    c.save(); c.scale(ct, 2 - ct);
    const body = new Path2D();
    body.moveTo(-96, 0); body.bezierCurveTo(-64, -56, -22, -47, 0, -47); body.bezierCurveTo(22, -47, 64, -56, 96, 0);
    body.bezierCurveTo(64, 56, 22, 47, 0, 47); body.bezierCurveTo(-22, 47, -64, 56, -96, 0); body.closePath();
    c.save(); c.translate(0, 6); c.fillStyle = 'rgba(140,40,70,.13)'; c.fill(body); c.translate(0, -3); c.scale(1.012, 1.02); c.fillStyle = 'rgba(140,40,70,.13)'; c.fill(body); c.restore();
    c.fillStyle = rgrad(c, -20, -22, 8, 0, 0, 100, [[0, '#ffe0e6'], [0.5, '#f7a5b5'], [1, '#e4708a']]); c.fill(body);
    c.strokeStyle = '#b8466a'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke(body);
    c.strokeStyle = 'rgba(255,240,244,.9)'; c.lineWidth = 1.2; c.save(); c.scale(0.965, 0.9); c.stroke(body); c.restore();
    // 근육 섬유 무늬
    c.save(); c.clip(body);
    c.strokeStyle = 'rgba(255,255,255,.34)'; c.lineWidth = 2.2;
    [-32, -20, 20, 32].forEach((y0, i) => {
      c.beginPath();
      for (let x = -96; x <= 96; x += 8) { const y = y0 * (1 - Math.abs(x) / 230) + Math.sin(x * 0.07 + i + tt * 0.6) * 1.4; if (x === -96) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke();
    });
    c.fillStyle = 'rgba(190,60,95,.07)'; for (let x = -80; x <= 80; x += 12) c.fillRect(x, -47, 3, 94);
    c.restore();
    H4M.forEach((m, i) => mitoAt(c, m[0] + 3 * Math.sin(tt * 0.5 + i), m[1] + 2.4 * Math.cos(tt * 0.45 + i * 2), m[2] + 0.2 * Math.sin(tt * 0.4 + i), 1.05));
    nucleusAt(c, 0, 0, 24, 12.5, 0);
    c.restore();
  }

  // ----- ① 나무 (개체) -----
  const T0LEAVES = (function () {
    const R = rng(515), a = [];
    for (let i = 0; i < 34; i++) { const ang = R() * TAU, d = Math.sqrt(R()) * 58; a.push({ x: Math.cos(ang) * d * 1.05, y: -52 + Math.sin(ang) * d * 0.72, r: R() * TAU, s: 0.7 + R() * 0.5, ph: R() * TAU, tone: R() }); }
    return a;
  })();
  function leafShape(c, len, wid) {
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.22, -wid, len * 0.72, -wid * 0.85, len, 0); c.bezierCurveTo(len * 0.72, wid * 0.85, len * 0.22, wid, 0, 0); c.closePath();
  }
  function artT0(c, t, o) {
    o = o || {};
    const tt = RM ? 0 : t;
    c.save(); c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.clip();
    if (o.bg !== false) { c.fillStyle = lgrad(c, 0, -100, 0, 62, [[0, '#bfe4ff'], [1, '#eef9ff']]); c.fillRect(-100, -100, 200, 200); }
    // 해 + 구름
    c.fillStyle = rgrad(c, -62, -70, 2, -62, -70, 26, [[0, 'rgba(255,244,170,.95)'], [1, 'rgba(255,244,170,0)']]); c.beginPath(); c.arc(-62, -70, 26, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)';
    const cx = ((tt * 2.2) % 260) - 130;
    c.beginPath(); c.ellipse(cx, -82, 22, 7, 0, 0, TAU); c.ellipse(cx + 14, -87, 15, 7, 0, 0, TAU); c.ellipse(cx - 12, -86, 11, 5, 0, 0, TAU); c.fill();
    // 땅
    c.fillStyle = lgrad(c, 0, 58, 0, 100, [[0, '#b9915f'], [1, '#8c6740']]); c.fillRect(-100, 62, 200, 40);
    c.fillStyle = lgrad(c, 0, 52, 0, 66, [[0, '#9be08f'], [1, '#6cbf6a']]);
    c.beginPath(); c.moveTo(-100, 62); for (let x = -100; x <= 100; x += 10) c.lineTo(x, 58 + Math.sin(x * 0.12) * 1.6); c.lineTo(100, 62); c.closePath(); c.fill();
    // 뿌리
    c.lineCap = 'round'; c.strokeStyle = '#7a5230';
    [[-4, 62, -34, 92, 5], [3, 62, 30, 90, 5], [0, 62, -8, 98, 4.5], [-2, 66, -52, 82, 3], [2, 66, 54, 80, 3]].forEach((r, i) => {
      c.lineWidth = r[4]; c.beginPath(); c.moveTo(r[0], r[1]); c.quadraticCurveTo(r[0] + (r[2] - r[0]) * 0.2, r[1] + (r[3] - r[1]) * 0.7, r[2], r[3]); c.stroke();
    });
    // 줄기·가지
    c.fillStyle = lgrad(c, -10, 0, 10, 0, [[0, '#9a6d3f'], [0.5, '#7a5230'], [1, '#5f3f23']]);
    c.beginPath(); c.moveTo(-10, 62); c.bezierCurveTo(-9, 34, -11, 4, -7, -20); c.lineTo(7, -20); c.bezierCurveTo(11, 4, 9, 34, 10, 62); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(50,30,15,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, 56); c.lineTo(-4, 20); c.moveTo(3, 50); c.lineTo(4, 10); c.stroke();
    c.strokeStyle = '#6b4526'; [[0, -16, -28, -42, 7], [0, -20, 28, -46, 7], [0, -26, 4, -60, 6]].forEach((b) => { c.lineWidth = b[4]; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[2], b[3]); c.stroke(); });
    // 나뭇잎 덩어리
    const sway = Math.sin(tt * 0.9) * 1.2;
    [[-36, -48, 26], [36, -50, 27], [0, -66, 32], [-16, -38, 25], [20, -38, 26], [-48, -32, 17], [50, -34, 18], [0, -46, 28]].forEach((b, i) => {
      const x = b[0] + sway * (0.6 + (i % 3) * 0.3), y = b[1] + Math.sin(tt * 0.7 + i) * 0.8;
      c.fillStyle = rgrad(c, x - b[2] * 0.3, y - b[2] * 0.4, b[2] * 0.1, x, y, b[2], [[0, '#a8e68b'], [0.6, '#5fba54'], [1, '#3a9345']]);
      c.beginPath(); c.arc(x, y, b[2], 0, TAU); c.fill();
    });
    // 잎 결
    T0LEAVES.forEach((l) => {
      c.save(); c.translate(l.x + sway * 0.8, l.y); c.rotate(l.r + Math.sin(tt * 1.4 + l.ph) * 0.12); c.scale(l.s, l.s);
      leafShape(c, 12, 5.5); c.fillStyle = l.tone > 0.5 ? 'rgba(190,240,150,.7)' : 'rgba(40,120,60,.45)'; c.fill();
      c.restore();
    });
    // 눈에 띄는 잎 한 장 (확대할 곳)
    c.save(); c.translate(24 + sway, -42); c.rotate(-0.55 + Math.sin(tt * 1.2) * 0.05);
    leafShape(c, 44, 20); c.fillStyle = lgrad(c, 0, -18, 44, 18, [[0, '#c8f39a'], [1, '#55ad48']]); c.fill();
    c.strokeStyle = '#2f7d3a'; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(1, 0); c.lineTo(41, 0); c.stroke();
    c.restore();
    c.restore();
  }

  // ----- ② 잎 (기관) -----
  function artT1(c, t, o) {
    o = o || {};
    const tt = RM ? 0 : t;
    if (o.bg !== false) circleBg(c, '#f1fbe4', '#d8f0bf');
    c.save(); c.rotate(Math.sin(tt * 0.8) * 0.018);
    // 잎자루
    c.lineCap = 'round'; c.strokeStyle = '#5f9f46'; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(2, 90, -4, 106); c.stroke();
    // 잎몸
    c.save(); c.shadowColor = 'rgba(40,90,40,.3)'; c.shadowBlur = 10; c.shadowOffsetY = 4; c.fillStyle = '#58b04a'; c.fill(PH.leaf); c.restore();
    c.fillStyle = lgrad(c, -50, -70, 50, 60, [[0, '#9fe17c'], [0.55, '#5fbb4e'], [1, '#3c9a40']]); c.fill(PH.leaf);
    c.strokeStyle = '#2f7d3a'; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke(PH.leaf);
    c.save(); c.clip(PH.leaf);
    // 잎맥
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(232,250,205,.95)'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(0, 76); c.lineTo(0, -88); c.stroke();
    c.lineWidth = 2.1;
    for (let i = 0; i < 6; i++) {
      const y = 56 - i * 25, len = 52 - i * 5.5;
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(s * len * 0.55, y - 6 - i * 0.5, s * len, y - 20 - i * 1.6); c.stroke(); });
    }
    c.strokeStyle = 'rgba(232,250,205,.38)'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = 62 - i * 13;
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(s * 26, y - 5, s * (40 - i * 2.2), y - 14); c.stroke(); });
    }
    // 윤기 (천천히 지나감)
    const sh = ((tt * 0.22) % 1.6) - 0.3;
    c.fillStyle = lgrad(c, -70 + sh * 160, -60, -30 + sh * 160, 60, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(-80, -100, 160, 190);
    c.restore();
    c.restore();
  }

  // ----- ③ 잎의 단면 (조직계) -----
  const T2 = (function () {
    const R = rng(2468), sp = [];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
      sp.push({ x: -92 + i * 22 + (row % 2) * 10 + (R() - 0.5) * 5, y: -2 + row * 11 + (R() - 0.5) * 3, r: 8 + R() * 3.2, tone: R(), chl: R() < 0.6 });
    }
    return sp;
  })();
  function artT2(c, t, o) {
    o = o || {};
    const tt = RM ? 0 : t, hl = o.hl || null;                 // hl: 'epi' | 'base' | 'vasc'
    const dim = (k) => (hl && hl !== k ? 0.45 : 1);
    if (o.bg !== false) circleBg(c, '#fbfdf3', '#eef6dc');
    c.save();
    c.beginPath(); c.rect(-100, -100, 200, 200); c.clip();
    c.lineJoin = 'round';
    // 기본 조직계: 울타리 조직 + 해면 조직
    c.save(); c.globalAlpha = dim('base');
    c.fillStyle = '#e3f4d3'; c.fillRect(-96, -40, 192, 70);
    for (let i = 0; i < 14; i++) {
      const x = -96 + i * 13.7;
      c.fillStyle = lgrad(c, 0, -40, 0, -6, [[0, '#8bd873'], [1, '#4cab4b']]);
      rr2(c, x + 0.7, -40, 12.3, 34, 3); c.fill(); c.strokeStyle = '#3f8f3f'; c.lineWidth = 0.9; c.stroke();
      c.fillStyle = 'rgba(30,110,40,.85)';
      [-31, -22, -13].forEach((yy, k) => { c.beginPath(); c.ellipse(x + 6.8 + ((i + k) % 2 ? 1.3 : -1.3), yy, 2.6, 1.7, 0, 0, TAU); c.fill(); });
    }
    T2.forEach((s) => {
      c.fillStyle = s.tone < 0.5 ? '#9edb8a' : '#8fd37a'; c.beginPath(); c.ellipse(s.x, s.y + 6, s.r, s.r * 0.88, 0, 0, TAU); c.fill();
      c.strokeStyle = '#5fae55'; c.lineWidth = 0.9; c.stroke();
      if (s.chl) { c.fillStyle = 'rgba(30,110,40,.75)'; c.beginPath(); c.ellipse(s.x - 2, s.y + 5, 2.4, 1.6, 0, 0, TAU); c.ellipse(s.x + 3, s.y + 8, 2.2, 1.5, 0, 0, TAU); c.fill(); }
    });
    if (hl === 'base') { c.strokeStyle = 'rgba(255,225,120,.9)'; c.lineWidth = 3; c.strokeRect(-96, -40, 192, 70); }
    c.restore();
    // 표피 조직계: 위·아래 표피
    c.save(); c.globalAlpha = dim('epi');
    c.fillStyle = '#f4e79a'; c.fillRect(-96, -60.5, 192, 3.6); c.fillRect(-96, 48, 192, 3.6);
    for (let i = 0; i < 8; i++) {
      const x = -96 + i * 24;
      c.fillStyle = lgrad(c, 0, -57, 0, -40, [[0, '#f7fad2'], [1, '#e2eba3']]); rr2(c, x + 0.8, -57, 22.4, 17, 3); c.fill(); c.strokeStyle = '#b9c46a'; c.lineWidth = 1.1; c.stroke();
      c.fillStyle = 'rgba(150,170,80,.7)'; c.beginPath(); c.ellipse(x + 12, -48.5, 3.6, 2.6, 0, 0, TAU); c.fill();
      if (i === 5) continue;
      c.fillStyle = lgrad(c, 0, 30, 0, 47, [[0, '#f7fad2'], [1, '#e2eba3']]); rr2(c, x + 0.8, 30.5, 22.4, 17, 3); c.fill(); c.strokeStyle = '#b9c46a'; c.lineWidth = 1.1; c.stroke();
      c.fillStyle = 'rgba(150,170,80,.7)'; c.beginPath(); c.ellipse(x + 12, 39, 3.6, 2.6, 0, 0, TAU); c.fill();
    }
    // 기공 (공변세포 한 쌍)
    const gap = 1.6 + 1.8 * Math.pow(Math.sin(tt * 0.8), 2);
    [-1, 1].forEach((s) => {
      c.save(); c.translate(48 + 0, 39);
      c.beginPath(); c.moveTo(s * gap, -9); c.bezierCurveTo(s * (gap + 12), -9, s * (gap + 12), 9, s * gap, 9); c.bezierCurveTo(s * (gap + 5), 4, s * (gap + 5), -4, s * gap, -9); c.closePath();
      c.fillStyle = lgrad(c, 0, -9, 0, 9, [[0, '#8fd978'], [1, '#4fae4b']]); c.fill(); c.strokeStyle = '#3f8f3f'; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(30,110,40,.8)'; c.beginPath(); c.ellipse(s * (gap + 7), 0, 2.2, 3, 0, 0, TAU); c.fill();
      c.restore();
    });
    if (hl === 'epi') { c.strokeStyle = 'rgba(255,215,90,.95)'; c.lineWidth = 3; c.strokeRect(-96, -58, 192, 18); c.strokeRect(-96, 30, 192, 18); }
    c.restore();
    // 관다발 조직계: 물관 + 체관
    c.save(); c.globalAlpha = dim('vasc');
    c.fillStyle = rgrad(c, -10, -12, 2, -8, -6, 24, [[0, '#f1f8d6'], [1, '#cfe39a']]); c.beginPath(); c.arc(-8, -6, 22, 0, TAU); c.fill();
    c.strokeStyle = '#98b95a'; c.lineWidth = 1.6; c.stroke();
    [[-15, -13, 6], [-2, -15, 5.6], [-9, -4, 5.2]].forEach((x) => {
      c.fillStyle = lgrad(c, 0, x[1] - x[2], 0, x[1] + x[2], [[0, '#b5e0fa'], [1, '#6db8e8']]); c.beginPath(); c.arc(x[0], x[1], x[2], 0, TAU); c.fill(); c.strokeStyle = '#3d8fc4'; c.lineWidth = 1.1; c.stroke();
    });
    [[-16, 6, 3.7], [-8, 9, 3.4], [0, 6, 3.7], [-11, 1.5, 3]].forEach((x) => {
      c.fillStyle = lgrad(c, 0, x[1] - x[2], 0, x[1] + x[2], [[0, '#ffd9a1'], [1, '#f2a84d']]); c.beginPath(); c.arc(x[0], x[1], x[2], 0, TAU); c.fill(); c.strokeStyle = '#d58a2c'; c.lineWidth = 1; c.stroke();
    });
    // 흐름 점 (물은 위로, 양분은 아래로)
    for (let k = 0; k < 3; k++) {
      const u = ((tt * 0.5 + k / 3) % 1);
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(-15 + k * 6.5, -4 - u * 12, 1.3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(180,90,10,.85)'; c.beginPath(); c.arc(-14 + k * 7, 1 + u * 9, 1.2, 0, TAU); c.fill();
    }
    if (hl === 'vasc') { c.strokeStyle = 'rgba(255,215,90,.95)'; c.lineWidth = 3; c.beginPath(); c.arc(-8, -6, 23.5, 0, TAU); c.stroke(); }
    c.restore();
    c.restore();
  }
  function rr2(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ----- ④ 표피 조직 (조직) / ⑤ 표피 세포 (세포) : 같은 육각형 무늬를 이어서 써요 -----
  const EPI = (function () {
    const R = rng(1357), S = 64, RR = S / Math.sqrt(3), jit = new Map();
    const vkey = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10);
    const vtx = (x, y) => {
      const k = vkey(x, y);
      if (!jit.has(k)) jit.set(k, [(R() - 0.5) * 15, (R() - 0.5) * 15]);
      const j = jit.get(k); return [x + j[0], y + j[1]];
    };
    const cells = [];
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const cx = i * S + (j & 1 ? S / 2 : 0), cy = j * 1.5 * RR;
      const pts = [];
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push(vtx(cx + Math.cos(a) * RR, cy + Math.sin(a) * RR)); }
      let mx = 0, my = 0; pts.forEach((p) => { mx += p[0] / 6; my += p[1] / 6; });
      cells.push({ i, j, cx: mx, cy: my, pts, tone: R(), nx: (R() - 0.5) * 10, ny: (R() - 0.5) * 10 });
    }
    return { cells, hero: cells.find((c) => c.i === 0 && c.j === 0), stoma: cells.find((c) => c.i === -1 && c.j === 1) };
  })();
  function polyPath(c, pts, ox, oy, k) {
    c.beginPath();
    pts.forEach((p, i) => { const x = (p[0] - ox) * k, y = (p[1] - oy) * k; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
    c.closePath();
  }
  function artT3(c, t, o) {
    o = o || {};
    const tt = RM ? 0 : t;
    if (o.bg !== false) circleBg(c, '#f4f9e2', '#e6f0c2');
    const hero = EPI.hero;
    c.lineJoin = 'round';
    EPI.cells.forEach((cell) => {
      if (Math.abs(cell.cx - hero.cx) > 150 || Math.abs(cell.cy - hero.cy) > 150) return;
      const pul = 1 + 0.012 * Math.sin(tt * 1.1 + cell.i * 1.3 + cell.j);
      c.save(); c.translate(cell.cx - hero.cx, cell.cy - hero.cy); c.scale(pul, pul);
      polyPath(c, cell.pts, cell.cx, cell.cy, 1);
      c.fillStyle = lgrad(c, 0, -34, 0, 34, [[0, cell.tone < 0.5 ? '#f6fad0' : '#f0f6c0'], [1, '#e1ec9d']]); c.fill();
      c.strokeStyle = '#a3b45a'; c.lineWidth = 2.2; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.save(); c.scale(0.9, 0.9); c.stroke(); c.restore();
      if (cell !== EPI.stoma) {
        c.fillStyle = 'rgba(133,152,76,.85)'; c.beginPath(); c.ellipse(cell.nx, cell.ny, 7.5, 6.2, 0.4, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(cell.nx - 2, cell.ny - 2, 2.6, 1.6, 0, 0, TAU); c.fill();
      }
      c.restore();
    });
    // 기공 (공변세포 한 쌍)
    const st = EPI.stoma, gap = 2 + 2.2 * Math.pow(Math.sin(tt * 0.8), 2);
    [-1, 1].forEach((s) => {
      c.save(); c.translate(st.cx - hero.cx, st.cy - hero.cy);
      c.beginPath(); c.moveTo(s * gap, -17); c.bezierCurveTo(s * (gap + 22), -17, s * (gap + 22), 17, s * gap, 17); c.bezierCurveTo(s * (gap + 9), 8, s * (gap + 9), -8, s * gap, -17); c.closePath();
      c.fillStyle = lgrad(c, 0, -17, 0, 17, [[0, '#93dc7b'], [1, '#4fae4b']]); c.fill(); c.strokeStyle = '#3f8f3f'; c.lineWidth = 1.6; c.stroke();
      c.fillStyle = 'rgba(30,110,40,.8)'; [[-6, 0], [5, 6], [3, -8]].forEach((q) => { c.beginPath(); c.ellipse(s * (gap + 11) + q[0] * 0.3, q[1], 2.6, 2, 0, 0, TAU); c.fill(); });
      c.restore();
    });
  }
  function artT4(c, t, o) {
    o = o || {};
    const tt = RM ? 0 : t;
    if (o.bg !== false) circleBg(c, '#f4f9e2', '#e6f0c2');
    const hero = EPI.hero, K = 2.15;
    c.lineJoin = 'round';
    // 세포벽
    c.save(); c.translate(0, 6); polyPath(c, hero.pts, hero.cx, hero.cy, K); c.fillStyle = 'rgba(70,90,30,.14)'; c.fill();
    c.translate(0, -3); c.scale(1.01, 1.01); polyPath(c, hero.pts, hero.cx, hero.cy, K); c.fillStyle = 'rgba(70,90,30,.14)'; c.fill(); c.restore();
    polyPath(c, hero.pts, hero.cx, hero.cy, K); c.fillStyle = lgrad(c, -90, -90, 90, 90, [[0, '#e3edb0'], [1, '#a3b955']]); c.fill();
    c.strokeStyle = '#7c9433'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(110,135,40,.4)'; c.lineWidth = 1.2; c.save(); c.scale(0.94, 0.94); c.stroke(); c.scale(0.94, 0.94); c.stroke(); c.restore();
    // 세포 안
    c.save(); c.scale(0.86, 0.86); polyPath(c, hero.pts, hero.cx, hero.cy, K);
    c.fillStyle = '#f2f8e6'; c.fill(); c.restore();
    c.save(); c.scale(0.8, 0.8); polyPath(c, hero.pts, hero.cx, hero.cy, K);
    c.fillStyle = rgrad(c, -30, -34, 6, 0, 0, 120, [[0, '#f8fdf1'], [1, '#dcefcc']]); c.fill();
    c.strokeStyle = '#e0a82e'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = 'rgba(255,246,204,.95)'; c.lineWidth = 1.4; c.save(); c.scale(0.985, 0.985); c.stroke(); c.restore();
    c.restore();
    // 알갱이 · 미토콘드리아 (천천히 돌아요)
    c.fillStyle = 'rgba(90,140,70,.32)';
    for (let i = 0; i < 18; i++) { const a = i * 2.4 + tt * 0.12, d = 28 + (i * 37 % 40); c.beginPath(); c.arc(Math.cos(a) * d * 1.1, Math.sin(a) * d * 0.9, 1.7 + (i % 3) * 0.5, 0, TAU); c.fill(); }
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + tt * 0.1; mitoAt(c, Math.cos(a) * 52, Math.sin(a) * 44, a + 1.4, 1.1); }
    nucleusAt(c, -8 + Math.sin(tt * 0.4) * 2, -4 + Math.cos(tt * 0.35) * 2, 26, 24, 0);
  }

  const ART = { h0: artH0, h1: artH1, h2: artH2, h3: artH3, h4: artH4, t0: artT0, t1: artT1, t2: artT2, t3: artT3, t4: artT4 };
  // 확대할 곳 (그림 안 좌표). 다음 단계 그림이 이 동그라미 안에 들어가요.
  const PORTAL = {
    h0: { x: 7, y: -13, r: 24 }, h1: { x: 36, y: -26, r: 30 }, h2: { x: -30, y: 42, r: 27 }, h3: { x: 0, y: 0, r: 38 }, h4: null,
    t0: { x: 38, y: -52, r: 24 }, t1: { x: -26, y: 8, r: 30 }, t2: { x: -62, y: -49, r: 26 }, t3: { x: 0, y: 0, r: 40 }, t4: null,
  };

  /* =========================================================
     상태
     ========================================================= */
  const VIEW_ORDER = ['zoom', 'animal:chain', 'animal:organs', 'plant:leaf', 'plant:chain', 'compare:venn', 'compare:game'];
  const SUBS = {
    animal: [['chain', '🧩 순서 맞추기'], ['organs', '🔍 소화계 살펴보기']],
    plant: [['leaf', '🔍 잎 단면 살펴보기'], ['chain', '🧩 순서 맞추기']],
    compare: [['venn', '⚖️ 비교하기'], ['game', '🎮 분류 게임']],
  };
  const S = {
    scene: 'zoom', sub: { animal: 'chain', plant: 'leaf', compare: 'venn' },
    prevKey: null, sceneT0: -9, snapOK: false,
    drag: null,
    // 탐구 기록
    organSeen: {}, organSel: null, organT0: -9,
    leafSeen: {}, leafSel: null, leafT0: -9,
    exSel: { animal: null, plant: null },
    // 비교
    vennOK: false, gameOK: false,
  };
  const Z = {
    org: 'human', prevOrg: null, orgT0: -9,
    z: 0, target: 0, reached: { human: false, tree: false },
    dragging: null, sliderActive: false, cur: 0, labFrom: 0, labT0: -9, newAt: -9,
  };
  let game = null;
  let F = new Set();
  const isNew = (f) => !!(game && game.isNew(f));
  // '확인하기' 버튼을 누르는 순간에만 true (엔진이 check()를 주기적으로도 부르므로, 흔들림·되돌리기 같은 부작용은 이때만 일으킴)
  let MANUAL = false;
  $('#game').addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) { MANUAL = true; setTimeout(() => { MANUAL = false; }, 0); }
  }, true);

  const viewKey = () => (S.scene === 'zoom' ? 'zoom' : S.scene + ':' + S.sub[S.scene]);

  /* =========================================================
     배치 (태블릿 가로형 / 휴대폰 세로형)
     ========================================================= */
  function computeLayouts() {
    if (!TALL) {
      return {
        tabs: { y: 30, right: 788 },
        titleAt: { x: 16, y: 30 },
        zoom: {
          lens: { cx: 318, cy: 302, R: 250 }, label: { x: 318, y: 592 }, def: { x: 318, y: 622 },
          out: { x: 134, y: 592, r: 22 }, inn: { x: 502, y: 592, r: 22 },
          ladder: { x: 600, y: 62, w: 192, h: 80, gap: 24 }, ladderCap: { x: 696, y: 34 },
          hint: { x: 318, y: 22, maxW: 560 },
        },
        chain: {
          slot: { x0: 36, y: 100, w: 128, h: 164, gap: 22 }, tagY: 286,
          tray: { x0: 36, y: 326, w: 128, h: 164, gap: 22, cols: 5 },
          panel: { x: 24, y: 318, w: 752, h: 190 }, cap: { x: 24, y: 528, w: 752, h: 94 },
          arrowY: 78, hint: { x: 400, y: 576, maxW: 680 },
        },
        organs: {
          panel: { x: 16, y: 44, w: 440, h: 576 }, fig: { cx: 236, cy: 332, s: 2.7 },
          list: { x: 478, y: 56, w: 306, h: 54, gap: 10, cols: 1 }, cap: { x: 478, y: 392, w: 306, h: 228 },
          hint: { x: 236, y: 598, maxW: 400 },
        },
        leaf: {
          fig: { cx: 400, cy: 214, s: 3.1 }, panel: { x: 16, y: 44, w: 768, h: 340 },
          chips: { x: 24, y: 396, w: 240, h: 48, gap: 16, cols: 3 }, cap: { x: 24, y: 458, w: 500, h: 166 }, flow: { x: 540, y: 458, w: 236, h: 166 },
          hint: { x: 400, y: 70, maxW: 700 },
        },
        venn: {
          c1: { x: 292, y: 258, r: 180 }, c2: { x: 508, y: 258, r: 180 },
          tray: { x0: 15, y: 492, w: 122, h: 50, gap: 8, cols: 6 }, cardW: 122, cardH: 50,
          hint: { x: 400, y: 586, maxW: 700 }, titleY: 28,
        },
        game: {
          buckets: { x0: 14, y0: 52, w: 248, h: 212, gapX: 12, gapY: 10, cols: 3 },
          tray: { x0: 74, y: 528, w: 150, h: 44, gapX: 14, gapY: 8, cols: 4 }, cardW: 150, cardH: 44,
          hint: { x: 400, y: 510, maxW: 700 },
        },
      };
    }
    return {
      tabs: { y: 26, right: 454, center: true },
      titleAt: null,
      zoom: {
        lens: { cx: 230, cy: 190, R: 164 }, label: { x: 230, y: 392 }, def: { x: 230, y: 418 },
        out: { x: 40, y: 392, r: 22 }, inn: { x: 420, y: 392, r: 22 },
        ladder: { x: 10, y: 468, w: 440, h: 54, gap: 10 }, ladderCap: null,
        hint: { x: 230, y: 446, maxW: 430 },
      },
      chain: {
        slot: { x0: 8, y: 58, w: 444, h: 74, gap: 10, rows: true }, tagY: 0,
        tray: { x0: 8, y: 502, w: 218, h: 74, gapX: 8, gapY: 10, cols: 2 },
        panel: { x: 6, y: 492, w: 448, h: 250 }, cap: { x: 6, y: 750, w: 448, h: 44 },
        arrowY: 0, hint: { x: 230, y: 270, maxW: 430 },
      },
      organs: {
        panel: { x: 8, y: 50, w: 444, h: 420 }, fig: { cx: 230, cy: 262, s: 1.95 },
        list: { x: 8, y: 486, w: 218, h: 48, gap: 8, cols: 2 }, cap: { x: 8, y: 654, w: 444, h: 138 },
        hint: { x: 230, y: 448, maxW: 400 },
      },
      leaf: {
        fig: { cx: 230, cy: 164, s: 2.1 }, panel: { x: 8, y: 46, w: 444, h: 236 },
        chips: { x: 8, y: 296, w: 444, h: 46, gap: 8, cols: 1 }, cap: { x: 8, y: 460, w: 444, h: 120 }, flow: { x: 8, y: 590, w: 444, h: 200 },
        hint: { x: 230, y: 70, maxW: 410 },
      },
      venn: {
        c1: { x: 160, y: 252, r: 142 }, c2: { x: 300, y: 252, r: 142 },
        tray: { x0: 58, y: 450, w: 118, h: 48, gapX: 108, gapY: 10, cols: 2 }, cardW: 118, cardH: 46,
        hint: { x: 230, y: 78, maxW: 430 }, titleY: 62,
      },
      game: {
        buckets: { x0: 8, y0: 50, w: 218, h: 138, gapX: 8, gapY: 8, cols: 2 },
        tray: { x0: 55, y: 524, w: 150, h: 42, gapX: 50, gapY: 8, cols: 2 }, cardW: 150, cardH: 42,
        hint: { x: 230, y: 752, maxW: 430 },
      },
    };
  }

  /* =========================================================
     작은 그림 (사다리·카드용): 한 번 그려 두고 재사용
     ========================================================= */
  const thumbs = {};
  function getThumb(id) {
    if (thumbs[id]) return thumbs[id];
    const px = 96, cv = document.createElement('canvas');
    cv.width = cv.height = px * 2;
    const c = cv.getContext('2d');
    c.translate(px, px); c.scale(px / 100, px / 100);
    c.save(); c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.clip();
    ART[id](c, 1.2, {});
    c.restore();
    thumbs[id] = cv;
    return cv;
  }
  function drawThumb(id, x, y, r, o) {
    o = o || {};
    ctx.save();
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.28)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent'; }
    ctx.drawImage(getThumb(id), x - r, y - r, r * 2, r * 2);
    ctx.strokeStyle = o.border || 'rgba(60,80,70,.28)'; ctx.lineWidth = o.bw || 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     ① 확대 탐험 (렌즈)
     ========================================================= */
  function levelColor(org, i) { return LV[CHAINS[org][i].lv].color; }
  // 확대하는 동안 쓸 '멈춘 그림' (미리 한 장씩 그려 둬요)
  const BMP = {}, BMP_PX = 768;
  const BMP_IDS = ['h0', 'h1', 'h2', 'h3', 't0', 't1', 't2', 't3'];
  function makeBmp(id) {
    if (BMP[id]) return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = BMP_PX;
    const c = cv.getContext('2d'), k = BMP_PX / 200;
    c.setTransform(k, 0, 0, k, BMP_PX / 2, BMP_PX / 2);
    ART[id](c, 1.2, {});
    BMP[id] = cv;
  }
  let bmpTimer = 0;
  function warmBmps() {
    const next = BMP_IDS.find((id) => !BMP[id]);
    if (!next) return;
    makeBmp(next);
    bmpTimer = setTimeout(warmBmps, 140);
  }
  bmpTimer = setTimeout(warmBmps, 1200);
  function drawLens(Lc, org, z, t, alpha) {
    const L = CHAINS[org];
    const k = Math.min(3, Math.floor(z + 1e-6));
    const f = clamp(z - k, 0, 1), e = EASE.inOutCubic(f);
    const P = PORTAL[L[k].art];
    const sU = Lc.R / 100, m = P.r / 100, s = Math.pow(1 / m, e);
    const camX = P.x * e, camY = P.y * e;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(Lc.cx, Lc.cy, Lc.R, 0, TAU); ctx.clip();
    ctx.fillStyle = '#eef3ea'; ctx.fillRect(Lc.cx - Lc.R, Lc.cy - Lc.R, 2 * Lc.R, 2 * Lc.R);
    ctx.translate(Lc.cx, Lc.cy); ctx.scale(sU * s, sU * s); ctx.translate(-camX, -camY);
    const moving = f > 0.003 && f < 0.997;
    if (e < 0.997) {                                   // 자식이 렌즈를 다 덮으면 부모는 안 그려도 돼요
      if (moving && BMP[L[k].art]) ctx.drawImage(BMP[L[k].art], -100, -100, 200, 200);
      else ART[L[k].art](ctx, t, {});
    }
    // 다음 단계가 동그라미 안에 들어 있어요
    ctx.save();
    ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, TAU); ctx.clip();
    ctx.translate(P.x, P.y); ctx.scale(m, m);
    ART[L[k + 1].art](ctx, t, {});
    ctx.restore();
    // 동그라미 테두리
    const px = 1 / (sU * s);
    const pulse = RM ? 1 : 0.7 + 0.3 * Math.sin(t * 3.2);
    const fade = 1 - smoothstep(0.55, 0.95, f);
    if (fade > 0.01) {
      ctx.globalAlpha = alpha * fade;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 7 * px; ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(levelColor(org, k + 1), 0.55 + 0.4 * pulse); ctx.lineWidth = 3.4 * px; ctx.stroke();
      if (!RM && f < 0.02) {
        const q = (t * 0.9) % 1;
        ctx.strokeStyle = rgba(levelColor(org, k + 1), 0.5 * (1 - q)); ctx.lineWidth = 3 * px;
        ctx.beginPath(); ctx.arc(P.x, P.y, P.r * (1 + q * 0.5), 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }
  let frameBmp = null, frameKey = '';
  function drawLensFrame(Lc, t) {
    const { cx, cy, R } = Lc, pad = 42, k = view.scale * view.dpr;
    const key = [cx, cy, R, k.toFixed(3)].join('|');
    if (frameKey !== key) {
      frameKey = key;
      const sz = Math.ceil((2 * (R + pad)) * k);
      frameBmp = document.createElement('canvas'); frameBmp.width = frameBmp.height = sz;
      const c2 = frameBmp.getContext('2d');
      c2.setTransform(k, 0, 0, k, -(cx - R - pad) * k, -(cy - R - pad) * k);
      const saved = ctx; ctx = c2; drawLensFrameNow(Lc); ctx = saved;
    }
    ctx.drawImage(frameBmp, cx - R - pad, cy - R - pad, 2 * (R + pad), 2 * (R + pad));
  }
  function drawLensFrameNow(Lc) {
    const { cx, cy, R } = Lc;
    // 렌즈 테두리
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.32)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 7;
    ctx.fillStyle = '#2a3446'; ctx.beginPath(); ctx.arc(cx, cy, R + 13, 0, TAU); ctx.arc(cx, cy, R, 0, TAU, true); ctx.fill('evenodd');
    ctx.restore();
    const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    g.addColorStop(0, '#9aa8bd'); g.addColorStop(0.45, '#4a566c'); g.addColorStop(1, '#2a3446');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 13, 0, TAU); ctx.arc(cx, cy, R, 0, TAU, true); ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, TAU); ctx.stroke();
    // 가장자리 어둡게 + 유리 반사
    const vg = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    vg.addColorStop(0, 'rgba(10,20,30,0)'); vg.addColorStop(1, 'rgba(10,20,30,.22)');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R - 8, Math.PI * 1.08, Math.PI * 1.36); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  const ladderRect = (i) => { const L = LAY.zoom.ladder; return { x: L.x, y: L.y + i * (L.h + L.gap), w: L.w, h: L.h }; };
  function drawLadder(t) {
    const Lc = LAY.zoom, L = Lc.ladder, chain = CHAINS[Z.org];
    if (Lc.ladderCap) pill('구성 단계 (큰 것 → 작은 것)', Lc.ladderCap.x, Lc.ladderCap.y, { size: 13, bg: '#fff', color: '#475569', border: '#d6dee8', borderW: 1.5, pad: 9 });
    // 연결선
    const x0 = L.x + (TALL ? 34 : 40);
    ctx.save(); ctx.strokeStyle = '#c9d4e0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, ladderRect(0).y + L.h / 2); ctx.lineTo(x0, ladderRect(4).y + L.h / 2); ctx.stroke(); ctx.restore();
    // 현재 위치 틀 (z에 따라 미끄러져요)
    const zi = clamp(Z.z, 0, 4);
    const sy = L.y + zi * (L.h + L.gap);
    const cur = Math.round(zi);
    chain.forEach((c, i) => {
      const r = ladderRect(i), lv = LV[c.lv];
      const near = clamp(1 - Math.abs(zi - i), 0, 1);          // 1이면 지금 이 단계
      const pop = near * 3;
      ctx.save();
      ctx.shadowColor = 'rgba(30,60,50,' + (0.1 + near * 0.16).toFixed(2) + ')'; ctx.shadowBlur = 6 + near * 10; ctx.shadowOffsetY = 2 + near * 2;
      rr(r.x - pop, r.y - pop, r.w + pop * 2, r.h + pop * 2, 14);
      ctx.fillStyle = near > 0.5 ? '#fff' : 'rgba(255,255,255,.82)'; ctx.fill();
      ctx.restore();
      rr(r.x - pop, r.y - pop, r.w + pop * 2, r.h + pop * 2, 14);
      ctx.strokeStyle = near > 0.05 ? rgba(lv.color, 0.25 + near * 0.75) : '#dbe3ec'; ctx.lineWidth = 1.5 + near * 2; ctx.stroke();
      const tr = TALL ? 21 : 30, tx = r.x + (TALL ? 34 : 40), ty = r.y + r.h / 2;
      drawThumb(c.art, tx, ty, tr + near * 2, { border: rgba(lv.color, 0.4 + near * 0.6), bw: 2 + near });
      const nx = tx + tr + 12;
      txt(lv.name, nx, r.y + (TALL ? 23 : 34), { size: TALL ? 17 : 19, weight: 800, color: lv.color });
      txt(c.name, nx, r.y + (TALL ? 43 : 58), { size: TALL ? 14 : 15, weight: 700, color: '#475569', max: r.w - (nx - r.x) - 8 });
      if (!TALL && i < 4) txt('▼', r.x + 40, r.y + r.h + L.gap / 2 + 5, { size: 12, weight: 800, color: '#a8b5c4', align: 'center' });
    });
    void cur; void sy;
  }
  function zoomLabelState() {
    const age = now() - Z.labT0;
    const p = clamp(age / 0.4, 0, 1);
    return { p, from: Z.labFrom, to: Z.cur };
  }
  function drawZoomLabel() {
    const Lc = LAY.zoom, chain = CHAINS[Z.org];
    const st = zoomLabelState();
    const one = (idx, dy, a) => {
      if (a <= 0.02) return;
      const c = chain[idx], lv = LV[c.lv];
      ctx.save(); ctx.globalAlpha = a;
      pill(lv.name + ' · ' + c.name, Lc.label.x, Lc.label.y + dy, { size: 18, h: 34, pad: 16, bg: lv.soft, color: lv.color, border: lv.color, borderW: 2.2, shadow: true });
      txt(lv.def, Lc.def.x, Lc.def.y + dy, { size: 14, weight: 700, color: '#475569', align: 'center', max: TALL ? 430 : 400 });
      ctx.restore();
    };
    if (st.p < 1 && st.from !== st.to) {
      const e = EASE.outCubic(st.p);
      one(st.from, -12 * e, 1 - e);
      one(st.to, 12 * (1 - EASE.outBack(st.p)), e);
    } else one(st.to, 0, 1);
  }
  function drawRoundBtn(b, sym, enabled, t) {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.shadowColor = 'rgba(20,40,60,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#c3cfdc'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x - 8, b.y); ctx.lineTo(b.x + 8, b.y);
    if (sym === '+') { ctx.moveTo(b.x, b.y - 8); ctx.lineTo(b.x, b.y + 8); }
    ctx.stroke();
    ctx.restore();
  }
  function drawZoomScene(t) {
    const Lc = LAY.zoom;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f1f6f3'); g.addColorStop(1, '#e0ebe6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 렌즈
    const p = clamp((now() - Z.orgT0) / 0.5, 0, 1);
    if (Z.prevOrg && p < 1) { drawLens(Lc.lens, Z.prevOrg, Z.z, t, 1); drawLens(Lc.lens, Z.org, Z.z, t, EASE.inOutQuad(p)); }
    else drawLens(Lc.lens, Z.org, Z.z, t, 1);
    drawLensFrame(Lc.lens, t);
    drawZoomLabel();
    drawRoundBtn(Lc.out, '-', Z.target > 0.01, t);
    drawRoundBtn(Lc.inn, '+', Z.target < 3.99, t);
    drawLadder(t);
    if (isNew('zoom')) { const l = Lc.lens; newRing({ x: l.cx - l.R - 14, y: l.cy - l.R - 14, w: 2 * l.R + 28, h: 2 * l.R + 28 }, l.R); }
  }

  /* =========================================================
     카드 끌어 놓기 (공통)
     ========================================================= */
  function mkCard(o) {
    return Object.assign({ x: 0, y: 0, w: 100, h: 50, lift: 0, bad: -9, ok: false, slot: -1, tw: null }, o);
  }
  function moveCard(cd, r, animate) {
    cd.w = r.w; cd.h = r.h;
    if (animate && !RM) { cd.tw = SciSim.tween(cd, { x: r.x, y: r.y }, { duration: 0.42, ease: 'outBack' }); }
    else { if (cd.tw) cd.tw.cancel(); cd.x = r.x; cd.y = r.y; }
  }
  function cardAt(list, p) {
    for (let i = list.length - 1; i >= 0; i--) if (inR(p, list[i], 4)) return list[i];
    return null;
  }
  function raise(list, cd) { list.splice(list.indexOf(cd), 1); list.push(cd); }
  // 카드 그리기 틀: 그림자·들림·흔들림·테두리. fn(w,h)가 안쪽 내용을 그려요.
  function cardFrame(cd, t, accent, fn) {
    const lift = cd.lift, sc = 1 + 0.05 * lift;
    let shake = 0;
    const ba = t - cd.bad;
    if (ba < 0.55) shake = Math.sin(ba * 42) * 7 * (1 - ba / 0.55);
    const pop = cd.pop != null ? Math.max(0, now() - cd.pop) : 9;
    const bump = pop < 0.5 ? Math.sin(pop / 0.5 * Math.PI) * 0.08 : 0;
    ctx.save();
    ctx.translate(cd.x + cd.w / 2 + shake, cd.y + cd.h / 2 - lift * 3);
    ctx.scale(sc + bump, sc + bump);
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,30,' + (0.16 + lift * 0.14).toFixed(3) + ')'; ctx.shadowBlur = 6 + lift * 16; ctx.shadowOffsetY = 2 + lift * 7;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, 14); ctx.fillStyle = cd.ok ? '#f3fdf6' : '#fff'; ctx.fill();
    ctx.restore();
    const bad = ba < 1.2;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, 14);
    ctx.strokeStyle = bad ? '#ef4444' : cd.ok ? '#22c55e' : accent || '#c9d4e2'; ctx.lineWidth = bad || cd.ok ? 3 : 2; ctx.stroke();
    ctx.save(); ctx.translate(-cd.w / 2, -cd.h / 2); fn(cd.w, cd.h); ctx.restore();
    if (cd.ok) D.check(cd.w / 2 - 14, -cd.h / 2 + 14, 9, 1);
    ctx.restore();
  }
  function snapAll(list, targetFn, animate) { list.forEach((cd) => moveCard(cd, targetFn(cd), animate)); }

  /* =========================================================
     ②③ 구성 단계 순서 맞추기 (동물 · 식물)
     ========================================================= */
  const CHAIN = {};
  ['animal', 'plant'].forEach((kind, ki) => {
    const K = KINDS[kind];
    const order = [0, 1, 2, 3, 4];
    CHAIN[kind] = {
      kind,
      cards: shuffled(order, 5 + ki * 7).map((idx, home) => mkCard({ idx, home, lv: K.chain[idx], name: K.names[idx], art: K.art[idx] })),
      done: false, anim: null, fired: [], lastMsg: null,
    };
  });
  const chainOf = () => CHAIN[S.scene === 'plant' ? 'plant' : 'animal'];
  function slotRect(i) {
    const s = LAY.chain.slot;
    if (s.rows) return { x: s.x0, y: s.y + i * (s.h + s.gap), w: s.w, h: s.h };
    return { x: s.x0 + i * (s.w + s.gap), y: s.y, w: s.w, h: s.h };
  }
  function trayRect(i) {
    const T = LAY.chain.tray, cols = T.cols;
    const col = i % cols, row = Math.floor(i / cols);
    return { x: T.x0 + col * (T.w + (T.gapX != null ? T.gapX : T.gap)), y: T.y + row * (T.h + (T.gapY != null ? T.gapY : 0)), w: T.w, h: T.h };
  }
  function chainTarget(cd) {
    if (cd.slot >= 0) {
      const r = slotRect(cd.slot);
      return LAY.chain.slot.rows ? { x: r.x + 4, y: r.y, w: LAY.chain.tray.w, h: r.h } : r;
    }
    return trayRect(cd.home);
  }
  function snapChain(kind, animate) { snapAll(CHAIN[kind].cards, chainTarget, animate); }
  function resetChain(kind) {
    const ch = CHAIN[kind];
    ch.cards.forEach((cd) => { cd.slot = -1; cd.ok = false; cd.bad = -9; });
    ch.done = false; ch.anim = null; ch.fired = [];
    S.exSel[kind] = null;
    snapChain(kind, false);
  }
  function chainSlotAt(p, pad) {
    for (let i = 0; i < 5; i++) if (inR(p, slotRect(i), pad == null ? 8 : pad)) return i;
    return -1;
  }
  function placeInSlot(ch, cd, slot) {
    const other = ch.cards.find((o) => o !== cd && o.slot === slot);
    if (other) { other.slot = cd.slot >= 0 && cd.slot !== slot ? cd.slot : -1; other.ok = false; }
    cd.slot = slot; cd.ok = false;
    Sound.tick();
    snapChain(ch.kind, true);
  }
  function chainCheck(kind) {
    const ch = CHAIN[kind];
    const empty = ch.cards.filter((c) => c.slot < 0).length;
    if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요. 5장을 모두 칸에 놓아 주세요.';
    const wrong = ch.cards.filter((c) => c.slot !== c.idx);
    if (wrong.length) {
      if (MANUAL) {
        const t = now();
        wrong.forEach((c) => { c.bad = t; });
        setTimeout(() => { wrong.forEach((c) => { c.slot = -1; }); snapChain(kind, true); }, 650);
      }
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 큰 것은 작은 것이 모여 이루어져요. 무엇이 무엇의 일부인지 생각해 보세요.';
    }
    if (MANUAL) startMerge(kind);
    return true;
  }
  // 합쳐지는 애니메이션 시작
  const HOP_T = 0.62, HOP_START = 0.9;
  function startMerge(kind) {
    const ch = CHAIN[kind];
    ch.done = true; ch.anim = { t0: now() }; ch.fired = [false, false, false, false];
    ch.cards.forEach((c) => { c.ok = true; });
    Sound.tone(660, 0.12, 'triangle', 0.08);
  }
  const mergeT = (ch) => (ch.anim ? now() - ch.anim.t0 : 99);
  const mergeDone = (ch) => mergeT(ch) > HOP_START + 4 * HOP_T + 0.4;
  function slotCenter(i) { const r = slotRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  function drawChainFace(cd, kind, w, h) {
    const lv = LV[cd.lv];
    if (!TALL) {
      drawThumb(cd.art, w / 2, 60, 46, { border: cd.ok ? lv.color : 'rgba(60,80,70,.3)', bw: cd.ok ? 3 : 1.5 });
      txt(cd.name, w / 2, 138, { size: 18, weight: 800, align: 'center', color: '#1e293b', max: w - 14 });
      if (cd.ok) txt(lv.name, w / 2, 156, { size: 13.5, weight: 800, align: 'center', color: lv.color });
    } else {
      drawThumb(cd.art, 40, h / 2, 28, { border: cd.ok ? lv.color : 'rgba(60,80,70,.3)', bw: cd.ok ? 3 : 1.5 });
      txt(cd.name, 80, h / 2 + (cd.ok ? -6 : 1), { size: 19, weight: 800, color: '#1e293b', base: 'middle', max: w - 92 });
      if (cd.ok) txt(lv.name, 80, h / 2 + 15, { size: 14, weight: 800, color: lv.color, base: 'middle' });
    }
  }
  function drawChainCard(cd, kind, t) { cardFrame(cd, t, null, (w, h) => drawChainFace(cd, kind, w, h)); }

  // 탭(장면 안 작은 단추)
  let tabRects = [];
  function drawTabs() {
    tabRects = [];
    if (S.scene === 'zoom') return;
    const L = LAY.tabs, list = SUBS[S.scene];
    ctx.font = font(14.5, 800);
    const ws = list.map((s) => ctx.measureText(s[1]).width + 26);
    const total = ws.reduce((a, b) => a + b, 0) + 8 * (list.length - 1);
    let x = L.center ? (W - total) / 2 : L.right - total;
    list.forEach((s, i) => {
      const on = S.sub[S.scene] === s[0];
      const r = { x, y: L.y - 17, w: ws[i], h: 34, key: s[0] };
      ctx.save();
      if (on) { ctx.shadowColor = 'rgba(20,40,30,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
      rr(r.x, r.y, r.w, r.h, 17); ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,.55)'; ctx.fill();
      ctx.restore();
      rr(r.x, r.y, r.w, r.h, 17); ctx.strokeStyle = on ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = on ? 2.2 : 1.5; ctx.stroke();
      txt(s[1], r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 14.5, weight: 800, color: on ? '#166534' : '#64748b', align: 'center', base: 'middle' });
      tabRects.push(r);
      x += ws[i] + 8;
    });
    if (LAY.titleAt) {
      const ttl = S.scene === 'animal' ? (S.sub.animal === 'organs' ? '🐾 동물 · 소화계' : KINDS.animal.title) : S.scene === 'plant' ? (S.sub.plant === 'leaf' ? '🌿 식물 · 잎의 단면' : KINDS.plant.title) : '⚖️ 동물과 식물 비교';
      pill(ttl, LAY.titleAt.x, LAY.titleAt.y, { size: 15, bg: S.scene === 'animal' ? '#ffe4e6' : S.scene === 'plant' ? '#dcfce7' : '#e0e7ff', color: S.scene === 'animal' ? '#9f1239' : S.scene === 'plant' ? '#166534' : '#3730a3', align: 'left', pad: 12 });
    }
  }

  // 예 패널 (성공 뒤)
  let exRects = [];
  function drawExamples(kind, t, appear) {
    const P = LAY.chain.panel, K = KINDS[kind], EXs = EX[kind];
    exRects = [];
    ctx.save();
    ctx.globalAlpha = appear;
    panel(P.x, P.y, P.w, P.h, { bg: '#fff', border: '#e2e8f0', r: 16 });
    const rows = K.chain.length, rh = TALL ? 46 : 34;
    const y0 = P.y + (P.h - rows * rh) / 2;
    ctx.font = font(TALL ? 14 : 14.5, 800);
    K.chain.forEach((lvk, i) => {
      const lv = LV[lvk], yy = y0 + i * rh + rh / 2;
      pill(lv.name, P.x + 14, yy, { size: 14, align: 'left', bg: lv.color, color: '#fff', pad: 10, h: 26 });
      const tagR = { x: P.x + 14, y: yy - 13, w: 70, h: 26, tag: lvk };
      exRects.push(Object.assign({ name: '@' + lvk }, tagR));
      let x = P.x + 96;
      (EXs[lvk] || []).forEach((nm) => {
        ctx.font = font(TALL ? 14 : 14.5, 700);
        const cw = ctx.measureText(nm).width + 18, ch = 26;
        const tappable = !!DESC[nm];
        const sel = S.exSel[kind] === nm;
        rr(x, yy - ch / 2, cw, ch, 13);
        ctx.fillStyle = sel ? lv.color : lv.soft; ctx.fill();
        ctx.strokeStyle = tappable ? lv.color : 'rgba(0,0,0,0)'; ctx.lineWidth = tappable ? 1.6 : 0; if (tappable) ctx.stroke();
        txt(nm, x + cw / 2, yy + 1, { size: TALL ? 14 : 14.5, weight: 700, color: sel ? '#fff' : '#1e293b', align: 'center', base: 'middle' });
        if (tappable) exRects.push({ x, y: yy - ch / 2, w: cw, h: ch, name: nm });
        x += cw + 7;
      });
    });
    ctx.restore();
  }
  function drawChainCaption(kind, t) {
    const ch = CHAIN[kind], K = KINDS[kind], C = LAY.chain.cap;
    let head = null, body = null, color = '#166534';
    if (!ch.done) {
      head = '생각해 보기'; body = TALL ? '큰 것은 작은 것이 모여 이루어져요.' : '큰 것은 작은 것이 모여 이루어져요. 무엇이 무엇의 일부인지 생각해 보세요.';
    } else {
      const T = mergeT(ch);
      if (T < HOP_START + 4 * HOP_T) {
        const h = clamp(Math.floor((T - HOP_START + 0.2) / HOP_T), 0, 3);
        if (T > HOP_START - 0.2) { head = '합쳐지는 중'; body = K.hops[h]; }
      } else {
        const sel = S.exSel[kind];
        if (sel && sel[0] === '@') { const lv = LV[sel.slice(1)]; head = lv.name; body = lv.def; color = lv.color; }
        else if (sel) { head = sel; body = DESC[sel]; }
        else { head = '정리'; body = K.chain.map((k) => LV[k].name).join(' → ') + ' 순서로 작은 것이 모여 큰 것이 돼요.'; }
      }
    }
    if (!head) return;
    if (!TALL) {
      panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: '#e2e8f0' });
      pill(head, C.x + 16, C.y + 24, { size: 14, align: 'left', bg: color === '#166534' ? '#dcfce7' : '#f1f5f9', color, pad: 11, h: 26 });
      para(body, C.x + 18, C.y + 62, C.w - 36, { size: 17, weight: 800, color: '#1e293b', lh: 24 });
    } else {
      panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: '#e2e8f0', r: 12 });
      txt(head + ' · ' + body, C.x + C.w / 2, C.y + C.h / 2 + 1, { size: 14, weight: 800, color: '#1e293b', align: 'center', base: 'middle', max: C.w - 20 });
    }
  }
  function drawChainScene(t) {
    const kind = S.scene === 'plant' ? 'plant' : 'animal';
    const ch = CHAIN[kind], K = KINDS[kind], Lc = LAY.chain;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, kind === 'animal' ? '#fbf3f1' : '#f1f8ee'); g.addColorStop(1, kind === 'animal' ? '#f4e6e4' : '#e2eedf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawTabs();
    const T = mergeT(ch);
    // 작은 것 → 큰 것 화살표
    if (!TALL) {
      const y = Lc.arrowY;
      ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.setLineDash([2, 8]);
      ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(736, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(756, y); ctx.lineTo(738, y - 8); ctx.lineTo(738, y + 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(46, y, 4, 0, TAU); ctx.fill();
      ctx.restore();
      txt('작은 것', 48, y - 12, { size: 13.5, weight: 800, color: '#64748b' });
      txt('큰 것', 756, y - 12, { size: 13.5, weight: 800, color: '#64748b', align: 'right' });
    }
    // 칸
    const hot = dragChainSlot(kind);
    for (let i = 0; i < 5; i++) {
      const r = slotRect(i), lv = LV[K.chain[i]];
      const reveal = ch.done ? clamp((T - 0.15 - i * 0.2) / 0.35, 0, 1) : 0;
      ctx.save();
      if (reveal > 0) { rr(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = rgba(lv.color, 0.1 * reveal); ctx.fill(); }
      ctx.setLineDash([7, 6]); ctx.strokeStyle = hot === i ? '#16a34a' : '#b8c4d4'; ctx.lineWidth = hot === i ? 3 : 1.8;
      rr(r.x, r.y, r.w, r.h, 16); ctx.stroke(); ctx.setLineDash([]);
      if (hot === i) { ctx.fillStyle = 'rgba(34,197,94,.10)'; rr(r.x, r.y, r.w, r.h, 16); ctx.fill(); }
      ctx.restore();
      const occupied = ch.cards.some((c) => c.slot === i);
      if (!occupied) {
        txt(String(i + 1), TALL ? r.x + 34 : r.x + r.w / 2, TALL ? r.y + r.h / 2 + 2 : r.y + r.h / 2 + 10, { size: TALL ? 28 : 44, weight: 800, color: '#cbd5e1', align: 'center', base: 'middle' });
        if (TALL) txt(i === 0 ? '가장 작은 것' : i === 4 ? '가장 큰 것' : '', r.x + 70, r.y + r.h / 2 + 1, { size: 14, weight: 700, color: '#94a3b8', base: 'middle' });
      }
      // 단계 이름표
      if (reveal > 0) {
        const e = EASE.outBack(reveal), tag = LV[K.chain[i]];
        ctx.save();
        const tx = TALL ? r.x + r.w - 62 : r.x + r.w / 2, ty = TALL ? r.y + r.h / 2 : Lc.tagY;
        ctx.translate(tx, ty); ctx.scale(e, e);
        pill(tag.name, 0, 0, { size: 16, h: 30, pad: 14, bg: tag.color, color: '#fff', shadow: true });
        ctx.restore();
      }
      if (!TALL && i < 4) {
        const ax = r.x + r.w + Lc.slot.gap / 2, ay = r.y + r.h / 2;
        ctx.fillStyle = '#a8b5c4'; ctx.beginPath(); ctx.moveTo(ax - 4, ay - 7); ctx.lineTo(ax + 5, ay); ctx.lineTo(ax - 4, ay + 7); ctx.closePath(); ctx.fill();
      }
    }
    // 처음 자리(카드 놓는 곳)와 예 패널
    const allIn = ch.cards.every((c) => c.slot >= 0);
    const panelA = ch.done ? clamp((T - HOP_START - 4 * HOP_T) / 0.5, 0, 1) : 0;
    if (!ch.done) {
      const tr = LAY.chain.tray;
      const ty = !TALL ? tr.y - 14 : tr.y - 12;
      if (!allIn) txt('🃏 카드 (섞여 있어요)', TALL ? 12 : 38, ty, { size: 13.5, weight: 800, color: '#64748b' });
    }
    if (panelA > 0) drawExamples(kind, t, panelA);
    // 카드
    const dragCd = S.drag && S.drag.set === 'chain' ? S.drag.card : null;
    ch.cards.forEach((cd) => { if (cd !== dragCd) drawChainCard(cd, kind, t); });
    if (dragCd) drawChainCard(dragCd, kind, t);
    // 합쳐지는 흐름 (작은 점들이 다음 칸으로 모여요)
    if (ch.done && T < HOP_START + 4 * HOP_T + 0.2) drawMergeStream(ch, kind, T, t);
    drawChainCaption(kind, t);
    if (isNew(kind)) { const a = slotRect(0), b = slotRect(4); newRing({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y }, 16); }
  }
  function drawMergeStream(ch, kind, T, t) {
    const K = KINDS[kind];
    for (let h = 0; h < 4; h++) {
      const u = (T - HOP_START - h * HOP_T) / HOP_T;
      const a = slotCenter(h), b = slotCenter(h + 1), lv = LV[K.chain[h]], lv2 = LV[K.chain[h + 1]];
      if (u > 0 && u < 1) {
        for (let k = 0; k < 9; k++) {
          const v = clamp(u * 1.35 - k * 0.045, 0, 1);
          if (v <= 0 || v >= 1) continue;
          const e = EASE.inOutCubic(v);
          const mx = (a.x + b.x) / 2 + (TALL ? 46 : 0) * Math.sin(k * 1.7), my = (a.y + b.y) / 2 - (TALL ? 0 : 38 + 10 * Math.sin(k * 2.3));
          const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * mx + e * e * b.x;
          const y = (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * my + e * e * b.y;
          const r = 5.6 - 2.2 * e;
          D.sphere(x, y, r, lv.color, { gloss: true });
        }
      }
      if (u >= 1 && !ch.fired[h]) {
        ch.fired[h] = true;
        const card = ch.cards.find((c) => c.slot === h + 1);
        if (card) card.pop = now();
        burst(b.x, b.y, [lv2.color, '#ffffff', '#fde047'], 14, { speed: 120, life: 0.7 });
        Sound.tone(520 + h * 120, 0.1, 'triangle', 0.07);
      }
    }
    if (T > HOP_START + 4 * HOP_T && !ch.fired[4]) {
      ch.fired[4] = true;
      const b = slotCenter(4);
      burst(b.x, b.y, null, 36, { speed: 190, life: 1 });
      Sound.success();
    }
  }
  function dragChainSlot(kind) {
    const d = S.drag;
    if (!d || d.set !== 'chain' || d.px == null) return -1;
    return chainSlotAt({ x: d.px, y: d.py }, 6);
  }

  /* =========================================================
     ② 소화계 살펴보기 (여러 기관이 모인 기관계)
     ========================================================= */
  const HC = document.createElement('canvas').getContext('2d');       // 누르기 판정용
  const ORGAN_LABEL = { eso: [16, -80], stom: [50, -50], liver: [-38, -42], small: [0, 41], large: [-60, 76] };
  const ORGAN_HIT = [['stom', 'fill'], ['liver', 'fill'], ['eso', 14], ['small', 13], ['large', 16]];
  function organAt(p) {
    const L = LAY.organs.fig;
    const x = (p.x - L.cx) / L.s, y = (p.y - L.cy) / L.s;
    for (const [k, mode] of ORGAN_HIT) {
      const path = PH[k];
      if (mode === 'fill') { if (HC.isPointInPath(path, x, y)) return k; }
      else { HC.lineWidth = mode + 4 / L.s * 3; if (HC.isPointInStroke(path, x, y)) return k; }
    }
    return null;
  }
  function organChip(i) {
    const L = LAY.organs.list;
    const col = i % L.cols, row = Math.floor(i / L.cols);
    return { x: L.x + col * (L.w + 8), y: L.y + row * (L.h + L.gap), w: L.w, h: L.h };
  }
  function selectOrgan(k) {
    S.organSel = k; S.organT0 = now(); S.organSeen[k] = true;
    Sound.tone(560 + ORGAN_KEYS.indexOf(k) * 70, 0.1, 'triangle', 0.07);
  }
  function drawOrgansScene(t) {
    const Lc = LAY.organs, F0 = Lc.fig;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fbf3f1'); g.addColorStop(1, '#f4e6e4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawTabs();
    // 그림 판
    const P = Lc.panel;
    panel(P.x, P.y, P.w, P.h, { bg: '#eaf4ff', border: '#cfe3f6', r: 20 });
    ctx.save(); rr(P.x, P.y, P.w, P.h, 20); ctx.clip();
    ctx.fillStyle = lgrad(ctx, 0, P.y, 0, P.y + P.h, [[0, '#eef7ff'], [1, '#d6e9fa']]); ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.translate(F0.cx, F0.cy); ctx.scale(F0.s, F0.s);
    ART.h1(ctx, t, { bg: false, hl: S.organSel });
    // 이름표
    const px = 1 / F0.s;
    ORGAN_KEYS.forEach((k) => {
      if (!S.organSeen[k]) return;
      const a = ORGAN_LABEL[k], age = now() - (S.organSel === k ? S.organT0 : -9);
      const pop = S.organSel === k && age < 0.4 ? EASE.outBack(clamp(age / 0.4, 0, 1)) : 1;
      ctx.save(); ctx.translate(a[0], a[1]); ctx.scale(px * pop, px * pop);
      pill(ORGANS[k].name, 0, 0, { size: 15, bg: '#fff', color: '#9f1239', border: '#e0457b', borderW: 2, shadow: true });
      ctx.restore();
    });
    ctx.restore();
    pill('기관계 · 소화계', P.x + 14, P.y + 26, { size: 15, align: 'left', bg: LV.osys.color, color: '#fff', pad: 12, h: 30 });
    // 기관 단추
    ORGAN_KEYS.forEach((k, i) => {
      const r = organChip(i), sel = S.organSel === k, seen = !!S.organSeen[k];
      panel(r.x, r.y, r.w, r.h, { bg: sel ? '#fde1ec' : '#fff', border: sel ? LV.osys.color : '#e2e8f0', r: 14, bw: sel ? 2.4 : 1.4 });
      txt(ORGANS[k].name, r.x + 18, r.y + r.h / 2 + 1, { size: 18, weight: 800, color: '#9f1239', base: 'middle' });
      txt(seen ? '✅' : '👆', r.x + r.w - 26, r.y + r.h / 2 + 1, { size: 17, align: 'center', base: 'middle', color: '#334155' });
    });
    // 설명 상자
    const C = Lc.cap;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: S.organSel ? LV.osys.color : '#e2e8f0', bw: 2 });
    const n = ORGAN_KEYS.filter((k) => S.organSeen[k]).length;
    if (S.organSel) {
      const o = ORGANS[S.organSel];
      pill(o.name, C.x + 14, C.y + 26, { size: 15, align: 'left', bg: '#fde1ec', color: '#9f1239', pad: 11, h: 28 });
      para(o.fn, C.x + 16, C.y + 64, C.w - 32, { size: 16.5, weight: 800, color: '#1e293b', lh: 23 });
      para('소화계의 기관들은 함께 일해서 음식물을 소화시켜요.', C.x + 16, C.y + C.h - (TALL ? 34 : 56), C.w - 32, { size: 14, weight: 700, color: '#64748b', lh: 19 });
    } else {
      txt('👆 기관을 눌러 보세요', C.x + 16, C.y + 34, { size: 17, weight: 800, color: '#9f1239' });
      para('소화계는 식도·위·간·작은창자·큰창자 같은 여러 기관이 모인 기관계예요.', C.x + 16, C.y + 66, C.w - 32, { size: 15, weight: 700, color: '#475569', lh: 21 });
    }
    txt('살펴본 기관 ' + n + ' / 5', C.x + C.w - 14, C.y + C.h - 14, { size: 13.5, weight: 800, color: n === 5 ? '#15803d' : '#64748b', align: 'right' });
  }

  /* =========================================================
     ③ 잎의 단면 살펴보기 (조직계)
     ========================================================= */
  function leafAt(p) {
    const L = LAY.leaf.fig;
    const x = (p.x - L.cx) / L.s, y = (p.y - L.cy) / L.s - 5;
    if (HC.isPointInPath(PH.vasc, x, y)) return 'vasc';
    if (HC.isPointInPath(PH.epi, x, y)) return 'epi';
    if (HC.isPointInPath(PH.base, x, y)) return 'base';
    return null;
  }
  function leafChip(i) {
    const L = LAY.leaf.chips;
    const col = i % L.cols, row = Math.floor(i / L.cols);
    return { x: L.x + col * (L.w + L.gap), y: L.y + row * (L.h + 8), w: L.w, h: L.h };
  }
  function selectLeaf(k) {
    S.leafSel = k; S.leafT0 = now(); S.leafSeen[k] = true;
    Sound.tone(520 + TSYS_KEYS.indexOf(k) * 90, 0.1, 'triangle', 0.07);
  }
  const LEAF_LABEL = { epi: [54, -49], base: [58, 10], vasc: [38, -6] };
  function drawFlowInset(r, t, active) {
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.55;
    panel(r.x, r.y, r.w, r.h, { bg: '#fff', border: active ? TSYS.vasc.color : '#e2e8f0', bw: active ? 2.4 : 1.4 });
    const tx = TALL ? 2 : 1;
    // 물관(왼쪽), 체관(오른쪽) 관
    const tubeW = TALL ? 60 : 44, top = r.y + (TALL ? 46 : 38), bot = r.y + r.h - (TALL ? 42 : 30);
    const cx1 = r.x + r.w * (TALL ? 0.3 : 0.28), cx2 = r.x + r.w * (TALL ? 0.7 : 0.72);
    [[cx1, '#b9e1fa', '#4aa3e0', '물관'], [cx2, '#ffe0b3', '#e59a3a', '체관']].forEach((tb, i) => {
      rr(tb[0] - tubeW / 2, top, tubeW, bot - top, 18);
      ctx.fillStyle = tb[1]; ctx.fill(); ctx.strokeStyle = tb[2]; ctx.lineWidth = 2.4; ctx.stroke();
      txt(tb[3], tb[0], top - 14, { size: 15, weight: 800, color: i ? '#b45309' : '#1d6fa5', align: 'center' });
      // 흐르는 알갱이
      const n = 6;
      for (let k = 0; k < n; k++) {
        const u = RM ? k / n : ((t * 0.34 + k / n) % 1);
        const y = i === 0 ? bot - 10 - u * (bot - top - 20) : top + 10 + u * (bot - top - 20);
        const x = tb[0] + Math.sin(k * 2.1 + t * 1.4) * (tubeW * 0.22);
        D.sphere(x, y, 5.2, i ? '#f59e0b' : '#38bdf8', { gloss: true });
      }
      // 화살표
      const ax = tb[0] + tubeW / 2 + 16;
      D.arrow(ax, i === 0 ? bot - 14 : top + 14, ax, i === 0 ? top + 14 : bot - 14, { color: i ? '#d97706' : '#2b8fd6', width: 3.4, head: 10 });
    });
    txt('물 ↑', cx1, bot + 22, { size: 14, weight: 800, color: '#1d6fa5', align: 'center' });
    txt('양분 ↓', cx2, bot + 22, { size: 14, weight: 800, color: '#b45309', align: 'center' });
    void tx;
    ctx.restore();
  }
  function drawLeafScene(t) {
    const Lc = LAY.leaf, F0 = Lc.fig;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f1f8ee'); g.addColorStop(1, '#e2eedf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawTabs();
    const P = Lc.panel;
    panel(P.x, P.y, P.w, P.h, { bg: '#fcfef6', border: '#dde8c8', r: 20 });
    ctx.save(); rr(P.x, P.y, P.w, P.h, 20); ctx.clip();
    ctx.translate(F0.cx, F0.cy + 5 * F0.s); ctx.scale(F0.s, F0.s);
    ART.t2(ctx, t, { bg: false, hl: S.leafSel });
    const px = 1 / F0.s;
    TSYS_KEYS.forEach((k) => {
      if (!S.leafSeen[k]) return;
      const a = LEAF_LABEL[k], age = now() - (S.leafSel === k ? S.leafT0 : -9);
      const pop = S.leafSel === k && age < 0.4 ? EASE.outBack(clamp(age / 0.4, 0, 1)) : 1;
      ctx.save(); ctx.translate(a[0], a[1]); ctx.scale(px * pop, px * pop);
      pill(TSYS[k].name, 0, 0, { size: 16, bg: '#fff', color: '#1e293b', border: TSYS[k].color, borderW: 2.4, shadow: true });
      ctx.restore();
    });
    ctx.restore();
    // 단추
    TSYS_KEYS.forEach((k, i) => {
      const r = leafChip(i), sel = S.leafSel === k, seen = !!S.leafSeen[k];
      panel(r.x, r.y, r.w, r.h, { bg: sel ? '#fff' : '#fff', border: sel ? TSYS[k].color : '#e2e8f0', r: 14, bw: sel ? 3 : 1.4 });
      ctx.fillStyle = TSYS[k].color; rr(r.x + 10, r.y + 12, 8, r.h - 24, 4); ctx.fill();
      txt(TSYS[k].name, r.x + 30, r.y + r.h / 2 + 1, { size: 17.5, weight: 800, color: '#1e293b', base: 'middle', max: r.w - 70 });
      txt(seen ? '✅' : '👆', r.x + r.w - 26, r.y + r.h / 2 + 1, { size: 17, align: 'center', base: 'middle', color: '#334155' });
    });
    // 설명 상자
    const C = Lc.cap;
    panel(C.x, C.y, C.w, C.h, { bg: '#fff', border: S.leafSel ? TSYS[S.leafSel].color : '#e2e8f0', bw: 2 });
    const n = TSYS_KEYS.filter((k) => S.leafSeen[k]).length;
    if (S.leafSel) {
      const o = TSYS[S.leafSel];
      pill(o.name, C.x + 14, C.y + 26, { size: 15, align: 'left', bg: o.color, color: '#fff', pad: 12, h: 28 });
      const hh = para(o.fn, C.x + 16, C.y + 62, C.w - 32, { size: 16.5, weight: 800, color: '#1e293b', lh: 23 });
      if (S.leafSel === 'vasc' && !TALL) {
        txt('● 물관: 뿌리에서 흡수한 물이 올라가는 길', C.x + 18, C.y + 62 + hh + 8, { size: 15, weight: 800, color: '#1d6fa5' });
        txt('● 체관: 잎에서 만든 양분이 이동하는 길', C.x + 18, C.y + 62 + hh + 34, { size: 15, weight: 800, color: '#b45309' });
      }
    } else {
      txt('👆 잎의 층을 눌러 보세요', C.x + 16, C.y + 34, { size: 17, weight: 800, color: '#166534' });
      para('식물은 기능이 비슷한 여러 조직이 모인 \'조직계\'를 가지고 있어요.', C.x + 16, C.y + 64, C.w - 32, { size: 15, weight: 700, color: '#475569', lh: 21 });
    }
    txt('살펴본 조직계 ' + n + ' / 3', C.x + C.w - 14, C.y + C.h - 12, { size: 13.5, weight: 800, color: n === 3 ? '#15803d' : '#64748b', align: 'right' });
    drawFlowInset(Lc.flow, t, S.leafSel === 'vasc');
  }

  /* =========================================================
     ④ 동물과 식물 비교 (벤 다이어그램)
     ========================================================= */
  const VENN_DEF = [
    { key: 'cell', name: '세포', region: 'both' }, { key: 'tissue', name: '조직', region: 'both' },
    { key: 'tsys', name: '조직계', region: 'plant' }, { key: 'organ', name: '기관', region: 'both' },
    { key: 'osys', name: '기관계', region: 'animal' }, { key: 'body', name: '개체', region: 'both' },
  ];
  const VENN = { cards: shuffled(VENN_DEF.map((d, i) => i), 31).map((i, home) => mkCard(Object.assign({ home, at: null }, VENN_DEF[i]))), done: false, doneT: -9 };
  function vennTray(i) {
    const T = LAY.venn.tray, col = i % T.cols, row = Math.floor(i / T.cols);
    return { x: T.x0 + col * (T.w + (T.gapX != null ? T.gapX : T.gap)), y: T.y + row * (T.h + (T.gapY != null ? T.gapY : T.gap)), w: LAY.venn.cardW, h: LAY.venn.cardH };
  }
  function vennRegionAt(p) {
    const V = LAY.venn;
    const a = Math.hypot(p.x - V.c1.x, p.y - V.c1.y) <= V.c1.r, b = Math.hypot(p.x - V.c2.x, p.y - V.c2.y) <= V.c2.r;
    return a && b ? 'both' : a ? 'animal' : b ? 'plant' : null;
  }
  function vennTarget(cd) {
    const V = LAY.venn;
    if (!cd.at) return vennTray(cd.home);
    const list = VENN.cards.filter((c) => c.at === cd.at);
    const k = list.indexOf(cd), n = list.length;
    const cx = cd.at === 'animal' ? (V.c1.x - V.c1.r + (V.c2.x - V.c2.r)) / 2 : cd.at === 'plant' ? (V.c1.x + V.c1.r + (V.c2.x + V.c2.r)) / 2 : (V.c1.x + V.c2.x) / 2;
    const gap = Math.min(V.cardH + 12, ((V.c1.r * 1.5) - V.cardH) / Math.max(1, n - 1));
    const y0 = V.c1.y - ((n - 1) * gap) / 2 + 6;
    return { x: cx - V.cardW / 2, y: y0 + k * gap - V.cardH / 2, w: V.cardW, h: V.cardH };
  }
  function snapVenn(animate) { snapAll(VENN.cards, vennTarget, animate); }
  function resetVenn() { VENN.cards.forEach((c) => { c.at = null; c.ok = false; c.bad = -9; }); VENN.done = false; snapVenn(false); }
  function placeVenn(cd, region) {
    cd.at = region; cd.ok = false;
    raise(VENN.cards, cd);
    Sound.tick(); snapVenn(true);
  }
  function vennCheck() {
    const empty = VENN.cards.filter((c) => !c.at).length;
    if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요. 6장을 모두 놓아 주세요.';
    const wrong = VENN.cards.filter((c) => c.at !== c.region);
    if (wrong.length) {
      if (MANUAL) {
        const t = now();
        wrong.forEach((c) => { c.bad = t; });
        setTimeout(() => { wrong.forEach((c) => { c.at = null; }); snapVenn(true); }, 650);
      }
      const names = wrong.map((c) => c.name).join(', ');
      return '빨간 카드(' + names + ')가 알맞지 않아요. 동물의 단계와 식물의 단계를 떠올려 보세요. 앞에서 정리한 순서를 다시 볼 수도 있어요.';
    }
    if (MANUAL) {
      VENN.done = true; VENN.doneT = now();
      VENN.cards.forEach((c) => { c.ok = true; c.pop = now() + Math.random() * 0.3; });
      const V = LAY.venn;
      burst(V.c1.x, V.c1.y, null, 22); burst(V.c2.x, V.c2.y, null, 22);
    }
    return true;
  }
  function drawLevelCard(cd, t) {
    const lv = LV[cd.key];
    cardFrame(cd, t, lv.color, (w, h) => {
      ctx.fillStyle = lv.color; rr(7, 9, 6, h - 18, 3); ctx.fill();
      txt(cd.name, w / 2 + 4, h / 2 + 1, { size: 19, weight: 800, color: lv.color, align: 'center', base: 'middle', max: w - 30 });
    });
  }
  function drawVennScene(t) {
    const V = LAY.venn;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f4f4fb'); g.addColorStop(1, '#e8e9f6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawTabs();
    const hot = (() => { const d = S.drag; if (!d || d.set !== 'venn' || d.px == null) return null; return vennRegionAt({ x: d.px, y: d.py }); })();
    // 두 원
    ctx.save();
    ctx.fillStyle = 'rgba(244,114,150,.30)'; ctx.beginPath(); ctx.arc(V.c1.x, V.c1.y, V.c1.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(74,190,110,.30)'; ctx.beginPath(); ctx.arc(V.c2.x, V.c2.y, V.c2.r, 0, TAU); ctx.fill();
    ctx.restore();
    // 겹친 부분 (조금 더 진하게)
    ctx.save(); ctx.beginPath(); ctx.arc(V.c1.x, V.c1.y, V.c1.r, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(255,214,102,.5)'; ctx.beginPath(); ctx.arc(V.c2.x, V.c2.y, V.c2.r, 0, TAU); ctx.fill(); ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ec6a93'; ctx.beginPath(); ctx.arc(V.c1.x, V.c1.y, V.c1.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3fae66'; ctx.beginPath(); ctx.arc(V.c2.x, V.c2.y, V.c2.r, 0, TAU); ctx.stroke();
    if (hot) {
      ctx.save(); ctx.strokeStyle = 'rgba(22,163,74,.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      if (hot === 'animal') ctx.arc(V.c1.x, V.c1.y, V.c1.r - 6, 0, TAU);
      else if (hot === 'plant') ctx.arc(V.c2.x, V.c2.y, V.c2.r - 6, 0, TAU);
      else { ctx.arc(V.c1.x, V.c1.y, V.c1.r - 6, -1.0, 1.0); ctx.arc(V.c2.x, V.c2.y, V.c2.r - 6, Math.PI - 1.0, Math.PI + 1.0); }
      ctx.stroke(); ctx.restore();
    }
    // 이름
    const cxA = (V.c1.x - V.c1.r + V.c2.x - V.c2.r) / 2, cxB = (V.c1.x + V.c2.x) / 2, cxC = (V.c1.x + V.c1.r + V.c2.x + V.c2.r) / 2;
    const ty = V.c1.y - V.c1.r * 0.56, by = V.c1.y + V.c1.r * (TALL ? 0.78 : 0.82);
    pill('🐾 동물', cxA, ty, { size: 17, bg: '#ffe4e6', color: '#9f1239', pad: 14, h: 32, shadow: true });
    pill('🌿 식물', cxC, ty, { size: 17, bg: '#dcfce7', color: '#166534', pad: 14, h: 32, shadow: true });
    pill('동물에만', cxA, by, { size: 14, bg: '#fff', color: '#9f1239', border: '#f9a8c0', borderW: 1.5, pad: 10, h: 26 });
    pill('둘 다', cxB, by, { size: 14, bg: '#fff', color: '#3730a3', border: '#c7d2fe', borderW: 1.5, pad: 10, h: 26 });
    pill('식물에만', cxC, by, { size: 14, bg: '#fff', color: '#166534', border: '#a7e3bd', borderW: 1.5, pad: 10, h: 26 });
    if (!VENN.cards.every((c) => c.at)) txt('🃏 구성 단계 카드', TALL ? 12 : 16, V.tray.y - 12, { size: 13.5, weight: 800, color: '#64748b' });
    const dragCd = S.drag && S.drag.set === 'venn' ? S.drag.card : null;
    VENN.cards.forEach((cd) => { if (cd !== dragCd) drawLevelCard(cd, t); });
    if (dragCd) drawLevelCard(dragCd, t);
    if (isNew('compare')) newRing({ x: V.c1.x - V.c1.r, y: V.c1.y - V.c1.r, w: V.c2.x + V.c2.r - V.c1.x + V.c1.r, h: 2 * V.c1.r }, 20);
    if (VENN.done) {
      const age = now() - VENN.doneT, a = clamp((age - 0.4) / 0.5, 0, 1);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        const cy0 = TALL ? V.tray.y : V.tray.y - 6;
        panel(TALL ? 8 : 24, cy0, TALL ? 444 : 752, TALL ? 150 : 86, { bg: '#fff', border: '#c7d2fe', bw: 2 });
        const tx = TALL ? 22 : 40, ty = cy0 + (TALL ? 30 : 28), mw = TALL ? 416 : 720;
        para('공통: 세포 → 조직 → 기관 → 개체', tx, ty, mw, { size: TALL ? 15 : 17, weight: 800, color: '#3730a3', lh: 22 });
        para('동물에만 기관계가 있고, 식물에만 조직계가 있어요.', tx, ty + (TALL ? 28 : 30), mw, { size: TALL ? 15 : 17, weight: 800, color: '#1e293b', lh: 22 });
        ctx.restore();
      }
    }
  }

  /* =========================================================
     ④ 분류 게임 (예를 알맞은 구성 단계 상자에)
     ========================================================= */
  const GAME_BUCKETS = ['cell', 'tissue', 'tsys', 'organ', 'osys', 'body'];
  const GAME_DEF = [
    { name: '신경 세포', lv: 'cell', why: '신경 세포는 하나의 세포예요. (세포)' },
    { name: '근육 조직', lv: 'tissue', why: '근육 조직은 모양과 기능이 비슷한 근육 세포들의 모임이에요. (조직)' },
    { name: '관다발 조직계', lv: 'tsys', why: '관다발 조직계는 물관·체관 등이 모인 식물의 조직계예요. (조직계)' },
    { name: '심장', lv: 'organ', why: '심장은 여러 조직이 모여 일정한 모양과 기능을 갖춘 기관이에요. (기관)' },
    { name: '꽃', lv: 'organ', why: '꽃은 식물의 생식 기관이에요. (기관)' },
    { name: '소화계', lv: 'osys', why: '소화계는 위·간·작은창자 등 여러 기관이 모인 기관계예요. (기관계)' },
    { name: '호흡계', lv: 'osys', why: '호흡계는 코·기관·폐 등 여러 기관이 모인 기관계예요. (기관계)' },
    { name: '소나무', lv: 'body', why: '소나무는 하나의 식물 개체예요. (개체)' },
  ];
  const GAME = { cards: shuffled(GAME_DEF.map((d, i) => i), 77).map((i, home) => mkCard(Object.assign({ home, at: null }, GAME_DEF[i]))), done: false };
  function bucketRect(i) {
    const B = LAY.game.buckets, col = i % B.cols, row = Math.floor(i / B.cols);
    return { x: B.x0 + col * (B.w + B.gapX), y: B.y0 + row * (B.h + B.gapY), w: B.w, h: B.h };
  }
  function gameTray(i) {
    const T = LAY.game.tray, col = i % T.cols, row = Math.floor(i / T.cols);
    return { x: T.x0 + col * (T.w + T.gapX), y: T.y + row * (T.h + T.gapY), w: LAY.game.cardW, h: LAY.game.cardH };
  }
  function gameTarget(cd) {
    if (cd.at == null) return gameTray(cd.home);
    const bi = GAME_BUCKETS.indexOf(cd.at), r = bucketRect(bi);
    const list = GAME.cards.filter((c) => c.at === cd.at), k = list.indexOf(cd), n = list.length;
    const zoneTop = r.y + 40, zoneH = r.h - 46;
    const step = n <= 1 ? 0 : Math.min(LAY.game.cardH + 6, (zoneH - LAY.game.cardH) / (n - 1));
    return { x: r.x + (r.w - LAY.game.cardW) / 2, y: zoneTop + 2 + k * step, w: LAY.game.cardW, h: LAY.game.cardH };
  }
  function snapGame(animate) { snapAll(GAME.cards, gameTarget, animate); }
  function resetGame() { GAME.cards.forEach((c) => { c.at = null; c.ok = false; c.bad = -9; }); GAME.done = false; snapGame(false); }
  function bucketAt(p) { for (let i = 0; i < 6; i++) if (inR(p, bucketRect(i), 6)) return GAME_BUCKETS[i]; return null; }
  function placeGame(cd, b) { cd.at = b; cd.ok = false; raise(GAME.cards, cd); Sound.tick(); snapGame(true); }
  function gameCheck() {
    const empty = GAME.cards.filter((c) => !c.at).length;
    if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요. 8장을 모두 상자에 넣어 주세요.';
    const wrong = GAME.cards.filter((c) => c.at !== c.lv);
    if (wrong.length) {
      if (MANUAL) {
        const t = now();
        wrong.forEach((c) => { c.bad = t; });
        setTimeout(() => { wrong.forEach((c) => { c.at = null; }); snapGame(true); }, 650);
      }
      return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 💡 ' + wrong[0].why;
    }
    if (MANUAL) {
      GAME.done = true;
      GAME.cards.forEach((c) => { c.ok = true; c.pop = now() + Math.random() * 0.4; });
      GAME_BUCKETS.forEach((b, i) => { const r = bucketRect(i); burst(r.x + r.w / 2, r.y + r.h / 2, [LV[b].color, '#fff', '#fde047'], 10, { speed: 110 }); });
    }
    return true;
  }
  function drawGameCard(cd, t) {
    cardFrame(cd, t, '#94a3b8', (w, h) => {
      ctx.fillStyle = cd.ok ? '#22c55e' : '#94a3b8'; rr(7, 9, 5, h - 18, 2.5); ctx.fill();
      txt(cd.name, w / 2 + 3, h / 2 + 1, { size: 16, weight: 800, color: '#1e293b', align: 'center', base: 'middle', max: w - 28 });
    });
  }
  function drawGameScene(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f4f4fb'); g.addColorStop(1, '#e8e9f6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawTabs();
    const hot = (() => { const d = S.drag; if (!d || d.set !== 'game' || d.px == null) return null; return bucketAt({ x: d.px, y: d.py }); })();
    GAME_BUCKETS.forEach((b, i) => {
      const r = bucketRect(i), lv = LV[b];
      panel(r.x, r.y, r.w, r.h, { bg: lv.soft, border: hot === b ? '#16a34a' : rgba(lv.color, 0.45), bw: hot === b ? 3.5 : 1.8, r: 16 });
      pill(lv.name, r.x + 12, r.y + 21, { size: 15.5, align: 'left', bg: lv.color, color: '#fff', pad: 12, h: 28 });
      if (!TALL) txt('단계', r.x + r.w - 12, r.y + 25, { size: 12.5, weight: 700, color: rgba(lv.color, 0.7), align: 'right' });
      const has = GAME.cards.some((c) => c.at === b);
      if (!has) { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = rgba(lv.color, 0.4); ctx.lineWidth = 1.6; rr(r.x + 12, r.y + 44, r.w - 24, r.h - 56, 12); ctx.stroke(); ctx.restore(); }
    });
    if (!GAME.cards.every((c) => c.at)) txt('🃏 예 카드', TALL ? 12 : 16, LAY.game.tray.y - 12, { size: 13.5, weight: 800, color: '#64748b' });
    const dragCd = S.drag && S.drag.set === 'game' ? S.drag.card : null;
    GAME.cards.forEach((cd) => { if (cd !== dragCd) drawGameCard(cd, t); });
    if (dragCd) drawGameCard(dragCd, t);
  }

  /* =========================================================
     장면 전환 (확대해 들어가는 느낌)
     ========================================================= */
  const SCENE_LABEL = { zoom: '🔭 사람과 나무를 확대해 보기', animal: '🐾 동물의 구성 단계', plant: '🌿 식물의 구성 단계', compare: '⚖️ 동물과 식물 비교' };
  const SCENE_BG = {
    zoom: 'linear-gradient(180deg,#f1f6f3,#e0ebe6)', 'animal:chain': 'linear-gradient(180deg,#fbf3f1,#f4e6e4)', 'animal:organs': 'linear-gradient(180deg,#fbf3f1,#f4e6e4)',
    'plant:leaf': 'linear-gradient(180deg,#f1f8ee,#e2eedf)', 'plant:chain': 'linear-gradient(180deg,#f1f8ee,#e2eedf)',
    'compare:venn': 'linear-gradient(180deg,#f4f4fb,#e8e9f6)', 'compare:game': 'linear-gradient(180deg,#f4f4fb,#e8e9f6)',
  };
  let snapCv = null;
  function setView(scene, sub, instant) {
    const oldKey = viewKey();
    if (sub) S.sub[scene] = sub;
    const newScene = scene;
    const newKey = newScene === 'zoom' ? 'zoom' : newScene + ':' + S.sub[newScene];
    if (oldKey === newKey && S.scene === newScene) { updateSceneUI(); return; }
    if (!instant && !RM && view && view.canvas.width > 2) {
      if (!snapCv) snapCv = document.createElement('canvas');
      snapCv.width = view.canvas.width; snapCv.height = view.canvas.height;
      snapCv.getContext('2d').drawImage(view.canvas, 0, 0);
      S.snapOK = true;
    } else S.snapOK = false;
    S.prevKey = oldKey; S.scene = newScene; S.sceneT0 = now();
    S.drag = null; Z.dragging = null;
    updateSceneUI();
    hideHint();
  }
  function drawView(key, t) {
    if (key === 'zoom') drawZoomScene(t);
    else if (key === 'animal:chain' || key === 'plant:chain') drawChainScene(t);
    else if (key === 'animal:organs') drawOrgansScene(t);
    else if (key === 'plant:leaf') drawLeafScene(t);
    else if (key === 'compare:venn') drawVennScene(t);
    else drawGameScene(t);
  }
  function draw(t) {
    view.clear(BG);
    const key = viewKey();
    const p = S.snapOK ? clamp((now() - S.sceneT0) / 0.75, 0, 1) : 1;
    if (p < 1) {
      const fwd = VIEW_ORDER.indexOf(key) > VIEW_ORDER.indexOf(S.prevKey);
      const e = EASE.inOutCubic(p);
      const s1 = fwd ? 0.84 + 0.16 * EASE.outCubic(p) : 1.1 - 0.1 * EASE.outCubic(p);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s1, s1); ctx.translate(-W / 2, -H / 2);
      drawView(key, t);
      ctx.restore();
      const s0 = fwd ? 1 + 1.5 * e : 1 - 0.18 * e;
      ctx.save();
      ctx.globalAlpha = 1 - EASE.inQuad(p);
      ctx.translate(W / 2, H / 2); ctx.scale(s0, s0); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(snapCv, 0, 0, W, H);
      ctx.restore();
    } else { drawView(key, t); drawHint(); }
    PFX.draw(ctx);
  }

  /* ---- 안내 말풍선 (캔버스 안, 비어 있는 자리에) ---- */
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = now(); HINT.tEnd = now() + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg && HINT.tEnd > now()) HINT.tEnd = now(); }
  const HINT_KEY = { zoom: 'zoom', 'animal:chain': 'chain', 'plant:chain': 'chain', 'animal:organs': 'organs', 'plant:leaf': 'leaf', 'compare:venn': 'venn', 'compare:game': 'game' };
  function drawHint() {
    if (!HINT.msg) return;
    const hp = LAY[HINT_KEY[viewKey()]] && LAY[HINT_KEY[viewKey()]].hint;
    if (!hp) return;
    const t = now();
    const inA = clamp((t - HINT.t0) / 0.35, 0, 1);
    const a = Math.min(inA, clamp(1 - (t - HINT.tEnd) / 0.4, 0, 1));
    if (a <= 0.01) { if (t > HINT.tEnd + 0.5) HINT.msg = ''; return; }
    const size = 14, padX = 14, lh = 19;
    const ls = lines(HINT.msg, hp.maxW - padX * 2, size, 800);
    ctx.save();
    ctx.font = font(size, 800);
    let tw = 0; ls.forEach((ln) => { tw = Math.max(tw, ctx.measureText(ln).width); });
    const w = tw + padX * 2, h = ls.length * lh + 10;
    const x = hp.align === 'left' ? hp.x : hp.x - w / 2;
    const y = hp.y - h / 2 + (1 - EASE.outCubic(inA)) * 8;
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, Math.min(h / 2, 18)); ctx.fillStyle = 'rgba(27,35,51,.88)'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ls.forEach((ln, i) => txt(ln, x + w / 2, y + 5 + lh / 2 + i * lh, { size, weight: 800, color: '#fff', align: 'center', base: 'middle' }));
    ctx.restore();
  }

  /* =========================================================
     입력 (누르기 · 끌기)
     ========================================================= */
  function lensHit(p) { const l = LAY.zoom.lens; return Math.hypot(p.x - l.cx, p.y - l.cy) <= l.R + 4; }
  function ladderHit(p) { for (let i = 0; i < 5; i++) if (inR(p, ladderRect(i), 4)) return i; return -1; }
  function portalScreen(k) {
    const l = LAY.zoom.lens, P = PORTAL[CHAINS[Z.org][k].art], sU = l.R / 100;
    return { x: l.cx + P.x * sU, y: l.cy + P.y * sU, r: Math.max(26, P.r * sU) };
  }
  function zoomTo(v, silent) {
    v = clamp(v, 0, 4);
    if (Math.abs(v - Z.target) < 1e-6) return;
    Z.target = v;
    if (!silent) Sound.tone(420 + v * 90, 0.07, 'triangle', 0.05);
    hideHint();
  }
  const zoomBy = (d) => zoomTo(Math.round(Z.target) + d);
  function tabAtPoint(p) { return tabRects.find((r) => inR(p, r, 3)) || null; }
  function selectEx(kind, name) {
    S.exSel[kind] = S.exSel[kind] === name ? null : name; Sound.tick();
  }
  function startDrag(cd, set, list, p) {
    if (cd.tw) cd.tw.cancel();
    S.drag = { card: cd, set, list, dx: p.x - cd.x, dy: p.y - cd.y, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false };
    raise(list, cd); cd.ok = false;
    Sound.click();
    return true;
  }
  function interactiveAt(p) {
    const key = viewKey();
    if (tabAtPoint(p)) return true;
    if (key === 'zoom') return lensHit(p) || ladderHit(p) >= 0 || inC(p, LAY.zoom.out) || inC(p, LAY.zoom.inn);
    if (key.endsWith(':chain')) { const ch = chainOf(); return (!ch.done && !!cardAt(ch.cards, p)) || exRects.some((r) => inR(p, r)); }
    if (key === 'animal:organs') return !!organAt(p) || ORGAN_KEYS.some((k, i) => inR(p, organChip(i)));
    if (key === 'plant:leaf') return !!leafAt(p) || TSYS_KEYS.some((k, i) => inR(p, leafChip(i)));
    if (key === 'compare:venn') return !VENN.done && !!cardAt(VENN.cards, p);
    return !GAME.done && !!cardAt(GAME.cards, p);
  }
  const handlers = {
    hover(p) {
      const key = viewKey();
      if (tabAtPoint(p)) return 'pointer';
      if (key === 'zoom') return inC(p, LAY.zoom.out) || inC(p, LAY.zoom.inn) || ladderHit(p) >= 0 ? 'pointer' : lensHit(p) ? 'ns-resize' : null;
      if (key.endsWith(':chain')) { const ch = chainOf(); if (!ch.done && cardAt(ch.cards, p)) return 'grab'; return exRects.some((r) => inR(p, r)) ? 'pointer' : null; }
      if (key === 'animal:organs') return organAt(p) || ORGAN_KEYS.some((k, i) => inR(p, organChip(i))) ? 'pointer' : null;
      if (key === 'plant:leaf') return leafAt(p) || TSYS_KEYS.some((k, i) => inR(p, leafChip(i))) ? 'pointer' : null;
      if (key === 'compare:venn') return !VENN.done && cardAt(VENN.cards, p) ? 'grab' : null;
      return !GAME.done && cardAt(GAME.cards, p) ? 'grab' : null;
    },
    down(p) {
      hideHint();
      const tab = tabAtPoint(p);
      if (tab) { Sound.click(); setView(S.scene, tab.key); return false; }
      const key = viewKey();
      if (key === 'zoom') {
        if (inC(p, LAY.zoom.out, 4)) { zoomBy(-1); return false; }
        if (inC(p, LAY.zoom.inn, 4)) { zoomBy(1); return false; }
        const li = ladderHit(p);
        if (li >= 0) { zoomTo(li); return false; }
        if (lensHit(p)) { Z.dragging = { y0: p.y, z0: Z.target, moved: false, p0: p }; return true; }
        return false;
      }
      if (key.endsWith(':chain')) {
        const ch = chainOf();
        const ex = exRects.find((r) => inR(p, r, 2));
        if (ch.done && ex) { selectEx(ch.kind, ex.name); return false; }
        if (!ch.done) { const cd = cardAt(ch.cards, p); if (cd) return startDrag(cd, 'chain', ch.cards, p); }
        return false;
      }
      if (key === 'animal:organs') {
        const i = ORGAN_KEYS.findIndex((k, j) => inR(p, organChip(j)));
        const k = i >= 0 ? ORGAN_KEYS[i] : organAt(p);
        if (k) { selectOrgan(k); burstAtOrgan(k); }
        return false;
      }
      if (key === 'plant:leaf') {
        const i = TSYS_KEYS.findIndex((k, j) => inR(p, leafChip(j)));
        const k = i >= 0 ? TSYS_KEYS[i] : leafAt(p);
        if (k) { selectLeaf(k); burst(p.x, p.y, [TSYS[k].color, '#ffffff', '#fde047'], 10, { speed: 110 }); }
        return false;
      }
      if (key === 'compare:venn') { if (!VENN.done) { const cd = cardAt(VENN.cards, p); if (cd) return startDrag(cd, 'venn', VENN.cards, p); } return false; }
      if (!GAME.done) { const cd = cardAt(GAME.cards, p); if (cd) return startDrag(cd, 'game', GAME.cards, p); }
      return false;
    },
    move(p) {
      if (Z.dragging) {
        const d = Z.dragging;
        if (Math.abs(p.y - d.y0) > 8) d.moved = true;
        if (d.moved) { Z.target = clamp(d.z0 - (p.y - d.y0) / 120, 0, 4); }
        return;
      }
      const d = S.drag;
      if (!d) return;
      d.card.x = p.x - d.dx; d.card.y = p.y - d.dy;
      d.px = p.x; d.py = p.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
    },
    up(p) {
      if (Z.dragging) {
        const d = Z.dragging; Z.dragging = null;
        if (d.moved) { Z.target = Math.round(Z.target); Sound.tick(); }
        else {
          const k = Math.round(Z.target);
          if (k < 4) { const ps = portalScreen(k); if (Math.hypot(p.x - ps.x, p.y - ps.y) <= ps.r + 12) zoomBy(1); else Sound.tick(); }
        }
        return;
      }
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      const cd = d.card;
      if (d.set === 'chain') {
        const ch = chainOf(), slot = chainSlotAt(p);
        if (slot >= 0) placeInSlot(ch, cd, slot);
        else { if (cd.slot >= 0) cd.slot = -1; snapChain(ch.kind, true); if (d.moved) Sound.tick(); }
      } else if (d.set === 'venn') {
        const r = vennRegionAt(p);
        if (r) placeVenn(cd, r); else { cd.at = null; snapVenn(true); if (d.moved) Sound.tick(); }
      } else {
        const b = bucketAt(p);
        if (b) placeGame(cd, b); else { cd.at = null; snapGame(true); if (d.moved) Sound.tick(); }
      }
    },
  };
  function burstAtOrgan(k) {
    const L = LAY.organs.fig, a = ORGAN_LABEL[k];
    burst(L.cx + a[0] * L.s, L.cy + a[1] * L.s, ['#e0457b', '#fda4c0', '#ffffff'], 10, { speed: 100 });
  }

  /* =========================================================
     HTML 조작
     ========================================================= */
  const orgBtns = $$('#orgSeg button');
  function setOrg(org) {
    if (Z.org === org) return;
    Z.prevOrg = Z.org; Z.org = org; Z.orgT0 = now();
    orgBtns.forEach((b) => b.classList.toggle('on', b.dataset.org === org));
    Z.z = 0; Z.target = 0; Z.cur = 0; Z.labFrom = 0; Z.labT0 = -9;     // 생물을 바꾸면 처음(개체)부터
    Sound.tone(480, 0.06, 'square', 0.03); Sound.tone(640, 0.06, 'square', 0.03, 0.08);
  }
  orgBtns.forEach((b) => b.addEventListener('click', () => setOrg(b.dataset.org)));
  const sZoom = $('#sZoom');
  const rZoom = SciSim.bindRange(sZoom, null, null, (v) => { Z.target = v; hideHint(); });
  sZoom.addEventListener('pointerdown', () => { Z.sliderActive = true; });
  const sliderEnd = () => { if (Z.sliderActive) { Z.sliderActive = false; Z.target = Math.round(Z.target); Sound.tick(); } };
  sZoom.addEventListener('pointerup', sliderEnd); sZoom.addEventListener('pointercancel', sliderEnd);
  sZoom.addEventListener('change', () => { Z.target = Math.round(Z.target); Z.sliderActive = false; });
  sZoom.addEventListener('keydown', () => { Z.sliderActive = true; });
  sZoom.addEventListener('keyup', () => { Z.sliderActive = false; Z.target = Math.round(Z.target); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.scene); }));
  function updateSceneUI() {
    if (view) view.wrap.style.setProperty('--stage-bg', SCENE_BG[viewKey()]);
    $$('#sceneSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.scene === S.scene); b.setAttribute('aria-selected', b.dataset.scene === S.scene ? 'true' : 'false'); });
    $('#ctrlCard').hidden = S.scene !== 'zoom';
    const seg = $('#sceneSeg');
    $('#sceneLabel').hidden = !!(seg && !seg.hidden);
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene];
  }

  /* =========================================================
     상태 갱신
     ========================================================= */
  const oZoom = $('#oZoom');
  let oZoomTxt = '';
  function update(dt, t) {
    Z.z = SciSim.approach(Z.z, Z.target, dt, RM ? 60 : (Z.dragging || Z.sliderActive ? 16 : 6.5));
    if (Math.abs(Z.z - Z.target) < 0.0015) Z.z = Z.target;
    const cur = Math.round(Z.z);
    if (cur !== Z.cur) { Z.labFrom = Z.cur; Z.cur = cur; Z.labT0 = now(); if (!RM) Sound.tick(); }
    if (!Z.sliderActive && Math.abs(+sZoom.value - Z.z) > 0.004) rZoom.set(Z.z);
    const nm = LV[CHAINS[Z.org][cur].lv].name;
    if (nm !== oZoomTxt) { oZoom.textContent = nm; oZoomTxt = nm; }
    if (Math.abs(Z.z - 4) < 0.03) Z.reached[Z.org] = true;
    [CHAIN.animal.cards, CHAIN.plant.cards, VENN.cards, GAME.cards].forEach((list) => list.forEach((cd) => {
      const target = S.drag && S.drag.card === cd ? 1 : 0;
      cd.lift = SciSim.approach(cd.lift, target, dt, 14);
    }));
    PFX.update(dt);
  }

  /* =========================================================
     단계와 미션
     ========================================================= */
  const mark = (ok) => (ok ? '✅' : '⬜');
  function resetZoom() {
    Z.target = 0; Z.reached = { human: false, tree: false };
    if (Z.org !== 'human') setOrg('human');
  }
  const placedN = (list, key) => list.filter((c) => (key === 'slot' ? c.slot >= 0 : !!c.at)).length;
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '확대하며 구성 단계 살펴보기', short: '확대 탐험', icon: '🔭', phase: '관찰',
      features: ['zoom'],
      intro: '<p class="si-q">❓ 탐구 질문: 수많은 세포는 어떻게 모여 하나의 생물이 될까?</p>' +
        '<p><b>사람</b>과 <b>나무</b>를 <b>개체</b>에서 <b>세포</b>까지 한 단계씩 확대하면서, 생물의 몸이 어떤 단계로 이루어져 있는지 관찰해요.</p>',
      setup() { setView('zoom', null, true); resetZoom(); },
      recap: '사람과 나무를 끝까지 확대하면 모두 가장 작은 단계인 <b>세포</b>가 나와요.',
      summary: '<ul><li>생물의 몸은 여러 <b>구성 단계</b>로 이루어져 있다.</li>' +
        '<li>확대해 보면 사람은 <b>개체 → 기관계 → 기관 → 조직 → 세포</b>, 나무는 <b>개체 → 기관 → 조직계 → 조직 → 세포</b> 순서로 나타났다.</li>' +
        '<li>가장 작은 단계는 <b>세포</b>이다. 모든 생물은 세포로 이루어져 있다.</li></ul>',
      missions: [
        {
          title: '세포 단계까지 확대하기',
          goal: '<b>사람</b>과 <b>나무</b>를 각각 <b>세포</b> 단계까지 확대해 보세요. 단계가 바뀔 때 나타나는 이름을 잘 살펴봐요.',
          hint: '슬라이더를 오른쪽 끝까지 밀거나, 그림 속 반짝이는 동그라미를 눌러요. 나무로 바꾸려면 \'🌳 나무\' 단추를 눌러요.',
          setup() { setView('zoom'); resetZoom(); showHint('✨ 반짝이는 동그라미를 누르거나 슬라이더를 밀어 보세요', 6500); },
          check: () => Z.reached.human && Z.reached.tree,
          hold: 0.7,
          status: () => mark(Z.reached.human) + ' 사람 · ' + mark(Z.reached.tree) + ' 나무 · 지금 <b>' + LV[CHAINS[Z.org][Z.cur].lv].name + '</b> 단계',
          explain: '사람은 <b>개체 → 기관계 → 기관 → 조직 → 세포</b>, 나무는 <b>개체 → 기관 → 조직계 → 조직 → 세포</b> 순서로 이루어져 있어요. 두 생물 모두 가장 작은 단계는 <b>세포</b>예요.',
        },
        {
          type: 'quiz',
          title: '가장 작은 구성 단계',
          goal: '사람과 나무를 끝까지 확대했을 때, <b>둘 다</b>에서 만난 가장 작은 단계는 무엇일까요?',
          setup() { setView('zoom'); },
          choices: ['조직', '기관', '세포', '기관계'],
          answer: 2,
          feedback: [
            '조직도 더 확대하면 작은 방 같은 세포로 나뉘었어요.',
            '기관은 여러 조직이 모인 큰 단계예요. 기관 안에 더 작은 단계가 있었어요.',
            '',
            '기관계는 여러 기관이 모인 큰 단계예요. (나무에서는 기관계가 나타나지 않았지요?)',
          ],
          explain: '사람도 나무도 끝까지 확대하면 <b>세포</b>가 나와요. 세포는 생물의 몸을 이루는 가장 작은 단계이고, 모든 생물은 세포로 이루어져 있어요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '동물의 구성 단계', short: '동물', icon: '🐾', phase: '탐구',
      features: ['animal'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사람을 확대하며 개체 · 기관계 · 기관 · 조직 · 세포를 차례로 만났어요.</div>' +
        '<p>이번에는 동물(사람)의 구성 단계를 <b>작은 것부터 큰 것</b>의 순서로 정리해 봐요. 무엇이 모여 무엇이 되는지 생각하며 카드를 맞춰 보세요.</p>',
      setup() { setView('animal', 'chain', true); },
      recap: '동물은 <b>세포 → 조직 → 기관 → 기관계 → 개체</b>의 단계로 이루어져 있어요.',
      summary: '<ul><li>동물의 구성 단계: <b>세포 → 조직 → 기관 → 기관계 → 개체</b></li>' +
        '<li><b>조직</b>: 모양과 기능이 비슷한 세포들의 모임 (상피 조직, 근육 조직, 신경 조직, 결합 조직)</li>' +
        '<li><b>기관</b>: 여러 조직이 모여 고유한 모양과 기능을 갖춘 것 (위, 심장, 폐 등)</li>' +
        '<li><b>기관계</b>: 관련된 기능을 하는 여러 기관의 모임 (소화계, 순환계, 호흡계, 배설계, 신경계)</li></ul>',
      missions: [
        {
          title: '구성 단계 순서 맞추기',
          manual: true,
          goal: '카드 5장을 <b>작은 것부터 큰 것</b> 순서로 칸에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '무엇이 모여 무엇이 될까요? 근육 세포가 모여 근육 조직, 조직이 모여 위 같은 기관, 기관이 모여 소화계, 여러 기관계가 모여 사람이 돼요.',
          setup() { setView('animal', 'chain'); resetChain('animal'); showHint('🃏 카드를 끌어 작은 것부터 순서대로 놓아요', 6000); },
          status: () => '놓은 카드: <b>' + placedN(CHAIN.animal.cards, 'slot') + ' / 5</b>',
          check() { return chainCheck('animal'); },
          explain: '작은 것이 모여 더 큰 것이 돼요. <b>세포 → 조직 → 기관 → 기관계 → 개체</b> 순서예요. 조직의 종류에는 상피·근육·신경·결합 조직이 있고, 기관계에는 소화계·순환계·호흡계·배설계·신경계가 있어요.',
        },
        {
          title: '소화계를 이루는 기관 살펴보기',
          goal: '소화계 그림에서 <b>기관 5가지</b>를 모두 눌러 보세요. 여러 기관이 모여 소화계가 돼요.',
          hint: '그림 속 위·간·식도·창자를 누르거나, 오른쪽 단추를 눌러도 돼요.',
          setup() { setView('animal', 'organs'); S.organSeen = {}; S.organSel = null; showHint('👆 소화계의 기관을 눌러 보세요', 5500); },
          check: () => ORGAN_KEYS.every((k) => S.organSeen[k]),
          hold: 0.5,
          status: () => ORGAN_KEYS.map((k) => mark(!!S.organSeen[k]) + ' ' + ORGANS[k].name).join(' · '),
          explain: '소화계는 식도, 위, 간, 작은창자, 큰창자 같은 여러 <b>기관</b>이 함께 일하는 <b>기관계</b>예요. 위처럼 기관 하나하나는 여러 조직으로 이루어져 있어요.',
        },
        {
          type: 'quiz',
          title: '심장은 어느 단계?',
          goal: '다음 중 <b>심장</b>은 어느 구성 단계에 해당할까요?',
          setup() { setView('animal', 'chain'); },
          choices: ['세포', '조직', '기관', '기관계'],
          answer: 2,
          feedback: [
            '심장은 세포 하나가 아니에요. 근육 세포를 비롯한 많은 세포가 모여 있어요.',
            '심장은 근육 조직, 결합 조직 등 여러 조직이 모여 이루어져 있어요. 조직보다 큰 단계예요.',
            '',
            '혈액을 순환시키는 순환계는 심장과 혈관 등이 모인 기관계예요. 심장은 그 일부인 기관이에요.',
          ],
          explain: '<b>기관</b>은 여러 조직이 모여 고유한 모양과 기능을 갖춘 단계예요. 심장은 순환계를 이루는 기관이고, 위는 소화계를 이루는 기관이에요.',
        },
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '식물의 구성 단계', short: '식물', icon: '🌿', phase: '모형',
      features: ['plant'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 동물은 세포 → 조직 → 기관 → 기관계 → 개체의 단계로 이루어진다는 것을 알았어요.</div>' +
        '<p>식물도 똑같을까요? 나무를 확대했을 때 <b>기관계</b>는 보이지 않았어요. 잎의 단면을 살펴보고, 식물의 구성 단계를 순서대로 맞춰 봐요.</p>',
      setup() { setView('plant', 'leaf', true); },
      recap: '식물은 <b>세포 → 조직 → 조직계 → 기관 → 개체</b>의 단계로 이루어져요. 식물에는 기관계가 없고 <b>조직계</b>가 있어요.',
      summary: '<ul><li>식물의 구성 단계: <b>세포 → 조직 → 조직계 → 기관 → 개체</b></li>' +
        '<li><b>조직계</b>: 기능이 비슷한 여러 조직의 모임 — 표피 조직계(표면 보호), 관다발 조직계(물관: 물, 체관: 양분의 이동 통로), 기본 조직계(광합성·저장·지지)</li>' +
        '<li><b>기관</b>: 뿌리·줄기·잎(영양 기관), 꽃·열매(생식 기관)</li>' +
        '<li>식물에는 <b>기관계가 없다</b>.</li></ul>',
      missions: [
        {
          title: '잎의 조직계 살펴보기',
          goal: '잎의 단면에서 <b>조직계 3가지</b>를 모두 눌러 보세요. <b>관다발 조직계</b>의 물관과 체관을 잘 살펴봐요.',
          hint: '그림의 위아래 겉 부분, 초록색 가운데 부분, 작은 동그라미 모양의 관을 눌러 봐요. 아래 단추를 눌러도 돼요.',
          setup() { setView('plant', 'leaf'); S.leafSeen = {}; S.leafSel = null; showHint('👆 잎의 단면을 눌러 보세요', 5500); },
          check: () => TSYS_KEYS.every((k) => S.leafSeen[k]),
          hold: 0.5,
          status: () => TSYS_KEYS.map((k) => mark(!!S.leafSeen[k]) + ' ' + TSYS[k].name).join('<br>'),
          explain: '식물의 잎에는 겉을 덮는 <b>표피 조직계</b>, 광합성이 일어나는 <b>기본 조직계</b>, 물과 양분이 이동하는 <b>관다발 조직계</b>가 있어요. 관다발 조직계에서 <b>물관</b>은 물이, <b>체관</b>은 양분이 지나가는 길이에요.',
        },
        {
          title: '식물의 구성 단계 순서 맞추기',
          manual: true,
          goal: '카드 5장을 <b>작은 것부터 큰 것</b> 순서로 칸에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '표피 세포가 모여 표피 조직, 표피 조직이 모여 표피 조직계가 돼요. 조직계들이 모여 잎 같은 기관이 되고, 기관이 모여 나무가 돼요.',
          setup() { setView('plant', 'chain'); resetChain('plant'); showHint('🃏 카드를 끌어 작은 것부터 순서대로 놓아요', 6000); },
          status: () => '놓은 카드: <b>' + placedN(CHAIN.plant.cards, 'slot') + ' / 5</b>',
          check() { return chainCheck('plant'); },
          explain: '식물은 <b>세포 → 조직 → 조직계 → 기관 → 개체</b> 순서예요. 동물과 달리 조직과 기관 사이에 <b>조직계</b>가 있고, 기관계는 없어요. 식물의 기관에는 뿌리·줄기·잎(영양 기관)과 꽃·열매(생식 기관)가 있어요.',
        },
        {
          type: 'quiz',
          title: '식물의 구성 단계',
          goal: '식물의 구성 단계에 대한 설명으로 <b>옳은</b> 것은?',
          setup() { setView('plant', 'chain'); },
          choices: [
            '식물에도 동물처럼 기관계가 있다',
            '식물의 구성 단계는 세포 → 조직 → 조직계 → 기관 → 개체이다',
            '식물에는 조직이 없고 조직계만 있다',
            '잎은 조직계에 해당한다',
          ],
          answer: 1,
          feedback: [
            '식물에는 기관계가 없어요. 식물에는 기관계 대신 조직계가 있어요.',
            '',
            '세포가 모여 조직이 되고, 조직이 모여 조직계가 돼요. 식물에도 조직이 있어요.',
            '잎은 여러 조직계가 모여 이루어진 기관이에요.',
          ],
          explain: '식물에는 <b>기관계가 없고</b>, 조직과 기관 사이에 <b>조직계</b>가 있어요. 표피·관다발·기본 조직계가 모여 잎, 줄기, 뿌리 같은 기관을 이루어요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '동물과 식물 비교하기', short: '비교', icon: '⚖️', phase: '적용',
      features: ['compare'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 동물과 식물의 구성 단계를 각각 알아보았어요.</div>' +
        '<p>이제 둘을 <b>비교</b>해 봐요. 어떤 단계는 같고, 어떤 단계는 다를까요? 여러 가지 예가 어느 단계인지도 분류해 봐요.</p>',
      setup() { setView('compare', 'venn', true); },
      recap: '<b>세포·조직·기관·개체</b>는 동물과 식물에 모두 있고, <b>기관계는 동물에만</b>, <b>조직계는 식물에만</b> 있어요.',
      summary: '<ul><li>동물과 식물에 모두 있는 단계: <b>세포 → 조직 → 기관 → 개체</b></li>' +
        '<li>동물에만 있는 단계: <b>기관계</b> (소화계, 순환계, 호흡계 등)</li>' +
        '<li>식물에만 있는 단계: <b>조직계</b> (표피 조직계, 관다발 조직계, 기본 조직계)</li></ul>',
      missions: [
        {
          title: '동물과 식물의 단계 비교하기',
          manual: true,
          goal: '구성 단계 카드 6장을 <b>동물에만</b> 있는지, <b>식물에만</b> 있는지, <b>둘 다</b> 있는지 알맞은 곳에 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '동물은 세포 → 조직 → 기관 → 기관계 → 개체, 식물은 세포 → 조직 → 조직계 → 기관 → 개체였어요. 두 줄을 비교해 보세요.',
          setup() { setView('compare', 'venn'); resetVenn(); showHint('🃏 카드를 알맞은 곳으로 끌어 보세요', 6000); },
          status: () => '놓은 카드: <b>' + placedN(VENN.cards, 'at') + ' / 6</b>',
          check() { return vennCheck(); },
          explain: '<b>세포 · 조직 · 기관 · 개체</b>는 동물과 식물에 모두 있어요. <b>기관계</b>는 동물에만, <b>조직계</b>는 식물에만 있는 단계예요.',
        },
        {
          title: '예를 알맞은 단계에 넣기',
          manual: true,
          goal: '예 카드 8장을 알맞은 <b>구성 단계 상자</b>에 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드가 하나의 세포인지, 조직인지, 여러 조직이 모인 기관인지 생각해 봐요. 이름에 \'계\'가 붙은 것도 구별해 보세요.',
          setup() { setView('compare', 'game'); resetGame(); showHint('🃏 예 카드를 알맞은 상자로 끌어 보세요', 6000); },
          status: () => '놓은 카드: <b>' + placedN(GAME.cards, 'at') + ' / 8</b>',
          check() { return gameCheck(); },
          explain: '신경 세포는 <b>세포</b>, 근육 조직은 <b>조직</b>, 관다발 조직계는 <b>조직계</b>, 심장과 꽃은 <b>기관</b>, 소화계와 호흡계는 <b>기관계</b>, 소나무는 <b>개체</b>예요.',
        },
        {
          type: 'quiz',
          title: '잎과 심장은 같은 단계?',
          goal: '식물의 <b>잎</b>과 동물의 <b>심장</b>이 공통으로 속하는 구성 단계는 무엇일까요?',
          setup() { setView('compare', 'venn'); },
          choices: ['조직계', '기관', '기관계', '조직'],
          answer: 1,
          feedback: [
            '조직계는 식물에만 있는 단계예요. 심장은 동물의 기관이에요.',
            '',
            '기관계는 동물에만 있는 단계예요. 식물의 잎은 기관이에요.',
            '잎과 심장은 여러 조직이 모인, 조직보다 큰 단계예요.',
          ],
          explain: '식물의 뿌리·줄기·잎·꽃·열매와 동물의 위·심장·폐는 모두 <b>기관</b>이에요. 기관은 동물과 식물에 공통으로 있는 단계예요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (kind === KIND) return;
    let cv = $('#cv');
    if (view) {
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    KIND = kind; TALL = kind === 'tall';
    W = LAYOUTS[kind].w; H = LAYOUTS[kind].h;
    LAY = computeLayouts();
    S.drag = null; Z.dragging = null; S.snapOK = false;
    view = SciSim.stage(cv, { width: W, height: H, background: BG });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (TALL) {
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && interactiveAt(view.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
    lineCache.clear();
    snapChain('animal', false); snapChain('plant', false); snapVenn(false); snapGame(false);
    updateSceneUI();
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }

  game = SciSim.game({
    simId: 'm1-organization',
    mount: '#game',
    badge: '구성 단계 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      zoom: '🔭 확대 렌즈 · 확대 슬라이더',
      animal: '🐾 동물의 구성 단계 · 소화계',
      plant: '🌿 식물의 구성 단계 · 잎의 단면',
      compare: '⚖️ 동물·식물 비교판 · 분류 게임',
    },
    onFeatures(set) { F = new Set(set); updateSceneUI(); },
    onMissionStart() { hideHint(); },
    onComplete() { updateSceneUI(); },
    levels,
  });
  updateSceneUI();

  // 테스트·점검용
  window.__sim = {
    S, Z, CHAIN, VENN, GAME, game, setView, setOrg, LAY: () => LAY, KIND: () => KIND, PORTAL, CHAINS,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    lensPoint() { const l = LAY.zoom.lens; return this.toClient(l.cx, l.cy); },
    portalPoint(k) { const ps = portalScreen(k); return this.toClient(ps.x, ps.y); },
    zoomBtn(which) { const b = which === 'in' ? LAY.zoom.inn : LAY.zoom.out; return this.toClient(b.x, b.y); },
    ladderPoint(i) { const r = ladderRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    tabPoint(key) { const r = tabRects.find((q) => q.key === key); return r ? this.toClient(r.x + r.w / 2, r.y + r.h / 2) : null; },
    cardPoint(kind, idx) { const cd = CHAIN[kind].cards.find((c) => c.idx === idx); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    slotPoint(i) { const r = slotRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    exPoint(name) { const r = exRects.find((q) => q.name === name); return r ? this.toClient(r.x + r.w / 2, r.y + r.h / 2) : null; },
    organPoint(key) {
      const L = LAY.organs.fig, a = { stom: [36, -26], liver: [-34, -38], eso: [1, -76], small: [0, 35.5], large: [45, 50] }[key];
      return this.toClient(L.cx + a[0] * L.s, L.cy + a[1] * L.s);
    },
    organChipPoint(i) { const r = organChip(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    leafPoint(key) {
      const L = LAY.leaf.fig, a = { epi: [-30, -49], base: [50, -20], vasc: [-8, -6] }[key];
      return this.toClient(L.cx + a[0] * L.s, L.cy + 5 * L.s + a[1] * L.s);
    },
    leafChipPoint(i) { const r = leafChip(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    vennCardPoint(key) { const cd = VENN.cards.find((c) => c.key === key); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    vennRegionPoint(region) {
      const V = LAY.venn;
      const x = region === 'animal' ? (V.c1.x - V.c1.r + V.c2.x - V.c2.r) / 2 : region === 'plant' ? (V.c1.x + V.c1.r + V.c2.x + V.c2.r) / 2 : (V.c1.x + V.c2.x) / 2;
      return this.toClient(x, V.c1.y);
    },
    gameCardPoint(name) { const cd = GAME.cards.find((c) => c.name === name); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    bucketPoint(lv) { const r = bucketRect(GAME_BUCKETS.indexOf(lv)); return this.toClient(r.x + r.w / 2, r.y + r.h - 24); },
    GAME_DEF, VENN_DEF, ORGAN_KEYS, TSYS_KEYS,
  };

  SciSim.loop((dt, t) => {
    update(dt, t);
    draw(t);
  });
})();
