/* =========================================================
   통합과학2 Ⅱ. 환경과 에너지 - 발전소와 우리 생활 (단원 8차시)
   성취기준 [10통과2-02-05] 발전기에서 운동 에너지가 전기 에너지로 전환되는 과정을 이해하고, 열원으로서 화석 연료, 핵에너지를
   이용하는 발전소가 인간 생활에 미치는 영향을 조사·발표할 수 있다. (열원 발전소와 조사·발표 부분)
   ① 모형: 발전 원리 (열원 → 보일러 → 수증기 → 터빈 → 발전기 → 송전)
   ② 실험: 화력 발전 (연료량 → 전력, 열효율 40 %, 배출)
   ③ 모형: 원자력 발전 (핵분열 연쇄 반응, 제어봉)
   ④ 분석: 비교·발표 (비교 보드, 조사 발표 카드)
   핵반응 방정식 · 원자로 종류 · 방사선 단위 · 에너지 정책 찬반 투표는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const FX = VW / 800;                      // 가로 배율 (휴대폰에서 줄여 그려요)
  const X = (x) => x * FX;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SH = PHONE ? 330 : 300;             // 위쪽 장면 높이
  const ROW_Y = SH + 10;
  const TY = SH - 38;                       // 바닥선

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }

  /* ---------- 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const COAL_J_PER_KG = 2.4e7;                                   // 석탄 1 kg이 내는 열 (J)
  const FUEL_MW = COAL_J_PER_KG * 1000 / 3600 / 1e6;             // 석탄 1 t/시간이 내는 열 = 6.67 MW
  const EFF = 0.4;                                               // 화력 발전 열효율
  const CO2_PER_MWH = 0.82;                                      // 전기 1 MWh당 이산화 탄소 (t) = 820 g/kWh
  const P_TARGET = 100, P_TOL = 1;                               // 화력 미션 목표 (MW)
  const FUEL_MAX = 60;                                           // 석탄 투입량 최댓값 (t/시간)
  const NU_P0 = 1000;                                            // 원자로 정격 전기 출력 (MW)
  const NU_TAU = 2;                                              // 반응 변화 시간 상수 (초)
  const NU_SCRAM = 1.5;                                          // 자동 정지 기준 (정격의 배수)
  const kOf = (rod) => 1.5 - rod;                                // 제어봉을 넣은 비율에 따른 연쇄 반응 배율
  const NEU_PER_N = 14;                                          // 정격에서 그림에 보이는 중성자 수

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'flow', t: 0, fade: 0, part: '',
    fl: { cards: [], drag: null, bad: {}, ok: false, okT: 0 },
    coal: { fuel: 20, Qraw: 0, Q: 0, hist: [], hAcc: 0, ph: 0, ang: 0 },
    nk: { rodSet: 1, rod: 1, n: 0.3, off: false, neu: [], nuc: [], hist: [], hAcc: 0, scram: 0, ang: 0, acc: 0, steam: 0 },
    cmp: { cells: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bad: {}, fuel: 'nuke', sel: { coal: {}, nuke: {} }, selOK: {}, seen: false },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { flow: '🧩 발전 원리', coal: '🔥 화력 발전', nuke: '☢️ 원자력 발전', cmp: '📊 비교·발표' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.fl.drag = null; }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-board')) on = S.part === 'board';
      if (on && n.hasAttribute('data-card')) on = S.part === 'card';
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const sf = $('#sFuel'); if (+sf.value !== S.coal.fuel) sf.value = S.coal.fuel;
    sf.style.setProperty('--pct', (S.coal.fuel / FUEL_MAX * 100) + '%'); $('#oFuel').textContent = S.coal.fuel.toFixed(1) + ' t/시간';
    $('#fuelMinus').disabled = S.coal.fuel <= 0; $('#fuelPlus').disabled = S.coal.fuel >= FUEL_MAX;
    const sr = $('#sRod'), rp = Math.round(S.nk.rodSet * 100); if (+sr.value !== rp) sr.value = rp;
    sr.style.setProperty('--pct', rp + '%'); $('#oRod').textContent = rp + ' %';
    $$('#cardFuel button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cmp.fuel));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 공통 그리기 ---------- */
  function drawStrip(px, py, pw, ph, hist, o) {
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 22, o.title, 13.5, '#26324a', 'left', 800);
    const x0 = px + (o.left || 50), x1 = px + pw - 14, y0 = py + 36, y1 = py + ph - 26;
    const gy = (v) => y1 - clamp(v / o.ymax, 0, 1) * (y1 - y0);
    for (let v = 0; v <= o.ymax + 1e-6; v += o.ystep) {
      ctx.strokeStyle = v === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = v === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0, gy(v)); ctx.lineTo(x1, gy(v)); ctx.stroke();
      T(x0 - 6, gy(v) + 4, String(Math.round(v)), 12, '#3a465c', 'right', 800);
    }
    if (o.band) { ctx.fillStyle = 'rgba(20,160,88,.16)'; ctx.fillRect(x0, gy(o.band[1]), x1 - x0, gy(o.band[0]) - gy(o.band[1])); }
    if (o.target != null) { ctx.strokeStyle = '#14a058'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x0, gy(o.target)); ctx.lineTo(x1, gy(o.target)); ctx.stroke(); ctx.setLineDash([]); T(x1 - 4, gy(o.target) - 5, o.targetLabel, 12, '#0b6b39', 'right', 800); }
    T(x0, y1 + 18, o.tWin + '초 전', 12, '#5a6679', 'left', 700); T(x1, y1 + 18, '지금', 12, '#5a6679', 'right', 700);
    T(px + pw - 14, py + 22, o.unit, 12.5, '#5a6679', 'right', 700);
    const pts = hist.map((h) => ({ x: x1 - (S.t - h.t) / o.tWin * (x1 - x0), y: gy(h.v) })).filter((p) => p.x >= x0 - 0.5);
    if (pts.length > 1) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, gy(0)); pts.forEach((p) => ctx.lineTo(p.x, p.y)); ctx.lineTo(pts[pts.length - 1].x, gy(0)); ctx.closePath();
      ctx.fillStyle = C.rgba(o.color, 0.16); ctx.fill();
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = o.color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
      const l = pts[pts.length - 1]; D.sphere(l.x, l.y, 5, o.color, { gloss: false });
    }
  }
  function drawGround() {
    const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#e6eefb'); g.addColorStop(1, '#f6f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SH);
    ctx.fillStyle = '#cfd6c2'; ctx.fillRect(0, TY, VW, SH - TY); ctx.fillStyle = '#a7b392'; ctx.fillRect(0, TY, VW, 4);
  }
  function drawTurbine(x, y, R, ang, label) {
    D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = '#dfe5f0'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillStyle = '#7a8599'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.86, -R * 0.12); ctx.lineTo(R * 0.86, R * 0.22); ctx.closePath(); ctx.fill(); }
    ctx.restore(); D.sphere(x, y, 5, '#394258', { gloss: false });
    if (label) T(x, y + R + 18, '터빈', 13, '#26324a', 'center', 800);
  }
  function drawGen(x, y, R, ang, label) {
    D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = '#566178'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.arc(x, y, R - 5, 0, TAU); ctx.fillStyle = '#e8edf6'; ctx.fill();
    [-1, 1].forEach((sg) => { const cx = x + sg * (R - 17), w = 13, h = R * 0.95; D.roundRect(cx - w / 2, y - h / 2, w, h, 4); ctx.fillStyle = '#e39a45'; ctx.fill(); });
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const L = R * 0.55, t = R * 0.28;
    D.roundRect(-L, -t / 2, L * 2, t, 4); ctx.fillStyle = '#ccd3df'; ctx.fill();
    ctx.save(); D.roundRect(-L, -t / 2, L * 2, t, 4); ctx.clip(); ctx.fillStyle = '#2f6df6'; ctx.fillRect(-L, -t / 2, L, t); ctx.fillStyle = '#e2464b'; ctx.fillRect(0, -t / 2, L, t); ctx.restore();
    ctx.restore(); D.sphere(x, y, 4, '#394258', { gloss: false });
    if (label) T(x, y + R + 18, '발전기', 13, '#26324a', 'center', 800);
  }
  function drawShaft(x1, x2, y, ang) {
    ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    ctx.strokeStyle = '#d6dbe6'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -ang * 6; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawGrid(x0, x1, yb, lit) {
    // 송전탑 + 마을
    const px = x0;
    ctx.strokeStyle = '#6a7488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 14, yb); ctx.lineTo(px, yb - 110); ctx.lineTo(px + 14, yb); ctx.moveTo(px - 18, yb - 90); ctx.lineTo(px + 18, yb - 90); ctx.moveTo(px - 12, yb - 62); ctx.lineTo(px + 12, yb - 62); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 18, yb - 90); ctx.lineTo(x1 - 30, yb - 40); ctx.moveTo(px + 12, yb - 62); ctx.lineTo(x1 - 30, yb - 36); ctx.stroke();
    const hs = [[x1 - 30, 34, 30], [x1 + 2, 28, 24], [x1 + 32, 30, 32]];
    hs.forEach(([hx, w, h]) => {
      ctx.fillStyle = '#b8c0cf'; ctx.fillRect(hx - w / 2, yb - h, w, h); ctx.fillStyle = '#8791a5'; ctx.beginPath(); ctx.moveTo(hx - w / 2 - 3, yb - h); ctx.lineTo(hx, yb - h - 12); ctx.lineTo(hx + w / 2 + 3, yb - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.mix('#6a7488', '#ffd447', clamp(lit, 0, 1)); ctx.fillRect(hx - 6, yb - h * 0.7, 12, 10);
      if (lit > 0.05) D.glow(hx, yb - h * 0.7 + 5, 22, '#ffd447', 0.45 * clamp(lit, 0, 1));
    });
  }
  function steamDots(path, ph, n, size, col) {
    let L = 0; const seg = []; for (let i = 0; i < path.length - 1; i++) { const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); seg.push(d); L += d; }
    for (let j = 0; j < n; j++) {
      let q = (((ph + j / n) % 1) + 1) % 1 * L, i = 0;
      while (i < seg.length - 1 && q > seg[i]) { q -= seg[i]; i++; }
      const A = path[i], B = path[i + 1], f = clamp(q / (seg[i] || 1), 0, 1);
      D.sphere(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, size, col || '#ffffff', { gloss: false, outline: '#8fa0b8', outlineWidth: 1 });
    }
  }

  /* ================= ① 발전 원리: 흐름 카드 ================= */
  const STAGES = [
    { name: '열원', icon: '🔥', form: '화학·핵에너지', sub: '화석 연료 · 핵연료', col: '#ef6c3a' },
    { name: '보일러', icon: '🏭', form: '열에너지', sub: '물을 끓여요', col: '#d97706' },
    { name: '수증기', icon: '♨️', form: '열에너지', sub: '고온 · 고압', col: '#0ea5e9' },
    { name: '터빈', icon: '🌀', form: '운동 에너지', sub: '날개바퀴 회전', col: '#14a058' },
    { name: '발전기', icon: '⚙️', form: '전기 에너지', sub: '전자기 유도', col: '#7c5cff' },
    { name: '송전', icon: '🔌', form: '전기 에너지', sub: '송전선 · 변압기', col: '#e2464b' },
  ];
  const FORM_COL = { '화학·핵에너지': '#7c3aed', '열에너지': '#f26b3a', '운동 에너지': '#0f9d6a', '전기 에너지': '#d4a017' };
  const TRAY_ORDER = [3, 0, 5, 2, 4, 1];
  const CW = PHONE ? 136 : 112, CHT = PHONE ? 70 : 96;
  const slotRect = (i) => (PHONE ? { x: 24 + (i % 3) * 148, y: 46 + Math.floor(i / 3) * 104, w: CW, h: CHT } : { x: 29 + i * 126, y: 62, w: CW, h: CHT });
  const trayRect = (j) => (PHONE ? { x: 24 + (j % 3) * 148, y: 292 + Math.floor(j / 3) * 92, w: CW, h: CHT } : { x: 29 + j * 126, y: 214, w: CW, h: CHT });
  function resetFlow(shuffle) {
    const order = shuffle ? TRAY_ORDER.slice().sort(() => Math.random() - 0.5) : TRAY_ORDER.slice();
    S.fl.cards = order.map((id, j) => { const r = trayRect(j); return { id, loc: { k: 'tray', i: j }, x: r.x, y: r.y, lift: 0 }; });
    S.fl.drag = null; S.fl.bad = {}; S.fl.ok = false; S.fl.okT = 0;
  }
  const cardRectOf = (c) => (c.loc.k === 'slot' ? slotRect(c.loc.i) : trayRect(c.loc.i));
  const cardAtSlot = (i) => S.fl.cards.find((c) => c.loc.k === 'slot' && c.loc.i === i);
  function slotAt(p) { for (let i = 0; i < 6; i++) { const r = slotRect(i); if (p.x >= r.x - 8 && p.x <= r.x + r.w + 8 && p.y >= r.y - 8 && p.y <= r.y + r.h + 8) return i; } return -1; }
  const flowPlaced = () => S.fl.cards.filter((c) => c.loc.k === 'slot').length;
  const flowRight = () => S.fl.cards.filter((c) => c.loc.k === 'slot' && c.loc.i === c.id).length;
  function dropCard(c, p) {
    const from = c.loc, si = slotAt(p);
    if (si >= 0) {
      const occ = cardAtSlot(si);
      if (occ && occ !== c) occ.loc = from.k === 'slot' ? { k: 'slot', i: from.i } : { k: 'tray', i: from.i };
      c.loc = { k: 'slot', i: si }; Sound.click();
      delete S.fl.bad[c.id]; if (occ) delete S.fl.bad[occ.id];
    } else if (from.k === 'slot') {
      for (let j = 0; j < 6; j++) if (!S.fl.cards.some((o) => o !== c && o.loc.k === 'tray' && o.loc.i === j)) { c.loc = { k: 'tray', i: j }; break; }
      delete S.fl.bad[c.id];
    }
    S.fl.ok = flowRight() === 6;
    if (S.fl.ok) { S.fl.okT = 0; Sound.success(); parts.burst(VW / 2, PHONE ? 100 : 110, { count: 22, speed: 190, size: 3.4, colors: ['#ffb400', '#f26b3a', '#14a058', '#3867f4'], gravity: 180 }); }
  }
  function stepFlow(dt) {
    const f = S.fl;
    f.cards.forEach((c) => {
      const dragging = f.drag && f.drag.card === c;
      c.lift = SciSim.approach(c.lift, dragging ? 1 : 0, dt, 14);
      if (!dragging) { const r = cardRectOf(c); c.x = SciSim.approach(c.x, r.x, dt, 14); c.y = SciSim.approach(c.y, r.y, dt, 14); if (Math.abs(c.x - r.x) < 0.3) c.x = r.x; if (Math.abs(c.y - r.y) < 0.3) c.y = r.y; }
    });
    if (f.ok) f.okT += dt;
  }
  function drawCard(c, big) {
    const st = STAGES[c.id], w = CW, h = CHT, lift = c.lift;
    ctx.save(); ctx.translate(c.x + w / 2, c.y + h / 2); const sc = 1 + 0.06 * lift; ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
    D.shadow(() => { D.roundRect(0, 0, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + 12 * lift, y: 2 + 5 * lift });
    ctx.save(); D.roundRect(0, 0, w, h, 14); ctx.clip(); ctx.fillStyle = st.col; ctx.fillRect(0, 0, w, 7); ctx.restore();
    ctx.strokeStyle = C.rgba(st.col, 0.7); ctx.lineWidth = 2; D.roundRect(0, 0, w, h, 14); ctx.stroke();
    const bob = S.fl.ok && c.loc.k === 'slot' ? Math.sin(S.t * 3 + c.id) * 2.5 : 0;
    T(PHONE ? 30 : w / 2, (PHONE ? 44 : 44) + bob, st.icon, PHONE ? 26 : 30, '#000', 'center', 700);
    T(PHONE ? 84 : w / 2, PHONE ? 36 : 68, st.name, PHONE ? 16 : 16, '#26324a', 'center', 800);
    T(PHONE ? 84 : w / 2, PHONE ? 56 : 86, st.sub, PHONE ? 12 : 12, '#5a6679', 'center', 700);
    ctx.restore();
  }
  function drawFlowScene(dt) {
    const f = S.fl;
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf0fa'); g.addColorStop(1, '#f7f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    T(14, PHONE ? 26 : 30, '🧩 발전소의 흐름 카드를 순서대로 놓아요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 칸과 화살표
    for (let i = 0; i < 6; i++) {
      const r = slotRect(i), occ = cardAtSlot(i);
      ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = occ ? 'rgba(255,255,255,.4)' : 'rgba(120,135,160,.10)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = f.bad[occ && occ.id] ? '#e2464b' : '#9aa7bd'; ctx.lineWidth = f.bad[occ && occ.id] ? 3 : 2; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      if (!occ) T(r.x + r.w / 2, r.y + r.h / 2 + 12, String(i + 1), PHONE ? 30 : 36, 'rgba(100,115,140,.45)', 'center', 800);
      else D.label(r.x + 14, r.y - 2, String(i + 1), { bg: '#394258', size: 12, pad: 6 });
      const nx = (i < 5 && (!PHONE || i % 3 < 2)) ? slotRect(i + 1) : null;
      if (nx) {
        const ax1 = r.x + r.w + 2, ax2 = nx.x - 2, ay = r.y + r.h / 2;
        D.arrow(ax1, ay, ax2, ay, { color: f.ok ? '#f26b3a' : '#a6b1c4', width: 3.5, head: 9 });
      }
      if (occ) {   // 에너지 형태 라벨
        const st = STAGES[occ.id];
        D.label(r.x + r.w / 2, r.y + r.h + 14, st.form, { bg: FORM_COL[st.form], size: PHONE ? 11.5 : 12.5 });
      }
    }
    // 에너지 덩어리 흐름 (완성되면)
    if (f.ok && !RM) {
      for (let k = 0; k < 3; k++) {
        const q = ((f.okT * 0.18 + k / 3) % 1) * 5.0, seg = Math.min(4, Math.floor(q)), r1 = slotRect(seg), r2 = slotRect(seg + 1), fr = q - seg;
        const x1 = r1.x + r1.w / 2, y1 = r1.y + r1.h / 2, x2 = r2.x + r2.w / 2, y2 = r2.y + r2.h / 2;
        const ex = x1 + (x2 - x1) * fr, ey = y1 + (y2 - y1) * fr;
        D.glow(ex, ey, 18, '#ffb400', 0.6); D.sphere(ex, ey, 6, '#ffb400', { gloss: false });
      }
    }
    // 상자 (카드 보관)
    const t0 = trayRect(0);
    T(PHONE ? 24 : 29, t0.y - 10, '🗂️ 카드 보관함 (끌어서 위의 칸으로)', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800);
    // 보관함 빈칸
    for (let j = 0; j < 6; j++) { const r = trayRect(j); D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = 'rgba(120,135,160,.08)'; ctx.fill(); }
    // 카드 (끄는 카드가 맨 위)
    const sorted = f.cards.slice().sort((a, b) => (f.drag && f.drag.card === a ? 1 : 0) - (f.drag && f.drag.card === b ? 1 : 0));
    sorted.forEach((c) => drawCard(c));
    // 놓을 칸 강조
    if (f.drag) { const si = slotAt(f.drag.p); if (si >= 0) { const r = slotRect(si); D.ring(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.5, S.t, { color: '#f26b3a' }); } }
    drawFlowData();
    parts.update(dt); parts.draw(ctx);
  }
  function drawFlowData() {
    const f = S.fl, y = PHONE ? 478 : 330, h = VH - y - 10;
    panel(12, y, VW - 24, h, 14);
    T(26, y + 24, '에너지 형태의 사슬', 14, '#26324a', 'left', 800);
    const chain = ['화학·핵에너지', '열에너지', '운동 에너지', '전기 에너지'];
    const n = 4, gap = PHONE ? 22 : 40, bw = (VW - 24 - 28 - gap * (n - 1)) / n, bh = PHONE ? 42 : 52, by = y + 38;
    chain.forEach((c, i) => {
      const x = 26 + i * (bw + gap);
      D.roundRect(x, by, bw, bh, 10); ctx.fillStyle = f.ok ? C.rgba(FORM_COL[c], 0.14) : '#eef1f7'; ctx.fill(); ctx.strokeStyle = f.ok ? FORM_COL[c] : '#c7d0de'; ctx.lineWidth = 2; ctx.stroke();
      T(x + bw / 2, by + bh / 2 + 5, f.ok ? c : '?', PHONE ? 12.5 : 15, f.ok ? '#26324a' : '#98a2b3', 'center', 800);
      if (i < n - 1) D.arrow(x + bw + 3, by + bh / 2, x + bw + gap - 3, by + bh / 2, { color: f.ok ? '#f26b3a' : '#c7d0de', width: 3, head: 8 });
    });
    const ty = by + bh + (PHONE ? 22 : 28);
    const lines = f.ok
      ? (PHONE ? ['열 → 수증기 → 터빈의 운동 → 발전기의 전자기 유도로 전기가 만들어져요.'] : ['열원이 보일러의 물을 가열해 고온·고압의 수증기를 만들어요.', '수증기가 터빈의 날개를 밀어 터빈이 돌아요 (운동 에너지).', '터빈이 발전기의 자석을 돌리면 전자기 유도로 전기가 만들어져요.'])
      : ['카드를 모두 알맞은 칸에 놓으면 에너지가 어떤 형태로 바뀌는지 알 수 있어요.'];
    lines.forEach((l, i) => textBlock(26, ty + i * (PHONE ? 38 : 24), VW - 52, l, PHONE ? 12.5 : 14, f.ok ? '#26324a' : '#5a6679', 17, 800));
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'flow') return false;
      const cs = S.fl.cards.slice().reverse();
      for (const c of cs) if (p.x >= c.x && p.x <= c.x + CW && p.y >= c.y && p.y <= c.y + CHT) {
        S.fl.drag = { card: c, ox: p.x - c.x, oy: p.y - c.y, p }; Sound.click(); return true;
      }
      return false;
    },
    move(p) { const d = S.fl.drag; if (!d) return; d.p = p; d.card.x = p.x - d.ox; d.card.y = p.y - d.oy; },
    up(p) { const d = S.fl.drag; if (!d) return; S.fl.drag = null; dropCard(d.card, p); },
    hover(p) { if (S.mode !== 'flow') return 'default'; return S.fl.cards.some((c) => p.x >= c.x && p.x <= c.x + CW && p.y >= c.y && p.y <= c.y + CHT) ? 'grab' : 'default'; },
  });
  $('#bShuffle').addEventListener('click', () => { Sound.click(); resetFlow(true); });

  /* ================= ② 화력 발전 ================= */
  const coalP = () => EFF * S.coal.Q;
  function stepCoal(dt) {
    const c = S.coal, F = c.fuel * FUEL_MW;
    c.Qraw = Math.abs(c.Qraw - F) < 0.25 ? F : SciSim.approach(c.Qraw, F, dt, 1.2);
    c.Q = Math.round(c.Qraw * 2) / 2;
    const P = coalP();
    c.ang += dt * (P / 100) * TAU * 1.4;
    c.hAcc += dt; while (c.hAcc >= 0.1) { c.hAcc -= 0.1; c.hist.push({ t: S.t, v: P }); }
    while (c.hist.length && S.t - c.hist[0].t > 40.2) c.hist.shift();
    const lv = c.Q / (FUEL_MAX * FUEL_MW);                 // 0~1
    // 연기와 수증기
    if (!RM && lv > 0.02) {
      if (Math.random() < dt * (6 + 26 * lv)) parts.emit({ x: X(254) + rnd(-4, 4) * FX, y: PHONE ? 60 : 56, vx: rnd(-6, 14), vy: rnd(-42, -22), life: 2.2, size: 6 + rnd(0, 4), color: 'rgba(95,100,112,.85)', shape: 'smoke', grow: 9 });
      if (Math.random() < dt * (10 * lv)) parts.emit({ x: X(400) + rnd(-20, 20) * FX, y: 228, vx: rnd(-6, 6), vy: rnd(-34, -20), life: 1.6, size: 5, color: 'rgba(242,135,58,.8)', shape: 'smoke', grow: 8 });
    }
    c.ph = (c.ph + dt * (0.1 + 0.5 * lv)) % 1;
  }
  function drawCoalScene(dt) {
    const c = S.coal, P = coalP(), lv = c.Q / (FUEL_MAX * FUEL_MW);
    drawGround();
    const gy = 150;
    // 호퍼 + 컨베이어
    ctx.fillStyle = '#7a8599'; ctx.beginPath(); ctx.moveTo(X(26), 104); ctx.lineTo(X(100), 104); ctx.lineTo(X(72), 160); ctx.lineTo(X(54), 160); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2f38'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(X(42 + i * 9), 106 + (i % 2) * 2, 4, 0, TAU); ctx.fill(); }
    T(X(63), 94, '석탄', 12.5, '#26324a', 'center', 800);
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(63), 164); ctx.lineTo(X(124), 214); ctx.stroke();
    if (lv > 0.01) for (let i = 0; i < 5; i++) { const q = ((c.ph * 3 + i / 5) % 1); ctx.fillStyle = '#15181f'; ctx.beginPath(); ctx.arc(X(63) + (X(124) - X(63)) * q, 164 + 50 * q - 7, 3.6, 0, TAU); ctx.fill(); }
    // 보일러
    D.shadow(() => { D.roundRect(X(120), 118, X(112), TY - 118, 8); ctx.fillStyle = '#8a94a8'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#6a7488'; ctx.fillRect(X(128), 150, X(96), 70);
    ctx.fillStyle = C.mix('#6fb8f5', '#ffd9b0', lv * 0.7); ctx.fillRect(X(132), 156, X(88), 36);
    if (lv > 0.005) D.flame(X(176), TY - 2, 16 + 46 * lv, S.t);
    T(X(176), 142, '보일러', 13, '#fff', 'center', 800);
    // 굴뚝
    ctx.fillStyle = '#a1a9b8'; ctx.fillRect(X(240), 66, X(26), TY - 66); ctx.fillStyle = '#7d8696'; ctx.fillRect(X(240), 66, X(26), 8);
    if (!PHONE) T(X(254), 56, '굴뚝', 12.5, '#26324a', 'center', 800);
    // 증기 관
    const path = [[X(176), 118], [X(176), 84], [X(400), 84], [X(400), gy - 48 * (PHONE ? 0.7 : 1)]];
    ctx.strokeStyle = '#a7b0c2'; ctx.lineWidth = PHONE ? 8 : 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); path.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    if (lv > 0.01) steamDots(path, (S.t * (0.12 + 0.5 * lv)) % 1, Math.round(3 + 9 * lv), PHONE ? 3.4 : 4.4);
    // 터빈 · 발전기
    const R = PHONE ? 33 : 48, Rg = PHONE ? 31 : 46;
    drawShaft(X(400), X(545), gy, c.ang);
    drawTurbine(X(400), gy, R, c.ang, false);
    T(X(400) - R - 8, gy + 5, '터빈', 13, '#26324a', 'right', 800);
    drawGen(X(545), gy, Rg, c.ang, true);
    // 응축기 (버려지는 열)
    const cx = X(400);
    ctx.fillStyle = '#9fb3c8'; D.roundRect(cx - X(46), gy + R + 28, X(92), 26, 6); ctx.fill();
    ctx.strokeStyle = '#a7b0c2'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, gy + R + 2); ctx.lineTo(cx, gy + R + 28); ctx.stroke();
    if (!PHONE) T(cx, gy + R + 46, '냉각수', 12, '#26324a', 'center', 800);
    if (lv > 0.02) { for (let i = 0; i < 3; i++) { const yy = 226 - (S.t * 24 + i * 14) % 42; ctx.globalAlpha = 0.5 * Math.min(1, lv * 3) * (1 - ((226 - yy) / 42)); D.wave(cx - X(30), cx + X(30), yy, { amp: 3, wavelength: 20, color: '#f2873a', width: 3, phase: S.t * 4 + i }); ctx.globalAlpha = 1; } }
    // 송전 · 마을
    const gpx = PHONE ? 372 : 690;
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(545) + Rg, gy); ctx.lineTo(gpx, gy); ctx.lineTo(gpx, TY - 108); ctx.stroke();
    drawGrid(gpx, PHONE ? 424 : 752, TY, clamp(P / 100, 0, 1));
    // 제목
    T(VW - 14, PHONE ? 26 : 30, '🔥 석탄을 태워 전기를 만드는 화력 발전소', PHONE ? 13 : 17, '#26324a', 'right', 800);
    T(VW - 14, PHONE ? 46 : 52, '연료의 열 → 수증기 → 터빈 → 발전기 → 전기', PHONE ? 11.5 : 13.5, '#5a6679', 'right', 700);
    drawCoalData();
    parts.update(dt); parts.draw(ctx);
  }
  function drawCoalData() {
    const c = S.coal, P = coalP(), Q = c.Q, W = Q - P, y = ROW_Y, h = VH - y - 10;
    const sw = PHONE ? VW - 24 : 458, sh = PHONE ? 122 : h;
    drawStrip(12, y, sw, sh, c.hist, { title: '전기 출력의 변화', unit: 'MW (최근 40초)', ymax: 160, ystep: PHONE ? 80 : 40, tWin: 40, target: P_TARGET, targetLabel: '목표 100 MW', band: [P_TARGET - P_TOL, P_TARGET + P_TOL], color: '#3867f4', left: 40 });
    const px = PHONE ? 12 : 482, py = PHONE ? y + sh + 8 : y, pw = PHONE ? VW - 24 : VW - 494, ph = PHONE ? h - sh - 8 : h;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 22, '연료 에너지의 행방 (열효율 ' + Math.round(EFF * 100) + ' %)', 13.5, '#26324a', 'left', 800);
    const bx = px + 14, bw = pw - 28, by = py + 36, bh = PHONE ? 22 : 28, MAXQ = FUEL_MAX * FUEL_MW;
    D.roundRect(bx, by, bw, bh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const wP = bw * clamp(P / MAXQ, 0, 1), wW = bw * clamp(W / MAXQ, 0, 1);
    ctx.save(); D.roundRect(bx, by, bw, bh, 8); ctx.clip();
    if (wP > 0.5) { ctx.fillStyle = '#3867f4'; ctx.fillRect(bx, by, wP, bh); }
    if (wW > 0.5) { ctx.fillStyle = '#f2873a'; ctx.fillRect(bx + wP, by, wW, bh); }
    ctx.restore();
    T(bx, by + bh + 16, '0', 12, '#3a465c', 'left', 800); T(bx + bw, by + bh + 16, Math.round(MAXQ) + ' MW', 12, '#3a465c', 'right', 800);
    const ty = by + bh + (PHONE ? 34 : 34);
    ctx.fillStyle = '#3867f4'; ctx.fillRect(px + 14, ty - 11, 12, 12); T(px + 32, ty, '전기 ' + P.toFixed(1) + ' MW', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    ctx.fillStyle = '#f2873a'; ctx.fillRect(px + (PHONE ? 150 : 14), PHONE ? ty - 11 : ty + 10, 12, 12); T(px + (PHONE ? 168 : 32), PHONE ? ty : ty + 21, '버려지는 열 ' + W.toFixed(1) + ' MW', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const t2 = PHONE ? ty + 22 : ty + 46;
    T(px + 14, t2, '연료 에너지 ' + Q.toFixed(1) + ' MW (석탄 ' + c.fuel.toFixed(1) + ' t/시간)', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800);
    if (!PHONE) {
      const co2 = CO2_PER_MWH * P, y3 = t2 + 22;
      T(px + 14, y3, '이산화 탄소 배출 ' + co2.toFixed(1) + ' t/시간', 14, '#26324a', 'left', 800);
      D.roundRect(px + 14, y3 + 6, pw - 28, 12, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const wc = (pw - 28) * clamp(co2 / (CO2_PER_MWH * EFF * MAXQ), 0, 1); if (wc > 0.5) { D.roundRect(px + 14, y3 + 6, wc, 12, 6); ctx.fillStyle = '#5a6475'; ctx.fill(); }
      T(px + 14, y3 + 38, '미세먼지·황산화물·질소산화물 (상대값)', 12.5, '#26324a', 'left', 800);
      const dust = Q / MAXQ; D.roundRect(px + 14, y3 + 44, pw - 28, 12, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const wd = (pw - 28) * clamp(dust, 0, 1); if (wd > 0.5) { D.roundRect(px + 14, y3 + 44, wd, 12, 6); ctx.fillStyle = '#a16207'; ctx.fill(); }
      T(px + pw - 14, y3 + 38, Math.round(dust * 100) + ' %', 12.5, '#a16207', 'right', 800);
    }
  }
  $('#sFuel').addEventListener('input', (e) => { S.coal.fuel = +e.target.value; Sound.tick(); updateCtl(); });
  $('#fuelMinus').addEventListener('click', () => { Sound.click(); S.coal.fuel = Math.max(0, S.coal.fuel - 0.5); updateCtl(); });
  $('#fuelPlus').addEventListener('click', () => { Sound.click(); S.coal.fuel = Math.min(FUEL_MAX, S.coal.fuel + 0.5); updateCtl(); });

  /* ================= ③ 원자력 발전 ================= */
  const CORE = PHONE ? { x: 12, y: 60, w: 456, h: 130, rows: 3 } : { x: 24, y: 74, w: 372, h: 180, rows: 4 };
  const NCOL = 9, NR = PHONE ? 11 : 12, NSP = PHONE ? 120 : 150;
  const rodXs = () => [2, 4, 6, 8].map((k) => CORE.x + CORE.w * k / NCOL);
  function nkInit() {
    const nk = S.nk;
    nk.nuc = [];
    for (let j = 0; j < CORE.rows; j++) for (let i = 0; i < NCOL; i++) nk.nuc.push({ x: CORE.x + (i + 0.5) * CORE.w / NCOL, y: CORE.y + (j + 0.5) * CORE.h / CORE.rows, cd: 0, sp: 0 });
    nk.neu = [];
    const nt = Math.round(nk.n * NEU_PER_N);
    for (let i = 0; i < nt; i++) spawnNeutron();
  }
  function spawnNeutron(x, y) {
    const nk = S.nk;
    if (x == null) { const cand = nk.nuc[Math.floor(Math.random() * nk.nuc.length)]; x = cand.x; y = cand.y; }
    const a = Math.random() * TAU; nk.neu.push({ x, y, vx: Math.cos(a) * NSP, vy: Math.sin(a) * NSP });
  }
  function nkRestart() { const nk = S.nk; nk.n = 0.3; nk.off = false; nk.scram = 0; nk.hist.length = 0; nkInit(); }
  const nkP = () => Math.round(S.nk.n * NU_P0);
  const nkDP = () => NU_P0 * S.nk.n * (kOf(S.nk.rod) - 1) / NU_TAU;     // 출력의 변화율 (MW/초)
  function setRod(v) { S.nk.rodSet = clamp(v, 0, 1); updateCtl(); }
  function stepNuke(dt) {
    const nk = S.nk;
    nk.rod = Math.abs(nk.rod - nk.rodSet) < 0.002 ? nk.rodSet : SciSim.approach(nk.rod, nk.rodSet, dt, 5);
    const k = kOf(nk.rod);
    if (!nk.off) {
      nk.n *= Math.exp((k - 1) / NU_TAU * dt);
      if (nk.n < 0.01) { nk.n = 0; nk.off = true; }
      if (nk.n >= NU_SCRAM) { nk.n = NU_SCRAM; if (nk.scram <= 0) { nk.scram = 2.6; Sound.fail(); } nk.rodSet = 1; updateCtl(); }
    }
    if (nk.scram > 0) nk.scram -= dt;
    nk.ang += dt * nk.n * TAU * 1.4;
    nk.hAcc += dt; while (nk.hAcc >= 0.1) { nk.hAcc -= 0.1; nk.hist.push({ t: S.t, v: nkP() }); }
    while (nk.hist.length && S.t - nk.hist[0].t > 40.2) nk.hist.shift();
    nk.steam = (nk.steam + dt * (0.1 + 0.5 * nk.n)) % 1;
    // ---- 중성자 · 핵 ----
    const nt = nk.off ? 0 : Math.round(nk.n * NEU_PER_N);
    nk.nuc.forEach((u) => { if (u.cd > 0) u.cd -= dt; if (u.sp > 0) u.sp = Math.max(0, u.sp - dt / 0.8); });
    if (!nk.off && nk.neu.length < nt && Math.random() < dt * 9) spawnNeutron();
    const rx = rodXs(), depth = nk.rod * CORE.h;
    for (let i = nk.neu.length - 1; i >= 0; i--) {
      const q = nk.neu[i];
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.x < CORE.x + 4) { q.x = CORE.x + 4; q.vx = Math.abs(q.vx); } else if (q.x > CORE.x + CORE.w - 4) { q.x = CORE.x + CORE.w - 4; q.vx = -Math.abs(q.vx); }
      if (q.y < CORE.y + 4) { q.y = CORE.y + 4; q.vy = Math.abs(q.vy); } else if (q.y > CORE.y + CORE.h - 4) { q.y = CORE.y + CORE.h - 4; q.vy = -Math.abs(q.vy); }
      // 제어봉이 흡수
      let gone = false;
      if (depth > 1) for (const x of rx) if (Math.abs(q.x - x) < 8 && q.y < CORE.y + depth) { gone = true; break; }
      if (gone) { if (!RM && Math.random() < 0.6) parts.emit({ x: q.x, y: q.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: 0.35, size: 2.6, color: '#8b95a8', shape: 'circle' }); nk.neu.splice(i, 1); continue; }
      // 우라늄 핵과 충돌
      for (const u of nk.nuc) {
        if (u.cd > 0) continue;
        if (Math.hypot(q.x - u.x, q.y - u.y) < NR + 3) {
          nk.neu.splice(i, 1); u.cd = 1.6;
          if (nk.neu.length > nt + 2) { if (!RM) parts.emit({ x: u.x, y: u.y, vx: 0, vy: -10, life: 0.4, size: 3, color: '#8b95a8', shape: 'circle' }); }
          else {
            u.sp = 1; const nn = Math.random() < 0.5 ? 2 : 3; Sound.tick();
            const room = Math.max(1, nt + 3 - nk.neu.length);
            for (let m = 0; m < Math.min(nn, room); m++) spawnNeutron(u.x, u.y);
            if (!RM) parts.burst(u.x, u.y, { count: 8, speed: 90, size: 3, colors: ['#ffb400', '#f26b3a', '#fff3b0'], gravity: 0, life: 0.5, shape: 'circle' });
          }
          break;
        }
      }
    }
    if (nk.neu.length > 60) nk.neu.length = 60;
  }
  const NKL = PHONE
    ? { tx: 110, ty: 262, tr: 32, gx: 250, gy: 262, gr: 30, px: 340, hx: 430 }
    : { tx: 476, ty: 164, tr: 44, gx: 596, gy: 164, gr: 40, px: 672, hx: 752 };
  function drawNukeScene(dt) {
    const nk = S.nk, n = nk.n;
    drawGround();
    // 원자로 (물 + 우라늄 핵 + 제어봉)
    const heat = clamp(n / 1.2, 0, 1);
    D.shadow(() => { D.roundRect(CORE.x - 6, CORE.y - 6, CORE.w + 12, CORE.h + 12, 12); ctx.fillStyle = '#6a7488'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(CORE.x, CORE.y, CORE.w, CORE.h, 8); ctx.fillStyle = C.mix('#cfe6fa', '#ffd2a4', heat); ctx.fill();
    if (heat > 0.05) D.glow(CORE.x + CORE.w / 2, CORE.y + CORE.h / 2, CORE.w * 0.45, '#ff9d3a', 0.35 * heat);
    nk.nuc.forEach((u) => {
      if (u.cd > 0 && u.sp > 0) {
        const d = 16 * (1 - u.sp) + 3;
        ctx.globalAlpha = u.sp; D.sphere(u.x - d, u.y, NR * 0.62, '#a78bfa', { gloss: false }); D.sphere(u.x + d, u.y, NR * 0.62, '#a78bfa', { gloss: false }); ctx.globalAlpha = 1;
        D.glow(u.x, u.y, NR * 2.2, '#ffb400', 0.6 * u.sp);
      } else if (u.cd > 0) { ctx.globalAlpha = 0.25; D.sphere(u.x, u.y, NR, '#7c3aed', { gloss: false }); ctx.globalAlpha = 1; }
      else D.sphere(u.x, u.y, NR, '#7c3aed', { text: 'U', textScale: 0.95 });
    });
    // 중성자
    nk.neu.forEach((q) => { D.glow(q.x, q.y, 9, '#ffd447', 0.5); D.sphere(q.x, q.y, 4, '#ffe066', { gloss: false }); });
    // 제어봉
    const depth = nk.rod * CORE.h;
    rodXs().forEach((x) => {
      ctx.fillStyle = '#394258'; ctx.fillRect(x - 6, CORE.y - 22, 12, 22 + depth);
      ctx.fillStyle = '#5a6479'; ctx.fillRect(x - 6, CORE.y - 22, 12, 6);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; for (let yy = CORE.y + 4; yy < CORE.y + depth - 2; yy += 9) { ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x + 6, yy); ctx.stroke(); }
    });
    T(CORE.x + 4, CORE.y - 26, '제어봉 (중성자를 흡수)', PHONE ? 12 : 12.5, '#26324a', 'left', 800);
    T(CORE.x + CORE.w - 4, CORE.y + CORE.h + 20, '우라늄-235 핵 · 중성자', PHONE ? 11.5 : 12.5, '#5a6679', 'right', 800);
    // 증기 관 → 터빈 → 발전기 → 마을
    const L = NKL, lv = clamp(n, 0, 1.5);
    let path;
    if (PHONE) path = [[CORE.x + 98, CORE.y + CORE.h + 6], [CORE.x + 98, 232], [L.tx, 232]]; else path = [[CORE.x + CORE.w + 6, L.ty], [L.tx - L.tr * 0.2, L.ty]];
    if (!PHONE) { ctx.strokeStyle = '#a7b0c2'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1]); ctx.lineTo(L.tx - L.tr, path[1][1]); ctx.stroke(); path[1][0] = L.tx - L.tr; }
    else { ctx.strokeStyle = '#a7b0c2'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); path.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
    if (lv > 0.02) steamDots(path, nk.steam, Math.round(3 + 7 * Math.min(1, lv)), PHONE ? 3.2 : 4.4);
    drawShaft(L.tx, L.gx, L.ty, nk.ang);
    drawTurbine(L.tx, L.ty, L.tr, nk.ang, true);
    drawGen(L.gx, L.gy, L.gr, nk.ang, true);
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.gx + L.gr, L.gy); ctx.lineTo(L.px, L.gy); ctx.lineTo(L.px, TY - 108); ctx.stroke();
    drawGrid(L.px, L.hx, TY, clamp(n, 0, 1));
    T(14, PHONE ? 20 : 24, '☢️ 핵분열로 전기를 만드는 원자력 발전소', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    if (nk.off) D.label(CORE.x + CORE.w / 2, CORE.y + CORE.h / 2, '반응이 멈췄어요! 제어봉을 올리고 재가동해요', { bg: '#394258', size: 14 });
    if (nk.scram > 0) D.label(CORE.x + CORE.w / 2, CORE.y + CORE.h / 2 + (nk.off ? 36 : 0), '⚠ 출력이 너무 커서 자동 정지: 제어봉이 모두 내려와요', { bg: '#e2464b', size: 13.5 });
    drawNukeData();
    parts.update(dt); parts.draw(ctx);
  }
  function drawNukeData() {
    const nk = S.nk, y = ROW_Y, h = VH - y - 10, k = kOf(nk.rod), P = nkP();
    const sw = PHONE ? VW - 24 : 458, sh = PHONE ? 130 : h;
    drawStrip(12, y, sw, sh, nk.hist, { title: '전기 출력의 변화', unit: 'MW (최근 40초)', ymax: 1600, ystep: PHONE ? 800 : 400, tWin: 40, target: NU_P0, targetLabel: '정격 ' + NU_P0 + ' MW', band: [900, 1100], color: '#7c3aed', left: 46 });
    const px = PHONE ? 12 : 482, py = PHONE ? y + sh + 8 : y, pw = PHONE ? VW - 24 : VW - 494, ph = PHONE ? h - sh - 8 : h;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 22, '연쇄 반응', 13.5, '#26324a', 'left', 800);
    const st = nk.off ? '꺼짐' : Math.abs(k - 1) < 0.005 ? '일정하게 유지' : k > 1 ? '점점 커져요' : '점점 줄어요';
    const col = nk.off ? '#98a2b3' : Math.abs(k - 1) < 0.005 ? '#14a058' : k > 1 ? '#e2464b' : '#2f6df6';
    D.label(px + pw - 14, py + 20, st, { bg: col, size: 12.5, align: 'right' });
    const lines = [
      ['제어봉', Math.round(nk.rod * 100) + ' % 삽입'],
      ['연쇄 반응 k', k.toFixed(2) + (k > 1.005 ? ' (>1)' : k < 0.995 ? ' (<1)' : ' (=1)')],
      ['전기 출력', P + ' MW'],
      ['자유 중성자', nk.neu.length + '개'],
    ];
    lines.forEach((l, i) => { const yy = py + 48 + i * (PHONE ? 20 : 26); T(px + 14, yy, l[0], PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800); T(px + pw - 14, yy, l[1], PHONE ? 13 : 15, '#26324a', 'right', 800); });
    if (!PHONE) textBlock(px + 14, py + 48 + 4 * 26 + 8, pw - 28, 'k는 핵분열로 나온 중성자 중 다시 핵분열을 일으키는 중성자의 평균 수예요. k = 1이면 반응이 일정해요.', 12.5, '#5a6679', 17, 700);
  }
  $('#sRod').addEventListener('input', (e) => { Sound.tick(); setRod(+e.target.value / 100); });
  $('#bRestart').addEventListener('click', () => { Sound.click(); nkRestart(); });

  /* ================= ④ 비교 · 발표 ================= */
  const FUELS = [{ id: 'coal', name: '석탄', icon: '🪨' }, { id: 'gas', name: '천연가스', icon: '🔥' }, { id: 'nuke', name: '원자력', icon: '☢️' }];
  const BROWS = [
    { label: '같은 질량이 내는 열', sub: '(많은 순서)', opts: ['1위', '2위', '3위'], ans: [2, 1, 0] },
    { label: '이산화 탄소 배출', sub: '(전 과정, 예시)', opts: ['약 12 g/kWh', '약 490 g/kWh', '약 820 g/kWh'], vals: [12, 490, 820], ans: [2, 1, 0] },
    { label: '주요 문제', sub: '(환경 · 안전)', opts: ['이산화 탄소 · 미세먼지가 많아요', '이산화 탄소가 나오지만 석탄보다 적어요', '고준위 방사성 폐기물을 보관해야 해요'], ans: [0, 1, 2] },
  ];
  const boardLayout = () => PHONE
    ? { lx: 12, lw: 90, cx0: 108, cw: 120, y0: 50, hh: 36, rh: 72, gap: 4 }
    : { lx: 24, lw: 164, cx0: 196, cw: 192, y0: 48, hh: 40, rh: 58, gap: 6 };
  const cellRect = (r, c) => { const L = boardLayout(); return { x: L.cx0 + c * L.cw, y: L.y0 + L.hh + r * L.rh, w: L.cw - L.gap, h: L.rh - L.gap }; };
  const cmpFilled = () => S.cmp.cells.reduce((a, row) => a + row.filter((v) => v > 0).length, 0);
  const cmpRight = () => S.cmp.cells.reduce((a, row, r) => a + row.filter((v, c) => v > 0 && v - 1 === BROWS[r].ans[c]).length, 0);
  function drawCmpScene(dt) {
    const L = boardLayout(), cm = S.cmp;
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf0fa'); g.addColorStop(1, '#f7f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    T(14, PHONE ? 26 : 30, '📊 발전소 비교 보드: 칸을 눌러 채워요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    FUELS.forEach((f, c) => { const x = L.cx0 + c * L.cw; D.roundRect(x, L.y0, L.cw - L.gap, L.hh - 6, 10); ctx.fillStyle = '#394258'; ctx.fill(); T(x + (L.cw - L.gap) / 2, L.y0 + (L.hh - 6) / 2 + 6, f.icon + ' ' + f.name, PHONE ? 13 : 16, '#fff', 'center', 800); });
    BROWS.forEach((row, r) => {
      const y = L.y0 + L.hh + r * L.rh;
      D.roundRect(L.lx, y, L.lw, L.rh - L.gap, 10); ctx.fillStyle = '#e4e9f3'; ctx.fill();
      const ls = wrap(row.label, L.lw - 16, PHONE ? 12 : 13.5, 800);
      ls.forEach((s, i) => T(L.lx + 8, y + 18 + i * (PHONE ? 15 : 16), s, PHONE ? 12 : 13.5, '#26324a', 'left', 800));
      if (row.sub && ls.length < 3) T(L.lx + 8, y + 22 + ls.length * (PHONE ? 15 : 16), row.sub, 12, '#5a6679', 'left', 700);
      FUELS.forEach((f, c) => {
        const rc = cellRect(r, c), v = cm.cells[r][c], bad = cm.bad[r + '' + c];
        D.shadow(() => { D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
        ctx.lineWidth = bad ? 3 : 2; ctx.strokeStyle = bad ? '#e2464b' : v ? '#9bb3e8' : '#d3dae6'; if (!v) ctx.setLineDash([5, 5]); D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.stroke(); ctx.setLineDash([]);
        if (!v) { T(rc.x + rc.w / 2, rc.y + rc.h / 2 + 5, '누르기', 13, '#b0bacb', 'center', 700); return; }
        const txt = row.opts[v - 1];
        if (r === 2) { const ls2 = wrap(txt, rc.w - 14, PHONE ? 11.5 : 13, 800); const y0 = rc.y + rc.h / 2 - (ls2.length - 1) * (PHONE ? 7.5 : 8) + 4; ls2.forEach((s, i) => T(rc.x + rc.w / 2, y0 + i * (PHONE ? 15 : 16), s, PHONE ? 11.5 : 13, '#26324a', 'center', 800)); }
        else if (r === 1) {
          T(rc.x + rc.w / 2, rc.y + (PHONE ? 26 : 22), txt, PHONE ? 13 : 15, '#26324a', 'center', 800);
          const bw = rc.w - 24, bx = rc.x + 12, by = rc.y + rc.h - (PHONE ? 22 : 17), val = row.vals[v - 1];
          D.roundRect(bx, by, bw, 10, 5); ctx.fillStyle = '#eef1f7'; ctx.fill();
          const wv = bw * val / 820; D.roundRect(bx, by, wv, 10, 5); ctx.fillStyle = '#5a6475'; ctx.fill();
        } else T(rc.x + rc.w / 2, rc.y + rc.h / 2 + 8, txt, PHONE ? 20 : 24, '#26324a', 'center', 800);
      });
    });
    T(PHONE ? 12 : 24, L.y0 + L.hh + 3 * L.rh + 14, '※ 우라늄-235 1 g이 내는 열은 석탄 약 3톤을 태울 때와 비슷해요 (예시).', PHONE ? 11.5 : 13, '#5a6679', 'left', 700);
    drawCmpData();
    parts.update(dt); parts.draw(ctx);
  }
  const CARD = {
    coal: [
      ['원리', ['석탄을 태운 열로 물을 끓여 수증기로 터빈을 돌려요', '석탄이 쪼개질 때 나오는 열로 물을 끓여요', '석탄의 화학 반응으로 터빈이 직접 돌아가요'], 0],
      ['장점', ['이산화 탄소가 전혀 나오지 않아요', '연료가 무한히 있어요', '연료 값이 비교적 싸고 날씨와 상관없이 안정적으로 전기를 만들어요'], 2],
      ['단점', ['이산화 탄소와 미세먼지가 많이 나오고 열의 약 60 %가 버려져요', '고준위 방사성 폐기물이 나와요', '열효율이 90 %라서 연료가 많이 필요해요'], 0],
      ['우리나라 현황', ['우리나라에서는 쓰지 않아요', '우리나라 발전량의 약 1/3을 차지해요 (해마다 달라져요)', '우리나라 발전량의 거의 전부예요'], 1],
      ['내 의견의 근거', ['석탄은 값이 싸니까 환경 문제는 없어요', '석탄은 그냥 싫으니까 모두 없애야 해요', '전기 1 kWh당 이산화 탄소가 약 820 g 나오므로 효율을 높이고 배출을 줄일 방안이 필요해요'], 2],
    ],
    nuke: [
      ['원리', ['우라늄이 불에 타서 열을 내요', '우라늄이 핵분열할 때 나오는 열로 물을 끓여 터빈을 돌려요', '수소가 헬륨으로 핵융합하며 열을 내요'], 1],
      ['장점', ['발전 중 이산화 탄소를 거의 직접 내보내지 않고 적은 연료로 많은 열을 얻어요', '폐기물이 전혀 나오지 않아요', '사고 위험이 전혀 없어요'], 0],
      ['단점', ['핵폭탄처럼 폭발해요', '석탄보다 이산화 탄소를 훨씬 많이 내요', '고준위 방사성 폐기물을 오래 보관하고 사고에 대비해야 해요'], 2],
      ['우리나라 현황', ['우리나라 발전량의 약 1/4을 차지해요 (해마다 달라져요)', '우리나라 발전량의 약 90 %예요', '우리나라에는 하나도 없어요'], 0],
      ['내 의견의 근거', ['원전은 무조건 좋으니 더 지으면 돼요', '전 과정 이산화 탄소가 약 12 g/kWh로 적지만 폐기물 보관 대책도 함께 따져야 해요', '원전은 무조건 나쁘니 당장 없애야 해요'], 1],
    ],
  };
  const cardSel = [];
  const cardRows = $('#cardRows');
  function buildCardRows() {
    cardRows.innerHTML = ''; cardSel.length = 0;
    CARD[S.cmp.fuel].forEach((f, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + f[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', f[0]);
      sel.innerHTML = '<option value="">— 고르기 —</option>' + f[1].map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
      const cur = S.cmp.sel[S.cmp.fuel][i]; if (cur !== undefined && cur !== '') sel.value = cur;
      sel.addEventListener('change', () => { S.cmp.sel[S.cmp.fuel][i] = sel.value; sel.classList.remove('ok', 'bad'); delete S.cmp.selOK[S.cmp.fuel + i]; Sound.click(); });
      row.appendChild(sel); cardRows.appendChild(row); cardSel.push(sel);
    });
  }
  const cardRight = (fuel) => CARD[fuel].filter((f, i) => S.cmp.sel[fuel][i] !== undefined && S.cmp.sel[fuel][i] !== '' && +S.cmp.sel[fuel][i] === f[2]).length;
  const cardChosen = (fuel) => CARD[fuel].filter((f, i) => S.cmp.sel[fuel][i] !== undefined && S.cmp.sel[fuel][i] !== '').length;
  $$('#cardFuel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cmp.fuel = b.dataset.v; buildCardRows(); updateCtl(); }));
  function resetBoard() { S.cmp.cells = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; S.cmp.bad = {}; }
  $('#bBoardClear').addEventListener('click', () => { Sound.click(); resetBoard(); });
  view.canvas.addEventListener('click', (e) => {
    if (S.mode !== 'cmp') return;
    const p = view.toLocal(e);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const rc = cellRect(r, c);
      if (p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h) { S.cmp.cells[r][c] = (S.cmp.cells[r][c] + 1) % 4; delete S.cmp.bad[r + '' + c]; Sound.click(); return; }
    }
  });
  function drawCmpData() {
    const cm = S.cmp, L = boardLayout(), y = L.y0 + L.hh + 3 * L.rh + 28, h = VH - y - 10;
    // 발전량 비중 (예시)
    const shh = PHONE ? 72 : 70;
    panel(12, y, VW - 24, shh, 14);
    T(26, y + 22, '우리나라 발전량 비중 (예시, 해마다 달라져요)', 13, '#26324a', 'left', 800);
    const SHARE = [['석탄', 1 / 3, '#5a6475', '약 1/3'], ['천연가스', 1 / 4, '#f2873a', '약 1/4'], ['원자력', 1 / 4, '#7c3aed', '약 1/4'], ['신재생', 1 / 10, '#14a058', '약 1/10']];
    const bx = 26, bw = VW - 52, by = y + 32, bh = 18; let acc = 0;
    D.roundRect(bx, by, bw, bh, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, bh, 7); ctx.clip();
    SHARE.forEach((s) => { ctx.fillStyle = s[2]; ctx.fillRect(bx + bw * acc, by, bw * s[1], bh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + bw * acc, by, bw * s[1], bh); acc += s[1]; });
    ctx.restore();
    acc = 0;
    SHARE.forEach((s) => { const cx = bx + bw * (acc + s[1] / 2); T(cx, by + bh + 15, s[0] + ' ' + s[3], PHONE ? 11 : 12.5, '#3a465c', 'center', 800); acc += s[1]; });
    // 발표 카드 미리보기 (고른 문장은 맞는지 틀린지 알려 주지 않고 보여 줘요)
    const py = y + shh + 8, ph = h - shh - 8;
    panel(12, py, VW - 24, ph, 14);
    const fuel = cm.fuel;
    T(26, py + 24, '📝 발표 카드: ' + (fuel === 'coal' ? '🪨 석탄 화력 발전' : '☢️ 원자력 발전'), 14, '#26324a', 'left', 800);
    const rowH = Math.min(PHONE ? 30 : 28, (ph - 40) / 5);
    CARD[fuel].forEach((f, i) => {
      const v = cm.sel[fuel][i], has = v !== undefined && v !== '';
      const yy = py + 42 + i * rowH;
      D.label(26, yy + rowH / 2 - 2, f[0], { bg: has ? '#394258' : '#c7d0de', size: 11.5, align: 'left', pad: 7 });
      let txt = has ? f[1][+v] : '(고르기)';
      const tx = PHONE ? 134 : 148, maxW = VW - 26 - tx;
      ctx.save(); ctx.font = D.font(PHONE ? 12 : 12.5, 800);
      if (ctx.measureText(txt).width > maxW) { while (txt.length > 3 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1); txt += '…'; }
      ctx.restore();
      T(tx, yy + rowH / 2 + 3, txt, PHONE ? 12 : 12.5, has ? '#26324a' : '#98a2b3', 'left', 800);
    });
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'flow') {
      L1 = '놓은 카드'; a = flowPlaced() + ' / 6'; L2 = '빈 칸'; b = (6 - flowPlaced()) + '개'; L3 = '에너지 형태'; c = S.fl.ok ? '화학·핵 → 열 → 운동 → 전기' : '순서를 맞춰 보세요';
    } else if (S.mode === 'coal') {
      const k = S.coal, P = coalP();
      L1 = '석탄 투입'; a = k.fuel.toFixed(1) + ' t/시간'; L2 = '전기 출력'; b = P.toFixed(1) + ' MW'; L3 = '버려지는 열'; c = (k.Q - P).toFixed(1) + ' MW';
    } else if (S.mode === 'nuke') {
      const nk = S.nk;
      L1 = '제어봉'; a = Math.round(nk.rod * 100) + ' % 삽입'; L2 = '연쇄 반응 k'; b = kOf(nk.rod).toFixed(2); L3 = '전기 출력'; c = nkP() + ' MW';
    } else {
      L1 = '채운 칸'; a = cmpFilled() + ' / 9'; L2 = '빈 칸'; b = (9 - cmpFilled()) + '개'; L3 = '발표 카드'; c = cardChosen(S.cmp.fuel) + ' / 5 선택';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  let coalOK = 0, nkOK = 0;
  const levels = [
    {
      title: '발전 원리: 열이 전기가 되기까지', short: '발전 원리', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 발전소는 어떤 에너지를 어떻게 전기로 바꿀까? 우리 삶에 어떤 영향을 줄까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 에너지가 여러 형태로 바뀐다는 것을, 앞 차시 <b>‘전자기 유도와 발전기’</b>에서는 터빈이 발전기를 돌려 운동 에너지가 전기 에너지로 바뀐다는 것을 배웠어요. 그런데 터빈은 무엇이 돌릴까요?</div>' +
        '<p>화력·원자력 발전소는 <b>열</b>로 물을 끓여 만든 <b>수증기</b>로 터빈을 돌려요. 여섯 장의 카드를 끌어 발전소의 흐름을 완성해 봐요.</p>',
      features: ['flow'],
      setup() { resetFlow(false); S.part = ''; setScene('flow'); },
      recap: '발전소는 열원 → 보일러 → 수증기 → 터빈 → 발전기 → 송전의 순서로 에너지를 열에서 운동으로, 다시 전기로 바꿔요.',
      summary: '<ul><li>발전소의 공통 구조: <b>열원 → 물을 가열(보일러) → 고온·고압 수증기 → 터빈 회전 → 발전기 → 전기 송전</b></li><li>에너지 전환: <b>화학 에너지(화석 연료) · 핵에너지 → 열에너지 → 운동 에너지 → 전기 에너지</b></li><li>터빈을 돌리는 것은 <b>수증기의 운동</b>이고, 발전기가 전기를 만드는 원리는 <b>전자기 유도</b>예요.</li><li>열원으로 화석 연료(석탄·석유·천연가스)나 핵연료(우라늄)를 써요.</li></ul>',
      missions: [
        {
          title: '발전소 흐름도 완성하기', manual: true,
          goal: '에너지가 만들어져 전기로 우리 집까지 오는 <b>순서대로</b> 여섯 장의 카드를 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '맨 앞은 열을 내는 것, 맨 뒤는 전기를 멀리 보내는 일이에요. 터빈은 수증기가 돌리고, 발전기는 터빈이 돌려요.',
          setup() { resetFlow(true); S.part = ''; setScene('flow'); },
          check() {
            const f = S.fl, empty = 6 - flowPlaced();
            if (empty > 0) return '아직 빈 칸이 ' + empty + '개 있어요. 카드를 모두 놓아 보세요.';
            const wrongs = f.cards.filter((c) => c.loc.k === 'slot' && c.loc.i !== c.id);
            if (wrongs.length) { wrongs.forEach((c) => { if (!f.bad[c.id]) { f.bad[c.id] = true; } }); return '빨간 칸의 카드 순서가 달라요. 열이 전기가 되기까지 무엇이 무엇을 움직이는지 생각해 보세요.'; }
            return true;
          },
          status: () => '놓은 카드 ' + flowPlaced() + ' / 6',
          explain: '<b>열원(연료) → 보일러(물을 가열) → 수증기 → 터빈 → 발전기 → 송전</b> 순서예요. 열에너지로 만든 수증기가 터빈을 돌려 운동 에너지가 되고, 발전기가 이를 전기 에너지로 바꿔요.',
        },
        {
          type: 'quiz', title: '발전기가 전기를 만드는 원리',
          goal: '터빈이 돌 때 발전기가 <b>전기를 만드는 원리</b>는?',
          setup() { S.part = ''; setScene('flow'); },
          choices: ['전자기 유도: 자석(또는 코일)이 돌면 코일을 지나는 자기장이 변해 전류가 유도돼요', '수증기가 전선을 타고 그대로 흘러가요', '터빈 속의 전지가 전기를 만들어요', '연료가 타면서 전기가 직접 나와요'],
          answer: 0,
          feedback: ['', '수증기는 터빈만 돌려요. 전선에는 흐르지 않아요.', '발전기에는 전지가 없어요. 앞 차시에서 코일과 자석만으로 전기를 만들었죠?', '연료가 타면 열이 나요. 열은 수증기와 터빈을 거쳐 전기가 돼요.'],
          explain: '수증기의 운동이 터빈을 돌리고, 터빈이 발전기의 자석(또는 코일)을 돌려요. 코일을 지나는 자기장이 변하면서 <b>전자기 유도</b>로 전류가 생겨요.',
        },
      ],
    },
    {
      title: '화력 발전: 석탄을 얼마나 태울까?', short: '화력 발전', icon: '🔥', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 발전소는 열원의 열로 물을 끓여 터빈을 돌린다고 정리했어요. 화력 발전소에서 열원은 <b>화석 연료</b>예요.</div>' +
        '<p>석탄 1 kg이 탈 때 약 <b>2.4×10⁷ J</b>의 열이 나와요. 이 열 중 전기가 되는 비율(<b>열효율</b>)을 <b>40 %</b>로 하여, 연료량에 따라 전기 출력과 배출이 어떻게 변하는지 실험해요.</p>',
      features: ['coal'],
      setup() { S.coal.fuel = 20; S.coal.hist.length = 0; S.part = ''; setScene('coal'); },
      recap: '화력 발전은 연료 에너지의 약 40 %만 전기가 되고 나머지 약 60 %는 냉각수와 굴뚝으로 버려져요. 화석 연료를 태우면 이산화 탄소도 나와요.',
      summary: '<ul><li><b>화력 발전</b>: 석탄·석유·천연가스(LNG)를 태운 열로 수증기를 만들어 터빈을 돌려요.</li><li>열효율 약 <b>40 %</b>(석탄 기준, 복합 화력은 약 55 %): 연료 에너지 100 중 전기 40, <b>버려지는 열 60</b></li><li>예) 석탄 37.5 t/시간 → 연료 에너지 250 MW → 전기 <b>100 MW</b> + 버려지는 열 150 MW</li><li>이산화 탄소 · 황산화물 · 질소산화물 · 미세먼지가 배출돼요. 이산화 탄소는 <b>온실 효과를 강화</b>해요.</li></ul>',
      missions: [
        {
          title: '전기 출력 100 MW 맞추기',
          goal: '석탄 투입량을 조절해 전기 출력을 <b>100 MW(±1 MW)</b>로 만들고 1초 동안 유지하세요.',
          hint: '전기 = 연료 에너지 × 0.4예요. 100 MW의 전기를 얻으려면 연료 에너지가 몇 MW여야 할까요? 석탄 1 t/시간은 연료 에너지 약 6.67 MW예요. −, + 버튼으로 0.5씩 조절해요.',
          setup() { S.part = ''; setScene('coal'); },
          check: () => Math.abs(coalP() - P_TARGET) <= P_TOL,
          hold: 1.0,
          status: () => '전기 ' + coalP().toFixed(1) + ' MW · 석탄 ' + S.coal.fuel.toFixed(1) + ' t/시간 ' + (Math.abs(coalP() - P_TARGET) <= P_TOL ? '✅' : '⬜'),
          explain: '필요한 연료 에너지는 100 ÷ 0.4 = <b>250 MW</b>이고, 석탄 1 t/시간이 약 6.67 MW이므로 250 ÷ 6.67 = <b>37.5 t/시간</b>이에요. 이때 <b>150 MW의 열은 버려져요</b>.',
        },
        {
          type: 'quiz', title: '버려지는 열과 환경',
          goal: '화력 발전소의 열 중 많은 양이 버려지고 환경에도 영향을 줘요. 옳은 설명은?',
          setup() { S.part = ''; setScene('coal'); },
          choices: ['열의 일부만 터빈을 돌리는 데 쓰이고 나머지는 냉각수·굴뚝으로 버려져요. 또 화석 연료를 태우면 이산화 탄소가 나와 온실 효과를 강화해요', '연료를 태울 때 에너지가 사라져서 전기가 적게 나와요', '버려지는 열은 없고 이산화 탄소도 나오지 않아요', '버려지는 열은 송전선 때문에만 생겨요'],
          answer: 0,
          feedback: ['', '에너지는 사라지지 않아요. 쓰이지 못하고 흩어지는 열이 있을 뿐이에요.', '그래프에서 전기 40 %, 열 60 %를 확인했죠? 이산화 탄소 배출 막대도 보았어요.', '버려지는 열은 발전소 안에서 냉각수와 굴뚝으로 나가요.'],
          explain: '연소열의 약 <b>60 %</b>는 냉각수와 굴뚝으로 버려져 열효율이 약 40 %예요. 또 석탄 발전은 전기 1 kWh당 이산화 탄소가 약 <b>820 g</b> 나와 <b>온실 효과를 강화</b>해요.',
        },
      ],
    },
    {
      title: '원자력 발전: 연쇄 반응 다루기', short: '원자력 발전', icon: '☢️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화력 발전의 열원은 연료를 태우는 불이었어요. 원자력 발전의 열원은 <b>우라늄 핵이 쪼개지는 핵분열</b>이에요. 태양의 핵융합처럼 핵분열에서도 질량이 약간 줄며 큰 에너지가 나와요.</div>' +
        '<p>우라늄-235 핵이 <b>중성자</b>를 흡수하면 쪼개지며 중성자 2~3개와 열을 내요. 이 중성자가 다른 핵을 또 쪼개는 것이 <b>연쇄 반응</b>이에요. <b>제어봉</b>으로 반응 속도를 조절해 봐요.</p>',
      features: ['nuke'],
      setup() { nkRestart(); S.nk.rodSet = 1; S.nk.rod = 1; nkOK = 0; S.part = ''; setScene('nuke'); },
      recap: '원자로에서는 중성자가 핵을 쪼개는 연쇄 반응으로 열이 나와요. 제어봉이 중성자를 흡수해 반응 속도를 조절하므로 핵폭탄처럼 터지지 않아요.',
      summary: '<ul><li><b>핵분열</b>: 우라늄-235 핵이 중성자를 흡수해 쪼개지며 중성자 2~3개와 큰 열이 나와요. 이때 질량이 약간 줄어 에너지로 바뀌어요.</li><li><b>연쇄 반응</b>: 나온 중성자가 다른 핵을 계속 쪼개요. k > 1이면 반응이 커지고, k = 1이면 일정하며, k < 1이면 줄어요.</li><li><b>제어봉</b>은 중성자를 흡수해 반응 속도를 조절해요. 깊이 넣을수록 반응이 줄어요.</li><li>발전 중에는 이산화 탄소를 거의 직접 배출하지 않지만, 고준위 방사성 폐기물의 장기 보관과 사고 대비가 필요해요.</li></ul>',
      missions: [
        {
          title: '연쇄 반응 유지하며 출력 일정하게',
          goal: '전기 출력을 <b>900~1100 MW</b>로 올린 뒤, 반응이 <b>일정하게</b> 유지되도록 제어봉을 맞춰 3초 동안 유지하세요.',
          hint: '처음에는 제어봉이 모두 들어가 있어 반응이 줄어들어요. 제어봉을 올리면 출력이 커져요. 출력이 1000 MW 가까이 오르면, 출력이 더 변하지 않는 제어봉 위치(k = 1)를 찾아요. 너무 커지면 자동 정지돼요.',
          setup() { nkOK = 0; S.part = ''; setScene('nuke'); },
          check: () => { const P = nkP(); return !S.nk.off && P >= 900 && P <= 1100 && Math.abs(nkDP()) <= 30; },
          hold: 3.0,
          status: () => '출력 ' + nkP() + ' MW · 변화 ' + (nkDP() >= 0 ? '+' : '−') + Math.abs(nkDP()).toFixed(0) + ' MW/초 ' + (!S.nk.off && nkP() >= 900 && nkP() <= 1100 && Math.abs(nkDP()) <= 30 ? '✅' : '⬜'),
          explain: '제어봉을 <b>50 %</b> 넣었을 때 k = 1.00이라 새로 쪼개지는 핵의 수가 일정해져 출력이 변하지 않아요. 그보다 덜 넣으면 k > 1이라 반응이 커지고, 더 넣으면 k < 1이라 줄어들어요.',
        },
        {
          type: 'quiz', title: '제어봉의 역할',
          goal: '원자로의 제어봉에 대한 설명으로 옳은 것은?',
          setup() { S.part = ''; setScene('nuke'); },
          choices: ['중성자를 흡수해 연쇄 반응의 속도를 조절해요. 핵발전소는 연쇄 반응을 제어해서 핵폭탄처럼 터지지 않아요', '우라늄 핵을 더 많이 쪼개서 반응을 빠르게 해요', '터빈을 직접 돌려 전기를 만들어요', '원자로 안의 열을 모두 없애 버려요'],
          answer: 0,
          feedback: ['', '제어봉은 반대로 중성자를 흡수해 반응을 줄여요.', '터빈은 수증기가 돌려요. 제어봉은 반응 속도를 조절해요.', '열은 수증기를 만들어 터빈을 돌리는 데 쓰여요. 제어봉은 열이 아니라 중성자를 다뤄요.'],
          explain: '제어봉은 <b>중성자를 흡수</b>해 k를 조절해요. 발전소의 연료는 핵폭탄보다 분열하는 핵의 비율이 훨씬 낮고, 연쇄 반응이 항상 <b>제어</b>되기 때문에 핵폭탄처럼 터지지 않아요.',
        },
      ],
    },
    {
      title: '비교·발표: 균형 있는 근거로 말하기', short: '비교·발표', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화력 발전과 원자력 발전의 원리를 살펴봤어요. 이제 석탄 · 천연가스 · 원자력이 우리 생활과 환경에 주는 영향을 <b>근거</b>와 함께 비교해 발표 자료를 만들어요.</div>' +
        '<p>어느 쪽이 무조건 좋다고 결론짓지 않고, <b>장점 · 단점 · 따져 볼 점</b>을 사실에 근거해 정리하는 것이 목표예요.</p>',
      features: ['cmp'],
      setup() { resetBoard(); S.cmp.sel = { coal: {}, nuke: {} }; S.cmp.selOK = {}; S.cmp.fuel = 'nuke'; buildCardRows(); S.part = 'board'; setScene('cmp'); },
      recap: '석탄은 이산화 탄소·미세먼지, 천연가스는 석탄보다 적은 이산화 탄소, 원자력은 방사성 폐기물이 핵심 쟁점이에요. 근거를 함께 말할 때 설득력이 있어요.',
      summary: '<ul><li>같은 질량이 내는 열: <b>원자력 > 천연가스 > 석탄</b> (우라늄-235 1 g ≈ 석탄 약 3톤)</li><li>전기 생산 전 과정의 이산화 탄소(예시): 석탄 약 <b>820</b> g/kWh, 천연가스 약 <b>490</b> g/kWh, 원자력 약 <b>12</b> g/kWh</li><li>주요 문제: 석탄 — 이산화 탄소·미세먼지, 천연가스 — 이산화 탄소(석탄보다 적음), 원자력 — 고준위 방사성 폐기물·사고 대비</li><li>발표할 때는 <b>사실(근거)</b>과 <b>가치 판단</b>을 구분하고, 장점과 단점을 함께 제시해요.</li></ul>',
      missions: [
        {
          title: '발전소 비교 보드 채우기', manual: true,
          goal: '보드의 아홉 칸을 눌러 <b>질량당 열 순위 · 이산화 탄소 배출 · 주요 문제</b>를 알맞게 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '질량당 열은 우라늄-235 1 g이 석탄 약 3톤과 비슷하다는 사실을 떠올려요. 배출량은 화석 연료일수록 커요. 천연가스는 석탄과 원자력의 중간이에요.',
          setup() { S.part = 'board'; setScene('cmp'); updateCtl(); },
          check() {
            const cm = S.cmp, empty = 9 - cmpFilled();
            if (empty > 0) return '아직 빈 칸이 ' + empty + '개 있어요.';
            let bad = 0;
            cm.cells.forEach((row, r) => row.forEach((v, c) => { const ok = v - 1 === BROWS[r].ans[c]; if (!ok) { bad++; cm.bad[r + '' + c] = true; } else delete cm.bad[r + '' + c]; }));
            if (bad) return '빨간 칸이 ' + bad + '개 틀렸어요. 표의 사실(우라늄 1 g ≈ 석탄 3톤, 이산화 탄소 g/kWh)을 떠올려 보세요.';
            return true;
          },
          status: () => '채운 칸 ' + cmpFilled() + ' / 9',
          explain: '질량당 열은 <b>원자력 > 천연가스 > 석탄</b>이고, 이산화 탄소는 석탄 약 820 > 천연가스 약 490 > 원자력 약 12 g/kWh예요. 주요 문제는 석탄은 이산화 탄소·미세먼지, 천연가스는 석탄보다 적은 이산화 탄소, 원자력은 <b>고준위 방사성 폐기물</b>이에요.',
        },
        {
          title: '조사 발표 카드 만들기', manual: true,
          goal: '석탄 화력이나 원자력 중 <b>하나를 골라</b> 원리 · 장점 · 단점 · 우리나라 현황 · 내 의견의 근거를 모두 알맞게 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사실과 맞는 문장을 골라요. 폐기물이 전혀 없다거나 무조건 좋다/나쁘다는 식의 문장은 근거가 부족해요. 마지막 칸은 장점과 한계를 함께 말하는 문장이에요.',
          setup() { S.part = 'card'; buildCardRows(); setScene('cmp'); updateCtl(); },
          check() {
            const fuel = S.cmp.fuel, miss = CARD[fuel].filter((f, i) => S.cmp.sel[fuel][i] === undefined || S.cmp.sel[fuel][i] === '');
            if (miss.length) return '아직 고르지 않은 항목이 ' + miss.length + '개 있어요.';
            let bad = 0;
            CARD[fuel].forEach((f, i) => {
              const ok = +S.cmp.sel[fuel][i] === f[2];
              if (!ok) bad++;
              if (!ok && S.cmp.selOK[fuel + i] !== false) { cardSel[i].classList.remove('ok', 'bad'); void cardSel[i].offsetWidth; cardSel[i].classList.add('bad'); }
              if (ok) { cardSel[i].classList.remove('bad'); cardSel[i].classList.add('ok'); }
              S.cmp.selOK[fuel + i] = ok;
            });
            if (bad) return '빨간 항목이 ' + bad + '개 있어요. 사실과 맞는지, 한쪽으로만 치우치지 않았는지 살펴보세요.';
            return true;
          },
          status: () => '고른 항목 ' + cardChosen(S.cmp.fuel) + ' / 5',
          explain: '좋은 발표는 <b>원리 → 장점 → 단점 → 우리나라 현황 → 근거 있는 의견</b>으로 이어져요. 의견은 “무조건 좋다/나쁘다”가 아니라 <b>수치와 사실</b>을 근거로 장점과 한계를 함께 말해요.',
        },
        {
          type: 'quiz', title: '균형 있는 근거 판단',
          goal: '발전소에 대한 의견 중 <b>근거가 가장 균형 있는 것</b>은?',
          setup() { S.part = ''; setScene('cmp'); updateCtl(); },
          choices: ['원전은 위험하므로 무조건 모두 없애야 해요', '석탄 발전은 이산화 탄소가 약 820 g/kWh, 원자력은 약 12 g/kWh라서 배출 면에서는 원자력이 적지만, 폐기물 보관 문제도 함께 따져야 해요', '석탄은 값이 싸니까 환경은 신경 쓰지 않아도 돼요', '전기는 어디서 만들든 똑같으니 비교할 필요가 없어요'],
          answer: 1,
          feedback: ['근거 없이 한쪽으로만 결론을 내렸어요. 사실(수치)과 한계를 함께 말해야 해요.', '', '값이 싸다는 장점만 말하고 환경 영향이라는 단점을 무시했어요.', '발전 방식마다 이산화 탄소 배출, 폐기물, 안정성이 달라서 비교가 필요해요.'],
          explain: '균형 있는 의견은 <b>수치 같은 근거</b>와 <b>장점·단점</b>을 모두 말해요. 어느 한쪽이 무조건 좋다고 결론짓지 않고, 우리 사회가 무엇을 더 중요하게 생각하는지 함께 이야기하는 것이 협력적 소통이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-power-plant', mount: '#game', badge: '발전소 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { flow: '🧩 발전소 흐름 카드', coal: '🔥 석탄 투입량 · 전력 그래프 · 배출', nuke: '☢️ 핵분열 연쇄 반응 · 제어봉', cmp: '📊 비교 보드 · 조사 발표 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetFlow(false); resetBoard(); nkInit(); buildCardRows();
  S.coal.Qraw = S.coal.fuel * FUEL_MW; S.coal.Q = Math.round(S.coal.Qraw * 2) / 2;
  setScene('flow'); updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepFlow(dt);
    if (S.mode === 'flow') drawFlowScene(dt);
    else if (S.mode === 'coal') { stepCoal(dt); drawCoalScene(dt); }
    else if (S.mode === 'nuke') { stepNuke(dt); drawNukeScene(dt); }
    else drawCmpScene(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, CORE, get game() { return game; }, setScene, resetFlow, slotRect, trayRect, coalP, nkP, nkDP, setRod, nkRestart, kOf, cmpRight, cardRight, CARD, BROWS, cellRect, FUEL_MW, flowRight,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepFlow(0.02); if (S.mode === 'coal') stepCoal(0.02); else if (S.mode === 'nuke') stepNuke(0.02); } },
  };
})();
