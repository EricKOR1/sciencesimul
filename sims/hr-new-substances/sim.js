/* 새로운 물질과 사회 - 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 [12반응03-04]
   ① 조사: 개발 연표 · 영향 분류(과학/기술/사회)  ② 실험: 카복실산 + 알코올 → 인공 향 (평형, 수득률)
   ③ 탐구: 살리실산 → 아스피린, 수득률 계산  ④ 분석: 편익 · 위험 저울과 발표 카드.
   반응 메커니즘 · 반응의 종류 · 에스터의 작용기 분류는 다루지 않아요. */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6', BG = '#f3f0fb';
  const GOODC = '#14a058', WARN = '#b45309', BADC = '#dc2626';
  const SCOL = { sci: '#2563eb', tech: '#ea580c', soc: '#16a34a' };
  const GC = { OH: '#2563eb', COOH: '#dc2626', NH2: '#16a34a' };
  const MINUS = '−';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣][^\s가-힣]*|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  function textW(str, size, weight) { ctx.save(); ctx.font = D.font(size, weight || 700); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  /* 아래첨자가 있는 식: segs = ['문자열', ['sub', 'n'], ...] */
  function fx(x, y, size, color, segs, align, weight) {
    weight = weight || 800;
    const ps = segs.map((s) => (typeof s === 'string' ? { t: s, k: 0 } : { t: s[1], k: s[0] === 'sub' ? 1 : -1 }));
    ctx.save(); let w = 0;
    ps.forEach((p) => { ctx.font = D.font(p.k ? size * 0.7 : size, weight); p.w = ctx.measureText(p.t).width; w += p.w; });
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ps.forEach((p) => { ctx.font = D.font(p.k ? size * 0.7 : size, weight); ctx.fillText(p.t, cx, y + (p.k > 0 ? size * 0.2 : p.k < 0 ? -size * 0.38 : 0)); cx += p.w; });
    ctx.restore(); return w;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const fmtN = (n) => Math.round(n).toLocaleString('en-US');
  const hasBatchim = (s) => { const c = String(s).charCodeAt(String(s).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  const josa = (s, withB, noB) => s + (hasBatchim(s) ? withB : noB);
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const S = { mode: '', gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').some((g) => gateOn(g));
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  const MODE_LABEL = { tl: '🕰️ 물질 개발 연표', impact: '🧭 영향 문장 분류', aroma: '🍌 인공 향 만들기', drug: '💊 아스피린 합성', eval: '⚖️ 편익과 위험 평가' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); onLeave(S.mode); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb) tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }
  function pill(x, y, text, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const s = o.scale == null ? 1 : o.scale; ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 13, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad, align: o.align });
    ctx.restore(); return rc;
  }


  function hexPath(cx, cy, r, rot) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); }
  function line(x1, y1, x2, y2, w, col) { ctx.strokeStyle = col || '#64748b'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function gateOn(g) {
    if (g === 'stars') return evComplete(EV.sub);
    const free = !!(game && game.free);
    if (g === 'card') return S.gate === 'card' || (free && evComplete(EV.sub));
    return S.gate === g || free;
  }
  function cardBox(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    const lift = o.lift || 0, cx = x + w / 2, cy = y + h / 2, sc = 1 + 0.06 * lift;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 10); ctx.fillStyle = o.fill || '#fff'; ctx.fill(); }, { blur: 3 + 11 * lift, y: 1 + 6 * lift });
    D.roundRect(x, y, w, h, o.r || 10); ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.lw || 1.6; ctx.stroke();
    ctx.restore();
  }

  /* ============ ① 개발 연표 ============ */
  const TLC = [
    { id: 'aroma', ico: '🍌', name: '인공 향료', year: '19세기 중반', rx: '카복실산 + 알코올 → 향기 나는 물질 + 물', note: '과일 향을 닮은 물질을 반응으로 만들어 식품 · 화장품에 향을 더해요.' },
    { id: 'asp', ico: '💊', name: '아스피린', year: '1897년', rx: '살리실산 + 아세트산 무수물 → 아세틸살리실산(아스피린) + 아세트산', note: '버드나무 껍질의 진통 성분(살리실산)을 개선한 의약품이에요.' },
    { id: 'nyl', ico: '🧦', name: '나일론', year: '1935년', rx: '두 종류의 단위체가 번갈아 반복 연결 (물이 빠짐) → 나일론', note: '최초의 합성 섬유예요. 스타킹 · 낙하산 · 옷감에 쓰였어요.' },
    { id: 'pet', ico: '🧴', name: 'PET', year: '1941년', rx: '테레프탈산 + 에틸렌 글라이콜 → PET + 물', note: '투명하고 질겨서 병과 섬유로 쓰여요.' },
    { id: 'bag', ico: '🛍️', name: '비닐봉지', year: '1960년대', rx: 'n 에틸렌 → 폴리에틸렌 [–CH₂CH₂–]ₙ', note: '폴리에틸렌은 1933년에 처음 합성됐고, 값싼 비닐봉지로는 1960년대부터 널리 쓰였어요.' },
  ];
  const TL_ORDER = ['nyl', 'bag', 'aroma', 'pet', 'asp'];
  const tlC = (id) => TLC.find((c) => c.id === id);
  const TL = { slots: [null, null, null, null, null], pos: {}, drag: null, sel: null, focus: null, bad: [false, false, false, false, false], solved: false };
  TLC.forEach((c) => { TL.pos[c.id] = { x: 0, y: 0, lift: 0, shake: 0 }; });
  const tlGeo = () => PHONE ? { w: 84, h: 98, sx: (i) => 12 + i * 89, sy: 106, tx: (j) => 12 + j * 89, ty: 240, axisY: 80, tlab: 228 } : { w: 140, h: 118, sx: (i) => 34 + i * 148, sy: 104, tx: (j) => 34 + j * 148, ty: 252, axisY: 82, tlab: 240 };
  const tlLoc = (id) => TL.slots.indexOf(id);
  const tlTarget = (id) => { const G = tlGeo(), l = tlLoc(id); return l >= 0 ? { x: G.sx(l), y: G.sy } : { x: G.tx(TL_ORDER.indexOf(id)), y: G.ty }; };
  function tlInit() { TLC.forEach((c) => { const t = tlTarget(c.id); TL.pos[c.id].x = t.x; TL.pos[c.id].y = t.y; }); }
  tlInit();
  const tlPlaced = () => TL.slots.filter(Boolean).length;
  const tlOk = () => TL.slots.every((id, i) => id === TLC[i].id);
  function tlPlace(id, i) {
    const o = tlLoc(id);
    if (i < 0) { if (o >= 0) TL.slots[o] = null; }
    else { const occ = TL.slots[i]; if (occ === id) return; if (o >= 0) TL.slots[o] = occ; TL.slots[i] = id; }
    TL.bad = [false, false, false, false, false]; TL.focus = id; TL.sel = null; Sound.tick();
    if (i >= 0) { const G = tlGeo(); flash(G.sx(i) + G.w / 2, G.sy + G.h / 2, ['#a78bfa', '#fbbf24', '#ffffff']); }
    updateCtl();
  }
  function tlReset() { TL.slots = [null, null, null, null, null]; TL.bad = [false, false, false, false, false]; TL.drag = null; TL.sel = null; TL.focus = null; TL.solved = false; updateCtl(); }
  function stepTl(dt) {
    TLC.forEach((c) => {
      const p = TL.pos[c.id], t = tlTarget(c.id), dragging = TL.drag && TL.drag.id === c.id;
      if (!dragging) { p.x = ap(p.x, t.x, dt, RM ? 60 : 12); p.y = ap(p.y, t.y, dt, RM ? 60 : 12); }
      p.lift = ap(p.lift, dragging ? 1 : 0, dt, 12); p.shake = Math.max(0, p.shake - dt);
    });
  }
  function drawTlCard(c) {
    const G = tlGeo(), p = TL.pos[c.id], sel = TL.sel === c.id, bad = TL.bad[tlLoc(c.id)] && tlLoc(c.id) >= 0;
    const sx = p.shake > 0 ? Math.sin(p.shake * 70) * 4 : 0;
    cardBox(p.x + sx, p.y, G.w, G.h, { lift: p.lift, stroke: bad ? BADC : sel ? PUR : '#cbd5e1', lw: sel || bad ? 3 : 1.6, fill: bad ? '#fee2e2' : '#fff' });
    const mx = p.x + sx + G.w / 2;
    T(mx, p.y + (PHONE ? 38 : 46), c.ico, PHONE ? 30 : 38, INK, 'center', 700);
    T(mx, p.y + G.h - (PHONE ? 38 : 40), c.name, PHONE ? 14 : 16, INK, 'center', 900);
    T(mx, p.y + G.h - (PHONE ? 16 : 16), c.year, 13, '#5b21b6', 'center', 800);
  }
  function drawTl(t) {
    const G = tlGeo();
    T(14, 26, '🕰️ 물질 카드를 개발된 순서대로 놓아요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.arrow(G.sx(0), G.axisY, G.sx(4) + G.w, G.axisY, { color: '#a78bfa', width: 4 });
    T(G.sx(0), G.axisY - 12, '옛날', 13.5, '#5b21b6', 'left', 800); T(G.sx(4) + G.w, G.axisY - 12, '최근', 13.5, '#5b21b6', 'right', 800);
    for (let i = 0; i < 5; i++) {
      const x = G.sx(i), y = G.sy, over = TL.drag && TL.drag.over === i;
      D.roundRect(x, y, G.w, G.h, 10); ctx.fillStyle = over ? '#ede9fe' : '#f8fafc'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = over ? PUR : '#b6bfce'; ctx.lineWidth = over ? 3 : 1.6; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x + 14, y + 14, 11, 0, TAU); ctx.fillStyle = TL.solved ? GOODC : '#a78bfa'; ctx.fill(); T(x + 14, y + 19, String(i + 1), 13.5, '#fff', 'center', 900);
    }
    T(G.tx(0), G.tlab, '물질 카드 (끌어서 위의 칸에 놓아요)', 14.5, WARN, 'left', 800);
    const list = TLC.filter((c) => !(TL.drag && TL.drag.id === c.id));
    list.forEach((c) => drawTlCard(c));
    if (TL.drag) drawTlCard(tlC(TL.drag.id));
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const f = TL.focus ? tlC(TL.focus) : null;
    if (f) {
      T(INFO.x + 16, INFO.y + 28, f.ico + ' ' + f.name + ' · ' + f.year, 17, '#5b21b6', 'left', 900);
      T(INFO.x + 16, INFO.y + 54, '어떤 반응으로 만들었을까?', 13.5, WARN, 'left', 800);
      const h1 = textBlock(INFO.x + 16, INFO.y + 76, INFO.w - 32, f.rx, 15, INK, 20, 800);
      textBlock(INFO.x + 16, INFO.y + 76 + h1 + 6, INFO.w - 32, f.note, 13.5, MUTED, 18, 700);
    } else {
      T(INFO.x + 16, INFO.y + 28, '카드를 눌러 보세요', 17, '#5b21b6', 'left', 900);
      textBlock(INFO.x + 16, INFO.y + 56, INFO.w - 32, '각 물질은 탄소 화합물의 반응(원료 → 생성물)으로 만들어졌어요. 카드를 누르면 어떤 반응인지 볼 수 있어요.', 14, INK, 19, 700);
    }
    if (TL.solved) pill(INFO.x + INFO.w - 14, INFO.y + 22, '✅ 연대순 완성', { bg: '#dcfce7', color: '#166534', border: '#86efac', size: 13.5, align: 'right' });
  }

  /* ============ ① 영향 문장 분류 ============ */
  const IMB = [{ g: 'sci', t: '🔬 과학 · 원리 발견' }, { g: 'tech', t: '🏭 기술 · 대량 생산' }, { g: 'soc', t: '🏙️ 사회 · 생활 변화' }];
  const IMC = [
    { id: 's1', g: 'sci', t: '살리실산의 구조를 바꾸면 성질이 개선됨을 알아냄' },
    { id: 's2', g: 'sci', t: '단위체를 반복 결합하면 큰 분자가 된다는 원리를 확인함' },
    { id: 't1', g: 'tech', t: '아스피린을 공장에서 대량으로 합성함' },
    { id: 't2', g: 'tech', t: '나일론 · PET를 대량 생산해 섬유와 병으로 가공함' },
    { id: 'c1', g: 'soc', t: '스타킹 · 낙하산 등 섬유 소재가 늘고 옷이 값싸짐' },
    { id: 'c2', g: 'soc', t: '식품 보관이 편해졌지만 플라스틱 쓰레기도 늘어남' },
  ];
  const IM_ORDER = ['c2', 't2', 's2', 'c1', 't1', 's1'];
  const IM = { loc: {}, pos: {}, drag: null, sel: null, bad: {}, solved: false, seq: 0, ord: {} };
  IMC.forEach((c) => { IM.loc[c.id] = -1; IM.pos[c.id] = { x: 0, y: 0, lift: 0, shake: 0 }; });
  const imC = (id) => IMC.find((c) => c.id === id);
  const imGeo = () => PHONE
    ? { cw: 142, ch: 64, box: (i) => ({ x: 12, y: 56 + i * 114, w: 456, h: 106 }), inBox: (i, n) => ({ x: 20 + n * 148, y: 56 + i * 114 + 34 }), tray: (j) => ({ x: 12 + (j % 3) * 152, y: 420 + Math.floor(j / 3) * 72 }), trayLab: 408, info: { x: 8, y: 572, w: 464, h: 170 } }
    : { cw: 232, ch: 42, box: (i) => ({ x: 24 + i * 254, y: 84, w: 246, h: 176 }), inBox: (i, n) => ({ x: 31 + i * 254, y: 84 + 30 + n * 46 }), tray: (j) => ({ x: 31 + (j % 3) * 254, y: 284 + Math.floor(j / 3) * 50 }), trayLab: 276, info: INFO };
  const imBoxCards = (b) => IMC.filter((c) => IM.loc[c.id] === b).sort((p, q) => (IM.ord[p.id] || 0) - (IM.ord[q.id] || 0));
  const imTarget = (id) => { const G = imGeo(), l = IM.loc[id]; if (l < 0) return G.tray(IM_ORDER.indexOf(id)); return G.inBox(l, imBoxCards(l).findIndex((c) => c.id === id)); };
  function imInit() { IMC.forEach((c) => { const t = imTarget(c.id); IM.pos[c.id].x = t.x; IM.pos[c.id].y = t.y; }); }
  imInit();
  const imPlaced = () => IMC.filter((c) => IM.loc[c.id] >= 0).length;
  const imRight = () => IMC.filter((c) => IM.loc[c.id] >= 0 && IMB[IM.loc[c.id]].g === c.g).length;
  function imPlace(id, b) {
    if (b >= 0 && imBoxCards(b).filter((c) => c.id !== id).length >= 3) { showHint('한 상자에는 카드를 3장까지 넣을 수 있어요.', 2400); IM.pos[id].shake = 0.4; Sound.fail(); return false; }
    IM.loc[id] = b; IM.ord[id] = ++IM.seq; IM.bad[id] = false; IM.sel = null; Sound.tick(); updateCtl(); return true;
  }
  function imReset() { IMC.forEach((c) => { IM.loc[c.id] = -1; IM.bad[c.id] = false; }); IM.drag = null; IM.sel = null; IM.solved = false; updateCtl(); }
  function stepIm(dt) {
    IMC.forEach((c) => {
      const p = IM.pos[c.id], t = imTarget(c.id), dragging = IM.drag && IM.drag.id === c.id;
      if (!dragging) { p.x = ap(p.x, t.x, dt, RM ? 60 : 12); p.y = ap(p.y, t.y, dt, RM ? 60 : 12); }
      p.lift = ap(p.lift, dragging ? 1 : 0, dt, 12); p.shake = Math.max(0, p.shake - dt);
    });
  }
  function drawImCard(c) {
    const G = imGeo(), p = IM.pos[c.id], sel = IM.sel === c.id, bad = IM.bad[c.id] && IM.loc[c.id] >= 0;
    const sx = p.shake > 0 ? Math.sin(p.shake * 70) * 4 : 0;
    cardBox(p.x + sx, p.y, G.cw, G.ch, { lift: p.lift, stroke: bad ? BADC : sel ? PUR : '#cbd5e1', lw: sel || bad ? 3 : 1.6, fill: bad ? '#fee2e2' : '#fff', r: 9 });
    textBlock(p.x + sx + 8, p.y + (PHONE ? 19 : 17), G.cw - 14, c.t, 13, INK, PHONE ? 16 : 16, 800);
  }
  function drawIm(t) {
    const G = imGeo();
    T(14, 26, '🧭 영향 문장을 과학 · 기술 · 사회 상자로 나눠요', PHONE ? 13.5 : 17, INK, 'left', 800);
    if (!PHONE) panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); else panel(8, 40, 464, 534, 14);
    IMB.forEach((b, i) => {
      const r = G.box(i), col = SCOL[b.g], over = IM.drag && IM.drag.over === i;
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = over ? C.rgba(col, 0.2) : C.rgba(col, 0.07); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = over ? 3.4 : 2; ctx.setLineDash(over ? [] : [8, 6]); ctx.stroke(); ctx.setLineDash([]);
      D.roundRect(r.x + 6, r.y + 5, r.w - 12, 22, 11); ctx.fillStyle = col; ctx.fill(); T(r.x + r.w / 2, r.y + 21, b.t, 13.5, '#fff', 'center', 900);
    });
    const left = IMC.filter((c) => IM.loc[c.id] < 0).length;
    T(G.tray(0).x, G.trayLab, left ? '문장 카드 ' + left + '장 (끌어서 상자에 넣어요)' : '모두 넣었어요. “확인하기”를 눌러요', 14.5, WARN, 'left', 800);
    IMC.filter((c) => !(IM.drag && IM.drag.id === c.id)).forEach((c) => drawImCard(c));
    if (IM.drag) drawImCard(imC(IM.drag.id));
    const I = G.info; panel(I.x, I.y, I.w, I.h, 14);
    T(I.x + 16, I.y + 26, '과학 → 기술 → 사회', 15, WARN, 'left', 800);
    const xs = [I.x + 16, I.x + 16 + (PHONE ? 140 : 178), I.x + 16 + (PHONE ? 280 : 356)];
    IMB.forEach((b, i) => { pill(xs[i], I.y + 56, b.t.split(' ')[0] + ' ' + b.t.split(' ')[1], { bg: SCOL[b.g], color: '#fff', border: null, size: 13.5, align: 'left' }); if (i < 2) T(xs[i] + (PHONE ? 112 : 118), I.y + 61, '→', 17, '#94a3b8', 'center', 900); });
    textBlock(I.x + 16, I.y + 88, I.w - 32, IM.solved ? '원리를 알아내면(과학) 공장에서 대량으로 만들 수 있고(기술), 그 물질이 생활을 바꿔요(사회). 사회의 변화에는 이로움과 함께 새로운 문제도 따라와요.' : '새 물질은 원리를 알아내는 과학, 대량으로 만드는 기술, 생활을 바꾸는 사회의 영향이 이어져 나타나요.', 13.5, INK, 18, 700);
  }
