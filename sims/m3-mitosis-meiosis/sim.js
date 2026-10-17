/* =========================================================
   중3 Ⅵ. 생식과 유전 — 염색체와 세포분열 [9과21-02]
   ① [모형] 세포 → 핵 → 염색체 → DNA → 유전자 확대 · 상동 염색체 짝 맞추기 · 성염색체(XX/XY)
   ② [모형] 체세포분열: 양파 뿌리 끝 가상 현미경 + 염색체 4개(2쌍)가 방추사에 끌려가는 모형 (4 → 4)
   ③ [모형] 생식세포 형성: 상동 염색체 짝짓기 → 1분열에서 분리 → 2분열에서 염색 분체 분리 (4 → 2, 4개 세포)
   ④ [설명] 비교표(분열 횟수·딸세포 수·염색체 수·짝짓기·역할) + 정자 23 + 난자 23 = 수정란 46
   ※ 시기 이름(전기·중기·후기·말기)은 작은 이름표로만 쓰고 암기를 요구하지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const W = 800, H = 540;
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eef1fb' });
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
  const TAU = Math.PI * 2;
  const pill = (x, y, text, o) => D.label(x, y, text, o);

  /* ---------- 안내 말풍선 · 계기판 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 5000);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }
  const shadeMemo = {};
  const dark = (c) => shadeMemo[c] || (shadeMemo[c] = CO.shade(c, -0.42));

  /* ---------- 염색체 그리기 ---------- */
  // 상동 염색체 4쌍: 쌍마다 색(색상)이 다르고, 아버지에게서 받은 것은 진한 색, 어머니에게서 받은 것은 연한 색
  const PAIRS = [
    { len: 150, c: 0.38, f: '#e8590c', m: '#fdaa5c', bands: [0.18, 0.5, 0.78] },
    { len: 122, c: 0.50, f: '#9333ea', m: '#c98cf7', bands: [0.25, 0.6, 0.85] },
    { len: 96, c: 0.30, f: '#0d9488', m: '#5eead4', bands: [0.4, 0.7] },
    { len: 72, c: 0.62, f: '#e11d48', m: '#fb7185', bands: [0.3, 0.55] },
  ];
  const toneOf = (pair, par) => (par === 0 ? PAIRS[pair].f : PAIRS[pair].m);
  function rodPoints(x, y, ang, len, c, cond, t, ph) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const a0 = -len * (1 - c), a1 = len * c;
    const amp = (1 - cond) * 6;
    const n = amp > 0.2 ? 10 : 2;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = a0 + (a1 - a0) * (i / n);
      const off = amp > 0.2 ? amp * Math.sin(i * 1.35 + ph + t * 1.7) * Math.sin(Math.PI * i / n) : 0;
      pts.push(x + dx * s - dy * off, y + dy * s + dx * off);
    }
    return pts;
  }
  function strokePts(pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  }
  // 염색 분체(막대) 하나: (x, y) = 동원체 위치, ang = 긴 팔 쪽 방향
  function drawRod(x, y, ang, len, c, w, col, o) {
    o = o || {};
    const cond = o.cond != null ? o.cond : 1, alpha = o.alpha != null ? o.alpha : 1;
    if (alpha < 0.02) return;
    const pts = rodPoints(x, y, ang, len, c, cond, o.t || 0, o.ph || 0);
    ctx.save();
    ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.lift) { ctx.shadowColor = 'rgba(30,20,70,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 7; }
    else if (!o.flat) { ctx.shadowColor = 'rgba(30,20,70,.22)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; }
    strokePts(pts); ctx.strokeStyle = dark(col); ctx.lineWidth = w + 3; ctx.stroke();
    ctx.shadowColor = 'transparent';
    strokePts(pts); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    if (w > 6) {
      ctx.save(); ctx.translate(-w * 0.18, -w * 0.18);
      strokePts(pts); ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = Math.max(1.2, w * 0.24); ctx.stroke();
      ctx.restore();
    }
    if (w > 6 && o.bands) {
      const dx = Math.cos(ang), dy = Math.sin(ang), a0 = -len * (1 - c), a1 = len * c;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.6; ctx.lineCap = 'butt';
      o.bands.forEach((b) => {
        const s = a0 + (a1 - a0) * b;
        ctx.beginPath(); ctx.moveTo(x + dx * s - dy * w * 0.4, y + dy * s + dx * w * 0.4); ctx.lineTo(x + dx * s + dy * w * 0.4, y + dy * s - dx * w * 0.4); ctx.stroke();
      });
    }
    if (w > 6) { // 동원체
      ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.strokeStyle = dark(col); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, w * 0.46, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // X자 모양(염색 분체 두 가닥)
  function drawX(x, y, ang, len, c, w, col, o) {
    drawRod(x, y, ang + 0.17, len, c, w, col, o);
    drawRod(x, y, ang - 0.17, len, c, w, col, Object.assign({}, o, { ph: (o && o.ph || 0) + 1.7 }));
  }

  /* ---------- 화면(장면) 전환 ---------- */
  const S = { scene: 'zoom', sceneA: 1, sexMode: 'f', sexSeen: { f: false, m: false }, comp: 'compare', gamete: 'meio', micro: 'micro' };
  const TB_LABEL = {
    zoom: '🔍 세포 속으로 확대', pair: '🧩 상동 염색체 짝 맞추기', micro: '🔬 가상 현미경: 양파 뿌리 끝', mito: '🧬 체세포분열 모형', meio: '🧬 생식세포 형성 모형', compare: '📋 두 분열 비교', fert: '🧬 수정: 정자 + 난자',
  };
  const BG = { zoom: '#e9eefb', pair: '#eef1fb', micro: '#e6e0ee', mito: '#eaf0fb', meio: '#eaf0fb', compare: '#eef1fb', fert: '#e9eefb' };
  function updateUI() {
    const sc = S.scene;
    const set = { zoom: 'zoom', pair: 'zoom', micro: 'mito', mito: 'mito', meio: 'meio', compare: 'comp', fert: 'comp' }[sc];
    ['zoom', 'mito', 'meio', 'comp'].forEach((k) => { $('#cs-' + k).hidden = k !== set; });
    $('#zoomRow').hidden = sc !== 'zoom';
    $('#sexRow').hidden = sc !== 'pair';
    $$('#zoomTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === sc));
    $('#mitoRow').hidden = sc !== 'mito';
    $$('#mitoTabs button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'micro') === (sc === 'micro')));
    $$('#compTabs button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'fert') === (sc === 'fert')));
    $('#fertRow').hidden = sc !== 'fert';
    $('#tableCard').hidden = sc !== 'compare';
    $('#readouts').hidden = sc === 'compare';
    $('#tbLabel').textContent = TB_LABEL[sc];
    view.wrap.style.setProperty('--stage-bg', BG[sc]);
    view.resize();
  }
  function setScene(name) {
    if (S.scene !== name) {
      S.scene = name; S.sceneA = 0;
      tween(S, { sceneA: 1 }, { duration: 0.45, ease: 'outCubic' });
    }
    updateUI();
  }

  /* =========================================================
     장면 1 · 확대: 세포 → 핵 → 염색체 → DNA → 유전자
     ========================================================= */
  const LV = ['세포', '핵', '염색체', 'DNA', '유전자'];
  const LV_DESC = [
    '세포 속에는 유전 물질이 들어 있는 핵이 있어요.',
    '핵 속에는 염색체가 들어 있어요. 사람의 체세포에는 46개가 있어요.',
    '염색체는 DNA와 단백질로 이루어져 있어요.',
    'DNA는 이중 나선 구조예요. 단백질에 감겨 염색체를 이루어요.',
    '유전자는 유전 정보를 담고 있는 DNA의 특정 부분이에요. (눌러 보세요)',
  ];
  const LV_RO = ['생물의 기본 단위', '유전 물질이 들어 있어요', 'DNA + 단백질', '유전 정보를 담은 물질', 'DNA의 특정 부분'];
  const zs = { zv: new Spring(0, { stiffness: 70, damping: 13 }), lv: 0, visited: [true, false, false, false, false], gene: [false, false, false, false], geneA: [0, 0, 0, 0], pulse: 0 };
  function zoomTo(k) {
    k = clamp(k, 0, 4);
    if (k === zs.lv) return;
    Sound.click();
    zs.lv = k; zs.zv.target = k; zs.visited[k] = true; zs.pulse = 1;
    syncZoomButtons();
  }
  function syncZoomButtons() {
    $('#zoomOut').disabled = zs.lv <= 0;
    $('#zoomIn').disabled = zs.lv >= 4;
    $('#zoomIn').classList.toggle('target', zs.lv < 4 && has('zoom'));
    $('#zoomNote').textContent = zs.lv < 4 ? '➕ 확대를 눌러 한 단계 더 들어가 봐요. (' + LV[zs.lv] + ' → ' + LV[zs.lv + 1] + ')' : '유전자 띠를 눌러 보세요. (축소하면 다시 되돌아가요)';
  }
  function resetZoom() {
    zs.lv = 0; zs.zv.target = 0; zs.zv.value = 0; zs.zv.velocity = 0; zs.visited = [true, false, false, false, false]; zs.gene = [false, false, false, false];
    syncZoomButtons();
  }
  const ZC = { x: 400, y: 290 };
  const GENES = [
    { x0: 70, x1: 230, col: '#2563eb', name: '유전자 ①' },
    { x0: 262, x1: 444, col: '#f59e0b', name: '유전자 ②' },
    { x0: 476, x1: 606, col: '#10b981', name: '유전자 ③' },
    { x0: 636, x1: 740, col: '#ec4899', name: '유전자 ④' },
  ];
  function helix(x0, x1, y, amp, wl, ph, rungs, cA, cB) {
    const n = Math.max(2, Math.round((x1 - x0) / 4));
    const pa = [], pb = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, s = Math.sin((x - x0) / wl * TAU + ph);
      pa.push(x, y + amp * s); pb.push(x, y - amp * s);
    }
    if (rungs) {
      ctx.lineWidth = Math.max(1.5, amp * 0.1); ctx.lineCap = 'round';
      for (let x = x0 + wl / 16; x < x1; x += wl / 8) {
        const s = Math.sin((x - x0) / wl * TAU + ph), c = Math.cos((x - x0) / wl * TAU + ph);
        ctx.strokeStyle = c > 0 ? 'rgba(90,100,130,.85)' : 'rgba(150,160,185,.6)';
        ctx.beginPath(); ctx.moveTo(x, y + amp * s); ctx.lineTo(x, y - amp * s); ctx.stroke();
      }
    }
    // 뒤에 있는 가닥을 먼저, 앞에 있는 가닥을 나중에 (깊이감)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      const pts = pass === 0 ? pa : pb;
      ctx.strokeStyle = pass === 0 ? cA : cB; ctx.lineWidth = Math.max(3, amp * 0.22);
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke();
    }
  }
  function drawZoomLevel(k, t) {
    const cx = ZC.x, cy = ZC.y;
    if (k === 0) { // 세포
      const R = 186;
      D.shadow(() => { ctx.fillStyle = '#e8eefc'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }, { blur: 18, y: 8 });
      const g = ctx.createRadialGradient(cx - 60, cy - 70, 20, cx, cy, R);
      g.addColorStop(0, '#fbfcff'); g.addColorStop(0.7, '#e3ebfb'); g.addColorStop(1, '#c9d8f6');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5b7fc7'; ctx.lineWidth = 8; ctx.stroke();
      [[-100, -80, 0.4], [96, -90, -0.6], [-96, 92, 0.9], [110, 70, 0.2], [20, 130, 1.4], [-30, -135, -0.2]].forEach(([dx, dy, a]) => {
        ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(a);
        ctx.fillStyle = 'rgba(255,196,120,.9)'; ctx.strokeStyle = 'rgba(200,120,40,.8)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(0, 0, 24, 11, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      });
      D.sphere(cx, cy, 64, '#a982e6', { shadow: true, outline: 'rgba(80,40,140,.6)', outlineWidth: 3 });
      ctx.fillStyle = 'rgba(70,30,130,.55)'; ctx.beginPath(); ctx.arc(cx + 10, cy + 8, 17, 0, TAU); ctx.fill();
      D.arrow(cx - 150, cy - 150, cx - 118, cy - 118, { color: '#5b7fc7', width: 3, head: 10 });
      pill(cx - 168, cy - 164, '세포막', { bg: '#5b7fc7', size: 15, pad: 12 });
      D.arrow(cx + 175, cy - 140, cx + 52, cy - 44, { color: '#7c3aed', width: 3, head: 11 });
      pill(cx + 188, cy - 156, '핵', { bg: '#7c3aed', size: 16, pad: 14 });
    } else if (k === 1) { // 핵
      const R = 196;
      D.shadow(() => { ctx.fillStyle = '#c9b3f5'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }, { blur: 16, y: 6 });
      const g = ctx.createRadialGradient(cx - 50, cy - 60, 20, cx, cy, R);
      g.addColorStop(0, '#f5efff'); g.addColorStop(0.75, '#e2d6fa'); g.addColorStop(1, '#b79df0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = 'rgba(124,58,237,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 10, 0, TAU); ctx.stroke();
      // 핵 속 염색체 (풀려 있어요): 8개만 그렸어요 (4쌍)
      const spots = [[-112, -64, 0, 0], [112, -76, 0, 1], [-124, 78, 1, 0], [100, 98, 1, 1], [-52, -128, 2, 0], [60, -132, 2, 1], [-44, 124, 3, 0], [2, 132, 3, 1]];
      spots.forEach(([dx, dy, p, par], i) => {
        const P = PAIRS[p];
        drawRod(cx + dx, cy + dy, 0.6 + i * 0.9, P.len * 0.42, P.c, 6.5, toneOf(p, par), { cond: 0.1, t, ph: i * 1.3, flat: true });
      });
      drawRod(cx, cy, Math.PI / 2, 62, PAIRS[0].c, 15, PAIRS[0].f, { cond: 1, bands: PAIRS[0].bands, flat: true });
      pill(cx, cy - R - 0 + 22, '핵 속에는 염색체가 들어 있어요', { bg: '#7c3aed', size: 14.5, pad: 12 });
    } else if (k === 2) { // 염색체
      const L = 186;
      D.glow(cx, cy, 250, '#fde68a', 0.35);
      [-1, 1].forEach((s, i) => {
        drawRod(cx, cy, Math.PI / 2 + s * 0.085, L, 0.5, 40, i ? '#f08a3c' : PAIRS[0].f, { cond: 1, flat: false });
      });
      // DNA가 감겨 있는 모습(줄무늬)
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = -4; i <= 4; i++) {
        [-1, 1].forEach((s) => {
          const yy = cy + i * 17 + (i > 0 ? 6 : -6);
          ctx.beginPath(); ctx.moveTo(cx + s * 17 - 13, yy + 5); ctx.quadraticCurveTo(cx + s * 17, yy - 7, cx + s * 17 + 13, yy + 5); ctx.stroke();
        });
      }
      ctx.restore();
      D.arrow(cx + 190, cy - 100, cx + 40, cy - 70, { color: '#c2410c', width: 3, head: 11 });
      pill(cx + 215, cy - 112, '염색체', { bg: '#c2410c', size: 16, pad: 14 });
      pill(cx + 210, cy + 120, 'DNA + 단백질', { bg: '#1b2333', size: 14.5, pad: 12 });
      pill(cx - 190, cy - 130, '염색 분체 2가닥', { bg: 'rgba(27,35,51,.85)', size: 13.5, pad: 11 });
    } else if (k === 3) { // DNA와 단백질
      ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(20, 110, 760, 360, 26); ctx.fill();
      const ph = t * 1.4;
      const beads = [150, 290, 430, 570, 710];
      helix(40, 760, cy, 34, 120, ph, true, '#2563eb', '#ec4899');
      beads.forEach((bx, i) => {
        D.sphere(bx, cy, 40, '#94a3b8', { shadow: true, outline: 'rgba(60,70,100,.55)', outlineWidth: 2 });
      });
      // 단백질 앞으로 지나가는 DNA 가닥 일부
      beads.forEach((bx) => {
        ctx.save(); ctx.beginPath(); ctx.rect(bx - 40, cy - 6, 80, 12); ctx.clip();
        helix(bx - 50, bx + 50, cy, 34, 120, ph + (bx - 40) / 120 * TAU, false, '#2563eb', '#ec4899'); ctx.restore();
      });
      D.arrow(cx - 135, cy - 150, cx - 100, cy - 38, { color: '#2563eb', width: 3, head: 11 });
      pill(cx - 160, cy - 164, 'DNA (이중 나선)', { bg: '#2563eb', size: 15, pad: 13 });
      D.arrow(cx + 40, cy + 150, cx + 10, cy + 46, { color: '#475569', width: 3, head: 11 });
      pill(cx + 52, cy + 164, '단백질', { bg: '#475569', size: 15, pad: 13 });
    } else { // 유전자
      ctx.fillStyle = 'rgba(255,255,255,.6)'; D.roundRect(24, 150, 752, 250, 26); ctx.fill();
      GENES.forEach((g, i) => {
        const a = 0.32 + 0.5 * zs.geneA[i];
        ctx.save();
        ctx.fillStyle = CO.rgba(g.col, a); D.roundRect(g.x0, cy - 62, g.x1 - g.x0, 124, 18); ctx.fill();
        ctx.strokeStyle = CO.rgba(g.col, 0.9); ctx.lineWidth = 2 + 2 * zs.geneA[i]; ctx.stroke();
        ctx.restore();
      });
      helix(50, 750, cy, 40, 110, t * 1.2, true, '#2563eb', '#ec4899');
      GENES.forEach((g, i) => {
        D.text((g.x0 + g.x1) / 2, cy - 72, g.name, { size: 14.5, weight: 800, color: dark(g.col) });
        if (!zs.gene[i] && zs.lv === 4) {
          const ph = (t * 0.9 + i * 0.25) % 1;
          ctx.save(); ctx.globalAlpha = 0.55 * (1 - ph); ctx.strokeStyle = g.col; ctx.lineWidth = 3;
          D.roundRect(g.x0 - 4 * ph, cy - 62 - 4 * ph, g.x1 - g.x0 + 8 * ph, 124 + 8 * ph, 20); ctx.stroke(); ctx.restore();
        }
      });
      pill(cx, 134, '유전자 = 유전 정보를 담은 DNA의 특정 부분', { bg: '#1b2333', size: 16, pad: 16 });
      if (zs.gene.some(Boolean)) pill(cx, 436, '사람에게는 이런 유전자가 약 2만 개나 있어요!', { bg: '#14532d', size: 14.5, pad: 14 });
    }
  }
  function drawZoom(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#eaf0fc'); bg.addColorStop(1, '#dfe7f8');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const zv = zs.zv.value;
    for (let k = 0; k < 5; k++) {
      const a = clamp(1 - Math.abs(zv - k) * 1.55, 0, 1);
      if (a < 0.02) continue;
      const s = Math.exp((zv - k) * 1.15);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.translate(ZC.x, ZC.y); ctx.scale(s, s); ctx.translate(-ZC.x, -ZC.y);
      drawZoomLevel(k, t);
      ctx.restore();
    }
    // 렌즈 링 (다음 단계로 확대될 곳)
    if (zs.lv < 4 && Math.abs(zv - zs.lv) < 0.05) {
      const ring = [64, 38, 40, 30][zs.lv];
      const ph = (t * 0.8) % 1;
      ctx.save(); ctx.globalAlpha = 0.65 * (1 - ph); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(ZC.x, ZC.y + (zs.lv === 3 ? 0 : 0), ring * (0.9 + 0.35 * ph), 0, TAU); ctx.stroke(); ctx.restore();
    }
    // 단계 표시 (눌러서 이동할 수 있어요)
    const labels = LV;
    let x = 0; const ws = labels.map((l) => 36 + l.length * 15); const total = ws.reduce((a, b) => a + b, 0) + 22 * 4;
    x = (W - total) / 2;
    labels.forEach((l, i) => {
      const on = i === zs.lv;
      const b = D.label(x + ws[i] / 2, 28, l, { bg: on ? '#16a34a' : (zs.visited[i] ? '#cfd9ee' : '#e4e9f5'), color: on ? '#fff' : '#4b5a78', size: 14.5, pad: 13 });
      zs.pills = zs.pills || []; zs.pills[i] = b;
      if (i < 4) D.text(x + ws[i] + 11, 33, '›', { size: 18, weight: 800, color: '#7c8aa6' });
      x += ws[i] + 22;
    });
    // 설명
    const mid = zs.lv;
    ctx.save(); ctx.globalAlpha *= clamp(1 - Math.abs(zv - mid) * 3, 0, 1);
    D.label(W / 2, 508, LV_DESC[mid], { bg: 'rgba(27,35,51,.84)', size: 14.5, pad: 16 });
    ctx.restore();
  }
  function tapZoom(p) {
    if (p.y < 50 && zs.pills) {
      for (let i = 0; i < 5; i++) { const b = zs.pills[i]; if (b && p.x >= b.x && p.x <= b.x + b.w) { zoomTo(i); return; } }
    }
    if (zs.lv === 4 && Math.abs(zs.zv.value - 4) < 0.15) {
      for (let i = 0; i < GENES.length; i++) {
        const g = GENES[i];
        if (p.x >= g.x0 && p.x <= g.x1 && Math.abs(p.y - ZC.y) < 70) {
          Sound.click();
          if (!zs.gene[i]) { zs.gene[i] = true; fx.burst((g.x0 + g.x1) / 2, ZC.y, { count: 14, speed: 140, size: 3.5, colors: [g.col, '#fff', '#fbbf24'] }); }
          zs.geneA[i] = 0; tween(zs.geneA, { [i]: 1 }, { duration: 0.5, ease: 'outBack' });
          return;
        }
      }
    }
  }

  /* =========================================================
     장면 2 · 상동 염색체 짝 맞추기 + 성염색체
     ========================================================= */
  const SLOT_X = [100, 250, 400, 550, 700], SLOT_Y = 410, HOME_Y = 170;
  const PR = { items: [], matched: 0, drag: null, done: false, msg: '', msgT: 0, sx: 0, sexA: 0, legend: 0 };
  const GREY = '#9aa6bb';
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function initPair() {
    const list = [];
    for (let p = 0; p < 4; p++) for (let par = 0; par < 2; par++) list.push({ pair: p, par });
    do { shuffle(list); } while (list.some((it, i) => i > 0 && list[i - 1].pair === it.pair));   // 짝이 바로 옆에 있지 않게
    PR.items = list.map((it, i) => ({
      pair: it.pair, par: it.par, hx: 72 + i * 94, hy: HOME_Y,
      x: new Spring(72 + i * 94, { stiffness: 150, damping: 17 }), y: new Spring(HOME_Y, { stiffness: 150, damping: 17 }),
      matched: false, slot: -1, reveal: 0, shake: 0, lift: 0, ang: -Math.PI / 2,
    }));
    PR.matched = 0; PR.drag = null; PR.done = false; PR.msg = ''; PR.sexA = 0; PR.legend = 0;
  }
  initPair();
  const itemCen = (it) => ({ x: it.x.value, y: it.y.value });
  function itemHit(it, p) {
    const P = PAIRS[it.pair];
    return Math.abs(p.x - it.x.value) < 30 && Math.abs(p.y - it.y.value) < P.len / 2 + 14;
  }
  function pairMsg(text) { PR.msg = text; PR.msgT = 3.2; }
  function placeMatched(a, b, k) {
    [a, b].forEach((it, i) => {
      it.matched = true; it.slot = k;
      it.x.target = SLOT_X[k] + (i ? 26 : -26); it.y.target = SLOT_Y - 4;
      it.x.stiffness = it.y.stiffness = 120; it.x.damping = it.y.damping = 13;
    });
  }
  function pairDown(p) {
    for (let i = PR.items.length - 1; i >= 0; i--) {
      const it = PR.items[i];
      if (it.matched || !itemHit(it, p)) continue;
      PR.drag = { it, dx: it.x.value - p.x, dy: it.y.value - p.y };
      tween(it, { lift: 1 }, { duration: 0.15 });
      Sound.click();
      return true;
    }
    return false;
  }
  function pairMove(p) {
    const d = PR.drag; if (!d) return;
    d.it.x.target = p.x + d.dx; d.it.y.target = clamp(p.y + d.dy, 70, 330);
    d.it.x.value += (d.it.x.target - d.it.x.value) * 0.5; d.it.y.value += (d.it.y.target - d.it.y.value) * 0.5;
  }
  function pairUp() {
    const d = PR.drag; if (!d) return; PR.drag = null;
    const it = d.it;
    tween(it, { lift: 0 }, { duration: 0.25 });
    let best = null, bd = 1e9;
    PR.items.forEach((o) => { if (o === it || o.matched) return; const dd = Math.hypot(o.x.value - it.x.value, o.y.value - it.y.value); if (dd < bd) { bd = dd; best = o; } });
    if (best && bd < 70) {
      if (best.pair === it.pair) {
        placeMatched(it, best, PR.matched);
        const k = PR.matched; PR.matched++;
        Sound.success();
        fx.burst(SLOT_X[k], SLOT_Y - 20, { count: 16, speed: 150, size: 3.6, colors: [PAIRS[it.pair].f, PAIRS[it.pair].m, '#fff'] });
        tween(PR, { legend: 1 }, { duration: 0.6 });
        pairMsg('짝이 맞아요! 모양과 크기가 같은 상동 염색체예요.');
        if (PR.matched === 4) { PR.done = true; tween(PR, { sexA: 1 }, { duration: 0.8, ease: 'outBack', delay: 0.6 }); setTimeout(() => showHint('👇 마지막 쌍은 성염색체예요. 여자·남자를 눌러 비교해 보세요', 5500), 900); syncSexUI(); }
      } else {
        Sound.click();
        [it, best].forEach((o) => { o.shake = 1; tween(o, { shake: 0 }, { duration: 0.5 }); });
        pairMsg('모양이 달라요. 길이와 동원체(잘록한 곳) 위치를 비교해 봐요.');
        it.x.target = it.hx; it.y.target = it.hy;
      }
    } else { it.x.target = it.hx; it.y.target = it.hy; }
  }
  function syncSexUI() {
    $$('#sexSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.s === S.sexMode); b.disabled = !PR.done; });
    $('#sexRow').style.opacity = PR.done ? 1 : 0.5;
  }
  function setSex(s) {
    if (!PR.done) { showHint('먼저 상염색체 4쌍을 모두 맞춰 보세요', 3500); return; }
    if (S.sexMode !== s) Sound.click();
    S.sexMode = s; S.sexSeen[s] = true; syncSexUI();
    fx.burst(SLOT_X[4], SLOT_Y - 30, { count: 10, speed: 110, size: 3, colors: ['#38bdf8', '#fff', '#1e3a8a'] });
  }
  function resetPair() { initPair(); S.sexSeen = { f: false, m: false }; S.sexMode = 'f'; syncSexUI(); }
  function stepPair(dt) {
    PR.items.forEach((it) => {
      it.x.update(dt); it.y.update(dt);
      it.reveal = approach(it.reveal, it.matched ? 1 : 0, dt, 4);
    });
    PR.msgT = Math.max(0, PR.msgT - dt);
    PR.sx = approach(PR.sx, S.sexMode === 'm' ? 1 : 0, dt, 7);
  }
  const SEXC = { Xf: '#0369a1', Xm: '#7dd3fc', Y: '#1e3a8a' };
  function drawPair(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#eef1fb'); bg.addColorStop(1, '#e2e8f8');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // 위쪽 안내
    if (!PR.done) pill(400, 38, '같은 모양·크기의 염색체끼리 만나게 끌어다 놓아요', { bg: 'rgba(27,35,51,.84)', size: 15, pad: 16 });
    else pill(400, 38, '체세포 = 상염색체 22쌍 + 성염색체 1쌍 = 23쌍 (46개)', { bg: '#14532d', size: 15, pad: 16 });
    // 바닥 쟁반
    for (let k = 0; k < 5; k++) {
      const locked = k === 4 && !PR.done;
      ctx.save();
      if (k === 4) ctx.globalAlpha *= 0.55 + 0.45 * PR.sexA;
      D.shadow(() => { ctx.fillStyle = k < PR.matched ? '#fff' : 'rgba(255,255,255,.62)'; D.roundRect(SLOT_X[k] - 66, SLOT_Y - 104, 132, 196, 18); ctx.fill(); }, { blur: 10, y: 3 });
      if (k >= PR.matched && k < 4) { ctx.strokeStyle = '#b7c2db'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); D.roundRect(SLOT_X[k] - 66, SLOT_Y - 104, 132, 196, 18); ctx.stroke(); ctx.setLineDash([]); }
      D.text(SLOT_X[k], SLOT_Y + 78, k < 4 ? (k + 1) + '번째 쌍' : '성염색체', { size: 13.5, weight: 800, color: '#6b7788' });
      if (locked) D.text(SLOT_X[k], SLOT_Y - 2, '🔒', { size: 28, color: '#9aa5b6' });
      ctx.restore();
    }
    // 성염색체 슬롯
    if (PR.sexA > 0.02) {
      ctx.save(); ctx.globalAlpha *= clamp(PR.sexA, 0, 1);
      const cx = SLOT_X[4], cy = SLOT_Y - 8, s = PR.sx;
      drawRod(cx - 26, cy, -Math.PI / 2, 124, 0.5, 15, SEXC.Xf, { cond: 1, bands: [0.3, 0.7] });
      // 두 번째: X → Y
      drawRod(cx + 26, cy, -Math.PI / 2, 124 + (62 - 124) * s, 0.5, 15, CO.mix(SEXC.Xm, SEXC.Y, 0.0 + s), { cond: 1, bands: [0.4] });
      D.text(cx - 26, cy + 76, 'X', { size: 18, weight: 800, color: SEXC.Xf });
      D.text(cx + 26, cy + 76, s < 0.5 ? 'X' : 'Y', { size: 18, weight: 800, color: s < 0.5 ? SEXC.Xf : SEXC.Y });
      pill(cx, SLOT_Y - 118, S.sexMode === 'f' ? '여자 XX' : '남자 XY', { bg: S.sexMode === 'f' ? '#db2777' : '#2563eb', size: 14.5, pad: 12 });
      ctx.restore();
    }
    // 염색체 카드(끌 수 있어요)
    const order = PR.items.slice().sort((a, b) => (a === (PR.drag && PR.drag.it) ? 1 : 0) - (b === (PR.drag && PR.drag.it) ? 1 : 0));
    order.forEach((it) => {
      const P = PAIRS[it.pair];
      const col = CO.mix(GREY, toneOf(it.pair, it.par), smooth(it.reveal));
      const sh = Math.sin(it.shake * 18) * 7 * it.shake;
      const cenY = it.y.value + P.len * (P.c - 0.5);
      if (!it.matched && !PR.drag) {
        // 처음에는 모양만 보이게 (색 없음) + 살짝 숨쉬는 움직임
      }
      const sc = 1 + 0.1 * it.lift;
      ctx.save(); ctx.translate(it.x.value + sh, it.y.value); ctx.scale(sc, sc); ctx.translate(-it.x.value - sh, -it.y.value);
      drawRod(it.x.value + sh, cenY, it.ang, P.len, P.c, 17, col, { cond: 1, bands: P.bands, lift: it.lift > 0.3 });
      ctx.restore();
    });
    // 범례 + 안내 말풍선
    if (PR.legend > 0.02) {
      ctx.save(); ctx.globalAlpha *= PR.legend;
      D.sphere(214, 292, 6, '#d9480f', { gloss: false }); D.text(226, 297, '진한 색: 아버지에게서 받은 염색체', { size: 13.5, weight: 700, color: '#334', align: 'left' });
      D.sphere(500, 292, 6, '#fdba74', { gloss: false }); D.text(512, 297, '연한 색: 어머니에게서', { size: 13.5, weight: 700, color: '#334', align: 'left' });
      ctx.restore();
    }
    if (PR.msgT > 0) pill(400, 268, PR.msg, { bg: PR.msg.indexOf('맞아요') >= 0 ? '#14a058' : '#dc2626', size: 14.5, pad: 14 });
  }

  /* =========================================================
     장면 3·4 · 분열 모형 (체세포분열 / 생식세포 형성) — 염색체 4개(2쌍)
     ========================================================= */
  const MCX = 400, MCY = 285, MR = 185, MRD = MR * 0.72, MH1 = MRD + 3, MRD2 = MRD * 0.72, MH2 = MRD2 + 3;
  const PL = [PAIRS[0].len * 0.64, PAIRS[1].len * 0.54];       // 모형의 염색체 길이
  const PCEN = [PAIRS[0].c, PAIRS[1].c];
  const A0 = [[-38, -30, 0.5], [36, -34, 2.4], [-36, 34, 1.6], [38, 32, -0.6]];
  const A2 = [[-85, -62, 0.9], [78, -52, 2.3], [-70, 62, 2.0], [80, 68, 0.3]];
  const ROWY = [-108, 34, -38, 106];
  const MITO_TAGS = ['간기', 'DNA 복제', '전기', '중기', '후기', '말기'];
  const MITO_TXT = [
    '분열 전: 염색체가 가늘고 길게 풀려 핵 속에 있어요. (염색체 4개)',
    'DNA가 복제되어 염색체가 두 가닥(염색 분체)이 돼요. 염색체 수는 그대로 4개!',
    '염색체가 굵게 뭉치고 핵막이 사라져요. 방추사가 생겨요.',
    '염색체가 각자 세포의 가운데에 늘어서요. (짝짓기 없이!)',
    '방추사가 염색 분체를 양쪽으로 끌어당겨 둘로 나눠요.',
    '핵막이 생기고 세포질이 나뉘어 딸세포 2개! 염색체는 4개씩이에요.',
  ];
  const MEIO_TAGS = ['간기', 'DNA 복제', '짝짓기', '가운데 배열', '1분열 후기', '1분열 끝', '2분열 중기', '2분열 후기', '생식세포 4개'];
  const MEIO_TXT = [
    '분열 전: 염색체가 가늘고 길게 풀려 핵 속에 있어요. (염색체 4개)',
    'DNA가 복제되어 염색체가 두 가닥이 돼요. 염색체 수는 4개 그대로예요.',
    '핵막이 사라지고 모양·크기가 같은 상동 염색체끼리 짝을 지어요.',
    '짝지은 상동 염색체가 가운데에 늘어서요. 양쪽 극으로 끌어 보세요!',
    '1분열: 상동 염색체가 서로 반대쪽으로 갈라져요.',
    '세포가 2개! 염색체 수가 절반(2개씩)으로 줄었어요.',
    '2분열: 복제 없이 바로 이어져요. 염색체가 다시 가운데에 늘어서요.',
    '이번에는 염색 분체가 둘로 나뉘어 양쪽으로 끌려가요.',
    '생식세포 4개! 염색체는 2개씩이에요. (모세포의 절반)',
  ];
  function makeModel(kind) {
    const m = { kind, stage: 0, maxStage: 0, units: [], groups: [], nuc: [], fib: 0, tfib: 0, link: 0, tlink: 0, drag: null, sep: [false, false], side: [-1, 1, 1, -1], userSep: [false, false], poles: [], stageT: 0, ready: false, settle: 0, shakeT: 0, hintT: 0, pulseT: 0 };
    for (let ci = 0; ci < 4; ci++) for (let k = 0; k < 2; k++) {
      const pair = ci >> 1, par = ci & 1;
      const sp = { stiffness: 70, damping: 11 };
      m.units.push({
        ci, k, pair, par, g: 0, att: [], len: PL[pair], c: PCEN[pair], col: toneOf(pair, par),
        x: new Spring(MCX + A0[ci][0], sp), y: new Spring(MCY + A0[ci][1], sp), a: new Spring(A0[ci][2], { stiffness: 60, damping: 10 }),
        cond: 0, tcond: 0, alpha: k ? 0 : 1, talpha: k ? 0 : 1, sc: 0.62, tsc: 0.62,
      });
    }
    for (let i = 0; i < 4; i++) m.nuc.push({ x: MCX, y: MCY, r: 95, a: i === 0 ? 1 : 0, tx: MCX, ty: MCY, tr: 95, ta: i === 0 ? 1 : 0 });
    m.groups = [{ cx: MCX, cy: MCY, th: 0, R: MR, d: 0, td: 0 }];
    m.poles = [[[MCX - 168, MCY], [MCX + 168, MCY]]];
    return m;
  }
  const mito = makeModel('mito'), meio = makeModel('meio');
  const model = () => (S.scene === 'mito' ? mito : meio);

  function layoutModel(m, st) {
    const meio = m.kind === 'meio';
    const L = { groups: [], nuc: [], fib: 0, link: 0, units: [], poles: [] };
    const two = meio && st >= 6;
    if (two) {
      L.groups = [{ cx: MCX - MH1, cy: MCY, th: Math.PI / 2, R: MRD, d: st === 8 ? 1 : 0 }, { cx: MCX + MH1, cy: MCY, th: Math.PI / 2, R: MRD, d: st === 8 ? 1 : 0 }];
      L.poles = L.groups.map((g) => [[g.cx, MCY - 122], [g.cx, MCY + 122]]);
    } else {
      L.groups = [{ cx: MCX, cy: MCY, th: 0, R: MR, d: st === 5 ? 1 : 0 }];
      L.poles = [[[MCX - 168, MCY], [MCX + 168, MCY]]];
    }
    // 핵
    for (let i = 0; i < 4; i++) L.nuc.push({ x: MCX, y: MCY, r: 95, a: 0 });
    if (st <= 1) L.nuc[0] = { x: MCX, y: MCY, r: 95, a: 1 };
    if (!meio && st === 5) { L.nuc[0] = { x: MCX - MH1, y: MCY, r: 92, a: 0.55 }; L.nuc[1] = { x: MCX + MH1, y: MCY, r: 92, a: 0.55 }; }
    if (meio && st === 8) [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sy], i) => { L.nuc[i] = { x: MCX + sx * MH1, y: MCY + sy * MH2, r: 54, a: 0.55 }; });
    L.fib = (st >= 2 && st <= 4) || (meio && (st === 6 || st === 7)) ? 1 : 0;
    L.link = meio && st >= 2 && st <= 4 ? 1 : 0;
    const HP = Math.PI / 2;
    m.units.forEach((u) => {
      const ci = u.ci, k = u.k, pair = u.pair;
      let x = MCX + A0[ci][0], y = MCY + A0[ci][1], base = A0[ci][2], cond = 0, alpha = k ? 0 : 1, att = [], sc = 0.62, g = 0, xs = 0.17;
      if (st >= 1) alpha = 1;
      if (!meio) {
        if (st === 2) { x = MCX + A2[ci][0]; y = MCY + A2[ci][1]; base = A2[ci][2]; cond = 1; sc = 1; }
        else if (st === 3) { x = MCX; y = MCY + ROWY[ci]; base = HP; cond = 1; sc = 1; att = [0, 1]; }
        else if (st === 4) { x = MCX + (k ? 125 : -125); y = MCY + ROWY[ci]; base = HP + (k ? -0.55 : 0.55); xs = 0; cond = 1; sc = 1; att = [k ? 1 : 0]; }
        else if (st === 5) { x = MCX + (k ? MH1 : -MH1); y = MCY + ROWY[ci] * 0.45; base = HP + (k ? 0.1 : -0.1); xs = 0; cond = 0.4; sc = 0.75; }
      } else {
        const pairX = [[-70, -62, -20, 20], [70, 64, 20, -20]];     // 짝짓기 위치 (중심 x, y, 아버지 x, 어머니 x)
        const eq = [-72, 72];
        const sd = m.side[ci];
        const sepNow = m.sep[pair] || st >= 4;
        if (st === 2) { const q = pairX[pair]; x = MCX + q[0] + (u.par ? q[3] : q[2]); y = MCY + q[1]; base = HP; cond = 1; sc = 1; }
        else if (st === 3 || st === 4) {
          cond = 1; sc = 1; base = HP; y = MCY + (pair ? 60 : -60) * (sepNow ? 1 : 0) + eq[pair] * (sepNow ? 0 : 1);
          if (sepNow) { x = MCX + sd * 125; att = [sd < 0 ? 0 : 1]; }
          else { x = MCX + sd * 24; att = [sd < 0 ? 0 : 1]; }
        } else if (st === 5) { x = MCX + sd * MH1; y = MCY + (pair ? 42 : -42); base = HP; cond = 1; sc = 0.9; g = sd < 0 ? 0 : 1; }
        else if (st >= 6) {
          g = sd < 0 ? 0 : 1; const gx = L.groups[g].cx; cond = 1; sc = 0.82; att = [];
          if (st === 6) { x = gx + (pair ? 36 : -42); y = MCY; base = 0; att = [0, 1]; }
          else if (st === 7) { x = gx + (pair ? 36 : -42); y = MCY + (k ? 72 : -72); base = k ? -0.55 : 0.55; xs = 0; att = [k ? 1 : 0]; }
          else { x = gx + (pair ? 24 : -24); y = MCY + (k ? MH2 : -MH2); base = HP + (k ? 0.1 : -0.1); xs = 0; cond = 0.5; sc = 0.72; }
        }
      }
      const ang = base + (xs ? (k ? -xs : xs) : 0);
      L.units.push({ x, y, ang, cond, alpha, att, sc, g });
    });
    return L;
  }
  function applyLayout(m, L, instant) {
    // 세포 모양 (분열 정도)
    if (m.groups.length !== L.groups.length) {
      m.groups = L.groups.map((g) => Object.assign({}, g, { td: g.d }));
    } else {
      m.groups.forEach((g, i) => {
        const T = L.groups[i];
        g.cx = T.cx; g.cy = T.cy; g.th = T.th; g.R = T.R;
        if (g.td !== T.d) {
          g.td = T.d;
          if (instant) g.d = T.d; else tween(g, { d: T.d }, { duration: 1.9, ease: 'inOutCubic' });
        }
      });
    }
    m.poles = L.poles;
    L.nuc.forEach((n, i) => { const s = m.nuc[i]; s.ta = n.a; s.tr = n.r; if (n.a > 0) { s.tx = n.x; s.ty = n.y; if (s.a < 0.03) { s.x = n.x; s.y = n.y; s.r = n.r; } } });
    m.tfib = L.fib; m.tlink = L.link;
    m.units.forEach((u, i) => {
      const T = L.units[i];
      u.x.target = T.x; u.y.target = T.y; u.a.target = T.ang;
      if (instant) { u.x.value = T.x; u.y.value = T.y; u.a.value = T.ang; u.x.velocity = u.y.velocity = u.a.velocity = 0; }
      u.tcond = T.cond; u.talpha = T.alpha; u.tsc = T.sc; u.att = T.att; u.g = T.g;
      if (instant) { u.cond = T.cond; u.alpha = T.alpha; u.sc = T.sc; }
    });
  }
  function goStage(m, n, instant) {
    n = clamp(n, 0, m.kind === 'mito' ? 5 : 8);
    const prev = m.stage;
    if (m.kind === 'meio' && n >= 4) { m.sep = [true, true]; }
    if (m.kind === 'meio' && n < 4) m.sep = [false, false];
    m.stage = n; m.maxStage = Math.max(m.maxStage, n); m.stageT = 0;
    applyLayout(m, layoutModel(m, n), instant);
    if (!instant && n !== prev) {
      Sound.click();
      if (n === 1 && prev === 0) m.units.forEach((u) => { if (u.k) fx.burst(u.x.value, u.y.value, { count: 6, speed: 70, size: 3, colors: ['#fff', u.col, '#fde68a'] }); });
      if (n === (m.kind === 'mito' ? 5 : 8) && prev < n) setTimeout(() => { Sound.success(); const gs = m.groups; gs.forEach((g) => fx.burst(g.cx, g.cy, { count: 12, speed: 130, size: 3.4, colors: ['#4ade80', '#fff', '#fbbf24'] })); }, 1500);
    }
    syncModelUI();
  }
  function stepModel(m, dt) {
    m.stageT += dt;
    let settled = true;
    m.units.forEach((u) => {
      u.x.update(dt); u.y.update(dt); u.a.update(dt);
      u.cond = approach(u.cond, u.tcond, dt, 3); u.alpha = approach(u.alpha, u.talpha, dt, 5); u.sc = approach(u.sc, u.tsc, dt, 3);
      if (!(u.x.settled && u.y.settled && u.a.settled)) settled = false;
    });
    m.groups.forEach((g) => { if (Math.abs(g.d - g.td) > 0.002) settled = false; });
    m.fib = approach(m.fib, m.tfib, dt, 3.5);
    m.link = approach(m.link, m.tlink, dt, 4);
    m.nuc.forEach((n) => { n.a = approach(n.a, n.ta, dt, 3); n.x = approach(n.x, n.tx, dt, 4); n.y = approach(n.y, n.ty, dt, 4); n.r = approach(n.r, n.tr, dt, 4); });
    m.settle = settled ? m.settle + dt : 0;
    m.ready = m.settle > 0.5;
    m.shakeT = Math.max(0, m.shakeT - dt);
    m.hintT += dt;
  }

  /* ---- 세포 몸 그리기 ---- */
  function lobesOf(g) {
    const e = g.d, Rd = g.R * 0.72;
    const rho = lerp(g.R, Rd, e), h = lerp(0, Rd + 3, e);
    const ax = Math.cos(g.th), ay = Math.sin(g.th);
    const neck = rho * (1 - smooth((e - 0.1) / 0.72));
    return { rho, h, ax, ay, neck, a: { x: g.cx - ax * h, y: g.cy - ay * h }, b: { x: g.cx + ax * h, y: g.cy + ay * h } };
  }
  function drawCellBody(m, t) {
    const path = new Path2D();
    const all = [];
    m.groups.forEach((g) => {
      const L = lobesOf(g); all.push(L);
      if (g.d < 0.002) { path.moveTo(g.cx + g.R, g.cy); path.arc(g.cx, g.cy, g.R, 0, TAU); return; }
      [L.a, L.b].forEach((c) => { path.moveTo(c.x + L.rho, c.y); path.arc(c.x, c.y, L.rho, 0, TAU); });
      if (L.neck > 0.5) {
        const nx = -L.ay * L.neck, ny = L.ax * L.neck;
        path.moveTo(L.a.x + nx, L.a.y + ny); path.lineTo(L.b.x + nx, L.b.y + ny); path.lineTo(L.b.x - nx, L.b.y - ny); path.lineTo(L.a.x - nx, L.a.y - ny); path.closePath();
      }
    });
    ctx.save();
    ctx.shadowColor = 'rgba(40,60,130,.28)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 9;
    ctx.fillStyle = '#5b7fc7'; ctx.strokeStyle = '#5b7fc7'; ctx.lineWidth = 11; ctx.lineJoin = 'round';
    ctx.fill(path); ctx.stroke(path);
    ctx.restore();
    ctx.fillStyle = '#e9effc'; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    all.forEach((L, gi) => {
      const g = m.groups[gi];
      const cs = g.d < 0.002 ? [{ x: g.cx, y: g.cy }] : [L.a, L.b];
      cs.forEach((c) => {
        const r = g.d < 0.002 ? g.R : L.rho;
        const gr = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.35, r * 0.1, c.x, c.y, r);
        gr.addColorStop(0, '#fbfcff'); gr.addColorStop(0.65, '#e6edfc'); gr.addColorStop(1, '#c8d7f5');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.fill();
      });
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 3;
    all.forEach((L, gi) => {
      const g = m.groups[gi]; const cs = g.d < 0.002 ? [{ x: g.cx, y: g.cy }] : [L.a, L.b]; const r = g.d < 0.002 ? g.R : L.rho;
      cs.forEach((c) => { ctx.beginPath(); ctx.arc(c.x, c.y, r - 7, Math.PI * 1.05, Math.PI * 1.42); ctx.stroke(); });
    });
    ctx.restore();
    return all;
  }
  function drawFibre(x1, y1, x2, y2, a, t) {
    const len = Math.hypot(x2 - x1, y2 - y1); if (len < 8) return;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
    const n = Math.max(8, Math.round(len / 6)), waves = 8, amp = 2.8;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const s = i / n, o = Math.sin(s * waves * TAU) * amp * Math.sin(Math.PI * s);
      const x = x1 + (x2 - x1) * s + nx * o, y = y1 + (y2 - y1) * s + ny * o;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = 'rgba(70,95,160,' + (0.62 * a) + ')'; ctx.lineWidth = 1.7; ctx.stroke();
  }
  function drawModel(m, t) {
    const meio = m.kind === 'meio';
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#edf1fc'); bg.addColorStop(1, '#dfe6f7');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const lobes = drawCellBody(m, t);
    // 핵
    m.nuc.forEach((n) => {
      if (n.a < 0.02) return;
      ctx.save(); ctx.globalAlpha *= n.a;
      const g = ctx.createRadialGradient(n.x - n.r * 0.3, n.y - n.r * 0.3, n.r * 0.1, n.x, n.y, n.r);
      g.addColorStop(0, 'rgba(226,214,250,.9)'); g.addColorStop(1, 'rgba(176,152,236,.8)');
      ctx.fillStyle = g; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    // 상동 염색체 짝 표시
    if (m.link > 0.02 && meio) {
      ctx.save(); ctx.globalAlpha *= m.link * 0.9;
      [0, 1].forEach((p) => {
        const us = m.units.filter((u) => u.pair === p && u.k === 0);
        const xs = us.map((u) => u.x.value), ys = us.map((u) => u.y.value);
        const x0 = Math.min.apply(null, xs) - 30, x1 = Math.max.apply(null, xs) + 30, yc = (ys[0] + ys[1]) / 2;
        const hh = PL[p] * 0.5 + 24;
        if (Math.abs(xs[0] - xs[1]) > 120) return;
        ctx.strokeStyle = 'rgba(20,160,88,.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
        D.roundRect(x0, yc - hh, x1 - x0, hh * 2, 16); ctx.stroke(); ctx.setLineDash([]);
        if (m.stage === 2 || (m.stage === 3 && !m.sep[p])) D.label((x0 + x1) / 2, yc - hh - 14, '상동 염색체', { bg: '#14a058', size: 13.5, pad: 10 });
      });
      ctx.restore();
    }
    // 방추사 (스프링처럼 늘어났다 줄어들어요)
    if (m.fib > 0.03) {
      ctx.save(); ctx.lineCap = 'round';
      m.units.forEach((u) => {
        if (!u.att.length || u.alpha < 0.3) return;
        const sis = m.units[u.ci * 2 + (u.k ? 0 : 1)];
        if (u.k === 1 && JSON.stringify(sis.att) === JSON.stringify(u.att)) return;
        const P = m.poles[Math.min(u.g, m.poles.length - 1)];
        u.att.forEach((pi) => drawFibre(P[pi][0], P[pi][1], u.x.value, u.y.value, m.fib, t));
      });
      m.poles.forEach((P) => P.forEach((p) => {
        ctx.fillStyle = 'rgba(70,95,160,' + (0.9 * m.fib) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(70,95,160,' + (0.8 * m.fib) + ')'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + 0.4; ctx.beginPath(); ctx.moveTo(p[0] + Math.cos(a) * 8, p[1] + Math.sin(a) * 8); ctx.lineTo(p[0] + Math.cos(a) * 13, p[1] + Math.sin(a) * 13); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p[0] - Math.cos(a) * 8, p[1] - Math.sin(a) * 8); ctx.lineTo(p[0] - Math.cos(a) * 13, p[1] - Math.sin(a) * 13); ctx.stroke(); }
      }));
      ctx.restore();
    }
    // 염색체
    const drg = m.drag ? m.drag.ci : -1;
    const sorted = m.units.slice().sort((a, b) => ((a.ci === drg) - (b.ci === drg)) || (a.k - b.k));
    sorted.forEach((u) => {
      const w = lerp(4.5, 12.5, u.cond);
      drawRod(u.x.value, u.y.value, u.a.value, u.len * u.sc, u.c, w, u.col, { cond: u.cond, alpha: u.alpha, t, ph: u.ci * 2 + u.k, lift: u.ci === drg, flat: u.cond < 0.5 });
    });
    // 끌어 볼 수 있다는 표시 (감수 1분열 중기)
    if (meio && m.stage === 3 && !(m.sep[0] && m.sep[1])) {
      [0, 1].forEach((p) => {
        if (m.sep[p]) return;
        const yy = MCY + (p ? 72 : -72);
        const ph = Math.sin(t * 4) * 5;
        D.arrow(MCX - 44 - 4 + ph, yy, MCX - 120 - ph, yy, { color: '#14a058', width: 4, head: 13, alpha: 0.85 });
        D.arrow(MCX + 44 + 4 - ph, yy, MCX + 120 + ph, yy, { color: '#14a058', width: 4, head: 13, alpha: 0.85 });
      });
    }
    // 완성된 딸세포의 염색체 수 꼬리표
    if (m.stage >= 5) {
      const per = meio ? 2 : 4;
      lobes.forEach((L, gi) => {
        const g = m.groups[gi];
        if (g.d < 0.9) return;
        const dd = clamp((g.d - 0.9) * 10, 0, 1);
        [L.a, L.b].forEach((c) => {
          const side = Math.abs(c.x - MCX) > 1 ? Math.sign(c.x - MCX) : 0;
          const tx = side ? c.x + side * (L.rho + 44) : c.x, ty = side ? c.y : c.y + (c.y < MCY ? -(L.rho + 16) : L.rho + 16);
          if (meio && m.stage >= 6 && m.stage < 8) return;
          ctx.save(); ctx.globalAlpha *= dd;
          D.label(tx, ty, per + '개', { bg: '#14532d', size: 15, pad: 12 });
          ctx.restore();
        });
      });
    }
  }
  function modelTexts(m) {
    const meio = m.kind === 'meio';
    const tags = meio ? MEIO_TAGS : MITO_TAGS, txt = meio ? MEIO_TXT : MITO_TXT;
    const n = tags.length;
    // 시기 점 (눌러서 이동)
    const gap = 34, x0 = MCX - gap * (n - 1) / 2;
    m.dots = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * gap, cur = i === m.stage, reach = i <= m.maxStage;
      m.dots.push({ x, y: 30, i });
      if (i < n - 1) { ctx.strokeStyle = i < m.stage ? '#16a34a' : '#c3cde2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, 30); ctx.lineTo(x + gap - 8, 30); ctx.stroke(); }
      ctx.fillStyle = cur ? '#16a34a' : reach ? '#86d5a5' : '#d3daea';
      ctx.beginPath(); ctx.arc(x, 30, cur ? 10 : 7.5, 0, TAU); ctx.fill();
      if (cur) { ctx.strokeStyle = 'rgba(22,163,74,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, 30, 14, 0, TAU); ctx.stroke(); }
    }
    D.label(18, 66, (m.stage + 1) + '/' + n + ' · ' + tags[m.stage], { bg: '#1b2333', size: 14.5, pad: 12, align: 'left' });
    // 색 안내
    D.sphere(24, 100, 6, '#d9480f', { gloss: false }); D.text(36, 105, '진한 색: 아버지', { size: 13, weight: 700, color: '#445', align: 'left' });
    D.sphere(24, 122, 6, '#fdba74', { gloss: false }); D.text(36, 127, '연한 색: 어머니', { size: 13, weight: 700, color: '#445', align: 'left' });
    // 염색체 수
    let cnt = '염색체 4개';
    if (!meio && m.stage === 5) cnt = '4 → 4 (그대로!)';
    if (meio && m.stage >= 5) cnt = '4 → 2 (절반!)';
    D.label(782, 66, cnt, { bg: m.stage >= 5 ? '#14532d' : '#475569', size: 15, pad: 14, align: 'right' });
    // 설명
    D.label(W / 2, 514, txt[m.stage], { bg: 'rgba(27,35,51,.86)', size: 14, pad: 14 });
  }
  function modelPointerHit(m, p) {
    // 방금 눌린 염색체 (막대에 가까운 것)
    let best = null, bd = 30;
    m.units.forEach((u) => {
      if (u.k !== 0 || u.alpha < 0.5) return;
      const dx = Math.cos(u.a.value), dy = Math.sin(u.a.value);
      const l0 = -u.len * u.sc * (1 - u.c), l1 = u.len * u.sc * u.c;
      const vx = p.x - u.x.value, vy = p.y - u.y.value;
      const s = clamp(vx * dx + vy * dy, l0, l1);
      const d = Math.hypot(vx - dx * s, vy - dy * s);
      if (d < bd) { bd = d; best = u; }
    });
    return best;
  }
  /* ---- 감수 1분열 중기: 끌어서(또는 눌러서) 상동 염색체 나누기 ---- */
  let dragInfo = null;
  function meioDown(p) {
    const m = meio;
    if (m.stage !== 3 && m.stage !== 4) return false;
    const u = modelPointerHit(m, p);
    if (!u) return false;
    m.drag = { ci: u.ci, x0: p.x, y0: p.y, moved: 0 };
    m.units.forEach((q) => { if (q.ci === u.ci) { q.x.stiffness = 60; q.y.stiffness = 60; } });
    Sound.click();
    return true;
  }
  function meioMove(p) {
    const m = meio, d = m.drag; if (!d) return;
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.x0, p.y - d.y0));
    m.units.forEach((q) => { if (q.ci === d.ci) { q.x.target = clamp(p.x, 120, 680); q.y.target = clamp(p.y, 130, 450); } });
  }
  function meioUp(p) {
    const m = meio, d = m.drag; if (!d) return; m.drag = null;
    const ci = d.ci, hom = ci ^ 1, pair = ci >> 1;
    let s;
    if (d.moved < 10) { // 눌러서 나누기
      s = m.sep[pair] ? -m.side[ci] : m.side[ci];
    } else if (Math.abs(p.x - MCX) > 70) s = p.x < MCX ? -1 : 1;
    else { s = m.sep[pair] ? m.side[ci] : 0; }
    if (s === 0) { toast('양쪽 극 가까이로 끌어 주세요'); applyLayout(m, layoutModel(m, m.stage), false); return; }
    m.side[ci] = s; m.side[hom] = -s;
    m.sep[pair] = true; m.userSep[pair] = true;
    Sound.success();
    const both = m.sep[0] && m.sep[1];
    applyLayout(m, layoutModel(m, m.stage), false);
    fx.burst(MCX + s * 125, MCY + (pair ? 60 : -60), { count: 8, speed: 90, size: 3, colors: ['#4ade80', '#fff'] });
    if (!both) showHint(pair ? '좋아요! 이번에는 다른 쌍을 양쪽으로 나눠 보세요' : '좋아요! 이번에는 다른 쌍을 양쪽으로 나눠 보세요', 3800);
    else { setTimeout(() => { if (m.stage === 3) goStage(m, 4); }, 700); showHint('상동 염색체가 서로 반대쪽 극으로 끌려갔어요!', 3800); }
  }
  function syncModelUI() {
    const mm = mito, me = meio;
    const nMax = 5;
    $('#mPrev').disabled = mito.stage <= 0;
    $('#mNext').disabled = mito.stage >= 5;
    $('#mNext').classList.toggle('target', mito.stage < 5 && S.scene === 'mito');
    $('#ePrev').disabled = meio.stage <= 0;
    $('#eNext').disabled = meio.stage >= 8;
    $('#eNext').classList.toggle('target', meio.stage < 8 && S.scene === 'meio' && !(meio.stage === 3 && !(meio.sep[0] && meio.sep[1])));
    $('#mitoNote').textContent = S.scene === 'micro' ? '분열하는 세포를 눌러서 찾아봐요.' : '다음 단계 ▶ 를 눌러 염색체의 움직임을 지켜봐요.';
    $('#meioNote').textContent = meio.stage === 3 && !(meio.sep[0] && meio.sep[1]) ? '상동 염색체를 끌어서(눌러도 돼요) 양쪽 극으로 보내 보세요.' : '다음 단계 ▶ 를 눌러 진행해요.';
  }
  function nextStage(m) {
    if (m.kind === 'meio' && m.stage === 3 && !(m.sep[0] && m.sep[1])) {
      if (!game || !game.free) {
        m.shakeT = 0.5; showHint('먼저 상동 염색체를 끌어서 양쪽 극으로 보내 보세요 (눌러도 돼요)', 4200); Sound.click(); return;
      }
      m.sep = [true, true];
    }
    goStage(m, m.stage + 1);
  }
  function resetModel(m) {
    m.sep = [false, false]; m.userSep = [false, false]; m.side = [-1, 1, 1, -1]; m.maxStage = 0; m.drag = null;
    goStage(m, 0, true); m.stage = 0; m.maxStage = 0; syncModelUI();
  }

  /* =========================================================
     가상 현미경: 양파 뿌리 끝에서 분열 중인 세포 찾기
     ========================================================= */
  const MI = { cells: [], found: 0, last: null, msg: '', msgT: 0, msgOk: false, lens: new Spring(0, { stiffness: 140, damping: 14 }) };
  const MC = { x: 400, y: 290, r: 214 };
  function buildMicro() {
    let seed = 7;
    const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const cw = 52, ch = 38;
    const cells = [];
    for (let r = -6; r <= 6; r++) for (let c = -6; c <= 6; c++) {
      const x = MC.x + c * cw + (r & 1 ? cw / 2 : 0) + (rr() - 0.5) * 4, y = MC.y + r * ch + (rr() - 0.5) * 3;
      if (Math.hypot(x - MC.x, y - MC.y) > MC.r - 22) continue;
      cells.push({ x, y, w: cw - 3, h: ch - 3, type: 'inter', found: false, shake: 0, ph: rr() * 6, nuc: 9 + rr() * 2.5 });
    }
    const types = ['pro', 'meta', 'meta', 'ana', 'telo', 'pro', 'ana'];
    const chosen = [];
    const order = cells.map((c, i) => i).sort(() => rr() - 0.5);
    for (const i of order) {
      if (chosen.length >= types.length) break;
      const c = cells[i];
      if (chosen.every((j) => Math.hypot(cells[j].x - c.x, cells[j].y - c.y) > 120)) chosen.push(i);
    }
    chosen.forEach((i, k) => { cells[i].type = types[k]; });
    MI.cells = cells; MI.found = 0; MI.last = null; MI.lens.value = MI.lens.target = 0;
  }
  buildMicro();
  const MI_NAME = { inter: '분열 전 (핵이 뚜렷해요)', pro: '분열 중 · 염색체가 뭉쳐요', meta: '분열 중 · 염색체가 가운데에', ana: '분열 중 · 양쪽으로 갈라져요', telo: '분열 끝 · 핵이 둘이에요' };
  const INK = '#5b2a86';
  function drawMicroCell(c, sc, t, o) {
    o = o || {};
    const w = c.w * sc, h = c.h * sc;
    ctx.save(); ctx.translate(c.x, c.y);
    if (o.cx != null) ctx.translate(o.cx - c.x, o.cy - c.y);
    const sh = Math.sin(c.shake * 18) * 4 * c.shake; ctx.translate(sh, 0);
    ctx.fillStyle = 'rgba(253,226,240,.92)'; ctx.strokeStyle = '#b9739f'; ctx.lineWidth = Math.max(1.4, 1.6 * sc);
    D.roundRect(-w / 2, -h / 2, w, h, 6 * sc); ctx.fill(); ctx.stroke();
    const k = sc;
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = 3.4 * k;
    if (c.type === 'inter') {
      const r = c.nuc * k;
      ctx.fillStyle = 'rgba(134,72,170,.9)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.28, 0, TAU); ctx.fill();
    } else if (c.type === 'pro') {
      ctx.lineWidth = 3.2 * k;
      [[-8, -5, 8, 3], [-6, 6, 9, -4], [-2, -10, 3, 10]].forEach(([a, b, cc, d]) => { ctx.beginPath(); ctx.moveTo(a * k, b * k); ctx.quadraticCurveTo((a + cc) * 0.2 * k, (b + d) * 0.8 * k, cc * k, d * k); ctx.stroke(); });
    } else if (c.type === 'meta') {
      ctx.lineWidth = 3.8 * k;
      [-9, 0, 9].forEach((y) => { ctx.beginPath(); ctx.moveTo(-1.5 * k, y * k - 3 * k); ctx.lineTo(1.5 * k, y * k + 3 * k); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5 * k, y * k); ctx.lineTo(5 * k, y * k); ctx.stroke(); });
    } else if (c.type === 'ana') {
      ctx.lineWidth = 3.6 * k;
      [-1, 1].forEach((s) => [-8, 0, 8].forEach((y) => { ctx.beginPath(); ctx.moveTo(s * 12 * k - 2.5 * k, y * k); ctx.lineTo(s * 12 * k + 2.5 * k, y * k); ctx.stroke(); }));
    } else {
      ctx.strokeStyle = 'rgba(185,115,159,.9)'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(0, -h / 2 + 3 * k); ctx.lineTo(0, h / 2 - 3 * k); ctx.stroke();
      ctx.fillStyle = 'rgba(134,72,170,.9)'; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * 12 * k, 0, 6.5 * k, 0, TAU); ctx.fill(); });
    }
    if (c.found && !o.noRing) {
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; D.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 8); ctx.stroke();
    }
    ctx.restore();
  }
  function tapMicro(p) {
    let best = null, bd = 1e9;
    MI.cells.forEach((c) => { const d = Math.hypot(p.x - c.x, p.y - c.y); if (Math.abs(p.x - c.x) < c.w / 2 + 3 && Math.abs(p.y - c.y) < c.h / 2 + 3 && d < bd) { bd = d; best = c; } });
    if (!best) return;
    MI.last = best; MI.lens.target = 1; MI.lens.value = Math.min(MI.lens.value, 0.5);
    if (best.type === 'inter') {
      Sound.click(); best.shake = 1; tween(best, { shake: 0 }, { duration: 0.5 });
      MI.msg = '핵이 뚜렷한 세포는 분열 전이에요. 분열 중인 세포를 찾아봐요!'; MI.msgOk = false; MI.msgT = 2.6;
    } else {
      if (!best.found) {
        best.found = true; MI.found++; Sound.success();
        fx.burst(best.x, best.y, { count: 12, speed: 110, size: 3.2, colors: ['#4ade80', '#fff', '#fbbf24'] });
      } else Sound.click();
      MI.msg = '분열 중인 세포! ' + MI_NAME[best.type].split('· ')[1]; MI.msgOk = true; MI.msgT = 2.8;
    }
  }
  function resetMicro() { buildMicro(); }
  function drawMicro(t) {
    ctx.fillStyle = '#d9d2e6'; ctx.fillRect(0, 0, W, H);
    const g0 = ctx.createRadialGradient(MC.x, MC.y, 40, MC.x, MC.y, MC.r + 30); g0.addColorStop(0, '#e6e0ef'); g0.addColorStop(1, '#bcb1d0');
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    // 시야
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.r + 8, 0, TAU); ctx.fill(); }, { blur: 18, y: 6 });
    ctx.save(); ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#fdf3f8'; ctx.fillRect(MC.x - MC.r, MC.y - MC.r, 2 * MC.r, 2 * MC.r);
    MI.cells.forEach((c) => drawMicroCell(c, 1, t));
    const vg = ctx.createRadialGradient(MC.x, MC.y, MC.r * 0.6, MC.x, MC.y, MC.r); vg.addColorStop(0, 'rgba(60,30,90,0)'); vg.addColorStop(1, 'rgba(60,30,90,.28)');
    ctx.fillStyle = vg; ctx.fillRect(MC.x - MC.r, MC.y - MC.r, 2 * MC.r, 2 * MC.r);
    ctx.restore();
    ctx.strokeStyle = '#5a5470'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.r + 5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.r + 1, 3.5, 4.3); ctx.stroke();
    // 안내
    pill(MC.x, 28, '🔬 양파 뿌리 끝 (생장점) — 분열 중인 세포를 눌러 보세요', { bg: 'rgba(27,35,51,.84)', size: 14.5, pad: 16 });
    D.label(24, 500, '찾은 세포 ' + MI.found + ' / 3', { bg: MI.found >= 3 ? '#14a058' : '#475569', size: 15, pad: 13, align: 'left' });
    // 확대 창
    const v = clamp(MI.lens.value, 0, 1.1);
    if (MI.last && v > 0.02) {
      const cx = 712, cy = 250, R = 74;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(v, v); ctx.translate(-cx, -cy);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, TAU); ctx.fill(); }, { blur: 12, y: 4 });
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.fillStyle = '#fdf3f8'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      drawMicroCell(MI.last, 2.7, t, { cx, cy, noRing: true });
      ctx.restore();
      ctx.strokeStyle = '#5a5470'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, TAU); ctx.stroke();
      ctx.restore();
      if (v > 0.9) D.label(cx, cy + R + 28, MI_NAME[MI.last.type], { bg: MI.last.type === 'inter' ? '#64748b' : '#16a34a', size: 13, pad: 10 });
    }
    if (MI.msgT > 0) pill(MC.x, 505, MI.msg, { bg: MI.msgOk ? '#14a058' : '#dc2626', size: 14.5, pad: 14 });
  }

  /* =========================================================
     장면 · 비교 (체세포분열 4 → 4 / 생식세포 형성 4 → 2)
     ========================================================= */
  const CP = { p: 0 };
  function replayCompare() { CP.p = 0; tween(CP, { p: 1 }, { duration: 3.4, ease: 'linear' }); }
  function miniCell(x, y, r, rods, a, tint) {
    if (a < 0.01) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(0.6 + 0.4 * a, 0.6 + 0.4 * a); ctx.translate(-x, -y);
    D.shadow(() => { ctx.fillStyle = '#e9effc'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = tint || '#5b7fc7'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const n = rods.length, gap = Math.min(14, (r * 1.5) / Math.max(1, n));
    rods.forEach((cidx, i) => {
      const ci = cidx, pair = ci >> 1, par = ci & 1;
      const len = pair ? 24 : 34;
      const rx = x + (i - (n - 1) / 2) * gap * 1.2;
      drawRod(rx, y + len * (0.4 - 0.5) * 0, -Math.PI / 2, len, 0.45, 6.5, toneOf(pair, par), { cond: 1, flat: true });
    });
    ctx.restore();
  }
  function drawCompare(t) {
    ctx.fillStyle = '#eef1fb'; ctx.fillRect(0, 0, W, H);
    const p = CP.p, ph = (a, b) => clamp((p - a) / (b - a), 0, 1);
    [[20, '체세포분열', '#2563eb'], [410, '생식세포 형성', '#db2777']].forEach(([x0, title, col]) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(x0, 54, 370, 456, 20); ctx.fill(); }, { blur: 12, y: 3 });
      D.label(x0 + 185, 84, title, { bg: col, size: 16, pad: 18 });
    });
    const all = [0, 1, 2, 3];
    const a0 = smooth(ph(0, 0.12));
    miniCell(205, 164, 48, all, a0);
    miniCell(595, 164, 48, all, a0);
    D.text(205, 232, '모세포 · 염색체 4개', { size: 14, weight: 800, color: '#556', alpha: a0 });
    D.text(595, 232, '모세포 · 염색체 4개', { size: 14, weight: 800, color: '#556', alpha: a0 });
    // 체세포분열: 1회 → 2개
    const a1 = smooth(ph(0.14, 0.3));
    D.arrow(205, 246, 205, 246 + 42 * a1, { color: '#2563eb', width: 4, head: 12, alpha: a1 });
    if (a1 > 0.6) D.label(262, 268, '1회 분열', { bg: '#2563eb', size: 13.5, pad: 10, align: 'left' });
    miniCell(122, 350, 46, all, smooth(ph(0.3, 0.46)));
    miniCell(288, 350, 46, all, smooth(ph(0.32, 0.48)));
    // 생식세포 형성: 2회 → 4개
    D.arrow(595, 246, 595, 246 + 32 * a1, { color: '#db2777', width: 4, head: 12, alpha: a1 });
    if (a1 > 0.6) D.label(626, 262, '1회', { bg: '#db2777', size: 13.5, pad: 10, align: 'left' });
    miniCell(520, 318, 34, [0, 3], smooth(ph(0.3, 0.46)), '#db2777');
    miniCell(670, 318, 34, [1, 2], smooth(ph(0.32, 0.48)), '#db2777');
    const a3 = smooth(ph(0.5, 0.64));
    [[520, 490, 550], [670, 640, 700]].forEach(([x0, xa, xb]) => {
      D.arrow(x0, 356, xa, 356 + 26 * a3, { color: '#db2777', width: 3.5, head: 10, alpha: a3 });
      D.arrow(x0, 356, xb, 356 + 26 * a3, { color: '#db2777', width: 3.5, head: 10, alpha: a3 });
    });
    if (a3 > 0.6) D.label(595, 372, '2회', { bg: '#db2777', size: 13.5, pad: 10 });
    [[490, [0]], [550, [3]], [640, [1]], [700, [2]]].forEach(([cx, r], i) => miniCell(cx, 428, 28, r, smooth(ph(0.6 + i * 0.03, 0.78 + i * 0.03)), '#db2777'));
    // 결과
    const r1 = smooth(ph(0.8, 0.96));
    D.text(205, 424, '딸세포 2개 · 염색체 4개씩', { size: 14.5, weight: 800, color: '#1d4ed8', alpha: r1 });
    D.text(595, 478, '생식세포 4개 · 염색체 2개씩', { size: 14.5, weight: 800, color: '#be185d', alpha: r1 });
    ctx.save(); ctx.globalAlpha *= r1;
    D.label(205, 468, '4 → 4 (그대로)', { bg: '#1d4ed8', size: 16, pad: 16 });
    D.label(595, 500, '4 → 2 (절반)', { bg: '#be185d', size: 15, pad: 14 });
    ctx.restore();
  }

  /* =========================================================
     장면 · 수정: 정자 23 + 난자 23 = 수정란 46
     ========================================================= */
  const EGG = { x: 520, y: 292, r: 132 }, ENUC = { x: 520, y: 292, r: 54 }, SP0 = { x: 112, y: 392 }, SP1 = { x: 396, y: 302 };
  const FE = { run: false, t: 0, mode: 'meio', doneMeio: false, doneMito: false, done: false, roll: 0, ring: 0 };
  const URODS = [];
  (function () { let s = 11; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 100; i++) { const a = rr() * TAU, d = Math.sqrt((i + 0.5) / 100); URODS.push({ x: Math.cos(i * 2.399) * d, y: Math.sin(i * 2.399) * d, a: rr() * TAU }); } })();
  const FT = ['#1d4ed8', '#2563eb', '#60a5fa'], MT = ['#be185d', '#db2777', '#f472b6'];
  const gN = () => (FE.mode === 'meio' ? 23 : 46);
  function fertRods(cx, cy, R, from, count, tones, sc, alpha) {
    if (alpha < 0.02) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const u = URODS[(from + i) % 100];
      const x = cx + u.x * R * 0.8, y = cy + u.y * R * 0.8, dx = Math.cos(u.a) * 5.5 * sc, dy = Math.sin(u.a) * 5.5 * sc;
      ctx.strokeStyle = tones[i % 3]; ctx.lineWidth = 3.8 * sc;
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    }
    ctx.restore();
  }
  function resetFert() {
    FE.run = false; FE.t = 0; FE.done = false; FE.roll = 0;
    $('#fertBtn').disabled = false; $('#fertBtn').textContent = '🧬 수정시키기';
    $('#fertBtn').classList.add('target');
  }
  function startFert() {
    if (FE.run) return;
    if (FE.done) { resetFert(); return; }
    Sound.click(); FE.run = true; FE.t = 0; FE.done = false;
    $('#fertBtn').disabled = true; $('#fertBtn').classList.remove('target');
  }
  function setGamete(g) {
    if (FE.run) return;
    FE.mode = g; Sound.click();
    $$('#gameteSeg button').forEach((b) => b.classList.toggle('on', b.dataset.g === g));
    resetFert();
  }
  function stepFert(dt) {
    if (!FE.run) return;
    const prev = FE.t; FE.t += dt;
    if (prev < 2.5 && FE.t >= 2.5) { Sound.click(); fx.burst(SP1.x + 6, SP1.y, { count: 12, speed: 90, size: 3, colors: ['#fff', '#bfdbfe', '#fbcfe8'] }); }
    if (prev < 6.2 && FE.t >= 6.2) {
      FE.run = false; FE.done = true; Sound.success();
      if (FE.mode === 'meio') FE.doneMeio = true; else FE.doneMito = true;
      FE.roll = 0; tween(FE, { roll: 1 }, { duration: 0.9, ease: 'outCubic' });
      fx.burst(EGG.x, EGG.y, { count: 22, speed: 190, size: 4, colors: FE.mode === 'meio' ? ['#4ade80', '#fff', '#fbbf24', '#60a5fa'] : ['#f87171', '#fff', '#fbbf24'] });
      $('#fertBtn').disabled = false; $('#fertBtn').textContent = '↺ 다시 하기';
    }
  }
  function drawFert(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#eaf0fc'); bg.addColorStop(1, '#dde6f8');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const tt = FE.run ? FE.t : (FE.done ? 7 : 0);
    const N = gN();
    const swimP = FE.run || FE.done ? smooth(clamp(tt / 2.4, 0, 1)) : 0;
    const enterP = smooth(clamp((tt - 2.4) / 1.0, 0, 1));
    const apprP = smooth(clamp((tt - 3.5) / 1.3, 0, 1));
    const fuseP = smooth(clamp((tt - 4.8) / 1.3, 0, 1));
    // 난자
    const eg = ctx.createRadialGradient(EGG.x - 40, EGG.y - 50, 10, EGG.x, EGG.y, EGG.r);
    eg.addColorStop(0, '#fff7fb'); eg.addColorStop(0.7, '#fde4ef'); eg.addColorStop(1, '#f7b6d2');
    D.shadow(() => { ctx.fillStyle = '#fde4ef'; ctx.beginPath(); ctx.arc(EGG.x, EGG.y, EGG.r + 10, 0, TAU); ctx.fill(); }, { blur: 16, y: 6 });
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(EGG.x, EGG.y, EGG.r + 12, 0, TAU); ctx.fill();
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(EGG.x, EGG.y, EGG.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e879a8'; ctx.lineWidth = 5; ctx.stroke();
    // 수정막 물결
    if (tt > 2.4) {
      const rp = clamp((tt - 2.5) / 1.8, 0, 1);
      [0, 0.25].forEach((o) => { const q = clamp(rp - o, 0, 1); if (q <= 0 || q >= 1) return; ctx.strokeStyle = 'rgba(244,114,182,' + (0.7 * (1 - q)) + ')'; ctx.lineWidth = 4 * (1 - q) + 1; ctx.beginPath(); ctx.arc(EGG.x, EGG.y, EGG.r + 6 + 40 * q, 0, TAU); ctx.stroke(); });
    }
    // 난자 핵
    const eA = 1 - fuseP;
    if (eA > 0.02) {
      ctx.save(); ctx.globalAlpha *= eA;
      ctx.fillStyle = 'rgba(236,200,235,.75)'; ctx.strokeStyle = '#c05fb0'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ENUC.x, ENUC.y, ENUC.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      fertRods(ENUC.x, ENUC.y, ENUC.r, 0, N, MT, 1, eA);
    }
    // 정자
    const path = (p) => ({ x: lerp(SP0.x, SP1.x, p), y: lerp(SP0.y, SP1.y, p) + Math.sin(p * 9 + t * 2) * 16 * (1 - p) * (p > 0 ? 1 : 0) });
    let hp = path(swimP);
    if (!FE.run && !FE.done) hp = { x: SP0.x + Math.sin(t * 1.6) * 5, y: SP0.y + Math.cos(t * 1.3) * 4 };
    let hx = hp.x, hy = hp.y;
    hx += (EGG.x - 58 - SP1.x) * 0 + enterP * 66; hy += -(SP1.y - EGG.y) * enterP;
    const sx = lerp(hx, ENUC.x, apprP), sy = lerp(hy, ENUC.y, apprP);
    const sA = 1 - fuseP;
    if (sA > 0.02) {
      ctx.save(); ctx.globalAlpha *= sA;
      // 꼬리
      const tailA = 1 - clamp(enterP * 1.6, 0, 1);
      if (tailA > 0.02) {
        ctx.strokeStyle = 'rgba(37,99,235,' + (0.85 * tailA) + ')'; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath();
        const wob = (FE.run ? 14 : 5);
        for (let i = 0; i <= 34; i++) {
          const x = sx - 28 - i * 4.4, y = sy + Math.sin(i * 0.5 - t * (FE.run ? 15 : 6)) * wob * (i / 34) * (1 - 0.8 * enterP);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      // 머리 → 핵
      const nr = lerp(0, 1, apprP);
      const rx = lerp(32, 36, nr), ry = lerp(21, 36, nr);
      const hg = ctx.createRadialGradient(sx - 8, sy - 8, 3, sx, sy, rx);
      hg.addColorStop(0, '#dbeafe'); hg.addColorStop(1, '#60a5fa');
      D.shadow(() => { ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU); ctx.stroke();
      fertRods(sx, sy, Math.min(rx, ry) * 1.15, 0, N, FT, 0.8 + 0.2 * nr, 1);
      ctx.restore();
    }
    // 수정란 핵 (두 핵이 합쳐져요)
    if (fuseP > 0.02) {
      const rz = (N === 23 ? 66 : 80) * (0.7 + 0.3 * fuseP);
      ctx.save(); ctx.globalAlpha *= fuseP;
      const zg = ctx.createRadialGradient(ENUC.x - 15, ENUC.y - 15, 6, ENUC.x, ENUC.y, rz);
      zg.addColorStop(0, 'rgba(240,226,255,.95)'); zg.addColorStop(1, 'rgba(190,160,240,.85)');
      ctx.fillStyle = zg; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ENUC.x, ENUC.y, rz, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
      fertRods(ENUC.x, ENUC.y, rz * 0.98, 0, N, FT, 0.8, fuseP);
      fertRods(ENUC.x, ENUC.y, rz * 0.98, 50, N, MT, 0.8, fuseP);
    }
    // 이름표
    pill(EGG.x, 142, '난자 (어머니) · 염색체 ' + N + '개', { bg: '#be185d', size: 14.5, pad: 14 });
    if (swimP < 0.1) pill(SP0.x, SP0.y - 52, '정자 (아버지) · 염색체 ' + N + '개', { bg: '#2563eb', size: 14.5, pad: 14 });
    else if (tt < 3.5) pill(clamp(hx, 120, 380), hy - 54, '정자 · 염색체 ' + N + '개', { bg: '#2563eb', size: 14, pad: 12 });
    if (tt > 4.8 && tt < 6.2 && !FE.done) pill(EGG.x, 462, '두 핵이 하나로 합쳐져요', { bg: 'rgba(27,35,51,.85)', size: 14.5, pad: 14 });
    if (FE.done) {
      const ok = FE.mode === 'meio';
      const tot = Math.round(2 * N * FE.roll);
      D.label(EGG.x, 456, N + ' + ' + N + ' = ' + (FE.roll > 0.98 ? 2 * N : tot), { bg: ok ? '#14532d' : '#b91c1c', size: 24, pad: 24 });
      D.label(EGG.x, 496, ok ? '수정란의 염색체 수 46개: 부모와 같아요!' : '체세포분열로 만들었다면 92개! 세대마다 2배가 돼요', { bg: ok ? '#14a058' : '#dc2626', size: 14, pad: 14 });
    }
    if (!FE.run && !FE.done) pill(400, 30, FE.mode === 'meio' ? '생식세포 형성으로 만든 정자와 난자예요' : '⚠ 가정: 정자와 난자를 체세포분열로 만들었다면?', { bg: FE.mode === 'meio' ? 'rgba(27,35,51,.82)' : '#b45309', size: 14.5, pad: 16 });
  }

  /* =========================================================
     비교표
     ========================================================= */
  const CMP = [
    { r: '분열 횟수', o: ['1회', '2회'], hint: '체세포분열은 1회, 생식세포 형성은 연속 2회 분열해요.' },
    { r: '만들어진 세포 수', o: ['2개', '4개'], hint: '세포 수는 분열 횟수에 따라 정해져요. (1회 → 2개, 2회 → 4개)' },
    { r: '염색체 수 (딸세포)', o: ['모세포와 같다', '모세포의 절반'], hint: '체세포분열은 4 → 4, 생식세포 형성은 4 → 2였어요.' },
    { r: '상동 염색체 짝짓기', o: ['없다', '있다'], hint: '생식세포 형성에서만 상동 염색체가 짝을 지어 가운데에 늘어서요.' },
    { r: '하는 일', o: ['생장·재생', '생식세포 형성'], hint: '체세포분열은 몸이 자라고 상처가 아무는 데, 생식세포 형성은 정자·난자를 만드는 데 쓰여요.' },
  ];
  const cmpEls = [];
  function buildCompareTable() {
    const t = $('#ctable');
    let h = '<thead><tr><th>구분</th><th>체세포분열</th><th>생식세포 형성</th></tr></thead><tbody>';
    CMP.forEach((row, i) => {
      h += '<tr><th>' + row.r + '</th>';
      [0, 1].forEach((j) => {
        const opts = row.o.map((txt, k) => ({ txt, k })); if ((i * 2 + j) % 3 === 1) opts.reverse();
        h += '<td><select data-r="' + i + '" data-c="' + j + '" aria-label="' + row.r + ' ' + (j ? '생식세포 형성' : '체세포분열') + '"><option value="">선택</option>' + opts.map((o) => '<option value="' + o.k + '">' + o.txt + '</option>').join('') + '</select></td>';
      });
      h += '</tr>';
    });
    t.innerHTML = h + '</tbody>';
    $$('#ctable select').forEach((s) => {
      cmpEls.push(s);
      s.addEventListener('change', () => {
        s.classList.remove('bad');
        const ok = s.value !== '' && +s.value === +s.dataset.c;
        s.classList.toggle('ok', ok);
        if (ok) { Sound.click(); }
        if (tableAllOk() && !CMPS.done) { CMPS.done = true; Sound.success(); fx.burst(400, 280, { count: 18, speed: 160 }); }
      });
    });
  }
  const CMPS = { done: false };
  const tableAllOk = () => cmpEls.length > 0 && cmpEls.every((s) => s.value !== '' && +s.value === +s.dataset.c);
  function tableCheck() {
    let empty = 0, firstBad = -1;
    cmpEls.forEach((s) => {
      if (s.value === '') { empty++; return; }
      if (+s.value !== +s.dataset.c) { if (firstBad < 0) firstBad = +s.dataset.r; if (!s.classList.contains('bad')) s.classList.add('bad'); }
      else s.classList.remove('bad');
    });
    if (tableAllOk()) return true;
    if (firstBad >= 0) return '"' + CMP[firstBad].r + '" 줄을 다시 확인해요. ' + CMP[firstBad].hint;
    return '아직 빈칸이 ' + empty + '개 남았어요.';
  }
  function resetCompareTable() {
    cmpEls.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); });
    CMPS.done = false; replayCompare();
  }

  /* =========================================================
     입력 · 읽기판 · 그리기 · 반복
     ========================================================= */
  SciSim.pointer(view, {
    down(p) {
      const sc = S.scene;
      if (sc === 'zoom') { tapZoom(p); return false; }
      if (sc === 'pair') return pairDown(p);
      if (sc === 'micro') { tapMicro(p); return false; }
      if (sc === 'mito' || sc === 'meio') {
        const m = model();
        if (p.y < 52 && m.dots) {
          for (const d of m.dots) if (Math.abs(p.x - d.x) < 16 && d.i <= m.maxStage) { if (d.i !== m.stage) goStage(m, d.i); return false; }
        }
        if (sc === 'meio') return meioDown(p);
      }
      return false;
    },
    move(p) { if (S.scene === 'pair') pairMove(p); else if (S.scene === 'meio') meioMove(p); },
    up(p) { if (S.scene === 'pair') pairUp(p); else if (S.scene === 'meio') meioUp(p); },
    hover(p) {
      const sc = S.scene;
      if (sc === 'zoom') return (p.y < 50 || (zs.lv === 4 && Math.abs(p.y - ZC.y) < 70 && GENES.some((g) => p.x > g.x0 && p.x < g.x1))) ? 'pointer' : null;
      if (sc === 'pair') return PR.items.some((it) => !it.matched && itemHit(it, p)) ? 'grab' : null;
      if (sc === 'micro') return MI.cells.some((c) => Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2) ? 'pointer' : null;
      if (sc === 'meio' && meio.stage >= 3 && meio.stage <= 4) return modelPointerHit(meio, p) ? 'grab' : null;
      return null;
    },
  });

  $('#zoomIn').addEventListener('click', () => zoomTo(zs.lv + 1));
  $('#zoomOut').addEventListener('click', () => zoomTo(zs.lv - 1));
  $$('#zoomTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.v); syncModelUI(); }));
  $$('#sexSeg button').forEach((b) => b.addEventListener('click', () => setSex(b.dataset.s)));
  $$('#mitoTabs button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); setScene(b.dataset.v === 'micro' ? 'micro' : 'mito'); syncModelUI();
    if (b.dataset.v === 'model') showHint('다음 단계 ▶ 를 눌러 염색체의 움직임을 지켜봐요', 4000);
  }));
  $('#mNext').addEventListener('click', () => nextStage(mito));
  $('#mPrev').addEventListener('click', () => goStage(mito, mito.stage - 1));
  $('#eNext').addEventListener('click', () => nextStage(meio));
  $('#ePrev').addEventListener('click', () => goStage(meio, meio.stage - 1));
  $$('#compTabs button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); setScene(b.dataset.v === 'fert' ? 'fert' : 'compare');
    if (b.dataset.v === 'fert') { resetFert(); $('#compNote').textContent = '수정시키기를 눌러 정자와 난자가 만나는 모습을 지켜봐요.'; }
    else { replayCompare(); $('#compNote').textContent = '두 분열을 비교해 표를 채워요.'; }
  }));
  $$('#gameteSeg button').forEach((b) => b.addEventListener('click', () => setGamete(b.dataset.g)));
  $('#fertBtn').addEventListener('click', startFert);
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const sc = S.scene;
    if (sc === 'zoom') resetZoom();
    else if (sc === 'pair') resetPair();
    else if (sc === 'micro') resetMicro();
    else if (sc === 'mito') resetModel(mito);
    else if (sc === 'meio') resetModel(meio);
    else if (sc === 'compare') resetCompareTable();
    else resetFert();
  });

  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'zoom') {
      setRO(1, '확대 단계', (zs.lv + 1) + ' / 5'); setRO(2, '보고 있는 것', LV[zs.lv]); setRO(3, '특징', LV_RO[zs.lv]);
    } else if (sc === 'pair') {
      setRO(1, '짝 맞춘 수', PR.matched + ' / 4'); setRO(2, '체세포 염색체', '46개 (23쌍)');
      setRO(3, '성염색체', PR.done ? (S.sexMode === 'f' ? 'XX (여자)' : 'XY (남자)') : '-');
    } else if (sc === 'micro') {
      setRO(1, '찾은 분열 세포', MI.found + ' / 3'); setRO(2, '관찰 재료', '양파 뿌리 끝'); setRO(3, '핵이 뚜렷한 세포', '분열 전');
    } else if (sc === 'mito') {
      setRO(1, '모세포 염색체', '4개'); setRO(2, '딸세포', mito.stage >= 5 ? '2개' : '-'); setRO(3, '딸세포 염색체', mito.stage >= 5 ? '각 4개' : '-');
    } else if (sc === 'meio') {
      setRO(1, '모세포 염색체', '4개'); setRO(2, '만들어진 세포', meio.stage >= 8 ? '4개' : meio.stage >= 5 ? '2개' : '-'); setRO(3, '세포당 염색체', meio.stage >= 5 ? '각 2개' : '-');
    } else if (sc === 'fert') {
      const N = gN();
      setRO(1, '정자 염색체', N + '개'); setRO(2, '난자 염색체', N + '개'); setRO(3, '수정란 염색체', FE.done ? 2 * N + '개' : '-');
    }
  }

  function draw(t) {
    view.clear('#eef1fb');
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    const sc = S.scene;
    if (sc === 'zoom') drawZoom(t);
    else if (sc === 'pair') drawPair(t);
    else if (sc === 'micro') drawMicro(t);
    else if (sc === 'mito' || sc === 'meio') { const m = model(); drawModel(m, t); modelTexts(m); }
    else if (sc === 'compare') drawCompare(t);
    else drawFert(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 문제 그림 ---------- */
  function figSex() {
    const X = (cx, col1, col2) => '<g transform="translate(' + cx + ',64)"><rect x="-9" y="-50" width="18" height="100" rx="9" fill="' + col1 + '" transform="rotate(17)"/><rect x="-9" y="-50" width="18" height="100" rx="9" fill="' + col2 + '" transform="rotate(-17)"/><circle r="8" fill="#fff" opacity=".8"/></g>';
    const Y = (cx) => '<g transform="translate(' + cx + ',64)"><rect x="-8" y="-42" width="16" height="50" rx="8" fill="#1e3a8a" transform="rotate(20)"/><rect x="-8" y="-42" width="16" height="50" rx="8" fill="#1e3a8a" transform="rotate(-20)"/><rect x="-8" y="-4" width="16" height="40" rx="8" fill="#1e3a8a"/><circle r="7" fill="#fff" opacity=".8"/></g>';
    return '<svg class="fig-sex" viewBox="0 0 280 140" width="280" height="140" role="img" aria-label="어떤 사람의 성염색체: X와 Y">' +
      '<rect width="280" height="140" rx="14" fill="#f3f6ff"/>' + X(86, '#0369a1', '#38bdf8') + Y(196) +
      '<text x="86" y="130" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">X</text><text x="196" y="130" text-anchor="middle" font-size="16" font-weight="800" fill="#1e3a8a">Y</text></svg>';
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 모형 ---------- */
    {
      title: '염색체와 유전자', short: '염색체와 유전자', icon: '🧬', phase: '모형',
      features: ['zoom'],
      intro: '<p class="si-q">❓ 탐구 질문: 부모의 특징은 어떻게 자녀에게 전해지고, 염색체 수는 왜 세대가 지나도 변하지 않을까?</p>' +
        '<p>부모의 특징을 전해 주는 <b>유전 정보</b>는 세포 안 어디에 있을까요? 세포 → 핵 → 염색체 → DNA → 유전자 순서로 <b>확대</b>해서 찾아봐요.</p>' +
        '<p>그다음 <b>상동 염색체</b>를 직접 짝지어 보며 사람의 염색체가 어떻게 구성되어 있는지 알아봐요.</p>',
      setup() { setScene('zoom'); resetZoom(); showHint('➕ 확대를 눌러 세포 속으로 들어가 봐요', 4500); },
      recap: '염색체는 DNA와 단백질로 이루어져 있고, <b>유전자는 DNA의 특정 부분</b>이에요. 체세포에는 모양·크기가 같은 <b>상동 염색체</b>가 쌍으로 있어요.',
      summary: '<ul><li><b>염색체</b>: 핵 속에 있는 막대 모양의 물질. <b>DNA와 단백질</b>로 이루어져 있다.</li>' +
        '<li><b>유전자</b>: 유전 정보를 담고 있는 DNA의 특정 부분.</li>' +
        '<li><b>상동 염색체</b>: 모양과 크기가 같은 한 쌍의 염색체. 하나는 아버지에게서, 하나는 어머니에게서 받는다.</li></ul>' +
        '<span class="formula">사람의 체세포: 염색체 46개 = 23쌍<br>= 상염색체 22쌍 + 성염색체 1쌍 (여자 XX · 남자 XY)</span>' +
        '<p class="note">염색체 수는 생물의 종류마다 일정해요.</p>',
      missions: [
        {
          title: '유전자를 찾아 확대하기',
          goal: '<b>➕ 확대</b>를 눌러 세포에서 <b>유전자</b>까지 들어간 뒤, 색 띠(유전자)를 눌러 보세요.',
          hint: '확대를 4번 눌러요: 세포 → 핵 → 염색체 → DNA → 유전자. 마지막 화면의 색 띠를 눌러 봐요.',
          check: () => zs.visited.every(Boolean) && zs.gene.some(Boolean),
          hold: 0.4,
          status: () => LV.slice(1).map((l, i) => mark(zs.visited[i + 1]) + ' ' + l).join(' · ') + ' · ' + mark(zs.gene.some(Boolean)) + ' 유전자 누르기',
          explain: '핵 속에는 <b>염색체</b>가 있고, 염색체는 <b>DNA와 단백질</b>로 이루어져 있어요. DNA에서 유전 정보를 담은 특정 부분이 바로 <b>유전자</b>예요. 유전자 하나하나가 서로 다른 유전 정보를 담고 있어요.',
        },
        {
          title: '상동 염색체 짝 맞추기',
          goal: '모양과 크기가 같은 염색체끼리 <b>4쌍</b>을 짝지은 뒤, <b>여자(XX)와 남자(XY)</b>의 성염색체를 모두 살펴보세요.',
          hint: '염색체를 끌어서 같은 모양의 염색체 위에 놓아요. 길이와 잘록한 곳(동원체)의 위치를 비교해 봐요. 4쌍을 맞추면 성염색체 버튼이 열려요.',
          setup() { setScene('pair'); resetPair(); showHint('같은 모양·크기의 염색체끼리 끌어서 짝지어 봐요', 4500); },
          check: () => PR.matched === 4 && S.sexSeen.f && S.sexSeen.m,
          hold: 0.4,
          status: () => mark(PR.matched === 4) + ' 상염색체 ' + PR.matched + ' / 4쌍 · ' + mark(S.sexSeen.f) + ' 여자 XX · ' + mark(S.sexSeen.m) + ' 남자 XY',
          explain: '짝지은 두 염색체가 <b>상동 염색체</b>예요. 하나는 아버지에게서, 하나는 어머니에게서 받았어요(진한 색·연한 색). 사람의 체세포에는 상동 염색체가 <b>23쌍(46개)</b> 있고, 그중 <b>22쌍은 상염색체</b>, <b>1쌍은 성염색체</b>예요. 여자는 XX, 남자는 XY예요.',
        },
        {
          type: 'quiz', title: '이 사람은 누구일까?',
          get figure() { return figSex(); },
          goal: '그림은 어떤 사람의 체세포에 들어 있는 <b>성염색체</b>예요. 이 사람에 대해 바르게 설명한 것은?',
          choices: ['남자이고, 체세포의 염색체는 모두 46개이다', '여자이고, 체세포의 염색체는 모두 46개이다', '남자이고, 체세포의 염색체는 모두 23개이다', '여자이고, 체세포의 염색체는 모두 44개이다'],
          answer: 0,
          feedback: ['', '여자의 성염색체는 XX예요. 그림에는 X와 Y가 있어요.', '23은 쌍의 수(또는 생식세포의 염색체 수)예요. 체세포의 염색체는 23쌍, 즉 46개예요.', '그림에 Y 염색체가 있으므로 남자예요. 44개는 상염색체만 센 수예요.'],
          explain: 'X와 Y가 함께 있으면 <b>남자(XY)</b>예요. 체세포의 염색체는 상염색체 44개(22쌍) + 성염색체 2개 = <b>46개(23쌍)</b>예요.',
        },
      ],
    },
    /* ---------- 2단계 · 모형 ---------- */
    {
      title: '체세포분열', short: '체세포분열', icon: '🔬', phase: '모형',
      features: ['mitosis'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염색체는 DNA(유전 정보)를 담고 있고, 체세포에는 상동 염색체가 쌍으로 있다는 것을 알았어요.</div>' +
        '<p>세포가 분열하면 이 <b>유전 정보</b>는 어떻게 될까요? 먼저 양파 뿌리 끝을 <b>현미경</b>으로 보며 분열하는 세포를 찾고, 이어서 염색체 4개(2쌍)를 가진 세포가 분열하는 <b>모형</b>을 따라가 봐요.</p>' +
        '<p class="note">전기·중기·후기·말기는 작은 이름표일 뿐이에요. 외우지 말고 <b>염색체가 어떻게 움직이는지</b>에 집중해요.</p>',
      setup() { setScene('micro'); resetMicro(); syncModelUI(); showHint('🔬 핵이 뚜렷하지 않고 염색체가 보이는 세포를 찾아봐요', 4500); },
      recap: '체세포분열에서는 DNA가 <b>복제</b>된 뒤 염색 분체가 둘로 나뉘어, 모세포와 <b>염색체 수와 유전 정보가 같은 딸세포 2개</b>가 만들어져요. (4 → 4)',
      summary: '<ul><li>체세포분열 전에 <b>DNA가 복제</b>되어 염색체가 두 가닥(염색 분체)이 된다.</li>' +
        '<li>염색체가 세포 가운데에 늘어서고, <b>방추사</b>가 염색 분체를 양쪽으로 끌어당긴다.</li>' +
        '<li>세포질이 나뉘어 <b>딸세포 2개</b>가 만들어진다.</li></ul>' +
        '<span class="formula">체세포분열: 1회 분열 → 딸세포 2개<br>염색체 수 4 → 4 (사람: 46 → 46)</span>' +
        '<p>딸세포는 모세포와 염색체 수와 유전 정보가 같아요. 생장과 재생에 쓰여요.</p>',
      missions: [
        {
          title: '분열 중인 세포 찾기',
          goal: '가상 현미경에서 <b>분열 중인 세포</b>를 3개 찾아 눌러 보세요.',
          hint: '핵이 둥글고 뚜렷한 세포는 분열 전이에요. 진한 보라색 막대(염색체)가 보이는 세포를 찾아요.',
          setup() { setScene('micro'); },
          check: () => MI.found >= 3,
          hold: 0.4,
          status: () => mark(MI.found >= 1) + ' ' + mark(MI.found >= 2) + ' ' + mark(MI.found >= 3) + ' 분열 중인 세포 ' + MI.found + ' / 3',
          explain: '분열하는 세포에서는 핵이 사라지고 <b>염색체가 막대 모양으로 뭉쳐</b> 보여요. 가운데에 늘어서 있거나 양쪽으로 갈라지는 모습도 보여요. 식물에서는 뿌리 끝(생장점)에 분열 중인 세포가 많아요.',
        },
        {
          title: '체세포분열 따라가기',
          goal: '<b>🧬 분열 모형</b>에서 <b>다음 단계 ▶</b>를 눌러 딸세포 2개가 만들어질 때까지 염색체의 움직임을 지켜보세요.',
          hint: '다음 단계 ▶ 를 5번 눌러요. 위의 점을 눌러 지나온 단계로 돌아갈 수도 있어요.',
          setup() { setScene('mito'); resetModel(mito); showHint('다음 단계 ▶ 를 눌러 염색체의 움직임을 지켜봐요', 4500); },
          check: () => mito.stage === 5 && mito.ready && mito.maxStage >= 5,
          hold: 0.5,
          status: () => mark(mito.maxStage >= 1) + ' 복제 · ' + mark(mito.maxStage >= 3) + ' 가운데 배열 · ' + mark(mito.maxStage >= 4) + ' 분리 · ' + mark(mito.stage === 5 && mito.ready) + ' 딸세포 2개',
          explain: '염색체가 복제되어 <b>두 가닥(염색 분체)</b>이 되고, 가운데에 늘어선 뒤 <b>방추사</b>에 끌려 양쪽으로 나뉘어요. 그래서 딸세포 2개는 모세포와 <b>염색체 수가 같은 4개씩</b>이에요. (4 → 4)',
        },
        {
          type: 'quiz', title: '딸세포의 염색체 수',
          goal: '사람의 체세포(염색체 <b>46개</b>)가 체세포분열을 하면, 딸세포 하나의 염색체 수는?',
          choices: ['23개', '46개', '92개', '69개'],
          answer: 1,
          feedback: ['', '', '복제로 염색 분체가 2배가 되지만, 딸세포로 나뉠 때 다시 반씩 나뉘어요. 딸세포 하나는 모세포와 같아요.', '염색체 수가 늘어나거나 어중간하게 변하지 않아요.'],
          explain: '체세포분열에서는 복제된 염색 분체가 나뉘어 딸세포로 들어가므로, 딸세포의 염색체 수는 모세포와 같은 <b>46개</b>예요. 모형에서도 4 → 4였지요.',
        },
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '생식세포 형성', short: '생식세포 형성', icon: '🥚', phase: '모형',
      features: ['meiosis'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 체세포분열로는 염색체 수가 그대로인 딸세포 2개가 만들어졌어요.</div>' +
        '<p>그런데 정자와 난자가 체세포분열로 만들어지면 수정할 때마다 염색체가 계속 늘어날 거예요. <b>생식세포</b>는 어떻게 만들어질까요?</p>' +
        '<p>같은 염색체 4개(2쌍)의 세포로, 이번에는 <b>상동 염색체</b>가 어떻게 행동하는지 살펴보세요. 직접 끌어서 나눠 볼 수 있어요!</p>',
      setup() { setScene('meio'); resetModel(meio); syncModelUI(); showHint('다음 단계 ▶ 를 눌러 가운데 배열까지 진행해 봐요', 4500); },
      recap: '생식세포를 만들 때는 <b>상동 염색체가 짝을 지었다가 1분열에서 분리</b>되고, 2분열에서 염색 분체가 나뉘어요. 그래서 염색체 수가 <b>절반</b>인 생식세포 4개가 만들어져요. (4 → 2)',
      summary: '<ul><li>상동 염색체가 <b>짝을 지어</b> 가운데에 늘어선다.</li>' +
        '<li><b>1분열</b>: 상동 염색체가 서로 반대쪽으로 분리 → 염색체 수가 절반인 세포 2개</li>' +
        '<li><b>2분열</b>: 염색 분체가 분리 → 생식세포 4개</li></ul>' +
        '<span class="formula">생식세포 형성: 연속 2회 분열 → 생식세포 4개<br>염색체 수 4 → 2 (사람: 46 → 23)</span>' +
        '<p>사람의 정자와 난자는 염색체가 <b>23개</b>예요.</p>',
      missions: [
        {
          title: '상동 염색체 나누어 생식세포 만들기',
          goal: '가운데 배열 단계에서 <b>상동 염색체를 양쪽 극으로 끌어서</b> 나눈 뒤, 끝까지 진행해 <b>생식세포 4개</b>를 만들어 보세요.',
          hint: '2번 눌러 가운데 배열(4/9)까지 가요. 짝지은 염색체를 한쪽 극으로 끌면 짝은 반대쪽으로 끌려가요. 그다음 다음 단계 ▶ 를 계속 눌러요.',
          check: () => meio.stage === 8 && meio.ready && meio.userSep[0] && meio.userSep[1],
          hold: 0.5,
          status: () => mark(meio.userSep[0]) + ' 주황 염색체 쌍 분리 · ' + mark(meio.userSep[1]) + ' 보라 염색체 쌍 분리 · ' + mark(meio.maxStage >= 5) + ' 세포 2개 · ' + mark(meio.stage === 8 && meio.ready) + ' 생식세포 4개',
          explain: '1분열에서 <b>상동 염색체가 서로 반대쪽으로 분리</b>되어 염색체 수가 절반(4 → 2)이 되고, 2분열에서 염색 분체가 나뉘어 <b>생식세포 4개</b>(염색체 2개씩)가 만들어져요. 체세포분열과 달리 <b>상동 염색체의 짝짓기</b>가 일어나는 것이 큰 특징이에요.',
        },
        {
          type: 'quiz', title: '생식세포의 염색체 수',
          goal: '체세포의 염색체가 <b>46개</b>인 사람의 정자나 난자 하나에 들어 있는 염색체 수는?',
          choices: ['23개', '46개', '92개', '22개'],
          answer: 0,
          feedback: ['', '46개는 체세포의 염색체 수예요. 생식세포는 염색체 수가 줄어들어요.', '염색체 수가 늘어나지는 않아요.', '22는 상염색체의 쌍 수예요. 생식세포에는 성염색체 1개를 포함해 23개가 있어요.'],
          explain: '생식세포 형성에서 염색체 수가 <b>절반</b>이 되므로 사람의 정자와 난자에는 염색체가 <b>23개</b>씩 들어 있어요. (모형에서 4 → 2였던 것과 같아요.)',
        },
      ],
    },
    /* ---------- 4단계 · 설명 ---------- */
    {
      title: '비교와 의미', short: '비교와 의미', icon: '⚖️', phase: '설명',
      features: ['compare'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 체세포분열은 4 → 4, 생식세포 형성은 4 → 2였어요.</div>' +
        '<p>두 분열을 <b>표로 비교</b>하고, 염색체 수가 <b>절반</b>이 되는 것이 왜 필요한지 정자와 난자가 만나는 <b>수정</b>으로 확인해 봐요.</p>',
      setup() { setScene('compare'); resetCompareTable(); $('#compNote').textContent = '두 분열을 비교해 표를 채워요.'; },
      recap: '생식세포의 염색체 수가 절반이 되기 때문에 정자 23개 + 난자 23개 = 수정란 <b>46개</b>로 <b>세대가 지나도 염색체 수가 일정</b>해요.',
      summary: '<table class="cmp-mini" style="width:100%;border-collapse:collapse;font-size:14px"><tr><th></th><th>체세포분열</th><th>생식세포 형성</th></tr>' +
        '<tr><td>분열 횟수</td><td>1회</td><td>2회</td></tr><tr><td>세포 수</td><td>2개</td><td>4개</td></tr>' +
        '<tr><td>염색체 수</td><td>그대로</td><td>절반</td></tr><tr><td>상동 염색체 짝짓기</td><td>없다</td><td>있다</td></tr>' +
        '<tr><td>역할</td><td>생장·재생</td><td>생식세포 형성</td></tr></table>' +
        '<span class="formula">정자 23 + 난자 23 = 수정란 46</span>' +
        '<p>생식세포의 염색체 수가 절반이기 때문에 자손의 염색체 수가 <b>세대마다 일정</b>하게 유지돼요. 다음 차시에서는 수정란이 자라는 <b>발생</b>을 알아봐요.</p>',
      missions: [
        {
          title: '두 분열 비교표 채우기',
          goal: '체세포분열과 생식세포 형성의 <b>차이</b>를 표에서 골라 모든 빈칸을 채워 보세요.',
          manual: true,
          hint: '위 그림처럼 체세포분열은 4 → 4, 생식세포 형성은 4 → 2였어요. 상동 염색체가 짝을 짓는 쪽은?',
          check: () => tableCheck(),
          explain: '체세포분열은 <b>1회 분열 → 2개 · 염색체 수 그대로</b>, 생식세포 형성은 <b>2회 분열 → 4개 · 염색체 수 절반</b>이에요. 또 생식세포 형성에서만 <b>상동 염색체가 짝을 지어요</b>. 체세포분열은 <b>생장과 재생</b>, 생식세포 형성은 <b>생식</b>에 쓰여요.',
        },
        {
          title: '정자와 난자의 만남',
          goal: '<b>🧬 수정</b>에서 <b>수정시키기</b>를 눌러, 정자와 난자의 염색체가 합쳐져 수정란이 되는 모습을 지켜보세요.',
          hint: '위의 🧬 수정 버튼을 누른 뒤 🧬 수정시키기를 눌러요. 정자와 난자의 염색체 수를 확인해 봐요.',
          setup() { setScene('fert'); setGamete('meio'); resetFert(); $('#compNote').textContent = '수정시키기를 눌러 정자와 난자가 만나는 모습을 지켜봐요.'; },
          check: () => FE.doneMeio,
          hold: 0.4,
          status: () => mark(S.scene === 'fert') + ' 수정 장면 · ' + mark(FE.run || FE.doneMeio) + ' 수정시키기 · ' + mark(FE.doneMeio) + ' 수정란 46개',
          explain: '정자(23개)와 난자(23개)가 만나면 수정란의 염색체는 <b>23 + 23 = 46개</b>가 돼요. 체세포와 같은 수이지요! 생식세포 형성에서 염색체 수가 절반이 되었기 때문에 가능해요.',
        },
        {
          type: 'quiz', title: '만약 생식세포를 체세포분열로 만든다면?',
          goal: '만약 정자와 난자가 <b>체세포분열</b>로 만들어져서 염색체가 각각 46개라면, 수정란의 염색체 수와 이후의 변화는?',
          choices: ['92개가 되고, 세대마다 2배씩 늘어난다', '46개로 일정하게 유지된다', '23개로 줄어든다', '69개가 되고 다음 세대에는 다시 46개가 된다'],
          answer: 0,
          feedback: ['', '체세포분열로는 염색체 수가 그대로여서 정자와 난자도 46개씩이에요. 합치면 46개가 되는지 계산해 봐요. (수정 장면의 "체세포분열 (만약)"으로 확인해 볼 수 있어요.)', '합쳐지면 줄어드는 것이 아니라 늘어나요.', '염색체 수는 중간으로 어중간하게 변하지 않아요.'],
          explain: '46 + 46 = <b>92개</b>가 되고, 다음 세대에는 184개…로 세대마다 <b>2배</b>가 돼요. 그래서 생식세포는 <b>염색체 수가 절반이 되는 분열</b>(생식세포 형성)로 만들어져야 자손의 염색체 수가 일정하게 유지돼요.',
        },
      ],
    },
  ];

  buildCompareTable();
  game = SciSim.game({
    simId: 'm3-mitosis-meiosis',
    mount: '#game',
    badge: '염색체 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: { zoom: '🔍 확대 · 상동 염색체', mitosis: '🔬 현미경 · 체세포분열 모형', meiosis: '🥚 생식세포 형성 모형', compare: '⚖️ 비교표 · 수정' },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { syncZoomButtons(); syncModelUI(); syncSexUI(); },
    levels,
  });

  goStage(mito, 0, true); goStage(meio, 0, true);
  syncZoomButtons(); syncSexUI(); syncModelUI(); replayCompare(); updateUI();
  SciSim.loop((dt, t) => {
    const sc = S.scene;
    zs.zv.update(dt); zs.pulse = Math.max(0, zs.pulse - dt * 1.5);
    if (sc === 'pair') stepPair(dt);
    else if (sc === 'micro') { MI.lens.update(dt); MI.msgT = Math.max(0, MI.msgT - dt); }
    else if (sc === 'mito') stepModel(mito, dt);
    else if (sc === 'meio') stepModel(meio, dt);
    else if (sc === 'fert') stepFert(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = { S, zs, PR, MI, mito, meio, FE, CMPS, cmpEls, game, levels, setScene, goStage, nextStage, zoomTo, setSex, tapMicro, pairUp, meioUp, setGamete, startFert, tableAllOk,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; } };
})();
