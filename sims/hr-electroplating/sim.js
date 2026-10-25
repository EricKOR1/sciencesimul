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
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && v != null && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;
  const f1 = (v) => r1(v).toFixed(1), f2 = (v) => (Math.round(v * 100 + 1e-9) / 100).toFixed(2);
  const sgn2 = (v) => { const r = Math.round(v * 100 + 1e-9 * Math.sign(v)) / 100; return (r > 0 ? '+' : r < 0 ? MINUS : '') + Math.abs(r).toFixed(2); };
  const oxs = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + (-n) : '0');
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const fz = (n) => (PHONE ? n - 1 : n);

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
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(S.sub[S.mode]) >= 0;
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
  function fillSel(id, opts, store) {
    const sel = $('#' + id); sel.innerHTML = '';
    opts.forEach(([v, lab]) => { const o = document.createElement('option'); o.value = v; o.textContent = lab; sel.appendChild(o); });
    sel.addEventListener('change', () => { store(sel.value); sel.classList.remove('ok', 'bad'); Sound.tick(); updateCtl(); });
  }
  function markSel(ids, oks) { ids.forEach((id, i) => { const e = $('#' + id); if (e.value) { e.classList.toggle('ok', oks[i]); e.classList.toggle('bad', !oks[i]); } else e.classList.remove('ok', 'bad'); }); }
  function clearSel(ids) { ids.forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } }); }
  function bindNum(inp, onSet) {
    inp.addEventListener('input', () => onSet(parseNum(inp.value), false));
    inp.addEventListener('change', () => onSet(parseNum(inp.value), true));
  }
  function markNum(id, ok, ch, v) { const e = $('#' + id); if (!e) return; e.classList.toggle('ok', !!ok); if (ok) e.classList.remove('bad'); else if (ch && !isNaN(v)) e.classList.add('bad'); else if (isNaN(v)) e.classList.remove('bad'); }
  function clearNum(ids) { ids.forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } }); }

  /* ---------- 공통 그림 도구 ---------- */
  function eBall(x, y, r) { D.sphere(x, y, r, '#fbbf24', { text: 'e⁻', textColor: '#6b3f00', textScale: 0.95, outline: '#b7791f', outlineWidth: 1, gloss: r > 7 }); }
  function pill(x, y, text, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const s = o.scale == null ? 1 : o.scale; ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 14, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad });
    ctx.restore(); return rc;
  }
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
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    const mx = Math.min(k, Math.max(0, (x1 - x0) / 2)), my = Math.min(k, Math.max(0, (y1 - y0) / 2));
    return [px + Math.sin(t * 1.3 + i * 1.9) * mx * (px > x0 && px < x1 ? 1 : 0), py + Math.cos(t * 1.1 + i * 2.3) * my * (py > y0 && py < y1 ? 1 : 0)];
  }
  function ptAlong(pts, s) {
    let tot = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let d = clamp(s, 0, 1) * tot;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? d / seg[i] : 0; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k }; } d -= seg[i]; }
    return { x: pts[0][0], y: pts[0][1] };
  }
  function gaugeDial(x, y, r, frac, label, o) {
    o = o || {};
    ctx.save();
    D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4;
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.12 + 0.76 * i / 8), c = Math.cos(a), s2 = Math.sin(a); ctx.beginPath(); ctx.moveTo(x + c * r * 0.76, y + r * 0.12 + s2 * r * 0.76); ctx.lineTo(x + c * r * 0.9, y + r * 0.12 + s2 * r * 0.9); ctx.stroke(); }
    const a = Math.PI * (1.12 + 0.76 * clamp(frac, 0, 1));
    ctx.strokeStyle = o.needle || '#dc2626'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + r * 0.12); ctx.lineTo(x + Math.cos(a) * r * 0.72, y + r * 0.12 + Math.sin(a) * r * 0.72); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y + r * 0.12, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
    T(x, y + r * 0.62, label, 13, INK, 'center', 900);
  }
  function bulbDraw(x, y, lit) {
    if (lit > 0.02) D.glow(x, y, 20 + 36 * lit, '#fde047', 0.75 * lit);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y - 3, 15, 0, TAU); ctx.fillStyle = C.mix('#e5e7eb', '#fde68a', lit); ctx.fill(); ctx.strokeStyle = lit > 0.3 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = lit > 0.3 ? '#b45309' : '#9ca3af'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 5, y + 6); ctx.lineTo(x - 3, y - 4); ctx.lineTo(x, y + 1); ctx.lineTo(x + 3, y - 4); ctx.lineTo(x + 5, y + 6); ctx.stroke();
    D.roundRect(x - 7, y + 10, 14, 8, 2); ctx.fillStyle = '#64748b'; ctx.fill();
    ctx.restore();
  }
  /* 전원 장치 (폭 96) : plusRight 이면 (+) 단자가 오른쪽 */
  function supplyDraw(x, y, label, on, plusRight) {
    ctx.save();
    D.shadow(() => { D.roundRect(x - 48, y - 17, 96, 34, 8); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(x - 26, y - 12, 52, 24, 5); ctx.fillStyle = on ? '#052e16' : '#0f172a'; ctx.fill();
    T(x, y + 5, label, 13, on ? '#4ade80' : '#64748b', 'center', 900);
    [[x - 38, plusRight ? '−' : '+'], [x + 38, plusRight ? '+' : '−']].forEach(([cx, sg]) => {
      ctx.fillStyle = sg === '+' ? '#ef4444' : '#3b82f6'; ctx.beginPath(); ctx.arc(cx, y, 8, 0, TAU); ctx.fill();
      T(cx, y + 5, sg, 14, '#fff', 'center', 900);
    });
    ctx.restore();
  }
  function bubbleUp(list, x, y0, y1, n, t, speed, size, col) {
    for (let i = 0; i < n; i++) {
      const u = ((t * speed + i / n) % 1), by = y0 + (y1 - y0) * u;
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 3 + i * 2.1) * 4 + (i % 3 - 1) * 4, by, size * (0.7 + 0.3 * ((i * 37) % 5) / 5), 0, TAU);
      ctx.fillStyle = col || 'rgba(255,255,255,.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(70,100,140,.5)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  /* ============ 전지 · 전해 장치 공통 그림 ============ */
  const NEGC = '#dc2626', POSC = '#2563eb', ZNC = '#94a3b8', CUC = '#d97706', AGC = '#cbd5e1', ANC = '#f59e0b';
  function cellGeo(R) {
    const res = PHONE ? 60 : 68;
    const bh = Math.min(R.h * 0.44, PHONE ? 128 : 150), bw = Math.min(R.w * 0.34, PHONE ? 112 : 152);
    const top = R.y + R.h - bh - res;
    const cxL = R.x + R.w * 0.26, cxR = R.x + R.w * 0.74;
    const yw = R.y + Math.max(22, R.h * 0.075), gr = clamp(R.h * 0.07, 19, 25), gy = yw + gr + 11;
    const plateTop = top - Math.min(48, R.h * 0.15), apex = top - Math.min(22, R.h * 0.07);
    const pxL = cxL - bw * 0.12, pxR = cxR + bw * 0.12;
    return { R, bh, bw, top, cxL, cxR, plateTop, yw, gx: (pxL + pxR) / 2, gy, gr, apex, bottom: top + bh, floor: top + bh + 4, pxL, pxR, bxL: cxL + bw * 0.28, bxR: cxR - bw * 0.28 };
  }
  /* st: { L:{plate:{c1,c2,thick,pk}|null, sol, solc, sola, cat, an, catc, anc, name, name2, inside(gm,t), after(g,bk,px)}, R:{...}, bridge, wire, flow(0~1), dir(+1: L→R 전자), device(x,y), gaugeFn(g), signs:{L:'+',R:'−'}, imb } */
  function drawCell(R, st, t) {
    const g = cellGeo(R);
    D.roundRect(R.x + 8, g.floor + 1, R.w - 16, 8, 4); ctx.fillStyle = '#cbd5e1'; ctx.fill();
    const info = {};
    [['L', g.cxL, g.pxL], ['R', g.cxR, g.pxR]].forEach(([s, cx, px]) => {
      const q = st[s], x = cx - g.bw / 2, lvl = q.sol ? (q.lvl == null ? 0.62 : q.lvl) : 0;
      const bk = beaker(x, g.top, g.bw, g.bh, { level: lvl, color: q.solc || '#dbeafe', alpha: q.sola != null ? q.sola : 0.32, inside: (gm) => {
        const nc = q.cat || 0, na = q.an || 0, jig = 2;
        for (let i = 0; i < na; i++) { const p = ballPos(gm, i + 40, 5, jig, t); D.sphere(p[0], p[1], 4.6, q.anc || ANC, { gloss: false }); }
        for (let i = 0; i < nc; i++) { const p = ballPos(gm, i, 5.5, jig, t); D.sphere(p[0], p[1], 5.4, q.catc || ZNC, { gloss: false, outline: 'rgba(255,255,255,.6)', outlineWidth: 1 }); }
        if (q.inside) q.inside(gm, t);
      } });
      info[s] = bk;
      const pl = q.plate;
      if (pl) {
        const thick = pl.thick == null ? 1 : pl.thick, pk = pl.pk == null ? 1 : pl.pk, pw = clamp(22 * thick, 4, 36);
        const y0 = g.plateTop + (1 - pk) * -30, y1 = g.top + g.bh - 14;
        ctx.save(); ctx.globalAlpha = Math.min(1, pk * 1.4);
        const gr = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0); gr.addColorStop(0, C.shade(pl.c1, 0.25)); gr.addColorStop(0.5, pl.c1); gr.addColorStop(1, pl.c2);
        D.shadow(() => { D.roundRect(px - pw / 2, y0, pw, y1 - y0, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
        if (pl.deposit) { const dy = Math.max(y0, bk.ly); ctx.fillStyle = C.rgba(pl.depc || '#b45f2a', Math.min(1, pl.deposit)); ctx.fillRect(px - pw / 2 - 1, dy, pw + 2, y1 - dy); }
        ctx.restore();
        if (q.after) q.after(g, bk, px, y0, y1, t);
        if (st.signs && st.signs[s]) { const ng = st.signs[s] === '−'; pill(px, y0 - 14, st.signs[s], { bg: ng ? NEGC : POSC, color: '#fff', border: null, size: 15, pad: 7 }); }
      }
      T(cx, g.floor + 28, q.name || '', fz(14), INK, 'center', 800);
      if (q.name2) T(cx, g.floor + 46, q.name2, fz(13), MUTED, 'center', 700);
    });
    // 염다리
    if (st.bridge > 0.01) {
      const yi = g.top + g.bh * 0.58, k = st.bridge, off = -(1 - k) * 46;
      const pts = [[g.bxL, yi], [g.bxL, g.apex], [g.bxR, g.apex], [g.bxR, yi]];
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.6); ctx.translate(0, off); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(100,116,139,.85)'; ctx.lineWidth = 15; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 10; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (st.flow > 0.05) {
        const n = 4; for (let i = 0; i < n; i++) {
          const u = ((i / n) + t * 0.18 * st.flow) % 1, p1 = ptAlong(pts, u), p2 = ptAlong(pts, 1 - u);
          D.sphere(p1.x, p1.y, 4.4, st.bridgeA || '#a855f7', { gloss: false }); D.sphere(p2.x, p2.y, 4.4, st.bridgeB || ANC, { gloss: false });
        }
      }
      ctx.restore();
      if (st.bridge > 0.9 && st.bridgeLabel !== '') T((g.bxL + g.bxR) / 2, g.apex + 30, st.bridgeLabel || '염다리 (KNO₃)', 13, MUTED, 'center', 800);
    }
    // 도선 · 장치 · 계기
    if (st.wire > 0.01) {
      const k = st.wire, pL = [g.pxL, g.plateTop], pR = [g.pxR, g.plateTop];
      const wp = [[pL[0], pL[1]], [pL[0], g.yw], [pR[0], g.yw], [pR[0], pR[1]]];
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const xb = st.deviceX != null ? st.deviceX : pL[0] + (pR[0] - pL[0]) * 0.26, hw = st.deviceHalf || 17;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pL[0], pL[1]); ctx.lineTo(pL[0], g.yw); ctx.lineTo(xb - hw, g.yw); ctx.moveTo(xb + hw, g.yw); ctx.lineTo(pR[0], g.yw); ctx.lineTo(pR[0], pR[1]); ctx.stroke();
      if (!st.noGauge) {
        ctx.lineWidth = 2; ctx.strokeStyle = '#64748b';
        ctx.beginPath(); ctx.moveTo(pL[0], g.gy); ctx.lineTo(g.gx - g.gr, g.gy); ctx.moveTo(g.gx + g.gr, g.gy); ctx.lineTo(pR[0], g.gy); ctx.stroke();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(pL[0], g.gy, 3.2, 0, TAU); ctx.arc(pR[0], g.gy, 3.2, 0, TAU); ctx.fill();
      }
      if (st.device) st.device(xb, g.yw, g); else bulbDraw(xb, g.yw, st.lit || 0);
      if (!st.noGauge) { if (st.gaugeFn) st.gaugeFn(g); else gaugeDial(g.gx, g.gy, g.gr, (st.V || 0) / (st.vmax || 1.6), st.gaugeLabel != null ? st.gaugeLabel : (st.V || 0).toFixed(2) + ' V'); }
      const dir = st.dir == null ? 1 : st.dir, a = dir >= 0 ? wp : wp.slice().reverse();
      if (st.flow > 0.03) {
        const N = 9;
        for (let i = 0; i < N; i++) { const u = ((i / N) + t * 0.22 * st.flow) % 1, p = ptAlong(a, u); ctx.globalAlpha = Math.min(1, k * 1.5) * Math.min(1, st.flow * 1.6); eBall(p.x, p.y, 5.2); }
      }
      ctx.restore();
      if (st.flow > 0.1 && st.showDir) {
        const dirx = dir >= 0 ? 1 : -1, ax = (g.pxL + g.pxR) / 2;
        D.arrow(ax - dirx * 20, g.yw - 18, ax + dirx * 20, g.yw - 18, { color: '#b45309', width: 3, head: 9 });
        T(ax, g.yw - 26, '전자의 이동', 13, '#b45309', 'center', 800);
      }
    }
    return g;
  }

  /* ================================================================
     화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 도금과 산업 전기 분해 [12반응02-04]
     ① 실험: 도금 실험 (부품 조립, 열쇠를 (−)극에)  ② 분석: 석출 분석 (전류 · 시간 − 석출 질량, 전자 몰수)
     ③ 조사: 산업 조사 (구리 정련 · 알루미늄 제련 · 염소 · 도금 사례 카드)  ④ 적용: 발표 · 평가 (발표 카드, 동료 평가 루브릭)
     전기량(쿨롱) 계산과 패러데이 상수는 쓰지 않고, 실험 데이터의 비례 관계와 전자 몰수의 비(Cu 1 mol : 전자 2 mol)만 써요.
     ================================================================ */
  const MODE_LABEL = { plate: '🧪 도금 실험', analysis: '📈 석출 분석', industry: '🏭 산업 조사', present: '🎤 발표 · 평가' };
  const COPC = ['#e0955a', '#8f4b1e'], IRNC = ['#b4bac4', '#5f6670'];
  const M_CU = 63.5;
  const RATE = 0.02;                      // g / (A · min) : 0.50 A, 5 분 → 0.05 g
  const massCu = (I, t) => Math.round(I * t * RATE * 1000) / 1000;

  Object.assign(S, {
    mode: 'plate', sub: { present: 'own' },
    pl: { on: {}, k: {}, slot: { L: null, R: null }, sel: null, drag: null, shake: 0, run: false, pc: 0, pd: 0, cuk: 0, I: 0, eq: { a: '', b: '', c: '' }, wrongSeen: false, flow: 0 },
    an: { I: 0.5, t: 0, ts: 0, pts: {}, rel: '', mc: NaN, me: NaN, mcOk: false },
    ind: { k: 'refine', p: 0, viewed: {}, sel: { a: '', b: '', c: '', d: '', e: '', f: '', g: '', h: '' } },
    pr: { k: '', f: {}, ownOk: false, cur: 0, r: [{}, {}, {}], cardPick: 0 },
  });

  /* ============ 공통 : 열쇠 · 구리판 ============ */
  /* 열쇠 : (x, y0) 위쪽 고리 중심 위쪽, yb 아래 끝, dis 녹은 정도, coat 구리 입힌 정도, ly 액면 */
  function drawKey(x, y0, yb, dis, coat, ly) {
    const sw = 12 * (1 - 0.5 * dis), ty = y0 + 26;
    const shape = (g, extra) => {
      ctx.beginPath(); ctx.rect(x - sw / 2 - g, ty - g * 0, sw + 2 * g, yb - ty);
      ctx.rect(x + sw / 2 - 1, yb - 30 * (1 - 0.5 * dis), 11 * (1 - 0.3 * dis) + g, 8 * (1 - 0.3 * dis));
      ctx.rect(x + sw / 2 - 1, yb - 14 * (1 - 0.5 * dis), 11 * (1 - 0.3 * dis) + g, 8 * (1 - 0.3 * dis));
    };
    ctx.save();
    // 고리
    ctx.beginPath(); ctx.arc(x, y0 + 13, 13, 0, TAU); ctx.arc(x, y0 + 13, 6, 0, TAU, true); ctx.fillStyle = '#8a929e'; ctx.fill('evenodd'); ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1.4; ctx.stroke();
    const gr = ctx.createLinearGradient(x - sw / 2, 0, x + sw / 2 + 11, 0); gr.addColorStop(0, '#d5dae2'); gr.addColorStop(0.5, '#a1a9b5'); gr.addColorStop(1, '#6b7280');
    D.shadow(() => { shape(0); ctx.fillStyle = gr; ctx.fill(); }, { blur: 3, y: 2 });
    if (coat > 0.005) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 40, ly, 100, yb - ly + 6); ctx.clip();
      shape(3.2 * coat); ctx.fillStyle = C.rgba('#c9692f', Math.min(1, coat * 1.3)); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  function drawCuPlate(x, y0, yb, thick, coat, ly) {
    const w = 24 * thick + 7 * coat;
    ctx.save();
    const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, C.shade(COPC[0], 0.25)); gr.addColorStop(0.5, COPC[0]); gr.addColorStop(1, COPC[1]);
    D.shadow(() => { D.roundRect(x - w / 2, y0, w, yb - y0, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.restore();
  }

  /* ============ ① 도금 실험 ============ */
  const PL = [
    { id: 'sol', name: 'CuSO₄', sub: '수용액' }, { id: 'cu', name: '구리판', sub: '' },
    { id: 'key', name: '철 열쇠', sub: '' }, { id: 'pwr', name: '전원 · 전류계', sub: '' },
  ];
  PL.forEach((p) => { S.pl.on[p.id] = false; S.pl.k[p.id] = 0; });
  const plOn = (id) => !!S.pl.on[id];
  const plN = () => PL.filter((p) => plOn(p.id)).length;
  const plG = () => {
    const bw = PHONE ? 340 : 300, bh = PHONE ? 170 : 160, bx = MAIN.x + (PHONE ? (MAIN.w - 340) / 2 : 70), by = MAIN.y + (PHONE ? 190 : 122);
    const ix = bx + 5, iw = bw - 10, iy = by + 5, ih = bh - 11, level = 0.7, ly = iy + ih * (1 - level), bottom = iy + ih;
    const sx = bx + bw / 2, sy = MAIN.y + (PHONE ? 34 : 32);
    const xL = bx + bw * 0.2, xR = bx + bw * 0.8, yTop = by - (PHONE ? 70 : 52), yBot = bottom - 14;
    return { bx, by, bw, bh, ix, iw, iy, ih, ly, bottom, sx, sy, xL, xR, yTop, yBot };
  };
  const plCath = () => S.pl.slot.L, plAnod = () => S.pl.slot.R;
  const plMode = () => { const p = S.pl, c = plCath(), a = plAnod(); if (!plOn('sol') || !plOn('pwr') || !c || !a) return 'none'; return c === 'key' && a === 'cu' ? 'good' : c === 'cu' && a === 'key' ? 'bad' : 'none'; };
  function plReset() {
    const p = S.pl; PL.forEach((q) => { p.on[q.id] = false; p.k[q.id] = 0; }); p.slot = { L: null, R: null }; p.sel = null; p.drag = null; p.run = false; p.pc = 0; p.pd = 0; p.cuk = 0; p.I = 0; p.flow = 0; p.wrongSeen = false;
    parts.clear(); updateCtl();
  }
  function plPlace(id, side) {
    const p = S.pl; if (plOn(id)) return;
    if (id === 'cu' || id === 'key') { if (!side) side = !p.slot.L ? 'L' : 'R'; if (p.slot[side]) { showHint('그 자리에는 이미 ' + (p.slot[side] === 'cu' ? '구리판' : '철 열쇠') + '이(가) 있어요. 먼저 빼 주세요 (끌어서 꺼내요).', 3400); p.shake = 0.35; return; } p.slot[side] = id; }
    p.on[id] = true; p.k[id] = 0; p.sel = null; Sound.tick(); const g = plG(); flash(id === 'cu' || id === 'key' ? (side === 'L' ? g.xL : g.xR) : (id === 'pwr' ? g.sx : g.bx + g.bw / 2), id === 'pwr' ? g.sy : g.by + g.bh * 0.5, ['#14a058', '#fbbf24', '#8b5cf6']); updateCtl();
  }
  function plRemove(id) { const p = S.pl; if (!plOn(id)) return; p.on[id] = false; p.pd = 0; if (id === 'key') { p.pc = 0; p.cuk = 0; } if (p.slot.L === id) p.slot.L = null; if (p.slot.R === id) p.slot.R = null; if (p.run) { p.run = false; } updateCtl(); }
  function plPower() { const p = S.pl; if (!(plOn('sol') && plOn('pwr') && p.slot.L && p.slot.R)) { showHint('용액 · 두 전극 · 전원 장치를 모두 놓아야 해요.', 3200); return; } p.run = !p.run; Sound.click(); updateCtl(); }
  function stepPlate(dt) {
    const p = S.pl; if (S.mode !== 'plate') return;
    PL.forEach((q) => { p.k[q.id] = ap(p.k[q.id], p.on[q.id] ? 1 : 0, dt, 5); if (Math.abs(p.k[q.id] - (p.on[q.id] ? 1 : 0)) < 0.004) p.k[q.id] = p.on[q.id] ? 1 : 0; });
    p.shake = Math.max(0, p.shake - dt);
    const md = plMode(), go = p.run && md !== 'none';
    p.I = ap(p.I, go ? 0.5 : 0, dt, 5); if (Math.abs(p.I - (go ? 0.5 : 0)) < 0.003) p.I = go ? 0.5 : 0;
    p.flow = ap(p.flow, go ? 1 : 0, dt, 3);
    if (go && md === 'good') { p.pc = Math.min(1, p.pc + dt / 9); p.cuk = p.pc; }
    if (go && md === 'bad') { p.pd = Math.min(1, p.pd + dt / 8); if (p.pd > 0.2) p.wrongSeen = true; }
  }
  const plTrayG = (i) => {
    const cols = PHONE ? 2 : 4, rows = PHONE ? 2 : 1, cw = (INFO.w - 24 - (cols - 1) * 8) / cols, ch = PHONE ? 104 : 100, c = i % cols, r = Math.floor(i / cols);
    return { x: INFO.x + 12 + c * (cw + 8) + cw / 2, y: INFO.y + 38 + r * (ch + 8) + ch / 2, w: cw, h: ch };
  };
  function plIcon(id, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 'sol') { ctx.strokeStyle = '#7b93b3'; ctx.lineWidth = 2.4; ctx.fillStyle = C.rgba('#3b9be0', 0.65); D.roundRect(-18, -16, 36, 40, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-16, -16, 32, 3); }
    else if (id === 'cu') { const gr = ctx.createLinearGradient(-10, 0, 10, 0); gr.addColorStop(0, '#f1b27c'); gr.addColorStop(1, COPC[1]); D.roundRect(-10, -26, 20, 52, 3); ctx.fillStyle = gr; ctx.fill(); }
    else if (id === 'key') { ctx.beginPath(); ctx.arc(0, -17, 9, 0, TAU); ctx.arc(0, -17, 4, 0, TAU, true); ctx.fillStyle = '#8a929e'; ctx.fill('evenodd'); ctx.fillStyle = '#9aa2ae'; ctx.fillRect(-3.5, -9, 7, 34); ctx.fillRect(3, 9, 8, 5); ctx.fillRect(3, 17, 8, 5); }
    else { D.roundRect(-26, -14, 52, 30, 7); ctx.fillStyle = '#334155'; ctx.fill(); D.roundRect(-16, -9, 32, 18, 4); ctx.fillStyle = '#052e16'; ctx.fill(); T(0, 5, '0.50A', 12, '#4ade80', 'center', 900); }
    ctx.restore();
  }
  function plCard(i, x, y, lift, ghost, sel) {
    const p = PL[i], g = plTrayG(i);
    ctx.save(); ctx.translate(x, y); const sc = lift ? 1.1 : 1; ctx.scale(sc, sc); if (ghost) ctx.globalAlpha = 0.35;
    D.shadow(() => { D.roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: lift ? 14 : 5, y: lift ? 7 : 2 });
    D.roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 12); ctx.strokeStyle = lift || sel ? PUR : '#94a3b8'; ctx.lineWidth = lift || sel ? 2.8 : 1.6; ctx.stroke();
    plIcon(p.id, 0, -14, PHONE ? 0.8 : 0.82);
    T(0, g.h / 2 - 22, p.name, fz(14), INK, 'center', 800); if (p.sub) T(0, g.h / 2 - 7, p.sub, 13, MUTED, 'center', 700);
    ctx.restore();
  }
  const plCardAt = (p) => { for (let i = PL.length - 1; i >= 0; i--) { if (plOn(PL[i].id)) continue; const g = plTrayG(i); if (Math.abs(p.x - g.x) <= g.w / 2 && Math.abs(p.y - g.y) <= g.h / 2) return i; } return -1; };
  function plSlotAt(p) { const g = plG(); if (p.y < g.yTop - 30 || p.y > g.bottom + 6) return null; if (Math.abs(p.x - g.xL) <= 62 && p.x < g.sx) return 'L'; if (Math.abs(p.x - g.xR) <= 62 && p.x >= g.sx) return 'R'; return null; }
  function plPlateAt(p) { const g = plG(); for (const s of ['L', 'R']) { const id = S.pl.slot[s]; if (id && Math.abs(p.x - (s === 'L' ? g.xL : g.xR)) <= 22 && p.y >= g.yTop && p.y <= g.yBot) return { id, side: s }; } return null; }
  function plMsg() {
    const p = S.pl, md = plMode();
    if (plN() < 4) return '부품을 끌어서(또는 눌러서) 놓아요 (' + plN() + ' / 4). 구리판과 열쇠는 어느 전극에 연결할지 골라요.';
    if (md === 'none') return '구리판과 열쇠를 서로 다른 자리에 놓아야 해요.';
    if (!p.run && p.pc < 0.05 && p.pd < 0.05) return '준비 끝! “전원 켜기”를 눌러 보세요. (전류 0.50 A)';
    if (md === 'good') return p.pc >= 0.95 ? '도금 완료! 열쇠가 구리로 덮였어요.' : '열쇠 표면에서 Cu²⁺가 전자를 받아 구리로 석출돼요.';
    return '열쇠가 (+)극이라 철이 녹아요! 도금하려면 열쇠를 (−)극에 연결해요.';
  }
  function drawPlate(t) {
    const p = S.pl, g = plG(), md = plMode(), go = p.run && md !== 'none';
    T(14, 26, '🧪 철 열쇠에 구리를 입히려면 어느 극에 연결할까요?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 배선
    const sOn = plOn('pwr'), kp = p.k.pwr;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = sOn ? '#334155' : 'rgba(148,163,184,.55)'; ctx.lineWidth = 4;
    if (!sOn) ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(g.xL, g.yTop + 8); ctx.lineTo(g.xL, g.sy); ctx.lineTo(g.sx - 48, g.sy); ctx.moveTo(g.sx + 48, g.sy); ctx.lineTo(g.xR, g.sy); ctx.lineTo(g.xR, g.yTop + 8); ctx.stroke(); ctx.restore();
    if (sOn) { ctx.save(); ctx.globalAlpha = kp; supplyDraw(g.sx, g.sy, go ? '0.50A' : 'OFF', go, true); ctx.restore(); }
    else { T(g.sx, g.sy + 5, '전원 장치 자리', 13.5, '#94a3b8', 'center', 800); pill(g.xL - 4, g.sy + 26, '(−)극에 연결', { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', size: 12.5, pad: 5 }); pill(g.xR + 4, g.sy + 26, '(+)극에 연결', { bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd', size: 12.5, pad: 5 }); }
    if (sOn) gaugeDial(g.sx, g.by - 30, 21, p.I / 1.0, p.I.toFixed(2) + ' A', {});
    // 비커
    const solK = p.k.sol;
    const bk = beaker(g.bx, g.by, g.bw, g.bh, { level: 0.7 * solK, color: '#3b9be0', alpha: 0.6, inside: (gm) => {
      for (let i = 0; i < 6; i++) { const q = ballPos(gm, i + 40, 5, 2, t); D.sphere(q[0], q[1], 4.4, ANC, { gloss: false }); }
      for (let i = 0; i < 5; i++) { const q = ballPos(gm, i, 5, 2, t); D.sphere(q[0], q[1], 4.8, '#2f6bb5', { gloss: false, outline: 'rgba(255,255,255,.5)', outlineWidth: 1 }); }
      if (go && p.flow > 0.2) {
        const bad = md === 'bad';
        for (let i = 0; i < 7; i++) {
          const u = RM ? (i + 0.5) / 7 : ((t * 0.22 + i / 7) % 1), x = g.xR + (g.xL - g.xR) * u, y = gm.ly + 18 + (((i * 53) % 100) / 100) * (gm.bottom - gm.ly - 36) + Math.sin(t * 2 + i) * 3;
          ctx.save(); ctx.globalAlpha = Math.min(1, p.flow) * (0.35 + 0.65 * Math.sin(Math.PI * u)); D.sphere(x, y, 5.6, bad ? '#86c97f' : '#1d5fc4', { gloss: false, outline: '#fff', outlineWidth: 1 }); ctx.restore();
        }
      }
    } });
    // 전극
    ['L', 'R'].forEach((s) => {
      const x = s === 'L' ? g.xL : g.xR, id = p.slot[s], cathode = s === 'L';
      const lbl = cathode ? '(−)극' : '(+)극';
      if (!id) {
        ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = cathode ? '#f87171' : '#60a5fa'; ctx.lineWidth = 2.2; D.roundRect(x - 26, g.yTop, 52, g.yBot - g.yTop, 8); ctx.stroke(); ctx.fillStyle = cathode ? 'rgba(248,113,113,.07)' : 'rgba(96,165,250,.07)'; ctx.fill(); ctx.restore();
        T(x, g.yTop + (g.yBot - g.yTop) / 2 + 4, lbl, 15, cathode ? '#b91c1c' : '#1d4ed8', 'center', 900);
        if (p.sel && (p.sel === 'cu' || p.sel === 'key')) { D.ring(x, g.yTop + (g.yBot - g.yTop) / 2, 26, t, { color: PUR, width: 2.4 }); }
      } else {
        const k = p.k[id], sh = (id === 'key' && md === 'bad' && go) ? Math.sin(t * 40) * 1.2 * (1 - p.pd * 0.5) : 0;
        ctx.save(); ctx.translate(sh, (1 - k) * -30); ctx.globalAlpha = Math.min(1, k * 1.4);
        if (id === 'key') drawKey(x, g.yTop, g.yBot, md === 'bad' ? p.pd : 0, md === 'good' ? p.pc : 0, bk.ly);
        else drawCuPlate(x, g.yTop + 26, g.yBot, md === 'good' ? 1 - 0.28 * p.cuk : md === 'bad' ? 1 : 1, md === 'bad' ? p.pd : 0, bk.ly);
        // 액체에 잠긴 부분 살짝 어둡게
        if (solK > 0.3) { ctx.fillStyle = 'rgba(59,155,224,.2)'; ctx.fillRect(x - 24, bk.ly, 48, g.yBot - bk.ly + 4); }
        ctx.restore();
        pill(x + (cathode ? -42 : 42), g.yTop + 16, lbl, { bg: cathode ? NEGC : POSC, color: '#fff', border: null, size: 14, pad: 6 });
      }
    });
    // 전자 흐름 : 양극(+) → 전원 → 음극(−)
    if (go && p.flow > 0.1) { const wp = [[g.xR, g.yTop + 8], [g.xR, g.sy], [g.xL, g.sy], [g.xL, g.yTop + 8]]; for (let i = 0; i < 7; i++) { const q = ptAlong(wp, ((i / 7) + t * 0.2) % 1); ctx.save(); ctx.globalAlpha = Math.min(1, p.flow * 1.4); eBall(q.x, q.y, 4.8); ctx.restore(); } }
    // 그림 라벨
    if (solK > 0.3) T(g.bx + g.bw / 2, g.by + g.bh + 22, 'CuSO₄ 수용액', PHONE ? 13 : 14, INK, 'center', 800);
    if (go && md === 'good') {
      T(g.xR, g.by + g.bh + 40, '산화 : Cu → Cu²⁺ + 2e⁻', 12.5, '#1d4ed8', 'center', 800);
      T(g.xL, g.by + g.bh + 40, '환원 : Cu²⁺ + 2e⁻ → Cu', 12.5, '#b91c1c', 'center', 800);
    }
    if (go && md === 'bad') { T(g.xR, g.by + g.bh + 40, '산화 : Fe → Fe²⁺ + 2e⁻', 12.5, '#b91c1c', 'center', 800); T(g.xL, g.by + g.bh + 40, '구리판에 Cu가 석출', 12.5, MUTED, 'center', 800); }
    // 오른쪽 : 상태 안내 (태블릿)
    if (!PHONE) {
      const tx = MAIN.x + 440, tw = MAIN.w - 440 - 16;
      T(tx, MAIN.y + 34, '🔬 실험 상태', 15, WARN, 'left', 900);
      const checks = [['용액을 담았나요?', plOn('sol')], ['구리판 · 열쇠를 연결했나요?', !!(p.slot.L && p.slot.R)], ['전원 장치를 놓았나요?', plOn('pwr')], ['열쇠에 구리가 입혀졌나요?', p.pc >= 0.95]];
      checks.forEach((c, i) => T(tx, MAIN.y + 62 + i * 24, (c[1] ? '✅ ' : '⬜ ') + c[0], 14, c[1] ? '#166534' : MUTED, 'left', 800));
      textBlock(tx, MAIN.y + 176, tw, plMsg(), 14.5, md === 'bad' && go ? '#b91c1c' : INK, 21, 800);
      textBlock(tx, MAIN.y + MAIN.h - 66, tw, '⚠ 보안경 · 장갑을 착용하고, 실험이 끝난 구리 폐액은 중금속 폐액으로 따로 모아요.', 13, '#92400e', 18, 700);
    }
    // INFO : 부품함
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '🧰 부품함 (' + (4 - plN()) + '개 남음)', 15, WARN, 'left', 800);
    if (plN() === 4) textBlock(INFO.x + 16, INFO.y + 56, INFO.w - 32, plMsg(), PHONE ? 14.5 : 15.5, md === 'bad' && go ? '#b91c1c' : INK, 22, 800);
    if (PHONE && plN() < 4) T(INFO.x + INFO.w - 14, INFO.y + 26, '', 12);
    PL.forEach((q, i) => {
      if (plOn(q.id)) return; const tg = plTrayG(i);
      if (p.drag && p.drag.i === i) { plCard(i, tg.x, tg.y, false, true, false); return; }
      plCard(i, tg.x + (p.shake > 0 && p.lastI === i ? Math.sin(p.shake * 60) * 4 : 0), tg.y, false, false, p.sel === q.id);
    });
    if (p.drag) {
      plCard(p.drag.i, p.drag.x, p.drag.y - 10, true, false, false);
      const q = PL[p.drag.i]; if (q.id === 'cu' || q.id === 'key') { const s = plSlotAt(p.drag); if (s) { const x = s === 'L' ? g.xL : g.xR; ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = GOODC; ctx.lineWidth = 2.6; D.roundRect(x - 30, g.yTop - 4, 60, g.yBot - g.yTop + 8, 10); ctx.stroke(); ctx.restore(); } }
    }
  }

  /* ============ ② 석출 분석 ============ */
  const AN_T = [0, 5, 10, 15, 20];
  const anKey = (I) => I.toFixed(2);
  const anPts = (I) => S.an.pts[anKey(I)] || [];
  const anMass = () => massCu(S.an.I, S.an.t);
  function anRecord() {
    const a = S.an; if (a.t <= 0) { showHint('시간을 5분 이상으로 맞춘 뒤 기록해요.', 2800); return; }
    const key = anKey(a.I), arr = a.pts[key] || (a.pts[key] = []);
    if (arr.some((q) => q.t === a.t)) { showHint('이미 기록한 시간이에요. 다른 시간을 골라 보세요.', 2600); return; }
    arr.push({ t: a.t, m: anMass() }); arr.sort((x, y) => x.t - y.t); Sound.click(); flash(MAIN.x + MAIN.w * 0.7, MAIN.y + 120, ['#8b5cf6', '#14a058']); updateCtl();
  }
  function anSetT(i) { const a = S.an; a.t = AN_T[clamp(Math.round(i), 0, 4)]; updateCtl(); }
  function anSetI(v) { S.an.I = +v; updateCtl(); }
  const anOk50 = () => [5, 10, 15, 20].every((t) => anPts(0.5).some((q) => q.t === t));
  const anOk25 = () => anPts(0.25).length >= 2;
  function stepAnalysis(dt) { const a = S.an; if (S.mode !== 'analysis') return; a.ts = ap(a.ts, a.t, dt, 4); if (Math.abs(a.ts - a.t) < 0.02) a.ts = a.t; }
  const anLay = () => PHONE ? { dia: { x: MAIN.x + 8, y: MAIN.y + 8, w: MAIN.w - 16, h: 206 }, P: { x: MAIN.x + 62, y: MAIN.y + 258, w: MAIN.w - 92, h: 118 } }
    : { dia: { x: MAIN.x + 10, y: MAIN.y + 10, w: 340, h: MAIN.h - 20 }, P: { x: MAIN.x + 420, y: MAIN.y + 44, w: 320, h: 230 } };
  function drawAnalysis(t) {
    const a = S.an, L = anLay(), P = L.P, m = massCu(a.I, a.ts), run = a.t > 0 ? 1 : 0;
    T(14, 26, '📈 전류와 시간에 따라 석출되는 구리의 질량은?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 장면 : 입자 모형
    const d = L.dia; D.roundRect(d.x, d.y, d.w, d.h, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4; ctx.stroke();
    const bw = d.w - 40, bh = PHONE ? 80 : 140, bx = d.x + 20, by = d.y + (PHONE ? 88 : 104);
    const bk = beaker(bx, by, bw, bh, { level: 0.74, color: '#3b9be0', alpha: 0.6, inside: (gm) => {
      for (let i = 0; i < 5; i++) { const q = ballPos(gm, i + 40, 5, 2, t); D.sphere(q[0], q[1], 4.4, ANC, { gloss: false }); }
      for (let i = 0; i < 6; i++) { const q = ballPos(gm, i, 5, 1.2, t); D.sphere(q[0], q[1], 4.8, '#2f6bb5', { gloss: false, outline: 'rgba(255,255,255,.5)', outlineWidth: 1 }); }
    } });
    const xk = bx + bw * 0.3, xa = bx + bw * 0.7, yb = bk.bottom - 12, y0 = by - (PHONE ? 40 : 52);
    const depo = clamp(m / 0.4, 0, 1), eff = a.I / 1.0;
    drawKey(xk, y0, yb, 0, depo, bk.ly);
    drawCuPlate(xa, y0 + 26, yb, 1 - 0.32 * depo, 0, bk.ly);
    ctx.fillStyle = 'rgba(59,155,224,.18)'; ctx.fillRect(xk - 20, bk.ly, 40, yb - bk.ly + 4); ctx.fillRect(xa - 16, bk.ly, 32, yb - bk.ly + 4);
    // Cu²⁺ 이동
    if (run && a.I > 0) {
      const n = Math.round(3 + 5 * eff);
      for (let i = 0; i < n; i++) { const u = RM ? (i + 0.5) / n : ((t * (0.12 + 0.2 * eff) + i / n) % 1), x = xa + (xk - xa) * u, y = bk.ly + 16 + (((i * 47) % 100) / 100) * (bk.bottom - bk.ly - 40); ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * Math.sin(Math.PI * u); D.sphere(x, y, 5.2, '#1d5fc4', { gloss: false, outline: '#fff', outlineWidth: 1 }); ctx.restore(); }
    }
    pill(xk, y0 - 8, '(−)극 열쇠', { bg: NEGC, color: '#fff', border: null, size: 12.5, pad: 5 }); pill(xa, y0 - 8, '(+)극 구리판', { bg: POSC, color: '#fff', border: null, size: 12.5, pad: 5 });
    T(d.x + 12, d.y + 22, '🔍 입자 모형 : 녹은 만큼 석출돼요', 13.5, '#5b21b6', 'left', 800);
    T(xk, by + bh + 16, 'Cu²⁺ + 2e⁻ → Cu', 12.5, '#b91c1c', 'center', 800); T(xa, by + bh + 16, 'Cu → Cu²⁺ + 2e⁻', 12.5, '#1d4ed8', 'center', 800);
    // 푸른색 유지
    const sw = d.y + d.h - 56;
    if (PHONE) T(d.x + d.w / 2, d.y + d.h - 6, '푸른색(Cu²⁺ 농도) 그대로 · 석출 구리 ' + f2(m) + ' g', 13, '#7a3410', 'center', 800);
    if (!PHONE) { D.roundRect(d.x + 20, sw, 22, 22, 6); ctx.fillStyle = C.rgba('#3b9be0', 0.6); ctx.fill(); ctx.strokeStyle = '#7b93b3'; ctx.lineWidth = 1.4; ctx.stroke(); T(d.x + 50, sw + 16, '용액의 푸른색(Cu²⁺ 농도) : 그대로', 13.5, INK, 'left', 800); T(d.x + 20, sw + 42, '석출 구리 ' + f2(m) + ' g  (' + Math.round(a.ts) + '분 · ' + a.I.toFixed(2) + ' A)', 13.5, '#7a3410', 'left', 800); }
    // 그래프
    T(P.x + P.w / 2, P.y - (PHONE ? 14 : 24), '석출 구리의 질량 (g)', 14, WARN, 'center', 800);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, P.y + P.h); ctx.lineTo(P.x + P.w, P.y + P.h); ctx.stroke();
    for (let v = 0; v <= 0.4001; v += 0.1) { const y = P.y + P.h - P.h * v / 0.4; ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.stroke(); T(P.x - 6, y + 4.5, v.toFixed(1), 13, MUTED, 'right', 700); }
    for (let v = 0; v <= 20; v += 5) { const x = P.x + P.w * v / 20; T(x, P.y + P.h + 18, String(v), 13, MUTED, 'center', 700); }
    T(P.x + P.w, P.y + P.h + 36, '시간 (분)', 13, MUTED, 'right', 800);
    const gx = (tt) => P.x + P.w * tt / 20, gy = (mm) => P.y + P.h - P.h * mm / 0.4;
    [[0.25, '#0d9488'], [0.5, '#8b5cf6'], [1.0, '#ea580c']].forEach(([I, col]) => {
      const arr = anPts(I); if (!arr.length) return;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); arr.forEach((q) => ctx.lineTo(gx(q.t), gy(q.m))); ctx.stroke();
      arr.forEach((q) => D.sphere(gx(q.t), gy(q.m), 5.6, col, { gloss: false, outline: '#fff', outlineWidth: 1.6 }));
      const last = arr[arr.length - 1]; T(gx(last.t) - 8, gy(last.m) - 12, I.toFixed(2) + ' A', 12.5, col, 'right', 800);
    });
    // 현재값 표시 (기록 전 미리보기)
    if (a.t > 0) { const cx = gx(a.ts), cy = gy(m); ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.beginPath(); ctx.moveTo(cx, P.y + P.h); ctx.lineTo(cx, cy); ctx.lineTo(P.x, cy); ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.strokeStyle = PUR; ctx.lineWidth = 2; ctx.stroke(); }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '전류 ' + a.I.toFixed(2) + ' A , 시간 ' + a.t + '분 → 석출 구리 ' + f2(m) + ' g', PHONE ? 14 : 16, INK, 'left', 900);
    const lines = [];
    [0.25, 0.5, 1.0].forEach((I) => { const arr = anPts(I); if (arr.length) lines.push(I.toFixed(2) + ' A : ' + arr.map((q) => q.t + '분 ' + f2(q.m) + ' g').join(' , ')); });
    let yy = INFO.y + 52;
    lines.forEach((l) => { yy += textBlock(INFO.x + 16, yy, INFO.w - 32, l, PHONE ? 13 : 14, INK, 19, 700) + 2; });
    if (!lines.length) textBlock(INFO.x + 16, yy, INFO.w - 32, '시간을 5분 단위로 바꾸고 “📍 기록”을 눌러 그래프에 점을 찍어요. 0.50 A는 5 · 10 · 15 · 20분을 모두 기록해요.', PHONE ? 13.5 : 14.5, MUTED, 20, 700);
    else if (anOk50() && anOk25()) textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 52 : 34), INFO.w - 32, '직선이 원점을 지나요 → 석출량은 시간에 비례하고, 전류가 반이면 같은 시간에 석출량도 반이에요.', PHONE ? 13 : 14, '#5b21b6', 19, 800);
  }

  /* ============ ③ 산업 조사 ============ */
  const IND = {
    refine: { name: '구리 정련', icon: '🔶', elyt: 'CuSO₄ 수용액', anode: '조동 (불순물이 섞인 구리)', cath: '순동 (순수한 구리)', ra: 'Cu → Cu²⁺ + 2e⁻ (산화)', rc: 'Cu²⁺ + 2e⁻ → Cu (환원)', prod: '순도 높은 구리 (불순물은 슬라임으로 가라앉아요)', use: '전선 · 전자 부품' },
    al: { name: '알루미늄 제련', icon: '🥫', elyt: '용융 Al₂O₃ (녹인 상태)', anode: '탄소 전극', cath: '탄소 전극 (바닥)', ra: '2O²⁻ → O₂ + 4e⁻ (산화)', rc: 'Al³⁺ + 3e⁻ → Al (환원)', prod: '녹은 알루미늄 (바닥에 고여요), 전자 3 mol당 Al 1 mol (27 g)', use: '캔 · 창틀 · 항공기 소재' },
    chlor: { name: '염소 · 수산화 나트륨', icon: '🧂', elyt: 'NaCl 수용액', anode: '탄소(또는 티타늄) 전극', cath: '금속 전극', ra: '2Cl⁻ → Cl₂ + 2e⁻ (산화)', rc: '2H₂O + 2e⁻ → H₂ + 2OH⁻ (환원)', prod: 'Cl₂ , H₂ , NaOH', use: '소독제 · 비누 · 종이 원료' },
    plate2: { name: '금속 도금', icon: '✨', elyt: '도금할 금속 이온(Ni²⁺ · Cr 등) 수용액', anode: '도금용 금속판', cath: '도금할 물체', ra: 'M → Mⁿ⁺ + ne⁻ (산화)', rc: 'Mⁿ⁺ + ne⁻ → M (환원)', prod: '표면에 입혀진 금속 층', use: '장식 · 부식 방지' },
  };
  const INDK = ['refine', 'al', 'chlor', 'plate2'];
  function indPick(k) { const n = S.ind; n.k = k; n.p = 0; n.viewed[k] = true; n.alWhy = false; Sound.click(); updateCtl(); }
  const indNView = () => Object.keys(S.ind.viewed).length;
  function stepIndustry(dt) { const n = S.ind; if (S.mode !== 'industry') return; n.p = Math.min(1, n.p + dt / 14); }
  function drawIndustry(t) {
    const n = S.ind, c = IND[n.k], p = sm(n.p), k = n.k;
    T(14, 26, c.icon + ' ' + c.name + ' : 전기 분해의 쓰임', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const w = PHONE ? 420 : 560, h = PHONE ? 190 : 176, bx = MAIN.x + (MAIN.w - w) / 2, by = MAIN.y + (PHONE ? 128 : 112), yw = MAIN.y + 38;
    const ix = bx + 5, iw = w - 10, iy = by + 5, ih = h - 11, ly = iy + ih * 0.26, bottom = iy + ih;
    const xC = bx + w * 0.28, xA = bx + w * 0.72, top = by - (PHONE ? 52 : 44);
    const conf = {
      refine: { solc: '#3b9be0', sola: 0.58, ion: '#1d5fc4' }, al: { solc: '#fb923c', sola: 0.78, ion: '#94a3b8' },
      chlor: { solc: '#cfe8fb', sola: 0.5, ion: '#a78bfa' }, plate2: { solc: '#86d6a0', sola: 0.5, ion: '#2f9e5b' },
    }[k];
    // 배선 · 전원
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(xC, top + 6); ctx.lineTo(xC, yw); ctx.lineTo(bx + w / 2 - 48, yw); ctx.moveTo(bx + w / 2 + 48, yw); ctx.lineTo(xA, yw); ctx.lineTo(xA, top + 6); ctx.stroke(); ctx.restore();
    supplyDraw(bx + w / 2, yw, 'DC', true, true);
    for (let i = 0; i < 6; i++) { const q = ptAlong([[xA, top + 6], [xA, yw], [xC, yw], [xC, top + 6]], ((i / 6) + t * 0.2) % 1); eBall(q.x, q.y, 4.4); }
    // 용기
    const bk = beaker(bx, by, w, h, { level: 0.74, color: conf.solc, alpha: conf.sola, inside: (gm) => {
      if (k === 'al') { // 알루미늄 풀
        const poolH = 6 + 34 * p; ctx.fillStyle = '#cbd5e1'; ctx.fillRect(gm.ix, gm.bottom - poolH, gm.iw, poolH); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(gm.ix, gm.bottom - poolH, gm.iw, 2.5);
      }
      if (k === 'chlor' && p > 0.05) { const R = 30 + 110 * p, gr = ctx.createLinearGradient(xC - R, 0, xC + R, 0); gr.addColorStop(0, 'rgba(236,72,153,0)'); gr.addColorStop(0.5, 'rgba(236,72,153,' + 0.45 * p + ')'); gr.addColorStop(1, 'rgba(236,72,153,0)'); ctx.fillStyle = gr; ctx.fillRect(xC - R, gm.ly, 2 * R, gm.bottom - gm.ly); }
      if (k === 'refine') { // 슬라임
        for (let i = 0; i < 7; i++) { const u = clamp(p * 1.3 - i * 0.1, 0, 1), sx = xA + (((i * 29) % 40) - 20), sy = gm.ly + 20 + u * (gm.bottom - gm.ly - 32); if (u > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, u * 4); D.sphere(sx, sy, 3.4, i % 2 ? '#fbbf24' : '#e5e7eb', { gloss: false }); ctx.restore(); } }
      }
      // 이온 이동 : 양이온은 (−)극 쪽, 음이온은 (+)극 쪽
      const pos = k === 'refine' ? '#1d5fc4' : k === 'al' ? '#94a3b8' : k === 'chlor' ? '#a78bfa' : '#2f9e5b';
      const neg = k === 'al' ? '#ef4444' : k === 'chlor' ? '#22c55e' : ANC;
      for (let i = 0; i < 7; i++) {
        const u = RM ? (i + 0.5) / 7 : ((t * 0.2 + i / 7) % 1), y = gm.ly + 16 + (((i * 53) % 100) / 100) * (gm.bottom - gm.ly - (k === 'al' ? 62 : 34));
        ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * Math.sin(Math.PI * u); D.sphere(xA + (xC - xA) * u, y, 5.2, pos, { gloss: false, outline: '#fff', outlineWidth: 1 }); ctx.restore();
        if (i % 2 === 0 && k !== 'refine' && k !== 'plate2') { ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * Math.sin(Math.PI * u); D.sphere(xC + (xA - xC) * u, y + 12, 5.2, neg, { gloss: false, outline: '#fff', outlineWidth: 1 }); ctx.restore(); }
      }
    } });
    // 전극
    const yb = bk.bottom - (k === 'al' ? 44 : 14);
    const rod = (x, y0, yE, w0, c1, c2) => { const gr = ctx.createLinearGradient(x - w0 / 2, 0, x + w0 / 2, 0); gr.addColorStop(0, C.shade(c1, 0.25)); gr.addColorStop(0.5, c1); gr.addColorStop(1, c2); D.shadow(() => { D.roundRect(x - w0 / 2, y0, w0, yE - y0, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 3, y: 2 }); };
    let cLab, aLab, cLab2, aLab2;
    if (k === 'refine') {
      rod(xC, top + 10, yb, 8 + 22 * p, '#f0a56b', '#b45f2a'); rod(xA, top + 10, yb, 30 - 20 * p, '#8a5a3a', '#4a2f1c');
      for (let i = 0; i < 6; i++) { const sy = bk.ly + 10 + i * 12; ctx.fillStyle = i % 2 ? '#fbbf24' : '#e5e7eb'; ctx.fillRect(xA - 8 + (i % 3) * 5, sy, 3, 3); }
      cLab = '(−)극 순동'; aLab = '(+)극 조동';
    } else if (k === 'al') {
      rod(xA, top + 10, yb, 20, '#4b5563', '#1f2937'); rod(xC, top + 10, yb, 20, '#4b5563', '#1f2937');
      bubbleUp(null, xA, yb - 4, bk.ly - 8, 4, t, 0.5, 4);
      cLab = '(−)극 탄소'; aLab = '(+)극 탄소'; T(xA + 18, bk.ly + 12, 'O₂', 12.5, '#334155', 'left', 800);
    } else if (k === 'chlor') {
      rod(xC, top + 10, yb, 12, '#6b7280', '#374151'); rod(xA, top + 10, yb, 12, '#4b5563', '#1f2937');
      bubbleUp(null, xC, yb - 4, bk.ly - 8, 4, t, 0.55, 3.4); bubbleUp(null, xA, yb - 4, bk.ly - 8, 4, t, 0.5, 4, 'rgba(205,240,120,.8)');
      T(xC - 18, bk.ly + 12, 'H₂', 12.5, '#334155', 'right', 800); T(xA + 18, bk.ly + 12, 'Cl₂', 12.5, '#334155', 'left', 800);
      cLab = '(−)극'; aLab = '(+)극';
    } else {
      drawKey(xC, top - 6, yb, 0, 0.2 + 0.8 * p, bk.ly); rod(xA, top + 10, yb, 28 - 14 * p, '#cfd6e0', '#7b8794');
      cLab = '(−)극 도금할 물체'; aLab = '(+)극 도금 금속';
    }
    pill(xC, top - (k === 'plate2' ? 14 : 4), '(−)', { bg: NEGC, color: '#fff', border: null, size: 14, pad: 6 }); pill(xA, top - 4, '(+)', { bg: POSC, color: '#fff', border: null, size: 14, pad: 6 });
    T(xC, by + h + 20, cLab, 13.5, '#b91c1c', 'center', 800); T(xA, by + h + 20, aLab, 13.5, '#1d4ed8', 'center', 800);
    T(MAIN.x + 14, MAIN.y + 26, '', 12);
    T(bx + w / 2, by + h + 40, '전해질 : ' + c.elyt, PHONE ? 13 : 13.5, INK, 'center', 800);
    if (k === 'al' && n.alWhy) {
      const ww = Math.min(MAIN.w - 30, 420), x = MAIN.x + (MAIN.w - ww) / 2, y = MAIN.y + MAIN.h - 74;
      panel(x, y - 6, ww, 66, 10, '#fff7ed'); D.roundRect(x, y - 6, ww, 66, 10); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 1.6; ctx.stroke();
      T(x + ww / 2, y + 14, '수용액에서는 물이 먼저 환원돼요', 13.5, '#9a3412', 'center', 800);
      T(x + ww / 2, y + 36, 'E°(Al³⁺/Al) = −1.66 V < E°(물) ≈ −0.83 V → 용융 상태로 분해해요', PHONE ? 12 : 13, '#9a3412', 'center', 700);
    }
    // INFO : 정보 틀
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const rows = [['전해질', c.elyt], ['(+)극 · 산화', c.ra], ['(−)극 · 환원', c.rc], ['생성물', c.prod], ['쓰임', c.use]];
    const lw = PHONE ? 84 : 104, fs = PHONE ? 13 : 14, lh = PHONE ? 38 : 25;
    let yy = INFO.y + 20;
    rows.forEach((r, i) => {
      T(INFO.x + 14, yy + 4, r[0], fs, WARN, 'left', 800);
      const hgt = textBlock(INFO.x + 14 + lw, yy + 4, INFO.w - 28 - lw, r[1], fs, INK, 17, 700);
      yy += Math.max(PHONE ? 24 : 23, hgt + 6);
    });
  }

  /* ============ ④ 발표 · 평가 ============ */
  const PRC = {
    refine: { name: '구리 정련', f2: ['(−)극 : Cu²⁺ + 2e⁻ → Cu', '(−)극 : Cu → Cu²⁺ + 2e⁻', '(+)극 : Cu²⁺ + 2e⁻ → Cu'], f3: ['전선 · 전자 부품에 쓰는 고순도 구리', '캔 · 창틀을 만드는 가벼운 금속', '소독제 · 비누 원료'], f4: ['불순물에서 금 · 은 등을 회수할 수 있지만 전력이 필요해요', '전기가 필요 없는 공정이에요', '구리가 전혀 소모되지 않아요'], f5: ['왜 순동을 (−)극에 둘까요?', '왜 용액의 푸른색이 그대로일까요?', '왜 슬라임에 금이 모일까요?'] },
    al: { name: '알루미늄 제련', f2: ['(−)극 : Al³⁺ + 3e⁻ → Al', '(−)극 : Al → Al³⁺ + 3e⁻', '(+)극 : Al³⁺ + 3e⁻ → Al'], f3: ['캔 · 창틀 · 항공기 소재', '전선 · 전자 부품에 쓰는 고순도 구리', '소독제 · 비누 원료'], f4: ['전력을 많이 써서 재활용이 중요해요', '낮은 온도에서 쉽게 만들 수 있어요', '물에 녹여 전기 분해해요'], f5: ['왜 수용액이 아니라 용융 상태일까요?', '왜 전자 3 mol당 Al 1 mol일까요?', '왜 재활용하면 에너지를 아낄까요?'] },
    chlor: { name: '염소 · 수산화 나트륨', f2: ['(+)극 : 2Cl⁻ → Cl₂ + 2e⁻', '(+)극 : Cl₂ + 2e⁻ → 2Cl⁻', '(−)극 : Na⁺ + e⁻ → Na'], f3: ['소독제 · 비누 · 종이 원료', '캔 · 창틀을 만드는 금속', '장식 · 부식 방지 표면 처리'], f4: ['염소 · 수소 · 수산화 나트륨을 얻지만 염소 기체의 안전 관리가 필요해요', '나트륨 금속을 얻는 공정이에요', '전류가 흐르지 않아도 돼요'], f5: ['왜 (−)극에서 Na가 생기지 않을까요?', '왜 (−)극 주변이 염기성일까요?', '왜 H₂와 Cl₂ 부피가 비슷할까요?'] },
    plate2: { name: '금속 도금', f2: ['(−)극 : Mⁿ⁺ + ne⁻ → M', '(−)극 : M → Mⁿ⁺ + ne⁻', '(+)극 : Mⁿ⁺ + ne⁻ → M'], f3: ['장식 · 부식 방지 표면 처리', '전선 · 전자 부품에 쓰는 고순도 구리', '소독제 · 비누 원료'], f4: ['표면을 보호하지만 중금속 폐액을 따로 처리해야 해요', '도금액은 그냥 버려도 돼요', '도금할 물체를 (+)극에 연결해요'], f5: ['왜 물체를 (−)극에 연결할까요?', '왜 니켈 · 크로뮴을 쓸까요?', '왜 전류가 클수록 빨리 입혀질까요?'] },
  };
  const F1 = ['전기 에너지로 비자발적인 산화·환원 반응을 일으켜 물질을 얻거나 입혀요', '화학 에너지로 전기를 만들어 내요', '촉매를 넣어 반응을 빠르게 해요'];
  const PRK = ['refine', 'al', 'chlor', 'plate2'];
  const PEER = [
    { title: '구리 정련', by: '학생 가', f: ['전기 에너지로 불순한 구리를 순수한 구리로 만들어요', '(+)극 Cu → Cu²⁺ + 2e⁻ , (−)극 Cu²⁺ + 2e⁻ → Cu', '전선 · 전자 부품', '불순물에서 금 · 은을 회수해요', '왜 순동을 (−)극에 둘까요?'], flaw: false },
    { title: '알루미늄 제련', by: '학생 나', f: ['알루미늄 이온이 든 수용액을 전기 분해해 (−)극에서 알루미늄을 얻어요', '(−)극 Al³⁺ + 3e⁻ → Al', '캔 · 창틀', '전기가 많이 들어요', '알루미늄은 비싼가요?'], flaw: true },
    { title: '금속 도금', by: '학생 다', f: ['도금할 물체를 (−)극에 연결해요', '(−)극 Mⁿ⁺ + ne⁻ → M', '장식 · 부식 방지', '폐액 처리', '왜 니켈을 쓸까요?'], flaw: false },
  ];
  const CRIT = ['정확성', '이해하기 쉬움', '근거', '창의'];
  const prSet = () => { const k = S.pr.k; return k ? PRC[k] : null; };
  function prFillOpts() {
    const k = S.pr.k, c = k ? PRC[k] : null;
    const ids = ['prS1', 'prS2', 'prS3', 'prS4', 'prS5'];
    const lists = c ? [F1, c.f2, c.f3, c.f4, c.f5] : [[], [], [], [], []];
    ids.forEach((id, i) => {
      const sel = $('#' + id); sel.innerHTML = '';
      const o0 = document.createElement('option'); o0.value = ''; o0.textContent = k ? '선택하세요' : '먼저 사례를 골라요'; sel.appendChild(o0);
      lists[i].forEach((tx, j) => { const o = document.createElement('option'); o.value = String(j); o.textContent = tx; sel.appendChild(o); });
      sel.value = S.pr.f[i] != null ? String(S.pr.f[i]) : ''; sel.disabled = !k; sel.classList.remove('ok', 'bad');
    });
  }
  function prPick(k) { const r = S.pr; r.k = k; r.f = {}; prFillOpts(); Sound.click(); updateCtl(); }
  function prCheck() {
    const r = S.pr, f = r.f;
    if (!r.k) return '먼저 발표할 사례를 골라요.';
    const miss = [0, 1, 2, 3, 4].filter((i) => f[i] == null || f[i] === ''); if (miss.length) return '아직 고르지 않은 칸이 있어요 (' + miss.map((i) => ['원리', '반응식', '쓰임', '장단점 · 환경', '질문'][i]).join(', ') + ').';
    const wrong = [0, 1, 2, 3].filter((i) => +f[i] !== 0);
    markSel(['prS1', 'prS2', 'prS3', 'prS4', 'prS5'], [+f[0] === 0, +f[1] === 0, +f[2] === 0, +f[3] === 0, true]);
    if (wrong.length) return '다시 확인해 보세요 : ' + wrong.map((i) => ['원리', '반응식', '쓰임', '장단점 · 환경'][i]).join(', ') + '. 앞 단계의 사례 카드를 떠올려요.';
    return true;
  }
  const peN = () => { let n = 0; S.pr.r.forEach((c) => CRIT.forEach((_, j) => { if (c[j]) n++; })); return n; };
  const peAccOk = () => { const r = S.pr.r; return r[0][0] >= 4 && r[1][0] > 0 && r[1][0] <= 2 && r[2][0] >= 3; };
  function peRate(ci, j, v) { S.pr.r[ci][j] = v; Sound.tick(); updateCtl(); }
  function wrapCardText(x, y, w, str, size, color, lh) { return textBlock(x, y, w, str, size, color, lh, 700); }
  function drawCardBox(x, y, w, h, title, by, fields, ratings, flawMark) {
    D.shadow(() => { D.roundRect(x, y, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    D.roundRect(x, y, w, h, 14); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.2; ctx.stroke();
    D.roundRect(x, y, w, 40, 14); ctx.fillStyle = '#ede9fe'; ctx.fill();
    T(x + 14, y + 26, '🎤 ' + title, PHONE ? 15 : 17, '#5b21b6', 'left', 900); if (by) T(x + w - 14, y + 26, by, 13.5, MUTED, 'right', 800);
    const labs = ['원리', '반응식', '쓰임', '장단점 · 환경', '질문'];
    let yy = y + 60; const lw = PHONE ? 70 : 96;
    labs.forEach((lb, i) => {
      T(x + 14, yy, lb, PHONE ? 13 : 14, WARN, 'left', 900);
      const txt = fields[i];
      const hgt = txt ? textBlock(x + 14 + lw, yy, w - 28 - lw, txt, PHONE ? 13 : 14, INK, 18, 700) : (T(x + 14 + lw, yy, '… (아직 비어 있어요)', PHONE ? 13 : 14, '#a0aec0', 'left', 700), 18);
      yy += Math.max(24, hgt + 8);
    });
    return yy;
  }
  function drawPresent(t) {
    const r = S.pr, sub = S.sub.present;
    T(14, 26, sub === 'own' ? '🎤 발표 카드를 만들어요' : '⭐ 다른 학생의 발표 카드를 평가해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    if (sub === 'own') {
      const c = prSet(), f = r.f;
      const fields = c ? [0, 1, 2, 3, 4].map((i) => (f[i] != null && f[i] !== '' ? [F1, c.f2, c.f3, c.f4, c.f5][i][+f[i]] : '')) : ['', '', '', '', ''];
      const cx = MAIN.x + 16, cw = MAIN.w - 32;
      drawCardBox(cx, MAIN.y + 14, cw, MAIN.h - 28, c ? c.name : '사례를 골라 주세요', '내 발표 카드', fields);
      if (r.ownOk) { D.check(MAIN.x + MAIN.w - 40, MAIN.y + MAIN.h - 36, 14, 1, {}); T(MAIN.x + MAIN.w - 70, MAIN.y + MAIN.h - 30, '완성!', 15, '#166534', 'right', 900); }
    } else {
      const c = PEER[r.cur], cx = MAIN.x + 16, cw = MAIN.w - 32;
      drawCardBox(cx, MAIN.y + 14, cw, MAIN.h - 28, c.title, c.by, c.f);
      const rt = r.r[r.cur]; let s = ''; CRIT.forEach((nm, j) => { s += nm + ' ' + (rt[j] ? '★'.repeat(rt[j]) + '☆'.repeat(5 - rt[j]) : '—') + (j < 3 ? '   ' : ''); });
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (sub === 'own') {
      T(INFO.x + 16, INFO.y + 26, '발표 카드 : 원리 한 문장 · 반응식 · 쓰임 · 장단점/환경 · 질문 하나', PHONE ? 13.5 : 15, WARN, 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '구리 정련 · 알루미늄 제련 · 염소 생산 · 금속 도금 중 한 사례를 골라 칸을 채워요. 틀린 칸은 앞 단계의 사례 카드를 다시 읽어 보세요.', PHONE ? 13.5 : 14.5, INK, 20, 700);
    } else {
      T(INFO.x + 16, INFO.y + 26, '동료 평가 루브릭 (1 ~ 5점) : 정확성 · 이해하기 쉬움 · 근거 · 창의', PHONE ? 13.5 : 15, WARN, 'left', 800);
      const rt = S.pr.r[S.pr.cur];
      CRIT.forEach((nm, j) => { const col = j % 2, row = Math.floor(j / 2), x = INFO.x + 16 + col * (INFO.w / 2 - 8), y = INFO.y + 56 + row * 28; T(x, y, nm + '  ' + (rt[j] ? '★'.repeat(rt[j]) + '☆'.repeat(5 - rt[j]) : '—'), PHONE ? 13.5 : 15, rt[j] ? '#92400e' : MUTED, 'left', 800); });
      textBlock(INFO.x + 16, INFO.y + 56 + 56 + (PHONE ? 8 : 0), INFO.w - 32, '평가한 항목 ' + peN() + ' / 12 · 정확성은 반응식 · 조건이 맞는지 따져서 매겨요.', PHONE ? 13 : 14, MUTED, 18, 700);
    }
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'plate') return false;
      const pl = S.pl;
      const i = plCardAt(p);
      if (i >= 0) { pl.drag = { i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; pl.lastI = i; Sound.click(); return true; }
      const pa = plPlateAt(p); if (pa && !pl.run) { const idx = PL.findIndex((q) => q.id === pa.id); plRemove(pa.id); pl.drag = { i: idx, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, fromSlot: true }; pl.lastI = idx; return true; }
      if (pl.sel) { const s = plSlotAt(p); if (s) { plPlace(pl.sel, s); return false; } }
      return false;
    },
    move(p) { const d = S.pl.drag; if (d) { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; } },
    up(p) {
      const pl = S.pl, d = pl.drag; if (!d) return; pl.drag = null; const id = PL[d.i].id, g = plG();
      if (id === 'cu' || id === 'key') {
        if (!d.moved) { pl.sel = pl.sel === id ? null : id; if (pl.sel) showHint('카드를 고른 뒤 (−)극 또는 (+)극 자리를 눌러요. 끌어서 놓아도 돼요.', 3600); return; }
        const s = plSlotAt(p); if (s) plPlace(id, s); else { pl.shake = 0.35; showHint('구리판 · 열쇠는 비커 위의 (−)극 · (+)극 자리에 놓아요.', 3400); }
      } else {
        if (!d.moved) { plPlace(id); return; }
        const ok = id === 'sol' ? (p.x > g.bx - 10 && p.x < g.bx + g.bw + 10 && p.y > g.by - 40 && p.y < g.by + g.bh + 10) : (p.y < g.by - 10 && p.y > MAIN.y);
        if (ok) plPlace(id); else { pl.shake = 0.35; showHint(id === 'sol' ? '용액은 비커에 부어요.' : '전원 장치는 위쪽 회로 자리에 놓아요.', 3200); }
      }
    },
    hover(p) { if (S.mode === 'plate') return plCardAt(p) >= 0 || (plPlateAt(p) && !S.pl.run) ? 'grab' : 'default'; return 'default'; },
  });

  /* ---------- 조작 장치 ---------- */
  $('#bPlPow').addEventListener('click', plPower); $('#bPlReset').addEventListener('click', () => { Sound.click(); plReset(); });
  const EQO = [['', '선택하세요'], ['cuox', 'Cu → Cu²⁺ + 2e⁻ (산화)'], ['cured', 'Cu²⁺ + 2e⁻ → Cu (환원)'], ['feox', 'Fe → Fe²⁺ + 2e⁻ (산화)']];
  fillSel('plA', EQO, (v) => { S.pl.eq.a = v; }); fillSel('plB', EQO, (v) => { S.pl.eq.b = v; });
  fillSel('plC', [['', '선택하세요'], ['r', '(−)극은 환원 전극이라 Cu²⁺가 전자를 받아 구리로 석출되기 때문'], ['o', '(−)극은 산화 전극이라 구리가 녹아 나오기 때문'], ['n', '(−)극에는 전자가 없어서 열쇠가 보호되기 때문']], (v) => { S.pl.eq.c = v; });
  makeChips($('#anI'), [['0.25', '0.25 A'], ['0.5', '0.50 A'], ['1', '1.00 A']], (v) => anSetI(v));
  const sT = $('#sT');
  sT.addEventListener('input', () => { if (AN_T[+sT.value] !== S.an.t) anSetT(+sT.value); sT.style.setProperty('--pct', (+sT.value / 4 * 100) + '%'); });
  $('#tMinus').addEventListener('click', () => { Sound.tick(); anSetT(AN_T.indexOf(S.an.t) - 1); sT.value = AN_T.indexOf(S.an.t); });
  $('#tPlus').addEventListener('click', () => { Sound.tick(); anSetT(AN_T.indexOf(S.an.t) + 1); sT.value = AN_T.indexOf(S.an.t); });
  $('#bAnRec').addEventListener('click', anRecord);
  $('#bAnClear').addEventListener('click', () => { Sound.click(); S.an.pts = {}; updateCtl(); });
  fillSel('anRel', [['', '선택하세요'], ['p', '비례한다'], ['i', '반비례한다'], ['n', '관계가 없다']], (v) => { S.an.rel = v; });
  bindNum($('#anMc'), (v, ch) => { S.an.mc = v; markNum('anMc', near(v, 3.15, 0.15), ch, v); updateCtl(); });
  bindNum($('#anMe'), (v, ch) => { S.an.me = v; markNum('anMe', near(v, 6.3, 0.3), ch, v); updateCtl(); });
  makeChips($('#inSel'), INDK.map((k) => [k, IND[k].icon + ' ' + IND[k].name]), (v) => indPick(v));
  $('#bInReplay').addEventListener('click', () => { Sound.click(); S.ind.p = 0; });
  $('#bInWhy').addEventListener('click', () => { Sound.click(); S.ind.alWhy = !S.ind.alWhy; updateCtl(); });
  const RXO = [['', '선택하세요'], ['cuox', 'Cu → Cu²⁺ + 2e⁻'], ['cured', 'Cu²⁺ + 2e⁻ → Cu'], ['alred', 'Al³⁺ + 3e⁻ → Al'], ['alox', 'Al → Al³⁺ + 3e⁻'], ['oox', '2O²⁻ → O₂ + 4e⁻'], ['ored', 'O₂ + 4e⁻ → 2O²⁻']];
  ['inS1', 'inS2', 'inS3', 'inS4'].forEach((id, i) => fillSel(id, RXO, (v) => { S.ind.sel['abcd'[i]] = v; }));
  const USO = [['', '선택하세요'], ['u1', '전선 · 전자 부품용 고순도 구리'], ['u2', '캔 · 창틀 · 항공기 소재용 금속'], ['u3', '소독제 · 비누 · 종이 원료'], ['u4', '장식 · 부식 방지 표면 처리']];
  ['inU1', 'inU2', 'inU3', 'inU4'].forEach((id, i) => fillSel(id, USO, (v) => { S.ind.sel['efgh'[i]] = v; }));
  makeChips($('#prTab'), [['own', '✏️ 내 카드'], ['peer', '⭐ 동료 평가']], (v) => { S.sub.present = v; updateCtl(); });
  makeChips($('#prCase'), PRK.map((k) => [k, PRC[k].name]), (v) => prPick(v));
  ['prS1', 'prS2', 'prS3', 'prS4', 'prS5'].forEach((id, i) => $('#' + id).addEventListener('change', () => { const v = $('#' + id).value; S.pr.f[i] = v === '' ? null : +v; $('#' + id).classList.remove('ok', 'bad'); Sound.tick(); updateCtl(); }));
  makeChips($('#peSel'), PEER.map((c, i) => [String(i), (i + 1) + '. ' + c.title + ' (' + c.by + ')']), (v) => { S.pr.cur = +v; updateCtl(); });
  (function () {
    const box = $('#peRows'); box.innerHTML = '';
    CRIT.forEach((nm, j) => {
      const row = document.createElement('div'); row.className = 'star-row'; row.innerHTML = '<span class="lab">' + nm + '</span>';
      const bs = document.createElement('div'); bs.className = 'stars';
      for (let v = 1; v <= 5; v++) { const b = document.createElement('button'); b.type = 'button'; b.textContent = '★'; b.dataset.j = j; b.dataset.v = v; b.setAttribute('aria-label', nm + ' ' + v + '점'); b.addEventListener('click', () => peRate(S.pr.cur, j, v)); bs.appendChild(b); }
      row.appendChild(bs); box.appendChild(row);
    });
  })();

  function onLeave(m) { if (m === 'plate') { S.pl.drag = null; S.pl.sel = null; } }
  function uiExtra() {
    const pl = S.pl, a = S.an, n = S.ind, pr = S.pr;
    $('#bPlPow').textContent = pl.run ? '⏸ 전원 끄기' : '⚡ 전원 켜기'; $('#bPlPow').classList.toggle('btn-primary', !pl.run);
    markChips($('#anI'), String(a.I), {}); $('#oT').textContent = a.t + '분'; sT.value = AN_T.indexOf(a.t); sT.style.setProperty('--pct', (AN_T.indexOf(a.t) / 4 * 100) + '%');
    $('#tMinus').disabled = a.t <= 0; $('#tPlus').disabled = a.t >= 20;
    $('#anCnt').textContent = '기록한 점 : 0.50 A ' + anPts(0.5).filter((q) => [5, 10, 15, 20].indexOf(q.t) >= 0).length + ' / 4 · 0.25 A ' + anPts(0.25).length + '개';
    markChips($('#inSel'), n.k, n.viewed); $('#bInWhy').hidden = n.k !== 'al'; $('#bInWhy').textContent = n.alWhy ? '💡 설명 닫기' : '💡 왜 용융 상태일까?';
    markChips($('#prTab'), S.sub.present, {}); markChips($('#prCase'), pr.k, {}); markChips($('#peSel'), String(pr.cur), {});
    $$('#peRows .star-row').forEach((row, j) => $$('.stars button', row).forEach((b) => b.classList.toggle('on', +b.dataset.v <= (pr.r[pr.cur][j] || 0))));
  }
  function readouts() {
    const m = S.mode;
    if (m === 'plate') { const p = S.pl, md = plMode(); setRead('극 연결', md === 'good' ? '올바름 · 열쇠(−)' : md === 'bad' ? '잘못됨 · 열쇠(+)' : plN() < 4 ? '조립 ' + plN() + ' / 4' : '확인 필요', '전류', p.I.toFixed(2) + ' A', '도금', md === 'bad' ? '열쇠 ' + Math.round(p.pd * 100) + ' % 녹음' : Math.round(p.pc * 100) + ' %'); }
    else if (m === 'analysis') { const a = S.an; setRead('전류 · 시간', a.I.toFixed(2) + ' A · ' + a.t + '분', '석출 구리', f2(anMass()) + ' g', '기록한 점', Object.keys(a.pts).reduce((n, k) => n + a.pts[k].length, 0) + '개'); }
    else if (m === 'industry') { const n = S.ind; setRead('사례', IND[n.k].name, '읽은 사례', indNView() + ' / 4', '진행', Math.round(n.p * 100) + ' %'); }
    else { const r = S.pr; setRead('발표 카드', r.ownOk ? '완성' : r.k ? PRC[r.k].name + ' 작성 중' : '사례 선택 전', '동료 평가', peN() + ' / 12', '보고 있는 카드', S.sub.present === 'own' ? '내 카드' : PEER[r.cur].title); }
  }

  /* ================= 미션 ================= */
  const plEqOk = () => { const e = S.pl.eq; return e.a === 'cuox' && e.b === 'cured' && e.c === 'r'; };
  const indEqOk = () => { const s = S.ind.sel; return s.a === 'cuox' && s.b === 'cured' && s.c === 'oox' && s.d === 'alred'; };
  const indUseOk = () => { const s = S.ind.sel; return s.e === 'u1' && s.f === 'u2' && s.g === 'u3' && s.h === 'u4'; };
  const levels = [
    {
      title: '도금 실험: 열쇠에 구리 입히기', short: '도금 실험', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 철 열쇠에 구리를 입히려면 전원의 어느 극에 무엇을 연결해야 할까? 공장에서는 이 원리를 어디에 쓸까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 전기 분해는 (+)극에서 산화, (−)극에서 환원이 일어나고, 전지 반응과 반대 방향이라는 것을 알았어요. 이 원리로 금속 제품의 표면에 다른 금속을 입히는 것이 <b>전기 도금</b>이에요.</div>' +
        '<p>부품 카드를 끌어서 <b>구리 도금 장치</b>를 만들어요. 구리판과 철 열쇠를 어느 극에 연결할지 직접 정해요. 연결을 잘못하면 어떻게 될까요? <b>실험할 때는 보안경 · 장갑을 착용하고, 구리 폐액은 중금속 폐액으로 따로 모아요.</b></p>',
      features: ['plate'],
      setup() { plReset(); setScene('plate'); },
      recap: '도금할 물체를 (−)극(환원 전극)에 연결하고 도금 금속(구리판)을 (+)극(산화 전극)에 연결해요. (+)극에서 Cu가 녹아 Cu²⁺가 되고 (−)극에서 Cu²⁺가 구리로 석출되어서, 용액의 푸른색은 그대로예요.',
      summary: '<ul><li><b>구리 도금</b> (CuSO₄ 수용액) : (+)극 구리판 <b>Cu → Cu²⁺ + 2e⁻</b> (산화), (−)극 도금할 물체 <b>Cu²⁺ + 2e⁻ → Cu</b> (환원)</li><li>도금할 물체는 반드시 <b>(−)극(환원 전극)</b>에 연결해요. (+)극에 연결하면 열쇠의 철이 녹아요 (Fe → Fe²⁺ + 2e⁻).</li><li>녹아 나온 Cu²⁺ = 석출된 Cu²⁺ 이므로 용액의 푸른색(Cu²⁺ 농도)은 일정해요.</li><li>실험 안전 : 보안경 · 장갑 착용, 구리 폐액은 중금속 폐액으로 따로 수거해요.</li></ul>',
      missions: [
        {
          title: '올바르게 연결해 도금하기',
          goal: '부품 4개를 모두 놓고 열쇠를 알맞은 극에 연결해 <b>전원을 켜서</b> 열쇠가 구리로 완전히 덮이게 하세요.',
          hint: '구리판과 열쇠 카드를 끌어서 (−)극 · (+)극 자리에 놓아요 (카드를 누른 뒤 자리를 눌러도 돼요). 도금할 물체는 환원이 일어나는 (−)극이에요. 잘못 놓으면 끌어서 꺼낼 수 있어요.',
          setup() { S.gate = ''; plReset(); setScene('plate'); },
          check: () => S.pl.pc >= 0.95, hold: 0.8,
          status: () => '조립 ' + plN() + ' / 4 ' + mark(plN() === 4) + ' &nbsp; 연결 ' + mark(plMode() === 'good') + ' &nbsp; 도금 ' + Math.round(S.pl.pc * 100) + ' % ' + mark(S.pl.pc >= 0.95),
          explain: '열쇠를 (−)극에 연결하면 열쇠 표면에서 Cu²⁺가 전자를 받아 구리로 석출돼요(환원). (+)극의 구리판에서는 Cu가 녹아 Cu²⁺가 돼요(산화). 녹은 만큼 석출되므로 용액의 푸른색은 그대로예요. 열쇠를 (+)극에 연결하면 철이 녹아 버려요.',
        },
        {
          title: '극 반응식과 연결 까닭', manual: true,
          goal: '<b>(+)극 구리판</b>과 <b>(−)극 열쇠</b>에서 일어나는 반응식을 고르고, 도금할 물체를 <b>(−)극에 연결하는 까닭</b>을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '(+)극은 산화 전극이라 구리판의 Cu가 전자를 내놓아요. (−)극은 환원 전극이라 용액 속 Cu²⁺가 전자를 받아요. 까닭은 (−)극에서 어떤 반응이 일어나는지로 설명해요.',
          setup() { S.gate = 'plE'; S.pl.eq = { a: '', b: '', c: '' }; clearSel(['plA', 'plB', 'plC']); setScene('plate'); updateCtl(); },
          check() {
            const e = S.pl.eq; markSel(['plA', 'plB', 'plC'], [e.a === 'cuox', e.b === 'cured', e.c === 'r']);
            if (!e.a || !e.b || !e.c) return '세 칸을 모두 골라 주세요.';
            if (plEqOk()) return true;
            if (e.a !== 'cuox' || e.b !== 'cured') return '(+)극에서는 구리판이 전자를 내놓고, (−)극에서는 Cu²⁺가 전자를 받아요. e⁻의 위치를 확인해요.';
            return '(−)극에서 일어나는 반응이 산화인지 환원인지 생각해 보세요.';
          },
          status: () => '(+)극 ' + mark(S.pl.eq.a === 'cuox') + ' &nbsp; (−)극 ' + mark(S.pl.eq.b === 'cured') + ' &nbsp; 까닭 ' + mark(S.pl.eq.c === 'r'),
          explain: '(+)극 구리판 : <b>Cu → Cu²⁺ + 2e⁻</b> (산화), (−)극 열쇠 : <b>Cu²⁺ + 2e⁻ → Cu</b> (환원). 도금될 물체를 (−)극에 연결하는 까닭은 환원 전극에서 Cu²⁺가 환원되어 표면에 석출되기 때문이에요.',
        },
      ],
    },
    {
      title: '석출 분석: 전류와 시간', short: '석출 분석', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 도금하면 열쇠의 구리가 점점 두꺼워지는 것을 봤어요. 그렇다면 구리는 시간이 지날수록, 전류가 셀수록 얼마나 석출될까요?</div>' +
        '<p>전류와 시간을 바꿔 가며 <b>석출된 구리의 질량</b>을 기록해 그래프를 그려요 (실험 데이터를 쓰고 전하량 계산은 하지 않아요). 이어서 석출된 구리의 몰수로 <b>이동한 전자의 몰수</b>를 구해요 (Cu²⁺ + 2e⁻ → Cu).</p>',
      features: ['analysis'],
      setup() { S.an.pts = {}; S.an.t = 0; S.an.ts = 0; S.an.I = 0.5; setScene('analysis'); },
      recap: '석출되는 구리의 질량은 시간에 비례하고 전류에 비례해요. 구리 1 mol(63.5 g)이 석출될 때 전자 2 mol이 이동하므로, 석출된 구리의 몰수에 2를 곱하면 전자의 몰수예요.',
      summary: '<ul><li>0.50 A : 5 · 10 · 15 · 20분 → 석출 구리 <b>0.05 · 0.10 · 0.15 · 0.20 g</b> (시간에 비례, 원점을 지나는 직선)</li><li>전류를 0.25 A로 줄이면 같은 시간에 석출량이 <b>절반</b>, 전류를 두 배로 하면 석출량도 <b>두 배</b></li><li>구리 0.20 g은 63.5 g/mol로 나눈 값 <b>약 3.1×10⁻³ mol</b> → 전자는 2배인 <b>약 6.3×10⁻³ mol</b></li><li>Cu²⁺ + 2e⁻ → Cu : 전자 2 mol당 Cu 1 mol</li></ul>',
      missions: [
        {
          title: '그래프 그리고 비례 확인하기',
          goal: '전류 <b>0.50 A</b>에서 <b>5 · 10 · 15 · 20분</b>의 석출량을 모두 기록하고, <b>0.25 A</b>에서도 두 점 이상 기록한 뒤 시간과 석출량의 관계를 고르세요.',
          hint: '전류 단추와 시간 슬라이더를 맞춘 뒤 “📍 기록”을 눌러요. 점들이 원점을 지나는 직선 위에 놓이면 어떤 관계일까요?',
          setup() { S.gate = 'anA'; S.an.pts = {}; S.an.t = 0; S.an.ts = 0; S.an.I = 0.5; S.an.rel = ''; clearSel(['anRel']); setScene('analysis'); updateCtl(); },
          check: () => anOk50() && anOk25() && S.an.rel === 'p', hold: 0.6,
          status: () => '0.50 A ' + mark(anOk50()) + ' &nbsp; 0.25 A ' + mark(anOk25()) + ' &nbsp; 관계 ' + mark(S.an.rel === 'p'),
          explain: '0.50 A에서 5분마다 0.05 g씩 석출돼 점들이 원점을 지나는 직선 위에 놓여요 → 석출량은 시간에 <b>비례</b>해요. 전류를 0.25 A로 줄이면 기울기가 절반이 돼요.',
        },
        {
          title: '전자의 몰수 계산하기',
          goal: '0.50 A로 20분 동안 석출된 구리 <b>0.20 g</b>은 몇 mol일까요? 이때 이동한 <b>전자</b>는 몇 mol일까요? (Cu의 몰 질량 63.5 g/mol)',
          hint: '몰수는 질량을 몰 질량으로 나눈 값이에요. Cu²⁺ + 2e⁻ → Cu 이므로 전자의 몰수는 Cu의 몰수의 2배예요. 단위는 ×10⁻³ mol 로 써요.',
          setup() { S.gate = 'anB'; S.an.mc = NaN; S.an.me = NaN; clearNum(['anMc', 'anMe']); setScene('analysis'); updateCtl(); },
          check: () => near(S.an.mc, 3.15, 0.15) && near(S.an.me, 6.3, 0.3), hold: 0.6,
          status: () => 'Cu ' + (isNaN(S.an.mc) ? '—' : S.an.mc + '×10⁻³ mol') + ' ' + mark(near(S.an.mc, 3.15, 0.15)) + ' &nbsp; 전자 ' + (isNaN(S.an.me) ? '—' : S.an.me + '×10⁻³ mol') + ' ' + mark(near(S.an.me, 6.3, 0.3)),
          explain: 'Cu 0.20 g을 63.5 g/mol로 나누면 <b>3.1×10⁻³ mol</b>. Cu²⁺ + 2e⁻ → Cu 이므로 전자는 그 2배인 <b>약 6.3×10⁻³ mol</b>이에요.',
        },
        {
          type: 'quiz', title: '전류를 두 배로 하면',
          goal: '전류를 <b>두 배</b>로 하면 같은 시간에 석출되는 구리의 양은 어떻게 될까요? 그 까닭은?',
          setup() { S.gate = ''; setScene('analysis'); },
          choices: ['두 배가 돼요. 전류가 클수록 같은 시간에 이동하는 전자가 많아 환원되는 Cu²⁺도 많기 때문이에요', '변하지 않아요. 석출량은 시간만 정해요', '절반이 돼요. 전류가 크면 구리가 녹기 때문이에요', '네 배가 돼요. 전류가 제곱으로 작용하기 때문이에요'],
          answer: 0,
          feedback: ['', '실험 데이터에서 0.25 A → 0.50 A로 전류가 두 배가 되면 같은 시간의 석출량도 두 배가 됐어요.', '전류가 커도 (−)극에서는 Cu²⁺가 환원돼 석출량이 늘어요.', '전류와 석출량은 제곱이 아니라 비례 관계예요.'],
          explain: '전류가 클수록 같은 시간에 이동하는 <b>전자의 양이 많아져</b> 환원되는 Cu²⁺도 많아요. 그래서 석출량은 전류에 <b>비례</b>해요 (0.25 A : 0.50 A : 1.00 A = 1 : 2 : 4).',
        },
      ],
    },
    {
      title: '산업 조사: 전기 분해의 쓰임', short: '산업 조사', icon: '🏭', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 석출량이 전자의 몰수에 비례한다는 것을 알았어요. 공장에서는 같은 원리로 아주 많은 양을 만들어요.</div>' +
        '<p><b>구리 정련 · 알루미늄 제련 · 염소와 수산화 나트륨 생산 · 금속 도금</b> 네 사례 카드를 하나씩 열어 전해질 · 전극 · 반응식 · 생성물 · 쓰임을 읽고 정보 틀을 채워요. 알루미늄은 왜 수용액이 아닌 <b>용융 상태</b>에서 전기 분해할까요?</p>',
      features: ['industry'],
      setup() { S.ind.viewed = {}; indPick('refine'); setScene('industry'); },
      recap: '구리 정련은 (+)극 조동에서 Cu가 녹고 (−)극 순동에 구리가 석출돼요. 알루미늄은 수용액에서는 물이 먼저 환원되므로 용융 Al₂O₃에서 (−)극 Al³⁺ + 3e⁻ → Al로 얻어요. 염소 · 수산화 나트륨은 NaCl 수용액, 도금은 도금할 물체를 (−)극에 연결해요.',
      summary: '<ul><li><b>구리의 전해 정련</b> : (+)극 조동 Cu → Cu²⁺ + 2e⁻, (−)극 순동 Cu²⁺ + 2e⁻ → Cu (불순물은 슬라임으로 가라앉음) → 전선 · 전자 부품</li><li><b>알루미늄 제련</b> : 용융 Al₂O₃ 전기 분해, (−)극 Al³⁺ + 3e⁻ → Al (전자 3 mol당 Al 1 mol = 27 g), (+)극 2O²⁻ → O₂ + 4e⁻ → 전력 소모가 커서 재활용이 중요</li><li>Al³⁺는 수용액에서 물보다 환원되기 어려워서(E° −1.66 V &lt; 물 약 −0.83 V) <b>용융 상태</b>로 분해해요.</li><li><b>염소 · 수산화 나트륨</b> : NaCl 수용액 전기 분해 (이전 차시) / <b>금속 도금</b> : 니켈 · 크로뮴 · 금 등으로 장식 · 부식 방지</li></ul>',
      missions: [
        {
          title: '정보 틀 : 극 반응식 완성', manual: true,
          goal: '구리 정련과 알루미늄 제련의 사례 카드를 열어 읽고, 각 사례의 <b>(+)극 · (−)극 반응식</b>을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '위의 사례 단추를 눌러 네 카드를 모두 열어 봐요. (+)극은 산화(전자를 내놓음), (−)극은 환원(전자를 받음)이에요. 알루미늄 (+)극에서는 산화 이온이 전자를 내놓아요.',
          setup() { S.gate = 'inA'; S.ind.sel = { a: '', b: '', c: '', d: '', e: '', f: '', g: '', h: '' }; clearSel(['inS1', 'inS2', 'inS3', 'inS4', 'inU1', 'inU2', 'inU3', 'inU4']); setScene('industry'); updateCtl(); },
          check() {
            const s = S.ind.sel; markSel(['inS1', 'inS2', 'inS3', 'inS4'], [s.a === 'cuox', s.b === 'cured', s.c === 'oox', s.d === 'alred']);
            if (indNView() < 4) return '먼저 네 사례 카드를 모두 열어 읽어 보세요 (' + indNView() + ' / 4).';
            if (!s.a || !s.b || !s.c || !s.d) return '네 칸을 모두 골라 주세요.';
            if (indEqOk()) return true;
            return '(+)극은 산화, (−)극은 환원이에요. 구리 정련은 Cu 한 가지, 알루미늄은 O²⁻와 Al³⁺가 관여해요. e⁻의 위치를 확인해요.';
          },
          status: () => '카드 ' + indNView() + ' / 4 ' + mark(indNView() >= 4) + ' &nbsp; 구리 ' + mark(S.ind.sel.a === 'cuox' && S.ind.sel.b === 'cured') + ' &nbsp; 알루미늄 ' + mark(S.ind.sel.c === 'oox' && S.ind.sel.d === 'alred'),
          explain: '구리 정련 : (+)극 <b>Cu → Cu²⁺ + 2e⁻</b>, (−)극 <b>Cu²⁺ + 2e⁻ → Cu</b>. 알루미늄 제련 : (+)극 <b>2O²⁻ → O₂ + 4e⁻</b>, (−)극 <b>Al³⁺ + 3e⁻ → Al</b>. 알루미늄은 수용액에서는 물이 먼저 환원되므로 용융 상태에서 전기 분해해요.',
        },
        {
          title: '사례와 쓰임 짝짓기', manual: true,
          goal: '네 사례에서 얻는 물질이나 처리가 <b>어디에 쓰이는지</b> 짝지어 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사례 카드의 “쓰임” 칸을 다시 읽어 보세요. 구리 정련은 전기를 잘 통하는 순수한 구리가 필요한 곳, 알루미늄은 가벼운 금속이 필요한 곳이에요.',
          setup() { S.gate = 'inB'; setScene('industry'); updateCtl(); },
          check() {
            const s = S.ind.sel; markSel(['inU1', 'inU2', 'inU3', 'inU4'], [s.e === 'u1', s.f === 'u2', s.g === 'u3', s.h === 'u4']);
            if (!s.e || !s.f || !s.g || !s.h) return '네 칸을 모두 골라 주세요.';
            return indUseOk() ? true : '틀린 짝이 있어요. 사례 카드의 “쓰임” 칸을 다시 읽어 보세요.';
          },
          status: () => '짝 ' + ['e', 'f', 'g', 'h'].filter((k, i) => S.ind.sel[k] === ['u1', 'u2', 'u3', 'u4'][i]).length + ' / 4',
          explain: '구리 정련 → 전선 · 전자 부품용 고순도 구리, 알루미늄 제련 → 캔 · 창틀 · 항공기 소재, 염소 · 수산화 나트륨 → 소독제 · 비누 · 종이 원료, 금속 도금 → 장식 · 부식 방지.',
        },
        {
          type: 'quiz', title: '순동이 (−)극에 석출되는 까닭',
          goal: '구리 정련에서 <b>순수한 구리가 (−)극에 석출</b>되는 까닭은?',
          setup() { S.gate = ''; indPick('refine'); setScene('industry'); },
          choices: ['(−)극은 환원 전극이라 용액의 Cu²⁺가 전자를 받아 Cu로 석출되기 때문이에요', '(−)극에서 불순물이 전자를 받기 때문이에요', '(−)극은 산화 전극이라 Cu가 늘어나기 때문이에요', '조동이 (−)극으로 이동해 달라붙기 때문이에요'],
          answer: 0,
          feedback: ['', '불순물(금 · 은 등)은 (+)극에서 녹지 않고 슬라임으로 가라앉아요.', '(−)극은 환원 전극이에요. 산화는 (+)극의 조동에서 일어나요.', '조동의 Cu가 Cu²⁺로 녹아 나온 뒤, 이온이 (−)극에서 환원돼요.'],
          explain: '(+)극 조동에서 Cu만 Cu²⁺로 녹아 나오고(불순물은 슬라임), 이 Cu²⁺가 (−)극에서 전자를 받아 <b>순수한 구리</b>로 석출돼요.',
        },
      ],
    },
    {
      title: '발표 · 평가: 사례 카드 만들기', short: '발표·평가', icon: '🎤', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산업 현장의 전기 분해 사례를 조사했어요. 이제 한 사례를 골라 <b>발표 카드</b>로 정리하고, 다른 학생의 카드를 <b>동료 평가</b>해요.</div>' +
        '<p>발표 카드에는 <b>원리 한 문장 · 반응식 · 쓰임 · 장단점(환경) · 질문 하나</b>를 담아요. 동료 평가는 <b>정확성 · 이해하기 쉬움 · 근거 · 창의</b> 네 가지 기준으로 1 ~ 5점을 매겨요. 정확성은 반응식과 조건이 맞는지 따져서 매겨요.</p>',
      features: ['present'],
      setup() { S.sub.present = 'own'; setScene('present'); },
      recap: '전기 분해는 에너지를 많이 쓰지만, 구리 · 알루미늄 같은 금속을 얻고 표면을 보호하는 데 꼭 필요해요. 재활용하면 새로 전기 분해하는 일을 줄여 에너지를 아낄 수 있어요. 발표를 평가할 때는 정확성 · 이해하기 쉬움 · 근거 · 창의를 따져요.',
      summary: '<ul><li><b>발표 카드</b> : 원리 한 문장 · 반응식 · 쓰임 · 장단점/환경 · 질문 하나</li><li><b>동료 평가 루브릭</b> : 정확성 · 이해하기 쉬움 · 근거 · 창의 (각 1 ~ 5점)</li><li>알루미늄은 수용액이 아닌 <b>용융 Al₂O₃</b>를 전기 분해해요. 수용액을 쓴다는 설명은 틀려요.</li><li>전기 분해는 비자발적 반응이라 전기 에너지를 계속 공급해야 해서 에너지를 많이 쓰고, 재활용은 이 에너지를 아껴 줘요.</li></ul>',
      missions: [
        {
          title: '내 발표 카드 완성하기', manual: true,
          goal: '사례를 하나 고르고 <b>원리 · 반응식 · 쓰임 · 장단점(환경) · 질문</b> 다섯 칸을 채워 발표 카드를 완성한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사례 단추를 누르고 다섯 칸을 차례로 골라요. 반응식은 그 사례의 (−)극 또는 (+)극에서 실제로 일어나는 반응이에요. 질문은 마음에 드는 것을 고르면 돼요.',
          setup() { S.sub.present = 'own'; S.pr.ownOk = false; setScene('present'); updateCtl(); },
          check() { const r = prCheck(); if (r === true) { S.pr.ownOk = true; } return r; },
          status: () => (S.pr.k ? PRC[S.pr.k].name : '사례 선택 전') + ' ' + mark(!!S.pr.k) + ' &nbsp; 채운 칸 ' + [0, 1, 2, 3, 4].filter((i) => S.pr.f[i] != null && S.pr.f[i] !== '').length + ' / 5',
          explain: '좋은 발표 카드는 <b>원리를 한 문장</b>으로 말하고, 맞는 <b>반응식</b>과 <b>쓰임</b>, 장단점(환경), 친구들과 생각을 나눌 <b>질문</b>을 담아요.',
        },
        {
          title: '동료 카드 평가하기',
          goal: '샘플 카드 <b>3장</b>을 네 가지 기준(정확성 · 이해하기 쉬움 · 근거 · 창의)으로 모두 평가하세요. 정확성은 내용이 맞는지 따져서 매겨요.',
          hint: '동료 평가 탭에서 카드를 하나씩 읽고 별을 눌러요. 2번 카드의 원리 문장을 조심해서 읽어 보세요. 알루미늄을 얻는 조건이 맞을까요?',
          setup() { S.gate = ''; S.sub.present = 'peer'; S.pr.cur = 0; setScene('present'); updateCtl(); },
          check: () => peN() === 12 && peAccOk(), hold: 0.6,
          status: () => '평가 ' + peN() + ' / 12 ' + mark(peN() === 12) + ' &nbsp; 정확성 판단 ' + mark(peN() === 12 && peAccOk()),
          explain: '1번(구리 정련)과 3번(도금)은 반응식과 조건이 맞아요. 2번은 “알루미늄 이온 수용액”을 전기 분해한다고 했는데, 수용액에서는 물이 먼저 환원되어 알루미늄이 얻어지지 않아요. <b>용융 Al₂O₃</b>라고 고쳐야 해요. 이렇게 근거로 정확성을 따지는 것이 동료 평가예요.',
        },
        {
          type: 'quiz', title: '에너지와 재활용',
          goal: '알루미늄을 <b>재활용</b>하면 에너지를 아낄 수 있는 까닭은?',
          setup() { S.gate = ''; setScene('present'); },
          choices: ['전기 분해는 전기 에너지를 많이 쓰는 비자발적 반응인데, 재활용하면 광석에서 새로 전기 분해하는 일을 줄이기 때문이에요', '알루미늄은 전기 없이 저절로 만들어지기 때문이에요', '재활용하면 전기 분해가 더 빨리 일어나기 때문이에요', '알루미늄이 전기를 만들어 주기 때문이에요'],
          answer: 0,
          feedback: ['', '알루미늄 제련은 비자발적이라 전기 에너지를 계속 공급해야 해요.', '재활용은 반응 속도가 아니라 필요한 전기 분해의 양을 줄여요.', '알루미늄 제련은 전기를 쓰는 과정이에요.'],
          explain: '알루미늄 제련은 <b>비자발적 반응</b>이라 전기 에너지가 많이 필요해요. 이미 만들어진 알루미늄을 <b>재활용</b>하면 이 전기 분해를 새로 하지 않아도 되어 에너지를 크게 아낄 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-electroplating', mount: '#game', badge: '도금 박사', homeHref: '../../index.html#hr',
    featureLabels: { plate: '🧪 구리 도금 장치 조립 · 극 연결', analysis: '📈 전류 · 시간 · 석출 그래프', industry: '🏭 산업 사례 카드 4장', present: '🎤 발표 카드 · 동료 평가' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  plReset(); prFillOpts(); indPick('refine'); S.ind.viewed = {};
  setScene('plate');
  function stepAll1(dt) { stepPlate(dt); stepAnalysis(dt); stepIndustry(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'plate') drawPlate(t); else if (S.mode === 'analysis') drawAnalysis(t); else if (S.mode === 'industry') drawIndustry(t); else drawPresent(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, PL, plG, plTrayG, plPlace, plRemove, plPower, plReset, plMode, plN, plSlotAt, anLay, anSetT, anSetI, anRecord, anMass, indPick, indNView, prPick, prFillOpts, peRate, peN, IND, PRC, PEER, massCu,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
