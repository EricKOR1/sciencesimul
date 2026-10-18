/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 소화제와 소화 효소 (단원 4차시)
   성취기준 [12생과01-04] 소화, 순환, 호흡, 배설 과정이 기관계의 통합적 작용으로 나타남을 신체의 생리적 변화와
   연관지어 추론할 수 있다. (탐구 활동: 소화제와 소화 효소를 이용한 영양소 분해 실험하기)
   ① 실험: 소화제 성분 (가상 복합 효소제 · 시험관 9개 세팅, 37 °C 물중탕)
   ② 분석: 분해 실험 (시간–남은 양 그래프, 변성, 기질 특이성 표, 쓸개즙)
   ③ 탐구: 조건 비교 (변인 통제 설계, 온도·pH)
   ④ 적용: 이어지는 길 (분해 산물의 흡수와 운반 → 다음 차시 '기관계의 통합적 작용')
   ※ 효소 구조식·반응 속도식은 다루지 않음. 모든 실험 값은 '교육용 가상 자료'.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 520 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.16 : 1;
  const TAU = Math.PI * 2;
  const P = (a, b) => (PHONE ? b : a);
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BG = '#f3f8f4', INK = '#14532d', MUTED = '#64748b';
  const mix = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));
  const rgba = (c, a) => SciSim.color.rgba(c, a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color: color || INK, align: align || 'center', weight: weight || 800 }, extra));
  function wrapLines(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch === ' ' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function block(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrapLines(str, maxW, size, weight);
    ls.forEach((l, i) => T(x, y + i * (lh || size * 1.35), l, size, color || INK, align || 'left', weight || 700));
    return ls.length;
  }
  function fit(str, maxW, size, weight) {
    ctx.save(); let s = size;
    while (s > 9) { ctx.font = D.font(s, weight || 800); if (ctx.measureText(str).width <= maxW) break; s -= 0.5; }
    ctx.restore(); return s;
  }
  const TF = (x, y, str, maxW, size, color, align, weight) => T(x, y, str, fit(str, maxW, size, weight), color, align, weight);
  function chip(x, y, text, o) { // 둥근 라벨 (가운데 정렬 x)
    o = o || {};
    return D.label(x, y, text, Object.assign({ bg: '#fff', color: INK, size: 13, border: '#cbd5e1' }, o));
  }
  const jong = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const eul = (w) => w + (jong(w) ? '을' : '를');
  const hit = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* ---------- 자료 (모두 교육용 가상 예시 값) ---------- */
  const NUT = {
    starch: { icon: '🍚', name: '녹말', sample: '녹말 용액', det: '아이오딘 용액 넣음', enz: '아밀레이스', prod: '엿당', yLabel: '남은 녹말 (%)', col: '#4338ca' },
    egg: { icon: '🥚', name: '단백질', sample: '흰자 조각 (1 cm)', det: '삶은 달걀 흰자', enz: '프로테이스', prod: '아미노산', yLabel: '흰자 조각의 남은 크기 (%)', col: '#d97706' },
    milk: { icon: '🥛', name: '지방', sample: '우유 + BTB', det: '지방산이 생기면 노랑', enz: '라이페이스', prod: '지방산·모노글리세리드', yLabel: '지방 분해 정도 (BTB 색 변화 %)', col: '#0e7490' },
  };
  const NUTS = ['starch', 'egg', 'milk'];
  const KIND = {
    water: { name: '물', long: '물 (대조군)', color: '#7dd3fc', line: '#64748b', icon: '💧' },
    enz: { name: '소화제', long: '소화제', color: '#fbbf24', line: '#16a34a', icon: '💊' },
    boil: { name: '끓인 소화제', long: '끓인 소화제', color: '#fb923c', line: '#ea580c', icon: '♨️' },
    bile: { name: '소화제+쓸개즙', long: '소화제 + 쓸개즙', color: '#a3e635', line: '#7c3aed', icon: '🧫' },
  };
  const KINDS = ['water', 'enz', 'boil'];
  /* 시간 t(분) 일 때 분해된 정도(%): 20분에 녹말 90(남은 10), 흰자 45(남은 55), 우유 100(노랑). 쓸개즙은 같은 값에 더 빨리 도달 */
  const TAUM = { starch: 6, egg: 9, milk: 7, bile: 3.5 };
  const gfun = (t, tau) => (1 - Math.exp(-clamp(t, 0, 20) / tau)) / (1 - Math.exp(-20 / tau));
  function degr(nut, kind, t) {
    if (kind === 'water' || kind === 'boil') return 0;
    if (kind === 'bile') return nut === 'milk' ? 100 * gfun(t, TAUM.bile) : 0;
    return (nut === 'starch' ? 90 : nut === 'egg' ? 45 : 100) * gfun(t, TAUM[nut]);
  }
  /* 그래프에 쓰는 값: 녹말·흰자는 '남은 양', 지방은 '분해 정도' */
  const yval = (nut, kind, t) => (nut === 'milk' ? degr(nut, kind, t) : 100 - degr(nut, kind, t));
  const ROUND = (v) => Math.round(v);
  const IOD0 = '#f4ecc6', IOD1 = '#26308f';
  const BTB0 = '#bfe5a8', BTB1 = '#f7e15a';
  /* 온도·pH 비교 (남은 녹말 %, 20분) */
  const COND = {
    temp: { name: '온도', vals: ['0 °C', '37 °C', '60 °C'], sub: ['얼음물', '물중탕', '뜨거운 물'], rem: [85, 10, 95], best: 1, other: 'pH', own: '온도 (0·37·60 °C)' },
    ph: { name: 'pH', vals: ['pH 2', 'pH 7', 'pH 11'], sub: ['강한 산성', '중성', '염기성'], rem: [80, 10, 70], best: 1, other: '온도', own: 'pH (2·7·11)' },
  };
  const PHC = ['#e11d48', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#a3e635', '#4ade80', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#7c3aed', '#8b5cf6', '#6d28d9'];
  const SAME_LABELS = (k) => ['소화제의 양', '녹말 용액의 양', '반응 시간 (20분)', k === 'temp' ? 'pH (같은 값으로)' : '온도 (같은 값으로)', COND[k].own];
  const SAME_OK = [true, true, true, true, false];
  /* 효소 표 */
  const ENZ_ROWS = [
    { name: '아밀레이스', sub: '녹말', prod: '엿당', col: '#4338ca' },
    { name: '프로테이스', sub: '단백질', prod: '아미노산', col: '#d97706' },
    { name: '라이페이스', sub: '지방', prod: '지방산·모노글리세리드', col: '#0e7490' },
  ];
  const SUB_OPTS = ['녹말', '단백질', '지방'];
  const PROD_OPTS = ['엿당', '아미노산', '지방산·모노글리세리드', '포도당'];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'rack', view: 'res', clock: 0, fade: 0, hover: '', epoch: 0, pick: null, msg: '', msgT: 0,
    tubes: [], pours: [], selB: null, drag: null, bath: { on: false, y: 0, temp: 20, ready: 0 },
    lab: { t: 0, ts: 0, playing: false, nut: 'starch', bile: false, bileA: 0, seen: { starch: false, egg: false, milk: false }, bileSeen: false, cutRank: [], cutPrev: {}, wob: 0 },
    tab: { sub: [null, null, null], prod: [null, null, null] },
    cond: { kind: 'temp', same: { temp: [false, false, false, false, false], ph: [false, false, false, false, false] }, run: { temp: { p: 0, go: false, done: false }, ph: { p: 0, go: false, done: false } }, sel: { temp: -1, ph: -1 }, mark: { temp: -1, ph: -1 }, shake: 0 },
    path: { sel: 'glc', done: { glc: 0, aa: 0, fa: 0 }, run: [], spawn: 0, flash: 0, node: '' },
  };
  let game = null;
  const mkRank = () => { const a = Array.from({ length: 20 }, (_, i) => i); for (let i = 19; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } const r = []; a.forEach((v, i) => { r[v] = i; }); return r; };
  S.lab.cutRank = mkRank();
  function say(m, sec) { S.msg = m; S.msgT = sec || 2.6; }

  /* ======================================================
     ① 시험관 세팅
     ====================================================== */
  function RG() {
    if (PHONE) return { sheet: { x: 12, y: 40, w: 496, h: 74 }, bx: [90, 260, 430], by: 168, bw: 112, bh: 92, gcx: [80, 230, 380], sp: 46, tw: 34, top: 306, th: 200, labY: 268, bath: { x: 12, y: 536, w: 452, h: 150 }, therm: { x: 488, y: 540, h: 108 }, water: 556, dy: 62 };
    return { sheet: { x: 20, y: 44, w: 262, h: 90 }, bx: [352, 492, 632], by: 96, bw: 112, bh: 92, gcx: [130, 340, 550], sp: 52, tw: 38, top: 206, th: 176, labY: 178, bath: { x: 30, y: 408, w: 620, h: 130 }, therm: { x: 724, y: 412, h: 104 }, water: 428, dy: 58 };
  }
  function resetRack() {
    S.epoch++;
    S.tubes = [];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) S.tubes.push({ col: c, row: r, add: null, lvl: 0.0, tag: 0, shake: 0 });
    S.pours = []; S.selB = null; S.drag = null;
    S.bath = { on: false, y: 0, temp: 20, ready: 0 };
    parts.clear();
  }
  const tubeX = (i) => { const g = RG(), t = S.tubes[i]; return g.gcx[t.col] + (t.row - 1) * g.sp; };
  const addedN = () => S.tubes.filter((t) => t.add).length;
  function rackSetOK() {
    for (let c = 0; c < 3; c++) {
      const ks = S.tubes.filter((t) => t.col === c).map((t) => t.add);
      if (!KINDS.every((k) => ks.filter((x) => x === k).length === 1)) return false;
    }
    return true;
  }
  const colState = (c) => { const ks = S.tubes.filter((t) => t.col === c).map((t) => t.add); return KINDS.every((k) => ks.filter((x) => x === k).length === 1); };
  function pourInto(i, kind) {
    const t = S.tubes[i]; if (!t || !kind) return false;
    if (S.bath.on) { say('물중탕에 넣은 뒤에는 바꿀 수 없어요. ↺ 다시 하기를 눌러요.'); return false; }
    if (t.add) { t.shake = 0.4; Sound.fail(); say('이 시험관에는 이미 ' + KIND[t.add].name + '이(가) 들어 있어요.'); return false; }
    t.add = kind; Sound.click();
    S.pours.push({ kind, i, p: 0, ep: S.epoch });
    updateCtl(); return true;
  }
  function putInBath() {
    if (S.bath.on) return;
    if (addedN() < 9) { say('아직 비어 있는 시험관이 있어요. 9개를 모두 채워요.'); Sound.fail(); return; }
    S.bath.on = true; Sound.success();
    SciSim.tween(S.bath, { y: 1 }, { duration: 0.9, ease: 'outBack' });
    updateCtl();
  }
  function stepRack(dt) {
    const g = RG();
    S.tubes.forEach((t) => { t.lvl = SciSim.approach(t.lvl, t.add && !S.pours.some((p) => S.tubes[p.i] === t && p.p < 0.62) ? 1 : 0, dt, 5); t.tag = SciSim.approach(t.tag, t.add ? 1 : 0, dt, 6); if (t.shake > 0) t.shake -= dt; });
    for (let k = S.pours.length - 1; k >= 0; k--) {
      const pr = S.pours[k]; const p0 = pr.p; pr.p += dt / (RM ? 0.2 : 1.1);
      if (pr.p > 0.38 && pr.p < 0.78 && !RM) {
        const tx = tubeX(pr.i), ty = g.top - 6;
        parts.emit({ x: tx + rnd(-3, 3), y: ty + rnd(0, 20), vx: rnd(-8, 8), vy: rnd(40, 90), life: 0.35, size: rnd(1.6, 2.8), color: KIND[pr.kind].color, gravity: 300 });
      }
      if (p0 < 0.62 && pr.p >= 0.62) { Sound.tick(); const tx = tubeX(pr.i); if (!RM) parts.burst(tx, g.top + g.th * 0.4, { count: 6, speed: 50, size: 2.2, life: 0.4, colors: [KIND[pr.kind].color, '#fff'], shape: 'circle', gravity: 160 }); }
      if (pr.p >= 1) S.pours.splice(k, 1);
    }
    const b = S.bath; b.temp = SciSim.approach(b.temp, b.on ? 37 : 20, dt, 1.4); b.ready = b.on && Math.abs(b.temp - 37) < 0.5 ? 1 : 0;
  }
  function drawBottle(x, y, kind, o) {
    o = o || {};
    const K = KIND[kind];
    ctx.save(); ctx.translate(x, y); if (o.tilt) ctx.rotate(o.tilt); if (o.scale) ctx.scale(o.scale, o.scale);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    D.shadow(() => { ctx.fillStyle = '#f8fafc'; rr(-24, -10, 48, 44, 12).fill(); }, { blur: o.lift ? 12 : 5, y: o.lift ? 6 : 2 });
    ctx.fillStyle = rgba(K.color, 0.85); rr(-21, 6, 42, 25, 9).fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(-17, -6, 7, 34, 3).fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(-24, -10, 48, 44, 12).stroke();
    ctx.fillStyle = '#f1f5f9'; rr(-11, -24, 22, 16, 4).fill(); ctx.stroke();
    ctx.fillStyle = kind === 'boil' ? '#9a3412' : kind === 'enz' ? '#b45309' : '#0369a1'; rr(-13, -31, 26, 9, 4).fill();
    if (kind === 'boil') { ctx.strokeStyle = 'rgba(234,88,12,.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 8, -36); ctx.quadraticCurveTo(k * 8 + 5, -44, k * 8, -52); ctx.stroke(); } }
    ctx.restore();
  }
  function tubePath(cx, top, w, h) { ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + h - w / 2); ctx.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top); }
  /* 시험관 한 개: opts {liquid(색), level(0~1), cube(한 변 px), glow, dim} */
  function glassTube(cx, top, w, h, o) {
    o = o || {};
    const lvl = o.level != null ? o.level : 0.55, ly = top + h - (h - w / 2 - 4) * lvl - w / 2 + (lvl > 0 ? 0 : 0);
    const liqTop = top + h * (1 - lvl) - (lvl * w / 2) * 0;
    ctx.save(); tubePath(cx, top, w - 3, h); ctx.closePath(); ctx.clip();
    if (lvl > 0.01) {
      const g = ctx.createLinearGradient(0, liqTop, 0, top + h);
      g.addColorStop(0, rgba(o.liquid || '#e8f2f8', 0.78)); g.addColorStop(1, rgba(o.liquid || '#e8f2f8', 0.98));
      ctx.fillStyle = g; ctx.fillRect(cx - w, liqTop, w * 2, h);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(cx - w, liqTop - 1, w * 2, 3);
      if (o.tint) { ctx.fillStyle = rgba(o.tint, 0.28); ctx.fillRect(cx - w, liqTop, w * 2, Math.min(18, (top + h) - liqTop)); }
    }
    if (o.cube > 0.5) {
      const s = o.cube, bx = cx - s / 2, by = top + h - w / 2 - s + 3;
      D.shadow(() => { ctx.fillStyle = '#fffdf2'; rr(bx, by, s, s, Math.min(4, s / 4)).fill(); }, { blur: 3, y: 1, color: 'rgba(80,60,20,.3)' });
      ctx.fillStyle = 'rgba(250,204,21,.28)'; rr(bx + s * 0.18, by + s * 0.2, s * 0.64, s * 0.6, 3).fill();
      ctx.strokeStyle = '#d6c796'; ctx.lineWidth = 1.2; rr(bx, by, s, s, Math.min(4, s / 4)).stroke();
    }
    ctx.restore();
    ctx.save(); tubePath(cx, top, w, h); ctx.strokeStyle = o.glow ? '#16a34a' : '#8fa3bd'; ctx.lineWidth = o.glow ? 3.6 : 2.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 5, top + 8); ctx.lineTo(cx - w / 2 + 5, top + h - w); ctx.stroke();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 4, top); ctx.lineTo(cx + w / 2 + 4, top); ctx.stroke();
    ctx.restore();
  }
  function sampleLook(nut, remain, degree) { // 시료 색과 흰자 크기
    if (nut === 'starch') return { liquid: mix(IOD0, IOD1, remain / 100) };
    if (nut === 'egg') return { liquid: '#eaf4fa', cube: remain / 100 };
    return { liquid: mix(BTB0, BTB1, degree / 100) };
  }
  function drawRack(t) {
    const g = RG();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 성분표
    const sh = g.sheet;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(sh.x, sh.y, sh.w, sh.h, 14).fill(); }, { blur: 8, y: 2 });
    ctx.strokeStyle = '#bbf7d0'; ctx.lineWidth = 2; rr(sh.x, sh.y, sh.w, sh.h, 14).stroke();
    T(sh.x + 12, sh.y + 22, '🏷 가상 소화제 (복합 효소제)', 14.5, INK, 'left', 800);
    T(sh.x + 12, sh.y + 44, '성분: 아밀레이스 · 프로테이스', 13, '#334155', 'left', 700);
    T(sh.x + 12, sh.y + 62, '라이페이스', 13, '#334155', 'left', 700);
    T(sh.x + sh.w - 10, sh.y + sh.h - 10, '교육용 가상 자료', 12, '#b45309', 'right', 800);
    // 병 3개
    KINDS.forEach((k, i) => {
      const x = g.bx[i], y = g.by, sel = S.selB === k, hv = S.hover === 'b' + k;
      const drag = S.drag && S.drag.kind === k && S.drag.moved;
      ctx.save();
      D.shadow(() => { ctx.fillStyle = sel ? '#ecfdf5' : '#fff'; rr(x - g.bw / 2, y - g.bh / 2, g.bw, g.bh, 14).fill(); }, { blur: sel ? 12 : 5, y: 2 });
      ctx.lineWidth = sel ? 3.5 : 2; ctx.strokeStyle = sel ? '#16a34a' : hv ? '#86efac' : '#cbd5e1'; if (!sel) ctx.setLineDash([6, 4]); rr(x - g.bw / 2, y - g.bh / 2, g.bw, g.bh, 14).stroke(); ctx.restore();
      drawBottle(x, y - 10 + (sel ? Math.sin(t * 4) * 1.5 : 0), k, { alpha: drag ? 0.35 : 1, scale: 0.92 });
      T(x, y + g.bh / 2 - 8, KIND[k].name, 13.5, INK, 'center', 800);
    });
    // 안내 / 상태 문구
    T(P(g.bx[2] + g.bw / 2 + 4, 20), P(30, 34), '', 13, MUTED, 'left');
    // 시험관 묶음 라벨
    NUTS.forEach((n, c) => {
      const cx = g.gcx[c], N = NUT[n];
      const ok = colState(c);
      D.label(cx, g.labY - 6, N.icon + ' ' + N.sample, { bg: ok ? '#dcfce7' : '#fff', color: INK, size: PHONE ? 11.5 : 13, border: ok ? '#16a34a' : '#cbd5e1' });
      T(cx, g.labY + 14, N.det, PHONE ? 10.5 : 12, MUTED, 'center', 700);
    });
    // 물중탕 뒷벽
    const b = g.bath;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#e8eef5'; rr(b.x, b.y, b.w, b.h, 16).fill(); }, { blur: 6, y: 2 }); ctx.restore();
    // 시험관 걸이 (물중탕 밖일 때 보이는 받침)
    const rackA = 1 - S.bath.y;
    if (rackA > 0.02) {
      ctx.save(); ctx.globalAlpha = rackA; ctx.fillStyle = '#c8a97a';
      NUTS.forEach((n, c) => { const cx = g.gcx[c]; rr(cx - 1.5 * g.sp, g.top + g.th * 0.52, 3 * g.sp, 7, 3).fill(); });
      ctx.restore();
    }
    // 시험관
    S.tubes.forEach((tb, i) => {
      const cx = tubeX(i) + (tb.shake > 0 ? Math.sin(tb.shake * 50) * 3 : 0), N = NUT[NUTS[tb.col]];
      const dy = S.bath.y * g.dy;
      const look = sampleLook(NUTS[tb.col], 100, 0);
      const baseLvl = 0.5, lvl = baseLvl + tb.lvl * 0.14;
      glassTube(cx, g.top + dy, g.tw, g.th, { liquid: look.liquid, level: lvl, cube: look.cube ? g.tw * 0.62 : 0, tint: tb.add ? KIND[tb.add].color : null, glow: S.hover === 't' + i && S.selB });
      if (tb.tag > 0.02) {
        ctx.save(); ctx.globalAlpha = tb.tag;
        const lab = KIND[tb.add || 'water'].name; const ty = g.top + g.th + dy + 18;
        D.label(cx, ty, tb.add ? lab : '', { bg: KIND[tb.add || 'water'].color, color: '#1f2937', size: PHONE ? 10.5 : 11.5, pad: 5 });
        ctx.restore();
      } else if (!S.bath.on) { T(cx, g.top + g.th + 18, String(tb.row + 1), 12, '#94a3b8', 'center', 700); }
    });
    // 물중탕 물 (앞)
    ctx.save();
    rr(b.x, b.y, b.w, b.h, 16).clip();
    const wl = g.water, tmp = clamp((S.bath.temp - 20) / 17, 0, 1);
    const wg = ctx.createLinearGradient(0, wl, 0, b.y + b.h);
    const wc = mix('#bfe3ff', '#ffd7a8', tmp);
    wg.addColorStop(0, rgba(wc, 0.5)); wg.addColorStop(1, rgba(mix('#7cc4ff', '#ffb26b', tmp), 0.62));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h);
    for (let i = 0; i <= 30; i++) { const px = b.x + b.w * i / 30; ctx.lineTo(px, wl + Math.sin(t * 2.2 + i * 0.5) * 1.6); }
    ctx.lineTo(b.x + b.w, b.y + b.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x, wl - 1, b.w, 3);
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; rr(b.x, b.y, b.w, b.h, 16).stroke();
    T(b.x + 14, b.y + b.h - 12, '물중탕', 13, '#475569', 'left', 800);
    // 온도계
    const th = g.therm;
    D.thermometer(th.x, th.y, th.h, S.bath.temp, 0, 60, { ticks: !PHONE, step: 20, unit: '°' });
    T(th.x, th.y + th.h + 40, S.bath.temp.toFixed(0) + ' °C', 14, INK, 'center', 800);
    if (S.bath.ready) { D.check(b.x + b.w - 26, b.y + 24, 14, 1); T(b.x + b.w - 46, b.y + 28, '37 °C', 13, '#166534', 'right', 800); }
    // 붓는 중인 병
    S.pours.forEach((pr) => {
      const k = KINDS.indexOf(pr.kind), sx = g.bx[k], sy = g.by - 10, tx = tubeX(pr.i), ty = g.top - 62;
      const p = pr.p; let f, tilt = 0;
      if (p < 0.3) f = SciSim.ease.inOutQuad(p / 0.3); else if (p < 0.78) f = 1; else f = 1 - SciSim.ease.inOutQuad((p - 0.78) / 0.22);
      if (p >= 0.3 && p < 0.78) tilt = -Math.min(1, (p - 0.3) / 0.1) * 0.95; else if (p >= 0.78) tilt = -0.95 * (1 - (p - 0.78) / 0.22);
      const x = lerp(sx, tx + 22, f), y = lerp(sy, ty, f);
      drawBottle(x, y, pr.kind, { tilt, scale: 0.92, lift: 1 });
    });
    if (S.drag && S.drag.moved) drawBottle(S.drag.x, S.drag.y, S.drag.kind, { scale: 1.08, lift: 1, tilt: -0.2 });
    // 메시지
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(158, 128), S.msg, { bg: '#1b2333', color: '#fff', size: 13.5 }); ctx.restore(); }
  }

  /* ======================================================
     ② 분해 실험 (결과 · 입자 모형 · 효소 표)
     ====================================================== */
  function LG() {
    if (PHONE) return { tcx: { starch: 86, egg: 252, milk: 424 }, tw: 30, sp: 44, ttop: 104, th: 150, titleY: 74, gx: 62, gy: 372, gw: 436, gh: 250, bath: { x: 8, y: 150, w: 504, h: 100 }, micro: { x: 12, y: 330, w: 156, h: 230, gap: 10 } };
    return { tcx: { starch: 140, egg: 400, milk: 660 }, tw: 36, sp: 52, ttop: 92, th: 124, titleY: 62, gx: 84, gy: 288, gw: 490, gh: 212, bath: { x: 24, y: 150, w: 752, h: 78 }, micro: { x: 30, y: 270, w: 236, h: 232, gap: 16 } };
  }
  const labKinds = () => (S.lab.nut === 'milk' && S.lab.bileA > 0.02 ? ['water', 'enz', 'boil', 'bile'] : KINDS);
  function labReset() {
    const L = S.lab; L.t = 0; L.ts = 0; L.playing = false; L.nut = 'starch'; L.bile = false; L.bileA = 0;
    L.seen = { starch: false, egg: false, milk: false }; L.bileSeen = false; L.cutPrev = {};
    const sl = $('#sTime'); sl.value = 0; sbTime.refresh();
    S.tab = { sub: [null, null, null], prod: [null, null, null] };
    S.pick = null;
  }
  function stepLab(dt) {
    const L = S.lab;
    if (L.playing) { L.t = Math.min(20, L.t + dt * 2); if (L.t >= 20) { L.playing = false; updateCtl(); } $('#sTime').value = L.t; sbTime.refresh(); }
    L.ts = RM ? L.t : SciSim.approach(L.ts, L.t, dt, 9);
    if (Math.abs(L.ts - L.t) < 0.02) L.ts = L.t;
    L.bileA = SciSim.approach(L.bileA, L.bile ? 1 : 0, dt, 5);
    L.wob += dt;
    if (L.t >= 20 && L.ts >= 19.98 && S.view === 'res' && S.mode === 'lab') { if (!L.seen[L.nut]) { L.seen[L.nut] = true; if (!RM) { const g = LG(); parts.burst(g.gx + g.gw - 30, g.gy + 20, { count: 10, speed: 120, size: 3, life: 0.7, colors: ['#16a34a', '#fbbf24', '#38bdf8'], shape: 'star' }); } Sound.tick(); } }
    if (L.bile && L.nut === 'milk' && L.t >= 16 && L.ts >= 15.98 && S.view === 'res' && S.mode === 'lab') L.bileSeen = true;
  }
  function labTubeLook(nut, kind, t) {
    const dg = degr(nut, kind, t), rm = 100 - dg;
    return sampleLook(nut, rm, dg);
  }
  function drawLabTubes(t) {
    const g = LG(), L = S.lab, b = g.bath;
    // 물중탕
    D.shadow(() => { ctx.fillStyle = '#e8eef5'; rr(b.x, b.y, b.w, b.h, 14).fill(); }, { blur: 5, y: 2 });
    NUTS.forEach((n) => {
      const sel = L.nut === n, N = NUT[n], cx0 = g.tcx[n];
      const ks = n === 'milk' ? ['water', 'enz', 'boil', 'bile'] : KINDS;
      const neff = 3 + (n === 'milk' ? L.bileA : 0);
      // 묶음 제목
      const tl = D.label(cx0, g.titleY, N.icon + ' ' + N.name, { bg: sel ? N.col : '#fff', color: sel ? '#fff' : INK, size: PHONE ? 13 : 14.5, border: sel ? N.col : '#cbd5e1' });
      T(cx0, g.titleY + 22, N.sample, PHONE ? 11 : 12, MUTED, 'center', 700);
      ks.forEach((k, i) => {
        let a = 1, dy = 0;
        if (k === 'bile') { a = L.bileA; dy = -(1 - L.bileA) * 40; if (a < 0.02) return; }
        const cx = cx0 + (i - (neff - 1) / 2) * g.sp;
        const lk = labTubeLook(n, k, L.ts);
        ctx.save(); ctx.globalAlpha = a;
        glassTube(cx, g.ttop + dy, g.tw, g.th, { liquid: lk.liquid, level: 0.62, cube: lk.cube ? g.tw * 0.66 * lk.cube : 0, glow: sel && false });
        // 이름 · 값
        const nm = k === 'bile' ? '소화제+\n쓸개즙' : KIND[k].name;
        const lines = k === 'bile' ? ['소화제+', '쓸개즙'] : k === 'boil' ? ['끓인', '소화제'] : [KIND[k].name];
        lines.forEach((ln, li) => T(cx, g.ttop + g.th + 16 + li * 13 + dy, ln, PHONE ? 10.5 : 11.5, KIND[k].line, 'center', 800));
        if (sel) T(cx, g.ttop + g.th + 46 + dy, ROUND(yval(n, k, L.ts)) + ' %', PHONE ? 12 : 13, INK, 'center', 800);
        ctx.restore();
      });
      if (sel) { ctx.save(); ctx.strokeStyle = N.col; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); const w = neff * g.sp + 14; rr(cx0 - w / 2, g.titleY - 18, w, g.ttop + g.th + 52 - (g.titleY - 18), 12).stroke(); ctx.restore(); }
    });
    // 물 앞면
    ctx.save(); rr(b.x, b.y, b.w, b.h, 14).clip();
    const wl = b.y + 18, gr = ctx.createLinearGradient(0, wl, 0, b.y + b.h);
    gr.addColorStop(0, 'rgba(255,215,168,.40)'); gr.addColorStop(1, 'rgba(255,178,107,.5)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h);
    for (let i = 0; i <= 40; i++) ctx.lineTo(b.x + b.w * i / 40, wl + Math.sin(t * 2 + i * 0.6) * 1.4);
    ctx.lineTo(b.x + b.w, b.y + b.h); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; rr(b.x, b.y, b.w, b.h, 14).stroke();
    T(b.x + b.w - 12, b.y + b.h - 8, '37 °C 물중탕', 12, '#92400e', 'right', 800);
  }
  function legendItems() {
    const L = S.lab, n = L.nut;
    return labKinds().map((k) => ({ k, v: ROUND(yval(n, k, L.ts)), name: k === 'water' ? '물 (대조군)' : KIND[k].long, color: KIND[k].line }));
  }
  function drawGraph(t) {
    const g = LG(), L = S.lab, n = L.nut, N = NUT[n];
    const x0 = g.gx, y0 = g.gy, w = g.gw, h = g.gh;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x0 - P(52, 52), y0 - 20, w + P(60, 66), h + 70, 14).fill(); }, { blur: 8, y: 2 });
    // 격자 · 축
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let v = 0; v <= 100; v += 25) { const y = y0 + h - h * v / 100; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); T(x0 - 8, y + 4, String(v), 12, MUTED, 'right', 700); }
    for (let m = 0; m <= 20; m += 5) { const x = x0 + w * m / 20; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke(); T(x, y0 + h + 17, String(m), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 - 4); ctx.lineTo(x0, y0 + h); ctx.lineTo(x0 + w + 4, y0 + h); ctx.stroke();
    ctx.restore();
    T(x0 + w / 2, y0 + h + 38, '반응 시간 (분)', 12.5, MUTED, 'center', 800);
    ctx.save(); ctx.translate(x0 - 36, y0 + h / 2); ctx.rotate(-Math.PI / 2); TF(0, 0, N.yLabel, h - 10, 12.5, MUTED, 'center', 800); ctx.restore();
    // 곡선
    const kinds = labKinds();
    kinds.forEach((k) => {
      const col = KIND[k].line; let a = 1; if (k === 'bile') a = L.bileA; if (a < 0.02) return;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = k === 'enz' ? 4 : 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (k === 'boil') ctx.setLineDash([9, 6]);
      ctx.beginPath(); const tmax = L.ts;
      for (let m = 0; m <= tmax + 1e-6; m += 0.25) { const mm = Math.min(m, tmax), px = x0 + w * mm / 20, py = y0 + h - h * clamp(yval(n, k, mm), 0, 100) / 100; if (m === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
      const px = x0 + w * L.ts / 20, py = y0 + h - h * clamp(yval(n, k, L.ts), 0, 100) / 100;
      D.sphere(px, py, 6, col, { gloss: true });
      ctx.restore();
    });
    // 현재 시각 막대
    D.dashedLine(x0 + w * L.ts / 20, y0, x0 + w * L.ts / 20, y0 + h, { color: 'rgba(100,116,139,.55)', width: 1.5, dash: [5, 5] });
    D.label(x0 + w * clamp(L.ts, 1.5, 18.5) / 20, y0 - 4, '⏱ ' + L.ts.toFixed(1) + ' 분', { bg: '#1b2333', size: 12.5, pad: 7 });
    // 범례
    const items = legendItems();
    if (PHONE) {
      const lx = 20, ly = y0 + h + 62;
      items.forEach((it, i) => { const cx = lx + (i % 2) * 248, cy = ly + Math.floor(i / 2) * 22; ctx.strokeStyle = it.color; ctx.lineWidth = 4; if (it.k === 'boil') ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 24, cy - 4); ctx.stroke(); ctx.setLineDash([]); T(cx + 30, cy, it.name + ' ' + it.v + ' %', 12.5, INK, 'left', 800); });
      T(VW - 14, VH - 8, '교육용 가상 데이터', 11.5, '#b45309', 'right', 800);
    } else {
      const lx = x0 + w + 46, ly = y0 - 2;
      items.forEach((it, i) => {
        const cy = ly + 18 + i * 34;
        ctx.strokeStyle = it.color; ctx.lineWidth = 4; if (it.k === 'boil') ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(lx, cy - 4); ctx.lineTo(lx + 22, cy - 4); ctx.stroke(); ctx.setLineDash([]);
        T(lx + 28, cy - 1, it.name, 12.5, INK, 'left', 800);
        T(lx + 28, cy + 14, it.v + ' %', 14, it.color, 'left', 800);
      });
      block(lx - 2, ly + 18 + items.length * 34 + 10, 168, n === 'milk' ? 'BTB 용액: 지방산이 생기면 초록 → 노랑' : n === 'egg' ? '처음 크기 = 100 % (한 변 1 cm)' : '아이오딘: 녹말이 많을수록 청람색', 12, MUTED, 15, 700);
      T(lx - 2, y0 + h + 52, '교육용 가상 데이터', 12, '#b45309', 'left', 800);
    }
  }
  /* 입자 모형 (🔍) : 사슬 20개 중 분해되지 않고 남은 수 = 그래프 값과 같은 비율 */
  function chainCell(i, bx) {
    const g = LG(), m = g.micro, cols = PHONE ? 2 : 4, rows = PHONE ? 10 : 5;
    const cw = (m.w - 14) / cols, ch = (m.h - 56) / rows;
    return { x: bx + 7 + (i % cols) * cw, y: m.y + 40 + Math.floor(i / cols) * ch, cw, ch };
  }
  function drawChain(nut, cx, cy, cut, t, i, sc) {
    // cx,cy: 칸 왼쪽 위, cut 0(온전) ~ 1(끊어짐)
    const r = 5 * sc, step = 11 * sc;
    const jig = (k) => Math.sin(t * 2.4 + i * 1.7 + k) * 1.2;
    if (nut === 'starch') {
      const cols = ['#6366f1', '#818cf8', '#6366f1', '#818cf8'];
      for (let k = 0; k < 4; k++) {
        const pair = k < 2 ? -1 : 1; const off = cut * pair * 7 * sc;
        const x = cx + 6 + k * step + off * 0 + (k >= 2 ? cut * 8 * sc : 0), y = cy + 8 + jig(k) + (k >= 2 ? cut * 6 : 0);
        if (k < 3 && !(k === 1 && cut > 0.5)) { ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 2.4 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + step, y + (k === 1 ? 0 : 0)); ctx.stroke(); }
        D.sphere(x, y, r, cols[k], { gloss: false });
      }
    } else if (nut === 'egg') {
      const cols = ['#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
      for (let k = 0; k < 4; k++) {
        const x = cx + 6 + k * step + cut * (k - 1.5) * 5 * sc, y = cy + 8 + (k % 2 ? 4 : -2) * sc + jig(k) + cut * (k % 2 ? 5 : -3);
        if (k < 3 && cut < 0.5) { const x2 = cx + 6 + (k + 1) * step, y2 = cy + 8 + ((k + 1) % 2 ? 4 : -2) * sc; ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 2.4 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
        D.sphere(x, y, r, cols[k], { gloss: false });
      }
    } else {
      const gx = cx + 8 + cut * -2, gy = cy + 8 + jig(0);
      for (let k = 0; k < 3; k++) {
        const away = k > 0 ? cut : 0; const ang = (k - 1) * 0.5;
        const ex = gx + 6 + (14 + away * 10) * sc, ey = gy + (k - 1) * 6 * sc + away * (k - 1) * 4;
        if (cut < 0.5 || k === 0) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3 * sc; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 6 + 10 * sc, gy + (k - 1) * 5 * sc); ctx.stroke(); }
        D.sphere(ex, ey, 3.4 * sc, '#fbbf24', { gloss: false });
      }
      D.sphere(gx, gy, r * 1.15, '#ea580c', { gloss: false });
    }
  }
  function enzymeShape(x, y, rad, mouth, col, bad, t) { // 입을 벌린 효소 (활성 부위 = 입)
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.strokeStyle = SciSim.color.shade(col, -0.35); ctx.lineWidth = 2;
    ctx.beginPath();
    if (bad) { ctx.moveTo(-rad, 0); ctx.bezierCurveTo(-rad, -rad * 1.2, rad * 0.4, -rad * 1.1, rad, -rad * 0.2); ctx.bezierCurveTo(rad * 1.1, rad * 0.8, -rad * 0.2, rad * 1.2, -rad * 0.6, rad * 0.5); ctx.closePath(); }
    else { ctx.arc(0, 0, rad, mouth, TAU - mouth); ctx.lineTo(0, 0); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (bad) { ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-rad * 0.3, -rad * 0.4, rad * 0.25, rad * 0.14, -0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawMicro(t) {
    const g = LG(), m = g.micro, L = S.lab, n = L.nut, N = NUT[n];
    const boxes = [{ k: 'water', title: '물' }, { k: 'enz', title: '소화제' }, { k: 'boil', title: '끓인 소화제' }];
    const sc = PHONE ? 0.9 : 1;
    boxes.forEach((bx, bi) => {
      const x = m.x + bi * (m.w + m.gap);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, m.y, m.w, m.h, 14).fill(); }, { blur: 6, y: 2 });
      ctx.save(); rr(x, m.y, m.w, m.h, 14).clip();
      ctx.fillStyle = bx.k === 'boil' ? 'rgba(254,215,170,.35)' : bx.k === 'enz' ? 'rgba(187,247,208,.3)' : 'rgba(186,230,253,.28)'; ctx.fillRect(x, m.y, m.w, m.h);
      const intact = Math.round(20 * (1 - degr(n, bx.k, L.ts) / 100)), cutN = 20 - intact;
      for (let i = 0; i < 20; i++) {
        const cc = chainCell(i, x); const isCut = L.cutRank[i] < cutN;
        const prev = L.cutPrev[bx.k + i];
        if (prev === undefined) L.cutPrev[bx.k + i] = isCut ? 1 : 0;
        else if (!prev && isCut && !RM) { parts.burst(cc.x + 20, cc.y + 12, { count: 5, speed: 60, size: 2, life: 0.4, colors: ['#4ade80', '#fff'], shape: 'circle', gravity: 0 }); L.cutPrev[bx.k + i] = 1; }
        else if (prev && !isCut) L.cutPrev[bx.k + i] = 0;
        const cutAmt = SciSim.approach(L['c' + bx.k + i] || 0, isCut ? 1 : 0, 0.016, 8); L['c' + bx.k + i] = cutAmt;
        drawChain(n, cc.x, cc.y, cutAmt, t, i, sc);
      }
      // 효소
      if (bx.k !== 'water') {
        for (let e = 0; e < 3; e++) {
          const ex = x + 24 + ((Math.sin(t * 0.9 + e * 2.1 + bx.k.length) * 0.5 + 0.5) * (m.w - 48)), ey = m.y + 56 + ((Math.cos(t * 0.7 + e * 1.3) * 0.5 + 0.5) * (m.h - 90));
          enzymeShape(ex, ey, PHONE ? 11 : 13, 0.5 + 0.3 * Math.sin(t * 5 + e), bx.k === 'enz' ? '#34d399' : '#9ca3af', bx.k === 'boil', t);
        }
      }
      ctx.restore();
      T(x + m.w / 2, m.y + 24, bx.title, 15, INK, 'center', 800);
      T(x + m.w / 2, m.y + m.h + 18, '온전한 ' + N.name + ' 분자 ' + intact + ' / 20', 12.5, intact < 20 ? '#166534' : '#475569', 'center', 800);
    });
    T(VW / 2, P(72, 70), '🔍 입자 모형: ' + N.enz + '(효소) ' + (n === 'starch' ? '입이 녹말 사슬을 잘라 엿당으로' : n === 'egg' ? '입이 단백질 사슬을 잘라 아미노산으로' : '입이 지방을 잘라 지방산·모노글리세리드로'), PHONE ? 12 : 14.5, INK, 'center', 800);
    block(P(34, 18), P(110, 100), P(730, 484), '물: 효소가 없어 그대로 · 소화제: 효소가 기질을 분해 · 끓인 소화제: 변성된 효소(모양이 변해 ✕)는 분해하지 못해요. 시간을 움직이면 온전한 분자 수가 그래프의 남은 양과 같은 비율로 변해요.', PHONE ? 12 : 13, MUTED, PHONE ? 16 : 17, 700);
    T(VW / 2, VH - 10, '※ 입자 모형은 이해를 돕는 그림이에요 · 교육용 가상 데이터', 12, '#b45309', 'center', 800);
    // 시간 표시
    D.label(VW - P(90, 70), P(30, 26), '⏱ ' + L.ts.toFixed(1) + ' 분', { bg: '#1b2333', size: 13 });
  }
  /* 효소 표 */
  function TGeo() {
    if (PHONE) return { x: 14, y: 70, hdr: 42, rh: 76, cols: [128, 168, 190], bile: { x: 14, y: 400, w: 492, h: 130 } };
    return { x: 44, y: 66, hdr: 44, rh: 62, cols: [170, 200, 292], bile: { x: 44, y: 330, w: 712, h: 150 } };
  }
  function cellRect(row, col) { const g = TGeo(); let x = g.x; for (let i = 0; i < col; i++) x += g.cols[i]; return { x, y: g.y + g.hdr + row * g.rh, w: g.cols[col], h: g.rh }; }
  function drawTable(t) {
    const g = TGeo(), tb = S.tab;
    const tw = g.cols[0] + g.cols[1] + g.cols[2];
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(g.x - 6, g.y - 6, tw + 12, g.hdr + 3 * g.rh + 12, 14).fill(); }, { blur: 8, y: 2 });
    ['소화제 속 효소', '분해하는 영양소', '분해 산물'].forEach((h, c) => { const r = cellRect(-1, c); ctx.fillStyle = '#ecfdf5'; ctx.fillRect(r.x, g.y, r.w, g.hdr); T(r.x + r.w / 2, g.y + g.hdr / 2 + 5, h, PHONE ? 13 : 15, INK, 'center', 800); });
    ENZ_ROWS.forEach((e, i) => {
      const r0 = cellRect(i, 0), r1 = cellRect(i, 1), r2 = cellRect(i, 2);
      ctx.strokeStyle = '#d7e3da'; ctx.lineWidth = 1.5; [r0, r1, r2].forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
      D.sphere(r0.x + 26, r0.y + r0.h / 2, 14, e.col, { gloss: true });
      T(r0.x + 50, r0.y + r0.h / 2 + 5, e.name, PHONE ? 13.5 : 16, INK, 'left', 800);
      [[r1, tb.sub[i], 'sub'], [r2, tb.prod[i], 'prod']].forEach(([r, v, key]) => {
        const open = S.pick && S.pick.key === key + i, hv = S.hover === key + i;
        ctx.save();
        ctx.fillStyle = v ? '#fef9c3' : open ? '#dcfce7' : hv ? '#f0fdf4' : '#f8fafc'; rr(r.x + 6, r.y + 8, r.w - 12, r.h - 16, 12).fill();
        ctx.strokeStyle = v ? '#eab308' : '#16a34a'; ctx.lineWidth = v ? 2 : 2; if (!v) ctx.setLineDash([6, 4]); rr(r.x + 6, r.y + 8, r.w - 12, r.h - 16, 12).stroke(); ctx.restore();
        if (v) TF(r.x + r.w / 2, r.y + r.h / 2 + 5, v, r.w - 24, PHONE ? 13.5 : 15.5, INK, 'center', 800); else T(r.x + r.w / 2, r.y + r.h / 2 + 5, '눌러서 고르기', 13, '#16a34a', 'center', 800);
      });
      if (i < 3) { /* 화살표 */ D.arrow(r1.x + r1.w - 2, r1.y + r1.h / 2, r2.x + 8, r2.y + r2.h / 2, { color: '#16a34a', width: 3, head: 10 }); }
    });
    // 쓸개즙 카드
    const b = g.bile;
    D.shadow(() => { ctx.fillStyle = '#faf5ff'; rr(b.x, b.y, b.w, b.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; rr(b.x, b.y, b.w, b.h, 14).stroke();
    T(b.x + 14, b.y + 26, '🧫 쓸개즙은 효소가 아니에요', 15, '#5b21b6', 'left', 800);
    block(b.x + 14, b.y + 50, b.w - 28, '지방을 작은 방울로 쪼개(유화) 라이페이스가 달라붙을 수 있는 면적을 넓혀 줘요. 그래서 소화제 + 쓸개즙 시험관이 더 빨리 노랗게 변했어요. (실험 값은 모두 교육용 가상 자료)', PHONE ? 12.5 : 13.5, '#334155', PHONE ? 17 : 19, 700);
    // 엿당 안내
    block(g.x, g.y + g.hdr + 3 * g.rh + (PHONE ? 26 : 26), tw, '※ 엿당은 소장의 다른 효소가 포도당으로 더 분해해요. (이 실험에서는 아밀레이스까지)', PHONE ? 12 : 12.5, MUTED, 16, 700);
  }
  function drawPicker() {
    const pk = S.pick; if (!pk) return;
    ctx.fillStyle = 'rgba(15,23,42,.18)'; ctx.fillRect(0, 0, VW, VH);
    const w = pk.w, oh = 44, h = pk.opts.length * oh + 16;
    let x = clamp(pk.x, 8, VW - w - 8), y = clamp(pk.y, 8, VH - h - 8);
    pk.rect = { x, y, w, h };
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 14).fill(); }, { blur: 16, y: 6 });
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; rr(x, y, w, h, 14).stroke();
    pk.opts.forEach((o, i) => {
      const r = { x: x + 8, y: y + 8 + i * oh, w: w - 16, h: oh - 4 }; o.r = r;
      const hv = S.hover === 'pk' + i;
      ctx.fillStyle = hv ? '#dcfce7' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 10).fill();
      TF(r.x + r.w / 2, r.y + r.h / 2 + 5, o.label, r.w - 16, 14.5, INK, 'center', 800);
    });
  }
  function openPick(key, opts, anchor, cb, w) { S.pick = { key, opts: opts.map((o) => ({ label: o })), x: anchor.x, y: anchor.y + anchor.h - 4, w: w || Math.max(200, anchor.w), cb }; Sound.click(); }

  function drawLab(t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'tab') { drawTable(t); return; }
    drawLabTubes(t);
    if (S.view === 'micro') drawMicro(t); else drawGraph(t);
  }

  /* ======================================================
     ③ 조건 비교
     ====================================================== */
  function CG() {
    if (PHONE) return { cx: [90, 260, 430], tw: 40, top: 96, th: 180, cupY: 196, cupH: 100, gx: 36, gy: 374, gw: 448, gh: 250 };
    return { cx: [190, 400, 610], tw: 44, top: 78, th: 150, cupY: 164, cupH: 78, gx: 100, gy: 316, gw: 600, gh: 170 };
  }
  const condDesign = (k) => (k ? S.cond.same[k].every((v, i) => v === SAME_OK[i]) : false);
  const condRem = (k, i) => { const r = S.cond.run[k], F = COND[k].rem[i]; const g = r.go || r.done ? gfun(r.p * 20, 6) : 0; return 100 - (100 - F) * g; };
  function runCond() {
    const C = S.cond, k = C.kind, r = C.run[k];
    if (!condDesign(k)) { say('같게 유지할 조건을 먼저 알맞게 골라요.'); Sound.fail(); C.shake = 0.4; return; }
    if (r.go) return;
    r.go = true; r.done = false; r.p = 0; Sound.click();
    const ep = S.epoch;
    SciSim.tween(r, { p: 1 }, { duration: RM ? 0.1 : 4.2, ease: 'linear', onDone: () => { if (ep !== S.epoch) return; r.done = true; r.go = false; Sound.success(); updateCtl(); } });
    C.sel[k] = -1; C.mark[k] = -1; updateCtl();
  }
  function markCond() {
    const C = S.cond, k = C.kind, r = C.run[k];
    if (!r.done) { say('먼저 20분 실험을 실행해요.'); return; }
    const i = C.sel[k]; if (i < 0) { say('그래프의 막대(또는 시험관)를 눌러 조건을 고른 뒤 ⭐를 눌러요.'); return; }
    if (i === COND[k].best) { C.mark[k] = i; Sound.success(); const g = CG(); if (!RM) parts.burst(g.cx[i], g.gy + 10, { count: 16, speed: 150, size: 3.4, life: 0.8, shape: 'star' }); say(COND[k].vals[i] + '에서 남은 녹말이 가장 적어요. 최적 조건이에요!'); }
    else { C.mark[k] = -1; C.shake = 0.5; Sound.fail(); say(COND[k].vals[i] + '보다 남은 녹말이 더 적은 조건이 있어요. 막대를 비교해 봐요.'); }
    updateCtl();
  }
  function drawCond(t) {
    const g = CG(), C = S.cond, k = C.kind, K = COND[k], run = C.run[k];
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(VW / 2, P(28, 30), '같은 녹말 용액 + 소화제로 ' + K.name + '만 바꿔서 20분 반응', PHONE ? 13.5 : 16.5, INK, 'center', 800);
    for (let i = 0; i < 3; i++) {
      const cx = g.cx[i] + (C.shake > 0 ? Math.sin(C.shake * 60) * 3 : 0);
      // 컵(가열 · 얼음 · 용액)
      const cup = { x: cx - g.tw * 1.25, y: g.cupY, w: g.tw * 2.5, h: g.cupH };
      let wc;
      if (k === 'temp') wc = i === 0 ? '#cfeeff' : i === 1 ? '#ffe0b8' : '#ffb27a'; else wc = mix(PHC[[2, 7, 11][i]], '#ffffff', 0.35);
      ctx.save(); ctx.globalAlpha = 1;
      D.shadow(() => { ctx.fillStyle = '#eef2f7'; rr(cup.x, cup.y, cup.w, cup.h, 12).fill(); }, { blur: 5, y: 2 });
      ctx.restore();
      const rem = condRem(k, i), dgr = 100 - rem;
      const look = sampleLook('starch', rem, dgr);
      glassTube(cx, g.top, g.tw, g.th, { liquid: look.liquid, level: 0.62, glow: C.sel[k] === i });
      ctx.save(); rr(cup.x, cup.y, cup.w, cup.h, 12).clip();
      ctx.fillStyle = rgba(wc, 0.62); ctx.beginPath(); ctx.moveTo(cup.x, cup.y + cup.h);
      for (let j = 0; j <= 20; j++) ctx.lineTo(cup.x + cup.w * j / 20, cup.y + 10 + Math.sin(t * 2 + j * 0.7 + i) * 1.4);
      ctx.lineTo(cup.x + cup.w, cup.y + cup.h); ctx.closePath(); ctx.fill();
      if (k === 'temp' && i === 0) { for (let q = 0; q < 4; q++) { const ix = cup.x + 12 + q * (cup.w - 40) / 3, iy = cup.y + 22 + (q % 2) * 24 + Math.sin(t + q) * 2; ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(ix, iy, 18, 16, 4).fill(); ctx.strokeStyle = '#9ad7f5'; ctx.lineWidth = 1.2; rr(ix, iy, 18, 16, 4).stroke(); } }
      ctx.restore();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.4; rr(cup.x, cup.y, cup.w, cup.h, 12).stroke();
      if (k === 'temp' && i === 2 && (run.go || run.done) && !RM && Math.random() < 0.25) parts.emit({ x: cx + rnd(-16, 16), y: cup.y + 6, vx: rnd(-6, 6), vy: -rnd(25, 45), life: 1.1, size: rnd(5, 9), color: 'rgba(255,255,255,.8)', shape: 'smoke', gravity: -10 });
      T(cx, cup.y + cup.h + 20, K.vals[i], PHONE ? 15 : 17, INK, 'center', 800);
      T(cx, cup.y + cup.h + 38, K.sub[i], 12.5, MUTED, 'center', 700);
      // 막대
      const bw = P(86, 84), bh = g.gh, bx = cx - bw / 2, by = g.gy + g.gh;
      const val = (run.go || run.done) ? rem : null;
      ctx.save(); ctx.fillStyle = '#eef2f7'; rr(bx, g.gy, bw, bh, 8).fill(); ctx.restore();
      if (val != null) {
        const hh = bh * clamp(val, 0, 100) / 100; const sel = C.sel[k] === i;
        const col = mix('#16a34a', '#4338ca', val / 100);
        D.shadow(() => { ctx.fillStyle = col; rr(bx, by - hh, bw, Math.max(0.5, hh), Math.min(8, hh / 2)).fill(); }, { blur: sel ? 10 : 3, y: 1 });
        if (sel) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; rr(bx - 2, by - hh - 2, bw + 4, hh + 4, 8).stroke(); }
        T(cx, Math.max(g.gy + 16, by - hh - 8), ROUND(val) + ' %', 15, INK, 'center', 800, { stroke: '#fff', strokeWidth: 4 });
        if (C.mark[k] === i) { D.check(cx + bw / 2 - 4, g.gy + 14, 14, 1); D.label(cx, g.gy - 12, '⭐ 최적', { bg: '#f59e0b', size: 13 }); }
        if (run.done && k === 'temp' && i === 2) D.label(cx, by - hh / 2, '효소 변성', { bg: 'rgba(127,29,29,.85)', size: 12.5 });
        if (run.done && k === 'ph' && i !== 1) D.label(cx, by - hh / 2, '활성 감소', { bg: 'rgba(120,53,15,.85)', size: 12.5 });
      } else T(cx, g.gy + bh / 2 + 5, '실행 전', 13, '#94a3b8', 'center', 700);
    }
    // 축 눈금
    const ax = g.cx[0] - P(86, 84) / 2 - 12;
    [0, 50, 100].forEach((v) => { const y = g.gy + g.gh - g.gh * v / 100; T(ax, y + 4, String(v), 11.5, MUTED, 'right', 700); });
    T(g.cx[0] - P(86, 84) / 2 - 12, g.gy - 12, '남은 녹말 (%)', 12, MUTED, 'left', 800);
    if (run.go) { const px = VW - P(120, 120), py = P(54, 62); ctx.fillStyle = '#e2e8f0'; rr(px - 70, py, 140, 10, 5).fill(); ctx.fillStyle = '#16a34a'; rr(px - 70, py, 140 * run.p, 10, 5).fill(); T(px, py + 28, '⏱ ' + (run.p * 20).toFixed(0) + ' / 20 분', 13, INK, 'center', 800); }
    T(VW / 2, VH - 10, '※ 교육용 가상 데이터 (20분 후 남은 녹말)', 12, '#b45309', 'center', 800);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(300, 345), S.msg, { bg: '#1b2333', color: '#fff', size: 13.5 }); ctx.restore(); }
  }

  /* ======================================================
     ④ 이어지는 길
     ====================================================== */
  const PRODUCTS = {
    glc: { name: '포도당', color: '#3b82f6', from: '녹말(엿당)', via: 'cap', note: '모세혈관으로 흡수 → 간 → 심장 → 온몸' },
    aa: { name: '아미노산', color: '#10b981', from: '단백질', via: 'cap', note: '모세혈관으로 흡수 → 간 → 심장 → 온몸' },
    fa: { name: '지방산·모노글리세리드', color: '#f59e0b', from: '지방', via: 'lac', note: '암죽관(림프관)으로 흡수 → 혈관과 합류 → 심장 → 온몸' },
  };
  function PG() {
    if (PHONE) {
      const xc = 160, top = 156, bot = 330;
      return { lumen: { x: 14, y: 40, w: 492, h: 92 }, xc, top, bot, vw: 108, cap: { x: xc - 26 }, lac: { x: xc + 16 },
        nodes: { liver: { x: 110, y: 470, name: '간' }, lymph: { x: 270, y: 440, name: '림프관 → 혈관' }, heart: { x: 340, y: 548, name: '심장' }, cells: { x: 260, y: 690, name: '온몸의 세포' } }, desc: { x: 300, y: 160, w: 210 } };
    }
    const xc = 185, top = 170, bot = 408;
    return { lumen: { x: 24, y: 58, w: 320, h: 92 }, xc, top, bot, vw: 120, cap: { x: xc - 30 }, lac: { x: xc + 18 },
      nodes: { liver: { x: 430, y: 480, name: '간' }, lymph: { x: 440, y: 330, name: '림프관 → 혈관' }, heart: { x: 600, y: 330, name: '심장' }, cells: { x: 680, y: 470, name: '온몸의 세포' } }, desc: { x: 380, y: 60, w: 380 } };
  }
  function routePts(kind) {
    const g = PG(), n = g.nodes, via = PRODUCTS[kind].via;
    if (via === 'cap') return [[g.cap.x, g.top + 22], [g.cap.x, g.bot - 4], [g.cap.x, g.bot + 14], [n.liver.x, n.liver.y], [n.heart.x, n.heart.y], [n.cells.x, n.cells.y]];
    return [[g.lac.x, g.top + 22], [g.lac.x, g.bot - 4], [g.lac.x, g.bot + 14], [n.lymph.x, n.lymph.y], [n.heart.x, n.heart.y], [n.cells.x, n.cells.y]];
  }
  const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function polyAt(pts, d) { for (let i = 1; i < pts.length; i++) { const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= sl) { const f = d / sl; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f), i]; } d -= sl; } const l = pts[pts.length - 1]; return [l[0], l[1], pts.length]; }
  function startRun(kind) {
    const g = PG(), Pt = S.path;
    Pt.sel = kind; Pt.run = Pt.run.filter((r) => r.kind !== kind || r.d > 0); Pt.spawn = 0; Pt.want = { kind, left: 3 };
    Sound.click(); updateCtl();
  }
  function stepPath(dt) {
    const g = PG(), Pt = S.path;
    if (Pt.want && Pt.want.left > 0) {
      Pt.spawn -= dt;
      if (Pt.spawn <= 0) {
        Pt.spawn = RM ? 0.05 : 0.55; Pt.want.left--;
        const l = g.lumen; const pts = routePts(Pt.want.kind);
        const sx = Pt.want.kind === 'fa' ? g.lac.x : g.cap.x;
        Pt.run.push({ kind: Pt.want.kind, d: -1, x: l.x + rnd(40, l.w - 40), y: l.y + rnd(40, l.h - 16), pts, len: polyLen(pts), phase: 0, sx });
      }
    }
    const spd = RM ? 900 : 190;
    Pt.run.forEach((r) => {
      if (r.arrived) return;
      if (r.phase === 0) { // 소장 안쪽 → 융털 입구
        const tx = r.pts[0][0], ty = r.pts[0][1] - 24;
        r.x = SciSim.approach(r.x, tx, dt, 3); r.y = SciSim.approach(r.y, ty, dt, 3);
        if (Math.hypot(r.x - tx, r.y - ty) < 4) { r.phase = 1; r.d = 0; }
      } else {
        r.d += spd * dt; const q = polyAt(r.pts, r.d); r.x = q[0]; r.y = q[1];
        const seg = q[2];
        if (seg >= 3) { const nm = ['', '', '', 'liver', 'heart', 'cells']; }
        if (!RM && Math.random() < 0.4) parts.emit({ x: r.x, y: r.y, vx: rnd(-8, 8), vy: rnd(-8, 8), life: 0.45, size: 3, color: PRODUCTS[r.kind].color, gravity: 0 });
        // 지나는 곳 이름 표시
        const nodes = g.nodes; let near = '';
        for (const k in nodes) if (Math.hypot(r.x - nodes[k].x, r.y - nodes[k].y) < 26) near = k;
        if (near) Pt.node = near;
        if (r.d >= r.len) {
          r.arrived = true; Pt.flash = 1;
          Pt.done[r.kind] = Math.min(3, (Pt.done[r.kind] || 0) + 1);
          if (!RM) parts.burst(r.x, r.y, { count: 8, speed: 90, size: 2.6, life: 0.6, colors: [PRODUCTS[r.kind].color, '#fff'], gravity: 0 });
          Sound.tick(); updateCtl();
        }
      }
    });
    Pt.run = Pt.run.filter((r) => !r.arrived || (Pt.flash > 0 && r.arrived && false));
    if (Pt.flash > 0) Pt.flash -= dt * 1.6;
  }
  const pathDoneN = () => ['glc', 'aa', 'fa'].filter((k) => S.path.done[k] >= 3).length;
  function drawPath(t) {
    const g = PG(), Pt = S.path, N = g.nodes;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 소장 안
    const l = g.lumen;
    D.shadow(() => { ctx.fillStyle = '#fff7ed'; rr(l.x, l.y, l.w, l.h, 14).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 2; rr(l.x, l.y, l.w, l.h, 14).stroke();
    T(l.x + 12, l.y + 20, '소장 안 · 소화된 산물 (눌러서 고르기)', PHONE ? 12 : 13, '#9a3412', 'left', 800);
    ['glc', 'aa', 'fa'].forEach((k, i) => {
      const pr = PRODUCTS[k], bx = l.x + 16 + i * (l.w - 32) / 3, by = l.y + 34, bw = (l.w - 32) / 3 - 8, bh = l.h - 44;
      const sel = Pt.sel === k, dn = Pt.done[k] >= 3;
      ctx.fillStyle = sel ? '#fff' : 'rgba(255,255,255,.6)'; rr(bx, by, bw, bh, 10).fill();
      ctx.strokeStyle = dn ? '#16a34a' : sel ? pr.color : '#fed7aa'; ctx.lineWidth = sel ? 3 : 1.5; rr(bx, by, bw, bh, 10).stroke();
      for (let q = 0; q < 4; q++) { const px = bx + 14 + (q % 2) * 22 + Math.sin(t * 1.6 + q + i) * 3, py = by + 14 + Math.floor(q / 2) * 18 + Math.cos(t * 1.4 + q) * 2; D.sphere(px, py, k === 'fa' ? 5 : 6, pr.color, { gloss: false }); }
      TF(bx + bw / 2 + 12, by + bh / 2 + 4, pr.name, bw - 52, PHONE ? 11.5 : 12.5, INK, 'center', 800);
      if (dn) D.check(bx + bw - 12, by + 12, 9, 1);
    });
    // 융털
    const vx = g.xc, vw = g.vw;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(vx - vw / 2, g.bot); ctx.lineTo(vx - vw / 2, g.top + vw / 2); ctx.arc(vx, g.top + vw / 2, vw / 2, Math.PI, 0); ctx.lineTo(vx + vw / 2, g.bot); ctx.closePath();
    const vg = ctx.createLinearGradient(vx - vw / 2, 0, vx + vw / 2, 0); vg.addColorStop(0, '#fbcfe8'); vg.addColorStop(0.5, '#fde7f3'); vg.addColorStop(1, '#f9a8d4');
    D.shadow(() => { ctx.fillStyle = vg; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 5; ctx.stroke();
    ctx.restore();
    // 모세혈관 · 암죽관
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(g.cap.x, g.bot + 14); ctx.lineTo(g.cap.x, g.top + 20); ctx.stroke();
    ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(g.cap.x, g.bot + 14); ctx.lineTo(g.cap.x, g.top + 20); ctx.stroke();
    ctx.strokeStyle = '#eab308'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(g.lac.x, g.bot + 14); ctx.lineTo(g.lac.x, g.top + 20); ctx.stroke();
    ctx.strokeStyle = '#fef9c3'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(g.lac.x, g.bot + 14); ctx.lineTo(g.lac.x, g.top + 20); ctx.stroke();
    ctx.restore();
    T(vx, g.top - 12, '소장 융털 (확대)', PHONE ? 12.5 : 13.5, INK, 'center', 800);
    T(g.cap.x - vw / 2 - 6, g.bot - 40, '모세혈관', 12, '#b91c1c', 'right', 800);
    T(g.lac.x + vw / 2 + 6, g.bot - 40, '암죽관', 12, '#a16207', 'left', 800);
    // 경로
    ['glc', 'aa', 'fa'].forEach((k) => {
      const pts = routePts(k), sel = Pt.sel === k;
      ctx.save(); ctx.strokeStyle = sel ? PRODUCTS[k].color : 'rgba(148,163,184,.55)'; ctx.lineWidth = sel ? 4 : 2; ctx.setLineDash([2, 9]); ctx.lineCap = 'round'; ctx.lineDashOffset = -t * 18;
      ctx.beginPath(); pts.slice(2).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
    });
    // 몸 안의 장소들
    const drawNode = (k, emoji, col) => {
      const q = N[k], lit = Pt.node === k && Pt.flash > 0;
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, 28, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = lit ? '#16a34a' : col; ctx.lineWidth = lit ? 4 : 3; ctx.beginPath(); ctx.arc(q.x, q.y, 28, 0, TAU); ctx.stroke();
      T(q.x, q.y + 9, emoji, 26, INK, 'center', 700);
      TF(q.x, q.y + 46, q.name, 110, PHONE ? 12.5 : 13, INK, 'center', 800);
    };
    drawNode('liver', '🫘', '#92400e'); drawNode('lymph', '💧', '#ca8a04'); drawNode('heart', '❤️', '#dc2626');
    // 온몸의 세포
    const c = N.cells; D.glow(c.x, c.y, 60 + Math.sin(t * 3) * 3, '#86efac', 0.35 + Math.max(0, Pt.flash) * 0.4);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, rx = c.x + Math.cos(a) * 30, ry = c.y + Math.sin(a) * 22; D.sphere(rx, ry, 12, '#4ade80', { gloss: true }); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rx, ry, 12, 0, TAU); ctx.stroke(); D.sphere(rx, ry, 4, '#166534', { gloss: false }); }
    TF(c.x, c.y + 56, c.name, 110, PHONE ? 12.5 : 13, INK, 'center', 800);
    // 이동 입자
    Pt.run.forEach((r) => { D.glow(r.x, r.y, 14, PRODUCTS[r.kind].color, 0.6); D.sphere(r.x, r.y, 6.5, PRODUCTS[r.kind].color, { gloss: true }); });
    // 설명 카드
    const d = g.desc, pr = PRODUCTS[Pt.sel], dn = Pt.done[Pt.sel] >= 3;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(d.x, d.y, d.w, PHONE ? 96 : 100, 14).fill(); }, { blur: 6, y: 2 });
    T(d.x + 12, d.y + 24, pr.from + ' → ' + pr.name, PHONE ? 13 : 14.5, pr.color, 'left', 800);
    block(d.x + 12, d.y + 46, d.w - 24, pr.note, PHONE ? 12 : 13, '#334155', PHONE ? 16 : 18, 700);
    if (dn) T(d.x + d.w - 12, d.y + (PHONE ? 90 : 94), '세포에서 물질대사(세포호흡)에 쓰여요', PHONE ? 11.5 : 12.5, '#166534', 'right', 800);
    if (pathDoneN() === 3) D.label(VW - P(130, 100), VH - P(26, 30), '➡ 다음: 기관계의 통합적 작용', { bg: '#16a34a', size: PHONE ? 11.5 : 13 });
    T(VW / 2, VH - 8, '교육용 모식도 (실제 크기·위치와 달라요)', 11.5, '#b45309', 'center', 800, {});
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { rack: '🧪 시험관 세팅', lab: '📊 분해 실험 결과', cond: '🌡 조건 비교', path: '🚚 이어지는 길' };
  function setMode(m, v) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; if (v) S.view = v; else if (m !== 'lab') S.view = 'res';
    S.pick = null; S.hover = ''; parts.clear(); updateCtl();
  }
  function ensure(m, v) { if (S.mode !== m || (v && S.view !== v)) setMode(m, v); }
  const sbTime = SciSim.bindRange($('#sTime'), $('#oTime'), (v) => Number(v).toFixed(1) + ' 분', (v) => { S.lab.t = v; S.lab.playing = false; updateCtl(); });
  function updateCtl() {
    const L = S.lab, C = S.cond;
    const key = S.mode + (S.mode === 'lab' ? ':' + S.view : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(S.mode)); });
    const free = !!(game && game.free);
    $('#modeSeg').hidden = !free; $('#tbLabel').hidden = free;
    $('#viewSeg').hidden = S.mode !== 'lab';
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.view));
    $('#oRack').textContent = addedN() + ' / 9';
    $('#bBath').disabled = S.bath.on; $('#bBath').textContent = S.bath.on ? '🌡 물중탕에 넣었어요' : '🌡 37 °C 물중탕에 넣기';
    $$('#nutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.n === L.nut));
    $('#bPlay').textContent = L.playing ? '⏸' : '▶'; $('#bPlay').setAttribute('aria-label', L.playing ? '멈춤' : '재생');
    $('#bileRow').hidden = L.nut !== 'milk';
    $('#bBile').textContent = L.bile ? '🧫 쓸개즙 시험관 빼기' : '🧫 쓸개즙 시험관 추가';
    $$('#varSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === C.kind));
    const sm = C.same[C.kind], lb = SAME_LABELS(C.kind), box = $('#sameChips');
    if (box.dataset.k !== C.kind) { box.dataset.k = C.kind; box.innerHTML = ''; lb.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.i = i; b.textContent = t; box.appendChild(b); }); }
    $$('#sameChips .chip').forEach((b, i) => { b.classList.toggle('on', sm[i]); b.setAttribute('aria-pressed', sm[i] ? 'true' : 'false'); });
    $('#oSame').textContent = sm.filter(Boolean).length + ' / 5';
    const r = C.run[C.kind], dok = condDesign(C.kind);
    $('#bRun').disabled = !dok || r.go; $('#bRun').textContent = r.go ? '⏳ 실험 중…' : r.done ? '↻ 다시 실행' : '▶ 20분 실험 실행';
    $('#bMark').disabled = !r.done;
    $('#condNote').textContent = r.done ? '막대(또는 시험관)를 눌러 고른 뒤 ⭐ 최적 표시를 눌러요. 남은 녹말이 가장 적을수록 잘 분해된 거예요.' : dok ? '설계가 알맞아요! 실험을 실행해 봐요.' : '같게 유지할 조건을 모두 고르세요. (바꾸는 변인은 같게 하면 안 돼요.)';
    $('#oPath').textContent = pathDoneN() + ' / 3';
    $$('#pathSeg button').forEach((b) => b.classList.toggle('on', b.dataset.p === S.path.sel));
  }
  $('#bBath').addEventListener('click', putInBath);
  $('#bRackReset').addEventListener('click', () => { Sound.click(); resetRack(); updateCtl(); });
  $('#viewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.fade = 0.5; S.view = b.dataset.v; S.pick = null; updateCtl(); } });
  $('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setMode(b.dataset.mode, b.dataset.mode === 'lab' ? 'res' : null); } });
  $('#nutSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.lab.nut = b.dataset.n; if (S.lab.nut !== 'milk') { S.lab.bile = false; } updateCtl(); } });
  $('#bPlay').addEventListener('click', () => { const L = S.lab; Sound.click(); if (L.playing) L.playing = false; else { if (L.t >= 20) { L.t = 0; L.ts = 0; } L.playing = true; } updateCtl(); });
  $('#bT0').addEventListener('click', () => { const L = S.lab; Sound.click(); L.playing = false; L.t = 0; $('#sTime').value = 0; sbTime.refresh(); updateCtl(); });
  $('#bBile').addEventListener('click', () => { Sound.click(); S.lab.bile = !S.lab.bile; updateCtl(); });
  $('#varSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.cond.kind = b.dataset.k; updateCtl(); } });
  $('#sameChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; const C = S.cond; if (C.run[C.kind].go) return; const i = +b.dataset.i; C.same[C.kind][i] = !C.same[C.kind][i]; Sound.tick(); updateCtl(); });
  $('#bRun').addEventListener('click', runCond);
  $('#bMark').addEventListener('click', markCond);
  $('#pathSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) startRun(b.dataset.p); });

  /* ---------- 포인터 ---------- */
  const bottleRect = (k) => { const g = RG(), i = KINDS.indexOf(k); return { x: g.bx[i] - g.bw / 2, y: g.by - g.bh / 2, w: g.bw, h: g.bh }; };
  function tubeAt(p) {
    const g = RG();
    for (let i = 0; i < 9; i++) { const cx = tubeX(i), dy = S.bath.y * g.dy; if (Math.abs(p.x - cx) <= g.tw / 2 + 12 && p.y >= g.top + dy - 14 && p.y <= g.top + g.th + dy + 8) return i; }
    return -1;
  }
  function pickHit(p) {
    const pk = S.pick; if (!pk) return null;
    for (let i = 0; i < pk.opts.length; i++) if (pk.opts[i].r && hit(p, pk.opts[i].r)) return i;
    return -1;
  }
  function labGroupAt(p) {
    const g = LG();
    for (const n of NUTS) { const neff = 3 + (n === 'milk' ? S.lab.bileA : 0), w = neff * g.sp + 14; if (Math.abs(p.x - g.tcx[n]) <= w / 2 && p.y >= g.titleY - 18 && p.y <= g.ttop + g.th + 50) return n; }
    return '';
  }
  function condHit(p) {
    const g = CG(); const bw = P(86, 84);
    for (let i = 0; i < 3; i++) {
      if (Math.abs(p.x - g.cx[i]) <= bw / 2 && p.y >= g.gy - 6 && p.y <= g.gy + g.gh + 4) return i;
      if (Math.abs(p.x - g.cx[i]) <= g.tw / 2 + 10 && p.y >= g.top - 8 && p.y <= g.top + g.th + 8) return i;
    }
    return -1;
  }
  function pathProdAt(p) {
    const g = PG(), l = g.lumen;
    for (let i = 0; i < 3; i++) { const bx = l.x + 16 + i * (l.w - 32) / 3, bw = (l.w - 32) / 3 - 8; if (p.x >= bx && p.x <= bx + bw && p.y >= l.y + 34 && p.y <= l.y + l.h - 10) return ['glc', 'aa', 'fa'][i]; }
    return '';
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.pick) {
        const i = pickHit(p);
        if (i >= 0) { const pk = S.pick; S.pick = null; Sound.tick(); pk.cb(pk.opts[i].label); updateCtl(); }
        else S.pick = null;
        return false;
      }
      if (S.mode === 'rack') {
        for (const k of KINDS) if (hit(p, bottleRect(k))) { S.selB = k; S.drag = { kind: k, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true; }
        const ti = tubeAt(p);
        if (ti >= 0) { if (S.selB) pourInto(ti, S.selB); else say('먼저 위쪽의 병을 골라요.'); }
        return false;
      }
      if (S.mode === 'lab') {
        if (S.view === 'tab') {
          for (let i = 0; i < 3; i++) {
            const r1 = cellRect(i, 1), r2 = cellRect(i, 2);
            if (hit(p, r1)) { openPick('sub' + i, SUB_OPTS, r1, (v) => { S.tab.sub[i] = v; }); return false; }
            if (hit(p, r2)) { openPick('prod' + i, PROD_OPTS, r2, (v) => { S.tab.prod[i] = v; }, Math.max(r2.w, 250)); return false; }
          }
          return false;
        }
        const n = labGroupAt(p); if (n && n !== S.lab.nut) { S.lab.nut = n; if (n !== 'milk') S.lab.bile = false; Sound.click(); updateCtl(); }
        return false;
      }
      if (S.mode === 'cond') { const i = condHit(p); if (i >= 0 && S.cond.run[S.cond.kind].done) { S.cond.sel[S.cond.kind] = i; Sound.click(); updateCtl(); } else if (i >= 0) say('먼저 20분 실험을 실행해요.'); return false; }
      if (S.mode === 'path') { const k = pathProdAt(p); if (k) startRun(k); return false; }
      return false;
    },
    move(p) { const d = S.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null;
      if (!d.moved) return; // 눌러서 고르기만
      const ti = tubeAt(p);
      if (ti >= 0) pourInto(ti, d.kind); else say('시험관 위에 놓아야 넣을 수 있어요.');
    },
    hover(p) {
      if (S.pick) { const i = pickHit(p); S.hover = i >= 0 ? 'pk' + i : ''; return i >= 0 ? 'pointer' : 'default'; }
      if (S.mode === 'rack') { for (const k of KINDS) if (hit(p, bottleRect(k))) { S.hover = 'b' + k; return 'grab'; } const ti = tubeAt(p); S.hover = ti >= 0 ? 't' + ti : ''; return ti >= 0 && S.selB ? 'pointer' : 'default'; }
      if (S.mode === 'lab') {
        if (S.view === 'tab') { for (let i = 0; i < 3; i++) { if (hit(p, cellRect(i, 1))) { S.hover = 'sub' + i; return 'pointer'; } if (hit(p, cellRect(i, 2))) { S.hover = 'prod' + i; return 'pointer'; } } S.hover = ''; return 'default'; }
        return labGroupAt(p) ? 'pointer' : 'default';
      }
      if (S.mode === 'cond') return condHit(p) >= 0 ? 'pointer' : 'default';
      if (S.mode === 'path') return pathProdAt(p) ? 'pointer' : 'default';
      return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let A, a, B, b, Cc, c;
    const L = S.lab, C = S.cond;
    if (S.mode === 'rack') {
      A = '채운 시험관'; a = addedN() + ' / 9';
      B = '대조·실험 짝맞춤'; b = [0, 1, 2].map((i) => NUT[NUTS[i]].name + (colState(i) ? ' ✔' : ' …')).join(' · ');
      Cc = '물중탕 온도'; c = S.bath.temp.toFixed(0) + ' °C';
    } else if (S.mode === 'lab') {
      A = '반응 시간'; a = L.ts.toFixed(1) + ' 분';
      if (S.view === 'tab') { B = '채운 칸'; b = (S.tab.sub.filter(Boolean).length + S.tab.prod.filter(Boolean).length) + ' / 6'; Cc = '확인한 영양소'; c = NUTS.filter((n) => L.seen[n]).map((n) => NUT[n].name).join('·') || '—'; }
      else {
        const n = L.nut, N = NUT[n];
        B = N.name + ' · 소화제'; b = n === 'milk' ? ROUND(degr(n, 'enz', L.ts)) + ' % 분해 (' + (degr(n, 'enz', L.ts) >= 50 ? '노랑' : '초록') + ' 쪽)' : ROUND(yval(n, 'enz', L.ts)) + ' % 남음';
        Cc = '끓인 소화제'; c = n === 'milk' ? ROUND(degr(n, 'boil', L.ts)) + ' % 분해' : ROUND(yval(n, 'boil', L.ts)) + ' % 남음';
      }
    } else if (S.mode === 'cond') {
      const k = C.kind, r = C.run[k];
      A = '바꾸는 변인'; a = COND[k].name;
      B = '같게 유지한 조건'; b = C.same[k].filter(Boolean).length + ' / 5 ' + (condDesign(k) ? '(알맞아요)' : '');
      Cc = '최적 표시'; c = C.mark[k] >= 0 ? COND[k].vals[C.mark[k]] : r.done ? '아직 안 함' : '—';
    } else {
      A = '따라간 산물'; a = pathDoneN() + ' / 3';
      B = '고른 산물'; b = PRODUCTS[S.path.sel].name;
      Cc = '지나가는 곳'; c = S.path.node ? S.path.nodeNames[S.path.node] || '' : '소장 융털';
    }
    const key = A + a + B + b + Cc + c; if (key === rlast) return; rlast = key;
    l1.textContent = A; v1.textContent = a; l2.textContent = B; v2.textContent = b; l3.textContent = Cc; v3.textContent = c;
  }
  S.path.nodeNames = { liver: '간', lymph: '림프관 → 혈관', heart: '심장', cells: '온몸의 세포' };

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    S.epoch++;
    if (li === 0) { resetRack(); setMode('rack'); }
    else if (li === 1) { labReset(); S.lab.playing = false; setMode('lab', 'res'); }
    else if (li === 2) { S.cond.run.temp = { p: 0, go: false, done: false }; S.cond.run.ph = { p: 0, go: false, done: false }; S.cond.sel = { temp: -1, ph: -1 }; S.cond.mark = { temp: -1, ph: -1 }; S.cond.same = { temp: [false, false, false, false, false], ph: [false, false, false, false, false] }; S.cond.kind = 'temp'; $('#sameChips').dataset.k = ''; setMode('cond'); }
    else { S.path = Object.assign(S.path, { sel: 'glc', done: { glc: 0, aa: 0, fa: 0 }, run: [], want: null, node: '', flash: 0 }); setMode('path'); }
    updateCtl();
  }
  function tableFeedback() {
    const tb = S.tab, bad = [];
    for (let i = 0; i < 3; i++) {
      if (!tb.sub[i] || !tb.prod[i]) return '표의 <b>모든 칸</b>을 눌러서 채워요. (남은 칸 ' + (6 - tb.sub.filter(Boolean).length - tb.prod.filter(Boolean).length) + '개)';
    }
    for (let i = 0; i < 3; i++) {
      if (tb.sub[i] !== ENZ_ROWS[i].sub) bad.push(ENZ_ROWS[i].name + '의 영양소');
      else if (tb.prod[i] !== ENZ_ROWS[i].prod) bad.push(ENZ_ROWS[i].name + '의 분해 산물');
    }
    if (!bad.length) return true;
    return eul(bad.join(', ')) + ' 다시 생각해 봐요. 앞 실험에서 어떤 시험관이 변했는지 떠올려요.';
  }
  function designFeedback() {
    const C = S.cond, k = C.kind, sm = C.same[k], lb = SAME_LABELS(k);
    if (sm[4]) return '<b>' + COND[k].name + '</b>은 이번 실험에서 일부러 바꾸는 변인이에요. 바꾸는 변인의 값까지 같게 하면 비교할 수 없어요.';
    const miss = [0, 1, 2, 3].filter((i) => !sm[i]);
    if (miss.length) return '아직 같게 유지하지 않은 조건이 있어요: <b>' + miss.map((i) => lb[i]).join(', ') + '</b>. 이 조건이 달라지면 결과 차이가 ' + COND[k].name + ' 때문인지 알 수 없어요.';
    return true;
  }

  const levels = [
    {
      title: '소화제 성분과 실험 준비', short: '소화제 성분', icon: '💊', phase: '실험',
      features: ['rack'],
      intro: '<p class="si-q">❓ 탐구 질문: 소화제를 먹으면 왜 음식이 더 잘 소화될까? 소화제는 모든 영양소에 똑같이 작용할까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 효소는 기질 특이성이 있고, 최적 온도·pH가 있으며, 열에 변성된다고 배웠어요. 중학교에서는 침 속 아밀레이스로 녹말 분해도 확인했지요.</div>' +
        '<p>이번에는 <b>세 가지 효소(아밀레이스·프로테이스·라이페이스)가 함께 든 소화제</b>로 녹말·단백질·지방을 한꺼번에 비교해요. 소화는 큰 영양소를 몸이 흡수할 수 있는 크기로 분해하는, 몸 전체 물질대사의 출발점이에요. 먼저 <b>변인을 통제</b>한 시험관 9개를 준비해요.</p>' +
        '<p class="note">※ 이 소화제와 모든 실험 값은 <b>교육용 가상 자료</b>예요. 실제 약을 먹는 방법을 알려 주는 것이 아니에요.</p>',
      setup() { enterLevel(0); },
      recap: '같은 시료에 물(대조군) · 소화제 · 끓인 소화제를 넣고 같은 온도(37 °C)에서 비교하면, 소화제의 효과를 알 수 있어요.',
      summary: '<ul><li>가상 소화제의 성분: <b>아밀레이스</b>(녹말), <b>프로테이스</b>(단백질), <b>라이페이스</b>(지방).</li><li>검출: 녹말 — <b>아이오딘 반응</b>(청람색이 옅어지면 분해), 단백질 — 흰자 조각(1 cm)의 남은 크기, 지방 — 우유 + <b>BTB</b>(지방산이 생기면 초록 → 노랑).</li><li>시료마다 <b>물(대조군) · 소화제 · 끓인 소화제</b> 3개씩, 모두 같은 온도(37 °C)에서 반응시켜요. <b>다르게 하는 것은 넣은 물질뿐</b>이에요.</li></ul>',
      missions: [
        {
          title: '시험관 9개 준비하기',
          goal: '녹말 · 흰자 · 우유 시험관마다 <b>물 · 소화제 · 끓인 소화제</b>를 하나씩 넣고, <b>🌡 37 °C 물중탕</b>에 넣으세요.',
          hint: '위쪽 병을 시험관으로 끌어다 놓아요(눌러서 고른 뒤 시험관을 눌러도 돼요). 묶음마다 세 가지가 한 번씩 들어가야 해요. 다 채우면 물중탕 버튼을 눌러요.',
          setup() { ensure('rack'); },
          check: () => rackSetOK() && S.bath.on && S.bath.ready === 1, hold: 0.5,
          status: () => [0, 1, 2].map((i) => mark(colState(i)) + ' ' + NUT[NUTS[i]].name).join(' · ') + ' · ' + mark(S.bath.on && S.bath.ready === 1) + ' 37 °C',
          explain: '시료마다 <b>물만 넣은 시험관(대조군)</b>, <b>소화제를 넣은 시험관</b>, <b>끓인 소화제를 넣은 시험관</b>을 두었어요. 온도, 시료의 양, 시간은 모두 같게 하고 <b>넣은 물질만 다르게</b> 했으므로, 결과 차이는 소화제 속 효소 때문이라고 해석할 수 있어요.',
        },
        {
          type: 'quiz', title: '물만 넣은 시험관의 역할',
          goal: '<b>물만 넣은 시험관</b>을 함께 두는 까닭은?',
          choices: ['소화제의 효과를 두 배로 만들어 주기 위해', '소화제를 넣지 않았을 때의 변화를 보여 주는 비교 기준(대조군)이 되기 위해', '반응 온도를 일정하게 유지하기 위해', '시험관에 넣는 시료의 양을 줄이기 위해'],
          answer: 1,
          feedback: ['물은 효소가 아니라서 효과를 키워 주지 않아요.', '', '온도는 물중탕이 맞춰 줘요. 물 시험관의 역할은 달라요.', '시료의 양은 모든 시험관에서 같게 해요.'],
          explain: '물만 넣은 시험관은 <b>대조군</b>이에요. 소화제를 넣지 않았을 때(시간이 지나도 거의 변하지 않을 때)와 비교해야, 소화제를 넣은 시험관의 변화가 소화제 때문이라고 말할 수 있어요.',
        },
      ],
    },
    {
      title: '분해 실험 결과 분석', short: '분해 실험', icon: '📊', phase: '분석',
      features: ['lab'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시료마다 물 · 소화제 · 끓인 소화제 시험관을 만들어 37 °C 물중탕에 넣었어요. 이제 20분 동안 어떤 일이 일어났는지 시간을 따라가며 비교해요.</div>' +
        '<p>시간을 움직이며 <b>시간–남은 양 그래프</b>를 그려 보세요. 소화제가 세 영양소를 모두 같은 정도로 분해할까요? 끓인 소화제는요? 🔍 <b>입자 모형</b>에서는 효소가 일하는 모습을 볼 수 있어요.</p>',
      setup() { enterLevel(1); },
      recap: '소화제의 효소는 영양소를 분해하지만 끓이면(변성) 분해하지 못해요. 효소마다 분해하는 영양소가 정해져 있어요(기질 특이성).',
      summary: '<ul><li>20분 후(37 °C, 가상 예시 값) 남은 녹말: 물 <b>100 %</b>, 소화제 <b>10 %</b>, 끓인 소화제 <b>100 %</b>. 흰자 조각의 남은 크기: 물 100 %, 소화제 <b>55 %</b>, 끓인 소화제 100 %. 우유 BTB: 물 초록 유지, 소화제 <b>노랑</b>, 끓인 소화제 초록.</li><li><b>끓인 소화제</b>는 분해하지 못해요 → 효소(단백질)가 열에 <b>변성</b>되어 활성 부위가 기능을 잃었어요.</li><li>기질 특이성: <b>아밀레이스</b>–녹말–엿당, <b>프로테이스</b>–단백질–아미노산, <b>라이페이스</b>–지방–지방산·모노글리세리드.</li><li><b>쓸개즙</b>은 효소가 아니에요. 지방을 작게 쪼개(유화) 라이페이스가 작용할 면적을 넓혀 분해를 빠르게 해요.</li></ul>',
      missions: [
        {
          title: '20분 결과 비교하기',
          goal: '시간을 <b>20분</b>까지 재생해 🍚 🥚 🥛 결과를 모두 확인하고, 🥛 지방에서는 <b>🧫 쓸개즙 시험관</b>을 추가해 16분까지 비교하세요.',
          hint: '▶를 눌러 20분까지 재생한 뒤 영양소를 바꿔 가며 확인해요. 🥛 지방을 고르면 쓸개즙 시험관 추가 버튼이 나타나요.',
          setup() { ensure('lab', 'res'); },
          check: () => NUTS.every((n) => S.lab.seen[n]) && S.lab.bileSeen, hold: 0.4,
          status: () => NUTS.map((n) => mark(S.lab.seen[n]) + NUT[n].icon).join(' ') + ' · ' + mark(S.lab.bileSeen) + ' 쓸개즙 비교',
          explain: '소화제 시험관에서는 <b>녹말 10 %</b>만 남고, 흰자 조각은 <b>55 %</b>로 줄고, 우유는 <b>노랑</b>으로 변했어요. 소화제의 효소가 세 영양소를 분해한 거예요. 하지만 분해 정도는 영양소마다 달랐어요. 쓸개즙을 더하면 지방 분해가 더 빨라져 BTB가 약 8분에 노랑(90 % 이상)에 이르렀어요(쓸개즙이 없을 때는 약 16분).',
        },
        {
          title: '효소 표 완성하기',
          goal: '<b>📋 효소 표</b>에서 효소마다 <b>분해하는 영양소</b>와 <b>분해 산물</b>을 모두 골라 채우세요.',
          hint: '표의 빈칸을 누르면 목록이 나타나요. 앞 실험에서 어떤 효소가 어떤 시료를 변하게 했는지 떠올려요.',
          manual: true,
          setup() { ensure('lab', 'tab'); },
          check: tableFeedback,
          explain: '<b>아밀레이스</b>는 녹말을 엿당으로, <b>프로테이스</b>는 단백질을 아미노산으로, <b>라이페이스</b>는 지방을 지방산과 모노글리세리드로 분해해요. 효소마다 분해하는 물질이 정해져 있는 것이 <b>기질 특이성</b>이에요.',
        },
        {
          type: 'quiz', title: '끓인 소화제는 왜 분해하지 못할까?',
          goal: '<b>끓인 소화제</b>를 넣은 시험관에서 영양소가 분해되지 않은 까닭은?',
          setup() { ensure('lab', 'res'); },
          choices: ['끓이는 동안 효소가 모두 증발해 없어졌기 때문이다', '끓인 소화제는 온도가 높아서 시료가 먼저 분해되기 때문이다', '열에 의해 효소(단백질)의 모양이 변하는 변성이 일어나 활성 부위가 기능을 잃었기 때문이다', '끓이면 효소가 다른 영양소만 분해하게 바뀌기 때문이다'],
          answer: 2,
          feedback: ['효소는 증발하지 않아요. 모양이 변해서 일을 못 하는 거예요.', '실험은 모두 37 °C에서 했어요. 시료가 저절로 분해된 것이 아니에요.', '', '변성된 효소는 어떤 기질에도 작용하지 못해요.'],
          explain: '효소의 주성분은 단백질이에요. 끓이면 단백질의 입체 구조가 변해(<b>변성</b>) 기질과 꼭 맞는 <b>활성 부위</b>가 사라져요. 한 번 변성되면 식혀도 원래대로 돌아오지 않아요.',
        },
      ],
    },
    {
      title: '조건 비교와 실험 설계', short: '조건 비교', icon: '🌡', phase: '탐구',
      features: ['cond'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소화제의 효소가 37 °C에서 영양소를 분해했고, 끓이면 변성되어 못 했어요. 그렇다면 소화제는 어떤 <b>온도</b>와 <b>pH</b>에서 가장 잘 작용할까요?</div>' +
        '<p>이번에는 직접 <b>실험을 설계</b>해요. <b>바꿀 변인 하나</b>(온도 또는 pH)를 고르고 나머지 조건은 <b>모두 같게</b> 유지해야 해요. 설계가 알맞으면 20분 실험을 실행해 녹말 용액에서 <b>가장 잘 분해된 조건</b>(최적 조건)을 찾아요.</p>',
      setup() { enterLevel(2); },
      recap: '한 번에 한 가지 변인만 바꾸고 나머지는 같게 해야 결과를 해석할 수 있어요. 소화제는 37 °C, 중성(pH 7)에서 가장 잘 작용했어요.',
      summary: '<ul><li><b>변인 통제</b>: 바꾸는 변인(독립 변인) 하나만 다르게 하고, 소화제·시료의 양, 반응 시간, 나머지 조건은 모두 같게 해요.</li><li>온도별 남은 녹말(20분, 가상 예시): <b>0 °C 85 %</b>, <b>37 °C 10 %</b>, <b>60 °C 95 %</b>(변성). pH별: <b>pH 2 80 %</b>, <b>pH 7 10 %</b>, <b>pH 11 70 %</b>.</li><li>효소마다 가장 잘 작용하는 <b>최적 온도·최적 pH</b>가 있어요. 너무 높은 온도에서는 변성되고, pH가 맞지 않으면 활성이 줄어요.</li><li>위액(pH 약 2)에서는 소화제의 효소 활성이 줄어들 수 있어서, 소장까지 보호하는 <b>장용 코팅</b> 제제를 쓰기도 해요.</li></ul>',
      missions: [
        {
          title: '변인 통제 설계하기',
          goal: '<b>🌡 온도</b> 또는 <b>🧪 pH</b> 중 바꿀 변인을 고르고, <b>같게 유지할 조건</b>을 알맞게 골라 설계를 완성하세요.',
          hint: '소화제의 양, 녹말 용액의 양, 반응 시간, 그리고 바꾸지 않는 다른 변인은 같게 해요. 바꾸는 변인의 값은 달라야 해요.',
          manual: true,
          setup() { ensure('cond'); },
          check: designFeedback,
          explain: '비교 실험에서는 <b>바꾸는 변인 하나</b>만 다르게 하고 나머지(소화제와 시료의 양, 시간, 바꾸지 않는 다른 변인)는 <b>같게</b> 해요. 그래야 결과 차이를 바꾼 변인 때문이라고 말할 수 있어요. 온도와 pH를 동시에 바꾸면 어느 쪽 때문인지 알 수 없어요.',
        },
        {
          title: '최적 온도와 최적 pH 찾기',
          goal: '온도 실험과 pH 실험을 <b>모두 실행</b>하고, 남은 녹말이 가장 적은 조건에 각각 <b>⭐ 최적 표시</b>를 하세요.',
          hint: '🌡 / 🧪 로 바꿔 가며 설계 → 실행해요. 막대(또는 시험관)를 눌러 고른 뒤 ⭐ 최적 표시를 눌러요.',
          setup() { ensure('cond'); },
          check: () => S.cond.run.temp.done && S.cond.run.ph.done && S.cond.mark.temp === COND.temp.best && S.cond.mark.ph === COND.ph.best, hold: 0.5,
          status: () => mark(S.cond.run.temp.done) + ' 온도 실행 · ' + mark(S.cond.mark.temp >= 0) + ' 온도 ⭐ · ' + mark(S.cond.run.ph.done) + ' pH 실행 · ' + mark(S.cond.mark.ph >= 0) + ' pH ⭐',
          explain: '남은 녹말이 가장 적은 조건이 가장 잘 분해된 조건이에요. 온도는 <b>37 °C</b>(10 %), pH는 <b>pH 7</b>(10 %)이에요. <b>0 °C</b>에서는 반응이 느릴 뿐이지만, <b>60 °C</b>에서는 효소가 변성되어 거의 분해하지 못했어요.',
        },
        {
          type: 'quiz', title: '위액에서 효소제는 어떻게 쓰일까?',
          goal: '위액(pH 약 2)에서 소화제 속 효소의 활성이 낮아진다면, <b>장용 코팅 효소제</b>의 쓰임새로 가장 알맞은 것은?',
          setup() { ensure('cond'); },
          choices: ['위에서 효소가 바로 풀려 나오도록 코팅을 없앤다', '위를 지나는 동안 효소를 보호하고, 소장(약한 염기성)에서 녹아 효소가 작용하게 한다', '효소를 끓여서 더 단단하게 만든다', '위에서 효소의 최적 pH가 2가 되도록 바꾼다'],
          answer: 1,
          feedback: ['위에서는 pH가 낮아 활성이 줄어요. 바로 풀려 나오게 하면 효과가 작아요.', '', '끓이면 변성되어 기능을 잃어요.', '효소의 최적 pH는 효소 자체의 성질이라 바꿀 수 없어요.'],
          explain: 'pH 2에서는 효소의 활성이 낮아졌어요(남은 녹말 80 %). 그래서 위를 지나는 동안은 코팅으로 보호하고, 약한 염기성인 <b>소장</b>에서 코팅이 녹아 효소가 일하도록 해요. (교육용 설명이며 실제 복용 방법이 아니에요.)',
        },
      ],
    },
    {
      title: '분해 산물이 가는 길', short: '이어지는 길', icon: '🚚', phase: '적용',
      features: ['path'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소화 효소가 녹말 · 단백질 · 지방을 작은 분자로 분해하고, 온도와 pH에 따라 작용이 달라지는 것을 확인했어요. 분해된 산물은 그다음 어디로 갈까요?</div>' +
        '<p>소화는 끝이 아니라 <b>물질대사의 출발점</b>이에요. 분해 산물이 <b>소장 융털</b>에서 흡수되어 <b>순환계</b>를 타고 온몸의 세포로 가는 길을 따라가 봐요. 다음 차시에서는 이 흐름에 호흡·배설까지 함께 일하는 모습을 살펴볼 거예요.</p>',
      setup() { enterLevel(3); },
      recap: '분해 산물은 소장 융털에서 흡수되어 혈액(과 림프)을 따라 온몸의 세포로 운반되고, 세포에서 물질대사에 쓰여요.',
      summary: '<ul><li>소화 산물: <b>포도당</b>, <b>아미노산</b>은 융털의 <b>모세혈관</b>으로, <b>지방산·모노글리세리드</b>는 <b>암죽관(림프관)</b>으로 흡수돼요. 암죽관은 결국 혈관과 합쳐져요.</li><li>흡수된 영양소는 <b>순환계</b>(혈액)를 따라 간 · 심장을 거쳐 온몸의 세포로 운반돼요.</li><li>세포에서는 이 영양소로 <b>세포호흡</b> 등 물질대사가 일어나요. 소화제는 이미 있는 영양소의 소화를 도울 뿐, 에너지를 만들어 주는 것이 아니에요.</li><li>소화 → 순환 → (호흡·배설) 은 따로 일하지 않고 <b>기관계의 통합적 작용</b>으로 이어져요.</li></ul>',
      missions: [
        {
          title: '분해 산물의 길 따라가기',
          goal: '포도당 · 아미노산 · 지방산 <b>세 산물</b>을 모두 골라 소장 융털에서 <b>온몸의 세포</b>까지 가는 길을 따라가 보세요.',
          hint: '위쪽 상자나 오른쪽 버튼으로 산물을 고르면 입자가 길을 따라 움직여요. 세 산물을 모두 도착시켜요.',
          setup() { ensure('path'); },
          check: () => pathDoneN() === 3, hold: 0.3,
          status: () => ['glc', 'aa', 'fa'].map((k) => mark(S.path.done[k] >= 3) + ' ' + PRODUCTS[k].name).join(' · '),
          explain: '포도당과 아미노산은 <b>모세혈관</b>으로 흡수되어 간을 거쳐 심장으로 가고, 지방산과 모노글리세리드는 <b>암죽관</b>(림프관)으로 흡수된 뒤 혈관과 합쳐져 심장으로 가요. 심장이 온몸으로 내보낸 혈액이 이 영양소를 세포까지 운반해요. 소화 · 순환이 이어서 일하는 거예요.',
        },
        {
          type: 'quiz', title: '소화제와 효소제를 알맞게 이해하기',
          goal: '다음 설명 중 <b>옳은</b> 것은?',
          setup() { ensure('path'); },
          choices: ['소화제는 우리 몸에 에너지를 직접 만들어 준다', '효소제를 아주 뜨거운 물에 타서 먹으면 효소가 더 잘 작용한다', '소화제는 이미 먹은 영양소의 분해를 돕는 것이며, 높은 온도에서는 효소가 변성될 수 있다', '소화제의 효소는 한 번 쓰이면 모두 없어져서 다시 쓸 수 없다'],
          answer: 2,
          feedback: ['에너지는 영양소를 세포호흡으로 분해할 때 얻어요. 소화제는 소화(분해)를 도울 뿐이에요.', '뜨거운 물에서는 효소가 변성되어 기능을 잃어요(60 °C에서 남은 녹말 95 %).', '', '효소는 반응이 끝나도 변하지 않아서 다시 쓰일 수 있어요.'],
          explain: '소화제는 <b>이미 있는 영양소의 분해(소화)</b>를 돕는 효소예요. 에너지를 직접 만들어 주지 않아요. 또 효소는 단백질이라 <b>뜨거운 물</b>에서는 변성되어 일하지 못해요. (이 앞의 모든 값은 교육용 가상 자료이고, 실제 약은 설명서를 따라야 해요.)',
        },
        {
          type: 'quiz', title: '기름진 식사 뒤 쓸개즙이 하는 일',
          goal: '지방이 많은 식사를 한 뒤 <b>쓸개즙</b>이 하는 일로 알맞은 것은?',
          setup() { ensure('path'); },
          choices: ['지방을 직접 지방산으로 분해하는 효소로 작용한다', '지방을 작은 방울로 쪼개 라이페이스가 작용할 면적을 넓힌다', '녹말을 엿당으로 분해한다', '지방을 흡수해 간으로 운반한다'],
          answer: 1,
          feedback: ['쓸개즙은 효소가 아니에요. 분해는 라이페이스가 해요.', '', '녹말은 아밀레이스가 분해해요.', '운반은 순환계(혈액·림프)가 해요.'],
          explain: '쓸개즙은 효소가 아니라 지방을 작은 방울로 쪼개는(<b>유화</b>) 물질이에요. 지방 방울의 표면적이 넓어지면 <b>라이페이스</b>가 더 많이 달라붙어 분해가 빨라져요.',
        },
      ],
    },
  ];

  resetRack(); labReset();
  game = SciSim.game({
    simId: 'hb-digest-enzyme', mount: '#game', badge: '소화 효소 탐구자', homeHref: '../../index.html#hb',
    featureLabels: { rack: '🧪 시험관 9개 세팅 · 물중탕', lab: '📊 시간–남은 양 그래프 · 입자 모형 · 효소 표', cond: '🌡 변인 통제 설계 · 온도/pH 비교', path: '🚚 분해 산물의 이동 경로' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.msgT > 0) S.msgT -= dt;
    if (S.cond.shake > 0) S.cond.shake -= dt;
    if (S.mode === 'rack') stepRack(dt); else if (S.mode === 'lab') stepLab(dt); else if (S.mode === 'path') stepPath(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'rack') drawRack(t); else if (S.mode === 'lab') drawLab(t); else if (S.mode === 'cond') drawCond(t); else drawPath(t);
    parts.draw(ctx);
    drawPicker();
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,248,244,' + S.fade * 0.9 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, ensure, updateCtl, pourInto, putInBath, resetRack, rackSetOK, labReset, runCond, markCond, startRun, enterLevel, RG, LG, CG, PG, cellRect, degr, yval, condDesign, pathDoneN, KINDS, NUTS, COND, tubeX, TGeo, labGroupAt, condHit, tableFeedback,
    fillRack() { resetRack(); S.tubes.forEach((tb, i) => { tb.add = KINDS[tb.row]; tb.lvl = 1; tb.tag = 1; }); updateCtl(); },
    setTime(v) { const sl = $('#sTime'); sl.value = v; sl.dispatchEvent(new Event('input')); },
  };
})();
