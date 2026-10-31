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
     경도풍과 지상풍 (곡선 흐름 → 경도풍 → 마찰력 → 지상풍)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 900, 1.22);
  let game = null;
  const COLS = PHONE ? 2 : 1;
  const F45 = fOf(45);                                  // f(45°) = 1.03×10⁻⁴ s⁻¹
  const VGREF = 12;                                     // 지균풍 12 m/s에 해당하는 압력 경도력으로 계산해요
  const PGF2 = F45 * VGREF;                             // (1/ρ)(Δp/Δn) = f·V_g = 1.24×10⁻³ m/s²
  const TSC = 60000;                                    // 곡선 흐름 장면: 화면 1초 = 실제 약 17시간
  const KF = { sea: 0.27, land: 0.58, city: 1.0 };      // 마찰 계수 k/f
  const SURF_NAME = { sea: '해상', land: '육지', city: '숲·도시' };
  const E4 = (x) => (x * 1e4).toFixed(1); const E42 = (x) => (x * 1e4).toFixed(2);               // ×10⁻⁴ m/s² 단위로 소수 첫째 자리

  /* 경도풍 균형 풍속 (북반구, 위도 45°): 저기압 PGF − fV = V²/r, 고기압 fV − PGF = V²/r */
  function vLow(rkm) { const r = rkm * 1000; return ((-F45 + Math.sqrt(F45 * F45 + (4 * PGF2) / r)) * r) / 2; }
  function vHigh(rkm) { const r = rkm * 1000, d = F45 * F45 - (4 * PGF2) / r; return d < 0 ? NaN : ((F45 - Math.sqrt(d)) * r) / 2; }
  const V_LOW = vLow(1000), V_HIGH = vHigh(1000);              // 10.9 m/s, 13.9 m/s
  /* 마찰이 있을 때: tanα = k/f, V = V_g cosα */
  const alphaOf = (kf) => Math.atan(kf);
  const vFric = (kf) => VGREF * Math.cos(alphaOf(kf));
  const SPOTS = [['a', 'low', 0], ['b', 'low', 90], ['c', 'low', 225], ['d', 'high', 45], ['e', 'high', 180], ['f', 'high', 270]];
  const COMPASS = ['동', '북동', '북', '북서', '서', '남서', '남', '남동'];
  const ALPHA_SFC = { sea: 15, land: 30, city: 45 };
  /* 일기도 한 곳(극각 θ, 도)의 바람이 불어가는 방향(도, 동쪽 0, 북쪽 90) */
  function windDir(kind, th, al) {
    const t = th * DEG, a = al * DEG;
    let wx, wy;
    if (kind === 'low') { wx = Math.cos(a) * -Math.sin(t) + Math.sin(a) * -Math.cos(t); wy = Math.cos(a) * Math.cos(t) + Math.sin(a) * -Math.sin(t); }
    else { wx = Math.cos(a) * Math.sin(t) + Math.sin(a) * Math.cos(t); wy = Math.cos(a) * -Math.cos(t) + Math.sin(a) * Math.sin(t); }
    return ((Math.atan2(wy, wx) / DEG) + 360) % 360;
  }
  const compassOf = (deg) => COMPASS[Math.round(deg / 45) % 8];
  const compassMargin = (deg) => { const m = deg % 45; return Math.min(m, 45 - m); };

  function rcOf(mode) {
    if (mode === 'curve') return phoneRC({ P0: { x: 8, y: 8, w: 504, h: 160 }, P1: { x: 8, y: 174, w: 504, h: 262 }, P2: { x: 8, y: 442, w: 504, h: 262 }, N: { x: 8, y: 710, w: 504, h: 182 } }, { P0: { x: 12, y: 12, w: 252, h: 396 }, P1: { x: 274, y: 12, w: 252, h: 396 }, P2: { x: 536, y: 12, w: 252, h: 396 }, N: { x: 12, y: 416, w: 776, h: 132 } });
    if (mode === 'grad') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 500 }, B: { x: 8, y: 516, w: 504, h: 376 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    if (mode === 'fric') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 360 }, B: { x: 8, y: 376, w: 504, h: 516 } }, { A: { x: 12, y: 12, w: 400, h: 536 }, B: { x: 420, y: 12, w: 368, h: 536 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 372 }, B1: { x: 8, y: 388, w: 504, h: 246 }, B2: { x: 8, y: 642, w: 504, h: 250 } }, { A: { x: 12, y: 12, w: 776, h: 268 }, B1: { x: 12, y: 288, w: 382, h: 260 }, B2: { x: 402, y: 288, w: 386, h: 260 } });
  }

  const S = {
    mode: 'curve', fade: 0, clock: 0,
    th: { str: 0, low: 0, high: 0, g: 0 },
    // 2. 경도풍
    gk: 'low', gr: 1000, gV: 8, gBal: false, gBalT: 0,
    // 3. 마찰력
    kf: 0, kfV: 0, fPts: [], surf: 'sea', alV: 0, vV: VGREF, fSeen: false,
    // 4. 지상풍
    surfS: 'sea', rS: 500, showWind: true, sPts: [], cp: [], cloud: { low: 0, high: 0 }, wV: 0, showW: false, spotsOn: false,
  };

  /* ======================================================
     공통: 원(또는 직선) 등압선 위를 도는 공기 덩어리와 힘 화살표
     ====================================================== */
  const C_PGF = '#dc2626', C_COR = '#f97316', C_NET = '#7c3aed', C_V = '#15803d';
  const SCF = 34;                                       // 힘 화살표: 1×10⁻³ m/s² = 34 px
  function orbitMap(R, kind, V, rkm, th, o) {
    o = o || {};
    const M = { x: R.x + 8, y: R.y + (o.top || 36), w: R.w - 16, h: R.h - (o.top || 36) - (o.bottom || 8) };
    const cx = M.x + M.w / 2, cy = M.y + M.h / 2 + (o.cyOff || 0), Rp = Math.min(M.w, M.h) * (o.rf || 0.3);
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h);
    if (kind === 'low') { gr.addColorStop(0, '#dbeafe'); gr.addColorStop(1, '#eef2ff'); } else if (kind === 'high') { gr.addColorStop(0, '#fff1f2'); gr.addColorStop(1, '#fee2e2'); } else { gr.addColorStop(0, '#dbeafe'); gr.addColorStop(1, '#fee2e2'); }
    ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
    let pos, vel, outU;
    if (kind === 'straight') {
      for (let k = -3; k <= 3; k++) { const y = cy + k * Rp * 0.55; ctx.beginPath(); ctx.moveTo(M.x, y); ctx.lineTo(M.x + M.w, y); ctx.stroke(); }
      const xx = M.x + ((th % 1) + 1) % 1 * M.w; pos = { x: xx, y: cy }; vel = { x: 1, y: 0 }; outU = { x: 0, y: -1 };
    } else {
      [0.45, 0.72, 1, 1.32, 1.65].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy, Rp * k, 0, TAU); ctx.stroke(); });
      pos = { x: cx + Rp * Math.cos(th), y: cy - Rp * Math.sin(th) };
      outU = { x: Math.cos(th), y: -Math.sin(th) };
      const sgn2 = kind === 'low' ? 1 : -1;
      vel = { x: sgn2 * -Math.sin(th), y: sgn2 * -Math.cos(th) };
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    if (kind !== 'straight') D.text(cx, cy + 8, kind === 'low' ? 'L' : 'H', { size: 24, weight: 900, color: kind === 'low' ? '#1d4ed8' : '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    else { D.text(M.x + 16, M.y + 22, 'L', { size: 20, weight: 900, color: '#1d4ed8', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 }); D.text(M.x + 16, M.y + M.h - 8, 'H', { size: 20, weight: 900, color: '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 }); }
    // 힘 (단위 질량당)
    const cor = F45 * V;
    let pgfU, corU, net, needed = (V * V) / (rkm * 1000);
    if (kind === 'straight') { pgfU = { x: 0, y: -1 }; corU = { x: 0, y: 1 }; net = 0; }
    else if (kind === 'low') { pgfU = { x: -outU.x, y: -outU.y }; corU = outU; net = PGF2 - cor; }
    else { pgfU = outU; corU = { x: -outU.x, y: -outU.y }; net = cor - PGF2; }
    ball(pos.x, pos.y, 8, '#0ea5e9', true);
    const tn = { x: -outU.y, y: outU.x };                // 접선 방향(옆으로 조금 비켜 그려요)
    const off = 7;
    arrowS(pos.x + tn.x * off, pos.y + tn.y * off, pos.x + tn.x * off + pgfU.x * PGF2 * SCF * 1e3, pos.y + tn.y * off + pgfU.y * PGF2 * SCF * 1e3, { color: C_PGF, width: 5, head: 11 });
    arrowS(pos.x - tn.x * off, pos.y - tn.y * off, pos.x - tn.x * off + corU.x * cor * SCF * 1e3, pos.y - tn.y * off + corU.y * cor * SCF * 1e3, { color: C_COR, width: 5, head: 11 });
    arrowS(pos.x + vel.x * 10, pos.y + vel.y * 10, pos.x + vel.x * (10 + V * 2.6), pos.y + vel.y * (10 + V * 2.6), { color: C_V, width: 4, head: 10 });
    const inU = { x: -outU.x, y: -outU.y }, mag = o.mag || 6;
    if (o.showNet !== false && kind !== 'straight' && Math.abs(net) > 1e-6) arrowS(pos.x + inU.x * 2 + tn.x * 18, pos.y + inU.y * 2 + tn.y * 18, pos.x + tn.x * 18 + inU.x * Math.max(0, net) * SCF * 1e3 * mag, pos.y + tn.y * 18 + inU.y * Math.max(0, net) * SCF * 1e3 * mag, { color: C_NET, width: 5, head: 10 });
    return { M, cx, cy, Rp, pos, outU, inU, net, needed, cor };
  }
  /* ======================================================
     장면 1: 곡선 흐름
     ====================================================== */
  function curveStep(dt) {
    const r = 1000;
    S.th.str = (S.th.str + 0.22 * dt) % 1;                                              // 가로 이동 비율
    S.th.low = (S.th.low + (V_LOW / (r * 1000)) * TSC * dt) % TAU;
    S.th.high = (S.th.high - (V_HIGH / (r * 1000)) * TSC * dt + TAU) % TAU;
  }
  function drawCurve(t, dt) {
    const { P0, P1, P2, N } = rcOf('curve');
    curveStep(dt);
    const cfg = [[P0, 'straight', VGREF, '직선 등압선 · 지균풍', S.th.str], [P1, 'low', V_LOW, '저기압 (r = 1000 km)', S.th.low], [P2, 'high', V_HIGH, '고기압 (r = 1000 km)', S.th.high]];
    cfg.forEach(([R, kind, V, title, th]) => {
      card(R, null);
      D.text(R.x + R.w / 2, R.y + 22 * FS, title, { size: 13.5, weight: 800, color: '#1e3a8a' });
      orbitMap(R, kind, V, 1000, th, { top: 34, bottom: 26, rf: kind === 'straight' ? 0.3 : 0.27 });
      D.text(R.x + R.w / 2, R.y + R.h - 9, 'V = ' + V.toFixed(1) + ' m/s' + (kind === 'low' ? ' (반시계)' : kind === 'high' ? ' (시계)' : ''), { size: 13, weight: 900, color: C_V });
    });
    // 안내 카드
    card(N, null);
    legend(N.x + N.w / 2, N.y + 24 * FS, [[C_PGF, '압력 경도력'], [C_COR, '전향력 f·V'], [C_V, '바람 V'], [C_NET, '합력(6배 확대)']]);
    let y = N.y + 50 * FS;
    y = para(N.x + 16, y, N.w - 32, '직선: 12.4 − 12.4 = 0 (×10⁻⁴ m/s²) → 합력 0, 직진', 13, '#334155', 800) + 5;
    y = para(N.x + 16, y, N.w - 32, '저기압: 12.4 − 11.2 = 1.2 = V²/r (안쪽) · 고기압: 14.3 − 12.4 = 1.9 = V²/r (안쪽)', 13, '#334155', 800) + 5;
    y = para(N.x + 16, y, N.w - 32, '곡선을 돌면 속력이 같아도 가속도가 있어요 → 합력은 늘 원의 중심(안쪽)을 향해요.', 12.5, C_NET, 700) + 4;
    if (!PHONE) para(N.x + 16, y, N.w - 32, '(압력 경도력 12.4×10⁻⁴ m/s² = f·V_g, V_g = 12 m/s, 위도 45°, 화면 1초 ≈ 17시간)', 11.5, '#64748b', 700);
  }
  function readCurve() { setReadouts(['직선 (지균풍)', VGREF.toFixed(1) + ' m/s', '저기압 (r 1000 km)', V_LOW.toFixed(1) + ' m/s', '고기압 (r 1000 km)', V_HIGH.toFixed(1) + ' m/s']); }

  /* ======================================================
     장면 2: 경도풍 — 풍속을 직접 맞춰요
     ====================================================== */
  const gTarget = () => (S.gk === 'low' ? vLow(S.gr) : vHigh(S.gr));
  const gIsBal = () => { const T = gTarget(); return isFinite(T) && Math.abs(S.gV - T) <= 0.2 + 1e-9; };
  function gradStep(dt) {
    const dir = S.gk === 'low' ? 1 : -1;
    S.th.g = (S.th.g + dir * ((S.gV + 0.0) / (S.gr * 1000)) * TSC * dt + TAU) % TAU;
    S.gBal = gIsBal(); S.gBalT = S.gBal ? S.gBalT + dt : 0;
  }
  function drawGrad(t, dt) {
    const { A, B } = rcOf('grad');
    gradStep(dt);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, S.gk === 'low' ? '🌀 저기압 주위 (반시계 방향) · r = ' + S.gr + ' km' : '☀️ 고기압 주위 (시계 방향) · r = ' + S.gr + ' km', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const o = orbitMap(A, S.gk, S.gV, S.gr, S.th.g, { top: 38, bottom: 56, rf: 0.3, mag: 6 });
    // 필요한 구심 가속도(점선, 초록)와 실제 합력(보라) 비교
    const need = o.needed, net = o.net;
    const tn = { x: -o.outU.y, y: o.outU.x };
    arrowS(o.pos.x + tn.x * 30, o.pos.y + tn.y * 30, o.pos.x + tn.x * 30 + o.inU.x * Math.max(0, need) * SCF * 1e3 * 6, o.pos.y + tn.y * 30 + o.inU.y * Math.max(0, need) * SCF * 1e3 * 6, { color: '#0f172a', width: 3, head: 8, dash: [4, 4] });
    legend(A.x + A.w / 2, A.y + A.h - 34 * FS, [[C_PGF, '압력 경도력'], [C_COR, '전향력 f·V'], [C_NET, '실제 합력'], ['#0f172a', '필요한 V²/r']]);
    if (S.gBal) { D.label(A.x + A.w / 2, A.y + A.h - 14 * FS, '✔ 합력 = 구심 가속도: 균형!', { bg: '#15803d', size: 13.5, pad: 12 }); }
    else D.text(A.x + A.w / 2, A.y + A.h - 14 * FS, '보라(실제 합력)와 검은 점선(필요한 V²/r)이 같아지게 V를 맞춰요 (화살표 6배 확대)', { size: 12, weight: 700, color: '#475569' });
    // ----- B 패널
    card(B, '🔢 힘의 수지 (×10⁻⁴ m/s²)');
    const fl = makeFlow(B, COLS);
    const V = S.gV, cor = F45 * V, T = gTarget(), isL = S.gk === 'low';
    const resid = (isL ? PGF2 - cor : cor - PGF2) - need;
    fl.put('압력 경도력  ' + E42(PGF2), { color: C_PGF, dy: 22 });
    fl.put('전향력 f·V  ' + E42(cor), { color: C_COR, dy: 22 });
    fl.put((isL ? '합력 = PGF − fV  ' : '합력 = fV − PGF  ') + E42(isL ? PGF2 - cor : cor - PGF2), { color: C_NET, dy: 22 });
    fl.put('필요한 V²/r  ' + E42(need), { color: '#0f172a', dy: 24 });
    fl.put('차이  ' + (resid >= 0 ? '+' : '−') + E42(Math.abs(resid)), { color: Math.abs(resid) < 0.3e-4 ? '#15803d' : '#b91c1c', size: 15, dy: 26 });
    // 합력 계: 가운데가 0
    { const w = fl.cw; ctx.fillStyle = '#e2e8f0'; rr(fl.x0, fl.y, w, 16, 8).fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fl.x0 + w / 2, fl.y - 3); ctx.lineTo(fl.x0 + w / 2, fl.y + 19); ctx.stroke();
      const k = clamp(resid / 1.5e-3, -1, 1); S.rBar = approach(S.rBar == null ? k : S.rBar, k, dt, 10);
      ctx.fillStyle = Math.abs(resid) < 0.3e-4 ? '#16a34a' : '#ef4444'; const bw = Math.abs(S.rBar) * w / 2; rr(S.rBar >= 0 ? fl.x0 + w / 2 : fl.x0 + w / 2 - bw, fl.y + 2, Math.max(2, bw), 12, 6).fill();
      fl.y += 30 * FS; }
    fl.need(190);
    fl.put('풍속 V (m/s)', { size: 13, color: '#475569', dy: 14 });
    const vmax = 20, bw2 = fl.cw - 52;
    const rows = [['저기압 균형', vLow(S.gr), '#2563eb'], ['지균풍', VGREF, '#16a34a'], ['고기압 균형', vHigh(S.gr), '#dc2626'], ['내가 맞춘 V', V, '#0f172a']];
    rows.forEach(([nm, v, col]) => {
      D.text(fl.x0, fl.y + 12, nm, { size: 12, weight: 800, color: '#334155', align: 'left' });
      const bx = fl.x0 + 76, bwid = fl.cw - 76 - 36;
      ctx.fillStyle = '#e2e8f0'; rr(bx, fl.y, bwid, 14, 7).fill();
      if (isFinite(v)) { ctx.fillStyle = col; rr(bx, fl.y, Math.max(6, bwid * clamp(v / vmax, 0, 1)), 14, 7).fill(); }
      D.text(bx + bwid + 4, fl.y + 12, isFinite(v) ? v.toFixed(1) : '없음', { size: 12.5, weight: 900, color: col, align: 'left' });
      fl.y += 26 * FS;
    });
    fl.y += 4;
    if (!isFinite(T)) fl.para('이 반지름에서는 고기압의 균형 풍속이 없어요: 같은 기압 경도를 유지할 수 없어요.', 12, '#b91c1c');
    else fl.para('같은 기압 경도에서 저기압은 지균풍보다 느리고, 고기압은 더 빨라요.', 12, '#475569');
  }
  function readGrad() {
    const T = gTarget();
    setReadouts(['내가 맞춘 V', S.gV.toFixed(1) + ' m/s', '균형 풍속', isFinite(T) ? T.toFixed(1) + ' m/s' : '없음', '지균풍', VGREF.toFixed(1) + ' m/s']);
  }

  /* ======================================================
     장면 3: 마찰력 — 세 힘의 삼각형
     ====================================================== */
  function fricStep(dt) {
    S.kfV = approach(S.kfV, S.kf, dt, 7);
    S.alV = approachAng(S.alV, alphaOf(S.kf), dt, 7);
    S.vV = approach(S.vV, vFric(S.kf), dt, 7);
    const { A } = rcOf('fric'), M = fricGeom().M;
    if (!S.fPts.length) for (let i = 0; i < 26; i++) S.fPts.push({ x: Math.random(), y: Math.random() });
    S.fPts.forEach((p) => { p.x += (Math.cos(S.alV) * S.vV * 5 * dt) / M.w; p.y -= (Math.sin(S.alV) * S.vV * 5 * dt) / M.h; if (p.x > 1 || p.y < 0) { if (p.x > 1) { p.x -= 1; } if (p.y < 0) { p.y += 1; } if (Math.random() < 0.5) { p.x = Math.random(); } else { p.y = Math.random(); } } });
  }
  const fricGeom = () => { const A = rcOf('fric').A; return { A, M: { x: A.x + 10, y: A.y + 40, w: A.w - 20, h: A.h - 58 } }; };
  const angOf = (kf) => Math.atan(kf) / DEG;
  function drawFric(t, dt) {
    const { A, B } = rcOf('fric'), { M } = fricGeom();
    fricStep(dt);
    const al = S.alV, V = S.vV, kfv = Math.tan(al), cosA = Math.cos(al);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, '🌍 지표 가까이의 바람 (북반구) · 지균풍 V_g = 12 m/s', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); gr.addColorStop(0, '#dbeafe'); gr.addColorStop(1, '#fee2e2'); ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
    for (let k = 1; k < 5; k++) { const y = M.y + (M.h * k) / 5; ctx.beginPath(); ctx.moveTo(M.x, y); ctx.lineTo(M.x + M.w, y); ctx.stroke(); }
    S.fPts.forEach((p) => ball(M.x + p.x * M.w, M.y + p.y * M.h, 3.4, '#0e7490', false));
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    LH(M.x + 16, M.y + 24, 'L'); LH(M.x + 16, M.y + M.h - 8, 'H');
    // 힘 화살표 (공기 덩어리)
    const ox = M.x + M.w * 0.34, oy = M.y + M.h * 0.58, SC = 62 / 1e-3;
    const fV = F45 * V, kV = F45 * kfv * V;
    D.dashedLine(ox, oy, ox + VGREF * 8.5, oy, { color: '#16a34a', width: 3, dash: [6, 5] });
    D.text(ox + VGREF * 8.5 + 6, oy + 4, '지균풍 12.0', { size: 11.5, weight: 800, color: '#15803d', align: 'left' });
    arrowS(ox, oy, ox, oy - PGF2 * SC, { color: C_PGF, width: 6, head: 13 });
    arrowS(ox, oy, ox + Math.sin(al) * fV * SC, oy + Math.cos(al) * fV * SC, { color: C_COR, width: 6, head: 13 });
    arrowS(ox, oy, ox - Math.cos(al) * kV * SC, oy + Math.sin(al) * kV * SC, { color: '#64748b', width: 6, head: 13 });
    arrowS(ox, oy, ox + Math.cos(al) * V * 8.5, oy - Math.sin(al) * V * 8.5, { color: C_V, width: 6, head: 14 });
    ball(ox, oy, 8, '#0ea5e9', true);
    // 각도 호
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 46, -al, 0); ctx.stroke();
    D.label(ox + 66, oy - Math.sin(al / 2) * 52 - 10, 'α = ' + Math.round(al / DEG) + '°', { bg: '#0f172a', size: 12.5, pad: 6 });
    D.text(ox + 6, oy - PGF2 * SC - 6, '압력 경도력', { size: 11.5, weight: 900, color: '#b91c1c', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    D.text(ox + Math.sin(al) * fV * SC + 8, oy + Math.cos(al) * fV * SC + 14, '전향력', { size: 11.5, weight: 900, color: '#c2410c', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    if (kV * SC > 8) D.text(ox - Math.cos(al) * kV * SC - 6, oy + Math.sin(al) * kV * SC + 14, '마찰력', { size: 11.5, weight: 900, color: '#475569', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    D.text(ox + Math.cos(al) * V * 8.5 + 4, oy - Math.sin(al) * V * 8.5 - 8, '바람 ' + V.toFixed(1), { size: 12, weight: 900, color: C_V, align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    D.label(M.x + M.w - 8, M.y + M.h - 20, '바람이 저기압 쪽으로 기울어요', { bg: '#334155', size: 12.5, pad: 7, align: 'right' });
    // ----- B: 삼각형과 표
    card(B, '△ 세 힘이 닫혀요 (×10⁻⁴ m/s²)');
    const fl = makeFlow(B, 1, 44);
    const tx = B.x + (PHONE ? B.w * 0.5 - 30 : B.w * 0.5 - 30), ty = B.y + (PHONE ? 52 : 56), SCT = (PHONE ? 90 : 104) / 1e-3;
    // 삼각형: O → +전향력 → +마찰력 → 압력 경도력(위로)과 닫힘
    const cvx = Math.sin(al) * fV * SCT, cvy = Math.cos(al) * fV * SCT;       // 전향력 (오른쪽 아래)
    const frx = -Math.cos(al) * kV * SCT, fry = Math.sin(al) * kV * SCT;      // 마찰력 (왼쪽 아래)
    const O = { x: tx, y: ty + 4 }, P1 = { x: O.x + cvx, y: O.y + cvy }, P2 = { x: P1.x + frx, y: P1.y + fry };
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y); ctx.closePath(); ctx.fill(); ctx.restore();
    arrowS(O.x, O.y, P1.x, P1.y, { color: C_COR, width: 5, head: 11 });
    arrowS(P1.x, P1.y, P2.x, P2.y, { color: '#64748b', width: 5, head: 11 });
    arrowS(P2.x, P2.y, O.x, O.y, { color: C_PGF, width: 5, head: 11 });
    D.text((O.x + P1.x + P2.x) / 3 + 10, (O.y + P1.y + P2.y) / 3 + 4, '합 = 0', { size: 12.5, weight: 900, color: '#5b21b6', align: 'left' });
    const triH = Math.max(PGF2 * SCT, cvy + fry) + 12;
    fl.y = ty + Math.max(110, triH) + 20;
    fl.put('압력 경도력 ' + E4(PGF2) + ' = f·V_g', { color: C_PGF, dy: 21 });
    fl.put('전향력 f·V ' + E4(fV) + '   마찰력 kV ' + E4(kV), { color: '#334155', size: 13, dy: 22 });
    fl.put('k/f = ' + kfv.toFixed(2) + ' → α = tan⁻¹(k/f) = ' + Math.round(al / DEG) + '°', { color: '#0f172a', size: 13, dy: 22 });
    fl.put('V = V_g cosα = ' + V.toFixed(1) + ' m/s (' + Math.round(cosA * 100) + ' %)', { color: C_V, size: 13, dy: 26 });
    fl.need(120);
    // 지표 표
    D.text(fl.x0, fl.y, '지표       k/f    α     V', { size: 12, weight: 800, color: '#64748b', align: 'left' }); fl.y += 20 * FS;
    ['sea', 'land', 'city'].forEach((k) => {
      const on = Math.abs(S.kf - KF[k]) < 0.005;
      if (on) { ctx.fillStyle = 'rgba(14,165,233,.14)'; rr(fl.x0 - 4, fl.y - 15 * FS, fl.cw + 8, 22 * FS, 6).fill(); }
      D.text(fl.x0, fl.y, SURF_NAME[k], { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      D.text(fl.x0 + fl.cw * 0.42, fl.y, KF[k].toFixed(2), { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      D.text(fl.x0 + fl.cw * 0.62, fl.y, Math.round(angOf(KF[k])) + '°', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      D.text(fl.x0 + fl.cw * 0.8, fl.y, vFric(KF[k]).toFixed(1), { size: 12.5, weight: 800, color: '#15803d', align: 'left' });
      fl.y += 23 * FS;
    });
  }
  function readFric() {
    setReadouts(['마찰 k/f', S.kf.toFixed(2), '풍향 기울기 α', Math.round(angOf(S.kf)) + '°', '풍속 V', vFric(S.kf).toFixed(1) + ' m/s']);
  }

  /* ======================================================
     장면 4: 지상풍 — 수렴·발산과 연직 운동
     ====================================================== */
  const U10 = 10;                                       // 지상 풍속 (m/s)
  const alS = () => ALPHA_SFC[S.surfS];
  const uIn = () => U10 * Math.sin(alS() * DEG);        // 안쪽(바깥쪽) 성분
  const wOf = () => (2 * 1000 * uIn()) / (S.rS * 1000);  // m/s
  function mapG() {
    const A = rcOf('sfc').A; const cw = A.w / 2, R = Math.min((cw - 20) / 2 / 1.1, (A.h - 78) / 2.2);
    const cy = A.y + 38 + 1.1 * R;
    return { A, R, cL: { x: A.x + cw / 2, y: cy }, cH: { x: A.x + cw + cw / 2, y: cy } };
  }
  const spotPos = (g, kind, thDeg, rf) => { const c = kind === 'low' ? g.cL : g.cH, t = thDeg * DEG; return { x: c.x + g.R * rf * Math.cos(t), y: c.y - g.R * rf * Math.sin(t) }; };
  function sfcStep(dt) {
    S.wV = approach(S.wV, wOf(), dt, 6);
    const g = mapG();
    if (!S.sPts.length) {
      for (let i = 0; i < 44; i++) S.sPts.push({ low: { r: 0.1 + Math.random() * 0.95, th: Math.random() * TAU }, high: { r: 0.05 + Math.random() * 0.95, th: Math.random() * TAU } });
      for (let i = 0; i < 26; i++) S.cp.push({ u: i / 26, side: i % 2 ? 1 : -1 });
    }
    const a = alS() * DEG, vr = Math.sin(a) * 0.1, vt = Math.cos(a) * 0.1;               // 화면 1초에 반지름의 10 %
    S.sPts.forEach((p) => {
      const L = p.low, H = p.high;
      L.r -= vr * 1.4 * dt * 3; L.th += (vt * 3 * dt) / Math.max(0.15, L.r) * 0.9;
      if (L.r < 0.08) { L.r = 1.0; L.th = Math.random() * TAU; }
      H.r += vr * 1.4 * dt * 3; H.th -= (vt * 3 * dt) / Math.max(0.15, H.r) * 0.9;
      if (H.r > 1.02) { H.r = 0.06; H.th = Math.random() * TAU; }
    });
    S.cp.forEach((p) => { p.u = (p.u + dt * 0.22) % 1; });
    const tgtL = 1, tgtH = 1;
    S.cloud.low = approach(S.cloud.low, tgtL, dt, 0.6); S.cloud.high = approach(S.cloud.high, tgtH, dt, 0.6);
  }
  function mapPanel(g, kind, show) {
    const c = kind === 'low' ? g.cL : g.cH, R = g.R;
    ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.08, 0, TAU); ctx.clip();
    const rg = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, R * 1.1);
    if (kind === 'low') { rg.addColorStop(0, '#bfdbfe'); rg.addColorStop(1, '#eff6ff'); } else { rg.addColorStop(0, '#fecaca'); rg.addColorStop(1, '#fff1f2'); }
    ctx.fillStyle = rg; ctx.fillRect(c.x - R * 1.2, c.y - R * 1.2, R * 2.4, R * 2.4);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.8;
    [0.3, 0.55, 0.8, 1.05].forEach((k) => { ctx.beginPath(); ctx.arc(c.x, c.y, R * k, 0, TAU); ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.08, 0, TAU); ctx.stroke();
    D.text(c.x, c.y + 8, kind === 'low' ? 'L' : 'H', { size: 22, weight: 900, color: kind === 'low' ? '#1d4ed8' : '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    if (show) {
      S.sPts.forEach((p) => { const q = kind === 'low' ? p.low : p.high, x = c.x + Math.cos(q.th) * q.r * R, y = c.y - Math.sin(q.th) * q.r * R; ball(x, y, 3.3, '#0e7490', false); });
      const al = alS();
      [0.42, 0.78].forEach((rf) => { for (let i = 0; i < 8; i++) { const th = (i + (rf > 0.5 ? 0.5 : 0)) * 45; const p0 = spotPos(g, kind, th, rf), d = windDir(kind, th, al) * DEG; arrowS(p0.x - Math.cos(d) * 12, p0.y + Math.sin(d) * 12, p0.x + Math.cos(d) * 14, p0.y - Math.sin(d) * 14, { color: '#15803d', width: 3.2, head: 8 }); } });
    }
  }
  function columnPanel(Rc, kind, o) {
    card(Rc, null);
    D.text(Rc.x + 14, Rc.y + 22 * FS, kind === 'low' ? '☁️ 저기압: 수렴 → 상승' : '☀️ 고기압: 발산 → 하강', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const gx = Rc.x + 10, gw = Rc.w - 20, top = Rc.y + 34, gy = Rc.y + Rc.h - 62 * FS, cxx = gx + gw / 2;
    const sky = ctx.createLinearGradient(0, top, 0, gy); sky.addColorStop(0, kind === 'low' ? '#cbd5e1' : '#7dd3fc'); sky.addColorStop(1, kind === 'low' ? '#e2e8f0' : '#e0f2fe');
    ctx.fillStyle = sky; rr(gx, top, gw, gy - top, 8).fill();
    // 마찰층 (약 1 km)
    const bl = Math.min(52, (gy - top) * 0.28);
    ctx.fillStyle = 'rgba(100,116,139,.18)'; ctx.fillRect(gx, gy - bl, gw, bl);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, gy - bl); ctx.lineTo(gx + gw, gy - bl); ctx.stroke(); ctx.setLineDash([]);
    D.text(gx + 6, gy - bl - 5, '마찰층 h = 1 km', { size: 11.5, weight: 800, color: '#475569', align: 'left' });
    // 구름 / 해
    const cl = kind === 'low' ? S.cloud.low : 0;
    if (kind === 'low') {
      ctx.save(); ctx.globalAlpha = 0.95 * smooth(cl);
      [[0, 0, 34], [-30, 8, 26], [30, 8, 28], [-12, -12, 24], [16, -14, 22]].forEach(([dx, dy, r]) => { D.sphere(cxx + dx, top + 28 + dy, r, '#94a3b8', { gloss: false }); });
      ctx.restore();
      for (let i = 0; i < 7; i++) { const x = cxx - 36 + i * 12, y = top + 66 + ((S.clock * 60 + i * 13) % 20); ctx.strokeStyle = 'rgba(59,130,246,' + (0.8 * smooth(cl)).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); }
    } else { D.sphere(gx + gw - 40, top + 32, 20, '#fbbf24', { gloss: false }); D.glow(gx + gw - 40, top + 32, 44, '#fde68a', 0.5); }
    ctx.fillStyle = '#a3a380'; rr(gx, gy, gw, 14, 4).fill(); ctx.fillStyle = '#86a35c'; ctx.fillRect(gx, gy, gw, 5);
    // 입자 흐름
    const half = gw / 2 - 14, yb = gy - bl * 0.45, yt = top + 56;
    S.cp.forEach((p) => {
      const u = p.u; let x, y;
      if (kind === 'low') { if (u < 0.5) { x = cxx + p.side * half * (1 - u / 0.5); y = yb; } else { x = cxx; y = yb - (yb - yt) * ((u - 0.5) / 0.5); } }
      else { if (u < 0.5) { x = cxx; y = yt + (yb - yt) * (u / 0.5); } else { x = cxx + p.side * half * ((u - 0.5) / 0.5); y = yb; } }
      const al = (kind === 'low' ? (u > 0.5 ? 1 - (u - 0.5) * 1.2 : 1) : (u < 0.5 ? 0.55 + 0.45 * u : 1)); ctx.globalAlpha = clamp(al, 0.2, 1); ball(x, y, 3.8, '#0e7490', false); ctx.globalAlpha = 1;
    });
    // 지상 바람 화살표
    const aL = 14 + (uIn() / U10) * 70 + 8;
    [-1, 1].forEach((sd) => {
      const x0 = cxx + sd * (half + 6), x1 = kind === 'low' ? x0 - sd * aL : x0 + sd * aL, xs = Math.min(x0, x1), xe = Math.max(x0, x1);
      arrowS(kind === 'low' ? x0 : x0 - sd * aL, yb + 0, kind === 'low' ? x1 : x0, yb, { color: '#15803d', width: 3.4, head: 9 });
    });
    arrowS(cxx, kind === 'low' ? yb - 6 : yt, cxx, kind === 'low' ? yt : yb - 6, { color: kind === 'low' ? '#2563eb' : '#d97706', width: 5, head: 12 });
    D.text(cxx + 12, (yb + yt) / 2, kind === 'low' ? '상승 w' : '하강', { size: 12, weight: 900, color: kind === 'low' ? '#1d4ed8' : '#b45309', align: 'left' });
    // 수식
    const e1 = 'u = V sinα = ' + U10 + ' × sin' + alS() + '° = ' + fix(uIn(), 1) + ' m/s';
    D.text(Rc.x + 14, gy + 30 * FS, e1, { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    if (kind === 'low') D.text(Rc.x + 14, gy + 52 * FS, 'w = 2hu/r = ' + fix(wOf() * 100, 1) + ' cm/s  (r = ' + S.rS + ' km)', { size: 13, weight: 900, color: '#1d4ed8', align: 'left' });
    else D.text(Rc.x + 14, gy + 52 * FS, '중심에서 바깥쪽으로 퍼져 나가요 (발산)', { size: 12.5, weight: 800, color: '#b45309', align: 'left' });
  }
  function drawSfc(t, dt) {
    const { A, B1, B2 } = rcOf('sfc'), g = mapG();
    sfcStep(dt);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, '🗺️ 지상 일기도 (예시) · ' + SURF_NAME[S.surfS] + ' α = ' + alS() + '°', { size: 12.5, weight: 800, color: '#1e3a8a', align: 'left' });
    mapPanel(g, 'low', S.showWind); mapPanel(g, 'high', S.showWind);
    D.text(g.cL.x, g.cL.y + 1.1 * g.R + 16 * FS, '저기압: 반시계 방향 + 안쪽', { size: 12.5, weight: 800, color: '#1d4ed8' });
    D.text(g.cH.x, g.cH.y + 1.1 * g.R + 16 * FS, '고기압: 시계 방향 + 바깥쪽', { size: 12.5, weight: 800, color: '#b91c1c' });
    // 질문 지점
    if (S.spotsOn) {
      SPOTS.forEach(([id, kind, th]) => { const p = spotPos(g, kind, th, 0.66); D.sphere(p.x, p.y, 11, '#7c3aed', { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: id.toUpperCase(), textScale: 1.0 }); });
    }
    columnPanel(B1, 'low'); columnPanel(B2, 'high');
  }
  function readSfc() {
    setReadouts(['지표 · α', SURF_NAME[S.surfS] + ' ' + alS() + '°', '안쪽 성분 u', fix(uIn(), 1) + ' m/s', '연직 속도 w', S.showW || (game && game.free) ? fix(wOf() * 100, 1) + ' cm/s' : '직접 계산해요']);
  }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const IO = [{ id: 'in', label: '안쪽 (중심 쪽)' }, { id: 'out', label: '바깥쪽' }];
  const selCurve = makeSelects($('#selCurve'), [
    { id: 'lp', label: '<span><b>저기압</b>에서 <b>압력 경도력</b>은 어느 쪽을 향하나요?</span>' },
    { id: 'lc', label: '<span><b>저기압</b>에서 <b>전향력</b>은 어느 쪽을 향하나요?</span>' },
    { id: 'hp', label: '<span><b>고기압</b>에서 <b>압력 경도력</b>은 어느 쪽을 향하나요?</span>' },
    { id: 'hc', label: '<span><b>고기압</b>에서 <b>전향력</b>은 어느 쪽을 향하나요?</span>' },
  ], IO, { lp: 'in', lc: 'out', hp: 'out', hc: 'in' }, () => { });
  const gkCh = makeChoice($('#gkSw'), [{ id: 'low', label: '🌀 저기압 (반시계)' }, { id: 'high', label: '☀️ 고기압 (시계)' }], (v) => { setGk(v); });
  const grCh = makeChoice($('#grSw'), [{ id: '500', label: '500 km' }, { id: '1000', label: '1000 km' }, { id: '2000', label: '2000 km' }], (v) => { S.gr = +v; });
  const surfCh = makeChoice($('#surfSw'), [{ id: 'sea', label: '해상' }, { id: 'land', label: '육지' }, { id: 'city', label: '숲·도시' }], (v) => { setKf(KF[v]); });
  const surfCh2 = makeChoice($('#surfSw2'), [{ id: 'sea', label: '해상 15°' }, { id: 'land', label: '육지 30°' }, { id: 'city', label: '숲·도시 45°' }], (v) => { setSurf(v); });
  const rCh = makeChoice($('#rSw'), [{ id: '250', label: '250 km' }, { id: '500', label: '500 km' }, { id: '1000', label: '1000 km' }], (v) => { S.rS = +v; });
  ['gkSw', 'grSw', 'surfSw', 'surfSw2', 'rSw'].forEach((id) => $('#' + id).classList.add('opt-grid'));
  ['grSw', 'surfSw', 'surfSw2', 'rSw'].forEach((id) => $('#' + id).classList.add('c3'));
  const stpV = makeStepper2($('#stpV'), { min: 0, max: 25, step: 0.1, big: 1, dec: 1, value: 8, unit: 'm/s', onChange: (v) => { S.gV = v; } });
  const numW = makeNum($('#numW'), { label: '연직 속도 w', unit: 'cm/s', step: 0.1 });
  const pairFric = makePair($('#pairFric'), [{ id: 'sea', label: '해상 (k/f = 0.27)' }, { id: 'land', label: '육지 (k/f = 0.58)' }, { id: 'city', label: '숲·도시 (k/f = 1.0)' }], [{ id: 'a15', label: '15°' }, { id: 'a30', label: '30°' }, { id: 'a45', label: '45°' }], { sea: 'a15', land: 'a30', city: 'a45' }, () => { });
  const ansSpots = {};
  const CP_OPTS = COMPASS.map((n) => ({ id: n, label: n + '쪽으로' }));
  const selSpots = makeSelects($('#selSpots'), SPOTS.map(([id, kind, th]) => ({ id, label: '<span><b>' + id.toUpperCase() + '</b> (' + (kind === 'low' ? '저기압' : '고기압') + ')</span>' })), CP_OPTS, ansSpots, () => { });
  function updAns() { SPOTS.forEach(([id, kind, th]) => { ansSpots[id] = compassOf(windDir(kind, th, alS())); }); }
  SciSim.bindRange($('#sKf'), $('#oKf'), (v) => 'k/f = ' + (+v).toFixed(2), (v) => { S.kf = +v; syncSurf(); });
  const setKf = (v) => { S.kf = v; setSlider($('#sKf'), $('#oKf'), v, (x) => 'k/f = ' + (+x).toFixed(2)); syncSurf(); };
  function syncSurf() { const hit = Object.keys(KF).find((k) => Math.abs(KF[k] - S.kf) < 0.005); surfCh.set(hit || null); }
  function setGk(v) { S.gk = v; gkCh.set(v); }
  function setGr(v) { S.gr = v; grCh.set(String(v)); }
  function setSurf(v) { S.surfS = v; surfCh2.set(v); updAns(); selSpots.reset(); }
  function setRs(v) { S.rS = v; rCh.set(String(v)); }
  $('#bShow').addEventListener('click', () => { Sound.click(); S.showWind = !S.showWind; $('#bShow').textContent = S.showWind ? '🙈 바람 화살표 숨기기' : '🔍 바람 화살표 보기'; });
  const syncShow = () => { $('#bShow').textContent = S.showWind ? '🙈 바람 화살표 숨기기' : '🔍 바람 화살표 보기'; };

  const MODE_LABEL = { curve: '🌀 곡선 흐름', grad: '💨 경도풍', fric: '🧱 마찰력', sfc: '🗺️ 지상풍' };
  const FREE_KEYS = { curve: [], grad: ['gkSw', 'grSw', 'stpV'], fric: ['surfSw', 'sKf'], sfc: ['surfSw2', 'rSw', 'bShow'] };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode] : ctlKeys;
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
  function resetStep(li) {
    hideHint(); parts.clear();
    selCurve.reset(); setGk('low'); setGr(1000); stpV.set(8, true); S.gV = 8; S.rBar = null;
    setKf(0); S.kfV = 0; S.alV = 0; S.vV = VGREF; pairFric.reset();
    setSurf('sea'); setRs(500); S.showWind = true; syncShow(); S.spotsOn = false; S.showW = false; numW.reset(); S.wV = 0;
    S.th = { str: 0, low: 0, high: 0, g: 0 };
    if (li === 0) { setMode('curve'); setCtl(['selCurve']); showHint('세 장면에서 힘 화살표를 비교해 봐요', 5200); }
    else if (li === 1) { setMode('grad'); setCtl(['gkSw', 'grSw', 'stpV']); showHint('풍속을 바꿔서 실제 합력과 필요한 V²/r를 맞춰 봐요', 5200); }
    else if (li === 2) { setMode('fric'); setCtl(['surfSw', 'sKf']); showHint('지표 종류를 바꾸면 바람의 방향이 어떻게 변하는지 봐요', 5200); }
    else { setMode('sfc'); setCtl(['surfSw2', 'rSw', 'numW']); showHint('지표와 반지름을 정하고 연직 속도를 계산해 봐요', 5200); }
    updateCtl();
  }
  const mark2 = mark;
  const levels = [
    {
      title: '곡선 흐름: 휘어진 등압선과 합력', short: '곡선 흐름', icon: '🌀', phase: '모형', features: ['curve'],
      intro: '<p class="si-q">❓ 탐구 질문: 지상 일기도의 저기압 중심으로 바람이 왜 반시계로 감으며 안으로 모여들까? 구름은 왜 그곳에 낄까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 ‘전향력과 지균풍’에서</b> 등압선이 직선일 때 압력 경도력과 전향력이 균형을 이루는 지균풍을 배웠어요. <b>진로선택 역학과 에너지</b>에서 배운 <b>구심 가속도 V²/r</b>도 함께 써요.</div>' +
        '<p>등압선이 <b>원</b>처럼 휘어 있으면 바람도 원을 그리며 돌아요. 속력이 일정해도 방향이 계속 바뀌므로 <b>가속도(구심 가속도 V²/r)</b>가 있고, 그래서 두 힘의 <b>합력</b>이 원의 <b>중심</b>을 향해야 해요. (원심력은 쓰지 않아요.) 이렇게 휘어진 등압선을 따라 부는 바람이 <b>경도풍</b>이에요.</p>',
      setup() { resetStep(0); },
      recap: '곡선 등압선에서는 두 힘의 합력이 중심을 향하고 크기가 V²/r이에요. 저기압에서는 압력 경도력이 크고, 고기압에서는 전향력이 커요.',
      summary: '<ul><li>원을 그리며 도는 공기는 속력이 같아도 <b>가속도 V²/r</b>이 있고, 그 방향은 원의 <b>중심</b>이에요. 따라서 <b>합력이 중심을 향해요</b>.</li><li><b>저기압</b>(반시계): 압력 경도력은 안쪽, 전향력은 바깥쪽. <b>압력 경도력 − 전향력 = V²/r</b> (압력 경도력이 더 커요).</li><li><b>고기압</b>(시계): 압력 경도력은 바깥쪽, 전향력은 안쪽. <b>전향력 − 압력 경도력 = V²/r</b> (전향력이 더 커요).</li><li>직선 등압선(r → ∞)에서는 V²/r = 0이라 두 힘이 같아지고 <b>지균풍</b>이 돼요.</li></ul>',
      missions: [
        {
          title: '곡선에서의 힘 방향', manual: true,
          goal: '저기압과 고기압에서 <b>압력 경도력</b>과 <b>전향력</b>이 향하는 쪽(안쪽/바깥쪽)을 모두 골라요.',
          hint: '압력 경도력은 높은 기압에서 낮은 기압 쪽으로 향해요(저기압은 중심이 낮아서 안쪽). 전향력은 움직이는 방향의 오른쪽 직각이에요. 저기압은 반시계, 고기압은 시계 방향으로 돌아요.',
          setup() { selCurve.reset(); setMode('curve'); setCtl(['selCurve']); },
          status: () => mark(selCurve.ok()) + ' 고른 곳 ' + selCurve.count() + ' / 4',
          check() {
            if (!selCurve.complete()) return '4곳을 모두 골라 주세요. (지금 ' + selCurve.count() + '곳)';
            if (!selCurve.ok()) { selCurve.mark(selCurve.wrong()); return '빨간 줄이 달라요. 압력 경도력은 저기압 쪽, 전향력은 움직이는 방향의 오른쪽이에요.'; }
            return true;
          },
          explain: '<b>저기압</b>: 압력 경도력은 안쪽(중심의 저기압 쪽), 반시계로 도는 공기의 오른쪽은 바깥쪽이라 전향력은 바깥쪽이에요. <b>고기압</b>: 압력 경도력은 바깥쪽, 시계로 도는 공기의 오른쪽은 안쪽이라 전향력은 안쪽이에요.',
        },
        {
          type: 'quiz', title: '합력은 어느 쪽?',
          goal: '저기압 주위를 <b>일정한 속력</b>으로 도는 공기 덩어리에 작용하는 <b>합력</b>의 방향과 크기는?',
          setup() { setMode('curve'); setCtl([]); },
          choices: ['원의 중심(안쪽)을 향하고, 크기는 V²/r이에요', '합력은 0이에요. 속력이 일정하니까 가속도가 없어요', '원의 바깥쪽을 향해요. 원심력이 작용하기 때문이에요', '운동 방향(접선 방향)을 향하고, 속력을 점점 빠르게 해요'],
          answer: 0,
          feedback: ['', '속력이 같아도 방향이 계속 바뀌면 가속도가 있어요(구심 가속도 V²/r). 그러니 합력이 0이 아니에요. 화면의 보라 화살표를 봐요.', '이 설명에서는 원심력을 쓰지 않아요. 합력이 중심을 향해야 원을 그리며 돌 수 있어요.', '합력이 운동 방향이면 속력이 변해요. 일정한 속력으로 도는 운동에서는 합력이 속도에 수직(중심 쪽)이에요.'],
          explain: '일정한 속력의 원운동에서 가속도는 <b>중심을 향하고 크기가 V²/r</b>이에요. 그래서 두 힘의 합력도 중심을 향해요. 저기압에서는 압력 경도력이 전향력보다 V²/r만큼 크고, 고기압에서는 전향력이 압력 경도력보다 V²/r만큼 커요.',
        },
      ],
    },
    {
      title: '경도풍: 풍속을 직접 맞춰 봐요', short: '경도풍', icon: '💨', phase: '분석', features: ['grad'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 곡선 등압선에서는 합력이 중심을 향하고 크기가 V²/r이라고 했어요. 이제 같은 압력 경도에서 바람의 <b>세기</b>를 구해 봐요.</div>' +
        '<p>위도 45°에서 <b>지균풍 12 m/s</b>에 해당하는 압력 경도력은 <b>f·V_g = 1.24×10⁻³ m/s²</b>이에요. 이 압력 경도를 가진 곡선 등압선(곡률 반지름 r = 1000 km)에서 풍속 V를 바꿔 가며 <b>합력이 V²/r과 같아지는 값</b>을 찾아요.<br>저기압: <b>PGF − fV = V²/r</b> · 고기압: <b>fV − PGF = V²/r</b></p>',
      setup() { resetStep(1); },
      recap: '같은 압력 경도에서 저기압 경도풍은 지균풍보다 느리고(약 10.9 m/s), 고기압 경도풍은 더 빨라요(약 13.9 m/s).',
      summary: '<ul><li><b>경도풍</b>: 휘어진 등압선을 따라 부는 바람. 저기압은 <b>PGF − fV = V²/r</b>, 고기압은 <b>fV − PGF = V²/r</b>, 직선(r → ∞)이면 지균풍이에요.</li><li>위도 45°(f = 1.03×10⁻⁴ s⁻¹), r = 1000 km, 지균풍 12 m/s에 해당하는 PGF = 1.24×10⁻³ m/s²:</li><li><b>저기압 V ≈ 10.9 m/s</b>(지균풍보다 느려요), <b>고기압 V ≈ 13.9 m/s</b>(지균풍보다 빨라요).</li><li>고기압 중심 부근은 같은 기압 경도를 유지할 수 없어서(균형 풍속이 없어서) 바람이 약해요.</li></ul>',
      missions: [
        {
          title: '저기압의 균형 풍속',
          goal: '<b>저기압</b>(r = 1000 km)에서 실제 합력과 <b>필요한 V²/r</b>이 같아지는 풍속 V를 찾아요.',
          hint: '＋/－ 단추로 V를 바꿔 보라색 화살표와 검은 점선 화살표가 같아지게 해요. 저기압은 지균풍(12.0 m/s)보다 약간 느린 10.9 m/s 근처예요.',
          setup() { setGk('low'); setGr(1000); stpV.set(8, true); S.gV = 8; setMode('grad'); setCtl(['gkSw', 'grSw', 'stpV']); },
          check: () => S.gk === 'low' && S.gr === 1000 && gIsBal(), hold: 0.8,
          status: () => mark(S.gk === 'low' && S.gr === 1000) + ' 저기압 · r 1000 km · ' + mark(S.gk === 'low' && S.gr === 1000 && gIsBal()) + ' V = ' + S.gV.toFixed(1) + ' m/s (균형 ' + V_LOW.toFixed(1) + ' ± 0.2)',
          explain: 'V²/10⁶ + 1.03×10⁻⁴·V = 1.24×10⁻³을 풀면 <b>V ≈ 10.9 m/s</b>예요. 압력 경도력 12.4에서 전향력 11.2를 빼면 1.2(×10⁻⁴)가 남고, 이것이 V²/r과 같아요. 지균풍(12.0 m/s)보다 느려요.',
        },
        {
          title: '고기압의 균형 풍속',
          goal: '<b>고기압</b>(r = 1000 km)에서 합력이 V²/r과 같아지는 풍속 V를 찾아요.',
          hint: '고기압에서는 전향력이 압력 경도력보다 커야 해요. 지균풍(12.0 m/s)보다 빠른 13.9 m/s 근처에서 두 화살표가 같아져요.',
          setup() { setGk('high'); setGr(1000); stpV.set(8, true); S.gV = 8; setMode('grad'); setCtl(['gkSw', 'grSw', 'stpV']); },
          check: () => S.gk === 'high' && S.gr === 1000 && gIsBal(), hold: 0.8,
          status: () => mark(S.gk === 'high' && S.gr === 1000) + ' 고기압 · r 1000 km · ' + mark(S.gk === 'high' && S.gr === 1000 && gIsBal()) + ' V = ' + S.gV.toFixed(1) + ' m/s (균형 ' + V_HIGH.toFixed(1) + ' ± 0.2)',
          explain: 'V²/10⁶ − 1.03×10⁻⁴·V + 1.24×10⁻³ = 0의 작은 해가 <b>V ≈ 13.9 m/s</b>예요. 전향력 14.3에서 압력 경도력 12.4를 빼면 1.9(×10⁻⁴)가 남고, 이것이 V²/r과 같아요. 지균풍(12.0 m/s)보다 빨라요.',
        },
        {
          type: 'quiz', title: '왜 저기압이 더 느릴까?',
          goal: '같은 압력 경도에서 <b>저기압</b>의 경도풍이 <b>고기압</b>보다 느린 까닭은?',
          setup() { setMode('grad'); setCtl(['gkSw', 'grSw', 'stpV']); },
          choices: ['저기압에서는 압력 경도력의 일부가 구심력(안쪽 합력)으로 쓰여 전향력이 맡을 몫이 줄고, 고기압에서는 전향력이 압력 경도력을 이기고 남은 몫이 구심력이 되기 때문이에요', '저기압은 공기 밀도가 작아서 바람이 느려요', '지균풍은 곡선 등압선에도 그대로 적용돼서 풍속이 같아요', '고기압에는 마찰이 없고 저기압에는 마찰이 있기 때문이에요'],
          answer: 0,
          feedback: ['', '이 모형에서 압력 경도력은 같은 값으로 두었어요. 밀도 차이가 아니라 구심 가속도 V²/r이 필요한 점이 원인이에요.', '곡선 등압선에서는 V²/r만큼의 합력이 따로 필요해서 지균풍과 풍속이 달라요. 화면의 두 균형 풍속을 비교해 봐요.', '이 모형은 마찰이 없는 상층 바람이에요. 두 경우의 차이는 힘의 방향(합력이 중심을 향함)에서 나와요.'],
          explain: '저기압: <b>fV = PGF − V²/r</b>이라 전향력이 압력 경도력보다 작아야 하므로 V가 지균풍보다 작아요. 고기압: <b>fV = PGF + V²/r</b>이라 전향력이 더 커야 하므로 V가 지균풍보다 커요. 곡선 등압선에 지균풍 식을 그대로 쓰면 틀려요.',
        },
      ],
    },
    {
      title: '마찰력: 지표 가까이의 바람', short: '마찰력', icon: '🧱', phase: '모형', features: ['fric'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마찰이 없는 상층 바람(지균풍·경도풍)을 다뤘어요. 이번에는 땅이나 바다의 <b>마찰</b>이 있는 지표 가까이(약 1 km 이하, 행성 경계층)의 바람을 알아봐요.</div>' +
        '<p>마찰력은 바람과 <b>반대 방향</b>으로 작용하고 풍속에 비례한다고 단순화해요: <b>F = −kV</b>. 그러면 <b>압력 경도력 + 전향력 + 마찰력 = 0</b>의 세 힘이 삼각형으로 닫혀요. 그 결과 바람은 등압선에서 저기압 쪽으로 <b>α</b>만큼 기울고(tanα = k/f), 풍속은 <b>V = V_g cosα</b>로 줄어요.</p>',
      setup() { resetStep(2); },
      recap: '마찰이 있으면 세 힘이 삼각형을 이루고, 바람은 등압선에서 저기압 쪽으로 기울며 느려져요. 마찰이 클수록(k/f가 클수록) α가 커요.',
      summary: '<ul><li>마찰력은 바람과 반대 방향, 크기 <b>kV</b>. 세 힘의 합 = 0: <b>압력 경도력 = f·V_g</b>, 전향력 <b>fV</b>, 마찰력 <b>kV</b>가 삼각형으로 닫혀요.</li><li><b>tanα = k/f</b>, <b>V = V_g cosα</b>. 바람은 등압선에서 <b>저기압 쪽으로 α</b> 기울어 불어요.</li><li>해상 k/f = 0.27 → α ≈ 15°, V ≈ 0.97 V_g(11.6 m/s) · 육지 0.58 → 30°, 0.87 V_g(10.4 m/s) · 숲·도시 1.0 → 45°, 0.71 V_g(8.5 m/s). (V_g = 12 m/s, 단순 모형)</li><li>마찰층은 약 1 km 두께예요. 그 위의 바람은 마찰이 작아 지균풍에 가까워요.</li></ul>',
      missions: [
        {
          title: '육지의 풍향: 30° 기울기',
          goal: '마찰 크기 <b>k/f</b>를 조절해서(또는 <b>육지</b>를 눌러) 바람이 등압선에서 <b>30°</b> 기울어지게 해요.',
          hint: 'tanα = k/f이니까 α = 30°이면 k/f = tan30° ≈ 0.58이에요. ‘육지’ 단추를 누르거나 슬라이더를 0.58 근처(0.56~0.60)로 맞춰요.',
          setup() { setKf(0); setMode('fric'); setCtl(['surfSw', 'sKf']); },
          check: () => Math.abs(angOf(S.kf) - 30) <= 1.0 + 1e-9, hold: 0.8,
          status: () => mark(Math.abs(angOf(S.kf) - 30) <= 1.0 + 1e-9) + ' k/f = ' + S.kf.toFixed(2) + ' → α = ' + angOf(S.kf).toFixed(0) + '° (목표 30° ± 1°)',
          explain: 'tanα = k/f에서 α = 30°이면 <b>k/f = tan30° ≈ 0.58</b>이에요. 이때 V = V_g cos30° ≈ 0.87 V_g = 10.4 m/s로, 상층(12.0 m/s)보다 느려져요.',
        },
        {
          title: '지표와 각도 짝짓기', manual: true,
          goal: '<b>마찰이 클수록 α가 커요.</b> 해상·육지·숲·도시를 알맞은 풍향 각도(15°·30°·45°)와 짝지어요.',
          hint: '왼쪽 항목을 누르고 오른쪽 각도를 눌러 이어요. k/f = 0.27, 0.58, 1.0일 때 α = tan⁻¹(k/f)를 확인해 봐요(표에도 있어요).',
          setup() { pairFric.reset(); setMode('fric'); setCtl(['surfSw', 'pairFric']); },
          status: () => mark(pairFric.ok()) + ' 짝지은 것 ' + pairFric.count() + ' / 3',
          check() {
            if (!pairFric.complete()) return '3쌍을 모두 이어 주세요. (지금 ' + pairFric.count() + '쌍)';
            if (!pairFric.ok()) { pairFric.mark(pairFric.wrong()); return '빨간 짝이 달라요. 마찰(k/f)이 클수록 각도 α가 커져요.'; }
            return true;
          },
          explain: 'α = tan⁻¹(k/f): 해상 0.27 → <b>15°</b>, 육지 0.58 → <b>30°</b>, 숲·도시 1.0 → <b>45°</b>예요. 마찰이 클수록 바람이 저기압 쪽으로 더 많이 기울고 더 느려져요(V = 0.97, 0.87, 0.71 V_g).',
        },
        {
          type: 'quiz', title: '마찰이 있으면 바람이 어떻게 달라질까?',
          goal: '마찰이 있으면 풍속이 <b>줄고</b> 바람이 <b>저기압 쪽으로 기우는</b> 까닭은?',
          setup() { setMode('fric'); setCtl(['surfSw', 'sKf']); },
          choices: ['마찰력이 바람과 반대로 작용해 풍속이 줄고, 전향력이 줄어든 만큼 압력 경도력이 바람을 저기압 쪽으로 끌어서(세 힘이 삼각형으로 닫혀서) 비스듬히 불어요', '마찰이 전향력을 없애서 바람이 압력 경도력 방향으로만 불어요', '마찰이 압력 경도력을 키워서 바람이 빨라져요', '지표에서는 바람이 고기압 쪽으로 기울어요'],
          answer: 0,
          feedback: ['', '마찰은 전향력을 없애지 않아요. 풍속이 줄어서 전향력(fV)이 작아질 뿐이에요. 화면의 전향력 화살표가 짧아져요.', '마찰은 바람을 느리게 해요. 압력 경도력은 기압 분포가 정해요.', '바람은 저기압 쪽으로 기울어요. 그래서 지상 저기압으로 바람이 들어와 모여요.'],
          explain: '마찰력(−kV)이 바람을 늦추면 전향력 fV도 작아져 압력 경도력을 다 막지 못해요. 압력 경도력의 일부를 마찰이 맡고 나머지를 전향력이 맡아 세 힘이 닫히면서, 바람은 등압선에서 <b>저기압 쪽으로 α</b> 기울고 <b>V = V_g cosα</b>로 느려져요. 그래서 지상 풍속은 상층보다 작아요.',
        },
      ],
    },
    {
      title: '지상풍: 수렴과 발산, 연직 운동', short: '지상풍', icon: '🗺️', phase: '분석', features: ['sfc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마찰 때문에 지상 바람이 등압선에서 저기압 쪽으로 α만큼 기운다는 것을 봤어요. 이 기울어진 바람이 일기도 전체에서는 어떤 모양이 될까요?</div>' +
        '<p>저기압에서는 바람이 <b>반시계로 돌며 중심으로 모여</b>(수렴) 위로 올라가고, 고기압에서는 <b>시계로 돌며 바깥으로 퍼져</b>(발산) 위에서 내려와요. 마찰층 두께 h = 1 km, 반지름 r에서 안쪽으로 들어오는 바람 u가 모두 위로 올라가면 <b>w = 2hu/r</b>이에요. (지상 풍속은 10 m/s로 놓고, 안쪽 성분은 u = V sinα예요.)</p>',
      setup() { resetStep(3); },
      recap: '지상 저기압은 수렴·상승(구름·비), 고기압은 발산·하강(맑음)이에요. r = 500 km, u = 5 m/s, h = 1 km이면 w = 0.02 m/s(2 cm/s)예요.',
      summary: '<ul><li>지상 <b>저기압</b>: 반시계 방향 + <b>안쪽</b>(수렴) → <b>상승 기류</b> → 단열 팽창·냉각 → <b>구름·비</b>. 지상 <b>고기압</b>: 시계 방향 + <b>바깥쪽</b>(발산) → <b>하강 기류</b> → 단열 압축 → <b>맑음</b>. 고기압에서도 바람은 불어요.</li><li>안쪽 성분 <b>u = V sinα</b>. V = 10 m/s, α = 30°이면 u = 5 m/s.</li><li><b>w = 2hu/r</b>: r = 500 km, u = 5 m/s, h = 1 km → 2 × 1000 m × 5 m/s ÷ (5×10⁵ m) = <b>0.02 m/s (2 cm/s)</b>. 앞 차시 ‘정역학 균형과 연직 운동’에서 본 연직 속도와 같은 크기예요.</li><li>상층(마찰층 위)에서는 마찰이 작아 등압선과 나란히 불어요(지균풍·경도풍).</li></ul>',
      missions: [
        {
          title: '수렴으로 생기는 상승 속도',
          goal: '지표를 <b>육지</b>(α = 30°), 반지름을 <b>500 km</b>로 두고, 연직 속도 <b>w = 2hu/r</b>를 <b>cm/s</b> 단위로 계산해 입력해요. (V = 10 m/s, h = 1 km)',
          hint: 'u = 10 × sin30° = 5 m/s예요. w = 2 × 1000 m × 5 m/s ÷ (5×10⁵ m) = 0.02 m/s = 2 cm/s예요. 2.0을 입력해요.',
          setup() { setSurf('sea'); setRs(250); numW.reset(); S.showW = false; S.showWind = true; syncShow(); S.spotsOn = false; setMode('sfc'); setCtl(['surfSw2', 'rSw', 'numW']); },
          check: () => S.surfS === 'land' && S.rS === 500 && numW.near(2.0, 0.1), hold: 0.8,
          status: () => mark(S.surfS === 'land') + ' 육지 α = 30° · ' + mark(S.rS === 500) + ' r = ' + S.rS + ' km (목표 500 km) · ' + mark(S.surfS === 'land' && S.rS === 500 && numW.near(2.0, 0.1)) + ' 입력 ' + (numW.has() ? numW.value + ' cm/s' : '—'),
          explain: 'u = V sinα = 10 × sin30° = <b>5 m/s</b>, w = 2hu/r = 2 × 1000 × 5 ÷ 5×10⁵ = <b>0.02 m/s = 2 cm/s</b>예요. 작아 보여도 하루(86400 s) 동안 약 1.7 km나 올라가는 속도라서 구름을 만들 수 있어요.',
        },
        {
          title: '일기도 6곳의 바람 방향', manual: true,
          goal: '지상 일기도(육지, α = 30°)의 <b>A~F</b> 여섯 곳에서 바람이 <b>불어가는 쪽</b>을 골라요. (저기압은 반시계 + 안쪽, 고기압은 시계 + 바깥쪽)',
          hint: '‘바람 화살표 보기’를 눌러 확인하면서 규칙을 찾아봐요. 예: 저기압의 동쪽 지점은 북쪽으로 돌면서 안쪽(서쪽)으로 들어와서 북서쪽이에요.',
          setup() { setSurf('land'); setRs(500); S.showW = true; S.showWind = false; syncShow(); S.spotsOn = true; selSpots.reset(); setMode('sfc'); setCtl(['bShow', 'selSpots']); },
          status: () => mark(selSpots.ok()) + ' 고른 곳 ' + selSpots.count() + ' / 6',
          check() {
            if (!selSpots.complete()) return '6곳을 모두 골라 주세요. (지금 ' + selSpots.count() + '곳)';
            if (!selSpots.ok()) { selSpots.mark(selSpots.wrong()); return '빨간 줄이 달라요. 저기압은 반시계 방향으로 돌며 안쪽으로, 고기압은 시계 방향으로 돌며 바깥쪽으로 불어요.'; }
            return true;
          },
          explain: '저기압(반시계 + 안쪽)과 고기압(시계 + 바깥쪽)에서 바람은 등압선(원)의 접선 방향에서 <b>30°</b> 기울어 있어요. 예를 들어 저기압의 동쪽(A)은 북서쪽으로, 고기압의 북동쪽(D)은 동쪽으로 불어요.',
        },
        {
          type: 'quiz', title: '저기압은 구름, 고기압은 맑음',
          goal: '지상 저기압에서는 <b>구름·비</b>가 생기고 고기압에서는 <b>맑은</b> 까닭은?',
          setup() { S.showWind = true; syncShow(); S.spotsOn = false; setMode('sfc'); setCtl(['surfSw2', 'rSw']); },
          choices: ['저기압은 바람이 모여(수렴) 상승하며 단열 팽창으로 식어 구름이 생기고, 고기압은 바람이 퍼져(발산) 하강하며 단열 압축으로 데워져 구름이 사라져요. 고기압에서도 바람은 불어요', '고기압에서는 바람이 불지 않아서 구름이 만들어지지 않아요', '저기압에서는 바람이 중심에서 바깥으로 불어 나가서 공기가 위로 올라가요', '저기압은 기온이 높아서 구름이 생기고 고기압은 기온이 낮아서 맑아요'],
          answer: 0,
          feedback: ['', '고기압에서도 바람은 불어요(시계 방향, 바깥쪽 성분). 중심 부근에서만 약할 뿐이에요. 화면의 입자가 바깥으로 흘러요.', '저기압에서는 바람이 중심으로 모여 들어오고(수렴), 모인 공기가 위로 올라가요.', '기온 차이가 원인이 아니에요. 연직 운동과 단열 변화가 핵심이에요(앞서 배운 단열 팽창).'],
          explain: '지상 마찰 때문에 저기압 중심으로 바람이 <b>수렴</b> → 공기가 <b>상승</b> → 단열 팽창으로 냉각되어 <b>구름·비</b>. 고기압은 <b>발산</b> → 위의 공기가 <b>하강</b> → 단열 압축으로 가열되어 구름이 사라져 <b>맑아요</b>.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-gradient-wind', mount: '#game', badge: '경도풍 박사', homeHref: '../../index.html#hs',
    featureLabels: { curve: '🌀 곡선 흐름 · 힘 화살표', grad: '💨 경도풍 풍속 맞추기', fric: '🧱 마찰력 · 세 힘의 삼각형', sfc: '🗺️ 지상 일기도 · 연직 단면' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'curve') readCurve();
    else if (S.mode === 'grad') readGrad();
    else if (S.mode === 'fric') readFric();
    else readSfc();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'curve') drawCurve(t, dt);
    else if (S.mode === 'grad') drawGrad(t, dt);
    else if (S.mode === 'fric') drawFric(t, dt);
    else drawSfc(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, stpV, numW, selCurve, pairFric, selSpots, ansSpots, V_LOW, V_HIGH, gTarget, vLow, vHigh, windDir, compassOf, compassMargin,
    get game() { return game; }, setMode, resetStep, updateCtl, setGk, setGr, setKf, setSurf, setRs, syncShow,
  };
})();
