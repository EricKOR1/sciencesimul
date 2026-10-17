/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 관성과 상호작용 (단원 7차시)
   성취기준 [10통과1-03-04] 상호작용이 없을 때 물체가 가속되지 않음을 알고, 충격량과 운동량의 관계를 충돌 관련 안전장치와
   스포츠에 적용할 수 있다. (관성: 상호작용이 없을 때 가속되지 않음 부분)
   ① 관찰: 마찰을 줄이면 (거친 바닥 → 얼음 → 에어 트랙)
   ② 탐구: 관성 현상 (식탁보·급정거·카드와 동전·급출발, 질량 비교)
   ③ 분석: 속도 그래프 (우주선, 알짜힘이 0이면 등속)
   ④ 적용: 안전과 관성 (급정거와 안전벨트, 후방 추돌과 머리받침)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const G = 9.8;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf1fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function bgFill(top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'floor', clock: 0, fade: 0, showMatch: false, showCards: false,
    fl: null, cs: { kind: 'cloth', opt: { cloth: 'fast', coin: 'fast' }, mass: 2, done: {}, ranMass: 0, match: {}, matchOK: {}, run: null },
    gr: null, sf: { sc: 'brake', belt: 0, head: 0, run: null, tried: {}, cards: {}, cardOK: {} },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  const MODE_LABEL = { floor: '🛷 마찰을 줄이면', cases: '🧪 관성 현상', graph: '📈 속도 그래프', safety: '🚗 안전과 관성' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'floor' && !S.fl) resetFloor();
    if (mode === 'cases') caseSelect(S.cs.kind, true);
    if (mode === 'graph' && !S.gr) resetGraph();
    if (mode === 'safety') safetyReset();
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      const modes = n.getAttribute('data-modes').split(' ');
      let on = modes.indexOf(S.mode) >= 0;
      const cs = n.getAttribute('data-case');
      if (on && cs) on = cs.split(' ').indexOf(S.cs.kind) >= 0;
      const sc = n.getAttribute('data-sc');
      if (on && sc) on = sc === S.sf.sc;
      if (on && n.hasAttribute('data-match')) on = S.showMatch;
      if (on && n.hasAttribute('data-cards')) on = S.showCards;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#floorSeg button').forEach((b) => b.classList.toggle('on', S.fl && b.dataset.floor === S.fl.floor));
    $$('#caseSeg button').forEach((b) => b.classList.toggle('on', b.dataset.case === S.cs.kind));
    $$('#scenSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === S.sf.sc));
    $$('#beltSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.belt === S.sf.belt));
    $$('#headSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.head === S.sf.head));
    if (S.gr) $$('#thrustSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.th === S.gr.th));
    const ok = S.cs.kind;
    const fast = ok === 'cloth' ? '빠르게' : '세게', slow = ok === 'cloth' ? '천천히' : '약하게';
    $('#optFast').textContent = fast; $('#optSlow').textContent = slow;
    $('#optLabel').textContent = ok === 'cloth' ? '🖐️ 천을 당기는 빠르기' : '👆 카드를 튕기는 세기';
    $$('#optSeg button').forEach((b) => b.classList.toggle('on', b.dataset.opt === (S.cs.opt[ok] || 'fast')));
    $('#bPush').disabled = !!(S.fl && S.fl.st !== 'idle');
    const run = S.cs.run;
    $('#bCaseRun').disabled = !!(run && run.st === 'run');
    $('#bFly').textContent = S.gr && S.gr.running ? '⏸ 일시 정지' : (S.gr && S.gr.t > 0 && !S.gr.ended ? '▶ 이어서 비행' : '▶ 비행 시작');
    $('#bFly').disabled = !!(S.gr && S.gr.ended);
    $('#bSafeRun').disabled = !!(S.sf.run && S.sf.run.st === 'run');
    $('#oThrust').textContent = S.gr ? (S.gr.th * 500 > 0 ? '+' : S.gr.th < 0 ? '−' : '') + Math.abs(S.gr.th * 500) + ' N' : '0 N';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= ① 마찰 비교 ================= */
  const FR = {
    rough: { name: '거친 바닥', f: 1.0, color: '#a47c52' },
    ice: { name: '매끈한 얼음', f: 0.25, color: '#9fd3ee' },
    air: { name: '에어 트랙', f: 0.0, color: '#c3ccd8' },
  };
  const FLOORS = ['rough', 'ice', 'air'];
  const FPPM = PHONE ? 41 : 68, FX0 = PHONE ? 26 : 44;
  const FYS = PHONE ? 196 : 226;
  const BOXW = 0.9 * FPPM, BOXH = 0.62 * FPPM;
  const V0 = 2.0, MBOX = 1.0, FLIM = 10;
  const fx = (m) => FX0 + m * FPPM;
  const BL0 = fx(0) - BOXW / 2;
  const bumps = []; for (let i = 0; i < 90; i++) bumps.push({ x: i * 9 + rnd(0, 6), r: rnd(1.5, 3.2), c: i % 3 });
  function resetFloor(keepFloor) {
    const prev = S.fl;
    S.fl = {
      floor: keepFloor || (prev ? prev.floor : 'rough'), st: 'idle', t: 0, x: 0, v: 0, push: 0, ghosts: [], lastGhost: 0, msg: '',
      rec: prev ? prev.rec : { rough: null, ice: null, air: null }, hover: 0, pusherX: BL0 - 62,
    };
    updateCtl();
  }
  function pushBox() {
    const F = S.fl;
    if (F.st !== 'idle') return;
    F.st = 'push'; F.push = 0; F.t = 0; Sound.click(); updateCtl();
  }
  function setFloor(f) {
    if (S.fl && S.fl.floor === f && S.fl.st === 'idle') return;
    resetFloor(f);
  }
  const fricNow = (F) => (F.st === 'move' && F.v > 0.001 ? FR[F.floor].f : 0);
  function stepFloor(dt) {
    const F = S.fl; if (!F) return;
    const fr = FR[F.floor];
    if (F.st === 'push') {
      F.push += dt / 0.26;
      F.pusherX = BL0 - 62 + 62 * SciSim.ease.inCubic(clamp(F.push, 0, 1));
      if (F.push >= 1) {
        F.st = 'move'; F.t = 0; F.v = V0; F.x = 0; F.lastGhost = 0;
        Sound.tick(); parts.burst(BL0, FYS - BOXH / 2, { count: 8, speed: 80, size: 2.6, colors: ['#ffd76a', '#fff'], gravity: 40, life: 0.4 });
      }
    } else if (F.st === 'move') {
      F.t += dt;
      const a = fr.f / MBOX;
      if (a > 0) {
        const ts = V0 / a;
        if (F.t >= ts) { F.t = ts; F.v = 0; F.x = V0 * V0 / (2 * a); F.st = 'done'; finishRun(false); }
        else { F.v = V0 - a * F.t; F.x = V0 * F.t - 0.5 * a * F.t * F.t; }
      } else {
        F.v = V0; F.x = V0 * F.t;
        if (F.x >= FLIM) { F.x = FLIM; F.st = 'done'; finishRun(true); }
      }
      while (F.st === 'move' && F.t - F.lastGhost >= 0.5) { F.lastGhost += 0.5; F.ghosts.push(V0 * F.lastGhost - 0.5 * (fr.f / MBOX) * F.lastGhost * F.lastGhost); }
      if (!RM && F.st === 'move') {
        if (F.floor === 'rough' && F.v > 0.2 && Math.random() < dt * 40 * F.v / 2) parts.emit({ x: fx(F.x) - BOXW / 2, y: FYS - 2, vx: -rnd(10, 40), vy: -rnd(15, 45), life: 0.45, size: rnd(1.4, 2.6), color: '#c9a77e', gravity: 90, shape: 'circle' });
        if (F.floor === 'ice' && F.v > 0.2 && Math.random() < dt * 14) parts.emit({ x: fx(F.x) - BOXW / 2, y: FYS - 1, vx: -rnd(5, 25), vy: -rnd(5, 20), life: 0.4, size: rnd(1.2, 2), color: '#ffffff', gravity: 60, shape: 'circle' });
      }
    }
    if (F.st === 'move' || F.st === 'done') F.pusherX = SciSim.approach(F.pusherX, BL0 - 64, dt, 7);
    if (F.floor === 'air' && !RM && Math.random() < dt * 30) {
      parts.emit({ x: fx(F.x) + rnd(-BOXW / 2 + 4, BOXW / 2 - 4), y: FYS + 5, vx: rnd(-14, 14), vy: -rnd(14, 34), life: 0.3, size: 1.8, color: '#8fcbff', gravity: 0, shape: 'circle' });
    }
    F.hover = SciSim.approach(F.hover, F.floor === 'air' ? 7 : 0, dt, 9);
  }
  function finishRun(thru) {
    const F = S.fl;
    const d = Math.round(F.x * 10) / 10;
    F.rec[F.floor] = { d, thru, f: FR[F.floor].f };
    F.msg = thru ? '10 m 지나도 속력 그대로 2.0 m/s!' : d.toFixed(1) + ' m 가서 멈췄어요';
    Sound.success();
    parts.burst(fx(F.x), FYS - BOXH - 6, { count: 14, speed: 140, size: 3.4, colors: ['#ffb400', '#3867f4', '#14a058'], gravity: 160 });
    updateCtl();
  }
  function drawBox(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    D.shadow(() => { D.roundRect(x - w / 2, y - h, w, h, 7); ctx.fillStyle = o.color || '#e9893f'; ctx.fill(); }, { blur: o.ghost ? 0 : 8, y: 3, color: 'rgba(60,40,20,.28)' });
    if (!o.ghost) {
      const g = ctx.createLinearGradient(x, y - h, x, y);
      g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
      D.roundRect(x - w / 2, y - h, w, h, 7); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(120,60,10,.45)'; ctx.lineWidth = 1.5; D.roundRect(x - w / 2 + 1, y - h + 1, w - 2, h - 2, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y - h / 2); ctx.lineTo(x + w / 2 - 6, y - h / 2); ctx.stroke();
      T(x, y - h / 2 + (PHONE ? 11 : 15), o.label || '1 kg', PHONE ? 11 : 13, '#7a3a0a', 'center', 800);
    }
    ctx.restore();
  }
  function drawFloorBody(kind, y, x0, x1) {
    if (kind === 'rough') {
      const g = ctx.createLinearGradient(0, y, 0, y + 34); g.addColorStop(0, '#b58c5f'); g.addColorStop(1, '#85633f');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, y + 34); ctx.lineTo(x0, y);
      for (let x = x0; x <= x1; x += 3) ctx.lineTo(x, y + Math.sin(x * 0.9) * 1.8 + Math.sin(x * 0.37 + 1) * 1.8 - 1);
      ctx.lineTo(x1, y + 34); ctx.closePath(); ctx.fill();
      bumps.forEach((b) => { if (b.x < x0 || b.x > x1) return; ctx.fillStyle = b.c === 0 ? '#6f4f30' : b.c === 1 ? '#c9a77e' : '#8d6b45'; ctx.beginPath(); ctx.arc(b.x, y + 10 + (b.x * 7 % 15), b.r, 0, TAU); ctx.fill(); });
    } else if (kind === 'ice') {
      const g = ctx.createLinearGradient(0, y, 0, y + 34); g.addColorStop(0, '#e9f7fd'); g.addColorStop(0.35, '#bfe3f4'); g.addColorStop(1, '#8cc4e2');
      D.roundRect(x0, y, x1 - x0, 34, 4); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(x0, y, x1 - x0, 3);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      for (let x = x0 + 30; x < x1; x += 120) { ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x + 26, y + 9); ctx.stroke(); }
    } else {
      const g = ctx.createLinearGradient(0, y + 4, 0, y + 30); g.addColorStop(0, '#f4f7fb'); g.addColorStop(0.5, '#c3ccd8'); g.addColorStop(1, '#8793a3');
      D.roundRect(x0, y + 4, x1 - x0, 26, 11); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(70,85,105,.5)'; ctx.lineWidth = 1.2; D.roundRect(x0, y + 4, x1 - x0, 26, 11); ctx.stroke();
      for (let x = x0 + 12; x < x1; x += 14) { ctx.fillStyle = '#5c6879'; ctx.beginPath(); ctx.ellipse(x, y + 8, 2.2, 1.2, 0, 0, TAU); ctx.fill(); }
    }
  }
  function drawFloorScene(dt) {
    const F = S.fl; const fr = FR[F.floor];
    bgFill('#e8f1fc', '#f6f9fe');
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, 0, VW, 54);
    T(16, 24, '🛷 ' + fr.name, PHONE ? 17 : 20, '#26324a', 'left', 800);
    T(16, 44, F.floor === 'air' ? '바닥에서 공기가 나와 상자가 살짝 떠 있어요 (마찰 거의 없음)' : F.floor === 'ice' ? '표면이 매끈해서 마찰이 작아요' : '표면이 거칠어서 마찰이 커요', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    drawFloorBody(F.floor, FYS, 0, VW);
    // 눈금자
    const ry = FYS + 56;
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx(0), ry); ctx.lineTo(fx(FLIM), ry); ctx.stroke();
    for (let m = 0; m <= FLIM; m++) {
      ctx.beginPath(); ctx.moveTo(fx(m), ry - 6); ctx.lineTo(fx(m), ry + 6); ctx.stroke();
      T(fx(m), ry + 24, String(m), PHONE ? 12 : 14, '#3a465c', 'center', 800);
    }
    T(fx(FLIM) + (PHONE ? 8 : 14), ry + 24, 'm', 13, '#3a465c', 'left', 800);
    ctx.strokeStyle = '#14a058'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx(FLIM), FYS - 74); ctx.lineTo(fx(FLIM), FYS); ctx.stroke(); ctx.setLineDash([]);
    T(fx(FLIM) - 4, FYS - 80, '측정 끝 10 m', 12.5, '#0b6b39', 'right', 800);
    const bx = fx(F.x), by = FYS - F.hover;
    F.ghosts.forEach((g) => drawBox(fx(g), FYS - F.hover, BOXW, BOXH, { alpha: 0.16, ghost: true }));
    if (F.st !== 'done') {
      const px = F.pusherX, ph = BOXH * 0.78;
      ctx.save(); D.roundRect(px - 28, by - ph - 3, 28, ph, 6); ctx.fillStyle = '#5b7bd6'; ctx.fill();
      ctx.strokeStyle = '#3b57a8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#8aa3e8'; D.roundRect(px - 58, by - ph / 2 - 9, 32, 8, 3); ctx.fill(); ctx.restore();
    }
    drawBox(bx, by, BOXW, BOXH, { label: '1 kg' });
    if (F.v > 0.02) D.arrow(bx, by - BOXH - 14, bx + F.v * (PHONE ? 22 : 30), by - BOXH - 14, { color: '#14a058', width: 5, label: '속도 ' + F.v.toFixed(1) + ' m/s', labelOffset: -18 });
    const f = fricNow(F);
    if (f > 0.001) D.arrow(bx - BOXW / 2, FYS - 12, bx - BOXW / 2 - f * (PHONE ? 40 : 60) - 4, FYS - 12, { color: '#e2464b', width: 5, label: '마찰력 ' + f.toFixed(2) + ' N', labelOffset: -18 });
    else if (F.st === 'move' && F.floor === 'air') T(bx, by - BOXH - 52, '마찰력 0 N → 속력 그대로', PHONE ? 12 : 14, '#0b6b39', 'center', 800);
    if (F.st === 'done') {
      const tone = F.rec[F.floor].thru ? '#14a058' : '#e2464b';
      D.label(clamp(bx, 90, VW - 90), FYS - BOXH - 60, F.msg, { bg: tone, size: PHONE ? 12 : 14 });
    }
    parts.update(dt); parts.draw(ctx);
    drawFloorTable(ry + 46);
    floorSummary(ry + 46 + 30 + (PHONE ? 40 : 44) * 3 + 12 + 10);
  }
  function drawFloorTable(ty) {
    const F = S.fl;
    const x = PHONE ? 12 : 44, w = VW - x * 2, rh = PHONE ? 40 : 44, hh = 30;
    panel(x, ty, w, hh + rh * 3 + 12, 14);
    const cols = [x + 18, x + w * 0.46, x + w * 0.70];
    T(cols[0], ty + 22, '바닥', 14, '#5a6679', 'left', 800); T(cols[1], ty + 22, '마찰력', 14, '#5a6679', 'left', 800); T(cols[2], ty + 22, '이동 거리', 14, '#5a6679', 'left', 800);
    FLOORS.forEach((k, i) => {
      const yy = ty + hh + 6 + i * rh, r = F.rec[k], cur = F.floor === k;
      if (cur) { D.roundRect(x + 6, yy, w - 12, rh - 4, 10); ctx.fillStyle = 'rgba(242,107,58,.12)'; ctx.fill(); }
      D.roundRect(cols[0], yy + rh / 2 - 12, 12, 18, 3); ctx.fillStyle = FR[k].color; ctx.fill();
      T(cols[0] + 20, yy + rh / 2 + 2, FR[k].name, PHONE ? 14 : 16, '#26324a', 'left', 800);
      T(cols[1], yy + rh / 2 + 2, FR[k].f.toFixed(2) + ' N', PHONE ? 14 : 16, '#c0392b', 'left', 800);
      const val = !r ? (cur && F.st !== 'idle' ? '재는 중…' : '? 밀어 보세요') : r.thru ? (PHONE ? '10 m 이상!' : '10 m 이상 (끝까지!)') : r.d.toFixed(1) + ' m';
      T(cols[2], yy + rh / 2 + 2, val, PHONE ? 13 : 16, r ? '#0b6b39' : '#98a2b3', 'left', 800);
    });
  }
  $$('#floorSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setFloor(b.dataset.floor); }));
  $('#bPush').addEventListener('click', pushBox);
  $('#bFloorReset').addEventListener('click', () => { Sound.click(); resetFloor(); });
  function floorSummary(y) {
    const F = S.fl; if (!FLOORS.every((k) => F.rec[k])) return;
    const x = PHONE ? 12 : 44, w = VW - x * 2;
    D.roundRect(x, y, w, PHONE ? 62 : 36, 12); ctx.fillStyle = '#fff4d6'; ctx.fill();
    const lines = wrap('마찰이 작을수록 더 멀리 가요. 마찰이 거의 없으면 속력이 그대로예요!', w - 28, PHONE ? 14 : 15, 800);
    lines.forEach((l, i) => T(x + 14, y + 23 + i * 20, l, PHONE ? 14 : 15, '#7a4b00', 'left', 800));
  }

  /* ================= ② 관성 현상 ================= */
  const CASES = {
    cloth: { name: '식탁보 빼기', idle: '▶ 실행을 눌러 천을 당겨요. 빠르게 당길 때와 천천히 당길 때를 비교해 보세요.' },
    stop: { name: '급정거하는 수레', idle: '▶ 실행을 누르면 인형을 태운 수레가 달려가 벽에 부딪혀 멈춰요.' },
    coin: { name: '카드 위의 동전', idle: '▶ 실행을 누르면 손가락이 카드를 튕겨요. 세게 튕길 때와 약하게 튕길 때를 비교해 보세요.' },
    start: { name: '급출발하는 버스', idle: '▶ 실행을 누르면 서 있던 버스가 갑자기 출발해요. 승객의 몸을 보세요.' },
    mass: { name: '질량 비교', idle: '같은 힘(2 N)으로 0.5초 동안 두 수레를 밀어요. 어느 쪽 속도가 더 많이 변할까요?' },
  };
  const CASE_KEYS = ['cloth', 'stop', 'coin', 'start', 'mass'];
  const INFO_Y = PHONE ? 486 : 438, INFO_H = PHONE ? 122 : 108;
  function caseSelect(k, keep) {
    S.cs.kind = k; S.cs.run = makeCase(k); S.fade = keep ? S.fade : 0.6; updateCtl();
  }
  function runCase() {
    const r = S.cs.run;
    if (r && r.st === 'run') return;
    if (r && r.st === 'done') S.cs.run = makeCase(S.cs.kind);
    S.cs.run.st = 'run'; Sound.click(); updateCtl();
  }
  function makeCase(k) {
    const opt = S.cs.opt[k];
    const base = { k, st: 'idle', t: 0, res: null, ok: false, opt };
    if (k === 'cloth') return Object.assign(base, { cx: 0, dx: 0, dv: 0, vc: opt === 'fast' ? 5 : 0.6, fell: false, fy: 0, fvy: 0, frot: 0, tf: 0, lost: false, endT: 0, shake: 0 });
    if (k === 'coin') return Object.assign(base, { fing: 0, phase: 'aim', xc: 0, vc: opt === 'fast' ? 6 : 0.4, coinX: 0, coinVx: 0, coinY: 0, coinVy: 0, released: false, landed: false, bounced: false, inCup: false, cardFall: false, cardY: 0, cardVy: 0, cardRot: 0, cardVrot: 0 });
    if (k === 'stop') return Object.assign(base, { x: 0, v: 2, th: 0, om: 0, hit: false, ang: 0, tHit: 0, lay: false });
    if (k === 'start') return Object.assign(base, { v: 0, a: 0, th: 0, om: 0, off: 0 });
    return Object.assign(base, { m: S.cs.mass, x1: 0, x2: 0, v1: 0, v2: 0, push: 0 });
  }
  function caseDone(r, text, ok) {
    r.st = 'done'; r.res = text; r.ok = ok;
    S.cs.done[r.k + (r.k === 'cloth' || r.k === 'coin' ? ':' + r.opt : '')] = true;
    if (r.k === 'mass') S.cs.ranMass = Math.max(S.cs.ranMass, r.m);
    Sound.success(); updateCtl();
  }
  function stepCase(dt) {
    const r = S.cs.run; if (r && r.k === 'cloth' && r.st === 'done' && r.cx < 2.6) r.cx = Math.min(2.6, r.cx + r.vc * dt * 2);
    if (!r || r.st !== 'run') return;
    let ts = 1;
    const k = r.k;
    if (k === 'cloth') {
      const contact = r.cx < 0.48 + r.dx && !r.fell;
      ts = r.opt === 'fast' ? (contact ? 0.1 : 0.45) : 1;
      if (RM) ts = 1;
      stepSub(dt * ts, 0.004, (h) => {
        r.t += h;
        r.cx = Math.min(2.6, r.cx + r.vc * h);
        const on = r.cx < 0.48 + r.dx && !r.fell;
        if (on) { if (r.dv < r.vc) { r.dv = Math.min(r.vc, r.dv + 0.4 * G * h); } }
        else if (!r.fell) { r.dv = Math.max(0, r.dv - 0.5 * G * h); if (!r.lost) { r.lost = true; r.shake = 1; } }
        if (!r.fell) r.dx += r.dv * h;
        if (!r.fell && 0.515 + r.dx > 2.0) { r.fell = true; r.fvy = 0; }
        if (r.fell) { r.tf += h; r.fvy += 9.8 * h; r.fy += r.fvy * h; r.frot += 2.2 * h; }
      });
      if (r.fell && r.fy * CPPM * 0.6 >= 112 && r.st === 'run') { parts.burst(TX0 + (0.515 + r.dx) * CPPM, TY + 150, { count: 14, speed: 140, size: 3, colors: ['#fff', '#f0c8c8', '#d8dde6'], gravity: 300 }); caseDone(r, '천천히 당기면 그릇이 천과 함께 끌려가요. 결국 식탁 밖으로 떨어졌어요.', false); }
      if (!r.fell && !(r.cx < 0.48 + r.dx) && r.dv <= 0 && r.st === 'run') {
        const cm = Math.round(r.dx * 100);
        caseDone(r, '천을 빠르게 당겼더니 그릇은 거의 제자리에 남았어요 (옆으로 약 ' + cm + ' cm). 정지해 있던 그릇이 계속 정지해 있으려는 성질, 관성 때문이에요.', true);
      }
    } else if (k === 'coin') {
      if (r.phase === 'aim') {
        r.t += dt; r.fing = clamp(r.t / 0.45, 0, 1);
        if (r.fing >= 1) { r.phase = 'fly'; Sound.tick(); parts.burst(KCX + r.xc * KPPM - 85, KRIM - 4, { count: 6, speed: 70, size: 2.2, colors: ['#fff', '#ffd76a'], gravity: 0, life: 0.3 }); }
      } else {
        const sup = !r.released;
        ts = r.opt === 'fast' ? (sup ? 0.025 : (r.landed ? 1 : 0.3)) : 1; if (RM) ts = 1;
        stepSub(dt * ts, 0.0015, (h) => {
          r.t += h;
          r.xc += r.vc * h;
          const cardLeft = r.xc - 0.085;
          if (!r.cardFall && cardLeft > 0.053) { r.cardFall = true; r.cardVy = 0; r.cardVrot = r.opt === 'slow' ? 0.9 : 0; if (!r.released) r.released = true; }
          if (!r.released) {
            if (r.coinVx < r.vc) r.coinVx = Math.min(r.vc, r.coinVx + 0.3 * G * h);
            r.coinX += r.coinVx * h;
            if (cardLeft > r.coinX) r.released = true;
          } else if (!r.landed) {
            r.coinVy += G * h; r.coinY += r.coinVy * h;
            r.coinX += r.coinVx * h;
            const inside = Math.abs(r.coinX) < 0.045 - 0.0125;
            const floorPx = inside ? KTY - 7 : KTY - 3;
            if (r.coinY * KPPM >= floorPx - COIN0) { r.coinY = (floorPx - COIN0) / KPPM; r.landed = true; r.inCup = inside; Sound.tick(); }
          }
          if (r.cardFall) {
            r.cardVy += G * h; r.cardY += r.cardVy * h; r.cardRot += r.cardVrot * h;
            if (r.cardY * KPPM >= KTY - 3 - (KRIM - 2.5)) { r.cardY = (KTY - 3 - (KRIM - 2.5)) / KPPM; r.cardVy = 0; r.cardVrot = 0; r.cardRot = 0; }
          }
        });
        if (r.landed && r.st === 'run') {
          r.tEnd = (r.tEnd || 0) + dt; 
          if (r.tEnd > 0.5) {
            if (r.inCup) { parts.burst(KCX + r.coinX * KPPM, KTY - 40, { count: 14, speed: 120, size: 3, colors: ['#ffd76a', '#fff', '#14a058'], gravity: 160 }); caseDone(r, '카드는 날아갔지만 동전은 거의 가속되지 않았어요(옆으로 약 ' + Math.round(Math.abs(r.coinX) * 1000) + ' mm). 정지해 있던 동전이 계속 정지해 있으려 해서 컵 속으로 똑바로 떨어졌어요.', true); }
            else caseDone(r, '천천히 튕기면 카드가 동전을 끌고 가서 동전이 컵 밖으로 떨어져요. 빠르게 튕겨야 동전이 제자리에 머물러요.', false);
          }
        }
      }
    } else if (k === 'stop') {
      const hitX = STOPX_WALL;
      if (!r.hit) {
        r.t += dt; r.x += r.v * STPPM * dt;
        if (r.x >= STOP_D0) { r.x = STOP_D0; r.hit = true; r.tHit = 0; r.v = 0; r.th = 0.002; r.om = 3 * 2.0 / (2 * STOPL); Sound.fail(); parts.burst(hitX, STOPGY - 26, { count: 14, speed: 150, size: 3, colors: ['#ffd76a', '#fff', '#e9893f'], gravity: 200, life: 0.5 }); updateCtl(); }
      } else {
        ts = RM ? 1 : 0.35; r.tHit += dt;
        stepSub(dt * ts, 0.003, (h) => {
          if (r.lay) return;
          r.om += (3 * G / (2 * STOPL)) * Math.sin(r.th) * h; r.th += r.om * h;
          if (r.th >= Math.PI / 2) { r.th = Math.PI / 2; r.om = 0; r.lay = true; }
        });
        if (r.lay && r.tHit > 1.3 && r.st === 'run') caseDone(r, '수레는 벽에 막혀 멈췄지만 인형은 계속 앞으로 나아가려 해서 앞으로 쓰러졌어요. 움직이던 물체가 계속 움직이려는 성질, 관성이에요.', true);
      }
    } else if (k === 'start') {
      r.t += dt;
      const a = r.t < 1 ? 0 : r.t < 4 ? 3 : 0;
      r.a = a;
      r.v = r.t < 1 ? 0 : r.t < 4 ? 3 * (r.t - 1) : 9;
      r.off += r.v * dt * BPPM;
      const eq = Math.atan(a / G);
      stepSub(dt, 0.004, (h) => { r.om += (-48 * (r.th - eq) - 6.2 * r.om) * h; r.th += r.om * h; });
      if (r.t >= 7 && r.st === 'run') caseDone(r, '버스가 갑자기 출발하자 승객의 몸이 뒤로 젖혀졌어요. 정지해 있던 몸이 계속 정지해 있으려 했기 때문이에요. 일정한 속도가 되자 몸도 다시 바로 섰어요.', true);
    } else if (k === 'mass') {
      r.t += dt;
      const F = 2, tp = 0.5, M1 = 0.5, M2 = r.m;
      const pos = (m, t) => { const a = F / m, tt = Math.min(t, tp); return 0.5 * a * tt * tt + (a * tp) * Math.max(0, t - tp); };
      r.x1 = pos(M1, r.t); r.x2 = pos(M2, r.t);
      r.v1 = F / M1 * Math.min(r.t, tp); r.v2 = F / M2 * Math.min(r.t, tp);
      r.push = r.t < tp ? 1 : 0;
      if (r.t >= 4 && r.st === 'run') caseDone(r, '같은 힘으로 같은 시간 밀었는데 가벼운 수레는 ' + r.v1.toFixed(2) + ' m/s, ' + M2.toFixed(1) + ' kg 수레는 ' + r.v2.toFixed(2) + ' m/s가 되었어요. 질량이 클수록 관성이 커서 운동 상태가 잘 바뀌지 않아요.', true);
    }
  }
  function stepSub(total, hmax, fn) { const n = Math.max(1, Math.ceil(total / hmax)); const h = total / n; for (let i = 0; i < n; i++) fn(h); }

  /* ---- 장면 그리기 ---- */
  const CPPM = PHONE ? 190 : 300, TX0 = PHONE ? 22 : 60, TY = PHONE ? 310 : 304;
  const KZ = PHONE ? 1 : 1.25, KPPM = 1000, KCX = VW / 2 - (PHONE ? 60 : 110), KTY = PHONE ? 400 : 392, KRIM = KTY - 100, COIN0 = KRIM - 8;
  const STPPM = PHONE ? 110 : 170, STOPGY = PHONE ? 392 : 380, STOPX_WALL = VW - (PHONE ? 52 : 72), STOPL = 0.36;
  const STCW = 0.9 * STPPM, STOPX_RUN = STOPX_WALL - STCW / 2, STOP_D0 = 2.4 * STPPM;
  const BPPM = PHONE ? 95 : 120, BGY = PHONE ? 400 : 392;

  function drawDoll(px, py, L, th, o) {
    ctx.save(); ctx.translate(px, py); ctx.rotate(th);
    D.shadow(() => { ctx.fillStyle = '#b97a45'; ctx.beginPath(); ctx.ellipse(0, -0.34 * L, 0.27 * L, 0.34 * L, 0, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#e8b98a'; ctx.beginPath(); ctx.ellipse(0, -0.3 * L, 0.16 * L, 0.2 * L, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b97a45'; ctx.beginPath(); ctx.arc(0, -0.84 * L, 0.21 * L, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-0.17 * L, -1.0 * L, 0.08 * L, 0, TAU); ctx.arc(0.17 * L, -1.0 * L, 0.08 * L, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8b98a'; ctx.beginPath(); ctx.ellipse(0.05 * L, -0.8 * L, 0.1 * L, 0.08 * L, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b2150'; ctx.beginPath(); ctx.arc(-0.04 * L, -0.88 * L, 0.025 * L, 0, TAU); ctx.arc(0.1 * L, -0.88 * L, 0.025 * L, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0.1 * L, -0.8 * L, 0.03 * L, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawCartBase(cx, gy, w, h, body, color) {
    D.shadow(() => { D.roundRect(cx - w / 2, gy - h - 12, w, h, 6); ctx.fillStyle = color || '#4a78d8'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(cx - w / 2 + 4, gy - h - 9, w - 8, 4);
    [cx - w * 0.3, cx + w * 0.3].forEach((wx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(wx, gy - 7, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(wx, gy - 7, 3.5, 0, TAU); ctx.fill(); });
  }
  function drawInfo(r) {
    const x = PHONE ? 10 : 24, w = VW - x * 2;
    panel(x, INFO_Y, w, INFO_H, 16, r && r.st === 'done' ? (r.ok ? '#e7f7ee' : '#fdeceb') : '#fff');
    const title = CASES[r.k].name;
    T(x + 16, INFO_Y + 26, (r.st === 'done' ? (r.ok ? '✅ ' : '⚠️ ') : '🔎 ') + title, PHONE ? 15 : 17, '#26324a', 'left', 800);
    const txt = r.st === 'done' ? r.res : r.st === 'run' ? '관찰하는 중…' : CASES[r.k].idle;
    textBlock(x + 16, INFO_Y + 52, w - 32, txt, PHONE ? 14 : 15, '#3a465c', PHONE ? 21 : 22, 700);
  }
  function drawCases(dt) {
    const r = S.cs.run;
    bgFill('#eaf1fb', '#f7faff');
    const k = r.k;
    if (k === 'cloth') drawCloth(r);
    else if (k === 'coin') drawCoin(r);
    else if (k === 'stop') drawStop(r);
    else if (k === 'start') drawStart(r);
    else drawMass(r, dt);
    drawInfo(r);
    parts.update(dt); parts.draw(ctx);
  }
  function drawTable(x0, x1, y) {
    ctx.fillStyle = '#8f6a40'; ctx.fillRect(x0 + 14, y + 22, 18, 100); ctx.fillRect(x1 - 32, y + 22, 18, 100);
    D.shadow(() => { D.roundRect(x0, y, x1 - x0, 22, 5); ctx.fillStyle = '#b98d5c'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x0 + 4, y + 2, x1 - x0 - 8, 4);
  }
  function drawRoom(floorY) {
    const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, '#f8f2e7'); g.addColorStop(1, '#ecdfc9'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, floorY);
    const ww = PHONE ? 118 : 170, wh = PHONE ? 100 : 128, wx = PHONE ? 300 : VW * 0.6, wy = PHONE ? 84 : 78;
    const sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, '#9fd2f7'); sg.addColorStop(1, '#e3f3ff');
    ctx.fillStyle = sg; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(wx + ww * 0.3, wy + wh * 0.4, 14, 0, TAU); ctx.arc(wx + ww * 0.3 + 16, wy + wh * 0.4 + 4, 11, 0, TAU); ctx.arc(wx + ww * 0.3 - 14, wy + wh * 0.4 + 5, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    ctx.strokeStyle = '#d7c7a8'; ctx.lineWidth = 2; ctx.strokeRect(wx - 3, wy - 3, ww + 6, wh + 6);
    ctx.fillStyle = 'rgba(232,110,110,.55)'; ctx.fillRect(wx - 22, wy - 8, 20, wh + 30); ctx.fillRect(wx + ww + 2, wy - 8, 20, wh + 30);
    if (!PHONE) { ctx.strokeStyle = '#b98d5c'; ctx.lineWidth = 5; ctx.strokeRect(VW - 120, 96, 70, 56); ctx.fillStyle = '#cfe3c8'; ctx.fillRect(VW - 117, 99, 64, 50); ctx.fillStyle = '#7fb069'; ctx.beginPath(); ctx.arc(VW - 98, 134, 14, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#d9c7a6'; ctx.fillRect(0, floorY - 10, VW, 10);
    ctx.fillStyle = '#cdb892'; ctx.fillRect(0, floorY, VW, VH - floorY);
  }
  function drawCloth(r) {
    const tx1 = TX0 + 2.0 * CPPM;
    drawRoom(TY + 122);
    drawTable(TX0, tx1, TY);
    // 천
    const cl = TX0 + (0.15 + r.cx) * CPPM, cr = cl + 1.6 * CPPM;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, tx1, VH); ctx.clip();
    if (cl < tx1) {
      const x0 = Math.max(cl, TX0 - 20);
      const g = ctx.createLinearGradient(0, TY - 5, 0, TY); g.addColorStop(0, '#e8505a'); g.addColorStop(1, '#c23b46');
      ctx.fillStyle = g; ctx.fillRect(x0, TY - 4, Math.min(cr, tx1) - x0, 4);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let x = Math.ceil(x0 / 18) * 18; x < Math.min(cr, tx1); x += 18) ctx.fillRect(x, TY - 4, 8, 4);
    }
    ctx.restore();
    if (cr > tx1 && cl < tx1 + 400) {
      const hang = clamp((cr - tx1) * 0.5, 0, 110);
      ctx.fillStyle = '#d6454f'; ctx.beginPath(); ctx.moveTo(tx1 - 3, TY - 4); ctx.lineTo(tx1 + 6, TY - 1); ctx.lineTo(tx1 + 8, TY + hang); ctx.lineTo(tx1 - 3, TY + hang - 2); ctx.closePath(); ctx.fill();
    }
    // 그릇 + 컵
    const dxp = TX0 + (0.4 + r.dx) * CPPM, dw = 0.23 * CPPM;
    ctx.save();
    if (r.fell) { ctx.translate(dxp + dw / 2, TY - 10 + r.fy * CPPM * 0.6); ctx.rotate(r.frot); ctx.translate(-(dxp + dw / 2), -(TY - 10)); }
    const shake = (r.shake > 0 && !RM) ? Math.sin(S.clock * 60) * 1.5 * r.shake : 0;
    ctx.translate(shake, 0);
    D.shadow(() => { D.roundRect(dxp, TY - 15, dw, 11, 6); ctx.fillStyle = '#f4f6fb'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#b8c2d4'; ctx.lineWidth = 1.5; D.roundRect(dxp, TY - 15, dw, 11, 6); ctx.stroke();
    const cw = dw * 0.4, cx0 = dxp + dw / 2 - cw / 2;
    D.roundRect(cx0, TY - 15 - cw * 0.9, cw, cw * 0.9, 5); ctx.fillStyle = '#6ea8fe'; ctx.fill();
    ctx.strokeStyle = '#6ea8fe'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx0 + cw + 2, TY - 15 - cw * 0.45, cw * 0.28, -1.4, 1.4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(cx0 + 4, TY - 15 - cw * 0.8, 4, cw * 0.55);
    ctx.restore();
    if (r.shake > 0) r.shake = Math.max(0, r.shake - 0.03);
    // 손
    {
      const hang = cr > tx1 ? clamp((cr - tx1) * 0.5, 0, 110) : 0;
      const hx = Math.min(cr, tx1 + 10) + 12, hy = TY - 14 + hang * 0.9;
      if (cl < tx1 + 60) T(hx, hy + 8, '✊', PHONE ? 26 : 30, '#000', 'left', 700);
    }
    // 화살표
    if (r.st === 'run' && !r.fell) {
      const on = r.cx < 0.48 + r.dx;
      if (on && r.dv < r.vc - 0.01) T(TX0 + 20, 90, '천과 그릇 사이에 마찰력이 아주 짧게 작용해요', PHONE ? 12 : 14, '#c0392b', 'left', 800);
      D.arrow(dxp + dw / 2, TY - 62, dxp + dw / 2 + clamp(r.dv * (PHONE ? 30 : 50), 0, 120), TY - 62, { color: '#14a058', width: 4, label: '그릇 속도 ' + r.dv.toFixed(2) + ' m/s', labelOffset: -16 });
    }
    if (r.opt === 'fast' && r.st === 'run' && !RM && r.cx < 0.9) D.label(VW - 80, 30, '🐌 슬로모션', { bg: '#26324a', size: 13 });
    T(TX0 + 4, 40, '천 위의 그릇은 정지해 있어요', PHONE ? 14 : 16, '#26324a', 'left', 800);
    T(TX0 + 4, 62, '당기는 빠르기: ' + (r.opt === 'fast' ? '빠르게 (5 m/s)' : '천천히 (0.6 m/s)'), PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
  }
  function drawCoin(r) {
    drawRoom(KTY);
    const tg = ctx.createLinearGradient(0, KTY, 0, VH); tg.addColorStop(0, '#c49a66'); tg.addColorStop(1, '#a9824f'); ctx.fillStyle = tg; ctx.fillRect(0, KTY, VW, VH - KTY);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(0, KTY, VW, 3);
    const cx = KCX;
    ctx.save(); ctx.translate(KCX, KTY); ctx.scale(KZ, KZ); ctx.translate(-KCX, -KTY);
    // 컵(유리)
    const glass = () => { ctx.beginPath(); ctx.moveTo(cx - 49, KRIM); ctx.lineTo(cx - 45, KTY); ctx.lineTo(cx + 45, KTY); ctx.lineTo(cx + 49, KRIM); };
    ctx.save(); glass(); ctx.closePath(); ctx.fillStyle = 'rgba(180,215,245,.35)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(120,170,215,.9)'; ctx.lineJoin = 'round'; glass(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx - 38, KRIM + 10, 5, 60);
    // 카드 + 동전
    const cardCx = cx + r.xc * KPPM;
    const coinY = COIN0 + r.coinY * KPPM;
    const coinX = cx + r.coinX * KPPM;
    ctx.save();
    ctx.translate(cardCx, KRIM - 2.5 + r.cardY * KPPM); ctx.rotate(r.cardRot);
    D.shadow(() => { D.roundRect(-85, -2.5, 170, 5, 2); ctx.fillStyle = '#ffd25a'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.restore();
    ctx.save(); D.roundRect(coinX - 12, coinY - 3, 24, 6, 3); ctx.fillStyle = '#f2b61e'; ctx.fill(); ctx.strokeStyle = '#a97800'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    // 손가락
    const startX = cx - 85 - 90, hitX = cx - 85;
    const fingX = r.phase === 'aim' ? startX + (hitX - startX) * SciSim.ease.inCubic(r.fing) : hitX + Math.min(r.xc * KPPM, 30) + 0;
    const fa = r.phase === 'aim' || r.xc * KPPM < 60 ? 1 : Math.max(0, 1 - (r.xc * KPPM - 60) / 80);
    ctx.save(); ctx.globalAlpha = fa; D.roundRect(fingX - 62, KRIM - 24, 60, 22, 11); ctx.fillStyle = '#f2c9a0'; ctx.fill(); ctx.strokeStyle = '#d9a374'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.restore();
    // 설명
    T(24, 40, '카드 위의 동전은 정지해 있어요', PHONE ? 14 : 16, '#26324a', 'left', 800);
    T(24, 62, '카드를 튕기는 세기: ' + (r.opt === 'fast' ? '세게 (6 m/s)' : '약하게 (0.4 m/s)'), PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
    if (r.st === 'run' && r.opt === 'fast' && !RM && r.phase === 'fly' && !r.landed) D.label(VW - 80, 30, '🐌 슬로모션', { bg: '#26324a', size: 13 });
    if (r.released && !r.landed) { const aY = coinY + 14; D.arrow(coinX, aY, coinX, aY + 34, { color: '#7c5cff', width: 4, label: '중력', labelOffset: 22 }); }
  }
  function drawStop(r) {
    const sg = ctx.createLinearGradient(0, 0, 0, STOPGY); sg.addColorStop(0, '#dcebfb'); sg.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sg; ctx.fillRect(0, 0, VW, STOPGY);
    ctx.fillStyle = '#dbe7f6'; [[40, 70, 60], [130, 110, 50], [200, 80, 70], [330, 120, 55], [420, 90, 65], [520, 130, 50]].forEach((b) => ctx.fillRect(b[0] * VW / 800, STOPGY - b[1] - 20, b[2] * VW / 800, b[1] + 20));
    ctx.fillStyle = 'rgba(255,255,255,.9)'; [[160, 120], [520, 100], [690, 150]].forEach((c) => { const cx0 = c[0] * VW / 800; ctx.beginPath(); ctx.arc(cx0, c[1] + 40, 18, 0, TAU); ctx.arc(cx0 + 22, c[1] + 44, 14, 0, TAU); ctx.arc(cx0 - 20, c[1] + 46, 12, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#d8e3f2'; ctx.fillRect(0, STOPGY, VW, VH);
    ctx.fillStyle = '#9aa8be'; ctx.fillRect(0, STOPGY, VW, 6);
    for (let x = 0; x < VW; x += 60) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x + 8, STOPGY + 26, 30, 4); }
    // 벽
    D.shadow(() => { ctx.fillStyle = '#c0553f'; ctx.fillRect(STOPX_WALL, STOPGY - 150, 34, 150); }, { blur: 8, y: 2 });
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
    for (let y = STOPGY - 150; y < STOPGY; y += 15) { ctx.beginPath(); ctx.moveTo(STOPX_WALL, y); ctx.lineTo(STOPX_WALL + 34, y); ctx.stroke(); }
    const cc = STOPX_RUN - STOP_D0 + r.x;
    const shakeX = r.hit && r.tHit < 0.25 && !RM ? Math.sin(r.tHit * 90) * 2 * (1 - r.tHit / 0.25) : 0;
    drawCartBase(cc + shakeX, STOPGY, STCW, 0.28 * STPPM, 0, '#4a78d8');
    const baseY = STOPGY - 0.28 * STPPM - 12;
    drawDoll(cc + shakeX, baseY, STOPL * STPPM, r.th, {});
    // 화살표
    if (!r.hit) {
      D.arrow(cc, baseY - STOPL * STPPM - 46, cc + 2.0 * (PHONE ? 22 : 30), baseY - STOPL * STPPM - 46, { color: '#14a058', width: 5, label: '수레와 인형 2.0 m/s', labelOffset: -18 });
    } else if (r.th < 1.3) {
      const hx = cc + Math.sin(r.th) * STOPL * STPPM, hy = baseY - Math.cos(r.th) * STOPL * STPPM - 30;
      D.arrow(hx - 6, hy, hx - 6 + 52, hy, { color: '#14a058', width: 4.5, label: '인형은 계속 앞으로!', labelOffset: -16 });
      T(cc, STOPGY + 52, '수레 속력 0 (벽에 멈춤)', PHONE ? 13 : 14, '#c0392b', 'center', 800);
    }
    if (r.hit && !RM && r.tHit < 1.4) D.label(VW - 80, 30, '🐌 슬로모션', { bg: '#26324a', size: 13 });
    T(24, 40, '수레 위 인형은 수레와 함께 달려요', PHONE ? 14 : 16, '#26324a', 'left', 800);
    T(24, 62, '수레가 벽에 부딪혀 갑자기 멈추면?', PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
  }
  function drawStart(r) {
    // 하늘·배경
    const g = ctx.createLinearGradient(0, 0, 0, BGY); g.addColorStop(0, '#d6e8fb'); g.addColorStop(1, '#eaf6ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, BGY);
    ctx.fillStyle = '#7d8aa0'; ctx.fillRect(0, BGY, VW, VH - BGY);
    ctx.fillStyle = '#5c687c'; ctx.fillRect(0, BGY, VW, 8);
    const off = r.off;
    // 가로수·표지
    for (let i = -2; i < 12; i++) {
      const x = ((i * 190 - off) % (190 * 12) + 190 * 12) % (190 * 12) - 190;
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x, BGY - 90, 8, 90);
      ctx.fillStyle = '#4fae62'; ctx.beginPath(); ctx.arc(x + 4, BGY - 100, 28, 0, TAU); ctx.fill();
    }
    for (let x = (-off * 1 % 80 + 80) % 80 - 80; x < VW; x += 80) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, BGY + 40, 42, 5); }
    // 버스
    const bl = PHONE ? 4.4 : 5.0, bw = bl * BPPM, bx = (VW - bw) / 2, bt = BGY - 2.6 * BPPM;
    const bounce = r.a > 0 && !RM ? Math.sin(S.clock * 30) * 0.8 : 0;
    ctx.save(); ctx.translate(0, bounce);
    D.shadow(() => { D.roundRect(bx, bt, bw, 2.6 * BPPM - 14, 16); ctx.fillStyle = '#f5c542'; ctx.fill(); }, { blur: 10, y: 4 });
    D.roundRect(bx + 10, bt + 22, bw - 20, 1.7 * BPPM + 20, 10); ctx.fillStyle = '#e8f4ff'; ctx.fill();
    ctx.fillStyle = '#cfd8e6'; ctx.fillRect(bx + 10, BGY - 14 - 0.28 * BPPM, bw - 20, 0.28 * BPPM);
    ctx.strokeStyle = 'rgba(120,130,150,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 20, bt + 40); ctx.lineTo(bx + bw - 20, bt + 40); ctx.stroke();
    [bx + bw * 0.18, bx + bw * 0.82].forEach((wx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(wx, BGY - 6, 20, 0, TAU); ctx.fill(); ctx.fillStyle = '#aeb8c8'; ctx.beginPath(); ctx.arc(wx, BGY - 6, 8, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(bx + bw - 14, BGY - 50, 10, 12);
    // 승객
    const fx0 = bx + bw * 0.5, fy0 = BGY - 14 - 0.28 * BPPM, H = 1.55 * BPPM;
    ctx.strokeStyle = 'rgba(120,130,150,.5)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.lineTo(fx0, fy0 - H - 16); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(fx0, fy0); ctx.rotate(-r.th);
    ctx.strokeStyle = '#3b4a68'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-4, -H * 0.5); ctx.moveTo(8, 0); ctx.lineTo(4, -H * 0.5); ctx.stroke();
    ctx.strokeStyle = '#e2643a'; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(0, -H * 0.48); ctx.lineTo(0, -H * 0.82); ctx.stroke();
    ctx.strokeStyle = '#e8b98a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -H * 0.8); ctx.lineTo(-9, -H * 0.55); ctx.moveTo(0, -H * 0.8); ctx.lineTo(10, -H * 0.55); ctx.stroke();
    ctx.fillStyle = '#f0c6a0'; ctx.beginPath(); ctx.arc(0, -H * 0.93, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b2150'; ctx.beginPath(); ctx.arc(4, -H * 0.945, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    // 라벨·화살표
    if (r.a > 0) D.arrow(bx + bw * 0.5 - 20, bt - 18, bx + bw * 0.5 + 64, bt - 18, { color: '#e07b00', width: 6, label: '버스 가속 3 m/s²', labelOffset: -20 });
    if (r.a > 0 && r.th > 0.12) D.label(fx0 - 56, fy0 - H - 30, '몸이 뒤로 젖혀져요', { bg: '#e2464b', size: PHONE ? 12 : 14 });
    T(24, 40, '서 있는 승객과 버스', PHONE ? 14 : 16, '#26324a', 'left', 800);
    T(24, 62, r.t < 1 ? '버스가 정지해 있어요' : r.t < 4 ? '버스가 속력을 높이는 중' : '버스가 일정한 속도로 달려요', PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
  }
  function drawLaneTrack(y, label, m) {
    const x0 = PHONE ? 12 : 30, x1 = VW - x0;
    drawFloorBody('air', y, x0 - 6, x1 + 6);
    T(x0 + 2, y + 58, label, PHONE ? 13 : 15, '#26324a', 'left', 800);
  }
  function drawMass(r, dt) {
    const y1 = PHONE ? 150 : 140, y2 = PHONE ? 320 : 330;
    const ppm = PHONE ? 46 : 78, x0 = PHONE ? 70 : 104;
    const lane = (y, m, x, v, label, color) => {
      drawLaneTrack(y, label, m);
      const bw = 0.9 * ppm, bh = 0.62 * ppm * (0.8 + Math.min(m, 4) * 0.08);
      const cx = x0 + x * ppm;
      drawBox(cx, y - 7, bw, bh, { label: m.toFixed(1) + ' kg', color });
      if (r.push && r.st === 'run') D.arrow(cx - bw / 2 - 52, y - 7 - bh / 2, cx - bw / 2 - 4, y - 7 - bh / 2, { color: '#e2464b', width: 5, label: '힘 2 N', labelOffset: -16 });
      if (v > 0.01) D.arrow(cx, y - bh - 24, cx + v * (PHONE ? 20 : 34), y - bh - 24, { color: '#14a058', width: 5, label: v.toFixed(2) + ' m/s', labelOffset: -16 });
    };
    lane(y1, 0.5, r.x1, r.v1, '가벼운 수레 0.5 kg', '#f2a65a');
    lane(y2, r.m, r.x2, r.v2, '무거운 수레 ' + r.m.toFixed(1) + ' kg', '#c9693a');
    T(24, 30, '같은 힘으로 밀기', PHONE ? 14 : 16, '#26324a', 'left', 800);
    T(24, 50, '시간 ' + Math.min(r.t, 4).toFixed(1) + ' s', PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
  }

  /* ================= ③ 속도 그래프 ================= */
  const GT = 20, GV0 = 2.0, GMASS = 1000, GFORCE = 500, VMIN = -8, VMAX = 12;
  const GX0 = PHONE ? 58 : 96, GX1 = VW - (PHONE ? 16 : 30), GY0 = PHONE ? 258 : 304, GY1 = PHONE ? 528 : 490;
  const gx = (t) => GX0 + (GX1 - GX0) * t / GT, gy = (v) => GY1 - (GY1 - GY0) * (v - VMIN) / (VMAX - VMIN);
  const stars = []; for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * VW, y: Math.random(), z: 0.3 + Math.random() * 1.2, s: 0.8 + Math.random() * 1.6 });
  function resetGraph() {
    S.gr = { t: 0, v: GV0, th: 0, running: false, ended: false, hist: [{ t: 0, v: GV0, th: 0 }], lastS: 0, off1: 0, on: 0, off2: 0, used: false, flame: 0, stationary: false, maxOn: 0 };
    updateCtl();
  }
  function setThrust(th) { if (!S.gr) resetGraph(); S.gr.th = th; Sound.click(); updateCtl(); }
  function toggleFly() {
    const g = S.gr; if (g.ended) return;
    g.running = !g.running; Sound.click(); updateCtl();
  }
  function stepGraph(dt) {
    const g = S.gr; if (!g) return;
    g.flame = SciSim.approach(g.flame, g.th, dt, 10);
    if (!g.running) return;
    const a = g.th * GFORCE / GMASS;
    const dtt = Math.min(dt, GT - g.t);
    g.t += dtt; g.v += a * dtt;
    if (g.th === 0) { if (!g.used) g.off1 += dtt; else if (Math.abs(g.v - GV0) >= 0.5) g.off2 += dtt; }
    else { g.on += dtt; g.used = true; }
    while (g.t - g.lastS >= 0.05) { g.lastS += 0.05; g.hist.push({ t: g.lastS, v: g.v, th: g.th }); }
    if (g.t >= GT - 1e-9) { g.t = GT; g.running = false; g.ended = true; g.hist.push({ t: GT, v: g.v, th: g.th }); Sound.tick(); showHint('20초가 끝났어요. ↺ 처음으로를 누르면 다시 해 볼 수 있어요.', 4800); updateCtl(); }
    if (!RM && g.th !== 0 && Math.random() < dt * 60) {
      const sx = VW * 0.42, sy = shipY();
      if (g.th > 0) parts.emit({ x: sx - 86, y: sy + rnd(-5, 5), vx: -rnd(120, 190), vy: rnd(-12, 12), life: 0.6, size: rnd(2.4, 4.4), color: Math.random() < 0.5 ? '#ffb45a' : '#ffe08a', shape: 'circle', gravity: 0 });
      else parts.emit({ x: sx + 62, y: sy + rnd(-12, 12), vx: rnd(120, 190), vy: rnd(-10, 10), life: 0.5, size: rnd(2, 3.6), color: '#cfe6ff', shape: 'circle', gravity: 0 });
    }
  }
  const shipY = () => (PHONE ? 112 : 140);
  function drawShip(g, dt) {
    const sx = VW * 0.42, sy = shipY();
    // 우주 배경
    const top = PHONE ? 8 : 12, bh = PHONE ? 196 : 228;
    ctx.save(); D.roundRect(10, top, VW - 20, bh, 18); ctx.clip();
    const bg = ctx.createLinearGradient(0, top, 0, top + bh); bg.addColorStop(0, '#0e1630'); bg.addColorStop(1, '#1f2c55'); ctx.fillStyle = bg; ctx.fillRect(10, top, VW - 20, bh);
    stars.forEach((s) => {
      s.x -= g.v * 16 * s.z * dt * (RM ? 0.2 : 1);
      if (s.x < -4) s.x += VW + 8; if (s.x > VW + 4) s.x -= VW + 8;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.35 * s.z / 1.5) + ')';
      const len = clamp(Math.abs(g.v) * 1.1 * s.z, 0, 14);
      ctx.fillRect(s.x, top + 4 + s.y * (bh - 8), Math.max(s.s, len), s.s);
    });
    ctx.restore();
    // 우주선
    ctx.save(); ctx.translate(sx, sy);
    if (g.flame > 0.05) { const L = 30 + 46 * g.flame + (RM ? 0 : Math.sin(S.clock * 40) * 5); const fg = ctx.createLinearGradient(-60, 0, -60 - L, 0); fg.addColorStop(0, '#fff2b0'); fg.addColorStop(0.5, '#ffb347'); fg.addColorStop(1, 'rgba(255,100,40,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-58, -11); ctx.lineTo(-58 - L, 0); ctx.lineTo(-58, 11); ctx.closePath(); ctx.fill(); }
    if (g.flame < -0.05) { const L = 14 + 22 * -g.flame; const fg = ctx.createLinearGradient(52, 0, 52 + L, 0); fg.addColorStop(0, '#e8f6ff'); fg.addColorStop(1, 'rgba(160,210,255,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(48, -16); ctx.lineTo(52 + L, -20); ctx.lineTo(52 + L, -8); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(48, 16); ctx.lineTo(52 + L, 20); ctx.lineTo(52 + L, 8); ctx.closePath(); ctx.fill(); }
    D.shadow(() => {
      const bgd = ctx.createLinearGradient(0, -22, 0, 22); bgd.addColorStop(0, '#f4f7fb'); bgd.addColorStop(1, '#aeb9cc');
      ctx.fillStyle = bgd; ctx.beginPath(); ctx.moveTo(-60, -18); ctx.lineTo(24, -22); ctx.quadraticCurveTo(70, -10, 76, 0); ctx.quadraticCurveTo(70, 10, 24, 22); ctx.lineTo(-60, 18); ctx.closePath(); ctx.fill();
    }, { blur: 8, y: 2, color: 'rgba(0,0,0,.4)' });
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(-40, -18); ctx.lineTo(-62, -40); ctx.lineTo(-24, -20); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, 18); ctx.lineTo(-62, 40); ctx.lineTo(-24, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6ec6ff'; ctx.beginPath(); ctx.ellipse(28, -2, 14, 9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(24, -5, 5, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a6679'; ctx.fillRect(-62, -10, 6, 20);
    ctx.restore();
    // 화살표
    const vy = sy - 56;
    const vl = clamp(g.v * 9, -112, 112);
    if (Math.abs(g.v) > 0.05) D.arrow(sx, vy, sx + vl, vy, { color: '#4ade80', width: 5, label: '속도 ' + g.v.toFixed(1) + ' m/s', labelOffset: -18, labelBg: 'rgba(14,22,48,.85)' });
    else D.label(sx, vy, '속도 0.0 m/s', { bg: 'rgba(14,22,48,.85)', color: '#4ade80', size: 13 });
    if (g.th !== 0) {
      const fy = sy + (PHONE ? 42 : 52);
      if (g.th > 0) D.arrow(sx - 10, fy, sx + 76, fy, { color: '#ffb347', width: 6, label: '알짜힘 +500 N', labelOffset: 20, labelBg: 'rgba(14,22,48,.85)' });
      else D.arrow(sx + 10, fy, sx - 76, fy, { color: '#ffb347', width: 6, label: '알짜힘 −500 N', labelOffset: 20, labelBg: 'rgba(14,22,48,.85)' });
    } else {
      D.label(sx, sy + (PHONE ? 50 : 56), '알짜힘 0 N → 속도 그대로', { bg: 'rgba(14,22,48,.85)', color: '#d4e4ff', size: PHONE ? 12 : 14 });
    }
    if (g.th !== 0) T(24, PHONE ? top + bh - 10 : top + 30, g.th > 0 ? '가스를 뒤로 밀어내면 가스가 우주선을 앞으로 밀어요' : '가스를 앞으로 밀어내면 가스가 우주선을 뒤로 밀어요', PHONE ? 11 : 13, 'rgba(200,215,245,.9)', 'left', 700);
  }
  function drawGraph(g) {
    panel(GX0 - (PHONE ? 46 : 70), GY0 - 34, GX1 - GX0 + (PHONE ? 62 : 96), GY1 - GY0 + (PHONE ? 78 : 92), 16);
    // 격자
    ctx.lineWidth = 1;
    for (let v = VMIN; v <= VMAX; v += 2) {
      ctx.strokeStyle = v === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = v === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(GX0, gy(v)); ctx.lineTo(GX1, gy(v)); ctx.stroke();
      if (v % 4 === 0) T(GX0 - 8, gy(v) + 5, String(v), 13, '#3a465c', 'right', 800);
    }
    for (let t = 0; t <= GT; t += 5) {
      ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(t), GY0); ctx.lineTo(gx(t), GY1); ctx.stroke();
      T(gx(t), GY1 + 20, String(t), 13, '#3a465c', 'center', 800);
    }
    T(GX1, GY1 + 40, '시간 (s)', 13, '#3a465c', 'right', 800);
    T(GX0 - (PHONE ? 40 : 62), GY0 - 12, '속도 (m/s)', 13, '#3a465c', 'left', 800);
    T(GX1, GY0 - 12, g.th === 0 ? '지금: 기울기 0 (가로 직선)' : '지금: 기울기가 있어요 (속도가 변해요)', PHONE ? 12 : 14, g.th === 0 ? '#0b6b39' : '#c2570c', 'right', 800);
    // 선
    const col = (th) => (th === 0 ? '#14a058' : th > 0 ? '#f26b3a' : '#7c5cff');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4.5;
    const pts = g.hist.slice();
    if (g.running || g.t > (pts[pts.length - 1] || { t: 0 }).t) pts.push({ t: g.t, v: g.v, th: g.th });
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = col(pts[i].th); ctx.beginPath(); ctx.moveTo(gx(pts[i - 1].t), gy(clamp(pts[i - 1].v, VMIN, VMAX))); ctx.lineTo(gx(pts[i].t), gy(clamp(pts[i].v, VMIN, VMAX))); ctx.stroke();
    }
    const cx = gx(g.t), cy = gy(clamp(g.v, VMIN, VMAX));
    D.glow(cx, cy, 16, col(g.th), 0.5); D.sphere(cx, cy, 6, col(g.th), { gloss: false });
    // 범례
    const ly = GY1 + (PHONE ? 62 : 56);
    [['#14a058', '힘 0 (엔진 끔)'], ['#f26b3a', '앞으로 힘'], ['#7c5cff', '뒤로 힘']].forEach((l, i) => {
      const lx = GX0 - (PHONE ? 34 : 50) + i * (PHONE ? 140 : 190);
      ctx.fillStyle = l[0]; D.roundRect(lx, ly - 8, 22, 6, 3); ctx.fill(); T(lx + 28, ly, l[1], PHONE ? 12 : 14, '#3a465c', 'left', 800);
    });
  }
  function drawGraphScene(dt) {
    const g = S.gr;
    bgFill('#eaf1fb', '#f7faff');
    drawShip(g, dt);
    drawGraph(g);
    parts.update(dt); parts.draw(ctx);
    if (!g.running && g.t === 0) D.label(VW / 2, shipY() + (PHONE ? 74 : 92), '▶ 비행 시작을 눌러요', { bg: '#26324a', size: 14 });
  }
  $$('#thrustSeg button').forEach((b) => b.addEventListener('click', () => setThrust(+b.dataset.th)));
  $('#bFly').addEventListener('click', toggleFly);
  $('#bFlyReset').addEventListener('click', () => { Sound.click(); parts.clear(); resetGraph(); });

  /* ================= ④ 안전과 관성 ================= */
  const SPPM = PHONE ? 100 : 140, SGY = PHONE ? 350 : 356;
  const SM = 60;          // 승객 질량 (kg)
  const RMAX = 0.46;      // 앞유리에 닿는 앞쪽 이동 (m)
  const HEADGAP = 0.04;   // 머리받침과 머리 사이 간격 (m)
  const DANGER_DEG = 35;
  const SC_NAME = { brake: '급정거', rear: '후방 추돌' };
  function safetyReset() {
    const s = S.sf;
    s.run = { st: 'idle', t: 0, sc: s.sc, belt: s.belt, head: s.head, xA: 0, vA: 0, aA: 0, xB: -10.2, vB: 10, r: 0, rv: 0, crash: false, peak: 0, peakT: 0, tens: 0, peakTens: 0, bgoff: 0, hit: false, tHit: 0, flash: 0 };
    updateCtl();
  }
  function safetyRun() {
    const r = S.sf.run;
    if (r.st === 'run') return;
    if (r.st === 'done') safetyReset();
    S.sf.run.st = 'run'; Sound.click(); updateCtl();
  }
  function setScen(sc) { S.sf.sc = sc; safetyReset(); }
  function setBelt(b) { S.sf.belt = b; safetyReset(); }
  function setHead(h) { S.sf.head = h; safetyReset(); }
  const SAFE_KEY = (r) => r.sc + (r.sc === 'brake' ? r.belt : r.head);
  function stepSafety(dt) {
    const r = S.sf.run; if (!r || r.st !== 'run') return;
    if (r.sc === 'brake') {
      const tb = 0.8, aB = 9.0;
      const braking = r.t >= tb && r.vA > 0;
      const ts = RM ? 1 : (r.t < tb ? 1 : r.t < tb + 1.2 ? 0.4 : 0.9);
      stepSub(dt * ts, 0.002, (h) => {
        r.t += h;
        const a = r.t >= tb && r.vA > 0 ? aB : 0;
        r.aA = -a;
        r.vA = Math.max(0, r.vA + r.aA * h);
        if (r.t < tb) r.vA = 15;
        r.bgoff += r.vA * h * SPPM;
        let acc = a;
        if (r.belt) {
          const x = Math.max(0, r.r - 0.03);
          const ten = x > 0 ? SM * (120 * x + 14 * r.rv) : 0;
          r.tens = Math.max(0, ten); acc -= x > 0 ? (120 * x + 14 * r.rv) : 0;
        } else r.tens = 0;
        r.rv += acc * h; r.r += r.rv * h;
        if (r.r < 0) { r.r = 0; if (r.rv < 0) r.rv = 0; }
        if (!r.belt && r.r >= RMAX) { r.r = RMAX; if (!r.crash) { r.crash = true; r.flash = 1; r.hitSpeed = r.rv; Sound.fail(); } r.rv = 0; }
        if (r.r > r.peak) r.peak = r.r;
        if (r.tens > r.peakTens) r.peakTens = r.tens;
      });
      if (r.t > tb + 2.4 && r.vA <= 0 && Math.abs(r.rv) < 0.02 && r.st === 'run') {
        r.st = 'done';
        S.sf.tried[SAFE_KEY(r)] = true;
        if (!r.belt) { r.res = '안전벨트가 없으니 몸이 계속 앞으로 나아가 앞유리에 부딪혔어요. 위험해요!'; r.ok = false; }
        else { r.res = '안전벨트가 몸에 뒤쪽으로 힘을 주어 차와 함께 속도를 줄여 줬어요 (최대 장력 약 ' + Math.round(r.peakTens / 10) * 10 + ' N).'; r.ok = true; }
        Sound.success(); updateCtl();
      }
    } else {
      const hitT = 0.6, pulseT = 0.2, aP = 25;
      stepSub(dt * (RM ? 1 : (r.t < hitT - 0.15 ? 1 : r.t < hitT + 1.6 ? 0.4 : 0.9)), 0.002, (h) => {
        r.t += h;
        let a = 0;
        if (!r.hit) { r.xB += r.vB * h; if (r.xB + 2.1 >= r.xA - 2.1) { r.hit = true; r.tHit = 0; r.flash = 1; Sound.fail(); parts.burst(SCX_S - 2.1 * SPPM, SGY - 0.6 * SPPM, { count: 16, speed: 170, size: 3.2, colors: ['#ffd76a', '#fff', '#e2464b'], gravity: 160, life: 0.55 }); } }
        else {
          r.tHit += h;
          a = r.tHit < pulseT ? aP : 0;
          r.vA += a * h; r.xA += r.vA * h;
          r.vB = r.vA; r.xB = r.xA - 4.2 + 0.12 * Math.min(1, r.tHit / pulseT);
        }
        r.aA = a;
        r.bgoff += r.vA * h * SPPM;
        r.rv += (a - 150 * r.r - 8 * r.rv) * h; r.r += r.rv * h;
        if (r.head && r.r > HEADGAP) { r.r = HEADGAP; if (r.rv > 0) r.rv = 0; }
        if (r.r < 0) { r.r = 0; if (r.rv < 0) r.rv = 0; }
        if (r.r > r.peak) r.peak = r.r;
      });
      if (r.hit && r.tHit > 2.3 && r.st === 'run') {
        r.st = 'done'; S.sf.tried[SAFE_KEY(r)] = true;
        const deg = Math.round(Math.atan(r.peak / 0.17) * 180 / Math.PI);
        r.deg = deg; r.ok = deg <= DANGER_DEG;
        r.res = r.ok ? '머리받침이 머리를 받쳐 줘서 목이 최대 ' + deg + '°만 젖혀졌어요. 안전해요!' : '몸은 차와 함께 앞으로 밀렸지만 머리는 관성 때문에 제자리에 남아 목이 최대 ' + deg + '°나 젖혀졌어요. 위험해요!';
        Sound.success(); updateCtl();
      }
    }
    if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 2.2);
  }
  const SCX_S = VW / 2;
  const P = (ox, x, y) => [ox + x * SPPM, SGY - y * SPPM];
  function pathM(ox, pts) { ctx.beginPath(); pts.forEach((p, i) => { const q = P(ox, p[0], p[1]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); }
  function drawCar(ox, color, opt) {
    opt = opt || {};
    // 바퀴
    [-1.3, 1.3].forEach((wx) => { const q = P(ox, wx, 0.34); ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(q[0], q[1], 0.34 * SPPM, 0, TAU); ctx.fill(); ctx.fillStyle = '#aeb8c8'; ctx.beginPath(); ctx.arc(q[0], q[1], 0.15 * SPPM, 0, TAU); ctx.fill(); });
    // 유리창 안쪽 (단면)
    D.shadow(() => {
      pathM(ox, [[-2.1, 0.3], [-2.1, 0.85], [-1.45, 0.95], [-1.0, 1.5], [0.54, 1.5], [0.04, 0.98], [2.1, 0.9], [2.1, 0.3]]); ctx.closePath(); ctx.fillStyle = opt.glass || 'rgba(214,236,252,.75)'; ctx.fill();
    }, { blur: 10, y: 4 });
    // 실내 바닥
    pathM(ox, [[-1.75, 0.3], [-1.75, 0.48], [0.5, 0.48], [0.5, 0.3]]); ctx.closePath(); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    // 몸통(아래쪽 패널)
    pathM(ox, [[-2.1, 0.3], [-2.1, 0.85], [-1.7, 0.9], [-1.75, 0.76], [0.5, 0.76], [0.5, 0.9], [2.1, 0.9], [2.1, 0.3]]); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = C.shade(color, -0.35); ctx.lineWidth = 3; ctx.lineJoin = 'round';
    pathM(ox, [[-2.1, 0.3], [-2.1, 0.85], [-1.45, 0.95], [-1.0, 1.5], [0.54, 1.5], [0.04, 0.98], [2.1, 0.9], [2.1, 0.3]]); ctx.closePath(); ctx.stroke();
    // 대시보드
    pathM(ox, [[0.04, 0.78], [0.04, 0.98], [0.5, 0.98], [0.5, 0.78]]); ctx.closePath(); ctx.fillStyle = '#4b5563'; ctx.fill();
    // 좌석
    pathM(ox, [[-0.78, 0.48], [-0.78, 0.58], [-0.1, 0.58], [-0.1, 0.48]]); ctx.closePath(); ctx.fillStyle = '#5b6b8a'; ctx.fill();
    pathM(ox, [[-0.66, 0.5], [-0.47, 0.5], [-0.47, 1.12], [-0.6, 1.12]]); ctx.closePath(); ctx.fillStyle = '#5b6b8a'; ctx.fill();
    // 헤드라이트
    const hl = P(ox, 2.1, 0.62); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(hl[0] - 3, hl[1], 5, 9, 0, 0, TAU); ctx.fill();
    const tl = P(ox, -2.1, 0.66); ctx.fillStyle = '#e2464b'; ctx.fillRect(tl[0], tl[1] - 8, 5, 16);
  }
  function drawDummy(ox, r, o) {
    // r: 브레이크 상황에서 머리의 앞쪽 이동, rear: 머리의 뒤쪽 이동
    const hip = [-0.35, 0.62];
    let th = 0, rh = 0;
    if (o.sc === 'brake') th = Math.asin(clamp(r.r / 0.72, 0, 0.99)); else rh = r.r;
    const sh = [hip[0] + 0.55 * Math.sin(th), hip[1] + 0.55 * Math.cos(th)];
    const head = o.sc === 'brake' ? [sh[0] + 0.17 * Math.sin(th), sh[1] + 0.17 * Math.cos(th)] : [sh[0] - rh, sh[1] + 0.17];
    const knee = [0.1, 0.62], foot = [0.12, 0.12];
    const L = (a, b, w, c) => { const p = P(ox, a[0], a[1]), q = P(ox, b[0], b[1]); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
    L(hip, knee, 0.15 * SPPM, '#3b4a68'); L(knee, foot, 0.12 * SPPM, '#3b4a68');
    const fp = P(ox, foot[0] + 0.07, foot[1]); ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.ellipse(fp[0], fp[1], 0.12 * SPPM, 0.05 * SPPM, 0, 0, TAU); ctx.fill();
    L(hip, sh, 0.24 * SPPM, '#f2873a');
    const hand = [sh[0] + 0.35 * Math.cos(th * 0.5), sh[1] - 0.32];
    L(sh, hand, 0.08 * SPPM, '#f0c6a0');
    // 목 + 머리
    L(sh, head, 0.07 * SPPM, '#e8b98a');
    const hp = P(ox, head[0], head[1]);
    D.sphere(hp[0], hp[1], 0.11 * SPPM, '#f3cfa8', { gloss: false });
    ctx.fillStyle = '#2b2150'; ctx.beginPath(); ctx.arc(hp[0] + 0.045 * SPPM, hp[1] - 0.01 * SPPM, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hp[0] - 0.01 * SPPM, hp[1] - 0.02 * SPPM, 0.115 * SPPM, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // 안전벨트
    if (o.belt) {
      const anchor = P(ox, -0.66, 1.3), chest = P(ox, hip[0] + 0.4 * Math.sin(th) + 0.1 * Math.cos(th), hip[1] + 0.4 * Math.cos(th) - 0.1 * Math.sin(th)), buckle = P(ox, -0.28, 0.6);
      const tens = clamp(r.tens / 800, 0, 1);
      ctx.strokeStyle = tens > 0.05 ? C.mix('#1e3a8a', '#ef4444', tens) : '#1e3a8a'; ctx.lineWidth = 4 + tens * 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(chest[0], chest[1]); ctx.lineTo(buckle[0], buckle[1]); ctx.stroke();
    }
    // 머리받침
    if (o.head) {
      const post = P(ox, -0.55, 1.12), top = P(ox, -0.55, 1.2); ctx.strokeStyle = '#46567a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(post[0], post[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      const hq = P(ox, -0.5, 1.42);
      D.roundRect(hq[0] - 0.1 * SPPM, hq[1], 0.1 * SPPM, 0.22 * SPPM, 6); ctx.fillStyle = '#7d8fb3'; ctx.fill(); ctx.strokeStyle = '#46567a'; ctx.lineWidth = 2; ctx.stroke();
    }
    return { head, sh, hip, th, hp };
  }
  function drawRoad(off, y) {
    ctx.fillStyle = '#7d8aa0'; ctx.fillRect(0, y, VW, VH - y);
    ctx.fillStyle = '#5c687c'; ctx.fillRect(0, y, VW, 6);
    const per = 120; const o = ((off % per) + per) % per;
    for (let x = -o; x < VW; x += per) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, y + 56, 60, 5); }
    for (let i = 0; i < 12; i++) {
      const per2 = 260; const x = (((i * 260 - off * 0.55) % (260 * 12)) + 260 * 12) % (260 * 12) - 260;
      ctx.fillStyle = '#9aa7bc'; ctx.fillRect(x, y - 150, 6, 150); ctx.fillStyle = '#7d8aa0'; ctx.fillRect(x - 12, y - 154, 30, 8);
    }
  }
  function drawSafety(dt) {
    const r = S.sf.run;
    const g = ctx.createLinearGradient(0, 0, 0, SGY); g.addColorStop(0, '#d6e8fb'); g.addColorStop(1, '#eaf6ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SGY);
    drawRoad(r.bgoff, SGY);
    // 차
    if (r.sc === 'rear') {
      const bx = SCX_S + (r.xB - r.xA) * SPPM;
      if (bx > -3 * SPPM) drawCar(bx, '#e2464b', { glass: 'rgba(214,236,252,.6)' });
    }
    drawCar(SCX_S, '#3a6fd8');
    const d = drawDummy(SCX_S, r, { sc: r.sc, belt: r.sc === 'brake' && r.belt, head: r.sc === 'rear' && r.head });
    // 충돌 효과
    if (r.crash && r.flash > 0) { const hp = d.hp; D.glow(hp[0] + 12, hp[1], 70 * r.flash + 20, '#ff6b4a', 0.6 * r.flash); T(hp[0] + 40, hp[1] - 36, '쾅!', 22, '#c0392b', 'center', 800, { stroke: '#fff' }); }
    if (r.sc === 'rear' && r.hit && r.flash > 0) { const q = P(SCX_S, -2.1, 0.7); D.glow(q[0], q[1], 60 * r.flash + 20, '#ffb400', 0.7 * r.flash); }
    // 화살표
    if (r.sc === 'brake') {
      const ay = SGY - 2.0 * SPPM;
      if (r.vA > 0.05) D.arrow(SCX_S - 20, ay, SCX_S - 20 + r.vA * (PHONE ? 4 : 5.5), ay, { color: '#14a058', width: 6, label: '차 속력 ' + (r.vA * 3.6).toFixed(0) + ' km/h', labelOffset: -20 });
      if (r.aA < 0 && r.vA > 0.05) D.arrow(SCX_S + 2.4 * SPPM, SGY - 0.55 * SPPM, SCX_S + 1.3 * SPPM, SGY - 0.55 * SPPM, { color: '#e2464b', width: 5, label: '차를 멈추게 하는 힘', labelOffset: -18 });
      if (r.r > 0.05 && r.st === 'run') { const hp = d.hp; D.arrow(hp[0] + 18, hp[1] - 0.42 * SPPM, hp[0] + 18 + 52, hp[1] - 0.42 * SPPM, { color: '#14a058', width: 4.5, label: '몸은 계속 앞으로', labelOffset: -16 }); }
      if (r.belt && r.tens > 20) D.label(SCX_S - 1.2 * SPPM, SGY - 1.95 * SPPM + 20, '벨트 장력 ' + Math.round(r.tens / 10) * 10 + ' N', { bg: '#1e3a8a', size: PHONE ? 12 : 13 });
    } else {
      if (r.aA > 0) D.arrow(SCX_S - 2.0 * SPPM, SGY - 0.9 * SPPM, SCX_S - 0.9 * SPPM, SGY - 0.9 * SPPM, { color: '#e2464b', width: 6, label: '뒤차가 미는 힘', labelOffset: -20 });
      if (r.r > 0.04) { const hp = d.hp; D.label(hp[0] - 60, hp[1] - 36, '머리는 제자리에 남으려 해요', { bg: '#e2464b', size: PHONE ? 11.5 : 13 }); }
      if (r.vA > 0.1) { const ay = SGY - 2.0 * SPPM; D.arrow(SCX_S - 20, ay, SCX_S - 20 + r.vA * (PHONE ? 8 : 11), ay, { color: '#14a058', width: 6, label: '앞차 속력 ' + (r.vA * 3.6).toFixed(0) + ' km/h', labelOffset: -20 }); }
    }
    if (!RM && r.st === 'run' && ((r.sc === 'brake' && r.t > 0.8 && r.t < 2.0) || (r.sc === 'rear' && r.hit && r.tHit < 1.6))) D.label(VW - 80, 30, '🐌 슬로모션', { bg: '#26324a', size: 13 });
    // 제목
    T(16, 30, '🚗 ' + SC_NAME[r.sc], PHONE ? 17 : 20, '#26324a', 'left', 800);
    T(16, 52, r.sc === 'brake' ? (r.belt ? '안전벨트를 맨 승객' : '안전벨트를 매지 않은 승객') : (r.head ? '머리받침이 있는 좌석' : '머리받침이 없는 좌석'), PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
    // 정보 패널
    const x = PHONE ? 10 : 24, w = VW - x * 2, py = SGY + (PHONE ? 100 : 100), ph = VH - py - 12;
    panel(x, py, w, ph, 16, r.st === 'done' ? (r.ok ? '#e7f7ee' : '#fdeceb') : '#fff');
    const title = r.st === 'done' ? (r.ok ? '✅ 안전해요' : '⚠️ 위험해요') : r.st === 'run' ? '관찰하는 중…' : '🔎 ' + SC_NAME[r.sc];
    T(x + 16, py + 28, title, PHONE ? 15 : 17, '#26324a', 'left', 800);
    const idle = r.sc === 'brake' ? '▶ 실행을 누르면 시속 54 km(15 m/s)로 달리던 차가 급정거해요. 벨트 유무를 바꿔 비교해 보세요.' : '▶ 실행을 누르면 정지한 차를 뒤차가 들이받아요. 머리받침 유무를 바꿔 비교해 보세요.';
    textBlock(x + 16, py + 54, w - 32, r.st === 'done' ? r.res : r.st === 'run' ? '' : idle, PHONE ? 14 : 15, '#3a465c', 22, 700);
  }

  /* ---------- 조작 연결 ---------- */
  $$('#caseSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); caseSelect(b.dataset.case); }));
  $$('#optSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cs.opt[S.cs.kind] = b.dataset.opt; parts.clear(); caseSelect(S.cs.kind, true); }));
  $('#bCaseRun').addEventListener('click', runCase);
  $('#bCaseReset').addEventListener('click', () => { Sound.click(); parts.clear(); caseSelect(S.cs.kind, true); });
  $('#sMass').addEventListener('input', (e) => {
    S.cs.mass = +e.target.value; $('#oMass').textContent = S.cs.mass.toFixed(1) + ' kg';
    e.target.style.setProperty('--pct', ((S.cs.mass - 1) / 3 * 100) + '%');
    parts.clear(); caseSelect('mass', true);
  });
  $$('#scenSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); setScen(b.dataset.sc); }));
  $$('#beltSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); setBelt(+b.dataset.belt); }));
  $$('#headSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); setHead(+b.dataset.head); }));
  $('#bSafeRun').addEventListener('click', safetyRun);
  $('#bSafeReset').addEventListener('click', () => { Sound.click(); parts.clear(); safetyReset(); });

  /* ---------- 관성 설명 연결 (2단계) ---------- */
  const MATCH = [
    ['cloth', '🍽️ 식탁보를 빼는 순간의 그릇', 'rest'], ['stop', '🧸 급정거한 수레 위의 인형', 'move'],
    ['coin', '🪙 카드를 튕길 때의 동전', 'rest'], ['start', '🚌 급출발하는 버스 속 승객', 'rest'],
  ];
  const matchRows = {};
  MATCH.forEach((m) => {
    const row = document.createElement('div'); row.className = 'match-row';
    row.innerHTML = '<span class="lab">' + m[1] + '</span><div class="segmented" role="group"><button type="button" data-v="rest">정지 유지</button><button type="button" data-v="move">운동 유지</button></div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      Sound.click(); S.cs.match[m[0]] = b.dataset.v; delete S.cs.matchOK[m[0]]; row.classList.remove('bad', 'ok');
      row.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('#matchRows').appendChild(row); matchRows[m[0]] = row;
  });
  function resetMatch() { S.cs.match = {}; S.cs.matchOK = {}; Object.values(matchRows).forEach((r) => { r.classList.remove('ok', 'bad'); r.querySelectorAll('button').forEach((x) => x.classList.remove('on')); }); }

  /* ---------- 안전 대책 고르기 (4단계) ---------- */
  const CARD_OPTS = ['안전벨트', '머리받침', '차간 거리 유지', '화물 고정'];
  const CARDS = [
    ['급정거할 때 승객의 몸이 앞으로 쏠려 앞유리에 부딪히는 것을 막으려면?', '안전벨트'],
    ['뒤차가 들이받을 때 머리가 뒤로 젖혀져 목을 다치는 것을 막으려면?', '머리받침'],
    ['앞차가 급정거해도 우리 차가 부딪히지 않고 멈출 수 있게 하려면?', '차간 거리 유지'],
    ['트럭이 급정거할 때 짐칸의 짐이 앞으로 날아가는 것을 막으려면?', '화물 고정'],
  ];
  const cardSel = [];
  CARDS.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + (i + 1) + '. ' + c[0] + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', (i + 1) + '번 상황의 안전 대책');
    sel.innerHTML = '<option value="">— 대책 고르기 —</option>' + CARD_OPTS.map((o) => '<option>' + o + '</option>').join('');
    sel.addEventListener('change', () => { S.sf.cards[i] = sel.value; sel.classList.remove('ok', 'bad'); delete S.sf.cardOK[i]; Sound.click(); });
    row.appendChild(sel); $('#cardRows').appendChild(row); cardSel.push(sel);
  });
  function resetCards() { S.sf.cards = {}; S.sf.cardOK = {}; cardSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 읽음 칸 ---------- */
  const degOf = (rr) => Math.round(Math.atan(rr / 0.17) * 180 / Math.PI);
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'floor') {
      const F = S.fl; L1 = '속력'; a = F.v.toFixed(1) + ' m/s'; L2 = '이동 거리'; b = F.x.toFixed(1) + ' m'; L3 = '마찰력'; c = fricNow(F).toFixed(2) + ' N';
    } else if (S.mode === 'cases') {
      const r = S.cs.run;
      if (r.k === 'cloth') { L1 = '그릇의 속도'; a = r.dv.toFixed(2) + ' m/s'; L2 = '그릇이 움직인 거리'; b = Math.round(r.dx * 100) + ' cm'; L3 = '천을 당기는 속력'; c = r.vc.toFixed(1) + ' m/s'; }
      else if (r.k === 'stop') { L1 = '수레 속력'; a = r.v.toFixed(1) + ' m/s'; L2 = '인형이 기운 각도'; b = Math.round(r.th * 180 / Math.PI) + '°'; L3 = '인형'; c = !r.hit ? '수레와 함께 이동' : r.lay ? '쓰러짐' : '앞으로 쏠리는 중'; }
      else if (r.k === 'coin') { L1 = '카드 속력'; a = r.vc.toFixed(1) + ' m/s'; L2 = '동전의 옆 이동'; b = Math.round(Math.abs(r.coinX) * 1000) + ' mm'; L3 = '동전'; c = !r.landed ? (r.released ? '떨어지는 중' : '카드 위') : r.inCup ? '컵 속에 쏙!' : '컵 밖으로'; }
      else if (r.k === 'start') { L1 = '버스 속력'; a = r.v.toFixed(1) + ' m/s'; L2 = '승객이 젖혀진 각도'; b = Math.round(Math.max(0, r.th) * 180 / Math.PI) + '°'; L3 = '버스 가속도'; c = r.a.toFixed(0) + ' m/s²'; }
      else { L1 = '가벼운 수레 속도'; a = r.v1.toFixed(2) + ' m/s'; L2 = r.m.toFixed(1) + ' kg 수레 속도'; b = r.v2.toFixed(2) + ' m/s'; L3 = '시간'; c = Math.min(r.t, 4).toFixed(1) + ' s'; }
    } else if (S.mode === 'graph') {
      const g = S.gr; L1 = '속도'; a = g.v.toFixed(1) + ' m/s'; L2 = '알짜힘'; b = (g.th > 0 ? '+' : g.th < 0 ? '−' : '') + Math.abs(g.th * GFORCE) + ' N'; L3 = '시간'; c = g.t.toFixed(1) + ' s';
    } else {
      const r = S.sf.run;
      L1 = r.sc === 'brake' ? '차 속력' : '앞 차 속력'; a = Math.round(r.vA * 3.6) + ' km/h';
      if (r.sc === 'brake') { L2 = '몸의 앞쪽 이동'; b = r.r.toFixed(2) + ' m'; L3 = r.belt ? '벨트 최대 장력' : '앞유리 충돌'; c = r.belt ? Math.round(r.peakTens / 10) * 10 + ' N' : (r.crash ? '충돌!' : '아직'); }
      else { L2 = '최대 목 젖힘'; b = degOf(r.peak) + '°'; L3 = '판정'; c = r.st !== 'done' ? (r.hit ? '측정 중…' : '—') : (r.ok ? '안전' : '위험'); }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const caseDoneAll = () => S.cs.done['cloth:fast'] && S.cs.done.stop && S.cs.done['coin:fast'] && S.cs.done.start;
  const levels = [
    {
      title: '마찰을 줄이면: 상자는 어디까지 갈까?', short: '마찰을 줄이면', icon: '🛷', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 움직이는 물체는 힘이 계속 작용해야만 계속 움직일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 힘이 작용하면 물체의 속력이나 방향(운동 상태)이 변한다는 것을 배웠어요. 이번에는 거꾸로, 힘(상호작용)이 거의 없으면 어떻게 되는지 알아봐요.</div>' +
        '<p>같은 상자를 <b>2 m/s</b>로 밀어 <b>거친 바닥 → 매끈한 얼음 → 에어 트랙</b>에서 얼마나 가는지 비교해요. 마찰은 물체의 운동을 방해하는 힘이에요.</p>',
      features: ['floor'],
      setup() { S.fl = null; resetFloor(); setScene('floor'); },
      recap: '마찰이 작을수록 상자는 더 멀리 가요. 마찰이 거의 없는 에어 트랙에서는 속력이 변하지 않았어요.',
      summary: '<ul><li>같은 속력(2 m/s)으로 밀어도 <b>거친 바닥에서는 2 m, 얼음에서는 8 m</b>, 마찰이 거의 없는 <b>에어 트랙에서는 계속 2 m/s</b>로 나아가요.</li><li>물체가 멈추는 까닭은 <b>마찰력</b>이라는 힘(상호작용)이 운동을 방해하기 때문이에요.</li><li>마찰이 줄수록 속력이 덜 줄어요 → 마찰이 없으면 속력은 변하지 않을 거예요.</li></ul>',
      missions: [
        {
          title: '바닥 3종에서 상자 밀기',
          goal: '<b>거친 바닥 · 매끈한 얼음 · 에어 트랙</b>에서 상자를 각각 2 m/s로 밀어 이동 거리를 표에 모두 기록하세요.',
          hint: '바닥을 고르고 👉 2 m/s로 밀기를 눌러요. 상자가 멈추거나 10 m 끝에 닿으면 표에 기록돼요.',
          setup() { setScene('floor'); },
          check: () => FLOORS.every((k) => S.fl.rec[k]),
          hold: 0.6,
          status: () => FLOORS.map((k) => mark(!!S.fl.rec[k]) + FR[k].name).join(' &nbsp; '),
          explain: '<b>거친 바닥은 2.0 m, 얼음은 8.0 m</b>에서 멈췄고, <b>에어 트랙은 10 m까지 계속 2.0 m/s</b>였어요. 마찰력이 작을수록 속력이 천천히 줄어요. 마찰이 없다면 속력이 전혀 변하지 않을 거예요.',
        },
        {
          type: 'quiz', title: '상자가 멈춘 까닭',
          goal: '거친 바닥에서 밀려 가던 상자가 멈춘 까닭으로 가장 알맞은 것은?',
          setup() { setScene('floor'); },
          choices: ['처음에 밀어 준 힘이 서서히 줄어들어서', '운동을 방해하는 마찰력이 상자에 계속 작용해서', '움직이는 물체는 원래 저절로 멈추게 되어 있어서', '상자의 질량이 점점 줄어들어서'],
          answer: 1,
          feedback: ['밀대는 처음 한 번만 상자를 밀었어요. 에어 트랙에서는 더 밀지 않아도 속력이 그대로였죠.', '', '에어 트랙에서는 멈추지 않았어요. 멈추는 데는 이유(힘)가 있어요.', '상자의 질량은 변하지 않아요.'],
          explain: '상자는 <b>마찰력</b>이 운동 방향과 반대로 작용해서 속력이 줄다가 멈춰요. 에어 트랙처럼 마찰이 거의 없으면 <b>운동 방향으로 힘을 계속 주지 않아도</b> 같은 속력으로 계속 나아가요.',
        },
      ],
    },
    {
      title: '관성 현상: 원래 상태를 유지하려는 성질', short: '관성 현상', icon: '🧪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘(마찰)이 없으면 속력이 변하지 않는다는 것을 봤어요. 이처럼 물체가 <b>원래의 운동 상태를 유지하려는 성질</b>을 <b>관성</b>이라고 해요.</div>' +
        '<p>일상에서 관성이 나타나는 <b>네 가지 사례</b>를 실험하고, 정지해 있던 것과 움직이던 것이 어떻게 행동하는지 정리해요. 질량이 클수록 관성이 커서 운동 상태를 바꾸기 어려워요.</p>',
      features: ['cases', 'mass'],
      setup() { S.cs.done = {}; S.cs.ranMass = 0; resetMatch(); S.showMatch = false; setScene('cases'); caseSelect('cloth'); },
      recap: '정지해 있던 물체는 계속 정지하려 하고, 움직이던 물체는 계속 같은 속도로 움직이려 해요. 이 성질이 관성이고, 질량이 클수록 커요.',
      summary: '<ul><li><b>관성</b>: 물체가 원래의 운동 상태(정지 또는 등속 직선 운동)를 유지하려는 성질</li><li>정지 유지: 식탁보를 빠르게 뺀 그릇, 카드를 튕길 때의 동전, 급출발 때 뒤로 젖혀지는 몸</li><li>운동 유지: 급정거할 때 앞으로 쏠리는 몸·인형</li><li>같은 힘으로 밀어도 <b>질량이 클수록</b> 속도가 조금만 변해요 → 질량이 클수록 관성이 커요.</li></ul>',
      missions: [
        {
          title: '관성 현상 4가지 실험',
          goal: '<b>식탁보(빠르게) · 급정거 · 카드와 동전(세게) · 급출발</b> 네 사례를 모두 실행해 보세요.',
          hint: '사례를 고르고 ▶ 실행을 눌러요. 식탁보와 동전은 빠르게/세게로 해야 관성이 잘 보여요.',
          setup() { S.showMatch = false; setScene('cases'); updateCtl(); },
          check: () => !!caseDoneAll(),
          hold: 0.6,
          status: () => [['cloth:fast', '식탁보'], ['stop', '급정거'], ['coin:fast', '동전'], ['start', '급출발']].map((p) => mark(!!S.cs.done[p[0]]) + p[1]).join(' &nbsp; '),
          explain: '네 사례 모두 물체가 <b>원래의 운동 상태를 유지하려는 관성</b> 때문에 나타나요. 식탁보를 빠르게 빼면 그릇은 힘을 받는 시간이 짧아 거의 제자리에 남고, 급정거하면 인형은 계속 앞으로 나아가려 해요.',
        },
        {
          title: '관성 설명 연결하기', manual: true,
          goal: '네 사례에서 물체가 <b>정지 상태를 유지</b>하려 했는지, <b>운동 상태를 유지</b>하려 했는지 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '정지해 있다가 제자리에 남거나 뒤로 처지면 “정지 유지”, 달리다가 계속 앞으로 가면 “운동 유지”예요.',
          setup() { S.showMatch = true; resetMatch(); setScene('cases'); updateCtl(); },
          check() {
            const miss = MATCH.filter((m) => !S.cs.match[m[0]]);
            if (miss.length) return '아직 고르지 않은 사례가 ' + miss.length + '개 있어요.';
            const wrong = MATCH.filter((m) => S.cs.match[m[0]] !== m[2]);
            MATCH.forEach((m) => {
              const ok = S.cs.match[m[0]] === m[2];
              if (!ok && S.cs.matchOK[m[0]] !== false) { matchRows[m[0]].classList.remove('ok', 'bad'); void matchRows[m[0]].offsetWidth; matchRows[m[0]].classList.add('bad'); }
              if (ok) { matchRows[m[0]].classList.remove('bad'); matchRows[m[0]].classList.add('ok'); }
              S.cs.matchOK[m[0]] = ok;
            });
            if (wrong.length) return '빨간 사례를 다시 생각해 보세요. 실험 전에 그 물체는 정지해 있었나요, 움직이고 있었나요?';
            return true;
          },
          status: () => '고른 사례 ' + MATCH.filter((m) => S.cs.match[m[0]]).length + ' / 4',
          explain: '<b>정지 유지</b>: 식탁보의 그릇, 카드 위의 동전, 급출발할 때의 승객(몸은 정지해 있던 상태를 유지해 뒤로 젖혀져요). <b>운동 유지</b>: 급정거한 수레 위 인형은 달리던 운동 상태를 유지해 앞으로 쏠려요.',
        },
        {
          title: '질량이 크면 관성도 크다',
          goal: '<b>질량 비교</b>에서 무거운 수레를 <b>4.0 kg</b>으로 맞추고 ▶ 실행해, 같은 힘(2 N)을 0.5초 주었을 때 속도를 비교하세요.',
          hint: '사례에서 ⚖️ 질량 비교를 고르고 슬라이더를 4.0 kg으로 옮긴 뒤 ▶ 실행을 눌러요. 4초가 지날 때까지 기다려요.',
          setup() { S.showMatch = false; S.cs.mass = 4; $('#sMass').value = 4; $('#sMass').dispatchEvent(new Event('input')); setScene('cases'); caseSelect('mass'); },
          check: () => S.cs.ranMass >= 4,
          hold: 0.5,
          status: () => mark(S.cs.ranMass >= 4) + ' 4.0 kg 수레 실험 ' + (S.cs.ranMass >= 4 ? '완료' : '(아직)'),
          explain: '같은 힘을 같은 시간 주었는데 0.5 kg 수레는 <b>2.00 m/s</b>, 4.0 kg 수레는 <b>0.25 m/s</b>가 되었어요. <b>질량이 클수록 관성이 커서</b> 운동 상태가 잘 바뀌지 않아요.',
        },
      ],
    },
    {
      title: '속도 그래프: 힘이 없으면 속도는?', short: '속도 그래프', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 관성 때문에 물체는 운동 상태를 유지하려 하고, 속도를 바꾸려면 힘이 필요하다는 것을 봤어요. 이제 <b>시간–속도 그래프</b>로 힘과 속도 변화의 관계를 살펴봐요.</div>' +
        '<p>마찰이 없는 우주 공간에서 2.0 m/s로 날고 있는 우주선(1000 kg)이 있어요. <b>엔진(힘)을 켜고 끄며</b> 속도 그래프가 어떻게 달라지는지 보세요.</p>',
      features: ['graph'],
      setup() { parts.clear(); resetGraph(); setScene('graph'); },
      recap: '알짜힘이 0이면 속도가 변하지 않아서 그래프가 가로 직선이에요. 힘이 작용하는 동안에만 속도가 변해요.',
      summary: '<ul><li>시간–속도 그래프에서 <b>가로 직선</b> = 속도가 일정(등속 직선 운동) = <b>알짜힘 0</b></li><li><b>기울어진 구간</b> = 속도가 변하는 구간 = 힘이 작용하는 구간</li><li>힘이 없어지면 그때의 속도로 <b>계속 등속 운동</b>해요. (엔진을 끈 우주선)</li><li>상호작용(힘)은 서로 주고받아요. 우주선이 가스를 뒤로 밀면 가스도 우주선을 앞으로 밀어요.</li><li>알짜힘이 0이면 물체는 가속되지 않아요: <b>정지한 물체는 계속 정지, 운동하는 물체는 등속 직선 운동</b></li></ul>',
      missions: [
        {
          title: '그래프에 힘 있음·없음 구간 만들기',
          goal: '엔진을 <b>끈 채 3초</b> → <b>켜고 3초 이상</b> → 다시 <b>끄고 3초 이상</b> 날아, 그래프에 평평한 구간 · 기울어진 구간 · 새 높이의 평평한 구간을 만드세요.',
          hint: '▶ 비행 시작 후 엔진이 꺼진 채로 3초를 기다리고, 앞 +500 N을 3초 이상 켠 뒤 끔 0 N으로 돌려서 3초 이상 기다려요.',
          setup() { parts.clear(); resetGraph(); setScene('graph'); },
          check: () => S.gr.off1 >= 3 && S.gr.on >= 3 && S.gr.off2 >= 3,
          hold: 0.4,
          status: () => mark(S.gr.off1 >= 3) + ' 끈 채 ' + Math.min(3, S.gr.off1).toFixed(1) + '/3초 &nbsp; ' + mark(S.gr.on >= 3) + ' 켠 채 ' + Math.min(3, S.gr.on).toFixed(1) + '/3초 &nbsp; ' + mark(S.gr.off2 >= 3) + ' 다시 끈 채 ' + Math.min(3, S.gr.off2).toFixed(1) + '/3초',
          explain: '엔진을 끄면 알짜힘이 0이라 <b>속도가 변하지 않고 그래프가 가로 직선</b>이에요. 엔진을 켜면 속도가 바뀌어 <b>기울기</b>가 생기고, 다시 끄면 <b>그때의 속도로 계속 등속 운동</b>해요. 힘 500 N, 질량 1000 kg이면 1초마다 속도가 0.5 m/s씩 변해요.',
        },
        {
          type: 'quiz', title: '알짜힘이 0인 구간 찾기',
          goal: '아래 그래프에서 <b>물체에 작용하는 알짜힘이 0인 구간</b>은 어디일까요?',
          figure: '<svg viewBox="0 0 300 160" role="img" aria-label="구간 A는 속도 2 m/s로 일정, 구간 B는 속도가 2에서 4 m/s로 증가, 구간 C는 속도 4 m/s로 일정한 시간 속도 그래프" style="width:100%;max-width:320px"><rect x="0" y="0" width="300" height="160" rx="10" fill="#fff"/><g stroke="#cfd6e4" stroke-width="1"><line x1="40" y1="20" x2="40" y2="130"/><line x1="40" y1="130" x2="280" y2="130"/><line x1="40" y1="90" x2="280" y2="90"/><line x1="40" y1="50" x2="280" y2="50"/></g><g font-size="11" fill="#3a465c" font-weight="800"><text x="30" y="134" text-anchor="end">0</text><text x="30" y="94" text-anchor="end">2</text><text x="30" y="54" text-anchor="end">4</text><text x="34" y="14" text-anchor="end">속도(m/s)</text><text x="280" y="148" text-anchor="end">시간(s)</text></g><polyline points="40,90 120,90 180,50 280,50" fill="none" stroke="#f26b3a" stroke-width="4" stroke-linejoin="round"/><g font-size="14" font-weight="800" fill="#26324a" text-anchor="middle"><text x="80" y="78">A</text><text x="154" y="62">B</text><text x="236" y="40">C</text></g></svg>',
          setup() { setScene('graph'); },
          choices: ['A와 C', 'B만', 'A만', 'A, B, C 모두'],
          answer: 0,
          feedback: ['', 'B는 속도가 변하는 구간이라 힘이 작용해요. 알짜힘이 0인 구간은 속도가 일정한 구간이에요.', 'C도 가로 직선이에요. 속도가 4 m/s로 일정하니 이 구간에서도 알짜힘은 0이에요.', 'B 구간에서는 속도가 2 m/s에서 4 m/s로 변해요. 속도가 변하면 알짜힘이 작용한 거예요.'],
          explain: '<b>A와 C</b>는 속도가 일정한 가로 직선이라 알짜힘이 0이에요. 속도가 0이 아니어도(2 m/s, 4 m/s) 알짜힘이 0이면 <b>등속 직선 운동</b>을 계속해요. <b>B</b>에서는 속도가 변하므로 알짜힘이 작용해요.',
        },
      ],
    },
    {
      title: '안전과 관성: 사고를 줄이는 방법', short: '안전과 관성', icon: '🚗', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜힘이 0이면 속도가 변하지 않는다는 것을 확인했어요. 달리는 자동차 안의 사람도 <b>멈추지 않고 계속 나아가려는 관성</b>이 있어요.</div>' +
        '<p>급정거와 후방 추돌 장면에서 <b>안전벨트와 머리받침</b>이 있을 때와 없을 때를 비교하고, 사고 상황에 알맞은 안전 대책을 연결해요.</p>',
      features: ['safety'],
      setup() { parts.clear(); S.sf.tried = {}; resetCards(); S.showCards = false; S.sf.sc = 'brake'; S.sf.belt = 0; S.sf.head = 0; setScene('safety'); },
      recap: '급정거할 때는 몸이 관성으로 계속 앞으로 나아가려 해요. 안전벨트와 머리받침은 몸에 힘을 주어 속도를 안전하게 바꿔 줘요.',
      summary: '<ul><li>급정거하면 차는 멈추지만 몸은 <b>관성</b> 때문에 계속 앞으로 나아가려 해요. 몸이 “당겨지는” 것이 아니에요.</li><li><b>안전벨트</b>: 몸에 뒤쪽 힘을 주어 차와 함께 속도를 줄여 줘요.</li><li><b>머리받침</b>: 후방 추돌 때 제자리에 남으려는 머리를 받쳐 목이 젖혀지는 것을 막아요.</li><li><b>차간 거리 유지</b>, <b>화물 고정</b>도 관성을 고려한 대책이에요. 질량이 큰 트럭은 관성이 커서 멈추는 데 더 오래 걸려요.</li></ul>',
      missions: [
        {
          title: '네 가지 사고 장면 실험',
          goal: '<b>급정거(벨트 없음 · 있음)</b>와 <b>후방 추돌(머리받침 없음 · 있음)</b>을 모두 실행해 보세요.',
          hint: '상황을 고르고 벨트(또는 머리받침)를 바꾼 뒤 ▶ 실행을 눌러요. 끝날 때까지 기다려야 기록돼요.',
          setup() { S.showCards = false; setScene('safety'); updateCtl(); },
          check: () => ['brake0', 'brake1', 'rear0', 'rear1'].every((k) => S.sf.tried[k]),
          hold: 0.6,
          status: () => [['brake0', '급정거·벨트 ✕'], ['brake1', '급정거·벨트 ○'], ['rear0', '추돌·받침 ✕'], ['rear1', '추돌·받침 ○']].map((p) => mark(!!S.sf.tried[p[0]]) + p[1]).join(' &nbsp; '),
          explain: '벨트가 없으면 몸이 관성으로 <b>계속 앞으로 나아가 앞유리에 부딪혀요</b>. 벨트는 몸에 뒤쪽으로 힘을 주어 차와 함께 속도를 줄여 줘요. 후방 추돌 때는 머리가 제자리에 남으려 해서 목이 젖혀지는데, 머리받침이 이를 막아 줘요.',
        },
        {
          title: '사고 상황에 알맞은 대책 연결', manual: true,
          goal: '네 가지 사고 상황마다 관성을 고려한 <b>알맞은 안전 대책</b>을 하나씩 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '몸이 앞으로 쏠림 → 몸을 붙잡는 장치, 머리가 뒤로 젖혀짐 → 머리를 받치는 장치, 짐이 앞으로 날아감 → 짐을 묶는 일이에요.',
          setup() { S.showCards = true; resetCards(); setScene('safety'); updateCtl(); },
          check() {
            const miss = CARDS.filter((c, i) => !S.sf.cards[i]);
            if (miss.length) return '아직 고르지 않은 상황이 ' + miss.length + '개 있어요.';
            const used = new Set(Object.values(S.sf.cards));
            let bad = 0;
            CARDS.forEach((c, i) => {
              const ok = S.sf.cards[i] === c[1];
              if (!ok) bad++;
              if (!ok && S.sf.cardOK[i] !== false) { cardSel[i].classList.remove('ok', 'bad'); void cardSel[i].offsetWidth; cardSel[i].classList.add('bad'); }
              if (ok) { cardSel[i].classList.remove('bad'); cardSel[i].classList.add('ok'); }
              S.sf.cardOK[i] = ok;
            });
            if (bad) return '빨간 칸의 대책을 다시 골라 보세요. ' + (used.size < 4 ? '같은 대책을 두 번 고르지 않았나요?' : '관성 때문에 무엇이 어떻게 움직이려 하는지 생각해 보세요.');
            return true;
          },
          status: () => '고른 상황 ' + CARDS.filter((c, i) => S.sf.cards[i]).length + ' / 4',
          explain: '몸이 쏠릴 때는 <b>안전벨트</b>, 머리가 젖혀질 때는 <b>머리받침</b>, 앞차가 급정거해도 멈출 거리를 확보하려면 <b>차간 거리 유지</b>, 짐이 앞으로 날아가는 것은 <b>화물 고정</b>으로 막아요. 모두 물체가 원래 운동 상태를 유지하려는 관성을 고려한 대책이에요.',
        },
        {
          type: 'quiz', title: '트럭과 승용차의 정지 거리',
          goal: '같은 속력으로 달리던 <b>트럭과 승용차</b>가 <b>같은 크기의 제동력</b>으로 브레이크를 밟았어요. 어느 쪽이 더 멀리 가서 멈출까요?',
          setup() { S.showCards = false; setScene('safety'); updateCtl(); },
          choices: ['승용차 — 가벼워서 관성이 커요', '트럭 — 질량이 커서 관성이 크고 속도를 바꾸기 어려워요', '둘 다 같아요 — 속력이 같으니까요', '트럭 — 무거워서 중력이 더 크게 작용해요'],
          answer: 1,
          feedback: ['관성은 질량이 클수록 커요. 승용차가 아니라 질량이 더 큰 쪽의 관성이 더 커요.', '', '속력이 같아도 질량이 다르면 관성의 크기가 달라요. 같은 힘이면 질량이 큰 쪽이 속도가 덜 줄어요.', '중력은 아래 방향 힘이라 앞으로 가는 운동과 직접 관계가 없어요. 질량이 커서 관성이 큰 거예요.'],
          explain: '질량이 클수록 <b>관성이 커서</b> 같은 힘을 받아도 속도가 천천히 줄어요. 그래서 트럭은 더 멀리 가서 멈추고, 큰 차는 안전거리를 더 길게 두어야 해요.',
        },
        {
          type: 'quiz', title: '급정거할 때 몸이 쏠리는 까닭',
          goal: '버스가 급정거하면 승객의 몸이 앞으로 쏠려요. 가장 알맞은 설명은?',
          setup() { S.showCards = false; setScene('safety'); updateCtl(); },
          choices: ['앞쪽에서 몸을 앞으로 잡아당기는 힘이 작용하기 때문이다', '몸이 달리던 운동 상태를 유지하려는 관성 때문이다', '버스가 멈춘 뒤에 중력이 앞쪽으로 작용하기 때문이다', '안전벨트가 몸을 앞으로 밀기 때문이다'],
          answer: 1,
          feedback: ['앞으로 끌어당기는 힘은 없어요. 몸에는 앞으로 가는 속도만 남아 있을 뿐이에요.', '', '중력은 아래 방향이에요. 앞쪽으로 쏠리는 것은 중력 때문이 아니에요.', '벨트는 오히려 몸을 뒤쪽으로 잡아 속도를 줄여 줘요.'],
          explain: '급정거해도 몸에는 <b>앞으로 향하는 속도가 그대로</b> 남아 있어요. 몸이 달리던 운동 상태를 유지하려는 <b>관성</b> 때문에 앞으로 쏠리는 거예요. 안전벨트는 몸에 <b>뒤쪽 방향의 힘</b>을 주어 속도를 줄여 줘요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-inertia', mount: '#game', badge: '관성 박사', homeHref: '../../index.html#h1a',
    featureLabels: { floor: '🛷 바닥 고르기 · 상자 밀기', cases: '🧪 관성 현상 4가지', mass: '⚖️ 질량 비교', graph: '📈 우주선 엔진 · 속도 그래프', safety: '🚗 급정거 · 후방 추돌 · 안전 대책' },
    onFeatures() { updateCtl(); },
    levels,
  });

  // 화면을 눌러도 실행돼요 (터치 편의)
  view.canvas.addEventListener('click', () => {
    if (S.mode === 'floor') { if (S.fl.st === 'idle') pushBox(); }
    else if (S.mode === 'cases') { const r = S.cs.run; if (r && r.st !== 'run') runCase(); }
    else if (S.mode === 'graph') { if (S.gr && !S.gr.ended) toggleFly(); }
    else { const r = S.sf.run; if (r && r.st !== 'run') safetyRun(); }
  });

  /* ---------- 시작 ---------- */
  $('#sMass').value = S.cs.mass; $('#oMass').textContent = S.cs.mass.toFixed(1) + ' kg'; $('#sMass').style.setProperty('--pct', ((S.cs.mass - 1) / 3 * 100) + '%');
  resetFloor(); resetGraph(); safetyReset(); S.cs.run = makeCase('cloth');
  setScene('floor');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    if (S.mode === 'floor') { stepFloor(dt); drawFloorScene(dt); }
    else if (S.mode === 'cases') { stepCase(dt); drawCases(dt); }
    else if (S.mode === 'graph') { stepGraph(dt); drawGraphScene(dt); }
    else { stepSafety(dt); drawSafety(dt); parts.update(dt); parts.draw(ctx); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(234,241,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, caseSelect, runCase, pushBox, setFloor, resetFloor, resetGraph, setThrust, toggleFly,
    safetyRun, setScen, setBelt, setHead, FR, CASES, MATCH, CARDS,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'floor') stepFloor(0.02); else if (S.mode === 'cases') stepCase(0.02); else if (S.mode === 'graph') stepGraph(0.02); else stepSafety(0.02); } },
  };
})();
