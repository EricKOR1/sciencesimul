/* =========================================================
   중3 Ⅵ. 생식과 유전 — 세포분열이 필요한 까닭 [9과21-01]
   ① [실험] 우무 정육면체(한 변 1·2·3 cm)에 색이 스며드는 실험 → 잘라서 물든 비율 비교
   ② [분석] 표면적·부피·표면적÷부피 표 채우기 → 막대그래프
   ③ [모형] 세포가 커지면 중심부가 '부족' → 분열하면 두 세포 모두 충분
   ④ [적용] 생쥐·코끼리의 세포(크기는 비슷, 수가 다름) · 뿌리 끝(생장점)에서 활발한 세포분열
   ※ 우무 실험 값: 10분 후 약 0.25 cm 깊이, 물든 비율 1 cm 약 88 %, 2 cm 약 58 %, 3 cm 약 42 %
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const W = 800, H = 540;
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eef6f1' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const CO = SciSim.color;
  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fx = new Particles();
  const SQ = 0.8660254;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  /* ---------- 안내 말풍선 · 계기판 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 5000);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = i + '|' + label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }

  /* ---------- 화면(장면) 전환 ---------- */
  const S = { scene: 'soak', sceneA: 1, view: 'area', volP: 1, tableDone: false, bars: [0, 0, 0, 0, 0, 0, 0, 0, 0], life: 'animals' };
  const TB_LABEL = {
    soak: '🧫 우무 정육면체 실험', table: '📊 표면적과 부피', cell: '🔬 세포 모형: 크기와 물질 교환', animals: '🐭🐘 생쥐와 코끼리의 세포', root: '🌱 뿌리 끝의 세포분열',
  };
  const BG = { soak: 'linear-gradient(#e8f3ee 0 80%, #d8b98a 80%)', table: '#eef6f1', cell: 'linear-gradient(#e1f1ff, #e9f7ee)', animals: 'linear-gradient(#e3f2fb, #d9ecd3)', root: '#e3f2fb' };
  function updateUI() {
    const sc = S.scene;
    const set = sc === 'animals' || sc === 'root' ? 'life' : sc;
    ['soak', 'table', 'cell', 'life'].forEach((k) => { $('#cs-' + k).hidden = k !== set; });
    $('#tableCard').hidden = sc !== 'table';
    $('#readouts').hidden = sc === 'table';
    $('#tbLabel').textContent = TB_LABEL[sc];
    view.wrap.style.setProperty('--stage-bg', BG[sc]);
    $$('#lifeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === sc));
    $('#rootBtn').hidden = sc !== 'root';
    $('#lifeNote').textContent = sc === 'root' ? '뿌리 끝에서 세포가 분열하는 모습을 확대해서 봐요.' : '생쥐와 코끼리를 눌러 같은 크기의 조직을 확대해 봐요.';
    view.resize();
  }
  function setScene(name) {
    if (S.scene !== name) {
      S.scene = name; S.sceneA = 0;
      tween(S, { sceneA: 1 }, { duration: 0.5, ease: 'outCubic' });
    }
    updateUI();
  }

  /* ---------- 기하 도우미 (등각 투영) ---------- */
  // 정육면체의 앞쪽 아래 꼭짓점 o에서 a(오른쪽 위), b(왼쪽 위), c(위) 방향으로 s만큼
  function Pt(o, s, a, b, c) { return [o.x + (a - b) * SQ * s, o.y - (a + b) * 0.5 * s - c * s]; }
  function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function fillPoly(pts, fill) { poly(pts); ctx.fillStyle = fill; ctx.fill(); }
  function strokePoly(pts, color, lw) { poly(pts); ctx.strokeStyle = color; ctx.lineWidth = lw || 1.4; ctx.lineJoin = 'round'; ctx.stroke(); }
  function inPoly(p, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const PALE = { top: '#fbf2d4', left: '#eddeb4', right: '#dcc995' };
  const PINK = { top: '#f0679f', left: '#dc3d86', right: '#b52269' };

  function drawBox(o, s, a0, a1, k) {
    const P = (a, b, c) => Pt(o, s, a, b, c);
    const t = k.t;
    const Lf = [P(a0, 0, 0), P(a0, 1, 0), P(a0, 1, 1), P(a0, 0, 1)];
    const Rt = [P(a0, 0, 0), P(a1, 0, 0), P(a1, 0, 1), P(a0, 0, 1)];
    const Tp = [P(a0, 0, 1), P(a1, 0, 1), P(a1, 1, 1), P(a0, 1, 1)];
    const face = (pl, pale, pink, win) => {
      fillPoly(pl, pale);
      if (k.shellA > 0.01) {
        ctx.save();
        ctx.globalAlpha *= k.shellA * (1 - 0.36 * k.xray);
        fillPoly(pl, pink);
        ctx.restore();
        if (win && k.xray > 0.02 && t > 0.012) {
          ctx.save(); ctx.globalAlpha *= 0.62 * k.xray * k.shellA; fillPoly(win, pale); ctx.restore();
          strokePoly(win, 'rgba(120,40,80,.28)', 1);
        }
      }
      strokePoly(pl, 'rgba(70,30,60,.5)', 1.5);
    };
    if (k.cutFace) {
      fillPoly(Lf, t > 0 ? '#e4467f' : '#fff2cc');
      const core = [P(a0, t, t), P(a0, 1 - t, t), P(a0, 1 - t, 1 - t), P(a0, t, 1 - t)];
      fillPoly(core, '#fff2cc');
      ctx.save(); poly(Lf); ctx.clip();
      ctx.globalAlpha = 0.22; fillPoly([P(a0, -0.1, 0.78), P(a0, 0.32, 1.1), P(a0, 0.52, 1.1), P(a0, 0.1, 0.7)], '#fff');
      ctx.restore();
      strokePoly(core, 'rgba(120,40,80,.4)', 1.2);
      strokePoly(Lf, 'rgba(70,30,60,.55)', 1.6);
      if (k.glow) {
        ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * Math.sin(k.glow * 5); strokePoly(Lf, '#14a058', 3.5); ctx.restore();
      }
    } else {
      face(Lf, PALE.left, PINK.left, [P(0, t, t), P(0, 1 - t, t), P(0, 1 - t, 1 - t), P(0, t, 1 - t)]);
    }
    face(Rt, PALE.right, PINK.right, [P(t, 0, t), P(1 - t, 0, t), P(1 - t, 0, 1 - t), P(t, 0, 1 - t)]);
    face(Tp, PALE.top, PINK.top, [P(t, t, 1), P(1 - t, t, 1), P(1 - t, 1 - t, 1), P(t, 1 - t, 1)]);
  }

  /* =========================================================
     장면 1 · 우무 실험
     ========================================================= */
  const UNIT = 40;                         // 1 cm = 40 px
  const TANK = { x: 56, y: 140, w: 688, h: 334, floor: 452, top: 168 };
  const TANK_X = [190, 400, 610], CUT_X = [135, 330, 630];
  const PCT = [88, 58, 42];
  const soak = {
    phase: 'ready', liq: 0, tMin: 0, bottle: new Spring(0, { stiffness: 80, damping: 13 }),
    xray: 1, tankA: 1, boardA: 0, seq: 0, stream: 0, splashT: 0, ripple: 0,
    cubes: [], dots: [],
  };
  const depth = () => 0.25 * Math.sqrt(clamp(soak.tMin / 10, 0, 1));
  function initSoakCubes() {
    soak.cubes = [1, 2, 3].map((cm, i) => ({ cm, x: TANK_X[i], y: 448, hop: 0, cutT: 0, tapped: false, pop: 0, glow: 0 }));
    soak.dots = [];
    for (let i = 0; i < 44; i++) soak.dots.push({ x: rnd(80, 720), y: rnd(200, 440), vx: rnd(-20, 20), vy: rnd(-20, 20), a: 1 });
  }
  initSoakCubes();
  const later = (ms, fn) => { const sq = soak.seq; setTimeout(() => { if (sq === soak.seq) fn(); }, ms); };

  function resetSoak() {
    soak.seq++;
    Object.assign(soak, { phase: 'ready', liq: 0, tMin: 0, xray: 1, tankA: 1, boardA: 0, stream: 0 });
    soak.bottle.value = 0; soak.bottle.target = 0; soak.bottle.velocity = 0;
    initSoakCubes();
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4 });
    syncSoakButtons();
  }
  function syncSoakButtons() {
    const q = soak;
    const sb = $('#soakBtn'), cb = $('#cutBtn'), note = $('#soakNote');
    sb.disabled = q.phase !== 'ready';
    cb.disabled = q.phase !== 'soaked';
    cb.classList.toggle('target', q.phase === 'soaked');
    sb.classList.toggle('target', q.phase === 'ready' && has('soak'));
    note.textContent = ({
      ready: '우무 조각을 묽은 수산화 나트륨 수용액에 10분 담가요.',
      pouring: '용액을 붓고 있어요…',
      soaking: '색이 바깥에서부터 스며드는 모습을 지켜봐요.',
      soaked: '10분이 지났어요! 꺼내서 반으로 잘라 속을 살펴봐요.',
      cutting: '칼로 반을 자르고 있어요…',
      cut: '잘린 면을 눌러 물든 비율을 확인해 보세요.',
    })[q.phase];
  }
  function startSoak() {
    const q = soak;
    if (q.phase !== 'ready') return;
    Sound.click();
    q.phase = 'pouring'; q.bottle.target = 1; syncSoakButtons();
    later(500, () => tween(q, { liq: 1 }, { duration: 2.3, ease: 'inOutQuad' }));
    later(3000, () => {
      q.bottle.target = 0; q.phase = 'soaking'; syncSoakButtons();
      showHint('⏱ 10분 동안 색이 겉에서부터 스며들어요', 4500);
    });
  }
  function startCut() {
    const q = soak;
    if (q.phase !== 'soaked') return;
    Sound.click();
    q.phase = 'cutting'; syncSoakButtons();
    tween(q, { liq: 0 }, { duration: 1.0, ease: 'inOutQuad' });
    tween(q, { xray: 0 }, { duration: 0.9 });
    later(1100, () => {
      tween(q, { tankA: 0 }, { duration: 0.5 });
      tween(q, { boardA: 1 }, { duration: 0.6 });
      q.cubes.forEach((c, i) => {
        tween(c, { x: CUT_X[i], y: 410 }, { duration: 0.8, ease: 'outCubic', delay: i * 0.08 });
        tween(c, { hop: 34 }, { duration: 0.32, ease: 'outQuad', delay: i * 0.08, onDone: () => tween(c, { hop: 0 }, { duration: 0.55, ease: 'outBounce' }) });
      });
    });
    later(2500, () => {
      q.cubes.forEach((c, i) => tween(c, { cutT: 1 }, { duration: 1.7, ease: 'linear', delay: i * 0.55 }));
    });
    later(2500 + 1700 + 1100 + 250, () => {
      q.phase = 'cut'; syncSoakButtons();
      showHint('👆 잘린 면을 눌러 물든 비율을 확인해요', 6000);
      Sound.success();
    });
  }
  function cutFacePoly(c) {
    const o = { x: c.x, y: c.y - c.hop }, s = c.cm * UNIT;
    return [Pt(o, s, 0.5, 0, 0), Pt(o, s, 0.5, 1, 0), Pt(o, s, 0.5, 1, 1), Pt(o, s, 0.5, 0, 1)];
  }
  function tapSoak(p) {
    const q = soak;
    if (q.phase !== 'cut') return false;
    for (let i = q.cubes.length - 1; i >= 0; i--) {
      const c = q.cubes[i];
      if (c.cutT < 0.99 || !inPoly(p, cutFacePoly(c))) continue;
      if (!c.tapped) {
        c.tapped = true; c.pop = 0;
        tween(c, { pop: 1 }, { duration: 0.55, ease: 'outBack' });
        Sound.click();
        const f = cutFacePoly(c);
        fx.burst((f[0][0] + f[2][0]) / 2, (f[0][1] + f[2][1]) / 2, { count: 14, colors: ['#ec4899', '#fbbf24', '#fff'], speed: 120, size: 3.5 });
      } else { c.pop = 0.6; tween(c, { pop: 1 }, { duration: 0.4, ease: 'outBack' }); }
      return false;
    }
    return false;
  }
  const hoverSoak = (p) => (soak.phase === 'cut' && soak.cubes.some((c) => c.cutT > 0.99 && inPoly(p, cutFacePoly(c)))) ? 'pointer' : null;

  function stepSoak(dt) {
    const q = soak;
    q.bottle.update(dt);
    if (q.phase === 'soaking') {
      q.tMin = Math.min(10, q.tMin + dt * 1.25);
      if (q.tMin >= 10) {
        q.tMin = 10; q.phase = 'soaked'; syncSoakButtons();
        Sound.success(); showHint('⏱ 10분이 지났어요! 이제 꺼내서 잘라 봐요', 5000);
      }
    }
    q.stream = (q.phase === 'pouring' || (q.bottle.target === 0 && q.bottle.value > 0.5 && q.phase === 'soaking')) ? clamp((q.bottle.value - 0.55) * 3, 0, 1) : 0;
    const surfY = TANK.floor - (TANK.floor - TANK.top) * q.liq;
    if (q.stream > 0.3) {
      q.splashT -= dt;
      if (q.splashT <= 0) {
        q.splashT = 0.045;
        fx.emit({ x: 618 + rnd(-9, 9), y: surfY, vx: rnd(-50, 50), vy: rnd(-130, -50), life: 0.6, size: rnd(2, 4.2), color: '#8fc8f0', gravity: 380, shape: 'bubble' });
        q.ripple = Math.min(1, q.ripple + dt * 3);
      }
    } else q.ripple = Math.max(0, q.ripple - dt * 0.8);
    // 용액 속 입자 (염기성 물질): 우무 조각 쪽으로 스며들어요
    const dep = depth();
    q.dots.forEach((d) => {
      d.vx += rnd(-1, 1) * 260 * dt; d.vy += rnd(-1, 1) * 260 * dt;
      if (q.phase === 'soaking' || q.phase === 'soaked') {
        let best = null, bd = 1e9;
        q.cubes.forEach((c) => { const dd = Math.hypot(d.x - c.x, d.y - (c.y - c.cm * UNIT)); if (dd < bd) { bd = dd; best = c; } });
        if (best && q.phase === 'soaking') { d.vx += ((best.x - d.x) / bd) * 26 * dt * 3; d.vy += (((best.y - best.cm * UNIT) - d.y) / bd) * 26 * dt * 3; }
      }
      const sp = Math.hypot(d.vx, d.vy), mx = 46;
      if (sp > mx) { d.vx *= mx / sp; d.vy *= mx / sp; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < 76) { d.x = 76; d.vx = Math.abs(d.vx); } if (d.x > 724) { d.x = 724; d.vx = -Math.abs(d.vx); }
      if (d.y < 186) { d.y = 186; d.vy = Math.abs(d.vy); } if (d.y > 440) { d.y = 440; d.vy = -Math.abs(d.vy); }
      let inside = false;
      for (const c of q.cubes) {
        const s = c.cm * UNIT;
        if (Math.abs(d.x - c.x) < SQ * s * 0.92 && d.y > c.y - 2 * s + 6 && d.y < c.y - 4) { inside = true; break; }
      }
      if (inside && q.phase === 'soaking') { d.a -= dt * 5; if (d.a <= 0) { d.a = 1; d.x = rnd(80, 720); d.y = rnd(200, 440); } } else d.a = Math.min(1, d.a + dt * 3);
    });
    q.cubes.forEach((c) => {
      if (c.tapped) c.glow = 0; else if (q.phase === 'cut' && c.cutT > 0.99) c.glow += dt; else c.glow = 0;
    });
  }

  function drawBottle(a) {
    ctx.save();
    ctx.translate(618, 56); ctx.rotate(-a * 1.9);
    D.shadow(() => { ctx.fillStyle = '#e9f5fb'; D.roundRect(-26, 24, 52, 100, 14); ctx.fill(); D.roundRect(-10, 0, 20, 30, 5); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(120,180,235,.75)'; D.roundRect(-23, 56, 46, 65, 11); ctx.fill();
    ctx.fillStyle = '#fff'; D.roundRect(-23, 62, 46, 30, 6); ctx.fill();
    ctx.strokeStyle = '#8fa8bd'; ctx.lineWidth = 2; D.roundRect(-26, 24, 52, 100, 14); ctx.stroke(); D.roundRect(-10, 0, 20, 30, 5); ctx.stroke();
    ctx.fillStyle = '#2b3b55'; ctx.font = D.font(13, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NaOH', 0, 78); ctx.font = D.font(10, 700); ctx.fillText('묽은 용액', 0, 90);
    ctx.fillStyle = '#e7513d'; D.roundRect(-12, -6, 24, 10, 3); ctx.fill();
    ctx.restore();
  }

  function drawKnife(c) {
    const o = { x: c.x, y: c.y - c.hop }, s = c.cm * UNIT;
    const T = c.cutT;
    if (T <= 0.001 || T >= 0.64) return;
    const cb = T < 0.36 ? lerp(1.35, -0.05, smooth(T / 0.36)) : lerp(-0.05, 1.5, smooth((T - 0.36) / 0.26));
    const P = (b, cc) => Pt(o, s, 0.5, b, cc);
    ctx.save();
    D.shadow(() => {
      fillPoly([P(-0.25, cb), P(1.25, cb), P(1.25, cb + 0.9), P(-0.25, cb + 0.9)], '#eef2f7');
    }, { blur: 6, y: 2, color: 'rgba(0,0,0,.25)' });
    strokePoly([P(-0.25, cb), P(1.25, cb), P(1.25, cb + 0.9), P(-0.25, cb + 0.9)], '#8793a6', 1.6);
    fillPoly([P(-0.25, cb), P(1.25, cb), P(1.25, cb + 0.06), P(-0.25, cb + 0.06)], '#c4ccd8');
    fillPoly([P(0.3, cb + 0.9), P(0.7, cb + 0.9), P(0.7, cb + 1.28), P(0.3, cb + 1.28)], '#8a5a2b');
    strokePoly([P(0.3, cb + 0.9), P(0.7, cb + 0.9), P(0.7, cb + 1.28), P(0.3, cb + 1.28)], '#5b3a18', 1.5);
    ctx.restore();
  }

  function drawCubeSoak(c, i) {
    const q = soak;
    const s = c.cm * UNIT, o = { x: c.x, y: c.y - c.hop }, og = { x: c.x, y: c.y };
    const d = depth(), t = d / c.cm;
    const shellA = clamp(d / 0.05, 0, 1);
    // 바닥 그림자
    const grow = 1.1;
    const fp = [Pt(og, s, -0.05, -0.05, 0), Pt(og, s, grow, -0.05, 0), Pt(og, s, grow, grow, 0), Pt(og, s, -0.05, grow, 0)];
    ctx.save(); ctx.globalAlpha *= clamp(1 - c.hop / 70, 0.4, 1) * 0.55; D.shadow(() => fillPoly(fp, 'rgba(40,40,60,.18)'), { blur: 12, y: 3, color: 'rgba(30,30,50,.25)' }); ctx.restore();
    if (c.cutT <= 0.001) {
      drawBox(o, s, 0, 1, { t, shellA, xray: q.xray });
    } else {
      const sl = SciSim.ease.outBack(clamp((c.cutT - 0.5) / 0.5, 0, 1));
      drawBox(o, s, 0.5, 1, { t: 0.25 / c.cm, shellA: 1, xray: 0, cutFace: true, glow: c.glow });
      const o2 = { x: o.x - SQ * s * sl, y: o.y + 0.5 * s * sl };
      drawBox(o2, s, 0, 0.5, { t: 0.25 / c.cm, shellA: 1, xray: 0 });
      drawKnife(c);
    }
  }

  function pill(x, y, text, o) {
    return D.label(x, y, text, o);
  }

  function drawSoak(t) {
    const q = soak;
    // 방과 실험대
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e8f3ee'); g.addColorStop(0.86, '#f5faf6'); g.addColorStop(1, '#f5faf6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d8b98a'; ctx.fillRect(0, 474, W, H - 474);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 474, W, 3);
    ctx.fillStyle = 'rgba(120,80,30,.12)'; for (let i = 0; i < 6; i++) ctx.fillRect(0, 490 + i * 11, W, 1.5);

    // 도마 (자르기)
    if (q.boardA > 0.01) {
      ctx.save(); ctx.globalAlpha *= q.boardA; ctx.translate(0, (1 - q.boardA) * 30);
      D.shadow(() => { ctx.fillStyle = '#f2ddb4'; D.roundRect(24, 262, 752, 236, 22); ctx.fill(); }, { blur: 16, y: 6 });
      const bg = ctx.createLinearGradient(0, 262, 0, 498); bg.addColorStop(0, '#f8e9c8'); bg.addColorStop(1, '#ebd09f');
      ctx.fillStyle = bg; D.roundRect(24, 262, 752, 236, 22); ctx.fill();
      ctx.fillStyle = '#d6b177'; D.roundRect(24, 484, 752, 14, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,50,.18)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(40, 290 + i * 30); ctx.bezierCurveTo(260, 282 + i * 30, 520, 300 + i * 30, 760, 290 + i * 30); ctx.stroke(); }
      ctx.restore();
    }

    // 수조 뒷면
    if (q.tankA > 0.01) {
      ctx.save(); ctx.globalAlpha *= q.tankA;
      const bw = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
      bw.addColorStop(0, '#fbfeff'); bw.addColorStop(1, '#e3f0f6');
      ctx.fillStyle = bw; D.roundRect(TANK.x, TANK.y, TANK.w, TANK.h, 16); ctx.fill();
      ctx.fillStyle = '#cfe2ec'; ctx.fillRect(TANK.x + 4, TANK.floor, TANK.w - 8, TANK.y + TANK.h - TANK.floor - 4);
      ctx.restore();
    }

    // 우무 조각
    soak.cubes.forEach(drawCubeSoak);

    // 수조 용액 · 유리
    if (q.tankA > 0.01) {
      ctx.save(); ctx.globalAlpha *= q.tankA;
      const topY = TANK.floor - (TANK.floor - TANK.top) * q.liq;
      if (q.liq > 0.004) {
        const lg = ctx.createLinearGradient(0, topY, 0, TANK.floor);
        lg.addColorStop(0, 'rgba(140,200,245,.42)'); lg.addColorStop(1, 'rgba(70,140,215,.5)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(TANK.x + 6, TANK.floor);
        const amp = 2 + 5 * q.ripple;
        for (let x = TANK.x + 6; x <= TANK.x + TANK.w - 6; x += 8) ctx.lineTo(x, topY + Math.sin(x * 0.045 + t * 3) * amp);
        ctx.lineTo(TANK.x + TANK.w - 6, TANK.floor); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let x = TANK.x + 6; x <= TANK.x + TANK.w - 6; x += 8) { const y = topY + Math.sin(x * 0.045 + t * 3) * amp; x === TANK.x + 6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        // 입자
        if (q.liq > 0.9) {
          q.dots.forEach((d) => {
            ctx.globalAlpha = d.a * 0.85 * q.tankA * clamp((q.liq - 0.9) * 10, 0, 1);
            ctx.fillStyle = '#d6247a';
            ctx.beginPath(); ctx.arc(d.x, d.y, 3.2, 0, 6.2832); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(d.x - 1, d.y - 1.1, 1, 0, 6.2832); ctx.fill();
          });
          ctx.globalAlpha = q.tankA;
        }
      }
      // 유리
      ctx.strokeStyle = 'rgba(110,150,175,.85)'; ctx.lineWidth = 3.5; D.roundRect(TANK.x, TANK.y, TANK.w, TANK.h, 16); ctx.stroke();
      const hl = ctx.createLinearGradient(TANK.x, 0, TANK.x + 60, 0);
      hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; ctx.fillRect(TANK.x + 8, TANK.y + 12, 56, TANK.h - 30);
      if (q.liq > 0.5) pill(400, 464, '묽은 수산화 나트륨 수용액', { bg: 'rgba(43,59,85,.85)', size: 13 });
      ctx.restore();
    }

    // 병 · 물줄기
    if (q.bottle.value > 0.01) {
      const surfY = TANK.floor - (TANK.floor - TANK.top) * q.liq;
      if (q.stream > 0.02) {
        ctx.save(); ctx.globalAlpha = 0.8 * q.stream;
        ctx.strokeStyle = 'rgba(120,185,240,.9)'; ctx.lineWidth = 7 * q.stream; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(618, 62); ctx.lineTo(618 + Math.sin(t * 20) * 1.2, surfY); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(616, 62); ctx.lineTo(616, surfY); ctx.stroke();
        ctx.restore();
      }
      drawBottle(q.bottle.value);
    }

    // 시계 (담근 시간)
    if (q.phase !== 'ready' && q.phase !== 'pouring' && q.phase !== 'cut' && q.phase !== 'cutting' || (q.phase === 'cutting' && q.tankA > 0.5)) {
      const cx = 98, cy = 78, r = 34;
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill(); }, { blur: 10, y: 3 });
      ctx.strokeStyle = '#d3dae6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, 6.2832); ctx.stroke();
      const f = clamp(q.tMin / 10, 0, 1);
      ctx.strokeStyle = f >= 1 ? '#14a058' : '#e76f51'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r - 4, -Math.PI / 2, -Math.PI / 2 + f * 6.2832); ctx.stroke();
      D.text(cx, cy - 2, Math.floor(q.tMin) + '분', { size: 17, weight: 800, color: '#1b2333' });
      D.text(cx, cy + 15, '/ 10분', { size: 11.5, weight: 700, color: '#6b7788' });
      D.text(cx + r + 10, cy + 5, f >= 1 ? '10분 완료!' : '담근 시간', { size: 14, weight: 800, color: f >= 1 ? '#0b7a41' : '#4a5568', align: 'left' });
    }

    // 조각 이름표 · 결과 말풍선
    soak.cubes.forEach((c, i) => {
      const ly = lerp(498, 524, q.boardA);
      D.text(c.x, ly, '한 변 ' + c.cm + ' cm', { size: 15, weight: 800, color: '#5a4630' });
      if (c.tapped && c.pop > 0.01) {
        const s = c.cm * UNIT;
        const py = c.y - 2 * s - 20 - c.hop;
        ctx.save(); ctx.translate(c.x, py); ctx.scale(c.pop, c.pop); ctx.translate(-c.x, -py);
        pill(c.x, py, '물든 부분 약 ' + PCT[i] + ' %', { bg: '#be185d', size: 15, pad: 11 });
        ctx.restore();
      }
    });
    if (q.phase === 'cut' && q.cubes.every((c) => c.tapped)) {
      pill(400, 100, '물든 깊이는 모두 약 0.25 cm! 그런데 비율은 달라요', { bg: '#14532d', size: 14, pad: 12 });
    } else if (q.phase === 'cut') {
      pill(400, 100, '👆 잘린 면을 눌러 보세요', { bg: 'rgba(27,35,51,.82)', size: 14, pad: 12 });
    }
    // 처음 안내
    if (q.phase === 'ready') {
      pill(400, 108, '🥽 실제 실험에서는 보안경과 장갑을 꼭 써요', { bg: '#fff3cf', color: '#7a5200', border: '#f0d27a', size: 13.5, pad: 12 });
    }
    if (q.phase === 'soaking' && q.tMin < 4) {
      D.arrow(486, 238, 548, 288, { color: '#be185d', width: 3, head: 12 });
      pill(470, 224, '겉에서부터 물들어요', { bg: '#be185d', size: 13.5, pad: 10 });
    }
  }

  /* =========================================================
     장면 2 · 표면적과 부피 (표 + 막대그래프)
     ========================================================= */
  const TU = 34;
  const TCUBES = [{ n: 1, x: 66, y: 384 }, { n: 2, x: 160, y: 384 }, { n: 3, x: 292, y: 384 }];
  const ANS = { sa2: 24, sa3: 54, v2: 8, v3: 27, r2: 3, r3: 2 };
  const SA = [6, 24, 54], VO = [1, 8, 27], RA = [6, 3, 2];
  const tbl = { inputs: {}, marked: {} };

  function buildTable() {
    const t = $('#vtable');
    const cell = (key) => '<td><input id="in-' + key + '" data-k="' + key + '" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" aria-label="' + key + '"></td>';
    t.innerHTML =
      '<thead><tr><th>한 변</th><th>1 cm</th><th>2 cm</th><th>3 cm</th></tr></thead><tbody>' +
      '<tr><th>표면적 (cm²)</th><td class="given">6</td>' + cell('sa2') + cell('sa3') + '</tr>' +
      '<tr><th>부피 (cm³)</th><td class="given">1</td>' + cell('v2') + cell('v3') + '</tr>' +
      '<tr><th>표면적 ÷ 부피</th><td class="given">6</td>' + cell('r2') + cell('r3') + '</tr></tbody>';
    $$('#vtable input').forEach((inp) => {
      tbl.inputs[inp.dataset.k] = inp;
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/[^0-9]/g, '');
        inp.classList.remove('bad');
        const ok = inp.value !== '' && +inp.value === ANS[inp.dataset.k];
        if (ok && !inp.classList.contains('ok')) { Sound.click(); }
        inp.classList.toggle('ok', ok);
        if (tableAllOk() && !S.tableDone) {
          S.tableDone = true; Sound.success();
          S.bars.forEach((_, i) => { S.bars[i] = 0; tween(S.bars, { [i]: 1 }, { duration: 0.9, ease: 'outBack', delay: 0.15 + i * 0.09 }); });
          const r = view.canvas.getBoundingClientRect();
          fx.burst(600, 200, { count: 16, speed: 150 });
        }
      });
    });
  }
  const tableAllOk = () => Object.keys(ANS).every((k) => tbl.inputs[k] && +tbl.inputs[k].value === ANS[k] && tbl.inputs[k].value !== '');
  function tableCheck() {
    let empty = 0, firstBad = null;
    Object.keys(ANS).forEach((k) => {
      const inp = tbl.inputs[k], v = inp.value;
      if (v === '') { empty++; return; }
      if (+v !== ANS[k]) {
        if (!firstBad) firstBad = k;
        if (!inp.classList.contains('bad')) inp.classList.add('bad');
      } else inp.classList.remove('bad');
    });
    if (tableAllOk()) return true;
    if (firstBad) {
      if (/^sa/.test(firstBad)) return '표면적 칸을 다시 확인해요. (한 면의 넓이) × 6 이에요.';
      if (/^v/.test(firstBad)) return '부피 칸을 다시 확인해요. (한 변)을 세 번 곱해요.';
      return '표면적 ÷ 부피 칸을 다시 계산해 봐요. 위쪽 두 칸의 값을 나누면 돼요.';
    }
    return '아직 빈칸이 ' + empty + '개 남았어요.';
  }
  function resetTable() {
    Object.values(tbl.inputs).forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); });
    S.tableDone = false; S.bars.fill(0);
    S.volP = 0; tween(S, { volP: 1 }, { duration: 1.2, ease: 'linear' });
  }
  function setView(v) {
    if (S.view === v) return;
    S.view = v; Sound.click();
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    S.volP = 0; tween(S, { volP: 1 }, { duration: v === 'volume' ? 1.4 : 0.6, ease: 'linear' });
  }

  function drawTableCube(c) {
    const n = c.n, s = n * TU, o = { x: c.x, y: c.y };
    // 그림자
    const fp = [Pt(o, s, -0.04, -0.04, 0), Pt(o, s, 1.06, -0.04, 0), Pt(o, s, 1.06, 1.06, 0), Pt(o, s, -0.04, 1.06, 0)];
    ctx.save(); D.shadow(() => fillPoly(fp, 'rgba(40,50,70,.14)'), { blur: 10, y: 3 }); ctx.restore();
    if (S.view === 'area') {
      const P = (a, b, cc) => Pt(o, s, a, b, cc);
      const faces = [
        { p: [P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1)], c: '#6aa8f5', g: (k) => [P(0, k / n, 0), P(0, k / n, 1)], g2: (k) => [P(0, 0, k / n), P(0, 1, k / n)] },
        { p: [P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)], c: '#4a89e0', g: (k) => [P(k / n, 0, 0), P(k / n, 0, 1)], g2: (k) => [P(0, 0, k / n), P(1, 0, k / n)] },
        { p: [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], c: '#9cc9ff', g: (k) => [P(k / n, 0, 1), P(k / n, 1, 1)], g2: (k) => [P(0, k / n, 1), P(1, k / n, 1)] },
      ];
      faces.forEach((f) => {
        fillPoly(f.p, f.c);
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2;
        for (let k = 1; k < n; k++) {
          [f.g(k), f.g2(k)].forEach((ln) => { ctx.beginPath(); ctx.moveTo(ln[0][0], ln[0][1]); ctx.lineTo(ln[1][0], ln[1][1]); ctx.stroke(); });
        }
        strokePoly(f.p, 'rgba(20,50,110,.6)', 1.6);
      });
    } else {
      const tot = n * n * n;
      let rank = 0;
      for (let k = 0; k < n; k++) for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i >= 0; i--) {
        // 바깥에서 안쪽, 아래에서 위로 쌓이며 나타나요
        const r = (k * n * n + (n - 1 - j) * n + (n - 1 - i)) / tot;
        const a = clamp((S.volP * 1.25 - r) * 4, 0, 1);
        rank++;
        if (a <= 0.01) continue;
        const sc = 0.82 + 0.18 * a;
        const cc = (v) => v + (1 - sc) / 2;
        const x0 = i, y0 = j, z0 = k;
        const Q = (da, db, dc) => Pt(o, TU, x0 + cc(da) - (1 - sc) / 2 * 0 , y0 + db, z0 + dc);
        ctx.save(); ctx.globalAlpha *= a;
        fillPoly([Pt(o, TU, i, j, k + 1), Pt(o, TU, i + 1, j, k + 1), Pt(o, TU, i + 1, j + 1, k + 1), Pt(o, TU, i, j + 1, k + 1)], '#ffd98a');
        fillPoly([Pt(o, TU, i, j, k), Pt(o, TU, i, j + 1, k), Pt(o, TU, i, j + 1, k + 1), Pt(o, TU, i, j, k + 1)], '#f6a93b');
        fillPoly([Pt(o, TU, i, j, k), Pt(o, TU, i + 1, j, k), Pt(o, TU, i + 1, j, k + 1), Pt(o, TU, i, j, k + 1)], '#d98418');
        ctx.strokeStyle = 'rgba(110,60,0,.55)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
        [[[i, j, k + 1], [i + 1, j, k + 1], [i + 1, j + 1, k + 1], [i, j + 1, k + 1]], [[i, j, k], [i, j + 1, k], [i, j + 1, k + 1], [i, j, k + 1]], [[i, j, k], [i + 1, j, k], [i + 1, j, k + 1], [i, j, k + 1]]].forEach((f) => {
          strokePoly(f.map((q) => Pt(o, TU, q[0], q[1], q[2])), 'rgba(110,60,0,.55)', 1.1);
        });
        ctx.restore();
      }
    }
  }

  function drawBars(t) {
    const base1 = 270, h1 = 150, max1 = 54;
    const base2 = 484, h2 = 98, max2 = 6;
    const gx = [488, 596, 704];
    // 패널
    [[400, 62, 376, 232], [400, 304, 376, 212]].forEach((r) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(r[0], r[1], r[2], r[3], 16); ctx.fill(); }, { blur: 12, y: 3 });
    });
    D.text(588, 88, '표면적과 부피', { size: 16, weight: 800, color: '#1b2333' });
    D.text(588, 330, '표면적 ÷ 부피', { size: 16, weight: 800, color: '#1b2333' });
    // 범례
    ctx.fillStyle = '#4a89e0'; D.roundRect(432, 99, 12, 12, 3); ctx.fill(); D.text(449, 110, '표면적 (cm²)', { size: 12.5, weight: 700, color: '#445', align: 'left' });
    ctx.fillStyle = '#f59e0b'; D.roundRect(548, 99, 12, 12, 3); ctx.fill(); D.text(565, 110, '부피 (cm³)', { size: 12.5, weight: 700, color: '#445', align: 'left' });
    // 축
    ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(420, base1); ctx.lineTo(760, base1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(420, base2); ctx.lineTo(760, base2); ctx.stroke();
    gx.forEach((x, i) => {
      D.text(x, base1 + 17, (i + 1) + ' cm', { size: 13.5, weight: 800, color: '#556' });
      D.text(x, base2 + 17, (i + 1) + ' cm', { size: 13.5, weight: 800, color: '#556' });
    });
    if (!S.tableDone) {
      ctx.save(); ctx.globalAlpha *= 0.9;
      D.text(588, 190, '🔒 표의 빈칸을 모두 채우면', { size: 15, weight: 800, color: '#7a8699' });
      D.text(588, 212, '막대그래프가 나타나요', { size: 15, weight: 800, color: '#7a8699' });
      D.text(588, 410, '🔒', { size: 24, color: '#9aa5b6' });
      ctx.restore();
      return;
    }
    for (let i = 0; i < 3; i++) {
      const pa = clamp(S.bars[i] || 0, 0, 1.15), pv = clamp(S.bars[3 + i] || 0, 0, 1.15), pr = clamp(S.bars[6 + i] || 0, 0, 1.15);
      const x = gx[i];
      const ha = (SA[i] / max1) * h1 * pa, hv = (VO[i] / max1) * h1 * pv, hr = (RA[i] / max2) * h2 * pr;
      const bar = (bx, by, w, hh, c1, c2) => {
        if (hh < 1) return;
        const g = ctx.createLinearGradient(bx, 0, bx + w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; D.roundRect(bx, by - hh, w, hh, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; D.roundRect(bx + 3, by - hh + 3, 5, Math.max(0, hh - 6), 2.5); ctx.fill();
      };
      bar(x - 30, base1, 28, ha, '#6aa8f5', '#3b78d2');
      bar(x + 2, base1, 28, hv, '#fbbf24', '#e08a0b');
      bar(x - 15, base2, 30, hr, '#4ade80', '#16a34a');
      if (pa > 0.6) D.text(x - 16, base1 - ha - 6, String(SA[i]), { size: 14, weight: 800, color: '#2557a7', alpha: clamp((pa - 0.6) * 4, 0, 1) });
      if (pv > 0.6) D.text(x + 16, base1 - hv - 6, String(VO[i]), { size: 14, weight: 800, color: '#a5650a', alpha: clamp((pv - 0.6) * 4, 0, 1) });
      if (pr > 0.6) D.text(x, base2 - hr - 7, String(RA[i]), { size: 16, weight: 800, color: '#0b7a41', alpha: clamp((pr - 0.6) * 4, 0, 1) });
    }
    if ((S.bars[8] || 0) > 0.9) {
      D.arrow(468, 396, 722, 452, { color: '#0b7a41', width: 3, head: 11, dash: [7, 6], alpha: 0.6 * clamp((S.bars[8] - 0.9) * 10, 0, 1) });
      D.label(640, 380, '커질수록 작아져요', { bg: '#0b7a41', size: 13, pad: 10 });
    }
  }

  function drawTable(t) {
    ctx.fillStyle = '#eef6f1'; ctx.fillRect(0, 0, W, H);
    // 왼쪽: 정육면체 모형
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(20, 62, 368, 454, 16); ctx.fill(); }, { blur: 12, y: 3 });
    D.text(204, 90, S.view === 'area' ? '겉(표면)의 칸을 세어 봐요' : '쌓기나무를 세어 봐요', { size: 16, weight: 800, color: '#1b2333' });
    TCUBES.forEach(drawTableCube);
    TCUBES.forEach((c) => D.text(c.x, c.y + 26, '한 변 ' + c.n + ' cm', { size: 14, weight: 800, color: '#445' }));
    if (S.view === 'area') {
      ctx.fillStyle = '#6aa8f5'; D.roundRect(48, 452, 16, 16, 3); ctx.fill();
      D.text(72, 465, '한 칸 = 1 cm²  (1 cm × 1 cm)', { size: 14, weight: 700, color: '#334', align: 'left' });
      D.text(204, 492, '※ 뒤쪽·아래쪽 3개 면까지 모두 6개 면이에요', { size: 13, weight: 700, color: '#6b7788' });
    } else {
      ctx.fillStyle = '#f6a93b'; D.roundRect(48, 452, 16, 16, 3); ctx.fill();
      D.text(72, 465, '한 개 = 1 cm³  (1 cm × 1 cm × 1 cm)', { size: 14, weight: 700, color: '#334', align: 'left' });
      D.text(204, 492, '※ 속까지 가득 쌓인 쌓기나무의 개수가 부피예요', { size: 13, weight: 700, color: '#6b7788' });
    }
    drawBars(t);
  }

  /* =========================================================
     장면 3 · 세포 모형 (크기, 물질 교환, 분열)
     ========================================================= */
  const CX = 400, CY = 296, CU = 70, DELTA = 112;     // 크기 1 = 70 px, 세포막에서 112 px 안쪽까지 물질이 닿아요
  const cell = {
    sz: new Spring(1, { stiffness: 120, damping: 9 }), size: 1, starve: 0, div: 0, divided: false, divDone: false,
    sizeAtDiv: 1, r0: 35, seenStarve: false, healed: false, nut: [], org: [], pulse: 0, glowA: 0,
  };
  for (let i = 0; i < 18; i++) cell.org.push({ a: rnd(0, 6.28), d: rnd(0.3, 0.88), w: rnd(0.07, 0.11), r: rnd(0, 3) });
  function resetCell() {
    cell.size = 1; cell.sz.target = 1; cell.div = 0; cell.divided = false; cell.divDone = false; cell.starve = 0; cell.nut = [];
    cell.seenStarve = false; cell.healed = false;
    tween(cell, { div: 0 }, { duration: 0.01 });
    syncCellButtons();
  }
  function syncCellButtons() {
    const gb = $('#growBtn'), db = $('#divBtn');
    if (cell.divided) { gb.textContent = '↺ 다시 해 보기'; gb.disabled = false; db.disabled = true; db.classList.remove('target'); }
    else {
      gb.textContent = '🌱 키우기'; gb.disabled = cell.size >= 4; db.disabled = false;
      db.classList.toggle('target', cell.size >= 4 && cell.starve > 0.5);
    }
    gb.classList.toggle('target', false);
    $('#cellNote').textContent = cell.divided
      ? (cell.divDone ? '분열하면 세포 하나가 작아져서 중심까지 물질이 충분히 가요.' : '세포가 둘로 나뉘고 있어요…')
      : cell.size >= 4 ? '중심부가 부족해졌어요! 이제 분열시켜 볼까요?' : '크기 ' + cell.size + ' · 한 번 더 키워 보세요 (최대 4).';
  }
  function growCell() {
    if (cell.divided) { Sound.click(); resetCell(); return; }
    if (cell.size >= 4) return;
    Sound.click();
    cell.size++; cell.sz.target = cell.size;
    cell.pulse = 1;
    syncCellButtons();
    if (cell.size === 4) later2(1600, () => { syncCellButtons(); showHint('중심부가 점점 부족해져요… 분열시켜 볼까요?', 4500); });
  }
  const later2 = (ms, fn) => setTimeout(fn, ms);
  function divideCell() {
    if (cell.divided) return;
    Sound.click();
    cell.divided = true; cell.sizeAtDiv = cell.size; cell.r0 = cell.sz.value * CU / 2;
    cell.div = 0;
    syncCellButtons();
    tween(cell, { div: 1 }, { duration: 1.9, ease: 'inOutCubic', onDone: () => {
      cell.divDone = true; syncCellButtons(); Sound.success();
      const Rd = cell.sizeAtDiv / Math.cbrt(2) * CU / 2;
      fx.burst(CX - Rd - 8, CY, { count: 10, speed: 110, size: 3 }); fx.burst(CX + Rd + 8, CY, { count: 10, speed: 110, size: 3 });
    } });
  }
  function cellGeom() {
    if (!cell.divided || cell.div <= 0.001) {
      const r = cell.sz.value * CU / 2;
      return { lobes: [{ x: CX, y: CY, r }], neck: r };
    }
    const Rd = cell.sizeAtDiv / Math.cbrt(2) * CU / 2;
    const e = cell.div;
    const rho = lerp(cell.r0, Rd, e), h = lerp(0, Rd + 8, e);
    const w = rho * (1 - smooth((e - 0.2) / 0.65));
    return { lobes: [{ x: CX - h, y: CY, r: rho }, { x: CX + h, y: CY, r: rho }], neck: w };
  }
  const fedNow = () => cell.starve < 0.25;

  function stepCell(dt) {
    cell.sz.update(dt);
    cell.pulse = Math.max(0, cell.pulse - dt * 1.5);
    const g = cellGeom();
    const rmax = Math.max.apply(null, g.lobes.map((l) => l.r));
    const goal = clamp((rmax - DELTA) / 22, 0, 1) * (cell.divided && cell.div < 0.999 ? 1 : 1);
    cell.starve = approach(cell.starve, goal, dt, goal > cell.starve ? 1.1 : 1.6);
    if (cell.starve > 0.9 && cell.size >= 4 && !cell.divided) cell.seenStarve = true;
    cell.healed = cell.divDone && cell.seenStarve && cell.starve < 0.1;
    // 영양분 입자 (밖 → 세포막 → 안쪽으로 최대 DELTA까지)
    const want = Math.round(16 + rmax * 0.36);
    while (cell.nut.length < want) {
      const k = Math.floor(Math.random() * g.lobes.length), l = g.lobes[k], a = rnd(0, 6.2832), dd = l.r + rnd(40, 130);
      cell.nut.push({ k, x: l.x + Math.cos(a) * dd, y: l.y + Math.sin(a) * dd, st: 0, depth: 0, a: 1, vx: 0, vy: 0 });
    }
    for (let i = cell.nut.length - 1; i >= 0; i--) {
      const p = cell.nut[i];
      const l = g.lobes[Math.min(p.k, g.lobes.length - 1)];
      const dx = l.x - p.x, dy = l.y - p.y, d = Math.hypot(dx, dy) || 1;
      const sp = p.st === 0 ? 62 : 44;
      p.x += (dx / d) * sp * dt + rnd(-1, 1) * 40 * dt;
      p.y += (dy / d) * sp * dt + rnd(-1, 1) * 40 * dt;
      if (p.st === 0) {
        if (d <= l.r + 1) { p.st = 1; p.depth = 0; }
        else if (p.x < 10 || p.x > W - 10 || p.y < 56 || p.y > H - 10) { cell.nut.splice(i, 1); }
      } else {
        p.depth += sp * dt;
        const nr = l.r * 0.2 + 3;
        if (d <= nr) { p.st = 2; }
        if (p.depth >= DELTA) p.st = 2;
        if (d > l.r + 4) { cell.nut.splice(i, 1); continue; }
        if (p.st === 2) { p.a -= dt * 3.5; if (p.a <= 0) cell.nut.splice(i, 1); }
      }
    }
  }

  function drawNucleus(l, starve, t) {
    const rn = l.r * 0.2;
    const sick = starve;
    const col = CO.mix('#a982e6', '#8d8497', sick);
    ctx.save();
    D.glow(l.x, l.y, rn * 2.6, sick > 0.3 ? '#ef4444' : '#c9b3f5', sick > 0.3 ? 0.3 * sick + 0.12 * Math.sin(t * 6) : 0.35);
    D.sphere(l.x, l.y, rn, col, { shadow: true, outline: 'rgba(80,40,140,.55)', outlineWidth: 2 });
    ctx.fillStyle = CO.shade(col, -0.35); ctx.beginPath(); ctx.arc(l.x + rn * 0.15, l.y + rn * 0.1, rn * 0.28, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function drawCell(t) {
    const g = cellGeom();
    const rmax = Math.max.apply(null, g.lobes.map((l) => l.r));
    // 바깥 용액 배경
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#e1f1ff'); bg.addColorStop(1, '#e9f7ee');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 9; i++) { const x = (i * 97 + 40) % 780, y = 80 + ((i * 61) % 420); ctx.beginPath(); ctx.arc(x, y, 26 + (i % 3) * 12, 0, 6.28); ctx.fill(); }
    pill(400, 82, '영양소와 산소가 많은 용액', { bg: 'rgba(30,90,150,.78)', size: 13.5, pad: 12 });

    // 세포 몸
    const path = new Path2D();
    g.lobes.forEach((l) => { path.moveTo(l.x + l.r, l.y); path.arc(l.x, l.y, l.r, 0, 6.2832); });
    if (g.lobes.length === 2 && g.neck > 0.4) {
      const a = g.lobes[0], b = g.lobes[1];
      path.rect(a.x, CY - g.neck, b.x - a.x, g.neck * 2);
    }
    ctx.save();
    ctx.shadowColor = 'rgba(20,70,40,.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#2f8f55'; ctx.strokeStyle = '#2f8f55'; ctx.lineWidth = 10; ctx.lineJoin = 'round';
    ctx.fill(path); ctx.stroke(path);
    ctx.restore();
    ctx.fillStyle = '#bfe9bb'; ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    g.lobes.forEach((l) => {
      const gr = ctx.createRadialGradient(l.x - l.r * 0.3, l.y - l.r * 0.35, l.r * 0.1, l.x, l.y, l.r);
      gr.addColorStop(0, '#f1fbec'); gr.addColorStop(0.6, '#c9edc3'); gr.addColorStop(1, '#94d49f');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, 6.2832); ctx.fill();
      // 세포 소기관(미토콘드리아 모양)
      cell.org.forEach((o) => {
        const ox = l.x + Math.cos(o.a + t * 0.05) * o.d * l.r, oy = l.y + Math.sin(o.a + t * 0.05) * o.d * l.r;
        if (Math.hypot(ox - l.x, oy - l.y) < l.r * 0.3) return;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(o.a + o.r);
        ctx.fillStyle = 'rgba(255,196,120,.85)'; ctx.strokeStyle = 'rgba(200,120,40,.7)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, 0, l.r * o.w * 1.5, l.r * o.w * 0.75, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
      // 중심부 영양 부족
      const coreR = Math.max(0, l.r - DELTA);
      if (cell.starve > 0.02 && l.r > DELTA - 30) {
        const rr = coreR + 62;
        const sg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, rr);
        sg.addColorStop(0, 'rgba(70,48,44,' + (0.92 * cell.starve) + ')');
        sg.addColorStop(0.5, 'rgba(96,74,60,' + (0.66 * cell.starve) + ')');
        sg.addColorStop(1, 'rgba(120,100,80,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(l.x, l.y, rr, 0, 6.2832); ctx.fill();
      }
    });
    // 안쪽으로 들어온 영양분
    cell.nut.forEach((p) => {
      if (p.st === 0) return;
      ctx.globalAlpha = Math.max(0, p.a);
      D.sphere(p.x, p.y, 4.2, '#ff9d2e', { gloss: false });
    });
    ctx.globalAlpha = 1;
    // 중간 막(분열 중 잘록한 곳)
    ctx.restore();
    // 막 안쪽 하이라이트
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2.5;
    g.lobes.forEach((l) => { ctx.beginPath(); ctx.arc(l.x, l.y, l.r - 4, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke(); });
    ctx.restore();
    // 핵
    g.lobes.forEach((l) => drawNucleus(l, cell.starve, t));
    // 바깥 영양분
    cell.nut.forEach((p) => { if (p.st === 0) D.sphere(p.x, p.y, 4.6, '#ff9d2e', { gloss: false }); });

    // 설명 표시
    const mainL = g.lobes.length === 1 ? g.lobes[0] : null;
    if (mainL && !cell.divided) {
      const r = mainL.r;
      const mx = CX - r * 0.72, my = CY - r * 0.72;
      D.arrow(mx - 70, my - 26, mx, my, { color: '#2f8f55', width: 2.5, head: 9 });
      pill(mx - 94, my - 30, '세포막', { bg: '#2f8f55', size: 13.5, pad: 10 });
      if (cell.starve < 0.5) {
        D.arrow(CX + r + 96, CY + r * 0.1 + 40, CX + r * 0.3, CY + 4, { color: '#7c3aed', width: 2.5, head: 9 });
        pill(CX + r + 108, CY + r * 0.1 + 44, '핵', { bg: '#7c3aed', size: 13.5, pad: 12 });
      }
      if (cell.starve > 0.45) {
        const sh = Math.sin(t * 14) * 1.2 * cell.starve;
        pill(CX + sh, CY + r * 0.2 + 28, '⚠ 중심부 부족!', { bg: '#dc2626', size: 15, pad: 12 });
      }
    }
    if (cell.divDone && cell.healed) {
      g.lobes.forEach((l, i) => {
        const k = clamp((t * 0 + 1), 0, 1);
        pill(l.x, l.y + l.r * 0.34 + 24, '충분!', { bg: '#14a058', size: 14.5, pad: 11 });
      });
    }
    if (cell.divided && !cell.divDone) {
      pill(CX, CY + rmax + 36 > H - 20 ? H - 22 : CY + rmax + 36, '핵이 나뉘고, 세포막이 잘록해져요', { bg: 'rgba(27,35,51,.82)', size: 13.5, pad: 12 });
    }
    // 범례
    D.sphere(46, 506, 5.5, '#ff9d2e', { gloss: false });
    D.text(58, 511, '영양소·산소 (세포막으로 들어와요)', { size: 13.5, weight: 700, color: '#334', align: 'left' });
  }

  /* =========================================================
     장면 4 · 생장 (생쥐와 코끼리의 세포 · 뿌리 끝)
     ========================================================= */
  const an = { mouse: new Spring(0, { stiffness: 140, damping: 14 }), ele: new Spring(0, { stiffness: 140, damping: 14 }), seenM: false, seenE: false, meter: 0, pulse: 0 };
  const AN = { mouse: { x: 200, y: 214, hw: 62, hh: 52 }, ele: { x: 580, y: 196, hw: 120, hh: 96 } };
  const LENS_AN = { mouse: { x: 200, y: 414, r: 80 }, ele: { x: 580, y: 414, r: 80 } };
  function mkGrid(sp, w, h, jit) {
    const a = [];
    for (let j = -Math.ceil(h / sp); j <= Math.ceil(h / sp); j++) for (let i = -Math.ceil(w / sp); i <= Math.ceil(w / sp); i++) {
      a.push({ x: (i + (j & 1 ? 0.5 : 0)) * sp + rnd(-jit, jit), y: j * sp * 0.866 + rnd(-jit, jit), ph: Math.random(), sp: rnd(0.16, 0.3) });
    }
    return a;
  }
  const GRID_SMALL = mkGrid(27, 90, 90, 2), GRID_BIG = mkGrid(62, 170, 170, 4), GRID_AN = mkGrid(26, 90, 90, 2);

  function drawLensCell(x, y, r, o) {
    // 한 세포: 초록 막 + 핵. cyc(0~1)이 있으면 분열하는 모습
    const cyc = o.cyc;
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#f2fbee'); g.addColorStop(0.65, '#c9edc3'); g.addColorStop(1, '#8fd09b');
    ctx.fillStyle = g; ctx.strokeStyle = '#2f8f55'; ctx.lineWidth = Math.max(1.4, r * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill(); ctx.stroke();
    if (o.vac) { ctx.fillStyle = 'rgba(190,225,245,.55)'; ctx.beginPath(); ctx.ellipse(r * 0.18, r * 0.2, r * 0.5, r * 0.4, 0.5, 0, 6.2832); ctx.fill(); }
    let sep = 0, pinch = 0;
    if (cyc != null && cyc > 0.5) { sep = smooth((cyc - 0.5) / 0.3); pinch = smooth((cyc - 0.78) / 0.2); }
    const nr = r * 0.36;
    const ang = o.ang || 0;
    const nx = Math.cos(ang) * sep * r * 0.42, ny = Math.sin(ang) * sep * r * 0.42;
    const nrr = nr * (1 - 0.22 * sep);
    ctx.fillStyle = '#9b6fe0'; ctx.strokeStyle = 'rgba(70,30,130,.7)'; ctx.lineWidth = 1.3;
    [-1, 1].forEach((sgn) => {
      if (sep < 0.02 && sgn > 0) return;
      ctx.beginPath(); ctx.arc(nx * sgn, ny * sgn, nrr, 0, 6.2832); ctx.fill(); ctx.stroke();
    });
    if (pinch > 0.02) {
      ctx.strokeStyle = '#2f8f55'; ctx.lineWidth = Math.max(1.6, r * 0.12);
      const px = -Math.sin(ang) * r * pinch * 0.98, py = Math.cos(ang) * r * pinch * 0.98;
      ctx.beginPath(); ctx.moveTo(-px, -py); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.restore();
  }
  function drawLens(cx, cy, R, kind, t, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, 6.2832); ctx.fill(); }, { blur: 14, y: 4 });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
    ctx.fillStyle = '#e8f6e4'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    if (kind === 'tip') {
      GRID_SMALL.forEach((c) => drawLensCell(cx + c.x * 1.02, cy + c.y * 1.02, 12.5, { cyc: (c.ph + t * c.sp) % 1, ang: c.ph * 6 }));
    } else if (kind === 'old') {
      GRID_BIG.forEach((c) => drawLensCell(cx + c.x, cy + c.y, 28, { vac: true, ang: 0 }));
    } else {
      GRID_AN.forEach((c) => drawLensCell(cx + c.x, cy + c.y, 11.5, { ang: 0 }));
    }
    const sh = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.5, R * 0.1, cx, cy, R);
    sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(20,70,40,.18)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
    ctx.strokeStyle = '#7a8aa3'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 3.4, 4.3); ctx.stroke();
    ctx.restore();
  }

  function tapAnimal(p) {
    for (const k of ['mouse', 'ele']) {
      const a = AN[k];
      if (Math.abs(p.x - a.x) < a.hw && Math.abs(p.y - a.y) < a.hh) {
        Sound.click();
        const first = k === 'mouse' ? !an.seenM : !an.seenE;
        if (k === 'mouse') an.seenM = true; else an.seenE = true;
        an[k === 'mouse' ? 'mouse' : 'ele'].target = 1;
        an.pulse = 1;
        const L = LENS_AN[k];
        if (first) fx.burst(L.x, L.y - L.r, { count: 12, speed: 120, size: 3.2, colors: ['#4ade80', '#fff', '#fbbf24'] });
        if (an.seenM && an.seenE && first) { Sound.success(); showHint('두 동물의 세포 크기를 비교해 보세요', 4500); }
        return;
      }
    }
  }
  function resetAnimals() {
    an.seenM = an.seenE = false; an.mouse.target = an.ele.target = 0; an.mouse.value = an.ele.value = 0; an.meter = 0;
  }
  function drawAnimals(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#e3f2fb'); bg.addColorStop(0.62, '#eef7ec'); bg.addColorStop(1, '#d9ecd3');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#cfe6c8'; ctx.beginPath(); ctx.ellipse(400, 322, 380, 18, 0, 0, 6.2832); ctx.fill();
    // 동물
    [['mouse', 76, '생쥐'], ['ele', 168, '코끼리']].forEach(([k, sz, name]) => {
      const a = AN[k];
      const seen = k === 'mouse' ? an.seenM : an.seenE;
      ctx.save(); ctx.fillStyle = 'rgba(40,70,40,.16)'; ctx.beginPath(); ctx.ellipse(a.x, a.y + a.hh - 8, a.hw * 0.8, 9, 0, 0, 6.2832); ctx.fill(); ctx.restore();
      const bob = seen ? 0 : Math.sin(t * 2.4 + (k === 'mouse' ? 0 : 1.4)) * 3;
      D.text(a.x, a.y + bob + sz * 0.34, k === 'mouse' ? '🐭' : '🐘', { size: sz });
      D.label(a.x, a.y + a.hh + 16, name, { bg: '#2f6f4f', size: 15, pad: 12 });
      if (!seen) {
        const ph = (t * 0.9 + (k === 'mouse' ? 0 : 0.5)) % 1;
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - ph); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(a.x, a.y, a.hw * (0.85 + 0.2 * ph), a.hh * (0.85 + 0.2 * ph), 0, 0, 6.2832); ctx.stroke(); ctx.restore();
        D.label(a.x, a.y - a.hh - 12, '👆 눌러서 확대', { bg: 'rgba(27,35,51,.82)', size: 13.5, pad: 11 });
      }
    });
    // 확대 렌즈
    [['mouse', an.mouse], ['ele', an.ele]].forEach(([k, sp]) => {
      const v = clamp(sp.value, 0, 1.15), L = LENS_AN[k], a = AN[k];
      if (v < 0.02) return;
      // 연결선
      ctx.save(); ctx.globalAlpha = 0.5 * clamp(v, 0, 1); ctx.strokeStyle = '#7a8aa3'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y + a.hh + 30); ctx.lineTo(L.x, L.y - L.r - 12); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(L.x, L.y); ctx.scale(v, v); ctx.translate(-L.x, -L.y);
      drawLens(L.x, L.y, L.r, 'an', t, clamp(v, 0, 1));
      ctx.restore();
      D.text(L.x, L.y + L.r + 30, '같은 배율로 확대한 조직', { size: 13.5, weight: 800, color: '#445', alpha: clamp(v, 0, 1) });
    });
    if (an.seenM && an.seenE) {
      // 크기 비교선 (세포 하나의 지름)
      const f = clamp((Math.min(an.mouse.value, an.ele.value) - 0.7) * 3.3, 0, 1);
      an.meter = approach(an.meter, f, 0.016, 4);
      ctx.save(); ctx.globalAlpha = an.meter;
      D.label(400, 414, '=', { bg: '#14532d', size: 24, pad: 12 });
      D.label(400, 462, '세포 크기는 비슷!', { bg: '#14532d', size: 14.5, pad: 12 });
      D.label(200, 90, '세포 수: 적어요', { bg: '#2f8fd6', size: 14.5, pad: 12 });
      D.label(580, 90, '세포 수: 아주 많아요', { bg: '#e08a0b', size: 14.5, pad: 12 });
      ctx.restore();
    }
  }

  /* ---------- 뿌리 끝 ---------- */
  const RT = { x: 210, top: 168, minB: 330, maxB: 484 };
  const rt = { len: 0.4, zoom: null, lz: new Spring(0, { stiffness: 140, damping: 14 }), grown: false, seenTip: false, seenOld: false, ring: 0, kind: 'tip', pulse: 0 };
  const rtBottom = () => RT.minB + (RT.maxB - RT.minB) * rt.len;
  function resetRoot() {
    rt.len = 0.4; rt.zoom = null; rt.lz.value = rt.lz.target = 0; rt.grown = false; rt.seenTip = false; rt.seenOld = false;
    syncRootButtons();
  }
  function syncRootButtons() {
    const b = $('#rootBtn');
    b.disabled = rt.len >= 0.999;
    b.textContent = rt.len >= 0.999 ? '🌱 다 자랐어요' : '🌱 뿌리 자라게 하기';
    b.classList.toggle('target', !rt.grown && S.scene === 'root');
  }
  function growRoot() {
    if (rt.len >= 0.999) return;
    Sound.click(); rt.grown = true;
    tween(rt, { len: Math.min(1, rt.len + 0.3) }, { duration: 1.3, ease: 'outCubic', onDone: syncRootButtons });
    fx.burst(RT.x, rtBottom() + 6, { count: 9, speed: 90, size: 3, colors: ['#fde68a', '#fff', '#86efac'] });
    syncRootButtons();
    showHint(rt.seenTip ? '뿌리 끝에서 새 세포가 만들어져 길어져요' : '👆 뿌리 끝을 눌러 확대해 보세요', 4500);
  }
  function rootZone(p) {
    const b = rtBottom();
    if (Math.abs(p.x - RT.x) < 46 && p.y > b - 84 && p.y < b + 24) return 'tip';
    if (Math.abs(p.x - RT.x) < 46 && p.y > RT.top + 6 && p.y <= b - 84) return 'old';
    return null;
  }
  function tapRoot(p) {
    const z = rootZone(p);
    if (!z) return;
    Sound.click();
    if (z === 'tip' && !rt.seenTip) { rt.seenTip = true; fx.burst(RT.x, rtBottom() - 40, { count: 14, speed: 130, size: 3.4, colors: ['#4ade80', '#fff', '#fbbf24'] }); Sound.success(); }
    if (z === 'old') rt.seenOld = true;
    rt.kind = z; rt.zoom = z; rt.lz.target = 1; rt.lz.value = Math.min(rt.lz.value, 0.6); rt.pulse = 1;
    syncRootButtons();
  }
  function drawRoot(t) {
    const b = rtBottom();
    ctx.fillStyle = '#e3f2fb'; ctx.fillRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, RT.top); sky.addColorStop(0, '#d7ecfb'); sky.addColorStop(1, '#eaf6ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, RT.top);
    // 흙
    const sg = ctx.createLinearGradient(0, RT.top, 0, H); sg.addColorStop(0, '#a9794a'); sg.addColorStop(1, '#6f4a2b');
    ctx.fillStyle = sg; ctx.fillRect(0, RT.top, 420, H - RT.top);
    ctx.fillStyle = '#5e9e45'; ctx.fillRect(0, RT.top - 6, 420, 8);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc((i * 83 + 20) % 410, RT.top + 30 + (i * 47) % 330, 2 + (i % 3), 0, 6.28); ctx.fill(); }
    // 줄기·잎
    ctx.strokeStyle = '#4a9a3f'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(RT.x, RT.top); ctx.quadraticCurveTo(RT.x + 4, RT.top - 40, RT.x, RT.top - 82); ctx.stroke();
    [[-1, -50], [1, -70]].forEach(([s, dy]) => {
      ctx.fillStyle = '#6cc35a'; ctx.beginPath();
      ctx.moveTo(RT.x, RT.top + dy); ctx.quadraticCurveTo(RT.x + s * 38, RT.top + dy - 34, RT.x + s * 66, RT.top + dy - 6); ctx.quadraticCurveTo(RT.x + s * 34, RT.top + dy + 14, RT.x, RT.top + dy); ctx.fill();
    });
    // 뿌리 본체 (끝에서 위로 갈수록 세포가 커져요)
    const halfW = 17;
    ctx.save();
    const rp = new Path2D();
    rp.moveTo(RT.x - halfW, RT.top); rp.lineTo(RT.x - halfW, b - 14); rp.quadraticCurveTo(RT.x - halfW, b + 6, RT.x, b + 8); rp.quadraticCurveTo(RT.x + halfW, b + 6, RT.x + halfW, b - 14); rp.lineTo(RT.x + halfW, RT.top); rp.closePath();
    ctx.shadowColor = 'rgba(30,15,0,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#f7e9c8'; ctx.fill(rp);
    ctx.restore();
    ctx.save(); ctx.clip(rp);
    ctx.strokeStyle = 'rgba(150,100,40,.42)'; ctx.lineWidth = 1;
    // 가로줄: 끝에서 멀수록 간격이 넓어요
    let y = b + 4, h = 5;
    while (y > RT.top) {
      ctx.beginPath(); ctx.moveTo(RT.x - halfW, y); ctx.lineTo(RT.x + halfW, y); ctx.stroke();
      if (h < 24) { /* 세로 구분선은 끝 쪽(작은 세포)에서만 촘촘 */ }
      const cw = Math.min(17, h * 1.2 + 4);
      for (let x = RT.x - halfW + cw; x < RT.x + halfW - 2; x += cw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke(); }
      y -= h; h = Math.min(26, h + (b - y > 60 ? 2.0 : 0.6));
    }
    // 생장점 색칠
    const gz = ctx.createLinearGradient(0, b - 70, 0, b + 8);
    gz.addColorStop(0, 'rgba(34,197,94,0)'); gz.addColorStop(0.3, 'rgba(34,197,94,.38)'); gz.addColorStop(1, 'rgba(34,197,94,.22)');
    ctx.fillStyle = gz; ctx.fillRect(RT.x - halfW, b - 70, halfW * 2, 80);
    ctx.fillStyle = 'rgba(120,80,30,.35)'; ctx.beginPath(); ctx.moveTo(RT.x - halfW, b - 12); ctx.quadraticCurveTo(RT.x, b - 2, RT.x + halfW, b - 12); ctx.lineTo(RT.x + halfW, b + 10); ctx.lineTo(RT.x - halfW, b + 10); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(100,60,20,.65)'; ctx.lineWidth = 1.8; ctx.stroke(rp);
    // 곁뿌리 장식
    ctx.strokeStyle = '#efe0bd'; ctx.lineWidth = 3;
    [[0.35, -1], [0.55, 1], [0.78, -1]].forEach(([f, s]) => { const yy = RT.top + (b - RT.top) * f; ctx.beginPath(); ctx.moveTo(RT.x + s * halfW, yy); ctx.quadraticCurveTo(RT.x + s * 44, yy + 10, RT.x + s * 56, yy + 34); ctx.stroke(); });

    // 이름표
    const gyc = b - 40;
    D.arrow(RT.x + 96, gyc, RT.x + halfW + 8, gyc, { color: '#16a34a', width: 3, head: 10 });
    D.label(RT.x + 100, gyc, '생장점', { bg: '#16a34a', size: 15, pad: 12, align: 'left' });
    if (!rt.seenTip) {
      const ph = (t * 0.9) % 1;
      ctx.save(); ctx.globalAlpha = 0.65 * (1 - ph); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(RT.x, gyc, 30 + 14 * ph, 42 + 12 * ph, 0, 0, 6.2832); ctx.stroke(); ctx.restore();
    }
    if (b - RT.top > 190) {
      const oy = RT.top + (b - 84 - RT.top) * 0.42;
      D.arrow(RT.x + 96, oy, RT.x + halfW + 8, oy, { color: '#7c5a33', width: 3, head: 10, alpha: 0.9 });
      D.label(RT.x + 100, oy, '자란 부분', { bg: '#7c5a33', size: 14, pad: 11, align: 'left' });
    }
    D.text(RT.x - 120, RT.top - 20, '🌱', { size: 30 });

    // 확대 렌즈
    const v = clamp(rt.lz.value, 0, 1.12);
    if (rt.zoom && v > 0.02) {
      const cx = 600, cy = 300, R = 138;
      ctx.save(); ctx.globalAlpha = clamp(v, 0, 1) * 0.55; ctx.strokeStyle = '#7a8aa3'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      const sy = rt.zoom === 'tip' ? gyc : RT.top + (b - 84 - RT.top) * 0.42;
      ctx.beginPath(); ctx.moveTo(RT.x + halfW + 4, sy); ctx.lineTo(cx - R - 10, cy); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(cx, cy); ctx.scale(v, v); ctx.translate(-cx, -cy);
      drawLens(cx, cy, R, rt.zoom, t, clamp(v, 0, 1));
      ctx.restore();
      if (v > 0.9) {
        if (rt.zoom === 'tip') {
          D.label(cx, 128, '생장점: 작은 세포가 계속 분열해요', { bg: '#16a34a', size: 14.5, pad: 12 });
          D.label(cx, 478, '세포 수가 늘어나 뿌리가 길어져요', { bg: '#14532d', size: 14, pad: 12 });
        } else {
          D.label(cx, 128, '자란 부분: 큰 세포, 분열은 거의 없어요', { bg: '#7c5a33', size: 14.5, pad: 12 });
          D.label(cx, 478, '그럼 새 세포는 어디서 만들어질까요?', { bg: 'rgba(27,35,51,.85)', size: 14, pad: 12 });
        }
      }
    } else {
      ctx.save(); ctx.globalAlpha = 0.9;
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(470, 220, 260, 120, 18); ctx.fill(); }, { blur: 10, y: 3 });
      D.text(600, 268, '🔍', { size: 34 });
      D.text(600, 306, '뿌리 끝(생장점)을 눌러서', { size: 15, weight: 800, color: '#445' });
      D.text(600, 326, '세포를 확대해 봐요', { size: 15, weight: 800, color: '#445' });
      ctx.restore();
    }
  }

  /* =========================================================
     입력 · 읽기판 · 그리기 · 반복
     ========================================================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'soak') tapSoak(p);
      else if (S.scene === 'animals') tapAnimal(p);
      else if (S.scene === 'root') tapRoot(p);
      return false;
    },
    hover(p) {
      if (S.scene === 'soak') return hoverSoak(p);
      if (S.scene === 'animals') return ['mouse', 'ele'].some((k) => Math.abs(p.x - AN[k].x) < AN[k].hw && Math.abs(p.y - AN[k].y) < AN[k].hh) ? 'pointer' : null;
      if (S.scene === 'root') return rootZone(p) ? 'pointer' : null;
      return null;
    },
  });

  $('#soakBtn').addEventListener('click', startSoak);
  $('#cutBtn').addEventListener('click', startCut);
  $('#growBtn').addEventListener('click', growCell);
  $('#divBtn').addEventListener('click', divideCell);
  $('#rootBtn').addEventListener('click', growRoot);
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.v); S.seenViews[b.dataset.v] = true; }));
  $$('#lifeSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); setScene(b.dataset.s); syncRootButtons();
    if (b.dataset.s === 'root') showHint('🌱 뿌리를 자라게 한 뒤 뿌리 끝을 눌러 보세요', 5000);
  }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'soak') resetSoak();
    else if (S.scene === 'table') resetTable();
    else if (S.scene === 'cell') resetCell();
    else if (S.scene === 'animals') resetAnimals();
    else resetRoot();
  });
  S.seenViews = { area: true, volume: false };

  function updateReadouts() {
    if (S.scene === 'soak') {
      const q = soak;
      setRO(1, '담근 시간', Math.floor(q.tMin) + ' / 10분');
      setRO(2, '물든 깊이', q.tMin < 0.05 ? '-' : '약 ' + (depth() < 0.249 ? depth().toFixed(2) : '0.25') + ' cm');
      setRO(3, '한 변', '1·2·3 cm');
    } else if (S.scene === 'cell') {
      const sz = cell.divided ? cell.sizeAtDiv / Math.cbrt(2) : cell.size;
      setRO(1, '세포 크기', cell.divided ? '한 변 ' + (Math.round(sz * 10) / 10) : '한 변 ' + cell.size);
      setRO(2, '표면적 ÷ 부피', (Math.round(60 / sz) / 10).toString());
      setRO(3, '중심부', cell.starve > 0.5 ? '<span style="color:#dc2626">부족 ⚠</span>' : '<span style="color:#0b7a41">충분 ✓</span>');
    } else if (S.scene === 'animals') {
      setRO(1, '생쥐 세포', an.seenM ? '작은 세포' : '눌러 보세요');
      setRO(2, '코끼리 세포', an.seenE ? '작은 세포' : '눌러 보세요');
      setRO(3, '비교', an.seenM && an.seenE ? '크기 비슷' : '-');
    } else if (S.scene === 'root') {
      setRO(1, '뿌리 길이', Math.round(rt.len * 100) + ' %');
      setRO(2, '생장점', rt.seenTip ? '분열 활발' : '눌러 보세요');
      setRO(3, '자란 부분', rt.seenOld ? '큰 세포' : '눌러 보세요');
    }
  }

  function draw(t) {
    view.clear('#eef6f1');
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    if (S.scene === 'soak') drawSoak(t);
    else if (S.scene === 'table') drawTable(t);
    else if (S.scene === 'cell') drawCell(t);
    else if (S.scene === 'animals') drawAnimals(t);
    else drawRoot(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 실험 ---------- */
    {
      title: '우무 정육면체 실험', short: '우무 실험', icon: '🧫', phase: '실험',
      features: ['soak', 'cut'],
      intro: '<p class="si-q">❓ 탐구 질문: 코끼리의 세포는 생쥐의 세포보다 훨씬 클까?</p>' +
        '<p>세포는 몸 밖에서 <b>영양소와 산소</b>를 받아들이고 노폐물을 내보내요. 이 일은 세포의 <b>겉(세포막)</b>을 통해 일어나지요.</p>' +
        '<p>세포를 우무 조각에 비유해 볼게요. <b>크기가 다른 우무 정육면체</b>(한 변 1 · 2 · 3 cm)를 용액에 담그면 물질이 어디까지 스며들까요?</p>' +
        '<p class="si-safe">🥽 실제 실험에서는 보안경과 장갑을 꼭 써요. 여기서는 가상 실험이에요.</p>',
      setup() { setScene('soak'); resetSoak(); showHint('🧪 먼저 용액에 담가 볼까요?', 4500); },
      recap: '물질은 우무의 <b>겉에서부터</b> 같은 깊이(약 0.25 cm)만큼 스며들었어요. 조각이 클수록 물든 <b>비율</b>은 작았어요.',
      summary: '<ul><li>페놀프탈레인을 넣은 우무 정육면체를 묽은 수산화 나트륨 수용액에 담그면 <b>겉에서부터</b> 붉게 물든다.</li>' +
        '<li>10분 뒤 물든 깊이는 크기와 관계없이 <b>약 0.25 cm</b>로 비슷하다.</li></ul>' +
        '<span class="formula">전체 중 물든 부분: 1 cm 약 88 % · 2 cm 약 58 % · 3 cm 약 42 %</span>' +
        '<p>우무 조각이 클수록 전체 중 물든 <b>비율</b>이 작아진다.</p>',
      missions: [
        {
          title: '담그고 자르기',
          goal: '우무 조각을 <b>용액에 담근 뒤</b>, 10분이 지나면 <b>꺼내서 반으로 잘라</b> 보세요.',
          hint: '🧪 용액에 담그기를 누르고 시간이 흐르는 동안 지켜봐요. 10분이 되면 🔪 꺼내서 자르기를 눌러요.',
          check: () => soak.phase === 'cut' && soak.cubes.every((c) => c.cutT > 0.99),
          hold: 0.3,
          status: () => mark(soak.phase !== 'ready' && soak.phase !== 'pouring') + ' 담그기 · ' + mark(soak.phase === 'soaked' || soak.phase === 'cutting' || soak.phase === 'cut') + ' 10분 · ' + mark(soak.phase === 'cut') + ' 자르기',
          explain: '붉은 색은 <b>겉에서부터</b> 안쪽으로 스며들었어요. 세 조각 모두 물든 깊이는 비슷했지요. 우무 조각의 겉은 세포의 <b>세포막</b>, 물질은 세포가 받아들이는 <b>영양소·산소</b>에 비유할 수 있어요.',
        },
        {
          title: '단면 비교하기',
          goal: '세 조각의 <b>잘린 면</b>을 각각 눌러 <b>물든 부분의 비율</b>을 확인해 보세요.',
          hint: '잘린 면(속이 보이는 쪽)을 한 조각씩 눌러요. 초록 테두리가 깜빡이는 면을 찾아봐요.',
          check: () => soak.cubes.every((c) => c.tapped),
          hold: 0.4,
          status: () => soak.cubes.map((c) => mark(c.tapped) + ' ' + c.cm + ' cm').join(' · '),
          explain: '물든 깊이는 모두 약 0.25 cm로 같은데, 전체 중 물든 부분의 <b>비율</b>은 1 cm 약 88 %, 2 cm 약 58 %, 3 cm 약 42 %로 <b>작은 조각일수록 컸어요</b>. 큰 조각은 속이 물들지 못했어요.',
        },
        {
          type: 'quiz', title: '어느 조각이 가장 많이 물들었을까?',
          goal: '세 조각 중 <b>전체에서 물든 부분의 비율</b>이 가장 큰 조각은 무엇일까요?',
          choices: ['한 변 1 cm 조각', '한 변 2 cm 조각', '한 변 3 cm 조각', '세 조각 모두 같다'],
          answer: 0,
          feedback: ['', '2 cm 조각은 약 58 %예요. 더 큰 비율을 가진 조각이 있어요.', '3 cm 조각은 물든 양이 많아 보이지만 속이 커서 비율은 약 42 %로 가장 작았어요.', '물든 깊이(0.25 cm)는 같지만 비율은 달라요. 속이 클수록 물들지 않은 부분이 많았지요.'],
          explain: '가장 작은 <b>1 cm 조각</b>이 약 88 %로 가장 많이 물들었어요. 조각이 작을수록 <b>속까지 물질이 쉽게 닿는다</b>는 뜻이에요.',
        },
      ],
    },
    /* ---------- 2단계 · 분석 ---------- */
    {
      title: '표면적과 부피', short: '표면적과 부피', icon: '📊', phase: '분석',
      features: ['table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 작은 조각일수록 물든 비율이 컸고, 물질은 겉에서부터 스며들었어요.</div>' +
        '<p>물질이 드나드는 곳은 <b>겉(표면적)</b>이고, 물질이 닿아야 하는 곳은 <b>속 전체(부피)</b>예요.</p>' +
        '<p>한 변이 1 · 2 · 3 cm인 정육면체의 <b>표면적과 부피</b>를 구해 표를 채우고, 둘의 관계를 살펴봐요.</p>',
      setup() { setScene('table'); resetTable(); S.view = 'area'; S.seenViews = { area: true, volume: false }; $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'area')); },
      recap: '정육면체가 커질수록 <b>부피가 표면적보다 훨씬 빨리</b> 늘어서, 표면적 ÷ 부피가 작아져요.',
      summary: '<ul><li><b>표면적</b> = 물체 겉면 전체의 넓이, <b>부피</b> = 물체가 차지하는 공간의 크기</li>' +
        '<li>한 변이 길어질수록 부피가 표면적보다 더 빠르게 커진다.</li></ul>' +
        '<span class="formula">한 변 1 · 2 · 3 cm<br>표면적 6 · 24 · 54 cm² / 부피 1 · 8 · 27 cm³<br>표면적 ÷ 부피 = 6 · 3 · 2</span>' +
        '<p>크기가 커질수록 부피에 대한 표면적의 비(표면적 ÷ 부피)가 <b>작아진다</b>.</p>',
      missions: [
        {
          title: '표 빈칸 채우기',
          goal: '정육면체 모형의 <b>칸을 세어</b> 표의 빈칸을 모두 채워 보세요.',
          manual: true,
          hint: '표면적 = (한 면의 넓이) × 6, 부피 = (한 변)³ 이에요. 🟦 겉넓이 / 🟧 부피 버튼으로 칸을 세어 보세요. 표면적 ÷ 부피는 위 두 칸을 나눠요.',
          check: () => tableCheck(),
          explain: '한 변이 1 → 2 → 3 cm로 커질 때 표면적은 6 → 24 → 54 cm²(<b>4배, 9배</b>), 부피는 1 → 8 → 27 cm³(<b>8배, 27배</b>)가 돼요. 부피가 훨씬 빨리 커지므로 <b>표면적 ÷ 부피</b>는 6 → 3 → 2로 작아져요.',
        },
        {
          type: 'quiz', title: '크기가 커지면?',
          goal: '정육면체의 크기가 <b>커질수록</b> 표면적 ÷ 부피의 값은 어떻게 될까요?',
          choices: ['점점 작아진다', '점점 커진다', '변하지 않는다', '커졌다가 작아진다'],
          answer: 0,
          feedback: ['', '표에서 6 → 3 → 2로 줄었어요. 다시 확인해 봐요.', '변하지 않는 것은 아니에요. 표의 마지막 줄이 어떻게 바뀌었나요?', '표의 마지막 줄은 계속 줄어들기만 했어요.'],
          explain: '크기가 커지면 부피가 표면적보다 더 빨리 늘어나요. 그래서 부피에 비해 겉(표면적)이 상대적으로 <b>작아져서</b> 표면적 ÷ 부피는 작아져요. 속까지 물질이 닿기 어려워지는 까닭이에요.',
        },
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '세포의 크기', short: '세포의 크기', icon: '🔬', phase: '모형',
      features: ['cell', 'divide'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 커질수록 표면적 ÷ 부피가 작아졌어요. 세포에서는 이것이 어떤 일을 일으킬까요?</div>' +
        '<p>세포 모형을 <b>키우면서</b> 세포막으로 들어온 영양소가 <b>중심까지</b> 닿는지 살펴봐요. 중심부가 부족해지면 <b>분열</b>시켜 보세요.</p>',
      setup() { setScene('cell'); resetCell(); showHint('🌱 키우기를 눌러 세포를 키워 봐요', 4500); },
      recap: '세포가 커지면 <b>세포막으로 들어온 물질이 중심까지 충분히 가지 못해요</b>. 세포가 분열하면 작은 세포 둘이 되어 다시 충분해져요.',
      summary: '<ul><li>세포는 <b>세포막</b>을 통해 영양소·산소를 받아들이고 노폐물을 내보낸다.</li>' +
        '<li>세포가 커지면 부피가 표면적보다 빨리 늘어 <b>표면적 ÷ 부피</b>가 작아지고, 물질 교환이 효율적이지 않다.</li></ul>' +
        '<p>그래서 세포는 어느 정도 커지면 <b>분열</b>하여 작은 세포가 되고, 물질 교환에 알맞은 크기를 유지한다.</p>',
      missions: [
        {
          title: '키우고 분열시키기',
          goal: '세포를 <b>가장 크게 키워</b> 중심부가 부족해지는 것을 본 뒤, <b>분열</b>시켜 다시 충분해지게 하세요.',
          hint: '🌱 키우기를 3번 눌러 크기 4까지 키워요. 중심이 어두워지면 ✂️ 분열시키기를 눌러요.',
          check: () => cell.healed,
          hold: 0.6,
          status: () => mark(cell.seenStarve) + ' 중심부 부족 · ' + mark(cell.divDone) + ' 분열 · ' + mark(cell.healed) + ' 회복',
          explain: '세포가 커지자 세포막에서 들어온 영양소가 중심까지 닿지 못해 <b>중심부가 부족</b>해졌어요. 분열하면 <b>작은 세포 둘</b>이 되어 표면적 ÷ 부피가 커지고, 두 세포 모두 중심까지 물질이 충분히 가요.',
        },
        {
          type: 'quiz', title: '중심부가 부족해진 까닭',
          goal: '세포가 커지면 중심부가 부족해지는 까닭으로 알맞은 것은?',
          choices: ['부피가 표면적보다 더 빨리 늘어나기 때문', '세포막이 너무 두꺼워지기 때문', '세포의 핵이 사라지기 때문', '주변 용액의 영양소가 모두 없어지기 때문'],
          answer: 0,
          feedback: ['', '세포막의 두께가 아니라, 세포막(표면)의 넓이와 속(부피)의 <b>비</b>가 문제예요.', '모형에서 핵은 그대로 있었어요. 크기에 따라 달라진 것은 무엇이었나요?', '용액에는 영양소가 충분했어요. 작은 세포는 중심까지 잘 닿았잖아요.'],
          explain: '세포가 커지면 부피가 표면적보다 훨씬 빨리 늘어나 <b>표면적 ÷ 부피</b>가 작아져요. 그래서 세포막으로 들어온 물질이 세포 전체에 충분히 전달되지 못해요. 이럴 때 세포는 <b>분열</b>해요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '생장과 세포분열', short: '생장', icon: '🌱', phase: '적용',
      features: ['life'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포는 너무 커지면 물질 교환이 어려워져서 분열했어요.</div>' +
        '<p>그렇다면 <b>몸이 크게 자란다</b>는 것은 세포가 계속 커진다는 뜻일까요, 세포의 <b>수</b>가 늘어난다는 뜻일까요? 처음의 탐구 질문, 코끼리와 생쥐의 세포를 비교해 봐요.</p>',
      setup() { setScene('animals'); resetAnimals(); resetRoot(); showHint('👆 생쥐와 코끼리를 눌러 같은 크기의 조직을 확대해 봐요', 5000); },
      recap: '생물이 자라는 것은 세포가 계속 커지는 것이 아니라, 세포가 <b>분열해서 그 수가 늘어나는 것</b>이에요.',
      summary: '<ul><li>코끼리와 생쥐의 세포 크기는 비슷하다. 몸의 크기가 다른 것은 <b>세포 수</b>가 다르기 때문이다.</li>' +
        '<li>생물이 자라는 것(<b>생장</b>)은 주로 세포분열로 <b>세포 수가 늘어나는</b> 것이다.</li>' +
        '<li>식물의 뿌리 끝(생장점)에서는 세포분열이 활발하게 일어난다.</li></ul>' +
        '<p>다음 차시에서는 세포가 분열할 때 <b>염색체</b>가 어떻게 행동하는지 알아봐요.</p>',
      missions: [
        {
          title: '생쥐와 코끼리의 세포',
          goal: '<b>생쥐</b>와 <b>코끼리</b>를 눌러 같은 크기의 조직을 확대해서 <b>세포 크기</b>를 비교해 보세요.',
          hint: '두 동물을 하나씩 눌러요. 아래에 확대한 세포가 나타나요.',
          check: () => an.seenM && an.seenE,
          hold: 0.5,
          status: () => mark(an.seenM) + ' 생쥐 · ' + mark(an.seenE) + ' 코끼리',
          explain: '두 동물의 세포 크기는 <b>비슷</b>해요! 코끼리의 몸이 큰 것은 세포가 큰 것이 아니라 <b>세포의 수</b>가 훨씬 많기 때문이에요.',
        },
        {
          type: 'quiz', title: '코끼리가 큰 까닭',
          goal: '코끼리의 몸이 생쥐보다 훨씬 큰 까닭은 무엇일까요?',
          choices: ['세포의 수가 훨씬 많기 때문', '세포 하나하나가 훨씬 크기 때문', '세포 속 핵이 훨씬 크기 때문', '세포가 더 이상 분열하지 않기 때문'],
          answer: 0,
          feedback: ['', '확대해서 본 세포의 크기는 두 동물이 비슷했어요. 다시 떠올려 봐요.', '핵의 크기가 아니라 세포의 개수가 달랐어요.', '코끼리도 자라는 동안 세포가 활발하게 분열했어요.'],
          explain: '세포는 일정한 크기 이상으로 커지지 않아요. 몸이 커지려면 세포가 <b>분열하여 수가 늘어나야</b> 해요. 코끼리는 생쥐보다 세포 수가 훨씬 많아요.',
        },
        {
          title: '뿌리 끝의 세포분열',
          goal: '<b>🌱 뿌리 자라게 하기</b>를 누른 뒤, 뿌리 끝의 <b>생장점</b>을 눌러 세포를 확대해 보세요.',
          hint: '위의 "🌱 뿌리 끝" 버튼으로 장면을 바꾼 뒤, 뿌리를 자라게 하고 노란 고리가 깜빡이는 곳을 눌러요.',
          setup() { setScene('root'); resetRoot(); },
          check: () => rt.grown && rt.seenTip,
          hold: 0.5,
          status: () => mark(rt.grown) + ' 뿌리 자라게 하기 · ' + mark(rt.seenTip) + ' 생장점 확대',
          explain: '뿌리 끝(<b>생장점</b>)에는 작은 세포가 많고, 이 세포들이 활발하게 <b>분열</b>해요. 새로 생긴 세포가 늘어나 뿌리가 길어지지요. 다음 차시에서 분열하는 세포 속 <b>염색체</b>를 살펴봐요.',
        },
        {
          type: 'quiz', title: '생장이란?',
          goal: '생물이 <b>생장</b>하는 방법으로 가장 알맞은 것은?',
          choices: ['세포분열로 세포 수가 늘어난다', '세포 하나하나가 끝없이 커진다', '세포 안의 물질 교환이 점점 늘어난다', '핵이 점점 커져 세포를 가득 채운다'],
          answer: 0,
          feedback: ['', '세포가 끝없이 커지면 중심까지 물질이 닿지 못해요. 3단계에서 본 것처럼 알맞은 크기에서 분열해요.', '물질 교환은 세포가 작을수록 효율적이에요. 세포가 커지면 오히려 어려워져요.', '핵이 세포를 채우지는 않아요. 생장은 세포 수가 늘어나는 것이에요.'],
          explain: '생물은 세포가 알맞은 크기가 되면 <b>분열</b>하여 세포 수가 늘어나면서 자라요. 몸이 자라는 데 <b>세포분열</b>이 필요한 까닭은 표면적 ÷ 부피 때문에 세포가 무한히 커질 수 없기 때문이에요.',
        },
      ],
    },
  ];

  buildTable();
  game = SciSim.game({
    simId: 'm3-cell-division-why',
    mount: '#game',
    badge: '세포분열 탐정',
    homeHref: '../../index.html#g3',
    featureLabels: { soak: '🧪 용액에 담그기', cut: '🔪 자르기', table: '📊 표면적과 부피 표', cell: '🔬 세포 모형', divide: '✂️ 분열시키기', life: '🌱 생물의 생장' },
    onFeatures(set) {
      F = new Set(set);
      if (F.has('life')) { $('#lifeSeg').hidden = false; }
    },
    onMissionStart() { syncSoakButtons(); syncCellButtons(); syncRootButtons(); },
    levels,
  });

  updateUI();
  syncSoakButtons();
  SciSim.loop((dt, t) => {
    if (S.scene === 'soak') stepSoak(dt);
    else if (S.scene === 'cell') stepCell(dt);
    else if (S.scene === 'animals') { an.mouse.update(dt); an.ele.update(dt); }
    else if (S.scene === 'root') rt.lz.update(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = { S, soak, cell, an, rt, tbl, startSoak, startCut, growCell, divideCell, growRoot, tapRoot, tapAnimal, setScene, tapSoak, game, levels, cutFacePoly, AN, RT, rtBottom, toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; } };
})();
