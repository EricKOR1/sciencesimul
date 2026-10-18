/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 결합의 극성 [12화학02-02 (뒷부분)]
   ① 모형: 전자 구름 (두 원자의 전기 음성도 슬라이더 → 공유 전자쌍 구름의 위치, δ+ / δ−)
   ② 탐구: Δχ와 화살표 (결합 카드 8개의 Δχ 계산, 쌍극자 모멘트 화살표의 방향 · 상대 길이)
   ③ 분석: 결합 연속체 (Δχ 눈금 위 결합 배치, 이온 결합은 극성의 끝)
   ④ 적용: 결합 판단 (더 극성인 결합 · 화살표 방향 · 극성/무극성 분류)
   ※ 쌍극자 모멘트는 정성적으로만 다뤄요 (화살표 방향 = δ+ → δ−, 길이 = 상대 크기, 디바이 값 계산 없음).
   ※ 이온 결합의 구분은 Δχ 숫자 하나로 자르지 않고 '금속 + 비금속'이라는 구성 원소와 함께 판단해요.
   ※ 전자 구름이 쏠리는 정도는 Δχ가 클수록 커지는 정성적 모형이에요 (같은 함수를 모든 장면에서 써요).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const { tween, approach, Spring } = SciSim;
  const CO = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const FS = PHONE ? 1.12 : 1;
  const fs = (n) => Math.round(n * FS);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const fx = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size: fs(size), color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(fs(size), weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill, stroke) {
    D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
    if (stroke) { D.roundRect(x, y, w, h, r || 14); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  const INK = '#1b2333', MUTED = '#5d6879', GOOD = '#14a058', BAD = '#d6453d', GOLD = '#f5b400';
  const PUR = '#7c3aed', PURD = '#4c1d95', GRN = '#0b6b39';

  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hintOff() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k; $('#roL' + i).textContent = label; $('#roV' + i).innerHTML = value;
  }

  /* ---------- 자료: 전기 음성도(10배한 정수)와 결합 ---------- */
  const EN10 = { H: 21, C: 25, N: 30, O: 35, F: 40, Na: 9, Mg: 12, Cl: 30, K: 8, Br: 28, I: 25 };
  const NAME = { H: '수소', C: '탄소', N: '질소', O: '산소', F: '플루오린', Na: '나트륨', Mg: '마그네슘', Cl: '염소', K: '칼륨', Br: '브로민', I: '아이오딘' };
  const METAL = { Na: 1, Mg: 1, K: 1 };
  const EN_MIN = 8, EN_MAX = 40;
  const enColor = (e10) => { const t = clamp((e10 - EN_MIN) / (EN_MAX - EN_MIN), 0, 1); return CO.mix('#f1ebfd', '#5b21b6', Math.pow(t, 0.85)); };
  const darkText = (e10) => (e10 - EN_MIN) / (EN_MAX - EN_MIN) < 0.55;
  const f1 = (v10) => (v10 / 10).toFixed(1);
  const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const qOf = (d10) => smooth01(d10 / 10 / 2.4);                 // 전자쌍이 쏠리는 정도 (0 ~ 1)
  const posOf = (ea, eb) => 0.5 + 0.5 * Math.sign(eb - ea) * qOf(Math.abs(ea - eb));
  const ORD = { 1: '–', 2: '=', 3: '≡' };
  function bond(a, b, order) {
    order = order || 1;
    const ea = EN10[a], eb = EN10[b];
    return { a, b, order, id: a + b + order, ea, eb, d10: Math.abs(ea - eb), dir: ea === eb ? 'N' : eb > ea ? 'R' : 'L', label: a + ORD[order] + b, ionic: !!(METAL[a] !== METAL[b] && (METAL[a] || METAL[b])), pol: ea !== eb };
  }
  const tail = (b) => (b.dir === 'R' ? b.a : b.dir === 'L' ? b.b : null);      // δ+ 쪽 원소
  const head = (b) => (b.dir === 'R' ? b.b : b.dir === 'L' ? b.a : null);      // δ− 쪽 원소 (화살표 머리)
  const U = PHONE ? 50 : 56;                                                      // 화살표 길이: Δχ 1.0당 px

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'cloud', t: 0, fade: 0, gate: '',
    cl: { a: 21, b: 30, pos: 0.5, dA: new Spring(0, { stiffness: 220, damping: 14 }), dB: new Spring(0, { stiffness: 220, damping: 14 }), a_: 0 },
    ar: { part: 'cards', sel: 3, d10: 0, dir: 'N', done: {}, prog: {}, shake: {}, msg: '', tiles: [], odone: false, oMsg: '', oShake: -9 },
    sc: { items: [], sel: null, ion: 0, msg: '' },
    jd: { i: 0, done: [], msg: '', ok: false, shake: -9, adv: null, prog: 0 },
  };
  let game = null;
  const gameLevel = () => (game ? game.level : 0);
  const isFree = () => !!(game && game.free);

  /* =========================================================
     공통: 결합 그림 (두 원자 + 전자 구름 + δ + 쌍극자 화살표)
     o = { x, y, sep, r, A:{s,e}, B:{s,e}, order, pos, q, delta, arrow(0~1), U, ion(0~1), labels }
     ========================================================= */
  function drawBondModel(o) {
    const { x, y, sep, r } = o, ax = x - sep / 2, bx = x + sep / 2;
    const ion = o.ion || 0;
    const rA = r * (1 - 0.2 * ion), rB = r * (1 + 0.14 * ion);
    // 결합선
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(93,104,121,' + (0.75 * (1 - ion)) + ')';
    const n = o.order || 1;
    for (let i = 0; i < n; i++) { const oy = (i - (n - 1) / 2) * (r * 0.2 + 2); ctx.lineWidth = Math.max(2, r * 0.07); ctx.beginPath(); ctx.moveTo(ax, y + oy); ctx.lineTo(bx, y + oy); ctx.stroke(); }
    ctx.restore();
    // 원자
    const atom = (cx, rr, A) => { D.sphere(cx, y, rr, enColor(A.e), { shadow: true, outline: 'rgba(60,30,120,.45)', outlineWidth: Math.max(1.5, r * 0.04) }); };
    const sym = (cx, rr, A) => { T(cx, y + rr * 0.22, A.s, Math.round(rr * 0.62), darkText(A.e) ? INK : '#fff', 'center', 900, { stroke: darkText(A.e) ? 'rgba(255,255,255,.55)' : 'rgba(40,10,90,.55)', strokeWidth: 3.5 }); };
    atom(ax, rA, o.A); atom(bx, rB, o.B);
    // 전자 구름 (공유 전자쌍) → 이온 결합에서는 오른쪽 원자로 완전히 이동
    const pos = o.pos != null ? o.pos : 0.5;
    const eff = pos + (1 - pos) * ion;
    const cx = ax + (bx - ax) * eff;
    const n2 = (o.order || 1) * 2;
    if (ion < 0.98) {
      const rx = r * 0.9 * (1 - ion * 0.5), ry = r * 0.5 * (1 - ion * 0.4);
      const cg = ctx.createRadialGradient(cx, y, 2, cx, y, rx);
      cg.addColorStop(0, 'rgba(255,214,77,' + (0.85 * (1 - ion)) + ')'); cg.addColorStop(0.6, 'rgba(255,190,40,' + (0.4 * (1 - ion)) + ')'); cg.addColorStop(1, 'rgba(255,190,40,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < n2; i++) {
      const a = S.t * 3 + (i * TAU) / n2, wob = r * (0.3 - 0.12 * ion);
      D.sphere(cx + Math.cos(a) * wob, y + Math.sin(a * 1.2) * wob * 0.55 + (n2 > 2 ? (i % 2 ? 1 : -1) * r * 0.1 : 0), Math.max(3.2, r * 0.11), GOLD, { gloss: false, outline: 'rgba(120,70,0,.6)', outlineWidth: 1 });
    }
    sym(ax, rA, o.A); sym(bx, rB, o.B);
    // δ 부호 (또는 이온 전하)
    const q = o.q || 0;
    if (o.delta !== false) {
      const sa = o.dA != null ? o.dA : (q > 0.02 ? 1 : 0), sb = o.dB != null ? o.dB : (q > 0.02 ? 1 : 0);
      const lowIsA = o.A.e < o.B.e;
      const put = (cxx, plus, k) => {
        if (k < 0.03) return;
        const txt = ion > 0.5 ? (plus ? '+' : '−') : (plus ? 'δ⁺' : 'δ⁻');
        const sz = (ion > 0.5 ? 26 : 20 + 16 * q) * k * (PHONE ? 0.9 : 1);
        ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
        T(cxx, y - r - (o.dy != null ? o.dy : 12), txt, sz / FS, plus ? '#c0392b' : '#2457d6', 'center', 900, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
        ctx.restore();
      };
      put(ax, lowIsA, lowIsA ? sa : sb); put(bx, !lowIsA, lowIsA ? sb : sa);
      if (ion > 0.5) { /* 이온 라벨은 호출자가 이름과 함께 그려요 */ }
    }
    // 쌍극자 모멘트 화살표: + 가 δ+ 쪽 (꼬리), 머리가 δ− 쪽
    if (o.arrow > 0.01 && o.d10 > 0) {
      const dirR = o.B.e > o.A.e, len = (o.d10 / 10) * (o.U || U) * o.arrow, mid = x, ay = y - r - (o.ao != null ? o.ao : (PHONE ? 38 : 44));
      const x0 = dirR ? mid - (o.d10 / 10) * (o.U || U) / 2 : mid + (o.d10 / 10) * (o.U || U) / 2;
      const x1 = dirR ? x0 + len : x0 - len;
      D.arrow(x0, ay, x1, ay, { color: PUR, width: 5, head: Math.min(14, 6 + len * 0.18) });
      ctx.save(); ctx.strokeStyle = PUR; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 - 6, ay); ctx.lineTo(x0 + 6, ay); ctx.moveTo(x0, ay - 6); ctx.lineTo(x0, ay + 6); ctx.stroke(); ctx.restore();
    }
    return { ax, bx, cx };
  }
  const bgFill = () => { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); };

  /* =========================================================
     ① 전자 구름
     ========================================================= */
  const CLG = PHONE ? { x: 240, y: 214, sep: 270, r: 46 } : { x: 400, y: 232, sep: 420, r: 62 };
  const cd10 = () => Math.abs(S.cl.a - S.cl.b);
  function clStep(dt) {
    const c = S.cl, d = cd10(), q = qOf(d);
    c.pos = approach(c.pos, posOf(c.a, c.b), dt, 6);
    c.dA.target = d > 0 ? 1 : 0; c.dB.target = d > 0 ? 1 : 0;
    c.dA.update(dt); c.dB.update(dt);
    c.arr = approach(c.arr || 0, d > 0 && (gameLevel() >= 1 || isFree()) ? 1 : 0, dt, 5);
    c.q = approach(c.q || 0, q, dt, 6);
  }
  function clClass(d) {
    if (d === 0) return ['무극성 공유 결합', '두 원자의 전기 음성도가 같아 전자쌍이 가운데에 있고 부분 전하가 없어요.', GRN];
    if (d < 5) return ['극성이 약한 공유 결합', 'Δχ가 작아 전자쌍이 조금 치우쳐서 부분 전하(δ⁺, δ⁻)가 작게 생겨요.', '#8a5a00'];
    if (d < 20) return ['극성 공유 결합', 'Δχ가 클수록 전자쌍이 더 많이 치우치고 δ⁺, δ⁻가 커져요.', PURD];
    return ['극성이 매우 큰 결합', '전자쌍이 거의 한쪽에 가 있어요. 실제 물질에서는 금속 + 비금속이면 이온 결합이에요.', '#9b2c9b'];
  }
  function drawCloud() {
    bgFill();
    const c = S.cl, d = cd10(), q = c.q || 0, g = CLG;
    const A = { s: 'A', e: c.a }, B = { s: 'B', e: c.b };
    const r = drawBondModel({ x: g.x, y: g.y, sep: g.sep, r: g.r, A, B, order: 1, pos: c.pos, q, dA: c.dA.value, dB: c.dB.value, arrow: c.arr || 0, d10: d });
    // 전기 음성도 배지
    [[r.ax, c.a, '왼쪽 A'], [r.bx, c.b, '오른쪽 B']].forEach(([x, e, nm]) => {
      T(x, g.y + g.r + 26, nm + ' 원자', 14, MUTED, 'center', 800);
      D.roundRect(x - 58, g.y + g.r + 36, 116, 32, 10); ctx.fillStyle = '#4c1d95'; ctx.fill();
      T(x, g.y + g.r + 58, 'χ = ' + f1(e), 15, '#fff', 'center', 900);
    });
    // 부분 전하 안내
    if (d > 0) {
      const lowA = c.a < c.b;
      T(lowA ? r.ax : r.bx, g.y + g.r + 94, '전자가 적게 와요 → δ⁺', 12.5, '#c0392b', 'center', 800);
      T(lowA ? r.bx : r.ax, g.y + g.r + 94, '전자가 많이 와요 → δ⁻', 12.5, '#2457d6', 'center', 800);
    }
    // 결과 패널
    const cls = clClass(d), py = PHONE ? g.y + g.r + 112 : g.y + g.r + 112, ph = PHONE ? 184 : 136;
    panel(PHONE ? 16 : 40, py, VW - (PHONE ? 32 : 80), ph, 14, '#fff', '#e3dcf5');
    const px = PHONE ? 30 : 60;
    T(px, py + 28, 'Δχ = |χ(B) − χ(A)| = |' + f1(c.b) + ' − ' + f1(c.a) + '| = ' + f1(d), PHONE ? 16 : 19, PURD, 'left', 900);
    D.label(px + 4, py + 58, cls[0], { size: fs(15), bg: cls[2], align: 'left' });
    textBlock(px, py + 88, VW - (PHONE ? 60 : 120), cls[1], 14, INK, 20, 700);
    if (c.arr > 0.05 && d > 0) textBlock(px, py + (PHONE ? 148 : 120), VW - (PHONE ? 60 : 120), '위의 화살표(+→)가 결합의 쌍극자 모멘트예요. δ⁺ 쪽에서 δ⁻ 쪽으로 향해요.', 12.5, '#5b21b6', 18, 800);
  }

  /* =========================================================
     ② Δχ와 화살표
     ========================================================= */
  const CARDS = [bond('H', 'H'), bond('H', 'I'), bond('H', 'Br'), bond('H', 'Cl'), bond('N', 'H'), bond('O', 'H'), bond('H', 'F'), bond('C', 'H')];
  const HX = ['HF', 'HCl', 'HBr', 'HI'];
  const cardIdx = (a, b) => CARDS.findIndex((c) => c.a === a && c.b === b);
  const HXI = [cardIdx('H', 'F'), cardIdx('H', 'Cl'), cardIdx('H', 'Br'), cardIdx('H', 'I')];
  const CG = PHONE
    ? { cols: 2, cw: 216, ch: 100, gx: 10, gy: 8, x0: 19, y0: 46 }
    : { cols: 4, cw: 176, ch: 140, gx: 14, gy: 12, x0: 27, y0: 44 };
  const cardRect = (i) => ({ x: CG.x0 + (i % CG.cols) * (CG.cw + CG.gx), y: CG.y0 + Math.floor(i / CG.cols) * (CG.ch + CG.gy), w: CG.cw, h: CG.ch });
  const AIN = PHONE ? { x: 16, y: CG.y0 + 4 * (CG.ch + CG.gy) + 2, w: VW - 32, h: 150 } : { x: 24, y: CG.y0 + 2 * (CG.ch + CG.gy) + 4, w: VW - 48, h: 170 };
  const selCard = () => CARDS[S.ar.sel];
  function selectCard(i) { if (S.ar.part !== 'cards') return; S.ar.sel = i; S.ar.d10 = 0; S.ar.dir = 'N'; S.ar.msg = ''; S.ar.msgBad = false; Sound.tick(); updateUI(); }
  function drawArrowNow() {
    const b = selCard(), A = S.ar;
    if (A.done[b.id]) { A.msg = '이미 그린 결합이에요. 다른 결합도 해 봐요.'; A.msgBad = false; updateUI(); return; }
    if (A.d10 !== b.d10) { A.msg = 'Δχ를 다시 계산해 봐요. Δχ = 큰 값 − 작은 값 = ' + f1(Math.max(b.ea, b.eb)) + ' − ' + f1(Math.min(b.ea, b.eb)); A.shake[b.id] = S.t; A.msgBad = true; Sound.fail(); updateUI(); return; }
    if (A.dir !== b.dir) { A.msg = b.dir === 'N' ? '두 원자가 같아 전자쌍이 치우치지 않아요. 화살표는 없어요.' : '화살표의 머리는 전자쌍이 치우친 쪽(δ⁻, 전기 음성도가 큰 원자)을 향해요.'; A.shake[b.id] = S.t; A.msgBad = true; Sound.fail(); updateUI(); return; }
    A.msgBad = false; A.done[b.id] = true; A.prog[b.id] = 0; Sound.success();
    tween(A.prog, { [b.id]: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'outBack' });
    A.msg = b.d10 === 0 ? '무극성 결합이라 화살표가 없어요.' : '화살표를 그렸어요! 길이는 Δχ(' + f1(b.d10) + ')에 비례해요.';
    const r = cardRect(A.sel);
    fx.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 14, colors: ['#ffd34d', '#8b5cf6', '#14a058', '#ffffff'], speed: 150, size: 3.2, gravity: 100 });
    updateUI();
  }
  function drawCardsScene() {
    bgFill();
    CARDS.forEach((b, i) => {
      const r = cardRect(i), cur = i === S.ar.sel, done = S.ar.done[b.id];
      const sh = S.ar.shake[b.id] != null && S.t - S.ar.shake[b.id] < 0.4 ? Math.sin((S.t - S.ar.shake[b.id]) * 50) * 4 : 0;
      ctx.save(); ctx.translate(sh, 0);
      panel(r.x, r.y, r.w, r.h, 14, done ? '#f3effd' : '#fff', cur ? '#8b5cf6' : done ? '#c9bfe8' : '#e3dcf5');
      if (cur) { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.stroke(); }
      T(r.x + 12, r.y + 22, b.label, 16, INK, 'left', 900);
      T(r.x + r.w - 12, r.y + 22, done ? 'Δχ = ' + f1(b.d10) : 'Δχ = ?', 14, done ? PURD : '#a2abb9', 'right', 900);
      const pos = done ? posOf(b.ea, b.eb) : 0.5;
      const sep = r.w - 64, rr = PHONE ? 17 : 20, cy = r.y + r.h * (PHONE ? 0.6 : 0.64);
      drawBondModel({ x: r.x + r.w / 2, y: cy, sep, r: rr, A: { s: b.a, e: b.ea }, B: { s: b.b, e: b.eb }, order: 1, pos, q: done ? qOf(b.d10) : 0, delta: done, dA: done ? 1 : 0, dB: done ? 1 : 0, arrow: done ? (S.ar.prog[b.id] != null ? S.ar.prog[b.id] : 1) : 0, d10: b.d10, U, ao: 30, dy: 8 });
      T(r.x + 32, cy + rr + 17, 'χ ' + f1(b.ea), 12.5, MUTED, 'center', 800); T(r.x + r.w - 32, cy + rr + 17, 'χ ' + f1(b.eb), 12.5, MUTED, 'center', 800);
      ctx.restore();
    });
    // 설명 패널
    const p = AIN, b = selCard();
    panel(p.x, p.y, p.w, p.h, 14, '#fff', '#e3dcf5');
    T(p.x + 14, p.y + 26, '➕ ' + b.label + ' 결합 (' + NAME[b.a] + ' – ' + NAME[b.b] + ')', 15.5, PURD, 'left', 900);
    const done = S.ar.done[b.id];
    T(p.x + 14, p.y + 54, 'Δχ = |' + f1(b.ea) + ' − ' + f1(b.eb) + '| = ' + (done ? f1(b.d10) : '?'), 16, INK, 'left', 900);
    if (S.ar.msg) textBlock(p.x + 14, p.y + 82, p.w - 28, S.ar.msg, 13.5, S.ar.msgBad ? BAD : GRN, 19, 800);
    else textBlock(p.x + 14, p.y + 82, p.w - 28, '결합 카드를 눌러 고른 뒤 Δχ를 계산하고 화살표의 방향을 정해 그려요. 화살표의 꼬리(+)는 δ⁺ 쪽, 머리는 δ⁻ 쪽이에요.', 13.5, MUTED, 19, 700);
    if (!PHONE) T(p.x + 14, p.y + p.h - 14, '화살표 길이 = Δχ에 비례 (Δχ 1.0 = ' + U + ' px) · 쌍극자 모멘트는 정성적으로(상대 크기만) 나타내요', 12.5, '#8a95a8', 'left', 700);
    else textBlock(p.x + 14, p.y + p.h - 26, p.w - 28, '화살표 길이 = Δχ에 비례 (상대 크기만 나타내요)', 12.5, '#8a95a8', 16, 700);
  }

  // 화살표 길이 순서 놓기 (H–X 4가지)
  const TL = PHONE ? { w: 104, h: 112, sg: 8, sx: 20, sy: 66, tx: 20, ty: 214 } : { w: 150, h: 120, sg: 22, sx: 61, sy: 70, tx: 61, ty: 232 };
  const tSlot = (i) => ({ x: TL.sx + i * (TL.w + TL.sg), y: TL.sy });
  const tTray = (i) => ({ x: TL.tx + i * (TL.w + TL.sg), y: TL.ty });
  const tileU = (TL.w - 34) / 1.9;
  const oAns = HXI.map((i) => CARDS[i]).sort((p, q) => p.d10 - q.d10).map((b) => b.id);
  function buildTiles() {
    const order = [HXI[1], HXI[0], HXI[3], HXI[2]];     // HCl, HF, HI, HBr 순으로 섞어 놓아요
    S.ar.tiles = order.map((ci, i) => { const p = tTray(i); return { ci, id: CARDS[ci].id, x: p.x, y: p.y, slot: null, drag: false, lift: 0, home: i }; });
    S.ar.odone = false; S.ar.oMsg = '';
  }
  const tTarget = (t) => (t.slot != null ? tSlot(t.slot) : tTray(t.home));
  function tileAt(p) { const ts = S.ar.tiles; for (let i = ts.length - 1; i >= 0; i--) { const t = ts[i]; if (p.x >= t.x && p.x <= t.x + TL.w && p.y >= t.y && p.y <= t.y + TL.h) return t; } return null; }
  function tSlotAt(p) { for (let i = 0; i < 4; i++) { const s = tSlot(i); if (p.x >= s.x - 8 && p.x <= s.x + TL.w + 8 && p.y >= s.y - 8 && p.y <= s.y + TL.h + 8) return i; } return -1; }
  function tPlace(t, slot) {
    if (slot < 0) { t.slot = null; Sound.tick(); return; }
    const occ = S.ar.tiles.find((o) => o !== t && o.slot === slot); if (occ) occ.slot = t.slot;
    t.slot = slot; Sound.tick(); tCheck();
  }
  function tCheck() {
    const ts = S.ar.tiles; if (ts.some((t) => t.slot == null)) { S.ar.oMsg = ''; return; }
    const seq = []; ts.forEach((t) => { seq[t.slot] = t.id; });
    if (seq.every((s, i) => s === oAns[i])) {
      if (!S.ar.odone) { S.ar.odone = true; S.ar.oMsg = '정답! 화살표가 길수록 Δχ가 크고 극성이 커요: HI < HBr < HCl < HF'; Sound.success(); fx.burst(VW / 2, TL.sy + 50, { count: 22, colors: ['#ffd34d', '#8b5cf6', '#14a058', '#ffffff'], speed: 190, size: 3.8, gravity: 120 }); }
    } else { S.ar.oMsg = '순서가 달라요. 화살표의 길이를 비교해 짧은 것부터 놓아요.'; S.ar.oShake = S.t; Sound.fail(); }
    updateUI();
  }
  function drawTile(t) {
    const b = CARDS[t.ci], w = TL.w, h = TL.h;
    const sh = S.t - S.ar.oShake < 0.4 && t.slot != null ? Math.sin((S.t - S.ar.oShake) * 50) * 4 : 0;
    ctx.save(); const sc = 1 + 0.07 * t.lift; ctx.translate(t.x + w / 2 + sh, t.y + h / 2); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(40,20,90,' + (0.2 + 0.18 * t.lift) + ')'; ctx.shadowBlur = 8 + 12 * t.lift; ctx.shadowOffsetY = 3 + 6 * t.lift;
    D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = t.slot != null ? '#8b5cf6' : '#cdbdf5'; ctx.lineWidth = 2.5; ctx.stroke();
    T(0, -h / 2 + 22, b.label, 15, INK, 'center', 900);
    drawBondModel({ x: 0, y: 14, sep: w - 34, r: PHONE ? 13 : 16, A: { s: b.a, e: b.ea }, B: { s: b.b, e: b.eb }, order: 1, pos: posOf(b.ea, b.eb), q: qOf(b.d10), arrow: 1, d10: b.d10, U: tileU, delta: false });
    if (S.ar.odone) T(0, h / 2 - 12, 'Δχ ' + f1(b.d10), 13, PURD, 'center', 900);
    ctx.restore();
  }
  function drawOrderScene() {
    bgFill();
    T(VW / 2, 30, '화살표(쌍극자 모멘트)가 짧은 것 → 긴 것', 15, PURD, 'center', 900);
    D.arrow(TL.sx, TL.sy - 12, TL.sx + 4 * (TL.w + TL.sg) - TL.sg, TL.sy - 12, { color: '#cdbdf5', width: 4, head: 12 });
    T(TL.sx + 2, TL.sy - 20, '짧음', 12.5, MUTED, 'left', 800); T(TL.sx + 4 * (TL.w + TL.sg) - TL.sg, TL.sy - 20, '긺', 12.5, MUTED, 'right', 800);
    for (let i = 0; i < 4; i++) {
      const s = tSlot(i);
      D.roundRect(s.x, s.y, TL.w, TL.h, 14); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#b4a3e8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      T(s.x + TL.w / 2, s.y + TL.h / 2 + 8, String(i + 1), 28, 'rgba(124,58,237,.22)', 'center', 900);
    }
    T(TL.tx, TL.ty - 10, '카드를 끌어 놓거나 눌러서 놓아요', 12.5, MUTED, 'left', 700);
    S.ar.tiles.filter((t) => !t.drag).forEach(drawTile); S.ar.tiles.filter((t) => t.drag).forEach(drawTile);
    if (S.ar.oMsg) {
      const ok = S.ar.odone, yy = TL.ty + TL.h + 14;
      panel(PHONE ? 16 : 90, yy, VW - (PHONE ? 32 : 180), PHONE ? 54 : 46, 12, ok ? '#e6f7ee' : '#fdecea', ok ? '#9bdcb8' : '#f0b7b1');
      textBlock(VW / 2, yy + (PHONE ? 22 : 28), VW - (PHONE ? 52 : 212), S.ar.oMsg, 13, INK, 17, 800, 'center');
    }
  }
  function oStep(dt) {
    S.ar.tiles.forEach((t) => { t.lift = approach(t.lift, t.drag ? 1 : 0, dt, 14); if (!t.drag) { const g = tTarget(t); t.x = approach(t.x, g.x, dt, 12); t.y = approach(t.y, g.y, dt, 12); } });
  }

  /* =========================================================
     ③ 결합 연속체
     ========================================================= */
  const SCB = [bond('Cl', 'Cl'), bond('C', 'H'), bond('O', 'H'), bond('H', 'F'), bond('Na', 'Cl'), bond('K', 'F')];
  const AX = PHONE ? { x0: 40, x1: 440, y: 232, h: 18 } : { x0: 66, x1: 734, y: 250, h: 20 };
  const axX = (v) => AX.x0 + (v / 3.2) * (AX.x1 - AX.x0);
  const axV = (x) => clamp(Math.round(((x - AX.x0) / (AX.x1 - AX.x0)) * 3.2 * 10) / 10, 0, 3.2);
  const SCW = PHONE ? 86 : 100, SCH = PHONE ? 46 : 50;
  const LANES = PHONE ? [56, 108, 160] : [52, 112, 172];
  const trayCard = (i) => PHONE ? { x: 20 + (i % 3) * (SCW + 12), y: 530 + Math.floor(i / 3) * (SCH + 12) } : { x: 428 + (i % 3) * (SCW + 12), y: 392 + Math.floor(i / 3) * (SCH + 12) };
  function buildScale() {
    const order = [4, 2, 5, 0, 3, 1];
    S.sc.items = order.map((bi, i) => { const p = trayCard(i); return { bi, b: SCB[bi], x: p.x, y: p.y, val: null, drag: false, lift: 0, tray: i, bad: false, ok: false }; });
    S.sc.sel = null; S.sc.ion = 0;
  }
  const scTarget = (it) => (it.val == null ? trayCard(it.tray) : { x: axX(it.val) - SCW / 2, y: LANES[it.bi % 3] });
  function scAt(p) { const a = S.sc.items; for (let i = a.length - 1; i >= 0; i--) { const t = a[i]; if (p.x >= t.x && p.x <= t.x + SCW && p.y >= t.y && p.y <= t.y + SCH) return t; } return null; }
  function scStep(dt) {
    S.sc.items.forEach((t) => { t.lift = approach(t.lift, t.drag ? 1 : 0, dt, 14); if (!t.drag) { const g = scTarget(t); t.x = approach(t.x, g.x, dt, 12); t.y = approach(t.y, g.y, dt, 12); } });
    const sel = S.sc.sel != null ? SCB[S.sc.sel] : null;
    S.sc.ion = approach(S.sc.ion, sel && sel.ionic ? 1 : 0, dt, 3);
  }
  const scalePlaced = () => S.sc.items.filter((t) => t.val != null).length;
  function scaleCheck() {
    const miss = S.sc.items.filter((t) => t.val == null).length;
    if (miss) return '아직 눈금에 놓지 않은 카드가 ' + miss + '개 있어요.';
    let bad = 0;
    S.sc.items.forEach((t) => { const ok = Math.abs(Math.round(t.val * 10) - t.b.d10) <= 1; if (!ok) bad++; if (!ok && !t.bad) t.badAt = S.t; t.bad = !ok; t.ok = ok; });
    return bad ? '빨간 테두리 카드의 Δχ를 다시 계산해 보세요. (큰 값 − 작은 값)' : true;
  }
  function drawScale() {
    bgFill();
    T(VW / 2, 28, '결합 카드의 Δχ를 계산해 눈금 위에 놓아요', 15, PURD, 'center', 900);
    // 눈금 막대 (무극성 → 이온 결합 쪽으로 연속)
    const g = ctx.createLinearGradient(AX.x0, 0, AX.x1, 0); g.addColorStop(0, '#2fb59a'); g.addColorStop(0.35, '#e6c34a'); g.addColorStop(0.7, '#c9669b'); g.addColorStop(1, '#6d28d9');
    D.shadow(() => { D.roundRect(AX.x0 - 6, AX.y, AX.x1 - AX.x0 + 12, AX.h, 10); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
    for (let v = 0; v <= 32; v += 4) {
      const x = axX(v / 10), big = v % 8 === 0;
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = big ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(x, AX.y + AX.h); ctx.lineTo(x, AX.y + AX.h + (big ? 10 : 6)); ctx.stroke();
      T(x, AX.y + AX.h + 26, (v / 10).toFixed(1), 12.5, MUTED, 'center', 700);
    }
    T(AX.x1, AX.y + AX.h + 46, 'Δχ (전기 음성도 차)', 13, MUTED, 'right', 800);
    const lb = AX.y + AX.h + (PHONE ? 66 : 66);
    T(AX.x0, lb, PHONE ? '← 무극성 공유' : '← 무극성 공유 결합', 12.5, '#0f766e', 'left', 800); T(AX.x1, lb, PHONE ? '이온 결합 →' : '이온 결합 (금속 + 비금속) →', 12.5, '#6d28d9', 'right', 800);
    T((AX.x0 + AX.x1) / 2, lb, '극성 공유 결합', 12.5, '#a23c78', 'center', 800);
    // 놓인 카드의 줄기
    S.sc.items.forEach((t) => { if (t.val != null) { ctx.strokeStyle = 'rgba(93,104,121,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(axX(t.val), t.y + SCH); ctx.lineTo(axX(t.val), AX.y); ctx.stroke(); ctx.setLineDash([]); } });
    // 트레이
    const trY = PHONE ? 498 : 366;
    if (!PHONE) { panel(416, 360, 362, 190, 14, 'rgba(255,255,255,.6)', '#e3dcf5'); T(432, 384, '🧰 눈금에 놓을 카드', 13.5, PURD, 'left', 900); }
    else { T(20, trY + 6, '🧰 눈금에 놓을 카드 (끌어서 눈금 위로)', 13.5, PURD, 'left', 900); }
    const drawIt = (t) => {
      const b = t.b, sc = 1 + 0.08 * t.lift;
      const flash = t.bad && S.t - (t.badAt || 0) < 0.4 ? Math.sin((S.t - t.badAt) * 50) * 3 : 0;
      ctx.save(); ctx.translate(t.x + SCW / 2 + flash, t.y + SCH / 2); ctx.scale(sc, sc);
      ctx.shadowColor = 'rgba(40,20,90,' + (0.2 + 0.18 * t.lift) + ')'; ctx.shadowBlur = 7 + 10 * t.lift; ctx.shadowOffsetY = 3 + 5 * t.lift;
      D.roundRect(-SCW / 2, -SCH / 2, SCW, SCH, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = t.bad ? BAD : t.ok ? GOOD : t.val != null ? '#8b5cf6' : '#cdbdf5'; ctx.lineWidth = t.bad || t.ok ? 3 : 2.2; ctx.stroke();
      T(0, -4, b.label, 15, b.ionic ? '#6d28d9' : '#0f766e', 'center', 900);
      T(0, 15, b.a + ' ' + f1(b.ea) + ' · ' + b.b + ' ' + f1(b.eb), 11.5, MUTED, 'center', 800);
      if (t.val != null) { D.label(0, SCH / 2 + 3, 'Δχ ' + (t.val).toFixed(1), { size: fs(11.5), bg: PURD }); }
      ctx.restore();
    };
    S.sc.items.filter((t) => !t.drag).forEach(drawIt); S.sc.items.filter((t) => t.drag).forEach(drawIt);
    // 입자 모형 미리보기
    const pv = PHONE ? { x: 16, y: 330, w: VW - 32, h: 160 } : { x: 24, y: 360, w: 380, h: 190 };
    panel(pv.x, pv.y, pv.w, pv.h, 14, '#fff', '#e3dcf5');
    const sel = S.sc.sel != null ? SCB[S.sc.sel] : null;
    if (!sel) { T(pv.x + pv.w / 2, pv.y + pv.h / 2, '카드를 누르거나 끌면 입자 모형이 나와요', 14, '#a2abb9', 'center', 800); return; }
    const ion = S.sc.ion;
    T(pv.x + 14, pv.y + 24, '🔬 ' + sel.label + ' 입자 모형', 14, PURD, 'left', 900);
    drawBondModel({ x: pv.x + pv.w / 2, y: pv.y + (PHONE ? 76 : 86), sep: PHONE ? 150 : 170, r: PHONE ? 24 : 28, A: { s: sel.a, e: sel.ea }, B: { s: sel.b, e: sel.eb }, order: 1, pos: posOf(sel.ea, sel.eb), q: qOf(sel.d10), ion, arrow: 1 - ion, d10: sel.d10, U: PHONE ? 40 : 46, delta: sel.pol, ao: 24, dy: 8 });
    if (ion > 0.5) { const x0 = pv.x + pv.w / 2 - (PHONE ? 75 : 85), x1 = pv.x + pv.w / 2 + (PHONE ? 75 : 85); T(x0, pv.y + (PHONE ? 116 : 130), sel.a + '⁺', 14, '#c0392b', 'center', 900); T(x1, pv.y + (PHONE ? 116 : 130), sel.b + '⁻', 14, '#2457d6', 'center', 900); }
    const txt = sel.ionic ? '금속 + 비금속: 전자가 거의 완전히 이동해 ' + sel.a + '⁺, ' + sel.b + '⁻ 이온이 돼요 → 이온 결합 (극성의 끝)' : sel.pol ? '비금속끼리: 전자쌍을 공유하지만 ' + head(sel) + ' 쪽으로 치우쳐요 → 극성 공유 결합 (Δχ ' + f1(sel.d10) + ')' : '같은 원자끼리: 전자쌍이 가운데 → 무극성 공유 결합';
    textBlock(pv.x + 14, pv.y + pv.h - (PHONE ? 26 : 34), pv.w - 28, txt, 12.5, INK, 17, 800);
  }

  /* =========================================================
     ④ 결합 판단
     ========================================================= */
  const cmpItem = (qa, qb, why) => ({ k: 'cmp', qa, qb, ans: qa.d10 > qb.d10 ? 'a' : 'b', why });
  const JD = [
    cmpItem(bond('O', 'H'), bond('N', 'H'), 'Δχ가 O–H 1.4 > N–H 0.9 이라 O–H가 더 극성이에요.'),
    cmpItem(bond('C', 'Cl'), bond('C', 'H'), 'Δχ가 C–Cl 0.5 > C–H 0.4 이라 C–Cl이 더 극성이에요.'),
    cmpItem(bond('C', 'O'), bond('C', 'N'), 'Δχ가 C–O 1.0 > C–N 0.5 이라 C–O가 더 극성이에요.'),
    { k: 'dir', b: bond('C', 'O') }, { k: 'dir', b: bond('N', 'H') },
    { k: 'cls', b: bond('N', 'N', 3) }, { k: 'cls', b: bond('O', 'O', 2) }, { k: 'cls', b: bond('H', 'Cl') }, { k: 'cls', b: bond('C', 'O', 2) },
  ];
  JD.forEach((q) => { if (q.k === 'dir') q.ans = q.b.dir; if (q.k === 'cls') q.ans = q.b.pol ? 'polar' : 'non'; });
  const SETS = [['A', '극성 비교', 0, 3], ['B', '화살표 방향', 3, 5], ['C', '극성 · 무극성 분류', 5, 9]];
  const jdCount = (s) => { let n = 0; for (let i = s[2]; i < s[3]; i++) if (S.jd.done[i]) n++; return n; };
  const jdAll = () => JD.every((q, i) => S.jd.done[i]);
  const JG = PHONE ? { x: 16, y: 40, w: VW - 32, h: 400 } : { x: 40, y: 40, w: VW - 80, h: 380 };
  function jdLabels(q) {
    if (q.k === 'cmp') return [q.qa.label, q.qb.label];
    if (q.k === 'dir') return ['← ' + q.b.a + ' 쪽', q.b.b + ' 쪽 →'];
    return ['극성 공유 결합', '무극성 공유 결합'];
  }
  const jdKeys = (q) => (q.k === 'cmp' ? ['a', 'b'] : q.k === 'dir' ? ['L', 'R'] : ['polar', 'non']);
  const jdTitle = (q) => (q.k === 'cmp' ? '두 결합 중 더 극성인 것은?' : q.k === 'dir' ? '이 결합의 쌍극자 모멘트 화살표는 어느 쪽을 향할까요?' : '이 결합은 극성일까요, 무극성일까요?');
  function jdAnswer(k) {
    const J = S.jd, q = JD[J.i];
    if (J.done[J.i] || J.adv != null) return;
    if (k === q.ans) {
      J.done[J.i] = true; J.ok = true; Sound.success(); J.prog = 0;
      tween(J, { prog: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'outBack' });
      J.msg = q.k === 'cmp' ? '정답! ' + q.why : q.k === 'dir' ? '정답! 화살표는 전기 음성도가 큰 ' + head(q.b) + ' 쪽(δ⁻)을 향해요.' : q.b.pol ? '정답! 서로 다른 원자라 Δχ = ' + f1(q.b.d10) + '. 극성 결합이에요.' : '정답! 같은 원자끼리라 Δχ = 0. 무극성 결합이에요.';
      fx.burst(VW / 2, 120, { count: 16, colors: ['#ffd34d', '#8b5cf6', '#14a058', '#ffffff'], speed: 170, size: 3.4, gravity: 120 });
      J.adv = S.t + 2.6;
    } else {
      J.ok = false; J.shake = S.t; Sound.fail();
      J.msg = q.k === 'cmp' ? '아니에요. 각 결합의 Δχ(큰 값 − 작은 값)를 계산해 비교해 봐요.' : q.k === 'dir' ? '화살표는 δ⁺에서 δ⁻로, 즉 전기 음성도가 큰 원자 쪽을 향해요.' : '두 원자의 전기 음성도가 같은지 다른지 살펴봐요. (같은 원소끼리면 다중 결합이어도 같아요)';
    }
    updateUI();
  }
  function jdStep() {
    const J = S.jd;
    if (J.adv != null && S.t >= J.adv) { J.adv = null; if (J.i < JD.length - 1) { J.i++; J.msg = ''; J.ok = false; J.prog = 0; updateUI(); } else { J.msg = '모든 문제를 풀었어요! 🎉'; } }
  }
  function bondCard(x, y, w, h, b, o) {
    o = o || {};
    panel(x, y, w, h, 14, o.win ? '#e6f7ee' : '#fff', o.win ? '#9bdcb8' : '#e3dcf5');
    T(x + w / 2, y + 26, b.label, 18, INK, 'center', 900);
    const showD = o.reveal;
    drawBondModel({ x: x + w / 2, y: y + h * 0.66, sep: Math.min(w - 90, PHONE ? 130 : 170), r: PHONE ? 20 : 25, A: { s: b.a, e: b.ea }, B: { s: b.b, e: b.eb }, order: b.order, pos: showD ? posOf(b.ea, b.eb) : 0.5, q: showD ? qOf(b.d10) : 0, delta: showD, dA: showD ? 1 : 0, dB: showD ? 1 : 0, arrow: showD ? (o.prog != null ? o.prog : 1) : 0, d10: b.d10, U: PHONE ? 38 : 56, ao: 30, dy: 8 });
    const sx = Math.min(w - 90, PHONE ? 130 : 170) / 2;
    T(x + w / 2 - sx, y + h - 14, b.a + ' ' + f1(b.ea), 12.5, MUTED, 'center', 800); T(x + w / 2 + sx, y + h - 14, b.b + ' ' + f1(b.eb), 12.5, MUTED, 'center', 800);
    if (showD) T(x + w / 2, y + h + 17, 'Δχ = ' + f1(b.d10), 14, o.win ? GRN : PURD, 'center', 900);
  }
  function drawJudge() {
    bgFill();
    const J = S.jd, q = JD[J.i], done = J.done[J.i], p = JG;
    // 진행 칩
    const sw = (VW - (PHONE ? 32 : 80) - 16) / 3;
    SETS.forEach((s, i) => {
      const x = (PHONE ? 16 : 40) + i * (sw + 8), cur = J.i >= s[2] && J.i < s[3], n = jdCount(s), tot = s[3] - s[2];
      D.roundRect(x, 8, sw, 28, 14); ctx.fillStyle = n === tot ? '#e6f7ee' : cur ? '#f3effd' : '#fff'; ctx.fill(); ctx.strokeStyle = n === tot ? '#9bdcb8' : cur ? '#8b5cf6' : '#e3dcf5'; ctx.lineWidth = 2; ctx.stroke();
      T(x + sw / 2, 27, (PHONE ? '' : (i + 1) + '. ') + s[1] + ' ' + n + '/' + tot, PHONE ? 11.5 : 12.5, n === tot ? GRN : cur ? PURD : MUTED, 'center', 800);
    });
    T(VW / 2, p.y + 36, '문제 ' + (J.i + 1) + ' / ' + JD.length + ' · ' + jdTitle(q), PHONE ? 13.5 : 16, PURD, 'center', 900);
    const sh = S.t - J.shake < 0.4 && !J.ok ? Math.sin((S.t - J.shake) * 50) * 4 : 0;
    ctx.save(); ctx.translate(sh, 0);
    if (q.k === 'cmp') {
      const cw = PHONE ? 210 : 300, ch = PHONE ? 150 : 170, gx = 20;
      const win = (side) => done && q.ans === side;
      const bx0 = VW / 2 - cw - gx / 2, bx1 = VW / 2 + gx / 2, by = p.y + 66;
      bondCard(bx0, by, cw, ch, q.qa, { reveal: done, win: win('a'), prog: J.prog });
      bondCard(bx1, by, cw, ch, q.qb, { reveal: done, win: win('b'), prog: J.prog });
      T(VW / 2, by + ch / 2, 'VS', 18, PUR, 'center', 900);
    } else {
      const cw = PHONE ? 300 : 420, ch = PHONE ? 176 : 214, bx0 = VW / 2 - cw / 2, by = p.y + 66;
      const b = q.b;
      panel(bx0, by, cw, ch, 14, done ? '#f3effd' : '#fff', '#e3dcf5');
      T(bx0 + cw / 2, by + 28, b.label + (q.k === 'cls' ? '  (' + (b.order === 3 ? '삼중' : b.order === 2 ? '이중' : '단일') + ' 결합)' : ''), 18, INK, 'center', 900);
      const sep = PHONE ? 150 : 210, r = PHONE ? 30 : 38, cy = by + ch * 0.68;
      drawBondModel({ x: bx0 + cw / 2, y: cy, sep, r, A: { s: b.a, e: b.ea }, B: { s: b.b, e: b.eb }, order: b.order, pos: done ? posOf(b.ea, b.eb) : 0.5, q: done ? qOf(b.d10) : 0, delta: done, dA: done ? 1 : 0, dB: done ? 1 : 0, arrow: done ? J.prog : 0, d10: b.d10, U: PHONE ? 60 : 84, ao: PHONE ? 30 : 36, dy: 10 });
      T(bx0 + cw / 2 - sep / 2, cy + r + 20, b.a + ' χ ' + f1(b.ea), 13, MUTED, 'center', 800); T(bx0 + cw / 2 + sep / 2, cy + r + 20, b.b + ' χ ' + f1(b.eb), 13, MUTED, 'center', 800);
      if (done) T(bx0 + cw / 2, by + ch + 20, 'Δχ = ' + f1(b.d10) + (b.pol ? ' → 극성 결합' : ' → 무극성 결합'), 14.5, GRN, 'center', 900);
    }
    ctx.restore();
    if (J.msg) {
      const yy = p.y + 66 + (q.k === 'cmp' ? (PHONE ? 150 : 170) : (PHONE ? 176 : 214)) + 40, ok = J.ok || J.msg.indexOf('정답') === 0 || J.msg.indexOf('모든') === 0;
      panel(PHONE ? 16 : 70, yy, VW - (PHONE ? 32 : 140), PHONE ? 66 : 56, 12, ok ? '#e6f7ee' : '#fdecea', ok ? '#9bdcb8' : '#f0b7b1');
      textBlock(VW / 2, yy + (PHONE ? 24 : 24), VW - (PHONE ? 52 : 172), J.msg, 13.5, INK, 19, 800, 'center');
    }
  }

  /* ---------- 장면 · UI ---------- */
  const SCENE_LABEL = { cloud: '☁️ 공유 전자쌍 구름', arrows: '➕ Δχ와 쌍극자 모멘트 화살표', scale: '📏 결합의 연속체', judge: '🧐 결합 판단' };
  function setScene(sc) {
    if (S.scene !== sc) { S.fade = 1; fx.clear(); hintOff(); }
    S.scene = sc; $('#tbLabel').textContent = SCENE_LABEL[sc]; updateUI();
  }
  const setHidden = (id, hide) => { const e = $(id); if (e) e.hidden = !!hide; };
  function updateUI() {
    const sc = S.scene, part = S.ar.part;
    setHidden('#cs-cloud', sc !== 'cloud');
    setHidden('#cs-arrow', !(sc === 'arrows' && part === 'cards'));
    setHidden('#cs-ord', !(sc === 'arrows' && part === 'order'));
    setHidden('#cs-scale', sc !== 'scale');
    setHidden('#cs-judge', sc !== 'judge');
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    // 슬라이더
    const sA = $('#sA'), sB = $('#sB');
    if (+sA.value !== S.cl.a) sA.value = S.cl.a; if (+sB.value !== S.cl.b) sB.value = S.cl.b;
    sA.style.setProperty('--pct', ((S.cl.a - 8) / 32 * 100) + '%'); sB.style.setProperty('--pct', ((S.cl.b - 8) / 32 * 100) + '%');
    $('#oA').textContent = f1(S.cl.a); $('#oB').textContent = f1(S.cl.b);
    $('#aMinus').disabled = S.cl.a <= 8; $('#aPlus').disabled = S.cl.a >= 40; $('#bMinus').disabled = S.cl.b <= 8; $('#bPlus').disabled = S.cl.b >= 40;
    // Δχ와 화살표
    const b = selCard(), A = S.ar;
    $('#arrHead').textContent = '➕ ' + b.label + ' 결합의 Δχ = |' + f1(b.ea) + ' − ' + f1(b.eb) + '|';
    $('#dNum').textContent = 'Δχ = ' + f1(A.d10);
    $('#dMinus').disabled = A.d10 <= 0; $('#dPlus').disabled = A.d10 >= 35;
    const segs = $$('#dirSeg button'); segs[0].textContent = '← ' + b.a + ' 쪽'; segs[1].textContent = '화살표 없음'; segs[2].textContent = b.b + ' 쪽 →';
    segs.forEach((s) => s.classList.toggle('on', s.dataset.v === A.dir));
    $('#drawArrowBtn').disabled = !!A.done[b.id];
    $('#drawArrowBtn').textContent = A.done[b.id] ? '✅ 그렸어요' : '✔ 화살표 그리기';
    // 판단
    const q = JD[S.jd.i], labs = jdLabels(q), keys = jdKeys(q), jb = $('#jdBtns');
    if (jb.children.length !== 2) { jb.innerHTML = ''; for (let i = 0; i < 2; i++) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'opt big'; bt.addEventListener('click', () => jdAnswer(bt.dataset.k)); jb.appendChild(bt); } }
    [...jb.children].forEach((bt, i) => { bt.textContent = labs[i]; bt.dataset.k = keys[i]; bt.disabled = !!S.jd.done[S.jd.i]; });
    $('#jdHead').textContent = '🧐 ' + jdTitle(q);
    const note = $('#ctlNote'); let nt = '';
    if (sc === 'cloud') nt = '두 원자의 전기 음성도를 바꿔 보세요. 전자쌍 구름이 어느 쪽으로 가는지, δ⁺와 δ⁻가 어떻게 나타나는지 관찰해요.';
    if (sc === 'arrows' && part === 'cards') nt = '카드를 눌러 결합을 고른 뒤 Δχ와 화살표 방향을 정하고 그려요.';
    if (sc === 'arrows' && part === 'order') nt = '카드를 끌어 놓거나 눌러서 차례대로 놓아요. 칸에 놓인 카드를 누르면 빠져요.';
    if (sc === 'scale') nt = '카드를 끌어 눈금 위의 알맞은 Δχ 값에 놓아요. 카드를 누르면 입자 모형이 나와요.';
    note.textContent = nt; note.hidden = !nt;
  }
  function setCl(which, v) {
    v = clamp(Math.round(v), 8, 40);
    if (S.cl[which] !== v) { S.cl[which] = v; Sound.tick(); }
    updateUI();
  }
  $('#sA').addEventListener('input', (e) => setCl('a', +e.target.value));
  $('#sB').addEventListener('input', (e) => setCl('b', +e.target.value));
  $('#aMinus').addEventListener('click', () => setCl('a', S.cl.a - 1)); $('#aPlus').addEventListener('click', () => setCl('a', S.cl.a + 1));
  $('#bMinus').addEventListener('click', () => setCl('b', S.cl.b - 1)); $('#bPlus').addEventListener('click', () => setCl('b', S.cl.b + 1));
  $('#dMinus').addEventListener('click', () => { S.ar.d10 = clamp(S.ar.d10 - 1, 0, 35); Sound.tick(); updateUI(); });
  $('#dPlus').addEventListener('click', () => { S.ar.d10 = clamp(S.ar.d10 + 1, 0, 35); Sound.tick(); updateUI(); });
  $$('#dirSeg button').forEach((b) => b.addEventListener('click', () => { S.ar.dir = b.dataset.v; Sound.tick(); updateUI(); }));
  $('#drawArrowBtn').addEventListener('click', drawArrowNow);
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.ar.tiles.forEach((t) => { t.slot = null; }); S.ar.oMsg = ''; updateUI(); });
  $('#scaleClear').addEventListener('click', () => { Sound.click(); S.sc.items.forEach((t) => { t.val = null; t.bad = false; t.ok = false; }); updateUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'cloud') { S.cl.a = 21; S.cl.b = 30; }
    else if (S.scene === 'arrows') { if (S.ar.part === 'order') { S.ar.tiles.forEach((t) => { t.slot = null; }); S.ar.oMsg = ''; } else { S.ar.d10 = 0; S.ar.dir = 'N'; S.ar.msg = ''; } }
    else if (S.scene === 'scale') { S.sc.items.forEach((t) => { t.val = null; t.bad = false; t.ok = false; }); }
    else { S.jd.msg = ''; }
    updateUI();
  });

  // 포인터
  let drag = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'arrows' && S.ar.part === 'cards') { for (let i = 0; i < CARDS.length; i++) { const r = cardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { selectCard(i); return true; } } return false; }
      if (S.scene === 'arrows' && S.ar.part === 'order' && !S.ar.odone) {
        const t = tileAt(p); if (!t) return false;
        t.drag = true; drag = { kind: 't', o: t, ox: p.x - t.x, oy: p.y - t.y, sx: p.x, sy: p.y, moved: 0 };
        S.ar.tiles.splice(S.ar.tiles.indexOf(t), 1); S.ar.tiles.push(t); return true;
      }
      if (S.scene === 'scale') {
        const t = scAt(p); if (!t) return false;
        t.drag = true; t.bad = false; t.ok = false; drag = { kind: 's', o: t, ox: p.x - t.x, oy: p.y - t.y, sx: p.x, sy: p.y, moved: 0 };
        S.sc.sel = SCB.indexOf(t.b); S.sc.items.splice(S.sc.items.indexOf(t), 1); S.sc.items.push(t); Sound.tick(); updateUI(); return true;
      }
      return false;
    },
    move(p) {
      if (!drag) return; const o = drag.o, w = drag.kind === 't' ? TL.w : SCW, h = drag.kind === 't' ? TL.h : SCH;
      o.x = clamp(p.x - drag.ox, 0, VW - w); o.y = clamp(p.y - drag.oy, 0, VH - h); drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.sx, p.y - drag.sy));
    },
    up(p) {
      if (!drag) return; const d = drag; drag = null; const o = d.o; o.drag = false;
      if (d.kind === 't') {
        if (d.moved < 8) { if (o.slot != null) { o.slot = null; Sound.tick(); S.ar.oMsg = ''; } else { const used = S.ar.tiles.map((q) => q.slot); const f = [0, 1, 2, 3].find((i) => used.indexOf(i) < 0); if (f != null) tPlace(o, f); } }
        else tPlace(o, tSlotAt(p));
      } else {
        // 눈금 위에 놓았는지는 포인터 위치로 판단해요 (눈금 막대 위쪽 영역)
        if (p.y < AX.y + AX.h + 4 && d.moved >= 6) { o.val = axV(p.x); Sound.tick(); }
        else if (d.moved >= 6) { o.val = null; }
        else if (o.val == null) { /* 눌렀다 뗀 경우: 입자 모형만 보여 줘요 */ }
        updateUI();
      }
    },
    hover(p) {
      if (S.scene === 'arrows' && S.ar.part === 'cards') { return CARDS.some((c, i) => { const r = cardRect(i); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }) ? 'pointer' : 'default'; }
      if (S.scene === 'arrows' && S.ar.part === 'order') return tileAt(p) ? 'grab' : 'default';
      if (S.scene === 'scale') return scAt(p) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ---------- 읽기 값 ---------- */
  function readouts() {
    if (S.scene === 'cloud') {
      const d = cd10(); setRO(1, '전기 음성도', 'A ' + f1(S.cl.a) + ' · B ' + f1(S.cl.b)); setRO(2, '전기 음성도 차 Δχ', f1(d)); setRO(3, '결합', clClass(d)[0]); return;
    }
    if (S.scene === 'arrows') {
      const b = selCard(); setRO(1, '선택한 결합', b.label); setRO(2, '입력한 Δχ', f1(S.ar.d10));
      setRO(3, '그린 화살표', Object.keys(S.ar.done).length + ' / ' + CARDS.length + '개'); return;
    }
    if (S.scene === 'scale') {
      const sel = S.sc.sel != null ? SCB[S.sc.sel] : null;
      setRO(1, '눈금에 놓은 카드', scalePlaced() + ' / ' + SCB.length); setRO(2, '선택한 결합', sel ? sel.label : '—'); setRO(3, '결합의 종류', sel ? (sel.ionic ? '이온 결합 (금속 + 비금속)' : sel.pol ? '극성 공유 결합' : '무극성 공유 결합') : '—'); return;
    }
    setRO(1, '문제', (S.jd.i + 1) + ' / ' + JD.length); setRO(2, '맞힌 문제', Object.keys(S.jd.done).length + ' / ' + JD.length); setRO(3, '현재 유형', SETS.find((s) => S.jd.i >= s[2] && S.jd.i < s[3])[1]);
  }

  /* =========================================================
     미션
     ========================================================= */
  const co2Fig = '<svg viewBox="0 0 300 120" width="300" role="img" aria-label="이산화 탄소 분자. C=O 결합의 쌍극자 모멘트 화살표 두 개가 서로 반대 방향이다." style="max-width:100%"><rect width="300" height="120" rx="10" fill="#f3f0fb"/>' +
    '<line x1="90" y1="70" x2="150" y2="70" stroke="#5d6879" stroke-width="4"/><line x1="90" y1="78" x2="150" y2="78" stroke="#5d6879" stroke-width="4"/><line x1="150" y1="70" x2="210" y2="70" stroke="#5d6879" stroke-width="4"/><line x1="150" y1="78" x2="210" y2="78" stroke="#5d6879" stroke-width="4"/>' +
    '<circle cx="75" cy="74" r="20" fill="#e2574c"/><text x="75" y="80" text-anchor="middle" font-size="17" font-weight="900" fill="#fff">O</text>' +
    '<circle cx="150" cy="74" r="20" fill="#7a8394"/><text x="150" y="80" text-anchor="middle" font-size="17" font-weight="900" fill="#fff">C</text>' +
    '<circle cx="225" cy="74" r="20" fill="#e2574c"/><text x="225" y="80" text-anchor="middle" font-size="17" font-weight="900" fill="#fff">O</text>' +
    '<line x1="140" y1="30" x2="86" y2="30" stroke="#7c3aed" stroke-width="5"/><polygon points="76,30 90,23 90,37" fill="#7c3aed"/><line x1="160" y1="30" x2="214" y2="30" stroke="#7c3aed" stroke-width="5"/><polygon points="224,30 210,23 210,37" fill="#7c3aed"/>' +
    '<text x="150" y="108" text-anchor="middle" font-size="13" font-weight="800" fill="#4c1d95">C=O 결합은 극성이에요. 그런데 화살표가 서로 반대 방향이에요.</text></svg>';
  const levels = [
    {
      title: '전자 구름: 전자쌍이 치우치는 정도', short: '전자 구름', icon: '☁️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 공유 결합인데도 H–Cl의 전자는 왜 한쪽에 쏠려 있고 Cl–Cl은 그렇지 않을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(전기 음성도)에서</b> 전기 음성도가 큰 원자 쪽으로 공유 전자쌍이 치우친다고 배웠어요. 이번에는 <b>얼마나</b> 치우치는지, 그리고 그 결과 결합이 어떻게 달라지는지 알아봐요.</div>' +
        '<p>두 원자의 전기 음성도를 슬라이더로 바꿔 가며 공유 전자쌍 <b>구름</b>의 위치를 관찰해요. 전자쌍이 치우치면 전자가 많이 가 있는 쪽은 <b>부분 음전하(δ⁻)</b>, 적게 가 있는 쪽은 <b>부분 양전하(δ⁺)</b>를 띠어요.</p>',
      features: ['cloud'],
      setup() { S.gate = ''; S.cl.a = 21; S.cl.b = 30; S.cl.pos = 0.5; setScene('cloud'); updateUI(); },
      recap: '두 원자의 전기 음성도가 같으면 전자쌍은 가운데에 있어 부분 전하가 없는 무극성 결합이고, 다르면 큰 쪽으로 치우쳐 δ⁻, δ⁺가 생기는 극성 결합이에요. 차이가 클수록 더 많이 치우쳐요.',
      summary: '<ul><li>두 원자의 전기 음성도가 <b>같다</b>(Δχ = 0) → 전자쌍이 가운데 → 부분 전하 없음 → <b>무극성 공유 결합</b> (예: H–H, Cl–Cl)</li><li>전기 음성도가 <b>다르다</b>(Δχ &gt; 0) → 전자쌍이 큰 쪽으로 치우침 → 큰 쪽 <b>δ⁻</b>, 작은 쪽 <b>δ⁺</b> → <b>극성 공유 결합</b></li><li>Δχ = |두 원자의 전기 음성도 차|가 클수록 전자쌍이 더 많이 치우쳐요.</li></ul>',
      missions: [
        {
          title: '무극성 만들기',
          goal: '두 원자의 전기 음성도를 <b>같게</b> 만들어 전자쌍 구름을 가운데에 놓아 보세요.',
          hint: '두 슬라이더(또는 −, + 버튼)로 왼쪽과 오른쪽 원자의 값을 같게 맞춰요. 같아지면 δ 표시가 사라져요.',
          setup() { S.gate = ''; setScene('cloud'); updateUI(); },
          check: () => S.cl.a === S.cl.b,
          hold: 0.8,
          status: () => mark(S.cl.a === S.cl.b) + ' 왼쪽 ' + f1(S.cl.a) + ' = 오른쪽 ' + f1(S.cl.b) + ' (Δχ = ' + f1(cd10()) + ')',
          explain: '전기 음성도가 같으면 두 원자가 전자쌍을 <b>똑같은 세기</b>로 끌어당겨 구름이 가운데에 있고 δ⁺, δ⁻가 생기지 않아요. 이것이 <b>무극성 공유 결합</b>이에요.',
        },
        {
          title: '극성 만들기',
          goal: '두 원자의 전기 음성도 차(Δχ)를 <b>1.0 이상</b>으로 만들어 구름을 한쪽으로 확 치우치게 해 보세요.',
          hint: '한쪽은 작게, 한쪽은 크게 해요. 예를 들어 2.1과 3.5처럼요. 차이가 클수록 구름이 더 많이 쏠려요.',
          setup() { S.gate = ''; setScene('cloud'); updateUI(); },
          check: () => cd10() >= 10,
          hold: 0.8,
          status: () => mark(cd10() >= 10) + ' Δχ = ' + f1(cd10()) + ' (1.0 이상)',
          explain: 'Δχ가 클수록 전자쌍이 전기 음성도가 <b>큰 쪽</b>으로 많이 치우치고 δ⁻, δ⁺가 뚜렷해져요. 이런 결합이 <b>극성 공유 결합</b>이에요.',
        },
        {
          type: 'quiz', title: 'Cl–Cl에 부분 전하가 없는 까닭',
          goal: '염소 분자(Cl–Cl)에서 두 Cl 원자에 부분 전하(δ⁺, δ⁻)가 <b>없는</b> 까닭은?',
          setup() { S.gate = ''; setScene('cloud'); updateUI(); },
          choices: ['Cl 원자는 전자를 하나도 끌어당기지 않아서', '두 Cl 원자의 전기 음성도가 같아 공유 전자쌍이 가운데에 있어서', 'Cl–Cl은 이온 결합이어서', '공유 전자쌍이 없어서'],
          answer: 1,
          feedback: ['Cl은 전기 음성도가 큰 편이에요(3.0). 다만 상대 원자도 똑같이 끌어당겨요.', '', 'Cl–Cl은 비금속끼리 전자쌍을 공유하는 공유 결합이에요.', 'Cl–Cl에는 공유 전자쌍이 있어요. 가운데에 있을 뿐이에요.'],
          explain: '같은 원자끼리의 결합은 전기 음성도가 같아서 전자쌍이 <b>가운데</b>에 있어요. 그래서 부분 전하가 없는 <b>무극성 공유 결합</b>이에요.',
        },
      ],
    },
    {
      title: 'Δχ와 쌍극자 모멘트 화살표', short: 'Δχ와 화살표', icon: '➕', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기 음성도 차가 클수록 전자쌍이 많이 치우치는 것을 봤어요. 그 치우침을 <b>숫자(Δχ)</b>와 <b>화살표</b>로 나타내 봐요.</div>' +
        '<p>결합의 극성을 나타내는 <b>쌍극자 모멘트</b>는 화살표로 그려요. 화살표는 <b>δ⁺에서 δ⁻ 쪽</b>(전기 음성도가 큰 원자 쪽)을 향하고, 길이는 Δχ에 비례해요. (이 과정에서는 값을 계산하지 않고 방향과 상대적인 크기만 다뤄요.)</p>',
      features: ['arrows'],
      setup() { S.gate = ''; S.ar.part = 'cards'; S.ar.done = {}; S.ar.prog = {}; S.ar.sel = cardIdx('H', 'Cl'); S.ar.d10 = 0; S.ar.dir = 'N'; S.ar.msg = ''; S.ar.odone = false; buildTiles(); setScene('arrows'); updateUI(); },
      recap: '결합의 극성은 Δχ(전기 음성도 차)로 판단해요. 쌍극자 모멘트 화살표는 δ⁺에서 δ⁻ 쪽(전기 음성도가 큰 원자 쪽)을 향하고 길이는 Δχ에 비례해요. H–X 중에서는 HF가 가장 극성이에요.',
      summary: '<table class="mini"><tr><th>결합</th><th>Δχ</th><th>화살표</th></tr><tr><td>H–H</td><td>0</td><td>없음</td></tr><tr><td>H–I</td><td>0.4</td><td>I 쪽</td></tr><tr><td>H–Br</td><td>0.7</td><td>Br 쪽</td></tr><tr><td>H–Cl</td><td>0.9</td><td>Cl 쪽</td></tr><tr><td>N–H</td><td>0.9</td><td>N 쪽</td></tr><tr><td>O–H</td><td>1.4</td><td>O 쪽</td></tr><tr><td>H–F</td><td>1.9</td><td>F 쪽</td></tr></table><ul><li>화살표: 꼬리(+)는 δ⁺, 머리는 δ⁻ 쪽. 길이는 Δχ에 비례(상대 크기).</li><li>H–X의 극성: <b>HF &gt; HCl &gt; HBr &gt; HI</b></li></ul>',
      missions: [
        {
          title: 'H–X 4가지의 Δχ와 화살표',
          goal: '<b>H–F, H–Cl, H–Br, H–I</b> 결합 카드의 Δχ를 계산하고 화살표의 방향을 정해 <b>그려 보세요</b>.',
          hint: '카드를 눌러 고르고, Δχ = 큰 값 − 작은 값을 − + 버튼으로 맞춰요. 화살표는 전기 음성도가 큰 쪽을 향해요.',
          setup() { S.gate = ''; S.ar.part = 'cards'; setScene('arrows'); updateUI(); },
          check: () => HXI.every((i) => S.ar.done[CARDS[i].id]),
          hold: 0.5,
          status: () => HXI.map((i) => mark(S.ar.done[CARDS[i].id]) + ' ' + CARDS[i].label + (S.ar.done[CARDS[i].id] ? ' (' + f1(CARDS[i].d10) + ')' : '')).join(' &nbsp; '),
          explain: 'Δχ는 H–F <b>1.9</b>, H–Cl <b>0.9</b>, H–Br <b>0.7</b>, H–I <b>0.4</b>이고, 화살표는 모두 H에서 할로젠 원소 쪽으로 향해요. (δ⁺는 H, δ⁻는 F · Cl · Br · I)',
        },
        {
          title: '화살표 길이 순서대로 놓기',
          goal: '<b>H–X 4가지</b> 카드를 화살표(쌍극자 모멘트)가 <b>짧은 것 → 긴 것</b> 순서로 놓으세요.',
          hint: '화살표 길이는 Δχ에 비례해요. 앞에서 그린 화살표를 떠올려 봐요. 가장 긴 것은 H–F예요.',
          setup() { S.gate = ''; S.ar.part = 'order'; buildTiles(); setScene('arrows'); updateUI(); },
          check: () => S.ar.odone,
          hold: 0.5,
          status: () => mark(S.ar.odone) + ' 화살표 길이 순서 (놓은 카드 ' + S.ar.tiles.filter((t) => t.slot != null).length + ' / 4)',
          explain: '화살표가 길수록 Δχ가 커서 더 극성이에요: <b>H–I(0.4) &lt; H–Br(0.7) &lt; H–Cl(0.9) &lt; H–F(1.9)</b>.',
        },
        {
          type: 'quiz', title: '가장 극성이 큰 할로젠화 수소',
          goal: 'HF, HCl, HBr, HI 중 <b>극성이 가장 큰</b> 것은?',
          setup() { S.gate = ''; S.ar.part = 'cards'; setScene('arrows'); updateUI(); },
          choices: ['HF', 'HCl', 'HBr', 'HI'],
          answer: 0,
          feedback: ['', 'HCl(Δχ 0.9)보다 더 큰 Δχ를 가진 결합이 있어요.', 'HBr은 Δχ가 0.7이에요. 더 큰 것을 찾아봐요.', 'HI는 Δχ가 0.4로 가장 작아요.'],
          explain: 'H–F의 Δχ가 <b>1.9</b>로 가장 커서 화살표가 가장 길고, 극성이 가장 커요. 17족에서 위쪽(F)일수록 전기 음성도가 커서 H와의 차이도 커져요.',
        },
      ],
    },
    {
      title: '결합 연속체: 무극성에서 이온 결합까지', short: '결합 연속체', icon: '📏', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Δχ가 클수록 극성이 큰 것을 알았어요. 그럼 Δχ가 아주 커지면 어떻게 될까요? 결합들을 Δχ 눈금 위에 늘어놓아 <b>연속적인 변화</b>를 살펴봐요.</div>' +
        '<p>무극성 공유 결합(Cl–Cl)에서 극성 공유 결합(O–H, H–F)을 지나 이온 결합(Na–Cl, K–F)까지, 전자쌍이 치우치는 정도가 <b>연속적으로</b> 변해요. 이온 결합은 전자가 거의 완전히 이동한 <b>극성의 끝</b>이에요. 다만 이온 결합인지는 Δχ 숫자 하나로 자르지 않고 <b>금속 + 비금속</b>인지도 함께 봐요.</p>',
      features: ['scale'],
      setup() { S.gate = ''; buildScale(); setScene('scale'); updateUI(); },
      recap: '결합은 무극성 공유 → 약한 극성 → 극성 공유 → 이온 결합으로 연속적으로 변해요. 이온 결합은 전자가 완전히 이동한 극성의 끝이고, 공유 결합인지 이온 결합인지는 Δχ와 함께 구성 원소(금속 + 비금속)를 보고 판단해요.',
      summary: '<table class="mini"><tr><th>결합</th><th>Δχ</th><th>종류</th></tr><tr><td>Cl–Cl</td><td>0</td><td>무극성 공유</td></tr><tr><td>C–H</td><td>0.4</td><td>약한 극성 공유</td></tr><tr><td>O–H</td><td>1.4</td><td>극성 공유</td></tr><tr><td>H–F</td><td>1.9</td><td>극성 공유 (비금속끼리)</td></tr><tr><td>Na–Cl</td><td>2.1</td><td>이온 (금속 + 비금속)</td></tr><tr><td>K–F</td><td>3.2</td><td>이온 (금속 + 비금속)</td></tr></table><ul><li>Δχ가 커질수록 전자쌍이 더 치우치고, 이온 결합에서는 전자가 완전히 이동해요.</li><li>H–F(1.9)는 공유 결합, Na–Cl(2.1)은 이온 결합: Δχ 숫자 하나가 아니라 <b>구성 원소(금속 + 비금속)</b>를 함께 봐요.</li></ul>',
      missions: [
        {
          title: '결합을 눈금 위에 놓기', manual: true,
          goal: '여섯 결합 카드의 Δχ를 계산해 <b>눈금의 알맞은 자리</b>에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'Δχ = 큰 값 − 작은 값이에요. 카드에 적힌 두 원소의 전기 음성도로 계산해요. (Cl–Cl은 0, K–F는 3.2예요)',
          setup() { S.gate = ''; buildScale(); setScene('scale'); updateUI(); },
          check: () => scaleCheck(),
          status: () => '눈금에 놓은 카드 ' + scalePlaced() + ' / ' + SCB.length,
          explain: 'Cl–Cl <b>0</b>, C–H <b>0.4</b>, O–H <b>1.4</b>, H–F <b>1.9</b>, Na–Cl <b>2.1</b>, K–F <b>3.2</b>예요. 왼쪽에서 오른쪽으로 갈수록 전자쌍이 더 치우치다가, 끝에서는 전자가 완전히 이동한 이온 결합이 돼요.',
        },
        {
          type: 'quiz', title: 'H–F는 왜 공유 결합일까?',
          goal: 'H–F의 Δχ(1.9)는 Na–Cl의 Δχ(2.1)와 비슷하게 큰데도 H–F는 <b>공유 결합</b>이에요. 까닭은?',
          setup() { S.gate = ''; setScene('scale'); updateUI(); },
          choices: ['Δχ가 2.0보다 작으면 무조건 공유 결합이어서', 'H와 F가 둘 다 비금속이라 전자쌍을 공유하기 때문에 (이온 결합은 금속 + 비금속)', 'H–F에는 전자가 전혀 없어서', 'F는 전기 음성도가 작아서'],
          answer: 1,
          feedback: ['숫자 하나로 가르는 것이 아니에요. 어떤 원소들이 결합했는지도 함께 봐요.', '', 'H–F에도 공유 전자쌍이 있어요.', 'F의 전기 음성도는 4.0으로 가장 커요.'],
          explain: '결합의 종류는 Δχ와 <b>구성 원소</b>를 함께 보고 판단해요. H–F는 <b>비금속끼리</b>의 결합이라 전자쌍을 공유하는 공유 결합(극성이 매우 큼)이고, Na–Cl은 <b>금속 + 비금속</b>이라 이온 결합이에요.',
        },
      ],
    },
    {
      title: '결합의 극성 판단하기', short: '결합 판단', icon: '🧐', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 결합이 무극성에서 이온 결합까지 연속적으로 변한다는 것을 봤어요. 이제 배운 것을 써서 <b>결합의 극성</b>을 직접 판단해 봐요.</div>' +
        '<p>세 가지 유형의 문제를 풀어요. ① 두 결합 중 <b>더 극성</b>인 것 고르기 ② 쌍극자 모멘트 <b>화살표의 방향</b> 정하기 ③ 극성 결합과 무극성 결합 <b>분류</b>하기. 풀면 Δχ와 화살표를 확인할 수 있어요.</p>',
      features: ['judge'],
      setup() { S.gate = ''; S.jd = { i: 0, done: [], msg: '', ok: false, shake: -9, adv: null, prog: 0 }; setScene('judge'); updateUI(); },
      recap: 'Δχ가 클수록 더 극성이고, 화살표는 전기 음성도가 큰 원자 쪽을 향해요. 같은 원소끼리의 결합(N≡N, O=O)은 단일 · 이중 · 삼중 결합이어도 무극성이고, 서로 다른 원소 사이의 결합(H–Cl, C=O)은 극성이에요.',
      summary: '<ul><li>더 극성인 결합 = Δχ가 큰 결합: O–H(1.4) &gt; N–H(0.9), C–Cl(0.5) &gt; C–H(0.4), C–O(1.0) &gt; C–N(0.5)</li><li>화살표 방향: C–O는 <b>O 쪽</b>, N–H는 <b>N 쪽</b> (전기 음성도가 큰 원자 쪽)</li><li>무극성: N≡N, O=O (같은 원소) / 극성: H–Cl, C=O (다른 원소)</li><li>극성 <b>결합</b>이 있어도 분자 전체가 극성인지는 분자의 <b>모양</b>에 따라 달라요(다음 차시들에서 배워요).</li></ul>',
      missions: [
        {
          title: '극성 판단 3유형',
          goal: '<b>비교 3문제 · 화살표 방향 2문제 · 분류 4문제</b>를 모두 맞히세요.',
          hint: '비교는 각 결합의 Δχ(큰 값 − 작은 값)를 계산해요. 화살표는 전기 음성도가 큰 원자 쪽, 분류는 두 원자의 전기 음성도가 같은지를 봐요.',
          setup() { S.gate = ''; setScene('judge'); updateUI(); },
          check: () => jdAll(),
          hold: 0.6,
          status: () => SETS.map((s) => mark(jdCount(s) === s[3] - s[2]) + ' ' + s[1] + ' ' + jdCount(s) + '/' + (s[3] - s[2])).join(' &nbsp; '),
          explain: '<b>더 극성인 것</b>: O–H, C–Cl, C–O (Δχ가 더 큼). <b>화살표</b>: C–O는 O 쪽, N–H는 N 쪽. <b>무극성</b>: N≡N, O=O (같은 원소끼리) / <b>극성</b>: H–Cl, C=O (다른 원소 사이).',
        },
        {
          type: 'quiz', title: '극성 결합이 있으면 항상 극성 분자일까?', figure: co2Fig,
          goal: '이산화 탄소(CO₂)의 C=O 결합은 극성 결합이에요. 그렇다면 극성 결합을 가진 분자는 <b>항상 극성 분자</b>일까요?',
          setup() { S.gate = ''; setScene('judge'); updateUI(); },
          choices: ['네, 극성 결합이 있으면 항상 극성 분자예요', '아니요, 분자의 모양에 따라 결합의 화살표가 서로 상쇄되어 분자 전체는 무극성일 수 있어요', '아니요, 극성 결합은 분자에서는 의미가 없어요', '네, 하지만 이중 결합이면 예외예요'],
          answer: 1,
          feedback: ['그림의 두 화살표가 서로 반대 방향이에요. 합쳐지면 어떻게 될까요?', '', '극성 결합은 분자의 성질에 영향을 줘요. 다만 모양에 따라 영향이 달라져요.', '이중 결합이라서가 아니라 분자의 모양(대칭)이 중요해요.'],
          explain: 'CO₂는 직선형이라 두 C=O 결합의 화살표가 <b>크기가 같고 방향이 반대</b>여서 서로 상쇄돼요. 그래서 분자 전체는 <b>무극성</b>이에요. 분자의 극성은 결합의 극성과 <b>분자의 모양</b>(다음 차시들)을 함께 봐야 알 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-bond-polarity', mount: '#game', badge: '극성 판독가', homeHref: '../../index.html#hc',
    featureLabels: { cloud: '☁️ 전기 음성도 슬라이더 · 전자 구름', arrows: '➕ 결합 카드 · Δχ · 쌍극자 화살표', scale: '📏 결합 연속체 눈금', judge: '🧐 결합 판단 문제' },
    onFeatures() { updateUI(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildTiles(); buildScale(); updateUI();
  function update(dt) {
    S.t += dt;
    if (S.scene === 'cloud') clStep(dt);
    else if (S.scene === 'arrows') oStep(dt);
    else if (S.scene === 'scale') scStep(dt);
    else jdStep();
    fx.update(dt);
  }
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt) => {
    if (game && (game.free !== lastFree || game.level !== lastLevel)) { lastFree = game.free; lastLevel = game.level; updateUI(); }
    update(dt);
    view.apply();
    if (S.scene === 'cloud') drawCloud();
    else if (S.scene === 'arrows') { if (S.ar.part === 'order') drawOrderScene(); else drawCardsScene(); }
    else if (S.scene === 'scale') drawScale();
    else drawJudge();
    fx.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, CARDS, SCB, JD, HXI, oAns, TL, AX, SCW, SCH, CG, get game() { return game; },
    setScene, setCl, selectCard, drawArrowNow, buildTiles, buildScale, tSlot, tTray, jdAnswer, jdKeys, cardRect, posOf, qOf, bond, scTarget, axX, scaleCheck,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) update(0.02); },
  };
})();
