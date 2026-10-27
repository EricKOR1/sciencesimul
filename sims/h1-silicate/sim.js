/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 규산염 광물 [10통과1-02-05]
   ① 관찰: 지각의 광물 (지각 구성 원소 · 화강암 확대 · 광물 5종의 구성 원소)
   ② 모형: 사면체 (규소 1 + 산소 4 블록 · 산소 1개를 함께 쓰며 이어 붙이기)
   ③ 탐구: 연결 방식 (독립형 · 사슬형 · 판상형 · 망상형 조립, 표본의 쪼개짐)
   ④ 확인: 단위체와 다양성 (규산염 / 비규산염 광물 분류)
   ※ 구체적인 구조식·화학식, 사면체 개수비와 화학식 유도는 다루지 않고 블록(규소 1 + 산소 4)으로만 표현
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 560 : 800, VH = PHONE ? 760 : 600;
  const FS = PHONE ? 1.3 : 1;
  const RM = SciSim.reduceMotion;
  const BG = '#eef5fb';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const CO = SciSim.color;
  const fx = new Particles();
  const TAU = Math.PI * 2;
  const SI = '#f2b630', OX = '#ef4a4a', INK = '#1b2333', MUTED = '#5d6879', SKY = '#0ea5e9', SKYD = '#075985';
  let game = null;
  let F = new Set();
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const fs = (n) => Math.round(n * FS);
  const shade = (c, a) => CO.shade(c, a);

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 4500);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }
  const pill = (x, y, text, o) => D.label(x, y, text, Object.assign({ size: fs(13) }, o));
  function bgFill() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#f3f8fd'); g.addColorStop(1, '#e3eef8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function lines(x, y, arr, o) {
    o = o || {};
    arr.forEach((s, i) => D.text(x, y + i * (o.lh || fs(20)), s, Object.assign({ size: fs(14), weight: 700, color: INK }, o)));
  }

  /* ---------- 원소 자료 ---------- */
  const ELC = { Si: SI, O: OX, Al: '#94a3b8', Fe: '#92400e', Ca: '#38bdf8', Na: '#a78bfa', K: '#c084fc', Mg: '#22c55e', C: '#4b5563', S: '#eab308' };
  const ELN = { Si: '규소', O: '산소', Al: '알루미늄', Fe: '철', Ca: '칼슘', Na: '나트륨', K: '칼륨', Mg: '마그네슘', C: '탄소', S: '황' };
  const CRUST = [
    ['O', 46.6, '산소'], ['Si', 27.7, '규소'], ['Al', 8.1, '알루미늄'], ['Fe', 5.0, '철'], ['Ca', 3.6, '칼슘'], ['Na', 2.8, '나트륨'], ['K', 2.6, '칼륨'], ['Mg', 2.1, '마그네슘'], ['기타', 1.5, '기타'],
  ];
  const MIN5 = [
    { id: 'quartz', n: '석영', els: ['Si', 'O'], col: '#dbe4ee', sil: true },
    { id: 'feld', n: '장석', els: ['Si', 'O', 'Al', 'K', 'Na', 'Ca'], col: '#f3b9a6', sil: true },
    { id: 'biot', n: '흑운모', els: ['Si', 'O', 'Al', 'K', 'Mg', 'Fe'], col: '#3f3330', sil: true },
    { id: 'pyro', n: '휘석', els: ['Si', 'O', 'Mg', 'Fe', 'Ca'], col: '#2f4a3a', sil: true },
    { id: 'oliv', n: '감람석', els: ['Si', 'O', 'Mg', 'Fe'], col: '#9bbf3a', sil: true },
  ];

  /* ---------- 화면(장면) ---------- */
  const S = { scene: 'crust', crustView: 'pie', tetraView: 'make', structView: 'build', sceneA: 1, table: false };
  const TB = { pie: '📊 지각을 이루는 원소 (질량 %)', rock: '🪨 화강암 속의 광물', make: '🔺 Si–O 사면체 만들기', join: '🔗 사면체 이어 붙이기', build: '🧱 사면체 블록의 연결 방식', spec: '🔨 광물 표본 살펴보기', sort: '📚 규산염 광물 · 비규산염 광물' };
  const curKey = () => (S.scene === 'crust' ? S.crustView : S.scene === 'tetra' ? S.tetraView : S.scene === 'struct' ? S.structView : 'sort');
  function setScene(sc, sub) {
    S.scene = sc; hintEl.classList.add('hide');
    if (sub) { if (sc === 'crust') S.crustView = sub; else if (sc === 'tetra') S.tetraView = sub; else if (sc === 'struct') S.structView = sub; }
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    onEnter(curKey());
    updateUI();
  }
  function updateUI() {
    const sc = S.scene, key = curKey();
    ['crust', 'tetra', 'struct', 'sort'].forEach((k) => { $('#cs-' + k).hidden = k !== sc; });
    $$('#crustTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.crustView));
    $('#zoomRow').hidden = key !== 'rock';
    $$('#tetraTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.tetraView));
    $$('#structTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.structView));
    $('#typeRow').hidden = key !== 'build';
    $$('#typeBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.t === ST.type); b.classList.toggle('done', !!ST.done[b.dataset.t]); });
    $('#tbLabel').textContent = TB[key];
    $('#tableCard').hidden = !S.table;
    $('#readouts').hidden = !!S.table;
    $('#sceneSeg').hidden = F.size < 2;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
  }
  function onEnter(key) {
    if (key === 'pie') { PIE.sweep = 0; tween(PIE, { sweep: 1 }, { duration: RM ? 0.01 : 1.2, ease: 'outCubic' }); }
    if (key === 'rock') { ROCK.sel = -1; }
    if (key === 'make') { /* nothing */ }
  }

  /* ---------- 3차원 도우미 (사면체 그림) ---------- */
  const RHO = Math.sqrt(8) / 3;
  const VIEW = { yaw: 0.55, pitch: 0.45, sway: 0 };
  function proj(p, cx, cy, sc) {
    const yw = VIEW.yaw + VIEW.sway, cyw = Math.cos(yw), syw = Math.sin(yw), cp = Math.cos(VIEW.pitch), sp = Math.sin(VIEW.pitch);
    const x1 = p[0] * cyw + p[2] * syw, z1 = -p[0] * syw + p[2] * cyw;
    const y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
    return { x: cx + x1 * sc, y: cy - y2 * sc, z: z2 };
  }
  // 블록: c 중심, flip +1(꼭짓점이 위) / -1(점대칭으로 뒤집음), yaw 라디안
  function blockVerts(b) {
    const out = [];
    const f = b.flip || 1;
    out.push([b.c[0], b.c[1] + f * 1, b.c[2]]);
    for (let i = 0; i < 3; i++) {
      const a = (b.yaw || 0) + (i * TAU) / 3 + (f < 0 ? Math.PI : 0);
      out.push([b.c[0] + RHO * Math.cos(a), b.c[1] - f / 3, b.c[2] + RHO * Math.sin(a)]);
    }
    return out;
  }
  const DEG = Math.PI / 180;
  function structBlocks(type) {
    const B = [];
    if (type === 'island') [-2.6, 0, 2.6].forEach((x, i) => B.push({ c: [x, 0, 0], flip: 1, yaw: i * 40 * DEG }));
    else if (type === 'chain') for (let k = -2; k <= 2; k++) B.push({ c: [k * 1.633, 0, 0], flip: 1, yaw: -150 * DEG });
    else if (type === 'sheet') { const a = 2 * RHO; for (let k = 0; k < 6; k++) { const th = (30 + 60 * k) * DEG; B.push({ c: [a * Math.cos(th), 0, a * Math.sin(th)], flip: 1, yaw: (k % 2 ? 90 : 30) * DEG }); } }
    else if (type === 'frame') {
      const c0 = { c: [0, 0, 0], flip: 1, yaw: 0 }; B.push(c0);
      const vs = blockVerts(c0);
      vs.forEach((v) => B.push({ c: [2 * v[0], 2 * v[1], 2 * v[2]], flip: -1, yaw: 0 }));
    }
    return B;
  }
  const STRUCT_INFO = {
    island: { name: '독립형', share: 0, mineral: '감람석', sc: 50, desc: '사면체가 따로따로 떨어져 있어요 (공유하는 산소 0개)', cleave: '쪼개짐 없이 깨져요' },
    chain: { name: '사슬형', share: 2, mineral: '휘석', sc: 44, desc: '산소 2개를 이웃과 함께 써서 줄로 이어져요', cleave: '두 방향으로 쪼개져 기둥 모양' },
    sheet: { name: '판상형', share: 3, mineral: '흑운모', sc: 56, desc: '산소 3개를 함께 써서 얇은 판으로 이어져요', cleave: '한 방향으로 얇은 판처럼 쪼개져요' },
    frame: { name: '망상형', share: 4, mineral: '석영', sc: 46, desc: '산소 4개를 모두 함께 써서 3차원 그물이 돼요', cleave: '쪼개짐 없이 깨져요, 매우 단단해요' },
  };
  const BLOCK_COL = ['#f59e0b', '#38bdf8', '#34d399', '#a78bfa', '#fb7185', '#fbbf24'];
  // 블록들을 그려요. placed: 블록별 0~1 (나타남), ghost: 점선 자리만 보여 줄 블록 표시 배열
  function drawBlocks(blocks, cx, cy, sc, o) {
    o = o || {};
    const items = [];
    const keyOf = (v) => Math.round(v[0] * 40) + ',' + Math.round(v[1] * 40) + ',' + Math.round(v[2] * 40);
    const vmap = {};
    blocks.forEach((b, i) => {
      if ((b.a || 0) < 0.02 && !b.ghost) return;
      blockVerts(b).forEach((v) => { if (b.ghost) return; const k = keyOf(v); (vmap[k] = vmap[k] || []).push(i); });
    });
    blocks.forEach((b, i) => {
      const vs = blockVerts(b), P = vs.map((v) => proj(v, cx, cy, sc)), C = proj(b.c, cx, cy, sc);
      if (b.ghost) {
        items.push({ z: C.z - 5, f: () => {
          ctx.save(); ctx.globalAlpha = b.ga != null ? b.ga : 0.5; ctx.strokeStyle = b.hot ? '#16a34a' : SKY; ctx.lineWidth = 2.2; ctx.setLineDash([6, 5]);
          [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]].forEach((e) => { ctx.beginPath(); ctx.moveTo(P[e[0]].x, P[e[0]].y); ctx.lineTo(P[e[1]].x, P[e[1]].y); ctx.stroke(); });
          ctx.setLineDash([]); ctx.fillStyle = b.hot ? 'rgba(22,163,74,.12)' : 'rgba(14,165,233,.07)';
          ctx.beginPath(); ctx.moveTo(P[1].x, P[1].y); ctx.lineTo(P[2].x, P[2].y); ctx.lineTo(P[3].x, P[3].y); ctx.closePath(); ctx.fill();
          ctx.restore();
        } });
        return;
      }
      const a = b.a != null ? b.a : 1; if (a < 0.02) return;
      const col = o.mono ? '#38bdf8' : BLOCK_COL[i % BLOCK_COL.length];
      // 면
      [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 2, 3]].forEach((f) => {
        const z = (P[f[0]].z + P[f[1]].z + P[f[2]].z) / 3 - 0.02;
        items.push({ z, f: () => { ctx.save(); ctx.globalAlpha = a * (o.faceA != null ? o.faceA : 0.2); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(P[f[0]].x, P[f[0]].y); ctx.lineTo(P[f[1]].x, P[f[1]].y); ctx.lineTo(P[f[2]].x, P[f[2]].y); ctx.closePath(); ctx.fill(); ctx.restore(); } });
      });
      // 결합 (Si–O)
      for (let k = 0; k < 4; k++) {
        items.push({ z: (C.z + P[k].z) / 2, f: () => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(80,60,40,.55)'; ctx.lineWidth = Math.max(2, sc * 0.05); ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(P[k].x, P[k].y); ctx.stroke(); ctx.restore(); } });
        items.push({ z: (P[k].z + P[(k % 3) + 1].z) / 2 - 0.01, f: () => { ctx.save(); ctx.globalAlpha = a * 0.5; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P[k].x, P[k].y); ctx.lineTo(P[(k % 3) + 1].x, P[(k % 3) + 1].y); ctx.stroke(); ctx.restore(); } });
      }
      // 규소
      const rs = sc * 0.2 * (1 + (b.pop || 0));
      items.push({ z: C.z, f: () => { ctx.save(); ctx.globalAlpha = a; D.sphere(C.x, C.y, rs, SI, { shadow: false, text: o.labels ? 'Si' : null, textColor: '#5b3a00' }); ctx.restore(); } });
    });
    // 산소 (중복되는 꼭짓점은 한 번만 그리고, 함께 쓰는 산소는 강조해요)
    const drawn = {};
    blocks.forEach((b, i) => {
      if (b.ghost || (b.a || 0) < 0.02) return;
      blockVerts(b).forEach((v) => {
        const k = keyOf(v); if (drawn[k]) return; drawn[k] = 1;
        const P = proj(v, cx, cy, sc), shared = vmap[k].length > 1;
        const aMax = Math.max.apply(null, vmap[k].map((j) => blocks[j].a != null ? blocks[j].a : 1));
        items.push({ z: P.z + 0.01, f: () => {
          ctx.save(); ctx.globalAlpha = aMax;
          if (shared) D.glow(P.x, P.y, sc * 0.55, '#fde047', 0.85);
          D.sphere(P.x, P.y, sc * 0.26, OX, { shadow: false, outline: shared ? '#facc15' : null, outlineWidth: 2.5, text: o.labels ? 'O' : null });
          ctx.restore();
        } });
      });
    });
    items.sort((p, q) => p.z - q.z);
    items.forEach((it) => it.f());
    return { shared: Object.keys(vmap).filter((k) => vmap[k].length > 1).length, oCount: Object.keys(vmap).length };
  }
  // 작은 사면체 그림 (끌어 쓰는 블록 모양, 2차원)
  function tetraIcon(x, y, s, a, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a == null ? 1 : a;
    const pts = [[0, -s], [-s * 0.95, s * 0.55], [s * 0.2, s * 0.85], [s * 0.95, s * 0.5]];
    ctx.fillStyle = o.fill || 'rgba(56,189,248,.28)'; ctx.strokeStyle = o.stroke || '#0284c7'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(0, s * 0.18, s * 0.17, SI, { shadow: false, gloss: false });
    pts.forEach((p) => D.sphere(p[0], p[1], s * 0.2, OX, { shadow: false, gloss: false }));
    ctx.restore();
  }

  /* =========================================================
     ① 지각의 광물
     ========================================================= */
  const PIE = { sweep: 1, sel: -1, pop: new Array(9).fill(0), seen: {} };
  const PG = PHONE ? { cx: 280, cy: 230, R: 150, r: 82 } : { cx: 232, cy: 290, R: 170, r: 96 };
  const pieStart = (i) => { let a = -Math.PI / 2; for (let k = 0; k < i; k++) a += (CRUST[k][1] / 100) * TAU; return a; };
  function pieSelect(i) {
    if (i < 0) return;
    PIE.sel = i; Sound.tick();
    PIE.seen[CRUST[i][0]] = true;
    CRUST.forEach((c, k) => tween(PIE.pop, { [k]: k === i ? 1 : 0 }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' }));
  }
  const legendPos = (i) => (PHONE ? { x: 30 + (i % 2) * 262, y: 478 + Math.floor(i / 2) * 46, w: 244 } : { x: 470, y: 112 + i * 46, w: 300 });
  function pieHit(p) {
    const dx = p.x - PG.cx, dy = p.y - PG.cy, d = Math.hypot(dx, dy);
    if (d > PG.r - 4 && d < PG.R + 22) {
      let a = Math.atan2(dy, dx); if (a < -Math.PI / 2) a += TAU;
      for (let i = 0; i < CRUST.length; i++) { const s = pieStart(i), e = s + (CRUST[i][1] / 100) * TAU; if (a >= s && a < e) return i; }
    }
    for (let i = 0; i < CRUST.length; i++) { const L = legendPos(i); if (p.x > L.x - 6 && p.x < L.x + L.w && p.y > L.y - 22 && p.y < L.y + 22) return i; }
    return -1;
  }
  function drawPie(t) {
    D.text(PHONE ? 280 : 232, PHONE ? 38 : 56, '지각을 이루는 원소 (질량 %)', { size: fs(16), weight: 800, color: SKYD });
    let a0 = -Math.PI / 2;
    CRUST.forEach((c, i) => {
      const frac = c[1] / 100, a1 = a0 + frac * TAU * PIE.sweep, mid = (a0 + a1) / 2, off = PIE.pop[i] * 14;
      const ox = Math.cos(mid) * off, oy = Math.sin(mid) * off;
      const col = c[0] === '기타' ? '#cbd5e1' : ELC[c[0]];
      D.shadow(() => {
        ctx.beginPath(); ctx.arc(PG.cx + ox, PG.cy + oy, PG.R, a0, a1); ctx.arc(PG.cx + ox, PG.cy + oy, PG.r, a1, a0, true); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
      }, { blur: PIE.pop[i] > 0.1 ? 14 : 4, y: 3 });
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      if (frac * PIE.sweep > 0.05) D.text(PG.cx + ox + Math.cos(mid) * (PG.R + PG.r) / 2, PG.cy + oy + Math.sin(mid) * (PG.R + PG.r) / 2 + 6, c[0], { size: fs(frac > 0.2 ? 24 : 16), weight: 800, color: c[0] === 'Si' ? '#5b3a00' : '#fff', stroke: c[0] === 'Si' ? null : 'rgba(0,0,0,.25)', strokeWidth: 3 });
      a0 = a0 + frac * TAU;
    });
    // 산소 + 규소 강조
    if (PIE.sweep > 0.95) {
      const e = pieStart(2);
      ctx.save(); ctx.strokeStyle = SKY; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([1, 0]);
      ctx.beginPath(); ctx.arc(PG.cx, PG.cy, PG.R + 12, -Math.PI / 2 + 0.03, e - 0.03); ctx.stroke(); ctx.restore();
      pill(PG.cx, PG.cy + PG.R + fs(40), '산소 + 규소 = 74.3 %', { bg: SKY, color: '#fff', size: fs(15) });
    }
    // 가운데 글자
    const sI = PIE.sel;
    if (sI >= 0) {
      D.text(PG.cx, PG.cy - 6, CRUST[sI][2], { size: fs(20), weight: 800, color: INK });
      D.text(PG.cx, PG.cy + fs(26), CRUST[sI][1] + ' %', { size: fs(26), weight: 800, color: SKYD });
    } else {
      D.text(PG.cx, PG.cy - 4, '조각을', { size: fs(15), weight: 700, color: MUTED }); D.text(PG.cx, PG.cy + fs(18), '눌러 봐요', { size: fs(15), weight: 700, color: MUTED });
    }
    // 범례 (막대 그래프)
    CRUST.forEach((c, i) => {
      const L = legendPos(i), sel = PIE.sel === i, col = c[0] === '기타' ? '#cbd5e1' : ELC[c[0]];
      if (sel) { D.roundRect(L.x - 10, L.y - 22, L.w + 14, 44, 12); ctx.fillStyle = 'rgba(14,165,233,.12)'; ctx.fill(); }
      D.sphere(L.x + 12, L.y, 13, col, { shadow: false });
      D.text(L.x + 12, L.y + 5, c[0] === '기타' ? '…' : c[0], { size: 12, weight: 800, color: c[0] === 'Si' ? '#5b3a00' : '#fff' });
      D.text(L.x + 34, L.y + 5, c[2], { size: fs(14), weight: 700, color: INK, align: 'left' });
      const bw = (L.w - (PHONE ? 130 : 190)) * Math.min(1, c[1] / 47) * PIE.sweep;
      const bx = L.x + (PHONE ? 100 : 110);
      D.roundRect(bx, L.y - 8, Math.max(3, bw), 16, 8); ctx.fillStyle = col; ctx.fill();
      D.text(bx + Math.max(3, bw) + 6, L.y + 5, c[1] + '%', { size: fs(13), weight: 800, color: SKYD, align: 'left' });
    });
    if (!PHONE) lines(470, 112 + 9 * 46 - 4, ['지각의 대부분은 산소와 규소로 이루어져 있어요.'], { size: fs(13), color: MUTED, align: 'left' });
  }

  const ROCK = { zoom: 0, sel: -1, viewed: {}, tgt: 0, grains0: null, grains1: null };
  const RR = PHONE ? { x: 20, y: 52, w: 520, h: 224 } : { x: 60, y: 46, w: 680, h: 250 };
  function seeded(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function buildRock() {
    const r = seeded(77);
    ROCK.grains0 = [];
    for (let i = 0; i < 150; i++) {
      const u = r(), type = u < 0.32 ? 0 : u < 0.8 ? 1 : 2;
      ROCK.grains0.push({ x: RR.x + 14 + r() * (RR.w - 28), y: RR.y + 14 + r() * (RR.h - 28), r: 7 + r() * 11, type, rot: r() * TAU, sides: 5 + Math.floor(r() * 3), j: r() });
    }
    ROCK.grains1 = [];
    const cols = PHONE ? 4 : 6, rows = 3;
    for (let k = 0; k < cols * rows; k++) {
      const gx = RR.x + (RR.w / cols) * ((k % cols) + 0.5) + (r() - 0.5) * 30, gy = RR.y + (RR.h / rows) * (Math.floor(k / cols) + 0.5) + (r() - 0.5) * 20;
      const type = [0, 1, 1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 0, 1, 2, 0, 1, 1, 0][k % 24];
      ROCK.grains1.push({ x: gx, y: gy, r: (PHONE ? 38 : 46) + r() * 18, type, rot: r() * TAU, sides: 6 + Math.floor(r() * 3) });
    }
    // 이름표를 붙일 알갱이: 각 종류에서 하나씩
    [0, 1, 2].forEach((ty) => { const g = ROCK.grains1.find((q) => q.type === ty); if (g) g.label = true; });
  }
  const GRAIN_COL = ['#c8d3df', '#f0b4a2', '#3a2d2b'];
  const GRAIN_NAME = ['석영', '장석', '흑운모'];
  function poly(x, y, r, sides, rot, jit) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * TAU) / sides, rr = r * (0.82 + 0.18 * Math.sin(i * 2.3 + rot * 3));
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function drawRockLevel(k, a, sc, t) {
    if (a < 0.02) return;
    const cx = RR.x + RR.w / 2, cy = RR.y + RR.h / 2;
    ctx.save();
    ctx.beginPath(); D.roundRect(RR.x, RR.y, RR.w, RR.h, 22); ctx.clip();
    ctx.globalAlpha = a;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    if (k === 0) {
      ctx.fillStyle = '#d8cfc9'; ctx.fillRect(RR.x - 60, RR.y - 60, RR.w + 120, RR.h + 120);
      ROCK.grains0.forEach((g) => { poly(g.x, g.y, g.r, g.sides, g.rot); ctx.fillStyle = GRAIN_COL[g.type]; ctx.globalAlpha = a * (g.type === 2 ? 0.95 : 0.85); ctx.fill(); });
      ctx.globalAlpha = a;
    } else if (k === 1) {
      ctx.fillStyle = '#d8cfc9'; ctx.fillRect(RR.x - 80, RR.y - 80, RR.w + 160, RR.h + 160);
      ROCK.grains1.forEach((g) => {
        poly(g.x, g.y, g.r, g.sides, g.rot);
        const gr = ctx.createRadialGradient(g.x - g.r * 0.3, g.y - g.r * 0.3, 2, g.x, g.y, g.r);
        gr.addColorStop(0, CO.shade(GRAIN_COL[g.type], 0.35)); gr.addColorStop(1, GRAIN_COL[g.type]);
        ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = 'rgba(60,45,40,.55)'; ctx.lineWidth = 2; ctx.stroke();
        if (g.type === 2) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; for (let q = -2; q <= 2; q++) { ctx.beginPath(); ctx.moveTo(g.x - g.r * 0.7, g.y + q * g.r * 0.25); ctx.lineTo(g.x + g.r * 0.7, g.y + q * g.r * 0.25 + 4); ctx.stroke(); } }
      });
      ROCK.grains1.forEach((g) => { if (g.label) pill(g.x, g.y, GRAIN_NAME[g.type], { bg: '#fff', color: INK, border: '#94a3b8', size: fs(13) }); });
    } else {
      const g = ctx.createLinearGradient(0, RR.y, 0, RR.y + RR.h); g.addColorStop(0, '#e6f3fb'); g.addColorStop(1, '#cfe6f5');
      ctx.fillStyle = g; ctx.fillRect(RR.x - 80, RR.y - 80, RR.w + 160, RR.h + 160);
      const cols = PHONE ? 6 : 9, rows = 3, sx = RR.w / cols, sy = RR.h / (rows + 0.2);
      for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) tetraIcon(RR.x + sx * (c + 0.5 + (rr % 2) * 0.35), RR.y + sy * (rr + 0.7), PHONE ? 17 : 20, 1);
      pill(cx, RR.y + 20, 'Si–O 사면체 블록 (Si 1 + O 4)', { bg: SKYD, color: '#fff', size: fs(14) });
    }
    ctx.restore();
  }
  const rockCardPos = (i) => (PHONE ? { x: 20 + (i % 3) * 178 + 85, y: 330 + Math.floor(i / 3) * 86, w: 170, h: 74 } : { x: 26 + i * 152 + 70, y: 354, w: 140, h: 84 });
  function drawMineralSwatch(m, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(-s, -s, s, s); g.addColorStop(0, shade(m.col, 0.3)); g.addColorStop(1, m.col);
    poly(0, 0, s, 7, m.id.length, 0); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(40,40,40,.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.35, s * 0.3, s * 0.15, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawRock(t) {
    // 암석 · 광물 알갱이 · 블록
    ROCK.zoom = approach(ROCK.zoom, ROCK.tgt, 1 / 60, 5);
    for (let k = 0; k < 3; k++) { const a = clamp(1 - Math.abs(ROCK.zoom - k), 0, 1); drawRockLevel(k, a, 1 + (ROCK.zoom - k) * 0.5, t); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; D.roundRect(RR.x, RR.y, RR.w, RR.h, 22); ctx.stroke();
    const lv = ['🪨 화강암 (암석)', '🔍 광물 알갱이', '🔬 블록 단위'][Math.round(ROCK.zoom)];
    pill(RR.x + 78, RR.y - fs(2) + 0, lv, { bg: 'rgba(7,89,133,.9)', color: '#fff', size: fs(13) }) ;
    // 광물 카드
    MIN5.forEach((m, i) => {
      const P = rockCardPos(i), sel = ROCK.sel === i, seen = ROCK.viewed[m.id];
      D.shadow(() => { D.roundRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: sel ? 12 : 5, y: sel ? 5 : 2 });
      ctx.strokeStyle = sel ? SKY : '#cfd8e3'; ctx.lineWidth = sel ? 4 : 2; D.roundRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14); ctx.stroke();
      drawMineralSwatch(m, P.x - P.w / 2 + 30, P.y, 20);
      D.text(P.x + 18, P.y + 6, m.n, { size: fs(17), weight: 800, color: INK });
      if (seen) D.check(P.x + P.w / 2 - 16, P.y - P.h / 2 + 16, 11, 1);
    });
    // 구성 원소 판
    const PX = PHONE ? 12 : 26, PY = PHONE ? 490 : 412, PW = PHONE ? 536 : 748, PH = PHONE ? 250 : 176;
    D.roundRect(PX, PY, PW, PH, 16); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = '#cfd8e3'; ctx.lineWidth = 2; ctx.stroke();
    const n = Object.keys(ROCK.viewed).length;
    if (ROCK.sel < 0) {
      lines(PX + PW / 2, PY + PH / 2 - 8, ['광물 카드를 눌러', '이루는 원소를 확인해요'], { size: fs(16), color: MUTED, lh: fs(26) });
    } else {
      const m = MIN5[ROCK.sel];
      D.text(PX + 18, PY + fs(30), m.n + (/[가-힣]/.test(m.n) && (m.n.charCodeAt(m.n.length - 1) - 0xAC00) % 28 !== 0 ? '을' : '를') + ' 이루는 원소', { size: fs(17), weight: 800, color: SKYD, align: 'left' });
      const k = m.els.length, step = Math.min(PHONE ? 84 : 112, (PW - 40) / k);
      const x0 = PX + PW / 2 - (step * (k - 1)) / 2;
      m.els.forEach((e, i) => {
        const x = x0 + i * step, y = PY + (PHONE ? 110 : 84), core = e === 'Si' || e === 'O';
        const pop = clamp((t - (ROCK.selT || 0)) * 4 - i * 0.3, 0, 1);
        if (core) D.glow(x, y, 46, '#fde047', 0.6 * pop);
        D.sphere(x, y, (PHONE ? 30 : 30) * (0.3 + 0.7 * smooth(pop)), ELC[e], { shadow: true, outline: core ? '#facc15' : null, outlineWidth: 3 });
        if (pop > 0.5) { D.text(x, y + 7, e, { size: fs(20), weight: 800, color: e === 'Si' ? '#5b3a00' : '#fff', stroke: e === 'Si' ? null : 'rgba(0,0,0,.2)' }); D.text(x, y + 50, ELN[e], { size: fs(13), weight: 700, color: INK }); }
      });
      pill(PX + PW / 2, PY + PH - fs(26), 'Si와 O가 모두 들어 있어요 · 확인한 광물 ' + n + ' / 5', { bg: n >= 5 ? '#16a34a' : '#fff', color: n >= 5 ? '#fff' : INK, border: n >= 5 ? null : '#cfd8e3', size: fs(13) });
    }
  }
  function rockPointer(p) {
    for (let i = 0; i < 5; i++) {
      const P = rockCardPos(i);
      if (Math.abs(p.x - P.x) < P.w / 2 && Math.abs(p.y - P.y) < P.h / 2) {
        ROCK.sel = i; ROCK.selT = performance.now() / 1000; ROCK.viewed[MIN5[i].id] = true; Sound.tick(); return true;
      }
    }
    return false;
  }

  /* =========================================================
     ② 사면체: 규소 1 + 산소 4
     ========================================================= */
  const TE = { slots: [], supply: { Si: 1, O: 4 }, drag: null, done: false, flash: 0, join: -1, joinA: 0, jdrag: null, hover: -1, made: false };
  const BLK_A = { c: [0, 0, 0], flip: 1, yaw: 0 };
  const TG_MAKE = PHONE ? { cx: 280, cy: 290, sc: 96 } : { cx: 470, cy: 310, sc: 122 };
  const TG_JOIN = PHONE ? { cx: 280, cy: 330, sc: 70 } : { cx: 330, cy: 330, sc: 94 };
  const traySi = () => (PHONE ? { x: 150, y: 650 } : { x: 110, y: 200 });
  const trayO = () => (PHONE ? { x: 410, y: 650 } : { x: 110, y: 380 });
  const trayB = () => (PHONE ? { x: 440, y: 120 } : { x: 690, y: 150 });
  function resetTetra() {
    TE.slots = [0, 1, 2, 3, 4].map(() => ({ on: false, a: 0 }));
    TE.supply = { Si: 1, O: 4 }; TE.drag = null; TE.done = false; TE.flash = 0; TE.join = -1; TE.joinA = 0; TE.jdrag = null; TE.hover = -1;
  }
  function slotPos(i, G) {
    G = G || TG_MAKE;
    const v = blockVerts(BLK_A);
    return i === 0 ? proj(BLK_A.c, G.cx, G.cy, G.sc) : proj(v[i - 1], G.cx, G.cy, G.sc);
  }
  function nearestSlot(kind, p) {
    let best = -1, bd = PHONE ? 70 : 64;
    for (let i = 0; i < 5; i++) {
      if (TE.slots[i].on) continue;
      if ((kind === 'Si') !== (i === 0)) continue;
      const s = slotPos(i), d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function tetraPointer(p, type) {
    if (S.tetraView === 'make') {
      if (type === 'down') {
        if (TE.done) return false;
        const a = traySi(), b = trayO();
        if (TE.supply.Si > 0 && Math.hypot(p.x - a.x, p.y - a.y) < 46) { TE.drag = { kind: 'Si', x: p.x, y: p.y }; Sound.click(); return true; }
        if (TE.supply.O > 0 && Math.hypot(p.x - b.x, p.y - b.y) < 52) { TE.drag = { kind: 'O', x: p.x, y: p.y }; Sound.click(); return true; }
        return false;
      }
      const d = TE.drag; if (!d) return true;
      if (type === 'move') { d.x = p.x; d.y = p.y; TE.hover = nearestSlot(d.kind, p); }
      else if (type === 'up') {
        TE.drag = null; TE.hover = -1;
        const i = nearestSlot(d.kind, p);
        if (i >= 0) {
          const s = TE.slots[i]; s.on = true; s.a = 0; tween(s, { a: 1 }, { duration: RM ? 0.01 : 0.45, ease: 'outBack' });
          TE.supply[d.kind]--; Sound.tick();
          const sp = slotPos(i); fx.burst(sp.x, sp.y, { count: 8, colors: [d.kind === 'Si' ? SI : OX, '#fff'], speed: 90, size: 3, gravity: 0, life: 0.5 });
          if (TE.slots.every((q) => q.on)) completeTetra();
        } else {
          // 틀린 자리 안내
          const c = slotPos(0);
          if (d.kind === 'O' && Math.hypot(p.x - c.x, p.y - c.y) < 50) showHint('가운데는 규소(Si) 자리예요. 산소(O)는 네 꼭짓점에 놓아요', 3800);
          else if (d.kind === 'Si') showHint('규소(Si)는 사면체의 가운데에 놓아요', 3500);
          else showHint('점선 꼭짓점 가까이에 놓아요', 3000);
          Sound.fail();
        }
      }
      return true;
    }
    // 이어 붙이기
    if (type === 'down') {
      if (TE.join >= 0) return false;
      const b = trayB();
      if (Math.hypot(p.x - b.x, p.y - b.y) < 56) { TE.jdrag = { x: p.x, y: p.y }; Sound.click(); return true; }
      return false;
    }
    const d = TE.jdrag; if (!d) return true;
    if (type === 'move') { d.x = p.x; d.y = p.y; TE.hover = nearestJoin(p); }
    else if (type === 'up') {
      TE.jdrag = null; TE.hover = -1;
      const i = nearestJoin(p);
      if (i >= 0) {
        TE.join = i; TE.joinA = 0; tween(TE, { joinA: 1 }, { duration: RM ? 0.01 : 0.6, ease: 'outCubic' }); Sound.success();
        const v = blockVerts(BLK_A)[i], pp = proj(v, TG_JOIN.cx, TG_JOIN.cy, TG_JOIN.sc);
        fx.burst(pp.x, pp.y, { count: 18, colors: ['#fde047', '#fff', OX], speed: 140, size: 3.5, gravity: 0 });
        showHint('산소 1개를 함께 써서 두 사면체가 이어졌어요!', 4500);
      } else { Sound.fail(); showHint('사면체의 꼭짓점(산소) 쪽으로 가져가 붙여 봐요', 3500); }
    }
    return true;
  }
  const joinTarget = (i) => {
    const G = TG_JOIN, v = blockVerts(BLK_A)[i];
    const c = proj([2 * v[0], 2 * v[1], 2 * v[2]], G.cx, G.cy, G.sc);
    return c;
  };
  function nearestJoin(p) {
    let best = -1, bd = PHONE ? 84 : 76;
    for (let i = 0; i < 4; i++) { const c = joinTarget(i), d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function completeTetra() {
    TE.done = true; Sound.success();
    const c = slotPos(0); fx.burst(c.x, c.y, { count: 26, speed: 200, size: 4 });
    showHint('규소 1개 + 산소 4개 = Si–O 사면체 블록 완성!', 5000);
  }
  function stepTetra(dt) { TE.flash += dt; }
  function ballTray(x, y, kind, n, t, active) {
    const r = kind === 'Si' ? 30 : 36, col = kind === 'Si' ? SI : OX;
    D.shadow(() => { D.roundRect(x - (PHONE ? 90 : 76), y - (PHONE ? 52 : 66), PHONE ? 180 : 152, PHONE ? 104 : 140, 18); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = active ? col : '#cfd8e3'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); D.roundRect(x - (PHONE ? 90 : 76), y - (PHONE ? 52 : 66), PHONE ? 180 : 152, PHONE ? 104 : 140, 18); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.globalAlpha = n > 0 ? 1 : 0.25;
    D.sphere(x, y - 10 + (n > 0 ? Math.sin(t * 2.2) * 2 : 0), r, col, { shadow: true, text: kind, textColor: kind === 'Si' ? '#5b3a00' : '#fff', textScale: 0.8 });
    ctx.restore();
    D.text(x, y + (PHONE ? 42 : 56), (kind === 'Si' ? '규소 Si' : '산소 O') + '  × ' + n, { size: fs(14), weight: 800, color: INK });
  }
  function drawTetra(t) {
    VIEW.sway = RM ? 0 : Math.sin(t * 0.7) * 0.22;
    if (S.tetraView === 'make') drawMake(t); else drawJoin(t);
  }
  function drawMake(t) {
    const G = TG_MAKE;
    if (TE.done) {
      const info = drawBlocks([Object.assign({ a: 1, pop: Math.max(0, 0.3 - TE.flash * 0.3) }, BLK_A)], G.cx, G.cy, G.sc, { labels: true, faceA: 0.3, mono: true });
      D.glow(G.cx, G.cy, G.sc * 1.9, '#38bdf8', 0.18 + 0.06 * Math.sin(t * 3));
      pill(G.cx, G.cy + G.sc * 1.55 + fs(10), 'Si–O 사면체 = 규소 1개 + 산소 4개', { bg: SKYD, color: '#fff', size: fs(15) });
      pill(G.cx, G.cy - G.sc * 1.5 - fs(6), '면이 4개인 입체 (사면체)', { bg: '#fff', color: INK, border: SKY, size: fs(13) });
    } else {
      // 점선 틀
      drawBlocks([Object.assign({ ghost: true, ga: 0.8 }, BLK_A)], G.cx, G.cy, G.sc, {});
      // 놓은 구슬: 결합선 → 구슬
      const Pc = slotPos(0);
      const parts = [];
      for (let i = 0; i < 5; i++) {
        const s = TE.slots[i], P = slotPos(i);
        if (!s.on) {
          const act = TE.drag && ((TE.drag.kind === 'Si') === (i === 0));
          if (act) D.ring(P.x, P.y, 26, t + i * 0.2, { color: TE.hover === i ? '#16a34a' : SKY, width: 2.5 });
          else { ctx.save(); ctx.strokeStyle = 'rgba(14,165,233,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(P.x, P.y, 22, 0, TAU); ctx.stroke(); ctx.restore(); }
          D.text(P.x, P.y + 5, i === 0 ? 'Si' : 'O', { size: fs(15), weight: 800, color: 'rgba(14,100,160,.55)' });
        } else parts.push({ i, z: P.z, P });
      }
      if (TE.slots[0].on) parts.forEach((q) => { if (q.i > 0) { ctx.save(); ctx.globalAlpha = TE.slots[q.i].a; ctx.strokeStyle = 'rgba(80,60,40,.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(Pc.x, Pc.y); ctx.lineTo(q.P.x, q.P.y); ctx.stroke(); ctx.restore(); } });
      parts.sort((a, b) => a.z - b.z).forEach((q) => { const s = TE.slots[q.i]; const r = (q.i === 0 ? 0.26 : 0.34) * G.sc * 0.78 * s.a; D.sphere(q.P.x, q.P.y, Math.max(1, r), q.i === 0 ? SI : OX, { shadow: true, text: q.i === 0 ? 'Si' : 'O', textColor: q.i === 0 ? '#5b3a00' : '#fff', textScale: 0.8 }); });
    }
    // 보관함
    ballTray(traySi().x, traySi().y, 'Si', TE.supply.Si, t, TE.supply.Si > 0);
    ballTray(trayO().x, trayO().y, 'O', TE.supply.O, t, TE.supply.O > 0);
    if (TE.drag) {
      const d = TE.drag, r = d.kind === 'Si' ? 30 : 36;
      D.glow(d.x, d.y + 6, r * 2, SKY, 0.25);
      D.sphere(d.x, d.y - 6, r, d.kind === 'Si' ? SI : OX, { shadow: true, text: d.kind, textColor: d.kind === 'Si' ? '#5b3a00' : '#fff', textScale: 0.8 });
    }
    if (!TE.done) pill(PHONE ? 280 : 520, PHONE ? 50 : 46, TE.slots.filter((s) => s.on).length + ' / 5 놓음 · 규소 1개와 산소 4개', { bg: '#fff', color: INK, border: '#cfd8e3', size: fs(14) });
  }
  function drawJoin(t) {
    const G = TG_JOIN;
    const blocks = [Object.assign({ a: 1 }, BLK_A)];
    if (TE.join >= 0) {
      const v = blockVerts(BLK_A)[TE.join];
      blocks.push({ c: [2 * v[0], 2 * v[1], 2 * v[2]], flip: -1, yaw: 0, a: TE.joinA, pop: (1 - TE.joinA) * 0.3 });
    }
    const info = drawBlocks(blocks, G.cx, G.cy, G.sc, { labels: true, faceA: 0.26 });
    // 목표 자리
    if (TE.join < 0) {
      for (let i = 0; i < 4; i++) {
        const c = joinTarget(i);
        if (TE.jdrag) D.ring(c.x, c.y, 28, t + i * 0.25, { color: TE.hover === i ? '#16a34a' : SKY, width: 2.5 });
      }
      const b = trayB();
      ctx.save(); D.roundRect(b.x - 78, b.y - 76, 156, 152, 18); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = SKY; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      tetraIcon(b.x, b.y - 4 + Math.sin(t * 2) * 2, 36, 1);
      D.text(b.x, b.y + 62, '사면체 블록 B', { size: fs(13), weight: 800, color: INK });
      if (TE.jdrag) { D.glow(TE.jdrag.x, TE.jdrag.y, 70, SKY, 0.2); tetraIcon(TE.jdrag.x, TE.jdrag.y, 44, 1); }
      pill(PHONE ? 140 : 340, PHONE ? 50 : 56, '사면체 A', { bg: '#fff', color: INK, border: '#cfd8e3', size: fs(13) });
      pill(PHONE ? 280 : 520, PHONE ? 600 : 530, '블록 B를 A의 꼭짓점(산소) 쪽으로 끌어 붙여요', { bg: SKYD, color: '#fff', size: fs(14) });
    } else {
      const a = smooth(TE.joinA);
      ctx.save(); ctx.globalAlpha = a;
      pill(G.cx, PHONE ? 560 : 520, 'Si 2개 · O 7개 (4 + 4 − 1)', { bg: '#fff', color: INK, border: '#cfd8e3', size: fs(15) });
      pill(G.cx, PHONE ? 604 : 562, '노란 산소 1개를 두 사면체가 함께 써요', { bg: '#eab308', color: '#fff', size: fs(14) });
      ctx.restore();
    }
  }

  /* =========================================================
     ③ 연결 방식: 독립형 · 사슬형 · 판상형 · 망상형
     ========================================================= */
  const TYPES = ['island', 'chain', 'sheet', 'frame'];
  const ST = { type: 'island', st: {}, done: {}, drag: null, hover: -1, doneAt: 0, tested: {}, sp: {}, specLast: null };
  function initType(ty) {
    const n = structBlocks(ty).length;
    ST.st[ty] = { on: new Array(n).fill(false), a: new Array(n).fill(0), left: n };
  }
  TYPES.forEach(initType);
  const SPEC = [
    { id: 'oliv', n: '감람석', type: 'island', arr: 0, clv: 2, note: '쪼개짐 없이 알갱이처럼 부서져요' },
    { id: 'pyro', n: '휘석', type: 'chain', arr: 1, clv: 1, note: '두 방향으로 쪼개져 기둥 모양이 돼요' },
    { id: 'biot', n: '흑운모', type: 'sheet', arr: 2, clv: 0, note: '한 방향으로 얇은 판처럼 쪼개져요' },
    { id: 'quartz', n: '석영', type: 'frame', arr: 3, clv: 2, note: '쪼개짐 없이 불규칙하게 깨져요 (매우 단단해요)' },
  ];
  SPEC.forEach((s) => { ST.sp[s.id] = { p: 0 }; });
  const SG = PHONE ? { cx: 280, cy: 290, k: 0.74 } : { cx: 400, cy: 262, k: 1 };
  const trayStruct = () => (PHONE ? { x: 280, y: 650 } : { x: 400, y: 532 });
  function resetStruct() {
    TYPES.forEach(initType); ST.done = {}; ST.drag = null; ST.hover = -1;
    updateUI();
  }
  function resetType(ty) { initType(ty); ST.done[ty] = false; ST.drag = null; }
  function setType(ty) { ST.type = ty; ST.drag = null; Sound.click(); updateUI(); }
  const typeBlocks = () => structBlocks(ST.type);
  function slotScreen(i) {
    const info = STRUCT_INFO[ST.type], b = typeBlocks()[i];
    return proj(b.c, SG.cx, SG.cy, info.sc * SG.k);
  }
  function nearestBlockSlot(p) {
    const st = ST.st[ST.type], bl = typeBlocks();
    let best = -1, bd = PHONE ? 66 : 64;
    bl.forEach((b, i) => { if (st.on[i]) return; const s = slotScreen(i), d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function placeBlock(i) {
    const st = ST.st[ST.type]; st.on[i] = true; st.left--; st.a[i] = 0; Sound.tick();
    tween(st.a, { [i]: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outBack' });
    const s = slotScreen(i); fx.burst(s.x, s.y, { count: 8, colors: ['#38bdf8', '#fde047'], speed: 90, size: 3, gravity: 0, life: 0.5 });
    if (st.left === 0 && !ST.done[ST.type]) {
      ST.done[ST.type] = true; ST.doneAt = performance.now() / 1000; Sound.success();
      fx.burst(SG.cx, SG.cy, { count: 28, speed: 220, size: 4 });
      showHint(STRUCT_INFO[ST.type].name + ' 완성! ' + STRUCT_INFO[ST.type].desc, 5000);
      updateUI();
    }
  }
  function structPointer(p, type) {
    if (S.structView === 'spec') {
      if (type === 'down') {
        const i = specAt(p); if (i < 0) return false;
        runSpec(SPEC[i]); return false;
      }
      return false;
    }
    if (type === 'down') {
      const st = ST.st[ST.type]; if (st.left <= 0) return false;
      const t0 = trayStruct();
      if (Math.abs(p.x - t0.x) < 110 && Math.abs(p.y - t0.y) < 56) { ST.drag = { x: p.x, y: p.y }; Sound.click(); return true; }
      return false;
    }
    if (!ST.drag) return true;
    if (type === 'move') { ST.drag.x = p.x; ST.drag.y = p.y; ST.hover = nearestBlockSlot(p); }
    else if (type === 'up') {
      const i = nearestBlockSlot(p); ST.drag = null; ST.hover = -1;
      if (i >= 0) placeBlock(i); else { Sound.fail(); showHint('점선으로 된 블록 자리 가까이에 놓아요', 3200); }
    }
    return true;
  }
  const specPos = (i) => (PHONE ? { x: 12 + (i % 2) * 274 + 131, y: 58 + Math.floor(i / 2) * 330 + 155, w: 262, h: 318 } : { x: 30 + i * 188 + 88, y: 60 + 232, w: 176, h: 464 });
  function specAt(p) {
    for (let i = 0; i < 4; i++) { const P = specPos(i); if (Math.abs(p.x - P.x) < P.w / 2 && Math.abs(p.y - P.y) < P.h / 2) return i; }
    return -1;
  }
  function runSpec(s) {
    const o = ST.sp[s.id];
    if (o.busy) return;
    o.busy = true; o.p = 0; ST.tested[s.id] = true; Sound.tick();
    tween(o, { p: 1 }, { duration: RM ? 0.01 : 1.5, ease: 'outCubic', onDone: () => { o.busy = false; Sound.click(); } });
    ST.specLast = s.id;
  }
  function stepStruct(dt) {}
  function drawStructBuild(t) {
    const ty = ST.type, info = STRUCT_INFO[ty], st = ST.st[ty], bl = typeBlocks();
    VIEW.sway = RM ? 0 : Math.sin(t * 0.7) * (ty === 'frame' ? 0.45 : 0.25);
    const blocks = bl.map((b, i) => (st.on[i] ? Object.assign({}, b, { a: st.a[i], pop: (1 - st.a[i]) * 0.3 }) : Object.assign({}, b, { ghost: true, hot: ST.hover === i, ga: ST.drag ? 0.9 : 0.55 })));
    if (ST.done[ty]) {
      // 이어지는 모습을 흐리게 보여 줘요
      if (ty === 'sheet') bl.forEach((b) => blocks.push({ c: [2 * b.c[0], 0, 2 * b.c[2]], flip: 1, yaw: (b.yaw || 0) + Math.PI * 0.33333, ghost: true, ga: 0.28 }));
      if (ty === 'chain') [-3, 3].forEach((k) => blocks.push({ c: [k * 1.633, 0, 0], flip: 1, yaw: -150 * DEG, ghost: true, ga: 0.3 }));
    }
    const res = drawBlocks(blocks, SG.cx, SG.cy, info.sc * SG.k, { faceA: 0.24 });
    // 제목
    pill(PHONE ? 280 : 400, PHONE ? 42 : 40, ST.done[ty] ? '✔ ' + info.name + ' (' + info.mineral + ')' : info.name + '을 만들어요: 블록 ' + bl.length + '개', { bg: ST.done[ty] ? '#16a34a' : '#fff', color: ST.done[ty] ? '#fff' : INK, border: ST.done[ty] ? null : '#cfd8e3', size: fs(15) });
    if (ST.done[ty]) {
      pill(SG.cx, PHONE ? 90 : 84, '한 블록이 이웃과 함께 쓰는 산소: ' + info.share + '개', { bg: '#eab308', color: '#fff', size: fs(14) });
      pill(SG.cx, SG.cy + (PHONE ? 196 : 176), info.desc, { bg: SKYD, color: '#fff', size: fs(PHONE ? 12 : 14) });
      if (ty === 'sheet') D.text(SG.cx, SG.cy + (PHONE ? 226 : 204), '바깥으로 계속 이어져 판 모양이 돼요 (희미한 블록)', { size: fs(12), weight: 700, color: MUTED });
    } else if (!ST.drag) {
      const last = PHONE ? 'ph' : '';
    }
    // 블록 보관함
    const T0 = trayStruct();
    D.shadow(() => { D.roundRect(T0.x - 110, T0.y - 56, 220, 112, 18); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = st.left > 0 ? SKY : '#cfd8e3'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); D.roundRect(T0.x - 110, T0.y - 56, 220, 112, 18); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.globalAlpha = st.left > 0 ? 1 : 0.3;
    tetraIcon(T0.x - 38, T0.y - 8 + Math.sin(t * 2) * 2, 34, 1);
    ctx.restore();
    D.text(T0.x + 44, T0.y - 6, '× ' + st.left, { size: fs(24), weight: 800, color: INK });
    D.text(T0.x, T0.y + 40, '사면체 블록 (끌어서 놓아요)', { size: fs(13), weight: 700, color: MUTED });
    if (ST.drag) { D.glow(ST.drag.x, ST.drag.y, 70, SKY, 0.22); tetraIcon(ST.drag.x, ST.drag.y, 40, 1); }
  }
  /* ---------- 광물 표본 ---------- */
  function drawSpecimen(id, x, y, p, t) {
    ctx.save(); ctx.translate(x, y);
    const r = seeded(id.length * 31 + id.charCodeAt(0));
    if (id === 'oliv') {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + r() * 0.5, d = 10 + r() * 34, px = Math.cos(a) * d, py = Math.sin(a) * d * 0.8, s = 9 + r() * 9;
        const k = p * (30 + r() * 20);
        ctx.save(); ctx.translate(px + Math.cos(a) * k, py + Math.sin(a) * k * 0.8 + p * p * 30); ctx.rotate(r() * TAU + p * 3);
        poly(0, 0, s, 5 + (i % 3), 0.3); ctx.fillStyle = i % 3 ? '#a8c93f' : '#7fa22a'; ctx.fill(); ctx.strokeStyle = 'rgba(40,60,10,.6)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
      }
    } else if (id === 'pyro') {
      for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
        const ox = (qx ? 1 : -1) * p * 22, oy = (qy ? 1 : -1) * p * 16;
        ctx.save(); ctx.translate(ox, oy);
        const g = ctx.createLinearGradient(-30 + qx * 30, 0, 30 + qx * 30, 0); g.addColorStop(0, '#46695a'); g.addColorStop(1, '#233a30');
        D.roundRect(-30 + qx * 30, -50 + qy * 50, 30, 50, 4); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#142219'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-30 + qx * 30 + k * 7, -50 + qy * 50 + 4); ctx.lineTo(-30 + qx * 30 + k * 7, qy * 50 - 4); ctx.stroke(); }
        ctx.restore();
      }
    } else if (id === 'biot') {
      for (let i = 0; i < 8; i++) {
        const lift = i >= 5 ? p : 0, oy = 38 - i * 10 - lift * (i - 4) * 9, ox = lift * (i - 4) * 12, rot = lift * (i - 4) * 0.12;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot);
        D.roundRect(-42, -5, 84, 10, 4); const g = ctx.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, '#6b5249'); g.addColorStop(1, '#2b1f1c'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#1b1210'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-36, -3, 40, 2);
        ctx.restore();
      }
    } else {
      const pieces = [[-24, -34, -8, -52, 14, -46, 26, -20, 8, -6, -14, -10], [-26, -2, -14, -12, 8, -6, 18, 10, 4, 26, -20, 24], [-6, 28, 12, 22, 26, 36, 14, 52, -12, 50], [26, -20, 30, 8, 18, 10], [-34, -34, -26, -2, -14, -12, -8, -52]];
      const hex = [[-22, -50], [22, -50], [38, -6], [22, 46], [-22, 46], [-38, -6]];
      if (p < 0.02) {
        const g = ctx.createLinearGradient(-38, 0, 38, 0); g.addColorStop(0, '#dbe7f3'); g.addColorStop(0.5, '#f4f9fd'); g.addColorStop(1, '#bcd0e2');
        ctx.beginPath(); hex.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#8aa1b8'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -42); ctx.lineTo(-30, -6); ctx.stroke();
      } else {
        const cents = [[-14, -24], [-22, 18], [12, 30], [26, -10], [4, -36]];
        pieces.forEach((pc, k) => {
          const c = cents[k], dx = c[0] * p * 0.9, dy = c[1] * p * 0.7 + p * p * 16;
          ctx.save(); ctx.translate(dx, dy); ctx.rotate(p * (k - 2) * 0.35);
          ctx.beginPath(); for (let q = 0; q < pc.length; q += 2) q ? ctx.lineTo(pc[q], pc[q + 1]) : ctx.moveTo(pc[q], pc[q + 1]); ctx.closePath();
          ctx.fillStyle = k % 2 ? 'rgba(220,232,244,.95)' : 'rgba(238,246,252,.95)'; ctx.fill(); ctx.strokeStyle = '#8aa1b8'; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        });
      }
    }
    ctx.restore();
  }
  function drawSpecView(t) {
    VIEW.sway = RM ? 0 : Math.sin(t * 0.7) * 0.3;
    SPEC.forEach((s, i) => {
      const P = specPos(i), o = ST.sp[s.id], tested = ST.tested[s.id];
      D.shadow(() => { D.roundRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 18); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = tested ? '#16a34a' : '#cfd8e3'; ctx.lineWidth = tested ? 3 : 2; D.roundRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 18); ctx.stroke();
      D.text(P.x, P.y - P.h / 2 + fs(30), s.n, { size: fs(20), weight: 800, color: INK });
      ctx.save(); D.roundRect(P.x - P.w / 2 + 2, P.y - P.h / 2 + 2, P.w - 4, P.h - 4, 16); ctx.clip();
      if (PHONE) { ctx.save(); ctx.translate(P.x, P.y - P.h / 2 + 106); ctx.scale(0.78, 0.78); drawSpecimen(s.id, 0, 0, o.p, t); ctx.restore(); } else drawSpecimen(s.id, P.x, P.y - P.h / 2 + 124, o.p, t);
      ctx.restore();
      const by = P.y - P.h / 2 + (PHONE ? 198 : 266);
      if (!tested) {
        pill(P.x, by, '🔨 눌러서 쪼개 보기', { bg: SKY, color: '#fff', size: fs(13) });
        D.text(P.x, by + fs(34), '(어떻게 부서질까요?)', { size: fs(12), weight: 700, color: MUTED });
      } else {
        const a = smooth((o.p - 0.5) * 2);
        ctx.save(); ctx.globalAlpha = a;
        const lns = s.note.length > 15 ? [s.note.slice(0, Math.ceil(s.note.length / 2) + (s.note[Math.ceil(s.note.length / 2)] === ' ' ? 0 : 0))] : [s.note];
        const words = s.note.split(' '); const l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
        lines(P.x, by - fs(6), [l1, l2], { size: fs(12), weight: 800, color: '#0b6b39', lh: fs(17) });
        // 미니 구조
        const mb = structBlocks(s.type).map((b) => Object.assign({ a: 1 }, b));
        const msc = (PHONE ? 13 : 13) * (s.type === 'sheet' ? 1.15 : 1);
        drawBlocks(mb, P.x, by + (PHONE ? 56 : 86), msc, { mono: true, faceA: 0.22 });
        pill(P.x, by + (PHONE ? 98 : 148), STRUCT_INFO[s.type].name + ' 배열', { bg: '#fff', color: SKYD, border: SKY, size: fs(13) });
        ctx.restore();
      }
    });
  }
  /* ---------- 표본 비교표 ---------- */
  const ARR = ['독립형', '사슬형', '판상형', '망상형'];
  const CLV = ['한 방향으로 얇은 판처럼 쪼개져요', '두 방향으로 쪼개져 기둥 모양이에요', '쪼개짐 없이 불규칙하게 깨져요'];
  const tblEls = [];
  const TS = { done: false };
  function buildTable() {
    const t = $('#ctable');
    let h = '<thead><tr><th>광물</th><th>사면체 배열</th><th>부서질 때의 모습</th></tr></thead><tbody>';
    SPEC.forEach((row, i) => {
      h += '<tr><th>' + row.n + '</th>';
      [ARR, CLV].forEach((opts, j) => {
        const idx = opts.map((txt, k) => ({ txt, k })); if ((i + j) % 2 === 1) idx.reverse();
        const right = j ? row.clv : row.arr;
        h += '<td><select data-r="' + i + '" data-c="' + j + '" aria-label="' + row.n + (j ? ' 부서질 때의 모습' : ' 사면체 배열') + '"><option value="">선택</option>' + idx.map((o) => '<option value="' + (o.k === right ? 'y' : 'n' + o.k) + '">' + o.txt + '</option>').join('') + '</select></td>';
      });
      h += '</tr>';
    });
    t.innerHTML = h + '</tbody>';
    $$('#ctable select').forEach((s) => {
      tblEls.push(s);
      s.addEventListener('change', () => {
        s.classList.remove('bad');
        const ok = s.value === 'y'; s.classList.toggle('ok', ok);
        if (ok) Sound.click();
        if (tableAllOk() && !TS.done) { TS.done = true; Sound.success(); fx.burst(VW / 2, VH / 2, { count: 18, speed: 160 }); }
      });
    });
  }
  const tableAllOk = () => tblEls.length > 0 && tblEls.every((s) => s.value === 'y');
  function tableCheck() {
    let empty = 0, firstBad = -1;
    tblEls.forEach((s) => {
      if (s.value === '') { empty++; return; }
      if (s.value !== 'y') { if (firstBad < 0) firstBad = +s.dataset.r; if (!s.classList.contains('bad')) s.classList.add('bad'); }
      else s.classList.remove('bad');
    });
    if (tableAllOk()) return true;
    if (firstBad >= 0) { const sp = SPEC[firstBad]; return ST.tested[sp.id] ? '"' + sp.n + '" 줄을 다시 확인해요. 연결이 많을수록 단단하고 쪼개짐이 적어요 (독립형 → 망상형 순서로 연결이 많아져요).' : '"' + sp.n + '" 줄을 다시 확인해요. [표본 살펴보기]에서 ' + sp.n + ' 표본을 눌러 쪼개 보면 알 수 있어요.'; }
    return '아직 빈칸이 ' + empty + '개 남았어요.';
  }
  function resetTable() { tblEls.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); TS.done = false; }

  /* =========================================================
     ④ 정리: 규산염 광물 / 비규산염 광물 분류
     ========================================================= */
  const MCARDS = [
    { id: 'quartz', f: '석영', k: 'sil', els: ['Si', 'O'] },
    { id: 'calc', f: '방해석', k: 'non', els: ['Ca', 'C', 'O'] },
    { id: 'feld', f: '장석', k: 'sil', els: ['Si', 'O', 'Al', 'K'] },
    { id: 'magn', f: '자철석', k: 'non', els: ['Fe', 'O'] },
    { id: 'biot', f: '흑운모', k: 'sil', els: ['Si', 'O', 'Mg', 'Fe'] },
    { id: 'pyri', f: '황철석', k: 'non', els: ['Fe', 'S'] },
    { id: 'oliv', f: '감람석', k: 'sil', els: ['Si', 'O', 'Mg', 'Fe'] },
  ];
  const BINS = PHONE
    ? { sil: { x: 12, y: 126, w: 262, h: 286 }, non: { x: 286, y: 126, w: 262, h: 286 } }
    : { sil: { x: 24, y: 150, w: 364, h: 276 }, non: { x: 412, y: 150, w: 364, h: 276 } };
  const MSZ = PHONE ? { bw: 117, bh: 42, tw: 244, th: 50 } : { bw: 163, bh: 48, tw: 172, th: 56 };
  const SO = { cards: [], drag: null, seqN: 0 };
  const mTray = (i) => (PHONE ? { x: 12 + 122 + (i % 2) * 262, y: 462 + Math.floor(i / 2) * 58 } : { x: 24 + 86 + (i % 4) * 182, y: 484 + Math.floor(i / 4) * 66 });
  const mBin = (bin, slot) => { const b = BINS[bin], col = slot % 2, row = Math.floor(slot / 2); return { x: b.x + 14 + MSZ.bw / 2 + col * (MSZ.bw + 10), y: b.y + (PHONE ? 78 : 86) + MSZ.bh / 2 + row * (MSZ.bh + 8) }; };
  function resetSort() {
    SO.cards = MCARDS.map((c, i) => { const t = mTray(i); return Object.assign({}, c, { bin: null, seq: 0, x: t.x, y: t.y, tx: t.x, ty: t.y, lift: 0, mark: null, shake: 0 }); });
    SO.drag = null; SO.seqN = 0;
    $('#sortNote').innerHTML = '광물 카드를 끌어 <b>규산염 광물</b> / <b>비규산염 광물</b> 상자에 넣어요. 카드의 원소 동그라미를 살펴봐요.';
  }
  function shuffleSort() {
    const un = SO.cards.filter((c) => !c.bin);
    const slots = un.map((c) => (c.trayIdx != null ? c.trayIdx : MCARDS.findIndex((x) => x.id === c.id))).sort(() => Math.random() - 0.5);
    un.forEach((c, i) => { c.trayIdx = slots[i]; });
    Sound.click();
  }
  function layoutSort() {
    ['sil', 'non'].forEach((k) => { SO.cards.filter((c) => c.bin === k).sort((a, b) => a.seq - b.seq).forEach((c, i) => { const t = mBin(k, i); c.tx = t.x; c.ty = t.y; }); });
    const un = SO.cards.filter((c) => !c.bin);
    un.forEach((c, i) => { const idx = c.trayIdx != null ? c.trayIdx : MCARDS.findIndex((x) => x.id === c.id); const t = mTray(idx); c.tx = t.x; c.ty = t.y; });
  }
  function sortCheck() {
    const un = SO.cards.filter((c) => !c.bin).length;
    if (un) return '아직 ' + un + '장이 상자에 들어가지 않았어요.';
    const bad = SO.cards.filter((c) => c.bin !== c.k);
    SO.cards.forEach((c) => { const m = c.bin !== c.k ? 'bad' : null; if (c.mark !== m) { c.mark = m; if (m) c.shake = 1; } });
    if (bad.length) return '✕ 표시된 ' + bad.length + '장을 다시 확인해요. 카드에 규소(Si)와 산소(O)가 함께 있으면 Si–O 사면체 블록으로 이루어진 규산염 광물이에요.';
    return true;
  }
  function stepSort(dt) {
    layoutSort();
    SO.cards.forEach((c) => {
      if (SO.drag && SO.drag.card === c) { c.lift = approach(c.lift, 1, dt, 14); return; }
      c.lift = approach(c.lift, 0, dt, 12);
      c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.4);
    });
  }
  function sortCardAt(p) {
    for (let i = SO.cards.length - 1; i >= 0; i--) {
      const c = SO.cards[i], w = c.bin ? MSZ.bw : MSZ.tw, h = c.bin ? MSZ.bh : MSZ.th;
      if (Math.abs(p.x - c.x) < w / 2 && Math.abs(p.y - c.y) < h / 2) return c;
    }
    return null;
  }
  function sortPointer(p, type) {
    if (type === 'down') {
      const c = sortCardAt(p); if (!c) return false;
      SO.drag = { card: c, ox: p.x - c.x, oy: p.y - c.y }; c.mark = null; Sound.click(); return true;
    }
    const d = SO.drag; if (!d) return true;
    if (type === 'move') { d.card.x = p.x - d.ox; d.card.y = p.y - d.oy; }
    else if (type === 'up') {
      const c = d.card; SO.drag = null;
      let nb = null;
      ['sil', 'non'].forEach((k) => { const b = BINS[k]; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) nb = k; });
      const was = c.bin; c.bin = nb;
      if (nb && nb !== was) { c.seq = ++SO.seqN; Sound.tick(); fx.burst(c.x, c.y, { count: 6, colors: [nb === 'sil' ? SKY : '#f59e0b'], speed: 70, size: 3, gravity: 0, life: 0.4 }); }
    }
    return true;
  }
  function drawSortCard(c, t) {
    const inBin = !!c.bin, w = inBin ? MSZ.bw : MSZ.tw, h = inBin ? MSZ.bh : MSZ.th;
    const sc = 1 + c.lift * 0.1, sx = c.shake > 0 ? Math.sin(c.shake * 30) * 5 * c.shake : 0;
    ctx.save(); ctx.translate(c.x + sx, c.y - c.lift * 6); ctx.scale(sc, sc);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + c.lift * 12, y: 2 + c.lift * 7 });
    ctx.lineWidth = 2.5; ctx.strokeStyle = c.mark === 'bad' ? '#e2464b' : inBin ? (c.bin === 'sil' ? SKY : '#f59e0b') : '#c9d2e3';
    D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    if (inBin) D.text(0, 6, c.f, { size: fs(PHONE ? 15 : 17), weight: 800, color: INK });
    else {
      D.text(-w / 2 + 14, 6, c.f, { size: fs(PHONE ? 16 : 18), weight: 800, color: INK, align: 'left' });
      const n = c.els.length, r = PHONE ? 10 : 11;
      c.els.forEach((e, i) => {
        const ex = w / 2 - 16 - (n - 1 - i) * (r * 2 + 3), core = e === 'Si';
        if (core) D.glow(ex, 0, r * 2, '#fde047', 0.8);
        D.sphere(ex, 0, r, ELC[e], { gloss: false, shadow: false, outline: core ? '#facc15' : null, outlineWidth: 2 });
        D.text(ex, 4, e, { size: e.length > 1 ? 10 : 12, weight: 800, color: e === 'Si' ? '#5b3a00' : '#fff' });
      });
    }
    if (c.mark === 'bad') D.text(w / 2 - 6, -h / 2 + 4, '✕', { size: 22, weight: 800, color: '#e2464b', align: 'right', stroke: '#fff', strokeWidth: 4 });
    ctx.restore();
  }
  function drawSort(t) {
    VIEW.sway = RM ? 0 : Math.sin(t * 0.7) * 0.5;
    // 위쪽: 같은 블록, 다른 배열
    const by = PHONE ? 70 : 78;
    pill(VW / 2, PHONE ? 26 : 26, '블록 1종류 → 연결 방식 4가지 → 수많은 광물', { bg: SKYD, color: '#fff', size: fs(PHONE ? 13 : 15) });
    TYPES.forEach((k, i) => {
      const x = (VW / 4) * (i + 0.5);
      const mb = structBlocks(k).map((b) => Object.assign({ a: 1 }, b));
      drawBlocks(mb, x, by + (k === 'chain' ? 6 : 0), (PHONE ? 10 : 13) * (k === 'sheet' ? 1.15 : 1), { mono: true, faceA: 0.2 });
      D.text(x, by + (PHONE ? 38 : 48), STRUCT_INFO[k].name, { size: fs(13), weight: 800, color: SKYD });
    });
    ['sil', 'non'].forEach((k) => {
      const b = BINS[k], col = k === 'sil' ? SKY : '#f59e0b';
      const hot = SO.drag && SO.drag.card.x > b.x && SO.drag.card.x < b.x + b.w && SO.drag.card.y > b.y && SO.drag.card.y < b.y + b.h;
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fillStyle = hot ? (k === 'sil' ? '#e0f2fe' : '#fef3c7') : 'rgba(255,255,255,.82)'; ctx.fill(); }, { blur: 10, y: 3 });
      ctx.strokeStyle = col; ctx.lineWidth = hot ? 4 : 2.5; ctx.setLineDash(hot ? [] : [8, 6]); D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.stroke(); ctx.setLineDash([]);
      if (k === 'sil') tetraIcon(b.x + 36, b.y + 34, 16, 1);
      else { D.sphere(b.x + 36, b.y + 34, 16, '#9ca3af', { shadow: false }); D.text(b.x + 36, b.y + 40, '✕', { size: 16, weight: 800, color: '#fff' }); }
      D.text(b.x + 66, b.y + 32, k === 'sil' ? '규산염 광물' : '비규산염 광물', { size: fs(PHONE ? 16 : 19), weight: 800, color: k === 'sil' ? SKYD : '#b45309', align: 'left' });
      D.text(b.x + 66, b.y + 54, k === 'sil' ? 'Si–O 사면체가 기본 단위' : 'Si–O 사면체가 없어요', { size: fs(PHONE ? 11 : 13), weight: 700, color: MUTED, align: 'left' });
    });
    const inb = SO.cards.filter((c) => c.bin && c !== (SO.drag && SO.drag.card)), outb = SO.cards.filter((c) => !c.bin && c !== (SO.drag && SO.drag.card));
    outb.forEach((c) => drawSortCard(c, t)); inb.forEach((c) => drawSortCard(c, t));
    if (SO.drag) drawSortCard(SO.drag.card, t);
    const left = SO.cards.filter((c) => !c.bin).length;
    D.text(VW / 2, PHONE ? 436 : 450, left ? '광물 카드 ' + left + '장 · 끌어서 상자에 넣어요' : '모든 카드를 상자에 넣었어요 ✔', { size: fs(14), weight: 800, color: left ? MUTED : '#0b6b39' });
    const ly = PHONE ? 722 : 590;
    D.sphere(VW / 2 - fs(130), ly, 9, SI, { gloss: false, shadow: false, outline: '#facc15', outlineWidth: 2 }); D.text(VW / 2 - fs(116), ly + 5, '규소(Si)', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.sphere(VW / 2 - fs(30), ly, 9, OX, { gloss: false, shadow: false }); D.text(VW / 2 - fs(16), ly + 5, '산소(O)', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.sphere(VW / 2 + fs(66), ly, 9, '#94a3b8', { gloss: false, shadow: false }); D.text(VW / 2 + fs(80), ly + 5, '그 밖의 원소', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
  }

  /* =========================================================
     읽기판 · 입력 · 그리기 · 반복
     ========================================================= */
  function updateReadouts() {
    const key = curKey();
    if (key === 'pie') {
      const s = PIE.sel;
      setRO(1, '선택한 원소', s >= 0 ? CRUST[s][2] + ' ' + CRUST[s][1] + ' %' : '조각을 눌러요');
      setRO(2, '산소 + 규소', '74.3 %'); setRO(3, '나머지 원소', '25.7 %');
    } else if (key === 'rock') {
      const n = Object.keys(ROCK.viewed).length;
      setRO(1, '확대 단계', ['암석', '광물 알갱이', '블록 단위'][Math.round(ROCK.zoom)]);
      setRO(2, '확인한 광물', n + ' / 5');
      setRO(3, '모든 광물에 있는 원소', 'Si, O');
    } else if (key === 'make') {
      const on = TE.slots.filter((s) => s.on).length;
      setRO(1, '규소(Si)', (TE.slots[0].on ? 1 : 0) + ' / 1개'); setRO(2, '산소(O)', Math.max(0, on - (TE.slots[0].on ? 1 : 0)) + ' / 4개');
      setRO(3, '만든 블록', TE.done ? 'Si–O 사면체' : '-');
    } else if (key === 'join') {
      setRO(1, '사면체', TE.join >= 0 ? '2개' : '1개'); setRO(2, '규소 · 산소', TE.join >= 0 ? 'Si 2 · O 7' : 'Si 1 · O 4'); setRO(3, '함께 쓰는 산소', TE.join >= 0 ? '1개' : '0개');
    } else if (key === 'build') {
      const info = STRUCT_INFO[ST.type], st = ST.st[ST.type], n = st.on.length - st.left;
      setRO(1, '조립 중인 배열', info.name); setRO(2, '놓은 블록', n + ' / ' + st.on.length + '개'); setRO(3, '한 블록이 함께 쓰는 산소', ST.done[ST.type] ? info.share + '개' : '-');
    } else if (key === 'spec') {
      setRO(1, '쪼개 본 표본', Object.keys(ST.tested).length + ' / 4'); setRO(2, '연결이 가장 많은 배열', '망상형 (석영)'); setRO(3, '얇게 쪼개지는 광물', ST.tested.biot ? '흑운모' : '?');
    } else {
      const a = SO.cards.filter((c) => c.bin === 'sil').length, b = SO.cards.filter((c) => c.bin === 'non').length;
      setRO(1, '규산염 광물 상자', a + '장'); setRO(2, '비규산염 광물 상자', b + '장'); setRO(3, '남은 카드', (SO.cards.length - a - b) + '장');
    }
  }
  const hasTouchHit = (p) => {
    const key = curKey();
    if (key === 'pie') return pieHit(p) >= 0;
    if (key === 'make') return (TE.supply.Si > 0 && Math.hypot(p.x - traySi().x, p.y - traySi().y) < 50) || (TE.supply.O > 0 && Math.hypot(p.x - trayO().x, p.y - trayO().y) < 56);
    if (key === 'join') return TE.join < 0 && Math.hypot(p.x - trayB().x, p.y - trayB().y) < 60;
    if (key === 'build') { const t0 = trayStruct(); return ST.st[ST.type].left > 0 && Math.abs(p.x - t0.x) < 110 && Math.abs(p.y - t0.y) < 56; }
    if (key === 'sort') return !!sortCardAt(p);
    return false;
  };
  SciSim.pointer(view, {
    down(p) {
      const key = curKey();
      if (key === 'pie') { const i = pieHit(p); if (i >= 0) pieSelect(i); return false; }
      if (key === 'rock') { rockPointer(p); return false; }
      if (key === 'make' || key === 'join') return tetraPointer(p, 'down');
      if (key === 'build' || key === 'spec') return structPointer(p, 'down');
      if (key === 'sort') return sortPointer(p, 'down');
      return false;
    },
    move(p) { const key = curKey(); if (key === 'make' || key === 'join') tetraPointer(p, 'move'); else if (key === 'build') structPointer(p, 'move'); else if (key === 'sort') sortPointer(p, 'move'); },
    up(p) { const key = curKey(); if (key === 'make' || key === 'join') tetraPointer(p, 'up'); else if (key === 'build') structPointer(p, 'up'); else if (key === 'sort') sortPointer(p, 'up'); },
    hover(p) {
      const key = curKey();
      if (key === 'pie') return pieHit(p) >= 0 ? 'pointer' : null;
      if (key === 'rock') return MIN5.some((m, i) => { const P = rockCardPos(i); return Math.abs(p.x - P.x) < P.w / 2 && Math.abs(p.y - P.y) < P.h / 2; }) ? 'pointer' : null;
      if (key === 'spec') return specAt(p) >= 0 ? 'pointer' : null;
      return hasTouchHit(p) ? 'grab' : null;
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => { const t0 = e.touches[0]; if (!t0) return; if (hasTouchHit(view.toLocal(t0))) e.preventDefault(); }, { passive: false });
  }
  $$('#crustTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene('crust', b.dataset.v); $('#crustNote').textContent = b.dataset.v === 'pie' ? '조각을 눌러 지각을 이루는 원소의 비율을 살펴봐요.' : '➕ 확대로 암석 속을 들여다보고, 광물 카드를 눌러 구성 원소를 확인해요.'; }));
  $('#zoomIn').addEventListener('click', () => { ROCK.tgt = Math.min(2, ROCK.tgt + 1); Sound.click(); });
  $('#zoomOut').addEventListener('click', () => { ROCK.tgt = Math.max(0, ROCK.tgt - 1); Sound.click(); });
  $$('#tetraTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene('tetra', b.dataset.v); $('#tetraNote').textContent = b.dataset.v === 'make' ? '규소(Si) 1개와 산소(O) 4개를 끌어다 점선 자리에 놓아요.' : '블록 B를 사면체 A의 꼭짓점(산소) 쪽으로 끌어 붙여요.'; }));
  $$('#structTabs button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene('struct', b.dataset.v); $('#structNote').textContent = b.dataset.v === 'build' ? '아래 블록을 끌어다 점선 자리에 놓아 배열을 완성해요.' : '표본을 눌러 쪼개 보고, 구조와 성질을 연결해 봐요.'; }));
  $$('#typeBtns .opt').forEach((b) => b.addEventListener('click', () => setType(b.dataset.t)));
  $('#shuffleBtn').addEventListener('click', shuffleSort);
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const key = curKey();
    if (key === 'pie') { PIE.sel = -1; CRUST.forEach((c, k) => { PIE.pop[k] = 0; }); onEnter('pie'); }
    else if (key === 'rock') { ROCK.sel = -1; ROCK.tgt = 0; }
    else if (key === 'make') { const j = TE.join, ja = TE.joinA; resetTetra(); TE.join = j; TE.joinA = ja; }
    else if (key === 'join') { TE.join = -1; TE.joinA = 0; }
    else if (key === 'build') resetType(ST.type);
    else if (key === 'spec') { SPEC.forEach((s) => { ST.sp[s.id].p = 0; }); }
    else resetSort();
    updateUI();
  });

  function draw(t) {
    view.clear(BG);
    bgFill();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    const key = curKey();
    VIEW.sway = 0;
    if (key === 'pie') drawPie(t);
    else if (key === 'rock') drawRock(t);
    else if (key === 'make' || key === 'join') drawTetra(t);
    else if (key === 'build') drawStructBuild(t);
    else if (key === 'spec') drawSpecView(t);
    else drawSort(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '지각을 이루는 물질', short: '지각의 광물', icon: '🪨', phase: '관찰',
      features: ['crust'],
      intro: '<p class="si-q">❓ 탐구 질문: 지각에는 광물이 수천 종이나 있는데, 어떻게 이렇게 다양한 광물이 만들어졌을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 암석은 여러 가지 광물로 이루어져 있고, 광물은 색·조흔색·굳기·쪼개짐 같은 특성이 서로 다르다고 배웠어요.</div>' +
        '<p>먼저 지각을 이루는 <b>원소</b>를 알아보고, 화강암을 <b>확대</b>해서 광물 5가지가 어떤 원소로 이루어져 있는지 찾아봐요.</p>',
      setup() { PIE.seen = {}; ROCK.viewed = {}; ROCK.sel = -1; ROCK.tgt = 0; ROCK.zoom = 0; PIE.sel = -1; setScene('crust', 'pie'); $('#crustNote').textContent = '조각을 눌러 지각을 이루는 원소의 비율을 살펴봐요.'; showHint('원소 조각이나 아래 목록을 눌러 봐요', 4500); },
      recap: '지각의 질량 중 약 <b>74 %</b>가 <b>산소와 규소</b>이고, 지각의 광물은 대부분 규소와 산소를 포함하는 <b>규산염 광물</b>이에요.',
      summary: '<ul><li>지각을 이루는 원소(질량 %): <b>산소 46.6 · 규소 27.7</b> · 알루미늄 8.1 · 철 5.0 · 칼슘 3.6 · 나트륨 2.8 · 칼륨 2.6 · 마그네슘 2.1</li>' +
        '<li>산소 + 규소 = <b>약 74 %</b></li><li>화강암 속 광물(석영, 장석, 흑운모)을 포함한 지각의 광물은 대부분 <b>규산염 광물</b>이에요.</li></ul>' +
        '<span class="formula">지각의 대부분 = 규소 + 산소</span>',
      missions: [
        {
          title: '지각 원소와 광물의 조성 확인하기',
          goal: '<b>📊 원소 비율</b>에서 <b>산소</b>와 <b>규소</b> 조각을 눌러 보고, <b>🪨 암석·광물</b>에서 광물 카드 <b>5개</b>의 구성 원소를 모두 확인해요.',
          hint: '도넛 그래프의 O와 Si 조각(또는 오른쪽 목록)을 눌러요. 그다음 🪨 암석·광물 탭에서 ➕ 확대로 암석 속을 보고, 광물 카드를 하나씩 눌러요.',
          check: () => PIE.seen.O && PIE.seen.Si && Object.keys(ROCK.viewed).length >= 5,
          hold: 0.5,
          status: () => mark(PIE.seen.O) + ' 산소 · ' + mark(PIE.seen.Si) + ' 규소 · ' + mark(Object.keys(ROCK.viewed).length >= 5) + ' 광물 ' + Object.keys(ROCK.viewed).length + ' / 5',
          explain: '석영, 장석, 흑운모, 휘석, 감람석 <b>5가지 광물 모두에 규소(Si)와 산소(O)가 들어 있어요</b>. 지각에서 가장 많은 두 원소가 광물을 이루는 기본 재료예요.',
        },
        {
          type: 'quiz', title: '지각에서 가장 많은 두 원소',
          goal: '지각을 이루는 원소 중 <b>가장 많은 두 원소</b>는?',
          choices: ['산소와 규소', '산소와 철', '규소와 알루미늄', '철과 알루미늄'],
          answer: 0,
          feedback: ['', '철은 5.0 %로 네 번째예요. 산소 다음으로 많은 것은 규소(27.7 %)예요.', '알루미늄은 8.1 %로 세 번째예요. 가장 많은 것은 산소(46.6 %)예요.', '철과 알루미늄은 각각 5.0 %, 8.1 %로 가장 많은 원소가 아니에요.'],
          explain: '산소(46.6 %)와 규소(27.7 %)를 합하면 <b>약 74 %</b>예요. 그래서 지각의 광물 대부분이 규소와 산소를 포함한 <b>규산염 광물</b>이에요.',
        },
      ],
    },
    /* ---------- 2단계 · 모형 ---------- */
    {
      title: '규소와 산소로 블록 만들기', short: '사면체', icon: '🔺', phase: '모형',
      features: ['tetra'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 석영, 장석, 흑운모 같은 광물에는 모두 <b>규소(Si)와 산소(O)</b>가 들어 있었어요.</div>' +
        '<p>규소 원자 1개를 산소 원자 4개가 둘러싼 <b>Si–O 사면체</b>가 규산염 광물의 <b>기본 단위(블록)</b>예요. 직접 만들고, 두 블록을 <b>산소 1개를 함께 쓰며</b> 이어 붙여 봐요.</p>' +
        '<p class="note">구체적인 구조식이나 화학식은 다루지 않아요. 블록의 모양과 연결에만 집중해요.</p>',
      setup() { resetTetra(); setScene('tetra', 'make'); showHint('규소와 산소 구슬을 끌어다 점선 자리에 놓아요', 4500); },
      recap: '규산염 광물의 기본 단위는 규소 1개를 산소 4개가 둘러싼 <b>Si–O 사면체</b>예요. 사면체는 산소 1개를 <b>함께 쓰며</b> 이어 붙을 수 있어요.',
      summary: '<ul><li><b>Si–O 사면체</b>: 규소(Si) 1개를 산소(O) 4개가 둘러싼 사면체 블록. 규산염 광물의 <b>기본 단위체</b>.</li>' +
        '<li>사면체끼리는 <b>산소를 함께 쓰며</b> 이어 붙어요. 두 사면체가 산소 1개를 공유하면 Si 2개, O 7개(4 + 4 − 1)예요.</li></ul>' +
        '<span class="formula">규소 1 + 산소 4 = Si–O 사면체</span>',
      missions: [
        {
          title: '사면체 만들기',
          goal: '<b>규소(Si) 1개</b>와 <b>산소(O) 4개</b>를 끌어다 점선 자리에 놓아 사면체를 완성해요.',
          hint: '규소는 가운데, 산소는 네 꼭짓점에 놓아요. 끌 때 점선 자리가 반짝여요.',
          setup() { resetTetra(); setScene('tetra', 'make'); },
          check: () => TE.done,
          hold: 0.6,
          status: () => mark(TE.slots[0].on) + ' 규소 1개 · ' + mark(TE.slots.slice(1).every((s) => s.on)) + ' 산소 ' + TE.slots.slice(1).filter((s) => s.on).length + ' / 4개',
          explain: '규소 1개를 산소 4개가 둘러싸면 면이 4개인 <b>사면체</b> 모양이 돼요. 이 <b>Si–O 사면체</b>가 규산염 광물을 이루는 기본 블록이에요.',
        },
        {
          title: '두 사면체 이어 붙이기',
          goal: '블록 <b>B</b>를 사면체 <b>A</b>의 꼭짓점(산소) 쪽으로 끌어 붙여요. 두 블록이 <b>산소 1개를 함께</b> 써요.',
          hint: '블록 B를 끌면 A의 네 꼭짓점 쪽에 동그라미가 나타나요. 그 가까이에 놓아요.',
          setup() { TE.join = -1; TE.joinA = 0; TE.jdrag = null; setScene('tetra', 'join'); },
          check: () => TE.join >= 0 && TE.joinA > 0.95,
          hold: 0.6,
          status: () => mark(TE.jdrag) + ' 블록 B 끌기 · ' + mark(TE.join >= 0 && TE.joinA > 0.95) + ' 산소 1개를 함께 씀',
          explain: '두 사면체가 꼭짓점의 <b>산소 1개를 함께</b> 쓰면 규소 2개와 산소 <b>7개</b>(4 + 4 − 1)가 돼요. 이렇게 산소를 나눠 쓰며 사면체가 계속 이어질 수 있어요.',
        },
        {
          type: 'quiz', title: '규산염 광물의 기본 단위',
          goal: '규산염 광물의 <b>기본 단위(블록)</b>는?',
          choices: ['규소 1개를 산소 4개가 둘러싼 사면체', '규소 4개를 산소 1개가 둘러싼 사면체', '규소 1개와 산소 1개로 이루어진 막대', '산소 4개로만 이루어진 사각형'],
          answer: 0,
          feedback: ['', '지각에는 산소가 규소보다 많아요. 규소 1개를 산소 4개가 둘러싸요.', '블록은 산소가 4개 필요해요. 규소 1개 둘레에 산소 4개가 사면체 모양으로 놓여요.', '규소가 가운데에 있어야 해요. 규소 1개와 산소 4개의 사면체예요.'],
          explain: '기본 단위는 <b>규소 1개 + 산소 4개</b>로 이루어진 <b>Si–O 사면체</b>예요.',
        },
      ],
    },
    /* ---------- 3단계 · 탐구 ---------- */
    {
      title: '블록을 잇는 여러 가지 방법', short: '연결 방식', icon: '🧱', phase: '탐구',
      features: ['struct'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사면체 블록이 산소를 함께 쓰며 이어 붙는다는 것을 알았어요.</div>' +
        '<p>블록을 <b>어떻게 이어 붙이느냐</b>에 따라 구조가 달라져요: <b>독립형 · 사슬형 · 판상형 · 망상형</b>. 네 가지를 직접 조립하고, 광물 표본을 쪼개 보며 구조와 성질을 연결해 봐요.</p>',
      setup() { resetStruct(); ST.tested = {}; SPEC.forEach((s) => { ST.sp[s.id].p = 0; }); setScene('struct', 'build'); ST.type = 'island'; updateUI(); showHint('블록을 끌어다 점선 자리에 놓아 독립형부터 만들어 봐요', 4500); },
      recap: '사면체가 따로 있으면 <b>독립형</b>, 산소 2개를 함께 쓰면 <b>사슬형</b>, 3개면 <b>판상형</b>, 4개면 <b>망상형</b>이에요. 연결이 많을수록 단단하고 쪼개짐이 적어요.',
      summary: '<table class="mini"><tr><th>배열</th><th>함께 쓰는 산소</th><th>광물 예</th><th>성질</th></tr><tr><td>독립형</td><td>0개</td><td>감람석</td><td>쪼개짐 없음</td></tr><tr><td>사슬형</td><td>2개</td><td>휘석</td><td>두 방향 쪼개짐</td></tr><tr><td>판상형</td><td>3개</td><td>흑운모</td><td>얇은 판으로 쪼개짐</td></tr><tr><td>망상형</td><td>4개</td><td>석영</td><td>쪼개짐 없이 깨짐</td></tr></table>' +
        '<p class="note">연결이 많을수록 단단하고 쪼개짐이 적어요.</p>',
      missions: [
        {
          title: '배열 4가지 조립하기',
          goal: '위의 버튼으로 종류를 바꾸며 <b>독립형 · 사슬형 · 판상형 · 망상형</b>을 모두 조립해요.',
          hint: '블록을 끌어 점선 자리에 하나씩 놓아요. 노란 산소는 두 블록이 함께 쓰는 산소예요.',
          setup() { S.table = false; setScene('struct', 'build'); updateUI(); },
          check: () => TYPES.every((k) => ST.done[k]),
          hold: 0.6,
          status: () => TYPES.map((k) => mark(ST.done[k]) + ' ' + STRUCT_INFO[k].name).join(' · '),
          explain: '독립형은 산소를 함께 쓰지 않고, 사슬형은 2개, 판상형은 3개, 망상형은 4개를 이웃 사면체와 <b>함께 써요</b>. 블록 하나로도 연결 방식에 따라 구조가 달라져요.',
        },
        {
          key: 'table', title: '광물 짝짓기', manual: true,
          goal: '<b>🔨 표본 살펴보기</b>에서 표본을 눌러 쪼개 본 뒤, 표에서 광물의 <b>배열</b>과 <b>부서질 때의 모습</b>을 골라요.',
          hint: '표본을 눌러 쪼개 보면 구조(배열)와 성질이 함께 나와요. 연결이 가장 많은 망상형이 가장 단단해요.',
          setup() { S.table = true; resetTable(); setScene('struct', 'spec'); updateUI(); },
          check: () => tableCheck(),
          explain: '<b>감람석(독립형)</b>과 <b>석영(망상형)</b>은 쪼개짐 없이 깨져요. <b>휘석(사슬형)</b>은 두 방향으로 쪼개져 기둥 모양이 되고, <b>흑운모(판상형)</b>는 판 사이로 한 방향으로 얇게 쪼개져요. 석영은 모든 방향으로 산소를 함께 써서 가장 단단해요.',
        },
        {
          type: 'quiz', title: '흑운모가 얇게 쪼개지는 까닭',
          goal: '판상형 구조인 <b>흑운모</b>가 얇은 판으로 쪼개지는 까닭으로 알맞은 것은?',
          choices: ['판 모양으로 이어진 층과 층 사이의 결합이 약해서 층을 따라 쪼개져요', '사면체가 하나씩 따로 떨어져 있어서 쉽게 흩어져요', '모든 방향으로 산소를 함께 써서 단단하게 이어져 있어요', '규소가 들어 있지 않은 광물이라서 약해요'],
          answer: 0,
          feedback: ['', '사면체가 따로 떨어진 것은 독립형이에요. 흑운모는 판처럼 넓게 이어진 판상형이에요.', '모든 방향으로 이어진 것은 망상형(석영)이에요. 그래서 석영은 쪼개짐 없이 깨져요.', '흑운모도 Si–O 사면체로 이루어진 규산염 광물이에요.'],
          explain: '흑운모는 사면체가 <b>판 모양의 층</b>으로 이어져 있어요. 층 안은 단단히 이어져 있지만 층과 층 사이는 약해서, 판을 따라 <b>얇게 쪼개져요</b>.',
        },
      ],
    },
    /* ---------- 4단계 · 확인 ---------- */
    {
      title: '하나의 블록, 수많은 광물', short: '정리', icon: '📚', phase: '확인',
      features: ['sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 사면체 블록이 연결 방식에 따라 독립형, 사슬형, 판상형, 망상형이 된다는 것을 알았어요.</div>' +
        '<p>레고 블록 하나로 여러 가지 모양을 만들 수 있듯이, <b>사면체 블록</b> 하나로 다양한 구조가 만들어져요. 여기에 <b>금속 이온</b>(Fe, Mg, Al, K 등)이 결합하면 광물의 종류가 더 늘어나요. 광물 카드를 <b>규산염 광물 / 비규산염 광물</b>로 분류해 봐요.</p>',
      setup() { S.table = false; resetSort(); setScene('sort'); updateUI(); showHint('카드의 원소 동그라미를 보고 상자에 넣어요', 4500); },
      recap: '규산염 광물은 모두 <b>Si–O 사면체</b>를 기본 단위로 하지만, 연결 방식과 결합하는 금속 이온에 따라 구조와 성질이 다양한 광물이 만들어져요.',
      summary: '<ul><li><b>규산염 광물</b>: Si–O 사면체를 기본 단위(블록)로 하는 광물. 석영, 장석, 흑운모, 휘석, 감람석 등.</li>' +
        '<li>같은 블록이라도 <b>연결 방식</b>(독립형·사슬형·판상형·망상형)과 결합하는 <b>금속 이온</b>(Fe, Mg, Al, K …)에 따라 다양한 광물이 돼요.</li>' +
        '<li><b>비규산염 광물</b>: 방해석(Ca, C, O), 자철석(Fe, O), 황철석(Fe, S)처럼 Si–O 사면체가 없는 광물.</li></ul>' +
        '<span class="formula">기본 단위체 1종류 → 다양한 구조 → 수많은 광물</span>',
      missions: [
        {
          title: '규산염 광물 분류하기', manual: true,
          goal: '광물 카드 7장을 <b>규산염 광물</b>과 <b>비규산염 광물</b> 상자에 나누어 넣어요.',
          hint: '카드의 동그라미에 규소(Si)와 산소(O)가 모두 있으면 Si–O 사면체로 이루어진 규산염 광물이에요.',
          setup() { S.table = false; setScene('sort'); },
          check: () => sortCheck(),
          explain: '석영, 장석, 흑운모, 감람석에는 <b>규소와 산소</b>가 있어서 Si–O 사면체로 이루어진 <b>규산염 광물</b>이에요. 방해석(Ca, C, O), 자철석(Fe, O), 황철석(Fe, S)에는 규소가 없는 <b>비규산염 광물</b>이에요.',
        },
        {
          type: 'quiz', title: '규산염 광물의 공통 기본 단위',
          goal: '여러 가지 규산염 광물에 <b>공통으로</b> 들어 있는 기본 단위는?',
          choices: ['규소와 산소로 이루어진 사면체 블록', '탄소와 산소로 이루어진 고리', '철과 황으로 이루어진 정육면체', '칼슘과 탄소로 이루어진 사슬'],
          answer: 0,
          feedback: ['', '탄소와 산소가 들어 있는 광물은 방해석 같은 비규산염 광물이에요.', '철과 황으로 이루어진 광물은 황철석 같은 비규산염 광물이에요.', '칼슘과 탄소는 방해석을 이루는 원소예요. 규산염 광물에는 규소와 산소가 있어요.'],
          explain: '모든 규산염 광물의 기본 단위는 <b>Si–O 사면체</b>예요.',
        },
        {
          type: 'quiz', title: '규산염 광물은 모두 같은 구조일까?',
          goal: '규산염 광물에 대한 설명으로 옳은 것은?',
          choices: ['같은 사면체 블록으로 이루어지지만, 연결 방식이 달라서 구조와 성질이 다양해요', '모든 규산염 광물은 구조가 같고 색깔만 달라요', '규산염 광물에는 규소가 없고 산소만 들어 있어요', '광물마다 사면체 블록의 모양 자체가 달라서 다양해요'],
          answer: 0,
          feedback: ['', '독립형, 사슬형, 판상형, 망상형처럼 구조가 서로 달라요. 그래서 쪼개짐과 굳기도 달라요.', '규산염 광물에는 규소와 산소가 모두 들어 있어요.', '블록은 모두 규소 1개와 산소 4개의 사면체로 같아요. 달라지는 것은 연결 방식(과 금속 이온)이에요.'],
          explain: '블록은 같지만 <b>연결 방식</b>과 결합하는 <b>금속 이온</b>이 달라서 수많은 규산염 광물이 만들어져요. 구조가 다르므로 성질도 달라요.',
        },
      ],
    },
  ];

  buildRock(); buildTable(); resetTetra(); resetSort(); fxInit();
  function fxInit() { /* 초기 상태 */ }
  game = SciSim.game({
    simId: 'h1-silicate',
    mount: '#game',
    badge: '광물 블록 박사',
    homeHref: '../../index.html#h1a',
    featureLabels: { crust: '🪨 지각 원소 · 화강암 확대', tetra: '🔺 사면체 블록 만들기', struct: '🧱 연결 방식 · 광물 표본', sort: '📚 광물 분류 상자' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    onMissionStart(m) { S.table = m.key === 'table'; updateUI(); },
    levels,
  });
  updateUI();
  SciSim.loop((dt, t) => {
    const key = curKey();
    if (key === 'make' || key === 'join') stepTetra(dt);
    else if (key === 'build' || key === 'spec') stepStruct(dt);
    else if (key === 'sort') stepSort(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, PIE, ROCK, TE, ST, SO, game, levels, STRUCT_INFO, SPEC, MIN5, TYPES, tblEls, setScene, pieSelect, rockPointer, resetTetra, tetraPointer, slotPos, joinTarget, nearestJoin, placeBlock, setType, slotScreen, runSpec, specAt, specPos, trayStruct, traySi, trayO, trayB, structBlocks, completeTetra, resetStruct, sortCheck, shuffleSort, MCARDS, BINS, resetSort, tableAllOk,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    placeSort(id, bin) { const c = SO.cards.find((x) => x.id === id); if (c) { c.bin = bin; c.seq = ++SO.seqN; } },
    fillType() { const st = ST.st[ST.type]; st.on.forEach((o, i) => { if (!o) placeBlock(i); }); },
    fillTetra() { TE.slots.forEach((s, i) => { s.on = true; s.a = 1; }); TE.supply = { Si: 0, O: 0 }; completeTetra(); },
  };
})();
