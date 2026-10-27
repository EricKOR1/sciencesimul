/* 화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 실용 전지의 구조 [12반응02-02]
   ① 조사: 발전 과정 (볼타 → 다니엘 → 납 축전지 → 망가니즈 건전지 → 알칼리 건전지 → 리튬 이온 전지, 문제 → 개선)
   ② 분석: 구조 비교 (단면 색칠, 공통 구조)  ③ 탐구: 효율 탐색 (내부 저항 모형: I = E / (R + r))
   ④ 적용: 전지 분류 (1차 · 2차 전지, 방전 · 충전 전자 흐름)
   개별 전지의 완전한 반쪽 반응식 암기와 연료 전지는 다루지 않아요. 전압은 표준 환원 전위 차(다음 차시)로 계산하지 않고 전극 물질의 조합이 정하는 값으로만 소개해요. */
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
  const RED = '#ef4444', BLUE = '#2563eb', GRAYC = '#94a3b8', GOODC = '#14a058', WARN = '#b45309';
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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const SPL = SciSim.ease;
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;
  const oxs = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + (-n) : '0');
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subs = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };

  /* ---------- 상태 (공통) ---------- */
  const S = { mode: '', sub: {}, gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (typeof onLeave === 'function') onLeave(S.mode); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb && typeof MODE_LABEL !== 'undefined') tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }

  /* ---------- 공통 그림 도구 ---------- */
  const ELC = { H: '#f8fafc', C: '#475569', N: '#3b82f6', O: '#ef4444', Cl: '#16a34a', Na: '#a78bfa', K: '#c084fc', S: '#facc15', Mn: '#a855f7', Cr: '#14b8a6', Fe: '#b45309', Cu: '#d97706', Ag: '#cbd5e1', Zn: '#94a3b8', Ca: '#84cc16', I: '#7c3aed', Mg: '#86efac', Pb: '#64748b', Li: '#f472b6', Co: '#2563eb' };
  function atomBall(x, y, r, el, o) {
    o = o || {};
    const c = ELC[el] || '#94a3b8', dark = el === 'H' || el === 'Ag' || el === 'S' || el === 'Mg';
    D.sphere(x, y, r, c, { text: o.text === undefined ? el : o.text, textColor: dark ? '#334155' : '#fff', textScale: o.ts || (el.length > 1 ? 0.95 : 1.1), outline: dark ? '#94a3b8' : null, outlineWidth: 1.2, gloss: r > 8, shadow: !!o.shadow });
  }
  function eBall(x, y, r) { D.sphere(x, y, r, '#fbbf24', { text: 'e⁻', textColor: '#6b3f00', textScale: 0.95, outline: '#b7791f', outlineWidth: 1, gloss: r > 7 }); }
  function pill(x, y, text, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const s = o.scale == null ? 1 : o.scale; ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 14, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad, align: o.align });
    ctx.restore(); return rc;
  }
  /* 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 */
  function beaker(x, y, w, h, o) {
    o = o || {};
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11;
    const level = clamp(o.level == null ? 0 : o.level, 0, 1), ly = iy + ih * (1 - level);
    const rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    D.shadow(() => { path(x, y, w, h, rad); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    if (level > 0.002) {
      ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, ly, 0, iy + ih);
      const c = o.color || '#9bc8ff'; g.addColorStop(0, C.rgba(c, o.alpha != null ? o.alpha : 0.62)); g.addColorStop(1, C.rgba(C.shade(c, -0.18), Math.min(0.95, (o.alpha != null ? o.alpha : 0.62) + 0.18)));
      ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
      if (o.inside) o.inside({ x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih });
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
    return { x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih, level };
  }
  const r2 = (i) => [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
  /* 액체 안에 갇힌 입자 : 정규화 좌표(u, v)를 현재 액체 영역에 펼쳐 놓아요 (영역 밖으로 나가지 않음) */
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    const mx = Math.min(k, Math.max(0, (x1 - x0) / 2)), my = Math.min(k, Math.max(0, (y1 - y0) / 2));
    return [px + Math.sin(t * 1.3 + i * 1.9) * mx * (px > x0 && px < x1 ? 1 : 0), py + Math.cos(t * 1.1 + i * 2.3) * my * (py > y0 && py < y1 ? 1 : 0)];
  }
  function hexAdd(c1, c2, t) { return C.mix(c1, c2, clamp(t, 0, 1)); }
  /* 숫자 입력칸 도우미 */
  function bindNum(inp, onSet) {
    inp.addEventListener('input', () => onSet(parseNum(inp.value), false));
    inp.addEventListener('change', () => onSet(parseNum(inp.value), true));
  }
  const MODE_LABEL_FALLBACK = {};

  const MODE_LABEL = { timeline: '🕰️ 전지의 발전 과정', compare: '🔬 전지의 구조 비교', explore: '🔦 효율적인 전지 찾기', classify: '🔋 1차 · 2차 전지 분류' };
  const NEGC = '#ef4444', POSC = '#3b82f6', ELEC = '#f59e0b', SEPC = '#22c55e';
  const ROLEC = { neg: NEGC, pos: POSC, ele: ELEC, sep: SEPC };
  const ROLEN = { neg: '(−)극 활물질', pos: '(+)극 활물질', ele: '전해질', sep: '분리막' };
  const fz = (n) => (PHONE ? n - 1 : n);

  Object.assign(S, {
    mode: 'timeline', sub: { classify: 'cycle' },
    tl: { slots: [null, null, null, null, null, null], cards: [], drag: null, sel: null, pairs: { p1: '', p2: '', p3: '' }, shake: 0 },
    cm: { cell: 'mn', brush: '', paint: { mn: {}, pb: {}, li: {} }, sent: { A: '', B: '', C: '', D: '' }, flow: { mn: 0, pb: 0, li: 0 } },
    ex: { pair: 'ZnCu', el: 'brine2', d: 2, size: 'M', rec: [], cond: [], I: 0, V: 0, flow: 0 },
    cf: { sub: 'cycle', bat: 'lead', mode: 'dis', dir: { mn: {}, alk: {}, lead: {}, li: {} }, soc: 0.6, shake: 0, cards: [], drag: null, okAll: false },
  });

  /* ============ ① 발전 과정 ============ */
  const TLC = [
    { id: 'volta', name: '볼타 전지', yl: '1800년', clue: 'Zn판 · Cu판 · 소금물', info: 'Zn판과 Cu판 사이에 소금물을 적신 천을 끼워 쌓은 최초의 화학 전지예요. Cu판 표면에 수소 기포가 생겨(분극) 전압이 곧 떨어졌어요.' },
    { id: 'daniell', name: '다니엘 전지', yl: '1836년', clue: '두 용액을 분리', info: 'Zn–ZnSO₄ 용액과 Cu–CuSO₄ 용액을 나누어 분극 없이 안정된 전압 1.10 V를 오래 냈어요.' },
    { id: 'lead', name: '납 축전지', yl: '1859년', clue: 'Pb · PbO₂ · 묽은 황산', info: '충전해서 다시 쓸 수 있는 2차 전지예요. 셀 하나가 약 2.0 V이고, 6셀을 직렬로 이으면 약 12 V로 자동차 시동에 써요.' },
    { id: 'mn', name: '망가니즈 건전지', yl: '1866년', clue: 'Zn통 · MnO₂ · NH₄Cl 풀', info: '르클랑셰 전지(1866)에서 발전했어요. 전해질을 풀 상태로 만들어 들고 다닐 수 있는 건전지예요 (1.5 V, 1차 전지).' },
    { id: 'alk', name: '알칼리 건전지', yl: '1950년대', clue: 'KOH 전해질', info: '전해질을 KOH로 바꾸어 망가니즈 건전지보다 오래 지속돼요 (1.5 V, 1차 전지).' },
    { id: 'li', name: '리튬 이온 전지', yl: '1991년', clue: '흑연 · 리튬 코발트 산화물', info: '1991년에 상용화됐어요. 분리막과 유기 전해질을 쓰고, 가볍고 에너지를 많이 저장해요 (약 3.7 V, 2차 전지).' },
  ];
  const TLN = TLC.map((c) => c.id);
  const tlName = (id) => TLC.find((c) => c.id === id).name;
  const TL_SHUF = ['li', 'mn', 'volta', 'alk', 'daniell', 'lead'];
  const tlG = () => {
    if (!PHONE) { const gap = 8, sw = (MAIN.w - 24 - 5 * gap) / 6, ch = 118; return { cols: 6, sw, ch, cw: sw - 4, sx: (i) => MAIN.x + 12 + (i % 6) * (sw + gap) + sw / 2, sy: () => MAIN.y + 46 + ch / 2, ty: () => MAIN.y + 216 + ch / 2, tx: (i) => MAIN.x + 12 + (i % 6) * (sw + gap) + sw / 2 }; }
    const gap = 8, sw = (MAIN.w - 24 - 2 * gap) / 3, ch = 78;
    return { cols: 3, sw, ch, cw: sw - 4, sx: (i) => MAIN.x + 12 + (i % 3) * (sw + gap) + sw / 2, sy: (i) => MAIN.y + 50 + Math.floor(i / 3) * (ch + 8) + ch / 2, ty: (i) => MAIN.y + 242 + Math.floor(i / 3) * (ch + 8) + ch / 2, tx: (i) => MAIN.x + 12 + (i % 3) * (sw + gap) + sw / 2 };
  };
  function tlReset() {
    const t = S.tl, G = tlG(); t.slots = [null, null, null, null, null, null]; t.drag = null; t.sel = null;
    t.cards = TL_SHUF.map((id, i) => ({ id, home: i, slot: -1, x: G.tx(i), y: G.ty(i), s: 1 }));
    t.pairs = { p1: '', p2: '', p3: '' }; ['tlP1', 'tlP2', 'tlP3'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
    updateCtl();
  }
  const tlCard = (id) => S.tl.cards.find((c) => c.id === id);
  const tlPlaced = () => S.tl.cards.filter((c) => c.slot >= 0).length;
  const tlRight = () => S.tl.cards.filter((c) => c.slot >= 0 && TLN[c.slot] === c.id).length;
  const tlOrdered = () => tlRight() === 6;
  const pairsOk = () => S.tl.pairs.p1 === 'daniell' && S.tl.pairs.p2 === 'lead' && S.tl.pairs.p3 === 'li';
  function tlTarget(c) { const G = tlG(); return c.slot >= 0 ? { x: G.sx(c.slot), y: G.sy(c.slot) } : { x: G.tx(c.home), y: G.ty(c.home) }; }
  function stepTimeline(dt) {
    const t = S.tl;
    t.cards.forEach((c) => {
      const dg = t.drag && t.drag.c === c;
      if (dg) { c.x = t.drag.x; c.y = t.drag.y; } else { const g = tlTarget(c); c.x = ap(c.x, g.x, dt, 14); c.y = ap(c.y, g.y, dt, 14); }
      c.s = ap(c.s, dg ? 1.1 : 1, dt, 16);
    });
    t.shake = Math.max(0, t.shake - dt);
  }
  function tlIcon(id, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const cyl = (w, h, body, cap, lab) => { D.roundRect(-w / 2, -h / 2, w, h, 5); ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.4; ctx.stroke(); D.roundRect(-w / 4, -h / 2 - 5, w / 2, 7, 2); ctx.fillStyle = cap; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 4, 3, h - 8); if (lab) T(0, 4, lab, 11, '#fff', 'center', 900); };
    if (id === 'volta') { for (let i = 0; i < 4; i++) { D.roundRect(-16, 12 - i * 9, 32, 5, 2); ctx.fillStyle = i % 2 ? '#c8743a' : '#aab4c2'; ctx.fill(); D.roundRect(-14, 7 - i * 9, 28, 3, 1); ctx.fillStyle = '#cbd5e1'; ctx.fill(); } }
    else if (id === 'daniell') { [[-13, '#dbeafe'], [13, '#7bb6e8']].forEach(([dx, c]) => { D.roundRect(dx - 11, -10, 22, 28, 4); ctx.fillStyle = C.rgba(c, 0.85); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.stroke(); }); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, 6); ctx.lineTo(-13, -14); ctx.lineTo(13, -14); ctx.lineTo(13, 6); ctx.stroke(); }
    else if (id === 'lead') { D.roundRect(-22, -12, 44, 28, 4); ctx.fillStyle = '#334155'; ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-16, -17, 7, 6); ctx.fillStyle = '#64748b'; ctx.fillRect(9, -17, 7, 6); T(0, 8, 'Pb', 13, '#fde68a', 'center', 900); }
    else if (id === 'mn') cyl(22, 36, '#475569', '#cbd5e1', 'Mn');
    else if (id === 'alk') cyl(22, 36, '#b45309', '#fbbf24', 'K');
    else cyl(22, 36, '#7c3aed', '#cbd5e1', 'Li');
    ctx.restore();
  }
  function drawTlCard(c, t, mark2) {
    const G = tlG(), d = TLC.find((q) => q.id === c.id), sel = S.tl.sel === c.id, dg = S.tl.drag && S.tl.drag.c === c;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.s, c.s);
    D.shadow(() => { D.roundRect(-G.cw / 2, -G.ch / 2, G.cw, G.ch, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: dg ? 14 : 5, y: dg ? 7 : 2 });
    D.roundRect(-G.cw / 2, -G.ch / 2, G.cw, G.ch, 12); ctx.strokeStyle = mark2 === 'ok' ? '#22c55e' : mark2 === 'bad' ? '#ef4444' : sel ? PUR : '#94a3b8'; ctx.lineWidth = mark2 || sel ? 2.8 : 1.6; ctx.stroke();
    if (!PHONE) { tlIcon(c.id, 0, -G.ch / 2 + 32, 1); T(0, G.ch / 2 - 38, d.name, 14, INK, 'center', 800); textBlock(0, G.ch / 2 - 21, G.cw - 10, d.clue, 12.5, MUTED, 14, 700, 'center'); }
    else { tlIcon(c.id, -G.cw / 2 + 28, 0, 0.9); const nh = textBlock(-G.cw / 2 + 54, -8, G.cw - 60, d.name, 13.5, INK, 15, 800, 'left'); textBlock(-G.cw / 2 + 54, -8 + nh + 3, G.cw - 60, d.yl && TLC.findIndex((q) => q.id === c.id) >= 0 ? d.clue.split(' · ')[0] : '', 12.5, MUTED, 14, 700, 'left'); }
    ctx.restore();
  }
  function drawTimeline(t) {
    const tl = S.tl, G = tlG(), ordered = tlOrdered();
    T(14, 26, '🕰️ 전지 카드를 연대순으로 놓아요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.arrow(MAIN.x + 24, MAIN.y + 32, MAIN.x + MAIN.w - 24, MAIN.y + 32, { color: '#cbd5e1', width: 3, head: 11 });
    T(MAIN.x + 26, MAIN.y + 24, '오래된 전지', 13, MUTED, 'left', 800); T(MAIN.x + MAIN.w - 26, MAIN.y + 24, '최근 전지', 13, MUTED, 'right', 800);
    // 칸
    for (let i = 0; i < 6; i++) {
      const x = G.sx(i), y = G.sy(i);
      D.roundRect(x - G.sw / 2, y - G.ch / 2, G.sw, G.ch, 12); ctx.fillStyle = 'rgba(148,163,184,.1)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
      T(x, y + 6, String(i + 1), 34, '#cbd5e1', 'center', 900);
      if (ordered) { const yr = TLC[i].yl; pill(x, y + G.ch / 2 + (PHONE ? -4 : 14), yr, { bg: '#ede9fe', color: '#5b21b6', border: '#a78bfa', size: 13, alpha: 1 }); }
    }
    T(MAIN.x + MAIN.w / 2, (PHONE ? MAIN.y + 232 : MAIN.y + 207), tlPlaced() < 6 ? '아래 카드를 위 칸으로 끌어 놓아요 (카드를 누르면 조사 자료)' : ordered ? '✅ 연대순이에요! 연도가 나타났어요' : '순서를 다시 살펴보세요 (카드를 누르면 연도를 볼 수 있어요)', 13.5, ordered ? '#166534' : MUTED, 'center', 800);
    // 문제-개선 화살표
    const arcs = [['volta', 'p1', 'daniell', '분극 해결'], ['daniell', 'p2', 'lead', '충전 가능'], ['lead', 'p3', 'li', '가볍고 고에너지']];
    arcs.forEach(([a, pk, b, lab], i) => {
      if (tl.pairs[pk] !== b) return; const ca = tlCard(a), cb = tlCard(b); if (ca.slot < 0 || cb.slot < 0) return;
      const x1 = ca.x, x2 = cb.x, y0 = Math.min(ca.y, cb.y) - G.ch / 2 - 2, h = 18 + i * 8;
      ctx.save(); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y0); ctx.quadraticCurveTo((x1 + x2) / 2, y0 - h * 2, x2, y0); ctx.stroke(); ctx.restore();
      D.arrow(x2 - 6, y0 - 4, x2, y0, { color: '#8b5cf6', width: 3, head: 9 });
      if (!PHONE) pill((x1 + x2) / 2, y0 - h * 1.1 + 2, lab, { bg: '#f5f3ff', color: '#5b21b6', border: '#c4b5fd', size: 12.5 });
    });
    // 카드
    const ord = tl.cards.slice(); if (tl.drag) { const i = ord.indexOf(tl.drag.c); ord.splice(i, 1); ord.push(tl.drag.c); }
    ord.forEach((c) => drawTlCard(c, t, null));
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const sel = tl.sel ? TLC.find((q) => q.id === tl.sel) : null;
    if (sel) {
      T(INFO.x + 16, INFO.y + 28, '📖 조사 자료 · ' + sel.name + ' (' + sel.yl + ')', 15.5, WARN, 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 56, INFO.w - 32, sel.info, 14.5, INK, 21, 700);
    } else {
      T(INFO.x + 16, INFO.y + 28, '📖 조사 자료', 15.5, WARN, 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 56, INFO.w - 32, '전지는 앞 전지의 문제를 해결하면서 발전했어요. 카드를 누르면 만든 해(연도)와 특징이 나와요. 카드를 연대순으로 놓아 보세요.', 14.5, MUTED, 21, 700);
    }
  }
  const tlHit = (p) => { const G = tlG(), ord = S.tl.cards; for (let i = ord.length - 1; i >= 0; i--) { const c = ord[i]; if (Math.abs(p.x - c.x) <= G.cw / 2 && Math.abs(p.y - c.y) <= G.ch / 2) return c; } return null; };
  function tlDrop(c, p) {
    const t = S.tl, G = tlG(); let hit = -1;
    for (let i = 0; i < 6; i++) if (Math.abs(p.x - G.sx(i)) <= G.sw / 2 && Math.abs(p.y - G.sy(i)) <= G.ch / 2 + 6) { hit = i; break; }
    const prev = c.slot;
    if (hit < 0) { c.slot = -1; return; }
    const occ = t.cards.find((q) => q !== c && q.slot === hit);
    if (occ) occ.slot = prev; c.slot = hit; Sound.tick();
  }

  /* ============ ② 구조 비교 ============ */
  const CM = {
    mn: { name: '망가니즈 건전지', regs: [
      { id: 'zn', n: 1, rect: [0, 0, 0.14, 1], role: 'neg', mat: 'Zn 통' },
      { id: 'sep', n: 2, rect: [0.14, 0, 0.05, 1], role: 'sep', mat: '분리막(종이)' },
      { id: 'ele', n: 3, rect: [0.19, 0, 0.26, 1], role: 'ele', mat: 'NH₄Cl 풀' },
      { id: 'mno2', n: 4, rect: [0.45, 0, 0.55, 1], role: 'pos', mat: 'MnO₂ + 탄소 막대' },
    ], negX: 0.07, posX: 0.85 },
    pb: { name: '납 축전지', regs: [
      { id: 'ele', n: 4, rect: [0, 0, 1, 1], role: 'ele', mat: '묽은 황산' },
      { id: 'pb', n: 1, rect: [0.12, 0.1, 0.16, 0.8], role: 'neg', mat: 'Pb 판' },
      { id: 'sep', n: 2, rect: [0.4, 0.1, 0.06, 0.8], role: 'sep', mat: '분리막' },
      { id: 'pbo2', n: 3, rect: [0.58, 0.1, 0.16, 0.8], role: 'pos', mat: 'PbO₂ 판' },
    ], negX: 0.2, posX: 0.66 },
    li: { name: '리튬 이온 전지', regs: [
      { id: 'ele', n: 4, rect: [0, 0, 1, 1], role: 'ele', mat: '유기 전해질' },
      { id: 'gr', n: 1, rect: [0.06, 0.1, 0.28, 0.8], role: 'neg', mat: '흑연' },
      { id: 'sep', n: 2, rect: [0.45, 0.1, 0.06, 0.8], role: 'sep', mat: '분리막' },
      { id: 'lco', n: 3, rect: [0.62, 0.1, 0.3, 0.8], role: 'pos', mat: '리튬 코발트 산화물' },
    ], negX: 0.2, posX: 0.77 },
  };
  const CMK = ['mn', 'pb', 'li'];
  const cmWorks = (k) => CM[k].regs.every((r) => S.cm.paint[k][r.id] === r.role);
  const cmWorksN = () => CMK.filter(cmWorks).length;
  const cmPaintedN = () => CMK.reduce((s, k) => s + CM[k].regs.filter((r) => S.cm.paint[k][r.id]).length, 0);
  const cmG = () => PHONE ? { x: MAIN.x + 16, y: MAIN.y + 118, w: MAIN.w - 32, h: 150 } : { x: MAIN.x + 18, y: MAIN.y + 100, w: 500, h: 196 };
  function cmRect(r, g) { return { x: g.x + r.rect[0] * g.w, y: g.y + r.rect[1] * g.h, w: r.rect[2] * g.w, h: r.rect[3] * g.h }; }
  function cmHit(p) {
    const g = cmG(), regs = CM[S.cm.cell].regs;
    for (let i = regs.length - 1; i >= 0; i--) { const q = cmRect(regs[i], g); const pad = regs[i].rect[2] < 0.08 ? 8 : 0; if (p.x >= q.x - pad && p.x <= q.x + q.w + pad && p.y >= q.y && p.y <= q.y + q.h) return regs[i]; }
    return null;
  }
  function cmTap(p) {
    const r = cmHit(p); if (!r) return;
    const cm = S.cm;
    if (!cm.brush) { showHint('먼저 색칠 도구를 골라요.', 2600); return; }
    cm.paint[cm.cell][r.id] = cm.brush; Sound.tick();
    const g = cmG(), q = cmRect(r, g); flash(q.x + q.w / 2, q.y + q.h / 2, [ROLEC[cm.brush], '#ffffff']); updateCtl();
  }
  function cmSetCell(k) { S.cm.cell = k; updateCtl(); }
  function cmReset() { S.cm.paint = { mn: {}, pb: {}, li: {} }; S.cm.brush = ''; updateCtl(); }
  function stepCompare(dt) { CMK.forEach((k) => { S.cm.flow[k] = ap(S.cm.flow[k], cmWorks(k) ? 1 : 0, dt, 3); }); }
  function drawCmBody(k, g, t) {
    const regs = CM[k].regs, cm = S.cm, fl = cm.flow[k];
    ctx.save(); D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.clip();
    D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.fillStyle = '#f1f5f9'; ctx.fill();
    regs.forEach((r) => {
      const q = cmRect(r, g), role = cm.paint[k][r.id];
      ctx.fillStyle = role ? C.rgba(ROLEC[role], role === 'ele' ? 0.32 : 0.62) : (r.role === 'ele' ? 'rgba(203,213,225,.55)' : '#cbd5e1');
      if (k === 'mn' && r.id === 'mno2' && !role) ctx.fillStyle = '#9aa7b8';
      ctx.fillRect(q.x, q.y, q.w, q.h);
      if (r.id !== 'ele' || k === 'mn') { ctx.strokeStyle = 'rgba(71,85,105,.6)'; ctx.lineWidth = 1.6; ctx.strokeRect(q.x, q.y, q.w, q.h); }
    });
    // 장식
    const mnR = cmRect(regs[3], g), zR = cmRect(regs[0], g);
    if (k === 'mn') { ctx.fillStyle = '#334155'; ctx.fillRect(mnR.x + mnR.w * 0.18, g.y + g.h * 0.4, mnR.w * 0.82, g.h * 0.2); T(mnR.x + mnR.w * 0.62, g.y + g.h * 0.55, '탄소 막대', 13, '#e2e8f0', 'center', 800); }
    if (k !== 'mn') regs.slice(1).forEach((r) => { if (r.id === 'sep') return; const q = cmRect(r, g); ctx.strokeStyle = 'rgba(30,41,59,.18)'; ctx.lineWidth = 1.4; for (let yy = q.y + 8; yy < q.y + q.h; yy += 12) { ctx.beginPath(); ctx.moveTo(q.x, yy); ctx.lineTo(q.x + q.w, yy); ctx.stroke(); } });
    // 이온 흐름 (작동할 때)
    if (fl > 0.02) {
      const ele = CM[k].regs.find((r) => r.role === 'ele'), q = cmRect(ele, g);
      const negX = g.x + g.w * CM[k].negX, posX = g.x + g.w * CM[k].posX;
      for (let i = 0; i < 7; i++) {
        const u = ((i / 7) + t * 0.12) % 1, y = g.y + g.h * (0.18 + 0.64 * ((i * 0.37) % 1));
        const nq = cmRect(regs.find((r) => r.role === 'neg'), g), pq = cmRect(regs.find((r) => r.role === 'pos'), g);
        const xa = k === 'mn' ? q.x + 6 : nq.x + nq.w + 6, xb = k === 'mn' ? q.x + q.w - 6 : pq.x - 6;
        ctx.globalAlpha = fl; D.sphere(xa + (xb - xa) * u, y, 5, '#a855f7', { gloss: false });
        D.sphere(xb - (xb - xa) * u, y + 7, 5, '#f59e0b', { gloss: false }); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    // 번호표
    regs.forEach((r) => {
      const q = cmRect(r, g); let cx = q.x + q.w / 2, cy = q.y + q.h / 2;
      if (r.id === 'ele' && r.rect[2] === 1) { cx = g.x + g.w * (k === 'pb' ? 0.88 : 0.9); cy = g.y + g.h * 0.14; }
      if (k === 'mn' && r.id === 'mno2') { cx = q.x + q.w * 0.5; cy = g.y + g.h * 0.2; }
      const ok = cm.paint[k][r.id] === r.role, painted = !!cm.paint[k][r.id];
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = painted ? (ok ? '#16a34a' : '#ef4444') : '#475569'; ctx.lineWidth = 2.4; ctx.stroke();
      T(cx, cy + 5, String(r.n), 15, INK, 'center', 900);
    });
    D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.stroke();
  }
  function drawCompare(t) {
    const cm = S.cm, k = cm.cell, g = cmG(), works = cmWorks(k), fl = cm.flow[k];
    T(14, 26, '🔬 ' + CM[k].name + ' 단면의 각 부분은 어떤 역할일까요?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 외부 회로
    const nx = g.x + g.w * CM[k].negX, px = g.x + g.w * CM[k].posX, wy = g.y - (PHONE ? 46 : 42);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const bx = (nx + px) / 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y); ctx.lineTo(nx, wy); ctx.lineTo(bx - 17, wy); ctx.moveTo(bx + 17, wy); ctx.lineTo(px, wy); ctx.lineTo(px, g.y); ctx.stroke();
    pill(nx, g.y - 12, '−', { bg: NEGC, color: '#fff', border: null, size: 15, pad: 7 }); pill(px, g.y - 12, '+', { bg: POSC, color: '#fff', border: null, size: 15, pad: 7 });
    const bulbLit = fl * 0.9;
    if (bulbLit > 0.02) D.glow(bx, wy, 20 + 34 * bulbLit, '#fde047', 0.75 * bulbLit);
    ctx.beginPath(); ctx.arc(bx, wy - 2, 14, 0, TAU); ctx.fillStyle = C.mix('#e5e7eb', '#fde68a', bulbLit); ctx.fill(); ctx.strokeStyle = bulbLit > 0.3 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    if (fl > 0.05) { const path = [[nx, g.y], [nx, wy], [px, wy], [px, g.y]]; for (let i = 0; i < 8; i++) { const u = ((i / 8) + t * 0.2) % 1, pt = ptAlongS(path, u); ctx.globalAlpha = fl; eBall(pt.x, pt.y, 5); ctx.globalAlpha = 1; } T(bx, wy - 22, '외부 회로 : 전자 이동', 13, '#b45309', 'center', 800); }
    else T(bx, wy - 22, '외부 회로 (도선 · 전구)', 13, MUTED, 'center', 700);
    drawCmBody(k, g, t);
    // 범례
    const lx = PHONE ? MAIN.x + 16 : MAIN.x + 536, ly = PHONE ? g.y + g.h + 26 : MAIN.y + 56;
    CM[k].regs.slice().sort((a, b) => a.n - b.n).forEach((r, i) => {
      const y = ly + i * (PHONE ? 26 : 46), role = cm.paint[k][r.id];
      ctx.beginPath(); ctx.arc(lx + 12, y - 4, 12, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke(); T(lx + 12, y + 1, String(r.n), 14, INK, 'center', 900);
      T(lx + 30, y + 1, r.mat, 14, INK, 'left', 800);
      if (role) pill(PHONE ? lx + 300 : lx + 30, PHONE ? y - 4 : y + 18, ROLEN[role], { bg: C.mix('#ffffff', ROLEC[role], 0.25), color: '#1e293b', border: ROLEC[role], size: 12.5, pad: 6, align: 'left' });
    });
    if (works) pill(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 20, '✅ 모두 알맞게 칠했어요! 전지가 작동해요', { bg: '#dcfce7', color: '#166534', border: '#4ade80', size: 14 });
    else T(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 14, cm.brush ? '“' + ROLEN[cm.brush] + '” 도구로 단면의 번호 칸을 눌러요' : '색칠 도구를 고른 뒤 번호 칸을 눌러요', 13.5, MUTED, 'center', 700);
    // INFO : 비교 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const rows = [['(−)극 활물질', 'neg'], ['(+)극 활물질', 'pos'], ['전해질', 'ele'], ['분리막', 'sep'], ['외부 회로', 'ext']];
    const c0 = PHONE ? 100 : 140, cwid = (INFO.w - 32 - c0) / 3, rh = PHONE ? 38 : 20.5, y0 = INFO.y + (PHONE ? 30 : 20);
    T(INFO.x + 16, y0, '요소', 13, MUTED, 'left', 800);
    CMK.forEach((kk, ci) => T(INFO.x + 16 + c0 + ci * cwid, y0, PHONE ? CM[kk].name.replace('망가니즈 ', '').replace(' 축전지', '') : CM[kk].name, 13.5, kk === k ? '#5b21b6' : INK, 'left', 800));
    rows.forEach((r, ri) => {
      const y = y0 + (ri + 1) * rh;
      ctx.fillStyle = ri % 2 ? 'rgba(148,163,184,.08)' : 'rgba(148,163,184,.0)'; ctx.fillRect(INFO.x + 10, y - rh * 0.72, INFO.w - 20, rh);
      T(INFO.x + 16, y, r[0], 13.5, r[1] === 'ext' ? MUTED : ROLEC[r[1]] === NEGC ? '#b91c1c' : r[1] === 'pos' ? '#1d4ed8' : r[1] === 'ele' ? '#92400e' : '#166534', 'left', 800);
      CMK.forEach((kk, ci) => {
        let txt = '?', col = '#94a3b8';
        if (r[1] === 'ext') { if (cmWorks(kk)) { txt = '도선 · 전구 (전자 이동)'; col = INK; } }
        else { const reg = CM[kk].regs.find((q) => q.role === r[1]); if (cm.paint[kk][reg.id] === r[1]) { txt = reg.mat; col = INK; } else if (cm.paint[kk][reg.id]) { txt = '✗ 다시'; col = '#dc2626'; } }
        T(INFO.x + 16 + c0 + ci * cwid, y, PHONE && txt.length > 10 ? txt.slice(0, 9) + '…' : txt, 13, col, 'left', 700);
      });
    });
  }
  function ptAlongS(pts, s) {
    let tot = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let d = clamp(s, 0, 1) * tot;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const kk = seg[i] ? d / seg[i] : 0; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * kk, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * kk }; } d -= seg[i]; }
    return { x: pts[0][0], y: pts[0][1] };
  }

  /* ============ ③ 효율 탐색 ============ */
  const PAIRS = { ZnCu: { a: 'Zn', b: 'Cu', E: 1.10, label: 'Zn – Cu' }, MgCu: { a: 'Mg', b: 'Cu', E: 2.71, label: 'Mg – Cu' }, ZnFe: { a: 'Zn', b: 'Fe', E: 0.32, label: 'Zn – Fe' }, FeCu: { a: 'Fe', b: 'Cu', E: 0.78, label: 'Fe – Cu' } };
  const ELS = { dist: { name: '증류수', rho: 400, ions: 1 }, lemon: { name: '레몬즙', rho: 10, ions: 6 }, brine: { name: '소금물', rho: 5, ions: 10 }, brine2: { name: '진한 소금물', rho: 2, ions: 18 } };
  const ELK = ['dist', 'lemon', 'brine', 'brine2'];
  const SIZES = { S: { A: 5, name: '작게' }, M: { A: 10, name: '보통' }, L: { A: 20, name: '크게' } };
  const PCOL = { Zn: '#aab4c2', Mg: '#d6dde6', Cu: '#c8743a', Fe: '#7f8a99' };
  const R_LOAD = 10;
  const exR = () => { const e = S.ex; return ELS[e.el].rho * (e.d / 2) * (10 / SIZES[e.size].A); };
  const exI = () => PAIRS[S.ex.pair].E / (R_LOAD + exR());
  const exV = () => exI() * R_LOAD;
  const rd = (x, n) => Math.round(x * Math.pow(10, n) + 1e-9) / Math.pow(10, n);
  const fI = (x) => rd(x, 3).toFixed(3), fV = (x) => rd(x, 2).toFixed(2), fE = (x) => rd(x, 2).toFixed(2), fR = (x) => (rd(x, 1) % 1 === 0 ? String(rd(x, 0)) : rd(x, 1).toFixed(1));
  const exKey = (r) => [r.pair, r.el, r.d, r.size].join('|');
  function exRecord() {
    const e = S.ex, r = { pair: e.pair, el: e.el, d: e.d, size: e.size, E: PAIRS[e.pair].E, r: exR(), I: exI(), V: exV() };
    if (e.rec.some((q) => exKey(q) === exKey(r))) { showHint('같은 조건은 이미 기록했어요. 조건을 바꿔 보세요.', 2800); return; }
    e.rec.push(r); Sound.tick(); updateCtl();
  }
  const exPairsN = () => new Set(S.ex.rec.map((r) => r.pair)).size;
  const exRN = () => { const m = {}; S.ex.rec.forEach((r) => { (m[r.pair] = m[r.pair] || new Set()).add(rd(r.r, 2)); }); return Math.max.apply(null, Object.keys(m).map((k) => m[k].size).concat([0])); };
  const CONDS = [
    { id: 'c1', t: '전압이 큰 전극 물질의 조합을 골라요', ok: true },
    { id: 'c2', t: '전해질 이온이 많고 두 극이 가까워 내부 저항이 작아요', ok: true },
    { id: 'c3', t: '활물질이 충분해서 오래 쓸 수 있어요', ok: true },
    { id: 'c4', t: '두 극이 직접 닿지 않게 안전하게 분리해요', ok: true },
    { id: 'c5', t: '변하지 않고 안정한 전해질을 써요', ok: true },
    { id: 'c6', t: '두 극 사이를 최대한 멀리 떨어뜨려요', ok: false },
    { id: 'c7', t: '이온이 적은 묽은 전해질을 써요', ok: false },
  ];
  function exCondCheck() {
    const sel = S.ex.cond; const right = sel.filter((id) => CONDS.find((c) => c.id === id).ok).length, wrong = sel.length - right;
    if (right === 5 && wrong === 0) return true;
    if (sel.length < 5) return '조건을 5가지 골라야 해요. 지금은 ' + sel.length + '가지를 골랐어요.';
    return wrong > 0 ? '효율적인 전지의 조건이 아닌 것이 ' + wrong + '개 있어요. 표의 전류가 커지는 방향을 떠올려 보세요 (내부 저항이 작을수록 전류가 커요).' : '조건이 모자라요.';
  }
  function stepExplore(dt) { const e = S.ex; e.I = ap(e.I, exI(), dt, 6); e.V = ap(e.V, exV(), dt, 6); e.flow = ap(e.flow, clamp(exI() / 0.09, 0, 1.6), dt, 4); }
  function dial2(x, y, r, val, max, unit, col, label) {
    ctx.save(); D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.6;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.12 + 0.76 * i / 10); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.78, y + r * 0.2 + Math.sin(a) * r * 0.78); ctx.lineTo(x + Math.cos(a) * r * 0.92, y + r * 0.2 + Math.sin(a) * r * 0.92); ctx.stroke(); }
    const a = Math.PI * (1.12 + 0.76 * clamp(val / max, 0, 1));
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + r * 0.2); ctx.lineTo(x + Math.cos(a) * r * 0.76, y + r * 0.2 + Math.sin(a) * r * 0.76); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y + r * 0.2, 3.4, 0, TAU); ctx.fill(); ctx.restore();
    T(x, y - r * 0.22, label, r * 0.5, '#334155', 'center', 900);
  }
  function drawExplore(t) {
    const e = S.ex, P = PAIRS[e.pair], El = ELS[e.el], A = SIZES[e.size].A, r = exR();
    T(14, 26, '🔦 전극 · 전해질 · 거리를 바꿔 전압과 전류를 재요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 비커 (한 용기) 와 두 판
    const bw = PHONE ? 300 : 316, bh = PHONE ? 120 : 146, bx = MAIN.x + (PHONE ? 82 : 22), by = MAIN.y + (PHONE ? 268 : 160);
    const sep = (e.d / 4) * (bw - 90) * 0.9 + 18, cx = bx + bw / 2;
    const ph = 22 * Math.sqrt(A) * (PHONE ? 0.8 : 0.9), pw = 12;
    const tintC = e.el === 'lemon' ? '#fde68a' : e.el === 'dist' ? '#e0f2fe' : '#bfdbfe';
    const bk = beaker(bx, by, bw, bh, { level: 0.7, color: tintC, alpha: e.el === 'dist' ? 0.3 : 0.5, inside: (g) => { for (let i = 0; i < El.ions; i++) { const p = ballPos(g, i, 5, 2, t); D.sphere(p[0], p[1], 4.4, i % 2 ? '#a855f7' : ANCOL, { gloss: false }); } } });
    const px = [cx - sep / 2, cx + sep / 2], y1 = by + bh - 12, y0 = y1 - ph, up = by - 36;
    [[0, P.a], [1, P.b]].forEach(([i, m]) => {
      const gr = ctx.createLinearGradient(px[i] - pw / 2, 0, px[i] + pw / 2, 0); gr.addColorStop(0, C.shade(PCOL[m], 0.25)); gr.addColorStop(1, C.shade(PCOL[m], -0.3));
      D.shadow(() => { D.roundRect(px[i] - pw / 2, Math.min(y0, up), pw, y1 - Math.min(y0, up), 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
      pill(px[i], by - 54, (i ? '+ ' : '− ') + m, { bg: i ? POSC : NEGC, color: '#fff', border: null, size: 14, pad: 7 });
    });
    // 도선 · 전구
    const wy = by - 100, yw1 = by - 74, xl = cx - 130, xr = cx + 130;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wp = [[px[0], up], [px[0], yw1], [xl, yw1], [xl, wy], [cx - 40, wy]], wq = [[cx + 40, wy], [xr, wy], [xr, yw1], [px[1], yw1], [px[1], up]];
    [wp, wq].forEach((pp) => { ctx.beginPath(); pp.forEach((q, i2) => (i2 ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); });
    const lit = clamp(Math.sqrt(e.I * e.I * R_LOAD / 0.1), 0, 1);
    if (lit > 0.02) D.glow(cx, wy, 22 + 34 * lit, '#fde047', 0.75 * lit);
    ctx.beginPath(); ctx.arc(cx, wy - 2, 14, 0, TAU); ctx.fillStyle = C.mix('#e5e7eb', '#fde68a', lit); ctx.fill(); ctx.strokeStyle = lit > 0.3 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    T(cx, wy - 26, '전구 R = 10 Ω', 13, MUTED, 'center', 800);
    if (e.flow > 0.03) { const path = wp.concat([[cx + 40, wy]], wq.slice(1)); const n = Math.round(6 + 8 * Math.min(1, e.flow)); for (let i = 0; i < n; i++) { const u = ((i / n) + t * 0.2 * e.flow) % 1, pt = ptAlongS(path, u); eBall(pt.x, pt.y, 4.8); } }
    T(cx, by + bh + 22, El.name + ' · 극 사이 ' + e.d + ' cm · 판 ' + SIZES[e.size].name, 13.5, INK, 'center', 800);
    // 계기판
    const dx = PHONE ? MAIN.x + 118 : MAIN.x + 436, dy = PHONE ? MAIN.y + 58 : MAIN.y + 94, dr = PHONE ? 34 : 46, dg = PHONE ? 230 : 196;
    dial2(dx, dy, dr, e.I, 0.25, 'A', '#2563eb', 'A');
    dial2(dx + dg, dy, dr, e.V, 2.5, 'V', '#dc2626', 'V');
    T(dx, dy + dr + 20, '전류 I = ' + fI(exI()) + ' A', 14, '#1d4ed8', 'center', 800);
    T(dx + dg, dy + dr + 20, '전압 V = ' + fV(exV()) + ' V', 14, '#b91c1c', 'center', 800);
    if (PHONE) T(MAIN.x + MAIN.w / 2, dy + dr + 42, 'E ' + fE(P.E) + ' V · r ' + fR(r) + ' Ω · R 10 Ω · I = E / (R + r)', 13, MUTED, 'center', 800);
    // 수치 설명
    const tx = MAIN.x + 380, ty = MAIN.y + 190;
    const lines = [['기전력 E (금속 쌍이 정함)', fE(P.E) + ' V'], ['내부 저항 r (이온 · 거리 · 크기가 정함)', fR(r) + ' Ω'], ['부하 저항 R (전구)', '10 Ω'], ['전류 I = E / (R + r)', fI(exI()) + ' A'], ['단자 전압 V = I × R', fV(exV()) + ' V']];
    if (!PHONE) lines.forEach((l, i) => { const y = ty + i * 26; T(tx, y, l[0], 13.5, i === 3 || i === 4 ? INK : MUTED, 'left', 800); T(MAIN.x + MAIN.w - 18, y, l[1], 14.5, INK, 'right', 800); });
    // INFO : 기록 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '📝 기록 (' + e.rec.length + '개) · 금속 쌍 ' + exPairsN() + '종 · 내부 저항 ' + exRN() + '가지', 14.5, WARN, 'left', 800);
    const shown = e.rec.slice(-(PHONE ? 8 : 5)), rh = PHONE ? 26 : 19, yh = INFO.y + 46;
    const cols = PHONE ? [[16, '금속 쌍'], [96, '전해질'], [196, 'r(Ω)'], [260, 'I(A)'], [340, 'V(V)']] : [[16, '금속 쌍'], [110, '전해질'], [230, '거리'], [300, '크기'], [380, 'E(V)'], [470, 'r(Ω)'], [570, 'I(A)'], [670, 'V(V)']];
    cols.forEach((c) => T(INFO.x + c[0], yh, c[1], 13, MUTED, 'left', 800));
    shown.forEach((r2, i) => {
      const y = yh + (i + 1) * rh, v = PHONE ? [PAIRS[r2.pair].label.replace(/ /g, ''), ELS[r2.el].name, fR(r2.r), fI(r2.I), fV(r2.V)] : [PAIRS[r2.pair].label, ELS[r2.el].name, r2.d + ' cm', SIZES[r2.size].name, fE(r2.E), fR(r2.r), fI(r2.I), fV(r2.V)];
      v.forEach((tx2, ci) => T(INFO.x + cols[ci][0], y, tx2, 13, INK, 'left', 700));
    });
    if (!shown.length) T(INFO.x + 16, yh + 26, '조건을 정하고 “기록하기”를 눌러 표를 채워 보세요.', 14, MUTED, 'left', 700);
  }
  const ANCOL = '#f59e0b';

  /* ============ ④ 전지 분류 ============ */
  const BAT = {
    mn: { name: '망가니즈 건전지', pri: true, col: '#475569', cap: '#cbd5e1', v: '1.5 V', neg: 'Zn', pos: 'MnO₂' },
    alk: { name: '알칼리 건전지', pri: true, col: '#b45309', cap: '#fbbf24', v: '1.5 V', neg: 'Zn', pos: 'MnO₂' },
    lead: { name: '납 축전지', pri: false, col: '#334155', cap: '#94a3b8', v: '약 2.0 V (셀당)', neg: 'Pb', pos: 'PbO₂' },
    li: { name: '리튬 이온 전지', pri: false, col: '#7c3aed', cap: '#cbd5e1', v: '약 3.7 V', neg: '흑연', pos: '리튬 코발트 산화물' },
  };
  const BATK = ['mn', 'alk', 'lead', 'li'];
  const cfDirOf = () => S.cf.dir[S.cf.bat][S.cf.mode] || '';
  const cfBatDone = (k) => !BAT[k].pri && S.cf.dir[k].dis === 'out' && S.cf.dir[k].chg === 'in';
  const cfAnyDone = () => BATK.some(cfBatDone);
  const cfSOK = () => { const b = BAT[S.cf.bat], d = cfDirOf(); return S.cf.mode === 'dis' ? d === 'out' : (!b.pri && d === 'in'); };
  function cfSet(dir) { const c = S.cf; c.dir[c.bat][c.mode] = dir; Sound.click(); updateCtl(); }
  function stepCycle(dt) {
    const c = S.cf, b = BAT[c.bat];
    c.shake = Math.max(0, c.shake - dt);
    if (c.mode === 'dis' && cfDirOf() === 'out') c.soc = Math.max(0.08, c.soc - dt * 0.09);
    else if (c.mode === 'chg' && !b.pri && cfDirOf() === 'in') c.soc = Math.min(1, c.soc + dt * 0.12);
    if (c.mode === 'chg' && b.pri && cfDirOf()) c.shake = Math.max(c.shake, 0.2);
  }
  const USC = [
    { id: 'remote', name: '📺 리모컨', box: 0 }, { id: 'clock', name: '🕒 시계', box: 0 }, { id: 'car', name: '🚗 자동차 시동', box: 1 }, { id: 'phone', name: '📱 스마트폰', box: 2 }, { id: 'ev', name: '🔌 전기 자동차', box: 2 },
  ];
  const USB = ['1차 전지 (망가니즈 · 알칼리 건전지)', '납 축전지', '리튬 이온 전지'];
  const usG = () => PHONE ? { cw: 138, ch: 44, bw: 140, bh: 200, by: MAIN.y + 208, bx: (i) => MAIN.x + 12 + i * 148, tx: (i) => MAIN.x + 12 + (i % 3) * 148 + 69, ty: (i) => MAIN.y + 72 + Math.floor(i / 3) * 56 } : { cw: 150, ch: 46, bw: 244, bh: 168, by: MAIN.y + 160, bx: (i) => MAIN.x + 14 + i * 252, tx: (i) => MAIN.x + 14 + i * 152 + 75 + 6, ty: () => MAIN.y + 78 };
  function usReset() { const G = usG(); S.cf.drag = null; S.cf.okAll = false; S.cf.cards = ['car', 'remote', 'ev', 'clock', 'phone'].map((id, i) => { const u = USC.find((q) => q.id === id); return { id, name: u.name, ans: u.box, box: -1, home: i, x: G.tx(i), y: G.ty(i), s: 1, bad: false, ok: false }; }); updateCtl(); }
  function usTarget(c) {
    const G = usG(); if (c.box < 0) return { x: G.tx(c.home), y: G.ty(c.home) };
    const mates = S.cf.cards.filter((q) => q.box === c.box), idx = mates.indexOf(c), step = Math.min(G.ch + 6, (G.bh - 44) / Math.max(1, mates.length));
    return { x: G.bx(c.box) + G.bw / 2, y: G.by + 40 + G.ch / 2 + idx * step };
  }
  const usPlaced = () => S.cf.cards.filter((c) => c.box >= 0).length;
  const usRight = () => S.cf.cards.filter((c) => c.box === c.ans).length;
  function stepUsage(dt) { S.cf.cards.forEach((c) => { const d = S.cf.drag && S.cf.drag.c === c; if (d) { c.x = S.cf.drag.x; c.y = S.cf.drag.y; } else { const g = usTarget(c); c.x = ap(c.x, g.x, dt, 14); c.y = ap(c.y, g.y, dt, 14); } c.s = ap(c.s, d ? 1.1 : 1, dt, 16); }); }
  const usHit = (p) => { const G = usG(), a = S.cf.cards; for (let i = a.length - 1; i >= 0; i--) { const c = a[i]; if (Math.abs(p.x - c.x) <= G.cw / 2 && Math.abs(p.y - c.y) <= G.ch / 2) return c; } return null; };
  function usDrop(c, p) { const G = usG(); let b = -1; for (let i = 0; i < 3; i++) if (p.x >= G.bx(i) && p.x <= G.bx(i) + G.bw && p.y >= G.by && p.y <= G.by + G.bh) b = i; c.box = b; c.bad = false; c.ok = false; if (b >= 0) Sound.tick(); }
  function usCheck() {
    if (usPlaced() < 5) return '아직 놓지 않은 카드가 있어요. 카드 5장을 모두 전지 상자에 놓아 주세요.';
    const bad = S.cf.cards.filter((c) => c.box !== c.ans);
    S.cf.cards.forEach((c) => { if (c.box === c.ans) { c.ok = true; c.bad = false; } else if (!c.bad) { c.bad = true; c.ok = false; } });
    if (!bad.length) { S.cf.okAll = true; return true; }
    return bad.length + '장이 알맞은 전지가 아니에요 (빨간 카드). 충전이 필요한지, 전지의 크기와 에너지는 얼마나 필요한지 떠올려 보세요.';
  }
  function batBody(x, y, w, h, b, soc, t) {
    D.shadow(() => { D.roundRect(x - w / 2, y - h / 2, w, h, 14); ctx.fillStyle = b.col; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(x - w / 4, y - h / 2 - 12, w / 2, 14, 4); ctx.fillStyle = b.cap; ctx.fill();
    D.roundRect(x - w / 4, y + h / 2 - 2, w / 2, 8, 3); ctx.fillStyle = '#64748b'; ctx.fill();
    const iw = w - 28, ih = h - 40, ix = x - iw / 2, iy = y - h / 2 + 22;
    D.roundRect(ix, iy, iw, ih, 8); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
    const fh = ih * clamp(soc, 0, 1); if (fh > 2) { D.roundRect(ix, iy + ih - fh, iw, fh, 8); ctx.fillStyle = C.mix('#ef4444', '#22c55e', clamp(soc, 0, 1)); ctx.fill(); }
    T(x, iy + ih / 2 + 5, Math.round(soc * 100) + '%', 17, '#fff', 'center', 900, { stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w / 2 + 6, y - h / 2 + 10, 4, h - 20);
  }
  function drawCycle(t) {
    const c = S.cf, b = BAT[c.bat], dir = cfDirOf(), dis = c.mode === 'dis', blocked = !dis && b.pri;
    T(14, 26, '🔋 ' + b.name + ' : ' + (dis ? '방전' : '충전') + ' 때 전자의 방향은?', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const bx = MAIN.x + (PHONE ? 100 : 150), by = MAIN.y + (PHONE ? 214 : 182), bw = PHONE ? 100 : 118, bh = PHONE ? 150 : 140;
    const x1 = MAIN.x + (PHONE ? MAIN.w - 70 : 470), yt = by - bh / 2 - 40, yb = by + bh / 2 + 36;
    const sx = c.shake > 0 ? Math.sin(c.shake * 60) * 4 : 0;
    // 회로
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by - bh / 2 - 12); ctx.lineTo(bx, yt); ctx.lineTo(x1, yt); ctx.lineTo(x1, by - 40); ctx.moveTo(x1, by + 40); ctx.lineTo(x1, yb); ctx.lineTo(bx, yb); ctx.lineTo(bx, by + bh / 2 + 6); ctx.stroke();
    pill(bx + (PHONE ? 30 : 34), by - bh / 2 - 26, '+', { bg: POSC, color: '#fff', border: null, size: 15, pad: 7 }); pill(bx + (PHONE ? 30 : 34), by + bh / 2 + 22, '−', { bg: NEGC, color: '#fff', border: null, size: 15, pad: 7 });
    // 부하
    if (dis) { const lit = dir === 'out' ? 0.85 * clamp(c.soc * 1.6, 0.2, 1) : 0; if (lit > 0.02) D.glow(x1, by, 24 + 30 * lit, '#fde047', 0.7 * lit); ctx.beginPath(); ctx.arc(x1, by, 20, 0, TAU); ctx.fillStyle = C.mix('#e5e7eb', '#fde68a', lit); ctx.fill(); ctx.strokeStyle = lit > 0.3 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 3; ctx.stroke(); T(x1 + 34, by + 5, '전구', 13.5, MUTED, 'left', 800); }
    else { D.shadow(() => { D.roundRect(x1 - 38, by - 40, 76, 80, 10); ctx.fillStyle = '#e0f2fe'; ctx.fill(); }, { blur: 6, y: 2 }); D.roundRect(x1 - 38, by - 40, 76, 80, 10); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2.4; ctx.stroke(); T(x1, by - 8, '충전기', 14, '#075985', 'center', 800); T(x1, by + 12, '(전원 장치)', 12.5, '#075985', 'center', 700); T(x1 - 26, by - 44, '+', 14, POSC, 'center', 900); T(x1 - 26, by + 54, '−', 14, NEGC, 'center', 900); }
    // 전지
    ctx.save(); ctx.translate(sx, 0); batBody(bx, by, bw, bh, b, c.soc, t); ctx.restore();
    pill(MAIN.x + MAIN.w / 2, MAIN.y + 22, b.name + ' · ' + (b.pri ? '1차 전지 (충전 불가)' : '2차 전지 (충전 가능)'), { bg: b.pri ? '#fff7ed' : '#ede9fe', color: b.pri ? '#9a3412' : '#5b21b6', border: b.pri ? '#fdba74' : '#a78bfa', size: 14 });
    T(bx - bw / 2 - 8, by - 6, '(−)극', 13, '#b91c1c', 'right', 800); T(bx - bw / 2 - 8, by + 12, b.neg, 13, MUTED, 'right', 700);
    T(bx + bw / 2 + 8, by - 6, '(+)극', 13, '#1d4ed8', 'left', 800); T(bx + bw / 2 + 8, by + 12, PHONE && b.pos.length > 4 ? '' : b.pos, 13, MUTED, 'left', 700);
    // 전자 이동
    if (dir && !blocked) {
      const path = dir === 'out' ? [[bx, by + bh / 2 + 6], [bx, yb], [x1, yb], [x1, yt], [bx, yt], [bx, by - bh / 2 - 12]] : [[bx, by - bh / 2 - 12], [bx, yt], [x1, yt], [x1, yb], [bx, yb], [bx, by + bh / 2 + 6]];
      const okd = cfSOK(); const sp = okd ? 0.2 : 0.2;
      for (let i = 0; i < 14; i++) { const u = ((i / 14) + t * sp) % 1, pt = ptAlongS(path, u); eBall(pt.x, pt.y, 5.2); }
      T((bx + x1) / 2, yt - 10, dir === 'out' ? '전자 → (−)극에서 나와요' : '전자 → (+)극에서 나와요', 13, '#b45309', 'center', 800);
    }
    // 메시지
    let msg = '', col = MUTED;
    if (blocked) { msg = '⚠ ' + b.name + '은 충전하면 안 돼요 (1차 전지)'; col = '#b91c1c'; }
    else if (!dir) msg = '아래에서 전자의 이동 방향을 골라요';
    else if (!cfSOK()) { msg = dis ? '전자가 반대로 가요. 방전 때 전자는 (−)극에서 나와요.' : '방전과 같은 방향으로는 충전되지 않아요. 외부 전원이 전자를 반대로 밀어야 해요.'; col = '#b91c1c'; }
    else { msg = dis ? '✅ 방전 : (−)극 → 외부 회로 → (+)극 (화학 에너지 → 전기 에너지)' : '✅ 충전 : 방전과 반대 방향 (전기 에너지 → 화학 에너지)'; col = '#166534'; }
    textBlock(MAIN.x + 16, MAIN.y + MAIN.h - (PHONE ? 38 : 30), MAIN.w - 32, msg, 14, col, 19, 800);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const lines = dis ? ['(−)극 활물질은 산화되어 전자를 내놓고, (+)극 활물질은 환원되어 전자를 받아요.', '1차 전지는 방전만 할 수 있고, 2차 전지는 충전해서 다시 쓸 수 있어요.'] : ['충전은 외부 전원으로 방전의 역반응을 일으키는 것이에요. (−)극에서 환원, (+)극에서 산화가 일어나요.', '전기 분해와 같은 원리예요 (다음 차시부터 배워요).'];
    let yy = INFO.y + 26;
    lines.forEach((l) => { yy += textBlock(INFO.x + 16, yy, INFO.w - 32, l, 14, INK, 20, 700) + 6; });
    const st = BATK.map((k) => BAT[k].name.replace(' 건전지', '') + ' ' + (BAT[k].pri ? '1차' : cfBatDone(k) ? '✅' : '2차')).join('  ·  ');
    T(INFO.x + 16, INFO.y + INFO.h - 14, st, PHONE ? 13 : 13.5, MUTED, 'left', 800);
  }
  function drawUsage(t) {
    const c = S.cf, G = usG();
    T(14, 26, '🧩 용도 카드를 알맞은 전지에 연결해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    T(MAIN.x + 16, MAIN.y + 30, '용도 카드 (끌어서 아래 상자에 놓아요)', 13.5, MUTED, 'left', 800);
    for (let i = 0; i < 3; i++) {
      const x = G.bx(i);
      D.roundRect(x, G.by, G.bw, G.bh, 14); ctx.fillStyle = i === 0 ? '#fff7ed' : i === 1 ? '#f1f5f9' : '#f5f3ff'; ctx.fill(); ctx.setLineDash([7, 5]); ctx.strokeStyle = i === 0 ? '#fdba74' : i === 1 ? '#94a3b8' : '#c4b5fd'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      textBlock(x + G.bw / 2, G.by + 20, G.bw - 14, USB[i], 13.5, INK, 17, 800, 'center');
      if (c.drag) { const q = c.drag.x >= x && c.drag.x <= x + G.bw && c.drag.y >= G.by && c.drag.y <= G.by + G.bh; if (q) { D.roundRect(x - 2, G.by - 2, G.bw + 4, G.bh + 4, 15); ctx.strokeStyle = PUR; ctx.lineWidth = 3; ctx.stroke(); } }
    }
    const ord = c.cards.slice(); if (c.drag) { ord.splice(ord.indexOf(c.drag.c), 1); ord.push(c.drag.c); }
    ord.forEach((q) => {
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(q.s, q.s);
      D.shadow(() => { D.roundRect(-G.cw / 2, -G.ch / 2, G.cw, G.ch, 10); ctx.fillStyle = q.ok ? '#dcfce7' : q.bad ? '#fee2e2' : '#fff'; ctx.fill(); }, { blur: q === (c.drag && c.drag.c) ? 12 : 4, y: 2 });
      D.roundRect(-G.cw / 2, -G.ch / 2, G.cw, G.ch, 10); ctx.strokeStyle = q.ok ? '#22c55e' : q.bad ? '#ef4444' : '#94a3b8'; ctx.lineWidth = q.ok || q.bad ? 2.6 : 1.6; ctx.stroke();
      T(0, 6, q.name, PHONE ? 13.5 : 15, INK, 'center', 800);
      ctx.restore();
    });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 28, '어떤 전지가 알맞을까요?', 15, WARN, 'left', 800);
    const tips = ['리모컨 · 시계 : 작은 전류를 오래 쓰고 충전할 일이 거의 없어요 → 1차 전지(건전지)', '자동차 시동 : 짧은 시간에 큰 전류가 필요하고 달리는 동안 충전돼요 → 납 축전지', '스마트폰 · 전기 자동차 : 가볍고 에너지가 크며 반복 충전해요 → 리튬 이온 전지'];
    let yy = INFO.y + 54;
    tips.forEach((l) => { yy += textBlock(INFO.x + 16, yy, INFO.w - 32, l, 13.5, INK, 18, 700) + 5; });
  }

  function onLeave(m) { S.tl.drag = null; S.cf.drag = null; }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'timeline') { const c = tlHit(p); if (!c) { S.tl.sel = null; return false; } S.tl.drag = { c, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; S.tl.cards = S.tl.cards.filter((q) => q !== c).concat(c); Sound.click(); return true; }
      if (S.mode === 'compare') { cmTap(p); return false; }
      if (S.mode === 'classify' && S.sub.classify === 'usage') { const c = usHit(p); if (!c) return false; S.cf.drag = { c, x: p.x, y: p.y }; S.cf.cards = S.cf.cards.filter((q) => q !== c).concat(c); c.box = -1; c.bad = false; c.ok = false; Sound.click(); updateCtl(); return true; }
      return false;
    },
    move(p) {
      const d = S.tl.drag; if (d) { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 7) d.moved = true; return; }
      if (S.cf.drag) { S.cf.drag.x = p.x; S.cf.drag.y = p.y; }
    },
    up(p) {
      const d = S.tl.drag;
      if (d) { S.tl.drag = null; if (!d.moved) { S.tl.sel = d.c.id; return; } tlDrop(d.c, p); S.tl.sel = d.c.id; updateCtl(); return; }
      const u = S.cf.drag; if (u) { S.cf.drag = null; usDrop(u.c, p); updateCtl(); }
    },
    hover(p) {
      if (S.mode === 'timeline') return tlHit(p) ? 'grab' : 'default';
      if (S.mode === 'compare') return cmHit(p) ? 'pointer' : 'default';
      if (S.mode === 'classify' && S.sub.classify === 'usage') return usHit(p) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ---------- 조작 장치 ---------- */
  function fillSel(id, opts, store) { const sel = $('#' + id); sel.innerHTML = ''; opts.forEach(([v, lab]) => { const o = document.createElement('option'); o.value = v; o.textContent = lab; sel.appendChild(o); }); sel.addEventListener('change', () => { store(sel.value); sel.classList.remove('ok', 'bad'); Sound.tick(); updateCtl(); }); }
  const TLOPT = [['', '선택하세요']].concat(TLC.map((c) => [c.id, c.name]));
  fillSel('tlP1', TLOPT, (v) => { S.tl.pairs.p1 = v; }); fillSel('tlP2', TLOPT, (v) => { S.tl.pairs.p2 = v; }); fillSel('tlP3', TLOPT, (v) => { S.tl.pairs.p3 = v; });
  $('#bTlReset').addEventListener('click', () => { Sound.click(); tlReset(); });
  makeChips($('#cmSel'), CMK.map((k) => [k, CM[k].name]), (v) => cmSetCell(v));
  (function () { const host = $('#cmBrush'); ['neg', 'pos', 'ele', 'sep'].forEach((r) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = r; b.textContent = ROLEN[r]; b.style.borderColor = ROLEC[r]; b.addEventListener('click', () => { Sound.click(); S.cm.brush = S.cm.brush === r ? '' : r; updateCtl(); }); host.appendChild(b); }); })();
  $('#bCmReset').addEventListener('click', () => { Sound.click(); cmReset(); });
  const SENT = { snA: ['A', [['', '선택하세요'], ['neg', '(−)극'], ['pos', '(+)극']]], snB: ['B', [['', '선택하세요'], ['neg', '(−)극'], ['pos', '(+)극']]], snC: ['C', [['', '선택하세요'], ['ele', '전해질'], ['sep', '분리막'], ['wire', '도선']]], snD: ['D', [['', '선택하세요'], ['ele', '전해질'], ['sep', '분리막'], ['wire', '도선']]] };
  Object.keys(SENT).forEach((id) => fillSel(id, SENT[id][1], (v) => { S.cm.sent[SENT[id][0]] = v; }));
  const sentOk = () => { const s = S.cm.sent; return s.A === 'neg' && s.B === 'pos' && s.C === 'ele' && s.D === 'sep'; };
  makeChips($('#exPair'), Object.keys(PAIRS).map((k) => [k, PAIRS[k].label]), (v) => { S.ex.pair = v; updateCtl(); });
  makeChips($('#exEl'), ELK.map((k) => [k, ELS[k].name]), (v) => { S.ex.el = v; updateCtl(); });
  makeChips($('#exSize'), Object.keys(SIZES).map((k) => [k, '판 ' + SIZES[k].name]), (v) => { S.ex.size = v; updateCtl(); });
  const exD = $('#exD');
  exD.addEventListener('input', () => { S.ex.d = +exD.value; exD.style.setProperty('--pct', ((S.ex.d - 1) / 3 * 100) + '%'); updateCtl(); });
  $('#exDm').addEventListener('click', () => { Sound.tick(); S.ex.d = Math.max(1, S.ex.d - 1); exD.value = S.ex.d; exD.dispatchEvent(new Event('input')); });
  $('#exDp').addEventListener('click', () => { Sound.tick(); S.ex.d = Math.min(4, S.ex.d + 1); exD.value = S.ex.d; exD.dispatchEvent(new Event('input')); });
  $('#bExRec').addEventListener('click', exRecord); $('#bExClr').addEventListener('click', () => { Sound.click(); S.ex.rec = []; updateCtl(); });
  (function () { const host = $('#condList'); CONDS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = c.id; b.textContent = c.t; b.addEventListener('click', () => { Sound.click(); const i = S.ex.cond.indexOf(c.id); if (i >= 0) S.ex.cond.splice(i, 1); else S.ex.cond.push(c.id); updateCtl(); }); host.appendChild(b); }); })();
  makeChips($('#cfSub'), [['cycle', '🔋 방전 · 충전'], ['usage', '🧩 용도 연결']], (v) => { S.sub.classify = v; S.cf.sub = v; updateCtl(); });
  makeChips($('#cfBat'), BATK.map((k) => [k, BAT[k].name]), (v) => { S.cf.bat = v; S.cf.soc = BAT[v].pri ? 1 : 0.6; updateCtl(); });
  makeChips($('#cfMode'), [['dis', '방전 (전구)'], ['chg', '충전 (충전기)']], (v) => { S.cf.mode = v; updateCtl(); });
  makeChips($('#cfDir'), [['out', '(−)극 → 외부 회로 → (+)극'], ['in', '(+)극 → 외부 회로 → (−)극']], (v) => cfSet(v));
  $('#bUsReset').addEventListener('click', () => { Sound.click(); usReset(); });

  function uiExtra() {
    const tl = S.tl, cm = S.cm, ex = S.ex, cf = S.cf;
    ['tlP1', 'tlP2', 'tlP3'].forEach((id, i) => { const e = $('#' + id); if (e && e.value !== tl.pairs['p' + (i + 1)]) e.value = tl.pairs['p' + (i + 1)]; });
    markChips($('#cmSel'), cm.cell, { mn: cmWorks('mn'), pb: cmWorks('pb'), li: cmWorks('li') });
    $$('#cmBrush button').forEach((b) => { b.classList.toggle('on', b.dataset.v === cm.brush); b.style.background = b.dataset.v === cm.brush ? C.mix('#ffffff', ROLEC[b.dataset.v], 0.3) : '#fff'; });
    markChips($('#exPair'), ex.pair, {}); markChips($('#exEl'), ex.el, {}); markChips($('#exSize'), ex.size, {});
    $('#exDLab').textContent = '↔️ 극 사이 거리 ' + ex.d + ' cm';
    $$('#condList button').forEach((b) => b.classList.toggle('on', ex.cond.indexOf(b.dataset.id) >= 0));
    markChips($('#cfSub'), S.sub.classify || 'cycle', { cycle: cfAnyDone(), usage: S.cf.okAll });
    const dn = {}; BATK.forEach((k) => { dn[k] = cfBatDone(k); }); markChips($('#cfBat'), cf.bat, dn);
    markChips($('#cfMode'), cf.mode, { dis: cf.dir[cf.bat].dis === 'out', chg: cf.dir[cf.bat].chg === 'in' });
    markChips($('#cfDir'), cfDirOf(), {});
    const b = BAT[cf.bat];
    $('#cfNote').textContent = cf.mode === 'chg' && b.pri ? '1차 전지는 충전하면 안 돼요. 충전 단추는 눌러 보기만 해요.' : '방전과 충전을 모두 골라야 해요. 충전은 외부 전원이 전자를 반대로 밀어 주는 거예요.';
  }

  function readouts() {
    const m = S.mode;
    if (m === 'timeline') setRead('놓은 카드', tlPlaced() + ' / 6', '맞는 칸', tlRight() + ' / 6', '문제-개선 연결', ['p1', 'p2', 'p3'].filter((k, i) => S.tl.pairs[k] === ['daniell', 'lead', 'li'][i]).length + ' / 3');
    else if (m === 'compare') { const k = S.cm.cell; setRead('고른 전지', CM[k].name, '맞게 칠한 칸', CM[k].regs.filter((r) => S.cm.paint[k][r.id] === r.role).length + ' / 4', '작동하는 전지', cmWorksN() + ' / 3'); }
    else if (m === 'explore') setRead('전류 I', fI(exI()) + ' A', '단자 전압 V', fV(exV()) + ' V', '내부 저항 r', fR(exR()) + ' Ω');
    else if (S.sub.classify === 'usage') setRead('놓은 카드', usPlaced() + ' / 5', '알맞은 카드', usRight() + ' / 5', '전지 상자', '3 개');
    else { const b = BAT[S.cf.bat]; setRead('전지', b.name, '구분', b.pri ? '1차 전지' : '2차 전지', '충전량', Math.round(S.cf.soc * 100) + ' %'); }
  }

  /* ================= 미션 ================= */
  const markSel = (ids, oks) => ids.forEach((id, i) => { const e = $('#' + id); if (e.value) { e.classList.toggle('ok', oks[i]); e.classList.toggle('bad', !oks[i]); } else e.classList.remove('ok', 'bad'); });
  const levels = [
    {
      title: '발전 과정: 문제를 해결하며 발전한 전지', short: '발전 과정', icon: '🕰️', phase: '조사',
      intro: '<p class="si-q">❓ 탐구 질문: 우리가 쓰는 건전지, 자동차 배터리, 스마트폰 배터리는 모양이 전혀 다른데 속에는 무엇이 같을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 다니엘 전지로 화학 전지의 원리를 배웠어요. 실제로 쓰는 전지는 다니엘 전지에서 어떻게 발전했을까요?</div>' +
        '<p>전지 카드 6장을 만든 해(연도) 순서대로 놓고, 각 전지가 <b>앞 전지의 어떤 문제를 해결했는지</b> 연결해 봐요. 카드를 누르면 조사 자료가 나와요.</p>',
      features: ['timeline'],
      setup() { tlReset(); setScene('timeline'); },
      recap: '전지는 앞 전지의 문제를 해결하며 발전했어요. 볼타 전지의 분극 → 두 용액을 나눈 다니엘 전지, 한 번만 쓰는 전지 → 충전하는 납 축전지, 무거운 납 축전지 → 가볍고 에너지가 큰 리튬 이온 전지예요.',
      summary: '<ul><li>연대순 : 볼타 전지(1800) → 다니엘 전지(1836) → 납 축전지(1859) → 망가니즈 건전지(1866 르클랑셰 전지에서 발전) → 알칼리 건전지(1950년대) → 리튬 이온 전지(1991 상용화)</li><li><b>볼타 전지</b> : Cu판에 수소 기포가 생겨(분극) 전압이 곧 떨어졌어요 → <b>다니엘 전지</b>가 두 용액을 분리해 1.10 V를 안정적으로 냈어요.</li><li>한 번 쓰면 끝인 전지(1차) → 충전해서 다시 쓰는 <b>납 축전지</b>(셀당 약 2.0 V, 6셀 직렬 약 12 V)</li><li>무겁고 에너지를 적게 저장하는 납 축전지 → 가볍고 에너지가 큰 <b>리튬 이온 전지</b>(약 3.7 V)</li></ul>',
      missions: [
        {
          title: '전지 카드를 연대순으로', manual: true,
          goal: '전지 카드 6장을 만든 해(연도) 순서대로 ① ~ ⑥ 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드를 한 번 눌러 조사 자료의 연도를 확인해요. 볼타 전지가 가장 오래됐고 리튬 이온 전지가 가장 최근이에요. 순서가 맞으면 연도가 나타나요.',
          setup() { S.gate = ''; tlReset(); setScene('timeline'); },
          check() { if (tlOrdered()) return true; if (tlPlaced() < 6) return '아직 칸에 놓지 않은 카드가 ' + (6 - tlPlaced()) + '장 있어요.'; return '순서가 아직 달라요 (' + tlRight() + '장이 맞는 칸). 카드를 눌러 조사 자료의 연도를 확인해 보세요.'; },
          status: () => '놓은 카드 ' + tlPlaced() + ' / 6 &nbsp; 맞는 칸 ' + tlRight() + ' / 6',
          explain: '볼타 전지(1800) → 다니엘 전지(1836) → 납 축전지(1859) → 망가니즈 건전지(1866 르클랑셰 전지에서 발전) → 알칼리 건전지(1950년대) → 리튬 이온 전지(1991 상용화) 순서예요.',
        },
        {
          title: '문제와 개선 연결하기', manual: true,
          goal: '앞 전지의 <b>문제</b>를 해결한 전지를 세 가지 모두 골라 연결하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '볼타 전지는 분극 때문에 전압이 떨어졌어요. 다니엘 전지는 용액을 나눴어요. 한 번만 쓰는 전지의 다음 단계, 무거운 납 축전지의 다음 단계를 생각해 보세요.',
          setup() { S.gate = 'pairs'; if (!tlOrdered()) { const G = tlG(); S.tl.cards.forEach((c) => { c.slot = TLN.indexOf(c.id); }); } setScene('timeline'); updateCtl(); },
          check() {
            const p = S.tl.pairs; markSel(['tlP1', 'tlP2', 'tlP3'], [p.p1 === 'daniell', p.p2 === 'lead', p.p3 === 'li']);
            if (!p.p1 || !p.p2 || !p.p3) return '세 칸을 모두 골라 주세요.';
            if (pairsOk()) return true;
            return '빨간 칸이 다시 생각해 볼 연결이에요. ① 분극을 해결한 방법 ② 충전할 수 있는 전지 ③ 가볍고 에너지가 큰 전지를 떠올려 보세요.';
          },
          status: () => '연결 ' + ['p1', 'p2', 'p3'].filter((k, i) => S.tl.pairs[k] === ['daniell', 'lead', 'li'][i]).length + ' / 3',
          explain: '볼타 전지의 <b>분극</b>(Cu판의 수소 기포로 전압 저하) → 두 용액을 나눈 <b>다니엘 전지</b>가 안정된 전압을 냈어요. 한 번 쓰면 끝인 전지 → 충전할 수 있는 <b>납 축전지</b>. 무겁고 에너지가 적은 납 축전지 → 가볍고 에너지가 큰 <b>리튬 이온 전지</b>예요.',
        },
      ],
    },
    {
      title: '구조 비교: 모든 전지의 공통 구조', short: '구조 비교', icon: '🔬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전지가 앞 전지의 문제를 해결하며 발전해 온 것을 봤어요. 겉모양은 다른 전지들의 속은 어떻게 생겼을까요?</div>' +
        '<p>망가니즈 건전지, 납 축전지, 리튬 이온 전지의 <b>단면도</b> 번호 칸을 (−)극 활물질 · (+)극 활물질 · 전해질 · 분리막으로 색칠해 보세요. 모두 맞게 칠하면 전지가 작동하고, 세 전지의 공통 구조가 보여요.</p>',
      features: ['compare'],
      setup() { cmReset(); S.cm.cell = 'mn'; setScene('compare'); },
      recap: '모든 실용 전지는 (−)극 활물질(산화), (+)극 활물질(환원), 이온이 이동하는 전해질, 두 극을 막는 분리막, 전자가 지나가는 외부 회로로 이루어져요. 전자는 외부 회로로, 이온은 전해질로 이동해요.',
      summary: '<ul><li><b>공통 구조</b> : ① (−)극 활물질(산화됨) ② (+)극 활물질(환원됨) ③ <b>전해질</b>(이온 이동 통로) ④ <b>분리막</b>(두 극의 접촉 · 단락 방지) ⑤ 외부 회로(전자 이동)</li><li>망가니즈 건전지 : Zn 통(−) / MnO₂ + 탄소 막대(+) / NH₄Cl 풀</li><li>납 축전지 : Pb(−) / PbO₂(+) / 묽은 황산</li><li>리튬 이온 전지 : 흑연(−) / 리튬 코발트 산화물(+) / 유기 전해질 · 분리막</li><li>전자는 <b>외부 회로</b>로, 이온은 <b>전해질</b>로 이동해 전하 균형을 맞춰요.</li></ul>',
      missions: [
        {
          title: '세 전지 단면 칠하기', manual: true,
          goal: '<b>세 전지</b>의 단면에서 번호 칸 12개를 알맞은 색(역할)으로 칠하고 <b>✔ 확인하기</b>를 누르세요. (전지 고르기 단추로 바꿔요)',
          hint: '색칠 도구를 고르고 번호 칸을 눌러요. 전자를 내놓는(산화) 물질이 (−)극, 전자를 받는(환원) 물질이 (+)극이에요. 이온이 지나는 곳은 전해질, 두 극 사이에 끼워 막아 주는 얇은 막이 분리막이에요.',
          setup() { cmReset(); S.cm.cell = 'mn'; S.gate = ''; setScene('compare'); },
          check() {
            if (cmWorksN() === 3) return true;
            const left = 12 - cmPaintedN();
            if (left > 0) return '아직 칠하지 않은 칸이 ' + left + '개 있어요.';
            const bad = CMK.map((k) => CM[k].name + ' ' + CM[k].regs.filter((r) => S.cm.paint[k][r.id] !== r.role).length).filter((s) => !/ 0$/.test(s));
            return '잘못 칠한 칸이 있어요 (번호가 빨간 칸) : ' + bad.join(', ') + '개';
          },
          status: () => '작동하는 전지 ' + cmWorksN() + ' / 3 &nbsp; 칠한 칸 ' + cmPaintedN() + ' / 12',
          explain: '망가니즈 건전지 : Zn 통 (−), MnO₂ + 탄소 막대 (+), NH₄Cl 풀 전해질, 종이 분리막. 납 축전지 : Pb (−), PbO₂ (+), 묽은 황산, 분리막. 리튬 이온 전지 : 흑연 (−), 리튬 코발트 산화물 (+), 유기 전해질, 분리막. 세 전지의 구조가 같다는 것을 알 수 있어요.',
        },
        {
          title: '공통점 문장 완성하기', manual: true,
          goal: '세 전지의 공통점을 문장으로 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산화되어 전자를 내놓는 쪽이 (−)극이에요. 이온의 통로는 전해질, 두 극이 닿지 않게 막는 것은 분리막이에요.',
          setup() { S.gate = 'sent'; S.cm.sent = { A: '', B: '', C: '', D: '' }; Object.keys(SENT).forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); S.cm.paint = { mn: {}, pb: {}, li: {} }; CM.mn.regs.forEach((r) => { S.cm.paint.mn[r.id] = r.role; }); CM.pb.regs.forEach((r) => { S.cm.paint.pb[r.id] = r.role; }); CM.li.regs.forEach((r) => { S.cm.paint.li[r.id] = r.role; }); setScene('compare'); updateCtl(); },
          check() {
            const s = S.cm.sent; markSel(['snA', 'snB', 'snC', 'snD'], [s.A === 'neg', s.B === 'pos', s.C === 'ele', s.D === 'sep']);
            if (!s.A || !s.B || !s.C || !s.D) return '네 칸을 모두 골라 주세요.';
            if (sentOk()) return true;
            return '빨간 칸을 다시 생각해 보세요. 이온은 전해질로, 전자는 도선으로 이동해요. 두 극을 막는 것은 분리막이에요.';
          },
          status: () => '정답 칸 ' + [S.cm.sent.A === 'neg', S.cm.sent.B === 'pos', S.cm.sent.C === 'ele', S.cm.sent.D === 'sep'].filter(Boolean).length + ' / 4',
          explain: '실용 전지는 <b>(−)극</b> 활물질(산화)과 <b>(+)극</b> 활물질(환원), 이온이 이동하는 <b>전해질</b>, 두 극의 접촉을 막는 <b>분리막</b>, 그리고 전자가 지나가는 외부 회로로 이루어져요.',
        },
        {
          type: 'quiz', title: '전해질이 없으면?',
          goal: '전지에서 <b>전해질이 없으면</b> 전지가 작동하지 않는 까닭은?',
          setup() { S.gate = ''; setScene('compare'); },
          choices: ['이온이 이동해 전하 균형을 맞춰 줄 통로가 없어서 전자가 계속 흐르지 못해요', '전해질이 전자를 직접 날라 주기 때문이에요', '전해질이 없으면 활물질이 산화되기만 하고 환원은 일어나기 때문이에요', '전해질이 없으면 전압이 두 배가 되기 때문이에요'],
          answer: 0,
          feedback: ['', '전자는 외부 회로(도선)로 이동하고, 전해질에서는 이온이 이동해요.', '산화와 환원은 항상 동시에 일어나요. 한쪽만 일어나는 것이 아니에요.', '전해질이 없으면 전압이 커지는 것이 아니라 전지가 작동하지 않아요.'],
          explain: '(−)극에서 전자가 나가면 그쪽 전해질에 양전하가 쌓여요. 전해질 속 <b>이온이 이동</b>해 전하 균형을 맞춰야 전자가 외부 회로로 계속 흐를 수 있어요.',
        },
      ],
    },
    {
      title: '효율 탐색: 효율적인 전지의 조건', short: '효율 탐색', icon: '🔦', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 실용 전지의 공통 구조를 찾았어요. 같은 구조라도 어떤 전지는 전구를 밝게 켜고 어떤 전지는 어둡게 켜요. 무엇이 달라서일까요?</div>' +
        '<p>금속판 쌍 · 전해질 · 극 사이 거리 · 판의 크기를 바꾸며 <b>전압(V)과 전류(I)</b>를 재고 기록해요. 전지 속 저항(<b>내부 저항 r</b>)이 클수록 같은 전지라도 전류가 작아져요. 모의 실험 값이에요.</p>',
      features: ['explore'],
      setup() { S.ex.rec = []; S.ex.pair = 'ZnCu'; S.ex.el = 'brine2'; S.ex.d = 2; S.ex.size = 'M'; exD.value = 2; exD.dispatchEvent(new Event('input')); setScene('explore'); },
      recap: '전압은 전극 물질의 조합이 정하고, 전류의 크기는 내부 저항이 정해요. 전해질 이온이 많고 극 사이가 가까우며 판이 클수록 내부 저항이 작아 전류가 커요. 효율적인 전지는 큰 전압, 작은 내부 저항, 충분한 활물질, 안전한 분리, 안정한 전해질을 갖춰요.',
      summary: '<ul><li>전압(기전력)은 <b>전극 물질의 조합</b>이 정해요 (Zn–Cu 1.10 V, Mg–Cu 2.71 V, Zn–Fe 0.32 V : 이론값, 모의 실험).</li><li>부하 R = 10 Ω 일 때 I = E / (R + r) , V = I × R : r = 2 Ω → 0.092 A, 0.92 V / r = 10 Ω → 0.055 A, 0.55 V / r = 30 Ω → 0.028 A, 0.28 V</li><li><b>내부 저항 r</b>은 전해질 이온이 적거나 두 극 사이가 멀거나 판이 작을수록 커져요.</li><li>효율적인 전지의 조건 : ① 큰 전압의 전극 조합 ② 작은 내부 저항 ③ 충분한 활물질 ④ 안전한 분리 ⑤ 안정한 전해질</li></ul>',
      missions: [
        {
          title: '조건을 바꿔 전압 · 전류 기록하기',
          goal: '<b>금속 쌍 3종류</b>의 전압과 전류를 기록하고, 한 금속 쌍에서 전해질 · 거리 · 크기를 바꿔 <b>내부 저항이 다른 3가지</b> 조건도 기록하세요. (📝 기록하기)',
          hint: '금속 쌍 단추를 바꿔 가며 기록하면 전압(E)이 달라져요. 같은 금속 쌍에서 전해질이나 거리를 바꾸면 내부 저항 r이 달라지고 전류가 변해요.',
          setup() { S.ex.rec = []; S.gate = ''; setScene('explore'); updateCtl(); },
          check: () => exPairsN() >= 3 && exRN() >= 3, hold: 0.6,
          status: () => '금속 쌍 ' + exPairsN() + ' / 3 ' + mark(exPairsN() >= 3) + ' &nbsp; 내부 저항 ' + exRN() + ' / 3 ' + mark(exRN() >= 3),
          explain: '금속 쌍이 달라지면 <b>기전력 E</b>가 달라져요 (Zn–Cu 1.10 V, Mg–Cu 2.71 V, Zn–Fe 0.32 V). 같은 금속 쌍이라도 이온이 적거나 거리가 멀면 <b>내부 저항 r</b>이 커져 I = E / (R + r) 의 전류가 작아지고, 단자 전압 V = I × R 도 낮아져요.',
        },
        {
          title: '효율적인 전지의 조건 고르기', manual: true,
          goal: '조사한 결과를 바탕으로 <b>효율적인 전지의 조건 5가지</b>를 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전류가 크려면 내부 저항이 작아야 해요. 이온이 많은 전해질, 가까운 극 사이, 큰 전압의 전극 조합을 떠올려요. 오래 쓰려면 활물질이 충분해야 해요.',
          setup() { S.gate = 'cards'; S.ex.cond = []; setScene('explore'); updateCtl(); },
          check: () => exCondCheck(),
          status: () => '고른 조건 ' + S.ex.cond.length + ' / 5',
          explain: '효율적인 전지는 ① 큰 전압의 전극 조합 ② 작은 내부 저항(이온이 많은 전해질, 가까운 극) ③ 충분한 활물질 ④ 두 극을 안전하게 분리 ⑤ 안정한 전해질을 갖춰요. 극 사이를 멀리 하거나 묽은 전해질을 쓰면 내부 저항이 커져 전류가 줄어요.',
        },
        {
          type: 'quiz', title: '진한 소금물에서 전류가 큰 까닭',
          goal: '같은 Zn–Cu 전지인데 <b>진한 소금물</b>에서 증류수보다 전류가 훨씬 큰 까닭은?',
          setup() { S.gate = ''; S.ex.pair = 'ZnCu'; setScene('explore'); updateCtl(); },
          choices: ['이온이 많아 내부 저항이 작아져서 같은 전압에서도 전류가 커져요', '진한 소금물에서는 Zn–Cu 쌍의 기전력이 훨씬 커져요', '소금물에서는 전자가 도선 없이 직접 이동해요', '소금이 전구의 저항을 줄여 줘요'],
          answer: 0,
          feedback: ['', '모의 실험에서 기전력 E는 금속 쌍이 정한 값 1.10 V로 같아요. 달라진 것은 내부 저항이에요.', '전자는 여전히 외부 회로(도선)로 이동하고, 전해질에서는 이온이 이동해요.', '전구의 저항 R은 10 Ω으로 그대로예요. 바뀐 것은 전지 속 저항이에요.'],
          explain: '전해질에 <b>이온이 많을수록</b> 이온이 잘 이동해서 전지 속 저항(내부 저항 r)이 작아요. I = E / (R + r) 에서 r이 작아지면 같은 E에서도 전류 I가 커져요.',
        },
      ],
    },
    {
      title: '전지 분류: 1차 전지와 2차 전지', short: '전지 분류', icon: '🔋', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효율적인 전지의 조건을 찾았어요. 그런데 어떤 전지는 한 번 쓰면 버려야 하고 어떤 전지는 충전해서 다시 써요. 그 차이는 무엇일까요?</div>' +
        '<p>충전이 되는 <b>2차 전지</b>에서 방전과 충전 때 전자의 이동 방향을 골라 보고, 충전할 수 없는 <b>1차 전지</b>와 비교해요. 그다음 용도 카드를 알맞은 전지에 연결해요.</p>',
      features: ['classify'],
      setup() { S.sub.classify = 'cycle'; S.cf.sub = 'cycle'; S.cf.bat = 'lead'; S.cf.mode = 'dis'; S.cf.soc = 0.6; BATK.forEach((k) => { S.cf.dir[k] = {}; }); usReset(); setScene('classify'); updateCtl(); },
      recap: '1차 전지(망가니즈 · 알칼리 건전지)는 방전만 할 수 있고, 2차 전지(납 축전지 · 리튬 이온 전지)는 충전해서 다시 쓸 수 있어요. 충전은 외부 전원으로 방전과 반대 방향으로 전자를 보내 역반응을 일으키는 것이에요.',
      summary: '<ul><li><b>1차 전지</b> : 방전만 가능 (망가니즈 · 알칼리 건전지 → 리모컨, 시계) / <b>2차 전지</b> : 충전 가능 (납 축전지 → 자동차 시동, 리튬 이온 전지 → 스마트폰, 전기 자동차)</li><li><b>방전</b> : 전자가 (−)극 → 외부 회로 → (+)극 / <b>충전</b> : 외부 전원이 방전과 <b>반대 방향</b>으로 전자를 보내 역반응을 일으켜요 (전기 분해와 같은 원리).</li><li>1차 전지를 충전하면 방전 반응이 가역적이지 않아 가열 · 액체 누출 · 폭발의 위험이 있어요.</li></ul>',
      missions: [
        {
          title: '방전과 충전의 전자 방향',
          goal: '<b>납 축전지</b> 또는 <b>리튬 이온 전지</b>를 골라 <b>방전</b>과 <b>충전</b> 때 외부 회로에서 전자의 이동 방향을 각각 알맞게 고르세요.',
          hint: '방전은 (−)극 활물질이 산화되어 전자를 내놓는 반응이에요. 충전은 방전과 반대 방향의 반응이므로 전자도 반대로 움직여요. 방전과 충전 단추를 번갈아 눌러 가며 골라요.',
          setup() { S.sub.classify = 'cycle'; S.cf.sub = 'cycle'; S.cf.bat = 'lead'; S.cf.mode = 'dis'; S.cf.soc = 0.6; BATK.forEach((k) => { S.cf.dir[k] = {}; }); setScene('classify'); updateCtl(); },
          check: () => cfAnyDone(), hold: 0.8,
          status: () => '방전 ' + mark(BATK.some((k) => !BAT[k].pri && S.cf.dir[k].dis === 'out')) + ' &nbsp; 충전 ' + mark(BATK.some((k) => !BAT[k].pri && S.cf.dir[k].chg === 'in')),
          explain: '방전 : 전자가 (−)극에서 나와 외부 회로를 지나 (+)극으로 가요. 충전 : 외부 전원이 전자를 (+)극에서 빼내 (−)극으로 밀어 넣어, 방전과 <b>반대 방향</b>으로 역반응을 일으켜요. 그래서 2차 전지는 다시 쓸 수 있어요.',
        },
        {
          title: '용도 카드 연결하기', manual: true,
          goal: '용도 카드 5장을 알맞은 전지 상자에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '충전이 필요 없고 작은 전류를 오래 쓰는 용도는 1차 전지, 큰 전류가 필요한 자동차 시동은 납 축전지, 가볍고 에너지가 큰 전지가 필요한 기기는 리튬 이온 전지예요.',
          setup() { S.sub.classify = 'usage'; S.cf.sub = 'usage'; usReset(); setScene('classify'); updateCtl(); },
          check: () => usCheck(),
          status: () => '놓은 카드 ' + usPlaced() + ' / 5 &nbsp; 알맞은 카드 ' + usRight() + ' / 5',
          explain: '리모컨 · 시계 → <b>1차 전지</b>(건전지), 자동차 시동 → <b>납 축전지</b>, 스마트폰 · 전기 자동차 → <b>리튬 이온 전지</b>예요. 반복해서 충전하고 가볍고 에너지가 커야 하는 기기에는 리튬 이온 전지를 써요.',
        },
        {
          type: 'quiz', title: '1차 전지를 충전하면?',
          goal: '충전할 수 없는 <b>1차 전지를 충전</b>하면 위험한 까닭은?',
          setup() { S.sub.classify = 'cycle'; S.cf.sub = 'cycle'; S.cf.bat = 'mn'; S.cf.mode = 'chg'; S.cf.soc = 1; setScene('classify'); updateCtl(); },
          choices: ['1차 전지는 방전 반응이 되돌려지도록 만들어지지 않아서, 충전하면 엉뚱한 반응으로 열과 기체가 생겨 새거나 터질 수 있어요', '1차 전지는 전자가 없어서 충전이 안 돼요', '충전하면 전압이 3배가 되어 전구가 터져요', '충전하면 전지의 (−)극과 (+)극이 바뀌기 때문이에요'],
          answer: 0,
          feedback: ['', '1차 전지에도 활물질이 있고 방전할 때는 전자가 이동해요. 문제는 역반응이 잘 일어나도록 만들어지지 않았다는 점이에요.', '전압이 커지는 것이 아니라 충전 전류가 원하지 않는 반응을 일으키는 것이 문제예요.', '(−)극과 (+)극은 전지 물질로 정해져서 바뀌지 않아요.'],
          explain: '2차 전지는 방전 반응의 역반응이 잘 일어나도록 만들어져 있어요. 1차 전지는 그렇지 않아서 충전 전류를 흘리면 <b>원하지 않는 반응으로 열과 기체</b>가 생겨 액체가 새거나 터질 수 있어 위험해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-practical-cell', mount: '#game', badge: '전지 탐험가', homeHref: '../../index.html#hr',
    featureLabels: { timeline: '🕰️ 전지 카드 타임라인 · 조사 자료', compare: '🔬 단면 색칠 · 공통 구조 표', explore: '🔦 전압 · 전류 측정 · 기록표', classify: '🔋 방전 · 충전 방향 · 용도 연결' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  tlReset(); usReset();
  setScene('timeline');
  function stepAll1(dt) { stepTimeline(dt); stepCompare(dt); stepExplore(dt); stepCycle(dt); stepUsage(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'timeline') drawTimeline(t); else if (S.mode === 'compare') drawCompare(t); else if (S.mode === 'explore') drawExplore(t); else if (S.sub.classify === 'usage') drawUsage(t); else drawCycle(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, TLC, CM, CMK, PAIRS, ELS, BAT, USC, tlG, cmG, cmRect, usG, tlReset, tlOrdered, tlPlaced, tlRight, pairsOk, cmWorks, cmWorksN, cmSetCell, cmReset, exRecord, exR, exI, exV, exPairsN, exRN, usReset, usPlaced, usRight, cfSet, cfAnyDone, fI, fV,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
