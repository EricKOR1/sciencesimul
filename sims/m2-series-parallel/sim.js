/* =========================================================
   중2 Ⅶ. 전기와 자기 - 저항의 연결과 전기 에너지  [9과14-03]
   ① 실험: 직렬연결 → ② 실험: 병렬연결
   → ③ 관찰: 에너지 전환 → ④ 적용: 소비 전력
   (합성 저항의 계산·혼합 연결은 다루지 않아요)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const W = 800, H = 540;
  const NEG = '#2f6df6', POS = '#e2464b', INK = '#1b2333', MUTED = '#5b667a', AMC = '#7c3aed';
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eaf0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const C = SciSim.color;
  const parts = new SciSim.Particles();
  const RM = SciSim.reduceMotion;
  const approach = SciSim.approach;
  const box = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mixc = (a, b, t) => C.mix(a, b, clamp(t, 0, 1));

  /* ---------- 열린 도구 / 게임 ---------- */
  let F = new Set();
  let game = null;
  const has = (f) => F.has(f);
  const isNew = (f) => !!game && game.isNew(f);

  /* ---------- 회로 상수 (전구 하나의 저항은 모두 같다고 가정) ---------- */
  const V = 6, R = 10;                                // 전원 6 V, 전구 1개의 저항 10 Ω
  const E_SPEED = 130;                                // 전자 표시 속력(px/s) = E_SPEED × 전류(A)
  const BOARD = { x: 12, y: 16, w: 588, h: 508 };
  const TRAY = { x: 616, y: 16, w: 172, h: 508, spots: [{ x: 702, y: 150 }, { x: 702, y: 290 }, { x: 702, y: 430 }] };
  const SER = { xl: 64, xr: 548, yt: 180, yb: 420, socks: [{ x: 175, y: 180 }, { x: 306, y: 180 }, { x: 437, y: 180 }] };
  const PAR = { xl: 110, xr: 502, yb: 420, x: 306, rungs: [150, 250, 350] };
  const SUP = { x: 236, y: 390, w: 140, h: 60 };
  const TN = { x: SUP.x, y: 420 }, TP = { x: SUP.x + SUP.w, y: 420 };
  const AM = { x: 150, y: 420, w: 84, h: 46 };

  const S = {
    scene: 'series', mode: 'series', fade: 1, inited: false, t: 0, touched: {},
    drag: null, Id: 0, stableT: 0, sig: '', seen: {}, cut: false, three: false, parCut: false,
    Vd: [0, 0, 0], segs: [],
    en: { cards: [], tok: null, msg: null, last: '', celebrate: 0 },
    pw: { t: 0, bar: [0, 0], playing: false, glow: 0 },
  };
  const bulbs = [0, 1, 2].map((i) => ({ id: i, slot: -1, spot: i, x: TRAY.spots[i].x, y: TRAY.spots[i].y, tx: 0, ty: 0, lift: 0, grab: false, glow: 0, settle: false }));
  const slotBulb = [null, null, null];
  let jumper = [false, false, false];
  const jumperT = [0, 0, 0];

  /* ================= 도우미 그리기 ================= */
  const font = (s, w) => D.font(s, w);
  function electron(x, y, r) {
    D.sphere(x, y, r, NEG, { gloss: false });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, r * 0.3); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x + r * 0.5, y); ctx.stroke();
  }
  function pill(x, y, text, bg, color, size, o) {
    return D.label(x, y, text, Object.assign({ bg: bg || 'rgba(255,255,255,.92)', color: color || INK, size: size || 13, border: 'rgba(120,135,160,.35)' }, o || {}));
  }
  function panel(x, y, w, h, fill) {
    D.shadow(() => { D.roundRect(x, y, w, h, 18); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; D.roundRect(x, y, w, h, 18); ctx.stroke();
  }
  function newRing(x, y, w, h) {
    const a = 0.4 + 0.45 * (0.5 + 0.5 * Math.sin(performance.now() / 160));
    ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,' + a + ')'; ctx.lineWidth = 4;
    D.roundRect(x - 5, y - 5, w + 10, h + 10, 16); ctx.stroke();
    D.label(x + w - 22, y - 4, 'NEW', { bg: '#f26b3a', color: '#fff', size: 12 });
    ctx.restore();
  }
  function rr(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }

  /* 전구: (x, y)는 소켓 가운데. 크기 k, 밝기 glow(0~1), kind: 'inc' 백열 | 'led' */
  function drawBulb(x, y, glow, k, kind, o) {
    o = o || {};
    const b = glow;
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k); ctx.translate(0, -51);
    if (b > 0.02) {
      const Rg = 54 + 92 * b;
      const g = ctx.createRadialGradient(0, 0, 8, 0, 0, Rg);
      g.addColorStop(0, 'rgba(255,236,140,' + (0.28 + 0.62 * b) + ')');
      g.addColorStop(0.5, 'rgba(255,214,80,' + (0.4 * b) + ')');
      g.addColorStop(1, 'rgba(255,205,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, Rg, 0, Math.PI * 2); ctx.fill();
    }
    if (o.lift) { ctx.shadowColor = 'rgba(20,40,80,.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 12 * o.lift; }
    // 유리
    ctx.beginPath();
    ctx.arc(0, 0, 34, Math.PI * 0.68, Math.PI * 0.32);
    ctx.lineTo(12, 36); ctx.lineTo(-12, 36); ctx.closePath();
    const led = kind === 'led';
    ctx.fillStyle = b > 0.01 ? mixc(led ? '#f1f3f7' : '#eef2f7', '#fff3b8', b * 1.3) : (led ? 'rgba(241,243,247,.97)' : 'rgba(238,242,247,.95)');
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = b > 0.01 ? mixc('#94a3b8', '#e0a100', b) : '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
    // 필라멘트 또는 LED 칩
    if (led) {
      const col = mixc('#c9ced8', '#ffd34d', b);
      ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1;
      [-15, 0, 15].forEach((cx) => { rr(cx - 6, -4, 12, 18, 4); ctx.fill(); ctx.stroke(); });
      ctx.strokeStyle = '#aab3c2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 36); ctx.lineTo(-8, 16); ctx.moveTo(8, 36); ctx.lineTo(8, 16); ctx.stroke();
    } else {
      ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-6, 36); ctx.lineTo(-14, 4); ctx.moveTo(6, 36); ctx.lineTo(14, 4); ctx.stroke();
      const fc = b < 0.5 ? mixc('#5b6577', '#ff8a00', b / 0.5) : mixc('#ff8a00', '#fff1a8', (b - 0.5) / 0.5);
      if (b > 0.05) { ctx.save(); ctx.shadowColor = 'rgba(255,170,0,.9)'; ctx.shadowBlur = 10 * b; }
      ctx.strokeStyle = fc; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, px = -14 + 28 * t, py = 4 - Math.sin(t * Math.PI) * 6 + Math.sin(t * 3 * Math.PI * 2) * 4.5;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
      if (b > 0.05) ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
    // 소켓(밑부분)
    const sg = ctx.createLinearGradient(-22, 0, 22, 0);
    sg.addColorStop(0, '#8792a5'); sg.addColorStop(0.45, '#d5dbe5'); sg.addColorStop(1, '#7c8799');
    ctx.fillStyle = sg; rr(-22, 36, 44, 30, 5); ctx.fill();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(70,80,95,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let yy = 43; yy <= 57; yy += 7) { ctx.moveTo(-20, yy); ctx.lineTo(20, yy + 2); }
    ctx.stroke();
    ctx.restore();
  }
  function emptySocket(x, y, t, hot) {
    ctx.save();
    ctx.translate(x, y);
    const sg = ctx.createLinearGradient(-18, 0, 18, 0);
    sg.addColorStop(0, '#9aa5b7'); sg.addColorStop(0.5, '#dfe4ec'); sg.addColorStop(1, '#8793a6');
    ctx.fillStyle = sg; rr(-17, -10, 34, 20, 4); ctx.fill();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#3b4454'; ctx.beginPath(); ctx.ellipse(0, -10, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (hot) {
      ctx.strokeStyle = 'rgba(242,107,58,' + (0.5 + 0.4 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(0, -26, 36 + 2 * Math.sin(t * 6), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  /* ================= 회로판 (직렬 / 병렬) ================= */
  const slotPos = (i) => (S.mode === 'series' ? SER.socks[i] : { x: PAR.x, y: PAR.rungs[i] });
  const emptyPos = (b) => TRAY.spots[b.spot];

  function layoutBoard(n, instant) {
    const par = S.mode === 'parallel';
    for (let i = 0; i < 3; i++) slotBulb[i] = null;
    jumper = par ? [false, false, false] : [false, true, true];
    bulbs.forEach((b) => { b.slot = -1; b.grab = false; b.lift = 0; b.settle = false; });
    let spot = 0;
    bulbs.forEach((b, i) => {
      if (i < n) {
        b.slot = i; slotBulb[i] = b; if (!par) jumper[i] = false;
        const p = slotPos(i); b.x = b.tx = p.x; b.y = b.ty = p.y;
      } else { b.spot = spot++; b.x = b.tx = TRAY.spots[b.spot].x; b.y = b.ty = TRAY.spots[b.spot].y; }
    });
    for (let i = 0; i < 3; i++) jumperT[i] = jumper[i] ? 1 : 0;
    S.stableT = 0; S.sig = '';
    S.Id = 0;
    buildSegs();
  }
  function trayFree(except) {
    const used = {};
    bulbs.forEach((b) => { if (b !== except && b.slot < 0) used[b.spot] = true; });
    return [0, 1, 2].filter((i) => !used[i]);
  }
  function settle(b, x, y, ease, dur) {
    b.settle = true;
    SciSim.tween(b, { x, y }, { duration: dur || 0.4, ease: ease || 'outBack', onDone: () => { b.settle = false; b.tx = b.x; b.ty = b.y; } });
  }
  function toTray(b) {
    const free = trayFree(b);
    let best = free[0], bd = 1e9;
    free.forEach((i) => { const d = Math.hypot(TRAY.spots[i].x - b.x, TRAY.spots[i].y - b.y); if (d < bd) { bd = d; best = i; } });
    b.slot = -1; b.spot = best;
    settle(b, TRAY.spots[best].x, TRAY.spots[best].y, 'outCubic', 0.45);
  }
  function plug(b, i) {
    slotBulb[i] = b; b.slot = i;
    if (jumper[i]) { jumper[i] = false; }
    const p = slotPos(i);
    settle(b, p.x, p.y, 'outBack', 0.4);
    Sound.click();
    if (!RM) parts.burst(p.x, p.y - 8, { count: 8, colors: ['#ffd24a', '#fff3b0'], speed: 90, life: 0.45, size: 2.6, gravity: 80, shape: 'star' });
  }
  function firstFreeSlot() {
    for (let i = 0; i < 3; i++) if (!slotBulb[i]) return i;
    return -1;
  }
  function unplugged(b) {            // 소켓에서 뺀 전구
    const i = b.slot;
    if (i >= 0) { slotBulb[i] = null; b.slot = -1; }
  }
  function solve() {
    const ser = S.mode === 'series';
    const n = slotBulb.filter(Boolean).length;
    if (ser) {
      const open = [0, 1, 2].some((i) => !slotBulb[i] && !jumper[i]);
      const closed = !open && n > 0;
      const I = closed ? V / (n * R) : 0;
      return { ser, n, open, closed, I, ib: I, vb: closed ? V / n : 0 };
    }
    return { ser, n, open: false, closed: n > 0, I: n * (V / R), ib: V / R, vb: n > 0 ? V : 0 };
  }

  /* ---- 전자 이동 경로 ---- */
  function mkSeg(pts, getI) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return { pts, len, phase: Math.random() * 28, getI };
  }
  function segAt(seg, s) {
    s = ((s % seg.len) + seg.len) % seg.len;
    for (let i = 1; i < seg.pts.length; i++) {
      const a = seg.pts[i - 1], b = seg.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= l || i === seg.pts.length - 1) { const t = l ? clamp(s / l, 0, 1) : 0; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t }; }
      s -= l;
    }
    return { x: seg.pts[0][0], y: seg.pts[0][1] };
  }
  const rungI = (i) => (slotBulb[i] ? V / R : 0);
  function buildSegs() {
    if (S.mode === 'series') {
      S.segs = [mkSeg([[TN.x, TN.y], [SER.xl, TN.y], [SER.xl, SER.yt], [SER.xr, SER.yt], [SER.xr, TP.y], [TP.x, TP.y]], () => S.sol.I)];
    } else {
      const { xl, xr, yb, rungs: ys } = PAR;
      S.segs = [
        mkSeg([[TN.x, yb], [xl, yb], [xl, ys[2]]], () => S.sol.I),
        mkSeg([[xl, ys[2]], [xl, ys[1]]], () => rungI(0) + rungI(1)),
        mkSeg([[xl, ys[1]], [xl, ys[0]]], () => rungI(0)),
        mkSeg([[xl, ys[0]], [xr, ys[0]]], () => rungI(0)),
        mkSeg([[xl, ys[1]], [xr, ys[1]]], () => rungI(1)),
        mkSeg([[xl, ys[2]], [xr, ys[2]]], () => rungI(2)),
        mkSeg([[xr, ys[0]], [xr, ys[1]]], () => rungI(0)),
        mkSeg([[xr, ys[1]], [xr, ys[2]]], () => rungI(0) + rungI(1)),
        mkSeg([[xr, ys[2]], [xr, yb], [TP.x, yb]], () => S.sol.I),
      ];
    }
  }
  S.sol = { n: 1, I: 0.6, closed: true, open: false, ib: 0.6, vb: 6, ser: true };
  function hiddenDot(x, y) {
    if (x > SUP.x - 2 && x < SUP.x + SUP.w + 2 && y > SUP.y && y < SUP.y + SUP.h) return true;
    if (has('ammeter') && Math.abs(x - AM.x) < AM.w / 2 + 3 && Math.abs(y - AM.y) < AM.h / 2 + 3) return true;
    if (S.mode === 'series') { for (let i = 0; i < 3; i++) if (Math.abs(x - SER.socks[i].x) < 21 && Math.abs(y - SER.yt) < 3) return true; }
    else { for (let i = 0; i < 3; i++) if (Math.abs(x - PAR.x) < 21 && Math.abs(y - PAR.rungs[i]) < 3) return true; }
    return false;
  }

  function updateBoard(dt) {
    const sol = solve();
    S.sol = sol;
    bulbs.forEach((b) => {
      b.lift = approach(b.lift, b.grab ? 1 : 0, dt, 14);
      if (b.grab) { b.x = approach(b.x, b.tx, dt, 30); b.y = approach(b.y, b.ty, dt, 30); }
      const target = b.slot >= 0 && !b.grab && sol.closed ? sol.ib / (V / R) : 0;
      b.glow = approach(b.glow, target, dt, 9);
    });
    S.Id = approach(S.Id, sol.I, dt, 9);
    for (let i = 0; i < 3; i++) {
      jumperT[i] = approach(jumperT[i], jumper[i] ? 1 : 0, dt, 9);
      S.Vd[i] = approach(S.Vd[i], slotBulb[i] && sol.closed ? sol.vb : 0, dt, 9);
    }
    S.segs.forEach((sg) => { sg.phase += E_SPEED * sg.getI() * dt; });
    // 미션용 안정 상태 기록
    const sig = S.mode + '|' + sol.n + '|' + sol.open + '|' + sol.closed;
    if (sig !== S.sig) { S.sig = sig; S.stableT = 0; } else S.stableT += dt;
    if (S.stableT > 0.6 && S.scene === S.mode) {
      if (sol.ser) {
        if (sol.closed) S.seen[sol.n] = true;
        if (sol.open) S.cut = true;
      } else {
        if (sol.closed) S.seen[sol.n] = true;
        if (sol.n === 3 && sol.closed) S.three = true;
        if (S.three && sol.n === 2 && sol.closed) S.parCut = true;
      }
    }
  }

  function wire(pts, open) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3f4a5c'; ctx.lineWidth = 5;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  }
  function ammeter(t) {
    const x = AM.x - AM.w / 2, y = AM.y - AM.h / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; rr(x, y, AM.w, AM.h, 12); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = AMC; ctx.lineWidth = 3; rr(x, y, AM.w, AM.h, 12); ctx.stroke();
    ctx.fillStyle = AMC; ctx.beginPath(); ctx.arc(x + 4, y + 4, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    D.text(x + 4, y + 9, 'A', { size: 13, weight: 800, color: '#fff' });
    D.text(AM.x + 4, AM.y + 7, S.Id.toFixed(2) + ' A', { size: 18, weight: 800, color: INK });
    // 단자: 전류는 (+)극 → 전류계 → (−)극. 전류계 오른쪽이 (−)극 쪽 전원에 가까움
    [['left', x, '+', '#dc2626'], ['right', x + AM.w, '−', '#111827']].forEach((o) => {
      ctx.fillStyle = o[3]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o[1], AM.y, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      D.text(o[1] + (o[0] === 'left' ? -2 : 2), AM.y - 15, o[2], { size: 15, weight: 900, color: o[3] });
    });
    D.text(AM.x, AM.y + 41, '전류계 (전체 전류)', { size: 13, weight: 800, color: '#6d28d9' });
    if (isNew('ammeter')) newRing(x, y, AM.w, AM.h);
  }
  function supply(t) {
    const b = SUP;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    bg.addColorStop(0, '#475569'); bg.addColorStop(1, '#2b3546');
    ctx.fillStyle = bg; rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.restore();
    D.text(b.x + b.w / 2, b.y + 17, '전원 장치', { size: 13, weight: 800, color: '#e2e8f0' });
    ctx.fillStyle = '#0f241a'; rr(b.x + 22, b.y + 24, b.w - 44, 28, 6); ctx.fill();
    D.text(b.x + b.w / 2, b.y + 45, V.toFixed(1) + ' V', { size: 20, weight: 800, color: '#4ade80' });
    [[TN, '#111827', '−'], [TP, '#dc2626', '+']].forEach((o) => {
      ctx.fillStyle = o[1]; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o[0].x, o[0].y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      D.text(o[0].x, o[0].y + 6, o[2], { size: 16, weight: 900, color: '#fff' });
    });
  }
  function bulbHit(p) {
    for (let i = bulbs.length - 1; i >= 0; i--) {
      const b = bulbs[i];
      if (Math.hypot(p.x - b.x, p.y - (b.y - 30)) < 42) return b;
    }
    return null;
  }
  function drawBoard(t) {
    const par = S.mode === 'parallel', sol = S.sol;
    panel(BOARD.x, BOARD.y, BOARD.w, BOARD.h, '#ffffff');
    D.text(BOARD.x + 18, BOARD.y + 30, par ? '병렬연결 · 전류가 흐르는 길이 여러 개' : '직렬연결 · 전류가 흐르는 길이 하나', { size: 15, weight: 800, color: par ? '#0b6b39' : '#c2410c', align: 'left' });
    // 전구 보관함
    panel(TRAY.x, TRAY.y, TRAY.w, TRAY.h, '#f6f1e7');
    D.text(TRAY.x + TRAY.w / 2, TRAY.y + 32, '전구 보관함', { size: 16, weight: 800, color: '#7a5a2b' });
    D.text(TRAY.x + TRAY.w / 2, TRAY.y + 52, '끌거나 톡 눌러요', { size: 13, weight: 700, color: '#9a7a4b' });
    TRAY.spots.forEach((s) => { ctx.fillStyle = '#d9c9a8'; rr(s.x - 44, s.y + 14, 88, 8, 4); ctx.fill(); });
    // 도선
    if (!par) {
      wire([[TN.x, TN.y], [SER.xl, TN.y], [SER.xl, SER.yt], [SER.xr, SER.yt], [SER.xr, TP.y], [TP.x, TP.y]]);
    } else {
      wire([[TN.x, PAR.yb], [PAR.xl, PAR.yb], [PAR.xl, PAR.rungs[2]]]);
      wire([[PAR.xl, PAR.rungs[2]], [PAR.xl, PAR.rungs[0]]]);
      wire([[PAR.xr, PAR.rungs[0]], [PAR.xr, PAR.rungs[2]], [PAR.xr, PAR.yb], [TP.x, PAR.yb]]);
      PAR.rungs.forEach((y) => wire([[PAR.xl, y], [PAR.xr, y]]));
      // 갈라지는 점
      PAR.rungs.forEach((y) => { [PAR.xl, PAR.xr].forEach((x) => { ctx.fillStyle = '#3f4a5c'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }); });
    }
    // 빛 번짐이 전구 아래 깔리도록 먼저 소켓/전구 그리기
    for (let i = 0; i < 3; i++) {
      const p = slotPos(i), b = slotBulb[i];
      if (!b || b.grab) {
        // 연결선(점퍼) 또는 빈 소켓
        if (jumperT[i] > 0.02 && !par) {
          ctx.save(); ctx.globalAlpha = jumperT[i]; ctx.translate(p.x, p.y - (1 - jumperT[i]) * 30);
          ctx.fillStyle = '#d6a21e'; rr(-22, -9, 44, 18, 7); ctx.fill(); ctx.strokeStyle = '#8a6410'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(-16, -6, 32, 4, 2); ctx.fill();
          ctx.restore();
          D.text(p.x, p.y + 28, '연결선', { size: 13, weight: 700, color: '#8a6410', alpha: jumperT[i] });
        } else {
          const near = S.drag && S.drag.bulb && Math.hypot(S.drag.bulb.x - p.x, S.drag.bulb.y - p.y) < 70;
          emptySocket(p.x, p.y, t, near || (!S.touched[S.scene] && i === firstFreeSlot() && !RM));
          if (!par) D.text(p.x, p.y + 28, '빈 자리', { size: 13, weight: 700, color: '#c2410c' });
        }
      }
    }
    // 전자 (도선 위 점)
    S.segs.forEach((sg) => {
      const n = Math.max(1, Math.round(sg.len / 28)), gap = sg.len / n;
      for (let i = 0; i < n; i++) {
        const q = segAt(sg, i * gap + sg.phase);
        if (!hiddenDot(q.x, q.y)) electron(q.x, q.y, 5.6);
      }
    });
    // 전류계·전원
    supply(t);
    if (has('ammeter')) ammeter(t);
    // 전구
    const ordered = bulbs.slice().sort((a, b) => (a.grab ? 1 : 0) - (b.grab ? 1 : 0) || a.lift - b.lift);
    ordered.forEach((b) => { if (b.slot >= 0 || b.grab || b.slot < 0) drawBulb(b.x, b.y, b.glow, 0.65, 'inc', { lift: b.lift }); });
    // 전압 표시 (전압계)
    if (has('volts')) {
      for (let i = 0; i < 3; i++) {
        const b = slotBulb[i]; if (!b || b.grab) continue;
        const p = slotPos(i);
        const x = par ? p.x + 74 : p.x, y = par ? p.y + 6 : p.y + 52;
        const a = clamp(b.glow * 3 + (S.Vd[i] > 0.05 ? 0.4 : 0), 0, 1);
        ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * (sol.closed ? 1 : 0);
        const w = 82, h = 26;
        ctx.fillStyle = '#fff'; rr(x - w / 2, y - h / 2, w, h, 13); ctx.fill();
        ctx.strokeStyle = AMC; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = AMC; ctx.beginPath(); ctx.arc(x - w / 2 + 13, y, 9, 0, Math.PI * 2); ctx.fill();
        D.text(x - w / 2 + 13, y + 5, 'V', { size: 13, weight: 800, color: '#fff' });
        D.text(x + 10, y + 6, S.Vd[i].toFixed(1) + ' V', { size: 15, weight: 800, color: INK });
        ctx.restore();
      }
      if (isNew('volts')) newRing(PAR.x + 36, PAR.rungs[0] - 8, 80, 28);
    }
    // 보관함 안내 / 전자 범례
    electron(BOARD.x + 26, BOARD.y + BOARD.h - 24, 5.6);
    D.text(BOARD.x + 38, BOARD.y + BOARD.h - 19, '전자(−)의 이동 · 빠를수록 전류가 세요', { size: 13, weight: 700, color: MUTED, align: 'left' });
    if (!S.touched[S.scene] && !RM) {
      const b = bulbs.find((x) => x.slot < 0);
      if (b) D.ring(b.x, b.y - 30, 40, t, { color: '#f26b3a' });
    }
    // 열린 회로 / 합선 안내
    if (S.mode === 'series' && sol.open) {
      D.label(306, 76, '⛔ 회로가 끊어졌어요 · 빈 자리를 채우면 켜져요', { bg: '#dc2626', color: '#fff', size: 14 });
    }
  }

  /* ================= 에너지 전환 ================= */
  const EN = {
    light: { name: '빛 에너지', col: '#e0a100' }, heat: { name: '열 에너지', col: '#ef4444' }, motion: { name: '운동 에너지', col: '#16a34a' },
    sound: { name: '소리 에너지', col: '#2f6df6' }, chem: { name: '화학 에너지', col: '#8b5cf6' },
  };
  const EN_KEYS = ['light', 'heat', 'motion', 'sound', 'chem'];
  const APPL = [
    { key: 'lamp', name: '전등', expect: ['light', 'heat'] }, { key: 'fan', name: '선풍기', expect: ['motion'] },
    { key: 'speaker', name: '스피커', expect: ['sound'] }, { key: 'heater', name: '전기난로', expect: ['heat'] },
    { key: 'phone', name: '휴대 전화 충전', expect: ['chem'] },
  ];
  const CARD = { y: 112, w: 142, h: 262 };
  const TOKY = 456;
  function resetEnergy() {
    S.en.cards = APPL.map((a, i) => ({ key: a.key, name: a.name, expect: a.expect, x: 90 + 155 * i, chips: [], pop: {}, shake: 0, flash: 0, eff: { light: 0, heat: 0, motion: 0, sound: 0, chem: 0 }, spin: 0, wave: 0 }));
    S.en.tok = null; S.en.msg = null; S.en.celebrate = 0;
  }
  const tokPos = (i) => ({ x: 90 + 155 * i, y: TOKY });
  function energyDone() { return S.en.cards.every((c) => c.expect.every((e) => c.chips.indexOf(e) >= 0)); }
  function cardAt(p) { return S.en.cards.find((c) => p.x > c.x - CARD.w / 2 - 6 && p.x < c.x + CARD.w / 2 + 6 && p.y > CARD.y - 6 && p.y < CARD.y + CARD.h + 6) || null; }
  function dropToken(type, p) {
    const c = cardAt(p);
    if (!c) return false;
    if (c.chips.indexOf(type) >= 0) return false;
    if (c.expect.indexOf(type) >= 0) {
      c.chips.push(type); c.pop[type] = 0;
      SciSim.tween(c.pop, { [type]: 1 }, { duration: 0.45, ease: 'outBack' });
      Sound.success();
      parts.burst(c.x, CARD.y + 150, { count: 14, colors: [EN[type].col, '#fff', '#ffd24a'], speed: 150, life: 0.7, size: 3.4, gravity: 120 });
      if (energyDone() && !S.en.celebrate) { S.en.celebrate = 1; parts.burst(W / 2, 250, { count: 40, speed: 260, life: 1.0, size: 4 }); }
      S.en.msg = null;
    } else {
      c.shake = 1; c.flash = 1; Sound.fail();
      S.en.msg = { text: c.name + '에서는 ' + EN[type].name + '가 주로 나오지 않아요. 다시 생각해 봐요!', t: 2.8, x: c.x };
    }
    return true;
  }
  function drawAppliance(c, t) {
    const x = c.x, y = CARD.y + 112;
    const e = c.eff;
    if (c.key === 'lamp') {
      drawBulb(x, y + 40, e.light, 0.85, 'inc');
    } else if (c.key === 'fan') {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#9aa5b7'; rr(-6, 28, 12, 56, 4); ctx.fill(); rr(-30, 78, 60, 10, 5); ctx.fill();
      ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(210,225,245,.4)';
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.rotate(c.spin);
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(i * Math.PI * 2 / 3);
        const g = ctx.createLinearGradient(0, 0, 0, -38); g.addColorStop(0, '#16a34a'); g.addColorStop(1, '#6ee7a1');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -22, 10, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (c.key === 'speaker') {
      ctx.save(); ctx.translate(x, y + 6);
      D.shadow(() => { rr(-34, -52, 68, 104, 10); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 8, y: 3 });
      const k = 1 + 0.06 * Math.sin(c.wave * 3) * e.sound;
      D.sphere(0, 12, 24 * k, '#475569', { gloss: false }); D.sphere(0, 12, 12 * k, '#94a3b8', { gloss: false });
      D.sphere(0, -28, 9 * (1 + 0.1 * Math.sin(c.wave * 4) * e.sound), '#64748b', { gloss: false });
      ctx.restore();
      if (e.sound > 0.02) {
        ctx.save(); ctx.strokeStyle = EN.sound.col; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ph = (c.wave * 0.9 + i / 3) % 1;
          ctx.globalAlpha = (1 - ph) * e.sound;
          ctx.beginPath(); ctx.arc(x + 34, y + 6, 14 + ph * 36, -0.8, 0.8); ctx.stroke();
        }
        ctx.restore();
      }
    } else if (c.key === 'heater') {
      ctx.save(); ctx.translate(x, y + 14);
      D.shadow(() => { rr(-42, -34, 84, 74, 10); ctx.fillStyle = '#6b7280'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#374151'; rr(-34, -26, 68, 56, 6); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const bx = -20 + i * 20;
        const col = mixc('#7a4a3a', '#ff7a2a', e.heat);
        if (e.heat > 0.1) D.glow(bx, 2, 26, '#ff7a2a', 0.5 * e.heat);
        ctx.fillStyle = col; rr(bx - 5, -22, 10, 48, 5); ctx.fill();
        if (e.heat > 0.3) { ctx.fillStyle = 'rgba(255,230,160,' + 0.6 * e.heat + ')'; rr(bx - 2, -18, 4, 40, 2); ctx.fill(); }
      }
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(x, y + 6);
      D.shadow(() => { rr(-28, -52, 56, 104, 12); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#0f172a'; rr(-23, -44, 46, 84, 6); ctx.fill();
      // 배터리 아이콘
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5; rr(-14, -18, 28, 40, 5); ctx.stroke();
      ctx.fillStyle = '#e2e8f0'; rr(-5, -23, 10, 5, 2); ctx.fill();
      const fill = e.chem * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(c.wave)));
      ctx.fillStyle = mixc('#a78bfa', '#8b5cf6', e.chem); rr(-11, 19 - 34 * fill, 22, 34 * fill, 3); ctx.fill();
      if (e.chem > 0.3) D.text(0, 6, '⚡', { size: 16, color: '#fde68a' });
      ctx.restore();
      // 충전 선
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y + 58); ctx.quadraticCurveTo(x, y + 84, x - 36, y + 84); ctx.stroke();
    }
    // 열 / 빛 효과 (입자)
    if (e.heat > 0.3 && !RM && Math.random() < 0.35) parts.emit({ x: x + rnd(-26, 26), y: CARD.y + 74, vx: rnd(-8, 8), vy: -rnd(30, 60), life: 0.9, size: rnd(5, 9), color: 'rgba(255,120,60,.55)', shape: 'smoke', gravity: -10 });
    if (e.light > 0.3 && !RM && Math.random() < 0.3) { const a = rnd(0, 6.28); parts.emit({ x: x + Math.cos(a) * 40, y: CARD.y + 80 + Math.sin(a) * 36, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.7, size: rnd(2, 3.6), color: '#ffd24a', shape: 'star' }); }
  }
  function drawEnergy(t) {
    const en = S.en;
    // 콘센트와 전기 에너지의 흐름
    const ox = W / 2, oy = 38;
    D.shadow(() => { rr(ox - 62, oy - 24, 124, 50, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(ox - 62, oy - 24, 124, 50, 12); ctx.stroke();
    ctx.fillStyle = '#1f2937'; rr(ox - 28, oy - 8, 8, 20, 3); ctx.fill(); rr(ox + 20, oy - 8, 8, 20, 3); ctx.fill();
    D.text(ox, oy + 42, '⚡ 전기 에너지', { size: 14, weight: 800, color: '#b45309' });
    const bus = 96;
    ctx.save(); ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(ox, oy + 50); ctx.lineTo(ox, bus); ctx.moveTo(90, bus); ctx.lineTo(710, bus);
    en.cards.forEach((c) => { ctx.moveTo(c.x, bus); ctx.lineTo(c.x, CARD.y + 6); });
    ctx.stroke(); ctx.restore();
    // 카드
    en.cards.forEach((c, i) => {
      const done = c.expect.every((e) => c.chips.indexOf(e) >= 0);
      c.shake = approach(c.shake, 0, 0.016, 4); c.flash = approach(c.flash, 0, 0.016, 3);
      const sx = Math.sin(t * 60) * 5 * c.shake;
      ctx.save(); ctx.translate(c.x + sx, CARD.y);
      D.shadow(() => { rr(-CARD.w / 2, 0, CARD.w, CARD.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 4 });
      ctx.strokeStyle = c.flash > 0.05 ? 'rgba(220,38,38,' + c.flash + ')' : done ? '#16a34a' : '#dde4ef'; ctx.lineWidth = c.flash > 0.05 || done ? 3 : 1.5;
      rr(-CARD.w / 2, 0, CARD.w, CARD.h, 16); ctx.stroke();
      ctx.restore();
      D.text(c.x + sx, CARD.y + 26, c.name, { size: 16, weight: 800, color: INK });
      // 에너지 놓는 칸
      const hot = en.tok && cardAt(en.tok) === c;
      ctx.save(); ctx.translate(c.x + sx, 0);
      ctx.strokeStyle = hot ? '#f26b3a' : '#cbd5e1'; ctx.lineWidth = hot ? 3 : 2; ctx.setLineDash([6, 5]);
      rr(-CARD.w / 2 + 10, CARD.y + CARD.h - 78, CARD.w - 20, 68, 12); ctx.stroke(); ctx.setLineDash([]);
      if (hot) { ctx.fillStyle = 'rgba(242,107,58,.08)'; rr(-CARD.w / 2 + 10, CARD.y + CARD.h - 78, CARD.w - 20, 68, 12); ctx.fill(); }
      ctx.restore();
      if (!c.chips.length) D.text(c.x + sx, CARD.y + CARD.h - 38, c.expect.length > 1 ? '에너지 카드 2개' : '에너지 카드 놓기', { size: 13, weight: 700, color: '#9aa5b7' });
      c.chips.forEach((ty, k) => {
        const pop = c.pop[ty] != null ? c.pop[ty] : 1;
        const cy = CARD.y + CARD.h - 44 + (c.chips.length > 1 ? (k ? 16 : -16) : 0);
        ctx.save(); ctx.translate(c.x + sx, cy); ctx.scale(0.5 + 0.5 * pop, 0.5 + 0.5 * pop);
        D.label(0, 0, EN[ty].name, { bg: EN[ty].col, color: '#fff', size: 14 });
        ctx.restore();
      });
      // 효과 (맞는 에너지가 놓였을 때)
      EN_KEYS.forEach((k) => { c.eff[k] = approach(c.eff[k], c.chips.indexOf(k) >= 0 ? 1 : 0, 0.016, 6); });
      c.spin += (0.4 + 9 * c.eff.motion) * 0.016 * (RM ? 0.3 : 1);
      c.wave += 0.016 * 4;
      drawAppliance(c, t);
      if (done) { D.check(c.x + CARD.w / 2 - 14, CARD.y + 14, 11, 1); }
    });
    // 에너지 카드(보관함)
    D.text(W / 2, TOKY - 38, '에너지 카드 — 가전제품 위로 끌어다 놓아요', { size: 14, weight: 800, color: MUTED });
    EN_KEYS.forEach((k, i) => {
      const p = tokPos(i);
      const dragging = en.tok && en.tok.type === k;
      ctx.save(); if (dragging) ctx.globalAlpha = 0.35;
      ctx.translate(p.x, p.y);
      D.shadow(() => { rr(-62, -24, 124, 48, 24); ctx.fillStyle = EN[k].col; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(-52, -20, 104, 14, 7); ctx.fill();
      D.text(0, 6, EN[k].name, { size: 16, weight: 800, color: '#fff' });
      ctx.restore();
    });
    if (!S.touched.energy && !RM) D.ring(tokPos(1).x, tokPos(1).y, 40, t, { color: '#f26b3a' });
    if (en.tok) {
      const k = en.tok.type;
      ctx.save(); ctx.translate(en.tok.x, en.tok.y); ctx.scale(1.08, 1.08);
      D.shadow(() => { rr(-62, -24, 124, 48, 24); ctx.fillStyle = EN[k].col; ctx.fill(); }, { blur: 18, y: 10, color: 'rgba(20,40,80,.35)' });
      D.text(0, 6, EN[k].name, { size: 16, weight: 800, color: '#fff' });
      ctx.restore();
    }
    if (en.msg) {
      ctx.save(); ctx.globalAlpha = clamp(en.msg.t * 2, 0, 1);
      D.label(clamp(en.msg.x, 200, 600), CARD.y + CARD.h + 26, '✖ ' + en.msg.text, { bg: '#dc2626', color: '#fff', size: 14 });
      ctx.restore();
    }
    if (en.celebrate) D.text(W / 2, 398, '🎉 모든 가전제품의 에너지 전환을 찾았어요!', { size: 16, weight: 800, color: '#0b6b39' });
  }

  /* ================= 소비 전력 ================= */
  const PW = { inc: { w: 60, light: 0.022, name: '백열전구', x: 190 }, led: { w: 9, light: 0.15, name: 'LED 전구', x: 520 } };
  const BAR = { x: 150, w: 600, y: [352, 424], h: 40 };
  function updatePower(dt) {
    const p = S.pw;
    if (p.playing) {
      p.t = Math.min(10, p.t + dt * 1.0);
      if (p.t >= 10) setPlaying(false);
      syncTime();
    }
    ['inc', 'led'].forEach((k, i) => { p.bar[i] = approach(p.bar[i], PW[k].w * p.t / 600, dt, 8); });
    p.glow = approach(p.glow, 1, dt, 3);
  }
  function drawPower(t) {
    const p = S.pw;
    ['inc', 'led'].forEach((k, i) => {
      const cfg = PW[k];
      const x = cfg.x;
      panel(x - 132, 30, 264, 262, '#fff');
      drawBulb(x, 205, p.glow, 1.35, k);
      // 빛살
      ctx.save(); ctx.strokeStyle = 'rgba(255,170,0,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let a = 0; a < 9; a++) { const ang = -Math.PI * 0.95 + a * (Math.PI * 0.9 / 8); const gx = x, gy = 205 - 51 * 1.35; ctx.beginPath(); ctx.moveTo(gx + Math.cos(ang) * 70, gy + Math.sin(ang) * 70); ctx.lineTo(gx + Math.cos(ang) * 84, gy + Math.sin(ang) * 84); ctx.stroke(); }
      ctx.restore();
      // 열 (백열전구는 많이)
      const heat = k === 'inc' ? 1 : 0.22;
      if (!RM && Math.random() < 0.5 * heat) parts.emit({ x: x + rnd(-40, 40), y: 70, vx: rnd(-8, 8), vy: -rnd(25, 55), life: 1.0, size: rnd(5, 9), color: 'rgba(255,110,60,.5)', shape: 'smoke', gravity: -8 });
      D.text(x, 62, cfg.name, { size: 18, weight: 800, color: INK });
      D.label(x, 276, '소비 전력 ' + (k === 'inc' ? '60 W' : '약 9 W'), { bg: k === 'inc' ? '#ef4444' : '#16a34a', color: '#fff', size: 15 });
    });
    D.label(355, 150, '같은 밝기!', { bg: '#f2b705', color: '#1b2333', size: 15 });
    // 에너지 막대
    D.text(20, 328, '사용한 전기 에너지', { size: 15, weight: 800, color: INK, align: 'left' });
    D.text(780, 328, '⏱ 켜 둔 시간 ' + S.pw.t.toFixed(1) + '시간', { size: 15, weight: 800, color: '#6d28d9', align: 'right' });
    ['inc', 'led'].forEach((k, i) => {
      const y = BAR.y[i], cfg = PW[k];
      D.text(BAR.x - 10, y + 26, cfg.name, { size: 14, weight: 800, color: INK, align: 'right' });
      ctx.fillStyle = '#e8edf5'; rr(BAR.x, y, BAR.w, BAR.h, 10); ctx.fill();
      const len = Math.max(0, p.bar[i] * BAR.w);
      if (len > 1) {
        ctx.save(); rr(BAR.x, y, BAR.w, BAR.h, 10); ctx.clip();
        const lightLen = Math.min(len, len * cfg.light);
        ctx.fillStyle = '#f2b705'; ctx.fillRect(BAR.x, y, lightLen, BAR.h);
        const hg = ctx.createLinearGradient(BAR.x, 0, BAR.x + Math.max(len, 1), 0); hg.addColorStop(0, '#fb923c'); hg.addColorStop(1, '#ef4444');
        ctx.fillStyle = hg; ctx.fillRect(BAR.x + lightLen, y, len - lightLen, BAR.h);
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(BAR.x, y + 5, len, 8);
        ctx.restore();
      }
      D.text(Math.min(BAR.x + BAR.w - 6, BAR.x + len + 8), y + 26, k === 'inc' ? (p.t > 0.2 ? '많이 써요' : '') : (p.t > 0.2 ? '적게 써요' : ''), { size: 14, weight: 800, color: k === 'inc' ? '#b91c1c' : '#0b6b39', align: len > BAR.w - 100 ? 'right' : 'left' });
    });
    // 범례
    ctx.fillStyle = '#f2b705'; rr(150, 484, 18, 14, 4); ctx.fill();
    D.text(174, 496, '빛으로 바뀐 에너지', { size: 13, weight: 700, color: MUTED, align: 'left' });
    ctx.fillStyle = '#ef4444'; rr(330, 484, 18, 14, 4); ctx.fill();
    D.text(354, 496, '열로 바뀐 에너지', { size: 13, weight: 700, color: MUTED, align: 'left' });
    D.text(520, 496, '소비 전력(W) = 1초 동안 쓰는 전기 에너지', { size: 13, weight: 800, color: '#6d28d9', align: 'left' });
  }

  /* ================= 입력 ================= */
  const isBoard = () => S.scene === 'series' || S.scene === 'parallel';
  const handlers = {
    hover(p) {
      if (isBoard()) return bulbHit(p) ? 'grab' : null;
      if (S.scene === 'energy') return tokenAt(p) >= 0 ? 'grab' : null;
      return null;
    },
    down(p) {
      if (isBoard()) {
        const b = bulbHit(p); if (!b) return false;
        const g = { kind: 'bulb', bulb: b, dx: b.x - p.x, dy: b.y - p.y, sx: p.x, sy: p.y, t0: performance.now(), moved: 0, fromSlot: b.slot, fromX: b.x, fromY: b.y, fromSpot: b.spot };
        SciSim.tween(b, { x: b.x, y: b.y }, { duration: 0.001 });
        b.settle = false;
        if (b.slot >= 0) unplugged(b);
        b.grab = true; b.tx = b.x; b.ty = b.y;
        S.drag = g; S.touched[S.scene] = true; hideHint(); Sound.tick();
        return true;
      }
      if (S.scene === 'energy') {
        const i = tokenAt(p); if (i < 0) return false;
        S.en.tok = { type: EN_KEYS[i], x: p.x, y: p.y, i }; S.touched.energy = true; hideHint(); Sound.tick();
        return true;
      }
      return false;
    },
    move(p) {
      const g = S.drag;
      if (isBoard() && g) {
        g.moved = Math.max(g.moved, Math.hypot(p.x - g.sx, p.y - g.sy));
        g.bulb.tx = clamp(p.x + g.dx, 40, 770); g.bulb.ty = clamp(p.y + g.dy, 80, 520);
      } else if (S.scene === 'energy' && S.en.tok) { S.en.tok.x = p.x; S.en.tok.y = p.y; }
    },
    up(p) {
      if (isBoard() && S.drag) {
        const g = S.drag, b = g.bulb; S.drag = null; b.grab = false;
        const tap = g.moved < 8 && performance.now() - g.t0 < 600;
        if (tap) {
          if (g.fromSlot >= 0) { b.x = g.fromX; b.y = g.fromY; toTray(b); Sound.click(); }
          else {
            const i = firstFreeSlot();
            if (i >= 0) plug(b, i); else { b.spot = g.fromSpot; settle(b, TRAY.spots[b.spot].x, TRAY.spots[b.spot].y); }
          }
          return;
        }
        // 가장 가까운 빈 자리
        let best = -1, bd = 78;
        for (let i = 0; i < 3; i++) if (!slotBulb[i]) { const q = slotPos(i), d = Math.hypot(q.x - b.x, q.y - b.y); if (d < bd) { bd = d; best = i; } }
        if (best >= 0) plug(b, best); else toTray(b);
      } else if (S.scene === 'energy' && S.en.tok) {
        const tk = S.en.tok; S.en.tok = null;
        const placed = dropToken(tk.type, { x: tk.x, y: tk.y });
        if (!placed) { Sound.click(); }
      }
    },
  };
  function tokenAt(p) { for (let i = 0; i < 5; i++) { const q = tokPos(i); if (Math.abs(p.x - q.x) < 66 && Math.abs(p.y - q.y) < 28) return i; } return -1; }
  SciSim.pointer(view, handlers);
  view.canvas.style.touchAction = 'pan-y';
  view.canvas.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    const p = view.toLocal(e.touches[0]);
    if ((isBoard() && bulbHit(p)) || (S.scene === 'energy' && tokenAt(p) >= 0)) e.preventDefault();
  }, { passive: false });

  /* ---------- 조작판 ---------- */
  const hintEl = $('#stageHint');
  function showHint(msg, ms) {
    hintEl.textContent = msg; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }
  const tbLabel = $('#tbLabel'), sceneSeg = $('#sceneSeg');
  const sceneNames = { series: '🔌 직렬연결', parallel: '🔀 병렬연결', energy: '🔄 에너지 전환', power: '⚡ 소비 전력' };
  function resetFlags() { S.seen = {}; S.cut = false; S.three = false; S.parCut = false; S.stableT = 0; S.sig = ''; }
  function setScene(name) {
    if (S.inited && S.scene === name) return;
    S.inited = true;
    S.scene = name;
    tbLabel.textContent = sceneNames[name];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = c.dataset.scenes.split(' ').indexOf(name) < 0; });
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    S.drag = null; parts.clear();
    S.fade = 0; SciSim.tween(S, { fade: 1 }, { duration: 0.45, ease: 'outCubic' });
    if (name === 'series' || name === 'parallel') {
      S.mode = name; layoutBoard(1, true); resetFlags();
      $('#noteBoard').innerHTML = name === 'series'
        ? '전구를 <b>끌어서</b> 빈 자리에 끼우거나, 전구를 <b>톡</b> 눌러 끼우고 빼요. 연결선이 있는 자리는 전구를 끼우면 연결선이 빠져요.'
        : '전구를 <b>끌어서</b> 빈 자리에 끼우거나, 전구를 <b>톡</b> 눌러 끼우고 빼요. 각 줄(가지)에 전구가 하나씩 들어가요.';
    }
    if (name === 'energy') resetEnergy();
    if (name === 'power') { S.pw.t = 0; S.pw.bar = [0, 0]; S.pw.glow = 0; setPlaying(false); syncTime(); }
    readoutLabels();
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); layoutBoard(1, false); resetFlags(); });
  $('#energyReset').addEventListener('click', () => { Sound.click(); resetEnergy(); });
  const sT = $('#sT'), oT = $('#oT'), playBtn = $('#playBtn');
  const rangeT = SciSim.bindRange(sT, oT, (v) => (+v).toFixed(1) + ' 시간', (v) => { S.pw.t = +v; if (S.pw.playing) setPlaying(false); });
  function syncTime() { rangeT.set(S.pw.t.toFixed(1)); }
  function setPlaying(on) {
    S.pw.playing = !!on;
    playBtn.setAttribute('aria-pressed', String(!!on));
    playBtn.textContent = on ? '⏸ 멈추기' : '▶ 시간 흐르게 하기';
  }
  playBtn.addEventListener('click', () => { Sound.click(); if (!S.pw.playing && S.pw.t >= 9.99) { S.pw.t = 0; } setPlaying(!S.pw.playing); hideHint(); });
  $$('.nudge').forEach((b) => b.addEventListener('click', () => { Sound.tick(); setPlaying(false); S.pw.t = clamp(Math.round(S.pw.t) + +b.dataset.d, 0, 10); syncTime(); }));

  /* ---------- 측정값 표시 ---------- */
  const rl = [$('#l1'), $('#l2'), $('#l3')], rv = [$('#v1'), $('#v2'), $('#v3')];
  const RLAB = {
    series: ['연결한 전구', '전체 전류 (전류계)', '전구의 밝기'],
    parallel: ['연결한 전구', '전체 전류 (전류계)', '전구의 밝기'],
    energy: ['에너지를 놓은 가전제품', '맞게 놓은 에너지 카드', '전기 에너지는?'],
    power: ['켜 둔 시간', '백열전구 (60 W)', 'LED 전구 (약 9 W)'],
  };
  function readoutLabels() { RLAB[S.scene].forEach((l, i) => { if (rl[i].textContent !== l) rl[i].textContent = l; }); }
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t; readoutLabels();
    let a, b, c;
    if (isBoard()) {
      const sol = S.sol;
      a = sol.n + '개 ' + (S.mode === 'series' ? '직렬' : '병렬') + (sol.open ? ' <span class="hot">(끊어짐)</span>' : '');
      b = S.Id.toFixed(2) + ' A';
      const gl = Math.max.apply(null, bulbs.map((x) => x.glow));
      c = !sol.closed ? '<span class="hot">모두 꺼짐</span>' : S.mode === 'series' ? (sol.n === 1 ? '밝음' : sol.n === 2 ? '어두워짐' : '아주 어두움') : '<span class="ok">모두 밝음</span>';
      if (gl < 0.02 && sol.closed) c = '…';
    } else if (S.scene === 'energy') {
      a = S.en.cards.filter((x) => x.chips.length).length + ' / 5개';
      b = S.en.cards.reduce((s, x) => s + x.chips.length, 0) + ' / 6개';
      c = '<span class="ok">사라지지 않고 전환돼요</span>';
    } else {
      a = S.pw.t.toFixed(1) + '시간';
      b = S.pw.t < 0.2 ? '—' : '<span class="hot">전기 에너지 많이 씀</span>';
      c = S.pw.t < 0.2 ? '—' : '<span class="ok">전기 에너지 적게 씀</span>';
    }
    rv[0].innerHTML = a; rv[1].innerHTML = b; rv[2].innerHTML = c;
  }

  /* ================= 퀴즈 그림 (SVG) ================= */
  const FIG_TAP = '<svg viewBox="0 0 340 150" width="330" role="img" aria-label="멀티탭 하나에 전기난로, 헤어드라이어, 전기밥솥, 전기 주전자를 모두 꽂은 그림">' +
    '<rect x="6" y="8" width="328" height="134" rx="14" fill="#f3f6fc" stroke="#dde4ef"/>' +
    '<rect x="30" y="100" width="280" height="26" rx="10" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>' +
    [60, 120, 180, 240].map((x) => '<rect x="' + x + '" y="106" width="22" height="14" rx="3" fill="#374151"/>').join('') +
    [['전기난로', 71], ['드라이어', 131], ['전기밥솥', 191], ['주전자', 251]].map((o) => '<rect x="' + (o[1] - 28) + '" y="30" width="56" height="44" rx="8" fill="#fff" stroke="#9ca3af"/><text x="' + o[1] + '" y="57" font-size="12" font-weight="800" text-anchor="middle" fill="#1b2333">' + o[0] + '</text><line x1="' + o[1] + '" y1="74" x2="' + o[1] + '" y2="106" stroke="#4b5563" stroke-width="3"/>').join('') +
    '<path d="M310 113 H328" stroke="#4b5563" stroke-width="4"/><text x="318" y="96" font-size="11" font-weight="800" text-anchor="middle" fill="#c2410c">벽 콘센트</text>' +
    '<text x="170" y="22" font-size="12" font-weight="800" text-anchor="middle" fill="#b91c1c">병렬로 연결된 기구가 많아요!</text></svg>';
  const FIG_GRADE = '<svg viewBox="0 0 340 170" width="330" role="img" aria-label="에너지 소비 효율 등급 1등급이 가장 효율이 높고 5등급이 가장 낮은 막대 그림">' +
    '<rect x="6" y="6" width="328" height="158" rx="14" fill="#f3f6fc" stroke="#dde4ef"/>' +
    [['1등급', 200, '#16a34a'], ['2등급', 170, '#65a30d'], ['3등급', 140, '#eab308'], ['4등급', 110, '#f97316'], ['5등급', 80, '#dc2626']].map((o, i) => '<rect x="20" y="' + (16 + i * 28) + '" width="' + o[1] + '" height="22" rx="6" fill="' + o[2] + '"/><text x="30" y="' + (32 + i * 28) + '" font-size="14" font-weight="800" fill="#fff">' + o[0] + '</text>').join('') +
    '<text x="232" y="34" font-size="12" font-weight="800" fill="#15803d">효율 높음</text><text x="232" y="146" font-size="12" font-weight="800" fill="#b91c1c">효율 낮음</text>' +
    '<text x="232" y="86" font-size="11" font-weight="700" fill="#5b667a">같은 일을 할 때</text><text x="232" y="101" font-size="11" font-weight="700" fill="#5b667a">전기 에너지를</text><text x="232" y="116" font-size="11" font-weight="700" fill="#5b667a">적게 써요</text></svg>';

  /* ================= 단계별 학습 ================= */
  game = SciSim.game({
    simId: 'm2-series-parallel',
    mount: '#game',
    badge: '전기 회로 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      bulbs: '💡 전구와 회로판', ammeter: 'Ⓐ 전류계', parallel: '🔀 병렬 회로판', volts: 'Ⓥ 전구에 걸리는 전압',
      energy: '🔄 에너지 카드', power: '⚡ 두 전구의 소비 전력',
    },
    onFeatures(set) { F = set; },
    levels: [
      /* ---------- 1단계 ---------- */
      {
        title: '직렬연결: 한 줄로 이은 전구', short: '직렬', icon: '🔌', phase: '실험',
        features: ['bulbs', 'ammeter'],
        intro: '<p class="si-q">❓ 탐구 질문: 집 안의 전등 하나를 꺼도 다른 전등이 켜져 있는 까닭은?</p>' +
          '<p>먼저 전구를 <b>한 줄로</b> 이어 보아요(<b>직렬연결</b>). 전구를 하나씩 더 끼우면 전류계의 값과 전구의 밝기가 어떻게 달라지는지 살펴봐요.</p>',
        setup() { setScene('series'); showHint('👆 보관함의 전구를 끌어 회로판의 빈 자리에 끼워요', 8000); },
        recap: '직렬연결에서는 전구를 더 연결할수록 전체 <b>전류가 줄어</b> 전구가 어두워져요. 하나를 빼면 회로가 끊겨 <b>모두 꺼져요</b>.',
        summary: '<ul><li><b>직렬연결</b>: 전구를 한 줄로 연결한 것. 전류가 흐르는 길이 <b>하나</b>뿐이다.</li>' +
          '<li>전구를 더 연결하면 전체 <b>전류가 약해져</b> 각 전구가 <b>어두워진다</b>. (각 전구에 걸리는 전압이 나누어진다.)</li>' +
          '<li>전구 하나를 빼거나 하나가 고장 나면 회로가 끊겨 <b>모든 전구가 꺼진다</b>.</li></ul>',
        missions: [
          {
            title: '전구를 하나씩 직렬로 연결하기',
            goal: '전구를 <b>1개 → 2개 → 3개</b>로 늘려 보세요. 전류계의 값과 전구의 밝기를 비교해요.',
            hint: '보관함의 전구를 끌어 빈 자리에 놓거나, 전구를 톡 눌러요. 연결선이 있던 자리에 전구를 끼우면 돼요.',
            setup() { setScene('series'); layoutBoard(1, false); resetFlags(); },
            check: () => S.mode === 'series' && S.scene === 'series' && S.seen[1] && S.seen[2] && S.seen[3],
            status: () => box(S.seen[1]) + ' 1개 ' + box(S.seen[2]) + ' 2개 ' + box(S.seen[3]) + ' 3개 · 전류 <b>' + S.Id.toFixed(2) + ' A</b>',
            hold: 0.5,
            explain: '전구가 1개일 때 0.60 A, 2개일 때 0.30 A, 3개일 때 0.20 A로 <b>전류가 줄어요</b>. 전류가 약해지니 전구가 점점 어두워져요.',
          },
          {
            title: '전구 하나 빼 보기',
            goal: '전구 3개가 직렬로 켜져 있어요. 그중 <b>전구 하나를 빼</b> 보세요. 나머지 전구는 어떻게 될까요?',
            hint: '켜진 전구를 끌어 보관함에 놓거나, 톡 눌러 빼요.',
            setup() { setScene('series'); layoutBoard(3, false); resetFlags(); showHint('👆 전구 하나를 빼 보세요', 6000); },
            check: () => S.mode === 'series' && S.scene === 'series' && S.sol.open && S.stableT > 0.3 && S.cut,
            status: () => box(S.sol.open) + ' 전구 빼기 · 나머지 전구는 <b>' + (bulbs.some((b) => b.slot >= 0 && b.glow > 0.2) ? '켜져 있음' : '모두 꺼짐') + '</b>',
            hold: 0.4,
            explain: '직렬연결은 전류가 흐르는 길이 하나뿐이에요. 전구 하나를 빼면 회로가 <b>끊어져</b> 나머지 전구도 모두 꺼져요.',
          },
          {
            type: 'quiz',
            title: '왜 어두워질까?',
            goal: '직렬로 연결하는 전구가 늘어날수록 각 전구가 어두워지는 까닭은?',
            setup() { setScene('series'); layoutBoard(3, false); resetFlags(); },
            choices: [
              '전원 장치의 전압이 점점 낮아지기 때문',
              '전구가 늘어나면 전체 전류가 약해지기 때문',
              '전자가 전구를 지날 때마다 사라지기 때문',
              '전구마다 흐르는 전류가 서로 다르기 때문',
            ],
            answer: 1,
            feedback: [
              '전원 장치의 전압은 6.0 V 그대로예요. 전압이 나누어 걸리는 거예요.',
              '',
              '전류는 소모되지 않아요(전류의 모형에서 배웠어요). 전자는 사라지지 않고 계속 돌아요.',
              '직렬연결에서는 전류가 흐르는 길이 하나라서 모든 전구에 같은 세기의 전류가 흘러요.',
            ],
            explain: '전구가 늘어나면 전류가 흐르기 어려워져 <b>전체 전류가 약해져요</b>. 직렬연결에서는 모든 전구에 같은 전류가 흐르므로, 전류가 약해지면 전구가 모두 어두워져요.',
          },
        ],
      },
      /* ---------- 2단계 ---------- */
      {
        title: '병렬연결: 갈래로 이은 전구', short: '병렬', icon: '🔀', phase: '실험',
        features: ['parallel', 'volts'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직렬연결은 전구를 더할수록 어두워지고, 하나를 빼면 모두 꺼진다는 것을 알았어요.</div>' +
          '<p>이번에는 전구를 <b>갈래로 나누어</b> 이어 봐요(<b>병렬연결</b>). 새로 열린 <b>전압 표시</b>로 각 전구에 걸리는 전압도 확인해요.</p>',
        setup() { setScene('parallel'); showHint('👆 보관함의 전구를 끌어 가운데 빈 자리에 끼워요', 8000); },
        recap: '병렬연결에서는 각 전구에 전원 전압이 <b>그대로</b> 걸려 밝기가 유지되고, 하나를 빼도 나머지는 켜져요. 전구를 더 연결할수록 <b>전체 전류는 늘어요</b>.',
        summary: '<ul><li><b>병렬연결</b>: 전구를 여러 갈래로 나누어 연결한 것. 전류가 흐르는 길이 <b>여러 개</b>이다.</li>' +
          '<li>각 전구에 <b>전원의 전압이 그대로</b> 걸리므로 전구의 밝기가 변하지 않는다.</li>' +
          '<li>전구 하나를 빼도 <b>나머지 전구는 켜져 있다</b>.</li>' +
          '<li>전구를 더 연결할수록 <b>전체 전류가 커진다</b>. (멀티탭에 전기 기구를 너무 많이 꽂으면 전류가 지나치게 커져 과열·화재의 위험이 있다.)</li>' +
          '<li>가정의 전기 배선은 <b>병렬연결</b>이다.</li></ul>',
        missions: [
          {
            title: '병렬로 연결하고 하나 빼기',
            goal: '전구를 <b>3개까지 병렬로</b> 연결한 뒤, 그중 <b>하나를 빼</b> 보세요. 전구 밝기와 전류계의 값은 어떻게 달라지나요?',
            hint: '전구를 빈 자리에 끼우면 새 갈래가 켜져요. 3개가 모두 켜진 다음에 하나를 빼요.',
            setup() { setScene('parallel'); layoutBoard(1, false); resetFlags(); },
            check: () => S.mode === 'parallel' && S.scene === 'parallel' && S.three && S.parCut,
            status: () => box(S.three) + ' 전구 3개 병렬 연결 · ' + box(S.parCut) + ' 하나 빼도 나머지는 켜짐 · 전류 <b>' + S.Id.toFixed(2) + ' A</b>',
            hold: 0.4,
            explain: '전구를 더할 때마다 전류계의 값이 <b>0.60 A → 1.20 A → 1.80 A</b>로 늘어요. 각 전구는 6.0 V가 그대로 걸려 밝기가 같고, 하나를 빼도 나머지 길로 전류가 흘러 계속 켜져요.',
          },
          {
            type: 'quiz',
            title: '가정의 전기 배선',
            goal: '집 안의 전등 하나를 꺼도 다른 전등이 켜져 있는 것은 전등이 어떻게 연결되어 있기 때문일까요?',
            setup() { setScene('parallel'); },
            choices: [
              '직렬로 연결되어 있어서, 각 전등에 전류가 나뉘기 때문',
              '병렬로 연결되어 있어서, 각 전등에 전원 전압이 그대로 걸리고 전류가 흐르는 길이 따로 있기 때문',
              '전등마다 전원 장치가 하나씩 따로 있기 때문',
              '전류가 한 전등에서 다음 전등으로 차례로 이동하기 때문',
            ],
            answer: 1,
            feedback: [
              '직렬이라면 하나를 빼면 모두 꺼졌어요(1단계). 병렬로 확인해 보세요.',
              '',
              '집의 모든 전등은 같은 전원(콘센트)에 연결되어 있어요. 연결 방법이 달라요.',
              '그건 직렬연결의 모습이에요. 병렬연결은 길이 갈라져 있어요.',
            ],
            explain: '가정의 전기 배선은 <b>병렬연결</b>이에요. 각 전기 기구에 같은 전압이 걸리고, 길이 따로 있어서 하나를 꺼도 나머지는 그대로 켜져 있어요.',
          },
          {
            type: 'quiz',
            title: '멀티탭 과부하',
            goal: '멀티탭 하나에 전기 기구를 여러 개 꽂으면 위험한 까닭은?',
            figure: FIG_TAP,
            setup() { setScene('parallel'); layoutBoard(3, false); resetFlags(); },
            choices: [
              '병렬연결이라 기구를 늘릴수록 전체 전류가 커져서, 멀티탭이 과열되어 화재가 날 수 있기 때문',
              '병렬연결이라 기구를 늘릴수록 전압이 낮아져서 기구가 고장 나기 때문',
              '직렬연결이라 기구 하나가 고장 나면 모두 꺼지기 때문',
              '기구를 늘려도 전체 전류는 변하지 않으므로 안전하기 때문',
            ],
            answer: 0,
            feedback: [
              '',
              '병렬연결에서는 각 기구에 걸리는 전압은 그대로예요. 달라지는 것은 전류예요.',
              '멀티탭의 기구들은 병렬로 연결되어 있어요.',
              '전류계의 값이 어떻게 변했는지 떠올려 보세요. 전구를 늘릴수록 커졌죠?',
            ],
            explain: '병렬연결에서는 기구를 더할수록 <b>전체 전류가 커져요</b>. 멀티탭이 견딜 수 있는 전류를 넘으면 과열되어 위험해요. 한 멀티탭에 전력이 큰 기구를 한꺼번에 꽂지 않아요.',
          },
        ],
      },
      /* ---------- 3단계 ---------- */
      {
        title: '전기 에너지의 전환', short: '에너지 전환', icon: '🔄', phase: '관찰',
        features: ['energy'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 병렬로 연결된 전구에 전류가 흐르면 빛이 난다는 것을 확인했어요.</div>' +
          '<p>전기 기구는 전기 에너지를 받아 <b>다른 형태의 에너지</b>로 바꿔 우리에게 필요한 일을 해요. 가전제품마다 어떤 에너지로 바뀌는지 짝지어 봐요.</p>',
        setup() { setScene('energy'); showHint('👆 에너지 카드를 끌어 가전제품 위에 놓아요', 7000); },
        recap: '전기 에너지는 빛, 열, 운동, 소리, 화학 에너지 등 <b>여러 가지 에너지로 전환</b>돼요. 에너지는 사라지지 않고 다른 형태로 바뀌어요.',
        summary: '<ul><li>전기 기구는 <b>전기 에너지</b>를 다른 에너지로 <b>전환</b>하여 사용한다.</li>' +
          '<li>전등: 빛(+열) · 선풍기: 운동 · 스피커: 소리 · 전기난로: 열 · 휴대 전화 충전: 화학 에너지</li>' +
          '<li>에너지는 사라지지 않고 <b>다른 형태로 바뀔 뿐</b>이다.</li></ul>',
        missions: [
          {
            title: '가전제품의 에너지 전환 짝짓기',
            goal: '에너지 카드를 끌어 가전제품에 놓아 보세요. 맞게 놓으면 에너지가 흘러나와요. <b>전등은 2가지</b>예요! 다 맞추면 [확인하기]를 눌러요.',
            hint: '전등은 빛과 열, 선풍기는 날개가 도는 운동, 스피커는 소리, 전기난로는 따뜻한 열, 휴대 전화 충전은 배터리에 저장되는 화학 에너지예요.',
            manual: true,
            setup() { setScene('energy'); resetEnergy(); },
            check: () => {
              const miss = S.en.cards.filter((c) => !c.expect.every((e) => c.chips.indexOf(e) >= 0));
              if (miss.length) return '아직 에너지 카드를 모두 놓지 못한 가전제품이 있어요: ' + miss.map((c) => c.name).join(', ') + '.';
              return true;
            },
            explain: '전등은 전기 에너지를 <b>빛과 열</b>로, 선풍기는 <b>운동</b>, 스피커는 <b>소리</b>, 전기난로는 <b>열</b>, 휴대 전화 충전기는 <b>화학 에너지</b>(배터리에 저장)로 바꿔요.',
          },
          {
            type: 'quiz',
            title: '전기 에너지는 어디로?',
            goal: '전기난로를 켜 두면 방이 따뜻해져요. 이때 전기 에너지는 어떻게 될까요?',
            setup() { setScene('energy'); },
            choices: [
              '전기 에너지가 사라진다',
              '전기 에너지가 열에너지로 전환되어 방을 따뜻하게 한다',
              '전기 에너지가 전류가 되어 난로에 쌓인다',
              '전기 에너지가 새로운 에너지를 만들어 더 많아진다',
            ],
            answer: 1,
            feedback: [
              '에너지는 사라지지 않아요. 따뜻해진 방을 떠올려 보세요.',
              '',
              '쌓이는 것이 아니라 열로 바뀌어 퍼져 나가요.',
              '에너지는 새로 생기지도 않아요. 바뀌기만 해요.',
            ],
            explain: '에너지는 <b>사라지거나 새로 생기지 않고</b> 다른 형태로 전환돼요. 전기난로에서는 전기 에너지가 <b>열에너지</b>로 전환돼요.',
          },
        ],
      },
      /* ---------- 4단계 ---------- */
      {
        title: '소비 전력과 효율적인 사용', short: '소비 전력', icon: '⚡', phase: '적용',
        features: ['power'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기 에너지가 빛·열·운동 등으로 전환된다는 것을 알았어요.</div>' +
          '<p>같은 밝기의 <b>백열전구(60 W)</b>와 <b>LED 전구(약 9 W)</b>를 같은 시간 동안 켜면 전기 에너지를 얼마나 쓸까요? 계산은 하지 않고, 에너지 막대를 비교해 봐요. <b>소비 전력(W)</b>은 <b>1초 동안 사용하는 전기 에너지</b>예요.</p>',
        setup() { setScene('power'); showHint('👆 시간을 흘려 보내며 두 막대를 비교해요', 7000); },
        recap: '<b>소비 전력</b>이 큰 기구는 같은 시간 동안 더 많은 전기 에너지를 써요. 효율이 높은 제품을 고르고 아껴 쓰는 것이 중요해요.',
        summary: '<ul><li><b>소비 전력(W)</b>: 1초 동안 사용하는 전기 에너지. 소비 전력이 클수록 같은 시간에 더 많은 전기 에너지를 쓴다.</li>' +
          '<li>같은 밝기에서 백열전구(60 W)보다 LED 전구(약 9 W)는 <b>적은 에너지</b>를 쓴다. 백열전구는 전기 에너지의 대부분이 <b>열</b>로 전환된다.</li>' +
          '<li><b>에너지 소비 효율 등급</b>: 1등급일수록 같은 일을 하는 데 전기 에너지를 적게 쓴다.</li>' +
          '<li>효율적 사용 실천: 효율 높은 제품 고르기, 쓰지 않는 전등·기기 끄기, 플러그 뽑기 → 에너지 절약과 기후변화 대응에 도움이 된다.</li></ul>',
        missions: [
          {
            title: '같은 시간 켜 보기',
            goal: '시간을 <b>5시간 이상</b>으로 늘려, 두 전구가 쓴 전기 에너지 막대를 비교해 보세요.',
            hint: '아래 슬라이더를 오른쪽으로 밀거나 [시간 흐르게 하기]를 눌러요.',
            setup() { setScene('power'); S.pw.t = 0; S.pw.bar = [0, 0]; setPlaying(false); syncTime(); },
            check: () => S.scene === 'power' && S.pw.t >= 5,
            status: () => '켜 둔 시간 <b>' + S.pw.t.toFixed(1) + '시간</b> · ' + box(S.pw.t >= 5) + ' 5시간 이상',
            hold: 1,
            explain: '같은 시간 동안 켜 두면 소비 전력이 큰 <b>백열전구(60 W)</b>가 <b>LED 전구(약 9 W)</b>보다 훨씬 많은 전기 에너지를 써요. 백열전구는 쓴 에너지의 대부분이 열로 바뀌어요.',
          },
          {
            type: 'quiz',
            title: '소비 전력이 뜻하는 것',
            goal: '60 W 백열전구와 9 W LED 전구를 같은 시간 동안 켜 두었을 때 옳은 설명은?',
            setup() { setScene('power'); S.pw.t = 6; S.pw.bar = [60 * 6 / 600, 9 * 6 / 600]; syncTime(); },
            choices: [
              '소비 전력이 작은 LED 전구가 전기 에너지를 더 많이 쓴다',
              '두 전구가 쓰는 전기 에너지는 켜 둔 시간이 같으면 항상 같다',
              '소비 전력이 큰 백열전구가 1초에 더 많은 전기 에너지를 쓰므로, 같은 시간에는 더 많이 쓴다',
              '소비 전력은 전구가 켜진 시간의 길이를 나타낸다',
            ],
            answer: 2,
            feedback: [
              '막대의 길이를 비교해 보세요. 어느 쪽이 더 길었나요?',
              '소비 전력이 다르면 1초 동안 쓰는 에너지가 달라요. 막대 길이가 달랐죠?',
              '',
              '소비 전력(W)은 시간이 아니라 1초 동안 사용하는 전기 에너지의 양이에요.',
            ],
            explain: '<b>소비 전력(W)</b>은 1초 동안 사용하는 전기 에너지예요. 소비 전력이 큰 기구는 <b>같은 시간 동안 더 많은 전기 에너지</b>를 사용해요.',
          },
          {
            type: 'quiz',
            title: '전기를 효율적으로 쓰려면?',
            goal: '지구의 환경과 기후변화를 생각할 때, 전기를 효율적으로 쓰는 방법으로 알맞지 않은 것은?',
            figure: FIG_GRADE,
            setup() { setScene('power'); },
            choices: [
              '에너지 소비 효율 1등급 제품을 고른다',
              '쓰지 않는 방의 전등을 끄고, 안 쓰는 플러그는 뽑는다',
              '밝기가 같다면 소비 전력이 작은 LED 전구를 쓴다',
              '소비 전력이 큰 제품일수록 좋은 제품이므로 가장 큰 것을 고른다',
            ],
            answer: 3,
            feedback: [
              '1등급은 같은 일을 하는 데 전기 에너지를 가장 적게 써요. 알맞은 방법이에요.',
              '쓰지 않을 때 끄면 에너지를 아낄 수 있어요. 알맞은 방법이에요.',
              '같은 밝기라면 적게 쓰는 쪽이 효율적이에요. 알맞은 방법이에요.',
              '',
            ],
            explain: '소비 전력이 크다고 해서 좋은 제품은 아니에요. <b>같은 일을 하면서 에너지를 적게 쓰는 효율 높은 제품</b>을 고르고, 필요 없을 때는 끄는 것이 에너지 절약과 기후변화 대응에 도움이 돼요.',
          },
        ],
      },
    ],
  });
  window.__sim = { S, bulbs, slotBulb, setScene, layoutBoard, game: () => game, solve, dropToken, resetEnergy, setPlaying, syncTime, TRAY, SER, PAR, slotPos, cardAt, EN_KEYS };

  /* ---------- 시작 ---------- */
  setScene('series');
  resetEnergy();
  let lastFree = null;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; sceneSeg.hidden = !lastFree; }
    if (S.en.msg) { S.en.msg.t -= dt; if (S.en.msg.t <= 0) S.en.msg = null; }
    if (isBoard()) updateBoard(dt); else if (S.scene === 'power') updatePower(dt);
    parts.update(dt);
    view.clear('#eaf0fb');
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eaf0fb'); g.addColorStop(1, '#f9fbff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = S.fade; ctx.translate(0, (1 - S.fade) * 12);
    if (isBoard()) drawBoard(t); else if (S.scene === 'energy') drawEnergy(t); else drawPower(t);
    parts.draw(ctx);
    ctx.restore();
    updateReadouts(t);
  });
})();
