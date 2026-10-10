/* =========================================================
   중1 Ⅱ. 생물의 구성과 다양성 — 세포의 구조와 기능 [9과02-01]
   ① [관찰] 현미경: 양파 표피·입안 상피 (배율 40·100·400배, 조동·미동 나사, 염색 → 핵)
   ② [탐구] 세포 구조: 식물 세포·동물 세포 모형에서 구조 찾기
   ③ [설명] 구조와 기능: 핵·세포막·세포벽·엽록체·미토콘드리아가 하는 일 (기능 애니메이션)
   ④ [적용] 모양과 기능: 적혈구·신경세포·상피세포
   ※ 범위(해설): 세포 구조는 세포벽, 세포막, 핵, 엽록체, 미토콘드리아만 다룸
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;

  // 고정 시드 난수 (표본 모양이 매번 같도록)
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

  /* =========================================================
     무대: 태블릿 = 가로형 800×640, 휴대폰 = 세로형 460×1000
     ========================================================= */
  const LAYOUTS = { wide: { w: 800, h: 640 }, tall: { w: 460, h: 1000 } };
  const BG = '#eef4ef';
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, W = 800, H = 640, TALL = false, KIND = '';
  let LAY = null;

  function computeLayouts() {
    if (!TALL) {
      return {
        scope: {
          view: { cx: 580, cy: 262, r: 196 }, focusY: 40, capY: 486,
          mic: { x: 186, y: 616, s: 1.16 },
          tray: { x: 380, y: 512, w: 408, h: 118, dir: 'row' },
          hint: { x: 190, y: 34, maxW: 340 },
        },
        model: { cells: [{ kind: 'plant', cx: 205, cy: 350, sc: 1.05 }, { kind: 'animal', cx: 600, cy: 350, sc: 1.05 }], titleY: 168, hint: { x: 400, y: 22, maxW: 720 } },
        func: {
          cell: { cx: 210, cy: 300, sc: 1.06 },
          cap: { x: 12, y: 516, w: 396, h: 114 },
          table: { x: 420, y: 12, w: 368, rowH: 64, gap: 8, nameW: 126, rowHBig: 98, gapBig: 12 },
          tray: { x: 420, y: 392, w: 368, cols: 2, cardH: 60, gap: 8 },
          hint: { x: 200, y: 40, maxW: 380 },
        },
        shape: {
          rows: [0, 1, 2].map((i) => ({ x: 12, y: 8 + i * 172, w: 530, h: 164 })),
          slots: [0, 1, 2].map((i) => ({ x: 554, y: 8 + i * 172, w: 234, h: 164 })),
          tray: { x: 12, y: 562, w: 776, cols: 3, cardH: 64, gap: 10 },
          hint: { x: 132, y: 548, maxW: 640, align: 'left' },
        },
      };
    }
    return {
      scope: {
        view: { cx: 230, cy: 214, r: 198 }, focusY: 0, capY: 440,
        mic: { x: 166, y: 984, s: 0.97 },
        tray: { x: 292, y: 478, w: 160, h: 506, dir: 'col' },
        hint: { x: 150, y: 492, maxW: 276 },
      },
      model: { cells: [{ kind: 'plant', cx: 230, cy: 262, sc: 0.98 }, { kind: 'animal', cx: 230, cy: 742, sc: 0.98 }], titleY: 40, titleY2: 530, hint: { x: 230, y: 482, maxW: 430 } },
      func: {
        cell: { cx: 230, cy: 280, sc: 0.98 },
        cap: { x: 10, y: 482, w: 440, h: 96 },
        table: { x: 10, y: 588, w: 440, rowH: 56, gap: 6, nameW: 128 },
        tray: { x: 10, y: 898, w: 440, cols: 2, cardH: 46, gap: 6 },
        hint: { x: 230, y: 40, maxW: 430 },
      },
      shape: {
        rows: [0, 1, 2].map((i) => ({ x: 10, y: 8 + i * 248, w: 440, h: 168 })),
        slots: [0, 1, 2].map((i) => ({ x: 10, y: 8 + i * 248 + 174, w: 440, h: 64 })),
        tray: { x: 10, y: 780, w: 440, cols: 1, cardH: 62, gap: 8 },
        hint: { x: 132, y: 764, maxW: 320, align: 'left' },
      },
    };
  }

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
        while (ctx.measureText(cur).width > maxW && cur.length > 1) {   // 아주 긴 낱말은 글자 단위로 자름
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
  // 여러 줄 글: 높이를 돌려줌
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
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n) { PFX.burst(x, y, { count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }); }

  /* =========================================================
     세포 구조 정보 (교육과정 범위: 5가지)
     ========================================================= */
  const ST = {
    wall: { name: '세포벽', ga: '이', color: '#6f8a1f', soft: '#eef4d4', card: '세포를 보호하고 모양을 유지해요',
      fn: '세포막 바깥의 단단한 벽이에요. 세포를 보호하고 모양을 일정하게 유지해요.' },
    memb: { name: '세포막', ga: '이', color: '#b7791f', soft: '#fff3d6', card: '세포 안팎으로 물질의 출입을 조절해요',
      fn: '세포를 둘러싼 얇은 막이에요. 세포 안팎으로 물질이 드나드는 것을 조절해요.' },
    nuc: { name: '핵', ga: '이', color: '#6a43c2', soft: '#efe8fc', card: '유전 물질이 있어 생명 활동을 조절해요',
      fn: '유전 물질이 들어 있어 세포의 생명 활동을 조절해요.' },
    chl: { name: '엽록체', ga: '가', color: '#23843a', soft: '#e3f5e1', card: '광합성을 하여 양분을 만들어요',
      fn: '빛을 받아 광합성을 하여 양분을 만들어요.' },
    mito: { name: '미토콘드리아', ga: '가', color: '#cc4b25', soft: '#fde8df', card: '양분을 분해하여 에너지를 얻어요',
      fn: '양분을 분해하여 생명 활동에 필요한 에너지를 얻어요.' },
  };
  const KEYS = ['wall', 'memb', 'nuc', 'chl', 'mito'];
  const ANIMAL_KEYS = ['memb', 'nuc', 'mito'];

  /* =========================================================
     상태
     ========================================================= */
  const Z_STAR = 23.4;                 // 초점이 맞는 재물대 높이 (조동 23 + 미동 +4 근처)
  const OBJ = [
    { mag: 4, total: 40, len: 34, band: '#e53935' },
    { mag: 10, total: 100, len: 46, band: '#f2b705' },
    { mag: 40, total: 400, len: 60, band: '#1e9be0' },
  ];
  const MAG_IDX = { 40: 0, 100: 1, 400: 2 };
  const S = {
    scene: 'scope', prevScene: null, sceneT0: -9, snap: null, snapOK: false, sceneFrom: null,
    // 현미경
    mag: 40, zoomLog: Math.log(40), coarse: 8, fine: 0, zShown: 8, blurShown: 3.2,
    turret: 0, turretTarget: 0, knobC: 0, knobF: 0,
    slide: 'onion', swap: null, stain: { onion: 0, cheek: 0 }, stainAnim: null, drop: null,
    found: { onion: -1, cheek: -1 }, foundT: { onion: 0, cheek: 0 }, miss: null,
    trayOn: true, trayNewAt: -9, knobDrag: null,
    // 세포 모형
    labels: { plant: {}, animal: {} }, pickMode: false, picks: new Set(), pickFlash: 0,
    // 구조와 기능
    fn: null, watched: {}, fnCards: false, fnNewAt: -9, fnK: 0,
    // 카드 끌기
    drag: null,
    // 모양과 기능
    shapeOK: [false, false, false],
  };
  let game = null;
  let F = new Set();
  // '확인하기' 버튼을 누르는 순간에만 true (엔진이 check()를 주기적으로도 부르므로, 흔들림·되돌리기 같은 부작용은 이때만 일으킴)
  let MANUAL = false;
  $('#game').addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) { MANUAL = true; setTimeout(() => { MANUAL = false; }, 0); }
  }, true);
  const on = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));

  /* =========================================================
     1. 현미경 표본 (양파 표피 · 입안 상피) — 단위: 400배 시야 지름 = 100
     ========================================================= */
  function makeOnion() {
    const R = rng(20241);
    const rowH = 20, NR = 36;
    const walls = [];
    for (let j = -NR; j <= NR + 1; j++) walls.push({ y: j * rowH + (R() - 0.5) * 4, a: 0.6 + R() * 1.4, f: 0.008 + R() * 0.01, p: R() * TAU });
    const rows = [];
    for (let j = 0; j < walls.length - 1; j++) {
      const row = [];
      let x = -760 - R() * 60;
      while (x < 760) {
        const len = 50 + R() * 40;
        row.push({ x0: x, x1: x + len, tilt: (R() - 0.5) * 8, nx: x + len * (0.2 + R() * 0.6), nv: 0.32 + R() * 0.36, nr: 3.5 + R() * 0.9, ne: 0.7 + R() * 0.18, na: (R() - 0.5) * 0.7, nl: R() });
        x += len;
      }
      rows.push(row);
    }
    return { kind: 'onion', walls, rows, rowH, NR };
  }
  const wallY = (w, x) => w.y + w.a * Math.sin(x * w.f + w.p);
  function onionNuclei(sp) {   // 핵 위치 목록 (누르기 판정용)
    const out = [];
    sp.rows.forEach((row, j) => row.forEach((c) => {
      const y = lerp(wallY(sp.walls[j], c.nx), wallY(sp.walls[j + 1], c.nx), c.nv);
      out.push({ x: c.nx, y, r: c.nr });
    }));
    return out;
  }
  function makeCheek() {
    const R = rng(9137);
    const cells = [];
    const centers = [[0, 0], [-60, 70]];
    for (let k = 0; k < 16; k++) centers.push([(R() - 0.5) * 1200, (R() - 0.5) * 1200]);
    let tries = 0;
    while (cells.length < 230 && tries < 4000) {
      tries++;
      const c = centers[Math.floor(R() * centers.length)];
      const spread = c[0] === 0 && c[1] === 0 ? 120 : 230;
      const x = c[0] + (R() - 0.5) * spread * 2, y = c[1] + (R() - 0.5) * spread * 2;
      const r = 15 + R() * 5.5;
      if (cells.some((o) => Math.hypot(o.x - x, o.y - y) < (o.r + r) * 0.72)) continue;   // 너무 많이 겹치지 않게
      const rot = R() * TAU, p1 = R() * TAU, p2 = R() * TAU, e = 0.8 + R() * 0.2;
      const pts = [];
      const N = 10;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const k = 1 + 0.12 * Math.sin(2 * a + p1) + 0.08 * Math.sin(3 * a + p2) + (R() - 0.5) * 0.06;
        const lx = Math.cos(a) * r * k, ly = Math.sin(a) * r * k * e;
        pts.push([x + lx * Math.cos(rot) - ly * Math.sin(rot), y + lx * Math.sin(rot) + ly * Math.cos(rot)]);
      }
      const na = R() * TAU, nd = R() * r * 0.22;
      cells.push({ x, y, r, pts, nx: x + Math.cos(na) * nd, ny: y + Math.sin(na) * nd, nr: 2.7 + R() * 0.7, fold: R() < 0.35 ? { a: R() * TAU, k: 0.5 + R() * 0.4 } : null });
    }
    const dots = [];
    for (let i = 0; i < 520; i++) dots.push([(R() - 0.5) * 1300, (R() - 0.5) * 1300, 0.35 + R() * 0.45]);
    return { kind: 'cheek', cells, dots };
  }
  const SPEC = { onion: makeOnion(), cheek: makeCheek() };
  const NUCLEI = { onion: onionNuclei(SPEC.onion), cheek: SPEC.cheek.cells.map((c) => ({ x: c.nx, y: c.ny, r: c.nr })) };
  const SLIDES = {
    onion: { name: '양파 표피', icon: '🧅', kind: '식물', stain: '아세트산 카민', spot: ['#efe4c6', '#e79ab0'] },
    cheek: { name: '입안 상피', icon: '👄', kind: '동물', stain: '메틸렌 블루', spot: ['#ece7dc', '#8fb6e6'] },
  };

  function smoothBlob(c2, pts) {
    const n = pts.length;
    const m0x = (pts[n - 1][0] + pts[0][0]) / 2, m0y = (pts[n - 1][1] + pts[0][1]) / 2;
    c2.moveTo(m0x, m0y);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      c2.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c2.closePath();
  }

  // 표본 그리기 (오프스크린): ppu = 화면 픽셀/단위
  function renderSpec(c2, size, key, ppu, stained, offX) {
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over';
    c2.fillStyle = '#fbf9f1';
    c2.fillRect(0, 0, size, size);
    const hw = size / 2 / ppu;
    c2.setTransform(ppu, 0, 0, ppu, size / 2 - offX * ppu, size / 2);
    if (key === 'onion') drawOnion(c2, SPEC.onion, ppu, stained, offX - hw, offX + hw, -hw, hw);
    else if (key === 'cheek') drawCheek(c2, SPEC.cheek, ppu, stained, offX - hw, offX + hw, -hw, hw);
    c2.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawOnion(c2, sp, ppu, st, x0, x1, y0, y1) {
    const ext = sp.NR * sp.rowH;
    // 조직 바탕
    c2.fillStyle = st ? '#f5d9df' : '#efe9d9';
    c2.fillRect(Math.max(x0, -760), Math.max(y0, -ext), Math.min(x1, 760) - Math.max(x0, -760), Math.min(y1, ext) - Math.max(y0, -ext));
    const j0 = clamp(Math.floor(y0 / sp.rowH) + sp.NR - 1, 0, sp.rows.length - 1);
    const j1 = clamp(Math.ceil(y1 / sp.rowH) + sp.NR + 1, 0, sp.rows.length - 1);
    // 세포마다 살짝 다른 밝기 (자연스러운 느낌)
    if (ppu > 0.6) {
      c2.beginPath();
      for (let j = j0; j <= j1; j++) {
        const row = sp.rows[j], wt = sp.walls[j], wb = sp.walls[j + 1];
        row.forEach((c) => {
          if (c.nl < 0.6 || c.x1 < x0 || c.x0 > x1) return;
          c2.moveTo(c.x0, wallY(wt, c.x0)); c2.lineTo(c.x1, wallY(wt, c.x1)); c2.lineTo(c.x1, wallY(wb, c.x1)); c2.lineTo(c.x0, wallY(wb, c.x0)); c2.closePath();
        });
      }
      c2.fillStyle = st ? 'rgba(196,90,120,.10)' : 'rgba(150,130,90,.07)'; c2.fill();
    }
    // 세포벽 (가로 벽 + 끝 벽)
    c2.beginPath();
    const step = Math.max(3, 10 / Math.max(0.3, ppu));
    for (let j = j0; j <= j1 + 1; j++) {
      const w = sp.walls[j];
      if (!w) continue;
      let first = true;
      for (let x = Math.max(x0 - step, -760); x <= Math.min(x1 + step, 760); x += step) {
        const y = wallY(w, x);
        if (first) { c2.moveTo(x, y); first = false; } else c2.lineTo(x, y);
      }
    }
    for (let j = j0; j <= j1; j++) {
      const row = sp.rows[j], wt = sp.walls[j], wb = sp.walls[j + 1];
      row.forEach((c) => {
        if (c.x1 < x0 - 10 || c.x1 > x1 + 10) return;
        c2.moveTo(c.x1 + c.tilt / 2, wallY(wt, c.x1)); c2.lineTo(c.x1 - c.tilt / 2, wallY(wb, c.x1));
      });
    }
    c2.lineJoin = 'round';
    c2.lineWidth = clamp(0.5 * ppu, 0.6, 2.6) / ppu;
    c2.strokeStyle = st ? 'rgba(150,52,82,.78)' : 'rgba(128,112,82,.62)';
    c2.stroke();
    if (ppu > 2) {    // 고배율: 벽 안쪽 밝은 테두리
      c2.lineWidth = 0.8 / ppu * 2;
      c2.strokeStyle = 'rgba(255,255,255,.35)';
      c2.stroke();
    }
    // 핵
    c2.beginPath();
    for (let j = j0; j <= j1; j++) {
      const row = sp.rows[j], wt = sp.walls[j], wb = sp.walls[j + 1];
      row.forEach((c) => {
        if (c.nx < x0 - 8 || c.nx > x1 + 8) return;
        const y = lerp(wallY(wt, c.nx), wallY(wb, c.nx), c.nv);
        c2.moveTo(c.nx + c.nr * Math.cos(c.na), y + c.nr * Math.sin(c.na));
        c2.ellipse(c.nx, y, c.nr, c.nr * c.ne, c.na, 0, TAU);
      });
    }
    c2.fillStyle = st ? '#8a1636' : 'rgba(150,134,104,.30)';
    c2.fill();
    if (st && ppu > 1.6) {   // 핵 속 짙은 알갱이(인)
      c2.beginPath();
      for (let j = j0; j <= j1; j++) {
        const row = sp.rows[j], wt = sp.walls[j], wb = sp.walls[j + 1];
        row.forEach((c) => {
          if (c.nx < x0 - 8 || c.nx > x1 + 8) return;
          const y = lerp(wallY(wt, c.nx), wallY(wb, c.nx), c.nv);
          c2.moveTo(c.nx + 1.5, y - 0.4); c2.arc(c.nx + 0.6, y - 0.4, 0.9, 0, TAU);
        });
      }
      c2.fillStyle = '#4f0718'; c2.fill();
      c2.beginPath();
      for (let j = j0; j <= j1; j++) {
        const row = sp.rows[j], wt = sp.walls[j], wb = sp.walls[j + 1];
        row.forEach((c) => {
          if (c.nx < x0 - 8 || c.nx > x1 + 8) return;
          const y = lerp(wallY(wt, c.nx), wallY(wb, c.nx), c.nv);
          c2.moveTo(c.nx - c.nr * 0.2, y - c.nr * 0.35); c2.ellipse(c.nx - c.nr * 0.35, y - c.nr * 0.35, c.nr * 0.35, c.nr * 0.2, -0.5, 0, TAU);
        });
      }
      c2.fillStyle = 'rgba(255,190,205,.35)'; c2.fill();
    }
  }
  function drawCheek(c2, sp, ppu, st, x0, x1, y0, y1) {
    const lw = clamp(0.45 * ppu, 0.5, 2.0) / ppu;
    const fill = st ? 'rgba(122,168,224,.34)' : 'rgba(200,190,166,.22)';
    const edge = st ? 'rgba(46,96,172,.62)' : 'rgba(146,136,112,.42)';
    sp.cells.forEach((c) => {
      if (c.x + c.r * 1.4 < x0 || c.x - c.r * 1.4 > x1 || c.y + c.r * 1.4 < y0 || c.y - c.r * 1.4 > y1) return;
      c2.beginPath(); smoothBlob(c2, c.pts);
      c2.fillStyle = fill; c2.fill();
      c2.lineWidth = lw; c2.strokeStyle = edge; c2.stroke();
      if (c.fold && ppu > 0.8) {
        c2.beginPath();
        c2.arc(c.x + Math.cos(c.fold.a) * c.r * 0.35, c.y + Math.sin(c.fold.a) * c.r * 0.35, c.r * c.fold.k, c.fold.a + 2.2, c.fold.a + 3.6);
        c2.strokeStyle = st ? 'rgba(46,96,172,.35)' : 'rgba(146,136,112,.28)'; c2.stroke();
      }
    });
    c2.beginPath();
    sp.cells.forEach((c) => {
      if (c.nx < x0 - 6 || c.nx > x1 + 6 || c.ny < y0 - 6 || c.ny > y1 + 6) return;
      c2.moveTo(c.nx + c.nr, c.ny); c2.ellipse(c.nx, c.ny, c.nr, c.nr * 0.86, 0.3, 0, TAU);
    });
    c2.fillStyle = st ? '#1d3f88' : 'rgba(140,128,100,.34)';
    c2.fill();
    if (st && ppu > 0.9) {       // 입안의 세균 (진한 점)
      c2.beginPath();
      sp.dots.forEach((d) => {
        if (d[0] < x0 || d[0] > x1 || d[1] < y0 || d[1] > y1) return;
        c2.moveTo(d[0] + d[2], d[1]); c2.arc(d[0], d[1], d[2], 0, TAU);
      });
      c2.fillStyle = 'rgba(30,62,140,.55)'; c2.fill();
    }
  }

  // 오프스크린 캔버스 (선명한 상 + 흐린 상 3단계)
  const SP = { size: 0, main: null, mc: null, tmp: null, tc: null, lv: [], key: '' };
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ensureSpec(size) {
    if (SP.size === size) return;
    SP.size = size;
    SP.main = mk(size, size); SP.mc = SP.main.getContext('2d');
    SP.tmp = mk(size, size); SP.tc = SP.tmp.getContext('2d');
    SP.lv = [3, 7, 15].map((k) => { const n = Math.max(8, Math.round(size / k)); const c = mk(n, n); return { c, x: c.getContext('2d'), n }; });
    SP.key = '';
  }
  const viewUnits = () => 40000 / Math.exp(S.zoomLog);
  function swapState() {
    if (!S.swap) return { key: S.slide, off: 0, white: 0 };
    const u = clamp((now() - S.swap.t0) / 1.0, 0, 1), Dd = viewUnits();
    if (u < 0.5) { const e = EASE.inCubic(u * 2); return { key: S.swap.from, off: -e * Dd * 0.9, white: e * 0.85 }; }
    const e = EASE.outCubic((u - 0.5) * 2);
    return { key: S.swap.to, off: (1 - e) * Dd * 0.9, white: (1 - e) * 0.85 };
  }
  function refreshSpec() {
    const V = LAY.scope.view;
    const res = Math.min(2, Math.max(1, view.scale * view.dpr));
    const size = Math.max(64, Math.round(2 * V.r * res));
    ensureSpec(size);
    const sw = swapState();
    const key = sw.key;
    const st = key ? S.stain[key] : 0;
    const sig = [key, S.zoomLog.toFixed(4), st.toFixed(3), sw.off.toFixed(1), size].join('|');
    if (sig === SP.key) return;
    SP.key = sig;
    const ppu = size / viewUnits();
    if (!key) { SP.mc.fillStyle = '#fbf9f1'; SP.mc.fillRect(0, 0, size, size); }
    else if (st <= 0.001) renderSpec(SP.mc, size, key, ppu, false, sw.off);
    else if (st >= 0.999) renderSpec(SP.mc, size, key, ppu, true, sw.off);
    else {
      renderSpec(SP.mc, size, key, ppu, false, sw.off);
      renderSpec(SP.tc, size, key, ppu, true, sw.off);
      // 염색약이 왼쪽에서 오른쪽으로 번져 가는 모습
      const g = SP.tc.createLinearGradient(0, 0, size, 0);
      const f = st * 1.5 - 0.25;
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(clamp(f - 0.12, 0, 1), 'rgba(0,0,0,1)');
      g.addColorStop(clamp(f + 0.12, 0.0001, 1), 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      SP.tc.globalCompositeOperation = 'destination-in';
      SP.tc.fillStyle = g; SP.tc.fillRect(0, 0, size, size);
      SP.tc.globalCompositeOperation = 'source-over';
      SP.mc.drawImage(SP.tmp, 0, 0);
    }
    let src = SP.main, sn = size;
    SP.lv.forEach((l) => {
      l.x.imageSmoothingEnabled = true; l.x.imageSmoothingQuality = 'high';
      l.x.clearRect(0, 0, l.n, l.n);
      l.x.drawImage(src, 0, 0, sn, sn, 0, 0, l.n, l.n);
      src = l.c; sn = l.n;
    });
  }

  /* ---------- 현미경 상태 ---------- */
  const zTarget = () => S.coarse + S.fine * 0.1;
  const blurFor = (err, mag) => clamp((err / (120 / mag)) * 1.6, 0, 3.2);
  const turretSettled = () => Math.abs(S.turret - S.turretTarget) < 3;
  const zoomSettled = () => Math.abs(S.zoomLog - Math.log(S.mag)) < 0.03;
  const sharpNow = () => blurFor(Math.abs(zTarget() - Z_STAR), S.mag) < 0.45;
  const isSharp = () => sharpNow() && turretSettled() && zoomSettled() && !S.swap && !!S.slide;
  function focusWord() {
    const b = S.blurShown;
    if (!S.slide) return null;
    if (b < 0.45) return ['✨ 선명해요', '#15803d', '#dcfce7'];
    if (b < 1.4) return ['🌫️ 조금 흐려요', '#92400e', '#fef3c7'];
    return ['🌫️ 흐려요 · 초점을 맞춰요', '#475569', '#e2e8f0'];
  }

  /* ---------- 현미경 그림 ---------- */
  function micPt(M, lx, ly) { return { x: M.x + lx * M.s, y: M.y + ly * M.s }; }
  const AX = 44;   // 광축 (현미경 그림 기준)
  function stageLift() { return (S.zShown - 20) * 1.35; }
  function drawMicroscope(M, t) {
    const lift = stageLift();
    const stY = -196 - lift;
    let slideDX = 0, slideAlpha = 1;
    if (S.swap) {
      const u = clamp((now() - S.swap.t0) / 1.0, 0, 1);
      if (u < 0.5) { slideDX = EASE.inCubic(u * 2) * 90; slideAlpha = 1 - u * 2; } else { slideDX = -(1 - EASE.outCubic((u - 0.5) * 2)) * 90; slideAlpha = (u - 0.5) * 2; }
    }
    const sw = swapState();
    ctx.save();
    ctx.translate(M.x, M.y); ctx.scale(M.s, M.s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 그림자
    ctx.fillStyle = 'rgba(30,50,60,.14)';
    ctx.beginPath(); ctx.ellipse(6, 4, 140, 10, 0, 0, TAU); ctx.fill();
    // 받침
    ctx.beginPath();
    ctx.moveTo(-112, 0); ctx.lineTo(112, 0); ctx.quadraticCurveTo(120, 0, 116, -9); ctx.lineTo(100, -34);
    ctx.quadraticCurveTo(96, -40, 88, -40); ctx.lineTo(-88, -40); ctx.quadraticCurveTo(-96, -40, -100, -34); ctx.lineTo(-116, -9); ctx.quadraticCurveTo(-120, 0, -112, 0);
    let g = ctx.createLinearGradient(0, -40, 0, 0); g.addColorStop(0, '#56657f'); g.addColorStop(1, '#2b3549');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-86, -37); ctx.lineTo(86, -37); ctx.stroke();
    // 조명 (빛)
    const glowA = 0.55 + 0.08 * Math.sin(t * 2.2);
    g = ctx.createRadialGradient(AX, -44, 2, AX, -44, 40); g.addColorStop(0, 'rgba(255,244,190,' + glowA + ')'); g.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(AX, -44, 40, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff7cf'; ctx.beginPath(); ctx.ellipse(AX, -42, 17, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9b46a'; ctx.lineWidth = 1.5; ctx.stroke();
    // 빛줄기 (조명 → 재물대 → 대물렌즈)
    g = ctx.createLinearGradient(0, -44, 0, -300);
    g.addColorStop(0, 'rgba(255,240,170,.42)'); g.addColorStop(1, 'rgba(255,240,170,.12)');
    ctx.fillStyle = g; ctx.fillRect(AX - 9, -300, 18, 258);
    // 기둥과 팔 (곡선)
    ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 36;
    ctx.beginPath(); ctx.moveTo(-64, -36); ctx.bezierCurveTo(-74, -150, -84, -300, -34, -372); ctx.lineTo(AX - 22, -392); ctx.stroke();
    g = ctx.createLinearGradient(-90, 0, -30, 0); g.addColorStop(0, '#f8fafc'); g.addColorStop(1, '#d5dce6');
    ctx.strokeStyle = g; ctx.lineWidth = 31;
    ctx.beginPath(); ctx.moveTo(-64, -36); ctx.bezierCurveTo(-74, -150, -84, -300, -34, -372); ctx.lineTo(AX - 22, -392); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-74, -60); ctx.bezierCurveTo(-82, -160, -90, -290, -46, -360); ctx.stroke();
    // 재물대 받침(톱니 막대)
    ctx.fillStyle = '#3b4659'; rr(-74, stY - 6, 34, 40, 6); ctx.fill();
    // 집광기
    ctx.fillStyle = '#4b5870'; rr(AX - 15, stY + 12, 30, 20, 4); ctx.fill();
    ctx.fillStyle = '#9fb0c7'; rr(AX - 18, stY + 30, 36, 5, 2); ctx.fill();
    // 재물대
    g = ctx.createLinearGradient(0, stY, 0, stY + 13); g.addColorStop(0, '#5a6881'); g.addColorStop(1, '#2c3547');
    ctx.fillStyle = g; rr(-52, stY, AX + 98 + 52, 13, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-48, stY + 1, AX + 92 + 48, 2);
    // 받침 위 표본(슬라이드 글라스)
    if (sw.key || S.swap) {
      const sk = sw.key || S.slide;
      ctx.save(); ctx.globalAlpha = clamp(slideAlpha, 0, 1);
      ctx.translate(slideDX, 0);
      ctx.fillStyle = 'rgba(214,236,248,.95)'; rr(AX - 58, stY - 6, 116, 6, 1.5); ctx.fill();
      ctx.strokeStyle = 'rgba(120,160,190,.9)'; ctx.lineWidth = 1; ctx.stroke();
      const spot = SLIDES[sk].spot;
      ctx.fillStyle = S.stain[sk] > 0.5 ? spot[1] : spot[0];
      ctx.beginPath(); ctx.ellipse(AX, stY - 6.5, 13, 2.2, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 클립
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(AX - 46, stY - 1); ctx.quadraticCurveTo(AX - 36, stY - 10, AX - 22, stY - 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(AX + 74, stY - 1); ctx.quadraticCurveTo(AX + 64, stY - 10, AX + 50, stY - 7); ctx.stroke();
    // 경통
    g = ctx.createLinearGradient(AX - 18, 0, AX + 18, 0); g.addColorStop(0, '#d9dfe8'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, '#bcc6d4');
    ctx.fillStyle = g; rr(AX - 18, -404, 36, 92, 5); ctx.fill();
    ctx.strokeStyle = '#97a3b6'; ctx.lineWidth = 1.5; ctx.stroke();
    // 접안렌즈
    g = ctx.createLinearGradient(AX - 13, 0, AX + 13, 0); g.addColorStop(0, '#39445a'); g.addColorStop(0.45, '#6d7a92'); g.addColorStop(1, '#2a3243');
    ctx.fillStyle = g; rr(AX - 13, -456, 26, 56, 4); ctx.fill();
    ctx.fillStyle = '#1e2532'; rr(AX - 16, -464, 32, 12, 4); ctx.fill();
    ctx.fillStyle = 'rgba(150,200,255,.55)'; ctx.beginPath(); ctx.ellipse(AX, -463, 11, 2.4, 0, 0, TAU); ctx.fill();
    // 회전판 + 대물렌즈 (뒤쪽 렌즈 먼저)
    const objs = OBJ.map((o, i) => {
      let a = (i * 120 - S.turret) % 360; if (a > 180) a -= 360; if (a < -180) a += 360;
      return { o, a };
    }).sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
    objs.forEach(({ o, a }) => {
      if (Math.abs(a) > 150) return;
      const back = Math.abs(a) > 40;
      ctx.save();
      ctx.translate(AX, -300);
      ctx.rotate((a * 0.38 * Math.PI) / 180);
      const len = o.len;
      g = ctx.createLinearGradient(-10, 0, 10, 0);
      g.addColorStop(0, back ? '#a6b0bf' : '#cfd6e0'); g.addColorStop(0.45, back ? '#d7dde6' : '#ffffff'); g.addColorStop(1, back ? '#8c97a8' : '#aab5c4');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(8, len); ctx.lineTo(-8, len); ctx.closePath(); ctx.fill();
      ctx.fillStyle = o.band; ctx.fillRect(-9.6, len * 0.42, 19.2, 5);
      ctx.fillStyle = '#20262f'; rr(-6, len - 2, 12, 6, 2); ctx.fill();
      ctx.restore();
    });
    g = ctx.createLinearGradient(0, -318, 0, -296); g.addColorStop(0, '#4c5870'); g.addColorStop(1, '#232b3a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(AX - 40, -316); ctx.lineTo(AX + 40, -316); ctx.lineTo(AX + 28, -296); ctx.lineTo(AX - 28, -296); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(AX - 36, -314, 72, 2);
    // 조동 나사 · 미동 나사
    drawKnob(-64, -168, 23, S.knobC, '#2f3a4e', S.knobDrag === 'coarse');
    drawKnob(-64, -112, 14, S.knobF, '#46536b', S.knobDrag === 'fine');
    // 염색약 한 방울 애니메이션
    if (S.drop) {
      const u = (now() - S.drop.t0);
      const dx = AX + 6, topY = stY - 120;
      const inA = clamp(u / 0.25, 0, 1), outA = clamp((1.3 - u) / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha = Math.min(inA, outA);
      // 스포이트
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dx - 3, topY); ctx.lineTo(dx + 3, topY); ctx.lineTo(dx + 1.5, topY + 34); ctx.lineTo(dx - 1.5, topY + 34); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8564f'; rr(dx - 7, topY - 22, 14, 24, 7); ctx.fill();
      ctx.restore();
      const col = S.drop.key === 'onion' ? '#c2185b' : '#1e5bd6';
      if (u > 0.25 && u < 0.85) {
        const fy = topY + 36 + EASE.inQuad((u - 0.25) / 0.6) * (stY - 8 - topY - 36);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(dx, fy - 7); ctx.quadraticCurveTo(dx + 5, fy, dx, fy + 3); ctx.quadraticCurveTo(dx - 5, fy, dx, fy - 7); ctx.fill();
      }
      if (u > 0.85 && u < 1.5) {
        const k = (u - 0.85) / 0.65;
        ctx.strokeStyle = SciSim.color.rgba(col, 0.6 * (1 - k)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(dx, stY - 7, 6 + k * 22, 2 + k * 3, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
    // 이름표 (현미경 그림 바깥, 실제 크기 글자)
    const lab = (s, lx, ly, side) => {
      const p = micPt(M, lx, ly);
      const x = side === 'r' ? p.x + 8 : p.x - 8;
      txt(s, x, p.y + 5, { size: 13, weight: 800, color: '#475569', align: side === 'r' ? 'left' : 'right', halo: 'rgba(243,247,250,.9)', haloW: 4 });
    };
    lab('접안렌즈', AX - 18, -432, 'l');
    lab('대물렌즈', AX - 26, -276, 'l');
    lab('재물대', -52, stY - 8, 'l');
    lab('조동 나사', -92, -168, 'l');
    lab('미동 나사', -82, -112, 'l');
    lab('조명', AX + 22, -44, 'r');
  }
  function drawKnob(x, y, r, ang, color, active) {
    ctx.save();
    ctx.translate(x, y);
    if (active) { ctx.fillStyle = 'rgba(22,163,74,.22)'; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, SciSim.color.shade(color, 0.35)); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.rotate(ang);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); ctx.lineTo(Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.96); ctx.stroke();
    }
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, -r * 0.55, Math.max(2, r * 0.13), 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- 시야 (접안렌즈로 본 모습) ---------- */
  function viewScale() { const V = LAY.scope.view; return (2 * V.r) / viewUnits(); }   // 화면 px / 단위
  function nucToCanvas(key, i) {
    const V = LAY.scope.view, n = NUCLEI[key][i], k = viewScale();
    return { x: V.cx + n.x * k, y: V.cy + n.y * k, r: n.r * k };
  }
  function drawView(Lc, t) {
    const V = Lc.view;
    // 접안렌즈 테
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.35)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#1c2230'; ctx.beginPath(); ctx.arc(V.cx, V.cy, V.r + 12, 0, TAU); ctx.fill();
    ctx.restore();
    let g = ctx.createRadialGradient(V.cx, V.cy, V.r, V.cx, V.cy, V.r + 12);
    g.addColorStop(0, '#05070b'); g.addColorStop(1, '#3a4458');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(V.cx, V.cy, V.r + 12, 0, TAU); ctx.fill();
    // 표본 상
    refreshSpec();
    ctx.save();
    ctx.beginPath(); ctx.arc(V.cx, V.cy, V.r, 0, TAU); ctx.clip();
    const b = clamp(S.blurShown, 0, 3);
    const lv = [SP.main].concat(SP.lv.map((l) => l.c));
    const i0 = Math.min(3, Math.floor(b)), fr = b - i0;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lv[i0], V.cx - V.r, V.cy - V.r, 2 * V.r, 2 * V.r);
    if (fr > 0.01 && i0 < 3) { ctx.globalAlpha = fr; ctx.drawImage(lv[i0 + 1], V.cx - V.r, V.cy - V.r, 2 * V.r, 2 * V.r); ctx.globalAlpha = 1; }
    const sw = swapState();
    if (sw.white > 0) { ctx.fillStyle = 'rgba(251,249,241,' + sw.white.toFixed(3) + ')'; ctx.fillRect(V.cx - V.r, V.cy - V.r, 2 * V.r, 2 * V.r); }
    // 렌즈를 돌리는 동안 잠깐 어두워짐
    const dim = clamp(Math.abs(S.turret - S.turretTarget) / 70, 0, 0.8);
    if (dim > 0.01) { ctx.fillStyle = 'rgba(8,10,16,' + dim.toFixed(3) + ')'; ctx.fillRect(V.cx - V.r, V.cy - V.r, 2 * V.r, 2 * V.r); }
    // 찾은 핵 표시
    ['onion', 'cheek'].forEach((key) => {
      const i = S.found[key];
      if (i < 0 || sw.key !== key || S.swap) return;
      const p = nucToCanvas(key, i);
      const rr2 = Math.max(10, p.r + 6);
      const age = now() - S.foundT[key];
      const pop = age < 0.4 ? EASE.outBack(age / 0.4) : 1;
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr2 * pop, 0, TAU); ctx.stroke();
      D.ring(p.x, p.y, rr2 + 4, t, { color: '#facc15', width: 2 });
      pill('핵', p.x, p.y - rr2 - 16, { size: 14, bg: '#facc15', color: '#3f2d00' });
    });
    if (S.miss && now() - S.miss.t < 0.8) {
      const a = 1 - (now() - S.miss.t) / 0.8;
      ctx.strokeStyle = 'rgba(239,68,68,' + a.toFixed(2) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.miss.x, S.miss.y, 10 + (1 - a) * 12, 0, TAU); ctx.stroke();
    }
    // 가장자리 어둡게 (비네팅)
    g = ctx.createRadialGradient(V.cx, V.cy, V.r * 0.62, V.cx, V.cy, V.r);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,16,8,.30)');
    ctx.fillStyle = g; ctx.fillRect(V.cx - V.r, V.cy - V.r, 2 * V.r, 2 * V.r);
    ctx.restore();
    // 렌즈 반사광
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(V.cx, V.cy, V.r - 6, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
    // 위쪽: 초점 상태
    const fw = focusWord();
    const fy = TALL ? V.cy - V.r + 26 : Lc.focusY;
    if (fw) pill(fw[0], V.cx, fy, { size: 14, bg: fw[2], color: fw[1], shadow: TALL });
    else pill('재물대에 표본을 올려요', V.cx, fy, { size: 14, bg: '#e2e8f0', color: '#475569' });
    // 아래쪽: 배율, 표본
    const mi = MAG_IDX[S.mag];
    const sk = sw.key || S.slide;
    const st = sk && S.stain[sk] > 0.5;
    const capL = '🔍 ' + S.mag + '배 (10 × ' + OBJ[mi].mag + ')';
    const capR = sk ? SLIDES[sk].icon + ' ' + SLIDES[sk].name + (st ? ' · 염색함' : ' · 염색 전') : '표본 없음';
    ctx.font = font(14, 800);
    const w1 = ctx.measureText(capL).width + 20, w2 = ctx.measureText(capR).width + 20;
    const x0 = V.cx - (w1 + w2 + 8) / 2;
    pill(capL, x0, Lc.capY, { size: 14, align: 'left', bg: '#1f2937', color: '#fff' });
    pill(capR, x0 + w1 + 8, Lc.capY, { size: 14, align: 'left', bg: st ? (sk === 'onion' ? '#fce7f3' : '#dbeafe') : '#fff', color: st ? (sk === 'onion' ? '#9d174d' : '#1e40af') : '#334155', border: '#d6dee8', borderW: 1.5 });
  }

  /* ---------- 표본 상자 (슬라이드 2개 + 염색약) ---------- */
  function trayItems(T) {
    const n = 3, gap = 10;
    if (T.dir === 'row') {
      const w = (T.w - gap * (n - 1)) / n;
      return ['onion', 'cheek', 'dye'].map((k, i) => ({ k, x: T.x + i * (w + gap), y: T.y, w, h: T.h }));
    }
    const h = (T.h - gap * (n - 1)) / n;
    return ['onion', 'cheek', 'dye'].map((k, i) => ({ k, x: T.x, y: T.y + i * (h + gap), w: T.w, h }));
  }
  function drawTray(Lc, t) {
    if (!S.trayOn) return;
    const items = trayItems(Lc.tray);
    const appear = clamp((now() - S.trayNewAt) / 0.5, 0, 1);
    items.forEach((it, i) => {
      const a = clamp(appear * 1.6 - i * 0.3, 0, 1);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, (1 - EASE.outBack(a)) * 24);
      if (it.k === 'dye') drawDyeItem(it, t); else drawSlideItem(it, t);
      ctx.restore();
    });
    if (now() - S.trayNewAt < 5) {
      const T = Lc.tray;
      newRing({ x: T.x, y: T.y, w: T.w, h: T.h }, 14);
    }
  }
  function drawSlideItem(it, t) {
    const onStage = (S.swap ? S.swap.to : S.slide) === it.k;
    panel(it.x, it.y, it.w, it.h, { bg: onStage ? '#f0fdf4' : '#fff', border: onStage ? '#86efac' : '#dbe3ec', r: 14 });
    const cx = it.x + it.w / 2;
    const sy = it.y + (TALL ? 26 : 22);
    // 슬라이드 글라스
    const gw = Math.min(96, it.w - 26);
    ctx.save();
    ctx.globalAlpha *= onStage ? 0.35 : 1;
    ctx.fillStyle = 'rgba(206,232,246,.95)'; rr(cx - gw / 2, sy, gw, 26, 3); ctx.fill();
    ctx.strokeStyle = '#8fb4cc'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; rr(cx - 13, sy + 2, 26, 22, 1); ctx.stroke();
    const spot = SLIDES[it.k].spot;
    ctx.fillStyle = S.stain[it.k] > 0.5 ? spot[1] : spot[0];
    ctx.beginPath(); ctx.ellipse(cx, sy + 13, 9, 7, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
    txt(SLIDES[it.k].icon + ' ' + SLIDES[it.k].name, cx, sy + 50, { size: 14, weight: 800, align: 'center', max: it.w - 10 });
    txt(onStage ? '✔ 재물대에 있어요' : SLIDES[it.k].kind + ' · 눌러서 올리기', cx, sy + 70, { size: 13, weight: 700, color: onStage ? '#15803d' : '#64748b', align: 'center', max: it.w - 10 });
  }
  function drawDyeItem(it, t) {
    const sk = S.swap ? S.swap.to : S.slide;
    const done = sk && S.stain[sk] > 0.5;
    panel(it.x, it.y, it.w, it.h, { bg: '#fff', border: '#dbe3ec', r: 14 });
    const cx = it.x + it.w / 2, by = it.y + (TALL ? 60 : 54);
    const col = sk === 'cheek' ? '#1e5bd6' : '#c2185b';
    const squeeze = S.drop ? clamp(1 - Math.abs(now() - S.drop.t0 - 0.2) / 0.2, 0, 1) : 0;
    ctx.save();
    ctx.globalAlpha *= done ? 0.45 : 1;
    // 병
    let g = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0); g.addColorStop(0, '#7c4a1e'); g.addColorStop(0.5, '#a8692f'); g.addColorStop(1, '#6b3d16');
    ctx.fillStyle = g; rr(cx - 15, by - 26, 30, 30, 6); ctx.fill();
    ctx.fillStyle = SciSim.color.rgba(col, 0.75); rr(cx - 12, by - 14, 24, 15, 4); ctx.fill();
    ctx.fillStyle = '#fff'; rr(cx - 11, by - 24, 22, 8, 2); ctx.fill();
    // 스포이트
    ctx.fillStyle = '#e8564f'; rr(cx - 7 - squeeze * 1.5, by - 46, 14 + squeeze * 3, 20 - squeeze * 4, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; rr(cx - 4, by - 43, 3, 10, 1.5); ctx.fill();
    ctx.restore();
    txt('💧 염색약', cx, by + 24, { size: 14, weight: 800, align: 'center', max: it.w - 10 });
    txt(done ? '✔ 염색했어요' : (sk ? SLIDES[sk].stain : '표본 먼저'), cx, by + 44, { size: 13, weight: 700, color: done ? '#15803d' : '#64748b', align: 'center', max: it.w - 10 });
  }

  function drawScopeScene(t) {
    const Lc = LAY.scope;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f4f8fb'); g.addColorStop(1, '#e1e9ef');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawMicroscope(Lc.mic, t);
    drawView(Lc, t);
    drawTray(Lc, t);
    if (isNew('scope')) {
      const V = Lc.view;
      newRing({ x: V.cx - V.r - 12, y: V.cy - V.r - 12, w: 2 * V.r + 24, h: 2 * V.r + 24 }, V.r);
    }
  }

  /* =========================================================
     2~3. 세포 모형 (식물 세포 · 동물 세포)
     ========================================================= */
  function sePt(a, b, n, u) {
    const cs = Math.cos(u), sn = Math.sin(u);
    return [a * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n), b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)];
  }
  function makePlant() {
    const R = rng(4242);
    const c = {
      kind: 'plant', a: 150, b: 180, n: 4.4, wallT: 15, membI: 20,
      ph: [R() * TAU, R() * TAU, R() * TAU],
      nuc: { x: -26, y: -18, r: 40, spots: [] }, chl: [], mito: [], dots: [],
    };
    for (let i = 0; i < 16; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 30; c.nuc.spots.push([Math.cos(a) * d, Math.sin(a) * d, 1.4 + R() * 1.8]); }
    const NCH = 16;
    for (let i = 0; i < NCH; i++) c.chl.push({ u0: ((i + R() * 0.45) / NCH) * TAU, inset: 34 + R() * 20, s: 0.9 + R() * 0.22, wob: R() * TAU, x: 0, y: 0, ang: 0, glow: 0 });
    [[62, -92], [84, 46], [-84, 86], [24, 112], [-94, -104], [92, -10]].forEach(([x, y]) => c.mito.push({ ax: x, ay: y, a0: R() * TAU, p: R() * TAU, q: R() * TAU, s: 0.92 + R() * 0.16, x, y, ang: 0, glow: 0 }));
    for (let i = 0; i < 40; i++) c.dots.push({ band: i < 24, u0: R() * TAU, inset: 26 + R() * 50, ax: (R() - 0.5) * 190, ay: (R() - 0.5) * 250, p: R() * TAU, r: 1.3 + R() * 1.7, x: 0, y: 0 });
    return c;
  }
  function makeAnimal() {
    const R = rng(777);
    const c = {
      kind: 'animal', R0: 160, ax: 1.05, ay: 0.94, ph: [R() * TAU, R() * TAU, R() * TAU],
      nuc: { x: 8, y: 4, r: 42, spots: [] }, mito: [], dots: [],
    };
    for (let i = 0; i < 16; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 31; c.nuc.spots.push([Math.cos(a) * d, Math.sin(a) * d, 1.4 + R() * 1.8]); }
    [[-92, -48], [70, -86], [96, 56], [-66, 82], [10, 112], [-110, 26], [30, -116]].forEach(([x, y]) => c.mito.push({ ax: x, ay: y, a0: R() * TAU, p: R() * TAU, q: R() * TAU, s: 0.92 + R() * 0.16, x, y, ang: 0, glow: 0 }));
    for (let i = 0; i < 40; i++) c.dots.push({ ax: (R() - 0.5) * 260, ay: (R() - 0.5) * 230, p: R() * TAU, q: R() * TAU, r: 1.3 + R() * 1.7, x: 0, y: 0 });
    return c;
  }
  const PLANT = makePlant(), ANIMAL = makeAnimal();
  const plantRad = (c, u) => 1 + 0.016 * Math.sin(3 * u + c.ph[0]) + 0.011 * Math.sin(5 * u + c.ph[1]) + 0.008 * Math.sin(2 * u + c.ph[2]);
  function plantPt(c, u, inset) { const p = sePt(c.a - inset, c.b - inset, c.n, u), k = plantRad(c, u); return [p[0] * k, p[1] * k]; }
  function plantPath(c, inset, sx, sy) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const p = plantPt(c, (i / 96) * TAU, inset);
      if (i) ctx.lineTo(p[0] * sx, p[1] * sy); else ctx.moveTo(p[0] * sx, p[1] * sy);
    }
    ctx.closePath();
  }
  let animT = 0;
  const animalRad = (c, th) => c.R0 * (1 + 0.035 * Math.sin(2 * th + c.ph[0] + 0.5 * animT) + 0.024 * Math.sin(3 * th + c.ph[1] - 0.4 * animT) + 0.013 * Math.sin(5 * th + c.ph[2] + 0.7 * animT));
  function animalPath(c, inset) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const th = (i / 96) * TAU, r = animalRad(c, th) - inset;
      const x = Math.cos(th) * r * c.ax, y = Math.sin(th) * r * c.ay;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function updateCells(t) {
    const tt = RM ? 0 : t;
    animT = tt;
    PLANT.chl.forEach((h) => {
      const u = h.u0 + tt * 0.045;
      const ins = h.inset + Math.sin(tt * 0.7 + h.wob) * 3;
      const p = plantPt(PLANT, u, ins), q = plantPt(PLANT, u + 0.02, ins);
      h.x = p[0]; h.y = p[1]; h.ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    });
    [PLANT, ANIMAL].forEach((c) => c.mito.forEach((m) => {
      m.x = m.ax + 8 * Math.sin(tt * 0.33 + m.p); m.y = m.ay + 6 * Math.cos(tt * 0.29 + m.q);
      m.ang = m.a0 + 0.45 * Math.sin(tt * 0.21 + m.p);
    }));
    PLANT.dots.forEach((d) => {
      if (d.band) { const p = plantPt(PLANT, d.u0 + tt * 0.05, d.inset); d.x = p[0]; d.y = p[1]; }
      else { d.x = d.ax + 10 * Math.sin(tt * 0.4 + d.p); d.y = d.ay + 8 * Math.cos(tt * 0.35 + d.p); }
    });
    ANIMAL.dots.forEach((d) => { d.x = d.ax + 12 * Math.sin(tt * 0.37 + d.p); d.y = d.ay + 10 * Math.cos(tt * 0.31 + d.q); });
  }

  function drawNucleus(n, glow, t) {
    const pulse = RM ? 1 : 1 + 0.012 * Math.sin(t * 1.6);
    const r = n.r * pulse;
    if (glow > 0) D.glow(n.x, n.y, r * 2.2, '#a78bfa', 0.55 * glow);
    ctx.save();
    ctx.shadowColor = 'rgba(60,30,120,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const g = ctx.createRadialGradient(n.x - r * 0.35, n.y - r * 0.4, r * 0.1, n.x, n.y, r);
    g.addColorStop(0, '#d9ccfa'); g.addColorStop(0.55, '#9a7ce0'); g.addColorStop(1, '#6443b8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(80,45,160,.75)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(n.x, n.y, r - 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(72,40,150,.38)';
    ctx.beginPath(); n.spots.forEach((s) => { ctx.moveTo(n.x + s[0] + s[2], n.y + s[1]); ctx.arc(n.x + s[0], n.y + s[1], s[2], 0, TAU); }); ctx.fill();
    ctx.fillStyle = '#4b2a96'; ctx.beginPath(); ctx.arc(n.x + r * 0.22, n.y + r * 0.16, r * 0.27, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(n.x - r * 0.38, n.y - r * 0.42, r * 0.26, r * 0.14, -0.6, 0, TAU); ctx.fill();
  }
  function drawChloroplast(h, glow) {
    ctx.save();
    ctx.translate(h.x, h.y); ctx.rotate(h.ang); ctx.scale(h.s * (1 + glow * 0.12), h.s * (1 + glow * 0.12));
    if (glow > 0) D.glow(0, 0, 30, '#bef264', 0.7 * glow);
    const g = ctx.createLinearGradient(0, -10, 0, 10);
    g.addColorStop(0, '#a6e88a'); g.addColorStop(0.5, '#4caf50'); g.addColorStop(1, '#2b7a31');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 17, 9.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#25692b'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = 'rgba(28,95,36,.75)';
    for (let k = -1.5; k <= 1.5; k++) { rr(k * 7 - 2.3, -4.2, 4.6, 8.4, 1.5); ctx.fill(); }
    ctx.strokeStyle = 'rgba(200,245,180,.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-6, -5, 6, 2.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawMito(m, glow) {
    ctx.save();
    ctx.translate(m.x, m.y); ctx.rotate(m.ang); ctx.scale(m.s * (1 + glow * 0.1), m.s * (1 + glow * 0.1));
    if (glow > 0) D.glow(0, 0, 34, '#fdba74', 0.75 * glow);
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#ffc1a3'); g.addColorStop(0.5, '#f27b4b'); g.addColorStop(1, '#c4492a');
    ctx.fillStyle = g; rr(-16, -8, 32, 16, 8); ctx.fill();
    ctx.strokeStyle = '#a63c1f'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,233,220,.9)'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-12, 0);
    for (let k = 0; k < 6; k++) ctx.lineTo(-10 + k * 4.4, k % 2 ? 4.2 : -4.2);
    ctx.lineTo(12, 0); ctx.stroke();
    ctx.restore();
  }
  // 세포 그리기: o = { fx (기능 애니메이션 상태), pick (선택 표시) }
  function drawPlantCell(cx, cy, sc, t, o) {
    o = o || {};
    const c = PLANT;
    const sq = o.squeeze || 0;
    const sx = 1 - sq * 0.05, sy = 1 + sq * 0.012;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    // 그림자 + 세포벽
    ctx.save();
    ctx.shadowColor = 'rgba(50,80,30,.25)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 9;
    plantPath(c, 0, sx, sy); ctx.fillStyle = '#b9c873'; ctx.fill();
    ctx.restore();
    let g = ctx.createLinearGradient(-c.a, -c.b, c.a, c.b);
    g.addColorStop(0, '#e3edb0'); g.addColorStop(1, '#a3b955');
    plantPath(c, 0, sx, sy); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(110,135,40,.38)'; ctx.lineWidth = 1.1;
    plantPath(c, 5, sx, sy); ctx.stroke(); plantPath(c, 10, sx, sy); ctx.stroke();
    ctx.strokeStyle = '#7c9433'; ctx.lineWidth = 2.2; plantPath(c, 0, sx, sy); ctx.stroke();
    if (o.wallGlow) {
      ctx.save(); ctx.globalAlpha = o.wallGlow;
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 7; plantPath(c, 7, sx, sy); ctx.stroke();
      ctx.restore();
    }
    // 세포벽과 세포막 사이
    plantPath(c, c.wallT, sx, sy); ctx.fillStyle = '#f2f8e6'; ctx.fill();
    // 세포 안
    g = ctx.createRadialGradient(-c.a * 0.3, -c.b * 0.3, 10, 0, 0, c.b * 1.05);
    g.addColorStop(0, '#f8fdf1'); g.addColorStop(1, '#dcefcc');
    plantPath(c, c.membI, sx, sy); ctx.fillStyle = g; ctx.fill();
    // 세포막
    ctx.strokeStyle = '#e0a82e'; ctx.lineWidth = 3.6; plantPath(c, c.membI, sx, sy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,246,204,.95)'; ctx.lineWidth = 1.2; plantPath(c, c.membI + 1.2, sx, sy); ctx.stroke();
    if (o.membGlow) {
      ctx.save(); ctx.globalAlpha = o.membGlow;
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 8; plantPath(c, c.membI, sx, sy); ctx.stroke();
      ctx.restore();
    }
    ctx.scale(sx, sy);
    // 흐르는 알갱이
    ctx.fillStyle = 'rgba(90,140,70,.32)';
    ctx.beginPath(); c.dots.forEach((d) => { ctx.moveTo(d.x + d.r, d.y); ctx.arc(d.x, d.y, d.r, 0, TAU); }); ctx.fill();
    c.mito.forEach((m) => drawMito(m, m.glow || 0));
    drawNucleus(c.nuc, o.nucGlow || 0, t);
    c.chl.forEach((h) => drawChloroplast(h, h.glow || 0));
    if (o.fx) o.fx();
    ctx.restore();
  }
  function drawAnimalCell(cx, cy, sc, t, o) {
    o = o || {};
    const c = ANIMAL;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.save();
    ctx.shadowColor = 'rgba(120,40,60,.22)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 9;
    animalPath(c, 0); ctx.fillStyle = '#fbd5cf'; ctx.fill();
    ctx.restore();
    const g = ctx.createRadialGradient(-50, -60, 10, 0, 0, c.R0 * 1.1);
    g.addColorStop(0, '#fff6f2'); g.addColorStop(1, '#fbd9d0');
    animalPath(c, 0); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#e0718d'; ctx.lineWidth = 4; animalPath(c, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,244,.95)'; ctx.lineWidth = 1.3; animalPath(c, 2.4); ctx.stroke();
    ctx.fillStyle = 'rgba(190,100,110,.28)';
    ctx.beginPath(); c.dots.forEach((d) => { ctx.moveTo(d.x + d.r, d.y); ctx.arc(d.x, d.y, d.r, 0, TAU); }); ctx.fill();
    c.mito.forEach((m) => drawMito(m, 0));
    drawNucleus(c.nuc, 0, t);
    ctx.restore();
  }

  // 누르기 판정 (세포 좌표)
  function seK(c, x, y, inset) {
    const a = c.a - inset, b = c.b - inset;
    return Math.pow(Math.pow(Math.abs(x) / a, c.n) + Math.pow(Math.abs(y) / b, c.n), 1 / c.n);
  }
  // 타원 안에 있는지 (엽록체·미토콘드리아 누르기 판정용)
  function inEll(x, y, cx, cy, ang, a, b) {
    const dx = x - cx, dy = y - cy, c = Math.cos(ang), s = Math.sin(ang);
    const u = dx * c + dy * s, v = -dx * s + dy * c;
    return (u * u) / (a * a) + (v * v) / (b * b) <= 1;
  }
  function hitPlant(x, y) {
    const c = PLANT;
    for (let i = c.chl.length - 1; i >= 0; i--) { const h = c.chl[i]; if (inEll(x, y, h.x, h.y, h.ang, 17 * h.s + 4, 9.5 * h.s + 4)) return { key: 'chl', inst: i }; }
    for (let i = 0; i < c.mito.length; i++) { const m = c.mito[i]; if (inEll(x, y, m.x, m.y, m.ang, 16 * m.s + 5, 8 * m.s + 5)) return { key: 'mito', inst: i }; }
    if (Math.hypot(x - c.nuc.x, y - c.nuc.y) < c.nuc.r + 5) return { key: 'nuc' };
    const k0 = seK(c, x, y, 0);
    if (k0 > 1.06) return null;
    if (seK(c, x, y, c.wallT) >= 1) { const k = seK(c, x, y, 7); return { key: 'wall', ux: x / k, uy: y / k }; }
    if (seK(c, x, y, 31) >= 1) { const k = seK(c, x, y, c.membI); return { key: 'memb', ux: x / k, uy: y / k }; }
    return { key: null };
  }
  function hitAnimal(x, y) {
    const c = ANIMAL;
    for (let i = 0; i < c.mito.length; i++) { const m = c.mito[i]; if (inEll(x, y, m.x, m.y, m.ang, 16 * m.s + 5, 8 * m.s + 5)) return { key: 'mito', inst: i }; }
    if (Math.hypot(x - c.nuc.x, y - c.nuc.y) < c.nuc.r + 5) return { key: 'nuc' };
    const th = Math.atan2(y / c.ay, x / c.ax), d = Math.hypot(x / c.ax, y / c.ay), R = animalRad(c, th);
    if (d > R + 12) return null;
    if (d >= R - 16) return { key: 'memb', th };
    return { key: null };
  }
  // 이름표 기준점 (세포 좌표)
  function anchorOf(cell, key, lab) {
    const c = cell === 'plant' ? PLANT : ANIMAL;
    if (key === 'nuc') return [c.nuc.x, c.nuc.y - c.nuc.r * 0.2];
    if (key === 'chl') { const h = c.chl[lab.inst] || c.chl[0]; return [h.x, h.y]; }
    if (key === 'mito') { const m = c.mito[lab.inst] || c.mito[0]; return [m.x, m.y]; }
    if (cell === 'animal' && key === 'memb') { const R = animalRad(c, lab.th); return [Math.cos(lab.th) * R * c.ax, Math.sin(lab.th) * R * c.ay]; }
    return [lab.ux, lab.uy];
  }

  /* ---------- 세포 모형 장면 ---------- */
  function cellOf(kind) { return LAY.model.cells.find((c) => c.kind === kind); }
  function drawLabels(cellKind, C, t) {
    const labs = S.labels[cellKind];
    const placed = [];
    KEYS.forEach((key) => {
      const lab = labs[key];
      if (!lab) return;
      const a = anchorOf(cellKind, key, lab);
      const ax = C.cx + a[0] * C.sc, ay = C.cy + a[1] * C.sc;
      let dx = a[0], dy = a[1];
      if (key === 'nuc') { dx = -0.4; dy = -1; }
      const dl = Math.hypot(dx, dy) || 1;
      const out = key === 'wall' || key === 'memb' ? 30 : 44;
      let lx = ax + (dx / dl) * out, ly = ay + (dy / dl) * out;
      const picked = S.pickMode && cellKind === 'plant' && S.picks.has(key);
      const s = (picked ? '✔ ' : '') + ST[key].name;
      ctx.font = font(15, 800);
      const w = ctx.measureText(s).width + 22;
      lx = clamp(lx, w / 2 + 4, W - w / 2 - 4); ly = clamp(ly, 16, H - 16);
      // 앞에 놓인 이름표와 겹치면 위·아래로 비켜 놓기
      const dir = ly >= ay ? 1 : -1;
      for (let k = 0; k < 6; k++) {
        const hit = placed.some((q) => Math.abs(q.x - lx) < (q.w + w) / 2 + 4 && Math.abs(q.y - ly) < 30);
        if (!hit) break;
        ly = clamp(ly + dir * 31, 16, H - 16);
      }
      placed.push({ x: lx, y: ly, w });
      const age = now() - lab.t0;
      const sc = age < 0.35 ? EASE.outBack(clamp(age / 0.35, 0, 1)) : 1;
      ctx.strokeStyle = picked ? '#dc2626' : ST[key].color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.fillStyle = picked ? '#dc2626' : ST[key].color; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(lx, ly); ctx.scale(sc, sc);
      pill(s, 0, 0, { size: 15, bg: picked ? '#dc2626' : '#fff', color: picked ? '#fff' : ST[key].color, border: picked ? null : ST[key].color, borderW: 2, shadow: true });
      ctx.restore();
    });
  }
  function drawModelScene(t) {
    const M = LAY.model;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f3faf2'); g.addColorStop(1, '#e4f0e6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 배경 무늬 (가장자리가 번지는 부드러운 빛)
    [[W * 0.1, H * 0.2, 150], [W * 0.9, H * 0.82, 170]].forEach((b) => {
      const gl = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
      gl.addColorStop(0, 'rgba(255,255,255,.62)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, TAU); ctx.fill();
    });
    const P = cellOf('plant'), A = cellOf('animal');
    // 제목
    const ty1 = M.titleY, ty2 = TALL ? M.titleY2 : M.titleY;
    pill('🌿 식물 세포 (잎)', P.cx, TALL ? ty1 : ty1 - 70, { size: 16, bg: '#dcfce7', color: '#166534' });
    pill('🐾 동물 세포', A.cx, TALL ? ty2 : ty2 - 70, { size: 16, bg: '#ffe4e6', color: '#9f1239' });
    drawPlantCell(P.cx, P.cy, P.sc, t, {});
    drawAnimalCell(A.cx, A.cy, A.sc, t, {});
    // 선택 모드: 고른 구조 강조
    if (S.pickMode) {
      S.picks.forEach((key) => highlightStruct('plant', P, key, t, '#dc2626'));
    }
    drawLabels('plant', P, t);
    drawLabels('animal', A, t);
    if (S.pickMode) {
      const s = '👆 식물 세포에서 고르기 · 고른 구조 ' + S.picks.size + '개';
      pill(s, W / 2, TALL ? H - 22 : H - 24, { size: 14, bg: '#1f2937', color: '#fff' });
    }
    if (isNew('model')) newRing({ x: 14, y: TALL ? 20 : 60, w: W - 28, h: TALL ? H - 40 : H - 80 }, 20);
  }
  function highlightStruct(cellKind, C, key, t, color) {
    const a = 0.55 + 0.45 * Math.sin(t * 5);
    ctx.save();
    ctx.translate(C.cx, C.cy); ctx.scale(C.sc, C.sc);
    ctx.strokeStyle = SciSim.color.rgba(color, a); ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
    if (cellKind === 'plant' && key === 'wall') { plantPath(PLANT, -4, 1, 1); ctx.stroke(); }
    else if (cellKind === 'plant' && key === 'memb') { plantPath(PLANT, PLANT.membI + 5, 1, 1); ctx.stroke(); }
    else if (key === 'nuc') { const n = PLANT.nuc; ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 7, 0, TAU); ctx.stroke(); }
    else if (key === 'chl') { PLANT.chl.forEach((h) => { ctx.beginPath(); ctx.ellipse(h.x, h.y, 22, 15, h.ang, 0, TAU); ctx.stroke(); }); }
    else if (key === 'mito') { PLANT.mito.forEach((m) => { ctx.beginPath(); ctx.ellipse(m.x, m.y, 22, 14, m.ang, 0, TAU); ctx.stroke(); }); }
    ctx.restore();
  }

  /* =========================================================
     3. 구조와 기능 (기능 애니메이션 + 기능 카드)
     ========================================================= */
  const FN_DUR = 3.4;
  const fnTau = () => (S.fn ? now() - S.fn.t0 : 99);
  const MEMB_PARTS = (function () {
    const R = rng(55);
    const out = [];
    for (let i = 0; i < 9; i++) {
      const big = i % 3 === 2;
      out.push({ big, x: -110 + i * 26 + (R() - 0.5) * 10, delay: i * 0.22 + R() * 0.1, r: big ? 9 : 4.5 });
    }
    return out;
  })();
  function playFn(key) {
    S.fn = { key, t0: now() };
    Sound.tone(key === 'mito' ? 760 : key === 'chl' ? 660 : 560, 0.12, 'triangle', 0.07);
    if (key === 'mito') {
      // 에너지 불꽃 (몇 번 터짐)
      [1.2, 1.9, 2.6].forEach((d, k) => setTimeout(() => {
        if (!S.fn || S.fn.key !== 'mito' || S.scene !== 'func') return;
        const C = LAY.func.cell;
        PLANT.mito.forEach((m, i) => {
          if ((i + k) % 2) return;
          PFX.burst(C.cx + m.x * C.sc, C.cy + m.y * C.sc, { count: 9, colors: ['#facc15', '#fb923c', '#fde047'], speed: 110, gravity: 0, size: 3.4, shape: 'star', life: 0.7 });
        });
      }, d * 1000));
    }
  }
  function fnGlows() {
    // 기능 애니메이션에 따라 세포 소기관이 빛남
    const tau = fnTau(), key = S.fn ? S.fn.key : null;
    PLANT.chl.forEach((h) => { h.glow = 0; });
    PLANT.mito.forEach((m) => { m.glow = 0; });
    if (!key || tau > FN_DUR + 0.5) return {};
    const fade = clamp((FN_DUR + 0.5 - tau) / 0.5, 0, 1);
    const o = {};
    if (key === 'nuc') {
      o.nucGlow = (0.6 + 0.4 * Math.sin(tau * 6)) * fade;
      const ringR = (tau % 1.1) * 260;
      const all = PLANT.chl.concat(PLANT.mito);
      all.forEach((x) => { const d = Math.hypot(x.x - PLANT.nuc.x, x.y - PLANT.nuc.y); x.glow = Math.exp(-Math.pow((ringR - d) / 30, 2)) * 0.9 * fade; });
    } else if (key === 'chl') {
      PLANT.chl.forEach((h) => { h.glow = clamp((tau - 0.5) / 0.6, 0, 1) * (0.7 + 0.3 * Math.sin(tau * 5 + h.u0)) * fade; });
    } else if (key === 'mito') {
      PLANT.mito.forEach((m) => { m.glow = clamp((tau - 0.9) / 0.4, 0, 1) * (0.7 + 0.3 * Math.sin(tau * 9 + m.p)) * fade; });
    } else if (key === 'memb') {
      o.membGlow = (0.35 + 0.25 * Math.sin(tau * 5)) * fade;
    } else if (key === 'wall') {
      const press = tau < 0.4 ? 0 : tau < 1.3 ? EASE.inOutSine((tau - 0.4) / 0.9) : tau < 2.4 ? 1 - EASE.outElastic(clamp((tau - 1.3) / 1.1, 0, 1)) : 0;
      o.squeeze = press;
      o.wallGlow = clamp(press * 1.2, 0, 1) * 0.8 * fade;
    }
    return o;
  }
  // 세포 좌표계 안에서 그리는 효과
  function fnEffects(t) {
    const tau = fnTau(), key = S.fn ? S.fn.key : null;
    if (!key || tau > FN_DUR + 0.5) return;
    const fade = clamp((FN_DUR + 0.5 - tau) / 0.5, 0, 1);
    const c = PLANT;
    ctx.save();
    ctx.globalAlpha = fade;
    if (key === 'nuc') {
      for (let k = 0; k < 3; k++) {
        const u = tau - k * 0.37;
        if (u < 0) continue;
        const r = c.nuc.r + (u % 1.1) * 240;
        const a = clamp(1 - (u % 1.1) / 1.1, 0, 1);
        ctx.strokeStyle = 'rgba(139,92,246,' + (0.55 * a).toFixed(3) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c.nuc.x, c.nuc.y, r, 0, TAU); ctx.stroke();
      }
    } else if (key === 'memb') {
      MEMB_PARTS.forEach((p) => {
        const u = tau - p.delay;
        if (u < 0) return;
        const top = -c.b - 70, membY = -(c.b - c.membI) * plantRad(c, -Math.PI / 2) + 2;
        let y, a = 1;
        if (!p.big) {
          y = top + EASE.inOutSine(clamp(u / 1.6, 0, 1)) * (membY + 80 - top);
        } else {
          const stop = membY - p.r - 2;
          if (u < 1.0) y = top + EASE.outCubic(u / 1.0) * (stop - top);
          else { const v = clamp((u - 1.0) / 1.0, 0, 1); y = stop - EASE.outCubic(v) * 70; a = 1 - v * 0.8; }
          if (u > 0.95 && u < 1.25) { ctx.fillStyle = 'rgba(239,68,68,.35)'; ctx.beginPath(); ctx.arc(p.x, stop + p.r, 14, 0, TAU); ctx.fill(); }
        }
        ctx.save(); ctx.globalAlpha *= a;
        D.sphere(p.x, y, p.r, p.big ? '#ef4444' : '#3b82f6', { gloss: p.r > 5 });
        ctx.restore();
      });
    } else if (key === 'wall') {
      const press = tau < 0.4 ? 0 : tau < 1.3 ? EASE.inOutSine((tau - 0.4) / 0.9) : tau < 2.4 ? 1 - clamp((tau - 1.3) / 0.5, 0, 1) : 0;
      const L = 22 + press * 14;
      ['l', 'r', 't'].forEach((s) => {
        let x1, y1, x2, y2;
        if (s === 'l') { x2 = -c.a - 4; y2 = 0; x1 = x2 - L - 18; y1 = 0; }
        else if (s === 'r') { x2 = c.a + 4; y2 = 0; x1 = x2 + L + 18; y1 = 0; }
        else { x2 = 0; y2 = -c.b - 4; x1 = 0; y1 = y2 - L - 18; }
        D.arrow(x1, y1, x2, y2, { color: '#64748b', width: 6, head: 14 });
      });
      if (tau > 1.2 && tau < 2.8) {
        const k = clamp((tau - 1.2) / 1.6, 0, 1);
        ctx.strokeStyle = 'rgba(250,204,21,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 4;
        plantPath(c, -6 - k * 18, 1, 1); ctx.stroke();
      }
    } else if (key === 'chl') {
      // 햇빛
      for (let k = 0; k < 6; k++) {
        const h = c.chl[(k * 3) % c.chl.length];
        const sx = -60 + k * 34, sy = -c.b - 76;
        const u = clamp(tau / 0.8 - k * 0.08, 0, 1);
        const ex = lerp(sx, h.x, u), ey = lerp(sy, h.y, u);
        ctx.strokeStyle = 'rgba(250,204,21,.85)'; ctx.lineWidth = 3; ctx.setLineDash([9, 7]);
        ctx.lineDashOffset = -tau * 40;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
      }
      D.glow(-10, -c.b - 84, 46, '#fde047', 0.75);
      D.sphere(-10, -c.b - 84, 18, '#facc15', { gloss: true });
      // 양분 반짝이
      if (tau > 1.0) {
        c.chl.forEach((h, i) => {
          if (i % 3) return;
          const u = ((tau - 1.0 + i * 0.13) % 1.4) / 1.4;
          const x = h.x * (1 - u * 0.45), y = h.y * (1 - u * 0.45);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * (1 - u)).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(234,179,8,' + (0.9 * (1 - u)).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        });
        const h = c.chl[0];
        pill('양분', h.x * 0.7, h.y * 0.7 - 18, { size: 13, bg: '#fef9c3', color: '#854d0e' });
      }
    } else if (key === 'mito') {
      // 양분 → 미토콘드리아
      c.mito.forEach((m, i) => {
        for (let k = 0; k < 2; k++) {
          const u = clamp((tau - k * 0.35 - i * 0.05) / 1.0, 0, 1);
          if (u >= 1) continue;
          const sx = m.x * 0.25 + (k ? 40 : -40), sy = m.y * 0.25 + (k ? -30 : 30);
          const x = lerp(sx, m.x, EASE.inOutSine(u)), y = lerp(sy, m.y, EASE.inOutSine(u));
          ctx.fillStyle = '#fffbea'; ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.stroke();
        }
      });
      if (tau > 1.3) {
        const m = c.mito[0];
        pill('⚡ 에너지', m.x, m.y - 30, { size: 13, bg: '#fff7ed', color: '#c2410c', border: '#fdba74', borderW: 1.5 });
      }
    }
    ctx.restore();
  }

  /* ---------- 카드 끌어 놓기 (기능 카드 · 하는 일 카드) ---------- */
  function makeCards(defs) {
    return defs.map((d, i) => ({ key: d.key, text: d.text, home: i, slot: -1, x: 0, y: 0, w: 100, h: 50, lift: 0, bad: -9, ok: false, tw: null }));
  }
  const FUNC_ORDER = ['wall', 'memb', 'nuc', 'chl', 'mito'];
  const fnCards = makeCards(shuffled(FUNC_ORDER, 3).map((k) => ({ key: k, text: ST[k].card })));
  const SHAPES = [
    { key: 'rbc', name: '적혈구', icon: '🔴', shape: '가운데가 오목한 원반 모양', job: '산소를 운반해요', color: '#dc2626' },
    { key: 'neuron', name: '신경세포', icon: '⚡', shape: '길게 뻗은 돌기가 있어요', job: '자극을 전달해요', color: '#7c3aed' },
    { key: 'epi', name: '상피세포', icon: '🛡️', shape: '납작하고 빽빽하게 붙어 있어요', job: '몸의 표면을 덮어 보호해요', color: '#0f766e' },
  ];
  const jobCards = makeCards(shuffled([0, 1, 2], 11).map((i) => ({ key: SHAPES[i].key, text: SHAPES[i].job })));
  function shuffled(arr, seed) {
    const R = rng(seed), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    if (a.every((v, i) => v === arr[i])) a.push(a.shift());
    return a;
  }
  function trayRect(T, i, n) {
    const cols = T.cols, w = (T.w - T.gap * (cols - 1)) / cols;
    const col = i % cols, row = Math.floor(i / cols);
    return { x: T.x + col * (w + T.gap), y: T.y + row * (T.cardH + T.gap), w, h: T.cardH };
  }
  // 기능 카드가 없을 때는 표가 크게, 카드가 나오면 작게 줄어듦
  function fnMetrics() {
    const T = LAY.func.table, k = S.fnK;
    return { rowH: lerp(T.rowHBig || T.rowH, T.rowH, k), gap: lerp(T.gapBig != null ? T.gapBig : T.gap, T.gap, k) };
  }
  function funcSlotRect(i) {
    const T = LAY.func.table, m = fnMetrics();
    const y = T.y + i * (m.rowH + m.gap);
    return { x: T.x + T.nameW, y: y + 4, w: T.w - T.nameW - 4, h: m.rowH - 8 };
  }
  function funcRowRect(i) { const T = LAY.func.table, m = fnMetrics(); return { x: T.x, y: T.y + i * (m.rowH + m.gap), w: T.w, h: m.rowH }; }
  function shapeSlotRect(i) {
    const s = LAY.shape.slots[i];
    if (TALL) return { x: s.x + 108, y: s.y + 6, w: s.w - 114, h: s.h - 12 };
    return { x: s.x + 10, y: s.y + 52, w: s.w - 20, h: 80 };
  }
  function cardTarget(cd, set) {
    if (set === 'func') return cd.slot >= 0 ? funcSlotRect(cd.slot) : trayRect(LAY.func.tray, cd.home, 5);
    return cd.slot >= 0 ? shapeSlotRect(cd.slot) : trayRect(LAY.shape.tray, cd.home, 3);
  }
  function snapCards(set, animate) {
    const list = set === 'func' ? fnCards : jobCards;
    list.forEach((cd) => {
      const r = cardTarget(cd, set);
      cd.w = r.w; cd.h = r.h;
      if (animate && !RM) { cd.tw = SciSim.tween(cd, { x: r.x, y: r.y }, { duration: 0.42, ease: 'outBack' }); }
      else { if (cd.tw) cd.tw.cancel(); cd.x = r.x; cd.y = r.y; }
    });
  }
  function resetCards(set) {
    const list = set === 'func' ? fnCards : jobCards;
    list.forEach((cd) => { cd.slot = -1; cd.ok = false; cd.bad = -9; });
    snapCards(set, false);
  }
  function drawCard(cd, t, accent) {
    const lift = cd.lift;
    const sc = 1 + 0.05 * lift;
    let shake = 0;
    const ba = t - cd.bad;
    if (ba < 0.55) shake = Math.sin(ba * 42) * 7 * (1 - ba / 0.55);
    ctx.save();
    ctx.translate(cd.x + cd.w / 2 + shake, cd.y + cd.h / 2 - lift * 3);
    ctx.scale(sc, sc);
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,30,' + (0.16 + lift * 0.14).toFixed(3) + ')'; ctx.shadowBlur = 6 + lift * 16; ctx.shadowOffsetY = 2 + lift * 7;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, 12); ctx.fillStyle = cd.ok ? '#f0fdf4' : '#fff'; ctx.fill();
    ctx.restore();
    const bad = ba < 1.2;
    rr(-cd.w / 2, -cd.h / 2, cd.w, cd.h, 12);
    ctx.strokeStyle = bad ? '#ef4444' : cd.ok ? '#22c55e' : accent || '#c9d4e2'; ctx.lineWidth = bad || cd.ok ? 2.5 : 1.8; ctx.stroke();
    ctx.fillStyle = accent || '#94a3b8'; rr(-cd.w / 2 + 6, -cd.h / 2 + 8, 5, cd.h - 16, 2.5); ctx.fill();
    const size = cd.h < 52 ? 13.5 : 14.5;
    const ls = lines(cd.text, cd.w - 30, size, 800);
    const lh = size * 1.3;
    ls.forEach((ln, i) => txt(ln, 6, (i - (ls.length - 1) / 2) * lh + 1, { size, weight: 800, align: 'center', base: 'middle', color: '#1e293b' }));
    if (cd.ok) { D.check(cd.w / 2 - 14, -cd.h / 2 + 14, 9, 1); }
    ctx.restore();
  }
  function cardAt(list, p) {
    for (let i = list.length - 1; i >= 0; i--) if (inR(p, list[i], 4)) return list[i];
    return null;
  }
  function placeCard(list, set, cd, slot) {
    const other = list.find((o) => o !== cd && o.slot === slot);
    if (other) { other.slot = cd.slot >= 0 && cd.slot !== slot ? cd.slot : -1; other.ok = false; }
    cd.slot = slot; cd.ok = false;
    Sound.tick();
    snapCards(set, true);
  }

  /* ---------- 구조와 기능 장면 ---------- */
  function drawStructIcon(key, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (key === 'wall') { ctx.fillStyle = '#c4d47e'; rr(-15, -12, 30, 24, 7); ctx.fill(); ctx.fillStyle = '#f2f8e6'; rr(-10, -7, 20, 14, 4); ctx.fill(); ctx.strokeStyle = '#7c9433'; ctx.lineWidth = 1.5; rr(-15, -12, 30, 24, 7); ctx.stroke(); }
    else if (key === 'memb') { ctx.fillStyle = '#fbf3df'; rr(-13, -11, 26, 22, 6); ctx.fill(); ctx.strokeStyle = '#e0a82e'; ctx.lineWidth = 3.2; ctx.stroke(); }
    else if (key === 'nuc') { D.sphere(0, 0, 11, '#8b6ad8', { gloss: true }); }
    else if (key === 'chl') { drawChloroplast({ x: 0, y: 0, ang: -0.3, s: 0.78 }, 0); }
    else if (key === 'mito') { drawMito({ x: 0, y: 0, ang: -0.3, s: 0.72 }, 0); }
    ctx.restore();
  }
  function drawFuncScene(t) {
    const Fl = LAY.func;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f2f9f3'); g.addColorStop(1, '#e3efe6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const C = Fl.cell;
    const glows = fnGlows();
    drawPlantCell(C.cx, C.cy, C.sc, t, Object.assign({ fx: () => fnEffects(t) }, glows));
    // 선택한 구조 표시
    const key = S.fn && fnTau() < FN_DUR + 0.5 ? S.fn.key : null;
    // 설명 상자
    const cp = Fl.cap;
    panel(cp.x, cp.y, cp.w, cp.h, { bg: key ? ST[key].soft : '#fff', border: key ? ST[key].color : '#dbe3ec', bw: 2 });
    const showKey = S.fn ? S.fn.key : null;
    if (showKey) {
      drawStructIcon(showKey, cp.x + 30, cp.y + 30, 1);
      txt(ST[showKey].name + ST[showKey].ga + ' 하는 일', cp.x + 54, cp.y + 36, { size: 17, weight: 800, color: ST[showKey].color, max: cp.w - 64 });
      para(ST[showKey].fn, cp.x + 16, cp.y + 64, cp.w - 30, { size: 15, weight: 700, color: '#1f2937' });
    } else {
      txt('👆 세포의 구조를 눌러 보세요', cp.x + 16, cp.y + 34, { size: 17, weight: 800, color: '#166534' });
      para('구조를 누르면 그 구조가 하는 일을 움직이는 그림으로 보여 줘요.', cp.x + 16, cp.y + 62, cp.w - 30, { size: 14.5, weight: 700, color: '#475569' });
    }
    // 오른쪽 표: 구조 이름 + 기능 칸
    const hot = dragSlot('func');
    FUNC_ORDER.forEach((k, i) => {
      const r = funcRowRect(i);
      const active = key === k;
      panel(r.x, r.y, r.w, r.h, { bg: active ? ST[k].soft : '#fff', border: active ? ST[k].color : '#e2e8f0', r: 14, bw: active ? 2 : 1.2 });
      if (hot === i) slotGlow(r, 14);
      const T = LAY.func.table;
      drawStructIcon(k, r.x + 24, r.y + r.h / 2, (TALL ? 0.85 : 0.95) + (1 - S.fnK) * (TALL ? 0 : 0.2));
      txt(ST[k].name, r.x + 46, r.y + r.h / 2 + 5, { size: 15, weight: 800, color: ST[k].color, max: T.nameW - 50 });
      const sr = funcSlotRect(i);
      if (S.fnCards) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#b8c4d4'; ctx.lineWidth = 1.6;
        rr(sr.x, sr.y, sr.w, sr.h, 11); ctx.stroke(); ctx.restore();
        if (!fnCards.some((cd) => cd.slot === i)) txt('기능 카드를 여기에', sr.x + sr.w / 2, sr.y + sr.h / 2 + 5, { size: 13, weight: 700, color: '#94a3b8', align: 'center' });
      } else {
        const seen = !!S.watched[k];
        txt(seen ? '✅ 살펴봤어요' : '👆 눌러서 살펴보기', sr.x + sr.w - 8, sr.y + sr.h / 2 + 5, { size: 14, weight: 800, color: seen ? '#15803d' : '#64748b', align: 'right' });
      }
    });
    if (S.fnCards) {
      const T = Fl.tray;
      txt('🃏 기능 카드', T.x + 2, T.y - 6, { size: 13, weight: 800, color: '#475569' });
      const dragCd = S.drag && S.drag.set === 'func' ? S.drag.card : null;
      fnCards.forEach((cd) => { if (cd !== dragCd) drawCard(cd, t, '#16a34a'); });
      if (dragCd) drawCard(dragCd, t, '#16a34a');
    }
    if (isNew('func')) { const T = Fl.table, m = fnMetrics(); newRing({ x: T.x, y: T.y, w: T.w, h: 5 * (m.rowH + m.gap) - m.gap }, 14); }
  }

  /* =========================================================
     4. 모양과 기능 (적혈구 · 신경세포 · 상피세포)
     ========================================================= */
  const NEURON = (function () {
    const R = rng(31);
    const dend = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.55 + (i / 5) * Math.PI * 0.9 + (R() - 0.5) * 0.2;
      const len = 30 + R() * 18;
      const sub = [];
      for (let k = 0; k < 2; k++) sub.push({ a: a + (k ? 0.5 : -0.5) + (R() - 0.5) * 0.3, len: 12 + R() * 10 });
      dend.push({ a, len, sub });
    }
    return { dend };
  })();
  const GERMS = (function () { const R = rng(91); const a = []; for (let i = 0; i < 6; i++) a.push({ x: R(), ph: R(), sp: 0.55 + R() * 0.3, c: ['#65a30d', '#a855f7', '#0891b2'][i % 3] }); return a; })();
  function drawRBC(x, y, d, tumble, squash) {
    const w = d * (0.42 + 0.58 * Math.abs(Math.cos(tumble))) * (1 - squash * 0.25);
    const h = d * (1 - squash * 0.42);
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-w * 0.12, -h * 0.12, 1, 0, 0, Math.max(w, h) / 2);
    g.addColorStop(0, '#f8a5a5'); g.addColorStop(0.42, '#ef5350'); g.addColorStop(0.8, '#c62828'); g.addColorStop(1, '#9b1c1c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,205,205,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.2, h * 0.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function rowTitle(R, sh, i) {
    txt(sh.icon + ' ' + sh.name, R.x + 14, R.y + 26, { size: 17, weight: 800, color: sh.color });
    ctx.font = font(17, 800);
    const w = ctx.measureText(sh.icon + ' ' + sh.name).width;
    txt(sh.shape, R.x + 22 + w, R.y + 26, { size: 13.5, weight: 700, color: '#475569', max: R.w - w - 36 });
    if (S.shapeOK[i]) D.check(R.x + R.w - 18, R.y + 20, 11, 1);
  }
  function drawRBCRow(R, t) {
    const sh = SHAPES[0];
    panel(R.x, R.y, R.w, R.h, { bg: '#fff7f7', border: '#fecaca' });
    rowTitle(R, sh, 0);
    const vy = R.y + R.h * 0.62, x0 = R.x + 14, x1 = R.x + R.w - 14;
    const halfH = (x) => { const u = (x - x0) / (x1 - x0); return 30 - 11 * Math.exp(-Math.pow((u - 0.55) / 0.12, 2)); };
    // 혈관
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, vy - halfH(x) - 6);
    for (let x = x1; x >= x0; x -= 6) ctx.lineTo(x, vy + halfH(x) + 6);
    ctx.closePath(); ctx.fillStyle = '#f9b4b4'; ctx.fill();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, vy - halfH(x));
    for (let x = x1; x >= x0; x -= 6) ctx.lineTo(x, vy + halfH(x));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, vy - 30, 0, vy + 30); g.addColorStop(0, '#ffe9e4'); g.addColorStop(0.5, '#fff6f3'); g.addColorStop(1, '#ffe2dc');
    ctx.fillStyle = g; ctx.fill();
    txt('폐', x0 + 4, vy - 36, { size: 13, weight: 800, color: '#64748b' });
    txt('온몸의 세포 →', x1 - 4, vy - 36, { size: 13, weight: 800, color: '#64748b', align: 'right' });
    // 적혈구 + 산소
    const tt = RM ? 0 : t;
    const span = x1 - x0 + 60, n = 6;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, R.y, x1 - x0, R.h); ctx.clip();
    for (let i = 0; i < n; i++) {
      const x = x0 - 30 + ((tt * 52 + (i * span) / n) % span);
      const hh = halfH(clamp(x, x0, x1));
      const squash = clamp((30 - hh) / 11, 0, 1);
      const d = 40;
      const tumble = tt * 1.2 + i * 1.3;
      const yy = vy + Math.sin(tt * 2 + i) * (hh - d * (1 - squash * 0.42) / 2) * 0.3;
      drawRBC(x, yy, d, tumble, squash);
      const u = (x - x0) / (x1 - x0);
      if (u > 0.03 && u < 0.85) {
        for (let k = 0; k < 2; k++) {
          const ox = (k ? 9 : -9), oy = (k ? -8 : 7);
          ctx.fillStyle = '#e0f2fe'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(x + ox, yy + oy, 4.2, 0, TAU); ctx.fill(); ctx.stroke();
        }
      } else if (u >= 0.85) {
        const k = (u - 0.85) / 0.15;
        ctx.fillStyle = 'rgba(224,242,254,' + (1 - k).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(x + 9 + k * 10, yy - 8 - k * 26, 4.2, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    // 옆에서 본 모양 (오목한 원반)
    {
      const ix = R.x + R.w - 112, iy = R.y + 24;     // 제목 줄 오른쪽에 '옆에서 본 모양'
      const g2 = ctx.createLinearGradient(0, iy - 9, 0, iy + 9); g2.addColorStop(0, '#ef5350'); g2.addColorStop(1, '#b71c1c');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(ix - 20, iy); ctx.bezierCurveTo(ix - 20, iy - 9, ix - 8, iy - 8, ix, iy - 3); ctx.bezierCurveTo(ix + 8, iy - 8, ix + 20, iy - 9, ix + 20, iy);
      ctx.bezierCurveTo(ix + 20, iy + 9, ix + 8, iy + 8, ix, iy + 3); ctx.bezierCurveTo(ix - 8, iy + 8, ix - 20, iy + 9, ix - 20, iy); ctx.fill();
      txt('옆모습', ix + 26, iy + 5, { size: 13, weight: 700, color: '#64748b' });
    }
    pill('산소', x0 + 70, vy + 44, { size: 13, bg: '#e0f2fe', color: '#075985' });
  }
  function drawNeuronRow(R, t) {
    const sh = SHAPES[1];
    panel(R.x, R.y, R.w, R.h, { bg: '#faf7ff', border: '#ddd6fe' });
    rowTitle(R, sh, 1);
    const sx = R.x + 64, sy = R.y + R.h * 0.62;
    const ex = R.x + R.w - 70;
    const ay = (x) => sy + Math.sin((x - sx) / 60) * 6;
    // 근육 (자극을 받는 곳)
    const tt = RM ? 0 : t;
    const period = 2.4, ph = (tt % period) / period;
    const pulseX = sx + (ph - 0.12) / 0.7 * (ex - sx);
    const hit = ph > 0.82 ? 1 - (ph - 0.82) / 0.18 : 0;
    ctx.save();
    ctx.translate(ex + 34, sy);
    ctx.scale(1 - hit * 0.08, 1);
    ctx.fillStyle = '#fca5a5'; rr(-14, -34, 40, 68, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(185,28,28,.35)'; ctx.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-10, k * 12); ctx.lineTo(22, k * 12); ctx.stroke(); }
    ctx.restore();
    txt('근육', ex + 40, sy + 52, { size: 13, weight: 800, color: '#64748b', align: 'center' });
    // 가지 돌기
    ctx.strokeStyle = '#8b5cf6'; ctx.lineCap = 'round';
    NEURON.dend.forEach((dd) => {
      const x2 = sx + Math.cos(dd.a) * dd.len, y2 = sy + Math.sin(dd.a) * dd.len;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x2, y2); ctx.stroke();
      dd.sub.forEach((s) => { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 + Math.cos(s.a) * s.len, y2 + Math.sin(s.a) * s.len); ctx.stroke(); });
    });
    // 축삭 (긴 돌기)
    ctx.lineWidth = 6.5; ctx.strokeStyle = '#8b5cf6';
    ctx.beginPath(); for (let x = sx; x <= ex; x += 6) ctx.lineTo(x, ay(x)); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#ddd6fe';
    ctx.beginPath(); for (let x = sx + 20; x <= ex; x += 6) ctx.lineTo(x, ay(x) - 1); ctx.stroke();
    // 축삭 끝
    [-0.7, -0.25, 0.25, 0.7].forEach((a) => {
      const x2 = ex + Math.cos(a) * 26, y2 = ay(ex) + Math.sin(a) * 26;
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex, ay(ex)); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(x2, y2, 4.5, 0, TAU); ctx.fill();
    });
    // 신경세포체
    D.sphere(sx, sy, 22, '#a78bfa', { gloss: true });
    D.sphere(sx + 2, sy + 1, 8, '#5b21b6', { gloss: false });
    // 자극 신호
    if (ph > 0.12 && ph < 0.82) {
      const x = clamp(pulseX, sx, ex), y = ay(x);
      D.glow(x, y, 26, '#facc15', 0.85);
      D.sphere(x, y, 6, '#fde047', { gloss: false });
    }
    if (hit > 0) { D.glow(ex + 40, sy, 50 * hit + 10, '#facc15', 0.6 * hit); }
    if (!RM && ph < 0.12) { D.glow(sx, sy, 34, '#facc15', 0.6 * (1 - ph / 0.12)); }
    txt('자극 →', sx + 70, sy + 34, { size: 13, weight: 800, color: '#6d28d9' });
  }
  function drawEpiRow(R, t) {
    const sh = SHAPES[2];
    panel(R.x, R.y, R.w, R.h, { bg: '#f0fbfa', border: '#99f6e4' });
    rowTitle(R, sh, 2);
    const top = R.y + R.h * 0.56, x0 = R.x + 12, x1 = R.x + R.w - 12;
    // 몸속 (아래)
    ctx.fillStyle = '#fde2e2'; rr(x0, top + 30, x1 - x0, R.y + R.h - 10 - top - 30, 10); ctx.fill();
    txt('몸속', x1 - 8, R.y + R.h - 18, { size: 13, weight: 800, color: '#b45309', align: 'right' });
    txt('몸 밖', x1 - 8, R.y + 48, { size: 13, weight: 800, color: '#0369a1', align: 'right' });
    // 납작한 세포 두 줄 (빽빽하게)
    const cw = 54, chh = 15;
    for (let row = 0; row < 2; row++) {
      const y = top + row * (chh + 1);
      for (let x = x0 - (row ? cw / 2 : 0); x < x1; x += cw + 1) {
        const xa = Math.max(x, x0), xb = Math.min(x + cw, x1);
        if (xb - xa < 6) continue;
        const g = ctx.createLinearGradient(0, y, 0, y + chh);
        g.addColorStop(0, '#99e3d8'); g.addColorStop(1, '#5fc4b5');
        ctx.fillStyle = g; rr(xa, y, xb - xa, chh, 5); ctx.fill();
        ctx.strokeStyle = '#2f9e8f'; ctx.lineWidth = 1.2; ctx.stroke();
        if (xb - xa > 26) { ctx.fillStyle = '#0f5f56'; ctx.beginPath(); ctx.ellipse((xa + xb) / 2, y + chh / 2, 8, 3, 0, 0, TAU); ctx.fill(); }
      }
    }
    // 세균·먼지가 막혀 튕겨 나감
    const tt = RM ? 0 : t;
    GERMS.forEach((gm) => {
      const u = (tt * gm.sp + gm.ph) % 1.6;
      const x = x0 + 30 + gm.x * (x1 - x0 - 80) + u * 18;
      let y;
      const surf = top - 7;
      const yStart = R.y + 40;
      if (u < 0.8) y = yStart + EASE.inQuad(u / 0.8) * (surf - yStart);
      else y = surf - EASE.outCubic((u - 0.8) / 0.8) * 34;
      const a = u < 0.8 ? 1 : 1 - (u - 0.8) / 0.8;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = gm.c; ctx.beginPath(); ctx.ellipse(x, y, 6, 4.5, u * 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = gm.c; ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { const a2 = k * 1.57 + u * 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a2) * 6, y + Math.sin(a2) * 4.5); ctx.lineTo(x + Math.cos(a2) * 9, y + Math.sin(a2) * 7); ctx.stroke(); }
      if (u > 0.78 && u < 0.92) { ctx.strokeStyle = 'rgba(20,184,166,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, surf + 6, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.restore();
    });
  }
  function drawShapeScene(t) {
    const Sl = LAY.shape;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f6f8fb'); g.addColorStop(1, '#e8eef4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawRBCRow(Sl.rows[0], t);
    drawNeuronRow(Sl.rows[1], t);
    drawEpiRow(Sl.rows[2], t);
    const hotS = dragSlot('shape');
    Sl.slots.forEach((s, i) => {
      panel(s.x, s.y, s.w, s.h, { bg: '#ffffff', border: '#e2e8f0' });
      if (hotS === i) slotGlow(s, 16);
      if (TALL) txt('하는 일', s.x + 14, s.y + s.h / 2 + 5, { size: 15, weight: 800, color: SHAPES[i].color });
      else txt('▶ 하는 일', s.x + 14, s.y + 32, { size: 15, weight: 800, color: SHAPES[i].color });
      const r = shapeSlotRect(i);
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#b8c4d4'; ctx.lineWidth = 1.6;
      rr(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.restore();
      if (!jobCards.some((cd) => cd.slot === i)) txt('카드를 여기에', r.x + r.w / 2, r.y + r.h / 2 + 5, { size: 13, weight: 700, color: '#94a3b8', align: 'center' });
    });
    const T = Sl.tray;
    txt('🃏 하는 일 카드', T.x + 2, T.y - 7, { size: 13, weight: 800, color: '#475569' });
    const dragCd = S.drag && S.drag.set === 'shape' ? S.drag.card : null;
    jobCards.forEach((cd) => { if (cd !== dragCd) drawCard(cd, t, '#0f766e'); });
    if (dragCd) drawCard(dragCd, t, '#0f766e');
    if (isNew('shape')) newRing({ x: 12, y: 10, w: W - 24, h: Sl.rows[2].y + Sl.rows[2].h - 10 }, 16);
  }

  /* =========================================================
     장면 전환 (확대해 들어가는 느낌)
     ========================================================= */
  const SCENE_ORDER = ['scope', 'model', 'func', 'shape'];
  const SCENE_LABEL = {
    scope: '🔬 광학 현미경으로 세포 관찰하기',
    model: '🧫 식물 세포와 동물 세포',
    func: '⚙️ 세포 구조가 하는 일',
    shape: '🩸 여러 가지 모양의 세포',
  };
  let snapCv = null;
  function setScene(name, instant) {
    if (S.scene === name) { updateSceneUI(); return; }
    // 지금 화면을 찍어 두고, 새 장면 위에서 커지며 사라지게
    if (!instant && !RM && view && view.canvas.width > 2) {
      if (!snapCv) snapCv = document.createElement('canvas');
      snapCv.width = view.canvas.width; snapCv.height = view.canvas.height;
      snapCv.getContext('2d').drawImage(view.canvas, 0, 0);
      S.snapOK = true;
    } else S.snapOK = false;
    S.prevScene = S.scene; S.scene = name; S.sceneT0 = now();
    S.drag = null;
    updateSceneUI();
    hideHint();
  }
  function zoomCenter(from, to) {
    if (from === 'scope') { const V = LAY.scope.view; return [V.cx, V.cy]; }
    if (from === 'model' && to === 'func') { const P = cellOf('plant'); return [P.cx, P.cy]; }
    return [W / 2, H / 2];
  }
  function drawScene(name, t) {
    if (name === 'scope') drawScopeScene(t);
    else if (name === 'model') drawModelScene(t);
    else if (name === 'func') drawFuncScene(t);
    else drawShapeScene(t);
  }
  function draw(t) {
    view.clear(BG);
    const p = S.snapOK ? clamp((now() - S.sceneT0) / 0.75, 0, 1) : 1;
    if (p < 1) {
      const fwd = SCENE_ORDER.indexOf(S.scene) > SCENE_ORDER.indexOf(S.prevScene);
      const e = EASE.inOutCubic(p);
      const zc = fwd ? zoomCenter(S.prevScene, S.scene) : [W / 2, H / 2];
      // 새 장면: 조금 작게 → 제 크기
      const s1 = fwd ? 0.82 + 0.18 * EASE.outCubic(p) : 1.12 - 0.12 * EASE.outCubic(p);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s1, s1); ctx.translate(-W / 2, -H / 2);
      drawScene(S.scene, t);
      ctx.restore();
      // 이전 장면: 확대되며 사라짐
      const s0 = fwd ? 1 + 1.6 * e : 1 - 0.2 * e;
      ctx.save();
      ctx.globalAlpha = 1 - EASE.inQuad(p);
      ctx.translate(zc[0], zc[1]); ctx.scale(s0, s0); ctx.translate(-zc[0], -zc[1]);
      ctx.drawImage(snapCv, 0, 0, W, H);
      ctx.restore();
    } else { drawScene(S.scene, t); drawHint(); }
    PFX.draw(ctx);
  }

  /* =========================================================
     입력 (누르기 · 끌기)
     ========================================================= */
  function viewHit(p) { const V = LAY.scope.view; return Math.hypot(p.x - V.cx, p.y - V.cy) <= V.r; }
  function knobHit(p) {
    const M = LAY.scope.mic;
    const c = micPt(M, -64, -168), f = micPt(M, -64, -112);
    if (Math.hypot(p.x - c.x, p.y - c.y) < 23 * M.s + 10) return 'coarse';
    if (Math.hypot(p.x - f.x, p.y - f.y) < 14 * M.s + 10) return 'fine';
    return null;
  }
  function turretHit(p) {
    const M = LAY.scope.mic, c = micPt(M, AX, -290);
    return Math.abs(p.x - c.x) < 46 * M.s && p.y > c.y - 30 * M.s && p.y < c.y + 66 * M.s;
  }
  function trayHit(p) {
    if (!S.trayOn) return null;
    return trayItems(LAY.scope.tray).find((it) => inR(p, it)) || null;
  }
  function cellHit(p) {
    // 장면에 따라 세포 좌표로 바꿔 판정
    if (S.scene === 'model') {
      for (const C of LAY.model.cells) {
        const x = (p.x - C.cx) / C.sc, y = (p.y - C.cy) / C.sc;
        const h = C.kind === 'plant' ? hitPlant(x, y) : hitAnimal(x, y);
        if (h) return Object.assign({ cell: C.kind }, h);
      }
    } else if (S.scene === 'func') {
      const C = LAY.func.cell;
      const h = hitPlant((p.x - C.cx) / C.sc, (p.y - C.cy) / C.sc);
      if (h) return Object.assign({ cell: 'plant' }, h);
    }
    return null;
  }
  function interactiveAt(p) {
    if (S.scene === 'scope') return !!(knobHit(p) || turretHit(p) || trayHit(p) || viewHit(p));
    if (S.scene === 'model') return !!cellHit(p);
    if (S.scene === 'func') return !!(cellHit(p) || (S.fnCards && cardAt(fnCards, p)) || FUNC_ORDER.some((k, i) => inR(p, funcRowRect(i))));
    return !!cardAt(jobCards, p);
  }
  const handlers = {
    hover(p) {
      if (S.scene === 'scope') {
        if (knobHit(p)) return 'ns-resize';
        if (turretHit(p) || trayHit(p)) return 'pointer';
        if (viewHit(p)) return 'crosshair';
        return null;
      }
      if (S.scene === 'func' && S.fnCards && cardAt(fnCards, p)) return 'grab';
      if (S.scene === 'shape' && cardAt(jobCards, p)) return 'grab';
      const h = cellHit(p);
      return h && h.key ? 'pointer' : null;
    },
    down(p) {
      hideHint();
      if (S.scene === 'scope') return scopeDown(p);
      if (S.scene === 'model') { modelTap(p); return false; }
      if (S.scene === 'func') {
        if (S.fnCards) { const cd = cardAt(fnCards, p); if (cd) return startDrag(cd, 'func', p); }
        const ri = FUNC_ORDER.findIndex((k, i) => inR(p, { x: funcRowRect(i).x, y: funcRowRect(i).y, w: LAY.func.table.nameW, h: funcRowRect(i).h }));
        if (ri >= 0) { tapStruct(FUNC_ORDER[ri], null); return false; }
        if (!S.fnCards) { const ri2 = FUNC_ORDER.findIndex((k, i) => inR(p, funcRowRect(i))); if (ri2 >= 0) { tapStruct(FUNC_ORDER[ri2], null); return false; } }
        const h = cellHit(p);
        if (h && h.key) tapStruct(h.key, p);
        return false;
      }
      if (S.scene === 'shape') { const cd = cardAt(jobCards, p); if (cd) return startDrag(cd, 'shape', p); }
      return false;
    },
    move(p) {
      if (S.knobDrag) { knobMove(p); return; }
      const d = S.drag;
      if (!d) return;
      d.card.x = p.x - d.dx; d.card.y = p.y - d.dy;
      d.px = p.x; d.py = p.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
    },
    up(p) {
      if (S.knobDrag) { S.knobDrag = null; return; }
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      const list = d.set === 'func' ? fnCards : jobCards;
      let slot = -1;
      if (d.set === 'func') {
        slot = FUNC_ORDER.findIndex((k, i) => inR(p, funcRowRect(i), 6));
        if (slot < 0) { const h = cellHit(p); if (h && h.key) slot = FUNC_ORDER.indexOf(h.key); }
      } else {
        slot = [0, 1, 2].findIndex((i) => inR(p, LAY.shape.slots[i], 6) || inR(p, LAY.shape.rows[i], 0));
      }
      if (slot >= 0) placeCard(list, d.set, d.card, slot);
      else { if (d.card.slot >= 0) d.card.slot = -1; snapCards(d.set, true); if (d.moved) Sound.tick(); }
    },
  };
  function dragSlot(set) {
    const d = S.drag;
    if (!d || d.set !== set || d.px == null) return -1;
    const p = { x: d.px, y: d.py };
    if (set === 'func') {
      let i = FUNC_ORDER.findIndex((k, j) => inR(p, funcRowRect(j), 6));
      if (i < 0) { const h = cellHit(p); if (h && h.key) i = FUNC_ORDER.indexOf(h.key); }
      return i;
    }
    return [0, 1, 2].findIndex((i) => inR(p, LAY.shape.slots[i], 6) || inR(p, LAY.shape.rows[i], 0));
  }
  function slotGlow(r, rad) {
    const a = 0.55 + 0.45 * Math.sin(now() * 7);
    ctx.save();
    ctx.fillStyle = 'rgba(34,197,94,.10)'; rr(r.x - 3, r.y - 3, r.w + 6, r.h + 6, rad + 3); ctx.fill();
    ctx.strokeStyle = 'rgba(22,163,74,' + (0.5 + a * 0.4).toFixed(2) + ')'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
  }
  function startDrag(cd, set, p) {
    if (cd.tw) cd.tw.cancel();
    S.drag = { card: cd, set, dx: p.x - cd.x, dy: p.y - cd.y, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false };
    const list = set === 'func' ? fnCards : jobCards;
    list.splice(list.indexOf(cd), 1); list.push(cd);       // 맨 위로
    cd.ok = false;
    Sound.click();
    return true;
  }
  function scopeDown(p) {
    const k = knobHit(p);
    if (k) { S.knobDrag = k; S.knobY = p.y; S.knobV = k === 'coarse' ? S.coarse : S.fine; Sound.tick(); return true; }
    if (turretHit(p)) { const order = [40, 100, 400]; setMag(order[(order.indexOf(S.mag) + 1) % 3]); return false; }
    const it = trayHit(p);
    if (it) { if (it.k === 'dye') stainNow(); else putSlide(it.k); return false; }
    if (viewHit(p)) { tapView(p); return false; }
    return false;
  }
  function knobMove(p) {
    const dy = S.knobY - p.y;
    if (S.knobDrag === 'coarse') {
      const v = clamp(Math.round(S.knobV + dy / 7), 0, 40);
      if (v !== S.coarse) { S.coarse = v; rCoarse.set(v); Sound.tick(); }
    } else {
      const v = clamp(Math.round((S.knobV + dy / 9) * 2) / 2, -10, 10);
      if (v !== S.fine) { S.fine = v; rFine.set(v); }
    }
  }
  function tapView(p) {
    const sw = swapState();
    const key = sw.key;
    if (!key || S.swap) return;
    const V = LAY.scope.view, k = viewScale();
    const ux = (p.x - V.cx) / k, uy = (p.y - V.cy) / k;
    let best = -1, bd = Infinity;
    NUCLEI[key].forEach((n, i) => { const d = Math.hypot(n.x - ux, n.y - uy); if (d < bd) { bd = d; best = i; } });
    const n = NUCLEI[key][best];
    const hitOK = best >= 0 && bd * k <= Math.max(n.r * k + 9, 14);
    if (!hitOK) {
      S.miss = { x: p.x, y: p.y, t: now() };
      Sound.tick();
      if (S.stain[key] > 0.5 && S.blurShown < 1.2) toast('여기는 핵이 아니에요. 핵은 진하게 물든 둥근 알갱이예요.');
      return;
    }
    if (S.stain[key] < 0.5) { S.miss = { x: p.x, y: p.y, t: now() }; Sound.fail(); toast('💧 핵이 잘 보이지 않아요. 먼저 염색약을 떨어뜨려 보세요!'); return; }
    if (S.blurShown > 1.2) { S.miss = { x: p.x, y: p.y, t: now() }; Sound.fail(); toast('🌫️ 흐려서 잘 보이지 않아요. 초점을 먼저 맞춰요.'); return; }
    S.found[key] = best; S.foundT[key] = now();
    Sound.success();
    burst(p.x, p.y, ['#facc15', '#fde047', '#ffffff', key === 'onion' ? '#f472b6' : '#60a5fa'], 22);
    toast('🎯 핵을 찾았어요! (' + SLIDES[key].name + ' 세포)', 'good');
  }
  function putSlide(key) {
    if (S.swap || S.slide === key) { if (S.slide === key) toast('이미 재물대에 있는 표본이에요.'); return; }
    S.swap = { from: S.slide, to: key, t0: now() };
    Sound.tone(520, 0.1, 'triangle', 0.06);
  }
  function stainNow() {
    const key = S.swap ? S.swap.to : S.slide;
    if (!key) return;
    if (S.stain[key] > 0 || S.drop) { toast('이미 염색했어요. 다른 표본도 염색해 보세요.'); return; }
    S.drop = { t0: now(), key };
    Sound.tone(880, 0.08, 'sine', 0.06, 0.25);
  }
  function modelTap(p) {
    const h = cellHit(p);
    if (!h || !h.key) return;
    if (S.pickMode && h.cell === 'plant') {      // 고르기는 식물 세포에서만 (동물 세포는 눌러서 이름을 확인)
      if (S.picks.has(h.key)) S.picks.delete(h.key); else S.picks.add(h.key);
      if (!S.labels.plant[h.key]) S.labels.plant[h.key] = Object.assign({ t0: now() }, h);
      Sound.tick();
      return;
    }
    const labs = S.labels[h.cell];
    const fresh = !labs[h.key];
    labs[h.key] = Object.assign({ t0: fresh ? now() : labs[h.key].t0 }, h);
    if (fresh) {
      Sound.tone(700 + KEYS.indexOf(h.key) * 80, 0.1, 'triangle', 0.07);
      const C = cellOf(h.cell);
      const a = anchorOf(h.cell, h.key, labs[h.key]);
      burst(C.cx + a[0] * C.sc, C.cy + a[1] * C.sc, [ST[h.key].color, '#fde047', '#ffffff'], 12);
    } else { labs[h.key].t0 = now() - 0.36; Sound.tick(); }
  }
  function tapStruct(key, p) {
    playFn(key);
    if (p) burst(p.x, p.y, [ST[key].color, '#ffffff'], 8);
  }

  /* =========================================================
     HTML 조작
     ========================================================= */
  const magBtns = $$('#magSeg button');
  function setMag(m) {
    if (S.mag === m) return;
    S.mag = m;
    const idx = MAG_IDX[m];
    let tgt = idx * 120;
    tgt += 360 * Math.round((S.turret - tgt) / 360);
    S.turretTarget = tgt;
    magBtns.forEach((b) => b.classList.toggle('on', +b.dataset.mag === m));
    $('#oMag').textContent = m + '배';
    Sound.tone(360, 0.06, 'square', 0.03);
    Sound.tone(520, 0.06, 'square', 0.03, 0.16);
  }
  magBtns.forEach((b) => b.addEventListener('click', () => setMag(+b.dataset.mag)));
  // 현미경을 처음 상태로 (40배, 초점 흐림, 양파 표피, 염색 전)
  function resetScope() {
    S.coarse = 8; S.fine = 0; rCoarse.set(8); rFine.set(0);
    setMag(40);
    S.found = { onion: -1, cheek: -1 }; S.stain = { onion: 0, cheek: 0 };
    S.swap = null; S.drop = null; S.stainAnim = null; S.slide = 'onion';
  }
  const rCoarse = SciSim.bindRange($('#sCoarse'), null, null, (v) => { S.coarse = v; });
  const rFine = SciSim.bindRange($('#sFine'), null, null, (v) => { S.fine = v; });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  const SCENE_BG = {
    scope: 'linear-gradient(180deg,#f4f8fb,#e1e9ef)', model: 'linear-gradient(180deg,#f3faf2,#e4f0e6)',
    func: 'linear-gradient(180deg,#f2f9f3,#e3efe6)', shape: 'linear-gradient(180deg,#f6f8fb,#e8eef4)',
  };
  function updateSceneUI() {
    if (view) view.wrap.style.setProperty('--stage-bg', SCENE_BG[S.scene]);
    $$('#sceneSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.scene === S.scene); b.setAttribute('aria-selected', b.dataset.scene === S.scene ? 'true' : 'false'); });
    $('#ctrlCard').hidden = S.scene !== 'scope';
    const seg = $('#sceneSeg');
    $('#sceneLabel').hidden = !!(seg && !seg.hidden);
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene];
  }
  /* 캔버스 안 안내 말풍선 (장면마다 비어 있는 자리에 그림) */
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = now(); HINT.tEnd = now() + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg && HINT.tEnd > now()) HINT.tEnd = now(); }
  function drawHint() {
    if (!HINT.msg) return;
    const hp = LAY[S.scene] && LAY[S.scene].hint;
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
     상태 갱신
     ========================================================= */
  function update(dt, t) {
    S.fnK = SciSim.approach(S.fnK, S.fnCards ? 1 : 0, dt, RM ? 60 : 8);
    S.zShown = SciSim.approach(S.zShown, zTarget(), dt, 12);
    S.zoomLog = SciSim.approach(S.zoomLog, Math.log(S.mag), dt, RM ? 60 : 4.2);
    if (Math.abs(S.zoomLog - Math.log(S.mag)) < 1e-4) S.zoomLog = Math.log(S.mag);
    S.turret = SciSim.approach(S.turret, S.turretTarget, dt, RM ? 60 : 7);
    if (Math.abs(S.turret - S.turretTarget) < 0.05) S.turret = S.turretTarget;
    const magEff = Math.exp(S.zoomLog);
    const bt = blurFor(Math.abs(S.zShown - Z_STAR), magEff);
    S.blurShown = SciSim.approach(S.blurShown, bt, dt, 14);
    S.knobC = SciSim.approach(S.knobC, S.coarse * 0.42, dt, 12);
    S.knobF = SciSim.approach(S.knobF, S.fine * 0.5, dt, 12);
    if (S.swap && now() - S.swap.t0 >= 1.0) { S.slide = S.swap.to; S.swap = null; Sound.tick(); }
    if (S.drop) {
      const u = now() - S.drop.t0;
      if (u > 0.85 && !S.stainAnim) S.stainAnim = { key: S.drop.key, t0: now() };
      if (u > 1.6) S.drop = null;
    }
    if (S.stainAnim) {
      const k = clamp((now() - S.stainAnim.t0) / (RM ? 0.01 : 1.7), 0, 1);
      S.stain[S.stainAnim.key] = Math.max(S.stain[S.stainAnim.key], k);
      if (k >= 1) { S.stain[S.stainAnim.key] = 1; S.stainAnim = null; }
    }
    updateCells(t);
    if (S.fn && S.scene === 'func') {
      const tau = fnTau();
      if (tau > 2.0 && !S.watched[S.fn.key]) { S.watched[S.fn.key] = true; Sound.tick(); }
    }
    [fnCards, jobCards].forEach((list) => list.forEach((cd) => {
      const target = S.drag && S.drag.card === cd ? 1 : 0;
      cd.lift = SciSim.approach(cd.lift, target, dt, 14);
    }));
    PFX.update(dt);
  }

  /* =========================================================
     퀴즈 그림
     ========================================================= */
  const FIG_CELLS = (function () {
    let a = '<svg viewBox="0 0 150 96" width="150" height="96" role="img" aria-label="양파 표피 세포">';
    a += '<rect width="150" height="96" rx="10" fill="#f6dfe4"/>';
    for (let r = 0; r < 5; r++) {
      const y = 6 + r * 18;
      a += '<line x1="0" y1="' + y + '" x2="150" y2="' + (y + 1) + '" stroke="#a8435f" stroke-width="1.6"/>';
      for (let c = 0; c < 4; c++) {
        const x = ((r % 2) * 22 + c * 46 + 10) % 150;
        a += '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 2) + '" y2="' + (y + 18) + '" stroke="#a8435f" stroke-width="1.6"/>';
        a += '<ellipse cx="' + (x + 18) + '" cy="' + (y + 9) + '" rx="4.5" ry="3.4" fill="#8a1636"/>';
      }
    }
    a += '</svg>';
    let b = '<svg viewBox="0 0 150 96" width="150" height="96" role="img" aria-label="입안 상피 세포">';
    b += '<rect width="150" height="96" rx="10" fill="#f4f7fb"/>';
    [[40, 34, 26], [98, 30, 24], [70, 70, 25], [126, 74, 20], [18, 78, 18]].forEach((c) => {
      b += '<path d="M' + (c[0] - c[2]) + ' ' + c[1] + ' Q' + (c[0] - c[2]) + ' ' + (c[1] - c[2] * 0.9) + ' ' + c[0] + ' ' + (c[1] - c[2] * 0.8) + ' Q' + (c[0] + c[2] * 1.1) + ' ' + (c[1] - c[2] * 0.7) + ' ' + (c[0] + c[2]) + ' ' + c[1] + ' Q' + (c[0] + c[2] * 0.8) + ' ' + (c[1] + c[2] * 0.9) + ' ' + c[0] + ' ' + (c[1] + c[2] * 0.8) + ' Q' + (c[0] - c[2] * 0.9) + ' ' + (c[1] + c[2] * 0.7) + ' ' + (c[0] - c[2]) + ' ' + c[1] + 'Z" fill="#c5daf3" stroke="#3b6fb6" stroke-width="1.4"/>';
      b += '<circle cx="' + (c[0] + 2) + '" cy="' + (c[1] + 1) + '" r="4.2" fill="#1d3f88"/>';
    });
    b += '</svg>';
    return '<div class="fig-cells"><figure>' + a + '<figcaption>양파 표피 세포 (식물)</figcaption></figure><figure>' + b + '<figcaption>입안 상피세포 (동물)</figcaption></figure></div>';
  })();

  /* =========================================================
     단계와 미션
     ========================================================= */
  const mark = (ok) => (ok ? '✅' : '⬜');
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '현미경으로 세포 관찰하기', short: '현미경', icon: '🔬', phase: '관찰',
      features: ['scope', 'focus', 'stain'],
      intro: '<p class="si-q">❓ 탐구 질문: 생물의 몸은 무엇으로 이루어져 있을까?</p>' +
        '<p>눈으로는 볼 수 없는 아주 작은 것을 <b>광학 현미경</b>으로 크게 확대해 봐요. 식물인 <b>양파 표피</b>와 동물(사람)인 <b>입안 상피</b>를 관찰해요.</p>',
      setup() { setScene('scope', true); S.trayOn = true; },
      recap: '양파 표피와 입안 상피는 모두 작은 방 같은 <b>세포</b>로 이루어져 있고, 염색하면 세포마다 <b>핵</b>이 보여요.',
      summary: '<ul><li><b>배율</b> = 접안렌즈 배율 × 대물렌즈 배율 (예: 10 × 40 = 400배)</li>' +
        '<li>저배율에서 <b>조동 나사</b>로 초점을 맞춘 뒤, 고배율에서는 <b>미동 나사</b>로 정확하게 맞춘다.</li>' +
        '<li>아세트산 카민 용액이나 메틸렌 블루 용액으로 <b>염색</b>하면 <b>핵</b>이 진하게 물든다.</li>' +
        '<li>양파(식물)도 사람(동물)도 <b>세포</b>로 이루어져 있다. → 모든 생물은 세포로 이루어져 있다.</li></ul>',
      missions: [
        {
          title: '400배로 초점 맞추기',
          goal: '배율을 <b>400배</b>로 바꾸고, 조동 나사와 미동 나사로 양파 표피 세포가 <b>선명하게</b> 보이도록 초점을 맞춰 보세요.',
          hint: '먼저 <b>40배</b>에서 <b>조동 나사</b>로 대강 맞춘 다음, <b>400배</b>로 바꾸고 <b>미동 나사</b>를 조금씩 움직여요.',
          setup() {
            setScene('scope');
            S.trayOn = false;
            resetScope();
            showHint('⚙️ 조동 나사를 움직여 초점을 맞춰 보세요', 6000);
          },
          check: () => S.mag === 400 && isSharp(),
          hold: 0.8,
          status: () => mark(S.mag === 400) + ' 배율 <b>' + S.mag + '배</b> · ' + mark(S.mag === 400 && isSharp()) + ' 초점 <b>' + (isSharp() ? '선명' : '흐림') + '</b>',
          explain: '배율이 높을수록 초점이 맞는 범위가 좁아서 <b>미동 나사</b>로 조금씩 맞춰야 해요. 400배로 보니 양파 표피가 벽돌처럼 늘어선 작은 방, 즉 <b>세포</b>로 이루어져 있어요.',
        },
        {
          title: '염색하고 핵 찾기',
          goal: '💧 <b>염색약</b>을 떨어뜨려 염색한 뒤, 시야에서 진하게 물든 <b>핵</b>을 눌러 보세요. <b>양파 표피</b>와 <b>입안 상피</b> 모두 해 봐요!',
          hint: '표본 상자에서 슬라이드를 누르면 재물대에 올라가요. 핵은 세포마다 하나씩 있는 둥근 알갱이예요. 100배나 400배에서 찾기 쉬워요.',
          setup() {
            setScene('scope');
            if (!S.trayOn) { S.trayOn = true; S.trayNewAt = now(); }
            S.found = { onion: -1, cheek: -1 }; S.stain = { onion: 0, cheek: 0 }; S.drop = null; S.stainAnim = null;
            if (S.slide !== 'onion' && !S.swap) S.slide = 'onion';
            if (!sharpNow() && !S.swap) {      // 다시 시작했을 때: 초점이 흐리면 먼저 맞춰 둠
              S.coarse = 23; S.fine = S.mag === 400 ? 4 : 0; rCoarse.set(S.coarse); rFine.set(S.fine);
            }
            showHint('💧 아래 표본 상자의 염색약을 눌러 보세요', 6000);
          },
          check: () => S.found.onion >= 0 && S.found.cheek >= 0,
          hold: 0.4,
          status: () => '🧅 양파 표피: 염색 ' + mark(S.stain.onion > 0.5) + ' 핵 ' + mark(S.found.onion >= 0) +
            '<br>👄 입안 상피: 염색 ' + mark(S.stain.cheek > 0.5) + ' 핵 ' + mark(S.found.cheek >= 0),
          explain: '염색하면 <b>핵</b>이 진하게 물들어 잘 보여요. 양파 표피 세포(식물)도 입안 상피세포(동물)도 세포마다 <b>핵</b>이 하나씩 있어요. 양파 표피 세포는 벽돌처럼 반듯하고, 입안 상피세포는 둥글넓적해요.',
        },
        {
          type: 'quiz',
          title: '생물의 몸은 무엇으로?',
          goal: '관찰 결과를 바탕으로, 생물의 몸에 대한 설명으로 옳은 것은?',
          figure: FIG_CELLS,
          choices: ['동물의 몸만 세포로 이루어져 있다', '식물의 몸만 세포로 이루어져 있다', '눈에 보이는 큰 생물만 세포로 이루어져 있다', '모든 생물의 몸은 세포로 이루어져 있다'],
          answer: 3,
          feedback: [
            '양파는 식물인데도 세포로 이루어져 있었어요!',
            '사람의 입안 상피도 세포로 이루어져 있었어요.',
            '짚신벌레나 세균처럼 아주 작은 생물도 세포로 이루어져 있어요. 세포 하나로 된 생물도 있어요.',
            '',
          ],
          explain: '식물(양파)도 동물(사람)도, 아주 작은 짚신벌레나 세균도 모두 <b>세포</b>로 이루어져 있어요. 세포는 생물의 몸을 이루고 <b>생명 활동이 일어나는 기본 단위</b>예요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '세포 구조 찾기', short: '세포 구조', icon: '🧫', phase: '탐구',
      features: ['model'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 현미경으로 양파 표피 세포와 입안 상피세포를 관찰하고 핵을 찾았어요.</div>' +
        '<p>세포를 아주 크게 그린 <b>식물 세포</b>와 <b>동물 세포</b> 모형이에요. 세포 안에는 여러 가지 구조가 있어요. 눌러서 이름을 알아보고 두 세포를 비교해 봐요.</p>',
      setup() { setScene('model'); },
      recap: '식물 세포에는 <b>세포벽, 세포막, 핵, 엽록체, 미토콘드리아</b>가 있고, 동물 세포에는 <b>세포벽과 엽록체가 없어요</b>.',
      summary: '<ul><li>식물 세포와 동물 세포에 모두 있는 것: <b>세포막, 핵, 미토콘드리아</b></li>' +
        '<li>식물 세포에만 있는 것: <b>세포벽, 엽록체</b></li></ul>' +
        '<p class="note">양파 표피처럼 빛을 받지 않는 부분의 식물 세포에는 엽록체가 없기도 해요. 엽록체는 잎처럼 초록색인 부분의 세포에 많아요.</p>',
      missions: [
        {
          title: '식물 세포에서 5가지 찾기',
          goal: '<b>식물 세포</b>의 여러 부분을 눌러 이름표를 붙여 보세요. <b>5가지 구조</b>를 모두 찾아요.',
          hint: '가장자리의 두꺼운 벽, 그 안쪽의 노란 얇은 막, 가운데의 큰 보라색 공, 초록색 알갱이, 주황색 알갱이를 눌러 봐요.',
          setup() { setScene('model'); S.pickMode = false; S.labels = { plant: {}, animal: {} }; S.picks = new Set(); showHint('👆 식물 세포의 여러 부분을 눌러 보세요', 5000); },
          check: () => KEYS.every((k) => !!S.labels.plant[k]),
          hold: 0.5,
          status: () => KEYS.map((k) => mark(!!S.labels.plant[k]) + ' ' + ST[k].name).join(' · '),
          explain: '식물 세포에는 <b>세포벽, 세포막, 핵, 엽록체, 미토콘드리아</b>가 있어요. 세포벽은 세포막 바깥을 둘러싸고 있어요.',
        },
        {
          title: '동물 세포에는 없는 것',
          manual: true,
          goal: '동물 세포와 비교해 보세요. 식물 세포에는 있지만 <b>동물 세포에는 없는</b> 구조 <b>2가지</b>를 식물 세포에서 눌러 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '동물 세포를 눌러 보며 어떤 구조가 있는지 먼저 확인해요. 다시 누르면 고르기가 취소돼요.',
          setup() {
            setScene('model');
            KEYS.forEach((k) => { if (!S.labels.plant[k]) S.labels.plant[k] = { t0: now(), key: k, inst: 0, ux: plantPt(PLANT, -2.4, 7)[0], uy: plantPt(PLANT, -2.4, 7)[1] }; });
            S.pickMode = true; S.picks = new Set();
          },
          status: () => '고른 구조: <b>' + (S.picks.size ? Array.from(S.picks).map((k) => ST[k].name).join(', ') : '없음') + '</b>',
          check() {
            const p = S.picks;
            if (p.size < 2) return '구조를 2가지 골라 주세요. (지금 ' + p.size + '가지)';
            if (p.has('memb')) return '동물 세포도 <b>세포막</b>으로 둘러싸여 있어요. 동물 세포의 가장자리를 보세요!';
            if (p.has('nuc')) return '동물 세포에도 <b>핵</b>이 있어요. 1단계에서 입안 상피세포의 핵을 찾았지요?';
            if (p.has('mito')) return '동물 세포에도 주황색 <b>미토콘드리아</b>가 있어요. 동물 세포를 잘 살펴보세요.';
            if (p.size > 2) return '2가지만 골라 주세요.';
            return true;
          },
          explain: '<b>세포벽</b>과 <b>엽록체</b>는 식물 세포에만 있어요. <b>세포막, 핵, 미토콘드리아</b>는 식물 세포와 동물 세포에 모두 있어요.',
        },
        {
          type: 'quiz',
          title: '엽록체가 있는 세포',
          goal: '다음 중 <b>엽록체</b>를 가장 많이 볼 수 있는 세포는?',
          setup() { setScene('model'); S.pickMode = false; },
          choices: ['사람의 입안 상피세포', '양파 표피 세포', '시금치 잎의 세포', '사람의 근육 세포'],
          answer: 2,
          feedback: [
            '동물 세포에는 엽록체가 없어요.',
            '1단계에서 본 양파 표피 세포에 초록색 알갱이가 있었나요? 빛을 받지 않는 양파 비늘잎의 표피에는 엽록체가 없어요.',
            '',
            '동물 세포에는 엽록체가 없어요.',
          ],
          explain: '엽록체는 식물 세포 중에서도 <b>잎처럼 빛을 받는 초록색 부분</b>의 세포에 많아요. 그래서 잎이 초록색으로 보여요. 같은 식물이라도 양파 표피 세포에는 엽록체가 없어요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '세포 구조와 기능', short: '구조와 기능', icon: '⚙️', phase: '설명',
      features: ['func'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포 속 5가지 구조의 이름과 위치를 찾았어요.</div>' +
        '<p>세포의 각 구조는 서로 다른 <b>일</b>을 해요. 구조를 눌러 하는 일을 움직이는 그림으로 살펴보고, 구조와 기능을 짝 지어 봐요.</p>',
      setup() { setScene('func'); S.fnCards = false; },
      recap: '핵은 생명 활동 조절, 세포막은 물질 출입 조절, 세포벽은 보호와 모양 유지, 엽록체는 광합성, 미토콘드리아는 에너지를 얻는 일을 해요.',
      summary: '<ul><li><b>핵</b>: 유전 물질이 있어 생명 활동을 조절한다.</li>' +
        '<li><b>세포막</b>: 세포를 둘러싸며 물질이 세포 안팎으로 드나드는 것을 조절한다.</li>' +
        '<li><b>세포벽</b>: 식물 세포의 세포막 바깥에 있으며, 세포를 보호하고 모양을 일정하게 유지한다.</li>' +
        '<li><b>엽록체</b>: 빛을 받아 광합성을 하여 양분을 만든다.</li>' +
        '<li><b>미토콘드리아</b>: 양분을 분해하여 생명 활동에 필요한 에너지를 얻는다.</li></ul>' +
        '<p class="note">세포의 구조들이 함께 일하여 생명 활동이 일어나요. → 세포는 생명 활동이 일어나는 기본 단위</p>',
      missions: [
        {
          title: '하는 일 살펴보기',
          goal: '세포의 <b>5가지 구조</b>를 하나씩 눌러, 각 구조가 하는 일을 살펴보세요.',
          hint: '세포 그림을 직접 누르거나, 오른쪽 표의 구조 이름을 눌러도 돼요. 그림이 끝날 때까지 지켜봐요.',
          setup() { setScene('func'); S.fnCards = false; S.watched = {}; S.fn = null; showHint('👆 세포의 구조를 눌러 하는 일을 살펴보세요', 5000); },
          check: () => KEYS.every((k) => S.watched[k]),
          hold: 0.3,
          status: () => KEYS.map((k) => mark(!!S.watched[k]) + ' ' + ST[k].name).join(' · '),
          explain: '세포 속 구조들은 저마다 맡은 일을 하며 함께 생명 활동을 해요. 그래서 세포를 <b>생명 활동이 일어나는 기본 단위</b>라고 해요.',
        },
        {
          title: '기능 카드 맞추기',
          manual: true,
          goal: '<b>기능 카드</b>를 끌어 알맞은 구조 옆 칸에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '헷갈리면 구조를 다시 눌러 움직이는 그림을 보세요. 카드는 세포 그림 위에 놓아도 돼요.',
          setup() {
            setScene('func');
            S.fnCards = true; resetCards('func');
            showHint('🃏 카드를 끌어 알맞은 칸에 놓아 보세요', 5000);
          },
          status: () => '놓은 카드: <b>' + fnCards.filter((c) => c.slot >= 0).length + ' / 5</b>',
          check() {
            const empty = fnCards.filter((c) => c.slot < 0).length;
            if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요. 5장을 모두 칸에 놓아 주세요.';
            const wrong = fnCards.filter((c) => FUNC_ORDER[c.slot] !== c.key);
            if (wrong.length) {
              if (MANUAL) {
                const t = now();
                wrong.forEach((c) => { c.bad = t; });
                setTimeout(() => { wrong.forEach((c) => { c.slot = -1; }); snapCards('func', true); }, 650);
              }
              return '빨간 카드 ' + wrong.length + '장이 알맞지 않아요. 구조를 다시 눌러 하는 일을 확인해 보세요.';
            }
            if (MANUAL) {
              fnCards.forEach((c) => { c.ok = true; });
              const T = LAY.func.table;
              burst(T.x + T.w / 2, T.y + 160, null, 26);
            }
            return true;
          },
          explain: '구조마다 맡은 일이 달라요. 특히 <b>세포벽</b>은 보호와 모양 유지, <b>세포막</b>은 물질 출입 조절을 해요. 이름이 비슷해도 하는 일은 달라요!',
        },
        {
          type: 'quiz',
          title: '식물 세포의 미토콘드리아',
          goal: '식물 세포에 대한 설명으로 <b>옳은</b> 것은?',
          choices: [
            '엽록체에서 양분을 만들기 때문에 미토콘드리아가 없다',
            '미토콘드리아에서 양분을 분해하여 생명 활동에 필요한 에너지를 얻는다',
            '세포벽이 세포 안팎으로 물질이 드나드는 것을 조절한다',
            '핵이 없어도 세포의 생명 활동이 조절된다',
          ],
          answer: 1,
          feedback: [
            '식물 세포에도 미토콘드리아가 있어요! 엽록체에서 만든 양분을 미토콘드리아에서 분해해 에너지를 얻어요.',
            '',
            '물질 출입을 조절하는 것은 <b>세포막</b>이에요. 세포벽은 세포를 보호하고 모양을 유지해요.',
            '생명 활동을 조절하는 것은 유전 물질이 있는 <b>핵</b>이에요.',
          ],
          explain: '식물 세포는 <b>엽록체</b>에서 광합성으로 양분을 만들고, <b>미토콘드리아</b>에서 그 양분을 분해해 생명 활동에 필요한 에너지를 얻어요. 식물 세포에도 미토콘드리아가 있어요!',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '세포의 모양과 기능', short: '모양과 기능', icon: '🩸', phase: '적용',
      features: ['shape'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포 속 각 구조가 하는 일을 알아보았어요.</div>' +
        '<p>우리 몸의 세포는 모양이 모두 같을까요? <b>적혈구, 신경세포, 상피세포</b>의 모양을 보고, 각 세포가 어떤 일을 하는지 추리해 봐요.</p>',
      setup() { setScene('shape'); },
      recap: '세포는 하는 일에 알맞은 모양을 가져요. 적혈구는 오목한 원반, 신경세포는 긴 돌기, 상피세포는 납작하고 빽빽한 모양이에요.',
      summary: '<ul><li><b>적혈구</b>: 가운데가 오목한 원반 모양 → <b>산소 운반</b>에 알맞고 좁은 혈관도 잘 지나간다.</li>' +
        '<li><b>신경세포</b>: 길게 뻗은 돌기 → <b>자극을 먼 곳까지 전달</b>한다.</li>' +
        '<li><b>상피세포</b>: 납작하고 빽빽하게 붙어 있음 → <b>몸의 표면을 덮어 보호</b>한다.</li></ul>' +
        '<p class="note">세포는 하는 일에 알맞은 모양과 구조를 가지고 있다.</p>',
      missions: [
        {
          title: '세포와 하는 일 연결하기',
          manual: true,
          goal: '세 가지 세포의 모양과 움직임을 살펴보고, <b>하는 일</b> 카드를 알맞은 세포의 칸에 끌어다 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '적혈구 주위의 파란 알갱이(산소), 신경세포를 따라 흐르는 빛(자극), 상피세포에 막혀 튕겨 나가는 세균을 보세요.',
          setup() { setScene('shape'); resetCards('shape'); S.shapeOK = [false, false, false]; showHint('🃏 하는 일 카드를 알맞은 세포 칸으로 끌어 보세요', 5000); },
          status: () => '놓은 카드: <b>' + jobCards.filter((c) => c.slot >= 0).length + ' / 3</b>',
          check() {
            const empty = jobCards.filter((c) => c.slot < 0).length;
            if (empty) return '아직 놓지 않은 카드가 ' + empty + '장 있어요.';
            const wrong = jobCards.filter((c) => SHAPES[c.slot].key !== c.key);
            if (wrong.length) {
              if (MANUAL) {
                const t = now();
                wrong.forEach((c) => { c.bad = t; });
                setTimeout(() => { wrong.forEach((c) => { c.slot = -1; }); snapCards('shape', true); }, 650);
              }
              return '빨간 카드가 알맞지 않아요. 각 세포의 모양이 어떤 일에 알맞을지 생각해 보세요.';
            }
            if (MANUAL) {
              jobCards.forEach((c) => { c.ok = true; });
              S.shapeOK = [true, true, true];
              LAY.shape.rows.forEach((r) => burst(r.x + r.w - 20, r.y + 20, null, 12));
            }
            return true;
          },
          explain: '<b>적혈구</b>는 가운데가 오목한 원반 모양이라 산소를 운반하기에 알맞고 좁은 혈관도 잘 지나가요. <b>신경세포</b>는 돌기가 길게 뻗어 있어 자극을 먼 곳까지 전달해요. <b>상피세포</b>는 납작한 세포가 빽빽하게 붙어 있어 몸의 표면을 덮어 보호해요.',
        },
        {
          type: 'quiz',
          title: '세포의 모양',
          goal: '세포의 모양에 대한 설명으로 <b>옳은</b> 것은?',
          choices: [
            '세포는 모두 둥근 공 모양으로 같다',
            '세포는 하는 일에 알맞은 모양을 가지고 있다',
            '몸집이 큰 동물일수록 세포 하나의 크기가 크다',
            '신경세포는 짧고 둥글수록 자극을 멀리 전달한다',
          ],
          answer: 1,
          feedback: [
            '적혈구, 신경세포, 상피세포의 모양을 다시 보세요. 모양이 모두 달랐지요?',
            '',
            '몸집이 큰 동물은 세포가 큰 것이 아니라 세포의 <b>수</b>가 많아요.',
            '신경세포는 돌기가 <b>길게</b> 뻗어 있어서 자극을 먼 곳까지 전달할 수 있어요.',
          ],
          explain: '세포는 종류에 따라 모양이 다르고, 그 모양은 <b>하는 일에 알맞아요</b>. 1단계에서 본 입안 상피세포도 몸의 표면을 덮는 상피세포예요.',
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
    S.drag = null; S.knobDrag = null; S.snapOK = false;
    view = SciSim.stage(cv, { width: W, height: H, background: BG, onResize: () => { SP.key = ''; } });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (TALL) {
      // 휴대폰: 물체를 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && interactiveAt(view.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
    lineCache.clear();
    snapCards('func', false); snapCards('shape', false);
    SP.size = 0;
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }

  game = SciSim.game({
    simId: 'm1-cell',
    mount: '#game',
    badge: '세포 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      scope: '🔬 광학 현미경 (40·100·400배)',
      focus: '⚙️ 조동·미동 나사',
      stain: '💧 염색약 · 표본 상자',
      model: '🧫 식물·동물 세포 모형',
      func: '⚙️ 기능 애니메이션 · 기능 카드',
      shape: '🩸 여러 가지 모양의 세포',
    },
    onFeatures(set) {
      F = new Set(set);
      updateSceneUI();
    },
    onMissionStart(m) {
      S.pickMode = false;
      const sc = SCENE_ORDER[m._level];
      if (sc && !(game && game.free)) setScene(sc);
    },
    onComplete() {
      S.trayOn = true; S.pickMode = false; S.fnCards = true;
      updateSceneUI();
    },
    levels,
  });
  updateSceneUI();

  // 테스트·점검용
  window.__sim = {
    S, game, setScene, setMag, LAY: () => LAY, KIND: () => KIND,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    nucleusPoint(key) {
      // 시야 가운데에서 가장 가까운 핵 (화면 좌표)
      const V = LAY.scope.view, k = viewScale();
      let best = 0, bd = Infinity;
      NUCLEI[key].forEach((n, i) => { const d = Math.hypot(n.x, n.y); if (d < bd) { bd = d; best = i; } });
      const n = NUCLEI[key][best];
      return this.toClient(V.cx + n.x * k, V.cy + n.y * k);
    },
    trayPoint(k) { const it = trayItems(LAY.scope.tray).find((x) => x.k === k); return this.toClient(it.x + it.w / 2, it.y + it.h / 2); },
    knobPoint(which) { const M = LAY.scope.mic; const c = which === 'coarse' ? micPt(M, -64, -168) : micPt(M, -64, -112); return this.toClient(c.x, c.y); },
    structPoint(cell, key) {
      const C = S.scene === 'func' ? LAY.func.cell : cellOf(cell);
      const c = cell === 'plant' ? PLANT : ANIMAL;
      let x, y;
      if (key === 'nuc') { x = c.nuc.x; y = c.nuc.y; }
      else if (key === 'chl') { x = c.chl[0].x; y = c.chl[0].y; }
      else if (key === 'mito') { x = c.mito[1].x; y = c.mito[1].y; }
      else if (cell === 'plant') {
        // 둘레를 돌며 주변 6px까지 같은 구조로 판정되는 안전한 지점을 찾음
        const inset = key === 'wall' ? 7 : PLANT.membI + 1;
        for (let k = 0; k < 63; k++) {
          const p = plantPt(PLANT, -0.6 + k * 0.1, inset);
          const okAll = [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].every((d) => { const h = hitPlant(p[0] + d[0], p[1] + d[1]); return h && h.key === key; });
          if (okAll) { x = p[0]; y = p[1]; break; }
        }
      }
      else { const R = animalRad(c, 0.4); x = Math.cos(0.4) * (R - 4) * c.ax; y = Math.sin(0.4) * (R - 4) * c.ay; }
      return this.toClient(C.cx + x * C.sc, C.cy + y * C.sc);
    },
    cardPoint(set, key) { const cd = (set === 'func' ? fnCards : jobCards).find((c) => c.key === key); return this.toClient(cd.x + cd.w / 2, cd.y + cd.h / 2); },
    slotPoint(set, i) { const r = set === 'func' ? funcSlotRect(i) : shapeSlotRect(i); return this.toClient(r.x + r.w / 2, r.y + r.h / 2); },
    FUNC_ORDER, SHAPES, KEYS,
  };

  SciSim.loop((dt, t) => {
    update(dt, t);
    draw(t);
  });
})();
