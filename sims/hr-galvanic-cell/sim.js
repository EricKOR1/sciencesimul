/* 화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 화학 전지의 원리 [12반응02-03]
   ① 관찰: 분리 반응 (한 비커의 Zn + CuSO₄ 용액에서는 열이 나요)  ② 모형: 전지 구성 (다니엘 전지 조립, 염다리)
   ③ 분석: 변화 분석 (전자 이동량에 따른 질량 · 이온 농도 변화)  ④ 예측: 전극 조합 (Zn · Cu · Ag 중 두 개)
   네른스트 식, 농도 전지, 전해질 농도에 따른 전압 변화, ΔG는 다루지 않아요. 표준 상태(1 M, 25 °C)에서 Zn–Cu 전지의 전압은 1.10 V예요. */
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
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 14, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad });
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

  const MODE_LABEL = { beaker: '🔥 한 비커 반응', cell: '🧩 다니엘 전지 조립', analysis: '📊 변화 분석', combo: '🎯 전극 조합' };
  const NEGC = '#dc2626', POSC = '#2563eb', ZNC = '#94a3b8', CUC = '#d97706', AGC = '#cbd5e1', ANC = '#f59e0b';
  const fz = (n) => (PHONE ? n - 1 : n);
  const M_ZN = 65.38, M_CU = 63.55;                  // g/mol
  const E_CELL = { 'Cu|Zn': 1.10, 'Ag|Cu': 0.46, 'Ag|Zn': 1.56 };
  const EZERO = { Zn: -0.76, Cu: 0.34, Ag: 0.80 };    // 표준 환원 전위 (V) - 전압 표시에만 사용
  const METAL = {
    Zn: { plate: '#aab4c2', dark: '#7d8899', ion: 'Zn²⁺', sol: 'ZnSO₄', solc: '#dbeafe', sola: 0.32, icol: ZNC, an: 'SO₄²⁻' },
    Cu: { plate: '#c8743a', dark: '#8f4b1e', ion: 'Cu²⁺', sol: 'CuSO₄', solc: '#3b9be0', sola: 0.62, icol: '#3b82c4', an: 'SO₄²⁻' },
    Ag: { plate: '#d7dde5', dark: '#9aa5b4', ion: 'Ag⁺', sol: 'AgNO₃', solc: '#dbeafe', sola: 0.32, icol: '#a8b3c4', an: 'NO₃⁻' },
  };

  Object.assign(S, {
    mode: 'beaker', sub: { beaker: 'one' },
    bk: { go: false, p: 0, dip: 0, ev: [], seen: false, T: 25.0, sep: { t: 0, V: 0, imb: 0, lit: 0, on: false } },
    cl: { parts: {}, bridgeOn: true, imb: 0, V: 0, lit: 0, seenDrop: false, drag: null, shake: 0, hint: '', sel: { zn: '', cu: '', dir: '' }, flowOn: 0, bridgeK: 0, wireK: 0, solK: [0, 0], lastOk: false },
    an: { n: 0, play: false, pred: NaN, eq: { eq1: '', eq2: '', cur: '' }, shown: 0, mark: [0, 0], vis: false },
    cb: { A: 'Zn', B: 'Cu', pred: '', tested: {}, V: 0, neg: 'L', size: 'small', run: 0, shown: null, wrong: 0, sizeSeen: false },
  });

  /* ============ 전지 공통 그림 ============ */
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
  function gauge(x, y, r, V, vmax, label) {
    ctx.save();
    D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4;
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.12 + 0.76 * i / 8), c = Math.cos(a), s2 = Math.sin(a); ctx.beginPath(); ctx.moveTo(x + c * r * 0.76, y + r * 0.12 + s2 * r * 0.76); ctx.lineTo(x + c * r * 0.9, y + r * 0.12 + s2 * r * 0.9); ctx.stroke(); }
    const a = Math.PI * (1.12 + 0.76 * clamp(V / vmax, 0, 1));
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + r * 0.12); ctx.lineTo(x + Math.cos(a) * r * 0.72, y + r * 0.12 + Math.sin(a) * r * 0.72); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y + r * 0.12, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
    T(x, y + r * 0.62, label != null ? label : V.toFixed(2) + ' V', 13, INK, 'center', 900);
  }
  function bulbDraw(x, y, lit, t) {
    if (lit > 0.02) D.glow(x, y, 20 + 36 * lit, '#fde047', 0.75 * lit);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y - 3, 15, 0, TAU); ctx.fillStyle = C.mix('#e5e7eb', '#fde68a', lit); ctx.fill(); ctx.strokeStyle = lit > 0.3 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = lit > 0.3 ? '#b45309' : '#9ca3af'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 5, y + 6); ctx.lineTo(x - 3, y - 4); ctx.lineTo(x, y + 1); ctx.lineTo(x + 3, y - 4); ctx.lineTo(x + 5, y + 6); ctx.stroke();
    D.roundRect(x - 7, y + 10, 14, 8, 2); ctx.fillStyle = '#64748b'; ctx.fill();
    ctx.restore();
  }
  function ptAlong(pts, s) {
    let tot = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let d = clamp(s, 0, 1) * tot;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? d / seg[i] : 0; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k }; } d -= seg[i]; }
    return { x: pts[0][0], y: pts[0][1] };
  }
  /* st: { L:{metal, plate, sol, thick, lvl, cat, an, hint, name}, R:{...}, bridge(0~1), wire(0~1), V, flow(0~1), imb, neg:'L'|'R', signs, lit, gauge, vmax, bridgeOn, label } */
  function drawCell(R, st, t) {
    const g = cellGeo(R);
    D.roundRect(R.x + 8, g.floor + 1, R.w - 16, 8, 4); ctx.fillStyle = '#cbd5e1'; ctx.fill();
    const info = {};
    [['L', g.cxL, g.pxL], ['R', g.cxR, g.pxR]].forEach(([s, cx, px]) => {
      const q = st[s], mt = METAL[q.metal || (s === 'L' ? 'Zn' : 'Cu')];
      const x = cx - g.bw / 2, lvl = q.sol ? (q.lvl == null ? 0.62 : q.lvl) * (q.solK == null ? 1 : q.solK) : 0;
      const bk = beaker(x, g.top, g.bw, g.bh, { level: lvl, color: mt.solc, alpha: q.solA != null ? q.solA : mt.sola, inside: (gm) => {
        const nc = q.cat || 0, na = q.an || 0, jig = 2;
        for (let i = 0; i < na; i++) { const p = ballPos(gm, i + 40, 5, jig, t); D.sphere(p[0], p[1], 4.6, ANC, { gloss: false }); }
        for (let i = 0; i < nc; i++) { const p = ballPos(gm, i, 5.5, jig, t); D.sphere(p[0], p[1], 5.4, mt.icol, { gloss: false, outline: 'rgba(255,255,255,.6)', outlineWidth: 1 }); }
      } });
      info[s] = bk;
      if (!q.sol && !q.plate && st.empty) T(cx, g.top + g.bh * 0.5, q.hint || '', fz(13.5), '#94a3b8', 'center', 800);
      // 판
      if (q.plate) {
        const thick = q.thick == null ? 1 : q.thick, pk = q.pk == null ? 1 : q.pk, pw = clamp(22 * thick, 7, 36);
        const y0 = g.plateTop + (1 - pk) * -30, y1 = g.top + g.bh - 14;
        ctx.save(); ctx.globalAlpha = Math.min(1, pk * 1.4);
        const gr = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0); gr.addColorStop(0, C.shade(mt.plate, 0.25)); gr.addColorStop(0.5, mt.plate); gr.addColorStop(1, mt.dark);
        D.shadow(() => { D.roundRect(px - pw / 2, y0, pw, y1 - y0, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
        if (q.sol) { const ly = bk.ly; if (y1 > ly) { ctx.fillStyle = C.rgba(mt.solc, 0.22); ctx.fillRect(px - pw / 2, Math.max(y0, ly), pw, y1 - Math.max(y0, ly)); } }
        if (q.deposit) { ctx.fillStyle = C.rgba('#b45f2a', Math.min(1, q.deposit)); ctx.fillRect(px - pw / 2 - 1, Math.max(y0, bk.ly), pw + 2, y1 - Math.max(y0, bk.ly)); }
        ctx.restore();
        if (st.signs) { const neg = st.neg === s; pill(px, y0 - 14, neg ? '−' : '+', { bg: neg ? NEGC : POSC, color: '#fff', border: null, size: 15, pad: 7 }); }
      }
      T(cx, g.floor + 28, q.name || '', fz(14), INK, 'center', 800);
      if (q.name2) T(cx, g.floor + 46, q.name2, fz(13), MUTED, 'center', 700);
      // 전하 쌓임
      if (st.imb > 0.05 && q.sol) {
        const pos = (s === 'L');
        ctx.save(); ctx.globalAlpha = Math.min(0.9, st.imb); pill(cx, g.top - 14 + (PHONE ? 4 : 0), pos ? '+ 전하가 쌓여요' : '− 전하가 쌓여요', { bg: pos ? '#fee2e2' : '#dbeafe', color: pos ? '#b91c1c' : '#1d4ed8', border: pos ? '#f87171' : '#60a5fa', size: 13 }); ctx.restore();
      }
    });
    // 염다리
    if (st.bridge > 0.01) {
      const yi = g.top + g.bh * 0.58, k = st.bridge, off = -(1 - k) * 46;
      const pts = [[g.bxL, yi], [g.bxL, g.apex], [g.bxR, g.apex], [g.bxR, yi]];
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.6); ctx.translate(0, off); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(100,116,139,.85)'; ctx.lineWidth = 15; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 10; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (st.bridgeOn !== false && st.flow > 0.05) {
        const n = 4; for (let i = 0; i < n; i++) {
          const u = ((i / n) + t * 0.18 * st.flow) % 1, fw = st.neg !== 'R', p1 = ptAlong(pts, fw ? u : 1 - u), p2 = ptAlong(pts, fw ? 1 - u : u);
          D.sphere(p1.x, p1.y, 4.4, '#a855f7', { gloss: false }); D.sphere(p2.x, p2.y, 4.4, ANC, { gloss: false });
        }
      }
      ctx.restore();
      if (st.bridge > 0.9) T((g.bxL + g.bxR) / 2, g.apex + 30, '염다리 (KNO₃)', 13, MUTED, 'center', 800);
    }
    // 도선 · 전구 · 전압계
    if (st.wire > 0.01) {
      const k = st.wire, pL = [g.pxL, g.plateTop], pR = [g.pxR, g.plateTop];
      const wp = [[pL[0], pL[1]], [pL[0], g.yw], [pR[0], g.yw], [pR[0], pR[1]]];
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const xb = pL[0] + (pR[0] - pL[0]) * 0.26;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pL[0], pL[1]); ctx.lineTo(pL[0], g.yw); ctx.lineTo(xb - 17, g.yw); ctx.moveTo(xb + 17, g.yw); ctx.lineTo(pR[0], g.yw); ctx.lineTo(pR[0], pR[1]); ctx.stroke();
      if (!st.noGauge) {
        ctx.lineWidth = 2; ctx.strokeStyle = '#64748b';
        ctx.beginPath(); ctx.moveTo(pL[0], g.gy); ctx.lineTo(g.gx - g.gr, g.gy); ctx.moveTo(g.gx + g.gr, g.gy); ctx.lineTo(pR[0], g.gy); ctx.stroke();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(pL[0], g.gy, 3.2, 0, TAU); ctx.arc(pR[0], g.gy, 3.2, 0, TAU); ctx.fill();
      }
      bulbDraw(xb, g.yw, st.lit || 0, t);
      if (!st.noGauge) gauge(g.gx, g.gy, g.gr, st.V || 0, st.vmax || 1.6, st.gaugeLabel);
      // 전자
      const neg = st.neg || 'L', a = neg === 'L' ? wp : wp.slice().reverse();
      if (st.flow > 0.03) {
        const N = 9;
        for (let i = 0; i < N; i++) { const u = ((i / N) + t * 0.22 * st.flow) % 1, p = ptAlong(a, u); ctx.globalAlpha = Math.min(1, k * 1.5) * Math.min(1, st.flow * 1.6); eBall(p.x, p.y, 5.2); }
      }
      ctx.restore();
      if (st.flow > 0.1 && st.showDir) {
        const dirx = neg === 'L' ? 1 : -1, ax = (g.pxL + g.pxR) / 2;
        D.arrow(ax - dirx * 20, g.yw - 18, ax + dirx * 20, g.yw - 18, { color: '#b45309', width: 3, head: 9 });
        T(ax, g.yw - 26, '전자의 이동', 13, '#b45309', 'center', 800);
      }
    }
    return g;
  }
  function legendRow(x, y) {
    const items = [[ZNC, 'Zn²⁺'], ['#3b82c4', 'Cu²⁺'], [ANC, '음이온'], ['#a855f7', 'K⁺']];
    items.forEach(([c, tx], i) => { D.sphere(x + i * 70, y - 4, 5, c, { gloss: false }); T(x + i * 70 + 10, y, tx, 13, MUTED, 'left', 700); });
  }

  /* ============ ① 한 비커 반응 ============ */
  const BKN = 5;
  function bkReset() {
    const b = S.bk; b.go = false; b.p = 0; b.dip = 0; b.T = 25.0; b.seen = false; b.vis2 = false;
    b.ev = []; for (let j = 0; j < BKN; j++) b.ev.push({ th: (j + 0.4) / (BKN + 0.2), e: -1, s: 0 });
    const d = $('#bkDT'); if (d) { d.value = ''; d.classList.remove('ok', 'bad'); }
    parts.clear(); updateCtl();
  }
  function bkGo() { const b = S.bk; if (b.go) return; b.go = true; Sound.click(); updateCtl(); }
  function sepReset() { const s = S.bk.sep; s.t = 0; s.V = 0; s.imb = 0; s.lit = 0; }
  function setBkSub(v) { S.sub.beaker = v; if (v === 'two') { sepReset(); S.bk.vis2 = true; } updateCtl(); }
  const bkTemp = () => 25 + 10 * sm(S.bk.p);
  function stepBeaker(dt) {
    const b = S.bk;
    b.dip = ap(b.dip, b.go ? 1 : 0, dt, 2.4); if (Math.abs(b.dip - (b.go ? 1 : 0)) < 0.004) b.dip = b.go ? 1 : 0;
    if (b.go && b.dip >= 0.99) b.p = Math.min(1, b.p + dt / 8.5);
    b.T = bkTemp();
    b.ev.forEach((e) => {
      if (e.e < 0 && b.p >= e.th) e.e = 0;
      if (e.e >= 0 && e.e < 1) e.e = Math.min(1, e.e + dt / 0.55);
      if (e.e >= 1 && e.s < 1) e.s = Math.min(1, e.s + dt / 0.9);
    });
    if (b.p >= 0.999 && !b.seen) { b.seen = true; updateCtl(); }
    // 분리 장면 (염다리 없음)
    const sp = b.sep; if (S.mode === 'beaker' && S.sub.beaker === 'two') { sp.t += dt; sp.imb = Math.min(1, sp.imb + dt / 2.4); }
    sp.V = ap(sp.V, 1.1 * (1 - sp.imb), dt, 8); sp.lit = clamp(sp.V / 1.1, 0, 1);
  }
  function drawBeaker(t) {
    const sub = S.sub.beaker;
    if (sub === 'one') drawOne(t); else drawTwo(t);
  }
  function thermo(x, y, h, T0v) {
    D.thermometer(x, y, h, T0v, 20, 40, { ticks: false });
    for (let v = 20; v <= 40; v += 5) { const ty = y + h - (h - 10) * ((v - 20) / 20); ctx.fillStyle = '#5d6879'; ctx.fillRect(x + 10, ty - 0.7, 6, 1.5); T(x + 20, ty + 4.5, v + '°', 13, '#5d6879', 'left', 700); }
  }
  function drawOne(t) {
    const b = S.bk, p = b.p;
    T(14, 26, '🔥 Zn판을 CuSO₄ 용액에 담그면 무슨 일이 일어날까요?', PHONE ? 13 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const bw = PHONE ? 130 : 168, bh = PHONE ? 140 : 190, bx = MAIN.x + (PHONE ? 60 : 70), by = MAIN.y + (PHONE ? 78 : 112), cx = bx + bw / 2;
    // 스탠드 막대와 판
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 28, by - 44); ctx.lineTo(bx + bw + 28, by - 44); ctx.stroke();
    const plateH = PHONE ? 96 : 130, restY = by - 44 + 6, dipDepth = by + bh - 24 - plateH - restY;
    const py = restY + dipDepth * sm(b.dip);
    const thick = 1 - 0.1 * p;
    const sol = b.p, solA = 0.6 - 0.34 * sm(sol), solC = C.mix('#3b9be0', '#cfe4f3', sm(sol));
    const bk = beaker(bx, by, bw, bh, { level: 0.64, color: solC, alpha: solA, inside: (g) => {
      for (let i = 0; i < 6; i++) { const q = ballPos(g, i + 40, 5, 2, t); D.sphere(q[0], q[1], 4.6, ANC, { gloss: false }); }
      const nZ = Math.round(5 * sm(sol)); for (let i = 0; i < nZ; i++) { const q = ballPos(g, i + 70, 5.5, 2, t); D.sphere(q[0], q[1], 5.2, ZNC, { gloss: false, outline: 'rgba(255,255,255,.6)', outlineWidth: 1 }); }
    } });
    // 판
    const pw = 26 * thick;
    const gr = ctx.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0); gr.addColorStop(0, '#d5dbe4'); gr.addColorStop(0.5, '#aab4c2'); gr.addColorStop(1, '#7d8899');
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, by - 44); ctx.lineTo(cx, py); ctx.stroke();
    D.shadow(() => { D.roundRect(cx - pw / 2, py, pw, plateH, 3); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 2 });
    const sub0 = Math.max(py, bk.ly);
    if (py + plateH > bk.ly) { ctx.fillStyle = C.rgba('#3b9be0', 0.18); ctx.fillRect(cx - pw / 2, sub0, pw, py + plateH - sub0); }
    if (p > 0.01) { ctx.fillStyle = C.rgba('#b45f2a', Math.min(0.95, p * 1.1)); ctx.fillRect(cx - pw / 2 - 1.5 * p, Math.max(py, bk.ly), pw + 3 * p, py + plateH - Math.max(py, bk.ly)); }
    T(cx, by + bh + 24, '0.20 M CuSO₄ 용액 50 mL', PHONE ? 13 : 14, INK, 'center', 800);
    T(cx, by - 54, 'Zn판', 14, MUTED, 'center', 800);
    // 온도계
    const tx = bx + bw + (PHONE ? 46 : 46), ty = by - 28, th = PHONE ? 120 : 176;
    thermo(tx, ty, th, b.T);
    T(tx + 8, ty + th + 44, b.T.toFixed(1) + ' °C', 17, b.T > 25.05 ? '#dc2626' : INK, 'center', 800);
    // 입자 모형
    const iw = PHONE ? MAIN.w - 24 : MAIN.w - (tx + 90 - MAIN.x) - 14, ih = PHONE ? 132 : 230, ix = PHONE ? MAIN.x + 12 : tx + 90, iy = PHONE ? MAIN.y + MAIN.h - ih - 12 : MAIN.y + 16;
    if (PHONE) { /* 폰: 온도계 아래 */ }
    drawInset(ix, iy, iw, ih, t);
    // 안내
    if (!b.go) pill(PHONE ? cx : MAIN.x + MAIN.w * 0.72, MAIN.y + MAIN.h - 20, '“Zn판 담그기” 단추를 눌러요', { bg: '#f1f5f9', color: MUTED, border: '#cbd5e1', size: 14 });
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, 'Zn + Cu²⁺ → Zn²⁺ + Cu  (Zn은 전자를 잃고, Cu²⁺는 전자를 얻어요)', PHONE ? 13.5 : 15, WARN, 'left', 800);
    const lines = [[b.dip > 0.99, 'Zn판 표면에 붉은 Cu가 석출되고 푸른색이 옅어져요.'], [b.seen, '전자가 표면에서 바로 이동해서, 에너지가 모두 열로 나가요. (온도 상승)'], [b.vis2, '전자를 도선으로 지나가게 하면 전기 에너지로 쓸 수 있을까요? (② 둘로 나누면 장면)']];
    let yy = INFO.y + 52;
    lines.forEach((l, i) => { yy += textBlock(INFO.x + 16, yy, INFO.w - 32, (l[0] ? '✅ ' : '⬜ ') + l[1], 14, l[0] ? '#166534' : MUTED, 19, 700) + 6; });
  }
  function drawInset(x, y, w, h, t) {
    const b = S.bk;
    D.roundRect(x, y, w, h, 14); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.4; ctx.stroke();
    T(x + 12, y + 22, '🔍 입자 모형으로 보기 (Zn판 표면)', 13.5, '#5b21b6', 'left', 800);
    const zw = w * 0.3;
    ctx.save(); D.roundRect(x + 2, y + 32, zw, h - 34, 12); ctx.clip(); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x, y + 30, zw + 2, h); ctx.restore();
    T(x + zw / 2 + 2, y + h - 8, 'Zn판', 13, MUTED, 'center', 800);
    T(x + w - 20, y + h - 8, 'CuSO₄ 용액', 13, '#2f6aa8', 'right', 800);
    const rowH = (h - 104) / BKN, zx = x + zw - 18, cxs = x + w - 58, dist = cxs - zx - 30;
    b.ev.forEach((e, j) => {
      const yy = y + 74 + rowH * (j + 0.5);
      const sw = sm(e.s), znx = zx + dist * sw, cux = cxs - dist * sw;
      const lift = Math.sin(Math.PI * sw) * 11;
      // 전자
      if (e.e >= 0 && e.e < 1) { const k = e.e; const ex = zx + (cxs - zx) * k, ey = yy - 22 * Math.sin(Math.PI * k); D.glow(ex, ey, 14, '#fbbf24', 0.5); eBall(ex, ey, 6.5); }
      const gone = e.e >= 1;
      D.sphere(znx, yy - lift, 13.5, gone ? '#cfd8e4' : ZNC, { text: gone ? 'Zn²⁺' : 'Zn', textColor: '#334155', textScale: 0.62, outline: gone ? '#60a5fa' : null, outlineWidth: 1.6, gloss: false });
      D.sphere(cux, yy + lift, 13.5, gone ? '#d97706' : '#3b82c4', { text: gone ? 'Cu' : 'Cu²⁺', textColor: '#fff', textScale: 0.62, gloss: false });
    });
    T(x + w / 2, y + 40 + 4, '', 12, MUTED);
    // 설명 라벨
    pill(x + w * 0.5, y + 48, b.p > 0.05 ? '전자가 Zn → Cu²⁺ 로 바로 이동' : '전자가 곧 이동할 거예요', { bg: '#fff7d6', color: '#7a4a00', border: '#f59e0b', size: 13 });
  }
  function drawTwo(t) {
    const s = S.bk.sep;
    T(14, 26, '🧩 Zn판과 Cu판을 따로 넣고 도선으로 이으면?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const R = { x: MAIN.x, y: MAIN.y, w: MAIN.w, h: MAIN.h };
    const g = drawCell(R, { L: { metal: 'Zn', plate: true, sol: true, cat: 6, an: 6, name: 'Zn판 + ZnSO₄ 용액' }, R: { metal: 'Cu', plate: true, sol: true, cat: 6, an: 6, name: 'Cu판 + CuSO₄ 용액' }, bridge: 0, wire: 1, V: s.V, lit: s.lit, flow: s.lit, imb: 0, neg: 'L', signs: true, showDir: true }, t);
    // 끊긴 자리
    const gx = (g.cxL + g.cxR) / 2, gy = g.apex;
    ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.bxL, g.apex + 14); ctx.lineTo(g.bxR, g.apex + 14); ctx.stroke(); ctx.restore();
    T(gx, g.apex + 36, '❓ 두 용액 사이가 끊겨 있어요', 14.5, '#b91c1c', 'center', 800);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '전자가 도선을 지나가면 전기 에너지로 쓸 수 있어요', 15, WARN, 'left', 800);
    const done = s.imb > 0.9;
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, done ? '전압이 곧 0 V로 떨어져 전구가 꺼졌어요. 두 비커가 이어지지 않아서 전하가 쌓이기 때문이에요. 이것을 해결하는 장치는 다음 단계에서 만들어요.' : '처음에는 전구가 잠깐 켜졌다가…', 14, INK, 20, 700);
  }

  /* ============ ② 전지 조립 ============ */
  const PARTS = [
    { id: 'zn', name: 'Zn판', sub: '', zone: 'L' },
    { id: 'znso4', name: 'ZnSO₄', sub: '수용액', zone: 'L' },
    { id: 'cu', name: 'Cu판', sub: '', zone: 'R' },
    { id: 'cuso4', name: 'CuSO₄', sub: '수용액', zone: 'R' },
    { id: 'bridge', name: '염다리', sub: 'KNO₃', zone: 'B' },
    { id: 'wire', name: '도선 · 전구', sub: '+ 전압계', zone: 'W' },
  ];
  const HINTS = { L: 'Zn판과 ZnSO₄ 용액은 왼쪽 비커에 넣어요.', R: 'Cu판과 CuSO₄ 용액은 오른쪽 비커에 넣어요.', B: '염다리는 두 비커 사이를 이어야 해요. 양 끝을 두 용액에 담가요.', W: '도선 · 전구 · 전압계는 두 금속판 위에 연결해요.' };
  const clG = () => ({ x: MAIN.x, y: MAIN.y, w: MAIN.w, h: MAIN.h });
  const clOn = (id) => !!(S.cl.parts[id] && S.cl.parts[id].on);
  PARTS.forEach((p) => { S.cl.parts[p.id] = { on: false, k: 0 }; });
  const clPlaced = () => PARTS.filter((p) => clOn(p.id)).length;
  const clCircuit = () => clOn('wire') && clOn('zn') && clOn('cu') && clOn('znso4') && clOn('cuso4');
  const clBridge = () => clOn('bridge') && S.cl.bridgeOn;
  function clReset() {
    const c = S.cl; PARTS.forEach((p) => { c.parts[p.id] = { on: false, k: 0 }; });
    c.bridgeOn = true; c.imb = 0; c.V = 0; c.lit = 0; c.seenDrop = false; c.drag = null; c.shake = 0; c.bridgeK = 0; c.wireK = 0; c.solK = [0, 0];
    c.sel = { zn: '', cu: '', dir: '' }; ['selZn', 'selCu', 'selDir'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
    parts.clear(); updateCtl();
  }
  const trayG = (i) => {
    const cols = PHONE ? 3 : 6, rows = PHONE ? 2 : 1, cw = (INFO.w - 24 - (cols - 1) * 8) / cols, ch = PHONE ? 104 : 100;
    const c = i % cols, r = Math.floor(i / cols);
    return { x: INFO.x + 12 + c * (cw + 8) + cw / 2, y: INFO.y + 40 + r * (ch + 8) + ch / 2, w: cw, h: ch };
  };
  function cardIcon(id, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 'zn' || id === 'cu') { const gr = ctx.createLinearGradient(-9, 0, 9, 0); const m = METAL[id === 'zn' ? 'Zn' : 'Cu']; gr.addColorStop(0, C.shade(m.plate, 0.25)); gr.addColorStop(1, m.dark); D.roundRect(-9, -26, 18, 52, 3); ctx.fillStyle = gr; ctx.fill(); }
    else if (id === 'znso4' || id === 'cuso4') { const m = METAL[id === 'znso4' ? 'Zn' : 'Cu']; ctx.strokeStyle = '#7b93b3'; ctx.lineWidth = 2.4; ctx.fillStyle = C.rgba(m.solc, id === 'znso4' ? 0.35 : 0.7); D.roundRect(-18, -16, 36, 40, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-16, -16, 32, 3); }
    else if (id === 'bridge') { ctx.lineCap = 'round'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(-22, 16); ctx.lineTo(-22, -12); ctx.lineTo(22, -12); ctx.lineTo(22, 16); ctx.stroke(); ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 7; ctx.stroke(); }
    else { ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-26, 14); ctx.lineTo(-26, -14); ctx.lineTo(-8, -14); ctx.moveTo(8, -14); ctx.lineTo(26, -14); ctx.lineTo(26, 14); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -12, 11, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 12, 9, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#475569'; ctx.stroke(); }
    ctx.restore();
  }
  function drawCard(i, x, y, lift, ghost) {
    const p = PARTS[i], g = trayG(i);
    ctx.save(); ctx.translate(x, y); const sc = lift ? 1.1 : 1; ctx.scale(sc, sc); if (ghost) ctx.globalAlpha = 0.35;
    D.shadow(() => { D.roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: lift ? 14 : 5, y: lift ? 7 : 2 });
    D.roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 12); ctx.strokeStyle = lift ? PUR : '#94a3b8'; ctx.lineWidth = lift ? 2.6 : 1.6; ctx.stroke();
    cardIcon(p.id, 0, -14, PHONE ? 0.8 : 0.82);
    T(0, g.h / 2 - 22, p.name, fz(14), INK, 'center', 800);
    T(0, g.h / 2 - 7, p.sub, 13, MUTED, 'center', 700);
    ctx.restore();
  }
  const cardAt = (p) => { for (let i = PARTS.length - 1; i >= 0; i--) { if (clOn(PARTS[i].id)) continue; const g = trayG(i); if (Math.abs(p.x - g.x) <= g.w / 2 && Math.abs(p.y - g.y) <= g.h / 2) return i; } return -1; };
  function zonesAt(p) {
    const g = cellGeo(clG()), out = [];
    if (p.y <= g.gy + g.gr + 18 && p.x >= MAIN.x && p.x <= MAIN.x + MAIN.w && p.y >= MAIN.y) out.push('W');
    if (p.x >= g.cxL + g.bw * 0.08 && p.x <= g.cxR - g.bw * 0.08 && p.y > g.gy + g.gr + 8 && p.y <= g.top + g.bh * 0.5) out.push('B');
    if (Math.abs(p.x - g.cxL) <= g.bw / 2 + 14 && p.y > g.plateTop - 24 && p.y <= g.floor + 12) out.push('L');
    if (Math.abs(p.x - g.cxR) <= g.bw / 2 + 14 && p.y > g.plateTop - 24 && p.y <= g.floor + 12) out.push('R');
    return out;
  }
  function clPlace(id) {
    const c = S.cl, p = c.parts[id]; if (p.on) return; p.on = true; p.k = 0; Sound.tick();
    const g = cellGeo(clG()), part = PARTS.find((q) => q.id === id);
    const pt = part.zone === 'L' ? [g.cxL, g.top + g.bh * 0.4] : part.zone === 'R' ? [g.cxR, g.top + g.bh * 0.4] : part.zone === 'B' ? [g.gx, g.apex] : [g.gx, g.yw];
    flash(pt[0], pt[1], ['#14a058', '#fbbf24', '#8b5cf6']); updateCtl();
  }
  function stepCell(dt) {
    const c = S.cl;
    PARTS.forEach((p) => { const q = c.parts[p.id]; q.k = ap(q.k, q.on ? 1 : 0, dt, 5); if (Math.abs(q.k - (q.on ? 1 : 0)) < 0.004) q.k = q.on ? 1 : 0; });
    c.solK[0] = ap(c.solK[0], clOn('znso4') ? 1 : 0, dt, 3); c.solK[1] = ap(c.solK[1], clOn('cuso4') ? 1 : 0, dt, 3);
    c.shake = Math.max(0, c.shake - dt);
    const circ = clCircuit(), br = clBridge();
    c.imb = ap(c.imb, circ && !br ? 1 : 0, dt, circ && !br ? 0.85 : 2.4);
    const vt = circ ? 1.1 * (1 - c.imb) : 0;
    c.V = ap(c.V, vt, dt, 7); c.lit = clamp(c.V / 1.1, 0, 1);
    if (circ && !br && c.V < 0.08 && c.imb > 0.85 && !c.seenDrop) { c.seenDrop = true; updateCtl(); }
    const ok = circ && br && c.V >= 1.05; if (ok !== c.lastOk) { c.lastOk = ok; updateCtl(); }
    if (!circ && c.seenDrop === false) { /* nothing */ }
  }
  function cellState(t) {
    const c = S.cl, P = c.parts, imb = c.imb;
    const znOn = clOn('znso4'), cuOn = clOn('cuso4');
    const L = { metal: 'Zn', plate: clOn('zn'), pk: P.zn.k, sol: znOn, solK: c.solK[0], cat: znOn ? 6 + Math.round(3 * imb) : 0, an: znOn ? 6 : 0, hint: 'Zn판 + ZnSO₄ 용액', name: znOn || clOn('zn') ? (clOn('zn') ? 'Zn판' : '') + (clOn('zn') && znOn ? ' + ' : '') + (znOn ? 'ZnSO₄ 용액' : '') : '' };
    const R = { metal: 'Cu', plate: clOn('cu'), pk: P.cu.k, sol: cuOn, solK: c.solK[1], cat: cuOn ? 6 - Math.round(3 * imb) : 0, an: cuOn ? 6 : 0, hint: 'Cu판 + CuSO₄ 용액', name: cuOn || clOn('cu') ? (clOn('cu') ? 'Cu판' : '') + (clOn('cu') && cuOn ? ' + ' : '') + (cuOn ? 'CuSO₄ 용액' : '') : '' };
    return { L, R, bridge: P.bridge.k * (c.bridgeOn ? 1 : 0.0), wire: P.wire.k, V: c.V, lit: c.lit, flow: clCircuit() ? c.lit : 0, imb, neg: 'L', signs: clOn('zn') && clOn('cu'), empty: true, bridgeOn: c.bridgeOn, showDir: true };
  }
  function drawCellScene(t) {
    const c = S.cl;
    T(14, 26, '🧩 부품을 끌어서 다니엘 전지를 만들어요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const st = cellState(t);
    const g = drawCell(clG(), st, t);
    // 빠진 염다리 표시 (꽂혀 있지 않을 때)
    if (clOn('bridge') && !c.bridgeOn) { ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.bxL, g.apex + 12); ctx.lineTo(g.bxR, g.apex + 12); ctx.stroke(); ctx.restore(); T((g.bxL + g.bxR) / 2, g.apex + 32, '염다리를 뺐어요', 14, '#b91c1c', 'center', 800); }
    // 드롭 구역 표시
    if (c.drag) {
      const part = PARTS[c.drag.i], zs = zonesAt(c.drag), okz = zs.indexOf(part.zone) >= 0;
      const zr = part.zone === 'L' ? [g.cxL - g.bw / 2 - 10, g.plateTop - 20, g.bw + 20, g.floor - g.plateTop + 28] : part.zone === 'R' ? [g.cxR - g.bw / 2 - 10, g.plateTop - 20, g.bw + 20, g.floor - g.plateTop + 28] : part.zone === 'B' ? [g.cxL + g.bw * 0.08, g.gy + g.gr + 10, g.cxR - g.cxL - g.bw * 0.16, g.top + g.bh * 0.5 - g.gy - g.gr - 10] : [MAIN.x + 8, MAIN.y + 6, MAIN.w - 16, g.gy + g.gr + 12 - MAIN.y];
      ctx.save(); ctx.setLineDash([8, 6]); ctx.lineWidth = 2.6; ctx.strokeStyle = okz ? GOODC : PUR; D.roundRect(zr[0], zr[1], zr[2], zr[3], 14); ctx.stroke(); ctx.fillStyle = okz ? 'rgba(20,160,88,.08)' : 'rgba(139,92,246,.05)'; ctx.fill(); ctx.restore();
    }
    // 전지식
    const all = clPlaced() === 6;
    if (all) T(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 12, 'Zn(s) | Zn²⁺(aq)  ‖  Cu²⁺(aq) | Cu(s)', PHONE ? 15 : 17, '#5b21b6', 'center', 800);
    else legendRow(MAIN.x + 14, MAIN.y + MAIN.h - 10);
    if (c.hint) { /* 말풍선은 stageHint 사용 */ }
    // INFO : 부품함
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '🧰 부품함 (' + (6 - clPlaced()) + '개 남음)', 15, WARN, 'left', 800);
    if (clPlaced() === 6) {
      const brOk = clBridge(); let msg, col = '#166534';
      if (!brOk && c.imb > 0.15) { msg = c.V < 0.08 ? '전압 0 V : 염다리가 없으면 (−)극 쪽에 + 전하, (+)극 쪽에 − 전하가 쌓여 전자가 더 흐르지 못해요.' : '전압이 떨어지고 있어요… 두 용액에 전하가 쌓이는 중이에요.'; col = '#b91c1c'; }
      else if (brOk && c.V > 1.0) msg = '염다리의 이온이 이동해 전하 균형을 지켜요. 반응이 계속되어 전압이 1.10 V로 유지돼요.';
      else msg = '모든 부품을 조립했어요! 염다리를 뺐다 꽂아 전압 변화를 살펴보세요.';
      textBlock(INFO.x + 24, INFO.y + 64, INFO.w - 48, msg, 15, col, 22, 800);
    }
    PARTS.forEach((p, i) => {
      if (clOn(p.id)) return;
      const g2 = trayG(i);
      if (c.drag && c.drag.i === i) { drawCard(i, g2.x, g2.y, false, true); return; }
      drawCard(i, g2.x + (c.shake > 0 && c.lastI === i ? Math.sin(c.shake * 60) * 4 : 0), g2.y, false, false);
    });
    if (c.drag) drawCard(c.drag.i, c.drag.x, c.drag.y - 10, true, false);
  }

  /* ============ ③ 변화 분석 ============ */
  const M0 = 20.0, VOL = 0.5;
  const mZn = (n) => M0 - (n / 2) * M_ZN, mCu = (n) => (n / 2) * M_CU + M0;
  const dZn = (n) => (n / 2) * M_ZN, dCu = (n) => (n / 2) * M_CU;
  const cZn = (n) => 1.0 + (n / 2) / VOL, cCu = (n) => 1.0 - (n / 2) / VOL;
  const f1 = (v) => r1(v).toFixed(1), f2 = (v) => (Math.round(v * 100 + 1e-9) / 100).toFixed(2);
  function anSet(n) { const a = S.an; a.n = clamp(Math.round(n * 100) / 100, 0, 0.4); updateCtl(); }
  function anReset() { const a = S.an; a.play = false; a.n = 0; a.shown = 0; a.acc = 0; updateCtl(); }
  function anTogglePlay() { const a = S.an; if (a.n >= 0.4 && !a.play) a.n = 0; a.play = !a.play; a.acc = 0; Sound.click(); updateCtl(); }
  function stepAnalysis(dt) {
    const a = S.an;
    if (a.play) { a.acc = (a.acc || 0) + dt; while (a.acc >= 0.22 && a.n < 0.4) { a.acc -= 0.22; a.n = Math.round((a.n + 0.01) * 100) / 100; } if (a.n >= 0.4) { a.play = false; updateCtl(); } if (S.mode === 'analysis') syncAn(); }
    a.shown = ap(a.shown, a.n, dt, 7); if (Math.abs(a.shown - a.n) < 0.0005) a.shown = a.n;
  }
  function syncAn() { const s = $('#sN'); if (s && +s.value !== Math.round(S.an.n * 100)) { s.value = Math.round(S.an.n * 100); s.dispatchEvent(new Event('input')); } }
  const anLay = () => {
    if (!PHONE) return { cell: { x: MAIN.x, y: MAIN.y, w: 410, h: MAIN.h }, mp: { x: MAIN.x + 462, y: MAIN.y + 50, w: 290, h: 128 }, bars: { x: MAIN.x + 428, y: MAIN.y + 240, w: 336, h: 84 } };
    return { cell: { x: MAIN.x, y: MAIN.y, w: MAIN.w, h: 226 }, mp: { x: MAIN.x + 50, y: MAIN.y + 256, w: MAIN.w - 72, h: 72 }, bars: { x: MAIN.x + 14, y: MAIN.y + 370, w: MAIN.w - 28, h: 50 } };
  };
  function plotAxes(P, xmax, ymax, xt, yt, xl, yl) {
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, P.y + P.h); ctx.lineTo(P.x + P.w, P.y + P.h); ctx.stroke();
    ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.lineWidth = 1;
    for (let v = 0; v <= ymax + 1e-9; v += yt) { const y = P.y + P.h - P.h * v / ymax; ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.stroke(); T(P.x - 6, y + 4.5, String(v), 13, MUTED, 'right', 700); }
    for (let v = 0; v <= xmax + 1e-9; v += xt) { const x = P.x + P.w * v / xmax; T(x, P.y + P.h + 17, v.toFixed(2).replace(/0$/, ''), 13, MUTED, 'center', 700); }
    T(P.x + P.w, P.y + P.h + 34, xl, 13, MUTED, 'right', 800); T(P.x - 6, P.y - 10, yl, 13, MUTED, 'right', 800);
  }
  function drawAnalysis(t) {
    const a = S.an, L = anLay(), n = a.n, sh = a.shown;
    T(14, 26, '📊 전자가 이동하면 전극과 용액이 어떻게 변할까요?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const run = n > 0 ? 1 : 0, flow = (a.play || n > 0) ? 1 : 0;
    const st = {
      L: { metal: 'Zn', plate: true, sol: true, thick: mZn(sh) / M0, cat: Math.round(6 * (1 + sh)), an: Math.round(6 * (1 + sh)), name: 'Zn판 (−)극', name2: '[Zn²⁺] ' + f2(cZn(n)) + ' M' },
      R: { metal: 'Cu', plate: true, sol: true, thick: mCu(sh) / M0, cat: Math.round(6 * (1 - sh)), an: Math.round(6 * (1 - sh)), solA: 0.18 + 0.44 * clamp(cCu(sh), 0, 1), name: 'Cu판 (+)극', name2: '[Cu²⁺] ' + f2(cCu(n)) + ' M' },
      bridge: 1, wire: 1, V: 1.10, lit: 0.9, flow, imb: 0, neg: 'L', signs: true, showDir: true, bridgeOn: true, noGauge: PHONE,
    };
    drawCell(L.cell, st, t);
    // 질량 그래프
    const P = L.mp, xmax = 0.4, ymax = 35;
    T(P.x + P.w / 2, P.y - (PHONE ? 12 : 22), PHONE ? '전극 질량 (g) · 가로축 : 이동한 전자 (mol)' : '전극 질량 (g)', 14, WARN, 'center', 800);
    plotAxes(P, xmax, ymax, 0.1, 10, PHONE ? '' : 'n(e⁻) mol', PHONE ? '' : 'g');
    [['Zn', ZNC, mZn], ['Cu', CUC, mCu]].forEach(([nm, col, fn]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const x = P.x + P.w * i / 40, y = P.y + P.h - P.h * fn(i / 100) / ymax; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      const mx = P.x + P.w * sh / xmax, my = P.y + P.h - P.h * fn(sh) / ymax;
      D.sphere(mx, my, 6.5, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
      T(P.x + P.w - 4, nm === 'Zn' ? P.y + P.h - P.h * fn(0.4) / ymax - 7 : P.y + P.h - P.h * fn(0.4) / ymax - 7, nm + ' ' + f1(fn(n)) + ' g', 13.5, nm === 'Zn' ? '#475569' : '#9a4a12', 'right', 800);
    });
    D.dashedLine(P.x + P.w * sh / xmax, P.y, P.x + P.w * sh / xmax, P.y + P.h, { color: 'rgba(139,92,246,.6)', width: 1.6 });
    if (!isNaN(a.pred) && a.vis) { const py = P.y + P.h - P.h * (M0 - a.pred) / ymax, px = P.x + P.w * 0.2 / xmax; ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.stroke(); ctx.restore(); T(px + 12, py + 4, '예측', 13, '#7c3aed', 'left', 800); }
    // 농도 막대
    const B = L.bars, bh = (B.h - 30) / 2;
    T(B.x, B.y - 4, '용액의 이온 농도 (M)', 14, WARN, 'left', 800);
    [['Zn²⁺', cZn, '#94a3b8', 0], ['Cu²⁺', cCu, '#3b82c4', 1]].forEach(([nm, fn, col, i]) => {
      const y = B.y + 8 + i * (bh + 8), maxC = 1.5, labW = 52, bw0 = B.w - labW - 64;
      T(B.x, y + bh * 0.72, nm, 14, INK, 'left', 800);
      D.roundRect(B.x + labW, y, bw0, bh, 7); ctx.fillStyle = '#eef2f7'; ctx.fill();
      const wv = bw0 * clamp(fn(sh), 0, maxC) / maxC;
      if (wv > 1) { D.roundRect(B.x + labW, y, Math.max(wv, 8), bh, 7); ctx.fillStyle = col; ctx.fill(); }
      const x1 = B.x + labW + bw0 * 1.0 / maxC; ctx.strokeStyle = 'rgba(71,85,105,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x1, y - 2); ctx.lineTo(x1, y + bh + 2); ctx.stroke();
      T(B.x + labW + bw0 + 6, y + bh * 0.72, f2(fn(n)), 14, INK, 'left', 800);
    });
    T(B.x + 52 + (B.w - 52 - 64) / 1.5, B.y + B.h + (PHONE ? 6 : 6), '처음 1.00 M', 13, MUTED, 'center', 700);
    // INFO : 에너지 전환 + 수치
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const bw2 = PHONE ? 132 : 148, bhh = PHONE ? 52 : 50, y0 = INFO.y + 14;
    const sx = INFO.x + 16, gapx = PHONE ? (INFO.w - 32 - 3 * bw2) / 2 : 40;
    const labs = [['화학 에너지', '산화·환원 반응'], ['전기 에너지', '전자의 흐름'], ['빛 · 열 에너지', '전구']];
    labs.forEach((l, i) => {
      const x = sx + i * (bw2 + gapx), act = flow;
      D.roundRect(x, y0, bw2, bhh, 12); ctx.fillStyle = i === 0 ? '#fef3c7' : i === 1 ? '#dbeafe' : '#fef9c3'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.stroke();
      T(x + bw2 / 2, y0 + 22, l[0], 14, INK, 'center', 800); T(x + bw2 / 2, y0 + 40, l[1], 12.5, MUTED, 'center', 700);
      if (i < 2) D.arrow(x + bw2 + 6, y0 + bhh / 2, x + bw2 + gapx - 6, y0 + bhh / 2, { color: act ? '#b45309' : '#cbd5e1', width: 3.4, head: 9 });
    });
    const tx = PHONE ? INFO.x + 16 : INFO.x + 16, ty = y0 + bhh + 26;
    textBlock(tx, ty, INFO.w - 32, '전자 ' + f2(n) + ' mol 이동 → Zn ' + f2(n / 2) + ' mol (' + f1(dZn(n)) + ' g) 감소 · Cu ' + f2(n / 2) + ' mol (' + f1(dCu(n)) + ' g) 증가', 14.5, INK, 20, 800);
    textBlock(tx, ty + (PHONE ? 46 : 24), INFO.w - 32, '전자는 (−)극 → (+)극으로, 전류는 (+)극 → (−)극으로 흘러요 (방향이 서로 반대).', 14, MUTED, 19, 700);
  }

  /* ============ ④ 전극 조합 ============ */
  const pkey = (a, b) => [a, b].sort().join('|');
  const pairV = (a, b) => Math.round(Math.abs(EZERO[a] - EZERO[b]) * 100) / 100;
  const negOf = (a, b) => (EZERO[a] < EZERO[b] ? a : b);
  const cbTestedN = () => Object.keys(S.cb.tested).length;
  function cbSet(side, m) { const c = S.cb; if (side === 'A') c.A = m; else c.B = m; c.pred = ''; c.run = 0; c.shown = null; updateCtl(); }
  function cbTest() {
    const c = S.cb; if (c.A === c.B || !c.pred) return;
    const key = pkey(c.A, c.B), neg = negOf(c.A, c.B), ok = c.pred === neg;
    c.run = 1; c.shown = key; c.tested[key] = { pred: c.pred, neg, ok, V: pairV(c.A, c.B) };
    Sound.click(); updateCtl();
  }
  function stepCombo(dt) {
    const c = S.cb, same = c.A === c.B;
    const tgt = c.run && !same ? pairV(c.A, c.B) : 0;
    c.V = ap(c.V, tgt, dt, 4); if (Math.abs(c.V - tgt) < 0.004) c.V = tgt;
    c.neg = !same && c.run ? (negOf(c.A, c.B) === c.A ? 'L' : 'R') : (c.neg || 'L');
  }
  function drawCombo(t) {
    const c = S.cb, same = c.A === c.B, mA = METAL[c.A], mB = METAL[c.B], tw = c.size === 'big' ? 1.75 : 1.0;
    T(14, 26, '🎯 금속판 두 개를 골라 전지를 만들어요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const lit = clamp(c.V / 1.56, 0, 1) * 0.9;
    const st = {
      L: { metal: c.A, plate: true, sol: true, thick: tw, cat: 6, an: 6, name: c.A + '판 · ' + mA.sol + ' 용액', name2: c.run ? (c.neg === 'L' ? '(−)극 · 산화' : '(+)극 · 환원') : '' },
      R: { metal: c.B, plate: true, sol: true, thick: tw, cat: 6, an: 6, name: c.B + '판 · ' + mB.sol + ' 용액', name2: c.run ? (c.neg === 'R' ? '(−)극 · 산화' : '(+)극 · 환원') : '' },
      bridge: 1, wire: 1, V: c.V, vmax: 1.6, lit: same ? 0 : lit, flow: same ? 0 : c.V / 1.56, imb: 0, neg: c.neg, signs: !!c.run && !same, showDir: !!c.run, bridgeOn: true, gaugeLabel: same ? '—' : c.V.toFixed(2) + ' V',
    };
    drawCell({ x: MAIN.x, y: MAIN.y, w: MAIN.w, h: MAIN.h }, st, t);
    // INFO : 결과 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '실험 결과 (표준 상태, 25 °C)', 15, WARN, 'left', 800);
    { const r0 = c.tested[pkey(c.A, c.B)]; const msg = same ? '서로 다른 금속을 골라야 전지가 돼요' : !c.run ? (c.pred ? '“조립해서 확인”을 눌러요' : '먼저 (−)극이 될 금속을 예측해요') : r0 ? (r0.ok ? '✅ 예측이 맞았어요! (−)극은 ' + r0.neg + '판' : '예측과 달랐어요. (−)극은 ' + r0.neg + '판') : '';
      T(INFO.x + INFO.w - 16, INFO.y + 26, msg, PHONE ? 13.5 : 14.5, same ? '#92400e' : c.run && r0 ? (r0.ok ? '#166534' : '#b91c1c') : MUTED, 'right', 800); }
    const pairs = [['Zn', 'Cu'], ['Cu', 'Ag'], ['Zn', 'Ag']];
    const rowH = PHONE ? 34 : 26, x0 = INFO.x + 16, bx = x0 + (PHONE ? 112 : 118), bw = INFO.w - (bx - INFO.x) - (PHONE ? 100 : 160);
    pairs.forEach((pr, i) => {
      const y = INFO.y + 46 + i * rowH, r = c.tested[pkey(pr[0], pr[1])], V = pairV(pr[0], pr[1]);
      T(x0, y + 15, pr[0] + ' – ' + pr[1] + ' 전지', 14, r ? INK : '#94a3b8', 'left', 800);
      D.roundRect(bx, y + 2, bw, rowH - 10, 6); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (r) { const w = Math.max(6, bw * V / 1.6); D.roundRect(bx, y + 2, w, rowH - 10, 6); ctx.fillStyle = '#8b5cf6'; ctx.fill(); }
      T(bx + bw + 8, y + 15, r ? V.toFixed(2) + ' V' : '?', 14, r ? INK : '#94a3b8', 'left', 800);
      if (!PHONE && r) T(bx + bw + 78, y + 15, '(−)극 ' + r.neg + (r.ok ? ' ✓' : ' ✗'), 13.5, r.ok ? '#166534' : '#b91c1c', 'left', 800);
    });
    if (cbTestedN() === 3) textBlock(x0, INFO.y + 46 + 3 * rowH + 14, INFO.w - 32, '전자를 내놓기 쉬운 순서 Zn > Cu > Ag. 두 금속이 멀수록 전압이 커요. 정확한 값은 다음 차시의 표준 환원 전위로 계산해요.', 13.5, '#5b21b6', 18, 800);
    else textBlock(x0, INFO.y + 46 + 3 * rowH + 14, INFO.w - 32, '세 가지 조합을 모두 예측하고 확인해 보세요 (' + cbTestedN() + ' / 3).', 13.5, MUTED, 18, 700);
  }

  function onLeave(m) { if (m === 'cell') S.cl.drag = null; }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'cell') {
        const i = cardAt(p); if (i < 0) return false;
        S.cl.drag = { i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; S.cl.lastI = i; Sound.click(); return true;
      }
      if (S.mode === 'analysis') {
        const P = anLay().mp; if (p.x >= P.x - 8 && p.x <= P.x + P.w + 8 && p.y >= P.y - 12 && p.y <= P.y + P.h + 12) { S.an.play = false; anSet(clamp((p.x - P.x) / P.w, 0, 1) * 0.4); syncAn(); return true; }
        return false;
      }
      if (S.mode === 'beaker' && S.sub.beaker === 'one') { if (!S.bk.go) bkGo(); return false; }
      return false;
    },
    move(p) {
      const d = S.cl.drag;
      if (d) { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; return; }
      if (S.mode === 'analysis') { const P = anLay().mp; anSet(clamp((p.x - P.x) / P.w, 0, 1) * 0.4); syncAn(); }
    },
    up(p) {
      const d = S.cl.drag; if (!d) return;
      S.cl.drag = null; const part = PARTS[d.i];
      if (!d.moved) { clPlace(part.id); return; }
      if (zonesAt(p).indexOf(part.zone) >= 0) clPlace(part.id);
      else { S.cl.shake = 0.35; Sound.fail && Sound.fail(); showHint(HINTS[part.zone], 3600); }
    },
    hover(p) {
      if (S.mode === 'cell') return cardAt(p) >= 0 ? 'grab' : 'default';
      if (S.mode === 'analysis') { const P = anLay().mp; return (p.x >= P.x - 8 && p.x <= P.x + P.w + 8 && p.y >= P.y - 12 && p.y <= P.y + P.h + 12) ? 'ew-resize' : 'default'; }
      return 'default';
    },
  });

  /* ---------- 조작 장치 ---------- */
  makeChips($('#bkSel'), [['one', '🔥 한 비커'], ['two', '🧩 둘로 나누면']], (v) => setBkSub(v));
  $('#bBkGo').addEventListener('click', bkGo); $('#bBkReset').addEventListener('click', () => { Sound.click(); bkReset(); });
  $('#bSepReplay').addEventListener('click', () => { Sound.click(); sepReset(); });
  bindNum($('#bkDT'), (v, ch) => {
    const e = $('#bkDT'), ok = !isNaN(v) && Math.abs(v - 10) <= 1.001 && S.bk.p >= 0.99; S.bk.dtVal = v;
    e.classList.toggle('ok', ok); if (ok) e.classList.remove('bad'); else if (ch && !isNaN(v)) e.classList.add('bad');
    if (ch && !isNaN(v) && S.bk.p < 0.99) showHint('반응이 끝난 뒤(온도가 더 오르지 않을 때)의 온도를 읽어요.', 3200);
    updateCtl();
  });
  $('#bBridge').addEventListener('click', () => { if (!clOn('bridge')) return; Sound.click(); S.cl.bridgeOn = !S.cl.bridgeOn; updateCtl(); });
  $('#bCellReset').addEventListener('click', () => { Sound.click(); clReset(); });
  function fillSel(id, opts, key, store) {
    const sel = $('#' + id); sel.innerHTML = '';
    opts.forEach(([v, lab]) => { const o = document.createElement('option'); o.value = v; o.textContent = lab; sel.appendChild(o); });
    sel.addEventListener('change', () => { store(sel.value); sel.classList.remove('ok', 'bad'); Sound.tick(); updateCtl(); });
  }
  const NEGPOS = [['', '선택하세요'], ['neg', '(−)극 · 산화 전극 (전자를 내놓음)'], ['pos', '(+)극 · 환원 전극 (전자를 받음)']];
  fillSel('selZn', NEGPOS, 'zn', (v) => { S.cl.sel.zn = v; });
  fillSel('selCu', NEGPOS, 'cu', (v) => { S.cl.sel.cu = v; });
  fillSel('selDir', [['', '선택하세요'], ['zc', 'Zn판 → 도선 → Cu판'], ['cz', 'Cu판 → 도선 → Zn판']], 'dir', (v) => { S.cl.sel.dir = v; });
  const EQ = [['', '선택하세요'], ['a', 'Zn → Zn²⁺ + 2e⁻'], ['b', 'Zn²⁺ + 2e⁻ → Zn'], ['c', 'Cu → Cu²⁺ + 2e⁻'], ['d', 'Cu²⁺ + 2e⁻ → Cu']];
  fillSel('selEq1', EQ, 'eq1', (v) => { S.an.eq.eq1 = v; });
  fillSel('selEq2', EQ, 'eq2', (v) => { S.an.eq.eq2 = v; });
  fillSel('selCur', [['', '선택하세요'], ['cz', '(+)극 Cu판 → 도선 → (−)극 Zn판'], ['zc', '(−)극 Zn판 → 도선 → (+)극 Cu판']], 'cur', (v) => { S.an.eq.cur = v; });
  const sN = $('#sN');
  sN.addEventListener('input', () => { if (+sN.value !== Math.round(S.an.n * 100)) { S.an.play = false; anSet(+sN.value / 100); } $('#oN').textContent = S.an.n.toFixed(2) + ' mol'; sN.style.setProperty('--pct', (+sN.value / 40 * 100) + '%'); });
  $('#nMinus').addEventListener('click', () => { Sound.tick(); S.an.play = false; anSet(S.an.n - 0.05); syncAn(); });
  $('#nPlus').addEventListener('click', () => { Sound.tick(); S.an.play = false; anSet(S.an.n + 0.05); syncAn(); });
  $('#bAnPlay').addEventListener('click', anTogglePlay); $('#bAnReset').addEventListener('click', () => { Sound.click(); anReset(); syncAn(); });
  bindNum($('#anPred'), (v, ch) => { S.an.pred = v; const e = $('#anPred'), ok = near(v, 6.5, 0.25); e.classList.toggle('ok', ok); if (ok) e.classList.remove('bad'); else if (ch && !isNaN(v)) e.classList.add('bad'); updateCtl(); });
  makeChips($('#cbA'), CBK2().map((m) => [m, m + '판']), (v) => cbSet('A', v));
  makeChips($('#cbB'), CBK2().map((m) => [m, m + '판']), (v) => cbSet('B', v));
  function CBK2() { return ['Zn', 'Cu', 'Ag']; }
  makeChips($('#cbSize'), [['small', '보통'], ['big', '크게']], (v) => { S.cb.size = v; if (S.cb.run) S.cb.sizeSeen = true; updateCtl(); });
  $('#bCbTest').addEventListener('click', cbTest);

  function uiExtra() {
    const b = S.bk, cl = S.cl, a = S.an, cb = S.cb;
    markChips($('#bkSel'), S.sub.beaker || 'one', { one: b.seen, two: S.bk.sep.imb > 0.9 });
    $('#bBkGo').disabled = b.go;
    const bridgeBtn = $('#bBridge'); bridgeBtn.disabled = !clOn('bridge'); bridgeBtn.textContent = cl.bridgeOn ? '🌉 염다리 빼기' : '🌉 염다리 꽂기';
    $('#cellNote').textContent = clPlaced() < 6 ? '부품 카드를 끌어서 비커와 회로 자리에 놓아요. 카드를 한 번 누르기만 해도 자동으로 놓여요.' : cl.seenDrop && cl.bridgeOn ? '전구가 켜졌어요. 염다리를 다시 꽂으면 전압이 회복돼요.' : '염다리를 뺐다가 꽂으면서 전압계와 전구를 살펴보세요.';
    $('#oN').textContent = a.n.toFixed(2) + ' mol';
    $('#nMinus').disabled = a.n <= 0; $('#nPlus').disabled = a.n >= 0.4;
    $('#bAnPlay').textContent = a.play ? '⏸ 멈추기' : '▶ 전류 흘리기'; $('#bAnPlay').classList.toggle('btn-primary', a.play);
    markChips($('#cbA'), cb.A, {}); markChips($('#cbB'), cb.B, {}); markChips($('#cbSize'), cb.size, {});
    const pr = $('#cbPred'); const same = cb.A === cb.B;
    pr.innerHTML = '';
    [cb.A, cb.B].forEach((m, i) => { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'chips-btn btn btn-sm' + (cb.pred === m && !same ? ' btn-primary' : ''); bt.textContent = (i ? '오른쪽 ' : '왼쪽 ') + m + '판'; bt.disabled = same; bt.addEventListener('click', () => { Sound.click(); cb.pred = m; cb.run = 0; updateCtl(); }); pr.appendChild(bt); });
    $('#bCbTest').disabled = same || !cb.pred;
  }
  // CSS용 보조: 예측 단추
  (function () { const st = document.createElement('style'); st.textContent = '.pred-row .btn { flex: 1; min-height: 44px; }'; document.head.appendChild(st); })();

  function readouts() {
    const m = S.mode;
    if (m === 'beaker' && S.sub.beaker === 'one') { setRead('용액의 온도', S.bk.T.toFixed(1) + ' °C', '온도 변화', (S.bk.T - 25).toFixed(1) + ' °C', 'Cu 석출', Math.round(S.bk.p * 100) + ' %'); }
    else if (m === 'beaker') { const s = S.bk.sep; setRead('전압계', s.V.toFixed(2) + ' V', '전구', s.lit > 0.5 ? '켜짐' : s.lit > 0.1 ? '희미함' : '꺼짐', '두 비커 사이', '끊겨 있어요'); }
    else if (m === 'cell') { const c = S.cl; setRead('조립한 부품', clPlaced() + ' / 6', '전압계', c.V.toFixed(2) + ' V', '염다리', clOn('bridge') ? (c.bridgeOn ? '꽂음' : '뺌') : '없음'); }
    else if (m === 'analysis') { const n = S.an.n; setRead('이동한 전자', f2(n) + ' mol', 'Zn판 질량', f1(mZn(n)) + ' g', 'Cu판 질량', f1(mCu(n)) + ' g'); }
    else { const c = S.cb, same = c.A === c.B; setRead('전지', same ? '—' : c.A + ' – ' + c.B, '전압', same || !c.run ? '—' : pairV(c.A, c.B).toFixed(2) + ' V', '확인한 조합', cbTestedN() + ' / 3'); }
  }

  /* ================= 미션 ================= */
  const selOk = () => S.cl.sel.zn === 'neg' && S.cl.sel.cu === 'pos' && S.cl.sel.dir === 'zc';
  const eqOk = () => S.an.eq.eq1 === 'a' && S.an.eq.eq2 === 'd' && S.an.eq.cur === 'cz';
  function markSel(ids, oks) { ids.forEach((id, i) => { const e = $('#' + id); if (e.value) { e.classList.toggle('ok', oks[i]); e.classList.toggle('bad', !oks[i]); } else e.classList.remove('ok', 'bad'); }); }
  const levels = [
    {
      title: '분리 반응: 열이 나는 한 비커', short: '분리 반응', icon: '🔥', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 산화·환원 반응인데 비커 안에서는 열이 나고, 전지에서는 전기가 나온다. 무엇이 다를까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 산화·환원 반응을 반쪽 반응식으로 나타냈어요. 통합과학에서는 전자가 이동하는 산화·환원 반응과 전기 에너지를 배웠어요. 전자의 이동을 이용하면 전기 에너지를 얻을 수 있을까요?</div>' +
        '<p>먼저 <b>Zn판을 CuSO₄ 용액에 담그면</b> 어떤 변화가 일어나고 에너지가 어디로 가는지 관찰해요. 이어서 전자가 지나갈 길을 도선으로 만들면 어떻게 되는지 살펴봐요.</p>',
      features: ['beaker'],
      setup() { bkReset(); S.sub.beaker = 'one'; setScene('beaker'); },
      recap: 'Zn판과 Cu²⁺가 한 비커 안에서 직접 만나면 전자가 표면에서 바로 이동해서 에너지가 열로 나가요. 전자가 도선을 지나가도록 둘을 나누면 전기 에너지로 이용할 수 있어요.',
      summary: '<ul><li>한 비커에서 Zn + Cu²⁺ → Zn²⁺ + Cu : Zn판 표면에 붉은 Cu가 석출되고 푸른색이 옅어지며 <b>온도가 올라요</b> (화학 에너지 → 열에너지).</li><li>전자는 Zn에서 Cu²⁺로 표면에서 <b>직접</b> 이동하므로 전기 에너지로 이용할 수 없어요.</li><li>Zn판과 Cu판을 서로 다른 비커에 넣고 <b>도선</b>으로 이으면 전자가 도선을 지나가요. 그런데 두 용액이 이어져 있지 않으면 전압이 곧 0이 돼요.</li></ul>',
      missions: [
        {
          title: '온도 변화 기록하기',
          goal: '<b>Zn판 담그기</b>를 눌러 반응이 끝날 때까지 지켜본 뒤, 용액의 온도가 처음(25.0 °C)보다 <b>몇 °C 올랐는지</b> 쓰세요.',
          hint: '온도계가 더 오르지 않으면 반응이 끝난 거예요. 마지막 온도에서 처음 온도 25.0 °C를 빼요. (모의 실험 값이에요)',
          setup() { bkReset(); S.sub.beaker = 'one'; setScene('beaker'); },
          check: () => S.bk.p >= 0.99 && near(S.bk.dtVal, 10, 1.001), hold: 0.6,
          status: () => '반응 ' + Math.round(S.bk.p * 100) + ' % ' + mark(S.bk.p >= 0.99) + ' &nbsp; 기록 ' + (isNaN(S.bk.dtVal) || S.bk.dtVal == null ? '—' : S.bk.dtVal + ' °C') + ' ' + mark(near(S.bk.dtVal, 10, 1.001) && S.bk.p >= 0.99),
          explain: 'Zn이 전자를 잃고 Cu²⁺가 전자를 얻는 산화·환원 반응이 한 비커 안에서 일어나, 전자가 Zn판 표면에서 <b>곧바로</b> 이동했어요. 이 반응은 에너지를 내놓는 반응이고, 그 에너지가 열이 되어 온도가 약 10 °C 올랐어요 (25.0 → 35.0 °C, 모의 값).',
        },
        {
          type: 'quiz', title: '전자가 지나갈 길',
          goal: 'Zn판과 Cu²⁺ 용액을 <b>서로 다른 비커</b>에 나누고 도선으로 연결하면 어떤 점이 달라질까요?',
          setup() { S.sub.beaker = 'two'; sepReset(); setScene('beaker'); },
          choices: ['전자가 도선을 지나가게 되어 전기 에너지로 이용할 수 있어요', '반응이 일어나지 않아서 에너지가 사라져요', '열이 더 많이 발생해요', '산화·환원 반응에서 전자가 필요 없어져요'],
          answer: 0,
          feedback: ['', '반응하는 물질의 에너지가 사라지는 것이 아니에요. 도선을 통해 다른 형태(전기 에너지)로 나올 수 있어요.', '열은 전자가 표면에서 직접 이동할 때 나와요. 도선으로 지나가면 전기 에너지로 쓸 수 있어요.', '산화·환원 반응은 언제나 전자의 이동으로 일어나요.'],
          explain: '두 반쪽 반응을 서로 다른 곳에서 일어나게 하면 전자는 <b>도선을 따라</b> 이동해야 해요. 이 전자의 흐름이 전류예요. 즉 화학 에너지를 전기 에너지로 바꿀 수 있어요. 다만 두 용액이 이어져 있지 않으면 전하가 쌓여 전압이 곧 0이 돼요.',
        },
      ],
    },
    {
      title: '전지 구성: 다니엘 전지 조립', short: '전지 구성', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자가 도선을 지나가게 하면 전기 에너지를 얻을 수 있다는 것을 알았지만, 두 비커 사이가 끊겨 있어서 전압이 곧 0이 되었어요.</div>' +
        '<p>부품 카드를 끌어서 <b>다니엘 전지</b>를 직접 조립해요. Zn판 · ZnSO₄ 용액, Cu판 · CuSO₄ 용액, 도선 · 전구 · 전압계, 그리고 두 용액을 잇는 <b>염다리</b>예요. 염다리를 뺐다 꽂으며 무슨 일이 일어나는지 살펴봐요.</div>',
      features: ['cell'],
      setup() { clReset(); setScene('cell'); },
      recap: '다니엘 전지에서 Zn판은 전자를 내놓는 (−)극(산화 전극), Cu판은 전자를 받는 (+)극(환원 전극)이고, 전자는 도선을 따라 (−)극 → (+)극으로 흘러요. 염다리는 이온이 이동해 두 용액의 전하 균형을 유지해 줘서 전지가 계속 작동해요.',
      summary: '<ul><li><b>다니엘 전지</b> : Zn(s) | Zn²⁺(aq) ‖ Cu²⁺(aq) | Cu(s) , 표준 상태에서 전압 <b>1.10 V</b></li><li><b>산화 전극((−)극)</b> Zn → Zn²⁺ + 2e⁻ , <b>환원 전극((+)극)</b> Cu²⁺ + 2e⁻ → Cu , 전체 Zn + Cu²⁺ → Zn²⁺ + Cu</li><li>전자는 도선을 따라 (−)극(Zn) → (+)극(Cu)으로 이동해요.</li><li><b>염다리</b> : 이온(음이온은 (−)극 쪽, 양이온은 (+)극 쪽)이 이동해 전하 균형을 유지해요. 염다리가 없으면 전압이 0 V로 떨어져요. 전자가 지나가는 길은 도선이에요.</li></ul>',
      missions: [
        {
          title: '다니엘 전지 조립하고 점등',
          goal: '부품 6개를 모두 조립해 <b>전구를 켜세요</b>. 그다음 <b>염다리를 한 번 빼서</b> 전압이 0 V로 떨어지는 것을 보고, 다시 꽂아 전압을 되찾으세요.',
          hint: 'Zn판 · ZnSO₄ 용액은 왼쪽 비커, Cu판 · CuSO₄ 용액은 오른쪽 비커예요. 염다리는 두 비커 사이를 잇고, 도선은 맨 위 회로 자리에 놓아요. 카드를 누르기만 해도 놓여요.',
          setup() { clReset(); setScene('cell'); },
          check: () => clPlaced() === 6 && S.cl.seenDrop && S.cl.lastOk, hold: 1.0,
          status: () => '부품 ' + clPlaced() + ' / 6 ' + mark(clPlaced() === 6) + ' &nbsp; 염다리 빼 보기 ' + mark(S.cl.seenDrop) + ' &nbsp; 점등 ' + mark(S.cl.lastOk),
          explain: '염다리가 없으면 반응이 진행될수록 (−)극 쪽 용액은 Zn²⁺가 늘어 (+) 전하가, (+)극 쪽 용액은 Cu²⁺가 줄어 (−) 전하가 쌓여 전자가 더 흐르지 못해요 (0 V). 염다리의 이온이 움직여 <b>전하 균형</b>을 맞추면 반응이 계속되어 1.10 V를 유지해요.',
        },
        {
          title: '산화 전극과 환원 전극 이름표', manual: true,
          goal: 'Zn판과 Cu판이 어떤 전극인지, 도선에서 전자가 어느 쪽으로 흐르는지 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'Zn은 Zn²⁺로 되며 전자를 내놓아요 (산화). 전자를 내놓는 쪽이 (−)극이고, 전자는 (−)극에서 (+)극으로 가요. 위 그림의 전자 알갱이 움직임을 보세요.',
          setup() { S.gate = 'lab'; S.cl.sel = { zn: '', cu: '', dir: '' }; ['selZn', 'selCu', 'selDir'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); if (clPlaced() < 6 || !S.cl.bridgeOn) { PARTS.forEach((p) => { if (!clOn(p.id)) clPlace(p.id); }); S.cl.bridgeOn = true; } setScene('cell'); updateCtl(); },
          check() {
            const s = S.cl.sel; markSel(['selZn', 'selCu', 'selDir'], [s.zn === 'neg', s.cu === 'pos', s.dir === 'zc']);
            if (!s.zn || !s.cu || !s.dir) return '세 칸을 모두 골라 주세요.';
            if (selOk()) return true;
            if (s.zn !== 'neg' || s.cu !== 'pos') return 'Zn판과 Cu판 중 어느 쪽이 전자를 내놓는지(산화) 다시 생각해 보세요. Zn → Zn²⁺ + 2e⁻ 예요.';
            return '전자는 전자를 내놓는 (−)극에서 받는 (+)극으로 흘러요. 그림에서 전자 알갱이가 움직이는 방향을 보세요.';
          },
          status: () => 'Zn판 ' + mark(S.cl.sel.zn === 'neg') + ' &nbsp; Cu판 ' + mark(S.cl.sel.cu === 'pos') + ' &nbsp; 방향 ' + mark(S.cl.sel.dir === 'zc'),
          explain: 'Zn판 : Zn → Zn²⁺ + 2e⁻ (산화) → <b>(−)극, 산화 전극</b>. Cu판 : Cu²⁺ + 2e⁻ → Cu (환원) → <b>(+)극, 환원 전극</b>. 전자는 도선을 따라 <b>Zn판 → Cu판</b>으로 이동해요.',
        },
        {
          type: 'quiz', title: '염다리의 역할',
          goal: '다니엘 전지에서 <b>염다리</b>가 하는 일로 알맞은 것은?',
          setup() { S.gate = ''; if (clPlaced() < 6 || !S.cl.bridgeOn) { PARTS.forEach((p) => { if (!clOn(p.id)) clPlace(p.id); }); S.cl.bridgeOn = true; } setScene('cell'); },
          choices: ['전자가 지나가는 길이에요', '이온이 이동해 두 용액의 전하 균형을 유지해요', '두 용액을 섞어 반응을 더 빠르게 해요', '전지의 전압을 2배로 높여 줘요'],
          answer: 1,
          feedback: ['전자는 염다리가 아니라 금속 도선을 지나가요. 염다리 속에서는 이온이 움직여요.', '', '두 용액이 섞이지 않게 하면서도 이온만 지나가게 해요. 반응을 빠르게 하는 장치가 아니에요.', '염다리를 꽂으면 전압이 유지될 뿐, 1.10 V보다 높아지지는 않아요.'],
          explain: '염다리 속 이온은 (−)극 쪽 용액에는 <b>음이온</b>, (+)극 쪽 용액에는 <b>양이온</b>이 이동해 전하가 쌓이지 않게 해요. 이렇게 <b>전하 균형</b>이 유지되어야 전자가 계속 도선을 흘러요.',
        },
      ],
    },
    {
      title: '변화 분석: 질량과 이온의 변화', short: '변화 분석', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 다니엘 전지의 (−)극에서는 Zn이 산화되고 (+)극에서는 Cu²⁺가 환원된다는 것을 알았어요. 그렇다면 전자가 이동할수록 두 극판과 두 용액은 얼마나 변할까요?</div>' +
        '<p>이동한 <b>전자의 양(mol)</b>을 바꾸면서 Zn판의 질량 감소, Cu판의 질량 증가, 이온 농도 변화를 입자 모형과 그래프로 살펴봐요. 전자 2 mol이 이동할 때마다 Zn 1 mol이 녹고 Cu 1 mol이 석출돼요.</p>',
      features: ['analysis'],
      setup() { anReset(); syncAn(); setScene('analysis'); },
      recap: '전자 2 mol이 이동할 때 (−)극에서 Zn 1 mol(65.4 g)이 Zn²⁺로 녹아 질량이 줄고, (+)극에서 Cu²⁺ 1 mol이 Cu(63.5 g)로 석출되어 질량이 늘어요. 용액에서는 Zn²⁺가 늘고 Cu²⁺가 줄어요. 화학 에너지가 전기 에너지로 바뀐 뒤 전구에서 빛과 열이 돼요.',
      summary: '<ul><li>(−)극 Zn → Zn²⁺ + 2e⁻ : Zn판 <b>질량 감소</b>, [Zn²⁺] 증가 / (+)극 Cu²⁺ + 2e⁻ → Cu : Cu판 <b>질량 증가</b>(Cu 석출), [Cu²⁺] 감소(푸른색이 옅어져요)</li><li>전자 <b>0.20 mol</b> 이동 → Zn <b>0.10 mol (6.5 g)</b> 감소, Cu <b>0.10 mol (6.4 g)</b> 증가</li><li>전자는 (−)극 → (+)극, 전류는 (+)극 → (−)극으로 흘러요. <b>방향이 서로 반대</b>예요.</li><li>에너지 전환 : <b>화학 에너지 → 전기 에너지 → 빛 · 열에너지</b></li></ul>',
      missions: [
        {
          title: '질량 변화 예측하고 확인하기',
          goal: '전자 <b>0.20 mol</b>이 이동하면 Zn판은 몇 g 줄어들까요? 먼저 값을 <b>예측해서 쓰고</b>, 이동한 전자의 양을 0.20 mol로 맞춰 확인하세요.',
          hint: 'Zn → Zn²⁺ + 2e⁻ 이므로 전자 2 mol당 Zn 1 mol(65.4 g)이 녹아요. 전자 0.20 mol이면 Zn은 몇 mol일까요? 그 질량은 몇 g일까요?',
          setup() { S.gate = 'pred'; anReset(); syncAn(); S.an.pred = NaN; S.an.vis = false; $('#anPred').value = ''; $('#anPred').classList.remove('ok', 'bad'); setScene('analysis'); updateCtl(); },
          check: () => near(S.an.pred, 6.5, 0.25) && Math.abs(S.an.n - 0.2) < 0.006, hold: 0.8,
          status: () => '예측 ' + (isNaN(S.an.pred) ? '—' : S.an.pred + ' g') + ' ' + mark(near(S.an.pred, 6.5, 0.25)) + ' &nbsp; 확인 ' + f2(S.an.n) + ' mol ' + mark(Math.abs(S.an.n - 0.2) < 0.006),
          explain: '전자 0.20 mol → Zn 0.10 mol → 0.10 mol × 65.4 g/mol ≈ <b>6.5 g</b> 감소. 같은 시간에 Cu²⁺ 0.10 mol이 Cu로 석출되어 Cu판은 0.10 mol × 63.5 g/mol ≈ <b>6.4 g</b> 늘어요.',
        },
        {
          title: '반쪽 반응식과 전류 방향', manual: true,
          goal: '(−)극과 (+)극에서 일어나는 <b>반쪽 반응식</b>과 도선에서 <b>전류의 방향</b>을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '(−)극 Zn판은 전자를 내놓아요 (산화). (+)극 Cu판은 전자를 받아요 (환원). 전류의 방향은 전자가 이동하는 방향과 반대예요.',
          setup() { S.gate = 'eq'; S.an.eq = { eq1: '', eq2: '', cur: '' }; ['selEq1', 'selEq2', 'selCur'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); setScene('analysis'); updateCtl(); },
          check() {
            const e = S.an.eq; markSel(['selEq1', 'selEq2', 'selCur'], [e.eq1 === 'a', e.eq2 === 'd', e.cur === 'cz']);
            if (!e.eq1 || !e.eq2 || !e.cur) return '세 칸을 모두 골라 주세요.';
            if (eqOk()) return true;
            if (e.eq1 !== 'a' || e.eq2 !== 'd') return '(−)극에서는 Zn이 전자를 내놓고, (+)극에서는 Cu²⁺가 전자를 받아요. e⁻가 화살표의 어느 쪽에 있어야 할까요?';
            return '전자는 (−)극 Zn판에서 (+)극 Cu판으로 가요. 전류는 그 반대 방향이에요.';
          },
          status: () => '(−)극 ' + mark(S.an.eq.eq1 === 'a') + ' &nbsp; (+)극 ' + mark(S.an.eq.eq2 === 'd') + ' &nbsp; 전류 ' + mark(S.an.eq.cur === 'cz'),
          explain: '(−)극 : <b>Zn → Zn²⁺ + 2e⁻</b> (산화), (+)극 : <b>Cu²⁺ + 2e⁻ → Cu</b> (환원). 전자는 Zn판 → Cu판으로 가고, 전류의 방향은 그 반대인 <b>Cu판 → Zn판</b>이에요.',
        },
        {
          type: 'quiz', title: 'Cu판의 질량이 늘어나는 까닭',
          goal: '전류가 흐르는 동안 <b>Cu판의 질량이 늘어나는</b> 까닭은?',
          setup() { S.gate = ''; setScene('analysis'); },
          choices: ['용액 속 Cu²⁺가 Cu판에서 전자를 받아 Cu로 석출되기 때문이에요', 'Cu판의 Cu 원자가 전자를 잃어 Cu²⁺가 되기 때문이에요', 'Zn판의 Zn이 Cu판으로 옮겨 붙기 때문이에요', '염다리의 이온이 Cu판에 달라붙기 때문이에요'],
          answer: 0,
          feedback: ['', 'Cu판에서는 Cu²⁺가 전자를 받는 환원이 일어나요. Cu가 전자를 잃는 반응이 아니에요.', 'Zn²⁺는 용액 속으로 녹아 나와요. Cu판에는 Cu²⁺가 환원된 Cu가 붙어요.', '염다리의 이온은 전하 균형을 유지할 뿐 극판에 붙지 않아요.'],
          explain: '(+)극에서 Cu²⁺ + 2e⁻ → Cu 반응이 일어나요. 도선을 따라 온 전자를 Cu²⁺가 받아 <b>고체 Cu로 석출</b>되어 Cu판의 질량이 늘고, 용액의 푸른색(Cu²⁺)은 옅어져요.',
        },
      ],
    },
    {
      title: '전극 조합: (−)극은 어느 쪽?', short: '전극 조합', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 다니엘 전지의 (−)극은 전자를 내놓는 Zn판이었어요. 금속판을 바꾸면 어느 쪽이 (−)극이 될까요? 전압은 얼마나 달라질까요?</div>' +
        '<p>Zn · Cu · Ag 금속판과 각각의 이온 용액 중 <b>두 개</b>를 골라 전지를 만들어요. 먼저 <b>(−)극이 될 금속을 예측</b>하고, 조립해서 전압을 확인해요. 세 조합을 비교하면 규칙을 발견할 수 있어요.</p>',
      features: ['combo'],
      setup() { S.cb.tested = {}; S.cb.run = 0; S.cb.pred = ''; S.cb.A = 'Zn'; S.cb.B = 'Cu'; S.cb.V = 0; S.cb.size = 'small'; S.cb.sizeSeen = false; setScene('combo'); updateCtl(); },
      recap: '전자를 내놓기 쉬운 금속(Zn > Cu > Ag)이 (−)극이 돼요. 고른 두 금속이 멀수록 전압이 커서 Zn–Ag(1.56 V) > Zn–Cu(1.10 V) > Cu–Ag(0.46 V)예요. 전압은 전극 물질의 조합이 정하고 판의 크기와는 무관해요.',
      summary: '<ul><li>전자를 내놓기 쉬운 금속이 <b>(−)극</b>(산화), 받는 쪽이 (+)극(환원) : <b>Zn &gt; Cu &gt; Ag</b> 순서</li><li>Zn–Cu <b>1.10 V</b> ((−)극 Zn) · Cu–Ag <b>0.46 V</b> ((−)극 Cu) · Zn–Ag <b>1.56 V</b> ((−)극 Zn) — 표준 상태</li><li>Cu–Ag 전지 : Cu → Cu²⁺ + 2e⁻ (산화), 2Ag⁺ + 2e⁻ → 2Ag (환원)</li><li>전압은 <b>전극 물질의 조합</b>이 정하고, 판의 크기와는 관계가 없어요. 이 값을 계산하려면 다음 차시의 <b>표준 환원 전위</b>가 필요해요.</li></ul>',
      missions: [
        {
          title: '세 조합 예측하고 확인하기',
          goal: '<b>Zn–Cu, Cu–Ag, Zn–Ag</b> 세 전지에서 각각 <b>(−)극이 될 금속을 예측</b>한 뒤 “조립해서 확인”을 눌러 전압을 확인하세요.',
          hint: '왼쪽 · 오른쪽 금속판을 고르고, (−)극이 될 금속을 눌러 예측해요. 전자를 내놓기 쉬운 쪽이 (−)극이에요. 세 조합을 모두 확인해요.',
          setup() { S.cb.tested = {}; S.cb.run = 0; S.cb.pred = ''; S.cb.A = 'Zn'; S.cb.B = 'Cu'; S.cb.V = 0; setScene('combo'); updateCtl(); },
          check: () => cbTestedN() === 3, hold: 0.5,
          status: () => [['Zn', 'Cu'], ['Cu', 'Ag'], ['Zn', 'Ag']].map((q) => q[0] + '–' + q[1] + ' ' + mark(!!S.cb.tested[pkey(q[0], q[1])])).join(' &nbsp; '),
          explain: 'Zn–Cu : (−)극 Zn, 1.10 V / Cu–Ag : (−)극 Cu, 0.46 V / Zn–Ag : (−)극 Zn, 1.56 V. 두 금속 중 전자를 내놓기 쉬운 쪽이 항상 (−)극이고, 전자를 내놓기 쉬운 정도의 차이가 클수록 전압이 커요.',
        },
        {
          type: 'quiz', title: 'Cu–Ag 전지에서 산화되는 쪽',
          goal: 'Cu–Ag 전지(0.46 V)에서 <b>산화</b>가 일어나는 극은 어디일까요?',
          setup() { setScene('combo'); },
          choices: ['Ag판 : Ag가 Ag⁺로 되며 전자를 내놓아요', 'Cu판 : Cu가 Cu²⁺로 되며 전자를 내놓아요', '두 판 모두에서 산화가 일어나요', '어느 쪽에서도 산화는 일어나지 않아요'],
          answer: 1,
          feedback: ['Ag는 Cu보다 전자를 내놓기 어려워요. Ag⁺가 전자를 받아 Ag로 석출돼요 (환원).', '', '한 전지에서 산화는 (−)극에서만, 환원은 (+)극에서만 일어나요.', '전지가 작동하려면 산화와 환원이 모두 일어나야 해요.'],
          explain: 'Cu가 Ag보다 전자를 내놓기 쉬우므로 Cu판이 <b>(−)극(산화 전극)</b>이에요. Cu → Cu²⁺ + 2e⁻ , 그리고 (+)극에서 Ag⁺ + e⁻ → Ag (환원)이 일어나요.',
        },
        {
          type: 'quiz', title: '판의 크기와 전압',
          goal: '“판의 크기” 단추로 Zn–Ag 전지의 판 크기를 바꿔 보세요. Zn판과 Ag판을 두 배 크게 하면 <b>전압</b>은 어떻게 될까요?',
          setup() { S.cb.A = 'Zn'; S.cb.B = 'Ag'; S.cb.pred = 'Zn'; S.cb.size = 'small'; cbTest(); setScene('combo'); updateCtl(); },
          choices: ['달라지지 않아요. 전압은 전극 물질의 조합이 정해요 (1.56 V)', '두 배로 커져요', '절반으로 줄어요', '0 V가 돼요'],
          answer: 0,
          feedback: ['', '판이 커져도 전압계 눈금은 그대로예요. 판을 키우면 사용할 수 있는 물질의 양이 늘 뿐이에요.', '판이 커진다고 전압이 줄지는 않아요. 직접 크기를 바꿔 전압계를 확인해 보세요.', '전지가 만들어진 상태에서 판 크기만으로 전압이 0이 되지는 않아요.'],
          explain: '전지의 전압은 <b>전극 물질의 조합</b>(전자를 내놓기 쉬운 정도의 차이)이 정해요. 판이 커지면 반응할 수 있는 물질의 양이 늘어 오래 쓸 수 있을 뿐, 전압은 그대로 1.56 V예요. 다음 차시에서는 이 전압을 표준 환원 전위로 계산해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-galvanic-cell', mount: '#game', badge: '전지 박사', homeHref: '../../index.html#hr',
    featureLabels: { beaker: '🔥 한 비커 반응 · 입자 모형', cell: '🧩 다니엘 전지 부품 조립 · 염다리', analysis: '📊 전자 이동량 슬라이더 · 질량 · 농도 그래프', combo: '🎯 Zn · Cu · Ag 전극 조합' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  bkReset(); clReset(); anReset();
  setScene('beaker');
  function stepAll1(dt) { stepBeaker(dt); stepCell(dt); stepAnalysis(dt); stepCombo(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'beaker') drawBeaker(t); else if (S.mode === 'cell') drawCellScene(t); else if (S.mode === 'analysis') drawAnalysis(t); else drawCombo(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, PARTS, cellGeo, clG, trayG, zonesAt, clPlace, clPlaced, clOn, clReset, bkGo, bkReset, setBkSub, sepReset, anSet, anReset, anLay, cbSet, cbTest, cbTestedN, pairV, mZn, mCu, cZn, cCu, f1, f2,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
