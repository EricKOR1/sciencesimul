(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };
  const fix = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const sgn = (x, d) => { const r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(d); };
  const mn = (x, d) => { const r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d); return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d); };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        const cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  /* 안내 글 판 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }
  /* 흰 카드 */
  function card(R, title, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.96)'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 6, y: 2 });
    if (title) D.text(R.x + 14, R.y + 8 + 15 * FS, title, { size: 14.5, weight: 800, color: '#334155', align: 'left' });
  }
  function lbl(x, y, text, o) { o = o || {}; return D.label(x, y, text, Object.assign({ bg: '#334155', size: 13, pad: 7 }, o)); }

  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  function hideHint() { clearTimeout(hintTimer); const h = $('#stageHint'); if (h) h.classList.add('hide'); }
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1), sz = PHONE ? 13 : 14.5;
    const lines = wrapLines(flash.text, VW - 60, sz, 800), lh = sz * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(20, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + sz * FS * 0.95 + i * lh, l, { size: sz, weight: 800, color: '#fff' }));
    ctx.restore();
  }
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(v) : v; }

  /* ======================================================
     HTML 도구: 분류 · 순서 · 짝짓기 · 숫자 입력
     ====================================================== */
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* 분류: 항목마다 칸(bin) 하나를 고르기 */
  function makeClassify(root, items, bins, answer, onChange) {
    const st = { sel: {}, items, bins, answer };
    root.innerHTML = ''; root.classList.add('cls');
    const btns = {}, rows = {};
    items.forEach((it) => {
      const row = mk('div', 'cls-row'); rows[it.id] = row;
      row.appendChild(mk('div', 'cls-lab', it.label));
      const bw = mk('div', 'cls-bins'); btns[it.id] = {};
      bins.forEach((b) => {
        const bt = mk('button', 'opt', b.label); bt.type = 'button';
        bt.addEventListener('click', () => { Sound.click(); st.sel[it.id] = st.sel[it.id] === b.id ? null : b.id; row.classList.remove('bad'); render(); onChange && onChange(); });
        bw.appendChild(bt); btns[it.id][b.id] = bt;
      });
      row.appendChild(bw); root.appendChild(row);
    });
    function render() { items.forEach((it) => bins.forEach((b) => btns[it.id][b.id].classList.toggle('on', st.sel[it.id] === b.id))); }
    st.reset = () => { st.sel = {}; items.forEach((it) => rows[it.id].classList.remove('bad')); render(); };
    st.count = () => items.filter((it) => st.sel[it.id]).length;
    st.complete = () => st.count() === items.length;
    st.wrong = () => items.filter((it) => st.sel[it.id] && !(Array.isArray(answer[it.id]) ? answer[it.id].includes(st.sel[it.id]) : st.sel[it.id] === answer[it.id])).map((it) => it.id);
    st.ok = () => st.complete() && st.wrong().length === 0;
    st.mark = (ids) => items.forEach((it) => rows[it.id].classList.toggle('bad', ids.includes(it.id)));
    render();
    return st;
  }

  /* 순서: 눌러서 1, 2, 3 … 번호 매기기 */
  function makeOrder(root, items, answerIds, onChange) {
    const st = { seq: [], items, answerIds };
    root.innerHTML = ''; root.classList.add('ord');
    const btns = {};
    items.forEach((it) => {
      const bt = mk('button', 'opt ord-item', '<span class="ord-n"></span><span class="ord-t">' + it.label + '</span>'); bt.type = 'button';
      bt.addEventListener('click', () => {
        Sound.click(); const i = st.seq.indexOf(it.id);
        if (i >= 0) st.seq.splice(i, 1); else st.seq.push(it.id);
        root.classList.remove('bad'); render(); onChange && onChange();
      });
      root.appendChild(bt); btns[it.id] = bt;
    });
    function render() {
      items.forEach((it) => {
        const i = st.seq.indexOf(it.id), b = btns[it.id];
        b.classList.toggle('on', i >= 0); b.querySelector('.ord-n').textContent = i >= 0 ? String(i + 1) : '';
        b.classList.toggle('bad', st.badId === it.id);
      });
    }
    st.reset = () => { st.seq = []; st.badId = null; render(); };
    st.complete = () => st.seq.length === items.length;
    st.ok = () => st.complete() && st.seq.every((id, i) => id === answerIds[i]);
    st.firstWrong = () => st.seq.findIndex((id, i) => id !== answerIds[i]);
    st.mark = (id) => { st.badId = id; render(); };
    render();
    return st;
  }

  /* 짝짓기: 왼쪽 항목과 오른쪽 항목을 하나씩 이어요 */
  function makePair(root, left, right, answer, onChange) {
    const st = { map: {}, pl: null, pr: null, left, right, answer };
    root.innerHTML = ''; root.classList.add('pair');
    const cl = mk('div', 'pair-col'), cr = mk('div', 'pair-col');
    const bl = {}, br = {};
    left.forEach((it) => { const b = mk('button', 'opt pair-item', '<span class="ord-n"></span><span class="ord-t">' + it.label + '</span>'); b.type = 'button'; b.addEventListener('click', () => pickL(it.id)); cl.appendChild(b); bl[it.id] = b; });
    right.forEach((it) => { const b = mk('button', 'opt pair-item', '<span class="ord-n"></span><span class="ord-t">' + it.label + '</span>'); b.type = 'button'; b.addEventListener('click', () => pickR(it.id)); cr.appendChild(b); br[it.id] = b; });
    root.append(cl, cr);
    const idxOf = (lid) => left.findIndex((x) => x.id === lid) + 1;
    function pickL(id) {
      Sound.click();
      if (st.map[id]) { delete st.map[id]; st.pl = null; }
      else st.pl = st.pl === id ? null : id;
      tryPair(); render(); onChange && onChange();
    }
    function pickR(id) {
      Sound.click();
      const owner = Object.keys(st.map).find((k) => st.map[k] === id);
      if (owner) { delete st.map[owner]; st.pr = null; }
      else st.pr = st.pr === id ? null : id;
      tryPair(); render(); onChange && onChange();
    }
    function tryPair() { if (st.pl && st.pr) { st.map[st.pl] = st.pr; st.pl = st.pr = null; } st.bad = []; }
    function render() {
      left.forEach((it) => { const b = bl[it.id], m = st.map[it.id]; b.classList.toggle('on', !!m || st.pl === it.id); b.classList.toggle('bad', (st.bad || []).includes(it.id)); b.querySelector('.ord-n').textContent = m ? String(idxOf(it.id)) : st.pl === it.id ? '◀' : ''; });
      right.forEach((it) => { const b = br[it.id], owner = Object.keys(st.map).find((k) => st.map[k] === it.id); b.classList.toggle('on', !!owner || st.pr === it.id); b.classList.toggle('bad', !!owner && (st.bad || []).includes(owner)); b.querySelector('.ord-n').textContent = owner ? String(idxOf(owner)) : st.pr === it.id ? '▶' : ''; });
    }
    st.reset = () => { st.map = {}; st.pl = st.pr = null; st.bad = []; render(); };
    st.count = () => Object.keys(st.map).length;
    st.complete = () => st.count() === left.length;
    st.wrong = () => left.filter((it) => st.map[it.id] && st.map[it.id] !== answer[it.id]).map((it) => it.id);
    st.ok = () => st.complete() && st.wrong().length === 0;
    st.mark = (ids) => { st.bad = ids; render(); };
    render();
    return st;
  }

  /* 숫자 입력(＋/－ 단추) */
  function makeStepper(root, o) {
    const st = { value: o.value != null ? o.value : o.min, o };
    root.innerHTML = ''; root.classList.add('stp');
    const dec = o.dec || 0;
    const mi = mk('button', 'btn btn-sm stp-b', '−'), pl = mk('button', 'btn btn-sm stp-b', '+'), out = mk('output', 'stp-v');
    mi.type = pl.type = 'button'; mi.setAttribute('aria-label', '줄이기'); pl.setAttribute('aria-label', '늘리기');
    const un = mk('span', 'stp-u', o.unit || '');
    root.append(mi, out, un, pl);
    const show = () => { out.textContent = (st.value < 0 ? '−' : '') + Math.abs(st.value).toFixed(dec); };
    const set = (v, silent) => { st.value = clamp(Math.round(v / o.step) * o.step, o.min, o.max); st.value = +st.value.toFixed(dec + 1); show(); if (!silent && o.onChange) o.onChange(st.value); };
    mi.addEventListener('click', () => { Sound.click(); set(st.value - o.step); });
    pl.addEventListener('click', () => { Sound.click(); set(st.value + o.step); });
    st.set = set; st.reset = () => set(o.value != null ? o.value : o.min, true);
    show();
    return st;
  }

  /* ======================================================
     표준 그래프 도우미 (축, 눈금) — 모든 선은 그래프 상자 안에만 그려요
     ====================================================== */
  function axesBox(R, o) {
    // R: 그림 상자(px), o: {x0,x1,y0,y1 (값 범위), xt, yt (눈금 값 배열), xf, yf (포맷), grid}
    const pad = o.pad || { l: 44, r: 14, t: 26, b: 30 };
    const B = { x: R.x + pad.l, y: R.y + pad.t, w: R.w - pad.l - pad.r, h: R.h - pad.t - pad.b };
    const X = (v) => B.x + (B.w * (v - o.x0)) / (o.x1 - o.x0);
    const Y = (v) => B.y + B.h - (B.h * (v - o.y0)) / (o.y1 - o.y0);
    ctx.fillStyle = o.bg || '#f8fafc'; rr(B.x, B.y, B.w, B.h, 4).fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#e2e8f0';
    (o.yt || []).forEach((v) => { ctx.beginPath(); ctx.moveTo(B.x, Y(v)); ctx.lineTo(B.x + B.w, Y(v)); ctx.stroke(); D.text(B.x - 6, Y(v) + 4.5, o.yf ? o.yf(v) : String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    (o.xt || []).forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), B.y); ctx.lineTo(X(v), B.y + B.h); ctx.stroke(); D.text(X(v), B.y + B.h + 15 * FS, o.xf ? o.xf(v) : String(v), { size: 12.5, weight: 700, color: '#64748b' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(B.x, B.y, B.w, B.h);
    return { B, X, Y };
  }
  function polyline(pts, color, w, X, Y, B) {
    ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    pts.forEach((p, i) => { const x = X(p[0]), y = Y(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.restore();
  }
  /* 결정적 의사 난수 (예시 자료를 만들 때) */
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  /* 시간 표시(초) 도우미 */
  const lerpC = (a, b, t) => mixc(a, b, t);

  /* 선택 목록: 항목마다 <select> 하나 (answer: 정답 id 또는 허용하는 id 배열) */
  function makeSelects(root, items, options, answer, onChange) {
    const st = { val: {}, items, options, answer };
    root.innerHTML = ''; root.classList.add('sels');
    const rows = {}, sels = {};
    items.forEach((it) => {
      const row = mk('div', 'sel-row'); rows[it.id] = row;
      row.appendChild(mk('label', 'sel-lab', it.label));
      const se = mk('select', 'sel');
      se.setAttribute('aria-label', String(it.label).replace(/<[^>]+>/g, ''));
      const o0 = mk('option', '', '선택하세요'); o0.value = ''; se.appendChild(o0);
      (it.options || options).forEach((o) => { const op = mk('option', '', o.label); op.value = o.id; se.appendChild(op); });
      se.addEventListener('change', () => { Sound.click(); st.val[it.id] = se.value || null; row.classList.remove('bad'); onChange && onChange(); });
      row.appendChild(se); root.appendChild(row); sels[it.id] = se;
    });
    const okOf = (it) => { const a = answer[it.id], v = st.val[it.id]; return Array.isArray(a) ? a.includes(v) : a === v; };
    st.reset = () => { st.val = {}; items.forEach((it) => { sels[it.id].value = ''; rows[it.id].classList.remove('bad'); }); };
    st.set = (id, v) => { st.val[id] = v; sels[id].value = v; };
    st.count = () => items.filter((it) => st.val[it.id]).length;
    st.complete = () => st.count() === items.length;
    st.wrong = () => items.filter((it) => st.val[it.id] && !okOf(it)).map((it) => it.id);
    st.ok = () => st.complete() && st.wrong().length === 0;
    st.mark = (ids) => items.forEach((it) => rows[it.id].classList.toggle('bad', ids.includes(it.id)));
    return st;
  }

  /* 숫자 입력칸 (키보드로 값을 직접 입력) */
  function makeNum(root, o) {
    const st = { value: NaN, o };
    root.innerHTML = ''; root.classList.add('num-in');
    const lab = mk('span', 'lab', o.label || ''), inp = mk('input'), un = mk('span', 'un', o.unit || '');
    inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = o.step || 'any'; inp.placeholder = '?';
    inp.setAttribute('aria-label', String(o.label || '값').replace(/<[^>]+>/g, '') + ' 입력, 단위 ' + (o.unit || ''));
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); st.value = isNaN(v) ? NaN : v; root.classList.remove('bad'); o.onChange && o.onChange(st.value); });
    root.append(lab, inp, un);
    st.reset = () => { inp.value = ''; st.value = NaN; root.classList.remove('bad'); };
    st.set = (v) => { inp.value = String(v); st.value = v; };
    st.has = () => !isNaN(st.value);
    st.near = (a, tol) => st.has() && Math.abs(st.value - a) <= tol + 1e-9;
    st.mark = (b) => root.classList.toggle('bad', !!b);
    return st;
  }
  /* 선택 단추 묶음 (한 번에 하나) */
  function makeChoice(root, items, onChange) {
    const st = { val: null };
    const bs = {};
    items.forEach((it) => {
      const b = mk('button', 'opt', it.label); b.type = 'button';
      b.addEventListener('click', () => { Sound.click(); st.set(it.id); onChange && onChange(st.val); });
      root.appendChild(b); bs[it.id] = b;
    });
    st.set = (v) => { st.val = v; items.forEach((it) => bs[it.id].classList.toggle('on', it.id === v)); };
    st.reset = () => st.set(null);
    return st;
  }
  const phoneRC = (a, b) => (PHONE ? a : b);
  const fN = (x, d) => Number(x).toFixed(d);
  const arrowS = (x1, y1, x2, y2, o) => {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.8) return;
    D.arrow(x1, y1, x2, y2, Object.assign({}, o, { head: Math.min((o && o.head) || 12, L * 0.62), width: Math.min((o && o.width) || 4, Math.max(1.2, L * 0.45)) }));
  };
  function drawWrapL(x, y, text, maxW, size, color, weight) { return drawWrap(x, y, text, maxW, size, { color, align: 'left', weight }); }
  /* 글자를 상자 안에 줄바꿈해서 쓰고 아래 y를 돌려줘요 */
  function para(x, y, w, text, size, color, weight) {
    const lines = wrapLines(text, w, size, weight || 700), lh = size * FS * 1.32;
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: weight || 700, color: color || '#334155', align: 'left' }));
    return y + lines.length * lh;
  }
  /* 조건부 패널 */
  const FIN = (a, b) => (isFinite(a) ? a : b);

  /* ======================================================
     해일의 원인과 피해 (폭풍 해일 → 지진 해일 → 피해 요인 → 대처 방안)
     ====================================================== */
  initStage('#e6f0f7', 800, 560, 520, 900, 1.22);
  let game = null;
  const RHO = 1025, G = 9.8, RHO_A = 1.2, CD = 2.5e-3;
  const MPS = 3.6;
  const r2 = (x) => Math.round(x * 100) / 100;
  const dEtaP = (p) => ((1010 - p) * 100) / (RHO * G);                      // 흡상 효과 (m)
  const tauOf = (U) => RHO_A * CD * U * U;                                  // 바람 응력 (N/m²)
  const dEtaW = (U, Lkm, h) => (tauOf(U) * Lkm * 1000) / (RHO * G * h);     // 바람 쏠림 (m)
  const cOf = (h) => Math.sqrt(G * h);                                      // 천해파 속도 (m/s)
  const fixm = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d) < 0 ? '−' : '') + Math.abs(Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);

  const S = {
    mode: 'storm', fade: 0, clock: 0,
    // 1. 폭풍 해일
    p: 1010, U: 0, L: 100, h: 20, pV: 1010, UV: 0, LV: 100, hV: 20, ibV: 0, dwV: 0, showCalc: false, wind: [],
    // 2. 지진 해일
    D: 0, tsRun: false, tsT: 0, tsFault: 0, tsView: 'open', arrived: -1, zoomT: -1, zoomMax: 0, ringBurst: false,
    // 3. 피해 요인
    tide: 'mean', terr: 'line', totV: 0, tideV: 0, devV: 0, judge: null, okHigh: false, okLow: false, spill: [],
    // 4. 대처 방안
    spd: 1, dest: 'far', evT: -1, evRun: false, ran1: false, ran05: false, plan: 'evac', evResult: '', evSpeedUsed: 1,
  };
  const stormRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 470 }, B: { x: 8, y: 486, w: 504, h: 170 }, C: { x: 8, y: 664, w: 504, h: 228 } }, { A: { x: 12, y: 12, w: 776, h: 392 }, B: { x: 12, y: 412, w: 380, h: 136 }, C: { x: 400, y: 412, w: 388, h: 136 } });

  /* ======================================================
     장면 1: 폭풍 해일 — 흡상 효과 + 바람 쏠림
     ====================================================== */
  const PXS = 44;                                                // 1 m = 44 px (높이 변화는 가로보다 과장해서 그려요)
  function stormGeom() {
    const { A, B, C } = stormRC();
    const g = { A, B, C, xl: A.x + 16, xr: A.x + A.w - (PHONE ? 96 : 130), y0: A.y + A.h - 92 };
    g.lw = g.xr - g.xl; g.landTop = g.y0 - 4.3 * PXS;
    return g;
  }
  const bumpAt = (g, x) => Math.exp(-Math.pow((x - g.xr) / (0.42 * g.lw), 2));
  function surfY(g, x) { const u = clamp((x - g.xl) / g.lw, 0, 1); return g.y0 - PXS * (S.ibV * bumpAt(g, x) + S.dwV * u); }
  function stormStep(dt) {
    S.pV = approach(S.pV, S.p, dt, 7); S.UV = approach(S.UV, S.U, dt, 6); S.LV = approach(S.LV, S.L, dt, 6); S.hV = approach(S.hV, S.h, dt, 6);
    S.ibV = approach(S.ibV, dEtaP(S.p), dt, 5); S.dwV = approach(S.dwV, dEtaW(S.U, S.L, S.h), dt, 5);
    // 바람 줄기
    const g = stormGeom();
    if (S.UV > 0.5 && !RM) {
      while (S.wind.length < 22) S.wind.push({ x: g.xl + Math.random() * g.lw, k: Math.random(), v: 0.8 + Math.random() * 0.5 });
      S.wind.forEach((w) => { w.x += dt * (40 + S.UV * 11) * w.v; if (w.x > g.xr + 4) { w.x = g.xl - 10; w.k = Math.random(); } });
    } else if (S.wind.length) S.wind.length = Math.max(0, S.wind.length - 1);
  }
  function drawCloud(cx, cy, k, t) {
    // 태풍: 위에서 비스듬히 본 소용돌이 (k: 0~1 세기)
    if (k < 0.02) { D.text(cx, cy + 4, '태풍 없음', { size: 13, weight: 800, color: '#94a3b8' }); return; }
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.34);
    const R = 62 + k * 26;
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, R); g.addColorStop(0, 'rgba(100,116,139,' + (0.35 * k) + ')'); g.addColorStop(1, 'rgba(100,116,139,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    for (let a = 0; a < 4; a++) {
      ctx.strokeStyle = 'rgba(71,85,105,' + (0.35 + 0.5 * k) + ')'; ctx.lineWidth = 7 + 4 * k; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 30; i++) { const f = i / 30, th = a * (TAU / 4) + f * 3.1 - t * (0.9 + 1.4 * k), r = 12 + f * (R - 14); const x = Math.cos(th) * r, y = Math.sin(th) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawStorm(t, dt) {
    stormStep(dt);
    const g = stormGeom(), { A, B, C, xl, xr, y0 } = g;
    // ---- A: 해안 단면
    card(A, '🌪️ 폭풍 해일: 태풍이 다가온 해안 (높이 과장)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.sky(A.x, A.y + 30, A.w, A.h - 30, '#cfe5f4', '#eaf4fb');
    // 바다 바닥(모래)과 땅
    const dpx = 30 + S.hV * 1.25, floorY = (u) => y0 + dpx * (1.3 - 0.6 * u);
    ctx.fillStyle = '#d9c7a0'; ctx.beginPath(); ctx.moveTo(A.x, A.y + A.h); ctx.lineTo(A.x, floorY(0));
    for (let i = 0; i <= 20; i++) { const u = i / 20; ctx.lineTo(xl + g.lw * u, floorY(u)); }
    ctx.lineTo(xr, g.landTop + 14); ctx.lineTo(A.x + A.w, g.landTop + 14); ctx.lineTo(A.x + A.w, A.y + A.h); ctx.closePath(); ctx.fill();
    // 바닷물
    const wg = ctx.createLinearGradient(0, y0 - 150, 0, y0 + 110); wg.addColorStop(0, 'rgba(56,189,248,.82)'); wg.addColorStop(1, 'rgba(3,105,161,.78)');
    const sp = [], rip = 1.2 + S.UV * 0.07, rph = t * (2.2 + S.UV * 0.12);
    for (let x = A.x; x <= xr; x += 8) sp.push([x, surfY(g, x) + Math.sin(x * 0.045 - rph) * rip]);
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(A.x, floorY(0));
    sp.forEach((p) => ctx.lineTo(p[0], p[1]));
    for (let i = 20; i >= 0; i--) { const u = i / 20; ctx.lineTo(xl + g.lw * u, floorY(u)); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
    sp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    // 땅 윗면
    const lg = ctx.createLinearGradient(0, g.landTop, 0, g.landTop + 30); lg.addColorStop(0, '#86c07e'); lg.addColorStop(1, '#6aa764');
    ctx.fillStyle = lg; ctx.fillRect(xr, g.landTop, A.x + A.w - xr, 18);
    ctx.fillStyle = '#b79b6c'; ctx.fillRect(xr, g.landTop + 18, A.x + A.w - xr, A.y + A.h - g.landTop);
    // 0 m 기준선
    D.dashedLine(xl, y0, xr, y0, { color: 'rgba(30,64,100,.55)', width: 1.5, dash: [6, 5] });
    D.text(xl + 4, y0 + 15, '평균 해수면(0 m)', { size: 12, weight: 800, color: '#0c4a6e', align: 'left' });
    D.text(xl + 4, y0 + dpx * 0.9, '평균 수심 h = ' + S.h + ' m (수심은 줄여서 그렸어요)', { size: 12, weight: 700, color: '#6b5a36', align: 'left' });
    // 눈금자 (땅 쪽)
    const rx = xr + 12, rw = 26;
    ctx.fillStyle = 'rgba(255,255,255,.94)'; rr(rx, y0 - 4.2 * PXS - 2, rw + 40, 4.2 * PXS + 12, 6).fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.4;
    for (let m = 0; m <= 8; m++) { const y = y0 - m * 0.5 * PXS; ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + (m % 2 ? 9 : 16), y); ctx.stroke(); if (m % 2 === 0) D.text(rx + 20, y + 4.5, m / 2 + ' m', { size: 12, weight: 800, color: '#334155', align: 'left' }); }
    const dev = S.ibV + S.dwV, cy = surfY(g, xr);
    D.dashedLine(xr - 6, cy, rx + rw + 6, cy, { color: '#b91c1c', width: 2, dash: [4, 3] });
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(rx - 2, cy); ctx.lineTo(rx - 12, cy - 6); ctx.lineTo(rx - 12, cy + 6); ctx.closePath(); ctx.fill();
    D.label(xr - 14, cy - 17, '해안 수위 +' + fN(r2(S.ibV) + r2(S.dwV), 2) + ' m', { bg: '#dc2626', size: 12.5, pad: 7, align: 'right' });
    // 태풍과 기압 화살표
    const k = clamp((1010 - S.pV) / 60, 0, 1), ccx = xr - 34, ccy = A.y + (PHONE ? 74 : 64);
    drawCloud(ccx, ccy, k, t);
    for (let i = 0; i < 7; i++) {
      const x = xl + 26 + (i * (xr - xl - 60)) / 6, pi = 1010 - (1010 - S.pV) * bumpAt(g, x), len = 8 + (pi - 940) * 0.55, yb = surfY(g, x) - 40;
      arrowS(x, yb - len, x, yb, { color: '#475569', width: 4, head: 9, alpha: 0.85 });
    }
    D.label(xl + 4, A.y + 50, '주변 기압 1010 hPa', { bg: '#475569', size: 12.5, pad: 7, align: 'left' });
    if (k > 0.02) { if (PHONE) D.label(xl + 4, A.y + 80, '중심 기압 ' + Math.round(S.pV) + ' hPa', { bg: '#b91c1c', size: 12.5, pad: 7, align: 'left' }); else D.label(ccx - 100, ccy, '중심 기압 ' + Math.round(S.pV) + ' hPa', { bg: '#b91c1c', size: 12.5, pad: 7, align: 'right' }); }
    if (!PHONE) D.text(xl + 4, A.y + 72, '↓ 화살표가 길수록 공기가 누르는 압력이 커요', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
    // 바람 줄기
    ctx.strokeStyle = 'rgba(30,41,59,.55)'; ctx.lineCap = 'round';
    S.wind.forEach((w) => { const y = surfY(g, w.x) - 12 - w.k * 22; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y); ctx.lineTo(w.x + 12 + S.UV * 0.6, y); ctx.stroke(); });
    if (S.UV > 0.5) D.label(xl + 90, surfY(g, xl + 90) - 52, '바람 ' + Math.round(S.UV) + ' m/s →', { bg: '#0f766e', size: 12.5, pad: 7, align: 'left' });
    // 해안 물보라
    if (S.UV > 8 && !RM && Math.random() < dt * S.UV * 0.5) parts.emit({ x: xr - 4, y: cy + 2, vx: -20 - Math.random() * 40, vy: -80 - Math.random() * 90, life: 0.7, size: 3, color: '#e0f2fe', gravity: 360, shape: 'circle' });
    ctx.restore();
    // ---- B: 막대
    card(B, '📊 해안 수위 상승 (m, 축척대로)');
    const bx = B.x + (PHONE ? 100 : 112), bw = B.w - (PHONE ? 100 : 112) - 18, MAXM = 4, X = (m) => bx + (bw * clamp(m, 0, MAXM)) / MAXM;
    const rows = [['기압 흡상', S.ibV, '#f59e0b', 0], ['바람 쏠림', S.dwV, '#0d9488', S.ibV], ['합계', S.ibV + S.dwV, '#dc2626', 0]];
    const rh = (B.h - 52) / 3, by0 = B.y + 36;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let m = 0; m <= MAXM; m++) { ctx.beginPath(); ctx.moveTo(X(m), by0 - 4); ctx.lineTo(X(m), by0 + rh * 3); ctx.stroke(); D.text(X(m), by0 + rh * 3 + 14 * FS, m + ' m', { size: 11.5, weight: 700, color: '#64748b' }); }
    rows.forEach((r, i) => {
      const y = by0 + i * rh + 4, hh = rh - 8;
      D.text(B.x + 12, y + hh * 0.72, r[0], { size: 13, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#f1f5f9'; rr(bx, y, bw, hh, 5).fill();
      const x0 = X(r[3]), x1 = X(r[3] + r[1]);
      if (x1 - x0 > 0.4) { ctx.fillStyle = r[2]; rr(x0, y, x1 - x0, hh, Math.min(5, (x1 - x0) / 2)).fill(); }
      D.text(Math.min(x1 + 6, bx + bw - 44), y + hh * 0.72, fN(i === 2 ? r2(S.ibV) + r2(S.dwV) : r2(r[1]), 2) + ' m', { size: 12.5, weight: 900, color: '#1e293b', align: 'left', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    });
    // ---- C: 계산식
    card(C, '🧮 계산');
    const x0 = C.x + 14, ww = C.w - 28; let y = C.y + 40 * FS;
    const ibr = r2(dEtaP(S.p)), dwr = r2(dEtaW(S.U, S.L, S.h)), show = S.showCalc || (game && game.free);
    const lines = [
      ['① 흡상 효과  Δη = Δp / (ρg)', '#b45309', 800],
      ['   = ' + (1010 - S.p) + ' hPa × 100 / (1025 × 9.8) = ' + (show ? fN(ibr, 2) + ' m' : '?'), '#92400e', 700],
      ['② 바람 쏠림  Δη = τL / (ρgh)', '#0f766e', 800],
      ['   τ = 1.2 × 2.5×10⁻³ × ' + S.U + '² = ' + fN(tauOf(S.U), 1) + ' N/m²', '#115e59', 700],
      ['   = ' + fN(tauOf(S.U), 1) + ' × ' + S.L + ' km / (1025 × 9.8 × ' + S.h + ' m) = ' + fN(dwr, 2) + ' m', '#115e59', 700],
    ];
    lines.forEach((l, i) => { y = para(x0, y + (i ? 0 : 0), ww, l[0], 12.5, l[1], l[2]) + 3; });
  }
  function readStorm() {
    const show = S.showCalc || (game && game.free);
    setReadouts(['중심 기압 · Δp', Math.round(S.p) + ' hPa · ' + (1010 - S.p) + ' hPa', '바람 쏠림', fN(r2(dEtaW(S.U, S.L, S.h)), 2) + ' m', '해안 수위 상승', show ? fN(r2(dEtaP(S.p)) + r2(dEtaW(S.U, S.L, S.h)), 2) + ' m' : '직접 계산해요']);
  }

  /* ======================================================
     장면 2: 지진 해일 — 해저 단층 → 천해파 c = √(gh)
     ====================================================== */
  const H_DEEP = 4000, C0 = Math.sqrt(G * H_DEEP), KSIM = 360, DIST = 800, LAM = 120, T_END = 5000;   // KSIM: 화면 1초 = 실제 6분
  const c0km = C0 / 1000;
  const fPulse = (u) => (Math.abs(u) >= 1 ? 0 : Math.pow(Math.cos((Math.PI * u) / 2), 2));
  const heightAt = (h, H0) => H0 * Math.pow(H_DEEP / h, 0.25);
  const hOfS = (s) => H_DEEP * Math.pow(10 / H_DEEP, clamp(s, 0, 1));
  const H0of = () => S.D / 2;
  const tsRC = () => {
    if (S.tsView === 'shore') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 420 }, C: { x: 8, y: 436, w: 504, h: 300 } }, { A: { x: 12, y: 12, w: 776, h: 330 }, C: { x: 12, y: 350, w: 776, h: 198 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 300 }, B: { x: 8, y: 316, w: 504, h: 300 }, C: { x: 8, y: 624, w: 504, h: 268 } }, { A: { x: 12, y: 12, w: 776, h: 236 }, B: { x: 12, y: 256, w: 380, h: 292 }, C: { x: 400, y: 256, w: 388, h: 292 } });
  };
  function resetTs() { S.tsRun = false; S.tsT = 0; S.tsFault = 0; S.arrived = -1; }
  function startTs() {
    if (S.D <= 0) { say('먼저 단층 변위 D를 0보다 크게 해요', true); return false; }
    S.tsT = 0; S.tsFault = 0; S.arrived = -1; S.tsRun = true; parts.clear(); return true;
  }
  function startShore() {
    if (S.D <= 0) { say('먼저 단층 변위 D를 0보다 크게 해요', true); return false; }
    S.zoomT = 0; S.zoomS = 0; S.zoomHold = 0; S.zoomDone = false; return true;
  }
  function tsStep(dt) {
    if (S.tsRun) {
      S.tsFault = Math.min(1, S.tsFault + dt / (RM ? 0.01 : 1.1));
      if (S.tsFault >= 1) {
        S.tsT = Math.min(T_END, S.tsT + dt * KSIM);
        if (S.arrived < 0 && c0km * S.tsT >= DIST) {
          S.arrived = DIST / c0km;
          const g = tsGeom(); parts.burst(g.xr, g.y0 - 8, { count: 22, colors: ['#e0f2fe', '#7dd3fc', '#38bdf8'], gravity: 300, speed: 150, life: 0.9, shape: 'circle', size: 3.4 });
        }
        if (S.tsT >= T_END) S.tsRun = false;
      }
    }
    if (S.zoomT >= 0 && !S.zoomDone) {
      S.zoomT += dt;
      const sNow = S.zoomS || 0;
      if (sNow < 1) { S.zoomS = Math.min(1, sNow + dt * 1.1 * (cOf(hOfS(sNow)) / C0)); if (S.zoomS >= 1) { const g = tsGeom(); parts.burst(g.xe, g.y0 - 30, { count: 26, colors: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#fff'], gravity: 320, speed: 190, life: 1.0, shape: 'circle', size: 3.6 }); } }
      else { S.zoomHold += dt; if (S.zoomHold > 1.6) S.zoomDone = true; }
    }
  }
  function tsGeom() {
    const R = tsRC(), A = R.A, g = { R, A };
    if (S.tsView === 'shore') {
      g.xs = A.x + 2; g.xe = A.x + A.w - 100; g.y0 = A.y + (PHONE ? 170 : 150); g.pxh = PHONE ? 28 : 24;
    } else {
      g.xl = A.x + 16; g.xr = A.x + A.w - 58; g.y0 = A.y + (PHONE ? 112 : 92); g.pxh = PHONE ? 30 : 26;
      g.kx = (g.xr - g.xl) / (DIST + 150);                       // px / km (−150 ~ 800 km)
      g.xsrc = g.xl + 150 * g.kx;
    }
    return g;
  }
  const dpxOf = (h) => 12 + ((Math.log10(h) - 1) / (Math.log10(4000) - 1)) * 98;
  const fmtMin = (s) => Math.round(s / 60);

  function drawTsOpen(t, dt) {
    const g = tsGeom(), { A, y0, pxh, kx, xl, xr, xsrc } = g, { B, C } = g.R;
    const H0 = H0of(), ct = c0km * S.tsT;                      // 파봉 위치(진원에서 km)
    card(A, '🌋 지진 해일: 바다 전체가 솟아 퍼져요 (높이 과장)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.sky(A.x, A.y + 30, A.w, A.h - 30, '#d9ecf8', '#f0f8fd');
    const floorBase = y0 + (PHONE ? 110 : 100);
    // 바닷물
    const surfEta = (km) => (S.D / 2) * (fPulse((km - ct) / LAM) + fPulse((km + ct) / LAM)) * S.tsFault;
    const wg = ctx.createLinearGradient(0, y0 - 40, 0, floorBase); wg.addColorStop(0, 'rgba(56,189,248,.85)'); wg.addColorStop(1, 'rgba(3,105,161,.8)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(xl, floorBase);
    const pts = [];
    for (let x = xl; x <= xr + 0.1; x += 4) { const km = (x - xsrc) / kx, e = S.tsT <= 0 ? S.D * fPulse(km / LAM) * S.tsFault : surfEta(km); const y = y0 - pxh * e + Math.sin(x * 0.05 - t * 2) * 0.8; pts.push([x, y]); ctx.lineTo(x, y); }
    ctx.lineTo(xr, floorBase); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 바닥(단층으로 솟은 부분)
    ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(A.x, A.y + A.h); ctx.lineTo(A.x, floorBase + 4);
    for (let x = xl; x <= xr + 0.1; x += 4) { const km = (x - xsrc) / kx; const up = S.D * fPulse(km / LAM) * S.tsFault * pxh; ctx.lineTo(x, floorBase - up); }
    ctx.lineTo(xr, A.y + A.h); ctx.closePath(); ctx.fill();
    // 단층 표시 (아직 안 일으켰을 때: 점선으로 솟을 모양 예고)
    if (S.tsFault < 1 && S.D > 0) {
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = xl; x <= xr; x += 4) { const km = (x - xsrc) / kx, y = floorBase - S.D * fPulse(km / LAM) * pxh; x === xl ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // 땅
    ctx.fillStyle = '#8fc283'; ctx.fillRect(xr, y0 - 12, A.x + A.w - xr, 14); ctx.fillStyle = '#b79b6c'; ctx.fillRect(xr, y0 + 2, A.x + A.w - xr, A.h);
    D.dashedLine(xl, y0, xr, y0, { color: 'rgba(30,64,100,.5)', width: 1.4, dash: [6, 5] });
    // 파봉 표시
    if (S.tsT > 0 && ct >= LAM && ct < DIST + 5) {
      const px = xsrc + ct * kx, py = y0 - pxh * H0 - 2; D.sphere(px, py, 5, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 2 });
      D.label(clamp(px, xl + 60, xr - 70), Math.max(A.y + 48, py - 20), '파고 ' + fN(H0, 1) + ' m', { bg: '#0369a1', size: 12.5, pad: 7 });
    } else if (S.D > 0 && ct < LAM) {
      D.label(Math.max(xsrc, xl + 90), Math.max(A.y + 46, y0 - pxh * S.D - 18), '바다 전체가 ' + fN(S.D, 1) + ' m 솟아요', { bg: '#7c2d12', size: 12.5, pad: 7 });
    }
    // 단층 · 거리 눈금
    D.text(xsrc, floorBase + 17, '진원(단층)', { size: 12.5, weight: 800, color: '#7c2d12' });
    D.text(xr - 8, floorBase + 17, '해안', { size: 12.5, weight: 800, color: '#14532d', align: 'right' });
    arrowS(xsrc + 52, floorBase + 13, xr - 52, floorBase + 13, { color: '#475569', width: 2, head: 8 });
    D.text(xl + 4, A.y + A.h - 8, PHONE ? '수심 ' + H_DEEP + ' m · 진원–해안 ' + DIST + ' km (깊이는 줄여 그림)' : '평균 수심 ' + H_DEEP + ' m · 진원에서 해안까지 ' + DIST + ' km (바다 깊이는 줄여서 그렸어요)', { size: 12, weight: 700, color: '#475569', align: 'left' });
    ctx.restore();
    // ---- B: 위에서 본 모습
    card(B, '🛰️ 위에서 본 모습: 동심원으로 퍼져요');
    const bx0 = B.x + 36, bk = (B.w - 36 - 40) / DIST, by = B.y + B.h / 2 + 10;
    ctx.save(); rr(B.x, B.y, B.w, B.h, 14).clip();
    ctx.fillStyle = '#cfe8f7'; ctx.fillRect(B.x, B.y + 30, B.w, B.h);
    const coastX = bx0 + DIST * bk;
    ctx.fillStyle = '#c8d8a8'; ctx.fillRect(coastX, B.y + 30, B.x + B.w - coastX, B.h);
    ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(coastX, B.y + 30); ctx.lineTo(coastX, B.y + B.h); ctx.stroke();
    if (S.tsT > 0) {
      const rc = ct * bk;
      for (let i = -4; i <= 4; i++) {
        const u = i / 4, r = rc + u * LAM * bk; if (r < 2) continue;
        const a = fPulse(u) * 0.9; if (a < 0.02) continue;
        ctx.strokeStyle = 'rgba(2,132,199,' + a + ')'; ctx.lineWidth = i === 0 ? 4 : 2.4; ctx.beginPath(); ctx.arc(bx0, by, r, 0, TAU); ctx.stroke();
      }
    }
    D.sphere(bx0, by, 7, '#dc2626', { outline: '#fff', outlineWidth: 2 });
    D.text(bx0, by + 24, '진원', { size: 12.5, weight: 800, color: '#7f1d1d' });
    D.dashedLine(bx0, by, coastX, by, { color: 'rgba(30,41,59,.55)', width: 1.6, dash: [5, 5] });
    D.label((bx0 + coastX) / 2, by - 4 - 14 * FS, DIST + ' km', { bg: '#334155', size: 12.5, pad: 7 });
    D.text(coastX + (B.x + B.w - coastX) / 2, by + 6, '해안', { size: 12.5, weight: 800, color: '#14532d' });
    if (S.arrived >= 0) { D.ring(coastX, by, 14, t, { color: '#dc2626', speed: 1.4, width: 2.4 }); }
    ctx.restore();
    // ---- C: 계산
    card(C, '🧮 천해파의 속도와 도달 시간');
    const x0 = C.x + 14, ww = C.w - 28; let y = C.y + 42 * FS;
    const show = S.showTs || (game && game.free);
    const cRound = Math.round(C0), kmh = Math.round(C0 * MPS), tsec = DIST * 1000 / C0, tmin = Math.round(tsec / 60);
    y = para(x0, y, ww, 'c = √(g·h) 는 파장이 수심보다 훨씬 긴 파(천해파)의 속도예요.', 12.5, '#334155', 700) + 4;
    y = para(x0, y, ww, 'h = ' + H_DEEP + ' m  →  c = √(9.8 × ' + H_DEEP + ') = ' + (show ? cRound + ' m/s (약 ' + kmh + ' km/h)' : '?'), 13.5, '#0369a1', 900) + 4;
    y = para(x0, y, ww, 't = d / c = ' + DIST + ' km / ' + (show ? cRound : '?') + ' m/s = ' + (show ? Math.round(tsec) + ' 초 ≈ ' + tmin + '분' : '?'), 13.5, '#0369a1', 900) + 8;
    y = para(x0, y, ww, '지금 시각 t = ' + fmtMin(S.tsT) + '분 · 파봉은 진원에서 ' + Math.round(Math.min(ct, DIST)) + ' km 지점', 13, '#9a3412', 800) + 4;
    y = para(x0, y, ww, '파장 약 ' + (2 * LAM) + ' km · 주기 약 20분 (풍파는 파장 수십~수백 m, 주기 수 초~20초)', 12, '#475569', 700);
    if (S.arrived >= 0) { D.label(C.x + C.w - 18, C.y + C.h - 24, '해안 도착!', { bg: '#dc2626', size: 13, pad: 8, align: 'right' }); }
  }
  function drawTsShore(t, dt) {
    const g = tsGeom(), { A, xs, xe, y0, pxh } = g, { C } = g.R;
    const H0 = S.D > 0 ? H0of() : 0, s = S.zoomS || 0, running = S.zoomT >= 0;
    card(A, '🔍 해안 접근: 속도↓ 파장↓ 파고↑ (높이 과장)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.sky(A.x, A.y + 30, A.w, A.h - 30, '#d9ecf8', '#f0f8fd');
    const floorY = (x) => y0 + dpxOf(hOfS((x - xs) / (xe - xs)));
    const xOfS = (v) => xs + v * (xe - xs);
    // 현재 파의 모양
    const cs = cOf(hOfS(s)), wpx = 38 + 130 * (cs / C0), amp = H0 * Math.pow(H_DEEP / hOfS(s), 0.25), xc = xOfS(s);
    const eta = (x) => (running ? amp * fPulse((x - xc) / wpx) * (S.zoomDone ? 0 : 1) : 0);
    const wg = ctx.createLinearGradient(0, y0 - 60, 0, y0 + 120); wg.addColorStop(0, 'rgba(56,189,248,.85)'); wg.addColorStop(1, 'rgba(3,105,161,.8)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(xs, floorY(xs));
    const pts = [];
    for (let x = xs; x <= xe + 0.1; x += 3) { const y = y0 - pxh * eta(x) + Math.sin(x * 0.06 - t * 2) * 0.7; pts.push([x, y]); ctx.lineTo(x, y); }
    for (let x = xe; x >= xs; x -= 3) ctx.lineTo(x, floorY(x));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 바닥과 땅
    ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(A.x, A.y + A.h); ctx.lineTo(A.x, floorY(xs));
    for (let x = xs; x <= xe + 0.1; x += 3) ctx.lineTo(x, floorY(x));
    ctx.lineTo(A.x + A.w, y0 - 20); ctx.lineTo(A.x + A.w, A.y + A.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8fc283'; ctx.beginPath(); ctx.moveTo(xe, floorY(xe)); ctx.lineTo(A.x + A.w, y0 - 20); ctx.lineTo(A.x + A.w, y0 - 8); ctx.lineTo(xe, floorY(xe) + 6); ctx.closePath(); ctx.fill();
    D.dashedLine(xs, y0, xe, y0, { color: 'rgba(30,64,100,.5)', width: 1.4, dash: [6, 5] });
    // 수심 표지
    [[4000, 0], [1000, 0.2314], [100, 0.6158], [10, 1]].forEach(([h, sv]) => {
      const x = xOfS(sv), fy = floorY(x);
      D.dashedLine(x, y0 + 2, x, fy, { color: 'rgba(15,23,42,.35)', width: 1.4, dash: [3, 4] });
      const lab = h + ' m', ly = Math.min(fy + 18 * FS, A.y + A.h - 40 * FS);
      D.text(clamp(x, A.x + 36, A.x + A.w - 52), fy + 16 * FS > A.y + A.h - 30 ? A.y + A.h - 30 : fy + 16 * FS, lab, { size: 12.5, weight: 800, color: '#6b5a36' });
    });
    D.text(A.x + 10, A.y + A.h - 10, '바다 바닥의 수심 4000 → 10 m (로그 눈금: 같은 간격 = 같은 배수)', { size: 12, weight: 700, color: '#6b5a36', align: 'left' });
    if (running && !S.zoomDone) {
      const py = y0 - pxh * amp - 6; D.sphere(xc, py, 5, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 2 });
      const l1 = D.label(clamp(xc, A.x + 80, A.x + A.w - 90), Math.max(A.y + 50, py - 22), '수심 ' + (hOfS(s) >= 100 ? Math.round(hOfS(s) / 10) * 10 : fN(hOfS(s), 0)) + ' m · 파고 ' + fN(amp, 1) + ' m', { bg: '#0369a1', size: 12.5, pad: 7 });
    }
    if (!running) D.text((xs + xe) / 2, y0 - 36, '‘파 보내기’를 누르면 외해(수심 4000 m)에서 출발한 파가 해안으로 다가가요', { size: 13, weight: 800, color: '#334155' });
    if (S.zoomS >= 1) D.label(xe - 10, y0 - 70, '해안에서 약 ' + fN(heightAt(10, H0), 1) + ' m!', { bg: '#dc2626', size: 13.5, pad: 8, align: 'right' });
    ctx.restore();
    // ---- C: 표
    card(C, '📋 수심에 따른 파속과 파고 (외해 파고 ' + fN(H0, 1) + ' m 기준)');
    const x0 = C.x + 14, ww = C.w - 28, cols = [0, 0.2, 0.42, 0.66], hdr = ['수심 h', '파속 c = √(gh)', '시속', '파고 H'];
    let y = C.y + 50 * FS;
    hdr.forEach((hh, i) => D.text(x0 + ww * cols[i], y, hh, { size: 12.5, weight: 800, color: '#64748b', align: 'left' }));
    const rowsT = [4000, 1000, 100, 10], rh = (C.h - 92 * FS) / 4;
    rowsT.forEach((h, i) => {
      const yy = y + 8 + i * rh, cur = running && Math.abs(Math.log(hOfS(s) / h)) < 0.35;
      ctx.fillStyle = cur ? 'rgba(14,165,233,.16)' : (i % 2 ? '#f8fafc' : '#fff'); rr(x0 - 6, yy, ww + 12, rh - 3, 6).fill();
      const cv = cOf(h), cells = [h + ' m', (cv >= 10 ? Math.round(cv) : fN(cv, 1)) + ' m/s', Math.round(cv * MPS) + ' km/h', fN(heightAt(h, H0), 1) + ' m'];
      cells.forEach((tx, k) => D.text(x0 + ww * cols[k], yy + rh * 0.62, tx, { size: 13.5, weight: 800, color: cur ? '#0369a1' : '#334155', align: 'left' }));
    });
    D.text(C.x + C.w - 14, C.y + C.h - 10, '파고 ∝ h^(−1/4) (에너지 보존) · 좁은 만에서는 더 커져요', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
  }
  function readTs() {
    if (S.tsView === 'shore') { const s = S.zoomS || 0; setReadouts(['지금 수심', S.zoomT >= 0 ? Math.round(hOfS(s)) + ' m' : '—', '지금 파속', S.zoomT >= 0 ? Math.round(cOf(hOfS(s)) * 10) / 10 + ' m/s' : '—', '지금 파고', S.zoomT >= 0 ? fN(H0of() * Math.pow(H_DEEP / hOfS(s), 0.25), 1) + ' m' : '—']); return; }
    setReadouts(['단층 변위 D', fN(S.D, 1) + ' m', '외해 파고 D/2', fN(H0of(), 1) + ' m', '경과 시간', fmtMin(S.tsT) + '분']);
  }

  /* ======================================================
     장면 3: 피해 요인 — 총 수위 = 천문 조위 + 기압 흡상 + 바람 쏠림, 지형, 방파제 3.0 m
     ====================================================== */
  const WALL = 3.0, IBX = 0.5, WIND1 = 1.0;
  const TIDES = { low: -2.0, mean: 0, high: 2.0 }, TIDE_NAME = { low: '간조', mean: '평균 조위', high: '만조' };
  const TERRS = {
    line: { name: '직선 해안', k: 1.0, txt: '수심이 보통이고 해안선이 곧아요' },
    funnel: { name: '깔때기형 만', k: 1.8, txt: '안쪽으로 갈수록 좁아져 바닷물이 한곳에 모여요' },
    steep: { name: '가파른 해안', k: 0.4, txt: '바다가 금세 깊어져서 수심 h가 커요' },
    shelf: { name: '완만한 대륙붕', k: 2.0, txt: '얕은 바다가 넓게 이어져서 수심 h가 작아요' },
  };
  const windOf = (terr) => r2(WIND1 * TERRS[terr].k);
  const devOf = (terr) => r2(IBX + windOf(terr));
  const totOf = (tide, terr) => r2(TIDES[tide] + devOf(terr));
  const riskRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 440 }, B: { x: 8, y: 456, w: 504, h: 200 }, C: { x: 8, y: 664, w: 504, h: 228 } }, { A: { x: 12, y: 12, w: 776, h: 334 }, B: { x: 12, y: 354, w: 380, h: 194 }, C: { x: 400, y: 354, w: 388, h: 194 } });
  function riskGeom() {
    const { A, B, C } = riskRC();
    const px = PHONE ? 40 : 36, g = { A, B, C, px, y0: A.y + (PHONE ? 250 : 214), xl: A.x + 40, xw: A.x + A.w - (PHONE ? 140 : 200) };
    g.landTop = g.y0 - 2.4 * px; g.wallTop = g.y0 - WALL * px; g.ww = 18;
    return g;
  }
  function riskStep(dt) {
    S.tideV = approach(S.tideV, TIDES[S.tide], dt, 4); S.devV = approach(S.devV, devOf(S.terr), dt, 4);
    S.totV = approach(S.totV, totOf(S.tide, S.terr), dt, 4);
  }
  function drawRisk(t, dt) {
    riskStep(dt);
    const g = riskGeom(), { A, B, C, px, y0, xl, xw } = g, tot = S.totV, ex = Math.max(0, tot - WALL), showT = S.showTot || (game && game.free);
    const Y = (m) => y0 - m * px;
    card(A, '🏖️ 같은 태풍, 다른 해안 (높이 과장)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.sky(A.x, A.y + 30, A.w, A.h - 30, '#cfe5f4', '#eaf4fb');
    // 바다 바닥 (지형에 따라 모양이 달라요)
    const fl = { line: [95, 36], funnel: [95, 36], steep: [112, 100], shelf: [40, 30] }[S.terr];
    const floorY = (u) => y0 + lerp(fl[0], fl[1], S.terr === 'steep' ? Math.pow(u, 4) : u);
    ctx.fillStyle = '#d9c7a0'; ctx.beginPath(); ctx.moveTo(A.x, A.y + A.h); ctx.lineTo(A.x, floorY(0));
    for (let i = 0; i <= 24; i++) { const u = i / 24; ctx.lineTo(A.x + (xw - A.x) * u, floorY(u)); }
    ctx.lineTo(xw, g.landTop); ctx.lineTo(A.x + A.w, g.landTop); ctx.lineTo(A.x + A.w, A.y + A.h); ctx.closePath(); ctx.fill();
    // 바닷물: 먼바다는 조위, 해안 쪽으로 해일 편차만큼 높아져요
    const lvl = (x) => { const u = clamp((x - xl) / (xw - xl), 0, 1); return S.tideV + S.devV * Math.pow(u, 1.6); };
    const wg = ctx.createLinearGradient(0, Y(4), 0, y0 + 120); wg.addColorStop(0, 'rgba(56,189,248,.85)'); wg.addColorStop(1, 'rgba(3,105,161,.8)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(A.x, floorY(0));
    const sp = [];
    for (let x = A.x; x <= xw; x += 5) { const y = Y(lvl(x)) + Math.sin(x * 0.05 - t * 2.4) * (1 + ex * 1.5); sp.push([x, y]); ctx.lineTo(x, y); }
    for (let i = 24; i >= 0; i--) { const u = i / 24; ctx.lineTo(A.x + (xw - A.x) * u, floorY(u)); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); sp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 땅과 마을
    ctx.fillStyle = '#86c07e'; ctx.fillRect(xw, g.landTop - 6, A.x + A.w - xw, 14); ctx.fillStyle = '#b79b6c'; ctx.fillRect(xw, g.landTop + 8, A.x + A.w - xw, A.h);
    [[xw + 60, 0], [xw + 108, 0.5]].forEach(([hx, s2]) => { const hy = g.landTop - 6; ctx.fillStyle = '#fef3c7'; rr(hx - 16, hy - 24, 32, 24, 3).fill(); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(hx - 20, hy - 24); ctx.lineTo(hx, hy - 40); ctx.lineTo(hx + 20, hy - 24); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7c5a2a'; ctx.fillRect(hx - 4, hy - 13, 8, 13); });
    // 월파: 방파제를 넘은 물이 마을 쪽으로 흘러요
    if (ex > 0.02) {
      const fd = Math.min(ex, 1.5) * 0.9 * px + 6;
      ctx.fillStyle = 'rgba(56,189,248,.7)'; ctx.beginPath(); ctx.moveTo(xw + g.ww, g.wallTop - 2); ctx.lineTo(xw + g.ww + 14, g.landTop - 6); ctx.lineTo(xw + g.ww + 70, g.landTop - 6 - fd * 0.5); ctx.lineTo(A.x + A.w, g.landTop - 6 - fd * 0.25); ctx.lineTo(A.x + A.w, g.landTop - 6 + 2); ctx.lineTo(xw + g.ww, g.landTop - 6 + 2); ctx.closePath(); ctx.fill();
      if (!RM && Math.random() < dt * 30 * Math.min(1, ex + 0.3)) parts.emit({ x: xw + 4 + Math.random() * g.ww, y: Y(Math.max(tot, WALL)), vx: 40 + Math.random() * 90, vy: -90 - Math.random() * 130, life: 0.8, size: 3, color: '#e0f2fe', gravity: 380 });
    }
    // 방파제
    D.shadow(() => { const wgr = ctx.createLinearGradient(xw, 0, xw + g.ww, 0); wgr.addColorStop(0, '#cbd5e1'); wgr.addColorStop(1, '#94a3b8'); ctx.fillStyle = wgr; rr(xw, g.wallTop, g.ww, g.landTop - g.wallTop + 22, 3).fill(); }, { blur: 5, y: 2 });
    // 기준선
    D.dashedLine(A.x, y0, xw, y0, { color: 'rgba(30,64,100,.5)', width: 1.4, dash: [6, 5] });
    D.dashedLine(A.x + 30, g.wallTop, A.x + A.w - 10, g.wallTop, { color: '#b91c1c', width: 2, dash: [8, 5] });
    D.label(xw + g.ww + 8, g.landTop + 26, (PHONE ? '방파제 ' : '방파제 높이 ') + fN(WALL, 1) + ' m', { bg: '#b91c1c', size: 12.5, pad: 7, align: 'left' });
    // 눈금
    for (let m = -2; m <= 4; m++) { ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(A.x + 6, Y(m)); ctx.lineTo(A.x + 16, Y(m)); ctx.stroke(); D.text(A.x + 20, Y(m) + 4.5, (m < 0 ? '−' : m > 0 ? '+' : '') + Math.abs(m) + ' m', { size: 11.5, weight: 800, color: '#334155', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); }
    // 수위 표시
    if (showT) {
      D.dashedLine(xw - 70, Y(tot), xw - 2, Y(tot), { color: '#dc2626', width: 2, dash: [4, 3] });
      D.label(xw - 74, Y(tot) - (tot > 2.5 ? -16 : 16), '해안 수위 ' + (tot < -0.05 ? '−' : tot > 0.05 ? '+' : '') + fN(Math.abs(r2(tot)), 1) + ' m', { bg: ex > 0.02 ? '#dc2626' : '#0369a1', size: 12.5, pad: 7, align: 'right' });
    }
    D.label(A.x + 62, Y(S.tideV) - 16, TIDE_NAME[S.tide] + ' ' + (TIDES[S.tide] < 0 ? '−' : TIDES[S.tide] > 0 ? '+' : '') + fN(Math.abs(TIDES[S.tide]), 1) + ' m', { bg: '#475569', size: 12.5, pad: 7, align: 'left' });
    // 판정 표지
    const flood = r2(totOf(S.tide, S.terr)) > WALL;
    if (showT) D.label(A.x + A.w / 2 + (PHONE ? 0 : 60), A.y + 48, flood ? '⚠ 월파 · 침수: 방파제를 ' + fN(r2(totOf(S.tide, S.terr) - WALL), 1) + ' m 넘어요' : '✅ 방파제 안쪽은 안전해요', { bg: flood ? '#dc2626' : '#15803d', size: 13.5, pad: 10 });
    ctx.restore();
    // ---- B: 막대
    card(B, '📊 총 수위 = 조위 + 기압 흡상 + 바람 쏠림');
    const bx = B.x + (PHONE ? 104 : 116), bw = B.w - (PHONE ? 104 : 116) - 16, X0 = -2.5, X1 = 5, X = (m) => bx + (bw * (clamp(m, X0, X1) - X0)) / (X1 - X0);
    const tv = TIDES[S.tide], iv = IBX, wv = windOf(S.terr);
    const rows = [['천문 조위', 0, tv, '#64748b', (tv < 0 ? '−' : '+') + fN(Math.abs(tv), 1)], ['기압 흡상', tv, tv + iv, '#f59e0b', '+' + fN(iv, 1)], ['바람 쏠림', tv + iv, tv + iv + wv, '#0d9488', '+' + fN(wv, 1)], ['총 수위', 0, showT ? tv + iv + wv : 0, flood ? '#dc2626' : '#2563eb', showT ? '= ' + fixm(r2(tv + iv + wv), 1) : '= ?']];
    const by0 = B.y + 40, rh = (B.h - 88) / 4;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let m = -2; m <= 5; m++) { ctx.beginPath(); ctx.moveTo(X(m), by0 - 2); ctx.lineTo(X(m), by0 + rh * 4); ctx.stroke(); D.text(X(m), by0 + rh * 4 + 14 * FS, m + '', { size: 11.5, weight: 700, color: '#64748b' }); }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), by0 - 2); ctx.lineTo(X(0), by0 + rh * 4); ctx.stroke();
    rows.forEach((r, i) => {
      const y = by0 + i * rh + 3, hh = rh - 6;
      D.text(B.x + 12, y + hh * 0.72, r[0], { size: 13, weight: 800, color: '#334155', align: 'left' });
      const xa = X(Math.min(r[1], r[2])), xb = X(Math.max(r[1], r[2]));
      if (xb - xa > 0.4) { ctx.fillStyle = r[3]; rr(xa, y, xb - xa, hh, Math.min(4, (xb - xa) / 2)).fill(); }
      const lx = r[2] >= r[1] ? xb + 5 : xa - 5;
      D.text(Math.min(lx, bx + bw - 30), y + hh * 0.72, r[4], { size: 12.5, weight: 900, color: '#1e293b', align: r[2] >= r[1] && lx < bx + bw - 30 ? 'left' : 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    });
    D.dashedLine(X(WALL), by0 - 6, X(WALL), by0 + rh * 4, { color: '#b91c1c', width: 2, dash: [5, 4] });
    D.label(X(WALL), by0 + rh * 4 + 28 * FS, '방파제 3.0 m', { bg: '#b91c1c', size: 11.5, pad: 6 });
    // ---- C: 지형
    card(C, '🗺️ 해안 지형: ' + TERRS[S.terr].name);
    const mx = C.x + 12, my = C.y + 38, mw = PHONE ? 190 : 170, mh = C.h - 50;
    ctx.save(); rr(mx, my, mw, mh, 10).clip();
    ctx.fillStyle = '#cfe8f7'; ctx.fillRect(mx, my, mw, mh);
    const shx = mx + mw * 0.72;
    ctx.fillStyle = '#c8d8a8';
    ctx.beginPath();
    if (S.terr === 'funnel') { ctx.moveTo(mx + mw, my); ctx.lineTo(mx + mw * 0.55, my); ctx.lineTo(mx + mw * 0.9 + 0, my + mh * 0.4); ctx.lineTo(mx + mw * 0.9, my + mh * 0.6); ctx.lineTo(mx + mw * 0.55, my + mh); ctx.lineTo(mx + mw, my + mh); }
    else { ctx.moveTo(mx + mw, my); ctx.lineTo(shx, my); ctx.lineTo(shx, my + mh); ctx.lineTo(mx + mw, my + mh); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,64,100,.4)'; ctx.lineWidth = 1.4;
    const cn = S.terr === 'steep' ? [0.04, 0.09, 0.14, 0.2] : S.terr === 'shelf' ? [0.1, 0.34, 0.58, 0.8] : [0.08, 0.2, 0.34, 0.5];
    if (S.terr !== 'funnel') cn.forEach((c) => { ctx.beginPath(); ctx.moveTo(shx - mw * c, my); ctx.lineTo(shx - mw * c, my + mh); ctx.stroke(); });
    else [0.12, 0.26].forEach((c) => { ctx.beginPath(); ctx.moveTo(mx + mw * (0.55 - c), my); ctx.lineTo(mx + mw * (0.9 - c), my + mh * 0.4); ctx.moveTo(mx + mw * (0.55 - c), my + mh); ctx.lineTo(mx + mw * (0.9 - c), my + mh * 0.6); ctx.stroke(); });
    ctx.restore();
    // 바람·해수 화살표
    const aw = 12 + S.devV * 4;
    if (S.terr === 'funnel') { [0.2, 0.5, 0.8].forEach((f) => { const ty = my + mh * f, ey = my + mh * (0.5 + (f - 0.5) * 0.35); arrowS(mx + 14, ty, mx + mw * 0.72, ey, { color: '#0d9488', width: 3.5, head: 9, alpha: 0.9 }); }); }
    else [0.25, 0.5, 0.75].forEach((f) => arrowS(mx + 14, my + mh * f, shx - 8, my + mh * f, { color: '#0d9488', width: 3.5, head: 9, alpha: 0.9 }));
    D.text(mx + mw / 2, my + mh + 2 + 0, '', {});
    D.label(mx + 8, my + 14, '바다', { bg: '#0369a1', size: 11.5, pad: 6, align: 'left' });
    D.label(mx + mw - 6, my + 14, '육지', { bg: '#65a30d', size: 11.5, pad: 6, align: 'right' });
    const tx = mx + mw + 14, tw = C.w - (tx - C.x) - 12; let ty = C.y + 46 * FS;
    ty = para(tx, ty, tw, TERRS[S.terr].txt, 12.5, '#334155', 800) + 6;
    ty = para(tx, ty, tw, '바람 쏠림 ' + fN(windOf(S.terr), 1) + ' m  (직선 해안 1.0 m 기준)', 13, '#0f766e', 900) + 4;
    ty = para(tx, ty, tw, 'Δη = τL / (ρgh): 수심 h가 작을수록 커요', 12, '#475569', 700) + 4;
    para(tx, ty, tw, '해일 편차 = 흡상 0.5 + 쏠림 ' + fN(windOf(S.terr), 1) + ' = ' + fN(devOf(S.terr), 1) + ' m', 12.5, '#b91c1c', 800);
  }
  function readRisk() {
    const tot = totOf(S.tide, S.terr), flood = tot > WALL, showT = S.showTot || (game && game.free);
    setReadouts(['천문 조위', fixm(TIDES[S.tide], 1) + ' m (' + TIDE_NAME[S.tide] + ')', '해일 편차', fN(devOf(S.terr), 1) + ' m', '총 수위', showT ? fixm(tot, 1) + ' m · ' + (flood ? '침수' : '안전') : '직접 계산해요']);
  }

  /* ======================================================
     장면 4: 대처 방안 — 대피 시간 계산 · 피해 사례 카드
     ====================================================== */
  const TW = 67, T_ALERT = 10, T_PREP = 5, EV_END = 74, EVK = 8;   // 쓰나미 도착 67분, 화면 1초 = 8분
  const DIST_EV = { far: 1800, tower: 150 };
  const evTotal = (spd, dest) => T_ALERT + T_PREP + DIST_EV[dest] / spd / 60;
  const planRC = () => {
    if (S.plan === 'cases') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 884 } }, { A: { x: 12, y: 12, w: 776, h: 536 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 400 }, B: { x: 8, y: 416, w: 504, h: 300 } }, { A: { x: 12, y: 12, w: 776, h: 288 }, B: { x: 12, y: 308, w: 776, h: 240 } });
  };
  const SHORT = { a: '경보 + 방조제 보강', b: '조기 경보망 + 대피 훈련', c: '수직 대피 건물 + 대피로', d: '위험 지도 + 개발 제한', f: '해안림 조성', e: '해안에 건물 더 짓기' };
  const CASES = [
    { icon: '🌀', name: '2003년 태풍 매미 · 마산만', cause: '마산만은 깔때기형 만이에요. 태풍이 만든 해일이 만조 시각과 겹쳐서 수위가 방파제를 넘었고, 시가지가 침수됐어요.', ok: ['a', 'd'] },
    { icon: '🌊', name: '2004년 인도양 쓰나미 (규모 9.1)', cause: '해저 지진 뒤 쓰나미가 수십 분~수 시간 만에 해안에 닿았지만, 경보 체계가 없어 주민들이 미리 대피하지 못했어요.', ok: ['b', 'd', 'f'] },
    { icon: '🏘️', name: '2011년 동일본 쓰나미 (규모 9.0)', cause: '경보는 있었지만 예상보다 큰 파가 방조제를 넘어 평지 해안으로 밀려왔어요. 걸어서 높은 곳까지 가기엔 시간이 부족한 곳이 많았어요.', ok: ['c', 'd', 'f'] },
  ];
  const caseOk = (i) => { const v = selCase.val['c' + i]; return !!v && CASES[i].ok.includes(v); };
  function resetEv() { S.evT = -1; S.evRun = false; S.evResult = ''; S.evDone = false; S.evCaught = false; }
  function startEv() { S.evT = 0; S.evRun = true; S.evCaught = false; S.evCaughtDm = 0; S.evDone = false; S.evResult = ''; S.evSpeedUsed = S.spd; S.evDestUsed = S.dest; parts.clear(); }
  const VF = 600;                                                  // 쓰나미가 육지로 밀려드는 속도: 10 m/s = 600 m/분
  function evFront(g, e) { return clamp(g.xc + Math.max(0, e - TW) * VF * (g.Lpx / DIST_EV.far), g.xc, g.dx); }
  function evStep(dt) {
    if (S.evT >= 0 && S.evRun) {
      S.evT = Math.min(EV_END, S.evT + dt * EVK);
      const g = evGeom(), dist = DIST_EV[S.evDestUsed], dm = S.evCaught ? S.evCaughtDm : personAt(S.evSpeedUsed, S.evDestUsed, S.evT), px = g.xh + (dm / dist) * g.dpx;
      if (!S.evCaught && S.evT >= TW && dm < dist && evFront(g, S.evT) >= px) { S.evCaught = true; S.evCaughtDm = dm; parts.burst(px, g.gy - 20, { count: 16, colors: ['#bae6fd', '#38bdf8', '#0284c7'], gravity: 120, shape: 'circle' }); }
      if (S.evT >= EV_END) {
        S.evRun = false; S.evDone = true;
        const ok = !S.evCaught;
        S.evResult = ok ? 'ok' : 'fail';
        if (S.evDestUsed === 'far') { if (S.evSpeedUsed === 1) S.ran1 = true; else S.ran05 = true; }
        if (ok) parts.burst(g.dx, g.gy - 30, { count: 22, speed: 170 });
      }
    }
  }
  function evGeom() {
    const { A, B } = planRC();
    const g = { A, B, xc: A.x + 110, xh: A.x + 150, gy: A.y + A.h - 80 };
    g.Lpx = A.w - 150 - 70;                                      // 1.8 km의 길이 (축척대로)
    g.dpx = (DIST_EV[S.dest] / DIST_EV.far) * g.Lpx; g.dx = g.xh + g.dpx;
    return g;
  }
  function personAt(v, dest, e) {
    // 진행 거리(m)
    const mv = Math.max(0, e - T_ALERT - T_PREP) * 60 * v;
    return Math.min(DIST_EV[dest], mv);
  }
  function drawPerson(x, y, col, cane, bob, scale) {
    const s = scale || 1;
    ctx.save(); ctx.translate(x, y + bob);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -16 * s); ctx.lineTo(0, -4 * s); ctx.moveTo(0, -4 * s); ctx.lineTo(-5 * s, 6 * s); ctx.moveTo(0, -4 * s); ctx.lineTo(5 * s, 6 * s); ctx.moveTo(0, -14 * s); ctx.lineTo(-6 * s, -8 * s); ctx.moveTo(0, -14 * s); ctx.lineTo(6 * s, -8 * s); ctx.stroke();
    if (cane) { ctx.strokeStyle = '#7c4a1a'; ctx.beginPath(); ctx.moveTo(8 * s, -6 * s); ctx.lineTo(10 * s, 6 * s); ctx.stroke(); }
    ctx.restore();
    D.sphere(x, y + bob - 22 * s, 7 * s, col, { gloss: true, outline: '#fff', outlineWidth: 1.5 });
  }
  function drawEvac(t, dt) {
    evStep(dt);
    const g = evGeom(), { A, B, xc, xh, gy } = g, e = Math.max(0, S.evT), spd = S.evT >= 0 ? S.evSpeedUsed : S.spd, dest = S.evT >= 0 ? S.evDestUsed : S.dest;
    const Ttot = evTotal(spd, dest);
    card(A, '🚶 쓰나미 경보 후 대피: 해안 마을에서 대피소까지');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.sky(A.x, A.y + 30, A.w, A.h - 30, '#dcecf8', '#f2f9fd');
    // 바다
    const wg = ctx.createLinearGradient(A.x, 0, xc, 0); wg.addColorStop(0, '#0284c7'); wg.addColorStop(1, '#38bdf8');
    ctx.fillStyle = wg; ctx.fillRect(A.x, gy - 18, xc - A.x, A.h);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let x = A.x; x <= xc; x += 6) { const y = gy - 12 + k * 18 + Math.sin(x * 0.07 - t * 2 + k) * 2; x === A.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    // 땅
    ctx.fillStyle = '#8fc283'; ctx.fillRect(xc, gy, A.x + A.w - xc, 10); ctx.fillStyle = '#b79b6c'; ctx.fillRect(xc, gy + 10, A.x + A.w - xc, A.h);
    // 쓰나미 도착 후 침수 (해안에서 안쪽으로 밀려와요)
    const floodX = evFront(g, e), tw = clamp((e - TW) / 3, 0, 1);
    // 마을
    for (let i = 0; i < 4; i++) { const hx = xc + 30 + i * 30; ctx.fillStyle = '#fef3c7'; rr(hx - 11, gy - 20, 22, 20, 2).fill(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(hx - 14, gy - 20); ctx.lineTo(hx, gy - 32); ctx.lineTo(hx + 14, gy - 20); ctx.closePath(); ctx.fill(); }
    // 길(축척대로)
    ctx.strokeStyle = '#7c5a2a'; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xh, gy + 22); ctx.lineTo(g.dx, gy + 22); ctx.stroke(); ctx.setLineDash([]);
    D.text(xh, gy + 46 * FS * 0.9, '집', { size: 12.5, weight: 800, color: '#7c2d12' });
    // 대피소
    const farHill = dest === 'far';
    if (farHill) { ctx.fillStyle = '#6aa764'; ctx.beginPath(); ctx.moveTo(g.dx - 60, gy); ctx.quadraticCurveTo(g.dx - 10, gy - 70, g.dx + 50, gy); ctx.closePath(); ctx.fill(); D.text(g.dx - 10, gy - 52, '🏫', { size: 24 }); D.label(g.dx - 4, gy - 80, '고지대 대피소', { bg: '#15803d', size: 12.5, pad: 7 }); }
    else { ctx.fillStyle = '#e2e8f0'; rr(g.dx - 14, gy - 62, 28, 62, 3).fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(g.dx - 14, gy - 62, 28, 62, 3).stroke(); for (let r = 0; r < 4; r++) { ctx.fillStyle = '#bae6fd'; ctx.fillRect(g.dx - 9, gy - 56 + r * 14, 7, 8); ctx.fillRect(g.dx + 2, gy - 56 + r * 14, 7, 8); } D.label(g.dx, gy - 76, '수직 대피 건물', { bg: '#15803d', size: 12.5, pad: 7 }); }
    // 거리 표시 (축척)
    arrowS(xh, gy + 62 * 0.85, g.dx, gy + 62 * 0.85, { color: '#475569', width: 2, head: 7 }); arrowS(g.dx, gy + 62 * 0.85, xh, gy + 62 * 0.85, { color: '#475569', width: 2, head: 7 });
    D.label((xh + g.dx) / 2, gy + 62 * 0.85, DIST_EV[dest] >= 1000 ? fN(DIST_EV[dest] / 1000, 1) + ' km' : DIST_EV[dest] + ' m', { bg: '#475569', size: 12.5, pad: 7 });
    // 사람
    const dm = S.evCaught ? S.evCaughtDm : personAt(spd, dest, e), px = xh + (dm / DIST_EV[dest]) * g.dpx, moving = e > T_ALERT + T_PREP && dm < DIST_EV[dest], prep = e > T_ALERT && e <= T_ALERT + T_PREP;
    const bob = moving && !RM ? Math.sin(t * 9) * 1.6 : prep && !RM ? Math.sin(t * 20) * 1.2 : 0;
    if (S.evT < 0) { drawPerson(xh, gy, spd === 1 ? '#2563eb' : '#f97316', spd !== 1, 0); D.label(xh, gy - 50, spd === 1 ? '일반 보행 1.0 m/s' : '노약자 0.5 m/s', { bg: spd === 1 ? '#2563eb' : '#ea580c', size: 12.5, pad: 7 }); }
    else { drawPerson(px, gy, spd === 1 ? '#2563eb' : '#f97316', spd !== 1, bob); if (e < T_ALERT) D.label(xh, gy - 50, '경보 기다리는 중', { bg: '#64748b', size: 12.5, pad: 7 }); else if (prep) D.label(px, gy - 50, '대피 준비', { bg: '#ca8a04', size: 12.5, pad: 7 }); }
    // 파도: 해안에서 육지 안쪽으로 밀려들어요 (대피소가 있는 언덕 아래까지)
    if (S.evT >= TW) {
      const span = Math.max(1, floodX - xc);
      ctx.fillStyle = 'rgba(14,165,233,.74)'; ctx.beginPath(); ctx.moveTo(xc - 2, gy + 4);
      for (let x = xc - 2; x <= floodX; x += 5) { const f = (x - xc) / span; ctx.lineTo(x, gy - (34 - 14 * f) * Math.min(1, 0.4 + tw) + Math.sin(x * 0.1 - t * 6) * 3); }
      ctx.lineTo(floodX, gy + 4); ctx.closePath(); ctx.fill();
      D.label(A.x + 12, A.y + 56, '🌊 쓰나미 도착 (67분)', { bg: '#dc2626', size: 13, pad: 9, align: 'left' });
    }
    if (S.evCaught) D.label(clamp(px, A.x + 70, A.x + A.w - 70), gy - 62, '물에 잠겼어요!', { bg: '#dc2626', size: 12.5, pad: 7 });
    if (S.evT < 0 || (S.evT < TW && !S.evDone)) D.label(A.x + 12, A.y + 56, '🌊 쓰나미: 진원 800 km, 67분 뒤 도착', { bg: '#0369a1', size: 12.5, pad: 8, align: 'left' });
    if (S.evDone) D.label(A.x + A.w - 14, A.y + 56, S.evResult === 'ok' ? '✅ 대피 성공! ' + fmv(Ttot) + '분 < ' + TW + '분' : '⚠ 대피 실패: ' + fmv(Ttot) + '분 > ' + TW + '분', { bg: S.evResult === 'ok' ? '#15803d' : '#dc2626', size: 13.5, pad: 10, align: 'right' });
    ctx.restore();
    // ---- B: 시간 막대
    card(B, '⏱️ 시간표 (축척대로, 0~80분)');
    const bx = B.x + 18, bw = B.w - 36, TX = (m) => bx + (bw * clamp(m, 0, 80)) / 80, by = B.y + 78 * FS * 0.78, bh = 36;
    ctx.fillStyle = '#f1f5f9'; rr(bx, by, bw, bh, 8).fill();
    const mvMin = DIST_EV[dest] / spd / 60;
    [[0, T_ALERT, '#94a3b8', '경보 ' + T_ALERT + '분'], [T_ALERT, T_ALERT + T_PREP, '#f59e0b', '준비 ' + T_PREP], [T_ALERT + T_PREP, Ttot, spd === 1 ? '#2563eb' : '#f97316', '이동 ' + fmv(mvMin) + '분']].forEach((s2) => {
      const x0 = TX(s2[0]), x1 = TX(s2[1]); ctx.fillStyle = s2[2]; rr(x0, by, Math.max(1, x1 - x0), bh, 6).fill();
      if (x1 - x0 > 46) D.text((x0 + x1) / 2, by + bh * 0.64, s2[3], { size: 12.5, weight: 800, color: '#fff' });
    });
    for (let m = 0; m <= 80; m += 10) { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TX(m), by + bh + 2); ctx.lineTo(TX(m), by + bh + 9); ctx.stroke(); D.text(TX(m), by + bh + 24 * FS * 0.85, m + '분', { size: 11.5, weight: 700, color: '#64748b' }); }
    D.dashedLine(TX(TW), by - 18, TX(TW), by + bh + 6, { color: '#dc2626', width: 2.5, dash: [5, 4] });
    D.label(TX(TW), by - 26, '쓰나미 도착 ' + TW + '분', { bg: '#dc2626', size: 12.5, pad: 7, align: 'right' });
    if (S.evT >= 0) { const cx2 = TX(e); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(cx2, by - 4); ctx.lineTo(cx2 - 6, by - 14); ctx.lineTo(cx2 + 6, by - 14); ctx.closePath(); ctx.fill(); D.text(cx2, by + bh + 46 * FS * 0.85, fN(e, 0) + '분 경과', { size: 12.5, weight: 800, color: '#0f172a' }); }
    let y = B.y + B.h - 70 * FS * 0.82;
    y = para(B.x + 18, y, B.w - 36, '이동 시간 = ' + DIST_EV[dest] + ' m / ' + fN(spd, 1) + ' m/s = ' + fmv(DIST_EV[dest] / spd) + ' 초 = ' + fmv(mvMin) + '분', 13, '#334155', 800) + 2;
    para(B.x + 18, y, B.w - 36, '걸리는 시간 = 경보 ' + T_ALERT + ' + 준비 ' + T_PREP + ' + 이동 ' + fmv(mvMin) + ' = ' + fmv(Ttot) + '분  (쓰나미는 ' + TW + '분 뒤 도착)', 13, '#0369a1', 900);
  }
  const CASE_TAGS = [['만조와 겹침', '깔때기형 만', '방조제 월파'], ['경보 체계 없음', '규모 9.1'], ['규모 9.0', '방조제를 넘음', '평지 해안']];
  const CASE_COL = ['#7c3aed', '#0369a1', '#b45309'];
  function drawCases(t, dt) {
    const { A } = planRC(), cols = PHONE ? 1 : 3, gap = 10, cw = (A.w - 20 - gap * (cols - 1)) / cols, ch = PHONE ? (A.h - 54 - gap * 2) / 3 : A.h - 56;
    card(A, '📝 발표 카드: 피해 원인 → 대처 방안');
    let allOk = true;
    CASES.forEach((cs, i) => {
      const x = A.x + 10 + (PHONE ? 0 : i * (cw + gap)), y = A.y + 40 + (PHONE ? i * (ch + gap) : 0), ok = caseOk(i); if (!ok) allOk = false;
      D.shadow(() => { ctx.fillStyle = ok ? '#f0fdf4' : '#fff'; rr(x, y, cw, ch, 14).fill(); }, { blur: 6, y: 2 });
      ctx.save(); rr(x, y, cw, ch, 14).clip(); ctx.fillStyle = rgba(CASE_COL[i], 0.14); ctx.fillRect(x, y, cw, PHONE ? 46 : 74); ctx.restore();
      ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2.5; rr(x, y, cw, ch, 14).stroke();
      D.text(x + 28, y + (PHONE ? 33 : 49), cs.icon, { size: 28 });
      para(x + 54, y + (PHONE ? 20 : 26) * FS * 0.9, cw - 90, cs.name, 13.5, '#1e293b', 900);
      let yy = y + (PHONE ? 54 : 84);
      const boxH = PHONE ? (ch - 54 - 62 - 20) / 2 : (ch - 84 - 70 - 40) / 2;
      ctx.fillStyle = '#fef2f2'; rr(x + 8, yy, cw - 16, boxH, 10).fill();
      D.text(x + 16, yy + 16, '피해 원인', { size: 12, weight: 900, color: '#b91c1c', align: 'left' });
      para(x + 16, yy + 18 + 15 * FS * 0.95, cw - 32, cs.cause, 13, '#334155', 700);
      yy += boxH + 6;
      D.text(x + cw / 2, yy + 8, '▼', { size: 12, weight: 900, color: '#94a3b8' });
      yy += 12;
      const v = selCase.val['c' + i];
      ctx.fillStyle = ok ? '#dcfce7' : '#f1f5f9'; rr(x + 8, yy, cw - 16, boxH, 10).fill();
      D.text(x + 16, yy + 16, '대처 방안', { size: 12, weight: 900, color: '#15803d', align: 'left' });
      para(x + 16, yy + 18 + 14 * FS * 0.95, cw - 32, v ? SHORT[v] : '(조작판에서 골라요)', 14.5, v ? (ok ? '#15803d' : '#b45309') : '#94a3b8', 800);
      // 키워드
      let tx = x + 10; const ty = y + ch - 22 * FS * 0.9;
      CASE_TAGS[i].forEach((tg) => { const b = D.label(tx, ty, tg, { bg: rgba(CASE_COL[i], 0.85), size: 11.5, pad: 6, align: 'left' }); tx += b.w + 5; });
      if (ok) D.check(x + cw - 22, y + (PHONE ? 23 : 37), 12, 1);
    });
    if (allOk) { D.label(A.x + A.w / 2, A.y + A.h - 14 * FS * 0.6, '🎉 발표 카드 3장 완성!', { bg: '#15803d', size: 14, pad: 12 }); if (!S.cardsDone) { S.cardsDone = true; parts.burst(A.x + A.w / 2, A.y + A.h - 60, { count: 26, speed: 200 }); } }
  }
  function drawPlan(t, dt) { if (S.plan === 'cases') drawCases(t, dt); else drawEvac(t, dt); }
  function readPlan() {
    if (S.plan === 'cases') { const n = [0, 1, 2].filter(caseOk).length; setReadouts(['완성한 발표 카드', n + ' / 3', '사례', '매미 · 인도양 · 동일본', '대처 방안', '골라서 완성해요']); return; }
    const spd = S.evT >= 0 ? S.evSpeedUsed : S.spd, dest = S.evT >= 0 ? S.evDestUsed : S.dest, T = evTotal(spd, dest);
    setReadouts(['걸어가는 속도', fN(spd, 1) + ' m/s', '대피 완료까지', fmv(T) + '분', '쓰나미 도착', TW + '분 뒤']);
  }

  /* ======================================================
     입력 도구 · 컨트롤
     ====================================================== */
  const fmv = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : fN(x, 1));
  const stpIb = makeStepper($('#stpIb'), { min: 0, max: 2, step: 0.1, value: 0, dec: 1, unit: 'm' });
  const numC = makeNum($('#numC'), { label: '파속 c', unit: 'm/s' });
  const numT = makeNum($('#numT'), { label: '도달 시간 t', unit: '분' });
  const stpTot = makeStepper($('#stpTot'), { min: -3, max: 6, step: 0.5, value: 0, dec: 1, unit: 'm', onChange: () => evalRisk() });
  const tideCh = makeChoice($('#tideCh'), [{ id: 'low', label: '간조 −2.0 m' }, { id: 'mean', label: '평균 0 m' }, { id: 'high', label: '만조 +2.0 m' }], (v) => { S.tide = v; evalRisk(); });
  const terrCh = makeChoice($('#terrCh'), [{ id: 'line', label: '직선 해안' }, { id: 'funnel', label: '깔때기형 만' }, { id: 'steep', label: '가파른 해안' }, { id: 'shelf', label: '완만한 대륙붕' }], (v) => { S.terr = v; });
  const jgCh = makeChoice($('#jgCh'), [{ id: 'flood', label: '⚠ 침수' }, { id: 'safe', label: '✅ 안전' }], (v) => { S.judge = v; evalRisk(); });
  const spdCh = makeChoice($('#spdCh'), [{ id: '1', label: '일반 보행 1.0 m/s' }, { id: '0.5', label: '노약자 0.5 m/s' }], (v) => { S.spd = +v; resetEv(); });
  const destCh = makeChoice($('#destCh'), [{ id: 'far', label: '고지대 대피소 1.8 km' }, { id: 'tower', label: '수직 대피 건물 150 m' }], (v) => { S.dest = v; resetEv(); });
  const viewCh = makeChoice($('#viewCh'), [{ id: 'open', label: '🌐 먼바다' }, { id: 'shore', label: '🏖️ 해안 접근' }], (v) => setView(v));
  const planCh = makeChoice($('#planCh'), [{ id: 'evac', label: '🚶 대피 계산' }, { id: 'cases', label: '📝 발표 카드' }], (v) => setPlan(v));
  const selJ = makeSelects($('#selJ'), [{ id: 'g', label: '일반 보행 (1.0 m/s)' }, { id: 'e', label: '노약자 (0.5 m/s)' }], [{ id: 'yes', label: '가능 (67분 안에 도착)' }, { id: 'no', label: '불가능 (67분 안에 못 가요)' }], { g: 'yes', e: 'no' });
  const OPT_ALL = Object.keys(SHORT).map((k) => ({ id: k, label: SHORT[k] }));
  const selCase = makeSelects($('#selCase'), CASES.map((c, i) => ({ id: 'c' + i, label: c.icon + ' ' + c.name.replace(/ \(규모.*\)/, '') })), OPT_ALL, { c0: CASES[0].ok, c1: CASES[1].ok, c2: CASES[2].ok }, () => { });
  const selWhy = makeSelects($('#selWhy'), [
    { id: 'q1', label: '같은 태풍일 때 해일 편차가 <b>더 큰 곳</b>', options: [{ id: 'funnel', label: '깔때기형 만' }, { id: 'line', label: '직선 해안' }, { id: 'same', label: '둘이 같아요' }] },
    { id: 'q2', label: '완만한 대륙붕에서 바람 쏠림이 <b>커지는 까닭</b>', options: [{ id: 'h', label: '수심 h가 작아서 τL/(ρgh)가 커져요' }, { id: 'deep', label: '수심 h가 커서 τL/(ρgh)가 커져요' }, { id: 'tau', label: '바람 응력 τ가 더 세져서요' }] },
  ], null, { q1: 'funnel', q2: 'h' });

  SciSim.bindRange($('#sP'), $('#oP'), (v) => v + ' hPa', (v) => { S.p = +v; });
  SciSim.bindRange($('#sU'), $('#oU'), (v) => v + ' m/s', (v) => { S.U = +v; });
  SciSim.bindRange($('#sL'), $('#oL'), (v) => v + ' km', (v) => { S.L = +v; });
  SciSim.bindRange($('#sH'), $('#oH'), (v) => v + ' m', (v) => { S.h = +v; });
  SciSim.bindRange($('#sD'), $('#oD'), (v) => fN(v, 1) + ' m', (v) => { S.D = +v; if (S.tsT === 0 && !S.tsRun) S.tsFault = 0; });
  const setP = (v) => { S.p = v; setSlider($('#sP'), $('#oP'), v, (x) => x + ' hPa'); };
  const setU = (v) => { S.U = v; setSlider($('#sU'), $('#oU'), v, (x) => x + ' m/s'); };
  const setL = (v) => { S.L = v; setSlider($('#sL'), $('#oL'), v, (x) => x + ' km'); };
  const setH = (v) => { S.h = v; setSlider($('#sH'), $('#oH'), v, (x) => x + ' m'); };
  const setD = (v) => { S.D = v; setSlider($('#sD'), $('#oD'), v, (x) => fN(x, 1) + ' m'); };
  function setView(v) { S.tsView = v; viewCh.set(v); if (v === 'shore') { if (S.D <= 0) setD(2); S.zoomT = -1; S.zoomS = 0; S.zoomDone = false; } updateCtl(); S.fade = 1; }
  function setPlan(v) { S.plan = v; planCh.set(v); updateCtl(); S.fade = 1; }
  const setTide = (v) => { S.tide = v; tideCh.set(v); };
  const setTerr = (v) => { S.terr = v; terrCh.set(v); };
  const setSpd = (v) => { S.spd = v; spdCh.set(String(v)); resetEv(); };
  const setDest = (v) => { S.dest = v; destCh.set(v); resetEv(); };
  function evalRisk() {
    if (S.terr === 'line' && S.tide === 'high' && stpTot.value === 3.5 && S.judge === 'flood') S.okHigh = true;
    if (S.terr === 'line' && S.tide === 'low' && stpTot.value === -0.5 && S.judge === 'safe') S.okLow = true;
  }
  $('#bFault').addEventListener('click', () => { Sound.click(); startTs(); syncBtns(); });
  $('#bShore').addEventListener('click', () => { Sound.click(); startShore(); syncBtns(); });
  $('#bEv').addEventListener('click', () => { Sound.click(); startEv(); syncBtns(); });
  const setTx = (el, tx) => { if (el.textContent !== tx) el.textContent = tx; };
  function syncBtns() {
    setTx($('#bFault'), S.tsT > 0 || S.tsRun ? '↺ 다시 일으키기' : '🌋 단층 일으키기');
    setTx($('#bShore'), S.zoomT >= 0 ? '↺ 다시 보내기' : '🌊 파 보내기');
    setTx($('#bEv'), S.evT >= 0 ? '↺ 다시 대피하기' : '🚨 경보! 대피 시작');
  }

  const MODE_LABEL = { storm: '🌪️ 폭풍 해일', tsu: '🌋 지진 해일', risk: '🏖️ 피해 요인', plan: '🧭 대처 방안' };
  const FREE_KEYS = {
    storm: () => ['sP', 'sU', 'sL', 'sH'],
    tsu: () => (S.tsView === 'shore' ? ['viewCh', 'sD', 'bShore'] : ['viewCh', 'sD', 'bFault']),
    risk: () => ['tideCh', 'terrCh'],
    plan: () => (S.plan === 'cases' ? ['planCh', 'selCase'] : ['planCh', 'spdCh', 'destCh', 'bEv']),
  };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode]() : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    syncBtns();
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  setP(1010); setU(0); setL(100); setH(20); setD(0);
  tideCh.set('mean'); terrCh.set('line'); spdCh.set('1'); destCh.set('far'); viewCh.set('open'); planCh.set('evac');

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear();
    setP(1010); setU(0); setL(100); setH(20); S.pV = 1010; S.UV = 0; S.ibV = 0; S.dwV = 0; S.showCalc = false; stpIb.reset();
    setD(0); resetTs(); S.zoomT = -1; S.zoomS = 0; S.zoomDone = false; S.showTs = false; S.tsView = 'open'; viewCh.set('open'); numC.reset(); numT.reset();
    setTide('mean'); setTerr('line'); S.tideV = 0; S.devV = devOf('line'); S.totV = totOf('mean', 'line'); S.showTot = false; S.okHigh = false; S.okLow = false; S.judge = null; jgCh.reset(); stpTot.reset(); selWhy.reset();
    setSpd(1); setDest('far'); resetEv(); S.ran1 = false; S.ran05 = false; selJ.reset(); selCase.reset(); S.cardsDone = false; S.plan = 'evac'; planCh.set('evac');
    if (li === 0) { setMode('storm'); setCtl(['sP', 'stpIb']); showHint('기압 슬라이더를 내리면 해수면이 볼록해져요', 5200); }
    else if (li === 1) { setMode('tsu'); setCtl(['sD', 'bFault']); showHint('단층 변위를 2 m로 맞추고 단층을 일으켜 봐요', 5200); }
    else if (li === 2) { setMode('risk'); setCtl(['tideCh', 'stpTot', 'jgCh']); showHint('만조와 간조를 눌러 총 수위를 비교해 봐요', 5200); }
    else { setMode('plan'); setCtl(['spdCh', 'bEv', 'selJ']); showHint('‘대피 시작’을 눌러 67분 안에 도착하는지 봐요', 5200); }
    updateCtl();
  }
  const mark2 = (b) => mark(b);
  const levels = [
    {
      title: '폭풍 해일: 기압과 바람이 수위를 올려요', short: '폭풍 해일', icon: '🌪️', phase: '모형', features: ['storm'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 태풍이나 지진인데 어떤 해안은 침수되고 어떤 해안은 무사한 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>일반선택 지구과학의 ‘태풍’에서</b> 태풍의 중심 기압이 낮아지면 해수면이 올라가는 폭풍 해일을 배웠어요(1 hPa ≈ 1 cm). 이번에는 그 값을 <b>계산</b>하고, 바람이 더하는 효과도 알아봐요.</div>' +
        '<p><b>해일</b>은 바닷물이 갑자기 크게 불어 육지로 밀려드는 현상이에요. 먼저 태풍이 만드는 <b>폭풍 해일</b>을 알아봐요. 원인은 두 가지예요. ① <b>흡상 효과</b>: 기압이 낮아 공기가 누르는 힘이 줄어 해수면이 솟아요 (Δη = Δp/ρg). ② <b>바람 쏠림</b>: 바람이 바닷물을 해안 쪽으로 몰아요 (Δη = τL/ρgh).</p>',
      setup() { resetStep(0); },
      recap: '폭풍 해일은 기압이 낮아 해수면이 솟는 흡상 효과(1 hPa당 약 1 cm)와, 바람이 해안으로 물을 모으는 바람 쏠림(수심이 얕을수록 큼)이 더해져 커져요.',
      summary: '<ul><li><b>해일</b>: 바닷물이 갑자기 불어 육지로 밀려드는 현상. 원인에 따라 <b>폭풍 해일</b>(태풍·저기압)과 <b>지진 해일</b>(해저 지진·화산·산사태)로 나눠요.</li><li><b>흡상 효과</b>(역기압 효과): Δη = Δp/(ρg). 1 hPa = 100 Pa → 100/(1025 × 9.8) ≈ <b>0.01 m = 1 cm</b>. 주변 1010 hPa, 중심 960 hPa이면 Δp = 50 hPa → 약 <b>0.50 m</b>.</li><li><b>바람 쏠림</b>(풍성 해일): Δη = τL/(ρgh). τ = ρ<sub>공기</sub>C<sub>D</sub>U² (풍속 30 m/s → 약 2.7 N/m²). L = 100 km, h = 20 m → 약 <b>1.3 m</b>, h = 10 m → 약 <b>2.7 m</b>. 바람이 셀수록·길수록·<b>얕을수록</b> 커요.</li></ul>',
      missions: [
        {
          title: '흡상 효과 계산',
          goal: '태풍의 <b>중심 기압을 960 hPa</b>로 하고, 흡상 효과 Δη = Δp/(ρg)를 <b>m</b> 단위로 계산해 입력해요.',
          hint: 'Δp = 1010 − 960 = 50 hPa = 5000 Pa예요. Δη = 5000 / (1025 × 9.8) ≈ 0.50 m이므로 0.5를 입력해요.',
          setup() { S.showCalc = false; setP(1010); setU(0); stpIb.reset(); setMode('storm'); setCtl(['sP', 'stpIb']); },
          check: () => S.p === 960 && stpIb.value === Number(fN(dEtaP(960), 1)), hold: 0.8,
          status: () => mark2(S.p === 960) + ' 중심 기압 ' + S.p + ' hPa (목표 960) · ' + mark2(S.p === 960 && stpIb.value === Number(fN(dEtaP(960), 1))) + ' 입력 ' + fN(stpIb.value, 1) + ' m',
          explain: 'Δp = 50 hPa = 5000 Pa이므로 Δη = Δp/(ρg) = 5000/(1025 × 9.8) ≈ <b>0.50 m</b>예요. 기압이 1 hPa 낮아질 때마다 해수면이 약 <b>1 cm</b>씩 올라가요. 해안 눈금의 수위 상승과 같지요?',
        },
        {
          title: '바람 쏠림 더하기',
          goal: '기압은 960 hPa 그대로 두고 <b>바람 쏠림</b>을 더해서, 해안 수위 상승(흡상 + 쏠림)이 <b>1 m 이상</b>이 되게 해요.',
          hint: '풍속을 올리거나(예: 30 m/s) 수심을 줄여 봐요. 풍속 30 m/s, 만 길이 100 km, 수심 20 m이면 쏠림이 약 1.3 m예요.',
          setup() { S.showCalc = true; setP(960); setU(0); setL(100); setH(20); setMode('storm'); setCtl(['sU', 'sL', 'sH']); },
          check: () => S.p === 960 && S.U > 0 && r2(dEtaP(S.p)) + r2(dEtaW(S.U, S.L, S.h)) >= 1.0 - 1e-9, hold: 0.8,
          status: () => { const a = r2(dEtaP(S.p)), b = r2(dEtaW(S.U, S.L, S.h)); return mark2(S.U > 0) + ' 바람 ' + S.U + ' m/s · ' + mark2(a + b >= 1.0 - 1e-9 && S.U > 0) + ' 흡상 ' + fN(a, 2) + ' + 쏠림 ' + fN(b, 2) + ' = ' + fN(r2(a + b), 2) + ' m (목표 1 m 이상)'; },
          explain: '바람 쏠림 Δη = τL/(ρgh)는 풍속의 <b>제곱</b>(τ ∝ U²)과 바람이 부는 길이에 비례하고, 수심 h에 <b>반비례</b>해요. 풍속 30 m/s, L = 100 km, h = 20 m이면 약 1.3 m이고 흡상 0.5 m와 합쳐 약 1.8 m예요. 두 효과는 더해져요.',
        },
        {
          type: 'quiz', title: '바람이 없어도, 얕으면 더 커요',
          goal: '바람이 거의 없어도 해수면은 올라갈 수 있어요(흡상). 또 같은 바람이라도 <b>수심이 얕을수록 쏠림이 큰</b> 까닭은?',
          setup() { S.showCalc = true; setP(960); setU(30); setL(100); setH(20); setMode('storm'); setCtl(['sH']); },
          choices: ['Δη = τL/(ρgh)에서 수심 h가 분모라서, 같은 바람이 더 적은 양의 물을 밀면 더 크게 쌓이기 때문이에요', '얕은 곳에는 바람이 더 세게 불기 때문이에요', '얕은 곳은 기압이 더 낮기 때문이에요', '바람이 없으면 해일이 생기지 않으니 수심은 상관없어요'],
          answer: 0,
          feedback: ['', '풍속은 같다고 두었어요. 달라지는 것은 수심 h예요. 슬라이더로 수심만 바꿔 봐요.', '기압 효과는 흡상(Δp/ρg)이고 수심과 무관해요. 바람 쏠림은 바람 응력과 수심으로 정해져요.', '기압이 낮으면 바람이 없어도 해수면이 솟아요(960 hPa이면 약 0.5 m). 해일은 바람만의 현상이 아니에요.'],
          explain: '<b>흡상 효과</b>는 바람이 없어도 생겨요(1 hPa ≈ 1 cm). <b>바람 쏠림</b>은 τL/(ρgh)라서 <b>수심 h가 작을수록</b> 커요. 같은 바람이 밀어 올리는 물의 양이 적으니 수위가 더 많이 올라가요.',
        },
      ],
    },
    {
      title: '지진 해일: 속도는 √(gh)', short: '지진 해일', icon: '🌋', phase: '모형', features: ['tsu'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태풍은 해수면을 솟게 하거나 바람으로 물을 밀었어요. <b>지진 해일(쓰나미)</b>은 원인이 달라요. 해저 단층이 움직여 <b>바다 전체</b>가 한꺼번에 솟아요. 앞 차시의 천해파 속도 <b>c = √(gh)</b>가 여기서 쓰여요.</div>' +
        '<p>쓰나미는 파장이 수백 km로 바다 깊이(수 km)보다 훨씬 길어서 <b>모든 수심에서 천해파</b>예요. 그래서 속도는 파장이 아니라 <b>수심</b>으로만 정해져요.</p>',
      setup() { resetStep(1); },
      recap: '쓰나미는 파장이 매우 긴 천해파라서 c = √(gh)로 가요. 수심 4000 m에서 약 198 m/s이고, 해안으로 올수록 속도가 줄고 파고는 커져요.',
      summary: '<ul><li><b>지진 해일</b>: 해저 지진·화산·산사태로 바다 전체가 솟아 생긴 파. 풍파(주기 수 초~20초, 파장 수십~수백 m)와 달리 주기 <b>수십 분</b>, 파장 <b>수백 km</b>.</li><li>모든 수심에서 천해파: <b>c = √(gh)</b>. h = 4000 m → 약 <b>198 m/s</b>(약 713 km/h), h = 10 m → 약 9.9 m/s(약 36 km/h).</li><li>진원–해안 800 km, 수심 4000 m → t = 8×10⁵ m / 198 m/s ≈ 4040 s ≈ <b>67분</b>.</li><li>해안에 가까워지면 <b>속도↓ 파장↓ 파고↑</b>(파고 ∝ h<sup>−1/4</sup>). 외해 1 m가 수심 10 m에서 약 4.5배(≈ 4.5 m)가 돼요.</li></ul>',
      missions: [
        {
          title: '속도와 도달 시간',
          goal: '<b>단층 변위 2 m</b>로 단층을 일으켜 파가 해안(800 km)에 닿는 것을 보고, 수심 4000 m의 <b>파속</b>(m/s)과 걸린 <b>시간</b>(분)을 계산해 입력해요.',
          hint: 'c = √(9.8 × 4000) ≈ 198 m/s예요. t = 800,000 m / 198 m/s ≈ 4040 초이고, 60으로 나누면 약 67분이에요.',
          setup() { S.showTs = false; resetTs(); setD(0); numC.reset(); numT.reset(); setMode('tsu'); setCtl(['sD', 'bFault', 'calcTs']); },
          check: () => S.D === 2 && S.arrived >= 0 && numC.near(Math.round(C0), 2) && numT.near(67, 1), hold: 0.8,
          status: () => mark2(S.D === 2 && S.arrived >= 0) + ' 단층 2 m · 해안 도착 확인 · ' + mark2(numC.near(Math.round(C0), 2)) + ' 파속 ' + (numC.has() ? numC.value + ' m/s' : '?') + ' · ' + mark2(numT.near(67, 1)) + ' 시간 ' + (numT.has() ? numT.value + '분' : '?'),
          explain: 'c = √(gh) = √(9.8 × 4000) ≈ <b>198 m/s</b>(약 713 km/h, 제트 여객기 속도)예요. 800 km를 이 속도로 가면 t = d/c = 8×10⁵/198 ≈ 4040 초 ≈ <b>67분</b>이에요. 지진이 난 뒤 1시간 남짓이면 해안에 닿아요.',
        },
        {
          type: 'quiz', title: '외해에서는 작고 해안에서는 커요',
          goal: '쓰나미는 외해에서 파고가 약 1 m라 알아채기 어렵지만 해안에서는 수 m로 커져요. 그 까닭은?',
          setup() { S.showTs = true; if (S.D <= 0) setD(2); S.tsView = 'shore'; viewCh.set('shore'); S.zoomT = -1; S.zoomS = 0; S.zoomDone = false; setMode('tsu'); setCtl(['viewCh', 'bShore']); },
          choices: ['외해에서는 파장이 수백 km로 길어 완만한 오르내림이라 알아채기 어렵고, 얕아지면 속도가 줄어 파가 압축되며 파고가 커져요', '해안에서는 바람이 더 세게 불어 파가 커져요', '해안에 가까워지면 파속이 빨라져서 파고가 높아져요', '쓰나미는 외해에서나 해안에서나 파고가 같아요'],
          answer: 0,
          feedback: ['', '쓰나미의 파고는 바람이 아니라 수심 변화 때문에 커져요. 해안 접근 보기에서 수심에 따른 파고를 읽어 봐요.', '반대예요. c = √(gh)이므로 수심이 줄면 파속도 줄어요. 속도가 줄어든 만큼 파가 압축돼요.', '표에서 수심 4000 m와 10 m의 파고를 비교해 봐요. 에너지가 보존되어 파고 ∝ h^(−1/4)로 커져요.'],
          explain: '쓰나미의 파장은 수백 km라 외해에서는 1 m 정도의 완만한 오르내림이에요. 해안으로 오며 수심이 얕아지면 c = √(gh)가 줄고 파장도 줄어요. 에너지가 보존되므로 <b>파고 ∝ h<sup>−1/4</sup></b>로 커져서, 4000 m → 10 m이면 (400)<sup>1/4</sup> ≈ 4.5배예요.',
        },
      ],
    },
    {
      title: '피해 요인: 기압·조위·지형', short: '피해 요인', icon: '🏖️', phase: '분석', features: ['risk'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 폭풍 해일은 흡상 0.5 m와 바람 쏠림이 더해져 해일 편차가 되고, 쓰나미는 해안에서 파고가 커진다고 했어요. 그런데 <b>얼마나 피해가 나는가</b>는 그때의 바닷물 높이(조위)와 해안 지형에 따라 달라져요.</div>' +
        '<p><b>총 수위 = 천문 조위 + 해일 편차(흡상 + 쏠림)</b>이에요. 방파제 높이는 <b>평균 해수면 기준 3.0 m</b>예요. 총 수위가 방파제보다 높으면 물이 넘어 들어와요(월파·침수). 이 장면의 값은 모두 <b>예시 값</b>이에요.</p>',
      setup() { resetStep(2); },
      recap: '총 수위 = 천문 조위 + 해일 편차예요. 같은 태풍도 만조와 겹치면 침수되고, 깔때기형 만이나 얕은 대륙붕에서는 해일이 더 커져요.',
      summary: '<ul><li><b>총 수위 = 천문 조위 + 폭풍 해일 편차</b> (+ 파랑). 이 예에서 편차는 흡상 0.5 + 쏠림 1.0 = <b>1.5 m</b>, 방파제 높이는 <b>3.0 m</b>.</li><li>만조 +2.0 m → 총 <b>3.5 m</b>로 방파제를 넘어 <b>침수</b>, 평균 조위 0 m → 1.5 m, 간조 −2.0 m → <b>−0.5 m</b> 안전. 같은 태풍도 <b>만조 시기</b>에 상륙하면 위험해요.</li><li><b>지형</b>: 깔때기형 만은 안쪽으로 좁아져 물이 모이고, 완만한 대륙붕은 수심이 얕아 바람 쏠림(τL/ρgh)이 커요. 가파른 해안은 수심이 깊어 작아요.</li><li>그래서 해일 피해는 <b>기압, 만조 시기, 해안·해저 지형</b>에 따라 달라요. (2003년 태풍 매미: 마산만에서 만조와 겹쳐 침수)</li></ul>',
      missions: [
        {
          title: '만조와 간조의 총 수위',
          goal: '직선 해안에서 같은 태풍이 <b>만조</b>와 <b>간조</b>에 상륙할 때, 각각 <b>총 수위</b>를 입력하고 방파제(3.0 m)가 <b>침수/안전</b>인지 골라요.',
          hint: '막대 그래프에서 조위 + 흡상 0.5 + 쏠림 1.0을 더해요. 만조(+2.0)는 3.5 m, 간조(−2.0)는 −0.5 m예요. 조위 단추를 바꿔 두 번 판정해요.',
          setup() { S.showTot = false; setTide('mean'); setTerr('line'); S.okHigh = false; S.okLow = false; S.judge = null; jgCh.reset(); stpTot.reset(); setMode('risk'); setCtl(['tideCh', 'stpTot', 'jgCh']); },
          check: () => S.okHigh && S.okLow, hold: 0.6,
          status: () => mark2(S.okHigh) + ' 만조 판정 · ' + mark2(S.okLow) + ' 간조 판정' + (S.tide === 'mean' ? ' (조위 단추를 눌러요)' : ''),
          explain: '해일 편차는 0.5 + 1.0 = 1.5 m예요. <b>만조</b>: 2.0 + 1.5 = <b>3.5 m</b> &gt; 3.0 m라서 방파제를 넘어 <b>침수</b>, <b>간조</b>: −2.0 + 1.5 = <b>−0.5 m</b>라서 <b>안전</b>이에요. 같은 태풍도 상륙 시각의 조위가 결과를 갈라요.',
        },
        {
          title: '지형이 해일을 키워요', manual: true,
          goal: '네 가지 해안 지형을 눌러 보고, <b>해일 편차가 더 큰 곳</b>과 <b>완만한 대륙붕에서 쏠림이 커지는 까닭</b>을 골라요.',
          hint: '지형 단추를 눌러 해일 편차를 비교해요. 깔때기형 만은 2.3 m, 직선 해안은 1.5 m예요. 쏠림 식 Δη = τL/(ρgh)에서 h의 위치를 보세요.',
          setup() { S.showTot = true; selWhy.reset(); setTerr('line'); setMode('risk'); setCtl(['terrCh', 'selWhy']); },
          status: () => mark2(selWhy.ok()) + ' 고른 항목 ' + selWhy.count() + ' / 2',
          check() {
            if (!selWhy.complete()) return '두 항목 모두 골라 주세요. (지금 ' + selWhy.count() + '개)';
            if (!selWhy.ok()) { selWhy.mark(selWhy.wrong()); return '빨간 줄이 달라요. 지형을 눌러 해일 편차(막대 그래프)와 수심 h를 비교해 봐요.'; }
            return true;
          },
          explain: '깔때기형 만은 안쪽으로 갈수록 좁아져 바닷물이 한곳에 모여서 해일 편차가 직선 해안(1.5 m)보다 커요(예시 2.3 m). 완만한 대륙붕은 <b>수심 h가 작아서</b> Δη = τL/(ρgh)가 커요(예시 쏠림 2.0 m).',
        },
        {
          type: 'quiz', title: '같은 태풍, 다른 피해',
          goal: '같은 태풍이 지나가도 어떤 해안은 침수되고 어떤 해안은 무사한 까닭은?',
          setup() { S.showTot = true; setTide('high'); setTerr('funnel'); setMode('risk'); setCtl(['tideCh', 'terrCh']); },
          choices: ['도착했을 때의 조위(만조인지 간조인지), 중심 기압, 해안·해저 지형에 따라 총 수위가 달라지기 때문이에요', '태풍의 세기는 해안마다 완전히 달라서 그래요', '방파제 높이가 같으면 피해도 항상 같아요', '해일은 달의 인력 때문에 생겨서 해안과는 상관없어요'],
          answer: 0,
          feedback: ['', '같은 태풍이라도 중심 기압이 같을 때 해안마다 달라지는 요인은 조위와 지형이에요. 막대 그래프의 각 항목을 비교해 봐요.', '방파제가 같아도 총 수위가 다르면 결과가 달라요. 만조와 간조의 총 수위를 다시 확인해 봐요.', '조석은 달과 태양이 만들지만 폭풍 해일은 기압과 바람이 만들어요. 총 수위는 둘이 더해져 정해져요.'],
          explain: '총 수위 = 천문 조위 + (흡상 + 쏠림)이에요. <b>기압</b>은 흡상을, <b>만조 시기</b>는 조위를, <b>지형</b>은 쏠림을 바꿔요. 세 가지가 모두 합쳐져 방파제를 넘는지가 정해져요.',
        },
      ],
    },
    {
      title: '대처 방안: 피해 사례와 대피', short: '대처 방안', icon: '🧭', phase: '적용', features: ['plan'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 해일 피해는 기압, 만조 시기, 지형으로 달라지고, 쓰나미는 진원에서 800 km 떨어진 해안에 약 67분 뒤 닿는다고 계산했어요. 그 시간 안에 <b>안전하게 대피</b>하려면 무엇이 필요할까요?</div>' +
        '<p>실제 해일 피해 사례를 살펴보고 <b>대처 방안</b>을 제안해 봐요. 먼저 대피 시간을 계산하고, 다음에 사례별 발표 카드를 만들어요. (실제 피해 사례는 직접 더 조사해서 발표해 보세요.)</p>',
      setup() { resetStep(3); },
      recap: '대피에 걸리는 시간이 쓰나미 도착 시간(67분)보다 길면 위험해요. 조기 경보, 대피로·대피소, 방조제·해안림, 수직 대피 건물, 위험 지도와 개발 제한으로 피해를 줄여요.',
      summary: '<ul><li><b>대피 시간</b> = 경보까지 10분 + 준비 5분 + 이동. 일반 보행(1.0 m/s)으로 1.8 km는 30분 → 45분 &lt; 67분 <b>가능</b>. 노약자(0.5 m/s)는 60분 → 75분 &gt; 67분 <b>불가능</b>.</li><li>이럴 때는 가까운 <b>수직 대피 건물</b>(150 m, 노약자도 약 5분)이 필요해요.</li><li>대처 방안: <b>조기 경보</b>(만조 시각과 연계), <b>대피로·대피소</b>, <b>방조제·해안림</b>(파의 힘을 줄여요), <b>수직 대피 건물</b>, <b>위험 지도</b>와 <b>개발 제한</b>.</li><li>사례: 2003 태풍 매미(마산만, 만조와 겹침), 2004 인도양 쓰나미(규모 9.1, 경보 체계 없음), 2011 동일본 쓰나미(규모 9.0, 방조제를 넘음).</li></ul>',
      missions: [
        {
          title: '67분 안에 대피할 수 있을까?',
          goal: '<b>일반 보행</b>과 <b>노약자</b> 모두 대피 시뮬레이션을 해 보고, 쓰나미 도착 <b>67분 안에</b> 대피소에 닿는지 각각 판정해요.',
          hint: '걷는 속도를 바꿔 ‘대피 시작’을 두 번 눌러요. 걸리는 시간 = 10 + 5 + 이동 시간(1800 m / 속도)이에요. 67분보다 짧아야 가능해요.',
          setup() { resetEv(); S.ran1 = false; S.ran05 = false; selJ.reset(); setDest('far'); setSpd(1); setPlan('evac'); setMode('plan'); setCtl(['spdCh', 'bEv', 'selJ']); },
          check: () => S.ran1 && S.ran05 && selJ.ok(), hold: 0.6,
          status: () => mark2(S.ran1) + ' 일반 보행 시뮬레이션 · ' + mark2(S.ran05) + ' 노약자 시뮬레이션 · ' + mark2(selJ.ok()) + ' 판정 ' + selJ.count() + ' / 2',
          explain: '일반 보행: 1800 m / 1.0 m/s = 1800 초 = 30분 → 10 + 5 + 30 = <b>45분 &lt; 67분</b>이라 <b>가능</b>. 노약자: 1800 / 0.5 = 3600 초 = 60분 → 10 + 5 + 60 = <b>75분 &gt; 67분</b>이라 <b>불가능</b>이에요. 먼 대피소는 모두에게 안전하지 않아요.',
        },
        {
          title: '발표 카드 만들기', manual: true,
          goal: '세 가지 사례마다 <b>피해 원인</b>에 알맞은 <b>대처 방안</b>을 골라 발표 카드 3장을 완성해요.',
          hint: '매미는 만조·방조제, 인도양은 경보 체계, 동일본은 평지에서 높은 곳까지 걸리는 시간이 핵심이에요. ‘위험 지도 + 개발 제한’은 모든 사례에 좋은 장기 대책이에요.',
          setup() { selCase.reset(); S.cardsDone = false; setPlan('cases'); setMode('plan'); setCtl(['selCase']); },
          status: () => mark2(selCase.ok()) + ' 완성한 카드 ' + [0, 1, 2].filter(caseOk).length + ' / 3',
          check() {
            if (!selCase.complete()) return '세 사례 모두 대처 방안을 골라 주세요. (지금 ' + selCase.count() + '개)';
            if (!selCase.ok()) { selCase.mark(selCase.wrong()); return '빨간 줄은 그 사례의 피해 원인과 맞지 않아요. 카드의 피해 원인을 다시 읽어 봐요.'; }
            return true;
          },
          explain: '<b>매미</b>: 만조 시각을 반영한 경보와 방조제·배수 시설 보강. <b>인도양</b>: 쓰나미 조기 경보망과 대피 훈련. <b>동일본</b>: 수직 대피 건물과 대피로 확보. 위험 지도·개발 제한과 해안림은 피해를 줄이는 보완책이에요(해안림은 파의 힘을 줄이지만 큰 쓰나미를 완전히 막지는 못해요).',
        },
        {
          type: 'quiz', title: '경보가 있어도 시간이 모자라면?',
          goal: '경보 체계가 있어도 대피소가 멀어서 시간이 모자라는 사람(예: 노약자)을 위한 가장 알맞은 대안은?',
          setup() { setPlan('evac'); setSpd(0.5); setDest('tower'); setMode('plan'); setCtl(['spdCh', 'destCh', 'bEv']); },
          choices: ['가까운 곳에 수직 대피 건물을 미리 정해 두어요. 150 m는 노약자도 약 5분이면 가요', '경보를 더 늦게 내려서 불안을 줄여요', '쓰나미는 외해에서 느리니 대피하지 않아요', '모두가 더 빨리 걷도록 훈련만 해요'],
          answer: 0,
          feedback: ['', '경보가 늦으면 대피 시간이 줄어요. 시간표에서 경보 시간을 늘리면 어떻게 되는지 생각해 봐요.', '쓰나미는 수심 4000 m에서 약 198 m/s(713 km/h)로 빨라요. 외해에서 느리지 않아요.', '훈련도 필요하지만 노약자의 걷는 속도에는 한계가 있어요. 거리 자체를 줄이는 대안이 더 확실해요.'],
          explain: '수직 대피 건물까지 150 m / 0.5 m/s = 300 초 = 5분 → 10 + 5 + 5 = <b>20분</b>으로 67분보다 훨씬 짧아요. <b>해안림</b>은 파의 에너지와 흐름을 일부 줄이고 표류물을 걸러 피해를 줄이는 보완책이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-sea-surge', mount: '#game', badge: '해일 대응가', homeHref: '../../index.html#hs',
    featureLabels: { storm: '🌪️ 폭풍 해일 모형', tsu: '🌋 지진 해일 모형', risk: '🏖️ 총 수위 분석', plan: '🧭 대피 계산 · 발표 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'storm') readStorm();
    else if (S.mode === 'tsu') readTs();
    else if (S.mode === 'risk') readRisk();
    else readPlan();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    tsStep(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e6f0f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'storm') drawStorm(t, dt);
    else if (S.mode === 'tsu') { if (S.tsView === 'shore') drawTsShore(t, dt); else drawTsOpen(t, dt); }
    else if (S.mode === 'risk') drawRisk(t, dt);
    else drawPlan(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
    syncBtns();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, stpIb, numC, numT, stpTot, tideCh, terrCh, jgCh, spdCh, destCh, selJ, selCase, selWhy,
    dEtaP, dEtaW, tauOf, cOf, evTotal, totOf, devOf, windOf, C0,
    get game() { return game; }, setCtl, setMode, resetStep, updateCtl, setP, setU, setL, setH, setD, setTide, setTerr, setSpd, setDest, setView, setPlan, startTs, startShore, startEv, resetTs, resetEv, evalRisk, syncBtns,
  };
})();
