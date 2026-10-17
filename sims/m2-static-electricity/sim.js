/* =========================================================
   중2 Ⅶ. 전기와 자기 - 마찰 전기와 정전기 유도  [9과14-01]
   ① 모형: 마찰 전기(전자의 이동) → ② 탐구: 전기력(밀기·당기기)
   → ③ 설명: 정전기 유도 → ④ 적용: 검전기
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const W = 800, H = 540;
  const NEG = '#2f6df6', POS = '#e2464b', INK = '#1b2333', MUTED = '#5b667a';
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eaf0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const C = SciSim.color;
  const parts = new SciSim.Particles();
  const RM = SciSim.reduceMotion;
  const approach = SciSim.approach;
  const box = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hash = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const qTxt = (q) => (q > 0 ? '(+)' : q < 0 ? '(−)' : '중성');
  const qCol = (q) => (q > 0 ? POS : q < 0 ? NEG : MUTED);

  /* ---------- 열린 도구 / 게임 ---------- */
  let F = new Set();
  let game = null;
  const has = (f) => F.has(f);
  const isNew = (f) => !!game && game.isNew(f);

  /* ---------- 장면 상태 ---------- */
  const FUR = { x: 40, y: 292, w: 236, h: 40 };
  const TABLE_Y = 332, ROD_L = 210, ROD_R = 13;
  const ROD_HOME = { x: 400, y: TABLE_Y - ROD_R };
  const CONTACT_Y = FUR.y - ROD_R + 8;
  const PER = 95;                                  // 전자 1개가 이동하는 데 필요한 문지른 거리(px)
  const NEED = 4;                                  // 막대가 (−)로 대전됐다고 보는 전자 수

  const S = {
    scene: 'rub', fade: 1, free: false,
    touched: {}, drag: null, t: 0,
    rod: { x: ROD_HOME.x, y: ROD_HOME.y, tx: ROD_HOME.x, ty: ROD_HOME.y, lift: 0, grab: false, sv: 0, lean: 0, tilt: new SciSim.Spring(0, { stiffness: 120, damping: 12 }) },
    rub: { dist: 0, launched: 0, arrived: 0, lastLaunch: 0, flyers: [], furE: [2, 2, 2, 2, 2, 2], rodE: [2, 2, 2, 2, 2, 2], disp: 0, spark: 0 },
    force: { hq: -1, hq2: -1, th: new SciSim.Spring(0, { stiffness: 38, damping: 3.6 }), strength: 0, touch: false, sawA: false, sawR: false,
      held: { x: 590, y: 235, tx: 590, ty: 235, lift: 0, grab: false, sv: 0 }, same: true, dxs: 0 },
    ind: { q: -1, obj: 'metal', k: 0, s: 0, ux: 0, negDone: false, posDone: false, hold: { '-1': 0, '1': 0 },
      rod: { x: 130, y: 215, tx: 130, ty: 215, lift: 0, grab: false },
      el: [], bits: [], tip: { x: 0, y: 0 }, gap: 999 },
    scope: { k: 0, kRaw: 0, phi: new SciSim.Spring(0.06, { stiffness: 90, damping: 9 }), rods: [], marks: 0, leaf: 0 },
  };

  /* ================= 도우미 그리기 ================= */
  function badge(x, y, r, q, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y);
    if (o.upright) { const m = ctx.getTransform(); ctx.rotate(-Math.atan2(m.b, m.a)); }
    if (o.scale != null) ctx.scale(o.scale, o.scale);
    D.sphere(0, 0, r, q > 0 ? POS : NEG, { gloss: r > 7 });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, r * 0.26); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0);
    if (q > 0) { ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5); }
    ctx.stroke();
    ctx.restore();
  }
  const electron = (x, y, r, a) => badge(x, y, r, -1, { alpha: a });

  const ROD_COL = { plastic: '#8a6fd1', glass: '#8fd3ec', metal: '#b3bccb', mystery: '#a995e0' };
  /* 막대: 가운데 (x,y), 각도 ang, 길이 len, 굵기 th */
  function drawRod(x, y, ang, len, th, kind, o) {
    o = o || {};
    const lift = o.lift || 0;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    if (lift) ctx.scale(1 + 0.04 * lift, 1 + 0.04 * lift);
    ctx.shadowColor = 'rgba(20,40,80,' + (0.16 + 0.12 * lift) + ')';
    ctx.shadowBlur = 7 + 14 * lift; ctx.shadowOffsetY = 3 + 10 * lift;
    const base = ROD_COL[kind] || ROD_COL.plastic;
    const g = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
    g.addColorStop(0, C.shade(base, 0.6)); g.addColorStop(0.3, base); g.addColorStop(1, C.shade(base, -0.4));
    D.roundRect(-len / 2, -th / 2, len, th, th / 2);
    ctx.globalAlpha = kind === 'glass' ? 0.92 : 1;
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = C.shade(base, -0.45); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1;
    // 빛 반사
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    D.roundRect(-len / 2 + th * 0.5, -th * 0.34, len - th, th * 0.18, th * 0.09); ctx.fill();
    if (o.cap) { ctx.fillStyle = o.cap; D.roundRect(-len / 2 + 2, -th / 2 + 1, th * 0.9, th - 2, th * 0.4); ctx.fill(); }
    if (o.grip) { // 절연 손잡이(막대 끝 쪽)
      const gx = o.grip > 0 ? len / 2 - 38 : -len / 2 + 2;
      ctx.fillStyle = '#4b5563'; D.roundRect(gx, -th / 2 - 1, 36, th + 2, th / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(gx + 6, -th / 2 + 3, 24, 2.5);
    }
    ctx.restore();
  }
  /* 막대 위의 전하 표시 (막대 좌표계). n은 소수 가능(하나씩 팝업) */
  function drawSigns(len, th, q, n, o) {
    o = o || {};
    const m = o.count || 6, r = th * 0.3;
    for (let i = 0; i < m; i++) {
      const a = clamp(n - i, 0, 1);
      if (a <= 0) continue;
      const x = -len / 2 + (o.from != null ? o.from : 24) + i * ((len - (o.from != null ? o.from : 24) - (o.to != null ? o.to : 24)) / Math.max(1, m - 1));
      badge(x, 0, r, q, { alpha: a, scale: 0.4 + 0.6 * SciSim.ease.outBack(a), upright: true });
    }
  }
  function floor(y, kind) {
    const g = ctx.createLinearGradient(0, y, 0, H);
    if (kind === 'wood') { g.addColorStop(0, '#d9b98a'); g.addColorStop(1, '#bf9a66'); } else { g.addColorStop(0, '#dfe5ef'); g.addColorStop(1, '#c9d2e0'); }
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, y, W, 3);
    if (kind === 'wood') {
      ctx.strokeStyle = 'rgba(120,80,40,.15)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, y + i * ((H - y) / 4)); ctx.lineTo(W, y + i * ((H - y) / 4)); ctx.stroke(); }
    }
  }
  function backdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eaf0fb'); g.addColorStop(1, '#f9fbff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function pill(x, y, text, bg, color, size) {
    return D.label(x, y, text, { bg: bg || 'rgba(255,255,255,.92)', color: color || INK, size: size || 13, border: 'rgba(120,135,160,.35)' });
  }
  function newRingRect(x, y, w, h) {
    const a = 0.4 + 0.45 * (0.5 + 0.5 * Math.sin(performance.now() / 160));
    ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,' + a + ')'; ctx.lineWidth = 4;
    D.roundRect(x - 5, y - 5, w + 10, h + 10, 16); ctx.stroke();
    D.label(x + w - 20, y - 4, 'NEW', { bg: '#f26b3a', color: '#fff', size: 12 });
    ctx.restore();
  }

  /* ================= 장면 전환 ================= */
  const sceneNames = { rub: '🧣 마찰 전기', force: '⚡ 전기력', induce: '🧪 정전기 유도', scope: '🔍 검전기' };
  const tbLabel = $('#tbLabel'), sceneSeg = $('#sceneSeg');
  function setScene(name, instant) {
    if (S.inited && S.scene === name) return;
    S.inited = true;
    S.scene = name;
    tbLabel.textContent = sceneNames[name];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = c.dataset.scenes.split(' ').indexOf(name) < 0; });
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    S.drag = null;
    parts.clear();
    S.fade = 0;
    SciSim.tween(S, { fade: 1 }, { duration: instant ? 0.0001 : 0.45, ease: 'outCubic' });
    readoutLabels();
    if (name === 'rub') resetRub(true);
    if (name === 'force') resetForce();
    if (name === 'induce') resetInduce();
    if (name === 'scope') resetScope();
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  const hintEl = $('#stageHint');
  function showHint(msg, ms) {
    hintEl.textContent = msg; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* ================= ① 마찰 전기 ================= */
  const PN = { x: 520, y: 14, w: 266, h: 492 };
  const COLX = [PN.x + 53, PN.x + 133, PN.x + 213];
  const ROD_Y = [128, 204], FUR_Y = [356, 432], AR = 26;
  const atomPos = {
    rod: (i) => ({ x: COLX[i % 3], y: ROD_Y[Math.floor(i / 3)] }),
    fur: (i) => ({ x: COLX[i % 3], y: FUR_Y[Math.floor(i / 3)] }),
  };
  const pairOf = (k) => ({ fur: k, rod: k < 3 ? k + 3 : k - 3 });

  function resetRub(instant) {
    const r = S.rub, R = S.rod;
    r.dist = 0; r.launched = 0; r.arrived = 0; r.flyers.length = 0;
    r.furE = [2, 2, 2, 2, 2, 2]; r.rodE = [2, 2, 2, 2, 2, 2];
    if (instant) r.disp = 0;
    R.grab = false; R.tx = ROD_HOME.x; R.ty = ROD_HOME.y;
    if (instant) { R.x = R.tx; R.y = R.ty; }
  }
  function presetRub(n) {
    const r = S.rub;
    resetRub(true);
    for (let k = 0; k < n; k++) { const p = pairOf(k); r.furE[p.fur]--; r.rodE[p.rod]++; }
    r.dist = n * PER; r.launched = n; r.arrived = n; r.disp = n;
  }
  function launchFlyer(k) {
    const p = pairOf(k), a = atomPos.fur(p.fur), b = atomPos.rod(p.rod);
    S.rub.flyers.push({ k, fur: p.fur, rod: p.rod, p: 0, dur: 0.95, fx: a.x, fy: a.y - AR, tx: b.x, ty: b.y + AR, bend: (k % 2 ? 1 : -1) * 22, trail: 0 });
    S.rub.launched++;
    S.rub.lastLaunch = S.t;
  }
  function updateRub(dt) {
    const R = S.rod, r = S.rub;
    const px = R.x;
    R.x = approach(R.x, R.tx, dt, 26); R.y = approach(R.y, R.ty, dt, 20);
    const v = (R.x - px) / Math.max(dt, 0.001);
    R.sv = approach(R.sv, v, dt, 10);
    R.lift = approach(R.lift, R.grab ? 1 : 0, dt, 14);
    R.lean = approach(R.lean, clamp(R.sv * 0.025, -9, 9), dt, 12);
    R.tilt.target = clamp(-R.sv * 0.0004, -0.12, 0.12); R.tilt.update(dt);
    const over = R.x + ROD_L / 2 > FUR.x + 36 && R.x - ROD_L / 2 < FUR.x + FUR.w - 36;
    R.contact = over && R.y > CONTACT_Y - 8;
    if (R.grab && R.contact) {
      r.dist += Math.abs(R.x - px);
      if (!RM && Math.abs(R.sv) > 30) {
        r.spark += dt * Math.min(46, Math.abs(R.sv) / 7);
        while (r.spark >= 1) {
          r.spark -= 1;
          parts.emit({ x: R.x + rnd(-0.3, 0.3) * ROD_L, y: FUR.y + 2, vx: Math.sign(R.sv) * rnd(20, 70) + rnd(-25, 25), vy: -rnd(50, 130), life: rnd(0.3, 0.55), size: rnd(1.8, 3.2), color: Math.random() < 0.5 ? '#ffd24a' : '#fff3b0', gravity: 300, shape: Math.random() < 0.4 ? 'star' : 'circle' });
        }
      }
    }
    const due = Math.min(6, Math.floor(r.dist / PER));
    if (due > r.launched && S.t - r.lastLaunch > 0.3) launchFlyer(r.launched);
    for (let i = r.flyers.length - 1; i >= 0; i--) {
      const f = r.flyers[i];
      f.p += dt / f.dur;
      f.trail += dt;
      if (f.trail > 0.035 && !RM) { f.trail = 0; const q = flyPos(f); parts.emit({ x: q.x, y: q.y, vx: 0, vy: 0, life: 0.4, size: 3.4, color: '#7aa6ff', shape: 'circle' }); }
      if (f.p >= 1) {
        r.flyers.splice(i, 1);
        r.furE[f.fur]--; r.rodE[f.rod]++; r.arrived++;
        Sound.tick();
        parts.burst(f.tx, f.ty, { count: 9, colors: [NEG, '#9ec1ff', '#fff'], speed: 80, life: 0.5, size: 2.6, gravity: 0, shape: 'circle' });
      }
    }
    r.disp = approach(r.disp, r.arrived, dt, 7);
  }
  const flyPos = (f) => {
    const t = SciSim.ease.inOutSine(clamp(f.p, 0, 1));
    const cx = (f.fx + f.tx) / 2 + f.bend, cy = (f.fy + f.ty) / 2;
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    return { x: a * f.fx + b * cx + c * f.tx, y: a * f.fy + b * cy + c * f.ty };
  };

  function drawAtom(x, y, e, ph, dir, t) {
    const net = 2 - e;
    if (net !== 0) D.glow(x, y, AR + 18, net > 0 ? POS : NEG, 0.34);
    ctx.save();
    ctx.strokeStyle = 'rgba(100,116,139,.38)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(x, y, AR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    D.sphere(x, y, 9, POS, { text: '+', textScale: 1.25 });
    for (let i = 0; i < e; i++) {
      const a = ph + (i / e) * Math.PI * 2 + (RM ? 0 : t * 1.15 * dir);
      electron(x + Math.cos(a) * AR, y + Math.sin(a) * AR, 5.6);
    }
    if (net !== 0) badge(x + AR * 0.85, y - AR * 0.85, 8.5, net > 0 ? 1 : -1);
  }
  function drawInset(t) {
    const r = S.rub;
    ctx.save();
    D.shadow(() => { D.roundRect(PN.x, PN.y, PN.w, PN.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; D.roundRect(PN.x, PN.y, PN.w, PN.h, 16); ctx.stroke();
    D.text(PN.x + PN.w / 2, PN.y + 25, '🔍 원자 모형으로 보기', { size: 15, weight: 800, color: '#7c3aed' });
    // 두 물질 상자
    const bl = [{ y: 52, h: 196, c: '#e8ecff', name: '플라스틱 막대', sign: -1, n: r.arrived, ph: 'rod' }, { y: 290, h: 196, c: '#f7ead8', name: '털가죽', sign: 1, n: r.arrived, ph: 'fur' }];
    bl.forEach((b) => {
      ctx.fillStyle = b.c; D.roundRect(PN.x + 10, b.y, PN.w - 20, b.h, 12); ctx.fill();
      D.text(PN.x + 20, b.y + 22, b.name, { size: 14, weight: 800, color: INK, align: 'left' });
      const txt = b.n > 0 ? (b.sign > 0 ? '(+)' : '(−)') + ' ' + b.n : '중성';
      D.label(PN.x + PN.w - 20, b.y + 18, txt, { bg: b.n > 0 ? qCol(b.sign) : '#8a95a6', color: '#fff', size: 13, align: 'right' });
    });
    for (let i = 0; i < 6; i++) {
      const a = atomPos.rod(i), b = atomPos.fur(i);
      drawAtom(a.x, a.y, r.rodE[i], i * 1.3, i % 2 ? -1 : 1, t);
      drawAtom(b.x, b.y, r.furE[i], i * 0.9 + 1, i % 2 ? 1 : -1, t);
    }
    // 가운데 안내
    const msg = r.flyers.length ? '전자(−)가 털가죽 → 막대로 이동!' : r.arrived ? '원자핵(+)은 그대로, 전자(−)만 이동했어요' : '문지르면 전자(−)가 이동해요';
    D.label(PN.x + PN.w / 2, 269, msg, { bg: r.flyers.length ? NEG : '#eef2f8', color: r.flyers.length ? '#fff' : MUTED, size: 13 });
    // 움직이는 전자
    r.flyers.forEach((f) => {
      const q = flyPos(f);
      D.glow(q.x, q.y, 20, '#6ea0ff', 0.75);
      electron(q.x, q.y, 7);
    });
    // 범례
    D.sphere(PN.x + 26, PN.y + PN.h - 11, 5, POS, { gloss: false });
    D.text(PN.x + 36, PN.y + PN.h - 6, '원자핵(+)', { size: 13, weight: 700, color: MUTED, align: 'left' });
    electron(PN.x + 138, PN.y + PN.h - 11, 5);
    D.text(PN.x + 148, PN.y + PN.h - 6, '전자(−)', { size: 13, weight: 700, color: MUTED, align: 'left' });
    ctx.restore();
  }
  function drawRub(t) {
    const r = S.rub, R = S.rod;
    floor(TABLE_Y, 'wood');
    // 확대 연결선
    const lensX = FUR.x + FUR.w * 0.55, lensY = FUR.y + 6;
    if (has('atom')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 18;
      ctx.beginPath(); ctx.moveTo(lensX + 34, lensY - 8); ctx.bezierCurveTo(lensX + 160, lensY - 60, PN.x - 90, 290, PN.x, 270); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(lensX, lensY, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(lensX - 24, lensY + 24); ctx.lineTo(lensX - 40, lensY + 42); ctx.stroke();
      ctx.restore();
    }
    // 털가죽
    D.shadow(() => { D.roundRect(FUR.x, FUR.y + 8, FUR.w, FUR.h - 8, 12); ctx.fillStyle = '#b4793f'; ctx.fill(); }, { blur: 10, y: 4 });
    const g = ctx.createLinearGradient(0, FUR.y, 0, FUR.y + FUR.h);
    g.addColorStop(0, '#dcaa70'); g.addColorStop(1, '#a8703a');
    D.roundRect(FUR.x, FUR.y + 8, FUR.w, FUR.h - 8, 12); ctx.fillStyle = g; ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 3;
    for (let x = FUR.x + 8; x < FUR.x + FUR.w - 6; x += 6) {
      const hh = 9 + 6 * hash(x);
      const near = Math.exp(-Math.pow((x - R.x) / 90, 2)) * (R.grab && R.contact ? 1 : 0.15);
      const bend = R.lean * near * 1.4 + Math.sin(t * 2 + x * 0.3) * 0.7;
      ctx.strokeStyle = hash(x + 3) > 0.5 ? '#cf9758' : '#e6bd86';
      ctx.beginPath(); ctx.moveTo(x, FUR.y + 14); ctx.quadraticCurveTo(x + bend * 0.5, FUR.y + 14 - hh * 0.6, x + bend, FUR.y + 11 - hh); ctx.stroke();
    }
    pill(FUR.x + FUR.w / 2, TABLE_Y + 30, '털가죽', 'rgba(255,255,255,.9)');
    // 털가죽의 (+) 표시
    for (let i = 0; i < 6; i++) {
      const a = clamp(r.disp - i, 0, 1);
      if (a <= 0) continue;
      const x = FUR.x + 30 + i * ((FUR.w - 60) / 5), y = FUR.y + 26;
      badge(x, y, 9, 1, { alpha: a, scale: 0.4 + 0.6 * SciSim.ease.outBack(a) });
    }
    // 막대
    const atHome = !R.grab && Math.abs(R.x - ROD_HOME.x) < 12 && Math.abs(R.y - ROD_HOME.y) < 6;
    if (atHome) pill(ROD_HOME.x, TABLE_Y + 30, '플라스틱 막대', 'rgba(255,255,255,.9)');
    if (!S.touched.rub && !RM) D.ring(R.x, R.y, 34, t, { color: '#f26b3a' });
    const sq = R.grab && R.contact ? 1 : 0;
    drawRodWithSigns(R.x, R.y + sq * 1.5, R.tilt.value, ROD_L, ROD_R * 2, 'plastic', R.lift, -1, r.disp, { grip: 0 });
    // 입자 + 돋보기
    if (has('atom')) { drawInset(t); if (isNew('atom')) newRingRect(PN.x, PN.y, PN.w, PN.h); }
  }
  function drawRodWithSigns(x, y, ang, len, th, kind, lift, q, n, o) {
    drawRod(x, y, ang, len, th, kind, Object.assign({ lift }, o || {}));
    if (n > 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      drawSigns(len, th, q, n, { count: 6 });
      ctx.restore();
    }
  }

  /* ================= ② 전기력 ================= */
  const PIV = { x: 330, y: 44 }, TH_L = 195;
  const ROD_HALF = 75, ROD_GAP = 26;                 // 막대 길이의 절반 · 두 막대(굵기 26)가 닿는 중심선 간격
  // 매달린 막대가 비스듬히 기울어도 손에 든 막대(수직)와 겹치지 않는 sin(th)의 한계
  function sinLimit(hx, side) {
    if (side > 0) { const n = hx - PIV.x - ROD_GAP; return n >= 0 ? n / (TH_L + ROD_HALF) : n / (TH_L - ROD_HALF); }
    const n = hx + ROD_GAP - PIV.x; return n >= 0 ? n / (TH_L - ROD_HALF) : n / (TH_L + ROD_HALF);
  }
  function resetForce() {
    const f = S.force;
    f.th.value = 0; f.th.velocity = 0; f.th.target = 0;
    f.touch = false;
    const h = f.held; h.grab = false; h.tx = 590; h.ty = 235; h.x = 590; h.y = 235;
  }
  function setForceQ(which, q) {
    S.force[which] = q;
    $$(which === 'hq' ? '#segHang button' : '#segHeld button').forEach((b) => b.classList.toggle('on', +b.dataset.q === q));
  }
  function updateForce(dt) {
    const f = S.force, h = f.held;
    const px = h.x;
    h.x = approach(h.x, h.tx, dt, 24); h.y = approach(h.y, h.ty, dt, 20);
    h.sv = approach(h.sv, (h.x - px) / Math.max(dt, 0.001), dt, 10);
    h.lift = approach(h.lift, h.grab ? 1 : 0, dt, 14);
    const th = f.th.value;
    const hx = PIV.x + Math.sin(th) * TH_L, hy = PIV.y + Math.cos(th) * TH_L;
    f.hx = hx; f.hy = hy;
    const dx = h.x - hx, dy = h.y - hy;
    const d = Math.hypot(dx, Math.max(0, Math.abs(dy) - 50));
    const st = clamp(Math.pow(58 / Math.max(d, 30), 2), 0, 1);
    f.strength = approach(f.strength, st, dt, 14);
    f.same = f.hq === f.hq2;
    f.dxs = Math.tanh(dx / 22);
    const dir = (f.same ? -1 : 1) * f.dxs;
    let target = dir * f.strength * 0.5;
    if (Math.abs(dy) < 140) {
      if (dx > 0) target = Math.min(target, Math.asin(clamp(sinLimit(h.x, 1), -1, 1)));
      else target = Math.max(target, Math.asin(clamp(sinLimit(h.x, -1), -1, 1)));
    }
    f.th.target = target;
    f.th.update(dt);
    if (Math.abs(dy) < 140) {   // 스프링이 출렁여도 손에 든 막대를 뚫고 들어가지 않게 해요 (튕겨 나옴)
      if (dx > 0) { const m = Math.asin(clamp(sinLimit(h.x, 1), -1, 1)); if (f.th.value > m) { f.th.value = m; if (f.th.velocity > 0) f.th.velocity *= -0.25; } }
      else { const m = Math.asin(clamp(sinLimit(h.x, -1), -1, 1)); if (f.th.value < m) { f.th.value = m; if (f.th.velocity < 0) f.th.velocity *= -0.25; } }
    }
    const sn = Math.abs(Math.sin(th)) * ROD_HALF, gapX = (dx > 0 ? h.x - (hx + sn) : (hx - sn) - h.x) - ROD_GAP;
    const touching = !f.same && gapX < 4 && Math.abs(dy) < 110;
    if (touching && !f.touch) {
      Sound.tick();
      parts.burst((h.x + hx) / 2, (h.y + hy) / 2, { count: 10, colors: ['#ffd24a', '#fff', '#ffb400'], speed: 110, life: 0.5, size: 3, gravity: 0, shape: 'star' });
    }
    f.touch = touching;
    if (S.scene === 'force' && st >= 0.45) {
      if (!f.same) f.sawA = true; else if (Math.abs(f.th.value) > 0.1) f.sawR = true;
    }
  }
  // 막대 아래 (−)/(+) 선택 칩: 화면에서 바로 눌러 전기 종류를 고름
  const CHIP_W = 74, CHIP_H = 38;
  const chipPos = () => {
    const h = S.force.held;
    // 매달린 막대의 선택 칩은 왼쪽 위에 고정해요 (손에 든 막대를 가까이 가져가도 두 칩이 겹치지 않게)
    return { hang: { x: 196, y: 108 }, held: { x: h.x, y: Math.min(h.y + 172, 468) } };
  };
  function drawChips(cx, cy, label, q) {
    pill(cx, cy - 30, label, 'rgba(255,255,255,.95)');
    [-1, 1].forEach((v, i) => {
      const x = cx - CHIP_W + i * CHIP_W, on = q === v, col = v < 0 ? '#2f6df6' : '#e2464b';
      D.shadow(() => { D.roundRect(x + 2, cy - CHIP_H / 2, CHIP_W - 4, CHIP_H, 12); ctx.fillStyle = on ? col : '#ffffff'; ctx.fill(); }, { blur: on ? 10 : 4, y: 2 });
      D.roundRect(x + 2, cy - CHIP_H / 2, CHIP_W - 4, CHIP_H, 12); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = on ? '#fff' : col; ctx.font = '800 17px Pretendard, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(v < 0 ? '(−) 전기' : '(+) 전기', x + CHIP_W / 2, cy + 1);
    });
  }
  function chipAt(p) {
    const c = chipPos();
    for (const [which, pos] of [['hq', c.hang], ['hq2', c.held]]) {
      if (Math.abs(p.y - pos.y) <= CHIP_H / 2 + 4 && p.x >= pos.x - CHIP_W && p.x <= pos.x + CHIP_W) return { which, q: p.x < pos.x ? -1 : 1 };
    }
    return null;
  }
  function drawForce(t) {
    const f = S.force, h = f.held;
    floor(494, 'wood');
    // 스탠드
    const mg = ctx.createLinearGradient(80, 0, 98, 0);
    mg.addColorStop(0, '#d7dde8'); mg.addColorStop(0.5, '#f4f6fa'); mg.addColorStop(1, '#aab3c2');
    D.shadow(() => { D.roundRect(34, 482, 130, 14, 6); ctx.fillStyle = '#4b5563'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = mg; ctx.fillRect(81, 36, 12, 448);
    D.roundRect(81, 36, 12, 448, 3); ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = mg; D.roundRect(81, 38, PIV.x - 78, 11, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b7686'; ctx.beginPath(); ctx.arc(PIV.x, PIV.y + 2, 6, 0, Math.PI * 2); ctx.fill();
    pill(150, 470, '스탠드', 'rgba(255,255,255,.0)', MUTED);
    // 매달린 막대
    const th = f.th.value;
    ctx.save();
    ctx.translate(PIV.x, PIV.y + 2); ctx.rotate(-th);
    ctx.strokeStyle = '#6b7686'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 122); ctx.stroke();
    ctx.fillStyle = '#6b7686'; ctx.beginPath(); ctx.arc(0, 122, 3.5, 0, Math.PI * 2); ctx.fill();
    drawRod(0, TH_L - 2, Math.PI / 2, 150, 26, f.hq > 0 ? 'glass' : 'plastic', {});
    ctx.translate(0, TH_L - 2);
    ctx.rotate(Math.PI / 2);
    drawSigns(150, 26, f.hq, 6, { count: 5, from: 22, to: 22 });
    ctx.restore();

    // 전기력 화살표 (크기 ∝ 세기)
    const s = f.strength;
    if (s > 0.06) {
      const dirF = (f.same ? -1 : 1) * Math.sign(h.x - f.hx || 1);
      const L = 16 + 76 * s;
      const hy = f.hy, hx = f.hx;
      D.arrow(hx - dirF * 0, hy, hx + dirF * L, hy, { color: '#f26b3a', width: 4 + 3 * s, alpha: clamp(s * 2.5, 0, 1) });
      D.arrow(h.x, h.y, h.x - dirF * L, h.y, { color: '#f26b3a', width: 4 + 3 * s, alpha: clamp(s * 2.5, 0, 1) });
      if (s > 0.25) D.label(hx + dirF * (L + 6) + (dirF > 0 ? 28 : -28), hy - 22, '전기력', { bg: '#f26b3a', color: '#fff', size: 13 });
    }
    // 손에 든 막대
    if (!S.touched.force && !RM) D.ring(h.x, h.y, 46, t, { color: '#f26b3a' });
    drawRod(h.x, h.y, Math.PI / 2, 150, 26, h.q > 0 ? 'glass' : 'plastic', { lift: h.lift });
    // 손잡이 + 전하 표시
    ctx.save();
    ctx.translate(h.x, h.y);
    const sc = 1 + 0.04 * h.lift;
    ctx.scale(sc, sc);
    ctx.fillStyle = '#4b5563'; D.roundRect(-10, 70, 20, 56, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-5, 76, 3, 44);
    ctx.rotate(Math.PI / 2);
    drawSigns(150, 26, f.hq2, 6, { count: 5, from: 22, to: 22 });
    ctx.restore();
    const cp = chipPos();
    drawChips(cp.hang.x, cp.hang.y, '매달린 막대', f.hq);
    drawChips(cp.held.x, cp.held.y, '손에 든 막대', f.hq2);
    // 안내 문구
    const strong = f.strength > 0.3;
    const txt = f.same ? '같은 종류의 전기 → 서로 밀어내요' : '다른 종류의 전기 → 서로 끌어당겨요';
    ctx.save(); ctx.globalAlpha *= strong ? 1 : 0.6;
    D.label(570, 92, txt, { bg: f.same ? '#e2464b' : '#2f6df6', color: '#fff', size: 14 });
    ctx.restore();
  }
  // h.q는 손에 든 막대의 전기 (S.force.hq2)
  Object.defineProperty(S.force.held, 'q', { get() { return S.force.hq2; } });

  /* ================= ③ 정전기 유도 ================= */
  const BAR = { x: 270, y: 190, w: 360, h: 76 };
  const BC = { x: BAR.x + BAR.w / 2, y: BAR.y + BAR.h / 2 };
  const BENCH = 424, ROD_LEN = 200;
  function resetInduce() {
    const I = S.ind, R = I.rod;
    I.k = 0; I.s = 0; I.hold = { '-1': 0, '1': 0 };
    R.grab = false; R.tx = 130; R.ty = 215; R.x = 130; R.y = 215;
    I.el = [];
    for (let j = 0; j < 16; j++) {
      const c = j % 8, row = Math.floor(j / 8);
      I.el.push({ bx: BAR.x + 30 + c * 42 + 21, by: BAR.y + 21 + row * 34, ph: Math.random() * 6.28, sp: rnd(0.8, 1.6), jr: rnd(0.4, 1) });
    }
    I.bits = [];
    for (let j = 0; j < 3; j++) I.bits.push({ x: 370 + j * 90, y: BENCH - 18, vx: 0, vy: 0, rot: (j - 1) * 0.08, w: 0, stuck: false });
  }
  function setIndQ(q) {
    S.ind.q = q;
    $$('#segInd button').forEach((b) => b.classList.toggle('on', +b.dataset.q === q));
  }
  function setIndObj(o) {
    S.ind.obj = o;
    $$('#segObj button').forEach((b) => b.classList.toggle('on', b.dataset.obj === o));
    S.ind.k = 0;
    S.ind.bits.forEach((b, j) => { b.x = 370 + j * 90; b.y = BENCH - 18; b.vx = b.vy = 0; b.stuck = false; });
  }
  function rectDist(px, py, rx, ry, rw, rh) {
    const dx = Math.max(rx - px, 0, px - (rx + rw)), dy = Math.max(ry - py, 0, py - (ry + rh));
    return Math.hypot(dx, dy);
  }
  function indTarget() { return S.ind.obj === 'paper' ? { x: 450, y: BENCH - 20 } : BC; }
  function indPose(R) {
    const T = indTarget();
    const ang = Math.atan2(T.y - R.y, T.x - R.x);
    return { ang, ux: Math.cos(ang), uy: Math.sin(ang), tipx: R.x + Math.cos(ang) * ROD_LEN / 2, tipy: R.y + Math.sin(ang) * ROD_LEN / 2 };
  }
  function clampRodOutside(x, y) {
    // 막대 끝이 금속 막대/종이 안으로 파고들지 않게 뒤로 물림
    const I = S.ind, T = indTarget();
    let px = x, py = y;
    for (let i = 0; i < 80; i++) {
      const ang = Math.atan2(T.y - py, T.x - px);
      const tx = px + Math.cos(ang) * ROD_LEN / 2, ty = py + Math.sin(ang) * ROD_LEN / 2;
      const inside = I.obj === 'paper' ? (ty > BENCH - 52 && tx > 330 && tx < 580) : rectDist(tx, ty, BAR.x - 6, BAR.y - 6, BAR.w + 12, BAR.h + 12) === 0;
      if (!inside) break;
      px -= Math.cos(ang) * 4; py -= Math.sin(ang) * 4;
    }
    return { x: px, y: py };
  }
  function updateInduce(dt) {
    const I = S.ind, R = I.rod;
    R.x = approach(R.x, R.tx, dt, 24); R.y = approach(R.y, R.ty, dt, 20);
    R.lift = approach(R.lift, R.grab ? 1 : 0, dt, 14);
    const P = indPose(R);
    I.tip.x = P.tipx; I.tip.y = P.tipy;
    let gap;
    if (I.obj === 'paper') gap = Math.max(0, Math.hypot(P.tipx - 450, P.tipy - (BENCH - 20)) - 100);
    else gap = rectDist(P.tipx, P.tipy, BAR.x, BAR.y, BAR.w, BAR.h);
    I.gap = gap;
    const s = Math.pow(clamp(1 - (gap - 8) / 150, 0, 1), 1.3);
    I.s = s;
    I.ux = clamp((P.tipx - BC.x) / (BAR.w * 0.28), -1, 1);
    const kRaw = I.obj === 'metal' ? I.q * I.ux * s : 0;
    I.k = approach(I.k, kRaw, dt, 7);
    if (S.scene === 'induce' && I.obj === 'metal' && Math.abs(I.k) > 0.7) {
      I.hold[I.q] += dt;
      if (I.hold[I.q] > 0.45) { if (I.q < 0) I.negDone = true; else I.posDone = true; }
    }
    // 종잇조각 물리
    const tip = { x: P.tipx, y: P.tipy };
    I.bits.forEach((b) => {
      if (I.obj !== 'paper') return;
      const dx = tip.x - b.x, dy = tip.y - b.y, d = Math.hypot(dx, dy) || 1;
      const w = Math.pow(clamp(1 - d / 190, 0, 1), 2) * (S.scene === 'induce' ? 1 : 0);
      b.w = approach(b.w, w, dt, 12);
      let ax = (dx / d) * 3600 * w, ay = (dy / d) * 3600 * w + 1500;
      b.vx = (b.vx + ax * dt) * Math.exp(-3.2 * dt); b.vy = (b.vy + ay * dt) * Math.exp(-2.4 * dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (d < 20) { b.x += (tip.x - b.x) * Math.min(1, dt * 14); b.y += (tip.y - b.y) * Math.min(1, dt * 14); b.vx *= 0.6; b.vy *= 0.6; b.stuck = true; } else b.stuck = false;
      const gy = BENCH - 18;
      if (b.y > gy) { b.y = gy; b.vy *= -0.25; b.vx *= 0.8; }
      b.x = clamp(b.x, 30, 770);
      b.rot = approach(b.rot, clamp(b.vx * 0.0012, -0.5, 0.5) + (b.y < gy - 4 ? Math.atan2(dy, dx) * 0.0 : 0), dt, 8);
    });
  }
  function metalBar(x, y, w, h, alpha) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#f1f4f9'); g.addColorStop(0.2, '#d4dae4'); g.addColorStop(0.7, '#aeb7c6'); g.addColorStop(1, '#8e99ab');
    D.shadow(() => { D.roundRect(x, y, w, h, 14); ctx.fillStyle = g; ctx.fill(); }, { blur: 14, y: 6 });
    ctx.strokeStyle = '#7d8799'; ctx.lineWidth = 2; D.roundRect(x, y, w, h, 14); ctx.stroke();
  }
  function drawInduce(t) {
    const I = S.ind, R = I.rod;
    floor(BENCH, 'wood');
    const P = indPose(R);
    if (I.obj === 'metal') {
      // 유리 받침 두 개
      [BAR.x + 36, BAR.x + BAR.w - 54].forEach((lx) => {
        const lg = ctx.createLinearGradient(lx, 0, lx + 18, 0);
        lg.addColorStop(0, 'rgba(190,225,240,.9)'); lg.addColorStop(0.5, 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(160,200,220,.9)');
        ctx.fillStyle = lg; D.roundRect(lx, BAR.y + BAR.h - 4, 18, BENCH - BAR.y - BAR.h + 4, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(100,150,180,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      });
      metalBar(BAR.x, BAR.y, BAR.w, BAR.h);
      // 이온(원자핵+속박 전자) 격자
      const k = I.k;
      for (let j = 0; j < 16; j++) {
        const c = j % 8, row = Math.floor(j / 8);
        const x = BAR.x + 30 + c * 42, y = BAR.y + 21 + row * 34;
        ctx.save(); ctx.globalAlpha = 0.95;
        D.sphere(x, y, 9, '#e8777b', { gloss: false });
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
        ctx.restore();
      }
      // 자유 전자: 쏠림(압축) 모형
      const ak = Math.abs(k), x0 = BAR.x + 10, ww = BAR.w - 20;
      I.el.forEach((e) => {
        let tt = (e.bx - x0) / ww;
        tt = k > 0 ? tt * (1 - 0.36 * ak) + 0.36 * ak : tt * (1 - 0.36 * ak);
        const ex = x0 + tt * ww + (RM ? 0 : Math.sin(t * e.sp + e.ph) * 3.2 * e.jr);
        const ey = e.by + (RM ? 0 : Math.cos(t * e.sp * 1.3 + e.ph) * 3.6 * e.jr);
        electron(clamp(ex, BAR.x + 14, BAR.x + BAR.w - 14), ey, 6.2);
      });
      // 유도 전하 표시
      if (Math.abs(k) > 0.12) {
        const a = clamp((Math.abs(k) - 0.12) / 0.5, 0, 1);
        const leftQ = k > 0 ? 1 : -1;
        [[BAR.x + 62, leftQ, I.ux < 0], [BAR.x + BAR.w - 62, -leftQ, I.ux > 0]].forEach((o) => {
          const x = o[0], q = o[1];
          badge(x, BAR.y + BAR.h + 36, 17 * (0.5 + 0.5 * SciSim.ease.outBack(a)), q, { alpha: a });
          D.text(x, BAR.y + BAR.h + 70, o[2] ? '가까운 쪽' : '먼 쪽', { size: 13, weight: 800, color: qCol(q), alpha: a });
        });
        D.text(BC.x, BAR.y - 14, '전체는 전기를 띠지 않아요 (중성)', { size: 13, weight: 700, color: MUTED, alpha: a });
      }
      pill(BC.x, BENCH + 30, '금속 막대 (전기를 띠지 않음)', 'rgba(255,255,255,.9)');
    } else {
      // 종잇조각
      pill(450, BENCH + 30, '종잇조각 (전기를 띠지 않음)', 'rgba(255,255,255,.9)');
      I.bits.forEach((b) => {
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        D.shadow(() => { D.roundRect(-30, -17, 60, 34, 4); ctx.fillStyle = '#fffdf6'; ctx.fill(); }, { blur: 6, y: 2 });
        ctx.strokeStyle = '#d6d0bd'; ctx.lineWidth = 1.5; D.roundRect(-30, -17, 60, 34, 4); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,140,110,.35)'; ctx.lineWidth = 1.2;
        for (let l = -7; l <= 9; l += 8) { ctx.beginPath(); ctx.moveTo(-18, l); ctx.lineTo(18, l); ctx.stroke(); }
        ctx.restore();
        if (b.w > 0.08) {
          const dx = P.tipx - b.x, dy = P.tipy - b.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
          const a = clamp(b.w * 2.2, 0, 1);
          badge(b.x + ux * 25, b.y + uy * 25, 7.5, -I.q, { alpha: a });
          badge(b.x - ux * 25, b.y - uy * 25, 7.5, I.q, { alpha: a });
        }
      });
    }
    // 대전체 막대 (끝이 대상을 향함)
    const tx = I.obj === 'paper' ? 450 : BC.x;
    if (!S.touched.induce && !RM) D.ring(R.x, R.y, 40, t, { color: '#f26b3a' });
    drawRod(R.x, R.y, P.ang, ROD_LEN, 28, I.q > 0 ? 'glass' : 'plastic', { lift: R.lift, grip: -1 });
    ctx.save(); ctx.translate(R.x, R.y); ctx.rotate(P.ang);
    drawSigns(ROD_LEN - 40, 28, I.q, 6, { count: 5, from: 14, to: 14 });
    ctx.restore();
    // 대전체 이름표
    D.label(R.x - Math.cos(P.ang) * 30, R.y - Math.abs(Math.sin(P.ang)) * 8 - 34, (I.q > 0 ? '(+) 유리 막대' : '(−) 플라스틱 막대'), { bg: qCol(I.q), color: '#fff', size: 13 });
  }

  /* ================= ④ 검전기 ================= */
  const EC = { x: 290, plateY: 176, hingeY: 372, leafL: 84 };
  const RACK = [{ x: 590, name: '가', cap: '#f26b3a' }, { x: 665, name: '나', cap: '#16a34a' }, { x: 740, name: '다', cap: '#2563eb' }];
  const ROD_Y0 = 330;
  function resetScope() {
    const sc = S.scope;
    const charges = [-1, 1, 0];
    for (let i = charges.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [charges[i], charges[j]] = [charges[j], charges[i]]; }
    sc.rods = RACK.map((r, i) => ({ i, name: r.name, cap: r.cap, ch: charges[i], x: r.x, y: ROD_Y0, tx: r.x, ty: ROD_Y0, lift: 0, grab: false, marked: false, near: 0, tested: false, pop: 0,
      tilt: new SciSim.Spring(0, { stiffness: 110, damping: 11 }), sv: 0 }));
    sc.k = 0; sc.kRaw = 0; sc.phi.value = 0.06; sc.phi.target = 0.06; sc.phi.velocity = 0;
    sc.el = [];
    for (let i = 0; i < 16; i++) sc.el.push({ b: i % 2, u: (Math.floor(i / 2) + 0.5) / 8 });
  }
  function rodDist(r) { // 막대(세로 선분)와 금속판(가장자리) 사이 거리
    const y = clamp(EC.plateY, r.y - 85, r.y + 85);
    const dx = Math.max(0, Math.abs(r.x - EC.x) - 62 - 13), dy = Math.max(0, Math.abs(y - EC.plateY) - 10);
    return Math.hypot(dx, dy);
  }
  function updateScope(dt) {
    const sc = S.scope;
    let kRaw = 0;
    sc.rods.forEach((r) => {
      const px = r.x;
      r.x = approach(r.x, r.tx, dt, 24); r.y = approach(r.y, r.ty, dt, 20);
      r.sv = approach(r.sv, (r.x - px) / Math.max(dt, 0.001), dt, 10);
      r.tilt.target = clamp(-r.sv * 0.0006, -0.22, 0.22); r.tilt.update(dt);
      r.lift = approach(r.lift, r.grab ? 1 : 0, dt, 14);
      r.pop = approach(r.pop, r.marked ? 1 : 0, dt, 12);
      const d = rodDist(r);
      const s = Math.pow(clamp(1 - (d - 8) / 130, 0, 1), 1.2);
      r.s = s;
      kRaw += -r.ch * s;                   // (−)막대: 전자가 아래(금속박)로 → +, (+)막대: 위로 → −
      if (s > 0.6 && S.scene === 'scope') { r.near += dt; if (r.near > 0.35) r.tested = true; } else r.near = Math.max(0, r.near - dt);
    });
    sc.kRaw = clamp(kRaw, -1, 1);
    sc.k = approach(sc.k, sc.kRaw, dt, 9);
    sc.phi.target = 0.06 + 0.82 * Math.abs(sc.k);
    sc.phi.update(dt);
  }
  function pathAt(b, u, phi) {
    const L1 = 50, L2 = EC.hingeY - EC.plateY, L3 = EC.leafL, tot = L1 + L2 + L3;
    let s = u * tot;
    const sg = b ? 1 : -1;
    if (s <= L1) return { x: EC.x + sg * (L1 - s), y: EC.plateY };
    s -= L1;
    if (s <= L2) return { x: EC.x, y: EC.plateY + s };
    s -= L2;
    return { x: EC.x + sg * Math.sin(phi) * s, y: EC.hingeY + Math.cos(phi) * s };
  }
  function drawScope(t) {
    const sc = S.scope, phi = sc.phi.value, k = sc.k;
    floor(488, 'plain');
    // 병 (유리)
    const jx0 = 200, jx1 = 380, jy0 = 262, jy1 = 478;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(jx0 + 12, jy0); ctx.lineTo(jx0, jy0 + 14); ctx.lineTo(jx0, jy1 - 26); ctx.quadraticCurveTo(jx0, jy1, jx0 + 26, jy1); ctx.lineTo(jx1 - 26, jy1); ctx.quadraticCurveTo(jx1, jy1, jx1, jy1 - 26); ctx.lineTo(jx1, jy0 + 14); ctx.lineTo(jx1 - 12, jy0); ctx.closePath();
    const jg = ctx.createLinearGradient(jx0, 0, jx1, 0);
    jg.addColorStop(0, 'rgba(190,220,245,.55)'); jg.addColorStop(0.5, 'rgba(240,248,255,.35)'); jg.addColorStop(1, 'rgba(170,205,235,.55)');
    ctx.fillStyle = jg; ctx.fill(); ctx.strokeStyle = 'rgba(110,150,190,.7)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(jx0 + 10, jy0 + 28, 7, 120, 3); ctx.fill();
    ctx.restore();
    D.shadow(() => { D.roundRect(jx0 - 12, jy1 - 2, jx1 - jx0 + 24, 14, 6); ctx.fillStyle = '#586274'; ctx.fill(); }, { blur: 8, y: 3 });
    // 코르크(절연체)
    ctx.fillStyle = '#b07a45'; D.roundRect(EC.x - 22, jy0 - 6, 44, 18, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(EC.x - 18, jy0 - 3, 10, 3);
    // 줄기·금속판
    const mg = ctx.createLinearGradient(EC.x - 4, 0, EC.x + 4, 0);
    mg.addColorStop(0, '#e9edf3'); mg.addColorStop(0.5, '#fafbfd'); mg.addColorStop(1, '#9ca6b6');
    ctx.fillStyle = mg; ctx.fillRect(EC.x - 4, EC.plateY, 8, EC.hingeY - EC.plateY);
    ctx.strokeStyle = '#7d8799'; ctx.lineWidth = 1; ctx.strokeRect(EC.x - 4, EC.plateY, 8, EC.hingeY - EC.plateY);
    const pg = ctx.createLinearGradient(0, EC.plateY - 10, 0, EC.plateY + 12);
    pg.addColorStop(0, '#f6f8fb'); pg.addColorStop(0.6, '#c3cad6'); pg.addColorStop(1, '#8e99ab');
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(EC.x, EC.plateY, 62, 11, 0, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill(); }, { blur: 8, y: 4 });
    ctx.strokeStyle = '#7d8799'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(EC.x, EC.plateY, 62, 11, 0, 0, Math.PI * 2); ctx.stroke();
    // 금속박
    [-1, 1].forEach((sg) => {
      ctx.save();
      ctx.translate(EC.x, EC.hingeY); ctx.rotate(sg * phi);
      const lg = ctx.createLinearGradient(-6, 0, 6, 0);
      lg.addColorStop(0, '#fff2a8'); lg.addColorStop(0.5, '#f2c230'); lg.addColorStop(1, '#c58a12');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(-sg * 1, 0); ctx.lineTo(sg * 5.5, 2); ctx.quadraticCurveTo(sg * 6.5, EC.leafL * 0.6, sg * 2.5, EC.leafL); ctx.lineTo(-sg * 1.5, EC.leafL - 2); ctx.quadraticCurveTo(-sg * 2.2, EC.leafL * 0.5, -sg * 1, 0); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = '#a4710a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = '#6b7686'; ctx.beginPath(); ctx.arc(EC.x, EC.hingeY, 5, 0, Math.PI * 2); ctx.fill();
    // 전자
    const m = k;                               // m>0: 전자가 금속박 쪽으로
    const am = Math.abs(m);
    sc.el.forEach((e) => {
      let u = e.u;
      u = m > 0 ? u * (1 - 0.5 * am) + 0.5 * am : u * (1 - 0.5 * am);
      const p = pathAt(e.b, u, phi);
      electron(p.x + (RM ? 0 : Math.sin(t * 2 + e.u * 9) * 1.2), p.y, 4.6);
    });
    // 유도 전하 표시
    if (am > 0.2) {
      const a = clamp((am - 0.2) / 0.4, 0, 1);
      const topQ = m > 0 ? 1 : -1;
      badge(EC.x - 90, EC.plateY, 14, topQ, { alpha: a, scale: 0.5 + 0.5 * SciSim.ease.outBack(a) });
      const lq = -topQ, lp = Math.sin(phi) * 70, ly = EC.hingeY + Math.cos(phi) * 70;
      badge(EC.x - lp - 24, ly, 12, lq, { alpha: a });
      badge(EC.x + lp + 24, ly, 12, lq, { alpha: a });
    }
    // 이름표
    [['금속판', 30, 170, EC.x - 62, EC.plateY], ['금속 막대', 30, 300, EC.x - 4, 300], ['금속박', 30, 400, EC.x - 10, EC.hingeY + 40]].forEach((o) => {
      ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.5;
      const bw = ctx.measureText(o[0]).width;
      ctx.beginPath(); ctx.moveTo(o[1] + 74, o[2]); ctx.lineTo(o[3] - (o[0] === '금속 막대' ? 14 : 0), o[4]); ctx.stroke();
      D.label(o[1] + 38, o[2], o[0], { bg: '#fff', color: INK, size: 14, border: 'rgba(120,135,160,.5)' });
    });
    // 막대 받침대
    D.shadow(() => { D.roundRect(548, ROD_Y0 + 85, 224, 40, 10); ctx.fillStyle = '#b98a54'; ctx.fill(); }, { blur: 8, y: 3 });
    RACK.forEach((r) => { ctx.fillStyle = '#8a6238'; ctx.beginPath(); ctx.ellipse(r.x, ROD_Y0 + 86, 17, 6, 0, 0, Math.PI * 2); ctx.fill(); });
    RACK.forEach((r) => D.text(r.x, ROD_Y0 + 116, r.name, { size: 15, weight: 800, color: '#fff' }));
    // 막대들 (끌고 있는 것이 위)
    const order = sc.rods.slice().sort((a, b) => (a.grab ? 1 : 0) - (b.grab ? 1 : 0) || a.lift - b.lift);
    const firstUntested = sc.rods.find((r) => !r.tested);
    order.forEach((r) => {
      if (!S.touched.scope && firstUntested === r && !RM) D.ring(r.x, r.y, 30, t, { color: '#f26b3a' });
      drawRod(r.x, r.y, Math.PI / 2 + r.tilt.value, 170, 26, 'mystery', { lift: r.lift, cap: r.cap });
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.tilt.value);
      D.sphere(0, -40, 13, r.cap, { text: r.name, textScale: 1.0 });
      if (r.pop > 0.02) {
        ctx.globalAlpha = r.pop;
        const s = 0.6 + 0.4 * SciSim.ease.outBack(r.pop);
        ctx.translate(0, -112); ctx.scale(s, s);
        D.label(0, 0, '⚡ 대전됨', { bg: '#f26b3a', color: '#fff', size: 13 });
      }
      ctx.restore();
    });
  }

  /* ================= 입력 ================= */
  const hitRub = (p) => Math.abs(p.x - S.rod.x) < ROD_L / 2 + 10 && Math.abs(p.y - S.rod.y) < ROD_R + 20;
  const hitHeld = (p) => { const h = S.force.held; return Math.abs(p.x - h.x) < 34 && p.y > h.y - 82 && p.y < h.y + 140; };
  // 매달린 막대: 줄 끝에 매달린 막대 몸통(회전 축 기준 118~268 거리)을 톡 누르면 전기 종류가 바뀜
  const HANG_OBJ = { tx: 0, ty: 0, grab: false };
  const hitHang = (p) => {
    const th = S.force.th.value, sx = Math.sin(th), cy = Math.cos(th);
    const ax = PIV.x + 118 * sx, ay = PIV.y + 2 + 118 * cy, bx = PIV.x + 268 * sx, by = PIV.y + 2 + 268 * cy;
    const vx = bx - ax, vy = by - ay, tt = clamp(((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
    return Math.hypot(p.x - (ax + vx * tt), p.y - (ay + vy * tt)) < 26;
  };
  const hitInd = (p) => {
    const R = S.ind.rod, P = indPose(R), L = ROD_LEN / 2 + 30;
    const ax = R.x - P.ux * L, ay = R.y - P.uy * L, bx = R.x + P.ux * L, by = R.y + P.uy * L;
    const vx = bx - ax, vy = by - ay, tt = clamp(((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
    return Math.hypot(p.x - (ax + vx * tt), p.y - (ay + vy * tt)) < 30;
  };
  const hitScope = (p) => { const rs = S.scope.rods.slice().reverse(); return rs.find((r) => Math.abs(p.x - r.x) < 30 && Math.abs(p.y - r.y) < 98) || null; };
  function grabbableAt(p) {
    if (S.scene === 'rub') return hitRub(p) ? { kind: 'rub' } : null;
    if (S.scene === 'force') { if (hitHeld(p)) return { kind: 'force' }; const c = chipAt(p); if (c) return { kind: 'chip', which: c.which, q: c.q }; return hitHang(p) ? { kind: 'hang' } : null; }
    if (S.scene === 'induce') return hitInd(p) ? { kind: 'induce' } : null;
    if (S.scene === 'scope') { const r = hitScope(p); return r ? { kind: 'scope', rod: r } : null; }
    return null;
  }
  const objOf = (g) => (g.kind === 'rub' ? S.rod : g.kind === 'force' ? S.force.held : g.kind === 'hang' ? HANG_OBJ : g.kind === 'induce' ? S.ind.rod : g.rod);
  const handlers = {
    hover(p) { return grabbableAt(p) ? 'grab' : null; },
    down(p) {
      const g = grabbableAt(p);
      if (!g) return false;
      if (g.kind === 'chip') {
        if (S.force[g.which] !== g.q) { setForceQ(g.which, g.q); Sound.click(); }
        S.touched.force = true; hideHint();
        return true;
      }
      const o = objOf(g);
      g.dx = o.tx - p.x; g.dy = o.ty - p.y; g.sx = p.x; g.sy = p.y; g.t0 = performance.now(); g.moved = 0;
      o.grab = true;
      if (g.kind === 'force' && S.force.hx != null) o.side = o.x >= S.force.hx ? 1 : -1;
      S.drag = g; S.touched[S.scene] = true; hideHint();
      Sound.tick();
      return true;
    },
    move(p) {
      const g = S.drag; if (!g) return;
      const o = objOf(g);
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.sx, p.y - g.sy));
      const X = p.x + g.dx, Y = p.y + g.dy;
      if (g.kind === 'rub') {
        const tx = clamp(X, ROD_L / 2 + 6, 506 - ROD_L / 2);
        let ty = clamp(Y, 110, ROD_HOME.y);
        const over = tx + ROD_L / 2 > FUR.x + 40 && tx - ROD_L / 2 < FUR.x + FUR.w - 40;
        if (over && ty > FUR.y - 62) ty = CONTACT_Y;
        o.tx = tx; o.ty = ty;
      } else if (g.kind === 'hang') {
        // 매달린 막대는 끌지 않고 톡 눌러 전기 종류만 바꿈
      } else if (g.kind === 'force') {
        // 손에 든 막대는 매달린 막대를 뚫고 지나가지 못해요 (처음 있던 쪽에 머물러요)
        let nx = clamp(X, 120, 760); const ny = clamp(Y, 110, 360), F = S.force;
        if (F.hx != null && Math.abs(ny - F.hy) < 150) {
          const ext = Math.abs(Math.sin(F.th.value)) * ROD_HALF + ROD_GAP;
          nx = (o.side || 1) > 0 ? Math.max(nx, F.hx + ext) : Math.min(nx, F.hx - ext);
        }
        o.tx = nx; o.ty = ny;
      } else if (g.kind === 'induce') {
        const q = clampRodOutside(clamp(X, 60, 740), clamp(Y, 70, 390));
        o.tx = q.x; o.ty = q.y;
      } else {
        o.tx = clamp(X, 40, 760); o.ty = clamp(Y, 110, ROD_Y0);
      }
    },
    up() {
      const g = S.drag; if (!g) return;
      const o = objOf(g);
      o.grab = false;
      if (g.kind === 'rub') SciSim.tween(o, { tx: ROD_HOME.x, ty: ROD_HOME.y }, { duration: 0.55, ease: 'outCubic' });
      if ((g.kind === 'force' || g.kind === 'hang') && g.moved < 8 && performance.now() - g.t0 < 450) {
        // 톡 누르면 (−) ↔ (+) 전환
        const which = g.kind === 'hang' ? 'hq' : 'hq2';
        setForceQ(which, -S.force[which]);
        Sound.click();
        const th = S.force.th.value;
        const bx = g.kind === 'hang' ? PIV.x + 193 * Math.sin(th) : S.force.held.x;
        const by = g.kind === 'hang' ? PIV.y + 2 + 193 * Math.cos(th) : S.force.held.y;
        parts.burst(bx, by, { count: 10, colors: S.force[which] > 0 ? ['#e2464b', '#ffd24a'] : ['#2f6df6', '#9cc2ff'], speed: 90, life: 0.45, size: 3, gravity: 0 });
      }
      if (g.kind === 'scope' && g.moved < 8 && performance.now() - g.t0 < 600) {
        o.marked = !o.marked; Sound.click();
        if (o.marked) parts.burst(o.x, o.y - 100, { count: 8, colors: ['#f26b3a', '#ffd24a'], speed: 90, life: 0.5, size: 3, gravity: 0 });
      }
      S.drag = null;
    },
  };
  SciSim.pointer(view, handlers);
  // 막대를 끌 때만 페이지 스크롤을 막고, 그 밖의 곳에서는 세로 스크롤을 허용
  view.canvas.style.touchAction = 'pan-y';
  view.canvas.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    if (grabbableAt(view.toLocal(e.touches[0]))) e.preventDefault();
  }, { passive: false });

  /* ---------- 조작판 ---------- */
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetRub(false); showHint('전기가 없어졌어요. 다시 문질러 보세요', 3000); });
  $$('#segHang button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setForceQ('hq', +b.dataset.q); }));
  $$('#segHeld button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setForceQ('hq2', +b.dataset.q); }));
  $$('#segInd button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setIndQ(+b.dataset.q); }));
  $$('#segObj button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setIndObj(b.dataset.obj); }));
  $('#scopeReset').addEventListener('click', () => { Sound.click(); S.scope.rods.forEach((r) => { r.marked = false; SciSim.tween(r, { tx: RACK[r.i].x, ty: ROD_Y0 }, { duration: 0.5, ease: 'outBack' }); }); });
  setForceQ('hq', -1); setForceQ('hq2', -1); setIndQ(-1); setIndObj('metal');

  /* ---------- 측정값 표시 ---------- */
  const rl = [$('#l1'), $('#l2'), $('#l3')], rv = [$('#v1'), $('#v2'), $('#v3')];
  const RLAB = {
    rub: ['플라스틱 막대', '털가죽', '이동한 전자 (털가죽→막대)'],
    force: ['매달린 막대 · 손에 든 막대', '전기력', '두 막대 사이 거리'],
    induce: ['대전체', '금속 막대의 가까운 쪽', '금속 막대의 먼 쪽'],
    scope: ['금속박', '검사한 막대', '대전됐다고 표시'],
  };
  function readoutLabels() {
    const lab = RLAB[S.scene].slice();
    if (S.scene === 'induce' && S.ind.obj === 'paper') { lab[1] = '종이의 가까운 쪽'; lab[2] = '종이의 먼 쪽'; }
    lab.forEach((l, i) => { if (rl[i].textContent !== l) rl[i].textContent = l; });
  }
  const colored = (q, txt) => '<span class="' + (q > 0 ? 'pos' : q < 0 ? 'neg' : '') + '">' + txt + '</span>';
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    readoutLabels();
    let a, b, c;
    if (S.scene === 'rub') {
      const n = S.rub.arrived;
      a = n ? colored(-1, '(−) 대전 · 전자 ' + n + '개 얻음') : '중성';
      b = n ? colored(1, '(+) 대전 · 전자 ' + n + '개 잃음') : '중성';
      c = n + '개';
    } else if (S.scene === 'force') {
      const f = S.force;
      a = colored(f.hq, qTxt(f.hq)) + ' · ' + colored(f.hq2, qTxt(f.hq2));
      b = f.strength < 0.12 ? '거의 없음' : (f.same ? '밀어냄' : '끌어당김') + (f.strength > 0.6 ? ' (강함)' : f.strength > 0.3 ? ' (보통)' : ' (약함)');
      c = f.strength > 0.6 ? '아주 가까움' : f.strength > 0.25 ? '가까움' : f.strength > 0.1 ? '보통' : '멂';
    } else if (S.scene === 'induce') {
      const I = S.ind, k = I.k;
      a = colored(I.q, I.q > 0 ? '(+) 유리 막대' : '(−) 플라스틱 막대');
      if (I.obj === 'paper') { const on = I.bits.some((x) => x.w > 0.1); b = on ? colored(-I.q, qTxt(-I.q) + ' (살짝)') : '중성'; c = on ? colored(I.q, qTxt(I.q) + ' (살짝)') : '중성'; }
      else if (Math.abs(k) < 0.15) { b = '중성'; c = '중성'; }
      else { const leftQ = k > 0 ? 1 : -1; const nq = I.ux < 0 ? leftQ : -leftQ; b = colored(nq, qTxt(nq)); c = colored(-nq, qTxt(-nq)); }
    } else {
      const sc = S.scope;
      a = Math.abs(sc.k) < 0.15 ? '오므라듦' : Math.abs(sc.k) < 0.5 ? '조금 벌어짐' : '크게 벌어짐';
      b = sc.rods.filter((r) => r.tested).length + ' / 3개';
      c = sc.rods.filter((r) => r.marked).length + '개';
    }
    rv[0].innerHTML = a; rv[1].innerHTML = b; rv[2].innerHTML = c;
  }

  /* ================= 단계별 학습 ================= */
  game = SciSim.game({
    simId: 'm2-static-electricity',
    mount: '#game',
    badge: '정전기 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      rub: '🧣 털가죽과 플라스틱 막대',
      atom: '🔍 원자 모형 돋보기',
      force: '🎣 매달린 막대와 손에 든 막대',
      induce: '🧪 금속 막대와 종잇조각',
      scope: '🔍 검전기',
    },
    onFeatures(set) { F = set; },
    onComplete() { /* 자유 탐구: 위쪽에서 실험을 고를 수 있어요 */ },
    levels: [
      /* ---------- 1단계 ---------- */
      {
        title: '마찰 전기: 전자의 이동', short: '마찰 전기', icon: '🧣', phase: '모형',
        features: ['rub', 'atom'],
        intro: '<p class="si-q">❓ 탐구 질문: 풍선을 머리카락에 문지르면 왜 머리카락이 달라붙을까?</p>' +
          '<p>서로 다른 두 물체를 <b>문지르면</b> 전기가 생겨요. 털가죽에 플라스틱 막대를 문지르면서, <b>원자 속에서 무슨 일이 일어나는지</b> 돋보기로 들여다봐요.</p>',
        setup() { setScene('rub'); resetRub(true); showHint('👆 플라스틱 막대를 끌어 털가죽 위에서 좌우로 문질러요', 8000); },
        recap: '두 물체를 문지르면 <b>전자</b>가 한 물체에서 다른 물체로 이동해요. 전자를 얻은 물체는 (−), 잃은 물체는 (+)를 띠어요.',
        summary: '<ul><li><b>마찰 전기</b>: 서로 다른 두 물체를 문지를 때 생기는 전기. 전기를 띠는 것을 <b>대전</b>, 전기를 띤 물체를 <b>대전체</b>라고 한다.</li>' +
          '<li>물체는 원래 (+)전하(원자핵)와 (−)전하(전자)의 양이 같아서 전기를 띠지 않는다(중성).</li>' +
          '<li>문지르면 <b>전자</b>가 이동한다. 전자를 <b>잃은</b> 물체는 (+), 전자를 <b>얻은</b> 물체는 (−)로 대전된다.</li>' +
          '<li>원자핵(양성자)은 이동하지 않는다. 한 물체가 잃은 전자 수와 다른 물체가 얻은 전자 수는 같다.</li></ul>' +
          '<p class="note">대전 서열: 털가죽 – 유리 – 명주 – 고무 – 플라스틱 … 앞쪽 물체일수록 전자를 잃어 (+)로 대전되기 쉽다.</p>',
        missions: [
          {
            title: '막대를 (−)로 대전시키기',
            goal: '플라스틱 막대를 끌어 털가죽 위에서 <b>좌우로 여러 번</b> 문질러요. 돋보기에서 전자의 움직임을 지켜보세요.',
            hint: '막대의 가운데를 손가락으로 눌러 끌고, 털가죽 위에서 왼쪽·오른쪽으로 왔다 갔다 해요.',
            setup() { setScene('rub'); resetRub(false); showHint('👆 막대를 끌어 털가죽 위에서 문질러요', 7000); },
            check: () => S.scene === 'rub' && S.rub.arrived >= NEED,
            status: () => '막대로 옮겨 온 전자 <b>' + S.rub.arrived + '</b>개 · ' + box(S.rub.arrived >= NEED) + ' (−) 대전 (전자 ' + NEED + '개 이상)',
            hold: 0.6,
            explain: '문지르는 동안 털가죽의 전자가 막대로 옮겨 가요. 전자(−)를 얻은 막대는 <b>(−)</b>로, 전자를 잃은 털가죽은 <b>(+)</b>로 대전돼요.',
          },
          {
            type: 'quiz',
            title: '무엇이 이동했을까?',
            goal: '문지르는 동안 두 물체 사이에서 옮겨 간 것은 무엇일까요?',
            setup() { setScene('rub'); presetRub(5); },
            choices: [
              '(+)전하를 띤 양성자가 털가죽에서 막대로 이동했다',
              '(−)전하를 띤 전자가 막대에서 털가죽으로 이동했다',
              '(−)전하를 띤 전자가 털가죽에서 막대로 이동했다',
              '문지르는 동안 전기가 새로 만들어졌다',
            ],
            answer: 2,
            feedback: [
              '원자핵 속 양성자는 원자 안에 단단히 묶여 있어서 움직이지 않아요. 돋보기에서 빨간 원자핵이 움직였나요?',
              '화살표 방향을 다시 봐요. 막대가 (−)가 되려면 전자를 <b>얻어야</b> 해요.',
              '',
              '전기가 새로 생기는 게 아니에요. 원래 원자 속에 있던 전자가 옮겨 간 거예요.',
            ],
            explain: '가볍고 바깥쪽에 있는 <b>전자</b>가 이동해요. 원자핵(+)은 움직이지 않아요. 털가죽의 전자가 막대로 옮겨 가요.',
          },
          {
            type: 'quiz',
            title: '털가죽은 어떤 전기?',
            goal: '전자를 잃은 털가죽은 어떤 전기를 띠고, 막대가 얻은 전자 수와 털가죽이 잃은 전자 수는 어떨까요?',
            setup() { setScene('rub'); presetRub(5); },
            choices: [
              '(−)를 띠고, 막대가 얻은 전자 수와 같다',
              '(+)를 띠고, 털가죽이 잃은 전자가 막대가 얻은 전자보다 더 많다',
              '(+)를 띠고, 막대가 얻은 전자 수와 같다',
              '전기를 띠지 않는다 (중성이다)',
            ],
            answer: 2,
            feedback: [
              '전자를 잃으면 (−)전하가 줄어서 (+)전하가 더 많아져요.',
              '전자는 사라지거나 새로 생기지 않아요. 털가죽이 잃은 만큼 막대가 얻어요.',
              '',
              '돋보기에서 털가죽 원자의 전자 수를 세어 보세요. 원래보다 줄었어요.',
            ],
            explain: '털가죽은 전자를 잃어 <b>(+)</b>로 대전돼요. 전자는 없어지지 않고 옮겨 가기만 하므로 <b>잃은 수와 얻은 수는 같아요</b>. 그래서 막대의 (−)와 털가죽의 (+)는 크기가 같아요.',
          },
        ],
      },
      /* ---------- 2단계 ---------- */
      {
        title: '전기력: 밀고 당기는 힘', short: '전기력', icon: '⚡', phase: '탐구',
        features: ['force'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 문지른 막대는 전자를 얻어 (−), 털가죽은 전자를 잃어 (+)로 대전된다는 것을 알았어요.</div>' +
          '<p>전기를 띤 두 물체 사이에는 어떤 힘이 작용할까요? 실에 매단 막대에 다른 막대를 가까이 가져가 관찰해 봐요.</p>',
        setup() { setScene('force'); showHint('👆 막대 이름표의 (−)/(+) 버튼으로 전기를 고르고, 오른쪽 막대를 끌어 가까이 가져가요', 7000); },
        recap: '같은 종류의 전기를 띤 물체끼리는 서로 <b>밀어내고</b>, 다른 종류끼리는 <b>끌어당겨요</b>. 가까울수록 이 힘(전기력)이 세져요.',
        summary: '<ul><li><b>전기력</b>: 전기를 띤 물체 사이에 작용하는 힘</li>' +
          '<li>같은 종류의 전기(+와 +, −와 −) → 서로 <b>밀어내는</b> 힘(척력)</li>' +
          '<li>다른 종류의 전기(+와 −) → 서로 <b>끌어당기는</b> 힘(인력)</li>' +
          '<li>두 물체가 <b>가까울수록</b> 전기력이 세지고, 멀어질수록 약해진다.</li></ul>',
        missions: [
          {
            title: '끌림과 밀어냄 모두 만들기',
            goal: '각 막대의 <b>(−)/(+) 버튼</b>으로 전기 종류를 바꿔 가며 <b>끌어당김</b>과 <b>밀어냄</b>을 모두 만들어 보세요. 가까이 갈수록 화살표가 커져요.',
            hint: '‘매달린 막대’와 ‘손에 든 막대’ 이름표가 붙은 (−)/(+) 버튼으로 전기 종류를 바꾸고(오른쪽 패널의 버튼도 같아요), 오른쪽 막대를 매달린 막대 가까이 끌어 가요.',
            setup() { setScene('force'); resetForce(); setForceQ('hq', -1); setForceQ('hq2', -1); S.force.sawA = false; S.force.sawR = false; },
            check: () => S.scene === 'force' && S.force.sawA && S.force.sawR,
            status: () => box(S.force.sawA) + ' 끌어당김 (다른 종류) · ' + box(S.force.sawR) + ' 밀어냄 (같은 종류)',
            hold: 0.4,
            explain: '(−)와 (+)처럼 <b>다른 종류</b>는 서로 끌어당기고, (−)와 (−)처럼 <b>같은 종류</b>는 서로 밀어내요. 거리가 가까울수록 전기력이 커져요.',
          },
          {
            type: 'quiz',
            title: '전기력의 규칙',
            goal: '전기를 띤 두 물체 사이에 작용하는 힘에 대해 옳게 말한 것은?',
            setup() { setScene('force'); },
            choices: [
              '같은 종류의 전기끼리는 끌어당기고, 멀수록 힘이 세다',
              '다른 종류의 전기끼리는 밀어내고, 가까울수록 힘이 세다',
              '같은 종류끼리는 밀어내고, 다른 종류끼리는 끌어당기며, 가까울수록 힘이 세다',
              '전기 종류와 관계없이 서로 끌어당기고, 거리와도 관계없다',
            ],
            answer: 2,
            feedback: [
              '(−)막대 두 개를 가까이 했을 때 어떻게 움직였는지 떠올려 보세요. 거리가 멀 때 화살표는 작았어요.',
              '(−)와 (+)를 가까이 했을 때 서로 달라붙었어요. 밀어내는 쪽은 어느 경우였나요?',
              '',
              '같은 종류끼리는 서로 멀어졌어요. 그리고 가까울 때 화살표가 훨씬 컸죠?',
            ],
            explain: '<b>같은 종류는 밀어내고 다른 종류는 끌어당겨요.</b> 그리고 두 물체가 <b>가까울수록</b> 전기력이 세져요.',
          },
        ],
      },
      /* ---------- 3단계 ---------- */
      {
        title: '정전기 유도', short: '정전기 유도', icon: '🧪', phase: '설명',
        features: ['induce'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기를 띤 물체 사이에는 밀거나 당기는 전기력이 작용한다는 것을 알았어요.</div>' +
          '<p>그런데 <b>전기를 띠지 않은</b> 금속 막대도 대전체를 가까이 하면 반응해요. 금속 속 <b>자유 전자</b>가 어떻게 움직이는지 살펴봐요.</p>',
        setup() { setScene('induce'); setIndObj('metal'); setIndQ(-1); showHint('👆 막대를 끌어 금속 막대 가까이 가져가요', 7000); },
        recap: '대전체를 금속에 가까이 하면 금속 속 <b>자유 전자</b>가 이동해서, 가까운 쪽에는 반대 종류, 먼 쪽에는 같은 종류의 전기가 생겨요. 이것이 <b>정전기 유도</b>예요.',
        summary: '<ul><li><b>정전기 유도</b>: 대전체를 금속에 가까이 할 때, 금속 속 전자가 이동하여 양 끝에 전기가 나타나는 현상</li>' +
          '<li>(−) 대전체 → 금속 속 전자가 <b>먼 쪽</b>으로 밀려난다 → 가까운 쪽 (+), 먼 쪽 (−)</li>' +
          '<li>(+) 대전체 → 금속 속 전자가 <b>가까운 쪽</b>으로 끌려온다 → 가까운 쪽 (−), 먼 쪽 (+)</li>' +
          '<li>움직이는 것은 <b>전자</b>뿐이다. 전체 전기량은 0이므로 금속 막대는 여전히 중성이고, 대전체를 치우면 원래대로 돌아간다.</li>' +
          '<li>종이처럼 전기가 잘 통하지 않는 물체에서도 원자 속 전자가 조금 쏠려, 가까운 쪽에 반대 종류의 전기가 생겨 끌려온다.</li></ul>',
        missions: [
          {
            title: '유도 현상 관찰하기',
            goal: '<b>(−) 막대</b>와 <b>(+) 막대</b>를 각각 금속 막대 가까이에 대 보세요. 금속 속 전자가 어느 쪽으로 움직이나요?',
            hint: '막대의 끝이 금속 막대의 끝에 닿을 듯 가까이 가야 해요. 위쪽 버튼으로 (−), (+)를 바꿔요.',
            setup() { setScene('induce'); setIndObj('metal'); setIndQ(-1); S.ind.negDone = false; S.ind.posDone = false; S.ind.hold = { '-1': 0, '1': 0 }; },
            check: () => S.scene === 'induce' && S.ind.negDone && S.ind.posDone,
            status: () => box(S.ind.negDone) + ' (−) 막대로 유도 · ' + box(S.ind.posDone) + ' (+) 막대로 유도' + (S.ind.obj !== 'metal' ? '<br><span style="color:#c2410c">🧪 대상을 금속 막대로 바꿔요</span>' : ''),
            hold: 0.3,
            explain: '(−) 막대를 가까이 하면 금속 속 전자가 <b>밀려나</b> 먼 쪽으로 이동하고, (+) 막대를 가까이 하면 전자가 <b>끌려와</b> 가까운 쪽으로 이동해요.',
          },
          {
            type: 'quiz',
            title: '무엇이 움직였을까?',
            goal: '(−) 막대를 가까이 하자 금속 막대의 가까운 쪽이 (+), 먼 쪽이 (−)가 됐어요. 이것은 무엇이 이동했기 때문일까요?',
            setup() { setScene('induce'); setIndObj('metal'); setIndQ(-1); },
            choices: [
              '금속 속 (+)전하(원자핵)가 가까운 쪽으로 이동했다',
              '막대의 전자가 금속 막대로 건너왔다',
              '금속 속 전기가 새로 만들어졌다',
              '금속 속 자유 전자가 막대에서 밀려 먼 쪽으로 이동했다',
            ],
            answer: 3,
            feedback: [
              '금속 속의 원자핵(+)은 제자리에 있어요. 화면에서 빨간 원자핵이 움직였나요?',
              '막대는 금속에 닿지 않았어요. 전자가 건너올 수 없어요.',
              '전기가 새로 생기지는 않아요. 전체 전기량은 0 그대로예요.',
              '',
            ],
            explain: '금속 속에는 자유롭게 움직이는 <b>자유 전자</b>가 있어요. (−)막대가 가까이 오면 전자가 밀려나 먼 쪽으로 이동해, 가까운 쪽은 전자가 부족해 (+), 먼 쪽은 (−)가 돼요.',
          },
          {
            type: 'quiz',
            title: '종잇조각이 끌려오는 까닭',
            goal: '전기를 띠지 않은 종잇조각도 대전체를 가까이 하면 끌려와요. 그 까닭은?',
            setup() { setScene('induce'); setIndObj('paper'); setIndQ(-1); showHint('👆 종이 가까이 막대를 가져가 보세요', 6000); },
            choices: [
              '종이가 대전체와 같은 종류의 전기를 띠기 때문',
              '종이 속 전자가 조금 이동해, 가까운 쪽에 반대 종류의 전기가 생겨 끌어당기는 힘이 더 크기 때문',
              '종이가 대전체의 전자를 모두 빼앗기 때문',
              '대전체가 중력을 없애 주기 때문',
            ],
            answer: 1,
            feedback: [
              '같은 종류라면 서로 밀어냈을 거예요. 종이는 끌려왔어요.',
              '',
              '대전체와 종이는 닿지 않았는데 전자를 빼앗을 수는 없어요.',
              '전기력은 중력과 관계없는 힘이에요. 종이 위의 (+)/(−) 표시를 살펴보세요.',
            ],
            explain: '종이에서도 <b>정전기 유도</b>가 조금 일어나요. 가까운 쪽에는 반대 종류, 먼 쪽에는 같은 종류의 전기가 생기는데, 가까운 쪽이 더 가까워서 <b>끌어당기는 힘이 더 커요</b>.',
          },
        ],
      },
      /* ---------- 4단계 ---------- */
      {
        title: '검전기로 전기 알아내기', short: '검전기', icon: '📟', phase: '적용',
        features: ['scope'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대전체를 금속에 가까이 하면 자유 전자가 이동하는 정전기 유도를 배웠어요.</div>' +
          '<p>이 원리로 <b>전기를 띠었는지 알아내는 도구</b>가 <b>검전기</b>예요. 금속판에 막대를 가까이 하면 금속박이 어떻게 되는지 보고, 정체를 모르는 막대 3개를 검사해 봐요.</p>',
        setup() { setScene('scope'); showHint('👆 막대 가·나·다를 끌어 금속판에 가까이 대 보세요', 8000); },
        recap: '대전체를 검전기의 금속판에 가까이 하면 전자가 이동해 두 금속박이 같은 종류의 전기를 띠고 <b>벌어져요</b>. 멀리 하면 다시 <b>오므라들어요</b>.',
        summary: '<ul><li><b>검전기</b>: 금속판, 금속 막대, 금속박으로 이루어진, 전기를 띠었는지 알아보는 도구</li>' +
          '<li>대전체를 금속판에 <b>가까이</b> 하면 정전기 유도로 전자가 이동 → 두 금속박이 <b>같은 종류</b>의 전기를 띠어 서로 밀어내 <b>벌어진다</b>.</li>' +
          '<li>대전체를 <b>멀리</b> 하면 전자가 제자리로 돌아가 금속박이 <b>오므라든다</b>.</li>' +
          '<li>전기를 띠지 않은 물체를 가까이 해도 금속박은 움직이지 않는다.</li>' +
          '<li>겨울철 정전기: 건조한 날 마찰로 생긴 전기가 빠져나가지 못하고 쌓였다가 한꺼번에 이동(방전)한다.</li></ul>',
        missions: [
          {
            title: '대전된 막대 찾기',
            goal: '막대 <b>가·나·다</b>를 금속판에 가까이 대 보고, <b>전기를 띤 막대</b>를 톡 눌러 표시한 뒤 [확인하기]를 눌러요.',
            hint: '금속박이 벌어지면 전기를 띤 막대예요. 막대를 톡 누르면 ⚡ 표시가 붙어요.',
            manual: true,
            setup() { setScene('scope'); resetScope(); },
            check: () => {
              const rs = S.scope.rods;
              if (!rs.every((r) => r.tested)) return '아직 금속판에 가까이 대 보지 않은 막대가 있어요. 세 막대를 모두 검사해 보세요.';
              const wrongMark = rs.filter((r) => r.marked && r.ch === 0), missed = rs.filter((r) => !r.marked && r.ch !== 0);
              if (wrongMark.length) return '막대 ' + wrongMark.map((r) => r.name).join(', ') + '에서는 금속박이 벌어지지 않았어요. 전기를 띠지 않은 막대의 표시를 지워요(다시 톡).';
              if (missed.length) return '금속박을 벌어지게 한 막대가 더 있어요. 표시가 빠진 막대를 찾아 눌러 보세요.';
              return true;
            },
            explain: '대전체(막대 2개)를 가까이 하면 금속박이 벌어지고, 전기를 띠지 않은 막대는 금속박을 움직이지 못해요. 검전기로 <b>전기를 띠었는지</b> 알 수 있어요.',
          },
          {
            type: 'quiz',
            title: '금속박이 벌어지는 까닭',
            goal: '대전체를 금속판에 가까이 하면 금속박이 벌어지고, 멀리 하면 오므라들어요. 옳게 설명한 것은?',
            setup() { setScene('scope'); },
            choices: [
              '막대의 전자가 금속박으로 흘러가 벌어지고, 멀리 하면 그 전자가 막대로 돌아간다',
              '금속박의 원자핵이 서로 밀어내서 벌어진다',
              '정전기 유도로 두 금속박이 같은 종류의 전기를 띠어 서로 밀어내고, 멀리 하면 전자가 제자리로 돌아가 오므라든다',
              '금속박이 대전체에 끌려 올라가서 벌어진다',
            ],
            answer: 2,
            feedback: [
              '막대는 금속판에 닿지 않았어요. 전자가 건너갈 수 없어요.',
              '원자핵은 이동하지 않아요. 움직이는 것은 전자예요.',
              '',
              '두 금속박은 서로 같은 종류의 전기를 띠었는지 살펴보세요. 화면의 (+)/(−) 표시를 확인해요.',
            ],
            explain: '막대가 가까워지면 검전기 속 전자가 이동해, <b>두 금속박이 같은 종류의 전기</b>를 띠어요. 같은 종류끼리는 서로 밀어내므로 벌어져요. 대전체를 멀리 하면 전자가 제자리로 돌아가 오므라들어요.',
          },
          {
            type: 'quiz',
            title: '겨울철 정전기',
            goal: '건조한 겨울에 스웨터를 벗거나 문손잡이를 잡을 때 "찌릿!" 하는 까닭은?',
            setup() { setScene('scope'); },
            choices: [
              '문손잡이가 전기를 새로 만들어 몸으로 보내기 때문',
              '마찰로 몸에 생긴 전기가 공기가 건조해 빠져나가지 못하고 쌓였다가, 금속에 닿을 때 한꺼번에 이동하기 때문',
              '양성자가 문손잡이에서 몸으로 이동하기 때문',
              '추워서 몸속의 전기가 얼기 때문',
            ],
            answer: 1,
            feedback: [
              '전기는 새로 만들어지지 않아요. 몸에 쌓여 있던 전기가 이동하는 거예요.',
              '',
              '이동하는 것은 전자예요. 양성자는 이동하지 않아요.',
              '전기가 얼지는 않아요. 마찰과 건조한 공기를 떠올려 보세요.',
            ],
            explain: '옷과 몸이 마찰하면서 <b>마찰 전기</b>가 생겨요. 건조한 날에는 공기 중으로 전기가 잘 빠져나가지 못해 쌓이다가, 금속에 닿으면 전자가 한꺼번에 이동(<b>방전</b>)해서 찌릿해요.',
          },
        ],
      },
    ],
  });
  window.__sim = { S, setScene, presetRub, setForceQ, setIndQ, setIndObj, resetScope, game: () => game, launchFlyer };

  /* ---------- 시작 ---------- */
  setScene('rub', true);
  resetInduce(); resetScope(); resetForce();
  let lastFree = null;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) {
      lastFree = game.free;
      sceneSeg.hidden = !lastFree;
      if (lastFree) $$('#sceneSeg button').forEach((b) => { b.disabled = false; });
    }
    if (S.scene === 'rub') updateRub(dt);
    else if (S.scene === 'force') updateForce(dt);
    else if (S.scene === 'induce') updateInduce(dt);
    else updateScope(dt);
    parts.update(dt);
    // 그리기
    view.clear('#eaf0fb');
    backdrop();
    ctx.save();
    ctx.globalAlpha = S.fade;
    ctx.translate(0, (1 - S.fade) * 12);
    if (S.scene === 'rub') drawRub(t);
    else if (S.scene === 'force') drawForce(t);
    else if (S.scene === 'induce') drawInduce(t);
    else drawScope(t);
    parts.draw(ctx);
    ctx.restore();
    updateReadouts(t);
  });
})();
