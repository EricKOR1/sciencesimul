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

  /* ---------- 지구시스템과학 대기 차시 공통 ---------- */
  const DEG = Math.PI / 180;
  const OMEGA = 7.29e-5;                                   // 지구 자전 각속도 (rad/s)
  const fOf = (lat) => 2 * OMEGA * Math.sin(lat * DEG);    // 전향 매개변수 f = 2Ω sinφ
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  function sci(x, d) {
    if (x === 0) return '0';
    const neg = x < 0; x = Math.abs(x);
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (+m.toFixed(d) >= 10) { m /= 10; e += 1; }
    return (neg ? '−' : '') + m.toFixed(d) + '×10' + sup(e);
  }
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }
  const sg = (x, d) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d);        // 부호가 있는 숫자 (유니코드 마이너스)
  const ang = (a) => { a = a % TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
  /* 천천히 변하는 각도 따라가기 */
  const approachAng = (cur, tgt, dt, rate) => cur + ang(tgt - cur) * (RM ? 1 : 1 - Math.exp(-rate * dt));
  /* 하늘색 지도 배경 */
  function mapBg(R, c1, c2) {
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, c1 || '#f3f8fc'); g.addColorStop(1, c2 || '#dfeaf4');
    ctx.fillStyle = g; rr(R.x, R.y, R.w, R.h, 14).fill();
  }
  /* 위·아래로 보이는 작은 기호 (L, H) */
  function LH(x, y, kind, size) {
    D.text(x, y, kind, { size: size || 22, weight: 900, color: kind === 'L' ? '#1d4ed8' : '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
  }
  /* 방향 있는 원호 화살표 (cx, cy 중심, 반지름 r, 각도 a0 → a1: 캔버스 각도) */
  function arcArrow(cx, cy, r, a0, a1, o) {
    o = o || {}; const col = o.color || '#334155', w = o.width || 3, head = o.head || 9;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, a1 < a0); ctx.stroke();
    const dir = a1 >= a0 ? 1 : -1, tx = cx + Math.cos(a1) * r, ty = cy + Math.sin(a1) * r, ta = a1 + dir * Math.PI / 2;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(tx + Math.cos(ta) * head, ty + Math.sin(ta) * head);
    ctx.lineTo(tx + Math.cos(ta + 2.5) * head * 0.8, ty + Math.sin(ta + 2.5) * head * 0.8);
    ctx.lineTo(tx + Math.cos(ta - 2.5) * head * 0.8, ty + Math.sin(ta - 2.5) * head * 0.8);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  /* 오른쪽 패널에 글을 위에서 아래로 쌓아요 (좁은 화면에서는 두 칸으로 넘겨요) */
  function makeFlow(B, cols, top) {
    const gap = 14, cw = (B.w - 28 - gap * (cols - 1)) / cols;
    const f = { col: 0, cw, x0: B.x + 14, B, top: B.y + (top || 52) * FS };
    f.y = f.top;
    f.nextCol = () => { if (f.col < cols - 1) { f.col++; f.x0 = B.x + 14 + f.col * (cw + gap); f.y = f.top; } };
    f.need = (h) => { if (f.y + h * FS > B.y + B.h - 8) f.nextCol(); };
    f.put = (txt, o) => { o = o || {}; D.text(f.x0, f.y, txt, Object.assign({ size: 13.5, weight: 800, color: '#334155', align: 'left' }, o)); f.y += (o.dy || 24) * FS; };
    f.para = (txt, size, color) => { f.y = para(f.x0, f.y, f.cw, txt, size, color, 700) + 4; };
    f.bar = (frac, col, h) => { h = h || 13; ctx.fillStyle = '#e2e8f0'; rr(f.x0, f.y, f.cw, h, h / 2).fill(); if (frac > 0.0005) { ctx.fillStyle = col; rr(f.x0, f.y, Math.max(h * 0.6, f.cw * clamp(frac, 0, 1)), h, h / 2).fill(); } f.y += (h + 10) * FS; };
    return f;
  }
  /* 숫자 조절(− −− + ++): big 단위와 step 단위 단추 */
  function makeStepper2(root, o) {
    const st = { value: o.value != null ? o.value : o.min, o };
    root.innerHTML = ''; root.classList.add('stp');
    const dec = o.dec || 0;
    const b = (txt, lab) => { const e = mk('button', 'btn btn-sm stp-b', txt); e.type = 'button'; e.setAttribute('aria-label', lab); e.style.minWidth = '44px'; e.style.width = '44px'; e.style.fontSize = '15px'; return e; };
    const mm = b('−' + o.big, o.big + ' 줄이기'), mi = b('−' + o.step, o.step + ' 줄이기'), pl = b('+' + o.step, o.step + ' 늘리기'), pp = b('+' + o.big, o.big + ' 늘리기');
    const out = mk('output', 'stp-v'); out.style.minWidth = '58px';
    const un = mk('span', 'stp-u', o.unit || '');
    root.append(mm, mi, out, un, pl, pp);
    const show = () => { out.textContent = (st.value < 0 ? '−' : '') + Math.abs(st.value).toFixed(dec); };
    const set = (v, silent) => { st.value = clamp(Math.round(v / o.step) * o.step, o.min, o.max); st.value = +st.value.toFixed(dec + 1); show(); if (!silent && o.onChange) o.onChange(st.value); };
    [[mm, -o.big], [mi, -o.step], [pl, o.step], [pp, o.big]].forEach(([e, d]) => e.addEventListener('click', () => { Sound.click(); set(st.value + d); }));
    st.set = set; st.reset = () => set(o.value != null ? o.value : o.min, true);
    show();
    return st;
  }

  function legend(x, y, items, w) {
    ctx.save(); ctx.font = D.font(11.5, 800);
    let tot = 0; const ws = items.map((it) => { const t = ctx.measureText(it[1]).width + 18; tot += t; return t; });
    ctx.restore();
    if (w && tot > w && items.length > 1) { const h = Math.ceil(items.length / 2); legend(x, y, items.slice(0, h), w); legend(x, y + 17 * FS, items.slice(h), w); return; }
    let cx = x - tot / 2;
    items.forEach((it, i) => { ctx.fillStyle = it[0]; ctx.beginPath(); ctx.arc(cx + 5, y - 4, 4.5, 0, TAU); ctx.fill(); D.text(cx + 14, y, it[1], { size: 11.5, weight: 800, color: '#334155', align: 'left' }); cx += ws[i]; });
  }

  /* ======================================================
     전향력과 지균풍 (회전원판 → 압력 경도력 → 힘의 균형 → 지균풍 계산)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 900, 1.22);
  let game = null;
  const RHO_S = 1.2, RHO_U = 0.74;                 // 지상, 약 5.5 km(500 hPa 부근)의 공기 밀도 (kg/m³)
  const TS = 14400;                                // 힘의 균형 장면: 화면의 1초 = 실제 4시간
  const SLOW = 0.5;                                // 회전원판 장면: 느리게 보기 (×0.5)
  const DISC_R = 0.5, DISC_V = 0.5;                // 원판 반지름 0.5 m, 공 속도 0.5 m/s
  const COLS = PHONE ? 2 : 1;

  function rcOf(mode) {
    if (mode === 'disc') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 540 }, B: { x: 8, y: 556, w: 504, h: 336 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    if (mode === 'pgf' || mode === 'bal') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 540 }, B: { x: 8, y: 556, w: 504, h: 336 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 360 }, B: { x: 8, y: 376, w: 504, h: 516 } }, { A: { x: 12, y: 12, w: 372, h: 536 }, B: { x: 392, y: 12, w: 396, h: 536 } });
  }

  const S = {
    mode: 'disc', fade: 0, clock: 0,
    // 1. 회전원판
    view: 'top', vt: 0, rpm: 0, rpmV: 0, th: 0, ball: null, paint: [], rec: [], lastRes: null,
    // 2. 압력 경도력
    spc: 400, spcV: 400, A: { u: 0.2, k: 1, kv: 1 }, B: { u: 0.34, k: -1, kv: -1 }, drag: null, showP: false, pg: null, probeSeen: false, pBar: null,
    // 3. 힘의 균형
    rot: false, lat: 45, latV: 45, parcels: [], rtime: 0, geo: false, geoT: 0,
    // 4. 지균풍 계산
    sc: 'sfc', latC: 45, spcC: 400, altC: 'sfc', showV: false, vBar: {}, vCur: null, spcCV: null, gw: [],
  };
  const pgfOf = (spc, rho) => (400 / (spc * 1000)) / (rho || RHO_S);          // (1/ρ)(Δp/Δn), 4 hPa = 400 Pa
  const vgOf = (spc, rho, lat) => (lat <= 0.01 ? Infinity : pgfOf(spc, rho) / fOf(lat));

  /* ======================================================
     장면 1: 회전원판 — 위에서 보기(관성계) / 원판 위에서 보기(회전계)
     ====================================================== */
  function discGeom() {
    const A = rcOf('disc').A, top = 40;
    const U = Math.min(A.w, A.h - top - 30) / 2 - 4, cx = A.x + A.w / 2, cy = A.y + top + (A.h - top - 30) / 2;
    const RD = U * 0.74;
    return { A, U, cx, cy, RD, sc: RD / DISC_R };
  }
  const omegaOf = (rpm) => (rpm * TAU) / 60;
  function throwBall() {
    if (S.ball && !S.ball.done) return false;
    S.rpmV = S.rpm;
    S.paint = [];
    const th = S.th;
    S.ball = { tau: 0, ax: -Math.sin(th), ay: Math.cos(th), done: false, swept: 0, fade: 0, rpm: Math.abs(S.rpm), dir: Math.sign(S.rpm) };
    S.lastRes = null;
    Sound.tick();
    return true;
  }
  function cancelBall() { S.ball = null; S.paint = []; }
  /* 공의 위치: 관성계(월드, y가 위쪽, m) 와 원판 좌표계 */
  function worldPos(b) { const d = DISC_V * b.tau; return { x: b.ax * d, y: b.ay * d }; }
  function discPos(b) {
    const w = worldPos(b), c = Math.cos(S.th), s = Math.sin(S.th);
    return { x: w.x * c + w.y * s, y: -w.x * s + w.y * c };
  }
  function discStep(dt) {
    S.rpmV = approach(S.rpmV, S.rpm, dt, 4);
    if (Math.abs(S.rpmV - S.rpm) < 0.01) S.rpmV = S.rpm;
    const tv = S.view === 'rot' ? 1 : 0;
    S.vt = approach(S.vt, tv, dt, 5.5);
    if (Math.abs(S.vt - tv) < 0.002) S.vt = tv;
    const om = omegaOf(S.rpmV), s = dt * SLOW;
    const b = S.ball;
    // 공이 날아가는 동안 원판이 도는 각도를 모아요 (공이 가장자리에 닿는 순간까지)
    if (b && !b.done) {
      const sb = Math.min(s, 1 - b.tau);
      S.th = ang(S.th + om * sb); b.swept += om * sb; b.tau += sb;
      if (s - sb > 0) S.th = ang(S.th + om * (s - sb));
      if (b.tau >= 1 - 1e-9) {
        b.tau = 1; b.done = true;
        S.paint.push(discPos(b));
        const dev = b.swept / DEG;                                    // 오른쪽이 +
        S.rec.push({ rpm: b.rpm, dir: b.dir, dev });
        S.lastRes = dev;
        Sound.success();
      } else S.paint.push(discPos(b));
    } else {
      S.th = ang(S.th + om * s);
      if (b && b.done) { b.fade += dt; b.tau += s * 0.9; if (b.fade > 1.2) S.ball = null; }
    }
  }
  function drawDisc(t, dt) {
    const g = discGeom(), { A, U, cx, cy, RD, sc } = g;
    discStep(dt);
    card(A, null);
    const cam = S.vt * S.th, rot = S.th;
    D.text(A.x + 14, A.y + 24 * FS, S.vt < 0.5 ? '👁️ 위에서 본 모습 (원판 밖 관찰자)' : '🎡 원판 위에서 본 모습 (함께 도는 관찰자)', { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    D.text(A.x + A.w - 14, A.y + 24 * FS, '×0.5 느리게', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    // ----- 방(고정된 배경): 색 띠
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(cam);
    const cols = ['#fb7185', '#facc15', '#4ade80', '#60a5fa'];
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * TAU - Math.PI / 2, a1 = ((i + 1) / 48) * TAU - Math.PI / 2;
      ctx.fillStyle = cols[Math.floor(i / 12)]; ctx.globalAlpha = i % 2 ? 0.5 : 0.85;
      ctx.beginPath(); ctx.arc(0, 0, U, a0, a1); ctx.arc(0, 0, RD * 1.18, a1, a0, true); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(0, -U - 2); ctx.lineTo(-8, -U + 13); ctx.lineTo(8, -U + 13); ctx.closePath(); ctx.fill();
    // 관성계에서 본 공의 곧은 경로
    if (S.vt < 0.95 && S.ball) {
      const w = worldPos(S.ball);
      ctx.globalAlpha = 1 - S.vt; D.dashedLine(0, 0, w.x * sc, -w.y * sc, { color: '#111827', width: 2.5, dash: [6, 5] }); ctx.globalAlpha = 1;
    }
    // ----- 원판
    ctx.save(); ctx.rotate(-rot);
    D.shadow(() => { const gr = ctx.createRadialGradient(-RD * 0.3, -RD * 0.35, RD * 0.1, 0, 0, RD); gr.addColorStop(0, '#f8fafc'); gr.addColorStop(1, '#cbd5e1'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, RD, 0, TAU); ctx.fill(); }, { blur: 14, y: 5 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, RD, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((k) => { ctx.beginPath(); ctx.arc(0, 0, RD * k, 0, TAU); ctx.stroke(); });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * RD, Math.sin(a) * RD); ctx.stroke(); }
    // 과녁 깃발 (원판에 붙어 있어요: 처음 겨냥한 방향)
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -RD); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(0, -RD - 1); ctx.lineTo(0, -RD - 20); ctx.lineTo(15, -RD - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -RD - 1); ctx.lineTo(0, -RD - 22); ctx.stroke();
    // 공이 남긴 페인트 자국 (원판 위의 경로)
    if (S.paint.length > 1) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(14,116,144,.92)'; ctx.lineWidth = 4.5; ctx.beginPath();
      S.paint.forEach((p, i) => { const x = p.x * sc, y = -p.y * sc; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
    D.shadow(() => { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    // 공 (화면 좌표)
    if (S.ball) {
      const b = S.ball, w = worldPos(b), a = cam, X = w.x * sc, Y = -w.y * sc;
      const px = cx + X * Math.cos(a) - Y * Math.sin(a), py = cy + X * Math.sin(a) + Y * Math.cos(a);
      ctx.save(); ctx.globalAlpha = b.done ? clamp(1 - b.fade / 1.2, 0, 1) : 1; ball(px, py, 9, '#ef4444', true); ctx.restore();
    }
    // 과녁 이름표 (화면에 똑바로)
    { const a = cam - rot, fx = cx + Math.sin(a) * (RD + 36), fy = cy - Math.cos(a) * (RD + 36); D.label(fx, fy, '과녁', { bg: '#b91c1c', size: 12.5, pad: 7 }); }
    // 회전 방향
    D.text(A.x + 14, A.y + A.h - 14, Math.abs(S.rpm) > 0 ? (S.rpm > 0 ? '↺ 반시계 방향 (북반구형) ' : '↻ 시계 방향 (남반구형) ') + Math.abs(S.rpm) + ' rpm' : '⏸️ 원판이 멈춰 있어요', { size: 13.5, weight: 800, color: S.rpm > 0 ? '#1d4ed8' : S.rpm < 0 ? '#b45309' : '#64748b', align: 'left' });
    if (S.lastRes != null) {
      const d = Math.round(Math.abs(S.lastRes));
      D.label(A.x + A.w - 14, A.y + A.h - 16, d === 0 ? '곧게 가요' : (S.vt > 0.5 ? (S.lastRes > 0 ? '오른쪽' : '왼쪽') + '으로 ' + d + '° 휘어 보여요' : '공은 곧게 가요, 원판이 ' + d + '° 돌았어요'), { bg: '#0f766e', size: 13, align: 'right' });
    }
    // ----- B: 수치
    const B = rcOf('disc').B;
    card(B, '🔢 회전과 겉보기 힘');
    const om = omegaOf(Math.abs(S.rpm)), f = 2 * om, a = f * DISC_V;
    const fl = makeFlow(B, COLS);
    fl.put('각속도 Ω = ' + om.toFixed(2) + ' rad/s', { color: '#1d4ed8', dy: 22 });
    fl.put(om > 0 ? '(한 바퀴에 ' + (TAU / om).toFixed(1) + ' s)' : '(회전하지 않아요)', { size: 12.5, color: '#64748b', dy: 26 });
    fl.put('전향 매개변수 f = 2Ω', { dy: 22 });
    fl.put('= ' + f.toFixed(2) + ' s⁻¹', { color: '#9a3412', size: 15, dy: 26 });
    fl.put('공의 속도 v = ' + DISC_V.toFixed(1) + ' m/s', { dy: 24 });
    fl.put('전향 가속도 a = f·v', { dy: 22 });
    fl.put('= ' + a.toFixed(2) + ' m/s²', { color: '#9a3412', size: 15, dy: 22 });
    fl.bar(a / 2.1, '#f97316');
    fl.y += 10 * FS;
    fl.need(150);
    fl.put('🌍 지구 (45°N)', { color: '#0f766e', dy: 24 });
    fl.put('f = ' + sci(fOf(45), 2) + ' s⁻¹', { size: 13, dy: 21 });
    fl.put('v = 10 m/s이면', { size: 13, dy: 21 });
    fl.put('a = f·v = ' + sci(fOf(45) * 10, 2) + ' m/s²', { size: 13, dy: 24 });
    fl.para('지구의 f는 15 rpm 원판(f = 3.14 s⁻¹)의 약 3×10⁴분의 1이에요. 그래서 넓고 오랜 운동에서만 휨이 눈에 띄어요.', 12.5, '#64748b');
  }
  function readDisc() {
    const om = omegaOf(Math.abs(S.rpm)), a = 2 * om * DISC_V;
    const last = S.rec.length ? S.rec[S.rec.length - 1] : null;
    setReadouts(['각속도 Ω', om.toFixed(2) + ' rad/s', '전향 가속도 f·v', a.toFixed(2) + ' m/s²', '마지막 굴리기', last ? (Math.round(Math.abs(last.dev)) === 0 ? '곧게 갔어요' : (last.dev > 0 ? '오른쪽 ' : '왼쪽 ') + Math.round(Math.abs(last.dev)) + '° 휨') : '아직 안 굴렸어요']);
  }

  /* ======================================================
     장면 2: 압력 경도력 — 등압선 지도에서 Δp/Δn 읽기
     ====================================================== */
  const HK = 1800;                                                     // 지도 세로 길이 (km)
  function mapGeom(mode) {
    const A = rcOf(mode).A, M = { x: A.x + 14, y: A.y + 46, w: A.w - 28, h: A.h - 98 };
    return { A, M, pxkm: M.h / HK, yc: M.y + M.h / 2 };
  }
  const kMax = (spc) => Math.floor(860 / spc);
  const pOfK = (k) => 1008 + 4 * k;
  function probePx(g, pr) { return { x: g.M.x + pr.u * g.M.w, y: g.yc + pr.kv * S.spcV * g.pxkm }; }
  function snapProbes(dt) {
    S.spcV = approach(S.spcV, S.spc, dt, 6);
    if (Math.abs(S.spcV - S.spc) < 0.3) S.spcV = S.spc;
    [S.A, S.B].forEach((pr) => {
      const kk = kMax(S.spc);
      pr.k = clamp(pr.k, -kk, kk);
      if (S.drag && S.drag.pr === pr) return;
      pr.kv = approach(pr.kv, pr.k, dt, 12);
      if (Math.abs(pr.kv - pr.k) < 0.004) pr.kv = pr.k;
    });
  }
  function isobarMap(g, spcPx) {
    const { M } = g;
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); gr.addColorStop(0, '#dbeafe'); gr.addColorStop(0.5, '#f8fafc'); gr.addColorStop(1, '#fee2e2');
    ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    const n = Math.ceil(M.h / spcPx / 2) + 1;
    for (let k = -n; k <= n; k++) {
      const y = g.yc + k * spcPx; if (y < M.y - 2 || y > M.y + M.h + 2) continue;
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(M.x, y); ctx.lineTo(M.x + M.w, y); ctx.stroke();
      D.text(M.x + M.w - 8, y - 5, (1008 - 4 * k) + ' hPa', { size: 12.5, weight: 800, color: '#1e293b', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    LH(M.x + 18, M.y + 26, 'L'); LH(M.x + 18, M.y + M.h - 10, 'H');
    D.text(M.x + 36, M.y + 25, '저기압 (북)', { size: 12.5, weight: 800, color: '#1d4ed8', align: 'left' });
    D.text(M.x + 36, M.y + M.h - 10, '고기압 (남)', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
  }
  function pgfStep(dt) {
    snapProbes(dt);
    // 공기 덩어리(회전 없음): 정지 상태에서 압력 경도력으로 가속
    const a = pgfOf(S.spc);
    if (!S.pg) S.pg = { t: 0, y: 0, v: 0, pause: 0 };
    const P = S.pg;
    if (P.pause > 0) { P.pause -= dt; if (P.pause <= 0) { P.t = 0; P.y = 0; P.v = 0; } return; }
    const hr = dt * TS;                                // 실제 경과 시간 (s)
    P.t += dt; P.v += a * hr; P.y += (P.v * hr) / 1000;
    if (P.y > 1100 || P.t > 6) P.pause = 0.8;
  }
  function drawPgf(t, dt) {
    const g = mapGeom('pgf'), { A, M, pxkm } = g;
    pgfStep(dt);
    card(A, '🗺️ 지상 일기도 (예시): 등압선 간격 4 hPa');
    isobarMap(g, S.spcV * pxkm);
    // 압력 경도력 화살표 (높은 쪽 → 낮은 쪽)
    const aP = pgfOf(S.spcV), Lpx = 56 * (aP / pgfOf(400)), ax = M.x + 0.58 * M.w, ay = g.yc + 40;
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    arrowS(ax, ay + Lpx / 2, ax, ay - Lpx / 2, { color: '#ea580c', width: 6, head: 14 });
    ctx.restore();
    D.text(ax - 10, ay + Lpx / 2 + 18, '압력 경도력', { size: 12.5, weight: 900, color: '#c2410c', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });
    // 정지한 공기 덩어리의 가속 (회전 없음)
    { const P = S.pg, x = M.x + 0.84 * M.w, y0 = g.yc + 400 * pxkm, yy = clamp(y0 - P.y * pxkm, M.y + 12, M.y + M.h - 12);
      ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
      if (P.y > 4) D.dashedLine(x, y0, x, yy, { color: 'rgba(15,118,110,.7)', width: 2.5, dash: [4, 4] });
      ball(x, yy, 9, '#14b8a6', true);
      if (P.v > 0.4) arrowS(x - 16, yy, x - 16, yy - Math.min(70, P.v * 4), { color: '#15803d', width: 4.5, head: 11 });
      ctx.restore();
      if (P.v > 0.4) D.text(x - 24, yy + 4, P.v.toFixed(1) + ' m/s', { size: 12, weight: 800, color: '#15803d', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
      D.text(x, M.y + M.h + 17 * FS, '정지한 공기 · ' + Math.round(P.t * TS / 3600) + '시간 경과', { size: 12, weight: 800, color: '#0f766e' }); }
    // 탐침 A, B
    [[S.A, 'A', '#dc2626'], [S.B, 'B', '#2563eb']].forEach(([pr, nm, col]) => {
      const p = probePx(g, pr);
      if (!S.probeSeen) D.ring(p.x, p.y, 18, t, { color: col, speed: 1.1, width: 2 });
      D.sphere(p.x, p.y, 11, col, { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: nm, textScale: 1.0 });
    });
    // A-B 거리 표시
    const pa = probePx(g, S.A), pb = probePx(g, S.B);
    if (Math.abs(pa.y - pb.y) > 14) {
      const xm = M.x + 0.46 * M.w, up = pb.y > pa.y ? 1 : -1;
      D.dashedLine(pa.x, pa.y, xm, pa.y, { color: 'rgba(15,23,42,.5)', width: 1.5, dash: [3, 4] }); D.dashedLine(pb.x, pb.y, xm, pb.y, { color: 'rgba(15,23,42,.5)', width: 1.5, dash: [3, 4] });
      arrowS(xm, pa.y + up * 3, xm, pb.y - up * 3, { color: '#0f172a', width: 2.5, head: 9 });
      arrowS(xm, pb.y - up * 3, xm, pa.y + up * 3, { color: '#0f172a', width: 2.5, head: 9 });
      D.label(xm + 6, (pa.y + pb.y) / 2, 'Δn', { bg: '#0f172a', size: 12.5, pad: 6, align: 'left' });
    }
    D.text(A.x + 14, A.y + A.h - 14, 'A, B를 끌어요. 놓으면 가까운 등압선에 붙어요.', { size: 12.5, weight: 700, color: '#475569', align: 'left' });
    // ----- B 패널
    const B = rcOf('pgf').B;
    card(B, '📏 압력 경도력 계산');
    const dp = 4 * Math.abs(S.A.k - S.B.k), dn = Math.abs(S.A.k - S.B.k) * S.spc;
    const fl = makeFlow(B, COLS);
    fl.put('A ' + pOfK(S.A.k) + ' hPa · B ' + pOfK(S.B.k) + ' hPa', { dy: 26 });
    fl.put('Δp = ' + dp + ' hPa = ' + (dp * 100) + ' Pa', { color: '#1d4ed8', dy: 24 });
    fl.put('Δn = ' + dn + ' km = ' + (dn === 0 ? '0' : sci(dn * 1000, 1)) + ' m', { color: '#1d4ed8', dy: 24 });
    fl.put('ρ = ' + RHO_S + ' kg/m³ (지상)', { dy: 30 });
    fl.need(150);
    fl.put('압력 경도력 (단위 질량당)', { size: 13, color: '#9a3412', dy: 22 });
    fl.put('= (1/ρ)(Δp/Δn)', { color: '#9a3412', dy: 24 });
    const show = S.showP || (game && game.free), val = dn > 0 ? (dp * 100) / (dn * 1000) / RHO_S : 0;
    fl.put(show ? (dn > 0 ? '= ' + (val * 1e4).toFixed(1) + '×10⁻⁴ m/s²' : '= 0 (A와 B가 같은 등압선)') : '= ? (직접 계산해요)', { color: '#9a3412', size: 15, dy: 24 });
    S.pBar = approach(S.pBar == null ? val : S.pBar, val, dt, 8);
    fl.bar(show ? S.pBar / 2e-3 : 0, '#f97316');
    D.text(fl.x0, fl.y - 6, '0', { size: 11.5, weight: 700, color: '#64748b', align: 'left' }); D.text(fl.x0 + fl.cw, fl.y - 6, '2×10⁻³ m/s²', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    fl.y += 14 * FS;
    fl.para('등압선 간격이 좁을수록 Δp/Δn이 커서 압력 경도력이 커요.', 12.5, '#475569');
  }
  function readPgf() {
    const dp = 4 * Math.abs(S.A.k - S.B.k), dn = Math.abs(S.A.k - S.B.k) * S.spc;
    setReadouts(['기압 차 Δp', dp + ' hPa', '등압선 사이 거리 Δn', dn + ' km', '등압선 간격', '4 hPa당 ' + S.spc + ' km']);
  }
  function mvProbe(p) {
    const g = mapGeom('pgf'), pr = S.drag.pr, kk = kMax(S.spc);
    pr.u = clamp((p.x - g.M.x) / g.M.w, 0.1, 0.62);
    pr.kv = clamp((p.y - g.yc) / (S.spcV * g.pxkm), -kk, kk);
  }

  /* ======================================================
     장면 3: 힘의 균형 — 정지한 공기가 등압선과 나란히 불게 되기까지
     ====================================================== */
  const RDAMP = 1.2;                                                  // 조절 과정의 감쇠 (화면 1초당)
  const G0 = pgfOf(400);                                              // 압력 경도력 (단위 질량당): 4 hPa/400 km
  const balGeom = () => {
    const A = rcOf('bal').A, M = { x: A.x + 14, y: A.y + 46, w: A.w - 28, h: A.h - 80 };
    return { A, M, pxkm: M.h / HK, yc: M.y + M.h / 2 };
  };
  const startY = (g, i) => g.M.y + g.M.h * (0.52 + 0.09 * i);
  function newParcels() {
    const g = balGeom();
    S.parcels = [0, 1, 2, 3, 4].map((i) => ({ x: g.M.x + 24, y: startY(g, i), u: 0, v: 0, age: 0, tr: [[]] }));
    S.rtime = 0; S.geoT = 0; S.geo = false;
  }
  function balStep(dt) {
    S.latV = approach(S.latV, S.lat, dt, 10);
    const g = balGeom(), { M, pxkm } = g;
    if (!S.parcels.length) newParcels();
    S.rtime += dt;
    if (S.rtime > (S.rot ? 12 : 6)) newParcels();
    const f = S.rot ? fOf(S.latV) : 0, ug = G0 / fOf(S.latV), rr0 = RDAMP / TS;
    const n = Math.ceil(dt / 0.01) || 1, h = (dt / n) * TS, pxm = pxkm / 1000;           // h: 실제 초
    S.parcels.forEach((p, idx) => {
      for (let k = 0; k < n; k++) {
        if (S.rot) { p.u += (f * p.v - rr0 * (p.u - ug)) * h; p.v += (G0 - f * p.u - rr0 * p.v) * h; } else { p.v += G0 * h; }
        p.age += dt / n;
        p.x += p.u * pxm * h; p.y -= p.v * pxm * h;
        if (p.x > M.x + M.w - 6 || p.y < M.y + 8) { p.x = M.x + 24; p.y = startY(g, idx); p.u = 0; p.v = 0; p.age = 0; p.tr.push([]); }
      }
      const cur = p.tr[p.tr.length - 1]; cur.push([p.x, p.y]); if (cur.length > 160) cur.shift();
      if (p.tr.length > 3) p.tr.shift();
    });
    // 균형에 아주 가까워지면 남은 작은 떨림은 빨리 가라앉혀요 (그림의 두 힘이 같은 값으로 보이게)
    S.parcels.forEach((p) => { if (S.rot && p.age > 2 && Math.abs(p.v) < 0.04 * ug && Math.abs(p.u - ug) < 0.04 * ug) { const k = Math.min(1, 5 * dt); p.u += (ug - p.u) * k; p.v += (0 - p.v) * k; } });
    const L = S.parcels[2], ok = S.rot && L.age > 2 && Math.abs(L.v) < 0.03 * ug && Math.abs(L.u - ug) < 0.03 * ug;
    S.geo = ok; S.geoT = ok ? S.geoT + dt : 0;
  }
  function drawBal(t, dt) {
    const g = balGeom(), { A, M, pxkm } = g;
    balStep(dt);
    card(A, '⚖️ 정지한 공기에서 시작 (북반구) · ' + (S.rot ? '자전 있음' : '자전 없음'));
    isobarMap(g, 400 * pxkm);
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    S.parcels.forEach((p) => {
      p.tr.forEach((seg) => {
        if (seg.length < 2) return; const n = seg.length, ch = 10;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let s0 = 0; s0 < n - 1; s0 += ch) { const s1 = Math.min(n - 1, s0 + ch); ctx.strokeStyle = 'rgba(14,116,144,' + ((s1 / n) * 0.85).toFixed(3) + ')'; ctx.lineWidth = 3 + 3 * (s1 / n); ctx.beginPath(); ctx.moveTo(seg[s0][0], seg[s0][1]); for (let i = s0 + 1; i <= s1; i++) ctx.lineTo(seg[i][0], seg[i][1]); ctx.stroke(); }
      });
    });
    S.parcels.forEach((p) => ball(p.x, p.y, 8, '#0ea5e9', true));
    ctx.restore();
    // 힘 상자 (가운데 공기 덩어리의 힘)
    const L = S.parcels[2], f = S.rot ? fOf(S.latV) : 0, ug = G0 / fOf(S.latV);
    const Vm = Math.hypot(L.u, L.v), sc = 62 / G0;
    const DB = { x: M.x + 8, y: M.y + 30, w: PHONE ? 214 : 196, h: 176 };
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(DB.x, DB.y, DB.w, DB.h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(DB.x + DB.w / 2, DB.y + 18 * FS, '가운데 공기 덩어리의 힘', { size: 12, weight: 800, color: '#334155' });
    const ox = DB.x + DB.w / 2 + 6, oy = DB.y + 100;
    D.sphere(ox, oy, 6, '#0ea5e9', { gloss: true });
    arrowS(ox, oy - 8, ox, oy - 8 - G0 * sc, { color: '#dc2626', width: 6, head: 13 });                     // 압력 경도력: 북쪽
    const cor = [f * L.v, -f * L.u];                                                                         // 전향력 (동, 북)
    if (S.rot && Math.hypot(cor[0], cor[1]) > 1e-9) arrowS(ox, oy + 8, ox + cor[0] * sc, oy + 8 - cor[1] * sc, { color: '#f97316', width: 6, head: 13 });
    if (Vm > 0.05) arrowS(ox + 10, oy, ox + 10 + L.u * 3.4, oy - L.v * 3.4, { color: '#15803d', width: 4.5, head: 11 });
    D.text(DB.x + 8, DB.y + 44 * FS, '압력 경도력', { size: 11.5, weight: 900, color: '#b91c1c', align: 'left' });
    if (S.rot) D.text(DB.x + 8, DB.y + DB.h - 10, '전향력', { size: 11.5, weight: 900, color: '#c2410c', align: 'left' });
    if (Vm > 0.05) D.text(DB.x + DB.w - 8, DB.y + DB.h - 10, '바람 V', { size: 11.5, weight: 900, color: '#15803d', align: 'right' });
    if (S.geo) { D.check(DB.x + DB.w - 20, DB.y + 26, 11, 1); }
    D.text(A.x + A.w / 2, A.y + A.h - 12, S.rot ? '공기가 오른쪽으로 휘며 등압선과 나란히 불어요 (1초 ≈ 4시간)' : '자전이 없으면 공기가 저기압 쪽으로 곧바로 가속돼요 (1초 ≈ 4시간)', { size: 12.5, weight: 800, color: '#334155' });
    // ----- B
    const B = rcOf('bal').B;
    card(B, '⚖️ 힘과 바람');
    const fl = makeFlow(B, COLS, 46);
    D.label(fl.x0 + 70, fl.y - 6, S.rot ? '🌀 지구 자전 · ' + S.lat + '°N' : '⏸️ 자전 없음', { bg: S.rot ? '#7c3aed' : '#64748b', size: 13, pad: 10 });
    fl.y += 24 * FS;
    fl.put('압력 경도력', { color: '#b91c1c', dy: 14 });
    fl.bar(G0 / 2e-3, '#dc2626');
    fl.put(sci(G0, 2) + ' m/s²', { color: '#b91c1c', size: 14, weight: 900, dy: 30 });
    fl.put('전향력 f·V', { color: '#c2410c', dy: 14 });
    const cv = Math.hypot(cor[0], cor[1]);
    fl.bar(cv / 2e-3, '#f97316');
    fl.put(S.rot ? sci(cv, 2) + ' m/s²' : '0 (자전 없음)', { color: '#c2410c', size: 14, weight: 900, dy: 30 });
    fl.need(120);
    fl.put('바람 V = ' + Vm.toFixed(1) + ' m/s', { color: '#15803d', dy: 22 });
    fl.put(S.rot ? '균형일 때 V = ' + fix(ug, 1) + ' m/s' : '균형이 없어서 계속 빨라져요', { size: 12.5, weight: 700, color: '#475569', dy: 26 });
    const angd = Vm > 0.3 ? Math.abs(Math.atan2(L.v, L.u)) / DEG : 0;
    fl.put('바람과 등압선의 각도 ' + (Vm > 0.3 ? Math.round(angd) + '°' : '—'), { dy: 22 });
    fl.put(S.rot ? '0°면 등압선과 나란히 불어요' : '90°면 등압선을 곧바로 가로질러요', { size: 12.5, weight: 700, color: '#475569', dy: 22 });
    S.angle = angd;
  }
  function readBal() {
    const L = S.parcels[2] || { u: 0, v: 0 };
    setReadouts(['위도', S.lat + '°N', '압력 경도력', sci(G0, 2) + ' m/s²', '바람 V', Math.hypot(L.u, L.v).toFixed(1) + ' m/s']);
  }

  /* ======================================================
     장면 4: 지균풍 계산 — V = (1/ρf)(Δp/Δn)
     ====================================================== */
  const SCEN = {
    sfc: { name: '지상 · 45°N', rho: RHO_S, spc: 400, lat: 45 },
    up: { name: '상층(약 5.5 km) · 45°N', rho: RHO_U, spc: 200, lat: 45 },
    l15: { name: '지상 · 15°N', rho: RHO_S, spc: 400, lat: 15 },
  };
  const curSc = () => (S.sc === 'free' ? { name: '직접 설정', rho: S.altC === 'up' ? RHO_U : RHO_S, spc: S.spcC, lat: S.latC } : SCEN[S.sc]);
  const vOf = (c) => vgOf(c.spc, c.rho, c.lat);
  const V_SFC = vOf(SCEN.sfc), V_UP = vOf(SCEN.up), V_15 = vOf(SCEN.l15);
  const calcGeom = () => { const A = rcOf('calc').A; return { A, M: { x: A.x + 12, y: A.y + 44, w: A.w - 24, h: A.h - 56 } }; };
  function calcStep(dt) {
    ['sfc', 'up', 'l15'].forEach((k) => { S.vBar[k] = approach(S.vBar[k] == null ? 0 : S.vBar[k], vOf(SCEN[k]), dt, 6); });
    const c = curSc(), v = vOf(c);
    S.vCur = approach(S.vCur == null ? 0 : S.vCur, isFinite(v) ? Math.min(v, 60) : 0, dt, 7);
    S.spcCV = approach(S.spcCV == null ? c.spc : S.spcCV, c.spc, dt, 7);
    if (!S.gw.length) for (let i = 0; i < 30; i++) S.gw.push({ x: Math.random(), y: Math.random() });
    const M = calcGeom().M;
    S.gw.forEach((p) => { p.x += (S.vCur * 2.6 * dt) / M.w; if (p.x > 1) { p.x -= 1; p.y = Math.random(); } });
  }
  function drawCalc(t, dt) {
    const { A, B } = rcOf('calc'), g = calcGeom(), M = g.M;
    calcStep(dt);
    const c = curSc(), v = vOf(c), show = S.showV || (game && game.free);
    card(A, '🌬️ 지균풍 (북반구): ' + c.name);
    const pxkm = M.h / HK, spcPx = S.spcCV * pxkm, yc = M.y + M.h / 2;
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); gr.addColorStop(0, '#dbeafe'); gr.addColorStop(0.5, '#f8fafc'); gr.addColorStop(1, '#fee2e2');
    ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    const n = Math.ceil(M.h / spcPx / 2) + 1;
    for (let k = -n; k <= n; k++) {
      const y = yc + k * spcPx; if (y < M.y - 2 || y > M.y + M.h + 2) continue;
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(M.x, y); ctx.lineTo(M.x + M.w, y); ctx.stroke();
    }
    S.gw.forEach((p) => ball(M.x + p.x * M.w, M.y + p.y * M.h, 3.4, '#0e7490', false));
    const sp = isFinite(v) ? Math.min(v, 60) : 0, aL = Math.min(S.vCur * 5.2, M.w * 0.7);
    [0.3, 0.7].forEach((fy) => { const yy = M.y + fy * M.h + spcPx * 0.5; if (aL > 2) arrowS(M.x + M.w * 0.14, yy, M.x + M.w * 0.14 + aL, yy, { color: '#15803d', width: 6, head: 15 }); });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    LH(M.x + 18, M.y + 26, 'L'); LH(M.x + 18, M.y + M.h - 10, 'H');
    D.label(M.x + M.w - 8, M.y + M.h - 20, '4 hPa당 ' + c.spc + ' km', { bg: '#334155', size: 12.5, pad: 7, align: 'right' });
    D.label(M.x + 40, M.y + 24 * FS, c.lat > 0 ? '저기압(L)을 왼쪽에 두고 → 동쪽으로' : 'f = 0: 이 식을 쓸 수 없어요', { bg: 'rgba(255,255,255,.92)', color: '#1e293b', size: 12.5, pad: 7, align: 'left', border: '#cbd5e1' });
    // ----- B: 계산 패널
    card(B, '🧮 V = Δp / (ρ f Δn)');
    const f = fOf(c.lat), pg = 400 / (c.spc * 1000);
    const fl = makeFlow(B, COLS);
    fl.put('ρ = ' + c.rho + ' kg/m³ · 위도 ' + c.lat + '°N', { dy: 24 });
    fl.put('f = 2Ω sinφ = ' + (c.lat > 0 ? sci(f, 2) : '0') + ' s⁻¹', { color: '#9a3412', dy: 24 });
    fl.put('Δp/Δn = 400 Pa / ' + sci(c.spc * 1000, 1) + ' m', { dy: 22 });
    fl.put('= ' + sci(pg, 2) + ' Pa/m', { dy: 28 });
    fl.put('V = ' + (show ? (c.lat > 0 ? fix(v, 1) + ' m/s' : '구할 수 없어요') : '? (직접 계산해요)'), { color: '#15803d', size: 17, dy: 30 });
    fl.need(160);
    fl.put('풍속 비교 (m/s)', { size: 13, color: '#475569', dy: 18 });
    const bw = fl.cw - 56 - 62;
    [['sfc', '지상 45°N', '#16a34a', V_SFC], ['up', '상층 45°N', '#0284c7', V_UP], ['l15', '지상 15°N', '#d97706', V_15]].forEach(([k, nm, col, vv]) => {
      D.text(fl.x0, fl.y + 12, nm, { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      const bx = fl.x0 + 70, wv = show ? bw * clamp((S.vBar[k] || 0) / 30, 0, 1) : 0;
      ctx.fillStyle = '#e2e8f0'; rr(bx, fl.y, bw, 16, 8).fill();
      if (wv > 0.5) { ctx.fillStyle = S.sc === k ? col : mixc(col, '#ffffff', 0.45); rr(bx, fl.y, Math.max(wv, 8), 16, 8).fill(); }
      D.text(bx + bw + 6, fl.y + 13, show ? fix(vv, 1) : '?', { size: 13.5, weight: 900, color: col, align: 'left' });
      fl.y += 32 * FS;
    });
    D.text(fl.x0 + 70, fl.y - 6, '0', { size: 11.5, weight: 700, color: '#64748b', align: 'left' }); D.text(fl.x0 + 70 + bw, fl.y - 6, '30', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    fl.y += 14 * FS;
    fl.para('f가 작을수록(저위도) 같은 기압 경도에서 바람이 세져요. 적도에서는 f = 0이라 이 식을 쓸 수 없어요.', 12.5, '#475569');
  }
  function readCalc() {
    const c = curSc(), v = vOf(c), show = S.showV || (game && game.free);
    setReadouts(['위도', c.lat + '°N', '압력 경도', '4 hPa / ' + c.spc + ' km', '지균풍 V', show ? (c.lat > 0 ? fix(v, 1) + ' m/s' : '구할 수 없어요') : '직접 계산해요']);
  }

  /* 포인터: 압력 경도력 장면에서 탐침 A, B 끌기 / 회전원판 위를 누르면 공 굴리기 */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'disc') { const g = discGeom(); if (Math.hypot(p.x - g.cx, p.y - g.cy) < g.U) throwBall(); return false; }
      if (S.mode !== 'pgf') return false;
      const g = mapGeom('pgf'); let best = 36, hit = null;
      [S.A, S.B].forEach((pr) => { const q = probePx(g, pr), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < best) { best = d; hit = pr; } });
      if (!hit) return false; S.drag = { pr: hit }; S.probeSeen = true; mvProbe(p); return true;
    },
    move(p) { if (S.drag) mvProbe(p); },
    up() { if (S.drag) { const pr = S.drag.pr; pr.k = clamp(Math.round(pr.kv), -kMax(S.spc), kMax(S.spc)); S.drag = null; Sound.tick(); } },
    hover(p) {
      if (S.mode === 'disc') { const g = discGeom(); return Math.hypot(p.x - g.cx, p.y - g.cy) < g.U ? 'pointer' : ''; }
      if (S.mode !== 'pgf') return '';
      const g = mapGeom('pgf'); return [S.A, S.B].some((pr) => { const q = probePx(g, pr); return Math.hypot(p.x - q.x, p.y - q.y) < 30; }) ? 'grab' : '';
    },
  });

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const viewCh = makeChoice($('#viewSw'), [{ id: 'top', label: '👁️ 위에서 보기' }, { id: 'rot', label: '🎡 원판 위에서 보기' }], (v) => { S.view = v; });
  const rotCh = makeChoice($('#rotSw'), [{ id: '0', label: '자전 없음' }, { id: '1', label: '자전하는 지구 (북반구)' }], (v) => { setRot(v === '1'); });
  const spcCh = makeChoice($('#spcSw'), [{ id: '800', label: '800 km' }, { id: '400', label: '400 km' }, { id: '200', label: '200 km' }], (v) => { S.spc = +v; S.pBar = null; });
  const scCh = makeChoice($('#scSeg'), [{ id: 'sfc', label: '지상 45°N' }, { id: 'up', label: '상층 45°N' }, { id: 'l15', label: '지상 15°N' }, { id: 'free', label: '직접 설정' }], (v) => { setSc(v); });
  const spcCh2 = makeChoice($('#spcC'), [{ id: '800', label: '800 km' }, { id: '400', label: '400 km' }, { id: '200', label: '200 km' }], (v) => { S.spcC = +v; S.sc = 'free'; scCh.set('free'); });
  const altCh = makeChoice($('#altC'), [{ id: 'sfc', label: '지상 (ρ 1.2)' }, { id: 'up', label: '상층 (ρ 0.74)' }], (v) => { S.altC = v; S.sc = 'free'; scCh.set('free'); });
  ['viewSw', 'rotSw', 'spcSw', 'spcC', 'altC'].forEach((id) => { $('#' + id).classList.add('opt-grid'); });
  $('#spcSw').classList.add('c3'); $('#spcC').classList.add('c3'); $('#scSeg').classList.add('opt-grid');
  const numP = makeNum($('#numP'), { label: '압력 경도력', unit: '×10⁻⁴ m/s²', step: 0.1 });
  const numV = makeNum($('#numV'), { label: '지균풍 V', unit: 'm/s', step: 0.1 });
  const FORCE_SVG = '<svg viewBox="0 0 250 150" width="250" height="150" style="background:#f1f5f9"><g stroke="#334155" stroke-width="2" fill="none"><line x1="8" y1="34" x2="242" y2="34"/><line x1="8" y1="75" x2="242" y2="75"/><line x1="8" y1="116" x2="242" y2="116"/></g>' +
    '<text x="14" y="26" font-size="15" font-weight="900" fill="#1d4ed8">L</text><text x="14" y="140" font-size="15" font-weight="900" fill="#b91c1c">H</text>' +
    '<circle cx="110" cy="75" r="6" fill="#0ea5e9"/>' +
    '<defs><marker id="ma" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>' +
    '<line x1="110" y1="67" x2="110" y2="40" stroke="#dc2626" stroke-width="5" marker-end="url(#ma)"/><text x="122" y="52" font-size="16" font-weight="900" fill="#dc2626">㉠</text>' +
    '<line x1="110" y1="83" x2="110" y2="110" stroke="#f97316" stroke-width="5" marker-end="url(#ma)"/><text x="122" y="104" font-size="16" font-weight="900" fill="#c2410c">㉡</text>' +
    '<line x1="120" y1="75" x2="198" y2="75" stroke="#15803d" stroke-width="5" marker-end="url(#ma)"/><text x="172" y="66" font-size="16" font-weight="900" fill="#15803d">㉢</text></svg>';
  $('#figForce').innerHTML = FORCE_SVG;
  const selForce = makeSelects($('#selForce'), [
    { id: 'a', label: '㉠ 빨간 화살표' }, { id: 'b', label: '㉡ 주황 화살표' }, { id: 'c', label: '㉢ 초록 화살표' },
    { id: 'd', label: '바람을 따라 갈 때 저기압(L)은 어느 쪽에 있나요?', options: [{ id: 'left', label: '왼쪽' }, { id: 'right', label: '오른쪽' }] },
  ], [{ id: 'pgf', label: '압력 경도력' }, { id: 'cor', label: '전향력' }, { id: 'wind', label: '바람(속도)' }], { a: 'pgf', b: 'cor', c: 'wind', d: 'left' }, () => { });

  SciSim.bindRange($('#sRpm'), $('#oRpm'), (v) => (+v > 0 ? '반시계 ' + v + ' rpm' : +v < 0 ? '시계 ' + Math.abs(v) + ' rpm' : '정지'), (v) => { S.rpm = +v; if (S.ball && !S.ball.done) cancelBall(); });
  SciSim.bindRange($('#sLat'), $('#oLat'), (v) => v + '°N', (v) => { S.lat = +v; });
  SciSim.bindRange($('#sLatC'), $('#oLatC'), (v) => v + '°N', (v) => { S.latC = +v; S.sc = 'free'; scCh.set('free'); });
  const setRpm = (v) => { S.rpm = v; setSlider($('#sRpm'), $('#oRpm'), v, (x) => (x > 0 ? '반시계 ' + x + ' rpm' : x < 0 ? '시계 ' + Math.abs(x) + ' rpm' : '정지')); };
  const setView = (v) => { S.view = v; viewCh.set(v); };
  const setLat = (v) => { S.lat = v; setSlider($('#sLat'), $('#oLat'), v, (x) => x + '°N'); };
  function setRot(on) { S.rot = on; rotCh.set(on ? '1' : '0'); newParcels(); }
  const setSpc = (v) => { S.spc = v; spcCh.set(String(v)); S.pBar = null; };
  function setSc(k) {
    S.sc = k; scCh.set(k);
    if (k !== 'free') { const c = SCEN[k]; S.latC = c.lat; S.spcC = c.spc; S.altC = c.rho === RHO_U ? 'up' : 'sfc'; }
    setSlider($('#sLatC'), $('#oLatC'), S.latC, (x) => x + '°N'); spcCh2.set(String(S.spcC)); altCh.set(S.altC);
    updateCtl();
  }
  $('#bThrow').addEventListener('click', () => { Sound.click(); throwBall(); });
  $('#bClear').addEventListener('click', () => { Sound.click(); cancelBall(); S.lastRes = null; });
  $('#bDrop').addEventListener('click', () => { Sound.click(); newParcels(); });

  const MODE_LABEL = { disc: '🎡 회전원판 실험', pgf: '📏 압력 경도력', bal: '⚖️ 힘의 균형', calc: '🧮 지균풍 계산' };
  const FREE_KEYS = { disc: ['viewSw', 'sRpm', 'bThrow'], pgf: ['spcSw'], bal: ['rotSw', 'sLat', 'bDrop'], calc: ['scSeg', 'sLatC', 'spcC', 'altC'] };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free);
    let keys = free ? FREE_KEYS[S.mode] : ctlKeys;
    if (S.mode === 'calc' && free && S.sc !== 'free') keys = keys.filter((k) => !['sLatC', 'spcC', 'altC'].includes(k));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const lastRec = () => (S.rec.length ? S.rec[S.rec.length - 1] : null);
  const devTxt = (r) => (r ? (Math.round(Math.abs(r.dev)) === 0 ? '곧게' : (r.dev > 0 ? '오른쪽 ' : '왼쪽 ') + Math.round(Math.abs(r.dev)) + '°') : '—');
  const settledP = () => !S.drag && S.A.kv === S.A.k && S.B.kv === S.B.k;
  function resetStep(li) {
    hideHint(); parts.clear();
    cancelBall(); S.rec = []; S.lastRes = null; setRpm(0); S.rpmV = 0; setView('top'); S.vt = 0;
    S.A.u = 0.2; S.A.k = S.A.kv = 1; S.B.u = 0.34; S.B.k = S.B.kv = -1; S.drag = null; S.probeSeen = false; setSpc(400); S.spcV = 400; S.showP = false; S.pg = null; numP.reset();
    setRot(false); setLat(45); S.latV = 45; S.parcels = []; selForce.reset();
    setSc('sfc'); S.showV = false; numV.reset(); S.vBar = {}; S.vCur = null; S.spcCV = null;
    if (li === 0) { setMode('disc'); setCtl(['viewSw', 'sRpm', 'bThrow']); showHint('회전 속도를 바꾸고 ‘공 굴리기’를 눌러 봐요', 5200); }
    else if (li === 1) { setMode('pgf'); setCtl(['spcSw']); showHint('A, B 표시를 끌어서 등압선 위에 놓아 봐요', 5200); }
    else if (li === 2) { setMode('bal'); setCtl(['rotSw', 'sLat', 'bDrop']); showHint('지구 자전을 켜고 공기 덩어리의 경로를 봐요', 5200); }
    else { setMode('calc'); setCtl(['scSeg', 'numV']); showHint('시나리오를 고르고 계산한 풍속을 입력해 봐요', 5200); }
    updateCtl();
  }

  const levels = [
    {
      title: '회전원판: 움직이는 공이 휘어 보여요', short: '회전원판', icon: '🎡', phase: '실험', features: ['disc'],
      intro: '<p class="si-q">❓ 탐구 질문: 바람은 높은 압력에서 낮은 압력으로 곧바로 불지 않고, 왜 등압선을 따라 불까?</p>' +
        '<div class="si-link">🔗 <b>앞 단원 ‘전향력과 에크만 수송’에서</b> 전향 매개변수 <b>f = 2Ω sinφ</b>를 배웠고, <b>일반선택 지구과학</b>에서는 기압 차 때문에 바람이 분다고 배웠어요. 이번 차시에서는 대기에서 이 두 가지가 만나요.</div>' +
        '<p>먼저 <b>회전원판</b> 실험이에요. 원판 중심에서 공을 굴리면, 원판 <b>밖에서</b> 보는 사람에게는 공이 <b>곧게</b> 가요. 그런데 <b>원판 위에서</b> 보면 공의 경로가 <b>휘어</b> 보여요. 이 휘어짐을 설명하려고 도입한 <b>겉보기 힘</b>이 <b>전향력</b>(코리올리 힘)이에요. 단위 질량당 크기는 <b>a = f·v</b>예요.</p>',
      setup() { resetStep(0); },
      recap: '회전하는 원판 위에서는 움직이는 공이 진행 방향의 오른쪽(반시계 회전)으로 휘어 보이고, 회전이 빠를수록 많이 휘어요. 전향력은 회전 좌표계의 겉보기 힘이에요.',
      summary: '<ul><li><b>전향력</b>(코리올리 힘)은 회전하는 계에서 움직이는 물체에 작용하는 것처럼 보이는 <b>겉보기 힘</b>이에요. 원판 밖에서 보면 공은 <b>곧게</b> 가요.</li><li>방향: 반시계로 도는 북반구형 원판에서는 진행 방향의 <b>오른쪽</b>, 시계로 도는 남반구형에서는 <b>왼쪽</b>. 속도에 수직이라 <b>방향만</b> 바꾸고, 정지한 공에는 작용하지 않아요.</li><li>단위 질량당 크기 <b>a = f·v</b>. 원판은 f = 2Ω, 지구는 f = 2Ω sinφ예요. 회전 속도가 2배면 휨도 2배예요.</li><li>예: 주기 4 s(15 rpm) 원판은 f = 3.14 s⁻¹이라 v = 0.5 m/s에서 a ≈ 1.6 m/s². 지구 45°N는 f = 1.03×10⁻⁴ s⁻¹이라 v = 10 m/s에서 a = 1.03×10⁻³ m/s²예요.</li></ul>',
      missions: [
        {
          title: '반시계 회전: 오른쪽으로 휘어요',
          goal: '<b>🎡 원판 위에서 보기</b>로 바꾸고, 원판을 <b>반시계 방향</b>으로 돌린 뒤 <b>공 굴리기</b>를 눌러 공이 어느 쪽으로 휘는지 확인해요.',
          hint: '‘원판 위에서 보기’를 누르고, 회전 속도 슬라이더를 오른쪽(반시계)으로 밀어요. 그다음 ‘공 굴리기’를 눌러요. 화면을 눌러도 굴러요.',
          setup() { S.rec = []; cancelBall(); setView('top'); setRpm(0); setMode('disc'); setCtl(['viewSw', 'sRpm', 'bThrow']); },
          check: () => { const l = lastRec(); return S.view === 'rot' && !!l && l.dir > 0 && l.rpm > 0 && l.dev > 0; }, hold: 0.6,
          status: () => { const l = lastRec(); return mark(S.view === 'rot') + ' 원판 위에서 보기 · ' + mark(S.rpm > 0) + ' 반시계 ' + (S.rpm > 0 ? S.rpm + ' rpm' : '(슬라이더를 오른쪽으로)') + ' · ' + mark(!!l && l.dir > 0 && l.dev > 0) + ' 굴린 결과 ' + devTxt(l); },
          explain: '원판 밖에서 보면 공은 곧게 가지만, <b>반시계</b>로 도는 원판 위에서는 공이 진행 방향의 <b>오른쪽</b>으로 휘어 보여요. 북반구의 지구도 위에서 보면 반시계로 자전해서 움직이는 공기가 오른쪽으로 휘어요.',
        },
        {
          title: '회전이 2배면 휨도 2배',
          goal: '반시계 방향으로 한 번 굴린 뒤, 회전 속도를 <b>그 2배</b>로 올려 한 번 더 굴려요. 휘는 각도를 비교해요.',
          hint: '예를 들어 5 rpm으로 한 번, 10 rpm으로 한 번 연달아 굴려요. (굴리는 도중에 슬라이더를 움직이면 그 기록은 지워져요.)',
          setup() { S.rec = []; cancelBall(); setView('rot'); setRpm(0); setMode('disc'); setCtl(['viewSw', 'sRpm', 'bThrow']); },
          check: () => { const n = S.rec.length; if (n < 2) return false; const a = S.rec[n - 2], b = S.rec[n - 1]; return a.dir > 0 && b.dir > 0 && a.rpm > 0 && Math.abs(b.rpm - 2 * a.rpm) < 1e-6 && b.dev > a.dev * 1.9; }, hold: 0.6,
          status: () => { const n = S.rec.length, a = n >= 2 ? S.rec[n - 2] : null, b = lastRec(); return '첫 번째 ' + (a ? a.rpm + ' rpm → ' + devTxt(a) : '—') + ' · 두 번째 ' + (b && n >= 2 ? b.rpm + ' rpm → ' + devTxt(b) : (n === 1 ? '(1번 더 굴려요)' : '—')) + ' · ' + mark(n >= 2 && a.dir > 0 && b.dir > 0 && a.rpm > 0 && Math.abs(b.rpm - 2 * a.rpm) < 1e-6) + ' 속도 2배'; },
          explain: '회전 속도가 2배가 되면 같은 시간 동안 원판이 2배 돌아서 휨도 <b>2배</b>가 돼요. 전향 가속도 a = f·v = 2Ω·v도 회전 각속도 Ω에 비례해요. 지구에서는 위도가 높을수록 f = 2Ω sinφ가 커서 휨이 커요.',
        },
        {
          type: 'quiz', title: '전향력의 정체',
          goal: '원판 위에서 공이 휘어 보이는 까닭을 가장 알맞게 설명한 것은?',
          setup() { setMode('disc'); setCtl(['viewSw', 'sRpm', 'bThrow']); },
          choices: ['공은 원판 밖에서 보면 곧게 가요. 회전하는 원판 위에서 보면 휘어 보이고, 이 효과를 겉보기 힘인 전향력으로 나타내요', '원판 위에 공을 오른쪽으로 실제로 밀어 주는 힘이 있어요. 그 힘이 전향력이에요', '전향력은 공이 정지해 있을 때 가장 크게 작용해요', '전향력은 공의 속력을 점점 빠르게 만들어요'],
          answer: 0,
          feedback: ['', '공을 옆으로 밀어 주는 실제 힘은 없어요. 위에서 보기로 바꾸면 공이 곧게 가는 것을 볼 수 있어요. 전향력은 회전하는 계에서 생기는 겉보기 힘이에요.', '전향력은 속도에 비례해요(a = f·v). 정지한 공(v = 0)에는 작용하지 않아요.', '전향력은 속도에 수직이라 속력은 바꾸지 못하고 방향만 바꿔요.'],
          explain: '전향력은 <b>회전 좌표계의 겉보기 힘</b>이에요. 속도에 수직이라 <b>방향만</b> 바꾸고, 크기는 <b>f·v</b>라서 정지한 물체에는 작용하지 않아요.',
        },
      ],
    },
    {
      title: '압력 경도력: 높은 쪽에서 낮은 쪽으로', short: '압력 경도력', icon: '📏', phase: '분석', features: ['pgf'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회전하는 곳에서 움직이는 물체에는 전향력이 작용하는 것처럼 보인다고 했어요. 그런데 공기가 움직이려면 먼저 공기를 <b>밀어 주는 힘</b>이 있어야 해요.</div>' +
        '<p>같은 높이에서 두 지점의 기압이 다르면 공기는 기압이 <b>높은 쪽에서 낮은 쪽</b>으로 밀려요. 이 힘이 <b>압력 경도력</b>이에요. 등압선에 <b>수직</b>이고, 단위 질량당 크기는 <b>(1/ρ)(Δp/Δn)</b>예요. (Δp: 두 등압선의 기압 차, Δn: 등압선 사이의 거리, ρ: 공기 밀도)</p>',
      setup() { resetStep(1); },
      recap: '압력 경도력은 등압선에 수직이고 고기압에서 저기압을 향해요. 단위 질량당 크기는 (1/ρ)(Δp/Δn)이고, 등압선이 촘촘할수록 커요.',
      summary: '<ul><li><b>압력 경도력</b>: 기압이 높은 쪽 → 낮은 쪽, 등압선에 <b>수직</b>. 단위 질량당 <b>(1/ρ)(Δp/Δn)</b>.</li><li>예: 등압선 간격 4 hPa/400 km, ρ = 1.2 kg/m³ → Δp/Δn = 400 Pa ÷ 4×10⁵ m = 1.0×10⁻³ Pa/m → <b>8.3×10⁻⁴ m/s²</b>.</li><li>등압선이 <b>촘촘할수록</b>(Δn이 작을수록) 압력 경도력이 커요. 200 km 간격이면 400 km 간격의 2배인 1.7×10⁻³ m/s²예요.</li><li>자전이 없으면 정지한 공기는 저기압 쪽으로 곧바로 가속돼요.</li></ul>',
      missions: [
        {
          title: '압력 경도력 계산하기',
          goal: '등압선 간격을 <b>400 km</b>로 두고, A와 B를 <b>이웃한 두 등압선</b>에 놓은 뒤 압력 경도력(단위 질량당)을 <b>×10⁻⁴ m/s²</b> 단위로 계산해 입력해요.',
          hint: 'A와 B를 한 칸 떨어진 등압선에 놓으면 Δp = 4 hPa = 400 Pa, Δn = 400 km = 4×10⁵ m예요. (1/1.2) × (400 ÷ 4×10⁵) = 8.3×10⁻⁴ m/s²이니까 8.3을 입력해요.',
          setup() { S.showP = false; setSpc(400); S.A.k = S.A.kv = 1; S.B.k = S.B.kv = -1; numP.reset(); setMode('pgf'); setCtl(['spcSw', 'numP']); },
          check: () => S.spc === 400 && settledP() && Math.abs(S.A.k - S.B.k) === 1 && numP.near((400 / 4e5 / RHO_S) * 1e4, 0.1), hold: 0.8,
          status: () => mark(S.spc === 400) + ' 등압선 간격 ' + S.spc + ' km (목표 400 km) · ' + mark(settledP() && Math.abs(S.A.k - S.B.k) === 1) + ' A, B가 이웃한 등압선 (Δp ' + 4 * Math.abs(S.A.k - S.B.k) + ' hPa) · ' + mark(numP.near((400 / 4e5 / RHO_S) * 1e4, 0.1)) + ' 입력 ' + (numP.has() ? numP.value : '—'),
          explain: '(1/ρ)(Δp/Δn) = (1/1.2) × (400 Pa ÷ 4×10⁵ m) = (1/1.2) × 1.0×10⁻³ = <b>8.3×10⁻⁴ m/s²</b>예요. 힘의 방향은 기압이 높은 쪽에서 낮은 쪽(저기압 쪽)이에요.',
        },
        {
          type: 'quiz', title: '등압선이 촘촘한 까닭',
          goal: '일기도에서 등압선이 <b>촘촘한</b> 곳일수록 바람이 센 까닭은?',
          setup() { S.showP = true; setMode('pgf'); setCtl(['spcSw']); },
          choices: ['등압선 사이 거리 Δn이 작아져서 Δp/Δn이 커지고, 압력 경도력이 커지기 때문이에요', '등압선이 촘촘한 곳은 공기 밀도 ρ가 커서 공기가 더 가벼워지기 때문이에요', '등압선이 촘촘한 곳은 전향력이 없어지기 때문이에요', '등압선이 촘촘한 곳은 기압 자체가 높기 때문이에요'],
          answer: 0,
          feedback: ['', '힘은 (1/ρ)(Δp/Δn)이에요. ρ가 커지면 오히려 힘이 작아져요. 거리 Δn이 달라지는 효과를 비교해 봐요.', '전향력은 속도에 비례해서 정지한 공기에는 없지만, 이것은 등압선 간격과는 관계가 없어요.', '기압의 크기가 아니라 기압이 얼마나 빠르게 변하는지(경도)가 힘을 결정해요.'],
          explain: '같은 기압 차 Δp라도 등압선 사이 거리 Δn이 짧으면 <b>Δp/Δn</b>이 커져요. 그래서 등압선이 촘촘한 곳은 압력 경도력이 크고 바람이 세요. (400 km → 200 km면 압력 경도력 2배)',
        },
      ],
    },
    {
      title: '힘의 균형: 바람은 등압선과 나란히', short: '힘의 균형', icon: '⚖️', phase: '모형', features: ['bal'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력 경도력은 고기압에서 저기압을 향한다는 것과, 회전하는 곳에서는 움직이는 물체에 전향력이 작용한다는 것을 배웠어요. 두 힘이 함께 작용하면 바람이 어떻게 될까요?</div>' +
        '<p>지구가 자전하지 않으면 정지한 공기는 저기압 쪽으로 곧바로 가속돼요. 자전하는 지구에서는 속도가 생기자마자 <b>전향력</b>이 오른쪽으로 공기를 휘게 해요. 결국 압력 경도력과 전향력의 <b>크기가 같고 방향이 반대</b>가 되면 합력이 0이 되어, 바람은 <b>등압선과 나란히</b> 일정하게 불어요. 이 바람이 <b>지균풍</b>이에요. (화면의 1초는 실제 약 4시간이에요.)</p>',
      setup() { resetStep(2); },
      recap: '압력 경도력과 전향력이 크기가 같고 방향이 반대로 균형을 이루면 바람은 등압선과 나란히 불어요. 북반구에서는 저기압이 바람의 왼쪽에 있어요.',
      summary: '<ul><li>정지한 공기는 처음에 <b>압력 경도력</b>으로 저기압 쪽으로 가속되고, 속도가 생기면 <b>전향력</b>(오른쪽 직각, 크기 f·V)이 휘게 해요.</li><li>정상 상태: <b>(1/ρ)(Δp/Δn) = f·V</b>. 두 힘이 같은 크기, 반대 방향이라 합력이 0이고 바람은 <b>등압선과 나란히</b> 일정하게 불어요(<b>지균풍</b>).</li><li>북반구에서는 바람을 등지고 서면 저기압이 <b>왼쪽</b>에 있어요(보이스 발롯 법칙). 그래서 고기압 주위는 <b>시계 방향</b>, 저기압 주위는 <b>반시계 방향</b>이에요.</li><li>마찰이 없는 상층에서 잘 맞아요. 위도 45°에서 4 hPa/400 km, ρ = 1.2 kg/m³이면 균형 풍속은 약 8.1 m/s예요.</li></ul>',
      missions: [
        {
          title: '균형 이루기',
          goal: '<b>지구 자전</b>을 켜서, 공기 덩어리가 압력 경도력과 전향력이 <b>균형</b>을 이뤄 등압선과 나란히 부는 상태를 만들어요.',
          hint: '‘자전하는 지구’ 단추를 눌러요. 5초쯤 기다리면 경로가 휘다가 등압선과 나란히 곧게 가요. 안 되면 ‘공기 다시 놓기’를 눌러요.',
          setup() { setRot(false); setLat(45); setMode('bal'); setCtl(['rotSw', 'sLat', 'bDrop']); },
          check: () => S.rot && S.geo && S.geoT > 0.5, hold: 0.5,
          status: () => mark(S.rot) + ' 자전하는 지구 · ' + mark(S.rot && S.geo) + ' 균형 (바람과 등압선의 각도 ' + Math.round(S.angle || 0) + '°)',
          explain: '처음에는 압력 경도력만 있어서 공기가 저기압 쪽으로 움직여요. 속도가 생기면 전향력이 오른쪽으로 휘게 해서, 두 힘이 <b>크기가 같고 방향이 반대</b>가 되면 바람은 <b>등압선과 나란히</b> 불어요.',
        },
        {
          title: '힘 화살표와 방향 판정', manual: true,
          goal: '그림의 세 화살표 이름을 고르고, 북반구에서 바람을 따라 갈 때 <b>저기압(L)이 어느 쪽</b>에 있는지 골라요.',
          hint: '저기압(L) 쪽을 향하는 힘은 압력 경도력이에요. 바람(속도)의 오른쪽 직각 방향은 전향력이에요. 바람은 동쪽(→)으로 불어요.',
          setup() { selForce.reset(); setMode('bal'); setCtl(['rotSw', 'selForce']); },
          status: () => mark(selForce.ok()) + ' 고른 곳 ' + selForce.count() + ' / 4',
          check() {
            if (!selForce.complete()) return '4곳을 모두 골라 주세요. (지금 ' + selForce.count() + '곳)';
            if (!selForce.ok()) { selForce.mark(selForce.wrong()); return '빨간 줄이 달라요. 압력 경도력은 저기압 쪽, 전향력은 바람의 오른쪽 직각이에요.'; }
            return true;
          },
          explain: '㉠은 저기압(L) 쪽을 향하는 <b>압력 경도력</b>, ㉡은 바람의 오른쪽 직각인 <b>전향력</b>, ㉢은 <b>바람(속도)</b>이에요. 바람을 따라 갈 때 저기압은 <b>왼쪽</b>에 있어요(보이스 발롯 법칙).',
        },
        {
          type: 'quiz', title: '고기압 주위의 바람',
          goal: '북반구 <b>고기압</b> 주위의 지균풍은 어느 방향으로 돌고, 바람이 고기압에서 저기압으로 곧바로 불지 않는 까닭은?',
          figure: '<svg viewBox="0 0 220 150" width="220" height="150" style="background:#f1f5f9"><g fill="none" stroke="#334155" stroke-width="2"><circle cx="110" cy="75" r="22"/><circle cx="110" cy="75" r="44"/><circle cx="110" cy="75" r="66"/></g><text x="110" y="82" text-anchor="middle" font-size="20" font-weight="900" fill="#b91c1c">H</text><text x="196" y="22" font-size="13" font-weight="800" fill="#1d4ed8">L</text><text x="14" y="140" font-size="13" font-weight="800" fill="#1d4ed8">L</text></svg>',
          setup() { setMode('bal'); setCtl(['rotSw', 'sLat']); },
          choices: ['시계 방향이에요. 압력 경도력(고기압 → 저기압)과 전향력(오른쪽 직각)이 크기가 같고 반대라서 바람이 등압선과 나란히 불어요', '반시계 방향이에요. 전향력이 바람을 고기압 쪽으로 끌어당기기 때문이에요', '시계 방향이에요. 바람이 곧바로 불면 압력 경도력이 사라지기 때문이에요', '반시계 방향이에요. 지표 마찰이 바람을 등압선 쪽으로 돌려놓기 때문이에요'],
          answer: 0,
          feedback: ['', '전향력은 바람의 오른쪽 직각이에요. 고기압 중심에서 바깥쪽으로 가려는 압력 경도력과 균형을 이루면 바람은 시계 방향이 돼요.', '압력 경도력은 기압 차가 있는 한 사라지지 않아요. 전향력과 균형을 이루는 것이에요.', '이 모형에는 마찰이 없어요. 바람을 등지고 설 때 저기압이 왼쪽(고기압이 오른쪽)에 오는 방향을 찾아봐요.'],
          explain: '바람이 불기 시작하면 전향력이 오른쪽으로 휘게 해서, 압력 경도력과 <b>같은 크기, 반대 방향</b>이 될 때 바람은 등압선과 나란히 불어요. 이때 고기압은 바람의 <b>오른쪽</b>에 있으므로 북반구 고기압 주위에서는 <b>시계 방향</b>으로 돌아요.',
        },
      ],
    },
    {
      title: '지균풍 계산: V = Δp / (ρ f Δn)', short: '지균풍 계산', icon: '🧮', phase: '분석', features: ['calc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력 경도력 (1/ρ)(Δp/Δn)과 전향력 f·V가 균형을 이룬다는 것을 봤어요. 이 균형식으로 바람의 <b>속도</b>를 구해 봐요.</div>' +
        '<p>균형식 <b>(1/ρ)(Δp/Δn) = f·V</b>에서 <b>V = (1/ρf)(Δp/Δn) = Δp/(ρ f Δn)</b>예요. 같은 압력 경도라면 <b>f가 작은 저위도</b>에서 바람이 더 세고, 공기 밀도 ρ가 작은 <b>상층</b>에서도 더 세요. f = 2Ω sinφ가 0이 되는 <b>적도</b>에서는 이 식을 쓸 수 없어요.</p>',
      setup() { resetStep(3); },
      recap: '지균풍 V = Δp/(ρ f Δn)이에요. 등압선이 촘촘할수록, 공기가 희박한 상층일수록, f가 작은 저위도일수록 세요. 적도에서는 쓸 수 없어요.',
      summary: '<ul><li><b>V = (1/ρf)(Δp/Δn)</b>: 압력 경도가 클수록, ρ가 작을수록, f가 작을수록 지균풍이 세요. 방향은 저기압을 왼쪽에 두는 등압선 방향이에요.</li><li><b>지상 45°N</b>: f = 1.03×10⁻⁴ s⁻¹, ρ = 1.2, 4 hPa/400 km → V ≈ <b>8.1 m/s</b>.</li><li><b>상층(약 5.5 km)</b>: ρ = 0.74, 4 hPa/200 km → V ≈ <b>26.2 m/s</b>. <b>15°N</b>: f = 3.77×10⁻⁵ s⁻¹, 같은 압력 경도 → V ≈ <b>22.1 m/s</b>.</li><li>적도(f = 0)에서는 식이 성립하지 않아요. 지균풍은 마찰이 없고 등압선이 직선일 때의 바람이에요. 휘어진 등압선과 마찰은 다음 차시에서 다뤄요.</li></ul>',
      missions: [
        {
          title: '지상 지균풍 계산',
          goal: '<b>지상 45°N</b>(ρ = 1.2 kg/m³, 4 hPa/400 km)의 지균풍 풍속 V를 계산해 <b>m/s</b> 단위로 입력해요.',
          hint: 'f = 2Ω sin45° = 1.03×10⁻⁴ s⁻¹, Δp/Δn = 400 Pa ÷ 4×10⁵ m = 1.0×10⁻³ Pa/m예요. V = 1.0×10⁻³ ÷ (1.2 × 1.03×10⁻⁴) ≈ 8.1 m/s예요. (8 또는 8.1을 입력해요)',
          setup() { S.showV = false; setSc('sfc'); numV.reset(); setMode('calc'); setCtl(['scSeg', 'numV']); },
          check: () => S.sc === 'sfc' && numV.near(V_SFC, 0.5), hold: 0.8,
          status: () => mark(S.sc === 'sfc') + ' 시나리오 지상 45°N · ' + mark(S.sc === 'sfc' && numV.near(V_SFC, 0.5)) + ' 입력 ' + (numV.has() ? numV.value + ' m/s' : '—'),
          explain: 'V = Δp/(ρ f Δn) = 400 ÷ (1.2 × 1.03×10⁻⁴ × 4×10⁵) ≈ <b>8.1 m/s</b>예요. 힘의 균형을 풍속으로 바꾼 값이에요.',
        },
        {
          title: '저위도에서는 더 세요',
          goal: '같은 압력 경도(4 hPa/400 km)에서 <b>지상 15°N</b>의 지균풍 풍속 V를 계산해 <b>m/s</b> 단위로 입력해요.',
          hint: 'f(15°) = 2Ω sin15° = 3.77×10⁻⁵ s⁻¹예요. V = 1.0×10⁻³ ÷ (1.2 × 3.77×10⁻⁵) ≈ 22.1 m/s예요. (22 또는 22.1을 입력해요)',
          setup() { S.showV = true; setSc('l15'); numV.reset(); setMode('calc'); setCtl(['scSeg', 'numV']); },
          check: () => S.sc === 'l15' && numV.near(V_15, 0.6), hold: 0.8,
          status: () => mark(S.sc === 'l15') + ' 시나리오 지상 15°N · ' + mark(S.sc === 'l15' && numV.near(V_15, 0.6)) + ' 입력 ' + (numV.has() ? numV.value + ' m/s' : '—'),
          explain: 'f(15°) = 3.77×10⁻⁵ s⁻¹로 f(45°)의 약 0.37배라서 V = 1.0×10⁻³ ÷ (1.2 × 3.77×10⁻⁵) ≈ <b>22.1 m/s</b>예요. 위도 45°(8.1 m/s)보다 약 2.7배 세요.',
        },
        {
          type: 'quiz', title: '적도에서는 쓸 수 없어요',
          goal: '적도 부근(위도 0°)에서 지균풍 식 <b>V = Δp/(ρ f Δn)</b>을 쓸 수 없는 까닭은?',
          setup() { S.showV = true; setSc('free'); setMode('calc'); setCtl(['scSeg', 'sLatC']); },
          choices: ['적도에서는 f = 2Ω sinφ = 0이라, 식의 분모가 0이 돼요. 전향력이 압력 경도력과 균형을 맞춰 줄 수 없어요', '적도에서는 기압 차가 생기지 않아서 바람이 불지 않아요', '적도에서는 지구가 자전하지 않아서 f가 0이에요', '적도에서는 공기 밀도가 0이라서 식이 성립하지 않아요'],
          answer: 0,
          feedback: ['', '적도에서도 기압 차는 있을 수 있어요. 문제는 전향력이 0이 되어 균형을 이룰 수 없다는 점이에요.', '적도에서도 지구는 자전해요. f = 2Ω sinφ에서 sin 0° = 0이라 f가 0이 되는 거예요.', '적도의 공기 밀도는 0이 아니에요. 식에서 0이 되는 것은 f예요.'],
          explain: 'f = 2Ω sinφ는 적도(φ = 0°)에서 <b>0</b>이에요. V = Δp/(ρ f Δn)의 분모가 0이 되어 전향력이 압력 경도력과 균형을 이룰 수 없어요. 적도 부근에서는 지균풍 관계를 쓸 수 없어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-geostrophic-wind', mount: '#game', badge: '지균풍 박사', homeHref: '../../index.html#hs',
    featureLabels: { disc: '🎡 회전원판 · 시점 바꾸기', pgf: '📏 등압선 지도 · 압력 경도력', bal: '⚖️ 힘의 균형 모형', calc: '🧮 지균풍 계산 패널' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'disc') readDisc();
    else if (S.mode === 'pgf') readPgf();
    else if (S.mode === 'bal') readBal();
    else readCalc();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'disc') drawDisc(t, dt);
    else if (S.mode === 'pgf') drawPgf(t, dt);
    else if (S.mode === 'bal') drawBal(t, dt);
    else drawCalc(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, numP, numV, selForce, V_SFC, V_UP, V_15, G0,
    get game() { return game; }, setMode, resetStep, updateCtl, setRpm, setView, setLat, setRot, setSpc, setSc, newParcels, throwBall, cancelBall, discGeom, mapGeom, probePx,
  };
})();
