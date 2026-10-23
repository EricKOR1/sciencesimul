/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 포물선 운동 (2차시)
   성취기준 [12역학01-02] 뉴턴 운동 법칙을 이용하여 물체의 포물선 운동을 정량적으로 설명하고, 포물선 운동에서의 역학적 에너지를 구할 수 있다. (앞부분: 운동의 설명)
   ① 관찰: 궤적 관찰 (각도에 따른 사거리, 0.2 s 잔상, 최고점·낙하점)
   ② 분석: 성분 분해 (영상 프레임 분석: x–t는 직선, y–t는 포물선, 수평·연직 속도 성분)
   ③ 모형: 운동 식 (x = v₀cosθ·t, y = v₀sinθ·t − ½gt², T·H·R 유도)
   ④ 적용: 목표 맞히기 (지면 표적, 옥상 수평 발사, 담장 넘기기)
   공기 저항·지구 자전·경사면에 떨어지는 문제는 다루지 않아요. g = 10 m/s². 역학적 에너지는 다음 차시에서 다뤄요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 560;
  const SH = PHONE ? 340 : 330;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MINUS = '−';
  const fx = (v, d) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const D = SciSim.draw(ctx);
  const _dtext = D.text, _dlabel = D.label;
  D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
  D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function card(x, y, w, h) { D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke(); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  function labIn(x, y, str, o, x0, x1) {
    ctx.save(); ctx.font = D.font(Math.max(13, o.size || 13), 800); const w = ctx.measureText(str).width + 16; ctx.restore();
    const al = o.align || 'center';
    let lx = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
    lx = Math.max(x0, Math.min(x1 - w, lx));
    return D.label(al === 'left' ? lx : al === 'right' ? lx + w : lx + w / 2, y, str, Object.assign({}, o, { align: al }));
  }
  function lines(x, y, lh, fs, arr) { arr.forEach((l, i) => T(x, y + i * lh, l[0], fs, l[1] || '#26324a', 'left', 800)); }
  function axes(rc, o) {
    const ml = PHONE ? 36 : 40, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    card(rc.x, rc.y, rc.w, rc.h);
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      const z = Math.abs(yv - o.ymin) < 1e-9;
      ctx.strokeStyle = z ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, o.yd != null ? yv.toFixed(o.yd) : String(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, o.xd != null ? xv.toFixed(o.xd) : String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, '#26324a', 'left', 800);
    if (o.right) T(rc.x + rc.w - 8, rc.y + 21, o.right, 13.5, '#c2410c', 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }

  /* ================= 상수 ================= */
  const G = 10;
  const V0_FIX = 20;                                      // ①의 처음 속력
  const VX = 6, VY0 = 8, NF = 9, FDT = 0.2;               // 영상 속 공 (v₀ = 10 m/s, 53°)
  const vidPos = (t) => ({ x: VX * t, y: VY0 * t - 0.5 * G * t * t });
  const SCN = {
    a: { name: '지면 표적', h0: 0, tx: 30, tr: 1.0, wall: null },
    b: { name: '옥상', h0: 45, tx: 30, tr: 1.0, wall: null },
    c: { name: '담장', h0: 0, tx: 0, tr: 0, wall: { x: 8, h: 3 } },
  };
  const ORDER = [
    '알짜힘은 중력 mg뿐 → 수평 가속도 ax = 0, 연직 가속도 ay = −g',
    '속도: vx = v₀cosθ (일정), vy = v₀sinθ − gt',
    '위치: x = v₀cosθ·t,  y = v₀sinθ·t − ½gt²',
    '최고점에서 vy = 0 → 올라가는 시간 t = v₀sinθ / g',
    '내려오는 시간도 같으므로 비행 시간 T = 2v₀sinθ / g',
    'H = (v₀sinθ)² / 2g,  R = v₀cosθ·T = v₀² sin2θ / g',
  ];
  const ORDER_RULES = [[0, 1], [0, 2], [1, 2], [1, 3], [3, 4], [4, 5], [2, 5]];   // [앞, 뒤]

  /* ---------- 물리 ---------- */
  function flight(v0, th, h0, wall) {
    const r = th * RAD, vx = v0 * Math.cos(r), vy = v0 * Math.sin(r);
    const Tt = (vy + Math.sqrt(vy * vy + 2 * G * h0)) / G;
    const H = h0 + (vy > 0 ? vy * vy / (2 * G) : 0);
    const tw = wall && vx > 1e-6 ? wall.x / vx : null;
    const yw = tw != null ? h0 + vy * tw - 0.5 * G * tw * tw : null;
    let tEnd = Tt, hitWall = false;
    if (wall && tw != null && tw < Tt && yw < wall.h) { tEnd = tw; hitWall = true; }
    return { vx, vy, T: Tt, H, R: vx * Tt, tH: vy > 0 ? vy / G : 0, tEnd, hitWall, yWall: yw, clear: !!wall && tw != null && tw < Tt && yw >= wall.h };
  }
  const posAt = (fl, h0, t) => ({ x: fl.vx * t, y: h0 + fl.vy * t - 0.5 * G * t * t });
  const nice = (x, list) => list.find((n) => n >= x) || list[list.length - 1];

  /* ---------- 상태 ---------- */
  function mkShot(v0, th, h0) { return { v0, th, h0: h0 || 0, st: 'idle', t: 0, kf: 1, fl: null, scale: null, rec: [], last: null, res: null }; }
  const S = {
    mode: 'throw', clock: 0, fade: 0,
    sh: mkShot(V0_FIX, 45, 0),
    vd: { fr: 0, tp: 0, play: false, mk: new Array(NF).fill(false), flash: 0 },
    ord: [3, 0, 5, 2, 4, 1], ordBad: {},
    tg: { sc: 'a', shots: { a: mkShot(20, 45, 0), b: mkShot(15, 0, 45), c: mkShot(15, 45, 0) }, hit: { a: false, b: false, c: false } },
    flags: { lockV: false, lockA: false, order: false, mcalc: false, vcalc: false, hide: false },
  };
  let game = null;
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const eff = (k) => (game && game.free ? false : S.flags[k]);
  const curShot = () => (S.mode === 'target' ? S.tg.shots[S.tg.sc] : S.sh);
  const tgWall = () => SCN[S.tg.sc].wall;

  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); stopRuns(); S.vd.play = false; }
    S.mode = mode;
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  function stopRuns() { [S.sh, S.tg.shots.a, S.tg.shots.b, S.tg.shots.c].forEach((p) => { if (p.st === 'fly') { p.st = 'idle'; p.t = 0; } }); }
  function shotReset(P) { P.st = 'idle'; P.t = 0; P.res = null; }
  function shotLaunch(P, wall) {
    if (P.st === 'fly') return;
    const fl = flight(P.v0, P.th, P.h0, wall);
    P.fl = fl; P.st = 'fly'; P.t = 0; P.res = null; P.kf = Math.max(1, fl.tEnd / 3.2); parts.clear(); Sound.click(); updateCtl();
  }
  function shotStep(P, dt, wall, onDone) {
    if (P.st !== 'fly') return;
    P.t = Math.min(P.fl.tEnd, P.t + dt * P.kf * (RM ? 5 : 1));
    if (P.t >= P.fl.tEnd - 1e-9) { P.t = P.fl.tEnd; P.st = 'done'; onDone && onDone(P); updateCtl(); }
  }
  function recordShot(P) {
    const fl = P.fl, row = { th: P.th, v0: P.v0, T: fl.T, H: fl.H, R: fl.R };
    const i = P.rec.findIndex((x) => x.th === row.th && x.v0 === row.v0); if (i >= 0) P.rec.splice(i, 1);
    P.rec.push(row); if (P.rec.length > 6) P.rec.shift();
    P.last = row;
  }
  function onThrowDone(P) {
    recordShot(P); Sound.success();
    const g = geo(P, null);
    parts.burst(g.X(P.fl.R), g.gy - 4, { count: 12, speed: 110, size: 3, colors: ['#14a058', '#ffd447', '#fff'], gravity: 140, life: 0.7 });
  }
  function onTargetDone(P) {
    const sc = SCN[S.tg.sc], fl = P.fl;
    let ok = false, msg = '';
    if (S.tg.sc === 'c') {
      ok = fl.clear;
      msg = fl.hitWall ? '담장에 부딪혔어요 (담장 위치에서 높이 ' + fl.yWall.toFixed(1) + ' m)' : (fl.clear ? '담장을 넘었어요! (담장 위 높이 ' + fl.yWall.toFixed(1) + ' m)' : '담장에 닿기 전에 떨어졌어요');
    } else {
      const d = fl.R - sc.tx; ok = Math.abs(d) <= sc.tr + 1e-9;
      msg = ok ? '명중! 낙하점 ' + fl.R.toFixed(1) + ' m' : '빗나감: 낙하점 ' + fl.R.toFixed(1) + ' m (' + (d > 0 ? '+' : MINUS) + Math.abs(d).toFixed(1) + ' m)';
    }
    P.res = { ok, msg };
    if (ok) S.tg.hit[S.tg.sc] = true;
    const g = geo(P, sc.wall), pe = posAt(fl, P.h0, fl.tEnd);
    parts.burst(g.X(pe.x), g.Y(pe.y), ok ? { count: 22, speed: 160, size: 3.5, colors: ['#14a058', '#ffd447', '#fff', '#3867f4'], gravity: 160, life: 0.9 } : { count: 8, speed: 70, size: 2.6, colors: ['#98a2b3', '#fff'], gravity: 160, life: 0.5 });
    if (ok) Sound.success(); else Sound.click();
  }

  /* ================= 던지기 장면 ================= */
  const GEO = { ox: PHONE ? 30 : 56 };
  function geo(P, wall, target) {
    const gy = SH - 34, ox0 = P.h0 > 0 ? GEO.ox + 6 : GEO.ox;
    const fl = flight(P.v0, P.th, P.h0, null);
    const xn = Math.max(fl.R, target ? target.tx + 3 : 0, wall ? wall.x + 5 : 0, 10) * 1.06;
    const yn = Math.max(fl.H * 1.22, wall ? wall.h * 2.2 : 0, 4.5);
    const target_s = clamp(Math.min((VW - ox0 - 16) / xn, (gy - 60) / yn), 3, 60);
    if (P.scale == null) P.scale = target_s;
    const s = P.scale;
    const ox = ox0 + (P.h0 > 0 ? Math.max(0, (VW - ox0 - 16) - xn * s) * 0.3 : 0);   // 세로로 큰 장면은 오른쪽으로 조금 옮겨요
    return { gy, ox, s, ts: target_s, X: (x) => ox + x * s, Y: (y) => gy - y * s };
  }
  function drawShot(P, o, dt) {
    o = o || {};
    const wall = o.wall || null, tgt = o.target || null;
    const g0 = geo(P, wall, tgt);
    P.scale = approach(P.scale, g0.ts, dt, 6);
    const g = geo(P, wall, tgt), { gy, ox, s, X, Y } = g;
    const fl = P.st === 'idle' || !P.fl ? flight(P.v0, P.th, P.h0, wall) : P.fl;
    // 배경
    const sky = ctx.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#cfe6fb'); sky.addColorStop(1, '#f1f8ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, SH);
    ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH);
    const gr = ctx.createLinearGradient(0, gy, 0, SH); gr.addColorStop(0, '#9fd08a'); gr.addColorStop(1, '#7fb46a');
    ctx.fillStyle = gr; ctx.fillRect(0, gy, VW, SH - gy);
    ctx.fillStyle = '#5f9a4e'; ctx.fillRect(0, gy, VW, 3);
    // 눈금자 (m)
    const stepList = [1, 2, 5, 10, 20, 50], step = stepList.find((n) => n * s >= (PHONE ? 44 : 52)) || 50;
    for (let m = 0; X(m) < VW - 10; m += step) { ctx.strokeStyle = '#2d4a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(m), gy); ctx.lineTo(X(m), gy + 7); ctx.stroke(); T(X(m), gy + 25, m + (m + step * 2 >= (VW - ox) / s ? '' : ''), 13, '#1f3a18', 'center', 800); }
    T(VW - 10, gy + 25, 'm', 13, '#1f3a18', 'right', 800);
    // 옥상 건물
    if (P.h0 > 0) {
      const bw = ox - 6 + 8, top = Y(P.h0);
      D.shadow(() => { D.roundRect(-10, top, bw + 10, gy - top, 4); const bg = ctx.createLinearGradient(0, top, 0, gy); bg.addColorStop(0, '#d7dce6'); bg.addColorStop(1, '#b9c1cf'); ctx.fillStyle = bg; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#9aa5b8'; ctx.fillRect(-10, top, bw + 10, 5);
      T(6, top + 24, '옥상 ' + P.h0 + ' m', 13, '#26324a', 'left', 800);
    }
    // 담장
    if (wall) {
      const wx = X(wall.x), wt = Y(wall.h);
      D.shadow(() => { D.roundRect(wx - 5, wt, 10, gy - wt, 2); const wg = ctx.createLinearGradient(wx - 5, 0, wx + 5, 0); wg.addColorStop(0, '#d9a066'); wg.addColorStop(1, '#b97a40'); ctx.fillStyle = wg; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.5; for (let yy = gy - 9; yy > wt; yy -= 9) { ctx.beginPath(); ctx.moveTo(wx - 5, yy); ctx.lineTo(wx + 5, yy); ctx.stroke(); }
      labIn(wx + 8, wt - 14, '담장 ' + wall.h + ' m (' + wall.x + ' m 앞)', { bg: '#8a5a2a', size: 13, align: 'left' }, 8, VW - 8);
    }
    // 표적
    if (tgt) {
      const tx = X(tgt.tx), rr = Math.max(9, tgt.tr * s), pulse = 1 + 0.06 * Math.sin(S.clock * 4);
      ctx.save(); ctx.translate(tx, gy + 1); ctx.scale(1, 0.34);
      [[1, '#e2464b'], [0.62, '#fff'], [0.28, '#e2464b']].forEach(([f, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, rr * f * pulse, 0, TAU); ctx.fill(); });
      ctx.restore();
      labIn(tx, gy - 18, '표적 ' + tgt.tx + ' m', { bg: '#e2464b', size: 13 }, 8, VW - 8);
    }
    // 던지는 장치
    const lx = X(0), ly = Y(P.h0);
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(-P.th * RAD);
    D.shadow(() => { D.roundRect(-6, -5, 34, 10, 4); const bg = ctx.createLinearGradient(0, -5, 0, 5); bg.addColorStop(0, '#6b7a99'); bg.addColorStop(1, '#3a465c'); ctx.fillStyle = bg; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.restore();
    D.sphere(lx, ly, 8, '#7c8aa5', { gloss: false, outline: '#3a465c' });
    // 예측 점선 (식으로 계산한 궤적)
    if (o.preview) {
      ctx.save(); ctx.setLineDash([4, 7]); ctx.strokeStyle = 'rgba(109,63,214,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      const n = 60; for (let i = 0; i <= n; i++) { const p = posAt(fl, P.h0, fl.tEnd * i / n); if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); } ctx.stroke(); ctx.restore();
    }
    // 비행
    if (P.st !== 'idle' && P.fl) {
      const f = P.fl, t = P.t, rb = clamp(0.32 * s, 5.5, 9);
      ctx.strokeStyle = 'rgba(226,70,75,.75)'; ctx.lineWidth = 3; ctx.beginPath();
      const n = 50; for (let i = 0; i <= n; i++) { const p = posAt(f, P.h0, t * i / n); if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); } ctx.stroke();
      for (let k = 1; k * FDT <= t + 1e-9; k++) { const p = posAt(f, P.h0, k * FDT); ctx.fillStyle = 'rgba(124,138,165,.42)'; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), rb, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(90,102,121,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
      // 최고점 표시
      if (f.tH > 0 && t >= f.tH - 1e-9) {
        const a = posAt(f, P.h0, f.tH);
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(a.x), gy); ctx.stroke(); ctx.restore();
        D.sphere(X(a.x), Y(a.y), 4.5, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
        labIn(X(a.x), Math.max(56, Y(a.y) - 16), '최고점 H = ' + f.H.toFixed(1) + ' m', { bg: '#d97706', size: 13 }, 8, VW - 8);
      }
      // 공 + 속도
      const p = posAt(f, P.h0, t), bx = X(p.x), by = Y(p.y);
      const vyN = f.vy - G * t, kv = PHONE ? 1.5 : 2.2;
      if (P.st === 'done') { /* 낙하 후에는 화살표를 그리지 않아요 */ } else if (o.comps) {
        if (Math.abs(f.vx) > 0.05) D.arrow(bx, by, bx + f.vx * kv, by, { color: '#3867f4', width: 3.5, head: 9 });
        if (Math.abs(vyN) > 0.3) D.arrow(bx, by, bx, by - vyN * kv, { color: '#f59e0b', width: 3.5, head: 9 });
      } else if (Math.hypot(f.vx, vyN) > 0.3) D.arrow(bx, by, bx + f.vx * kv, by - vyN * kv, { color: '#14a058', width: 3.5, head: 9 });
      D.sphere(bx, by, rb, '#e2464b', { shadow: true, outline: '#a82a2f' });
      if (P.st === 'done') {
        const e = posAt(f, P.h0, f.tEnd);
        if (f.hitWall) { T(X(e.x), Y(e.y) - 14, '💥', 20, '#000', 'center'); }
        else labIn(X(e.x), gy - 14, 'R = ' + f.R.toFixed(1) + ' m', { bg: '#14a058', size: 13.5 }, 8, VW - 8);
      } else if (!PHONE || true) {
        const sp = Math.hypot(f.vx, vyN);
        D.label(VW - 10, 28, 't = ' + t.toFixed(2) + ' s · v = ' + sp.toFixed(1) + ' m/s' + (P.kf > 1.01 ? ' · ⏩ ×' + P.kf.toFixed(1) : ''), { bg: '#26324a', size: 13, align: 'right' });
      }
    } else if (o.hintIdle) {
      D.label(VW - 10, 28, o.hintIdle, { bg: '#5a6679', size: 13, align: 'right' });
    }
    if (P.res) labIn(VW / 2, 60, (P.res.ok ? '🎉 ' : '') + P.res.msg, { bg: P.res.ok ? '#14a058' : '#e2552a', size: 14 }, 8, VW - 8);
    parts.update(dt); parts.draw(ctx);
    return g;
  }
  function drawTitle(txt) { T(14, 28, txt, PHONE ? 14 : 17, '#26324a', 'left', 800); }

  /* ----- 패널: 기록 표 ----- */
  function recTable(rc, P) {
    card(rc.x, rc.y, rc.w, rc.h);
    T(rc.x + 10, rc.y + 21, '📋 던진 기록 (v₀: m/s)', 13.5, '#26324a', 'left', 800);
    const cols = ['θ', 'v₀', 'T (s)', 'H (m)', 'R (m)'], cw = (rc.w - 20) / 5, rh = Math.min(24, (rc.h - 54) / 6), hy = rc.y + 44;
    cols.forEach((h, i) => T(rc.x + 12 + cw * i, hy, h, 13, '#5a6679', 'left', 800));
    if (!P.rec.length) T(rc.x + 12, hy + rh, '아직 던지지 않았어요', 14, '#98a2b3', 'left', 800);
    P.rec.slice().sort((a, b) => a.th - b.th).slice(0, 6).forEach((r, i) => {
      const y = hy + (i + 1) * rh, cur = P.last && P.last.th === r.th && P.last.v0 === r.v0;
      if (cur) { ctx.fillStyle = 'rgba(20,160,88,.12)'; ctx.fillRect(rc.x + 6, y - rh + 6, rc.w - 12, rh - 1); }
      [r.th + '°', String(r.v0), r.T.toFixed(2), r.H.toFixed(1), r.R.toFixed(1)].forEach((s, j) => T(rc.x + 12 + cw * j, y, s, 14, j === 4 ? '#c2410c' : '#26324a', 'left', 800));
    });
  }
  function liveCard(rc, P) {
    card(rc.x, rc.y, rc.w, rc.h);
    T(rc.x + 10, rc.y + 21, '⏱ 지금 공의 상태', 13.5, '#26324a', 'left', 800);
    const f = P.fl, running = P.st !== 'idle' && f, t = running ? P.t : 0;
    const p = running ? posAt(f, P.h0, t) : { x: 0, y: P.h0 }, vx = running ? f.vx : 0, vy = running ? f.vy - G * t : 0;
    const L = [
      ['t = ' + t.toFixed(2) + ' s', '#26324a'],
      ['x = ' + p.x.toFixed(1) + ' m,  y = ' + p.y.toFixed(1) + ' m', '#26324a'],
      ['vx = ' + fx(vx, 1) + ' m/s (수평)', '#1d4ed8'],
      ['vy = ' + fx(vy, 1) + ' m/s (연직)', '#b45309'],
    ];
    const lh = Math.min(26, (rc.h - 40) / 4);
    L.forEach((l, i) => T(rc.x + 12, rc.y + 48 + i * lh, l[0], 14, l[1], 'left', 800));
  }
  const panelRects = () => (PHONE
    ? { tb: { x: PX + 8, y: PY + 8, w: PW - 16, h: 190 }, lv: { x: PX + 8, y: PY + 204, w: PW - 16, h: 140 } }
    : { tb: { x: PX + 8, y: PY + 8, w: 470, h: PH - 16 }, lv: { x: PX + 486, y: PY + 8, w: PW - 494, h: PH - 16 } });

  /* ================= ① 던지기 ================= */
  function drawThrow(dt) {
    const P = S.sh;
    drawTitle(PHONE ? '🏹 비스듬히 던진 공 (v₀ = ' + P.v0 + ' m/s)' : '🏹 ' + P.v0 + ' m/s로 비스듬히 던진 공의 궤적 (0.2 s 간격 잔상)');
    drawShot(P, { hintIdle: '▶ 던지기를 눌러요' }, dt);
    panel(PX, PY, PW, PH, 16);
    const rc = panelRects();
    recTable(rc.tb, P); liveCard(rc.lv, P);
  }

  /* ================= ③ 운동 식 ================= */
  function drawModel(dt) {
    const P = S.sh;
    drawTitle(PHONE ? '📐 운동 식으로 예측하기' : '📐 식으로 T, H, R을 계산해 던져 보고 확인해요 (v₀ = ' + P.v0 + ' m/s, θ = ' + P.th + '°)');
    drawShot(P, { hintIdle: '▶ 던지기를 눌러요', comps: true }, dt);
    panel(PX, PY, PW, PH, 16);
    const fl = flight(P.v0, P.th, 0, null), q = (s) => (eff('hide') ? '?' : s);
    const x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    const rc = PHONE ? { x: PX + 8, y: PY + 5 * lh + 20, w: PW - 16, h: PH - 5 * lh - 28 } : { x: PX + 500, y: PY + 8, w: PW - 508, h: PH - 16 };
    lines(x0, y0, lh, fs, [
      ['v₀x = v₀cosθ = ' + fx(fl.vx, 1) + ' m/s,  v₀y = v₀sinθ = ' + fx(fl.vy, 1) + ' m/s'],
      ['올라가는 시간 v₀y / g = ' + q(fl.tH.toFixed(2) + ' s')],
      ['비행 시간 T = 2v₀y / g = ' + q(fl.T.toFixed(2) + ' s'), '#1d4ed8'],
      ['최고점 H = v₀y² / 2g = ' + q(fl.H.toFixed(1) + ' m'), '#b45309'],
      ['사거리 R = v₀x · T = v₀² sin2θ / g = ' + q(fl.R.toFixed(1) + ' m'), '#c2410c'],
    ]);
    if (PHONE) recTable({ x: rc.x, y: rc.y, w: rc.w, h: Math.min(rc.h, 190) }, P);
    else recTable(rc, P);
  }

  /* ================= ④ 목표 맞히기 ================= */
  function drawTarget(dt) {
    const sc = S.tg.sc, P = S.tg.shots[sc], def = SCN[sc];
    drawTitle(PHONE ? '🎯 ' + def.name : { a: '🎯 지면의 표적(30 m)을 v₀ = 20 m/s로 맞혀요', b: '🏢 옥상(45 m)에서 수평으로 던져 지면의 표적(30 m)을 맞혀요', c: '🧱 높이 3 m 담장(8 m 앞)을 넘기는 공을 던져요' }[sc]);
    drawShot(P, { wall: def.wall, comps: true, target: def.tx ? { tx: def.tx, tr: def.tr } : null, preview: true, hintIdle: '점선은 이 설정의 예측 궤적이에요' }, dt);
    panel(PX, PY, PW, PH, 16);
    const fl = flight(P.v0, P.th, P.h0, def.wall);
    const x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    let L;
    if (sc === 'a') L = [
      ['사거리 R = v₀² sin2θ / g,   목표 R = 30 m', '#26324a'],
      ['sin2θ = R g / v₀² = ' + (30 * G / 400).toFixed(2) + '  → 2θ = ' + (Math.asin(30 * G / 400) / RAD).toFixed(1) + '° 또는 ' + (180 - Math.asin(30 * G / 400) / RAD).toFixed(1) + '°', '#6d3fd6'],
      ['지금 θ = ' + P.th + '°  → R = ' + fl.R.toFixed(1) + ' m', '#c2410c'],
      ['표적은 반지름 ' + def.tr.toFixed(1) + ' m 안(' + (def.tx - def.tr) + ' ~ ' + (def.tx + def.tr) + ' m)이 명중이에요', '#5a6679'],
    ];
    else if (sc === 'b') L = [
      ['연직: h = ½ g t²  → t = √(2h / g) = ' + Math.sqrt(2 * 45 / G).toFixed(1) + ' s', '#26324a'],
      ['수평: x = v₀ t  → v₀ = x / t = 30 / ' + Math.sqrt(2 * 45 / G).toFixed(1) + ' = ' + (30 / Math.sqrt(2 * 45 / G)).toFixed(1) + ' m/s', '#6d3fd6'],
      ['지금 v₀ = ' + P.v0 + ' m/s  → 낙하점 x = ' + fl.R.toFixed(1) + ' m', '#c2410c'],
      ['지면에 닿을 때 vy = g t = ' + (G * fl.T).toFixed(1) + ' m/s', '#5a6679'],
    ];
    else L = [
      ['담장 위치(x = 8 m)에서 높이  y = x tanθ − g x² / (2 v₀² cos²θ)', '#26324a'],
      ['지금 v₀ = ' + P.v0 + ' m/s, θ = ' + P.th + '°  → y = ' + (fl.yWall != null ? fx(fl.yWall, 1) : '—') + ' m', '#c2410c'],
      ['담장 높이 3 m보다 높아야 넘어요  → ' + (fl.clear ? '넘어요 ✅' : '못 넘어요 ❌'), fl.clear ? '#0b6b39' : '#c0392b'],
      ['v₀를 키우거나 θ를 알맞게 바꿔 보세요', '#5a6679'],
    ];
    lines(x0, y0, lh, fs, L);
    const rc = PHONE ? { x: PX + 8, y: PY + 4 * lh + 40, w: PW - 16, h: PH - 4 * lh - 48 } : { x: PX + 560, y: PY + 8, w: PW - 568, h: PH - 16 };
    if (rc.h > 60) {
      card(rc.x, rc.y, rc.w, rc.h);
      T(rc.x + 10, rc.y + 21, '🏁 명중 기록', 13.5, '#26324a', 'left', 800);
      [['a', '🎯 지면 표적'], ['b', '🏢 옥상 수평'], ['c', '🧱 담장']].forEach(([k, nm], i) => T(rc.x + 12, rc.y + 48 + i * (PHONE ? 24 : 30), mark(S.tg.hit[k]) + ' ' + nm, 14, '#26324a', 'left', 800));
    }
  }

  /* ================= ② 영상 분석 ================= */
  const VGEO = () => {
    const fr = PHONE ? { x: 8, y: 44, w: VW - 16, h: SH - 56 } : { x: 8, y: 44, w: 524, h: SH - 56 };
    const sV = (fr.w - 34) / 10.4, X0 = fr.x + 22, gy = fr.y + fr.h - 28;
    return { fr, sV, X0, gy, X: (x) => X0 + x * sV, Y: (y) => gy - y * sV };
  };
  function vdTime() { const v = S.vd; return v.play ? v.tp : v.fr * FDT; }
  function drawVideo(dt) {
    const v = S.vd, g = VGEO(), { fr, X, Y, gy, sV } = g;
    if (v.play) {
      v.tp = Math.min(NF * 0 + (NF - 1) * FDT, v.tp + dt * 0.5 * (RM ? 4 : 1));
      v.fr = Math.round(v.tp / FDT);
      if (v.tp >= (NF - 1) * FDT - 1e-9) { v.play = false; v.fr = NF - 1; v.tp = v.fr * FDT; updateCtl(); }
    }
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    drawTitle(PHONE ? '🎞️ 던진 공의 영상 (격자 1 m)' : '🎞️ 던진 공의 영상을 프레임마다 분석해요 (격자 1 m, 0.2 s 간격)');
    // 영상 틀
    D.shadow(() => { D.roundRect(fr.x, fr.y, fr.w, fr.h, 12); ctx.fillStyle = '#1c2a44'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); ctx.beginPath(); D.roundRect(fr.x + 3, fr.y + 3, fr.w - 6, fr.h - 6, 10); ctx.clip();
    const sky = ctx.createLinearGradient(0, fr.y, 0, gy); sky.addColorStop(0, '#2b4a7a'); sky.addColorStop(1, '#6f9ccb'); ctx.fillStyle = sky; ctx.fillRect(fr.x, fr.y, fr.w, fr.h);
    ctx.fillStyle = '#5a8f48'; ctx.fillRect(fr.x, gy, fr.w, fr.h);
    // 격자 눈금자
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    for (let m = 0; m <= 10; m++) { ctx.beginPath(); ctx.moveTo(X(m), fr.y); ctx.lineTo(X(m), gy); ctx.stroke(); if (m % 2 === 0) T(X(m), gy + 18, m + ' m', 13, '#e7f6df', 'center', 800); }
    for (let m = 0; m <= 4; m++) { ctx.beginPath(); ctx.moveTo(fr.x, Y(m)); ctx.lineTo(fr.x + fr.w, Y(m)); ctx.stroke(); T(fr.x + 8, Y(m) - 3, m + ' m', 13, '#cfe0f5', 'left', 800); }
    // 던지는 사람 (왼쪽)
    ctx.fillStyle = '#d7dce6'; ctx.beginPath(); ctx.arc(X(-0.15), Y(0.18), 0.14 * sV + 3, 0, TAU); ctx.fill();
    // 찍은 마커
    const t = vdTime(), pos = vidPos(t);
    v.mk.forEach((m, k) => { if (!m) return; const q = vidPos(k * FDT); ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2.5; const x = X(q.x), y = Y(q.y); ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke(); T(x, y - 12, String(k), 13, '#ffe58a', 'center', 800); });
    // 공 + 속도 성분
    const bx = X(pos.x), by = Y(pos.y), vy = VY0 - G * t, kv = PHONE ? 4 : 5;
    ctx.restore();
    ctx.save(); ctx.beginPath(); D.roundRect(fr.x + 3, fr.y + 3, fr.w - 6, fr.h - 6, 10); ctx.clip();
    D.arrow(bx, by, bx + VX * kv, by, { color: '#7cc4ff', width: 3.5, head: 9 });
    if (Math.abs(vy) > 0.3) D.arrow(bx, by, bx, by - vy * kv, { color: '#ffb347', width: 3.5, head: 9 });
    D.arrow(bx, by, bx + VX * kv, by - vy * kv, { color: '#ff6b6b', width: 3, head: 9, alpha: 0.9 });
    D.arrow(bx - 12, by, bx - 12, by + 30, { color: '#ffd1d1', width: 3.5, head: 9 });
    D.sphere(bx, by, 9, '#fff3c4', { shadow: true, outline: '#e0b84a' });
    ctx.restore();
    const lab = (x, y, s, bg) => D.label(x, y, s, { bg, size: 13, align: 'left' });
    lab(fr.x + 12, fr.y + 24, '→ vx = ' + VX.toFixed(1) + ' m/s (일정)', '#1d6fb8');
    lab(fr.x + 12, fr.y + 52, '↑ vy = ' + (Math.abs(vy) > 0.05 ? fx(vy, 1) : '0.0') + ' m/s' + (Math.abs(vy) <= 0.05 ? ' (최고점)' : ''), '#c2760d');
    lab(fr.x + 12, fr.y + 80, '↓ a = 10 m/s² (중력, 항상 아래)', '#b91c1c');
    D.label(fr.x + fr.w - 12, fr.y + 22, '프레임 ' + v.fr + ' / ' + (NF - 1) + ' · t = ' + (v.play ? t.toFixed(2) : (v.fr * FDT).toFixed(1)) + ' s', { bg: 'rgba(0,0,0,.55)', size: 13, align: 'right' });
    if (v.flash > 0) { v.flash = Math.max(0, v.flash - dt); }
    // 그래프 (오른쪽 / 패널)
    const gr1 = PHONE ? { x: PX + 8, y: PY + 6, w: (PW - 24) / 2, h: 158 } : { x: 540, y: 44, w: VW - 548, h: 134 };
    const gr2 = PHONE ? { x: PX + 16 + (PW - 24) / 2, y: PY + 6, w: (PW - 24) / 2, h: 158 } : { x: 540, y: 184, w: VW - 548, h: 134 };
    if (!PHONE) { ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH); }
    panel(PX, PY, PW, PH, 16);
    const nm = v.mk.filter(Boolean).length;
    const a1 = axes(gr1, { xmin: 0, xmax: 1.6, xstep: 0.4, xd: 1, ymin: 0, ymax: 10, ystep: 2, yd: 0, title: 'x – t 그래프', right: nm >= 3 ? '직선: 기울기 6 m/s' : '' });
    const a2 = axes(gr2, { xmin: 0, xmax: 1.6, xstep: 0.4, xd: 1, ymin: 0, ymax: 4, ystep: 1, yd: 0, title: 'y – t 그래프', right: nm >= 4 ? '포물선' : '' });
    ctx.save(); ctx.beginPath(); ctx.rect(a1.ix, a1.iy, a1.iw, a1.ih); ctx.clip();
    if (nm >= 3) { ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(a1.gx(0), a1.gy(0)); ctx.lineTo(a1.gx(1.6), a1.gy(VX * 1.6)); ctx.stroke(); ctx.setLineDash([]); }
    v.mk.forEach((m, k) => { if (m) D.sphere(a1.gx(k * FDT), a1.gy(vidPos(k * FDT).x), 4.5, '#3867f4', { gloss: false, outline: '#fff', outlineWidth: 1 }); });
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(a2.ix, a2.iy, a2.iw, a2.ih); ctx.clip();
    if (nm >= 4) { ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); for (let i = 0; i <= 40; i++) { const q = 1.6 * i / 40, p = vidPos(q); if (i) ctx.lineTo(a2.gx(q), a2.gy(p.y)); else ctx.moveTo(a2.gx(q), a2.gy(p.y)); } ctx.stroke(); ctx.setLineDash([]); }
    v.mk.forEach((m, k) => { if (m) D.sphere(a2.gx(k * FDT), a2.gy(vidPos(k * FDT).y), 4.5, '#e2552a', { gloss: false, outline: '#fff', outlineWidth: 1 }); });
    ctx.restore();
    // 표
    const tb = PHONE ? { x: PX + 8, y: PY + 172, w: PW - 16, h: PH - 180 } : { x: PX + 8, y: PY + 8, w: PW - 16, h: PH - 16 };
    card(tb.x, tb.y, tb.w, tb.h);
    const rows = ['t (s)', 'x (m)', 'y (m)', 'vx (m/s)', 'vy (m/s)'], c0 = tb.x + (PHONE ? 6 : 10), lw = PHONE ? 54 : 76, cw = (tb.w - lw - 14) / NF, rh = Math.min(PHONE ? 22 : 26, (tb.h - 28) / 5.6), y0 = tb.y + 24;
    T(tb.x + tb.w - 10, tb.y + 17, '프레임마다 찍으면 채워져요 · v는 앞 프레임과의 구간 평균', 13, '#5a6679', 'right', 800);
    T(tb.x + 10, tb.y + 17, '📋 영상 분석 표', 13.5, '#26324a', 'left', 800);
    rows.forEach((r, i) => T(c0, y0 + (i + 1) * rh, r, 13, '#5a6679', 'left', 800));
    for (let k = 0; k < NF; k++) {
      const cx = c0 + lw + cw * k, got = v.mk[k], p = vidPos(k * FDT);
      if (v.fr === k) { ctx.fillStyle = 'rgba(56,103,244,.1)'; ctx.fillRect(cx - 3, y0 + 4, cw, rh * 5.4); }
      T(cx, y0 + rh, (k * FDT).toFixed(1), 13.5, '#26324a', 'left', 800);
      T(cx, y0 + 2 * rh, got ? p.x.toFixed(1) : '·', 13.5, got ? '#1d4ed8' : '#b4bccb', 'left', 800);
      T(cx, y0 + 3 * rh, got ? p.y.toFixed(1) : '·', 13.5, got ? '#c2410c' : '#b4bccb', 'left', 800);
      const both = k > 0 && v.mk[k] && v.mk[k - 1], q0 = vidPos((k - 1) * FDT);
      T(cx, y0 + 4 * rh, both ? ((p.x - q0.x) / FDT).toFixed(1) : '·', 13.5, both ? '#1d4ed8' : '#b4bccb', 'left', 800);
      T(cx, y0 + 5 * rh, both ? fx((p.y - q0.y) / FDT, 1) : '·', 13.5, both ? '#c2410c' : '#b4bccb', 'left', 800);
    }
    parts.update(dt); parts.draw(ctx);
  }
  function vdMark(k, px, py) {
    const v = S.vd; if (v.mk[k]) { showHint('이 프레임은 이미 찍었어요. 다른 프레임으로 넘겨요.', 2200); return; }
    v.mk[k] = true; Sound.click(); updateCtl();
    const g = VGEO(), q = vidPos(k * FDT);
    parts.burst(g.X(q.x), g.Y(q.y), { count: 8, speed: 80, size: 2.6, colors: ['#ffd447', '#fff'], gravity: 40, life: 0.5 });
    if (v.mk.every(Boolean)) Sound.success();
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'video' || S.vd.play) return false;
      const g = VGEO(), k = S.vd.fr, q = vidPos(k * FDT);
      if (Math.hypot(p.x - g.X(q.x), p.y - g.Y(q.y)) < 30) vdMark(k);
      return false;
    },
    hover(p) { if (S.mode !== 'video' || S.vd.play) return ''; const g = VGEO(), q = vidPos(S.vd.fr * FDT); return Math.hypot(p.x - g.X(q.x), p.y - g.Y(q.y)) < 30 ? 'pointer' : ''; },
  });

  /* ---------- 컨트롤 연결 ---------- */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        if (n.hasAttribute('data-vctl') && S.mode === 'throw' && eff('lockV')) on = false;
        if (n.hasAttribute('data-vctl') && S.mode === 'model' && (eff('order') || eff('mcalc'))) on = false;
        if (n.hasAttribute('data-actl') && S.mode === 'model' && (eff('order') || eff('mcalc'))) on = false;
        if (n.hasAttribute('data-thrbtn') && S.mode === 'model' && eff('order')) on = false;
        if (n.hasAttribute('data-order') && !eff('order')) on = false;
        if (n.hasAttribute('data-mcalc') && !eff('mcalc')) on = false;
        if (n.hasAttribute('data-vcalc') && !eff('vcalc')) on = false;
        if (n.hasAttribute('data-tv') && S.tg.sc === 'a') on = false;
        if (n.hasAttribute('data-ta') && S.tg.sc === 'b') on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const P = S.sh;
    $('#oV0').textContent = P.v0 + ' m/s'; $('#oTh').textContent = P.th + '°';
    [['sV0', P.v0, 5, 25], ['sTh', P.th, 0, 90]].forEach(([id, v, mn, mx]) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); });
    $('#bThrow').disabled = P.st === 'fly';
    const vd = S.vd; $('#oFr').textContent = vd.fr + ' / ' + (NF - 1);
    { const sl = $('#sFr'); if (+sl.value !== vd.fr) sl.value = vd.fr; sl.style.setProperty('--pct', (vd.fr / (NF - 1) * 100) + '%'); }
    $('#bPlay').textContent = vd.play ? '⏸ 멈춤' : '▶ 재생';
    $('#bMark').disabled = vd.play || vd.mk[vd.fr];
    const tg = S.tg, Q = tg.shots[tg.sc];
    $$('#scSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === tg.sc));
    $('#oTV').textContent = Q.v0 + ' m/s'; $('#oTA').textContent = Q.th + '°';
    [['sTV', Q.v0, 5, 25], ['sTA', Q.th, 0, 90]].forEach(([id, v, mn, mx]) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); });
    $('#bTThrow').disabled = Q.st === 'fly';
    $('#tNote').textContent = tg.sc === 'a' ? 'v₀ = 20 m/s 고정 · 표적까지 30 m' : tg.sc === 'b' ? '높이 45 m 옥상에서 수평(θ = 0°)으로 던져요' : '담장: 높이 3 m, 8 m 앞 · 담장에 부딪히면 실패';
    renderOrder();
  }
  /* ----- 순서 정렬 UI ----- */
  let ordSig = '';
  function renderOrder() {
    const sig = S.ord.join() + '|' + Object.keys(S.ordBad).join();
    if (sig === ordSig) return; ordSig = sig;
    const box = $('#orderList'); box.innerHTML = '';
    S.ord.forEach((id, pos) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;border:2px solid ' + (S.ordBad[id] ? 'var(--bad)' : 'var(--line)') + ';border-radius:12px;background:' + (S.ordBad[id] ? 'var(--bad-soft)' : '#fff');
      const num = document.createElement('b'); num.textContent = String(pos + 1); num.style.cssText = 'flex:none;width:22px;text-align:center;color:var(--muted)';
      const tx = document.createElement('div'); tx.textContent = ORDER[id]; tx.style.cssText = 'flex:1;font-size:13.5px;font-weight:700;line-height:1.3';
      const mk = (lab, d) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.className = 'nudge'; b.style.cssText = 'flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-weight:900;cursor:pointer'; b.setAttribute('aria-label', ORDER[id] + (d < 0 ? ' 위로' : ' 아래로')); b.disabled = (d < 0 && pos === 0) || (d > 0 && pos === S.ord.length - 1); b.addEventListener('click', () => moveOrd(pos, d)); return b; };
      row.append(num, tx, mk('▲', -1), mk('▼', 1)); box.appendChild(row);
    });
  }
  function moveOrd(pos, d) { const a = S.ord, j = pos + d; if (j < 0 || j >= a.length) return; const t = a[pos]; a[pos] = a[j]; a[j] = t; S.ordBad = {}; Sound.click(); updateCtl(); }
  function ordViolations() {
    const pos = {}; S.ord.forEach((id, i) => { pos[id] = i; });
    return ORDER_RULES.filter(([a, b]) => pos[a] > pos[b]);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function bumpShot(P) { if (P.st === 'fly') return false; P.st = 'idle'; P.t = 0; P.res = null; parts.clear(); return true; }
  $('#sV0').addEventListener('input', (e) => { const P = S.sh; if (P.st === 'fly') { e.target.value = P.v0; return; } P.v0 = +e.target.value; bumpShot(P); updateCtl(); });
  $('#sTh').addEventListener('input', (e) => { const P = S.sh; if (P.st === 'fly') { e.target.value = P.th; return; } P.th = +e.target.value; bumpShot(P); updateCtl(); });
  $('#bThrow').addEventListener('click', () => { const P = S.sh; if (P.st === 'done') shotReset(P); shotLaunch(P, null); });
  $('#bClear').addEventListener('click', () => { Sound.click(); const P = S.sh; if (P.st === 'fly') return; P.rec = []; P.last = null; shotReset(P); parts.clear(); updateCtl(); });
  $('#sFr').addEventListener('input', (e) => { const v = S.vd; v.play = false; v.fr = +e.target.value; v.tp = v.fr * FDT; updateCtl(); });
  $('#bPlay').addEventListener('click', () => { const v = S.vd; Sound.click(); if (v.play) { v.play = false; v.tp = v.fr * FDT; } else { if (v.fr >= NF - 1) { v.fr = 0; } v.tp = v.fr * FDT; v.play = true; } updateCtl(); });
  $('#bMark').addEventListener('click', () => { const v = S.vd; if (!v.play) vdMark(v.fr); });
  $$('#scSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const tg = S.tg; if (tg.shots[tg.sc].st === 'fly') return; tg.sc = b.dataset.sc; parts.clear(); updateCtl(); }));
  $('#sTV').addEventListener('input', (e) => { const Q = S.tg.shots[S.tg.sc]; if (Q.st === 'fly') { e.target.value = Q.v0; return; } Q.v0 = +e.target.value; bumpShot(Q); updateCtl(); });
  $('#sTA').addEventListener('input', (e) => { const Q = S.tg.shots[S.tg.sc]; if (Q.st === 'fly') { e.target.value = Q.th; return; } Q.th = +e.target.value; bumpShot(Q); updateCtl(); });
  $('#bTThrow').addEventListener('click', () => { const Q = S.tg.shots[S.tg.sc]; if (Q.st === 'done') shotReset(Q); shotLaunch(Q, tgWall()); });
  ['iVx', 'iVy', 'iT', 'iH', 'iR'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'video') {
      const v = S.vd, p = vidPos(v.fr * FDT), got = v.mk[v.fr];
      L1 = '프레임 시각 t'; a = (v.fr * FDT).toFixed(1) + ' s'; L2 = '공의 x 좌표'; b = got ? p.x.toFixed(1) + ' m' : '— (찍어 보세요)'; L3 = '공의 y 좌표'; c = got ? p.y.toFixed(1) + ' m' : '—';
    } else if (S.mode === 'target') {
      const Q = S.tg.shots[S.tg.sc], def = SCN[S.tg.sc];
      L1 = '던진 결과'; a = Q.st === 'done' && Q.fl ? (S.tg.sc === 'c' ? (Q.res && Q.res.ok ? '담장을 넘었어요' : '넘지 못했어요') : '낙하점 ' + Q.fl.R.toFixed(1) + ' m') : '—';
      L2 = def.tx ? '표적까지' : '담장'; b = def.tx ? def.tx + ' m (±' + def.tr.toFixed(1) + ')' : '높이 3 m · 8 m 앞';
      L3 = '판정'; c = Q.st === 'done' && Q.res ? (Q.res.ok ? '성공 ✅' : '실패 ❌') : '—';
    } else {
      const P = S.sh, r = P.last;
      L1 = '비행 시간 T'; a = r ? r.T.toFixed(2) + ' s' : '—'; L2 = '최고점 H'; b = r ? r.H.toFixed(1) + ' m' : '—'; L3 = '사거리 R'; c = r ? r.R.toFixed(1) + ' m' : '—';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  const F20 = (th) => flight(20, th, 0, null);
  const distinctAngles = () => Array.from(new Set(S.sh.rec.map((r) => r.th)));
  const hasRec = (th, v0) => S.sh.rec.some((r) => r.th === th && (v0 == null || r.v0 === v0));
  const f30 = flight(20, 30, 0, null), f45 = flight(20, 45, 0, null), f60 = flight(20, 60, 0, null);
  const th1 = Math.asin(30 * G / 400) / RAD / 2, th2 = 90 - th1;
  const levels = [
    {
      title: '궤적 관찰: 각도와 사거리', short: '궤적 관찰', icon: '🏹', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 힘으로 던져도 각도에 따라 얼마나 멀리 날아갈까? 공이 도착할 곳을 던지기 전에 계산으로 맞힐 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 수평으로 던진 공은 수평으로는 등속, 연직으로는 자유 낙하 운동을 한다고 배웠어요. 수평으로 던지는 것은 θ = 0°인 특별한 경우예요. 이번에는 <b>비스듬히 위로 던진</b> 공을 관찰해요.</div>' +
        '<p>처음 속력 v₀ = ' + V0_FIX + ' m/s로 각도 θ를 바꿔 던지고, 0.2 s마다 남는 잔상으로 <b>포물선 궤적</b>, 최고점, 낙하점(사거리)을 살펴봐요. 공기 저항은 무시해요.</p>',
      features: ['throw'],
      setup() { S.sh.v0 = V0_FIX; S.sh.th = 45; shotReset(S.sh); S.sh.rec = []; S.sh.last = null; setFlag('lockV', true); setScene('throw'); },
      recap: '같은 속력으로 던져도 각도에 따라 사거리·최고점·비행 시간이 달라져요. 사거리는 45° 부근에서 가장 커요.',
      summary: '<ul><li>비스듬히 던진 공의 궤적은 <b>포물선</b>이에요. 수평으로 던지는 것(θ = 0°)은 그 특별한 경우예요.</li><li>v₀ = 20 m/s: θ = 30° → T = ' + f30.T.toFixed(2) + ' s, H = ' + f30.H.toFixed(1) + ' m, R = ' + f30.R.toFixed(1) + ' m / θ = 45° → T = ' + f45.T.toFixed(2) + ' s, H = ' + f45.H.toFixed(1) + ' m, R = ' + f45.R.toFixed(1) + ' m(최대) / θ = 60° → T = ' + f60.T.toFixed(2) + ' s, H = ' + f60.H.toFixed(1) + ' m, R = ' + f60.R.toFixed(1) + ' m.</li><li>사거리는 <b>45°에서 최대</b>이고, 45°를 기준으로 <b>합이 90°인 두 각도</b>(30°와 60° 등)는 사거리가 같아요. 각도가 클수록 더 높이, 더 오래 날아요.</li></ul>',
      missions: [
        {
          title: '서로 다른 각도로 세 번 던지기',
          goal: '처음 속력 ' + V0_FIX + ' m/s로 <b>서로 다른 각도 세 개</b>를 골라 던지고 사거리 R을 기록하세요.',
          hint: '각도 슬라이더로 θ를 고르고 ▶ 던지기를 눌러요. 예를 들어 30°, 45°, 60°로 던져 비교해 봐요.',
          setup() { shotReset(S.sh); setFlag('lockV', true); setScene('throw'); },
          check: () => distinctAngles().length >= 3,
          hold: 0.6,
          status: () => '던진 각도 ' + Math.min(3, distinctAngles().length) + ' / 3 ' + (distinctAngles().length ? '(' + distinctAngles().sort((a, b) => a - b).map((a) => a + '°').join(', ') + ')' : ''),
          explain: '각도에 따라 궤적이 달라져요. 30°는 낮고 멀리(R = ' + f30.R.toFixed(1) + ' m), 60°는 높고 오래(H = ' + f60.H.toFixed(1) + ' m, T = ' + f60.T.toFixed(2) + ' s) 날아요. 30°와 60°의 사거리는 ' + f30.R.toFixed(1) + ' m로 같아요(두 각의 합이 90°).',
        },
        {
          title: '가장 멀리 날아가는 각도 찾기',
          goal: '기록을 지우고 <b>사거리가 가장 큰 각도</b>를 찾아 그 각도로 던지세요. 세 번 이상 비교해요.',
          hint: '30°와 60°는 사거리가 같았어요. 그 사이에 더 큰 값이 있겠죠? 기록 표에서 R이 가장 큰 각도를 찾아요.',
          setup() { S.sh.rec = []; S.sh.last = null; shotReset(S.sh); setFlag('lockV', true); setScene('throw'); },
          check: () => S.sh.rec.length >= 3 && hasRec(45),
          hold: 0.6,
          status: () => '던진 횟수 ' + Math.min(3, S.sh.rec.length) + ' / 3 &nbsp; ' + mark(hasRec(45)) + ' 최대 사거리 각도',
          explain: 'v₀ = ' + V0_FIX + ' m/s에서 사거리는 <b>θ = 45°일 때 R = ' + f45.R.toFixed(1) + ' m로 최대</b>예요. 각도가 작으면 일찍 떨어지고, 크면 높이만 올라가서 멀리 가지 못해요. 그래서 45°에서 가장 멀리 가요.',
        },
      ],
    },
    {
      title: '성분 분해: 영상 속 공 분석', short: '성분 분해', icon: '🎞️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 던진 공의 궤적이 포물선이고 각도마다 다르다는 것을 봤어요. 왜 포물선이 될까요? <b>수평 방향과 연직 방향으로 나누어</b> 분석해요. (앞 차시의 힘·속도 성분 분해와 물리학의 등가속도 식을 써요.)</div>' +
        '<p>공을 v₀ = 10 m/s, 53°로 던진 영상을 0.2 s 간격 프레임으로 살펴봐요. 프레임마다 공의 위치를 찍으면 <b>x–t, y–t 표와 그래프</b>가 만들어져요. 알짜힘은 <b>중력 mg(아래) 하나뿐</b>이라는 점을 떠올리며 분석해요.</p>',
      features: ['video'],
      setup() { S.vd.mk = new Array(NF).fill(false); S.vd.fr = 0; S.vd.tp = 0; S.vd.play = false; setFlag('vcalc', false); setScene('video'); },
      recap: '수평 방향은 힘이 없어 등속(vx = 6 m/s), 연직 방향은 중력만 작용해 등가속도(ay = −10 m/s²)예요. 두 운동이 합쳐져 포물선이 돼요.',
      summary: '<ul><li>영상 분석(0.2 s 간격): x = 0, 1.2, 2.4, … 9.6 m로 <b>간격이 일정</b> → x–t는 직선, <b>vx = 6 m/s 일정</b>. y = 0, 1.4, 2.4, 3.0, 3.2, 3.0, 2.4, 1.4, 0 m → y–t는 포물선.</li><li>연직 속도는 1 s에 10 m/s씩 감소: vy = 8 − 10t. v₀ = 10 m/s, 53°이면 <b>vx = v₀cosθ = 6 m/s</b>, <b>v₀y = v₀sinθ = 8 m/s</b>.</li><li><b>뉴턴 운동 법칙</b>: 알짜힘이 중력 mg(아래) 하나뿐 → 수평 ax = 0(등속), 연직 ay = −g = −10 m/s²(등가속도).</li><li>최고점에서 <b>vy = 0</b>이지만 vx = 6 m/s가 남아 속도는 0이 아니고, 가속도는 여전히 g(아래)예요.</li></ul>',
      missions: [
        {
          title: '프레임마다 공 위치 찍기',
          goal: '프레임 0부터 8까지 <b>아홉 프레임</b>의 공 위치를 모두 찍어 표를 채우세요.',
          hint: '프레임 슬라이더로 프레임을 고르고 공을 누르거나 📍 버튼을 눌러요. 그래프에 점이 쌓여요.',
          setup() { S.vd.mk = new Array(NF).fill(false); S.vd.fr = 0; S.vd.tp = 0; S.vd.play = false; setFlag('vcalc', false); setScene('video'); },
          check: () => S.vd.mk.every(Boolean),
          hold: 0.6,
          status: () => '찍은 프레임 ' + S.vd.mk.filter(Boolean).length + ' / ' + NF,
          explain: 'x는 0.2 s마다 <b>1.2 m씩 일정하게</b> 늘어나요(직선). y는 처음에 많이 오르다가 점점 덜 오르고 내려올 때는 대칭으로 내려와요(포물선). 간격이 1.4, 1.0, 0.6, 0.2 m → 매 0.2 s마다 0.4 m씩 줄어요.',
        },
        {
          title: 'vx와 처음 연직 속도 v₀y 계산하기', manual: true,
          goal: '표에서 <b>수평 속도 vx</b>와 <b>처음 연직 속도 v₀y</b>를 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'vx = 구간의 Δx ÷ 0.2 s = 1.2 ÷ 0.2. 첫 구간의 평균 연직 속도 7.0 m/s는 t = 0.1 s의 속도예요. 연직 속도는 1 s에 10 m/s씩 줄어요.',
          setup() { S.vd.mk = new Array(NF).fill(true); $('#iVx').value = ''; $('#iVy').value = ''; $('#iVx').classList.remove('ok', 'bad'); $('#iVy').classList.remove('ok', 'bad'); setFlag('vcalc', true); setScene('video'); },
          check() {
            const a = num('iVx'), b = num('iVy');
            if (a == null || b == null) return '두 칸에 숫자를 입력해 주세요.';
            const okA = Math.abs(a - VX) <= 0.2, okB = Math.abs(b - VY0) <= 0.3;
            fb([[$('#iVx'), okA], [$('#iVy'), okB]]);
            if (!okA) return 'vx는 한 구간에서 x가 얼마나 늘었는지(1.2 m)를 시간(0.2 s)으로 나눠요.';
            if (!okB) return '첫 구간(0~0.2 s)의 평균 속도 7.0 m/s는 t = 0.1 s의 속도예요. 처음(t = 0) 속도는 그보다 1 s에 10 m/s씩 줄어든 만큼 더 커요.';
            return true;
          },
          status: () => 'vx ' + ($('#iVx').value.trim() || '—') + ' · v₀y ' + ($('#iVy').value.trim() || '—'),
          explain: 'vx = 1.2 m ÷ 0.2 s = <b>6 m/s</b>(일정). 연직 속도: 구간 평균 7, 5, 3, 1, −1, … → 0.2 s마다 2 m/s씩 감소(<b>ay = −10 m/s²</b>). t = 0.1 s에서 7 m/s이므로 v₀y = 7 + 10 × 0.1 = <b>8 m/s</b>이에요. v₀ = √(6² + 8²) = 10 m/s, tanθ = 8/6 → 약 53°예요.',
        },
        {
          type: 'quiz', title: '최고점에서의 속도와 가속도',
          goal: '영상 속 공이 <b>최고점(t = 0.8 s)</b>에 있을 때 공의 속도와 가속도는?',
          setup() { S.vd.fr = 4; S.vd.tp = 0.8; S.vd.play = false; setFlag('vcalc', false); setScene('video'); },
          choices: ['속도도 0, 가속도도 0이에요 (멈춰요)', '속도는 0이고 가속도만 10 m/s² (아래)예요', '속도는 수평 방향 6 m/s, 가속도는 10 m/s² (아래)예요', '속도는 8 m/s, 가속도는 0이에요'],
          answer: 2,
          feedback: ['최고점에서도 중력은 그대로 작용해서 가속도는 0이 아니에요. 또 수평 속도 6 m/s가 남아 있어요.', '연직 속도만 0이에요. 수평으로는 6 m/s로 계속 움직이므로 속도 전체는 0이 아니에요.', '', '8 m/s는 처음 연직 속도예요. 최고점에서 연직 속도는 0이고, 가속도는 항상 g예요.'],
          explain: '최고점에서는 <b>vy = 0</b>이지만 <b>vx = 6 m/s</b>가 남아 속력은 6 m/s예요. 가속도는 힘(중력 mg)이 항상 작용하므로 <b>언제나 g = 10 m/s²(아래)</b>예요. 가속도가 0이면 연직 속도가 더 이상 변하지 않겠죠.',
        },
      ],
    },
    {
      title: '운동 식: 성분별 식 조립', short: '운동 식', icon: '📐', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수평은 등속(ax = 0), 연직은 등가속도(ay = −g)라는 것을 영상에서 확인했어요. 이제 두 성분의 식을 이어 붙여 <b>비행 시간 T, 최고점 H, 사거리 R</b>의 식을 만들어요.</div>' +
        '<p>위치: <b>x = v₀cosθ · t</b>, <b>y = v₀sinθ · t − ½gt²</b>. 최고점에서 vy = 0이므로 올라가는 시간 t = v₀sinθ / g이고, 내려오는 시간도 같아 T = 2v₀sinθ / g예요. 식으로 예측한 값을 던져서 확인해 봐요.</p>',
      features: ['model'],
      setup() { S.sh.v0 = 20; S.sh.th = 30; shotReset(S.sh); S.sh.rec = []; S.sh.last = null; setFlag('lockV', false); setFlag('order', false); setFlag('mcalc', false); setFlag('hide', false); setScene('model'); },
      recap: '두 성분의 식에서 T = 2v₀sinθ / g, H = (v₀sinθ)² / 2g, R = v₀² sin2θ / g를 얻어요. R은 sin2θ = 1인 45°에서 최대예요.',
      summary: '<ul><li>가속도 ax = 0, ay = −g → <b>vx = v₀cosθ</b>(일정), <b>vy = v₀sinθ − gt</b>.</li><li>위치 <b>x = v₀cosθ · t</b>, <b>y = v₀sinθ · t − ½gt²</b>.</li><li>최고점(vy = 0): 올라가는 시간 v₀sinθ / g → <b>T = 2v₀sinθ / g</b>, <b>H = (v₀sinθ)² / 2g</b>, <b>R = v₀cosθ · T = v₀² sin2θ / g</b>.</li><li>v₀ = 20 m/s, θ = 30°: T = 2.0 s, H = 5.0 m, R = 34.6 m. v₀를 2배로 하면 R과 H는 <b>4배</b>(T는 2배)예요.</li><li>sin2θ = 1이 되는 θ = 45°에서 R이 최대(v₀² / g)이고, θ와 90° − θ는 사거리가 같아요.</li></ul>',
      missions: [
        {
          title: '식 유도 순서 정렬하기', manual: true,
          goal: '여섯 장의 카드를 <b>▲▼ 버튼</b>으로 포물선 운동의 식을 유도하는 순서대로 정렬하고 ✔ 확인하기를 누르세요.',
          hint: '힘(가속도)에서 시작해서 속도 → 위치 → 최고점의 시간 → 비행 시간 → H와 R 순서로 이어져요.',
          setup() { S.ord = [3, 0, 5, 2, 4, 1]; S.ordBad = {}; ordSig = ''; setFlag('order', true); setFlag('mcalc', false); setFlag('hide', false); setScene('model'); updateCtl(); },
          check() {
            const v = ordViolations();
            if (!v.length) { S.ordBad = {}; return true; }
            const bad = {}; v.forEach(([a, b]) => { bad[a] = true; bad[b] = true; });
            const sig = Object.keys(bad).join(); if (sig !== Object.keys(S.ordBad).join()) { S.ordBad = bad; updateCtl(); }
            return '순서가 맞지 않는 카드가 빨간 테두리로 표시돼요. 힘 → 속도 → 위치 → 최고점 시간 → 비행 시간 → H·R 순서를 떠올려요.';
          },
          status: () => '맞지 않는 쌍 ' + ordViolations().length + '개',
          explain: '<b>① 알짜힘 mg → ax = 0, ay = −g ② 속도 ③ 위치 ④ 최고점 시간(vy = 0) ⑤ 비행 시간 T = 2v₀sinθ / g ⑥ H와 R</b> 순서예요. 힘에서 가속도를, 가속도에서 속도와 위치를 얻는 뉴턴 운동 법칙의 흐름이에요.',
        },
        {
          title: 'v₀ = 20 m/s, 30°를 식으로 예측하고 확인하기', manual: true,
          goal: 'v₀ = 20 m/s, θ = 30°일 때의 <b>T, H, R</b>을 식으로 계산해 입력하고, <b>▶ 던지기</b>로 확인한 뒤 ✔ 확인하기를 누르세요.',
          hint: 'v₀y = 20 sin30° = 10 m/s, v₀x = 20 cos30° ≈ 17.3 m/s. T = 2v₀y ÷ g, H = v₀y² ÷ 2g, R = v₀x × T 이에요.',
          setup() { S.sh.v0 = 20; S.sh.th = 30; shotReset(S.sh); S.sh.rec = []; S.sh.last = null; ['iT', 'iH', 'iR'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); setFlag('order', false); setFlag('mcalc', true); setFlag('hide', true); setScene('model'); },
          check() {
            const t = num('iT'), h = num('iH'), r = num('iR');
            if (t == null || h == null || r == null) return 'T, H, R를 모두 숫자로 입력해 주세요.';
            const okT = Math.abs(t - f30.T) <= 0.1, okH = Math.abs(h - f30.H) <= 0.2, okR = Math.abs(r - f30.R) <= 0.3;
            fb([[$('#iT'), okT], [$('#iH'), okH], [$('#iR'), okR]]);
            if (!okT) return 'T = 2v₀sinθ ÷ g예요. v₀sinθ = 20 × 0.5 = 10 m/s이니 T는 얼마일까요?';
            if (!okH) return 'H = (v₀sinθ)² ÷ 2g = 10² ÷ (2 × 10)이에요.';
            if (!okR) return 'R = v₀cosθ × T예요. v₀cosθ = 20 × cos30° ≈ 17.3 m/s이고 T는 앞에서 구했어요.';
            if (!hasRec(30, 20)) return '계산이 맞아요! ▶ 던지기를 눌러 실제로 확인한 뒤 다시 ✔ 확인하기를 눌러요.';
            return true;
          },
          status: () => '입력 ' + mark(num('iT') != null && num('iH') != null && num('iR') != null) + ' &nbsp; 던져서 확인 ' + mark(hasRec(30, 20)),
          explain: 'v₀y = 10 m/s → T = 2 × 10 ÷ 10 = <b>2.0 s</b>, H = 10² ÷ 20 = <b>5.0 m</b>, R = 17.3 × 2.0 = <b>34.6 m</b>(= v₀² sin60° ÷ g)예요. 던져서 확인한 값(T = ' + f30.T.toFixed(2) + ' s, H = ' + f30.H.toFixed(1) + ' m, R = ' + f30.R.toFixed(1) + ' m)과 같아요.',
        },
        {
          type: 'quiz', title: '사거리가 최대인 각도',
          goal: '같은 속력으로 던질 때 사거리가 <b>45°에서 최대</b>가 되는 까닭은? (R = v₀² sin2θ / g)',
          setup() { S.sh.v0 = 20; S.sh.th = 45; shotReset(S.sh); setFlag('order', false); setFlag('mcalc', false); setFlag('hide', false); setScene('model'); },
          choices: ['sin2θ가 최대(= 1)가 되는 각도가 2θ = 90°, 곧 θ = 45°이기 때문이에요', '수직(90°)으로 높이 던질수록 오래 날아서 더 멀리 가기 때문이에요', '각도가 작을수록 수평 속도가 커서 0°에서 가장 멀리 가기 때문이에요', '45°에서는 중력이 작용하지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '90°로 던지면 올라갔다가 제자리로 떨어져요(vx = 0 → R = 0). 높이 H는 커도 사거리는 0이에요.', '0°에서는 비행 시간이 0이라 사거리가 0이에요(지면에서 던질 때). vx와 비행 시간을 함께 따져야 해요.', '중력은 언제나 작용해요. 45°가 최대인 것은 식 sin2θ 때문이에요.'],
          explain: 'R = v₀cosθ · T = v₀² · 2sinθcosθ ÷ g = <b>v₀² sin2θ ÷ g</b>. sin2θ의 최댓값 1은 2θ = 90°, 곧 θ = <b>45°</b>일 때이고 R_max = v₀² ÷ g(= 40 m)예요. 각도가 작으면 비행 시간이, 크면 수평 속도가 부족해서 사거리가 줄어요.',
        },
      ],
    },
    {
      title: '목표 맞히기: 식으로 계산하고 발사', short: '목표 맞히기', icon: '🎯', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 성분별 식으로 T, H, R을 예측했어요. 이제 이 식을 거꾸로 써서 <b>원하는 곳에 공을 보내는 조건</b>을 계산해 봐요.</div>' +
        '<p>세 장면: 🎯 지면 표적(30 m)을 v₀ = 20 m/s로 맞히기 · 🏢 옥상(45 m)에서 수평으로 던져 지면 표적(30 m) 맞히기 · 🧱 높이 3 m, 8 m 앞 담장 넘기기. 점선은 식으로 예측한 궤적이에요. 먼저 계산하고 발사해요.</p>',
      features: ['target'],
      setup() { S.tg.hit = { a: false, b: false, c: false }; S.tg.sc = 'a'; Object.values(S.tg.shots).forEach(shotReset); S.tg.shots.a.th = 45; S.tg.shots.b.v0 = 15; S.tg.shots.c.v0 = 15; S.tg.shots.c.th = 45; setScene('target'); },
      recap: '목표 지점이 정해지면 R = v₀² sin2θ ÷ g, t = √(2h ÷ g), x = v₀t 같은 식을 거꾸로 풀어 v₀와 θ를 정할 수 있어요.',
      summary: '<ul><li><b>지면 표적</b> 30 m, v₀ = 20 m/s: sin2θ = Rg ÷ v₀² = 30 × 10 ÷ 400 = 0.75 → 2θ = 48.6° 또는 131.4° → <b>θ ≈ 24°(낮은 각) 또는 66°(높은 각)</b> 두 가지 답이 있어요.</li><li><b>옥상 수평 발사</b>(h = 45 m): t = √(2h ÷ g) = 3.0 s, x = v₀t = 30 m이면 <b>v₀ = 10 m/s</b>. 착지할 때 vy = gt = 30 m/s.</li><li><b>담장 넘기기</b>: 담장 위치에서 y = x tanθ − g x² ÷ (2v₀²cos²θ) &gt; 담장 높이. 같은 v₀이면 각도·속력을 알맞게 골라야 해요.</li><li>같은 v₀에서 20°와 70°처럼 합이 90°인 두 각도는 사거리가 같고, 높은 각도로 던진 공이 더 오래 날아요. 공의 질량은 궤적에 영향을 주지 않아요.</li></ul>',
      missions: [
        {
          title: '계산해서 두 표적 명중시키기',
          goal: '🎯 <b>지면 표적(30 m)</b>은 v₀ = 20 m/s로, 🏢 <b>옥상(45 m)의 수평 발사</b>는 지면 표적(30 m)을 맞히세요. 먼저 계산한 뒤 던져요.',
          hint: '🎯 sin2θ = 30 × 10 ÷ 400 = 0.75 → 2θ ≈ 49°. 🏢 t = √(2 × 45 ÷ 10) = 3 s이고 x = v₀t = 30 m.',
          setup() { S.tg.sc = 'a'; setScene('target'); },
          check: () => S.tg.hit.a && S.tg.hit.b,
          hold: 0.6,
          status: () => mark(S.tg.hit.a) + ' 🎯 지면 표적 &nbsp; ' + mark(S.tg.hit.b) + ' 🏢 옥상 수평',
          explain: '🎯 sin2θ = 0.75 → 2θ = ' + (Math.asin(0.75) / RAD).toFixed(1) + '° → θ ≈ <b>' + th1.toFixed(0) + '°</b>(또는 높은 각 ' + th2.toFixed(0) + '°; 두 각의 합이 90°). 🏢 낙하 시간 t = √(2h ÷ g) = <b>3.0 s</b>이므로 v₀ = 30 m ÷ 3.0 s = <b>10 m/s</b>예요(수평 속도 10 m/s, 착지 때 vy = 30 m/s).',
        },
        {
          title: '담장 넘기기',
          goal: '🧱 <b>높이 3 m, 8 m 앞 담장</b>을 넘어가도록 v₀와 θ를 정해 던지세요. 담장에 닿기 전에 떨어지거나 부딪히면 실패예요.',
          hint: '점선 궤적이 담장 위로 지나가는지 먼저 확인해요. 속력을 키우거나 각도를 높이면 담장 위 높이 y가 커져요. 예: v₀ = 15 m/s, θ = 45°.',
          setup() { S.tg.sc = 'c'; S.tg.hit.c = false; shotReset(S.tg.shots.c); setScene('target'); },
          check: () => S.tg.hit.c,
          hold: 0.6,
          status: () => mark(S.tg.hit.c) + ' 담장 넘기기',
          explain: '담장 위치(x = 8 m)에서의 높이 y = 8 tanθ − 5 × 8² ÷ (v₀² cos²θ)가 <b>3 m보다 높으면</b> 넘어요. 예를 들어 v₀ = 15 m/s, θ = 45°이면 y = 8 − 320 ÷ 112.5 = 5.2 m로 넘고, v₀ = 10 m/s, θ = 30°이면 y = 4.6 − 320 ÷ 75 = 0.3 m로 담장에 부딪혀요.',
        },
        {
          type: 'quiz', title: '20°와 70°로 던진 공',
          goal: '같은 속력 20 m/s로 <b>20°</b>와 <b>70°</b>로 던진 두 공(질량이 같아요)의 사거리와 비행 시간은?',
          setup() { setScene('target'); },
          choices: ['사거리도 비행 시간도 같아요', '사거리는 같고, 70°로 던진 공이 더 오래 날아요', '70°로 던진 공이 사거리도 더 멀고 더 오래 날아요', '20°로 던진 공이 사거리가 더 멀어요'],
          answer: 1,
          feedback: ['20° + 70° = 90°이라 사거리는 같지만, 비행 시간 T = 2v₀sinθ ÷ g는 sinθ에 비례해 달라요.', '', '사거리 R ∝ sin2θ인데 sin40° = sin140°라서 같아요. 더 높이 올라가는 만큼 오래 날 뿐이에요.', 'R ∝ sin2θ에서 sin40°와 sin140°는 같은 값이에요(합이 90°인 각도).'],
          explain: 'R = v₀² sin2θ ÷ g에서 sin40° = sin140°이므로 두 공의 사거리는 <b>같아요(' + flight(20, 20, 0, null).R.toFixed(1) + ' m)</b>. 비행 시간은 T = 2v₀sinθ ÷ g이라 20°는 ' + flight(20, 20, 0, null).T.toFixed(2) + ' s, 70°는 ' + flight(20, 70, 0, null).T.toFixed(2) + ' s로 높이 던진 공이 더 오래 날아요. 질량은 식에 나오지 않아서 궤적에 영향을 주지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-projectile', mount: '#game', badge: '포물선 박사', homeHref: '../../index.html#hm',
    featureLabels: { throw: '🏹 각도 바꿔 던지기 · 잔상 궤적', video: '🎞️ 영상 분석 · x–t, y–t 그래프', model: '📐 운동 식 · T, H, R 계산', target: '🎯 표적 · 옥상 · 담장 장면' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('throw');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    shotStep(S.sh, dt, null, onThrowDone);
    ['a', 'b', 'c'].forEach((k) => shotStep(S.tg.shots[k], dt, SCN[k].wall, onTargetDone));
    switch (S.mode) {
      case 'throw': drawThrow(dt); break;
      case 'video': drawVideo(dt); break;
      case 'model': drawModel(dt); break;
      default: drawTarget(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, shotLaunch, shotReset, flight, vdMark, VGEO, ORDER, ordViolations, moveOrd, TG: S.tg, tgWall,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { shotStep(S.sh, 0.02, null, onThrowDone); ['a', 'b', 'c'].forEach((k) => shotStep(S.tg.shots[k], 0.02, SCN[k].wall, onTargetDone)); } },
  };
})();
