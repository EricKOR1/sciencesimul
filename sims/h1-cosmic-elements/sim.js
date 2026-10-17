/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 우주를 이루는 원소 (단원 2차시)
   성취기준 [10통과1-02-01] 천체에서 방출되는 빛의 스펙트럼을 분석하여 우주 초기에 형성된 원소와
   천체의 구성 물질을 추론할 수 있다.
   ① 관찰: 천체 스펙트럼 (태양 · 오리온 성운 · 먼 은하 촬영)
   ② 탐구: 원소 알아내기 (기준 선 막 겹치기 · 적색 편이 · 원소 표)
   ③ 모형: 우주 초기 (타임라인 · 헬륨 핵 만들기 · 질량비)
   ④ 적용: 우주 구성 (원자 수 비 vs 질량비 원 그래프)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const NM0 = 400, NM1 = 750;
  const ZT = 0.08;                                   // 먼 은하의 적색 편이(모의 자료)
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const gs = (l, c, s) => Math.exp(-0.5 * ((l - c) / s) * ((l - c) / s));
  const EL = {
    H: { name: '수소', col: '#e879f9' }, He: { name: '헬륨', col: '#38bdf8' }, Na: { name: '나트륨', col: '#facc15' },
  };
  const LINES = {
    H: [656, 486, 434, 410], He: [668, 588, 502, 447], Na: [589],
  };
  const EKEYS = ['H', 'He', 'Na'];

  /* ---------- 배치 ---------- */
  const OBSL = PHONE ? {
    sky: { x: 8, y: 8, w: 584, h: 196 }, objX: [100, 300, 500], objY: 92, objR: 46,
    strip: { x: 24, y: 304, w: 552, h: 44 }, titleY: 232, chipY: 268,
    panel: { x: 8, y: 392, w: 584, h: 300 },
  } : {
    sky: { x: 12, y: 8, w: 776, h: 198 }, objX: [140, 400, 660], objY: 92, objR: 54,
    strip: { x: 40, y: 264, w: 720, h: 46 }, titleY: 230, chipY: 230,
    panel: { x: 12, y: 352, w: 776, h: 198 },
  };
  const BANG = PHONE ? {
    view: { x: 8, y: 8, w: 584, h: 420 }, ac: { x: 512, y: 226 }, soup: { x: 22, y: 84, w: 400, h: 290 },
    info: { x: 8, y: 436, w: 584, h: 124 }, mass: { x: 8, y: 568, w: 584, h: 124 },
  } : {
    view: { x: 12, y: 8, w: 776, h: 350 }, ac: { x: 644, y: 176 }, soup: { x: 32, y: 78, w: 490, h: 232 },
    info: { x: 12, y: 366, w: 464, h: 184 }, mass: { x: 488, y: 366, w: 300, h: 184 },
  };
  const PIEL = PHONE ? {
    pies: [{ cx: 120, cy: 112, r: 70 }, { cx: 120, cy: 302, r: 70 }],
    slots: (i, j) => ({ x: 240, y: 36 + i * 190 + j * 52, w: 340, h: 44 }),
    cards: (k) => ({ x: 112 + (k % 3) * 188, y: 458 + Math.floor(k / 3) * 60, w: 176, h: 50 }),
    note: { x: 24, y: 586, w: 552 }, titleY: [24, 214], cardTitleY: 418,
  } : {
    pies: [{ cx: 200, cy: 120, r: 80 }, { cx: 600, cy: 120, r: 80 }],
    slots: (i, j) => ({ x: 75 + i * 400, y: 214 + j * 50, w: 250, h: 42 }),
    cards: (k) => ({ x: 100 + k * 120, y: 438, w: 110, h: 52 }),
    note: { x: 45, y: 510, w: 710 }, titleY: [24, 24], cardTitleY: 388,
  };
  const xOf = (nm, st) => st.x + (nm - NM0) / (NM1 - NM0) * st.w;

  /* ---------- 파장 → 색 ---------- */
  const WLC = [];
  (function () {
    for (let i = 0; i <= 800; i++) {
      const l = 380 + i * 0.5;
      let r = 0, g = 0, b = 0;
      if (l < 440) { r = -(l - 440) / 60; b = 1; }
      else if (l < 490) { g = (l - 440) / 50; b = 1; }
      else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; }
      else if (l < 645) { r = 1; g = -(l - 645) / 65; }
      else { r = 1; }
      const f = l < 420 ? 0.45 + 0.55 * (l - 380) / 40 : l > 700 ? Math.max(0.12, 0.45 + 0.55 * (780 - l) / 80) : 1;
      WLC.push([Math.round(255 * Math.pow(Math.max(0, r) * f, 0.8)), Math.round(255 * Math.pow(Math.max(0, g) * f, 0.8)), Math.round(255 * Math.pow(Math.max(0, b) * f, 0.8))]);
    }
  })();
  const wl = (l) => WLC[clamp(Math.round((l - 380) * 2), 0, 800)];
  const wlHex = (l, a) => { const c = wl(l); return a == null ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  /* ---------- 천체 스펙트럼 자료 (단순화한 모의 관측 자료) ---------- */
  const sh = (z) => (o) => ({ nm: o.nm * (1 + z), a: o.a, el: o.el });
  const L_ = (el, arr) => arr.map((a, i) => ({ nm: LINES[el][i], a, el }));
  const OBJ = {
    sun: {
      id: 'sun', tag: '어두운 흡수선', name: '태양', icon: '☀️', sub: '지구에서 약 8분 거리', kind: '흡수선이 있는 연속 스펙트럼',
      cont: (l) => 0.88 - 0.1 * smooth((l - 690) / 60), emi: [],
      dark: [].concat(L_('H', [0.85, 0.72, 0.6, 0.55]), L_('He', [0.38, 0.4, 0.5, 0.42]), [{ nm: 589, a: 0.3, el: 'Na' }, { nm: 423, a: 0.28, el: 'Ca' }, { nm: 517, a: 0.3, el: 'Mg' }, { nm: 527, a: 0.25, el: 'Fe' }]),
      has: { H: 1, He: 1, Na: 1 },
    },
    orion: {
      id: 'orion', tag: '밝은 방출선', name: '오리온 성운', icon: '🌫️', sub: '약 1,300광년 거리', kind: '방출선이 있는 스펙트럼',
      cont: () => 0, emi: [].concat(L_('H', [1, 0.62, 0.36, 0.26]), L_('He', [0.28, 0.5, 0.4, 0.3])), dark: [],
      has: { H: 1, He: 1, Na: 0 },
    },
    gal: {
      id: 'gal', tag: '적색 편이', name: '먼 은하', icon: '🌌', sub: '수억 광년 거리', kind: '적색 편이한 스펙트럼',
      cont: (l) => 0.55 * (0.55 + 0.45 * gs(l, 580, 140)), emi: [],
      dark: [].concat(L_('H', [0.55, 0.45, 0.36, 0.3]), L_('He', [0.2, 0.3, 0.25, 0.22]), [{ nm: 589, a: 0.2, el: 'Na' }, { nm: 423, a: 0.2, el: 'Ca' }]).map(sh(ZT)),
      has: { H: 1, He: 1, Na: 1 },
    },
  };
  const OBJ_IDS = ['sun', 'orion', 'gal'];
  Object.values(OBJ).forEach((o) => {
    o.emi.sort((a, b) => a.nm - b.nm); o.dark.sort((a, b) => a.nm - b.nm);
    // 원소별 선의 세기(평균)
    const lst = o.emi.concat(o.dark), m = {};
    lst.forEach((q) => { const k = EL[q.el] ? q.el : 'etc'; (m[k] = m[k] || []).push(q.a); });
    o.str = {}; ['H', 'He', 'etc'].forEach((k) => { o.str[k] = m[k] ? m[k].reduce((s, x) => s + x, 0) / m[k].length : 0; });
    if (m.Na) { /* 나트륨도 '기타'로 묶어 순위 비교 */ const e = (m.etc || []).concat(m.Na); o.str.etc = e.reduce((s, x) => s + x, 0) / e.length; }
  });

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', t: 0, rev: 0, lastKey: '', obj: 'sun',
    cap: new Set(), capT: {}, flash: 0, ret: new SciSim.Spring(OBSL.objX[0], { stiffness: 120, damping: 15 }),
    tmpl: { H: false, He: false, Na: false }, z: 0, zT: 0, zOK: false,
    cells: { sun: {}, orion: {}, gal: {} }, cellT: {}, cellBad: {},
    stage: 0, stFade: 0, gscale: 0.3, built: false, buildT: 0, he: null, fuse: null, slot: [null, null, null, null], heCount: 0,
    items: [], elec: [], phot: [], hMix: 0, pct: null, massShow: 0, massOK: false, bangGuide: 0,
    cards: [], pieSlots: [], pieOK: 0, pieShow: 0, drag: null, fade: 0,
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));
  const stepNo = () => (game ? game.level : 0);
  const tableMode = () => !!(game && (game.free || game.level >= 1));

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#070b1a' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function wrap(text, maxW, size, weight) {
    ctx.font = font(size, weight || 600);
    const out = []; let line = '';
    text.split(' ').forEach((w) => {
      const tr = line ? line + ' ' + w : w;
      if (ctx.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr;
    });
    if (line) out.push(line);
    return out;
  }
  function paragraph(text, x, y, maxW, size, color, lh, weight) {
    const ls = wrap(text, maxW, size, weight);
    ls.forEach((s, i) => D.text(x, y + i * (lh || size * 1.45), s, { size, color, align: 'left', weight: weight || 600 }));
    return ls.length * (lh || size * 1.45);
  }
  function panel(r, title, a) {
    ctx.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.07 : a) + ')'; rr(r.x, r.y, r.w, r.h, 14).fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    if (title) D.text(r.x + 14, r.y + 24, title, { size: 15, color: '#e6ecff', align: 'left', weight: 800 });
  }
  const BGSTARS = (() => { const r = rng(21); return Array.from({ length: 70 }, () => ({ x: r() * VW, y: r() * VH, s: 0.4 + r() * 1.2, p: r() * 6 })); })();
  function drawBg(t, warm) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, warm ? '#1c1228' : '#070b1a'); g.addColorStop(1, '#0d1633');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    BGSTARS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.14 + 0.14 * Math.sin(t * 1.3 + s.p)) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.3); ctx.fill(); });
  }

  /* ---------- 스펙트럼 계산 · 띠 그리기 ---------- */
  const FULL = { sig: 1.9, gc: 1, gd: 1, gl: new Array(24).fill(1) };
  function gains(spec, rev) {
    return { sig: 1.9, gc: smooth(rev / 0.5), gd: smooth((rev - 0.2) / 0.6), gl: spec.emi.map((_, k) => smooth((rev - 0.3 - k * 0.07) / 0.3)) };
  }
  function evalI(spec, l, G) {
    let v = spec.cont(l) * G.gc;
    for (let k = 0; k < spec.emi.length; k++) { const o = spec.emi[k]; v += (0.5 + 0.5 * o.a) * G.gl[k] * gs(l, o.nm, G.sig); }
    if (G.gd > 0.001) { let f = 1; for (let k = 0; k < spec.dark.length; k++) { const o = spec.dark[k]; f *= 1 - Math.min(0.95, o.a * 1.25) * G.gd * gs(l, o.nm, G.sig); } v *= f; }
    return Math.min(1, v);
  }
  function drawBar(x, y, w, h, spec, G, step) {
    ctx.fillStyle = '#04060d'; ctx.fillRect(x, y, w, h);
    const n = Math.max(1, Math.floor(w / step));
    for (let i = 0; i < n; i++) {
      const l = NM0 + (NM1 - NM0) * (i + 0.5) / n, I = evalI(spec, l, G);
      if (I < 0.012) continue;
      const c = wl(l), k = Math.pow(I, 0.8);
      ctx.fillStyle = 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')';
      ctx.fillRect(x + i * step, y, step + 0.6, h);
    }
  }

  /* ======================================================
     그림: 천체 아이콘
     ====================================================== */
  const R1 = rng(3);
  const ORION = [
    { dx: -10, dy: -6, r: 0.9, c: '#f472b6', a: 0.55 }, { dx: 14, dy: 6, r: 0.8, c: '#60a5fa', a: 0.5 }, { dx: 2, dy: 14, r: 0.7, c: '#fb7185', a: 0.5 },
    { dx: -18, dy: 12, r: 0.6, c: '#a78bfa', a: 0.5 }, { dx: 18, dy: -14, r: 0.55, c: '#38bdf8', a: 0.45 }, { dx: 0, dy: -20, r: 0.5, c: '#f9a8d4', a: 0.45 },
  ];
  const ORSTAR = Array.from({ length: 9 }, () => ({ a: R1() * 6.28, d: R1() * 0.55, p: R1() * 6 }));
  const R2 = rng(11);
  const GAL = Array.from({ length: 300 }, () => {
    const arm = Math.floor(R2() * 2), r = Math.pow(R2(), 0.7) * 0.95 + 0.04;
    const th = arm * Math.PI + r * 6.5 + (R2() - 0.5) * (1.1 - r);
    return { r, th, s: 0.6 + R2() * 1.4, c: R2() };
  });
  function iconSun(x, y, r, t) {
    D.glow(x, y, r * 2.2, '#fbbf24', 0.45);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + t * 0.15, l0 = r * 1.05, l1 = r * (1.22 + 0.1 * Math.sin(t * 2 + i * 1.7)); ctx.strokeStyle = 'rgba(253,224,71,.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * l0, y + Math.sin(a) * l0); ctx.lineTo(x + Math.cos(a) * l1, y + Math.sin(a) * l1); ctx.stroke(); }
    D.sphere(x, y, r, '#fbbf24', { light: '#fff7c2', dark: '#f59e0b', gloss: false });
    ctx.fillStyle = 'rgba(180,83,9,.35)'; [[-0.3, 0.2, 0.09], [0.25, -0.3, 0.07], [0.35, 0.28, 0.06]].forEach(([dx, dy, rad]) => { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rad * r, 0, 6.3); ctx.fill(); });
  }
  function iconOrion(x, y, r, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.2) * 0.04);
    ORION.forEach((b, i) => {
      const bx = b.dx * r / 26, by = b.dy * r / 26, br = b.r * r * (0.95 + 0.04 * Math.sin(t * 0.8 + i));
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, SciSim.color.rgba(b.c, b.a)); g.addColorStop(1, SciSim.color.rgba(b.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.3); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(15,10,30,.55)'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.05); ctx.quadraticCurveTo(-r * 0.1, r * 0.25, r * 0.35, r * 0.1); ctx.stroke();
    ORSTAR.forEach((s) => { const sx = Math.cos(s.a) * s.d * r, sy = Math.sin(s.a) * s.d * r; D.spark(sx, sy, 3 + 2 * Math.sin(t * 3 + s.p), t + s.p, '#fff'); });
    ctx.restore();
  }
  function iconGal(x, y, r, t) {
    D.glow(x, y, r * 1.2, '#fde68a', 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); ctx.scale(1, 0.56);
    GAL.forEach((p) => {
      const a = p.th + t * 0.05 * (1.2 - p.r);
      ctx.fillStyle = p.c < 0.5 ? 'rgba(191,219,254,' + (0.9 - p.r * 0.4) + ')' : 'rgba(254,215,170,' + (0.9 - p.r * 0.4) + ')';
      ctx.beginPath(); ctx.arc(Math.cos(a) * p.r * r, Math.sin(a) * p.r * r, p.s, 0, 6.3); ctx.fill();
    });
    ctx.restore();
    D.glow(x, y, r * 0.38, '#fff7d6', 0.9);
  }
  const ICON = { sun: iconSun, orion: iconOrion, gal: iconGal };

  /* ======================================================
     장면 1·2: 천체 스펙트럼
     ====================================================== */
  function drawObs(t, dt) {
    const L = OBSL, sk = L.sky, o = OBJ[S.obj];
    // 하늘 패널
    ctx.save(); rr(sk.x, sk.y, sk.w, sk.h, 16).clip();
    D.space(sk.x, sk.y, sk.w, sk.h, t, { stars: 70, top: '#13204a', bottom: '#050813' });
    OBJ_IDS.forEach((id, i) => {
      const cx = L.objX[i], cy = L.objY, sel = id === S.obj;
      ICON[id](cx, cy, L.objR * (sel ? 1.06 : 0.96), t);
      D.text(cx, cy + L.objR + 26, OBJ[id].icon + ' ' + OBJ[id].name, { size: 16, color: sel ? '#fff' : '#cbd5e1', weight: 800 });
      D.text(cx, cy + L.objR + 45, OBJ[id].sub, { size: 13, color: sel ? '#bae6fd' : '#94a3b8', weight: 700 });
      if (S.cap.has(id)) { const p = clamp((t - (S.capT[id] || 0)) / 0.5, 0, 1); D.check(cx + L.objR * 0.95, cy - L.objR * 0.85, 12 * SciSim.ease.outBack(p), p); }
    });
    // 조준 고리
    S.ret.target = L.objX[OBJ_IDS.indexOf(S.obj)]; S.ret.update(dt);
    const rx = S.ret.value, ry = L.objY, rrad = L.objR + 10, capd = S.cap.has(S.obj);
    ctx.strokeStyle = capd ? 'rgba(74,222,128,.95)' : 'rgba(125,211,252,.95)'; ctx.lineWidth = 2.5; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 14;
    ctx.beginPath(); ctx.arc(rx, ry, rrad, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 2; ctx.beginPath(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ax, ay]) => { ctx.moveTo(rx + ax * (rrad - 8), ry + ay * (rrad - 8)); ctx.lineTo(rx + ax * (rrad + 10), ry + ay * (rrad + 10)); }); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; rr(sk.x, sk.y, sk.w, sk.h, 16).stroke();
    // 제목줄
    const st = L.strip;
    D.text(st.x, L.titleY, '🔭 관측 중: ' + o.name, { size: 16, color: '#f1f5f9', align: 'left', weight: 800 });
    // 스펙트럼 띠
    const G = gains(o, S.rev);
    D.shadow(() => { ctx.fillStyle = '#04060d'; rr(st.x - 4, st.y - 4, st.w + 8, st.h + 8, 10).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.55)' });
    ctx.save(); rr(st.x, st.y, st.w, st.h, 6).clip(); drawBar(st.x, st.y, st.w, st.h, o, G, 2);
    const gl = ctx.createLinearGradient(0, st.y, 0, st.y + st.h); gl.addColorStop(0, 'rgba(255,255,255,.1)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(st.x, st.y, st.w, st.h); ctx.restore();
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 1.5; rr(st.x - 1, st.y - 1, st.w + 2, st.h + 2, 6).stroke();
    ctx.strokeStyle = 'rgba(203,213,225,.8)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let nm = NM0; nm <= NM1; nm += 10) { const x = xOf(nm, st), m = nm % 50 === 0; ctx.moveTo(x, st.y + st.h + 3); ctx.lineTo(x, st.y + st.h + (m ? 11 : 7)); } ctx.stroke();
    for (let nm = NM0; nm <= NM1; nm += 50) D.text(xOf(nm, st) - (nm === NM1 ? 10 : 0), st.y + st.h + 26, nm === NM1 ? '750 nm' : String(nm), { size: 13, color: '#e2e8f0', weight: 800 });
    // 기준 선 막
    const zEff = S.obj === 'gal' ? S.z : 0;
    const on = EKEYS.filter((e) => S.tmpl[e]);
    on.forEach((e, ti) => {
      LINES[e].forEach((nm0) => {
        const nm = nm0 * (1 + zEff);
        if (nm > NM1 || nm < NM0) return;
        const x = xOf(nm, st);
        ctx.strokeStyle = EL[e].col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 12;
        ctx.beginPath(); ctx.moveTo(x, st.y - 8); ctx.lineTo(x, st.y + st.h + 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = EL[e].col; ctx.beginPath(); ctx.moveTo(x - 6, st.y - 20); ctx.lineTo(x + 6, st.y - 20); ctx.lineTo(x, st.y - 8); ctx.closePath(); ctx.fill();
      });
    });
    if (on.length) {
      let lx = PHONE ? st.x : st.x + 250;
      const ly = L.chipY;
      on.forEach((e) => {
        const m = matchCount(o, e, zEff), n = LINES[e].length;
        const r = D.label(lx, ly, EL[e].name + ' ' + m + '/' + n + ' 일치', { bg: m === n ? '#86efac' : EL[e].col, color: '#0b1226', size: 13, align: 'left' });
        lx += r.w + 8;
      });
    }
    if (S.flash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + S.flash * 0.8 + ')'; ctx.fillRect(sk.x, sk.y, sk.w, sk.h); }
    // 아래 패널
    if (tableMode()) drawTablePanel(t, o, zEff); else drawAlbum(t);
  }
  function matchCount(o, e, zEff) {
    const all = o.emi.concat(o.dark);
    return LINES[e].filter((nm0) => all.some((q) => Math.abs(q.nm - nm0 * (1 + zEff)) < 3.2)).length;
  }
  function drawAlbum(t) {
    const P = OBSL.panel, n = 3, gap = 12, w = (P.w - gap * (n - 1)) / n;
    OBJ_IDS.forEach((id, i) => {
      const x = P.x + i * (w + gap), y = P.y, h = PHONE ? 176 : P.h, o = OBJ[id], got = S.cap.has(id), sel = id === S.obj;
      ctx.fillStyle = got ? 'rgba(74,222,128,.10)' : 'rgba(255,255,255,.06)'; rr(x, y, w, h, 14).fill();
      ctx.strokeStyle = sel ? '#7dd3fc' : got ? 'rgba(74,222,128,.55)' : 'rgba(255,255,255,.16)'; ctx.lineWidth = sel ? 2.5 : 1.2; rr(x, y, w, h, 14).stroke();
      D.text(x + 14, y + 26, '📷 ' + o.icon + ' ' + o.name, { size: 15, color: '#f1f5f9', align: 'left', weight: 800 });
      const bx = x + 14, by = y + 44, bw = w - 28, bh = Math.min(48, h - 100);
      if (got) {
        const p = SciSim.ease.outCubic(clamp((t - (S.capT[id] || 0)) / 0.7, 0, 1));
        ctx.save(); rr(bx, by, bw, bh, 6).clip(); drawBar(bx, by, bw * p, bh, o, FULL, 2); ctx.fillStyle = '#04060d'; ctx.fillRect(bx + bw * p, by, bw * (1 - p) + 1, bh); ctx.restore();
        D.text(x + 14, by + bh + 26, o.tag, { size: 13.5, color: '#bae6fd', align: 'left', weight: 800 });
        D.text(x + 14, by + bh + 46, '촬영 완료 ✓', { size: 14, color: '#86efac', align: 'left', weight: 800 });
      } else {
        ctx.fillStyle = '#080c1c'; rr(bx, by, bw, bh, 6).fill(); ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; rr(bx, by, bw, bh, 6).stroke(); ctx.setLineDash([]);
        D.text(bx + bw / 2, by + bh / 2 + 5, '아직 촬영 전', { size: 14, color: '#64748b', weight: 800 });
        D.text(x + 14, by + bh + 26, '천체를 고르고', { size: 13.5, color: '#94a3b8', align: 'left', weight: 700 });
        D.text(x + 14, by + bh + 46, '📷 촬영을 눌러요', { size: 13.5, color: '#94a3b8', align: 'left', weight: 700 });
      }
    });
  }
  const CELLX = () => { const P = OBSL.panel, tw = PHONE ? P.w : 462, nameW = 150, cw = (tw - nameW) / 3; return { x0: P.x, y0: P.y + 2, nameW, cw, rowH: PHONE ? 44 : 48, hdrH: 32, tw }; };
  function cellRect(oi, ei) { const c = CELLX(); return { x: c.x0 + c.nameW + ei * c.cw + 4, y: c.y0 + c.hdrH + oi * c.rowH + 3, w: c.cw - 8, h: c.rowH - 6 }; }
  function drawTablePanel(t, o, zEff) {
    const c = CELLX(), P = OBSL.panel;
    // 헤더
    ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(c.x0, c.y0, c.tw, c.hdrH + c.rowH * 3 + 4, 12).fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; rr(c.x0, c.y0, c.tw, c.hdrH + c.rowH * 3 + 4, 12).stroke();
    D.text(c.x0 + 14, c.y0 + 22, '📋 원소 표', { size: 14.5, color: '#e6ecff', align: 'left', weight: 800 });
    EKEYS.forEach((e, ei) => { const cx = c.x0 + c.nameW + ei * c.cw + c.cw / 2; D.sphere(cx - 22, c.y0 + 17, 6, EL[e].col, { gloss: false }); D.text(cx - 12, c.y0 + 22, EL[e].name, { size: 14, color: '#e6ecff', align: 'left', weight: 800 }); });
    OBJ_IDS.forEach((id, oi) => {
      const y = c.y0 + c.hdrH + oi * c.rowH, sel = id === S.obj;
      if (sel) { ctx.fillStyle = 'rgba(125,211,252,.10)'; rr(c.x0 + 4, y + 1, c.tw - 8, c.rowH - 2, 10).fill(); }
      D.text(c.x0 + 14, y + c.rowH / 2 + 5, OBJ[id].icon + ' ' + OBJ[id].name, { size: 14.5, color: sel ? '#fff' : '#cbd5e1', align: 'left', weight: 800 });
      EKEYS.forEach((e, ei) => {
        const r = cellRect(oi, ei), on = !!S.cells[id][e], pop = on ? SciSim.ease.outBack(clamp((t - (S.cellT[id + e] || 0)) / 0.4, 0, 1)) : 0, bad = S.cellBad[id + e];
        ctx.fillStyle = on ? 'rgba(74,222,128,.18)' : 'rgba(255,255,255,.05)'; rr(r.x, r.y, r.w, r.h, 9).fill();
        ctx.strokeStyle = bad ? '#f87171' : on ? 'rgba(74,222,128,.7)' : 'rgba(148,163,184,.4)'; ctx.lineWidth = bad ? 2.5 : 1.5; if (!on) ctx.setLineDash([4, 4]); rr(r.x, r.y, r.w, r.h, 9).stroke(); ctx.setLineDash([]);
        if (on) D.check(r.x + r.w / 2, r.y + r.h / 2, 11 * pop, pop); else D.text(r.x + r.w / 2, r.y + r.h / 2 + 5, '눌러서 표시', { size: 12.5, color: '#64748b', weight: 700 });
      });
    });
    // 오른쪽(휴대폰은 아래) 설명 카드
    const R = PHONE ? { x: P.x, y: c.y0 + c.hdrH + c.rowH * 3 + 14, w: P.w, h: 114 } : { x: P.x + c.tw + 12, y: P.y + 2, w: P.w - c.tw - 12, h: c.hdrH + c.rowH * 3 + 4 };
    panel(R, '📊 선의 세기 비교 · ' + o.name);
    const bars = [['H', '수소', EL.H.col], ['He', '헬륨', EL.He.col], ['etc', '기타', '#94a3b8']];
    const mx = Math.max(0.01, o.str.H, o.str.He, o.str.etc);
    const bh = PHONE ? 16 : 20, by0 = R.y + 38, labW = 46, bw = R.w - 28 - labW - 40;
    bars.forEach(([k, nm, col], i) => {
      const y = by0 + i * (PHONE ? 22 : 26), v = o.str[k] / mx;
      D.text(R.x + 14, y + bh - 4, nm, { size: 13.5, color: '#e6ecff', align: 'left', weight: 800 });
      ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(R.x + 14 + labW, y, bw, bh, 6).fill();
      if (v > 0.01) { ctx.fillStyle = col; rr(R.x + 14 + labW, y, Math.max(8, bw * v), bh, 6).fill(); }
      else D.text(R.x + 14 + labW + 8, y + bh - 4, '선 없음', { size: 12.5, color: '#94a3b8', align: 'left', weight: 700 });
    });
    if (!PHONE) {
      const ty = by0 + 3 * 26 + 18;
      let msg;
      if (S.obj === 'gal') msg = '적색 편이: 기준 선 막을 ' + (zEff * 100).toFixed(1) + ' % 밀었어요. ' + (Math.abs(zEff - ZT) <= 0.008 ? '선이 모두 맞아요! ✅' : '선이 맞을 때까지 밀어 봐요.');
      else msg = '선이 짙고 밝을수록 그 원소가 더 많이 있다고 볼 수 있어요.';
      paragraph(msg, R.x + 14, ty, R.w - 28, 13.5, Math.abs(zEff - ZT) <= 0.008 && S.obj === 'gal' ? '#86efac' : '#cbd5e1', 19, 700);
    }
  }

  /* ======================================================
     장면 3: 우주 초기
     ====================================================== */
  const STAGE_TXT = [
    ['빅뱅', '약 138억 년 전, 매우 뜨겁고 밀도가 높은 상태에서 우주가 시작되어 급격히 팽창했어요.'],
    ['빅뱅 후 약 1초', '온도가 내려가며 양성자(수소 원자핵)·중성자·전자·빛이 뒤섞인 뜨거운 수프 상태예요. 양성자가 중성자보다 훨씬 많아요(14 : 2).'],
    ['빅뱅 후 약 3분', '양성자와 중성자가 합쳐져 헬륨 원자핵이 만들어졌어요(우주 초기 핵합성). 합쳐지지 못한 양성자는 수소 원자핵으로 남아요.'],
    ['빅뱅 후 약 38만 년', '온도가 더 내려가 전자가 원자핵에 붙잡히며 수소 원자와 헬륨 원자가 생기고, 빛이 멀리 퍼져 나가요(우주 배경 복사).'],
    ['빅뱅 후 약 1억 년 이후', '수소와 헬륨 구름이 중력으로 뭉쳐 첫 별이 켜져요. 이보다 무거운 원소는 별 속에서 만들어져요(다음 차시).'],
  ];
  const IR = 13;
  const SL = [{ k: 'p', dx: -30, dy: -30 }, { k: 'p', dx: 30, dy: -30 }, { k: 'n', dx: -30, dy: 30 }, { k: 'n', dx: 30, dy: 30 }];
  function initItems() {
    const B = BANG, sp = B.soup, r = rng(Math.floor(Math.random() * 1e6) + 1);
    S.items = [];
    for (let i = 0; i < 16; i++) S.items.push({ k: i < 14 ? 'p' : 'n', x: sp.x + 20 + r() * (sp.w - 40), y: sp.y + 20 + r() * (sp.h - 40), vx: (r() - 0.5) * 70, vy: (r() - 0.5) * 70, slot: -1, hc: 0, ph: r() * 6, shake: 0, used: false });
    S.elec = Array.from({ length: 12 }, () => ({ x: B.view.x + 20 + r() * (B.view.w - 40), y: B.view.y + 60 + r() * (B.view.h - 130), vx: (r() - 0.5) * 140, vy: (r() - 0.5) * 140 }));
    S.phot = Array.from({ length: 9 }, () => ({ x: B.view.x + 20 + r() * (B.view.w - 40), y: B.view.y + 60 + r() * (B.view.h - 130), a: r() * 6.28, ph: r() * 6 }));
    S.slot = [null, null, null, null]; S.built = false; S.he = null; S.fuse = null; S.heCount = 0; S.hMix = 0; S.pct = null; S.massShow = 0; S.massOK = false;
    $('#inPct').value = '';
  }
  function stageBounds(st) {
    const B = BANG;
    return st === 1 ? { x: B.view.x + 24, y: B.view.y + 54, w: B.view.w - 48, h: B.view.h - 120 } : B.soup;
  }
  function stepItems(dt) {
    const bd = stageBounds(S.stage);
    S.items.forEach((it) => {
      if (it.used) return;
      if (it.shake > 0) it.shake = Math.max(0, it.shake - dt * 3);
      if (it.slot >= 0) { // 슬롯에 잠김
        const s = SL[it.slot], tx = BANG.ac.x + s.dx, ty = BANG.ac.y + s.dy;
        if (S.fuse) { const f = S.fuse.t; it.x = SciSim.lerp(tx, BANG.ac.x, SciSim.ease.inCubic(clamp(f / 0.5, 0, 1))); it.y = SciSim.lerp(ty, BANG.ac.y, SciSim.ease.inCubic(clamp(f / 0.5, 0, 1))); }
        else { it.x = SciSim.approach(it.x, tx, dt, 16); it.y = SciSim.approach(it.y, ty, dt, 16); }
        return;
      }
      if (S.drag && S.drag.it === it) return;
      it.ph += dt;
      if (!RM) {
        it.vx += (Math.random() - 0.5) * 160 * dt; it.vy += (Math.random() - 0.5) * 160 * dt;
        const sp = Math.hypot(it.vx, it.vy), mx = S.stage === 1 ? 90 : 55; if (sp > mx) { it.vx *= mx / sp; it.vy *= mx / sp; }
        it.x += it.vx * dt; it.y += it.vy * dt;
      }
      // 영역 안으로 부드럽게
      const cx = clamp(it.x, bd.x + IR, bd.x + bd.w - IR), cy = clamp(it.y, bd.y + IR, bd.y + bd.h - IR);
      if (cx !== it.x) { it.x = SciSim.approach(it.x, cx, dt, 6); it.vx = Math.abs(it.vx) * (cx > it.x ? 1 : -1); }
      if (cy !== it.y) { it.y = SciSim.approach(it.y, cy, dt, 6); it.vy = Math.abs(it.vy) * (cy > it.y ? 1 : -1); }
    });
    S.elec.forEach((e) => { e.x += e.vx * dt; e.y += e.vy * dt; const v = BANG.view; if (e.x < v.x + 14 || e.x > v.x + v.w - 14) e.vx *= -1; if (e.y < v.y + 50 || e.y > v.y + v.h - 70) e.vy *= -1; e.x = clamp(e.x, v.x + 14, v.x + v.w - 14); e.y = clamp(e.y, v.y + 50, v.y + v.h - 70); });
    S.phot.forEach((p) => { p.a += (Math.random() - 0.5) * 2 * dt; p.x += Math.cos(p.a) * 110 * dt; p.y += Math.sin(p.a) * 110 * dt; const v = BANG.view; if (p.x < v.x + 14 || p.x > v.x + v.w - 14) p.a = Math.PI - p.a; if (p.y < v.y + 50 || p.y > v.y + v.h - 70) p.a = -p.a; p.x = clamp(p.x, v.x + 14, v.x + v.w - 14); p.y = clamp(p.y, v.y + 50, v.y + v.h - 70); });
    // 융합 연출
    if (S.fuse) {
      S.fuse.t += dt;
      if (!S.fuse.done && S.fuse.t >= 0.5) {
        S.fuse.done = true;
        const ac = BANG.ac;
        S.items.forEach((it) => { if (it.slot >= 0) { it.used = true; it.slot = -1; } });
        S.slot = [null, null, null, null];
        S.he = { s: 0, t0: S.t }; S.built = true; S.heCount = 1; S.buildT = S.t;
        SciSim.tween(S.he, { s: 1 }, { duration: 0.6, ease: 'outBack' });
        SciSim.tween(S, { hMix: 1 }, { duration: 1.2, delay: 0.3 });
        parts.burst(ac.x, ac.y, { count: 26, speed: 220, size: 4, life: 0.9, colors: ['#fde68a', '#fff', '#38bdf8', '#f472b6'], gravity: 40 });
        for (let i = 0; i < 4; i++) parts.emit({ x: ac.x, y: ac.y, vx: 0, vy: 0, life: 0.8, size: 26 + i * 16, color: 'rgba(255,240,200,.5)', shape: 'smoke', grow: 60 });
        Sound.success();
      }
      if (S.fuse.t > 1.2) S.fuse = null;
    }
  }
  function drawItem(it, t) {
    const sh = it.shake > 0 ? Math.sin(it.shake * 30) * 4 : 0;
    const lift = S.drag && S.drag.it === it ? 1.18 : 1;
    const x = it.x + sh, y = it.y;
    if (it.k === 'p') {
      const m = S.built ? S.hMix : 0, col = m > 0.01 ? SciSim.color.mix('#ef4444', '#60a5fa', m) : '#ef4444';
      D.sphere(x, y, IR * lift, col, { text: m > 0.6 ? 'H' : '+', textScale: 1.0, shadow: lift > 1 });
    } else D.sphere(x, y, IR * lift, '#9ca3af', { text: 'n', textScale: 1.0, shadow: lift > 1 });
  }
  function drawHeNucleus(x, y, s) {
    const o = [[-7, -7, 'p'], [7, -7, 'n'], [-7, 7, 'n'], [7, 7, 'p']];
    D.glow(x, y, 56 * s, '#fde68a', 0.5);
    o.forEach(([dx, dy, k]) => D.sphere(x + dx * s, y + dy * s, 11 * s, k === 'p' ? '#ef4444' : '#9ca3af', { text: k === 'p' ? '+' : 'n', textScale: 0.95 }));
  }
  function drawBang(t, dt) {
    const B = BANG, v = B.view, st = S.stage;
    // 배경
    ctx.save(); rr(v.x, v.y, v.w, v.h, 16).clip();
    const bgc = ['#2a1406', '#241020', '#0d1426', '#2a1d2c', '#05070f'][st];
    const g = ctx.createRadialGradient(v.x + v.w / 2, v.y + v.h / 2, 10, v.x + v.w / 2, v.y + v.h / 2, Math.max(v.w, v.h) * 0.7);
    g.addColorStop(0, bgc); g.addColorStop(1, '#04060f'); ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
    // 팽창 격자
    S.gscale = RM ? [0.3, 0.5, 0.65, 0.85, 1.1][st] : SciSim.approach(S.gscale, [0.3, 0.5, 0.65, 0.85, 1.1][st], dt, 2.5);
    const sp = 54 * S.gscale, gcx = v.x + v.w / 2, gcy = v.y + v.h / 2;
    ctx.strokeStyle = 'rgba(147,197,253,' + (st === 4 ? 0.1 : 0.17) + ')'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = gcx % sp; x < v.x + v.w; x += sp) { if (x > v.x) { ctx.moveTo(x, v.y); ctx.lineTo(x, v.y + v.h); } }
    for (let y = gcy % sp; y < v.y + v.h; y += sp) { if (y > v.y) { ctx.moveTo(v.x, y); ctx.lineTo(v.x + v.w, y); } }
    ctx.stroke();
    if (st === 0) {
      const p = 0.5 + 0.5 * Math.sin(t * 2.2);
      D.glow(gcx, gcy, 190 + 18 * p, '#fb923c', 0.55); D.glow(gcx, gcy, 110 + 10 * p, '#fde68a', 0.9); D.glow(gcx, gcy, 52, '#ffffff', 1);
      for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283, k = ((t * 0.5 + i * 0.137) % 1), r0 = 40 + k * 190; ctx.strokeStyle = 'rgba(253,230,138,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gcx + Math.cos(a) * r0, gcy + Math.sin(a) * r0); ctx.lineTo(gcx + Math.cos(a) * (r0 + 26), gcy + Math.sin(a) * (r0 + 26)); ctx.stroke(); }
      D.text(gcx, gcy + 4, '시작', { size: 15, color: '#7c2d12', weight: 800 });
    } else if (st === 1 || st === 2) {
      if (st === 1) {
        S.elec.forEach((e) => { D.sphere(e.x, e.y, 4.2, '#60a5fa', { gloss: false }); });
        S.phot.forEach((p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.strokeStyle = 'rgba(253,224,71,.85)'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -12; k <= 12; k += 2) { const yy = Math.sin(k * 0.8 + t * 12) * 3; k === -12 ? ctx.moveTo(k, yy) : ctx.lineTo(k, yy); } ctx.stroke(); ctx.restore(); });
      }
      if (st === 2) {
        // 조립대
        const ac = B.ac;
        D.glow(ac.x, ac.y, 100, '#38bdf8', S.built ? 0.1 : 0.22);
        ctx.fillStyle = 'rgba(56,189,248,.07)'; ctx.strokeStyle = 'rgba(125,211,252,.55)'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 10; rr(ac.x - 76, ac.y - 76, 152, 152, 24).fill(); rr(ac.x - 76, ac.y - 76, 152, 152, 24).stroke(); ctx.setLineDash([]);
        if (!S.built) SL.forEach((s, i) => {
          const sx = ac.x + s.dx, sy = ac.y + s.dy, filled = S.slot[i] != null;
          ctx.strokeStyle = s.k === 'p' ? 'rgba(248,113,113,.9)' : 'rgba(209,213,219,.9)'; ctx.lineWidth = 2.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(sx, sy, IR + 6, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
          if (!filled) D.text(sx, sy + 5, s.k === 'p' ? 'p⁺' : 'n⁰', { size: 14, color: s.k === 'p' ? '#fca5a5' : '#d1d5db', weight: 800 });
        });
        D.text(ac.x, ac.y - 90, S.built ? '헬륨 핵 완성!' : '헬륨 핵 조립대', { size: 15, color: S.built ? '#fde68a' : '#bae6fd', weight: 800 });
        if (!S.built) D.text(ac.x, ac.y + 100, '양성자 2 + 중성자 2', { size: 14, color: '#94a3b8', weight: 700 });
        if (S.he) drawHeNucleus(ac.x, ac.y, 1.25 * S.he.s);
        if (S.fuse && !S.fuse.done) D.glow(ac.x, ac.y, 30 + 120 * (S.fuse.t / 0.5), '#ffffff', 0.4 + 0.5 * (S.fuse.t / 0.5));
        if (S.built) { D.label(ac.x, ac.y + 104, '헬륨 핵 1개 (질량 4)', { bg: '#fde68a', color: '#422006', size: 13 }); }
        // 수프 영역 틀
        const sp2 = B.soup; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 1.2; rr(sp2.x - 8, sp2.y - 8, sp2.w + 16, sp2.h + 16, 18).stroke(); ctx.setLineDash([]);
        D.text(sp2.x + 4, sp2.y - 14, S.built ? '남은 양성자 = 수소 원자핵 12개 (질량 12)' : '입자 수프: 양성자 14개 · 중성자 2개', { size: 14, color: S.built ? '#93c5fd' : '#cbd5e1', align: 'left', weight: 800 });
      }
      S.items.forEach((it) => { if (!it.used) drawItem(it, t); });
    } else if (st === 3) {
      // 수소·헬륨 원자 + 빛의 퍼짐
      for (let k = 0; k < 3; k++) { const p = ((t * 0.35 + k / 3) % 1); ctx.strokeStyle = 'rgba(253,224,71,' + (0.5 * (1 - p)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gcx, gcy, 30 + p * Math.max(v.w, v.h) * 0.55, 0, 6.3); ctx.stroke(); }
      const r = rng(5);
      for (let i = 0; i < 13; i++) {
        const ax = v.x + 50 + r() * (v.w - 100), ay = v.y + 60 + r() * (v.h - 150), he = i === 6;
        const ang = t * (1.3 + (i % 3) * 0.3) + i;
        ctx.strokeStyle = 'rgba(147,197,253,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ax, ay, 19, 0, 6.3); ctx.stroke();
        if (he) { D.sphere(ax - 3, ay - 3, 6, '#ef4444', { gloss: false }); D.sphere(ax + 3, ay + 3, 6, '#9ca3af', { gloss: false }); D.sphere(ax + Math.cos(ang) * 19, ay + Math.sin(ang) * 19, 3.6, '#60a5fa', { gloss: false }); D.sphere(ax - Math.cos(ang) * 19, ay - Math.sin(ang) * 19, 3.6, '#60a5fa', { gloss: false }); D.text(ax, ay - 28, 'He', { size: 13, color: '#fde68a', weight: 800 }); }
        else { D.sphere(ax, ay, 6, '#ef4444', { gloss: false }); D.sphere(ax + Math.cos(ang) * 19, ay + Math.sin(ang) * 19, 3.6, '#60a5fa', { gloss: false }); if (i % 4 === 0) D.text(ax, ay - 28, 'H', { size: 13, color: '#bae6fd', weight: 800 }); }
      }
    } else {
      // 첫 별
      const cl = [[0.22, 0.4, 130, '#6366f1'], [0.55, 0.3, 150, '#8b5cf6'], [0.8, 0.55, 120, '#3b82f6'], [0.4, 0.7, 140, '#a855f7']];
      cl.forEach(([fx, fy, rad, c], i) => D.glow(v.x + v.w * fx + Math.sin(t * 0.3 + i) * 12, v.y + v.h * fy, rad, c, 0.28));
      const stars = [[0.25, 0.42, 0.6], [0.52, 0.3, 1.6], [0.78, 0.5, 2.6], [0.42, 0.66, 3.4], [0.64, 0.7, 4.2]];
      stars.forEach(([fx, fy, d0]) => {
        const k = clamp((t % 6 - d0 * 0.0 - 0) / 1, 0, 1), on = ((t + 6 - d0) % 6) < 4.5 ? 1 : 0.35;
        const sx = v.x + v.w * fx, sy = v.y + v.h * fy;
        D.glow(sx, sy, 38, '#bfdbfe', 0.5 * on); D.sphere(sx, sy, 6, '#e0f2fe', { gloss: false }); D.spark(sx, sy, 18 * on, t + fx * 5, '#ffffff');
      });
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; rr(v.x, v.y, v.w, v.h, 16).stroke();
    // 제목 라벨
    D.label(v.x + 16, v.y + 24, '⏱ ' + STAGE_TXT[st][0], { bg: 'rgba(15,23,42,.8)', color: '#fde68a', size: 15, align: 'left', border: 'rgba(253,230,138,.5)' });
    if (S.stFade > 0.01) { ctx.fillStyle = (st === 0 ? 'rgba(255,240,200,' : 'rgba(7,11,26,') + S.stFade * 0.85 + ')'; rr(v.x, v.y, v.w, v.h, 16).fill(); }
    // 아래 정보 카드
    const I = B.info; panel(I, '📖 ' + STAGE_TXT[st][0]);
    paragraph(STAGE_TXT[st][1], I.x + 14, I.y + 50, I.w - 28, 14.5, '#dbe4ff', 21, 600);
    // 질량비 카드
    const M = B.mass; panel(M, '📊 질량비 막대');
    const bx = M.x + 16, bw = M.w - 32, by = M.y + 44, bh = 30;
    ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(bx, by, bw, bh, 10).fill();
    S.massShow = RM ? (S.pct == null ? 0 : S.pct) : SciSim.approach(S.massShow, S.pct == null ? 0 : S.pct, dt, 4);
    if (S.pct != null) {
      const hw = bw * clamp(S.massShow, 0, 100) / 100;
      ctx.save(); rr(bx, by, bw, bh, 10).clip(); ctx.fillStyle = '#60a5fa'; ctx.fillRect(bx, by, hw, bh); ctx.fillStyle = '#fbbf24'; ctx.fillRect(bx + hw, by, bw - hw, bh); ctx.restore();
      D.text(bx + Math.max(6, Math.min(hw, bw) / 2), by + bh / 2 + 5, hw > 70 ? '수소 ' + Math.round(S.massShow) + '%' : '', { size: 14, color: '#0b1226', weight: 800 });
      if (bw - hw > 70) D.text(bx + hw + (bw - hw) / 2, by + bh / 2 + 5, '헬륨 ' + Math.round(100 - S.massShow) + '%', { size: 14, color: '#422006', weight: 800 });
    } else D.text(bx + 12, by + bh / 2 + 5, S.built ? '수소의 질량비(%)를 적어요' : '먼저 헬륨 핵을 만들어요', { size: 13.5, color: '#94a3b8', align: 'left', weight: 700 });
    // 현재 우주 표시
    const mk = bx + bw * 0.75; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mk, by - 5); ctx.lineTo(mk, by + bh + 5); ctx.stroke();
    D.text(mk, by + bh + 22, '현재 우주 75 %', { size: 13, color: '#e2e8f0', weight: 700 });
    if (S.built) {
      D.text(M.x + 16, M.y + M.h - 40, '수소 핵 12개 → 질량 12', { size: 13.5, color: '#93c5fd', align: 'left', weight: 800 });
      D.text(M.x + 16, M.y + M.h - 18, '헬륨 핵 1개 → 질량 4 (양성자 2 + 중성자 2)', { size: 13.5, color: '#fde68a', align: 'left', weight: 800 });
    } else D.text(M.x + 16, M.y + M.h - 18, '질량 = 양성자·중성자의 개수 (1개 = 1)', { size: 13.5, color: '#94a3b8', align: 'left', weight: 700 });
  }

  /* ======================================================
     장면 4: 우주 구성 (원 그래프 + 값 카드)
     ====================================================== */
  const PIES = [
    { title: '원자 수 비 (개수)', vals: [92, 8, 0.12] }, { title: '질량비 (무게)', vals: [74.9, 23.8, 1.3] },
  ];
  const PCOL = ['#60a5fa', '#fbbf24', '#a78bfa'], PNAME = ['수소', '헬륨', '그 밖의 원소'];
  const CARD_DEF = [
    { id: 'a92', label: '약 92 %' }, { id: 'a8', label: '약 8 %' }, { id: 'a01', label: '0.1 % 미만' },
    { id: 'm75', label: '약 75 %' }, { id: 'm24', label: '약 24 %' }, { id: 'm12', label: '약 1~2 %' },
  ];
  const PIE_ANS = [['a92', 'a8', 'a01'], ['m75', 'm24', 'm12']];
  function initPie() {
    const order = [3, 0, 5, 2, 4, 1];   // 섞어서 놓기
    S.cards = order.map((di, k) => { const d = CARD_DEF[di], r = PIEL.cards(k); return { id: d.id, label: d.label, hx: r.x, hy: r.y, x: r.x, y: r.y, w: r.w, h: r.h, slot: -1, bad: false, lift: 0, shake: 0 }; });
    S.pieSlots = []; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { const r = PIEL.slots(i, j); S.pieSlots.push({ i, j, x: r.x, y: r.y, w: r.w, h: r.h, card: null, ans: PIE_ANS[i][j] }); }
    S.pieOK = 0;
  }
  function drawPie(t, dt) {
    drawBg(t, false);
    PIEL.pies.forEach((p, i) => {
      const pd = PIES[i], tot = pd.vals.reduce((s, x) => s + x, 0);
      const prog = S.pieShow;
      D.text(p.cx, PIEL.titleY[i] + (PHONE ? 0 : 0) - (PHONE ? 0 : 0), pd.title, { size: 16, color: '#f1f5f9', weight: 800 });
      let a = -Math.PI / 2;
      D.shadow(() => { ctx.fillStyle = '#0b1226'; ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r + 4, 0, 6.3); ctx.fill(); }, { blur: 12, y: 3, color: 'rgba(0,0,0,.5)' });
      pd.vals.forEach((v, k) => {
        const da = v / tot * 6.2832 * prog;
        if (da > 0.001) {
          ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(p.cx, p.cy); ctx.arc(p.cx, p.cy, p.r, a, a + Math.max(da, 0.012)); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#0b1226'; ctx.lineWidth = 2; ctx.stroke();
        }
        a += da;
      });
      ctx.fillStyle = '#0b1226'; ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r * 0.42, 0, 6.3); ctx.fill();
      D.text(p.cx, p.cy + 5, i === 0 ? '개수' : '무게', { size: 14, color: '#94a3b8', weight: 800 });
    });
    // 칸
    S.pieSlots.forEach((s) => {
      const cl = PCOL[s.j];
      ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(s.x, s.y, s.w, s.h, 12).fill();
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.2; rr(s.x, s.y, s.w, s.h, 12).stroke();
      D.sphere(s.x + 18, s.y + s.h / 2, 7, cl, { gloss: false });
      D.text(s.x + 32, s.y + s.h / 2 + 5, PNAME[s.j], { size: 14, color: '#e6ecff', align: 'left', weight: 800 });
      const dz = dropZone(s);
      ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; rr(dz.x, dz.y, dz.w, dz.h, 9).stroke(); ctx.setLineDash([]);
      if (!s.card) D.text(dz.x + dz.w / 2, dz.y + dz.h / 2 + 5, '카드 놓기', { size: 12.5, color: '#64748b', weight: 700 });
    });
    D.text(PHONE ? 24 : 45, PIEL.cardTitleY, '👇 값 카드 (끌어서 놓아요)', { size: 14.5, color: '#bae6fd', align: 'left', weight: 800 });
    S.cards.forEach((c) => {
      const sh = c.shake > 0 ? Math.sin(c.shake * 30) * 4 : 0, lift = c.lift;
      D.shadow(() => { ctx.fillStyle = c.bad ? '#fecaca' : '#f8fafc'; rr(c.x - c.w / 2 + sh - lift * 2, c.y - c.h / 2 - lift * 4, c.w + lift * 4, c.h + lift * 2, 12).fill(); }, { blur: 6 + lift * 10, y: 2 + lift * 4, color: 'rgba(0,0,0,.45)' });
      if (c.bad) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; rr(c.x - c.w / 2 + sh, c.y - c.h / 2, c.w, c.h, 12).stroke(); }
      D.text(c.x + sh, c.y + 6, c.label, { size: 16, color: '#0b1226', weight: 800 });
    });
    const nt = PIEL.note;
    paragraph('💡 헬륨 원자 1개의 질량은 수소 원자 1개의 약 4배예요.' + (S.pieOK ? ' 그래서 개수는 적어도(8 %) 무게로는 약 24 %를 차지해요. 수소 : 헬륨 = 약 12 : 1(개수).' : ''), nt.x, nt.y, nt.w, 14.5, S.pieOK ? '#86efac' : '#cbd5e1', 21, 700);
  }
  function dropZone(s) { return { x: s.x + s.w - 120, y: s.y + 3, w: 114, h: s.h - 6 }; }
  function placeCard(c, s) { c.slot = S.pieSlots.indexOf(s); s.card = c; }
  function stepCards(dt) {
    S.cards.forEach((c) => {
      let tx = c.hx, ty = c.hy;
      if (c.slot >= 0) { const dz = dropZone(S.pieSlots[c.slot]); tx = dz.x + dz.w / 2; ty = dz.y + dz.h / 2; }
      const dr = S.drag && S.drag.c === c;
      if (!dr) { c.x = RM ? tx : SciSim.approach(c.x, tx, dt, 14); c.y = RM ? ty : SciSim.approach(c.y, ty, dt, 14); }
      c.lift = RM ? (dr ? 1 : 0) : SciSim.approach(c.lift, dr ? 1 : 0, dt, 16);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 3);
      if (c.slot >= 0) { c.w = Math.min(104, c.w); c.h = Math.min(36, c.h); } else { const r = PIEL.cards(S.cards.indexOf(c)); c.w = SciSim.approach(c.w, r.w, dt, 14); c.h = SciSim.approach(c.h, r.h, dt, 14); }
    });
  }

  /* ======================================================
     입력
     ====================================================== */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'obs') {
        const L = OBSL;
        // 하늘의 천체 (탭)
        for (let i = 0; i < 3; i++) if (Math.hypot(p.x - L.objX[i], p.y - L.objY) < L.objR + 22) { selectObj(OBJ_IDS[i]); return false; }
        // 앨범 타일 (탭)
        if (!tableMode()) {
          const P = L.panel, gap = 12, w = (P.w - gap * 2) / 3;
          for (let i = 0; i < 3; i++) if (p.x > P.x + i * (w + gap) && p.x < P.x + i * (w + gap) + w && p.y > P.y && p.y < P.y + P.h) { selectObj(OBJ_IDS[i]); return false; }
        } else {
          for (let oi = 0; oi < 3; oi++) for (let ei = 0; ei < 3; ei++) {
            const r = cellRect(oi, ei);
            if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) { toggleCell(OBJ_IDS[oi], EKEYS[ei]); return false; }
          }
        }
        return false;
      }
      if (S.mode === 'bang') {
        if (S.stage !== 2 || S.built || S.fuse) return false;
        let best = null, bd = 30;
        S.items.forEach((it) => { if (it.used) return; const d = Math.hypot(it.x - p.x, it.y - p.y); if (d < bd) { bd = d; best = it; } });
        if (!best) return false;
        if (best.slot >= 0) { S.slot[best.slot] = null; best.slot = -1; }
        S.drag = { it: best, ox: best.x - p.x, oy: best.y - p.y }; Sound.tick();
        return true;
      }
      if (S.mode === 'pie') {
        let best = null;
        for (let i = S.cards.length - 1; i >= 0; i--) { const c = S.cards[i]; if (Math.abs(p.x - c.x) < c.w / 2 + 4 && Math.abs(p.y - c.y) < c.h / 2 + 4) { best = c; break; } }
        if (!best) return false;
        if (best.slot >= 0) { S.pieSlots[best.slot].card = null; best.slot = -1; }
        const r = PIEL.cards(S.cards.indexOf(best)); best.w = r.w; best.h = r.h; best.bad = false;
        S.cards.splice(S.cards.indexOf(best), 1); S.cards.push(best);   // 맨 위로
        S.drag = { c: best, ox: best.x - p.x, oy: best.y - p.y }; Sound.tick();
        return true;
      }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      if (d.it) { d.it.x = p.x + d.ox; d.it.y = p.y + d.oy; } else { d.c.x = p.x + d.ox; d.c.y = p.y + d.oy; }
    },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null;
      if (d.it) dropItem(d.it, p); else dropCard(d.c);
    },
    hover(p) {
      if (S.mode === 'bang' && S.stage === 2 && !S.built) { const hit = S.items.some((it) => !it.used && Math.hypot(it.x - p.x, it.y - p.y) < 26); return hit ? 'grab' : 'default'; }
      if (S.mode === 'pie') return S.cards.some((c) => Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2) ? 'grab' : 'default';
      return 'default';
    },
  });
  function dropItem(it, p) {
    const ac = BANG.ac; let hit = -1;
    SL.forEach((s, i) => { if (Math.hypot(ac.x + s.dx - it.x, ac.y + s.dy - it.y) < 34 && hit < 0) hit = i; });
    if (hit >= 0 && SL[hit].k === it.k && !S.slot[hit]) {
      S.slot[hit] = it; it.slot = hit; Sound.click();
      parts.burst(ac.x + SL[hit].dx, ac.y + SL[hit].dy, { count: 5, speed: 60, size: 2.5, life: 0.4, colors: ['#bae6fd'], gravity: 0 });
      if (S.slot.every((x) => x)) { S.fuse = { t: 0, done: false }; Sound.tick(); }
    } else {
      if (hit >= 0) { it.shake = 0.5; Sound.fail(); if (S.slot[hit] == null && SL[hit].k !== it.k) toast(SL[hit].k === 'p' ? '이 칸은 양성자(+) 칸이에요.' : '이 칸은 중성자(n) 칸이에요.', 'bad', 1400); }
      it.vx = (Math.random() - 0.5) * 80; it.vy = (Math.random() - 0.5) * 80;
      const bd = stageBounds(2); if (it.x > bd.x + bd.w) it.x = bd.x + bd.w - IR - 6;
    }
  }
  function dropCard(c) {
    let hit = null, best = 1e9;
    S.pieSlots.forEach((s) => { const dz = dropZone(s); const d = Math.hypot(c.x - (dz.x + dz.w / 2), c.y - (dz.y + dz.h / 2)); if (d < 54 && d < best) { best = d; hit = s; } });
    if (hit) {
      if (hit.card) { const o = hit.card; o.slot = -1; hit.card = null; }
      placeCard(c, hit); Sound.click();
    } else { c.slot = -1; }
  }

  function selectObj(id) {
    if (S.obj === id) return;
    S.obj = id; S.rev = 0; Sound.tick(); updateCtl();
  }
  function toggleCell(o, e) {
    S.cells[o][e] = !S.cells[o][e]; S.cellT[o + e] = S.t; S.cellBad[o + e] = false; Sound.tick();
    if (S.obj !== o) selectObj(o);
  }
  function capture() {
    if (S.mode !== 'obs') return;
    S.flash = 1; Sound.success();
    const first = !S.cap.has(S.obj);
    S.cap.add(S.obj); if (first) S.capT[S.obj] = S.t;
    const L = OBSL, i = OBJ_IDS.indexOf(S.obj);
    parts.burst(L.objX[i], L.objY, { count: 14, speed: 150, size: 3, life: 0.7, colors: ['#bae6fd', '#fff', '#fde68a'], gravity: 0 });
    S.rev = 0;
  }

  /* ---------- HTML 컨트롤 ---------- */
  const ctl = { obj: $$('#objBtns .opt'), tmpl: $$('#tmplBtns .opt'), scene: $$('#sceneBtns .opt'), stage: $$('#stageSeg button') };
  ctl.obj.forEach((b) => b.addEventListener('click', () => selectObj(b.dataset.obj)));
  ctl.tmpl.forEach((b) => b.addEventListener('click', () => { Sound.tick(); S.tmpl[b.dataset.tmpl] = !S.tmpl[b.dataset.tmpl]; updateCtl(); }));
  ctl.scene.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  ctl.stage.forEach((b) => b.addEventListener('click', () => { Sound.click(); setStage(+b.dataset.st); }));
  $('#bShot').addEventListener('click', capture);
  const sZ = $('#sZ'), oZ = $('#oZ');
  const bZ = SciSim.bindRange(sZ, oZ, (v) => '+' + (v * 100).toFixed(1) + ' %', (v) => { S.zT = v; });
  $('#bReset').addEventListener('click', () => { Sound.click(); initItems(); S.stFade = 0.6; updateCtl(); });
  $('#bPieReset').addEventListener('click', () => { Sound.click(); initPie(); });
  $('#bPct').addEventListener('click', () => {
    const v = parseFloat(String($('#inPct').value).replace(',', '.'));
    if (!isFinite(v)) { toast('숫자를 먼저 적어 주세요.', 'bad', 1400); return; }
    S.pct = clamp(v, 0, 100); Sound.tick();
  });
  $('#inPct').addEventListener('input', () => { const v = parseFloat(String($('#inPct').value).replace(',', '.')); S.pct = isFinite(v) ? clamp(v, 0, 100) : null; });

  function setScene(m) {
    if (S.mode !== m) { S.fade = 1; S.mode = m; }
    if (m === 'pie' && !S.cards.length) initPie();
    if (m === 'pie') S.pieShow = 0, SciSim.tween(S, { pieShow: 1 }, { duration: 1.1, ease: 'outCubic' });
    updateCtl();
  }
  function setStage(st) {
    if (S.stage === st) return;
    S.stage = st; S.stFade = 1; S.mode = 'bang';
    if (st === 0) parts.burst(BANG.view.x + BANG.view.w / 2, BANG.view.y + BANG.view.h / 2, { count: 30, speed: 260, size: 4, life: 1, colors: ['#fde68a', '#fb923c', '#fff'], gravity: 0 });
    updateCtl();
  }
  const MODE_LABEL = { obs: '🔭 천체 스펙트럼', bang: '🕰️ 우주 초기', pie: '🥧 우주 구성' };
  function updateCtl() {
    const st = stepNo(), free = !!(game && game.free);
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => {
      const mo = c.dataset.modes;
      let ok = mo === 'free' ? free : mo.split(' ').includes(S.mode);
      const need = c.dataset.need;
      if (ok && need === 'tmpl') ok = free || has('templates');
      if (ok && need === 'z') ok = (free || has('templates')) && S.obj === 'gal';
      if (ok && need === 'pct') ok = free || has('massbar');
      c.hidden = !ok;
    });
    $('#bShot').hidden = !(free || stepNo() === 0 || has('telescope'));
    $('#stageSeg').hidden = S.mode !== 'bang';
    ctl.obj.forEach((b) => b.classList.toggle('on', b.dataset.obj === S.obj));
    ctl.tmpl.forEach((b) => b.classList.toggle('on', !!S.tmpl[b.dataset.tmpl]));
    ctl.scene.forEach((b) => b.classList.toggle('on', b.dataset.scene === S.mode));
    ctl.stage.forEach((b) => b.classList.toggle('on', +b.dataset.st === S.stage));
    $('#bangNote').textContent = S.stage === 2 ? (S.built ? '헬륨 핵을 만들었어요! 아래 막대 계산으로 이어 가요.' : '입자를 끌어 조립대의 칸(p⁺ 2개, n⁰ 2개)에 놓아요.') : '위의 시간 버튼을 눌러 우주의 변화를 따라가요. "3분"에서 헬륨을 만들어 봐요.';
  }

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let A, a, B, b, C, c;
    if (S.mode === 'obs') {
      const o = OBJ[S.obj];
      A = '관측 대상'; a = o.name; B = '스펙트럼'; b = o.kind; C = tableMode() ? '기준 선 이동' : '촬영한 스펙트럼';
      c = tableMode() ? (S.obj === 'gal' ? '+' + (S.z * 100).toFixed(1) + ' %' : '없음') : S.cap.size + ' / 3장';
    } else if (S.mode === 'bang') {
      A = '시각'; a = STAGE_TXT[S.stage][0].replace('빅뱅 후 ', ''); B = '양성자 : 중성자'; b = '14 : 2'; C = '헬륨 핵'; c = S.built ? '1개 완성' : '0개';
      if (S.stage >= 3) { B = '수소 : 헬륨 (개수)'; b = '약 12 : 1'; C = '질량비'; c = '수소 75 % · 헬륨 25 %'; }
    } else {
      A = '원자 수 비'; a = '수소 약 92 %'; B = '질량비'; b = '수소 약 75 %'; C = '채운 칸'; c = S.pieSlots.filter((s) => s.card).length + ' / 6';
    }
    const key = A + a + B + b + C + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = A; v1.textContent = a; l2.textContent = B; v2.textContent = b; l3.textContent = C; v3.textContent = c;
  }
  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li <= 1) { S.mode = 'obs'; S.fade = 1; if (li === 0) { S.cap = new Set(); S.obj = 'sun'; S.rev = 0; S.tmpl = { H: false, He: false, Na: false }; } else { S.obj = 'sun'; S.rev = 0; S.z = S.zT = 0; sZ.value = 0; bZ.refresh(); S.tmpl = { H: false, He: false, Na: false }; S.cells = { sun: {}, orion: {}, gal: {} }; S.cellBad = {}; } }
    else if (li === 2) { S.mode = 'bang'; S.fade = 1; S.stage = 2; S.stFade = 1; initItems(); }
    else { setScene('pie'); initPie(); }
    updateCtl();
  }
  function ensureObs() { if (S.mode !== 'obs') { S.mode = 'obs'; S.fade = 1; } updateCtl(); }
  function ensureBang(st) { if (S.mode !== 'bang') { S.mode = 'bang'; S.fade = 1; } if (st != null && S.stage !== st) { S.stage = st; S.stFade = 1; } updateCtl(); }
  function ensurePie() { if (S.mode !== 'pie') setScene('pie'); updateCtl(); }
  function cellBadList() {
    const bad = [];
    OBJ_IDS.forEach((id) => EKEYS.forEach((e) => { const want = !!OBJ[id].has[e], got = !!S.cells[id][e]; if (want !== got) bad.push([id, e, got]); }));
    return bad;
  }
  const levels = [
    {
      title: '천체의 빛을 분광기로', short: '천체 스펙트럼', icon: '🔭', phase: '관찰',
      features: ['telescope', 'album'],
      intro: '<p class="si-q">❓ 탐구 질문: 우주에는 어떤 원소가 가장 많으며, 그 원소들은 언제 만들어졌을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 분광기로 원소마다 다른 선의 위치(지문)를 확인했고, 별빛 속의 어두운 흡수선으로 천체의 원소를 알 수 있다고 배웠어요. 또 <b>중학교</b>에서는 멀어지는 은하와 팽창하는 우주(중2 Ⅷ)를 배웠어요.</div>' +
        '<p>가상 망원경에 분광기를 달아 <b>태양, 오리온 성운, 먼 은하</b>의 스펙트럼을 촬영해 봐요. 모의 관측 자료(단순화)를 사용해요.</p>',
      setup() { enterLevel(0); showHint('🔭 천체를 누르고 📷 촬영 버튼을 눌러요', 6000); },
      recap: '천체의 스펙트럼을 찍으면 천체를 이루는 원소를 알아낼 수 있어요. 먼 은하의 스펙트럼은 전체가 붉은 쪽으로 밀려 있어요.',
      summary: '<ul><li>천체에서 오는 빛을 <b>분광기</b>로 나누면 <b>스펙트럼</b>을 얻어요. 가 보지 않고도 구성 물질을 알 수 있어요.</li><li><b>태양</b>: 연속 스펙트럼 + 어두운 흡수선, <b>오리온 성운</b>: 밝은 방출선, <b>먼 은하</b>: 선의 패턴이 같지만 전체가 <b>붉은 쪽(파장이 긴 쪽)</b>으로 밀려 있어요(적색 편이).</li></ul>',
      missions: [
        {
          title: '천체 3개 촬영하기',
          goal: '태양, 오리온 성운, 먼 은하를 차례로 겨냥하고 <b>📷 스펙트럼 촬영</b>을 눌러 <b>3장</b>을 모두 찍으세요.',
          hint: '위쪽 하늘에서 천체를 누르거나, 오른쪽의 천체 버튼을 눌러 조준해요.',
          setup() { ensureObs(); },
          check: () => S.cap.size >= 3, hold: 0.4,
          status: () => OBJ_IDS.map((id) => mark(S.cap.has(id)) + ' ' + OBJ[id].name).join(' · '),
          explain: '태양은 연속 스펙트럼 속의 <b>어두운 선</b>(흡수선), 오리온 성운은 어두운 바탕 위의 <b>밝은 선</b>(방출선)이 보여요. 두 스펙트럼 모두 선의 위치가 원소에 따라 정해져 있어요.',
        },
        {
          type: 'quiz', title: '스펙트럼으로 알 수 있는 것',
          goal: '천체의 스펙트럼을 분석하면 가장 직접적으로 알 수 있는 것은 무엇일까요?',
          setup() { ensureObs(); },
          choices: ['천체를 이루는 원소의 종류', '천체까지 가는 우주선의 속도', '천체의 정확한 지름', '천체 표면의 지형'],
          answer: 0,
          feedback: ['', '스펙트럼의 선 위치는 원소의 종류에 대한 정보예요.', '지름은 스펙트럼 선의 위치만으로는 알 수 없어요.', '지형은 사진이나 탐사선이 있어야 보여요. 스펙트럼은 빛의 파장별 세기를 보여 줘요.'],
          explain: '원소마다 선의 위치(파장)가 달라서, 천체의 스펙트럼에서 선을 찾으면 그 천체에 어떤 <b>원소</b>가 있는지 알 수 있어요. 직접 가 보지 않아도 별을 분석할 수 있는 까닭이에요.',
        },
        {
          type: 'quiz', title: '먼 은하의 스펙트럼',
          goal: '먼 은하의 스펙트럼은 태양과 비교했을 때 선 전체가 어느 쪽으로 밀려 있나요?',
          setup() { ensureObs(); S.obj = 'gal'; S.rev = 0; updateCtl(); },
          choices: ['붉은 쪽(파장이 긴 쪽, 오른쪽)', '푸른 쪽(파장이 짧은 쪽, 왼쪽)', '밀려 있지 않다', '선이 모두 사라진다'],
          answer: 0,
          feedback: ['', '푸른 쪽이 아니에요. 오른쪽(붉은 쪽)으로 밀려 있어요.', '선의 위치를 태양과 비교해 보세요. 모든 선이 같은 방향으로 이동했어요.', '선은 그대로 있지만 위치만 옮겨졌어요.'],
          explain: '멀어지는 은하의 빛은 파장이 길어져 선이 <b>붉은 쪽</b>으로 밀려요(<b>적색 편이</b>). 모든 먼 은하가 이렇게 보인다는 것이 우주가 팽창한다는 증거예요(중2 Ⅷ에서 배운 내용). 선의 패턴(원소의 지문)은 그대로라서 원소는 알아낼 수 있어요.',
        },
      ],
    },
    {
      title: '선을 맞춰 원소 알아내기', short: '원소 알아내기', icon: '🧩', phase: '탐구',
      features: ['templates', 'table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 천체의 스펙트럼을 촬영했어요. 먼 은하는 선 전체가 붉은 쪽으로 밀려 있었죠.</div>' +
        '<p>앞 차시에서 기록한 수소·헬륨·나트륨의 <b>기준 선 막</b>(투명한 템플릿)을 스펙트럼 위에 겹쳐 선이 맞는지 확인해요. 먼 은하는 막 전체를 <b>같은 비율로</b> 밀어서 맞춰야 해요.</p>' +
        '<p>선이 짙고 밝을수록 그 원소가 더 많이 들어 있다고 볼 수 있어요(단순화).</p>',
      setup() { enterLevel(1); showHint('📋 기준 선 막을 겹쳐 선이 맞는지 봐요', 6000); },
      recap: '기준 선과 모두 겹치면 그 원소가 있어요. 세 천체 모두에서 수소 선이 가장 강하고, 그다음이 헬륨이에요.',
      summary: '<table class="mini"><tr><th>천체</th><th>수소</th><th>헬륨</th><th>나트륨</th></tr><tr><td>태양</td><td>○</td><td>○</td><td>○</td></tr><tr><td>오리온 성운</td><td>○</td><td>○</td><td>×</td></tr><tr><td>먼 은하</td><td>○</td><td>○</td><td>○</td></tr></table><ul><li>먼 은하는 기준 선 막을 <b>같은 비율</b>(약 8 %)로 밀면 선이 모두 맞아요(적색 편이).</li><li>세 천체 모두 <b>수소 선이 가장 강하고</b>, 헬륨이 그다음이에요.</li></ul>',
      missions: [
        {
          title: '먼 은하에 막 맞추기',
          goal: '<b>먼 은하</b>를 고르고 <b>수소</b> 기준 선 막을 겹친 뒤, 슬라이더로 막을 밀어 선 4개가 모두 맞게 해 보세요.',
          hint: '수소 막을 켜고 슬라이더를 오른쪽(붉은 쪽)으로 조금씩 밀어요. 위쪽의 "일치" 칩이 4/4가 되면 돼요.',
          setup() { ensureObs(); S.obj = 'gal'; S.rev = 0; updateCtl(); },
          check: () => S.obj === 'gal' && S.tmpl.H && Math.abs(S.z - ZT) <= 0.008, hold: 0.8,
          status: () => mark(S.obj === 'gal') + ' 먼 은하 · ' + mark(S.tmpl.H) + ' 수소 막 · ' + (Math.abs(S.z - ZT) <= 0.008 ? '✅' : '⬜') + ' 막을 ' + (S.z * 100).toFixed(1) + ' % 밀었어요',
          explain: '먼 은하의 수소 선 4개는 막을 약 <b>8 %</b> 밀었을 때 모두 맞아요. 656 nm 선은 약 709 nm로, 486 nm 선은 약 525 nm로 가는 것처럼 <b>모든 선이 같은 비율</b>로 파장이 길어져요. 패턴은 그대로이므로 같은 원소예요.',
        },
        {
          title: '천체마다 포함된 원소 찾기',
          goal: '세 천체에서 기준 선이 맞는 원소를 표에서 눌러 <b>✓</b> 표시하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '천체를 고르고 수소·헬륨·나트륨 막을 차례로 겹쳐 봐요. 먼 은하는 막을 밀어야 하고, 선이 없는 원소는 표시하지 않아요.',
          manual: true,
          setup() { ensureObs(); },
          check() {
            const bad = cellBadList();
            const key = bad.map((b) => b[0] + b[1]).join();
            OBJ_IDS.forEach((id) => EKEYS.forEach((e) => { S.cellBad[id + e] = false; }));
            if (!bad.length) return true;
            const list = bad.slice(0, 3).map(([id, e, got]) => '<b>' + OBJ[id].name + '</b>의 ' + EL[e].name + (got ? '(선이 맞지 않아요)' : '(선이 있어요)')).concat(bad.length > 3 ? ['…'] : []);
            bad.forEach(([id, e]) => { S.cellBad[id + e] = true; });
            return list.join(', ') + ' 칸을 다시 확인해요.';
          },
          explain: '<b>태양</b>과 <b>먼 은하</b>에는 수소·헬륨·나트륨이 모두 있고, <b>오리온 성운</b>에는 수소와 헬륨 선만 있어요. 어느 천체에서든 수소 선이 가장 강하고 그다음이 헬륨이에요.',
        },
        {
          type: 'quiz', title: '먼 은하에서도 보이는 수소 선',
          goal: '지구에서 아주 먼 은하의 스펙트럼에서도 수소 선이 가장 강하게 나타나요. 이것이 뜻하는 것은 무엇일까요?',
          setup() { ensureObs(); },
          choices: ['우주 어디서나 수소가 가장 흔한 원소이다', '수소는 지구에서만 만들어져 빛과 함께 은하로 날아갔다', '은하는 수소 때문에 붉게 보인다', '수소가 있는 은하만 스펙트럼을 찍을 수 있다'],
          answer: 0,
          feedback: ['', '은하의 빛은 은하에서 지구로 오는 것이에요. 수소가 지구에서 은하로 가는 것이 아니에요.', '붉게 보이는 것은 은하가 멀어지며 파장이 길어졌기 때문이에요. 원소의 색과는 관계없어요.', '모든 은하는 스펙트럼을 찍을 수 있어요.'],
          explain: '가까운 태양부터 먼 은하, 성운까지 <b>모든 천체에서 수소가 가장 많은 원소</b>로 나타나요. 우주의 구성 원소는 어디서나 비슷하다는 뜻이에요. 그렇다면 이 수소와 헬륨은 언제 만들어졌을까요?',
        },
      ],
    },
    {
      title: '우주 초기: 수소와 헬륨의 탄생', short: '우주 초기', icon: '🕰️', phase: '모형',
      features: ['timeline', 'builder', 'massbar'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 어느 천체에서나 수소가 가장 많고 그다음이 헬륨이라는 것을 알았어요. 이 두 원소는 <b>우주 초기</b>에 만들어졌어요.</div>' +
        '<p><b>시간 버튼</b>(빅뱅 → 1초 → 3분 → 38만 년 → 1억 년 후)으로 우주의 모습을 따라가요. <b>빅뱅 후 약 3분</b>에는 양성자와 중성자가 합쳐져 헬륨 원자핵이 만들어져요.</p>' +
        '<p>양성자 14개와 중성자 2개의 입자 수프에서 <b>헬륨 핵(양성자 2 + 중성자 2)</b>을 직접 조립하고, 남은 양성자(수소 핵)와의 <b>질량비</b>를 구해 봐요.</p>',
      setup() { enterLevel(2); showHint('⚛ 입자를 끌어 조립대의 칸에 놓아요', 6000); },
      recap: '빅뱅 후 약 3분 동안 양성자와 중성자가 합쳐져 헬륨 핵이 만들어졌어요. 그 결과 질량비는 수소 약 75 %, 헬륨 약 25 %예요.',
      summary: '<ul><li>빅뱅 후 약 <b>3분</b>: 양성자 + 중성자 → <b>헬륨 원자핵</b> (우주 초기 핵합성). 남은 양성자는 수소 핵.</li><li>빅뱅 후 약 <b>38만 년</b>: 전자가 붙잡혀 <b>원자</b>가 만들어지고 빛이 퍼져 나감(우주 배경 복사).</li><li>단순 모형: 양성자 14 + 중성자 2 → 헬륨 핵 1개(질량 4) + 수소 핵 12개(질량 12) → 개수비 수소 : 헬륨 = <b>12 : 1</b>, 질량비 = <b>3 : 1</b> (수소 약 75 %, 헬륨 약 25 %).</li><li>그 뒤 수소·헬륨 구름이 뭉쳐 첫 별이 만들어졌어요.</li></ul>',
      missions: [
        {
          title: '헬륨 핵 만들어 보기',
          goal: '<b>빅뱅 후 약 3분</b>의 입자 수프에서 양성자 2개와 중성자 2개를 끌어 <b>헬륨 핵</b>을 완성하세요.',
          hint: '빨간 구슬(양성자 +)은 p⁺ 칸 두 개에, 회색 구슬(중성자 n)은 n⁰ 칸 두 개에 넣어요. 중성자는 2개뿐이에요.',
          setup() { ensureBang(2); },
          check: () => S.built, hold: 0.3,
          status: () => '양성자 칸 ' + [0, 1].filter((i) => S.slot[i]).length + ' / 2 · 중성자 칸 ' + [2, 3].filter((i) => S.slot[i]).length + ' / 2 ' + (S.built ? '✅ 헬륨 핵 완성' : ''),
          explain: '헬륨 핵은 <b>양성자 2개 + 중성자 2개</b>로 이루어져요. 이 모형에서 중성자 2개를 모두 쓰면 헬륨 핵 1개가 만들어지고, 양성자 <b>12개</b>가 수소 원자핵으로 남아요. 수소와 헬륨의 개수비는 <b>12 : 1</b>이에요.',
        },
        {
          title: '질량비 막대 채우기',
          goal: '수소 핵 12개(질량 12)와 헬륨 핵 1개(질량 4)에서 <b>수소의 질량비(%)</b>를 구해 적고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '수소의 질량비 = 수소의 질량 ÷ 전체 질량 × 100. 전체 질량은 12 + 4 = 16이에요.',
          manual: true,
          setup() { ensureBang(2); },
          check() {
            if (!S.built) return '먼저 헬륨 핵을 만들어야 해요. (3분 장면에서 조립)';
            const raw = String($('#inPct').value).trim().replace(',', '.');
            if (!raw) return '수소의 질량비를 아래 입력칸에 적어 주세요.';
            const v = parseFloat(raw);
            if (!isFinite(v)) return '숫자로 적어 주세요.';
            if (Math.abs(v - 75) <= 1.5) return true;
            if (Math.abs(v - 25) <= 1.5) return '25 %는 <b>헬륨</b>의 질량비예요. 수소의 질량비를 적어요.';
            if (Math.abs(v - 92.3) <= 1.5) return '12 ÷ 13은 핵의 <b>개수</b>로 계산한 값이에요. 헬륨 핵 1개의 질량은 4(양성자 2 + 중성자 2)로 계산해요.';
            if (Math.abs(v - 85.7) <= 1.5) return '헬륨 핵 1개의 질량은 <b>4</b>예요. 12 ÷ (12 + 4)로 계산해 봐요.';
            return '수소의 질량 12 ÷ 전체 질량 16 × 100 을 계산해 보세요.';
          },
          explain: '수소 질량 12 ÷ 전체 16 = 0.75 → <b>수소 75 %, 헬륨 25 %</b>예요. 개수는 12 : 1로 헬륨이 훨씬 적지만, 헬륨 핵 하나가 수소 핵의 4배 무거워서 질량으로는 25 %를 차지해요. 현재 우주의 실제 값(수소 약 74~75 %, 헬륨 약 24~25 %)과 거의 같아요!',
        },
        {
          type: 'quiz', title: '헬륨은 어디서 만들어졌을까',
          goal: '우주에 있는 헬륨의 대부분은 어디서 만들어졌을까요?',
          setup() { ensureBang(3); },
          choices: ['대부분 빅뱅 후 약 3분 동안 우주 초기에 만들어졌다 (별에서도 일부 만들어진다)', '헬륨은 별 속에서만 만들어진다', '헬륨은 지구에서 만들어져 우주로 퍼졌다', '헬륨은 빅뱅 후 38만 년에 원자가 만들어질 때 처음 만들어졌다'],
          answer: 0,
          feedback: ['', '별 속에서도 헬륨이 만들어지지만, 우주의 헬륨 대부분은 우주 초기 약 3분 동안 만들어졌어요.', '지구의 헬륨은 우주에 있는 양에 비하면 아주 적어요. 헬륨은 우주 초기와 별에서 만들어졌어요.', '38만 년에는 이미 만들어진 헬륨 핵이 전자를 붙잡아 헬륨 원자가 된 거예요. 핵은 3분 무렵에 만들어졌어요.'],
          explain: '수소와 헬륨은 <b>우주 초기</b>에 만들어져 지금 우주의 주요 구성 원소가 되었어요. 별이 헬륨을 조금 더 만들긴 하지만, 헬륨의 대부분은 빅뱅 후 약 3분 동안 만들어졌어요.',
        },
      ],
    },
    {
      title: '우주의 구성 원소 비율', short: '적용', icon: '🥧', phase: '적용',
      features: ['pie'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량비로 수소 약 75 %, 헬륨 약 25 %라는 값을 얻었어요. 그런데 <b>개수</b>로 세면 같은 값일까요?</div>' +
        '<p>두 원 그래프는 현재 우주의 <b>원자 수 비</b>와 <b>질량비</b>예요. 값 카드 6장을 끌어 알맞은 칸에 놓아 두 비율을 구분해 봐요. 헬륨 원자는 수소 원자보다 약 <b>4배 무거워요</b>.</p>',
      setup() { enterLevel(3); showHint('🥧 값 카드를 끌어 알맞은 칸에 놓아요', 6000); },
      recap: '우주의 원자 수 비는 수소 약 92 %·헬륨 약 8 %, 질량비는 수소 약 75 %·헬륨 약 24 %예요. 그 밖의 원소는 아주 적어요.',
      summary: '<table class="mini"><tr><th></th><th>원자 수 비</th><th>질량비</th></tr><tr><th>수소</th><td>약 92 %</td><td>약 75 %</td></tr><tr><th>헬륨</th><td>약 8 %</td><td>약 24 %</td></tr><tr><th>그 밖의 원소</th><td>0.1 % 미만</td><td>약 1~2 %</td></tr></table><ul><li>헬륨 원자 1개는 수소 원자 1개보다 약 <b>4배 무거워서</b> 질량비에서 차지하는 몫이 더 커요.</li><li>산소·탄소 같은 무거운 원소는 우주 초기가 아니라 <b>별 속에서</b> 만들어졌어요.</li></ul>',
      missions: [
        {
          title: '원 그래프에 값 카드 놓기',
          goal: '값 카드 6장을 <b>원자 수 비</b>와 <b>질량비</b> 아래의 알맞은 칸에 모두 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '원 그래프의 조각 크기를 살펴봐요. 원자 수 비는 수소 조각이 가장 크고 헬륨 조각은 작아요. 질량비에서는 헬륨이 더 커 보여요.',
          manual: true,
          setup() { ensurePie(); },
          check() {
            const un = S.pieSlots.filter((s) => !s.card);
            if (un.length) return '아직 카드를 놓지 않은 칸이 <b>' + un.length + '개</b> 있어요.';
            const bad = S.pieSlots.filter((s) => s.card.id !== s.ans);
            S.cards.forEach((c) => { c.bad = false; });
            bad.forEach((s) => { if (!s.card.bad) { s.card.bad = true; s.card.shake = 0.5; } });
            if (bad.length) {
              const swap = S.pieSlots[0].card.id.startsWith('m') || S.pieSlots[3].card.id.startsWith('a');
              return swap ? '원자 수 비(왼쪽 그래프)와 질량비(오른쪽 그래프)의 카드가 서로 바뀌었어요. 헬륨 원자는 수소 원자보다 4배 무거워서 질량비에서 몫이 더 커져요.' : '<b>' + bad.length + '개</b> 칸이 맞지 않아요. 빨간 테두리 카드를 원 그래프의 조각 크기와 비교해 보세요.';
            }
            if (!S.pieOK) { S.pieOK = 1; S.pieSlots.forEach((s) => parts.burst(s.x + s.w - 60, s.y + s.h / 2, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '개수로는 수소 약 92 %, 헬륨 약 8 %(수소 : 헬륨 ≈ 12 : 1)지만, 헬륨 원자가 수소보다 약 4배 무거워서 질량으로는 수소 약 75 %, 헬륨 약 24 %예요. 그 밖의 원소는 개수로 0.1 % 미만, 질량으로 약 1~2 %예요.',
        },
        {
          type: 'quiz', title: '세 번째로 많은 원소',
          goal: '우주에서 수소, 헬륨 다음으로 많은 원소는 <b>산소</b>예요. 산소는 어디서 만들어졌을까요?',
          setup() { ensurePie(); },
          choices: ['별 속의 핵융합 (다음 차시에서 알아봐요)', '빅뱅 후 약 3분 동안의 우주 초기 핵합성', '빅뱅 후 38만 년의 우주 배경 복사', '지구 내부의 화학 반응'],
          answer: 0,
          feedback: ['', '우주 초기 핵합성으로는 수소와 헬륨이 대부분 만들어졌어요. 산소 같은 무거운 원소는 거의 만들어지지 않았어요.', '우주 배경 복사는 빛이에요. 새로운 원소를 만드는 과정이 아니에요.', '산소는 지구가 생기기 전부터 우주에 있었어요. 지구의 산소도 별에서 온 거예요.'],
          explain: '우주 초기에는 수소와 헬륨이 대부분이었고, 산소·탄소 같은 <b>더 무거운 원소는 별 속의 핵융합</b>으로 만들어졌어요. 다음 차시에서 별 속에서 일어나는 핵융합을 따라가 봐요!',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-cosmic-elements', mount: '#game', badge: '우주 원소 탐사대', homeHref: '../../index.html#h1a',
    featureLabels: {
      telescope: '🔭 가상 망원경 + 분광기 · 📷 촬영', album: '🖼 스펙트럼 앨범', templates: '📋 기준 선 막 (수소·헬륨·나트륨) · ↔ 적색 편이 맞추기', table: '📊 원소 표 · 선의 세기 비교',
      timeline: '⏱ 우주의 시간 버튼', builder: '⚛ 헬륨 핵 조립대', massbar: '📊 질량비 막대', pie: '🥧 원 그래프 · 값 카드',
    },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initItems(); initPie(); S.pieShow = 1;
  updateCtl();
  let lastFree = false, lastStep = -1;
  SciSim.loop((dt, tt) => {
    S.t = tt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (stepNo() !== lastStep) { lastStep = stepNo(); updateCtl(); }
    S.rev += dt;
    S.z = RM ? S.zT : SciSim.approach(S.z, S.zT, dt, 14);
    if (Math.abs(S.z - S.zT) < 0.0005) S.z = S.zT;
    S.flash = Math.max(0, S.flash - dt * 3.5);
    S.stFade = Math.max(0, S.stFade - dt * 2.2);
    parts.update(dt);
    if (S.mode === 'bang') stepItems(dt);
    if (S.mode === 'pie') stepCards(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    drawBg(tt, S.mode === 'bang' && S.stage === 3);
    if (S.mode === 'obs') drawObs(tt, dt);
    else if (S.mode === 'bang') drawBang(tt, dt);
    else drawPie(tt, dt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(7,11,26,' + S.fade * 0.9 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 8); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, OBSL, BANG, PIEL, OBJ, get game() { return game; }, enterLevel, setScene, setStage, selectObj, capture, toggleCell, cellRect, updateCtl, initItems, initPie,
    buildHelium() { // 프로그램으로 헬륨 핵 조립
      setStage(2);
      const ps = S.items.filter((i) => i.k === 'p' && !i.used).slice(0, 2), ns = S.items.filter((i) => i.k === 'n' && !i.used).slice(0, 2);
      [ps[0], ps[1], ns[0], ns[1]].forEach((it, k) => { it.x = BANG.ac.x + SL[k].dx; it.y = BANG.ac.y + SL[k].dy; dropItem(it, { x: it.x, y: it.y }); });
    },
    placeCards(right) { S.pieSlots.forEach((s) => { s.card = null; }); S.cards.forEach((c) => { c.slot = -1; }); S.pieSlots.forEach((s, i) => { const id = right ? s.ans : S.pieSlots[(i + 3) % 6].ans; const c = S.cards.find((x) => x.id === id); placeCard(c, s); }); },
    SL, IR, ZT,
  };
})();
