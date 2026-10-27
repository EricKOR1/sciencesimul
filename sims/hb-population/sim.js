/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 개체군의 특성 (단원 8차시)
   성취기준 [12생과01-07] 개체군과 군집의 특성을 이해하고 이들의 상호작용의 예를 조사하여 발표할 수 있다. (개체군 부분)
   ① 관찰: 개체군 밀도 (밀도 계산, 표지 재포획법)  ② 분석: 생장 곡선 (S자·J자, 출생·사망)
   ③ 분석: 연령 구조 (피라미드형·종형·항아리형, 20년 예상)  ④ 적용: 개체군 안의 관계 (텃세·순위제·리더제·사회생활·가족생활)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef7f0' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  /* 선 위의 점 (이차 곡선) */
  function ctl(x1, y1, x2, y2, bend) { const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1; return [(x1 + x2) / 2 - dy / len * bend * 2, (y1 + y2) / 2 + dx / len * bend * 2]; }
  function qPts(x1, y1, x2, y2, bend, n) {
    const c = ctl(x1, y1, x2, y2, bend), out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * x1 + 2 * u * t * c[0] + t * t * x2, u * u * y1 + 2 * u * t * c[1] + t * t * y2]); }
    return out;
  }
  function cPts(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return out;
  }
  const ptAt = (pts, f) => { const n = pts.length - 1, v = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(v)), r = v - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]; };
  /* 곡선을 prog(0~1)까지 그리고 화살촉을 붙여요 */
  function strokeCurve(pts, prog, col, w, o) {
    o = o || {};
    const n = pts.length - 1, upto = clamp(prog, 0, 1) * n, fi = Math.min(n, Math.floor(upto));
    if (upto <= 0) return null;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.dash) ctx.setLineDash(o.dash);
    let hx = pts[0][0], hy = pts[0][1], px = hx, py = hy;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    for (let i = 1; i <= fi; i++) { px = hx; py = hy; hx = pts[i][0]; hy = pts[i][1]; ctx.lineTo(hx, hy); }
    if (fi < n && upto > fi) { const f = upto - fi; px = hx; py = hy; hx = pts[fi][0] + (pts[fi + 1][0] - pts[fi][0]) * f; hy = pts[fi][1] + (pts[fi + 1][1] - pts[fi][1]) * f; ctx.lineTo(hx, hy); }
    ctx.stroke(); ctx.setLineDash([]);
    if (!o.noHead && upto > 0.6) {
      const head = o.head || Math.max(10, w * 2.8), dx = hx - px, dy = hy - py, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const bx = hx - ux * head, by = hy - uy * head;
      ctx.beginPath(); ctx.moveTo(hx + ux * 2, hy + uy * 2); ctx.lineTo(bx - uy * head * 0.5, by + ux * head * 0.5); ctx.lineTo(bx + uy * head * 0.5, by - ux * head * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    return [hx, hy];
  }

  const S = { mode: 'dens', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const ease = SciSim.ease;
  const lakeGrad = (x, y, w, h) => { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#9edcf7'); g.addColorStop(1, '#3f9fd8'); return g; };
  function drawFish(x, y, ang, sz, col, mk, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.48, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-sz * 0.8, 0); ctx.lineTo(-sz * 1.65, -sz * 0.6); ctx.lineTo(-sz * 1.65, sz * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sz * 0.5, -sz * 0.1, sz * 0.15, 0, TAU); ctx.fill();
    if (mk) { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(-sz * 0.12, 0, sz * 0.46, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
  }
  function lakeBg(x, y, w, h, t) {
    D.shadow(() => { D.roundRect(x - 6, y - 6, w + 12, h + 12, 26); ctx.fillStyle = '#c9b27a'; ctx.fill(); }, { blur: 8, y: 2 });
    ctx.save(); D.roundRect(x, y, w, h, 22); ctx.clip();
    ctx.fillStyle = lakeGrad(x, y, w, h); ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const yy = y + 28 + i * (h - 40) / 3; ctx.beginPath(); for (let px = x; px <= x + w; px += 6) { const py = yy + Math.sin((px - x) / 38 + t * 0.9 + i * 1.7) * 3; px === x ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); }
    ctx.restore();
  }

  /* =========================================================
     ① 개체군 밀도: 호수의 붕어 (2 km x 1 km, 600마리)
     ========================================================= */
  const LAKE_N = 600, LAKE_AREA = 2, CELL_AREA = LAKE_AREA / 8;
  const CELL_CNT = [80, 70, 75, 68, 82, 72, 78, 75];
  const LKD = PHONE ? { x: 36, y: 100, w: 432, h: 216 } : { x: 50, y: 106, w: 472, h: 236 };
  function resetDens() {
    const rr = mulberry(2024), cw = LKD.w / 4, ch = LKD.h / 2, fish = [];
    CELL_CNT.forEach((n, c) => {
      const cx = (c % 4) * cw, cy = Math.floor(c / 4) * ch;
      for (let i = 0; i < n; i++) fish.push({ c, x: cx + 14 + rr() * (cw - 28), y: cy + 14 + rr() * (ch - 28), ph: rr() * TAU, sp: 0.6 + rr() * 0.8, amp: 3 + rr() * 5, col: C.shade('#f59e0b', (rr() - 0.5) * 0.3) });
    });
    S.dens = { fish, sel: null, seen: {}, val: '', pop: CELL_CNT.map(() => 1), ok: false };
    const inp = $('#denIn'); if (inp) { inp.value = ''; inp.classList.remove('ok', 'bad'); }
  }
  const denSeen = () => Object.keys(S.dens.seen).length;
  const denOK = () => Number(S.dens.val) === LAKE_N / LAKE_AREA && S.dens.val !== '';
  function densDown(p) {
    const cw = LKD.w / 4, ch = LKD.h / 2;
    if (p.x >= LKD.x && p.x <= LKD.x + LKD.w && p.y >= LKD.y && p.y <= LKD.y + LKD.h) {
      const c = Math.floor((p.x - LKD.x) / cw) + 4 * Math.floor((p.y - LKD.y) / ch);
      S.dens.sel = c;
      if (!S.dens.seen[c]) { S.dens.seen[c] = true; S.dens.pop[c] = 0; SciSim.tween(S.dens.pop, { [c]: 1 }, { duration: 0.4, ease: 'outBack' }); Sound.success(); const x = LKD.x + (c % 4 + 0.5) * cw, y = LKD.y + (Math.floor(c / 4) + 0.5) * ch; parts.burst(x, y, { count: 8, colors: ['#fff', '#fde68a'], speed: 80, size: 3, life: 0.5, gravity: 0 }); }
      else Sound.tick();
    }
    return false;
  }
  function drawDens(dt, t) {
    const q = S.dens, cw = LKD.w / 4, ch = LKD.h / 2;
    bgFill('#e8f5ee', '#f3fbf0');
    T(LKD.x, LKD.y - 56, '🐟 붕어 개체군의 밀도', PHONE ? 17 : 19, '#0f5132', 'left', 800);
    T(LKD.x, LKD.y - 32, '같은 종이 한 지역에 모여 사는 무리 = 개체군', PHONE ? 13 : 14, '#475569', 'left', 700);
    lakeBg(LKD.x, LKD.y, LKD.w, LKD.h, t);
    // 물고기
    q.fish.forEach((f) => {
      const a = t * f.sp + f.ph, ox = Math.cos(a) * f.amp, oy = Math.sin(a * 1.3) * f.amp * 0.6, ang = RM ? 0 : Math.atan2(Math.cos(a * 1.3) * 1.3 * f.amp * 0.6, -Math.sin(a) * f.amp) ;
      drawFish(LKD.x + f.x + (RM ? 0 : ox), LKD.y + f.y + (RM ? 0 : oy), RM ? 0 : ang, 4.4, f.col, false);
    });
    // 격자
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(LKD.x + i * cw, LKD.y); ctx.lineTo(LKD.x + i * cw, LKD.y + LKD.h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(LKD.x, LKD.y + ch); ctx.lineTo(LKD.x + LKD.w, LKD.y + ch); ctx.stroke(); ctx.restore();
    for (let c = 0; c < 8; c++) {
      const x = LKD.x + (c % 4) * cw, y = LKD.y + Math.floor(c / 4) * ch, seen = q.seen[c], pop = clamp(q.pop[c], 0, 1.15);
      if (q.sel === c) { ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; D.roundRect(x + 2, y + 2, cw - 4, ch - 4, 10); ctx.stroke(); ctx.restore(); }
      if (seen) { ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(pop, pop); D.label(0, 0, CELL_CNT[c] + '마리', { bg: 'rgba(15,60,100,.88)', size: PHONE ? 14 : 16 }); ctx.restore(); }
      else T(x + cw / 2, y + ch / 2 + 5, '👆', 18, 'rgba(255,255,255,.9)', 'center', 700);
    }
    // 눈금(길이)
    const ax = LKD.x, ay = LKD.y + LKD.h + 24;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + LKD.w, ay); ctx.moveTo(ax, ay - 6); ctx.lineTo(ax, ay + 6); ctx.moveTo(ax + LKD.w, ay - 6); ctx.lineTo(ax + LKD.w, ay + 6); ctx.stroke();
    T(ax + LKD.w / 2, ay + 21, '가로 2 km  ×  세로 1 km = 2 km²', 14, '#334155', 'center', 800);
    const bx_ = LKD.x - 14, by_ = LKD.y;
    ctx.beginPath(); ctx.moveTo(bx_, by_); ctx.lineTo(bx_, by_ + LKD.h); ctx.moveTo(bx_ - 6, by_); ctx.lineTo(bx_ + 6, by_); ctx.moveTo(bx_ - 6, by_ + LKD.h); ctx.lineTo(bx_ + 6, by_ + LKD.h); ctx.stroke();
    ctx.save(); ctx.translate(bx_ - 8, by_ + LKD.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '세로 1 km', 14, '#334155', 'center', 800); ctx.restore();
    // 정보 카드
    const ix = PHONE ? 14 : 546, iy = PHONE ? 380 : 40, iw = PHONE ? 452 : 244, ih = PHONE ? 244 : 330;
    panel(ix, iy, iw, ih, 18);
    T(ix + 16, iy + 30, '📋 조사 결과', 16, '#26324a', 'left', 800);
    T(ix + 16, iy + 62, '붕어 개체 수', 14, '#64748b', 'left', 800); T(ix + iw - 16, iy + 62, LAKE_N + '마리', 18, '#0f5132', 'right', 800);
    T(ix + 16, iy + 92, '호수의 넓이', 14, '#64748b', 'left', 800); T(ix + iw - 16, iy + 92, LAKE_AREA + ' km²', 18, '#0f5132', 'right', 800);
    T(ix + 16, iy + 122, '칸 하나(8칸 중)', 14, '#64748b', 'left', 800); T(ix + iw - 16, iy + 122, CELL_AREA + ' km²', 18, '#0f5132', 'right', 800);
    D.roundRect(ix + 12, iy + 140, iw - 24, 62, 12); ctx.fillStyle = '#f1f5f9'; ctx.fill();
    T(ix + iw / 2, iy + 166, '밀도 = 개체 수 / 넓이', 16, '#1f2d44', 'center', 800);
    T(ix + iw / 2, iy + 190, q.ok ? '= 600 / 2 = 300 마리/km²' : '= 600 / 2 = ?', 17, q.ok ? '#15803d' : '#7c3aed', 'center', 800);
    if (denSeen() >= 8) {
      const mean = CELL_CNT.reduce((a, b) => a + b, 0) / 8;
      textBlock(ix + 16, iy + 228, iw - 32, '칸 8개의 평균 ' + mean + '마리 / ' + CELL_AREA + ' km² = ' + mean / CELL_AREA + ' 마리/km²', 14, '#0f5132', 20, 800);
    } else if (q.sel != null) textBlock(ix + 16, iy + 228, iw - 32, (q.sel + 1) + '번 칸: ' + CELL_CNT[q.sel] + '마리 / ' + CELL_AREA + ' km² = ' + CELL_CNT[q.sel] / CELL_AREA + ' 마리/km²', 14, '#334155', 20, 800);
    else textBlock(ix + 16, iy + 228, iw - 32, '칸을 눌러 마리 수를 세어 보세요. 칸마다 조금씩 달라요. (' + denSeen() + ' / 8)', 14, '#64748b', 20, 700);
    if (q.ok) D.label(LKD.x + LKD.w / 2, LKD.y - 14, '✅ 밀도 300 마리/km²', { bg: '#15803d', size: PHONE ? 14 : 16 });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ① 표지 재포획법 (호수 속 붕어 수를 모르는 상황, 참값 400마리)
     ========================================================= */
  const MK = { M: 50, n: 40, N: 400, rig: 5 };
  const LKM = PHONE ? { x: 6, y: 6, w: 468, h: 206 } : { x: 14, y: 14, w: 530, h: 276 };
  const TRY = PHONE ? { x: 6, y: 220, w: 468, h: 86 } : { x: 556, y: 14, w: 234, h: 176 };
  const RDG = PHONE ? { x: 6, y: 312, w: 468, h: 46 } : { x: 556, y: 198, w: 234, h: 92 };
  const TBL = PHONE ? { x: 6, y: 364, w: 468, h: 270 } : { x: 14, y: 300, w: 776, h: 248 };
  const SLOT = PHONE ? 17 : 21, SCOLS = PHONE ? 25 : 10;
  const slotXY = (i) => [TRY.x + (PHONE ? 22 : 12) + (i % SCOLS) * SLOT + SLOT / 2, TRY.y + (PHONE ? 34 : 44) + Math.floor(i / SCOLS) * SLOT + SLOT / 2];
  const rndIn = (a, b) => a + Math.random() * (b - a);
  const pickLake = () => [LKM.x + 22 + Math.random() * (LKM.w - 44), LKM.y + 22 + Math.random() * (LKM.h - 44)];
  function newMk(keep) {
    const fish = [];
    for (let i = 0; i < MK.N; i++) { const p = pickLake(); fish.push({ x: p[0], y: p[1], a: Math.random() * TAU, sp: 14 + Math.random() * 16, mk: false, st: 'free', from: null, to: null, t0: 0, dur: 1, slot: -1, col: C.shade('#f59e0b', (Math.random() - 0.5) * 0.3) }); }
    const prev = keep ? S.mk : null;
    S.mk = { fish, phase: 0, mixT: 0, cur: { m: null, n: null, M: null }, trials: prev ? prev.trials : [], trialNo: prev ? prev.trials.length + 1 : 1, msg: '', moving: 0, est: '' };
    const inp = $('#nIn'); if (inp) { inp.value = ''; inp.classList.remove('ok', 'bad'); }
  }
  const mkOK = () => S.mk.trials.length;
  function moveFish(f, to, delay, dur, st) { f.from = [f.x, f.y]; f.to = to; f.t0 = S.clock + delay; f.dur = dur; f.st = 'move'; f.after = st; }
  function mkAct(k) {
    const q = S.mk, F = q.fish;
    if (k === 1 && q.phase === 0) {
      const idx = F.map((f, i) => i).sort(() => Math.random() - 0.5).slice(0, MK.M);
      idx.forEach((fi, s) => { const f = F[fi]; f.slot = s; moveFish(f, slotXY(s), s * 0.014, 0.75, 'tray'); f.willMark = true; });
      q.phase = 0.5; q.cur.M = MK.M; Sound.click();
    } else if (k === 2 && q.phase === 1) {
      F.forEach((f) => { if (f.st === 'tray') { const p = pickLake(); moveFish(f, p, Math.max(0, f.slot) * 0.01, 0.8, 'free'); f.slot = -1; } });
      q.phase = 1.5; Sound.click();
    } else if (k === 3 && q.phase === 2 && q.mixT >= 1.6) {
      let pickI;
      if (q.trials.length === 0) {
        const mk = [], un = []; F.forEach((f, i) => (f.mk ? mk : un).push(i));
        pickI = mk.sort(() => Math.random() - 0.5).slice(0, MK.rig).concat(un.sort(() => Math.random() - 0.5).slice(0, MK.n - MK.rig));
      } else pickI = F.map((f, i) => i).sort(() => Math.random() - 0.5).slice(0, MK.n);
      pickI.sort(() => Math.random() - 0.5);
      pickI.forEach((fi, s) => { const f = F[fi]; f.slot = s; moveFish(f, slotXY(s), s * 0.014, 0.75, 'tray'); });
      q.cur.n = MK.n; q.cur.m = pickI.filter((i) => F[i].mk).length; q.phase = 2.5; Sound.click();
    }
    updateCtl();
  }
  function mkCheck() {
    const q = S.mk, m = q.cur.m; if (q.phase !== 3 || m == null) return;
    const v = Number($('#nIn').value), inp = $('#nIn');
    if (m === 0) { showHint('다시 잡은 물고기 중 표지된 개체가 0마리예요. 이럴 땐 계산할 수 없어요. 🔄 새 호수에서 다시 해요.', 5000); return; }
    if ($('#nIn').value === '' || !isFinite(v)) { showHint('추정한 개체 수를 입력해요.', 2600); return; }
    const exact = MK.M * MK.n / m;
    if (Math.abs(v - exact) <= 1) {
      q.trials.push({ M: MK.M, n: MK.n, m, est: v, exact }); q.phase = 4; inp.classList.remove('bad'); inp.classList.add('ok'); Sound.success();
      parts.burst(LKM.x + LKM.w / 2, LKM.y + LKM.h / 2, { count: 16, colors: ['#16a34a', '#fde047', '#fff'], speed: 130, size: 3.5, life: 0.8 });
      showHint('✅ N = ' + MK.M + ' × ' + MK.n + ' / ' + m + ' ≈ ' + Math.round(exact) + '마리', 4200);
    } else { inp.classList.add('bad'); setTimeout(() => inp.classList.remove('bad'), 450); Sound.fail(); showHint('다시 계산해 보세요. N = (처음 표지한 수 M × 다시 잡은 수 n) / 다시 잡은 것 중 표지된 수 m 이에요. (소수점 아래는 반올림)', 5200); }
    updateCtl();
  }
  function stepMk(dt) {
    const q = S.mk; if (!q) return;
    const F = q.fish, t = S.clock; let moving = 0;
    F.forEach((f) => {
      if (f.st === 'move') {
        moving++;
        const k = (t - f.t0) / f.dur;
        if (k >= 1) { f.x = f.to[0]; f.y = f.to[1]; f.st = f.after; moving--; if (f.willMark) { f.mk = true; f.willMark = false; parts.burst(f.x, f.y, { count: 2, colors: ['#ef4444'], speed: 30, size: 2, life: 0.3, gravity: 0 }); } }
        else if (k > 0) { const e = ease.inOutQuad(clamp(k, 0, 1)); f.x = f.from[0] + (f.to[0] - f.from[0]) * e; f.y = f.from[1] + (f.to[1] - f.from[1]) * e - Math.sin(e * Math.PI) * 26; f.a = Math.atan2(f.to[1] - f.from[1], f.to[0] - f.from[0]); }
      } else if (f.st === 'free') {
        f.a += (Math.random() - 0.5) * dt * 7; f.x += Math.cos(f.a) * f.sp * dt; f.y += Math.sin(f.a) * f.sp * dt * 0.8;
        if (f.x < LKM.x + 16) { f.x = LKM.x + 16; f.a = Math.PI - f.a; } if (f.x > LKM.x + LKM.w - 16) { f.x = LKM.x + LKM.w - 16; f.a = Math.PI - f.a; }
        if (f.y < LKM.y + 16) { f.y = LKM.y + 16; f.a = -f.a; } if (f.y > LKM.y + LKM.h - 16) { f.y = LKM.y + LKM.h - 16; f.a = -f.a; }
      }
    });
    if (q.phase === 0.5 && moving === 0) { q.phase = 1; updateCtl(); }
    if (q.phase === 1.5 && moving === 0) { q.phase = 2; q.mixT = 0; updateCtl(); }
    if (q.phase === 2) { const was = q.mixT; q.mixT += dt; if (was < 1.6 && q.mixT >= 1.6) updateCtl(); }
    if (q.phase === 2.5 && moving === 0) { q.phase = 3; updateCtl(); showHint('다시 잡은 ' + q.cur.n + '마리 중 표지된 물고기는 ' + q.cur.m + '마리예요.', 4200); }
  }
  function drawMark(dt, t) {
    const q = S.mk;
    bgFill('#e8f5ee', '#f3fbf0');
    lakeBg(LKM.x, LKM.y, LKM.w, LKM.h, t);
    // 호수의 물고기 (이동 중인 것은 위에)
    const order = [];
    q.fish.forEach((f) => { if (f.st === 'free') drawFish(f.x, f.y, f.a, 5, f.col, f.mk); else if (f.st === 'move') order.push(f); });
    order.forEach((f) => drawFish(f.x, f.y, f.a, 5, f.col, f.mk || (f.willMark && (S.clock - f.t0) / f.dur > 0.95)));
    T(LKM.x + 14, LKM.y + LKM.h - 12, '🎣 호수 속 붕어 수를 몰라요 (표지한 물고기는 빨간 점)', PHONE ? 13 : 14, 'rgba(255,255,255,.96)', 'left', 800, { stroke: 'rgba(15,60,100,.55)', strokeWidth: 3 });
    // 바구니(트레이)
    panel(TRY.x, TRY.y, TRY.w, TRY.h, 16);
    T(TRY.x + 14, TRY.y + 24, '🪣 잡은 물고기', 15, '#26324a', 'left', 800);
    const cap = q.phase >= 0.5 && q.phase < 1.5 ? 'M' : q.phase >= 2.5 ? 'n' : null;
    for (let s = 0; s < MK.M; s++) { const p = slotXY(s); ctx.fillStyle = 'rgba(100,116,139,.12)'; D.roundRect(p[0] - SLOT / 2 + 1, p[1] - SLOT / 2 + 1, SLOT - 2, SLOT - 2, 4); ctx.fill(); }
    q.fish.forEach((f) => { if (f.st === 'tray') drawFish(f.x, f.y, 0, SLOT * 0.3, f.col, f.mk); });
    // 읽음 패널
    if (!PHONE) {
      panel(RDG.x, RDG.y, RDG.w, RDG.h, 16);
      T(RDG.x + 14, RDG.y + 26, '표지한 수 M', 14, '#64748b', 'left', 800); T(RDG.x + RDG.w - 14, RDG.y + 26, q.cur.M == null ? '?' : q.cur.M + '마리', 16, '#dc2626', 'right', 800);
      T(RDG.x + 14, RDG.y + 52, '다시 잡은 수 n', 14, '#64748b', 'left', 800); T(RDG.x + RDG.w - 14, RDG.y + 52, q.cur.n == null ? '?' : q.cur.n + '마리', 16, '#2563eb', 'right', 800);
      T(RDG.x + 14, RDG.y + 78, '표지된 수 m', 14, '#64748b', 'left', 800); T(RDG.x + RDG.w - 14, RDG.y + 78, q.cur.m == null ? '?' : q.cur.m + '마리', 16, '#15803d', 'right', 800);
    } else {
      panel(RDG.x, RDG.y, RDG.w, RDG.h, 14);
      T(RDG.x + 12, RDG.y + 29, 'M ' + (q.cur.M == null ? '?' : q.cur.M) + ' · n ' + (q.cur.n == null ? '?' : q.cur.n) + ' · m ' + (q.cur.m == null ? '?' : q.cur.m), 16, '#26324a', 'left', 800);
      T(RDG.x + RDG.w - 12, RDG.y + 29, '표지한 수 · 다시 잡은 수 · 표지된 수', 13, '#64748b', 'right', 700);
    }
    // 시행 표
    panel(TBL.x, TBL.y, TBL.w, TBL.h, 16);
    const cols = PHONE ? [0.1, 0.24, 0.38, 0.52, 0.78] : [0.07, 0.2, 0.33, 0.46, 0.74];
    const hd = ['시행', 'M', 'n', 'm', 'N = M × n / m (내 계산)'];
    hd.forEach((h, i) => T(TBL.x + TBL.w * cols[i], TBL.y + 28, h, PHONE ? 13 : 14.5, '#475569', 'center', 800));
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TBL.x + 10, TBL.y + 40); ctx.lineTo(TBL.x + TBL.w - 10, TBL.y + 40); ctx.stroke();
    const rowsN = 5, rh = PHONE ? 32 : 32, first = q.trials.length >= 5 ? q.trials.length - 4 : 0;
    for (let r = 0; r < rowsN; r++) {
      const ri = first + r, y = TBL.y + 62 + r * rh, tr = q.trials[ri], cur = ri === q.trials.length && q.phase < 4;
      if (cur) { ctx.fillStyle = 'rgba(124,58,237,.08)'; D.roundRect(TBL.x + 8, y - 20, TBL.w - 16, rh - 2, 8); ctx.fill(); }
      const vals = tr ? [String(ri + 1), tr.M, tr.n, tr.m, tr.est + '마리'] : cur ? [String(ri + 1), q.cur.M == null ? '' : q.cur.M, q.cur.n == null ? '' : q.cur.n, q.cur.m == null ? '' : q.cur.m, q.phase === 3 ? '← 계산해 입력' : ''] : [String(ri + 1), '', '', '', ''];
      vals.forEach((v, i) => T(TBL.x + TBL.w * cols[i], y, String(v), PHONE ? 14 : 15.5, tr ? (i === 4 ? '#15803d' : '#1f2d44') : '#7c3aed', 'center', 800));
    }
    const sumY = TBL.y + TBL.h - 18;
    if (q.trials.length >= 3) {
      const mean = q.trials.reduce((a, b) => a + b.est, 0) / q.trials.length;
      T(TBL.x + 16, sumY, '추정값 평균 ≈ ' + Math.round(mean) + '마리 (이번 호수의 참값 ' + MK.N + '마리) → 추정값은 참값 근처에서 흩어져요', PHONE ? 13 : 15, '#15803d', 'left', 800);
    } else T(TBL.x + 16, sumY, '시행을 3번 해서 추정값이 어떻게 달라지는지 비교해요 (' + q.trials.length + ' / 3)', PHONE ? 13 : 15, '#64748b', 'left', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 생장 곡선: 짚신벌레 배양 (개체 수/mL)
     ========================================================= */
  const G_DAYS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], G_N = [10, 25, 60, 130, 250, 380, 450, 490, 500, 500], G_K = 500, G_R = 0.5, G_TOL = 24, G_Y1 = 600;
  const gBirth = (n) => Math.round((0.55 - 0.10 * n / G_K) * n), gDeath = (n) => Math.round((0.05 + 0.40 * n / G_K) * n);
  const GP = PHONE ? { x: 6, y: 6, w: 468, h: 372 } : { x: 10, y: 10, w: 580, h: 540 };
  const GB = PHONE ? { x: GP.x + 56, y: GP.y + 46, w: GP.w - 76, h: 258 } : { x: GP.x + 66, y: GP.y + 50, w: GP.w - 90, h: 380 };
  const GT = PHONE ? { x: 6, y: 386, w: 468, h: 92 } : { x: 600, y: 10, w: 190, h: 296 };
  const GR_ = PHONE ? { x: 6, y: 486, w: 468, h: 148 } : { x: 600, y: 314, w: 190, h: 236 };
  const gx = (d) => GB.x + d / 18 * GB.w, gy = (v) => GB.y + GB.h - clamp(v / G_Y1, 0, 1) * GB.h;
  function resetGrow() {
    S.gr = { pts: G_DAYS.map(() => false), pop: G_DAYS.map(() => 0), env: 'S', jSeen: false, day: 8, ghost: null, bd: { b: 0, d: 0 }, tries: 0, line: 0, ok: false };
  }
  const grCount = () => S.gr.pts.filter(Boolean).length;
  function growDown(p) {
    const q = S.gr;
    if (p.x < GB.x - 8 || p.x > GB.x + GB.w + 8 || p.y < GB.y - 6 || p.y > GB.y + GB.h + 6) return false;
    const di = clamp(Math.round((p.x - GB.x) / GB.w * 9), 0, 9);
    if (q.pts[di]) { q.day = G_DAYS[di]; updateCtl(); Sound.tick(); return false; }
    const val = (GB.y + GB.h - p.y) / GB.h * G_Y1;
    q.ghost = { x: gx(G_DAYS[di]), y: clamp(p.y, GB.y, GB.y + GB.h), t0: S.clock, bad: true };
    if (Math.abs(val - G_N[di]) <= G_TOL) {
      q.pts[di] = true; q.pop[di] = 0; q.ghost = null; SciSim.tween(q.pop, { [di]: 1 }, { duration: 0.45, ease: 'outBack' }); Sound.success(); q.day = G_DAYS[di];
      parts.burst(gx(G_DAYS[di]), gy(G_N[di]), { count: 10, colors: ['#16a34a', '#fde047', '#fff'], speed: 100, size: 3.2, life: 0.6 });
      hideHint(); updateCtl();
    } else {
      q.tries++; Sound.fail();
      showHint(G_DAYS[di] + '일째는 ' + G_N[di] + '마리예요. ' + (val > G_N[di] ? '더 아래' : '더 위') + '에 점을 찍어요.', 3600);
    }
    return false;
  }
  function stepGrow(dt) {
    const q = S.gr; if (!q) return;
    const di = G_DAYS.indexOf(q.day), n = G_N[di];
    q.bd.b = SciSim.approach(q.bd.b, gBirth(n), dt, 9); q.bd.d = SciSim.approach(q.bd.d, gDeath(n), dt, 9);
    const done = grCount() === 10; q.line = SciSim.approach(q.line, done ? 1 : 0, dt, 2.2);
    if (done && !q.ok) { q.ok = true; }
  }
  function drawGrow(dt, t) {
    const q = S.gr;
    bgFill('#eef7f0', '#f3fbf0');
    panel(GP.x, GP.y, GP.w, GP.h, 18);
    T(GP.x + 16, GP.y + 28, '🧫 짚신벌레 배양 (먹이가 정해진 한 시험관)', PHONE ? 14.5 : 16.5, '#26324a', 'left', 800);
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(GB.x, GB.y, GB.w, GB.h);
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let v = 0; v <= G_Y1; v += 100) { const yy = gy(v); ctx.beginPath(); ctx.moveTo(GB.x, yy); ctx.lineTo(GB.x + GB.w, yy); ctx.stroke(); T(GB.x - 7, yy + 4.5, String(v), 13, '#5d6879', 'right', 700); }
    for (let i = 0; i < 10; i++) { const xx = gx(G_DAYS[i]); ctx.beginPath(); ctx.moveTo(xx, GB.y); ctx.lineTo(xx, GB.y + GB.h); ctx.stroke(); T(xx, GB.y + GB.h + 18, String(G_DAYS[i]), 13, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GB.x, GB.y); ctx.lineTo(GB.x, GB.y + GB.h); ctx.lineTo(GB.x + GB.w, GB.y + GB.h); ctx.stroke();
    T(GB.x + GB.w / 2, GB.y + GB.h + 40, '배양 시간 (일)', 13.5, '#34445c', 'center', 800);
    ctx.save(); ctx.translate(GP.x + 16, GB.y + GB.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '개체 수 (마리/mL)', 13.5, '#34445c', 'center', 800); ctx.restore();
    // 다음에 찍을 열 강조
    const next = q.pts.indexOf(false);
    if (next >= 0) { const xx = gx(G_DAYS[next]); ctx.fillStyle = 'rgba(124,58,237,.08)'; ctx.fillRect(xx - GB.w / 18 * 0.9, GB.y, GB.w / 18 * 1.8, GB.h); }
    // 환경 수용력
    if (q.line > 0.02 && q.env === 'S') {
      const yy = gy(G_K); ctx.save(); ctx.globalAlpha = q.line; ctx.setLineDash([8, 6]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(GB.x, yy); ctx.lineTo(GB.x + GB.w, yy); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalAlpha = q.line; D.label(GB.x + 8, yy - 14, '환경 수용력 약 ' + G_K, { bg: '#dc2626', size: PHONE ? 13 : 14, align: 'left' }); ctx.restore();
    }
    // J자 곡선(이론)
    if (q.env === 'J') {
      ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3.5; ctx.setLineDash([9, 6]); ctx.beginPath();
      let first = true, lastX = 0, lastY = 0;
      for (let d = 0; d <= 18; d += 0.1) { const v = 10 * Math.exp(G_R * d); if (v > G_Y1) { const dd = Math.log(G_Y1 / 10) / G_R; ctx.lineTo(gx(dd), gy(G_Y1)); lastX = gx(dd); lastY = gy(G_Y1); break; } const x = gx(d), y = gy(v); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
      D.label(Math.min(GB.x + GB.w - 10, lastX + 10), GB.y + 28, '먹이·공간이 무한하면 (이론)', { bg: '#7c3aed', size: PHONE ? 13 : 14, align: lastX + 200 > GB.x + GB.w ? 'right' : 'left' });
    }
    // 측정점과 곡선
    const pts = []; q.pts.forEach((ok, i) => { if (ok) pts.push([gx(G_DAYS[i]), gy(G_N[i]), i]); });
    if (q.line > 0.02 && pts.length === 10) {
      ctx.save(); ctx.strokeStyle = 'rgba(22,163,74,' + q.line + ')'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let d = 0; d <= 18; d += 0.25) { const di = d / 2, i0 = Math.min(8, Math.floor(di)), f = di - i0; const v = G_N[i0] + (G_N[i0 + 1] - G_N[i0]) * f; d === 0 ? ctx.moveTo(gx(d), gy(v)) : ctx.lineTo(gx(d), gy(v)); }
      ctx.stroke(); ctx.restore();
    }
    pts.forEach((p) => { const sc = clamp(q.pop[p[2]], 0, 1.2); D.sphere(p[0], p[1], 7 * sc, '#16a34a', { gloss: false, outline: '#fff', outlineWidth: 2 }); if (q.day === G_DAYS[p[2]]) { ctx.strokeStyle = '#1f2d44'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, TAU); ctx.stroke(); } });
    if (q.ghost) { const g = q.ghost, a = 1 - (t - g.t0) * 1.4; if (a > 0) { T(g.x, g.y + 7, '✖', 20, 'rgba(220,38,38,' + a + ')', 'center', 800); } else q.ghost = null; }
    if (q.ok && q.env === 'S') {
      D.label(gx(13), gy(230), 'S자 곡선', { bg: '#15803d', size: PHONE ? 15 : 18 });
      // 환경 저항
      const chips = ['먹이 부족', '노폐물 쌓임', '공간 부족', '포식'];
      T(GB.x + GB.w - 6, GB.y + GB.h * 0.36, '환경 저항', PHONE ? 13 : 14.5, '#b91c1c', 'right', 800);
      chips.forEach((c, i) => D.label(GB.x + GB.w - 6, GB.y + GB.h * 0.36 + 22 + i * 24, c, { bg: '#fecaca', color: '#7f1d1d', size: 13, align: 'right' }));
    }
    if (grCount() === 0 && !q.ghost) T(GB.x + GB.w / 2, GB.y + GB.h * 0.3, '👆 표의 값에 맞는 높이를 눌러 점을 찍어요', PHONE ? 14 : 17, '#8ea0b6', 'center', 800);
    // 데이터 표
    panel(GT.x, GT.y, GT.w, GT.h, 16);
    T(GT.x + 12, GT.y + 24, '📋 배양 기록', PHONE ? 14 : 15, '#26324a', 'left', 800);
    if (!PHONE) {
      for (let i = 0; i < 10; i++) {
        const y = GT.y + 56 + i * 24, ok = q.pts[i], now = i === next;
        if (now) { ctx.fillStyle = 'rgba(124,58,237,.12)'; D.roundRect(GT.x + 8, y - 17, GT.w - 16, 23, 8); ctx.fill(); }
        T(GT.x + 24, y, G_DAYS[i] + '일', 14.5, '#475569', 'left', 800); T(GT.x + GT.w - 16, y, G_N[i] + '마리', 15, ok ? '#15803d' : '#1f2d44', 'right', 800);
        if (ok) T(GT.x + 78, y, '✔', 14, '#16a34a', 'left', 800);
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const cx = GT.x + 12 + (i % 5) * 91, cy = GT.y + 40 + Math.floor(i / 5) * 24, ok = q.pts[i], now = i === next;
        if (now) { ctx.fillStyle = 'rgba(124,58,237,.14)'; D.roundRect(cx - 4, cy - 17, 88, 23, 8); ctx.fill(); }
        T(cx, cy, G_DAYS[i] + '일 ' + G_N[i], 13.5, ok ? '#15803d' : '#1f2d44', 'left', 800);
      }
      T(GT.x + GT.w - 12, GT.y + 24, '(마리/mL)', 13, '#64748b', 'right', 700);
    }
    // 출생·사망 막대
    panel(GR_.x, GR_.y, GR_.w, GR_.h, 16);
    T(GR_.x + 12, GR_.y + 24, '👶 출생 · ☠️ 사망 (' + q.day + '일째)', PHONE ? 14 : 14, '#26324a', 'left', 800);
    if (!q.ok) T(GR_.x + GR_.w / 2, GR_.y + GR_.h / 2 + 10, '점을 모두 찍으면 볼 수 있어요', 13.5, '#8ea0b6', 'center', 800);
    else {
      const bx0 = GR_.x + (PHONE ? 100 : 36), bw = PHONE ? 44 : 50, baseY = GR_.y + GR_.h - 28, maxH = GR_.h - (PHONE ? 76 : 112), axMax = 250;
      const vals = [['출생', q.bd.b, '#2563eb'], ['사망', q.bd.d, '#dc2626']];
      vals.forEach((v, i) => {
        const x = PHONE ? GR_.x + 40 + i * 150 : bx0 + i * 76, h = clamp(v[1] / axMax, 0, 1) * maxH;
        ctx.fillStyle = '#eef2f7'; D.roundRect(x, baseY - maxH, bw, maxH, 6); ctx.fill();
        if (h > 0.5) { ctx.fillStyle = v[2]; D.roundRect(x, baseY - h, bw, h, 6); ctx.fill(); }
        T(x + bw / 2, baseY - h - 5, String(Math.round(v[1])), 14.5, v[2], 'center', 800);
        T(x + bw / 2, baseY + 16, v[0], 13.5, '#475569', 'center', 800);
      });
      const dI = G_DAYS.indexOf(q.day), eq = gBirth(G_N[dI]) === gDeath(G_N[dI]);
      if (PHONE) T(GR_.x + 330, GR_.y + 70, eq ? '출생 = 사망' : '출생 > 사망', 17, eq ? '#15803d' : '#2563eb', 'center', 800);
      if (PHONE) T(GR_.x + 330, GR_.y + 98, eq ? '증가가 멈춰요' : '개체 수가 늘어요', 13.5, '#475569', 'center', 800);
      else T(GR_.x + GR_.w / 2, GR_.y + 50, (eq ? '출생 = 사망 → 증가 멈춤' : '출생 > 사망 → 증가'), 14.5, eq ? '#15803d' : '#2563eb', 'center', 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 연령 구조: A(피라미드형) B(종형) C(항아리형), 내 개체군
     ========================================================= */
  const AGE = [
    { n: '개체군 A', pct: [45, 35, 20], shape: 0, trend: 0, col: '#16a34a' },   // 생식 전 / 생식 / 생식 후 (%)
    { n: '개체군 B', pct: [30, 40, 30], shape: 1, trend: 1, col: '#2563eb' },
    { n: '개체군 C', pct: [15, 40, 45], shape: 2, trend: 2, col: '#ea580c' },
  ];
  const SHAPES = ['피라미드형', '종형', '항아리형'], TRENDS = ['증가', '유지', '감소'];
  const AGE_ROW = [{ n: '생식 후', c: '#a8a29e' }, { n: '생식', c: '#3b82f6' }, { n: '생식 전', c: '#22c55e' }];   // 위에서 아래로
  const PRE_DEF = 40, AGE_YEARS = 20, LAMBDA_K = 0.001;
  const lam = (pre, post) => 1 + LAMBDA_K * (pre - post);
  const sizeAt = (l, yr) => 100 * Math.pow(l, yr);
  const dShape = (pre) => { const post = 60 - pre; return pre > post ? 0 : pre === post ? 1 : 2; };
  const dTrend = (pre) => dShape(pre);
  const AGP = PHONE ? { x: 6, y: 6, w: 468, h: 246 } : { x: 10, y: 10, w: 780, h: 322 };
  const ACH = PHONE ? [{ x: 54, w: 132 }, { x: 192, w: 132 }, { x: 330, w: 132 }] : [{ x: 96, w: 214 }, { x: 328, w: 214 }, { x: 560, w: 214 }];
  const AROW = PHONE ? { y0: 66, h: 38, gap: 8 } : { y0: 72, h: 52, gap: 12 };
  const CUS = PHONE ? { x: 6, y: 260, w: 468, h: 150 } : { x: 10, y: 340, w: 262, h: 210 };
  const PRJ = PHONE ? { x: 6, y: 418, w: 468, h: 216 } : { x: 282, y: 340, w: 508, h: 210 };
  function resetAge() {
    S.age = { pick: [[null, null], [null, null], [null, null]], pre: PRE_DEF, bars: AGE.map(() => [0, 0, 0]), dbars: [0, 0, 0], projP: 0, play: false, solved: false, dTouched: false, touchedDecl: false, bad: {} };
    $$('#ageSel select').forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); });
  }
  const agePicked = () => S.age.pick.reduce((n, r) => n + r.filter((x) => x != null).length, 0);
  const ageRight = () => S.age.pick.reduce((n, r, i) => n + (r[0] === AGE[i].shape ? 1 : 0) + (r[1] === AGE[i].trend ? 1 : 0), 0);
  function playProj() { S.age.play = true; S.age.projP = 0; }
  function stepAge(dt) {
    const q = S.age; if (!q) return;
    AGE.forEach((a, i) => a.pct.forEach((p, r) => { q.bars[i][r] = SciSim.approach(q.bars[i][r], p, dt, 5 + r); }));
    const post = 60 - q.pre; [q.pre, 40, post].forEach((p, r) => { q.dbars[r] = SciSim.approach(q.dbars[r], p, dt, 8); });
    if (q.play) { q.projP = Math.min(AGE_YEARS, q.projP + dt * 5); if (q.projP >= AGE_YEARS) q.play = false; }
  }
  function ageChart(x, w, y, pcts, bars, col, scale, rh, gap, badge) {
    // 위: 생식 후, 가운데: 생식, 아래: 생식 전 (bars: [전, 생식, 후])
    const cx = x + w / 2;
    [2, 1, 0].forEach((gi, r) => {
      const yy = y + r * (rh + gap), bw = Math.max(0, bars[gi]) * scale, p = pcts[gi];
      ctx.fillStyle = 'rgba(148,163,184,.14)'; D.roundRect(x, yy, w, rh, 8); ctx.fill();
      if (bw > 1) {
        D.shadow(() => { D.roundRect(cx - bw / 2, yy, bw, rh, 8); const g = ctx.createLinearGradient(0, yy, 0, yy + rh); g.addColorStop(0, C.shade(AGE_ROW[r].c, 0.28)); g.addColorStop(1, AGE_ROW[r].c); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
        // 개체 아이콘(1칸 = 5 %)
        if (rh >= 40) {
          const nI = Math.round(Math.max(0, bars[gi]) / 5); ctx.fillStyle = 'rgba(255,255,255,.85)';
          const step = Math.min(rh * 0.5, (bw - 12) / Math.max(1, nI)), x0 = cx - (nI - 1) * step / 2, hr = Math.min(4, step * 0.26);
          for (let k = 0; k < nI; k++) { ctx.beginPath(); ctx.arc(x0 + k * step, yy + rh * 0.24, hr, 0, TAU); ctx.fill(); D.roundRect(x0 + k * step - hr * 1.1, yy + rh * 0.24 + hr + 1, hr * 2.2, rh * 0.2, 2); ctx.fill(); }
        }
      }
      const small = rh < 40;
      T(cx, yy + (small ? rh / 2 + 5 : rh * 0.9), p + ' %', PHONE ? 13 : 15, bw > 56 ? '#fff' : '#1f2d44', 'center', 800, bw > 56 ? { stroke: 'rgba(0,0,0,.28)', strokeWidth: 3 } : null);
    });
  }
  function drawAge(dt, t) {
    const q = S.age;
    bgFill('#eef7f0', '#f3fbf0');
    panel(AGP.x, AGP.y, AGP.w, AGP.h, 18);
    // 범례(행 이름)
    [0, 1, 2].forEach((r) => T(AGP.x + (PHONE ? 8 : 12), AGP.y + AROW.y0 + r * (AROW.h + AROW.gap) + AROW.h / 2 + 5, AGE_ROW[r].n, PHONE ? 13 : 14.5, '#475569', 'left', 800));
    AGE.forEach((a, i) => {
      const c = ACH[i];
      T(c.x + c.w / 2, AGP.y + 34, a.n, PHONE ? 15 : 17, a.col, 'center', 800);
      ageChart(c.x, c.w, AGP.y + AROW.y0, a.pct, q.bars[i], a.col, (c.w - 6) / 50, AROW.h, AROW.gap, null);
      const pk = q.pick[i], by = AGP.y + AROW.y0 + 3 * (AROW.h + AROW.gap) + 4;
      if (pk[0] != null || pk[1] != null) {
        const txt = (pk[0] != null ? SHAPES[pk[0]] : '?') + ' · ' + (pk[1] != null ? TRENDS[pk[1]] : '?');
        D.label(c.x + c.w / 2, by + 14, txt, { bg: q.bad[i] ? '#dc2626' : a.col, size: PHONE ? 13 : 14.5 });
      } else T(c.x + c.w / 2, by + 18, '모양 · 변화를 골라요', PHONE ? 13 : 14, '#94a3b8', 'center', 700);
    });
    if (q.solved) D.label(AGP.x + (PHONE ? 62 : 70), AGP.y + (PHONE ? 11 : 20), '✅ 판정 완료', { bg: '#15803d', size: 13 });
    // 내 개체군
    panel(CUS.x, CUS.y, CUS.w, CUS.h, 18);
    T(CUS.x + 14, CUS.y + 26, '🧪 내 개체군 (생식 40 % 고정)', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const pre = q.pre, post = 60 - q.pre, sh = dShape(pre);
    if (!PHONE) {
      ageChart(CUS.x + 74, 170, CUS.y + 44, [pre, 40, post], q.dbars, '#7c3aed', 170 / 50, 34, 8, null);
      [0, 1, 2].forEach((r) => T(CUS.x + 12, CUS.y + 44 + r * 42 + 22, AGE_ROW[r].n, 13, '#475569', 'left', 800));
      D.label(CUS.x + CUS.w / 2, CUS.y + 184, SHAPES[sh] + ' · ' + TRENDS[dTrend(pre)] + '할 가능성', { bg: sh === 0 ? '#16a34a' : sh === 1 ? '#2563eb' : '#ea580c', size: 14.5 });
    } else {
      ageChart(CUS.x + 62, 200, CUS.y + 38, [pre, 40, post], q.dbars, '#7c3aed', 200 / 50, 28, 6, null);
      [0, 1, 2].forEach((r) => T(CUS.x + 10, CUS.y + 38 + r * 34 + 19, AGE_ROW[r].n, 13, '#475569', 'left', 800));
      D.label(CUS.x + 370, CUS.y + 70, SHAPES[sh], { bg: sh === 0 ? '#16a34a' : sh === 1 ? '#2563eb' : '#ea580c', size: 15 });
      D.label(CUS.x + 370, CUS.y + 104, TRENDS[dTrend(pre)] + '할 가능성', { bg: '#475569', size: 14 });
    }
    // 20년 예상
    panel(PRJ.x, PRJ.y, PRJ.w, PRJ.h, 18);
    T(PRJ.x + 14, PRJ.y + 26, '📈 20년 뒤 개체 수 (지금 = 100, 예시)', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const pb = { x: PRJ.x + (PHONE ? 44 : 50), y: PRJ.y + 42, w: PRJ.w - (PHONE ? 62 : 76), h: PRJ.h - (PHONE ? 84 : 84) };
    const px = (yr) => pb.x + yr / AGE_YEARS * pb.w, py = (v) => pb.y + pb.h - clamp(v / 200, 0, 1) * pb.h;
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(pb.x, pb.y, pb.w, pb.h); ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let v = 0; v <= 200; v += 50) { const yy = py(v); ctx.beginPath(); ctx.moveTo(pb.x, yy); ctx.lineTo(pb.x + pb.w, yy); ctx.stroke(); T(pb.x - 6, yy + 4.5, String(v), 13, '#5d6879', 'right', 700); }
    for (let yr = 0; yr <= AGE_YEARS; yr += 5) { const xx = px(yr); ctx.beginPath(); ctx.moveTo(xx, pb.y); ctx.lineTo(xx, pb.y + pb.h); ctx.stroke(); T(xx, pb.y + pb.h + 17, String(yr), 13, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x, pb.y + pb.h); ctx.lineTo(pb.x + pb.w, pb.y + pb.h); ctx.stroke();
    T(pb.x + pb.w / 2, pb.y + pb.h + 36, '시간 (년)', 13, '#34445c', 'center', 800);
    const drawLam = (l, col, prog, dash) => {
      if (prog <= 0) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; if (dash) ctx.setLineDash([8, 5]); ctx.beginPath();
      for (let yr = 0; yr <= prog + 1e-6; yr += 0.25) { const x = px(yr), y = py(sizeAt(l, yr)); yr === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineTo(px(prog), py(sizeAt(l, prog))); ctx.stroke(); ctx.restore();
      D.sphere(px(prog), py(sizeAt(l, prog)), 5.5, col, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    };
    const shown = q.projP > 0 || q.solved;
    const prog = q.solved && !q.play ? AGE_YEARS : q.projP;
    if (shown) AGE.forEach((a) => drawLam(lam(a.pct[0], a.pct[2]), a.col, prog, false));
    if (q.dTouched) drawLam(lam(pre, post), '#7c3aed', AGE_YEARS, true);
    if (shown && prog >= AGE_YEARS) AGE.forEach((a) => { const v = Math.round(sizeAt(lam(a.pct[0], a.pct[2]), AGE_YEARS)); D.label(pb.x + pb.w - 4, py(v) + (a.n === '개체군 B' ? -14 : a.n === '개체군 A' ? -14 : 14), a.n.slice(4) + ' ' + v, { bg: a.col, size: 13, align: 'right' }); });
    if (!shown && !q.dTouched) T(pb.x + pb.w / 2, pb.y + pb.h / 2, '판정을 맞히면 20년 뒤 모습이 그려져요', PHONE ? 13.5 : 15.5, '#8ea0b6', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ④ 개체군 안의 관계 5가지 (장면 카드)
     ========================================================= */
  const REL = [
    { n: '은어의 영역', scene: 'fish', ans: 0, adv: 0, wrong: '이 장면은 자기 영역을 지키며 다른 개체를 쫓아내는 모습이에요. 서열을 정하는 것이 아니라 영역을 독점하는 거예요.' },
    { n: '닭의 모이 쪼기', scene: 'hen', ans: 1, adv: 0, wrong: '먹이를 먹는 순서가 서열로 정해져 있어요. 영역을 지키는 것이 아니라 서열을 정해 다툼을 줄이는 모습이에요.' },
    { n: '기러기의 V자 비행', scene: 'geese', ans: 2, adv: 0, wrong: '앞에서 무리를 이끄는 한 마리를 따라 이동해요. 리더가 방향을 정하는 모습이에요.' },
    { n: '꿀벌의 집', scene: 'bee', ans: 3, adv: 0, wrong: '여왕벌, 일벌처럼 일을 나누어 맡아요. 혈연이 아니라 분업이 핵심이에요.' },
    { n: '사자 무리', scene: 'lion', ans: 4, adv: 0, wrong: '혈연 관계의 개체들이 함께 새끼를 키우며 살아요. 일을 나누는 분업보다 혈연이 핵심이에요.' },
  ];
  const RTYPE = ['텃세', '순위제', '리더제', '사회생활', '가족생활'];
  const RCOL = ['#0ea5e9', '#f59e0b', '#8b5cf6', '#eab308', '#ef4444'];
  // 이점 보기 (카드별 3개, 첫 번째가 정답이 아니도록 섞어 둠)
  const ADV = [
    ['서열이 정해져 다툼이 줄어요', '먹이와 번식 장소를 확보해요', '무리를 이끄는 개체를 따라가요'],
    ['일을 나누어 맡아 효율이 높아요', '서열이 정해져 다툼이 줄고 질서가 유지돼요', '먹이와 번식 장소를 확보해요'],
    ['리더가 방향을 정해 무리가 함께 이동해요', '혈연 개체가 함께 새끼를 길러요', '서열이 정해져 다툼이 줄어요'],
    ['영역을 독점해 먹이를 확보해요', '혈연 개체가 함께 새끼를 길러요', '일을 나누어 맡아 집단 전체가 효율적으로 살아요'],
    ['혈연 개체가 함께 새끼를 키우고 사냥해요', '서열이 정해져 다툼이 줄어요', '리더가 방향을 정해요'],
  ];
  const ADV_ANS = [1, 1, 0, 2, 0];
  function resetRel() { S.rel = { type: REL.map(() => null), adv: REL.map(() => null), bad: {}, pop: REL.map(() => 1), shakeT: -9, solved: false }; }
  const relType = () => S.rel.type.filter((x) => x != null).length;
  const relAdv = () => S.rel.adv.filter((x) => x != null).length;
  const relRight = () => REL.filter((r, i) => S.rel.type[i] === r.ans && S.rel.adv[i] === ADV_ANS[i]).length;
  const RC = (i) => PHONE ? { x: 6 + (i % 2) * 237, y: 6 + Math.floor(i / 2) * 208, w: 231, h: 200 } : { x: 10 + i * 158, y: 14, w: 150, h: 452 };
  function relPill(i, k) { const c = RC(i); return PHONE ? { x: c.x + 6, y: c.y + (k === 0 ? 112 : 150), w: c.w - 12, h: k === 0 ? 34 : 46 } : { x: c.x + 6, y: c.y + (k === 0 ? 246 : 296), w: c.w - 12, h: k === 0 ? 38 : 148 }; }
  function relDown(p) {
    const q = S.rel; if (q.solved) return false;
    for (let i = 0; i < REL.length; i++) for (let k = 0; k < 2; k++) {
      const r = relPill(i, k);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        if (k === 0) q.type[i] = q.type[i] == null ? 0 : (q.type[i] + 1 >= RTYPE.length ? null : q.type[i] + 1);
        else q.adv[i] = q.adv[i] == null ? 0 : (q.adv[i] + 1 >= 3 ? null : q.adv[i] + 1);
        delete q.bad[i]; q.pop[i] = 0.4; SciSim.tween(q.pop, { [i]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false;
      }
    }
    return false;
  }
  function relScene(kind, x, y, w, h, t) {
    ctx.save(); D.roundRect(x, y, w, h, 14); ctx.clip();
    const cx = x + w / 2, cy = y + h / 2;
    if (kind === 'fish') {
      ctx.fillStyle = lakeGrad(x, y, w, h); ctx.fillRect(x, y, w, h);
      const r = Math.min(w, h) * 0.34; ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      drawFish(cx + Math.sin(t * 1.2) * 4, cy, 0, 11, '#f59e0b', false);
      const ph = (t * 0.5) % 1, ix = cx - (r + 24) + (ph < 0.55 ? ph / 0.55 * (r * 0.9) : Math.max(0, 1 - (ph - 0.55) / 0.15) * (r * 0.9)) * (RM ? 0 : 1);
      drawFish(RM ? cx - r - 24 : ix, cy + r * 0.45, 0, 8, '#94a3b8', false);
      if (!RM && ph > 0.5 && ph < 0.72) T(cx - r * 0.25, cy - r * 0.5, '!', 22, '#dc2626', 'center', 800);
    } else if (kind === 'hen') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fef3c7'); g.addColorStop(1, '#d9b873'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      E('🌾', cx + w * 0.3, cy + h * 0.22, 30);
      [['🐔', -0.3, 1], ['🐔', 0, 2], ['🐔', 0.3, 3]].forEach((hn, i) => {
        const peck = i === 0 && !RM ? Math.max(0, Math.sin(t * 5)) * 6 : 0;
        E(hn[0], cx + w * hn[1], cy + peck + 10, w * 0.2, { flip: i < 2 });
        D.sphere(cx + w * hn[1], cy - w * 0.12, 9, i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : '#b45309', { gloss: false, text: String(hn[2]), textScale: 1.2 });
      });
      T(cx, y + h - 10, '먹는 순서: 1 → 2 → 3', 13, '#7c5a1a', 'center', 800);
    } else if (kind === 'geese') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#bfe3ff'); g.addColorStop(1, '#eef8ff'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const sway = RM ? 0 : Math.sin(t * 1.1) * 8;
      const pos = [[0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]];
      pos.forEach((p, i) => { const bx = cx + p[0] * w * 0.15 + sway, by = cy - h * 0.2 + p[1] * h * 0.14 + (RM ? 0 : Math.sin(t * 6 + i) * 2); E('🐦', bx, by, i === 0 ? w * 0.16 : w * 0.13, { flip: true }); if (i === 0) E('👑', bx + 2, by - w * 0.1, 15); });
      T(cx, y + h - 12, '앞의 리더를 따라가요', 13, '#334155', 'center', 800);
    } else if (kind === 'bee') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff7d6'); g.addColorStop(1, '#fde68a'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const hx = cx - w * 0.12, hy = cy - h * 0.06, hr = Math.min(w, h) * 0.1;
      for (let a = 0; a < 7; a++) { const ang = a === 0 ? 0 : (a - 1) * Math.PI / 3, dx = a === 0 ? 0 : Math.cos(ang) * hr * 1.75, dy = a === 0 ? 0 : Math.sin(ang) * hr * 1.75; ctx.beginPath(); for (let k = 0; k < 6; k++) { const aa = k * Math.PI / 3 + Math.PI / 6; ctx.lineTo(hx + dx + Math.cos(aa) * hr, hy + dy + Math.sin(aa) * hr); } ctx.closePath(); ctx.fillStyle = a === 0 ? '#f59e0b' : '#fbbf24'; ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.5; ctx.stroke(); }
      E('👑', hx, hy - 2, hr * 1.1); E('🌸', x + w * 0.84, y + h * 0.3, 26);
      const bees = [['🐝', 0.4, '채집'], ['🐝', 0.5, '채집'], ['🐝', 0.0, '청소']];
      const ph = RM ? 0.3 : (t * 0.35) % 1;
      [0, 0.5].forEach((o, i) => { const f = (ph + o) % 1, tt = f < 0.5 ? f / 0.5 : 1 - (f - 0.5) / 0.5; E('🐝', hx + (x + w * 0.84 - hx) * tt + hr, hy + 10 - Math.sin(tt * Math.PI) * 24, 20); });
      E('🐝', hx + hr * 2.4 + Math.sin(t * 3) * 3, hy + hr * 2.2, 18);
      T(cx, y + h - 10, '채집 · 육아 · 경비 · 여왕', 13, '#7c5a1a', 'center', 800);
    } else {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fde9b0'); g.addColorStop(1, '#e8c377'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const sw = RM ? 0 : Math.sin(t * 1.6) * 3;
      E('🦁', cx - w * 0.2 + sw, cy + 4, w * 0.3); E('🦁', cx + w * 0.12 - sw, cy + 12, w * 0.24, { flip: true });
      E('🦁', cx - w * 0.02 + sw * 0.5, cy + h * 0.2, w * 0.14); E('🦁', cx + w * 0.26 - sw, cy + h * 0.22, w * 0.12, { flip: true });
      ctx.strokeStyle = 'rgba(180,60,40,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2.5; D.roundRect(x + 10, y + 10, w - 20, h - 40, 16); ctx.stroke(); ctx.setLineDash([]);
      T(cx, y + h - 10, '혈연 관계의 가족', 13, '#7a2e1e', 'center', 800);
    }
    ctx.restore();
  }
  function drawRel(dt, t) {
    const q = S.rel;
    bgFill('#eef7f0', '#f3fbf0');
    REL.forEach((r, i) => {
      const c = RC(i), pop = clamp(q.pop[i], 0, 1.1), bad = q.bad[i];
      const sk = bad ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
      ctx.save(); ctx.translate(sk, 0);
      panel(c.x, c.y, c.w, c.h, 16);
      if (bad) { D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.lineWidth = 3.5; ctx.strokeStyle = '#dc2626'; ctx.stroke(); }
      const sh = PHONE ? 78 : 150;
      relScene(r.scene, c.x + 6, c.y + 6, c.w - 12, PHONE ? 80 : 200, t);
      T(c.x + c.w / 2, c.y + (PHONE ? 104 : 232), r.n, PHONE ? 14 : 15, '#1f2d44', 'center', 800);
      // 유형 / 이점 고르기
      const p0 = relPill(i, 0), p1 = relPill(i, 1);
      const ti = q.type[i], ai = q.adv[i];
      ctx.save(); ctx.translate(p0.x + p0.w / 2, p0.y + p0.h / 2); ctx.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop);
      D.roundRect(-p0.w / 2, -p0.h / 2, p0.w, p0.h, p0.h / 2); ctx.fillStyle = ti == null ? '#fff' : RCOL[ti]; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = ti == null ? '#94a3b8' : '#fff'; ctx.setLineDash(ti == null ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
      T(0, 5.5, ti == null ? '👆 유형 고르기' : RTYPE[ti], PHONE ? 14 : 15.5, ti == null ? '#64748b' : '#fff', 'center', 800);
      ctx.restore();
      if (!PHONE) {
        D.roundRect(p1.x, p1.y, p1.w, p1.h, 12); ctx.fillStyle = ai == null ? '#fff' : '#f1f5f9'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = bad ? '#dc2626' : ai == null ? '#94a3b8' : '#64748b'; ctx.setLineDash(ai == null ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
        T(p1.x + p1.w / 2, p1.y + 22, '이점', 13, '#64748b', 'center', 800);
        if (ai == null) T(p1.x + p1.w / 2, p1.y + p1.h / 2 + 14, '👆 눌러서 고르기', 13.5, '#94a3b8', 'center', 800);
        else textBlock(p1.x + p1.w / 2, p1.y + 46, p1.w - 16, ADV[i][ai], 13.5, '#26324a', 18.5, 800, 'center');
      } else {
        D.roundRect(p1.x, p1.y, p1.w, p1.h, 10); ctx.fillStyle = ai == null ? '#fff' : '#f1f5f9'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = bad ? '#dc2626' : ai == null ? '#94a3b8' : '#64748b'; ctx.setLineDash(ai == null ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
        if (ai == null) T(p1.x + p1.w / 2, p1.y + p1.h / 2 + 5, '👆 이점 고르기', 13.5, '#94a3b8', 'center', 800);
        else textBlock(p1.x + p1.w / 2, p1.y + 20, p1.w - 12, ADV[i][ai], 13, '#26324a', 16.5, 800, 'center');
      }
      ctx.restore();
    });
    if (q.solved) D.label(PHONE ? 354 : 400, PHONE ? 520 : 506, '✅ 다섯 가지 관계를 모두 구분했어요', { bg: '#15803d', size: 14.5 });
    else T(PHONE ? 354 : 400, PHONE ? 516 : 506, '유형 이름과 이점을 눌러 바꿔요 (유형 ' + relType() + '/5 · 이점 ' + relAdv() + '/5)', 14, '#64748b', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { dens: '📏 붕어 개체군의 밀도', mark: '🎣 표지 재포획법', growth: '📈 짚신벌레의 생장 곡선', age: '🧑‍🤝‍🧑 연령 구조와 개체 수 변화', rel: '🐝 개체군 안의 상호작용' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    const q = S.mk;
    if (q) {
      $('#trialNo').textContent = String(q.trialNo);
      $('#bMk1').disabled = q.phase !== 0; $('#bMk2').disabled = q.phase !== 1; $('#bMk3').disabled = !(q.phase === 2 && q.mixT >= 1.6);
      $('#bMk3').textContent = q.phase === 2 && q.mixT < 1.6 ? '③ 섞이는 중… ⏳' : '③ ' + MK.n + '마리 다시 잡기';
      $('#nIn').disabled = q.phase !== 3; $('#bNCheck').disabled = q.phase !== 3; $('#bMkNext').disabled = q.phase !== 4 && !(q.phase === 3 && q.cur.m === 0);
      $('#mkNote').innerHTML = q.phase === 0 ? '먼저 호수에서 <b>' + MK.M + '마리</b>를 잡아 표지를 붙여요.' : q.phase === 1 ? '표지를 붙였어요. 이제 호수에 놓아주고 <b>섞이게</b> 해요.' : q.phase === 2 ? '표지한 물고기가 호수 전체에 섞이도록 기다려요.' : q.phase === 3 ? '다시 잡은 <b>' + q.cur.n + '마리</b> 중 표지된 것은 <b>' + q.cur.m + '마리</b>예요. N을 계산해요.' : q.phase === 4 ? '✅ 이번 시행을 기록했어요. 새 호수에서 다시 해 보세요.' : '물고기가 움직이는 중이에요…';
    }
    if (S.gr) {
      $$('#envSeg button').forEach((b) => b.classList.toggle('on', b.dataset.e === S.gr.env));
      $('#sDay').value = S.gr.day; $('#oDay').textContent = S.gr.day + '일'; $('#sDay').style.setProperty('--pct', (S.gr.day / 18 * 100) + '%');
      $('#grNote').innerHTML = grCount() < 10 ? '표의 값에 맞게 그래프를 눌러 점을 찍어요. <b>' + grCount() + ' / 10</b>' : S.gr.env === 'S' ? '점을 이으면 <b>S자 곡선</b>이에요. 슬라이더로 날짜를 바꾸며 출생과 사망을 비교해요.' : '먹이와 공간이 무한하면 <b>J자 곡선</b>(이론)으로 계속 늘어요.';
    }
    if (S.age) {
      $('#sPre').value = S.age.pre; $('#oPre').textContent = S.age.pre + ' %'; $('#sPre').style.setProperty('--pct', ((S.age.pre - 10) / 40 * 100) + '%');
      $('#agePlay').disabled = !(S.age.solved || (game && game.free)) || S.age.play;
    }
    if (S.dens) { const inp = $('#denIn'); inp.classList.toggle('ok', S.dens.ok); }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#denIn').addEventListener('input', (e) => { S.dens.val = e.target.value; S.dens.ok = denOK(); updateCtl(); if (S.dens.ok) { Sound.success(); parts.burst(LKD.x + LKD.w / 2, LKD.y + LKD.h / 2, { count: 14, colors: ['#16a34a', '#fde047', '#fff'], speed: 120, size: 3.4, life: 0.8 }); } });
  $('#bMk1').addEventListener('click', () => mkAct(1)); $('#bMk2').addEventListener('click', () => mkAct(2)); $('#bMk3').addEventListener('click', () => mkAct(3));
  $('#bNCheck').addEventListener('click', mkCheck);
  $('#nIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') mkCheck(); });
  $('#bMkNext').addEventListener('click', () => { Sound.click(); newMk(true); updateCtl(); hideHint(); });
  $$('#envSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.gr.env = b.dataset.e; if (b.dataset.e === 'J') S.gr.jSeen = true; updateCtl(); }));
  $('#sDay').addEventListener('input', (e) => { S.gr.day = +e.target.value; Sound.tick(); updateCtl(); });
  $('#sPre').addEventListener('input', (e) => { S.age.pre = +e.target.value; S.age.dTouched = true; Sound.tick(); updateCtl(); });
  $('#agePlay').addEventListener('click', () => { Sound.click(); playProj(); updateCtl(); });
  const ageSel = [];
  (function buildAgeSel() {
    const box = $('#ageSel');
    AGE.forEach((a, i) => {
      const row = document.createElement('div'); row.className = 'sel-row'; row.innerHTML = '<div class="q" style="color:' + a.col + '">' + a.n + '</div>';
      const two = document.createElement('div'); two.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
      [['모양', SHAPES], ['변화', TRENDS]].forEach(([nm_, opts], k) => {
        const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', a.n + ' ' + nm_);
        sel.innerHTML = '<option value="">' + nm_ + ' 고르기</option>' + opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
        sel.addEventListener('change', () => { S.age.pick[i][k] = sel.value === '' ? null : +sel.value; delete S.age.bad[i]; sel.classList.remove('ok', 'bad'); Sound.click(); });
        two.appendChild(sel); ageSel.push(sel);
      });
      row.appendChild(two); box.appendChild(row);
    });
  })();

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'dens') return densDown(p); if (S.mode === 'growth') return growDown(p); if (S.mode === 'rel') return relDown(p); return false; },
    hover(p) {
      if (S.mode === 'dens') return p.x >= LKD.x && p.x <= LKD.x + LKD.w && p.y >= LKD.y && p.y <= LKD.y + LKD.h ? 'pointer' : 'default';
      if (S.mode === 'growth') return p.x >= GB.x && p.x <= GB.x + GB.w && p.y >= GB.y && p.y <= GB.y + GB.h ? 'crosshair' : 'default';
      if (S.mode === 'rel') { for (let i = 0; i < REL.length; i++) for (let k = 0; k < 2; k++) { const r = relPill(i, k); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } }
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'dens') { L1 = '붕어 개체 수'; a = LAKE_N + '마리'; L2 = '호수의 넓이'; b = LAKE_AREA + ' km²'; L3 = S.dens.sel == null ? '고른 칸' : (S.dens.sel + 1) + '번 칸'; c = S.dens.sel == null ? '—' : CELL_CNT[S.dens.sel] + '마리'; }
    else if (m === 'mark') { const q = S.mk; L1 = '처음 표지한 수 M'; a = q.cur.M == null ? '—' : q.cur.M + '마리'; L2 = '다시 잡은 수 n'; b = q.cur.n == null ? '—' : q.cur.n + '마리'; L3 = '그중 표지된 수 m'; c = q.cur.m == null ? '—' : q.cur.m + '마리'; }
    else if (m === 'growth') { const q = S.gr, di = G_DAYS.indexOf(q.day); L1 = '관찰한 날'; a = q.day + '일째'; L2 = '개체 수'; b = q.pts[di] ? G_N[di] + '마리/mL' : '— (점을 찍어요)'; L3 = '환경 수용력'; c = q.ok ? '약 ' + G_K : '—'; }
    else if (m === 'age') { const q = S.age; L1 = '판정한 칸'; a = agePicked() + ' / 6'; L2 = '내 개체군(생식 전)'; b = q.pre + ' %'; L3 = '내 개체군 예상'; c = SHAPES[dShape(q.pre)] + ' · ' + TRENDS[dTrend(q.pre)]; }
    else { L1 = '유형을 고른 카드'; a = relType() + ' / 5'; L2 = '이점을 고른 카드'; b = relAdv() + ' / 5'; L3 = '다루는 관계'; c = '개체군 안 5가지'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    S.dens.val = '300'; S.dens.ok = true; $('#denIn').value = '300'; CELL_CNT.forEach((c, i) => { S.dens.seen[i] = true; });
    S.gr.pts = G_DAYS.map(() => true); S.gr.pop = G_DAYS.map(() => 1); S.gr.ok = true; S.gr.line = 1;
    S.age.pick = AGE.map((a) => [a.shape, a.trend]); ageSel.forEach((s, i) => { s.value = String(S.age.pick[Math.floor(i / 2)][i % 2]); s.classList.add('ok'); }); S.age.solved = true; S.age.projP = AGE_YEARS;
    S.rel.type = REL.map((r) => r.ans); S.rel.adv = ADV_ANS.slice(); S.rel.solved = true;
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '개체군 밀도와 개체 수 추정', short: '개체군 밀도', icon: '📏', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 숲속 사슴이 몇 마리인지 다 세지 않고도 알아낼 수 있을까? 개체군은 어떻게 늘고 줄까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 생태계 평형과 개체군 변동(포식자와 피식자의 개체 수 변화)을 배웠어요. 이번에는 <b>한 종의 개체군</b>에 집중해, 개체 수를 어떻게 나타내고 추정하는지 알아봐요.</div>' +
        '<p>호수의 붕어로 <b>밀도</b>를 구하고, 모두 세기 어려울 때 쓰는 <b>표지 재포획법</b>으로 개체 수를 추정해 봐요.</p>',
      features: ['dens', 'mark'],
      setup() { resetDens(); newMk(false); setMode('dens'); },
      recap: '개체군 밀도는 단위 면적당 개체 수(개체 수 / 면적)예요. 직접 세기 어려우면 표지 재포획법으로 N = (M × n) / m 을 계산해 개체 수를 추정해요.',
      summary: '<ul><li><b>개체군</b>: 같은 지역에 사는 같은 종의 개체들의 무리</li><li><b>밀도</b> = 개체 수 / 면적. 예: 붕어 600마리 / 2 km² = <b>300 마리/km²</b></li><li><b>표지 재포획법</b>: 처음 잡아 표지한 수 M, 다시 잡은 수 n, 그중 표지된 수 m 일 때 전체 개체 수 <b>N = (M × n) / m</b> (추정값). 예: M 50, n 40, m 5 → N = 400.</li><li>가정: 표지가 섞이고 표지가 떨어지지 않으며 이동·출생·사망이 없어요. 여러 번 해 보면 추정값이 참값 근처에서 조금씩 달라져요.</li></ul>',
      missions: [
        {
          id: 'dens', title: '개체군 밀도 계산',
          goal: '붕어 <b>600마리</b>가 넓이 <b>2 km²</b>의 호수에 살아요. <b>밀도(마리/km²)</b>를 오른쪽 칸에 입력하세요.',
          hint: '밀도 = 개체 수 / 면적이에요. 호수의 칸 하나는 0.25 km²예요. 칸을 눌러 마리 수를 세어 보면 칸마다 조금씩 다르지만 평균은 같아요.',
          setup() { setMode('dens'); },
          check: () => S.dens.ok,
          hold: 0.5,
          status: () => '입력한 밀도 ' + (S.dens.val === '' ? '—' : S.dens.val + ' 마리/km²') + ' &nbsp; 센 칸 ' + denSeen() + ' / 8',
          explain: '밀도 = 600마리 / 2 km² = <b>300 마리/km²</b>예요. 칸 8개의 평균은 75마리이고, 75 / 0.25 km² = 300 마리/km²로 같아요.',
        },
        {
          id: 'mark', title: '표지 재포획으로 개체 수 추정',
          goal: '<b>🎣 표지 재포획</b> 화면에서 <b>3번</b> 시행하며 매번 추정한 개체 수 <b>N = (M × n) / m</b>을 계산해 입력하세요.',
          hint: '① 50마리 잡아 표지하기 → ② 놓아주고 섞이기 → ③ 40마리 다시 잡기 순서로 해요. 다시 잡은 것 중 표지된 수 m으로 계산하고, 소수점 아래는 반올림해요.',
          setup() { setMode('mark'); },
          check: () => mkOK() >= 3,
          hold: 0.5,
          status: () => '기록한 시행 ' + mkOK() + ' / 3',
          explain: '첫 시행은 M = 50, n = 40, m = 5 → N = 50 × 40 / 5 = <b>400</b>이에요. 시행마다 m이 조금씩 달라서 추정값도 <b>참값(400) 근처에서 흩어져요</b>. 많이 반복할수록 평균이 참값에 가까워져요.',
        },
        {
          type: 'quiz', title: '표지가 떨어지면',
          goal: '표지 재포획법에서 물고기에 붙인 <b>표지가 일부 떨어져</b> 버렸다면 추정값은 어떻게 될까요?',
          setup() { setMode('mark'); },
          choices: ['참값보다 작게 추정된다', '참값보다 크게 추정된다(과대 추정)', '추정값에 영향이 없다', '개체 수를 추정할 수 없게 된다'],
          answer: 1,
          feedback: ['표지가 떨어지면 다시 잡은 표지 개체 수 m이 실제보다 적게 세어져요. m이 작으면 N = M × n / m 은 커져요.', '', 'm이 달라지면 추정값도 달라져요. m은 계산식의 분모예요.', '표지된 개체가 하나라도 있으면 계산할 수 있지만 값이 틀려져요.'],
          explain: '표지가 떨어지면 다시 잡은 것 중 표지된 개체 수 <b>m이 실제보다 적게</b> 세어져요. N = M × n / m 에서 분모 m이 작아지므로 <b>과대 추정</b>이 돼요.',
        },
      ],
    },
    {
      title: '생장 곡선: 늘다가 멈추는 개체군', short: '생장 곡선', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 개체 수와 밀도를 구했어요. 이번에는 개체 수가 <b>시간에 따라 어떻게 변하는지</b> 짚신벌레 배양 자료로 알아봐요.</div>' +
        '<p>배양 기록을 그래프에 직접 찍어 곡선을 그리고, 먹이와 공간이 <b>한정된 경우(S자)</b>와 <b>무한한 경우(J자, 이론)</b>를 비교해요. 곡선이 평평해지는 때의 출생과 사망도 확인해요.</p>',
      features: ['growth'],
      setup() { resetGrow(); setMode('growth'); },
      recap: '먹이와 공간이 한정된 환경에서는 환경 저항 때문에 개체군이 S자 곡선으로 늘다가 환경 수용력에서 멈춰요. 이때 출생수와 사망수가 같아요.',
      summary: '<ul><li><b>J자 곡선(이론)</b>: 먹이와 공간이 무한하면 개체 수가 계속 빠르게 늘어요.</li><li><b>S자 곡선(실제)</b>: 환경 저항(먹이 부족, 노폐물, 공간 부족, 포식)이 커져 증가가 느려지다가 <b>환경 수용력</b>(이 예시는 약 500마리/mL)에서 멈춰요.</li><li>환경 수용력에서는 <b>출생수 = 사망수</b>라서 개체 수가 더 늘지 않아요.</li></ul>',
      missions: [
        {
          id: 'plot', title: '배양 기록 그래프 그리기',
          goal: '오른쪽 표의 값에 맞게 그래프를 눌러 <b>점 10개</b>를 모두 찍으세요.',
          hint: '날짜(가로) 열 위에서, 개체 수(세로) 눈금 높이를 눌러요. 예: 4일 60마리는 세로 눈금 0과 100 사이에서 약 60%쯤이에요. 틀리면 알려 줘요.',
          setup() { setMode('growth'); },
          check: () => grCount() === 10,
          hold: 0.6,
          status: () => '찍은 점 ' + grCount() + ' / 10',
          explain: '점을 이으면 처음에는 천천히, 중간에는 빠르게 늘다가 마지막에는 <b>500마리/mL</b> 근처에서 평평해지는 <b>S자 곡선</b>이에요.',
        },
        {
          id: 'bd', title: 'S자 곡선과 J자 곡선, 출생과 사망',
          goal: '<b>먹이·공간 무한(이론)</b>을 눌러 J자 곡선을 본 뒤, 날짜를 바꿔 <b>출생수와 사망수가 같아지는 날</b>을 찾으세요. (한정 조건으로 돌아와 확인해요)',
          hint: '아래 슬라이더나 점을 눌러 날짜를 바꾸면 출생과 사망 막대가 달라져요. 개체 수가 가장 많고 더 늘지 않는 때를 찾아요.',
          setup() { setMode('growth'); S.gr.jSeen = false; S.gr.env = 'S'; S.gr.day = 8; updateCtl(); },
          check: () => S.gr.jSeen && grCount() === 10 && S.gr.day >= 16,
          hold: 0.6,
          status: () => mark(S.gr.jSeen) + ' J자 곡선 보기 &nbsp; ' + mark(S.gr.day >= 16) + ' 출생 = 사망인 날 (지금 ' + S.gr.day + '일)',
          explain: '16일과 18일에는 개체 수가 환경 수용력 500에 이르러 <b>출생수 = 사망수(225 = 225)</b>가 돼요. J자 곡선은 환경 저항이 없다고 가정한 이론이라 계속 올라가요.',
        },
        {
          type: 'quiz', title: 'S자 곡선에서 증가가 멈추는 까닭',
          goal: 'S자 곡선에서 개체 수가 <b>더 이상 늘지 않는</b> 까닭으로 가장 알맞은 것은?',
          setup() { setMode('growth'); },
          choices: ['개체군이 스스로 번식을 멈추기로 하기 때문이다', '먹이와 공간이 부족하고 노폐물이 쌓이는 등 환경 저항이 커져 출생수와 사망수가 같아지기 때문이다', '처음부터 환경 수용력이 없기 때문이다', '먹이와 공간이 무한하기 때문이다'],
          answer: 1,
          feedback: ['생물이 번식을 멈추기로 결정하는 것이 아니에요. 환경 조건 때문에 출생수와 사망수가 변하는 거예요.', '', '환경 수용력은 환경이 지탱할 수 있는 최대 개체 수예요. 이 환경에서는 약 500이에요.', '무한하면 J자 곡선이 돼요.'],
          explain: '개체 수가 늘수록 먹이·공간 부족, 노폐물 같은 <b>환경 저항</b>이 커져 출생은 줄고 사망은 늘어요. 그래서 <b>출생수 = 사망수</b>가 되는 환경 수용력에서 증가가 멈춰요.',
        },
      ],
    },
    {
      title: '연령 구조: 앞으로 늘까, 줄까?', short: '연령 구조', icon: '🧑‍🤝‍🧑', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 개체 수가 시간에 따라 변하는 모습을 봤어요. 이번에는 <b>지금의 연령 구조</b>를 보고 앞으로의 변화를 <b>예측</b>해 봐요.</div>' +
        '<p>개체군 A·B·C의 <b>생식 전·생식·생식 후</b> 비율을 보고 <b>피라미드형·종형·항아리형</b>을 판정하고, 앞으로 개체 수가 어떻게 될지 예측해요.</p>',
      features: ['age'],
      setup() { resetAge(); setMode('age'); },
      recap: '연령 구조에서 생식 전 개체의 비율이 높으면(피라미드형) 앞으로 늘고, 비슷하면(종형) 유지되고, 낮으면(항아리형) 줄어들 가능성이 커요.',
      summary: '<ul><li><b>피라미드형</b>: 생식 전 개체가 많아요(예 45 / 35 / 20 %) → 개체 수 <b>증가</b></li><li><b>종형</b>: 생식 전·후가 비슷해요(예 30 / 40 / 30 %) → 개체 수 <b>유지</b></li><li><b>항아리형</b>: 생식 전 개체가 적어요(예 15 / 40 / 45 %) → 개체 수 <b>감소</b></li><li>연령 구조는 개체군의 미래를 예측하는 단서가 돼요.</li></ul>',
      missions: [
        {
          id: 'shape', title: '연령 구조 판정과 예측', manual: true,
          goal: '개체군 A·B·C의 <b>모양</b>(피라미드형·종형·항아리형)과 앞으로의 <b>변화</b>(증가·유지·감소)를 모두 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '막대 모양을 보세요. 아래(생식 전)가 넓으면 피라미드형, 위·아래가 비슷하면 종형, 위(생식 후)가 넓으면 항아리형이에요. 생식 전 개체가 많을수록 앞으로 늘어나요.',
          setup() { setMode('age'); },
          check() {
            const q = S.age;
            if (agePicked() < 6) return '아직 고르지 않은 칸이 ' + (6 - agePicked()) + '개 있어요.';
            const bad = [];
            AGE.forEach((a, i) => {
              const ps = q.pick[i][0] === a.shape, pt = q.pick[i][1] === a.trend;
              ageSel[i * 2].classList.toggle('ok', ps); ageSel[i * 2 + 1].classList.toggle('ok', pt);
              if (!ps && !ageSel[i * 2].classList.contains('bad')) ageSel[i * 2].classList.add('bad'); if (ps) ageSel[i * 2].classList.remove('bad');
              if (!pt && !ageSel[i * 2 + 1].classList.contains('bad')) ageSel[i * 2 + 1].classList.add('bad'); if (pt) ageSel[i * 2 + 1].classList.remove('bad');
              if (!ps || !pt) { bad.push(i); if (!q.bad[i]) q.bad[i] = true; } else delete q.bad[i];
            });
            if (bad.length) return '빨간 칸을 다시 보세요. 생식 전 비율이 높으면 피라미드형(증가), 생식 후 비율이 높으면 항아리형(감소)이에요. (' + bad.map((i) => AGE[i].n).join(', ') + ')';
            return true;
          },
          status: () => '고른 칸 ' + agePicked() + ' / 6',
          explain: '<b>A</b>는 생식 전 45 %로 가장 많아 <b>피라미드형 · 증가</b>, <b>B</b>는 30 / 40 / 30 으로 <b>종형 · 유지</b>, <b>C</b>는 생식 후 45 %로 <b>항아리형 · 감소</b>예요. 20년 뒤 모습(예시 값): A 약 164, B 100, C 약 54 (지금 = 100).',
        },
        {
          id: 'decl', title: '감소하는 개체군 만들기',
          goal: '<b>내 개체군</b>의 <b>생식 전 비율</b> 슬라이더를 움직여 <b>항아리형(감소)</b>이 되게 만드세요.',
          hint: '생식 전 비율이 낮아질수록 생식 후 비율이 높아져요(둘의 합은 60 %). 생식 전이 생식 후보다 적으면 항아리형이에요.',
          setup() { setMode('age'); S.age.pre = PRE_DEF; S.age.dTouched = false; updateCtl(); },
          check: () => dTrend(S.age.pre) === 2,
          hold: 0.8,
          status: () => '생식 전 ' + S.age.pre + ' % · 생식 후 ' + (60 - S.age.pre) + ' % → ' + SHAPES[dShape(S.age.pre)] + ' (' + TRENDS[dTrend(S.age.pre)] + ')',
          explain: '생식 전 비율이 생식 후보다 낮아지면(<b>25 % 이하</b>) <b>항아리형</b>이 되고 개체 수가 줄어요. 30 %에서는 종형(유지)이에요.',
        },
        {
          type: 'quiz', title: '생식 전 개체의 비율',
          goal: '어떤 개체군에서 <b>생식 전 개체의 비율이 높다</b>면 앞으로 어떻게 될 가능성이 클까요?',
          setup() { setMode('age'); },
          choices: ['개체 수가 줄어들 가능성이 크다', '개체 수가 늘어날 가능성이 크다', '개체 수가 변하지 않는다', '곧 모든 개체가 생식 후 개체가 되어 사라진다'],
          answer: 1,
          feedback: ['생식 전 개체가 적을 때 줄어들어요. 생식 전 개체가 많으면 앞으로 번식할 개체가 많아요.', '', '생식 전 개체와 생식 후 개체의 비율이 비슷할 때 유지돼요.', '생식 전 개체가 자라 생식에 참여하므로 개체 수가 늘 가능성이 커요.'],
          explain: '생식 전 개체가 많으면 시간이 지나 이들이 <b>번식에 참여</b>하므로 개체 수가 <b>늘어날 가능성</b>이 커요(피라미드형).',
        },
      ],
    },
    {
      title: '개체군 안의 관계', short: '개체군 내 관계', icon: '🐝', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 개체군이 어떻게 늘고 줄지 살폈어요. 같은 종의 개체들은 한 무리 안에서 <b>서로 어떤 관계</b>를 맺으며 살까요?</div>' +
        '<p>다섯 장면(은어, 닭, 기러기, 꿀벌, 사자)이 <b>텃세·순위제·리더제·사회생활·가족생활</b> 중 무엇인지 구분하고, 각각의 <b>이점</b>도 찾아요.</p>',
      features: ['rel'],
      setup() { resetRel(); setMode('rel'); },
      recap: '개체군 안에서는 텃세(영역), 순위제(서열), 리더제(이끄는 개체), 사회생활(분업), 가족생활(혈연)로 서로 관계를 맺어 먹이·번식·방어에 유리해요.',
      summary: '<ul><li><b>텃세</b>: 먹이·번식 장소를 확보하려고 일정한 영역을 독점하고 지켜요. (은어, 호랑이)</li><li><b>순위제</b>: 서열이 정해져 다툼이 줄고 질서가 유지돼요. (닭의 모이 쪼기)</li><li><b>리더제</b>: 한 개체가 무리를 이끌고 나머지가 따라요. (기러기, 코끼리)</li><li><b>사회생활</b>: 구성원이 일을 나누어 맡는 분업을 해요. (꿀벌, 개미)</li><li><b>가족생활</b>: 혈연 관계의 개체들이 함께 살며 새끼를 길러요. (사자)</li></ul>',
      missions: [
        {
          id: 'rel', title: '개체군 안의 관계 분류', manual: true,
          goal: '장면 5장마다 <b>유형 이름</b>과 <b>이점</b>을 눌러 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '영역을 지키면 텃세, 먹는 순서가 정해져 있으면 순위제, 앞에서 이끌면 리더제, 일을 나누면 사회생활, 혈연 가족이면 가족생활이에요.',
          setup() { setMode('rel'); },
          check() {
            const q = S.rel;
            if (relType() < 5 || relAdv() < 5) return '아직 고르지 않은 칸이 있어요. (유형 ' + relType() + ' / 5, 이점 ' + relAdv() + ' / 5)';
            const bad = []; let msg = '';
            REL.forEach((r, i) => { const ok = q.type[i] === r.ans && q.adv[i] === ADV_ANS[i]; if (!ok) { bad.push(i); if (!q.bad[i]) { q.bad[i] = true; q.shakeT = S.clock; } if (!msg) msg = q.type[i] !== r.ans ? r.n + ': ' + r.wrong : r.n + ': 이점을 다시 골라요. ' + RTYPE[r.ans] + '의 이점이 무엇인지 떠올려 보세요.'; } else delete q.bad[i]; });
            if (bad.length) return '빨간 카드가 ' + bad.length + '장 있어요. ' + msg;
            return true;
          },
          status: () => '유형 ' + relType() + ' / 5 &nbsp; 이점 ' + relAdv() + ' / 5 &nbsp; 모두 맞은 카드 ' + relRight(),
          explain: '<b>은어</b>: 텃세(영역 독점, 먹이·번식 장소 확보) · <b>닭</b>: 순위제(서열로 다툼 감소) · <b>기러기</b>: 리더제(리더가 방향 결정) · <b>꿀벌</b>: 사회생활(분업) · <b>사자</b>: 가족생활(혈연 개체의 공동생활)이에요.',
        },
        {
          type: 'quiz', title: '사회생활과 가족생활',
          goal: '다음 중 <b>사회생활</b>과 <b>가족생활</b>을 올바르게 구분한 것은?',
          setup() { setMode('rel'); },
          choices: ['사회생활은 혈연 개체들의 생활이고, 가족생활은 일을 나누어 맡는 분업 생활이다', '사회생활은 구성원이 일을 나누어 맡는 분업이 핵심이고, 가족생활은 혈연 개체들이 함께 사는 것이 핵심이다', '둘 다 영역을 독점해 다른 개체의 침입을 막는 생활이다', '둘 다 서열을 정해 먹이를 먹는 순서를 정하는 생활이다'],
          answer: 1,
          feedback: ['두 용어가 서로 바뀌었어요. 꿀벌처럼 일을 나누면 사회생활, 사자 가족처럼 혈연 개체의 생활은 가족생활이에요.', '', '영역을 독점하는 것은 텃세예요.', '서열을 정하는 것은 순위제예요.'],
          explain: '<b>사회생활</b>은 꿀벌·개미처럼 구성원이 일을 나누어 맡는 <b>분업</b>이 핵심이고, <b>가족생활</b>은 사자처럼 <b>혈연 관계</b>의 개체들이 함께 사는 것이 핵심이에요. 텃세는 영역, 순위제는 서열이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-population', mount: '#game', badge: '개체군 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { dens: '📏 붕어 호수와 밀도', mark: '🎣 표지 재포획 시행', growth: '📈 짚신벌레 생장 곡선', age: '🧑‍🤝‍🧑 연령 구조 · 내 개체군', rel: '🐝 개체군 안의 관계 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetDens(); newMk(false); resetGrow(); resetAge(); resetRel();
  setMode('dens');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepMk(dt); stepGrow(dt); stepAge(dt);
    switch (S.mode) {
      case 'dens': drawDens(dt, t); break;
      case 'mark': drawMark(dt, t); break;
      case 'growth': drawGrow(dt, t); break;
      case 'age': drawAge(dt, t); break;
      default: drawRel(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm) {
      if (cm.id === 'shape' && !S.age.solved) { S.age.solved = true; playProj(); updateCtl(); }
      if (cm.id === 'rel' && !S.rel.solved) { S.rel.solved = true; REL.forEach((r, i) => { const c = RC(i); parts.burst(c.x + c.w / 2, c.y + c.h * 0.6, { count: 8, colors: [RCOL[r.ans], '#fff'], speed: 100, size: 3, life: 0.7 }); }); }
    }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, G_DAYS, G_N, GB, gx, gy, LKD, CELL_CNT, AGE, REL, ADV_ANS, relPill, RC, mkAct, mkCheck, MK, dShape, dTrend, autoFill, ageSel,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepMk(0.02); stepGrow(0.02); stepAge(0.02); } },
  };
})();
