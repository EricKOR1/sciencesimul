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
     화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 전기 분해의 원리 [12반응02-04]
     ① 관찰: 전지와 비교 (다니엘 전지에 반대 방향 전압)  ② 모형: 용융 NaCl (이온 이동, 전자 장부)
     ③ 탐구: 수용액 경쟁 (NaCl 수용액, 물이 먼저 환원)  ④ 적용: 전자 계산 (전자 몰수 : 생성물 몰수)
     패러데이 법칙 · 전하량 계산 · 과전압은 다루지 않아요. (+)극의 Cl⁻ 산화는 실험 사실로 제시해요.
     ================================================================ */
  const MODE_LABEL = { compare: '⚖️ 전지와 비교', molten: '🔥 용융 NaCl', aqueous: '💧 NaCl 수용액', calc: '🧮 전자 계산' };
  const EXT = 1.10;                       // 다니엘 전지의 전압 (V)
  const NAC = '#a78bfa', CLC = '#22c55e', NAM = '#cbd5e1';
  const MM = { Na: 23.0, Cl2: 71.0 };     // g/mol

  Object.assign(S, {
    mode: 'compare', sub: {},
    cp: { V: 0, I: 0, q: 0, qs: 0, tDis: 0, tRev: 0, thr: NaN, sel: { a: '', b: '', c: '', d: '' }, solved: false },
    ml: { on: false, ions: [], evs: [], cla: [], naa: [], bub: [], el: [], e: 0, nCl: 0, cool: 0, nid: 0, sel: { a: '', b: '', c: '', d: '', e: '' }, roles: false, tOn: 0 },
    aq: { pred: '', seen: false, on: false, tOn: 0, vH: 0, red: 0, paper: { target: null, p: 0, res: '', tt: 0 }, blue: false, sel: { a: '', b: '', c: '', d: '' }, full: false },
    ec: { sc: 'A', n: 2.0, sn: 0, done: {}, a: NaN, b: NaN, free: false },
  });

  /* ============ ① 전지와 비교 ============ */
  const cpI = (V) => (Math.abs(EXT - V) < 0.025 ? 0 : (EXT - V) / EXT);
  function cpReset() { const c = S.cp; c.V = 0; c.q = 0; c.I = 0; c.tDis = 0; c.tRev = 0; c.thr = NaN; clearNum(['cpThr']); const s = $('#sCp'); if (s) { s.value = 0; s.dispatchEvent(new Event('input')); } updateCtl(); }
  function cpSet(V) { const c = S.cp; c.V = clamp(Math.round(V * 20) / 20, 0, 2); const s = $('#sCp'); if (s && +s.value !== Math.round(c.V * 20)) { s.value = Math.round(c.V * 20); } updateCtl(); }
  function stepCompare(dt) {
    const c = S.cp; if (S.mode !== 'compare') return;
    const tg = cpI(c.V); c.I = ap(c.I, tg, dt, 6); if (Math.abs(c.I - tg) < 0.003) c.I = tg;
    c.q = clamp(c.q + c.I * dt * 0.1, -1, 1); c.qs = ap(c.qs, c.q, dt, 4);
    if (tg > 0.12 && c.I > 0.1) c.tDis += dt;
    if (tg < -0.1 && c.I < -0.08) c.tRev += dt;
  }
  const cpState = () => { const I = S.cp.I; return Math.abs(I) < 0.04 ? 'idle' : I > 0 ? 'dis' : 'ele'; };
  function drawCompare(t) {
    const c = S.cp, I = c.I, qs = c.qs, ms = cpState();
    T(14, 26, '⚖️ 다니엘 전지에 반대 방향으로 전원을 이으면?', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const Lr = ms === 'dis' ? '(−)극 · 산화 (녹음)' : ms === 'ele' ? '(−)극 · 환원 (석출)' : '(−)극 · 전류 없음';
    const Rr = ms === 'dis' ? '(+)극 · 환원 (석출)' : ms === 'ele' ? '(+)극 · 산화 (녹음)' : '(+)극 · 전류 없음';
    const st = {
      L: { plate: { c1: MT_ZN[0], c2: MT_ZN[1], thick: 1 - 0.45 * qs }, sol: true, solc: '#dbeafe', sola: 0.3, catc: ZNC, cat: 6 + Math.round(3 * qs), an: 6, name: 'Zn판 · ZnSO₄', name2: Lr },
      R: { plate: { c1: MT_CU[0], c2: MT_CU[1], thick: 1 + 0.45 * qs }, sol: true, solc: '#3b9be0', sola: 0.18 + 0.44 * clamp(1 - 0.5 * qs, 0, 1.5), catc: '#3b82c4', cat: 6 - Math.round(3 * qs), an: 6, name: 'Cu판 · CuSO₄', name2: Rr },
      bridge: 1, wire: 1, flow: Math.abs(I), dir: I >= 0 ? 1 : -1, showDir: Math.abs(I) > 0.1, signs: { L: '−', R: '+' }, deviceHalf: 48, bridgeLabel: '염다리',
      device: (x, y) => supplyDraw(x, y, c.V < 0.005 ? 'OFF' : c.V.toFixed(2) + 'V', c.V > 0.005, true),
      gaugeFn: (g) => gaugeDial(g.gx, g.gy, g.gr, 0.5 + 0.5 * clamp(I, -1, 1), (Math.abs(I) < 0.005 ? '0.00' : (I > 0 ? '+' : MINUS) + Math.abs(I).toFixed(2)), { needle: I < -0.02 ? '#2563eb' : '#dc2626' }),
    };
    const g = drawCell(MAIN, st, t);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    let head, hc, l2, l3;
    if (ms === 'dis') { head = '전지로 작동 (방전) : 화학 에너지 → 전기 에너지'; hc = '#92400e'; l2 = '(−)극 Zn → Zn²⁺ + 2e⁻ (산화) , (+)극 Cu²⁺ + 2e⁻ → Cu (환원)'; l3 = 'Zn판은 얇아지고 Cu판은 두꺼워져요. 전류계 눈금은 + 쪽이에요.'; }
    else if (ms === 'ele') { head = '전기 분해로 작동 (충전) : 전기 에너지 → 화학 에너지'; hc = '#1d4ed8'; l2 = '(−)극 Zn²⁺ + 2e⁻ → Zn (환원) , (+)극 Cu → Cu²⁺ + 2e⁻ (산화)'; l3 = '전원이 전지보다 강해 전류가 거꾸로 흘러요. Zn판은 두꺼워지고 Cu판은 얇아져요.'; }
    else { head = '전류가 흐르지 않아요'; hc = MUTED; l2 = '전원 전압이 전지의 전압(1.10 V)과 같으면 서로 밀어내는 힘이 같아요.'; l3 = '전압 슬라이더를 움직여 전류의 방향이 어떻게 바뀌는지 살펴봐요.'; }
    T(INFO.x + 16, INFO.y + 26, head, PHONE ? 14 : 16, hc, 'left', 900);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, l2, PHONE ? 13.5 : 15, INK, 20, 800);
    textBlock(INFO.x + 16, INFO.y + 52 + (PHONE ? 44 : 24), INFO.w - 32, l3, PHONE ? 13 : 14, MUTED, 19, 700);
    textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 62 : 36), INFO.w - 32, '전원 전압 ' + c.V.toFixed(2) + ' V · 전류계 : + 는 전지(방전) 방향, − 는 전기 분해(반대) 방향', PHONE ? 13 : 13.5, WARN, 18, 800);
  }
  const MT_ZN = ['#c5cdd8', '#7d8899'], MT_CU = ['#e0955a', '#8f4b1e'];

  /* ============ ② 용융 NaCl ============ */
  const mlG = () => {
    const w = PHONE ? 400 : 380, h = PHONE ? 200 : 190, x = MAIN.x + (MAIN.w - w) / 2, y = MAIN.y + (PHONE ? 150 : 112), yw = MAIN.y + (PHONE ? 50 : 42);
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11, level = 0.76, ly = iy + ih * (1 - level), bottom = iy + ih;
    return { x, y, w, h, ix, iw, iy, ih, level, ly, bottom, xC: x + 52, xA: x + w - 52, rw: 9, rodTop: yw + 8, rodBot: bottom - 26, yw, cx: x + w / 2 };
  };
  const IR = 7;
  function mlNewIon(type, fade) {
    const m = S.ml, g = mlG(), id = m.nid++, q = r2(id + (type === 'Na' ? 3 : 17));
    const x0 = g.ix + 70, x1 = g.ix + g.iw - 70;
    return { id, type, x: x0 + q[0] * (x1 - x0), y: g.ly + 14 + q[1] * (g.bottom - g.ly - 30), al: fade ? 0 : 1, alive: true, busy: false, pin: null };
  }
  function mlReset() {
    const m = S.ml; m.on = false; m.ions = []; m.evs = []; m.cla = []; m.naa = []; m.bub = []; m.el = []; m.e = 0; m.nCl = 0; m.cool = 0; m.nid = 0; m.tOn = 0; m.slotN = 0;
    for (let i = 0; i < 13; i++) { m.ions.push(mlNewIon('Na', false)); m.ions.push(mlNewIon('Cl', false)); }
    // 처음 위치를 서로 겹치지 않게 펼침
    for (let k = 0; k < 40; k++) mlRelax(0.016, true);
    parts.clear(); updateCtl();
  }
  function mlRelax(dt, force) {
    const m = S.ml, g = mlG(), A = m.ions.filter((o) => o.alive);
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, lim = 2 * IR + 1;
      if (d < lim) { const push = (lim - d) / 2, ux = dx / d, uy = dy / d; if (!a.pin) { a.x -= ux * push; a.y -= uy * push; } if (!b.pin) { b.x += ux * push; b.y += uy * push; } }
    }
    A.forEach((o) => { if (o.pin) return; m.naa.forEach((f) => { const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy) || 0.01, lim = IR + 6 + 1; if (d < lim) { o.x += dx / d * (lim - d); o.y += dy / d * (lim - d); } }); mlClamp(o, g); });
  }
  function mlClamp(o, g) {
    o.y = clamp(o.y, g.ly + IR + 3, g.bottom - IR - 3); o.x = clamp(o.x, g.ix + IR + 3, g.ix + g.iw - IR - 3);
    [g.xC, g.xA].forEach((xr) => { if (o.y < g.rodBot + IR && Math.abs(o.x - xr) < g.rw + IR) { o.x = xr + (o.x < xr ? -1 : 1) * (g.rw + IR); } });
  }
  const mlSurf = (g, o, xr) => ({ x: xr + (o.x < xr ? -1 : 1) * (g.rw + IR + 1), y: clamp(o.y, g.ly + 12, g.rodBot - 8) });
  function mlTry() {
    const m = S.ml, g = mlG(); let bc = null, bn = null, dc = 1e9, dn = 1e9;
    m.ions.forEach((o) => {
      if (!o.alive || o.busy || o.al < 1) return;
      if (o.type === 'Cl') { const d = Math.abs(o.x - g.xA); if (d < g.rw + IR + 60 && d < dc && o.y < g.rodBot + IR) { dc = d; bc = o; } }
      else { const d = Math.abs(o.x - g.xC); if (d < g.rw + IR + 60 && d < dn && o.y < g.rodBot + IR) { dn = d; bn = o; } }
    });
    if (bc && bn) {
      const k = m.slotN++ % 14, col = Math.floor(k / 7), row = k % 7;
      m.naa = m.naa.filter((a) => a.slot !== k);
      bc.busy = bn.busy = true; bn.pin = { x: g.xC + g.rw + IR + 1 + col * (2 * IR), y: g.rodBot - 10 - row * 14 }; bn.slot = k; bc.pin = mlSurf(g, bc, g.xA); m.evs.push({ cl: bc, na: bn, ph: 0 }); m.cool = 0.75;
    }
  }
  const mlPath = () => { const g = mlG(); return [[g.xA, g.rodTop], [g.xA, g.yw], [g.xC, g.yw], [g.xC, g.rodTop]]; };
  function stepMolten(dt) {
    const m = S.ml, g = mlG(); if (S.mode !== 'molten') return;
    if (m.on) m.tOn += dt;
    m.ions.forEach((o) => {
      if (!o.alive) return; o.al = Math.min(1, o.al + dt * 1.8);
      if (o.pin) { o.x = ap(o.x, o.pin.x, dt, 7); o.y = ap(o.y, o.pin.y, dt, 7); return; }
      const xr = o.type === 'Na' ? g.xC : g.xA, sd = o.x < xr ? -1 : 1, tx = xr + sd * (g.rw + IR + 1);
      let vx = RM ? 0 : Math.sin(S.t * 1.3 + o.id * 2.17) * 12, vy = RM ? 0 : Math.cos(S.t * 1.1 + o.id * 1.71) * 12;
      if (m.on && Math.abs(tx - o.x) > 3) vx += Math.sign(tx - o.x) * 36;
      o.x += vx * dt; o.y += vy * dt;
    });
    mlRelax(dt);
    m.cool -= dt; if (m.on && m.cool <= 0) mlTry();
    for (let i = m.evs.length - 1; i >= 0; i--) {
      const ev = m.evs[i];
      if (ev.ph === 0) {
        if (Math.hypot(ev.cl.x - ev.cl.pin.x, ev.cl.y - ev.cl.pin.y) < 3) {
          ev.ph = 1; ev.cl.alive = false; m.nCl++; m.cla.push({ x: ev.cl.x, y: ev.cl.y, k: 0 }); m.el.push({ u: 0, ev });
          m.ions.push(mlNewIon('Cl', true));
        }
      }
    }
    for (let i = m.el.length - 1; i >= 0; i--) {
      const e = m.el[i]; e.u += dt / 2.0;
      if (e.u >= 1) {
        const ev = e.ev; ev.na.alive = false; m.ions.push(mlNewIon('Na', true));
        m.naa.push({ x: ev.na.pin.x, y: ev.na.pin.y, slot: ev.na.slot, k: 0 });
        m.e++; flash(g.xC, g.yw, ['#fbbf24', '#fde68a']);
        if (m.e % 2 === 0 && m.cla.length >= 2) {
          const a = m.cla.shift(), b = m.cla.shift(); m.bub.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, k: 0 });
        }
        m.el.splice(i, 1); m.evs.splice(m.evs.indexOf(ev), 1);
      }
    }
    m.ions = m.ions.filter((o) => o.alive);
    m.cla.forEach((a) => { a.k = Math.min(1, a.k + dt * 3); });
    m.naa.forEach((a) => { a.k = Math.min(1, a.k + dt * 3); });
    for (let i = m.bub.length - 1; i >= 0; i--) {
      const b = m.bub[i]; b.k = Math.min(1, b.k + dt * 3); b.y -= 46 * dt; b.x += Math.sin(S.t * 4 + i) * 0.4;
      if (b.y <= g.ly + 4) { parts.burst(b.x, g.ly, { count: 7, speed: 70, size: 2.6, colors: ['#bbf7d0', '#ffffff', '#86efac'] }); m.bub.splice(i, 1); m.pops = (m.pops || 0) + 1; }
    }
  }
  const mlCl2 = () => Math.floor(S.ml.e / 2);
  function drawMolten(t) {
    const m = S.ml, g = mlG();
    T(14, 26, '🔥 용융 NaCl에 탄소 전극을 넣고 전원을 이어요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 배선 (전극 → 전원 장치)
    const sx = g.cx, sy = g.yw;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(g.xC, g.rodTop); ctx.lineTo(g.xC, sy); ctx.lineTo(sx - 48, sy); ctx.moveTo(sx + 48, sy); ctx.lineTo(g.xA, sy); ctx.lineTo(g.xA, g.rodTop); ctx.stroke();
    supplyDraw(sx, sy, m.on ? 'DC' : 'OFF', m.on, true);
    // 용기 + 이온
    const bk = beaker(g.x, g.y, g.w, g.h, { level: g.level, color: '#fdba74', alpha: 0.55, inside: (gm) => {
      m.ions.forEach((o) => {
        ctx.save(); ctx.globalAlpha = o.al;
        D.sphere(o.x, o.y, IR, o.type === 'Na' ? NAC : CLC, { gloss: false, text: o.type === 'Na' ? '+' : MINUS, textColor: '#fff', textScale: 1.3, outline: 'rgba(255,255,255,.7)', outlineWidth: 1 });
        ctx.restore();
      });
      m.bub.forEach((b) => { ctx.save(); ctx.globalAlpha = Math.min(1, b.k); ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fillStyle = 'rgba(190,255,205,.75)'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); T(b.x, b.y + 4, 'Cl₂', 8, '#14532d', 'center', 800); });
    } });
    // 탄소 전극
    [[g.xC, '(−)극'], [g.xA, '(+)극']].forEach(([xr, lab], i) => {
      const gr = ctx.createLinearGradient(xr - g.rw, 0, xr + g.rw, 0); gr.addColorStop(0, '#5b6577'); gr.addColorStop(0.5, '#374151'); gr.addColorStop(1, '#1f2937');
      D.shadow(() => { D.roundRect(xr - g.rw, g.rodTop, g.rw * 2, g.rodBot - g.rodTop, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
      pill(xr, g.rodTop - 6, lab, { bg: i ? POSC : NEGC, color: '#fff', border: null, size: 13.5, pad: 6 });
      T(xr, g.y + g.h + 20, i ? (m.roles ? '산화 전극' : '탄소 전극') : (m.roles ? '환원 전극' : '탄소 전극'), 13.5, m.roles ? (i ? '#1d4ed8' : '#b91c1c') : MUTED, 'center', 800);
    });
    // 생성물 : Na 알갱이, Cl 원자
    m.naa.forEach((a) => { ctx.save(); ctx.globalAlpha = a.k; D.sphere(a.x, a.y, 5.6, NAM, { gloss: true, text: 'Na', textColor: '#334155', textScale: 0.9, outline: '#94a3b8', outlineWidth: 1 }); ctx.restore(); });
    m.cla.forEach((a) => { ctx.save(); ctx.globalAlpha = a.k; D.sphere(a.x, a.y, 5.6, '#4ade80', { gloss: true, text: 'Cl', textColor: '#14532d', textScale: 0.9, outline: '#16a34a', outlineWidth: 1 }); ctx.restore(); });
    // 전자 (전선)
    const wp = mlPath();
    m.el.forEach((e) => { const p = ptAlong(wp, e.u); eBall(p.x, p.y, 5.4); });
    if (m.on && m.el.length) { D.arrow(g.cx + 62, g.yw - 20, g.cx - 62, g.yw - 20, { color: '#b45309', width: 2.6, head: 8 }); T(g.cx, g.yw - 27, '전자 : (+)극 → 전원 → (−)극', 12.5, '#b45309', 'center', 800); }
    T(g.cx, g.y + g.h + 20, '', 12);
    if (!m.on && m.e === 0) pill(g.cx, g.y + g.h * 0.5, '“전원 켜기”를 눌러요', { bg: '#fff7d6', color: '#7a4a00', border: '#f59e0b', size: 14, alpha: 0.95 });
    T(MAIN.x + MAIN.w - 14, MAIN.y + MAIN.h - 12, '용융 NaCl (약 800 °C)', 13.5, '#9a3412', 'right', 800);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    D.sphere(INFO.x + 22, INFO.y + 20, 6, NAC, { gloss: false }); T(INFO.x + 32, INFO.y + 25, 'Na⁺', 13.5, MUTED, 'left', 800);
    D.sphere(INFO.x + 82, INFO.y + 20, 6, CLC, { gloss: false }); T(INFO.x + 92, INFO.y + 25, 'Cl⁻', 13.5, MUTED, 'left', 800);
    D.sphere(INFO.x + 142, INFO.y + 20, 5.6, NAM, { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); T(INFO.x + 152, INFO.y + 25, 'Na (은백색)', 13.5, MUTED, 'left', 800);
    D.sphere(INFO.x + 262, INFO.y + 20, 5.6, '#4ade80', { gloss: false }); T(INFO.x + 272, INFO.y + 25, 'Cl 원자', 13.5, MUTED, 'left', 800);
    const nNa = m.e + (m.naaX ? 0 : 0);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '이동한 전자 ' + m.e + '개 → Na ' + m.e + '개 , Cl₂ ' + mlCl2() + '분자 (Cl 원자 2개가 짝을 이뤄요)', PHONE ? 14 : 15.5, m.e ? '#166534' : MUTED, 21, 800);
    textBlock(INFO.x + 16, INFO.y + 54 + (PHONE ? 46 : 26), INFO.w - 32, m.on || m.e ? '노란 전자를 따라가 보세요. (+)극에서 Cl⁻가 내놓은 전자가 도선을 지나 (−)극에서 Na⁺에게 가요.' : '전원을 켜면 양이온은 한 쪽 전극으로, 음이온은 다른 쪽 전극으로 이동해요.', PHONE ? 13 : 14, MUTED, 19, 700);
  }

  /* ============ ③ NaCl 수용액 ============ */
  const aqG = () => {
    const bw = PHONE ? 424 : 400, bh = PHONE ? 140 : 176, bx = MAIN.x + (PHONE ? 20 : 24), by = MAIN.y + (PHONE ? 120 : 124);
    const ix = bx + 5, iw = bw - 10, iy = by + 5, ih = bh - 11, level = 0.72, ly = iy + ih * (1 - level), bottom = iy + ih;
    const tw = 56, tTop = MAIN.y + (PHONE ? 62 : 70), tBot = ly + 34, cxC = bx + bw * 0.3, cxA = bx + bw * 0.7;
    return { bx, by, bw, bh, ix, iw, iy, ih, ly, bottom, tw, tTop, tBot, cxC, cxA, yw: MAIN.y + (PHONE ? 28 : 30), rodTop: MAIN.y + (PHONE ? 40 : 44), rodBot: bottom - 18 };
  };
  const aqVH = () => S.aq.vH, aqVC = () => S.aq.vH * 0.9;
  function aqReset() { const a = S.aq; a.on = false; a.tOn = 0; a.vH = 0; a.red = 0; a.paper = { target: null, p: 0, res: '', tt: 0 }; a.blue = false; a.full = false; parts.clear(); updateCtl(); }
  function aqPower() { const a = S.aq; if (a.full) return; a.on = !a.on; Sound.click(); updateCtl(); }
  function aqPred(v) { const a = S.aq; a.pred = v; a.seen = true; Sound.click(); updateCtl(); }
  function aqPaper(target) { const a = S.aq; a.paper = { target, p: 0, res: '', tt: 0 }; if (target === 'cl' && aqVC() < 0.12) showHint('기체가 아직 부족해요. 전기 분해를 더 진행해요.', 3200); Sound.click(); }
  function stepAq(dt) {
    const a = S.aq; if (S.mode !== 'aqueous') return;
    if (a.on) { a.tOn += dt; a.vH = Math.min(0.92, a.vH + dt * 0.04); a.red = Math.min(1, a.tOn / 14); if (a.vH >= 0.92) { a.on = false; a.full = true; updateCtl(); } }
    const p = a.paper; if (p.target) {
      p.tt += dt;
      if (p.target === 'cl' && aqVC() >= 0.12) { p.p = Math.min(1, p.p + dt / 2.2); if (p.p >= 0.99 && !a.blue) { a.blue = true; p.res = 'blue'; updateCtl(); } }
      else if (p.target === 'h2' && aqVH() >= 0.12 && p.tt > 2.2) p.res = 'none';
    }
  }
  function aqTube(cx, g, frac, gasCol, label, t, bub) {
    const x0 = cx - g.tw / 2, w = g.tw, y0 = g.tTop, y1 = g.tBot, ih = y1 - y0 - 4, gy = y0 + 4 + ih * frac;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, y0 + 12); ctx.quadraticCurveTo(x0, y0, x0 + 12, y0); ctx.lineTo(x0 + w - 12, y0); ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + 12); ctx.lineTo(x0 + w, y1); ctx.lineTo(x0, y1); ctx.closePath();
    ctx.fillStyle = 'rgba(150,200,240,.42)'; ctx.fill(); ctx.clip();
    // 기체
    if (frac > 0.002) { ctx.fillStyle = gasCol; ctx.fillRect(x0, y0, w, gy - y0); ctx.fillStyle = 'rgba(70,100,140,.55)'; ctx.fillRect(x0, gy - 1.5, w, 2.5); }
    // 기포
    if (bub) { for (let i = 0; i < 5; i++) { const u = RM ? (i + 0.5) / 5 : ((t * 0.7 + i / 5) % 1), by = (y1 - 10) - (y1 - 10 - gy) * u; ctx.beginPath(); ctx.arc(cx + (i % 2 ? 9 : -9) + Math.sin(t * 3 + i) * 3, by, 3.4, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(70,100,140,.45)'; ctx.lineWidth = 1; ctx.stroke(); } }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + 12); ctx.quadraticCurveTo(x0, y0, x0 + 12, y0); ctx.lineTo(x0 + w - 12, y0); ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + 12); ctx.lineTo(x0 + w, y1);
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 2.4; ctx.stroke();
    if (frac > 0.06) T(cx, y0 + Math.min(26, (gy - y0) / 2 + 5), label, 14, '#334155', 'center', 800);
    return { x0, y0, w, gy };
  }
  function drawAq(t) {
    const a = S.aq, g = aqG(), on = a.on;
    T(14, 26, '💧 NaCl 수용액을 전기 분해하면 어떤 물질이 생길까요?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 배선 + 전원
    const sx = (g.cxC + g.cxA) / 2, sy = g.yw;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(g.cxC, g.rodTop); ctx.lineTo(g.cxC, sy); ctx.lineTo(sx - 48, sy); ctx.moveTo(sx + 48, sy); ctx.lineTo(g.cxA, sy); ctx.lineTo(g.cxA, g.rodTop); ctx.stroke();
    supplyDraw(sx, sy, on ? 'DC' : a.full ? 'OFF' : 'OFF', on, true);
    // 비커 + 분홍 구름 (페놀프탈레인)
    const bk = beaker(g.bx, g.by, g.bw, g.bh, { level: 0.72, color: '#cfe8fb', alpha: 0.5, inside: (gm) => {
      if (a.red > 0.01) {
        const R = 30 + 150 * a.red, grd = ctx.createLinearGradient(g.cxC - R, 0, g.cxC + R, 0);
        grd.addColorStop(0, 'rgba(236,72,153,0)'); grd.addColorStop(0.5, 'rgba(236,72,153,' + (0.62 * a.red) + ')'); grd.addColorStop(1, 'rgba(236,72,153,0)');
        ctx.fillStyle = grd; ctx.fillRect(g.cxC - R, gm.ly, 2 * R, gm.bottom - gm.ly);
      }
      // 이온 : Na⁺ 와 Cl⁻ (제자리에서 흔들림)
      for (let i = 0; i < 7; i++) { const q = ballPos(gm, i, 6, 2, t); D.sphere(q[0], q[1], 5.2, NAC, { gloss: false }); }
      for (let i = 0; i < 7; i++) { const q = ballPos(gm, i + 30, 6, 2, t); D.sphere(q[0], q[1], 5.2, CLC, { gloss: false }); }
    } });
    // 전극 + 시험관
    const th = aqTube(g.cxC, g, aqVH(), 'rgba(255,255,255,.93)', 'H₂', t, on);
    const tc = aqTube(g.cxA, g, aqVC(), 'rgba(205,240,120,.62)', 'Cl₂', t, on);
    [[g.cxC, '(−)극', NEGC], [g.cxA, '(+)극', POSC]].forEach(([xr, lab, col]) => {
      const gr = ctx.createLinearGradient(xr - 5, 0, xr + 5, 0); gr.addColorStop(0, '#5b6577'); gr.addColorStop(0.5, '#374151'); gr.addColorStop(1, '#1f2937');
      D.roundRect(xr - 5, g.rodTop, 10, g.rodBot - g.rodTop, 3); ctx.fillStyle = gr; ctx.fill();
      pill(xr + (xr === g.cxC ? -38 : 38), g.rodTop + 10, lab, { bg: col, color: '#fff', border: null, size: 13, pad: 6 });
    });
    // 전자 흐름 (전선)
    if (on) { const wp = [[g.cxA, g.rodTop], [g.cxA, sy], [g.cxC, sy], [g.cxC, g.rodTop]]; for (let i = 0; i < 6; i++) { const p = ptAlong(wp, ((i / 6) + t * 0.22) % 1); eBall(p.x, p.y, 4.6); } }
    T(g.bx + g.bw / 2, g.by + g.bh + 20, '진한 NaCl 수용액 (페놀프탈레인 넣음)', PHONE ? 13 : 14, INK, 'center', 800);
    // 녹말-KI 종이
    const pp = a.paper;
    if (pp.target) {
      const px = (pp.target === 'cl' ? g.cxA + 56 : g.cxC - 56), py = g.tTop + 30;
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py + 30); ctx.lineTo(px, py + 70); ctx.stroke();
      D.shadow(() => { D.roundRect(px - 13, py - 8, 26, 40, 3); ctx.fillStyle = C.mix('#f8fafc', '#312e81', pp.p); ctx.fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; D.roundRect(px - 13, py - 8, 26, 40, 3); ctx.stroke();
      T(px, py - 14, '녹말-KI 종이', 12.5, MUTED, 'center', 800);
      if (pp.res === 'blue') T(px, py + 52 + 28, '청변!', 14, '#312e81', 'center', 800);
      else if (pp.res === 'none') T(px, py + 52 + 28, '변화 없음', 13.5, MUTED, 'center', 800);
    }
    // 입자 모형 (음극 표면)
    aqInset(t);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    let l1, c1 = INK;
    if (!a.pred) { l1 = '(−)극 주변에는 Na⁺와 물이 있어요. 어느 쪽이 환원될까요? 예측을 골라요.'; c1 = MUTED; }
    else { l1 = 'E°(Na⁺/Na) = ' + sgn2(-2.71) + ' V , E°(물 → H₂ + OH⁻, 염기성) ≈ ' + sgn2(-0.83) + ' V  →  E°가 더 큰 물이 먼저 환원돼요.'; c1 = a.pred === 'h2o' ? '#166534' : '#b91c1c'; }
    textBlock(INFO.x + 16, INFO.y + 26, INFO.w - 32, l1, PHONE ? 13.5 : 14.5, c1, 20, 800);
    const vH = aqVH() * 10, vC = aqVC() * 10;
    textBlock(INFO.x + 16, INFO.y + 26 + (PHONE ? 58 : 42), INFO.w - 32, '(+)극 : 2Cl⁻ → Cl₂ + 2e⁻ (Cl⁻가 먼저 산화돼요 — 실험 사실로 받아들여요)', PHONE ? 13.5 : 14.5, INK, 20, 800);
    textBlock(INFO.x + 16, INFO.y + 26 + (PHONE ? 100 : 66), INFO.w - 32, '기체 부피 H₂ ' + vH.toFixed(1) + ' mL , Cl₂ ' + vC.toFixed(1) + ' mL (Cl₂는 물에 일부 녹아 H₂보다 조금 작아요)' + (a.full ? ' · 시험관이 가득 찼어요' : ''), PHONE ? 13 : 13.5, MUTED, 18, 700);
  }
  function aqInset(t) {
    const a = S.aq, on = a.on;
    const w = PHONE ? MAIN.w - 24 : 312, h = PHONE ? 112 : 196, x = PHONE ? MAIN.x + 12 : MAIN.x + MAIN.w - w - 12, y = PHONE ? MAIN.y + MAIN.h - h - 10 : MAIN.y + 14;
    D.roundRect(x, y, w, h, 14); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.4; ctx.stroke();
    T(x + 12, y + 22, '🔍 (−)극 표면의 입자 모형', 13.5, '#5b21b6', 'left', 800);
    const ex = x + 40;
    ctx.save(); D.roundRect(x + 2, y + 32, 38, h - 34, 12); ctx.clip(); ctx.fillStyle = '#4b5563'; ctx.fillRect(x, y + 30, 40, h); ctx.restore();
    T(x + 21, y + h - 8, '탄소', 12.5, '#fff', 'center', 800);
    const lanes = PHONE ? [y + 66, y + 92] : [y + 76, y + 112, y + 148];
    lanes.forEach((ly, i) => {
      const u = on ? ((t * 0.3 + i / lanes.length) % 1) : 0.15 + i * 0.06;
      if (u < 0.45) { const px = ex + 96 - (u / 0.45) * 52; waterMol(px, ly); if (u > 0.3) { const k = (u - 0.3) / 0.15; eBall(ex + 4 + (px - ex - 4) * k, ly - 9, 5.4); } }
      else {
        const k = (u - 0.45) / 0.55;
        // H₂ 는 위로, OH⁻ 는 오른쪽으로
        ctx.save(); ctx.globalAlpha = 1 - k * 0.6;
        const hx = ex + 22 + k * 22, hy = ly - 10 - k * 24;
        D.sphere(hx - 4, hy, 4.8, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); D.sphere(hx + 4, hy, 4.8, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 1 });
        const ox = ex + 40 + k * 44;
        D.sphere(ox, ly + 2, 8.5, '#ef4444', { gloss: false, text: '', outline: null }); D.sphere(ox + 8, ly - 5, 4.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 1 });
        if (k > 0.35) T(ox + 2, ly + 22, 'OH⁻', 12.5, '#b91c1c', 'center', 800);
        ctx.restore();
        if (k > 0.5) T(hx + 14, hy - 8, 'H₂', 12.5, '#475569', 'left', 800);
      }
    });
    D.sphere(x + w - 40, y + 50, 6, NAC, { gloss: false }); T(x + w - 52, y + 54, 'Na⁺', 13, MUTED, 'right', 800);
    D.sphere(x + w - 40, y + 76, 6, NAC, { gloss: false });
    T(x + w - 12, y + h - 10, 'Na⁺는 그대로 남아요', 12.5, MUTED, 'right', 800);
    T(x + 48, y + 42, '2H₂O + 2e⁻ → H₂ + 2OH⁻', 13, '#7c3aed', 'left', 800);
  }
  function waterMol(x, y) {
    D.sphere(x, y, 8.8, '#ef4444', { gloss: false }); D.sphere(x - 9, y + 6, 4.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); D.sphere(x + 9, y + 6, 4.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 1 });
  }

  /* ============ ④ 전자 계산 ============ */
  const EC = [
    { k: 'A', sys: 'nacl', n: 2.0, lab: '용융 NaCl · 전자 2.0 mol', q: [['Na의 질량', 46, 'g', 1.0], ['Cl₂의 질량', 71, 'g', 1.5]] },
    { k: 'B', sys: 'water', n: 4.0, lab: '물 · 전자 4.0 mol', q: [['H₂의 몰수', 2.0, 'mol', 0.06], ['O₂의 몰수', 1.0, 'mol', 0.04]] },
    { k: 'C', sys: 'nacl', n: 0.2, lab: '용융 NaCl · 전자 0.20 mol', q: [['Na의 몰수', 0.20, 'mol', 0.01], ['Cl₂의 몰수', 0.10, 'mol', 0.006]] },
  ];
  const ecS = () => EC.find((q) => q.k === S.ec.sc) || null;
  const ecSys = () => { const s = ecS(); return s ? s.sys : S.ec.free; };
  function ecPick(k) { const e = S.ec, s = EC.find((q) => q.k === k); e.sc = k; e.n = s.n; e.free = s.sys; e.a = e.b = NaN; clearNum(['ecA', 'ecB']); const sl = $('#sEc'); if (sl) sl.value = Math.round(e.n * 10); updateCtl(); }
  function ecSlide(v) { const e = S.ec; e.n = clamp(Math.round(v) / 10, 0, 4); e.sc = ''; updateCtl(); }
    function ecCheck(ch) {
    const e = S.ec, s = ecS(); if (!s) return;
    const o1 = near(e.a, s.q[0][1], s.q[0][3]), o2 = near(e.b, s.q[1][1], s.q[1][3]);
    markNum('ecA', o1, ch, e.a); markNum('ecB', o2, ch, e.b);
    if (o1 && o2 && !e.done[s.k]) { e.done[s.k] = true; flash(MAIN.x + MAIN.w * 0.5, MAIN.y + MAIN.h * 0.45, ['#14a058', '#fbbf24', '#8b5cf6']); Sound.click && Sound.click(); }
    updateCtl();
  }
  const ecNDone = () => Object.keys(S.ec.done).length;
  const ecLabels = () => { const s = ecS(), sys = ecSys(); return !s || S.ec.done[s.k] || (game && game.free) || !s; };
  function stepEc(dt) { const e = S.ec; if (S.mode !== 'calc') return; e.sn = ap(e.sn, e.n, dt, 5); if (Math.abs(e.sn - e.n) < 0.002) e.sn = e.n; }
  function drawEc(t) {
    const e = S.ec, s = ecS(), sys = ecSys(), nacl = sys === 'nacl', sn = e.sn;
    T(14, 26, '🧮 전자의 몰수와 생성물의 몰수 비로 양을 구해요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    T(MAIN.x + 16, MAIN.y + 28, (nacl ? '용융 NaCl 의 전기 분해' : '물의 전기 분해 (Na₂SO₄ 수용액)') + (s ? ' · ' + s.lab.split(' · ')[1] : ''), PHONE ? 14.5 : 16, WARN, 'left', 800);
    const lines = nacl ? [['(+)극 산화', '2Cl⁻ → Cl₂ + 2e⁻'], ['(−)극 환원', '2Na⁺ + 2e⁻ → 2Na']] : [['(+)극 산화', '2H₂O → O₂ + 4H⁺ + 4e⁻'], ['(−)극 환원', '4H₂O + 4e⁻ → 2H₂ + 4OH⁻']];
    lines.forEach((l, i) => { T(MAIN.x + 16, MAIN.y + 54 + i * 22, l[0] + ' : ' + l[1], PHONE ? 13.5 : 14.5, i ? '#b91c1c' : '#1d4ed8', 'left', 800); });
    const rows = nacl ? [['전자 e⁻', 1, '#fbbf24'], ['Na', 1, NAM], ['Cl₂', 0.5, CLC]] : [['전자 e⁻', 1, '#fbbf24'], ['H₂', 0.5, '#e2e8f0'], ['O₂', 0.25, '#fca5a5']];
    const bx = MAIN.x + (PHONE ? 78 : 96), bw = MAIN.w - (PHONE ? 78 : 96) - 150, by0 = MAIN.y + (PHONE ? 130 : 112), rh = PHONE ? 44 : 50, xmax = 4;
    // 눈금
    for (let v = 0; v <= xmax; v += 1) { const x = bx + bw * v / xmax; ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, by0 - 8); ctx.lineTo(x, by0 + rows.length * rh); ctx.stroke(); T(x, by0 - 12, String(v), 13, MUTED, 'center', 700); }
    T(bx + bw, by0 - 30, '몰수 (mol)', 13, MUTED, 'right', 800);
    const show = ecLabels();
    rows.forEach((r, i) => {
      const y = by0 + i * rh + 6, v = sn * r[1], wv = bw * clamp(v, 0, xmax) / xmax;
      T(bx - 10, y + rh * 0.36, r[0], PHONE ? 14 : 15, INK, 'right', 800);
      D.roundRect(bx, y, bw, rh - 16, 7); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (wv > 0.5) { ctx.save(); D.roundRect(bx, y, bw, rh - 16, 7); ctx.clip(); ctx.fillStyle = r[2]; ctx.fillRect(bx, y, wv, rh - 16); ctx.strokeStyle = 'rgba(71,85,105,.45)'; ctx.strokeRect(bx, y, wv, rh - 16); ctx.restore(); }
      const lab = (i === 0 || show) ? f2(v) + ' mol' : '? mol';
      T(bx + bw + 8, y + rh * 0.36, lab, 14, (i === 0 || show) ? INK : '#94a3b8', 'left', 800);
    });
    const ratio = nacl ? '전자 : Na : Cl₂ = 2 : 2 : 1' : '전자 : H₂ : O₂ = 4 : 2 : 1';
    T(MAIN.x + MAIN.w / 2, by0 + rows.length * rh + 24, '몰수의 비  ' + ratio, PHONE ? 14.5 : 16, '#5b21b6', 'center', 900);
    if (show && nacl) T(MAIN.x + MAIN.w / 2, by0 + rows.length * rh + 46, 'Na ' + f1(sn * MM.Na) + ' g , Cl₂ ' + f1(sn * 0.5 * MM.Cl2) + ' g (Na 23 g/mol , Cl₂ 71 g/mol)', PHONE ? 13.5 : 14.5, MUTED, 'center', 800);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '극 이름 규칙 정리', 15.5, WARN, 'left', 900);
    const cw = (INFO.w - 40) / 2, ch = PHONE ? 100 : 78;
    [['🔋 전지', '(−)극 = 산화 · (+)극 = 환원', '화학 에너지 → 전기 에너지', '#fef3c7'], ['🔌 전기 분해', '(+)극 = 산화 · (−)극 = 환원', '전기 에너지 → 화학 에너지', '#dbeafe']].forEach((c, i) => {
      const x = INFO.x + 16 + i * (cw + 8);
      if (PHONE) return;
      D.roundRect(x, INFO.y + 40, cw, ch, 10); ctx.fillStyle = c[3]; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; ctx.stroke();
      T(x + cw / 2, INFO.y + 62, c[0], 14.5, INK, 'center', 900); T(x + cw / 2, INFO.y + 86, c[1], 14, INK, 'center', 800); T(x + cw / 2, INFO.y + 108, c[2], 13.5, MUTED, 'center', 800);
    });
    if (PHONE) { [['🔋 전지', '(−)극 = 산화 · (+)극 = 환원', '#fef3c7'], ['🔌 전기 분해', '(+)극 = 산화 · (−)극 = 환원', '#dbeafe']].forEach((c, i) => { const y = INFO.y + 42 + i * 56; D.roundRect(INFO.x + 14, y, INFO.w - 28, 48, 10); ctx.fillStyle = c[2]; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; ctx.stroke(); T(INFO.x + 26, y + 20, c[0], 14.5, INK, 'left', 900); T(INFO.x + 26, y + 39, c[1], 14, INK, 'left', 800); }); textBlock(INFO.x + 16, INFO.y + 164, INFO.w - 32, '전지는 화학 에너지를 전기 에너지로, 전기 분해는 전기 에너지를 화학 에너지로 바꿔요.', 13, MUTED, 18, 700); }
  }

  /* ---------- 조작 장치 ---------- */
  const sCp = $('#sCp');
  sCp.addEventListener('input', () => { S.cp.V = clamp(+sCp.value / 20, 0, 2); $('#oCp').textContent = S.cp.V.toFixed(2) + ' V'; sCp.style.setProperty('--pct', (+sCp.value / 40 * 100) + '%'); updateCtl(); });
  $('#cpMinus').addEventListener('click', () => { Sound.tick(); cpSet(S.cp.V - 0.05); });
  $('#cpPlus').addEventListener('click', () => { Sound.tick(); cpSet(S.cp.V + 0.05); });
  $('#bCpReset').addEventListener('click', () => { Sound.click(); S.cp.q = 0; S.cp.tDis = 0; S.cp.tRev = 0; cpSet(0); });
  bindNum($('#cpThr'), (v, ch) => { S.cp.thr = v; markNum('cpThr', near(v, 1.10, 0.051), ch, v); updateCtl(); });
  const OXR = [['', '선택하세요'], ['ox', '산화'], ['red', '환원']];
  const ENG = [['', '선택하세요'], ['ce', '화학 에너지 → 전기 에너지'], ['ec', '전기 에너지 → 화학 에너지']];
  fillSel('cpS1', OXR, (v) => { S.cp.sel.a = v; }); fillSel('cpS2', OXR, (v) => { S.cp.sel.b = v; });
  fillSel('cpS3', ENG, (v) => { S.cp.sel.c = v; }); fillSel('cpS4', ENG, (v) => { S.cp.sel.d = v; });
  $('#bMlPow').addEventListener('click', () => { Sound.click(); S.ml.on = !S.ml.on; updateCtl(); });
  $('#bMlReset').addEventListener('click', () => { Sound.click(); mlReset(); });
  const DIRS = [['', '선택하세요'], ['pos', '(+)극 쪽'], ['neg', '(−)극 쪽']];
  fillSel('mlS1', DIRS, (v) => { S.ml.sel.a = v; }); fillSel('mlS2', DIRS, (v) => { S.ml.sel.b = v; });
  const RXS = [['', '선택하세요'], ['a', '2Cl⁻ → Cl₂ + 2e⁻'], ['b', 'Cl₂ + 2e⁻ → 2Cl⁻'], ['c', 'Na⁺ + e⁻ → Na'], ['d', 'Na → Na⁺ + e⁻']];
  fillSel('mlS3', RXS, (v) => { S.ml.sel.c = v; }); fillSel('mlS4', RXS, (v) => { S.ml.sel.d = v; });
  fillSel('mlS5', [['', '선택하세요'], ['a', '2NaCl → 2Na + Cl₂'], ['b', '2Na + Cl₂ → 2NaCl'], ['c', 'NaCl → Na + Cl']], (v) => { S.ml.sel.e = v; });
  $('#aqP1').addEventListener('click', () => aqPred('na')); $('#aqP2').addEventListener('click', () => aqPred('h2o'));
  $('#bAqPow').addEventListener('click', aqPower); $('#bAqReset').addEventListener('click', () => { Sound.click(); aqReset(); });
  $('#bAqPh').addEventListener('click', () => aqPaper('h2')); $('#bAqPc').addEventListener('click', () => aqPaper('cl'));
  const PRODS = [['', '선택하세요'], ['Na', 'Na (나트륨)'], ['H2', 'H₂ (수소)'], ['Cl2', 'Cl₂ (염소)'], ['O2', 'O₂ (산소)']];
  ['aqS1', 'aqS2', 'aqS3', 'aqS4'].forEach((id, i) => fillSel(id, PRODS, (v) => { S.aq.sel['abcd'[i]] = v; }));
  makeChips($('#ecSel'), EC.map((q) => [q.k, q.k + ' · ' + q.lab]), (v) => ecPick(v));
    const sEc = $('#sEc');
  sEc.addEventListener('input', () => { if (Math.round(S.ec.n * 10) !== +sEc.value) ecSlide(+sEc.value); $('#oEc').textContent = f1(S.ec.n) + ' mol'; sEc.style.setProperty('--pct', (+sEc.value / 40 * 100) + '%'); });
  $('#ecMinus').addEventListener('click', () => { Sound.tick(); ecSlide(Math.round(S.ec.n * 10) - 1); sEc.value = Math.round(S.ec.n * 10); });
  $('#ecPlus').addEventListener('click', () => { Sound.tick(); ecSlide(Math.round(S.ec.n * 10) + 1); sEc.value = Math.round(S.ec.n * 10); });
  bindNum($('#ecA'), (v, ch) => { S.ec.a = v; ecCheck(ch); }); bindNum($('#ecB'), (v, ch) => { S.ec.b = v; ecCheck(ch); });

  function onLeave(m) { if (m === 'molten') S.ml.on = false; if (m === 'aqueous') S.aq.on = false; }
  function uiExtra() {
    const c = S.cp, m = S.ml, a = S.aq, e = S.ec;
    $('#oCp').textContent = c.V.toFixed(2) + ' V'; sCp.style.setProperty('--pct', (c.V / 2 * 100) + '%');
    $('#cpMinus').disabled = c.V <= 0; $('#cpPlus').disabled = c.V >= 2;
    $('#bMlPow').textContent = m.on ? '⏸ 전원 끄기' : '⚡ 전원 켜기'; $('#bMlPow').classList.toggle('btn-primary', !m.on);
    $('#bAqPow').textContent = a.on ? '⏸ 멈추기' : a.full ? '🔬 시험관이 가득 찼어요' : '⚡ 전기 분해 시작'; $('#bAqPow').classList.toggle('btn-primary', !a.on && !a.full); $('#bAqPow').disabled = a.full;
    $('#aqP1').classList.toggle('on', a.pred === 'na'); $('#aqP2').classList.toggle('on', a.pred === 'h2o');
    $('#aqP1').classList.toggle('bad', a.pred === 'na'); $('#aqP2').classList.toggle('ok', a.pred === 'h2o'); $('#aqP2').classList.remove('bad'); $('#aqP1').classList.remove('ok');
    markChips($('#ecSel'), e.sc, e.done);
    const s = ecS(); $('#oEc').textContent = f1(e.n) + ' mol'; sEc.style.setProperty('--pct', (e.n / 4 * 100) + '%');
    $('#ecMinus').disabled = e.n <= 0; $('#ecPlus').disabled = e.n >= 4;
    $('#ecRows').hidden = !s || !!(game && game.free && false);
    if (s) { $('#ecLa').textContent = s.q[0][0]; $('#ecLb').textContent = s.q[1][0]; $('#ecUa').textContent = s.q[0][2]; $('#ecUb').textContent = s.q[1][2]; }
    $('#ecNote').textContent = s ? '시나리오 ' + s.k + ' : ' + s.lab + ' (맞힌 시나리오 ' + ecNDone() + ' / 3)' : '슬라이더로 전자의 양을 바꿔 보세요. (자유 탐구)';
  }
  function readouts() {
    const md = S.mode;
    if (md === 'compare') { const c = S.cp, ms = cpState(); setRead('전원 전압', c.V.toFixed(2) + ' V', '전류 방향', ms === 'dis' ? '전지(방전)' : ms === 'ele' ? '반대(전기 분해)' : '없음', '에너지 전환', ms === 'dis' ? '화학 → 전기' : ms === 'ele' ? '전기 → 화학' : '—'); }
    else if (md === 'molten') { const m = S.ml; setRead('이동한 전자', m.e + '개', 'Na 생성', m.e + '개', 'Cl₂ 생성', mlCl2() + '분자'); }
    else if (md === 'aqueous') { const a = S.aq; setRead('(−)극 기체 H₂', (a.vH * 10).toFixed(1) + ' mL', '(+)극 기체 Cl₂', (a.vH * 9).toFixed(1) + ' mL', '(−)극 주변', a.red > 0.5 ? '붉은색 (염기성)' : a.red > 0.05 ? '붉어지는 중' : '무색'); }
    else { const e = S.ec, nacl = ecSys() === 'nacl'; setRead('이동한 전자', f2(e.n) + ' mol', '시나리오', ecS() ? ecS().k : '자유', '맞힌 시나리오', ecNDone() + ' / 3'); }
  }

  /* ================= 미션 ================= */
  const cpSelOk = () => { const s = S.cp.sel; return s.a === 'ox' && s.b === 'red' && s.c === 'ce' && s.d === 'ec'; };
  const mlSelOk = () => { const s = S.ml.sel; return s.a === 'neg' && s.b === 'pos' && s.c === 'a' && s.d === 'c' && s.e === 'a'; };
  const aqSelOk = () => { const s = S.aq.sel; return s.a === 'Na' && s.b === 'Cl2' && s.c === 'H2' && s.d === 'Cl2'; };
  const levels = [
    {
      title: '전지와 비교: 반대로 전기를 공급하면', short: '전지와 비교', icon: '⚖️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전기를 흘려 주면 왜 소금물이 염소 기체와 수소 기체로 갈라질까? 전극에서는 어떤 일이 일어날까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 다니엘 전지는 Zn → Zn²⁺ + 2e⁻, Cu²⁺ + 2e⁻ → Cu 반응으로 1.10 V의 전압을 냈어요. 통합과학에서는 물을 전기 분해했어요. 이번에는 전지에 <b>반대 방향</b>으로 전원을 이어 보아요.</div>' +
        '<p>전원 전압을 0 V에서 2.0 V까지 올리며 <b>전류의 방향</b>과 <b>두 금속판의 변화</b>를 관찰해요. 전지에서는 화학 에너지가 전기 에너지로 바뀌지만, 전기 분해에서는 반대로 <b>전기 에너지가 화학 에너지로</b> 바뀌어요.</p>',
      features: ['compare'],
      setup() { cpReset(); setScene('compare'); },
      recap: '전원 전압이 1.10 V보다 작으면 전지로 작동하고, 1.10 V보다 크면 전류가 거꾸로 흘러 전기 분해가 일어나요. 전기 분해에서는 전기 에너지가 화학 에너지로 바뀌고, (+)극에서 산화, (−)극에서 환원이 일어나요.',
      summary: '<ul><li><b>전기 분해</b> : 전기 에너지를 공급해 <b>비자발적</b>인 산화·환원 반응을 일으키는 것 (전기 에너지 → 화학 에너지)</li><li>다니엘 전지에 1.10 V보다 큰 전압을 반대로 걸면 전류가 거꾸로 흘러 Zn판에 Zn이 석출되고 Cu판은 녹아요 (전지 반응의 역반응 = <b>충전</b>).</li><li>전지 : (−)극 = <b>산화</b> · (+)극 = 환원 / 전기 분해 : (+)극 = <b>산화</b> · (−)극 = 환원</li></ul>',
      missions: [
        {
          title: '전류가 뒤집히는 전압 찾기',
          goal: '전원 전압을 <b>0 V에서 2.0 V까지</b> 올려 전류의 방향이 바뀌는 순간을 관찰하고, 전류가 0이 되는 <b>전압을 쓰세요</b>.',
          hint: '슬라이더(± 단추)로 전압을 천천히 올려요. 전지 방향(+)에서 전류계가 0이 되는 전압이 전환점이에요. 전압이 낮을 때와 높을 때 각각 몇 초씩 지켜봐요.',
          setup() { S.gate = 'cpA'; cpReset(); setScene('compare'); updateCtl(); },
          check: () => S.cp.tDis >= 1.5 && S.cp.tRev >= 1.5 && near(S.cp.thr, 1.10, 0.051), hold: 0.6,
          status: () => '전지 방향 ' + mark(S.cp.tDis >= 1.5) + ' &nbsp; 반대 방향 ' + mark(S.cp.tRev >= 1.5) + ' &nbsp; 전환 전압 ' + mark(near(S.cp.thr, 1.10, 0.051)),
          explain: '전원 전압이 전지의 전압 1.10 V보다 <b>작으면</b> 전지가 이겨서 전지로 작동하고, <b>크면</b> 전원이 이겨 전류가 거꾸로 흘러요. 거꾸로 흐를 때 Zn판에는 Zn이 석출되고 Cu판은 녹아요. 이것이 전기 분해(충전)예요.',
        },
        {
          title: '전지와 전기 분해 비교표', manual: true,
          goal: '전지와 전기 분해에서 <b>(−)극 반응의 종류</b>와 <b>에너지 전환</b>을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전지에서는 (−)극에서 Zn이 녹아요(전자를 내놓음). 전기 분해에서는 (−)극에서 Zn²⁺가 전자를 받아 석출돼요. 에너지의 방향을 화살표로 따져 봐요.',
          setup() { S.gate = 'cpB'; S.cp.sel = { a: '', b: '', c: '', d: '' }; clearSel(['cpS1', 'cpS2', 'cpS3', 'cpS4']); setScene('compare'); updateCtl(); },
          check() {
            const s = S.cp.sel; markSel(['cpS1', 'cpS2', 'cpS3', 'cpS4'], [s.a === 'ox', s.b === 'red', s.c === 'ce', s.d === 'ec']);
            if (!s.a || !s.b || !s.c || !s.d) return '네 칸을 모두 골라 주세요.';
            if (cpSelOk()) return true;
            if (s.a !== 'ox' || s.b !== 'red') return '(−)극의 반응을 다시 생각해 보세요. 전지의 Zn은 전자를 내놓고, 전기 분해의 (−)극은 전자를 받아요.';
            return '전지는 화학 에너지를 전기 에너지로, 전기 분해는 반대로 바꿔요. 화살표 방향을 확인해요.';
          },
          status: () => '전지 (−)극 ' + mark(S.cp.sel.a === 'ox') + ' &nbsp; 전기 분해 (−)극 ' + mark(S.cp.sel.b === 'red') + ' &nbsp; 에너지 ' + mark(S.cp.sel.c === 'ce' && S.cp.sel.d === 'ec'),
          explain: '전지의 (−)극은 <b>산화</b>(Zn → Zn²⁺ + 2e⁻), 전기 분해의 (−)극은 <b>환원</b>(Zn²⁺ + 2e⁻ → Zn)이에요. 에너지는 전지에서 화학 → 전기, 전기 분해에서 전기 → 화학으로 바뀌어요.',
        },
        {
          type: 'quiz', title: '충전의 원리',
          goal: '휴대 전화 배터리를 <b>충전</b>하는 일은 전지의 반응과 어떤 관계일까요?',
          setup() { S.gate = ''; setScene('compare'); },
          choices: ['외부 전원으로 전지 반응의 역반응을 전기 분해로 일으키는 것이에요', '전지 속 물질을 새것으로 바꿔 넣는 것이에요', '전지 반응을 더 빨리 일으켜 전압을 높이는 것이에요', '전자가 도선을 지나지 않게 막는 것이에요'],
          answer: 0,
          feedback: ['', '충전은 물질을 바꾸는 것이 아니라 반응물을 다시 만드는 일이에요.', '충전할 때는 방전의 역반응이 일어나요. 반응 속도가 아니라 반응 방향이 달라져요.', '충전할 때도 전자는 도선을 지나가요. 방향이 반대일 뿐이에요.'],
          explain: '충전은 방전 때와 <b>반대 방향</b>으로 전류를 흘려 전지 반응의 역반응(전기 분해)을 일으키는 거예요. 그래서 충전할 때는 (−)극 물질이 환원돼요.',
        },
      ],
    },
    {
      title: '용융 NaCl: 이온과 전자의 길', short: '용융 NaCl', icon: '🔥', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기 분해에서는 (+)극에서 산화, (−)극에서 환원이 일어난다는 것을 알았어요. 이번에는 가장 단순한 경우인 <b>녹은 소금(용융 NaCl)</b>을 살펴봐요.</div>' +
        '<p>용융 NaCl에는 <b>Na⁺와 Cl⁻</b>만 있어요. 전원을 연결하면 이온이 각각 어느 전극으로 이동하고, 전극에서는 어떤 일이 일어날까요? 노란 <b>전자</b>가 이동하는 길(전자 장부)을 따라가 봐요.</p>',
      features: ['molten'],
      setup() { mlReset(); setScene('molten'); },
      recap: '용융 NaCl에서 Na⁺는 (−)극으로, Cl⁻는 (+)극으로 이동해요. (+)극에서 2Cl⁻ → Cl₂ + 2e⁻ (산화), (−)극에서 Na⁺ + e⁻ → Na (환원)이 일어나고, 전체 반응은 2NaCl → 2Na + Cl₂예요.',
      summary: '<ul><li>용융 NaCl(약 800 °C) 전기 분해 : Na⁺ → <b>(−)극</b>, Cl⁻ → <b>(+)극</b>으로 이동</li><li>(+)극(<b>산화 전극</b>) : 2Cl⁻ → Cl₂ + 2e⁻ (황록색 Cl₂ 기체) / (−)극(<b>환원 전극</b>) : Na⁺ + e⁻ → Na (은백색 Na)</li><li>전체 : <b>2NaCl → 2Na + Cl₂</b> · 전자 2 mol당 Na 2 mol, Cl₂ 1 mol</li><li>전자는 (+)극에서 전원 장치를 지나 (−)극으로 이동해요.</li></ul>',
      missions: [
        {
          title: '이온의 이동과 전극 반응식', manual: true,
          goal: '전원을 켜고 이온이 가는 방향을 관찰한 뒤, <b>이온의 이동 방향 · 전극 반응식 · 전체 반응식</b>을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전원 켜기를 누르면 양이온은 (−)극 쪽으로, 음이온은 (+)극 쪽으로 가요. (+)극에서는 전자를 내놓는 반응(산화), (−)극에서는 전자를 받는 반응(환원)이 일어나요.',
          setup() { S.gate = 'mlA'; S.ml.sel = { a: '', b: '', c: '', d: '', e: '' }; S.ml.roles = false; clearSel(['mlS1', 'mlS2', 'mlS3', 'mlS4', 'mlS5']); setScene('molten'); updateCtl(); },
          check() {
            const s = S.ml.sel; markSel(['mlS1', 'mlS2', 'mlS3', 'mlS4', 'mlS5'], [s.a === 'neg', s.b === 'pos', s.c === 'a', s.d === 'c', s.e === 'a']);
            if (S.ml.e < 2) return '먼저 “전원 켜기”로 이온이 움직이고 전자가 이동하는 것을 관찰해요.';
            if (!s.a || !s.b || !s.c || !s.d || !s.e) return '다섯 칸을 모두 골라 주세요.';
            if (mlSelOk()) { S.ml.roles = true; return true; }
            if (s.a !== 'neg' || s.b !== 'pos') return '양이온(Na⁺)과 음이온(Cl⁻)이 각각 어느 전극에 끌려가는지 그림에서 보세요.';
            return '(+)극에서는 Cl⁻가 전자를 내놓고, (−)극에서는 Na⁺가 전자를 받아요. e⁻가 화살표의 어느 쪽에 있어야 할까요?';
          },
          status: () => '전자 ' + S.ml.e + '개 이동 ' + mark(S.ml.e >= 2) + ' &nbsp; 이동 방향 ' + mark(S.ml.sel.a === 'neg' && S.ml.sel.b === 'pos') + ' &nbsp; 반응식 ' + mark(S.ml.sel.c === 'a' && S.ml.sel.d === 'c' && S.ml.sel.e === 'a'),
          explain: 'Na⁺는 (−)극으로, Cl⁻는 (+)극으로 이동해요. (+)극 : <b>2Cl⁻ → Cl₂ + 2e⁻</b> (산화 전극), (−)극 : <b>Na⁺ + e⁻ → Na</b> (환원 전극). 전체 반응은 <b>2NaCl → 2Na + Cl₂</b>이고, 전자 2개가 오갈 때 Na 2개와 Cl₂ 1분자가 생겨요.',
        },
        {
          type: 'quiz', title: '(+)극의 반응이 산화인 까닭',
          goal: '전기 분해에서 (+)극에서 일어나는 반응이 <b>산화</b>인 까닭은?',
          setup() { S.gate = ''; setScene('molten'); },
          choices: ['Cl⁻가 전자를 잃기 때문이에요 (전자가 (+)극에서 도선으로 나가요)', 'Cl⁻가 전자를 얻기 때문이에요', '(+)극에는 산소가 있기 때문이에요', 'Na⁺가 전자를 잃기 때문이에요'],
          answer: 0,
          feedback: ['', 'Cl⁻는 전자를 얻는 것이 아니라 Cl₂가 되면서 전자를 내놓아요 (2Cl⁻ → Cl₂ + 2e⁻).', '산화는 산소와 관계없이 전자를 잃는 반응이에요. 이 반응에는 산소가 필요 없어요.', 'Na⁺는 (−)극으로 가서 전자를 얻어요 (환원).'],
          explain: '산화는 <b>전자를 잃는</b> 반응이에요. (+)극에서 Cl⁻는 전자를 내놓고 Cl₂가 되며, 이 전자가 도선 · 전원을 지나 (−)극의 Na⁺에게 전달돼요.',
        },
      ],
    },
    {
      title: '수용액 경쟁: 물이 먼저 환원', short: '수용액 경쟁', icon: '💧', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용융 NaCl에는 Na⁺와 Cl⁻뿐이라서 (−)극에서 Na가 생겼어요. 그런데 NaCl <b>수용액</b>에는 이온 말고도 <b>물</b>이 있어요.</div>' +
        '<p>(−)극에서는 Na⁺와 물 중 <b>무엇이 먼저 환원될까요?</b> 먼저 예측하고, 환원 전위(E°)를 비교해 확인해요. 페놀프탈레인과 녹말-KI 종이로 생성물도 확인해요. <b>보안경을 쓰고 환기하며, 염소 기체와 폐액은 안내에 따라 처리해요.</b></p>',
      features: ['aqueous'],
      setup() { aqReset(); S.aq.pred = ''; S.aq.seen = false; setScene('aqueous'); },
      recap: 'NaCl 수용액을 전기 분해하면 (−)극에서는 Na⁺ 대신 환원 전위가 더 큰 물이 환원되어 H₂와 OH⁻가 생기고, (+)극에서는 Cl⁻가 산화되어 Cl₂가 생겨요. 그래서 나트륨 금속은 얻어지지 않아요.',
      summary: '<ul><li>NaCl 수용액 (탄소 전극) : (+)극 <b>2Cl⁻ → Cl₂ + 2e⁻</b> , (−)극 <b>2H₂O + 2e⁻ → H₂ + 2OH⁻</b></li><li>E°(Na⁺/Na) = −2.71 V &lt; E°(물, 염기성) ≈ −0.83 V → (−)극에서 <b>물</b>이 먼저 환원 (Na⁺는 그대로 남아요)</li><li>(−)극 주변이 염기성(페놀프탈레인 붉은색), (+)극 기체는 녹말-KI 종이를 푸르게 변색, 기체 부피비 H₂ : Cl₂ ≈ 1 : 1</li><li>전체 : 2NaCl + 2H₂O → 2NaOH + H₂ + Cl₂ (Cl⁻가 물보다 먼저 산화되는 것은 실험 사실)</li></ul>',
      missions: [
        {
          title: '극 반응 예측하고 확인하기',
          goal: '(−)극에서 환원되는 것을 <b>예측</b>하고, 전기 분해를 시작해 H₂가 모이게 한 뒤 <b>(+)극 기체</b>를 녹말-KI 종이로 확인하세요.',
          hint: '예측 단추 중 환원 전위(E°)가 더 큰 쪽을 골라요. 기체가 조금 모이면 “(+)극 기체에 종이 대 보기”를 눌러요.',
          setup() { S.gate = ''; aqReset(); S.aq.pred = ''; S.aq.seen = false; setScene('aqueous'); updateCtl(); },
          check: () => S.aq.pred === 'h2o' && S.aq.vH >= 0.3 && S.aq.blue, hold: 0.6,
          status: () => '예측 ' + mark(S.aq.pred === 'h2o') + ' &nbsp; H₂ ' + (S.aq.vH * 10).toFixed(1) + ' mL ' + mark(S.aq.vH >= 0.3) + ' &nbsp; 종이 청변 ' + mark(S.aq.blue),
          explain: '(−)극에서는 E°가 큰 <b>물</b>이 환원돼 H₂와 OH⁻가 생기고(페놀프탈레인이 붉어짐), (+)극에서는 Cl⁻가 산화돼 Cl₂가 생겨 녹말-KI 종이가 푸르게 변해요. 기체 부피는 H₂와 Cl₂가 거의 1 : 1이에요.',
        },
        {
          title: '생성물 비교표', manual: true,
          goal: '<b>용융 NaCl</b>과 <b>NaCl 수용액</b>의 전기 분해에서 각 전극에서 생기는 물질을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '용융 상태에는 물이 없어서 Na⁺가 환원돼요. 수용액의 (−)극에서는 물이 환원되고, (+)극에서는 두 경우 모두 Cl⁻가 산화돼요.',
          setup() { S.gate = 'aqB'; S.aq.sel = { a: '', b: '', c: '', d: '' }; clearSel(['aqS1', 'aqS2', 'aqS3', 'aqS4']); setScene('aqueous'); updateCtl(); },
          check() {
            const s = S.aq.sel; markSel(['aqS1', 'aqS2', 'aqS3', 'aqS4'], [s.a === 'Na', s.b === 'Cl2', s.c === 'H2', s.d === 'Cl2']);
            if (!s.a || !s.b || !s.c || !s.d) return '네 칸을 모두 골라 주세요.';
            if (aqSelOk()) return true;
            if (s.a !== 'Na' || s.c !== 'H2') return '(−)극 생성물을 다시 생각해 보세요. 용융 상태에는 Na⁺뿐이고, 수용액에는 물도 있어요.';
            return '(+)극에서는 두 경우 모두 같은 물질이 생겨요. 녹말-KI 종이를 푸르게 하는 기체가 무엇이었나요?';
          },
          status: () => '용융 ' + mark(S.aq.sel.a === 'Na' && S.aq.sel.b === 'Cl2') + ' &nbsp; 수용액 ' + mark(S.aq.sel.c === 'H2' && S.aq.sel.d === 'Cl2'),
          explain: '용융 NaCl : (−)극 <b>Na</b>, (+)극 <b>Cl₂</b>. NaCl 수용액 : (−)극 <b>H₂</b>(와 OH⁻), (+)극 <b>Cl₂</b>. (−)극 생성물이 달라지는 까닭은 수용액에 환원되기 더 쉬운 물이 있기 때문이에요.',
        },
        {
          type: 'quiz', title: '나트륨 금속이 안 얻어지는 까닭',
          goal: 'NaCl 수용액을 전기 분해해도 <b>나트륨 금속이 얻어지지 않는</b> 까닭은?',
          setup() { S.gate = ''; setScene('aqueous'); },
          choices: ['물이 Na⁺보다 환원 전위가 커서 먼저 환원되기 때문이에요', 'Na⁺가 (+)극으로 이동하기 때문이에요', '생긴 Na가 곧바로 Cl₂와 다시 반응하기 때문이에요', '수용액에서는 전류가 흐르지 않기 때문이에요'],
          answer: 0,
          feedback: ['', 'Na⁺는 양이온이라서 (−)극으로 이동해요. 하지만 그곳에서 물이 먼저 환원돼요.', '(−)극에서는 처음부터 Na가 아니라 H₂가 생겨요.', 'NaCl 수용액은 이온이 있어서 전류가 잘 흘러요.'],
          explain: '(−)극에서는 환원 전위가 더 큰 <b>물</b>(약 −0.83 V)이 Na⁺(−2.71 V)보다 먼저 환원돼 H₂가 생겨요. 그래서 나트륨 금속은 용융 NaCl을 전기 분해해야 얻어요.',
        },
      ],
    },
    {
      title: '전자 계산: 몰수의 비', short: '전자 계산', icon: '🧮', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용융 NaCl의 (+)극 · (−)극 반응식을 알았어요. 반응식의 계수는 전자와 생성물의 <b>몰수 비</b>를 알려 줘요.</div>' +
        '<p>이동한 <b>전자의 몰수</b>가 정해지면 생성물의 몰수와 질량을 계산할 수 있어요. 용융 NaCl은 전자 2 mol당 Na 2 mol · Cl₂ 1 mol, 물은 전자 4 mol당 H₂ 2 mol · O₂ 1 mol이에요. (전하량 계산은 하지 않고 몰수의 비만 써요.)</p>',
      features: ['calc'],
      setup() { S.ec.done = {}; ecPick('A'); setScene('calc'); },
      recap: '전기 분해에서 생성물의 양은 이동한 전자의 몰수에 비례해요. 용융 NaCl은 전자 : Na : Cl₂ = 2 : 2 : 1, 물은 전자 : H₂ : O₂ = 4 : 2 : 1이에요. 전지는 (−)극이 산화, 전기 분해는 (+)극이 산화예요.',
      summary: '<ul><li>용융 NaCl : 전자 2.0 mol → <b>Na 2.0 mol (46 g)</b> + <b>Cl₂ 1.0 mol (71 g)</b> (전자 : Na : Cl₂ = 2 : 2 : 1)</li><li>물의 전기 분해 : 전자 4.0 mol → <b>H₂ 2.0 mol + O₂ 1.0 mol</b> (부피비 H₂ : O₂ = 2 : 1)</li><li>전자 0.20 mol → Na 0.20 mol, Cl₂ 0.10 mol</li><li>극 이름 : 전지는 (−)극 = 산화 · (+)극 = 환원, 전기 분해는 (+)극 = 산화 · (−)극 = 환원</li><li>물을 전기 분해할 때는 Na₂SO₄ 같은 전해질을 넣어 전류를 나르는 이온을 공급해요.</li></ul>',
      missions: [
        {
          title: '생성물의 양 계산하기',
          goal: '시나리오 A · B · C를 하나씩 골라 전자의 몰수로 <b>생성물의 양</b>을 계산해 쓰세요. 세 시나리오를 모두 맞혀요.',
          hint: 'A : 전자 2.0 mol이면 Na 2.0 mol이에요. 질량은 몰수 × 몰 질량(Na 23 g/mol, Cl₂ 71 g/mol). B : 전자 4 mol당 H₂ 2 mol, O₂ 1 mol. C : 전자 0.20 mol이면 Na 0.20 mol, Cl₂ 0.10 mol.',
          setup() { S.gate = 'ecA'; S.ec.done = {}; ecPick('A'); setScene('calc'); updateCtl(); },
          check: () => ecNDone() >= 3, hold: 0.6,
          status: () => 'A ' + mark(S.ec.done.A) + ' &nbsp; B ' + mark(S.ec.done.B) + ' &nbsp; C ' + mark(S.ec.done.C),
          explain: 'A : 전자 2.0 mol → Na 2.0 mol × 23 g/mol = <b>46 g</b>, Cl₂ 1.0 mol × 71 g/mol = <b>71 g</b>. B : 전자 4.0 mol → H₂ <b>2.0 mol</b>, O₂ <b>1.0 mol</b>. C : 전자 0.20 mol → Na <b>0.20 mol</b>, Cl₂ <b>0.10 mol</b>.',
        },
        {
          type: 'quiz', title: '극 이름 규칙 비교',
          goal: '전기 분해에서 <b>산화가 일어나는 극</b>은 전지와 비교하면 어떨까요?',
          setup() { S.gate = ''; setScene('calc'); },
          choices: ['전기 분해는 (+)극에서 산화, 전지는 (−)극에서 산화예요', '전기 분해와 전지 모두 (−)극에서 산화가 일어나요', '전기 분해는 (−)극에서 산화, 전지는 (+)극에서 산화예요', '전기 분해에서는 산화가 일어나지 않아요'],
          answer: 0,
          feedback: ['', '전지의 (−)극은 맞지만, 전기 분해에서는 전원의 (+)극에 연결된 전극에서 전자를 잃어요.', '반대로 알고 있어요. 전지의 (+)극에서는 환원이 일어나요.', '전기 분해도 산화·환원 반응이에요. 산화와 환원이 동시에 일어나요.'],
          explain: '전기 분해에서는 전원의 (+)극에 연결된 전극에서 전자를 잃는 <b>산화</b>가, (−)극에서 <b>환원</b>이 일어나요. 전지에서는 이름이 반대로 (−)극 = 산화, (+)극 = 환원이에요.',
        },
        {
          type: 'quiz', title: '물을 전기 분해할 때 넣는 전해질',
          goal: '물을 전기 분해할 때 <b>순수한 물이 아니라 Na₂SO₄ 같은 전해질을 넣는</b> 까닭은?',
          setup() { S.gate = ''; setScene('calc'); },
          choices: ['전류를 나르는 이온을 공급하기 위해서예요', '전해질이 물과 반응해 H₂를 직접 만들기 때문이에요', '물의 환원 전위를 −2.71 V로 낮추기 위해서예요', '(−)극에서 Na가 생기게 하려고요'],
          answer: 0,
          feedback: ['', '전극에서 생기는 H₂와 O₂는 물에서 나와요. 전해질은 이온을 제공해 전류가 흐르게 해요.', '전해질을 넣어도 물의 환원 전위는 달라지지 않아요.', 'Na⁺는 물보다 환원되기 어려워서 Na는 생기지 않고 이온으로 남아 있어요.'],
          explain: '순수한 물은 이온이 거의 없어 전류가 잘 흐르지 않아요. 전해질을 넣으면 <b>이온이 전류를 나르고</b>, 전극에서는 물이 반응해 H₂와 O₂가 생겨요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-electrolysis', mount: '#game', badge: '전기 분해 박사', homeHref: '../../index.html#hr',
    featureLabels: { compare: '⚖️ 전원 전압 슬라이더 · 전류계', molten: '🔥 용융 NaCl 이온 모형', aqueous: '💧 NaCl 수용액 · 시험관 · 지시약', calc: '🧮 전자 몰수 계산기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  mlReset(); cpSet(0); ecPick('A');
  setScene('compare');
  function stepAll1(dt) { stepCompare(dt); stepMolten(dt); stepAq(dt); stepEc(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'compare') drawCompare(t); else if (S.mode === 'molten') drawMolten(t); else if (S.mode === 'aqueous') drawAq(t); else drawEc(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, mlG, aqG, cpSet, cpReset, cpState, mlReset, mlCl2, aqReset, aqPower, aqPred, aqPaper, ecPick, ecSlide, ecCheck, ecNDone, EC,
    get game() { return game; }, setScene, uiExtra, mlTry,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
