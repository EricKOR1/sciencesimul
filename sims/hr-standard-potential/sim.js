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
  /* 전원 장치 : (+) 단자는 왼쪽 */
  function supplyDraw(x, y, V, on) {
    ctx.save();
    D.shadow(() => { D.roundRect(x - 40, y - 17, 80, 34, 8); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(x - 36, y - 12, 44, 24, 5); ctx.fillStyle = on ? '#052e16' : '#0f172a'; ctx.fill();
    T(x - 14, y + 5, V.toFixed(2) + 'V', 13, on ? '#4ade80' : '#64748b', 'center', 900);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + 16, y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(x + 31, y, 5, 0, TAU); ctx.fill();
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
     화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 표준 환원 전위 [12반응02-03]
     ① 모형: 기준 전극 (SHE = 0 V, Zn · Cu 와 연결)  ② 설명: 전위 표 읽기 (E° 세로 눈금, 환원극 · 산화극)
     ③ 분석: 전위차 계산 (E°cell = E°(환원극) − E°(산화극))  ④ 예측: 반응 예측 (E°cell > 0 이면 자발적)
     네른스트 식, E°와 ΔG · K의 관계, 비표준 농도는 다루지 않아요 (표준 상태 1 M · 1 기압 · 25 °C).
     ================================================================ */
  const MODE_LABEL = { she: '🧩 기준 전극', table: '📏 전위 표', calc: '🧮 전위차 계산', predict: '🎯 반응 예측' };
  const HC = [
    { k: 'Li', name: 'Li⁺/Li', E: -3.04 }, { k: 'Mg', name: 'Mg²⁺/Mg', E: -2.37 }, { k: 'Al', name: 'Al³⁺/Al', E: -1.66 },
    { k: 'Zn', name: 'Zn²⁺/Zn', E: -0.76 }, { k: 'Fe', name: 'Fe²⁺/Fe', E: -0.44 }, { k: 'H', name: '2H⁺/H₂', E: 0.00 },
    { k: 'Cu', name: 'Cu²⁺/Cu', E: 0.34 }, { k: 'Ag', name: 'Ag⁺/Ag', E: 0.80 }, { k: 'Cl', name: 'Cl₂/Cl⁻', E: 1.36 },
    { k: 'Mn', name: 'MnO₄⁻/Mn²⁺', E: 1.51 },
  ];
  const E0 = {}; HC.forEach((h) => { E0[h.k] = h.E; });
  const ecell = (red, ox) => Math.round((E0[red] - E0[ox]) * 100) / 100;
  const MT = {
    Zn: { c1: '#c5cdd8', c2: '#7d8899', ion: 'Zn²⁺', solc: '#dbeafe', sola: 0.3, icol: '#94a3b8', sol: 'ZnSO₄' },
    Mg: { c1: '#dbe5da', c2: '#8fa08f', ion: 'Mg²⁺', solc: '#dbeafe', sola: 0.3, icol: '#86efac', sol: 'MgSO₄' },
    Fe: { c1: '#a7adb6', c2: '#5f6670', ion: 'Fe²⁺', solc: '#cfeccb', sola: 0.4, icol: '#7fbf7a', sol: 'FeSO₄' },
    Cu: { c1: '#e0955a', c2: '#8f4b1e', ion: 'Cu²⁺', solc: '#3b9be0', sola: 0.6, icol: '#3b82c4', sol: 'CuSO₄' },
    Ag: { c1: '#e8ecf2', c2: '#9aa5b4', ion: 'Ag⁺', solc: '#dbeafe', sola: 0.3, icol: '#a8b3c4', sol: 'AgNO₃' },
  };
  const ELBL = { Zn: 'Zn²⁺/Zn', Mg: 'Mg²⁺/Mg', Fe: 'Fe²⁺/Fe', Cu: 'Cu²⁺/Cu', Ag: 'Ag⁺/Ag' };
  const PAIRS = [
    { k: 'ZnCu', ox: 'Zn', red: 'Cu' }, { k: 'CuAg', ox: 'Cu', red: 'Ag' }, { k: 'ZnAg', ox: 'Zn', red: 'Ag' },
    { k: 'MgCu', ox: 'Mg', red: 'Cu' }, { k: 'FeCu', ox: 'Fe', red: 'Cu' },
  ];
  const pairOf = (k) => PAIRS.find((p) => p.k === k);
  const pairName = (p) => p.ox + '–' + p.red;
  const RXN = [
    { k: 'r1', ox: 'Zn', red: 'Cu', eq: 'Zn + Cu²⁺ → Zn²⁺ + Cu', lab: 'Zn + Cu²⁺', note: '황산 구리(Ⅱ) 수용액에 Zn판', rdn: 'Zn', oxn: 'Cu²⁺', scene: 'zncu' },
    { k: 'r2', ox: 'Cu', red: 'Zn', eq: 'Cu + Zn²⁺ → Cu²⁺ + Zn', lab: 'Cu + Zn²⁺', note: '황산 아연 수용액에 Cu판', rdn: 'Cu', oxn: 'Zn²⁺', scene: 'cuzn' },
    { k: 'r3', ox: 'Zn', red: 'H', eq: 'Zn + 2H⁺ → Zn²⁺ + H₂', lab: 'Zn + 2H⁺', note: '묽은 염산에 Zn', rdn: 'Zn', oxn: 'H⁺', scene: 'znh' },
    { k: 'r4', ox: 'Cu', red: 'H', eq: 'Cu + 2H⁺ → Cu²⁺ + H₂', lab: 'Cu + 2H⁺', note: '묽은 염산에 Cu', rdn: 'Cu', oxn: 'H⁺', scene: 'cuh' },
    { k: 'r5', ox: 'Fe', red: 'Cu', eq: 'Fe + Cu²⁺ → Fe²⁺ + Cu', lab: 'Fe + Cu²⁺', note: '황산 구리(Ⅱ) 수용액에 철못', rdn: 'Fe', oxn: 'Cu²⁺', scene: 'fecu' },
    { k: 'r6', ox: 'Cu', red: 'Ag', eq: 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag', lab: 'Cu + 2Ag⁺', note: '질산 은 수용액에 구리선', rdn: 'Cu', oxn: 'Ag⁺', scene: 'cuag' },
  ];
  const rxnOf = (k) => RXN.find((r) => r.k === k);
  const rxE = (r) => ecell(r.red, r.ox);

  Object.assign(S, {
    mode: 'she', sub: {},
    sh: { metal: 'Zn', conn: 0, tested: {}, V: 0 },
    tb: { a: -1, b: -1, ya: 0, yb: 0, len: 0, judged: {}, last: null, shake: 0, needle: 0, seenPick: 0 },
    cc: { pair: 'ZnCu', done: {}, solved: 0, flow: 0, V: 0, red: NaN, ox: NaN, cell: NaN, mis: false, misK: 0 },
    pd: { k: 'r1', done: {}, p: 0, shake: 0, bar: 0, wrong: 0 },
  });

  /* ============ ① 기준 전극 ============ */
  function drawShe(t) {
    const s = S.sh, m = MT[s.metal];
    T(14, 26, '🧩 반쪽 전지 하나만으로는 전위를 잴 수 없어요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const isZn = s.metal === 'Zn', V = isZn ? 0.76 : 0.34;
    const k = sm(s.conn);
    const sheAfter = (g, bk, px, y0, y1, tt) => {
      ctx.save(); ctx.fillStyle = 'rgba(190,225,255,.22)'; ctx.strokeStyle = 'rgba(70,100,140,.55)'; ctx.lineWidth = 1.6;
      D.roundRect(px - 22, y0 + 6, 44, Math.max(10, y1 - y0 - 8), 8); ctx.fill(); ctx.stroke();
      const n = 5;
      for (let i = 0; i < n; i++) {
        const u = RM ? (i + 0.5) / n : ((tt * 0.55 + i / n) % 1), by = (y1 - 12) - (y1 - 12 - (y0 + 16)) * u;
        ctx.beginPath(); ctx.arc(px + (i % 2 ? 7 : -7) + Math.sin(tt * 3 + i) * 2, by, 3.2 - u, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(70,100,140,.5)'; ctx.stroke();
      }
      T(px, y0 + 22, 'H₂', 13, '#475569', 'center', 800);
      ctx.restore();
    };
    const st = {
      L: { plate: { c1: m.c1, c2: m.c2 }, sol: true, solc: m.solc, sola: m.sola, catc: m.icol, cat: 6, an: 6, name: s.metal + '판 · 1 M ' + m.ion, name2: '(1 M ' + m.sol + ')' },
      R: { plate: { c1: '#7b8794', c2: '#3b4452' }, sol: true, solc: '#fde2e2', sola: 0.28, catc: '#ef6b6b', cat: 8, an: 6, name: '표준 수소 전극', name2: 'Pt · H₂ 1기압 · 1 M H⁺', after: sheAfter },
      bridge: k, wire: k, V: V * k, vmax: 1.0, gaugeLabel: s.conn < 0.05 ? '— V' : (V * k).toFixed(2) + ' V', lit: 0, flow: k > 0.9 ? 1 : 0, dir: isZn ? 1 : -1, showDir: true,
      signs: k > 0.9 ? (isZn ? { L: '−', R: '+' } : { L: '+', R: '−' }) : null, device: (x, y) => bulbDraw(x, y, 0.15 * k),
    };
    st.device = (x, y) => bulbDraw(x, y, k > 0.9 ? 0.55 : 0);
    const g = drawCell(MAIN, st, t);
    if (s.conn < 0.05) { pill((g.cxL + g.cxR) / 2, g.apex + 8, '두 반쪽 전지를 아직 잇지 않았어요', { bg: '#fff7d6', color: '#7a4a00', border: '#f59e0b', size: 13.5 }); }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '표준 수소 전극(SHE) : 2H⁺ + 2e⁻ → H₂ , E° = 0.00 V 로 약속해요', PHONE ? 13.5 : 15.5, WARN, 'left', 800);
    let yy = INFO.y + 54;
    ['Zn', 'Cu'].forEach((mm) => {
      const r = s.tested[mm], Vv = mm === 'Zn' ? 0.76 : 0.34;
      const txt = r ? (mm === 'Zn' ? 'Zn – SHE : ' + f2(Vv) + ' V , (−)극 = Zn  →  E°(Zn²⁺/Zn) = ' + sgn2(-0.76) + ' V' : 'Cu – SHE : ' + f2(Vv) + ' V , (+)극 = Cu  →  E°(Cu²⁺/Cu) = ' + sgn2(0.34) + ' V') : mm + ' – SHE : 아직 측정하지 않았어요';
      yy += textBlock(INFO.x + 16, yy, INFO.w - 32, (r ? '✅ ' : '⬜ ') + txt, PHONE ? 13.5 : 14.5, r ? '#166534' : MUTED, 19, 800) + 5;
    });
    if (s.tested.Zn && s.tested.Cu) textBlock(INFO.x + 16, yy + 2, INFO.w - 32, '규칙 : SHE보다 (−)극 쪽 금속은 E° < 0 (산화되기 쉬움), (+)극 쪽 금속은 E° > 0 (환원되기 쉬움).', PHONE ? 13.5 : 14, '#5b21b6', 19, 800);
    else textBlock(INFO.x + 16, yy + 2, INFO.w - 32, '금속판을 바꿔 가며 SHE와 이어 전압과 (−)극 · (+)극 방향을 확인해요.', PHONE ? 13.5 : 14, MUTED, 19, 700);
  }
  function stepShe(dt) {
    const s = S.sh; s.conn = ap(s.conn, s.connGo ? 1 : 0, dt, 2.6); if (Math.abs(s.conn - (s.connGo ? 1 : 0)) < 0.004) s.conn = s.connGo ? 1 : 0;
    if (s.connGo && s.conn >= 0.95 && !s.tested[s.metal]) { s.tested[s.metal] = true; flash(MAIN.x + MAIN.w / 2, MAIN.y + 40, ['#fbbf24', '#8b5cf6', '#14a058']); updateCtl(); }
  }
  function sheMetal(m) { const s = S.sh; s.metal = m; s.connGo = false; s.conn = 0; updateCtl(); }
  function sheConn() { const s = S.sh; if (s.connGo) return; s.connGo = true; Sound.click(); updateCtl(); }

  /* ============ ② 전위 표 읽기 ============ */
  const tbLay = () => {
    if (PHONE) { const ay0 = MAIN.y + 34, ay1 = MAIN.y + MAIN.h - 26; return { axX: MAIN.x + 122, ay0, ay1, cx: MAIN.x + 196, cw: 262, ch: 30, cy0: MAIN.y + 26, rowH: (MAIN.h - 36) / 10 }; }
    const ay0 = MAIN.y + 30, ay1 = MAIN.y + MAIN.h - 22;
    return { axX: MAIN.x + 250, ay0, ay1, cx: MAIN.x + 400, cw: 300, ch: 25, cy0: MAIN.y + 20, rowH: (MAIN.h - 30) / 10 };
  };
  const EMIN = -3.4, EMAX = 1.8;
  const tbY = (E) => { const L = tbLay(); return L.ay0 + (E - EMIN) / (EMAX - EMIN) * (L.ay1 - L.ay0); };
  const tbCardY = (i) => { const L = tbLay(); return L.cy0 + L.rowH * (i + 0.5); };
  const tbCardRect = (i) => { const L = tbLay(); return { x: L.cx, y: tbCardY(i) - L.ch / 2, w: L.cw, h: L.ch }; };
  function tbPick(i) {
    const s = S.tb; s.last = null;
    if (s.a === i) { s.a = s.b; s.b = -1; } else if (s.b === i) { s.b = -1; }
    else if (s.a < 0) s.a = i; else if (s.b < 0) s.b = i; else { s.a = s.b; s.b = i; }
    Sound.tick(); updateCtl();
  }
  const tbKey = () => (S.tb.a >= 0 && S.tb.b >= 0 ? [HC[S.tb.a].k, HC[S.tb.b].k].sort().join('|') : '');
  function tbJudge(side) { // side 'a' | 'b' : 환원극이라고 답한 쪽
    const s = S.tb; if (s.a < 0 || s.b < 0) return;
    const ia = s.a, ib = s.b, redI = HC[ia].E > HC[ib].E ? ia : ib, pick = side === 'a' ? ia : ib;
    if (pick === redI) { s.judged[tbKey()] = true; s.last = { ok: true, red: redI, ox: redI === ia ? ib : ia }; Sound.click && Sound.click(); flash(tbLay().axX, tbY(HC[redI].E), ['#14a058', '#fbbf24', '#8b5cf6']); }
    else { s.last = { ok: false }; s.shake = 0.4; }
    updateCtl();
  }
  const tbNJ = () => Object.keys(S.tb.judged).length;
  function stepTable(dt) {
    const s = S.tb, L = tbLay();
    const ta = s.a >= 0 ? tbY(HC[s.a].E) : L.ay0, tb2 = s.b >= 0 ? tbY(HC[s.b].E) : L.ay0;
    s.ya = ap(s.ya, ta, dt, 8); s.yb = ap(s.yb, tb2, dt, 8);
    const tl = s.a >= 0 && s.b >= 0 ? Math.abs(HC[s.a].E - HC[s.b].E) : 0;
    s.len = ap(s.len, tl, dt, 5); if (Math.abs(s.len - tl) < 0.002) s.len = tl;
    s.shake = Math.max(0, s.shake - dt);
  }
  function drawTable(t) {
    const s = S.tb, L = tbLay();
    T(14, 26, '📏 표준 환원 전위(E°) 표 : 반쪽 전지를 두 개 골라 보세요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 축
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.axX, L.ay0 - 6); ctx.lineTo(L.axX, L.ay1 + 6); ctx.stroke();
    for (let v = -3; v <= 1; v++) {
      const y = tbY(v); ctx.beginPath(); ctx.moveTo(L.axX - 5, y); ctx.lineTo(L.axX + 5, y); ctx.stroke();
      T(L.axX - 9, y + 4.5, v === 0 ? '0 V' : (v < 0 ? MINUS : '+') + Math.abs(v), 13, v === 0 ? '#14a058' : MUTED, 'right', 800);
    }
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(20,160,88,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(L.axX - 6, tbY(0)); ctx.lineTo(L.cx - 4, tbY(0)); ctx.stroke(); ctx.restore();
    T(MAIN.x + 12, L.ay0 + 8, '▲ 센 환원제', 13.5, '#b91c1c', 'left', 800); T(MAIN.x + 12, L.ay0 + 25, '산화되기 쉬움', 13, '#b91c1c', 'left', 700);
    T(MAIN.x + 12, L.ay1 - 14, '▼ 센 산화제', 13.5, '#1d4ed8', 'left', 800); T(MAIN.x + 12, L.ay1 + 3, '환원되기 쉬움', 13, '#1d4ed8', 'left', 700);
    // 높이 차이 막대
    if (s.a >= 0 && s.b >= 0) {
      const yTop = Math.min(s.ya, s.yb), yBot = Math.max(s.ya, s.yb), bx = L.axX + 16;
      D.roundRect(bx - 5, yTop, 10, Math.max(2, yBot - yTop), 4); ctx.fillStyle = 'rgba(139,92,246,.35)'; ctx.fill(); ctx.strokeStyle = PUR; ctx.lineWidth = 1.6; ctx.stroke();
      const mid = (yTop + yBot) / 2;
      if (yBot - yTop > 4) pill(bx + 36, mid, 'ΔE = ' + f2(s.len) + ' V', { bg: '#ede9fe', color: '#5b21b6', border: '#a78bfa', size: 13 });
    }
    // 카드 + 이음선
    HC.forEach((h, i) => {
      const r = tbCardRect(i), selA = s.a === i, selB = s.b === i, y = tbY(h.E);
      const lastRed = s.last && s.last.ok && s.last.red === i, lastOx = s.last && s.last.ok && s.last.ox === i;
      const col = lastRed ? GOODC : lastOx ? RED : selA ? PUR : selB ? '#ea580c' : '#cbd5e1';
      ctx.strokeStyle = (selA || selB) ? col : 'rgba(148,163,184,.55)'; ctx.lineWidth = (selA || selB) ? 2.2 : 1.2;
      ctx.beginPath(); ctx.moveTo(L.axX, y); ctx.bezierCurveTo(L.axX + (r.x - L.axX) * 0.5, y, L.axX + (r.x - L.axX) * 0.5, r.y + r.h / 2, r.x - 3, r.y + r.h / 2); ctx.stroke();
      const pulse = (selA || selB) ? 1 + 0.12 * Math.sin(t * 5) : 1;
      D.sphere(L.axX, y, (selA || selB) ? 6.2 * pulse : 4.4, (selA || selB) ? col : '#64748b', { gloss: false });
      const sc = (selA || selB) ? 1.02 : 1, sh = s.shake > 0 && (selA || selB) ? Math.sin(s.shake * 50) * 3 : 0;
      ctx.save(); ctx.translate(r.x + r.w / 2 + sh, r.y + r.h / 2); ctx.scale(sc, sc);
      D.shadow(() => { D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 8); ctx.fillStyle = (selA || selB) ? '#faf5ff' : '#fff'; ctx.fill(); }, { blur: (selA || selB) ? 8 : 3, y: 1 });
      D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 8); ctx.strokeStyle = col; ctx.lineWidth = (selA || selB) ? 2.4 : 1.2; ctx.stroke();
      T(-r.w / 2 + 12, 5, h.name, PHONE ? 14 : 14.5, INK, 'left', 800);
      T(r.w / 2 - 12, 5, sgn2(h.E) + ' V', PHONE ? 14 : 14.5, h.E < 0 ? '#b91c1c' : h.E > 0 ? '#1d4ed8' : GOODC, 'right', 900);
      if (lastRed || lastOx) { const tg = lastRed ? '환원극(+)' : '산화극(−)'; const tw = textW(tg, 12.5, 800) + 12; D.roundRect(-r.w / 2 + (PHONE ? 100 : 118), -9, tw, 18, 9); ctx.fillStyle = lastRed ? GOODC : RED; ctx.fill(); T(-r.w / 2 + (PHONE ? 100 : 118) + tw / 2, 4.5, tg, 12.5, '#fff', 'center', 800); }
      ctx.restore();
    });
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const A = s.a >= 0 ? HC[s.a] : null, B = s.b >= 0 ? HC[s.b] : null;
    T(INFO.x + 16, INFO.y + 26, 'E°가 클수록 환원되기 쉽고(센 산화제), 작을수록 산화되기 쉬워요(센 환원제)', PHONE ? 13 : 15, WARN, 'left', 800);
    let msg, col = INK;
    if (!A) { msg = '카드를 두 장 눌러 비교해요. 두 반쪽 전지를 이으면 E°가 큰 쪽이 환원극((+)극), 작은 쪽이 산화극((−)극)이 돼요.'; col = MUTED; }
    else if (!B) { msg = A.name + ' (' + sgn2(A.E) + ' V) 를 골랐어요. 비교할 카드를 하나 더 골라요.'; }
    else if (s.last && s.last.ok) { const r = HC[s.last.red], o = HC[s.last.ox]; msg = '✅ 환원극 ' + r.name + ' (' + sgn2(r.E) + ' V) , 산화극 ' + o.name + ' (' + sgn2(o.E) + ' V)  →  E°cell = ' + sgn2(r.E) + ' − (' + sgn2(o.E) + ') = ' + sgn2(r.E - o.E) + ' V'; col = '#166534'; }
    else if (s.last && !s.last.ok) { msg = '아니에요. E°가 더 큰 쪽이 전자를 받는 환원극이에요. 눈금에서 더 아래에 있는 쪽이에요.'; col = '#b91c1c'; }
    else { msg = A.name + ' 와 ' + B.name + ' 중 어느 쪽이 환원극((+)극)일까요? 아래 단추로 답해요.'; }
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, msg, PHONE ? 14 : 15, col, 21, 800);
    textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 52 : 40), INFO.w - 32, '판정한 짝 : ' + tbNJ() + ' / 3 (서로 다른 짝 3개를 맞혀요)', 14, tbNJ() >= 3 ? '#166534' : MUTED, 19, 800);
  }

  /* ============ ③ 전위차 계산 ============ */
  function ccReset() { const c = S.cc; c.done = {}; c.solved = 0; c.mis = false; c.misK = 0; c.flow = 0; c.V = 0; c.red = NaN; c.ox = NaN; c.cell = NaN; clearNum(['ccRed', 'ccOx', 'ccCell']); }
  const ccP = () => pairOf(S.cc.pair);
  const ccTrue = () => { const p = ccP(); return { red: E0[p.red], ox: E0[p.ox], cell: ecell(p.red, p.ox) }; };
  function ccPick(k) { const c = S.cc; c.pair = k; c.solved = c.done[k] ? 1 : 0; c.mis = false; c.red = c.ox = c.cell = NaN; clearNum(['ccRed', 'ccOx', 'ccCell']); updateCtl(); }
  function ccCheck(ch) {
    const c = S.cc, T0 = ccTrue();
    const okR = near(c.red, T0.red, 0.006), okO = near(c.ox, T0.ox, 0.006), okC = near(c.cell, T0.cell, 0.006);
    markNum('ccRed', okR, ch, c.red); markNum('ccOx', okO, ch, c.ox); markNum('ccCell', okC, ch, c.cell);
    if (okR && okO && okC && !c.done[c.pair]) { c.done[c.pair] = true; c.solved = 1; flash(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h * 0.5, ['#14a058', '#fbbf24', '#8b5cf6']); Sound.click && Sound.click(); }
    updateCtl();
  }
  const ccNDone = () => Object.keys(S.cc.done).length;
  function stepCalc(dt) {
    const c = S.cc, ok = !!c.done[c.pair], T0 = ccTrue();
    c.flow = ap(c.flow, ok ? 1 : 0, dt, 3); c.V = ap(c.V, ok ? T0.cell : 0, dt, 5); c.misK = ap(c.misK, c.mis ? 1 : 0, dt, 6);
  }
  function eMini(x, y, w, keys, hl) {
    const cols = PHONE ? 3 : 5, gap = 6, cw = (w - gap * (cols - 1)) / cols, ch = PHONE ? 24 : 26;
    keys.forEach((k, i) => {
      const c = i % cols, r = Math.floor(i / cols), px = x + c * (cw + gap), py = y + r * (ch + 5);
      const on = hl && hl.indexOf(k) >= 0;
      D.roundRect(px, py, cw, ch, 8); ctx.fillStyle = on ? '#ede9fe' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = on ? PUR : '#cbd5e1'; ctx.lineWidth = on ? 2 : 1.2; ctx.stroke();
      const h = HC.find((q) => q.k === k);
      T(px + cw / 2, py + ch / 2 + 4.5, h.name + ' ' + sgn2(h.E), PHONE ? 12.5 : 13, INK, 'center', 800);
    });
    return Math.ceil(keys.length / cols) * (ch + 5);
  }
  function drawCalc(t) {
    const c = S.cc, p = ccP(), mo = MT[p.ox], mr = MT[p.red], T0 = ccTrue(), ok = !!c.done[c.pair];
    T(14, 26, '🧮 표에서 E°를 읽어 전지의 전위차를 계산해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const st = {
      L: { plate: { c1: mo.c1, c2: mo.c2 }, sol: true, solc: mo.solc, sola: mo.sola, catc: mo.icol, cat: 6, an: 6, name: p.ox + '판 · ' + mo.ion, name2: '(−)극 · 산화 전극' },
      R: { plate: { c1: mr.c1, c2: mr.c2 }, sol: true, solc: mr.solc, sola: mr.sola, catc: mr.icol, cat: 6, an: 6, name: p.red + '판 · ' + mr.ion, name2: '(+)극 · 환원 전극' },
      bridge: 1, wire: 1, V: c.V, vmax: 3.0, gaugeLabel: ok ? f2(c.V) + ' V' : '? V', lit: ok ? clamp(c.V / 2.0, 0.25, 1) * 0.9 : 0, flow: c.flow, dir: 1, showDir: ok, signs: { L: '−', R: '+' },
    };
    drawCell(MAIN, st, t);
    if (c.misK > 0.02) {
      ctx.save(); ctx.globalAlpha = c.misK;
      const w = Math.min(MAIN.w - 40, PHONE ? 300 : 360), x = MAIN.x + MAIN.w / 2 - w / 2, y = MAIN.y + MAIN.h * 0.36;
      panel(x, y, w, 76, 12, '#fff1f2'); D.roundRect(x, y, w, 76, 12); ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2; ctx.stroke();
      T(x + w / 2, y + 24, '2 × 0.80 − 0.34 = 1.26 V ?', 15.5, '#b91c1c', 'center', 800);
      T(x + w / 2, y + 46, '전압계는 0.46 V. 계수 2를 곱하면 안 돼요 ✗', 14, '#991b1b', 'center', 800);
      T(x + w / 2, y + 65, '전위는 입자 한 개당 “전자를 끌어당기는 정도”예요', 12.5, '#7f1d1d', 'center', 700);
      ctx.restore();
    }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const hl = [p.ox, p.red];
    const hh = eMini(INFO.x + 12, INFO.y + 10, INFO.w - 24, ['Mg', 'Zn', 'Fe', 'Cu', 'Ag'], hl);
    const fy = INFO.y + 10 + hh + 20;
    const f = ok ? 'E°cell = E°(환원극) − E°(산화극) = (' + sgn2(T0.red) + ') − (' + sgn2(T0.ox) + ') = ' + sgn2(T0.cell) + ' V' : 'E°cell = E°(환원극) − E°(산화극) = ( ? ) − ( ? ) = ?';
    textBlock(INFO.x + 16, fy, INFO.w - 32, f, PHONE ? 14 : 15.5, ok ? '#166534' : INK, 21, 800);
    textBlock(INFO.x + 16, fy + (PHONE ? 46 : 26), INFO.w - 32, ok ? '전자를 내놓는 ' + p.ox + '이 환원제, 전자를 받는 ' + mr.ion + '이 산화제예요. 전압계 눈금도 ' + f2(T0.cell) + ' V예요.' : '전지 ' + pairName(p) + ' : ' + p.ox + '판이 (−)극(산화), ' + p.red + '판이 (+)극(환원)이에요. 값을 읽어 적어요.', PHONE ? 13 : 14, ok ? '#166534' : MUTED, 19, 700);
  }

  /* ============ ④ 반응 예측 ============ */
  const pdR = () => rxnOf(S.pd.k);
  const pdNDone = () => Object.keys(S.pd.done).length;
  function pdPick(k) { const d = S.pd; d.k = k; d.p = d.done[k] ? 1 : 0; d.bar = d.done[k] ? rxE(rxnOf(k)) : 0; d.wrong = 0; updateCtl(); }
  function pdJudge(yes) {
    const d = S.pd, r = pdR(); if (d.done[r.k]) return;
    const sp = rxE(r) > 0;
    if (yes === sp) { d.done[r.k] = true; d.p = 0; Sound.click && Sound.click(); flash(MAIN.x + MAIN.w * 0.3, MAIN.y + 90, sp ? ['#14a058', '#fbbf24', '#8b5cf6'] : ['#94a3b8', '#cbd5e1']); }
    else { d.shake = 0.45; d.wrong++; showHint('E°cell = E°(환원극) − E°(산화극)을 계산해 부호를 확인해요.', 3600); }
    updateCtl();
  }
  function stepPredict(dt) {
    const d = S.pd, r = pdR(), done = !!d.done[r.k], sp = rxE(r) > 0;
    d.shake = Math.max(0, d.shake - dt);
    if (done && sp) d.p = Math.min(1, d.p + dt / 4.5);
    d.bar = ap(d.bar, done ? rxE(r) : 0, dt, 4);
  }
  function pdScene(r, d, t) {
    const done = !!d.done[r.k], sp = rxE(r) > 0, p = (done && sp) ? sm(d.p) : 0;
    const bw = PHONE ? 150 : 190, bh = PHONE ? 170 : 200;
    const bx = PHONE ? MAIN.x + MAIN.w / 2 - bw / 2 : MAIN.x + 60, by = MAIN.y + (PHONE ? 78 : 70);
    const sc = r.scene;
    let solc = '#dbeafe', sola = 0.3, solLab = '';
    if (sc === 'zncu' || sc === 'fecu') { solc = C.mix('#3b9be0', sc === 'fecu' ? '#cfe3d4' : '#cfe4f3', p * 0.8); sola = 0.6 - 0.3 * p; solLab = '0.1 M CuSO₄ 수용액'; }
    else if (sc === 'cuzn') { solLab = 'ZnSO₄ 수용액'; }
    else if (sc === 'znh' || sc === 'cuh') { solLab = '묽은 염산 (H⁺)'; solc = '#fde2e2'; sola = 0.25; }
    else if (sc === 'cuag') { solLab = 'AgNO₃ 수용액'; solc = C.mix('#dbeafe', '#9ecbf0', p * 0.9); sola = 0.3 + 0.1 * p; }
    const bk = beaker(bx, by, bw, bh, { level: 0.68, color: solc, alpha: sola, inside: (g) => {
      for (let i = 0; i < 6; i++) { const q = ballPos(g, i + 40, 5, 2, t); D.sphere(q[0], q[1], 4.4, ANC, { gloss: false }); }
      const ionc = sc === 'zncu' || sc === 'fecu' ? '#3b82c4' : sc === 'cuzn' ? '#94a3b8' : sc === 'cuag' ? '#a8b3c4' : '#ef6b6b';
      const nIon = Math.max(1, Math.round(6 * (1 - 0.7 * p)));
      for (let i = 0; i < nIon; i++) { const q = ballPos(g, i + 10, 5, 2, t); D.sphere(q[0], q[1], 5, ionc, { gloss: false }); }
    } });
    const cx = bx + bw / 2, topY = by - 40;
    // 막대 지지대
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 20, topY); ctx.lineTo(bx + bw + 20, topY); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx, bk.ly - 20); ctx.stroke();
    const yEnd = bk.bottom - 16;
    const solid = (w, c1, c2, shrink) => {
      const ww = w * (1 - (shrink || 0)), y0 = bk.ly - 20;
      const gr = ctx.createLinearGradient(cx - ww / 2, 0, cx + ww / 2, 0); gr.addColorStop(0, C.shade(c1, 0.2)); gr.addColorStop(0.5, c1); gr.addColorStop(1, c2);
      D.shadow(() => { D.roundRect(cx - ww / 2, y0, ww, yEnd - y0, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
      return { x: cx - ww / 2, y: y0, w: ww, h: yEnd - y0 };
    };
    const sub = (r0, col, a) => { const y = Math.max(r0.y, bk.ly); ctx.fillStyle = C.rgba(col, a); ctx.fillRect(r0.x - 1.5, y, r0.w + 3, r0.y + r0.h - y); };
    if (sc === 'zncu') { const r0 = solid(26, MT.Zn.c1, MT.Zn.c2, 0.15 * p); sub(r0, '#b45f2a', 0.95 * p); T(cx - bw / 2 - 6, topY - 8, '', 12); }
    else if (sc === 'cuzn') { solid(26, MT.Cu.c1, MT.Cu.c2, 0); }
    else if (sc === 'znh') { const r0 = solid(26, MT.Zn.c1, MT.Zn.c2, 0.3 * p); if (p > 0 || done) { /* 기포 */ } }
    else if (sc === 'cuh') { solid(26, MT.Cu.c1, MT.Cu.c2, 0); }
    else if (sc === 'fecu') { const r0 = solid(24, MT.Fe.c1, MT.Fe.c2, 0); sub(r0, '#b45f2a', 0.95 * p); }
    else if (sc === 'cuag') {
      const r0 = solid(14, MT.Cu.c1, MT.Cu.c2, 0.1 * p);
      ctx.save(); ctx.strokeStyle = 'rgba(235,240,246,' + (0.95 * p) + ')'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      const n = Math.round(14 * p);
      for (let i = 0; i < n; i++) { const yy = Math.max(r0.y, bk.ly) + 8 + (i / 14) * (yEnd - Math.max(r0.y, bk.ly) - 16), side = i % 2 ? 1 : -1, L2 = 10 + (i * 7) % 10; ctx.beginPath(); ctx.moveTo(cx + side * 6, yy); ctx.lineTo(cx + side * (6 + L2), yy - 8 - (i % 3) * 3); ctx.moveTo(cx + side * (6 + L2 * 0.5), yy - 4 - (i % 3)); ctx.lineTo(cx + side * (6 + L2 * 0.5 + 6), yy + 1); ctx.stroke(); }
      ctx.restore();
    }
    // 기포 (Zn + H⁺)
    if (sc === 'znh' && done && sp && p > 0.02) { ctx.save(); ctx.globalAlpha = Math.min(1, p * 4); ctx.beginPath(); ctx.rect(bk.ix, bk.ly - 30, bk.iw, bk.bottom - bk.ly + 30); ctx.clip(); bubbleUp(null, cx, yEnd - 8, bk.ly - 24, 7, t, 0.5, 4.2); ctx.restore(); }
    T(cx, by + bh + 22, solLab, PHONE ? 13 : 14, INK, 'center', 800);
    T(cx, topY - 10, r.note, PHONE ? 13 : 14, MUTED, 'center', 700);
    if (done && !sp) pill(cx, by + bh * 0.4, '변화 없음', { bg: '#f1f5f9', color: MUTED, border: '#94a3b8', size: 14 });
    return { bx, by, bw, bh, cx };
  }
  function drawPredict(t) {
    const d = S.pd, r = pdR(), done = !!d.done[r.k], E = rxE(r), sp = E > 0;
    T(14, 26, '🎯 E°cell 의 부호로 반응이 일어나는지 예측해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const sc = pdScene(r, d, t);
    // E°cell 막대 (−1.5 ~ +1.5)
    const bxs = PHONE ? MAIN.x + 24 : MAIN.x + 380, bws = PHONE ? MAIN.w - 48 : 360, bys = PHONE ? MAIN.y + MAIN.h - 56 : MAIN.y + 120, hh = 26;
    const x0 = bxs + bws / 2, half = bws / 2;
    T(bxs, bys - 20, 'E°cell (V)', 14, WARN, 'left', 800);
    D.roundRect(bxs, bys, bws, hh, 8); ctx.fillStyle = '#eef2f7'; ctx.fill();
    const wv = clamp(d.bar, -1.5, 1.5) / 1.5 * half;
    if (Math.abs(wv) > 0.5) { ctx.save(); D.roundRect(bxs, bys, bws, hh, 8); ctx.clip(); ctx.fillStyle = d.bar >= 0 ? '#22c55e' : '#ef4444'; ctx.fillRect(wv >= 0 ? x0 : x0 + wv, bys, Math.abs(wv), hh); ctx.restore(); }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, bys - 4); ctx.lineTo(x0, bys + hh + 4); ctx.stroke();
    [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].forEach((v) => { T(x0 + v / 1.5 * half, bys + hh + 16, v === 0 ? '0' : (v < 0 ? MINUS : '+') + Math.abs(v), 12.5, MUTED, 'center', 700); });
    T(bxs + bws, bys - 20, done ? sgn2(E) + ' V' : '? V', 17, done ? (sp ? '#166534' : '#b91c1c') : MUTED, 'right', 900);
    // 역할
    const ry = PHONE ? MAIN.y + MAIN.h - 130 : bys + 80;
    if (done) {
      if (sp) { T(bxs, ry, '자발적으로 일어나요 ○', 16, '#166534', 'left', 900); T(bxs, ry + 24, r.rdn + ' : 환원제 (산화돼요) , ' + r.oxn + ' : 산화제 (환원돼요)', PHONE ? 13 : 14, INK, 'left', 800); }
      else { T(bxs, ry, '자발적으로 일어나지 않아요 ×', 16, '#b91c1c', 'left', 900); T(bxs, ry + 24, '이 짝에서는 ' + r.rdn + '이 전자를 내놓지 못해요', PHONE ? 13 : 14, INK, 'left', 800); }
    } else T(bxs, ry, '아래 단추로 ○ / × 를 골라요', 15, MUTED, 'left', 800);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, r.eq, PHONE ? 15 : 17, INK, 'left', 900);
    const hh2 = eMini(INFO.x + 12, INFO.y + 36, INFO.w - 24, ['Zn', 'Fe', 'H', 'Cu', 'Ag'], [r.ox, r.red]);
    const msg = done ? 'E°cell = E°(' + HC.find((q) => q.k === r.red).name + ') − E°(' + HC.find((q) => q.k === r.ox).name + ') = ' + sgn2(E0[r.red]) + ' − (' + sgn2(E0[r.ox]) + ') = ' + sgn2(E) + ' V' : '환원극과 산화극을 찾아 E°cell 부호를 계산해 보세요. 판정한 반응 ' + pdNDone() + ' / 6';
    textBlock(INFO.x + 16, INFO.y + 36 + hh2 + 18, INFO.w - 32, msg, PHONE ? 13.5 : 14.5, done ? (sp ? '#166534' : '#b91c1c') : MUTED, 20, 800);
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'table') { for (let i = 0; i < HC.length; i++) if (pointInRect(p, tbCardRect(i))) { tbPick(i); return false; } }
      return false;
    },
    move() {}, up() {},
    hover(p) { if (S.mode === 'table') { for (let i = 0; i < HC.length; i++) if (pointInRect(p, tbCardRect(i))) return 'pointer'; } return 'default'; },
  });

  /* ---------- 조작 장치 ---------- */
  makeChips($('#shSel'), [['Zn', 'Zn판 (Zn²⁺/Zn)'], ['Cu', 'Cu판 (Cu²⁺/Cu)']], (v) => sheMetal(v));
  $('#bShConn').addEventListener('click', sheConn);
  $('#tbJa').addEventListener('click', () => tbJudge('a')); $('#tbJb').addEventListener('click', () => tbJudge('b'));
  $('#tbClear').addEventListener('click', () => { Sound.click(); const s = S.tb; s.a = s.b = -1; s.last = null; updateCtl(); });
  makeChips($('#ccSel'), PAIRS.map((p) => [p.k, pairName(p)]), (v) => ccPick(v));
  bindNum($('#ccRed'), (v, ch) => { S.cc.red = v; ccCheck(ch); });
  bindNum($('#ccOx'), (v, ch) => { S.cc.ox = v; ccCheck(ch); });
  bindNum($('#ccCell'), (v, ch) => { S.cc.cell = v; ccCheck(ch); });
  $('#bCcMis').addEventListener('click', () => { Sound.click(); S.cc.mis = !S.cc.mis; updateCtl(); });
  makeChips($('#pdSel'), RXN.map((r) => [r.k, r.lab]), (v) => pdPick(v));
  $('#bPdYes').addEventListener('click', () => pdJudge(true)); $('#bPdNo').addEventListener('click', () => pdJudge(false));

  function uiExtra() {
    const sh = S.sh, tb = S.tb, cc = S.cc, pd = S.pd;
    markChips($('#shSel'), sh.metal, sh.tested);
    $('#bShConn').disabled = !!(sh.connGo && sh.conn >= 0.95); $('#bShConn').textContent = sh.connGo ? '✔ 연결했어요' : '🔌 표준 수소 전극과 연결';
    const A = tb.a >= 0 ? HC[tb.a] : null, B = tb.b >= 0 ? HC[tb.b] : null;
    $('#tbJa').textContent = A ? A.name + ' 이(가) 환원극' : '(첫째 카드)'; $('#tbJb').textContent = B ? B.name + ' 이(가) 환원극' : '(둘째 카드)';
    $('#tbJa').disabled = !(A && B); $('#tbJb').disabled = !(A && B);
    $('#tbSel').textContent = A && B ? '선택 : ' + A.name + ' , ' + B.name : A ? '선택 : ' + A.name + ' (하나 더 고르세요)' : '표의 카드를 눌러 두 개를 골라요';
    markChips($('#ccSel'), cc.pair, cc.done);
    $('#bCcMis').hidden = !(cc.pair === 'CuAg' && cc.done.CuAg); $('#bCcMis').textContent = cc.mis ? '🧮 설명 닫기' : '🧮 계수 2를 곱하면?';
    markChips($('#pdSel'), pd.k, pd.done);
    const dn = !!pd.done[pd.k]; $('#bPdYes').disabled = dn; $('#bPdNo').disabled = dn;
    $('#ccCnt').textContent = '계산한 전지 ' + ccNDone() + ' / 3 (다른 전지도 계산해 봐요)';
  }
  function readouts() {
    const m = S.mode;
    if (m === 'she') { const s = S.sh; setRead('반쪽 전지', s.metal + ' – SHE', '전압', s.conn < 0.05 ? '—' : f2((s.metal === 'Zn' ? 0.76 : 0.34) * sm(s.conn)) + ' V', '측정한 금속', Object.keys(s.tested).length + ' / 2'); }
    else if (m === 'table') { const s = S.tb, A = s.a >= 0 ? HC[s.a] : null, B = s.b >= 0 ? HC[s.b] : null; setRead('선택한 반쪽 전지', A ? (B ? A.name + ' , ' + B.name : A.name) : '—', 'ΔE', A && B ? f2(Math.abs(A.E - B.E)) + ' V' : '—', '판정한 짝', tbNJ() + ' / 3'); }
    else if (m === 'calc') { const c = S.cc, p = ccP(); setRead('전지', pairName(p), 'E°cell', c.done[c.pair] ? sgn2(ccTrue().cell) + ' V' : '?', '계산한 전지', ccNDone() + ' / 3'); }
    else { const d = S.pd, r = pdR(); setRead('반응', r.lab, 'E°cell', d.done[r.k] ? sgn2(rxE(r)) + ' V' : '?', '판정한 반응', pdNDone() + ' / 6'); }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '기준 전극: 0 V 를 정하다', short: '기준 전극', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 전지의 전압은 어떻게 정해질까? 금속 이름만 알면 전압을 미리 계산할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 다니엘 전지는 Zn–Cu 1.10 V, Cu–Ag 0.46 V, Zn–Ag 1.56 V였어요. 그 값을 미리 계산하려면 금속마다 “전자를 끌어당기는 정도”를 숫자로 나타내야 해요.</div>' +
        '<p>그런데 반쪽 전지 하나의 전위는 <b>혼자서는 잴 수 없어요</b>. 반드시 다른 반쪽 전지와 이어야 전압이 나와요. 그래서 <b>표준 수소 전극(SHE)</b>의 전위를 <b>0 V</b>로 약속하고, Zn · Cu 반쪽 전지를 SHE와 이어 값을 정해요.</p>',
      features: ['she'],
      setup() { setScene('she'); },
      recap: '반쪽 전지의 전위는 혼자 잴 수 없어서 표준 수소 전극(SHE, 0.00 V)을 기준으로 정해요. SHE보다 (−)극 쪽 금속은 E°가 음수, (+)극 쪽 금속은 E°가 양수예요.',
      summary: '<ul><li><b>표준 수소 전극(SHE)</b> : 2H⁺ + 2e⁻ → H₂ , E° = <b>0.00 V</b> (1 M H⁺, H₂ 1 기압, 25 °C로 약속)</li><li>Zn–SHE 전지 <b>0.76 V</b>, Zn이 (−)극 → E°(Zn²⁺/Zn) = <b>−0.76 V</b> / Cu–SHE 전지 <b>0.34 V</b>, Cu가 (+)극 → E°(Cu²⁺/Cu) = <b>+0.34 V</b></li><li><b>표준 환원 전위 E°</b> : 반쪽 전지의 환원 전위를 SHE 기준으로 나타낸 값 (표준 상태 1 M · 1 기압 · 25 °C)</li><li>부호 규칙 : SHE보다 (−)극 쪽 → E° &lt; 0 (산화되기 쉬움), (+)극 쪽 → E° &gt; 0 (환원되기 쉬움)</li></ul>',
      missions: [
        {
          title: 'Zn · Cu 를 SHE 와 이어 보기',
          goal: 'Zn판과 Cu판을 각각 <b>표준 수소 전극과 연결</b>해 전압과 (−)극 · (+)극 방향을 확인하세요.',
          hint: '금속판 단추를 골라 “표준 수소 전극과 연결”을 눌러요. 금속을 바꾼 뒤에도 한 번 더 연결해요. 전자 알갱이가 가는 방향과 극 표시를 보세요.',
          setup() { setScene('she'); },
          check: () => !!(S.sh.tested.Zn && S.sh.tested.Cu), hold: 0.6,
          status: () => 'Zn–SHE ' + mark(S.sh.tested.Zn) + ' &nbsp; Cu–SHE ' + mark(S.sh.tested.Cu),
          explain: 'Zn–SHE 전지에서는 Zn이 (−)극(산화), SHE가 (+)극이고 전압은 0.76 V예요. Cu–SHE 전지에서는 Cu가 (+)극(환원), SHE가 (−)극이고 전압은 0.34 V예요. SHE를 0 V로 놓았으니 E°(Zn²⁺/Zn) = −0.76 V, E°(Cu²⁺/Cu) = +0.34 V예요.',
        },
        {
          type: 'quiz', title: 'Zn 의 E° 가 −0.76 V 인 까닭',
          goal: 'Zn²⁺/Zn 의 표준 환원 전위가 <b>−0.76 V</b> 인 까닭으로 알맞은 것은?',
          setup() { setScene('she'); },
          choices: ['Zn이 SHE보다 환원되기 어렵고(산화되기 쉽고), Zn판이 (−)극이 되기 때문이에요', 'Zn판의 질량이 줄어들기 때문이에요', 'Zn이 SHE보다 환원되기 쉬워서 (+)극이 되기 때문이에요', 'Zn 반쪽 전지의 전압이 0.76 V보다 작아서예요'],
          answer: 0,
          feedback: ['', '질량 변화는 E°의 부호를 정하는 기준이 아니에요. SHE와 이었을 때 어느 쪽이 (−)극인지가 기준이에요.', '(+)극이면 SHE보다 환원되기 쉬워서 E°가 양수예요. Zn은 (−)극이었어요.', '0.76 V는 SHE와 이었을 때의 전압이에요. 부호는 극의 방향에서 정해요.'],
          explain: 'SHE와 이으면 Zn이 전자를 내놓는 (−)극이 돼요. Zn이 수소 이온보다 <b>환원되기 어렵다(산화되기 쉽다)</b>는 뜻이라서 E°(Zn²⁺/Zn) = <b>−0.76 V</b>로 나타내요.',
        },
      ],
    },
    {
      title: '전위 표 읽기: 위쪽은 센 환원제', short: '전위 표 읽기', icon: '📏', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> SHE를 0 V로 놓고 Zn은 −0.76 V, Cu는 +0.34 V로 정했어요. 다른 금속과 이온도 같은 방법으로 값을 정해 한 장의 표로 모을 수 있어요.</div>' +
        '<p>표준 환원 전위(E°)를 <b>세로 눈금</b>으로 놓으면, 위쪽(작은 E°)은 <b>산화되기 쉬운 센 환원제</b>, 아래쪽(큰 E°)은 <b>환원되기 쉬운 센 산화제</b>예요. 두 반쪽 전지를 고르면 <b>E°가 큰 쪽이 환원극((+)극)</b>, 작은 쪽이 산화극((−)극)이에요.</p>',
      features: ['table'],
      setup() { setScene('table'); },
      recap: 'E°가 클수록 환원되기 쉬운 센 산화제, 작을수록 산화되기 쉬운 센 환원제예요. 두 반쪽 전지를 이으면 E°가 큰 쪽이 환원극((+)극), 작은 쪽이 산화극((−)극)이에요.',
      summary: '<table class="mini"><tr><th>반쪽 전지</th><th>E° (V)</th><th>반쪽 전지</th><th>E° (V)</th></tr><tr><td>Li⁺/Li</td><td>−3.04</td><td>Cu²⁺/Cu</td><td>+0.34</td></tr><tr><td>Mg²⁺/Mg</td><td>−2.37</td><td>Ag⁺/Ag</td><td>+0.80</td></tr><tr><td>Al³⁺/Al</td><td>−1.66</td><td>Cl₂/Cl⁻</td><td>+1.36</td></tr><tr><td>Zn²⁺/Zn</td><td>−0.76</td><td>MnO₄⁻/Mn²⁺</td><td>+1.51</td></tr><tr><td>Fe²⁺/Fe</td><td>−0.44</td><td>2H⁺/H₂</td><td>0.00</td></tr></table><ul><li>E°가 <b>작을수록</b> 산화되기 쉬움(센 환원제), <b>클수록</b> 환원되기 쉬움(센 산화제)</li><li>두 반쪽 전지를 이으면 E°가 큰 쪽이 <b>환원극((+)극)</b>, 작은 쪽이 <b>산화극((−)극)</b></li><li>가장 센 환원제 Li(맨 위), 가장 센 산화제 MnO₄⁻(맨 아래)</li></ul>',
      missions: [
        {
          title: '환원극과 산화극 판정하기',
          goal: '표에서 반쪽 전지를 <b>두 개</b> 눌러 고르고, 어느 쪽이 <b>환원극</b>인지 답하세요. 서로 다른 짝으로 <b>3번</b> 맞혀요.',
          hint: '카드를 눌러 두 장을 고른 뒤 아래 단추를 눌러요. E°가 더 큰(눈금에서 더 아래에 있는) 쪽이 환원극이에요. 같은 짝은 한 번만 세요.',
          setup() { S.gate = 'tb'; const s = S.tb; s.a = s.b = -1; s.last = null; s.judged = {}; setScene('table'); updateCtl(); },
          check: () => tbNJ() >= 3, hold: 0.5,
          status: () => '맞힌 짝 ' + tbNJ() + ' / 3 ' + mark(tbNJ() >= 3),
          explain: '두 반쪽 전지를 이으면 전자를 더 잘 끌어당기는 쪽, 곧 <b>E°가 큰 쪽이 환원극((+)극)</b>이 되고 E°가 작은 쪽이 산화극((−)극)이 돼요. 눈금에서 아래쪽이 환원극이에요.',
        },
        {
          type: 'quiz', title: '가장 센 환원제와 산화제',
          goal: '표에서 <b>가장 센 환원제</b>와 <b>가장 센 산화제</b>는 각각 어디에 있을까요?',
          setup() { S.gate = ''; setScene('table'); },
          choices: ['Li가 맨 위(E° 가장 작음), MnO₄⁻가 맨 아래(E° 가장 큼)', 'Li가 맨 아래, MnO₄⁻가 맨 위', 'Ag⁺가 맨 위, Zn이 맨 아래', 'H₂가 가장 센 환원제이고 Cl₂가 가장 센 산화제'],
          answer: 0,
          feedback: ['', 'E°가 작을수록 산화되기 쉬워요. Li는 E°가 −3.04 V로 가장 작아서 맨 위에 있어요.', '가장 작은 E°는 Li(−3.04 V), 가장 큰 E°는 MnO₄⁻(+1.51 V)예요.', 'H₂(0.00 V)는 중간쯤이에요. 표 전체에서 가장 작은 값과 가장 큰 값을 찾아보세요.'],
          explain: '<b>Li</b>는 E°가 −3.04 V로 가장 작아 가장 산화되기 쉬운(센 환원제) 맨 위에, <b>MnO₄⁻</b>는 +1.51 V로 가장 커서 가장 환원되기 쉬운(센 산화제) 맨 아래에 있어요.',
        },
      ],
    },
    {
      title: '전위차 계산: E°cell', short: '전위차 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 반쪽 전지를 이으면 E°가 큰 쪽이 환원극, 작은 쪽이 산화극이라는 것을 알았어요. 눈금 사이의 거리가 곧 전지의 전압이에요.</div>' +
        '<p>전지의 표준 전위차는 <b>E°cell = E°(환원극) − E°(산화극)</b>으로 계산해요. 표에서 값을 읽어 앞 차시에서 측정한 1.10 V · 0.46 V · 1.56 V를 직접 계산해 봐요. 반쪽 반응식에 계수가 있어도 E°에 곱하지 않아요.</p>',
      features: ['calc'],
      setup() { ccReset(); setScene('calc'); },
      recap: 'E°cell = E°(환원극) − E°(산화극)이에요. E°는 입자 한 개당 전자를 끌어당기는 정도라서 반응식의 계수를 곱하지 않아요. 계산값은 앞 차시에서 잰 전압과 같아요.',
      summary: '<ul><li><b>E°cell = E°(환원극) − E°(산화극)</b> (표준 상태, 계수를 곱하지 않음)</li><li>Zn–Cu : 0.34 − (−0.76) = <b>1.10 V</b> · Cu–Ag : 0.80 − 0.34 = <b>0.46 V</b> · Zn–Ag : 0.80 − (−0.76) = <b>1.56 V</b></li><li>Mg–Cu : 0.34 − (−2.37) = <b>2.71 V</b> · Fe–Cu : 0.34 − (−0.44) = <b>0.78 V</b></li><li>Cu–Ag 전지에서 Ag⁺ 계수가 2여도 E°(Ag⁺/Ag)는 0.80 V 그대로예요 (2 × 0.80 − 0.34 = 1.26 V는 틀려요).</li></ul>',
      missions: [
        {
          title: '전위차 세 개 계산하기',
          goal: '전지를 고르고 <b>E°(환원극), E°(산화극), E°cell</b>을 모두 맞게 적으세요. 서로 다른 전지 <b>3개</b>를 계산해요.',
          hint: '아래쪽 표에서 값을 읽어요. 환원극은 E°가 큰 쪽 금속, 산화극은 작은 쪽 금속이에요. 음수는 −를 붙여 적어요. 예 : −0.76',
          setup() { S.gate = 'cc'; setScene('calc'); updateCtl(); },
          check: () => ccNDone() >= 3, hold: 0.6,
          status: () => '맞게 계산한 전지 ' + ccNDone() + ' / 3 ' + mark(ccNDone() >= 3) + ' &nbsp; 지금 : ' + (S.cc.done[S.cc.pair] ? '✅' : '⬜') + ' ' + pairName(ccP()),
          explain: 'E°cell = E°(환원극) − E°(산화극). Zn–Cu = 0.34 − (−0.76) = 1.10 V, Cu–Ag = 0.80 − 0.34 = 0.46 V, Zn–Ag = 1.56 V, Mg–Cu = 2.71 V, Fe–Cu = 0.78 V. 앞 차시의 측정값과 같아요.',
        },
        {
          type: 'quiz', title: '전위차가 가장 큰 조합',
          goal: '다섯 전지 Zn–Cu, Cu–Ag, Zn–Ag, Mg–Cu, Fe–Cu 중 <b>전위차가 가장 큰</b> 조합은?',
          setup() { S.gate = ''; setScene('calc'); },
          choices: ['Zn–Cu (1.10 V)', 'Zn–Ag (1.56 V)', 'Mg–Cu (2.71 V)', 'Fe–Cu (0.78 V)'],
          answer: 2,
          feedback: ['Mg–Cu는 0.34 − (−2.37) = 2.71 V예요. 두 눈금 사이가 가장 멀어요.', 'Zn–Ag는 1.56 V예요. 더 큰 조합이 있어요.', '', 'Fe–Cu는 0.78 V로 가장 작은 편이에요.'],
          explain: '눈금(E°) 사이의 거리가 멀수록 전위차가 커요. Mg(−2.37 V)와 Cu(+0.34 V)의 거리는 <b>2.71 V</b>로 다섯 조합 중 가장 커요.',
        },
        {
          type: 'quiz', title: 'Ag⁺ 의 E° 를 두 배 하지 않는 까닭',
          goal: 'Cu–Ag 전지에서 Ag⁺ 반쪽 반응식의 계수는 2예요. 그래도 E°(Ag⁺/Ag)를 <b>두 배로 하지 않는</b> 까닭은?',
          setup() { S.gate = 'cc'; ccPick('CuAg'); setScene('calc'); },
          choices: ['E°는 입자 한 개당 전자를 끌어당기는 정도라서 반응식의 계수와 상관없어요', 'Ag는 전자를 하나만 받을 수 있어서 계수를 곱할 수 없어요', '계수를 곱하면 1.26 V가 되어 전압계 값과 같아지기 때문이에요', 'E°는 항상 0.80 V로 고정이라서 바꿀 수 없어요'],
          answer: 0,
          feedback: ['', '전자가 몇 개 오가는지는 계수로 나타내지만, E°(세기)에는 곱하지 않아요.', '계수를 곱한 1.26 V는 전압계 값 0.46 V와 달라서 틀려요.', 'E°는 물질마다 정해진 값이지만 이유는 “세기 성질”이기 때문이에요.'],
          explain: 'E°는 <b>세기 성질</b>이에요. 전자가 2개 오가도 입자 하나가 전자를 끌어당기는 정도는 같아서 2 × 0.80을 하지 않아요. Cu–Ag 전지의 E°cell은 0.80 − 0.34 = <b>0.46 V</b>예요.',
        },
      ],
    },
    {
      title: '반응 예측: 일어날까, 아닐까', short: '반응 예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> E°cell = E°(환원극) − E°(산화극)을 계산했어요. 이 값이 양수이면 전지에서 반응이 자발적으로 일어나 전류를 내요.</div>' +
        '<p><b>E°cell &gt; 0</b>이면 그 산화·환원 반응은 <b>자발적으로 일어나고</b>, <b>E°cell &lt; 0</b>이면 일어나지 않아요. 여섯 가지 반응을 E°로 예측한 뒤 결과를 확인해요. 같은 물질이 상대에 따라 <b>산화제도 환원제도</b> 될 수 있다는 것도 알아봐요.</p>',
      features: ['predict'],
      setup() { setScene('predict'); },
      recap: 'E°cell > 0 이면 자발적이에요. 산화제 · 환원제는 정해진 물질이 아니라 상대에 따라 달라져요. Cu²⁺는 Zn에게 산화제, Cu는 Ag⁺에게 환원제예요.',
      summary: '<ul><li>E°cell &gt; 0 → 자발적, E°cell &lt; 0 → 비자발적</li><li>Zn + Cu²⁺ : <b>+1.10 V ○</b> · Cu + Zn²⁺ : <b>−1.10 V ×</b></li><li>Zn + 2H⁺ : <b>+0.76 V ○</b> (Zn은 묽은 염산에 녹아요) · Cu + 2H⁺ : <b>−0.34 V ×</b> (Cu는 녹지 않아요)</li><li>Fe + Cu²⁺ : <b>+0.78 V ○</b> (철못이 구리로 덮여요) · Cu + 2Ag⁺ : <b>+0.46 V ○</b></li><li>산화제 · 환원제는 <b>상대적</b> : Cu²⁺는 Zn에게는 산화제, Cu는 Ag⁺에게는 환원제</li></ul>',
      missions: [
        {
          title: '반응 여섯 개 판정하기', manual: true,
          goal: '여섯 반응을 모두 골라 E°cell 로 <b>○ (자발적) / × (비자발적)</b>를 판정하세요. 다 끝나면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '반응 단추를 고른 뒤 환원되는 쪽(E° 큰 쪽)과 산화되는 쪽을 찾아 E°cell을 계산해요. 양수이면 ○, 음수이면 ×예요. 맞히면 실제 변화가 나타나요.',
          setup() { S.gate = 'pd'; setScene('predict'); updateCtl(); },
          check() { const n = pdNDone(); return n >= 6 ? true : '아직 판정하지 않은 반응이 ' + (6 - n) + '개 있어요. 반응 단추를 눌러 이어서 판정해요.'; },
          status: () => '판정한 반응 ' + pdNDone() + ' / 6 ' + mark(pdNDone() >= 6),
          explain: '○ : Zn + Cu²⁺ (+1.10 V), Zn + 2H⁺ (+0.76 V), Fe + Cu²⁺ (+0.78 V), Cu + 2Ag⁺ (+0.46 V) / × : Cu + Zn²⁺ (−1.10 V), Cu + 2H⁺ (−0.34 V). 같은 짝에서 순서를 바꾸면 E°cell의 부호가 반대가 돼요.',
        },
        {
          type: 'quiz', title: '구리가 묽은 염산과 반응하지 않는 까닭',
          goal: 'Cu는 묽은 염산에 녹지 않아요. <b>E°</b>로 설명하면?',
          setup() { S.gate = ''; setScene('predict'); },
          choices: ['Cu + 2H⁺ → Cu²⁺ + H₂ 의 E°cell = 0.00 − 0.34 = −0.34 V 로 음수라서 비자발적이에요', 'Cu의 E°가 음수라서 H⁺에게 전자를 줄 수 없어요', 'E°cell = 0.34 − 0.00 = +0.34 V 라서 반응이 아주 느려요', 'HCl이 너무 묽어서 E°를 계산할 수 없어요'],
          answer: 0,
          feedback: ['', 'Cu의 E°는 +0.34 V로 양수예요. 양수라서 환원되기 쉽고, 그래서 H⁺에게 전자를 주기 어려워요.', '환원극은 H⁺/H₂(0.00 V), 산화극은 Cu(+0.34 V)라서 0.00 − 0.34 = −0.34 V 예요.', '표준 상태(1 M)에서 E°로 자발성을 예측해요.'],
          explain: 'Cu가 산화되려면 H⁺가 환원극이어야 해요. E°cell = E°(H⁺/H₂) − E°(Cu²⁺/Cu) = 0.00 − 0.34 = <b>−0.34 V</b> &lt; 0 이므로 반응이 일어나지 않아요. 반면 Zn은 0.00 − (−0.76) = +0.76 V라 묽은 염산에 녹아요.',
        },
        {
          type: 'quiz', title: '환원제는 항상 환원제일까?',
          goal: '“Cu는 항상 환원제이고 Cu²⁺는 항상 산화제다.” 이 말을 반응 여섯 개로 점검하면?',
          setup() { S.gate = ''; setScene('predict'); },
          choices: ['맞아요. 물질마다 역할이 정해져 있어요', '틀려요. Cu²⁺는 Zn에게 산화제로 반응하지만, Cu는 Ag⁺에게 환원제로 작용해 역할은 상대에 따라 달라요', '틀려요. 산화제와 환원제는 같은 물질을 가리켜요', '맞아요. 대신 Ag⁺도 항상 환원제예요'],
          answer: 1,
          feedback: ['표의 위치(E°)가 상대적이라서 어떤 상대를 만나느냐에 따라 달라져요.', '', '산화제는 환원되는 물질, 환원제는 산화되는 물질로 서로 달라요.', 'Ag⁺는 E°가 커서 오히려 센 산화제예요.'],
          explain: '산화제 · 환원제는 <b>상대적 역할</b>이에요. Zn + Cu²⁺에서는 Cu²⁺가 산화제, Cu + 2Ag⁺에서는 Cu가 환원제예요. E° 표에서 어느 쪽 위에 있느냐에 따라 정해져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-standard-potential', mount: '#game', badge: '전위 박사', homeHref: '../../index.html#hr',
    featureLabels: { she: '🧩 표준 수소 전극 · 반쪽 전지 연결', table: '📏 표준 환원 전위 표', calc: '🧮 E°cell 계산기', predict: '🎯 반응 예측' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('she');
  function stepAll1(dt) { stepShe(dt); stepTable(dt); stepCalc(dt); stepPredict(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'she') drawShe(t); else if (S.mode === 'table') drawTable(t); else if (S.mode === 'calc') drawCalc(t); else drawPredict(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, HC, PAIRS, RXN, tbCardRect, tbPick, tbJudge, tbNJ, tbLay, sheMetal, sheConn, ccPick, ccCheck, ccNDone, ccTrue, pdPick, pdJudge, pdNDone, rxE, ecell, f2, sgn2,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
