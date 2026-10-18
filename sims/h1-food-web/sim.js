/* =========================================================
   통합과학2 Ⅱ. 환경과 에너지 - 먹이 관계와 생태 피라미드 (단원 2차시)
   성취기준 [10통과2-02-02] 먹이 관계와 생태 피라미드를 중심으로 생태계 평형이 유지되는 과정을 이해하고,
   환경의 변화가 생태계에 미칠 수 있는 영향에 대해 협력적으로 소통할 수 있다. (앞부분: 먹이 관계와 생태 피라미드)
   ① 관찰: 먹이 사슬 (화살표 잇기, 생산자·소비자)
   ② 모형: 먹이 그물 (그물 완성, 분해자)
   ③ 분석: 생태 피라미드 (개체 수·생물량·에너지량 블록 쌓기)
   ④ 탐구: 에너지 전달 (단계마다 약 10 %, 식단 비교)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const SC = 0.6;                       // 휴대폰에서 그림 장면(800x560)을 줄이는 비율
  const SH = Math.round(560 * SC);      // 줄인 장면의 높이(336)
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf6ff' });
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
    if (o.sx || o.sy) ctx.scale(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy);
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
  function tag(x, y, text, color, scale, size) {
    ctx.save(); ctx.font = D.font(size || 13, 800);
    const w = ctx.measureText(text).width + 18;
    ctx.restore();
    const cx = clamp(x, w / 2 + 4, VW - w / 2 - 4);
    ctx.save(); ctx.translate(cx, y); ctx.scale(scale == null ? 1 : scale, scale == null ? 1 : scale);
    D.label(0, 0, text, { bg: color, size: size || 13 });
    ctx.restore();
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const jong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 ? c % 28 : -1; };
  const josa = (w, pair) => { const [a, b] = pair.split('/'); const j = jong(w); if (pair === '으로/로') return w + (j > 0 && j !== 8 ? '으로' : '로'); return w + (j > 0 ? a : b); };

  /* ---------- 데이터 ---------- */
  const SP = {
    grass: { n: '풀', e: '🌿', role: 'prod' }, grain: { n: '곡식 열매', e: '🌾', role: 'prod' },
    hopper: { n: '메뚜기', e: '🦗', role: 'cons' }, mouse: { n: '쥐', e: '🐀', role: 'cons' }, rabbit: { n: '토끼', e: '🐇', role: 'cons' },
    frog: { n: '개구리', e: '🐸', role: 'cons' }, snake: { n: '뱀', e: '🐍', role: 'cons' }, fox: { n: '여우', e: '🦊', role: 'cons' }, hawk: { n: '매', e: '🦅', role: 'cons' },
  };
  const ROLE_COL = { prod: '#16a34a', cons: '#d97706', dec: '#92400e' };
  // [먹히는 쪽, 먹는 쪽]: 화살표는 먹히는 쪽 → 먹는 쪽
  const LINKS = [
    ['grass', 'hopper'], ['grass', 'rabbit'], ['grass', 'mouse'], ['grain', 'mouse'],
    ['hopper', 'frog'], ['frog', 'snake'], ['frog', 'hawk'], ['mouse', 'snake'], ['mouse', 'fox'], ['mouse', 'hawk'],
    ['rabbit', 'fox'], ['snake', 'fox'], ['snake', 'hawk'],
  ];
  const CHAIN = ['grass', 'hopper', 'frog', 'snake', 'hawk'];
  const CHAIN_LINKS = CHAIN.slice(1).map((id, i) => [CHAIN[i], id]);
  const CHAIN_ROLE = ['생산자', '1차 소비자', '2차 소비자', '3차 소비자', '4차 소비자'];
  const NEED_LINKS = 10;                          // 미션: 먹이 그물에서 이어야 하는 화살표 수
  const SPECIES_N = Object.keys(SP).length;
  // 에너지 전달 (단순화한 예시): 풀 10000 kJ에서 단계마다 약 10 %만 다음 단계로
  const E0 = 10000, RATE = 0.1;
  const EN = [0, 1, 2, 3, 4].map((k) => Number((E0 * Math.pow(RATE, k)).toPrecision(10)));
  // 사람 식단 비교 (단순화): 밭의 곡물 에너지 = 사람 DIET_BASE명이 먹을 양, 소에게 먹이면 RATE만 사람에게 전달
  const DIET_BASE = 1000, ICON_PEOPLE = 50;
  const peopleFed = (pct) => DIET_BASE * (pct / 100 + (1 - pct / 100) * RATE);
  const fmtE = (v) => (v >= 10 ? String(Math.round(v)) : v >= 1 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100));

  /* ---------- 상태 ---------- */
  const S = { mode: 'chain', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { chain: '🌾 먹이 사슬', web: '🕸️ 먹이 그물', pyr: '🔺 생태 피라미드', flow: '⚡ 에너지 전달', diet: '🍚 식단 비교' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); const h = $('#stageHint'); if (h) h.classList.add('hide'); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (S.pyr) {
      $$('#ecoSeg button').forEach((b) => b.classList.toggle('on', b.dataset.eco === S.pyr.eco));
      $$('#typeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.type === S.pyr.type));
      const k = pyrKey(); $('#bBuild').textContent = S.pyr.built[k] ? '✔ 쌓았어요 (다시 쌓기)' : '🧱 블록 쌓기'; $('#bBuild').disabled = !!S.pyr.anim;
    }
    if (S.flow) {
      $('#sLevels').value = S.flow.n; $('#oLevels').textContent = S.flow.n + '단계'; $('#sLevels').style.setProperty('--pct', ((S.flow.n - 2) / 3 * 100) + '%');
      $$('#ansChips button').forEach((b) => { b.classList.toggle('on', S.flow.ans === +b.dataset.v); b.classList.toggle('bad', S.flow.bad === +b.dataset.v); });
      $('#ansHead').textContent = S.flow.n + '단계 생물이 받는 에너지는? (kJ)';
    }
    if (S.diet) { $('#sDiet').value = S.diet.pct; $('#oDiet').textContent = S.diet.pct + ' %'; $('#sDiet').style.setProperty('--pct', S.diet.pct + '%'); $('#dietNote').textContent = '나머지 ' + (100 - S.diet.pct) + ' %의 곡물은 소의 사료로 써서 쇠고기로 먹어요.'; }
    if (S.web) $('#bDecomp').classList.toggle('on', !!S.web.decomp);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* =========================================================
     먹이 사슬 · 먹이 그물 (화살표 잇기)
     ========================================================= */
  const NR = PHONE ? 29 : 35;     // 생물 원의 반지름
  const POS_CHAIN = PHONE
    ? { grass: [70, 470], hopper: [170, 350], frog: [265, 470], snake: [355, 350], hawk: [410, 190] }
    : { grass: [110, 420], hopper: [270, 300], frog: [440, 420], snake: [600, 300], hawk: [700, 130] };
  const POS_WEB = PHONE
    ? { fox: [110, 90], hawk: [370, 90], snake: [235, 215], frog: [405, 215], rabbit: [60, 340], mouse: [195, 340], hopper: [400, 340], grain: [115, 462], grass: [300, 462] }
    : { fox: [190, 92], hawk: [610, 92], snake: [400, 205], frog: [650, 205], rabbit: [100, 312], mouse: [330, 312], hopper: [660, 312], grain: [200, 416], grass: [430, 416] };
  const BAR = PHONE ? { x: 20, y: 540, w: 440, h: 54 } : { x: 60, y: 496, w: 680, h: 52 };
  const key = (a, b) => a + '>' + b;
  function mkNet(ids, links, pos) { return { ids, links, pos, made: {}, drag: null, sel: null, shake: {}, ev: [], flash: {}, ready: false }; }
  function resetChain() { S.chain = mkNet(CHAIN, CHAIN_LINKS, POS_CHAIN); }
  function resetWeb() { const w = mkNet(Object.keys(SP), LINKS, POS_WEB); w.decomp = false; w.hl = null; S.web = w; }
  const madeCount = (net) => net.links.filter(([a, b]) => net.made[key(a, b)] && net.made[key(a, b)].done).length;
  const hasLinkAny = (a, b) => LINKS.some((l) => l[0] === a && l[1] === b);
  function nodeAt(net, p, extra) { for (const id of net.ids) { const q = net.pos[id]; if (Math.hypot(p.x - q[0], p.y - q[1]) <= NR + (extra == null ? 6 : extra)) return id; } return null; }
  function netAttempt(net, from, to) {
    const k = key(from, to), A = SP[from].n, B = SP[to].n;
    if (net.links.some((l) => l[0] === from && l[1] === to)) {
      if (net.made[k]) { net.flash[to] = 1; Sound.tick(); showHint('이미 이은 화살표예요.', 1800); return 'dup'; }
      const m = { p: 0, done: false }; net.made[k] = m;
      SciSim.tween(m, { p: 1 }, { duration: 0.55, ease: 'outCubic', onDone: () => { m.done = true; } });
      // 잡아먹히는 장면: 먹히는 쪽 그림이 먹는 쪽으로 가서 사라져요
      const a = net.pos[from], b = net.pos[to], ev = { from, k: 0, ax: a[0], ay: a[1], bx: b[0], by: b[1] };
      net.ev.push(ev);
      SciSim.tween(ev, { k: 1 }, { duration: 0.75, delay: 0.25, ease: 'inCubic', onDone: () => { net.ev.splice(net.ev.indexOf(ev), 1); net.flash[to] = 1; parts.burst(b[0], b[1], { count: 10, colors: ['#ffd24d', '#fb923c', '#fff'], speed: 110, size: 3.2, life: 0.6, gravity: 80 }); } });
      Sound.success();
      showHint('✅ ' + josa(B, '은/는') + ' ' + josa(A, '을/를') + ' 먹어요. 화살표: ' + A + ' → ' + B, 3200);
      return 'ok';
    }
    net.shake[from] = 1; net.shake[to] = 1; Sound.fail();
    if (hasLinkAny(from, to)) { showHint('맞는 먹이 관계예요. 이번에는 사슬 순서대로 바로 위 단계끼리 이어 봐요.', 3600); return 'other'; }
    if (hasLinkAny(to, from)) { showHint('화살표 방향이 반대예요! ' + josa(A, '이/가') + ' ' + josa(B, '을/를') + ' 먹으니까 화살표는 ' + B + ' → ' + A + ' (먹히는 쪽 → 먹는 쪽)', 4800); return 'reverse'; }
    showHint(josa(A, '과/와') + ' ' + B + ' 사이에는 먹고 먹히는 관계가 없어요.', 3200); return 'none';
  }
  function netDown(net, p) {
    const id = nodeAt(net, p); if (!id) { if (net === S.web) { net.hl = null; net.sel = null; } return false; }
    net.drag = { id, x: p.x, y: p.y, moved: false }; Sound.click(); return true;
  }
  function netMove(net, p) { const d = net.drag; if (!d) return; if (Math.hypot(p.x - d.x, p.y - d.y) > 6) d.moved = true; d.x = p.x; d.y = p.y; }
  function netUp(net, p, tapLink) {
    const d = net.drag; if (!d) return; net.drag = null;
    const to = nodeAt(net, p, 14);
    if (d.moved && to && to !== d.id) { netAttempt(net, d.id, to); net.sel = null; return; }
    if (!d.moved || to === d.id) {          // 눌러서 고르기
      if (tapLink && net.sel && net.sel !== d.id) { netAttempt(net, net.sel, d.id); net.sel = null; return; }
      net.sel = net.sel === d.id ? null : d.id;
      if (net === S.web) net.hl = net.sel;
    }
  }
  // 먹이 사슬 경로 (이은 화살표만): 시작(들어오는 화살표 없음) → 끝(나가는 화살표 없음)
  function netPaths(net) {
    const ms = net.links.filter(([a, b]) => net.made[key(a, b)] && net.made[key(a, b)].done);
    const out = {}, inc = {}; net.ids.forEach((id) => { out[id] = []; inc[id] = 0; });
    ms.forEach(([a, b]) => { out[a].push(b); inc[b]++; });
    const paths = [];
    const walk = (id, path) => { path.push(id); if (!out[id].length) { if (path.length > 1) paths.push(path.slice()); } else out[id].forEach((n) => walk(n, path)); path.pop(); };
    net.ids.filter((id) => inc[id] === 0 && out[id].length).forEach((id) => walk(id, []));
    return paths;
  }
  const PCOL = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#65a30d'];
  function drawLinkArrow(net, a, b, m, col, width, alpha) {
    const pa = net.pos[a], pb = net.pos[b];
    const dx = pb[0] - pa[0], dy = pb[1] - pa[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const x1 = pa[0] + ux * (NR + 4), y1 = pa[1] + uy * (NR + 4), x2 = pb[0] - ux * (NR + 8), y2 = pb[1] - uy * (NR + 8);
    const p = m.p, ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
    D.arrow(x1, y1, ex, ey, { color: col, width: width || 5, head: p < 0.2 ? 6 : 14, alpha: alpha == null ? 1 : alpha });
    return { x1, y1, x2, y2 };
  }
  function drawEnergyDots(net, t, ids) {
    net.links.forEach(([a, b]) => {
      const m = net.made[key(a, b)]; if (!m || !m.done) return;
      const pa = net.pos[a], pb = net.pos[b], dx = pb[0] - pa[0], dy = pb[1] - pa[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const x1 = pa[0] + ux * (NR + 6), y1 = pa[1] + uy * (NR + 6), x2 = pb[0] - ux * (NR + 12), y2 = pb[1] - uy * (NR + 12);
      for (let i = 0; i < 2; i++) {
        const u = RM ? 0.5 : ((t * 0.45 + i * 0.5 + (a.length * 0.13)) % 1);
        D.sphere(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 4.2, '#ffc83d', { gloss: false });
      }
    });
  }
  function drawNode(net, id, t, dim, roleLabel) {
    const q = net.pos[id], sp = SP[id], col = ROLE_COL[sp.role];
    let x = q[0], y = q[1];
    const sh = net.shake[id]; if (sh) x += Math.sin(t * 50) * 4 * sh;
    const fl = net.flash[id] || 0, sel = net.sel === id;
    ctx.save(); ctx.globalAlpha = dim ? 0.3 : 1; ctx.translate(x, y); const sc = 1 + fl * 0.18 + (sel ? 0.08 : 0); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, NR, 0, TAU); ctx.fill(); }, { blur: 10, y: 3 });
    const g = ctx.createRadialGradient(-NR * 0.3, -NR * 0.4, 2, 0, 0, NR); g.addColorStop(0, '#fff'); g.addColorStop(1, SciSim.color.mix('#ffffff', col, 0.2));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, NR, 0, TAU); ctx.fill();
    ctx.lineWidth = sel ? 5 : 3.5; ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
    E(sp.e, x, y + 1, NR * 1.25, { alpha: dim ? 0.3 : 1, sx: sc, sy: sc });
    ctx.save(); ctx.globalAlpha = dim ? 0.35 : 1;
    D.label(x, y + NR + 16, sp.n, { bg: col, size: PHONE ? 12.5 : 14 });
    if (roleLabel) D.label(x, y + NR + (PHONE ? 38 : 40), roleLabel, { bg: '#fff', color: col, border: col, size: PHONE ? 11.5 : 12.5 });
    ctx.restore();
  }
  function decayMaps(net, dt) {
    ['shake', 'flash'].forEach((k) => { Object.keys(net[k]).forEach((id) => { net[k][id] = Math.max(0, net[k][id] - dt * (k === 'shake' ? 2.6 : 3)); if (!net[k][id]) delete net[k][id]; }); });
  }
  function drawEvents(net) {
    net.ev.forEach((ev) => {
      const k = ev.k, x = ev.ax + (ev.bx - ev.ax) * k, y = ev.ay + (ev.by - ev.ay) * k - Math.sin(k * Math.PI) * 18;
      E(SP[ev.from].e, x, y, NR * 1.25 * (1 - k * 0.75), { alpha: 1 - k * 0.5 });
    });
  }
  function drawDrag(net) {
    const d = net.drag; if (!d || !d.moved) return;
    const a = net.pos[d.id];
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(15,118,110,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(d.x, d.y); ctx.stroke(); ctx.restore();
    D.sphere(d.x, d.y, 8, '#0f766e', { gloss: false });
  }
  function meadowBg(t) {
    D.sky(0, 0, VW, VH, '#bfe3ff', '#eef8ff');
    ctx.fillStyle = '#a9dfa4'; ctx.beginPath(); ctx.moveTo(0, VH * 0.5); ctx.quadraticCurveTo(VW * 0.25, VH * 0.4, VW * 0.5, VH * 0.5); ctx.quadraticCurveTo(VW * 0.78, VH * 0.6, VW, VH * 0.46); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
    ctx.fillStyle = '#8fd18a'; ctx.fillRect(0, VH * 0.62, VW, VH * 0.38);
    const cx = ((t * 6) % (VW + 200)) - 100; ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff';
    [[0, 0, 22], [24, -8, 26], [52, 0, 22], [26, 8, 24]].forEach((c) => { ctx.beginPath(); ctx.arc(cx + c[0], 56 + c[1], c[2], 0, TAU); ctx.fill(); }); ctx.restore();
  }
  function drawChain(dt, t) {
    const N = S.chain; meadowBg(t);
    decayMaps(N, dt);
    T(VW / 2, PHONE ? 30 : 36, '화살표는 먹히는 쪽 → 먹는 쪽 (양분·에너지가 이동하는 방향)', PHONE ? 13 : 16, '#0f4c5c', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 5 });
    N.links.forEach(([a, b]) => { const m = N.made[key(a, b)]; if (m) drawLinkArrow(N, a, b, m, '#0f766e', 6); });
    drawEnergyDots(N, t);
    N.ids.forEach((id, i) => drawNode(N, id, t, false, N.made[key(CHAIN[i - 1] || '', id)] || i === 0 ? CHAIN_ROLE[i] : null));
    drawEvents(N); drawDrag(N);
    parts.update(dt); parts.draw(ctx);
  }
  function drawWeb(dt, t) {
    const W = S.web; meadowBg(t);
    decayMaps(W, dt);
    const paths = W.hl ? netPaths(W).filter((p) => p.indexOf(W.hl) >= 0) : [];
    const inPath = {}; paths.forEach((p) => p.forEach((id) => { inPath[id] = true; }));
    const hlOn = !!W.hl && paths.length > 0;
    // 분해자 띠
    const B = BAR;
    panel(B.x, B.y, B.w, B.h, 16, W.decomp ? '#fdf0df' : '#f6efe6');
    D.roundRect(B.x, B.y, B.w, B.h, 16); ctx.lineWidth = 3; ctx.strokeStyle = '#92400e'; ctx.stroke();
    E('🍄', B.x + 34, B.y + B.h / 2 + 2, 30); E('🦠', B.x + 74, B.y + B.h / 2 + 2, 28);
    T(B.x + 104, B.y + B.h / 2 + 6, PHONE ? '분해자 (버섯·세균)' : '분해자 (버섯·세균): 모든 생물의 사체·배설물을 분해해요', PHONE ? 13.5 : 15, '#7c2d12', 'left', 800);
    if (W.decomp) {
      W.ids.forEach((id) => {
        const q = W.pos[id], y0 = q[1] + NR + (PHONE ? 30 : 32), y1 = Math.min(B.y - 2, y0 + 20);
        if (id === 'grain' || id === 'grass') { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(q[0], y0); ctx.lineTo(q[0], B.y - 4); ctx.stroke(); ctx.restore(); D.arrow(q[0], B.y - 18, q[0], B.y - 2, { color: '#92400e', width: 3, head: 9 }); }
        else { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(146,64,14,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0] + NR + 10, q[1]); ctx.lineTo(q[0] + NR + 10, q[1] + 28); ctx.stroke(); ctx.restore(); D.label(q[0] + NR + 10, q[1] + 38, '🍂', { bg: '#fdf0df', color: '#92400e', size: 10, pad: 4 }); }
      });
      T(VW - 14, B.y - 8, '사체·배설물 → 분해자', PHONE ? 12 : 13.5, '#92400e', 'right', 800);
    }
    // 화살표
    W.links.forEach(([a, b]) => {
      const m = W.made[key(a, b)]; if (!m) return;
      let col = '#0f766e', wd = 5, al = 1;
      if (hlOn) { const pi = paths.findIndex((p) => { const i = p.indexOf(a); return i >= 0 && p[i + 1] === b; }); if (pi >= 0) { col = PCOL[pi % PCOL.length]; wd = 7; } else al = 0.18; }
      drawLinkArrow(W, a, b, m, col, wd, al);
    });
    if (!hlOn) drawEnergyDots(W, t);
    W.ids.forEach((id) => drawNode(W, id, t, hlOn && !inPath[id], null));
    drawEvents(W); drawDrag(W);
    const n = madeCount(W);
    D.label(PHONE ? 100 : 130, PHONE ? 28 : 30, '이은 화살표 ' + n + ' / ' + W.links.length, { bg: n >= NEED_LINKS ? '#15803d' : '#475569', size: PHONE ? 13 : 14.5 });
    if (W.hl) D.label(PHONE ? 330 : 560, PHONE ? 28 : 30, SP[W.hl].n + ': 속한 먹이 사슬 ' + paths.length + '개', { bg: '#1d4ed8', size: PHONE ? 13 : 14.5 });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     생태 피라미드 (블록 쌓기)
     ========================================================= */
  const PYR = {
    meadow: {
      name: '초원', tiers: [{ n: '생산자 · 풀', c: '#34a853' }, { n: '1차 소비자 · 메뚜기', c: '#8bc34a' }, { n: '2차 소비자 · 개구리', c: '#f5a524' }, { n: '3차 소비자 · 뱀', c: '#e8743b' }],
      num: { v: [5000, 500, 50, 5], u: ['포기', '마리', '마리', '마리'] }, bio: { v: [1000, 100, 10, 1], u: ['kg', 'kg', 'kg', 'kg'] }, en: { v: EN.slice(0, 4), u: ['kJ', 'kJ', 'kJ', 'kJ'] },
    },
    oak: {
      name: '참나무 숲', tiers: [{ n: '생산자 · 참나무', c: '#34a853' }, { n: '1차 소비자 · 벌레', c: '#f5a524' }, { n: '2차 소비자 · 새', c: '#e8743b' }],
      num: { v: [1, 5000, 20], u: ['그루', '마리', '마리'] }, bio: { v: [2000, 80, 8], u: ['kg', 'kg', 'kg'] }, en: { v: EN.slice(0, 3), u: ['kJ', 'kJ', 'kJ'] },
    },
  };
  const PTYPE = { num: '개체 수', bio: '생물량', en: '에너지량' };
  const PYR_NEED = ['meadow:num', 'meadow:bio', 'meadow:en', 'oak:num', 'oak:en'];
  const pyrKey = () => S.pyr.eco + ':' + S.pyr.type;
  const pyrData = () => { const e = PYR[S.pyr.eco]; return { eco: e, d: e[S.pyr.type] }; };
  const isNormal = (v) => v.every((x, i) => i === 0 || x < v[i - 1]);
  function cancelPyrAnim() { const P = S.pyr; if (P && P.tw) P.tw.forEach((h) => h.cancel()); if (P) { P.tw = []; P.anim = null; } }
  function resetPyr() { cancelPyrAnim(); S.pyr = { eco: 'meadow', type: 'num', built: {}, anim: null, tw: [] }; }
  function pyrSet(eco, type) { cancelPyrAnim(); if (eco) S.pyr.eco = eco; if (type) S.pyr.type = type; updateCtl(); }
  function pyrBuild() {
    const P = S.pyr, k = pyrKey(); cancelPyrAnim();
    const n = PYR[P.eco].tiers.length;
    const tiers = []; for (let i = 0; i < n; i++) tiers.push({ off: -420, a: 0 });
    P.anim = { key: k, tiers }; P.built[k] = false;
    tiers.forEach((tr, i) => {
      P.tw.push(SciSim.tween(tr, { off: 0, a: 1 }, { duration: 0.75, delay: i * 0.4, ease: 'outBounce', onDone: () => { Sound.tick(); if (i === n - 1 && P.anim && P.anim.key === k) { P.built[k] = true; P.anim = null; Sound.success(); updateCtl(); } } }));
    });
    Sound.click(); updateCtl();
  }
  const pyrBuiltN = () => PYR_NEED.filter((k) => S.pyr.built[k]).length;
  function drawPyr(dt, t) {
    const P = S.pyr, k = pyrKey(), { eco, d } = pyrData();
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#e8f5ff'); g.addColorStop(1, '#f3fbef'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    const cx = PHONE ? 240 : 320, U = PHONE ? 54 : 62, n = eco.tiers.length;
    const tierH = PHONE ? 70 : 82, baseY = PHONE ? 420 : 486, built = P.built[k] === true, anim = P.anim && P.anim.key === k ? P.anim : null;
    const show = built || !!anim;
    // 눈금
    const ry = baseY + (PHONE ? 22 : 24);
    ctx.save(); ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx + 5 * U / 2 + 8, ry); ctx.stroke();
    ['1', '10', '100', '1천', '1만'].forEach((v, i) => { const x = cx + (i + 1) * U / 2; ctx.beginPath(); ctx.moveTo(x, ry - 5); ctx.lineTo(x, ry + 5); ctx.stroke(); T(x, ry + 20, v, 12, '#5d6879', 'center', 700); });
    T(cx - 8, ry + 5, '눈금(한 칸 = 10배)', 12.5, '#5d6879', 'right', 800); ctx.restore();
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(100,120,150,.4)'; ctx.beginPath(); ctx.moveTo(cx, baseY - n * tierH - 6); ctx.lineTo(cx, ry); ctx.stroke(); ctx.restore();
    for (let i = 0; i < n; i++) {
      const top = baseY - (i + 1) * tierH, tr = eco.tiers[i];
      const v = d.v[i], w = (Math.log10(v) + 1) * U;
      if (!show) {
        D.roundRect(cx - 2.5 * U, top + 24, 5 * U, tierH - 30, 10); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#b8c7d9'; ctx.stroke(); ctx.setLineDash([]);
        T(cx, top + 17, tr.n, PHONE ? 12.5 : 13.5, '#8ea0b6', 'center', 800);
        continue;
      }
      const off = anim ? anim.tiers[i].off : 0, al = anim ? clamp(anim.tiers[i].a * 1.6, 0, 1) : 1;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(0, off);
      T(cx, top + 17, tr.n, PHONE ? 12.5 : 13.5, '#26324a', 'center', 800);
      D.shadow(() => { D.roundRect(cx - w / 2, top + 24, w, tierH - 30, 10); const gg = ctx.createLinearGradient(0, top + 24, 0, top + tierH - 6); gg.addColorStop(0, SciSim.color.shade(tr.c, 0.25)); gg.addColorStop(1, tr.c); ctx.fillStyle = gg; ctx.fill(); }, { blur: 6, y: 3 });
      D.roundRect(cx - w / 2, top + 24, w, tierH - 30, 10); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.stroke();
      T(cx, top + 24 + (tierH - 30) / 2 + 5, v + ' ' + d.u[i], PHONE ? 13.5 : 15, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.28)', strokeWidth: 3 });
      ctx.restore();
    }
    if (!show) T(cx, baseY - n * tierH / 2 + 12, '‘블록 쌓기’를 눌러요', PHONE ? 15 : 17, '#5d7a99', 'center', 800);
    // 정보
    const normal = isNormal(d.v);
    const px = PHONE ? 10 : 612, py = PHONE ? 478 : 30, pw = PHONE ? 460 : 178, ph = PHONE ? 154 : 400;
    panel(px, py, pw, ph, 16);
    textBlock(px + 14, py + 26, pw - 28, eco.name + ' · ' + PTYPE[S.pyr.type] + ' 피라미드', 14.5, '#26324a', 19, 800);
    const desc = S.pyr.type === 'num' ? '영양 단계마다 생물이 몇 마리(포기)인지 쌓았어요.' : S.pyr.type === 'bio' ? '영양 단계마다 생물의 몸 무게(생물량)를 쌓았어요.' : '영양 단계마다 가진 에너지(kJ)를 쌓았어요.';
    const dy = PHONE ? 0 : 20;
    textBlock(px + 14, py + 50 + dy, pw - 28, desc, 13, '#4a5870', 18, 700);
    if (show) {
      const done = built, yy = py + (PHONE ? 80 : 122);
      D.roundRect(px + 12, yy, pw - 24, PHONE ? 66 : 92, 12); ctx.fillStyle = !done ? '#eef2f7' : normal ? '#e7f7ee' : '#fff1dd'; ctx.fill();
      textBlock(px + 22, yy + 24, pw - 44, done ? (normal ? '위로 갈수록 줄어드는 안정된 모양이에요.' : '가운데가 불룩한 뒤집힌 모양이에요! 벌레가 참나무보다 훨씬 많아요.') : '쌓는 중…', 13.5, !done ? '#5d6879' : normal ? '#14633a' : '#8a4b00', 19, 800);
    }
    if (!PHONE) {
      T(px + 14, py + 246, '쌓은 피라미드 ' + pyrBuiltN() + ' / ' + PYR_NEED.length, 13.5, '#26324a', 'left', 800);
      PYR_NEED.forEach((k, i) => { const [e, ty] = k.split(':'); T(px + 14, py + 272 + i * 24, (P.built[k] ? '✅ ' : '⬜ ') + PYR[e].name + ' ' + PTYPE[ty], 13, P.built[k] ? '#14633a' : '#6b7a90', 'left', 700); });
    } else T(px + 14, py + ph - 12, '쌓은 피라미드 ' + pyrBuiltN() + ' / ' + PYR_NEED.length, 13, '#5d6879', 'left', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     에너지 전달 (먹이 사슬 단계 수에 따른 에너지)
     ========================================================= */
  const ANS = [0.1, 1, 10, 100];
  function resetFlow() { S.flow = { n: 3, k: 0, run: false, tNext: 0, e: [E0, 0, 0, 0, 0], tg: [E0, 0, 0, 0, 0], pk: [], ans: null, bad: null, tw: [] }; }
  function startFlow() {
    const F = S.flow; F.tw.forEach((h) => h.cancel()); F.tw = []; F.pk = [];
    F.k = 0; F.run = true; F.tNext = 0.5; F.e = [E0, 0, 0, 0, 0]; F.tg = [E0, 0, 0, 0, 0];
    updateCtl();
  }
  function flowLayout() {
    if (!PHONE) return { y0: 40, rowH: 88, nx: 52, bx: 100, U: 66, leakX: 600, rowW: 580 };
    return { y0: 20, rowH: 90, nx: 32, bx: 62, U: 52, leakX: 10, rowW: 468 };
  }
  const FL = flowLayout();
  const FLV = [{ n: '풀', e: '🌿', role: '생산자' }, { n: '메뚜기', e: '🦗', role: '1차 소비자' }, { n: '개구리', e: '🐸', role: '2차 소비자' }, { n: '뱀', e: '🐍', role: '3차 소비자' }, { n: '매', e: '🦅', role: '4차 소비자' }];
  function stepFlow(dt) {
    const F = S.flow; if (!F.run) return;
    F.tNext -= dt;
    if (F.tNext <= 0) {
      if (F.k < F.n - 1) {
        const k = F.k; F.k++; F.tNext = 1.5;
        const y1 = FL.y0 + k * FL.rowH + 30, y2 = FL.y0 + (k + 1) * FL.rowH - 30;
        const pk = { x: FL.nx, y: y1, to: y2 }; F.pk.push(pk);
        F.tw.push(SciSim.tween(pk, { y: y2 }, { duration: 0.9, ease: 'outCubic', onDone: () => { F.tg[k + 1] = EN[k + 1]; F.pk.splice(F.pk.indexOf(pk), 1); Sound.tick(); } }));
        // 90 %는 열(호흡)·배설물·분해자로 빠져나가요: 알갱이 10개 중 9개
        const rowY = FL.y0 + k * FL.rowH + FL.rowH / 2;
        if (!RM) for (let i = 0; i < 9; i++) parts.emit({ x: FL.bx + (Math.log10(EN[k]) + 1) * FL.U + 20 + rnd(0, 20), y: rowY + rnd(-10, 10), vx: rnd(30, 90), vy: -rnd(30, 80), life: 1.8, size: rnd(3, 5), color: i % 3 === 0 ? '#fb7185' : i % 3 === 1 ? '#f59e0b' : '#a16207', shape: 'circle', gravity: -10, drag: 0.4 });
      } else { F.run = false; if (F.n === 5 && !F.ans) showHint('5단계 생물이 받는 에너지를 막대에서 읽어 보세요.', 3600); }
    }
    for (let i = 0; i < 5; i++) F.e[i] = SciSim.approach(F.e[i], F.tg[i], dt, 5);
  }
  function drawFlow(dt, t) {
    const F = S.flow;
    D.sky(0, 0, VW, VH, '#eaf4ff', '#f6fbf1');
    const bxEnd = (k) => FL.bx + (Math.log10(Math.max(1, EN[k])) + 1) * FL.U;
    // 눈금 (로그)
    const ax = FL.bx, ay = FL.y0 + F.n * FL.rowH + 2;
    ctx.save(); ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 5 * FL.U + 6, ay); ctx.stroke();
    [1, 10, 100, 1000, 10000].forEach((v, i) => { const x = ax + (i + 1) * FL.U; ctx.beginPath(); ctx.moveTo(x, ay - 4); ctx.lineTo(x, ay + 4); ctx.stroke(); ctx.save(); ctx.strokeStyle = 'rgba(120,140,165,.25)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x, FL.y0); ctx.lineTo(x, ay); ctx.stroke(); ctx.restore(); T(x, ay + 18, String(v), 12, '#5d6879', 'center', 700); });
    T(ax, ay + 18, 'kJ', 12, '#5d6879', 'right', 800); T(ax + 5 * FL.U / 2, ay + 36, '막대 길이 눈금 (한 칸 = 10배)', 12, '#5d6879', 'center', 700);
    ctx.restore();
    for (let k = 0; k < F.n; k++) {
      const y = FL.y0 + k * FL.rowH, cy = y + FL.rowH / 2, lv = FLV[k];
      panel(PHONE ? 6 : 10, y + 4, FL.rowW, FL.rowH - 8, 14, k % 2 ? '#fbfdff' : '#ffffff');
      D.sphere(FL.nx, cy, PHONE ? 22 : 27, '#ffffff', { gloss: false, outline: ROLE_COL[k === 0 ? 'prod' : 'cons'], outlineWidth: 3 });
      E(lv.e, FL.nx, cy + 1, PHONE ? 30 : 36);
      T(FL.bx, cy - (PHONE ? 22 : 26), lv.n + ' · ' + lv.role, PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      // 막대 (로그 눈금)
      const e = F.e[k], w = e >= 1 ? (Math.log10(e) + 1) * FL.U : 0, bh = PHONE ? 24 : 30;
      D.roundRect(FL.bx, cy - bh / 2 + 6, 5 * FL.U, bh, 8); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (w > 1) { ctx.save(); D.roundRect(FL.bx, cy - bh / 2 + 6, w, bh, 8); const gg = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2 + 6); gg.addColorStop(0, '#ffd966'); gg.addColorStop(1, '#f5a524'); ctx.fillStyle = gg; ctx.fill(); ctx.restore(); }
      const shown = F.tg[k] > 0 && Math.abs(e - F.tg[k]) < 0.5 ? F.tg[k] : e;
      T(FL.bx + Math.max(w, 0) + 10, cy + 12, (F.tg[k] > 0 ? fmtE(shown) : '0') + ' kJ', PHONE ? 14 : 16, '#7c2d12', 'left', 800);
      if (k < F.n - 1) {
        const ay1 = y + FL.rowH - 4;
        D.arrow(FL.nx, ay1 - 18, FL.nx, ay1 + 12, { color: '#0f766e', width: 4, head: 10 });
        T(FL.nx + 14, ay1 + 2, '약 ' + Math.round(RATE * 100) + ' %', PHONE ? 11.5 : 13, '#0f766e', 'left', 800);
      }
    }
    // 전달되는 알갱이
    F.pk.forEach((p) => { D.sphere(p.x, p.y, 7, '#ffc83d', { gloss: true }); });
    // 설명 패널
    const px = PHONE ? 10 : FL.leakX + 4, py = PHONE ? 526 : 40, pw = PHONE ? 460 : 186, ph = PHONE ? 100 : 250;
    if (PHONE) { /* 휴대폰은 아래 */ }
    panel(px, py, pw, ph, 16, '#fff7ed');
    const th = textBlock(px + 14, py + 26, pw - 28, '🔥 빠져나가는 에너지 약 ' + Math.round((1 - RATE) * 100) + ' %', PHONE ? 14 : 14.5, '#9a3412', 19, 800);
    textBlock(px + 14, py + 26 + th + 8, pw - 28, '호흡(열)로 쓰이거나, 배설물·사체가 되어 분해자에게 가거나, 먹히지 않고 남아요.', PHONE ? 12.5 : 13, '#5b3a1e', PHONE ? 17 : 19, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     식단 비교 (곡물 직접 먹기 vs 쇠고기)
     ========================================================= */
  function resetDiet() { S.diet = { pct: 50, shown: 50, seen: {} }; S.diet.seen[50] = true; }
  function drawDiet(dt, t) {
    const Dd = S.diet; Dd.shown = SciSim.approach(Dd.shown, Dd.pct, dt, 7);
    D.sky(0, 0, VW, VH, '#eaf4ff', '#f6fbf1');
    const p = Dd.shown / 100, bx = PHONE ? 20 : 40, bw = VW - bx * 2, X = (v) => bx + bw * v / DIET_BASE;
    // 곡물 밭
    const y1 = PHONE ? 20 : 26;
    panel(bx - 10, y1, bw + 20, PHONE ? 154 : 158, 16);
    E('🌾', bx + 22, y1 + 30, 34); T(bx + 46, y1 + 36, '밭의 곡물 에너지 = 사람 ' + DIET_BASE + '명이 먹을 양', PHONE ? 14 : 16, '#26324a', 'left', 800);
    const by = y1 + (PHONE ? 54 : 56), bh = PHONE ? 34 : 38;
    const dirW = bw * p;
    D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, bh, 10); ctx.clip(); ctx.fillStyle = '#f5b301'; ctx.fillRect(bx, by, dirW, bh); ctx.fillStyle = '#c2410c'; ctx.fillRect(bx + dirW, by, bw - dirW, bh); ctx.restore();
    if (dirW > 90) T(bx + dirW / 2, by + bh / 2 + 5, '직접 먹기', 14, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
    if (bw - dirW > 110) T(bx + dirW + (bw - dirW) / 2, by + bh / 2 + 5, '소 사료로 쓰기', 14, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
    // 소를 거치면 약 10 %만
    const ay = by + bh + 8;
    D.arrow(bx + dirW / 2, ay, bx + dirW / 2, ay + 30, { color: '#d97706', width: 4 + 10 * p, head: 12, alpha: p > 0.02 ? 1 : 0.2 });
    D.arrow(bx + dirW + (bw - dirW) / 2, ay, bx + dirW + (bw - dirW) / 2, ay + 30, { color: '#c2410c', width: 4 + 10 * (1 - p), head: 12, alpha: p < 0.98 ? 1 : 0.2 });
    E('🐄', bx + dirW + (bw - dirW) / 2, ay + 50, 28, { alpha: p < 0.98 ? 1 : 0.3 });
    T(bx, y1 + (PHONE ? 140 : 146), '소를 거치면 약 ' + Math.round(RATE * 100) + ' %만 사람에게 전달돼요', PHONE ? 12.5 : 14, '#9a3412', 'left', 800);
    // 사람이 얻는 에너지
    const y2 = y1 + (PHONE ? 164 : 174), ppl = peopleFed(Dd.shown);
    panel(bx - 10, y2, bw + 20, PHONE ? 330 : 270, 16);
    T(bx, y2 + 30, '먹일 수 있는 사람 수', PHONE ? 15 : 17, '#26324a', 'left', 800);
    const by2 = y2 + 48, bh2 = PHONE ? 40 : 44, direct = DIET_BASE * p, beef = DIET_BASE * (1 - p) * RATE;
    D.roundRect(bx, by2, bw, bh2, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by2, bw, bh2, 10); ctx.clip(); ctx.fillStyle = '#f5b301'; ctx.fillRect(bx, by2, bw * direct / DIET_BASE, bh2); ctx.fillStyle = '#c2410c'; ctx.fillRect(bx + bw * direct / DIET_BASE, by2, bw * beef / DIET_BASE, bh2); ctx.restore();
    [0, 250, 500, 750, 1000].forEach((v) => { T(X(v), by2 + bh2 + 17, String(v), 12, '#5d6879', v === 0 ? 'left' : v === 1000 ? 'right' : 'center', 700); });
    D.label(bx + bw / 2, by2 + bh2 + 46, Math.round(ppl) + '명을 먹일 수 있어요', { bg: '#0f766e', size: PHONE ? 15 : 17 });
    // 사람 아이콘 (한 칸 = ICON_PEOPLE명)
    const nIc = DIET_BASE / ICON_PEOPLE, perRow = 10, isz = PHONE ? 30 : 34, gap = (bw - perRow * isz) / (perRow - 1), iy = by2 + bh2 + (PHONE ? 90 : 96);
    for (let i = 0; i < nIc; i++) {
      const x = bx + isz / 2 + (i % perRow) * (isz + gap), y = iy + Math.floor(i / perRow) * (isz + 8);
      const fill = clamp(ppl / ICON_PEOPLE - i, 0, 1);
      E('🧍', x, y, isz, { alpha: 0.15 });
      if (fill > 0.01) { ctx.save(); ctx.beginPath(); ctx.rect(x - isz / 2, y - isz / 2, isz * fill, isz); ctx.clip(); E('🧍', x, y, isz, {}); ctx.restore(); }
    }
    T(bx + bw, iy + 2 * (isz + 8) + 6, '🧍 한 칸 = ' + ICON_PEOPLE + '명', 12.5, '#5d6879', 'right', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     읽음 칸
     ========================================================= */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'chain') { const N = S.chain; L1 = '이은 화살표'; a = madeCount(N) + ' / ' + N.links.length; L2 = '화살표 방향'; b = '먹히는 쪽 → 먹는 쪽'; L3 = '사슬의 단계'; c = (madeCount(N) + 1) + '단계'; }
    else if (m === 'web') { const W = S.web; const paths = W.hl ? netPaths(W).filter((p) => p.indexOf(W.hl) >= 0) : []; L1 = '이은 화살표'; a = madeCount(W) + ' / ' + W.links.length; L2 = '고른 종'; b = W.hl ? SP[W.hl].n : '—'; L3 = '속한 먹이 사슬'; c = W.hl ? paths.length + '개' : '—'; }
    else if (m === 'pyr') { const { eco, d } = pyrData(), k = pyrKey(); L1 = '보는 피라미드'; a = eco.name + ' · ' + PTYPE[S.pyr.type]; L2 = '모양'; b = S.pyr.built[k] ? (isNormal(d.v) ? '위로 갈수록 줄어듦' : '뒤집힌 모양') : '—'; L3 = '쌓은 피라미드'; c = pyrBuiltN() + ' / ' + PYR_NEED.length; }
    else if (m === 'flow') { const F = S.flow, top = F.n - 1; L1 = '먹이 사슬 단계'; a = F.n + '단계'; L2 = FLV[top].n + '(' + (top + 1) + '단계)의 에너지'; b = fmtE(EN[top]) + ' kJ'; L3 = '풀 에너지의 몇 분의 1'; c = '1/' + Math.round(EN[0] / EN[top]); }
    else { const Dd = S.diet; L1 = '곡물을 직접 먹는 비율'; a = Dd.pct + ' %'; L2 = '먹일 수 있는 사람'; b = Math.round(peopleFed(Dd.pct)) + '명'; L3 = '쇠고기만 먹을 때와 비교'; c = (peopleFed(Dd.pct) / peopleFed(0)).toFixed(1) + '배'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 컨트롤 연결 ---------- */
  $('#bChainReset').addEventListener('click', () => { Sound.click(); resetChain(); });
  $('#bWebReset').addEventListener('click', () => { Sound.click(); const d = S.web.decomp; resetWeb(); S.web.decomp = d; updateCtl(); });
  $('#bDecomp').addEventListener('click', () => { Sound.click(); S.web.decomp = !S.web.decomp; updateCtl(); });
  $$('#ecoSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); pyrSet(b.dataset.eco, null); }));
  $$('#typeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); pyrSet(null, b.dataset.type); }));
  $('#bBuild').addEventListener('click', pyrBuild);
  $('#sLevels').addEventListener('input', (e) => { S.flow.n = +e.target.value; S.flow.ans = null; S.flow.bad = null; startFlow(); Sound.tick(); });
  $('#bFlow').addEventListener('click', () => { Sound.click(); startFlow(); });
  $('#sDiet').addEventListener('input', (e) => { S.diet.pct = +e.target.value; S.diet.seen[S.diet.pct] = true; updateCtl(); Sound.tick(); });
  ANS.forEach((v) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = v + ' kJ'; b.addEventListener('click', () => { Sound.click(); S.flow.ans = v; S.flow.bad = null; updateCtl(); }); $('#ansChips').appendChild(b); });

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'chain') return netDown(S.chain, p); if (S.mode === 'web') return netDown(S.web, p); return false; },
    move(p) { if (S.mode === 'chain') netMove(S.chain, p); else if (S.mode === 'web') netMove(S.web, p); },
    up(p) { if (S.mode === 'chain') netUp(S.chain, p, true); else if (S.mode === 'web') netUp(S.web, p, false); },
    hover(p) { const N = S.mode === 'chain' ? S.chain : S.mode === 'web' ? S.web : null; return N && nodeAt(N, p) ? 'grab' : 'default'; },
  });

  /* =========================================================
     미션
     ========================================================= */
  const chainDone = () => CHAIN_LINKS.every(([a, b]) => S.chain.made[key(a, b)] && S.chain.made[key(a, b)].done);
  const levels = [
    {
      title: '먹이 사슬: 누가 누구를 먹을까?', short: '먹이 사슬', icon: '🌾', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 초원에서 풀 한 포기의 에너지는 누구에게 전해질까? 왜 맨 위 포식자는 수가 적을까?</p>' +
        '<div class="si-link">🔗 <b>초등학교·중학교에서</b> 먹이 사슬과 광합성을 배웠어요. 이번 차시에서는 먹이 관계를 <b>에너지의 흐름</b>으로 다시 보고, 먹이 그물과 생태 피라미드까지 알아봐요.</div>' +
        '<p>초원의 생물을 <b>끌어서</b> 서로 이어 먹이 사슬의 <b>화살표 방향</b>을 알아봐요.</p>',
      features: ['chain'],
      setup() { resetChain(); setMode('chain'); },
      recap: '먹이 사슬의 화살표는 먹히는 쪽에서 먹는 쪽으로, 양분(에너지)이 이동하는 방향이에요. 사슬은 생산자에서 시작해요.',
      summary: '<ul><li><b>먹이 사슬</b>: 생산자 → 1차 소비자 → 2차 소비자 → 3차 소비자 …로 이어지는 먹고 먹히는 관계</li><li>화살표는 <b>먹히는 쪽 → 먹는 쪽</b> = 양분(에너지)이 이동하는 방향 (예: 풀 → 메뚜기)</li><li><b>생산자</b>는 광합성으로 스스로 양분을 만드는 생물(풀), <b>소비자</b>는 다른 생물을 먹어 양분을 얻는 생물이에요.</li></ul>',
      missions: [
        {
          id: 'chain', title: '먹이 사슬 화살표 잇기',
          goal: '풀에서 매까지 <b>' + CHAIN_LINKS.length + '개</b>의 화살표를 이어 사슬을 완성하세요. 화살표는 <b>먹히는 쪽 → 먹는 쪽</b>이에요.',
          hint: '‘메뚜기가 풀을 먹는다’면 풀을 끌어서 메뚜기 위에 놓아요. 순서는 풀 → 메뚜기 → 개구리 → 뱀 → 매예요.',
          setup() { setMode('chain'); },
          check: () => chainDone(),
          hold: 0.6,
          status: () => CHAIN_LINKS.map(([a, b]) => mark(!!(S.chain.made[key(a, b)] && S.chain.made[key(a, b)].done)) + SP[a].n + '→' + SP[b].n).join(' &nbsp; '),
          explain: '먹이 사슬은 <b>풀(생산자) → 메뚜기(1차 소비자) → 개구리(2차 소비자) → 뱀(3차 소비자) → 매(4차 소비자)</b>로 이어져요. 화살표는 <b>양분(에너지)이 이동하는 방향</b>이라서 먹히는 쪽에서 먹는 쪽을 향해요.',
        },
        {
          type: 'quiz', title: '화살표의 방향과 생산자',
          goal: '먹이 사슬 <b>풀 → 메뚜기 → 개구리</b>에 대한 설명으로 옳은 것은?',
          setup() { setMode('chain'); },
          choices: ['화살표는 먹는 쪽에서 먹히는 쪽으로 향하고, 생산자는 풀이다.', '화살표는 먹히는 쪽에서 먹는 쪽으로 향하고, 생산자는 개구리다.', '화살표는 먹히는 쪽에서 먹는 쪽으로 향하고, 생산자는 풀이다.', '화살표는 먹는 쪽에서 먹히는 쪽으로 향하고, 생산자는 메뚜기다.'],
          answer: 2,
          feedback: ['화살표를 반대로 생각했어요. 화살표는 양분이 이동하는 방향, 즉 먹히는 쪽 → 먹는 쪽이에요.', '생산자는 광합성으로 스스로 양분을 만드는 생물이에요. 개구리는 메뚜기를 먹는 소비자예요.', '', '화살표 방향도, 생산자도 틀렸어요. 메뚜기는 풀을 먹는 1차 소비자예요.'],
          explain: '화살표는 <b>먹히는 쪽 → 먹는 쪽</b>, 즉 <b>양분(에너지)이 이동하는 방향</b>이에요. <b>생산자</b>는 광합성으로 스스로 양분을 만드는 풀 같은 생물이고, 나머지는 다른 생물을 먹는 <b>소비자</b>예요.',
        },
      ],
    },
    {
      title: '먹이 그물: 얽히고 얽힌 관계', short: '먹이 그물', icon: '🕸️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 풀 → 메뚜기 → 개구리 → 뱀 → 매의 먹이 사슬을 이었어요. 그런데 자연에서 뱀은 개구리만 먹을까요?</div>' +
        '<p>이번에는 초원의 생물 <b>' + SPECIES_N + '종</b>의 먹이 관계를 모두 이어 <b>먹이 그물</b>을 완성해요. 이은 뒤 생물을 눌러 그 종이 속한 먹이 사슬도 살펴봐요.</p>',
      features: ['web'],
      setup() { resetWeb(); setMode('web'); },
      recap: '여러 먹이 사슬이 얽힌 것이 먹이 그물이에요. 한 종이 여러 사슬에 속하고, 분해자는 모든 단계의 사체와 배설물을 분해해요.',
      summary: '<ul><li><b>먹이 그물</b>: 여러 먹이 사슬이 서로 얽혀 그물처럼 된 것</li><li>한 종이 여러 먹이 사슬에 속해요 (예: 쥐는 뱀·여우·매에게 모두 먹혀요).</li><li>먹이 그물에서는 한 먹이가 줄어도 다른 먹이를 먹을 수 있어서 먹이 사슬보다 <b>생태계가 안정적</b>이에요.</li><li><b>분해자</b>(버섯·세균)는 모든 단계의 사체와 배설물을 분해해 양분을 되돌려요.</li></ul>',
      missions: [
        {
          id: 'web', title: '먹이 그물 완성하기',
          goal: '생물을 끌어서 먹는 생물 위에 놓아 화살표를 <b>' + NEED_LINKS + '개 이상</b> 이어요. (전체 ' + LINKS.length + '개)',
          hint: '여우는 쥐·토끼·뱀을, 매는 쥐·뱀·개구리를 먹어요. 쥐는 곡식 열매와 풀을 먹어요. 방향은 항상 먹히는 쪽 → 먹는 쪽!',
          setup() { setMode('web'); },
          check: () => madeCount(S.web) >= NEED_LINKS,
          hold: 0.6,
          status: () => '이은 화살표 ' + madeCount(S.web) + ' / ' + LINKS.length + ' (' + NEED_LINKS + '개 이상 ' + mark(madeCount(S.web) >= NEED_LINKS) + ')',
          explain: '먹이 그물에서 <b>쥐</b>는 곡식 열매와 풀을 먹고 뱀·여우·매에게 먹혀요. 이렇게 한 종이 <b>여러 먹이 사슬</b>에 속해서 사슬들이 그물처럼 얽혀요. <b>분해자</b>(버섯·세균)는 모든 생물의 사체와 배설물을 분해해요.',
        },
        {
          type: 'quiz', title: '먹이 그물이 안정적인 까닭',
          goal: '먹이 그물이 먹이 사슬 하나보다 <b>생태계를 안정적으로</b> 유지하는 까닭은?',
          setup() { setMode('web'); },
          choices: ['먹이 그물에는 생산자가 필요하지 않아서', '한 가지 먹이가 줄어도 다른 먹이를 먹을 수 있어서', '먹이 그물에서는 에너지가 이동하지 않아서', '먹이 그물은 생물의 종류가 적어서'],
          answer: 1,
          feedback: ['먹이 그물에도 생산자가 시작이에요. 생산자가 없으면 에너지가 들어오지 않아요.', '', '먹이 그물에서도 화살표를 따라 에너지가 이동해요.', '먹이 그물은 오히려 여러 종의 관계가 얽힌 것이에요.'],
          explain: '먹이 사슬 하나에서는 한 종이 사라지면 그 위 단계의 생물이 먹이를 잃어요. 먹이 그물에서는 <b>먹이가 한 가지가 아니어서</b> 한 종이 줄어도 다른 먹이로 버틸 수 있어요.',
        },
      ],
    },
    {
      title: '생태 피라미드: 단계마다 쌓아 보기', short: '생태 피라미드', icon: '🔺', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 먹이 그물로 에너지가 한 방향으로 이동하는 것을 확인했어요. 영양 단계(생산자·1차 소비자·…)마다 양을 비교하면 어떤 모양일까요?</div>' +
        '<p><b>개체 수 · 생물량 · 에너지량</b>을 블록으로 쌓아 <b>생태 피라미드</b>를 만들고 모양을 비교해요. <b>참나무 숲</b>의 개체 수 피라미드도 쌓아 봐요.</p>',
      features: ['pyr'],
      setup() { resetPyr(); setMode('pyr'); },
      recap: '생태 피라미드는 영양 단계별 양을 쌓은 것이에요. 대개 위로 갈수록 줄지만 개체 수 피라미드는 뒤집힐 수 있고, 에너지량 피라미드는 언제나 위로 갈수록 줄어요.',
      summary: '<ul><li><b>생태 피라미드</b>: 영양 단계별 개체 수·생물량·에너지량을 쌓은 것</li><li>대체로 <b>위로 갈수록 감소</b>하는 안정된 모양이에요.</li><li><b>개체 수 피라미드</b>는 뒤집힐 수 있어요 (참나무 ' + PYR.oak.num.v[0] + '그루 – 벌레 ' + PYR.oak.num.v[1] + '마리 – 새 ' + PYR.oak.num.v[2] + '마리).</li><li><b>에너지량 피라미드</b>는 항상 위로 갈수록 감소해요.</li></ul>',
      missions: [
        {
          id: 'pyr', title: '피라미드 블록 쌓기',
          goal: '초원의 <b>개체 수 · 생물량 · 에너지량</b> 피라미드와 참나무 숲의 <b>개체 수 · 에너지량</b> 피라미드를 모두 쌓아 보세요. (<b>🧱 블록 쌓기</b>)',
          hint: '생태계와 피라미드 종류를 고른 뒤 🧱 블록 쌓기를 눌러요. 블록이 모두 떨어지고 나면 다음 피라미드로 바꿔요.',
          setup() { setMode('pyr'); },
          check: () => pyrBuiltN() === PYR_NEED.length,
          hold: 0.5,
          status: () => PYR_NEED.map((k) => { const [e, ty] = k.split(':'); return mark(!!S.pyr.built[k]) + PYR[e].name.slice(0, 2) + ' ' + PTYPE[ty]; }).join(' &nbsp; '),
          explain: '초원의 세 피라미드는 모두 위로 갈수록 줄어드는 모양이에요. 그런데 참나무 숲의 <b>개체 수</b> 피라미드는 참나무 ' + PYR.oak.num.v[0] + '그루 위에 벌레 ' + PYR.oak.num.v[1] + '마리가 있어서 <b>뒤집힌 모양</b>이에요. 하지만 <b>에너지량</b> 피라미드는 참나무 숲에서도 위로 갈수록 줄어요.',
        },
        {
          type: 'quiz', title: '위로 갈수록 수가 적은 까닭',
          goal: '생태 피라미드에서 <b>상위 단계로 갈수록 생물의 수가 적은</b> 까닭으로 가장 알맞은 것은?',
          setup() { setMode('pyr'); },
          choices: ['상위 단계의 생물은 새끼를 낳지 못해서', '하위 단계의 생물이 상위 단계의 생물을 먹어서', '상위 단계에는 분해자가 없어서', '한 단계 올라갈 때마다 에너지가 줄어 상위 단계가 이용할 수 있는 에너지가 적어서'],
          answer: 3,
          feedback: ['상위 단계의 생물도 새끼를 낳아요. 문제는 이용할 수 있는 에너지의 양이에요.', '먹는 방향이 반대예요. 상위 단계 생물이 하위 단계 생물을 먹어요.', '분해자는 모든 단계의 사체와 배설물을 분해해요. 수가 줄어드는 까닭과는 관계가 없어요.', ''],
          explain: '에너지는 한 단계 올라갈 때마다 <b>약 ' + Math.round(RATE * 100) + ' %만 전달</b>되고 나머지는 열(호흡)·배설물·분해자 등으로 빠져나가요. 그래서 상위 단계가 이용할 수 있는 에너지가 적어 생물의 수도 적어요.',
        },
      ],
    },
    {
      title: '에너지 전달: 줄어드는 에너지', short: '에너지 전달', icon: '⚡', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에너지량 피라미드가 항상 위로 갈수록 줄어드는 것을 봤어요. 단계마다 에너지가 얼마나 전달되는지 직접 확인해요.</div>' +
        '<p>먹이 사슬의 <b>단계 수</b>를 바꾸며 단계마다 남는 에너지를 읽고, 사람의 <b>식단</b>(곡물 vs 쇠고기)에 적용해요.</p>',
      features: ['flow'],
      setup() { resetFlow(); resetDiet(); setMode('flow'); startFlow(); },
      recap: '에너지는 한 단계에서 다음 단계로 갈 때 약 10 %만 전달돼요. 그래서 먹이 사슬은 보통 4~5단계를 넘지 않고, 곡물을 직접 먹으면 쇠고기를 먹을 때보다 약 10배 많은 사람을 먹일 수 있어요.',
      summary: '<ul><li>에너지 전달(예시): 풀 ' + EN[0] + ' kJ → 메뚜기 ' + EN[1] + ' → 개구리 ' + EN[2] + ' → 뱀 ' + EN[3] + ' → 매 ' + EN[4] + ' (단계마다 약 ' + Math.round(RATE * 100) + ' %만 전달)</li><li>나머지 약 ' + Math.round((1 - RATE) * 100) + ' %는 <b>호흡(열)·배설물·사체(분해자)·먹히지 않은 부분</b>으로 빠져나가요.</li><li>그래서 먹이 사슬은 보통 <b>4~5단계</b>를 넘지 않아요.</li><li>같은 밭의 곡물을 사람이 직접 먹으면 소를 거쳐 쇠고기로 먹을 때보다 약 ' + Math.round(1 / RATE) + '배 많은 사람을 먹일 수 있어요(단순화).</li></ul>',
      missions: [
        {
          id: 'flow', title: '5단계 포식자가 받는 에너지', manual: true,
          goal: '먹이 사슬의 단계 수를 <b>5단계</b>로 맞추고 ▶ 에너지 전달을 본 뒤, <b>5단계 생물이 받는 에너지</b>를 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '풀이 ' + EN[0] + ' kJ일 때 한 단계 올라갈 때마다 약 ' + Math.round(RATE * 100) + ' %만 전달돼요. 막대의 숫자를 읽거나 ' + EN[3] + ' kJ의 ' + Math.round(RATE * 100) + ' %를 계산해 보세요.',
          setup() { setMode('flow'); S.flow.ans = null; S.flow.bad = null; updateCtl(); },
          check() {
            const F = S.flow;
            if (F.n !== 5) return '먹이 사슬의 단계 수를 5단계로 늘려서 5단계 생물의 에너지를 확인해요.';
            if (F.ans == null) return '5단계 생물이 받는 에너지를 아래 보기에서 골라요.';
            if (F.ans !== EN[4]) { F.bad = F.ans; updateCtl(); return '아니에요. 4단계(' + FLV[3].n + ')가 ' + fmtE(EN[3]) + ' kJ이고, 다음 단계로는 약 ' + Math.round(RATE * 100) + ' %만 전달돼요. ' + fmtE(EN[3]) + '의 ' + Math.round(RATE * 100) + ' %는 얼마일까요?'; }
            return true;
          },
          status: () => '단계 수 ' + S.flow.n + ' ' + mark(S.flow.n === 5) + ' &nbsp; 고른 답 ' + (S.flow.ans == null ? '—' : S.flow.ans + ' kJ'),
          explain: '풀 ' + EN[0] + ' kJ → 메뚜기 ' + EN[1] + ' → 개구리 ' + EN[2] + ' → 뱀 ' + EN[3] + ' → 매 <b>' + fmtE(EN[4]) + ' kJ</b>예요. 5단계 포식자가 받는 에너지는 풀의 <b>1/' + Math.round(EN[0] / EN[4]) + '</b>밖에 안 돼서 많은 개체가 살아가기 어려워요. 그래서 먹이 사슬은 보통 4~5단계를 넘지 않아요.',
        },
        {
          type: 'quiz', title: '곡물과 쇠고기, 누가 더 많이 먹일까?',
          goal: '같은 밭의 곡물을 <b>사람이 직접 먹을 때</b>(100 %)와 <b>소에게 먹여 쇠고기로 먹을 때</b>(0 %)를 슬라이더로 비교했어요. 직접 먹으면 쇠고기보다 약 몇 배 많은 사람을 먹일 수 있을까요?',
          setup() { setMode('diet'); },
          choices: ['약 2배', '약 100배', '약 ' + Math.round(1 / RATE) + '배', '똑같아요'],
          answer: 2,
          feedback: ['슬라이더를 0 %와 100 %로 옮겨 사람 수를 비교해 보세요. ' + Math.round(peopleFed(100)) + '명과 ' + Math.round(peopleFed(0)) + '명이에요.', '소를 거치면 에너지의 약 ' + Math.round(RATE * 100) + ' %가 전달되니까 ' + Math.round(1 / RATE) + '배 차이예요. 100배는 아니에요.', '', '소를 거치면서 에너지가 줄어서 먹일 수 있는 사람 수가 달라져요.'],
          explain: '곡물을 직접 먹으면 <b>' + Math.round(peopleFed(100)) + '명</b>, 소를 거쳐 쇠고기로 먹으면 에너지의 약 ' + Math.round(RATE * 100) + ' %만 전달되어 <b>' + Math.round(peopleFed(0)) + '명</b>을 먹일 수 있어요. 한 단계를 더 거칠 때마다 에너지가 약 ' + Math.round((1 - RATE) * 100) + ' % 빠져나가기 때문이에요.',
        },
        {
          type: 'quiz', title: '내가 할 수 있는 일',
          goal: '에너지는 먹이 단계를 거칠수록 줄어요. 한정된 식량 자원을 아끼기 위해 <b>내가 할 수 있는 일</b>로 가장 알맞은 것은?',
          setup() { setMode('diet'); },
          choices: ['음식을 먹을 만큼만 담고, 곡물·채소 같은 식물성 음식도 골고루 먹어요.', '고기를 많이 먹을수록 환경에 도움이 된다고 생각해요.', '남은 음식은 버리면 분해자가 처리하니 괜찮다고 생각해요.', '식량 문제는 나와 상관없다고 생각해요.'],
          answer: 0,
          feedback: ['', '고기를 만들려면 곡물을 소에게 먹여야 해서 같은 밭으로 먹일 수 있는 사람 수가 줄어요.', '음식을 만드는 데 쓴 에너지와 자원이 그대로 낭비돼요. 남기지 않는 것이 좋아요.', '식량과 에너지는 모두가 함께 아껴 써야 하는 자원이에요.'],
          explain: '먹이 단계를 거칠수록 에너지가 줄어요. 음식을 남기지 않고 식물성 음식도 골고루 먹는 작은 실천이 <b>식량과 에너지 자원을 아끼는 일</b>이에요. 세계시민으로서 식량 문제에 관심을 갖는 것도 중요해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-food-web', mount: '#game', badge: '먹이 그물 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { chain: '🌾 먹이 사슬 화살표 잇기', web: '🕸️ 먹이 그물 · 분해자 보기', pyr: '🔺 생태 피라미드 블록 쌓기', flow: '⚡ 에너지 전달 · 🍚 식단 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetChain(); resetWeb(); resetPyr(); resetFlow(); resetDiet();
  setMode('chain');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepFlow(dt);
    switch (S.mode) {
      case 'chain': drawChain(dt, t); break;
      case 'web': drawWeb(dt, t); break;
      case 'pyr': drawPyr(dt, t); break;
      case 'flow': drawFlow(dt, t); break;
      default: drawDiet(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(234,246,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, SP, LINKS, CHAIN, CHAIN_LINKS, key, netAttempt, netPaths, madeCount, pyrSet, pyrBuild, PYR, PYR_NEED, startFlow, EN, NEED_LINKS, peopleFed, levels,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) stepFlow(0.02); },
  };
})();
