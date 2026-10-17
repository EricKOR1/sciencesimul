/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 번역: mRNA에서 단백질로 (단원 12차시)
   성취기준 [10통과1-03-06] 생명 시스템의 유지에 필요한 세포 내 정보의 흐름을 유전자로부터 단백질이 만들어지는
   과정을 중심으로 설명할 수 있다.  (이 차시: 번역 / 앞 차시: 전사)
   ① 모형: 리보솜 (mRNA를 장착하고 시작 코돈 AUG에서 3염기씩 읽기)
   ② 탐구: 코돈표 (간이 코돈표로 mRNA 서열 → 아미노산 서열, 종결 코돈)
   ③ 모형: 단백질 합성 (안티코돈이 맞는 tRNA가 아미노산을 운반 → 사슬 → 접혀 단백질)
   ④ 확인: 변이와 흐름 (염기 1개 변화의 결과 3가지, DNA → mRNA → 아미노산 서열 → 단백질)
   ※ 개시·신장·종결 인자, tRNA 구조, 번역 후 가공, 전체 코돈표 암기는 다루지 않음.
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
  const COMP = { A: 'U', U: 'A', G: 'C', C: 'G' };
  const anti = (cod) => cod.split('').map((b) => COMP[b]).join('');
  /* 받침에 따라 조사 고르기 */
  const hasFinal = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const eul = (w) => w + (hasFinal(w) ? '을' : '를');
  const eun = (w) => w + (hasFinal(w) ? '은' : '는');
  const CODON = { AUG: 'Met', GAA: 'Glu', GAG: 'Glu', GUG: 'Val', CCA: 'Pro', UGG: 'Trp', UUU: 'Phe', AAA: 'Lys', GGU: 'Gly', GGC: 'Gly', UAA: 'STOP', UAG: 'STOP', UGA: 'STOP' };
  const AAI = {
    Met: { ko: '메싸이오닌', col: '#f59e0b' }, Glu: { ko: '글루탐산', col: '#ef4444' }, Val: { ko: '발린', col: '#3b82f6' }, Pro: { ko: '프롤린', col: '#22c55e' },
    Trp: { ko: '트립토판', col: '#a855f7' }, Phe: { ko: '페닐알라닌', col: '#ec4899' }, Lys: { ko: '라이신', col: '#14b8a6' }, Gly: { ko: '글라이신', col: '#94a3b8' }, STOP: { ko: '종결', col: '#1f2937' },
  };
  const AAKEYS = ['Met', 'Glu', 'Pro', 'Trp', 'Val', 'Phe', 'Lys', 'Gly', 'STOP'];
  const TABLE_ROWS = [['AUG'], ['GAA', 'GAG'], ['GUG'], ['CCA'], ['UGG'], ['UUU'], ['AAA'], ['GGU', 'GGC'], ['UAA', 'UAG', 'UGA']];
  const ROW_AA = ['Met', 'Glu', 'Val', 'Pro', 'Trp', 'Phe', 'Lys', 'Gly', 'STOP'];
  const rowOf = (cod) => TABLE_ROWS.findIndex((r) => r.includes(cod));

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4000); }

  function block(x, y, w, h, L, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const col = o.color || BC[L];
    ctx.translate(x, y); if (o.sx != null) ctx.scale(o.sx, 1); if (o.scale) ctx.scale(o.scale, o.scale);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, SciSim.color.shade(col, 0.3)); g.addColorStop(0.55, col); g.addColorStop(1, SciSim.color.shade(col, -0.22));
    const draw = () => { ctx.fillStyle = g; rr(-w / 2, -h / 2, w, h, Math.min(9, h * 0.3)).fill(); };
    if (o.shadow === false) draw(); else D.shadow(draw, { blur: 4, y: 2 });
    ctx.lineWidth = o.glow ? 3 : 2; ctx.strokeStyle = o.glow ? '#fde047' : SciSim.color.shade(col, -0.4); rr(-w / 2, -h / 2, w, h, Math.min(9, h * 0.3)).stroke();
    ctx.restore();
    if (o.text !== false && w >= 14) D.text(x, y + h * 0.18 * (o.scale || 1), L, { size: (o.size || Math.max(12, h * 0.5)) * (o.scale || 1), color: BT[L] || '#fff', weight: 800, alpha: o.alpha });
  }
  /* 아미노산 구슬 */
  function aaBead(x, y, r, key, o) {
    o = o || {}; const a = AAI[key];
    D.sphere(x, y, r, a.col, { gloss: true, shadow: o.shadow !== false, outline: SciSim.color.shade(a.col, -0.4), outlineWidth: 1.5 });
    if (o.label !== false && r >= 11) D.text(x, y + r * 0.34, key === 'STOP' ? '■' : key, { size: Math.max(10, r * 0.78), color: '#fff', weight: 800 });
  }

  /* ---------- 상태 ---------- */
  const MRNA1 = 'GCAUGGAACCAUGA';           // 리보솜 장착용: 맨 처음 AUG는 index 2
  const START_W = 2;
  const SEQS = [
    { s: 'AUGGAACCAUGGUAA', aa: ['Met', 'Glu', 'Pro', 'Trp', 'STOP'] },
    { s: 'AUGUUUAAAGGUUGA', aa: ['Met', 'Phe', 'Lys', 'Gly', 'STOP'] },
  ];
  const SYN = ['AUG', 'GAA', 'CCA', 'UGG', 'UAA'];
  const S = {
    mode: 'ribo', sub: '', clock: 0, fade: 0, drag: null, hover: '', epoch: 0,
    rb: null,
    tb: { q: 0, cut: [0, 0], cutAnim: [0, 0], idx: [0, 0], res: [[], []], done: [false, false], wrong: 0, msg: '', msgT: 0, flash: 0, flashRow: -1, shake: 0 },
    sy: null,
    mu: { x: 0, done: [false, false, false], mut: [false, false, false], flip: [0, 0, 0] },
    fl: { slots: new Array(7).fill(null), order: [], ok: false },
  };
  let game = null;

  /* ======================================================
     화면 ①: 리보솜 — mRNA 장착, 읽는 창(3염기), 시작 코돈 AUG
     ====================================================== */
  const RG = () => (PHONE
    ? { rx: 260, sy: 300, sp: 34, bw: 31, bh: 34, loadY: 566, ryS: 36, rxS: 128, rxB: 166 }
    : { rx: 400, sy: 262, sp: 44, bw: 40, bh: 36, loadY: 468, ryS: 40, rxS: 150, rxB: 190 });
  function newRb() {
    const g = RG();
    S.rb = { loaded: false, locked: false, w: 0, ox: g.rx - (MRNA1.length / 2) * g.sp + g.sp / 2, oy: g.loadY, drag: null, msg: '', msgT: 0, shake: 0, tries: 0, wrongLock: 0, read: 0 };
  }
  const rbTargetOx = (w) => RG().rx - (w + 1) * RG().sp;
  function rbLoad() {
    const R = S.rb, g = RG(); if (R.loaded) return;
    R.loaded = true; Sound.tick(); R.msg = 'mRNA가 리보솜 틈에 끼워졌어요! 이제 읽는 창으로 코돈을 찾아봐요'; R.msgT = 4;
    if (!RM) parts.burst(g.rx, g.sy, { count: 12, speed: 120, size: 3.4, life: 0.6, colors: ['#fde047', '#fb923c', '#fff'] });
    updateCtl();
  }
  function rbShift(dir) {
    const R = S.rb; if (!R.loaded) { showHint('먼저 mRNA를 리보솜에 장착해요', 2500); return; }
    const step = R.locked ? 3 : 1, nw = clamp(R.w + dir * step, R.locked ? START_W : 0, MRNA1.length - 3);
    if (nw === R.w) return;
    R.w = nw; if (R.locked) R.read = Math.max(R.read, (nw - START_W) / 3); Sound.tick(); updateCtl();
  }
  function rbLock() {
    const R = S.rb; if (!R.loaded) { showHint('먼저 mRNA를 리보솜에 장착해요', 2500); return; }
    if (R.locked) return;
    const cod = MRNA1.slice(R.w, R.w + 3);
    if (R.w === START_W) { R.locked = true; Sound.success(); R.msg = '시작 코돈 AUG에서 읽기 시작! 이제 3염기씩 코돈으로 읽어요'; R.msgT = 5; const g = RG(); if (!RM) parts.burst(g.rx, g.sy, { count: 16, speed: 150, size: 4 }); }
    else {
      R.wrongLock++; R.shake = 0.5; Sound.fail();
      R.msg = cod === 'AUG' ? 'AUG이지만 맨 처음 나오는 AUG가 아니에요. 리보솜은 첫 AUG에서 시작해요' : '읽는 창은 ' + cod + '예요. 시작 코돈은 AUG예요. ◀ ▶ 로 창을 옮겨 봐요'; R.msgT = 4.5;
    }
    updateCtl();
  }
  function stepRb(dt) {
    const R = S.rb, g = RG();
    const tx = R.drag && R.drag.mode === 'load' ? R.drag.x - R.drag.gx : (R.loaded ? rbTargetOx(R.w) : g.rx - (MRNA1.length / 2) * g.sp + g.sp / 2);
    const ty = R.drag && R.drag.mode === 'load' ? R.drag.y : (R.loaded ? g.sy : g.loadY);
    if (R.drag && R.drag.mode === 'slide') { R.ox = RM ? rbTargetOx(R.w) : SciSim.approach(R.ox, rbTargetOx(R.w), dt, 18); }
    else if (R.drag) { R.ox = tx; R.oy = ty; }
    else { R.ox = RM ? tx : SciSim.approach(R.ox, tx, dt, 9); R.oy = RM ? ty : SciSim.approach(R.oy, ty, dt, 9); }
    if (R.msgT > 0) R.msgT -= dt;
    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt);
  }
  function drawRibosomeBig(rx, sy, g, t, o) {
    o = o || {};
    // 큰 소단위(아래, 그릇 모양) / 작은 소단위(위, 돔 모양) — 사이의 틈으로 mRNA가 지나가요
    const gap = g.bh / 2 + 6, hb = PHONE ? 84 : 100, hs = PHONE ? 62 : 74;
    const big = ctx.createLinearGradient(0, sy + gap, 0, sy + gap + hb); big.addColorStop(0, '#fdba74'); big.addColorStop(1, '#ea580c');
    const bowl = () => { ctx.beginPath(); ctx.ellipse(rx, sy + gap, g.rxB, hb, 0, 0, Math.PI, false); ctx.closePath(); };
    D.shadow(() => { ctx.fillStyle = big; bowl(); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3; bowl(); ctx.stroke();
    const sm = ctx.createLinearGradient(0, sy - gap - hs, 0, sy - gap); sm.addColorStop(0, '#fed7aa'); sm.addColorStop(1, '#fb923c');
    const dome = () => { ctx.beginPath(); ctx.ellipse(rx, sy - gap, g.rxS, hs, 0, Math.PI, 2 * Math.PI, false); ctx.closePath(); };
    D.shadow(() => { ctx.fillStyle = sm; dome(); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3; dome(); ctx.stroke();
    if (o.labels !== false) {
      D.text(rx, sy - gap - hs * 0.42, '작은 소단위', { size: 13, weight: 800, color: '#7c2d12' });
      D.text(rx, sy + gap + hb * 0.55, '큰 소단위', { size: 13, weight: 800, color: '#fff7ed', stroke: 'rgba(124,45,18,.6)', strokeWidth: 3 });
    }
  }
  function drawRibo(t) {
    const R = S.rb, g = RG(), N = MRNA1.length;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 28, '리보솜은 mRNA의 코돈을 3염기씩 읽어요', { size: PHONE ? 15 : 19, weight: 800, color: INK });
    // 세포질 배경
    D.shadow(() => { ctx.fillStyle = '#fefce8'; rr(8, 44, VW - 16, VH - 52, 20).fill(); }, { blur: 6, y: 2 });
    D.text(PHONE ? 54 : 58, 68, '세포질', { size: 14, weight: 800, color: '#a16207' });
    drawRibosomeBig(g.rx, g.sy, g, t);
    // 읽는 창 (3염기)
    const cod = R.loaded ? MRNA1.slice(R.w, R.w + 3) : '';
    const isStart = cod === 'AUG';
    if (R.loaded) {
      const wx = g.rx - 1.5 * g.sp - 3, ww = 3 * g.sp + 6, wy = g.sy - g.bh / 2 - 6, wh = g.bh + 12;
      const sh = R.shake > 0 ? Math.sin(R.shake * 60) * 4 : 0;
      ctx.save(); ctx.translate(sh, 0);
      ctx.fillStyle = R.locked ? 'rgba(34,197,94,.16)' : isStart ? 'rgba(250,204,21,.28)' : 'rgba(255,255,255,.5)'; rr(wx, wy, ww, wh, 10).fill();
      ctx.lineWidth = 4; ctx.strokeStyle = R.locked ? '#16a34a' : '#facc15'; rr(wx, wy, ww, wh, 10).stroke();
      ctx.restore();
    }
    // mRNA 가닥
    const stripY = R.oy;
    ctx.save(); ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R.ox - g.sp * 0.7, stripY); ctx.lineTo(R.ox + (N - 1) * g.sp + g.sp * 0.7, stripY); ctx.stroke(); ctx.restore();
    const dragging = R.drag && R.drag.mode === 'load';
    if (dragging) { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(R.ox + N * g.sp / 2, stripY + 24, N * g.sp / 2, 8, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
    for (let i = 0; i < N; i++) {
      const x = R.ox + i * g.sp, inWin = R.loaded && i >= R.w && i < R.w + 3;
      if (x < -g.sp || x > VW + g.sp) continue;
      block(x, stripY - (dragging ? 6 : 0), g.bw, g.bh, MRNA1[i], { size: g.bh * 0.52, glow: inWin && isStart, alpha: R.loaded && !inWin && !R.locked ? 0.55 : 1, scale: dragging ? 1.04 : 1 });
    }
    // 가닥이 계속 이어진다는 표시 (양쪽 끝 흐리게)
    [[8, 1], [VW - 8, -1]].forEach(([x, dir]) => { const gr = ctx.createLinearGradient(x, 0, x + dir * 46, 0); gr.addColorStop(0, '#fefce8'); gr.addColorStop(1, 'rgba(254,252,232,0)'); ctx.fillStyle = gr; ctx.fillRect(dir > 0 ? x : x - 46, g.sy - 40, 46, 80); });
    // 코돈 구분(잠근 뒤)
    if (R.locked) {
      for (let c = START_W; c + 3 <= N; c += 3) {
        const x0 = R.ox + c * g.sp - g.bw / 2, x1 = R.ox + (c + 2) * g.sp + g.bw / 2, y = g.sy + g.bh / 2 + 10;
        if (x1 < 0 || x0 > VW) continue;
        const cur = c === R.w;
        ctx.save(); ctx.strokeStyle = cur ? '#16a34a' : '#94a3b8'; ctx.lineWidth = cur ? 4 : 2.5; ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 5); ctx.stroke(); ctx.restore();
        D.text((x0 + x1) / 2, y + 17, '코돈 ' + ((c - START_W) / 3 + 1), { size: 12, weight: 800, color: cur ? '#15803d' : '#64748b' });
      }
    }
    // 작은 소단위가 가닥 위를 덮는 모습 (틈 가장자리)
    // 이름표
    if (R.loaded) {
      D.label(g.rx, g.sy - g.bh / 2 - 6 - (PHONE ? 62 : 74) - 18, '읽는 창 : ' + cod.split('').join(' '), { bg: R.locked ? '#15803d' : isStart ? '#ca8a04' : '#475569', size: PHONE ? 13 : 15 });
    } else {
      D.label(g.rx, g.loadY + 46, 'mRNA는 세포질에 떠 있어요', { bg: '#64748b', size: PHONE ? 12 : 13.5 });
      D.arrow(g.rx, g.loadY - 34, g.rx, g.sy + g.bh / 2 + (PHONE ? 100 : 118), { color: '#16a34a', width: 3.5, head: 12, dash: [8, 6] });
      D.label(g.rx + (PHONE ? 100 : 150), g.loadY - 62, '끌어다 리보솜 틈에 끼워요', { bg: '#16a34a', size: PHONE ? 12 : 13.5 });
      if (!R.drag) D.ring(g.rx, g.loadY, 34, t, { color: '#16a34a', speed: 0.9, width: 2 });
    }
    if (R.loaded && !R.locked && !R.drag) D.text(g.rx, g.sy + g.bh / 2 + 6 + (PHONE ? 84 : 100) + 40, '◀ ▶ 로 읽는 창을 옮겨 시작 코돈 AUG를 찾아요', { size: PHONE ? 12.5 : 14, weight: 800, color: '#a16207' });
    if (R.msgT > 0) D.label(VW / 2, PHONE ? 90 : 84, R.msg, { bg: R.msg.includes('않') || R.msg.includes('아니') || R.msg.includes('시작 코돈은') ? '#b45309' : '#15803d', size: PHONE ? 11.5 : 13.5 });
  }

  /* ======================================================
     화면 ②: 코돈표 — mRNA를 3개씩 끊어 아미노산으로
     ====================================================== */
  const TBG = () => (PHONE
    ? { tx: 10, ty: 38, tw: 500, th: 306, rowY0: 78, rowH: 29, cx: 260, lw: 26, lh: 34, ly: 388, ry: 486, cw: 92, ch: 58, py: 556, pcw: 152, pch: 50, pcy: 576 }
    : { tx: 14, ty: 38, tw: 290, th: 510, rowY0: 84, rowH: 46, cx: 553, lw: 26, lh: 34, ly: 124, ry: 250, cw: 84, ch: 58, py: 330, pcw: 144, pch: 46, pcy: 352 });
  function tbLetterX(k, gapNow) {
    const g = TBG(), W = 15 * g.lw + 4 * gapNow;
    return g.cx - W / 2 + k * g.lw + Math.floor(k / 3) * gapNow + g.lw / 2;
  }
  const tbChipPos = (i) => { const g = TBG(), c = i % 3, r = Math.floor(i / 3), tot = 3 * g.pcw + 16; return { x: g.cx - tot / 2 + c * (g.pcw + 8) + g.pcw / 2, y: g.pcy + r * (g.pch + 8) + g.pch / 2 }; };
  function tbCut() { const T = S.tb; if (T.cut[T.q]) return; T.cut[T.q] = 1; Sound.click(); updateCtl(); }
  function tbPick(key) {
    const T = S.tb, q = T.q, sq = SEQS[q];
    if (!T.cut[q]) { showHint('먼저 ✂ 3개씩 끊기를 눌러요', 2500); return; }
    if (T.done[q]) { showHint('이 서열은 번역이 끝났어요. 다른 서열을 해 봐요', 2500); return; }
    const i = T.idx[q], cod = sq.s.slice(i * 3, i * 3 + 3), ans = CODON[cod];
    if (key === ans) {
      T.res[q].push({ aa: key, cod }); T.idx[q]++; Sound.tick();
      const g = TBG(), n = T.res[q].length - 1, tot = 5 * g.cw + 4 * 6, cx = g.cx - tot / 2 + n * (g.cw + 6) + g.cw / 2;
      if (!RM) parts.burst(cx, g.ry, { count: 8, speed: 100, size: 3, life: 0.5, colors: [AAI[key].col, '#fff'] });
      T.msg = cod + ' → ' + (key === 'STOP' ? '종결 코돈! 번역이 끝나요' : AAI[key].ko); T.msgT = 2;
      if (key === 'STOP') { T.done[q] = true; Sound.success(); T.msg = cod + '는 종결 코돈이에요. 아미노산을 정하지 않고 합성이 끝나요!'; T.msgT = 4; if (!RM) parts.burst(g.cx, g.ry, { count: 18, speed: 160, size: 4 }); }
    } else {
      T.wrong++; T.shake = 0.45; T.flashRow = rowOf(cod); T.flash = 2.4; Sound.fail();
      T.msg = key === 'STOP' ? cod + '는 종결 코돈이 아니에요. 코돈표의 ' + cod + ' 행을 찾아봐요' : cod + '의 아미노산은 ' + AAI[key].ko + (hasFinal(AAI[key].ko) ? '이' : '가') + ' 아니에요. 코돈표에서 ' + cod + ' 행을 확인해요';
      T.msgT = 4;
    }
    updateCtl();
  }
  function stepTb(dt) {
    const T = S.tb;
    for (let q = 0; q < 2; q++) T.cutAnim[q] = RM ? T.cut[q] : SciSim.approach(T.cutAnim[q], T.cut[q], dt, 7);
    if (T.msgT > 0) T.msgT -= dt; if (T.flash > 0) T.flash -= dt; if (T.shake > 0) T.shake = Math.max(0, T.shake - dt);
  }
  function drawTb(t) {
    const T = S.tb, g = TBG(), q = T.q, sq = SEQS[q], cut = T.cutAnim[q], gap = 8 * cut;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 코돈표
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(g.tx, g.ty, g.tw, g.th, 16).fill(); }, { blur: 6, y: 2 });
    D.text(g.tx + g.tw / 2, g.ty + 30, '📖 코돈표 (간단히 줄인 것)', { size: PHONE ? 14 : 16.5, weight: 800, color: INK });
    TABLE_ROWS.forEach((r, i) => {
      const y = g.rowY0 + i * g.rowH, key = ROW_AA[i], a = AAI[key];
      const hot = T.flash > 0 && T.flashRow === i;
      ctx.fillStyle = hot ? 'rgba(250,204,21,' + (0.35 + 0.25 * Math.sin(t * 10)) + ')' : i % 2 ? '#f8fafc' : '#fff'; rr(g.tx + 8, y, g.tw - 16, g.rowH - 4, 8).fill();
      if (hot) { ctx.strokeStyle = '#eab308'; ctx.lineWidth = 3; rr(g.tx + 8, y, g.tw - 16, g.rowH - 4, 8).stroke(); }
      D.text(g.tx + 18, y + g.rowH / 2 + 4, r.join(' · '), { size: PHONE ? 13.5 : 15.5, weight: 800, color: '#334155', align: 'left' });
      const ax = g.tx + g.tw - (PHONE ? 126 : 112);
      D.sphere(ax - 14, y + (g.rowH - 4) / 2, PHONE ? 7 : 9, a.col, { gloss: false });
      D.text(ax, y + g.rowH / 2 + 4, (key === 'STOP' ? '종결' : a.ko) + (i === 0 ? ' (시작)' : ''), { size: PHONE ? 12.5 : 14, weight: 800, color: key === 'STOP' ? '#111827' : '#334155', align: 'left' });
    });
    // mRNA 글자
    const sh = T.shake > 0 ? Math.sin(T.shake * 60) * 4 : 0;
    D.text(g.cx, g.ly - 36, 'mRNA 서열 ' + (q + 1) + (T.cut[q] ? '  (코돈 5개)' : ''), { size: PHONE ? 13.5 : 15.5, weight: 800, color: INK });
    ctx.save(); ctx.translate(sh, 0);
    for (let k = 0; k < 15; k++) {
      const x = tbLetterX(k, gap), ci = Math.floor(k / 3), cur = T.cut[q] && ci === T.idx[q] && !T.done[q];
      block(x, g.ly, g.lw - 2, g.lh, sq.s[k], { size: 17, alpha: T.cut[q] && ci < T.idx[q] ? 0.5 : 1, shadow: false, glow: cur });
    }
    if (T.cut[q]) {
      for (let c = 0; c < 5; c++) {
        const x0 = tbLetterX(c * 3, gap) - g.lw / 2 - 1, x1 = tbLetterX(c * 3 + 2, gap) + g.lw / 2 + 1, cur = c === T.idx[q] && !T.done[q];
        ctx.strokeStyle = cur ? '#eab308' : c < T.idx[q] ? '#22c55e' : '#cbd5e1'; ctx.lineWidth = cur ? 4 : 2.5; rr(x0, g.ly - g.lh / 2 - 5, x1 - x0, g.lh + 10, 8).stroke();
        D.text((x0 + x1) / 2, g.ly + g.lh / 2 + 24, '코돈 ' + (c + 1), { size: 11.5, weight: 800, color: cur ? '#a16207' : '#94a3b8' });
      }
    } else {
      D.text(g.cx, g.ly + g.lh / 2 + 28, '✂ 3개씩 끊기를 눌러 코돈으로 나눠요', { size: PHONE ? 12.5 : 14, weight: 800, color: '#16a34a' });
      D.ring(g.cx, g.ly, 50, t, { color: '#16a34a', speed: 0.8, width: 1.5 });
    }
    ctx.restore();
    // 결과 줄 (아미노산 서열)
    D.text(g.cx, g.ry - g.ch / 2 - 12, '아미노산 서열', { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155' });
    const tot = 5 * g.cw + 4 * 6;
    for (let i = 0; i < 5; i++) {
      const x = g.cx - tot / 2 + i * (g.cw + 6) + g.cw / 2, r = T.res[q][i];
      if (r) {
        const a = AAI[r.aa];
        D.shadow(() => { ctx.fillStyle = SciSim.color.rgba(a.col, 0.16); rr(x - g.cw / 2, g.ry - g.ch / 2, g.cw, g.ch, 12).fill(); }, { blur: 3, y: 1 });
        ctx.strokeStyle = a.col; ctx.lineWidth = 2.5; rr(x - g.cw / 2, g.ry - g.ch / 2, g.cw, g.ch, 12).stroke();
        aaBead(x, g.ry - 10, PHONE ? 11 : 12, r.aa, { label: false, shadow: false });
        D.text(x, g.ry + 16, r.aa === 'STOP' ? '종결' : a.ko, { size: PHONE ? 11 : 12.5, weight: 800, color: '#1f2937' });
        D.text(x, g.ry + 31, r.cod, { size: 10.5, weight: 700, color: '#64748b' });
      } else {
        const nxt = i === T.res[q].length && T.cut[q] && !T.done[q];
        ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = nxt ? 3 : 2; ctx.strokeStyle = nxt ? '#16a34a' : '#cbd5e1'; rr(x - g.cw / 2, g.ry - g.ch / 2, g.cw, g.ch, 12).stroke(); ctx.restore();
        D.text(x, g.ry + 6, String(i + 1), { size: 16, weight: 800, color: '#cbd5e1' });
      }
    }
    // 팔레트
    D.text(g.cx, g.py + (PHONE ? 6 : 6), '👇 아미노산 고르기 (현재 코돈의 아미노산)', { size: PHONE ? 12.5 : 14, weight: 800, color: '#334155' });
    const active = T.cut[q] && !T.done[q];
    AAKEYS.forEach((k, i) => {
      const p = tbChipPos(i), a = AAI[k], hv = S.hover === 'p' + k;
      ctx.save(); ctx.globalAlpha = active ? 1 : 0.45;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(p.x - g.pcw / 2, p.y - g.pch / 2 - (hv && active ? 2 : 0), g.pcw, g.pch, 12).fill(); }, { blur: active ? 5 : 1, y: 2 });
      ctx.strokeStyle = a.col; ctx.lineWidth = 2.5; rr(p.x - g.pcw / 2, p.y - g.pch / 2 - (hv && active ? 2 : 0), g.pcw, g.pch, 12).stroke(); ctx.restore();
      D.sphere(p.x - g.pcw / 2 + 22, p.y, PHONE ? 10 : 11, a.col, { gloss: true });
      D.text(p.x + 12, p.y + 5, k === 'STOP' ? '종결' : a.ko, { size: PHONE ? 13.5 : 15, weight: 800, color: '#1f2937', alpha: active ? 1 : 0.5 });
    });
    if (T.msgT > 0) D.label(g.cx, PHONE ? 360 : 58, T.msg, { bg: T.msg.includes('아니') || T.msg.includes('않') && !T.msg.includes('정하지') ? '#b45309' : '#15803d', size: PHONE ? 11 : 13 });
    if (T.done[q]) D.label(g.cx, g.ry + g.ch / 2 + (PHONE ? 20 : 26), '서열 ' + (q + 1) + ' 번역 완료! ' + (T.done[1 - q] ? '두 서열 모두 끝났어요' : '다른 서열도 해 봐요'), { bg: '#15803d', size: PHONE ? 12 : 13.5 });
  }

  /* ======================================================
     화면 ③: 단백질 합성 — tRNA가 아미노산을 운반, 사슬이 길어지고 접혀요
     ====================================================== */
  const REP = { Met: 'AUG', Glu: 'GAA', Pro: 'CCA', Trp: 'UGG', Phe: 'UUU', Lys: 'AAA', Gly: 'GGU', Val: 'GUG' };
  const SYG = () => (PHONE
    ? { sp: 28, bw: 25, pitch: 94, x0: 30, mY: 176, aY: 232, bY: 304, trayY: 506, trayBead: 586, xs: [90, 260, 430], rxB: 125, msgY: 440, F: [260, 330], coilK: 0.85 }
    : { sp: 38, bw: 34, pitch: 128, x0: 87, mY: 130, aY: 180, bY: 246, trayY: 420, trayBead: 486, xs: [200, 400, 600], rxB: 172, msgY: 354, F: [400, 212], coilK: 1 });
  const syCx = (c) => { const g = SYG(); return g.x0 + c * g.pitch + (g.pitch - (PHONE ? 10 : 14)) / 2; };
  const syBaseX = (c, k) => { const g = SYG(); return g.x0 + c * g.pitch + k * g.sp + g.sp / 2; };
  const syXw = (c) => syCx(c) - SYG().pitch / 2;
  function cands(c) {
    const need = CODON[SYN[c]], pool = ['Phe', 'Lys', 'Gly', 'Val', 'Met', 'Glu', 'Pro', 'Trp'].filter((k) => k !== need);
    const d1 = pool[(c * 2 + 1) % pool.length], d2 = pool[(c * 2 + 4) % pool.length] === d1 ? pool[(c * 2 + 5) % pool.length] : pool[(c * 2 + 4) % pool.length];
    const arr = [d1, d2]; arr.splice((c + 1) % 3, 0, need);
    return arr.map((aa) => ({ aa, anti: anti(REP[aa]) }));
  }
  function newSy() {
    S.epoch++;
    const g = SYG();
    S.sy = { c: 0, ph: 'read', chain: [], trna: [], rx: syXw(0), wrong: 0, msg: '', msgT: 0, ghosts: [], relT: 0, f: 0, fv: 0, fspr: new SciSim.Spring(0, { stiffness: 55, damping: 7 }), folded: false, released: false, tok: cands(0), shakeT: 0 };
  }
  function syAttempt(tok, fx, fy) {
    const Y = S.sy, g = SYG(); if (Y.ph !== 'read') { showHint(Y.ph === 'stop' ? '종결 코돈이에요. 🛑 합성 끝내기를 눌러요' : '합성이 끝났어요', 2500); return; }
    const c = Y.c, cod = SYN[c], need = anti(cod);
    if (tok.anti === need) {
      // 이전 tRNA는 떠나요
      Y.trna.forEach((t) => { if (!t.leaving) { t.leaving = true; t.lt = 0; } });
      Y.trna.push({ c, aa: tok.aa, anti: tok.anti, a: 0, leaving: false, lt: 0, pop: 0 });
      const b = { aa: tok.aa, link: 0, pop: 0 };
      Y.chain.push(b);
      SciSim.tween(Y.trna[Y.trna.length - 1], { pop: 1 }, { duration: 0.45, ease: 'outBack' });
      SciSim.tween(b, { pop: 1, link: 1 }, { duration: 0.6, ease: 'outCubic', delay: 0.15 });
      Sound.tick(); if (!RM) parts.burst(syCx(c), g.aY, { count: 8, speed: 90, size: 3, life: 0.5, colors: [AAI[tok.aa].col, '#fff'] });
      Y.msg = cod + ' ↔ ' + tok.anti + ' 짝이 맞아요! ' + eul(AAI[tok.aa].ko) + ' 사슬에 연결'; Y.msgT = 3;
      Y.c++;
      if (Y.c >= SYN.length - 1) { Y.ph = 'stop'; Y.tok = []; Y.msg = '종결 코돈 ' + SYN[SYN.length - 1] + '! 맞는 tRNA가 없어요. 🛑 합성 끝내기를 눌러요'; Y.msgT = 6; Sound.success(); }
      else Y.tok = cands(Y.c);
    } else {
      Y.wrong++; Sound.fail(); Y.ghosts.push({ aa: tok.aa, anti: tok.anti, sx: fx, sy: fy, t: 0 });
      let i = 0; while (i < 3 && COMP[tok.anti[i]] === cod[i]) i++;
      Y.msg = '안티코돈 ' + tok.anti + '의 ' + (i + 1) + '번째 염기 ' + tok.anti[i] + '는 코돈 ' + cod + '의 ' + (i + 1) + '번째 염기 ' + cod[i] + '와 짝이 아니에요 (' + cod[i] + '의 짝은 ' + COMP[cod[i]] + ')'; Y.msgT = 4.5;
    }
    updateCtl();
  }
  function syEnd() { const Y = S.sy; if (Y.ph !== 'stop') return; Y.ph = 'release'; Y.relT = 0; Y.trna.forEach((t) => { if (!t.leaving) { t.leaving = true; t.lt = 0; } }); Sound.click(); updateCtl(); }
  function syFold() { const Y = S.sy; if (Y.ph !== 'released') return; Y.ph = 'fold'; Y.fspr.target = 1; Sound.click(); updateCtl(); }
  function coilPos(i, n, t) {
    const g = SYG(), a = i * 2.35 + 0.4 + (t || 0) * 0.25, r = (20 + i * 13) * g.coilK;
    return { x: g.F[0] + Math.cos(a) * r, y: g.F[1] + Math.sin(a) * r * 0.85 };
  }
  function stepSy(dt) {
    const Y = S.sy, g = SYG();
    const tx = syXw(Math.min(Y.c, SYN.length - 1));
    Y.rx = RM ? tx : SciSim.approach(Y.rx, tx, dt, 5);
    Y.trna.forEach((t) => { if (t.leaving) { t.lt += dt; } });
    Y.trna = Y.trna.filter((t) => !(t.leaving && t.lt > 1.1));
    Y.ghosts.forEach((q) => { q.t += dt; }); Y.ghosts = Y.ghosts.filter((q) => q.t < 0.8);
    if (Y.msgT > 0) Y.msgT -= dt;
    if (Y.ph === 'release') { Y.relT += dt; if (Y.relT >= 1.0) { Y.ph = 'released'; Y.released = true; Sound.success(); Y.msg = '사슬이 리보솜에서 떨어져 나왔어요. 🧶 사슬 접기를 눌러요'; Y.msgT = 6; updateCtl(); } }
    if (Y.ph === 'fold' || Y.ph === 'folded') {
      Y.fspr.update(dt); Y.fv = Y.fspr.value;
      if (Y.ph === 'fold' && Y.fv > 0.97) { Y.ph = 'folded'; Y.folded = true; Sound.success(); Y.msg = '사슬이 접혀 입체 구조의 단백질이 되었어요!'; Y.msgT = 6; if (!RM) parts.burst(g.F[0], g.F[1], { count: 20, speed: 170, size: 4 }); updateCtl(); }
    }
  }
  /* tRNA 모양: 위쪽 안티코돈 3칸 + 줄기 + (옵션) 아미노산 구슬 */
  function drawTrna(x, yA, yB, tr, o) {
    o = o || {};
    const g = SYG(), bs = PHONE ? 20 : 24;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, yA + 12); ctx.lineTo(x, yB - (o.noBead ? 0 : 14)); ctx.stroke();
    ctx.fillStyle = '#ddd6fe'; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5;
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(x + s * (PHONE ? 15 : 18), (yA + yB) / 2 - 4, PHONE ? 11 : 14, 8, 0, 0, 6.3); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    for (let k = 0; k < 3; k++) block(x + (k - 1) * (bs + 2), yA, bs, bs + 4, tr.anti[k], { size: bs * 0.62, alpha: o.alpha, shadow: false, glow: o.glow });
  }
  function drawSy(t) {
    const Y = S.sy, g = SYG(), c = Math.min(Y.c, SYN.length - 1);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 26, 'tRNA가 아미노산을 운반해 사슬을 만들어요', { size: PHONE ? 15 : 19, weight: 800, color: INK });
    D.shadow(() => { ctx.fillStyle = '#fefce8'; rr(8, 40, VW - 16, g.trayY - 72 - 40, 20).fill(); }, { blur: 6, y: 2 });
    // 리보솜 (코돈 2개 = P · A 자리를 덮어요)
    const rel = Y.ph === 'release' ? smooth(Y.relT) : (Y.ph === 'released' || Y.ph === 'fold' || Y.ph === 'folded') ? 1 : 0;
    const rx = Y.rx, big = ctx.createLinearGradient(0, g.mY, 0, g.bY + 90); big.addColorStop(0, '#fdba74'); big.addColorStop(1, '#ea580c');
    ctx.save(); ctx.globalAlpha = 1 - 0.85 * rel;
    D.shadow(() => { ctx.fillStyle = big; ctx.beginPath(); ctx.ellipse(rx, g.aY + 62 + rel * 14, g.rxB, 96, 0, 0, 6.3); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(rx, g.aY + 62 + rel * 14, g.rxB, 96, 0, 0, 6.3); ctx.stroke();
    const sm = ctx.createLinearGradient(0, g.mY - 80, 0, g.mY - 12); sm.addColorStop(0, '#fed7aa'); sm.addColorStop(1, '#fb923c');
    D.shadow(() => { ctx.fillStyle = sm; ctx.beginPath(); ctx.ellipse(rx, g.mY - 36 - rel * 30, g.rxB * 0.78, 34, 0, 0, 6.3); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(rx, g.mY - 36 - rel * 30, g.rxB * 0.78, 34, 0, 0, 6.3); ctx.stroke();
    ctx.restore();
    // P 자리 · A 자리 이름표
    if (rel < 0.5) {
      D.text(syCx(c) - g.pitch, g.aY + 62 + 96 - 16, 'P 자리', { size: 12.5, weight: 800, color: '#fff7ed', stroke: 'rgba(124,45,18,.7)', strokeWidth: 3, alpha: c > 0 ? 1 : 0.4 });
      D.text(syCx(c), g.aY + 62 + 96 - 16, 'A 자리', { size: 12.5, weight: 800, color: '#fff7ed', stroke: 'rgba(124,45,18,.7)', strokeWidth: 3 });
    }
    // mRNA
    ctx.save(); ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x0 - 14, g.mY); ctx.lineTo(g.x0 + 5 * g.pitch - (PHONE ? 6 : 8) + 8, g.mY); ctx.stroke(); ctx.restore();
    SYN.forEach((cod, ci) => {
      const cur = ci === c && Y.ph !== 'folded' && Y.ph !== 'fold' && Y.ph !== 'released';
      for (let k = 0; k < 3; k++) block(syBaseX(ci, k), g.mY, g.bw, g.bw * 0.95, cod[k], { size: g.bw * 0.52, shadow: false, glow: cur && (Y.ph === 'read' || Y.ph === 'stop') && ci === c });
      D.text(syCx(ci), g.mY - 26, ci === 0 ? '시작' : ci === SYN.length - 1 ? '종결' : '코돈 ' + (ci + 1), { size: 11.5, weight: 800, color: ci === SYN.length - 1 ? '#b91c1c' : '#64748b' });
    });
    D.text(g.x0 - 8, g.mY + 5, 'mRNA', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    // A 자리 점선 (tRNA를 놓을 곳)
    if (Y.ph === 'read') {
      const x = syCx(c), w = (PHONE ? 52 : 62);
      ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.strokeStyle = Y.ghosts.length ? '#ef4444' : '#16a34a'; rr(x - w, g.aY - 18, w * 2, g.bY - g.aY + 40, 14).stroke(); ctx.restore();
      D.ring(x, (g.aY + g.bY) / 2, 20, t, { color: '#16a34a', speed: 0.9, width: 2 });
      D.text(x, (g.aY + g.bY) / 2 + 6, '여기', { size: 13, weight: 800, color: '#16a34a' });
    }
    if (Y.ph === 'stop') {
      const x = syCx(c);
      D.label(x, g.aY + 30, '🛑 종결 코돈 ' + SYN[c], { bg: '#b91c1c', size: PHONE ? 12 : 14 }); D.text(x, g.aY + 58, '맞는 tRNA 없음', { size: 12.5, weight: 800, color: '#fff7ed', stroke: 'rgba(124,45,18,.8)', strokeWidth: 3 });
    }
    // 연결 막대 (펩타이드 결합)
    const yb = (i, f) => g.bY + (Y.ph === 'release' ? 14 * smooth(Y.relT) : Y.ph === 'released' ? 14 + Math.sin(t * 2 + i) * 2 : 0);
    const pos = Y.chain.map((b, i) => {
      if (Y.ph === 'fold' || Y.ph === 'folded') { const a = { x: syCx(i), y: g.bY + 14 }, f = clamp(Y.fv, 0, 1.2), cp = coilPos(i, Y.chain.length, Y.ph === 'folded' ? t : 0); return { x: lerp(a.x, cp.x, f), y: lerp(a.y, cp.y, f) }; }
      return { x: syCx(i), y: yb(i) };
    });
    ctx.save(); ctx.strokeStyle = '#78716c'; ctx.lineWidth = Y.ph === 'folded' ? 7 : 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < pos.length; i++) { const lk = Y.chain[i].link; if (lk <= 0.01) continue; ctx.beginPath(); ctx.moveTo(pos[i - 1].x, pos[i - 1].y); ctx.lineTo(lerp(pos[i - 1].x, pos[i].x, lk), lerp(pos[i - 1].y, pos[i].y, lk)); ctx.stroke(); }
    ctx.restore();
    if (Y.ph === 'fold' || Y.ph === 'folded') D.glow(g.F[0], g.F[1], (PHONE ? 70 : 90) * smooth(Y.fv), '#fde68a', 0.6);
    // tRNA
    Y.trna.forEach((tr) => {
      const x = syCx(tr.c), dy = tr.leaving ? 90 * smooth(tr.lt / 1.1) : 0, al = tr.leaving ? 1 - smooth(tr.lt / 1.1) : 1, sc = Math.max(0.2, tr.pop);
      ctx.save(); ctx.translate(x, g.aY + (g.bY - g.aY) / 2 + dy); ctx.scale(sc, sc); ctx.translate(-x, -(g.aY + (g.bY - g.aY) / 2 + dy));
      drawTrna(x, g.aY + dy, g.bY + dy, tr, { alpha: al, noBead: true });
      ctx.restore();
    });
    // 아미노산 구슬
    Y.chain.forEach((b, i) => { const p = pos[i], r = (PHONE ? 15 : 18) * Math.max(0.3, b.pop); aaBead(p.x, p.y, r, b.aa); });
    if (Y.ph === 'folded') { D.label(g.F[0], g.F[1] + (PHONE ? 84 : 84), '🧶 단백질 (입체 구조)', { bg: '#c2410c', size: PHONE ? 13 : 15 }); D.text(g.F[0], g.F[1] + (PHONE ? 114 : 112), Y.chain.map((b) => AAI[b.aa].ko).join('–'), { size: PHONE ? 12 : 13.5, weight: 800, color: '#7c2d12' }); }
    // 아래: tRNA 후보
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.88)'; rr(PHONE ? 10 : 100, g.trayY - 52, PHONE ? VW - 20 : 600, PHONE ? 250 : 170, 16).fill(); }, { blur: 5, y: 2 });
    if (Y.ph === 'read') {
      D.text(VW / 2, g.trayY - 30, '🚚 tRNA 3종 — 안티코돈이 코돈 ' + SYN[c] + '와 짝이 맞는 것을 A 자리로', { size: PHONE ? 12 : 13.5, weight: 800, color: INK });
      Y.tok.forEach((tk, i) => {
        const x = g.xs[i], hv = S.hover === 't' + i, dr = S.drag && S.drag.mode === 'sy' && S.drag.i === i;
        ctx.save(); ctx.globalAlpha = dr ? 0.35 : 1;
        drawTrna(x, g.trayY - (hv ? 3 : 0), g.trayBead - (hv ? 3 : 0), tk, { noBead: false });
        aaBead(x, g.trayBead - (hv ? 3 : 0), PHONE ? 17 : 19, tk.aa);
        D.text(x, g.trayBead + (PHONE ? 38 : 38), AAI[tk.aa].ko, { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#334155' });
        ctx.restore();
      });
    } else if (Y.ph === 'stop') {
      D.text(VW / 2, g.trayY + 6, '🛑 종결 코돈에는 맞는 tRNA가 없어요', { size: PHONE ? 14 : 16, weight: 800, color: '#b91c1c' });
      D.text(VW / 2, g.trayY + 34, '합성이 끝났음을 알리는 신호예요. 🛑 합성 끝내기를 눌러요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
    } else if (Y.ph === 'release' || Y.ph === 'released') {
      D.text(VW / 2, g.trayY + 14, Y.ph === 'release' ? '사슬이 떨어져 나오는 중…' : '🧶 사슬 접기를 눌러 단백질로 만들어요', { size: PHONE ? 14 : 16, weight: 800, color: '#15803d' });
    } else D.text(VW / 2, g.trayY + 14, Y.ph === 'folded' ? '완성! 사슬이 접혀 기능을 가진 단백질이 되었어요' : '사슬이 접히는 중…', { size: PHONE ? 14 : 16, weight: 800, color: '#15803d' });
    // 틀린 tRNA (튕겨 나감)
    Y.ghosts.forEach((q) => {
      const tx = syCx(c), ty = g.aY; let x, y, a;
      if (q.t < 0.25) { const e = q.t / 0.25; x = lerp(q.sx, tx, e); y = lerp(q.sy, ty + 20, e); a = 1; }
      else { const e = (q.t - 0.25) / 0.55; x = lerp(tx, tx + (q.sx < tx ? -90 : 90), SciSim.ease.outCubic(e)); y = ty + 20 + e * 130; a = 1 - e; }
      drawTrna(x, y, y + 70, q, { alpha: clamp(a, 0, 1) }); aaBead(x, y + 70, PHONE ? 15 : 17, q.aa);
      if (q.t < 0.45) D.text(tx, ty - 6, '✖', { size: 24, weight: 800, color: '#ef4444', alpha: 1 - q.t / 0.45 });
    });
    if (S.drag && S.drag.mode === 'sy') { const tk = Y.tok[S.drag.i]; drawTrna(S.drag.x, S.drag.y - 36, S.drag.y + 34, tk, { glow: true }); aaBead(S.drag.x, S.drag.y + 34, PHONE ? 17 : 19, tk.aa); }
    if (Y.msgT > 0) D.label(VW / 2, g.msgY, Y.msg, { bg: Y.msg.includes('아니에요') && !Y.msg.includes('없어요') ? '#b45309' : '#15803d', size: PHONE ? 11 : 13 });
  }

  /* ======================================================
     화면 ④: 변이(염기 1개 변화)와 정보 흐름 정리
     ====================================================== */
  const EXP = [
    { name: '같은 아미노산', cods: ['AUG', 'GGU', 'CCA', 'UGA'], ci: 1, bi: 2, to: 'C', kind: 'same' },
    { name: '바뀐 아미노산', cods: ['AUG', 'CCA', 'GAG', 'AAA', 'UGA'], ci: 2, bi: 1, to: 'U', kind: 'sub' },
    { name: '종결 코돈', cods: ['AUG', 'GAA', 'UGG', 'UUU', 'AAA', 'UAA'], ci: 2, bi: 2, to: 'A', kind: 'stop' },
  ];
  const mutCod = (e) => { const c = e.cods[e.ci].split(''); c[e.bi] = e.to; return c.join(''); };
  function translate(cods) { const out = []; for (const c of cods) { const a = CODON[c]; if (a === 'STOP') break; out.push(a); } return out; }
  const MUG = () => (PHONE
    ? { cw: 24, cp: 8, cy: 108, ay: 166, oy: 270, my: 380, by: 470, rr: 14 }
    : { cw: 34, cp: 16, cy: 96, ay: 154, oy: 244, my: 338, by: 408, rr: 17 });
  function muCodX(e, ci, k) { const g = MUG(), W = e.cods.length * 3 * g.cw + (e.cods.length - 1) * g.cp, x0 = VW / 2 - W / 2; return x0 + ci * (3 * g.cw + g.cp) + k * g.cw + g.cw / 2; }
  function doMut() {
    const M = S.mu, x = M.x; M.mut[x] = !M.mut[x]; if (M.mut[x]) { M.done[x] = true; Sound.success(); const e = EXP[x], g = MUG(); if (!RM) parts.burst(muCodX(e, e.ci, e.bi), g.cy, { count: 14, speed: 140, size: 3.6, colors: ['#fde047', '#fff', '#ec4899'] }); } else Sound.click();
    updateCtl();
  }
  function stepMu(dt) {
    const M = S.mu; for (let i = 0; i < 3; i++) M.flip[i] = RM ? (M.mut[i] ? 1 : 0) : SciSim.approach(M.flip[i], M.mut[i] ? 1 : 0, dt, 5.5);
    M.t = (M.t || 0) + dt;
  }
  function drawChain(ys, label, aas, o) {
    o = o || {}; const g = MUG(), n = aas.length + (o.ghosts ? o.ghosts.length : 0), step = Math.min(70, (VW - 140) / Math.max(6, n)), x0 = 108;
    D.text(PHONE ? 16 : 18, ys - 26, label, { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155', align: 'left' });
    ctx.save(); ctx.strokeStyle = '#78716c'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, ys); ctx.lineTo(x0 + (aas.length - 1) * step, ys); ctx.stroke();
    if (o.ghosts && o.ghosts.length) { ctx.globalAlpha = 0.25; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(x0 + (aas.length - 1) * step, ys); ctx.lineTo(x0 + (n - 1) * step, ys); ctx.stroke(); }
    ctx.restore();
    aas.forEach((a, i) => {
      const x = x0 + i * step, ch = o.changed === i;
      aaBead(x, ys, g.rr + (ch ? 3 : 0), a);
      if (ch) { D.ring(x, ys, g.rr + 8, S.clock, { color: '#ef4444', speed: 1, width: 3 }); D.text(x, ys + g.rr + 22, '바뀜!', { size: 12.5, weight: 800, color: '#ef4444' }); }
    });
    (o.ghosts || []).forEach((a, i) => { const x = x0 + (aas.length + i) * step; ctx.save(); ctx.globalAlpha = 0.28; aaBead(x, ys, g.rr, a, { shadow: false }); ctx.restore(); });
    if (o.cutAt != null) { const x = x0 + (aas.length - 0.5) * step; D.text(x, ys + 5, '✂', { size: 20, weight: 800, color: '#ef4444' }); D.text(x, ys + g.rr + 24, '합성 중단', { size: 12.5, weight: 800, color: '#b91c1c' }); }
    D.text(x0 + (n - 1) * step + (PHONE ? 20 : 30), ys + 5, aas.length + '개', { size: 13, weight: 800, color: '#64748b', align: 'left' });
  }
  function drawRbc(x, y, r, sick, label) {
    ctx.save();
    if (!sick) { const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); g.addColorStop(0, '#fca5a5'); g.addColorStop(1, '#dc2626'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(127,29,29,.35)'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.42, r * 0.34, 0, 0, 6.3); ctx.fill(); }
    else { const g = ctx.createLinearGradient(x - r, y, x + r, y); g.addColorStop(0, '#fca5a5'); g.addColorStop(1, '#b91c1c'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - r * 1.1, y + r * 0.25); ctx.quadraticCurveTo(x, y - r * 1.15, x + r * 1.1, y + r * 0.25); ctx.quadraticCurveTo(x, y - r * 0.45, x - r * 1.1, y + r * 0.25); ctx.fill(); }
    ctx.restore(); D.text(x, y + r + 18, label, { size: 12.5, weight: 800, color: '#334155' });
  }
  function drawMu(t) {
    const M = S.mu, g = MUG(), e = EXP[M.x], f = M.flip[M.x], mutated = M.mut[M.x];
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 28, '염기 하나를 바꾸면 단백질은 어떻게 될까요?', { size: PHONE ? 15 : 19, weight: 800, color: INK });
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, 44, VW - 20, VH - 56, 18).fill(); }, { blur: 6, y: 2 });
    D.text(PHONE ? 20 : 24, g.cy - 34, 'mRNA 코돈', { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155', align: 'left' });
    D.text(PHONE ? 20 : 24, g.ay - 22, '아미노산', { size: PHONE ? 11.5 : 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    const origAA = translate(e.cods), mutCods = e.cods.map((c, i) => (i === e.ci ? mutCod(e) : c)), mutAA = translate(mutCods);
    let stopped = false;
    e.cods.forEach((cod0, ci) => {
      const isM = ci === e.ci, shown = isM ? (f > 0.5 ? mutCod(e) : cod0) : cod0, show = mutated ? mutCods[ci] : cod0;
      const dead = mutated && stopped; // 종결 이후 코돈은 읽히지 않아요
      for (let k = 0; k < 3; k++) {
        const x = muCodX(e, ci, k), isB = isM && k === e.bi;
        let L = shown[k], sx = 1;
        if (isB) { sx = Math.abs(Math.cos(f * Math.PI)); sx = Math.max(0.05, sx); L = f > 0.5 ? e.to : e.cods[e.ci][k]; }
        block(x, g.cy, g.cw - 3, g.cw + 2, L, { size: 18, sx, alpha: dead ? 0.35 : 1, shadow: false, glow: isB && mutated && f > 0.9 });
      }
      const key = CODON[show], a = AAI[key];
      const cx = muCodX(e, ci, 1);
      ctx.save(); ctx.globalAlpha = dead ? 0.35 : 1;
      D.shadow(() => { ctx.fillStyle = SciSim.color.rgba(a.col, 0.16); rr(cx - 3 * g.cw / 2 + 2, g.ay - 18, 3 * g.cw - 4, 36, 10).fill(); }, { blur: 2, y: 1 });
      ctx.strokeStyle = a.col; ctx.lineWidth = 2; rr(cx - 3 * g.cw / 2 + 2, g.ay - 18, 3 * g.cw - 4, 36, 10).stroke(); ctx.restore();
      D.text(cx, g.ay + 5, key === 'STOP' ? '종결' : (PHONE ? key : a.ko), { size: PHONE ? 12 : 13.5, weight: 800, color: '#1f2937', alpha: dead ? 0.35 : 1 });
      if (mutated && CODON[show] === 'STOP') stopped = true;
      if (isM && !mutated) D.ring(muCodX(e, ci, e.bi), g.cy, g.cw * 0.78, t, { color: '#ec4899', speed: 0.9, width: 2.5 });
    });
    if (!mutated) D.text(muCodX(e, e.ci, e.bi), g.cy - g.cw - 8, '▼ 이 염기를 바꿔요', { size: PHONE ? 12 : 13.5, weight: 800, color: '#be185d' });
    else D.label(muCodX(e, e.ci, e.bi), g.cy - g.cw - 10, e.cods[e.ci] + ' → ' + mutCod(e), { bg: '#be185d', size: PHONE ? 12 : 14 });
    // 단백질 비교
    drawChain(g.oy, '원래 단백질', origAA);
    const changed = mutated && e.kind === 'sub' ? e.ci : null;
    const ghosts = mutated && e.kind === 'stop' ? origAA.slice(mutAA.length) : null;
    drawChain(g.my, mutated ? '변이 단백질' : '변이 단백질 (아직 같아요)', mutated ? mutAA : origAA, { changed, ghosts, cutAt: ghosts ? true : null });
    // 결과 설명
    if (mutated && f > 0.85) {
      const msg = e.kind === 'same' ? 'GGU와 GGC는 모두 글라이신 → 아미노산이 그대로예요 (변화 없음)' : e.kind === 'sub' ? '글루탐산 → 발린: 아미노산 1개가 바뀌었어요' : 'UGG → UGA(종결 코돈): 사슬이 일찍 끝나 짧은 단백질이 돼요';
      D.label(VW / 2, g.by, msg, { bg: e.kind === 'same' ? '#15803d' : e.kind === 'sub' ? '#b45309' : '#b91c1c', size: PHONE ? 11 : 13.5 });
      const iy = g.by + (PHONE ? 70 : 62);
      if (e.kind === 'sub') {
        D.text(VW / 2, iy - 24, '헤모글로빈 유전자 일부를 간단히 나타낸 예 — 낫 모양 적혈구', { size: PHONE ? 11.5 : 12.5, weight: 700, color: '#64748b' });
        drawRbc(VW / 2 - (PHONE ? 80 : 110), iy + 22, PHONE ? 22 : 26, false, '정상 적혈구'); D.arrow(VW / 2 - 40, iy + 22, VW / 2 + 40, iy + 22, { color: '#b45309', width: 3, head: 10 }); drawRbc(VW / 2 + (PHONE ? 80 : 110), iy + 22, PHONE ? 22 : 26, true, '낫 모양 적혈구');
      } else if (e.kind === 'stop') {
        const bw = PHONE ? 220 : 300, x0 = VW / 2 - bw / 2;
        D.text(VW / 2, iy - 20, '단백질 길이 비교', { size: PHONE ? 12 : 13, weight: 800, color: '#64748b' });
        ctx.fillStyle = '#22c55e'; rr(x0, iy - 8, bw, 14, 7).fill();
        ctx.fillStyle = '#e2e8f0'; rr(x0, iy + 14, bw, 14, 7).fill(); ctx.fillStyle = '#ef4444'; rr(x0, iy + 14, Math.max(14, bw * mutAA.length / origAA.length), 14, 7).fill();
        D.text(x0 - 8, iy + 4, '원래', { size: 12, weight: 800, color: '#15803d', align: 'right' }); D.text(x0 - 8, iy + 26, '변이', { size: 12, weight: 800, color: '#b91c1c', align: 'right' });
        D.text(x0 + bw + 10, iy + 4, origAA.length + '개', { size: 12, weight: 800, color: '#15803d', align: 'left' }); D.text(x0 + bw + 10, iy + 26, mutAA.length + '개', { size: 12, weight: 800, color: '#b91c1c', align: 'left' });
      } else {
        D.text(VW / 2, iy + 4, '= 같은 단백질 → 기능도 그대로', { size: PHONE ? 14 : 16, weight: 800, color: '#15803d' });
      }
    } else if (!mutated) D.text(VW / 2, g.by, '✏ 염기 하나 바꾸기를 눌러 결과를 확인해요', { size: PHONE ? 12.5 : 14, weight: 800, color: '#16a34a' });
  }

  /* ----- 정보 흐름 정리 (카드 7장 → 칸 7개) ----- */
  const FLT = {
    dna: { name: 'DNA (유전자)', sub: 'TAC CTT GGT ACT', col: '#7c3aed', kind: 's' },
    mrna: { name: 'mRNA', sub: 'AUG GAA CCA UGA', col: '#be185d', kind: 's' },
    aaseq: { name: '아미노산 서열', sub: '메싸이오닌–글루탐산–프롤린', col: '#c2410c', kind: 's' },
    prot: { name: '단백질', sub: '접힌 입체 구조 🧶', col: '#15803d', kind: 's' },
    tr: { name: '전사', sub: '핵 안에서 일어나요', col: '#0369a1', kind: 'p' },
    tl: { name: '번역', sub: '리보솜에서 일어나요', col: '#0369a1', kind: 'p' },
    fold: { name: '접힘', sub: '사슬이 접혀요', col: '#0369a1', kind: 'p' },
  };
  const FL_ORDER = ['dna', 'tr', 'mrna', 'tl', 'aaseq', 'fold', 'prot'];
  const FL_SHUF = ['tl', 'prot', 'dna', 'fold', 'mrna', 'tr', 'aaseq'];
  const FLG = () => (PHONE
    ? { sx: 128, sw: 236, sh: 56, sy0: 64, sdy: 98, tx: 392, tw: 226, th: 56, ty0: 64, tdy: 98 }
    : { sx: 220, sw: 380, sh: 50, sy0: 70, sdy: 68, tx: 608, tw: 300, th: 50, ty0: 70, tdy: 68 });
  function resetFl() { S.fl.slots = new Array(7).fill(null); S.fl.order = FL_SHUF.slice(); }
  function flCheck() {
    const sl = S.fl.slots;
    if (sl.some((x) => !x)) return '일곱 칸을 모두 채워요. 위에서부터 정보가 흘러가는 순서예요.';
    for (let i = 0; i < 7; i++) if (sl[i] !== FL_ORDER[i]) {
      const t = FLT[sl[i]];
      if (i % 2 === 0 && t.kind === 'p') return (i + 1) + '번째 칸에는 <b>물질(단계)</b>이 들어가요. 전사·번역·접힘은 단계 사이의 <b>과정</b>이에요.';
      if (i % 2 === 1 && t.kind === 's') return (i + 1) + '번째 칸에는 <b>과정</b>(전사 · 번역 · 접힘)이 들어가요.';
      return (i + 1) + '번째 칸이 달라요. ' + (i === 0 ? '유전 정보의 원본이에요.' : i === 1 ? 'DNA에서 mRNA가 만들어지는 과정이에요.' : i === 2 ? '핵 밖으로 나가는 복사본이에요.' : i === 3 ? 'mRNA의 코돈을 읽어 아미노산을 잇는 과정이에요.' : i === 4 ? '아직 접히지 않은 아미노산 사슬이에요.' : i === 5 ? '사슬이 입체 구조를 이루는 과정이에요.' : '정보의 마지막 결과물이에요.');
    }
    return true;
  }
  function drawFl(t) {
    const g = FLG(), F = S.fl;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(PHONE ? 130 : 220, PHONE ? 30 : 34, '정보가 흐르는 순서', { size: PHONE ? 15 : 18, weight: 800, color: INK });
    D.text(g.tx, PHONE ? 30 : 34, '카드 (눌러서 채워요)', { size: PHONE ? 14 : 16, weight: 800, color: '#64748b' });
    const nxt = F.slots.indexOf(null);
    for (let i = 0; i < 7; i++) {
      const y = g.sy0 + i * g.sdy + g.sh / 2, id = F.slots[i], t0 = id ? FLT[id] : null;
      ctx.save(); ctx.lineWidth = 2.5; ctx.setLineDash(id ? [] : [6, 5]); ctx.strokeStyle = id ? t0.col : (i === nxt ? '#16a34a' : '#94a3b8');
      ctx.fillStyle = id ? SciSim.color.rgba(t0.col, 0.12) : '#fff'; rr(g.sx - g.sw / 2, y - g.sh / 2, g.sw, g.sh, 12).fill(); rr(g.sx - g.sw / 2, y - g.sh / 2, g.sw, g.sh, 12).stroke(); ctx.restore();
      D.text(g.sx - g.sw / 2 + 14, y + 6, '①②③④⑤⑥⑦'[i], { size: 18, weight: 800, color: '#64748b', align: 'left' });
      if (id) { D.text(g.sx + 8, y - 3, t0.name, { size: PHONE ? 14 : 16, weight: 800, color: t0.col }); D.text(g.sx + 8, y + 17, t0.sub, { size: PHONE ? 11 : 12.5, weight: 700, color: '#64748b' }); }
      else if (i === nxt) D.ring(g.sx, y, g.sh * 0.55, t, { color: '#16a34a', speed: 0.9, width: 1.5 });
      if (i < 6) D.arrow(g.sx, y + g.sh / 2 + 2, g.sx, y + g.sdy - g.sh / 2 - 2, { color: '#94a3b8', width: 3, head: 9 });
    }
    F.order.forEach((id, i) => {
      const y = g.ty0 + i * g.tdy + g.th / 2, used = F.slots.includes(id), t0 = FLT[id], hv = S.hover === 'k' + id;
      ctx.save(); ctx.globalAlpha = used ? 0.28 : 1;
      D.shadow(() => { ctx.fillStyle = t0.kind === 'p' ? '#e0f2fe' : '#fff'; rr(g.tx - g.tw / 2, y - g.th / 2 - (hv && !used ? 2 : 0), g.tw, g.th, 12).fill(); }, { blur: used ? 0 : 5, y: 2 });
      ctx.lineWidth = 2.5; ctx.strokeStyle = t0.col; rr(g.tx - g.tw / 2, y - g.th / 2 - (hv && !used ? 2 : 0), g.tw, g.th, 12).stroke(); ctx.restore();
      D.text(g.tx, y - 3, (t0.kind === 'p' ? '⟶ ' : '') + t0.name, { size: PHONE ? 14 : 16, weight: 800, color: t0.col, alpha: used ? 0.4 : 1 });
      D.text(g.tx, y + 17, t0.sub, { size: PHONE ? 11 : 12.5, weight: 700, color: '#64748b', alpha: used ? 0.4 : 1 });
    });
    if (flCheck() === true) D.label(VW / 2, PHONE ? 766 : 540, 'DNA →(전사)→ mRNA →(번역)→ 아미노산 서열 →(접힘)→ 단백질', { bg: '#15803d', size: PHONE ? 11 : 14 });
  }
  function flTap(id) { const F = S.fl, i = F.slots.indexOf(null); if (i < 0 || F.slots.includes(id)) return; F.slots[i] = id; Sound.tick(); updateCtl(); }
  function flSlotTap(i) { const F = S.fl; if (F.slots[i]) { F.slots[i] = null; Sound.click(); updateCtl(); } }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { ribo: '🏭 리보솜', table: '📖 코돈표', synth: '🧶 단백질 합성', mut: '🧬 변이와 흐름' };
  const DEFSUB = { ribo: '', table: '', synth: '', mut: 'change' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub != null && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub != null ? sub : DEFSUB[m]; S.drag = null; if (S.rb) S.rb.drag = null; S.hover = '';
    parts.clear(); updateCtl();
  }
  function ensure(m, sub) { if (S.mode !== m || (sub != null && S.sub !== sub)) setMode(m, sub); }
  function updateCtl() {
    const R = S.rb, T = S.tb, Y = S.sy, M = S.mu, F = S.fl;
    const key = S.mode + (S.sub ? ':' + S.sub : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(S.mode)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#modeSeg').hidden = !(game && game.free);
    $('#mutSegBox').hidden = !(S.mode === 'mut' && game && game.free);
    $$('#mutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.sub));
    // 리보솜
    const cod = R.loaded ? MRNA1.slice(R.w, R.w + 3) : '';
    $('#oRb').textContent = R.loaded ? '창: ' + cod : '—';
    $('#bLoad').disabled = R.loaded; $('#bLock').disabled = !R.loaded || R.locked;
    $('#bLeft').textContent = R.locked ? '◀ 코돈 하나' : '◀ 한 칸'; $('#bRight').textContent = R.locked ? '코돈 하나 ▶' : '▶ 한 칸';
    $('#rbNote').textContent = !R.loaded ? 'mRNA를 끌어다 리보솜 틈에 끼워요. (버튼으로도 장착할 수 있어요.)' : R.locked ? '시작 코돈 AUG에서 읽기를 시작했어요. ◀ ▶ 로 코돈을 하나씩 읽어 봐요.' : '◀ ▶ 로 읽는 창을 한 칸씩 옮겨 시작 코돈 AUG를 찾아요.';
    // 코돈표
    $$('#sqSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.q === T.q));
    $('#bCut').disabled = !!T.cut[T.q];
    $('#tbNote').textContent = !T.cut[T.q] ? 'mRNA를 3개씩 끊은 뒤, 코돈표를 보고 코돈마다 아미노산을 골라요.' : T.done[T.q] ? '서열 ' + (T.q + 1) + ' 번역 완료! ' + (T.done[1 - T.q] ? '두 서열을 모두 번역했어요.' : '다른 서열도 번역해 봐요.') : '노란 칸의 코돈에 해당하는 아미노산을 골라요. (' + (T.idx[T.q] + 1) + '번째 코돈)';
    // 합성
    $('#oSy').textContent = Y.chain.length + ' / 4';
    $('#bEnd').disabled = Y.ph !== 'stop'; $('#bFold').disabled = Y.ph !== 'released';
    $('#syNote').textContent = Y.ph === 'read' ? '코돈 ' + SYN[Y.c] + '에 안티코돈이 맞는 tRNA를 끌어다 A 자리(점선)에 놓아요. 눌러도 돼요.'
      : Y.ph === 'stop' ? '종결 코돈 ' + SYN[SYN.length - 1] + '! 🛑 합성 끝내기를 눌러 사슬을 떼어 내요.'
      : Y.ph === 'release' ? '사슬이 리보솜에서 떨어져 나오는 중…' : Y.ph === 'released' ? '🧶 사슬 접기를 눌러 단백질을 완성해요.' : Y.ph === 'folded' ? '단백질 완성! ↺ 다시 하기로 한 번 더 해 봐도 좋아요.' : '사슬이 접히는 중…';
    // 변이
    const e = EXP[M.x];
    $$('#exSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.x === M.x));
    $('#bMut').textContent = M.mut[M.x] ? '↩ 되돌리기' : '✏ 염기 하나 바꾸기';
    $('#mtNote').innerHTML = '코돈 <b>' + e.cods[e.ci] + '</b>의 ' + (e.bi + 1) + '번째 염기 <b>' + e.cods[e.ci][e.bi] + ' → ' + e.to + '</b>' + (M.mut[M.x] ? ' (바꿈)' : ' 로 바꿔 봐요.');
    $('#oFl').textContent = F.slots.filter(Boolean).length + ' / 7';
  }
  $('#bLoad').addEventListener('click', rbLoad);
  $('#bLeft').addEventListener('click', () => rbShift(-1));
  $('#bRight').addEventListener('click', () => rbShift(1));
  $('#bLock').addEventListener('click', rbLock);
  $('#bRbReset').addEventListener('click', () => { Sound.click(); newRb(); updateCtl(); });
  $('#sqSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.tb.q = +b.dataset.q; updateCtl(); } });
  $('#bCut').addEventListener('click', tbCut);
  $('#bTbReset').addEventListener('click', () => { const T = S.tb, q = T.q; Sound.click(); T.cut[q] = 0; T.idx[q] = 0; T.res[q] = []; T.done[q] = false; T.msgT = 0; updateCtl(); });
  $('#bEnd').addEventListener('click', syEnd);
  $('#bFold').addEventListener('click', syFold);
  $('#bSyReset').addEventListener('click', () => { Sound.click(); S.drag = null; newSy(); updateCtl(); });
  $('#exSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.mu.x = +b.dataset.x; updateCtl(); } });
  $('#bMut').addEventListener('click', doMut);
  $('#mutSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setMode('mut', b.dataset.s); } });
  $('#bFlReset').addEventListener('click', () => { Sound.click(); resetFl(); updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* ---------- 포인터 ---------- */
  const rbHit = (p) => { const R = S.rb, g = RG(); return Math.abs(p.y - R.oy) <= g.bh / 2 + 12 && p.x >= R.ox - g.sp / 2 && p.x <= R.ox + (MRNA1.length - 0.5) * g.sp; };
  function tkHit(p) { const g = SYG(); for (let i = 0; i < S.sy.tok.length; i++) if (Math.abs(p.x - g.xs[i]) <= 52 && p.y >= g.trayY - 24 && p.y <= g.trayBead + 52) return i; return -1; }
  const chipHit = (p) => { const g = TBG(); for (let i = 0; i < AAKEYS.length; i++) { const c = tbChipPos(i); if (Math.abs(p.x - c.x) <= g.pcw / 2 && Math.abs(p.y - c.y) <= g.pch / 2) return AAKEYS[i]; } return ''; };
  function flHit(p) {
    const g = FLG();
    for (let i = 0; i < 7; i++) { const y = g.sy0 + i * g.sdy + g.sh / 2; if (Math.abs(p.x - g.sx) <= g.sw / 2 && Math.abs(p.y - y) <= g.sh / 2 + 4) return { k: 's', i }; }
    for (let i = 0; i < 7; i++) { const y = g.ty0 + i * g.tdy + g.th / 2; if (Math.abs(p.x - g.tx) <= g.tw / 2 && Math.abs(p.y - y) <= g.th / 2 + 4) return { k: 'c', id: S.fl.order[i] }; }
    return null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'ribo') {
        const R = S.rb, g = RG(); if (!rbHit(p)) return false;
        if (!R.loaded) { S.drag = { mode: 'load', gx: p.x - R.ox, x: p.x, y: p.y }; R.drag = S.drag; Sound.click(); return true; }
        if (R.locked) return false;
        S.drag = { mode: 'slide', x0: p.x, w0: R.w }; R.drag = S.drag; return true;
      }
      if (S.mode === 'table') { const k = chipHit(p); if (k) tbPick(k); return false; }
      if (S.mode === 'synth') {
        if (S.sy.ph !== 'read') return false;
        const i = tkHit(p); if (i < 0) return false;
        S.drag = { mode: 'sy', i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true;
      }
      if (S.mode === 'mut' && S.sub === 'flow') { const h = flHit(p); if (!h) return false; if (h.k === 's') flSlotTap(h.i); else flTap(h.id); return false; }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      if (d.mode === 'load') { d.x = p.x; d.y = p.y; }
      else if (d.mode === 'slide') { const g = RG(), R = S.rb; R.w = clamp(Math.round(d.w0 + (d.x0 - p.x) / g.sp), 0, MRNA1.length - 3); }
      else { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; }
    },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null; if (S.rb) S.rb.drag = null;
      if (d.mode === 'load') { const g = RG(); if (Math.abs(p.x - g.rx) <= g.rxB + 20 && Math.abs(p.y - g.sy) <= 110) rbLoad(); else showHint('리보솜 틈(가운데)까지 끌어다 놓아요', 2500); updateCtl(); return; }
      if (d.mode === 'slide') { updateCtl(); return; }
      if (d.mode === 'sy') {
        const g = SYG(), Y = S.sy, tk = Y.tok[d.i]; if (!tk || Y.ph !== 'read') return;
        if (!d.moved) { syAttempt(tk, g.xs[d.i], g.trayY + 30); return; }
        if (Math.abs(p.x - syCx(Y.c)) <= 90 && p.y >= g.aY - 50 && p.y <= g.bY + 70) syAttempt(tk, p.x, p.y);
      }
    },
    hover(p) {
      if (S.mode === 'ribo') return rbHit(p) && !S.rb.locked ? 'grab' : 'default';
      if (S.mode === 'table') { const k = chipHit(p); S.hover = k ? 'p' + k : ''; return k ? 'pointer' : 'default'; }
      if (S.mode === 'synth') { const i = S.sy.ph === 'read' ? tkHit(p) : -1; S.hover = i >= 0 ? 't' + i : ''; return i >= 0 ? 'grab' : 'default'; }
      if (S.mode === 'mut' && S.sub === 'flow') { const h = flHit(p); S.hover = h && h.k === 'c' ? 'k' + h.id : ''; return h ? 'pointer' : 'default'; }
      S.hover = ''; return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  const aaKo = (k) => (k === 'STOP' ? '종결' : AAI[k].ko);
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'ribo') {
      const R = S.rb;
      L1 = '읽는 창'; a = R.loaded ? MRNA1.slice(R.w, R.w + 3).split('').join(' ') : '—';
      L2 = 'mRNA'; b = R.loaded ? '리보솜에 장착됨' : '세포질에 떠 있음'; L3 = '읽기 시작'; c = R.locked ? 'AUG에서 시작' : '아직';
    } else if (S.mode === 'table') {
      const T = S.tb, q = T.q, sq = SEQS[q];
      L1 = 'mRNA 서열 ' + (q + 1); a = sq.s.match(/.{3}/g).join(' ');
      L2 = '번역한 아미노산'; b = T.res[q].length ? T.res[q].map((r) => aaKo(r.aa)).join('–') : '—'; L3 = '틀린 선택'; c = T.wrong + '번';
    } else if (S.mode === 'synth') {
      const Y = S.sy;
      L1 = '읽는 코돈'; a = Y.ph === 'read' || Y.ph === 'stop' ? SYN[Math.min(Y.c, SYN.length - 1)] : '—';
      L2 = '아미노산 사슬'; b = Y.chain.length ? Y.chain.map((x) => AAI[x.aa].ko).join('–') : '—'; L3 = '틀린 tRNA'; c = Y.wrong + '번';
    } else if (S.sub === 'flow') {
      const F = S.fl;
      L1 = '채운 칸'; a = F.slots.filter(Boolean).length + ' / 7'; L2 = '첫 칸'; b = F.slots[0] ? FLT[F.slots[0]].name : '—'; L3 = '마지막 칸'; c = F.slots[6] ? FLT[F.slots[6]].name : '—';
    } else {
      const M = S.mu, e = EXP[M.x], o = translate(e.cods), m = translate(e.cods.map((x, i) => (i === e.ci ? mutCod(e) : x)));
      L1 = '바꾼 코돈'; a = M.mut[M.x] ? e.cods[e.ci] + ' → ' + mutCod(e) : e.cods[e.ci];
      L2 = '단백질 길이'; b = (M.mut[M.x] ? m.length : o.length) + '개 (원래 ' + o.length + '개)'; L3 = '결과'; c = !M.mut[M.x] ? '—' : e.kind === 'same' ? '변화 없음' : e.kind === 'sub' ? '아미노산 1개 바뀜' : '짧은 단백질';
    }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetTb() { const T = S.tb; T.q = 0; T.cut = [0, 0]; T.cutAnim = [0, 0]; T.idx = [0, 0]; T.res = [[], []]; T.done = [false, false]; T.wrong = 0; T.msgT = 0; T.flash = 0; }
  function resetMu() { const M = S.mu; M.x = 0; M.done = [false, false, false]; M.mut = [false, false, false]; M.flip = [0, 0, 0]; }
  function enterLevel(li) {
    S.epoch++; S.drag = null;
    if (li === 0) { newRb(); setMode('ribo'); }
    else if (li === 1) { resetTb(); setMode('table'); }
    else if (li === 2) { newSy(); setMode('synth'); }
    else { resetMu(); resetFl(); setMode('mut', 'change'); }
  }
  const levels = [
    {
      title: '리보솜: mRNA의 코돈을 읽는 공장', short: '리보솜', icon: '🏭', phase: '모형',
      features: ['ribo'],
      intro: '<p class="si-q">❓ 탐구 질문: mRNA의 염기 서열은 어떻게 아미노산 서열로 바뀔까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(전사)에서</b> 핵 속 DNA의 유전자로부터 mRNA(예: AUG GAA CCA UGA)가 만들어져 핵공을 지나 세포질의 리보솜으로 갔어요. 그리고 mRNA의 염기 <b>3개 묶음(코돈)</b>이 아미노산 1개를 정한다는 것도 알았어요.</div>' +
        '<p>이번 차시에서는 리보솜이 mRNA를 읽어 단백질을 만드는 <b>번역</b> 과정을 따라 해요. 먼저 mRNA를 리보솜에 끼우고, 리보솜이 3염기씩 읽는 <b>읽는 창</b>을 <b>시작 코돈 AUG</b>에 맞춰 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '번역은 세포질의 리보솜에서 일어나요. 리보솜은 mRNA를 시작 코돈 AUG부터 3염기(코돈)씩 차례로 읽어요.',
      summary: '<ul><li><b>번역</b>: mRNA의 정보로 <b>단백질</b>(아미노산 사슬)을 만드는 과정. <b>세포질의 리보솜</b>에서 일어나요.</li><li>리보솜은 큰 소단위와 작은 소단위 사이의 틈에 mRNA를 끼우고, 염기를 <b>3개씩(코돈)</b> 읽어요.</li><li>읽기는 <b>시작 코돈 AUG</b>에서 시작해요. (AUG는 메싸이오닌도 정해요.)</li><li>읽는 틀이 한 칸만 어긋나도 전혀 다른 코돈이 읽혀요.</li></ul>',
      missions: [
        {
          title: 'mRNA를 리보솜에 장착하기',
          goal: '세포질에 떠 있는 <b>mRNA를 끌어다 리보솜의 틈</b>에 끼우세요. (📎 버튼으로도 할 수 있어요.)',
          hint: '아래쪽 mRNA 가닥을 손가락(마우스)으로 끌어 위쪽 리보솜 가운데에 놓아요.',
          setup() { ensure('ribo'); },
          check: () => S.rb.loaded, hold: 0.4,
          status: () => mark(S.rb.loaded) + ' mRNA를 리보솜 틈에 장착',
          explain: '리보솜은 큰 소단위와 작은 소단위 <b>사이의 틈</b>으로 mRNA를 끼워 넣고 염기를 읽어요. 번역은 핵 속이 아니라 <b>세포질의 리보솜</b>에서 일어나요.',
        },
        {
          title: '시작 코돈 AUG 찾기',
          goal: '◀ ▶ 로 읽는 창을 옮겨 <b>맨 처음 나오는 AUG</b>에 맞춘 뒤 <b>🔒 여기서 읽기 시작</b>을 누르세요.',
          hint: '읽는 창에는 염기 3개가 들어와요. 한 칸씩 옮기며 A–U–G가 나오는 곳을 찾아요. AUG가 두 번 나오면 먼저 나오는 것이에요.',
          setup() { ensure('ribo'); },
          check: () => S.rb.locked, hold: 0.5,
          status: () => mark(S.rb.loaded) + ' 장착 · ' + mark(S.rb.locked) + ' 시작 코돈 AUG에서 읽기 시작' + (S.rb.loaded && !S.rb.locked ? ' (창: ' + MRNA1.slice(S.rb.w, S.rb.w + 3) + ')' : ''),
          explain: '번역은 <b>시작 코돈 AUG</b>에서 시작해요. 리보솜은 AUG부터 염기를 3개씩 끊어 <b>AUG GAA CCA UGA</b>처럼 코돈 단위로 읽어요. 읽는 틀이 한 칸만 어긋나도 완전히 다른 코돈이 읽혀요.',
        },
        {
          type: 'quiz', title: '번역이 일어나는 곳',
          goal: '리보솜이 mRNA를 읽어 단백질을 만드는 <b>번역</b>이 일어나는 곳은?',
          setup() { ensure('ribo'); },
          choices: ['핵 속', '세포질', '핵공', '세포막'],
          answer: 1,
          feedback: ['핵 속에서는 DNA에서 mRNA를 만드는 <b>전사</b>가 일어나요. 리보솜은 핵 밖에 있어요.', '', '핵공은 mRNA가 핵 밖으로 나가는 통로일 뿐이에요. 번역은 핵 밖의 리보솜에서 일어나요.', '세포막은 물질의 출입을 조절해요. 번역이 일어나는 곳은 아니에요.'],
          explain: '전사는 핵 안에서, <b>번역은 세포질의 리보솜</b>에서 일어나요. 핵공을 지나온 mRNA가 리보솜에 붙어 단백질 합성에 쓰여요.',
        },
      ],
    },
    {
      title: '코돈표: mRNA 서열을 아미노산으로', short: '코돈표', icon: '📖', phase: '탐구',
      features: ['table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 리보솜이 시작 코돈 AUG부터 mRNA를 3염기씩 읽는다는 것을 확인했어요. 그럼 각 코돈은 어떤 아미노산을 정할까요?</div>' +
        '<p><b>코돈표</b>는 코돈과 아미노산의 짝을 정리한 표예요. mRNA를 3개씩 끊고 코돈표를 보며 아미노산 서열로 바꿔 봐요. (간단히 줄인 코돈표를 쓰므로 외울 필요는 없어요.) 아미노산을 정하지 않고 번역을 끝내는 <b>종결 코돈</b>도 만나요.</p>',
      setup() { enterLevel(1); },
      recap: '코돈 하나가 아미노산 하나를 정해요. 시작 코돈은 AUG(메싸이오닌), 종결 코돈(UAA · UAG · UGA)은 아미노산을 정하지 않고 번역을 끝내요.',
      summary: '<table class="mini"><tr><th>코돈</th><th>AUG</th><th>GAA</th><th>CCA</th><th>UGG</th><th>UAA</th></tr><tr><th>아미노산</th><td>메싸이오닌</td><td>글루탐산</td><td>프롤린</td><td>트립토판</td><td>종결</td></tr></table><ul><li>mRNA의 염기를 <b>3개씩 끊어</b> 코돈표로 아미노산을 찾으면 <b>아미노산 서열</b>이 돼요. 예) AUG GAA CCA UGG UAA → 메싸이오닌–글루탐산–프롤린–트립토판–종결.</li><li><b>시작 코돈</b> AUG(메싸이오닌), <b>종결 코돈</b> UAA · UAG · UGA.</li><li>종결 코돈은 아미노산을 지정하지 않아요. 여기서 번역이 끝나요.</li><li>코돈 1개는 아미노산 1개에 대응해요. (아미노산 1개에 여러 코돈이 대응하기도 해요: GAA · GAG, GGU · GGC)</li></ul>',
      missions: [
        {
          title: '서열 2개 번역하기',
          goal: 'mRNA 서열 1, 2를 <b>✂ 3개씩 끊고</b> 코돈표를 보며 코돈마다 아미노산을 골라 번역한 뒤 <b>✔ 확인하기</b>를 누르세요. 종결 코돈에서 끝나요.',
          hint: '코돈표에서 코돈이 적힌 행을 찾아 그 행의 아미노산을 골라요. UAA처럼 종결이라고 적힌 코돈은 종결을 골라요.',
          manual: true,
          setup() { ensure('table'); },
          check() {
            const T = S.tb;
            if (!T.done[0] && !T.done[1]) return '서열 1과 서열 2를 모두 끝까지 번역해요. (✂ 3개씩 끊기 → 아미노산 고르기)';
            if (!T.done[0]) return '서열 1이 아직 끝나지 않았어요. 종결 코돈까지 번역해요.';
            if (!T.done[1]) return '서열 2가 아직 끝나지 않았어요. 서열 2 탭에서 번역해요.';
            return true;
          },
          explain: 'AUG GAA CCA UGG UAA → <b>메싸이오닌–글루탐산–프롤린–트립토판</b>(UAA에서 종결), AUG UUU AAA GGU UGA → <b>메싸이오닌–페닐알라닌–라이신–글라이신</b>(UGA에서 종결). 코돈 하나가 아미노산 하나를 정하고, 종결 코돈에서 번역이 끝나요.',
        },
        {
          type: 'quiz', title: 'UAA에서 번역이 끝나는 까닭',
          goal: 'mRNA에서 코돈 <b>UAA</b>를 만나면 아미노산 사슬 만들기가 끝나는 까닭은?',
          setup() { ensure('table'); },
          choices: ['UAA는 아미노산을 정하지 않고 번역이 끝났음을 알리는 종결 코돈이기 때문이다', 'UAA에 해당하는 아미노산이 너무 커서 사슬에 연결되지 못하기 때문이다', 'UAA는 시작 코돈이라서 새 mRNA를 만들기 때문이다', 'mRNA에 더 이상 염기가 없기 때문이다'],
          answer: 0,
          feedback: ['', 'UAA에는 아미노산이 대응하지 않아요. 크기 문제가 아니에요.', '시작 코돈은 AUG예요. UAA, UAG, UGA는 종결 코돈이에요.', '종결 코돈 뒤에 염기가 더 남아 있어도 번역은 거기서 끝나요.'],
          explain: 'UAA, UAG, UGA는 <b>종결 코돈</b>으로, 대응하는 아미노산이 없어요. 리보솜이 종결 코돈을 만나면 번역이 끝나고 아미노산 사슬이 떨어져 나와요. 코돈 1개에는 아미노산 1개가 대응하거나(종결은 없음) 번역 종료 신호가 돼요.',
        },
      ],
    },
    {
      title: '단백질 합성: tRNA와 아미노산 사슬', short: '단백질 합성', icon: '🧶', phase: '모형',
      features: ['synth'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 코돈마다 아미노산이 정해져 있다는 것을 코돈표로 확인했어요. 그런데 아미노산은 누가 리보솜까지 가져다줄까요?</div>' +
        '<p>세포질에는 아미노산을 하나씩 싣고 오는 <b>tRNA</b>가 있어요. tRNA의 <b>안티코돈</b>(염기 3개)이 mRNA 코돈과 <b>짝이 맞을 때만</b> 결합해요(A–U, G–C). 결합하면 아미노산이 사슬에 이어지고, 완성된 사슬은 접혀 <b>단백질</b>이 돼요.</p>',
      setup() { enterLevel(2); },
      recap: 'tRNA는 안티코돈으로 mRNA 코돈을 알아보고 알맞은 아미노산을 운반해요. 아미노산이 차례로 연결된 사슬은 접혀 단백질이 돼요.',
      summary: '<ul><li><b>tRNA</b>: 한쪽에 <b>안티코돈</b>(염기 3개), 다른 쪽에 <b>아미노산 1개</b>를 달고 있어요. 안티코돈이 코돈과 <b>짝(A–U, G–C)</b>이 맞을 때만 결합해요. (AUG ↔ UAC, GAA ↔ CUU)</li><li>리보솜이 코돈을 하나씩 읽을 때마다 알맞은 tRNA가 들어와 <b>아미노산이 사슬로 연결</b>돼요.</li><li><b>종결 코돈</b>에는 맞는 tRNA가 없어 번역이 끝나고 사슬이 떨어져 나와요.</li><li>아미노산 사슬은 <b>접혀서</b> 입체 구조의 <b>단백질</b>이 돼요.</li></ul>',
      missions: [
        {
          title: '아미노산 4개 연결하기',
          goal: 'mRNA <b>AUG GAA CCA UGG UAA</b>의 코돈마다 안티코돈이 짝이 맞는 tRNA를 <b>A 자리</b>에 놓아 아미노산 <b>4개</b>를 연결하세요.',
          hint: '코돈의 A는 U와, G는 C와, C는 G와, U는 A와 짝이 돼요. 예: AUG ↔ UAC. 틀리면 튕겨 나와요.',
          setup() { ensure('synth'); },
          check: () => S.sy.chain.length >= 4, hold: 0.6,
          status: () => mark(S.sy.chain.length >= 4) + ' 아미노산 ' + S.sy.chain.length + ' / 4개 연결 · 틀린 tRNA ' + S.sy.wrong + '번',
          explain: '안티코돈이 코돈과 짝(A–U, G–C)이 맞는 tRNA만 결합해요: AUG ↔ UAC(메싸이오닌), GAA ↔ CUU(글루탐산), CCA ↔ GGU(프롤린), UGG ↔ ACC(트립토판). 이렇게 아미노산이 코돈 순서대로 연결돼요.',
        },
        {
          title: '사슬을 접어 단백질 만들기',
          goal: '종결 코돈 UAA에서 <b>🛑 합성 끝내기</b>를 누르고, <b>🧶 사슬 접기</b>로 단백질을 완성하세요.',
          hint: '4번째 아미노산까지 연결하면 종결 코돈이 나타나요. 먼저 🛑 합성 끝내기, 그다음 🧶 사슬 접기를 눌러요.',
          setup() { ensure('synth'); },
          check: () => S.sy.folded, hold: 0.5,
          status: () => mark(S.sy.chain.length >= 4) + ' 연결 · ' + mark(S.sy.released) + ' 합성 끝내기 · ' + mark(S.sy.folded) + ' 사슬 접기',
          explain: '종결 코돈에는 맞는 tRNA가 없어서 번역이 끝나고 아미노산 사슬이 리보솜에서 떨어져 나와요. 이 사슬이 스스로 <b>접혀</b> 입체 구조를 이루면 기능을 하는 <b>단백질</b>이 돼요. (효소, 구조 단백질 등)',
        },
        {
          type: 'quiz', title: 'tRNA의 역할',
          goal: '<b>tRNA</b>의 역할로 옳은 것은?',
          setup() { ensure('synth'); },
          choices: ['안티코돈으로 mRNA의 코돈을 알아보고 알맞은 아미노산을 리보솜으로 운반한다', 'DNA의 염기 서열을 복사해 mRNA를 만든다', '아미노산을 직접 만들어 사슬에 연결한다', '핵공을 통해 DNA를 세포질로 옮긴다'],
          answer: 0,
          feedback: ['', 'DNA에서 mRNA를 만드는 것은 전사이고 RNA 중합 효소가 해요. tRNA는 번역에서 일해요.', 'tRNA는 아미노산을 만드는 것이 아니라 <b>운반</b>해요.', 'DNA는 핵공을 지나지 못해요. tRNA는 세포질에서 아미노산을 운반해요.'],
          explain: 'tRNA는 한쪽 끝에 아미노산을 달고, 반대쪽의 <b>안티코돈</b>으로 mRNA 코돈과 짝을 이루어 <b>알맞은 아미노산을 리보솜으로 운반</b>해요. 그래서 mRNA의 코돈 순서대로 아미노산이 연결돼요.',
        },
      ],
    },
    {
      title: '변이와 흐름: 염기 하나의 변화', short: '변이와 흐름', icon: '🧬', phase: '확인',
      features: ['mut'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 코돈마다 알맞은 tRNA가 아미노산을 가져와 사슬이 만들어졌어요. 만약 mRNA 코돈의 염기가 하나 바뀌면 어떻게 될까요?</div>' +
        '<p>mRNA 코돈의 염기 <b>하나</b>를 바꾸는 실험 세 가지를 비교해요. 그리고 마지막으로 <b>DNA → mRNA → 아미노산 서열 → 단백질</b>의 전체 흐름을 순서대로 완성해요.</p>',
      setup() { enterLevel(3); },
      recap: '염기 하나가 바뀌어도 아미노산이 그대로일 수도, 하나만 바뀔 수도, 종결 코돈이 생겨 사슬이 짧아질 수도 있어요. 정보는 DNA → mRNA → 단백질로 흘러요.',
      summary: '<table class="mini"><tr><th>변화</th><th>예</th><th>결과</th></tr><tr><th>같은 아미노산</th><td>GGU → GGC</td><td>변화 없음 (둘 다 글라이신)</td></tr><tr><th>다른 아미노산</th><td>GAG → GUG</td><td>글루탐산 → 발린 (낫 모양 적혈구)</td></tr><tr><th>종결 코돈</th><td>UGG → UGA</td><td>짧은 단백질</td></tr></table><ul><li>염기 하나의 변화가 항상 같은 영향을 주는 것은 아니에요.</li><li>정보의 흐름: <b>DNA(유전자) →(전사)→ mRNA →(번역)→ 아미노산 서열 →(접힘)→ 단백질</b> → 기능(효소, 구조 등) → 형질.</li><li>생명 시스템은 이렇게 체계적인 <b>정보의 흐름</b>으로 단백질을 만들어 유지돼요.</li></ul>',
      missions: [
        {
          title: '염기 하나 바꾸기 실험 3가지',
          goal: '세 실험(① ② ③)에서 각각 <b>✏ 염기 하나 바꾸기</b>를 눌러, 단백질이 어떻게 달라지는지 비교하세요.',
          hint: '① ② ③ 탭을 하나씩 선택하고 ✏ 버튼을 눌러요. 아래의 원래 단백질과 변이 단백질을 비교해요.',
          setup() { ensure('mut', 'change'); },
          check: () => S.mu.done.every(Boolean), hold: 0.6,
          status: () => ['① 같은 아미노산', '② 바뀐 아미노산', '③ 종결 코돈'].map((n, i) => mark(S.mu.done[i]) + ' ' + n).join(' · '),
          explain: '염기 하나가 바뀌어도 ① <b>같은 아미노산</b>을 정하는 코돈이면 변화가 없고(GGU → GGC), ② <b>다른 아미노산</b>이 되면 아미노산 1개가 바뀌며(GAG → GUG, 글루탐산 → 발린: 낫 모양 적혈구), ③ <b>종결 코돈</b>이 생기면 단백질이 짧아져요(UGG → UGA). 결과는 항상 같지 않아요.',
        },
        {
          title: '정보 흐름 완성하기',
          goal: '오른쪽 카드 7장을 눌러 왼쪽 칸을 위에서부터 채워 <b>DNA → mRNA → 단백질</b>의 전체 흐름을 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '물질(DNA, mRNA, 아미노산 서열, 단백질)과 과정(전사, 번역, 접힘)이 번갈아 나와요. 맨 위는 유전자가 있는 DNA예요.',
          manual: true,
          setup() { ensure('mut', 'flow'); },
          check: () => flCheck(),
          explain: '정보는 <b>DNA(유전자) →(전사)→ mRNA →(번역)→ 아미노산 서열 →(접힘)→ 단백질</b> 순서로 흘러요. 전사는 핵 안에서, 번역은 세포질의 리보솜에서 일어나요. 이렇게 체계적으로 구성된 정보의 흐름이 생명 시스템을 유지해요.',
        },
        {
          type: 'quiz', title: '염기 하나의 변화와 단백질',
          goal: 'mRNA 코돈의 염기 <b>하나</b>가 바뀌었을 때에 대한 설명으로 옳은 것은?',
          setup() { ensure('mut', 'flow'); },
          choices: ['아미노산이 바뀌지 않을 수도, 하나만 바뀔 수도, 합성이 일찍 끝날 수도 있다', '염기가 바뀌면 반드시 아미노산이 바뀐다', '염기 하나가 바뀌면 mRNA의 다른 코돈도 모두 따라서 바뀐다', '염기 하나가 바뀌면 단백질이 항상 만들어지지 않는다'],
          answer: 0,
          feedback: ['', 'GGU → GGC처럼 코돈이 바뀌어도 같은 아미노산(글라이신)을 정하는 경우가 있어요.', '바뀐 코돈 하나만 달라져요. 다른 코돈은 그대로예요.', '단백질이 만들어지지 않는 것이 아니라 아미노산이 바뀌거나 사슬이 짧아질 수 있어요.'],
          explain: '염기 하나의 변화는 <b>① 변화 없음, ② 아미노산 1개 변화, ③ 종결 코돈 생성</b> 중 하나로 나타날 수 있어요. 어떤 결과가 나오는지는 바뀐 염기가 어떤 코돈을 만드는지에 따라 달라요.',
        },
      ],
    },
  ];

  newRb(); newSy(); resetTb(); resetMu(); resetFl();
  game = SciSim.game({
    simId: 'h1-translation', mount: '#game', badge: '번역 박사', homeHref: '../../index.html#h1a',
    featureLabels: { ribo: '🏭 리보솜 · 읽는 창 · 시작 코돈', table: '📖 코돈표 · 아미노산 고르기', synth: '🧶 tRNA 3종 · A 자리 · 사슬 접기', mut: '🧬 염기 바꾸기 실험 · 정보 흐름 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'ribo') stepRb(dt);
    else if (S.mode === 'table') stepTb(dt);
    else if (S.mode === 'synth') stepSy(dt);
    else if (S.sub === 'change') stepMu(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'ribo') drawRibo(t);
    else if (S.mode === 'table') drawTb(t);
    else if (S.mode === 'synth') drawSy(t);
    else if (S.sub === 'flow') drawFl(t);
    else drawMu(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, enterLevel, updateCtl, RG, TBG, SYG, MUG, FLG, tbChipPos, syCx, cands, syAttempt, tbPick, rbLoad, rbShift, rbLock, doMut, flTap, EXP, SYN, SEQS, MRNA1,
  };
})();
