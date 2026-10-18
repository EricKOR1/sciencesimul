/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 전기 음성도 [12화학02-02 (앞부분)]
   ① 관찰: 전자 줄다리기 (H–H, H–F, Na–Cl: 공유 전자쌍이 어느 쪽으로 쏠리는지 예측)
   ② 탐구: 주기성 탐색 (주기율표 히트맵, 2·3주기 / 17족 / 1족 값 그래프)
   ③ 분석: 경향과 까닭 (같은 주기: 핵전하 증가, 같은 족: 전자껍질 수 증가)
   ④ 적용: 순서 맞히기 (카드 배열 2문제, 위치 비교 3문제)
   ※ 전기 음성도는 폴링 값(무차원)을 써요. 1~3주기와 K · Ca · Br 중심이고 18족은 값을 쓰지 않아요.
   ※ 결합의 극성 판단(Δχ, 쌍극자 모멘트)은 다음 차시 '결합의 극성'에서 다뤄요.
   ※ '당기는 힘' 막대는 (유효 핵전하 ÷ 껍질 번호²)로 만든 간단한 정성적 모형이에요(같은 줄 안에서만 비교).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const { tween, approach, Spring } = SciSim;
  const CO = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 660 : 560;
  const FS = PHONE ? 1.12 : 1;
  const fs = (n) => Math.round(n * FS);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);

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
  const PUR = '#7c3aed', PURD = '#4c1d95';

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

  /* ---------- 원소 자료 (전기 음성도는 10배한 정수로 두고 계산해요) ---------- */
  const EL = [
    { s: 'H', n: '수소', Z: 1, g: 1, p: 1, e: 21, v: 1 }, { s: 'He', n: '헬륨', Z: 2, g: 18, p: 1, e: null, v: 2 },
    { s: 'Li', n: '리튬', Z: 3, g: 1, p: 2, e: 10, v: 1 }, { s: 'Be', n: '베릴륨', Z: 4, g: 2, p: 2, e: 15, v: 2 },
    { s: 'B', n: '붕소', Z: 5, g: 13, p: 2, e: 20, v: 3 }, { s: 'C', n: '탄소', Z: 6, g: 14, p: 2, e: 25, v: 4 },
    { s: 'N', n: '질소', Z: 7, g: 15, p: 2, e: 30, v: 5 }, { s: 'O', n: '산소', Z: 8, g: 16, p: 2, e: 35, v: 6 },
    { s: 'F', n: '플루오린', Z: 9, g: 17, p: 2, e: 40, v: 7 }, { s: 'Ne', n: '네온', Z: 10, g: 18, p: 2, e: null, v: 8 },
    { s: 'Na', n: '나트륨', Z: 11, g: 1, p: 3, e: 9, v: 1 }, { s: 'Mg', n: '마그네슘', Z: 12, g: 2, p: 3, e: 12, v: 2 },
    { s: 'Al', n: '알루미늄', Z: 13, g: 13, p: 3, e: 15, v: 3 }, { s: 'Si', n: '규소', Z: 14, g: 14, p: 3, e: 18, v: 4 },
    { s: 'P', n: '인', Z: 15, g: 15, p: 3, e: 21, v: 5 }, { s: 'S', n: '황', Z: 16, g: 16, p: 3, e: 25, v: 6 },
    { s: 'Cl', n: '염소', Z: 17, g: 17, p: 3, e: 30, v: 7 }, { s: 'Ar', n: '아르곤', Z: 18, g: 18, p: 3, e: null, v: 8 },
    { s: 'K', n: '칼륨', Z: 19, g: 1, p: 4, e: 8, v: 1 }, { s: 'Ca', n: '칼슘', Z: 20, g: 2, p: 4, e: 10, v: 2 },
    { s: 'Br', n: '브로민', Z: 35, g: 17, p: 4, e: 28, v: 7 },
  ];
  const E = {}; EL.forEach((e) => { E[e.s] = e; });
  const enOf = (s) => E[s].e / 10;
  const enTxt = (s) => (E[s].e == null ? '—' : enOf(s).toFixed(1));
  const GCOL = { 1: 0, 2: 1, 13: 2, 14: 3, 15: 4, 16: 5, 17: 6, 18: 7 };
  const GROUPS = [1, 2, 13, 14, 15, 16, 17, 18];
  const EN_MIN = 8, EN_MAX = 40;
  const enColor = (e10) => { const t = clamp((e10 - EN_MIN) / (EN_MAX - EN_MIN), 0, 1); return CO.mix('#f1ebfd', '#5b21b6', Math.pow(t, 0.85)); };
  const darkText = (e10) => (e10 - EN_MIN) / (EN_MAX - EN_MIN) < 0.55;
  // 공유 전자쌍이 쏠리는 정도(정성적): 전기 음성도 차 Δχ가 클수록 큰 쪽으로 더 치우쳐요
  const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const qOf = (d) => smooth01(d / 2.4);
  function cloudPos(a, b) {   // 0 = 왼쪽(a) 원자, 1 = 오른쪽(b) 원자
    const ea = E[a].e, eb = E[b].e, d = Math.abs(ea - eb) / 10;
    return 0.5 + 0.5 * Math.sign(eb - ea) * qOf(d);
  }
  const SERIES = {
    p2: { label: '2주기', els: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F'], note: '원자 번호가 커질수록' },
    p3: { label: '3주기', els: ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl'], note: '원자 번호가 커질수록' },
    g17: { label: '17족', els: ['F', 'Cl', 'Br'], note: '아래로 갈수록' },
    g1: { label: '1족', els: ['Li', 'Na', 'K'], note: '아래로 갈수록' },
  };
  const shellsOf = (s) => E[s].p;
  const shellCfg = (s) => { const z = E[s].Z; if (s === 'Br') return [2, 8, 18, 7]; if (z <= 10) return z <= 2 ? [z] : [2, z - 2]; return [2, 8, z - 10]; };
  // 당기는 힘(상대): 유효 핵전하(≈ 최외각 전자 수) ÷ (껍질 번호)²
  const pullRaw = (s) => E[s].v / (E[s].p * E[s].p);

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'tug', t: 0, fade: 0, gate: '',
    tug: { cur: 'HH', pred: {}, done: {}, shown: {}, sp: new Spring(0.5, { stiffness: 70, damping: 7 }), reveal: 0, msg: '', pending: null, wrong: {}, flash: 0 },
    tb: { sel: 'F', ser: 'p2', t0: 0, prog: 0, drawn: {}, tw: null },
    at: { mode: 'p2', i: 0, rr: [0, 0, 0, 0], ra: [0, 0, 0, 0], ph: [0, 0, 0, 0], pop: 1, pullN: 0 },
    od: { part: 'arrange', qi: 0, cards: [], done: {}, msg: '', shake: -9, advance: null, ci: 0, cdone: {}, cmpShake: -9, cmpMsg: '' },
    rule: {},
  };
  let game = null;
  const gameLevel = () => (game ? game.level : 0);
  const isFree = () => !!(game && game.free);

  /* =========================================================
     ① 전자 줄다리기
     ========================================================= */
  const TUGS = [{ id: 'HH', a: 'H', b: 'H' }, { id: 'HF', a: 'H', b: 'F' }, { id: 'NaCl', a: 'Na', b: 'Cl' }];
  const TBY = {}; TUGS.forEach((m) => { TBY[m.id] = m; });
  const mt = () => TBY[S.tug.cur];
  const tugAns = (m) => (E[m.a].e === E[m.b].e ? 'M' : E[m.b].e > E[m.a].e ? 'R' : 'L');
  const TG = PHONE ? { ax: 96, bx: 384, y: 190, r: 52 } : { ax: 168, bx: 632, y: 196, r: 62 };
  function predLabel(m, k) {
    if (k === 'M') return '가운데';
    const sym = k === 'L' ? m.a : m.b;
    return (m.a === m.b ? (k === 'L' ? '왼쪽 ' : '오른쪽 ') : '') + sym + ' 쪽';
  }
  function selectMatch(id) {
    S.tug.cur = id; S.tug.pending = null; S.tug.msg = '';
    const m = TBY[id];
    if (S.tug.done[id]) { S.tug.sp.target = cloudPos(m.a, m.b); S.tug.msg = '이미 맞힌 경기예요. 다른 경기도 해 봐요.'; }
    else { S.tug.sp.target = 0.5; S.tug.revealHold = false; }
    Sound.click(); updateUI();
  }
  function startMatch() {
    const m = mt(), pr = S.tug.pred[m.id];
    if (!pr || S.tug.pending) return;
    S.tug.shown[m.id] = true; S.tug.sp.target = cloudPos(m.a, m.b);
    S.tug.pending = { id: m.id, t: S.t + (RM ? 0.1 : 1.5) };
    Sound.click(); updateUI();
  }
  function tugStep(dt) {
    const T_ = S.tug;
    T_.sp.update(dt);
    T_.reveal = approach(T_.reveal, T_.pending || T_.done[T_.cur] || T_.revealHold ? 1 : 0, dt, 6);
    if (T_.pending && S.t >= T_.pending.t) {
      const m = TBY[T_.pending.id]; T_.pending = null;
      const ok = T_.pred[m.id] === tugAns(m);
      if (ok) {
        T_.done[m.id] = true; T_.msg = '맞았어요! ' + resultText(m); Sound.success();
        const cx = TG.ax + (TG.bx - TG.ax) * T_.sp.target;
        fx.burst(cx, TG.y - 10, { count: 18, colors: ['#ffd34d', '#8b5cf6', '#14a058', '#ffffff'], speed: 170, size: 3.5, gravity: 120 });
      } else {
        T_.msg = '예상과 달랐어요. ' + resultText(m) + ' 이유를 생각하고 다시 예측해 봐요.'; Sound.fail(); T_.flash = S.t;
        T_.pred[m.id] = null; T_.revealHold = true; T_.holdUntil = S.t + 2.2;
      }
      updateUI();
    }
    if (T_.revealHold && S.t > T_.holdUntil) { T_.revealHold = false; if (!T_.done[T_.cur]) { T_.sp.target = 0.5; } }
  }
  function resultText(m) {
    const a = tugAns(m);
    if (a === 'M') return '두 원자의 전기 음성도가 같아 전자쌍이 가운데에 있어요.';
    const w = a === 'R' ? m.b : m.a;
    return '전기 음성도가 더 큰 ' + w + ' 쪽으로 전자쌍이 치우쳐요.';
  }
  function drawTugScene() {
    const m = mt(), A = E[m.a], B = E[m.b], T_ = S.tug;
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    const pos = T_.sp.value, ax = TG.ax, bx = TG.bx, y = TG.y, r = TG.r;
    const cx = ax + (bx - ax) * pos;
    const rev = clamp(T_.reveal, 0, 1);
    // 밧줄 (팽팽함: 전기 음성도 차가 클수록 곧게)
    const sag = 14 * (1 - Math.abs(pos - 0.5) * 2) * (1 - 0.0);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(ax, y); ctx.quadraticCurveTo((ax + bx) / 2, y + sag * 2, bx, y); ctx.stroke();
    ctx.strokeStyle = '#d9b27a'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(ax, y); ctx.quadraticCurveTo((ax + bx) / 2, y + sag * 2, bx, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 원자
    const atom = (sym, x, side) => {
      const e = E[sym];
      D.glow(x, y, r + 28, enColor(e.e), 0.35);
      D.sphere(x, y, r, enColor(e.e), { shadow: true, outline: 'rgba(60,30,120,.45)', outlineWidth: 2 });
      T(x, y + r + 24, e.n, 14, INK, 'center', 800);
      T(x, y + r + 43, '최외각 전자 ' + e.v + '개', 12.5, MUTED, 'center', 700);
      // 전기 음성도 카드 (뒤집힘)
      const k = Math.abs(Math.cos(rev * Math.PI)), flipped = rev > 0.5;
      ctx.save(); ctx.translate(x, y + r + 76); ctx.scale(Math.max(0.04, rev > 0 && rev < 1 ? k : 1), 1);
      D.roundRect(-52, -17, 104, 34, 10); ctx.fillStyle = flipped ? '#4c1d95' : '#fff'; ctx.fill(); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2; ctx.stroke();
      T(0, 5, flipped ? 'χ = ' + enTxt(sym) : '전기 음성도 ?', 14, flipped ? '#fff' : '#7c6bb0', 'center', 900);
      ctx.restore();
    };
    atom(m.a, ax, 'L'); atom(m.b, bx, 'R');
    // 손 (밧줄을 잡은 손)
    const hand = (x, dir) => { D.sphere(x + dir * (r + 6), y, 11, '#f3c9a0', { gloss: false, outline: 'rgba(120,70,30,.5)', outlineWidth: 1.5 }); };
    hand(ax, 1); hand(bx, -1);
    // 공유 전자쌍 구름
    const cl = ctx.createRadialGradient(cx, y, 4, cx, y, 46);
    cl.addColorStop(0, 'rgba(255,214,77,.9)'); cl.addColorStop(0.6, 'rgba(255,190,40,.45)'); cl.addColorStop(1, 'rgba(255,190,40,0)');
    ctx.fillStyle = cl; ctx.beginPath(); ctx.ellipse(cx, y, 52, 32, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const a = S.t * 3.2 + i * Math.PI, ex = cx + Math.cos(a) * 20, ey = y + Math.sin(a * 1.3) * 11;
      D.sphere(ex, ey, 6.5, GOLD, { gloss: true, outline: 'rgba(120,70,0,.6)', outlineWidth: 1.2 });
    }
    // 원소 기호 (구름 위에 또렷하게)
    [[m.a, ax], [m.b, bx]].forEach(([sym, x]) => { const e = E[sym]; T(x, y + 11, sym, PHONE ? 30 : 38, darkText(e.e) ? INK : '#fff', 'center', 900, { stroke: darkText(e.e) ? 'rgba(255,255,255,.55)' : 'rgba(40,10,90,.55)', strokeWidth: 3.5 }); });
    // 깃발 + 이름
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y - 12); ctx.lineTo(cx, y - 52); ctx.stroke();
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(cx, y - 52); ctx.lineTo(cx + 26, y - 44); ctx.lineTo(cx, y - 36); ctx.closePath(); ctx.fill();
    T(cx, y - 60, '공유 전자쌍', 13, '#8a5a00', 'center', 900);
    // 당기는 힘 화살표 (전기 음성도에 비례)
    if (rev > 0.05) {
      ctx.save(); ctx.globalAlpha = rev;
      const ay = y - (PHONE ? 100 : 112), uL = PHONE ? 16 : 22;
      const la = A.e / 10 * uL, lb = B.e / 10 * uL;
      D.arrow(cx - 4, ay, cx - 4 - la, ay, { color: '#7c3aed', width: 5, head: 13 });
      D.arrow(cx + 4, ay, cx + 4 + lb, ay, { color: '#7c3aed', width: 5, head: 13 });
      T(cx - 4 - la / 2, ay - 14, m.a + ' ' + enTxt(m.a), 13, PURD, 'center', 900);
      T(cx + 4 + lb / 2, ay - 14, m.b + ' ' + enTxt(m.b), 13, PURD, 'center', 900);
      ctx.restore();
    }
    // 메시지
    if (T_.msg) {
      const msgY = y + r + 118;
      panel(PHONE ? 16 : 60, msgY, VW - (PHONE ? 32 : 120), PHONE ? 54 : 44, 12, T_.msg.startsWith('맞았') || T_.msg.startsWith('이미') ? '#e6f7ee' : '#fdecea', T_.msg.startsWith('예상') ? '#f0b7b1' : '#9bdcb8');
      textBlock(VW / 2, msgY + (PHONE ? 22 : 27), VW - (PHONE ? 56 : 160), T_.msg, 13.5, INK, 18, 800, 'center');
    }
    // 경기 결과 카드
    const cy0 = PHONE ? y + r + 188 : y + r + 176, cw = (VW - (PHONE ? 32 : 48) - 16) / 3, cx0 = PHONE ? 16 : 24;
    TUGS.forEach((q, i) => {
      const x0 = cx0 + i * (cw + 8), done = S.tug.done[q.id], cur = q.id === S.tug.cur;
      panel(x0, cy0, cw, PHONE ? 64 : 66, 12, done ? '#e6f7ee' : '#fff', cur ? '#8b5cf6' : done ? '#9bdcb8' : '#e3dcf5');
      T(x0 + cw / 2, cy0 + 22, q.a + ' – ' + q.b, 15, INK, 'center', 900);
      T(x0 + cw / 2, cy0 + 46, done ? resultShort(q) : S.tug.pred[q.id] ? '예측: ' + predLabel(q, S.tug.pred[q.id]) : '아직 안 했어요', PHONE ? 12 : 13, done ? '#0b6b39' : MUTED, 'center', 800);
      if (done) D.check(x0 + cw - 14, cy0 + 14, 9, 1);
    });
  }
  function resultShort(m) { const a = tugAns(m); return a === 'M' ? '전자쌍은 가운데' : (a === 'R' ? m.b : m.a) + ' 쪽으로 쏠림'; }

  /* =========================================================
     ② 주기율표 히트맵 + 그래프
     ========================================================= */
  const PT = PHONE ? { x0: 46, y0: 58, cw: 50, ch: 44, gap: 3 } : { x0: 58, y0: 72, cw: 54, ch: 50, gap: 3 };
  const cellRect = (e) => ({ x: PT.x0 + GCOL[e.g] * (PT.cw + PT.gap), y: PT.y0 + (e.p - 1) * (PT.ch + PT.gap), w: PT.cw, h: PT.ch });
  const TINFO = PHONE ? { x: 16, y: PT.y0 + 4 * (PT.ch + PT.gap) + 6, w: VW - 32, h: 78 } : { x: 532, y: 44, w: 246, h: 240 };
  const TGR = PHONE ? { x: 16, y: TINFO.y + TINFO.h + 10, w: VW - 32, h: 250 } : { x: 24, y: 300, w: 752, h: 248 };
  let tbReveal = 0;
  function enterTable() { S.tb.t0 = S.t; }
  function drawPT(opts) {
    opts = opts || {};
    // 족 · 주기 라벨
    GROUPS.forEach((g, i) => T(PT.x0 + i * (PT.cw + PT.gap) + PT.cw / 2, PT.y0 - 10, String(g), 13, MUTED, 'center', 800));
    T(PT.x0 - 28, PT.y0 - 10, '족', 12.5, MUTED, 'center', 800);
    for (let p = 1; p <= 4; p++) T(PT.x0 - 16, PT.y0 + (p - 1) * (PT.ch + PT.gap) + PT.ch / 2 + 5, String(p), 13, MUTED, 'center', 800);
    const wave = S.t - S.tb.t0;
    EL.forEach((e) => {
      const r = cellRect(e), cc = GCOL[e.g];
      const dl = opts.noWave ? 0 : (cc * 0.09 + (e.p - 1) * 0.12);
      const k = opts.noWave ? 1 : clamp((wave - dl) / 0.35, 0, 1);
      if (k <= 0) return;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, sc = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3));
      ctx.save(); ctx.globalAlpha = k; ctx.translate(cx, cy); ctx.scale(sc, sc);
      const noble = e.e == null;
      D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 8);
      if (opts.plain) ctx.fillStyle = noble ? '#e8ebf0' : '#fff'; else ctx.fillStyle = noble ? '#e8ebf0' : enColor(e.e);
      ctx.fill();
      const inSer = opts.series && opts.series.indexOf(e.s) >= 0;
      const sel = opts.sel === e.s;
      if (inSer) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3.2; ctx.stroke(); }
      else if (sel) { ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; ctx.stroke(); }
      else { ctx.strokeStyle = opts.plain ? '#cfd6e2' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (opts.hl && opts.hl.indexOf(e.s) >= 0) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.5; ctx.stroke(); }
      const dk = opts.plain ? true : (noble || darkText(e.e));
      T(0, opts.noVal || opts.plain ? 6 : -2, e.s, PHONE ? 15 : 17, dk ? INK : '#fff', 'center', 900);
      if (!opts.noVal && !opts.plain) T(0, PHONE ? 14 : 16, enTxt(e.s), PHONE ? 11.5 : 12.5, noble ? '#8a95a8' : dk ? '#4a3a7a' : '#efe7ff', 'center', 800);
      ctx.restore();
    });
  }
  function drawInfoCard() {
    const e = E[S.tb.sel], c = TINFO;
    panel(c.x, c.y, c.w, c.h, 14, '#fff', '#e3dcf5');
    if (!PHONE) {
      D.sphere(c.x + 56, c.y + 62, 38, e.e == null ? '#cfd6e2' : enColor(e.e), { shadow: true, outline: 'rgba(60,30,120,.45)', outlineWidth: 2 });
      T(c.x + 56, c.y + 74, e.s, 30, e.e == null || darkText(e.e) ? INK : '#fff', 'center', 900);
      T(c.x + 112, c.y + 50, e.n, 18, INK, 'left', 900);
      T(c.x + 112, c.y + 76, '원자 번호 ' + e.Z, 13.5, MUTED, 'left', 700);
      const lines = [['전기 음성도', e.e == null ? '— (값을 쓰지 않아요)' : enTxt(e.s)], ['최외각 전자 수', e.v + '개'], ['전자껍질 수', e.p + '개'], ['위치', e.g + '족 · ' + e.p + '주기']];
      lines.forEach((l, i) => { T(c.x + 16, c.y + 128 + i * 28, l[0], 14, MUTED, 'left', 700); T(c.x + c.w - 16, c.y + 128 + i * 28, l[1], 14.5, i === 0 ? PURD : INK, 'right', 900); });
    } else {
      D.sphere(c.x + 40, c.y + 40, 28, e.e == null ? '#cfd6e2' : enColor(e.e), { shadow: true, outline: 'rgba(60,30,120,.45)', outlineWidth: 2 });
      T(c.x + 40, c.y + 50, e.s, 22, e.e == null || darkText(e.e) ? INK : '#fff', 'center', 900);
      T(c.x + 84, c.y + 30, e.n + ' · 원자 번호 ' + e.Z, 15, INK, 'left', 900);
      T(c.x + 84, c.y + 52, '전기 음성도 ' + (e.e == null ? '— (값을 쓰지 않아요)' : enTxt(e.s)), 14.5, PURD, 'left', 900);
      T(c.x + 84, c.y + 72, '최외각 전자 ' + e.v + '개 · 전자껍질 ' + e.p + '개', 13, MUTED, 'left', 700);
    }
  }
  function drawGraph() {
    const g = TGR, ser = SERIES[S.tb.ser], els = ser.els;
    panel(g.x, g.y, g.w, g.h, 14, '#fff', '#e3dcf5');
    T(g.x + 14, g.y + 24, '📈 ' + ser.label + ' 전기 음성도 (' + els.join(' → ') + ')', 14.5, PURD, 'left', 900);
    const px0 = g.x + 54, px1 = g.x + g.w - 26, py0 = g.y + 58, py1 = g.y + g.h - 40;
    const yv = (v) => py1 - (v / 4.5) * (py1 - py0);
    ctx.strokeStyle = 'rgba(140,150,175,.28)'; ctx.lineWidth = 1;
    for (let v = 0; v <= 4; v++) { ctx.beginPath(); ctx.moveTo(px0, yv(v)); ctx.lineTo(px1, yv(v)); ctx.stroke(); T(px0 - 8, yv(v) + 4, String(v), 13, MUTED, 'right', 700); }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, py0 - 6); ctx.lineTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();
    const n = els.length, xs = (i) => px0 + 40 + i * ((px1 - px0 - 80) / Math.max(1, n - 1));
    els.forEach((s, i) => T(xs(i), py1 + 20, s, 14, INK, 'center', 900));
    T(px0 - 8, py0 - 10, 'χ', 13, MUTED, 'right', 900);
    const drawn = S.tb.drawn[S.tb.ser], prog = S.tb.prog;
    if (!drawn && prog <= 0) { T((px0 + px1) / 2, (py0 + py1) / 2 + 4, '“그래프 그리기”를 눌러 값을 그려 봐요', 14.5, '#a2abb9', 'center', 800); return; }
    const upto = (drawn && prog >= 1 ? 1 : prog) * (n - 1);
    ctx.strokeStyle = PUR; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const f = clamp(upto - (i - 1), 0, 1); if (i > 0 && f <= 0) break;
      let x = xs(i), y = yv(enOf(els[i]));
      if (i > 0) { const x0 = xs(i - 1), y0 = yv(enOf(els[i - 1])); x = x0 + (x - x0) * f; y = y0 + (y - y0) * f; ctx.lineTo(x, y); } else ctx.moveTo(x, y);
    }
    ctx.stroke();
    els.forEach((s, i) => {
      if (i > upto + 1e-6) return;
      const pop = clamp((upto - i) * 3 + 1, 0, 1), x = xs(i), y = yv(enOf(s));
      D.sphere(x, y, 7 * (0.5 + 0.5 * pop), enColor(E[s].e), { gloss: true, outline: PURD, outlineWidth: 2 });
      ctx.globalAlpha = pop; D.label(x, y - 18, enTxt(s), { size: fs(13), bg: PURD }); ctx.globalAlpha = 1;
    });
    if (prog >= 1 || drawn) {
      const a = enOf(els[0]), b = enOf(els[n - 1]);
      D.label((px0 + px1) / 2 + 20, py0 + 4, ser.note + ' ' + (b > a ? '커져요 ↗' : '작아져요 ↘'), { size: fs(13.5), bg: b > a ? '#0b6b39' : '#b45309' });
    }
  }
  function drawTableScene() {
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    drawPT({ sel: S.tb.sel, series: SERIES[S.tb.ser].els });
    // 색 막대 범례
    const lx = PT.x0, ly = 14;
    if (!PHONE) {
      const lg = ctx.createLinearGradient(lx + 28, 0, lx + 188, 0); lg.addColorStop(0, enColor(EN_MIN)); lg.addColorStop(1, enColor(EN_MAX));
      T(lx, ly + 10, '0.8', 12.5, MUTED, 'left', 700); D.roundRect(lx + 28, ly + 1, 160, 10, 5); ctx.fillStyle = lg; ctx.fill(); T(lx + 196, ly + 10, '4.0', 12.5, MUTED, 'left', 700);
      T(lx + 232, ly + 11, '색이 진할수록 전기 음성도가 커요', 12.5, MUTED, 'left', 700);
    }
    drawInfoCard();
    drawGraph();
  }
  function hitCell(p) {
    for (const e of EL) { const r = cellRect(e); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return e; }
    return null;
  }
  function drawSeriesNow() {
    const k = S.tb.ser;
    if (S.tb.tw) { S.tb.tw.cancel(); S.tb.tw = null; }
    S.tb.prog = 0; S.tb.drawn[k] = false;
    S.tb.tw = tween(S.tb, { prog: 1 }, { duration: RM ? 0.01 : 1.4, ease: 'inOutQuad', onDone: () => { S.tb.drawn[k] = true; S.tb.tw = null; Sound.success(); updateUI(); } });
    Sound.click(); updateUI();
  }
  function setSeries(k) {
    if (S.tb.tw) { S.tb.tw.cancel(); S.tb.tw = null; }
    S.tb.ser = k; S.tb.prog = S.tb.drawn[k] ? 1 : 0; Sound.click(); updateUI();
  }

  /* =========================================================
     ③ 핵과 전자 (같은 주기 / 같은 족)
     ========================================================= */
  const AT = PHONE ? { cx: 240, cy: 212, r0: 36, dr: 30 } : { cx: 262, cy: 282, r0: 44, dr: 42 };
  const AINFO = PHONE ? { x: 16, y: 376, w: VW - 32, h: 120 } : { x: 520, y: 22, w: 262, h: 202 };
  const ABAR = PHONE ? { x: 16, y: 508, w: VW - 32, h: 140 } : { x: 520, y: 236, w: 262, h: 306 };
  const atEl = () => SERIES[S.at.mode === 'p2' ? 'p2' : S.at.mode === 'p3' ? 'p3' : 'g17'].els[S.at.i];
  const atSeries = () => SERIES[S.at.mode === 'p2' ? 'p2' : S.at.mode === 'p3' ? 'p3' : 'g17'];
  const ringR = (k) => AT.r0 + k * AT.dr;
  function setMode(m) {
    S.at.mode = m; S.at.i = 0; S.at.pop = 0; S.at.seen[m] = S.at.seen[m] || {}; S.at.seen[m][0] = true; Sound.click(); syncSlider(); updateUI();
  }
  function setEl(i) {
    const n = atSeries().els.length; i = clamp(i, 0, n - 1);
    if (i !== S.at.i) { S.at.i = i; S.at.pop = 0; Sound.tick(); }
    S.at.seen[S.at.mode] = S.at.seen[S.at.mode] || {}; S.at.seen[S.at.mode][i] = true;
    syncSlider(); updateUI();
  }
  S.at.seen = {};
  function syncSlider() {
    const n = atSeries().els.length, sl = $('#sEl'); sl.max = n - 1; if (+sl.value !== S.at.i) sl.value = S.at.i;
    sl.style.setProperty('--pct', (n > 1 ? S.at.i / (n - 1) * 100 : 0) + '%');
    $('#oEl').textContent = atEl() + ' (' + E[atEl()].n + ')';
    $('#elMinus').disabled = S.at.i <= 0; $('#elPlus').disabled = S.at.i >= n - 1;
  }
  function atStep(dt) {
    const s = atEl(), n = shellsOf(s), A = S.at;
    for (let k = 0; k < 4; k++) {
      const want = k < n ? ringR(k) : (k > 0 ? ringR(Math.min(k, n) - 1) : ringR(0));
      A.rr[k] = approach(A.rr[k] || (k < n ? ringR(Math.max(0, k - 1)) : 0), want, dt, 7);
      A.ra[k] = approach(A.ra[k], k < n ? 1 : 0, dt, 8);
      A.ph[k] += dt * (0.9 / (k + 1)) * (k % 2 ? -1 : 1);
    }
    A.pop = approach(A.pop, 1, dt, 6);
    const ser = atSeries().els, mx = Math.max.apply(null, ser.map(pullRaw));
    A.pullN = approach(A.pullN, pullRaw(s) / mx, dt, 7);
  }
  function drawAtom() {
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    const s = atEl(), e = E[s], A = S.at, cx = AT.cx, cy = AT.cy, cfg = shellCfg(s), n = cfg.length;
    // 껍질
    for (let k = 3; k >= 0; k--) {
      if (A.ra[k] < 0.02) continue;
      ctx.save(); ctx.globalAlpha = A.ra[k] * 0.9;
      ctx.strokeStyle = k === n - 1 ? 'rgba(124,58,237,.65)' : 'rgba(120,135,170,.5)'; ctx.lineWidth = k === n - 1 ? 3 : 2; ctx.setLineDash(k === n - 1 ? [] : [5, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, A.rr[k]), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // 핵
    D.glow(cx, cy, 44, '#e8604c', 0.35);
    D.sphere(cx, cy, 22, '#e8604c', { shadow: true, outline: 'rgba(110,30,20,.6)', outlineWidth: 1.5 });
    T(cx, cy + 5, '+' + e.Z, 14, '#fff', 'center', 900);
    // 전자
    let hi = null;
    cfg.forEach((c, k) => {
      const r = A.rr[k], al = A.ra[k]; if (al < 0.05) return;
      const outer = k === n - 1;
      for (let j = 0; j < c; j++) {
        const a = A.ph[k] + (TAU * j) / c - Math.PI / 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.globalAlpha = al;
        if (outer && j === 0) { hi = [x, y, r, a]; continue; }
        D.sphere(x, y, outer ? 5.8 * (0.4 + 0.6 * A.pop) : 4.6, outer ? GOLD : '#8fa8d8', { gloss: false, outline: outer ? 'rgba(120,70,0,.55)' : 'rgba(40,60,110,.5)', outlineWidth: 1 });
        ctx.globalAlpha = 1;
      }
    });
    ctx.globalAlpha = 1;
    // 핵이 최외각 전자를 당기는 힘 (화살표 길이 · 굵기가 클수록 센 힘)
    if (hi) {
      const [hx, hy, hr, ha] = hi, pn = A.pullN;
      const len = Math.min(hr - 26, 12 + 0.8 * hr * pn), w = 2.5 + 5 * pn;
      D.glow(hx, hy, 18, GOLD, 0.7);
      D.sphere(hx, hy, 7.5, GOLD, { gloss: true, outline: 'rgba(120,70,0,.7)', outlineWidth: 1.5 });
      const ux = -Math.cos(ha), uy = -Math.sin(ha);
      D.arrow(hx + ux * 12, hy + uy * 12, hx + ux * (12 + len), hy + uy * (12 + len), { color: '#7c3aed', width: w, head: 11 + 5 * pn });
    }
    // 라벨
    D.label(cx, (PHONE ? 26 : 34), e.s + ' · ' + e.n + ' (' + e.p + '주기 ' + e.g + '족)', { size: fs(14), bg: PURD });
    T(cx, VH * 0 + (PHONE ? 350 : 538), PHONE ? '노란 점 = 최외각 전자, 보라 화살표 = 핵이 당기는 힘' : '노란 점 = 최외각 전자 · 보라 화살표 = 핵이 최외각 전자를 당기는 힘', 12.5, MUTED, 'center', 700);
    // 정보
    const c = AINFO;
    panel(c.x, c.y, c.w, c.h, 14, '#fff', '#e3dcf5');
    const rows = [['핵전하', '+' + e.Z + ' (양성자 ' + e.Z + '개)'], ['전자껍질 수', e.p + '개'], ['최외각 전자 수', e.v + '개'], ['전기 음성도 χ', enTxt(s)]];
    const rh = PHONE ? 26 : 38;
    T(c.x + 14, c.y + 24, '⚛️ ' + s + '의 모습', 14.5, PURD, 'left', 900);
    rows.forEach((r, i) => { const yy = c.y + (PHONE ? 48 : 62) + i * rh; T(c.x + 14, yy, r[0], 13.5, MUTED, 'left', 700); T(c.x + c.w - 14, yy, r[1], 15, i === 3 ? PURD : INK, 'right', 900); });
    // 비교 막대
    const b = ABAR;
    panel(b.x, b.y, b.w, b.h, 14, '#fff', '#e3dcf5');
    T(b.x + 14, b.y + 24, '📊 ' + atSeries().label + ' 비교', 14.5, PURD, 'left', 900);
    const ser = atSeries().els, mx = Math.max.apply(null, ser.map(pullRaw)), nb = ser.length;
    const bw = (b.w - 28) / nb, by1 = b.y + b.h - (PHONE ? 30 : 38), bh = b.h - (PHONE ? 78 : 104);
    ser.forEach((q, i) => {
      const x = b.x + 14 + i * bw, h = bh * pullRaw(q) / mx, cur = q === s;
      D.roundRect(x + bw * 0.16, by1 - h, bw * 0.68, Math.max(3, h), 5); ctx.fillStyle = cur ? '#7c3aed' : '#cdbdf5'; ctx.fill();
      T(x + bw / 2, by1 + 17, q, 13.5, cur ? PURD : MUTED, 'center', cur ? 900 : 700);
      T(x + bw / 2, by1 - h - 6, enTxt(q), 12.5, cur ? PURD : MUTED, 'center', cur ? 900 : 700);
    });
    T(b.x + 14, b.y + b.h - 8, '막대: 당기는 힘(모형) · 숫자: 전기 음성도', 12.5, '#8a95a8', 'left', 700);
  }

  /* =========================================================
     ④ 순서 맞히기
     ========================================================= */
  const arrQ = [
    { els: ['O', 'C', 'N', 'F'], why: '같은 2주기에서는 원자 번호가 클수록 전기 음성도가 커요: C < N < O < F' },
    { els: ['Mg', 'Na', 'Cl', 'Al'], why: '같은 3주기에서는 오른쪽으로 갈수록 전기 음성도가 커요: Na < Mg < Al < Cl' },
  ];
  arrQ.forEach((q) => { q.ans = q.els.slice().sort((a, b) => E[a].e - E[b].e); });
  const cmpQ = [
    { a: 'Cl', b: 'Br', why: '같은 17족에서는 위쪽일수록 전기 음성도가 커요 (전자껍질 수가 적어요).' },
    { a: 'P', b: 'S', why: '같은 3주기에서는 오른쪽일수록 전기 음성도가 커요 (핵전하가 커요).' },
    { a: 'Mg', b: 'Ca', why: '같은 2족에서는 위쪽일수록 전기 음성도가 커요 (전자껍질 수가 적어요).' },
  ];
  cmpQ.forEach((q) => { q.ans = E[q.a].e > E[q.b].e ? q.a : q.b; });
  const OD = PHONE
    ? { sx: 18, sw: 100, sh: 84, sy: 70, sg: 10, tx: 18, ty: 214, cw: 100, ch: 78, ptx: 22, pty: 372, mtc: 50, mtr: 36 }
    : { sx: 110, sw: 134, sh: 104, sy: 62, sg: 20, tx: 110, ty: 204, cw: 134, ch: 82, ptx: 150, pty: 366, mtc: 54, mtr: 38 };
  const slotPos = (i) => ({ x: OD.sx + i * (OD.sw + OD.sg), y: OD.sy });
  const trayPos = (i) => ({ x: OD.tx + i * (OD.sw + OD.sg), y: OD.ty });
  function buildCards() {
    const q = arrQ[S.od.qi];
    S.od.cards = q.els.map((s, i) => { const p = trayPos(i); return { s, x: p.x, y: p.y, slot: null, drag: false, lift: 0, home: i, sx: 0, sy: 0, moved: 0 }; });
    S.od.msg = ''; S.od.advance = null;
  }
  function cardTarget(c) { if (c.slot != null) return slotPos(c.slot); return trayPos(c.home); }
  function cardAt(p) {
    const cs = S.od.cards;
    for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (p.x >= c.x && p.x <= c.x + OD.cw && p.y >= c.y && p.y <= c.y + OD.ch) return c; }
    return null;
  }
  function slotAt(p) {
    for (let i = 0; i < 4; i++) { const s = slotPos(i); if (p.x >= s.x - 8 && p.x <= s.x + OD.sw + 8 && p.y >= s.y - 8 && p.y <= s.y + OD.sh + 8) return i; }
    return -1;
  }
  function placeCard(c, slot) {
    const cs = S.od.cards, prevSlot = c.slot;
    if (slot < 0) { c.slot = null; Sound.tick(); return; }
    const occ = cs.find((o) => o !== c && o.slot === slot);
    if (occ) occ.slot = prevSlot;      // 서로 자리를 바꿔요 (트레이에서 왔다면 트레이로)
    c.slot = slot; Sound.tick();
    checkArrange();
  }
  function checkArrange() {
    const cs = S.od.cards;
    if (cs.some((c) => c.slot == null)) { S.od.msg = ''; return; }
    const seq = []; cs.forEach((c) => { seq[c.slot] = c.s; });
    const q = arrQ[S.od.qi];
    if (seq.every((s, i) => s === q.ans[i])) {
      if (!S.od.done[S.od.qi]) {
        S.od.done[S.od.qi] = true; Sound.success(); S.od.msg = '정답! ' + q.why;
        fx.burst(VW / 2, OD.sy + 40, { count: 22, colors: ['#ffd34d', '#8b5cf6', '#14a058', '#ffffff'], speed: 190, size: 3.8, gravity: 120 });
        S.od.advance = S.t + 2.4;
      }
    } else { S.od.msg = '순서가 달라요. 주기율표에서 위치를 보고 규칙으로 다시 생각해 봐요.'; S.od.shake = S.t; Sound.fail(); }
    updateUI();
  }
  function clearCards() { S.od.cards.forEach((c) => { c.slot = null; }); S.od.msg = ''; updateUI(); }
  function odStep(dt) {
    const o = S.od;
    o.cards.forEach((c) => {
      c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 14);
      if (!c.drag) { const t = cardTarget(c); c.x = approach(c.x, t.x, dt, 12); c.y = approach(c.y, t.y, dt, 12); }
    });
    if (o.advance != null && S.t >= o.advance) {
      o.advance = null;
      if (o.qi < arrQ.length - 1) { o.qi++; buildCards(); updateUI(); }
      else if (!(game && game.phase === 'active' && game.index >= 0 && false)) { /* 마지막 문제 완료 후에는 그대로 보여요 */ }
    }
    if (o.cadv != null && S.t >= o.cadv) {
      o.cadv = null;
      if (o.ci < cmpQ.length - 1) { o.ci++; o.cmpMsg = ''; updateUI(); }
    }
  }
  function drawCard(c, label) {
    const w = OD.cw, h = OD.ch, e = E[c.s];
    ctx.save();
    const sc = 1 + 0.07 * c.lift, shx = (S.t - S.od.shake < 0.4) ? Math.sin((S.t - S.od.shake) * 50) * 4 * (1 - (S.t - S.od.shake) / 0.4) : 0;
    ctx.translate(c.x + w / 2 + shx, c.y + h / 2); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(40,20,90,' + (0.2 + 0.18 * c.lift) + ')'; ctx.shadowBlur = 8 + 12 * c.lift; ctx.shadowOffsetY = 3 + 6 * c.lift;
    D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = c.slot != null ? '#8b5cf6' : '#cdbdf5'; ctx.lineWidth = 2.5; ctx.stroke();
    D.sphere(-w / 2 + 28, 0, 20, '#efe9fb', { gloss: true, outline: '#cdbdf5', outlineWidth: 1.5 });
    T(-w / 2 + 28, 8, e.s, 21, INK, 'center', 900);
    T(-w / 2 + 56, -4, e.n, 14, INK, 'left', 900); T(-w / 2 + 56, 16, e.p + '주기 ' + e.g + '족', 12.5, MUTED, 'left', 700);
    ctx.restore();
  }
  function drawOrderScene() {
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    const o = S.od;
    if (o.part === 'arrange') {
      const q = arrQ[o.qi];
      T(VW / 2, PHONE ? 26 : 30, '문제 ' + (o.qi + 1) + ' / ' + arrQ.length + ' · 전기 음성도가 작은 것 → 큰 것', 14.5, PURD, 'center', 900);
      D.arrow(OD.sx, OD.sy - 14, OD.sx + 4 * (OD.sw + OD.sg) - OD.sg, OD.sy - 14, { color: '#cdbdf5', width: 4, head: 12 });
      T(OD.sx + 2, OD.sy - 22, '작음', 12.5, MUTED, 'left', 800); T(OD.sx + 4 * (OD.sw + OD.sg) - OD.sg, OD.sy - 22, '큼', 12.5, MUTED, 'right', 800);
      for (let i = 0; i < 4; i++) {
        const s = slotPos(i);
        D.roundRect(s.x, s.y, OD.sw, OD.sh, 14); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
        ctx.setLineDash([7, 6]); ctx.strokeStyle = '#b4a3e8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        T(s.x + OD.sw / 2, s.y + OD.sh / 2 + 7, String(i + 1), 28, 'rgba(124,58,237,.22)', 'center', 900);
        if (!o.cards.some((c) => c.slot === i)) {
          const pulse = o.cards.some((c) => c.drag);
          if (pulse) D.ring(s.x + OD.sw / 2, s.y + OD.sh / 2, 26, S.t + i * 0.2, { color: '#8b5cf6', width: 2 });
        }
      }
      T(OD.tx, OD.ty - 10, '카드를 끌어 놓거나 눌러서 놓아요', 12.5, MUTED, 'left', 700);
      o.cards.filter((c) => !c.drag).forEach((c) => drawCard(c)); o.cards.filter((c) => c.drag).forEach((c) => drawCard(c));
      if (o.msg) {
        const ok = o.done[o.qi];
        const yy = OD.ty + OD.ch + 10;
        panel(PHONE ? 16 : 100, yy, VW - (PHONE ? 32 : 200), PHONE ? 50 : 40, 12, ok ? '#e6f7ee' : '#fdecea', ok ? '#9bdcb8' : '#f0b7b1');
        textBlock(VW / 2, yy + (PHONE ? 20 : 24), VW - (PHONE ? 52 : 232), o.msg, 12.5, INK, 17, 800, 'center');
      }
      drawMiniPT(q.els);
    } else {
      const q = cmpQ[o.ci];
      T(VW / 2, PHONE ? 26 : 30, '문제 ' + (o.ci + 1) + ' / ' + cmpQ.length + ' · 주기율표 위치로 비교해요', 14.5, PURD, 'center', 900);
      const cw = PHONE ? 150 : 190, ch = PHONE ? 110 : 120, gx = VW / 2, y0 = PHONE ? 54 : 56;
      [[q.a, gx - cw - 24], [q.b, gx + 24]].forEach(([s, x], i) => {
        const e = E[s], answered = o.cdone[o.ci], win = answered && s === q.ans;
        panel(x, y0, cw, ch, 16, win ? '#e6f7ee' : '#fff', win ? '#9bdcb8' : '#cdbdf5');
        D.sphere(x + cw / 2, y0 + 44, 28, '#efe9fb', { gloss: true, outline: '#cdbdf5', outlineWidth: 1.5 });
        T(x + cw / 2, y0 + 54, s, 26, INK, 'center', 900);
        T(x + cw / 2, y0 + 92, e.n + ' · ' + e.p + '주기 ' + e.g + '족', 13, MUTED, 'center', 800);
        if (answered) T(x + cw / 2, y0 + ch + 20, 'χ = ' + enTxt(s), 15, win ? '#0b6b39' : MUTED, 'center', 900);
        if (win) D.check(x + cw - 16, y0 + 16, 10, 1);
      });
      T(gx, y0 + ch / 2 + 6, 'VS', 20, PUR, 'center', 900);
      if (S.t - o.cmpShake < 0.4) { /* 틀리면 흔들림은 아래 안내로 */ }
      if (o.cmpMsg) {
        const yy = y0 + ch + 34, ok = o.cdone[o.ci];
        panel(PHONE ? 16 : 100, yy, VW - (PHONE ? 32 : 200), PHONE ? 54 : 44, 12, ok ? '#e6f7ee' : '#fdecea', ok ? '#9bdcb8' : '#f0b7b1');
        textBlock(VW / 2, yy + (PHONE ? 22 : 26), VW - (PHONE ? 52 : 232), o.cmpMsg, 12.5, INK, 17, 800, 'center');
      }
      drawMiniPT([q.a, q.b], true);
    }
  }
  function drawMiniPT(hl, showLink) {
    // 위치만 보이는 작은 주기율표 (전기 음성도 값은 숨겨요)
    const sv = { x0: PT.x0, y0: PT.y0, cw: PT.cw, ch: PT.ch, gap: PT.gap };
    PT.x0 = OD.ptx; PT.y0 = OD.pty; PT.cw = OD.mtc; PT.ch = OD.mtr; PT.gap = 3;
    drawPT({ plain: true, noWave: true, hl, noVal: true });
    if (showLink) {
      const a = cellRect(E[hl[0]]), b = cellRect(E[hl[1]]);
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a.x + a.w / 2, a.y + a.h / 2); ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2); ctx.stroke(); ctx.restore();
    }
    T(PT.x0 + 4 * (PT.cw + PT.gap), PT.y0 + 4 * (PT.ch + PT.gap) + 20, '주기율표 위치 (빨간 테두리가 문제의 원소)', 12.5, MUTED, 'center', 700);
    Object.assign(PT, sv);
  }
  function answerCmp(s) {
    const o = S.od, q = cmpQ[o.ci];
    if (o.cdone[o.ci] || o.cadv != null) return;
    if (s === q.ans) { o.cdone[o.ci] = true; o.cmpMsg = '정답! ' + q.why; Sound.success(); o.cadv = S.t + 2.6; fx.burst(VW / 2, 90, { count: 16, colors: ['#ffd34d', '#8b5cf6', '#14a058'], speed: 160, size: 3.5, gravity: 120 }); }
    else { o.cmpMsg = '아니에요. 두 원소의 위치(같은 주기인지, 같은 족인지)를 비교해 봐요.'; o.cmpShake = S.t; Sound.fail(); }
    updateUI();
  }

  /* ---------- 장면 · UI ---------- */
  const SCENE_LABEL = { tug: '🪢 전자 줄다리기', table: '🔥 전기 음성도 주기율표', atom: '⚛️ 핵이 당기는 힘', order: '🎯 순서 맞히기' };
  function setScene(sc) {
    if (S.scene !== sc) { S.fade = 1; fx.clear(); hintOff(); if (sc === 'table') enterTable(); }
    S.scene = sc; $('#tbLabel').textContent = SCENE_LABEL[sc]; updateUI();
  }
  const setHidden = (id, hide) => { const e = $(id); if (e) e.hidden = !!hide; };
  function updateUI() {
    const sc = S.scene, g = S.gate;
    setHidden('#cs-tug', sc !== 'tug');
    setHidden('#cs-table', sc !== 'table');
    setHidden('#cs-atom', sc !== 'atom');
    $('#cs-atom').classList.toggle('compact', g === 'rule');
    setHidden('#cs-rule', !(sc === 'atom' && g === 'rule'));
    setHidden('#cs-arr', !(sc === 'order' && S.od.part === 'arrange'));
    setHidden('#cs-cmp', !(sc === 'order' && S.od.part === 'compare'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    // 줄다리기
    $$('#matchBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.id === S.tug.cur); b.classList.toggle('done', !!S.tug.done[b.dataset.id]); });
    const m = mt(), pr = S.tug.pred[m.id];
    $$('#predBtns .opt').forEach((b, i) => { const k = ['L', 'M', 'R'][i]; b.textContent = predLabel(m, k); b.classList.toggle('on', pr === k); b.disabled = !!S.tug.pending || !!S.tug.done[m.id]; });
    $('#goBtn').disabled = !pr || !!S.tug.pending || !!S.tug.done[m.id];
    $('#goBtn').textContent = S.tug.done[m.id] ? '✅ 맞힌 경기예요' : S.tug.pending ? '줄다리기 중…' : '▶ 줄다리기 시작!';
    // 주기율표
    $$('#serBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.k === S.tb.ser); b.classList.toggle('done', !!S.tb.drawn[b.dataset.k]); });
    // 핵
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.at.mode));
    syncSlider();
    // 비교
    const q = cmpQ[S.od.ci]; const cb = $$('#cmpBtns .opt');
    if (cb.length === 2) { cb[0].textContent = q.a + ' (' + E[q.a].n + ')'; cb[1].textContent = q.b + ' (' + E[q.b].n + ')'; cb[0].dataset.s = q.a; cb[1].dataset.s = q.b; cb.forEach((b) => { b.disabled = !!S.od.cdone[S.od.ci]; }); }
    const note = $('#ctlNote'); let nt = '';
    if (sc === 'tug') nt = '경기를 고르고 전자쌍이 어느 쪽으로 쏠릴지 예측한 뒤, 줄다리기를 시작해요.';
    if (sc === 'table') nt = '원소 칸을 눌러 값을 보고, 줄을 골라 그래프를 그려 봐요. 18족(He, Ne, Ar)은 결합을 거의 하지 않아 값을 쓰지 않아요.';
    if (sc === 'atom' && g !== 'rule') nt = '원소를 바꿔 가며 핵이 최외각 전자(노란 점)를 당기는 힘의 변화를 관찰해요.';
    if (sc === 'order' && S.od.part === 'arrange') nt = '카드를 끌어 칸에 놓거나, 눌러서 차례대로 놓아요. 칸에 놓인 카드를 누르면 빠져요.';
    note.textContent = nt; note.hidden = !nt;
  }

  /* ---------- 폼 도우미 ---------- */
  function makeSelects(box, defs) {
    box.innerHTML = '';
    return defs.map((d) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const q = document.createElement('div'); q.className = 'q'; q.innerHTML = d.q; row.appendChild(q);
      const s = document.createElement('select'); s.className = 'sel-in'; s.setAttribute('aria-label', d.q.replace(/<[^>]+>/g, ''));
      s.appendChild(new Option('— 고르기 —', ''));
      d.opts.forEach((tx, k) => s.appendChild(new Option(tx, String(k + 1))));
      s.addEventListener('change', () => { Sound.tick(); s.classList.remove('ok', 'bad'); d.ok = null; });
      row.appendChild(s); box.appendChild(row); return s;
    });
  }
  function checkSelects(defs, sels, msg) {
    if (sels.some((s) => !s.value)) return '아직 고르지 않은 칸이 ' + sels.filter((s) => !s.value).length + '개 있어요.';
    let bad = 0;
    defs.forEach((d, i) => {
      const ok = +sels[i].value - 1 === d.ans;
      if (!ok) bad++;
      if (!ok && d.ok !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
      if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
      d.ok = ok;
    });
    return bad ? msg : true;
  }
  function resetSelects(sels, defs) { sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); defs.forEach((d) => { d.ok = null; }); }
  const RULE_DEFS = [
    { q: '① 같은 주기, 원자 번호가 클수록 전기 음성도', opts: ['커져요', '작아져요', '변함없어요'], ans: 0 },
    { q: '② 그 까닭: 핵전하(양성자 수)가', opts: ['커져서 더 세게 당겨요', '작아져서 덜 당겨요', '변하지 않아요'], ans: 0 },
    { q: '③ 같은 족, 아래로 갈수록 전기 음성도', opts: ['커져요', '작아져요', '변함없어요'], ans: 1 },
    { q: '④ 가장 큰 원소 F는 주기율표(18족 제외)의', opts: ['왼쪽 아래', '오른쪽 위', '왼쪽 위', '오른쪽 아래'], ans: 1 },
  ];
  const ruleSel = makeSelects($('#ruleSel'), RULE_DEFS);

  // 버튼 만들기
  (function build() {
    const mb = $('#matchBtns'); mb.innerHTML = '';
    TUGS.forEach((m) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.id = m.id; b.textContent = m.a + ' – ' + m.b; b.addEventListener('click', () => selectMatch(m.id)); mb.appendChild(b); });
    const pb = $('#predBtns'); pb.innerHTML = '';
    ['L', 'M', 'R'].forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.addEventListener('click', () => { if (S.tug.pending || S.tug.done[S.tug.cur]) return; S.tug.pred[S.tug.cur] = k; Sound.click(); updateUI(); }); pb.appendChild(b); });
    const sb = $('#serBtns'); sb.innerHTML = '';
    Object.keys(SERIES).forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = k; b.textContent = SERIES[k].label + ' (' + SERIES[k].els[0] + '→' + SERIES[k].els[SERIES[k].els.length - 1] + ')'; b.addEventListener('click', () => setSeries(k)); sb.appendChild(b); });
    const cb = $('#cmpBtns'); cb.innerHTML = '';
    for (let i = 0; i < 2; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt big'; b.addEventListener('click', () => answerCmp(b.dataset.s)); cb.appendChild(b); }
  })();
  $('#goBtn').addEventListener('click', startMatch);
  $('#drawBtn').addEventListener('click', drawSeriesNow);
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.v)));
  $('#sEl').addEventListener('input', (e) => setEl(+e.target.value));
  $('#elMinus').addEventListener('click', () => setEl(S.at.i - 1));
  $('#elPlus').addEventListener('click', () => setEl(S.at.i + 1));
  $('#clearBtn').addEventListener('click', () => { Sound.click(); clearCards(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'tug') { S.tug.pending = null; S.tug.revealHold = false; if (!S.tug.done[S.tug.cur]) { S.tug.sp.target = 0.5; S.tug.msg = ''; S.tug.pred[S.tug.cur] = null; } }
    else if (S.scene === 'table') { if (S.tb.tw) { S.tb.tw.cancel(); S.tb.tw = null; } S.tb.prog = 0; S.tb.drawn[S.tb.ser] = false; enterTable(); }
    else if (S.scene === 'atom') { S.at.i = 0; S.at.pop = 0; syncSlider(); }
    else { S.od.part === 'arrange' ? clearCards() : (S.od.cmpMsg = ''); }
    updateUI();
  });

  // 포인터: 주기율표 칸 선택, 순서 카드 끌기
  let dragInfo = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'table') { const e = hitCell(p); if (e) { S.tb.sel = e.s; Sound.tick(); updateUI(); return true; } return false; }
      if (S.scene === 'order' && S.od.part === 'arrange' && !S.od.done[S.od.qi]) {
        const c = cardAt(p); if (!c) return false;
        c.drag = true; dragInfo = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: 0 };
        S.od.cards.splice(S.od.cards.indexOf(c), 1); S.od.cards.push(c);
        return true;
      }
      return false;
    },
    move(p) { if (dragInfo) { const c = dragInfo.c; c.x = clamp(p.x - dragInfo.ox, 0, VW - OD.cw); c.y = clamp(p.y - dragInfo.oy, 0, VH - OD.ch); dragInfo.moved = Math.max(dragInfo.moved, Math.hypot(p.x - dragInfo.sx, p.y - dragInfo.sy)); } },
    up(p) {
      if (!dragInfo) return;
      const c = dragInfo.c, moved = dragInfo.moved; dragInfo = null; c.drag = false;
      if (moved < 8) {                     // 눌렀다 뗐어요: 놓기 / 빼기
        if (c.slot != null) { c.slot = null; Sound.tick(); S.od.msg = ''; }
        else { const used = S.od.cards.map((o) => o.slot); const free = [0, 1, 2, 3].find((i) => used.indexOf(i) < 0); if (free != null) placeCard(c, free); }
      } else { placeCard(c, slotAt(p)); }
    },
    hover(p) { if (S.scene === 'table') return hitCell(p) ? 'pointer' : 'default'; if (S.scene === 'order' && S.od.part === 'arrange') return cardAt(p) ? 'grab' : 'default'; return 'default'; },
  });

  /* ---------- 읽기 값 ---------- */
  function readouts() {
    if (S.scene === 'tug') {
      const m = mt(), rv = S.tug.reveal > 0.6;
      setRO(1, '경기', m.a + ' – ' + m.b); setRO(2, '전기 음성도', rv ? m.a + ' ' + enTxt(m.a) + ' : ' + m.b + ' ' + enTxt(m.b) : '? (경기 뒤에 공개)');
      setRO(3, '전자쌍', rv ? resultShort(m) : '예측해 보세요'); return;
    }
    if (S.scene === 'table') {
      const e = E[S.tb.sel], ser = SERIES[S.tb.ser];
      setRO(1, '선택한 원소', e.s + ' (' + e.n + ')'); setRO(2, '전기 음성도', e.e == null ? '— (값을 쓰지 않아요)' : enTxt(e.s));
      setRO(3, '그래프', S.tb.drawn[S.tb.ser] ? ser.label + ' 그림' : ser.label + ' (안 그림)'); return;
    }
    if (S.scene === 'atom') {
      const s = atEl(), e = E[s];
      setRO(1, '원소', s + ' (' + e.n + ')'); setRO(2, '핵전하 · 전자껍질', '+' + e.Z + ' · ' + e.p + '개'); setRO(3, '전기 음성도', enTxt(s)); return;
    }
    if (S.od.part === 'arrange') { setRO(1, '문제', (S.od.qi + 1) + ' / ' + arrQ.length); setRO(2, '놓은 카드', S.od.cards.filter((c) => c.slot != null).length + ' / 4'); setRO(3, '맞힌 문제', Object.keys(S.od.done).length + ' / ' + arrQ.length); }
    else { setRO(1, '문제', (S.od.ci + 1) + ' / ' + cmpQ.length); setRO(2, '비교할 원소', cmpQ[S.od.ci].a + ' vs ' + cmpQ[S.od.ci].b); setRO(3, '맞힌 문제', Object.keys(S.od.cdone).length + ' / ' + cmpQ.length); }
  }

  /* =========================================================
     미션
     ========================================================= */
  const seen = (m, i) => !!(S.at.seen[m] && S.at.seen[m][i]);
  const seenAll = (m) => SERIES[m === 'p2' ? 'p2' : m === 'p3' ? 'p3' : 'g17'].els.every((x, i) => seen(m, i));
  const levels = [
    {
      title: '전자 줄다리기', short: '전자 줄다리기', icon: '🪢', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 두 원자가 전자쌍을 나누어 가질 때, 누가 더 세게 끌어당길까? 그 힘에도 주기성이 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 공유 결합은 두 원자가 전자쌍을 <b>공유</b>하는 결합이라고 배웠어요. 그런데 그 전자쌍은 정말 정확히 가운데에 있을까요? 원자마다 전자쌍을 끌어당기는 힘이 달라요.</div>' +
        '<p>공유 전자쌍을 사이에 둔 <b>줄다리기</b>로 알아봐요. H–H, H–F, Na–Cl 세 경기에서 전자쌍이 <b>어느 쪽으로 쏠릴지 예측</b>하고 결과를 확인해요. 결합에서 원자가 공유 전자쌍을 끌어당기는 상대적인 세기를 <b>전기 음성도</b>라고 해요.</p>',
      features: ['tug'],
      setup() { S.gate = ''; S.tug.cur = 'HH'; S.tug.pred = {}; S.tug.done = {}; S.tug.shown = {}; S.tug.pending = null; S.tug.revealHold = false; S.tug.msg = ''; S.tug.sp.value = 0.5; S.tug.sp.target = 0.5; S.tug.sp.velocity = 0; S.tug.reveal = 0; setScene('tug'); updateUI(); },
      recap: '공유 결합에서 전자쌍은 전기 음성도가 큰 원자 쪽으로 치우쳐요. 전기 음성도가 같으면 가운데에 있고, 차이가 클수록 더 많이 쏠려요.',
      summary: '<ul><li><b>전기 음성도</b>: 공유 결합에서 원자가 공유 전자쌍을 끌어당기는 상대적인 세기 (단위 없는 값)</li><li>H–H: 같은 원자라 전자쌍이 <b>가운데</b>. H(2.1)–F(4.0): <b>F 쪽</b>으로 쏠림. Na(0.9)–Cl(3.0): 거의 완전히 <b>Cl 쪽</b>.</li><li>전기 음성도가 <b>큰 원자</b> 쪽으로 공유 전자쌍이 치우쳐요.</li></ul>',
      missions: [
        {
          title: '줄다리기 3경기 예측하기',
          goal: '세 경기(<b>H–H · H–F · Na–Cl</b>)의 결과를 <b>예측</b>하고 줄다리기를 해서 맞혀 보세요.',
          hint: '원자 아래의 최외각 전자 수를 봐요. F는 7개라서 옥텟이 되려면 1개가 더 필요하고, H와 F가 만나면 누가 더 세게 끌어당길까요?',
          setup() { S.gate = ''; setScene('tug'); updateUI(); },
          check: () => TUGS.every((m) => S.tug.done[m.id]),
          hold: 0.5,
          status: () => TUGS.map((m) => mark(S.tug.done[m.id]) + ' ' + m.a + '–' + m.b).join(' &nbsp; '),
          explain: 'H–H는 같은 원자라 전자쌍이 <b>가운데</b>에 있었고, H–F는 <b>F 쪽</b>, Na–Cl은 거의 완전히 <b>Cl 쪽</b>으로 치우쳤어요. 전기 음성도가 큰 원자가 전자쌍을 더 세게 끌어당겨요.',
        },
        {
          type: 'quiz', title: '전자쌍이 치우치는 쪽',
          goal: '두 원자가 공유 전자쌍을 사이에 두고 줄다리기를 할 때, 전자쌍은 어느 쪽으로 치우칠까요?',
          setup() { S.gate = ''; setScene('tug'); updateUI(); },
          choices: ['전기 음성도가 작은 원자 쪽', '전기 음성도가 큰 원자 쪽', '원자 번호가 작은 원자 쪽', '항상 정확히 가운데'],
          answer: 1,
          feedback: ['전기 음성도는 전자쌍을 끌어당기는 세기예요. 작은 쪽이 더 세게 당길까요?', '', '원자 번호가 작다고 전자쌍을 더 세게 당기는 것은 아니에요. H(1번)–F(9번)에서 어느 쪽으로 쏠렸나요?', '같은 원자끼리(H–H)일 때만 가운데에 있어요. H–F에서는 쏠렸어요.'],
          explain: '공유 전자쌍은 전기 음성도가 <b>큰</b> 원자 쪽으로 치우쳐요. 두 원자의 전기 음성도가 같으면 가운데에 머물러요.',
        },
      ],
    },
    {
      title: '주기율표에서 규칙 찾기', short: '주기성 탐색', icon: '🔥', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기 음성도가 큰 쪽으로 전자쌍이 쏠리는 것을 봤어요. 그럼 원소마다 전기 음성도는 얼마일까요? 주기율표에 색으로 나타내 봐요.</div>' +
        '<p>1~3주기 원소와 K, Ca, Br의 전기 음성도를 <b>색으로 나타낸 주기율표</b>예요. 색이 진할수록 값이 커요. 원소 칸을 눌러 값을 보고, <b>같은 주기</b>(가로)와 <b>같은 족</b>(세로)에서 값이 어떻게 변하는지 그래프로 그려 봐요. 18족(He, Ne, Ar)은 결합을 거의 하지 않아 값을 쓰지 않아요.</p>',
      features: ['table'],
      setup() { S.gate = ''; S.tb.drawn = {}; S.tb.prog = 0; S.tb.ser = 'p2'; S.tb.sel = 'F'; setScene('table'); enterTable(); updateUI(); },
      recap: '전기 음성도는 같은 주기에서 오른쪽으로 갈수록 커지고, 같은 족에서 아래로 갈수록 작아져요. 가장 큰 원소는 F(4.0)예요.',
      summary: '<table class="mini"><tr><th>구분</th><th>값</th><th>경향</th></tr><tr><td>2주기</td><td>Li 1.0 … F 4.0</td><td>증가</td></tr><tr><td>3주기</td><td>Na 0.9 … Cl 3.0</td><td>증가</td></tr><tr><td>17족</td><td>F 4.0 > Cl 3.0 > Br 2.8</td><td>감소</td></tr><tr><td>1족</td><td>Li 1.0 > Na 0.9 > K 0.8</td><td>감소</td></tr></table><ul><li>전기 음성도가 가장 큰 원소는 <b>F(4.0)</b>이고, 금속 원소는 대체로 작아요.</li><li>18족(He, Ne, Ar)은 결합을 거의 하지 않아 값을 쓰지 않아요.</li></ul>',
      missions: [
        {
          title: '2주기와 3주기 그래프 그리기',
          goal: '<b>2주기</b>와 <b>3주기</b>를 각각 골라 <b>📈 그래프 그리기</b>를 눌러 값의 변화를 확인하세요.',
          hint: '줄 버튼(2주기, 3주기)을 고른 뒤 그래프 그리기를 눌러요. 주기율표에서 주황색 테두리가 그 줄이에요.',
          setup() { S.gate = ''; setScene('table'); updateUI(); },
          check: () => S.tb.drawn.p2 && S.tb.drawn.p3,
          hold: 0.4,
          status: () => mark(S.tb.drawn.p2) + ' 2주기 (Li → F) &nbsp; ' + mark(S.tb.drawn.p3) + ' 3주기 (Na → Cl)',
          explain: '2주기는 Li 1.0에서 F 4.0까지, 3주기는 Na 0.9에서 Cl 3.0까지 <b>오른쪽으로 갈수록 커졌어요</b>.',
        },
        {
          title: '17족 그래프 그리기',
          goal: '<b>17족</b>(F, Cl, Br)의 그래프를 그려 세로 방향의 변화를 확인하세요.',
          hint: '17족 버튼을 고르고 그래프 그리기를 눌러요. 위에서 아래로 값이 어떻게 변하는지 봐요.',
          setup() { S.gate = ''; setScene('table'); updateUI(); },
          check: () => !!S.tb.drawn.g17,
          hold: 0.4,
          status: () => mark(S.tb.drawn.g17) + ' 17족 (F → Cl → Br)',
          explain: '17족에서는 F 4.0 > Cl 3.0 > Br 2.8로 <b>아래로 갈수록 작아졌어요</b>. 1족도 Li 1.0 > Na 0.9 > K 0.8로 같은 경향이에요.',
        },
        {
          type: 'quiz', title: '전기 음성도가 가장 큰 원소',
          goal: '주기율표에서 전기 음성도가 <b>가장 큰</b> 원소는?',
          setup() { S.gate = ''; setScene('table'); updateUI(); },
          choices: ['Cl', 'O', 'F', 'Na'],
          answer: 2,
          feedback: ['Cl(3.0)도 크지만 더 큰 원소가 있어요. 색이 가장 진한 칸을 찾아봐요.', 'O(3.5)도 큰 편이지만 더 큰 원소가 있어요.', '', 'Na는 0.9로 작은 편이에요. 금속 원소는 대체로 작아요.'],
          explain: '<b>F(4.0)</b>가 가장 커요. 주기율표에서 18족을 제외하면 오른쪽 위로 갈수록 전기 음성도가 커져요.',
        },
      ],
    },
    {
      title: '경향의 까닭: 핵전하와 껍질 수', short: '경향과 까닭', icon: '⚛️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 주기에서는 커지고 같은 족에서는 작아지는 경향을 찾았어요. 왜 그럴까요? 원자 모형에서 <b>핵이 최외각 전자를 당기는 힘</b>을 비교해 봐요.</div>' +
        '<p>핵의 양성자 수(핵전하)가 많을수록 핵이 전자를 더 세게 당기고, 전자껍질이 늘어 최외각 전자가 핵에서 멀어질수록 그 힘은 약해져요. 원소를 바꿔 가며 보라색 화살표(당기는 힘)의 변화를 관찰해요.</p>',
      features: ['atom'],
      setup() { S.gate = ''; S.at.seen = {}; setMode('p2'); setScene('atom'); resetSelects(ruleSel, RULE_DEFS); updateUI(); },
      recap: '같은 주기에서는 전자껍질 수가 같고 핵전하가 커져서 전기 음성도가 커지고, 같은 족에서는 전자껍질 수가 늘어 최외각 전자가 핵에서 멀어져 전기 음성도가 작아져요.',
      summary: '<ul><li><b>같은 주기</b>: 전자껍질 수는 같고 <b>핵전하(양성자 수)가 증가</b> → 최외각 전자를 더 세게 당김 → 전기 음성도 증가</li><li><b>같은 족</b>: <b>전자껍질 수가 증가</b> → 최외각 전자가 핵에서 멀어짐 → 당기는 힘 감소 → 전기 음성도 감소</li><li>그래서 18족을 뺀 주기율표의 <b>오른쪽 위</b>(F)로 갈수록 전기 음성도가 커요.</li><li><b>18족</b>은 결합을 거의 하지 않아 전기 음성도 값을 쓰지 않아요.</li></ul>',
      missions: [
        {
          title: '규칙 문장 완성하기', manual: true,
          goal: '핵과 전자 모형을 관찰하고 규칙 문장의 빈칸 <b>네 곳</b>을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '2주기(Li → F)와 17족(F → Cl → Br)을 슬라이더로 움직여 보세요. 핵전하와 전자껍질 수, 보라색 화살표가 어떻게 변하나요?',
          setup() { S.gate = 'rule'; setScene('atom'); resetSelects(ruleSel, RULE_DEFS); updateUI(); },
          check: () => checkSelects(RULE_DEFS, ruleSel, '빨간 칸을 다시 골라 보세요. 2주기와 17족의 모형에서 무엇이 변했나요?'),
          status: () => '고른 칸 ' + ruleSel.filter((s) => s.value).length + ' / ' + ruleSel.length,
          explain: '같은 주기에서는 원자 번호가 커질수록 <b>핵전하가 커져</b> 전기 음성도가 커지고, 같은 족에서 아래로 갈수록 전기 음성도는 <b>작아져요</b>. 전기 음성도가 가장 큰 F는 주기율표의 <b>오른쪽 위</b>에 있어요.',
        },
        {
          type: 'quiz', title: '같은 족에서 아래로 갈수록 작아지는 까닭',
          goal: '같은 족에서 아래로 내려갈수록 전기 음성도가 <b>작아지는 까닭</b>은?',
          setup() { S.gate = ''; setScene('atom'); setMode('g17'); updateUI(); },
          choices: ['핵전하가 작아져서', '전자껍질 수가 늘어 최외각 전자와 핵 사이의 거리가 멀어져서', '최외각 전자 수가 줄어서', '전자의 질량이 커져서'],
          answer: 1,
          feedback: ['아래로 갈수록 핵전하(양성자 수)는 오히려 커져요. 하지만 다른 요인이 더 크게 작용해요.', '', '17족의 최외각 전자 수는 모두 7개로 같아요.', '전자의 질량은 원소마다 같아요.'],
          explain: '아래로 갈수록 핵전하는 커지지만 <b>전자껍질 수가 늘어</b> 최외각 전자가 핵에서 멀어져요. 그래서 핵이 최외각 전자를 당기는 힘이 약해져 전기 음성도가 작아져요.',
        },
        {
          type: 'quiz', title: '18족을 제외하는 까닭',
          goal: '전기 음성도 표에서 18족(He, Ne, Ar)은 값을 쓰지 않아요. 그 까닭은?',
          setup() { S.gate = ''; setScene('table'); updateUI(); },
          choices: ['18족은 핵전하가 없어서', '18족은 결합을 거의 하지 않아 전자쌍을 끌어당기는 상황이 거의 없어서', '18족은 너무 무거워서', '18족의 값이 너무 커서 표에 쓸 수 없어서'],
          answer: 1,
          feedback: ['18족도 핵전하가 있어요(양성자가 있어요).', '', '무게와 전기 음성도 값은 관계가 없어요.', '값이 커서가 아니라, 정의 자체가 결합에서의 성질이라는 점을 생각해 보세요.'],
          explain: '전기 음성도는 <b>결합한 원자가 공유 전자쌍을 끌어당기는 세기</b>라서, 결합을 거의 하지 않는 <b>18족</b>은 값을 쓰지 않아요.',
        },
      ],
    },
    {
      title: '전기 음성도로 순서 맞히기', short: '순서 맞히기', icon: '🎯', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 경향과 그 까닭을 알았어요. 이제 <b>주기율표의 위치만 보고</b> 전기 음성도의 크기를 비교해 봐요.</div>' +
        '<p>원소 카드 4개를 전기 음성도가 <b>작은 것부터 큰 것 순</b>으로 놓아 보고, 두 원소 중 더 큰 원소를 골라요. 값을 외우지 말고 <b>같은 주기인지, 같은 족인지</b> 위치로 판단해 봐요.</p>',
      features: ['order'],
      setup() { S.gate = ''; S.od.part = 'arrange'; S.od.qi = 0; S.od.done = {}; S.od.cdone = {}; S.od.ci = 0; S.od.cmpMsg = ''; S.od.cadv = null; buildCards(); setScene('order'); updateUI(); },
      recap: '전기 음성도는 주기율표의 위치로 비교할 수 있어요. 같은 주기에서는 오른쪽, 같은 족에서는 위쪽이 더 커요. 전기 음성도는 전자를 "잃는" 경향이 아니라 공유 전자쌍을 "끌어당기는" 세기예요.',
      summary: '<ul><li>같은 주기: C &lt; N &lt; O &lt; F, Na &lt; Mg &lt; Al &lt; Cl (오른쪽일수록 큼)</li><li>같은 족: Cl &gt; Br, Mg &gt; Ca (위쪽일수록 큼). P &lt; S (같은 주기, 오른쪽)</li><li>전기 음성도는 결합에서 공유 전자쌍을 <b>끌어당기는</b> 세기예요. 전자를 쉽게 <b>잃는</b> 정도(이온화 경향)와는 달라요.</li></ul>',
      missions: [
        {
          title: '카드 배열 2문제',
          goal: '원소 카드를 전기 음성도가 <b>작은 것 → 큰 것</b> 순서로 놓아 <b>두 문제</b>를 모두 맞히세요.',
          hint: '같은 주기의 원소끼리는 오른쪽에 있을수록 커요. 아래 주기율표에서 빨간 테두리가 문제의 원소예요.',
          setup() { S.gate = ''; S.od.part = 'arrange'; S.od.qi = 0; S.od.done = {}; buildCards(); setScene('order'); updateUI(); },
          check: () => S.od.done[0] && S.od.done[1],
          hold: 0.5,
          status: () => mark(S.od.done[0]) + ' 문제 1 (O · C · N · F) &nbsp; ' + mark(S.od.done[1]) + ' 문제 2 (Mg · Na · Cl · Al)',
          explain: 'C &lt; N &lt; O &lt; F는 같은 2주기에서 <b>오른쪽일수록</b> 커지는 규칙이고, Na &lt; Mg &lt; Al &lt; Cl도 같은 3주기에서 같은 규칙이에요.',
        },
        {
          title: '위치로 비교하기 3문제',
          goal: '두 원소 중 전기 음성도가 <b>더 큰 원소</b>를 골라 <b>세 문제</b>를 모두 맞히세요.',
          hint: '같은 족이면 위쪽, 같은 주기이면 오른쪽 원소가 더 커요.',
          setup() { S.gate = ''; S.od.part = 'compare'; S.od.ci = 0; S.od.cdone = {}; S.od.cmpMsg = ''; S.od.cadv = null; setScene('order'); updateUI(); },
          check: () => S.od.cdone[0] && S.od.cdone[1] && S.od.cdone[2],
          hold: 0.5,
          status: () => cmpQ.map((q, i) => mark(S.od.cdone[i]) + ' ' + q.a + ' vs ' + q.b).join(' &nbsp; '),
          explain: 'Cl &gt; Br(같은 17족, 위쪽), S &gt; P(같은 3주기, 오른쪽), Mg &gt; Ca(같은 2족, 위쪽)예요. 위치만 보고도 크기를 비교할 수 있어요.',
        },
        {
          type: 'quiz', title: '"끌어당기는 세기"와 "잘 잃는 정도"',
          goal: '전기 음성도에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.gate = ''; S.od.part = 'compare'; setScene('order'); updateUI(); },
          choices: ['원자가 전자를 얼마나 쉽게 잃는지를 나타내요', '결합한 원자가 공유 전자쌍을 얼마나 세게 끌어당기는지를 나타내요', '원자의 크기를 나타내요', '원자핵의 질량을 나타내요'],
          answer: 1,
          feedback: ['전자를 잘 잃는 정도(금속성)와는 달라요. 전기 음성도는 공유 전자쌍을 <b>끌어당기는</b> 세기예요.', '', '원자의 크기(반지름)와는 다른 성질이에요.', '핵의 질량이 아니라 전자쌍을 끌어당기는 세기예요.'],
          explain: '전기 음성도는 결합한 원자가 <b>공유 전자쌍을 끌어당기는 상대적인 세기</b>예요. 그래서 전기 음성도가 큰 원소(F)는 전자쌍을 세게 끌어당기는 원소이고, 전자를 쉽게 잃는 원소와는 반대 성질이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-electronegativity', mount: '#game', badge: '전기 음성도 탐험가', homeHref: '../../index.html#hc',
    featureLabels: { tug: '🪢 전자 줄다리기', table: '🔥 전기 음성도 주기율표 · 그래프', atom: '⚛️ 핵이 당기는 힘 모형', order: '🎯 순서 맞히기 카드' },
    onFeatures() { updateUI(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildCards();
  syncSlider();
  updateUI();
  function update(dt) {
    S.t += dt;
    if (S.scene === 'tug') tugStep(dt);
    else if (S.scene === 'atom') atStep(dt);
    else if (S.scene === 'order') odStep(dt);
    fx.update(dt);
  }
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt) => {
    if (game && (game.free !== lastFree || game.level !== lastLevel)) { lastFree = game.free; lastLevel = game.level; updateUI(); }
    update(dt);
    view.apply();
    if (S.scene === 'tug') drawTugScene();
    else if (S.scene === 'table') drawTableScene();
    else if (S.scene === 'atom') drawAtom();
    else drawOrderScene();
    fx.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, EL, E, TUGS, SERIES, arrQ, cmpQ, OD, PT, TG, cloudPos, qOf, tugAns, get game() { return game; },
    setScene, selectMatch, startMatch, setSeries, drawSeriesNow, setMode, setEl, answerCmp, buildCards, slotPos, trayPos, ruleSel, RULE_DEFS, hitCell, cellRect, enOf,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) update(0.02); },
  };
})();
