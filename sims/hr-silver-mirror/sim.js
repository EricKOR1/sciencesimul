/* 알데하이드와 은거울 반응 - 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 */
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

  /* ===== 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 - 알데하이드와 은거울 반응 [12반응03-02]
     ① 실험: 톨렌스 시약 만들기  ② 실험: 시료 5종 시험  ③ 분석: 전자 장부 (산화수 · 몰 계산)  ④ 적용: 구별하기 (순서도 · 미지 시료)
     케톤 · 당류(포도당)의 환원성, 푸슬링 반응, 반응 메커니즘은 다루지 않아요. ===== */
  const MODE_LABEL = { reagent: '🧪 톨렌스 시약 만들기', tubes: '🪞 시료 5종 시험', ledger: '📒 전자 장부', flow: '🧭 구별하기' };
  const SPEC = {}; Object.keys(MOLS).forEach((k) => { SPEC[k] = molSpec(k); });
  const SILVER = '#cbd5e1', BROWN = '#8b5a2b';
  const GROUPTXT = { OH: ['–OH', '알코올'], CHO: ['–CHO', '알데하이드'], COOH: ['–COOH', '카복실산'] };
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


  /* ============ ① 시약 만들기 ============ */
  const R1 = { d: 0, ds: 0, drops: [], units: [], cloud: [], full: 12 };
  for (let i = 0; i < 8; i++) R1.units.push({ x: 0, y: 0, m: 0, c: 0, ph: i * 1.7 });
  for (let i = 0; i < 26; i++) R1.cloud.push({ u: ((i + 1) * 0.7548776662466927) % 1, v: ((i + 1) * 0.5698402909980532) % 1, r: 3 + (i % 4) });
  const pFrac = (ds) => (ds <= 4 ? ds / 4 : Math.max(0, 1 - (ds - 4) / 5));
  const r1Clear = () => R1.d >= 9 && R1.ds >= 8.9;
  const r1Geo = () => PHONE
    ? { bk: { x: 150, y: 166, w: 170, h: 130 }, bottle: { x: 235, y: 102 }, ins: { x: 14, y: 360, w: 452, h: 114 }, mode: 'wide', pill: { x: 232, y: 342 } }
    : { bk: { x: 90, y: 170, w: 190, h: 170 }, bottle: { x: 185, y: 106 }, ins: { x: 536, y: 60, w: 240, h: 326 }, mode: 'tall', pill: { x: 410, y: 214 } };
  function r1Drop() {
    if (R1.d >= R1.full) return;
    R1.d++; const g = r1Geo(); R1.drops.push({ y: g.bottle.y + 58, vy: 0, tgt: g.bk.y + 5 + (g.bk.h - 11) * 0.38, seg: R1.d });
    Sound.tick();
  }
  function r1Reset() { R1.d = 0; R1.ds = 0; R1.landed = 0; R1.eff = 0; R1.drops.length = 0; updateCtl(); }
  function stepReagent(dt) {
    for (let i = R1.drops.length - 1; i >= 0; i--) {
      const q = R1.drops[i]; q.vy += 700 * dt; q.y += q.vy * dt;
      if (q.y >= q.tgt) { R1.drops.splice(i, 1); R1.ds = Math.min(R1.full, R1.ds); R1.landed = (R1.landed || 0) + 1; const g = r1Geo(); parts.burst(g.bk.x + g.bk.w / 2, g.bk.y + 64, { count: 6, speed: 50, size: 2.2, colors: ['#bfdbfe', '#ffffff'], gravity: 120, life: 0.5, shape: 'circle' }); }
    }
    const landed = R1.landed || 0; R1.eff = Math.min(landed, R1.d);
    R1.ds = RM ? R1.eff : ap(R1.ds, R1.eff, dt, 1.6); if (Math.abs(R1.ds - R1.eff) < 0.012) R1.ds = R1.eff;
    const g = r1Geo(), I = g.ins;
    R1.units.forEach((u, i) => {
      const dis = clamp((R1.ds - 4) / 5, 0, 1), ppt = clamp(R1.ds / 4, 0, 1);
      let st = 'free'; if (dis * 8 > i + 1e-6) st = 'complex'; else if (ppt * 8 > i + 1e-6 && R1.ds > 0.3) st = 'clump';
      u.st = st;
      let tx, ty;
      const wide = g.mode === 'wide', wx = I.x + 40, wy = I.y + 34, ww = I.w - 80, wh = I.h - 64;
      if (st === 'clump') { tx = wide ? I.x + I.w / 2 - 64 + (i % 4) * 22 : I.x + I.w / 2 - 33 + (i % 3) * 22; ty = wide ? I.y + I.h - 46 + Math.floor(i / 4) * 18 : I.y + I.h - 90 + Math.floor(i / 3) * 20; }
      else if (st === 'complex') { const cols = wide ? 4 : 2; const cx2 = wx + ww * ((i % cols) + 0.5) / cols, cy2 = wide ? wy + wh * (Math.floor(i / cols) + 0.5) / 2 : wy + wh * 0.62 * (Math.floor(i / cols) + 0.5) / 4; tx = cx2 + Math.sin(S.t * 1.2 + u.ph) * (RM ? 0 : 6); ty = cy2 + Math.cos(S.t * 1.0 + u.ph) * (RM ? 0 : 5); }
      else { const cols = wide ? 4 : 2; tx = (wide ? wx + ww * ((i % cols) + 0.5) / cols : wx + ww * ((i % cols) + 0.5) / cols) + Math.sin(S.t * 0.9 + u.ph * 1.3) * (RM ? 0 : 12); ty = (wide ? wy + wh * (Math.floor(i / cols) + 0.5) / 2 : wy + wh * 0.62 * (Math.floor(i / cols) + 0.5) / 4) + Math.cos(S.t * 0.8 + u.ph) * (RM ? 0 : 10); }
      if (u.x === 0 && u.y === 0) { u.x = tx; u.y = ty; }
      u.x = ap(u.x, tx, dt, 5); u.y = ap(u.y, ty, dt, 5);
      u.m = ap(u.m, st === 'complex' ? 1 : 0, dt, 5); u.c = ap(u.c, st === 'clump' ? 1 : 0, dt, 5);
    });
  }
  function r1Dropper(x, y, t) {
    // 유리 스포이트 + 고무 공
    ctx.save();
    D.roundRect(x - 13, y - 46, 26, 28, 13); ctx.fillStyle = '#334155'; ctx.fill();
    D.roundRect(x - 11, y - 22, 22, 18, 4); ctx.fillStyle = '#475569'; ctx.fill();
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(x - 9, y - 6); ctx.lineTo(x - 9, y + 36); ctx.lineTo(x - 2, y + 56); ctx.lineTo(x + 2, y + 56); ctx.lineTo(x + 9, y + 36); ctx.lineTo(x + 9, y - 6); ctx.closePath(); ctx.fillStyle = 'rgba(224,242,254,.92)'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#7c93b3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9, y - 6); ctx.lineTo(x - 9, y + 36); ctx.lineTo(x - 2, y + 56); ctx.lineTo(x + 2, y + 56); ctx.lineTo(x + 9, y + 36); ctx.lineTo(x + 9, y - 6); ctx.stroke();
    ctx.fillStyle = 'rgba(96,165,250,.55)'; ctx.fillRect(x - 7, y + 8, 14, 30);
    ctx.restore();
    pill(x + (PHONE ? 52 : 56), y + 10, 'NH₃(aq)', { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', size: 13.5 });
  }
  function drawReagent(t) {
    const G = r1Geo(), bk = G.bk, p = pFrac(R1.ds), clear = r1Clear();
    T(14, 26, '🧪 질산 은 수용액에 암모니아수를 한 방울씩 넣어요', PHONE ? 13 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    r1Dropper(G.bottle.x, G.bottle.y, t);
    R1.drops.forEach((q) => D.sphere(G.bottle.x, q.y, 5, '#60a5fa', { gloss: false, outline: 'rgba(255,255,255,.8)', outlineWidth: 1 }));
    const col = C.mix('#bfe3ff', '#a8743a', 0.62 * p);
    beaker2(bk.x, bk.y, bk.w, bk.h, 0.62, col, (g) => {
      if (p > 0.02) {
        R1.cloud.forEach((c, i) => {
          const x = g.ix + 8 + c.u * (g.iw - 16) + Math.sin(S.t * 0.9 + i) * (RM ? 0 : 4), y = g.ly + 8 + (c.v * 0.7) * (g.bottom - g.ly - 16) + Math.cos(S.t * 0.7 + i * 1.3) * (RM ? 0 : 3);
          ctx.fillStyle = 'rgba(120,72,30,' + (0.45 * p * (0.6 + 0.4 * c.v)) + ')'; ctx.beginPath(); ctx.arc(x, y, c.r + 3 * p, 0, TAU); ctx.fill();
        });
        const sed = p * 0.9; ctx.fillStyle = 'rgba(110,66,26,' + (0.8 * sed) + ')'; ctx.beginPath(); ctx.ellipse(g.ix + g.iw / 2, g.bottom - 4, g.iw * 0.42 * sed, 10 * sed + 1, 0, 0, TAU); ctx.fill();
      }
      if (clear) { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(g.ix, g.ly, g.iw, g.bottom - g.ly); }
    });
    T(bk.x + bk.w / 2, bk.y + bk.h + 22, 'AgNO₃ 수용액 (은 이온 Ag⁺)', 13.5, MUTED, 'center', 800);
    // 상태 알림
    const sx = bk.x + bk.w / 2, sy = bk.y - 18 + (PHONE ? 0 : 0);
    const state = R1.d === 0 ? '맑은 용액' : (clear ? '다시 맑아졌어요!' : (R1.ds < 4 ? '갈색 앙금이 생겨요' : '앙금이 녹고 있어요'));
    pill(G.pill.x, G.pill.y, '넣은 방울 ' + R1.d + '개 · ' + state, { bg: clear ? '#dcfce7' : p > 0.05 ? '#fef3c7' : '#fff', color: clear ? '#166534' : p > 0.05 ? '#92400e' : INK, border: clear ? '#4ade80' : p > 0.05 ? '#fcd34d' : '#cbd5e1', size: PHONE ? 13.5 : 14.5 });
    if (clear) D.check(bk.x + bk.w + 24, bk.y + 24, 13, 1);
    // 입자 모형
    const I = G.ins;
    D.roundRect(I.x, I.y, I.w, I.h, 14); ctx.fillStyle = '#f0f9ff'; ctx.fill(); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2.2; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
    T(I.x + 12, I.y + 22, '🔍 입자 모형으로 보기', 14, '#0369a1', 'left', 800);
    R1.units.forEach((u, i) => {
      const r = 11;
      // 리간드 NH₃ (복합 이온)
      if (u.m > 0.02) {
        ctx.save(); ctx.globalAlpha = u.m;
        [-1, 1].forEach((sg) => { const lx = u.x + sg * (r + 15 * u.m), ly = u.y; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(lx, ly); ctx.stroke(); D.sphere(lx, ly, 8.5, '#3b82f6', { gloss: false, outline: '#1d4ed8', outlineWidth: 1 }); });
        ctx.restore();
      }
      const base = C.mix(SILVER, BROWN, u.c);
      D.sphere(u.x, u.y, r, base, { text: u.c > 0.5 ? 'Ag' : 'Ag⁺', textColor: u.c > 0.5 ? '#fff' : '#334155', textScale: 0.85, outline: u.c > 0.5 ? '#5b3a1b' : '#94a3b8', outlineWidth: 1.2, gloss: true });
    });
    const nf = R1.units.filter((u) => u.st === 'free').length, nc = R1.units.filter((u) => u.st === 'clump').length, nx = R1.units.filter((u) => u.st === 'complex').length;
    const ly = I.y + I.h - 8;
    if (PHONE) { T(I.x + 12, ly - 2, '자유 Ag⁺ ' + nf + ' · Ag₂O 앙금 ' + nc + ' · [Ag(NH₃)₂]⁺ ' + nx + ' (모두 8개)', 13, INK, 'left', 800); }
    else {
      T(I.x + 12, ly - 56, '자유 Ag⁺ ' + nf + ' · Ag₂O 앙금 ' + nc, 13.5, INK, 'left', 800);
      T(I.x + 12, ly - 36, '[Ag(NH₃)₂]⁺ ' + nx + '  (Ag⁺ 모두 8개)', 13.5, INK, 'left', 800);
      T(I.x + 12, ly - 14, '🔵 NH₃   ⚪ Ag⁺   🟤 앙금', 13, MUTED, 'left', 700);
    }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '반응식', 14.5, WARN, 'left', 800);
    const w = INFO.w - 32;
    textBlock(INFO.x + 16, INFO.y + 48, w, '① 2Ag⁺ + 2NH₃ + H₂O → Ag₂O (갈색 앙금) + 2NH₄⁺', PHONE ? 13 : 14.5, R1.ds > 0.5 && !clear ? '#92400e' : INK, 20, 800);
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 90 : 72), w, '② Ag₂O + 4NH₃ + H₂O → 2[Ag(NH₃)₂]⁺ + 2OH⁻ (톨렌스 시약)', PHONE ? 13 : 14.5, clear ? '#166534' : INK, 20, 800);
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 150 : 98), w, '⚠ 보안경 · 장갑 · 환기 / 톨렌스 시약은 만든 즉시 쓰고 남기지 않아요. 남기면 폭발성 물질이 생길 수 있어요. 사용한 뒤에는 묽은 질산으로 분해하고, 폐액은 별도로 수거해요.', PHONE ? 12.5 : 13.5, '#92400e', 18, 700);
  }

  /* ============ ② 시료 시험 ============ */
  const S5 = [
    { k: 'ethanol', name: '에탄올', f: 'CH₃CH₂OH', g: 'OH', mirror: false },
    { k: 'acetaldehyde', name: '아세트알데하이드', f: 'CH₃CHO', g: 'CHO', mirror: true },
    { k: 'formaldehyde', name: '폼알데하이드', f: 'HCHO', g: 'CHO', mirror: true },
    { k: 'acetic', name: '아세트산', f: 'CH₃COOH', g: 'COOH', mirror: false },
    { k: 'water', name: '물', f: 'H₂O', g: null, mirror: false },
  ];
  const R2 = { t: S5.map(() => ({ bath: false, y: 0, temp: 25, heat: 0, prog: 0, tested: false })), pick: S5.map(() => '') , drag: null, steam: [] };
  const tubesGeo = () => PHONE
    ? { x0: 38, gap: 78, tw: 32, len: 140, top: MAIN.y + 84, bath: { x: 14, y: MAIN.y + 226, w: 436, h: 112 }, drop: 88, tab: { x: INFO.x + 12, y: INFO.y + 12 } }
    : { x0: 58, gap: 92, tw: 36, len: 150, top: MAIN.y + 62, bath: { x: 20, y: MAIN.y + 214, w: 480, h: 104 }, drop: 95, tab: { x: 520, y: MAIN.y + 20 } };
  const tubeX = (i) => { const G = tubesGeo(); return G.x0 + i * G.gap; };
  const r2Done = () => R2.t.filter((q) => q.tested).length;
  const r2Mirror = (i) => S5[i].mirror && R2.t[i].prog > 0.98;
  function r2Toggle(i, to) { const q = R2.t[i]; q.bath = to == null ? !q.bath : to; Sound.tick(); updateCtl(); }
  function r2Reset() { R2.t.forEach((q) => { q.bath = false; q.y = 0; q.temp = 25; q.heat = 0; q.prog = 0; q.tested = false; }); updateCtl(); }
  function stepTubes(dt) {
    R2.t.forEach((q, i) => {
      q.y = ap(q.y, q.bath ? 1 : 0, dt, 7); q.temp = ap(q.temp, q.bath && q.y > 0.8 ? 68 : 25, dt, q.bath ? 0.8 : 0.5);
      if (q.temp > 55) { q.heat += dt; if (S5[i].mirror) q.prog = Math.min(1, q.prog + dt / 2.8); if (q.heat >= 2.8 && !q.tested) { q.tested = true; Sound.success(); const G = tubesGeo(); flash(tubeX(i) + G.tw / 2, G.top + G.drop + 50, S5[i].mirror ? ['#e2e8f0', '#ffffff', '#94a3b8'] : ['#bfdbfe', '#ffffff']); updateCtl(); } }
    });
    if (!RM && R2.t.some((q) => q.bath) && Math.random() < 0.15) { const G = tubesGeo(), b = G.bath; R2.steam.push({ x: b.x + 30 + Math.random() * (b.w - 60), y: b.y + 20, life: 0 }); }
    R2.steam.forEach((s) => { s.y -= dt * 28; s.life += dt; }); R2.steam = R2.steam.filter((s) => s.life < 1.6);
  }
  function drawTestTube(x, top, w, h, i, t, yOff) {
    const q = R2.t[i], sp = S5[i], cx = x + w / 2;
    const liquid = 0.5, ly = top + yOff + h - (h - 8) * liquid;
    const path = () => { ctx.beginPath(); ctx.moveTo(x, top + yOff); ctx.lineTo(x, top + yOff + h - w / 2); ctx.arc(cx, top + yOff + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(x + w, top + yOff); };
    ctx.save(); path(); ctx.closePath(); ctx.fillStyle = 'rgba(240,247,255,.7)'; ctx.fill(); ctx.clip();
    const warm = clamp((q.temp - 25) / 43, 0, 1);
    const g = ctx.createLinearGradient(0, ly, 0, top + yOff + h); g.addColorStop(0, C.rgba(C.mix('#cfe8ff', '#bfdbfe', warm), 0.75)); g.addColorStop(1, C.rgba('#93c5fd', 0.9));
    ctx.fillStyle = g; ctx.fillRect(x - 2, ly, w + 4, top + yOff + h - ly + 2); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, ly, w, 2.5);
    if (sp.mirror && q.prog > 0.01) {
      const th = (w / 2) * sm(q.prog) + 0.5, grow = (top + yOff + h - ly);
      // 거울 : 벽에서 안쪽으로 자라는 은빛 막
      const mg = ctx.createLinearGradient(x, 0, x + w, 0); mg.addColorStop(0, '#94a3b8'); mg.addColorStop(0.25, '#f8fafc'); mg.addColorStop(0.5, '#cbd5e1'); mg.addColorStop(0.75, '#ffffff'); mg.addColorStop(1, '#94a3b8');
      ctx.fillStyle = mg; ctx.globalAlpha = 0.95;
      ctx.fillRect(x - 1, ly, th + 1, grow + 2); ctx.fillRect(x + w - th, ly, th + 1, grow + 2);
      if (q.prog > 0.9) { ctx.globalAlpha = (q.prog - 0.9) * 10 * 0.95; ctx.fillRect(x, ly, w, grow + 2); }
      ctx.globalAlpha = 0.5 * q.prog; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + w * 0.2, ly); ctx.lineTo(x + w * 0.38, ly); ctx.lineTo(x + w * 0.2 - 4, top + yOff + h); ctx.lineTo(x + w * 0.06, top + yOff + h); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      // 반짝임
      const sh = (t * 0.6 + i * 0.37) % 1; ctx.globalAlpha = 0.35 * q.prog; ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.62, ly + sh * grow * 0.9, w * 0.1, 10); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.save(); path(); ctx.strokeStyle = 'rgba(70,100,140,.85)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + 5, top + yOff + 6); ctx.lineTo(x + 5, top + yOff + h - w * 0.8); ctx.stroke(); ctx.restore();
  }
  function drawTubes(t) {
    const G = tubesGeo(), b = G.bath;
    T(14, 26, '🪞 시험관을 중탕 물에 넣어 가열해 보세요 (눌러서 넣고 빼요)', PHONE ? 13 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 중탕 비커 (뒤)
    const wl = b.y + 16;
    D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = 'rgba(235,244,255,.85)'; ctx.fill(); }, { blur: 8, y: 3 });
    const anyHot = R2.t.some((q) => q.bath);
    const gw = ctx.createLinearGradient(0, wl, 0, b.y + b.h); gw.addColorStop(0, anyHot ? 'rgba(251,191,146,.55)' : 'rgba(147,197,253,.55)'); gw.addColorStop(1, anyHot ? 'rgba(249,150,100,.7)' : 'rgba(96,165,250,.7)');
    ctx.save(); D.roundRect(b.x + 4, wl, b.w - 8, b.y + b.h - wl - 4, 10); ctx.fillStyle = gw; ctx.fill(); ctx.restore();
    // 튜브
    S5.forEach((sp, i) => {
      const x = tubeX(i), q = R2.t[i];
      // 라벨
      const lx = x + G.tw / 2;
      D.roundRect(lx - 38, G.top - 54, 76, 44, 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = sp.g ? GC[sp.g] : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
      const nm = sp.name === '아세트알데하이드' ? ['아세트알', '데하이드'] : [sp.name]; nm.forEach((l, j) => T(lx, G.top - 38 + j * 14 + (nm.length === 1 ? 6 : 0), l, 12.5, INK, 'center', 800));
      if (nm.length === 1) T(lx, G.top - 20, sp.f, 12, MUTED, 'center', 700); else T(lx, G.top - 12, sp.f, 11.5, MUTED, 'center', 700);
      drawTestTube(x, G.top, G.tw, G.len, i, t, q.y * G.drop);
      if (R2.drag && R2.drag.i === i) { ctx.strokeStyle = PUR; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); D.roundRect(x - 6, G.top + q.y * G.drop - 6, G.tw + 12, G.len + 12, 10); ctx.stroke(); ctx.setLineDash([]); }
      if (!q.bath && !q.tested && !RM) { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4 + i); T(lx, G.top + G.len + 36 - 2, '▼', 14, PUR, 'center', 900); ctx.restore(); }
    });
    // 중탕 비커 (앞 유리)
    ctx.save(); ctx.fillStyle = 'rgba(200,225,255,.22)'; D.roundRect(b.x, wl, b.w, b.y + b.h - wl, 12); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 2.8; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x + 6, wl - 1, b.w - 12, 2.5);
    R2.steam.forEach((s) => { const a = 0.35 * (1 - s.life / 1.6); D.glow(s.x + Math.sin(s.life * 4 + s.x) * 6, s.y, 12, '#ffffff', a); });
    // 결과 패널
    const tb = G.tab, tw = PHONE ? INFO.w - 24 : 250;
    if (!PHONE) {
      D.roundRect(tb.x, tb.y, 256, 300, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke();
      T(tb.x + 14, tb.y + 24, '시험 결과', 14.5, WARN, 'left', 800);
      T(tb.x + 242, tb.y + 24, anyHot ? '중탕 약 60 ~ 70 °C' : '중탕 (더운 물)', 13, anyHot ? '#9a3412' : MUTED, 'right', 800);
      S5.forEach((sp, i) => {
        const y = tb.y + 40 + i * 50, q = R2.t[i];
        D.roundRect(tb.x + 8, y, 240, 44, 10); ctx.fillStyle = q.tested ? (sp.mirror ? '#f1f5f9' : '#fff') : '#fff'; ctx.fill(); ctx.strokeStyle = q.tested ? (sp.mirror ? '#64748b' : '#cbd5e1') : '#e2e8f0'; ctx.lineWidth = q.tested && sp.mirror ? 2.4 : 1.4; ctx.stroke();
        T(tb.x + 18, y + 19, sp.name, 13.5, INK, 'left', 800);
        T(tb.x + 18, y + 36, sp.g ? GROUPTXT[sp.g][0] + ' ' + GROUPTXT[sp.g][1] : '작용기 없음', 12.5, sp.g ? GC[sp.g] : MUTED, 'left', 800);
        const prog = sp.mirror ? q.prog : 0;
        if (q.tested) { T(tb.x + 238, y + 28, sp.mirror ? '○ 은거울' : '× 변화 없음', 14, sp.mirror ? '#0f172a' : '#64748b', 'right', 900); }
        else if (q.bath) { T(tb.x + 238, y + 28, q.temp > 55 ? '가열 중…' : '데우는 중…', 13.5, '#b45309', 'right', 800); }
        else T(tb.x + 238, y + 28, '—', 14, '#cbd5e1', 'right', 800);
      });
    }
    pill(MAIN.x + MAIN.w / 2 - (PHONE ? 0 : 118), MAIN.y + MAIN.h - 18, '💡 시험관 안쪽 벽이 깨끗해야 거울이 잘 생겨요 (기름기를 씻어 내요)', { bg: '#ecfeff', color: '#155e75', border: '#67e8f9', size: PHONE ? 12 : 13.5 });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (PHONE) {
      T(INFO.x + 16, INFO.y + 22, '시험 결과 (' + r2Done() + ' / 5)', 14, WARN, 'left', 800);
      S5.forEach((sp, i) => { const y = INFO.y + 32 + i * 46, q = R2.t[i]; D.roundRect(INFO.x + 10, y, INFO.w - 20, 40, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = q.tested && sp.mirror ? '#64748b' : '#e2e8f0'; ctx.lineWidth = 1.6; ctx.stroke(); T(INFO.x + 20, y + 25, sp.name + ' ' + (sp.g ? GROUPTXT[sp.g][0] : ''), 13.5, INK, 'left', 800); T(INFO.x + INFO.w - 20, y + 25, q.tested ? (sp.mirror ? '○ 은거울' : '× 변화 없음') : (q.bath ? '가열 중…' : '—'), 13.5, q.tested ? (sp.mirror ? '#0f172a' : '#64748b') : '#b45309', 'right', 900); });
    } else {
      T(INFO.x + 16, INFO.y + 24, '반응식 (알데하이드 + 톨렌스 시약, 가열)', 14.5, WARN, 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, 'CH₃CHO + 2[Ag(NH₃)₂]⁺ + 3OH⁻ → CH₃COO⁻ + 2Ag↓ + 4NH₃ + 2H₂O', 15.5, INK, 21, 800);
      textBlock(INFO.x + 16, INFO.y + 82, INFO.w - 32, '알데하이드(–CHO)만 Ag⁺를 Ag로 환원시켜 시험관 벽에 은빛 거울을 만들어요. –OH(에탄올)와 –COOH(아세트산), 물은 반응하지 않아요.', 13.5, MUTED, 18, 700);
      textBlock(INFO.x + 16, INFO.y + 128, INFO.w - 32, '⚠ 실제 실험은 보안경 · 장갑 · 환기 필수 / 사용한 시약은 별도 수거', 13, '#92400e', 17, 800);
    }
  }

  /* ============ ③ 전자 장부 ============ */
  const E3 = { t: 0, running: false, mv: new MolView(), e: [NaN, NaN], c: [NaN, NaN, NaN], showEq: false, played: false, ag: [{ x: 0, y: 0 }, { x: 0, y: 0 }] };
  E3.mv.set(SPEC.acetaldehyde, true);
  const eOk = () => E3.e[0] === 2 && E3.e[1] === 2;
  const cOk = () => near(E3.c[0], 0.01, 0.0006) && near(E3.c[1], 0.02, 0.0006) && near(E3.c[2], 2.16, 0.011);
  const e3Geo = () => PHONE
    ? { mol: { x: 134, y: 126 }, s: 42, ag: [{ x: 352, y: 96 }, { x: 352, y: 176 }], wall: { x: 430, y: 72, w: 22, h: 140 }, axis: { x: MAIN.x + 56, y: MAIN.y + 340, w: MAIN.w - 112 } }
    : { mol: { x: 190, y: 142 }, s: 58, ag: [{ x: 478, y: 116 }, { x: 478, y: 214 }], wall: { x: 690, y: 84, w: 28, h: 150 }, axis: { x: MAIN.x + 124, y: MAIN.y + 304, w: 400 } };
  function e3Play() { if (E3.running) return; E3.t = 0; E3.running = true; E3.played = true; E3.mv.set(SPEC.acetaldehyde, true); E3.swapped = false; updateCtl(); }
  function e3Reset() { E3.t = 0; E3.running = false; E3.swapped = false; E3.mv = new MolView(); E3.mv.set(SPEC.acetaldehyde, true); updateCtl(); }
  function stepLedger(dt) {
    E3.mv.update(dt);
    if (E3.running) {
      E3.t += dt / 5.5;
      if (E3.t >= 0.38 && !E3.swapped) { E3.swapped = true; E3.mv.set(SPEC.acetic, false); }
      if (E3.t >= 1) { E3.t = 1; E3.running = false; Sound.success(); const G = e3Geo(); flash(G.wall.x + G.wall.w / 2, G.wall.y + G.wall.h / 2, ['#e2e8f0', '#ffffff', '#94a3b8']); updateCtl(); }
    }
  }
  const qb = (p0, p1, c, q) => ({ x: (1 - q) * (1 - q) * p0.x + 2 * (1 - q) * q * c.x + q * q * p1.x, y: (1 - q) * (1 - q) * p0.y + 2 * (1 - q) * q * c.y + q * q * p1.y });
  function drawLedger(t) {
    const G = e3Geo(), tt = E3.t;
    T(14, 26, '📒 알데하이드가 은 이온에게 전자를 건네요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 분자
    E3.mv.draw(G.mol.x, G.mol.y, G.s, { hlLabel: true });
    pill(G.mol.x, MAIN.y + (PHONE ? 176 : 188), (E3.swapped ? (PHONE ? '아세트산 CH₃COOH' : '카복실산 CH₃COOH (염기성 용액: CH₃COO⁻)') : '아세트알데하이드 CH₃CHO'), { bg: '#fff', color: INK, border: E3.swapped ? GC.COOH : GC.CHO, size: PHONE ? 12.5 : 14 });
    // 탄소 위치
    const mv = E3.mv, ca = mv.atoms['C1'];
    const cp = ca ? { x: G.mol.x + (ca.x - mv.cx) * G.s, y: G.mol.y + (ca.y - mv.cy) * G.s } : { x: G.mol.x, y: G.mol.y };
    // 은 복합 이온
    const prog = [clamp((tt - 0.12) / 0.48, 0, 1), clamp((tt - 0.22) / 0.48, 0, 1)];
    G.ag.forEach((a, i) => {
      const became = clamp((tt - 0.62 - i * 0.04) / 0.14, 0, 1), dep = clamp((tt - 0.78 - i * 0.04) / 0.2, 0, 1);
      const ep = sm(dep);
      const ax = lerp(a.x, G.wall.x + G.wall.w / 2 + (i ? 3 : -3), ep), ay = lerp(a.y, G.wall.y + 38 + i * 70, ep);
      // 리간드
      const la = 1 - clamp((tt - 0.62 - i * 0.04) / 0.2, 0, 1);
      if (la > 0.02) { ctx.save(); ctx.globalAlpha = la; [-1, 1].forEach((sg) => { const out = (1 - la) * 40; const lx = ax + sg * (28 + out * 0), ly = ay - out * (sg > 0 ? 1 : 0.6) * 0.8 - (1 - la) * 30; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke(); D.sphere(lx, ly, 10.5, '#3b82f6', { gloss: false, outline: '#1d4ed8', outlineWidth: 1, text: 'N', textScale: 1 }); }); ctx.restore(); }
      const col = C.mix('#e2e8f0', '#94a3b8', became);
      D.sphere(ax, ay, 22, col, { text: became > 0.5 ? 'Ag' : 'Ag⁺', textColor: '#1e293b', textScale: 0.78, outline: became > 0.5 ? '#475569' : '#94a3b8', outlineWidth: 1.6, gloss: true, shadow: true });
      if (dep < 0.01) pill(a.x, a.y - 38, became > 0.5 ? '산화수 0' : '산화수 +1', { bg: became > 0.5 ? '#dbeafe' : '#fff', color: became > 0.5 ? '#1d4ed8' : MUTED, border: '#cbd5e1', size: 12.5 });
      if (dep < 0.01 && !PHONE) T(a.x, a.y + 46, '[Ag(NH₃)₂]⁺', 12.5, MUTED, 'center', 700);
      // 전자 공
      const q = prog[i];
      if (q > 0 && q < 1) { const c1 = { x: (cp.x + a.x) / 2, y: Math.min(cp.y, a.y) - 60 - i * 10 }; const pe = qb({ x: cp.x, y: cp.y - 18 }, { x: a.x - 24, y: a.y }, c1, sm(q)); eBall(pe.x, pe.y, 9.5); }
      else if (q <= 0 && tt > 0 && tt < 0.12 + i * 0.1) { const ap1 = clamp((tt) / 0.12, 0, 1); eBall(cp.x + (i ? 14 : -14), cp.y - 22 - ap1 * 8, 9.5 * ap1 + 0.1); }
    });
    // 시험관 벽
    const W = G.wall; D.roundRect(W.x, W.y, W.w, W.h, 8); ctx.fillStyle = 'rgba(224,242,254,.7)'; ctx.fill(); ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.4; ctx.stroke();
    const depAll = clamp((tt - 0.8) / 0.2, 0, 1); if (depAll > 0) { const mg = ctx.createLinearGradient(W.x, 0, W.x + W.w, 0); mg.addColorStop(0, '#94a3b8'); mg.addColorStop(0.5, '#f8fafc'); mg.addColorStop(1, '#cbd5e1'); ctx.fillStyle = mg; ctx.globalAlpha = depAll; D.roundRect(W.x + 3, W.y + 8 + (1 - depAll) * W.h * 0.5, W.w - 6, (W.h - 16) * depAll, 5); ctx.fill(); ctx.globalAlpha = 1; }
    T(W.x + W.w / 2, W.y + W.h + 20, '시험관 벽', 13, MUTED, 'center', 800);
    if (tt >= 1) pill(W.x + W.w / 2 - (PHONE ? 20 : 30), W.y - 16, '은거울!', { bg: '#0f172a', color: '#fff', border: null, size: 13.5 });
    // 산화수 눈금
    const A = G.axis, ay2 = A.y, ax0 = (v) => A.x + (v + 1) / 5 * A.w;
    if (PHONE) T(MAIN.x + 14, ay2 + 52, '산화수 눈금 (오른쪽일수록 커져요)', 13.5, WARN, 'left', 800); else T(MAIN.x + 12, ay2 + 22, '산화수 눈금', 13.5, WARN, 'left', 800);
    D.arrow(A.x - 10, ay2, A.x + A.w + 14, ay2, { color: '#64748b', width: 2.6, head: 9 });
    for (let v = -1; v <= 4; v++) { const x = ax0(v); ctx.fillStyle = '#475569'; ctx.fillRect(x - 1, ay2 - 4, 2, 8); T(x, ay2 + 22, v > 0 ? '+' + v : v < 0 ? MINUS + (-v) : '0', 13.5, MUTED, 'center', 800); }
    const cv = lerp(1, 3, sm(clamp((tt - 0.3) / 0.35, 0, 1))), gv = lerp(1, 0, sm(clamp((tt - 0.62) / 0.15, 0, 1)));
    D.sphere(ax0(cv), ay2 - 18, 14, GC.CHO, { text: 'C', textScale: 1, outline: '#fff', outlineWidth: 2 });
    [0, 1].forEach((i) => D.sphere(ax0(gv) + (i ? 12 : -12), ay2 - 20 - (i ? 6 : 0), 12, '#94a3b8', { text: 'Ag', textColor: '#1e293b', textScale: 0.85, outline: '#fff', outlineWidth: 1.5 }));
    if (tt > 0.65) pill(PHONE ? MAIN.x + MAIN.w / 2 : ax0(2), ay2 - (PHONE ? 80 : 72), 'C : +1 → +3 (전자 2개 잃음 = 산화)', { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', size: 12.5 });
    if (tt > 0.78) pill(PHONE ? MAIN.x + MAIN.w / 2 : ax0(0.2) + 20, ay2 - (PHONE ? 52 : 44), 'Ag : +1 → 0 (전자 1개씩 얻음 = 환원)', { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', size: 12.5 });
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const w = INFO.w - 32;
    T(INFO.x + 16, INFO.y + 24, '전자 장부 (이온 반응식)', 14.5, WARN, 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 50, w, 'CH₃CHO + 2[Ag(NH₃)₂]⁺ + 3OH⁻ → CH₃COO⁻ + 2Ag + 4NH₃ + 2H₂O', PHONE ? 13 : 15, INK, 20, 800);
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 96 : 76), w, '알데하이드는 자신이 산화되면서 Ag⁺를 환원시키는 환원제이고, Ag⁺는 알데하이드를 산화시키는 산화제예요.', PHONE ? 13 : 13.5, MUTED, 18, 700);
    const y3 = INFO.y + (PHONE ? 160 : 116);
    if (eOk()) T(INFO.x + 16, y3 - (PHONE ? 4 : 0), '✅ 알데하이드 1분자 → 전자 2개 → Ag⁺ 2개 (1 : 2)', PHONE ? 13 : 14, '#166534', 'left', 800);
    if (cOk()) { textBlock(INFO.x + 16, y3 + (PHONE ? 22 : 20), w, '✅ 0.44 g / 44 g/mol = 0.010 mol → Ag 0.020 mol → 0.020 × 108 = 2.16 g', PHONE ? 13 : 14, '#166534', 18, 800); }
  }

  /* ============ ④ 구별하기 ============ */
  const TRUTH3 = ['ethanol', 'acetaldehyde', 'acetic'];
  const U4 = { map: ['acetic', 'ethanol', 'acetaldehyde'], tested: {}, run: null, sel: 'A', guess: ['', '', ''], mir: {}, bub: [] };
  const UN = ['A', 'B', 'C'];
  const TNAME = { silver: '은거울 시험', gas: 'NaHCO₃ 기포 시험' };
  const F5 = { t1: '', l1: '', t2: '', l2: '', l3: '' };
  const KNAME = { ethanol: '에탄올', acetaldehyde: '아세트알데하이드', acetic: '아세트산' };
  const resOf = (k, test) => (test === 'silver' ? k === 'acetaldehyde' : k === 'acetic');
  function u4Shuffle() { const a = TRUTH3.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (a.every((v, i) => v === TRUTH3[i])) a.push(a.shift()); U4.map = a; }
  function u4Reset() { u4Shuffle(); U4.tested = {}; U4.run = null; U4.guess = ['', '', '']; U4.mir = {}; U4.bub.length = 0; $$('#unkBox select').forEach((s) => { s.value = ''; s.className = 'sel-in'; }); updateCtl(); }
  function u4Test(test) {
    if (U4.run) return;
    const idx = UN.indexOf(U4.sel); U4.run = { i: idx, test, t: 0 }; U4.bub.length = 0; updateCtl();
  }
  const u4Count = () => Object.keys(U4.tested).length;
  const u4Guess = (i) => U4.guess[i] === U4.map[i];
  const u4GuessAll = () => U4.guess.every((g, i) => g === U4.map[i]);
  function stepFlow(dt) {
    const r = U4.run; if (!r) return;
    r.t += dt / 1.8;
    const k = U4.map[r.i];
    if (r.test === 'silver') U4.mir[r.i] = resOf(k, 'silver') ? clamp((r.t - 0.15) / 0.7, 0, 1) : 0;
    if (r.test === 'gas' && resOf(k, 'gas') && r.t > 0.15 && r.t < 0.95 && !RM && Math.random() < 0.6) U4.bub.push({ i: r.i, x: Math.random(), y: 0.95, v: 0.35 + Math.random() * 0.3, rr: 2 + Math.random() * 2.2 });
    for (let j = U4.bub.length - 1; j >= 0; j--) { const b = U4.bub[j]; b.y -= b.v * dt * 1.5; if (b.y < 0.3) U4.bub.splice(j, 1); }
    if (r.t >= 1) {
      U4.tested[UN[r.i] + ':' + r.test] = resOf(k, r.test);
      Sound.success(); const g = flowGeo(), x = g.tubeX(r.i); flash(x + 16, g.tubeY + 40, resOf(k, r.test) ? ['#e2e8f0', '#fff', '#94a3b8'] : ['#bfdbfe', '#fff']);
      U4.run = null; updateCtl();
    }
  }
  const flowGeo = () => PHONE
    ? { nodes: { start: { x: 224, y: 24, w: 340, h: 30 }, t1: { x: 224, y: 70, w: 240, h: 34 }, l1: { x: 84, y: 130, w: 150, h: 34 }, t2: { x: 322, y: 130, w: 200, h: 34 }, l2: { x: 224, y: 194, w: 140, h: 34 }, l3: { x: 390, y: 194, w: 126, h: 34 } },
        tubeX: (i) => 52 + i * 150, tubeY: MAIN.y + 292, tw: 32, th: 66 }
    : { nodes: { start: { x: 264, y: 62, w: 330, h: 30 }, t1: { x: 264, y: 116, w: 250, h: 36 }, l1: { x: 96, y: 204, w: 168, h: 36 }, t2: { x: 392, y: 204, w: 220, h: 36 }, l2: { x: 316, y: 296, w: 150, h: 36 }, l3: { x: 480, y: 296, w: 140, h: 36 } },
        tubeX: (i) => 590 + i * 62, tubeY: MAIN.y + 76, tw: 34, th: 120 };
  const nodeTxt = (v, kind) => { if (!v) return '?'; if (kind === 'test') return TNAME[v] || v; return KNAME[v] || v; };
  function flowNode(n, txt, col, filled, dashed) {
    D.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 10); ctx.fillStyle = filled ? C.rgba(col, 0.12) : '#fff'; ctx.fill(); ctx.strokeStyle = filled ? col : '#94a3b8'; ctx.lineWidth = filled ? 2.4 : 1.8; if (!filled) ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
    let fs = 14.5; while (textW(txt, fs, 800) > n.w - 12 && fs > 12) fs -= 0.5;
    T(n.x, n.y + 5, txt, fs, filled ? INK : '#94a3b8', 'center', 800);
  }
  function flowLine(a, b, label, ok) {
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a.x, a.y + a.h / 2); ctx.lineTo(b.x, b.y - b.h / 2); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(b.x, b.y - b.h / 2); ctx.lineTo(b.x - 5, b.y - b.h / 2 - 9); ctx.lineTo(b.x + 5, b.y - b.h / 2 - 9); ctx.closePath(); ctx.fill();
    if (label) pill((a.x + b.x) / 2 + (b.x < a.x ? -10 : 10), (a.y + a.h / 2 + b.y - b.h / 2) / 2, label, { bg: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#b91c1c', border: null, size: 12.5, pad: 6 });
  }
  const f5Valid = () => {
    const a = F5.t1, b = F5.t2; if (!a || !b || a === b) return false;
    const idOf = (t) => (t === 'silver' ? 'acetaldehyde' : 'acetic');
    return F5.l1 === idOf(a) && F5.l2 === idOf(b) && F5.l3 === 'ethanol';
  };
  const f5Filled = () => ['t1', 'l1', 't2', 'l2', 'l3'].filter((k) => F5[k]).length;
  function drawFlow(t) {
    const G = flowGeo(), N = G.nodes;
    T(14, 26, '🧭 시험 두 가지로 에탄올 · 아세트알데하이드 · 아세트산을 구별해요', PHONE ? 12.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const nn = {}; Object.keys(N).forEach((k) => { const n = N[k]; nn[k] = { x: MAIN.x + n.x, y: MAIN.y + n.y, w: n.w, h: n.h }; });
    flowNode(nn.start, '미지 시료 (에탄올 · 아세트알데하이드 · 아세트산)', '#64748b', true);
    flowNode(nn.t1, nodeTxt(F5.t1, 'test'), PUR, !!F5.t1);
    flowLine(nn.start, nn.t1);
    flowLine(nn.t1, nn.l1, '○ 반응함', true); flowLine(nn.t1, nn.t2, '× 안 함', false);
    flowNode(nn.l1, nodeTxt(F5.l1), F5.l1 ? GC[MOLS[F5.l1].g] : '#94a3b8', !!F5.l1);
    flowNode(nn.t2, nodeTxt(F5.t2, 'test'), PUR, !!F5.t2);
    flowLine(nn.t2, nn.l2, '○ 반응함', true); flowLine(nn.t2, nn.l3, '× 안 함', false);
    flowNode(nn.l2, nodeTxt(F5.l2), F5.l2 ? GC[MOLS[F5.l2].g] : '#94a3b8', !!F5.l2);
    flowNode(nn.l3, nodeTxt(F5.l3), F5.l3 ? GC[MOLS[F5.l3].g] : '#94a3b8', !!F5.l3);
    if (f5Valid()) D.check(nn.start.x + nn.start.w / 2 + 22, nn.start.y, 12, 1);
    // 미지 시료 시험관
    const tubeHead = PHONE ? MAIN.y + 248 : MAIN.y + 40;
    if (!PHONE) { T(G.tubeX(0) - 12, tubeHead, '미지 시료 A · B · C', 14, WARN, 'left', 800); }
    else T(MAIN.x + 14, tubeHead + 6, '미지 시료 A · B · C (골라서 시험해요)', 13.5, WARN, 'left', 800);
    UN.forEach((nm, i) => {
      const x = G.tubeX(i), top = G.tubeY, th = G.th, tw = G.tw, cx = x + tw / 2, sel = U4.sel === nm;
      const mir = U4.mir[i] || 0, ly = top + th - (th - 6) * 0.62;
      const path = () => { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + th - tw / 2); ctx.arc(cx, top + th - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(x + tw, top); };
      if (sel) { D.glow(cx, top + th / 2, tw * 1.7, PUR, 0.3); }
      ctx.save(); path(); ctx.closePath(); ctx.fillStyle = 'rgba(240,247,255,.75)'; ctx.fill(); ctx.clip();
      ctx.fillStyle = 'rgba(147,197,253,.75)'; ctx.fillRect(x, ly, tw, top + th - ly + 2); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, ly, tw, 2.5);
      if (mir > 0.01 && U4.tested[nm + ':silver'] !== false) { const thk = (tw / 2) * sm(mir) + 0.5, grow = top + th - ly; const mg = ctx.createLinearGradient(x, 0, x + tw, 0); mg.addColorStop(0, '#94a3b8'); mg.addColorStop(0.3, '#f8fafc'); mg.addColorStop(0.6, '#cbd5e1'); mg.addColorStop(1, '#94a3b8'); ctx.fillStyle = mg; ctx.fillRect(x, ly, thk + 1, grow + 2); ctx.fillRect(x + tw - thk, ly, thk + 1, grow + 2); if (mir > 0.9) { ctx.globalAlpha = (mir - 0.9) * 10; ctx.fillRect(x, ly, tw, grow + 2); ctx.globalAlpha = 1; } }
      U4.bub.filter((b) => b.i === i).forEach((b) => { const bx = x + 5 + b.x * (tw - 10), by = top + b.y * th; if (by > ly + 2) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, b.rr, 0, TAU); ctx.stroke(); } });
      // 이미 확인된 은거울은 남겨 두기
      if (U4.tested[nm + ':silver'] === true && !(U4.run && U4.run.i === i && U4.run.test === 'silver')) { const thk = tw / 2, grow = top + th - ly; const mg = ctx.createLinearGradient(x, 0, x + tw, 0); mg.addColorStop(0, '#94a3b8'); mg.addColorStop(0.3, '#f8fafc'); mg.addColorStop(0.6, '#cbd5e1'); mg.addColorStop(1, '#94a3b8'); ctx.fillStyle = mg; ctx.fillRect(x, ly, tw, grow + 2); }
      ctx.restore();
      ctx.save(); path(); ctx.strokeStyle = sel ? PUR : 'rgba(70,100,140,.85)'; ctx.lineWidth = sel ? 3.4 : 2.6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      D.sphere(cx, top - 16, 13, sel ? PUR : '#64748b', { text: nm, textScale: 1.05, gloss: true });
      // 결과 배지
      ['silver', 'gas'].forEach((tst, j) => {
        const key = nm + ':' + tst, v = U4.tested[key], by = top + th + 18 + j * 22;
        const lab = tst === 'silver' ? '은거울' : '기포';
        D.roundRect(x - (PHONE ? 22 : 14), by - 10, tw + (PHONE ? 44 : 28), 19, 9.5); ctx.fillStyle = v === undefined ? '#f1f5f9' : v ? '#0f172a' : '#e2e8f0'; ctx.fill();
        T(cx, by + 4, v === undefined ? lab + ' ?' : lab + (v ? ' ○' : ' ×'), 12.5, v === undefined ? '#94a3b8' : v ? '#fff' : '#475569', 'center', 800);
      });
    });
    // INFO : 요약 표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '작용기마다 달라지는 시험 결과', 14.5, WARN, 'left', 800);
    const rows = [['ethanol', '–OH 에탄올', '×', '×'], ['acetaldehyde', '–CHO 아세트알데하이드', '○', '×'], ['acetic', '–COOH 아세트산', '×', '○']];
    const cx0 = INFO.x + 16, rh = PHONE ? 34 : 23;
    T(cx0 + (PHONE ? 200 : 250), INFO.y + 46, '은거울', 13, MUTED, 'center', 800); T(cx0 + (PHONE ? 270 : 340), INFO.y + 46, 'NaHCO₃ 기포', 13, MUTED, 'center', 800);
    rows.forEach((r, i) => { const y = INFO.y + 52 + i * rh; T(cx0, y + 17, r[1], 13.5, GC[MOLS[r[0]].g], 'left', 800); T(cx0 + (PHONE ? 200 : 250), y + 17, r[2], 15, r[2] === '○' ? '#0f172a' : '#94a3b8', 'center', 900); T(cx0 + (PHONE ? 270 : 340), y + 17, r[3], 15, r[3] === '○' ? '#0f172a' : '#94a3b8', 'center', 900); });
    const rx = PHONE ? INFO.x + 16 : INFO.x + 430, ry = PHONE ? INFO.y + 184 : INFO.y + 40;
    D.roundRect(rx - 6, ry - 6, PHONE ? INFO.w - 20 : 336, PHONE ? 84 : 100, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke();
    T(rx + 6, ry + 16, '🪞 은거울 반응의 응용', 13.5, INK, 'left', 800);
    textBlock(rx + 6, ry + 38, (PHONE ? INFO.w - 44 : 316), '거울과 보온병 안쪽의 은 도금에 이 반응을 이용했어요. 지금은 진공 증착으로 만드는 경우가 더 많아요.', 13, MUTED, 17, 700);
    T(INFO.x + 16, INFO.y + (PHONE ? 166 : 140), '–OH → –CHO → –COOH : 단계마다 결과가 달라져요', PHONE ? 12.5 : 13.5, INK, 'left', 800);
  }

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'tubes') {
        const G = tubesGeo();
        for (let i = 0; i < 5; i++) { const x = tubeX(i), q = R2.t[i], yy = G.top + q.y * G.drop; if (pointInRect(p, { x: x - 10, y: yy - 12, w: G.tw + 20, h: G.len + 24 })) { R2.drag = { i, sy: p.y, moved: false }; return true; } }
      } else if (S.mode === 'flow') {
        const G = flowGeo();
        for (let i = 0; i < 3; i++) { const x = G.tubeX(i); if (pointInRect(p, { x: x - 14, y: G.tubeY - 34, w: G.tw + 28, h: G.th + 80 })) { Sound.click(); U4.sel = UN[i]; updateCtl(); return false; } }
      }
      return false;
    },
    move(p) { if (R2.drag && Math.abs(p.y - R2.drag.sy) > 10) R2.drag.moved = true; },
    up(p) {
      if (R2.drag) {
        const d = R2.drag; R2.drag = null;
        if (!d.moved) r2Toggle(d.i); else r2Toggle(d.i, p.y > d.sy);
      }
    },
    hover(p) {
      if (S.mode === 'tubes') { const G = tubesGeo(); for (let i = 0; i < 5; i++) if (pointInRect(p, { x: tubeX(i) - 10, y: G.top - 12, w: G.tw + 20, h: G.len + 100 })) return 'pointer'; }
      return '';
    },
  });

  $('#rgDrop').addEventListener('click', () => { Sound.click(); r1Drop(); updateCtl(); });
  $('#rgReset').addEventListener('click', () => { Sound.click(); r1Reset(); });
  $('#tbReset').addEventListener('click', () => { Sound.click(); r2Reset(); });
  const GRPOPT = [['', '고르기'], ['OH', '–OH 알코올'], ['CHO', '–CHO 알데하이드'], ['COOH', '–COOH 카복실산'], ['none', '작용기 없음']];
  const grpIn = [];
  (function () { const host = $('#tbSel'); S5.forEach((sp, i) => { const r = mkSelect(host, sp.name + '의 작용기', GRPOPT, (v) => { R2.pick[i] = v; r.sel.classList.remove('bad', 'ok'); updateCtl(); }); grpIn.push(r.sel); }); })();
  const grpOk = (i) => R2.pick[i] === (S5[i].g || 'none');
  const grpAll = () => S5.every((s, i) => grpOk(i));
  $('#e3Play').addEventListener('click', () => { Sound.click(); e3Play(); });
  $('#e3Reset').addEventListener('click', () => { Sound.click(); e3Reset(); });
  const eInp = $$('#eBox input'), cInp = $$('#cBox input');
  eInp.forEach((inp, i) => bindNum(inp, (v, ch) => { E3.e[i] = isNaN(v) ? NaN : Math.round(v); inp.classList.toggle('ok', E3.e[i] === 2); inp.classList.toggle('bad', ch && !isNaN(E3.e[i]) && E3.e[i] !== 2); updateCtl(); }));
  const CT = [0.01, 0.02, 2.16], CTOL = [0.0006, 0.0006, 0.011];
  cInp.forEach((inp, i) => bindNum(inp, (v, ch) => { E3.c[i] = v; const ok = near(v, CT[i], CTOL[i]); inp.classList.toggle('ok', ok); inp.classList.toggle('bad', ch && !isNaN(v) && !ok); updateCtl(); }));
  (function () {
    const host = $('#flBox');
    const T1 = [['', '시험 고르기'], ['silver', '은거울 시험'], ['gas', 'NaHCO₃ 기포 시험']];
    const LK = [['', '시료 고르기'], ['ethanol', '에탄올'], ['acetaldehyde', '아세트알데하이드'], ['acetic', '아세트산']];
    const defs = [['t1', '시험 1', T1], ['l1', '시험 1에서 ○ → 판정', LK], ['t2', '시험 2 (시험 1에서 ×인 시료에)', T1], ['l2', '시험 2에서 ○ → 판정', LK], ['l3', '시험 2에서도 × → 판정', LK]];
    defs.forEach(([key, lab, opts]) => { const r = mkSelect(host, lab, opts, (v) => { F5[key] = v; r.sel.classList.remove('bad', 'ok'); updateCtl(); }); F5['sel_' + key] = r.sel; });
  })();
  makeChips($('#unSel'), UN.map((n) => [n, n + ' 시료']), (v) => { U4.sel = v; updateCtl(); });
  $('#unSilver').addEventListener('click', () => { Sound.click(); u4Test('silver'); });
  $('#unGas').addEventListener('click', () => { Sound.click(); u4Test('gas'); });
  (function () { const host = $('#unkBox'); UN.forEach((n, i) => { const r = mkSelect(host, n + ' 시료는?', [['', '고르기'], ['ethanol', '에탄올'], ['acetaldehyde', '아세트알데하이드'], ['acetic', '아세트산']], (v) => { U4.guess[i] = v; r.sel.classList.remove('bad', 'ok'); updateCtl(); }); }); })();

  function go(m, g) { setScene(m); S.gate = g || ''; updateCtl(); }
  const defGate = (m) => (m === 'ledger' || m === 'flow' ? 'all' : '');
  function onLeave() { S.gate = ''; }
  function uiExtra() {
    $('#rgDrop').disabled = R1.d >= R1.full || R1.drops.length > 2; $('#rgDrop').textContent = R1.d >= R1.full ? '더 넣을 수 없어요' : '💧 암모니아수 한 방울';
    $('#rgNote').textContent = r1Clear() ? '맑아졌어요! 톨렌스 시약 [Ag(NH₃)₂]⁺ 완성.' : R1.d === 0 ? '한 방울씩 넣으며 용액이 어떻게 변하는지 지켜봐요.' : '앙금이 모두 녹아 맑아질 때까지 계속 넣어요.';
    $('#e3Play').disabled = E3.running; $('#e3Play').textContent = E3.running ? '전자 이동 중…' : (E3.played ? '▶ 다시 보기' : '▶ 전자 보내기');
    markChips($('#unSel'), U4.sel, (function () { const o = {}; UN.forEach((n) => { o[n] = U4.tested[n + ':silver'] !== undefined && U4.tested[n + ':gas'] !== undefined; }); return o; })());
    $('#unSilver').disabled = !!U4.run; $('#unGas').disabled = !!U4.run;
    $('#unSilver').textContent = U4.run && U4.run.test === 'silver' ? '시험 중…' : '🪞 은거울 시험'; $('#unGas').textContent = U4.run && U4.run.test === 'gas' ? '시험 중…' : '🫧 NaHCO₃ 시험';
    $$('#unSel button').forEach((b) => { b.disabled = !!U4.run; });
  }
  function readouts() {
    const m = S.mode;
    if (m === 'reagent') setRead('넣은 방울', R1.d + '개', '용액 상태', R1.d === 0 ? '맑음' : r1Clear() ? '맑음 (시약 완성)' : R1.ds < 4 ? '갈색 앙금' : '앙금이 녹는 중', '톨렌스 시약', r1Clear() ? '완성' : '만드는 중');
    else if (m === 'tubes') setRead('중탕 중인 시험관', R2.t.filter((q) => q.bath).length + '개', '끝낸 시험', r2Done() + ' / 5', '은거울 생긴 시험관', S5.filter((s, i) => r2Mirror(i)).length + '개');
    else if (m === 'ledger') setRead('전자 이동', E3.t < 0.3 ? '준비' : '2개', 'Ag⁺ → Ag', E3.t > 0.75 ? '2개' : '0개', '은 석출량', cOk() ? '2.16 g' : '?');
    else setRead('채운 칸', f5Filled() + ' / 5', '시험한 횟수', u4Count() + ' / 6', '판정한 시료', U4.guess.filter((g, i) => g === U4.map[i]).length + ' / 3');
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '톨렌스 시약 만들기', short: '시약 만들기', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 분자 속에 알데하이드기가 있는지 눈으로 확인하려면 어떻게 해야 할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 에탄올이 아세트알데하이드를 거쳐 아세트산으로 산화되는 것을 배웠어요. 알데하이드(–CHO)는 쉽게 산화되는 <b>환원성</b>이 있어요. 이 성질을 이용해 –CHO를 확인하는 방법이 <b>은거울 반응</b>이에요.</div>' +
        '<p>먼저 시약을 만들어요. 질산 은(AgNO₃) 수용액에 <b>암모니아수를 한 방울씩</b> 넣으면 <b>갈색 앙금</b>이 생겼다가, 더 넣으면 앙금이 녹아 다시 <b>맑은 용액</b>이 돼요. 이 맑은 용액이 <b>톨렌스 시약 [Ag(NH₃)₂]⁺</b>예요.</p>' +
        '<p>⚠️ <b>안전</b> : 보안경 · 장갑을 착용하고 환기해요. 톨렌스 시약은 <b>만든 즉시 쓰고 남기지 않아요.</b> (남기면 폭발성 물질이 생길 수 있어요.) 사용 후에는 묽은 질산으로 분해하고 폐액은 별도로 수거해요. 여기서는 모의실험으로 안전하게 해 봐요.</p>',
      features: ['reagent'],
      setup() { r1Reset(); R1.landed = 0; go('reagent'); },
      recap: 'Ag⁺ 수용액에 NH₃를 조금 넣으면 갈색 앙금(Ag₂O)이 생기고, 더 넣으면 Ag⁺가 NH₃ 분자 2개와 결합한 [Ag(NH₃)₂]⁺ 이온이 되어 앙금이 녹아 맑아져요. 이 용액이 톨렌스 시약이에요.',
      summary: '<ul><li><b>톨렌스 시약</b> [Ag(NH₃)₂]⁺ : AgNO₃ 수용액 + 암모니아수</li><li>NH₃를 조금 넣으면 2Ag⁺ + 2NH₃ + H₂O → <b>Ag₂O</b>(갈색 앙금) + 2NH₄⁺</li><li>NH₃를 더 넣으면 Ag₂O + 4NH₃ + H₂O → 2<b>[Ag(NH₃)₂]⁺</b> + 2OH⁻ (앙금이 녹아 맑아짐)</li><li>안전 : 만든 즉시 사용하고 남기지 않아요. 폭발성 물질이 생길 수 있으므로 사용 후 묽은 질산으로 분해하고 폐액은 별도 수거해요.</li></ul>',
      missions: [
        {
          title: '앙금이 녹을 때까지 암모니아수 넣기',
          goal: '암모니아수를 <b>한 방울씩</b> 넣어 갈색 앙금이 생겼다가 <b>다시 맑아질 때까지</b> 넣으세요.',
          hint: '“암모니아수 한 방울” 단추를 계속 눌러요. 처음에는 갈색 앙금이 많아지다가 어느 순간부터 줄어들어요. 입자 모형도 함께 보세요. 9방울쯤이면 맑아져요.',
          setup() { go('reagent'); },
          check: () => r1Clear(), hold: 0.6,
          status: () => '넣은 방울 ' + R1.d + '개 · ' + (R1.d === 0 ? '맑음' : r1Clear() ? '맑음' : R1.ds < 4 ? '갈색 앙금' : '앙금이 녹는 중') + ' ' + mark(r1Clear()),
          explain: '처음에는 Ag⁺와 NH₃가 반응해 <b>Ag₂O 앙금</b>이 생겨요. NH₃가 충분해지면 Ag⁺ 하나가 NH₃ 분자 두 개와 결합한 <b>[Ag(NH₃)₂]⁺</b> 이온이 되어 물에 녹으므로 용액이 다시 맑아져요.',
        },
        {
          type: 'quiz', title: '앙금이 녹은 까닭',
          goal: '암모니아수를 더 넣었더니 갈색 앙금이 <b>녹았어요</b>. 그 까닭은?',
          setup() { go('reagent'); },
          choices: ['Ag⁺가 NH₃ 분자 2개와 결합한 [Ag(NH₃)₂]⁺ 이온이 되어 물에 녹기 때문에', '앙금이 증발해서 사라지기 때문에', '암모니아수가 앙금을 분해해서 은 원자가 되기 때문에', '앙금의 색이 변해서 보이지 않게 되기 때문에'],
          answer: 0,
          feedback: ['', '앙금은 증발하지 않아요. 용액 속에서 다른 이온이 되어 녹아요.', '은 원자(Ag)가 되려면 전자를 얻어야 해요. 아직 환원시키는 물질(알데하이드)을 넣지 않았어요.', '색이 변하는 것이 아니라 앙금 입자가 녹아서 없어지는 거예요.'],
          explain: '앙금 Ag₂O의 Ag⁺가 NH₃와 결합해 <b>[Ag(NH₃)₂]⁺</b> 이온이 되면 물에 잘 녹아요. 이 이온 속의 Ag⁺는 환원되기 쉬워서 알데하이드를 확인하는 시약이 돼요.',
        },
      ],
    },
    {
      title: '시료 5종 시험하기', short: '시료 시험', icon: '🪞', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 맑은 톨렌스 시약을 만들었어요. 이제 시험관 5개에 시료 5종을 넣고 톨렌스 시약을 각각 넣어서 <b>더운 물 중탕</b>으로 가열해 봐요.</div>' +
        '<p>시료는 <b>에탄올, 아세트알데하이드, 폼알데하이드, 아세트산, 물</b>이에요. 시험관을 눌러서(또는 아래로 끌어서) 중탕 비커에 넣으면 가열돼요. 어느 시험관 벽에 <b>은빛 거울</b>이 생기는지, 그 시료에는 어떤 작용기가 있는지 비교해요.</p>' +
        '<p>💡 시험관 안쪽 벽이 깨끗해야 거울이 잘 생겨요. (기름기를 씻어 내요.) ⚠️ 실제 실험은 보안경 · 장갑을 착용하고 사용한 시약은 별도로 수거해요.</p>',
      features: ['tubes'],
      setup() { r2Reset(); R2.pick = ['', '', '', '', '']; grpIn.forEach((s) => { s.value = ''; s.className = 'sel-in'; }); go('tubes'); },
      recap: '톨렌스 시약과 가열하면 알데하이드(–CHO)인 아세트알데하이드와 폼알데하이드의 시험관 벽에만 은거울이 생겨요. 에탄올(–OH), 아세트산(–COOH), 물은 반응하지 않아요.',
      summary: '<table class="mini"><tr><th>시료</th><th>작용기</th><th>은거울</th></tr><tr><td>에탄올</td><td>–OH</td><td>×</td></tr><tr><td>아세트알데하이드</td><td>–CHO</td><td>○</td></tr><tr><td>폼알데하이드</td><td>–CHO</td><td>○</td></tr><tr><td>아세트산</td><td>–COOH</td><td>×</td></tr><tr><td>물</td><td>없음</td><td>×</td></tr></table><ul><li>은거울 반응은 <b>알데하이드기(–CHO)</b>를 확인하는 시험이에요.</li><li>시험관 벽이 깨끗해야 거울이 잘 생겨요.</li></ul>',
      missions: [
        {
          title: '시험관 5개 모두 시험하기',
          goal: '시험관 <b>5개를 모두</b> 중탕 비커에 넣어 가열하고 결과를 확인하세요.',
          hint: '시험관을 눌러서 더운 물에 넣어요. 몇 초 기다리면 결과가 나와요. 여러 개를 한꺼번에 넣어도 돼요. 아래쪽 “시험관 모두 꺼내기”로 처음 상태로 돌릴 수 있어요.',
          setup() { go('tubes'); },
          check: () => r2Done() === 5, hold: 0.6,
          status: () => '끝낸 시험 ' + r2Done() + ' / 5 · 은거울 ' + S5.filter((s, i) => r2Mirror(i)).length + '개',
          explain: '아세트알데하이드와 폼알데하이드의 시험관 벽에만 은빛 거울이 생겨요. 알데하이드는 Ag⁺를 Ag로 환원시키고 자신은 산화돼요. 에탄올, 아세트산, 물에서는 변화가 없어요.',
        },
        {
          title: '결과 표 정리', manual: true,
          goal: '시료마다 <b>어떤 작용기</b>가 있는지 골라 표를 완성하고 <b>✔ 확인하기</b>를 누르세요. (은거울이 생긴 시료에 주목해요.)',
          hint: '은거울이 생긴 두 시료는 –CHO(알데하이드)예요. 에탄올은 –OH, 아세트산은 –COOH, 물에는 이 작용기가 없어요.',
          setup() { go('tubes', 'tbl'); },
          check() {
            S5.forEach((s, i) => { const ok = grpOk(i); grpIn[i].classList.toggle('ok', ok); grpIn[i].classList.toggle('bad', !!R2.pick[i] && !ok); });
            if (grpAll()) return true;
            const un = S5.findIndex((s, i) => !R2.pick[i]); if (un >= 0) return S5[un].name + '의 작용기를 골라 주세요.';
            const bad = S5.findIndex((s, i) => !grpOk(i));
            return '“' + S5[bad].name + '”의 작용기를 다시 확인해 보세요. ' + (S5[bad].mirror ? '은거울이 생겼어요.' : '은거울이 생기지 않았어요.');
          },
          status: () => '맞게 고른 시료 ' + S5.filter((s, i) => grpOk(i)).length + ' / 5',
          explain: '은거울 ○ : 아세트알데하이드와 폼알데하이드 → 둘 다 <b>–CHO</b>. 은거울 × : 에탄올(–OH), 아세트산(–COOH), 물(작용기 없음). 은거울 반응으로 –CHO를 구별할 수 있어요.',
        },
        {
          type: 'quiz', title: '에탄올과 아세트산이 거울을 만들지 못하는 까닭',
          goal: '에탄올과 아세트산은 은거울을 만들지 못했어요. 그 까닭은?',
          setup() { go('tubes'); },
          choices: ['분자 안에 환원성이 있는 –CHO(알데하이드기)가 없기 때문에', '탄소 수가 많아서 반응이 느리기 때문에', '물에 녹지 않아서 톨렌스 시약과 섞이지 않기 때문에', '산소가 들어 있지 않기 때문에'],
          answer: 0,
          feedback: ['', '에탄올과 아세트알데하이드는 탄소 수가 같은데도 결과가 달랐어요. 탄소 수 때문이 아니에요.', '에탄올과 아세트산은 물에 잘 녹아요. 중요한 것은 작용기예요.', '에탄올과 아세트산에도 산소가 있어요. 어떤 작용기로 들어 있느냐가 중요해요.'],
          explain: '은 이온을 환원시키려면 쉽게 산화되는 <b>–CHO</b>가 필요해요. 에탄올의 –OH와 아세트산의 –COOH는 톨렌스 시약과 반응하지 않아요. 그래서 은거울 반응은 알데하이드기를 구별해 내요.',
        },
      ],
    },
    {
      title: '전자 장부 : 누가 전자를 주고받을까?', short: '전자 장부', icon: '📒', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알데하이드만 은거울을 만든다는 것을 확인했어요. <b>단원 54(산화수)</b>로 이 반응을 전자의 이동으로 설명해 봐요.</div>' +
        '<p>알데하이드기 탄소의 산화수는 <b>+1</b>이고 카복실산기 탄소는 <b>+3</b>이에요. 탄소는 전자 2개를 잃고(산화), Ag⁺ 두 개가 전자를 1개씩 얻어 <b>산화수 +1 → 0</b>(환원)이 돼 은 원자가 돼요. 그래서 알데하이드는 <b>환원제</b>이고 Ag⁺는 <b>산화제</b>예요. 마지막으로 0.44 g의 아세트알데하이드에서 얻는 은의 질량을 계산해 봐요.</p>',
      features: ['ledger'],
      setup() { e3Reset(); E3.e = [NaN, NaN]; E3.c = [NaN, NaN, NaN]; E3.played = false; eInp.concat(cInp).forEach((i) => { i.value = ''; i.className = 'num-in'; }); go('ledger', 'e'); },
      recap: '알데하이드기 탄소(+1)는 전자 2개를 잃고 카복실산기(+3)가 되고, Ag⁺ 2개가 전자 1개씩 얻어 Ag(0)이 돼요. 알데하이드 : Ag = 1 : 2 이므로 0.010 mol에서 은 0.020 mol(2.16 g)이 생겨요.',
      summary: '<ul><li>CH₃CHO + 2[Ag(NH₃)₂]⁺ + 3OH⁻ → CH₃COO⁻ + <b>2Ag</b> + 4NH₃ + 2H₂O</li><li>알데하이드기 C : <b>+1 → +3</b> (전자 2개 잃음, 산화) / Ag : <b>+1 → 0</b> × 2 (전자 1개씩 얻음, 환원)</li><li>알데하이드는 <b>환원제</b>(자신이 산화), Ag⁺는 <b>산화제</b>(자신이 환원)</li><li>계산 : 0.44 g / 44 g/mol = 0.010 mol → Ag 0.020 mol → 0.020 mol × 108 g/mol = <b>2.16 g</b></li></ul>',
      missions: [
        {
          title: '전자 이동 수 쓰기',
          goal: '“전자 보내기”로 장면을 보고, 알데하이드 <b>1분자</b>가 잃는 전자 수와 이 전자를 받는 <b>Ag⁺의 개수</b>를 쓰세요.',
          hint: '탄소의 산화수가 +1에서 +3으로 얼마나 늘었나요? 이 전자를 Ag⁺ 하나가 1개씩 받으면 모두 몇 개의 Ag⁺가 필요할까요?',
          setup() { go('ledger', 'e'); },
          check: () => eOk(), hold: 0.6,
          status: () => '전자 수 ' + (isNaN(E3.e[0]) ? '—' : E3.e[0] + '개') + ' ' + mark(E3.e[0] === 2) + ' · Ag⁺ ' + (isNaN(E3.e[1]) ? '—' : E3.e[1] + '개') + ' ' + mark(E3.e[1] === 2),
          explain: '탄소의 산화수가 +1에서 +3으로 <b>2</b> 늘었으니 전자 <b>2개</b>를 잃었어요. Ag⁺는 +1에서 0으로 변하며 전자를 1개씩 받으므로 Ag⁺ <b>2개</b>가 필요해요. 잃은 전자 수 = 얻은 전자 수예요.',
        },
        {
          title: '은 석출량 계산',
          goal: '아세트알데하이드 <b>0.44 g</b>(몰질량 44 g/mol)이 모두 반응하면 석출되는 <b>은의 질량</b>은? (Ag 108 g/mol)',
          hint: '① 0.44 g / 44 g/mol = 몇 mol? ② 반응 비가 알데하이드 : Ag = 1 : 2 이므로 Ag는 몇 mol? ③ 몰 수 × 108 g/mol = 질량.',
          setup() { go('ledger', 'calc'); },
          check: () => cOk(), hold: 0.6,
          status: () => 'CH₃CHO ' + mark(near(E3.c[0], 0.01, 0.0006)) + ' · Ag 몰 ' + mark(near(E3.c[1], 0.02, 0.0006)) + ' · Ag 질량 ' + mark(near(E3.c[2], 2.16, 0.011)),
          explain: '0.44 g / 44 g/mol = <b>0.010 mol</b>. 반응 비 1 : 2 이므로 Ag는 <b>0.020 mol</b>. 질량은 0.020 mol × 108 g/mol = <b>2.16 g</b>이에요.',
        },
        {
          type: 'quiz', title: '알데하이드가 환원제인 까닭',
          goal: '은거울 반응에서 알데하이드를 <b>환원제</b>라고 해요. 그 까닭은?',
          setup() { go('ledger', 'calc'); },
          choices: ['알데하이드 자신이 산화되면서(–CHO → –COOH) Ag⁺를 환원시키기 때문에', '알데하이드 자신이 환원되어 은이 되기 때문에', '알데하이드가 전자를 받아서 산화수가 줄어들기 때문에', 'Ag⁺에게서 산소를 빼앗아 가기 때문에'],
          answer: 0,
          feedback: ['', '은 원자로 환원되는 것은 알데하이드가 아니라 Ag⁺예요.', '알데하이드기 탄소의 산화수는 +1에서 +3으로 커졌어요. 전자를 잃은 거예요.', 'Ag⁺에는 산소가 없어요. 전자를 주고받는 관점으로 생각해 보세요.'],
          explain: '환원제는 <b>자신은 산화되면서</b> 다른 물질을 환원시키는 물질이에요. 알데하이드는 전자 2개를 잃고 카복실산기(–COOH)가 되면서 Ag⁺를 Ag로 환원시켜요.',
        },
      ],
    },
    {
      title: '시료 구별하기', short: '구별하기', icon: '🧭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알데하이드기가 은 이온을 환원시키는 환원제라는 것을 확인했어요. 이제 <b>시험 결과로 작용기를 알아내어</b> 정체를 모르는 시료를 구별해 봐요.</div>' +
        '<p>미지 시료 A · B · C는 <b>에탄올, 아세트알데하이드, 아세트산</b> 중 하나씩이에요. <b>은거울 반응</b>(알데하이드만 ○)과 <b>NaHCO₃ 기포</b>(카복실산만 ○) 두 가지 시험으로 세 가지를 구별할 수 있어요. 순서도를 완성하고 직접 판정해 봐요.</p>',
      features: ['flow'],
      setup() { F5.t1 = F5.l1 = F5.t2 = F5.l2 = F5.l3 = ''; ['t1', 'l1', 't2', 'l2', 'l3'].forEach((k) => { F5['sel_' + k].value = ''; F5['sel_' + k].className = 'sel-in'; }); u4Reset(); U4.sel = 'A'; go('flow', 'chart'); },
      recap: '–OH → –CHO → –COOH 단계마다 성질과 시험 결과가 달라져요. 은거울 반응(○면 알데하이드)과 NaHCO₃ 기포(○면 카복실산)를 순서대로 시험하면 에탄올, 아세트알데하이드, 아세트산을 구별할 수 있어요.',
      summary: '<ul><li>은거울 ○ → <b>알데하이드</b>(–CHO) / NaHCO₃ 기포 ○ → <b>카복실산</b>(–COOH) / 둘 다 × → <b>알코올</b>(–OH)</li><li>순서도 : 은거울 시험 → ○ : 아세트알데하이드, × → NaHCO₃ 기포 시험 → ○ : 아세트산, × : 에탄올 (두 시험의 순서를 바꿔도 같은 결론이에요.)</li><li>은거울 반응만으로는 카복실산이 있다고 말할 수 없어요. 카복실산도 에탄올처럼 은거울을 만들지 않아요.</li><li>은거울 반응은 거울 · 보온병의 은 도금에 이용했어요 (지금은 진공 증착이 대부분).</li></ul>',
      missions: [
        {
          title: '구별 순서도 완성', manual: true,
          goal: '미지 시료를 구별하는 <b>순서도의 빈 칸 5개</b>(시험 2개, 판정 3개)를 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시험 1에서 반응하는(○) 시료는 한 가지 작용기뿐이에요. 은거울이 ○이면 알데하이드, NaHCO₃ 기포가 ○이면 카복실산이에요. 두 시험 모두 ×이면 남는 것은 에탄올이에요.',
          setup() { go('flow', 'chart'); },
          check() {
            const keys = ['t1', 'l1', 't2', 'l2', 'l3'];
            const un = keys.find((k) => !F5[k]); if (un) return '아직 비어 있는 칸이 있어요. (' + f5Filled() + ' / 5)';
            if (F5.t1 === F5.t2) return '시험 1과 시험 2는 서로 다른 시험이어야 해요.';
            if (f5Valid()) return true;
            const idOf = (t) => (t === 'silver' ? 'acetaldehyde' : 'acetic');
            if (F5.l1 !== idOf(F5.t1)) return '시험 1에서 ○인 시료를 다시 생각해 보세요. ' + TNAME[F5.t1] + '에서 반응하는 것은 어떤 작용기일까요?';
            if (F5.l2 !== idOf(F5.t2)) return '시험 2에서 ○인 시료를 다시 생각해 보세요.';
            return '두 시험에서 모두 반응하지 않은 시료는 무엇일까요?';
          },
          status: () => '채운 칸 ' + f5Filled() + ' / 5 ' + mark(f5Valid()),
          explain: '은거울 시험에서 ○이면 <b>–CHO</b>(아세트알데하이드), NaHCO₃ 시험에서 ○이면 <b>–COOH</b>(아세트산)이고, 둘 다 ×이면 <b>–OH</b>(에탄올)예요. 시험 순서를 바꿔도 결론은 같아요.',
        },
        {
          title: '미지 시료 3개 판정',
          goal: '시료 A · B · C에 <b>두 시험을 모두</b> 해 보고, 각각 어떤 시료인지 판정하세요.',
          hint: '시료를 고르고 “은거울 시험”과 “NaHCO₃ 시험”을 눌러요. 결과 배지(○ ×)를 모아 순서도에 따라 판정해요. 세 시료 모두 두 시험을 해야 해요.',
          setup() { go('flow', 'unk'); },
          check: () => u4Count() === 6 && u4GuessAll(), hold: 0.6,
          status: () => '시험 ' + u4Count() + ' / 6 ' + mark(u4Count() === 6) + ' · 맞게 판정 ' + U4.guess.filter((g, i) => g === U4.map[i]).length + ' / 3',
          explain: '은거울 ○ → 아세트알데하이드, NaHCO₃ 기포 ○ → 아세트산, 둘 다 × → 에탄올. 두 시험을 조합하면 세 시료를 구별할 수 있어요.',
        },
        {
          type: 'quiz', title: '은거울만으로 결론 내릴 수 있을까?',
          goal: '어떤 시료가 은거울을 <b>만들지 않았어요.</b> 이 결과만으로 “이 시료는 카복실산이다”라고 결론지을 수 있을까요?',
          setup() { go('flow', 'unk'); },
          choices: ['아니요. 은거울 ×는 –CHO가 없다는 뜻일 뿐, 에탄올 같은 알코올일 수도 있어요', '네. 은거울이 안 생기면 항상 카복실산이에요', '네. 알코올은 모두 은거울을 만들어요', '아니요. 은거울 반응은 카복실산만 검출해요'],
          answer: 0,
          feedback: ['', '은거울이 안 생기는 시료에는 에탄올(알코올)도 있어요. 카복실산이라고 단정할 수 없어요.', '알코올(–OH)은 은거울을 만들지 않아요. 만드는 것은 알데하이드예요.', '은거울 반응이 검출하는 것은 카복실산이 아니라 알데하이드기(–CHO)예요.'],
          explain: '은거울 반응은 <b>알데하이드기(–CHO)만</b> 검출해요. ×이면 알데하이드가 아니라는 것만 알 수 있어요. 카복실산인지 알려면 <b>NaHCO₃ 기포</b> 같은 다른 시험이 더 필요해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-silver-mirror', mount: '#game', badge: '은거울 연금술사', homeHref: '../../index.html#hr',
    featureLabels: { reagent: '🧪 암모니아수 스포이트 · 입자 모형', tubes: '🪞 시험관 5개 · 중탕 비커', ledger: '📒 전자 이동 장면 · 산화수 눈금', flow: '🧭 순서도 · 미지 시료 A B C' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('reagent');
  function stepAll1(dt) { stepReagent(dt); stepTubes(dt); stepLedger(dt); stepFlow(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (!S.gate || (game && game.phase !== 'active')) { const dg = defGate(S.mode); if (S.gate !== dg) { S.gate = dg; updateCtl(); } }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'reagent') drawReagent(t); else if (S.mode === 'tubes') drawTubes(t); else if (S.mode === 'ledger') drawLedger(t); else drawFlow(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, R1, R2, E3, U4, F5, S5, VW, VH, PHONE, MAIN, INFO,
    r1Drop, r1Reset, r1Clear, r2Toggle, r2Reset, r2Done, e3Play, e3Reset, u4Test, u4Reset, f5Valid, tubesGeo, tubeX, flowGeo, grpIn,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
