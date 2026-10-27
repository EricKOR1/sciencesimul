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
      ctx.fillStyle = sg === '+' ? POSC : NEGC; ctx.beginPath(); ctx.arc(cx, y, 8, 0, TAU); ctx.fill();
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
     화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 생명과 전지 속 산화·환원 [12반응02-05]
     ① 조사: 몸속 반응 (포도당 → CO₂ + H₂O, 전자 24개, NAD⁺ 셔틀, 전자 전달계)  ② 분석: 광합성 · 항산화 (반대 방향 반응, 비타민 C)
     ③ 분석: 전지 속 물질 (납 축전지 · 리튬 이온 전지 · 수소 연료 전지의 역할 이름표)  ④ 적용: 미래 전지 (레이더 차트 비교)
     효소 반응 메커니즘, ATP 합성 효소 구조, 전지의 정확한 전위 계산은 다루지 않아요. 점수는 학습용 상대 평가예요.
     ================================================================ */
  const MODE_LABEL = { body: '🧬 몸속 반응', photo: '🌿 광합성 · 항산화', battery: '🔋 전지 속 물질', future: '🌍 미래 전지' };
  const GLC = '#6b7280', CCO2 = '#94a3b8', OC = '#ef4444', HC_ = '#f8fafc', ATPC = '#fbbf24', NADC = '#a855f7';
  const ROLE = { red: ['환원제', '#dc2626', '#fee2e2'], oxi: ['산화제', '#2563eb', '#dbeafe'], elec: ['전해질', '#16a34a', '#dcfce7'], cat: ['촉매', '#d97706', '#fef3c7'] };

  Object.assign(S, {
    mode: 'body', sub: { photo: 'pr' },
    bd: { kind: 'cell', pc: 0, pf: 0, run: false, vals: { a: NaN, b: NaN, c: NaN, d: NaN, e: NaN }, order: [], atp: [], flags: {}, seenCell: false, cl: 0 },
    ps: { sel: { a: '', b: '', c: '', d: '' }, solved: false, dose: 1, t: 0, play: false, seen: false, ex: '', tt: 0 },
    bt: { k: 'pb', dir: 1, dk: 1, tag: {}, selPart: '', seenChg: false, vals: { a: NaN, b: NaN, c: NaN, d: NaN, e: NaN }, tt: 0 },
    fu: { sc: 'ev', show: { li: true, na: true, h2: false, pb: false }, sv: {}, pick: '', done: {}, idea: { a: '', b: '', c: '' }, r: [{}, {}, {}], tt: 0, fb: '' },
  });

  /* ---------- 공통 분자 그림 ---------- */
  function molO(x, y, r) { D.sphere(x, y, r, OC, { gloss: r > 8 }); }
  function molH(x, y, r) { D.sphere(x, y, r, HC_, { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); }
  /* 분자 그리기 : 가운데 정렬, 폭을 돌려줌 */
  function mol(x, y, type, s) {
    s = s || 1; const r = 8 * s;
    if (type === 'co2') { molO(x - 20 * s, y, r); molO(x + 20 * s, y, r); D.sphere(x, y, r * 1.05, GLC, { gloss: r > 7 }); return 48 * s; }
    if (type === 'h2o') { molO(x, y - 2 * s, r * 1.1); molH(x - 12 * s, y + 8 * s, r * 0.62); molH(x + 12 * s, y + 8 * s, r * 0.62); return 34 * s; }
    if (type === 'o2') { molO(x - 9 * s, y, r); molO(x + 9 * s, y, r); return 38 * s; }
    if (type === 'glu') {
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; D.sphere(x + Math.cos(a) * 20 * s, y + Math.sin(a) * 20 * s, r * 0.85, GLC, { gloss: false }); }
      ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; const px = x + Math.cos(a) * 20 * s, py = y + Math.sin(a) * 20 * s; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
      for (let i = 0; i < 3; i++) { const a = (i * 2 + 1) / 6 * TAU - Math.PI / 2; molO(x + Math.cos(a) * 34 * s, y + Math.sin(a) * 34 * s, r * 0.6); }
      return 80 * s;
    }
    return 30;
  }

  /* ============ ① 몸속 반응 ============ */
  const bdLay = () => PHONE
    ? { G: { x: MAIN.x + 62, y: MAIN.y + 114 }, N: { x: MAIN.x + 152, y: MAIN.y + 114 }, tr: [0, 1, 2].map((i) => ({ x: MAIN.x + 176 + i * 92, y: MAIN.y + 154 + i * 50, w: 88 })), O: { x: MAIN.x + 402, y: MAIN.y + 346 }, box: { x: MAIN.x + 14, y: MAIN.y + 236, w: 216, h: 96 } }
    : { G: { x: MAIN.x + 84, y: MAIN.y + 118 }, N: { x: MAIN.x + 194, y: MAIN.y + 118 }, tr: [0, 1, 2].map((i) => ({ x: MAIN.x + 268 + i * 112, y: MAIN.y + 142 + i * 38, w: 104 })), O: { x: MAIN.x + 668, y: MAIN.y + 262 }, box: { x: MAIN.x + 380, y: MAIN.y + 10, w: 240, h: 96 } };
  function bdPath(kind) {
    const L = bdLay();
    if (kind === 'fire') return [[L.G.x + 36, L.G.y], [L.O.x - 26, L.O.y - 10]];
    const t = L.tr; return [[L.G.x + 36, L.G.y], [L.N.x, L.N.y], [t[0].x + 52, t[0].y - 12], [t[1].x + 52, t[1].y - 12], [t[2].x + 52, t[2].y - 12], [L.O.x - 26, L.O.y - 10]];
  }
  const bdP = () => (S.bd.kind === 'cell' ? S.bd.pc : S.bd.pf);
  const bdU = (i, p, kind) => (kind === 'cell' ? clamp((p - (i / 24) * 0.72) / 0.28, 0, 1) : clamp((p - (i / 24) * 0.12) / 0.88, 0, 1));
  const bdE = (kind) => { const p = kind === 'cell' ? S.bd.pc : S.bd.pf; let n = 0; for (let i = 0; i < 24; i++) if (bdU(i, p, kind) >= 0.999) n++; return n; };
  const bdLeft = (kind) => { const p = kind === 'cell' ? S.bd.pc : S.bd.pf; let n = 0; for (let i = 0; i < 24; i++) if (bdU(i, p, kind) > 0.001) n++; return n; };
  function bdReset() { const b = S.bd; b.pc = 0; b.pf = 0; b.run = false; b.atp = []; b.flags = {}; b.seenCell = false; parts.clear(); updateCtl(); }
  function bdGo() { const b = S.bd; if (bdP() >= 0.999) { if (b.kind === 'cell') { b.pc = 0; b.flags = {}; b.atp = []; } else b.pf = 0; } b.run = !b.run; Sound.click(); updateCtl(); }
  function bdKind(k) { const b = S.bd; b.kind = k; b.run = false; updateCtl(); }
  function stepBody(dt) {
    const b = S.bd; if (S.mode !== 'body') return;
    if (b.run) {
      if (b.kind === 'cell') { b.pc = Math.min(1, b.pc + dt / 17); if (b.pc >= 1) { b.run = false; b.seenCell = true; updateCtl(); } }
      else { b.pf = Math.min(1, b.pf + dt / 3.6); if (b.pf >= 1) { b.run = false; const L = bdLay(); parts.burst(L.O.x, L.O.y, { count: 40, speed: 220, size: 4, colors: ['#fb923c', '#fde047', '#ef4444'] }); updateCtl(); } }
    }
    const L = bdLay();
    if (b.kind === 'cell') for (let i = 0; i < 24; i++) {
      const u = bdU(i, b.pc, 'cell');
      [0.46, 0.64, 0.82].forEach((th, j) => { const key = i + '_' + j; if (u >= th && !b.flags[key]) { b.flags[key] = true; if ((i + j) % 4 === 0) { const tr = L.tr[j], n = b.atp.length, sp = (L.box.w - 44) / 7; b.atp.push({ x: tr.x + 52, y: tr.y - 4, k: 0, tx: L.box.x + 22 + (n % 8) * sp, ty: L.box.y + 46 + Math.floor(n / 8) * 17 }); } } });
    }
    b.atp.forEach((a) => { a.k = Math.min(1, a.k + dt * 1.2); a.x = ap(a.x, a.tx, dt, 3); a.y = ap(a.y, a.ty, dt, 3); });
  }
  const bdOk = () => { const v = S.bd.vals; return near(v.a, 0, 0.001) && near(v.b, 4, 0.001) && near(v.c, 0, 0.001) && near(v.d, -2, 0.001) && near(v.e, 24, 0.001); };
  const BDN = [['glu', '포도당'], ['nad', 'NAD⁺ (전자 셔틀)'], ['chain', '전자 전달체 (계단)'], ['o2', '산소 O₂']];
  const bdOrdOk = () => S.bd.order.join(',') === 'glu,nad,chain,o2';
  function drawBody(t) {
    const b = S.bd, L = bdLay(), kind = b.kind, p = bdP(), emitted = bdLeft(kind), arr = bdE(kind);
    T(14, 26, kind === 'cell' ? '🧬 세포에서는 포도당이 불꽃 없이 천천히 “타요”' : '🔥 같은 반응을 불에 태우면 한꺼번에 열과 빛이 나와요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 계단 (전자 전달계)
    if (kind === 'cell') {
      L.tr.forEach((tr, i) => {
        const gr = ctx.createLinearGradient(tr.x, 0, tr.x + tr.w, 0); gr.addColorStop(0, '#c4b5fd'); gr.addColorStop(1, '#8b5cf6');
        D.shadow(() => { D.roundRect(tr.x, tr.y, tr.w, PHONE ? 26 : 30, 7); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
        T(tr.x + tr.w / 2, tr.y + (PHONE ? 18 : 20), '전달체 ' + (i + 1), 13.5, '#fff', 'center', 800);
        if (i < 2) { ctx.strokeStyle = 'rgba(139,92,246,.45)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(tr.x + tr.w - 8, tr.y + 28); ctx.lineTo(L.tr[i + 1].x + 8, L.tr[i + 1].y); ctx.stroke(); ctx.setLineDash([]); }
      });
      if (!PHONE) T(L.tr[0].x + 4, L.tr[0].y - 26, '에너지가 낮은 쪽으로 계단처럼 내려가요', 12.5, '#6d28d9', 'left', 800);
      // NAD
      D.roundRect(L.N.x - 34, L.N.y - 15, 68, 30, 15); ctx.fillStyle = '#f3e8ff'; ctx.fill(); ctx.strokeStyle = NADC; ctx.lineWidth = 2; ctx.stroke(); T(L.N.x, L.N.y + 5, 'NAD⁺', 14, '#6b21a8', 'center', 800);
      T(L.N.x, L.N.y + 32, '전자 셔틀', 12.5, '#6b21a8', 'center', 800);
      // ATP 저장 상자
      const bx = L.box; D.roundRect(bx.x, bx.y, bx.w, bx.h, 12); ctx.fillStyle = '#fffbeb'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();
      T(bx.x + 12, bx.y + 22, 'ATP 저장', 13.5, '#92400e', 'left', 800);
      b.atp.forEach((a) => { ctx.save(); ctx.globalAlpha = Math.min(1, a.k * 2); D.sphere(a.x, a.y, 8, ATPC, { gloss: true, text: 'ATP', textColor: '#78350f', textScale: 0.62, outline: '#b45309', outlineWidth: 1 }); ctx.restore(); });
    } else {
      D.flame(L.G.x, L.G.y + 46, 18 + 26 * Math.min(1, p * 4), t, {});
    }
    // 포도당
    const nC = Math.max(0, 6 - Math.floor(emitted / 4));
    ctx.save();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; if (i < nC) D.sphere(L.G.x + Math.cos(a) * 24, L.G.y + Math.sin(a) * 24, 10, GLC, { gloss: true }); else { ctx.globalAlpha = 0.18; D.sphere(L.G.x + Math.cos(a) * 24, L.G.y + Math.sin(a) * 24, 10, '#cbd5e1', { gloss: false }); ctx.globalAlpha = 1; } }
    ctx.restore();
    T(L.G.x, L.G.y + (PHONE ? 52 : 56), '포도당 C₆H₁₂O₆', 13.5, INK, 'center', 800);
    // CO₂ 배출
    const nCO = Math.floor(emitted / 4);
    for (let i = 0; i < nCO; i++) { const cx = L.G.x - 6 + (i % 3) * 44, cy = L.G.y - 58 - Math.floor(i / 3) * 26; mol(cx, cy, 'co2', 0.62); }
    if (nCO > 0) T(L.G.x + (PHONE ? 18 : 24), L.G.y - 58 - (nCO > 3 ? 52 : 26) - 4, 'CO₂ ' + nCO + '분자', 12.5, MUTED, 'center', 800);
    // 산소와 물
    mol(L.O.x, L.O.y, 'o2', 1.1); T(L.O.x, L.O.y + 28, 'O₂', 13.5, INK, 'center', 800);
    const nW = Math.floor(arr / 4);
    const hx = PHONE ? L.O.x - 132 : L.O.x - 30, hy = PHONE ? L.O.y - 8 : L.O.y - 56, hs = PHONE ? 1 : 1;
    for (let i = 0; i < nW; i++) mol(hx + (i % 3) * 36, hy - Math.floor(i / 3) * 26, 'h2o', 0.7);
    if (nW > 0) T(hx + 36, hy - (nW > 3 ? 26 : 0) - 22, 'H₂O ' + nW + '분자', 12.5, MUTED, 'center', 800);
    // 전자
    const path = bdPath(kind);
    for (let i = 0; i < 24; i++) {
      const u = bdU(i, p, kind); if (u <= 0.001 || u >= 0.999) continue;
      const q = ptAlong(path, u); eBall(q.x, q.y - 2, 5.4);
    }
    if (kind === 'fire' && p > 0.9) { D.glow(L.O.x, L.O.y, 60 + 20 * Math.sin(t * 20), '#fb923c', 0.7); T(L.O.x, L.O.y - 44, '열 · 빛!', 15, '#c2410c', 'center', 900); }
    // 상태 문구
    T(MAIN.x + MAIN.w - 14, MAIN.y + MAIN.h - 12, '이동한 전자 ' + arr + ' / 24개 (포도당 1분자)', 14, '#92400e', 'right', 800);
    if (!b.run && p < 0.001) pill(MAIN.x + MAIN.w * 0.55, MAIN.y + MAIN.h * 0.5, '“전자 흘려 보내기”를 눌러요', { bg: '#fff7d6', color: '#7a4a00', border: '#f59e0b', size: 14, alpha: 0.95 });
    // INFO : 산화수 표 + 에너지 막대
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const v = b.vals, fm = (x, ok) => (isNaN(x) ? '?' : oxs(x));
    const rows = [['C', '포도당', v.a, v.a === 0, 'CO₂', v.b, near(v.b, 4, 0.001)], ['O', 'O₂', v.c, near(v.c, 0, 0.001), 'H₂O', v.d, near(v.d, -2, 0.001)]];
    T(INFO.x + 16, INFO.y + 24, '산화수 표', 14.5, WARN, 'left', 900);
    rows.forEach((r, i) => {
      const y = INFO.y + 50 + i * 26;
      T(INFO.x + 16, y, r[0] + ' : ' + r[1] + ' ', PHONE ? 13 : 14, INK, 'left', 800);
      T(INFO.x + (PHONE ? 112 : 128), y, fm(r[2]) + ' → ' + r[4] + ' ' + fm(r[5]), PHONE ? 13 : 14, (near(r[2], i ? 0 : 0, 0.001) && near(r[5], i ? -2 : 4, 0.001)) ? '#166534' : MUTED, 'left', 800);
    });
    T(INFO.x + 16, INFO.y + 106, '이동한 전자 : ' + (isNaN(v.e) ? '?' : v.e) + '개 / 포도당 1분자', PHONE ? 13 : 14, near(v.e, 24, 0.001) ? '#166534' : MUTED, 'left', 800);
    // 에너지 막대
    const ex = INFO.x + (PHONE ? 16 : 330), ew = INFO.w - (PHONE ? 32 : 346), ey = INFO.y + (PHONE ? 140 : 30);
    T(ex, ey, '에너지가 어디로 갔을까요?', 14, WARN, 'left', 900);
    [['🧬 세포 호흡', S.bd.pc, true], ['🔥 불에 태우기', S.bd.pf, false]].forEach((r, i) => {
      const y = ey + 16 + i * (PHONE ? 52 : 46), pp = r[1];
      T(ex, y + 12, r[0], 13, INK, 'left', 800);
      D.roundRect(ex + (PHONE ? 100 : 96), y, ew - (PHONE ? 100 : 96), 20, 7); ctx.fillStyle = '#eef2f7'; ctx.fill();
      const bw = ew - (PHONE ? 100 : 96), bx0 = ex + (PHONE ? 100 : 96);
      ctx.save(); D.roundRect(bx0, y, bw, 20, 7); ctx.clip();
      if (r[2]) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx0, y, bw * 0.35 * pp, 20); ctx.fillStyle = '#ef4444'; ctx.fillRect(bx0 + bw * 0.35 * pp, y, bw * 0.65 * pp, 20); }
      else { ctx.fillStyle = '#ef4444'; ctx.fillRect(bx0, y, bw * pp, 20); }
      ctx.restore();
      if (r[2] && pp > 0.98) { ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx0 + bw * 0.30, y - 3); ctx.lineTo(bx0 + bw * 0.30, y + 23); ctx.moveTo(bx0 + bw * 0.40, y - 3); ctx.lineTo(bx0 + bw * 0.40, y + 23); ctx.stroke(); T(bx0 + bw * 0.35, y + 38 - 2, 'ATP 약 30~40 %', 12.5, '#92400e', 'center', 800); }
      if (!r[2] && pp > 0.98) T(bx0 + bw / 2, y + 14.5, '열 · 빛 100 %', 12.5, '#fff', 'center', 800);
    });
  }

  /* ============ ② 광합성 · 항산화 ============ */
  const PSS = [['', '선택하세요'], ['ox', '산화됨'], ['re', '환원됨']];
  const psOk = () => { const s = S.ps.sel; return s.a === 'ox' && s.b === 're' && s.c === 'ox' && s.d === 're'; };
  const AP_V = [0, 12, 30], AP_N = ['없음', '적게', '많이'];
  const apL = () => S.ps.t;                                     // 산화 부하 (시간 단위)
  const apBrown = (treated) => clamp((apL() - (treated ? AP_V[S.ps.dose] : 0)) / 20, 0, 1);
  const apVC = () => (AP_V[S.ps.dose] > 0 ? clamp((AP_V[S.ps.dose] - apL()) / AP_V[S.ps.dose], 0, 1) : 0);
  function psReset() { const p = S.ps; p.t = 0; p.play = false; p.seen = false; p.tt = 0; updateCtl(); }
  function psDose(v) { S.ps.dose = +v; psReset(); }
  function stepPhoto(dt) {
    const p = S.ps; if (S.mode !== 'photo') return; p.tt += dt;
    if (p.play) { p.t = Math.min(40, p.t + dt * 4); if (p.t >= 40) { p.play = false; updateCtl(); } }
    if (p.dose > 0 && apBrown(false) >= 0.6 && apBrown(true) <= 0.1 && !p.seen) { p.seen = true; updateCtl(); }
  }
  function drawArrowFlow(x1, y, x2, dir, t, col) {
    const a = dir > 0 ? x1 : x2, bb = dir > 0 ? x2 : x1;
    D.arrow(a, y, bb, y, { color: col, width: 5, head: 13 });
    for (let i = 0; i < 4; i++) { const u = RM ? (i + 0.5) / 4 : ((t * 0.3 + i / 4) % 1); const x = a + (bb - a) * u; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }
  }
  function drawApple(cx, cy, r, brown, treated, dose, vc, t) {
    // 사과 반쪽 단면
    ctx.save();
    D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#e11d48'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, TAU); ctx.fillStyle = C.mix('#fff6d6', '#9a6a34', brown); ctx.fill();
    ctx.strokeStyle = 'rgba(120,53,15,.25)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.6; ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16, 3, 5, a, 0, TAU); ctx.fill(); }
    if (treated && dose > 0 && vc > 0.02) { ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, TAU); ctx.fillStyle = 'rgba(253,224,71,' + (0.28 * vc) + ')'; ctx.fill(); }
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx + 4, cy - r - 14, cx + 12, cy - r - 18); ctx.stroke();
    ctx.restore();
  }
  function drawPhoto(t) {
    const sub = S.sub.photo, p = S.ps;
    T(14, 26, sub === 'pr' ? '🌿 광합성과 세포 호흡은 서로 반대 방향의 산화·환원이에요' : '🍎 사과가 갈색으로 변하는 것을 비타민 C가 늦춰요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    if (sub === 'pr') {
      const W = PHONE ? MAIN.w - 24 : (MAIN.w - 36) / 2, H = PHONE ? 176 : MAIN.h - 24;
      [[0, '🌿 광합성', '빛 에너지', 1], [1, '🧬 세포 호흡', '에너지(ATP) 얻음', -1]].forEach(([i, title, sub2, dir]) => {
        const x = MAIN.x + 12 + (PHONE ? 0 : i * (W + 12)), y = MAIN.y + 12 + (PHONE ? i * (H + 12) : 0);
        D.roundRect(x, y, W, H, 12); ctx.fillStyle = i ? '#fdf2f8' : '#f0fdf4'; ctx.fill(); ctx.strokeStyle = i ? '#f9a8d4' : '#86efac'; ctx.lineWidth = 2; ctx.stroke();
        T(x + 14, y + 26, title, 16, INK, 'left', 900); T(x + W - 14, y + 26, sub2, 13.5, MUTED, 'right', 800);
        const cy = y + (PHONE ? 88 : 128), colL = x + W * 0.2, colR = x + W * 0.8, mid = x + W / 2;
        const left = [['co2', '6 CO₂'], ['h2o', '6 H₂O']];
        const right = [['glu', 'C₆H₁₂O₆'], ['o2', '6 O₂']];
        const put = (cx, arr, tagSet) => arr.forEach((m, j) => { const yy = cy + (j ? 40 : -34); mol(cx, yy, m[0], m[0] === 'glu' ? 0.62 : 0.9); T(cx, yy + (m[0] === 'glu' ? 34 : 26), m[1], 13, INK, 'center', 800); });
        put(colL, left); put(colR, right);
        drawArrowFlow(mid - 34, cy, mid + 34, dir, t, i ? '#ec4899' : '#16a34a');
        if (!i) { D.glow(mid, cy - 40, 24, '#fde047', 0.8); T(mid, cy - 36, '☀', 20, '#f59e0b', 'center', 900); }
        // 전자 이동
        T(mid, cy + 28, 'e⁻ ' + (i ? '포도당 → O₂' : 'H₂O → CO₂'), 12.5, '#b45309', 'center', 800);
        // 분류 결과 태그
        if (p.solved) {
          if (!i) { pill(colL, y + 54, 'CO₂ 환원됨 (C +4 → 0)', { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', size: 12.5, pad: 5 }); pill(colL, y + H - 20, 'H₂O 산화됨 (O −2 → 0)', { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', size: 12.5, pad: 5 }); }
          else { pill(colR, y + 54, '포도당 산화됨 (C 0 → +4)', { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', size: 12.5, pad: 5 }); pill(colR, y + H - 20, 'O₂ 환원됨 (O 0 → −2)', { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', size: 12.5, pad: 5 }); }
        }
      });
    } else {
      const r = PHONE ? 62 : 82, cy = MAIN.y + (PHONE ? 150 : 150), cxL = MAIN.x + MAIN.w * (PHONE ? 0.26 : 0.2), cxR = MAIN.x + MAIN.w * (PHONE ? 0.74 : 0.46);
      const bU = apBrown(false), bT = apBrown(true), vc = apVC();
      drawApple(cxL, cy, r, bU, false, 0, 0, t); drawApple(cxR, cy, r, bT, true, p.dose, vc, t);
      T(cxL, cy + r + 24, '그냥 두기', 14.5, INK, 'center', 800); T(cxR, cy + r + 24, '비타민 C ' + AP_N[p.dose], 14.5, INK, 'center', 800);
      // 산소(산화제) 입자
      const nO = p.play || p.t > 0 ? 6 : 0;
      for (let i = 0; i < nO; i++) { [cxL, cxR].forEach((cx, k) => { const u = RM ? 0.3 : ((t * 0.35 + i / nO + k * 0.17) % 1); const ang = i / nO * TAU; const rr = r + 46 - 40 * u; ctx.save(); ctx.globalAlpha = 0.9 * (1 - u * 0.7); D.sphere(cx + Math.cos(ang) * rr, cy - 4 + Math.sin(ang) * rr * 0.9, 5, '#38bdf8', { gloss: false }); ctx.restore(); }); }
      // 막대 : 갈변 · 비타민 C
      const bxs = PHONE ? MAIN.x + 24 : MAIN.x + MAIN.w * 0.58, bw = PHONE ? MAIN.w - 48 : MAIN.w * 0.4 - 16, by0 = PHONE ? MAIN.y + MAIN.h - 150 : MAIN.y + 50;
      const bar = (y, lab, val, col, txt) => { T(bxs, y - 6, lab, 13.5, INK, 'left', 800); D.roundRect(bxs, y, bw, 18, 7); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (val > 0.004) { ctx.save(); D.roundRect(bxs, y, bw, 18, 7); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(bxs, y, bw * clamp(val, 0, 1), 18); ctx.restore(); } T(bxs + bw, y - 6, txt, 13, MUTED, 'right', 800); };
      bar(by0 + 14, '갈변 (그냥 둔 사과)', bU, '#92400e', Math.round(bU * 100) + ' %');
      bar(by0 + 14 + 44, '갈변 (비타민 C 바른 사과)', bT, '#92400e', Math.round(bT * 100) + ' %');
      bar(by0 + 14 + 88, '남은 비타민 C', vc, '#eab308', p.dose ? Math.round(vc * 100) + ' %' : '없음');
      T(bxs, by0 + 14 + 128, '시간 ' + Math.round(p.t) + ' / 40', 13.5, MUTED, 'left', 800);
      if (!PHONE) T(bxs, by0 + 14 + 156, p.dose > 0 ? (vc > 0.02 ? '비타민 C가 먼저 산화돼요' : '비타민 C를 다 쓴 뒤 갈변이 시작돼요') : '비타민 C를 골라 비교해요', 13.5, '#7a3410', 'left', 800);
    }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (sub === 'pr') {
      T(INFO.x + 16, INFO.y + 26, '광합성 : 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (호흡은 반대 방향)', PHONE ? 13.5 : 15.5, WARN, 'left', 900);
      textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, p.solved ? '같은 물질이 광합성에서는 산화(H₂O)·환원(CO₂)을, 호흡에서는 반대로 포도당 산화·O₂ 환원을 겪어요. 에너지 방향도 반대예요.' : '각 물질이 산화되는지 환원되는지 산화수로 따져 아래에서 분류해요. (C는 +4 ↔ 0, O는 −2 ↔ 0)', PHONE ? 13.5 : 14.5, p.solved ? '#166534' : MUTED, 20, 800);
    } else {
      T(INFO.x + 16, INFO.y + 26, '비타민 C(항산화제) : 자기가 먼저 산화돼서 다른 물질의 산화를 막아요', PHONE ? 13 : 15, WARN, 'left', 900);
      textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '사과 속 폴리페놀이 산소에 산화되면 갈색이 돼요. 비타민 C를 바르면 비타민 C가 대신 산화되어(환원제) 갈변이 늦어져요.', PHONE ? 13.5 : 14.5, INK, 20, 700);
      if (p.seen) textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 70 : 40), INFO.w - 32, '✅ 비타민 C를 바른 사과는 갈변이 훨씬 늦었어요.', 14, '#166534', 19, 800);
    }
  }

  /* ============ ③ 전지 속 물질 ============ */
  const BT = {
    pb: { name: '납 축전지', volt: '셀당 약 2.0 V', parts: [{ id: 'pb', box: 'neg', name: 'Pb', ans: 'red', req: true }, { id: 'pbo2', box: 'pos', name: 'PbO₂', ans: 'oxi', req: true }, { id: 'h2so4', box: 'elec', name: 'H₂SO₄ 용액', ans: 'elec', req: false }],
      eq: 'Pb + PbO₂ + 2H₂SO₄ ⇌ 2PbSO₄ + 2H₂O', neg: '(−)극 : Pb 가 PbSO₄ 로 (방전) / 충전은 반대', pos: '(+)극 : PbO₂ 가 PbSO₄ 로 (방전) / 충전은 반대', ion: ['H⁺', '#ef6b6b', 'SO₄²⁻', ANC] },
    li: { name: '리튬 이온 전지', volt: '약 3.7 V', parts: [{ id: 'lic6', box: 'neg', name: 'LiC₆', ans: 'red', req: true }, { id: 'coo2', box: 'pos', name: 'CoO₂', ans: 'oxi', req: false }, { id: 'org', box: 'elec', name: '유기 전해질', ans: 'elec', req: true }],
      eq: '(−) LiC₆ → C₆ + Li⁺ + e⁻ , (+) CoO₂ + Li⁺ + e⁻ → LiCoO₂', neg: '(−)극 : LiC₆ → C₆ + Li⁺ + e⁻ (방전)', pos: '(+)극 : CoO₂ + Li⁺ + e⁻ → LiCoO₂ (방전)', ion: ['Li⁺', '#f472b6', null, null] },
    fc: { name: '수소 연료 전지', volt: '셀당 약 0.7 ~ 1.0 V', parts: [{ id: 'h2', box: 'neg', name: 'H₂ (연료)', ans: 'red', req: false }, { id: 'o2', box: 'pos', name: 'O₂ (공기)', ans: 'oxi', req: true }, { id: 'pt', box: 'cat', name: 'Pt 촉매', ans: 'cat', req: true }, { id: 'mem', box: 'elec', name: '전해질막', ans: 'elec', req: false }],
      eq: '(−) H₂ → 2H⁺ + 2e⁻ , (+) O₂ + 4H⁺ + 4e⁻ → 2H₂O  →  2H₂ + O₂ → 2H₂O', neg: '(−)극 : H₂ → 2H⁺ + 2e⁻', pos: '(+)극 : O₂ + 4H⁺ + 4e⁻ → 2H₂O', ion: ['H⁺', '#ef6b6b', null, null] },
  };
  const BTK = ['pb', 'li', 'fc'];
  const btTagKey = (k, id) => k + ':' + id;
  const btParts = () => BT[S.bt.k].parts;
  const btTag = (k, pr) => (pr.req ? S.bt.tag[btTagKey(k, pr.id)] || '' : pr.ans);
  const btAllReq = () => BTK.every((k) => BT[k].parts.filter((q) => q.req).every((q) => S.bt.tag[btTagKey(k, q.id)] === q.ans));
  const btNReq = () => BTK.reduce((n, k) => n + BT[k].parts.filter((q) => q.req && S.bt.tag[btTagKey(k, q.id)] === q.ans).length, 0);
  function btPick(k) { const b = S.bt; b.k = k; b.selPart = ''; if (k === 'fc' && b.dir < 0) { b.dir = 1; } updateCtl(); }
  function btDir(d) { const b = S.bt; if (d < 0 && b.k === 'fc') { showHint('연료 전지는 충전하지 않고 연료와 산소를 계속 공급해요.', 3600); return; } b.dir = d; if (d < 0) b.seenChg = true; Sound.click(); updateCtl(); }
  function btRole(r) { const b = S.bt, pr = btParts().find((q) => q.id === b.selPart); if (!pr) { showHint('먼저 그림에서 물질 상자를 눌러 골라요.', 3000); return; } if (!pr.req) { showHint('이 물질은 이미 이름표가 붙어 있어요 (예시).', 3000); return; } b.tag[btTagKey(b.k, pr.id)] = r; Sound.tick(); updateCtl(); }
  const btLay = () => {
    const w = PHONE ? 440 : 520, h = PHONE ? 210 : 190, x = MAIN.x + (MAIN.w - w) / 2, y = MAIN.y + (PHONE ? 130 : 108);
    const ew = PHONE ? 100 : 118, eh = h - 40, ey = y + 22;
    const neg = { x: x + 16, y: ey, w: ew, h: eh }, pos = { x: x + w - 16 - ew, y: ey, w: ew, h: eh };
    const mid = { x: neg.x + ew + 2, y: ey, w: pos.x - neg.x - ew - 4, h: eh };
    return { x, y, w, h, neg, pos, mid, wire: MAIN.y + (PHONE ? 52 : 44) };
  };
  function btRects(k) {
    const L = btLay(), out = {};
    BT[k].parts.forEach((pr) => {
      if (pr.box === 'neg') out[pr.id] = { x: L.neg.x, y: L.neg.y, w: L.neg.w, h: L.neg.h };
      else if (pr.box === 'pos') out[pr.id] = { x: L.pos.x, y: L.pos.y, w: L.pos.w, h: L.pos.h };
      else if (pr.box === 'elec') out[pr.id] = { x: L.mid.x + 8, y: L.mid.y + L.mid.h - 40, w: L.mid.w - 16, h: 32 };
      else out[pr.id] = { x: L.pos.x - 22, y: L.pos.y + 8, w: 22, h: L.pos.h - 16 };       // 촉매 : (+)극 안쪽 면
    });
    return out;
  }
  function stepBattery(dt) { const b = S.bt; if (S.mode !== 'battery') return; b.dk = ap(b.dk, b.dir, dt, 5); if (Math.abs(b.dk - b.dir) < 0.01) b.dk = b.dir; b.tt += dt; }
  function drawBattery(t) {
    const b = S.bt, k = b.k, B = BT[k], L = btLay(), dk = b.dk, rects = btRects(k);
    T(14, 26, '🔋 ' + B.name + ' 속 물질은 어떤 역할을 할까요?', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 외부 회로
    const wy = L.wire, xl = L.neg.x + L.neg.w / 2, xr = L.pos.x + L.pos.w / 2, cx = L.x + L.w / 2;
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(xl, L.neg.y); ctx.lineTo(xl, wy); ctx.lineTo(cx - 48, wy); ctx.moveTo(cx + 48, wy); ctx.lineTo(xr, wy); ctx.lineTo(xr, L.pos.y); ctx.stroke(); ctx.restore();
    if (b.dir > 0 || dk > 0) { ctx.save(); ctx.globalAlpha = clamp((dk + 1) / 2, 0, 1); bulbDraw(cx, wy, 0.7); ctx.restore(); }
    if (b.dir < 0) { ctx.save(); ctx.globalAlpha = clamp((1 - dk) / 2, 0, 1); supplyDraw(cx, wy, '충전', true, true); ctx.restore(); }
    // 전자 : 방전 (−)→(+) , 충전 (+)→(−)
    const wp = [[xl, L.neg.y], [xl, wy], [xr, wy], [xr, L.pos.y]], flow = Math.abs(dk);
    for (let i = 0; i < 7; i++) { const u = ((i / 7) + t * 0.2 * Math.sign(dk || 1) + 10) % 1, q = ptAlong(wp, u); ctx.save(); ctx.globalAlpha = Math.min(1, flow * 1.3); eBall(q.x, q.y, 4.8); ctx.restore(); }
    // 전지 본체
    D.shadow(() => { D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fillStyle = '#f1f5f9'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.stroke();
    // 전해질 영역
    D.roundRect(L.mid.x, L.mid.y, L.mid.w, L.mid.h, 6); ctx.fillStyle = k === 'li' ? 'rgba(244,114,182,.12)' : 'rgba(147,197,253,.28)'; ctx.fill();
    if (k === 'fc') { ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(L.mid.x + L.mid.w / 2, L.mid.y); ctx.lineTo(L.mid.x + L.mid.w / 2, L.mid.y + L.mid.h); ctx.stroke(); ctx.setLineDash([]); }
    // 전극
    [[L.neg, k === 'li' ? '#475569' : k === 'pb' ? '#94a3b8' : '#cbd5e1', '(−)극', NEGC], [L.pos, k === 'pb' ? '#7c4a2d' : k === 'li' ? '#3b5bdb' : '#e2e8f0', '(+)극', POSC]].forEach(([r, col, lab, pc]) => {
      const gr = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0); gr.addColorStop(0, C.shade(col, 0.2)); gr.addColorStop(1, C.shade(col, -0.15));
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
      pill(r.x + r.w / 2, r.y - 10, lab + ' · ' + (lab === '(−)극' ? (dk > 0 ? '산화' : '환원') : (dk > 0 ? '환원' : '산화')), { bg: pc, color: '#fff', border: null, size: 12.5, pad: 5 });
    });
    // 이온 이동
    const ion = B.ion, n = 6;
    for (let i = 0; i < n; i++) {
      const u = RM ? (i + 0.5) / n : (((t * 0.16 * Math.sign(dk || 1) + i / n) % 1) + 1) % 1;
      const x = L.mid.x + 12 + (L.mid.w - 24) * u, y = L.mid.y + 20 + ((i * 37) % 70) / 70 * (L.mid.h - 90);
      ctx.save(); ctx.globalAlpha = Math.min(1, flow * 1.4) * (0.4 + 0.6 * Math.sin(Math.PI * u)); D.sphere(x, y, 5.6, ion[1], { gloss: false, outline: '#fff', outlineWidth: 1 }); ctx.restore();
      if (ion[2]) { const u2 = 1 - u; ctx.save(); ctx.globalAlpha = Math.min(1, flow * 1.4) * (0.4 + 0.6 * Math.sin(Math.PI * u2)); D.sphere(L.mid.x + 12 + (L.mid.w - 24) * u2, y + 18, 5.2, ion[3], { gloss: false }); ctx.restore(); }
    }
    T(L.mid.x + L.mid.w / 2, L.mid.y + 16, ion[0] + (ion[2] ? ' · ' + ion[2] : '') + ' 이동', 12.5, MUTED, 'center', 800);
    // 연료 · 산소 공급 (연료 전지)
    if (k === 'fc') {
      const ax = L.neg.x + L.neg.w / 2, bx2 = L.pos.x + L.pos.w / 2;
      D.arrow(ax, L.neg.y + L.neg.h + 34, ax, L.neg.y + L.neg.h + 4, { color: '#2563eb', width: 3.4, head: 9 }); T(ax, L.neg.y + L.neg.h + 48, 'H₂ 공급', 12.5, '#1d4ed8', 'center', 800);
      D.arrow(bx2, L.pos.y + L.pos.h + 34, bx2, L.pos.y + L.pos.h + 4, { color: '#16a34a', width: 3.4, head: 9 }); T(bx2, L.pos.y + L.pos.h + 48, 'O₂ 공급 → H₂O', 12.5, '#15803d', 'center', 800);
    }
    // 물질 상자 + 이름표
    BT[k].parts.forEach((pr) => {
      const r = rects[pr.id], tag = btTag(k, pr), sel = b.selPart === pr.id;
      const isWide = pr.box === 'elec', isCat = pr.box === 'cat';
      if (isWide || isCat) { D.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fillStyle = isCat ? '#fde68a' : 'rgba(255,255,255,.88)'; ctx.fill(); ctx.strokeStyle = sel ? PUR : (isCat ? '#b45309' : '#94a3b8'); ctx.lineWidth = sel ? 3 : 1.6; ctx.stroke(); if (isWide) T(r.x + r.w / 2, r.y + 21, pr.name, 13.5, INK, 'center', 800); else { ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(-Math.PI / 2); T(0, 5, pr.name, 13.5, '#78350f', 'center', 800); ctx.restore(); } }
      else { if (sel) { D.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 10); ctx.strokeStyle = PUR; ctx.lineWidth = 3; ctx.stroke(); } T(r.x + r.w / 2, r.y + r.h / 2 + 4, pr.name, PHONE ? 14 : 16, '#fff', 'center', 900); }
      // 이름표
      const ty = isWide ? r.y + r.h + 12 : isCat ? r.y - 12 : r.y + r.h + 18;
      const tx = isCat ? r.x + r.w / 2 - 20 : r.x + r.w / 2;
      if (tag) { const ro = ROLE[tag]; const bad = pr.req && tag !== pr.ans && S.bt.chk; pill(tx, ty, (pr.req ? '' : '🔒 ') + ro[0], { bg: bad ? '#fee2e2' : ro[2], color: ro[1], border: bad ? '#ef4444' : ro[1], size: 13, pad: 6 }); }
      else pill(tx, ty, '❓ 이름표', { bg: '#fff', color: MUTED, border: sel ? PUR : '#94a3b8', size: 13, pad: 6 });
    });
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, B.name + ' (' + B.volt + ') · ' + (b.dir > 0 ? '방전' : '충전'), PHONE ? 14.5 : 16, b.dir > 0 ? '#92400e' : '#1d4ed8', 'left', 900);
    const eqs = k === 'pb' ? [b.dir > 0 ? 'Pb + PbO₂ + 2H₂SO₄ → 2PbSO₄ + 2H₂O' : '2PbSO₄ + 2H₂O → Pb + PbO₂ + 2H₂SO₄']
      : k === 'li' ? (b.dir > 0 ? ['(−) LiC₆ → C₆ + Li⁺ + e⁻', '(+) CoO₂ + Li⁺ + e⁻ → LiCoO₂'] : ['(−) C₆ + Li⁺ + e⁻ → LiC₆', '(+) LiCoO₂ → CoO₂ + Li⁺ + e⁻'])
      : ['(−) H₂ → 2H⁺ + 2e⁻', '(+) O₂ + 4H⁺ + 4e⁻ → 2H₂O', '전체 : 2H₂ + O₂ → 2H₂O (물 전기 분해의 역반응)'];
    eqs.forEach((e, i) => T(INFO.x + 16, INFO.y + 52 + i * 22, e, PHONE ? 13.5 : 15, INK, 'left', 800));
    const note = k === 'fc' ? '연료와 산소를 밖에서 계속 공급해서 충전이 필요 없어요. Pt 촉매는 반응을 도와요.' : b.dir > 0 ? '방전 : (−)극에서 산화, (+)극에서 환원 · 전자는 (−)극 → (+)극' : '충전 : 외부 전원으로 반응이 거꾸로 돼요 · (−)극이 환원, (+)극이 산화 (전기 분해)';
    textBlock(INFO.x + 16, INFO.y + 52 + eqs.length * 22 + 6, INFO.w - 32, note, PHONE ? 13 : 14, MUTED, 18, 700);
  }

  /* ============ ④ 미래 전지 ============ */
  const FAX = ['에너지 밀도', '안전성', '자원 풍부', '재활용'];
  const FB = {
    li: { name: '리튬 이온', v: [9, 6, 4, 5], c: '#8b5cf6' }, na: { name: '나트륨 이온', v: [7, 7, 9, 6], c: '#f59e0b' },
    h2: { name: '수소 연료 전지', v: [8, 6, 7, 7], c: '#0ea5e9' }, pb: { name: '납 축전지', v: [3, 7, 6, 9], c: '#64748b' },
  };
  const FBK = ['li', 'na', 'h2', 'pb'];
  const FSC = {
    ev: { name: '전기 자동차', icon: '🚗', ax: [0, 3], text: '먼 거리를 달리려면 에너지 밀도가 높아야 하고, 다 쓴 전지는 재활용돼야 해요.', best: 'h2' },
    home: { name: '가정용 에너지 저장', icon: '🏠', ax: [1, 2], text: '집 안에 두므로 안전성이 중요하고, 많이 필요해서 자원이 풍부해야 해요.', best: 'na' },
    wear: { name: '웨어러블 기기', icon: '⌚', ax: [0, 1], text: '작은 크기에 많은 에너지를 담아야 하고, 몸에 닿으므로 안전해야 해요.', best: 'li' },
  };
  const FSK = ['ev', 'home', 'wear'];
  const ro = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0 && c % 28 !== 8 ? '으로' : '로'; };
  const fuSum = (sc, b) => FSC[sc].ax.reduce((s, i) => s + FB[b].v[i], 0);
  const fuBestCalc = (sc) => FBK.slice().sort((a, b) => fuSum(sc, b) - fuSum(sc, a))[0];
  const fuNDone = () => Object.keys(S.fu.done).length;
  const fuVis = () => FBK.filter((k) => S.fu.show[k]);
  function fuSc(k) { const f = S.fu; f.sc = k; f.pick = ''; f.fb = ''; updateCtl(); }
  function fuToggle(k) { const f = S.fu; f.show[k] = !f.show[k]; Sound.tick(); updateCtl(); }
  function fuPickB(k) { S.fu.pick = k; S.fu.fb = ''; updateCtl(); }
  function fuDecide() {
    const f = S.fu; if (!f.pick) return; if (fuVis().length < 2) { showHint('비교하려면 후보를 2개 이상 켜 보세요.', 3200); return; }
    if (!f.show[f.pick]) { showHint('고른 전지도 레이더 차트에 켜서 근거를 확인해요.', 3200); return; }
    const best = fuBestCalc(f.sc);
    if (f.pick === best) { f.done[f.sc] = f.pick; f.fb = '✅ 맞아요! ' + FB[best].name + ' : 두 항목의 합 ' + fuSum(f.sc, best) + '점으로 가장 커요.'; flash(MAIN.x + 210, MAIN.y + 175, ['#14a058', '#fbbf24', '#8b5cf6']); Sound.click(); }
    else { f.fb = '아쉬워요. ' + FSC[f.sc].ax.map((i) => FAX[i]).join(' + ') + ' 점수의 합을 비교해 보세요. (' + FB[f.pick].name + ' ' + fuSum(f.sc, f.pick) + '점)'; }
    updateCtl();
  }
  function stepFuture(dt) {
    const f = S.fu; if (S.mode !== 'future') return;
    FBK.forEach((k) => { const tgt = f.show[k] ? 1 : 0; f.sv[k] = ap(f.sv[k] == null ? 0 : f.sv[k], tgt, dt, 6); if (Math.abs(f.sv[k] - tgt) < 0.004) f.sv[k] = tgt; });
  }
  const fuLay = () => PHONE ? { cx: MAIN.x + MAIN.w / 2, cy: MAIN.y + 190, R: 118 } : { cx: MAIN.x + 230, cy: MAIN.y + 184, R: 118 };
  function drawFuture(t) {
    const f = S.fu, sc = FSC[f.sc], L = fuLay();
    T(14, 26, '🌍 과제에 알맞은 미래 전지를 레이더 차트로 골라요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const ang = (i) => -Math.PI / 2 + i * TAU / 4;
    // 눈금
    [2.5, 5, 7.5, 10].forEach((v) => { ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = ang(i), x = L.cx + Math.cos(a) * L.R * v / 10, y = L.cy + Math.sin(a) * L.R * v / 10; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); ctx.strokeStyle = v === 10 ? '#94a3b8' : 'rgba(148,163,184,.4)'; ctx.lineWidth = v === 10 ? 1.8 : 1; ctx.stroke(); });
    for (let i = 0; i < 4; i++) { const a = ang(i); ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.cx, L.cy); ctx.lineTo(L.cx + Math.cos(a) * L.R, L.cy + Math.sin(a) * L.R); ctx.stroke(); }
    T(L.cx + 6, L.cy - L.R * 0.5 + 4, '5', 12, MUTED, 'left', 700); T(L.cx + 6, L.cy - L.R + 12, '10', 12, MUTED, 'left', 700);
    // 라벨 (우선 항목 강조)
    for (let i = 0; i < 4; i++) {
      const a = ang(i), pr = sc.ax.indexOf(i) >= 0, lx = L.cx + Math.cos(a) * (L.R + 14), ly = L.cy + Math.sin(a) * (L.R + 18);
      const al = i === 1 ? 'left' : i === 3 ? 'right' : 'center';
      if (pr) { const w = textW(FAX[i], 14, 900) + 14; D.roundRect(al === 'left' ? lx - 6 : al === 'right' ? lx - w + 6 : lx - w / 2, ly - 12, w, 22, 11); ctx.fillStyle = '#fef3c7'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.6; ctx.stroke(); }
      T(lx, ly + 4, FAX[i], 14, pr ? '#92400e' : MUTED, al, pr ? 900 : 700);
    }
    // 다각형
    FBK.forEach((k) => {
      const s = f.sv[k] || 0; if (s < 0.01) return; const B = FB[k];
      ctx.beginPath(); B.v.forEach((v, i) => { const a = ang(i), r = L.R * v / 10 * s, x = L.cx + Math.cos(a) * r, y = L.cy + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath();
      ctx.fillStyle = C.rgba(B.c, 0.16 * s); ctx.fill(); ctx.strokeStyle = C.rgba(B.c, 0.95 * s); ctx.lineWidth = 2.8; ctx.stroke();
      B.v.forEach((v, i) => { const a = ang(i), r = L.R * v / 10 * s; D.sphere(L.cx + Math.cos(a) * r, L.cy + Math.sin(a) * r, 4.6, B.c, { gloss: false, outline: '#fff', outlineWidth: 1.2 }); });
    });
    // 오른쪽(태블릿) : 과제 설명 · 점수표
    const tx = PHONE ? MAIN.x + 14 : MAIN.x + 430, tw = PHONE ? MAIN.w - 28 : MAIN.w - 430 - 16, ty = PHONE ? MAIN.y + 340 : MAIN.y + 36;
    if (!PHONE) {
      T(tx, ty, sc.icon + ' ' + sc.name, 17, INK, 'left', 900);
      let h = textBlock(tx, ty + 26, tw, sc.text, 14, MUTED, 19, 700);
      T(tx, ty + 34 + h, '우선 조건 : ' + sc.ax.map((i) => FAX[i]).join(' + '), 14.5, '#92400e', 'left', 900);
      FBK.forEach((k, i) => { const y = ty + 66 + h + i * 26, on = f.show[k]; D.sphere(tx + 8, y - 5, 6, FB[k].c, { gloss: false }); T(tx + 22, y, FB[k].name, 14, on ? INK : '#94a3b8', 'left', 800); T(tx + tw, y, on ? '합 ' + fuSum(f.sc, k) + '점' : '꺼짐', 14, on ? INK : '#94a3b8', 'right', 800); });
    }
    // 범례 (폰)
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (PHONE) { T(INFO.x + 16, INFO.y + 26, sc.icon + ' ' + sc.name, 15, INK, 'left', 900); const hh = textBlock(INFO.x + 16, INFO.y + 48, INFO.w - 32, sc.text, 13.5, MUTED, 18, 700); T(INFO.x + 16, INFO.y + 54 + hh, '우선 조건 : ' + sc.ax.map((i) => FAX[i]).join(' + '), 14, '#92400e', 'left', 900);
      FBK.forEach((k, i) => { const y = INFO.y + 96 + hh + i * 22, on = f.show[k]; D.sphere(INFO.x + 24, y - 5, 5.5, FB[k].c, { gloss: false }); T(INFO.x + 36, y, FB[k].name, 13.5, on ? INK : '#94a3b8', 'left', 800); T(INFO.x + INFO.w - 16, y, on ? '합 ' + fuSum(f.sc, k) + '점' : '꺼짐', 13.5, on ? INK : '#94a3b8', 'right', 800); }); }
    else {
      T(INFO.x + 16, INFO.y + 26, '점수는 학습용 상대 평가예요 (10점 만점) · 수소 연료 전지는 수소의 생산 방법에 따라 달라요.', 14, WARN, 'left', 800);
      const msg = f.fb || (f.done[f.sc] ? '✅ 이 과제는 ' + FB[f.done[f.sc]].name + ro(FB[f.done[f.sc]].name) + ' 정했어요.' : '후보를 켜서 레이더 차트를 비교하고, 우선 조건 점수의 합이 가장 큰 전지를 골라요.');
      textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, msg, 15, f.fb.indexOf('✅') === 0 || f.done[f.sc] ? '#166534' : f.fb ? '#b91c1c' : INK, 21, 800);
      textBlock(INFO.x + 16, INFO.y + 100, INFO.w - 32, '정한 과제 ' + fuNDone() + ' / 3', 14, MUTED, 19, 800);
    }
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'battery') { const r = btRects(S.bt.k); for (const pr of btParts()) { if (pointInRect(p, r[pr.id])) { S.bt.selPart = S.bt.selPart === pr.id ? '' : pr.id; Sound.tick(); updateCtl(); return false; } } }
      return false;
    },
    move() {}, up() {},
    hover(p) { if (S.mode === 'battery') { const r = btRects(S.bt.k); for (const pr of btParts()) if (pointInRect(p, r[pr.id])) return 'pointer'; } return 'default'; },
  });

  /* ---------- 조작 장치 ---------- */
  makeChips($('#bdKind'), [['cell', '🧬 세포 호흡'], ['fire', '🔥 불에 태우기']], (v) => bdKind(v));
  $('#bBdGo').addEventListener('click', bdGo); $('#bBdReset').addEventListener('click', () => { Sound.click(); bdReset(); });
  ['a', 'b', 'c', 'd', 'e'].forEach((k) => bindNum($('#bdV' + k), (v, ch) => { S.bd.vals[k] = v; const exp = { a: 0, b: 4, c: 0, d: -2, e: 24 }[k]; markNum('bdV' + k, near(v, exp, 0.001), ch, v); updateCtl(); }));
  (function () {
    const box = $('#bdOrd'); box.innerHTML = '';
    const sh = ['o2', 'glu', 'chain', 'nad'];
    sh.forEach((id) => { const nm = BDN.find((q) => q[0] === id)[1]; const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.id = id; b.innerHTML = '<span class="no"></span>' + nm; b.addEventListener('click', () => { const o = S.bd.order, i = o.indexOf(id); if (i >= 0) o.splice(i, 1); else o.push(id); Sound.tick(); updateCtl(); }); box.appendChild(b); });
  })();
  $('#bBdOrdClear').addEventListener('click', () => { Sound.click(); S.bd.order = []; updateCtl(); });
  ['psA', 'psB', 'psC', 'psD'].forEach((id, i) => fillSel(id, PSS, (v) => { S.ps.sel['abcd'[i]] = v; }));
  makeChips($('#phTab'), [['pr', '🌿 광합성 · 호흡'], ['apple', '🍎 사과와 비타민 C']], (v) => { S.sub.photo = v; updateCtl(); });
  makeChips($('#apDose'), [['0', '없음'], ['1', '적게'], ['2', '많이']], (v) => psDose(v));
  $('#bApPlay').addEventListener('click', () => { const p = S.ps; if (p.t >= 40) p.t = 0; p.play = !p.play; Sound.click(); updateCtl(); });
  $('#bApReset').addEventListener('click', () => { Sound.click(); psReset(); });
  const sAp = $('#sAp'); sAp.addEventListener('input', () => { S.ps.play = false; S.ps.t = +sAp.value; updateCtl(); });
  fillSel('apEx', [['', '선택하세요'], ['a', '자신이 먼저 산화되어 다른 물질의 산화를 막는 환원제예요'], ['b', '자신이 환원되어 산소를 만들어 내는 산화제예요'], ['c', '산화·환원 반응에는 참여하지 않아요']], (v) => { S.ps.ex = v; });
  makeChips($('#btSel'), BTK.map((k) => [k, BT[k].name]), (v) => btPick(v));
  makeChips($('#btDir'), [['1', '방전'], ['-1', '충전']], (v) => btDir(+v));
  makeChips($('#btRole'), Object.keys(ROLE).map((r) => [r, ROLE[r][0]]), (v) => btRole(v));
  ['a', 'b', 'c', 'd', 'e'].forEach((k) => bindNum($('#btV' + k), (v, ch) => { S.bt.vals[k] = v; const exp = { a: 2, b: 2, c: 3, d: 1, e: -2 }[k]; markNum('btV' + k, near(v, exp, 0.001), ch, v); updateCtl(); }));
  makeChips($('#fuSc'), FSK.map((k) => [k, FSC[k].icon + ' ' + FSC[k].name]), (v) => fuSc(v));
  makeChips($('#fuShow'), FBK.map((k) => [k, FB[k].name]), (v) => fuToggle(v));
  fillSel('fuPick', [['', '전지를 고르세요']].concat(FBK.map((k) => [k, FB[k].name])), (v) => fuPickB(v));
  $('#bFuOk').addEventListener('click', fuDecide);
  fillSel('fuI1', [['', '선택하세요'], ['a', '에너지 밀도'], ['b', '안전성'], ['c', '자원 풍부'], ['d', '재활용']], (v) => { S.fu.idea.a = v; });
  fillSel('fuI2', [['', '선택하세요'], ['a', '코발트 같은 희소 금속을 덜 쓰는 소재를 개발해요'], ['b', '전지를 더 크고 무겁게 만들어요'], ['c', '충전 횟수를 줄이도록 한 번만 쓰고 버려요']], (v) => { S.fu.idea.b = v; });
  fillSel('fuI3', [['', '선택하세요'], ['a', '자원이 풍부해서 재료를 구하기 쉽기 때문이에요'], ['b', '에너지 밀도가 가장 크기 때문이에요'], ['c', '전자를 전혀 쓰지 않기 때문이에요']], (v) => { S.fu.idea.c = v; });
  const FPEER = [['1. 리튬 이온 전지 재활용 센터를 만들자', '구리 · 코발트를 되살려 자원을 아껴요'], ['2. 전기 자동차에 납 축전지만 쓰자', '납 축전지는 재활용이 잘돼서요'], ['3. 가정용 저장에 나트륨 이온 전지를 쓰자', '소금 성분 자원이 풍부해요']];
  (function () {
    const box = $('#fuPeer'); box.innerHTML = '';
    FPEER.forEach((c, ci) => {
      const h = document.createElement('div'); h.className = 'peer-card'; h.innerHTML = '<b>' + c[0] + '</b><span>' + c[1] + '</span>'; box.appendChild(h);
      ['근거', '창의성'].forEach((nm, j) => {
        const row = document.createElement('div'); row.className = 'star-row'; row.innerHTML = '<span class="lab">' + nm + '</span>'; const bs = document.createElement('div'); bs.className = 'stars';
        for (let v = 1; v <= 5; v++) { const b = document.createElement('button'); b.type = 'button'; b.textContent = '★'; b.dataset.c = ci; b.dataset.j = j; b.dataset.v = v; b.setAttribute('aria-label', c[0] + ' ' + nm + ' ' + v + '점'); b.addEventListener('click', () => { S.fu.r[ci][j] = v; Sound.tick(); updateCtl(); }); bs.appendChild(b); }
        row.appendChild(bs); box.appendChild(row);
      });
    });
  })();
  const fuPeerN = () => S.fu.r.reduce((n, c) => n + (c[0] ? 1 : 0) + (c[1] ? 1 : 0), 0);

  function onLeave(m) { if (m === 'body') S.bd.run = false; if (m === 'photo') S.ps.play = false; }
  function uiExtra() {
    const b = S.bd, p = S.ps, bt = S.bt, f = S.fu;
    markChips($('#bdKind'), b.kind, {}); $('#bBdGo').textContent = b.run ? '⏸ 멈추기' : bdP() >= 0.999 ? '↻ 다시 흘리기' : bdP() > 0 ? '▶ 이어서 흘리기' : '▶ 전자 24개 흘려 보내기'; $('#bBdGo').classList.toggle('btn-primary', !b.run);
    $$('#bdOrd .opt').forEach((o) => { const i = b.order.indexOf(o.dataset.id); o.classList.toggle('on', i >= 0); o.querySelector('.no').textContent = i >= 0 ? String(i + 1) : ''; o.classList.remove('ok', 'bad'); });
    markChips($('#phTab'), S.sub.photo, {}); markChips($('#apDose'), String(p.dose), {});
    $('#bApPlay').textContent = p.play ? '⏸ 멈추기' : p.t >= 40 ? '↻ 처음부터 보기' : '▶ 시간 흐르게 하기'; $('#bApPlay').classList.toggle('btn-primary', !p.play);
    sAp.value = Math.round(p.t); $('#oAp').textContent = '시간 ' + Math.round(p.t) + ' / 40'; sAp.style.setProperty('--pct', (p.t / 40 * 100) + '%');
    markChips($('#btSel'), bt.k, {}); markChips($('#btDir'), String(bt.dir), {}); $$('#btDir button').forEach((x) => { if (x.dataset.v === '-1') x.disabled = bt.k === 'fc'; });
    $$('#btRole button').forEach((x) => { const pr = BT[bt.k].parts.find((q) => q.id === bt.selPart); const cur = pr && pr.req ? bt.tag[btTagKey(bt.k, pr.id)] : ''; x.classList.toggle('on', !!cur && x.dataset.v === cur); x.disabled = !pr || !pr.req; });
    const spr = BT[bt.k].parts.find((q) => q.id === bt.selPart); $('#btHint').textContent = spr ? (spr.req ? '“' + spr.name + '” 에 붙일 역할을 골라요.' : '“' + spr.name + '” : 이미 ' + ROLE[spr.ans][0] + ' 이름표가 붙은 예시예요.') : '그림에서 물질 상자를 눌러 고른 뒤 역할을 붙여요 (❓ 6곳).';
    markChips($('#fuSc'), f.sc, f.done);
    $$('#fuShow button').forEach((x) => x.classList.toggle('on', !!f.show[x.dataset.v]));
    $('#fuPick').value = f.pick;
    $$('#fuPeer .stars button').forEach((x) => x.classList.toggle('on', +x.dataset.v <= (f.r[+x.dataset.c][+x.dataset.j] || 0)));
  }
  function readouts() {
    const m = S.mode;
    if (m === 'body') { const b = S.bd; setRead('이동한 전자', bdE(b.kind) + ' / 24개', '반응 방식', b.kind === 'cell' ? '단계적 (세포 호흡)' : '한꺼번에 (연소)', '에너지', b.kind === 'cell' ? 'ATP 약 30~40 % + 열' : '열 · 빛'); }
    else if (m === 'photo') { const p = S.ps; if (S.sub.photo === 'pr') setRead('광합성', 'CO₂ 환원 · H₂O 산화', '세포 호흡', '포도당 산화 · O₂ 환원', '분류', S.ps.solved ? '완료' : '미완료'); else setRead('시간', Math.round(p.t) + ' / 40', '갈변(그냥 둠)', Math.round(apBrown(false) * 100) + ' %', '갈변(비타민 C)', Math.round(apBrown(true) * 100) + ' %'); }
    else if (m === 'battery') { const bt = S.bt; setRead('전지', BT[bt.k].name, '방향', bt.dir > 0 ? '방전' : '충전', '붙인 이름표', btNReq() + ' / 6'); }
    else { const f = S.fu; setRead('과제', FSC[f.sc].name, '켜진 후보', fuVis().length + '개', '정한 과제', fuNDone() + ' / 3'); }
  }

  /* ================= 미션 ================= */
  const btNumOk = () => { const v = S.bt.vals; return near(v.a, 2, 0.001) && near(v.b, 2, 0.001) && near(v.c, 3, 0.001) && near(v.d, 1, 0.001) && near(v.e, -2, 0.001); };
  const fuIdeaOk = () => S.fu.idea.a === 'c' && S.fu.idea.b === 'a' && S.fu.idea.c === 'a';
  const levels = [
    {
      title: '몸속 반응: 불꽃 없이 타는 포도당', short: '몸속 반응', icon: '🧬', phase: '조사',
      intro: '<p class="si-q">❓ 탐구 질문: 몸속에서 포도당이 “불꽃 없이” 천천히 타는 것과 전지가 전기를 만드는 것에는 어떤 공통점이 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 전지는 산화·환원 반응에서 전자의 흐름을 뽑아 전기 에너지로 써요. <b>통합과학</b>에서는 세포 호흡으로 포도당에서 에너지를 얻는다고 배웠어요. 이 호흡도 산화·환원 반응일까요?</div>' +
        '<p>포도당이 CO₂와 H₂O가 되는 반응을 <b>산화수</b>로 분석하고, 전자가 <b>NAD⁺ 셔틀</b>과 <b>전자 전달계</b>를 거쳐 O₂에 이르는 길을 따라가 봐요. 같은 반응을 불에 태울 때와 무엇이 다른지도 비교해요. (효소 반응의 세부와 ATP 합성 효소의 구조는 다루지 않아요.)</p>',
      features: ['body'],
      setup() { bdReset(); S.bd.kind = 'cell'; setScene('body'); },
      recap: '세포 호흡에서 포도당의 C는 평균 0 → +4로 산화되고 O₂의 O는 0 → −2로 환원돼요. 포도당 1분자에서 전자 24개가 NAD⁺로 옮겨져 전자 전달계를 단계적으로 내려가 O₂에 이르고, 에너지의 약 30~40 %가 ATP에 저장돼요.',
      summary: '<ul><li>세포 호흡 : C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O · 포도당의 C <b>0(평균) → +4</b> (산화), O₂의 O <b>0 → −2</b> (환원)</li><li>포도당 1분자 : C 6개 × 4 = 전자 <b>24개</b> = O₂ 6분자 × 4 = <b>24개</b></li><li><b>NAD⁺</b>는 전자를 받아 NADH가 되어 전자를 나르는 <b>전자 셔틀</b>이에요 (NAD⁺ + 2e⁻ + H⁺ → NADH).</li><li>전자 전달계에서 전자는 에너지가 낮은 전달체를 단계적으로 거쳐 O₂에 도달하고, 단계마다 에너지의 일부(약 30~40 %)가 ATP에 저장돼요. 한꺼번에 태우면 열과 빛으로 나가요.</li></ul>',
      missions: [
        {
          title: '산화수 표 채우기',
          goal: '세포 호흡을 끝까지 관찰한 뒤, <b>산화수 표</b>의 다섯 칸(포도당의 C, CO₂의 C, O₂의 O, H₂O의 O, 이동한 전자 수)을 채우세요.',
          hint: '“세포 호흡”으로 전자 24개를 끝까지 흘려 보내요. 포도당의 C는 평균 0, CO₂의 C는 +4, 홑원소 물질 O₂의 O는 0, 화합물 H₂O의 O는 −2예요. 전자 수는 C 6개 × 4개씩이에요.',
          setup() { S.gate = 'bdA'; S.bd.vals = { a: NaN, b: NaN, c: NaN, d: NaN, e: NaN }; clearNum(['bdVa', 'bdVb', 'bdVc', 'bdVd', 'bdVe']); S.bd.kind = 'cell'; setScene('body'); updateCtl(); },
          check: () => bdOk() && S.bd.pc >= 0.999, hold: 0.6,
          status: () => '관찰 ' + mark(S.bd.pc >= 0.999) + ' &nbsp; 산화수 표 ' + [S.bd.vals.a === 0, near(S.bd.vals.b, 4, 0.001), near(S.bd.vals.c, 0, 0.001), near(S.bd.vals.d, -2, 0.001), near(S.bd.vals.e, 24, 0.001)].filter(Boolean).length + ' / 5 ' + mark(bdOk()),
          explain: '포도당의 C(평균 0)가 CO₂의 C(+4)로 <b>산화</b>되고, O₂의 O(0)가 H₂O의 O(−2)로 <b>환원</b>돼요. C 6개가 각각 4개의 전자를 잃으므로 전자는 모두 <b>24개</b>이고, O₂ 6분자가 받는 전자 6 × 4 = 24개와 같아요.',
        },
        {
          title: '전자가 가는 순서', manual: true,
          goal: '포도당에서 나온 전자가 지나가는 <b>순서</b>대로 네 가지를 눌러 번호를 붙이고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전자는 포도당에서 나와 전자를 나르는 NAD⁺ 셔틀에 실리고, 계단 모양의 전자 전달체를 차례로 내려가 마지막으로 산소에 도착해요.',
          setup() { S.gate = 'bdB'; S.bd.order = []; setScene('body'); updateCtl(); },
          check() {
            if (S.bd.order.length < 4) return '네 가지를 모두 눌러 순서를 정해 주세요. (누른 순서대로 번호가 붙어요)';
            return bdOrdOk() ? true : '순서를 다시 생각해 보세요. 전자는 포도당에서 출발해 산소에서 끝나요. 그 사이에 전자를 나르는 물질과 전달체가 있어요.';
          },
          status: () => '순서 ' + S.bd.order.length + ' / 4 ' + mark(bdOrdOk()),
          explain: '<b>포도당 → NAD⁺ (전자 셔틀, NADH가 됨) → 전자 전달체(계단식) → O₂</b> 순서예요. 전자가 에너지가 낮은 쪽으로 단계적으로 내려오며 에너지가 ATP로 조금씩 저장돼요.',
        },
        {
          type: 'quiz', title: 'NADH가 하는 일',
          goal: '세포 호흡에서 <b>NADH</b>(NAD⁺가 전자를 받은 것)가 하는 일은?',
          setup() { S.gate = ''; setScene('body'); },
          choices: ['전자를 운반해 전자 전달계에 넘겨줘요', '산소가 포도당에게 전자를 주도록 도와요', '포도당을 CO₂로 직접 태워서 열을 내요', '전자를 O₂로부터 받아 저장해요'],
          answer: 0,
          feedback: ['', '전자는 포도당에서 산소 쪽으로 가요. 산소가 포도당에게 전자를 주는 것이 아니에요.', '세포에서는 한꺼번에 타지 않고 전자를 단계적으로 옮겨요.', 'NADH는 포도당 쪽에서 받은 전자를 전달계로 가져다 줘요.'],
          explain: 'NAD⁺는 포도당에서 나온 전자를 받아 NADH가 되고, 이 전자를 전자 전달계에 넘겨요 — 즉 <b>전자 운반체</b>예요. 전자는 최종적으로 산소(O₂)에게 가서 H₂O가 되고, 산소가 포도당에 전자를 주는 것이 아니에요.',
        },
      ],
    },
    {
      title: '광합성 · 항산화: 반대 방향과 환원제', short: '광합성·항산화', icon: '🌿', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 호흡은 포도당이 산화되고 O₂가 환원되는 산화·환원 반응이었어요. <b>광합성</b>은 이 반응이 거꾸로 일어나는 것과 같아요.</div>' +
        '<p>두 반응을 나란히 놓고 산화되는 물질과 환원되는 물질을 분류해요. 또 사과가 갈색으로 변하는 것은 산화 때문이에요. <b>비타민 C</b> 같은 <b>항산화제</b>가 어떻게 갈변을 늦추는지 실험해 봐요.</p>',
      features: ['photo'],
      setup() { S.sub.photo = 'pr'; psReset(); setScene('photo'); },
      recap: '광합성은 호흡과 반대 방향의 산화·환원이에요 (H₂O 산화, CO₂ 환원). 항산화제(비타민 C)는 자신이 먼저 산화되는 환원제여서 다른 물질(폴리페놀)의 산화를 막아요.',
      summary: '<ul><li><b>광합성</b> : 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ , C <b>+4 → 0</b> (CO₂ 환원), O <b>−2 → 0</b> (H₂O 산화) — 빛 에너지를 이용해요.</li><li><b>세포 호흡</b> : 포도당 산화 (C 평균 0 → +4), O₂ 환원 (O 0 → −2) — 광합성과 반대 방향이에요.</li><li><b>항산화제</b>(비타민 C) : 활성 산소나 산소와 먼저 반응해 <b>자신이 산화</b>되는 <b>환원제</b> → 사과의 폴리페놀 산화(갈변)가 늦어져요.</li></ul>',
      missions: [
        {
          title: '광합성 · 호흡 산화 / 환원 분류', manual: true,
          goal: '<b>광합성</b>의 H₂O · CO₂, <b>세포 호흡</b>의 포도당 · O₂가 각각 <b>산화됐는지 환원됐는지</b> 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산화수가 커지면 산화, 작아지면 환원이에요. 광합성에서 CO₂의 C는 +4 → 0, H₂O의 O는 −2 → 0이에요. 호흡은 그 반대 방향이에요.',
          setup() { S.gate = 'psA'; S.sub.photo = 'pr'; S.ps.sel = { a: '', b: '', c: '', d: '' }; S.ps.solved = false; clearSel(['psA', 'psB', 'psC', 'psD']); setScene('photo'); updateCtl(); },
          check() {
            const s = S.ps.sel; markSel(['psA', 'psB', 'psC', 'psD'], [s.a === 'ox', s.b === 're', s.c === 'ox', s.d === 're']);
            if (!s.a || !s.b || !s.c || !s.d) return '네 칸을 모두 골라 주세요.';
            if (psOk()) { S.ps.solved = true; return true; }
            if (s.a !== 'ox' || s.b !== 're') return '광합성에서는 H₂O의 O가 −2 → 0, CO₂의 C가 +4 → 0이에요. 산화수가 어떻게 변했는지 보세요.';
            return '호흡에서는 포도당의 C가 0 → +4, O₂의 O가 0 → −2로 변해요. 광합성과 반대예요.';
          },
          status: () => '광합성 ' + mark(S.ps.sel.a === 'ox' && S.ps.sel.b === 're') + ' &nbsp; 호흡 ' + mark(S.ps.sel.c === 'ox' && S.ps.sel.d === 're'),
          explain: '광합성 : <b>H₂O 산화</b>(O −2 → 0), <b>CO₂ 환원</b>(C +4 → 0). 호흡 : <b>포도당 산화</b>(C 0 → +4), <b>O₂ 환원</b>(O 0 → −2). 같은 물질이 광합성과 호흡에서 반대 역할을 해요.',
        },
        {
          title: '비타민 C 항산화 실험', manual: true,
          goal: '비타민 C를 <b>적게</b> 또는 <b>많이</b> 바르고 시간을 흐르게 해서, 그냥 둔 사과는 갈변하는데 바른 사과는 갈변이 늦는 장면을 본 뒤 <b>항산화제를 설명하는 문장</b>을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“비타민 C” 단추에서 적게나 많이를 고르고 “시간 흐르게 하기”를 눌러요. 남은 비타민 C 막대가 줄어드는 동안 오른쪽 사과는 거의 변하지 않아요.',
          setup() { S.gate = 'psB'; S.sub.photo = 'apple'; S.ps.ex = ''; clearSel(['apEx']); psDose(1); setScene('photo'); updateCtl(); },
          check() {
            const p = S.ps; markSel(['apEx'], [p.ex === 'a']);
            if (!p.seen) return '먼저 비타민 C를 바른 사과와 그냥 둔 사과의 갈변을 비교해요. (그냥 둔 쪽이 갈색이 되는데 바른 쪽은 거의 그대로인 순간이 있어요)';
            if (!p.ex) return '항산화제를 설명하는 문장을 골라 주세요.';
            return p.ex === 'a' ? true : '비타민 C는 산소를 만들거나 반응에 빠지는 물질이 아니에요. 사과의 폴리페놀 대신 먼저 반응하는 쪽이에요.';
          },
          status: () => '비교 관찰 ' + mark(S.ps.seen) + ' &nbsp; 설명 ' + mark(S.ps.ex === 'a'),
          explain: '비타민 C는 폴리페놀보다 먼저 산소와 반응해 <b>자신이 산화</b>돼요. 다른 물질을 환원시키며 자신은 산화되는 <b>환원제</b>예요. 비타민 C를 다 쓰면 그때부터 폴리페놀이 산화되어 갈변이 시작돼요.',
        },
        {
          type: 'quiz', title: '광합성에서 환원되는 물질',
          goal: '광합성에서 <b>환원되는 물질</b>은 무엇일까요?',
          setup() { S.gate = ''; S.sub.photo = 'pr'; setScene('photo'); },
          choices: ['CO₂ (C가 +4 → 0)', 'H₂O (O가 −2 → 0)', 'O₂ (O가 0 → −2)', '포도당 (C가 0 → +4)'],
          answer: 0,
          feedback: ['', 'H₂O의 O는 −2 → 0으로 산화수가 커져서 산화돼요.', '광합성에서 O₂는 생성물이에요. O₂가 환원되는 것은 호흡이에요.', '포도당은 광합성에서 만들어져요. 호흡에서는 산화되는 쪽이에요.'],
          explain: '광합성에서는 CO₂의 C가 +4 → 0으로 산화수가 작아지므로 <b>CO₂가 환원</b>돼요. 이때 H₂O는 O가 −2 → 0으로 산화되어 O₂가 나와요.',
        },
      ],
    },
    {
      title: '전지 속 물질: 환원제 · 산화제 · 전해질 · 촉매', short: '전지 속 물질', icon: '🔋', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생명체에서는 환원제와 산화제가 전자를 주고받아 에너지를 얻었어요. 전지 속에서도 같은 일이 일어나요. 이 구조는 <b>실용 전지</b>에서 배운 공통 구조와 이어져요.</div>' +
        '<p><b>납 축전지 · 리튬 이온 전지 · 수소 연료 전지</b> 속 물질에 <b>환원제 · 산화제 · 전해질 · 촉매</b> 이름표를 붙여요. 방전과 충전에서 반응 방향이 어떻게 바뀌는지, 연료 전지는 무엇이 다른지도 살펴봐요.</p>',
      features: ['battery'],
      setup() { S.bt.dir = 1; S.bt.dk = 1; S.bt.selPart = ''; setScene('battery'); },
      recap: '전지에서 (−)극 물질은 전자를 내놓는 환원제, (+)극 물질은 전자를 받는 산화제이고, 전해질은 이온이 이동하는 통로, 촉매는 반응을 도와요. 충전할 때는 반응이 거꾸로 되어 (−)극 물질이 환원돼요. 연료 전지는 연료와 산소를 계속 공급해서 충전이 필요 없어요.',
      summary: '<ul><li><b>납 축전지</b> : Pb 0 → +2 (산화, 환원제), PbO₂의 Pb +4 → +2 (환원, 산화제), H₂SO₄ 용액 (전해질) · Pb + PbO₂ + 2H₂SO₄ ⇌ 2PbSO₄ + 2H₂O</li><li><b>리튬 이온 전지</b> : (−)극 LiC₆ → C₆ + Li⁺ + e⁻ (환원제), (+)극 CoO₂ + Li⁺ + e⁻ → LiCoO₂ (Co +4 → +3, 산화제), 유기 전해질에서 Li⁺ 이동</li><li><b>수소 연료 전지</b> : (−)극 H₂ → 2H⁺ + 2e⁻ (H 0 → +1), (+)극 O₂ + 4H⁺ + 4e⁻ → 2H₂O (O 0 → −2), Pt 촉매, 전체 2H₂ + O₂ → 2H₂O = 물 전기 분해의 역반응</li><li>충전 : 방전의 역반응 (전기 분해와 같은 원리, (−)극이 환원) / 연료 전지는 연료 · 산소를 계속 공급</li></ul>',
      missions: [
        {
          title: '역할 이름표 붙이기', manual: true,
          goal: '세 전지의 그림에서 <b>❓ 이름표</b> 6곳에 알맞은 역할(환원제 · 산화제 · 전해질 · 촉매)을 붙이고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '전지 단추를 바꿔 가며 물질 상자를 눌러 고르고 역할 단추를 눌러요. (−)극 물질은 전자를 내놓는 환원제, (+)극 물질은 전자를 받는 산화제, 이온이 지나가는 곳은 전해질이에요. Pt는 반응을 돕는 촉매예요.',
          setup() { S.gate = ''; S.bt.tag = {}; S.bt.chk = false; S.bt.dir = 1; S.bt.selPart = ''; setScene('battery'); updateCtl(); },
          check() {
            const n = btNReq(); const filled = BTK.reduce((c, k) => c + BT[k].parts.filter((q) => q.req && S.bt.tag[btTagKey(k, q.id)]).length, 0);
            if (filled < 6) return '아직 이름표를 붙이지 않은 곳이 ' + (6 - filled) + '곳 있어요. 전지 세 가지를 모두 살펴보세요. (현재 ' + filled + ' / 6)';
            if (n < 6) { S.bt.chk = true; return '역할이 틀린 곳이 있어요 (빨간 표시). (−)극 물질은 환원제, (+)극 물질은 산화제, 이온 통로는 전해질, Pt는 촉매예요.'; }
            S.bt.chk = false; return true;
          },
          status: () => '맞은 이름표 ' + btNReq() + ' / 6 ' + mark(btNReq() === 6),
          explain: '납 축전지 Pb = <b>환원제</b>, PbO₂ = <b>산화제</b> / 리튬 이온 전지 LiC₆ = <b>환원제</b>, 유기 전해질 = <b>전해질</b> / 수소 연료 전지 O₂ = <b>산화제</b>, Pt = <b>촉매</b>. 환원제는 자신이 산화되고 산화제는 자신이 환원돼요.',
        },
        {
          title: '산화수 변화 쓰기',
          goal: '충전 · 방전 방향을 살펴본 뒤, <b>산화수 변화</b>(화살표 뒤의 값)를 쓰세요. 충전 방향도 한 번 확인해야 해요.',
          hint: '방전 때 Pb는 PbSO₄에서 +2가 돼요. PbO₂의 Pb(+4)는 PbSO₄에서 +2로, CoO₂의 Co(+4)는 LiCoO₂에서 +3으로 환원돼요. H₂의 H는 H⁺에서 +1, O₂의 O는 H₂O에서 −2예요. 충전 단추도 눌러 보세요.',
          setup() { S.gate = 'btB'; S.bt.seenChg = false; S.bt.vals = { a: NaN, b: NaN, c: NaN, d: NaN, e: NaN }; clearNum(['btVa', 'btVb', 'btVc', 'btVd', 'btVe']); setScene('battery'); updateCtl(); },
          check: () => btNumOk() && S.bt.seenChg, hold: 0.6,
          status: () => '충전 확인 ' + mark(S.bt.seenChg) + ' &nbsp; 산화수 ' + [near(S.bt.vals.a, 2, 0.001), near(S.bt.vals.b, 2, 0.001), near(S.bt.vals.c, 3, 0.001), near(S.bt.vals.d, 1, 0.001), near(S.bt.vals.e, -2, 0.001)].filter(Boolean).length + ' / 5 ' + mark(btNumOk()),
          explain: '납 축전지 Pb 0 → <b>+2</b> (산화), PbO₂의 Pb +4 → <b>+2</b> (환원) / 리튬 이온 전지 Co +4 → <b>+3</b> (환원) / 수소 연료 전지 H 0 → <b>+1</b> (산화), O 0 → <b>−2</b> (환원). 충전할 때는 이 변화가 거꾸로 일어나요.',
        },
        {
          type: 'quiz', title: '연료 전지가 충전이 필요 없는 까닭',
          goal: '수소 연료 전지는 <b>충전이 필요 없어요</b>. 그 까닭은?',
          setup() { S.gate = ''; btPick('fc'); setScene('battery'); },
          choices: ['연료(H₂)와 산소(O₂)를 밖에서 계속 공급해 반응이 이어지기 때문이에요', '전지 속에 전자가 무한히 들어 있기 때문이에요', '반응에서 산화·환원이 일어나지 않기 때문이에요', '전해질이 계속 늘어나기 때문이에요'],
          answer: 0,
          feedback: ['', '전자는 H₂가 산화되며 계속 만들어져요. 반응물이 공급되어야 계속 이어져요.', '수소 연료 전지도 H₂ 산화, O₂ 환원의 산화·환원 반응이에요.', '전해질은 이온의 통로일 뿐 반응물이 아니에요.'],
          explain: '연료 전지는 (−)극에 <b>H₂를, (+)극에 O₂를 계속 공급</b>해서 2H₂ + O₂ → 2H₂O 반응이 이어져요. 반응물이 다 닳지 않으면 충전하지 않고 계속 전기를 낼 수 있어요. 이 반응은 물 전기 분해의 역반응이에요.',
        },
      ],
    },
    {
      title: '미래 전지: 지속 가능한 선택', short: '미래 전지', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전지 속 물질의 역할을 살펴봤어요. 이제 <b>지속 가능한 발전</b>을 위해 과제에 알맞은 미래 전지를 설계해 봐요.</div>' +
        '<p><b>전기 자동차 · 가정용 에너지 저장 · 웨어러블 기기</b> 세 과제에 대해 전지 후보 네 가지의 <b>에너지 밀도 · 안전성 · 자원 풍부 · 재활용</b> 점수를 레이더 차트로 비교하고, 과제의 우선 조건에 가장 알맞은 전지를 골라요. 점수는 <b>학습용 상대 평가</b>예요.</p>',
      features: ['future'],
      setup() { S.fu.done = {}; S.fu.pick = ''; S.fu.fb = ''; setScene('future'); },
      recap: '과제마다 중요한 조건이 달라서 알맞은 전지도 달라요. 전기 자동차는 에너지 밀도와 재활용, 가정용 저장은 안전성과 자원, 웨어러블은 에너지 밀도와 안전성이 중요해요. 나트륨 이온 전지는 자원이 풍부해 지속 가능성 면에서 유리할 수 있어요.',
      summary: '<ul><li>후보 점수(학습용 상대 평가, 10점 만점) : 리튬 이온 (밀도 9 · 안전 6 · 자원 4 · 재활용 5), 나트륨 이온 (7 · 7 · 9 · 6), 수소 연료 전지 (8 · 6 · 7 · 7), 납 축전지 (3 · 7 · 6 · 9)</li><li>전기 자동차(밀도 + 재활용) → 수소 연료 전지 / 가정용 저장(안전 + 자원) → 나트륨 이온 전지 / 웨어러블(밀도 + 안전) → 리튬 이온 전지</li><li>보완할 점 예 : 리튬 이온 전지는 자원(코발트 등)이 부족해서 희소 금속을 덜 쓰는 소재와 재활용 체계가 필요해요.</li><li>나트륨 이온 전지는 <b>자원이 풍부</b>해서 지속 가능성 면에서 유리할 수 있어요. 수소 연료 전지의 점수는 수소의 생산 방법에 따라 달라요.</li></ul>',
      missions: [
        {
          title: '과제별 전지 고르기',
          goal: '세 과제마다 <b>후보를 2개 이상 켜서</b> 레이더 차트를 비교하고, 우선 조건 점수의 합이 가장 큰 전지를 골라 <b>이 과제에 선택</b>을 누르세요.',
          hint: '과제 단추를 고르면 노란 라벨로 우선 조건 두 가지가 표시돼요. 후보를 켜서 두 축의 점수를 더해 비교해요. 고른 전지도 차트에 켜 두어야 해요.',
          setup() { S.gate = ''; S.fu.done = {}; S.fu.pick = ''; S.fu.fb = ''; setScene('future'); updateCtl(); },
          check: () => fuNDone() >= 3, hold: 0.6,
          status: () => '전기 자동차 ' + mark(!!S.fu.done.ev) + ' &nbsp; 가정용 저장 ' + mark(!!S.fu.done.home) + ' &nbsp; 웨어러블 ' + mark(!!S.fu.done.wear),
          explain: '전기 자동차(에너지 밀도 + 재활용) : 수소 연료 전지 8 + 7 = 15점 / 가정용 저장(안전성 + 자원) : 나트륨 이온 7 + 9 = 16점 / 웨어러블(에너지 밀도 + 안전성) : 리튬 이온 9 + 6 = 15점으로 가장 커요. 과제의 우선 조건이 달라지면 알맞은 전지도 달라져요.',
        },
        {
          title: '보완 아이디어와 동료 평가', manual: true,
          goal: '리튬 이온 전지의 <b>가장 낮은 항목과 보완 아이디어</b>, 나트륨 이온 전지가 지속 가능성에 유리한 까닭을 고르고, 동료 카드 3장에 <b>근거 · 창의성</b> 별점을 매긴 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '리튬 이온 전지의 레이더 점수 중 가장 작은 값(4점)이 무엇인지 보세요. 나트륨 이온은 자원 점수가 9점으로 가장 커요. 동료 카드는 근거가 타당한지, 아이디어가 새로운지로 평가해요.',
          setup() { S.gate = 'fuB'; S.fu.idea = { a: '', b: '', c: '' }; S.fu.r = [{}, {}, {}]; clearSel(['fuI1', 'fuI2', 'fuI3']); setScene('future'); updateCtl(); },
          check() {
            const i = S.fu.idea; markSel(['fuI1', 'fuI2', 'fuI3'], [i.a === 'c', i.b === 'a', i.c === 'a']);
            if (!i.a || !i.b || !i.c) return '세 칸을 모두 골라 주세요.';
            if (!fuIdeaOk()) return i.a !== 'c' ? '리튬 이온 전지의 점수 중 가장 낮은 항목을 레이더 차트에서 찾아보세요.' : '보완 아이디어와 나트륨 이온 전지의 장점을 다시 생각해 보세요. 자원 문제를 해결하는 방향이에요.';
            if (fuPeerN() < 6) return '동료 카드 평가가 아직 끝나지 않았어요 (' + fuPeerN() + ' / 6). 근거와 창의성에 별점을 매겨 주세요.';
            return true;
          },
          status: () => '아이디어 ' + mark(fuIdeaOk()) + ' &nbsp; 동료 평가 ' + fuPeerN() + ' / 6 ' + mark(fuPeerN() === 6),
          explain: '리튬 이온 전지는 <b>자원 풍부(4점)</b>가 가장 낮아서 코발트 같은 <b>희소 금속을 덜 쓰는 소재</b>와 재활용이 필요해요. 나트륨 이온 전지는 <b>자원이 풍부</b>해서 재료를 구하기 쉬워 지속 가능성 면에서 유리할 수 있어요. 동료의 아이디어를 근거 · 창의성으로 평가하며 더 나은 설계를 찾는 것이 연구의 과정이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-redox-life', mount: '#game', badge: '화학의 신비 탐험가', homeHref: '../../index.html#hr',
    featureLabels: { body: '🧬 세포 호흡 · 연소 비교 · 산화수 표', photo: '🌿 광합성 · 호흡 분류, 사과와 비타민 C', battery: '🔋 전지 3종 · 역할 이름표 · 방전 / 충전', future: '🌍 레이더 차트 · 과제별 전지 선택' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  bdReset(); psReset(); S.fu.show = { li: true, na: true, h2: false, pb: false };
  setScene('body');
  function stepAll1(dt) { stepBody(dt); stepPhoto(dt); stepBattery(dt); stepFuture(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'body') drawBody(t); else if (S.mode === 'photo') drawPhoto(t); else if (S.mode === 'battery') drawBattery(t); else drawFuture(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, BT, BTK, FB, FSC, bdLay, btRects, bdGo, bdReset, bdKind, bdE, bdOk, psDose, psReset, btPick, btDir, btRole, btNReq, fuSc, fuToggle, fuPickB, fuDecide, fuBestCalc, fuSum, fuNDone, fuPeerN,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
