/* =========================================================
   통합과학1 Ⅰ. 과학의 기초 - 디지털 변환과 통신 (단원 6차시)
   성취기준 [10통과1-01-04] 자연에서 일어나는 다양한 변화를 측정·분석하여 정보를 산출함을 알고, 이러한 정보를
   디지털로 변환하는 기술을 정보 통신에 활용하여 현대 문명에 미친 영향을 인식한다. (디지털 변환·통신 부분)
   ① 관찰: 아날로그와 디지털 (연속 ↔ 띄엄띄엄 단계)
   ② 실험: 표본화·양자화 (표본 간격과 비트 수 조절)
   ③ 모형: 이진 부호 (스위치 8개, 아날로그·디지털 전송 비교)
   ④ 적용: 통신과 문명 (8×8 그림 0/1 부호화·송신, 장점·우려 분류)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 840 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  let SPEED = 1;

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f6fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  let game = null;

  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    const push = () => { if (line) out.push(line); line = ''; };
    str.split(' ').forEach((tok) => {
      const cand = line ? line + ' ' + tok : tok;
      if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
      if (line) push();
      if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
      tok.split('').forEach((ch) => { if (ctx.measureText(line + ch).width > maxW) push(); line += ch; });
    });
    push(); ctx.restore(); return out;
  }
  function paraText(x, y, str, maxW, size, o) {
    o = o || {};
    const lines = wrapText(str, maxW, size, o.weight || 700), lh = Math.round(size * (o.lh || 1.35) * FS);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, color: o.color || '#1b2333', weight: o.weight || 700, align: o.align || 'left', alpha: o.alpha }));
    return lines.length * lh;
  }
  function panel(x, y, w, h, fill, stroke) {
    ctx.fillStyle = 'rgba(30,45,80,.10)'; rr(x, y + 3, w, h, 16).fill();
    ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, 16).fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; rr(x, y, w, h, 16).stroke(); }
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'compare', clock: 0, fade: 0, drag: null,
    sort: {}, smp: { dt: 1, bits: 2, dots: [], err: 0, errDisp: 0, focus: false, lvlAns: false },
    bn: { bits: [0, 0, 0, 0, 0, 0, 0, 0], knob: [0, 0, 0, 0, 0, 0, 0, 0], idx: 0, hold: 0, buf: [], noise: 0, rest: 0, popT: 0 },
    px: { bits: [], recv: [], pop: [], send: -1, sent: false, sentBits: null, paint: null, flash: [] },
  };
  const has = (n) => !!(game && game.has(n));

  /* ======================================================
     공통: 카드 끌어 놓기
     ====================================================== */
  function pickItem(p, list) { for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    if (lift > 0.05) D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    else { ctx.fillStyle = 'rgba(30,45,80,.13)'; rr(-c.w / 2, -c.h / 2 + 3, c.w, c.h, 12).fill(); ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).fill(); }
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).stroke();
    return () => ctx.restore();
  }
  function dragStart(c, p, list) {
    S.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    const i = list.indexOf(c); if (i >= 0) { list.splice(i, 1); list.push(c); }
    SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); c.free = true;
  }
  function flyTo(c, x, y) { c.free = false; c.tx = x; c.ty = y; SciSim.tween(c, { lift: 0 }, { duration: 0.25 }); }
  function stepItems(list, dt) {
    list.forEach((c) => {
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      if (c.tw != null) { c.w = RM ? c.tw : SciSim.approach(c.w, c.tw, dt, 14); c.h = RM ? c.th : SciSim.approach(c.h, c.th, dt, 14); }
      if (c.free) return;
      if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
    });
  }

  /* ======================================================
     분류 게임 엔진 (아날로그/디지털, 장점/우려)
     ====================================================== */
  /* ---- 아날로그·디지털 사례: 작은 장면 (중심 0,0 / 약 200×100) ---- */
  const SCN = {
    clockA(t) {
      D.sphere(0, 0, 44, '#ffffff', { gloss: false, outline: '#94a3b8', outlineWidth: 3 });
      ctx.strokeStyle = '#475569'; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.lineWidth = i % 3 ? 1.5 : 3; ctx.beginPath(); ctx.moveTo(Math.sin(a) * 36, -Math.cos(a) * 36); ctx.lineTo(Math.sin(a) * 41, -Math.cos(a) * 41); ctx.stroke(); }
      const sa = t * 0.9, ma = t * 0.075 + 1.0, ha = t * 0.006 + 2.2;
      ctx.lineWidth = 4; ctx.strokeStyle = '#1b2333'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ha) * 20, -Math.cos(ha) * 20); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ma) * 32, -Math.cos(ma) * 32); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(-Math.sin(sa) * 8, Math.cos(sa) * 8); ctx.lineTo(Math.sin(sa) * 38, -Math.cos(sa) * 38); ctx.stroke();
      D.sphere(0, 0, 3.5, '#1b2333', { gloss: false });
    },
    clockD(t) {
      ctx.fillStyle = '#0f172a'; rr(-62, -28, 124, 56, 10).fill();
      const s = Math.floor(t) % 60, pop = 1 - Math.min(1, (t % 1) * 5);
      ctx.save(); ctx.font = '800 26px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4ade80';
      ctx.fillText('12:34:' + ('0' + s).slice(-2), 0, 1 + pop * 1.5); ctx.restore();
      ctx.fillStyle = 'rgba(74,222,128,' + (0.25 * pop) + ')'; rr(32, -14, 26, 28, 4).fill();
    },
    ramp(t) {
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-86, 38); ctx.lineTo(-86, -30); ctx.lineTo(86, 38); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
      const p = (t * 0.32) % 1, x = -80 + 160 * p * 0.97, y = -30 + (x + 86) / 172 * 68 - 9;
      ctx.strokeStyle = 'rgba(56,103,244,.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, 38); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(x, y, 9, '#3867f4');
    },
    stairs(t) {
      ctx.fillStyle = '#cbd5e1'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const top = -30 + i * 13.6; ctx.fillRect(-86 + i * 34.4, top, 34.4, 38 - top); ctx.strokeRect(-86 + i * 34.4, top, 34.4, 38 - top); }
      const T = t * 1.0, k = Math.floor(T) % 5, f = T % 1, hop = Math.min(1, f / 0.35);
      const cx = (i) => -86 + i * 34.4 + 17, cy = (i) => -30 + i * 13.6 - 9;
      let x = cx(k), y = cy(k);
      if (k < 4) { x = lerp(cx(k), cx(k + 1), hop); y = lerp(cy(k), cy(k + 1), hop) - Math.sin(hop * Math.PI) * 14; }
      ctx.strokeStyle = 'rgba(56,103,244,.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, 38); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(x, y, 9, '#3867f4');
    },
    lp(t) {
      const g = ctx.createRadialGradient(-6, -8, 4, 0, 0, 42); g.addColorStop(0, '#475569'); g.addColorStop(1, '#0f172a');
      ctx.save(); ctx.translate(-34, 0); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 42, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; for (let r = 14; r < 40; r += 5) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke(); }
      ctx.rotate(t * 2.4); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 28, 0.2, 1.1); ctx.stroke();
      ctx.rotate(-t * 2.4); D.sphere(0, 0, 11, '#e2464b', { gloss: false }); D.sphere(0, 0, 2.5, '#fff', { gloss: false }); ctx.restore();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(22, -40); ctx.lineTo(-8, -14); ctx.stroke(); D.sphere(22, -40, 5, '#64748b', { gloss: false });
      ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const x = 20 + i * 1.7, y = 24 + Math.sin(i * 0.42 - t * 5) * 9; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    },
    file(t) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-60, -38); ctx.lineTo(-24, -38); ctx.lineTo(-8, -22); ctx.lineTo(-8, 38); ctx.lineTo(-60, 38); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-60, -38); ctx.lineTo(-24, -38); ctx.lineTo(-8, -22); ctx.lineTo(-8, 38); ctx.lineTo(-60, 38); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#8b5cf6'; rr(-52, -8, 36, 20, 5).fill(); D.text(-34, 7, '.mp3', { size: 13, weight: 800, color: '#fff' });
      const shift = Math.floor(t * 5);
      ctx.save(); ctx.beginPath(); ctx.rect(6, -40, 92, 80); ctx.clip();
      ctx.font = D.font(15, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      for (let c = 0; c < 5; c++) for (let r = 0; r < 5; r++) { const v = hash(c * 17 + (r + shift) * 3.1 + 5) > 0 ? '1' : '0'; ctx.fillStyle = v === '1' ? '#4ade80' : '#94a3b8'; ctx.fillText(v, 16 + c * 17, -26 + r * 18 + ((t * 5) % 1) * 18); }
      ctx.restore();
    },
  };
  const CMP_CARDS = [
    { id: 'clockA', t: '바늘 시계', ans: 'a' }, { id: 'clockD', t: '숫자 시계', ans: 'd' },
    { id: 'ramp', t: '경사로', ans: 'a' }, { id: 'stairs', t: '계단', ans: 'd' },
    { id: 'lp', t: 'LP판', ans: 'a' }, { id: 'file', t: '음원 파일', ans: 'd' },
  ];
  const SOC_CARDS = [
    { id: 'med', t: '원격 의료', ico: '🩺', d: '멀리 있는 의사와 화면으로 진료해요', ans: 'good' },
    { id: 'shop', t: '인터넷 쇼핑', ico: '🛒', d: '집에서 주문하면 집 앞까지 배달돼요', ans: 'good' },
    { id: 'ai', t: '인공지능 번역', ico: '🌐', d: '다른 나라 말도 바로 이해해요', ans: 'good' },
    { id: 'leak', t: '개인 정보 유출', ico: '🔓', d: '내 정보가 허락 없이 퍼질 수 있어요', ans: 'care' },
    { id: 'gap', t: '디지털 격차', ico: '📵', d: '기기를 못 쓰면 서비스에서 소외돼요', ans: 'care' },
  ];
  const SORTS = {
    compare: { cards: CMP_CARDS, bins: [{ id: 'a', label: '아날로그', sub: '값이 이어져 계속 변해요', col: '#3867f4' }, { id: 'd', label: '디지털', sub: '값이 띄엄띄엄 단계로 있어요', col: '#f26b3a' }], order: [4, 1, 2, 5, 0, 3] },
    cards: { cards: SOC_CARDS, bins: [{ id: 'good', label: '👍 편리해진 점', sub: '정보 통신 덕분에 좋아졌어요', col: '#14a058' }, { id: 'care', label: '⚠️ 조심할 점', sub: '문제가 생길 수 있어요', col: '#e2464b' }], order: [3, 0, 4, 1, 2] },
  };
  function sortGeom(key) {
    const comp = key === 'compare';
    if (PHONE) return comp ? { bins: [{ x: 14, y: 14, w: 572, h: 178 }, { x: 14, y: 202, w: 572, h: 178 }], chip: { w: 130, h: 60, per: 4, gx: 8, gy: 8, top: 56 }, full: { w: 276, h: 130 }, trayY: 396, cols: 2, gap: 8 }
      : { bins: [{ x: 14, y: 14, w: 572, h: 200 }, { x: 14, y: 224, w: 572, h: 200 }], chip: { w: 130, h: 62, per: 4, gx: 8, gy: 8, top: 56 }, full: { w: 276, h: 112 }, trayY: 440, cols: 2, gap: 8 };
    return comp ? { bins: [{ x: 14, y: 14, w: 380, h: 190 }, { x: 406, y: 14, w: 380, h: 190 }], chip: { w: 112, h: 62, per: 3, gx: 8, gy: 8, top: 56 }, full: { w: 250, h: 150 }, trayY: 216, cols: 3, gap: 10 }
      : { bins: [{ x: 14, y: 14, w: 380, h: 200 }, { x: 406, y: 14, w: 380, h: 200 }], chip: { w: 112, h: 62, per: 3, gx: 8, gy: 8, top: 56 }, full: { w: 250, h: 130 }, trayY: 226, cols: 3, gap: 10 };
  }
  function sortInit(key) {
    const def = SORTS[key], G = sortGeom(key);
    const z = { key, def, G, bins: def.bins.map((b, i) => Object.assign({}, b, G.bins[i], { k: i })), cards: [], ok: false, okA: 0, seq: 0 };
    z.cards = def.order.map((ci, n) => {
      const c = def.cards[ci], h = trayHome(G, n);
      return Object.assign({}, c, { kind: 'sc', key, x: h.x, y: h.y, tx: h.x, ty: h.y, hx: h.x, hy: h.y, w: G.full.w, h: G.full.h, tw: G.full.w, th: G.full.h, lift: 0, shake: 0, free: false, bin: null, bad: false, seq: 0 });
    });
    S.sort[key] = z; return z;
  }
  function trayHome(G, n) {
    const col = n % G.cols, row = Math.floor(n / G.cols), total = G.cols * G.full.w + (G.cols - 1) * G.gap;
    return { x: (VW - total) / 2 + G.full.w / 2 + col * (G.full.w + G.gap), y: G.trayY + G.full.h / 2 + row * (G.full.h + G.gap) };
  }
  function sortLayout(z) {
    const G = z.G;
    z.bins.forEach((b) => {
      const list = z.cards.filter((c) => c.bin === b.id).sort((a, c) => a.seq - c.seq);
      list.forEach((c, k) => {
        const col = k % G.chip.per, row = Math.floor(k / G.chip.per);
        c.tx = b.x + 14 + G.chip.w / 2 + col * (G.chip.w + G.chip.gx); c.ty = b.y + G.chip.top + G.chip.h / 2 + row * (G.chip.h + G.chip.gy);
        c.tw = G.chip.w; c.th = G.chip.h; c.free = false;
      });
    });
    z.cards.forEach((c) => { if (!c.bin) { c.tx = c.hx; c.ty = c.hy; c.tw = G.full.w; c.th = G.full.h; } });
  }
  function sortDrop(c) {
    S.drag = null;
    const z = S.sort[c.key], b = z.bins.find((bb) => c.x >= bb.x && c.x <= bb.x + bb.w && c.y >= bb.y && c.y <= bb.y + bb.h);
    c.bad = false; z.ok = false;
    if (b) { c.bin = b.id; c.seq = ++z.seq; Sound.tick(); parts.burst(c.x, c.y, { count: 5, speed: 60, size: 2.5, life: 0.4, gravity: 0, colors: ['#93c5fd', '#fff'] }); }
    else c.bin = null;
    sortLayout(z); SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
  }
  function sortReset(key) { const z = sortInit(key); sortLayout(z); }
  function sortCheck(key) {
    const z = S.sort[key], un = z.cards.filter((c) => !c.bin);
    if (un.length) return '아직 상자에 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
    const bad = z.cards.filter((c) => c.bin !== c.ans);
    bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
    if (bad.length) return '<b>' + bad.map((c) => c.t).join(', ') + '</b> 카드의 위치를 다시 생각해 보세요. (빨간 테두리)';
    z.cards.forEach((c) => { c.bad = false; });
    if (!z.ok) { z.ok = true; SciSim.tween(z, { okA: 1 }, { duration: 0.8 }); z.cards.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
    return true;
  }
  function drawSortBody(c, t, z) {
    const comp = clamp((z.G.full.w - c.w) / (z.G.full.w - z.G.chip.w), 0, 1);
    if (z.key === 'compare') {
      const s = lerp(PHONE ? 0.8 : 1, 0.4, comp), yoff = lerp(-18, -8, comp);
      ctx.save(); ctx.translate(0, yoff); ctx.scale(s, s);
      ctx.beginPath(); ctx.rect(-100, -52, 200, 104); ctx.clip(); SCN[c.id](t); ctx.restore();
      D.text(0, c.h / 2 - lerp(14, 8, comp), c.t, { size: lerp(16, 12.5, comp), weight: 800, color: '#1b2333' });
    } else {
      D.text(0, lerp(PHONE ? -30 : -34, -12, comp), c.ico, { size: lerp(PHONE ? 30 : 36, 22, comp) });
      D.text(0, lerp(PHONE ? 6 : 4, 22, comp), c.t, { size: lerp(16, 12.5, comp), weight: 800, color: '#1b2333' });
      if (comp < 0.55) paraText(0, lerp(PHONE ? 26 : 26, 40, comp), c.d, c.w - 26, 12.5, { align: 'center', color: '#5d6879', alpha: 1 - comp * 1.8 });
    }
  }
  function drawSort(key, t) {
    const z = S.sort[key];
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    z.bins.forEach((b) => {
      const hit = S.drag && S.drag.c.key === key && S.drag.c.x >= b.x && S.drag.c.x <= b.x + b.w && S.drag.c.y >= b.y && S.drag.c.y <= b.y + b.h;
      panel(b.x, b.y, b.w, b.h, hit ? '#eef4ff' : '#fff', z.ok ? '#14a058' : hit ? b.col : null);
      ctx.fillStyle = b.col; ctx.globalAlpha = 0.14; rr(b.x, b.y, b.w, 44, 16).fill(); ctx.globalAlpha = 1;
      D.text(b.x + 16, b.y + 28, b.label, { size: 17, weight: 800, color: b.col, align: 'left' });
      D.text(b.x + b.w - 16, b.y + 28, b.sub, { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
      if (key === 'compare') {
        // 머리말 그래프: 연속 곡선 / 계단
        const gx = b.x + b.w - (PHONE ? 70 : 62) - 130 * 0, gy = b.y + 22;
        ctx.save(); ctx.strokeStyle = b.col; ctx.lineWidth = 2.5; ctx.beginPath();
        const x0 = b.x + (PHONE ? 150 : 104), w = PHONE ? 70 : 62;
        if (b.id === 'a') for (let i = 0; i <= 30; i++) { const x = x0 + w * i / 30, y = gy - 9 * Math.sin(i / 30 * 6.28 - t * 2); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        else for (let i = 0; i < 6; i++) { const y = gy - 9 * Math.round(Math.sin(i / 6 * 6.28 - t * 2) * 2) / 2; ctx.moveTo(x0 + w * i / 6, y); ctx.lineTo(x0 + w * (i + 1) / 6, y); if (i < 5) { const y2 = gy - 9 * Math.round(Math.sin((i + 1) / 6 * 6.28 - t * 2) * 2) / 2; ctx.lineTo(x0 + w * (i + 1) / 6, y2); } }
        ctx.stroke(); ctx.restore();
      }
      const n = z.cards.filter((c) => c.bin === b.id).length;
      if (!n) D.text(b.x + b.w / 2, b.y + b.h / 2 + 22, '여기에 카드를 놓아요', { size: 14, weight: 700, color: '#cbd5e1' });
    });
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(6, z.G.trayY - 6, VW - 12, VH - z.G.trayY, 14).fill();
    z.cards.forEach((c) => {
      const end = cardBox(c, { stroke: c.bad ? '#e2464b' : z.ok && c.bin ? '#14a058' : c.bin ? (z.bins.find((b) => b.id === c.bin) || {}).col : '#cbd5e1', sw: c.bin ? 2.5 : 2 });
      drawSortBody(c, t, z);
      end();
    });
  }

  /* ======================================================
     화면 2: 표본화와 양자화
     ====================================================== */
  const sigV = (t) => 3.5 + 2.9 * Math.sin(TAU * t / 4) + 0.4 * Math.sin(TAU * 3 * t / 4 + 1.6);
  const Lv = () => 1 << S.smp.bits, stepV = () => 7 / (Lv() - 1);
  const qIdx = (v) => Math.round(clamp(v, 0, 7) / stepV());
  function smpRebuild(keep) {
    const m = S.smp, old = {}; m.dots.forEach((d) => { old[d.t.toFixed(2)] = d; });
    const n = Math.round(4 / m.dt); const dots = [];
    for (let i = 0; i <= n; i++) {
      const t = i * m.dt, v = sigV(t), k = old[t.toFixed(2)];
      dots.push({ t, v, qd: k && keep ? k.qd : v, born: k && keep ? 1 : 0, q: qIdx(v) * stepV(), idx: qIdx(v) });
    }
    m.dots = dots;
    // 오차(평균 |원래 − 복원| / 7)
    let s = 0, c = 0; for (let t = 0; t < 4; t += 0.02) { const k = Math.min(n - 1, Math.floor(t / m.dt + 1e-9)), f = (t - k * m.dt) / m.dt; s += Math.abs(sigV(t) - (dots[k].q + (dots[k + 1].q - dots[k].q) * f)); c++; }
    m.err = s / c / 7 * 100;
  }
  function stepSmp(dt) {
    const m = S.smp;
    m.dots.forEach((d) => { d.born = RM ? 1 : SciSim.approach(d.born, 1, dt, 5); d.qd = RM ? d.q : SciSim.approach(d.qd, d.q, dt, 6); if (Math.abs(d.qd - d.q) < 0.002) d.qd = d.q; });
    m.errDisp = RM ? m.err : SciSim.approach(m.errDisp, m.err, dt, 6);
  }
  const SL = () => PHONE ? { g: { x: 16, y: 16, w: 568, h: 372 }, a: { x: 16, y: 402, w: 568, h: 108 }, b: { x: 16, y: 520, w: 568, h: 108 }, c: { x: 16, y: 638, w: 568, h: 186 } }
    : { g: { x: 16, y: 16, w: 768, h: 318 }, a: { x: 16, y: 346, w: 244, h: 198 }, b: { x: 272, y: 346, w: 244, h: 198 }, c: { x: 528, y: 346, w: 256, h: 198 } };
  function drawSample(t) {
    const m = S.smp, L = SL(), g = L.g;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(g.x, g.y, g.w, g.h);
    const gx = g.x + 48, gy = g.y + 40, gw = g.w - 48 - 56, gh = g.h - 40 - 38;
    const X = (tt) => gx + tt / 4 * gw, Yv = (v) => gy + gh - v / 7 * gh;
    D.text(g.x + 16, g.y + 26, '센서의 아날로그 신호 → 표본화 → 양자화', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(gx, gy, gw, gh);
    // 양자화 단계선
    const L2 = Lv(), st = stepV();
    for (let k = 0; k < L2; k++) {
      const y = Yv(k * st); ctx.strokeStyle = L2 <= 8 ? '#cfd8e6' : '#e3e9f2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      if (L2 <= 8 || k % 2 === 0) D.text(gx + gw + 10, y + 4, String(k), { size: 12, weight: 800, color: '#f26b3a', align: 'left' });
    }
    D.text(gx + gw + 10, gy - 10, '단계', { size: 12, weight: 800, color: '#f26b3a', align: 'left' });
    for (let k = 0; k <= 4; k++) { ctx.strokeStyle = '#e6ebf3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(k), gy); ctx.lineTo(X(k), gy + gh); ctx.stroke(); D.text(X(k), gy + gh + 18, k + ' s', { size: 12.5, weight: 700, color: '#64748b' }); }
    [0, 2, 4, 6].forEach((v) => D.text(gx - 8, Yv(v) + 4, v + '', { size: 12.5, weight: 700, color: '#64748b', align: 'right' }));
    D.text(gx - 8, gy - 10, 'V', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    // 원래(아날로그) 파형
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy - 6, gw, gh + 12); ctx.clip();
    ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= gw; i += 2) { const tt = i / gw * 4, x = gx + i, y = Yv(sigV(tt)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    // 복원 파형(주황) + 오차 띠
    const ds = m.dots;
    ctx.fillStyle = 'rgba(242,107,58,.13)';
    ctx.beginPath(); for (let i = 0; i <= gw; i += 3) { const tt = i / gw * 4, k = Math.min(ds.length - 2, Math.floor(tt / m.dt + 1e-9)), f = (tt - k * m.dt) / m.dt, v = ds[k].qd + (ds[k + 1].qd - ds[k].qd) * f; i ? ctx.lineTo(gx + i, Yv(v)) : ctx.moveTo(gx + i, Yv(v)); }
    for (let i = gw; i >= 0; i -= 3) ctx.lineTo(gx + i, Yv(sigV(i / gw * 4)));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath(); ds.forEach((d, i) => { const x = X(d.t), y = Yv(d.qd); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.restore();
    // 표본점
    ds.forEach((d, i) => {
      const x = X(d.t), a = clamp(d.born, 0, 1), big = (m.focus && Math.abs(d.t - 1) < 1e-6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, gy + gh); ctx.lineTo(x, Yv(d.v)); ctx.stroke(); ctx.setLineDash([]);
      if (Math.abs(d.qd - d.v) > 0.03) { ctx.strokeStyle = 'rgba(226,70,75,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, Yv(d.v)); ctx.lineTo(x, Yv(d.qd)); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, Yv(d.v), big ? 7 : 5, 0, 6.3); ctx.fill(); ctx.stroke();
      D.sphere(x, Yv(d.qd), big ? 7.5 : 5.5, '#f26b3a', { outline: '#fff', outlineWidth: 1.5 });
      ctx.restore();
      if (big) { D.ring(x, Yv(d.v), 17, t, { color: '#14a058', speed: 1, width: 3 }); D.label(x + 14, Yv(d.v) - 20, 't = 1 s · 전압 약 ' + d.v.toFixed(1) + ' V', { bg: '#14a058', size: 13, align: 'left' }); }
    });
    D.label(gx + 10, gy + 14, '● 원래 신호', { bg: '#3867f4', size: 12.5, align: 'left' }); D.label(gx + (PHONE ? 118 : 112), gy + 14, '● 복원한 신호', { bg: '#f26b3a', size: 12.5, align: 'left' });
    // 오차 meter
    const a = L.a;
    panel(a.x, a.y, a.w, a.h);
    D.text(a.x + 16, a.y + 26, '원래 파형과의 차이(오차)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const bw = a.w - 36, ok = m.err <= 3.0;
    ctx.fillStyle = '#e8edf4'; rr(a.x + 18, a.y + (PHONE ? 46 : 54), bw, 22, 11).fill();
    ctx.fillStyle = ok ? '#14a058' : m.err < 6 ? '#f59e0b' : '#e2464b'; rr(a.x + 18, a.y + (PHONE ? 46 : 54), Math.max(22, bw * clamp(m.errDisp / 12, 0, 1)), 22, 11).fill();
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(a.x + 18 + bw * 0.25, a.y + (PHONE ? 42 : 50)); ctx.lineTo(a.x + 18 + bw * 0.25, a.y + (PHONE ? 74 : 82)); ctx.stroke(); ctx.setLineDash([]);
    D.text(a.x + 18 + bw * 0.25, a.y + (PHONE ? 92 : 100), '목표 3 %', { size: 12, weight: 800, color: '#1b2333' });
    D.text(a.x + a.w / 2, a.y + (PHONE ? 70 : 140), m.errDisp.toFixed(1) + ' %', { size: PHONE ? 22 : 34, weight: 800, color: ok ? '#14a058' : '#1b2333', align: 'center', alpha: PHONE ? 0 : 1 });
    if (PHONE) D.text(a.x + a.w - 22, a.y + 26, m.errDisp.toFixed(1) + ' %', { size: 20, weight: 800, color: ok ? '#14a058' : '#1b2333', align: 'right' });
    else D.text(a.x + a.w / 2, a.y + 176, ok ? '✅ 원래 파형에 아주 가까워요' : '더 촘촘하게, 더 많은 단계로!', { size: 13, weight: 800, color: ok ? '#14a058' : '#64748b' });
    // 데이터 양
    const b = L.b, N = Math.round(4 / m.dt), bits = N * m.bits;
    panel(b.x, b.y, b.w, b.h);
    D.text(b.x + 16, b.y + 26, '디지털 데이터의 양', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(b.x + 16, b.y + (PHONE ? 54 : 60), '표본 ' + N + '개 × ' + m.bits + '비트', { size: 14.5, weight: 800, color: '#1b2333', align: 'left' });
    ctx.fillStyle = '#e8edf4'; rr(b.x + 16, b.y + (PHONE ? 66 : 76), b.w - 32, 18, 9).fill(); ctx.fillStyle = '#8b5cf6'; rr(b.x + 16, b.y + (PHONE ? 66 : 76), Math.max(18, (b.w - 32) * bits / 64), 18, 9).fill();
    D.text(b.x + 16, b.y + (PHONE ? 102 : 116), '= ' + bits + ' 비트 (' + (bits / 8) + ' 바이트)', { size: 14, weight: 800, color: '#8b5cf6', align: 'left' });
    if (!PHONE) paraText(b.x + 16, b.y + 148, '촘촘할수록 원래에 가까워지지만 데이터가 늘어요.', b.w - 32, 12.5, { color: '#64748b' });
    // 양자화 표
    const c = L.c;
    panel(c.x, c.y, c.w, c.h);
    D.text(c.x + 16, c.y + 26, Lv() + '단계 양자화 표', { size: 14, weight: 800, color: '#334155', align: 'left' });
    if (Lv() <= 8) {
      const rh = Math.min(20, (c.h - 56) / Lv());
      const ful = m.dots.find((d) => Math.abs(d.t - 1) < 1e-6);
      for (let k = 0; k < Lv(); k++) {
        const y = c.y + 40 + k * rh, hit = m.focus && ful && ful.idx === k;
        ctx.fillStyle = hit ? '#dcfce7' : k % 2 ? '#f8fafc' : '#fff'; ctx.fillRect(c.x + 12, y, c.w - 24, rh);
        D.text(c.x + 24, y + rh / 2 + 5, '단계 ' + k, { size: 13, weight: 800, color: '#f26b3a', align: 'left' });
        D.text(c.x + c.w - 24, y + rh / 2 + 5, (k * stepV()).toFixed(2).replace(/\.00$/, '') + ' V', { size: 13, weight: 800, color: '#1b2333', align: 'right' });
      }
    } else paraText(c.x + 16, c.y + 54, '0단계 ~ 15단계, 한 단계 간격 ' + stepV().toFixed(2) + ' V. 값을 가장 가까운 단계로 반올림해요.', c.w - 32, 13.5, { color: '#475569' });
  }

  /* ======================================================
     화면 3: 이진 부호
     ====================================================== */
  const BL = () => PHONE ? { tgt: { x: 16, y: 14, w: 568, h: 56 }, sw: { x0: 16, y: 80, w: 70, h: 150 }, buf: { x: 16, y: 240, w: 568, h: 40 }, lanes: [{ y: 290, h: 262 }, { y: 560, h: 262 }], win: { w: 130, h: 98, x0: 10, gap: 16.7 } }
    : { tgt: { x: 24, y: 22, w: 176, h: 168 }, sw: { x0: 214, y: 22, w: 70, h: 168 }, buf: { x: 16, y: 206, w: 768, h: 40 }, lanes: [{ y: 254, h: 144 }, { y: 402, h: 144 }], win: { w: 168, h: 62, x0: 16, gap: 32 } };
  const TARGETS = [5, 6, 3], CODES = ['101', '110', '011', '001'];
  const BITS12 = '101110011001'.split('').map(Number);
  const NW = 96;
  const NZ = [0, 1, 2, 3].map((k) => Array.from({ length: NW }, (_, i) => hash(k * 331 + i * 1.7 + 11)));
  const aSig = (x) => 0.5 + 0.34 * Math.sin(TAU * 1.5 * x + 0.4) + 0.12 * Math.sin(TAU * 4 * x);
  function bnVal() { return S.bn.bits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0); }
  function bnToggle(i) { const B = S.bn; if (B.rest > 0) return; B.bits[i] ^= 1; Sound.tick(); B.popT = 0.25; }
  function stepBin(dt) {
    const B = S.bn;
    for (let i = 0; i < 8; i++) B.knob[i] = RM ? B.bits[i] : SciSim.approach(B.knob[i], B.bits[i], dt, 16);
    if (B.rest > 0) { B.rest -= dt; if (B.rest <= 0) { B.bits.fill(0); } return; }
    if (B.idx < 3) {
      if (bnVal() === TARGETS[B.idx]) { B.hold += dt; if (B.hold > 0.5) { B.hold = 0; B.buf.push({ v: TARGETS[B.idx], code: CODES[B.idx] }); B.idx++; Sound.success(); const L = BL(); parts.burst(L.buf.x + 80 + B.buf.length * 110, L.buf.y + 20, { count: 14, speed: 150, size: 3.5, life: 0.8 }); B.rest = B.idx < 3 ? 0.7 : 0; if (B.idx >= 3) B.bits.fill(0); } }
      else B.hold = 0;
    }
    B.popT = Math.max(0, B.popT - dt);
  }
  let runCache = null;
  function bnRun() {
    const B = S.bn, A = B.noise;
    if (runCache && runCache.A === A) return runCache.out;
    const out = { an: [], di: [], aErr: 0, dErr: 0 };
    // 아날로그
    for (let k = 0; k < 4; k++) { const arr = []; for (let i = 0; i < NW; i++) { let v = aSig(i / (NW - 1)); for (let j = 1; j <= k; j++) v += A * 0.62 * NZ[j][i]; arr.push(v); } out.an.push(arr); }
    out.aErr = out.an[3].reduce((s, v, i) => s + Math.abs(v - aSig(i / (NW - 1))), 0) / NW * 100;
    // 디지털
    let reg = []; for (let i = 0; i < NW; i++) reg.push(BITS12[Math.floor(i / 8)]);
    out.di.push({ sig: reg.slice(), dec: BITS12.slice() });
    for (let k = 1; k <= 3; k++) {
      const rcv = reg.map((v, i) => v + A * NZ[k][(i * 7 + k * 13) % NW]);
      const dec = BITS12.map((_, b) => (rcv[b * 8 + 4] > 0.5 ? 1 : 0));
      out.di.push({ sig: rcv, dec });
      reg = reg.map((_, i) => dec[Math.floor(i / 8)]);
    }
    out.dErr = out.di[3].dec.reduce((s, v, b) => s + (v !== BITS12[b] ? 1 : 0), 0);
    runCache = { A, out };
    return out;
  }
  function drawBinary(t) {
    const B = S.bn, L = BL();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    // 목표 + 스위치
    const val = bnVal(), tg = B.idx < 3 ? TARGETS[B.idx] : null;
    if (!PHONE) {
      const q = L.tgt; panel(q.x, q.y, q.w, q.h);
      D.text(q.x + q.w / 2, q.y + 28, tg != null ? '이 수를 만들어요' : '✅ 모두 만들었어요', { size: 14.5, weight: 800, color: '#334155' });
      D.text(q.x + q.w / 2, q.y + 88, tg != null ? String(tg) : '5·6·3', { size: tg != null ? 58 : 34, weight: 800, color: tg != null ? '#3867f4' : '#14a058' });
      D.text(q.x + q.w / 2, q.y + 124, '스위치가 나타내는 수', { size: 12.5, weight: 700, color: '#64748b' });
      D.text(q.x + q.w / 2, q.y + 154, String(val), { size: 28, weight: 800, color: val === tg ? '#14a058' : '#1b2333' });
    } else {
      const q = L.tgt; panel(q.x, q.y, q.w, q.h);
      D.text(q.x + 18, q.y + 34, tg != null ? '만들 수  ' + tg : '✅ 5·6·3을 모두 만들었어요', { size: 22, weight: 800, color: tg != null ? '#3867f4' : '#14a058', align: 'left' });
      D.text(q.x + q.w - 18, q.y + 34, '지금 ' + val, { size: 22, weight: 800, color: val === tg ? '#14a058' : '#1b2333', align: 'right' });
    }
    const sw = L.sw;
    panel(PHONE ? 16 : sw.x0 - 8, sw.y, PHONE ? 568 : 574, sw.h);
    for (let i = 0; i < 8; i++) {
      const cx = (PHONE ? 16 + 12 : sw.x0 + 2) + i * (sw.w + (PHONE ? -2 : 0)) + sw.w / 2 - (PHONE ? 4 : 0), top = sw.y + 42, trackH = PHONE ? 66 : 70, k = B.knob[i];
      D.text(cx, sw.y + 26, String(Math.pow(2, 7 - i)), { size: 15, weight: 800, color: '#475569' });
      ctx.fillStyle = k > 0.5 ? '#dbe7ff' : '#e8edf4'; rr(cx - 17, top, 34, trackH, 17).fill(); ctx.strokeStyle = k > 0.5 ? '#3867f4' : '#cbd5e1'; ctx.lineWidth = 2.5; rr(cx - 17, top, 34, trackH, 17).stroke();
      const ky = top + trackH - 17 - k * (trackH - 34);
      D.sphere(cx, ky, 15, k > 0.5 ? '#3867f4' : '#94a3b8');
      D.text(cx, ky + 5, k > 0.5 ? '1' : '0', { size: 15, weight: 800, color: '#fff' });
      D.text(cx, top + trackH + 22, '2' + '⁰¹²³⁴⁵⁶⁷'[7 - i], { size: 13, weight: 800, color: '#64748b' });
      if (B.popT > 0 && false) D.ring(cx, ky, 20, t, { color: '#3867f4' });
    }
    // 보낼 부호
    const bf = L.buf; panel(bf.x, bf.y, bf.w, bf.h, '#fff');
    D.text(bf.x + 14, bf.y + 26, '📦 보낼 부호:', { size: 14, weight: 800, color: '#334155', align: 'left' });
    for (let k = 0; k < 4; k++) {
      const b = B.buf[k], x = bf.x + (PHONE ? 110 : 118) + k * (PHONE ? 112 : 150);
      ctx.fillStyle = b ? '#ecfdf3' : '#f8fafc'; ctx.strokeStyle = b ? '#14a058' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, bf.y + 6, PHONE ? 104 : 140, 28, 8).fill(); rr(x, bf.y + 6, PHONE ? 104 : 140, 28, 8).stroke();
      D.text(x + (PHONE ? 52 : 70), bf.y + 26, b ? b.v + ' → ' + b.code : k === 3 ? '1 → 001' : '?', { size: 14, weight: 800, color: b ? '#0b6b39' : k === 3 ? '#94a3b8' : '#cbd5e1' });
    }
    // 전송 비교
    const run = bnRun(), W = L.win, names = ['보내는 쪽', '중계 ①', '중계 ②', '받는 쪽'];
    [['an', '아날로그 전송 (파형 그대로)', '#3867f4', L.lanes[0]], ['di', '디지털 전송 (0과 1)', '#f26b3a', L.lanes[1]]].forEach(([kind, title, col, ln]) => {
      panel(PHONE ? 10 : 8, ln.y, PHONE ? 580 : 784, ln.h - 6);
      D.text(22, ln.y + 24, title, { size: 15, weight: 800, color: col, align: 'left' });
      if (!PHONE) D.text(22 + 205, ln.y + 24, kind === 'an' ? '중계할 때마다 잡음이 쌓여요' : '기준선을 넘는지로 0과 1을 다시 만들어요', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
      const verdict = kind === 'an' ? '받은 신호가 원래와 ' + run.aErr.toFixed(0) + ' % 달라요' : (run.dErr === 0 ? '✅ 틀린 비트 0개 (완벽하게 복원)' : '❌ 틀린 비트 ' + run.dErr + '개');
      D.label((PHONE ? 580 : 780) - 6, ln.y + 22, verdict, { bg: kind === 'an' ? (run.aErr < 1 ? '#14a058' : '#e2464b') : (run.dErr === 0 ? '#14a058' : '#e2464b'), size: 12.5, align: 'right' });
      for (let k = 0; k < 4; k++) {
        const wx = W.x0 + k * (W.w + W.gap), wy = ln.y + (PHONE ? 70 : 54);
        D.text(wx + W.w / 2, wy - 8, names[k], { size: 12.5, weight: 800, color: '#64748b' });
        ctx.fillStyle = '#f8fafc'; rr(wx, wy, W.w, W.h, 8).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; rr(wx, wy, W.w, W.h, 8).stroke();
        if (kind === 'an') {
          ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, W.w, W.h); ctx.clip();
          ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); for (let i = 0; i < NW; i++) { const x = wx + 6 + (W.w - 12) * i / (NW - 1), y = wy + W.h - 8 - aSig(i / (NW - 1)) * (W.h - 16); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); run.an[k].forEach((v, i) => { const x = wx + 6 + (W.w - 12) * i / (NW - 1), y = wy + W.h - 8 - v * (W.h - 16); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
          const df = run.an[k].reduce((s, v, i) => s + Math.abs(v - aSig(i / (NW - 1))), 0) / NW * 100;
          D.text(wx + W.w / 2, wy + W.h + 18, k === 0 ? '원래 신호' : '차이 ' + df.toFixed(0) + ' %', { size: 13, weight: 800, color: k === 0 ? '#64748b' : df < 1 ? '#14a058' : '#e2464b' });
        } else {
          const d = run.di[k];
          ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, W.w, W.h); ctx.clip();
          const Yb = (v) => wy + W.h - 8 - ((clamp(v, -0.5, 1.5) + 0.5) / 2) * (W.h - 16);
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(wx, Yb(0.5)); ctx.lineTo(wx + W.w, Yb(0.5)); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath(); d.sig.forEach((v, i) => { const x = wx + 6 + (W.w - 12) * i / (NW - 1), y = Yb(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
          if (k === 0) D.text(wx + W.w - 6, Yb(0.5) - 4, '기준선', { size: 11, weight: 700, color: '#64748b', align: 'right' });
          // 복원된 비트 줄
          const bw = (W.w - 6) / 12;
          for (let b = 0; b < 12; b++) { const bad = d.dec[b] !== BITS12[b]; D.text(wx + 3 + bw * (b + 0.5), wy + W.h + 17, String(d.dec[b]), { size: PHONE ? 10.5 : 12.5, weight: 800, color: bad ? '#e2464b' : '#0b6b39' }); }
        }
        if (k < 3) {
          const ax = wx + W.w + 2, bx = wx + W.w + W.gap - 2, ay = wy + W.h / 2;
          D.arrow(ax, ay, bx, ay, { color: '#cbd5e1', width: 3, head: 9 });
          const p = (t * 0.7 + k * 0.33) % 1;
          if (kind === 'an') { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -4; i <= 4; i++) { const xx = ax + (bx - ax) * p + i, yy = ay + Math.sin(i * 1.2 + t * 12) * 5; i === -4 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke(); }
          else D.text(ax + (bx - ax) * p, ay + 5, BITS12[Math.floor(t * 3 + k) % 12] + '', { size: 14, weight: 800, color: col });
        }
      }
    });
  }

  /* ======================================================
     화면 4: 그림 보내기 (8×8)
     ====================================================== */
  const HEART = ['00000000', '01100110', '11111111', '11111111', '01111110', '00111100', '00011000', '00000000'].join('').split('').map(Number);
  const PX = () => PHONE ? { c: 52, gx: 76, gy: 190, p1: { x: 40, y: 56, c: 12 }, p2: { x: 464, y: 56, c: 12 } }
    : { c: 40, gx: 238, gy: 96, p1: { x: 40, y: 150, c: 15 }, p2: { x: 640, y: 150, c: 15 } };
  function pxInit() { const p = S.px; p.bits = Array(64).fill(0); p.recv = Array(64).fill(null); p.pop = Array(64).fill(1); p.send = -1; p.sent = false; p.sentBits = null; p.paint = null; p.flash = []; }
  function pxSend() {
    const p = S.px; if (p.send >= 0 && p.send < 1) return;
    p.recv = Array(64).fill(null); p.pop = Array(64).fill(0); p.send = 0; p.sentBits = p.bits.slice(); p.sent = false; Sound.click();
  }
  function stepPx(dt) {
    const p = S.px;
    if (p.send >= 0 && p.send < 1) {
      const prev = p.send; p.send = Math.min(1, p.send + dt * SPEED / (RM ? 0.5 : 3.6));
      for (let i = 0; i < 64; i++) { const arr = i / 64 * 0.86 + 0.14; if (prev < arr && p.send >= arr) { p.recv[i] = p.sentBits[i]; p.pop[i] = 0; if (i % 8 === 7) Sound.tick(); } }
      if (p.send >= 1) { p.sent = true; Sound.success(); for (let i = 0; i < 64; i++) if (p.recv[i] == null) p.recv[i] = p.sentBits[i]; const Q = PX(); parts.burst(Q.p2.x + 4 * Q.p2.c, Q.p2.y + 4 * Q.p2.c, { count: 16, speed: 150, size: 3.5, life: 0.8 }); }
    }
    for (let i = 0; i < 64; i++) p.pop[i] = Math.min(1, p.pop[i] + dt * 4);
  }
  function drawPicture(x, y, c, arr, t, o) {
    o = o || {};
    ctx.fillStyle = '#fff'; rr(x - 6, y - 6, c * 8 + 12, c * 8 + 12, 8).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(x - 6, y - 6, c * 8 + 12, c * 8 + 12, 8).stroke();
    for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) {
      const i = r * 8 + q, v = arr[i];
      ctx.fillStyle = '#eef2f7'; ctx.fillRect(x + q * c + 0.5, y + r * c + 0.5, c - 1, c - 1);
      if (v === 1) { const s = o.pop ? SciSim.ease.outBack(clamp(o.pop[i], 0, 1)) : 1; ctx.fillStyle = '#1f2937'; ctx.fillRect(x + q * c + 0.5 + (c - 1) * (1 - s) / 2, y + r * c + 0.5 + (c - 1) * (1 - s) / 2, (c - 1) * s, (c - 1) * s); }
      else if (v === 0 && o.pop && o.pop[i] < 1) { ctx.fillStyle = 'rgba(56,103,244,' + (1 - o.pop[i]) * 0.5 + ')'; ctx.fillRect(x + q * c + 0.5, y + r * c + 0.5, c - 1, c - 1); }
    }
  }
  function drawPixel(t) {
    const p = S.px, Q = PX();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    const c = Q.c, gx = Q.gx, gy = Q.gy;
    // 그림들
    drawPicture(Q.p1.x, Q.p1.y, Q.p1.c, HEART, t);
    D.text(Q.p1.x + Q.p1.c * 4, Q.p1.y - 16, '🖼️ 보내는 그림', { size: 14, weight: 800, color: '#334155' });
    drawPicture(Q.p2.x, Q.p2.y, Q.p2.c, p.recv.map((v) => (v == null ? -1 : v)), t, { pop: p.pop });
    D.text(Q.p2.x + Q.p2.c * 4, Q.p2.y - 16, '📥 받은 그림', { size: 14, weight: 800, color: '#334155' });
    if (p.recv.every((v) => v == null)) D.text(Q.p2.x + Q.p2.c * 4, Q.p2.y + Q.p2.c * 4 + 5, '송신 전', { size: 14, weight: 700, color: '#94a3b8' });
    // 비트 격자
    panel(gx - 12, gy - 12, c * 8 + 24 + (PHONE ? 0 : 50), c * 8 + 24);
    D.text(gx + c * 4, gy - 22 - (PHONE ? 6 : 0), '0과 1로 부호화 (검은 칸 = 1)', { size: 14, weight: 800, color: '#334155' });
    ctx.font = D.font(17, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let r = 0; r < 8; r++) {
      for (let q = 0; q < 8; q++) {
        const i = r * 8 + q, v = p.bits[i], x = gx + q * c, y = gy + r * c;
        ctx.fillStyle = v ? '#1f2937' : '#fff'; rr(x + 2, y + 2, c - 4, c - 4, 6).fill(); ctx.strokeStyle = v ? '#1f2937' : '#cbd5e1'; ctx.lineWidth = 1.5; rr(x + 2, y + 2, c - 4, c - 4, 6).stroke();
        ctx.fillStyle = v ? '#fff' : '#94a3b8'; ctx.fillText(v ? '1' : '0', x + c / 2, y + c / 2 + 6);
      }
      const byte = p.bits.slice(r * 8, r * 8 + 8).reduce((a, b) => a * 2 + b, 0);
      if (!PHONE) D.text(gx + c * 8 + 8, gy + r * c + c / 2 + 5, '= ' + byte, { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    }
    if (!PHONE) D.text(gx + c * 8 + 36, gy - 22, '10진수', { size: 11.5, weight: 700, color: '#94a3b8' });
    const same = p.bits.reduce((n, v, i) => n + (v === HEART[i] ? 1 : 0), 0);
    D.label(gx + c * 4, gy + c * 8 + (PHONE ? 38 : 34), '한 줄 8비트 = 1바이트 · 전체 64비트 = 8바이트', { bg: '#1b2333', size: 13 });
    D.label(gx + c * 4, gy + c * 8 + (PHONE ? 74 : 66), '그림과 같은 칸 ' + same + ' / 64', { bg: same === 64 ? '#14a058' : '#64748b', size: 13 });
    // 날아가는 비트
    if (p.send >= 0 && p.send < 1) {
      for (let i = 0; i < 64; i++) {
        const st = i / 64 * 0.86, f = (p.send - st) / 0.14;
        if (f < 0 || f > 1) continue;
        const r = Math.floor(i / 8), q = i % 8, x0 = gx + q * c + c / 2, y0 = gy + r * c + c / 2, x1 = Q.p2.x + q * Q.p2.c + Q.p2.c / 2, y1 = Q.p2.y + r * Q.p2.c + Q.p2.c / 2;
        const e = SciSim.ease.inOutCubic(f), x = lerp(x0, x1, e), y = lerp(y0, y1, e) - Math.sin(e * Math.PI) * 26;
        D.sphere(x, y, 9, p.sentBits[i] ? '#1f2937' : '#fff', { outline: '#3867f4', outlineWidth: 2, gloss: false });
        D.text(x, y + 4.5, String(p.sentBits[i]), { size: 12, weight: 800, color: p.sentBits[i] ? '#fff' : '#64748b' });
      }
      if (!PHONE) D.arrow(gx + c * 8 + 56, gy + c * 4, Q.p2.x - 10, gy + c * 4, { color: '#3867f4', width: 3, head: 10, alpha: 0.5 });
    }
  }

  /* ---------- 입력 ---------- */
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }
  const sortKey = () => (S.mode === 'compare' ? 'compare' : S.mode === 'cards' ? 'cards' : null);
  function pxCell(p) { const Q = PX(), q = Math.floor((p.x - Q.gx) / Q.c), r = Math.floor((p.y - Q.gy) / Q.c); return q >= 0 && q < 8 && r >= 0 && r < 8 ? r * 8 + q : -1; }
  function bnHit(p) { const L = BL(), sw = L.sw; for (let i = 0; i < 8; i++) { const cx = (PHONE ? 16 + 12 : sw.x0 + 2) + i * (sw.w + (PHONE ? -2 : 0)) + sw.w / 2 - (PHONE ? 4 : 0); if (Math.abs(p.x - cx) <= sw.w / 2 && p.y >= sw.y && p.y <= sw.y + sw.h) return i; } return -1; }
  SciSim.pointer(view, {
    down(p) {
      const key = sortKey();
      if (key) { const z = S.sort[key], c = pickItem(p, z.cards); if (!c) return false; if (c.bin) { c.bin = null; sortLayout(z); } dragStart(c, p, z.cards); return true; }
      if (S.mode === 'binary') { const i = bnHit(p); if (i >= 0) { bnToggle(i); return true; } return false; }
      if (S.mode === 'pixel') { const i = pxCell(p); if (i >= 0) { const v = S.px.bits[i] ^ 1; S.px.bits[i] = v; S.px.paint = v; Sound.tick(); S.px.sent = false; return true; } return false; }
      return false;
    },
    move(p) {
      const key = sortKey(); if (key && S.drag) { S.drag.c.x = p.x - S.drag.ox; S.drag.c.y = p.y - S.drag.oy; return; }
      if (S.mode === 'pixel' && S.px.paint != null) { const i = pxCell(p); if (i >= 0 && S.px.bits[i] !== S.px.paint) { S.px.bits[i] = S.px.paint; Sound.tick(); S.px.sent = false; } }
    },
    up(p) {
      const key = sortKey(); if (key && S.drag) { const c = S.drag.c; c.x = p.x - S.drag.ox; c.y = p.y - S.drag.oy; sortDrop(c); return; }
      S.px.paint = null;
    },
    hover(p) { const key = sortKey(); if (key) return pickItem(p, S.sort[key].cards) ? 'grab' : 'default'; if (S.mode === 'binary') return bnHit(p) >= 0 ? 'pointer' : 'default'; if (S.mode === 'pixel') return pxCell(p) >= 0 ? 'pointer' : 'default'; return 'default'; },
  });

  /* ---------- 컨트롤 ---------- */
  const MODE_LABEL = { compare: '🕰️ 아날로그와 디지털 · 분류하기', sample: '📈 표본화·양자화 · 조절하기', binary: '🔢 이진 부호 · 전송 비교', pixel: '🖼️ 그림을 0과 1로 보내기', cards: '🌐 통신과 문명 · 분류하기' };
  const modeSeg = $('#modeSeg');
  let smpSub = ['int', 'bit'];
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; S.drag = null; updateCtl(); const hh = $('#stageHint'); if (hh) hh.classList.add('hide'); }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
    if (S.mode === 'sample') { const free = game && game.free; $$('#ctrlCard [data-modes="sample"]').forEach((c) => { c.hidden = !(free ? ['int', 'bit'].indexOf(c.dataset.sub) >= 0 : smpSub.indexOf(c.dataset.sub) >= 0); }); }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bSortReset').addEventListener('click', () => { Sound.click(); const k = sortKey(); if (k) sortReset(k); });
  function segBind(sel, out, fn) { $$(sel + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); $$(sel + ' button').forEach((x) => x.classList.toggle('on', x === b)); fn(+b.dataset.v); })); }
  const outInt = $('#oInt'), outBit = $('#oBit');
  function setInt(v) { S.smp.dt = v; outInt.textContent = v + ' s'; $$('#intSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.v === v)); smpRebuild(true); }
  function setBits(v) { S.smp.bits = v; outBit.textContent = v + '비트 · ' + (1 << v) + '단계'; $$('#bitSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.v === v)); smpRebuild(true); }
  segBind('#intSeg', outInt, setInt); segBind('#bitSeg', outBit, setBits);
  SciSim.bindRange($('#sNoise'), $('#oNoise'), (v) => v + ' %', (v) => { S.bn.noise = v / 100; });
  $('#bBinReset').addEventListener('click', () => { Sound.click(); const B = S.bn; B.bits.fill(0); B.idx = 0; B.buf = []; B.hold = 0; B.rest = 0; });
  $('#bSend').addEventListener('click', pxSend);
  $('#bPxClear').addEventListener('click', () => { Sound.click(); const p = S.px; p.bits.fill(0); p.recv = Array(64).fill(null); p.send = -1; p.sent = false; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const key = sortKey();
    if (key) {
      const z = S.sort[key], n = z.cards.filter((x) => x.bin).length;
      L1 = '놓은 카드'; a = n + ' / ' + z.cards.length;
      if (key === 'compare') { L2 = '아날로그'; b = '값이 이어져 변해요'; L3 = '디지털'; c = '값이 단계로 있어요'; } else { L2 = '정보 통신'; b = '편리함이 커졌어요'; L3 = '함께 생각할 것'; c = '개인 정보·격차'; }
    } else if (S.mode === 'sample') {
      const m = S.smp; L1 = '표본 간격 · 비트'; a = m.dt + ' s · ' + m.bits + '비트'; L2 = '오차'; b = m.err.toFixed(1) + ' %'; L3 = '데이터 양'; c = Math.round(4 / m.dt) * m.bits + ' 비트';
    } else if (S.mode === 'binary') {
      const B = S.bn; L1 = '스위치가 나타내는 수'; a = bnVal() + ' (' + B.bits.join('') + ')'; L2 = '잡음'; b = Math.round(B.noise * 100) + ' %'; L3 = '만든 부호'; c = B.buf.length + ' / 3';
    } else {
      const p = S.px, same = p.bits.reduce((n, v, i) => n + (v === HEART[i] ? 1 : 0), 0); L1 = '그림과 같은 칸'; a = same + ' / 64'; L2 = '보낸 비트 수'; b = '64비트 = 8바이트'; L3 = '받은 칸'; c = p.recv.filter((x) => x != null).length + ' / 64';
    }
    const k = L1 + a + L2 + b + L3 + c; if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { sortReset('compare'); setMode('compare'); }
    else if (li === 1) { smpSub = ['int', 'bit']; S.smp.focus = false; setInt(1); setBits(2); S.smp.dots.forEach((d) => { d.qd = d.v; }); $('#inLevel').value = ''; setMode('sample'); }
    else if (li === 2) { const B = S.bn; B.bits.fill(0); B.idx = 0; B.buf = []; B.hold = 0; B.rest = 0; const s = $('#sNoise'); s.value = 0; s.dispatchEvent(new Event('input')); setMode('binary'); }
    else { pxInit(); sortReset('cards'); setMode('pixel'); }
  }
  function ensure(m) { if (S.mode !== m) setMode(m); }
  const SVG_FIG = '<svg viewBox="0 0 400 130" width="100%" role="img" aria-label="그래프 A는 부드럽게 이어진 곡선, 그래프 B는 계단 모양의 신호"><rect width="400" height="130" fill="#fff" rx="10"/>' +
    '<g transform="translate(14,16)"><text x="0" y="0" font-size="14" font-weight="800" fill="#3867f4">A</text><line x1="0" y1="96" x2="170" y2="96" stroke="#94a3b8" stroke-width="2"/><line x1="0" y1="8" x2="0" y2="96" stroke="#94a3b8" stroke-width="2"/><path d="M0 60 C 20 10, 40 10, 60 50 S 100 100, 125 50 S 155 20, 170 40" fill="none" stroke="#3867f4" stroke-width="3.5"/></g>' +
    '<g transform="translate(216,16)"><text x="0" y="0" font-size="14" font-weight="800" fill="#f26b3a">B</text><line x1="0" y1="96" x2="170" y2="96" stroke="#94a3b8" stroke-width="2"/><line x1="0" y1="8" x2="0" y2="96" stroke="#94a3b8" stroke-width="2"/><path d="M0 62 H28 V30 H56 V30 V46 H84 V84 H112 V62 H140 V38 H170" fill="none" stroke="#f26b3a" stroke-width="3.5"/></g></svg>';
  const levels = [
    {
      title: '아날로그와 디지털: 연속 vs 단계', short: '아날로그', icon: '🕰️', phase: '관찰',
      features: ['compare'],
      intro: '<p class="si-q">❓ 탐구 질문: 소리와 사진은 어떻게 0과 1로 바뀌어 전 세계로 전달될까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 센서가 자연의 변화를 시간에 따라 이어지는 전압 신호로 바꿔 준다는 것을 배웠어요. 이 신호를 컴퓨터가 다루려면 어떻게 바꿔야 할까요?</div>' +
        '<p>값이 <b>끊김 없이 이어져</b> 변하는 신호는 <b>아날로그</b>, <b>띄엄띄엄 정해진 단계</b>의 값만 가지는 신호는 <b>디지털</b>이에요. 사례 6가지를 상자에 나눠 담아 봐요.</p>',
      setup() { enterLevel(0); showHint('🃏 카드를 끌어 알맞은 상자에 놓아요', 6000); },
      recap: '아날로그는 값이 연속적으로 변하고, 디지털은 띄엄띄엄 정해진 단계의 값을 가져요.',
      summary: '<ul><li><b>아날로그</b>: 값이 끊김 없이 이어져 변해요. (바늘 시계, 경사로, LP판)</li><li><b>디지털</b>: 값이 띄엄띄엄 정해진 단계로만 있어요. (숫자 시계, 계단, 음원 파일)</li><li>센서가 만든 신호는 아날로그이고, 컴퓨터가 다루는 정보는 디지털이에요. → 아날로그 신호를 디지털로 <b>변환</b>해야 해요.</li></ul>',
      missions: [
        {
          title: '아날로그와 디지털 나누기',
          goal: '카드 <b>6장</b>을 <b>아날로그</b> 상자와 <b>디지털</b> 상자에 알맞게 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시곗바늘이 끊김 없이 도는지, 숫자가 뚝뚝 바뀌는지 살펴봐요. 경사로는 높이가 연속으로, 계단은 높이가 한 칸씩 변해요.',
          manual: true,
          setup() { ensure('compare'); },
          status: () => '놓은 카드 <b>' + S.sort.compare.cards.filter((c) => c.bin).length + ' / 6</b>',
          check: () => sortCheck('compare'),
          explain: '<b>아날로그</b>(바늘 시계·경사로·LP판)는 값이 끊김 없이 이어져 변하고, <b>디지털</b>(숫자 시계·계단·음원 파일)은 값이 띄엄띄엄 단계로 바뀌어요. 음원 파일은 소리를 0과 1로 바꿔 저장한 것이에요.',
        },
        {
          type: 'quiz', title: '디지털 신호 그래프 찾기',
          goal: '다음 두 그래프 중 <b>디지털 신호</b>를 나타낸 것은 어느 것일까요?',
          figure: SVG_FIG,
          setup() { ensure('compare'); },
          choices: ['A (부드럽게 이어진 곡선)', 'B (계단 모양)', 'A와 B 둘 다', 'A와 B 둘 다 아니다'],
          answer: 1,
          feedback: ['A는 값이 끊김 없이 이어져 변하는 <b>아날로그</b> 신호예요.', '', 'A는 값이 이어진 아날로그이고, 디지털은 B 하나뿐이에요.', 'B는 값이 정해진 단계로만 바뀌는 디지털 신호예요.'],
          explain: '디지털 신호는 값이 <b>띄엄띄엄(불연속) 정해진 단계</b>로 있어서 그래프가 계단 모양이에요. 연속적인 아날로그 신호를 디지털로 바꾸려면 시간과 값을 모두 단계로 나눠야 해요.',
        },
      ],
    },
    {
      title: '표본화와 양자화: 신호를 단계로 나눠요', short: '표본·양자', icon: '📈', phase: '실험',
      features: ['sample'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 디지털 신호는 띄엄띄엄 단계의 값을 가진다는 것을 알았어요. 연속 신호를 어떻게 단계로 바꿀까요?</div>' +
        '<p>① <b>표본화</b>: 일정한 <b>시간 간격</b>으로 값을 뽑아요. ② <b>양자화</b>: 뽑은 값을 가장 가까운 <b>단계</b>로 반올림해요. 표본 간격과 비트 수를 조절해 원래 파형에 얼마나 가까워지는지 봐요.</p>',
      setup() { enterLevel(1); showHint('⏱️ 표본 간격과 비트 수를 바꿔 봐요', 6000); },
      recap: '표본이 촘촘하고 단계가 많을수록 원래 파형에 가까워져요. 대신 데이터의 양이 늘어요.',
      summary: '<ul><li><b>표본화</b>: 일정한 시간 간격으로 신호의 값을 뽑는 것</li><li><b>양자화</b>: 뽑은 값을 가장 가까운 단계로 반올림하는 것 (n비트 → 2ⁿ단계: 3비트는 8단계 0~7)</li><li>표본 간격이 짧고 단계가 많을수록 원래 파형에 가까워져요. 표본을 줄이면 파형의 모양이 사라져요.</li><li>데이터 양 = 표본 수 × 비트 수 → 촘촘할수록 늘어나요.</li></ul>',
      missions: [
        {
          title: '원래 파형에 가깝게 만들기',
          goal: '표본 간격과 비트 수를 조절해서 <b>오차를 3 % 이하</b>로 줄여 보세요.',
          hint: '표본 간격을 0.5 s 또는 0.25 s로, 비트 수를 3비트 이상으로 하면 오차가 작아져요.',
          setup() { ensure('sample'); smpSub = ['int', 'bit']; updateCtl(); setInt(1); setBits(2); },
          check: () => S.smp.err <= 3.0, hold: 0.8,
          status: () => '오차 <b>' + S.smp.err.toFixed(1) + ' %</b> (목표 3 % 이하) · ' + S.smp.dt + ' s · ' + S.smp.bits + '비트',
          explain: '표본 간격이 짧으면 시간 방향으로 더 자세히 뽑고, 비트 수가 많으면 값을 더 잘게 나눠 반올림 오차가 줄어요. <b>0.5 s 이하 · 3비트 이상</b>이면 오차가 3 % 안팎까지 줄어요. 대신 데이터의 양은 늘어요.',
        },
        {
          title: '3비트 양자화 표 읽기',
          goal: '<b>3비트</b>, 표본 간격 <b>1 s</b>로 맞추고, <b>t = 1 s</b>일 때 센서 전압이 몇 <b>단계</b>가 되는지 입력하세요.',
          hint: 't = 1 s 표본의 원래 전압은 약 6.4 V예요. 3비트는 0, 1, 2, … 7 V의 8단계이니 가장 가까운 단계를 찾아요.',
          manual: true,
          setup() { ensure('sample'); smpSub = ['int', 'bit', 'lvl']; updateCtl(); setInt(1); setBits(3); S.smp.focus = true; showHint('🔍 초록 고리가 표시된 표본을 살펴봐요', 5000); },
          check() {
            if (S.smp.bits !== 3) return '비트 수를 <b>3비트</b>로 맞춰 주세요. (지금 ' + S.smp.bits + '비트)';
            if (S.smp.dt !== 1) return '표본 간격을 <b>1 s</b>로 맞춰 주세요.';
            const raw = $('#inLevel').value.trim(); if (!raw) return '단계 번호를 입력해 주세요.';
            const v = parseInt(raw, 10); if (!isFinite(v)) return '정수로 적어 주세요.';
            if (v === 6) return true;
            if (v === 7 || v === 5) return '6.4 V에서 가장 가까운 단계를 골라야 해요. 6.4는 6과 7 중 어느 쪽에 더 가까운가요?';
            return '표에서 6.4 V에 가장 가까운 전압(단계)을 찾아보세요.';
          },
          explain: 't = 1 s의 전압은 약 6.4 V예요. 3비트(8단계)의 단계 값은 0, 1, …, 7 V이고, 6.4 V는 7 V보다 <b>6 V에 더 가까워서 6단계</b>로 양자화돼요. (가장 가까운 단계로 반올림)',
        },
        {
          type: 'quiz', title: '표본을 줄이면?',
          goal: '표본 간격을 <b>길게</b>(표본의 수를 줄이면) 했을 때 일어나는 일은?',
          setup() { ensure('sample'); smpSub = ['int', 'bit']; updateCtl(); S.smp.focus = false; },
          choices: ['원래 파형과 더 비슷해진다', '원래 파형의 자세한 변화가 사라져 오차가 커진다', '데이터의 양이 늘어난다', '파형이 아날로그로 바뀐다'],
          answer: 1,
          feedback: ['표본이 적으면 점 사이를 대충 이어서 오히려 원래와 달라져요.', '', '표본이 적으면 데이터의 양은 오히려 줄어요.', '표본화는 아날로그를 디지털로 바꾸는 과정이에요.'],
          explain: '표본 간격을 길게 하면 신호의 자세한 변화를 놓쳐서 복원한 파형이 원래와 많이 달라져요. 대신 데이터의 양은 줄어요. 그래서 <b>충분히 촘촘하게 표본을 뽑는 것</b>이 중요해요.',
        },
      ],
    },
    {
      title: '이진 부호: 0과 1로 나타내요', short: '이진 부호', icon: '🔢', phase: '모형',
      features: ['binary'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신호를 단계(0~7)로 양자화했어요. 이제 이 단계 번호를 컴퓨터가 다루는 <b>0과 1</b>로 바꿔요. 이것을 <b>부호화</b>라고 해요.</div>' +
        '<p>스위치 8개는 각각 켜지면(1) 128, 64, 32, …, 1을 나타내요. 켜진 스위치의 값을 모두 더하면 수가 돼요. 예) 5 = 4 + 1 → <b>101</b>.</p>',
      setup() { enterLevel(2); showHint('🔢 스위치를 눌러 수를 만들어요', 6000); },
      recap: '값을 이진수 0과 1로 부호화하면 잡음이 섞여도 기준선 비교로 원래 부호를 다시 만들 수 있어요.',
      summary: '<ul><li><b>부호화</b>: 단계 번호를 이진수(0과 1)로 나타내는 것. 5 = 101, 6 = 110, 3 = 011, 1 = 001</li><li>스위치 8개(8비트) = 0~255까지 나타낼 수 있어요. (3비트 = 8단계, 8비트 = 256단계)</li><li>디지털 신호는 <b>기준선을 넘는지</b>로 0과 1을 구별해서 <b>잡음에 강해요</b>. 아날로그 신호는 잡음이 그대로 쌓여요.</li><li>디지털 정보는 복제해도 품질이 떨어지지 않아요.</li></ul>',
      missions: [
        {
          title: '숫자를 이진수로 바꾸기',
          goal: '스위치로 <b>5, 6, 3</b>을 차례로 만들어 보세요. (켜진 스위치의 값을 더해요)',
          hint: '5 = 4 + 1 이니 맨 오른쪽 두 칸 중 4와 1을 켜요. 6 = 4 + 2, 3 = 2 + 1.',
          setup() { ensure('binary'); },
          check: () => S.bn.idx >= 3, hold: 0.3,
          status: () => '만든 수 <b>' + S.bn.idx + ' / 3</b> · ' + (S.bn.idx < 3 ? '지금 목표 ' + TARGETS[S.bn.idx] : '모두 완성!'),
          explain: '5 = 4 + 1 → <b>101</b>, 6 = 4 + 2 → <b>110</b>, 3 = 2 + 1 → <b>011</b>. 이처럼 단계 번호를 0과 1로 나타낸 것이 이진 부호예요. 양자화한 값 5, 6, 3, 1은 101 110 011 001로 바뀌어 전송돼요.',
        },
        {
          title: '잡음이 있을 때 비교하기',
          goal: '<b>잡음</b> 슬라이더를 <b>40 ~ 50 %</b>에 맞추고 두 전송의 차이를 살펴보세요.',
          hint: '아래 두 줄을 비교해 봐요. 아날로그는 중계할 때마다 잡음이 쌓이지만, 디지털은 기준선(0.5)으로 0과 1을 다시 만들어요.',
          setup() { ensure('binary'); showHint('📶 잡음 슬라이더를 40~50 %로 맞춰요', 6000); },
          check: () => S.bn.noise >= 0.4 && S.bn.noise <= 0.5, hold: 1.3,
          status: () => '잡음 <b>' + Math.round(S.bn.noise * 100) + ' %</b> ' + mark(S.bn.noise >= 0.4 && S.bn.noise <= 0.5) + ' (40~50 %로 맞추기)',
          explain: '잡음 40~50 %에서 <b>아날로그</b>는 받은 파형이 원래와 크게 달라지지만, <b>디지털</b>은 기준선(0.5)을 넘는지만 보고 0과 1을 다시 만들어서 <b>틀린 비트가 0개</b>예요. (잡음이 50 %를 훨씬 넘으면 디지털도 틀릴 수 있어요.)',
        },
        {
          type: 'quiz', title: '디지털 복제의 품질',
          goal: '디지털 정보는 여러 번 <b>복제해도 품질이 떨어지지 않는</b> 까닭은 무엇일까요?',
          setup() { ensure('binary'); },
          choices: ['0과 1만 구별하면 되어서, 약간의 잡음이 섞여도 원래 값으로 다시 만들 수 있기 때문이다', '복제할 때마다 데이터가 더 커지기 때문이다', '디지털은 잡음이 아예 생기지 않기 때문이다', '복제본이 항상 원본보다 좋기 때문이다'],
          answer: 0,
          feedback: ['', '복제해도 데이터의 크기는 그대로예요.', '디지털 신호에도 잡음은 생겨요. 다만 0과 1을 구별하는 데는 문제가 없을 뿐이에요.', '복제본은 원본과 같을 뿐, 더 좋아지지는 않아요.'],
          explain: '디지털은 값이 <b>0 또는 1</b>뿐이라서 잡음이 조금 섞여도 기준선과 비교해 정확한 값으로 되돌릴 수 있어요. 그래서 복제·저장·전송을 반복해도 품질이 그대로예요.',
        },
      ],
    },
    {
      title: '통신과 문명: 그림을 0과 1로 보내요', short: '통신과 문명', icon: '🌐', phase: '적용',
      features: ['pixel', 'cards'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 숫자를 0과 1로 부호화하는 방법을 배웠어요. 사진과 그림도 같은 방법으로 보낼 수 있어요.</div>' +
        '<p>8×8 칸의 흑백 그림은 칸마다 <b>밝기 0 또는 1</b>로 부호화해서 보내요. 직접 부호를 만들어 송신하고, 정보 통신이 바꾼 우리 생활의 <b>장점과 우려</b>도 생각해 봐요.</p>',
      setup() { enterLevel(3); showHint('🖼️ 칸을 눌러 0과 1을 바꿔요', 6000); },
      recap: '그림·소리 같은 정보도 0과 1로 부호화해 빠르고 정확하게 전달할 수 있어요. 정보 통신은 큰 편리함과 함께 개인 정보·격차 문제도 가져와요.',
      summary: '<ul><li>8×8 흑백 그림 = 64칸 = 64비트 = <b>8바이트</b>. 칸마다 0 또는 1로 부호화해서 보내고, 받는 쪽에서 다시 그림으로 복원해요.</li><li>정보 통신(인터넷, 무선 통신, 광섬유)은 의사소통·원격 의료·인터넷 쇼핑·인공지능 번역처럼 현대 문명을 크게 바꿨어요.</li><li>한편 <b>개인 정보 유출</b>, <b>디지털 격차</b> 같은 문제도 생겨서 안전하고 공정하게 쓰는 태도가 필요해요.</li></ul>',
      missions: [
        {
          title: '그림 부호화하고 송신하기',
          goal: '왼쪽 <b>하트 그림</b>을 보고 가운데 칸을 0과 1로 맞춘 뒤 <b>📤 송신하기</b>를 누르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '검은 칸이 1, 흰 칸이 0이에요. 위에서 아래로 한 줄씩(8비트씩) 맞춰 봐요. 둘째 줄은 01100110이에요.',
          manual: true,
          setup() { ensure('pixel'); },
          status: () => { const same = S.px.bits.reduce((n, v, i) => n + (v === HEART[i] ? 1 : 0), 0); return '그림과 같은 칸 <b>' + same + ' / 64</b> · ' + mark(S.px.sent) + ' 송신'; },
          check() {
            const p = S.px, same = p.bits.reduce((n, v, i) => n + (v === HEART[i] ? 1 : 0), 0);
            if (!p.sent) return same === 64 ? '부호를 다 맞췄어요! <b>📤 송신하기</b>를 눌러 보내 보세요.' : '먼저 부호를 맞추고 <b>📤 송신하기</b>를 눌러 주세요.';
            const diff = p.sentBits.reduce((n, v, i) => n + (v !== HEART[i] ? 1 : 0), 0);
            if (diff > 0) return '받은 그림이 하트와 <b>' + diff + '칸</b> 달라요. 부호를 고쳐서 다시 송신해 보세요.';
            return true;
          },
          explain: '하트 그림을 칸마다 0(흰색)과 1(검은색)로 바꾼 <b>64비트(8바이트)</b>를 보내면, 받는 쪽이 같은 순서로 칸을 칠해서 그림을 복원해요. 부호가 한 칸만 틀려도 받은 그림이 달라져요.',
        },
        {
          title: '정보 통신의 장점과 우려',
          goal: '카드 <b>5장</b>을 <b>편리해진 점</b>과 <b>조심할 점</b> 상자에 나누고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '원격 의료·인터넷 쇼핑·인공지능 번역은 생활을 편리하게 하지만, 개인 정보 유출과 디지털 격차는 해결해야 할 문제예요.',
          manual: true,
          setup() { setMode('cards'); },
          status: () => '놓은 카드 <b>' + S.sort.cards.cards.filter((c) => c.bin).length + ' / 5</b>',
          check: () => sortCheck('cards'),
          explain: '정보 통신 덕분에 멀리서도 진료받고(<b>원격 의료</b>), 집에서 쇼핑하고(<b>인터넷 쇼핑</b>), 다른 언어를 바로 이해해요(<b>인공지능 번역</b>). 반면 <b>개인 정보 유출</b>과 <b>디지털 격차</b>는 함께 해결해야 할 문제예요.',
        },
        {
          type: 'quiz', title: '디지털 정보를 안전하게 쓰기',
          goal: '디지털 데이터를 <b>안전하게</b> 사용하는 방법으로 알맞은 것은?',
          setup() { setMode('cards'); },
          choices: ['모든 사이트에 같은 비밀번호를 쓴다', '출처가 불분명한 링크는 누르지 않고, 개인 정보를 함부로 올리지 않는다', '친구에게 내 비밀번호를 알려 준다', '공용 컴퓨터에 로그인한 채로 자리를 뜬다'],
          answer: 1,
          feedback: ['한 곳이 뚫리면 모든 곳이 위험해져요.', '', '비밀번호는 다른 사람과 공유하지 않아요.', '다른 사람이 내 정보를 볼 수 있어요.'],
          explain: '디지털 정보는 쉽게 복제되고 빠르게 퍼지기 때문에, <b>개인 정보를 지키고</b> 출처가 분명한 정보만 쓰는 습관이 중요해요. 정보 통신을 이용하는 우리 모두의 책임이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-digital', mount: '#game', badge: '디지털 변환가', homeHref: '../../index.html#h1a',
    featureLabels: { compare: '🕰️ 사례 카드 · 아날로그/디지털 상자', sample: '📈 표본 간격 · 비트 수 조절', binary: '🔢 스위치 8개 · 잡음 슬라이더', pixel: '🖼️ 8×8 그림 부호화 · 송신', cards: '🌐 장점/우려 상자' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  sortReset('compare'); sortReset('cards'); pxInit(); smpRebuild(false); setInt(1); setBits(2); S.smp.dots.forEach((d) => { d.qd = d.v; d.born = 1; }); updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    stepItems(S.sort.compare.cards, dt); stepItems(S.sort.cards.cards, dt);
    stepSmp(dt); stepBin(dt); stepPx(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'compare') drawSort('compare', t); else if (S.mode === 'cards') drawSort('cards', t); else if (S.mode === 'sample') drawSample(t); else if (S.mode === 'binary') drawBinary(t); else drawPixel(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, HEART, get game() { return game; }, setMode, enterLevel, setSpeed(n) { SPEED = n; }, setInt, setBits, sortCheck, sortDrop, sortReset, bnVal, bnToggle, pxSend, bnRun, smpRebuild,
    fillSort(key, right) { const z = S.sort[key]; z.cards.forEach((c, i) => { const id = right === false ? z.bins.find((b) => b.id !== c.ans).id : c.ans; c.bin = id; c.seq = ++z.seq; }); sortLayout(z); z.cards.forEach((c) => { c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th; }); z.ok = false; },
    setBits8(n) { S.bn.bits = n.toString(2).padStart(8, '0').split('').map(Number); S.bn.knob = S.bn.bits.slice(); },
    setNoise(v) { const s = $('#sNoise'); s.value = v; s.dispatchEvent(new Event('input')); },
    fillPx(right) { S.px.bits = HEART.slice(); if (right === false) { S.px.bits[10] ^= 1; S.px.bits[20] ^= 1; } },
  };
})();
