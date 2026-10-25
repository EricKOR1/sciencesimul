/* 알코올의 산화와 음주 측정기 - 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 */
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
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
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

  /* ===== 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 - 알코올의 산화와 음주 측정기 [12반응03-02]
     ① 관찰: 에탄올 → 아세트알데하이드 → 아세트산 (작용기 변화)  ② 분석: 산화수 추적 · 전자 수 맞추기
     ③ 실험: 음주 측정기 (교사 시연 · 모의실험)  ④ 적용: 몸속 분해 (아세트알데하이드 축적 · 메탄올 독성)
     알켄 · 에스터 · 케톤(2차 알코올)은 다루지 않아요. ===== */
  const MODE_LABEL = { stages: '🍷 작용기 변화 따라가기', ox: '🔢 산화수 추적', tube: '🧪 음주 측정기 (모의실험)', liver: '🫀 몸속 분해' };
  const SPEC = {}; Object.keys(MOLS).forEach((k) => { SPEC[k] = molSpec(k); });
  const FOR = {}; Object.keys(MOLS).forEach((k) => { FOR[k] = molFormula(SPEC[k]); });
  const SK = ['ethanol', 'acetaldehyde', 'acetic'];
  const ORANGE = '#f59e0b', GREEN = '#2f9e44', CRO = '#ea7a0c';
  const OXN = [-1, 1, 3];
  const PROP = [
    { odor: '소독용 알코올 냄새', acid: '중성', ph: '≈ 7', gname: '알코올', gf: '–CH₂OH', col: GC.OH },
    { odor: '자극적인 냄새 · 독성 (숙취의 원인)', acid: '중성', ph: '≈ 7', gname: '알데하이드', gf: '–CHO', col: GC.CHO },
    { odor: '시큼한 식초 냄새 · 신맛', acid: '산성(약산)', ph: '2.87', gname: '카복실산', gf: '–COOH', col: GC.COOH },
  ];

  /* ============ ① 작용기 변화 ============ */
  const A1 = { stage: 0, visited: [true, false, false], mv: new MolView(), lab: ['', '', ''], flask: 0, ind: 0, msg: '', moves: 0 };
  A1.mv.set(SPEC.ethanol, true);
  const a1Msgs = [
    '에탄올 CH₃CH₂OH : –CH₂OH 부분에 O–H가 있어요.',
    '산화 : 탄소의 H와 O–H의 H, 모두 H 2개가 빠지고 O는 C=O가 돼요. (C₂H₆O → C₂H₄O)',
    '산화 : H 1개가 빠지고 –OH가 붙어 –COOH가 돼요. 산소가 1개 늘었어요. (C₂H₄O → C₂H₄O₂)',
  ];
  function a1Go(i) {
    i = clamp(i, 0, 2); if (i === A1.stage) return;
    const fwd = i > A1.stage; A1.stage = i; A1.visited[i] = true; A1.mv.set(SPEC[SK[i]], false);
    A1.msg = fwd ? a1Msgs[i] : '거꾸로 보면 : ' + (i === 0 ? '에탄올로 되돌려 봐요 (환원 방향).' : '아세트알데하이드 모형으로 되돌려 봐요.');
    Sound.tick(); const g = a1Geo(); flash(g.mol.x, g.mol.y, [PROP[i].col, '#fbbf24', '#ffffff']); updateCtl();
  }
  function a1Reset() { A1.stage = 0; A1.visited = [true, false, false]; A1.mv = new MolView(); A1.mv.set(SPEC.ethanol, true); A1.msg = a1Msgs[0]; A1.lab = ['', '', '']; $$('#lbSel select').forEach((s) => { s.value = ''; s.className = 'sel-in'; }); updateCtl(); }
  const a1Geo = () => PHONE
    ? { mol: { x: 240, y: 178 }, s: 54, track: { y: 80 }, flask: { x: 410, y: 440 } }
    : { mol: { x: 280, y: 226 }, s: 62, track: { y: 84 }, flask: { x: 660, y: 322 } };
  function drawStages(t) {
    const G = a1Geo();
    T(14, 26, '🍷 에탄올이 산화되면 작용기가 어떻게 바뀔까요?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 단계 표시줄
    const names = ['① 에탄올', '② 아세트알데하이드', '③ 아세트산'];
    const tw = PHONE ? 148 : 190, gap = PHONE ? 8 : 20, tx0 = MAIN.x + (MAIN.w - (3 * tw + 2 * gap)) / 2;
    for (let i = 0; i < 3; i++) {
      const x = tx0 + i * (tw + gap + (PHONE ? 0 : 0)), y = MAIN.y + 20, cur = A1.stage === i, vis = A1.visited[i];
      D.roundRect(x, y, tw, 34, 17); ctx.fillStyle = cur ? PROP[i].col : vis ? C.rgba(PROP[i].col, 0.14) : '#eef2f7'; ctx.fill(); ctx.strokeStyle = vis ? PROP[i].col : '#cbd5e1'; ctx.lineWidth = cur ? 3 : 1.6; ctx.stroke();
      T(x + tw / 2, y + 22, names[i], PHONE ? 13 : 14, cur ? '#fff' : vis ? INK : '#94a3b8', 'center', 800);
      if (i < 2) { D.arrow(x + tw + 2, y + 17, x + tw + gap - 2, y + 17, { color: A1.visited[i + 1] ? '#64748b' : '#cbd5e1', width: 2.4, head: 7 }); if (!PHONE) T(x + tw + gap / 2, y + 2, '[O]', 12.5, '#94a3b8', 'center', 800); }
    }
    A1.mv.draw(G.mol.x, G.mol.y, G.s, { hlLabel: true });
    pill(G.mol.x, MAIN.y + MAIN.h - (PHONE ? 176 : 74), MOLS[SK[A1.stage]].name + '  ' + FOR[SK[A1.stage]].text + '  ·  ' + MOLS[SK[A1.stage]].cond, { bg: '#fff', color: INK, border: PROP[A1.stage].col, size: PHONE ? 13.5 : 15 });
    textBlock(MAIN.x + 18, MAIN.y + MAIN.h - (PHONE ? 148 : 46), (PHONE ? 330 : 500), A1.msg || a1Msgs[0], PHONE ? 13.5 : 14, MUTED, 18, 700);
    // 플라스크 (수용액 + 지시약)
    const fx = G.flask.x, fy = G.flask.y;
    const targetC = A1.stage === 2 ? 1 : 0;
    const indCol = C.mix('#4ade80', '#f97316', A1.ind);
    D.flask(fx, fy, PHONE ? 76 : 108, PHONE ? 84 : 118, { level: 0.5, liquid: indCol, t });
    if (!PHONE) T(fx, fy + 18, '지시약 + ' + MOLS[SK[A1.stage]].name + ' 수용액', 13, MUTED, 'center', 800);
    T(fx, fy + (PHONE ? 20 : 36), A1.stage === 2 ? '산성 → 주황색' : '중성 → 초록색', 13.5, A1.stage === 2 ? '#c2410c' : '#166534', 'center', 800);
    if (!PHONE) { T(fx, MAIN.y + 96 + 40, '🍷 → 🍶', 20, INK, 'center', 700); textBlock(MAIN.x + MAIN.w - 228, MAIN.y + 124 + 40, 204, '와인을 오래 두면 미생물의 효소가 에탄올을 아세트산으로 산화해 식초가 돼요.', 13, MUTED, 17, 700, 'left'); }
    // 성질표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const cw = PHONE ? INFO.w - 24 : (INFO.w - 24 - 20) / 3, ch = PHONE ? 80 : 120;
    for (let i = 0; i < 3; i++) {
      const x = INFO.x + 12 + (PHONE ? 0 : i * (cw + 10)), y = INFO.y + 12 + (PHONE ? i * (ch + 8) : 0), cur = A1.stage === i, vis = A1.visited[i];
      D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = cur ? C.rgba(PROP[i].col, 0.1) : '#f8fafc'; ctx.fill(); ctx.strokeStyle = cur ? PROP[i].col : '#e2e8f0'; ctx.lineWidth = cur ? 3 : 1.4; ctx.stroke();
      if (!vis) { T(x + cw / 2, y + ch / 2 + 5, '🔒 산화시키면 열려요', 14, '#94a3b8', 'center', 800); continue; }
      T(x + 12, y + 22, MOLS[SK[i]].name, 14.5, INK, 'left', 800);
      if (PHONE) D.label(x + cw - 8, y + 18, PROP[i].gf + ' ' + PROP[i].gname, { bg: PROP[i].col, color: '#fff', size: 12.5, align: 'right', pad: 7 });
      else D.label(x + 12, y + 42, PROP[i].gf + ' ' + PROP[i].gname, { bg: PROP[i].col, color: '#fff', size: 12.5, align: 'left', pad: 7 });
      textBlock(x + 12, y + (PHONE ? 46 : 68), cw - 22, '냄새 : ' + PROP[i].odor, 13, MUTED, 16.5, 700);
      const ay = y + (PHONE ? 68 : 110);
      D.roundRect(x + 12, ay - 13, 14, 14, 3); ctx.fillStyle = i === 2 ? '#f97316' : '#4ade80'; ctx.fill();
      T(x + 32, ay, '액성 : ' + PROP[i].acid + ' (pH ' + PROP[i].ph + ')', 13.5, i === 2 ? '#b91c1c' : '#166534', 'left', 800);
    }
  }
  function stepStages(dt) { A1.mv.update(dt); A1.ind = ap(A1.ind, A1.stage === 2 ? 1 : 0, dt, 3); }

  /* ============ ② 산화수 추적 ============ */
  const O2 = { v: [NaN, NaN, NaN], mvs: SK.map(() => new MolView()), tok: [0, 0, 0], n: 1, k: 1, pop: 0, ring: 0, bal: false };
  SK.forEach((k, i) => O2.mvs[i].set(SPEC[k], true));
  const o2Ok = (i) => O2.v[i] === OXN[i];
  const o2All = () => [0, 1, 2].every(o2Ok);
  const o2Lost = () => 2 * O2.n, o2Gain = () => 6 * O2.k;
  const o2Bal = () => o2Lost() === o2Gain();
  function o2Set(i, v) { O2.v[i] = v; updateCtl(); }
  const AXMIN = -3, AXMAX = 4;
  const o2Geo = () => PHONE
    ? { cells: [0, 1, 2].map((i) => ({ x: MAIN.x + 8, y: MAIN.y + 8 + i * 92, w: MAIN.w - 16, h: 86 })), s: 30, axis: { x: MAIN.x + 34, y: MAIN.y + 356, w: MAIN.w - 68 } }
    : { cells: [0, 1, 2].map((i) => ({ x: MAIN.x + 8 + i * 256, y: MAIN.y + 8, w: 248, h: 176 })), s: 40, axis: { x: MAIN.x + 60, y: MAIN.y + 278, w: MAIN.w - 120 } };
  const axX = (v) => { const a = o2Geo().axis; return a.x + (v - AXMIN) / (AXMAX - AXMIN) * a.w; };
  function drawOx(t) {
    const G = o2Geo();
    T(14, 26, '🔢 작용기 탄소의 산화수가 어떻게 변할까요?', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    G.cells.forEach((c, i) => {
      const ok = o2Ok(i), set = !isNaN(O2.v[i]);
      D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = PROP[i].col; ctx.lineWidth = 1.8; ctx.stroke();
      T(c.x + 12, c.y + 22, MOLS[SK[i]].name, 14.5, INK, 'left', 800);
      D.label(c.x + c.w - 8, c.y + 18, PROP[i].gf, { bg: PROP[i].col, color: '#fff', size: 13, align: 'right', pad: 7 });
      const mcx = PHONE ? c.x + 150 : c.x + c.w / 2, mcy = PHONE ? c.y + 52 : c.y + 92;
      O2.mvs[i].draw(mcx, mcy, G.s, { hl: true });
      // 작용기 탄소 표시
      const mv = O2.mvs[i], a = mv.atoms['C1'];
      if (a) { const px = mcx + (a.x - mv.cx) * G.s, py = mcy + (a.y - mv.cy) * G.s; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(px, py, 0.4 * G.s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      // 값 배지
      const bx = PHONE ? c.x + c.w - 62 : c.x + c.w / 2, by = PHONE ? c.y + 56 : c.y + c.h - 18;
      pill(bx, by, '탄소 산화수 ' + (set ? oxs(O2.v[i]) : '?'), { bg: set ? (ok ? '#dcfce7' : '#fee2e2') : '#fff', color: set ? (ok ? '#166534' : '#b91c1c') : MUTED, border: set ? (ok ? '#4ade80' : '#f87171') : '#cbd5e1', size: PHONE ? 12.5 : 14, scale: 1 + 0.15 * (i === O2.ring ? O2.pop : 0) });
    });
    // 눈금
    const a = G.axis, ay = a.y;
    T(MAIN.x + 14, ay + 46, '산화수 눈금 (보라 점선 원 = 산화수를 읽는 탄소, 오른쪽일수록 커져요)', 13.5, WARN, 'left', 800);
    D.arrow(a.x - 10, ay, a.x + a.w + 16, ay, { color: '#64748b', width: 3, head: 10 });
    for (let v = AXMIN; v <= AXMAX; v++) { const x = axX(v); ctx.fillStyle = '#475569'; ctx.fillRect(x - 1, ay - 5, 2, 10); T(x, ay + 24, v > 0 ? '+' + v : v < 0 ? MINUS + (-v) : '0', 14, MUTED, 'center', 800); }
    for (let i = 0; i < 3; i++) {
      if (isNaN(O2.v[i])) continue;
      const x = axX(clamp(O2.tok[i], AXMIN, AXMAX)), ok = o2Ok(i);
      D.sphere(x, ay - 22 - (i % 2) * 2, 15, ok ? PROP[i].col : '#94a3b8', { text: ['①', '②', '③'][i], textScale: 1.0, outline: ok ? '#fff' : null, outlineWidth: 2 });
    }
    // 전자 화살표
    for (let i = 0; i < 2; i++) {
      if (!(o2Ok(i) && o2Ok(i + 1))) continue;
      const x1 = axX(OXN[i]), x2 = axX(OXN[i + 1]);
      D.arrow(x1 + 14, ay - 46, x2 - 14, ay - 46, { color: '#dc2626', width: 3, head: 9 });
      pill((x1 + x2) / 2, ay - 66, '전자 2개 잃음 (산화)', { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', size: 13 });
    }
    // INFO : 전자 저울
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    drawEBal(t);
  }
  function drawEBal(t) {
    const R = INFO, n = O2.n, k = O2.k, lost = o2Lost(), gain = o2Gain(), bal = o2Bal();
    T(R.x + 16, R.y + 22, '전자 수 맞추기 : 에탄올 → 아세트알데하이드 (산화제 Cr₂O₇²⁻ 사용)', 14, WARN, 'left', 800);
    const midX = R.x + R.w / 2, baseY = R.y + (PHONE ? 118 : 100);
    const lx = PHONE ? R.x + 16 : R.x + 24, rx = PHONE ? R.x + R.w / 2 + 10 : R.x + R.w - 300;
    // 에탄올 분자 (최대 6)
    for (let q = 0; q < 6; q++) {
      const on = q < n, x = lx + (q % 3) * (PHONE ? 70 : 84), y = R.y + (PHONE ? 54 : 34) + Math.floor(q / 3) * (PHONE ? 52 : 40);
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.15;
      D.roundRect(x, y, PHONE ? 64 : 76, PHONE ? 40 : 34, 10); ctx.fillStyle = '#eff6ff'; ctx.fill(); ctx.strokeStyle = GC.OH; ctx.lineWidth = 1.6; ctx.stroke();
      T(x + (PHONE ? 32 : 38), y + (PHONE ? 16 : 14), 'CH₃CH₂OH', PHONE ? 11.5 : 12.5, INK, 'center', 800);
      if (on) { eBall(x + (PHONE ? 22 : 26), y + (PHONE ? 31 : 26), 6.5); eBall(x + (PHONE ? 42 : 50), y + (PHONE ? 31 : 26), 6.5); }
      ctx.restore();
    }
    // Cr2O7 (최대 3)
    for (let q = 0; q < 3; q++) {
      const on = q < k, x = rx + q * (PHONE ? 70 : 86), y = R.y + (PHONE ? 54 : 34);
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.15;
      D.roundRect(x, y, PHONE ? 64 : 78, PHONE ? 40 : 34, 10); ctx.fillStyle = '#fff7ed'; ctx.fill(); ctx.strokeStyle = CRO; ctx.lineWidth = 1.6; ctx.stroke();
      T(x + (PHONE ? 32 : 39), y + (PHONE ? 16 : 14), 'Cr₂O₇²⁻', PHONE ? 12 : 13, INK, 'center', 800);
      if (on) for (let e = 0; e < 6; e++) eBall(x + 9 + e * (PHONE ? 9.4 : 12), y + (PHONE ? 31 : 26), 4.6);
      ctx.restore();
    }
    const ty = R.y + R.h - (PHONE ? 62 : 12);
    T(lx, ty, '잃는 전자 : 2 × ' + n + ' = ' + lost + '개', PHONE ? 13.5 : 15, GC.OH, 'left', 800);
    T(PHONE ? lx : rx, PHONE ? ty + 22 : ty, '얻는 전자 : 6 × ' + k + ' = ' + gain + '개 (Cr ' + MINUS + '1개당 3개)', PHONE ? 13.5 : 15, CRO, 'left', 800);
    // 저울 표시
    const sx = PHONE ? R.x + R.w - 70 : midX - 8, sy = R.y + (PHONE ? 150 : 72);
    const ang = clamp((lost - gain) / Math.max(lost, gain, 1), -1, 1) * 0.28;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-ang); ctx.strokeStyle = bal ? GOODC : '#475569'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(sx, sy + 3); ctx.lineTo(sx - 9, sy + 26); ctx.lineTo(sx + 9, sy + 26); ctx.closePath(); ctx.fill();
    if (bal) D.check(sx, sy - 24, 11, 1);
    if (!PHONE) T(midX - 8, R.y + R.h - 28, bal ? '전자 수 같음' : '전자 수 다름', 13.5, bal ? '#166534' : '#b91c1c', 'center', 800);
    else pill(R.x + R.w - 70, R.y + R.h - 20, bal ? '전자 수 같음' : '전자 수 다름', { bg: bal ? '#dcfce7' : '#fee2e2', color: bal ? '#166534' : '#b91c1c', border: null, size: 12.5 });
  }
  function stepOx(dt) {
    O2.mvs.forEach((m) => m.update(dt));
    for (let i = 0; i < 3; i++) { const tgt = isNaN(O2.v[i]) ? 0 : O2.v[i]; O2.tok[i] = RM ? tgt : ap(O2.tok[i], tgt, dt, 7); }
    O2.pop = Math.max(0, O2.pop - dt * 2.5);
    const b = o2Bal();
    if (b && !O2.bal) { O2.bal = true; const R = INFO; flash(R.x + R.w / 2, R.y + 70, ['#fbbf24', '#14a058', '#fff']); } if (!b && O2.bal) O2.bal = false;
  }

  /* ============ ③ 음주 측정기 ============ */
  const CMAX = 0.30, CREF = 0.15;
  const PEOPLE = { A: 0.08, B: 0.21, C: 0.12 };
  const MEAS = [0.05, 0.15, 0.25];
  const T3 = { c: 0.15, person: '', front: 0, target: 0, blow: 0, blowing: false, meas: [false, false, false], judge: { A: '', B: '', C: '' }, vap: [], read: null, spawnAcc: 0, mark: null };
  const tubeG = () => PHONE ? { x0: MAIN.x + 92, L: 340, y: MAIN.y + 156, h: 50 } : { x0: MAIN.x + 130, L: 560, y: MAIN.y + 140, h: 58 };
  const cNow = () => (T3.person ? PEOPLE[T3.person] : T3.c);
  const seenAll = () => T3.meas.every(Boolean);
  const um = (c) => c / 46 * 1000;
  function t3SetC(v) { if (T3.blowing) return; T3.person = ''; T3.c = clamp(Math.round(v * 100) / 100, 0, CMAX); updateCtl(); }
  function t3Person(p) { if (T3.blowing) return; T3.person = p; T3.front = 0; T3.read = null; updateCtl(); }
  function t3Blow() {
    if (T3.blowing) return;
    T3.blowing = true; T3.blow = 0; T3.front = 0; T3.vap.length = 0; T3.read = null; T3.mark = cNow(); T3.targetC = cNow(); updateCtl();
  }
  function stepTube(dt) {
    if (T3.blowing) {
      T3.blow += dt / 2.4;
      const p = clamp(T3.blow, 0, 1), c = T3.targetC;
      T3.front = (c / CMAX) * sm(p);
      const rate = 60 * c / CMAX + (c > 0 ? 6 : 0);
      T3.spawnAcc += dt * rate * (1 - p * 0.3);
      const G = tubeG();
      while (T3.spawnAcc >= 1 && !RM) { T3.spawnAcc -= 1; T3.vap.push({ x: G.x0 + 6, y: G.y + 8 + Math.random() * (G.h - 16), v: 130 + Math.random() * 60, r: 3 + Math.random() * 1.5 }); }
      if (RM) T3.spawnAcc = 0;
      if (T3.blow >= 1) {
        T3.blowing = false; T3.front = c / CMAX; T3.read = c;
        MEAS.forEach((m, i) => { if (!T3.person && Math.abs(c - m) < 0.0105) T3.meas[i] = true; });
        Sound.success(); flash(G.x0 + T3.front * G.L, G.y + G.h / 2, [GREEN, '#fbbf24', '#fff']); updateCtl();
      }
    }
    const G2 = tubeG();
    for (let i = T3.vap.length - 1; i >= 0; i--) { const q = T3.vap[i]; q.x += q.v * dt; q.y += Math.sin(q.x * 0.1 + i) * 0.4; if (q.x >= G2.x0 + T3.front * G2.L - 2 || q.x > G2.x0 + G2.L) T3.vap.splice(i, 1); }
    if (!T3.blowing && T3.vap.length) T3.vap.length = 0;
  }
  function drawTube3(t) {
    const G = tubeG(), c = cNow(), judgeMode = !!T3.person, show = !judgeMode || (!T3.blowing && T3.read != null && false);
    T(14, 26, '🧪 날숨의 에탄올이 검지관의 색을 바꿔요 (교사 시연 · 모의실험)', PHONE ? 13 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 날숨 표시
    const cy = G.y + G.h / 2;
    D.roundRect(MAIN.x + 14, cy - 28, G.x0 - MAIN.x - 28, 56, 14); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.stroke();
    T(MAIN.x + 14 + (G.x0 - MAIN.x - 28) / 2, cy - 4, '날숨', 14, '#92400e', 'center', 800);
    T(MAIN.x + 14 + (G.x0 - MAIN.x - 28) / 2, cy + 16, T3.blowing ? '후~' : '에탄올 증기', PHONE ? 11.5 : 12.5, '#92400e', 'center', 800);
    // 튜브
    const x0 = G.x0, x1 = G.x0 + G.L, fx = x0 + T3.front * G.L;
    ctx.save();
    D.roundRect(x0 - 10, G.y, G.L + 20, G.h, 14); ctx.clip();
    ctx.fillStyle = CRO; ctx.fillRect(x0 - 10, G.y, G.L + 20, G.h);
    const gg = ctx.createLinearGradient(0, G.y, 0, G.y + G.h); gg.addColorStop(0, 'rgba(255,255,255,.35)'); gg.addColorStop(0.45, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(0,0,0,.18)');
    // 알갱이 느낌
    for (let i = 0; i < 90; i++) { const px = x0 - 6 + ((i * 53) % 100) / 100 * (G.L + 12), py = G.y + 4 + ((i * 29) % 100) / 100 * (G.h - 8); const green = px < fx; ctx.fillStyle = green ? 'rgba(20,100,40,.25)' : 'rgba(150,70,0,.25)'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill(); }
    // 초록 영역
    if (fx > x0 - 10) { const g2 = ctx.createLinearGradient(x0, 0, fx, 0); g2.addColorStop(0, '#2f9e44'); g2.addColorStop(1, '#6bbf59'); ctx.fillStyle = g2; ctx.fillRect(x0 - 10, G.y, fx - x0 + 10, G.h); const ed = ctx.createLinearGradient(fx - 18, 0, fx + 10, 0); ed.addColorStop(0, 'rgba(107,191,89,0)'); ed.addColorStop(1, 'rgba(234,122,12,.0)'); }
    for (let i = 0; i < 90; i++) { const px = x0 - 6 + ((i * 53) % 100) / 100 * (G.L + 12), py = G.y + 4 + ((i * 29) % 100) / 100 * (G.h - 8); if (px < fx) { ctx.fillStyle = 'rgba(10,80,30,.28)'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = gg; ctx.fillRect(x0 - 10, G.y, G.L + 20, G.h);
    // 증기 입자
    T3.vap.forEach((q) => { D.sphere(q.x, q.y, q.r, '#fff7ed', { gloss: false, outline: 'rgba(120,53,15,.7)', outlineWidth: 1 }); });
    ctx.restore();
    D.roundRect(x0 - 10, G.y, G.L + 20, G.h, 14); ctx.strokeStyle = 'rgba(70,100,140,.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, G.y + 9); ctx.lineTo(x1, G.y + 9); ctx.stroke();
    // 눈금
    for (let i = 0; i <= 6; i++) { const v = i * 0.05, x = x0 + v / CMAX * G.L; ctx.fillStyle = '#334155'; ctx.fillRect(x - 1, G.y + G.h + 4, 2, i % 2 ? 8 : 12); T(x, G.y + G.h + 34, v.toFixed(2), PHONE ? 12.5 : 13.5, MUTED, 'center', 800); }
    T(x1 + 14, G.y + G.h + 34, PHONE ? '' : 'mg/L', 13, MUTED, 'left', 800);
    if (PHONE) T(x0 + G.L / 2, G.y + G.h + 56, '날숨 에탄올 농도 (mg/L)', 12.5, MUTED, 'center', 800);
    // 기준선
    const rx = x0 + CREF / CMAX * G.L;
    D.dashedLine(rx, G.y - 34, rx, G.y + G.h + 14, { color: '#dc2626', width: 2.5, dash: [6, 4] });
    pill(rx, G.y - 46, '단속 기준 0.15 mg/L (혈중 0.03 %)', { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', size: PHONE ? 12 : 13 });
    // 초록 끝
    if (T3.front > 0.002) { D.arrow(fx, G.y + G.h + (PHONE ? 88 : 66), fx, G.y + G.h + (PHONE ? 66 : 42), { color: GREEN, width: 3, head: 9 }); }
    // 범례
    const ly = G.y + G.h + (PHONE ? 122 : 100);
    D.roundRect(MAIN.x + 20, ly - 12, 16, 16, 4); ctx.fillStyle = CRO; ctx.fill(); T(MAIN.x + 44, ly + 1, 'Cr₂O₇²⁻ (Cr +6, 주황색)', 13.5, INK, 'left', 800);
    D.roundRect(MAIN.x + (PHONE ? 240 : 250), ly - 12, 16, 16, 4); ctx.fillStyle = GREEN; ctx.fill(); T(MAIN.x + (PHONE ? 264 : 274), ly + 1, 'Cr³⁺ (Cr +3, 녹색)', 13.5, INK, 'left', 800);
    // 읽기 값
    const done = !T3.blowing && T3.read != null;
    const big = T3.person ? (done ? '초록 끝의 눈금을 읽어 보세요' : (T3.blowing ? '측정 중…' : '“후~ 불기”를 눌러요')) : (done ? '초록 끝 눈금 : ' + T3.read.toFixed(2) + ' mg/L' : (T3.blowing ? '측정 중…' : '설정한 농도 : ' + c.toFixed(2) + ' mg/L'));
    pill(MAIN.x + MAIN.w / 2, MAIN.y + 66 + (PHONE ? 10 : 0), (T3.person ? '측정 대상 ' + T3.person + ' 씨 · ' : '') + big, { bg: '#fff', color: INK, border: '#c4b5fd', size: PHONE ? 13.5 : 15.5 });
    pill(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 18, '⚠ 교사 시연 · 모의실험 : 크로뮴(Ⅵ)은 독성이에요. 폐액은 별도로 수거해요', { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', size: PHONE ? 12 : 13.5 });
    // INFO 계산
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const cv = (!T3.person && !T3.blowing && T3.read != null) ? T3.read : (T3.person ? null : c), show2 = cv != null;
    T(INFO.x + 16, INFO.y + 24, '날숨 1 L를 지날 때 일어나는 반응 (에탄올 3 : 다이크로뮴산 2)', 14, WARN, 'left', 800);
    const w2 = INFO.w - 32;
    const l1 = show2 ? '에탄올 ' + cv.toFixed(2) + ' mg / 46 g/mol = ' + r1(um(cv)).toFixed(1) + ' μmol' : '에탄올 ? mg / 46 g/mol = ? μmol';
    const l2 = show2 ? 'Cr₂O₇²⁻ 소모량 = ' + r1(um(cv)).toFixed(1) + ' × 2/3 = ' + r1(um(cv) * 2 / 3).toFixed(1) + ' μmol' : 'Cr₂O₇²⁻ 소모량 = ? μmol (3 : 2 비)';
    textBlock(INFO.x + 16, INFO.y + 52, w2, l1, PHONE ? 13.5 : 15, INK, 20, 800);
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 76 : 76), w2, l2, PHONE ? 13.5 : 15, CRO, 20, 800);
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 106 : 106), w2, '3CH₃CH₂OH + 2Cr₂O₇²⁻ + 16H⁺ → 3CH₃COOH + 4Cr³⁺ + 11H₂O', PHONE ? 12.5 : 14.5, INK, 19, 800);
    if (!PHONE) T(INFO.x + 16, INFO.y + 134, 'Cr₂O₇²⁻(주황) → Cr³⁺(녹색) : 환원 / 에탄올 → 아세트산 : 산화. 초록 길이가 길수록 날숨의 에탄올 농도가 높아요.', 13, MUTED, 'left', 700);
    else textBlock(INFO.x + 16, INFO.y + 150, w2, 'Cr₂O₇²⁻(주황) → Cr³⁺(녹색) : 환원 / 에탄올 → 아세트산 : 산화. 초록이 길수록 농도가 높아요.', 12.5, MUTED, 16.5, 700);
    if (PHONE) { T(INFO.x + 16, INFO.y + 206, '※ 아세트산까지 산화되는 전체 반응식이에요.', 12.5, MUTED, 'left', 700); }
  }

  /* ============ ④ 몸속 분해 ============ */
  const SUBS = {
    ethanol: { names: ['에탄올', '아세트알데하이드', '아세트산'], cols: [GC.OH, GC.CHO, GC.COOH], V1: 3, K1: 2, V2: { normal: 8, weak: 1.5 }, k3: 1.2, tox: 1, thr: 1.5, label: '아세트알데하이드', sc: [48, 12, 12] },
    methanol: { names: ['메탄올', '폼알데하이드', '폼산'], cols: [GC.OH, GC.CHO, GC.COOH], V1: 2.5, K1: 2, V2: { normal: 10, weak: 10 }, k3: 0.12, tox: 2, thr: 3, label: '폼산', sc: [48, 12, 12] },
  };
  const L4 = { sub: 'ethanol', enz: 'normal', amt: 3, pred: '', p: [0, 0, 0], t: 0, running: false, done: false, peak: 0, hist: [], runs: [], flush: 0, flowAcc: [0, 0, 0], fl: [], result: '', lastFlux: [0, 0, 0] };
  const l4Sub = () => SUBS[L4.sub];
  function l4Reset() { L4.p = [0, 0, 0]; L4.t = 0; L4.running = false; L4.done = false; L4.peak = 0; L4.hist = []; L4.flush = 0; L4.fl = []; L4.result = ''; L4.lastFlux = [0, 0, 0]; }
  function l4Start() {
    if (L4.running || !L4.pred) return;
    l4Reset(); L4.p = [L4.amt * 8, 0, 0]; L4.running = true; updateCtl();
  }
  function l4Step(dt) {
    if (!L4.running) return;
    const S4 = l4Sub(), V2 = S4.V2[L4.enz];
    const hours = dt * 1.0, n = Math.max(1, Math.ceil(hours / 0.01)), h = hours / n;
    for (let i = 0; i < n; i++) {
      const E = L4.p[0], A = L4.p[1], Ac = L4.p[2];
      const r1 = S4.V1 * E / (E + S4.K1), r2 = V2 * A / (A + 1), r3 = S4.k3 * Ac;
      L4.p[0] = Math.max(0, E - r1 * h); L4.p[1] = Math.max(0, A + (r1 - r2) * h); L4.p[2] = Math.max(0, Ac + (r2 - r3) * h);
      L4.lastFlux = [r1, r2, r3]; L4.t += h;
    }
    const tox = L4.p[S4.tox]; L4.peak = Math.max(L4.peak, tox);
    L4.flush = ap(L4.flush, clamp((tox - 0.5 * S4.thr) / S4.thr, 0, 1), dt, 4);
    if (L4.hist.length === 0 || L4.t - L4.hist[L4.hist.length - 1][0] >= 0.05) L4.hist.push([L4.t, tox]);
    if (!RM) for (let f = 0; f < 3; f++) { L4.flowAcc[f] += dt * L4.lastFlux[f] * 5; while (L4.flowAcc[f] >= 1) { L4.flowAcc[f] -= 1; L4.fl.push({ f, u: 0 }); } }
    L4.fl.forEach((q) => { q.u += dt * 0.9; }); L4.fl = L4.fl.filter((q) => q.u < 1);
    if (L4.t >= 8) {
      L4.running = false; L4.done = true;
      const flushed = L4.peak > S4.thr;
      L4.result = flushed ? '붉어짐' : '그대로';
      L4.runs.push({ sub: L4.sub, enz: L4.enz, amt: L4.amt, peak: L4.peak, flushed, pred: L4.pred, thr: S4.thr });
      if (L4.runs.length > 6) L4.runs.shift();
      Sound.success(); updateCtl();
    }
  }
  const l4Done = (enz, test) => L4.runs.some((r) => r.sub === 'ethanol' && r.enz === enz && r.amt >= 3 && test(r));
  const l4Normal = () => l4Done('normal', (r) => !r.flushed), l4Weak = () => l4Done('weak', (r) => r.flushed);
  const l4G = () => PHONE
    ? { pipe: { x: MAIN.x + 8, y: MAIN.y + 8, w: MAIN.w - 16, h: 170 }, chart: { x: MAIN.x + 8, y: MAIN.y + 186, w: 300, h: 230 }, face: { x: MAIN.x + 316, y: MAIN.y + 186, w: 140, h: 230 } }
    : { pipe: { x: MAIN.x + 8, y: MAIN.y + 8, w: MAIN.w - 16, h: 156 }, chart: { x: MAIN.x + 8, y: MAIN.y + 172, w: 520, h: 162 }, face: { x: MAIN.x + 536, y: MAIN.y + 172, w: 232, h: 162 } };
  function drawLiver(t) {
    const G = l4G(), S4 = l4Sub(), thr = S4.thr, methanol = L4.sub === 'methanol';
    T(14, 26, '🫀 간에서 ' + S4.names[0] + '이(가) 단계적으로 산화돼요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 간세포 단면
    const P = G.pipe;
    D.roundRect(P.x, P.y, P.w, P.h, 20); ctx.fillStyle = '#fff1f2'; ctx.fill(); ctx.strokeStyle = '#fda4af'; ctx.lineWidth = 2.4; ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]);
    T(P.x + 14, P.y + 22, '간세포 단면 (효소가 산화를 도와요)', 13.5, '#9f1239', 'left', 800);
    const n = 4, bw = PHONE ? 82 : 112, mg = PHONE ? 12 : 20, step = (P.w - 2 * mg - bw) / (n - 1);
    for (let i = 0; i < n; i++) {
      const x = P.x + mg + i * step, y = P.y + (PHONE ? 62 : 52), h = PHONE ? 84 : 74;
      const lab = i < 3 ? S4.names[i] : 'CO₂ + H₂O', col = i < 3 ? S4.cols[i] : '#64748b';
      const val = i < 3 ? L4.p[i] : 0, mx = i < 3 ? S4.sc[i] : 1, fr = clamp(val / mx, 0, 1);
      D.roundRect(x, y, bw, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
      if (i < 3) { ctx.save(); D.roundRect(x + 3, y + 3, bw - 6, h - 6, 10); ctx.clip(); ctx.fillStyle = C.rgba(col, 0.35); ctx.fillRect(x, y + h - (h - 6) * fr - 3, bw, (h - 6) * fr + 3); ctx.restore(); }
      const tox = i === S4.tox && i < 3;
      if (PHONE && lab.length > 6) { const h2 = Math.ceil(lab.length / 2); T(x + bw / 2, y + 17, lab.slice(0, h2), 12.5, INK, 'center', 800); T(x + bw / 2, y + 33, lab.slice(h2), 12.5, INK, 'center', 800); } else T(x + bw / 2, y + (PHONE ? 25 : 22), lab, PHONE ? 13 : 13.5, INK, 'center', 800);
      if (i < 3) T(x + bw / 2, y + h - 12, (Math.round(val * 10) / 10).toFixed(1), PHONE ? 13.5 : 14.5, col, 'center', 900);
      else { T(x + bw / 2, y + h - 18, '배출', 13, '#64748b', 'center', 800); }
      if (tox) pill(x + bw / 2, y - 12, '독성', { bg: '#dc2626', color: '#fff', border: null, size: 12.5, pad: 6 });
      if (i < n - 1) {
        const x1 = x + bw, x2 = x + step, my = y + h / 2;
        D.arrow(x1 + 3, my, x2 - 3, my, { color: '#94a3b8', width: 3, head: 9 });
        const en = i === 0 ? 'ADH' : i === 1 ? 'ALDH' : '';
        if (i < 2 && PHONE) { const weak = i === 1 && L4.enz === 'weak' && !methanol; T((x1 + x2) / 2, my - 10, i === 0 ? 'ADH' : weak ? 'ALDH↓' : 'ALDH', 12.5, weak ? '#b91c1c' : '#075985', 'center', 800); }
        else if (i < 2) { const weak = i === 1 && L4.enz === 'weak' && !methanol; pill((x1 + x2) / 2, my - 22, (i === 0 ? '효소 ADH' : weak ? 'ALDH 약함' : '효소 ALDH'), { bg: weak ? '#fee2e2' : '#e0f2fe', color: weak ? '#b91c1c' : '#075985', border: null, size: PHONE ? 11.5 : 12.5, pad: 6 }); }
        L4.fl.filter((q) => q.f === i).forEach((q) => { const px = lerp(x1 + 6, x2 - 6, q.u); D.sphere(px, my + Math.sin(q.u * 9 + q.f) * 3, 4.2, S4.cols[Math.min(2, i + (q.u > 0.5 ? 1 : 0))], { gloss: false }); });
      }
    }
    // 그래프
    const Ch = G.chart; D.roundRect(Ch.x, Ch.y, Ch.w, Ch.h, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke();
    const px0 = Ch.x + 46, px1 = Ch.x + Ch.w - 14, py0 = Ch.y + 28, py1 = Ch.y + Ch.h - 30, ymax = 12;
    T(Ch.x + 12, Ch.y + 20, S4.label + ' 양의 변화 (단위)', 13.5, WARN, 'left', 800);
    const gx = (h) => px0 + h / 8 * (px1 - px0), gy = (v) => py1 - clamp(v, 0, ymax) / ymax * (py1 - py0);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();
    [0, 6, 12].forEach((v) => T(px0 - 6, gy(v) + 5, String(v), 13, MUTED, 'right', 700));
    [0, 2, 4, 6, 8].forEach((h) => T(gx(h), py1 + 18, h + 'h', 13, MUTED, 'center', 700));
    D.dashedLine(px0, gy(thr), px1, gy(thr), { color: '#dc2626', width: 2, dash: [6, 4] });
    T(px1 - 4, gy(thr) - 6, methanol ? '위험 기준 ' + thr : '얼굴이 붉어지는 기준 ' + thr, 12.5, '#b91c1c', 'right', 800);
    if (L4.hist.length > 1) { ctx.strokeStyle = S4.cols[S4.tox]; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); L4.hist.forEach((q, i) => { const x = gx(q[0]), y = gy(q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
    if (L4.running || L4.done) { const x = gx(L4.t); ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, py0); ctx.lineTo(x, py1); ctx.stroke(); D.sphere(x, gy(L4.p[S4.tox]), 5, S4.cols[S4.tox], { gloss: false, outline: '#fff', outlineWidth: 1.5 }); }
    // 얼굴
    const F = G.face; D.roundRect(F.x, F.y, F.w, F.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke();
    const fcx = F.x + F.w / 2, fcy = F.y + (PHONE ? 64 : 50), fr = PHONE ? 38 : 33;
    const flush = methanol ? 0 : L4.flush;
    const skin = C.mix('#fde0c5', '#f87171', flush);
    D.sphere(fcx, fcy, fr, skin, { gloss: false, outline: '#d4a373', outlineWidth: 2 });
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(fcx - 11, fcy - 6, 3.2, 0, TAU); ctx.arc(fcx + 11, fcy - 6, 3.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    const bad = methanol ? clamp((L4.p[2] - 1) / 3, 0, 1) : flush;
    if (bad > 0.35) { ctx.moveTo(fcx - 10, fcy + 14); ctx.quadraticCurveTo(fcx, fcy + 7, fcx + 10, fcy + 14); } else { ctx.moveTo(fcx - 10, fcy + 9); ctx.quadraticCurveTo(fcx, fcy + 18, fcx + 10, fcy + 9); }
    ctx.stroke();
    if (flush > 0.3) { ctx.fillStyle = 'rgba(239,68,68,' + (0.25 * flush) + ')'; ctx.beginPath(); ctx.arc(fcx - 20, fcy + 5, 8, 0, TAU); ctx.arc(fcx + 20, fcy + 5, 8, 0, TAU); ctx.fill(); }
    const toxv = L4.p[S4.tox], gw = F.w - 28, gy2 = F.y + F.h - (PHONE ? 74 : 56);
    T(F.x + 14, gy2 - 6, methanol ? '시신경 손상 위험' : '숙취 · 얼굴 붉어짐', 13, MUTED, 'left', 800);
    D.roundRect(F.x + 14, gy2, gw, 14, 7); ctx.fillStyle = '#e2e8f0'; ctx.fill();
    const gf = clamp(toxv / (thr * 2), 0, 1); D.roundRect(F.x + 14, gy2, Math.max(0, gw * gf), 14, 7); ctx.fillStyle = toxv > thr ? '#dc2626' : '#22c55e'; if (gf > 0.01) ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.fillRect(F.x + 14 + gw * 0.5 - 1, gy2 - 3, 2, 20);
    T(F.x + F.w / 2, F.y + F.h - (PHONE ? 22 : 14), L4.done ? (toxv > thr || L4.peak > thr ? '최고 ' + (Math.round(L4.peak * 10) / 10).toFixed(1) + ' → ' + (methanol ? '위험!' : '얼굴이 붉어졌어요') : '최고 ' + (Math.round(L4.peak * 10) / 10).toFixed(1) + ' → 괜찮아요') : L4.running ? '시간 ' + L4.t.toFixed(1) + ' h' : '마시기를 눌러요', PHONE ? 12.5 : 13.5, INK, 'center', 800);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '실행 기록 (최근)', 14, WARN, 'left', 800);
    const runs = L4.runs.slice(-(PHONE ? 6 : 4)).reverse();
    if (!runs.length) textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '“마시기”를 눌러 시간에 따른 변화를 지켜봐요. 예측이 맞는지 확인해요.', 14, MUTED, 19, 700);
    runs.forEach((r, i) => {
      const y = INFO.y + 40 + i * (PHONE ? 38 : 26);
      const txt = SUBS[r.sub].names[0] + ' ' + r.amt + '단위 · ' + (r.sub === 'ethanol' ? '효소 ' + (r.enz === 'weak' ? '약함' : '보통') + ' · ' : '') + SUBS[r.sub].label + ' 최고 ' + (Math.round(r.peak * 10) / 10).toFixed(1) + ' → ' + (r.flushed ? (r.sub === 'methanol' ? '위험' : '붉어짐') : '괜찮음');
      const okp = (r.pred === 'yes') === r.flushed;
      T(INFO.x + 16, y + 14, (okp ? '✅ ' : '❌ ') + txt, PHONE ? 12.5 : 13.5, r.flushed ? '#b91c1c' : '#166534', 'left', 800);
      if (!PHONE) T(INFO.x + INFO.w - 16, y + 14, okp ? '예측 맞음' : '예측 틀림', 13, MUTED, 'right', 700);
    });
  }

  /* ---------- 조작 장치 ---------- */
  $('#stBack').addEventListener('click', () => { Sound.click(); a1Go(A1.stage - 1); });
  $('#stNext').addEventListener('click', () => { Sound.click(); a1Go(A1.stage + 1); });
  $('#stReset').addEventListener('click', () => { Sound.click(); a1Reset(); });
  (function () {
    const host = $('#lbSel');
    const nm = ['① 에탄올의 작용기', '② 아세트알데하이드의 작용기', '③ 아세트산의 작용기'];
    [0, 1, 2].forEach((i) => {
      const r = mkSelect(host, nm[i], [['', '고르기'], ['alc', '알코올 (–CH₂OH)'], ['ald', '알데하이드 (–CHO)'], ['acid', '카복실산 (–COOH)']], (v) => { A1.lab[i] = v; r.sel.classList.remove('bad', 'ok'); updateCtl(); });
    });
  })();
  const LABKEY = ['alc', 'ald', 'acid'];
  const labOk = () => A1.lab.every((v, i) => v === LABKEY[i]);
  const oxIn = [];
  (function () {
    const host = $('#oxBox');
    ['① 에탄올 –CH₂OH', '② 아세트알데하이드 –CHO', '③ 아세트산 –COOH'].forEach((lab, i) => {
      const row = document.createElement('div'); row.className = 'row-line';
      row.innerHTML = '<span class="lab"></span><div class="in-wrap"><input class="num-in" type="text" inputmode="numeric" autocomplete="off" placeholder="?"><span class="unit">산화수</span></div>';
      row.querySelector('.lab').textContent = lab + '의 탄소';
      const inp = row.querySelector('input'); inp.setAttribute('aria-label', lab + ' 탄소의 산화수');
      bindNum(inp, (v, ch) => { O2.v[i] = isNaN(v) ? NaN : Math.round(v); O2.ring = i; O2.pop = 1; inp.classList.toggle('ok', o2Ok(i)); inp.classList.toggle('bad', ch && !isNaN(O2.v[i]) && !o2Ok(i)); updateCtl(); });
      host.appendChild(row); oxIn.push(inp);
    });
  })();
  const stEt = mkStep($('#balBox'), '에탄올 분자 수 (개)', 1, 6, () => O2.n, (v) => { O2.n = v; updateCtl(); }, { row: true });
  const stCr = mkStep($('#balBox'), 'Cr₂O₇²⁻ 이온 수 (개)', 1, 3, () => O2.k, (v) => { O2.k = v; updateCtl(); }, { row: true });
  const alc = $('#alcRange'), alcOut = $('#alcOut');
  const alcB = SciSim.bindRange(alc, alcOut, (v) => (v / 100).toFixed(2) + ' mg/L', (v) => t3SetC(v / 100));
  makeChips($('#tbPre'), [['0.05', '약한 숨 0.05'], ['0.15', '보통 숨 0.15'], ['0.25', '센 숨 0.25']], (v) => { t3SetC(+v); alcB.set(Math.round(+v * 100)); });
  $('#tbBlow').addEventListener('click', () => { Sound.click(); t3Blow(); });
  makeChips($('#tbPer'), [['A', 'A 씨'], ['B', 'B 씨'], ['C', 'C 씨']], (v) => t3Person(v));
  (function () {
    const host = $('#judgeBox');
    ['A', 'B', 'C'].forEach((p) => {
      const r = mkSelect(host, p + ' 씨의 결과', [['', '고르기'], ['over', '기준 이상 (단속 대상)'], ['under', '기준 미만']], (v) => { T3.judge[p] = v; r.sel.classList.remove('bad', 'ok'); updateCtl(); });
      T3['sel' + p] = r.sel;
    });
  })();
  const judgeOk = (p) => T3.judge[p] === (PEOPLE[p] >= CREF ? 'over' : 'under');
  const judgeAll = () => ['A', 'B', 'C'].every(judgeOk);
  makeChips($('#lvSub'), [['ethanol', '에탄올 (술)'], ['methanol', '메탄올']], (v) => { if (L4.running) return; L4.sub = v; l4Reset(); updateCtl(); });
  makeChips($('#lvEnz'), [['normal', '효소 활성 보통'], ['weak', '효소 활성 약함']], (v) => { if (L4.running) return; L4.enz = v; l4Reset(); updateCtl(); });
  const stAmt = mkStep($('#lvBox'), '마신 양 (단위)', 1, 6, () => L4.amt, (v) => { if (L4.running) return; L4.amt = v; l4Reset(); updateCtl(); }, { row: true });
  makeChips($('#lvPred'), [['yes', '붉어질 것 같아요'], ['no', '괜찮을 것 같아요']], (v) => { if (L4.running) return; L4.pred = v; updateCtl(); });
  $('#lvRun').addEventListener('click', () => { Sound.click(); l4Start(); });
  $('#lvReset').addEventListener('click', () => { Sound.click(); if (L4.running) return; l4Reset(); L4.pred = ''; updateCtl(); });

  function go(m, g) { setScene(m); S.gate = g || ''; updateCtl(); }
  const defGate = (m) => (m === 'ox' || m === 'tube' ? 'all' : '');
  function onLeave() { S.gate = ''; }
  function uiExtra() {
    $('#stBack').disabled = A1.stage === 0; $('#stNext').disabled = A1.stage === 2;
    $('#stNext').textContent = A1.stage === 2 ? '✔ 모두 살펴봤어요' : A1.stage === 0 ? '산화 ▶ 아세트알데하이드로' : '산화 ▶ 아세트산으로';
    stEt.refresh(); stCr.refresh(); stAmt.refresh();
    markChips($('#tbPre'), T3.person ? '' : (MEAS.map((m) => m.toFixed(2)).includes(T3.c.toFixed(2)) ? T3.c.toFixed(2) : ''), { '0.05': T3.meas[0], '0.15': T3.meas[1], '0.25': T3.meas[2] });
    $$('#tbPre button').forEach((b) => { b.disabled = T3.blowing; });
    markChips($('#tbPer'), T3.person, {});
    $$('#tbPer button').forEach((b) => { b.disabled = T3.blowing; });
    $('#tbBlow').disabled = T3.blowing; $('#tbBlow').textContent = T3.blowing ? '측정 중…' : '😮‍💨 후~ 불기';
    alc.disabled = T3.blowing || !!T3.person;
    if (!T3.person) alcB.set(Math.round(T3.c * 100));
    markChips($('#lvSub'), L4.sub, {}); markChips($('#lvEnz'), L4.enz, {}); markChips($('#lvPred'), L4.pred, {});
    $$('#lvSub button, #lvEnz button, #lvPred button').forEach((b) => { b.disabled = L4.running; });
    $$('#lvEnz button').forEach((b) => { b.disabled = L4.running || L4.sub === 'methanol'; });
    $('#lvRun').disabled = L4.running || !L4.pred; $('#lvRun').textContent = L4.running ? '진행 중…' : L4.pred ? '🍷 마시기 ▶' : '먼저 예측을 골라요';
    $('#lvReset').disabled = L4.running;
  }

  function readouts() {
    const m = S.mode;
    if (m === 'stages') setRead('지금 단계', ['① 에탄올', '② 아세트알데하이드', '③ 아세트산'][A1.stage], '작용기', PROP[A1.stage].gf + ' ' + PROP[A1.stage].gname, '살펴본 단계', A1.visited.filter(Boolean).length + ' / 3');
    else if (m === 'ox') setRead('산화수 맞춤', [0, 1, 2].filter(o2Ok).length + ' / 3', '잃는 전자', o2Lost() + '개', '얻는 전자', o2Gain() + '개');
    else if (m === 'tube') setRead('날숨 농도', (T3.person ? '?' : cNow().toFixed(2) + ' mg/L'), '단속 기준', '0.15 mg/L', '초록 길이', T3.person ? '눈금으로' : (T3.front * CMAX).toFixed(2) + ' mg/L');
    else setRead('물질', SUBS[L4.sub].names[0], SUBS[L4.sub].label + ' 최고', (Math.round(L4.peak * 10) / 10).toFixed(1), '시간', L4.t.toFixed(1) + ' / 8 h');
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '에탄올의 산화: 작용기 변화', short: '작용기 변화', icon: '🍷', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 술을 마시고 나서 음주 측정기가 어떻게 알코올 양을 알아낼까? 몸속에서는 에탄올이 어떻게 변할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 알코올(–OH), 알데하이드(–CHO), 카복실산(–COOH)이 작용기가 달라서 성질이 다르다는 것을 배웠어요.</div>' +
        '<p>이번에는 <b>작용기가 바뀌는 반응</b>을 따라가요. 에탄올을 산화하면 <b>알코올 → 알데하이드 → 카복실산</b> 순서로 작용기가 바뀌어요. 분자 모형에서 H와 O 원자가 어떻게 움직이는지 보고, 작용기가 바뀌면 성질도 바뀌는지 확인해요.</p>',
      features: ['stages'],
      setup() { a1Reset(); go('stages'); },
      recap: '에탄올을 산화하면 –CH₂OH(알코올) → –CHO(알데하이드) → –COOH(카복실산)로 작용기가 바뀌고, 그때마다 성질도 바뀌어요. 중성이던 것이 아세트산이 되면 산성이 돼요.',
      summary: '<ul><li>에탄올 → 아세트알데하이드 → 아세트산 : <b>–CH₂OH → –CHO → –COOH</b></li><li>에탄올 C₂H₆O → 아세트알데하이드 C₂H₄O : H 2개가 빠져요 / → 아세트산 C₂H₄O₂ : O가 하나 늘어요.</li><li>성질 변화 : 에탄올(중성, 소독용 냄새) → 아세트알데하이드(자극적인 냄새, 독성) → 아세트산(신맛, pH 2.87의 약산)</li><li>와인을 오래 두면 미생물의 효소가 에탄올을 아세트산으로 산화해 <b>식초</b>가 돼요.</li><li>작용기가 바뀌면 <b>화합물의 성질도 바뀌어요.</b></li></ul>',
      missions: [
        {
          title: '단계 모형 재생과 이름표', manual: true,
          goal: '“산화 ▶”를 눌러 <b>에탄올 → 아세트알데하이드 → 아세트산</b>까지 모형을 재생하고, 단계마다 <b>작용기 이름표</b>를 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '오른쪽의 산화 단추를 두 번 눌러요. 단계마다 모형에서 색 상자로 표시된 부분이 작용기예요. –CH₂OH는 알코올, –CHO는 알데하이드, –COOH는 카복실산이에요.',
          setup() { go('stages'); },
          check() {
            if (!A1.visited[2]) return '아직 아세트산까지 산화시키지 않았어요. “산화 ▶”로 끝까지 따라가 봐요.';
            const bad = A1.lab.findIndex((v, i) => v !== LABKEY[i]);
            if (bad < 0) return true;
            $$('#lbSel select').forEach((s, i) => { s.classList.toggle('bad', !!A1.lab[i] && A1.lab[i] !== LABKEY[i]); s.classList.toggle('ok', A1.lab[i] === LABKEY[i]); });
            return A1.lab[bad] === '' ? '이름표를 모두 골라 주세요.' : (bad + 1) + '번 이름표를 다시 확인해 보세요. 모형에서 색 상자 안의 원자를 살펴봐요.';
          },
          status: () => '살펴본 단계 ' + A1.visited.filter(Boolean).length + ' / 3 ' + mark(A1.visited[2]) + ' · 이름표 ' + A1.lab.filter((v, i) => v === LABKEY[i]).length + ' / 3',
          explain: '에탄올의 <b>–CH₂OH</b>(알코올)에서 H 2개가 빠지면 <b>–CHO</b>(알데하이드), 여기에 O가 하나 붙으면 <b>–COOH</b>(카복실산)가 돼요. 산소가 늘고 수소가 줄어드는 것이 산화예요.',
        },
        {
          type: 'quiz', title: '작용기가 바뀌면 성질은?',
          goal: '에탄올이 산화되어 아세트산이 되면 <b>성질</b>은 어떻게 바뀔까요?',
          setup() { setScene('stages'); },
          choices: ['중성이던 물질이 산성(신맛)인 물질로 바뀌어요 (작용기가 –OH에서 –COOH로 바뀌었기 때문)', '탄소 골격이 같으므로 성질도 같아요', '탄소 수가 늘어서 성질이 바뀌어요', '산소가 늘어나면 항상 염기성이 돼요'],
          answer: 0,
          feedback: ['', '탄소 골격(C–C)은 같지만 작용기가 달라졌어요. 성질을 정하는 것은 작용기예요.', '에탄올과 아세트산은 탄소 수가 2개로 같아요. 달라진 것은 작용기예요.', '아세트산은 산소가 늘었지만 염기성이 아니라 산성이에요.'],
          explain: '에탄올의 수용액은 중성인데, <b>–COOH</b>가 생긴 아세트산은 H⁺를 조금 내놓는 <b>약한 산성</b>(pH 2.87)이에요. 작용기가 바뀌면 화합물의 성질도 바뀌어요.',
        },
      ],
    },
    {
      title: '산화수 추적과 전자 수', short: '산화수 추적', icon: '🔢', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산소가 늘고 수소가 줄어드는 변화를 봤어요. <b>단원 54(산화수)</b>에서 배운 방법으로 이 변화를 수로 나타내 봐요.</div>' +
        '<p>작용기 탄소의 산화수를 읽어 보면 <b>−1 → +1 → +3</b>으로 단계마다 2씩 커져요. 산화수가 커지는 것은 전자를 잃는 산화예요. 이 전자를 받는 산화제는 <b>다이크로뮴산 이온(Cr₂O₇²⁻, Cr +6 → +3)</b>이에요. 잃는 전자 수와 얻는 전자 수가 같도록 반응하는 비율을 찾아 봐요. (유기 화합물의 산화수 계산 규칙은 외우지 않아도 돼요. 값을 읽고 커지는 방향만 확인해요.)</p>',
      features: ['ox'],
      setup() { O2.v = [NaN, NaN, NaN]; O2.n = 1; O2.k = 1; oxIn.forEach((i) => { i.value = ''; i.className = 'num-in'; }); go('ox', 'scale'); },
      recap: '작용기 탄소의 산화수는 −1 → +1 → +3 으로 단계마다 2씩 커지고(전자 2개 잃음, 산화), 산화제 Cr₂O₇²⁻의 Cr은 +6 → +3(전자 3개 얻음, 환원)이에요. 에탄올 3분자(전자 6개)와 Cr₂O₇²⁻ 1개(Cr 2개 × 3)가 짝이에요.',
      summary: '<ul><li>작용기 탄소의 산화수 : <b>–CH₂OH −1 → –CHO +1 → –COOH +3</b> (한 단계마다 전자 2개를 잃음 = 산화)</li><li>산화제 Cr₂O₇²⁻ : <b>Cr +6 → +3</b> (Cr 하나가 전자 3개를 얻음 = 환원)</li><li>3CH₃CH₂OH + Cr₂O₇²⁻ + 8H⁺ → 3CH₃CHO + 2Cr³⁺ + 7H₂O : 에탄올 3개가 잃는 전자 6개 = Cr 2개가 얻는 전자 2 × 3</li><li>아세트산까지 가는 전체 반응은 3CH₃CH₂OH + 2Cr₂O₇²⁻ + 16H⁺ → 3CH₃COOH + 4Cr³⁺ + 11H₂O</li></ul>',
      missions: [
        {
          title: '산화수 눈금 배치', manual: true,
          goal: '세 분자에서 <b>작용기 탄소의 산화수</b>를 써서 눈금에 올려 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산화수는 단계마다 2씩 커져요. 알데하이드(–CHO) 탄소는 +1이고, 에탄올은 그보다 2 작아요. 아세트산은 2 커요.',
          setup() { go('ox', 'scale'); },
          check() {
            if (o2All()) return true;
            const un = [0, 1, 2].filter((i) => isNaN(O2.v[i])); if (un.length) return (un[0] + 1) + '번 분자의 산화수를 써 주세요.';
            const bad = [0, 1, 2].find((i) => !o2Ok(i));
            return (bad + 1) + '번 분자의 산화수를 다시 생각해 보세요. ' + (O2.v[bad] > OXN[bad] ? '값이 너무 커요.' : '값이 너무 작아요.') + ' 단계마다 2씩 커져요.';
          },
          status: () => '맞게 쓴 분자 ' + [0, 1, 2].filter(o2Ok).length + ' / 3 ' + mark(o2All()),
          explain: '–CH₂OH의 탄소는 H 2개(−2)와 O 1개(+1)로 <b>−1</b>, –CHO의 탄소는 H(−1)와 C=O(+2)로 <b>+1</b>, –COOH의 탄소는 C=O(+2)와 O–H(+1)로 <b>+3</b>이에요. 단계마다 2씩 커지므로 전자 2개를 잃는 산화예요.',
        },
        {
          title: '전자 수 맞추기',
          goal: '에탄올이 <b>아세트알데하이드</b>가 될 때, <b>잃는 전자 수 = 얻는 전자 수</b>가 되는 가장 간단한 분자 수를 찾으세요.',
          hint: '에탄올 1분자는 전자 2개를 잃어요. Cr₂O₇²⁻ 1개에는 Cr이 2개 있고, Cr 하나가 전자 3개를 얻어서 모두 6개를 얻어요. 저울이 수평이 되는 가장 작은 수를 찾아요.',
          setup() { go('ox', 'bal'); },
          check: () => O2.n === 3 && O2.k === 1, hold: 0.8,
          status: () => '잃는 전자 ' + o2Lost() + '개 · 얻는 전자 ' + o2Gain() + '개 ' + mark(o2Bal()) + (o2Bal() && !(O2.n === 3 && O2.k === 1) ? ' (더 작은 수로)' : ''),
          explain: '에탄올 3분자는 2 × 3 = <b>6개</b>의 전자를 잃고, Cr₂O₇²⁻ 1개는 Cr 2개 × 3 = <b>6개</b>의 전자를 얻어요. 그래서 3CH₃CH₂OH : 1Cr₂O₇²⁻ 의 비로 반응해요.',
        },
        {
          type: 'quiz', title: '알코올이 산화된다는 것은?',
          goal: '에탄올이 아세트알데하이드로 <b>산화</b>될 때 일어나는 일은?',
          setup() { go('ox', 'bal'); },
          choices: ['전자를 잃고 작용기 탄소의 산화수가 커져요', '전자를 얻고 작용기 탄소의 산화수가 작아져요', '전자는 이동하지 않고 산화수도 변하지 않아요', '수소를 얻어요'],
          answer: 0,
          feedback: ['', '전자를 얻어 산화수가 작아지는 것은 환원이에요. 에탄올의 탄소는 −1에서 +1로 커졌어요.', '산화·환원 반응에서는 전자가 이동하고 산화수가 변해요.', '에탄올은 수소를 잃고(H 2개 감소) 아세트알데하이드가 돼요.'],
          explain: '알코올이 산화되면 탄소의 산화수가 −1에서 +1로 <b>커져요</b>. 산화수가 커지는 것은 전자를 <b>잃는</b> 것과 같아요. 이 전자는 산화제 Cr₂O₇²⁻(Cr +6 → +3, 환원)가 받아 가요.',
        },
      ],
    },
    {
      title: '음주 측정기의 원리', short: '음주 측정기', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에탄올이 Cr₂O₇²⁻에게 전자를 줘서 산화되고, Cr은 +6에서 +3으로 환원되는 것을 확인했어요. 이 <b>색 변화</b>가 음주 측정기의 원리예요.</div>' +
        '<p>산성 다이크로뮴산 칼륨이 든 관에 날숨을 불어 넣으면 <b>주황색(Cr₂O₇²⁻) → 녹색(Cr³⁺)</b>으로 변한 길이가 날숨의 에탄올 농도에 비례해요. 단속 기준은 혈중 알코올 농도 0.03 %로, 날숨 에탄올 약 <b>0.15 mg/L</b>예요.</p>' +
        '<p>⚠️ <b>안전</b> : 크로뮴(Ⅵ)은 독성이 있어서 실제로는 <b>교사 시연</b>으로만 하고, 보안경 · 장갑을 착용해요. 사용한 관과 폐액은 일반 쓰레기가 아니라 <b>별도로 수거</b>해서 처리해요. 여기서는 모의실험으로 안전하게 해 봐요.</p>',
      features: ['tube'],
      setup() { T3.front = 0; T3.read = null; T3.person = ''; T3.c = 0.15; T3.meas = [false, false, false]; T3.judge = { A: '', B: '', C: '' }; ['A', 'B', 'C'].forEach((p) => { T3['sel' + p].value = ''; T3['sel' + p].className = 'sel-in'; }); go('tube', 'meas'); },
      recap: '날숨의 에탄올이 산성 Cr₂O₇²⁻(주황)을 Cr³⁺(녹색)으로 환원시키며 자기는 산화돼요. 녹색으로 변한 길이가 에탄올 농도에 비례하고, 3 : 2의 비(에탄올 : Cr₂O₇²⁻)로 반응해요.',
      summary: '<ul><li>음주 측정기 : 날숨의 에탄올이 산성 Cr₂O₇²⁻이 든 관을 지나며 <b>주황색 → 녹색</b>(Cr³⁺)으로 변한 길이로 농도를 알아요.</li><li>단속 기준 혈중 0.03 % ≈ 날숨 에탄올 <b>0.15 mg/L</b></li><li>계산 : 0.15 mg / 46 g/mol = 3.3 μmol → Cr₂O₇²⁻ 소모 = 3.3 × 2/3 = <b>2.2 μmol</b> (3 : 2)</li><li>3CH₃CH₂OH + 2Cr₂O₇²⁻ + 16H⁺ → 3CH₃COOH + 4Cr³⁺ + 11H₂O</li><li>안전 : 크로뮴(Ⅵ)은 독성 → 교사 시연 · 모의실험, 폐액은 별도 수거. 현대 측정기의 연료 전지식 센서는 에탄올이 산화될 때 나오는 전자를 전류로 읽어요.</li></ul>',
      missions: [
        {
          title: '날숨 농도 3단계 측정',
          goal: '날숨의 에탄올 농도를 <b>0.05, 0.15, 0.25 mg/L</b>로 정하고 각각 불어서 초록 끝의 눈금을 읽으세요.',
          hint: '“약한 숨 / 보통 숨 / 센 숨” 단추로 농도를 정한 뒤 “후~ 불기”를 눌러요. 새 검지관마다 주황색에서 시작해요. 슬라이더로도 맞출 수 있어요.',
          setup() { T3.person = ''; go('tube', 'meas'); },
          check: () => T3.meas.every(Boolean), hold: 0.5,
          status: () => '0.05 ' + mark(T3.meas[0]) + ' 0.15 ' + mark(T3.meas[1]) + ' 0.25 ' + mark(T3.meas[2]),
          explain: '농도가 높을수록 더 많은 Cr₂O₇²⁻(주황)가 Cr³⁺(녹색)로 환원되어 <b>초록 부분이 길어져요</b>. 0.15 mg/L에서는 초록 끝이 단속 기준선에 닿아요.',
        },
        {
          title: '기준 초과 판정', manual: true,
          goal: '<b>A, B, C 씨</b>의 날숨을 차례로 불어 초록 끝이 기준선(0.15 mg/L)보다 <b>앞서 있는지</b> 읽고 판정한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사람을 고르고 “후~ 불기”를 눌러요. 초록 끝이 빨간 점선보다 오른쪽이면 기준 이상이에요. 세 사람 모두 불어 보세요.',
          setup() { go('tube', 'judge'); },
          check() {
            ['A', 'B', 'C'].forEach((p) => { const s = T3['sel' + p]; s.classList.toggle('bad', !!T3.judge[p] && !judgeOk(p)); s.classList.toggle('ok', judgeOk(p)); });
            if (judgeAll()) return true;
            const un = ['A', 'B', 'C'].find((p) => !T3.judge[p]); if (un) return un + ' 씨의 판정을 골라 주세요.';
            const bad = ['A', 'B', 'C'].find((p) => !judgeOk(p));
            return bad + ' 씨의 판정을 다시 확인해 보세요. 초록 끝이 기준선의 어느 쪽에 있는지 눈금으로 읽어 봐요.';
          },
          status: () => '맞게 판정한 사람 ' + ['A', 'B', 'C'].filter(judgeOk).length + ' / 3',
          explain: 'A 씨(0.08 mg/L)와 C 씨(0.12 mg/L)는 초록 끝이 기준선보다 앞쪽에 못 미쳐서 기준 <b>미만</b>이고, B 씨(0.21 mg/L)는 기준선을 넘어서 기준 <b>이상</b>이에요.',
        },
        {
          type: 'quiz', title: '색이 녹색으로 변하는 까닭',
          goal: '음주 측정기의 관이 <b>주황색에서 녹색</b>으로 변하는 까닭은?',
          setup() { go('tube', 'meas'); },
          choices: ['Cr₂O₇²⁻(Cr +6)가 에탄올에게 전자를 얻어 Cr³⁺(Cr +3)로 환원되기 때문', '에탄올이 환원되어 녹색 물질이 되기 때문', 'Cr₂O₇²⁻가 전자를 잃어 Cr³⁺로 산화되기 때문', '에탄올 증기가 원래 녹색이기 때문'],
          answer: 0,
          feedback: ['', '에탄올은 산화돼요(전자를 잃어요). 녹색은 크로뮴 이온의 색이에요.', 'Cr의 산화수가 +6에서 +3으로 줄었으니 산화가 아니라 환원이에요.', '에탄올 증기는 색이 없어요. 색은 관 속 크로뮴 이온의 색이에요.'],
          explain: '에탄올이 아세트산으로 산화되면서 내놓은 전자를 <b>Cr₂O₇²⁻</b>가 받아 <b>Cr³⁺</b>(녹색)가 돼요. Cr의 산화수가 +6에서 +3으로 줄어드는 <b>환원</b>이에요. 그래서 산화제인 Cr₂O₇²⁻는 색으로 에탄올의 양을 알려 줘요.',
        },
      ],
    },
    {
      title: '몸속 분해: 간에서의 산화', short: '몸속 분해', icon: '🫀', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에탄올이 단계적으로 산화되는 것을 음주 측정기로 확인했어요. 몸속의 <b>간</b>에서도 같은 순서로 일어나요. 다만 산화제 대신 <b>효소</b>가 산화를 도와요.</div>' +
        '<p>에탄올 → <b>아세트알데하이드(독성, 숙취의 원인)</b> → 아세트산 → CO₂ + H₂O. 두 번째 효소의 활동이 약하면 아세트알데하이드가 쌓여서 얼굴이 붉어져요. 시나리오를 <b>예측</b>한 뒤 시뮬레이션으로 확인하고, 메탄올이 위험한 까닭도 알아봐요.</p>',
      features: ['liver'],
      setup() { L4.sub = 'ethanol'; L4.enz = 'normal'; L4.amt = 3; L4.pred = ''; L4.runs = []; l4Reset(); go('liver'); },
      recap: '간에서 에탄올은 효소의 도움으로 아세트알데하이드(독성) → 아세트산 → CO₂ + H₂O로 분해돼요. 아세트알데하이드를 분해하는 효소가 약하면 아세트알데하이드가 쌓여 얼굴이 붉어지고 숙취가 심해져요. 메탄올은 폼알데하이드, 폼산 같은 독성 물질로 산화돼요.',
      summary: '<ul><li>간에서 : <b>에탄올 → 아세트알데하이드 → 아세트산 → CO₂ + H₂O</b> (효소가 산화를 돕는 촉매 역할)</li><li><b>아세트알데하이드</b>는 독성이 있고 숙취의 주된 원인이에요. 분해 효소가 약한 사람은 이것이 쌓여 얼굴이 쉽게 붉어져요.</li><li><b>메탄올 → 폼알데하이드 → 폼산</b> : 몸속에서 독성이 강한 물질로 산화되어 시신경 손상, 실명, 사망 위험이 있어요. 절대 마시면 안 돼요.</li><li>작용기가 바뀌면 화합물의 성질(독성, 산성)도 달라져요.</li></ul>',
      missions: [
        {
          title: '시나리오 예측과 확인',
          goal: '예측을 고른 뒤 에탄올 <b>3단위 이상</b>을 마시게 해서, <b>효소 활성이 보통</b>일 때와 <b>약할 때</b>를 모두 확인하세요.',
          hint: '먼저 “붉어질 것 같아요 / 괜찮을 것 같아요”를 고르고 “마시기”를 눌러요. 효소 활성을 바꿔서 한 번 더 해 보세요. 8시간이 지나면 기록돼요.',
          setup() { L4.sub = 'ethanol'; l4Reset(); go('liver'); },
          check: () => l4Normal() && l4Weak(), hold: 0.5,
          status: () => '보통 효소 ' + mark(l4Normal()) + ' · 약한 효소 ' + mark(l4Weak()),
          explain: '효소 활성이 보통이면 아세트알데하이드가 만들어지는 즉시 아세트산으로 분해되어 기준 이하로 머물러요. 효소 활성이 약하면 아세트알데하이드가 <b>분해되는 속도보다 만들어지는 속도가 빨라서</b> 쌓이고 얼굴이 붉어져요.',
        },
        {
          type: 'quiz', title: '숙취의 주된 원인 물질',
          goal: '술을 마신 뒤 <b>숙취와 얼굴 붉어짐</b>의 주된 원인이 되는 물질은?',
          setup() { go('liver'); },
          choices: ['에탄올', '아세트알데하이드', '아세트산', 'CO₂'],
          answer: 1,
          feedback: ['에탄올은 취하게 만드는 물질이지만, 숙취의 주된 원인은 에탄올이 산화되어 생기는 중간 물질이에요.', '', '아세트산은 마지막 단계에서 CO₂와 H₂O로 분해되는 비교적 안전한 물질이에요.', 'CO₂는 숨으로 배출되는 최종 산물이에요.'],
          explain: '에탄올이 산화되어 생긴 <b>아세트알데하이드</b>는 독성이 있어요. 이것을 아세트산으로 바꾸는 효소가 약하면 몸에 쌓여 숙취와 얼굴 붉어짐이 심해져요.',
        },
        {
          type: 'quiz', title: '메탄올을 마시면 안 되는 까닭',
          goal: '메탄올은 에탄올과 비슷하게 생겼지만 <b>마시면 안 돼요.</b> 그 까닭은?',
          setup() { L4.sub = 'methanol'; l4Reset(); go('liver'); },
          choices: ['몸속에서 폼알데하이드, 폼산 같은 독성이 강한 물질로 산화되기 때문', '냄새가 심해서 마시기 힘들기 때문', '메탄올은 몸속에서 전혀 분해되지 않기 때문', '탄소 수가 적어서 물에 녹지 않기 때문'],
          answer: 0,
          feedback: ['', '냄새 때문이 아니라 몸속에서 일어나는 산화 반응의 생성물이 독성이 문제예요.', '메탄올도 에탄올처럼 효소로 산화돼요. 문제는 그 생성물이에요.', '메탄올은 물에 잘 녹아요. 문제는 용해도가 아니라 독성이에요.'],
          explain: '메탄올 CH₃OH는 간에서 에탄올과 같은 단계로 산화되어 <b>폼알데하이드(HCHO) → 폼산(HCOOH)</b>이 돼요. 이 물질들은 독성이 강해 시신경을 손상시키고 실명이나 사망까지 일으킬 수 있어요. 같은 작용기 변화라도 물질이 다르면 결과가 달라요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-alcohol-oxidation', mount: '#game', badge: '산화 탐정', homeHref: '../../index.html#hr',
    featureLabels: { stages: '🍷 분자 모형 · 산화 단추 · 성질표', ox: '🔢 산화수 눈금 · 전자 저울', tube: '🧪 음주 측정기 관 · 농도 슬라이더', liver: '🫀 간세포 단면 · 시간 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  A1.msg = a1Msgs[0];
  setScene('stages');
  function stepAll1(dt) { stepStages(dt); stepOx(dt); stepTube(dt); l4Step(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (!S.gate || (game && game.phase !== 'active')) { const dg = defGate(S.mode); if (S.gate !== dg) { S.gate = dg; updateCtl(); } }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'stages') drawStages(t); else if (S.mode === 'ox') drawOx(t); else if (S.mode === 'tube') drawTube3(t); else drawLiver(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, A1, O2, T3, L4, SPEC, FOR, VW, VH, PHONE, MAIN, INFO,
    a1Go, a1Reset, o2Set, o2Ok, o2All, t3SetC, t3Person, t3Blow, l4Start, l4Reset, l4Normal, l4Weak, judgeOk, labOk, oxIn, stEt, stCr, tubeG, l4G,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
