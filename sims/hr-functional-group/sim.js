/* 작용기와 탄소 화합물 - 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 */
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
  const GC = { OH: '#2563eb', CHO: '#ea580c', COOH: '#dc2626' };
  const GNAME = { OH: '–OH (알코올)', CHO: '–CHO (알데하이드)', COOH: '–COOH (카복실산)' };
  const GKIND = { OH: '알코올', CHO: '알데하이드', COOH: '카복실산' };

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
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;
  const r2d = (x) => Math.round(x * 100 + 1e-9) / 100;
  const oxs = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + (-n) : '0');
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subs = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const lerp = (a, b, t) => a + (b - a) * t;
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
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (typeof onLeave === 'function') onLeave(S.mode); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb && typeof MODE_LABEL !== 'undefined') tb.textContent = MODE_LABEL[mode];
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
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 14, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad });
    ctx.restore(); return rc;
  }
  function bindNum(inp, onSet) {
    inp.addEventListener('input', () => onSet(parseNum(inp.value), false));
    inp.addEventListener('change', () => onSet(parseNum(inp.value), true));
  }
  function mkStep(host, label, min, max, get, set, o) {
    o = o || {};
    const cell = document.createElement('div'); cell.className = o.row ? 'stp-row' : 'stp-cell';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = label;
    const stp = document.createElement('div'); stp.className = 'stp';
    const mk = (txt, d, al) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'nudge'; b.textContent = txt; b.setAttribute('aria-label', al); b.addEventListener('click', () => { const v = clamp(get() + d, min, max); if (v !== get()) { Sound.tick(); set(v); } }); return b; };
    const minus = mk('−', -1, '줄이기'), plus = mk('+', 1, '늘리기'), out = document.createElement('output');
    stp.append(minus, out, plus); cell.append(lab, stp); host.appendChild(cell);
    const r = { cell, out, minus, plus, refresh() { out.textContent = o.fmt ? o.fmt(get()) : String(get()); minus.disabled = r.off || get() <= min; plus.disabled = r.off || get() >= max; }, off: false };
    r.refresh(); return r;
  }
  function mkSelect(host, label, opts, onChange) {
    const row = document.createElement('div'); row.className = 'sel-row';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = label;
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', label.replace(/<[^>]+>/g, ''));
    opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
    sel.addEventListener('change', () => { Sound.click(); onChange(sel.value); });
    row.append(lab, sel); host.appendChild(row);
    return { row, sel, lab };
  }

  /* ---------- 원자 · 분자 모형 ---------- */
  const ELC = { H: '#f8fafc', C: '#475569', O: '#ef4444', N: '#3b82f6', Ag: '#cbd5e1', Cr: '#14b8a6' };
  const ER = { C: 0.3, O: 0.29, H: 0.215, N: 0.29 };
  function atomBall(x, y, r, el, o) {
    o = o || {};
    const c = o.color || ELC[el] || '#94a3b8', dark = el === 'H' || el === 'Ag';
    D.sphere(x, y, r, c, { text: o.text === undefined ? el : o.text, textColor: dark ? '#334155' : '#fff', textScale: o.ts || (el.length > 1 ? 0.95 : 1.1), outline: dark ? '#94a3b8' : null, outlineWidth: 1.2, gloss: r > 8, shadow: !!o.shadow });
  }
  function eBall(x, y, r) { D.sphere(x, y, r, '#fbbf24', { text: 'e⁻', textColor: '#6b3f00', textScale: 0.95, outline: '#b7791f', outlineWidth: 1, gloss: r > 7 }); }
  const MOLS = {
    ethane: { n: 2, g: 'none', name: '에테인', cond: 'CH₃CH₃', bp: -89 },
    methanol: { n: 1, g: 'OH', name: '메탄올', cond: 'CH₃OH', bp: 65 },
    ethanol: { n: 2, g: 'OH', name: '에탄올', cond: 'CH₃CH₂OH', alt: 'C₂H₅OH', bp: 78 },
    propanol: { n: 3, g: 'OH', name: '1-프로판올', cond: 'CH₃CH₂CH₂OH', bp: 97 },
    formaldehyde: { n: 1, g: 'CHO', name: '폼알데하이드', cond: 'HCHO', bp: -19 },
    acetaldehyde: { n: 2, g: 'CHO', name: '아세트알데하이드', cond: 'CH₃CHO', bp: 20 },
    propanal: { n: 3, g: 'CHO', name: '프로판알', cond: 'CH₃CH₂CHO', bp: 48 },
    formic: { n: 1, g: 'COOH', name: '폼산', cond: 'HCOOH', bp: 101 },
    acetic: { n: 2, g: 'COOH', name: '아세트산', cond: 'CH₃COOH', bp: 118 },
    propanoic: { n: 3, g: 'COOH', name: '프로판산', cond: 'CH₃CH₂COOH', bp: 141 },
  };
  /* 사슬 모양 분자 구조: 탄소 n개 + 끝 탄소의 작용기(g) */
  function buildMol(n, g) {
    const atoms = [], bonds = [];
    const A = (id, el, x, y) => atoms.push({ id, el, x, y });
    const B = (a, b, o) => bonds.push({ a, b, o: o || 1 });
    for (let i = 0; i < n; i++) A('C' + i, 'C', i, 0);
    for (let i = 0; i < n - 1; i++) B('C' + i, 'C' + (i + 1));
    A('H0L', 'H', -1, 0); B('C0', 'H0L');
    const f = n - 1;
    for (let i = 0; i < f; i++) { A('H' + i + 'U', 'H', i, -1); B('C' + i, 'H' + i + 'U'); A('H' + i + 'D', 'H', i, 1); B('C' + i, 'H' + i + 'D'); }
    const cf = 'C' + f;
    let gids = [];
    if (g === 'none') {
      A('H' + f + 'U', 'H', f, -1); B(cf, 'H' + f + 'U'); A('H' + f + 'D', 'H', f, 1); B(cf, 'H' + f + 'D'); A('H' + f + 'R', 'H', f + 1, 0); B(cf, 'H' + f + 'R');
    } else if (g === 'OH') {
      A('H' + f + 'U', 'H', f, -1); B(cf, 'H' + f + 'U'); A('H' + f + 'D', 'H', f, 1); B(cf, 'H' + f + 'D');
      A('O1', 'O', f + 1, 0); B(cf, 'O1'); A('HO1', 'H', f + 1.58, 0.62); B('O1', 'HO1');
      gids = ['O1', 'HO1'];
    } else if (g === 'CHO') {
      A('O1', 'O', f, -1); B(cf, 'O1', 2); A('H' + f + 'D', 'H', f, 1); B(cf, 'H' + f + 'D');
      gids = [cf, 'O1', 'H' + f + 'D'];
    } else if (g === 'COOH') {
      A('O1', 'O', f, -1); B(cf, 'O1', 2); A('Oa1', 'O', f + 1, 0); B(cf, 'Oa1'); A('HOa1', 'H', f + 1.58, 0.62); B('Oa1', 'HOa1');
      gids = [cf, 'O1', 'Oa1', 'HOa1'];
    }
    return { n, g, atoms, bonds, gids };
  }
  function molFormula(spec) {
    const c = { C: 0, H: 0, O: 0 };
    spec.atoms.forEach((a) => { c[a.el]++; });
    return { C: c.C, H: c.H, O: c.O, text: 'C' + (c.C > 1 ? subs(c.C) : '') + 'H' + (c.H > 1 ? subs(c.H) : '') + (c.O ? 'O' + (c.O > 1 ? subs(c.O) : '') : '') };
  }
  const molSpec = (key) => buildMol(MOLS[key].n, MOLS[key].g);
  const specExtent = (spec) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    spec.atoms.forEach((a) => { x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x); y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y); });
    return { x0, x1, y0, y1, w: x1 - x0 + 0.9, h: y1 - y0 + 0.9, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  /* 움직이는 분자 모형: 같은 id의 원자는 새 자리로 이동, 없어지는 원자는 날아가며 사라지고, 새 원자는 나타나요 */
  class MolView {
    constructor() { this.atoms = {}; this.bonds = {}; this.spec = null; this.cx = 0; this.cy = 0; this.gk = 0; this.gkey = null; this.gids = []; }
    set(spec, instant, extSpec) {
      const first = !this.spec; this.spec = spec;
      const ex = specExtent(extSpec || spec);
      const ids = {};
      spec.atoms.forEach((a) => {
        ids[a.id] = true;
        let o = this.atoms[a.id];
        if (!o) {
          const outx = a.x - ex.cx, outy = a.y - ex.cy, L = Math.hypot(outx, outy) || 1;
          o = this.atoms[a.id] = { id: a.id, el: a.el, x: instant || first ? a.x : a.x + outx / L * 1.2, y: instant || first ? a.y : a.y + outy / L * 1.2, tx: a.x, ty: a.y, al: instant || first ? 1 : 0, ta: 1, sc: instant || first ? 1 : 0.3, ts: 1 };
        }
        o.tx = a.x; o.ty = a.y; o.ta = 1; o.ts = 1; o.el = a.el; o.leaving = false;
        if (instant) { o.x = a.x; o.y = a.y; o.al = 1; o.sc = 1; }
      });
      Object.keys(this.atoms).forEach((id) => {
        if (ids[id]) return;
        const o = this.atoms[id];
        if (!o.leaving) {
          const outx = o.x - ex.cx, outy = o.y - ex.cy, L = Math.hypot(outx, outy) || 1;
          o.leaving = true; o.tx = o.x + outx / L * 2.2; o.ty = o.y + outy / L * 2.2 - 0.4; o.ta = 0; o.ts = 0.6;
          if (instant) delete this.atoms[id];
        }
      });
      const bk = {};
      spec.bonds.forEach((b) => {
        const k = b.a + '-' + b.b; bk[k] = true;
        let o = this.bonds[k];
        if (!o) o = this.bonds[k] = { a: b.a, b: b.b, oc: b.o, o: b.o, al: instant || first ? 1 : 0, ta: 1 };
        o.o = b.o; o.ta = 1;
        if (instant) { o.oc = b.o; o.al = 1; }
      });
      Object.keys(this.bonds).forEach((k) => { if (!bk[k]) { this.bonds[k].ta = 0; if (instant) delete this.bonds[k]; } });
      this.gkey = spec.g === 'none' ? null : spec.g; this.gids = spec.gids;
      if (first || instant) { this.cx = ex.cx; this.cy = ex.cy; }
      this.ex = ex;
    }
    update(dt) {
      const ex = this.ex; if (!ex) return;
      this.cx = ap(this.cx, ex.cx, dt, 6); this.cy = ap(this.cy, ex.cy, dt, 6);
      Object.keys(this.atoms).forEach((id) => {
        const o = this.atoms[id];
        const rate = RM ? 60 : 7;
        o.x = ap(o.x, o.tx, dt, rate); o.y = ap(o.y, o.ty, dt, rate);
        o.al = ap(o.al, o.ta, dt, o.leaving ? 4.5 : 6); o.sc = ap(o.sc, o.ts, dt, 8);
        if (o.leaving && o.al < 0.02) delete this.atoms[id];
      });
      Object.keys(this.bonds).forEach((k) => {
        const b = this.bonds[k];
        b.al = ap(b.al, b.ta, dt, 8); b.oc = ap(b.oc, b.o, dt, 6);
        if (b.ta === 0 && b.al < 0.02) delete this.bonds[k];
      });
      this.gk = ap(this.gk, this.gkey ? 1 : 0, dt, 6);
    }
    get busy() { return Object.keys(this.atoms).some((id) => { const o = this.atoms[id]; return Math.abs(o.x - o.tx) > 0.02 || Math.abs(o.y - o.ty) > 0.02 || Math.abs(o.al - o.ta) > 0.03; }); }
    /* s: 단위 길이(px) */
    draw(px, py, s, o) {
      o = o || {};
      const X = (u) => px + (u - this.cx) * s, Y = (u) => py + (u - this.cy) * s;
      const hlOn = o.hl !== false && this.gkey;
      if (hlOn && this.gids.length) {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        this.gids.forEach((id) => { const a = this.atoms[id]; if (!a) return; const r = ER[a.el] || 0.25; x0 = Math.min(x0, a.x - r); x1 = Math.max(x1, a.x + r); y0 = Math.min(y0, a.y - r); y1 = Math.max(y1, a.y + r); });
        if (x1 > x0) {
          const pad = 0.2, col = GC[this.gkey] || '#8b5cf6', al = this.gk * (o.hlAlpha == null ? 1 : o.hlAlpha);
          ctx.save(); ctx.globalAlpha = al;
          D.roundRect(X(x0 - pad), Y(y0 - pad), (x1 - x0 + pad * 2) * s, (y1 - y0 + pad * 2) * s, 0.42 * s);
          ctx.fillStyle = C.rgba(col, 0.16); ctx.fill(); ctx.strokeStyle = C.rgba(col, 0.85); ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
          ctx.restore();
          if (o.hlLabel) pill(X((x0 + x1) / 2), Y(y0 - pad) - 16, o.hlLabel === true ? GNAME[this.gkey] : o.hlLabel, { bg: col, color: '#fff', border: null, size: 13.5, alpha: al });
        }
      }
      Object.keys(this.bonds).forEach((k) => {
        const b = this.bonds[k], a1 = this.atoms[b.a], a2 = this.atoms[b.b];
        if (!a1 || !a2) return;
        const al = Math.min(b.al, a1.al, a2.al); if (al < 0.02) return;
        const x1 = X(a1.x), y1 = Y(a1.y), x2 = X(a2.x), y2 = Y(a2.y), L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
        const second = clamp(b.oc - 1, 0, 1), off = s * 0.075 * (0.4 + 0.6 * second);
        ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = Math.max(3, s * 0.085);
        const w1 = (1 - second * 0.5);
        ctx.lineWidth = Math.max(2.4, s * 0.085 * (0.7 + 0.3 * w1));
        ctx.beginPath(); ctx.moveTo(x1 + nx * off * second, y1 + ny * off * second); ctx.lineTo(x2 + nx * off * second, y2 + ny * off * second); ctx.stroke();
        if (second > 0.03) { ctx.globalAlpha = al * second; ctx.beginPath(); ctx.moveTo(x1 - nx * off, y1 - ny * off); ctx.lineTo(x2 - nx * off, y2 - ny * off); ctx.stroke(); }
        ctx.restore();
      });
      const list = Object.keys(this.atoms).map((id) => this.atoms[id]).sort((p, q) => (p.el === 'H') - (q.el === 'H'));
      list.forEach((a) => {
        if (a.al < 0.02) return;
        const r = (ER[a.el] || 0.25) * s * a.sc;
        ctx.save(); ctx.globalAlpha = clamp(a.al, 0, 1);
        const hi = o.mark && o.mark[a.id];
        if (hi) D.glow(X(a.x), Y(a.y), r * 2.2, hi, 0.55);
        atomBall(X(a.x), Y(a.y), r, a.el, { shadow: r > 8 });
        ctx.restore();
      });
    }
  }

  /* ===== 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 - 작용기와 탄소 화합물 [12반응03-01]
     ① 관찰: 일상의 화합물 · 작용기 블록  ② 모형: 분자 조립 · 분자식  ③ 실험: 성질 탐구 (용해 · pH · NaHCO₃ · 끓는점)
     ④ 적용: 작용기에 따라 분류하기.  작용기는 알코올(–OH) · 알데하이드(–CHO) · 카복실산(–COOH) 세 가지만 다루고,
     IUPAC 명명법 · 이성질체 · 케톤/에터/에스터/아민은 다루지 않아요. ===== */
  const MODE_LABEL = { blocks: '🧩 작용기 블록 끼우기', build: '🧪 분자 모형 조립', lab: '🧫 성질 탐구', sort: '🗂 작용기로 분류', find: '🔎 작용기 찾기' };
  const mv1 = new MolView();
  const SPEC = {}; Object.keys(MOLS).forEach((k) => { SPEC[k] = molSpec(k); });
  const FOR = {}; Object.keys(MOLS).forEach((k) => { FOR[k] = molFormula(SPEC[k]); });
  const MOLOF = { OH: 'ethanol', CHO: 'acetaldehyde', COOH: 'acetic' };
  const subBp = (v) => (v < 0 ? MINUS + (-v) : String(v));

  /* ============ ① 작용기 블록 ============ */
  const B = { key: 'ethane', made: { OH: false, CHO: false, COOH: false }, drag: null, blocks: [], msg: '', pulse: 0 };
  ['OH', 'CHO', 'COOH'].forEach((g, i) => B.blocks.push({ g, x: 0, y: 0, lift: 0, home: true }));
  mv1.set(SPEC.ethane, true);
  const bGeo = () => PHONE
    ? { stage: { x: 8, y: 52, w: 464, h: 250 }, tray: { x: 8, y: 310, w: 464, h: 166 }, home: (i) => ({ x: 17 + i * 152, y: 362, w: 142, h: 96 }) }
    : { stage: { x: 12, y: 52, w: 500, h: 342 }, tray: { x: 524, y: 52, w: 264, h: 342 }, home: (i) => ({ x: 544, y: 128 + i * 88, w: 224, h: 74 }) };
  function bInit() { const G = bGeo(); B.blocks.forEach((b, i) => { const h = G.home(i); b.x = h.x; b.y = h.y; b.w = h.w; b.h = h.h; }); }
  bInit();
  const GROUPTXT = { OH: ['–OH', '알코올'], CHO: ['–CHO', '알데하이드'], COOH: ['–COOH', '카복실산'] };
  const bMsg = {
    ethane: '에테인 C₂H₆ : 작용기가 없는 탄소 골격이에요.',
    ethanol: '끝 탄소의 H 1개가 떨어지고 –OH가 붙었어요.',
    acetaldehyde: '끝 탄소의 H 2개가 떨어지고 =O가 붙어 –CHO가 됐어요.',
    acetic: '끝 탄소의 H 3개가 떨어지고 =O와 –OH가 붙어 –COOH가 됐어요.',
  };
  function bApply(g) {
    const key = MOLOF[g];
    if (!g) return;
    B.made[g] = true;
    if (B.key !== key) {
      B.key = key; mv1.set(SPEC[key], false);
      const G = bGeo(), cx = G.stage.x + G.stage.w / 2, cy = G.stage.y + G.stage.h / 2;
      flash(cx, cy, [GC[g], '#fbbf24', '#ffffff']); Sound.success();
    }
    updateCtl();
  }
  function bReset() { B.key = 'ethane'; mv1.set(SPEC.ethane, false); updateCtl(); }
  function bFinish() { return B.made.OH && B.made.CHO && B.made.COOH; }
  const DAILY = [
    { ico: '🧴', name: '손 소독제', comp: '에탄올', f: 'C₂H₅OH', g: 'OH', key: 'ethanol' },
    { ico: '🍶', name: '식초', comp: '아세트산', f: 'CH₃COOH', g: 'COOH', key: 'acetic' },
    { ico: '🧪', name: '포르말린', comp: '폼알데하이드', f: 'HCHO', g: 'CHO', key: 'formaldehyde' },
    { ico: '🐜', name: '개미 독', comp: '폼산', f: 'HCOOH', g: 'COOH', key: 'formic' },
  ];
  function drawDaily(R, t) {
    T(R.x + 16, R.y + 24, '일상 속 탄소 화합물과 작용기', 14.5, WARN, 'left', 800);
    const cols = PHONE ? 2 : 4, gap = 10, cw = (R.w - 32 - gap * (cols - 1)) / cols, ch = PHONE ? 104 : 92;
    DAILY.forEach((d, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = R.x + 16 + c * (cw + gap), y = R.y + 36 + r * (ch + 8);
      const live = S.mode === 'blocks' && B.key === d.key;
      const col = GC[d.g];
      D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = live ? C.rgba(col, 0.12) : '#f8fafc'; ctx.fill(); ctx.strokeStyle = live ? col : '#cbd5e1'; ctx.lineWidth = live ? 3 : 1.6; ctx.stroke();
      T(x + 12, y + 32, d.ico, 24, INK, 'left', 700);
      T(x + 46, y + 24, d.name, 14.5, INK, 'left', 800);
      T(x + 46, y + 44, d.comp, 13.5, MUTED, 'left', 700);
      T(x + 12, y + 70, d.f, 15, INK, 'left', 800);
      D.label(x + cw - 10, y + ch - 20, GROUPTXT[d.g][0], { bg: col, color: '#fff', size: 13.5, align: 'right' });
      if (live) D.check(x + cw - 16, y + 14, 9, 1);
    });
  }
  function drawBlocks(t) {
    const G = bGeo(), st = G.stage;
    T(14, 26, '🧩 에테인의 끝 탄소에 작용기 블록을 끼워 보세요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(st.x, st.y, st.w, st.h, 14);
    const cx = st.x + st.w / 2, cy = st.y + st.h / 2 + (PHONE ? 4 : 2), sc = PHONE ? 50 : 60;
    const m = MOLS[B.key], f = FOR[B.key];
    if (B.drag) {
      D.roundRect(st.x + 6, st.y + 6, st.w - 12, st.h - 12, 12); ctx.setLineDash([9, 7]); ctx.strokeStyle = C.rgba(GC[B.drag.b.g], 0.55 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
    }
    D.label(cx, st.y + 26, m.name + (m.alt ? ' (' + m.alt + ')' : ''), { bg: m.g === 'none' ? '#64748b' : GC[m.g], color: '#fff', size: 15.5 });
    mv1.draw(cx, cy, sc, { hlLabel: false });
    T(cx, st.y + st.h - 38, '분자식 ' + f.text + '   ·   시성식 ' + m.cond, PHONE ? 14 : 15.5, INK, 'center', 800);
    textBlock(st.x + 16, st.y + st.h - 14, st.w - 32, bMsg[B.key], 13.5, MUTED, 17, 700, 'left');
    // 만든 작용기 표시
    ['OH', 'CHO', 'COOH'].forEach((g, i) => {
      const hw = PHONE ? 29 : 33, x = st.x + st.w - 12 - hw - (2 - i) * (hw * 2 + 4), y = st.y + 56;
      D.roundRect(x - hw, y - 14, hw * 2, 28, 14); ctx.fillStyle = B.made[g] ? GC[g] : '#e2e8f0'; ctx.fill();
      T(x, y + 5, (B.made[g] ? '✓ ' : '') + GROUPTXT[g][0], 13.5, B.made[g] ? '#fff' : '#64748b', 'center', 800);
    });
    // 트레이
    const tr = G.tray;
    panel(tr.x, tr.y, tr.w, tr.h, 14, '#faf8ff');
    T(tr.x + 16, tr.y + 26, '작용기 블록', 15, WARN, 'left', 800);
    textBlock(tr.x + 16, tr.y + 46, tr.w - 32, PHONE ? '블록을 끌어 위의 분자에 놓거나 눌러요.' : '블록을 끌어다 분자에 놓거나, 눌러 보세요.', 13.5, MUTED, 17, 700);
    B.blocks.forEach((b, i) => {
      const dragging = B.drag && B.drag.b === b;
      b.lift = ap(b.lift, dragging ? 1 : 0, 1 / 60, 10);
      ctx.save();
      const cxx = b.x + b.w / 2, cyy = b.y + b.h / 2, sc2 = 1 + 0.07 * b.lift;
      ctx.translate(cxx, cyy); ctx.scale(sc2, sc2); ctx.translate(-cxx, -cyy);
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = GC[b.g]; ctx.fill(); }, { blur: 6 + 14 * b.lift, y: 2 + 8 * b.lift });
      ctx.fillStyle = 'rgba(255,255,255,.18)'; D.roundRect(b.x + 4, b.y + 4, b.w - 8, b.h * 0.42, 12); ctx.fill();
      T(b.x + b.w / 2, b.y + b.h * 0.55, GROUPTXT[b.g][0], PHONE ? 24 : 28, '#fff', 'center', 900);
      T(b.x + b.w / 2, b.y + b.h - 13, GROUPTXT[b.g][1], 14, 'rgba(255,255,255,.95)', 'center', 800);
      ctx.restore();
      if (!dragging && !B.made[b.g] && !RM) { ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3 + i); ctx.strokeStyle = GC[b.g]; ctx.lineWidth = 3; D.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 19); ctx.stroke(); ctx.restore(); }
    });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    drawDaily(INFO, t);
  }

  /* ============ ② 분자 조립 ============ */
  const BUILD = ['methanol', 'formaldehyde', 'formic', 'ethanol', 'acetaldehyde', 'acetic'];
  const A2 = { k: 'methanol', fill: {}, cnt: {}, drag: null, shake: 0, mv: new MolView(), done: {}, pop: {} };
  BUILD.forEach((k) => { A2.fill[k] = {}; A2.cnt[k] = { C: NaN, H: NaN, O: NaN }; });
  const slotsOf = (k) => SPEC[k].atoms.filter((a) => a.el !== 'C');
  const slotParent = (k, id) => { const b = SPEC[k].bonds.find((q) => q.a === id || q.b === id); return b ? (b.a === id ? b.b : b.a) : null; };
  const slotAvail = (k, id) => { const a = SPEC[k].atoms.find((q) => q.id === id); if (!a) return false; if (id === 'HO1') return !!A2.fill[k].O1; if (id === 'HOa1') return !!A2.fill[k].Oa1; return true; };
  const asmDone = (k) => slotsOf(k).every((a) => A2.fill[k][a.id]);
  const asmN = () => BUILD.filter(asmDone).length;
  const cntOk = (k) => { const c = A2.cnt[k], f = FOR[k]; return asmDone(k) && c.C === f.C && c.H === f.H && c.O === f.O; };
  const cntN = () => BUILD.filter(cntOk).length;
  function partialSpec(k) {
    const sp = SPEC[k], keep = {};
    sp.atoms.forEach((a) => { if (a.el === 'C' || A2.fill[k][a.id]) keep[a.id] = true; });
    const full = asmDone(k);
    return { n: sp.n, g: full ? sp.g : 'none', atoms: sp.atoms.filter((a) => keep[a.id]), bonds: sp.bonds.filter((b) => keep[b.a] && keep[b.b]), gids: full ? sp.gids : [] };
  }
  function a2Refresh(instant) { A2.mv.set(partialSpec(A2.k), instant, SPEC[A2.k]); }
  function a2Select(k) {
    A2.k = k; A2.mv = new MolView(); a2Refresh(true); A2.drag = null; A2.shake = 0;
    syncInputs(); updateCtl();
  }
  function a2Fill(k, id) {
    if (A2.fill[k][id] || !slotAvail(k, id)) return false;
    A2.fill[k][id] = true;
    if (k === A2.k) { a2Refresh(false); const was = A2.pop[k]; if (asmDone(k) && !was) { A2.pop[k] = true; Sound.success(); const G = a2Geo(), p = a2Pos(); flash(p.x, p.y, [GC[SPEC[k].g], '#fbbf24', '#fff']); } else Sound.tick(); }
    updateCtl(); return true;
  }
  const a2Geo = () => PHONE
    ? { asm: { x: 8, y: 52, w: 464, h: 300 }, tray: { x: 8, y: 360, w: 464, h: 116 }, s: 62 }
    : { asm: { x: 12, y: 52, w: 560, h: 342 }, tray: { x: 584, y: 52, w: 204, h: 342 }, s: 70 };
  const a2Pos = () => { const G = a2Geo(); return { x: G.asm.x + G.asm.w / 2, y: G.asm.y + G.asm.h / 2 + 4 }; };
  const a2Scr = (id) => { const G = a2Geo(), p = a2Pos(), a = SPEC[A2.k].atoms.find((q) => q.id === id); return { x: p.x + (a.x - A2.mv.cx) * G.s, y: p.y + (a.y - A2.mv.cy) * G.s }; };
  const trayAtoms = () => { const G = a2Geo(), tr = G.tray; return PHONE ? [{ el: 'H', x: tr.x + tr.w * 0.3, y: tr.y + 66, r: 28 }, { el: 'O', x: tr.x + tr.w * 0.7, y: tr.y + 66, r: 30 }] : [{ el: 'H', x: tr.x + tr.w / 2, y: tr.y + 100, r: 32 }, { el: 'O', x: tr.x + tr.w / 2, y: tr.y + 205, r: 36 }]; };
  function a2Near(p, rad) {
    const G = a2Geo(); let best = null, bd = rad == null ? G.s * 0.55 : rad;
    slotsOf(A2.k).forEach((a) => { if (A2.fill[A2.k][a.id] || !slotAvail(A2.k, a.id)) return; const q = a2Scr(a.id), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = a; } });
    return best;
  }
  const NAMEEL = { H: '수소', O: '산소' };
  function drawBuild(t) {
    const G = a2Geo(), k = A2.k, as = G.asm, sp = SPEC[k], m = MOLS[k], full = asmDone(k);
    T(14, 26, '🧪 구슬을 끼워 ' + m.name + ' 분자 모형을 완성해요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(as.x, as.y, as.w, as.h, 14);
    const p = a2Pos(), s = G.s;
    D.label(p.x, as.y + 26, m.name + (full ? '' : ' (조립 중)'), { bg: full ? GC[m.g] : '#64748b', color: '#fff', size: 15.5 });
    // 빈 칸
    slotsOf(k).forEach((a) => {
      if (A2.fill[k][a.id] || !slotAvail(k, a.id)) return;
      const q = a2Scr(a.id), par = a2Scr(slotParent(k, a.id)), r = (ER[a.el] || 0.25) * s;
      D.dashedLine(par.x, par.y, q.x, q.y, { color: 'rgba(100,116,139,.55)', width: 2.4, dash: [4, 5] });
      const pulse = A2.drag && A2.drag.el === a.el ? 1 : 0, near = A2.drag && A2.drag.near === a.id;
      ctx.save(); ctx.beginPath(); ctx.arc(q.x, q.y, r + (near ? 4 : 0) + pulse * 1.5 * Math.sin(t * 7), 0, TAU);
      ctx.fillStyle = near ? C.rgba(ELC[a.el] === '#f8fafc' ? '#94a3b8' : ELC[a.el], 0.35) : 'rgba(255,255,255,.7)'; ctx.fill();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = a.el === 'O' ? '#ef4444' : '#64748b'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      T(q.x, q.y + 5, a.el, 14, a.el === 'O' ? '#ef4444' : '#64748b', 'center', 800, { alpha: 0.7 });
    });
    A2.mv.draw(p.x, p.y, s, { hlLabel: full ? true : false });
    const f = FOR[k], n = slotsOf(k).filter((a) => A2.fill[k][a.id]).length;
    T(p.x, as.y + as.h - 40, full ? ('분자식 ' + (cntOk(k) ? f.text : '?') + '   ·   시성식 ' + m.cond) : '빈 자리 ' + (slotsOf(k).length - n) + '개 남았어요', 15, full ? INK : MUTED, 'center', 800);
    if (full) textBlock(as.x + 16, as.y + as.h - 16, as.w - 32, cntOk(k) ? '탄소 ' + f.C + '개 · 수소 ' + f.H + '개 · 산소 ' + f.O + '개 → ' + f.text : '모형의 원자 수를 세어 오른쪽 아래 칸에 분자식을 써 보세요.', 13.5, MUTED, 17, 700);
    else T(p.x, as.y + as.h - 16, '탄소(C)는 이미 골격에 있어요. H와 O를 채워요.', 13.5, MUTED, 'center', 700);
    // 트레이
    const tr = G.tray; panel(tr.x, tr.y, tr.w, tr.h, 14, '#faf8ff');
    T(tr.x + 16, tr.y + 26, '원자 구슬 상자', 15, WARN, 'left', 800);
    trayAtoms().forEach((a) => {
      const pulse = 1 + 0.04 * Math.sin(t * 3 + (a.el === 'O' ? 1 : 0));
      atomBall(a.x, a.y, a.r * pulse, a.el, { shadow: true, ts: 1.0 });
      T(a.x, a.y + a.r + 20, a.el + ' ' + NAMEEL[a.el], 13.5, MUTED, 'center', 800);
    });
    if (!PHONE) textBlock(tr.x + 14, tr.y + tr.h - 44, tr.w - 28, '구슬을 끌어다 빈 칸에 놓거나, 빈 칸을 눌러요.', 13.5, MUTED, 17, 700);
    // 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const cols = PHONE ? 1 : 2, rowH = PHONE ? 33 : 34, tw = (INFO.w - 32 - (cols - 1) * 16) / cols;
    T(INFO.x + 16, INFO.y + 22, '화학식 표 (조립하면 채워져요)', 14.5, WARN, 'left', 800);
    BUILD.forEach((kk, i) => {
      const c = PHONE ? 0 : (i < 3 ? 0 : 1), r = PHONE ? i : i % 3;
      const x = INFO.x + 16 + c * (tw + 16), y = INFO.y + 32 + r * rowH, mm = MOLS[kk], done = asmDone(kk), cur = kk === k;
      D.roundRect(x, y, tw, rowH - 4, 9); ctx.fillStyle = cur ? '#ede9fe' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = cur ? PUR : '#e2e8f0'; ctx.lineWidth = cur ? 2 : 1.2; ctx.stroke();
      if (done) { ctx.fillStyle = GC[mm.g]; D.roundRect(x + 5, y + 5, 6, rowH - 14, 3); ctx.fill(); }
      T(x + 16, y + 20, mm.name, 13, done ? INK : '#94a3b8', 'left', 800);
      const fx = x + (PHONE ? 136 : 138);
      T(fx, y + 20, cntOk(kk) ? FOR[kk].text : '분자식 ?', 13.5, cntOk(kk) ? '#166534' : '#94a3b8', 'left', 800);
      T(fx + 74, y + 20, done ? mm.cond : '시성식 ?', 13.5, done ? INK : '#94a3b8', 'left', 800);
      if (done) pill(x + tw - 40, y + 14, GROUPTXT[mm.g][0], { bg: GC[mm.g], color: '#fff', border: null, size: 12.5, pad: 6 });
    });
  }

  /* ============ ③ 성질 탐구 ============ */
  const SAMP = ['ethanol', 'acetaldehyde', 'acetic'];
  const TESTS = ['water', 'ph', 'gas', 'bp'];
  const TLAB = { water: '① 물에 녹이기', ph: '② 수용액 pH', gas: '③ NaHCO₃ 넣기', bp: '④ 끓는점' };
  const PHV = { ethanol: 7.0, acetaldehyde: 7.0, acetic: 2.87 };
  const phTxt = (k) => (k === 'acetic' ? '2.87' : '≈ 7');
  const L3 = { sel: 'ethanol', test: 'water', run: null, res: {}, bub: [], cls: {}, bar: {}, liq: '#dbeafe', ind: 0 };
  SAMP.forEach((k) => { L3.res[k] = {}; L3.cls[k] = { ph: '', gas: '' }; L3.bar[k] = 0; });
  L3.bar.ethane = MOLS.ethane.bp;
  const labDone = () => SAMP.reduce((s, k) => s + TESTS.filter((t) => L3.res[k][t]).length, 0);
  const labGeo = () => PHONE
    ? { bott: { x: 18, y: 84, w: 66, h: 96, gap: 20 }, app: { x: 8, y: 196, w: 464, h: 280 }, left: false }
    : { bott: { x: 34, y: 112, w: 66, h: 110, gap: 22 }, app: { x: 270, y: 52, w: 518, h: 342 }, left: true };
  const bottRect = (i) => { const G = labGeo().bott; return { x: G.x + i * (G.w + G.gap), y: G.y, w: G.w, h: G.h }; };
  function labStart() {
    if (L3.run) return;
    L3.run = { k: L3.sel, test: L3.test, t: 0 }; L3.bub.length = 0; L3.liq = '#dbeafe'; L3.ind = 0; updateCtl();
  }
  function labSelect(k) { if (L3.run) return; L3.sel = k; updateCtl(); }
  function labPickTest(tt) { if (L3.run) return; L3.test = tt; L3.liq = '#dbeafe'; L3.ind = 0; L3.bub.length = 0; updateCtl(); }
  const RUNDUR = 2.8;
  function stepLab(dt) {
    const r = L3.run; if (!r) return;
    r.t += dt / RUNDUR;
    const k = r.k;
    if (r.test === 'ph') L3.ind = ap(L3.ind, r.t > 0.35 ? 1 : 0, dt, 3);
    if (r.test === 'gas' && k === 'acetic' && r.t > 0.3 && r.t < 1.0 && !RM && Math.random() < 0.7) L3.bub.push({ x: Math.random(), y: 0.95, v: 0.3 + Math.random() * 0.25, ph: Math.random() * 6, rr: 2.5 + Math.random() * 3 });
    for (let i = L3.bub.length - 1; i >= 0; i--) { const b = L3.bub[i]; b.y -= b.v * dt * 1.6; if (b.y < 0.28) L3.bub.splice(i, 1); }
    if (r.t >= 1) {
      L3.res[k][r.test] = true;
      if (r.test === 'ph') L3.cls[k].ph = k === 'acetic' ? 'acid' : 'neutral';
      if (r.test === 'gas') L3.cls[k].gas = k === 'acetic' ? 'yes' : 'no';
      if (S.mode === 'lab') { const g = labGeo(); flash(g.app.x + g.app.w * 0.5, g.app.y + g.app.h * 0.45, ['#14a058', '#fbbf24', '#8b5cf6']); }
      Sound.success(); L3.run = null; updateCtl();
    }
    if (L3.run === null) return;
  }
  function bottle(R, k, sel, t) {
    const m = MOLS[k], col = GC[m.g];
    const x = R.x, y = R.y, w = R.w, h = R.h, bw = w * 0.94, bx = x + (w - bw) / 2;
    ctx.save();
    if (sel) { ctx.translate(0, -4 + Math.sin(t * 3) * (RM ? 0 : 1.2)); D.glow(x + w / 2, y + h * 0.6, w, col, 0.35); }
    D.shadow(() => { D.roundRect(bx, y + h * 0.28, bw, h * 0.72, 12); ctx.fillStyle = 'rgba(224,242,254,.9)'; ctx.fill(); }, { blur: 7, y: 3 });
    ctx.strokeStyle = '#7c93b3'; ctx.lineWidth = 2.2; D.roundRect(bx, y + h * 0.28, bw, h * 0.72, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(147,197,253,.55)'; D.roundRect(bx + 3, y + h * 0.5, bw - 6, h * 0.47, 9); ctx.fill();
    D.roundRect(x + w * 0.33, y + h * 0.1, w * 0.34, h * 0.2, 4); ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.stroke();
    D.roundRect(x + w * 0.28, y, w * 0.44, h * 0.13, 5); ctx.fillStyle = sel ? col : '#64748b'; ctx.fill();
    D.roundRect(bx + 4, y + h * 0.56, bw - 8, h * 0.28, 5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(bx + 4, y + h * 0.56, 5, h * 0.28);
    ctx.restore();
    const name = m.name.length > 6 ? m.name.replace('아세트알데하이드', '아세트\n알데하이드') : m.name;
    const ls = name.split('\n');
    ls.forEach((l, i) => { let fs = ls.length > 1 ? 12.5 : 13.5; while (textW(l, fs, 800) > bw - 14 && fs > 9.5) fs -= 0.5; T(x + w / 2 + 2, y + h * 0.69 + i * 13 - (ls.length - 1) * 6, l, fs, INK, 'center', 800); });
    T(x + w / 2, y + h + 18, GROUPTXT[m.g][0], 14, col, 'center', 800);
  }
  function tubeShape(cx, top, w, h) { return { cx, top, w, h, bot: top + h, x0: cx - w / 2, x1: cx + w / 2 }; }
  function drawTube(tb, liquidFrac, color, o) {
    o = o || {};
    const cx = tb.cx, w = tb.w, top = tb.top, h = tb.h;
    const path = () => { ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + h - w / 2); ctx.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top); };
    const ly = top + h - (h - 6) * liquidFrac;
    ctx.save(); path(); ctx.closePath(); ctx.fillStyle = 'rgba(240,247,255,.7)'; ctx.fill(); ctx.clip();
    if (liquidFrac > 0.01) {
      const g = ctx.createLinearGradient(0, ly, 0, top + h); g.addColorStop(0, C.rgba(color, 0.7)); g.addColorStop(1, C.rgba(C.shade(color, -0.12), 0.92));
      ctx.fillStyle = g; ctx.fillRect(cx - w, ly, w * 2, top + h - ly + 2); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(cx - w / 2, ly, w, 2.5);
    }
    if (o.inside) o.inside(ly);
    ctx.restore();
    ctx.save(); path(); ctx.strokeStyle = 'rgba(70,100,140,.8)'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 6, top + 8); ctx.lineTo(cx - w / 2 + 6, top + h - w * 0.8); ctx.stroke(); ctx.restore();
    return ly;
  }
  const PHCOL = [[1, '#ef4444'], [3, '#f97316'], [5, '#facc15'], [7, '#22c55e'], [9, '#14b8a6'], [11, '#3b82f6'], [13, '#7c3aed']];
  const phColor = (v) => { for (let i = 1; i < PHCOL.length; i++) if (v <= PHCOL[i][0]) { const a = PHCOL[i - 1], b = PHCOL[i]; return C.mix(a[1], b[1], (v - a[0]) / (b[0] - a[0])); } return PHCOL[PHCOL.length - 1][1]; };
  function drawLab(t) {
    const G = labGeo(), ap2 = G.app, r = L3.run, k = L3.sel, m = MOLS[k];
    T(14, 26, '🧫 시료 3종의 성질을 시험해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 시료병
    T(G.bott.x, G.bott.y - 20, '시료 (눌러서 고르기)', 14, WARN, 'left', 800);
    SAMP.forEach((s, i) => bottle(bottRect(i), s, s === k, t));
    // 선택한 시료 기록
    if (!PHONE) {
      const yy = G.bott.y + G.bott.h + 52;
      T(G.bott.x, yy, m.name + '의 시험 기록', 14, INK, 'left', 800);
      TESTS.forEach((tt, i) => { const ok = L3.res[k][tt]; T(G.bott.x + 4, yy + 26 + i * 25, (ok ? '✅ ' : '⬜ ') + TLAB[tt], 14, ok ? '#166534' : MUTED, 'left', 700); });
    }
    const cxA = ap2.x + ap2.w / 2, tProg = r ? clamp(r.t, 0, 1) : 0;
    const showTest = r ? r.test : L3.test;
    // 안전 안내
    if (!PHONE) pill(cxA, MAIN.y + MAIN.h - 20, '⚠ 보안경 · 환기 · 직접 냄새 맡지 않기 · 폐액은 지정 용기에', { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', size: 13.5 });
    else pill(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 18, '⚠ 보안경 · 환기 · 폐액은 지정 용기에', { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', size: 13 });
    const apTop = ap2.y + (PHONE ? 8 : 30);
    if (showTest === 'water') {
      const bw = PHONE ? 150 : 170, bh = PHONE ? 150 : 170, bx = cxA - bw / 2 - (PHONE ? 0 : 50), by = apTop + (PHONE ? 54 : 56);
      T(cxA - (PHONE ? 0 : 50), apTop + 16, '물 + ' + m.name, 15, INK, 'center', 800);
      // 물방울
      if (r && tProg < 0.35) { for (let i = 0; i < 3; i++) { const q = clamp((tProg - i * 0.07) / 0.2, 0, 1); if (q > 0 && q < 1) { D.sphere(cxA - (PHONE ? 0 : 50) + (i - 1) * 8, apTop + 30 + q * (by - apTop + 10), 5, GC[m.g], { gloss: false }); } } }
      const mix = r ? sm((tProg - 0.25) / 0.65) : (L3.res[k].water ? 1 : 0);
      beaker2(bx, by, bw, bh, 0.62, '#9bc8ff', (g) => {
        const n = 34;
        for (let i = 0; i < n; i++) {
          const q = [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
          const tx = g.ix + 10 + q[0] * (g.iw - 20), ty = g.ly + 10 + q[1] * (g.bottom - g.ly - 20);
          const sx = g.ix + g.iw / 2 + (q[0] - 0.5) * 24, sy = g.ly + 14 + q[1] * 16;
          const k2 = (r || L3.res[k].water) ? mix : 0;
          const wob = RM ? 0 : 2;
          const x = lerp(sx, tx, k2) + Math.sin(t * 1.4 + i) * wob, y = lerp(sy, ty, k2) + Math.cos(t * 1.1 + i * 1.3) * wob;
          if (r || L3.res[k].water) D.sphere(x, y, 4.6, GC[m.g], { gloss: false, outline: 'rgba(255,255,255,.7)', outlineWidth: 1 });
        }
      });
      const done = (!r && L3.res[k].water) || (r && tProg > 0.95);
      const rx = bx + bw + (PHONE ? 10 : 30);
      if (!PHONE) { textBlock(rx, by + 20, ap2.x + ap2.w - rx - 10, done ? josa(m.name, '은', '는') + ' 물과 고르게 섞여 맑은 용액이 돼요. 극성이 커서 물 분자와 잘 어울려요.' : '시료를 물에 넣으면 어떻게 될까요?', 14, done ? '#166534' : MUTED, 19, 800); }
      else if (done) textBlock(bx + bw + 8, by + 24, 130, '물과 고르게 섞여요', 13.5, '#166534', 18, 800);
    } else if (showTest === 'ph') {
      const tb = tubeShape(cxA - (PHONE ? 100 : 120), apTop + 16, 48, PHONE ? 170 : 196);
      const indC = phColor(PHV[k]);
      const shown = !r ? (L3.res[k].ph ? 1 : 0) : L3.ind;
      drawTube(tb, 0.62, C.mix('#dbeafe', indC, shown));
      T(tb.cx, tb.bot + 24, m.name + ' 수용액', 13.5, INK, 'center', 800);
      T(tb.cx, tb.bot + 42, '(0.10 M) + 지시약', 13.5, MUTED, 'center', 700);
      if (r && tProg > 0.2 && tProg < 0.4 && !RM) { for (let i = 0; i < 3; i++) { const q = (tProg - 0.2 - i * 0.03) / 0.15; if (q > 0 && q < 1) D.sphere(tb.cx + (i - 1) * 6, tb.top - 20 + q * 90, 4.5, indC, { gloss: false }); } }
      // pH 눈금
      const bx = (PHONE ? 118 : tb.cx + 70), bw = PHONE ? 330 : ap2.x + ap2.w - 40 - (tb.cx + 70), by = apTop + 86;
      T(bx, by - 52, 'pH 눈금 (지시약 색)', 14, WARN, 'left', 800);
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); PHCOL.forEach(([v, c]) => g.addColorStop((v - 1) / 12, c));
      D.roundRect(bx, by, bw, 26, 13); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let v = 1; v <= 13; v += 2) { const x = bx + (v - 1) / 12 * bw; ctx.fillStyle = '#334155'; ctx.fillRect(x - 0.8, by + 28, 1.6, 6); T(x, by + 50, String(v), 13.5, MUTED, 'center', 800); }
      const has = (!r && L3.res[k].ph) || (r && tProg > 0.5);
      if (has) {
        const x = bx + (PHV[k] - 1) / 12 * bw;
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(x, by - 3); ctx.lineTo(x - 8, by - 15); ctx.lineTo(x + 8, by - 15); ctx.closePath(); ctx.fill();
        pill(clamp(x, bx + 44, bx + bw - 44), by - 32, 'pH ' + phTxt(k), { bg: '#1e293b', color: '#fff', border: null, size: 14.5 });
        T(bx, by + 84, k === 'acetic' ? '약한 산성 (약산) : 수소 이온이 조금 생겨요' : '중성 : 액성이 거의 변하지 않아요', 14, k === 'acetic' ? '#b91c1c' : '#166534', 'left', 800);
      }
    } else if (showTest === 'gas') {
      const tb = tubeShape(cxA - (PHONE ? 100 : 120), apTop + 16, 54, PHONE ? 176 : 198);
      const lv = r ? clamp(0.16 + 0.42 * sm((tProg - 0.12) / 0.2), 0.16, 0.58) : (L3.res[k].gas ? 0.58 : 0.16);
      drawTube(tb, lv, r || L3.res[k].gas ? '#e0f2fe' : '#e0f2fe', {
        inside(ly) {
          // 탄산수소 나트륨 가루
          ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.ellipse(tb.cx, tb.bot - 12, tb.w / 2, 13, 0, 0, TAU); ctx.fill();
          for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#e2e8f0' : '#fff'; ctx.beginPath(); ctx.arc(tb.cx - 18 + i * 4.6, tb.bot - 20 + ((i * 7) % 5), 3.2, 0, TAU); ctx.fill(); }
          L3.bub.forEach((b) => { const x = tb.x0 + 8 + b.x * (tb.w - 16) + Math.sin(t * 4 + b.ph) * 2, y = tb.top + b.y * tb.h; if (y > ly + 2) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, b.rr, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); } });
        },
      });
      T(tb.cx, tb.bot + 24, 'NaHCO₃ + ' + m.name, 13.5, INK, 'center', 800);
      const done = (!r && L3.res[k].gas) || (r && tProg > 0.9);
      const rx = tb.cx + 80, rw = ap2.x + ap2.w - rx - 12;
      if (!PHONE || done) {
        const yy = apTop + 36;
        if (done && k === 'acetic') { pill(rx + 70, yy, 'CO₂ 기포가 생겨요!', { bg: '#dcfce7', color: '#166534', border: '#4ade80', size: 14.5 }); textBlock(rx, yy + 34, Math.max(130, rw), '–COOH가 수소 이온을 내놓아서 NaHCO₃와 반응해 CO₂가 나와요.', 13.5, INK, 18, 700); }
        else if (done) { pill(rx + 70, yy, '기포가 없어요', { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', size: 14.5 }); textBlock(rx, yy + 34, Math.max(130, rw), m.g === 'OH' ? '–OH(알코올)는 산성이 아니라서 반응하지 않아요.' : '–CHO(알데하이드)는 산성이 아니라서 반응하지 않아요.', 13.5, INK, 18, 700); }
        else if (!PHONE) textBlock(rx, yy, rw, '시료를 NaHCO₃ 가루에 부으면 무슨 일이 생길까요?', 14, MUTED, 19, 800);
      }
    } else {
      // 끓는점 막대그래프
      const px = (PHONE ? MAIN.x + 40 : ap2.x + 50), pw = (PHONE ? MAIN.w - 60 : ap2.w - 70), py = apTop + (PHONE ? 30 : 12), ph = PHONE ? 170 : 176;
      const vmin = -100, vmax = 140, Y = (v) => py + ph * (1 - (v - vmin) / (vmax - vmin));
      T(px - 40, py - 16, '끓는점 (°C)', 14, WARN, 'left', 800);
      D.roundRect(px, py, pw, ph, 8); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke();
      for (let v = vmin; v <= vmax; v += 40) { const y = Y(v); ctx.strokeStyle = v === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); T(px - 6, y + 5, String(v).replace('-', MINUS), 13, MUTED, 'right', 700); }
      const bars = [['ethane', '에테인', '#94a3b8'], ['acetaldehyde', '아세트\n알데하이드', GC.CHO], ['ethanol', '에탄올', GC.OH], ['acetic', '아세트산', GC.COOH]];
      const bwid = pw / 4;
      bars.forEach(([kk, nm, col], i) => {
        const v = L3.bar[kk], x = px + i * bwid + bwid * 0.2, w = bwid * 0.6, y0 = Y(0), y1 = Y(clamp(v, vmin, vmax));
        D.shadow(() => { D.roundRect(x, Math.min(y0, y1), w, Math.max(0, Math.abs(y1 - y0)), 5); ctx.fillStyle = col; ctx.fill(); }, { blur: 4, y: 1 });
        const real = kk === 'ethane' ? MOLS.ethane.bp : MOLS[kk].bp;
        if (Math.abs(v) > 3 || kk === 'ethane') T(x + w / 2, v >= 0 ? y1 - 6 : y1 + 17, subBp(Math.round(v)) + '°', 14, INK, 'center', 800);
        nm.split('\n').forEach((l, j) => T(x + w / 2, py + ph + 20 + j * 15, l, 13.5, kk === k ? INK : MUTED, 'center', kk === k ? 900 : 700));
        if (kk === k) { ctx.strokeStyle = PUR; ctx.lineWidth = 2.4; D.roundRect(x - 4, py + 2, w + 8, ph - 4, 6); ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
      });
      if (!PHONE) textBlock(px, py + ph + 62, pw, '에테인(작용기 없음)보다 모두 끓는점이 높아요. 극성인 작용기 때문에 분자 사이의 인력이 커요.', 13.5, INK, 17, 700);
    }
    // 하단 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 22, '시험 결과표', 14.5, WARN, 'left', 800);
    const cw = [0.26, 0.19, 0.19, 0.19, 0.17], hx = ['시료', '물에 녹임', '수용액 pH', 'NaHCO₃ 기포', '끓는점'];
    const tx = INFO.x + 14, tw = INFO.w - 28; let ax = tx;
    const heads = PHONE ? ['시료', '물', 'pH', '기포', '끓는점'] : hx;
    const colX = []; cw.forEach((c) => { colX.push(ax); ax += c * tw; });
    heads.forEach((h, i) => T(colX[i] + (i ? cw[i] * tw / 2 : 8), INFO.y + 46, h, 13.5, MUTED, i ? 'center' : 'left', 800));
    SAMP.forEach((kk, ri) => {
      const y = INFO.y + 56 + ri * (PHONE ? 46 : 28), hh = PHONE ? 40 : 25, cur = kk === k, rs = L3.res[kk];
      D.roundRect(tx, y, tw, hh, 8); ctx.fillStyle = cur ? '#ede9fe' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = cur ? PUR : '#e2e8f0'; ctx.lineWidth = cur ? 2 : 1.2; ctx.stroke();
      T(colX[0] + 8, y + hh / 2 + 5, MOLS[kk].name.replace('아세트알데하이드', PHONE ? '아세트알데하이드' : '아세트알데하이드'), PHONE ? 13 : 13.5, INK, 'left', 800);
      const cell = (i, txt, good) => T(colX[i] + cw[i] * tw / 2, y + hh / 2 + 5, txt, 13.5, txt === '—' ? '#cbd5e1' : good || INK, 'center', 800);
      cell(1, rs.water ? '잘 섞임' : '—', '#166534');
      cell(2, rs.ph ? phTxt(kk) + (kk === 'acetic' ? ' 산성' : ' 중성') : '—', kk === 'acetic' ? '#b91c1c' : '#166534');
      cell(3, rs.gas ? (kk === 'acetic' ? '있음' : '없음') : '—', kk === 'acetic' ? '#b91c1c' : '#475569');
      cell(4, rs.bp ? MOLS[kk].bp + '°C' : '—', INK);
    });
  }
  function beaker2(x, y, w, h, level, color, inside) {
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11, ly = iy + ih * (1 - level), rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    D.shadow(() => { path(x, y, w, h, rad); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
    const g = ctx.createLinearGradient(0, ly, 0, iy + ih); g.addColorStop(0, C.rgba(color, 0.55)); g.addColorStop(1, C.rgba(C.shade(color, -0.18), 0.8));
    ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
    if (inside) inside({ x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih });
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
  }

  /* ============ ④ 분류하기 ============ */
  const CARDS = [
    { id: 'methanol', t: 'mol', k: 'methanol' }, { id: 'ethanol', t: 'mol', k: 'ethanol' }, { id: 'propanol', t: 'mol', k: 'propanol' },
    { id: 'formaldehyde', t: 'mol', k: 'formaldehyde' }, { id: 'acetaldehyde', t: 'mol', k: 'acetaldehyde' }, { id: 'propanal', t: 'mol', k: 'propanal' },
    { id: 'formic', t: 'mol', k: 'formic' }, { id: 'acetic', t: 'mol', k: 'acetic' }, { id: 'propanoic', t: 'mol', k: 'propanoic' },
    { id: 'u1', t: 'use', ico: '🧴', l1: '소독용', l2: '에탄올', g: 'OH' }, { id: 'u2', t: 'use', ico: '🍶', l1: '식초', l2: '아세트산', g: 'COOH' }, { id: 'u3', t: 'use', ico: '🧪', l1: '방부제', l2: '폼알데하이드', g: 'CHO' },
  ];
  const SORTORDER = [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11];
  CARDS.forEach((c) => { if (c.t === 'mol') { c.g = MOLS[c.k].g; c.l1 = MOLS[c.k].cond; c.l2 = MOLS[c.k].name; } c.loc = 'tray'; c.x = 0; c.y = 0; c.bad = false; c.lift = 0; });
  const BOXG = ['OH', 'CHO', 'COOH'];
  const Q4 = { sel: null, drag: null, solved: false, wrong: 0, shuf: [8, 2, 5, 0, 10, 7, 3, 11, 4, 1, 9, 6] };
  const sGeo = () => {
    const cw = PHONE ? 108 : 116, chh = PHONE ? 34 : 46, gap = 6;
    if (PHONE) {
      const bh = 136;
      return { cw, ch: chh, boxes: BOXG.map((g, i) => ({ g, x: 8, y: 52 + i * (bh + 6), w: 464, h: bh })), tray: { x: 8, y: 484, w: 464, h: 270 }, pitch: 38, cols: 4, trayCols: 4, trayPitch: 50 };
    }
    const bw = (776 - 16) / 3;
    return { cw, ch: chh, boxes: BOXG.map((g, i) => ({ g, x: 12 + i * (bw + 8), y: 52, w: bw, h: 342 })), tray: { x: 12, y: 402, w: 776, h: 148 }, pitch: 50, cols: 2, trayCols: 6, trayPitch: 54 };
  };
  function sLayout() {
    const G = sGeo();
    BOXG.forEach((g, bi) => {
      const list = CARDS.filter((c) => c.loc === g), B0 = G.boxes[bi];
      const rowsAvail = Math.floor((B0.h - 34) / (G.pitch * 0.62)), cols = G.cols;
      const rows = Math.ceil(list.length / cols);
      const pitch = rows * G.pitch <= B0.h - 34 ? G.pitch : (B0.h - 34 - G.ch) / Math.max(1, rows - 1);
      const gx = (B0.w - cols * G.cw - (cols - 1) * 6) / 2;
      list.forEach((c, i) => { const cc = i % cols, rr = Math.floor(i / cols); c.tx = B0.x + gx + cc * (G.cw + 6); c.ty = B0.y + 34 + rr * Math.min(pitch, G.pitch); });
    });
    const trayList = Q4.shuf.map((i) => CARDS[i]).filter((c) => c.loc === 'tray');
    const tcols = G.trayCols, tg = G.tray;
    const gx = (tg.w - tcols * G.cw - (tcols - 1) * 6) / 2;
    trayList.forEach((c, i) => { const cc = i % tcols, rr = Math.floor(i / tcols); c.tx = tg.x + gx + cc * (G.cw + 6); c.ty = tg.y + 34 + rr * G.trayPitch; });
  }
  function sInit() { sLayout(); CARDS.forEach((c) => { c.x = c.tx; c.y = c.ty; }); }
  sInit();
  const sortedN = () => CARDS.filter((c) => c.loc !== 'tray').length;
  const sortWrong = () => CARDS.filter((c) => c.loc !== 'tray' && c.loc !== c.g);
  const sortAll = () => CARDS.every((c) => c.loc === c.g);
  function placeCard(c, loc) { c.loc = loc; c.bad = false; Q4.solved = false; Q4.sel = null; sLayout(); Sound.tick(); updateCtl(); }
  const cardRect = (c) => { const G = sGeo(); return { x: c.x, y: c.y, w: G.cw, h: G.ch }; };
  function drawCard(c, t, o) {
    const G = sGeo(), w = G.cw, h = G.ch, sel = Q4.sel === c, lift = c.lift;
    ctx.save();
    const cx0 = c.x + w / 2, cy0 = c.y + h / 2, s2 = 1 + 0.06 * lift; ctx.translate(cx0, cy0); ctx.scale(s2, s2); ctx.translate(-cx0, -cy0);
    D.shadow(() => { D.roundRect(c.x, c.y, w, h, 9); ctx.fillStyle = c.bad ? '#fee2e2' : '#fff'; ctx.fill(); }, { blur: 3 + 10 * lift, y: 1 + 6 * lift });
    D.roundRect(c.x, c.y, w, h, 9); ctx.strokeStyle = c.bad ? '#ef4444' : sel ? PUR : c.t === 'use' ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = sel || c.bad ? 3 : 1.6; ctx.stroke();
    if (c.t === 'use') { ctx.fillStyle = '#fef3c7'; D.roundRect(c.x + 2, c.y + 2, 6, h - 4, 3); ctx.fill(); }
    if (PHONE) {
      const txt = c.t === 'use' ? c.ico + ' ' + c.l1 : c.l1;
      let fs = 13.5; while (textW(txt, fs, 800) > w - 14 && fs > 11.5) fs -= 0.5;
      T(c.x + w / 2, c.y + h / 2 + 5, txt, fs, INK, 'center', 800);
    } else {
      const txt = c.t === 'use' ? c.ico + ' ' + c.l1 : c.l1;
      let fs = 14; while (textW(txt, fs, 800) > w - 12 && fs > 12) fs -= 0.5;
      T(c.x + w / 2, c.y + 20, txt, fs, INK, 'center', 800);
      let f2 = 13; while (textW(c.l2, f2, 700) > w - 10 && f2 > 11.5) f2 -= 0.5;
      T(c.x + w / 2, c.y + 38, c.l2, f2, MUTED, 'center', 700);
    }
    ctx.restore();
  }
  function stepSort(dt) {
    CARDS.forEach((c) => {
      const dragging = Q4.drag && Q4.drag.c === c;
      if (!dragging) { c.x = ap(c.x, c.tx, dt, 12); c.y = ap(c.y, c.ty, dt, 12); }
      c.lift = ap(c.lift, dragging ? 1 : 0, dt, 12);
    });
  }
  const RULE = {
    OH: ['CH₃OH', 'CH₃CH₂OH', 'CH₃CH₂CH₂OH', [65, 78, 97]],
    CHO: ['HCHO', 'CH₃CHO', 'CH₃CH₂CHO', [-19, 20, 48]],
    COOH: ['HCOOH', 'CH₃COOH', 'CH₃CH₂COOH', [101, 118, 141]],
  };
  function drawSort(t) {
    const G = sGeo();
    T(14, 26, '🗂 구조식에서 작용기를 찾아 알맞은 상자에 넣어요', PHONE ? 13 : 17, INK, 'left', 800);
    sLayout();
    G.boxes.forEach((b) => {
      const col = GC[b.g], over = Q4.drag && Q4.drag.over === b.g;
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = over ? C.rgba(col, 0.18) : C.rgba(col, 0.07); ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.strokeStyle = col; ctx.lineWidth = over ? 3.5 : 2; ctx.setLineDash(over ? [] : [8, 6]); ctx.stroke(); ctx.setLineDash([]);
      D.roundRect(b.x + 6, b.y + 6, b.w - 12, 24, 12); ctx.fillStyle = col; ctx.fill();
      T(b.x + b.w / 2, b.y + 23, GROUPTXT[b.g][1] + ' (' + GROUPTXT[b.g][0] + ')', 14, '#fff', 'center', 900);
    });
    panel(G.tray.x, G.tray.y, G.tray.w, G.tray.h, 14, '#faf8ff');
    const tray = CARDS.filter((c) => c.loc === 'tray');
    if (tray.length) T(G.tray.x + 16, G.tray.y + 24, '카드 ' + tray.length + '장 남았어요 (끌어서 넣거나, 카드를 누르고 상자를 눌러요)', PHONE ? 13 : 14, WARN, 'left', 800);
    else if (!Q4.solved) T(G.tray.x + 16, G.tray.y + 24, '모두 넣었어요. “확인하기”를 눌러 맞게 넣었는지 확인해요.', 14, WARN, 'left', 800);
    if (Q4.solved) {
      T(G.tray.x + 16, G.tray.y + 24, '✨ 규칙 발견: 작용기가 같으면 성질이 비슷하고, 탄소 수가 늘면 끓는점이 높아져요', PHONE ? 13 : 14.5, '#166534', 'left', 800);
      const colw = (G.tray.w - 32) / (PHONE ? 1 : 3);
      BOXG.forEach((g, i) => {
        const x = G.tray.x + 16 + (PHONE ? 0 : i * colw), y = G.tray.y + (PHONE ? 40 + i * 70 : 48), r = RULE[g];
        T(x, y + 14, GROUPTXT[g][1] + ' (' + GROUPTXT[g][0] + ') 끓는점', 14, GC[g], 'left', 800);
        r[3].forEach((v, j) => { const xx = x + j * (PHONE ? 148 : 78); T(xx, y + 40, 'C' + (j + 1), 13, MUTED, 'left', 800); T(xx + 24, y + 40, subBp(v) + '°C', 13.5, INK, 'left', 800); if (j < 2) T(xx + (PHONE ? 118 : 66), y + 40, '→', 14, '#94a3b8', 'center', 800); });
        T(x, y + 64, '탄소 수가 늘수록 높아져요', 13, MUTED, 'left', 700);
      });
    }
    CARDS.filter((c) => !(Q4.drag && Q4.drag.c === c)).forEach((c) => drawCard(c, t));
    if (Q4.drag) drawCard(Q4.drag.c, t);
    if (Q4.sel && !PHONE === false) T(MAIN.x + MAIN.w / 2, G.boxes[0].y - 6, '', 13, INK);
    if (PHONE && Q4.sel && Q4.sel.t === 'mol') pill(MAIN.x + MAIN.w / 2, G.tray.y + 14, '선택: ' + Q4.sel.l2, { bg: '#ede9fe', color: '#5b21b6', border: '#a78bfa', size: 13 });
  }

  /* ---- 작용기 찾기 ---- */
  const FQ = ['propanol', 'propanal', 'propanoic'];
  const F4 = { i: 0, solved: [false, false, false], wrongCnt: 0, mv: new MolView(), shake: 0, locked: false, sel: '' };
  F4.mv.set(SPEC[FQ[0]], true);
  function fSetQ(i) { F4.i = i; F4.mv = new MolView(); F4.mv.set(SPEC[FQ[i]], true); F4.mv.gkey = null; F4.mv.gk = 0; F4.sel = ''; F4.locked = false; updateCtl(); }
  const fN = () => F4.solved.filter(Boolean).length;
  function fAnswer(g) {
    if (F4.locked) return;
    const k = FQ[F4.i], ok = MOLS[k].g === g;
    F4.sel = g;
    if (ok) {
      F4.solved[F4.i] = true; F4.locked = true; F4.mv.gkey = g; Sound.success();
      const p = fPos(); flash(p.x, p.y, [GC[g], '#fbbf24', '#fff']);
      setTimeout(() => { const nx = F4.solved.findIndex((v) => !v); if (nx >= 0 && S.mode === 'find') fSetQ(nx); else F4.locked = false; }, 1300);
    } else { F4.wrongCnt++; F4.shake = 0.4; Sound.fail(); }
    updateCtl();
  }
  const fPos = () => ({ x: MAIN.x + MAIN.w / 2, y: MAIN.y + (PHONE ? 168 : 156) });
  function drawFind(t) {
    T(14, 26, '🔎 구조식을 보고 작용기를 찾아요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const p = fPos(), k = FQ[F4.i], m = MOLS[k];
    const sh = F4.shake > 0 ? Math.sin(F4.shake * 60) * 6 * F4.shake : 0;
    T(MAIN.x + 16, MAIN.y + 28, '문제 ' + (F4.i + 1) + ' / 3', 15, WARN, 'left', 800);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(MAIN.x + MAIN.w - 30 - i * 24, MAIN.y + 24, 8, 0, TAU); ctx.fillStyle = F4.solved[2 - i] ? GOODC : (2 - i === F4.i ? PUR : '#cbd5e1'); ctx.fill(); }
    F4.mv.draw(p.x + sh, p.y, PHONE ? 62 : 70, { hlLabel: F4.solved[F4.i] ? true : false });
    T(p.x, MAIN.y + MAIN.h - 74, m.cond + (F4.solved[F4.i] ? '   ' + m.name : ''), 17, INK, 'center', 800);
    T(p.x, MAIN.y + MAIN.h - 44, F4.solved[F4.i] ? '정답! ' + GROUPTXT[m.g][0] + ' → ' + GROUPTXT[m.g][1] : '이 분자에 들어 있는 작용기는 어느 것일까요?', 15, F4.solved[F4.i] ? '#166534' : MUTED, 'center', 800);
    T(p.x, MAIN.y + MAIN.h - 18, F4.solved[F4.i] ? '' : '작용기 단추에서 골라요', 13.5, MUTED, 'center', 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '구조식 읽는 법', 15, WARN, 'left', 800);
    const rows = [['OH', 'O가 H와 단일 결합으로 붙고, 그 O가 탄소에 붙어 있어요 (C–O–H).'], ['CHO', '탄소 한 개가 O와 이중 결합(C=O)을 하고 H도 붙어 있어요.'], ['COOH', '탄소 한 개에 C=O와 –OH가 함께 붙어 있어요.']];
    let yy = INFO.y + 52;
    rows.forEach(([g, s]) => { pill(INFO.x + 16 + 36, yy, GROUPTXT[g][0], { bg: GC[g], color: '#fff', border: null, size: 13.5 }); const h = textBlock(INFO.x + 100, yy + 4, INFO.w - 116, s, 13.5, INK, 17, 700); yy += Math.max(PHONE ? 40 : 30, h + 10); });
  }

  /* ---------- 입력 ---------- */
  const trayHit = (p) => trayAtoms().find((a) => Math.hypot(p.x - a.x, p.y - a.y) < a.r + 6);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'blocks') {
        for (let i = B.blocks.length - 1; i >= 0; i--) { const b = B.blocks[i]; if (pointInRect(p, b)) { B.drag = { b, ox: p.x - b.x, oy: p.y - b.y, sx: p.x, sy: p.y, moved: false }; return true; } }
      } else if (S.mode === 'build') {
        const a = trayHit(p);
        if (a) { A2.drag = { el: a.el, x: p.x, y: p.y, sx: p.x, sy: p.y, near: null }; return true; }
        const sl = a2Near(p); if (sl) { if (!a2Fill(A2.k, sl.id)) { /* 무시 */ } }
      } else if (S.mode === 'lab') {
        for (let i = 0; i < 3; i++) { const R = bottRect(i); if (pointInRect(p, { x: R.x - 4, y: R.y - 4, w: R.w + 8, h: R.h + 24 })) { Sound.click(); labSelect(SAMP[i]); return false; } }
      } else if (S.mode === 'sort') {
        const G = sGeo();
        const hit = CARDS.slice().reverse().find((c) => pointInRect(p, cardRect(c)));
        if (hit) { Q4.drag = { c: hit, ox: p.x - hit.x, oy: p.y - hit.y, sx: p.x, sy: p.y, moved: false, over: null }; return true; }
        const bx = G.boxes.find((b) => pointInRect(p, b));
        if (bx && Q4.sel) { placeCard(Q4.sel, bx.g); }
        else if (pointInRect(p, G.tray) && Q4.sel) { placeCard(Q4.sel, 'tray'); }
      }
      return false;
    },
    move(p) {
      if (B.drag) { const d = B.drag; d.b.x = clamp(p.x - d.ox, 0, VW - d.b.w); d.b.y = clamp(p.y - d.oy, 0, VH - d.b.h); if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; }
      if (A2.drag) { const d = A2.drag; d.x = p.x; d.y = p.y; const sl = a2Near(p, a2Geo().s * 0.6); d.near = sl && sl.el === d.el ? sl.id : null; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; }
      if (Q4.drag) { const d = Q4.drag; d.c.x = clamp(p.x - d.ox, 0, VW - sGeo().cw); d.c.y = clamp(p.y - d.oy, 0, VH - sGeo().ch); if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; const bx = sGeo().boxes.find((b) => pointInRect(p, b)); d.over = bx ? bx.g : null; }
    },
    up(p) {
      if (B.drag) {
        const d = B.drag; B.drag = null;
        if (!d.moved || pointInRect(p, bGeo().stage)) bApply(d.b.g);
      }
      if (A2.drag) {
        const d = A2.drag; A2.drag = null;
        const sl = a2Near(p, a2Geo().s * 0.6);
        if (sl && sl.el === d.el) a2Fill(A2.k, sl.id);
        else if (sl) { A2.shake = 0.4; Sound.fail(); showHint(d.el === 'H' ? '이 자리에는 산소(O)를 놓아야 해요.' : '이 자리에는 수소(H)를 놓아야 해요.', 2600); }
        else if (!d.moved) { /* 눌렀다 뗌: 이 구슬이 들어갈 첫 빈 자리에 놓기 */ const s0 = slotsOf(A2.k).find((a) => a.el === d.el && !A2.fill[A2.k][a.id] && slotAvail(A2.k, a.id)); if (s0) a2Fill(A2.k, s0.id); }
      }
      if (Q4.drag) {
        const d = Q4.drag; Q4.drag = null;
        const G = sGeo(), bx = G.boxes.find((b) => pointInRect(p, b));
        if (!d.moved) { Q4.sel = Q4.sel === d.c ? null : d.c; Sound.click(); }
        else if (bx) placeCard(d.c, bx.g);
        else if (pointInRect(p, G.tray)) placeCard(d.c, 'tray');
        else { sLayout(); }
      }
    },
    hover(p) {
      if (S.mode === 'blocks' && B.blocks.some((b) => pointInRect(p, b))) return 'grab';
      if (S.mode === 'build' && (trayHit(p) || a2Near(p))) return 'pointer';
      if (S.mode === 'lab') { for (let i = 0; i < 3; i++) if (pointInRect(p, bottRect(i))) return 'pointer'; }
      if (S.mode === 'sort' && CARDS.some((c) => pointInRect(p, cardRect(c)))) return 'grab';
      return '';
    },
  });
  function drawTrayDrag(t) {
    if (A2.drag && S.mode === 'build') { atomBall(A2.drag.x, A2.drag.y, (A2.drag.el === 'O' ? 0.29 : 0.215) * a2Geo().s * 1.15, A2.drag.el, { shadow: true }); }
  }

  /* ---------- 조작 장치 ---------- */
  makeChips($('#bkSel'), [['OH', '–OH 끼우기'], ['CHO', '–CHO 끼우기'], ['COOH', '–COOH 끼우기']], (g) => bApply(g));
  $('#bkReset').addEventListener('click', () => { Sound.click(); bReset(); });
  makeChips($('#mkSel'), BUILD.map((k) => [k, MOLS[k].name]), (k) => a2Select(k));
  const fIn = { C: $('#fC'), H: $('#fH'), O: $('#fO') };
  ['C', 'H', 'O'].forEach((e) => bindNum(fIn[e], (v, ch) => {
    const c = A2.cnt[A2.k]; c[e] = isNaN(v) ? NaN : Math.round(v);
    const f = FOR[A2.k];
    fIn[e].classList.toggle('ok', c[e] === f[e]); fIn[e].classList.toggle('bad', ch && !isNaN(c[e]) && c[e] !== f[e]);
    updateCtl();
  }));
  function syncInputs() {
    const c = A2.cnt[A2.k], f = FOR[A2.k];
    ['C', 'H', 'O'].forEach((e) => { fIn[e].value = isNaN(c[e]) ? '' : String(c[e]); fIn[e].classList.toggle('ok', c[e] === f[e]); fIn[e].classList.remove('bad'); });
  }
  makeChips($('#lbSamp'), SAMP.map((k) => [k, MOLS[k].name]), (k) => labSelect(k));
  makeChips($('#lbTest'), TESTS.map((k) => [k, TLAB[k]]), (k) => labPickTest(k));
  $('#lbRun').addEventListener('click', () => { Sound.click(); labStart(); });
  const TB = {};
  (function () {
    const host = $('#tblBox');
    SAMP.forEach((k) => {
      const d = document.createElement('div'); d.className = 'tbl-row';
      d.innerHTML = '<span class="lab"></span>'; d.firstChild.textContent = MOLS[k].name;
      const s1 = document.createElement('select'); s1.className = 'sel-in'; s1.setAttribute('aria-label', MOLS[k].name + ' 수용액의 액성');
      [['', '액성 고르기'], ['neutral', '중성'], ['acid', '산성']].forEach(([v, tx]) => { const o = document.createElement('option'); o.value = v; o.textContent = tx; s1.appendChild(o); });
      const s2 = document.createElement('select'); s2.className = 'sel-in'; s2.setAttribute('aria-label', MOLS[k].name + ' NaHCO₃ 기포');
      [['', '기포 고르기'], ['yes', '기포 있음'], ['no', '기포 없음']].forEach(([v, tx]) => { const o = document.createElement('option'); o.value = v; o.textContent = tx; s2.appendChild(o); });
      s1.addEventListener('change', () => { Sound.click(); TB[k].ph = s1.value; s1.classList.remove('bad', 'ok'); updateCtl(); });
      s2.addEventListener('change', () => { Sound.click(); TB[k].gas = s2.value; s2.classList.remove('bad', 'ok'); updateCtl(); });
      d.append(s1, s2); host.appendChild(d); TB[k] = { ph: '', gas: '', s1, s2 };
    });
  })();
  const tblOk = () => SAMP.every((k) => TB[k].ph === (k === 'acetic' ? 'acid' : 'neutral') && TB[k].gas === (k === 'acetic' ? 'yes' : 'no'));
  function tblMark() { SAMP.forEach((k) => { const a = TB[k].ph === (k === 'acetic' ? 'acid' : 'neutral'), b = TB[k].gas === (k === 'acetic' ? 'yes' : 'no'); TB[k].s1.classList.toggle('bad', !!TB[k].ph && !a); TB[k].s2.classList.toggle('bad', !!TB[k].gas && !b); TB[k].s1.classList.toggle('ok', a); TB[k].s2.classList.toggle('ok', b); }); }
  makeChips($('#fdSel'), [['OH', '–OH (알코올)'], ['CHO', '–CHO (알데하이드)'], ['COOH', '–COOH (카복실산)']], (g) => fAnswer(g));
  $('#sortReset').addEventListener('click', () => { Sound.click(); CARDS.forEach((c) => { c.loc = 'tray'; c.bad = false; }); Q4.sel = null; Q4.solved = false; sLayout(); updateCtl(); });

  function onLeave() { A2.drag = null; B.drag = null; Q4.drag = null; }
  function uiExtra() {
    markChips($('#bkSel'), B.key === 'ethane' ? '' : ({ ethanol: 'OH', acetaldehyde: 'CHO', acetic: 'COOH' }[B.key] || ''), B.made);
    markChips($('#mkSel'), A2.k, (function () { const o = {}; BUILD.forEach((k) => { o[k] = asmDone(k); }); return o; })());
    const full = asmDone(A2.k);
    ['C', 'H', 'O'].forEach((e) => { fIn[e].disabled = !full; });
    $('#mkNote').textContent = full ? '모형의 C, H, O 원자 개수를 세어 분자식을 써요.' : '모형을 먼저 완성하면 분자식을 쓸 수 있어요.';
    markChips($('#lbSamp'), L3.sel, (function () { const o = {}; SAMP.forEach((k) => { o[k] = TESTS.every((tt) => L3.res[k][tt]); }); return o; })());
    markChips($('#lbTest'), L3.test, (function () { const o = {}; TESTS.forEach((tt) => { o[tt] = L3.res[L3.sel][tt]; }); return o; })());
    $('#lbRun').disabled = !!L3.run;
    $('#lbRun').textContent = L3.run ? '시험 중…' : L3.res[L3.sel][L3.test] ? '▶ 다시 시험하기' : '▶ 시험하기';
    $$('#lbSamp button, #lbTest button').forEach((b) => { b.disabled = !!L3.run; });
    markChips($('#fdSel'), F4.sel, {});
    $$('#fdSel button').forEach((b) => { b.classList.toggle('bad', F4.sel === b.dataset.v && !F4.locked && MOLS[FQ[F4.i]].g !== b.dataset.v); b.disabled = F4.locked; });
    $('#sortNote').textContent = '남은 카드 ' + CARDS.filter((c) => c.loc === 'tray').length + '장 · 넣은 카드 ' + sortedN() + '장';
  }

  function readouts() {
    const m = S.mode;
    if (m === 'blocks') setRead('지금 분자', MOLS[B.key].name, '작용기', B.key === 'ethane' ? '없음' : GROUPTXT[MOLS[B.key].g][0], '만든 화합물', ['OH', 'CHO', 'COOH'].filter((g) => B.made[g]).length + ' / 3');
    else if (m === 'build') setRead('조립 중인 분자', MOLS[A2.k].name, '조립 완료', asmN() + ' / 6', '분자식 완성', cntN() + ' / 6');
    else if (m === 'lab') setRead('고른 시료', MOLS[L3.sel].name, '고른 시험', TLAB[L3.test].slice(2), '끝낸 시험', labDone() + ' / 12');
    else if (m === 'sort') setRead('넣은 카드', sortedN() + ' / 12', '맞게 넣음', CARDS.filter((c) => c.loc === c.g).length + ' / 12', '규칙 발견', Q4.solved ? '완료' : '대기');
    else setRead('푼 문제', fN() + ' / 3', '틀린 횟수', F4.wrongCnt + '번', '문제 분자', MOLS[FQ[F4.i]].cond);
  }

  /* ================= 미션 ================= */
  function resetBlocks() { B.made = { OH: false, CHO: false, COOH: false }; B.key = 'ethane'; mv1.set(SPEC.ethane, true); B.drag = null; bInit(); }
  function resetBuild() { BUILD.forEach((k) => { A2.fill[k] = {}; A2.cnt[k] = { C: NaN, H: NaN, O: NaN }; }); A2.pop = {}; a2Select('methanol'); }
  function resetLab() { SAMP.forEach((k) => { L3.res[k] = {}; L3.cls[k] = { ph: '', gas: '' }; L3.bar[k] = 0; SAMP.forEach(() => {}); TB[k].ph = ''; TB[k].gas = ''; TB[k].s1.value = ''; TB[k].s2.value = ''; TB[k].s1.className = 'sel-in'; TB[k].s2.className = 'sel-in'; }); L3.run = null; L3.sel = 'ethanol'; L3.test = 'water'; L3.bub.length = 0; L3.ind = 0; updateCtl(); }
  const levels = [
    {
      title: '일상의 화합물과 작용기', short: '일상의 화합물', icon: '🧬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 식초, 소독용 알코올, 포르말린은 모두 탄소 화합물인데 왜 성질이 이렇게 다를까?</p>' +
        '<div class="si-link">🔗 <b>통합과학·화학에서</b> 탄소 화합물은 탄소 골격에 수소, 산소 등이 공유 결합한 분자이고, 분자의 구조와 극성이 성질을 정한다고 배웠어요.</div>' +
        '<p>탄소 골격에 붙어서 화합물의 성질을 정하는 원자들의 무리를 <b>작용기</b>라고 해요. 이 차시에서는 <b>알코올(–OH), 알데하이드(–CHO), 카복실산(–COOH)</b> 세 가지만 다뤄요. 에테인(C₂H₆)의 끝 탄소에 작용기 블록을 끼워서 일상 속 화합물을 만들어 봐요.</p>',
      features: ['blocks'],
      setup() { resetBlocks(); setScene('blocks'); },
      recap: '탄소 골격이 같아도 끝에 붙은 작용기가 –OH, –CHO, –COOH로 다르면 에탄올, 아세트알데하이드, 아세트산처럼 서로 다른 화합물이 돼요.',
      summary: '<ul><li><b>작용기</b> : 탄소 화합물의 성질을 정하는 원자단. 이 단원에서는 알코올 <b>–OH</b> · 알데하이드 <b>–CHO</b> · 카복실산 <b>–COOH</b>만 다뤄요.</li><li>에테인 C₂H₆의 끝 탄소에 작용기를 끼우면 <b>에탄올 CH₃CH₂OH</b>, <b>아세트알데하이드 CH₃CHO</b>, <b>아세트산 CH₃COOH</b>가 돼요.</li><li>일상 속 예 : 손 소독제(에탄올), 식초(아세트산), 포르말린(폼알데하이드), 개미 독(폼산)</li><li>탄소 골격은 같아도 <b>작용기가 다르면 성질도 달라요.</b></li></ul>',
      missions: [
        {
          title: '작용기 블록 3종 끼우기',
          goal: '에테인에 <b>–OH, –CHO, –COOH</b> 블록을 하나씩 끼워 세 가지 화합물을 모두 만들어 보세요.',
          hint: '오른쪽 블록을 끌어서 분자 위에 놓거나, 블록을 눌러 보세요. 한 번에 한 가지씩 바꿀 수 있어요.',
          setup() { resetBlocks(); setScene('blocks'); },
          check: () => bFinish(), hold: 0.6,
          status: () => '–OH ' + mark(B.made.OH) + ' &nbsp;–CHO ' + mark(B.made.CHO) + ' &nbsp;–COOH ' + mark(B.made.COOH),
          explain: '에테인의 끝 탄소에서 H가 떨어지고 작용기가 붙었어요. <b>–OH</b>는 에탄올, <b>–CHO</b>는 아세트알데하이드, <b>–COOH</b>는 아세트산이에요. 탄소 골격(C–C)은 그대로예요.',
        },
        {
          type: 'quiz', title: '골격은 같고 작용기만 다르면?',
          goal: '탄소 골격(C–C)은 같고 <b>작용기만 다른</b> 에탄올, 아세트알데하이드, 아세트산의 성질은 어떨까요?',
          setup() { setScene('blocks'); },
          choices: ['탄소 골격이 같으므로 성질도 같아요', '작용기가 다르므로 성질도 달라요', '수소 원자 수만 달라서 성질은 같아요', '모두 액체이므로 성질이 같아요'],
          answer: 1,
          feedback: ['골격이 같아도 작용기가 달라지면 분자의 극성과 반응하는 방식이 달라져서 성질이 달라요.', '', '수소 수보다 중요한 것은 어떤 작용기가 붙어 있느냐예요.', '상온에서 액체인 것은 같을 수 있지만, 냄새 · 액성 · 반응성은 서로 달라요.'],
          explain: '성질을 정하는 것은 <b>작용기</b>예요. 같은 탄소 골격이라도 –OH는 중성인 알코올, –COOH는 신맛이 나는 산성인 카복실산을 만들어요. 그래서 일상의 화합물을 작용기로 분류할 수 있어요.',
        },
      ],
    },
    {
      title: '분자 모형과 화학식', short: '화학식 표현', icon: '🧪', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 작용기 블록으로 에탄올, 아세트알데하이드, 아세트산을 만들었어요. 이제 C1 ~ C2의 알코올 · 알데하이드 · 카복실산 <b>6가지</b> 분자를 직접 조립하고 화학식으로 나타내 봐요.</div>' +
        '<p>탄소 골격에 수소(H)와 산소(O) 구슬을 채우면 <b>구조식</b>이 완성돼요. 작용기는 색으로 표시돼요 (<b style="color:#2563eb">–OH 파랑</b>, <b style="color:#ea580c">–CHO 주황</b>, <b style="color:#dc2626">–COOH 빨강</b>). 모형의 원자 수를 세어 <b>분자식</b>을 쓰고, 줄여서 쓴 <b>시성식</b>과 비교해요.</p>',
      features: ['build'],
      setup() { resetBuild(); setScene('build'); },
      recap: '분자 모형(구조식)에서 작용기를 찾고, 원자 수를 세면 분자식(C₂H₄O₂ 등)을, 작용기를 드러내 쓰면 시성식(CH₃COOH 등)을 얻어요. 분자식만으로는 작용기를 알기 어려워 구조식이나 시성식이 필요해요.',
      summary: '<table class="mini"><tr><th>화합물</th><th>분자식</th><th>시성식</th><th>작용기</th></tr><tr><td>메탄올</td><td>CH₄O</td><td>CH₃OH</td><td>–OH</td></tr><tr><td>에탄올</td><td>C₂H₆O</td><td>CH₃CH₂OH</td><td>–OH</td></tr><tr><td>폼알데하이드</td><td>CH₂O</td><td>HCHO</td><td>–CHO</td></tr><tr><td>아세트알데하이드</td><td>C₂H₄O</td><td>CH₃CHO</td><td>–CHO</td></tr><tr><td>폼산</td><td>CH₂O₂</td><td>HCOOH</td><td>–COOH</td></tr><tr><td>아세트산</td><td>C₂H₄O₂</td><td>CH₃COOH</td><td>–COOH</td></tr></table><ul><li><b>분자식</b>은 원자의 종류와 수만, <b>시성식</b>은 작용기를 드러내고, <b>구조식</b>은 결합까지 나타내요.</li></ul>',
      missions: [
        {
          title: '분자 모형 6개 조립',
          goal: '메탄올, 폼알데하이드, 폼산, 에탄올, 아세트알데하이드, 아세트산의 <b>모형을 모두 완성</b>하세요.',
          hint: 'H 구슬이나 O 구슬을 끌어다 점선 칸에 놓거나, 점선 칸을 눌러 보세요. 산소가 먼저 들어가야 O–H의 H 칸이 열려요. 위쪽 단추로 분자를 바꿔요.',
          setup() { setScene('build'); },
          check: () => asmN() === 6, hold: 0.6,
          status: () => '조립한 분자 ' + asmN() + ' / 6 ' + mark(asmN() === 6),
          explain: '탄소는 결합을 4개 만들어요. 그래서 빈 자리를 H로 채우고, 작용기 부분에는 O를 붙여요. 폼알데하이드와 폼산은 탄소가 1개뿐이어서 가장 작은 알데하이드와 카복실산이에요.',
        },
        {
          title: '분자식 표 완성', manual: true,
          goal: '완성한 모형 6개마다 <b>C, H, O의 개수</b>를 세어 분자식을 써 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '모형에 보이는 구슬을 세요. 예를 들어 아세트산은 C 2개, H 4개, O 2개라서 C₂H₄O₂예요. 먼저 6개 모형을 모두 완성해야 해요.',
          setup() { setScene('build'); },
          check() {
            if (cntN() === 6) return true;
            const un = BUILD.filter((k) => !asmDone(k));
            if (un.length) return '아직 조립하지 않은 분자가 있어요 : ' + un.map((k) => MOLS[k].name).join(', ');
            const bad = BUILD.find((k) => !cntOk(k));
            const c = A2.cnt[bad];
            return '“' + MOLS[bad].name + '”의 분자식을 확인해 보세요. ' + (isNaN(c.C) || isNaN(c.H) || isNaN(c.O) ? '칸을 모두 채워 주세요.' : '모형의 C, H, O 구슬을 다시 세어 보세요.');
          },
          status: () => '분자식 완성 ' + cntN() + ' / 6 ' + mark(cntN() === 6),
          explain: '분자식 : 메탄올 CH₄O · 에탄올 C₂H₆O · 폼알데하이드 CH₂O · 아세트알데하이드 C₂H₄O · 폼산 CH₂O₂ · 아세트산 C₂H₄O₂. 분자식에는 작용기가 드러나지 않아서 구조식이나 시성식(CH₃COOH 등)으로 작용기를 나타내요.',
        },
        {
          type: 'quiz', title: 'CH₃COOH에서 작용기는?',
          goal: '아세트산의 시성식 <b>CH₃COOH</b>에서 <b>작용기에 해당하는 부분</b>은 어디일까요?',
          setup() { a2Select('acetic'); setScene('build'); },
          choices: ['CH₃– (탄소 골격 부분)', '–COOH (C=O와 –OH가 함께 붙은 부분)', '–OH 하나만', 'C–C 결합'],
          answer: 1,
          feedback: ['CH₃–는 탄소 골격(메틸기)이에요. 성질을 정하는 작용기는 반대쪽 끝이에요.', '', '–OH 하나만 보면 알코올로 착각하기 쉬워요. 카복실산은 같은 탄소에 C=O와 –OH가 함께 있는 –COOH 전체가 작용기예요.', 'C–C 결합은 탄소 골격이에요. 작용기가 아니에요.'],
          explain: '<b>–COOH</b>(카복실산의 작용기)는 한 탄소에 C=O와 –OH가 함께 붙어 있어요. 아세트산에서 CH₃–는 골격이고, –COOH가 신맛을 내는 산성의 원인이에요.',
        },
      ],
    },
    {
      title: '작용기에 따른 성질 탐구', short: '성질 탐구', icon: '🧫', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 가지 작용기를 화학식으로 나타냈어요. 이제 <b>에탄올(–OH), 아세트알데하이드(–CHO), 아세트산(–COOH)</b>의 성질이 정말 다른지 시험해 봐요.</div>' +
        '<p>① 물에 녹이기 ② 수용액의 pH ③ NaHCO₃(탄산수소 나트륨)과의 반응 ④ 끓는점을 시료마다 측정해요. 작용기가 극성이라 분자 사이의 인력이 커서 끓는점이 에테인보다 높은 것도 확인해요.</p>' +
        '<p>⚠️ <b>안전</b> : 실제 실험에서는 보안경과 장갑을 착용하고 환기하며, 시약의 냄새를 직접 맡지 않아요. 실험이 끝난 뒤 남은 물질은 화학 실험실 폐수 기준에 따라 지정된 용기에 모아요. 여기서는 모의실험으로 안전하게 해 봐요.</p>',
      features: ['lab'],
      setup() { resetLab(); S.gate = ''; setScene('lab'); },
      recap: '에탄올, 아세트알데하이드, 아세트산은 모두 물에 잘 섞이지만, 수용액이 산성이고 NaHCO₃와 반응해 CO₂ 기포를 내는 것은 카복실산(–COOH)뿐이에요. 끓는점은 세 가지 모두 작용기가 없는 에테인보다 높아요.',
      summary: '<table class="mini"><tr><th>시료(작용기)</th><th>물</th><th>0.10 M pH</th><th>NaHCO₃</th><th>끓는점</th></tr><tr><td>에탄올(–OH)</td><td>잘 섞임</td><td>≈ 7 중성</td><td>기포 없음</td><td>78 °C</td></tr><tr><td>아세트알데하이드(–CHO)</td><td>잘 섞임</td><td>≈ 7 중성</td><td>기포 없음</td><td>20 °C</td></tr><tr><td>아세트산(–COOH)</td><td>잘 섞임</td><td>2.87 약산성</td><td>CO₂ 기포</td><td>118 °C</td></tr></table><ul><li>카복실산만 수용액이 <b>산성</b>이에요 (약산, 단원 53의 아세트산 K<sub>a</sub> = 1.8×10⁻⁵).</li><li>에테인(−89 °C)보다 끓는점이 높은 까닭 : 극성인 작용기 때문에 분자 사이의 인력이 커요.</li></ul>',
      missions: [
        {
          title: '시료 3종 × 시험 4개 측정',
          goal: '에탄올 · 아세트알데하이드 · 아세트산을 <b>물에 녹이기, pH, NaHCO₃, 끓는점</b> 네 가지 시험으로 모두 측정하세요. (12개)',
          hint: '시료를 고르고, 시험을 고른 뒤 “▶ 시험하기”를 눌러요. 시료병을 눌러도 시료를 바꿀 수 있어요. 시험 하나가 끝날 때까지 기다려 주세요.',
          setup() { S.gate = ''; setScene('lab'); },
          check: () => labDone() === 12, hold: 0.5,
          status: () => '끝낸 시험 ' + labDone() + ' / 12 ' + mark(labDone() === 12),
          explain: '세 시료는 모두 극성이라 물에 잘 섞여요. 그러나 수용액이 산성인 것은 아세트산뿐이고, NaHCO₃와 반응해 CO₂ 기포를 내는 것도 아세트산뿐이에요. 같은 탄소 2개 화합물인데도 작용기에 따라 성질이 달라요.',
        },
        {
          title: '결과 표 정리', manual: true,
          goal: '시료마다 <b>수용액의 액성</b>과 <b>NaHCO₃ 기포</b> 결과를 골라 표를 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '앞에서 측정한 pH 값을 떠올려요. 중성(pH 약 7) / 산성(pH 7보다 작음). 기포는 CO₂가 나오는지 보아요. 아래 결과표도 참고해요.',
          setup() { S.gate = 'tbl'; setScene('lab'); updateCtl(); },
          check() { tblMark(); if (tblOk()) return true; const bad = SAMP.find((k) => TB[k].ph !== (k === 'acetic' ? 'acid' : 'neutral') || TB[k].gas !== (k === 'acetic' ? 'yes' : 'no')); return TB[bad].ph === '' || TB[bad].gas === '' ? '모든 칸을 골라 주세요.' : '“' + MOLS[bad].name + '”의 결과를 다시 확인해 보세요. 빨간 칸이 틀린 곳이에요.'; },
          status: () => '맞게 고른 시료 ' + SAMP.filter((k) => TB[k].ph === (k === 'acetic' ? 'acid' : 'neutral') && TB[k].gas === (k === 'acetic' ? 'yes' : 'no')).length + ' / 3',
          explain: '에탄올과 아세트알데하이드는 중성이고 기포가 없어요. 아세트산은 pH 2.87의 약한 산성이고 NaHCO₃와 반응해 CO₂ 기포를 내요.',
        },
        {
          type: 'quiz', title: '아세트산만 기포를 만드는 까닭',
          goal: 'NaHCO₃에 넣었을 때 <b>아세트산만 CO₂ 기포</b>가 생겼어요. 그 까닭은?',
          setup() { S.gate = ''; L3.test = 'gas'; L3.sel = 'acetic'; setScene('lab'); updateCtl(); },
          choices: ['아세트산은 분자 크기가 가장 커서', '–COOH가 수소 이온(H⁺)을 내놓는 산성 작용기라서 NaHCO₃와 반응하기 때문에', '아세트산의 끓는점이 가장 높아서', '탄소 원자가 2개 들어 있어서'],
          answer: 1,
          feedback: ['에탄올과 아세트알데하이드도 탄소가 2개인 작은 분자예요. 크기가 이유가 아니에요.', '', '끓는점은 상태 변화와 관련이 있고 산성 여부와는 직접적인 관련이 없어요.', '탄소 수는 셋 다 2개로 같아요. 달라진 것은 작용기예요.'],
          explain: '<b>–COOH</b>는 물에 녹아 H⁺를 조금 내놓는 <b>산성 작용기</b>예요. 이 H⁺가 NaHCO₃와 반응해 H₂O와 CO₂를 만들어요. –OH와 –CHO는 H⁺를 내놓지 않아 반응하지 않아요.',
        },
      ],
    },
    {
      title: '작용기로 분류하기', short: '분류하기', icon: '🗂', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 작용기에 따라 성질(액성 · 반응 · 끓는점)이 달라지는 것을 확인했어요. 이제 <b>구조식에서 작용기를 찾아</b> 화합물을 분류해 봐요.</div>' +
        '<p>카드 12장(화합물 9장 + 쓰임 3장)을 알코올, 알데하이드, 카복실산 상자에 나눠 넣어요. 분류가 끝나면 <b>같은 작용기를 가진 화합물의 규칙</b>을 발견하게 돼요. 이어서 구조식을 보고 작용기를 직접 찾아봐요.</p>',
      features: ['sort', 'find'],
      setup() { CARDS.forEach((c) => { c.loc = 'tray'; c.bad = false; }); Q4.solved = false; Q4.sel = null; sLayout(); CARDS.forEach((c) => { c.x = c.tx; c.y = c.ty; }); F4.solved = [false, false, false]; F4.wrongCnt = 0; fSetQ(0); setScene('sort'); },
      recap: '화합물은 구조식에서 찾은 작용기에 따라 알코올 · 알데하이드 · 카복실산으로 분류할 수 있어요. 작용기가 같으면 성질이 비슷하고, 탄소 수가 늘면 끓는점이 높아져요.',
      summary: '<ul><li><b>알코올(–OH)</b> : 메탄올 · 에탄올 · 1-프로판올 / 소독용 에탄올</li><li><b>알데하이드(–CHO)</b> : 폼알데하이드 · 아세트알데하이드 · 프로판알 / 방부제 포르말린</li><li><b>카복실산(–COOH)</b> : 폼산 · 아세트산 · 프로판산 / 식초</li><li>같은 작용기의 화합물 : 탄소 수가 늘수록 끓는점이 높아져요 (알코올 65 → 78 → 97 °C).</li><li>산소와 탄소가 들어 있다고 모두 같은 종류가 아니에요. <b>어떤 작용기</b>가 있는지가 종류를 정해요.</li></ul>',
      missions: [
        {
          title: '카드 12장 분류하기', manual: true,
          goal: '카드 12장을 <b>알코올 · 알데하이드 · 카복실산</b> 상자에 알맞게 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드의 시성식에서 끝부분을 보세요. –OH로 끝나면 알코올, –CHO(HCHO 포함)이면 알데하이드, –COOH(HCOOH 포함)이면 카복실산이에요. 쓰임 카드는 ( ) 안의 물질을 보세요.',
          setup() { setScene('sort'); },
          check() {
            if (sortedN() < 12) return '아직 상자에 넣지 않은 카드가 ' + (12 - sortedN()) + '장 있어요.';
            const w = sortWrong();
            if (w.length === 0) { Q4.solved = true; return true; }
            w.forEach((c) => { if (!c.bad) c.bad = true; });
            return '잘못 들어간 카드가 ' + w.length + '장 있어요. 빨간 카드의 작용기를 다시 확인해 보세요.';
          },
          status: () => '넣은 카드 ' + sortedN() + ' / 12 · 맞게 넣음 ' + CARDS.filter((c) => c.loc === c.g).length + ' / 12',
          explain: '작용기가 같은 화합물끼리 모이면 성질이 비슷해요. 알코올 : 메탄올 · 에탄올 · 1-프로판올 · 소독용 에탄올 / 알데하이드 : 폼알데하이드 · 아세트알데하이드 · 프로판알 · 방부제 폼알데하이드 / 카복실산 : 폼산 · 아세트산 · 프로판산 · 식초 속 아세트산.',
        },
        {
          title: '구조식 보고 작용기 찾기',
          goal: '<b>1-프로판올, 프로판알, 프로판산</b>의 구조식에서 작용기를 찾아 고르세요. (3문제)',
          hint: 'O가 H와만 붙어 있으면 –OH, 탄소에 C=O와 H가 함께 있으면 –CHO, 탄소에 C=O와 –OH가 함께 있으면 –COOH예요.',
          setup() { F4.solved = [false, false, false]; F4.wrongCnt = 0; fSetQ(0); setScene('find'); },
          check: () => fN() === 3, hold: 0.9,
          status: () => '푼 문제 ' + fN() + ' / 3 ' + mark(fN() === 3),
          explain: 'CH₃CH₂CH₂OH는 끝에 –OH가 있는 알코올, CH₃CH₂CHO는 –CHO가 있는 알데하이드, CH₃CH₂COOH는 –COOH가 있는 카복실산이에요. 탄소가 3개로 늘어도 작용기가 종류를 정해요.',
        },
        {
          type: 'quiz', title: 'C와 O가 있으면 모두 같은 종류?',
          goal: 'CH₃CH₂OH와 CH₃COOH는 둘 다 C, H, O로 이루어져 있어요. 그렇다면 <b>같은 종류의 화합물</b>일까요?',
          setup() { setScene('sort'); },
          choices: ['둘 다 C, H, O로 되어 있으므로 같은 종류예요', '작용기가 –OH와 –COOH로 달라서 서로 다른 종류(알코올, 카복실산)예요', '탄소 수가 같으면 무조건 같은 종류예요', '산소가 들어 있으면 모두 알코올이에요'],
          answer: 1,
          feedback: ['같은 원소로 이루어져도 어떤 작용기로 연결되어 있느냐에 따라 종류와 성질이 달라요.', '', '탄소 수가 같아도 작용기가 다르면 다른 종류예요. 에탄올과 아세트산은 탄소가 둘 다 2개지만 종류가 달라요.', '산소가 있어도 –CHO(알데하이드)나 –COOH(카복실산)일 수 있어요. 어떤 작용기인지 확인해야 해요.'],
          explain: '화합물의 종류는 구성 원소가 아니라 <b>작용기</b>로 정해요. –OH는 알코올, –COOH는 카복실산이므로 성질이 크게 달라요 (알코올은 중성, 카복실산은 산성).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-functional-group', mount: '#game', badge: '작용기 탐정', homeHref: '../../index.html#hr',
    featureLabels: { blocks: '🧩 작용기 블록 · 분자 변화', build: '🧪 분자 모형 상자 · 분자식 쓰기', lab: '🧫 시료 시험 · 결과표', sort: '🗂 카드 분류 상자', find: '🔎 작용기 찾기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('blocks');
  a2Select('methanol');
  function stepAll1(dt) {
    mv1.update(dt); A2.mv.update(dt); F4.mv.update(dt);
    { const G = bGeo(); B.blocks.forEach((b, i) => { if (B.drag && B.drag.b === b) return; const h = G.home(i); b.x = RM ? h.x : ap(b.x, h.x, dt, 14); b.y = RM ? h.y : ap(b.y, h.y, dt, 14); }); }
    A2.shake = Math.max(0, A2.shake - dt); F4.shake = Math.max(0, F4.shake - dt);
    stepLab(dt); stepSort(dt);
    // 끓는점 막대
    const r = L3.run;
    SAMP.forEach((k) => { const tgt = L3.res[k].bp ? MOLS[k].bp : (r && r.k === k && r.test === 'bp' ? MOLS[k].bp * sm(clamp(r.t, 0, 1)) : 0); L3.bar[k] = RM ? tgt : ap(L3.bar[k], tgt, dt, 6); });
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'blocks') drawBlocks(t); else if (S.mode === 'build') drawBuild(t); else if (S.mode === 'lab') drawLab(t); else if (S.mode === 'sort') drawSort(t); else drawFind(t);
    drawTrayDrag(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, B, A2, L3, Q4, F4, CARDS, SPEC, FOR, MOLS, VW, VH, PHONE, MAIN, INFO,
    bApply, bReset, bFinish, a2Select, a2Fill, asmDone, asmN, cntN, cntOk, slotsOf, labStart, labSelect, labPickTest, labDone, placeCard, sortAll, sortWrong, fAnswer, fN, fSetQ, sLayout, sGeo, a2Geo, a2Scr, bGeo, bottRect, trayAtoms, TB, tblOk,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
