/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 — 기압과 바람 [9과17-04]
   ① [관찰] 물 컵 + 종이, 찌그러지는 페트병 → 공기가 모든 방향으로 누른다(기압), 입자 돋보기
   ② [실험] 가상 토리첼리 실험(수은은 독성 → 가상): 76 cm, 기울여도 수직 높이 76 cm, 높이 올라가면 낮아짐
   ③ [모형] 수조 모형: 모래·물을 전등으로 가열 → 향 연기가 물 쪽에서 모래 쪽으로, 고기압·저기압 표시
   ④ [적용] 해륙풍(하루 시각), 계절풍(여름·겨울 지도)
   ※ 등압선 그리기·일기 예보·일기도 작성·전향력은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp, fmt, toast } = SciSim;
  const TAU = Math.PI * 2;
  const view = SciSim.stage($('#cv'), { width: 800, height: 540, background: '#eaf4fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mixc = SciSim.color.mix;
  const approach = SciSim.approach, RM = !!SciSim.reduceMotion;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fx = new SciSim.Particles();

  /* ---------- 장면 ---------- */
  const SCENES = [
    { id: 'cup', step: 0, label: '🥛 물 컵과 종이' },
    { id: 'bottle', step: 0, label: '🧴 페트병' },
    { id: 'tube', step: 1, label: '📏 토리첼리 실험' },
    { id: 'tank', step: 2, label: '🔥 수조 모형' },
    { id: 'coast', step: 3, label: '🏖️ 해륙풍' },
    { id: 'monsoon', step: 3, label: '🗺️ 계절풍' },
  ];

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'cup', prev: null, tr: 1, t: 0,
    lensOn: true, lensA: 1,
    cup: { ang: 0, angS: 0, held: true, hand: 0, quiver: 0, inv: false, tilt: false, invT: 0 },
    bt: { stage: 0, T: 25, Tseal: 25, c: new SciSim.Spring(0, { stiffness: 55, damping: 9 }), capT: 0, pour: 0, water: 0, done: false, creak: false },
    tb: { alt: 0, altS: 0, tilt: 0, tiltS: 0, h: new SciSim.Spring(76, { stiffness: 90, damping: 7 }), maxTilt: 0, maxAlt: 0, drag: false, dots: [] },
    tk: { lamp: false, smoke: false, Ts: 25, Tw: 25, flow: 0, lampA: 0, smokeA: 0, cross: 0, parts: [], emit: 0 },
    co: { hour: 12, hourS: 12, play: false, w: 0, wS: 0, guess: null, guessActive: false, parts: [], upper: [], seen: false },
    mo: { sum: true, s: 1, sS: 1, seenSum: 0, seenWin: 0, parts: [], fl: 0 },
  };

  /* ---------- 공통 그리기 도우미 ---------- */
  function pill(x, y, text, o) { return D.label(x, y, text, Object.assign({ bg: 'rgba(255,255,255,.94)', color: '#1b2333', border: '#cbd5e1', size: 13 }, o || {})); }
  function newRing(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(S.t * 6);
    ctx.save(); ctx.strokeStyle = 'rgba(14,165,233,' + (0.35 + a * 0.5) + ')'; ctx.lineWidth = 4;
    D.roundRect(x - 5, y - 5, w + 10, h + 10, 14); ctx.stroke();
    ctx.fillStyle = '#0ea5e9'; D.roundRect(x + w - 36, y - 15, 46, 20, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = D.font(12, 800); ctx.textAlign = 'center'; ctx.fillText('NEW', x + w - 13, y); ctx.restore();
  }
  function caption(text) { pill(16, 30, text, { bg: 'rgba(30,41,59,.82)', color: '#fff', border: null, size: 14.5, pad: 12, align: 'left' }); }
  function labTable() {
    const g = ctx.createLinearGradient(0, 0, 0, 444); g.addColorStop(0, '#eef6fc'); g.addColorStop(1, '#dcebf6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 444);
    const t = ctx.createLinearGradient(0, 444, 0, 540); t.addColorStop(0, '#ecdcc0'); t.addColorStop(1, '#d6bf96');
    ctx.fillStyle = t; ctx.fillRect(0, 444, 800, 96);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 444, 800, 3);
  }
  let hintTimer = 0;
  function showHint(text, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = text; h.classList.remove('hide');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => h.classList.add('hide'), ms);
  }

  /* ---------- 입자 돋보기 (공통) ---------- */
  const LENS = { cx: 618, cy: 162, r: 96 };
  const LN = 13;
  const lp = { kind: '', a: [], b: [], fl: [], paper: 0 };
  for (let i = 0; i < LN; i++) { lp.a.push({ x: 0, y: 0, a: 0, k: 0.8 + Math.random() * 0.4 }); lp.b.push({ x: 0, y: 0, a: 0, k: 0.8 + Math.random() * 0.4 }); }
  for (let i = 0; i < 24; i++) lp.fl.push({ x: 0, y: 0, t: 9 });
  let flI = 0;
  function flash(x, y) { const f = lp.fl[flI++ % lp.fl.length]; f.x = x; f.y = y; f.t = 0; }
  function initLens(kind) {
    lp.kind = kind;
    const r = LENS.r - 14;
    lp.a.forEach((p) => { p.a = Math.random() * TAU; });
    lp.b.forEach((p) => { p.a = Math.random() * TAU; });
    if (kind === 'cup') {
      lp.a.forEach((p) => { p.x = (Math.random() * 2 - 1) * (r - 10); p.y = 20 + Math.random() * (r - 30); });
    } else {
      lp.a.forEach((p) => { p.x = -r + 8 + Math.random() * (r - 30); p.y = (Math.random() * 2 - 1) * (r - 12); });
      lp.b.forEach((p) => { p.x = 14 + Math.random() * (r - 24); p.y = (Math.random() * 2 - 1) * (r - 12); });
    }
  }
  function lensStep(dt) {
    const R = 6, lim = LENS.r - 14;
    lp.paper = approach(lp.paper, 0, dt, 14);
    if (lp.kind === 'cup') {
      const v = 120 * (S.cup.held ? 1 : 1);
      lp.a.forEach((p) => {
        p.x += Math.cos(p.a) * v * p.k * dt; p.y += Math.sin(p.a) * v * p.k * dt;
        if (p.x < -lim + R) { p.x = -lim + R; p.a = Math.PI - p.a; }
        if (p.x > lim - R) { p.x = lim - R; p.a = Math.PI - p.a; }
        if (p.y > lim - R) { p.y = lim - R; p.a = -p.a; }
        if (p.y < 5 + R) { p.y = 5 + R; p.a = -p.a; flash(p.x, 5); lp.paper = -2.5; }
      });
    } else if (lp.kind === 'bottle') {
      const b = S.bt;
      const vIn = clamp(120 + (b.T - 20) * 2.0, 60, 230), vOut = 120;
      const wallX = -clamp(b.c.value, 0, 1.1) * 11;
      lp.a.forEach((p) => {
        p.x += Math.cos(p.a) * vIn * p.k * dt; p.y += Math.sin(p.a) * vIn * p.k * dt;
        if (p.x < -lim + R) { p.x = -lim + R; p.a = Math.PI - p.a; }
        if (p.x > wallX - 5 - R) { p.x = wallX - 5 - R; p.a = Math.PI - p.a; flash(wallX - 5, p.y); }
        if (p.y > lim - R) { p.y = lim - R; p.a = -p.a; }
        if (p.y < -lim + R) { p.y = -lim + R; p.a = -p.a; }
      });
      lp.b.forEach((p) => {
        p.x += Math.cos(p.a) * vOut * p.k * dt; p.y += Math.sin(p.a) * vOut * p.k * dt;
        if (p.x > lim - R) { p.x = lim - R; p.a = Math.PI - p.a; }
        if (p.x < wallX + 5 + R) { p.x = wallX + 5 + R; p.a = Math.PI - p.a; flash(wallX + 5, p.y); }
        if (p.y > lim - R) { p.y = lim - R; p.a = -p.a; }
        if (p.y < -lim + R) { p.y = -lim + R; p.a = -p.a; }
      });
    }
    lp.fl.forEach((f) => { f.t += dt; });
  }
  function drawLens(target, content, caption) {
    const A = S.lensA;
    if (A < 0.02) return;
    const { cx, cy, r } = LENS;
    ctx.save();
    ctx.globalAlpha = A;
    const sc = 0.88 + 0.12 * A;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    // 연결선
    if (target) {
      const a = Math.atan2(target.y - cy, target.x - cx);
      D.dashedLine(target.x, target.y, cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98, { color: '#64748b', width: 2.5, dash: [5, 6], offset: S.t * 14 });
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(target.x, target.y, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(target.x, target.y, 11, 0, TAU); ctx.stroke();
    }
    // 손잡이
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
    D.shadow(() => { D.roundRect(r - 4, -9, 54, 18, 9); ctx.fillStyle = '#6b7a90'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.restore();
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }, { blur: 16, y: 5 });
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.translate(cx, cy);
    content();
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 5, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    if (caption) pill(cx - 28, cy + r + 20, caption, { bg: 'rgba(30,41,59,.88)', color: '#fff', border: null, size: 13 });
    ctx.restore();
  }
  function lensFlashes() {
    lp.fl.forEach((f) => {
      if (f.t > 0.35) return;
      const k = f.t / 0.35;
      ctx.strokeStyle = 'rgba(245,158,11,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, 8 + k * 16, 0, TAU); ctx.stroke();
    });
  }

  /* ---------- 힘 비교 막대 패널 ---------- */
  function barsPanel(title, items, y, note) {
    const x = 500, w = 272, h = 206;
    ctx.save();
    D.shadow(() => { D.roundRect(x, y, w, h, 16); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#d5dfeb'; ctx.lineWidth = 1.5; D.roundRect(x, y, w, h, 16); ctx.stroke();
    D.text(x + 16, y + 26, title, { size: 15, weight: 800, align: 'left', color: '#1b2333' });
    const base = y + h - 36, bw = 62;
    items.forEach((it, i) => {
      const bx = x + 38 + i * 128;
      const hh = Math.max(3, Math.min(100, it.v));
      ctx.fillStyle = '#eef3f9'; D.roundRect(bx, base - 108, bw, 108, 8); ctx.fill();
      const g = ctx.createLinearGradient(0, base - hh, 0, base); g.addColorStop(0, shade(it.color, 0.25)); g.addColorStop(1, it.color);
      ctx.fillStyle = g; D.roundRect(bx, base - hh, bw, hh, 8); ctx.fill();
      D.text(bx + bw / 2, base - hh - 7, it.top, { size: 13, weight: 800, color: it.color });
      D.text(bx + bw / 2, base + 17, it.label, { size: 13, weight: 800, color: '#334155' });
    });
    if (note) D.text(x + w - 14, y + 26, note, { size: 13, weight: 800, color: '#b45309', align: 'right' });
    ctx.restore();
  }

  /* =========================================================
     장면 1-A: 물 컵과 종이
     ========================================================= */
  function drawHand() {
    // 컵 좌표계에서 종이 바깥쪽(y<-84)을 받치는 손
    ctx.save();
    const grad = ctx.createLinearGradient(0, -112, 0, -86);
    grad.addColorStop(0, '#f8d2b4'); grad.addColorStop(1, '#e8a982');
    ctx.strokeStyle = '#e8a982'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-34, -102); ctx.lineTo(-160, -150); ctx.stroke();
    ctx.strokeStyle = '#f2bf9c'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(-34, -102); ctx.lineTo(-160, -150); ctx.stroke();
    ctx.fillStyle = grad; D.roundRect(-52, -112, 138, 26, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(160,90,50,.45)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(34 + i * 16, -108); ctx.lineTo(34 + i * 16, -90); ctx.stroke(); }
    ctx.fillStyle = '#f6c9a8'; D.roundRect(-44, -96, 52, 14, 7); ctx.fill();
    ctx.restore();
  }
  function drawCup() {
    labTable();
    const c = S.cup, cx = 250, cy = 258;
    const th = c.angS * Math.PI / 180;
    // 받침 쟁반과 그림자
    D.roundRect(96, 432, 308, 16, 8); ctx.fillStyle = '#c7d8e8'; ctx.fill();
    ctx.fillStyle = 'rgba(70,90,120,.16)'; ctx.beginPath(); ctx.ellipse(cx, 438, 70 + 12 * Math.abs(Math.cos(th)), 8, 0, 0, TAU); ctx.fill();
    const mx = Math.sin(th), my = -Math.cos(th);              // 컵 입구 방향
    const px = cx + mx * 81, py = cy + my * 81;                 // 종이 중심
    // 공기가 누르는 화살표
    const rel = 1 - c.hand;
    const aA = 0.3 + 0.7 * c.hand;
    const tx = Math.cos(th), ty = Math.sin(th);
    const pulse = RM ? 0 : Math.sin(S.t * 5) * 4;
    for (let k = -2; k <= 2; k++) {
      const d0 = 156 + pulse, d1 = 100 + pulse * 0.4;
      D.arrow(cx + mx * d0 + tx * k * 30, cy + my * d0 + ty * k * 30, cx + mx * d1 + tx * k * 30 * 0.9, cy + my * d1 + ty * k * 30 * 0.9,
        { color: '#2563eb', width: 5, head: 15, alpha: aA * (k === 0 ? 1 : 0.85) });
    }
    if (c.hand > 0.5) {
      for (let i = 0; i < 8; i++) {
        const a = th + Math.PI / 2 + (i / 8) * TAU * 0.0 + i * (TAU / 8);
        const dirx = Math.cos(a), diry = Math.sin(a);
        const dot = dirx * mx + diry * my;
        if (dot > 0.55) continue;
        D.arrow(cx + dirx * 142, cy + diry * 142, cx + dirx * 112, cy + diry * 112, { color: '#60a5fa', width: 3.5, head: 11, alpha: 0.5 * (c.hand - 0.5) * 2 });
      }
    }
    // 컵 몸통
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(th);
    const path = () => {
      ctx.beginPath(); ctx.moveTo(-58, -78); ctx.lineTo(-54, 58); ctx.quadraticCurveTo(-52, 76, -34, 76);
      ctx.lineTo(34, 76); ctx.quadraticCurveTo(52, 76, 54, 58); ctx.lineTo(58, -78);
    };
    ctx.save(); path(); ctx.closePath();
    const wg = ctx.createLinearGradient(-58, 0, 58, 0); wg.addColorStop(0, 'rgba(120,190,250,.78)'); wg.addColorStop(0.5, 'rgba(150,210,255,.7)'); wg.addColorStop(1, 'rgba(96,165,240,.82)');
    ctx.fillStyle = wg; ctx.fill(); ctx.restore();
    // 물 속 반짝임
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const yy = -40 + i * 38 + Math.sin(S.t * 1.5 + i) * 2; ctx.beginPath(); ctx.moveTo(-34, yy); ctx.quadraticCurveTo(0, yy - 6, 34, yy); ctx.stroke(); }
    path(); ctx.strokeStyle = '#7f95b2'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-44, -60); ctx.lineTo(-42, 50); ctx.stroke();
    // 종이
    const q = RM ? 0 : Math.sin(S.t * 38) * c.quiver * 1.6;
    ctx.save(); ctx.translate(0, q);
    D.shadow(() => { D.roundRect(-68, -85, 136, 7, 3); ctx.fillStyle = '#fffdf6'; ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(40,50,80,.25)' });
    ctx.strokeStyle = '#d9d2bf'; ctx.lineWidth = 1.2; D.roundRect(-68, -85, 136, 7, 3); ctx.stroke();
    ctx.restore();
    // 손
    if (c.hand < 0.98) {
      ctx.globalAlpha = 1 - c.hand; ctx.translate(-90 * c.hand, -60 * c.hand);
      drawHand();
    }
    ctx.restore();
    // 물의 무게(작은 화살표)
    D.arrow(px + 34, py - 8 - (mx * 0), px + 34, py + 18, { color: '#ef4444', width: 4, head: 11, alpha: 0.9 });
    // 라벨
    if (c.hand > 0.6) {
      const lx = cx + mx * 196 + tx * 90, ly = cy + my * 196 + ty * 90;
      pill(clamp(lx, 130, 370), clamp(ly, 40, 420), '대기압 — 모든 방향에서 눌러요', { bg: 'rgba(37,99,235,.92)', color: '#fff', border: null });
    } else if (c.angS > 90) {
      pill(cx, clamp(cy + 140, 40, 420), '손이 받치고 있어요', { bg: 'rgba(100,116,139,.9)', color: '#fff', border: null });
    }
    // 오른쪽: 돋보기 + 힘 비교
    const tgt = { x: px, y: py };
    drawLens(tgt, () => {
      const r = LENS.r;
      const g = ctx.createLinearGradient(0, -r, 0, 0); g.addColorStop(0, '#b6dcfb'); g.addColorStop(1, '#8cc4f5');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, r);
      ctx.fillStyle = '#f4f9ff'; ctx.fillRect(-r, 0, 2 * r, r);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const yy = -26 - i * 26; ctx.beginPath(); ctx.moveTo(-r, yy); ctx.quadraticCurveTo(-r / 2, yy - 5, 0, yy); ctx.quadraticCurveTo(r / 2, yy + 5, r, yy); ctx.stroke(); }
      D.text(-48, -r + 44, '컵 속 물', { size: 13, weight: 800, color: '#1e4f86', align: 'left' });
      lp.a.forEach((p) => { D.sphere(p.x, p.y, 6.5, '#3b82f6', { shadow: false }); });
      lensFlashes();
      ctx.save(); ctx.translate(0, lp.paper);
      D.roundRect(-r, -5, 2 * r, 10, 3); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      D.text(-r + 22, 4, '종이', { size: 12, weight: 800, color: '#64748b', align: 'left' });
      D.text(0, r - 12, '공기 입자', { size: 13, weight: 800, color: '#1d4ed8' });
    }, '컵을 뒤집은 종이 아래쪽 (확대)');
    const py0 = lerp(76, 292, S.lensA);
    barsPanel('힘을 비교해 봐요', [
      { v: 100, color: '#2563eb', top: '매우 커요', label: '공기가 미는 힘' },
      { v: 8, color: '#ef4444', top: '작아요', label: '물의 무게' },
    ], py0);
    caption('물을 가득 채운 컵 + 종이 한 장');
  }

  /* =========================================================
     장면 1-B: 찌그러지는 페트병
     ========================================================= */
  const BT = { x: 232, y: 430 };
  function btHalfW(yy, c) {              // yy: 바닥에서 위로 잰 높이(양수)
    let w;
    if (yy < 14) w = 50 * (0.74 + 0.26 * Math.sqrt(Math.max(0, 1 - Math.pow((14 - yy) / 14, 2))));
    else if (yy <= 176) w = 50;
    else if (yy <= 212) { const k = (yy - 176) / 36; w = lerp(50, 15, sstep(0, 1, k)); }
    else w = 15;
    if (yy > 8 && yy < 205) {
      const k = clamp(c, 0, 1.1);
      const dent = 0.5 + 0.5 * Math.sin(yy * 0.075 + 1.0);
      w *= 1 - k * (0.2 + 0.32 * dent) * (yy > 176 ? 0.6 : 1);
    }
    return w;
  }
  function btPath(c) {
    const lean = clamp(c, 0, 1.1);
    ctx.beginPath();
    const pts = [];
    for (let yy = 0; yy <= 252; yy += 4) pts.push(yy);
    pts.forEach((yy, i) => {
      const x = BT.x + btHalfW(yy, c) - 6 * lean * Math.sin(yy * 0.03 + 0.6), y = BT.y - yy;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      const yy = pts[i];
      ctx.lineTo(BT.x - btHalfW(yy, c) - 6 * lean * Math.sin(yy * 0.03 + 0.6), BT.y - yy);
    }
    ctx.closePath();
  }
  function drawBottle() {
    labTable();
    const b = S.bt, c = clamp(b.c.value, 0, 1.08);
    const hot = clamp((b.T - 30) / 38, 0, 1);
    ctx.fillStyle = 'rgba(70,90,120,.16)'; ctx.beginPath(); ctx.ellipse(BT.x, BT.y + 6, 62 - 6 * c, 8, 0, 0, TAU); ctx.fill();
    // 바깥 공기 화살표 (일정) / 안쪽 공기 화살표 (온도에 따라)
    const pin = b.stage >= 2 ? (b.T + 273) / (b.Tseal + 273) : 1;
    const pul = RM ? 0 : Math.sin(S.t * 5) * 3;
    [[-1, 60], [1, 60], [-1, 120], [1, 120], [-1, 165], [1, 165]].forEach(([sd, yy]) => {
      const x0 = BT.x + sd * (btHalfW(yy, c) + 44 + pul), x1 = BT.x + sd * (btHalfW(yy, c) + 12);
      D.arrow(x0, BT.y - yy, x1, BT.y - yy, { color: '#2563eb', width: 4.5, head: 13, alpha: 0.9 });
    });
    ctx.save();
    ctx.translate(0, BT.y); ctx.scale(1, 1 - 0.1 * c); ctx.translate(0, -BT.y);
    // 병 몸통 (시리얼/투명 플라스틱)
    btPath(c);
    const g = ctx.createLinearGradient(BT.x - 55, 0, BT.x + 55, 0);
    g.addColorStop(0, 'rgba(190,225,250,.62)'); g.addColorStop(0.35, 'rgba(235,247,255,.48)'); g.addColorStop(1, 'rgba(160,205,240,.66)');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); btPath(c); ctx.clip();
    // 뜨거운 공기 색
    if (hot > 0.01) { ctx.fillStyle = 'rgba(255,128,64,' + (0.2 * hot) + ')'; ctx.fillRect(BT.x - 70, BT.y - 260, 140, 270); }
    // 뜨거운 물
    if (b.water > 0.01) {
      const wy = BT.y - 8 - b.water * 120;
      ctx.fillStyle = 'rgba(255,150,100,.55)';
      ctx.beginPath(); ctx.moveTo(BT.x - 60, BT.y + 4);
      for (let i = 0; i <= 12; i++) ctx.lineTo(BT.x - 60 + i * 10, wy + Math.sin(S.t * 3 + i) * 1.6);
      ctx.lineTo(BT.x + 60, BT.y + 4); ctx.closePath(); ctx.fill();
    }
    // 김
    if (hot > 0.05 && b.stage >= 1) {
      for (let i = 0; i < 7; i++) {
        const sx = BT.x + Math.sin(S.t * 0.8 + i * 1.9) * 22, sy = BT.y - 40 - ((S.t * 22 + i * 36) % 190);
        const al = 0.28 * hot * Math.sin(Math.PI * clamp((BT.y - 40 - sy) / 190, 0, 1));
        D.glow(sx, sy, 28, '#ffffff', al * 2);
      }
    }
    ctx.restore();
    // 주름 / 윤곽
    btPath(c); ctx.strokeStyle = '#6f8fb3'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(110,145,180,.55)'; ctx.lineWidth = 2;
    [40, 78, 116, 154].forEach((yy) => {
      const wL = btHalfW(yy, c), off = -6 * clamp(c, 0, 1.1) * Math.sin(yy * 0.03 + 0.6);
      ctx.beginPath(); ctx.moveTo(BT.x - wL + off + 2, BT.y - yy); ctx.quadraticCurveTo(BT.x + off, BT.y - yy + 7 - c * 10, BT.x + wL + off - 2, BT.y - yy); ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(BT.x - btHalfW(120, c) + 9, BT.y - 150); ctx.lineTo(BT.x - btHalfW(60, c) + 9, BT.y - 30); ctx.stroke();
    // 겉에 맺힌 물방울
    const cold = b.stage >= 3 ? clamp(1 - (b.T - 5) / 63, 0, 1) : 0;
    if (cold > 0.05) {
      const r2 = rnd(77);
      for (let i = 0; i < 16; i++) {
        const yy = 20 + r2() * 150, sd = r2() * 2 - 1;
        ctx.fillStyle = 'rgba(210,235,255,' + (0.8 * cold) + ')';
        ctx.beginPath(); ctx.arc(BT.x + sd * (btHalfW(yy, c) - 6), BT.y - yy, 2.2 + r2() * 1.5, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    // 뚜껑
    const capK = clamp(b.capT, 0, 1.15);
    ctx.save();
    ctx.translate(BT.x + (1 - capK) * 70 + 0, BT.y - 10 - 252 * (1 - 0.1 * c) - (1 - capK) * 60 - 9);
    ctx.rotate((1 - capK) * 0.7);
    D.shadow(() => { D.roundRect(-18, -11, 36, 22, 6); ctx.fillStyle = '#2f6df0'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-14, -9, 5, 18);
    ctx.strokeStyle = 'rgba(0,0,60,.25)'; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8 + 4, -9); ctx.lineTo(i * 8 + 4, 9); ctx.stroke(); }
    ctx.restore();
    // 주전자 (뜨거운 물 붓기)
    if (b.pour > 0.01 && b.pour < 0.99) {
      const k = b.pour, a = Math.sin(k * Math.PI);
      ctx.save(); ctx.globalAlpha = clamp(a * 2, 0, 1);
      const kx = BT.x - 88 + a * 6, ky = BT.y - 330 + 0;
      ctx.translate(kx, ky); ctx.rotate(-0.15 - a * 0.65);
      D.shadow(() => { D.roundRect(-34, -22, 68, 46, 14); ctx.fillStyle = '#f97316'; ctx.fill(); }, { blur: 8, y: 3 });
      D.roundRect(-34, -22, 68, 46, 14); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-28, -18, 7, 38);
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(30, -8); ctx.lineTo(52, -26); ctx.stroke();
      ctx.beginPath(); ctx.arc(-36, 2, 17, -1.2, 1.2); ctx.stroke();
      ctx.restore();
      if (k > 0.2 && k < 0.85) {
        ctx.strokeStyle = 'rgba(255,170,110,.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(BT.x - 6, BT.y - 300); ctx.lineTo(BT.x + 2, BT.y - 128); ctx.stroke();
      }
    }
    fx.draw(ctx);
    // 라벨
    if (b.stage === 1 || b.stage === 2) pill(BT.x, 62, '병 속 공기가 뜨거워졌어요 · ' + Math.round(b.T) + ' °C', { bg: 'rgba(239,68,68,.92)', color: '#fff', border: null });
    else if (b.stage >= 3) pill(BT.x, 62, '병 속 공기가 식어요 · ' + Math.round(b.T) + ' °C', { bg: 'rgba(37,99,235,.92)', color: '#fff', border: null });
    // 돋보기
    const wx = BT.x + btHalfW(120, c) - 6 * clamp(c, 0, 1.1) * Math.sin(120 * 0.03 + 0.6), wy = BT.y - 120;
    drawLens({ x: wx, y: wy }, () => {
      const r = LENS.r, wallX = -clamp(b.c.value, 0, 1.1) * 11;
      ctx.fillStyle = mixc('#eef6ff', '#ffe3d4', hot); ctx.fillRect(-r, -r, r + wallX, 2 * r);
      ctx.fillStyle = '#eef6ff'; ctx.fillRect(wallX, -r, r - wallX, 2 * r);
      D.text(-r + 34, -r + 44, '병 속', { size: 13, weight: 800, color: '#9a3412', align: 'left' });
      D.text(r - 34, -r + 44, '병 밖', { size: 13, weight: 800, color: '#1d4ed8', align: 'right' });
      const inCol = mixc('#60a5fa', '#ef4444', clamp((b.T - 10) / 58, 0, 1));
      lp.a.forEach((p) => D.sphere(p.x, p.y, 6.5, inCol, { shadow: false }));
      lp.b.forEach((p) => D.sphere(p.x, p.y, 6.5, '#3b82f6', { shadow: false }));
      lensFlashes();
      D.roundRect(wallX - 5, -r, 10, 2 * r, 3); ctx.fillStyle = '#a9c4de'; ctx.fill(); ctx.strokeStyle = '#6f8fb3'; ctx.lineWidth = 1.5; ctx.stroke();
    }, '병 벽면을 확대한 모습');
    barsPanel('안과 밖의 힘', [
      { v: 100 * pin, color: '#ef4444', top: pin.toFixed(2) + '기압', label: '안쪽 공기' },
      { v: 100, color: '#2563eb', top: '1.00기압', label: '바깥 공기' },
    ], lerp(76, 292, S.lensA), pin < 0.97 ? '바깥이 더 세요!' : '');
    caption('뚜껑을 닫는 빈 페트병');
  }

  /* =========================================================
     장면 2: 가상 토리첼리 실험
     ========================================================= */
  const TB = { px: 270, surf: 452, pxcm: 3.4, L: 95 };
  const pressAt = (m) => 1013.25 * Math.pow(1 - 2.25577e-5 * m, 5.25588);        // 표준 대기 (hPa)
  const cmHgAt = (m) => 76 * pressAt(m) / 1013.25;
  function mtnPos(alt) {
    const s = clamp(alt / 8000, 0, 1), y = 470 - s * 350;
    const x = y > 330 ? lerp(520, 590, (470 - y) / 140) : lerp(590, 650, (330 - y) / 210);
    return { x, y };
  }
  function tbInitDots() {
    const r = rnd(4242);
    for (let i = 0; i < 46; i++) S.tb.dots.push({ x: r() * 800, y: 20 + r() * 400, th: r(), a: 0, ph: r() * 6 });
  }
  tbInitDots();
  function tbStep(dt) {
    const b = S.tb;
    b.altS = approach(b.altS, b.alt, dt, 5);
    b.tiltS = approach(b.tiltS, b.tilt, dt, 9);
    b.h.target = cmHgAt(b.altS);
    b.h.update(dt);
    const dens = pressAt(b.altS) / 1013.25;
    b.dots.forEach((d) => { d.a = approach(d.a, d.th < dens ? 0.5 : 0, dt, 3); d.x += Math.sin(S.t * 0.5 + d.ph) * dt * 6; });
    b.maxTilt = Math.max(b.maxTilt, b.tilt);
    b.maxAlt = Math.max(b.maxAlt, b.alt);
  }
  function drawTube() {
    const b = S.tb, k = clamp(b.altS / 8000, 0, 1);
    D.sky(0, 0, 800, 540, mixc('#bfe3ff', '#3a6fc4', k * 0.85), mixc('#eef7ff', '#d4e4f4', k));
    b.dots.forEach((d) => { if (d.a > 0.02) { ctx.fillStyle = 'rgba(255,255,255,' + d.a + ')'; ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, TAU); ctx.fill(); } });
    // 땅과 산
    D.ground(0, 490, 800, 50, { top: '#8fd18a', mid: '#6cbf6a', soil: '#c9a776', bottom: '#a8865a' });
    const mt = ctx.createLinearGradient(0, 110, 0, 490); mt.addColorStop(0, '#9aa7b8'); mt.addColorStop(0.45, '#8a8f7a'); mt.addColorStop(1, '#6f9a58');
    ctx.fillStyle = mt;
    ctx.beginPath(); ctx.moveTo(500, 490); ctx.lineTo(520, 470); ctx.lineTo(590, 330); ctx.lineTo(650, 120); ctx.lineTo(715, 260); ctx.lineTo(760, 340); ctx.lineTo(800, 380); ctx.lineTo(800, 490); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7fbff'; ctx.beginPath(); ctx.moveTo(650, 120); ctx.lineTo(628, 190); ctx.lineTo(646, 180); ctx.lineTo(660, 200); ctx.lineTo(676, 184); ctx.lineTo(694, 205); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(590, 330); ctx.lineTo(650, 120); ctx.stroke();
    // 고도 눈금
    ctx.font = D.font(12.5, 800); ctx.textAlign = 'right';
    [0, 2000, 4000, 6000, 8000].forEach((m) => {
      const y = 470 - (m / 8000) * 350;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(772, y); ctx.lineTo(782, y); ctx.stroke();
      D.text(768, y + 4, (m / 1000) + ' km', { size: 12.5, weight: 800, color: '#fff', align: 'right', stroke: 'rgba(30,50,80,.6)', strokeWidth: 3 });
    });
    // 현재 위치 깃발
    const mp = mtnPos(b.altS);
    D.dashedLine(mp.x, mp.y, 724, mp.y, { color: '#fff', width: 2, dash: [5, 5], offset: S.t * 12 });
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mp.x, mp.y); ctx.lineTo(mp.x, mp.y - 30); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(mp.x, mp.y - 30); ctx.lineTo(mp.x + 22, mp.y - 23 + Math.sin(S.t * 4) * 1.5); ctx.lineTo(mp.x, mp.y - 16); ctx.closePath(); ctx.fill();
    D.sphere(mp.x, mp.y, 7, '#fbbf24', { shadow: true });
    pill(mp.x + 62, mp.y - 34 < 30 ? 30 : mp.y - 34, '해발 ' + fmt(Math.round(b.altS / 10) * 10) + ' m', { bg: 'rgba(30,41,59,.9)', color: '#fff', border: null });

    // 눈금자 (cm)
    const yOf = (cm) => TB.surf - cm * TB.pxcm;
    ctx.save();
    D.roundRect(128, yOf(100) - 8, 26, TB.surf - yOf(100) + 22, 6); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let cm = 0; cm <= 100; cm += 10) {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = cm % 50 === 0 ? 2 : 1.4;
      ctx.beginPath(); ctx.moveTo(154, yOf(cm)); ctx.lineTo(154 - (cm % 50 === 0 ? 14 : 9), yOf(cm)); ctx.stroke();
      D.text(124, yOf(cm) + 4.5, String(cm), { size: 12.5, weight: 700, color: '#334155', align: 'right', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    }
    D.text(141, yOf(100) - 15, 'cm', { size: 13, weight: 800, color: '#334155' });
    ctx.restore();
    // 76 cm 표시선
    D.dashedLine(158, yOf(76), 300, yOf(76), { color: 'rgba(245,158,11,.85)', width: 2, dash: [4, 6] });
    pill(76, yOf(76), '1기압 = 76 cm', { bg: '#f59e0b', color: '#fff', border: null, size: 13 });

    // 접시와 수은
    const dishX = 190, dishW = 160;
    D.roundRect(dishX, 446, dishW, 42, 10); ctx.fillStyle = 'rgba(210,225,240,.55)'; ctx.fill();
    const hg = ctx.createLinearGradient(0, TB.surf, 0, 486); hg.addColorStop(0, '#e3e9f0'); hg.addColorStop(0.3, '#aeb9c7'); hg.addColorStop(1, '#6f7c8d');
    ctx.save(); D.roundRect(dishX + 3, TB.surf, dishW - 6, 33, 8); ctx.clip(); ctx.fillStyle = hg; ctx.fillRect(dishX, TB.surf, dishW, 40);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(dishX + 8, TB.surf + 1, dishW - 16, 3); ctx.restore();

    // 유리관 (기울기 반영)
    const th = b.tiltS * Math.PI / 180, cs = Math.cos(th);
    const h = b.h.value;
    const sPx = Math.min(h / Math.max(0.3, cs), TB.L) * TB.pxcm;
    ctx.save(); ctx.translate(TB.px, TB.surf + 4); ctx.rotate(th);
    const Lp = TB.L * TB.pxcm;
    D.roundRect(-12, -Lp, 24, Lp + 18, 11); ctx.fillStyle = 'rgba(225,240,252,.55)'; ctx.fill();
    const mg = ctx.createLinearGradient(-8, 0, 8, 0); mg.addColorStop(0, '#8793a3'); mg.addColorStop(0.35, '#f1f4f8'); mg.addColorStop(0.7, '#aab5c3'); mg.addColorStop(1, '#6f7c8d');
    ctx.fillStyle = mg; ctx.fillRect(-8, -sPx, 16, sPx + 14);
    ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(0, -sPx, 8, 3.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7f95b2'; ctx.lineWidth = 3; D.roundRect(-12, -Lp, 24, Lp + 18, 11); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -Lp + 14); ctx.lineTo(-9, -sPx - 8); ctx.stroke();
    ctx.restore();
    // 접시 앞 유리
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(dishX, 446, dishW, 42, 10); ctx.stroke();

    // 수은 기둥 꼭대기의 수직 높이
    const topY = TB.surf - h * TB.pxcm;
    D.dashedLine(158, topY, TB.px + Math.tan(th) * (TB.surf - topY) - 14, topY, { color: '#ef4444', width: 2.2, dash: [6, 5], offset: S.t * 10 });
    D.arrow(176, TB.surf - 2, 176, topY + 3, { color: '#ef4444', width: 3.5, head: 12 });
    pill(164, topY - 16, '수직 높이 ' + h.toFixed(1) + ' cm', { bg: 'rgba(239,68,68,.95)', color: '#fff', border: null, align: 'left' });
    // 진공
    const vacMid = (Lp - sPx) / 2 + sPx;
    if (Lp - sPx > 34) {
      const vx = TB.px + Math.sin(th) * vacMid / TB.pxcm * TB.pxcm, vy = TB.surf + 4 - Math.cos(th) * vacMid;
      pill(vx + 66, vy, '진공 (텅 빈 곳)', { bg: 'rgba(255,255,255,.92)', color: '#475569', border: '#cbd5e1' });
    }
    // 대기압 화살표
    const dens = pressAt(b.altS) / 1013.25, len = 20 + 40 * dens, pu = RM ? 0 : Math.sin(S.t * 5) * 3;
    [205, 238, 336].forEach((x) => D.arrow(x, 440 - len + pu, x, 446 + pu * 0.3, { color: '#2563eb', width: 5, head: 14 }));
    pill(215, 440 - len - 24, '대기압', { bg: 'rgba(37,99,235,.92)', color: '#fff', border: null });
    // 가상 안내
    pill(400, 520, '⚠️ 수은은 독성이 있어요. 실제 실험은 선생님과 함께, 여기서는 가상으로!', { bg: 'rgba(30,41,59,.88)', color: '#fff', border: null, size: 13 });
  }

  /* =========================================================
     장면 3: 수조 모형 (모래·물·전등·향 연기)
     ========================================================= */
  const TK = { x0: 85, x1: 715, y0: 192, y1: 368, surf: 370 };
  const TKW = TK.x1 - TK.x0, TKH = TK.y1 - TK.y0;
  const SIG = 0.21;
  function tkField(x, y, flow) {
    const X = (x - TK.x0) / TKW, Y = clamp((y - TK.y0) / TKH, 0, 1);
    const g = Math.exp(-0.5 * Math.pow((X - 0.5) / SIG, 2));
    const gp = -(X - 0.5) / (SIG * SIG) * g;
    const U = 112 * flow, psi0 = U * TKH / Math.PI;
    return { u: psi0 * g * Math.PI / TKH * Math.cos(Math.PI * Y), v: -psi0 * gp / TKW * Math.sin(Math.PI * Y) };
  }
  function tkReset() {
    const k = S.tk; k.Ts = 25; k.Tw = 25; k.flow = 0; k.cross = 0; k.parts.length = 0;
  }
  const SMOKE_X = 540, SMOKE_Y = 330;
  function tkStep(dt) {
    const k = S.tk;
    const tS = k.lamp ? 47 : 25, tW = k.lamp ? 30 : 25;
    k.Ts = approach(k.Ts, tS, dt, k.lamp ? 0.17 : 0.1);
    k.Tw = approach(k.Tw, tW, dt, k.lamp ? 0.035 : 0.05);
    const dT = k.Ts - k.Tw;
    k.flow = approach(k.flow, clamp((dT - 0.8) / 12, 0, 1), dt, 1.1);
    k.lampA = approach(k.lampA, k.lamp ? 1 : 0, dt, 5);
    k.smokeA = approach(k.smokeA, k.smoke ? 1 : 0, dt, 5);
    if (k.smoke) {
      k.emit += dt * 15;
      while (k.emit >= 1) {
        k.emit -= 1;
        if (k.parts.length < 170) k.parts.push({ x: SMOKE_X + (Math.random() - 0.5) * 6, y: SMOKE_Y - 6, age: 0, life: 12 + Math.random() * 5, s: 5 + Math.random() * 3, ph: Math.random() * 6, last: SMOKE_X });
      }
    }
    for (let i = k.parts.length - 1; i >= 0; i--) {
      const p = k.parts[i];
      p.age += dt;
      if (p.age > p.life) { k.parts.splice(i, 1); continue; }
      const f = tkField(p.x, p.y, k.flow);
      const rise = (1 - k.flow) * 14 + 6;
      const nx = Math.sin(S.t * 1.3 + p.ph) * 5, ny = Math.cos(S.t * 1.1 + p.ph * 1.7) * 3;
      p.x += (f.u + nx) * dt * (1 - 0.0); p.y += (f.v - rise * (k.flow < 0.15 ? 1 : 0.25) + ny) * dt;
      if (p.y < TK.y0 + 4) { p.y = TK.y0 + 4; }
      if (p.y > TK.y1 - 3) p.y = TK.y1 - 3;
      p.x = clamp(p.x, TK.x0 + 4, TK.x1 - 4);
      p.s += dt * 1.4;
      // 지표 가까이에서 물 쪽 → 모래 쪽으로 건너간 연기 세기
      if (p.last > 400 && p.x <= 400 && p.y > TK.y0 + TKH * 0.55 && k.flow > 0.25) k.cross++;
      p.last = p.x;
    }
  }
  function drawTank() {
    const k = S.tk;
    labTable();
    // 전등
    const lampX = 225;
    ctx.save();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(60, 160); ctx.lineTo(60, 40); ctx.lineTo(lampX - 10, 40); ctx.lineTo(lampX, 74); ctx.stroke();
    ctx.restore();
    if (k.lampA > 0.02) {
      const cg = ctx.createLinearGradient(0, 100, 0, TK.surf);
      cg.addColorStop(0, 'rgba(255,224,120,' + 0.55 * k.lampA + ')'); cg.addColorStop(1, 'rgba(255,200,80,' + 0.12 * k.lampA + ')');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(lampX - 34, 104); ctx.lineTo(lampX + 34, 104); ctx.lineTo(lampX + 150, TK.surf); ctx.lineTo(lampX - 150, TK.surf); ctx.closePath(); ctx.fill();
      D.glow(lampX, 108, 70, '#ffd45e', 0.8 * k.lampA);
    }
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(lampX - 22, 76); ctx.lineTo(lampX + 22, 76); ctx.lineTo(lampX + 40, 106); ctx.lineTo(lampX - 40, 106); ctx.closePath(); ctx.fillStyle = '#475569'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = mixc('#cbd5e1', '#fff3b0', k.lampA); ctx.beginPath(); ctx.ellipse(lampX, 106, 30, 7, 0, 0, TAU); ctx.fill();

    // 수조 (유리)
    D.roundRect(TK.x0 - 16, 168, TKW + 32, 286, 18); ctx.fillStyle = 'rgba(214,234,250,.5)'; ctx.fill();
    // 모래 쟁반 / 물 쟁반
    const heatS = clamp((k.Ts - 25) / 22, 0, 1);
    D.roundRect(100, 372, 296, 70, 8);
    const sg = ctx.createLinearGradient(0, 372, 0, 442); sg.addColorStop(0, mixc('#ecd09a', '#f0a050', heatS)); sg.addColorStop(1, mixc('#c9a15f', '#d07a3a', heatS));
    ctx.fillStyle = sg; ctx.fill();
    const r2 = rnd(31);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(120,80,30,' + (0.1 + r2() * 0.18) + ')'; ctx.fillRect(104 + r2() * 288, 376 + r2() * 62, 2, 2); }
    D.roundRect(404, 372, 300, 70, 8);
    const wg = ctx.createLinearGradient(0, 372, 0, 442); wg.addColorStop(0, 'rgba(110,190,245,.75)'); wg.addColorStop(1, 'rgba(50,130,215,.9)');
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const yy = 385 + i * 17; ctx.beginPath(); for (let x = 412; x <= 696; x += 6) { const y = yy + Math.sin(x * 0.05 + S.t * 1.6 + i) * 1.8; x === 412 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    // 쟁반 테두리
    ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 4; D.roundRect(100, 372, 296, 70, 8); ctx.stroke(); D.roundRect(404, 372, 300, 70, 8); ctx.stroke();
    // 아지랑이
    if (heatS > 0.1) {
      ctx.strokeStyle = 'rgba(255,140,60,' + (0.55 * heatS) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const x0 = 150 + i * 70;
        ctx.beginPath();
        for (let j = 0; j <= 14; j++) { const y = 366 - j * 8 - ((S.t * 24 + i * 25) % 30) * 0; const x = x0 + Math.sin(j * 0.9 + S.t * 3 + i) * 6; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.globalAlpha = 0.5 * heatS; ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    // 온도 표시
    pill(250, 407, '모래 ' + k.Ts.toFixed(0) + ' °C', { bg: 'rgba(255,255,255,.93)', color: mixc('#7c4a12', '#c2410c', heatS), border: '#e5cf9f', size: 14.5 });
    pill(554, 407, '물 ' + k.Tw.toFixed(0) + ' °C', { bg: 'rgba(255,255,255,.93)', color: '#1d4ed8', border: '#bcd8f5', size: 14.5 });

    // 연기
    ctx.save(); ctx.beginPath(); ctx.rect(TK.x0, TK.y0 - 4, TKW, TKH + 8); ctx.clip();
    k.parts.forEach((p) => {
      const a = 0.24 * sstep(0, 0.6, p.age) * (1 - sstep(p.life - 3, p.life, p.age));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      g.addColorStop(0, 'rgba(120,128,142,' + a + ')'); g.addColorStop(1, 'rgba(120,128,142,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill();
    });
    ctx.restore();
    // 향 (연기를 피우는 곳)
    ctx.fillStyle = '#7c5a36'; D.roundRect(SMOKE_X - 14, 358, 28, 12, 4); ctx.fill();
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(SMOKE_X, 360); ctx.lineTo(SMOKE_X, SMOKE_Y); ctx.stroke();
    if (k.smokeA > 0.1) D.glow(SMOKE_X, SMOKE_Y, 12, '#ff7a30', k.smokeA); else { ctx.fillStyle = '#4b3a2a'; ctx.beginPath(); ctx.arc(SMOKE_X, SMOKE_Y, 2.5, 0, TAU); ctx.fill(); }
    // 수조 윤곽(앞 유리)
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; D.roundRect(TK.x0 - 16, 168, TKW + 32, 286, 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(TK.x0 - 4, 188); ctx.lineTo(TK.x0 - 4, 330); ctx.stroke();
    if (!k.smoke) pill(SMOKE_X, 304, '향 (눌러서 연기 피우기)', { bg: 'rgba(255,255,255,.93)', color: '#334155', border: '#cbd5e1' });
    if (!k.lamp) pill(lampX + 98, 78, '전등 (눌러서 켜기)', { bg: 'rgba(255,255,255,.93)', color: '#334155', border: '#cbd5e1' });
    // 기압 표시
    if (has('pmark')) {
      const dT = k.Ts - k.Tw, a = clamp((dT - 0.5) / 6, 0, 1);
      const yL = 482;
      const lowC = mixc('#94a3b8', '#dc2626', a), hiC = mixc('#94a3b8', '#2563eb', a);
      ctx.save();
      ctx.fillStyle = 'rgba(220,38,38,' + 0.06 * a + ')'; ctx.fillRect(TK.x0, TK.y0, 315, TKH);
      ctx.fillStyle = 'rgba(37,99,235,' + 0.07 * a + ')'; ctx.fillRect(TK.x0 + 315, TK.y0, 315, TKH);
      ctx.restore();
      D.sphere(250, yL, 22, a > 0.2 ? '#ef4444' : '#94a3b8', { text: 'L', shadow: true });
      D.sphere(554, yL, 22, a > 0.2 ? '#3b82f6' : '#94a3b8', { text: 'H', shadow: true });
      D.text(250, yL + 40, '모래 위: 저기압', { size: 13.5, weight: 800, color: lowC });
      D.text(554, yL + 40, '물 위: 고기압', { size: 13.5, weight: 800, color: hiC });
      if (k.flow > 0.12) D.arrow(512, yL, 292, yL, { color: '#334155', width: 3 + 7 * k.flow, head: 14 + 6 * k.flow, label: '바람', labelOffset: -20 });
      if (isNew('pmark')) newRing(215, yL - 28, 372, 80);
    }
  }

  /* =========================================================
     장면 4-A: 해륙풍 (하루 시각)
     ========================================================= */
  const SKY = [[0, '#0b1230', '#1a2850'], [5, '#1c2a5a', '#3a3f78'], [6.5, '#6f86c9', '#ffb98a'], [9, '#7fbdf2', '#dff0ff'], [13, '#6fb6f5', '#e6f4ff'],
    [17, '#7aa8e6', '#ffe0b0'], [19, '#5a5694', '#f59a6b'], [21, '#141d44', '#2a3a72'], [24, '#0b1230', '#1a2850']];
  function skyAt(h) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (h >= a[0] && h <= b[0]) { const k = (h - a[0]) / (b[0] - a[0]); return [mixc(a[1], b[1], k), mixc(a[2], b[2], k)]; }
    }
    return [SKY[0][1], SKY[0][2]];
  }
  const brightAt = (h) => sstep(5.5, 8.5, h) * (1 - sstep(17, 20, h));
  const tLand = (h) => 21 + 9 * Math.sin(TAU * (h - 8) / 24);
  const tSea = (h) => 21 + 0.8 * Math.sin(TAU * (h - 11) / 24);
  const isNight = (h) => { const r = Math.round(h) % 24; return r >= 22 || r <= 5; };
  function hourLabel(h) {
    h = Math.round(h) % 24;
    if (h === 0) return '밤 12시';
    if (h < 6) return '새벽 ' + h + '시';
    if (h < 12) return '오전 ' + h + '시';
    if (h === 12) return '낮 12시';
    if (h < 18) return '오후 ' + (h - 12) + '시';
    if (h < 21) return '저녁 ' + (h - 12) + '시';
    return '밤 ' + (h - 12) + '시';
  }
  const windName = (w) => (w > 0.2 ? '해풍 (바다 → 육지)' : w < -0.2 ? '육풍 (육지 → 바다)' : '바람이 거의 없어요');
  const GUESS = { toLand: { x: 210, y: 478, w: 232, label: '바다 → 육지로 불어요', arrow: '➡' }, toSea: { x: 590, y: 478, w: 232, label: '육지 → 바다로 불어요', arrow: '⬅' } };
  function coInit() {
    const r = rnd(555);
    for (let i = 0; i < 30; i++) S.co.parts.push({ x: r() * 800, y: 292 + r() * 36, k: 0.7 + r() * 0.6 });
    for (let i = 0; i < 16; i++) S.co.upper.push({ x: r() * 800, y: 96 + r() * 70, k: 0.7 + r() * 0.6 });
  }
  coInit();
  function coStep(dt) {
    const c = S.co;
    if (c.play) {
      c.hour = (c.hour + dt * 2.2) % 24; c.hourS = c.hour;
      const s = $('#sHour'); const hv = Math.floor(c.hour);
      if (+s.value !== hv) { s.value = hv; hourUI.refresh(); }
    } else c.hourS = approach(c.hourS, c.hour, dt, 8);
    const w = clamp((tLand(c.hourS) - tSea(c.hourS)) / 8, -1, 1);
    c.w = w; c.wS = approach(c.wS, w, dt, 3);
    const m = game && game.current();
    c.guessActive = !!(m && m.guess && game.isActive(m) && isNight(c.hour));
    const vis = c.guessActive ? 0 : 1;
    c.vis = approach(c.vis == null ? 1 : c.vis, vis, dt, 6);
    c.parts.forEach((p) => { p.x += c.wS * 150 * p.k * dt; if (p.x > 820) p.x -= 840; if (p.x < -20) p.x += 840; });
    c.upper.forEach((p) => { p.x -= c.wS * 105 * p.k * dt; if (p.x > 820) p.x -= 840; if (p.x < -20) p.x += 840; });
    c.boat = approach(c.boat == null ? 0 : c.boat, c.wS * c.vis, dt, 1.2);
  }
  function drawCoast() {
    const c = S.co, h = c.hourS, w = c.wS, vis = c.vis == null ? 1 : c.vis;
    const [top, bot] = skyAt(h), bri = brightAt(h);
    D.sky(0, 0, 800, 540, top, bot);
    // 별
    if (bri < 0.9) {
      const r = rnd(99);
      for (let i = 0; i < 60; i++) { const sx = r() * 800, sy = r() * 250, sr = 0.8 + r() * 1.3; ctx.fillStyle = 'rgba(255,255,255,' + ((1 - bri) * (0.5 + 0.5 * Math.sin(S.t * 2 + i))) + ')'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill(); }
    }
    // 해/달
    const sunDay = h >= 5.5 && h <= 18.5;
    const a = sunDay ? Math.PI * (h - 5.5) / 13 : Math.PI * (((h - 18.5 + 24) % 24) / 11);
    const sx = 400 - Math.cos(a) * 345, sy = 330 - Math.sin(a) * 255;
    if (sunDay) { D.glow(sx, sy, 90, '#ffd45e', 0.55); D.sphere(sx, sy, 24, '#ffc933', { gloss: false }); }
    else { D.glow(sx, sy, 60, '#dbe7ff', 0.35); ctx.fillStyle = '#f3f6ff'; ctx.beginPath(); ctx.arc(sx, sy, 20, 0, TAU); ctx.fill(); ctx.fillStyle = mixc(top, bot, 0.3); ctx.beginPath(); ctx.arc(sx + 8, sy - 4, 17, 0, TAU); ctx.fill(); }
    // 먼 산
    ctx.fillStyle = mixc('#6f9a64', '#1d2b3e', 1 - bri * 0.9);
    ctx.beginPath(); ctx.moveTo(470, 330); ctx.lineTo(560, 262); ctx.lineTo(630, 300); ctx.lineTo(710, 236); ctx.lineTo(800, 300); ctx.lineTo(800, 330); ctx.closePath(); ctx.fill();
    // 바다
    const sea = ctx.createLinearGradient(0, 330, 0, 540);
    sea.addColorStop(0, mixc('#3b97e0', '#16305a', 1 - bri * 0.85)); sea.addColorStop(1, mixc('#1e66b4', '#0b1b38', 1 - bri * 0.85));
    ctx.fillStyle = sea; ctx.fillRect(0, 330, 470, 210);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.3 * bri) + ')'; ctx.lineWidth = 2;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      for (let x = 0; x <= 440; x += 6) { const y = 346 + j * 22 + Math.sin(x * 0.04 + S.t * (1.4 + c.wS * 1.5) * 1 + j * 1.7) * (2 + 2 * Math.abs(c.wS)); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // 땅
    ctx.fillStyle = mixc('#e3cf9f', '#4a4a52', 1 - bri * 0.85);
    ctx.beginPath(); ctx.moveTo(420, 330); ctx.lineTo(470, 330); ctx.lineTo(520, 540); ctx.lineTo(446, 540); ctx.closePath(); ctx.fill();
    const lg = ctx.createLinearGradient(0, 330, 0, 540);
    lg.addColorStop(0, mixc('#7ec36a', '#1f3a2b', 1 - bri * 0.85)); lg.addColorStop(0.1, mixc('#6cb35a', '#1a3326', 1 - bri * 0.85)); lg.addColorStop(0.11, mixc('#c9a776', '#35302a', 1 - bri * 0.8)); lg.addColorStop(1, mixc('#a8865a', '#262320', 1 - bri * 0.8));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(470, 330); ctx.lineTo(800, 330); ctx.lineTo(800, 540); ctx.lineTo(520, 540); ctx.closePath(); ctx.fill();
    // 마을 (집)
    [[540, '#e9a36b'], [606, '#8fb8e8'], [672, '#e6c85a'], [736, '#e98f8f']].forEach(([hx, col], i) => {
      const hy = 330, wd = 40, ht = 30 + (i % 2) * 6;
      D.shadow(() => { ctx.fillStyle = mixc(col, '#1b2230', (1 - bri) * 0.55); ctx.fillRect(hx - wd / 2, hy - ht, wd, ht); }, { blur: 5, y: 2 });
      ctx.fillStyle = mixc('#b5483c', '#2a1a1e', (1 - bri) * 0.55); ctx.beginPath(); ctx.moveTo(hx - wd / 2 - 5, hy - ht); ctx.lineTo(hx, hy - ht - 20); ctx.lineTo(hx + wd / 2 + 5, hy - ht); ctx.closePath(); ctx.fill();
      ctx.fillStyle = bri < 0.45 ? '#ffe27a' : 'rgba(255,255,255,.8)'; ctx.fillRect(hx - 6, hy - ht + 8, 12, 11);
      if (bri < 0.45) D.glow(hx, hy - ht + 13, 22, '#ffd45e', 0.5);
    });
    // 깃발
    const fx0 = 474, fy0 = 330;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.lineTo(fx0, fy0 - 62); ctx.stroke();
    {
      const wv = w * vis, dir = wv >= 0 ? 1 : -1, len = 10 + 34 * Math.abs(wv);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(fx0, fy0 - 62);
      for (let i = 0; i <= 6; i++) ctx.lineTo(fx0 + dir * len * i / 6, fy0 - 62 + Math.sin(i * 1.1 - S.t * 9) * 2.5 * Math.abs(wv) + i * (1 - Math.abs(wv)) * 3);
      for (let i = 6; i >= 0; i--) ctx.lineTo(fx0 + dir * len * i / 6, fy0 - 62 + 16 + Math.sin(i * 1.1 - S.t * 9) * 2.5 * Math.abs(wv) + i * (1 - Math.abs(wv)) * 3);
      ctx.closePath(); ctx.fill();
    }
    // 돛단배
    {
      const bx = 220 + c.boat * 70, by = 340 + Math.sin(S.t * 1.8) * 2.5;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(S.t * 1.6) * 0.04);
      ctx.fillStyle = '#7c4a2a'; ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(30, -8); ctx.lineTo(20, 8); ctx.lineTo(-20, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -52); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(2, -50); ctx.quadraticCurveTo(2 + 22 + c.boat * 8, -34, 2 + c.boat * 14, -12); ctx.lineTo(2, -12); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 바람 줄기 (낮은 곳 · 높은 곳)
    const streak = (arr, hi) => {
      const dk = bri > 0.45;
      ctx.lineCap = 'round';
      arr.forEach((p) => {
        const sp = (hi ? -w : w), len = 8 + Math.abs(sp) * 30 * p.k;
        if (Math.abs(sp) < 0.04) return;
        const dir = sp >= 0 ? 1 : -1;
        const al = clamp(Math.abs(sp) * 1.4, 0, 0.75) * vis * (hi ? 0.65 : 1);
        ctx.strokeStyle = dk ? 'rgba(255,255,255,' + al + ')' : 'rgba(210,225,255,' + al + ')'; ctx.lineWidth = hi ? 2.2 : 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dir * len, p.y); ctx.stroke();
      });
    };
    streak(c.parts, false); streak(c.upper, true);
    // 상승/하강 기류 화살표
    const aw = Math.abs(w) * vis;
    if (aw > 0.12) {
      const warmX = w > 0 ? 620 : 190, coolX = w > 0 ? 190 : 620;
      D.arrow(warmX, 262, warmX, 176, { color: '#f97316', width: 4 + 4 * aw, head: 15, alpha: Math.min(1, aw * 1.4) });
      D.arrow(coolX, 172, coolX, 258, { color: '#0ea5e9', width: 4 + 4 * aw, head: 15, alpha: Math.min(1, aw * 1.4) });
      pill(warmX + 58, 218, '공기 상승', { bg: 'rgba(249,115,22,' + Math.min(0.95, aw * 1.6) + ')', color: '#fff', border: null });
      pill(coolX + 58, 214, '공기 하강', { bg: 'rgba(14,165,233,' + Math.min(0.95, aw * 1.6) + ')', color: '#fff', border: null });
      D.arrow(w > 0 ? 330 : 560, 304, w > 0 ? 560 : 330, 304, { color: '#ffffff', width: 5 + 8 * aw, head: 20, alpha: Math.min(0.9, aw * 1.3) });
    }
    // 고기압·저기압 표시
    {
      const showHL = vis > 0.5 && aw > 0.12;
      if (showHL) {
        const landL = w > 0;
        const al = Math.min(1, (aw - 0.12) * 4) * vis;
        ctx.save(); ctx.globalAlpha = al;
        D.sphere(620, 66, 21, landL ? '#ef4444' : '#3b82f6', { text: landL ? 'L' : 'H', shadow: true });
        D.sphere(190, 66, 21, landL ? '#3b82f6' : '#ef4444', { text: landL ? 'H' : 'L', shadow: true });
        D.text(620, 108, landL ? '땅 위: 저기압' : '땅 위: 고기압', { size: 13.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.7)', strokeWidth: 4 });
        D.text(190, 108, landL ? '바다 위: 고기압' : '바다 위: 저기압', { size: 13.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.7)', strokeWidth: 4 });
        ctx.restore();
      }
    }
    // 온도계
    const tl = tLand(h), ts = tSea(h);
    D.thermometer(748, 22, 92, tl, 0, 40, { ticks: false, color: '#ef4444' });
    D.thermometer(52, 22, 92, ts, 0, 40, { ticks: false, color: '#3b82f6' });
    pill(748, 168, '땅 ' + tl.toFixed(0) + ' °C', { bg: 'rgba(255,255,255,.94)', color: '#b91c1c', border: '#fecaca' });
    pill(52, 168, '바다 ' + ts.toFixed(0) + ' °C', { bg: 'rgba(255,255,255,.94)', color: '#1d4ed8', border: '#bfdbfe' });
    // 시각 표시
    pill(400, 34, hourLabel(h), { bg: 'rgba(15,23,42,.72)', color: '#fff', border: null, size: 16, pad: 14 });
    // 맞히기 카드
    if (c.guessActive) {
      pill(400, 400, '🌙 밤이에요! 바람은 어느 쪽으로 불까요? 눌러서 골라요', { bg: 'rgba(255,255,255,.96)', color: '#1b2333', border: '#94a3b8', size: 14.5, pad: 12 });
      [GUESS.toLand, GUESS.toSea].forEach((g) => {
        const on = c.guess === (g === GUESS.toLand ? 'toLand' : 'toSea');
        D.shadow(() => { D.roundRect(g.x - g.w / 2, g.y - 24, g.w, 48, 24); ctx.fillStyle = on ? '#e0f2fe' : 'rgba(255,255,255,.96)'; ctx.fill(); }, { blur: 10, y: 3 });
        ctx.strokeStyle = on ? '#0284c7' : '#94a3b8'; ctx.lineWidth = on ? 4 : 2; D.roundRect(g.x - g.w / 2, g.y - 24, g.w, 48, 24); ctx.stroke();
        D.text(g.x, g.y + 5.5, (g === GUESS.toLand ? '' : '') + g.label, { size: 15.5, weight: 800, color: on ? '#075985' : '#334155' });
      });
    } else if (aw > 0.2) {
      pill(400, 380, windName(w), { bg: 'rgba(15,23,42,.78)', color: '#fff', border: null, size: 15, pad: 14 });
    }
  }

  /* =========================================================
     장면 4-B: 계절풍 지도 (단순화한 동아시아)
     ========================================================= */
  const CONT = [[0, 0], [560, 0], [586, 44], [566, 96], [590, 138], [556, 184], [540, 214], [552, 250], [566, 290], [556, 322], [538, 338], [524, 318], [516, 296], [506, 262], [500, 252], [478, 236], [452, 246], [446, 272], [468, 296], [486, 306], [462, 316], [440, 336], [426, 380], [400, 430], [352, 490], [310, 540], [0, 540]];
  const KOREA = [[540, 214], [552, 250], [566, 290], [556, 322], [538, 338], [524, 318], [516, 296], [506, 262], [518, 232]];
  const ISLES = [
    [[612, 236], [640, 230], [666, 258], [694, 298], [716, 330], [694, 344], [664, 320], [634, 292], [614, 262]],
    [[648, 166], [676, 174], [686, 200], [662, 206], [648, 190]],
    [[640, 352], [660, 348], [666, 366], [646, 372]],
    [[596, 100], [606, 106], [612, 168], [598, 172], [592, 130]],
  ];
  const poly = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  function moInit() {
    const r = rnd(808);
    for (let i = 0; i < 70; i++) S.mo.parts.push({ x: r() * 800, y: r() * 540, k: 0.7 + r() * 0.6, ph: r() * 6 });
  }
  moInit();
  const moName = (s) => (s > 0.35 ? '남동 계절풍' : s < -0.35 ? '북서 계절풍' : '바람이 바뀌는 중');
  function moStep(dt) {
    const m = S.mo;
    m.sS = approach(m.sS, m.sum ? 1 : -1, dt, 2.2);
    const v = 150 * m.sS * 0.7071;
    m.parts.forEach((p) => {
      p.x -= v * p.k * dt; p.y -= v * p.k * dt + Math.sin(S.t * 1.1 + p.ph) * dt * 6;
      if (p.x < -20) p.x += 840; if (p.x > 820) p.x -= 840; if (p.y < -20) p.y += 580; if (p.y > 560) p.y -= 580;
    });
    if (S.scene === 'monsoon') { if (m.sum && m.sS > 0.9) m.seenSum += dt; if (!m.sum && m.sS < -0.9) m.seenWin += dt; }
  }
  const MZ = 1.3, MOX = 520, MOY = 290;
  const mp = (x, y) => [MOX + (x - MOX) * MZ, MOY + (y - MOY) * MZ];
  function drawMonsoon() {
    const m = S.mo, s = m.sS, ms = (s + 1) / 2;
    const og = ctx.createLinearGradient(0, 0, 800, 540);
    og.addColorStop(0, mixc('#4b86b9', '#5aa9e6', ms)); og.addColorStop(1, mixc('#27598a', '#2f7fc6', ms));
    ctx.fillStyle = og; ctx.fillRect(0, 0, 800, 540);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
    for (let j = 0; j < 7; j++) { ctx.beginPath(); for (let x = 470; x <= 800; x += 8) { const y = 120 + j * 62 + Math.sin(x * 0.03 + S.t * 0.8 + j) * 3; x === 470 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    // 땅 (지도 확대)
    ctx.save(); ctx.translate(MOX, MOY); ctx.scale(MZ, MZ); ctx.translate(-MOX, -MOY);
    const landCol = mixc('#e4ebf2', '#8cc56f', ms), isleCol = mixc('#dde6ee', '#7fb865', ms);
    ctx.save(); ctx.translate(0, 6); poly(CONT); ctx.fillStyle = 'rgba(5,20,50,.28)'; ctx.fill(); ctx.restore();
    poly(CONT); ctx.fillStyle = landCol; ctx.fill();
    ISLES.forEach((p) => { poly(p); ctx.fillStyle = isleCol; ctx.fill(); ctx.strokeStyle = 'rgba(40,70,40,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.save(); poly(CONT); ctx.clip();
    const tg = ctx.createRadialGradient(150, 200, 20, 150, 200, 380);
    tg.addColorStop(0, 'rgba(255,100,30,' + (0.34 * ms) + ')'); tg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = tg; ctx.fillRect(-200, -200, 1000, 900);
    const cg = ctx.createRadialGradient(150, 200, 20, 150, 200, 380);
    cg.addColorStop(0, 'rgba(60,110,255,' + (0.34 * (1 - ms)) + ')'); cg.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = cg; ctx.fillRect(-200, -200, 1000, 900);
    ctx.fillStyle = 'rgba(120,100,70,.16)'; ctx.beginPath(); ctx.ellipse(110, 400, 90, 55, -0.2, 0, TAU); ctx.fill();
    ctx.restore();
    poly(CONT); ctx.strokeStyle = 'rgba(30,60,40,.5)'; ctx.lineWidth = 2 / MZ; ctx.stroke();
    poly(KOREA); ctx.fillStyle = mixc('#f8fafc', '#5fa347', ms); ctx.fill(); ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2 / MZ; ctx.stroke();
    ctx.restore();
    D.text(150, 70, '대륙 (유라시아)', { size: 17, weight: 800, color: 'rgba(255,255,255,.95)', stroke: 'rgba(30,50,70,.55)', strokeWidth: 4 });
    D.text(700, 500, '태평양', { size: 17, weight: 800, color: 'rgba(255,255,255,.95)', stroke: 'rgba(20,50,90,.55)', strokeWidth: 4 });
    { const q = mp(594, 262); D.text(q[0], q[1], '동해', { size: 13, weight: 800, color: 'rgba(255,255,255,.9)', stroke: 'rgba(20,50,90,.5)', strokeWidth: 3 }); }
    { const q = mp(466, 392); D.text(q[0], q[1], '황해', { size: 13, weight: 800, color: 'rgba(255,255,255,.9)', stroke: 'rgba(20,50,90,.5)', strokeWidth: 3 }); }
    // 바람 줄기
    const dk = 0.7071, spd = Math.abs(s);
    if (spd > 0.05) {
      ctx.lineCap = 'round';
      m.parts.forEach((p) => {
        const sg = s >= 0 ? 1 : -1, len = (10 + 20 * spd) * p.k;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.62 * Math.sqrt(spd)) + ')'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sg * dk * len, p.y + sg * dk * len); ctx.stroke();
      });
    }
    // 고기압 · 저기압
    const hl = (x, y, txt, col, al, cap) => {
      if (al < 0.03) return;
      ctx.save(); ctx.globalAlpha = al;
      D.sphere(x, y, 28, col, { text: txt, shadow: true });
      D.text(x, y + 52, cap, { size: 14, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.72)', strokeWidth: 4.5 });
      ctx.restore();
    };
    hl(200, 210, 'L', '#ef4444', ms, '대륙: 뜨거워져 저기압');
    hl(200, 210, 'H', '#3b82f6', 1 - ms, '대륙: 차가워져 고기압');
    hl(660, 440, 'H', '#3b82f6', ms, '바다: 상대적으로 시원해 고기압');
    hl(660, 440, 'L', '#ef4444', 1 - ms, '바다: 상대적으로 따뜻해 저기압');
    // 우리나라 표시와 바람 화살표
    const [kx, ky] = mp(536, 284);
    const vlen = 105 * s * 0.7071;
    if (spd > 0.12) D.arrow(kx + vlen, ky + vlen, kx - vlen, ky - vlen, { color: mixc('#2563eb', '#ea580c', ms), width: 6 + 5 * spd, head: 22, alpha: Math.min(1, spd * 1.5) });
    D.sphere(kx, ky, 7, '#fbbf24', { shadow: true });
    D.dashedLine(kx - 8, ky + 8, 436, 392, { color: '#fff', width: 2, dash: [4, 4] });
    pill(414, 396, '우리나라', { bg: '#1b2333', color: '#fff', border: null, size: 14 });
    pill(400, 34, moName(s), { bg: s > 0 ? 'rgba(234,88,12,.94)' : 'rgba(37,99,235,.94)', color: '#fff', border: null, size: 17, pad: 16 });
    pill(80, 520, '단순화한 지도', { bg: 'rgba(15,23,42,.55)', color: '#fff', border: null, size: 12.5 });
  }

  /* =========================================================
     장면 전환 · 그리기 · 갱신
     ========================================================= */
  const DRAW = { cup: drawCup, bottle: drawBottle, tube: drawTube, tank: drawTank, coast: drawCoast, monsoon: drawMonsoon };
  const snap = document.createElement('canvas');
  function setScene(id) {
    if (id === S.scene) return;
    try {
      snap.width = view.canvas.width; snap.height = view.canvas.height;
      snap.getContext('2d').drawImage(view.canvas, 0, 0);
      S.hasSnap = true;
    } catch (e) { S.hasSnap = false; }
    S.prev = S.scene; S.scene = id; S.tr = 0;
    SciSim.tween(S, { tr: 1 }, { duration: 0.45, ease: 'outCubic' });
    afterScene();
  }
  const PANEL = { cup: 'cCup', bottle: 'cBottle', tube: 'cTube', tank: 'cTank', coast: 'cCoast', monsoon: 'cMonsoon' };
  const HINT = {
    cup: '🔄 슬라이더로 컵을 뒤집고, 🖐️ 손을 떼 보세요',
    bottle: '버튼을 차례로 눌러 페트병 실험을 해 보세요',
    tube: '⛰️ 높이를 바꾸거나 오른쪽 산을 끌어 보세요',
    tank: '💡 전등과 🌫️ 향을 눌러 보세요',
    coast: '🕒 시각 슬라이더를 움직여 보세요',
    monsoon: '☀️ 여름 / ❄️ 겨울을 눌러 비교해 보세요',
  };
  function afterScene() {
    Object.keys(PANEL).forEach((k) => $('#' + PANEL[k]).classList.toggle('is-off', k !== S.scene));
    $('#tgLens').classList.toggle('is-off', !(S.scene === 'cup' || S.scene === 'bottle'));
    if (S.scene === 'cup' || S.scene === 'bottle') initLens(S.scene);
    showHint(HINT[S.scene], 6000);
    renderSeg();
  }
  let segKey = '';
  function renderSeg() {
    const lvl = game ? (game.free ? -1 : game.level) : 0;
    const list = SCENES.filter((s) => lvl < 0 || s.step === lvl);
    const key = lvl + '|' + S.scene;
    if (key === segKey) return;
    segKey = key;
    const box = $('#sceneSeg'); box.innerHTML = '';
    list.forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.label;
      if (s.id === S.scene) b.className = 'on';
      b.addEventListener('click', () => { Sound.click(); setScene(s.id); });
      box.appendChild(b);
    });
  }

  const marks = [];
  function addMark(x, y) { marks.push({ x, y, t: 0 }); fx.burst(x, y, { count: 22, speed: 190 }); Sound.tick(); }

  let bgT = 0;
  function wrapBG() {
    let top = '#eef6fc', bot = '#d6bf96';
    if (S.scene === 'tube') { top = mixc('#bfe3ff', '#3a6fc4', clamp(S.tb.altS / 8000, 0, 1) * 0.85); bot = '#a8865a'; }
    else if (S.scene === 'coast') { const bri = brightAt(S.co.hourS); top = skyAt(S.co.hourS)[0]; bot = mixc('#1e66b4', '#0b1b38', 1 - bri * 0.85); }
    else if (S.scene === 'monsoon') { const ms = (S.mo.sS + 1) / 2; top = mixc('#4b86b9', '#5aa9e6', ms); bot = mixc('#27598a', '#2f7fc6', ms); }
    view.wrap.style.setProperty('--stage-bg', 'linear-gradient(to bottom,' + top + ' 0%,' + top + ' 50%,' + bot + ' 50%,' + bot + ' 100%)');
  }
  function draw() {
    if (S.t - bgT > 0.15) { bgT = S.t; wrapBG(); }
    view.clear('#eaf4fb');
    DRAW[S.scene]();
    if (S.tr < 1 && S.hasSnap) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - S.tr;
      ctx.drawImage(snap, 0, 0, view.canvas.width, view.canvas.height); ctx.restore();
    }
    if (S.scene !== 'bottle') fx.draw(ctx);
    marks.forEach((mk) => { const p = Math.min(1, mk.t / 0.4); const sc = SciSim.ease.outBack(Math.min(1, mk.t / 0.35)); ctx.save(); ctx.globalAlpha = 1 - sstep(1.2, 1.8, mk.t); D.check(mk.x, mk.y - 6, 22 * sc, p); ctx.restore(); });
  }

  /* ---------- 컵 / 병 갱신 ---------- */
  function cupStep(dt) {
    const c = S.cup;
    c.angS = approach(c.angS, c.ang, dt, 9);
    c.hand = approach(c.hand, c.held ? 0 : 1, dt, 6);
    c.quiver *= Math.exp(-3.5 * dt);
    if (!c.held && c.angS >= 170) { c.invT += dt; if (c.invT >= 0.8 && !c.inv) { c.inv = true; const th = c.angS * Math.PI / 180; addMark(250 + Math.sin(th) * 81, 258 - Math.cos(th) * 81 + 38); } } else if (!c.inv) c.invT = 0;
    if (c.inv && !c.held && c.angS <= 110 && !c.tilt) { c.tilt = true; Sound.tick(); }
  }
  function btStep(dt) {
    const b = S.bt;
    const target = b.stage === 0 ? 25 : b.stage <= 2 ? 68 : 5;
    b.T = approach(b.T, target, dt, b.stage >= 3 ? 0.7 : 1.6);
    const pin = b.stage >= 2 ? (b.T + 273) / (b.Tseal + 273) : 1;
    b.c.target = b.stage >= 3 ? clamp((1 - pin) / 0.17, 0, 1) : 0;
    b.c.update(dt);
    if (b.stage >= 3 && b.c.value > 0.3 && !b.creak) { b.creak = true; Sound.tick(); }
    if (b.stage >= 3 && !b.done && b.c.value > 0.96) { b.done = true; addMark(232, 300); updateBtBtn(); }
    if (b.stage === 3 && !b.done && !RM) {
      for (let i = 0; i < 2; i++) fx.emit({ x: 150 + Math.random() * 170, y: 190 + Math.random() * 20, vx: 0, vy: 160, life: 0.9, size: 3 + Math.random() * 1.5, color: Math.random() < 0.5 ? '#7cc4ff' : '#dff1ff', gravity: 520, drag: 0.2, fade: true });
    }
  }
  function updateBtBtn() {
    const b = S.bt, btn = $('#btBtn'), note = $('#btNote');
    const L = [['♨️ 뜨거운 물 붓기', '병 속 공기를 데워요.'], ['🧢 물 버리고 뚜껑 닫기', '뜨거운 물은 따라 버리고 뚜껑을 꽉 닫아요.'], ['🧊 찬물로 식히기', '이제 병 속 공기를 식혀요.'], ['🧊 식히는 중…', '병 속 공기가 식고 있어요.'], ['↺ 다시 해 보기', '병이 찌그러졌어요! 돋보기로 입자도 살펴보세요.']];
    const i = b.stage === 3 ? (b.done ? 4 : 3) : b.stage;
    btn.textContent = L[i][0]; note.textContent = L[i][1];
    btn.disabled = i === 3;
    btn.classList.toggle('btn-primary', i !== 4);
  }
  function btAction() {
    const b = S.bt;
    Sound.click();
    if (b.stage === 0) {
      b.stage = 1; b.pour = 0;
      SciSim.tween(b, { pour: 1 }, { duration: 1.8, ease: 'inOutSine' });
      SciSim.tween(b, { water: 0.16 }, { duration: 1.0, delay: 0.5, ease: 'outCubic' });
    } else if (b.stage === 1) {
      b.stage = 2; b.Tseal = Math.max(b.T, 55);
      SciSim.tween(b, { water: 0 }, { duration: 0.5, ease: 'outCubic' });
      SciSim.tween(b, { capT: 1 }, { duration: 0.6, delay: 0.25, ease: 'outBack' });
    } else if (b.stage === 2) {
      b.stage = 3;
    } else if (b.done) {
      btReset();
    }
    updateBtBtn();
  }
  function btReset() {
    const b = S.bt;
    b.stage = 0; b.done = false; b.creak = false; b.pour = 0; b.c.value = 0; b.c.velocity = 0; b.c.target = 0;
    SciSim.tween(b, { capT: 0, water: 0 }, { duration: 0.4 });
    b.T = 25; b.Tseal = 25; fx.clear(); updateBtBtn();
  }

  /* ---------- 장면 공통 갱신 ---------- */
  function step(dt) {
    S.t += dt;
    fx.update(dt);
    marks.forEach((m) => { m.t += dt; }); while (marks.length && marks[0].t > 1.8) marks.shift();
    const lensScene = S.scene === 'cup' || S.scene === 'bottle';
    S.lensA = approach(S.lensA, S.lensOn && lensScene ? 1 : 0, dt, 9);
    if (S.scene === 'cup') { cupStep(dt); lensStep(dt); }
    else if (S.scene === 'bottle') { btStep(dt); lensStep(dt); }
    else if (S.scene === 'tube') tbStep(dt);
    else if (S.scene === 'tank') tkStep(dt);
    else if (S.scene === 'coast') coStep(dt);
    else if (S.scene === 'monsoon') moStep(dt);
    // 이전 장면이 사라지는 동안 멈춰 있어도 되므로 따로 갱신하지 않음
  }

  /* ---------- 측정창 ---------- */
  const roC = {};
  function setRO(i, label, html) {
    if (roC['l' + i] !== label) { roC['l' + i] = label; $('#rl' + i).textContent = label; }
    if (roC['v' + i] !== html) { roC['v' + i] = html; $('#rv' + i).innerHTML = html; }
  }
  let lastUI = 0;
  function readouts(t) {
    if (t - lastUI < 0.1) return; lastUI = t;
    switch (S.scene) {
      case 'cup': {
        const c = S.cup;
        setRO(1, '컵을 돌린 각도', Math.round(c.angS) + '<small>°</small>');
        setRO(2, '종이를 받치는 것', c.held ? '손' : '공기');
        setRO(3, '컵 속에 든 것', '물만 가득');
        break;
      }
      case 'bottle': {
        const b = S.bt, pin = b.stage >= 2 ? (b.T + 273) / (b.Tseal + 273) : 1;
        setRO(1, '병 속 공기 온도', Math.round(b.T) + '<small>°C</small>');
        setRO(2, '안쪽 공기가 미는 힘', pin.toFixed(2) + '<small>기압</small>');
        setRO(3, '바깥 공기가 미는 힘', '1.00<small>기압</small>');
        break;
      }
      case 'tube': {
        const b = S.tb;
        setRO(1, '해발 높이', fmt(Math.round(b.altS / 10) * 10) + '<small>m</small>');
        setRO(2, '수은 기둥(수직 높이)', b.h.value.toFixed(1) + '<small>cmHg</small>');
        setRO(3, '기압', fmt(Math.round(pressAt(b.altS))) + '<small>hPa</small>');
        break;
      }
      case 'tank': {
        const k = S.tk, f = k.flow;
        setRO(1, '모래 온도', k.Ts.toFixed(1) + '<small>°C</small>');
        setRO(2, '물 온도', k.Tw.toFixed(1) + '<small>°C</small>');
        setRO(3, '바람(연기 흐름)', f < 0.1 ? '거의 없음' : f < 0.45 ? '약해요' : f < 0.8 ? '보통' : '강해요');
        break;
      }
      case 'coast': {
        const c = S.co;
        setRO(1, '시각', hourLabel(c.hourS));
        setRO(2, '땅 / 바다 온도', Math.round(tLand(c.hourS)) + ' / ' + Math.round(tSea(c.hourS)) + '<small>°C</small>');
        setRO(3, '바람', c.guessActive ? '맞혀 보세요!' : windName(c.wS).split(' ')[0]);
        break;
      }
      case 'monsoon': {
        const m = S.mo;
        setRO(1, '계절', m.sum ? '여름' : '겨울');
        setRO(2, '대륙의 기압', m.sum ? '낮음 (저기압)' : '높음 (고기압)');
        setRO(3, '우리나라 바람', moName(m.sS));
        break;
      }
    }
  }

  /* ---------- 조작 ---------- */
  const angUI = SciSim.bindRange($('#sAng'), $('#oAng'), (v) => v + '°', (v) => { S.cup.ang = v; });
  const altUI = SciSim.bindRange($('#sAlt'), $('#oAlt'), (v) => fmt(v) + ' m', (v) => { S.tb.alt = v; });
  const tiltUI = SciSim.bindRange($('#sTilt'), $('#oTilt'), (v) => v + '°', (v) => { S.tb.tilt = v; });
  const hourUI = SciSim.bindRange($('#sHour'), $('#oHour'), (v) => hourLabel(v), (v) => { S.co.hour = v; S.co.play = false; $('#playBtn').textContent = '▶ 하루 흘러가게 하기'; });
  function setHeld(h) {
    const c = S.cup; if (c.held === h) return;
    c.held = h; if (!h) { c.quiver = 1; Sound.tick(); }
    $('#handBtn').textContent = h ? '🖐️ 손 떼기' : '🖐️ 손 다시 받치기';
  }
  $('#handBtn').addEventListener('click', () => { Sound.click(); setHeld(!S.cup.held); });
  $('#btBtn').addEventListener('click', btAction);
  function setLamp(v) { S.tk.lamp = v; $('#tgLamp').setAttribute('aria-pressed', v); $('#tgLamp').textContent = v ? '💡 전등 끄기' : '💡 전등 켜기'; Sound.tick(); }
  function setSmoke(v) { S.tk.smoke = v; $('#tgSmoke').setAttribute('aria-pressed', v); $('#tgSmoke').textContent = v ? '🌫️ 연기 멈추기' : '🌫️ 향 연기'; Sound.tick(); }
  $('#tgLamp').addEventListener('click', () => setLamp(!S.tk.lamp));
  $('#tgSmoke').addEventListener('click', () => setSmoke(!S.tk.smoke));
  $('#playBtn').addEventListener('click', () => {
    Sound.click(); S.co.play = !S.co.play;
    $('#playBtn').textContent = S.co.play ? '⏸ 멈추기' : '▶ 하루 흘러가게 하기';
  });
  function setSeason(sum) {
    S.mo.sum = sum;
    $('#seaSum').setAttribute('aria-pressed', sum); $('#seaWin').setAttribute('aria-pressed', !sum);
    $('#monNote').textContent = sum ? '여름: 뜨거운 대륙은 저기압, 바다는 고기압이에요.' : '겨울: 차가운 대륙은 고기압, 바다는 저기압이에요.';
  }
  $('#seaSum').addEventListener('click', () => { Sound.click(); setSeason(true); });
  $('#seaWin').addEventListener('click', () => { Sound.click(); setSeason(false); });
  setSeason(true);
  $('#tgLens').addEventListener('click', () => { S.lensOn = !S.lensOn; $('#tgLens').setAttribute('aria-pressed', S.lensOn); Sound.click(); });
  function setAlt(v) { S.tb.alt = v; altUI.set(v); }
  function setTilt(v) { S.tb.tilt = v; tiltUI.set(v); }
  function setHour(v) { S.co.hour = v; S.co.hourS = v; hourUI.set(v); }
  function resetScene() {
    Sound.click();
    switch (S.scene) {
      case 'cup': S.cup.ang = 0; angUI.set(0); setHeld(true); break;
      case 'bottle': btReset(); break;
      case 'tube': setAlt(0); setTilt(0); break;
      case 'tank': tkReset(); setLamp(false); setSmoke(false); break;
      case 'coast': setHour(12); S.co.guess = null; S.co.play = false; $('#playBtn').textContent = '▶ 하루 흘러가게 하기'; break;
      case 'monsoon': setSeason(true); break;
    }
  }
  $('#resetBtn').addEventListener('click', resetScene);

  // 캔버스 직접 조작
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'tube' && has('tube') && p.x > 505 && p.y > 90 && p.y < 492) { dragAlt(p); S.tb.drag = true; return true; }
      if (S.scene === 'tank') {
        if (Math.hypot(p.x - 225, p.y - 92) < 52) { setLamp(!S.tk.lamp); return false; }
        if (Math.abs(p.x - SMOKE_X) < 34 && p.y > 300 && p.y < 372) { setSmoke(!S.tk.smoke); return false; }
      }
      if (S.scene === 'coast' && S.co.guessActive) {
        [['toLand', GUESS.toLand], ['toSea', GUESS.toSea]].forEach(([id, g]) => {
          if (Math.abs(p.x - g.x) < g.w / 2 && Math.abs(p.y - g.y) < 26) { S.co.guess = id; Sound.tick(); }
        });
      }
      return false;
    },
    move(p) { if (S.scene === 'tube') dragAlt(p); },
    up() { S.tb.drag = false; },
    hover(p) {
      if (S.scene === 'tube' && p.x > 505 && p.y > 90 && p.y < 492) return 'ns-resize';
      if (S.scene === 'tank' && (Math.hypot(p.x - 225, p.y - 92) < 52 || (Math.abs(p.x - SMOKE_X) < 34 && p.y > 300 && p.y < 372))) return 'pointer';
      if (S.scene === 'coast' && S.co.guessActive && p.y > 450 && p.y < 506) return 'pointer';
      return 'default';
    },
  });
  function dragAlt(p) {
    const v = clamp(Math.round((470 - p.y) / 350 * 8000 / 100) * 100, 0, 8000);
    setAlt(v);
  }

  /* =========================================================
     퀴즈 그림 (인라인 SVG)
     ========================================================= */
  const FIG = {
    tank: '<svg viewBox="0 0 300 130" width="300" height="130" role="img" aria-label="왼쪽 모래, 오른쪽 물을 전등으로 가열하는 수조 모형"><rect width="300" height="130" fill="#eef6fc"/>' +
      '<rect x="30" y="20" width="240" height="96" rx="10" fill="#dcecf8" stroke="#8fa3bd" stroke-width="3"/>' +
      '<rect x="36" y="86" width="108" height="24" rx="4" fill="#e6c27f"/><rect x="156" y="86" width="108" height="24" rx="4" fill="#5aa9e6"/>' +
      '<text x="90" y="103" text-anchor="middle" font-size="13" font-weight="800" fill="#7c4a12">모래</text><text x="210" y="103" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">물</text>' +
      '<path d="M90 12 L70 40 L110 40Z" fill="#ffe27a" opacity=".8"/><circle cx="90" cy="10" r="8" fill="#f59e0b"/>' +
      '<path d="M200 78 L100 78" stroke="#334155" stroke-width="4" marker-end="url(#a)"/><defs><marker id="a" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="#334155"/></marker></defs>' +
      '<text x="150" y="68" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">연기가 흐른 방향</text>' +
      '<circle cx="90" cy="46" r="0" fill="#fff"/></svg>',
    tube: '<svg viewBox="0 0 300 150" width="300" height="150" role="img" aria-label="수은 기둥 76 cm"><rect width="300" height="150" fill="#eef6fc"/>' +
      '<rect x="120" y="14" width="26" height="110" rx="10" fill="#e1f0fc" stroke="#7f95b2" stroke-width="3"/><rect x="125" y="46" width="16" height="84" fill="#aab5c3"/>' +
      '<rect x="95" y="116" width="76" height="22" rx="6" fill="#c9d3df" stroke="#8fa3bd" stroke-width="3"/>' +
      '<path d="M170 46 H200" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M190 46 V120" stroke="#ef4444" stroke-width="3"/>' +
      '<text x="204" y="86" font-size="15" font-weight="800" fill="#b91c1c">76 cm</text><text x="150" y="32" font-size="13" font-weight="800" fill="#64748b">진공</text></svg>',
    coast: '<svg viewBox="0 0 300 120" width="300" height="120" role="img" aria-label="밤의 바닷가: 땅은 차갑고 바다는 따뜻함"><rect width="300" height="120" fill="#1b2a55"/>' +
      '<rect y="70" width="150" height="50" fill="#1e4f86"/><rect x="150" y="70" width="150" height="50" fill="#3b4a3c"/>' +
      '<circle cx="250" cy="28" r="12" fill="#f3f6ff"/>' +
      '<text x="75" y="102" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">바다 21 °C</text><text x="225" y="102" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">땅 15 °C</text>' +
      '<text x="150" y="50" text-anchor="middle" font-size="22" font-weight="800" fill="#ffd45e">바람은 ?</text></svg>',
  };
  const summaryFig = (svg) => '<div class="note-fig">' + svg + '</div>';

  /* =========================================================
     미션 (4단계)
     ========================================================= */
  game = SciSim.game({
    simId: 'm3-pressure-wind',
    mount: '#game',
    badge: '기압·바람 탐구가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      expt: '🥛 물 컵과 종이 · 🧴 페트병 실험',
      lens: '🔍 입자 돋보기',
      tube: '📏 가상 토리첼리 관 · ⛰️ 높이 조절',
      tank: '🔥 수조 모형 (전등 · 향 연기)',
      pmark: '🏷️ 고기압(H)·저기압(L) 표시',
      coast: '🏖️ 해륙풍 (하루 시각)',
      monsoon: '🗺️ 계절풍 지도',
    },
    onFeatures(set) { F = set; renderSeg(); },
    onMissionStart(m) {
      if (m.scene) setScene(m.scene);
    },
    levels: [
      {
        title: '공기도 우리를 누르고 있어요', short: '기압', icon: '🥛', phase: '관찰',
        features: ['expt', 'lens'],
        intro: '<p class="si-q">❓ 탐구 질문: 보이지 않는 공기도 우리를 누르고 있을까? 바람은 왜 불까?</p>' +
          '<p>먼저 <b>공기가 누르는 힘</b>을 눈으로 확인해 봐요. 물을 가득 채운 컵과 종이, 그리고 찌그러지는 페트병을 관찰하고, <b>🔍 입자 돋보기</b>로 공기 입자가 부딪히는 모습도 살펴봐요.</p>',
        setup() { setScene('cup'); S.cup.inv = false; S.cup.tilt = false; S.cup.invT = 0; S.cup.ang = 0; angUI.set(0); setHeld(true); afterScene(); },
        recap: '공기는 <b>모든 방향</b>에서 물체를 눌러요. 이렇게 공기가 누르는 힘을 <b>기압(대기압)</b>이라고 해요.',
        summary: '<p>공기를 이루는 입자가 물체에 부딪히면서 누르는 힘을 <b>기압(대기압)</b>이라고 한다.</p><ul>' +
          '<li>기압은 위·아래·옆, <b>모든 방향</b>으로 작용한다. (물 컵의 종이가 떨어지지 않는다.)</li>' +
          '<li>병 속 공기가 식으면 안쪽 입자의 충돌이 약해져, 바깥 공기에 눌려 병이 찌그러진다.</li></ul>',
        missions: [
          {
            title: '컵을 뒤집어도 종이가 안 떨어져요', scene: 'cup',
            goal: '컵을 <b>끝까지(180°) 돌려 뒤집고</b> 🖐️ 손을 떼 보세요. 손을 뗀 채로 컵을 <b>옆으로 기울여</b> 보세요.',
            hint: '🔄 슬라이더를 오른쪽 끝까지 밀고 [손 떼기]를 눌러요. 그다음 슬라이더를 왼쪽으로 천천히 돌려요.',
            setup() { const c = S.cup; c.inv = false; c.tilt = false; c.invT = 0; c.ang = 0; angUI.set(0); setHeld(true); },
            check: () => S.cup.inv && S.cup.tilt,
            status: () => chk(S.cup.inv, '컵을 뒤집고 손 떼기') + ' · ' + chk(S.cup.tilt, '손을 뗀 채 옆으로 기울이기'),
            hold: 0.6,
            explain: '컵 속에는 물만 가득해서 공기가 들어 있지 않아요. 종이 <b>바깥쪽 공기가 종이를 세게 눌러</b> 물의 무게보다 훨씬 큰 힘으로 받쳐 줘요. 옆으로 기울여도 안 떨어지는 것은 공기가 <b>모든 방향</b>에서 누르기 때문이에요. 이 힘이 <b>기압</b>이에요.',
          },
          {
            title: '찌그러지는 페트병', scene: 'bottle',
            goal: '페트병에 <b>뜨거운 물을 붓고 → 물을 버리고 뚜껑을 닫은 뒤 → 찬물로 식혀</b> 보세요. 🔍 돋보기에서 입자도 지켜봐요.',
            hint: '아래 버튼을 차례로 눌러요. 돋보기 속 안쪽 입자의 빠르기가 어떻게 바뀌는지 보세요.',
            setup() { btReset(); },
            check: () => S.bt.stage >= 3 && S.bt.done,
            status: () => chk(S.bt.stage >= 1, '뜨거운 물 붓기') + ' · ' + chk(S.bt.stage >= 2, '뚜껑 닫기') + ' · ' + chk(S.bt.stage >= 3, '식히기') + ' · ' + chk(S.bt.done, '찌그러짐'),
            hold: 0.5,
            explain: '뚜껑을 닫은 병 속 공기가 식으면 입자의 움직임이 느려져 <b>병 벽을 안쪽에서 미는 힘이 줄어요</b>. 바깥 공기가 누르는 힘은 그대로이므로 바깥이 더 세져서 병이 찌그러져요.',
          },
          {
            type: 'quiz', title: '두 실험이 보여 주는 것',
            goal: '컵의 종이와 페트병 실험으로 알 수 있는 사실은?',
            choices: ['공기는 위에서 아래로만 누른다', '공기는 가벼워서 물체를 누르는 힘이 거의 없다', '공기는 모든 방향에서 물체를 누른다. 이 힘을 기압이라고 한다', '종이에 묻은 물이 종이를 컵에 붙인다'],
            answer: 2,
            feedback: ['종이는 아래쪽에서 위로 눌려 받쳐졌어요. 방향을 다시 생각해 봐요.', '종이가 받친 물의 무게보다 훨씬 큰 힘이었어요.', '', '컵 속에 공기가 없어도 종이가 붙어 있었던 것은 바깥 공기가 눌렀기 때문이에요.'],
            explain: '공기 입자가 물체에 끊임없이 부딪히며 <b>모든 방향</b>으로 힘을 줘요. 이 힘이 <b>기압(대기압)</b>이에요.',
          },
        ],
      },
      {
        title: '기압은 얼마나 클까? 토리첼리 실험', short: '기압의 크기', icon: '📏', phase: '실험',
        features: ['tube'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공기가 모든 방향으로 누르는 힘, <b>기압</b>이 있다는 것을 확인했어요.</div>' +
          '<p>그 힘은 얼마나 클까요? <b>토리첼리 실험</b>으로 기압의 크기를 재 봐요. 수은은 독성이 있어서 실제로는 선생님과 조심해서 해요. 여기서는 <b>가상 실험</b>이에요.</p>',
        setup() { setScene('tube'); setAlt(0); setTilt(0); S.tb.maxTilt = 0; S.tb.maxAlt = 0; afterScene(); },
        recap: '기압은 <b>수은 기둥 76 cm</b>가 누르는 힘과 같고(1기압), 높은 곳으로 갈수록 기압이 낮아져요.',
        summary: '<p><b>토리첼리 실험</b>: 수은을 채운 관을 수은 그릇에 거꾸로 세우면 수은 기둥이 약 <b>76 cm</b>에서 멈춘다. 수은 기둥이 누르는 압력이 대기압과 같기 때문이다.</p><ul>' +
          '<li><b>1기압 = 76 cmHg ≈ 1013 hPa</b></li>' +
          '<li>관을 기울여도 <b>수직 높이는 76 cm</b>로 같다. (기둥의 길이만 길어진다.)</li>' +
          '<li>높이 올라갈수록 기압이 낮아져 수은 기둥이 낮아진다.</li>' +
          '<li>수은 대신 물로 하면 물기둥의 높이는 약 <b>10 m</b>나 된다.</li></ul>' + summaryFig(FIG.tube),
        missions: [
          {
            title: '관을 기울여 보기', scene: 'tube',
            goal: '📐 유리관을 <b>25° 이상 기울여</b> 보세요. 수은 기둥의 <b>길이</b>와 <b>수직 높이</b>는 어떻게 될까요?',
            hint: '📐 관 기울이기 슬라이더를 오른쪽으로 밀어요. 빨간 선(수직 높이)을 지켜봐요.',
            setup() { setAlt(0); setTilt(0); },
            check: () => S.tb.tilt >= 25 && S.tb.alt === 0,
            status: () => chk(S.tb.tilt >= 25, '관 기울이기 <b>' + S.tb.tilt + '°</b> / 25°') + ' · 수직 높이 <b>' + S.tb.h.value.toFixed(1) + ' cm</b>',
            hold: 1.4,
            explain: '관을 기울이면 관 속 수은 기둥의 <b>길이는 길어지지만</b>, 수은 기둥의 <b>수직 높이는 76 cm 그대로</b>예요. 기압이 떠받치는 것은 수직 높이이기 때문이에요.',
          },
          {
            title: '높은 산으로 가져가기', scene: 'tube',
            goal: '⛰️ 해발 높이를 <b>3000 m 이상</b>으로 올려 보세요. 수은 기둥이 어떻게 변하나요?',
            hint: '해발 높이 슬라이더를 오른쪽으로 밀거나, 화면 오른쪽의 산을 위로 끌어 올려요.',
            setup() { setAlt(0); setTilt(0); },
            check: () => S.tb.alt >= 3000 && S.tb.h.value < 56.5,
            status: () => chk(S.tb.alt >= 3000, '해발 <b>' + fmt(S.tb.alt) + ' m</b> / 3,000 m') + ' · 수은 기둥 <b>' + S.tb.h.value.toFixed(1) + ' cm</b>',
            hold: 1.2,
            explain: '높이 올라갈수록 위에 있는 공기의 양이 줄어 <b>기압이 낮아져요</b>. 그래서 수은 기둥도 76 cm보다 낮아져요. 해발 3000 m쯤에서는 약 53 cm, 기압은 약 700 hPa예요.',
          },
          {
            type: 'quiz', title: '1기압은 얼마?', figure: FIG.tube,
            goal: '해수면에서 토리첼리 실험을 했더니 수은 기둥이 76 cm였어요. 이때 기압은?',
            choices: ['1기압 = 76 cmHg ≈ 1013 hPa', '1기압 = 76 cmHg ≈ 76 hPa', '1기압 = 760 cmHg ≈ 1013 hPa', '1기압 = 10 cmHg ≈ 1013 hPa'],
            answer: 0,
            feedback: ['', '76은 수은 기둥의 높이(cm)예요. hPa는 다른 단위로, 같은 압력을 약 1013 hPa로 나타내요.', '수은 기둥은 76 cm였어요.', '수은 기둥의 높이를 다시 확인해 봐요.'],
            explain: '1기압은 <b>수은 기둥 76 cm</b>가 누르는 압력이고, <b>약 1013 hPa</b>예요. 물로 하면 약 10 m의 물기둥이 누르는 압력과 같아요.',
          },
        ],
      },
      {
        title: '바람은 왜 불까? 수조 모형', short: '바람의 원리', icon: '🔥', phase: '모형',
        features: ['tank', 'pmark'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기압의 크기와, 높이에 따라 기압이 달라지는 것을 알았어요.</div>' +
          '<p>땅 위의 기압은 어디서나 같을까요? <b>모래(땅)와 물(바다)</b>을 같은 전등으로 가열하는 <b>수조 모형</b>에서 향 연기가 어떻게 흐르는지 보면서 바람이 부는 까닭을 찾아봐요.</p>',
        setup() { setScene('tank'); tkReset(); setLamp(false); setSmoke(false); afterScene(); },
        recap: '지표가 고르게 가열되지 않으면 <b>기압 차</b>가 생기고, 공기는 <b>고기압에서 저기압으로</b> 움직여요. 이것이 바람이에요.',
        summary: '<p><b>바람</b>: 기압이 높은 곳에서 낮은 곳으로 공기가 이동하는 것. 기압 차가 클수록 바람이 세다.</p><ul>' +
          '<li>모래(땅)는 물(바다)보다 <b>빨리 데워진다</b>.</li>' +
          '<li>데워진 곳은 공기가 가열되어 <b>상승</b>하므로 지표 부근이 <b>저기압</b>, 덜 데워진 곳은 <b>고기압</b>이 된다.</li>' +
          '<li>지표 부근 공기는 <b>고기압 → 저기압</b>으로 이동한다.</li></ul>' + summaryFig(FIG.tank),
        missions: [
          {
            title: '연기가 흐르는 방향 관찰', scene: 'tank',
            goal: '💡 전등을 켜고 🌫️ 향 연기를 피워, <b>모래 쪽으로 흐르는 연기</b>를 관찰하세요. 모래와 물의 온도도 비교해 봐요.',
            hint: '전등을 켜고 몇 초 기다리면 모래 온도가 빠르게 올라가요. 화면의 전등과 향을 눌러도 돼요.',
            setup() { tkReset(); setLamp(false); setSmoke(false); },
            check: () => S.tk.lamp && S.tk.smoke && S.tk.Ts - S.tk.Tw >= 8 && S.tk.cross >= 10,
            status: () => chk(S.tk.lamp, '전등 켜기') + ' · ' + chk(S.tk.smoke, '향 연기 피우기') + ' · ' + chk(S.tk.Ts - S.tk.Tw >= 8, '모래–물 온도 차 <b>' + Math.max(0, S.tk.Ts - S.tk.Tw).toFixed(0) + '</b> / 8 °C') + ' · ' + chk(S.tk.cross >= 10, '모래 쪽으로 흐른 연기 <b>' + Math.min(10, S.tk.cross) + '</b> / 10'),
            hold: 0.5,
            explain: '같은 전등을 쬐어도 <b>모래가 물보다 빨리 뜨거워져요</b>. 뜨거워진 모래 위 공기는 가벼워져 <b>상승</b>하고, 그 자리 지표 부근은 <b>저기압</b>이 돼요. 물 위는 상대적으로 차가운 공기가 있어 <b>고기압</b>이에요. 그래서 지표 부근 연기(공기)는 물에서 모래 쪽으로 흘러요.',
          },
          {
            type: 'quiz', title: '왜 모래 쪽으로 흘렀을까?', figure: FIG.tank,
            goal: '수조 모형에서 지표 부근의 연기가 물 쪽에서 모래 쪽으로 흘렀어요. 그 까닭은?',
            choices: ['물이 모래보다 더 뜨거워져서 공기가 모래 쪽으로 밀려났기 때문', '연기가 무거워서 가라앉으며 모래 쪽으로 흘렀기 때문', '모래 위는 공기가 상승해 저기압이 되고, 공기는 고기압인 물 쪽에서 저기압인 모래 쪽으로 이동하기 때문', '공기는 기압이 낮은 곳에서 높은 곳으로 이동하기 때문'],
            answer: 2,
            feedback: ['온도계를 다시 확인해 봐요. 더 뜨거워진 쪽은 모래였어요.', '향 연기는 공기의 흐름을 보여 주는 도구예요. 공기가 움직인 까닭을 생각해 봐요.', '', '바람은 기압이 높은 곳에서 낮은 곳으로 불어요.'],
            explain: '바람은 <b>기압이 높은 곳에서 낮은 곳으로</b> 공기가 이동하는 현상이에요. 모래와 물이 달리 데워져 생긴 <b>기압 차</b>가 바람의 원인이에요. 기압 차가 클수록 바람이 세요.',
          },
        ],
      },
      {
        title: '해륙풍과 계절풍', short: '해륙·계절풍', icon: '🏖️', phase: '적용',
        features: ['coast', 'monsoon'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 땅과 물이 다르게 가열되면 기압 차가 생겨 바람이 분다는 것을 알았어요.</div>' +
          '<p>이 원리는 실제 자연에서도 나타나요. 하루 동안 바뀌는 <b>해륙풍</b>, 계절에 따라 바뀌는 <b>계절풍</b>을 살펴봐요.</p>',
        setup() { setScene('coast'); setHour(13); S.co.guess = null; S.co.play = false; $('#playBtn').textContent = '▶ 하루 흘러가게 하기'; afterScene(); },
        recap: '<b>낮에는 해풍, 밤에는 육풍</b>이 불고, <b>여름에는 남동풍, 겨울에는 북서풍</b>(계절풍)이 불어요.',
        summary: '<ul><li><b>해륙풍</b>: 육지는 바다보다 빨리 데워지고 빨리 식는다.<br>· <b>낮</b>: 육지가 저기압 → 바다에서 육지로 <b>해풍</b><br>· <b>밤</b>: 육지가 고기압 → 육지에서 바다로 <b>육풍</b></li>' +
          '<li><b>계절풍</b>: 대륙과 해양의 가열·냉각 차이로 계절에 따라 부는 바람<br>· <b>여름</b>: 대륙 저기압, 해양 고기압 → <b>남동 계절풍</b><br>· <b>겨울</b>: 대륙 고기압, 해양 저기압 → <b>북서 계절풍</b></li></ul>' + summaryFig(FIG.coast),
        missions: [
          {
            title: '밤바람의 방향 맞히기', scene: 'coast', guess: true, manual: true,
            goal: '낮의 바람을 먼저 살펴보세요. 시각을 <b>밤(밤 10시~새벽 5시)</b>으로 옮기면 바람 표시가 사라져요. 어느 쪽으로 바람이 불지 <b>맞혀 보세요</b>.',
            hint: '땅과 바다 온도계를 비교해 봐요. 더 차가운 쪽이 고기압이 되고, 바람은 고기압 → 저기압으로 불어요.',
            setup() { S.co.guess = null; S.co.play = false; $('#playBtn').textContent = '▶ 하루 흘러가게 하기'; setHour(13); },
            check: () => {
              if (!isNight(S.co.hour)) return '시각을 밤(밤 10시~새벽 5시)으로 옮겨 주세요.';
              if (!S.co.guess) return '바람이 어느 쪽으로 불지 카드를 눌러 골라 주세요.';
              if (S.co.guess !== 'toSea') return '밤에는 땅과 바다 중 어느 쪽이 더 차가운지 온도계를 비교해 보세요. 바람은 고기압 쪽에서 저기압 쪽으로 불어요.';
              return true;
            },
            explain: '밤에는 땅이 바다보다 <b>빨리 식어요</b>. 땅 위 공기는 차가워져 <b>고기압</b>, 바다 위는 상대적으로 따뜻해 <b>저기압</b>이 돼요. 그래서 <b>육지에서 바다로 육풍</b>이 불어요. 낮에는 반대로 <b>바다에서 육지로 해풍</b>이 불어요.',
          },
          {
            title: '여름과 겨울의 계절풍', scene: 'monsoon',
            goal: '🗺️ 계절풍 지도에서 <b>여름</b>과 <b>겨울</b>을 각각 2초 이상 살펴보세요. 대륙과 바다의 기압, 바람 방향을 비교해 봐요.',
            hint: '☀️ 여름과 ❄️ 겨울 버튼을 번갈아 눌러요. 화살표가 바뀌는 것을 지켜봐요.',
            setup() { const m = S.mo; m.seenSum = 0; m.seenWin = 0; setSeason(true); },
            check: () => S.mo.seenSum >= 2 && S.mo.seenWin >= 2,
            status: () => chk(S.mo.seenSum >= 2, '여름 지도 보기') + ' · ' + chk(S.mo.seenWin >= 2, '겨울 지도 보기') + ' · 지금: <b>' + moName(S.mo.sS) + '</b>',
            hold: 0.3,
            explain: '<b>여름</b>에는 대륙이 바다보다 더 뜨거워져 대륙이 저기압, 바다가 고기압이 되어 <b>남동 계절풍</b>이 불어요. <b>겨울</b>에는 대륙이 더 빨리 식어 대륙이 고기압, 바다가 저기압이 되어 <b>북서 계절풍</b>이 불어요.',
          },
          {
            type: 'quiz', title: '겨울 계절풍의 까닭', scene: 'monsoon',
            goal: '겨울에 우리나라에 부는 계절풍과 그 까닭으로 옳은 것은?',
            choices: ['남동 계절풍 — 대륙이 바다보다 빨리 식기 때문', '북서 계절풍 — 바다가 대륙보다 더 차갑기 때문', '남동 계절풍 — 대륙이 가열되어 저기압이 되기 때문', '북서 계절풍 — 대륙이 바다보다 빨리 식어 대륙은 고기압, 바다는 저기압이 되기 때문'],
            answer: 3,
            feedback: ['대륙이 빨리 식는 것은 맞지만, 바람은 고기압(대륙)에서 저기압(바다) 쪽으로 불어요. 방향을 다시 생각해 봐요.', '겨울에는 바다가 대륙보다 따뜻해요.', '그것은 여름 계절풍의 까닭이에요.', ''],
            explain: '겨울에는 대륙이 바다보다 빨리 식어 <b>대륙에 고기압, 바다에 저기압</b>이 생겨요. 바람은 고기압에서 저기압으로 불므로 우리나라에는 <b>북서 계절풍</b>이 불어요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  afterScene();
  initLens('cup');
  updateBtBtn();
  window.__sim = { unlockAll() { ['expt', 'lens', 'tube', 'tank', 'pmark', 'coast', 'monsoon'].forEach((f) => F.add(f)); }, S, setScene, setAlt, setTilt, setHour, setLamp, setSmoke, setSeason, setHeld, angUI, game: () => game, tkReset };
  SciSim.loop((dt, t) => {
    step(dt);
    draw();
    readouts(t);
    if (game) renderSeg();
  });
})();
