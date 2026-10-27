/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 전사: DNA에서 mRNA로 (단원 11차시)
   성취기준 [10통과1-03-06] 생명 시스템의 유지에 필요한 세포 내 정보의 흐름을 유전자로부터 단백질이 만들어지는
   과정을 중심으로 설명할 수 있다.  (이 차시: 전사 / 다음 차시: 번역)
   ① 관찰: 정보의 흐름 (핵 속 DNA는 핵 밖으로 못 나감 → mRNA 복사본 → 리보솜 → 단백질)
   ② 모형: 전사 과정 (DNA 풀림 → 주형 가닥에 짝이 맞는 RNA 염기 결합 → mRNA 분리 · 핵공 통과)
   ③ 탐구: 코돈 (염기 1·2·3개로 만들 수 있는 가짓수 4 · 16 · 64 → 아미노산 20종에는 3개 이상 필요)
   ④ 적용: 전사 연습 (TAC CTT GGT ACT → AUG GAA CCA UGA, 세포마다 필요한 유전자만 전사)
   ※ 인트론·스플라이싱, 전사 인자, 역전사, 진핵·원핵 비교, DNA 복제는 다루지 않음. 구조식 없이 색 블록으로 나타냄.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 520 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.18 : 1;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BG = '#f3f8f4', INK = '#14532d';
  const BC = { A: '#22c55e', T: '#ef4444', G: '#eab308', C: '#3b82f6', U: '#ec4899' };
  const BT = { A: '#ffffff', T: '#ffffff', G: '#3b2f00', C: '#ffffff', U: '#ffffff' };
  const BN = { A: '아데닌', T: '타이민', G: '구아닌', C: '사이토신', U: '유라실' };
  const PAIR = { A: 'U', T: 'A', G: 'C', C: 'G' };            // DNA 주형 가닥 염기 → 짝이 되는 RNA 염기
  const RNAS = ['A', 'U', 'G', 'C'];
  const NUMS = ['①', '②', '③'];

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();

  /* 염기 블록 (둥근 사각형 + 글자) */
  function block(x, y, w, h, L, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const col = o.color || BC[L];
    ctx.translate(x, y); if (o.scale) ctx.scale(o.scale, o.scale);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, SciSim.color.shade(col, 0.3)); g.addColorStop(0.55, col); g.addColorStop(1, SciSim.color.shade(col, -0.22));
    const draw = () => { ctx.fillStyle = g; rr(-w / 2, -h / 2, w, h, Math.min(10, h * 0.3)).fill(); };
    if (o.shadow === false) draw(); else D.shadow(draw, { blur: 5, y: 2 });
    ctx.lineWidth = 2; ctx.strokeStyle = o.glow ? '#ffffff' : SciSim.color.shade(col, -0.4); rr(-w / 2, -h / 2, w, h, Math.min(10, h * 0.3)).stroke();
    ctx.restore();
    if (o.text !== false && w >= 15) D.text(x, y + h * 0.18 * (o.scale || 1), L, { size: (o.size || Math.max(13, h * 0.5)) * (o.scale || 1), color: BT[L], weight: 800, alpha: o.alpha });
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'cell', sub: 'move', clock: 0, fade: 0, drag: null, hover: '', epoch: 0,
    cell: { dna: { st: 'idle', t: 0, x: 0, y: 0, tried: false }, rna: { st: 'idle', s: 0, t: 0, done: false }, prot: 0, msg: '', msgT: 0,
      flow: { slots: [null, null, null], order: ['rna', 'prot', 'dna'], ok: false } },
    tr: null,
    cd: { n: 3, counted: { 1: false, 2: false, 3: false }, filled: { 1: false, 2: false, 3: false }, cnt: 0, spawn: 0, bar: { 1: 0, 2: 0, 3: 0 }, msg: '', msgT: 0, wrong: 0 },
    cells: { sel: '', seen: { pan: false, mus: false }, ok: false, t: 0, msg: '', msgT: 0 },
  };
  let game = null;

  /* ======================================================
     화면 ①: 세포 단면 — 핵 속 DNA / 핵공 / 리보솜
     ====================================================== */
  const CG = () => (PHONE
    ? { cx: 260, cy: 345, rx: 246, ry: 296, nx: 260, ny: 196, nr: 124, pa: [Math.PI / 2 - 0.4, Math.PI / 2 + 0.4], gene: [260, 190], rib: [260, 520], band: 650 }
    : { cx: 400, cy: 230, rx: 388, ry: 182, nx: 218, ny: 230, nr: 118, pa: [-0.4, 0.4], gene: [218, 230], rib: [604, 230], band: 424 });
  const pdir = (a) => ({ x: Math.cos(a), y: Math.sin(a) });
  function rnaPath() {
    const g = CG(), d = pdir(g.pa[0]);
    const pts = [
      { x: g.gene[0] + (PHONE ? 0 : 50), y: g.gene[1] + (PHONE ? 22 : 0) },
      { x: g.nx + d.x * (g.nr - 36), y: g.ny + d.y * (g.nr - 36) },
      { x: g.nx + d.x * (g.nr + 40), y: g.ny + d.y * (g.nr + 40) },
      { x: g.rib[0] + (PHONE ? 50 : 66), y: g.rib[1] + (PHONE ? 14 : -10) },
    ];
    let len = 0; const segs = [];
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); segs.push(l); len += l; }
    return { pts, segs, len };
  }
  function pathAt(P, s) {
    s = clamp(s, 0, P.len); let i = 0;
    while (i < P.segs.length - 1 && s > P.segs[i]) { s -= P.segs[i]; i++; }
    const u = P.segs[i] ? s / P.segs[i] : 0;
    return { x: lerp(P.pts[i].x, P.pts[i + 1].x, u), y: lerp(P.pts[i].y, P.pts[i + 1].y, u) };
  }
  const MRNA12 = 'AUGGAACCAUGA';
  const RNA_DS = 13;
  function resetCell() {
    S.epoch++;
    const g = CG(), c = S.cell;
    c.dna = { st: 'idle', t: 0, x: g.gene[0], y: g.gene[1], tried: false };
    c.rna = { st: 'idle', s: 0, t: 0, done: false };
    c.prot = 0; c.msg = ''; c.msgT = 0;
  }
  function resetFlow() {
    const f = S.cell.flow; f.slots = [null, null, null]; f.ok = false;
    f.order = ['rna', 'prot', 'dna'];
  }
  const FLOWC = { dna: { name: 'DNA', icon: '🧬', col: '#7c3aed' }, rna: { name: 'mRNA', icon: '📄', col: '#ec4899' }, prot: { name: '단백질', icon: '🧶', col: '#f97316' } };
  const flowLayout = () => (PHONE
    ? { sy: 676, sx: [90, 260, 430], sw: 150, sh: 46, ty: 740, tx: [90, 260, 430], tw: 138, th: 44 }
    : { sy: 466, sx: [140, 400, 660], sw: 200, sh: 48, ty: 528, tx: [140, 400, 660], tw: 160, th: 44 });
  function flowTap(id) {
    const f = S.cell.flow, i = f.slots.indexOf(null); if (i < 0 || f.slots.includes(id)) return;
    f.slots[i] = id; Sound.tick(); const L = flowLayout();
    if (!RM) parts.burst(L.sx[i], L.sy, { count: 6, speed: 80, size: 3, life: 0.5, colors: [FLOWC[id].col, '#fff'] });
    updateCtl();
  }
  function flowSlotTap(i) { const f = S.cell.flow; if (f.slots[i]) { f.slots[i] = null; Sound.click(); updateCtl(); } }
  function flowCheck() {
    const f = S.cell.flow, want = ['dna', 'rna', 'prot'];
    if (f.slots.some((x) => !x)) return '세 칸을 모두 채워요. 정보는 어디에서 어디로 흘러갈까요?';
    for (let i = 0; i < 3; i++) if (f.slots[i] !== want[i]) {
      if (i === 0) return '첫 번째는 유전 정보를 <b>원본</b>으로 보관하는 물질이에요.';
      if (i === 1) return '두 번째는 DNA에서 <b>복사</b>해 핵 밖으로 나가는 물질이에요.';
      return '마지막은 정보를 이용해 만들어지는 <b>결과물</b>이에요.';
    }
    return true;
  }

  function stepCell(dt) {
    const g = CG(), c = S.cell, d = c.dna, r = c.rna;
    if (c.msgT > 0) c.msgT -= dt;
    // DNA를 핵 밖으로 내보내려는 시도: 핵공(좁은 틈)보다 커서 핵막에 막혀요
    if (d.st !== 'idle') {
      d.t += dt;
      const tokR = 36, rmax = g.nr - 7 - tokR;
      const tgt = { x: g.nx + pdir(g.pa[1]).x * g.nr, y: g.ny + pdir(g.pa[1]).y * g.nr };
      if (d.st === 'go') {
        const e = SciSim.ease.inOutQuad(clamp(d.t / 1.0, 0, 1));
        let x = lerp(g.gene[0], tgt.x, e), y = lerp(g.gene[1], tgt.y, e);
        const dist = Math.hypot(x - g.nx, y - g.ny);
        if (dist > rmax) { x = g.nx + (x - g.nx) * rmax / dist; y = g.ny + (y - g.ny) * rmax / dist; d.pressed = true; }
        d.x = x; d.y = y;
        if (d.t >= 1.0) { d.st = 'press'; d.t = 0; d.tried = true; Sound.fail(); c.msg = 'DNA는 너무 커서 핵공을 지나지 못해요! 원본은 핵 안에 보관돼요'; c.msgT = 4; if (!RM) parts.burst(d.x, d.y, { count: 8, speed: 90, size: 3, life: 0.5, colors: ['#ef4444', '#fff'] }); updateCtl(); }
      } else if (d.st === 'press') {
        d.sh = Math.sin(d.t * 50) * 3 * (1 - clamp(d.t / 0.5, 0, 1));
        if (d.t >= 0.6) { d.st = 'back'; d.t = 0; d.bx = d.x; d.by = d.y; d.sh = 0; }
      } else if (d.st === 'back') {
        const e = SciSim.ease.outBack(clamp(d.t / 0.7, 0, 1));
        d.x = lerp(d.bx, g.gene[0], e); d.y = lerp(d.by, g.gene[1], e);
        if (d.t >= 0.7) { d.st = 'idle'; d.x = g.gene[0]; d.y = g.gene[1]; }
      }
    }
    // mRNA가 핵공을 지나 리보솜으로
    if (r.st === 'go') {
      r.t += dt; const P = rnaPath(), total = P.len + (12 - 1) * RNA_DS;
      r.s = RM ? P.len : SciSim.ease.inOutSine(clamp(r.t / 3.4, 0, 1)) * P.len;
      if (r.t >= 3.4) { r.st = 'arrived'; r.t = 0; r.done = true; Sound.success(); c.msg = 'mRNA는 핵공을 지나 세포질의 리보솜에 도착했어요!'; c.msgT = 4; if (!RM) parts.burst(g.rib[0], g.rib[1], { count: 12, speed: 120, size: 3.4, life: 0.7, colors: ['#ec4899', '#fde047', '#fff'] }); updateCtl(); }
    } else if (r.st === 'arrived') {
      r.t += dt;
      const k = Math.min(5, Math.floor(r.t / 0.5)); if (k > c.prot) { c.prot = k; Sound.tick(); }
    }
  }
  function drawHelix(x, y, w, h, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.scale) ctx.scale(o.scale, o.scale);
    const N = 36, ph = (o.phase || 0);
    const pt = (i, s) => ({ x: -w / 2 + w * i / N, y: Math.sin(i * 0.5 + ph + (s ? Math.PI : 0)) * h / 2 });
    for (let i = 1; i < N; i += 2) { const a = pt(i, 0), b = pt(i, 1); ctx.strokeStyle = o.rung || ['#22c55e', '#ef4444', '#eab308', '#3b82f6'][i % 4]; ctx.globalAlpha = 0.85; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.lineCap = 'round';
    [0, 1].forEach((s) => { ctx.strokeStyle = s ? '#a78bfa' : '#6d28d9'; ctx.lineWidth = 4.5; ctx.beginPath(); for (let i = 0; i <= N; i++) { const p = pt(i, s); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); });
    ctx.restore();
  }
  function drawEnvelope(g, t) {
    const d = 0.14, a = g.pa.slice().sort((p, q) => p - q);
    ctx.save(); ctx.lineCap = 'round';
    [[7, '#7c3aed', 4], [0, '#a78bfa', 2.5]].forEach(([off, col, lw]) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      for (let i = 0; i < 2; i++) { const a1 = a[i] + d, a2 = (i === 0 ? a[1] : a[0] + Math.PI * 2) - d; ctx.beginPath(); ctx.arc(g.nx, g.ny, g.nr - off * 0.5, a1, a2); ctx.stroke(); }
    });
    // 핵공 가장자리
    g.pa.forEach((p) => { const dr = pdir(p); [-1, 1].forEach((s) => { const aa = p + s * d, x = g.nx + Math.cos(aa) * g.nr, y = g.ny + Math.sin(aa) * g.nr; D.sphere(x, y, 5.5, '#c4b5fd', { gloss: false, outline: '#6d28d9', outlineWidth: 1.5 }); }); });
    ctx.restore();
  }
  function drawRibosome(x, y, k, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const big = ctx.createLinearGradient(0, 0, 0, 40); big.addColorStop(0, '#fdba74'); big.addColorStop(1, '#ea580c');
    D.shadow(() => { ctx.fillStyle = big; ctx.beginPath(); ctx.ellipse(0, 14, 62, 30, 0, 0, 6.3); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 14, 62, 30, 0, 0, 6.3); ctx.stroke();
    const sm = ctx.createLinearGradient(0, -34, 0, -4); sm.addColorStop(0, '#fed7aa'); sm.addColorStop(1, '#fb923c');
    ctx.fillStyle = sm; ctx.beginPath(); ctx.ellipse(0, -10, 44, 20, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#9a3412'; ctx.beginPath(); ctx.ellipse(0, -10, 44, 20, 0, 0, 6.3); ctx.stroke();
    ctx.restore();
    if (o.label !== false) D.text(x, y + 62 * k, '리보솜', { size: 14, weight: 800, color: '#9a3412' });
  }
  function drawCell(t) {
    const g = CG(), c = S.cell, d = c.dna, r = c.rna;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 26, '세포 속 정보의 흐름', { size: PHONE ? 16 : 19, weight: 800, color: INK });
    // 세포 (세포막 + 세포질)
    ctx.save();
    const cg = ctx.createRadialGradient(g.cx, g.cy - 40, 20, g.cx, g.cy, Math.max(g.rx, g.ry));
    cg.addColorStop(0, '#fffbe6'); cg.addColorStop(1, '#fef08a');
    D.shadow(() => { ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, 6.3); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, 6.3); ctx.stroke();
    ctx.restore();
    D.text(PHONE ? 90 : 560, PHONE ? 400 : 100, '세포질', { size: 14.5, weight: 800, color: '#a16207' });
    // 장식: 미토콘드리아
    [[PHONE ? 110 : 470, PHONE ? 600 : 360], [PHONE ? 400 : 700, PHONE ? 430 : 340]].forEach((q, i) => {
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(i ? 0.5 : -0.3);
      ctx.fillStyle = '#fdba74'; ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2; rr(-26, -12, 52, 24, 12).fill(); rr(-26, -12, 52, 24, 12).stroke();
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, -9); ctx.quadraticCurveTo(-8, 0, -12, 9); ctx.moveTo(0, -10); ctx.quadraticCurveTo(4, 0, 0, 10); ctx.moveTo(12, -9); ctx.quadraticCurveTo(16, 0, 12, 9); ctx.stroke(); ctx.restore();
    });
    // 핵
    const ng = ctx.createRadialGradient(g.nx - 30, g.ny - 30, 10, g.nx, g.ny, g.nr);
    ng.addColorStop(0, '#f5f3ff'); ng.addColorStop(1, '#ddd6fe');
    D.shadow(() => { ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(g.nx, g.ny, g.nr, 0, 6.3); ctx.fill(); }, { blur: 8, y: 3 });
    drawEnvelope(g, t);
    D.text(g.nx, g.ny - g.nr - 12 + (PHONE ? 0 : 0), '핵', { size: 15, weight: 800, color: '#6d28d9' });
    // 핵 속 DNA (유전자 부분 강조)
    const hx = g.gene[0], hy = g.gene[1];
    drawHelix(hx, hy, PHONE ? 160 : 150, 26, t, { phase: t * 1.2 });
    ctx.save(); ctx.strokeStyle = 'rgba(250,204,21,.95)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); rr(hx - 38, hy - 24, 76, 48, 12).stroke(); ctx.restore();
    D.label(hx, hy + (PHONE ? 52 : 52), 'DNA (원본)', { bg: '#6d28d9', size: PHONE ? 12 : 13 });
    D.label(hx, hy - 42, '유전자', { bg: '#ca8a04', size: PHONE ? 11.5 : 12.5 });
    // DNA 시도 (토큰)
    if (d.st !== 'idle') {
      const sh = d.sh || 0;
      D.glow(d.x + sh, d.y, 52, d.st === 'press' ? '#ef4444' : '#a78bfa', 0.3);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = d.st === 'press' ? '#ef4444' : '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x + sh, d.y, 36, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore();
      drawHelix(d.x + sh, d.y, 62, 22, t, { phase: t * 1.5 });
      if (d.st === 'press') D.text(d.x + sh, d.y - 46, '✖ 못 지나가요', { size: 13.5, weight: 800, color: '#b91c1c', stroke: '#fff', strokeWidth: 4 });
    }
    // 리보솜
    drawRibosome(g.rib[0], g.rib[1], PHONE ? 1.0 : 1.1, t);
    // mRNA 구슬 사슬
    if (r.st === 'go' || r.st === 'arrived') {
      const P = rnaPath();
      for (let i = 11; i >= 0; i--) {
        const sPos = r.s - i * RNA_DS; if (sPos < 0) continue;
        const q = pathAt(P, sPos), L = MRNA12[i];
        D.sphere(q.x, q.y, 6.2, BC[L], { gloss: true, outline: SciSim.color.shade(BC[L], -0.4), outlineWidth: 1 });
      }
      if (r.st === 'go') { const q = pathAt(P, r.s); D.label(q.x, q.y - 20, 'mRNA', { bg: '#be185d', size: 12.5 }); }
    }
    // 단백질 (아미노산 사슬)
    if (c.prot > 0) {
      const rx = g.rib[0], ry = g.rib[1];
      for (let i = 0; i < c.prot; i++) {
        const px = PHONE ? rx + 86 + i * 5 : rx + 72 + i * 5, py = ry + (PHONE ? 40 : 34) + i * 14;
        D.sphere(px + Math.sin(i * 1.3) * 8, py, 8, ['#f97316', '#fb923c', '#fdba74', '#f59e0b', '#ea580c'][i], { gloss: true, shadow: true });
      }
      D.label(rx + (PHONE ? 98 : 100), ry + (PHONE ? 118 : 118), '🧶 단백질', { bg: '#c2410c', size: 13 });
    }
    // 핵공 이름표
    if (S.sub === 'move') {
      const pp = pdir(g.pa[0]), px = g.nx + pp.x * g.nr, py = g.ny + pp.y * g.nr;
      D.arrow(px + pp.x * 46, py + pp.y * 46 - (PHONE ? 0 : 26), px + pp.x * 8, py + pp.y * 8, { color: '#6d28d9', width: 2.5, head: 9 });
      D.label(px + pp.x * 46 + (PHONE ? 40 : 28), py + pp.y * 46 - (PHONE ? 0 : 36), '핵공', { bg: '#6d28d9', size: PHONE ? 12 : 13 });
    }
    // 메시지
    if (c.msgT > 0) D.label(VW / 2, PHONE ? 628 : 56, c.msg, { bg: c.msg.includes('못') ? '#b45309' : '#15803d', size: PHONE ? 11.5 : 14 });
    // 아래 영역
    if (S.sub === 'move') drawAnalogy(t); else drawFlow(t);
  }
  function drawAnalogy(t) {
    const g = CG(), items = [['📚', 'DNA = 도서관의 원본 참고서', '도서관(핵) 밖으로 못 나가요', '#6d28d9'], ['📄', 'mRNA = 필요한 부분만 복사한 복사본', '밖으로 가지고 나갈 수 있어요', '#be185d'], ['🏭', '리보솜 = 복사본을 보고 만드는 공장', '단백질을 만들어요', '#c2410c']];
    if (PHONE) {
      items.forEach((it, i) => {
        const y = 668 + i * 38;
        D.shadow(() => { ctx.fillStyle = '#fff'; rr(14, y - 17, VW - 28, 32, 12).fill(); }, { blur: 3, y: 1 });
        D.text(30, y + 5, it[0], { size: 15, align: 'left' }); D.text(56, y + 5, it[1], { size: 12.5, weight: 800, color: it[3], align: 'left' });
      });
    } else {
      items.forEach((it, i) => {
        const x = 20 + i * 262, y = 436;
        D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, 250, 108, 14).fill(); }, { blur: 5, y: 2 });
        ctx.strokeStyle = it[3]; ctx.lineWidth = 2; rr(x, y, 250, 108, 14).stroke();
        D.text(x + 26, y + 44, it[0], { size: 30 });
        const ls = it[1].split(' = ');
        D.text(x + 54, y + 36, ls[0] + ' =', { size: 15, weight: 800, color: it[3], align: 'left' });
        D.text(x + 54, y + 58, ls[1].length > 16 ? ls[1].slice(0, ls[1].indexOf(' ', 8)) : ls[1], { size: 13.5, weight: 700, color: '#334155', align: 'left' });
        if (ls[1].length > 16) D.text(x + 54, y + 76, ls[1].slice(ls[1].indexOf(' ', 8) + 1), { size: 13.5, weight: 700, color: '#334155', align: 'left' });
        D.text(x + 125, y + 98, it[2], { size: 12, weight: 700, color: '#64748b' });
      });
    }
  }
  function drawFlow(t) {
    const L = flowLayout(), f = S.cell.flow, g = CG();
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.7)'; rr(PHONE ? 8 : 10, g.band + (PHONE ? 0 : 4), VW - (PHONE ? 16 : 20), PHONE ? 120 : 126, 16).fill(); }, { blur: 5, y: 2 });
    for (let i = 0; i < 3; i++) {
      const id = f.slots[i], x = L.sx[i], y = L.sy;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.setLineDash(id ? [] : [6, 5]); ctx.strokeStyle = id ? FLOWC[id].col : (i === f.slots.indexOf(null) ? '#16a34a' : '#94a3b8');
      ctx.fillStyle = id ? SciSim.color.rgba(FLOWC[id].col, 0.14) : '#fff'; rr(x - L.sw / 2, y - L.sh / 2, L.sw, L.sh, 12).fill(); rr(x - L.sw / 2, y - L.sh / 2, L.sw, L.sh, 12).stroke();
      ctx.restore();
      D.text(x - L.sw / 2 + 14, y + 6, NUMS[i], { size: 18, weight: 800, color: '#64748b', align: 'left' });
      if (id) D.text(x + 10, y + 6, FLOWC[id].icon + ' ' + FLOWC[id].name, { size: PHONE ? 15 : 18, weight: 800, color: FLOWC[id].col });
      if (!id && i === f.slots.indexOf(null)) D.ring(x, y, L.sh * 0.5, t, { color: '#16a34a', speed: 0.9, width: 1.5 });
      if (i < 2) D.arrow(x + L.sw / 2 + 4, y, L.sx[i + 1] - L.sw / 2 - 4, y, { color: '#94a3b8', width: 3, head: 10 });
    }
    // 카드 (카드 놓는 자리)
    const rest = f.order.filter((id) => !f.slots.includes(id));
    f.order.forEach((id, i) => {
      const used = f.slots.includes(id), x = L.tx[i], y = L.ty, hv = S.hover === 'f' + id;
      ctx.save(); ctx.globalAlpha = used ? 0.28 : 1;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x - L.tw / 2, y - L.th / 2 - (hv && !used ? 2 : 0), L.tw, L.th, 12).fill(); }, { blur: used ? 0 : 6, y: 2 });
      ctx.lineWidth = 2.5; ctx.strokeStyle = FLOWC[id].col; rr(x - L.tw / 2, y - L.th / 2 - (hv && !used ? 2 : 0), L.tw, L.th, 12).stroke(); ctx.restore();
      D.text(x, y + 6, FLOWC[id].icon + ' ' + FLOWC[id].name, { size: PHONE ? 15 : 18, weight: 800, color: FLOWC[id].col, alpha: used ? 0.3 : 1 });
    });
    if (flowCheck() === true) D.label(VW / 2, g.band + (PHONE ? -10 : 6), '정보는 DNA → mRNA → 단백질 순서로 흘러요', { bg: '#15803d', size: PHONE ? 12 : 14 });
    else D.text(VW / 2, PHONE ? 645 : 421, '카드를 눌러 ①→②→③ 순서대로 채워요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     화면 ②·④: 전사 — DNA 풀림, RNA 염기 결합, mRNA 분리 · 핵공 통과
     ====================================================== */
  const TEMPL = { 6: { tmpl: 'TACGGT', coding: 'ATGCCA' }, 12: { tmpl: 'TACCTTGGTACT', coding: 'ATGGAACCATGA' } };
  const mrnaOf = (t) => t.split('').map((c) => PAIR[c]).join('');
  function newTr(n) {
    const o = TEMPL[n];
    S.epoch++;
    S.tr = { n, tmpl: o.tmpl, coding: o.coding, mr: [], ph: 'idle', pt: 0, open: new Array(n).fill(0), opened: false, done: false, exited: false, wrong: 0, started: false,
      ghosts: [], flash: 0, msg: '', msgT: 0, polyX: 0, polyA: 0, u: 0, lift: 0, closeT: -1, firstTry: true };
    S.tr.polyX = trg(n).x(0);
  }
  function trg(n) {
    const six = n === 6, gap = n === 12 ? (PHONE ? 8 : 10) : 0;
    const sp = PHONE ? (six ? 66 : 33) : (six ? 76 : 46);
    const W = (n - 1) * sp + (n === 12 ? 3 * gap : 0);
    const cxc = PHONE ? 262 : 452, x0 = cxc - W / 2;
    const x = (i) => (i < 0 ? x0 + i * sp : i >= n ? x0 + (n - 1) * sp + (n === 12 ? 3 * gap : 0) + (i - n + 1) * sp : x0 + i * sp + (n === 12 ? Math.floor(i / 3) * gap : 0));
    const G = PHONE
      ? { sp, gap, x, bw: six ? 58 : 29, bh: six ? 46 : 40, yO: 172, yR: 268, yT: 348, yM: 220, tray: { y: 476, w: 76, h: 58, xs: [0, 1, 2, 3].map((i) => 262 + (i - 1.5) * 112) }, env: 560, pore: 40, rowY: 668, hfx: 72, cs: n === 12 ? 10 : 14, ribW: 1.3, label: 56 }
      : { sp, gap, x, bw: six ? 68 : 40, bh: six ? 40 : 36, yO: 100, yR: 176, yT: 236, yM: 140, tray: { y: 336, w: 72, h: 46, xs: [0, 1, 2, 3].map((i) => 452 + (i - 1.5) * 120) }, env: 396, pore: 62, rowY: 474, hfx: 150, cs: n === 12 ? 10 : 14, ribW: 1.5, label: 56 };
    G.rowX = (i) => G.hfx + (x(i) - x(0));
    G.ribX = G.hfx + (n === 12 ? (PHONE ? 33 : 50) : (PHONE ? 62 : 76));
    return G;
  }
  const ease3 = SciSim.ease.inOutCubic;
  function trBeadPos(T, G, i) {
    const n = T.n, b = T.mr[i];
    if (T.ph === 'detach' || T.ph === 'exit' || T.ph === 'final') {
      const rowM = { x: G.x(i), y: G.yM, s: G.bw };
      const colA = { x: G.pore, y: G.env - 18 - i * G.cs, s: G.cs - 2 };
      const colB = { x: G.pore, y: G.env - 18 - i * G.cs + (n - 1) * G.cs + 36, s: G.cs - 2 };
      const fin = { x: G.rowX(i), y: G.rowY, s: G.bw };
      const mixp = (a, c, k) => ({ x: lerp(a.x, c.x, k), y: lerp(a.y, c.y, k), s: lerp(a.s, c.s, k) });
      if (T.ph === 'detach') { const k = ease3(clamp(T.pt / 0.6, 0, 1)); return mixp({ x: G.x(i), y: G.yR, s: G.bw }, rowM, k); }
      if (T.ph === 'final') return fin;
      const u = T.u;
      if (u < 1) return mixp(rowM, colA, ease3(u));
      if (u < 2) return mixp(colA, colB, ease3(u - 1));
      return mixp(colB, fin, ease3(u - 2));
    }
    return { x: b.x, y: b.y, s: G.bw };
  }
  function stepTr(dt) {
    const T = S.tr, G = trg(T.n), n = T.n;
    T.pt += dt;
    if (T.flash > 0) T.flash = Math.max(0, T.flash - dt);
    if (T.msgT > 0) T.msgT -= dt;
    // 위쪽 가닥이 풀리거나 닫히는 정도 (염기마다 조금씩 늦게 → 지퍼처럼)
    if (T.ph === 'opening') {
      for (let i = 0; i < n; i++) T.open[i] = RM ? (T.pt > 0.1 ? 1 : 0) : smooth((T.pt - i * 0.1) / 0.6);
      T.polyA = smooth(T.pt / 0.8);
      if (T.pt >= 0.6 + (n - 1) * 0.1 + 0.15) { T.ph = 'synth'; T.pt = 0; T.opened = true; T.polyA = 1; updateCtl(); }
    } else if (T.ph === 'complete') {
      if (T.pt >= 0.9) { T.ph = 'detach'; T.pt = 0; Sound.click(); }
    } else if (T.ph === 'detach') {
      T.polyA = 1 - smooth(T.pt / 0.5);
      if (T.pt >= 0.6) { T.ph = 'exit'; T.pt = 0; T.u = 0; T.closeT = -1; }
    } else if (T.ph === 'exit') {
      const total = 3.8;
      T.u = RM ? 3 : clamp(T.pt / total, 0, 1) * 3;
      if (T.u >= 1.0 && T.closeT < 0) T.closeT = 0;
      if (T.closeT >= 0) { T.closeT += dt; for (let i = 0; i < n; i++) T.open[i] = 1 - smooth((T.closeT - i * 0.08) / 0.5); }
      if (T.u >= 3) { T.ph = 'final'; T.pt = 0; T.exited = true; for (let i = 0; i < n; i++) T.open[i] = 0; Sound.success(); T.msg = 'mRNA ' + mrnaOf(T.tmpl) + '가 핵공을 지나 세포질의 리보솜에 도착했어요!'; T.msgT = 5; if (!RM) parts.burst(G.ribX, G.rowY, { count: 14, speed: 130, size: 3.4, life: 0.7, colors: ['#ec4899', '#fde047', '#fff'] }); updateCtl(); }
    }
    // 중합 효소는 다음 자리로 미끄러져요
    const nx = Math.min(T.mr.length, n - 1);
    T.polyX = RM ? G.x(nx) : SciSim.approach(T.polyX, G.x(nx), dt, 6);
    // 날아와 붙는 RNA 염기
    T.mr.forEach((b, i) => {
      const tx = G.x(i), ty = G.yR;
      if (RM) { b.x = tx; b.y = ty; } else { b.x = SciSim.approach(b.x, tx, dt, 14); b.y = SciSim.approach(b.y, ty, dt, 14); }
    });
    // 틀린 염기가 튕겨 나가는 그림자
    T.ghosts.forEach((g) => { g.t += dt; });
    T.ghosts = T.ghosts.filter((g) => g.t < 0.75);
  }
  function trAttempt(L, fx, fy) {
    const T = S.tr, G = trg(T.n), n = T.n;
    if (T.ph !== 'synth') { showHint(T.ph === 'idle' ? '먼저 ▶ 전사 시작을 눌러 DNA를 풀어요' : '전사가 끝났어요', 2500); return; }
    const k = T.mr.length, tb = T.tmpl[k], need = PAIR[tb];
    if (L === need) {
      const b = { L, x: fx, y: fy, pop: 0 };
      SciSim.tween(b, { pop: 1 }, { duration: 0.4, ease: 'outBack' });
      T.mr.push(b); Sound.tick();
      if (!RM) parts.burst(G.x(k), G.yR, { count: 7, speed: 90, size: 3, life: 0.5, colors: [BC[L], '#fff'] });
      T.msg = tb + '–' + L + ' 짝이 맞아요!'; T.msgT = 1.6;
      if (T.mr.length === n) { T.ph = 'complete'; T.pt = 0; T.done = true; Sound.success(); T.msg = 'mRNA ' + mrnaOf(T.tmpl) + ' 합성 완료! 떨어져 나와요'; T.msgT = 4; if (!RM) parts.burst(G.x(n / 2), G.yR, { count: 18, speed: 170, size: 4 }); }
      updateCtl();
    } else {
      T.wrong++; T.flash = 0.6; Sound.fail();
      T.ghosts.push({ L, sx: fx, sy: fy, t: 0, k });
      T.msg = '주형 가닥의 ' + tb + '와 짝이 되는 염기는 ' + need + '예요.' + (tb === 'A' ? ' (RNA에는 T 대신 U가 있어요)' : (L === tb ? ' 같은 염기가 아니라 짝을 붙여요.' : ''));
      T.msgT = 4; updateCtl();
    }
  }
  function startTr() {
    const T = S.tr; if (T.ph !== 'idle') return;
    T.ph = 'opening'; T.pt = 0; T.started = true; Sound.click(); updateCtl();
  }
  function drawTrayBlock(L, x, y, w, h, hv, dim) {
    block(x, y - (hv ? 3 : 0), w, h, L, { scale: hv ? 1.06 : 1, alpha: dim ? 0.4 : 1, size: PHONE ? 22 : 22 });
  }
  function drawTr(t) {
    const T = S.tr, G = trg(T.n), n = T.n, c = SciSim.color;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 핵 속 / 세포질
    const envY = G.env;
    D.shadow(() => { ctx.fillStyle = '#f5f3ff'; rr(8, 40, VW - 16, envY - 40, 22).fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#fefce8'; ctx.fillRect(8, envY, VW - 16, VH - 8 - envY);
    ctx.fillStyle = '#fefce8'; rr(8, envY - 16, VW - 16, VH - 8 - envY + 16, 22).fill();
    ctx.fillStyle = '#f5f3ff'; rr(8, 40, VW - 16, envY - 40, 22).fill();
    // 핵막 (핵공은 틈)
    ctx.save(); ctx.lineCap = 'round';
    [[envY - 2, '#7c3aed', 5], [envY + 5, '#a78bfa', 3]].forEach(([yy, col, lw]) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(10, yy); ctx.lineTo(G.pore - 22, yy); ctx.moveTo(G.pore + 22, yy); ctx.lineTo(VW - 10, yy); ctx.stroke();
    });
    [-1, 1].forEach((s) => D.sphere(G.pore + s * 22, envY + 1, 6, '#c4b5fd', { gloss: false, outline: '#6d28d9', outlineWidth: 1.5 }));
    ctx.restore();
    D.text(PHONE ? 70 : 86, 62, '핵 안', { size: 14, weight: 800, color: '#6d28d9' });
    D.text(PHONE ? 44 : 50, envY + 28, '세포질', { size: 14, weight: 800, color: '#a16207' });
    D.label(G.pore + (PHONE ? 50 : 52), envY - 18, '핵공', { bg: '#6d28d9', size: 12 });
    // 리보솜 (세포질)
    drawRibosome(G.ribX, G.rowY + (PHONE ? 8 : 4), G.ribW * (PHONE ? 0.85 : 0.9), t, { label: false });
    D.text(G.ribX, G.rowY + (PHONE ? 62 : 58), '리보솜', { size: 14, weight: 800, color: '#9a3412' });
    // 이중 가닥 DNA (유전자 구간 + 앞뒤)
    const ext = 2, idx = []; for (let i = -ext; i < n + ext; i++) idx.push(i);
    const topY = (i) => (i >= 0 && i < n ? lerp(G.yR, G.yO, smooth(T.open[i])) : G.yR);
    // 뼈대
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 7;
    ctx.strokeStyle = '#a8a29e'; ctx.beginPath(); idx.forEach((i, k) => (k ? ctx.lineTo(G.x(i), topY(i)) : ctx.moveTo(G.x(i), topY(i)))); ctx.stroke();
    ctx.beginPath(); idx.forEach((i, k) => (k ? ctx.lineTo(G.x(i), G.yT) : ctx.moveTo(G.x(i), G.yT))); ctx.stroke();
    ctx.restore();
    // 유전자 구간 표시 괄호
    const gx0 = G.x(0) - G.bw / 2 - 6, gx1 = G.x(n - 1) + G.bw / 2 + 6;
    ctx.save(); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); rr(gx0, G.yO - G.bh / 2 - (PHONE ? 22 : 14), gx1 - gx0, G.yT + G.bh / 2 - G.yO + (PHONE ? 36 : 28), 14).stroke(); ctx.restore();
    D.label((gx0 + gx1) / 2, G.yO - G.bh / 2 - (PHONE ? 34 : 26), '유전자 (이 부분만 전사)', { bg: '#ca8a04', size: PHONE ? 12 : 13 });
    // 중합 효소
    if (T.polyA > 0.02) {
      ctx.save(); ctx.globalAlpha = 0.5 * T.polyA;
      const py = (G.yR + G.yT) / 2, rx = G.sp * (n === 6 ? 0.95 : 1.5) + 10;
      const pg = ctx.createRadialGradient(T.polyX - 12, py - 14, 8, T.polyX, py, rx); pg.addColorStop(0, '#d8b4fe'); pg.addColorStop(1, '#7e22ce');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(T.polyX, py, rx, 58, 0, 0, 6.3); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = T.polyA; D.text(T.polyX, G.yT + G.bh / 2 + 18, 'RNA 중합 효소 →', { size: PHONE ? 12.5 : 13, weight: 800, color: '#6b21a8' }); ctx.restore();
    }
    // 앞뒤 (유전자 밖) 염기: 흐리게
    for (let i = -ext; i < n + ext; i++) {
      if (i >= 0 && i < n) continue;
      ctx.save(); ctx.globalAlpha = 0.5;
      [[G.yR, '#d6d3d1'], [G.yT, '#d6d3d1']].forEach(([yy, col]) => { ctx.fillStyle = col; rr(G.x(i) - G.bw / 2, yy - G.bh / 2, G.bw, G.bh, 8).fill(); });
      ctx.restore();
    }
    // 위쪽 가닥(비주형) · 아래쪽 가닥(주형) · 수소 결합
    const showSlot = T.ph === 'synth' || T.ph === 'complete' || (T.ph === 'opening' && T.pt > 0.5);
    for (let i = 0; i < n; i++) {
      const o = smooth(T.open[i]), ty = topY(i);
      if (o < 0.98) { ctx.save(); ctx.globalAlpha = 1 - o; ctx.strokeStyle = '#78716c'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(G.x(i), ty + G.bh / 2); ctx.lineTo(G.x(i), G.yT - G.bh / 2); ctx.stroke(); ctx.restore(); }
      block(G.x(i), ty, G.bw - 4, G.bh, T.coding[i], { size: G.bh * 0.5 });
      block(G.x(i), G.yT, G.bw - 4, G.bh, T.tmpl[i], { size: G.bh * 0.5, glow: T.ph === 'synth' && i === T.mr.length });
    }
    // RNA 자리 (점선)
    if (T.opened || T.ph === 'opening') {
      for (let i = T.mr.length; i < n && (T.ph === 'synth' || T.ph === 'opening'); i++) {
        const al = T.ph === 'opening' ? smooth((T.pt - 0.5) / 0.6) : 1, next = i === T.mr.length;
        ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = next ? 3 : 2; ctx.strokeStyle = next ? (T.flash > 0 ? '#ef4444' : '#16a34a') : '#a8a29e'; ctx.setLineDash([6, 5]);
        rr(G.x(i) - (G.bw - 4) / 2, G.yR - G.bh / 2, G.bw - 4, G.bh, 8).stroke(); ctx.restore();
        if (next && T.ph === 'synth') { D.ring(G.x(i), G.yR, G.bh * 0.7, t, { color: T.flash > 0 ? '#ef4444' : '#16a34a', speed: 1, width: 2 }); }
      }
    }
    // 합성되는 mRNA
    for (let i = 0; i < T.mr.length; i++) {
      const p = trBeadPos(T, G, i), b = T.mr[i], pop = T.ph === 'synth' || T.ph === 'complete' ? Math.max(0.2, b.pop) : 1;
      block(p.x, p.y, Math.max(8, p.s - (p.s > 20 ? 4 : 0)) * pop, Math.max(8, (p.s > 20 ? G.bh : p.s)) * pop, b.L, { size: G.bh * 0.5, text: p.s > 20, shadow: p.s > 20 });
    }
    // 튕겨 나가는 틀린 염기
    T.ghosts.forEach((g) => {
      const tx = G.x(g.k), ty = G.yR;
      let x, y, a;
      if (g.t < 0.22) { const e = g.t / 0.22; x = lerp(g.sx, tx, e); y = lerp(g.sy, ty, e); a = 1; }
      else { const e = (g.t - 0.22) / 0.5; x = lerp(tx, tx + (g.sx < tx ? -1 : 1) * 70, SciSim.ease.outCubic(e)); y = ty - Math.sin(Math.min(1, e) * Math.PI) * 50 + e * 70; a = 1 - e; }
      block(x, y, G.bw - 4, G.bh, g.L, { alpha: clamp(a, 0, 1), size: G.bh * 0.5 });
      if (g.t < 0.5) D.text(tx, ty - G.bh / 2 - 8, '✖', { size: 18, weight: 800, color: '#ef4444', alpha: 1 - g.t / 0.5 });
    });
    // 트레이
    const tr = G.tray, active = T.ph === 'synth';
    const ptop = tr.y - tr.h / 2 - 34, pht = tr.h + 34 + 30;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(PHONE ? 20 : 150, ptop, PHONE ? VW - 40 : 604, pht, 14).fill(); }, { blur: 5, y: 2 });
    D.text(PHONE ? 32 : 164, ptop + 21, '🧱 RNA 염기 4종 — 짝이 맞는 자리에 놓아요', { size: PHONE ? 12.5 : 13.5, weight: 800, color: INK, align: 'left' });
    RNAS.forEach((L, i) => {
      const dr = S.drag && S.drag.mode === 'tr' && S.drag.L === L;
      drawTrayBlock(L, tr.xs[i], tr.y, tr.w, tr.h, S.hover === 'r' + L && active, !active || dr);
      D.text(tr.xs[i], tr.y + tr.h / 2 + 16, BN[L], { size: 11.5, weight: 800, color: '#475569' });
    });
    if (!active && T.ph === 'idle') D.label(PHONE ? VW / 2 : 452, tr.y, '▶ 전사 시작을 먼저 눌러요', { bg: '#7c3aed', size: PHONE ? 13 : 14.5 });
    // 메시지
    if (T.msgT > 0) D.label(VW / 2, 22, T.msg, { bg: T.msg.includes('짝이 되는') || T.msg.includes('같은') ? '#b45309' : '#15803d', size: PHONE ? 11.5 : 14 });
    else if (T.ph === 'synth' && T.mr.length === 0) D.label(VW / 2, 22, 'DNA가 풀렸어요! 주형(아래) 가닥과 짝이 맞는 RNA 염기를 놓아요', { bg: '#6d28d9', size: PHONE ? 11.5 : 13.5 });
    // 최종 mRNA 이름표
    if (T.ph === 'final') D.label(PHONE ? VW / 2 : 452, G.rowY - (PHONE ? 66 : 58), 'mRNA  ' + mrnaOf(T.tmpl).split('').join(' '), { bg: '#be185d', size: PHONE ? 13 : 15 });
    // 끌고 있는 염기
    if (S.drag && S.drag.mode === 'tr') block(S.drag.x, S.drag.y, tr.w, tr.h, S.drag.L, { scale: 1.12, size: 22 });
  }

  /* ======================================================
     화면 ③: 코돈 — 염기 n개로 만들 수 있는 서열의 가짓수
     ====================================================== */
  const seqsOf = (n) => { let a = ['']; for (let k = 0; k < n; k++) { const b = []; a.forEach((s) => RNAS.forEach((L) => b.push(s + L))); a = b; } return a; };
  const SEQS = { 1: seqsOf(1), 2: seqsOf(2), 3: seqsOf(3) };
  const AA = 20;
  const CDG = () => (PHONE
    ? { gx: 20, gy: 66, gw: 480, gh: 360, pill: { 1: [100, 60, 112, 20], 2: [88, 56, 112, 66], 3: [58, 38, 60, 44] }, cols: { 1: 4, 2: 4, 3: 8 }, bx: [92, 258, 424], bw: 80, base: 722, scale: 2.7, cy: 462 }
    : { gx: 14, gy: 56, gw: 456, gh: 440, pill: { 1: [100, 64, 112, 0], 2: [90, 60, 112, 84], 3: [56, 40, 56, 48] }, cols: { 1: 4, 2: 4, 3: 8 }, bx: [548, 628, 708], bw: 60, base: 470, scale: 4.5, cy: 0 });
  function pillPos(i, n) {
    const g = CDG(), p = g.pill[n], cols = g.cols[n], c = i % cols, r = Math.floor(i / cols), rows = Math.ceil(SEQS[n].length / cols);
    const W = (cols - 1) * p[2], H = (rows - 1) * (n === 1 ? 0 : (PHONE ? (n === 2 ? 66 : 44) : (n === 2 ? 84 : 48)));
    const rowSp = n === 1 ? 0 : (PHONE ? (n === 2 ? 66 : 44) : (n === 2 ? 84 : 48));
    const x0 = g.gx + g.gw / 2 - W / 2, y0 = g.gy + (g.gh - H) / 2 + (n === 1 ? 20 : 0) + (PHONE ? -4 : 6);
    return { x: x0 + c * p[2], y: y0 + r * rowSp };
  }
  function stepCd(dt) {
    const d = S.cd;
    const tot = SEQS[d.n].length;
    if (d.counting) {
      d.spawn += dt * (d.n === 1 ? 3.2 : d.n === 2 ? 11 : 34);
      if (RM) d.spawn = tot;
      if (d.spawn >= tot) { d.spawn = tot; d.counting = false; d.counted[d.n] = true; Sound.success(); d.msg = '염기 ' + d.n + '개로 만든 서열은 모두 ' + tot + '가지예요'; d.msgT = 4; updateCtl(); }
      else if (Math.floor(d.spawn) !== d.lastTick) { d.lastTick = Math.floor(d.spawn); if (d.lastTick % 3 === 0) Sound.tick(); }
    }
    [1, 2, 3].forEach((n) => { const tgt = d.filled[n] ? Math.pow(4, n) : 0; d.bar[n] = RM ? tgt : SciSim.approach(d.bar[n], tgt, dt, 5); });
    if (d.msgT > 0) d.msgT -= dt;
  }
  function drawBead(x, y, r, L) { D.sphere(x, y, r, BC[L], { gloss: r > 6, outline: SciSim.color.shade(BC[L], -0.4), outlineWidth: 1 }); if (r >= 11) D.text(x, y + r * 0.34, L, { size: r * 1.05, color: BT[L], weight: 800 }); }
  function drawCd(t) {
    const d = S.cd, g = CDG(), n = d.n, tot = SEQS[n].length;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(g.gx + g.gw / 2, 30, '염기 ' + n + '개로 만들 수 있는 서열 (구슬 ' + n + '개를 늘어놓아요)', { size: PHONE ? 14 : 17, weight: 800, color: INK });
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(g.gx, g.gy - 12, g.gw, g.gh + 24, 16).fill(); }, { blur: 6, y: 2 });
    // 빈칸 안내
    const sl = Math.floor(d.spawn), p = g.pill[n];
    if (sl === 0 && !d.counted[n]) {
      const cx = g.gx + g.gw / 2, cy = g.gy + g.gh / 2 - 20;
      for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * 72; ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, cy, 28, 0, 6.3); ctx.stroke(); ctx.restore(); D.text(x, cy + 8, '?', { size: 24, weight: 800, color: '#94a3b8' }); D.text(x, cy + 52, NUMS[i] + '자리', { size: 12.5, weight: 800, color: '#64748b' }); }
      RNAS.forEach((L, i) => drawBead(cx + (i - 1.5) * 50, cy + 100, 14, L));
      D.text(cx, cy + 142, '각 자리에 A · U · G · C 중 하나를 놓을 수 있어요', { size: PHONE ? 12.5 : 14, weight: 700, color: '#475569' });
      D.text(cx, cy + 168, '🔢 모두 만들어 세기를 눌러 볼까요?', { size: PHONE ? 12.5 : 14, weight: 800, color: '#16a34a' });
    } else {
      const showN = Math.min(tot, sl);
      for (let i = 0; i < showN; i++) {
        const q = pillPos(i, n), s = SEQS[n][i], age = d.spawn - i, sc = d.counted[n] ? 1 : smooth(age / 1.2) * (1 + 0.15 * Math.max(0, 1 - age * 2));
        ctx.save(); ctx.translate(q.x, q.y); ctx.scale(Math.max(0.05, sc), Math.max(0.05, sc));
        ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(-p[0] / 2 + 3, -p[1] / 2, p[0] - 6, p[1], p[1] / 2).fill(); rr(-p[0] / 2 + 3, -p[1] / 2, p[0] - 6, p[1], p[1] / 2).stroke();
        const r = n === 1 ? 17 : n === 2 ? 15 : 7.2, step = n === 1 ? 0 : n === 2 ? 36 : 17;
        for (let k = 0; k < n; k++) drawBead((k - (n - 1) / 2) * step, 0, r, s[k]);
        ctx.restore();
      }
      if (n === 3 && d.counted[3]) {
        // 코돈 예시
        const q = pillPos(SEQS[3].indexOf('AUG'), 3); D.ring(q.x, q.y, 24, t, { color: '#ca8a04', speed: 0.8, width: 2.5 });
      }
    }
    // 세는 숫자
    const cnt = n === 1 ? 4 : n === 2 ? 16 : 64;
    const cx2 = g.gx + g.gw - 10;
    D.label(g.gx + g.gw - 70, g.gy + g.gh + (PHONE ? 24 : 30), d.counted[n] ? '모두 ' + tot + '가지' : sl > 0 ? sl + ' / ' + tot : '0가지', { bg: d.counted[n] ? '#15803d' : '#475569', size: PHONE ? 13 : 15, pad: 12 });
    if (n === 3 && d.counted[3]) D.text(g.gx + 16, g.gy + g.gh + (PHONE ? 28 : 34), '○ = AUG : 염기 3개 묶음 한 개', { size: PHONE ? 11.5 : 13, weight: 800, color: '#a16207', align: 'left' });
    // 막대 그래프
    const bx0 = PHONE ? 20 : 490, bw0 = PHONE ? 480 : 296, by0 = PHONE ? 466 : 56, bh0 = PHONE ? 300 : 484;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(bx0, by0, bw0, bh0, 16).fill(); }, { blur: 6, y: 2 });
    D.text(bx0 + bw0 / 2, by0 + 28, '염기 개수별 서열 가짓수', { size: PHONE ? 14 : 15.5, weight: 800, color: INK });
    const base = g.base, sc2 = g.scale;
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx0 + 20, base); ctx.lineTo(bx0 + bw0 - 16, base); ctx.stroke(); ctx.restore();
    const y20 = base - AA * sc2;
    ctx.save(); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(bx0 + 16, y20); ctx.lineTo(bx0 + bw0 - 12, y20); ctx.stroke(); ctx.restore();
    D.label(bx0 + 84, y20 - 14, '아미노산 20종', { bg: '#ca8a04', size: PHONE ? 11.5 : 12.5 });
    [1, 2, 3].forEach((k, i) => {
      const x = g.bx[i], hh = d.bar[k] * sc2, on = d.filled[k], full = Math.pow(4, k);
      if (hh > 0.5) {
        const col = full >= AA ? '#22c55e' : '#f87171';
        const gr = ctx.createLinearGradient(0, base - hh, 0, base); gr.addColorStop(0, SciSim.color.shade(col, 0.25)); gr.addColorStop(1, col);
        D.shadow(() => { ctx.fillStyle = gr; rr(x - g.bw / 2, base - hh, g.bw, hh, 8).fill(); }, { blur: 4, y: 1 });
        D.text(x, base - hh - 8, String(full), { size: 17, weight: 800, color: '#14532d' });
      } else { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(x - g.bw / 2, base - 40, g.bw, 40, 8).stroke(); ctx.restore(); D.text(x, base - 14, '?', { size: 22, weight: 800, color: '#94a3b8' }); }
      D.text(x, base + 22, '염기 ' + k + '개', { size: PHONE ? 13 : 14, weight: 800, color: k === n ? '#16a34a' : '#475569' });
      if (k === n) { ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - g.bw / 2, base + 30); ctx.lineTo(x + g.bw / 2, base + 30); ctx.stroke(); ctx.restore(); }
      if (on) D.text(x, base + 44, full >= AA ? '20종 이상 ✓' : '20종 미만', { size: 11.5, weight: 800, color: full >= AA ? '#15803d' : '#b91c1c' });
    });
    if (d.filled[1] && d.filled[2] && d.filled[3]) D.label(bx0 + bw0 / 2, by0 + 56, '3개 이상 필요 → 염기 3개 = 코돈', { bg: '#15803d', size: PHONE ? 12.5 : 13.5 });
    if (d.msgT > 0) D.label(g.gx + g.gw / 2, g.gy + 8, d.msg, { bg: d.msg.includes('입력 완료') || d.msg.includes('정답') || d.msg.includes('모두') ? '#15803d' : '#b45309', size: PHONE ? 11.5 : 13 });
  }
  function cdSelect(n) { const d = S.cd; if (d.n === n && !d.counting) return; d.n = n; d.counting = false; d.spawn = d.counted[n] ? SEQS[n].length : 0; d.lastTick = -1; $('#inCnt').value = ''; Sound.click(); updateCtl(); }
  function cdCount() { const d = S.cd; if (d.counting) return; d.counting = true; d.spawn = 0; d.counted[d.n] = false; d.lastTick = -1; Sound.click(); updateCtl(); }
  function cdSubmit() {
    const d = S.cd, v = parseFloat(String($('#inCnt').value).replace(/[, ]/g, '')), ans = Math.pow(4, d.n);
    if (!isFinite(v)) { toast('숫자로 입력해요', '', 1300); return; }
    if (v === ans) { d.filled[d.n] = true; d.msg = '정답! 염기 ' + d.n + '개 → ' + ans + '가지 (입력 완료)'; d.msgT = 4; Sound.success(); if (!RM) parts.burst(PHONE ? 258 : 628, PHONE ? 600 : 300, { count: 14, speed: 150, size: 4 }); }
    else {
      d.wrong++; Sound.fail();
      d.msg = v === 4 * d.n ? '더하기가 아니라 곱해요. 자리마다 4가지를 고를 수 있어요' : '구슬을 모두 만들어 세어 봐요. 자리마다 A · U · G · C 4가지예요'; d.msgT = 4;
    }
    updateCtl();
  }

  /* ======================================================
     화면 ④-2: 세포마다 필요한 유전자만 전사돼요
     ====================================================== */
  const GENES = [
    { id: 'ins', name: '인슐린 유전자', on: { pan: true, mus: false } },
    { id: 'act', name: '액틴 유전자 (근육 수축 단백질)', on: { pan: false, mus: true } },
    { id: 'resp', name: '세포호흡 효소 유전자', on: { pan: true, mus: true } },
  ];
  const CELLS = [{ id: 'pan', name: '이자 세포', hint: '혈당을 조절하는 호르몬을 분비해요', col: '#f59e0b' }, { id: 'mus', name: '근육 세포', hint: '수축해서 몸을 움직여요', col: '#ef4444' }];
  const CLG = (i) => (PHONE ? { x: 10, y: 40 + i * 372, w: 500, h: 360 } : { x: 14 + i * 392, y: 44, w: 380, h: 500 });
  function drawCells(t) {
    const C = S.cells;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 28, '두 세포의 DNA는 똑같아요 — 그런데 전사되는 유전자는?', { size: PHONE ? 13.5 : 17.5, weight: 800, color: INK });
    CELLS.forEach((cell, i) => {
      const L = CLG(i), sel = C.sel === cell.id, seen = C.seen[cell.id], hv = S.hover === 'z' + i;
      D.shadow(() => { ctx.fillStyle = sel ? '#f0fdf4' : '#fff'; rr(L.x, L.y - (hv ? 2 : 0), L.w, L.h, 18).fill(); }, { blur: sel ? 12 : 6, y: sel ? 5 : 2 });
      ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#16a34a' : '#d7e3da'; rr(L.x, L.y - (hv ? 2 : 0), L.w, L.h, 18).stroke();
      // 세포 그림
      const ex = PHONE ? L.x + 110 : L.x + L.w / 2, ey = L.y + (PHONE ? 84 : 112), erx = PHONE ? 84 : 124, ery = PHONE ? 58 : 80;
      const cg = ctx.createRadialGradient(ex - 20, ey - 20, 8, ex, ey, erx); cg.addColorStop(0, '#fffbe6'); cg.addColorStop(1, '#fde68a');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(ex, ey, erx, ery, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = cell.col; ctx.lineWidth = 4.5; ctx.stroke();
      const nr = PHONE ? 30 : 42;
      ctx.fillStyle = '#ddd6fe'; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, nr, 0, 6.3); ctx.fill(); ctx.stroke();
      drawHelix(ex, ey, nr * 1.4, 10, t, { phase: t, scale: 1 });
      D.text(PHONE ? L.x + 210 : ex, PHONE ? L.y + 70 : ey + ery + 28, (i ? '💪 ' : '🧪 ') + cell.name, { size: PHONE ? 17 : 19, weight: 800, color: '#14532d', align: PHONE ? 'left' : 'center' });
      D.text(PHONE ? L.x + 210 : ex, PHONE ? L.y + 94 : ey + ery + 50, cell.hint, { size: PHONE ? 12 : 13, weight: 700, color: '#64748b', align: PHONE ? 'left' : 'center' });
      // 유전자 목록
      const gy0 = L.y + (PHONE ? 152 : 262), rowH = PHONE ? 62 : 72, bx = L.x + 18, bw = L.w - 36;
      GENES.forEach((gn, k) => {
        const y = gy0 + k * rowH, on = gn.on[cell.id];
        D.text(bx, y + 4, gn.name, { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155', align: 'left' });
        ctx.save(); ctx.fillStyle = seen ? (on ? '#22c55e' : '#d1d5db') : '#e2e8f0'; rr(bx, y + 14, bw - (PHONE ? 112 : 110), 22, 11).fill(); ctx.restore();
        if (seen && on) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(bx + 6, y + 18, bw - (PHONE ? 124 : 122), 6, 3).fill(); ctx.restore(); }
        D.label(bx + bw - (PHONE ? 44 : 53), y + 25, seen ? (on ? 'mRNA 만드는 중' : '꺼져 있음') : '? 눌러서 보기', { bg: seen ? (on ? '#15803d' : '#9ca3af') : '#94a3b8', size: PHONE ? 11 : 12 });
        if (seen && on && !RM && Math.random() < 0.05) parts.emit({ x: bx + bw - (PHONE ? 100 : 118), y: y + 25, vx: rnd(30, 60), vy: rnd(-25, 25), life: 0.9, size: 3.4, color: '#ec4899', shape: 'circle', gravity: 0 });
      });
      if (!seen) D.text(L.x + L.w / 2, L.y + L.h - 18, '👆 이 세포를 눌러서 전사되는 유전자를 살펴봐요', { size: PHONE ? 11.5 : 13, weight: 800, color: '#16a34a' });
      if (sel) D.label(L.x + L.w - 54, L.y + 20, '✔ 선택', { bg: '#16a34a', size: 12.5 });
    });
    if (C.msgT > 0) D.label(VW / 2, PHONE ? 764 : 536, C.msg, { bg: '#b45309', size: PHONE ? 11.5 : 13 });
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { cell: '🔬 정보의 흐름', tr: '📝 전사 과정', codon: '🔢 코돈', cells: '🧫 세포마다 달라요' };
  const DEFSUB = { cell: 'move', tr: '', codon: '', cells: '' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub != null && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub != null ? sub : DEFSUB[m]; S.drag = null; S.hover = '';
    parts.clear(); updateCtl();
  }
  function ensure(m, sub) { if (S.mode !== m || (sub != null && S.sub !== sub)) setMode(m, sub); }
  const trCount = () => (S.tr ? S.tr.mr.length : 0);
  function updateCtl() {
    const T = S.tr, d = S.cd, f = S.cell.flow;
    const sub = (S.mode === 'cell' && game && game.free) ? (S.sub || 'move') : S.sub;
    const key = S.mode + (sub ? ':' + sub : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(S.mode)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#modeSeg').hidden = !(game && game.free);
    $('#trSegBox').hidden = !(S.mode === 'tr' && game && game.free);
    $('#cellSegBox').hidden = !(S.mode === 'cell' && game && game.free);
    $$('#cellSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.sub));
    $$('#trSeg button').forEach((b) => b.classList.toggle('on', T && +b.dataset.n === T.n));
    $('#oFlow').textContent = f.slots.filter(Boolean).length + ' / 3';
    $('#bDna').disabled = S.cell.dna.st !== 'idle';
    $('#bRna').disabled = S.cell.rna.st === 'go';
    if (T) {
      $('#oTr').textContent = T.mr.length + ' / ' + T.n;
      $('#trHead').textContent = '📝 mRNA 합성';
      const st = $('#bStart'); st.disabled = T.ph !== 'idle'; st.textContent = T.ph === 'idle' ? '▶ 전사 시작' : '✔ 전사 시작함';
      $('#trNote').textContent = T.ph === 'idle' ? '전사를 시작하면 DNA가 풀려요. RNA 염기를 눌러 끌어다 짝이 맞는 자리에 놓아요.'
        : T.ph === 'opening' ? 'RNA 중합 효소가 DNA 이중 가닥을 풀고 있어요…'
        : T.ph === 'synth' ? '주형(아래) 가닥의 염기와 짝이 맞는 RNA 염기를 왼쪽 자리부터 차례로 놓아요.'
        : T.ph === 'final' ? 'mRNA가 리보솜에 도착했어요. ↺ 다시 하기로 한 번 더 해 봐도 좋아요.' : 'mRNA가 완성되어 떨어져 나가요…';
    }
    $$('#cnSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.n === d.n));
    $('#cnHead').textContent = '염기 ' + d.n + '개 가짓수 입력';
    $('#bCount').disabled = !!d.counting; $('#bCount').textContent = d.counting ? '세는 중…' : (d.counted[d.n] ? '🔢 다시 세어 보기' : '🔢 모두 만들어 세기');
    $('#cnNote').innerHTML = d.filled[d.n] ? '✅ 염기 ' + d.n + '개: <b>' + Math.pow(4, d.n) + '가지</b> 입력 완료' : '서열을 모두 만들어 센 뒤 가짓수를 입력해요.';
  }
  $('#bDna').addEventListener('click', () => { const d = S.cell.dna; if (d.st !== 'idle') return; Sound.click(); d.st = 'go'; d.t = 0; d.sh = 0; d.pressed = false; updateCtl(); });
  $('#bRna').addEventListener('click', () => { const r = S.cell.rna; if (r.st === 'go') return; Sound.click(); r.st = 'go'; r.t = 0; r.s = 0; r.done = false; S.cell.prot = 0; updateCtl(); });
  $('#bCellReset').addEventListener('click', () => { Sound.click(); resetCell(); updateCtl(); });
  $('#bFlowReset').addEventListener('click', () => { Sound.click(); resetFlow(); updateCtl(); });
  $('#cellSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setMode('cell', b.dataset.s); } });
  $('#bStart').addEventListener('click', startTr);
  $('#bTrReset').addEventListener('click', () => { Sound.click(); S.drag = null; newTr(S.tr.n); updateCtl(); });
  $('#trSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.drag = null; newTr(+b.dataset.n); S.fade = 0.8; updateCtl(); } });
  $('#cnSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) cdSelect(+b.dataset.n); });
  $('#bCount').addEventListener('click', cdCount);
  $('#bCnt').addEventListener('click', cdSubmit);
  $('#inCnt').addEventListener('keydown', (e) => { if (e.key === 'Enter') cdSubmit(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* ---------- 포인터 ---------- */
  function trayHit(p) {
    const G = trg(S.tr.n), tr = G.tray;
    for (let i = 0; i < 4; i++) if (Math.abs(p.x - tr.xs[i]) <= tr.w / 2 + 6 && Math.abs(p.y - tr.y) <= tr.h / 2 + 8) return RNAS[i];
    return '';
  }
  function flowHit(p) {
    const L = flowLayout(), f = S.cell.flow;
    for (let i = 0; i < 3; i++) if (Math.abs(p.x - L.sx[i]) <= L.sw / 2 && Math.abs(p.y - L.sy) <= L.sh / 2 + 4) return { k: 's', i };
    for (let i = 0; i < 3; i++) if (Math.abs(p.x - L.tx[i]) <= L.tw / 2 && Math.abs(p.y - L.ty) <= L.th / 2 + 4) return { k: 'c', id: f.order[i], i };
    return null;
  }
  const zoneHit = (p) => { for (let i = 0; i < 2; i++) { const L = CLG(i); if (p.x >= L.x && p.x <= L.x + L.w && p.y >= L.y && p.y <= L.y + L.h) return i; } return -1; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'cell' && S.sub === 'flow') {
        const h = flowHit(p); if (!h) return false;
        if (h.k === 's') flowSlotTap(h.i); else flowTap(h.id);
        return false;
      }
      if (S.mode === 'tr') {
        const L = trayHit(p); if (!L) return false;
        if (S.tr.ph !== 'synth') { showHint(S.tr.ph === 'idle' ? '먼저 ▶ 전사 시작을 눌러 DNA를 풀어요' : (S.tr.ph === 'opening' ? 'DNA가 다 풀릴 때까지 잠깐 기다려요' : '전사가 끝났어요. ↺ 다시 하기로 한 번 더 해 봐요'), 2600); return false; }
        S.drag = { mode: 'tr', L, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true;
      }
      if (S.mode === 'cells') { const i = zoneHit(p); if (i >= 0) { const id = CELLS[i].id; S.cells.sel = id; S.cells.seen[id] = true; Sound.click(); updateCtl(); } return false; }
      return false;
    },
    move(p) { const d = S.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null;
      if (d.mode === 'tr') {
        const T = S.tr, G = trg(T.n), k = T.mr.length, nx = G.x(Math.min(k, T.n - 1));
        if (!d.moved) { const i = RNAS.indexOf(d.L); trAttempt(d.L, G.tray.xs[i], G.tray.y); return; }
        // 놓은 위치(포인터)가 mRNA 자리 줄 근처인가?
        if (Math.abs(p.y - G.yR) <= 52 && p.x >= G.x(0) - G.sp * 0.6 && p.x <= G.x(T.n - 1) + G.sp * 0.6) {
          let near = 0, best = 1e9; for (let i = 0; i < T.n; i++) { const dd = Math.abs(p.x - G.x(i)); if (dd < best) { best = dd; near = i; } }
          if (near === k) trAttempt(d.L, p.x, p.y);
          else { T.msg = near < k ? '그 자리는 이미 채워졌어요. 다음 빈 자리(점선)에 놓아요' : 'mRNA는 왼쪽부터 차례로 만들어져요. 점선으로 깜빡이는 자리에 놓아요'; T.msgT = 3; Sound.fail(); }
        }
      }
    },
    hover(p) {
      if (S.mode === 'cell' && S.sub === 'flow') { const h = flowHit(p); S.hover = h && h.k === 'c' ? 'f' + h.id : ''; return h ? 'pointer' : 'default'; }
      if (S.mode === 'tr') { const L = trayHit(p); S.hover = L ? 'r' + L : ''; return L ? 'grab' : 'default'; }
      if (S.mode === 'cells') { const i = zoneHit(p); S.hover = i >= 0 ? 'z' + i : ''; return i >= 0 ? 'pointer' : 'default'; }
      S.hover = ''; return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'cell' && S.sub === 'move') {
      const C = S.cell;
      L1 = '핵 속 DNA'; a = C.dna.tried ? '핵 밖으로 못 나가요' : '아직 시험 전';
      L2 = 'mRNA'; b = C.rna.done ? '리보솜에 도착' : C.rna.st === 'go' ? '이동 중…' : '아직 시험 전';
      L3 = '리보솜'; c = C.prot > 0 ? '단백질 ' + C.prot + '개 연결' : '대기 중';
    } else if (S.mode === 'cell') {
      const f = S.cell.flow;
      L1 = '①'; a = f.slots[0] ? FLOWC[f.slots[0]].name : '—'; L2 = '②'; b = f.slots[1] ? FLOWC[f.slots[1]].name : '—'; L3 = '③'; c = f.slots[2] ? FLOWC[f.slots[2]].name : '—';
    } else if (S.mode === 'tr') {
      const T = S.tr;
      L1 = '주형 가닥'; a = T.tmpl.match(/.{1,3}/g).join(' ');
      L2 = '만든 mRNA'; b = T.mr.length ? T.mr.map((x) => x.L).join('').match(/.{1,3}/g).join(' ') : '—';
      L3 = '짝짓기 실패'; c = T.wrong + '번';
    } else if (S.mode === 'codon') {
      const d = S.cd;
      L1 = '염기 개수'; a = d.n + '개';
      L2 = '가능한 서열'; b = d.counted[d.n] ? Math.pow(4, d.n) + '가지' : (d.spawn > 0 ? Math.floor(d.spawn) + '가지 (세는 중)' : '?');
      L3 = '아미노산'; c = '20종';
    } else {
      const C = S.cells;
      L1 = '고른 세포'; a = C.sel ? CELLS.find((x) => x.id === C.sel).name : '—';
      L2 = '살펴본 세포'; b = Object.values(C.seen).filter(Boolean).length + ' / 2';
      L3 = 'DNA'; c = '두 세포 똑같음';
    }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetCd() { const d = S.cd; d.n = 3; d.counted = { 1: false, 2: false, 3: false }; d.filled = { 1: false, 2: false, 3: false }; d.spawn = 0; d.counting = false; d.bar = { 1: 0, 2: 0, 3: 0 }; d.msgT = 0; d.wrong = 0; d.lastTick = -1; $('#inCnt').value = ''; }
  function resetCells() { const C = S.cells; C.sel = ''; C.seen = { pan: false, mus: false }; C.msgT = 0; }
  function enterLevel(li) {
    S.epoch++; S.drag = null;
    if (li === 0) { resetCell(); resetFlow(); setMode('cell', 'move'); }
    else if (li === 1) { newTr(6); setMode('tr'); }
    else if (li === 2) { resetCd(); S.cd.n = 1; setMode('codon'); }
    else { newTr(12); resetCells(); setMode('tr'); }
  }
  const levels = [
    {
      title: '정보의 흐름: 세포 속 설계도와 복사본', short: '정보의 흐름', icon: '🔬', phase: '관찰',
      features: ['cell'],
      intro: '<p class="si-q">❓ 탐구 질문: DNA는 핵 밖으로 나가지 못하는데, 단백질을 만드는 정보는 어떻게 전달될까?</p>' +
        '<div class="si-link">🔗 <b>앞에서 배운 것</b>: DNA는 A–T, G–C 염기쌍을 가진 이중 가닥이고 염기 서열이 유전 정보예요(통합과학 2단원). 단백질은 아미노산이 이어져 만들어져요. 중학교에서는 DNA가 핵 속 염색체에 들어 있다고 배웠어요.</div>' +
        '<p>생명 시스템을 유지하려면 세포 속 <b>정보</b>도 알맞게 흘러야 해요. 세포가 <b>유전자</b>로부터 <b>단백질</b>을 만드는 과정을 따라가 봐요. 먼저 핵 속의 DNA와 mRNA를 핵 밖으로 내보내 보며 정보가 어떻게 전달되는지 관찰해요.</p>',
      setup() { enterLevel(0); },
      recap: '유전 정보는 DNA(핵 속 원본) → mRNA(복사본) → 단백질 순서로 흘러요. DNA는 핵 밖으로 나가지 못하고 mRNA만 핵공을 지나 리보솜으로 가요.',
      summary: '<ul><li>세포 속 정보의 흐름: <b>DNA(유전자) → mRNA → 단백질</b>.</li><li>DNA는 핵 속에 있고 <b>핵공</b>을 지나지 못해요. 필요한 유전자 부분만 <b>mRNA</b>로 복사해서 핵 밖으로 보내요.</li><li>mRNA는 세포질의 <b>리보솜</b>으로 가서 단백질 합성에 쓰여요.</li><li>비유: DNA = 도서관의 원본 참고서, mRNA = 복사본, 리보솜 = 공장.</li><li><b>유전자</b> = 단백질을 만드는 정보가 담긴 DNA의 특정한 염기 서열 부분.</li></ul>',
      missions: [
        {
          title: '핵공 시험: DNA와 mRNA',
          goal: '<b>🧬 DNA 내보내기</b>와 <b>📄 mRNA 내보내기</b>를 눌러, 핵 밖으로 나갈 수 있는 것이 무엇인지 확인하세요.',
          hint: '두 버튼을 모두 눌러요. DNA는 어떻게 되는지, mRNA는 어디로 가는지 지켜봐요.',
          setup() { ensure('cell', 'move'); },
          check: () => S.cell.dna.tried && S.cell.rna.done, hold: 0.6,
          status: () => mark(S.cell.dna.tried) + ' DNA 내보내기 시험 · ' + mark(S.cell.rna.done) + ' mRNA 이동 완료',
          explain: '핵 속 DNA는 너무 커서 핵공을 지나지 못해요. 대신 필요한 유전자 부분을 <b>mRNA</b>로 <b>복사</b>하면, 작은 mRNA는 핵공을 지나 세포질의 <b>리보솜</b>으로 가서 단백질을 만들어요. 도서관의 원본 참고서는 밖으로 가지고 나갈 수 없지만, 필요한 쪽을 복사해 공장으로 보내는 것과 같아요.',
        },
        {
          title: '정보 흐름 순서 맞추기',
          goal: '카드 3장을 눌러 <b>정보가 흐르는 순서</b>대로 ①②③ 칸을 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '원본 → 복사본 → 결과물 순서예요. 핵 속에 있는 것, 핵 밖으로 나가는 것, 마지막에 만들어지는 것을 떠올려요.',
          manual: true,
          setup() { ensure('cell', 'flow'); },
          check: () => flowCheck(),
          explain: '정보는 <b>DNA → mRNA → 단백질</b> 순서로 흘러요. 핵 속 DNA의 유전자에서 mRNA가 만들어지는 과정이 <b>전사</b>, mRNA의 정보로 단백질이 만들어지는 과정이 <b>번역</b>이에요. 이번 차시에서는 전사를, 다음 차시에서는 번역을 배워요.',
        },
        {
          type: 'quiz', title: '원본은 핵 안에, 복사본만 밖으로',
          goal: 'DNA 원본은 핵 안에 두고 <b>mRNA 복사본</b>만 핵 밖으로 내보내 단백질을 만드는 방식의 <b>장점</b>은?',
          setup() { ensure('cell', 'flow'); },
          choices: ['원본 DNA를 핵 속에 안전하게 보존하면서 필요한 유전자 정보만 복사해 쓸 수 있다', 'DNA가 핵공을 지날 만큼 작아서 어디든 이동할 수 있다', 'mRNA가 DNA보다 훨씬 오래 보존되어 자손에게 유전 정보를 전달한다', '리보솜이 핵 속에 있어서 DNA를 직접 읽을 수 있다'],
          answer: 0,
          feedback: ['', '앞의 실험에서 DNA는 핵공을 지나지 못했어요.', 'mRNA는 필요할 때 만들어 쓰고 곧 분해되는 복사본이에요. 유전 정보를 자손에게 전달하는 것은 DNA예요.', '리보솜은 핵 밖 세포질에 있어요. 그래서 mRNA가 정보를 전달해 줘요.'],
          explain: '원본(DNA)은 핵 안에서 안전하게 보존하고, 필요한 부분만 복사한 <b>mRNA</b>를 핵 밖으로 보내 쓰면 원본이 손상될 위험이 없어요. 도서관의 원본 참고서를 보존하면서 복사본으로 공부하는 것과 같아요.',
        },
      ],
    },
    {
      title: '전사 과정: DNA에서 mRNA 만들기', short: '전사 과정', icon: '📝', phase: '모형',
      features: ['tr'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 핵 속 DNA는 핵 밖으로 나가지 못하고, 복사본인 mRNA가 리보솜으로 간다는 것을 봤어요. 그 복사본은 어떻게 만들어질까요?</div>' +
        '<p><b>전사</b>는 핵 안에서 DNA의 유전자 부분을 mRNA로 옮겨 적는 과정이에요. <b>RNA 중합 효소</b>가 DNA 이중 가닥을 풀고, 한쪽 가닥(<b>주형 가닥</b>)을 따라 짝이 맞는 RNA 염기를 이어 붙여요. 직접 mRNA를 만들어 봐요. (RNA는 한 가닥이고, T 대신 <b>U</b>가 있어요.)</p>',
      setup() { enterLevel(1); },
      recap: '전사는 DNA의 한쪽 가닥(주형)을 본떠 mRNA를 만드는 과정이에요. 염기 짝은 A–U, T–A, G–C, C–G이고 RNA에는 T 대신 U가 있어요.',
      summary: '<table class="mini"><tr><th>DNA 주형 가닥</th><th>A</th><th>T</th><th>G</th><th>C</th></tr><tr><th>짝이 되는 mRNA 염기</th><td>U</td><td>A</td><td>C</td><td>G</td></tr></table><ul><li><b>전사</b>(핵 안): DNA 이중 가닥의 유전자 부분이 풀리고, <b>RNA 중합 효소</b>가 한쪽 <b>주형 가닥</b>에 짝이 맞는 RNA 뉴클레오타이드를 이어 붙여 mRNA를 만들어요.</li><li>RNA는 <b>한 가닥</b>이고 염기 T 대신 <b>U</b>(유라실)를 가져요.</li><li>완성된 mRNA는 DNA에서 떨어져 나와 <b>핵공</b>을 지나 세포질로 나가요. DNA는 다시 닫혀요.</li><li>예) 주형 가닥 TACGGT → mRNA AUGCCA</li></ul>',
      missions: [
        {
          title: '전사 시작',
          goal: '<b>▶ 전사 시작</b>을 눌러 RNA 중합 효소가 DNA 이중 가닥을 푸는 모습을 지켜보세요.',
          hint: '오른쪽 패널의 ▶ 전사 시작 버튼을 눌러요. DNA가 지퍼처럼 열려요.',
          setup() { ensure('tr'); },
          check: () => S.tr.opened || S.tr.ph === 'synth' || S.tr.done, hold: 0.4,
          status: () => mark(S.tr.started) + ' 전사 시작 · ' + mark(S.tr.opened || S.tr.done) + ' DNA가 풀림',
          explain: '전사가 시작되면 <b>RNA 중합 효소</b>가 DNA의 유전자 부분을 풀어 두 가닥을 떼어 놓아요. 이때 mRNA를 만들 때 본이 되는 쪽(아래 가닥)이 <b>주형 가닥</b>이에요. DNA 전체가 풀리는 것이 아니라 필요한 유전자 부분만 풀려요.',
        },
        {
          title: 'mRNA 합성하기 (주형 TACGGT)',
          goal: '주형 가닥 <b>T A C G G T</b>와 짝이 맞는 RNA 염기를 <b>왼쪽 자리부터 차례로</b> 놓아 mRNA를 끝까지 만드세요.',
          hint: 'DNA의 A는 RNA의 U와, T는 A와, G는 C와, C는 G와 짝이 돼요. 틀리면 튕겨 나가니 여러 번 시도해 봐도 좋아요.',
          setup() { ensure('tr'); },
          check: () => S.tr.n === 6 && S.tr.done, hold: 0.6,
          status: () => mark(S.tr.opened || S.tr.done) + ' 전사 시작 · ' + mark(S.tr.done) + ' mRNA ' + S.tr.mr.length + ' / ' + S.tr.n + ' 염기 · 틀린 짝 ' + S.tr.wrong + '번',
          explain: '주형 가닥 TACGGT를 본떠 <b>AUGCCA</b>가 만들어졌어요: T→A, A→U, C→G, G→C, G→C, T→A. 완성된 mRNA는 DNA에서 떨어져 나와 핵공을 지나 세포질의 리보솜으로 가고, DNA 두 가닥은 다시 붙어요.',
        },
        {
          type: 'quiz', title: '주형 TAC에서 만들어지는 mRNA',
          goal: 'DNA 주형 가닥의 염기 서열이 <b>T – A – C</b>일 때, 전사로 만들어지는 mRNA의 염기 서열은?',
          setup() { ensure('tr'); },
          choices: ['A – U – G', 'A – T – G', 'U – A – C', 'T – A – C'],
          answer: 0,
          feedback: ['', 'A–T 짝은 DNA끼리 맞는 규칙이에요. RNA에는 T가 없고 대신 U가 있어요.', '주형 가닥을 그대로 베끼는 것이 아니라 짝이 되는 염기(T→A, A→U, C→G)를 붙여요.', 'RNA에는 T가 없어요. 그리고 주형 가닥과 같은 서열이 아니라 짝이 되는 서열이에요.'],
          explain: '주형 T는 A, 주형 A는 <b>U</b>, 주형 C는 G와 짝이 되어 <b>AUG</b>가 돼요. RNA에서는 DNA의 T(타이민) 대신 <b>U(유라실)</b>가 A와 짝을 이뤄요.',
        },
      ],
    },
    {
      title: '코돈: 염기 몇 개가 아미노산 하나를 정할까?', short: '코돈', icon: '🔢', phase: '탐구',
      features: ['codon'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> DNA의 정보가 mRNA의 염기 서열(A, U, G, C)로 옮겨 적혔어요. 이 서열이 단백질의 아미노산 서열을 정해요. 그런데 염기는 4종, 단백질을 이루는 아미노산은 <b>20종</b>이에요.</div>' +
        '<p>염기를 몇 개씩 묶어야 아미노산 20종을 구별할 수 있을까요? 염기 1개, 2개, 3개로 만들 수 있는 서열의 가짓수를 구슬로 세어 봐요.</p>',
      setup() { enterLevel(2); },
      recap: '염기 1개로는 4가지, 2개로는 16가지, 3개로는 64가지를 만들 수 있어요. 아미노산 20종을 나타내려면 염기가 3개 이상 필요해요. 염기 3개 묶음을 코돈이라고 해요.',
      summary: '<table class="mini"><tr><th>염기 개수</th><th>1개</th><th>2개</th><th>3개</th></tr><tr><th>서열 가짓수</th><td>4</td><td>4×4 = 16</td><td>4×4×4 = 64</td></tr></table><ul><li>아미노산은 <b>20종</b>이므로 가짓수가 20 이상이려면 염기가 <b>최소 3개</b> 필요해요.</li><li>mRNA에서 아미노산 하나를 정하는 <b>염기 3개 묶음</b>을 <b>코돈</b>이라고 해요. (예: AUG)</li><li>코돈은 64가지로 아미노산 20종보다 많아서, 같은 아미노산을 정하는 코돈이 여러 개 있기도 해요.</li></ul>',
      missions: [
        {
          title: '서열 가짓수 채우기',
          goal: '염기 <b>1개, 2개, 3개</b>로 만들 수 있는 서열의 가짓수를 각각 구해 입력하세요. (<b>🔢 모두 만들어 세기</b>로 확인할 수 있어요.)',
          hint: '자리마다 A, U, G, C 중 하나를 고를 수 있어요. 2개짜리는 4 × 4, 3개짜리는 4 × 4 × 4예요. 염기 개수를 바꿔 가며 입력해요.',
          setup() { ensure('codon'); },
          check: () => S.cd.filled[1] && S.cd.filled[2] && S.cd.filled[3], hold: 0.6,
          status: () => mark(S.cd.filled[1]) + ' 1개: ' + (S.cd.filled[1] ? 4 : '?') + ' · ' + mark(S.cd.filled[2]) + ' 2개: ' + (S.cd.filled[2] ? 16 : '?') + ' · ' + mark(S.cd.filled[3]) + ' 3개: ' + (S.cd.filled[3] ? 64 : '?'),
          explain: '염기 1개는 <b>4가지</b>, 2개는 4×4 = <b>16가지</b>, 3개는 4×4×4 = <b>64가지</b>예요. 아미노산 20종을 구별하려면 가짓수가 20 이상이어야 하므로 염기는 <b>최소 3개</b>가 필요해요. 이렇게 아미노산 하나를 정하는 mRNA의 염기 3개 묶음을 <b>코돈</b>이라고 해요.',
        },
        {
          type: 'quiz', title: '염기 2개로는 부족한 까닭',
          goal: '염기 <b>2개</b>씩 묶는 방식으로는 아미노산 20종을 모두 나타낼 수 없는 까닭은?',
          setup() { ensure('codon'); },
          choices: ['염기 2개로 만들 수 있는 서열이 16가지뿐이어서 20종보다 적기 때문이다', '염기가 2종뿐이기 때문이다', '2개짜리 묶음은 코돈이 아니라 안티코돈이기 때문이다', '아미노산이 16종뿐이기 때문이다'],
          answer: 0,
          feedback: ['', '염기는 A, U, G, C 4종이에요. 2개씩 묶으면 4×4 = 16가지가 돼요.', '코돈과 안티코돈은 염기 개수가 아니라 어디에 있는지(mRNA / tRNA)로 구분해요. 개수 문제와는 관계없어요.', '단백질을 이루는 아미노산은 20종이에요. 서열 가짓수(16)가 부족한 거예요.'],
          explain: '염기 2개로는 4×4 = 16가지만 만들 수 있어서 아미노산 20종을 하나씩 대응시킬 수 없어요. 염기 3개로 묶으면 64가지로 충분해요. 이것이 아미노산 하나를 정하는 코돈이 염기 <b>3개</b>인 까닭이에요.',
        },
      ],
    },
    {
      title: '전사 연습과 세포의 선택', short: '전사 연습', icon: '✍️', phase: '적용',
      features: ['cells'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> mRNA의 염기 3개 묶음(코돈)이 아미노산 1개를 정한다는 것을 알았어요.</div>' +
        '<p>이제 <b>유전자 하나 전체</b>를 전사해 봐요. 주형 가닥 염기 12개를 코돈(3개씩) 단위로 읽으며 mRNA를 만들어요. 그다음 사람의 세포마다 <b>어떤 유전자가 전사되는지</b>도 살펴봐요.</p>',
      setup() { enterLevel(3); },
      recap: '전사는 유전자 서열을 본떠 mRNA를 만드는 과정이에요. 하나의 DNA에는 수많은 유전자가 있고, 세포마다 필요한 유전자만 전사돼요.',
      summary: '<ul><li>주형 가닥 <b>TAC CTT GGT ACT</b> → mRNA <b>AUG GAA CCA UGA</b> (코돈 4개).</li><li><b>유전자</b>는 DNA 전체가 아니라 단백질 정보를 가진 DNA의 일부 염기 서열이에요. 한 DNA에 수많은 유전자가 있어요.</li><li>한 사람의 모든 세포는 같은 DNA를 가지지만, 세포마다 <b>필요한 유전자만 전사</b>돼요. (인슐린 유전자 → 이자의 일부 세포, 액틴 유전자 → 근육 세포)</li><li>전사로 만든 mRNA는 핵공을 지나 리보솜으로 가서 번역에 쓰여요(다음 차시).</li></ul>',
      missions: [
        {
          title: '주형 TAC CTT GGT ACT 전사하기',
          goal: '<b>▶ 전사 시작</b> 후, 주형 가닥 염기 12개(<b>TAC CTT GGT ACT</b>)와 짝이 맞는 RNA 염기를 차례로 놓아 mRNA를 완성하세요.',
          hint: 'T→A, A→U, C→G, G→C 예요. 3개씩 끊어 읽으면 코돈 4개가 돼요. 염기를 눌러도 다음 빈 자리에 놓여요.',
          setup() { ensure('tr'); },
          check: () => S.tr.n === 12 && S.tr.done, hold: 0.6,
          status: () => mark(S.tr.opened || S.tr.done) + ' 전사 시작 · ' + mark(S.tr.done) + ' mRNA ' + S.tr.mr.length + ' / ' + S.tr.n + ' 염기 · 틀린 짝 ' + S.tr.wrong + '번',
          explain: '주형 가닥 TAC CTT GGT ACT에서 <b>AUG GAA CCA UGA</b>가 만들어졌어요. 3개씩 끊어 읽으면 코돈 4개예요. AUG는 번역을 시작하는 코돈이고, UGA는 번역을 끝내라는 신호예요. 다음 차시에서 이 mRNA의 코돈을 읽어 단백질을 만들어 봐요.',
        },
        {
          title: '인슐린 mRNA를 만드는 세포 고르기',
          goal: '이자 세포와 근육 세포를 눌러 어떤 유전자가 전사되는지 살펴본 뒤, <b>인슐린 mRNA를 만드는 세포</b>를 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '두 세포 모두 눌러서 유전자별 상태(전사 중 / 꺼짐)를 비교해 봐요. 인슐린은 혈당을 낮추는 호르몬이에요.',
          manual: true,
          setup() { ensure('cells'); },
          check() {
            const C = S.cells;
            if (!C.sel) return '두 세포를 눌러 <b>전사되는 유전자</b>를 살펴본 뒤, 하나를 골라요.';
            if (C.sel === 'pan') return true;
            return '근육 세포에도 인슐린 유전자(DNA)는 들어 있어요. 하지만 이 세포에서는 그 유전자가 꺼져 있어 mRNA가 만들어지지 않아요. 다른 세포도 살펴봐요.';
          },
          explain: '두 세포의 DNA는 똑같아서 인슐린 유전자도, 액틴 유전자도 모두 들어 있어요. 하지만 세포마다 <b>필요한 유전자만 전사</b>돼요. 인슐린 유전자는 이자의 일부 세포(β세포)에서만, 액틴 유전자는 근육 세포에서 전사돼요. 세포호흡 효소 유전자처럼 모든 세포에 필요한 유전자는 어디서나 전사돼요.',
        },
        {
          type: 'quiz', title: '유전자와 DNA',
          goal: '<b>유전자</b>와 <b>DNA</b>의 관계로 옳은 것은?',
          setup() { ensure('cells'); },
          choices: ['DNA 전체가 하나의 유전자이다', '유전자는 단백질을 만드는 정보를 가진 DNA의 특정한 염기 서열 부분이며, 한 DNA에 수많은 유전자가 있다', '유전자는 mRNA에 들어 있고 DNA에는 없다', '세포마다 가진 DNA가 서로 달라서 만드는 단백질이 다르다'],
          answer: 1,
          feedback: ['DNA에는 사람의 경우 수만 개의 유전자가 들어 있어요. DNA 전체가 하나의 유전자는 아니에요.', '', 'mRNA는 유전자를 복사해서 만든 것이에요. 유전자는 DNA의 일부분이에요.', '한 사람의 세포는 모두 같은 DNA를 가져요. 세포마다 전사되는 유전자가 달라서 만드는 단백질이 달라요.'],
          explain: '<b>유전자</b>는 DNA 중 특정 단백질의 정보를 가진 일부 염기 서열이에요. 한 DNA에 수많은 유전자가 있고, 같은 DNA를 가진 세포라도 필요한 유전자만 전사해서 서로 다른 단백질을 만들어요.',
        },
      ],
    },
  ];

  newTr(6); resetCell(); resetFlow(); resetCd(); resetCells();
  game = SciSim.game({
    simId: 'h1-transcription', mount: '#game', badge: '전사 박사', homeHref: '../../index.html#h1a',
    featureLabels: { cell: '🔬 세포 단면 · 핵공 시험 · 정보 흐름 카드', tr: '📝 DNA 풀림 · RNA 염기 4종 · 전사 모형', codon: '🔢 염기 개수별 서열 구슬 · 가짓수 막대그래프', cells: '🧫 두 세포의 유전자 전사 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'cell') stepCell(dt);
    else if (S.mode === 'tr') stepTr(dt);
    else if (S.mode === 'codon') stepCd(dt);
    else if (S.cells.msgT > 0) S.cells.msgT -= dt;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'cell') drawCell(t);
    else if (S.mode === 'tr') drawTr(t);
    else if (S.mode === 'codon') drawCd(t);
    else drawCells(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, enterLevel, updateCtl, newTr, trg, startTr, trAttempt, cdSelect, cdCount, trayHit, flowLayout, flowTap, CG, CLG, mrnaOf,
    fillTr() { const T = S.tr; for (let k = T.mr.length; k < T.n; k++) trAttempt(PAIR[T.tmpl[k]], 0, 0); },
  };
})();
