/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 — 포화 수증기량과 상대 습도 [9과17-03]
   ① [관찰] 포화: 밀폐 용기 속 물 분자의 증발과 응결 → 포화 수증기량 곡선 위의 점 (10·20·30 °C)
   ② [실험] 이슬점: 금속 컵을 식히며 물방울이 맺히는 온도를 찾고, 그래프의 수평선으로 이슬점을 읽는다
   ③ [설명] 상대 습도 = 현재 수증기량 ÷ 포화 수증기량 × 100 (기온이 오르면 같은 수증기량에서도 습도가 낮아진다)
   ④ [적용] 공기를 식힐 때의 응결량 (30 °C, 20.0 g/kg 공기를 식히기), 김 서림·이슬
   ※ 포화 수증기량(g/kg)을 주로 쓰고, 같은 곡선을 포화 수증기압(hPa) 눈금(오른쪽 축)으로도 읽는다.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×640) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 640 : 560;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf4fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();

  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease;
  const rand = (a, b) => a + Math.random() * (b - a);
  const appr = (c, t, dt, k) => SciSim.approach(c, t, dt, k);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const COL = {
    ink: '#1b2333', muted: '#5d6879', good: '#14a058', bad: '#e2464b', warm: '#f26b3a', cold: '#2f7de1',
    sky: '#0ea5e9', skyD: '#0369a1', line: '#dde4ef', glass: '#8fa3bd', water: '#58b0f2',
  };
  const CLK = { t: 0 };
  const text = (x, y, s, o) => D.text(x, y, s, o);

  /* =========================================================
     포화 수증기량 · 포화 수증기압 (단원 설계의 값, 사이는 부드럽게 이어 줌)
     ========================================================= */
  const TT = [0, 5, 10, 15, 20, 25, 30, 35, 40];
  const WW = [3.8, 5.4, 7.6, 10.6, 14.7, 20.0, 27.1, 36.6, 49.0];   // g/kg
  const PP = [6.1, 8.7, 12.3, 17.0, 23.4, 31.7, 42.4, 56.2, 73.8];  // hPa
  function logInterp(tab, T) {
    const n = tab.length, h = 5, ln = (i) => Math.log(tab[i]);
    if (T <= 0) return Math.exp(ln(0) + ((ln(1) - ln(0)) / h) * T);
    if (T >= 40) return Math.exp(ln(n - 1) + ((ln(n - 1) - ln(n - 2)) / h) * (T - 40));
    const i = Math.min(n - 2, Math.floor(T / h)), s = (T - i * h) / h;
    const y0 = ln(i), y1 = ln(i + 1);
    const m0 = i > 0 ? (ln(i + 1) - ln(i - 1)) / 2 : ln(1) - ln(0);
    const m1 = i + 2 < n ? (ln(i + 2) - ln(i)) / 2 : ln(n - 1) - ln(n - 2);
    const s2 = s * s, s3 = s2 * s;
    return Math.exp((2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * m1);
  }
  const satW = (T) => logInterp(WW, T);
  const satP = (T) => logInterp(PP, T);
  const wOfP = (e) => (622 * e) / (1013 - e);                 // 오른쪽 축 눈금 위치(hPa → g/kg)
  function dewOf(w) {                                           // 이슬점: 포화 수증기량이 w가 되는 온도
    if (w <= 0.05) return -40;
    let a = -40, b = 45;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (satW(m) < w) a = m; else b = m; }
    return (a + b) / 2;
  }
  const K = 2;                                                  // 수증기 1 g/kg = 분자 모형 2개
  const nEq = (T) => Math.round(satW(T) * K);
  const AIRW = { humid: 14.7, dry: 7.6 };
  const AIRT = 25;

  /* =========================================================
     레이아웃
     ========================================================= */
  const L = PHONE
    ? { scene: { x: 8, y: 8, w: 424, h: 292 }, graph: { x: 8, y: 308, w: 424, h: 238 }, bars: { x: 8, y: 554, w: 424, h: 80 }, sc: 0.86 }
    : { scene: { x: 14, y: 12, w: 376, h: 410 }, graph: { x: 402, y: 12, w: 384, h: 410 }, bars: { x: 14, y: 432, w: 772, h: 116 }, sc: 1 };
  const GM = PHONE ? { l: 42, r: 44, t: 40, b: 34 } : { l: 48, r: 50, t: 56, b: 44 };
  const GP = { x: L.graph.x + GM.l, y: L.graph.y + GM.t, w: L.graph.w - GM.l - GM.r, h: L.graph.h - GM.t - GM.b };
  const TMAX = 35, WMAX = 40;
  const gx = (T) => GP.x + (T / TMAX) * GP.w;
  const gy = (w) => GP.y + GP.h - (w / WMAX) * GP.h;
  const gT = (x) => ((x - GP.x) / GP.w) * TMAX;

  /* ---------- 부드러운 그림자 · 패널 ---------- */
  const SHC = new Map();
  let shK = 0;
  function rrPath(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function softShadow(x, y, w, h, r, blur, dy, color) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    if (k !== shK) { SHC.clear(); shK = k; }
    const W = Math.round(w), H = Math.round(h), key = W + '|' + H + '|' + r + '|' + blur + '|' + color;
    let sp = SHC.get(key);
    if (!sp) {
      const pad = Math.ceil(blur * 1.5) + 2, OFF = W + pad;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil((W + pad * 2) * k); cv.height = Math.ceil((H + pad * 2) * k);
      const c = cv.getContext('2d');
      c.shadowColor = color; c.shadowBlur = blur * k; c.shadowOffsetX = OFF * k; c.shadowOffsetY = 0;
      c.scale(k, k); c.translate(pad - OFF, pad);
      c.fillStyle = '#000'; rrPath(c, 0, 0, W, H, r); c.fill();
      sp = { cv, pad }; SHC.set(key, sp);
    }
    ctx.drawImage(sp.cv, x - sp.pad, y - sp.pad + dy, sp.cv.width / shK, sp.cv.height / shK);
  }
  function panel(x, y, w, h, r, fill, blur, dy) {
    softShadow(x, y, w, h, r, blur == null ? 12 : blur, dy == null ? 4 : dy, 'rgba(30,60,110,.18)');
    ctx.fillStyle = fill || '#fff'; D.roundRect(x, y, w, h, r); ctx.fill();
  }
  function contactShadow(cx, cy, rx, ry, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(30,40,70,' + (0.34 * (a == null ? 1 : a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(30,40,70,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }

  /* ---------- 축하 효과 ---------- */
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 24, speed: 180, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt;
      if (c.t > 1.6) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = c.t > 1.1 ? 1 - (c.t - 1.1) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, c.t / 0.35));
      ctx.translate(c.x, c.y - c.t * 14); ctx.scale(s, s);
      D.check(0, 0, 22, Math.min(1, c.t / 0.5));
      ctx.restore();
    }
  }

  /* ---------- 물 분자 모형 (스프라이트로 한 번 그려 두고 재사용) ---------- */
  const SPR = new Map();
  let sprK = 0;
  function molSprite(r, kind) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    if (k !== sprK) { SPR.clear(); sprK = k; }
    const key = r + '|' + kind;
    let s = SPR.get(key);
    if (s) return s;
    const half = Math.ceil(r * 1.9), cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(half * 2 * k);
    const c = cv.getContext('2d');
    c.scale(k, k); c.translate(half, half);
    const ball = (x, y, rr, c1, c2, c3) => {
      const g = c.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
      g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, c3);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
    };
    const o = kind === 'liq' ? ['#cfe9ff', '#6db8f5', '#2e78cc'] : ['#d6efff', '#4aa8f2', '#1f6fc4'];
    const hr = r * 0.56, hx = r * 0.98, hy = r * 0.78;
    ball(-hx, hy, hr, '#ffffff', '#eef5fc', '#b8cde4');
    ball(hx, hy, hr, '#ffffff', '#eef5fc', '#b8cde4');
    ball(0, 0, r, o[0], o[1], o[2]);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.17, -0.6, 0, TAU); c.fill();
    s = { cv, half };
    SPR.set(key, s);
    return s;
  }
  function drawMol(x, y, r, rot, a, kind, sc) {
    const sp = molSprite(Math.round(r * 2) / 2, kind || 'v');
    ctx.save();
    if (a != null && a < 1) ctx.globalAlpha *= Math.max(0, a);
    ctx.translate(x, y); ctx.rotate(rot || 0);
    if (sc != null && sc !== 1) ctx.scale(sc, sc);
    ctx.drawImage(sp.cv, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
    ctx.restore();
  }

  /* =========================================================
     상태
     ========================================================= */
  let game = null;
  let F = new Set();
  const S = { scene: 'box', tr: 1 };
  const G = { curve: 0 };                                       // 그래프 곡선이 그려지는 정도

  /* ① 밀폐 용기 */
  const RV = PHONE ? 5.5 : 6.5;
  const BX = PHONE
    ? { x: L.scene.x + 42, y: L.scene.y + 50, w: L.scene.w - 84, h: 170, water: 38 }
    : { x: L.scene.x + 30, y: L.scene.y + 58, w: L.scene.w - 60, h: 256, water: 54 };
  const SURF = BX.y + BX.h - BX.water;
  const KC = 0.5;                                                // 수증기 분자 하나가 1초에 물로 돌아갈 확률(기대)
  const BOX = {
    T: 20, Tv: 20, vap: [], liq: [], rip: [], accE: 0, nextE: 0.7, accC: 0, nextC: 0.7,
    satT: 0, sat: false, evS: 0, coS: 0, wS: 0, recs: [], flash: 0,
  };
  (function initLiq() {
    const gap = 2 * RV + 4, cols = Math.floor((BX.w - 14) / gap), rows = Math.max(2, Math.floor((BX.water - 10) / (2 * RV + 1)));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      BOX.liq.push({ x: BX.x + 8 + gap / 2 + c * gap + (r % 2 ? 3 : 0), y: SURF + 4 + RV + r * (2 * RV + 1), ph: rand(0, TAU), rot: rand(0, TAU), f: rand(0.8, 1.5) });
    }
  })();

  /* ② 금속 컵 */
  const CG = (() => {
    const s = L.scene, cw = PHONE ? 104 : 132, ch = PHONE ? 128 : 172;
    const cx = s.x + s.w * (PHONE ? 0.33 : 0.37), base = s.y + s.h - (PHONE ? 34 : 54);
    return { cx, cw, ch, x: cx - cw / 2, y: base - ch, base, rim: PHONE ? 9 : 11 };
  })();
  const INS = PHONE
    ? { x: L.scene.x + L.scene.w - 66, y: L.scene.y + 106, R: 54 }
    : { x: L.scene.x + L.scene.w - 82, y: L.scene.y + 148, R: 68 };
  const CUP = {
    cupT: 25, cupTv: 25, ice: false, air: 'humid', wv: 14.7, dewRec: { humid: null, dry: null }, found: { humid: false, dry: false },
    drops: [], puddle: 0, cubes: [], film: 0, showLine: false, vapor: [], ins: [], filmT: 0, wasDew: false,
    dm: { T: AIRT, target: AIRT, drag: false, hover: false },
  };
  for (let i = 0; i < 14; i++) CUP.vapor.push({ x: rand(L.scene.x + 14, L.scene.x + L.scene.w - 14), y: rand(L.scene.y + 56, CG.base - 10), vx: rand(-9, 9), vy: rand(-7, 7), ph: rand(0, TAU), a: 1, rot: rand(0, TAU) });
  for (let i = 0; i < 12; i++) CUP.ins.push({ x: 0, y: 0, vx: 0, vy: 0, rot: rand(0, TAU), on: false });

  /* ③④ 칸 모형 (상대 습도 · 응결) */
  const COLS = 9, ROWS = 9;
  const CELL = PHONE ? 23 : 27;
  const SG = (() => {
    const s = L.scene;
    const x0 = s.x + (PHONE ? 16 : 18), y0 = s.y + (PHONE ? 44 : 54);
    return { x0, y0, w: COLS * CELL, h: ROWS * CELL, poolY: y0 + ROWS * CELL + 4, poolH: PHONE ? 26 : 34 };
  })();
  const DIAL = PHONE ? { x: L.scene.x + L.scene.w - 78, y: L.scene.y + 100, r: 52 } : { x: L.scene.x + L.scene.w - 76, y: L.scene.y + 118, r: 54 };
  const RHS = {
    mode: 'rh', T: 20, w: 14.7, Tv: 20, wv: 14.7, slotsF: 29, mols: [], pool: 0, dial: new SciSim.Spring(100, { stiffness: 120, damping: 13 }),
    view: 'curve', day: { on: false, t: 0, done: false }, seenDew: false, flashT: 0,
  };
  for (let i = 0; i < COLS * ROWS; i++) RHS.mols.push({ x: SG.x0 + SG.w / 2, y: SG.y0 + SG.h / 2, s: 0, ph: rand(0, TAU), rot: rand(0, TAU), arrived: false, tx: 0, ty: 0 });
  const slotPos = (i) => ({ x: SG.x0 + ((i % COLS) + 0.5) * CELL, y: SG.y0 + (ROWS - 1 - Math.floor(i / COLS) + 0.5) * CELL });

  /* 하루 변화 (맑은 날): 05시 최저 12 °C, 14시 30분 최고 26 °C — 수증기량은 7.6 g/kg로 일정 */
  const DAYW = 7.6;
  function dayT(h) {
    const hh = h < 5 ? h + 24 : h;
    if (hh <= 14.5) return 12 + 14 * (1 - Math.cos(Math.PI * (hh - 5) / 9.5)) / 2;
    return 26 - 14 * (1 - Math.cos(Math.PI * (hh - 14.5) / 14.5)) / 2;
  }
  const dayRH = (h) => DAYW / satW(dayT(h)) * 100;

  /* 막대 그래프(아래쪽) 표시값 */
  const BAR = { w: 0, sat: 0, rh: 0 };

  /* =========================================================
     장면 전환 · 초기화
     ========================================================= */
  const SCENES = {
    box: { label: '📦 밀폐 용기 속 수증기 · 포화 수증기량 곡선', hint: '온도 슬라이더로 물의 온도를 바꿔 보세요' },
    cup: { label: '🧊 차가운 컵 표면의 이슬 · 이슬점', hint: '🧊 얼음물을 넣어 컵을 식혀 보세요' },
    rh: { label: '💧 칸 모형으로 보는 상대 습도', hint: '기온과 수증기량 슬라이더를 움직여 보세요' },
    app: { label: '🌿 공기를 식힐 때 생기는 응결량', hint: '슬라이더로 공기를 식혀 보세요' },
  };
  let hintTimer = 0;
  function showHint(msg) {
    const h = $('#stageHint');
    if (!h) return;
    h.textContent = msg; h.classList.remove('hide');
    clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }

  function setScene(name, reset) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed || reset) {
      if (name === 'box') boxReset();
      else if (name === 'cup') cupReset();
      else rhReset(name);
    }
    if (changed) { S.tr = 0; SciSim.tween(S, { tr: 1 }, { duration: 0.5, ease: 'outCubic' }); G.curve = 0; SciSim.tween(G, { curve: 1 }, { duration: 1.3, ease: 'inOutCubic', delay: 0.15 }); }
    refreshUI();
    showHint(SCENES[name].hint);
  }
  function boxReset() {
    const B = BOX;
    B.vap.length = 0; B.rip.length = 0; B.accE = B.accC = 0; B.satT = 0; B.sat = false; B.wS = 0; B.evS = B.coS = 0;
    syncRange($('#boxR'), B.T);
  }
  function cupReset() {
    const C = CUP;
    C.ice = false; C.cupT = 25; C.cupTv = 25; C.drops.length = 0; C.puddle = 0; C.cubes.length = 0; C.film = 0; C.filmT = 0; C.wasDew = false;
    C.dm.T = C.dm.target = AIRT; C.dm.drag = false;
    syncRange($('#cupR'), 25);
  }
  function rhReset(mode) {
    const R = RHS;
    R.mode = mode; R.day.on = false; R.day.t = 0; R.day.done = false; R.view = 'curve'; R.seenDew = false; R.pool = 0;
    if (mode === 'app') { R.T = 30; R.w = 20.0; R.Tv = 30; R.wv = 20.0; }
    else { R.T = 20; R.w = 14.7; R.Tv = 20; R.wv = 14.7; }
    R.slotsF = nEq(R.Tv);
    R.mols.forEach((m, i) => { const p = slotPos(i); m.x = p.x; m.y = p.y; m.s = 0; m.arrived = false; });
    syncRange($('#rhTR'), R.T); syncRange($('#rhWR'), R.w); syncRange($('#appR'), R.T);
    refreshUI();
  }
  function resetScene() { setScene(S.scene, true); Sound.click(); }

  /* =========================================================
     컨트롤 연결
     ========================================================= */
  const binds = {};
  function syncRange(el, v) { if (el && binds[el.id]) binds[el.id].set(v); }
  binds.boxR = SciSim.bindRange($('#boxR'), $('#boxO'), (v) => v + ' °C', (v) => { BOX.T = v; });
  binds.cupR = SciSim.bindRange($('#cupR'), $('#cupO'), (v) => (+v).toFixed(1) + ' °C', (v) => { CUP.cupT = v; setIce(false); });
  binds.rhTR = SciSim.bindRange($('#rhTR'), $('#rhTO'), (v) => v + ' °C', (v) => { cancelDay(); RHS.T = v; });
  binds.rhWR = SciSim.bindRange($('#rhWR'), $('#rhWO'), (v) => (+v).toFixed(1) + ' g/kg', (v) => { cancelDay(); RHS.w = v; });
  binds.appR = SciSim.bindRange($('#appR'), $('#appO'), (v) => v + ' °C', (v) => { RHS.T = v; });
  function cancelDay() { if (RHS.day.on) RHS.day.on = false; if (RHS.view === 'day') RHS.view = 'curve'; $('#dayBtn').classList.remove('btn-on'); $('#dayBtn').textContent = '☀️ 하루 보기'; }

  function setIce(on) {
    if (CUP.ice === on) return;
    CUP.ice = on;
    const b = $('#iceBtn');
    b.classList.toggle('btn-on', on);
    b.textContent = on ? '⏸ 멈추기' : '🧊 얼음물 넣기';
    if (on) Sound.click();
  }
  $('#iceBtn').addEventListener('click', () => {
    if (!CUP.ice && CUP.cupT <= 2.05) { CUP.cupT = 25; syncRange($('#cupR'), 25); }
    setIce(!CUP.ice);
  });
  $$('#airSeg button').forEach((b) => b.addEventListener('click', () => setAir(b.dataset.air)));
  function setAir(a, silent) {
    if (!silent) Sound.click();
    CUP.air = a;
    CUP.dm.T = CUP.dm.target = CUP.found[a] ? dewOf(AIRW[a]) : AIRT;
    $$('#airSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.air === a)));
    CUP.drops.length = 0; CUP.puddle = 0;
  }
  $('#dayBtn').addEventListener('click', () => {
    Sound.click();
    const R = RHS;
    if (R.day.on) { cancelDay(); return; }
    R.w = DAYW; syncRange($('#rhWR'), DAYW);
    R.day.on = true; R.day.t = 0; R.day.done = false; R.view = 'day';
    $('#dayBtn').classList.add('btn-on'); $('#dayBtn').textContent = '⏸ 멈추기';
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, false); }));
  $('#resetBtn').addEventListener('click', resetScene);

  function refreshUI() {
    $('#ctlBox').hidden = S.scene !== 'box';
    $('#ctlCup').hidden = S.scene !== 'cup';
    $('#ctlRH').hidden = S.scene !== 'rh';
    $('#ctlApp').hidden = S.scene !== 'app';
    $('#airSeg').hidden = !(CUP.showLine || (game && game.free));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    $('#tbLabel').textContent = SCENES[S.scene].label;
    const d = $('#dayBtn');
    if (!RHS.day.on) { d.classList.remove('btn-on'); d.textContent = '☀️ 하루 보기'; }
  }

  /* =========================================================
     ① 밀폐 용기 — 증발 · 응결 갱신
     ========================================================= */
  function spawnVap(x) {
    const B = BOX, sp = (60 + 1.3 * B.Tv) * L.sc, a = -Math.PI / 2 + rand(-0.7, 0.7);
    B.vap.push({ x: x != null ? x : rand(BX.x + RV + 4, BX.x + BX.w - RV - 4), y: SURF - RV - 1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, TAU), vr: rand(-2, 2), st: 'free', s: 0 });
  }
  function boxUpdate(dt) {
    const B = BOX;
    B.Tv = appr(B.Tv, B.T, dt, 4);
    const Neq = nEq(B.T), spd = (60 + 1.3 * B.Tv) * L.sc;
    // 증발: 물 표면에서 분자가 하나씩 날아올라요 (물의 온도가 높을수록 자주)
    B.accE += KC * Neq * dt;
    let g = 0;
    while (B.accE >= B.nextE && g++ < 8) {
      B.accE -= B.nextE; B.nextE = rand(0.5, 1.5);
      if (B.vap.length < 92) { const x = rand(BX.x + RV + 4, BX.x + BX.w - RV - 4); spawnVap(x); if (Math.random() < 0.35) B.rip.push({ x, t: 0 }); }
    }
    // 응결: 수증기 분자 중 일부가 물로 돌아가요 (분자가 많을수록 자주)
    let nFree = 0;
    B.vap.forEach((p) => { if (p.st === 'free') nFree++; });
    B.accC += KC * nFree * dt;
    g = 0;
    while (B.accC >= B.nextC && g++ < 8) {
      const ymin = BX.y + (SURF - BX.y) * 0.5;
      const near = B.vap.filter((p) => p.st === 'free' && p.y > ymin);
      if (!near.length) break;
      B.accC -= B.nextC; B.nextC = rand(0.5, 1.5);
      near[(Math.random() * near.length) | 0].st = 'back';
    }
    // 움직임
    for (let i = B.vap.length - 1; i >= 0; i--) {
      const p = B.vap[i];
      p.s = Math.min(1, p.s + dt * 5);
      p.rot += p.vr * dt;
      if (p.st === 'back') {
        p.vx *= Math.exp(-3 * dt); p.vy = appr(p.vy, 280 * L.sc, dt, 10);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y >= SURF - 1) { B.rip.push({ x: p.x, t: 0 }); FX.emit({ x: p.x, y: SURF, vx: rand(-20, 20), vy: -rand(20, 50), life: 0.4, size: 2.2, color: '#a8d6ff', gravity: 220 }); B.vap.splice(i, 1); }
        continue;
      }
      const v = Math.hypot(p.vx, p.vy) || 1, k = appr(v, spd, dt, 3) / v;
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const x0 = BX.x + RV + 2, x1 = BX.x + BX.w - RV - 2, y0 = BX.y + RV + 2, y1 = SURF - RV - 1;
      if (p.x < x0) { p.x = x0; p.vx = Math.abs(p.vx); } else if (p.x > x1) { p.x = x1; p.vx = -Math.abs(p.vx); }
      if (p.y < y0) { p.y = y0; p.vy = Math.abs(p.vy); } else if (p.y > y1) { p.y = y1; p.vy = -Math.abs(p.vy) * 0.9; p.vx += rand(-20, 20); }
    }
    for (let i = B.rip.length - 1; i >= 0; i--) { B.rip[i].t += dt; if (B.rip[i].t > 0.7) B.rip.splice(i, 1); }
    // 포화 판정: 수증기 분자 수가 일정해지고(증발 = 응결) 잠시 유지되면 포화
    const N = nFree, diff = Math.abs(N - Neq);
    if (diff <= 1) B.satT += dt; else if (diff > 2) B.satT = 0;
    const wasSat = B.sat;
    B.sat = B.satT > 1.0;
    if (B.sat && !wasSat) { B.flash = 1; }
    B.flash = Math.max(0, B.flash - dt * 1.4);
    B.wS = appr(B.wS, N / K, dt, 9);
    const evT = KC * Neq, coT = B.sat ? evT : KC * nFree;
    B.evS = appr(B.evS, evT, dt, 4); B.coS = appr(B.coS, coT, dt, 4);
    // 곡선에 점 찍기 (5 °C 간격의 포화 상태)
    if (B.sat && B.T % 5 === 0 && !B.recs.some((r) => r.T === B.T)) {
      B.recs.push({ T: B.T, w: satW(B.T), p: satP(B.T), pop: 0 });
      celebrate(gx(B.T), gy(satW(B.T)));
    }
    B.recs.forEach((r) => { r.pop = Math.min(1, r.pop + dt * 2.5); });
  }

  /* =========================================================
     ② 금속 컵 — 이슬 맺히기
     ========================================================= */
  const airW = () => AIRW[CUP.air];
  const excess = () => Math.max(0, CUP.wv - satW(CUP.cupTv));
  function cupUpdate(dt) {
    const C = CUP;
    if (C.ice) {
      C.cupT = Math.max(2, C.cupT - 1.0 * dt);
      syncRange($('#cupR'), C.cupT);
      if (C.cupT <= 2.0) setIce(false);
    }
    C.cupTv = appr(C.cupTv, C.cupT, dt, 6);
    C.wv = appr(C.wv, airW(), dt, 5);
    const ex = excess();
    // 이슬점 기록 (물방울이 맺히기 시작하는 순간의 온도)
    if (ex > 0.03 && C.dewRec[C.air] == null && Math.abs(C.wv - airW()) < 0.3) {
      C.dewRec[C.air] = Math.round(dewOf(airW()) * 10) / 10;
      toast('💧 물방울이 맺히기 시작! <b>이슬점 ' + f1(C.dewRec[C.air]) + ' °C</b>', 'good', 2600);
      celebrate(CG.cx, CG.y + CG.ch * 0.4);
    }
    // 얼음 조각
    const wantCubes = clamp(Math.floor((AIRT - C.cupTv) / 4), 0, 5);
    while (C.cubes.length < wantCubes) {
      const i = C.cubes.length;
      C.cubes.push({ dx: [-0.28, 0.14, -0.06, 0.3, -0.38][i] * CG.cw * 0.55 + rand(-3, 3), dy: -80 - i * 18, y: -80 - i * 18, rot: rand(-0.5, 0.5), s: 1, ph: rand(0, TAU), landed: false });
      SciSim.tween(C.cubes[i], { y: 0 }, { duration: 0.55, ease: 'outBounce' });
    }
    while (C.cubes.length > wantCubes) C.cubes.pop();
    C.cubes.forEach((c) => {
      if (!c.landed && c.y > -2) { c.landed = true; for (let k = 0; k < 6; k++) FX.emit({ x: CG.cx + c.dx, y: CG.y + 2, vx: rand(-50, 50), vy: -rand(60, 120), life: 0.5, size: 2.4, color: '#bfe4ff', gravity: 340 }); }
    });
    // 컵 표면의 물방울
    const target = ex > 0.02 ? Math.min(PHONE ? 46 : 64, Math.ceil(ex * 9)) : 0;
    C.film = appr(C.film, clamp(ex / 2.2, 0, 1), dt, 2.5);
    if (C.drops.length < target && Math.random() < dt * 14) C.drops.push({ u: rand(0.06, 0.94), v: rand(0.1, 0.95), r: 0, rt: rand(4, 8.5), slide: false, trail: 0, v0: 0 });
    for (let i = C.drops.length - 1; i >= 0; i--) {
      const d = C.drops[i];
      const gone = i >= target && !d.slide;
      d.r = appr(d.r, gone ? 0 : d.rt, dt, gone ? 2.5 : 1.4);
      if (gone && d.r < 0.25) { C.drops.splice(i, 1); continue; }
      if (!d.slide && d.r > 6 && d.rt > 6.4 && Math.random() < dt * 0.5) { d.slide = true; d.v0 = d.v; }
      if (d.slide) { d.v += dt * 0.16; d.trail = d.v - d.v0; if (d.v > 0.97) { C.puddle = Math.min(1, C.puddle + 0.06); C.drops.splice(i, 1); } }
    }
    if (ex <= 0.02) C.puddle = appr(C.puddle, 0, dt, 0.15);
    // 방 안의 수증기 (장식)
    C.vapor.forEach((p, i) => {
      const on = i < Math.round(C.wv * 0.95);
      p.a = appr(p.a, on ? 1 : 0, dt, 3);
      p.x += (p.vx + Math.sin(CLK.t * 0.9 + p.ph) * 6) * dt; p.y += (p.vy + Math.cos(CLK.t * 0.7 + p.ph) * 5) * dt;
      const s = L.scene;
      if (p.x < s.x + 8) p.vx = Math.abs(p.vx); if (p.x > s.x + s.w - 8) p.vx = -Math.abs(p.vx);
      if (p.y < s.y + 50) p.vy = Math.abs(p.vy); if (p.y > CG.base - 14) p.vy = -Math.abs(p.vy);
    });
    insUpdate(dt, ex);
    // 그래프의 이슬점 표시 점
    const dm = CUP.dm;
    if (!dm.drag) dm.T = appr(dm.T, dm.target, dt, 9);
  }
  function insUpdate(dt, ex) {
    const C = CUP, I = INS, n = Math.max(3, Math.round(C.wv * 0.6));
    const wallX = I.x - I.R * 0.45, r = RV * 0.9 * (PHONE ? 0.95 : 1.05);
    C.filmT = appr(C.filmT, Math.min(I.R * 0.36, ex * 4.2), dt, 3);
    const edge = wallX + C.filmT;
    C.ins.forEach((m, i) => {
      const on = i < n;
      if (!on) { m.on = false; return; }
      if (!m.on) { m.on = true; m.x = I.x + I.R * 0.55; m.y = I.y + rand(-I.R * 0.4, I.R * 0.4); const a = Math.PI + rand(-0.9, 0.9), s = rand(40, 62); m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; }
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += dt * 1.2;
      const dx = m.x - I.x, dy = m.y - I.y, d = Math.hypot(dx, dy), lim = I.R - r - 3;
      if (d > lim) { const nx = dx / d, ny = dy / d, vn = m.vx * nx + m.vy * ny; if (vn > 0) { m.vx -= 2 * vn * nx; m.vy -= 2 * vn * ny; } m.x = I.x + nx * lim; m.y = I.y + ny * lim; }
      if (m.x - r <= edge) {
        if (ex > 0.02 && Math.random() < 0.85) {                  // 차가운 벽: 달라붙어 물이 돼요
          FX.emit({ x: edge + 1, y: m.y, vx: 0, vy: 0, life: 0.45, size: 7, color: 'rgba(120,190,255,.8)', shape: 'smoke', fade: true, grow: 22 });
          m.on = false; m.x = I.x + I.R * 0.62; m.y = I.y + rand(-I.R * 0.45, I.R * 0.45); m.on = true; m.vx = -rand(40, 62); m.vy = rand(-20, 20);
        } else { m.x = edge + r; m.vx = Math.abs(m.vx) * (ex > 0 ? 1 : 1); }
      }
    });
  }

  /* =========================================================
     ③④ 칸 모형 — 갱신
     ========================================================= */
  const dayCap = () => RHS.day.on;
  function rhUpdate(dt) {
    const R = RHS;
    if (R.day.on) {
      R.day.t += dt * 2.4;
      if (R.day.t >= 24) { R.day.t = 24; R.day.on = false; R.day.done = true; $('#dayBtn').classList.remove('btn-on'); $('#dayBtn').textContent = '☀️ 다시 보기'; }
      R.T = dayT(R.day.t); R.w = DAYW;
      syncRange($('#rhTR'), Math.round(R.T)); syncRange($('#rhWR'), R.w);
    }
    R.Tv = appr(R.Tv, R.T, dt, 5); R.wv = appr(R.wv, R.w, dt, 5);
    R.slotsF = appr(R.slotsF, nEq(R.Tv), dt, 6);
    const nSlots = Math.round(R.slotsF), nMol = Math.min(COLS * ROWS, Math.round(R.wv * K));
    let surplus = 0;
    R.mols.forEach((m, i) => {
      const want = i < nMol ? 1 : 0;
      m.s = appr(m.s, want, dt, want ? 7 : 6);
      if (i < nSlots) {
        const p = slotPos(i);
        if (m.arrived) { m.arrived = false; m.x = p.x; m.y = SG.poolY; }
        m.tx = p.x; m.ty = p.y; m.drop = false;
      } else if (i < nMol) {
        surplus++;
        m.drop = true; m.ty = SG.poolY + 6;
        if (m.tx === 0 || Math.abs(m.tx - SG.x0 - SG.w / 2) > SG.w / 2) m.tx = SG.x0 + 12 + Math.random() * (SG.w - 24);
      } else { m.drop = false; const p = slotPos(i); m.tx = p.x; m.ty = p.y; }
      if (m.drop) {
        m.y += (m.ty - m.y) * Math.min(1, dt * 3.2) + dt * 40; m.x = appr(m.x, m.tx, dt, 2);
        if (m.y >= m.ty - 2) { m.arrived = true; }
      } else { m.x = appr(m.x, m.tx, dt, 9); m.y = appr(m.y, m.ty, dt, 9); m.arrived = false; }
    });
    R.pool = appr(R.pool, Math.min(SG.poolH - 6, (R.mode === 'app' || surplus > 0) ? surplus * 0.9 : 0), dt, 3);
    const rh = clamp(R.w / satW(R.T), 0, 1) * 100;
    R.dial.target = rh; R.dial.update(dt);
    if (R.mode === 'app' && R.Tv < dewOf(20) - 0.3) R.seenDew = true;
  }

  /* =========================================================
     그래프 (포화 수증기량 곡선 + 오른쪽 hPa 눈금)
     ========================================================= */
  function curveFill(pr) {
    const Tend = TMAX * pr;
    if (pr <= 0.01) return;
    ctx.save();
    // 곡선 아래: 수증기로 있을 수 있는 영역
    let g = ctx.createLinearGradient(0, GP.y, 0, GP.y + GP.h);
    g.addColorStop(0, 'rgba(14,165,233,.28)'); g.addColorStop(1, 'rgba(14,165,233,.06)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(gx(0), gy(0));
    for (let T = 0; T <= Tend + 0.01; T += 0.5) ctx.lineTo(gx(Math.min(T, Tend)), gy(satW(Math.min(T, Tend))));
    ctx.lineTo(gx(Tend), gy(0)); ctx.closePath(); ctx.fill();
    // 곡선 위: 넘치면 응결
    g = ctx.createLinearGradient(0, GP.y, 0, GP.y + GP.h);
    g.addColorStop(0, 'rgba(242,107,58,.13)'); g.addColorStop(1, 'rgba(242,107,58,.03)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(gx(0), GP.y);
    ctx.lineTo(gx(0), gy(satW(0)));
    for (let T = 0; T <= Tend + 0.01; T += 0.5) ctx.lineTo(gx(Math.min(T, Tend)), gy(satW(Math.min(T, Tend))));
    ctx.lineTo(gx(Tend), GP.y); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawGraphBase() {
    const R = L.graph, a = clamp(S.tr, 0, 1);
    panel(R.x, R.y, R.w, R.h, 16, '#fff');
    text(R.x + 14, R.y + (PHONE ? 22 : 28), '포화 수증기량 곡선', { size: PHONE ? 15 : 16, weight: 800, align: 'left', color: COL.ink });
    text(R.x + R.w - 12, R.y + (PHONE ? 22 : 28), PHONE ? '오른쪽: 포화 수증기압' : '오른쪽 눈금: 포화 수증기압', { size: 12.5, weight: 700, align: 'right', color: '#b45309' });
    const pr = clamp(G.curve, 0, 1);
    curveFill(pr);
    // 눈금선
    ctx.save();
    ctx.strokeStyle = 'rgba(93,104,121,.16)'; ctx.lineWidth = 1;
    for (let w = 0; w <= WMAX; w += 10) { ctx.beginPath(); ctx.moveTo(GP.x, gy(w)); ctx.lineTo(GP.x + GP.w, gy(w)); ctx.stroke(); }
    for (let T = 0; T <= TMAX; T += 5) { ctx.beginPath(); ctx.moveTo(gx(T), GP.y); ctx.lineTo(gx(T), GP.y + GP.h); ctx.stroke(); }
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(GP.x, GP.y); ctx.lineTo(GP.x, GP.y + GP.h); ctx.lineTo(GP.x + GP.w, GP.y + GP.h); ctx.moveTo(GP.x + GP.w, GP.y); ctx.lineTo(GP.x + GP.w, GP.y + GP.h); ctx.stroke();
    ctx.restore();
    const fs = 13;
    for (let w = 0; w <= WMAX; w += 10) text(GP.x - 7, gy(w) + 4.5, String(w), { size: fs, weight: 700, align: 'right', color: COL.muted });
    for (let T = 0; T <= TMAX; T += 5) text(gx(T), GP.y + GP.h + 17, String(T), { size: fs, weight: 700, color: COL.muted });
    for (let e = 0; e <= 60; e += 20) { const w = wOfP(e); if (w <= WMAX) { text(GP.x + GP.w + 7, gy(w) + 4.5, String(e), { size: fs, weight: 700, align: 'left', color: '#b45309' }); } }
    text(GP.x - 4, GP.y - 11, 'g/kg', { size: fs, weight: 800, align: 'right', color: COL.skyD });
    text(GP.x + GP.w + 4, GP.y - 11, 'hPa', { size: fs, weight: 800, align: 'left', color: '#b45309' });
    text(GP.x + GP.w / 2, GP.y + GP.h + (PHONE ? 31 : 36), '기온 (°C)', { size: fs, weight: 800, color: COL.muted });
    // 영역 이름
    if (pr > 0.9) {
      text(gx(0.6), gy(PHONE ? 38 : 37), '넘치면 물방울(응결)', { size: fs, weight: 800, align: 'left', color: 'rgba(200,80,30,.9)' });
      text(gx(34.4), gy(PHONE ? 7 : 7), '수증기로 있어요', { size: fs, weight: 800, align: 'right', color: 'rgba(3,105,161,.9)' });
    }
    // 곡선 (왼쪽부터 그려짐)
    const Tend = TMAX * pr;
    if (pr > 0.01) {
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 7; ctx.beginPath();
      for (let T = 0; T <= Tend + 0.01; T += 0.5) { const t = Math.min(T, Tend); T === 0 ? ctx.moveTo(gx(t), gy(satW(t))) : ctx.lineTo(gx(t), gy(satW(t))); }
      ctx.stroke();
      ctx.strokeStyle = COL.sky; ctx.lineWidth = 4; ctx.beginPath();
      for (let T = 0; T <= Tend + 0.01; T += 0.5) { const t = Math.min(T, Tend); T === 0 ? ctx.moveTo(gx(t), gy(satW(t))) : ctx.lineTo(gx(t), gy(satW(t))); }
      ctx.stroke();
      ctx.restore();
    }
  }
  /* 그래프 위의 점 (입체감 있는 공 + 값 이름표) */
  function gdot(x, y, r, color, o) {
    o = o || {};
    if (o.pulse) D.glow(x, y, r * (2.6 + 0.4 * Math.sin(CLK.t * 6)), color, 0.45);
    D.sphere(x, y, r, color, { shadow: true, outline: '#fff', outlineWidth: 2 });
  }
  function gtag(x, y, s, o) {
    o = o || {};
    const R = L.graph, sz = o.size || 13;
    ctx.save(); ctx.font = D.font(sz, 800);
    const w = ctx.measureText(s).width + 16; ctx.restore();
    let lx = x + (o.dx || 0), ly = y + (o.dy || 0);
    lx = clamp(lx, R.x + 6 + w / 2, R.x + R.w - 6 - w / 2); ly = clamp(ly, R.y + 14, R.y + R.h - 12);
    D.label(lx, ly, s, { bg: o.bg || COL.skyD, color: o.color || '#fff', size: sz, border: o.border });
  }
  /* 점선 (축까지) */
  function guide(T, w, o) {
    o = o || {};
    D.dashedLine(gx(T), gy(w), gx(T), GP.y + GP.h, { color: o.color || 'rgba(3,105,161,.55)', width: 2, dash: [5, 5], offset: -CLK.t * 12 });
    if (o.h !== false) D.dashedLine(GP.x, gy(w), gx(T), gy(w), { color: o.color || 'rgba(3,105,161,.55)', width: 2, dash: [5, 5], offset: -CLK.t * 12 });
  }

  function graphBox() {
    const B = BOX;
    drawGraphBase();
    // 찍힌 점들
    B.recs.forEach((r) => {
      const s = ease.outBack(r.pop);
      ctx.save(); ctx.translate(gx(r.T), gy(r.w)); ctx.scale(s, s); ctx.translate(-gx(r.T), -gy(r.w));
      D.sphere(gx(r.T), gy(r.w), 6.5, COL.good, { shadow: true, outline: '#fff', outlineWidth: 2 });
      ctx.restore();
    });
    B.recs.forEach((r, i) => {
      const last = i === B.recs.length - 1;
      gtag(gx(r.T), gy(r.w), f1(r.w) + ' g/kg' + (last && !PHONE ? ' · ' + f1(r.p) + ' hPa' : ''), { dx: last && !PHONE ? -52 : -(PHONE ? 30 : 38), dy: -24, bg: 'rgba(20,160,88,.95)', size: 12 });
    });
    // 지금 용기 속 수증기량 (점)
    const w = B.wS, T = B.Tv, sat = satW(T);
    D.dashedLine(gx(T), gy(w), gx(T), gy(sat), { color: 'rgba(14,165,233,.7)', width: 3, dash: [3, 6] });
    D.dashedLine(gx(T), gy(sat), gx(T), GP.y + GP.h, { color: 'rgba(93,104,121,.35)', width: 1.5, dash: [4, 5] });
    if (!B.sat && sat - w > 1.5) gtag(gx(T), (gy(w) + gy(sat)) / 2, '더 품을 수 있어요', { dx: gx(T) > GP.x + GP.w * 0.6 ? -(PHONE ? 62 : 74) : (PHONE ? 62 : 74), size: 12, bg: 'rgba(14,165,233,.92)' });
    gdot(gx(T), gy(w), 8, B.sat ? COL.good : COL.sky, { pulse: B.sat });
    if (B.sat) {
      D.ring(gx(T), gy(sat), 15, CLK.t, { color: COL.good });
      gtag(gx(T), gy(sat), '포화! ' + f1(sat) + ' g/kg', { dx: gx(T) > GP.x + GP.w * 0.6 ? -(PHONE ? 66 : 78) : (PHONE ? 66 : 78), dy: -16, bg: COL.good });
    }
  }

  function graphCup() {
    const C = CUP;
    drawGraphBase();
    const w = C.wv, ex = excess();
    // 방 안 공기의 수증기량 (수평선)
    D.dashedLine(GP.x, gy(w), GP.x + GP.w, gy(w), { color: 'rgba(14,165,233,.9)', width: 2.5, dash: [8, 6], offset: -CLK.t * 16 });
    text(GP.x + 6, gy(w) + 17, '공기 속 수증기량 ' + f1(w) + ' g/kg', { size: PHONE ? 12 : 13, weight: 800, align: 'left', color: COL.skyD });
    gdot(gx(AIRT), gy(w), 7.5, COL.sky);
    text(gx(AIRT), gy(w) + 24, '방 공기 ' + AIRT + ' °C', { size: PHONE ? 12 : 13, weight: 800, color: COL.skyD });
    // 컵 표면 온도에 해당하는 곡선 위의 점 (점이 이동해요)
    const cT = C.cupTv, sT = satW(cT);
    const hot = ex > 0.02;
    D.dashedLine(gx(cT), gy(sT), gx(cT), GP.y + GP.h, { color: hot ? 'rgba(242,107,58,.6)' : 'rgba(93,104,121,.4)', width: 2, dash: [4, 5] });
    gdot(gx(cT), gy(sT), 8, hot ? COL.warm : '#6b7a90', { pulse: hot });
    gtag(gx(cT), gy(sT), '컵 표면 ' + f1(cT) + ' °C', { dx: -(PHONE ? 4 : 6), dy: PHONE ? 20 : 24, bg: hot ? COL.warm : '#5d6879', size: PHONE ? 12 : 13 });
    // 이슬점 읽기: 점선을 따라 끌 수 있는 점
    if (C.showLine) {
      const dm = C.dm, dew = dewOf(AIRW[C.air]);
      const x = gx(dm.T), y = gy(AIRW[C.air]);
      if (C.found[C.air]) {
        D.dashedLine(x, y, x, GP.y + GP.h, { color: COL.good, width: 2.5, dash: [5, 4] });
        D.arrow(x, GP.y + GP.h - 26, x, GP.y + GP.h - 2, { color: COL.good, width: 3, head: 10 });
        gdot(x, y, 9, COL.good);
        gtag(x, y, '이슬점 ' + f1(dew) + ' °C', { dx: PHONE ? -50 : -64, dy: -22, bg: COL.good });
      } else {
        if (dm.drag || dm.hover) {
          D.dashedLine(x, y, x, gy(satW(dm.T)), { color: 'rgba(242,107,58,.8)', width: 2.5, dash: [4, 4] });
          gdot(x, gy(satW(dm.T)), 4.5, COL.warm);
          gtag(x, gy(satW(dm.T)), dm.T.toFixed(1) + ' °C → 포화 ' + f1(satW(dm.T)) + ' g/kg', { dx: 0, dy: 22, bg: '#5d6879', size: 12 });
        } else D.ring(x, y, 17, CLK.t, { color: COL.warm });
        gdot(x, y, 9, COL.warm, { pulse: true });
        text(x, y + 4.5, '?', { size: 13, weight: 800, color: '#fff' });
        if (!dm.drag && Math.abs(dm.T - AIRT) < 0.5) gtag(x, y, '← 끌어 보세요', { dx: PHONE ? -40 : -62, dy: -22, bg: COL.warm, size: 12 });
      }
    }
  }

  function graphRH() {
    const R = RHS;
    if (R.view === 'day') { graphDay(); return; }
    drawGraphBase();
    const T = R.Tv, w = R.wv, sat = satW(T), over = w > sat + 0.05;
    const px = gx(T), py = gy(Math.min(w, WMAX));
    if (R.mode === 'app') {
      D.dashedLine(GP.x, gy(R.w), px, gy(R.w), { color: 'rgba(14,165,233,.85)', width: 2.5, dash: [8, 6], offset: -CLK.t * 16 });
      text(GP.x + 6, gy(R.w) - 8, '수증기량 ' + f1(R.w) + ' g/kg', { size: 13, weight: 800, align: 'left', color: COL.skyD });
      const dew = dewOf(R.w);
      D.dashedLine(gx(dew), gy(R.w), gx(dew), GP.y + GP.h, { color: 'rgba(242,107,58,.7)', width: 2, dash: [4, 5] });
      text(gx(dew), GP.y + GP.h - 8, '이슬점 ' + f1(dew), { size: 12, weight: 800, color: '#c2410c' });
    }
    if (over) {                                                  // 넘친 만큼 응결
      D.arrow(px, gy(sat) - 3, px, gy(w) + 3, { color: COL.warm, width: 4, head: 10 });
      gtag(px, (gy(sat) + gy(w)) / 2, '응결 ' + f1(w - sat) + ' g/kg', { dx: px > GP.x + GP.w * 0.6 ? -(PHONE ? 52 : 62) : (PHONE ? 52 : 62), bg: COL.warm, size: 13 });
    } else {
      D.dashedLine(px, py, px, gy(sat), { color: 'rgba(14,165,233,.75)', width: 3, dash: [3, 6] });
    }
    D.dashedLine(px, gy(sat), px, GP.y + GP.h, { color: 'rgba(93,104,121,.35)', width: 1.5, dash: [4, 5] });
    if (!over && R.mode === 'rh') D.dashedLine(GP.x, py, px, py, { color: 'rgba(14,165,233,.5)', width: 1.5, dash: [4, 5] });
    gdot(px, py, 8.5, over ? COL.warm : COL.sky, { pulse: over });
    D.ring(px, gy(sat), 5, 0, { color: '#6b7a90', width: 2 });
    if (R.mode === 'rh') {
      const rh = clamp(R.w / satW(R.T), 0, 1) * 100;
      gtag(px, py, '상대 습도 ' + Math.round(rh) + ' %', { dx: px > GP.x + GP.w * 0.62 ? -(PHONE ? 66 : 78) : (PHONE ? 66 : 78), dy: py < GP.y + 24 ? 20 : -20, bg: COL.skyD, size: 13 });
    }
  }

  function graphDay() {
    const R = L.graph, Q = RHS;
    panel(R.x, R.y, R.w, R.h, 16, '#fff');
    text(R.x + 14, R.y + (PHONE ? 22 : 28), PHONE ? '맑은 날 하루' : '맑은 날 하루 동안', { size: PHONE ? 15 : 16, weight: 800, align: 'left', color: COL.ink });
    text(R.x + R.w - 12, R.y + (PHONE ? 22 : 28), '수증기량 ' + DAYW + ' g/kg 그대로', { size: 12.5, weight: 700, align: 'right', color: COL.muted });
    const P = { x: R.x + 46, y: R.y + (PHONE ? 52 : 66), w: R.w - 46 - 46, h: R.h - (PHONE ? 52 : 66) - (PHONE ? 36 : 50) };
    const X = (h) => P.x + (h / 24) * P.w, YT = (t) => P.y + P.h - ((t - 8) / 22) * P.h, YR = (r) => P.y + P.h - (r / 100) * P.h;
    ctx.save();
    ctx.strokeStyle = 'rgba(93,104,121,.16)'; ctx.lineWidth = 1;
    for (let r = 0; r <= 100; r += 20) { ctx.beginPath(); ctx.moveTo(P.x, YR(r)); ctx.lineTo(P.x + P.w, YR(r)); ctx.stroke(); }
    for (let h = 0; h <= 24; h += 6) { ctx.beginPath(); ctx.moveTo(X(h), P.y); ctx.lineTo(X(h), P.y + P.h); ctx.stroke(); }
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, P.y + P.h); ctx.lineTo(P.x + P.w, P.y + P.h); ctx.moveTo(P.x + P.w, P.y); ctx.lineTo(P.x + P.w, P.y + P.h); ctx.stroke();
    ctx.restore();
    for (let r = 0; r <= 100; r += 20) text(P.x - 6, YR(r) + 4.5, String(r), { size: 13, weight: 700, align: 'right', color: COL.skyD });
    for (let t = 10; t <= 30; t += 10) text(P.x + P.w + 6, YT(t) + 4.5, String(t), { size: 13, weight: 700, align: 'left', color: '#c2410c' });
    for (let h = 0; h <= 24; h += 6) text(X(h), P.y + P.h + 17, h + '시', { size: 13, weight: 700, color: COL.muted });
    text(P.x - 4, P.y - 10, '습도 %', { size: 13, weight: 800, align: 'right', color: COL.skyD });
    text(P.x + P.w + 4, P.y - 10, '기온 °C', { size: 13, weight: 800, align: 'left', color: '#c2410c' });
    const path = (fy, fx, t1) => { ctx.beginPath(); for (let h = 0; h <= t1 + 0.001; h += 0.25) { const hh = Math.min(h, t1); h === 0 ? ctx.moveTo(X(hh), fy(hh)) : ctx.lineTo(X(hh), fy(hh)); } ctx.stroke(); };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.setLineDash([4, 6]); ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(242,107,58,.35)'; path((h) => YT(dayT(h)), null, 24);
    ctx.strokeStyle = 'rgba(14,165,233,.4)'; path((h) => YR(dayRH(h)), null, 24);
    ctx.setLineDash([]); ctx.lineWidth = 4;
    ctx.strokeStyle = '#f26b3a'; path((h) => YT(dayT(h)), null, Q.day.t);
    ctx.strokeStyle = '#0ea5e9'; path((h) => YR(dayRH(h)), null, Q.day.t);
    ctx.restore();
    const hh = Q.day.t;
    D.dashedLine(X(hh), P.y, X(hh), P.y + P.h, { color: 'rgba(27,35,51,.35)', width: 1.5, dash: [3, 4] });
    D.sphere(X(hh), YT(dayT(hh)), 6.5, '#f26b3a', { shadow: true, outline: '#fff' });
    D.sphere(X(hh), YR(dayRH(hh)), 6.5, '#0ea5e9', { shadow: true, outline: '#fff' });
    if (Q.day.t > 0) {
      const clock = String(Math.floor(hh)).padStart(2, '0') + ':' + String(Math.floor((hh % 1) * 60)).padStart(2, '0');
      D.label(P.x + P.w / 2, P.y + 14, '🕒 ' + clock, { bg: '#1b2333', size: 14 });
    }
    if (Q.day.done) {
      D.label(X(14.5), YT(26) - 18, '기온 최고 → 습도 최저', { bg: COL.warm, size: 13 });
      D.label(X(5), YR(dayRH(5)) - 20, '기온 최저 → 습도 높음', { bg: COL.skyD, size: 13, align: 'left' });
    }
  }

  /* =========================================================
     장면 그리기
     ========================================================= */
  function sceneBg() {
    const s = L.scene;
    panel(s.x, s.y, s.w, s.h, 16, '#fff');
  }
  function sceneTitle(str) {
    const s = L.scene;
    D.label(s.x + 12, s.y + (PHONE ? 22 : 26), str, { align: 'left', bg: COL.skyD, size: PHONE ? 13 : 14 });
  }

  /* ① 밀폐 용기 */
  function drawBox() {
    const B = BOX, s = L.scene;
    sceneBg();
    sceneTitle('🔍 입자 모형');
    D.label(s.x + s.w - 12, s.y + (PHONE ? 22 : 26), '🔒 밀폐 용기', { align: 'right', bg: '#e8eef6', color: COL.muted, size: PHONE ? 13 : 14 });
    // 가열판 (온도에 따라 색과 빛이 변해요)
    const tf = clamp(B.Tv / 35, 0, 1), plateY = BX.y + BX.h + 4;
    D.glow(BX.x + BX.w / 2, plateY + 10, BX.w * 0.62, mix('#8ec9ff', '#ff8a3d', tf), 0.1 + 0.4 * tf);
    ctx.save();
    const pg = ctx.createLinearGradient(0, plateY, 0, plateY + 16);
    pg.addColorStop(0, mix('#a8c6e8', '#ff9a4d', tf)); pg.addColorStop(1, mix('#6f8fb5', '#d9561a', tf));
    ctx.fillStyle = pg; D.roundRect(BX.x - 10, plateY, BX.w + 20, 16, 8); ctx.fill();
    ctx.restore();
    text(BX.x + BX.w / 2, plateY + 12, (tf < 0.3 ? '❄️ ' : tf > 0.6 ? '🔥 ' : '') + '물의 온도 ' + Math.round(B.Tv) + ' °C', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
    // 용기 안
    ctx.save();
    D.roundRect(BX.x, BX.y, BX.w, BX.h, 12); ctx.clip();
    const bg = ctx.createLinearGradient(0, BX.y, 0, SURF);
    bg.addColorStop(0, '#f4faff'); bg.addColorStop(1, '#e3f1fd');
    ctx.fillStyle = bg; ctx.fillRect(BX.x, BX.y, BX.w, BX.h);
    // 물
    const wg = ctx.createLinearGradient(0, SURF, 0, BX.y + BX.h);
    wg.addColorStop(0, 'rgba(107,182,245,.55)'); wg.addColorStop(1, 'rgba(46,120,204,.7)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(BX.x, BX.y + BX.h);
    for (let i = 0; i <= 28; i++) ctx.lineTo(BX.x + (BX.w * i) / 28, SURF + Math.sin(CLK.t * 2.2 + i * 0.6) * 1.6);
    ctx.lineTo(BX.x + BX.w, BX.y + BX.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(BX.x, SURF - 1, BX.w, 2.5);
    const amp = 0.6 + 2.4 * tf;
    B.liq.forEach((m) => drawMol(m.x + Math.sin(CLK.t * 2.3 * m.f + m.ph) * amp, m.y + Math.cos(CLK.t * 2 * m.f + m.ph * 1.3) * amp, RV, m.rot + Math.sin(CLK.t * m.f + m.ph) * 0.4, 0.92, 'liq'));
    // 물결 (증발·응결 자리)
    B.rip.forEach((r) => { const k = r.t / 0.7; ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, SURF + 1, 4 + k * 16, 1.5 + k * 3.5, 0, 0, TAU); ctx.stroke(); });
    // 수증기 분자
    B.vap.forEach((p) => drawMol(p.x, p.y, RV, p.rot, p.st === 'back' ? 1 : 1, 'v', ease.outBack(p.s)));
    ctx.restore();
    // 유리와 뚜껑
    ctx.save();
    ctx.strokeStyle = COL.glass; ctx.lineWidth = 3.5; D.roundRect(BX.x, BX.y, BX.w, BX.h, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(BX.x + 9, BX.y + 18); ctx.lineTo(BX.x + 9, BX.y + BX.h * 0.55); ctx.stroke();
    const lg = ctx.createLinearGradient(0, BX.y - 14, 0, BX.y + 4);
    lg.addColorStop(0, '#c5d0de'); lg.addColorStop(1, '#8e9db3');
    ctx.fillStyle = lg; D.roundRect(BX.x - 5, BX.y - 13, BX.w + 10, 16, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(BX.x + 4, BX.y - 10); ctx.lineTo(BX.x + BX.w - 4, BX.y - 10); ctx.stroke();
    ctx.restore();
    // 포화 순간의 반짝임
    if (B.flash > 0) { ctx.save(); ctx.globalAlpha = B.flash * 0.35; ctx.fillStyle = '#b7f0cf'; D.roundRect(BX.x, BX.y, BX.w, BX.h, 12); ctx.fill(); ctx.restore(); }
    // 증발 ↑ · 응결 ↓ 화살표 칩
    const cy = plateY + 16 + (PHONE ? 30 : 36), cw = PHONE ? 134 : 146, ch = PHONE ? 38 : 42;
    const chip = (cx, up, n, label) => {
      const wdt = 2.5 + n * (PHONE ? 0.1 : 0.12);
      ctx.save();
      ctx.fillStyle = up ? 'rgba(242,107,58,.12)' : 'rgba(47,125,225,.12)'; D.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 12); ctx.fill();
      ctx.strokeStyle = up ? 'rgba(242,107,58,.5)' : 'rgba(47,125,225,.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      D.arrow(cx - cw / 2 + 22, up ? cy + 14 : cy - 14, cx - cw / 2 + 22, up ? cy - 14 : cy + 14, { color: up ? COL.warm : COL.cold, width: Math.min(8, wdt), head: Math.max(10, Math.min(8, wdt) * 2.2) });
      text(cx - cw / 2 + 40, cy - 3, label, { size: 13, weight: 800, align: 'left', color: COL.ink });
      text(cx - cw / 2 + 40, cy + 14, Math.round(n) + '개/초', { size: 14, weight: 800, align: 'left', color: up ? '#c2410c' : '#1d4ed8' });
    };
    chip(BX.x + BX.w / 2 - cw / 2 - 18, true, B.evS, '증발');
    chip(BX.x + BX.w / 2 + cw / 2 + 18, false, B.coS, '응결');
    if (B.sat) {
      const a = 0.8 + 0.2 * Math.sin(CLK.t * 5);
      D.label(BX.x + BX.w / 2, cy, '=', { bg: rgba(COL.good, a), size: 18, pad: 10 });
      D.label(BX.x + BX.w / 2, cy + ch / 2 + 12, '포화 상태', { bg: COL.good, size: 13 });
    }
  }

  /* ② 금속 컵 */
  function cupBodyPath(inset) {
    const g = CG, ins = inset || 0;
    ctx.beginPath(); ctx.moveTo(g.x + ins, g.y);
    ctx.lineTo(g.x + g.cw - ins, g.y); ctx.lineTo(g.x + g.cw - ins, g.base - 10); ctx.quadraticCurveTo(g.x + g.cw - ins, g.base, g.x + g.cw - 12, g.base);
    ctx.lineTo(g.x + 12, g.base); ctx.quadraticCurveTo(g.x + ins, g.base, g.x + ins, g.base - 10); ctx.closePath();
  }
  function drawCup() {
    const C = CUP, g = CG, s = L.scene, ex = excess();
    sceneBg();
    ctx.save();
    D.roundRect(s.x, s.y, s.w, s.h, 16); ctx.clip();
    const wg = ctx.createLinearGradient(0, s.y, 0, g.base);
    wg.addColorStop(0, '#f3f9ff'); wg.addColorStop(1, '#e2effa');
    ctx.fillStyle = wg; ctx.fillRect(s.x, s.y, s.w, s.h);
    // 탁자
    const tg = ctx.createLinearGradient(0, g.base, 0, s.y + s.h);
    tg.addColorStop(0, '#d8c09b'); tg.addColorStop(1, '#b99a6c');
    ctx.fillStyle = tg; ctx.fillRect(s.x, g.base, s.w, s.y + s.h - g.base);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(s.x, g.base, s.w, 3);
    // 방 공기 속 수증기 (장식)
    C.vapor.forEach((p) => { if (p.a > 0.02) drawMol(p.x, p.y, 4.2, p.rot + CLK.t * 0.4, 0.5 * p.a, 'v'); });
    contactShadow(g.cx + 6, g.base + 6, g.cw * 0.62, 10, 1);
    if (C.puddle > 0.02) { ctx.fillStyle = 'rgba(150,200,240,' + (0.55 * Math.min(1, C.puddle * 3)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(g.cx, g.base + 7, g.cw * (0.5 + 0.35 * C.puddle), 5 + 4 * C.puddle, 0, 0, TAU); ctx.fill(); }
    // 컵 몸통 (은색 금속)
    const cold = clamp((AIRT - C.cupTv) / 20, 0, 1);
    cupBodyPath();
    const mg = ctx.createLinearGradient(g.x, 0, g.x + g.cw, 0);
    mg.addColorStop(0, mix('#a5b0bf', '#8fb5dc', cold)); mg.addColorStop(0.2, '#f5f8fb'); mg.addColorStop(0.5, mix('#cdd5e0', '#bcd6ee', cold)); mg.addColorStop(0.82, mix('#8996a8', '#7aa0c8', cold)); mg.addColorStop(1, mix('#b4bfcd', '#9ec0e0', cold));
    ctx.fillStyle = mg; ctx.fill();
    // 윗면: 테두리와 얼음물
    const rx = g.cw / 2, ry = g.rim;
    ctx.fillStyle = '#dfe6ef'; ctx.beginPath(); ctx.ellipse(g.cx, g.y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#566277'; ctx.beginPath(); ctx.ellipse(g.cx, g.y, rx - 5, ry - 3, 0, 0, TAU); ctx.fill();
    const wtr = ctx.createLinearGradient(0, g.y - ry, 0, g.y + ry);
    wtr.addColorStop(0, '#bfe3fb'); wtr.addColorStop(1, '#5aaeea');
    ctx.fillStyle = wtr; ctx.beginPath(); ctx.ellipse(g.cx, g.y + 1, rx - 7, ry - 4.5, 0, 0, TAU); ctx.fill();
    C.cubes.forEach((c) => {
      const bob = Math.sin(CLK.t * 1.6 + c.ph) * 1.2, cs = (PHONE ? 15 : 19);
      ctx.save(); ctx.translate(g.cx + c.dx, g.y - 3 + c.y + bob); ctx.rotate(c.rot);
      softShadow(-cs / 2, -cs / 2, cs, cs, 4, 6, 3, 'rgba(20,60,110,.3)');
      const ig = ctx.createLinearGradient(-cs / 2, -cs / 2, cs / 2, cs / 2);
      ig.addColorStop(0, 'rgba(255,255,255,.96)'); ig.addColorStop(1, 'rgba(176,222,250,.92)');
      ctx.fillStyle = ig; D.roundRect(-cs / 2, -cs / 2, cs, cs, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(120,180,230,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-cs / 2 + 3, -cs / 2 + 3, cs * 0.35, 2.5);
      ctx.restore();
    });
    // 맺힌 물방울과 뿌연 막
    ctx.save(); cupBodyPath(); ctx.clip();
    if (C.film > 0.01) {
      const fg = ctx.createLinearGradient(0, g.y, 0, g.base);
      fg.addColorStop(0, 'rgba(255,255,255,' + (0.5 * C.film).toFixed(2) + ')'); fg.addColorStop(1, 'rgba(235,245,255,' + (0.62 * C.film).toFixed(2) + ')');
      ctx.fillStyle = fg; ctx.fillRect(g.x, g.y, g.cw, g.ch);
    }
    C.drops.forEach((d) => {
      const x = g.x + 4 + d.u * (g.cw - 8), y = g.y + 6 + d.v * (g.ch - 14);
      if (d.slide && d.trail > 0.01) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1.5, d.r * 0.6); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - d.trail * (g.ch - 14)); ctx.lineTo(x, y); ctx.stroke(); }
      if (d.r < 0.3) return;
      ctx.fillStyle = 'rgba(160,210,248,.72)'; ctx.beginPath(); ctx.arc(x, y, d.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(x - d.r * 0.35, y - d.r * 0.4, Math.max(0.8, d.r * 0.3), 0, TAU); ctx.fill();
    });
    ctx.restore();
    // 반사광
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(g.x + 14, g.y + 12, 7, g.ch - 34);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(g.cx, g.y, rx, ry, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(95,110,135,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(g.cx, g.y, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    // 정보 이름표
    D.label(s.x + 12, s.y + (PHONE ? 22 : 26), '방 안 ' + AIRT + ' °C · ' + (C.air === 'humid' ? '습한 공기' : '건조한 공기'), { align: 'left', bg: COL.skyD, size: PHONE ? 13 : 14 });
    const tx = g.cx, ty = g.y - 34 - ry;
    D.label(tx, ty, '컵 표면 ' + f1(C.cupTv) + ' °C', { bg: ex > 0.02 ? COL.warm : '#4b5a70', size: PHONE ? 14 : 15, pad: 10 });
    if (C.dewRec[C.air] != null) D.label(tx, ty + 30, '💧 이슬점 ' + f1(C.dewRec[C.air]) + ' °C', { bg: COL.good, size: 13 });
    drawInset(ex);
    // 돋보기 연결선
    const spotX = g.x + g.cw - 7, spotY = g.y + g.ch * 0.42;
    ctx.save();
    ctx.strokeStyle = 'rgba(3,105,161,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    const ang = Math.atan2(INS.y - spotY, INS.x - spotX);
    ctx.beginPath(); ctx.moveTo(spotX + 8, spotY - 2); ctx.lineTo(INS.x - Math.cos(ang) * INS.R, INS.y - Math.sin(ang) * INS.R); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(14,165,233,.15)'; ctx.strokeStyle = COL.sky; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(spotX, spotY, 9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawInset(ex) {
    const C = CUP, I = INS, wallX = I.x - I.R * 0.45, r = RV * 0.9 * (PHONE ? 0.95 : 1.05);
    ctx.save();
    ctx.shadowColor = 'rgba(20,50,100,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(I.x, I.y, I.R + 3, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(I.x, I.y, I.R, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(I.x + I.R * 0.2, I.y - I.R * 0.2, 4, I.x, I.y, I.R);
    bg.addColorStop(0, '#fbfeff'); bg.addColorStop(1, '#dcecf9');
    ctx.fillStyle = bg; ctx.fillRect(I.x - I.R, I.y - I.R, I.R * 2, I.R * 2);
    const cold = clamp((AIRT - C.cupTv) / 20, 0, 1);
    ctx.fillStyle = mix('#9aa6b6', '#7fb2e0', cold); ctx.fillRect(I.x - I.R, I.y - I.R, wallX - (I.x - I.R), I.R * 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(wallX - 9, I.y - I.R, 5, I.R * 2);
    // 벽에 쌓인 물(이슬)
    if (C.filmT > 0.3) {
      const fg = ctx.createLinearGradient(wallX, 0, wallX + C.filmT, 0);
      fg.addColorStop(0, 'rgba(70,150,230,.85)'); fg.addColorStop(1, 'rgba(150,205,250,.75)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(wallX, I.y - I.R);
      for (let i = 0; i <= 14; i++) { const yy = I.y - I.R + (I.R * 2 * i) / 14; ctx.lineTo(wallX + C.filmT + Math.sin(CLK.t * 2.4 + i * 0.9) * 1.8, yy); }
      ctx.lineTo(wallX, I.y + I.R); ctx.closePath(); ctx.fill();
    }
    C.ins.forEach((m) => { if (m.on) drawMol(m.x, m.y, r, m.rot, 1, 'v'); });
    ctx.restore();
    ctx.strokeStyle = COL.sky; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(I.x, I.y, I.R, 0, TAU); ctx.stroke();
    D.label(I.x, I.y + I.R + 15, '🔍 컵 표면 확대', { bg: COL.skyD, size: 13 });
  }

  /* ③④ 칸 모형 */
  function drawSlots() {
    const R = RHS, s = L.scene;
    sceneBg();
    sceneTitle(R.mode === 'app' ? '🔍 공기 덩어리 모형' : '🔍 칸 모형');
    // 칸 틀
    ctx.save();
    const nSlotsF = R.slotsF;
    for (let i = 0; i < COLS * ROWS; i++) {
      const a = clamp(nSlotsF - i + 0.5, 0, 1);
      if (a < 0.02) continue;
      const p = slotPos(i);
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(14,165,233,.55)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
      D.roundRect(p.x - CELL / 2 + 2, p.y - CELL / 2 + 2, CELL - 4, CELL - 4, 6);
      ctx.fillStyle = 'rgba(14,165,233,.07)'; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    if (!PHONE || true) {
      const lx = SG.x0 + 6, ly = SG.y0 + 10;
      drawMol(lx + 8, ly, CELL * 0.26, 0, 1, 'v');
      text(lx + 22, ly + 5, '수증기 분자', { size: 13, weight: 700, align: 'left', color: COL.muted });
      ctx.save(); ctx.strokeStyle = 'rgba(14,165,233,.7)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; D.roundRect(lx + 1, ly + 18, 14, 14, 4); ctx.fillStyle = 'rgba(14,165,233,.1)'; ctx.fill(); ctx.stroke(); ctx.restore();
      text(lx + 22, ly + 30, '품을 수 있는 칸', { size: 13, weight: 700, align: 'left', color: COL.muted });
    }
    // 응결수 (바닥)
    const py = SG.poolY, ph = SG.poolH;
    ctx.save();
    D.roundRect(SG.x0 - 4, py - 2, SG.w + 8, ph, 8); ctx.fillStyle = 'rgba(93,104,121,.07)'; ctx.fill();
    if (R.pool > 0.3) {
      ctx.beginPath(); ctx.moveTo(SG.x0 - 4, py + ph - 2);
      for (let i = 0; i <= 24; i++) ctx.lineTo(SG.x0 - 4 + ((SG.w + 8) * i) / 24, py + ph - 2 - R.pool + Math.sin(CLK.t * 2.4 + i * 0.7) * 1.2);
      ctx.lineTo(SG.x0 + SG.w + 4, py + ph - 2); ctx.closePath();
      const wg = ctx.createLinearGradient(0, py, 0, py + ph); wg.addColorStop(0, 'rgba(110,185,245,.85)'); wg.addColorStop(1, 'rgba(46,120,204,.9)');
      ctx.fillStyle = wg; ctx.fill();
    }
    ctx.restore();
    if (R.pool > 3) text(SG.x0 + SG.w / 2, py + ph / 2 + 5, '응결한 물방울', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(30,80,150,.5)', strokeWidth: 3 });
    else text(SG.x0 + SG.w / 2, py + ph / 2 + 4, '물방울이 고이는 곳', { size: 12.5, weight: 700, color: 'rgba(93,104,121,.55)' });
    // 분자
    const rr = CELL * 0.33;
    R.mols.forEach((m) => {
      if (m.s < 0.03) return;
      if (m.drop && m.arrived) return;
      const j = m.drop ? 0 : 1.4;
      drawMol(m.x + Math.sin(CLK.t * 2.1 + m.ph) * j, m.y + Math.cos(CLK.t * 1.8 + m.ph) * j, rr, m.rot + Math.sin(CLK.t + m.ph) * 0.35, 1, m.drop ? 'liq' : 'v', ease.outBack(clamp(m.s, 0, 1)));
    });
    // 계기판 (바늘이 튕기며 움직여요)
    const rh = R.dial.value;
    D.dial(DIAL.x, DIAL.y, DIAL.r, clamp(rh, 0, 100), 0, 100, { ticks: 5, color: rh > 99.5 ? COL.good : COL.sky });
    text(DIAL.x, DIAL.y + DIAL.r + 28, Math.round(clamp(R.w / satW(R.T), 0, 1) * 100) + ' %', { size: 24, weight: 800, color: COL.skyD });
    // 온도계
    const tx = DIAL.x + (PHONE ? 0 : 0), ty = DIAL.y + DIAL.r + 40;
    if (!PHONE) {
      D.thermometer(DIAL.x - 22, ty + 6, 76, clamp(R.Tv, 0, 35), 0, 35, { color: COL.warm, step: 10, unit: '°' });
      text(DIAL.x - 22, ty + 124, Math.round(R.Tv) + ' °C', { size: 15, weight: 800, color: COL.warm });
    } else {
      D.label(DIAL.x, DIAL.y + DIAL.r + 58, '🌡️ ' + Math.round(R.Tv) + ' °C', { bg: COL.warm, size: 13 });
    }
    // 설명 글
    const nS = Math.round(R.slotsF), nM = Math.min(COLS * ROWS, Math.round(R.wv * K));
    if (!PHONE) {
      text(s.x + s.w / 2, SG.poolY + SG.poolH + 22, '칸 ' + nS + '개 중 ' + Math.min(nM, nS) + '개 채움', { size: 15, weight: 800, color: COL.ink });
      text(s.x + s.w / 2, SG.poolY + SG.poolH + 41, '= 수증기량 ÷ 포화 수증기량 × 100', { size: 13, weight: 700, color: COL.muted });
    }
  }

  /* 막대 (아래쪽): 현재 수증기량 · 포화 수증기량 · 상대 습도 */
  function barTargets() {
    if (S.scene === 'box') return { w: BOX.wS, sat: satW(BOX.Tv), lw: '공기 속 수증기량', ls: '포화 수증기량 (이 온도)', head: '포화에 가까운 정도' };
    if (S.scene === 'cup') return { w: CUP.wv, sat: satW(CUP.cupTv), lw: '공기 속 수증기량', ls: '포화량 (컵 표면 온도)', head: '컵 표면 공기의 포화 정도' };
    return { w: RHS.wv, sat: satW(RHS.Tv), lw: '현재 수증기량', ls: '포화 수증기량 (이 기온)', head: '상대 습도' };
  }
  function drawBars(dt) {
    const R = L.bars, t = barTargets();
    BAR.w = appr(BAR.w, t.w, dt, 9); BAR.sat = appr(BAR.sat, t.sat, dt, 9);
    const rhRaw = BAR.sat > 0.05 ? BAR.w / BAR.sat : 0;
    const over = rhRaw > 1.001;
    BAR.rh = appr(BAR.rh, Math.min(1.0, rhRaw), dt, 9);
    panel(R.x, R.y, R.w, R.h, 16, '#fff');
    const bx = R.x + (PHONE ? 84 : 176), bw = PHONE ? 150 : 296, bh = PHONE ? 20 : 26;
    const y1 = R.y + (PHONE ? 14 : 26), y2 = R.y + (PHONE ? 44 : 66);
    const sc = bw / WMAX;
    const row = (y, label, val, fill, dashed) => {
      text(bx - 10, y + bh / 2 + 5, label, { size: PHONE ? 12.5 : 14, weight: 800, align: 'right', color: COL.ink });
      ctx.fillStyle = '#eef3f9'; D.roundRect(bx, y, bw, bh, bh / 2); ctx.fill();
      const wv = Math.max(bh * 0.7, val * sc);
      ctx.save(); D.roundRect(bx, y, bw, bh, bh / 2); ctx.clip();
      if (dashed) {
        ctx.fillStyle = 'rgba(14,165,233,.14)'; ctx.fillRect(bx, y, wv, bh);
        ctx.strokeStyle = 'rgba(14,165,233,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); D.roundRect(bx + 1, y + 1, wv - 2, bh - 2, bh / 2); ctx.stroke();
      } else {
        const g = ctx.createLinearGradient(bx, 0, bx + wv, 0); g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
        ctx.fillStyle = g; ctx.fillRect(bx, y, wv, bh);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx, y + 2, wv, 4);
      }
      ctx.restore();
      text(bx + bw + 8, y + bh / 2 + 5, f1(val) + ' g/kg', { size: PHONE ? 12.5 : 14, weight: 800, align: 'left', color: dashed ? COL.skyD : '#075985' });
    };
    row(y1, PHONE ? '수증기량' : t.lw, BAR.w, ['#38bdf8', '#0284c7'], false);
    row(y2, PHONE ? '포화량' : t.ls, BAR.sat, null, true);
    // 상대 습도 (막대 + 큰 숫자)
    const rx = R.x + (PHONE ? 292 : 598), rw = R.w - (rx - R.x) - (PHONE ? 14 : 22);
    text(rx, R.y + (PHONE ? 20 : 28), over && S.scene === 'cup' ? '넘친 만큼 응결 중' : PHONE ? (S.scene === 'rh' || S.scene === 'app' ? '상대 습도' : '포화 정도') : t.head, { size: PHONE ? 13 : 14, weight: 800, align: 'left', color: COL.muted });
    const pct = Math.round(clamp(rhRaw, 0, 9.99) * 100);
    text(rx, R.y + (PHONE ? 52 : 72), (over ? '100' : String(pct)) + ' %', { size: PHONE ? 26 : 34, weight: 800, align: 'left', color: over || pct >= 100 ? COL.good : COL.skyD });
    const rb = { x: rx, y: R.y + R.h - (PHONE ? 18 : 24), w: rw, h: PHONE ? 10 : 12 };
    ctx.fillStyle = '#eef3f9'; D.roundRect(rb.x, rb.y, rb.w, rb.h, rb.h / 2); ctx.fill();
    const fw = Math.max(rb.h, rb.w * clamp(BAR.rh, 0, 1));
    const g = ctx.createLinearGradient(rb.x, 0, rb.x + rb.w, 0); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, BAR.rh > 0.985 ? '#14a058' : '#0284c7');
    ctx.fillStyle = g; D.roundRect(rb.x, rb.y, fw, rb.h, rb.h / 2); ctx.fill();
    if (!PHONE && BAR.rh > 0.985 && S.scene === 'box') text(rx + 104, R.y + 72, '포화!', { size: 15, weight: 800, align: 'left', color: COL.good });
  }

  /* =========================================================
     읽기 값 (그림 아래 3칸)
     ========================================================= */
  const roCache = {};
  function ro(i, label, html) {
    if (roCache['l' + i] !== label) { $('#rl' + i).textContent = label; roCache['l' + i] = label; }
    if (roCache['v' + i] !== html) { $('#r' + i).innerHTML = html; roCache['v' + i] = html; }
  }
  const U = (n, u) => n + '<small>' + u + '</small>';
  function refreshReadouts() {
    if (S.scene === 'box') {
      const B = BOX, sat = satW(B.T);
      ro(1, '수증기량 (현재)', U(f1(B.wS), 'g/kg'));
      ro(2, '포화 수증기량 · ' + B.T + ' °C', U(f1(sat), 'g/kg') + ' <small>(' + f1(satP(B.T)) + ' hPa)</small>');
      ro(3, '포화 정도', U(Math.round(clamp(B.wS / sat, 0, 1) * 100), '%'));
    } else if (S.scene === 'cup') {
      const C = CUP, dr = C.dewRec[C.air];
      ro(1, '컵 표면 온도', U(f1(C.cupTv), '°C'));
      ro(2, '이슬점 (찾은 값)', dr != null ? U(f1(dr), '°C') : '<small>아직 몰라요</small>');
      ro(3, '공기 속 수증기량', U(f1(C.wv), 'g/kg'));
    } else if (S.scene === 'rh') {
      const R = RHS, sat = satW(R.T);
      ro(1, '기온', U(Math.round(R.Tv), '°C'));
      ro(2, '수증기량 / 포화', U(f1(R.w), '') + ' / ' + U(f1(sat), 'g/kg'));
      ro(3, '상대 습도', U(Math.round(clamp(R.w / sat, 0, 1) * 100), '%'));
    } else {
      const R = RHS, sat = satW(R.T);
      ro(1, '기온', U(Math.round(R.Tv), '°C'));
      ro(2, '응결량', U(f1(Math.max(0, R.w - sat)), 'g/kg'));
      ro(3, '상대 습도', U(Math.round(clamp(R.w / sat, 0, 1) * 100), '%'));
    }
  }

  /* =========================================================
     포인터 (이슬점 점 끌기)
     ========================================================= */
  const dmHit = (p) => {
    const C = CUP;
    if (S.scene !== 'cup' || !C.showLine || C.found[C.air]) return false;
    return Math.hypot(p.x - gx(C.dm.T), p.y - gy(AIRW[C.air])) < (PHONE ? 30 : 28);
  };
  SciSim.pointer(view, {
    down(p) { if (dmHit(p)) { CUP.dm.drag = true; CUP.dm.T = clamp(gT(p.x), 0, TMAX); Sound.click(); return true; } return false; },
    move(p) { CUP.dm.T = clamp(gT(p.x), 0, TMAX); CUP.dm.target = CUP.dm.T; },
    up() {
      const C = CUP, dm = C.dm, dew = dewOf(AIRW[C.air]);
      dm.drag = false;
      if (Math.abs(dm.T - dew) <= 1.0) {
        C.found[C.air] = true; dm.target = dew;
        celebrate(gx(dew), gy(AIRW[C.air]));
        toast('📈 이슬점 <b>' + f1(dew) + ' °C</b>를 찾았어요!', 'good', 2400);
      } else {
        toast('점선과 곡선이 만나는 곳을 찾아보세요 (지금 ' + dm.T.toFixed(1) + ' °C)', 'bad', 1800);
      }
    },
    hover(p) { CUP.dm.hover = dmHit(p); return CUP.dm.hover ? 'grab' : 'default'; },
  });

  /* =========================================================
     한 프레임
     ========================================================= */
  let lastDt = 1 / 60;
  function update(dt) {
    lastDt = dt;
    CLK.t += dt;
    if (S.scene === 'box') boxUpdate(dt);
    else if (S.scene === 'cup') cupUpdate(dt);
    else rhUpdate(dt);
    FX.update(dt);
  }
  function draw() {
    view.clear('#eaf4fd');
    const a = clamp(S.tr, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.75 * a;
    ctx.translate(0, (1 - a) * 12);
    if (S.scene === 'box') { drawBox(); graphBox(); }
    else if (S.scene === 'cup') { drawCup(); graphCup(); }
    else { drawSlots(); graphRH(); }
    drawBars(lastDt);
    ctx.restore();
    FX.draw(ctx);
    drawChecks(lastDt);
  }

  /* =========================================================
     미션 (4단계)
     ========================================================= */
  const chip = (ok, s) => (ok ? '✅ ' : '⬜ ') + s;
  const hasRec = (T) => BOX.recs.some((r) => r.T === T);
  const rhNow = () => clamp(RHS.w / satW(RHS.T), 0, 1) * 100;

  game = SciSim.game({
    simId: 'm3-humidity',
    mount: '#game',
    badge: '습도 박사',
    homeHref: '../../index.html#g3',
    featureLabels: {
      box: '🔍 밀폐 용기 입자 모형 · 포화 곡선',
      dew: '🧊 금속 컵 · 이슬점 찾기',
      rh: '💧 상대 습도 칸 모형 · 하루 변화',
      app: '🌿 공기를 식혀 응결량 구하기',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene && m.scene !== S.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '포화: 공기는 수증기를 얼마나 품을까?', short: '포화', icon: '📦', phase: '관찰',
        features: ['box'],
        intro: '<p class="si-q">❓ 탐구 질문: 차가운 컵 표면에 물방울이 맺히는 까닭은 무엇일까?</p>' +
          '<p>그 답을 찾으려면 먼저 <b>공기가 수증기를 얼마나 품을 수 있는지</b>부터 알아야 해요. 물이 담긴 <b>밀폐 용기</b> 속을 🔍 <b>입자 모형</b>으로 들여다봐요. 물 분자는 공기 속으로 날아가기만 할까요?</p>',
        setup() { setScene('box', true); },
        recap: '밀폐된 공기 속 수증기는 증발하는 분자 수와 응결하는 분자 수가 같아지면 더 늘지 않아요. 이 상태가 <b>포화</b>이고, 이때 공기 속 수증기량이 <b>포화 수증기량</b>이에요. 온도가 높을수록 포화 수증기량이 커요.',
        summary: '<ul><li>물 분자는 계속 <b>증발</b>해 수증기가 되고, 수증기도 <b>응결</b>해 물로 돌아가요.</li>' +
          '<li>증발하는 분자 수 = 응결하는 분자 수가 되면 수증기량이 더 늘지 않아요. 이 상태가 <b>포화</b>예요.</li>' +
          '<li>포화일 때 공기 1 kg 속 수증기의 양이 <b>포화 수증기량</b>(g/kg)이에요. 온도가 높을수록 커요.<br><small>10 °C 7.6 · 20 °C 14.7 · 30 °C 27.1 g/kg</small></li>' +
          '<li>같은 곡선을 <b>포화 수증기압</b>(hPa)으로도 읽을 수 있어요. (20 °C: 23.4 hPa)</li></ul>',
        missions: [
          {
            title: '온도마다 포화 상태 찾기', scene: 'box',
            goal: '온도를 <b>10 °C, 20 °C, 30 °C</b>로 바꾸며 수증기가 더 늘지 않을 때까지 기다려요. 포화가 되면 곡선 위에 점이 찍혀요.',
            hint: '증발(↑)과 응결(↓)의 숫자가 같아지면 포화예요. 잠깐 기다려 보세요!',
            check: () => S.scene === 'box' && hasRec(10) && hasRec(20) && hasRec(30),
            hold: 0.5,
            status: () => chip(hasRec(10), '10 °C') + ' · ' + chip(hasRec(20), '20 °C') + ' · ' + chip(hasRec(30), '30 °C'),
            explain: '물 분자는 계속 <b>증발</b>하고, 공기 속 수증기도 계속 <b>응결</b>해서 돌아가요. 두 수가 같아지면 수증기량이 일정해져요(<b>포화</b>). 온도가 높을수록 증발이 활발해서 더 많은 수증기를 품어요. <small>(10 °C 7.6 · 20 °C 14.7 · 30 °C 27.1 g/kg)</small>',
          },
          {
            type: 'quiz', title: '포화 상태에서는?', scene: 'box',
            goal: '포화 상태인 밀폐 용기 속에서 일어나는 일로 옳은 것은?',
            choices: ['증발도 응결도 모두 멈춘다', '증발하는 분자 수와 응결하는 분자 수가 같다', '증발은 멈추고 응결만 일어난다', '물이 모두 수증기로 변한다'],
            answer: 1,
            feedback: ['화면의 ↑↓ 숫자를 다시 봐요. 포화에서도 분자들은 계속 오가고 있어요.', '', '응결만 일어나면 수증기가 줄어들겠지요? 증발도 계속돼요.', '용기 안의 물은 그대로 남아 있어요. 수증기가 더 늘지 않을 뿐이에요.'],
            explain: '포화 상태에서도 증발과 응결은 계속돼요. 다만 <b>증발하는 분자 수 = 응결하는 분자 수</b>라서 겉으로는 수증기량이 변하지 않아요.',
          },
        ],
      },
      {
        title: '이슬점: 컵은 언제 흐려질까?', short: '이슬점', icon: '🧊', phase: '실험',
        features: ['dew'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 낮을수록 공기가 품을 수 있는 수증기량(포화 수증기량)이 줄어든다는 것을 알았어요.</div>' +
          '<p><b>25 °C 방</b>의 공기에는 수증기가 <b>14.7 g/kg</b> 들어 있어요. 여기에 놓은 <b>금속 컵</b>에 얼음물을 넣어 컵 표면 온도를 낮춰요. 컵 표면에 물방울이 맺히기 시작하는 온도를 <b>이슬점</b>이라고 해요.</p>',
        setup() { setScene('cup', true); },
        recap: '공기를 식힐 때 수증기가 포화에 이르러 응결하기 시작하는 온도가 <b>이슬점</b>이에요. 이슬점은 공기 속 <b>수증기량</b>에 따라 정해져요.',
        summary: '<ul><li>공기가 냉각되어 <b>포화에 이르는 온도</b>가 <b>이슬점</b>이에요. 더 식으면 수증기가 응결해 물방울이 돼요.</li>' +
          '<li>그래프에서 <b>수증기량의 수평선</b>이 포화 수증기량 곡선과 만나는 곳의 온도가 이슬점이에요.<br><small>14.7 g/kg → 20 °C · 7.6 g/kg → 10 °C</small></li>' +
          '<li>이슬점은 현재 공기 속 <b>수증기량</b>으로 결정돼요. 수증기가 많을수록 이슬점이 높아요.</li></ul>',
        missions: [
          {
            title: '컵 표면이 흐려지는 온도 찾기', scene: 'cup',
            goal: '🧊 <b>얼음물 넣기</b>로 컵을 천천히 식혀요. 표면에 <b>물방울이 맺히기 시작하는 온도</b>를 찾아요.',
            hint: '컵 표면 온도가 낮아질수록 곡선 위의 점이 왼쪽 아래로 내려가요. 점이 수평선보다 낮아지는 순간을 지켜봐요.',
            setup() { setAir('humid', true); cupReset(); },
            check: () => CUP.air === 'humid' && CUP.dewRec.humid != null && excess() > 0,
            hold: 1.0,
            status: () => (CUP.dewRec.humid != null ? '✅ 이슬점 ' + f1(CUP.dewRec.humid) + ' °C 기록' : '⬜ 컵 표면 ' + f1(CUP.cupTv) + ' °C · 아직 맑아요'),
            explain: '컵 가까이의 공기가 차가워지면 <b>포화 수증기량</b>이 줄어들어요. 공기 속 수증기량(14.7 g/kg)이 포화 수증기량과 같아지는 <b>20 °C</b>에서 물방울이 맺히기 시작해요. 이 온도가 <b>이슬점</b>이에요.',
          },
          {
            title: '그래프로 이슬점 읽기', scene: 'cup',
            goal: '점선은 공기 속 수증기량이에요. <b>? 점</b>을 점선 따라 끌어 곡선과 만나는 곳을 찾으세요. <b>습한 공기</b>와 <b>건조한 공기</b> 모두 찾아요.',
            hint: '? 점을 왼쪽으로 끌어요. 점선이 파란 곡선과 만나는 곳이 이슬점이에요. 공기는 아래 단추로 바꿔요.',
            setup() { CUP.showLine = true; CUP.found.humid = false; CUP.found.dry = false; setAir('humid', true); refreshUI(); },
            check: () => CUP.found.humid && CUP.found.dry,
            hold: 0.8,
            status: () => chip(CUP.found.humid, '습한 공기 ' + (CUP.found.humid ? '20 °C' : '')) + ' · ' + chip(CUP.found.dry, '건조한 공기 ' + (CUP.found.dry ? '10 °C' : '')),
            explain: '수증기량을 나타내는 <b>수평선</b>이 포화 수증기량 곡선과 만나는 곳의 온도가 이슬점이에요. 습한 공기(14.7 g/kg)는 <b>20 °C</b>, 건조한 공기(7.6 g/kg)는 <b>10 °C</b>예요. 수증기가 적으면 더 많이 식혀야 해요.',
          },
          {
            type: 'quiz', title: '이슬점을 정하는 것은?', scene: 'cup',
            goal: '습한 공기의 이슬점은 20 °C, 건조한 공기의 이슬점은 10 °C였어요. 이슬점을 정하는 것은 무엇일까요?',
            choices: ['컵에 넣은 얼음의 양', '방의 현재 기온', '컵의 크기와 재질', '공기 속에 들어 있는 수증기량'],
            answer: 3,
            feedback: ['얼음을 많이 넣으면 컵이 더 차가워질 뿐, 이슬점 자체는 그대로예요.', '두 공기 모두 방의 기온은 25 °C로 같았는데 이슬점은 달랐어요.', '컵은 공기를 식혀 줄 뿐이에요. 이슬점은 공기의 성질이에요.', ''],
            explain: '이슬점은 공기 속 <b>수증기량</b>으로 정해져요. 수증기가 많으면 이슬점이 높고, 적으면 낮아요. 얼음의 양이나 컵은 이슬점을 바꾸지 못해요.',
          },
        ],
      },
      {
        title: '상대 습도: 얼마나 가득 찼을까?', short: '상대 습도', icon: '💧', phase: '설명',
        features: ['rh'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 이슬점은 공기 속 수증기량이 정한다는 것을 알았어요.</div>' +
          '<p>그런데 같은 수증기량이라도 <b>기온에 따라 포화까지 얼마나 남았는지</b>가 달라져요. 그 정도를 숫자로 나타낸 것이 <b>상대 습도</b>예요. 점선 <b>칸</b>은 그 기온에서 품을 수 있는 최대 수증기량, 채운 분자는 지금 들어 있는 수증기량이에요.</p>',
        setup() { setScene('rh', true); },
        recap: '<b>상대 습도(%) = 현재 수증기량 ÷ 그 기온의 포화 수증기량 × 100</b>. 수증기량이 같아도 기온이 오르면 포화 수증기량이 커져서 상대 습도는 낮아져요.',
        summary: '<ul><li><b>상대 습도(%)</b> = 현재 공기 중 수증기량 ÷ 현재 기온의 포화 수증기량 × 100</li>' +
          '<li>포화 상태이면 상대 습도는 <b>100 %</b>이고, 이슬점에 닿으면 100 %가 돼요.</li>' +
          '<li>수증기량이 같아도 <b>기온이 오르면 상대 습도는 낮아지고</b>, 기온이 내리면 높아져요. (맑은 날 하루: 기온과 습도의 변화가 반대)</li>' +
          '<li>예) 20 °C, 7.6 g/kg → 7.6 ÷ 14.7 × 100 ≈ <b>52 %</b></li></ul>',
        missions: [
          {
            title: '상대 습도 50 % 만들기', scene: 'rh',
            goal: '기온과 수증기량 슬라이더를 움직여 <b>상대 습도를 약 50 %</b>로 만들어요. (47~53 %)',
            hint: '수증기량을 줄이거나, 기온을 높이면 상대 습도가 내려가요. 칸이 절반쯤 차게 해 보세요.',
            setup() { RHS.T = 20; RHS.w = 14.7; syncRange($('#rhTR'), 20); syncRange($('#rhWR'), 14.7); },
            check: () => S.scene === 'rh' && !RHS.day.on && Math.abs(rhNow() - 50) <= 3 && Math.abs(RHS.dial.value - rhNow()) < 2,
            hold: 1.0,
            status: () => '상대 습도 <b>' + Math.round(rhNow()) + ' %</b> ' + (Math.abs(rhNow() - 50) <= 3 ? '✅' : '⬜ (목표 약 50 %)'),
            explain: '상대 습도는 <b>채운 칸 ÷ 전체 칸</b>이에요. 수증기량을 줄이면 채운 칸이 줄고, 기온을 높이면 전체 칸이 늘어나서 둘 다 상대 습도가 내려가요.',
          },
          {
            title: '맑은 날 하루의 습도 변화', scene: 'rh',
            goal: '☀️ <b>하루 보기</b>를 눌러 수증기량이 7.6 g/kg로 그대로일 때, 기온에 따라 습도가 어떻게 변하는지 끝까지 지켜봐요.',
            hint: '하루 보기 단추를 누르면 새벽 5시부터 다음 날 5시까지 시간이 흘러요. 기온 그래프와 습도 그래프를 비교해 봐요.',
            setup() { RHS.day.done = false; RHS.day.t = 0; cancelDay(); RHS.view = 'curve'; },
            check: () => RHS.day.done,
            hold: 0.6,
            status: () => (RHS.day.done ? '✅ 하루를 모두 봤어요' : RHS.day.on ? '🕒 ' + String(Math.floor(RHS.day.t)).padStart(2, '0') + '시 · 상대 습도 <b>' + Math.round(rhNow()) + ' %</b>' : '⬜ ☀️ 하루 보기를 눌러요'),
            explain: '하루 동안 수증기량은 거의 그대로여도 낮에는 기온이 올라 포화 수증기량이 커져요. 그래서 기온이 가장 높은 오후에 상대 습도는 <b>가장 낮고</b>, 기온이 낮은 새벽에는 <b>높아요</b>. 기온과 습도의 그래프는 반대 모양이에요.',
          },
          {
            type: 'quiz', title: '상대 습도 계산하기', scene: 'rh',
            goal: '기온 20 °C, 수증기량 7.6 g/kg인 공기의 상대 습도는? <small>(20 °C 포화 수증기량 14.7 g/kg)</small>',
            choices: ['약 52 %', '약 100 %', '약 7.6 %', '약 193 %'],
            answer: 0,
            feedback: ['', '100 %는 포화 상태일 때예요. 7.6은 14.7보다 작으니 포화가 아니에요.', '7.6은 수증기량이에요. 포화 수증기량으로 나눈 뒤 100을 곱해야 해요.', '거꾸로 나누었어요. 현재 수증기량을 포화 수증기량으로 나눠요.'],
            explain: '상대 습도 = 7.6 ÷ 14.7 × 100 ≈ <b>52 %</b>. 칸 모형에서도 29칸 중 15칸이 찼어요.',
          },
        ],
      },
      {
        title: '적용: 이슬과 김 서림', short: '적용', icon: '🌿', phase: '적용',
        features: ['app'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공기가 이슬점보다 차가워지면 수증기가 응결한다는 것과 상대 습도를 배웠어요.</div>' +
          '<p>이제 <b>30 °C, 수증기량 20.0 g/kg</b>인 공기를 식히면 물이 얼마나 생기는지 알아봐요. 그래프의 수증기량(수평선)과 포화 수증기량 곡선의 차이가 <b>응결량</b>이에요. 새벽 이슬, 안개, 안경의 김 서림이 모두 같은 원리예요.</p>',
        setup() { setScene('app', true); },
        recap: '공기를 이슬점 아래로 식히면 <b>수증기량 − 그 온도의 포화 수증기량</b>만큼 응결해요. 이슬, 안개, 김 서림이 모두 이 원리예요.',
        summary: '<ul><li>응결량 = 현재 수증기량 − 냉각된 온도의 포화 수증기량</li>' +
          '<li>예) 30 °C, 20.0 g/kg 공기를 15 °C로 냉각 → 20.0 − 10.6 = <b>9.4 g/kg</b> 응결 (이슬점은 25 °C)</li>' +
          '<li>겨울에 안경에 김이 서리고, 새벽에 풀잎에 이슬이 맺히고, 에어컨 찬 표면에 물방울이 생기는 것은 모두 <b>이슬점보다 차가운 표면</b>에서 수증기가 응결하기 때문이에요.</li></ul>',
        missions: [
          {
            title: '공기를 20 °C까지 식히기', scene: 'app',
            goal: '기온 슬라이더를 내려 30 °C 공기를 <b>20 °C</b>까지 식혀요. 응결이 시작되는 때와 응결량을 살펴봐요.',
            hint: '슬라이더를 왼쪽으로 천천히 끌어요. 이슬점(25 °C)보다 낮아지면 칸이 줄고 아래에 물이 고여요.',
            setup() { RHS.T = 30; syncRange($('#appR'), 30); RHS.seenDew = false; },
            check: () => S.scene === 'app' && RHS.seenDew && Math.abs(RHS.Tv - 20) < 0.6 && Math.abs(RHS.T - 20) < 0.6,
            hold: 1.0,
            status: () => '기온 <b>' + Math.round(RHS.Tv) + ' °C</b> · 응결량 <b>' + f1(Math.max(0, RHS.w - satW(RHS.Tv))) + ' g/kg</b> ' + (RHS.seenDew ? '' : '⬜ 아직 응결 전'),
            explain: '이슬점(<b>25 °C</b>)보다 낮아지면 칸이 줄어 남은 수증기가 물이 돼요. 20 °C의 포화 수증기량은 14.7 g/kg이라 20.0 − 14.7 = <b>5.3 g/kg</b>이 응결해요.',
          },
          {
            type: 'quiz', title: '응결량 구하기', scene: 'app',
            goal: '30 °C에서 수증기량이 20.0 g/kg인 공기를 15 °C로 식히면 몇 g/kg이 응결할까요? <small>(15 °C 포화 수증기량 10.6 g/kg)</small>',
            choices: ['10.6 g/kg', '20.0 g/kg', '9.4 g/kg', '5.3 g/kg'],
            answer: 2,
            feedback: ['10.6 g/kg은 15 °C에서 공기가 계속 품고 있는 수증기량이에요. 응결량은 그만큼을 뺀 나머지예요.', '20.0 g/kg은 처음 수증기량 전체예요. 15 °C에서도 10.6 g/kg은 수증기로 남아요.', '', '5.3 g/kg은 20 °C로 식혔을 때의 응결량이에요. 슬라이더를 15 °C로 내려 확인해 봐요.'],
            explain: '응결량 = 20.0 − 10.6 = <b>9.4 g/kg</b>. 15 °C가 되어도 10.6 g/kg은 수증기로 남고, 나머지가 물방울이 돼요.',
          },
          {
            type: 'quiz', title: '안경에 김이 서리는 까닭', scene: 'app',
            goal: '추운 겨울, 밖에서 따뜻한 실내로 들어오면 안경에 김이 서려요. 그 까닭은?',
            choices: ['안경 표면의 온도가 실내 공기의 이슬점보다 낮아서 수증기가 응결한다', '차가운 안경이 실내 공기를 모두 얼려서', '안경알 속에서 물이 스며 나와서', '실내 공기의 상대 습도가 0 %가 되어서'],
            answer: 0,
            feedback: ['', '공기가 어는 것이 아니에요. 수증기가 물방울로 응결하는 현상이에요.', '물은 안경 속에서 나오는 것이 아니라 실내 공기 속 수증기가 응결한 거예요.', '상대 습도가 0 %이면 수증기가 없어 응결할 물이 없어요.'],
            explain: '차가운 안경 표면에 닿은 실내 공기가 <b>이슬점 아래</b>로 식어 수증기가 응결해요. 새벽 풀잎의 이슬, 에어컨 찬 표면의 물방울도 같은 원리예요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  setScene('box', true);
  G.curve = 0; SciSim.tween(G, { curve: 1 }, { duration: 1.3, ease: 'inOutCubic', delay: 0.2 });
  SciSim.loop((dt) => {
    update(dt);
    draw();
    refreshReadouts();
  });

  window.__sim = {
    VW, VH, S, BOX, CUP, RHS, G, SG,
    get game() { return game; },
    satW, satP, dewOf, nEq, setScene, resetScene, setAir, setIce, update, draw,
    gx, gy, gT,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    setBoxT(v) { BOX.T = v; binds.boxR.set(v); },
    setCupT(v) { CUP.cupT = v; setIce(false); binds.cupR.set(v); },
    setRH(T, w) { RHS.T = T; RHS.w = w; binds.rhTR.set(T); binds.rhWR.set(w); },
    setApp(T) { RHS.T = T; binds.appR.set(T); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
