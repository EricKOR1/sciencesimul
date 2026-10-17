/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 핵산과 DNA 모형 (단원 11차시)
   성취기준 [10통과1-02-05] 지각과 생명체를 구성하는 물질들이 기본 단위체의 결합을 통해서 형성된다는 것을
   규산염 광물, 단백질과 핵산의 예를 통해 설명할 수 있다.
   ① 모형: 단위체 (뉴클레오타이드 = 인산 + 당 + 염기, 분해·조립)
   ② 탐구: 한 가닥 (염기 4종의 배열, 서열 수 4ⁿ)
   ③ 모형: DNA 모형 제작 (염기쌍 규칙 A–T, G–C, 샤가프 자료, 이중 나선)
   ④ 분석: 규칙성 (구조적 특징 4가지, 염기 서열 비교)
   ※ 구조식·화학식은 다루지 않고 인산(원) · 당(오각형) · 염기(색 블록)로만 나타냄
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 520 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.18 : 1;
  const EASE = SciSim.ease;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const BC = { A: '#22c55e', T: '#ef4444', G: '#eab308', C: '#3b82f6' };
  const BT = { A: '#ffffff', T: '#ffffff', G: '#3b2f00', C: '#ffffff' };
  const BN = { A: '아데닌', T: '타이민', G: '구아닌', C: '사이토신' };
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const LET = ['A', 'T', 'G', 'C'];
  const compStr = (s) => s.split('').map((c) => COMP[c]).join('');

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f8f4' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'unit', sub: '', clock: 0, fade: 0, drag: null, hover: '',
    nuc: { base: 'A', parts: {}, splitDone: false, assembled: true, glow: 0, reassembled: false, msg: '', msgT: 0, sel: '' },
    strand: { list: [], dl: 0, shake: 0, solved: false, target: 'ATGCCG', okOnce: false },
    dna: { top: 'ATGCCG', bot: [], rej: [], wrong: 0, flash: [], complete: false, tw: 0, twv: 0, phase: 0, msg: '', msgT: 0, twistSeen: false, ratioOK: false, ratioBars: 0 },
    rule: { found: {}, sel: '', spin: true, phase: 0, who: '', diff: false, ok: false, descT: 0 },
  };
  let game = null;

  /* ======================================================
     블록 그리기: 염기(색 블록 + 돌기/홈), 당(오각형), 인산(원)
     ====================================================== */
  function baseBlock(x, y, w, h, L, side, o) {
    o = o || {};
    const col = BC[L], n = (L === 'A' || L === 'T') ? 2 : 3, peg = (L === 'A' || L === 'G');
    const pr = Math.min(6, w * 0.1);
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (side === 'up') ctx.rotate(Math.PI);
    const l = -w / 2, r = w / 2, t = -h / 2, b = h / 2, rad = 9;
    const xs = []; for (let i = 0; i < n; i++) xs.push(-w * 0.26 + i * (w * 0.52) / (n - 1));
    ctx.beginPath(); ctx.moveTo(l + rad, t); ctx.lineTo(r - rad, t); ctx.arcTo(r, t, r, t + rad, rad); ctx.lineTo(r, b - rad); ctx.arcTo(r, b, r - rad, b, rad);
    if (side) for (let i = n - 1; i >= 0; i--) { const px = xs[i]; ctx.lineTo(px + pr, b); ctx.arc(px, b, pr, 0, Math.PI, !peg); }
    ctx.lineTo(l + rad, b); ctx.arcTo(l, b, l, b - rad, rad); ctx.lineTo(l, t + rad); ctx.arcTo(l, t, l + rad, t, rad); ctx.closePath();
    const g = ctx.createLinearGradient(0, t, 0, b);
    g.addColorStop(0, SciSim.color.shade(col, 0.28)); g.addColorStop(0.5, col); g.addColorStop(1, SciSim.color.shade(col, -0.22));
    if (o.shadow !== false) D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 }); else { ctx.fillStyle = g; ctx.fill(); }
    ctx.strokeStyle = SciSim.color.shade(col, -0.4); ctx.lineWidth = 2; ctx.stroke();
    if (o.glow) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
    if (o.text !== false) D.text(x, y + h * 0.17, L, { size: Math.max(14, h * 0.5) * (o.scale || 1), color: BT[L], weight: 800, alpha: o.alpha });
  }
  function sugar(x, y, r, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#e0f2fe'); g.addColorStop(1, '#38bdf8');
    D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    if (o.label) D.text(x, y + r * 0.3, '당', { size: Math.max(11, r * 0.62), color: '#075985', weight: 800, alpha: o.alpha });
  }
  function phos(x, y, r, o) {
    o = o || {};
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha = o.alpha; }
    D.sphere(x, y, r, '#fb923c', { shadow: true, text: o.label ? '인산' : 'P', textScale: o.label ? 0.72 : 0.95, textColor: '#fff' });
    if (o.alpha != null) ctx.restore();
  }
  const shapeHit = (p, x, y, r) => Math.hypot(p.x - x, p.y - y) <= r;

  /* ======================================================
     화면 ①: 뉴클레오타이드 분해 · 조립
     ====================================================== */
  const UG = () => (PHONE ? { ox: 150, oy: 180, ds: 112, sr: 30, pr: 24, bw: 82, bh: 62 } : { ox: 312, oy: 168, ds: 124, sr: 33, pr: 26, bw: 88, bh: 66 });
  function slotOf(k) {
    const g = UG();
    if (k === 'P') return { x: g.ox, y: g.oy, r: g.pr };
    if (k === 'S') return { x: g.ox + g.ds, y: g.oy, r: g.sr };
    return { x: g.ox + g.ds, y: g.oy + g.sr + 6 + g.bh / 2, w: g.bw, h: g.bh, r: g.bw / 2 };
  }
  function scatterOf(k) {
    const p = PHONE ? { P: { x: 90, y: 500 }, S: { x: 260, y: 560 }, B: { x: 430, y: 500 } } : { P: { x: 140, y: 400 }, S: { x: 400, y: 430 }, B: { x: 660, y: 400 } };
    return p[k];
  }
  function initNuc() {
    const N = S.nuc;
    ['P', 'S', 'B'].forEach((k) => { const s = slotOf(k); N.parts[k] = { x: s.x, y: s.y, tx: s.x, ty: s.y, lift: 0, inSlot: true, bob: Math.random() * 6 }; });
    N.assembled = true; N.splitDone = false; N.reassembled = false; N.sel = '';
  }
  function nucAssembled() { const N = S.nuc; return ['P', 'S', 'B'].every((k) => N.parts[k].inSlot); }
  function splitNuc() {
    const N = S.nuc; Sound.click();
    ['P', 'S', 'B'].forEach((k, i) => {
      const p = N.parts[k], sc = scatterOf(k); p.inSlot = false; p.tx = sc.x; p.ty = sc.y; p.free = false;
      SciSim.tween(p, { x: sc.x, y: sc.y }, { duration: 0.7, ease: 'outBack', delay: i * 0.08 });
    });
    N.splitDone = true; N.reassembled = false; N.msg = '3부분으로 나뉘었어요! 하나씩 점선 자리로 끌어다 놓아요'; N.msgT = 3;
    updateCtl();
  }
  function nucDrop(k, p) {
    const N = S.nuc, part = N.parts[k], sl = slotOf(k);
    part.free = false;
    const near = (kk) => { const s = slotOf(kk); return Math.hypot(part.x - s.x, part.y - s.y) < 56; };
    if (near(k)) {
      part.inSlot = true; SciSim.tween(part, { x: sl.x, y: sl.y, lift: 0 }, { duration: 0.35, ease: 'outBack' });
      Sound.tick(); parts.burst(sl.x, sl.y, { count: 8, speed: 100, size: 3, life: 0.5, colors: [k === 'P' ? '#fb923c' : k === 'S' ? '#38bdf8' : BC[N.base], '#fff'] });
      if (nucAssembled()) {
        N.glow = 1; N.msg = '조립 완성! 뉴클레오타이드 1개예요'; N.msgT = 3;
        if (N.splitDone) N.reassembled = true;
        Sound.success(); parts.burst(slotOf('S').x, slotOf('S').y + 30, { count: 22, speed: 190, size: 4 });
      }
    } else {
      const other = ['P', 'S', 'B'].find((kk) => kk !== k && near(kk));
      const sc = scatterOf(k);
      if (other) { N.msg = NAMEK[k] + '은(는) ' + NAMEK[other] + ' 자리가 아니에요'; N.msgT = 2.4; Sound.fail(); part.shake = 0.4; SciSim.tween(part, { x: sc.x, y: sc.y, lift: 0 }, { duration: 0.5, ease: 'outBack' }); }
      else { part.inSlot = false; SciSim.tween(part, { lift: 0 }, { duration: 0.2 }); }
    }
    updateCtl();
  }
  const NAMEK = { P: '인산', S: '당', B: '염기' };
  const NOTEK = { P: '인산 : 이웃 뉴클레오타이드와 이어 주는 연결 고리 (둥근 블록)', S: '당 : 뼈대를 이루는 오각형 블록', B: '염기 : A · T · G · C 네 종류, 유전 정보를 나타내는 색 블록' };
  function drawNucPart(k, t) {
    const N = S.nuc, g = UG(), p = N.parts[k], lift = p.lift || 0, sc = 1 + lift * 0.1;
    const sh = p.shake > 0 ? Math.sin(p.shake * 50) * 5 : 0;
    const bob = p.inSlot || S.drag && S.drag.k === k ? 0 : Math.sin(t * 2.2 + p.bob) * 3;
    const x = p.x + sh, y = p.y + bob;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (k === 'P') { phos(0, 0, g.pr, { label: true }); }
    else if (k === 'S') { sugar(0, 0, g.sr, { label: true }); }
    else { baseBlock(0, 0, g.bw, g.bh, N.base, null, { text: false }); }
    ctx.restore();
    if (k === 'B') D.text(x, y + g.bh * 0.18 + 2, N.base, { size: 30, color: BT[N.base], weight: 800 });
    if (k === 'B') D.text(x, y + g.bh / 2 + 18, BN[N.base] + ' (' + N.base + ')', { size: 13, color: '#334155', weight: 800 });
    else if (!p.inSlot) D.text(x, y + (k === 'P' ? g.pr : g.sr) + 18, NAMEK[k], { size: 14, color: '#334155', weight: 800 });
  }
  function drawUnit(t, dt) {
    const N = S.nuc, g = UG();
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 32, '핵산의 기본 단위체 : 뉴클레오타이드', { size: PHONE ? 16 : 19, weight: 800, color: '#14532d' });
    D.text(VW / 2, 56, '인산 + 당 + 염기  (구조식 대신 모양 블록으로 나타내요)', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
    // 이웃과 이어지는 쪽 표시
    ctx.strokeStyle = '#b8c7bd'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([2, 9]);
    ctx.beginPath(); ctx.moveTo(g.ox - g.pr - 6, g.oy); ctx.lineTo(g.ox - g.pr - 46, g.oy); ctx.moveTo(g.ox + g.ds + g.sr + 6, g.oy); ctx.lineTo(g.ox + g.ds + g.sr + 46, g.oy); ctx.stroke(); ctx.setLineDash([]);
    D.text(g.ox - g.pr - 46, g.oy - 22, '이웃 ←', { size: 12, color: '#94a3b8', weight: 700, align: 'left' });
    D.text(g.ox + g.ds + g.sr + 46, g.oy - 22, '→ 이웃', { size: 12, color: '#94a3b8', weight: 700, align: 'right' });
    // 자리(점선)
    ['P', 'S', 'B'].forEach((k) => {
      const s = slotOf(k), p = N.parts[k];
      if (p.inSlot && nucAssembled()) return;
      ctx.save(); ctx.strokeStyle = p.inSlot ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
      if (k === 'B') { rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 10).stroke(); }
      else if (k === 'P') { ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 3, 0, 6.283); ctx.stroke(); }
      else { ctx.beginPath(); for (let q = 0; q < 5; q++) { const a = -Math.PI / 2 + q * 2 * Math.PI / 5; q ? ctx.lineTo(s.x + Math.cos(a) * (s.r + 3), s.y + Math.sin(a) * (s.r + 3)) : ctx.moveTo(s.x + Math.cos(a) * (s.r + 3), s.y + Math.sin(a) * (s.r + 3)); } ctx.closePath(); ctx.stroke(); }
      ctx.restore();
      if (!p.inSlot) { D.text(s.x, k === 'B' ? s.y + s.h / 2 + 18 : s.y - s.r - 12, NAMEK[k] + ' 자리', { size: 12.5, color: '#64748b', weight: 800 }); if (S.drag && S.drag.k === k) D.ring(s.x, s.y, k === 'B' ? s.r * 0.9 : s.r + 8, t, { color: '#16a34a', speed: 0.9, width: 2.5 }); }
    });
    // 연결선 (조립된 부분끼리)
    const P = N.parts.P, Sg = N.parts.S, B = N.parts.B;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    if (P.inSlot && Sg.inSlot) { ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Sg.x, Sg.y); ctx.stroke(); }
    if (Sg.inSlot && B.inSlot) { ctx.beginPath(); ctx.moveTo(Sg.x, Sg.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
    if (N.glow > 0.02) { D.glow(g.ox + g.ds / 2, g.oy + 30, 170, '#22c55e', 0.35 * N.glow); }
    ['P', 'S', 'B'].forEach((k) => { if (!(S.drag && S.drag.k === k)) drawNucPart(k, t); });
    if (S.drag && S.drag.mode === 'unit') drawNucPart(S.drag.k, t);
    // 설명
    const sel = S.hover || N.sel;
    const note = sel ? NOTEK[sel] : N.splitDone ? '점선 자리를 보고 인산 · 당 · 염기를 끌어다 놓아요' : '뉴클레오타이드 1개 = 인산 + 당 + 염기 (분해하기를 눌러 보세요)';
    if (N.msgT > 0 && !sel) D.label(VW / 2, PHONE ? 372 : 336, N.msg, { bg: N.msg.includes('아니') ? '#b91c1c' : '#15803d', size: PHONE ? 12.5 : 14 });
    else D.label(VW / 2, PHONE ? 372 : 336, note, { bg: '#14532d', size: PHONE ? 12 : 13.5 });
    // 한 가닥 미리보기
    if (nucAssembled()) {
      const py = PHONE ? 580 : 468, sp = PHONE ? 84 : 98, x0 = VW / 2 - 1.5 * sp, letters = [N.base, 'T', 'G', 'C'];
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.7)'; rr(20, py - 70, VW - 40, 140, 14).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 - 28, py - 28); ctx.lineTo(x0 + 3 * sp + 4, py - 28); ctx.stroke();
      letters.forEach((L, i) => { const x = x0 + i * sp; phos(x - sp / 2 + 14, py - 28, 9, {}); sugar(x, py - 28, 14); baseBlock(x, py + 18, 46, 40, L, null, { shadow: false }); });
      D.text(VW / 2, py + 62, '뉴클레오타이드가 길게 이어지면 핵산(DNA)의 한 가닥이 돼요', { size: PHONE ? 12 : 13.5, color: '#475569', weight: 700 });
    }
  }
  function stepUnit(dt) {
    const N = S.nuc;
    ['P', 'S', 'B'].forEach((k) => { const p = N.parts[k]; if (p.shake > 0) p.shake = Math.max(0, p.shake - dt); });
    N.glow = Math.max(0, N.glow - dt * 0.5);
    if (N.msgT > 0) N.msgT -= dt;
  }
  function setBase(L) {
    S.nuc.base = L; Sound.click();
    const B = S.nuc.parts.B; if (B && B.inSlot) { const s = slotOf('B'); parts.burst(s.x, s.y, { count: 8, speed: 80, size: 3, life: 0.5, colors: [BC[L], '#fff'] }); }
    updateCtl();
  }

  /* ======================================================
     트레이: 염기 블록 4종
     ====================================================== */
  const TRY = PHONE ? { y: VH - 66, bw: 76, bh: 58, sp: 112 } : { y: VH - 56, bw: 84, bh: 56, sp: 150 };
  function trayPos(i) { return { x: VW / 2 + (i - 1.5) * TRY.sp, y: TRY.y, w: TRY.bw, h: TRY.bh }; }
  function trayHit(p) { for (let i = 0; i < 4; i++) { const q = trayPos(i); if (Math.abs(p.x - q.x) <= q.w / 2 + 6 && Math.abs(p.y - q.y) <= q.h / 2 + 6) return LET[i]; } return ''; }
  function drawTray(side, label) {
    const top = TRY.y - TRY.bh / 2 - 22, hh = TRY.bh + 44;
    D.shadow(() => { ctx.fillStyle = '#e8f3ea'; rr(8, top, VW - 16, hh, 14).fill(); }, { blur: 6, y: -1 });
    ctx.strokeStyle = '#bfd8c5'; ctx.lineWidth = 2; rr(8, top, VW - 16, hh, 14).stroke();
    D.label(VW / 2, top - 14, label || '🫙 염기 블록 4종', { bg: '#14532d', size: PHONE ? 13 : 14 });
    LET.forEach((L, i) => {
      const q = trayPos(i), hv = S.hover === L, dragging = S.drag && S.drag.L === L && S.drag.mode !== 'unit';
      baseBlock(q.x, q.y - (hv ? 3 : 0), q.w, q.h, L, side, { alpha: dragging ? 0.4 : 1, scale: hv ? 1.06 : 1 });
      D.text(q.x, q.y + q.h / 2 + 15, BN[L], { size: 12, color: '#475569', weight: 800 });
    });
  }

  /* ======================================================
     화면 ②: 한 가닥 만들기
     ====================================================== */
  const SG = { max: 10 };
  const SGEO = () => (PHONE ? { sp: 96, bw: 58, bh: 50 } : { sp: 70, bw: 44, bh: 46 });
  function nucPos(i) {
    const g = SGEO();
    if (!PHONE) return { x: (VW - 10 * g.sp) / 2 + g.sp / 2 + i * g.sp + 0, y: 204, row: 0 };
    const row = Math.floor(i / 5), col = i % 5;
    return { x: (VW - 5 * g.sp) / 2 + g.sp / 2 + col * g.sp, y: 196 + row * 140, row };
  }
  function addBase(L, fx, fy) {
    const st = S.strand;
    if (st.list.length >= SG.max) { st.shake = 0.45; Sound.fail(); toast('가닥은 최대 10개까지 만들 수 있어요', 'bad', 1400); return false; }
    const s = nucPos(st.list.length);
    const b = { L, x: fx, y: fy, tx: s.x, ty: s.y + 52, pop: 0 };
    SciSim.tween(b, { pop: 1 }, { duration: 0.45, ease: 'outBack' });
    st.list.push(b); Sound.tick();
    parts.burst(s.x, s.y + 52, { count: 6, speed: 90, size: 3, life: 0.5, colors: [BC[L], '#fff'] });
    updateCtl(); return true;
  }
  const strandStr = () => S.strand.list.map((b) => b.L).join('');
  function stepStrand(dt) {
    const st = S.strand;
    st.list.forEach((b, i) => { const s = nucPos(i); b.tx = s.x; b.ty = s.y + 52; if (RM) { b.x = b.tx; b.y = b.ty; } else { b.x = SciSim.approach(b.x, b.tx, dt, 12); b.y = SciSim.approach(b.y, b.ty, dt, 12); } });
    const tl = st.list.length * Math.log10(4);
    st.dl = RM ? tl : SciSim.approach(st.dl, tl, dt, 6);
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt);
  }
  function drawStrandBackbone(n, rows) {
    const g = SGEO();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let row = 0; row < rows; row++) {
      const idx = []; for (let i = 0; i < n; i++) if (nucPos(i).row === row) idx.push(i);
      if (!idx.length) continue;
      const a = nucPos(idx[0]), b = nucPos(idx[idx.length - 1]);
      ctx.beginPath(); ctx.moveTo(a.x - g.sp / 2 + 12, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function drawStrand(t) {
    const st = S.strand, n = st.list.length, g = SGEO(), rows = PHONE ? 2 : 1;
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    // 카운터
    const cx = 14, cw = VW - 28, cy = 10, ch = PHONE ? 132 : 112;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx, cy, cw, ch, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = n >= 3 ? '#16a34a' : '#d7e3da'; ctx.lineWidth = 2.5; rr(cx, cy, cw, ch, 16).stroke();
    D.text(VW / 2, cy + 26, n === 0 ? '염기를 이어 붙이면 만들 수 있는 서열 수가 나타나요' : '염기 ' + n + '개 가닥으로 만들 수 있는 서열 수', { size: PHONE ? 14 : 15.5, weight: 800, color: '#14532d' });
    if (n > 0) {
      const settled = Math.abs(st.dl - n * Math.log10(4)) < 0.004;
      const val = settled ? Math.pow(4, n) : Math.pow(10, st.dl);
      D.text(VW / 2, cy + (PHONE ? 74 : 68), comma(val), { size: PHONE ? 32 : 36, weight: 800, color: '#15803d' });
      let eq = n === 1 ? '4가지' : n <= 4 ? Array(n).fill(4).join(' × ') + ' = 4' + sup(n) : '4 × 4 × … × 4 (' + n + '번) = 4' + sup(n);
      if (n === 10) eq += '  ≈ 약 100만';
      D.text(VW / 2, cy + (PHONE ? 106 : 98), eq, { size: PHONE ? 13.5 : 14.5, weight: 700, color: '#475569' });
    } else D.text(VW / 2, cy + 72, '4 × 4 × 4 × …', { size: PHONE ? 26 : 30, weight: 800, color: '#cbd5e1' });
    // 가닥
    const sh = st.shake > 0 ? Math.sin(st.shake * 50) * 5 : 0;
    ctx.save(); ctx.translate(sh, 0);
    for (let i = 0; i < SG.max; i++) {
      const s = nucPos(i);
      if (i >= n) {
        ctx.strokeStyle = i === n ? '#16a34a' : '#c9d9cd'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        rr(s.x - g.bw / 2, s.y + 52 - g.bh / 2, g.bw, g.bh, 9).stroke(); ctx.setLineDash([]);
        if (i === n) D.ring(s.x, s.y + 52, g.bh * 0.62, t, { color: '#16a34a', speed: 1.1, width: 2.5 });
        D.text(s.x, s.y + 57, String(i + 1), { size: 13, color: '#b6c8bb', weight: 800 });
      }
    }
    drawStrandBackbone(Math.max(n, 0), rows);
    st.list.forEach((b, i) => {
      const s = nucPos(i), sc = Math.max(0.2, b.pop);
      phos(s.x - g.sp / 2 + 12, s.y, 9, {});
    });
    st.list.forEach((b, i) => {
      const s = nucPos(i), sc = Math.max(0.2, b.pop);
      sugar(s.x, s.y, 15);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x, s.y + 14); ctx.lineTo(b.x, b.y - g.bh / 2 * sc + 2); ctx.stroke();
      baseBlock(b.x, b.y, g.bw * sc, g.bh * sc, b.L, 'down', { text: false });
      D.text(b.x, b.y + 8 * sc, b.L, { size: 24 * sc, color: BT[b.L], weight: 800 });
    });
    ctx.restore();
    // 목표 서열
    const ty = PHONE ? 480 : 322;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(14, ty - 20, VW - 28, 74, 14).fill(); }, { blur: 5, y: 2 });
    D.text(VW / 2, ty + 2, '🎯 만들어 볼 서열 (유전 정보의 예)', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#15803d' });
    const T = st.target, cur = strandStr(), tsp = 46, tx0 = VW / 2 - (T.length - 1) * tsp / 2;
    for (let i = 0; i < T.length; i++) {
      const ok = i < cur.length && cur[i] === T[i], bad = i < cur.length && cur[i] !== T[i];
      baseBlock(tx0 + i * tsp, ty + 34, 36, 30, T[i], null, { alpha: ok ? 1 : 0.35, shadow: false, text: false });
      D.text(tx0 + i * tsp, ty + 40, T[i], { size: 17, color: ok ? BT[T[i]] : '#475569', weight: 800 });
      if (bad) D.text(tx0 + i * tsp, ty + 62, '✗', { size: 13, color: '#e2464b', weight: 800 });
    }
    D.text(VW / 2, TRY.y - TRY.bh / 2 - 52, n === 0 ? '👇 아래 염기 블록을 눌러 뼈대에 이어 붙여요' : '같은 염기라도 순서가 달라지면 다른 정보가 돼요', { size: PHONE ? 12 : 13.5, color: '#475569', weight: 700 });
    drawTray('down', '🫙 염기 블록 4종 (A · T · G · C)');
  }

  /* ======================================================
     화면 ③: DNA 모형 제작 (염기쌍 규칙, 이중 나선)
     ====================================================== */
  const LG = () => (PHONE ? { n: 6, sp: 78, x0: (VW - 6 * 78) / 2 + 39, y0: 258, R: 76, bh: 54, bw: 50 } : { n: 6, sp: 100, x0: (VW - 6 * 100) / 2 + 50, y0: 214, R: 76, bh: 54, bw: 62 });
  function ladderPos(k, strand) {
    const g = LG();
    return { x: g.x0 + k * g.sp, y: strand === 'top' ? g.y0 - g.bh / 2 : g.y0 + g.bh / 2 };
  }
  function resetModel() {
    const M = S.dna; M.bot = Array(6).fill(null); M.rej = []; M.wrong = 0; M.flash = Array(6).fill(0); M.complete = false; M.tw = 0; M.twv = 0; M.msg = ''; M.msgT = 0; M.twistSeen = false;
    updateCtl();
  }
  const botStr = () => S.dna.bot.map((b) => (b ? b.L : '-')).join('');
  function modelDrop(L, p, tapped) {
    const M = S.dna, g = LG();
    let k = -1, best = 1e9;
    if (tapped) k = M.bot.findIndex((b) => !b);
    else for (let i = 0; i < 6; i++) { if (M.bot[i]) continue; const q = ladderPos(i, 'bot'); const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < best && d < 80) { best = d; k = i; } }
    if (k < 0) return;
    const q = ladderPos(k, 'bot');
    const from = tapped ? trayPos(LET.indexOf(L)) : { x: p.x, y: p.y };
    if (COMP[M.top[k]] === L) {
      const b = { L, x: from.x, y: from.y, tx: q.x, ty: q.y, pop: 0 };
      SciSim.tween(b, { pop: 1 }, { duration: 0.4, ease: 'outBack' });
      M.bot[k] = b; M.flash[k] = 1; Sound.tick();
      parts.burst(q.x, q.y - g.bh / 2, { count: 8, speed: 100, size: 3, life: 0.5, colors: ['#fde047', '#fff'] });
      if (M.bot.every((x) => x)) { M.complete = true; M.msg = '✅ 반대쪽 가닥 완성: ' + botStr(); M.msgT = 99; Sound.success(); for (let i = 0; i < 6; i++) parts.burst(ladderPos(i, 'bot').x, g.y0, { count: 6, speed: 110, size: 3, life: 0.7 }); }
      else { M.msg = ''; M.msgT = 0; }
    } else {
      M.wrong++; Sound.fail();
      const tp = trayPos(LET.indexOf(L));
      const r = { L, x: from.x, y: from.y, rot: 0, a: 1 };
      M.rej.push(r);
      // 튕겨 나감
      SciSim.tween(r, { x: from.x + (Math.random() < 0.5 ? -1 : 1) * 70, y: from.y - 40, rot: 3 }, { duration: 0.35, ease: 'outCubic', onDone: () => SciSim.tween(r, { x: tp.x, y: tp.y, rot: 6, a: 0 }, { duration: 0.45, ease: 'inCubic', onDone: () => { const i = M.rej.indexOf(r); if (i >= 0) M.rej.splice(i, 1); } }) });
      M.flash[k] = -1;
      M.msg = M.wrong >= 3 ? '힌트: ' + M.top[k] + '과(와) 짝을 이루는 염기는 ' + COMP[M.top[k]] + ' 하나뿐이에요 (A–T, G–C)' : L + ' 블록은 ' + M.top[k] + '와(과) 맞지 않아요. 돌기와 홈이 맞는 블록을 찾아봐요.';
      M.msgT = 3.2;
    }
    updateCtl();
  }
  function stepModel(dt) {
    const M = S.dna;
    M.bot.forEach((b, k) => { if (!b) return; if (RM) { b.x = b.tx; b.y = b.ty; } else { b.x = SciSim.approach(b.x, b.tx, dt, 13); b.y = SciSim.approach(b.y, b.ty, dt, 13); } });
    M.flash = M.flash.map((f) => (f > 0 ? Math.max(0, f - dt * 1.6) : f < 0 ? Math.min(0, f + dt * 1.8) : 0));
    if (M.msgT > 0 && M.msgT < 90) M.msgT -= dt;
    M.twv = RM ? M.tw : SciSim.approach(M.twv, M.tw, dt, 1.6);
    if (Math.abs(M.twv - M.tw) < 0.003) M.twv = M.tw;
    M.phase += dt * (M.twv > 0.5 ? 1.0 : 0);
    if (M.twv > 0.95) M.twistSeen = true;
    M.ratioBars = SciSim.approach(M.ratioBars, M.ratioOK ? 1 : 0, dt, 4);
  }
  function drawLadderFrame(t, alpha) {
    const M = S.dna, g = LG();
    ctx.save(); ctx.globalAlpha = alpha;
    // 뼈대 두 줄
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [g.y0 - g.R, g.y0 + g.R].forEach((y) => { ctx.beginPath(); ctx.moveTo(g.x0 - g.sp * 0.5 + 10, y); ctx.lineTo(g.x0 + 5 * g.sp, y); ctx.stroke(); });
    for (let k = 0; k < 6; k++) {
      const x = g.x0 + k * g.sp;
      [-1, 1].forEach((dir) => { const y = g.y0 + dir * g.R; phos(x - g.sp / 2 + 12, y, 9, {}); sugar(x, y, 15); });
    }
    // 위쪽 가닥 염기
    for (let k = 0; k < 6; k++) { const q = ladderPos(k, 'top'); baseBlock(q.x, q.y, g.bw, g.bh, M.top[k], 'down'); }
    // 아래쪽 가닥 염기 / 빈칸
    for (let k = 0; k < 6; k++) {
      const q = ladderPos(k, 'bot'), b = M.bot[k], fl = M.flash[k];
      if (!b) {
        ctx.save(); ctx.strokeStyle = fl < 0 ? '#e2464b' : '#94a3b8'; ctx.lineWidth = fl < 0 ? 3.5 : 2.2; ctx.setLineDash([6, 5]);
        const sx = fl < 0 ? Math.sin(-fl * 40) * 4 : 0;
        rr(q.x - g.bw / 2 + sx, q.y - g.bh / 2, g.bw, g.bh, 9).stroke(); ctx.restore();
        D.text(q.x, q.y + 8, '?', { size: 24, color: '#b6c8bb', weight: 800 });
      }
      if (!b && !S.drag && k === M.bot.findIndex((x) => !x)) D.ring(q.x, q.y, g.bh * 0.62, t, { color: '#16a34a', speed: 1, width: 2.5 });
    }
    M.bot.forEach((b, k) => { if (!b) return; const sc = Math.max(0.2, b.pop); baseBlock(b.x, b.y, g.bw * sc, g.bh * sc, b.L, 'up', { glow: M.flash[k] > 0.3, text: false }); D.text(b.x, b.y + 9 * sc, b.L, { size: 26 * sc, color: BT[b.L], weight: 800 }); });
    // 염기쌍 연결(수소 결합) 표시
    M.bot.forEach((b, k) => {
      if (!b) return;
      const n = (M.top[k] === 'A' || M.top[k] === 'T') ? 2 : 3, x = g.x0 + k * g.sp;
      for (let i = 0; i < n; i++) { const px = x + (i - (n - 1) / 2) * 12; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(px, g.y0, 3, 0, 6.283); ctx.fill(); }
    });
    ctx.restore();
  }
  function drawModel(t) {
    const M = S.dna, g = LG();
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    if (S.sub === 'ratio') { drawRatio(t); return; }
    D.text(VW / 2, 30, M.twv > 0.5 ? 'DNA 이중 나선' : '한 가닥 옆에 반대쪽 가닥을 만들어 붙여요', { size: PHONE ? 15.5 : 18.5, weight: 800, color: '#14532d' });
    D.text(g.x0 - 40, g.y0 - g.R - 34, '한 가닥', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    D.text(g.x0 - 40, g.y0 + g.R + 40, '반대쪽 가닥', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    const xf = clamp(M.twv / 0.06, 0, 1);
    if (xf < 1) drawLadderFrame(t, 1 - xf);
    if (xf > 0) drawHelix({ n: 6, du: g.sp, R: g.R, tw: M.twv, phase: M.phase, top: M.top, bot: compStr(M.top), ax: g.x0, ay: g.y0, vertical: false, alpha: xf, small: false });
    // 안내/결과
    const my = g.y0 + g.R + (PHONE ? 78 : 84);
    if (M.twv > 0.9) D.label(VW / 2, my, '두 가닥이 꼬여 이중 나선이 돼요 (약 10염기쌍마다 한 바퀴)', { bg: '#14532d', size: PHONE ? 12 : 13.5 });
    else if (M.msgT > 0 && M.msg) D.label(VW / 2, my, M.msg, { bg: M.msg.startsWith('✅') ? '#15803d' : M.msg.startsWith('힌트') ? '#b45309' : '#b91c1c', size: PHONE ? 12 : 13.5 });
    else if (!M.complete) D.text(VW / 2, my, '👇 아래 블록을 빈칸 위로 끌어다 놓거나 눌러요  ·  모양이 맞는 짝만 붙어요', { size: PHONE ? 11.5 : 13, color: '#475569', weight: 700 });
    if (M.complete && M.twv < 0.5) D.text(VW / 2, my + 28, '오른쪽의 🌀 나선으로 꼬기를 눌러 보세요', { size: PHONE ? 12 : 13.5, color: '#15803d', weight: 800 });
    // 거부된 블록
    M.rej.forEach((r) => { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); baseBlock(0, 0, g.bw, g.bh, r.L, 'up', { alpha: r.a, text: false }); ctx.restore(); D.text(r.x, r.y + 8, r.L, { size: 24, color: BT[r.L], weight: 800, alpha: r.a }); });
    if (!M.complete || M.twv < 0.01) drawTray('up', '🫙 아래쪽 가닥에 끼울 염기 블록');
  }
  function drawRatio(t) {
    const M = S.dna;
    D.text(VW / 2, 34, '샤가프 자료 : 염기의 비율', { size: PHONE ? 16 : 19, weight: 800, color: '#14532d' });
    D.text(VW / 2, 62, '어떤 DNA를 분석했더니 A가 30 %, G가 20 %였어요', { size: PHONE ? 12.5 : 14, weight: 700, color: '#475569' });
    const bx0 = PHONE ? 70 : 150, bw = PHONE ? 80 : 110, gap = PHONE ? 28 : 36, base = PHONE ? 470 : 440, hmax = PHONE ? 270 : 260;
    const vals = { A: 30, T: 30, G: 20, C: 20 };
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(bx0 - 36, base - hmax - 40, 4 * bw + 3 * gap + 72, hmax + 90, 14).fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
    for (let v = 0; v <= 40; v += 10) { const y = base - v / 40 * hmax; ctx.beginPath(); ctx.moveTo(bx0 - 20, y); ctx.lineTo(bx0 + 4 * bw + 3 * gap + 20, y); ctx.stroke(); D.text(bx0 - 24, y + 4, v + '', { size: 11.5, color: '#94a3b8', weight: 700, align: 'right' }); }
    ['A', 'T', 'G', 'C'].forEach((L, i) => {
      const x = bx0 + i * (bw + gap), known = L === 'A' || L === 'G', f = known ? 1 : M.ratioBars, h = vals[L] / 40 * hmax * f;
      ctx.fillStyle = known || M.ratioOK ? BC[L] : '#e2e8f0';
      if (known || M.ratioOK) { rr(x, base - h, bw, h, 8).fill(); } else { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(x, base - 60, bw, 60, 8).stroke(); ctx.restore(); D.text(x + bw / 2, base - 24, '?', { size: 30, color: '#94a3b8', weight: 800 }); }
      D.text(x + bw / 2, base + 26, L + ' (' + BN[L] + ')', { size: PHONE ? 12.5 : 14, color: '#334155', weight: 800 });
      if (known || M.ratioOK) D.text(x + bw / 2, base - h - 10, vals[L] + ' %', { size: 17, color: '#1b2333', weight: 800 });
    });
    if (M.ratioOK) {
      D.label(VW / 2, base + 62, 'A = T, G = C  →  A + T + G + C = 30 + 30 + 20 + 20 = 100 %', { bg: '#15803d', size: PHONE ? 12 : 14 });
    } else D.text(VW / 2, base + 62, 'A와 짝을 이루는 염기, G와 짝을 이루는 염기를 떠올려 보세요', { size: PHONE ? 12 : 13.5, color: '#64748b', weight: 700 });
  }

  /* ---------- 이중 나선 그리기 (공용) ---------- */
  function drawHelix(o) {
    const { n, du, R, tw, phase, top, bot, vertical } = o;
    const Mp = (u, v) => (vertical ? { x: o.ax + v, y: o.ay + u } : { x: o.ax + u, y: o.ay + v });
    const dth = Math.PI * 2 / 10, th = (k) => tw * (k * dth + phase);
    const A = [], B = [];
    for (let k = 0; k < n; k++) { const c = Math.cos(th(k)), s = Math.sin(th(k)); A.push({ u: k * du, v: -R * c, z: s, c }); B.push({ u: k * du, v: R * c, z: -s, c }); }
    const items = [];
    const hl = o.hl || '';
    const col = (z) => SciSim.color.mix('#475569', '#94a3b8', clamp(0.5 - z * 0.5, 0, 1));
    const SUB = 6;
    [1, -1].forEach((sgn) => {
      for (let k = 0; k < n - 1; k++) {
        for (let q = 0; q < SUB; q++) {
          const k0 = k + q / SUB, k1 = k + (q + 1) / SUB, t0 = th(k0), t1 = th(k1);
          const a = { u: k0 * du, v: -sgn * R * Math.cos(t0), z: sgn * Math.sin(t0) }, b = { u: k1 * du, v: -sgn * R * Math.cos(t1), z: sgn * Math.sin(t1) };
          items.push({ z: (a.z + b.z) / 2 - 0.01, f() {
            const p = Mp(a.u, a.v), qq = Mp(b.u, b.v), z = (a.z + b.z) / 2;
            if (hl === 'back') { ctx.strokeStyle = 'rgba(245,158,11,.45)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(qq.x, qq.y); ctx.stroke(); }
            ctx.strokeStyle = col(z); ctx.lineWidth = 6 + z * 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(qq.x, qq.y); ctx.stroke();
          } });
        }
      }
    });
    for (let k = 0; k < n; k++) {
      const a = A[k], b = B[k];
      items.push({ z: 0, f() {
        const p = Mp(a.u, a.v), q = Mp(b.u, b.v), m = Mp(a.u, 0);
        const w = (hl === 'pair' ? 11 : 8) * (1 - 0.15 * Math.abs(a.z));
        ctx.lineCap = 'round'; ctx.lineWidth = w;
        ctx.strokeStyle = BC[top[k]]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(m.x, m.y); ctx.stroke();
        ctx.strokeStyle = BC[bot[k]]; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        if (hl === 'pair') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(m.x, m.y, 4.5, 0, 6.283); ctx.stroke(); }
        if (Math.abs(R * a.c) > 24 && !o.noLetters) {
          const pa = Mp(a.u, a.v / 2), pb = Mp(b.u, b.v / 2);
          D.text(pa.x, pa.y + 4.5, top[k], { size: 12.5, color: BT[top[k]], weight: 800 });
          D.text(pb.x, pb.y + 4.5, bot[k], { size: 12.5, color: BT[bot[k]], weight: 800 });
        }
      } });
    }
    [A, B].forEach((st) => st.forEach((a, k) => {
      items.push({ z: a.z, f() {
        const p = Mp(a.u, a.v), r = 7.5 * (1 + 0.2 * a.z);
        D.sphere(p.x, p.y, r, k % 2 ? '#38bdf8' : '#fb923c', { shadow: false, gloss: r > 6 });
      } });
    }));
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    items.sort((p, q) => p.z - q.z).forEach((it) => it.f());
    ctx.restore();
    return { A, B, Mp };
  }

  /* ======================================================
     화면 ④: 규칙성 분석 (구조적 특징, 서열 비교)
     ====================================================== */
  const HX = () => (PHONE ? { n: 20, du: 24, R: 52, ax: 220, ay: 80, vertical: true } : { n: 20, du: 34, R: 62, ax: (VW - 19 * 34) / 2, ay: 214, vertical: false });
  const HTOP = 'ATGCCGTAACGTTAGCATGC';
  const FEAT = [
    { k: 'back', icon: '🧵', label: '뼈대', text: '🧵 당과 인산이 이어진 <뼈대>가 바깥쪽에서 두 가닥으로 서로 감아 올라가요 (이중 나선).' },
    { k: 'pair', icon: '🔗', label: '염기쌍', text: '🔗 안쪽에서 염기가 A–T, G–C로만 짝지어요. 한 가닥의 서열을 알면 반대쪽 서열이 정해져요.' },
    { k: 'width', icon: '↔', label: '폭', text: '↔ 어디에서 재도 DNA의 폭은 거의 일정해요. 약 2 nm (1 nm = 10억 분의 1 m).' },
    { k: 'pitch', icon: '🌀', label: '한 바퀴', text: '🌀 이중 나선이 한 바퀴 도는 데 염기쌍 약 10개, 길이 약 3.4 nm예요.' },
  ];
  function chipRect(i) {
    if (!PHONE) return { x: 40 + i * 188, y: 470, w: 176, h: 48 };
    return { x: 20 + (i % 2) * 250, y: 664 + Math.floor(i / 2) * 54, w: 236, h: 48 };
  }
  function drawRule(t) {
    const R = S.rule;
    ctx.fillStyle = '#f3f8f4'; ctx.fillRect(0, 0, VW, VH);
    if (S.sub === 'compare') { drawCompare(t); return; }
    const h = HX();
    D.text(VW / 2, 28, 'DNA 이중 나선의 구조적 특징을 찾아봐요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#14532d' });
    D.shadow(() => { ctx.fillStyle = '#fff'; if (PHONE) rr(70, 52, 380, 548, 16).fill(); else rr(16, 56, VW - 32, 340, 16).fill(); }, { blur: 6, y: 2 });
    const hx = drawHelix({ n: h.n, du: h.du, R: h.R, tw: 1, phase: R.phase, top: HTOP, bot: compStr(HTOP), ax: h.ax, ay: h.ay, vertical: h.vertical, hl: R.sel, noLetters: false });
    // 폭 / 한 바퀴 표시
    if (R.sel === 'width') {
      const a = hx.Mp(h.du * 15.5, -h.R - 14), b = hx.Mp(h.du * 15.5, h.R + 14);
      D.arrow(a.x, a.y, b.x, b.y, { color: '#e2464b', width: 3 }); D.arrow(b.x, b.y, a.x, a.y, { color: '#e2464b', width: 3 });
      const m = hx.Mp(h.du * 15.5, 0);
      D.label(m.x + (PHONE ? 62 : 0), m.y - (PHONE ? 0 : h.R + 34), '폭 ≈ 2 nm', { bg: '#e2464b', size: PHONE ? 13 : 14.5 });
    }
    if (R.sel === 'pitch') {
      const a = hx.Mp(h.du * 2, h.R + 24), b = hx.Mp(h.du * 12, h.R + 24);
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      [a, b].forEach((q) => { const e = hx.Mp(h.du * (q === a ? 2 : 12), h.R + 8); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(e.x, e.y); ctx.stroke(); });
      const m = hx.Mp(h.du * 7, h.R + 24);
      D.label(m.x + (PHONE ? 74 : 0), m.y + (PHONE ? 0 : 22), '한 바퀴 ≈ 10염기쌍 ≈ 3.4 nm', { bg: '#7c3aed', size: PHONE ? 12 : 14 });
    }
    if (R.sel === 'pair') { const m = hx.Mp(h.du * 9, 0); D.label(m.x + (PHONE ? 70 : 0), m.y + (PHONE ? 0 : -h.R - 30), 'A–T · G–C 짝', { bg: '#0f766e', size: PHONE ? 12.5 : 14 }); }
    if (R.sel === 'back') { const m = hx.Mp(h.du * 9, -h.R - 6); D.label(m.x + (PHONE ? -74 : 0), m.y - (PHONE ? 0 : 26), '당 – 인산 뼈대', { bg: '#b45309', size: PHONE ? 12.5 : 14 }); }
    // 칩 버튼
    FEAT.forEach((f, i) => {
      const c = chipRect(i), on = R.sel === f.k, found = R.found[f.k];
      D.shadow(() => { ctx.fillStyle = on ? '#16a34a' : '#fff'; rr(c.x, c.y, c.w, c.h, 14).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = on ? '#14532d' : found ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = found ? 3 : 2; rr(c.x, c.y, c.w, c.h, 14).stroke();
      D.text(c.x + c.w / 2, c.y + c.h / 2 + 6, f.icon + ' ' + f.label + (found ? ' ✓' : ''), { size: 16.5, color: on ? '#fff' : '#1b2333', weight: 800 });
      if (!found && !on) D.ring(c.x + c.w - 14, c.y + 14, 5, t + i * 0.2, { color: '#f59e0b', speed: 1.2, width: 2 });
    });
    const desc = R.sel ? FEAT.find((f) => f.k === R.sel).text.replace(/[<>]/g, '') : '👇 4가지 버튼을 하나씩 눌러 DNA의 특징을 찾아봐요';
    wrapText(desc, VW / 2, PHONE ? 624 : 424, PHONE ? 480 : 740, PHONE ? 14 : 15.5);
  }
  function wrapText(str, cx, y, maxW, size) {
    ctx.save(); ctx.font = D.font(size, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#334155';
    const words = str.split(' '); let line = '';
    const lines = [];
    words.forEach((w) => { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; });
    lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, cx, y + i * size * 1.4 * FS));
    ctx.restore();
  }
  const SEQX = 'ATGCCGTAACGT', SEQA = 'ATGCGGTAACGT', SEQB = 'ATGCCGTAACGT';
  function drawCompare(t) {
    const R = S.rule, bw = PHONE ? 36 : 48, sp = PHONE ? 40 : 56, x0 = VW / 2 - 5.5 * sp, rows = [['🔎 현장에서 찾은 DNA 조각', SEQX], ['👤 사람 A', SEQA], ['👤 사람 B', SEQB]];
    D.text(VW / 2, 30, '염기 서열을 비교해 같은 사람을 찾아봐요', { size: PHONE ? 15 : 18.5, weight: 800, color: '#14532d' });
    const y0 = PHONE ? 110 : 112, gap = PHONE ? 150 : 128;
    rows.forEach((r, ri) => {
      const y = y0 + ri * gap;
      const pick = (ri === 1 && R.who === 'A') || (ri === 2 && R.who === 'B');
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, y - 36, VW - 20, 98, 14).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = pick ? '#16a34a' : '#d7e3da'; ctx.lineWidth = pick ? 3.5 : 2; rr(10, y - 36, VW - 20, 98, 14).stroke();
      D.text(20, y - 14, r[0], { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155', align: 'left' });
      for (let i = 0; i < 12; i++) {
        const x = x0 + i * sp, diff = ri > 0 && r[1][i] !== SEQX[i];
        baseBlock(x, y + 28, bw, bw * 0.8, r[1][i], null, { shadow: false, text: false });
        D.text(x, y + 28 + bw * 0.14, r[1][i], { size: bw * 0.45, color: BT[r[1][i]], weight: 800 });
        if (R.diff && ri > 0) { if (diff) { D.ring(x, y + 28, bw * 0.62, t, { color: '#e2464b', speed: 1.3, width: 3 }); } }
        if (ri === 0) D.text(x, y + 28 + bw * 0.4 + 14, String(i + 1), { size: 10.5, color: '#94a3b8', weight: 800 });
      }
      if (R.diff && ri > 0) { const d = [...r[1]].filter((c, i) => c !== SEQX[i]).length; D.label(VW - 66, y - 16, d ? '다른 곳 ' + d + '군데' : '모두 같음', { bg: d ? '#e2464b' : '#15803d', size: 12.5 }); }
    });
    D.text(VW / 2, y0 + 2 * gap + 90, R.diff ? '서열이 모두 같은 사람이 현장 DNA의 주인일 가능성이 높아요' : '🔍 서로 다른 곳 표시하기를 누르면 차이를 찾아 줘요', { size: PHONE ? 12 : 13.5, color: '#475569', weight: 700 });
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { unit: '🧱 뉴클레오타이드', strand: '🧵 한 가닥', model: '🧬 DNA 모형', rule: '🔍 규칙성' };
  const DEFSUB = { unit: '', strand: '', model: 'build', rule: 'helix' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub != null && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub != null ? sub : DEFSUB[m]; S.drag = null; S.hover = '';
    updateCtl();
  }
  function ensure(m, sub) { if (S.mode !== m || (sub != null && S.sub !== sub)) setMode(m, sub); }
  function updateCtl() {
    const key = S.mode + (S.sub ? ':' + S.sub : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(S.mode)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#modeSeg').hidden = !(game && game.free);
    $$('#baseSeg button').forEach((b) => b.classList.toggle('on', b.dataset.b === S.nuc.base));
    $$('#whoSeg button').forEach((b) => b.classList.toggle('on', b.dataset.w === S.rule.who));
    $('#bSplit').textContent = nucAssembled() ? '🔧 분해하기' : '🔧 분해된 상태';
    $('#bSplit').disabled = !nucAssembled();
    $('#unitNote').textContent = nucAssembled() ? (S.nuc.splitDone ? '다시 조립했어요! 염기를 바꿔 다시 해 봐도 좋아요.' : '뉴클레오타이드를 분해한 뒤, 3부분을 점선 자리로 끌어다 다시 조립해요.') : '인산 · 당 · 염기를 각각 점선 자리로 끌어다 놓아요.';
    $('#oLen').textContent = S.strand.list.length + ' / ' + SG.max + '개';
    $('#oPair').textContent = S.dna.bot.filter(Boolean).length + ' / 6쌍';
    $('#bTwist').disabled = !S.dna.complete;
    $('#bTwist').textContent = S.dna.tw > 0.5 ? '↩ 다시 펴기' : '🌀 나선으로 꼬기';
    $('#bSpin').textContent = S.rule.spin ? '⏸ 회전 멈추기' : '▶ 회전 시키기';
    $('#bDiff').textContent = S.rule.diff ? '🙈 표시 끄기' : '🔍 서로 다른 곳 표시하기';
  }
  $('#baseSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setBase(b.dataset.b); });
  $('#bSplit').addEventListener('click', splitNuc);
  $('#bUndo').addEventListener('click', () => { if (S.strand.list.length) { S.strand.list.pop(); Sound.click(); updateCtl(); } });
  $('#bClear').addEventListener('click', () => { S.strand.list = []; Sound.click(); updateCtl(); });
  $('#bSeq').addEventListener('click', () => {
    const v = parseFloat(String($('#inSeq').value).replace(/[, ]/g, ''));
    if (!isFinite(v)) { toast('숫자로 입력해요', '', 1200); return; }
    if (v === 64) { S.strand.solved = true; Sound.success(); toast('정답! 4 × 4 × 4 = 64', 'good', 2000); }
    else { Sound.fail(); toast(v === 12 ? '더하기가 아니라 곱하기예요. 자리마다 4가지씩 고를 수 있어요.' : '첫째, 둘째, 셋째 자리마다 4가지씩 고를 수 있으니 4 × 4 × 4 예요.', 'bad', 3200); }
  });
  $('#inSeq').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#bSeq').click(); });
  $('#bTwist').addEventListener('click', () => { if (!S.dna.complete) return; Sound.click(); S.dna.tw = S.dna.tw > 0.5 ? 0 : 1; updateCtl(); });
  $('#bReset').addEventListener('click', () => { Sound.click(); resetModel(); });
  $('#bRatio').addEventListener('click', () => {
    const t = parseFloat($('#inT').value), c = parseFloat($('#inC').value);
    if (!isFinite(t) || !isFinite(c)) { toast('T와 C의 값을 모두 입력해요', '', 1400); return; }
    if (t === 30 && c === 20) { S.dna.ratioOK = true; Sound.success(); toast('정답! A = T = 30 %, G = C = 20 %', 'good', 2400); parts.burst(VW / 2, 300, { count: 18, speed: 170, size: 4 }); }
    else {
      Sound.fail();
      const msgs = []; if (t !== 30) msgs.push('T는 A와 짝이라서 A와 같은 비율이에요.'); if (c !== 20) msgs.push('C는 G와 짝이라서 G와 같은 비율이에요.');
      toast(msgs.join(' '), 'bad', 3600);
    }
  });
  $('#inT').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#bRatio').click(); });
  $('#inC').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#bRatio').click(); });
  $('#bSpin').addEventListener('click', () => { S.rule.spin = !S.rule.spin; Sound.click(); updateCtl(); });
  $('#whoSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { S.rule.who = b.dataset.w; Sound.click(); updateCtl(); } });
  $('#bDiff').addEventListener('click', () => { S.rule.diff = !S.rule.diff; Sound.click(); updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }

  /* ---------- 포인터 ---------- */
  function unitPartAt(p) {
    const g = UG(), N = S.nuc;
    const order = ['B', 'S', 'P'];
    for (const k of order) { const q = N.parts[k], s = slotOf(k); const hit = k === 'B' ? Math.abs(p.x - q.x) <= g.bw / 2 + 6 && Math.abs(p.y - q.y) <= g.bh / 2 + 6 : shapeHit(p, q.x, q.y, (k === 'P' ? g.pr : g.sr) + 8); if (hit) return k; }
    return '';
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'unit') {
        const k = unitPartAt(p); if (!k) return false;
        const part = S.nuc.parts[k]; part.free = true;
        if (part.inSlot) { part.inSlot = false; S.nuc.splitDone = true; S.nuc.reassembled = false; }
        S.nuc.sel = k;
        S.drag = { mode: 'unit', k, ox: p.x - part.x, oy: p.y - part.y };
        SciSim.tween(part, { lift: 1 }, { duration: 0.12 }); Sound.click(); updateCtl(); return true;
      }
      if (S.mode === 'strand' || (S.mode === 'model' && S.sub === 'build')) {
        const L = trayHit(p); if (!L) return false;
        if (S.mode === 'model' && S.dna.complete && S.dna.twv > 0.01) return false;
        S.drag = { mode: S.mode, L, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true;
      }
      if (S.mode === 'rule' && S.sub === 'helix') {
        for (let i = 0; i < 4; i++) { const c = chipRect(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { const f = FEAT[i]; S.rule.sel = f.k; S.rule.found[f.k] = true; Sound.tick(); parts.burst(c.x + c.w / 2, c.y + 4, { count: 6, speed: 90, size: 3, life: 0.5 }); return false; } }
      }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      if (d.mode === 'unit') { const part = S.nuc.parts[d.k]; part.x = p.x - d.ox; part.y = p.y - d.oy; }
      else { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; }
    },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null;
      if (d.mode === 'unit') { nucDrop(d.k, p); return; }
      if (d.mode === 'strand') { if (!d.moved || p.y < TRY.y - TRY.bh / 2 - 30) { const q = trayPos(LET.indexOf(d.L)); addBase(d.L, !d.moved ? q.x : p.x, !d.moved ? q.y : p.y); } return; }
      if (d.mode === 'model') modelDrop(d.L, p, !d.moved);
    },
    hover(p) {
      if (S.mode === 'unit') { const k = unitPartAt(p); S.hover = k; return k ? 'grab' : 'default'; }
      if (S.mode === 'strand' || (S.mode === 'model' && S.sub === 'build')) { S.hover = trayHit(p); return S.hover ? 'pointer' : 'default'; }
      if (S.mode === 'rule' && S.sub === 'helix') { for (let i = 0; i < 4; i++) { const c = chipRect(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return 'pointer'; } }
      S.hover = ''; return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });
  // 터치에서도 칩 버튼이 눌리도록 (드래그가 아닌 단순 탭)
  view.canvas.addEventListener('click', (e) => {
    if (S.mode === 'rule' && S.sub === 'helix' && e.pointerType === 'touch') { /* pointerdown에서 처리됨 */ }
  });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'unit') {
      const N = S.nuc;
      L1 = '조립된 부분'; a = ['P', 'S', 'B'].filter((k) => N.parts[k].inSlot).length + ' / 3';
      L2 = '염기'; b = BN[N.base] + ' (' + N.base + ')'; L3 = '단위체 이름'; c = '뉴클레오타이드';
    } else if (S.mode === 'strand') {
      const n = S.strand.list.length;
      L1 = '염기 서열'; a = n ? strandStr().split('').join(' ') : '—';
      L2 = '가능한 서열 수'; b = n ? '4' + sup(n) + ' = ' + comma(Math.pow(4, n)) : '—'; L3 = '염기 종류'; c = '4종 (A T G C)';
    } else if (S.mode === 'model' && S.sub === 'ratio') {
      L1 = 'A · G'; a = '30 % · 20 %'; L2 = 'T · C'; b = S.dna.ratioOK ? '30 % · 20 %' : '? · ?'; L3 = '규칙'; c = 'A=T, G=C';
    } else if (S.mode === 'model') {
      const M = S.dna;
      L1 = '한 가닥'; a = M.top.split('').join(' '); L2 = '반대쪽 가닥'; b = botStr().split('').join(' '); L3 = '짝짓기 실패'; c = M.wrong + '번';
    } else if (S.sub === 'compare') {
      L1 = '현장 DNA'; a = SEQX; L2 = '고른 사람'; b = S.rule.who ? (S.rule.who === 'N' ? '둘 다 아님' : '사람 ' + S.rule.who) : '—'; L3 = '비교한 염기'; c = '12개';
    } else {
      L1 = '찾은 특징'; a = Object.keys(S.rule.found).length + ' / 4'; L2 = '폭'; b = '≈ 2 nm'; L3 = '한 바퀴'; c = '10염기쌍 ≈ 3.4 nm';
    }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { initNuc(); setMode('unit'); }
    else if (li === 1) { S.strand.list = []; S.strand.dl = 0; S.strand.solved = false; $('#inSeq').value = ''; setMode('strand', ''); }
    else if (li === 2) { resetModel(); S.dna.ratioOK = false; S.dna.ratioBars = 0; $('#inT').value = ''; $('#inC').value = ''; setMode('model', 'build'); }
    else { S.rule.found = {}; S.rule.sel = ''; S.rule.who = ''; S.rule.diff = false; S.rule.ok = false; setMode('rule', 'helix'); }
  }
  const levels = [
    {
      title: '단위체: 뉴클레오타이드 블록', short: '단위체', icon: '🧱', phase: '모형',
      features: ['unit'],
      intro: '<p class="si-q">❓ 탐구 질문: 겨우 네 가지 블록으로 어떻게 생명의 설계도가 쓰일까? DNA 두 가닥은 어떤 규칙으로 짝지어질까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 염색체 속에 유전 물질 <b>DNA</b>가 있다고 배웠어요(중3 Ⅵ). 앞 차시에서는 단백질이 아미노산이 이어져 만들어지는 것을 봤어요. DNA도 단위체가 이어진 물질일까요?</div>' +
        '<p>DNA 같은 <b>핵산</b>의 기본 단위체는 <b>뉴클레오타이드</b>예요. 블록을 분해하고 다시 조립하면서 3부분(<b>인산 · 당 · 염기</b>)을 확인해요. (구조식은 다루지 않고 모양 블록으로만 나타내요.)</p>',
      setup() { enterLevel(0); },
      recap: '핵산의 기본 단위체는 뉴클레오타이드이고, 인산 · 당 · 염기 3부분으로 이루어져 있어요. DNA의 염기는 A, T, G, C 네 종류예요.',
      summary: '<ul><li>핵산(DNA·RNA)의 기본 단위체는 <b>뉴클레오타이드</b>예요.</li><li>뉴클레오타이드 = <b>인산(원) + 당(오각형) + 염기(색 블록)</b> 3부분.</li><li>DNA의 염기는 4종: 아데닌 <b>A</b>, 타이민 <b>T</b>, 구아닌 <b>G</b>, 사이토신 <b>C</b>.</li><li>뉴클레오타이드가 이어지면 당–인산 뼈대에 염기가 매달린 <b>한 가닥</b>이 돼요.</li></ul>',
      missions: [
        {
          title: '뉴클레오타이드 분해 · 조립',
          goal: '<b>🔧 분해하기</b>로 블록을 3부분으로 나눈 뒤, <b>인산 · 당 · 염기</b>를 알맞은 점선 자리로 끌어다 <b>다시 조립</b>하세요.',
          hint: '둥근 인산은 왼쪽, 오각형 당은 오른쪽 위, 색 블록 염기는 당 아래쪽 점선 자리예요. 염기는 A, T, G, C 중 아무거나 골라도 돼요.',
          setup() { ensure('unit'); if (nucAssembled() && S.nuc.reassembled) initNuc(); },
          check: () => S.nuc.splitDone && S.nuc.reassembled && nucAssembled(), hold: 0.5,
          status: () => mark(S.nuc.splitDone) + ' 분해 · ' + mark(S.nuc.parts.P.inSlot && S.nuc.splitDone) + ' 인산 · ' + mark(S.nuc.parts.S.inSlot && S.nuc.splitDone) + ' 당 · ' + mark(S.nuc.parts.B.inSlot && S.nuc.splitDone) + ' 염기',
          explain: '뉴클레오타이드 한 개는 <b>인산, 당, 염기</b> 3부분이에요. 인산과 당은 이웃 뉴클레오타이드와 이어져 <b>뼈대</b>를 만들고, <b>염기</b>는 뼈대에 매달려 유전 정보를 나타내요. 규산염 광물의 Si–O 사면체, 단백질의 아미노산처럼 핵산에도 기본 단위체가 있어요.',
        },
        {
          type: 'quiz', title: '핵산의 기본 단위체',
          goal: '핵산(DNA, RNA)을 이루는 <b>기본 단위체</b>는?',
          setup() { ensure('unit'); },
          choices: ['아미노산', '뉴클레오타이드', '포도당', '지방산'],
          answer: 1,
          feedback: ['아미노산은 단백질의 기본 단위체예요. 지난 차시에서 배웠죠?', '', '포도당은 녹말 같은 탄수화물의 단위체예요.', '지방산은 지방을 이루는 성분이에요.'],
          explain: '단백질의 단위체는 아미노산, 핵산의 단위체는 <b>뉴클레오타이드</b>예요. 이처럼 생명체를 이루는 큰 물질은 기본 단위체가 결합해서 만들어져요.',
        },
      ],
    },
    {
      title: '한 가닥: 4종 염기의 배열', short: '한 가닥', icon: '🧵', phase: '탐구',
      features: ['strand'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 뉴클레오타이드가 인산 · 당 · 염기 3부분이고, 염기가 4종(A, T, G, C)이라는 것을 알았어요.</div>' +
        '<p>뉴클레오타이드를 이어 붙이면 <b>한 가닥</b>이 돼요. 당과 인산이 번갈아 이어진 <b>뼈대</b>에 염기가 매달려요. 염기를 어떤 순서로 이어 붙였는지가 <b>염기 서열</b>이고, 이 서열이 <b>유전 정보</b>예요. 직접 만들어 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '염기는 4종뿐이지만 배열 순서와 길이에 따라 4ⁿ가지 서열을 만들 수 있어요. 염기 서열이 유전 정보예요.',
      summary: '<ul><li>한 가닥 = 당–인산 <b>뼈대</b> + 매달린 <b>염기</b>의 배열.</li><li><b>염기 서열</b>이 유전 정보예요. (예: A–T–G–C–C–G)</li><li>길이 n인 가닥의 서열 수 = 4ⁿ : 2개 <b>16</b>, 3개 <b>64</b>, 10개 약 <b>100만</b>(1,048,576)가지.</li><li>사람 DNA는 염기쌍이 약 30억 개라서 담을 수 있는 정보가 엄청나요.</li></ul>',
      missions: [
        {
          title: '서열 ATGCCG 만들기',
          goal: '염기 블록을 차례로 눌러(또는 끌어다 놓아) 서열 <b>A – T – G – C – C – G</b> 가닥을 만드세요.',
          hint: '화면의 🎯 목표 서열을 보며 A, T, G, C, C, G 순서로 눌러요. 순서가 틀리면 ✗가 표시돼요. 틀린 건 ↶ 하나 지우기로 지워요.',
          setup() { ensure('strand', ''); },
          check: () => strandStr() === S.strand.target, hold: 0.7,
          status: () => mark(strandStr() === S.strand.target) + ' 현재 서열 ' + (strandStr() ? strandStr().split('').join('–') : '—'),
          explain: '네 종류의 염기를 <b>순서대로</b> 이어 붙여 ATGCCG 서열이 만들어졌어요. 염기의 종류는 4가지뿐이지만 배열 순서가 달라지면 다른 정보가 돼요. 예를 들어 GCCGTA는 같은 염기로 만든 전혀 다른 서열이에요.',
        },
        {
          title: '서열 수 계산하기',
          goal: '염기 <b>3개</b>짜리 가닥으로 만들 수 있는 서열은 모두 몇 가지일까요? 계산해서 입력해요.',
          hint: '첫째 자리 4가지 × 둘째 자리 4가지 × 셋째 자리 4가지예요.',
          setup() { ensure('strand', 'calc'); },
          check: () => S.strand.solved, hold: 0.3,
          status: () => mark(S.strand.solved) + ' 4 × 4 × 4 계산',
          explain: '자리마다 4가지를 고를 수 있으니 4×4×4 = <b>64가지</b>예요. 염기를 10개로 늘리면 4¹⁰ = 1,048,576가지(약 100만)! 사람의 DNA는 염기쌍이 약 30억 개이니 담을 수 있는 정보는 상상할 수 없을 만큼 많아요.',
        },
        {
          type: 'quiz', title: '염기가 4종뿐인데도',
          goal: '염기가 4종뿐인데도 DNA가 매우 다양한 유전 정보를 담을 수 있는 까닭은?',
          setup() { ensure('strand', ''); },
          choices: ['염기의 배열 순서와 길이에 따라 서로 다른 서열이 아주 많이 만들어지기 때문이다', '염기의 종류가 계속 새로 생겨나기 때문이다', '염기마다 당과 인산의 종류가 달라지기 때문이다', '염기 하나가 여러 가지 정보를 동시에 담기 때문이다'],
          answer: 0,
          feedback: ['', 'DNA의 염기는 A, T, G, C 네 종류로 정해져 있어요.', '뼈대(당 + 인산)는 모든 뉴클레오타이드에서 같아요. 다른 것은 염기예요.', '염기 하나는 한 글자예요. 글자가 늘어서는 순서(서열)가 정보를 만들어요.'],
          explain: '4종의 염기를 길게 늘어놓으면 <b>배열 순서와 길이</b>에 따라 4ⁿ가지 서열이 가능해요. 한글 자음과 모음 몇 개로 수많은 글을 쓰는 것과 같아요.',
        },
      ],
    },
    {
      title: 'DNA 모형 제작: 반대쪽 가닥 만들기', short: 'DNA 모형', icon: '🧬', phase: '모형',
      features: ['model'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염기를 이어 붙여 한 가닥을 만들었어요. DNA는 이런 가닥이 <b>두 개</b> 맞붙은 구조예요.</div>' +
        '<p>한 가닥 옆에 반대쪽 가닥을 만들어 붙여 봐요. 아무 염기나 붙는 것이 아니라 <b>짝이 정해져 있어요</b>. 어떤 규칙인지 블록을 끼워 보며 찾아보고, 두 가닥을 <b>나선</b>으로 꼬아 DNA 모형을 완성해요.</p>',
      setup() { enterLevel(2); },
      recap: 'DNA의 두 가닥은 염기 A–T, G–C로만 짝지어져(염기쌍 규칙) 이중 나선을 이루어요. 그래서 A와 T, G와 C의 비율이 같아요.',
      summary: '<ul><li>DNA는 두 가닥이 맞붙은 <b>이중 가닥</b>이에요. 염기는 <b>A–T, G–C</b>로만 짝지어요(상보적 결합).</li><li>한 가닥이 ATGCCG이면 반대쪽은 <b>TACGGC</b>예요.</li><li>샤가프 규칙: <b>A와 T의 비율이 같고, G와 C의 비율이 같아요.</b> (예: A 30 % → T 30 %, G 20 % → C 20 %)</li><li>두 가닥은 서로 꼬여 <b>이중 나선</b>을 이루고, 약 10염기쌍마다 한 바퀴 돌아요.</li></ul>',
      missions: [
        {
          title: '반대쪽 가닥 완성하고 꼬기',
          goal: '위쪽 가닥 <b>ATGCCG</b>에 맞는 반대쪽 가닥을 완성하고, <b>🌀 나선으로 꼬기</b>까지 해 보세요.',
          hint: '블록의 돌기와 홈이 딱 맞는 염기만 붙어요. 안 맞으면 튕겨 나가니 여러 번 시도해 규칙을 찾아봐요.',
          setup() { ensure('model', 'build'); },
          check: () => S.dna.complete && S.dna.twv > 0.95, hold: 0.8,
          status: () => mark(S.dna.complete) + ' 반대쪽 가닥 ' + S.dna.bot.filter(Boolean).length + '/6 · ' + mark(S.dna.twv > 0.95) + ' 나선으로 꼬기',
          explain: '염기는 <b>A와 T, G와 C</b>끼리만 짝을 이루어요(염기쌍 규칙). 한 가닥이 ATGCCG이면 반대쪽 가닥은 반드시 <b>TACGGC</b>가 돼요. 두 가닥이 맞붙은 뒤 꼬이면 DNA의 <b>이중 나선</b> 구조가 돼요.',
        },
        {
          title: '샤가프 자료로 염기 비율 구하기',
          goal: '어떤 DNA에서 A가 30 %, G가 20 %예요. <b>T와 C의 비율</b>을 구해 입력하세요.',
          hint: 'A의 짝은 T, G의 짝은 C예요. 짝끼리는 같은 수만큼 있어요.',
          setup() { ensure('model', 'ratio'); },
          check: () => S.dna.ratioOK, hold: 0.4,
          status: () => mark(S.dna.ratioOK) + ' T = 30 %, C = 20 % 구하기',
          explain: '염기쌍 규칙 때문에 A의 수와 T의 수가, G의 수와 C의 수가 같아요. 그래서 T는 <b>30 %</b>, C는 <b>20 %</b>이고 A + T + G + C = 30 + 30 + 20 + 20 = 100 %가 돼요. 이것이 샤가프가 발견한 규칙이에요.',
        },
        {
          type: 'quiz', title: '반대쪽 가닥의 서열',
          goal: 'DNA 한 가닥의 염기 서열이 <b>G – G – A – T – C</b>일 때, 짝을 이루는 반대쪽 가닥의 서열은?',
          setup() { ensure('model', 'build'); },
          choices: ['C – C – T – A – G', 'G – G – A – T – C', 'C – C – A – T – G', 'T – T – C – G – A'],
          answer: 0,
          feedback: ['', '같은 서열이 아니라 짝(상보적인 염기)이 놓여요.', 'A의 짝은 T, T의 짝은 A예요. 4번째·3번째 자리를 다시 봐요.', 'G의 짝은 T가 아니라 C예요.'],
          explain: 'G→C, G→C, A→T, T→A, C→G 이므로 반대쪽 가닥은 <b>C – C – T – A – G</b>예요. 한쪽 서열만 알면 반대쪽 서열은 규칙으로 정해져요.',
        },
      ],
    },
    {
      title: '규칙성: DNA 구조의 특징', short: '규칙성', icon: '🔍', phase: '분석',
      features: ['rule'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> A–T, G–C 염기쌍 규칙과 이중 나선 모형을 만들어 봤어요.</div>' +
        '<p>완성한 DNA 모형에서 <b>구조적 특징 4가지</b>를 찾고, 이 규칙성이 유전 정보를 정확하게 지키고 전달하는 데 어떻게 쓰이는지, 그리고 염기 서열로 사람을 구별할 수 있는지 알아봐요.</p>',
      setup() { enterLevel(3); },
      recap: 'DNA는 폭이 일정한 이중 나선이고 염기쌍 규칙이 있어요. 유전 정보는 염기 서열에 담겨 있어요.',
      summary: '<ul><li>DNA의 구조적 특징: <b>이중 나선</b>, <b>염기쌍 규칙(A–T, G–C)</b>, 폭이 일정(약 <b>2 nm</b>), 한 바퀴 약 <b>10염기쌍 ≈ 3.4 nm</b>.</li><li>규칙이 있어 한 가닥이 다른 가닥의 <b>설계도</b>가 되므로 DNA를 거의 정확하게 복제할 수 있어요.</li><li>유전 정보는 <b>염기 서열</b>에 담겨 있고, 사람마다 서열이 조금씩 달라요.</li><li>사람의 DNA는 염기쌍이 약 <b>30억 개</b>예요.</li></ul>',
      missions: [
        {
          title: 'DNA의 구조적 특징 4가지 찾기',
          goal: '화면 아래의 버튼 <b>4개</b>를 모두 눌러 DNA의 구조적 특징(뼈대 · 염기쌍 · 폭 · 한 바퀴)을 확인하세요.',
          hint: '🧵 뼈대, 🔗 염기쌍, ↔ 폭, 🌀 한 바퀴 버튼을 하나씩 눌러요. 눌러서 찾으면 ✓가 표시돼요.',
          setup() { ensure('rule', 'helix'); },
          check: () => FEAT.every((f) => S.rule.found[f.k]), hold: 0.6,
          status: () => FEAT.map((f) => mark(S.rule.found[f.k]) + ' ' + f.label).join(' · '),
          explain: 'DNA는 ① 당–인산 <b>뼈대</b>가 바깥에서 감아 올라가는 이중 나선, ② 안쪽의 <b>A–T · G–C 염기쌍</b>, ③ 폭이 일정한 약 <b>2 nm</b>, ④ 한 바퀴가 약 <b>10염기쌍(3.4 nm)</b>이라는 규칙성이 있어요.',
        },
        {
          title: '같은 사람 가려내기',
          goal: '현장에서 찾은 DNA 조각과 <b>염기 서열이 똑같은</b> 사람을 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '12개의 염기를 하나씩 비교해요. 🔍 서로 다른 곳 표시하기를 누르면 차이가 나는 곳이 보여요.',
          manual: true,
          setup() { ensure('rule', 'compare'); },
          check() {
            const w = S.rule.who;
            if (!w) return '먼저 <b>사람 A · 사람 B · 둘 다 아님</b> 중에서 하나를 골라요.';
            if (w === 'B') { S.rule.ok = true; S.rule.diff = true; updateCtl(); return true; }
            if (w === 'A') return '사람 A는 <b>5번째 염기</b>가 달라요(C ↔ G). 서열이 한 곳이라도 다르면 다른 사람이에요.';
            return '사람 B의 염기 서열을 현장 조각과 다시 비교해 봐요.';
          },
          explain: '사람 B의 12개 염기 서열이 현장 DNA 조각과 <b>모두 같아요</b>. 사람 A는 5번째 염기가 달라요. <b>유전 정보는 염기 서열에 담겨 있어서</b> 서열을 비교하면 사람을 구별할 수 있어요.',
        },
        {
          type: 'quiz', title: '규칙성이 있어 좋은 점',
          goal: 'DNA가 복제될 때 새 가닥이 거의 <b>정확하게</b> 만들어질 수 있는 까닭은?',
          setup() { ensure('rule', 'helix'); },
          choices: ['A–T, G–C 짝 규칙 때문에 한 가닥의 서열이 반대쪽 가닥의 서열을 정해 주기 때문이다', '새 가닥은 매번 완전히 무작위 서열로 만들어지기 때문이다', '당과 인산이 염기를 골라 붙이기 때문이다', 'DNA의 폭이 변하면서 서열을 맞추기 때문이다'],
          answer: 0,
          feedback: ['', '무작위라면 유전 정보가 전달되지 않아요. 규칙이 있어서 같은 서열이 만들어져요.', '염기를 고르는 것은 뼈대가 아니라 염기들 사이의 짝 규칙이에요.', 'DNA의 폭은 거의 일정해요(약 2 nm).'],
          explain: '한 가닥을 알면 반대쪽 가닥이 <b>A–T, G–C 규칙</b>으로 정해지므로 가닥 하나가 다른 가닥의 설계도가 돼요. 이 규칙성 덕분에 세포가 분열할 때 유전 정보가 정확하게 복제돼요.',
        },
      ],
    },
  ];

  initNuc(); resetModel();
  game = SciSim.game({
    simId: 'h1-dna', mount: '#game', badge: 'DNA 박사', homeHref: '../../index.html#h1a',
    featureLabels: { unit: '🧱 뉴클레오타이드 분해 · 조립', strand: '🧵 염기 블록 4종 · 서열 수 카운터', model: '🧬 염기쌍 짝짓기 · 🌀 나선 꼬기', rule: '🔍 구조 특징 찾기 · 서열 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'unit') stepUnit(dt);
    else if (S.mode === 'strand') stepStrand(dt);
    else if (S.mode === 'model') stepModel(dt);
    else if (S.rule.spin) S.rule.phase += dt * 0.9;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'unit') drawUnit(t, dt);
    else if (S.mode === 'strand') drawStrand(t);
    else if (S.mode === 'model') drawModel(t);
    else drawRule(t);
    // 끌고 있는 블록
    if (S.drag && S.drag.mode !== 'unit') {
      const d = S.drag, side = d.mode === 'model' ? 'up' : 'down';
      baseBlock(d.x, d.y, 70, 56, d.L, side, { scale: 1.12 });
    }
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, enterLevel, updateCtl, trayPos, ladderPos, nucPos, slotOf, scatterOf, chipRect, splitNuc, nucDrop, nucAssembled, addBase, strandStr, modelDrop, botStr, resetModel,
    fillBottom() { const M = S.dna; for (let k = 0; k < 6; k++) { if (!M.bot[k]) modelDrop(COMP[M.top[k]], ladderPos(k, 'bot'), false); } },
  };
})();
