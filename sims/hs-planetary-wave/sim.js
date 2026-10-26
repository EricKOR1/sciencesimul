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
     500 hPa 상층 일기도(예시) 공통: 등고선 · 골과 능 · 한반도
     ====================================================== */
  const KMW = 7650, KMH = 3330;                      // 지도 크기(km): 약 70°E~160°E, 30°N~60°N
  const WV = { Z0: 5760, A: 150, g0: 0.24, eps: 0.25, L: 5700, xr0: 6195, xk: 4845, yk: 777 };
  const KW = TAU / WV.L, F40 = fOf(40);
  const xtOf = (day) => WV.xr0 - WV.L / 2 + 864 * (day || 0);        // 골 축의 위치(km), 하루에 864 km (10 m/s) 동진
  const glOf = (x, xt) => WV.g0 * (1 + WV.eps * Math.cos(KW * (x - xt)));
  const contY = (c, x, xt) => (WV.Z0 - WV.A * Math.cos(KW * (x - xt)) - c) / glOf(x, xt);
  const zOf = (x, y, xt) => WV.Z0 - glOf(x, xt) * y - WV.A * Math.cos(KW * (x - xt));
  /* 고도 경도 |∇z| (m/km)와 지균풍 (m/s), 등고선 간격 60 m당 거리(km) */
  function gradZ(x, y, xt) {
    const s = Math.sin(KW * (x - xt)), dzx = WV.g0 * WV.eps * KW * s * y + WV.A * KW * s, dzy = -glOf(x, xt);
    return Math.hypot(dzx, dzy);
  }
  const vgeo = (x, y, xt) => ((9.8 / F40) * gradZ(x, y, xt)) / 1000;
  const spac60 = (x, y, xt) => 60 / gradZ(x, y, xt);
  const FULLV = { x0: 0, x1: KMW, y0: 0, y1: KMH };
  function mapXY(M, v) {
    v = v || FULLV; const sx = M.w / (v.x1 - v.x0), sy = M.h / (v.y1 - v.y0);
    return { X: (x) => M.x + (x - v.x0) * sx, Y: (y) => M.y + M.h - (y - v.y0) * sy, ix: (px) => v.x0 + (px - M.x) / sx, iy: (py) => v.y0 + (M.y + M.h - py) / sy };
  }
  /* 지도 한 장 그리기. o: { xt, zones(발산·수렴), jet } */
  function drawUpperMap(M, xt, o) {
    o = o || {};
    const v = o.view || FULLV, { X, Y } = mapXY(M, v), vw = v.x1 - v.x0;
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); gr.addColorStop(0, '#e0f2fe'); gr.addColorStop(1, '#fef3c7'); ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    // 위·경도 격자
    ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    for (let i = 0; i <= 3; i++) { const yk = (i * KMH) / 3; if (yk < v.y0 || yk > v.y1) continue; const y = Y(yk); ctx.beginPath(); ctx.moveTo(M.x, y); ctx.lineTo(M.x + M.w, y); ctx.stroke(); }
    for (let lon = 80; lon <= 150; lon += 10) { const xk = (lon - 70) * 85; if (xk < v.x0 || xk > v.x1) continue; const x = X(xk); ctx.beginPath(); ctx.moveTo(x, M.y); ctx.lineTo(x, M.y + M.h); ctx.stroke(); }
    ctx.setLineDash([]);
    // 한랭(5400 m 아래)과 온난(5700 m 위) 구역
    const stepPx = 4, nx = Math.ceil(M.w / stepPx), xAt = (i) => v.x0 + (i / nx) * vw;
    const band = (c, upper, col) => {
      ctx.beginPath();
      for (let i = 0; i <= nx; i++) { const x = xAt(i), y = clamp(contY(c, x, xt), v.y0 - 200, v.y1 + 200); const px = X(x), py = Y(y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.lineTo(M.x + M.w, upper ? M.y - 20 : M.y + M.h + 20); ctx.lineTo(M.x, upper ? M.y - 20 : M.y + M.h + 20); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    band(5400, true, 'rgba(59,130,246,.20)'); band(5700, false, 'rgba(244,114,60,.20)');
    // 발산·수렴 구역 (골의 동쪽은 발산, 서쪽은 수렴)
    if (o.zones) {
      const zs = o.zones;
      for (let m = -3; m <= 3; m++) {
        const x0 = xt + m * WV.L;       // 골
        [[x0, x0 + WV.L / 2, 'D'], [x0 + WV.L / 2, x0 + WV.L, 'C']].forEach(([xa, xb, kind]) => {
          const a = clamp(xa, v.x0, v.x1), b = clamp(xb, v.x0, v.x1); if (b - a < 20) return;
          ctx.fillStyle = kind === 'D' ? 'rgba(249,115,22,' + (0.24 * zs.a) + ')' : 'rgba(34,197,94,' + (0.24 * zs.a) + ')';
          ctx.fillRect(X(a), M.y, X(b) - X(a), M.h);
        });
      }
    }
    // 등고선 (60 m 간격)
    for (let c = 5280; c <= 5880; c += 60) {
      const major = c % 120 === 0, jet = c === 5520;
      ctx.beginPath(); let started = false;
      for (let i = 0; i <= nx; i++) { const x = xAt(i), y = contY(c, x, xt); if (y < v.y0 - 600 || y > v.y1 + 600) { started = false; continue; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; }
      ctx.strokeStyle = jet && o.jet ? 'rgba(234,88,12,.95)' : major ? '#1e293b' : 'rgba(30,41,59,.55)'; ctx.lineWidth = jet && o.jet ? 4 : major ? 2 : 1.2; ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    // 등고선 숫자 (왼쪽 가장자리, 큰 선만)
    [5400, 5520, 5640, 5760].forEach((c) => { const y = contY(c, v.x0 + 40, xt); if (y > v.y0 + 60 && y < v.y1 - 60) D.text(M.x + 6, Y(y) - 3, String(c), { size: 11.5, weight: 800, color: '#1e293b', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); });
    // 위·경도 이름
    ['30°N', '40°N', '50°N', '60°N'].forEach((t, i) => { const yk = (i * KMH) / 3; if (yk < v.y0 + 150 || yk > v.y1 - 100) return; D.text(M.x + M.w - 5, Y(yk) - 4, t, { size: 11, weight: 700, color: '#64748b', align: 'right' }); });
    [80, 100, 120, 140].forEach((lon) => { const xk = (lon - 70) * 85; if (xk < v.x0 + 100 || xk > v.x1 - 100) return; D.text(X(xk), M.y + M.h - 5, lon + '°E', { size: 11, weight: 700, color: '#64748b' }); });
    // 한반도
    if (WV.xk > v.x0 && WV.xk < v.x1 && WV.yk > v.y0 && WV.yk < v.y1) { const kx = X(WV.xk), ky = Y(WV.yk); D.glow(kx, ky, 22, '#fde68a', 0.7); D.sphere(kx, ky, 7, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 2 }); D.label(kx + 12, ky + 14, '한반도', { bg: '#92400e', size: 11.5, pad: 6, align: 'left' }); }
    return { X, Y };
  }

  /* 위성 영상 (대체 활동): 골 앞쪽(동쪽)에 구름이 많고 뒤쪽은 맑아요 */
  const cloudRnd = seeded(7);
  const CL = []; for (let i = 0; i < 900; i++) CL.push([cloudRnd(), cloudRnd(), cloudRnd()]);
  function drawSat(M, xt, mp) {
    const { X, Y } = mp;
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); gr.addColorStop(0, '#1e293b'); gr.addColorStop(1, '#334155'); ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    CL.forEach(([a, b, c]) => {
      const x = a * KMW, y = b * KMH, ph = Math.sin(KW * (x - xt)), dens = clamp(ph * 1.15, 0, 1) * (0.5 + 0.5 * c) * clamp(1.2 - Math.abs(y - (1500 + 500 * Math.cos(KW * (x - xt)))) / 1300, 0, 1);
      if (dens < 0.08) return;
      ctx.globalAlpha = clamp(dens * 0.75, 0, 0.7); ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(X(x), Y(y), 4 + 10 * c * M.w / 760, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 구름대 머리 쪽(골 앞쪽)과 지상 저기압
    const lx = xt + 1000, ly = 1750;
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    D.text(X(lx), Y(ly) + 6, 'L', { size: 22, weight: 900, color: '#93c5fd', stroke: 'rgba(15,23,42,.8)', strokeWidth: 4 });
    // 전선 기호: 한랭 전선(파랑), 온난 전선(빨강)
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    ctx.lineWidth = 3; ctx.strokeStyle = '#60a5fa'; ctx.beginPath(); ctx.moveTo(X(lx - 40), Y(ly - 80)); ctx.quadraticCurveTo(X(lx - 250), Y(ly - 600), X(lx - 520), Y(ly - 1050)); ctx.stroke();
    ctx.strokeStyle = '#f87171'; ctx.beginPath(); ctx.moveTo(X(lx + 40), Y(ly - 40)); ctx.quadraticCurveTo(X(lx + 600), Y(ly - 80), X(lx + 1000), Y(ly + 200)); ctx.stroke();
    ctx.restore();
    const kx = X(WV.xk), ky = Y(WV.yk); D.glow(kx, ky, 22, '#fde68a', 0.7); D.sphere(kx, ky, 7, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 2 }); D.label(kx + 12, ky + 14, '한반도', { bg: '#92400e', size: 11.5, pad: 6, align: 'left' });
    D.label(M.x + 8, M.y + 16, '🛰️ 적외 위성 영상 + 지상 일기도 (예시)', { bg: 'rgba(15,23,42,.85)', size: 12, pad: 7, align: 'left' });
    D.text(M.x + M.w - 8, M.y + M.h - 8, '구름이 많은 쪽(골 앞쪽)이 동쪽으로 움직여요', { size: 11.5, weight: 800, color: '#e2e8f0', align: 'right', stroke: 'rgba(15,23,42,.8)', strokeWidth: 3 });
  }

  /* ======================================================
     행성파와 편서풍 파동 (제트류 → 행성파 → 편서풍 파동 → 상층 일기도)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 900, 1.22);
  let game = null;
  const COLS = PHONE ? 2 : 1;
  const A_EARTH = 6.371e6;
  const BETA = (2 * OMEGA * Math.cos(45 * DEG)) / A_EARTH;       // 45°N: 1.62×10⁻¹¹ m⁻¹s⁻¹
  const cPhase = (U, Lkm) => U - BETA / Math.pow(TAU / (Lkm * 1000), 2);
  const lsOf = (U) => (TAU * Math.sqrt(U / BETA)) / 1000;       // 정체파 파장 (km)
  const UJ = (G) => 38.7 * G;                                    // 기온 경도 G (K/100 km) → 제트 최대 풍속 (m/s)
  const CIRC45 = TAU * 6371 * Math.cos(45 * DEG);                // 위도 45° 둘레 ≈ 28 306 km
  const lamN = (n) => Math.round(CIRC45 / n / 100) * 100;        // 파동 수 n의 파장(100 km 단위 반올림)
  const TSR = 86400;                                             // 행성파 · 파동 장면: 화면 1초 = 1일

  function rcOf(mode) {
    if (mode === 'jet') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 430 }, B: { x: 8, y: 446, w: 504, h: 446 } }, { A: { x: 12, y: 12, w: 776, h: 372 }, B: { x: 12, y: 392, w: 776, h: 156 } });
    if (mode === 'rossby') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 360 }, B: { x: 8, y: 376, w: 504, h: 516 } }, { A: { x: 12, y: 12, w: 776, h: 308 }, B: { x: 12, y: 328, w: 776, h: 220 } });
    if (mode === 'wave') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 520 }, B: { x: 8, y: 536, w: 504, h: 356 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 270 }, B: { x: 8, y: 286, w: 504, h: 606 } }, { A: { x: 12, y: 12, w: 776, h: 372 }, B: { x: 12, y: 392, w: 776, h: 156 } });
  }

  const S = {
    mode: 'jet', fade: 0, clock: 0,
    // 1. 제트류
    G: 1.0, GV: 1.0, uV: 38.7, season: null, jt: 0,
    // 2. 행성파
    U: 25, Lk: 8000, xoff: 0, px: 0, spin: 0, showLs: false, cV: 0,
    // 3. 편서풍 파동
    n: 5, nV: 5, amp: 9, ampV: 9, th: 0, view: 'wave', showLam: false, cyl: 0, jp: [],
    // 4. 상층 일기도
    day: 0, dayV: 0, marks: { trough: null, ridge: null }, pick: 'trough', mview: 'map', probe: null, showDist: false, flowing: false,
  };

  /* ======================================================
     장면 1: 제트류 — 위도–높이 단면
     ====================================================== */
  const tropo = (lat) => 8 + 8 * 0.5 * (1 + Math.cos(Math.PI * clamp((lat - 25) / 50, 0, 1)));   // 대류권계면 높이 (km)
  const jetU = (lat, z, Um) => Um * Math.exp(-Math.pow((lat - 45) / 13, 2)) * Math.exp(-Math.pow((z - 10.2) / 3.4, 2));
  function drawJet(t, dt) {
    const { A, B } = rcOf('jet');
    S.GV = approach(S.GV, S.G, dt, 7); S.uV = approach(S.uV, UJ(S.G), dt, 7); S.jt += dt;
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, '🌐 북반구 위도–높이 단면 (예시): 서풍이 부는 제트류', { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    const J = { x: A.x + 46, y: A.y + 40, w: A.w - 62, h: A.h - 40 - 48 * FS };
    const LX = (lat) => J.x + (lat / 90) * J.w, ZY = (z) => J.y + J.h - (z / 16) * J.h;
    ctx.save(); rr(J.x, J.y, J.w, J.h, 8).clip();
    const sk = ctx.createLinearGradient(0, J.y, 0, J.y + J.h); sk.addColorStop(0, '#e2e8f0'); sk.addColorStop(1, '#f8fafc'); ctx.fillStyle = sk; ctx.fillRect(J.x, J.y, J.w, J.h);
    // 대류권: 남쪽은 따뜻(빨강), 북쪽은 차갑게(파랑). 경도가 클수록 색 차이가 커요.
    const cs = ctx.createLinearGradient(J.x, 0, J.x + J.w, 0);
    const kk = clamp((S.GV - 0.5) / 1.0, 0, 1);
    cs.addColorStop(0, mixc('#fda4af', '#f87171', kk)); cs.addColorStop(0.5, '#fef3c7'); cs.addColorStop(1, mixc('#bae6fd', '#38bdf8', kk));
    ctx.fillStyle = cs; ctx.beginPath(); ctx.moveTo(J.x, J.y + J.h);
    for (let la = 0; la <= 90; la += 3) ctx.lineTo(LX(la), ZY(tropo(la)));
    ctx.lineTo(J.x + J.w, J.y + J.h); ctx.closePath(); ctx.fill();
    // 등온선(기울어진 선)
    ctx.strokeStyle = 'rgba(30,41,59,.28)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
    for (let i = 0; i < 6; i++) { const la0 = 12 + i * 15; ctx.beginPath(); ctx.moveTo(LX(la0 - 8), ZY(0)); ctx.lineTo(LX(la0 + 4), ZY(tropo(la0 + 4))); ctx.stroke(); }
    ctx.setLineDash([]);
    // 서풍 (풍속에 따라 색이 번져요)
    const gs = 6;
    for (let px = J.x; px < J.x + J.w; px += gs) for (let py = J.y; py < J.y + J.h; py += gs) {
      const lat = ((px + gs / 2 - J.x) / J.w) * 90, z = ((J.y + J.h - (py + gs / 2)) / J.h) * 16, u = jetU(lat, z, S.uV);
      if (u < 4) continue; ctx.fillStyle = 'rgba(124,58,237,' + clamp(u / 70, 0, 0.78).toFixed(3) + ')'; ctx.fillRect(px, py, gs, gs);
    }
    // 서풍 기호 ⊙ (풍속에 비례)
    for (let la = 15; la <= 80; la += 7.5) for (let z = 4; z <= 14; z += 2.5) { const u = jetU(la, z, S.uV); if (u < 8) continue; const r = 2 + (u / 60) * 5.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(LX(la), ZY(z), r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(LX(la), ZY(z), 1.3 + 0.9 * Math.sin(S.jt * 3 + la), 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(J.x, J.y, J.w, J.h, 8).stroke();
    // 대류권계면
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath(); for (let la = 0; la <= 90; la += 3) { const x = LX(la), y = ZY(tropo(la)); la ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    D.text(LX(5), ZY(16) + 16, '성층권', { size: 12, weight: 800, color: '#475569', align: 'left' });
    D.text(LX(84), ZY(tropo(84)) - 5, '대류권계면', { size: 11.5, weight: 800, color: '#334155', align: 'right' });
    // 축
    [0, 30, 60, 90].forEach((la) => D.text(LX(la), J.y + J.h + 16 * FS, la + '°N', { size: 12, weight: 700, color: '#64748b' }));
    [0, 5, 10, 15].forEach((z) => D.text(J.x - 6, ZY(z) + 4, z + ' km', { size: 11.5, weight: 700, color: '#64748b', align: 'right' }));
    D.text(J.x + J.w / 2, J.y + J.h + 34 * FS, '남쪽(따뜻) ← 위도 → 북쪽(차가움) · ⊙ = 서풍(서→동)', { size: 12, weight: 700, color: '#475569' });
    // 제트 중심 이름표
    { const cxp = LX(45), cyp = ZY(10.2); D.ring(cxp, cyp, 16 + 4 * Math.sin(S.jt * 2), t, { color: '#7c3aed', speed: 0.6, width: 2 }); D.label(cxp + 24, cyp - 4, '제트 중심 ' + Math.round(S.uV) + ' m/s', { bg: '#6d28d9', size: 13, pad: 8, align: 'left' }); }
    // 남북 기온 차 괄호 (30°N ~ 60°N)
    { const x1 = LX(30), x2 = LX(60), yb = J.y + J.h - 40 * FS; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, yb - 6); ctx.lineTo(x1, yb); ctx.lineTo(x2, yb); ctx.lineTo(x2, yb - 6); ctx.stroke();
      D.label((x1 + x2) / 2, yb - 14, '30°N~60°N 기온 차 약 ' + Math.round(S.GV * 33.3) + ' K (' + fix(S.GV, 1) + ' K/100 km)', { bg: '#0f172a', size: 12, pad: 7 }); }
    // ----- B
    card(B, null);
    const horiz = B.w > 600;
    const x0 = B.x + 16;
    const yh = para(x0, B.y + 26 * FS, B.w - 32, '남북 기온 경도 G = ' + fix(S.G, 1) + ' K/100 km → 제트 최대 풍속 약 ' + Math.round(UJ(S.G)) + ' m/s', 14.5, '#6d28d9', 900);
    const bw = B.w - 32, by = yh + 8 * FS;
    ctx.fillStyle = '#e2e8f0'; rr(x0, by, bw, 18, 9).fill();
    const gg = ctx.createLinearGradient(x0, 0, x0 + bw, 0); gg.addColorStop(0, '#c4b5fd'); gg.addColorStop(1, '#6d28d9'); ctx.fillStyle = gg; rr(x0, by, Math.max(10, bw * clamp(S.uV / 60, 0, 1)), 18, 9).fill();
    [0, 20, 40, 60].forEach((v) => D.text(x0 + (bw * v) / 60, by + 34, v + (v === 60 ? ' m/s' : ''), { size: 11.5, weight: 700, color: '#64748b', align: v === 60 ? 'right' : 'center' }));
    const y2 = by + 56 * FS;
    let y = para(x0, y2, B.w - 32, '정역학 균형 + 지균풍: 남북 기온 차가 크면 위로 갈수록 서풍이 세져서, 대류권계면 부근(약 10 km)에 제트가 생겨요. (예: G = 0.5 → 약 19, 1.0 → 약 39, 1.5 → 약 58 m/s)', 12.5, '#475569', 700);
    if (!PHONE) para(x0, y + 6, B.w - 32, '겨울에는 남북 기온 차가 커서 제트가 세고, 여름에는 약해요. 극전선 제트는 위도 40~60°, 아열대 제트는 약 30°에서 불어요.', 12.5, '#475569', 700);
    else para(x0, y + 6, B.w - 32, '겨울에는 남북 기온 차가 커서 제트가 세고 여름에는 약해요. 극전선 제트는 위도 40~60°, 아열대 제트는 약 30°에 있어요.', 12.5, '#475569', 700);
  }
  function readJet() { setReadouts(['기온 경도 G', fix(S.G, 1) + ' K/100 km', '제트 최대 풍속', Math.round(UJ(S.G)) + ' m/s', '계절', S.season === 'w' ? '겨울형' : S.season === 's' ? '여름형' : '직접 조절']); }

  /* ======================================================
     장면 2: 행성파 — β 효과와 위상속도
     ====================================================== */
  const rsGeom = () => {
    const A = rcOf('rossby').A, M = { x: A.x + 12, y: A.y + 38, w: A.w - 24, h: A.h - 38 - 58 * FS };
    return { A, M, pxkm: M.w / 14000 };
  };
  function rossbyStep(dt) {
    const g = rsGeom(), c = cPhase(S.U, S.Lk);
    S.cV = approach(S.cV, c, dt, 8);
    S.xoff += (c * TSR / 1000) * g.pxkm * dt;                        // 파의 무늬가 움직인 거리(px)
    S.px = (S.px + ((S.U * TSR) / 1000) * g.pxkm * dt) % g.M.w;     // 공기 덩어리는 서풍을 타고 동쪽으로
  }
  function drawRossby(t, dt) {
    const { A, B } = rcOf('rossby'), g = rsGeom(), { M, pxkm } = g;
    rossbyStep(dt);
    card(A, null);
    const c = cPhase(S.U, S.Lk), lamPx = S.Lk * pxkm, kpx = TAU / lamPx, yc = M.y + M.h / 2, Ay = M.h * 0.3;
    D.text(A.x + 14, A.y + 24 * FS, '🌊 β 평면의 행성파 (위도 45° 부근, 북반구) · 화면 1초 = 1일', { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    const gr = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); gr.addColorStop(0, '#dbeafe'); gr.addColorStop(0.5, '#f8fafc'); gr.addColorStop(1, '#fee2e2'); ctx.fillStyle = gr; ctx.fillRect(M.x, M.y, M.w, M.h);
    // 위도에 따른 f (북쪽일수록 커요)
    ctx.strokeStyle = 'rgba(100,116,139,.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(M.x, yc); ctx.lineTo(M.x + M.w, yc); ctx.stroke(); ctx.setLineDash([]);
    // 파동 흐름선: 능(북쪽 정점)과 골(남쪽 정점)
    const wy = (x) => yc - Ay * Math.sin(kpx * (x - M.x - S.xoff));
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = M.x; x <= M.x + M.w; x += 3) { const y = wy(x); x === M.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(37,99,235,.28)'; ctx.lineWidth = 12; ctx.beginPath();
    for (let x = M.x; x <= M.x + M.w; x += 3) { const y = wy(x); x === M.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // 능·골 표시 (처음 만나는 것들)
    for (let m = -3; m <= 6; m++) {
      const xr = M.x + S.xoff + lamPx * (0.25 + m), xtr = M.x + S.xoff + lamPx * (0.75 + m);
      const xr2 = ((xr - M.x) % (lamPx * 40) + lamPx * 40) % (lamPx * 40) + M.x;
      if (xr >= M.x + 14 && xr <= M.x + M.w - 14) D.label(xr, yc - Ay - 16, '능', { bg: '#dc2626', size: 12, pad: 7 });
      if (xtr >= M.x + 14 && xtr <= M.x + M.w - 14) D.label(xtr, yc + Ay + 16, '골', { bg: '#2563eb', size: 12, pad: 7 });
    }
    // 공기 덩어리와 회전(와도)
    const ppx = M.x + S.px, ppy = wy(ppx), zn = (yc - ppy) / Ay;           // 북쪽이면 +
    S.spin += 4.2 * zn * dt * (RM ? 0 : 1);
    D.sphere(ppx, ppy, 9, '#f59e0b', { gloss: true, shadow: true });
    ctx.save(); ctx.translate(ppx, ppy - 30 * FS); ctx.rotate(S.spin);
    ctx.strokeStyle = zn > 0 ? '#1d4ed8' : '#b91c1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 11, 0.4, TAU - 0.9); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(11 * Math.cos(TAU - 0.9) + 5, 11 * Math.sin(TAU - 0.9) - 5); ctx.lineTo(11 * Math.cos(TAU - 0.9) - 7, 11 * Math.sin(TAU - 0.9) - 3); ctx.lineTo(11 * Math.cos(TAU - 0.9) + 1, 11 * Math.sin(TAU - 0.9) + 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(M.x, M.y, M.w, M.h, 10).stroke();
    D.text(M.x + 8, M.y + 18, '북 (f 큼)', { size: 12, weight: 800, color: '#1d4ed8', align: 'left' });
    D.text(M.x + 8, M.y + M.h - 8, '남 (f 작음)', { size: 12, weight: 800, color: '#b91c1c', align: 'left' });
    // 위상속도 화살표
    const mid = A.x + A.w / 2, ay2 = M.y + M.h + 22 * FS;
    D.text(M.x + M.w - 8, M.y + 18, '서풍 U = ' + S.U + ' m/s →', { size: 12.5, weight: 800, color: '#15803d', align: 'right' });
    const sh = Math.abs(S.cV) < 0.5 ? '정체파 (제자리)' : S.cV > 0 ? '동쪽으로 느리게 이동' : '서쪽으로 역행';
    D.label(mid, ay2, '파동의 위상속도 c = ' + (Math.abs(c) < 0.05 ? '0.0' : sg(c, 1)) + ' m/s · ' + (Math.abs(c) < 0.5 ? '정체파 (제자리)' : c > 0 ? '동쪽으로 이동' : '서쪽으로 역행'), { bg: Math.abs(c) < 0.5 ? '#15803d' : c > 0 ? '#2563eb' : '#b91c1c', size: 13.5, pad: 12 });
    D.text(mid, ay2 + 26 * FS, zn > 0.1 ? '북쪽으로 가면 f가 커져요 → 시계 방향 회전(ζ < 0) → 다시 남쪽으로' : zn < -0.1 ? '남쪽으로 가면 f가 작아져요 → 반시계 방향 회전(ζ > 0) → 다시 북쪽으로' : '평균 위도에서는 회전이 0이에요', { size: 12.5, weight: 800, color: zn > 0.1 ? '#1d4ed8' : zn < -0.1 ? '#b91c1c' : '#475569' });
    // ----- B 패널
    card(B, '🔢 위상속도 c = U − β/k²');
    const fl = makeFlow(B, COLS, 46);
    const Lm = S.Lk * 1000, k = TAU / Lm, bk = BETA / (k * k);
    fl.put('β = 2Ω cosφ / a = ' + sci(BETA, 2) + ' m⁻¹s⁻¹ (45°N)', { size: 13, dy: 22 });
    fl.put('파장 L = ' + S.Lk + ' km → k = 2π/L = ' + sci(k, 2) + ' m⁻¹', { size: 13, dy: 22 });
    fl.put('β/k² = ' + fix(bk, 1) + ' m/s', { color: '#9a3412', dy: 22 });
    fl.put('서풍 U = ' + S.U + ' m/s', { color: '#15803d', dy: 22 });
    fl.put('c = ' + S.U + ' − ' + fix(bk, 1) + ' = ' + sg(c, 1) + ' m/s', { color: '#0f172a', size: 16, dy: 28 });
    // c 막대 (−30 ~ +30)
    { const w = fl.cw; ctx.fillStyle = '#e2e8f0'; rr(fl.x0, fl.y, w, 16, 8).fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fl.x0 + w / 2, fl.y - 3); ctx.lineTo(fl.x0 + w / 2, fl.y + 19); ctx.stroke();
      const cv = clamp(S.cV, -30, 30), bw = (Math.abs(cv) / 30) * (w / 2); ctx.fillStyle = Math.abs(c) < 0.5 ? '#16a34a' : cv > 0 ? '#2563eb' : '#dc2626'; rr(cv >= 0 ? fl.x0 + w / 2 : fl.x0 + w / 2 - bw, fl.y + 2, Math.max(2, bw), 12, 6).fill();
      D.text(fl.x0, fl.y + 32, '서 −30', { size: 11, weight: 700, color: '#64748b', align: 'left' }); D.text(fl.x0 + w, fl.y + 32, '+30 동 m/s', { size: 11, weight: 700, color: '#64748b', align: 'right' }); fl.y += 46 * FS; }
    fl.need(100);
    if (S.showLs || (game && game.free)) fl.put('정체파(c = 0) 파장 L = 2π√(U/β) ≈ ' + (Math.round(lsOf(S.U) / 100) * 100) + ' km', { size: 13, color: '#15803d', dy: 24 });
    fl.para('파장이 짧으면 서풍에 휩쓸려 동쪽으로, 길면 β 효과가 커서 서쪽으로 가요.', 12.5, '#475569');
  }
  function readRossby() { const c = cPhase(S.U, S.Lk); setReadouts(['서풍 U', S.U + ' m/s', '파장 L', S.Lk + ' km', '위상속도 c', sg(c, 1) + ' m/s']); }

  /* ======================================================
     장면 3: 편서풍 파동 — 북극 위에서 본 500 hPa
     ====================================================== */
  function polarGeom() {
    const A = rcOf('wave').A, top = 40, Rm = Math.min(A.w - 24, A.h - top - 36) / 2.2;
    return { A, cx: A.x + A.w / 2, cy: A.y + top + 1.1 * Rm + 2, Rm };
  }
  const rOfLat = (g, lat) => (g.Rm * (90 - lat)) / 60;
  const contourLat = (th, n, amp, th0) => 48 + amp * Math.cos(n * (th - th0));
  function waveStep(dt) {
    S.nV = approach(S.nV, S.n, dt, 6); S.ampV = approach(S.ampV, S.amp, dt, 6);
    S.th = (S.th + ((864 / 4505) * dt)) % TAU;                      // 평균 10 m/s (하루 864 km) 동진: 위도 45°의 반지름 4505 km
    if (!S.jp.length) for (let i = 0; i < 40; i++) S.jp.push({ s: i / 40 });
    S.jp.forEach((p) => { p.s = (p.s + dt * 0.09) % 1; });
    S.cyl = (S.cyl + dt * 0.5) % TAU;
  }
  function drawWave(t, dt) {
    const { A, B } = rcOf('wave'), g = polarGeom(), { cx, cy, Rm } = g;
    waveStep(dt);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, S.view === 'wave' ? '🧊 북극 위에서 본 500 hPa 편서풍 파동 (예시)' : '🧪 회전 원통 실험 (위에서 본 모습)', { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    if (S.view === 'cyl') { drawCyl(A, g); drawCylNotes(B); return; }
    const n = S.nV, amp = S.ampV, th0 = S.th, nSteps = 240;
    const pt = (th) => { const r = rOfLat(g, contourLat(th, n, amp, th0)); return [cx + r * Math.cos(th), cy - r * Math.sin(th)]; };
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rm * 1.1, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 1.1); bg.addColorStop(0, '#dbeafe'); bg.addColorStop(1, '#fef3c7'); ctx.fillStyle = bg; ctx.fillRect(cx - Rm * 1.2, cy - Rm * 1.2, Rm * 2.4, Rm * 2.4);
    // 극쪽(한랭)과 적도쪽(온난) 색
    ctx.beginPath(); for (let i = 0; i <= nSteps; i++) { const [x, y] = pt((i / nSteps) * TAU); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 0.9); cg.addColorStop(0, 'rgba(59,130,246,.55)'); cg.addColorStop(1, 'rgba(147,197,253,.28)'); ctx.fillStyle = cg; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rm * 1.1, 0, TAU); for (let i = nSteps; i >= 0; i--) { const [x, y] = pt((i / nSteps) * TAU); ctx.lineTo(x, y); } ctx.closePath(); ctx.fillStyle = 'rgba(248,113,113,.2)'; ctx.fill('evenodd'); ctx.restore();
    // 위도 원
    ctx.strokeStyle = 'rgba(71,85,105,.45)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
    [30, 45, 60, 80].forEach((la) => { ctx.beginPath(); ctx.arc(cx, cy, rOfLat(g, la), 0, TAU); ctx.stroke(); });
    ctx.setLineDash([]);
    // 파동(제트축)
    ctx.beginPath(); for (let i = 0; i <= nSteps; i++) { const [x, y] = pt((i / nSteps) * TAU); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    ctx.strokeStyle = 'rgba(234,88,12,.35)'; ctx.lineWidth = 14; ctx.stroke(); ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 4; ctx.stroke();
    // 서풍 입자 (반시계 = 동쪽)
    S.jp.forEach((p) => { const [x, y] = pt(p.s * TAU); D.sphere(x, y, 3.6, '#7c2d12', { gloss: false }); });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, Rm * 1.1, 0, TAU); ctx.stroke();
    [30, 45, 60].forEach((la) => D.text(cx + 4, cy - rOfLat(g, la) + 12, la + '°N', { size: 11.5, weight: 800, color: '#475569', align: 'left', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }));
    D.text(cx, cy + 5, 'N극', { size: 12.5, weight: 900, color: '#1e3a8a', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 골(T)·능(R) 표시와 한기·난기 화살표 (n개씩)
    const nn = Math.round(S.n);
    for (let m = 0; m < nn; m++) {
      const thR = th0 + (TAU * m) / S.nV, thT = th0 + (TAU * (m + 0.5)) / S.nV;
      const rr1 = rOfLat(g, 48 + amp) , rr2 = rOfLat(g, 48 - amp);
      const rx = cx + rr1 * Math.cos(thR), ry = cy - rr1 * Math.sin(thR), tx = cx + rr2 * Math.cos(thT), ty = cy - rr2 * Math.sin(thT);
      D.sphere(rx, ry, 11, '#dc2626', { gloss: false, outline: '#fff', outlineWidth: 2, text: '능', textScale: 1.0 });
      D.sphere(tx, ty, 11, '#2563eb', { gloss: false, outline: '#fff', outlineWidth: 2, text: '골', textScale: 1.0 });
      // 능: 난기 북상 (극 쪽), 골: 한기 남하 (적도 쪽)
      const ux = Math.cos(thR), uy = -Math.sin(thR);
      arrowS(rx - ux * 12 + 0, ry - uy * 12, rx - ux * 12 - ux * (14 + amp * 2.2), ry - uy * 12 - uy * (14 + amp * 2.2), { color: '#dc2626', width: 3.5, head: 9 });
      const vx = Math.cos(thT), vy = -Math.sin(thT);
      arrowS(tx + vx * 12, ty + vy * 12, tx + vx * (12 + 14 + amp * 2.2), ty + vy * (12 + 14 + amp * 2.2), { color: '#2563eb', width: 3.5, head: 9 });
    }
    legend(A.x + A.w / 2, A.y + A.h - 14 * FS, [['#ea580c', '제트축'], ['#dc2626', '능 · 난기 북상'], ['#2563eb', '골 · 한기 남하']]);
    D.text(A.x + A.w - 14, A.y + 24 * FS, '↺ 동쪽', { size: 12.5, weight: 800, color: '#7c2d12', align: 'right' });
    // ----- B 패널
    card(B, '📐 파동의 크기');
    const fl = makeFlow(B, COLS);
    fl.put('파동 수 n = ' + Math.round(S.n), { color: '#ea580c', dy: 22 });
    fl.put('위도 45° 둘레 ≈ ' + (Math.round(CIRC45 / 100) * 100).toLocaleString('ko-KR') + ' km', { size: 13, dy: 22 });
    fl.put('파장 λ = 둘레 / n', { size: 13, dy: 22 });
    if (S.showLam || (game && game.free)) fl.put('= ' + lamN(Math.round(S.n)).toLocaleString('ko-KR') + ' km', { color: '#15803d', size: 15, dy: 28 });
    else fl.put('= ? (직접 계산해요)', { color: '#15803d', size: 15, dy: 28 });
    fl.need(150);
    fl.put('진폭 ' + Math.round(S.amp) + '° (위도)', { color: '#334155', dy: 22 });
    fl.put('골의 가장 남쪽 ' + (48 - Math.round(S.amp)) + '°N', { color: '#2563eb', size: 13, dy: 22 });
    fl.put('능의 가장 북쪽 ' + (48 + Math.round(S.amp)) + '°N', { color: '#dc2626', size: 13, dy: 26 });
    fl.para('진폭이 커지면 한기가 더 남쪽까지 내려오고 난기가 더 북쪽까지 올라가요. 파동은 평균 10 m/s로 동쪽으로 이동해요.', 12.5, '#475569');
    S.tick = t;
  }
  function drawCyl(A, g) {
    const { cx, cy, Rm } = g, R0 = Rm * 1.02, r1 = Rm * 0.32;
    // 원통 (위에서 본 모습)
    D.shadow(() => { ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(cx, cy, R0 + 10, 0, TAU); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.clip();
    const rg = ctx.createRadialGradient(cx, cy, r1, cx, cy, R0); rg.addColorStop(0, '#bfdbfe'); rg.addColorStop(1, '#fecaca'); ctx.fillStyle = rg; ctx.fillRect(cx - R0, cy - R0, 2 * R0, 2 * R0);
    // 물결 모양의 흐름 (벽-중심 온도 차에서 생기는 파동)
    const m = 5;
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const th = (i / 200) * TAU, r = (R0 + r1) / 2 + (R0 - r1) * 0.12 * Math.cos(m * th - S.cyl), x = cx + r * Math.cos(th), y = cy - r * Math.sin(th); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.restore();
    D.shadow(() => { ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke();
    D.text(cx, cy + 5, '차가운 중심', { size: 12.5, weight: 800, color: '#1e3a8a' });
    D.label(cx, cy - R0 + 14, '가열된 바깥벽', { bg: '#dc2626', size: 12.5, pad: 8 });
    arcArrow(cx, cy, R0 * 0.62, -2.4, -1.0, { color: '#334155', width: 3 });
    D.text(A.x + A.w / 2, A.y + A.h - 14 * FS, '모양은 비슷해 보이지만 원인이 지구와 달라요', { size: 13, weight: 800, color: '#b91c1c' });
  }
  function drawCylNotes(B) {
    card(B, '⚠️ 이 실험의 한계');
    const fl = makeFlow(B, COLS);
    const items = [['① 파동의 원인이 달라요', '원통의 파동은 벽과 중심의 온도 차로 생기는 불안정이에요. 지구의 로스비파는 위도에 따른 f의 변화(β 효과)가 원인이에요.'], ['② β 효과가 없어요', '원통 바닥은 평평해서 f가 일정해요. 바닥 경사로 흉내 낸 변형 실험만 있어요.'], ['③ 모양만 비슷해요', '그래서 “원통의 파동 = 지구의 편서풍 파동의 원인”이라고 생각하면 오개념이에요.']];
    items.forEach(([h, tx]) => { fl.need(110); fl.put(h, { color: '#9a3412', dy: 22 }); fl.para(tx, 12.5, '#475569'); fl.y += 6; });
  }
  function readWave() { setReadouts(['파동 수 n', Math.round(S.n) + '개', '파동 진폭', Math.round(S.amp) + '° (위도)', '이동 속도', '평균 약 10 m/s']); }

  /* ======================================================
     장면 4: 상층 일기도 — 골과 능 찾기, 하루 뒤의 이동
     ====================================================== */
  const mapGeo = () => {
    const A = rcOf('map').A, w = A.w - 20, h = (w * KMH) / KMW, M = { x: A.x + 10, y: A.y + (PHONE ? 44 : 34), w, h };
    return { A, M, ...mapXY(M) };
  };
  const nearTrough = (x, xt) => Math.abs(x - xt) <= 350;
  const nearRidge = (x, xt) => Math.abs(x - (xt + WV.L / 2)) <= 350 || Math.abs(x - (xt - WV.L / 2)) <= 350;
  const markOk = (k) => { const m = S.marks[k]; if (!m) return false; const xt = xtOf(0); return k === 'trough' ? nearTrough(m.x, xt) : nearRidge(m.x, xt); };
  function mapStep(dt) {
    S.dayV = approach(S.dayV, S.day, dt, 2.2);
    if (Math.abs(S.dayV - S.day) < 0.002) S.dayV = S.day;
  }
  function drawMap(t, dt) {
    const { A, M, X, Y, ix, iy } = mapGeo(), B = rcOf('map').B;
    mapStep(dt);
    const xt = xtOf(S.dayV), sat = S.mview === 'sat';
    card(A, null);
    D.text(A.x + 14, A.y + 22 * FS, sat ? '🛰️ 대체 활동: 위성 영상으로 1~2일 뒤 예측하기' : '🗺️ 500 hPa 상층 일기도 (예시 자료) · 등고선 간격 60 m', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
    D.label(A.x + A.w - 14, A.y + 22 * FS, S.dayV < 0.02 ? '오늘' : '+' + Math.round(S.dayV * 24) + '시간', { bg: '#0f172a', size: 12.5, pad: 8, align: 'right' });
    const mp = { X, Y };
    if (sat) drawSat(M, xt, mp); else drawUpperMap(M, xt, { jet: true });
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    // 하루 동안의 이동
    if (S.dayV > 0.02) {
      const x0 = xtOf(0), x1 = xt, yy = 2750;
      D.dashedLine(X(x0), M.y + 4, X(x0), M.y + M.h - 4, { color: 'rgba(37,99,235,.6)', width: 2, dash: [5, 5] });
      arrowS(X(x0), Y(yy), X(x1), Y(yy), { color: '#2563eb', width: 4.5, head: 11 });
      if (S.showDist) D.label((X(x0) + X(x1)) / 2 + 20, Y(yy) - 14, '하루 864 km', { bg: '#2563eb', size: 12, pad: 7 });
    }
    // 골 축 표시 (정답을 찾은 뒤에만)
    if (S.revealAxes && !sat) {
      [[xt, '골', '#2563eb'], [xt + WV.L / 2, '능', '#dc2626'], [xt - WV.L / 2, '능', '#dc2626']].forEach(([x, nm, col]) => { if (x < 0 || x > KMW) return; D.dashedLine(X(x), M.y + 4, X(x), M.y + M.h - 4, { color: col, width: 2.2, dash: [7, 5] }); D.label(X(x), M.y + M.h - 22, nm + ' 축', { bg: col, size: 12, pad: 7 }); });
    }
    // 내가 찍은 표시
    [['trough', '골', '#2563eb'], ['ridge', '능', '#dc2626']].forEach(([k, nm, col]) => {
      const m = S.marks[k]; if (!m) return; const ok = markOk(k) && S.day === 0;
      D.dashedLine(X(m.x), M.y + 6, X(m.x), M.y + M.h - 6, { color: ok ? '#16a34a' : col, width: 2.5, dash: [4, 4] });
      D.sphere(X(m.x), M.y + 34, 12, ok ? '#16a34a' : col, { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: nm, textScale: 1.0 });
    });
    // 풍속 재기 표시
    if (S.probe) {
      const p = S.probe, px = X(p.x), py = Y(p.y);
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.moveTo(px - 15, py); ctx.lineTo(px + 15, py); ctx.moveTo(px, py - 15); ctx.lineTo(px, py + 15); ctx.stroke();
    }
    ctx.restore();
    // 골 · 능 찍기 안내
    if (!sat && S.pickHelp) D.text(A.x + A.w / 2, A.y + A.h - 10, S.pick === 'probe' ? '지도를 눌러 그곳의 풍속을 재어 봐요' : '지도에서 ' + (S.pick === 'trough' ? '골' : '능') + '의 축(등고선이 가장 많이 휜 곳)을 눌러요', { size: 12.5, weight: 800, color: '#475569' });
    // ----- B 패널
    card(B, null);
    legend(B.x + B.w / 2, B.y + 22 * FS, [['#1e293b', '500 hPa 등고선(m)'], ['#ea580c', '제트축(5520 m)'], ['#3b82f6', '한랭(5400 m 아래)'], ['#f4723c', '온난(5700 m 위)']], B.w - 24);
    const x0 = B.x + 16;
    const kz = zOf(WV.xk, WV.yk, xt), kv = vgeo(WV.xk, WV.yk, xt), ks = spac60(WV.xk, WV.yk, xt);
    let y = B.y + (PHONE ? 66 : 48) * FS;
    y = para(x0, y, B.w - 32, '한반도(별): 500 hPa 고도 ' + Math.round(kz / 10) * 10 + ' m · 등고선 간격 약 ' + Math.round(ks / 10) * 10 + ' km → 지균풍 약 ' + Math.round(kv) + ' m/s', 13.5, '#334155', 800) + 4;
    if (S.probe) {
      const p = S.probe, z = zOf(p.x, p.y, xt), v = vgeo(p.x, p.y, xt), s = spac60(p.x, p.y, xt);
      y = para(x0, y, B.w - 32, '🎯 잰 곳: 고도 ' + Math.round(z / 10) * 10 + ' m · 등고선 간격 약 ' + Math.round(s / 10) * 10 + ' km → 풍속 약 ' + Math.round(v) + ' m/s', 13.5, '#7c3aed', 800) + 4;
    }
    y = para(x0, y, B.w - 32, '등고선 간격이 좁을수록 풍속이 커요(V = (g/f)(Δz/Δn)). 골은 남쪽으로, 능은 북쪽으로 휘어요. 파동은 평균 약 10 m/s로 동쪽으로 움직여요.', 12.5, '#475569', 700) + 4;
    if (B.h > 300) {
      y += 10 * FS; D.text(x0, y, '등고선 간격(60 m당)과 지균풍 (위도 40°)', { size: 13, weight: 800, color: '#0f172a', align: 'left' }); y += 8 * FS;
      [[150, '#dc2626'], [250, '#f97316'], [400, '#2563eb']].forEach(([d, col]) => {
        const v = ((9.8 / F40) * 60) / (d * 1000), bw = (B.w - 150) * clamp(v / 45, 0, 1);
        D.text(x0, y + 18 * FS, '간격 ' + d + ' km', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
        ctx.fillStyle = '#e2e8f0'; rr(x0 + 92, y + 4 * FS, B.w - 150, 16, 8).fill(); ctx.fillStyle = col; rr(x0 + 92, y + 4 * FS, Math.max(8, bw), 16, 8).fill();
        D.text(x0 + 92 + B.w - 150 + 6, y + 18 * FS, Math.round(v) + ' m/s', { size: 12.5, weight: 900, color: col, align: 'left' }); y += 30 * FS;
      });
      y += 4 * FS;
    }
    para(x0, y, B.w - 32, '※ 예시 자료예요. 오늘 상층 일기도는 기상청 날씨누리에서 확인해 보세요. 상층 일기도가 없으면 지상 일기도와 위성 영상으로 1~2일 뒤를 예측해요.', 11.5, '#64748b', 700);
  }
  function readMap() {
    const xt = xtOf(S.dayV), kz = zOf(WV.xk, WV.yk, xt), kv = vgeo(WV.xk, WV.yk, xt);
    setReadouts(['한반도 500 hPa 고도', Math.round(kz / 10) * 10 + ' m', '한반도 지균풍', Math.round(kv) + ' m/s', '경과 시간', S.dayV < 0.02 ? '오늘' : '+' + Math.round(S.dayV * 24) + '시간']);
  }
  function mapClick(p) {
    const g = mapGeo();
    if (p.x < g.M.x || p.x > g.M.x + g.M.w || p.y < g.M.y || p.y > g.M.y + g.M.h) return false;
    const x = clamp(g.ix(p.x), 0, KMW), y = clamp(g.iy(p.y), 0, KMH);
    if (S.mview === 'sat') return false;
    if (S.pick === 'probe') S.probe = { x, y }; else S.marks[S.pick] = { x };
    Sound.tick();
    return false;
  }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const seaCh = makeChoice($('#seaSw'), [{ id: 'w', label: '❄️ 겨울형' }, { id: 's', label: '☀️ 여름형' }], (v) => { S.season = v; setG(v === 'w' ? 1.2 : 0.6, true); });
  const viewWCh = makeChoice($('#viewW'), [{ id: 'wave', label: '🧊 편서풍 파동' }, { id: 'cyl', label: '🧪 회전 원통 실험' }], (v) => { S.view = v; });
  const pickCh = makeChoice($('#pickSw'), [{ id: 'trough', label: '🔵 골 표시' }, { id: 'ridge', label: '🔴 능 표시' }, { id: 'probe', label: '🎯 풍속 재기' }], (v) => { S.pick = v; });
  const viewMCh = makeChoice($('#viewM'), [{ id: 'map', label: '🗺️ 500 hPa 일기도' }, { id: 'sat', label: '🛰️ 위성 영상 (대체)' }], (v) => { S.mview = v; });
  ['seaSw', 'viewW', 'viewM'].forEach((id) => $('#' + id).classList.add('opt-grid'));
  $('#pickSw').classList.add('opt-grid', 'c3');
  const numL = makeNum($('#numL'), { label: '파장 λ', unit: 'km', step: 100 });
  const numD = makeNum($('#numD'), { label: '하루 이동 거리', unit: 'km', step: 10 });
  const clsWave = makeClassify($('#clsWave'), [
    { id: 'a', label: '남쪽으로 처진 부분' }, { id: 'b', label: '북쪽으로 솟은 부분' }, { id: 'c', label: '한랭한 공기가 모인 곳' }, { id: 'd', label: '온난한 공기가 모인 곳' }, { id: 'e', label: '저기압성 곡률 (반시계 방향으로 휘어요)' }, { id: 'f', label: '고기압성 곡률 (시계 방향으로 휘어요)' },
  ], [{ id: 'tr', label: '골' }, { id: 'ri', label: '능' }], { a: 'tr', b: 'ri', c: 'tr', d: 'ri', e: 'tr', f: 'ri' }, () => { });
  SciSim.bindRange($('#sG'), $('#oG'), (v) => fix(+v, 1) + ' K/100 km', (v) => { S.G = +v; S.season = null; seaCh.set(null); });
  SciSim.bindRange($('#sU'), $('#oU'), (v) => v + ' m/s', (v) => { S.U = +v; });
  SciSim.bindRange($('#sLk'), $('#oLk'), (v) => (+v).toLocaleString('ko-KR') + ' km', (v) => { S.Lk = +v; });
  SciSim.bindRange($('#sN'), $('#oN'), (v) => v + '개', (v) => { S.n = +v; });
  SciSim.bindRange($('#sAmp'), $('#oAmp'), (v) => v + '°', (v) => { S.amp = +v; });
  const setG = (v, keep) => { S.G = v; setSlider($('#sG'), $('#oG'), v, (x) => fix(+x, 1) + ' K/100 km'); if (!keep) { S.season = null; seaCh.set(null); } };
  const setU = (v) => { S.U = v; setSlider($('#sU'), $('#oU'), v, (x) => x + ' m/s'); };
  const setLk = (v) => { S.Lk = v; setSlider($('#sLk'), $('#oLk'), v, (x) => (+x).toLocaleString('ko-KR') + ' km'); };
  const setN = (v) => { S.n = v; setSlider($('#sN'), $('#oN'), v, (x) => x + '개'); };
  const setAmp = (v) => { S.amp = v; setSlider($('#sAmp'), $('#oAmp'), v, (x) => x + '°'); };
  const setView = (v) => { S.view = v; viewWCh.set(v); };
  const setPick = (v) => { S.pick = v; pickCh.set(v); };
  const setMView = (v) => { S.mview = v; viewMCh.set(v); };
  function dayBtn() { $('#bDay').textContent = S.day > 0 ? '↺ 오늘로 돌아가기' : '▶ 하루(24시간) 뒤'; }
  $('#bDay').addEventListener('click', () => { Sound.click(); S.day = S.day > 0 ? 0 : 1; dayBtn(); });

  const MODE_LABEL = { jet: '🌐 제트류', rossby: '🌊 행성파', wave: '🧊 편서풍 파동', map: '🗺️ 상층 일기도' };
  const FREE_KEYS = { jet: ['seaSw', 'sG'], rossby: ['sU', 'sLk'], wave: ['sN', 'sAmp', 'viewW'], map: ['pickSw', 'viewM', 'bDay'] };
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
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'map') mapClick(p); return false; },
    hover(p) { if (S.mode !== 'map' || S.mview === 'sat') return ''; const g = mapGeo(); const inb = p.x > g.M.x && p.x < g.M.x + g.M.w && p.y > g.M.y && p.y < g.M.y + g.M.h; return inb ? 'crosshair' : ''; },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const jetOk = () => Math.abs(UJ(S.G) - 40) <= 3;
  function resetStep(li) {
    hideHint(); parts.clear();
    setG(0.5); S.GV = 0.5; S.uV = UJ(0.5);
    setU(25); setLk(6000); S.xoff = 0; S.px = 0; S.cV = cPhase(25, 6000); S.showLs = false;
    setN(5); S.nV = 5; setAmp(9); S.ampV = 9; setView('wave'); S.showLam = false; numL.reset(); clsWave.reset();
    S.day = 0; S.dayV = 0; S.marks = { trough: null, ridge: null }; setPick('trough'); setMView('map'); S.probe = null; S.showDist = false; S.revealAxes = false; S.pickHelp = false; numD.reset(); dayBtn();
    if (li === 0) { setMode('jet'); setCtl(['seaSw', 'sG']); showHint('기온 경도 슬라이더를 올려 제트가 어떻게 달라지는지 봐요', 5200); }
    else if (li === 1) { setMode('rossby'); setCtl(['sU', 'sLk']); showHint('파장 슬라이더를 움직여 파가 가는 방향을 봐요', 5200); }
    else if (li === 2) { setMode('wave'); setCtl(['sN', 'numL']); showHint('파동 수를 바꿔 골과 능의 개수를 세어 봐요', 5200); }
    else { setMode('map'); setCtl(['pickSw', 'viewM']); S.pickHelp = true; showHint('지도에서 골과 능의 위치를 눌러 표시해 봐요', 5200); }
    updateCtl();
  }
  const stat3 = (b, txt) => mark(b) + ' ' + txt;
  const levels = [
    {
      title: '제트류: 남북 기온 차가 만드는 서풍', short: '제트류', icon: '🌐', phase: '관찰', features: ['jet'],
      intro: '<p class="si-q">❓ 탐구 질문: 편서풍은 왜 곧게 불지 않고 남북으로 굽이치며, 이 굽이침이 우리 날씨와 무슨 관계일까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 ‘정역학 균형과 연직 운동’</b>에서 따뜻한 공기 기둥이 더 두꺼워진다(층후)고 배웠고, <b>‘전향력과 지균풍’</b>에서 압력 경도력과 전향력이 균형을 이루면 등압선(등고선)과 나란히 부는 지균풍이 된다고 배웠어요. 이 둘을 합치면 상층 편서풍을 설명할 수 있어요.</div>' +
        '<p>중위도 상층(약 10 km, 250 hPa 부근)에는 서풍이 가장 센 띠인 <b>제트류</b>가 있어요. 남쪽은 따뜻하고 북쪽은 차가워서 <b>남북 기온 경도 G</b>가 있으면, 정역학 균형 때문에 높이 올라갈수록 남북 기압 차가 커지고 지균풍인 서풍이 세져요. G가 클수록 제트가 강해요.</p>',
      setup() { resetStep(0); },
      recap: '남북 기온 차(경도)가 클수록 상층 서풍인 제트류가 강해요. 겨울이 여름보다 제트가 세요.',
      summary: '<ul><li><b>제트류</b>: 대류권계면 부근(약 10 km, 250 hPa)에서 서풍이 가장 센 띠. 극전선 제트는 위도 40~60°, 아열대 제트는 약 30°.</li><li>남북 기온 경도 G가 클수록 강해요(정역학 균형 + 지균풍): G = 0.5 K/100 km → 약 19 m/s, 1.0 → 약 39 m/s, 1.5 → 약 58 m/s.</li><li><b>겨울</b>은 남북 기온 차가 커서 제트가 세고, <b>여름</b>은 약해요.</li><li>제트류는 지표 바람의 연장이 아니에요. 상층의 기압(고도) 차에서 생기는 지균풍이에요.</li></ul>',
      missions: [
        {
          title: '제트를 약 40 m/s로',
          goal: '남북 기온 경도 <b>G</b>를 조절해서 제트의 최대 풍속을 <b>약 40 m/s</b>(37~43 m/s)로 만들어요.',
          hint: 'G가 1.0 K/100 km일 때 제트가 약 39 m/s예요. 슬라이더를 1.0 근처(1.0~1.1)로 맞춰 봐요.',
          setup() { setG(0.5); setMode('jet'); setCtl(['seaSw', 'sG']); },
          check: () => jetOk(), hold: 0.8,
          status: () => stat3(jetOk(), 'G = ' + fix(S.G, 1) + ' K/100 km → 제트 ' + Math.round(UJ(S.G)) + ' m/s (목표 약 40 m/s, 37~43)'),
          explain: '제트 풍속은 G에 거의 비례해서 <b>G = 1.0 K/100 km일 때 약 39 m/s</b>예요. 남북 기온 차가 2배가 되면 제트도 약 2배(G = 1.5 → 약 58 m/s)가 돼요.',
        },
        {
          type: 'quiz', title: '겨울에 제트가 센 까닭',
          goal: '북반구에서 <b>겨울</b>에 제트류가 여름보다 센 까닭은?',
          setup() { setMode('jet'); setCtl(['seaSw', 'sG']); },
          choices: ['겨울에는 남북 기온 차가 커서, 위로 갈수록 남북 기압 차가 커지고 서풍(지균풍)이 세지기 때문이에요', '제트류는 지표 바람이 위로 이어진 것인데, 겨울에 지표 바람이 더 세기 때문이에요', '겨울에는 지구의 자전 속도가 더 빨라지기 때문이에요', '겨울에는 태양이 지구에 더 가까워지기 때문이에요'],
          answer: 0,
          feedback: ['', '지표 바람은 마찰 때문에 약하고, 제트는 약 10 km 상공의 지균풍이에요. 제트의 세기는 남북 기온 경도가 결정해요.', '지구의 자전 속도는 계절에 따라 달라지지 않아요. 달라지는 것은 남북 기온 차예요.', '지구는 겨울(북반구)에 태양에 더 가깝지만 이것이 원인은 아니에요. 극지방이 더 차가워져서 남북 기온 차가 커지는 것이 핵심이에요.'],
          explain: '겨울에는 극 쪽이 매우 차가워져 <b>남북 기온 차가 커져요</b>. 정역학 균형으로 높이 갈수록 남북 기압 차가 커지고 지균풍인 서풍이 강해져서 제트가 세져요. 제트류는 지표 바람의 연장이 아니에요.',
        },
      ],
    },
    {
      title: '행성파: 전향력의 위도 변화가 만드는 파동', short: '행성파', icon: '🌊', phase: '모형', features: ['rossby'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 서풍인 제트류를 봤어요. 그런데 이 서풍은 곧게만 불지 않고 <b>파동</b>을 이뤄요. 앞 단원에서 배운 <b>f = 2Ω sinφ</b>(위도가 높을수록 커요)가 그 비밀이에요.</div>' +
        '<p>서풍을 타고 가던 공기가 <b>북쪽</b>으로 밀리면 f가 커져요. 절대 와도(ζ + f)가 보존되므로 ζ가 작아져 <b>시계 방향 회전</b>(ζ &lt; 0)이 생기고 공기는 다시 <b>남쪽</b>으로 돌아와요. 남쪽에서는 반대예요. 이렇게 위도에 따른 f의 변화(<b>β = 2Ω cosφ/a</b>)가 복원력이 되어 퍼지는 파동이 <b>행성파(로스비파)</b>예요. 위상속도는 <b>c = U − β/k²</b> (k = 2π/L, 동쪽이 +)로 구해요. 45°N에서 β = 1.62×10⁻¹¹ m⁻¹s⁻¹이에요.</p>',
      setup() { resetStep(1); },
      recap: '행성파는 위도에 따른 전향력의 변화(β 효과)가 복원력이에요. 위상속도 c = U − β/k²이고, 파장이 짧으면 동쪽으로, 길면 서쪽으로 가요.',
      summary: '<ul><li>공기가 북쪽으로 가면 f가 커져 <b>ζ + f 보존</b> → ζ &lt; 0(시계 방향)으로 되돌아오고, 남쪽에서는 반대 → 파동 전파. 복원력은 <b>β = df/dy = 2Ω cosφ/a</b> (45°N: 1.62×10⁻¹¹ m⁻¹s⁻¹).</li><li>위상속도 <b>c = U − β/k²</b>, k = 2π/L (동쪽이 +). 서풍 U = 25 m/s: L = 6000 km → c ≈ +10 m/s(동쪽), L = 10 000 km → c ≈ −16 m/s(서쪽으로 역행).</li><li>정체파(c = 0)의 파장 <b>L = 2π√(U/β)</b>: U = 25 m/s이면 약 7800 km.</li><li>파장이 짧을수록 서풍에 휩쓸려 동쪽으로, 길수록 서쪽으로 후퇴해요.</li></ul>',
      missions: [
        {
          title: '정체파가 되는 파장',
          goal: '서풍 <b>U = 25 m/s</b>에서 위상속도 <b>c ≈ 0</b>(|c| ≤ 0.5 m/s)이 되는 정체파의 <b>파장 L</b>을 찾아요.',
          hint: 'U를 25 m/s로 두고 파장 슬라이더를 움직여요. L이 짧으면 c > 0(동쪽), 길면 c < 0(서쪽)이에요. L = 2π√(U/β) = 2π√(25 ÷ 1.62×10⁻¹¹)에 가까워요(7500~8000 km).',
          setup() { setU(25); setLk(6000); S.showLs = false; setMode('rossby'); setCtl(['sU', 'sLk']); },
          check: () => S.U === 25 && Math.abs(cPhase(S.U, S.Lk)) <= 0.5, hold: 0.8,
          status: () => mark(S.U === 25) + ' U = ' + S.U + ' m/s · ' + mark(S.U === 25 && Math.abs(cPhase(S.U, S.Lk)) <= 0.5) + ' L = ' + S.Lk + ' km → c = ' + sg(cPhase(S.U, S.Lk), 1) + ' m/s',
          explain: 'c = U − β/k² = 0에서 <b>L = 2π√(U/β) = 2π√(25 ÷ 1.62×10⁻¹¹) ≈ 7800 km</b>예요. 이 파장에서는 서풍이 파동을 동쪽으로 미는 속도와 β 효과가 서쪽으로 미는 속도가 같아 파동이 제자리에 머물러요.',
        },
        {
          title: '파장 10 000 km: 서쪽으로 역행',
          goal: '서풍 <b>U = 25 m/s</b>, 파장 <b>L = 10 000 km</b>로 맞추고 파동이 <b>서쪽으로 역행</b>하는 것을 확인해요.',
          hint: 'U를 25 m/s, 파장 슬라이더를 10 000 km 끝으로 맞춰요. 이때 c = 25 − 41 ≈ −16 m/s예요.',
          setup() { setU(25); setLk(8000); S.showLs = true; setMode('rossby'); setCtl(['sU', 'sLk']); },
          check: () => S.U === 25 && S.Lk === 10000, hold: 0.8,
          status: () => mark(S.U === 25) + ' U = ' + S.U + ' m/s · ' + mark(S.Lk === 10000) + ' L = ' + S.Lk + ' km → c = ' + sg(cPhase(S.U, S.Lk), 1) + ' m/s' + (cPhase(S.U, S.Lk) < -0.5 ? ' (서쪽)' : ''),
          explain: 'L = 10 000 km이면 β/k² ≈ 41 m/s라서 <b>c = 25 − 41 ≈ −16 m/s</b>예요. 파동은 서풍보다 빠르게 서쪽으로 후퇴해요. 그래도 공기 덩어리는 서풍을 타고 동쪽으로 움직여요.',
        },
        {
          type: 'quiz', title: '복원력은 무엇일까?',
          goal: '행성파의 <b>복원력</b>은 무엇이고, <b>긴 파장</b>이 서쪽으로 후퇴하는 까닭은?',
          setup() { S.showLs = true; setMode('rossby'); setCtl(['sU', 'sLk']); },
          choices: ['위도에 따른 전향력(f)의 변화예요. 파장이 길수록 β/k²가 커져서 U보다 커지면 c = U − β/k²가 음수(서쪽)가 돼요', '지표 마찰이에요. 파장이 길수록 마찰이 커서 느려져요', '중력이에요. 파장이 길수록 중력파처럼 빨리 퍼져요', '서풍 U가 파장에 따라 커져서 파동이 동쪽으로 가요'],
          answer: 0,
          feedback: ['', '행성파는 마찰 없이도 생겨요. 복원력은 위도에 따라 f가 달라지는 효과(β)예요.', '중력파와는 다른 파동이에요. 행성파의 복원력은 f의 위도 변화예요.', 'c = U − β/k²에서 파장이 길어지면 β/k²가 커져 c가 작아져요. U는 파장과 관계없이 정해진 값이에요.'],
          explain: '북쪽으로 간 공기는 f가 커져 시계 방향 회전(ζ &lt; 0)을 얻어 되돌아오고, 남쪽에서는 반대예요. 이 <b>f의 위도 변화(β 효과)</b>가 복원력이에요. 파장이 길수록 k가 작아 <b>β/k²</b>가 커지므로 c가 서쪽(−)으로 가요.',
        },
      ],
    },
    {
      title: '편서풍 파동: 골과 능', short: '편서풍 파동', icon: '🧊', phase: '분석', features: ['wave'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> β 효과로 생기는 행성파를 봤어요. 북반구 중위도 상층의 <b>편서풍 파동</b>이 바로 이런 행성파예요. 북극 위에서 내려다보면 서풍이 남북으로 굽이쳐요.</div>' +
        '<p>남쪽으로 처진 곳을 <b>골</b>, 북쪽으로 솟은 곳을 <b>능</b>이라고 해요. 골에는 <b>한랭한</b> 공기가 모여 <b>저기압성</b>으로 휘고, 능에는 <b>온난한</b> 공기가 모여 <b>고기압성</b>으로 휘어요. 파동 수는 보통 4~6개이고, 평균 약 10 m/s로 동쪽으로 움직여요. (참고: 회전 원통 실험은 모양이 비슷해 보여도 원인이 달라서, 한계를 꼭 함께 알아야 해요.)</p>',
      setup() { resetStep(2); },
      recap: '골은 남쪽으로 처지고 한랭·저기압성, 능은 북쪽으로 솟고 온난·고기압성이에요. 위도 45°에서 파동 수 5이면 파장은 약 5700 km예요.',
      summary: '<ul><li><b>편서풍 파동</b>: 북반구 중위도 상층 서풍이 남북으로 굽이치는 파동(제트류). 파동 수는 약 4~6개, 평균 약 10 m/s로 동진해요(하루 약 860 km).</li><li><b>골</b>(남쪽으로 처짐): 한랭·저기압성. <b>능</b>(북쪽으로 솟음): 온난·고기압성. 진폭이 커지면 한기가 더 남쪽까지 내려오고 난기가 더 북쪽까지 올라가요.</li><li>위도 45° 둘레 2πR cos45° ≈ 28 300 km. 파동 수 5이면 <b>파장 ≈ 5700 km</b>(5661 km).</li><li><b>회전 원통 실험의 한계</b>: 파동의 원인이 벽-중심 온도 차에 의한 불안정이라 β 효과(f의 위도 변화)가 없어요. 모양이 비슷해 보일 뿐 지구의 로스비파와 원인이 달라요.</li></ul>',
      missions: [
        {
          title: '파동 수 5의 파장',
          goal: '파동 수를 <b>5</b>로 하고, 위도 45°에서 파동의 <b>파장 λ</b>(둘레 ÷ 파동 수)를 <b>km</b> 단위로 계산해 입력해요.',
          hint: '위도 45° 둘레는 2π × 6371 km × cos45° ≈ 28 300 km예요. 28 300 ÷ 5 ≈ 5660이니까 약 5700을 입력해요.',
          setup() { S.showLam = false; setN(4); numL.reset(); setMode('wave'); setCtl(['sN', 'numL']); },
          check: () => S.n === 5 && numL.near(CIRC45 / 5, 100), hold: 0.8,
          status: () => mark(S.n === 5) + ' 파동 수 ' + S.n + '개 (목표 5개) · ' + mark(S.n === 5 && numL.near(CIRC45 / 5, 100)) + ' 입력 ' + (numL.has() ? numL.value + ' km' : '—'),
          explain: '위도 45° 둘레 ≈ 2π × 6371 × cos45° ≈ <b>28 300 km</b>이고 파동 수가 5이면 <b>λ ≈ 28 300 ÷ 5 ≈ 5700 km</b>(5661 km)예요. 파동 수가 4면 약 7100 km, 6이면 약 4700 km예요.',
        },
        {
          title: '골과 능의 성질 분류', manual: true,
          goal: '<b>골</b>과 <b>능</b>의 성질 여섯 가지를 알맞게 분류해요.',
          hint: '골은 남쪽으로 처지고 차가운 공기가 있어서 저기압성(반시계)이에요. 능은 북쪽으로 솟고 따뜻한 공기가 있어서 고기압성(시계)이에요. 화면의 파랑(골)과 빨강(능) 화살표를 봐요.',
          setup() { S.showLam = true; clsWave.reset(); setMode('wave'); setCtl(['sAmp', 'clsWave']); },
          status: () => mark(clsWave.ok()) + ' 분류한 것 ' + clsWave.count() + ' / 6',
          check() {
            if (!clsWave.complete()) return '여섯 가지를 모두 분류해 주세요. (지금 ' + clsWave.count() + '개)';
            if (!clsWave.ok()) { clsWave.mark(clsWave.wrong()); return '빨간 줄이 달라요. 골은 남쪽으로 처지고 한랭·저기압성, 능은 북쪽으로 솟고 온난·고기압성이에요.'; }
            return true;
          },
          explain: '<b>골</b>: 남쪽으로 처짐 · 한랭 · 저기압성(반시계 방향으로 휨). <b>능</b>: 북쪽으로 솟음 · 온난 · 고기압성(시계 방향으로 휨). 진폭이 커지면 골에서 한기가 더 남쪽까지 내려와요.',
        },
        {
          type: 'quiz', title: '회전 원통 실험의 한계',
          goal: '<b>회전 원통 실험</b>에서 파동 모양이 나타나는 것에 대한 설명으로 옳은 것은?',
          setup() { setView('cyl'); setMode('wave'); setCtl(['viewW']); },
          choices: ['원통의 파동은 바깥벽과 중심의 온도 차로 생겨요. 위도에 따라 f가 달라지는 β 효과가 없어서 지구의 로스비파를 그대로 모사하지는 못해요', '원통의 파동은 지구의 편서풍 파동과 원인이 같아요. 그래서 실험이 지구를 완벽하게 대신해요', '원통 바닥이 평평해서 β 효과가 가장 크게 나타나요', '원통에서는 파동이 전혀 생기지 않아요'],
          answer: 0,
          feedback: ['', '모양이 비슷해 보여도 원인이 달라요. 원통 파동의 원인은 온도 차에 의한 불안정이고, 지구의 로스비파는 β 효과가 원인이에요. 이것이 흔한 오개념이에요.', '바닥이 평평하면 f가 일정해서 β 효과가 없어요. (바닥 경사로 흉내 내는 변형 실험만 있어요.)', '원통에서도 파동 모양이 나타나요. 다만 그 원인이 지구와 달라요.'],
          explain: '회전 원통 실험은 모양만 비슷해 보여요. 파동의 원인이 <b>온도 차에 의한 경사 불안정</b>이고, 바닥이 평평해 <b>β 효과(f의 위도 변화)</b>가 없어요. 그래서 “원통의 파동 = 편서풍 파동의 원인”이라는 생각은 오개념이에요.',
        },
      ],
    },
    {
      title: '상층 일기도: 골과 능 읽기', short: '상층 일기도', icon: '🗺️', phase: '분석', features: ['map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 골과 능, 평균 약 10 m/s의 동진을 배웠어요. 이제 <b>500 hPa 상층 일기도</b>(예시)에서 직접 읽어 봐요.</div>' +
        '<p>상층 일기도의 <b>등고선</b>은 500 hPa 면의 높이(m)예요. 등고선은 지균풍의 흐름선이라 바람이 등고선을 따라 불고, <b>간격이 좁을수록 바람이 세요</b>(V = (g/f)(Δz/Δn)). 골은 등고선이 남쪽으로, 능은 북쪽으로 휘어요. 이 일기도는 예시 자료예요. 상층 일기도를 구하기 어려우면 <b>지상 일기도와 위성 영상</b>으로 1~2일 뒤를 예측하는 대체 활동도 해 봐요.</p>',
      setup() { resetStep(3); },
      recap: '등고선이 남쪽으로 휜 곳이 골, 북쪽으로 휜 곳이 능이에요. 파동이 평균 10 m/s로 동진하면 하루에 약 860 km 움직여요.',
      summary: '<ul><li><b>500 hPa 상층 일기도</b>: 등고선(고도 m)을 따라 바람이 불고, <b>간격이 좁을수록 풍속이 커요</b>. 제트축은 등고선이 촘촘한 곳이에요.</li><li><b>골</b>: 등고선이 남쪽으로 휜 곳(한랭), <b>능</b>: 북쪽으로 휜 곳(온난). 5400 m 선이 남쪽으로 내려올수록 한기가 남하해 기온이 내려가요.</li><li>파동이 평균 10 m/s로 동진하면 하루(86 400 s)에 10 × 86 400 = 864 000 m ≈ <b>864 km</b>(약 860 km)를 가요.</li><li>상층 일기도가 없으면 지상 일기도와 위성 영상의 구름대 이동으로 1~2일 뒤를 예측할 수 있어요. 자료는 모두 예시이고, 실제 자료는 기상청 날씨누리에서 확인해요.</li></ul>',
      missions: [
        {
          title: '골과 능 찾기',
          goal: '일기도에서 <b>한반도 서쪽의 골</b>의 축과 <b>능</b>의 축을 눌러 표시해요. (‘골 표시’, ‘능 표시’를 고른 뒤 지도를 눌러요)',
          hint: '골은 등고선이 남쪽으로 가장 많이 휜 곳(한반도 서쪽 약 109°E 부근)이에요. 능은 등고선이 북쪽으로 가장 많이 솟은 곳(약 142°E 또는 약 76°E)이에요.',
          setup() { S.marks = { trough: null, ridge: null }; S.day = 0; dayBtn(); setMView('map'); setPick('trough'); S.revealAxes = false; S.pickHelp = true; setMode('map'); setCtl(['pickSw', 'viewM']); },
          check: () => S.day === 0 && markOk('trough') && markOk('ridge'), hold: 0.8,
          status: () => mark(markOk('trough')) + ' 골 ' + (S.marks.trough ? '표시함' : '아직') + ' · ' + mark(markOk('ridge')) + ' 능 ' + (S.marks.ridge ? '표시함' : '아직'),
          explain: '골은 등고선이 <b>남쪽으로</b> 휜 곳으로 한반도의 서쪽 약 1500 km(약 109°E)에 있고, 능은 <b>북쪽으로</b> 휜 곳이에요. 골 앞쪽(동쪽)에서 남서풍이, 뒤쪽(서쪽)에서 북서풍이 불어요.',
        },
        {
          title: '하루에 얼마나 움직일까?',
          goal: '파동이 평균 <b>10 m/s</b>로 동쪽으로 갈 때, <b>하루(24시간)</b> 동안 이동하는 거리를 <b>km</b> 단위로 계산해 입력해요.',
          hint: '10 m/s × 86 400 s = 864 000 m = 864 km예요. 약 860을 입력해요. (‘하루 뒤’ 단추를 눌러 골이 움직이는 것도 확인해 봐요.)',
          setup() { S.marks = { trough: null, ridge: null }; S.revealAxes = true; S.pickHelp = false; S.showDist = false; numD.reset(); S.day = 0; dayBtn(); setMView('map'); setMode('map'); setCtl(['bDay', 'numD']); },
          check: () => numD.near(864, 10), hold: 0.8,
          status: () => mark(numD.near(864, 10)) + ' 입력 ' + (numD.has() ? numD.value + ' km' : '—') + ' (10 m/s × 하루)',
          explain: '하루는 86 400 s이므로 10 m/s × 86 400 s = 864 000 m = <b>864 km</b>(약 860 km)예요. 한반도 서쪽 1500 km의 골은 이 속도로 약 42시간 뒤에 한반도에 닿아요(다음 차시).',
        },
        {
          type: 'quiz', title: '등고선이 남하하고 촘촘한 곳',
          goal: '5400 m 등고선이 <b>한반도 가까이</b>까지 남하한 날, 한반도 날씨와 <b>등고선 간격</b>에 대한 설명으로 옳은 것은?',
          setup() { S.revealAxes = true; S.showDist = true; setMView('map'); setPick('probe'); setMode('map'); setCtl(['pickSw', 'viewM']); },
          choices: ['북쪽의 한랭한 공기가 남하해 기온이 크게 내려가요. 등고선 간격이 좁은 곳일수록 바람(제트)이 세요', '남쪽의 온난한 공기가 올라와 기온이 올라가요. 등고선 간격이 넓은 곳일수록 바람이 세요', '기온은 5400 m 등고선과 관계가 없어요. 등고선 간격이 좁은 곳은 바람이 약해요', '한반도 날씨는 상층 일기도로는 알 수 없어요'],
          answer: 0,
          feedback: ['', '5400 m 같은 낮은 고도의 등고선은 차가운 공기에서 나타나요. 등고선이 남쪽으로 휘면 한기가 남하하는 거예요. 그리고 간격이 넓으면 바람이 약해요.', '500 hPa의 고도는 공기 기둥의 평균 기온과 관련 있어요(층후). 그리고 풍속은 V = (g/f)(Δz/Δn)이라 간격이 좁을수록 커요.', '상층 일기도는 한기와 난기의 이동, 제트의 위치를 알려 주는 중요한 자료예요.'],
          explain: '낮은 고도의 등고선(5400 m)은 <b>한랭한</b> 공기에서 나타나요. 이 선이 남하하면 한기가 내려와 한반도 기온이 크게 내려가요. 풍속은 V = (g/f)(Δz/Δn)에서 Δn이 작을수록 커서 <b>등고선 간격이 좁은 곳</b>이 바람이 세요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-planetary-wave', mount: '#game', badge: '행성파 박사', homeHref: '../../index.html#hs',
    featureLabels: { jet: '🌐 제트류 단면', rossby: '🌊 행성파 시뮬레이션', wave: '🧊 북극 위에서 본 파동 · 원통 실험', map: '🗺️ 500 hPa 상층 일기도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'jet') readJet();
    else if (S.mode === 'rossby') readRossby();
    else if (S.mode === 'wave') readWave();
    else readMap();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'jet') drawJet(t, dt);
    else if (S.mode === 'rossby') drawRossby(t, dt);
    else if (S.mode === 'wave') drawWave(t, dt);
    else drawMap(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, numL, numD, clsWave, cPhase, UJ, lsOf, lamN, CIRC45, WV, xtOf, mapGeo, markOk, zOf, vgeo, spac60,
    get game() { return game; }, setMode, resetStep, updateCtl, setG, setU, setLk, setN, setAmp, setView, setPick, setMView, dayBtn,
  };
})();
