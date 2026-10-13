/* =========================================================
   중3 Ⅵ. 생식과 유전 - 수정과 발생  [9과21-03]
   ① 관찰: 수정 (정자 → 난자, 수정막, 23 + 23 = 46)
   ② 모형: 난할 (1 → 2 → 4 → … → 32세포, 전체 크기는 그대로)
   ③ 분석: 난할의 특징 (세포 수·세포 하나의 부피·전체 부피 그래프, 체세포분열과 비교)
   ④ 적용: 발생 모형 (점토 모형을 발생 순서대로 놓기)
   ※ 난할만 다룹니다 (상실배·포배·낭배 등의 용어는 쓰지 않음)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = SciSim.reduceMotion;
  const ease = SciSim.ease;

  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#fdf3ea' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const { rgba, shade, mix } = SciSim.color;
  const parts = new SciSim.Particles();
  let game = null;
  let F = new Set();
  const on = (f) => (game ? game.has(f) : F.has(f));
  const isNew = (f) => !!(game && game.isNew(f));
  const nowS = () => performance.now() / 1000;
  const smooth = (u, a, b) => clamp((u - a) / (b - a), 0, 1);

  const PINK = '#e0518d', BLUE = '#3b6fe0';
  const CELL = '#ffc9a0';
  const SCENES = ['fert', 'cleave', 'graph', 'clay'];
  let scene = null;
  let tNow = 0;

  /* ---------- 도우미 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }
  const mark = (b) => (b ? '✅' : '⬜');
  const fracText = (n) => (n === 1 ? '1' : '1/' + n);

  /* =========================================================
     난할 배치 계산 (반지름 1인 수정막 안에서 세포가 차지하는 자리)
     한 세대마다 세포가 둘로 나뉘고, 세포 하나의 부피는 절반 → 반지름은 1/∛2
     ========================================================= */
  const FILL = 0.82;                       // 수정란 반지름 / 수정막 안쪽 반지름
  const LAY = [];                          // LAY[g] = 분열 g회 뒤의 세포 배치
  function relax(cells, iters) {
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const a = cells[i], b = cells[j];
          let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          let d = Math.hypot(dx, dy, dz);
          const min = (a.r + b.r) * 0.97;
          if (d < min) {
            if (d < 1e-6) { dx = 1; dy = 0; dz = 0; d = 1; }
            const k = (min - d) / d * 0.5 * 0.6;
            a.x -= dx * k; a.y -= dy * k; a.z -= dz * k;
            b.x += dx * k; b.y += dy * k; b.z += dz * k;
          }
        }
      }
      cells.forEach((c) => {
        c.x *= 0.996; c.y *= 0.996; c.z *= 0.996;
        const L = Math.hypot(c.x, c.y, c.z), mx = 1 - c.r - 0.01;
        if (L > mx) { const s = mx / L; c.x *= s; c.y *= s; c.z *= s; }
      });
    }
  }
  (function buildLayouts() {
    const rnd = mulberry32(21);
    let cur = [{ x: 0, y: 0, z: 0, r: FILL }];
    LAY[0] = cur; LAY[0].axes = [];
    for (let g = 1; g <= 5; g++) {
      const N = 1 << g, rN = FILL / Math.cbrt(N);
      const base = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][(g - 1) % 3];
      const next = [], axes = [];
      cur.forEach((c) => {
        let ax = base.map((v) => v + (rnd() - 0.5) * 0.35);
        const L = Math.hypot(ax[0], ax[1], ax[2]); ax = ax.map((v) => v / L);
        axes.push(ax);
        const off = c.r * 0.55;
        next.push({ x: c.x + ax[0] * off, y: c.y + ax[1] * off, z: c.z + ax[2] * off, r: rN });
        next.push({ x: c.x - ax[0] * off, y: c.y - ax[1] * off, z: c.z - ax[2] * off, r: rN });
      });
      relax(next, 320);
      LAY[g - 1].axes = axes;
      LAY[g] = next; LAY[g].axes = [];
      cur = next;
    }
  })();

  /* ---------- 3D 투영 (y축 회전 + 살짝 기울임) ---------- */
  const PITCH = 0.42;
  function proj(x, y, z, yaw) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    return { x: x1, y: y * cp - z1 * sp, z: y * sp + z1 * cp };
  }
  /* 세포 하나 그리기 (깊이에 따라 약간 어둡게, 핵 표시) */
  function drawCell(x, y, r, depth, o) {
    o = o || {};
    const base = o.color || CELL;
    const col = mix(base, '#b9784f', clamp((1 - depth) * 0.2, 0, 0.35));
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.sq) { ctx.rotate(o.ang || 0); ctx.scale(1 + o.sq, 1 / Math.sqrt(1 + o.sq)); }
    D.sphere(0, 0, r, col, { shadow: !!o.shadow, outline: 'rgba(150,80,50,.5)', outlineWidth: 1.4, gloss: o.gloss !== false });
    if (o.nuc !== false && r > 7) {
      const g = ctx.createRadialGradient(r * 0.04, r * 0.02, 0, r * 0.08, r * 0.06, r * 0.3);
      g.addColorStop(0, 'rgba(230,120,160,.65)'); g.addColorStop(1, 'rgba(205,70,125,.4)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r * 0.08, r * 0.06, r * 0.27, 0, TAU); ctx.fill();
    }
    if (o.pinch) {
      ctx.strokeStyle = 'rgba(140,60,40,' + (0.55 * o.pinch) + ')'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.8 * o.pinch); ctx.lineTo(0, r * 0.8 * o.pinch); ctx.stroke();
    }
    ctx.restore();
  }
  /* 세포 덩어리 그리기: cells = [{x,y,z,r,(sq,ax,pinch,color,alpha)}], R = 반지름 1이 차지하는 화면 픽셀 */
  function drawCluster(cells, cx, cy, R, yaw, o) {
    o = o || {};
    const list = cells.map((c) => {
      const p = proj(c.x, c.y, c.z, yaw);
      return { c, p };
    });
    list.sort((a, b) => a.p.z - b.p.z);
    list.forEach(({ c, p }) => {
      let ang = 0, sq = 0;
      if (c.sq && c.ax) {
        const pa = proj(c.ax[0], c.ax[1], c.ax[2], yaw);
        ang = Math.atan2(pa.y, pa.x); sq = c.sq * Math.min(1, Math.hypot(pa.x, pa.y) * 1.1);
      }
      drawCell(cx + p.x * R, cy + p.y * R, Math.max(1, c.r * R), p.z, {
        sq, ang, pinch: c.pinch, color: c.color, alpha: c.alpha, gloss: o.gloss, nuc: o.nuc, shadow: o.shadow,
      });
    });
  }
  /* 수정막(안쪽 경계) */
  function drawShell(cx, cy, R, o) {
    o = o || {};
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.06);
    g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.85, 'rgba(160,210,255,.16)'); g.addColorStop(1, 'rgba(120,180,245,.34)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(105,170,240,.85)'; ctx.lineWidth = o.width || 4;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.04 - 3, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
  }
  /* 염색체 막대 */
  function drawRods(cx, cy, R, n, colors, wob) {
    for (let i = 0; i < n; i++) {
      const rad = R * 0.7 * Math.sqrt((i + 0.5) / n), a = i * 2.39996 + (wob ? Math.sin(tNow * 1.5 + i) * 0.12 : 0);
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      const rot = i * 1.3 + (wob ? Math.sin(tNow * 1.2 + i * 2) * 0.2 : 0);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = colors(i);
      D.roundRect(-R * 0.15, -R * 0.045, R * 0.3, R * 0.09, R * 0.045); ctx.fill();
      ctx.restore();
    }
  }
  function drawNucleus(cx, cy, R, rods, colors, alpha, tint) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, tint || '#f4e8f8');
    ctx.shadowColor = 'rgba(60,30,80,.28)'; ctx.shadowBlur = R * 0.5; ctx.shadowOffsetY = R * 0.15;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(120,70,150,.7)'; ctx.lineWidth = Math.max(1.2, R * 0.07); ctx.stroke();
    drawRods(cx, cy, R, rods, colors, true);
    ctx.restore();
  }

  /* =========================================================
     장면 1 · 수정
     ========================================================= */
  const E = { x: 560, y: 262, r: 84, jelly: 116 };
  const FT = {};
  const eggDots = (function () {
    const r = mulberry32(5), out = [];
    for (let i = 0; i < 46; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.88; out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: 1.5 + r() * 2.6, l: r() > 0.5 }); }
    return out;
  })();
  const bokeh = (function () {
    const r = mulberry32(8), out = [];
    for (let i = 0; i < 16; i++) out.push({ x: r() * 800, y: r() * 520, s: 10 + r() * 34, a: 0.05 + r() * 0.1, v: 3 + r() * 6, ph: r() * 6 });
    return out;
  })();
  function resetFert() {
    const rnd = mulberry32(11);
    Object.assign(FT, {
      ph: 'idle', t: 0, mt: 0, win: null, cam: { x: 400, y: 260, s: 1 }, memA: 0, memR: 0, rings: [], memStart: false,
      fuse: 0, done: false, sp: [], approach: 0, sw: 5, banner: 0, bannerEq: 0, doneT: 0, entered: 0, mem: false, fused: false,
      sx: 0, sy: 0,
    });
    for (let i = 0; i < 12; i++) {
      FT.sp.push({
        x: 36 + rnd() * 120, y: 84 + i * (352 / 11) + (rnd() - 0.5) * 14, ang: (rnd() - 0.5) * 0.3, v: 62 + rnd() * 32,
        ph: rnd() * TAU, wave: rnd() * TAU, st: 'wait', a: 1, tail: 1,
      });
    }
    $('#goBtn').disabled = false;
  }
  function startSperm() {
    if (FT.ph !== 'idle') return;
    FT.ph = 'swim'; Sound.click(); hideHint();
    FT.sp.forEach((s) => { s.st = 'swim'; });
    $('#goBtn').disabled = true;
  }
  function winSperm(s) {
    FT.win = s; FT.ph = 'enter';
    s.st = 'enter'; s.et = 0;
    const dx = s.x - E.x, dy = s.y - E.y, L = Math.hypot(dx, dy) || 1;
    s.dir = { x: dx / L, y: dy / L };
    s.fx = s.x; s.fy = s.y;
    s.tx = E.x + s.dir.x * (E.r - 16); s.ty = E.y + s.dir.y * (E.r - 16);
    FT.sp.forEach((o) => { if (o !== s && o.st === 'swim') { o.st = 'away'; o.target = Math.atan2(o.y - E.y, o.x - E.x) + (Math.random() - 0.5) * 1.2; } });
  }
  function updFert(dt) {
    FT.t += dt;
    FT.sp.forEach((s) => {
      s.wave += dt * (s.st === 'wait' ? 7 : 15);
      if (s.st === 'swim' || s.st === 'away') {
        const dx = E.x - s.x, dy = E.y - s.y, d = Math.hypot(dx, dy);
        if (s.st === 'swim') {
          const wob = Math.sin(FT.t * 1.7 + s.ph) * (d > E.jelly + 70 ? 0.4 : 0.14);
          s.ang += angDiff(s.ang, Math.atan2(dy, dx) + wob) * Math.min(1, dt * 4);
          const slow = d < E.jelly + 2 ? 0.45 : 1;
          s.x += Math.cos(s.ang) * s.v * slow * dt; s.y += Math.sin(s.ang) * s.v * slow * dt;
          if (!FT.win && d <= E.r + 13) winSperm(s);
        } else {
          s.ang += angDiff(s.ang, s.target) * Math.min(1, dt * 3);
          s.x += Math.cos(s.ang) * s.v * 0.7 * dt; s.y += Math.sin(s.ang) * s.v * 0.7 * dt;
          s.a = approach(s.a, 0.32, dt, 3);
          // 수정막이 있으면 가까이 못 오게 밀어냄
          const dd = Math.hypot(s.x - E.x, s.y - E.y);
          if (dd < E.r + 24) { const k = (E.r + 24 - dd); s.x += (s.x - E.x) / dd * k * Math.min(1, dt * 8); s.y += (s.y - E.y) / dd * k * Math.min(1, dt * 8); }
        }
      } else if (s.st === 'enter') {
        s.et += dt;
        const p = clamp(s.et / 1.0, 0, 1), e = ease.outCubic(p);
        s.x = lerp(s.fx, s.tx, e); s.y = lerp(s.fy, s.ty, e);
        s.ang += angDiff(s.ang, Math.atan2(-s.dir.y, -s.dir.x)) * Math.min(1, dt * 10);
        s.tail = 1 - smooth(p, 0.45, 0.95);
        if (p > 0.32 && !FT.memStart) {
          FT.memStart = true; FT.mem = true;
          const px = E.x + s.dir.x * E.r, py = E.y + s.dir.y * E.r;
          parts.burst(px, py, { count: 16, speed: 120, size: 3.2, gravity: 0, life: 0.7, colors: ['#9bd0ff', '#ffffff', '#ffe08a'] });
          [0, 0.18, 0.36].forEach((d) => FT.rings.push({ t: -d }));
          Sound.success();
        }
        if (p >= 1 && FT.ph === 'enter') beginZoom(s);
      }
    });
    FT.memA = approach(FT.memA, FT.mem ? 1 : 0, dt, 5);
    FT.memR = approach(FT.memR, FT.mem ? 1 : 0, dt, 4);
    for (let i = FT.rings.length - 1; i >= 0; i--) { FT.rings[i].t += dt; if (FT.rings[i].t > 1.4) FT.rings.splice(i, 1); }
    // 확대 이후 단계
    if (FT.ph === 'zoom') {
      FT.mt += dt;
      FT.sw = lerp(5, 15, ease.outCubic(clamp(FT.mt / 1.0, 0, 1)));
      if (FT.mt > 1.4) { FT.ph = 'approach'; FT.mt = 0; Sound.tick(); }
    } else if (FT.ph === 'approach') {
      FT.mt += dt;
      if (FT.mt > 1.8) { FT.ph = 'fuse'; FT.mt = 0; Sound.tick(); }
    } else if (FT.ph === 'fuse') {
      FT.mt += dt;
      FT.fuse = ease.inOutCubic(clamp(FT.mt / 1.1, 0, 1));
      if (FT.mt >= 1.1) {
        FT.ph = 'done'; FT.done = true; FT.mt = 0; FT.bannerEq = 0;
        const c = fertCenter();
        parts.burst(c.x, c.y, { count: 30, speed: 190, size: 4, life: 1, gravity: 160 });
        SciSim.tween(FT, { bannerEq: 1 }, { duration: 0.6, ease: 'outBack' });
        Sound.level();
      }
    } else if (FT.ph === 'done') { FT.doneT += dt; }
    if (FT.ph === 'approach' || FT.ph === 'fuse' || FT.ph === 'done') FT.banner = approach(FT.banner, 1, dt, 6);
    parts.update(dt);
  }
  function approach(a, b, dt, k) { return SciSim.approach(a, b, dt, k); }
  function beginZoom(s) {
    FT.ph = 'zoom'; FT.mt = 0;
    FT.sx = s.tx; FT.sy = s.ty;
    SciSim.tween(FT.cam, { x: E.x - 4, y: E.y + 2, s: 1.9 }, { duration: 1.3, ease: 'inOutCubic' });
  }
  // 난자 핵 위치(세계 좌표)
  const EGG_NUC = { x: E.x + 10, y: E.y + 10, r: 15 };
  const SPN = { x: EGG_NUC.x - 26, y: EGG_NUC.y - 2 };       // 정자 핵이 난자 핵 옆에서 멈추는 자리
  function fertCenter() { return { x: lerp(EGG_NUC.x, SPN.x, 0.5), y: lerp(EGG_NUC.y, SPN.y, 0.5) }; }
  function w2s(x, y) { return { x: 400 + (x - FT.cam.x) * FT.cam.s, y: 260 + (y - FT.cam.y) * FT.cam.s }; }

  function drawSperm(s) {
    ctx.save();
    ctx.globalAlpha = s.a;
    ctx.translate(s.x, s.y); ctx.rotate(s.ang);
    if (s.tail > 0.02) {
      const L = 46 * (0.4 + 0.6 * s.tail), N = 18;
      ctx.globalAlpha = s.a * s.tail;
      ctx.strokeStyle = '#6f95ec'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const amp = (s.st === 'wait' ? 3 : 6.5);
      for (let pass = 0; pass < 2; pass++) {
        ctx.lineWidth = pass ? 2.2 : 3.6; ctx.strokeStyle = pass ? '#9ab8ff' : '#4a73d8';
        ctx.beginPath();
        for (let k = 0; k <= N; k++) {
          const u = k / N, px = -4 - u * L, py = amp * u * Math.sin(s.wave - u * 7.5);
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = s.a;
    }
    // 머리
    const g = ctx.createRadialGradient(-2, -2.5, 1, 0, 0, 10);
    g.addColorStop(0, '#a8c3ff'); g.addColorStop(1, '#2c58cc');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(2, 0, 10.5, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,50,140,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(4.5, -2.3, 4, 1.8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawFert(t) {
    // 배경
    const bg = ctx.createLinearGradient(0, 0, 0, 520);
    bg.addColorStop(0, '#fff6ee'); bg.addColorStop(1, '#fbdccd');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 520);
    bokeh.forEach((b) => {
      const y = (b.y + t * b.v) % 560 - 20, x = b.x + Math.sin(t * 0.4 + b.ph) * 14;
      D.glow(x, y, b.s, '#ffffff', b.a * 2.2);
    });
    // 세계 좌표
    ctx.save();
    ctx.translate(400, 260); ctx.scale(FT.cam.s, FT.cam.s); ctx.translate(-FT.cam.x, -FT.cam.y);
    // 난자 바깥 젤리층
    const zoomK = clamp((FT.cam.s - 1) / 0.9, 0, 1);
    {
      const g = ctx.createRadialGradient(E.x, E.y, E.r, E.x, E.y, E.jelly);
      g.addColorStop(0, 'rgba(255,238,190,.55)'); g.addColorStop(1, 'rgba(255,238,190,.1)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(E.x, E.y, E.jelly, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(235,190,110,.55)'; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 30; i++) {
        const a = i / 30 * TAU + 0.1, rr = E.jelly - 7;
        D.sphere(E.x + Math.cos(a) * rr, E.y + Math.sin(a) * rr, 5.2, '#fff0c2', { gloss: false, outline: 'rgba(220,170,90,.5)', outlineWidth: 1 });
      }
    }
    // 난자
    D.sphere(E.x, E.y, E.r, '#ffd9a3', { shadow: true, outline: 'rgba(200,130,60,.55)', outlineWidth: 2.4 });
    ctx.save(); ctx.beginPath(); ctx.arc(E.x, E.y, E.r - 2, 0, TAU); ctx.clip();
    eggDots.forEach((d) => {
      ctx.fillStyle = d.l ? 'rgba(255,255,255,.38)' : 'rgba(205,140,70,.2)';
      ctx.beginPath(); ctx.arc(E.x + d.x * E.r, E.y + d.y * E.r, d.s, 0, TAU); ctx.fill();
    });
    ctx.restore();
    // 난자 핵
    if (FT.ph === 'zoom' || FT.ph === 'approach' || FT.ph === 'fuse' || FT.ph === 'done') {
      const a = FT.ph === 'zoom' ? smooth(FT.mt, 0.2, 0.9) : 1;
      if (FT.ph === 'fuse' || FT.ph === 'done') {
        const c = fertCenter(), R = lerp(15, 25, FT.fuse);
        const mx = lerp(EGG_NUC.x, c.x, FT.fuse), my = lerp(EGG_NUC.y, c.y, FT.fuse);
        const sx = lerp(SPN.x, c.x, FT.fuse), sy = lerp(SPN.y, c.y, FT.fuse);
        // 두 핵이 합쳐지면서 하나로 (겹쳐 그리다 하나로)
        if (FT.fuse < 0.98) {
          drawNucleus(mx, my, 15 + (R - 15) * 0.7, 23, () => PINK, 1 - FT.fuse * 0.9);
          drawNucleus(sx, sy, 15 + (R - 15) * 0.7, 23, () => BLUE, 1 - FT.fuse * 0.9);
        }
        if (FT.fuse > 0.3) drawNucleus(c.x, c.y, R, 46, (i) => (i % 2 ? BLUE : PINK), smooth(FT.fuse, 0.3, 1), '#f1ecfb');
      } else {
        drawNucleus(EGG_NUC.x, EGG_NUC.y, EGG_NUC.r, 23, () => PINK, a);
        // 정자 핵 (확대되면서 부풀고 난자 핵 쪽으로 이동)
        const p = FT.ph === 'approach' ? ease.inOutCubic(clamp(FT.mt / 1.6, 0, 1)) : 0;
        const px = lerp(FT.sx, SPN.x, p), py = lerp(FT.sy, SPN.y, p);
        drawNucleus(px, py, FT.sw, 23, () => BLUE, a, '#e9f0ff');
      }
    }
    // 수정막
    if (FT.memA > 0.01) {
      const rr = E.r + 4 + FT.memR * 4;
      ctx.save();
      ctx.strokeStyle = 'rgba(110,185,255,' + (0.95 * FT.memA) + ')'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(E.x, E.y, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * FT.memA) + ')'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(E.x, E.y, rr - 2.2, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
      ctx.restore();
    }
    FT.rings.forEach((rg) => {
      if (rg.t < 0) return;
      const k = rg.t / 1.4;
      ctx.strokeStyle = 'rgba(120,190,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(E.x, E.y, E.r + 4 + ease.outCubic(k) * 54, 0, TAU); ctx.stroke();
    });
    // 정자
    FT.sp.slice().sort((a, b) => (a.st === 'enter') - (b.st === 'enter')).forEach((s) => {
      if (s.st === 'enter' && FT.ph !== 'enter') return;
      drawSperm(s);
    });
    parts.draw(ctx);
    ctx.restore();

    // 이름표 · 안내
    const alpha = 1 - zoomK;
    if (alpha > 0.02) {
      ctx.save(); ctx.globalAlpha = alpha;
      const e = w2s(E.x, E.y + E.r + 4);
      D.label(e.x, e.y + 22, '난자', { bg: '#e0518d', size: 15 });
      const lead = FT.sp.find((s) => s.st !== 'away') || FT.sp[0];
      if (FT.ph === 'idle' || FT.ph === 'swim') D.label(lead.x + 6, lead.y - 24, '정자', { bg: '#3b6fe0', size: 15 });
      if (FT.mem && FT.win) { D.label(E.x + FT.win.dir.x * (E.r + 40), E.y + FT.win.dir.y * (E.r + 56) - 6, '수정막', { bg: '#2f86d8', size: 15 }); }
      ctx.restore();
    }
    if (FT.ph === 'approach' || FT.ph === 'fuse' || FT.ph === 'done' || FT.ph === 'zoom') {
      const a = FT.ph === 'zoom' ? smooth(FT.mt, 0.9, 1.4) : 1;
      ctx.save(); ctx.globalAlpha = a;
      if (FT.ph !== 'fuse' && FT.ph !== 'done') {
        const ne = w2s(EGG_NUC.x, EGG_NUC.y + 20), p = FT.ph === 'approach' ? ease.inOutCubic(clamp(FT.mt / 1.6, 0, 1)) : 0;
        const ns = w2s(lerp(FT.sx, SPN.x, p), lerp(FT.sy, SPN.y, p) - 20);
        D.label(ne.x + 10, ne.y + 34, '난자 핵 · 염색체 23', { bg: PINK, size: 14 });
        D.label(ns.x - 24, ns.y - 24, '정자 핵 · 염색체 23', { bg: BLUE, size: 14 });
      } else if (FT.ph === 'done') {
        const c = fertCenter(), s = w2s(c.x, c.y + 30);
        D.label(s.x, s.y + 44, '수정란의 핵 · 염색체 46', { bg: '#6d3fb3', size: 15 });
      }
      ctx.restore();
    }
    // 캡션
    const cap = {
      idle: '정자는 아주 많이 있어요. 난자를 향해 출발시켜 볼까요?',
      swim: '정자들이 꼬리를 흔들며 난자를 향해 헤엄쳐요',
      enter: '정자 한 개가 난자 속으로 들어가요!',
      zoom: '난자 속을 확대해 볼게요',
      approach: '정자의 핵과 난자의 핵이 가까워져요',
      fuse: '두 핵이 하나로 합쳐져요',
      done: '수정 완료! 하나의 수정란이 만들어졌어요',
    }[FT.ph];
    D.label(400, 26, cap, { bg: 'rgba(27,35,51,.82)', size: 15 });
    // 23 + 23 = 46 배너
    if (FT.banner > 0.02) {
      ctx.save();
      const by = 478, s = 0.8 + 0.2 * FT.banner;
      ctx.globalAlpha = FT.banner; ctx.translate(400, by); ctx.scale(s, s);
      D.roundRect(-150, -26, 300, 52, 26); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
      ctx.strokeStyle = '#c9b8e6'; ctx.lineWidth = 2; ctx.stroke();
      D.text(-84, 9, '23', { size: 26, weight: 800, color: PINK });
      D.text(-52, 8, '+', { size: 22, weight: 800, color: '#7a8699' });
      D.text(-18, 9, '23', { size: 26, weight: 800, color: BLUE });
      if (FT.bannerEq > 0.01) {
        ctx.save(); ctx.globalAlpha = clamp(FT.bannerEq, 0, 1); ctx.translate(70, 0); ctx.scale(0.7 + 0.3 * FT.bannerEq, 0.7 + 0.3 * FT.bannerEq);
        D.text(-38, 8, '=', { size: 22, weight: 800, color: '#7a8699' });
        D.text(10, 10, '46', { size: 30, weight: 800, color: '#6d3fb3' });
        D.text(54, 7, '개', { size: 15, weight: 800, color: '#6d3fb3' });
        ctx.restore();
      }
      ctx.restore();
    }
    if (FT.done) { D.check(740, 40, 18, clamp(FT.doneT * 2.5, 0, 1)); }
  }

  /* =========================================================
     장면 2 · 난할
     ========================================================= */
  const CL = { g: 0, cells: [], busy: false, settle: 0, disp: 1, yaw: 0.6, fresh: 0 };
  const CC = { x: 262, y: 272, R: 168 };
  function mkCell(t, pos) {
    const sp = (v) => new SciSim.Spring(v, { stiffness: 95, damping: 11 });
    const c = { x: sp(pos ? pos.x : t.x), y: sp(pos ? pos.y : t.y), z: sp(pos ? pos.z : t.z), r: new SciSim.Spring(pos && pos.r != null ? pos.r : t.r, { stiffness: 120, damping: 13 }),
      sq: new SciSim.Spring(pos && pos.sq || 0, { stiffness: 150, damping: 5.5 }), div: null, tg: t, ax: null };
    c.x.target = t.x; c.y.target = t.y; c.z.target = t.z; c.r.target = t.r;
    return c;
  }
  function resetCleave() {
    CL.g = 0; CL.busy = false; CL.settle = 0; CL.disp = 1;
    CL.cells = [mkCell(LAY[0][0])];
    CL.fresh = 0;
    syncDiv();
  }
  function divide() {
    if (CL.busy || CL.g >= 5 || scene !== 'cleave') return;
    CL.busy = true; CL.settle = 0;
    CL.g++;
    CL.cells.forEach((c, i) => {
      c.idx = i; c.ax = LAY[CL.g - 1].axes[i];
      c.div = { t: -Math.random() * (RM ? 0 : 0.12) };
      c.sq.target = 0.34;
    });
    Sound.tick();
    hideHint();
    syncDiv();
  }
  function updCleave(dt) {
    CL.yaw += RM ? 0 : dt * 0.28;
    let splitting = false;
    const out = [];
    CL.cells.forEach((c, i) => {
      if (c.div) {
        c.div.t += dt;
        if (c.div.t >= 0.32) {
          // 둘로 나뉨
          const ax = c.ax, r = c.r.value, off = r * 0.55;
          const px = c.x.value, py = c.y.value, pz = c.z.value;
          const t0 = LAY[CL.g][2 * c.idx], t1 = LAY[CL.g][2 * c.idx + 1];
          const a = mkCell(t0, { x: px + ax[0] * off, y: py + ax[1] * off, z: pz + ax[2] * off, r: r * 0.8, sq: 0.2 });
          const b = mkCell(t1, { x: px - ax[0] * off, y: py - ax[1] * off, z: pz - ax[2] * off, r: r * 0.8, sq: 0.2 });
          a.ax = ax; b.ax = ax; a.sq.velocity = -1.4; b.sq.velocity = -1.4;
          out.push(a, b);
          splitting = true;
          parts.burst(CC.x + proj(px, py, pz, CL.yaw).x * CC.R, CC.y + proj(px, py, pz, CL.yaw).y * CC.R, { count: 5, speed: 60, size: 2.2, life: 0.5, gravity: 0, colors: ['#fff1d6', '#ffd2b0'] });
        } else { out.push(c); splitting = true; }
      } else out.push(c);
    });
    CL.cells = out;
    if (splitting) CL.settle = 0; else if (CL.busy) { CL.settle += dt; if (CL.settle > 0.9) { CL.busy = false; syncDiv(); Sound.tick(); } }
    CL.cells.forEach((c) => {
      c.x.update(dt); c.y.update(dt); c.z.update(dt); c.r.update(dt);
      if (c.div) { c.sq.target = 0.34; } else c.sq.target = 0;
      c.sq.update(dt);
    });
    const n = 1 << CL.g;
    CL.disp = approach(CL.disp, n, dt, 7);
    CL.fresh = Math.max(0, CL.fresh - dt);
    parts.update(dt);
  }
  function syncDiv() {
    const b = $('#divBtn'); if (!b) return;
    const n = 1 << CL.g;
    if (CL.g >= 5) { b.textContent = '✅ 32세포 완성'; b.disabled = true; }
    else { b.textContent = '✂️ 분열시키기 (' + n + ' → ' + (n * 2) + ')'; b.disabled = CL.busy; }
    $('#sceneSub').textContent = scene === 'cleave' ? '세포 ' + n + '개' : $('#sceneSub').textContent;
  }
  function gaugeCard(x, y, w, h, title) {
    D.shadow(() => { D.roundRect(x, y, w, h, 14); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(x + 14, y + 24, title, { size: 15, weight: 800, color: '#44506a', align: 'left' });
  }
  function drawCleave(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, 520);
    bg.addColorStop(0, '#eaf5fc'); bg.addColorStop(1, '#d6e8f5');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 520);
    D.glow(CC.x, CC.y, CC.R * 1.5, '#ffffff', 0.55);
    // 전체 크기(바깥 경계): 변하지 않음
    drawShell(CC.x, CC.y, CC.R + 6);
    ctx.save(); ctx.setLineDash([7, 7]); ctx.strokeStyle = 'rgba(30,90,170,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CC.x, CC.y, CC.R, 0, TAU); ctx.stroke(); ctx.restore();
    const cells = CL.cells.map((c) => ({
      x: c.x.value, y: c.y.value, z: c.z.value, r: Math.max(0.02, c.r.value), ax: c.ax,
      sq: c.sq.value, pinch: c.div ? clamp(c.div.t / 0.3, 0, 1) : 0,
    }));
    drawCluster(cells, CC.x, CC.y, CC.R, CL.yaw, { shadow: cells.length === 1 });
    parts.draw(ctx);
    D.label(CC.x, CC.y + CC.R + 34, '바깥 경계(전체 크기)는 그대로', { bg: 'rgba(30,90,170,.9)', size: 14 });

    // 게이지
    const n = 1 << CL.g, gx = 520, gw = 264;
    // 1) 세포 수
    gaugeCard(gx, 16, gw, 98, '세포 수');
    D.text(gx + gw - 16, 62, String(Math.round(CL.disp)), { size: 40, weight: 800, color: '#d1337a', align: 'right' });
    D.text(gx + 14, 66, '개', { size: 15, weight: 800, color: '#d1337a', align: 'left' });
    barTrack(gx + 14, 80, gw - 28, 12);
    barFill(gx + 14, 80, (gw - 28) * clamp(CL.disp / 32, 0, 1), 12, '#e0518d');
    // 2) 세포 하나의 크기
    gaugeCard(gx, 126, gw, 142, '세포 하나의 크기 (수정란 = 1)');
    D.text(gx + gw - 16, 168, fracText(n), { size: 34, weight: 800, color: '#2f6bd1', align: 'right' });
    const ref = 30, rr = ref / Math.cbrt(Math.max(1, CL.disp));
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(gx + 52, 214, ref, 0, TAU); ctx.stroke(); ctx.restore();
    D.sphere(gx + 52, 214, Math.max(2, rr), CELL, { outline: 'rgba(150,80,50,.5)', outlineWidth: 1.2 });
    D.text(gx + 100, 206, '점선 원: 수정란', { size: 13, weight: 700, color: '#6a7488', align: 'left' });
    D.text(gx + 100, 226, '분열할 때마다 부피가 절반!', { size: 13, weight: 800, color: '#2f6bd1', align: 'left' });
    barTrack(gx + 14, 250, gw - 28, 10);
    barFill(gx + 14, 250, (gw - 28) * clamp(1 / Math.max(1, CL.disp), 0.015, 1), 10, '#4b7be5');
    // 3) 전체 크기
    gaugeCard(gx, 280, gw, 106, '전체 크기 (수정란 = 1)');
    D.text(gx + gw - 16, 326, '1', { size: 38, weight: 800, color: '#14a058', align: 'right' });
    D.text(gx + 14, 326, '그대로', { size: 16, weight: 800, color: '#14a058', align: 'left' });
    barTrack(gx + 14, 342, gw - 28, 10);
    barFill(gx + 14, 342, gw - 28, 10, '#14a058');
    D.text(gx + 14, 374, n + ' × ' + fracText(n) + ' = 1', { size: 14, weight: 800, color: '#44506a', align: 'left' });
    D.text(gx + gw - 14, 374, '(세포 수 × 세포 하나)', { size: 12.5, weight: 700, color: '#7a8699', align: 'right' });
    // 4) 염색체 수
    if (on('chromo')) {
      gaugeCard(gx, 398, gw, 106, '세포 하나의 염색체 수');
      D.text(gx + gw - 16, 446, '46', { size: 36, weight: 800, color: '#6d3fb3', align: 'right' });
      D.text(gx + gw - 14 - 46, 446, '개', { size: 14, weight: 800, color: '#6d3fb3', align: 'right' });
      const cn = n;
      for (let i = 0; i < 12; i++) {
        ctx.save(); ctx.translate(gx + 22 + i * 9.5, 446); ctx.rotate(0.3);
        ctx.fillStyle = i % 2 ? BLUE : PINK; D.roundRect(-2, -9, 4, 18, 2); ctx.fill(); ctx.restore();
      }
      D.text(gx + 14, 484, n === 1 ? '수정란과 같은 46개' : '분열해도 모든 세포가 46개', { size: 14, weight: 800, color: '#44506a', align: 'left' });
    }
    // 완성 표시
    if (CL.g >= 5 && !CL.busy) D.check(CC.x + CC.R - 8, CC.y - CC.R + 10, 18, clamp(CL.settle * 3 + 0.5, 0, 1));
  }
  function barTrack(x, y, w, h) { D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e5eaf2'; ctx.fill(); }
  function barFill(x, y, w, h, color) {
    if (w < 1) return;
    w = Math.max(w, h);
    D.roundRect(x, y, w, h, h / 2);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(color, 0.35)); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.fill();
  }

  /* =========================================================
     장면 3 · 난할의 특징 (그래프와 비교)
     ========================================================= */
  const G = { n: 0, visited: new Set([0]), cmp: false, cmpSeen: false, bh: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], pop: new SciSim.Spring(1, { stiffness: 200, damping: 9 }), cmpA: 0 };
  const CH = [
    { title: '세포 수', sub: '(개)', color: '#e0518d', max: 32, val: (j) => Math.pow(2, j), ticks: [[0, '0'], [16, '16'], [32, '32']], fmt: (j) => String(Math.pow(2, j)) },
    { title: '세포 하나의 부피', sub: '(수정란 = 1)', color: '#4b7be5', max: 1, val: (j) => Math.pow(2, -j), ticks: [[0, '0'], [0.5, '½'], [1, '1']], fmt: (j) => fracText(Math.pow(2, j)) },
    { title: '전체 부피', sub: '(수정란 = 1)', color: '#14a058', max: 1, val: () => 1, ticks: [[0, '0'], [0.5, '½'], [1, '1']], fmt: () => '1' },
  ];
  function resetGraph() {
    G.n = 0; G.visited = new Set([0]); G.cmp = false; G.cmpSeen = false; G.cmpA = 0;
    G.bh.forEach((row) => row.fill(0));
    G.pop.value = 1; G.pop.target = 1;
    $$('#nSeg button').forEach((b) => b.classList.toggle('on', b.dataset.n === '0'));
    const cb = $('#cmpBtn'); cb.setAttribute('aria-pressed', 'false');
    $('#sceneSub').textContent = '';
  }
  function setN(n) {
    if (n === G.n) return;
    G.n = n; G.visited.add(n);
    G.pop.value = 0.88; G.pop.velocity = 2; G.pop.target = 1;
    $$('#nSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.n === n));
    Sound.tick(); hideHint();
  }
  function setCmp(v) {
    G.cmp = v; if (v) G.cmpSeen = true;
    $('#cmpBtn').setAttribute('aria-pressed', v ? 'true' : 'false');
    Sound.click();
  }
  function updGraph(dt) {
    G.pop.update(dt);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
      const tgt = j <= G.n ? CH[i].val(j) / CH[i].max : 0;
      G.bh[i][j] = approach(G.bh[i][j], tgt, dt, 7);
    }
    G.cmpA = approach(G.cmpA, G.cmp ? 1 : 0, dt, 6);
  }
  function drawGraph(t) {
    ctx.fillStyle = '#f4f8f2'; ctx.fillRect(0, 0, 800, 520);
    // 왼쪽: 세포 덩어리
    const px = 14, py = 16, pw = 202, ph = 276;
    D.shadow(() => { D.roundRect(px, py, pw, ph, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    const cx = px + pw / 2, cy = py + 118, R = 74;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(G.pop.value, G.pop.value); ctx.translate(-cx, -cy);
    drawShell(cx, cy, R + 2, { width: 3 });
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(30,90,170,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.98, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    drawCluster(LAY[G.n], cx, cy, R, t * 0.3, {});
    ctx.restore();
    D.text(cx, py + 232, '분열 ' + G.n + '회 → ' + (1 << G.n) + '세포', { size: 16, weight: 800, color: '#1b2333' });
    D.text(cx, py + 254, '세포 하나 = 수정란의 ' + fracText(1 << G.n), { size: 13.5, weight: 700, color: '#2f6bd1' });
    // 그래프 세 개
    const x0 = 232, cw = 176, gap = 16, y0 = 16, chH = 276, PH = 140;
    CH.forEach((ch, i) => {
      const x = x0 + i * (cw + gap);
      D.shadow(() => { D.roundRect(x, y0, cw, chH, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
      D.text(x + cw / 2, y0 + 24, ch.title, { size: 15, weight: 800, color: ch.color });
      D.text(x + cw / 2, y0 + 43, ch.sub, { size: 13, weight: 700, color: '#6a7488' });
      const base = y0 + 84 + PH, top = y0 + 84, bx = x + 42, bw = cw - 50, pitch = bw / 6, w = pitch * 0.68;
      // 눈금
      ch.ticks.forEach(([v, lab]) => {
        const yy = base - (v / ch.max) * PH;
        ctx.strokeStyle = '#e1e7ef'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - 4, yy); ctx.lineTo(x + cw - 6, yy); ctx.stroke();
        D.text(bx - 8, yy + 5, lab, { size: 13, weight: 700, color: '#6a7488', align: 'right' });
      });
      // 선택한 열 강조
      const hx = bx + G.n * pitch + (pitch - w) / 2;
      ctx.fillStyle = rgba(ch.color, 0.12 + 0.05 * Math.sin(t * 4)); D.roundRect(hx - 3, top - 8, w + 6, PH + 34, 8); ctx.fill();
      for (let j = 0; j < 6; j++) {
        const bxj = bx + j * pitch + (pitch - w) / 2;
        const hh = G.bh[i][j] * PH;
        if (j > G.n) { ctx.fillStyle = '#e9edf3'; ctx.fillRect(bxj, base - 2, w, 2); }
        if (hh > 0.5) {
          D.roundRect(bxj, base - Math.max(2, hh), w, Math.max(2, hh), Math.min(4, w / 2));
          const g = ctx.createLinearGradient(0, base - hh, 0, base); g.addColorStop(0, shade(ch.color, 0.3)); g.addColorStop(1, ch.color);
          ctx.fillStyle = g; ctx.fill();
        }
        D.text(bxj + w / 2, base + 19, String(j), { size: 13, weight: j === G.n ? 800 : 600, color: j === G.n ? '#1b2333' : '#8a95a6' });
      }
      // 선택한 값 말풍선
      const hSel = Math.max(2, G.bh[i][G.n] * PH);
      D.label(bx + G.n * pitch + pitch / 2, base - hSel - 16, ch.fmt(G.n), { bg: ch.color, size: 14, pad: 7 });
      D.text(x + cw / 2, y0 + chH - 12, '분열 횟수 (회)', { size: 13, weight: 700, color: '#6a7488' });
    });
    // 아래: 비교 보기
    const sx = 14, sy = 306, sw = 772, sh = 200;
    D.shadow(() => { D.roundRect(sx, sy, sw, sh, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    if (G.cmpA < 0.02) {
      D.text(sx + sw / 2, sy + sh / 2 - 6, '🔍 “비교 보기”를 켜면', { size: 17, weight: 800, color: '#6a7488' });
      D.text(sx + sw / 2, sy + sh / 2 + 20, '보통의 체세포분열과 난할을 나란히 비교할 수 있어요', { size: 15, weight: 700, color: '#8a95a6' });
    } else {
      ctx.save(); ctx.globalAlpha = G.cmpA;
      drawCompare(sx, sy, sw, sh, t);
      ctx.restore();
    }
    if (isNew('compare') && !G.cmp) D.ring(sx + sw / 2, sy + sh / 2, 40, t, { color: '#14a058' });
  }
  function drawCompare(sx, sy, sw, sh, t) {
    const u = (t % 9.5), fade = u > 8.6 ? 1 - (u - 8.6) / 0.9 : 1;
    const rows = [
      { y: sy + 56, name: '보통의 체세포분열', sub: '분열 사이에 세포가 자라요' },
      { y: sy + 146, name: '난할', sub: '자라지 않고 바로 분열해요' },
    ];
    const r0 = 24, X1 = sx + 270, X2 = sx + 440, X3 = sx + 620;
    const pop = (tt) => ease.outBack(smooth(u, tt, tt + 0.6));
    rows.forEach((row, ri) => {
      D.text(sx + 18, row.y - 6, row.name, { size: 16, weight: 800, color: ri ? '#d1337a' : '#44506a', align: 'left' });
      D.text(sx + 18, row.y + 16, row.sub, { size: 13, weight: 700, color: '#6a7488', align: 'left' });
      ctx.save(); ctx.globalAlpha = fade;
      // 1단계
      drawCell(X1, row.y, r0, 1, {});
      // 화살표
      const a2 = pop(1.2), a3 = pop(3.6);
      ctx.save(); ctx.globalAlpha = fade * smooth(u, 1.0, 1.4);
      D.arrow(X1 + 36, row.y, X2 - 46, row.y, { width: 3, color: '#8a95a6', head: 10 });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = fade * smooth(u, 3.4, 3.8);
      D.arrow(X2 + 46, row.y, X3 - 56, row.y, { width: 3, color: '#8a95a6', head: 10 });
      ctx.restore();
      if (ri === 0) {
        const grow = 1 + 0.26 * ease.outCubic(smooth(u, 1.4, 2.8));
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 1.2, 1.6); ctx.translate(X2, row.y); ctx.scale(Math.max(0.01, a2), Math.max(0.01, a2));
        drawCell(0, 0, r0 * grow, 1, {});
        ctx.restore();
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 2.0, 2.5);
        D.label(X2, row.y - 44, '자란다 ↑', { bg: '#f59e0b', size: 14 }); ctx.restore();
        const s3 = Math.max(0.01, a3);
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 3.6, 4.0);
        [-1, 1].forEach((d) => { ctx.save(); ctx.translate(X3 + d * 28, row.y); ctx.scale(s3, s3); drawCell(0, 0, r0, 1, {}); ctx.restore(); });
        ctx.restore();
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 4.4, 4.9);
        D.label(X3, row.y - 44, '처음 크기와 같아요', { bg: '#64748b', size: 14 }); ctx.restore();
      } else {
        const r2 = r0 * Math.pow(0.5, 1 / 3), r3 = r0 * Math.pow(0.25, 1 / 3);
        const s2 = Math.max(0.01, a2), s3 = Math.max(0.01, a3);
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 1.2, 1.6);
        [-1, 1].forEach((d) => { ctx.save(); ctx.translate(X2 + d * 22, row.y); ctx.scale(s2, s2); drawCell(0, 0, r2, 1, {}); ctx.restore(); });
        ctx.restore();
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 3.6, 4.0);
        [-1, 1].forEach((dx) => [-1, 1].forEach((dy) => { ctx.save(); ctx.translate(X3 + dx * 19, row.y + dy * 19); ctx.scale(s3, s3); drawCell(0, 0, r3, 1, {}); ctx.restore(); }));
        ctx.restore();
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 2.0, 2.5);
        D.label(X2, row.y - 44, '바로 분열', { bg: '#d1337a', size: 14 }); ctx.restore();
        ctx.save(); ctx.globalAlpha = fade * smooth(u, 4.4, 4.9);
        D.label(X3 + 4, row.y - 50, '점점 작아져요', { bg: '#d1337a', size: 14 }); ctx.restore();
      }
      ctx.restore();
    });
    D.dashedLine(sx + 12, sy + 100, sx + sw - 12, sy + 100, { color: '#d9e0ea', dash: [6, 6] });
  }

  /* =========================================================
     장면 4 · 발생 모형 놓기
     ========================================================= */
  const MODEL_G = [0, 1, 2, 3, 5];                         // 수정란, 2, 4, 8, 많은 세포
  const MODEL_NAME = ['수정란', '2세포', '4세포', '8세포', '많은 세포 덩어리'];
  const POOL_ORDER = [3, 0, 4, 1, 2];                      // 풀 위치 i → 모형 번호
  const SLOT = (i) => ({ x: 82 + i * 159, y: 150 });
  const HOME = (k) => ({ x: 82 + POOL_ORDER.indexOf(k) * 159, y: 400 });
  const CR = 52;                                            // 모형의 반지름(픽셀)
  const CLAY = '#f0a583';
  const P4 = { models: [], slots: [-1, -1, -1, -1, -1], drag: null, fin: 0, finT: 0, finOn: false, chips: 0, pulse: 0 };
  function resetClay() {
    P4.slots = [-1, -1, -1, -1, -1]; P4.drag = null; P4.finOn = false; P4.fin = 0; P4.finT = 0;
    P4.models = [0, 1, 2, 3, 4].map((k) => {
      const h = HOME(k), sp = () => new SciSim.Spring(0, { stiffness: 150, damping: 14 });
      const m = { k, x: sp(), y: sp(), lift: new SciSim.Spring(0, { stiffness: 260, damping: 18 }), shake: 0, slot: -1 };
      m.x.value = m.x.target = h.x; m.y.value = m.y.target = h.y;
      return m;
    });
    syncClay();
  }
  function syncClay() {
    if (scene !== 'clay') return;
    const n = P4.slots.filter((s) => s >= 0).length;
    $('#sceneSub').textContent = n + ' / 5 놓음';
  }
  function moveTo(m, x, y) { m.x.target = x; m.y.target = y; }
  function placeModel(m, slot) {
    const prev = m.slot;
    if (slot < 0) {
      if (prev >= 0) P4.slots[prev] = -1;
      m.slot = -1; const h = HOME(m.k); moveTo(m, h.x, h.y);
      syncClay(); return;
    }
    const occ = P4.slots[slot];
    if (occ === m.k) { const s0 = SLOT(slot); moveTo(m, s0.x, s0.y); return; }
    if (prev >= 0) P4.slots[prev] = -1;
    if (occ >= 0) {
      const o = P4.models[occ];
      o.slot = prev; o.shake = 0.5;
      if (prev >= 0) { P4.slots[prev] = o.k; const sp = SLOT(prev); moveTo(o, sp.x, sp.y); }
      else { const h = HOME(o.k); moveTo(o, h.x, h.y); }
    }
    m.slot = slot; P4.slots[slot] = m.k;
    const s = SLOT(slot); moveTo(m, s.x, s.y);
    parts.burst(s.x, s.y + 40, { count: 6, speed: 70, size: 2.4, life: 0.5, gravity: 120, colors: ['#ffd2b0', '#fff1d6'] });
    Sound.tick();
    syncClay();
  }
  const clayCorrect = () => P4.slots.every((k, i) => k === i);
  const clayFilled = () => P4.slots.every((k) => k >= 0);
  function updClay(dt) {
    P4.pulse += dt;
    P4.models.forEach((m) => {
      m.x.update(dt); m.y.update(dt); m.lift.update(dt);
      if (m.shake > 0) m.shake = Math.max(0, m.shake - dt);
    });
    if (P4.finOn) { P4.finT += dt; }
    P4.fin = approach(P4.fin, P4.finOn ? 1 : 0, dt, 2.2);
    parts.update(dt);
  }
  const FIN_COL = ['#ff9db4', '#8ec5ff', '#ffd36b', '#9be3b0'];
  function drawClay(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, 520);
    bg.addColorStop(0, '#f8efe3'); bg.addColorStop(1, '#efdcc4');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 520);
    const fin = P4.fin, base = 1 - fin;
    const reveal = (game && (game.phase === 'success' || game.free)) && clayCorrect();
    if (base > 0.02) {
      ctx.save(); ctx.globalAlpha = base;
      D.label(400, 24, '작은 모형을 끌어서 ①~⑤ 자리에 발생 순서대로 놓아요', { bg: 'rgba(27,35,51,.82)', size: 15 });
      // 자리
      for (let i = 0; i < 5; i++) {
        const s = SLOT(i), filled = P4.slots[i] >= 0;
        ctx.save();
        ctx.setLineDash([7, 6]); ctx.strokeStyle = filled ? 'rgba(20,160,88,.7)' : 'rgba(120,100,80,.55)'; ctx.lineWidth = 2.4;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(s.x, s.y, CR + 14, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
        D.sphere(s.x, s.y - CR - 34, 15, filled ? '#14a058' : '#8a7a68', { gloss: false, text: String(i + 1), textScale: 1.15 });
        if (i < 4) D.arrow(s.x + CR + 22, s.y, SLOT(i + 1).x - CR - 22, s.y, { width: 3, head: 10, color: 'rgba(120,100,80,.55)' });
        if (reveal) D.label(s.x, s.y + CR + 34, MODEL_NAME[i], { bg: '#14a058', size: 14 });
        if (isNew('clay') && !filled && i === 0) D.ring(s.x, s.y, CR + 14, t, { color: '#14a058' });
      }
      // 풀 받침
      D.roundRect(20, 322, 760, 154, 18); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      D.text(36, 346, '점토 모형', { size: 14, weight: 800, color: '#8a7a68', align: 'left' });
      // 모형 (끄는 것을 마지막에 그림)
      const order = P4.models.slice().sort((a, b) => (P4.drag === a ? 1 : 0) - (P4.drag === b ? 1 : 0));
      order.forEach((m) => {
        const lift = m.lift.value, sh = m.shake > 0 ? Math.sin(m.shake * 50) * 6 * (m.shake / 0.5) : 0;
        const x = m.x.value + sh, y = m.y.value - lift * 10, sc = 1 + lift * 0.08;
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.globalAlpha = 1;
        // 그림자
        ctx.fillStyle = 'rgba(80,50,20,' + (0.22 - lift * 0.05) + ')';
        ctx.beginPath(); ctx.ellipse(0, CR + 10 + lift * 6, CR * (0.85 - lift * 0.1), 7, 0, 0, TAU); ctx.fill();
        // 모형 바깥 경계 (전체 크기 같음)
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(30,90,170,.5)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, CR + 3, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const lay = LAY[MODEL_G[m.k]].map((c) => ({ x: c.x, y: c.y, z: c.z, r: c.r * 0.97 }));
        drawCluster(lay, 0, 0, CR, 0.5 + m.k * 0.9 + t * 0.25, { nuc: false, gloss: true });
        ctx.restore();
      });
      ctx.restore();
    }
    // 마무리 장면
    if (fin > 0.02) {
      ctx.save(); ctx.globalAlpha = fin;
      const cx = 400, cy = 200, R = 128;
      const ft = P4.finT;
      drawShell(cx, cy, R + 4);
      const lay = LAY[5].map((c, i) => {
        const col = FIN_COL[(c.x > 0 ? 1 : 0) + (c.y > 0 ? 2 : 0)];
        return { x: c.x, y: c.y, z: c.z, r: c.r, color: mix(CELL, col, clamp((ft - 0.4) / 1.4, 0, 1)) };
      });
      drawCluster(lay, cx, cy, R, t * 0.3, {});
      D.label(cx, 30, ft > 1.6 ? '모양과 기능이 서로 다른 세포로 바뀌어요' : '난할이 끝난 뒤 …', { bg: 'rgba(27,35,51,.84)', size: 15 });
      const chain = ['세포', '조직', '기관', '개체'];
      chain.forEach((c, i) => {
        const a = smooth(ft, 2.0 + i * 0.7, 2.5 + i * 0.7), x = 150 + i * 166;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, 424 + (1 - a) * 12);
        D.roundRect(-52, -24, 104, 48, 24); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = FIN_COL[i % 4]; ctx.lineWidth = 3; ctx.stroke();
        D.text(0, 7, c, { size: 20, weight: 800, color: '#1b2333' });
        ctx.restore();
        if (i < 3) { ctx.save(); ctx.globalAlpha = a; D.arrow(x + 56, 424, x + 110, 424, { width: 3, head: 10, color: '#8a95a6' }); ctx.restore(); }
      });
      ctx.restore();
    }
    parts.draw(ctx);
  }
  function modelAt(p) {
    for (let i = P4.models.length - 1; i >= 0; i--) {
      const m = P4.models[i];
      if (Math.hypot(p.x - m.x.value, p.y - m.y.value) < CR + 8) return m;
    }
    return null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (scene !== 'clay' || P4.fin > 0.3) return false;
      const m = modelAt(p);
      if (!m) return false;
      P4.drag = m; m.off = { x: m.x.value - p.x, y: m.y.value - p.y };
      m.lift.target = 1; m.x.stiffness = 400; m.y.stiffness = 400; m.x.damping = 28; m.y.damping = 28;
      Sound.click(); hideHint();
      return true;
    },
    move(p) {
      const m = P4.drag; if (!m) return;
      m.x.target = clamp(p.x + m.off.x, 40, 760); m.y.target = clamp(p.y + m.off.y, 60, 480);
    },
    up(p) {
      const m = P4.drag; if (!m) return;
      P4.drag = null; m.lift.target = 0; m.x.stiffness = 150; m.y.stiffness = 150; m.x.damping = 14; m.y.damping = 14;
      let best = -1, bd = 92;
      for (let i = 0; i < 5; i++) { const s = SLOT(i), d = Math.hypot(m.x.target - s.x, m.y.target - s.y); if (d < bd) { bd = d; best = i; } }
      placeModel(m, best);
    },
    hover(p) { return scene === 'clay' && modelAt(p) ? 'grab' : null; },
  });

  /* =========================================================
     장면 전환 · 컨트롤
     ========================================================= */
  const SC_TITLE = {
    fert: ['🔬 수정 — 정자와 난자', ''],
    cleave: ['🧫 난할 — 수정란의 초기 분열', ''],
    graph: ['📊 난할의 특징', ''],
    clay: ['🧸 발생 모형 — 점토 모형 놓기', ''],
  };
  function setScene(name, reinit) {
    scene = name;
    parts.clear();
    $('#actions').setAttribute('data-sc', name);
    $('#sceneTitle').textContent = SC_TITLE[name][0];
    $('#sceneSub').textContent = SC_TITLE[name][1];
    if (name === 'fert') resetFert();
    else if (name === 'cleave') resetCleave();
    else if (name === 'graph') resetGraph();
    else if (name === 'clay') resetClay();
  }
  $('#goBtn').addEventListener('click', startSperm);
  $('#divBtn').addEventListener('click', divide);
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); setScene(scene);
    if (scene === 'fert') showHint('🏊 “정자 출발!”을 눌러 보세요', 5000);
  });
  $$('#nSeg button').forEach((b) => b.addEventListener('click', () => setN(+b.dataset.n)));
  $('#cmpBtn').addEventListener('click', () => setCmp(!G.cmp));

  /* =========================================================
     미션 · 퀴즈 내용
     ========================================================= */
  function frogCard(g, label) {
    const cells = LAY[g], yaw = 0.3, R = 28, cx = 40, cy = 38;
    const list = cells.map((c) => ({ c, p: proj(c.x, c.y, c.z, yaw) })).sort((a, b) => a.p.z - b.p.z);
    let s = '<defs><radialGradient id="eg' + g + '" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#9a7448"/><stop offset="1" stop-color="#4a3219"/></radialGradient></defs>';
    s += '<rect x="2" y="2" width="76" height="98" rx="10" fill="#fff" stroke="#c8d2e0" stroke-width="2"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 4) + '" fill="#e8dcc0" opacity=".5"/>';
    list.forEach(({ c, p }) => {
      const rr = c.r * R * 0.99, x = cx + p.x * R, y = cy + p.y * R, d = clamp(p.z * 0.5 + 0.5, 0, 1);
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="url(#eg' + g + ')" stroke="#e7d4a4" stroke-width="1.3" opacity="' + (0.8 + 0.2 * d).toFixed(2) + '"/>';
    });
    s += '<text x="40" y="92" text-anchor="middle" font-size="17" font-weight="800" fill="#1b2333">' + label + '</text>';
    return '<svg viewBox="0 0 80 102" width="78" height="100" role="img" aria-label="개구리 알 그림 카드 ' + label + '">' + s + '</svg>';
  }
  const frogFigure = '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
    frogCard(3, '㉠') + frogCard(1, '㉡') + frogCard(4, '㉢') + frogCard(2, '㉣') + '</div><p class="cards-note" style="text-align:center">개구리 알 난할 그림 카드 (위에서 본 모습)</p>';

  const SEL = {
    cnt: [['', '선택'], ['6', '6개'], ['8', '8개'], ['10', '10개'], ['16', '16개'], ['32', '32개'], ['64', '64개']],
    vol: [['', '선택'], ['1/3', '1/3'], ['1/4', '1/4'], ['1/6', '1/6'], ['1/8', '1/8'], ['1/16', '1/16'], ['1/32', '1/32']],
    tot: [['', '선택'], ['1/2', '1/2'], ['1', '1'], ['2', '2'], ['4', '4'], ['16', '16']],
  };
  const sel = (id, kind) => '<select class="tsel" data-id="' + id + '" aria-label="' + id + '">' + SEL[kind].map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select>';
  const tableFigure = '<table class="tbl-fill"><thead><tr><th>분열 횟수</th><th>세포 수</th><th>세포 하나의 부피</th><th>전체 부피</th></tr></thead><tbody>' +
    '<tr><td class="k">1회</td><td>2개</td><td>1/2</td><td>1</td></tr>' +
    '<tr><td class="k">2회</td><td>4개</td><td>' + sel('v2', 'vol') + '</td><td>1</td></tr>' +
    '<tr><td class="k">3회</td><td>' + sel('c3', 'cnt') + '</td><td>' + sel('v3', 'vol') + '</td><td>1</td></tr>' +
    '<tr><td class="k">4회</td><td>16개</td><td>1/16</td><td>' + sel('t4', 'tot') + '</td></tr>' +
    '<tr><td class="k">5회</td><td>' + sel('c5', 'cnt') + '</td><td>1/32</td><td>1</td></tr></tbody></table>';
  document.addEventListener('change', (e) => { if (e.target && e.target.classList && e.target.classList.contains('tsel')) e.target.classList.toggle('has', !!e.target.value); });
  const ANS = { v2: '1/4', c3: '8', v3: '1/8', t4: '1', c5: '32' };
  function readTable() {
    const r = {};
    $$('.tsel').forEach((s) => { r[s.dataset.id] = s.value; });
    return r;
  }

  function levelSetup(name, hint) {
    return function () { setScene(name); if (hint) showHint(hint, 6000); };
  }

  game = SciSim.game({
    simId: 'm3-development',
    mount: '#game',
    badge: '발생 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      sperm: '🏊 정자 출발 버튼',
      cleave: '✂️ 분열 버튼 · 📏 크기 게이지',
      graphs: '📊 분열 횟수별 그래프',
      compare: '🔍 체세포분열과 비교',
      chromo: '🧬 염색체 수 게이지',
      clay: '🧸 점토 모형 놓기',
    },
    onFeatures(set) { F = set; },
    levels: [
      {
        title: '정자와 난자의 만남', short: '수정', icon: '🏊', phase: '관찰',
        features: ['sperm'],
        intro: '<p class="si-q">❓ 탐구 질문: 하나의 수정란이 어떻게 수많은 세포로 이루어진 몸이 될까?</p>' +
          '<p>그 시작은 <b>수정</b>이에요. 먼저 정자와 난자가 만나는 모습을 관찰해 봐요. <b>정자 출발!</b>을 누르면 정자들이 난자를 향해 헤엄쳐요.</p>',
        setup: levelSetup('fert', '🏊 “정자 출발!”을 눌러 보세요'),
        recap: '정자와 난자가 만나는 것을 <b>수정</b>이라고 해요. 정자 <b>1개</b>만 들어가고, 염색체 <b>23 + 23 = 46개</b>인 <b>수정란</b>이 만들어져요.',
        summary: '<p><b>수정</b>: 정자와 난자가 만나 핵이 합쳐지는 것. 이때 만들어진 세포가 <b>수정란</b>이다.</p>' +
          '<p>정자 <b>한 개</b>만 난자 속으로 들어가고, 난자 둘레에 수정막이 생겨 다른 정자는 들어오지 못한다. 사람의 정자와 난자는 염색체가 각각 <b>23개</b>이므로 수정란의 염색체는 <b>23 + 23 = 46개</b>이다.</p>',
        missions: [
          {
            title: '수정시키기',
            goal: '<b>정자 출발!</b>을 눌러 정자가 난자와 만나는 과정을 끝까지 지켜보세요. 두 핵이 하나로 합쳐지면 성공이에요.',
            hint: '버튼을 누르고 기다려요. 정자 한 개가 들어가면 화면이 난자 속으로 확대돼요.',
            hold: 0.6,
            check: () => scene === 'fert' && FT.done,
            status: () => '정자 1개 침입 <b>' + mark(!!FT.win && FT.win.et > 0.9) + '</b> · 수정막 <b>' + mark(FT.mem) + '</b> · 핵 합치기 <b>' + mark(FT.done) + '</b>',
            explain: '정자 한 개가 난자 속으로 들어가자 난자 둘레에 <b>수정막</b>이 생겨 다른 정자는 들어오지 못했어요. 이어서 <b>정자의 핵</b>과 <b>난자의 핵</b>이 합쳐져 <b>수정란</b>의 핵이 되었어요.',
          },
          {
            type: 'quiz', title: '들어간 정자는 몇 개?',
            goal: '수정이 일어날 때 난자 속으로 들어가 핵이 합쳐지는 정자는 몇 개일까요?',
            choices: ['1개', '2개', '정자 수십 개', '난자의 크기에 따라 달라요'],
            answer: 0,
            feedback: ['', '정자가 하나 들어가면 난자 둘레에 수정막이 생겼죠? 그 뒤에는 어떻게 되었나요?', '많은 정자가 출발하지만 모두 들어가지는 못했어요.', '관찰한 장면을 다시 떠올려 보세요. 수정막이 생긴 뒤 다른 정자는 어땠나요?'],
            explain: '수많은 정자가 난자를 향해 헤엄치지만, <b>정자 1개</b>만 난자 속으로 들어가요. 수정막이 생겨 다른 정자는 들어올 수 없어요.',
          },
          {
            type: 'quiz', title: '수정란의 염색체 수',
            goal: '정자의 핵(염색체 23개)과 난자의 핵(염색체 23개)이 합쳐진 <b>수정란</b>의 염색체는 모두 몇 개일까요?',
            choices: ['23개', '46개', '69개', '92개'],
            answer: 1,
            feedback: ['23개는 정자 또는 난자 하나의 염색체 수예요. 두 핵이 합쳐졌어요.', '', '두 핵의 염색체를 더해 보세요. 23 + 23은?', '23 + 23을 계산해 보세요.'],
            explain: '정자 23개 + 난자 23개 = <b>46개</b>. 수정란은 부모에게서 염색체를 반씩 받아 사람의 체세포와 같은 46개를 갖게 돼요.',
          },
        ],
      },
      {
        title: '난할: 수정란이 나뉘어요', short: '난할', icon: '✂️', phase: '모형',
        features: ['cleave'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정자와 난자가 만나 <b>수정란</b>(염색체 46개)이 만들어졌어요.</div>' +
          '<p>수정란은 곧바로 세포분열을 시작해요. 이 초기 세포분열을 <b>난할</b>이라고 해요. <b>분열시키기</b>를 눌러 <b>세포 수</b>, <b>세포 하나의 크기</b>, <b>전체 크기</b>가 어떻게 달라지는지 관찰해요.</p>',
        setup: levelSetup('cleave', '✂️ “분열시키기”를 눌러 보세요'),
        recap: '난할이 일어날 때마다 <b>세포 수는 2배</b>, <b>세포 하나의 크기는 절반</b>이 되고, <b>전체 크기는 거의 그대로</b>예요.',
        summary: '<p><b>난할</b>: 수정란에서 일어나는 초기 세포분열. 세포가 자라지 않고 빠르게 분열을 거듭한다.</p>' +
          '<p>분열할 때마다 <b>세포 수는 2배</b>(1 → 2 → 4 → 8 → 16 → 32)로 늘고, <b>세포 하나의 크기는 작아지며</b>, 전체 크기는 수정란과 거의 같다.</p>',
        missions: [
          {
            title: '32세포 만들기',
            goal: '<b>분열시키기</b>를 눌러 <b>32세포</b>가 될 때까지 난할을 진행해 보세요. 오른쪽 게이지를 잘 보세요.',
            hint: '버튼을 누를 때마다 세포 수가 2배가 돼요: 1 → 2 → 4 → 8 → 16 → 32.',
            hold: 0.8,
            check: () => scene === 'cleave' && CL.g >= 5 && !CL.busy,
            status: () => '세포 수 <b>' + (1 << CL.g) + ' / 32개</b> · 세포 하나의 크기 <b>' + fracText(1 << CL.g) + '</b> · 전체 크기 <b>그대로</b>',
            explain: '분열할 때마다 세포 수는 <b>2배</b>가 되고 세포 하나의 크기는 <b>절반</b>이 되었어요. 곱해 보면 (세포 수 × 세포 하나의 크기)가 늘 같아서, <b>바깥 경계(전체 크기)</b>는 수정란과 거의 같았어요.',
          },
          {
            type: 'quiz', title: '32세포가 되었을 때',
            goal: '처음의 수정란과 비교했을 때, 32세포 덩어리는 어떻게 달라졌을까요?',
            choices: ['세포 수는 늘고, 세포 하나는 작아졌으며, 전체 크기는 거의 같다', '세포 수는 늘고, 세포 하나의 크기는 그대로이며, 전체 크기가 커졌다', '세포 수는 늘고, 세포 하나는 더 커졌다', '세포 수는 그대로이고, 세포 하나가 작아졌다'],
            answer: 0,
            feedback: ['', '게이지에서 세포 하나의 크기가 어떻게 변했는지, 바깥 경계가 커졌는지 다시 보세요.', '세포 하나의 크기 게이지는 점점 줄어들었어요.', '세포 수 게이지는 1에서 32까지 늘었어요.'],
            explain: '난할에서는 세포가 자라지 않고 분열만 이어져요. 그래서 <b>세포 수는 늘고 세포 하나의 크기는 작아지지만</b>, 전체 크기는 수정란과 거의 같아요.',
          },
        ],
      },
      {
        title: '난할의 특징 분석', short: '난할의 특징', icon: '📊', phase: '분석',
        features: ['graphs', 'compare', 'chromo'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 32세포가 될 때까지 난할을 관찰했어요. 세포 수는 늘고 세포 하나는 작아졌지요.</div>' +
          '<p>이번에는 <b>분열 횟수</b>에 따라 세포 수, 세포 하나의 부피, 전체 부피가 어떻게 달라지는지 그래프로 해석해요. 또 보통의 체세포분열과 비교해 난할의 특징을 찾아봐요.</p>',
        setup: levelSetup('graph', '📊 분열 횟수를 바꿔 그래프를 읽어 보세요'),
        recap: '난할은 <b>세포가 자라지 않고</b> 곧바로 다음 분열을 해요. 분열해도 <b>염색체 수는 46개로 그대로</b>예요.',
        summary: '<p>분열 횟수가 늘 때: 세포 수 <b>2배씩 증가</b>(2, 4, 8, 16, 32), 세포 하나의 부피 <b>절반씩 감소</b>(1/2, 1/4, 1/8 …), 전체 부피 <b>일정</b>.</p>' +
          '<p>보통의 체세포분열은 분열 사이에 세포가 자라지만, 난할은 <b>자라지 않고</b> 바로 분열한다. 체세포분열의 한 종류이므로 세포 하나의 <b>염색체 수는 46개로 변하지 않는다</b>.</p>',
        missions: [
          {
            title: '그래프 읽어 보기',
            goal: '분열 횟수를 <b>0부터 5까지</b> 모두 바꿔 보고, <b>🔍 비교 보기</b>를 켜서 체세포분열과 난할을 비교해 보세요.',
            hint: '아래의 0~5 버튼을 차례로 누르고, 그 옆 “비교 보기” 버튼도 눌러요.',
            hold: 0.6,
            check: () => scene === 'graph' && G.visited.size >= 6 && G.cmpSeen,
            status: () => '분열 횟수 0~5 <b>' + G.visited.size + ' / 6</b> · 비교 보기 <b>' + mark(G.cmpSeen) + '</b>',
            explain: '분열 횟수가 늘수록 세포 수는 <b>2배씩 커지는</b> 그래프, 세포 하나의 부피는 <b>절반씩 줄어드는</b> 그래프가 돼요. 전체 부피 그래프는 <b>막대 높이가 늘 같아요</b>.',
          },
          {
            title: '표 완성하기', manual: true,
            goal: '표의 빈칸을 알맞게 채워 보세요. (수정란의 부피를 1로 해요)',
            figure: tableFigure,
            hint: '분열할 때마다 세포 수는 2배, 세포 하나의 부피는 절반이 돼요. 전체 부피 = 세포 수 × 세포 하나의 부피예요.',
            check: () => {
              const r = readTable();
              if (Object.values(r).some((v) => !v)) return '아직 비어 있는 칸이 있어요.';
              if (r.c3 !== ANS.c3 || r.c5 !== ANS.c5) return '세포 수는 분열할 때마다 2배가 돼요.';
              if (r.v2 !== ANS.v2 || r.v3 !== ANS.v3) return '세포 하나의 부피는 분열할 때마다 절반이 돼요.';
              if (r.t4 !== ANS.t4) return '전체 부피 = 세포 수 × 세포 하나의 부피를 계산해 보세요. 16 × 1/16은?';
              return true;
            },
            explain: '세포 수는 <b>2, 4, 8, 16, 32</b>로 2배씩 늘고, 세포 하나의 부피는 <b>1/2, 1/4, 1/8, 1/16, 1/32</b>로 절반씩 줄어요. 둘을 곱하면 늘 1이라 <b>전체 부피는 변하지 않아요</b>.',
          },
          {
            type: 'quiz', title: '난할의 특징',
            goal: '난할은 보통의 체세포분열과 비교할 때 어떤 특징이 있을까요?',
            choices: ['세포가 자라고 나서 분열하며, 염색체 수는 23개로 줄어든다', '세포가 자라지 않고 분열하며, 염색체 수는 분열할 때마다 절반이 된다', '세포가 자라지 않고 곧바로 분열하며, 세포 하나의 염색체 수는 46개로 그대로이다', '세포가 자라서 전체 크기가 2배씩 커진다'],
            answer: 2,
            feedback: ['난할에서는 세포가 자라지 않아요. 염색체가 23개로 줄어드는 것은 생식세포를 만들 때예요.', '염색체 수가 절반이 되는 것은 생식세포 형성 과정이에요. 난할은 체세포분열과 같이 염색체 수가 그대로예요.', '', '전체 크기 그래프를 다시 보세요. 막대 높이가 어떻게 변했나요?'],
            explain: '난할은 체세포분열의 한 종류라서 <b>모든 세포의 염색체가 46개로 그대로</b>예요. 다만 분열 사이에 세포가 <b>자라지 않고</b> 곧바로 다음 분열을 해서 세포가 점점 작아져요.',
          },
        ],
      },
      {
        title: '발생 모형 만들기', short: '발생 모형', icon: '🧸', phase: '적용',
        features: ['clay'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 난할 동안 세포 수는 늘고 세포 하나는 작아지지만 전체 크기와 염색체 수는 그대로라는 것을 알았어요.</div>' +
          '<p>이번에는 디지털 점토로 만든 <b>모형 5개</b>를 <b>발생 순서</b>대로 놓아 보며, 수정란에서 몸이 만들어져 가는 첫 단계를 모형으로 표현해요.</p>',
        setup: levelSetup('clay', '🧸 모형을 끌어서 ①~⑤ 자리에 놓아요'),
        recap: '수정란은 <b>난할</b>로 세포 수를 늘리고, 이후 세포들이 모양과 기능이 다른 세포로 바뀌어 <b>조직 → 기관 → 개체</b>가 돼요.',
        summary: '<p>발생 모형: <b>수정란 → 2세포 → 4세포 → 8세포 → 많은 세포 덩어리</b> 순서로 난할이 일어난다. 전체 크기는 거의 같고 세포 하나의 크기만 작아진다.</p>' +
          '<p>난할 뒤 세포들은 모양과 기능이 다른 세포로 바뀌어 <b>조직</b>과 <b>기관</b>을 이루고, 하나의 <b>개체</b>가 된다.</p>',
        missions: [
          {
            title: '발생 순서대로 놓기', manual: true,
            goal: '점토 모형 5개를 끌어 ①~⑤ 자리에 <b>수정란부터 발생 순서</b>대로 놓고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '세포 수가 적은 것부터 많아지는 순서예요. 모형의 전체 크기는 모두 같게 그렸어요.',
            check: () => {
              if (!clayFilled()) return '아직 빈 자리가 있어요. 모형 5개를 모두 놓아 주세요.';
              if (!clayCorrect()) return '순서가 맞지 않아요. 수정란에서 시작해 세포 수가 2배씩 늘어나는 순서로 놓아 보세요.';
              return true;
            },
            status: () => '놓은 모형 <b>' + P4.slots.filter((s) => s >= 0).length + ' / 5개</b>',
            explain: '수정란 → 2세포 → 4세포 → 8세포 → 많은 세포 덩어리 순서로 놓았어요. 분열할 때마다 세포 수는 <b>2배</b>가 되고 세포 하나는 작아지지만, 모형의 <b>전체 크기는 같아요</b>.',
          },
          {
            type: 'quiz', title: '개구리 알 그림 카드',
            goal: '개구리 알의 난할을 그린 카드예요. <b>세포 수가 적은 것부터</b> 순서대로 나열한 것은?',
            figure: frogFigure,
            choices: ['㉠ → ㉡ → ㉣ → ㉢', '㉢ → ㉠ → ㉣ → ㉡', '㉡ → ㉣ → ㉠ → ㉢', '㉣ → ㉡ → ㉠ → ㉢'],
            answer: 2,
            feedback: ['㉠은 8세포예요. 2세포(㉡)가 먼저 와야 해요.', '이 순서는 세포 수가 많은 것부터 나열한 거예요.', '', '2세포(㉡)가 4세포(㉣)보다 먼저예요.'],
            explain: '㉡ 2세포 → ㉣ 4세포 → ㉠ 8세포 → ㉢ 16세포 순서예요. 난할이 진행될수록 세포 수가 <b>2배씩</b> 늘어나요.',
          },
          {
            type: 'quiz', title: '난할이 끝난 뒤',
            goal: '화면처럼 난할로 세포 수가 늘어난 뒤, 세포들은 앞으로 어떻게 될까요?',
            setup() { P4.finOn = true; P4.finT = 0; },
            choices: ['모든 세포가 똑같은 모양과 기능을 계속 유지한다', '모양과 기능이 다른 세포로 바뀌어 조직과 기관을 이루고, 하나의 개체가 된다', '세포들이 다시 합쳐져 하나의 수정란이 된다', '세포분열이 멈추고 세포가 모두 사라진다'],
            answer: 1,
            feedback: ['몸에는 신경, 근육, 피부 등 모양과 기능이 다른 세포가 있어요.', '', '세포는 다시 합쳐지지 않고, 몸을 이루며 계속 자라요.', '세포는 사라지지 않고 몸을 이루어요.'],
            explain: '난할 뒤 세포들은 <b>모양과 기능이 다른 세포</b>로 바뀌어 <b>조직</b>과 <b>기관</b>을 이루어요. (중1 ‘생물의 구성 단계’: 세포 → 조직 → 기관 → 개체) 이렇게 하나의 수정란이 몸이 된답니다.',
          },
        ],
      },
    ],
  });

  /* 이어서 하기(중간 미션에서 시작)일 때도 장면을 맞춤 */
  if (!scene) setScene(SCENES[clamp(game.level, 0, 3)]);

  /* =========================================================
     메인 루프
     ========================================================= */
  SciSim.loop((dt, t) => {
    tNow = t;
    if (scene === 'fert') updFert(dt);
    else if (scene === 'cleave') updCleave(dt);
    else if (scene === 'graph') updGraph(dt);
    else if (scene === 'clay') updClay(dt);
    view.apply();
    ctx.clearRect(0, 0, 800, 520);
    if (scene === 'fert') drawFert(t);
    else if (scene === 'cleave') drawCleave(t);
    else if (scene === 'graph') drawGraph(t);
    else if (scene === 'clay') drawClay(t);
    // 새로 열린 도구 표시
    const gb = $('#divBtn'), cb = $('#cmpBtn');
    gb.classList.toggle('target', scene === 'cleave' && CL.g === 0 && !CL.busy && game.has('cleave') && game.phase === 'active');
    cb.classList.toggle('target', scene === 'graph' && !G.cmpSeen && game.phase === 'active' && game.has('compare') && G.visited.size >= 3);
    $('#goBtn').classList.toggle('target', scene === 'fert' && FT.ph === 'idle');
  });

  /* 시험용 */
  window.__sim = {
    game, get scene() { return scene; }, FT, CL, G, P4,
    toClient(x, y) {
      const r = view.canvas.getBoundingClientRect();
      return { x: r.left + x * r.width / 800, y: r.top + y * r.height / 520 };
    },
    slotPos: SLOT, homePos: (k) => { const m = P4.models[k]; return { x: m.x.value, y: m.y.value }; },
    place(k, slot) { placeModel(P4.models[k], slot); },
    correct: () => clayCorrect(),
    divide, startSperm, setN, setCmp,
  };
})();
