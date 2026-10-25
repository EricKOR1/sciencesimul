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

  /* ============ ② 인공 향 ============ */
  const AMT = [0.10, 0.15, 0.20, 0.25, 0.30], K_EQ = 4, N_ACID = 0.10;
  const ACIDS = { ace: { name: '아세트산', lab: ['아세트산'], f: 'CH₃COOH', M: 60, nm: '아세트산' }, but: { name: '뷰티르산', lab: ['뷰티르산'], f: 'CH₃CH₂CH₂COOH', M: 88 } };
  const ALCS = { eth: { name: '에탄올', lab: ['에탄올'], f: 'CH₃CH₂OH', M: 46 }, iso: { name: '아이소아밀 알코올', lab: ['아이소아밀', '알코올'], f: '(CH₃)₂CHCH₂CH₂OH', M: 88 } };
  const FRU = {
    'ace-eth': { name: '아세트산 에틸', ico: '🍐', smell: '배 같은 과일 향 (접착제 용제에도 쓰여요)', f: 'CH₃COOCH₂CH₃' },
    'ace-iso': { name: '아세트산 아이소아밀', ico: '🍌', smell: '바나나 향', f: 'CH₃COOCH₂CH₂CH(CH₃)₂' },
    'but-eth': { name: '뷰티르산 에틸', ico: '🍍', smell: '파인애플 향', f: 'CH₃CH₂CH₂COOCH₂CH₃' },
    'but-iso': { name: '뷰티르산 아이소아밀', ico: '🍑', smell: '살구 · 배 같은 과일 향', f: 'CH₃CH₂CH₂COOCH₂CH₂CH(CH₃)₂' },
  };
  /* 평형 상수 K = x² / ((0.10 − x)(a − x)) = 4 를 만족하는 생성물의 양 x (mol) */
  function eqX(a) {
    const A = 1 - K_EQ, B = K_EQ * (N_ACID + a), Cc = -K_EQ * N_ACID * a; // (1 − K) x² + K (n + a) x − K n a = 0 형태로 정리
    const aa = K_EQ - 1, bb = -K_EQ * (N_ACID + a), cc = K_EQ * N_ACID * a;
    void A; void B; void Cc;
    return (-bb - Math.sqrt(bb * bb - 4 * aa * cc)) / (2 * aa);
  }
  const AR = { acid: 'ace', alc: 'eth', ai: 0, run: null, res: null, done: {}, yAt: {}, bar: { a: 0.10, b: 0.10, p: 0, w: 0 }, flame: 0, emit: 0, pop: 0 };
  const arKey = () => AR.acid + '-' + AR.alc;
  const arAmt = () => AMT[AR.ai];
  const arPct = (ai) => Math.round(100 * eqX(AMT[ai]) / N_ACID);
  const arG = () => PHONE
    ? { panel: { x: 8, y: 56, w: 464, h: 150 }, bt: { ace: { x: 56, y: 108 }, but: { x: 148, y: 108 }, eth: { x: 298, y: 108 }, iso: { x: 398, y: 108 } }, hdr: { acid: 18, alc: 262 }, flask: { x: 120, by: 408, w: 130, h: 150 }, chart: { x: 232, y: 214, w: 240, h: 262 }, plot: { x: 250, y: 268, w: 210, h: 140 } }
    : { panel: { x: 24, y: 62, w: 192, h: 322 }, bt: { ace: { x: 72, y: 132 }, but: { x: 168, y: 132 }, eth: { x: 72, y: 250 }, iso: { x: 168, y: 250 } }, hdr: { acid: 84, alc: 220 }, flask: { x: 360, by: 322, w: 150, h: 170 }, chart: { x: 500, y: 62, w: 264, h: 322 }, plot: { x: 522, y: 116, w: 226, h: 180 } };
  const arBottleHit = (p) => { const G = arG(); for (const k of ['ace', 'but']) { const q = G.bt[k]; if (Math.abs(p.x - q.x) < 36 && p.y > q.y - 40 && p.y < q.y + 70) return ['acid', k]; } for (const k of ['eth', 'iso']) { const q = G.bt[k]; if (Math.abs(p.x - q.x) < 36 && p.y > q.y - 40 && p.y < q.y + 70) return ['alc', k]; } return null; };
  function arSet(kind, key) {
    if (AR.run) return;
    if (kind === 'acid') AR.acid = key; else if (kind === 'alc') AR.alc = key; else if (kind === 'amt') AR.ai = clamp(key, 0, 4);
    AR.res = null; Sound.click(); updateCtl();
  }
  function arRun() {
    if (AR.run) return;
    AR.res = null; AR.run = { t: 0, key: arKey(), ai: AR.ai }; Sound.click(); updateCtl();
  }
  function arReset() { AR.run = null; AR.res = null; AR.done = {}; AR.yAt = {}; AR.acid = 'ace'; AR.alc = 'eth'; AR.ai = 0; AR.bar = { a: 0.10, b: 0.10, p: 0, w: 0 }; updateCtl(); }
  const arDoneN = () => Object.keys(AR.done).length;
  function stepAr(dt) {
    const G = arG();
    if (AR.run) {
      AR.run.t += dt / (RM ? 0.3 : 3.6);
      const pr = sm(AR.run.t);
      if (!RM && Math.random() < dt * 14 * pr) parts.emit({ x: G.flask.x + (Math.random() - 0.5) * 10, y: G.flask.by - G.flask.h - 4, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 20, life: 1.8, size: 5 + Math.random() * 4, color: 'rgba(253,224,71,0.8)', shape: 'smoke', gravity: -10 });
      if (!RM && Math.random() < dt * 9) parts.emit({ x: G.flask.x + (Math.random() - 0.5) * G.flask.w * 0.5, y: G.flask.by - 10, vx: 0, vy: -45 - Math.random() * 25, life: 1.0, size: 2.5 + Math.random() * 2, color: '#e0f2fe', shape: 'bubble', gravity: 0 });
      if (AR.run.t >= 1) {
        const key = AR.run.key, ai = AR.run.ai, x = eqX(AMT[ai]);
        AR.res = { key, ai, x }; AR.done[key] = true; AR.yAt[ai] = Math.round(100 * x / N_ACID); AR.run = null; AR.pop = 1;
        Sound.success(); flash(G.flask.x, G.flask.by - G.flask.h - 20, ['#fde047', '#fb923c', '#ffffff']); updateCtl();
      }
    }
    AR.pop = ap(AR.pop, 0, dt, 2);
    const live = AR.run ? sm(AR.run.t) : AR.res ? 1 : 0, a = arAmt(), x = eqX(a);
    const tg = { a: N_ACID - x * live, b: a - x * live, p: x * live, w: x * live };
    ['a', 'b', 'p', 'w'].forEach((k) => { AR.bar[k] = RM ? tg[k] : ap(AR.bar[k], tg[k], dt, 9); });
    AR.flame = ap(AR.flame, AR.run ? 1 : 0, dt, 5);
  }
  function drawBottle(x, y, label, col, on, name) {
    ctx.save();
    if (on) D.glow(x, y + 18, 54, col, 0.45);
    D.shadow(() => { D.roundRect(x - 26, y - 16, 52, 60, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); }, { blur: on ? 10 : 4, y: 2 });
    D.roundRect(x - 22, y + 8, 44, 32, 6); ctx.fillStyle = C.rgba(col, 0.55); ctx.fill();
    D.roundRect(x - 26, y - 16, 52, 60, 10); ctx.strokeStyle = on ? col : '#94a3b8'; ctx.lineWidth = on ? 3.4 : 1.8; ctx.stroke();
    D.roundRect(x - 10, y - 28, 20, 14, 4); ctx.fillStyle = on ? col : '#94a3b8'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 18, y - 8, 4, 40);
    label.forEach((s, i) => T(x, y + 62 + i * 15, s, 13, on ? INK : MUTED, 'center', 800));
    ctx.restore();
  }
  function drawAroma(t) {
    const G = arG(), fk = FRU[arKey()], ac = ACIDS[AR.acid], al = ALCS[AR.alc], a = arAmt();
    T(14, 26, '🍌 카복실산과 알코올을 가열해 인공 향을 만들어요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(G.panel.x, G.panel.y, G.panel.w, G.panel.h, 14, '#faf8ff');
    if (PHONE) { T(G.panel.x + 14, G.panel.y + 22, '카복실산 (–COOH)', 14, '#dc2626', 'left', 800); T(G.panel.x + 252, G.panel.y + 22, '알코올 (–OH)', 14, '#2563eb', 'left', 800); }
    else { T(G.panel.x + G.panel.w / 2, G.hdr.acid, '카복실산 (–COOH)', 14.5, '#dc2626', 'center', 800); T(G.panel.x + G.panel.w / 2, G.hdr.alc, '알코올 (–OH)', 14.5, '#2563eb', 'center', 800); }
    ['ace', 'but'].forEach((k) => drawBottle(G.bt[k].x, G.bt[k].y + (PHONE ? 8 : 0), ACIDS[k].lab, '#ef4444', AR.acid === k, k));
    ['eth', 'iso'].forEach((k) => drawBottle(G.bt[k].x, G.bt[k].y + (PHONE ? 8 : 0), ALCS[k].lab, '#3b82f6', AR.alc === k, k));
    // 플라스크 + 가열
    const F = G.flask, run = AR.run, prog = run ? sm(run.t) : AR.res ? 1 : 0;
    D.shadow(() => { D.roundRect(F.x - 62, F.by + 22, 124, 14, 5); ctx.fillStyle = '#64748b'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(F.x - 40, F.by + 8, 80, 14, 4); ctx.fillStyle = '#94a3b8'; ctx.fill();
    D.flame(F.x, F.by + 8, 42 * AR.flame, t);
    const lvl = 0.3 + 0.35 * (N_ACID + a) / 0.40;
    D.flask(F.x, F.by, F.w, F.h, { level: lvl, liquid: C.mix('#bfdbfe', '#fcd34d', prog), t });
    if (!RM && run) { for (let i = 0; i < 4; i++) { const ph = ((t * 0.5 + i * 0.27) % 1); const wy = F.by - F.h + 10 + ph * (F.h * 0.38); ctx.beginPath(); ctx.arc(F.x - F.w * 0.14 - ph * 6, wy, 3, 0, TAU); ctx.fillStyle = 'rgba(96,165,250,.8)'; ctx.fill(); } }
    if (prog > 0.55) {
      const al2 = sm((prog - 0.55) / 0.3), by2 = F.by - F.h - 44 - (RM ? 0 : Math.sin(t * 2.4) * 4);
      ctx.save(); ctx.globalAlpha = al2; T(F.x, by2, fk.ico, 40 + 8 * AR.pop, INK, 'center', 700); ctx.restore();
      ctx.save(); ctx.globalAlpha = al2; pill(F.x, by2 - 36, fk.name, { bg: '#fff7ed', color: '#9a3412', border: '#fdba74', size: 14 }); ctx.restore();
    }
    // 평형 조성 막대
    const Cc = G.chart; panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 24, '반응 후 조성 (mol)', 14.5, WARN, 'left', 800);
    const P = G.plot, MAXV = 0.30;
    for (let v = 0; v <= 3; v++) { const yy = P.y + P.h - P.h * (v / 3); line(P.x, yy, P.x + P.w, yy, 1, '#e2e8f0'); T(P.x - 4, yy + 4, (v * 0.1).toFixed(2), 12.5, MUTED, 'right', 700); }
    const names = ['카복실산', '알코올', '향 물질', '물'], cols = ['#ef4444', '#3b82f6', '#f59e0b', '#38bdf8'], keys = ['a', 'b', 'p', 'w'];
    const bw = Math.min(40, P.w / 5.5), gap = (P.w - 4 * bw) / 5;
    keys.forEach((k, i) => {
      const bx = P.x + gap * (i + 1) + bw * i, h = clamp(AR.bar[k] / MAXV, 0, 1) * P.h;
      const g = ctx.createLinearGradient(0, P.y + P.h - h, 0, P.y + P.h); g.addColorStop(0, C.shade ? C.shade(cols[i], 0.2) : cols[i]); g.addColorStop(1, cols[i]);
      if (h > 0.5) { D.roundRect(bx, P.y + P.h - h, bw, h, Math.min(6, h / 2)); ctx.fillStyle = g; ctx.fill(); }
      T(bx + bw / 2, P.y + P.h - h - 6, AR.bar[k].toFixed(3), 12.5, INK, 'center', 800);
      T(bx + bw / 2, P.y + P.h + 18, names[i], 13, MUTED, 'center', 800);
    });
    if (AR.res) pill(Cc.x + Cc.w / 2, Cc.y + Cc.h - 22, '수득률 ' + Math.round(100 * AR.res.x / N_ACID) + ' %', { bg: '#dcfce7', color: '#166534', border: '#86efac', size: 16 });
    else T(Cc.x + Cc.w / 2, Cc.y + Cc.h - 18, run ? '평형에 가까워지는 중…' : '“가열하기”를 눌러요', 13.5, MUTED, 'center', 800);
    // 하단 설명
    if (!PHONE) arInfo(INFO);
    else arInfo({ x: 8, y: 484, w: 464, h: 270 });
  }
  function arInfo(I) {
    const ac = ACIDS[AR.acid], al = ALCS[AR.alc], fk = FRU[arKey()], a = arAmt();
    panel(I.x, I.y, I.w, I.h, 14);
    T(I.x + 16, I.y + 24, '카복실산 + 알코올 ⇌ 향기 나는 물질 + 물   (진한 황산 촉매, 가열)', PHONE ? 13.5 : 14.5, WARN, 'left', 800);
    const fl = ac.f + ' + ' + al.f + ' ⇌ ' + fk.f + ' + H₂O';
    const h1 = textBlock(I.x + 16, I.y + 52, I.w - 32, fl, PHONE ? 14 : 15, INK, 19, 800);
    let y = I.y + 52 + h1 + 4;
    y += textBlock(I.x + 16, y, I.w - 32, '넣은 양 : ' + ac.name + ' ' + N_ACID.toFixed(2) + ' mol (' + (N_ACID * ac.M).toFixed(1) + ' g) + ' + al.name + ' ' + a.toFixed(2) + ' mol (' + (a * al.M).toFixed(1) + ' g)', 13.5, MUTED, 18, 700);
    y += 2;
    if (AR.res && AR.res.key === arKey() && AR.res.ai === AR.ai) {
      const x = AR.res.x;
      textBlock(I.x + 16, y, I.w - 32, '향 물질 ' + x.toFixed(3) + ' mol (' + fk.name + ', ' + fk.smell + ')  →  수득률 = ' + x.toFixed(3) + ' / ' + N_ACID.toFixed(2) + ' × 100 = ' + Math.round(100 * x / N_ACID) + ' %', 14, '#166534', 19, 800);
    } else textBlock(I.x + 16, y, I.w - 32, '가열하면 조합에 따라 다른 과일 향이 나요. 이 모형에서는 모든 조합의 평형 상수를 K ≈ 4로 단순화했어요.', 13.5, INK, 18, 700);
    if (PHONE) textBlock(I.x + 16, I.y + I.h - 40, I.w - 32, '⚠️ 실제 실험은 보안경 · 환기, 진한 황산은 교사 시연으로 해요.', 13, '#9a3412', 17, 700);
    else T(I.x + 16, I.y + I.h - 12, '⚠️ 실제 실험은 보안경 · 장갑 · 환기, 진한 황산은 교사 시연. 남은 용액은 폐액통에 모아요.', 13, '#9a3412', 'left', 700);
  }

  /* ============ ③ 의약품 합성 ============ */
  const DR = { p: 0, run: false, done: false, replays: 0, gauge: 0.85, theo: NaN, pct: NaN, tOk: false, pOk: false };
  const drG = () => PHONE ? { RX: 372, RY: 252, card: { x: 8, y: 366, w: 464, h: 110 }, byP: { x: 78, y: 340 } } : { RX: 400, RY: 214, card: { x: 520, y: 62, w: 256, h: 322 }, byP: { x: 120, y: 340 } };
  function drRun() { if (DR.run) return; DR.p = 0; DR.run = true; DR.done = false; DR.replays++; Sound.click(); updateCtl(); }
  function drReset() { DR.p = 0; DR.run = false; DR.done = false; DR.replays = 0; DR.theo = NaN; DR.pct = NaN; updateCtl(); }
  function stepDr(dt) {
    if (DR.run) { DR.p += dt / (RM ? 0.4 : 5.2); if (DR.p >= 1) { DR.p = 1; DR.run = false; DR.done = true; Sound.success(); const G = drG(); flash(G.RX, G.RY, ['#fb923c', '#fde047', '#ffffff']); updateCtl(); } }
    DR.gauge = 0.85 + (0.45 - 0.85) * sm((DR.p - 0.55) / 0.4);
  }
  function piece(x, y, w, text, col) {
    D.shadow(() => { D.roundRect(x - w / 2, y - 16, w, 32, 9); ctx.fillStyle = col; ctx.fill(); }, { blur: 4, y: 2 });
    T(x, y + 5, text, 14, '#fff', 'center', 900);
  }
  function drawDrug(t) {
    const G = drG(), p = DR.p, RX = G.RX, RY = G.RY, r = 40;
    T(14, 26, '💊 살리실산의 –OH가 바뀌어 아스피린이 돼요', PHONE ? 13.5 : 17, INK, 'left', 800);
    if (!PHONE) panel(MAIN.x, MAIN.y, 500 + 0, MAIN.h, 14); else panel(MAIN.x, MAIN.y, MAIN.w, 306, 14);
    const e1 = sm(p / 0.28), e2 = sm((p - 0.28) / 0.22), eH = sm((p - 0.38) / 0.18), e4 = sm((p - 0.62) / 0.38);
    const siteO = { x: RX - 64, y: RY - 37 }, Afin = siteO.x - 46, Apre = Afin - 40, Ahome = Apre - 70;
    const Ab = lerp(Ahome, Apre, e1), Ax = lerp(Ab, Afin, e2), Oy = siteO.y;
    // 고리
    const topV = { x: RX, y: RY - r }, ulV = { x: RX + r * Math.cos(Math.PI * 7 / 6), y: RY + r * Math.sin(Math.PI * 7 / 6) };
    hexPath(RX, RY, r, -Math.PI / 2); ctx.fillStyle = '#fffbeb'; ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(RX, RY, r * 0.58, 0, TAU); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    line(topV.x, topV.y, topV.x, topV.y - 30, 3);
    pill(topV.x, topV.y - 44, '–COOH', { bg: '#dc2626', color: '#fff', border: null, size: 14 });
    line(ulV.x, ulV.y, siteO.x, siteO.y, 3);
    // 반응 자리 (O 원자)
    D.sphere(siteO.x, siteO.y, 10, '#ef4444', { text: 'O', textScale: 1.1 });
    const bonded = e2 > 0.98;
    if (bonded) { line(siteO.x - 10, siteO.y, Afin + 31, Oy, 3, '#7c3aed'); }
    if (p < 0.38) D.sphere(siteO.x - 12, siteO.y - 13, 6, '#f8fafc', { text: 'H', textColor: '#334155', outline: '#94a3b8', gloss: false });
    // 무수물 조각
    const Ox2 = Ab - 49, Bx = Ab - 90;
    const lefty = lerp(Oy, G.byP.y, e4), leftx = lerp(0, 1, e4);
    const acidPos = { x: lerp(Bx + 46, G.byP.x, e4), y: lerp(Oy, G.byP.y, e4) };
    if (p < 0.56) {
      if (e2 < 0.98) line(Ox2 + 9, Oy, Ax - 31, Oy, 3, '#9ca3af');
      line(Bx + 31, Oy, Ox2 - 9, Oy, 3, '#9ca3af');
      piece(Bx, Oy, 62, 'COCH₃', '#64748b');
      D.sphere(Ox2, Oy, 10, '#ef4444', { text: 'O', textScale: 1.1 });
      if (eH > 0 && eH < 1) { const hx = lerp(siteO.x - 12, Ox2, eH), hy = lerp(siteO.y - 13, Oy - 14, eH) - Math.sin(Math.PI * eH) * 26; D.sphere(hx, hy, 6, '#f8fafc', { text: 'H', textColor: '#334155', outline: '#94a3b8', gloss: false }); }
    } else {
      pill(acidPos.x, acidPos.y, 'CH₃COOH', { bg: '#78716c', color: '#fff', border: null, size: 14 });
    }
    // 아세틸기 조각(CH3CO)
    piece(Ax, Oy, 62, 'CH₃CO', '#ea580c');
    if (e4 > 0.2) T(G.byP.x, G.byP.y + 30, '부산물 : 아세트산', 13.5, '#78716c', 'center', 800, { alpha: sm((e4 - 0.2) / 0.5) });
    // 이름표
    const nameA = sm((p - 0.62) / 0.3);
    T(RX, RY + r + 34, '살리실산 C₇H₆O₃', 15, INK, 'center', 900, { alpha: 1 - nameA });
    T(RX, RY + r + 34, '아세틸살리실산(아스피린) C₉H₈O₄', PHONE ? 13.5 : 15, '#9a3412', 'center', 900, { alpha: nameA });
    pill(Ahome + 0, RY - 78 + (PHONE ? -4 : 0), '아세트산 무수물 C₄H₆O₃', { bg: '#fff7ed', color: '#9a3412', border: '#fdba74', size: 13, alpha: 1 - e4, align: 'left' });
    // 카드 (위 자극)
    const K = G.card; panel(K.x, K.y, K.w, K.h, 14);
    if (!PHONE) {
      T(K.x + 16, K.y + 28, '구조 일부가 바뀌었어요', 15.5, '#5b21b6', 'left', 900);
      textBlock(K.x + 16, K.y + 54, K.w - 32, p < 0.6 ? '살리실산(138 g/mol) : 버드나무 껍질의 진통 성분이에요. 위를 크게 자극해요.' : '아스피린(180 g/mol) : –OH가 –O–CO–CH₃로 바뀌어 살리실산보다 위 자극이 줄어든 진통제가 됐어요.', 14, INK, 19, 700);
    } else textBlock(K.x + 14, K.y + 24, K.w - 28, p < 0.6 ? '살리실산(138 g/mol) : 버드나무 껍질의 진통 성분. 위를 크게 자극해요.' : '아스피린(180 g/mol) : –OH가 –O–CO–CH₃로 바뀌어 위 자극이 줄었어요.', 13.5, INK, 18, 700);
    const gx = K.x + 16, gy = PHONE ? K.y + 76 : K.y + 168, gw = K.w - 32;
    T(gx, gy - 8, '위 자극 (질적 비교)', 13.5, MUTED, 'left', 800);
    D.roundRect(gx, gy, gw, 16, 8); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, '#fde68a'); gg.addColorStop(1, '#ef4444');
    D.roundRect(gx, gy, Math.max(16, gw * DR.gauge), 16, 8); ctx.fillStyle = gg; ctx.fill();
    T(gx + gw, gy - 8, DR.gauge > 0.7 ? '큼' : '줄어듦', 13.5, DR.gauge > 0.7 ? BADC : '#166534', 'right', 900);
    if (!PHONE) {
      textBlock(K.x + 16, K.y + 218, K.w - 32, '그래도 아스피린은 위 자극이 완전히 없는 약이 아니에요. 부작용이 있어서 의사 · 약사의 안내를 따라 먹어야 해요.', 13.5, MUTED, 18, 700);
      T(K.x + 16, K.y + 300, '질량 변화 : 138 + 102 → 180 + 60', 13, MUTED, 'left', 700);
    }
    if (!PHONE) { T(K.x + 16, K.y + 280, '분자식 : C₇H₆O₃ + C₄H₆O₃ → C₉H₈O₄ + C₂H₄O₂', 13, INK, 'left', 800); }
    // 하단 정보
    const I = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : INFO; panel(I.x, I.y, I.w, I.h, 14);
    T(I.x + 16, I.y + 26, '살리실산 + 아세트산 무수물 → 아세틸살리실산(아스피린) + 아세트산  (몰비 1 : 1)', PHONE ? 13.5 : 14.5, WARN, 'left', 800);
    let y = I.y + 56;
    y += textBlock(I.x + 16, y, I.w - 32, '넣은 살리실산 2.0 g (몰질량 138 g/mol)', 14.5, INK, 19, 800);
    y += textBlock(I.x + 16, y, I.w - 32, DR.done ? '반응 · 거르기 · 건조 후 얻은 아스피린 2.0 g (몰질량 180 g/mol)' : '반응 후 얻은 아스피린 ? g (“반응 재생”을 끝까지 보세요)', 14.5, DR.done ? '#166534' : MUTED, 19, 800);
    y += 4;
    textBlock(I.x + 16, y, I.w - 32, '수득률 = 실제 얻은 양 / 이론상 얻을 수 있는 양 × 100.  이론상 얻을 수 있는 양은 살리실산의 몰수와 같은 몰수의 아스피린이 모두 생길 때의 질량이에요.', 13.5, MUTED, 18, 700);
  }

  /* ============ ④ 영향 평가 ============ */
  const ESUB = [
    { id: 'asp', ico: '💊', name: '아스피린', rx: '살리실산 + 아세트산 무수물 → 아세틸살리실산(아스피린) + 아세트산' },
    { id: 'pol', ico: '🧴', name: '고분자 (나일론 · PET)', rx: '단위체의 반복 결합 (예: 테레프탈산 + 에틸렌 글라이콜 → PET + 물)' },
    { id: 'flv', ico: '🍌', name: '인공 향료', rx: '카복실산 + 알코올 → 향기 나는 물질 + 물' },
  ];
  const ECARD = {
    asp: [
      ['B', 3, '열과 통증을 줄여 주는 진통 · 해열제'], ['B', 2, '혈액이 굳는 것을 막는 데도 쓰임'], ['B', 2, '공장에서 대량 합성해 값싸게 공급'],
      ['R', 3, '위 자극과 위 출혈 같은 부작용'], ['R', 2, '많이 먹는 오남용의 위험'], ['R', 1, '알레르기를 일으키는 사람도 있음'],
      ['I', 0, '의사 · 약사 안내에 따라 복용하기'], ['I', 0, '위 자극을 줄인 새 제형 연구하기'],
    ],
    pol: [
      ['B', 3, '가볍고 튼튼한 소재를 값싸게 대량 생산'], ['B', 2, '포장 · 병으로 식품을 위생적으로 보관'], ['B', 2, '옷감 · 낙하산 등 다양한 섬유 소재'],
      ['R', 3, '자연에서 거의 분해되지 않는 폐기물'], ['R', 3, '미세 플라스틱이 환경에 퍼짐'], ['R', 2, '원료를 석유에서 얻고 태우면 CO₂ 발생'],
      ['I', 0, '분리배출하고 재활용하기'], ['I', 0, '생분해되는 새 소재 개발하기'],
    ],
    flv: [
      ['B', 2, '식품 · 화장품에 향을 값싸게 넣음'], ['B', 2, '천연 재료를 덜 써서 자원을 아낌'], ['B', 2, '언제나 같은 품질의 향을 공급'],
      ['R', 2, '안전성을 확인하지 않으면 건강 위험'], ['R', 2, '알레르기를 일으키는 사람도 있음'], ['R', 2, '용매와 폐수가 환경에 부담'],
      ['I', 0, '성분 표시와 안전성 검사 강화하기'], ['I', 0, '용매 · 폐수를 정화하고 재사용하기'],
    ],
  };
  const TRAYPOS = [3, 6, 0, 1, 4, 7, 2, 5];
  const EV = { sub: 'asp', cards: {}, drag: null, sel: null, star: { asp: [0, 0, 0], pol: [0, 0, 0], flv: [0, 0, 0] }, pres: { asp: { rx: '', ben: '', imp: '' }, pol: { rx: '', ben: '', imp: '' }, flv: { rx: '', ben: '', imp: '' } }, spring: new SciSim.Spring(0, { stiffness: 55, damping: 6 }), seq: 0, wrong: 0 };
  Object.keys(ECARD).forEach((sk) => { EV.cards[sk] = ECARD[sk].map((q, i) => ({ id: sk + '-' + i, sub: sk, i, k: q[0], w: q[1], t: q[2], loc: '', ord: 0, x: 0, y: 0, lift: 0, shake: 0, bad: false })); });
  const evCards = () => EV.cards[EV.sub];
  const evZone = (z) => evCards().filter((c) => c.loc === z).sort((a, b) => a.ord - b.ord);
  const evCap = { B: 3, R: 3, I: 2 };
  const evGeo = () => PHONE
    ? { cw: 144, ch: 62, zone: { B: { x: 12, y: 136, w: 456, h: 100 }, R: { x: 12, y: 242, w: 456, h: 100 }, I: { x: 12, y: 348, w: 456, h: 100 } },
        slot: (z, n) => { const Z = evGeo().zone[z]; return { x: Z.x + 6 + n * 150, y: Z.y + 30 }; },
        tray: (i) => ({ x: 12 + (i % 2) * 236, y: 488 + Math.floor(i / 2) * 56, w: 228, h: 52 }), trayLab: 478, pivot: { x: 240, y: 88 }, half: 84, prev: { x: 8, y: 704, w: 464, h: 52 } }
    : { cw: 232, ch: 54, zone: { B: { x: 24, y: 62, w: 244, h: 222 }, R: { x: 532, y: 62, w: 244, h: 222 }, I: { x: 276, y: 150, w: 248, h: 140 } },
        slot: (z, n) => { const Z = evGeo().zone[z]; return z === 'I' ? { x: Z.x + 8, y: Z.y + 26 + n * 58 } : { x: Z.x + 6, y: Z.y + 30 + n * 64 }; },
        tray: (i) => ({ x: 24 + (i % 4) * 194, y: 326 + Math.floor(i / 4) * 58, w: 184, h: 54 }), trayLab: 314, pivot: { x: 400, y: 88 }, half: 90, prev: { x: 12, y: 446, w: 776, h: 106 } };
  const evTarget = (c) => { const G = evGeo(); if (!c.loc) { const r = G.tray(TRAYPOS[c.i]); return { x: r.x, y: r.y, w: r.w, h: r.h }; } const n = evZone(c.loc).indexOf(c); const s = G.slot(c.loc, n); return { x: s.x, y: s.y, w: c.loc === 'I' && !PHONE ? 232 : G.cw, h: G.ch }; };
  function evInit() { Object.keys(EV.cards).forEach((sk) => EV.cards[sk].forEach((c) => { const t = evTarget0(c); c.x = t.x; c.y = t.y; })); }
  function evTarget0(c) { const G = evGeo(), r = G.tray(TRAYPOS[c.i]); return { x: r.x, y: r.y }; }
  evInit();
  const evSum = (sk, k) => EV.cards[sk].filter((c) => c.loc === k).reduce((a, c) => a + c.w, 0);
  const evPlacedN = (sk) => EV.cards[sk].filter((c) => c.loc === 'B' || c.loc === 'R').length;
  const evComplete = (sk) => EV.cards[sk].filter((c) => c.loc === 'B').length === 3 && EV.cards[sk].filter((c) => c.loc === 'R').length === 3;
  const evStarsSet = (sk) => EV.star[sk].every((v) => v > 0);
  const evDoneSub = (sk) => evComplete(sk) && evStarsSet(sk);
  const evDoneN = () => ESUB.filter((s) => evDoneSub(s.id)).length;
  const ZNAME = { B: '편익 접시', R: '위험 접시', I: '개선 상자' };
  function evPlace(c, z) {
    if (c.loc === z) return true;
    if (c.k !== z) { c.shake = 0.4; EV.wrong++; Sound.fail(); showHint(z === 'I' ? '이 카드는 개선 아이디어가 아니에요. 이로운 점인지 위험인지 생각해 봐요.' : z === 'B' && c.k === 'R' ? '이 카드는 편익이 아니라 위험(문제점)이에요.' : c.k === 'I' ? '이 카드는 위험이 아니라 개선 아이디어예요.' : '이 카드는 위험이 아니라 이로운 점이에요.', 3000); return false; }
    if (evZone(z).filter((q) => q !== c).length >= evCap[z]) { c.shake = 0.4; Sound.fail(); showHint(ZNAME[z] + '에는 카드를 ' + evCap[z] + '장까지 올릴 수 있어요.', 2600); return false; }
    c.loc = z; c.ord = ++EV.seq; EV.sel = null; Sound.tick(); updateCtl(); return true;
  }
  function evBack(c) { c.loc = ''; updateCtl(); }
  function evSetSub(sk) { if (EV.sub === sk) return; EV.sub = sk; EV.drag = null; EV.sel = null; S.fade = 0.7; evSyncControls(); updateCtl(); }
  function evResetAll() { Object.keys(EV.cards).forEach((sk) => EV.cards[sk].forEach((c) => { c.loc = ''; c.bad = false; })); Object.keys(EV.star).forEach((k) => { EV.star[k] = [0, 0, 0]; EV.pres[k] = { rx: '', ben: '', imp: '' }; }); EV.drag = null; EV.sel = null; EV.wrong = 0; evSyncControls(); updateCtl(); }
  function stepEv(dt) {
    Object.keys(EV.cards).forEach((sk) => EV.cards[sk].forEach((c) => {
      const t = evTarget(c), dragging = EV.drag && EV.drag.c === c;
      if (!dragging) { c.x = ap(c.x, t.x, dt, RM ? 60 : 12); c.y = ap(c.y, t.y, dt, RM ? 60 : 12); }
      c.lift = ap(c.lift, dragging ? 1 : 0, dt, 12); c.shake = Math.max(0, c.shake - dt);
    }));
    const diff = evSum(EV.sub, 'R') - evSum(EV.sub, 'B');
    EV.spring.target = clamp(diff / 8, -1, 1) * 0.22; EV.spring.update(dt);
  }
  function drawEvCard(c) {
    const G = evGeo(), t = evTarget(c), inZone = !!c.loc;
    const w = inZone ? t.w : G.tray(TRAYPOS[c.i]).w, h = t.h;
    const sx = c.shake > 0 ? Math.sin(c.shake * 70) * 4 : 0, sel = EV.sel === c;
    const col = c.k === 'B' ? '#16a34a' : c.k === 'R' ? '#dc2626' : '#2563eb';
    cardBox(c.x + sx, c.y, w, h, { lift: c.lift, stroke: inZone ? col : sel ? PUR : '#cbd5e1', lw: inZone || sel ? 2.6 : 1.6, fill: inZone ? C.rgba(col, 0.08) : '#fff', r: 9 });
    const tw = inZone && c.k !== 'I' ? w - 54 : w - 14;
    textBlock(c.x + sx + 8, c.y + (h > 50 ? 20 : 17), tw, c.t, 13, INK, 16, 800);
    if (inZone && c.k !== 'I') for (let i = 0; i < c.w; i++) { ctx.beginPath(); ctx.arc(c.x + sx + w - 16, c.y + h / 2 - 14 + i * 14 + (3 - c.w) * 7, 5, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
  }
  function drawBalance(t) {
    const G = evGeo(), P = G.pivot, ang = EV.spring.value, hl = G.half, sk = EV.sub;
    // 받침대
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x - 14, P.y + 56); ctx.lineTo(P.x + 14, P.y + 56); ctx.closePath(); ctx.fillStyle = '#94a3b8'; ctx.fill(); }, { blur: 4, y: 2 });
    const L = { x: P.x - Math.cos(ang) * hl, y: P.y - Math.sin(ang) * hl }, R = { x: P.x + Math.cos(ang) * hl, y: P.y + Math.sin(ang) * hl };
    line(L.x, L.y, R.x, R.y, 6, '#64748b');
    ctx.beginPath(); ctx.arc(P.x, P.y, 7, 0, TAU); ctx.fillStyle = '#334155'; ctx.fill();
    [[L, '#16a34a', 'B'], [R, '#dc2626', 'R']].forEach(([E, col, z]) => {
      const py = E.y + 36;
      line(E.x, E.y, E.x - 30, py, 1.6, '#94a3b8'); line(E.x, E.y, E.x + 30, py, 1.6, '#94a3b8');
      D.roundRect(E.x - 36, py, 72, 8, 4); ctx.fillStyle = col; ctx.fill();
      let by = py;
      evZone(z).forEach((c, i) => { const bh = 3 * c.w + 2; by -= bh + 1; D.roundRect(E.x - 14 + (i % 2) * 2, by, 28, bh, 2); ctx.fillStyle = C.rgba(col, 0.75); ctx.fill(); });
    });
    T(P.x - hl - (PHONE ? 6 : 24), P.y - 24, '편익 ' + evSum(sk, 'B'), 14, '#166534', 'right', 900);
    T(P.x + hl + (PHONE ? 6 : 24), P.y - 24, '위험 ' + evSum(sk, 'R'), 14, '#a3262b', 'left', 900);
  }
  function drawEval(t) {
    const G = evGeo(), sk = EV.sub, sub = ESUB.find((s) => s.id === sk);
    T(14, 26, '⚖️ ' + sub.ico + ' ' + sub.name + ' : 이로운 점과 위험을 저울에 올려요', PHONE ? 13 : 17, INK, 'left', 800);
    if (!PHONE) panel(12, 52, 776, 242, 14); else panel(8, 40, 464, 436, 14);
    ['B', 'R', 'I'].forEach((z) => {
      const Z = G.zone[z], col = z === 'B' ? '#16a34a' : z === 'R' ? '#dc2626' : '#2563eb', over = EV.drag && EV.drag.over === z;
      D.roundRect(Z.x, Z.y, Z.w, Z.h, 12); ctx.fillStyle = over ? C.rgba(col, 0.18) : C.rgba(col, 0.06); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = over ? 3.4 : 1.8; ctx.setLineDash(over ? [] : [8, 6]); ctx.stroke(); ctx.setLineDash([]);
      T(Z.x + 12, Z.y + 20, z === 'B' ? '👍 편익 (이로운 점) ' + evZone('B').length + '/3' : z === 'R' ? '⚠️ 위험 (문제점) ' + evZone('R').length + '/3' : '💡 개선 아이디어 ' + evZone('I').length + '/2', 14, col, 'left', 900);
    });
    drawBalance(t);
    panel(PHONE ? 8 : 12, G.trayLab - (PHONE ? 8 : 14) - 6 + (PHONE ? -2 : 0), PHONE ? 464 : 776, PHONE ? 226 : 138, 14, '#faf8ff');
    const left = evCards().filter((c) => !c.loc).length;
    T(PHONE ? 20 : 24, G.trayLab + (PHONE ? 0 : 4), left ? '카드 ' + left + '장 (끌어서 접시나 상자에 놓아요)' : '모든 카드를 놓았어요', 14.5, WARN, 'left', 800);
    evCards().filter((c) => !(EV.drag && EV.drag.c === c)).forEach(drawEvCard);
    if (EV.drag) drawEvCard(EV.drag.c);
    // 발표 카드 미리보기
    const Pv = G.prev, pr = EV.pres[sk], st = EV.star[sk];
    panel(Pv.x, Pv.y, Pv.w, Pv.h, 14);
    const stars = (v) => (v ? '★'.repeat(v) + '☆'.repeat(5 - v) : '—');
    T(Pv.x + 14, Pv.y + 24, '🎤 발표 카드 · ' + sub.ico + ' ' + sub.name, 14.5, '#5b21b6', 'left', 900);
    if (!PHONE) {
      T(Pv.x + Pv.w - 14, Pv.y + 24, '개인 ' + stars(st[0]) + '  사회 ' + stars(st[1]) + '  환경 ' + stars(st[2]), 13.5, '#92400e', 'right', 800);
      const ben = pr.ben ? ecardOf(pr.ben).t : '—', imp = pr.imp ? ecardOf(pr.imp).t : '—', rx = pr.rx ? ESUB.find((q) => q.id === pr.rx).rx : '—';
      textBlock(Pv.x + 14, Pv.y + 50, Pv.w - 28, '반응 : ' + rx, 13.5, INK, 17, 700);
      textBlock(Pv.x + 14, Pv.y + 72, Pv.w - 28, '편익 : ' + ben, 13.5, '#166534', 17, 700);
      textBlock(Pv.x + 14, Pv.y + 92, Pv.w - 28, '개선 : ' + imp, 13.5, '#1d4ed8', 17, 700);
    } else T(Pv.x + 14, Pv.y + 44, '개인 ' + stars(st[0]) + ' 사회 ' + stars(st[1]) + ' 환경 ' + stars(st[2]), 13, '#92400e', 'left', 800);
  }
  const ecardOf = (id) => { const [sk, i] = id.split('-'); return EV.cards[sk][+i]; };
  const evHit = (p) => { const list = evCards().slice().reverse(); return list.find((c) => { const t = { x: c.x, y: c.y }, w = c.loc ? evTarget(c).w : evGeo().tray(TRAYPOS[c.i]).w, h = evGeo().ch; return pointInRect(p, { x: t.x, y: t.y, w, h }); }); };
  const evZoneAt = (p) => { const G = evGeo(); for (const z of ['B', 'R', 'I']) if (pointInRect(p, G.zone[z])) return z; return ''; };
