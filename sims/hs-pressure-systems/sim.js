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
     편서풍 파동과 고·저기압 (상층 발산 → 저기압 발달 → 고기압 발달 → 일기 예측)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 900, 1.22);
  let game = null;
  const COLS = PHONE ? 2 : 1;
  const LW = WV.L, LQ = WV.L / 4;                                  // 파장 5700 km, L/4 = 1425 km
  const VIEW = PHONE ? { x0: 900, x1: 7500, y0: 450, y1: 2900 } : { x0: 0, x1: KMW, y0: 450, y1: 2900 };
  const XL = (VIEW.x0 + VIEW.x1) / 2;
  const XT0 = xtOf(0);                                             // 골 축 (오늘)
  const SPEED = 36;                                                // 골의 이동 속도: 10 m/s = 36 km/h
  const DIST = 1500;                                               // 한반도 서쪽 골까지의 거리 (km)
  const T_ARR = DIST / SPEED;                                      // 도착까지 시간 ≈ 41.7 시간
  const Tlow = (s) => 2.5 - 4.5 * Math.max(0, Math.sin((TAU * s) / LW));          // 지상 저기압 기압 경향 (hPa/6h)
  const Thigh = (s) => -2.5 + 4.5 * Math.max(0, -Math.sin((TAU * s) / LW));       // 지상 고기압 기압 경향 (hPa/6h)
  const PAIRS = [['rain', '구름·비 (골의 앞쪽)'], ['nw', '북서풍·기온 하강 (골 통과 후)'], ['clear', '맑음 (능이 다가올 때)']];

  function rcOf(mode) {
    if (mode === 'fcst') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 230 }, B: { x: 8, y: 246, w: 504, h: 646 } }, { A: { x: 12, y: 12, w: 776, h: 282 }, B: { x: 12, y: 302, w: 776, h: 246 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 230 }, C: { x: 8, y: 246, w: 504, h: 330 }, B: { x: 8, y: 584, w: 504, h: 308 } }, { A: { x: 12, y: 12, w: 776, h: 282 }, C: { x: 12, y: 302, w: 382, h: 246 }, B: { x: 402, y: 302, w: 386, h: 246 } });
  }
  const upGeo = (mode) => {
    const A = rcOf(mode).A, w = A.w - 20, h = (w * (VIEW.y1 - VIEW.y0)) / (VIEW.x1 - VIEW.x0), M = { x: A.x + 10, y: A.y + 36, w, h };
    return { A, M, ...mapXY(M, VIEW) };
  };

  const S = {
    mode: 'div', fade: 0, clock: 0,
    // 1. 상층 발산
    D: 0, C: 0, DV: 0, CV: 0, zonesOn: false, showNet: false, pts: [], netV: 0, mh: 1,
    // 2. 저기압 발달
    sL: 0, sLV: 0, tL: 0, pLV: 1008, upL: 0,
    // 3. 고기압 발달
    hx: null, hxV: XT0 - 1425, tH: 0, pHV: 1020, hClick: false,
    // 4. 일기 예측
    tf: 0, tfV: 0, play: false, fview: 'map',
  };
  const tendOf = (D, C) => C - D;

  /* ======================================================
     공통: 지도 위에 지상 저기압/고기압 기호
     ====================================================== */
  function surfSym(X, Y, x, y, kind, p, o) {
    o = o || {};
    const px = X(x), py = Y(y), col = kind === 'L' ? '#1d4ed8' : '#b91c1c';
    ctx.strokeStyle = col; ctx.lineWidth = 2; [20, 34, 48].forEach((r, i) => { ctx.globalAlpha = 0.8 - i * 0.2; ctx.beginPath(); ctx.arc(px, py, r * (PHONE ? 0.8 : 1), 0, TAU); ctx.stroke(); }); ctx.globalAlpha = 1;
    D.sphere(px, py, 15, kind === 'L' ? '#60a5fa' : '#f87171', { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: kind, textScale: 1.1 });
    D.label(px, py + (PHONE ? 46 : 62), fix(p, 1) + ' hPa', { bg: col, size: 12.5, pad: 7 });
  }
  /* ======================================================
     장면 1: 상층 발산 — 등고선과 공기 기둥
     ====================================================== */
  const PINS = [['1', XT0 + 800, 'D', '골의 동쪽(앞)'], ['2', XT0 - 800, 'C', '골의 서쪽(뒤)'], ['3', XT0 + LW / 2 + 800, 'C', '능의 동쪽'], ['4', XT0 + LW / 2 - 800, 'D', '능의 서쪽']];
  function flowStep(dt) {
    const v = VIEW, sx = upGeo('div').M.w / (v.x1 - v.x0);
    if (!S.pts.length) for (let i = 0; i < 56; i++) S.pts.push({ x: v.x0 + Math.random() * (v.x1 - v.x0), f: (Math.random() - 0.5) * 1.6 });
    S.pts.forEach((p) => {
      p.x += ((46 * glOf(p.x, XT0)) / WV.g0 / sx) * dt;
      const sg2 = Math.sin(KW * (p.x - XT0)) > 0 ? 1 : -1;
      p.f = clamp(p.f + sg2 * 0.55 * p.f * dt + (Math.abs(p.f) < 0.05 ? sg2 * 0.2 * dt : 0), -1, 1);
      if (p.x > v.x1) { p.x = v.x0; p.f = (Math.random() - 0.5) * 1.2; }
    });
    S.mh = approach(S.mh, S.zonesOn || (game && game.free) ? 1 : 0, dt, 5);
  }
  function drawColumn(R, o) {
    card(R, null);
    D.text(R.x + 14, R.y + 22 * FS, '🏗️ 공기 기둥 단면', { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    const gx = R.x + 12, top = R.y + 38, bot = R.y + R.h - 40 * FS, cw = Math.min(150, R.w * 0.42), cx = gx + cw / 2;
    ctx.fillStyle = '#e0f2fe'; rr(gx, top, cw, bot - top, 8).fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, top + 24); ctx.lineTo(gx + cw, top + 24); ctx.stroke(); ctx.setLineDash([]);
    D.text(gx + 6, top + 20, '500 hPa', { size: 11.5, weight: 800, color: '#475569', align: 'left' });
    ctx.fillStyle = '#a3a380'; rr(gx, bot, cw, 12, 4).fill(); ctx.fillStyle = '#86a35c'; ctx.fillRect(gx, bot, cw, 4);
    D.text(gx + cw / 2, bot + 28 * FS, '지표', { size: 11.5, weight: 800, color: '#475569' });
    // 공기 기둥: 위로 퍼지면 얇아지고(질량 감소), 모이면 두꺼워져요
    const net = o.net, hh = (bot - top - 50) * clamp(1 + net * 0.06, 0.55, 1.45) * 0.62, colW = 54;
    const g = ctx.createLinearGradient(0, bot - hh, 0, bot); g.addColorStop(0, 'rgba(14,165,233,.35)'); g.addColorStop(1, 'rgba(14,165,233,.7)');
    ctx.fillStyle = g; rr(cx - colW / 2, bot - hh, colW, hh, 6).fill(); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2; rr(cx - colW / 2, bot - hh, colW, hh, 6).stroke();
    D.text(cx, bot - hh / 2 + 4, '공기', { size: 12.5, weight: 800, color: '#0c4a6e' });
    // 상층 발산(바깥으로) · 지상 수렴(안으로)
    const dl = 8 + o.D * 9, cl = 8 + o.C * 9, yt = top + 24 - 0, yb = bot - 16;
    if (o.D > 0.01) [-1, 1].forEach((sd) => arrowS(cx + sd * (colW / 2 + 2), yt + 22, cx + sd * (colW / 2 + 2 + dl), yt + 22, { color: '#ea580c', width: 5, head: 11 }));
    if (o.C > 0.01) [-1, 1].forEach((sd) => arrowS(cx + sd * (colW / 2 + 2 + cl), yb, cx + sd * (colW / 2 + 2), yb, { color: '#16a34a', width: 5, head: 11 }));
    D.text(cx, yt + 54, o.D > 0.01 ? '유출' : '', { size: 11.5, weight: 900, color: '#c2410c' });
    // 오른쪽: 막대
    const bx = gx + cw + 18, bw = R.x + R.w - bx - 12; let y = top + 8;
    const bar = (nm, val, col, txt) => { D.text(bx, y + 4, nm, { size: 12.5, weight: 800, color: col, align: 'left' }); ctx.fillStyle = '#e2e8f0'; rr(bx, y + 12, bw, 14, 7).fill(); if (val > 0.01) { ctx.fillStyle = col; rr(bx, y + 12, Math.max(8, bw * clamp(val / 6, 0, 1)), 14, 7).fill(); } D.text(bx, y + 46 * FS, txt, { size: 13.5, weight: 900, color: col, align: 'left' }); y += 58 * FS; };
    bar('상층 발산 (유출)', o.D, '#ea580c', fix(S.D, 1) + ' hPa/6h');
    bar('지상 수렴 (유입)', o.C, '#16a34a', fix(S.C, 1) + ' hPa/6h');
    D.text(bx, y + 4, '지상 기압 변화', { size: 12.5, weight: 800, color: '#7c3aed', align: 'left' });
    if (S.showNet || (game && game.free)) { D.text(bx, y + 28 * FS, sg(tendOf(S.D, S.C), 1) + ' hPa/6h', { size: 16, weight: 900, color: tendOf(S.D, S.C) < 0 ? '#1d4ed8' : '#b91c1c', align: 'left' }); D.text(bx, y + 48 * FS, tendOf(S.D, S.C) < -0.01 ? '↓ 기압 하강 (저기압 발달)' : tendOf(S.D, S.C) > 0.01 ? '↑ 기압 상승 (고기압 강화)' : '변화 없음', { size: 12, weight: 800, color: '#475569', align: 'left' }); }
    else D.text(bx, y + 28 * FS, '= ? (직접 계산해요)', { size: 14, weight: 900, color: '#7c3aed', align: 'left' });
  }
  function drawDiv(t, dt) {
    const { A, M, X, Y } = upGeo('div'), { C, B } = rcOf('div');
    flowStep(dt);
    S.DV = approach(S.DV, S.D, dt, 8); S.CV = approach(S.CV, S.C, dt, 8);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, PHONE ? '🗺️ 500 hPa 파동 (예시)' : '🗺️ 500 hPa 파동 (예시): 등고선 간격이 넓어지면 퍼짐(발산), 좁아지면 모임(수렴)', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
    drawUpperMap(M, XT0, { view: VIEW, jet: true, zones: { a: S.mh } });
    // 공기 알갱이 (두 등고선 사이 흐름)
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    S.pts.forEach((p) => { const y = contY(5520 + 40 * p.f, p.x, XT0); ball(X(p.x), Y(y), 3.6, '#0e7490', false); });
    ctx.restore();
    // 번호 표시
    PINS.forEach(([n, x, kind, nm]) => { const px = X(x), py = Y(1900); D.sphere(px, py, 12, '#7c3aed', { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: n, textScale: 1.1 }); });
    D.dashedLine(X(XT0), M.y + 6, X(XT0), M.y + M.h - 6, { color: '#2563eb', width: 2, dash: [6, 5] }); D.label(X(XT0), M.y + M.h - 14, '골 축', { bg: '#2563eb', size: 11.5, pad: 6 });
    D.dashedLine(X(XT0 + LW / 2), M.y + 6, X(XT0 + LW / 2), M.y + M.h - 6, { color: '#dc2626', width: 2, dash: [6, 5] }); D.label(X(XT0 + LW / 2), M.y + M.h - 14, '능 축', { bg: '#dc2626', size: 11.5, pad: 6 });
    if (S.mh > 0.5) legend(A.x + A.w - (PHONE ? 96 : 110), A.y + 24 * FS, [['#f97316', '발산 구역'], ['#22c55e', '수렴 구역']]);
    drawColumn(C, { D: S.DV, C: S.CV, net: tendOf(S.DV, S.CV) });
    // ----- B
    card(B, '🧮 기둥의 질량과 지상 기압');
    const fl = makeFlow(B, 1, 46);
    fl.para('지상 기압은 위에 있는 공기 기둥의 무게예요. 기둥의 공기가 줄면 기압이 내려가고 늘면 올라가요.', 13, '#334155');
    fl.y += 4;
    fl.put('지상 기압 변화 = 지상 수렴 유입 − 상층 발산 유출', { size: 13, color: '#7c3aed', dy: 24 });
    fl.put('(단위: hPa/6h로 바꿔 쓴 값)', { size: 12, color: '#64748b', dy: 24 });
    if (S.showNet || (game && game.free)) fl.put('지금: ' + fix(S.C, 1) + ' − ' + fix(S.D, 1) + ' = ' + sg(tendOf(S.D, S.C), 1) + ' hPa/6h', { size: 15, color: '#1d4ed8', dy: 26 });
    else fl.put('지금: ' + fix(S.C, 1) + ' − ' + fix(S.D, 1) + ' = ?', { size: 15, color: '#1d4ed8', dy: 26 });
    fl.para('상층 발산이 지상 수렴보다 크면 기압이 내려가 저기압이 발달하고, 상층 수렴이 크면 기압이 올라 고기압이 강해져요.', 12.5, '#475569');
  }
  function readDiv() { setReadouts(['상층 발산 (유출)', fix(S.D, 1) + ' hPa/6h', '지상 수렴 (유입)', fix(S.C, 1) + ' hPa/6h', '지상 기압 변화', S.showNet || (game && game.free) ? sg(tendOf(S.D, S.C), 1) + ' hPa/6h' : '직접 계산해요']); }

  /* ======================================================
     장면 2: 저기압 발달
     ====================================================== */
  function lowStep(dt) {
    S.sLV = approach(S.sLV, S.sL, dt, 5); if (Math.abs(S.sLV - S.sL) < 0.5) S.sLV = S.sL;
    const T = Tlow(S.sL), pt = 1008 + (T * S.tL) / 6;
    S.pLV = approach(S.pLV, pt, dt, 6); if (Math.abs(S.pLV - pt) < 0.005) S.pLV = pt;
    S.upL = approach(S.upL, clamp(-T / 2, -1, 1), dt, 5);
  }
  function drawLow(t, dt) {
    const { A, M, X, Y } = upGeo('low'), { C, B } = rcOf('low');
    lowStep(dt);
    const xt = XL - S.sLV, T = Tlow(S.sL);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, (PHONE ? '🌀 골과 지상 저기압' : '🌀 상층 골과 지상 저기압 (500 hPa 등고선 위)'), { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
    D.label(A.x + A.w - 14, A.y + 22 * FS, S.tL === 0 ? '지금' : '+' + S.tL + '시간', { bg: '#0f172a', size: 12.5, pad: 8, align: 'right' });
    drawUpperMap(M, xt, { view: VIEW, jet: true, zones: { a: 1 } });
    D.dashedLine(X(xt), M.y + 6, X(xt), M.y + M.h - 6, { color: '#2563eb', width: 2.4, dash: [6, 5] }); D.label(X(xt), M.y + 14, '상층 골 축', { bg: '#2563eb', size: 11.5, pad: 6 });
    surfSym(X, Y, XL, 1700, 'L', S.pLV);
    legend(A.x + A.w - (PHONE ? 120 : 250), A.y + 24 * FS, [['#f97316', '발산(골 앞)'], ['#22c55e', '수렴(골 뒤)']]);
    // ----- C: 단면
    card(C, null);
    D.text(C.x + 14, C.y + 22 * FS, '↔️ 서 → 동 단면 (골 축은 높이에 따라 서쪽으로 기울어요)', { size: 12.5, weight: 800, color: '#1e3a8a', align: 'left' });
    const gx = C.x + 12, gw = C.w - 24, top = C.y + 38, bot = C.y + C.h - 30 * FS, mid = gx + gw / 2;
    ctx.fillStyle = '#e0f2fe'; rr(gx, top, gw, bot - top, 8).fill();
    ctx.fillStyle = '#a3a380'; ctx.fillRect(gx, bot, gw, 10); ctx.fillStyle = '#86a35c'; ctx.fillRect(gx, bot, gw, 4);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, top + 20); ctx.lineTo(gx + gw, top + 20); ctx.stroke(); ctx.setLineDash([]); D.text(gx + 6, top + 16, '500 hPa', { size: 11.5, weight: 800, color: '#475569', align: 'left' });
    const sc = gw / 8000, xu = clamp(mid - S.sLV * sc, gx + 16, gx + gw - 16), xs = clamp(xu + 700 * sc, gx + 16, gx + gw - 16);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(xs, bot); ctx.lineTo(xu, top + 20); ctx.stroke();
    D.label(xu, top + 38, '골 축', { bg: '#2563eb', size: 11.5, pad: 6 });
    // 구름(발달할수록 짙게)과 상승 화살표
    const dev = clamp(-T / 2, 0, 1);
    ctx.save(); ctx.globalAlpha = 0.25 + 0.7 * dev; [[0, 0, 22], [-22, 6, 17], [22, 6, 19], [-8, -9, 16]].forEach(([dx, dy, r]) => D.sphere(mid + dx, top + 62 + dy, r, '#94a3b8', { gloss: false })); ctx.restore();
    if (T < -0.05) arrowS(mid, bot - 6, mid, top + 86, { color: '#2563eb', width: 5, head: 12, alpha: 0.4 + 0.5 * dev });
    D.sphere(mid, bot - 10, 12, '#60a5fa', { gloss: false, outline: '#fff', outlineWidth: 2.5, text: 'L', textScale: 1.1 });
    const dvx = 10 + Math.max(0, 4.5 * Math.max(0, Math.sin((TAU * S.sL) / LW))) * 7;
    if (Math.sin((TAU * S.sL) / LW) > 0.02) { [-1, 1].forEach((sd) => arrowS(mid + sd * 8, top + 40, mid + sd * (8 + dvx), top + 40, { color: '#ea580c', width: 4.5, head: 10 })); D.text(mid, top + 32, '상층 발산', { size: 11.5, weight: 900, color: '#c2410c' }); }
    else D.text(mid, top + 36, '상층 발산 없음', { size: 11.5, weight: 900, color: '#64748b' });
    D.text(C.x + C.w / 2, C.y + C.h - 8, '골 축과의 거리 s = ' + Math.round(S.sL) + ' km (골의 ' + (S.sL > 0 ? '동쪽' : S.sL < 0 ? '서쪽' : '바로 아래') + ')', { size: 12.5, weight: 800, color: '#334155' });
    // ----- B: 기압 계기
    card(B, '⏱️ 중심 기압');
    const gcx = B.x + B.w / 2, gcy = B.y + (PHONE ? 140 : 132), gr = PHONE ? 88 : 80;
    ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(gcx, gcy, gr, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(gcx, gcy, gr, Math.PI, Math.PI + Math.PI * clamp((1020 - S.pLV) / 40, 0, 1)); ctx.stroke(); ctx.lineCap = 'butt';
    const na = Math.PI + Math.PI * clamp((S.pLV - 980) / 40, 0, 1) * 0 + Math.PI * clamp((1020 - S.pLV) / 40, 0, 1);
    D.text(gcx - gr, gcy + 20, '1020', { size: 11.5, weight: 700, color: '#64748b' }); D.text(gcx + gr, gcy + 20, '980', { size: 11.5, weight: 700, color: '#64748b' });
    D.text(gcx, gcy - 14, fix(S.pLV, 1), { size: 30, weight: 900, color: '#1d4ed8' }); D.text(gcx, gcy + 10, 'hPa', { size: 13, weight: 800, color: '#64748b' });
    const fl = makeFlow(B, 1, 40); fl.y = gcy + 36 * FS;
    fl.put('기압 경향 T = ' + sg(T, 1) + ' hPa/6h', { size: 14, color: T < -0.05 ? '#1d4ed8' : '#b91c1c', dy: 22 });
    fl.put(T <= -1.3 ? '상층 발산이 커서 계속 발달해요' : T < -0.05 ? '조금 발달해요' : '발달하지 못하고 약해져요(기압 상승)', { size: 12.5, color: '#475569', dy: 22 });
    fl.put('p = 1008 + T × (' + S.tL + ' h / 6 h)', { size: 12.5, color: '#64748b', dy: 20 });
  }
  function readLow() { const T = Tlow(S.sL); setReadouts(['골 축과의 거리 s', Math.round(S.sL) + ' km', '기압 경향 T', sg(T, 1) + ' hPa/6h', '중심 기압', fix(1008 + (T * S.tL) / 6, 1) + ' hPa']); }

  /* ======================================================
     장면 3: 고기압 발달
     ====================================================== */
  function highStep(dt) {
    const hx = S.hx == null ? XT0 - 1425 : S.hx; S.hxV = approach(S.hxV, hx, dt, 8);
    const s = hx - XT0, T = Thigh(s), pt = 1020 + (T * S.tH) / 6;
    S.pHV = approach(S.pHV, pt, dt, 6); if (Math.abs(S.pHV - pt) < 0.005) S.pHV = pt;
  }
  function drawHigh(t, dt) {
    const { A, M, X, Y } = upGeo('high'), { C, B } = rcOf('high');
    highStep(dt);
    const hx = S.hx == null ? XT0 - 1425 : S.hx, s = hx - XT0, T = Thigh(s);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, PHONE ? '☀️ 고기압 놓기' : '☀️ 지도를 눌러 지상 고기압(H)을 놓아 봐요', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
    D.label(A.x + A.w - 14, A.y + 22 * FS, S.tH === 0 ? '지금' : '+' + S.tH + '시간', { bg: '#0f172a', size: 12.5, pad: 8, align: 'right' });
    drawUpperMap(M, XT0, { view: VIEW, jet: true, zones: { a: 1 } });
    D.dashedLine(X(XT0), M.y + 6, X(XT0), M.y + M.h - 6, { color: '#2563eb', width: 2.4, dash: [6, 5] }); D.label(X(XT0), M.y + 14, '골 축', { bg: '#2563eb', size: 11.5, pad: 6 });
    if (S.hClick || S.hx != null) surfSym(X, Y, clamp(S.hxV, VIEW.x0 + 150, VIEW.x1 - 150), 1700, 'H', S.pHV);
    else D.text(M.x + M.w / 2, M.y + M.h / 2, '👆 눌러서 H를 놓아요', { size: 15, weight: 900, color: '#0f172a', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    legend(A.x + A.w - (PHONE ? 120 : 250), A.y + 24 * FS, [['#f97316', '발산(골 앞)'], ['#22c55e', '수렴(골 뒤)']]);
    // ----- C: 하강류
    card(C, null);
    D.text(C.x + 14, C.y + 22 * FS, '⬇️ 상층 수렴 → 하강 → 맑음', { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    const gx = C.x + 12, gw = C.w - 24, top = C.y + 38, bot = C.y + C.h - 30 * FS, mid = gx + gw / 2, sunny = clamp(T / 2, 0, 1);
    const sk = ctx.createLinearGradient(0, top, 0, bot); sk.addColorStop(0, mixc('#cbd5e1', '#7dd3fc', sunny)); sk.addColorStop(1, mixc('#e2e8f0', '#e0f2fe', sunny)); ctx.fillStyle = sk; rr(gx, top, gw, bot - top, 8).fill();
    ctx.fillStyle = '#a3a380'; ctx.fillRect(gx, bot, gw, 10); ctx.fillStyle = '#86a35c'; ctx.fillRect(gx, bot, gw, 4);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, top + 20); ctx.lineTo(gx + gw, top + 20); ctx.stroke(); ctx.setLineDash([]); D.text(gx + 6, top + 16, '500 hPa', { size: 11.5, weight: 800, color: '#475569', align: 'left' });
    const conv = Math.max(0, -Math.sin((TAU * s) / LW)) > 0.02;
    if (conv) { [-1, 1].forEach((sd) => arrowS(mid + sd * (gw * 0.36), top + 36, mid + sd * 14, top + 36, { color: '#16a34a', width: 4.5, head: 10 })); D.text(mid, top + 30, '상층 수렴', { size: 11.5, weight: 900, color: '#15803d' }); }
    ctx.save(); ctx.globalAlpha = 0.9 * (1 - sunny); [[0, 0, 22], [-22, 6, 17], [22, 6, 19]].forEach(([dx, dy, r]) => D.sphere(mid + dx, top + 90 + dy, r, '#94a3b8', { gloss: false })); ctx.restore();
    if (sunny > 0.05) { ctx.globalAlpha = sunny; D.sphere(gx + gw - 40, top + 62, 20, '#fbbf24', { gloss: false }); D.glow(gx + gw - 40, top + 62, 44, '#fde68a', 0.5); ctx.globalAlpha = 1; }
    if (T > 0.05) arrowS(mid, top + 50, mid, bot - 30, { color: '#d97706', width: 5, head: 12, alpha: 0.5 + 0.4 * sunny });
    [-1, 1].forEach((sd) => arrowS(mid + sd * 20, bot - 10, mid + sd * (26 + 60 * sunny), bot - 10, { color: '#15803d', width: 4, head: 9 }));
    D.text(mid, bot - 24, T > 0.05 ? '하강 · 단열 압축 · 지상에서 발산' : '하강이 약해요', { size: 11.5, weight: 800, color: '#334155' });
    D.text(C.x + C.w / 2, C.y + C.h - 8, 'H의 위치: 골 축의 ' + (s > 0 ? '동쪽' : '서쪽') + ' ' + Math.abs(Math.round(s)) + ' km', { size: 12.5, weight: 800, color: '#334155' });
    // ----- B
    card(B, '⏱️ 고기압의 중심 기압');
    const gcx = B.x + B.w / 2, gcy = B.y + (PHONE ? 140 : 132), gr = PHONE ? 88 : 80;
    ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(gcx, gcy, gr, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.arc(gcx, gcy, gr, Math.PI, Math.PI + Math.PI * clamp((S.pHV - 1000) / 40, 0, 1)); ctx.stroke(); ctx.lineCap = 'butt';
    D.text(gcx - gr, gcy + 20, '1000', { size: 11.5, weight: 700, color: '#64748b' }); D.text(gcx + gr, gcy + 20, '1040', { size: 11.5, weight: 700, color: '#64748b' });
    D.text(gcx, gcy - 14, fix(S.pHV, 1), { size: 30, weight: 900, color: '#b91c1c' }); D.text(gcx, gcy + 10, 'hPa', { size: 13, weight: 800, color: '#64748b' });
    const fl = makeFlow(B, 1, 40); fl.y = gcy + 36 * FS;
    fl.put('기압 경향 T = ' + sg(T, 1) + ' hPa/6h', { size: 14, color: T > 0.05 ? '#b91c1c' : '#1d4ed8', dy: 22 });
    fl.put(T >= 1.5 ? '상층 수렴으로 고기압이 강해져요' : T > 0.05 ? '조금 강해져요' : '약해져요(기압 하강)', { size: 12.5, color: '#475569', dy: 22 });
    fl.put('p = 1020 + T × (' + S.tH + ' h / 6 h)', { size: 12.5, color: '#64748b', dy: 20 });
  }
  function readHigh() { const hx = S.hx == null ? null : S.hx; setReadouts(['H의 위치', hx == null ? '아직 안 놓았어요' : (hx - XT0 > 0 ? '골의 동쪽 ' : '골의 서쪽 ') + Math.abs(Math.round(hx - XT0)) + ' km', '기압 경향 T', hx == null ? '—' : sg(Thigh(hx - XT0), 1) + ' hPa/6h', '중심 기압', hx == null ? '—' : fix(1020 + (Thigh(hx - XT0) * S.tH) / 6, 1) + ' hPa']); }

  /* ======================================================
     장면 4: 일기 예측 — 골의 도착 시각과 날씨 변화
     ====================================================== */
  const phaseOf = (t) => (t < T_ARR ? 'rain' : t < T_ARR + 20 ? 'nw' : 'clear');
  function fcstStep(dt) {
    if (S.play) { S.tf = Math.min(72, S.tf + dt * 9); if (S.tf >= 72) { S.play = false; syncPlay(); } }
    S.tfV = approach(S.tfV, S.tf, dt, 12); if (Math.abs(S.tfV - S.tf) < 0.02) S.tfV = S.tf;
  }
  const PCURVE = (t) => 1010 - 9 * Math.exp(-Math.pow((t - 26) / 14, 2)) + 6 * smooth((t - 36) / 30);
  const TCURVE = (t) => 12 + 3 * smooth(t / 24) - 11 * smooth((t - T_ARR + 2) / 18);
  function drawFcst(t, dt) {
    const { A, B } = rcOf('fcst'), g = upGeo('fcst');
    fcstStep(dt);
    const tt = S.tfV, xt = WV.xk - DIST + SPEED * tt, M = g.M, ph = phaseOf(tt);
    card(A, null);
    D.text(A.x + 14, A.y + 24 * FS, S.fview === 'sat' ? (PHONE ? '🛰️ 대체: 위성 영상' : '🛰️ 대체 활동: 위성 영상 + 지상 일기도(예시)') : (PHONE ? '🗺️ 500 hPa 일기도 (예시)' : '🗺️ 500 hPa 일기도(예시): 한반도 서쪽 ' + DIST + ' km의 골'), { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
    D.label(A.x + A.w - 14, A.y + 22 * FS, '+' + Math.round(tt) + '시간', { bg: '#0f172a', size: 12.5, pad: 8, align: 'right' });
    if (S.fview === 'sat') drawSat(M, xt, g); else drawUpperMap(M, xt, { view: VIEW, jet: true, zones: { a: 0.8 } });
    const X = g.X, Y = g.Y;
    ctx.save(); rr(M.x, M.y, M.w, M.h, 10).clip();
    D.dashedLine(X(xt), M.y, X(xt), M.y + M.h, { color: '#2563eb', width: 2.4, dash: [6, 5] });
    ctx.restore();
    D.label(clamp(X(xt), M.x + 30, M.x + M.w - 30), M.y + 16, (PHONE ? '골 축' : '골 축 (이동 속도 10 m/s = ' + SPEED + ' km/h)'), { bg: '#2563eb', size: 11.5, pad: 6 });
    if (S.fview !== 'sat') { const lx = clamp(xt + 1000, VIEW.x0 + 150, VIEW.x1 - 150); surfSym(X, Y, lx, 1750, 'L', 1004 - 0); }
    // 골과 한반도 사이 거리
    if (xt < WV.xk) { const yy = Y(PHONE ? 2300 : 2620); arrowS(X(xt), yy, X(WV.xk) - 10, yy, { color: '#0f172a', width: 3, head: 9 }); arrowS(X(WV.xk) - 10, yy, X(xt), yy, { color: '#0f172a', width: 3, head: 9 }); D.label((X(xt) + X(WV.xk)) / 2, yy - 12, '한반도까지 ' + Math.max(0, Math.round(WV.xk - xt)).toLocaleString('ko-KR') + ' km', { bg: '#0f172a', size: 12, pad: 7 }); }
    // ----- B: 타임라인
    card(B, null);
    const x0 = B.x + 16, cardsY = B.y + 14, vert = PHONE;
    const cw = vert ? B.w - 32 : (B.w - 32 - 24) / 3, ch = vert ? 56 : 70;
    PAIRS.forEach(([id, label], i) => {
      const on = ph === id, cx = vert ? x0 : x0 + i * (cw + 12), cy = vert ? cardsY + i * (ch + 8) : cardsY;
      D.shadow(() => { ctx.fillStyle = on ? '#fff7ed' : '#f8fafc'; rr(cx, cy, cw, ch, 12).fill(); }, { blur: on ? 8 : 3, y: 2 });
      ctx.strokeStyle = on ? '#f97316' : '#cbd5e1'; ctx.lineWidth = on ? 3 : 1.5; rr(cx, cy, cw, ch, 12).stroke();
      const ic = id === 'rain' ? '☁️🌧️' : id === 'nw' ? '🌬️❄️' : '☀️';
      D.text(cx + 12, cy + ch / 2 + 8, ic, { size: 24, weight: 700, align: 'left' });
      { const nl = wrapLines(label, cw - 84, 12.5, 800).length, lh = 12.5 * FS * 1.3; drawWrap(cx + 76, cy + ch / 2 - ((nl - 1) * lh) / 2 + 4, label, cw - 84, 12.5, { color: on ? '#9a3412' : '#475569', align: 'left', weight: 800 }); }
    });
    let y = vert ? cardsY + 3 * (ch + 8) + 8 : cardsY + ch + 22;
    // 예시 곡선: 기압과 기온
    const gw = B.w - 32, gh = vert ? 96 : 60, gx = x0, gy = y + 12;
    ctx.fillStyle = '#f8fafc'; rr(gx, gy, gw, gh, 8).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; rr(gx, gy, gw, gh, 8).stroke();
    const px = (h) => gx + 8 + ((gw - 16) * h) / 72;
    [0, 24, 48, 72].forEach((h) => { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(px(h), gy + 4); ctx.lineTo(px(h), gy + gh - 4); ctx.stroke(); D.text(px(h), gy + gh + 13, h + 'h', { size: 11, weight: 700, color: '#64748b' }); });
    const curve = (fn, lo, hi, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); for (let h = 0; h <= 72; h += 2) { const yy = gy + gh - 6 - ((fn(h) - lo) / (hi - lo)) * (gh - 12); h ? ctx.lineTo(px(h), yy) : ctx.moveTo(px(h), yy); } ctx.stroke(); };
    curve(PCURVE, 998, 1018, '#2563eb'); curve(TCURVE, 0, 18, '#dc2626');
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px(tt), gy + 2); ctx.lineTo(px(tt), gy + gh - 2); ctx.stroke();
    D.text(gx + 12, gy + 14, '기압(파랑) · 기온(빨강) 예시', { size: 11.5, weight: 800, color: '#475569', align: 'left' });
    y = gy + gh + 30 * FS;
    const note2 = '골이 한반도를 지나는 때(t = ' + (S.showArr ? fix(T_ARR, 1) + ' h' : '?') + '): 골 앞쪽에서는 구름과 비, 지난 뒤에는 북서풍과 기온 하강, 능이 다가오면 맑아져요. (예시 자료 · 오늘의 상층 일기도는 기상청 날씨누리에서 확인해 보세요)';
    para(x0, y, B.w - 32, note2, 12.5, '#475569', 700);
  }
  function readFcst() { const ph = phaseOf(S.tfV); setReadouts(['경과 시간', Math.round(S.tfV) + ' 시간', '골 ~ 한반도 거리', Math.max(0, Math.round(DIST - SPEED * S.tfV)).toLocaleString('ko-KR') + ' km', '날씨', ph === 'rain' ? '구름·비' : ph === 'nw' ? '북서풍·기온 하강' : '맑음']); }
  function mapClick(p) {
    if (S.mode !== 'high') return false;
    const g = upGeo('high');
    if (p.x < g.M.x || p.x > g.M.x + g.M.w || p.y < g.M.y || p.y > g.M.y + g.M.h) return false;
    S.hx = clamp(g.ix(p.x), VIEW.x0 + 150, VIEW.x1 - 150); S.hClick = true; Sound.tick();
    return false;
  }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const DV = [{ id: 'D', label: '발산 구역' }, { id: 'C', label: '수렴 구역' }];
  const selDiv = makeSelects($('#selDiv'), PINS.map(([n, x, kind, nm]) => ({ id: n, label: '<span><b>' + n + '번</b> ' + nm + '</span>' })), DV, { 1: 'D', 2: 'C', 3: 'C', 4: 'D' }, () => { });
  const stpNet = makeStepper2($('#stpNet'), { min: -8, max: 8, step: 0.5, big: 1, dec: 1, value: 0, unit: 'hPa/6h' });
  const timeCh = makeChoice($('#timeSw'), [{ id: '0', label: '지금' }, { id: '12', label: '12시간 뒤' }, { id: '24', label: '24시간 뒤' }], (v) => { S.tL = +v; });
  const timeChH = makeChoice($('#timeSwH'), [{ id: '0', label: '지금' }, { id: '12', label: '12시간 뒤' }, { id: '24', label: '24시간 뒤' }], (v) => { S.tH = +v; });
  const viewFCh = makeChoice($('#viewF'), [{ id: 'map', label: '🗺️ 500 hPa 일기도' }, { id: 'sat', label: '🛰️ 위성 영상 (대체)' }], (v) => { S.fview = v; });
  ['timeSw', 'timeSwH'].forEach((id) => $('#' + id).classList.add('opt-grid', 'c3')); $('#viewF').classList.add('opt-grid');
  const numP = makeNum($('#numP'), { label: '중심 기압', unit: 'hPa', step: 1 });
  const numT = makeNum($('#numT'), { label: '도착까지', unit: '시간', step: 0.1 });
  const ordW = makeOrder($('#ordW'), [{ id: 'clear', label: '☀️ 맑음 (능이 다가올 때)' }, { id: 'rain', label: '☁️🌧️ 구름·비 (골의 앞쪽)' }, { id: 'nw', label: '🌬️❄️ 북서풍·기온 하강 (골 통과 후)' }], ['rain', 'nw', 'clear'], () => { });
  SciSim.bindRange($('#sD'), $('#oD'), (v) => fix(+v, 1) + ' hPa/6h', (v) => { S.D = +v; });
  SciSim.bindRange($('#sC'), $('#oC'), (v) => fix(+v, 1) + ' hPa/6h', (v) => { S.C = +v; });
  const posFmt = (v) => (+v > 0 ? '골의 동쪽 ' + v + ' km' : +v < 0 ? '골의 서쪽 ' + Math.abs(v) + ' km' : '골 바로 아래');
  SciSim.bindRange($('#sPos'), $('#oPos'), posFmt, (v) => { S.sL = +v; });
  SciSim.bindRange($('#sT'), $('#oT'), (v) => v + '시간 뒤', (v) => { S.tf = +v; S.play = false; syncPlay(); });
  const setD = (v) => { S.D = v; S.DV = v; setSlider($('#sD'), $('#oD'), v, (x) => fix(+x, 1) + ' hPa/6h'); };
  const setC = (v) => { S.C = v; S.CV = v; setSlider($('#sC'), $('#oC'), v, (x) => fix(+x, 1) + ' hPa/6h'); };
  const setPos = (v) => { S.sL = v; S.sLV = v; setSlider($('#sPos'), $('#oPos'), v, posFmt); };
  const setTL = (v) => { S.tL = v; timeCh.set(String(v)); };
  const setTH = (v) => { S.tH = v; timeChH.set(String(v)); };
  const setTf = (v) => { S.tf = v; S.tfV = v; setSlider($('#sT'), $('#oT'), v, (x) => x + '시간 뒤'); };
  const setFview = (v) => { S.fview = v; viewFCh.set(v); };
  function syncPlay() { $('#bPlay').textContent = S.play ? '⏸️ 멈춤' : '▶ 시간 흐르기'; }
  $('#bPlay').addEventListener('click', () => { Sound.click(); if (!S.play && S.tf >= 72) setTf(0); S.play = !S.play; syncPlay(); });
  function syncZones() { $('#bZones').textContent = S.zonesOn ? '🙈 구역 색 숨기기' : '💡 구역 색으로 확인'; }
  $('#bZones').addEventListener('click', () => { Sound.click(); S.zonesOn = !S.zonesOn; syncZones(); });
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'high') mapClick(p); return false; },
    hover(p) { if (S.mode !== 'high') return ''; const g = upGeo('high'); return p.x > g.M.x && p.x < g.M.x + g.M.w && p.y > g.M.y && p.y < g.M.y + g.M.h ? 'crosshair' : ''; },
  });

  const MODE_LABEL = { div: '↔️ 상층 발산', low: '🌀 저기압 발달', high: '☀️ 고기압 발달', fcst: '🔮 일기 예측' };
  const FREE_KEYS = { div: ['sD', 'sC', 'bZones'], low: ['sPos', 'timeSw'], high: ['timeSwH', 'hNote'], fcst: ['sT', 'bPlay', 'viewF'] };
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
  const lowOk = () => Tlow(S.sL) <= -1.3 + 1e-9;
  const highOk = () => S.hx != null && Thigh(S.hx - XT0) >= 1.5 - 1e-9;
  function resetStep(li) {
    hideHint(); parts.clear();
    setD(0); setC(0); S.zonesOn = false; syncZones(); S.showNet = false; selDiv.reset(); stpNet.reset(); S.mh = 0;
    setPos(0); setTL(0); S.pLV = 1008; numP.reset();
    S.hx = null; S.hClick = false; setTH(0); S.hxV = XT0 - 1425; S.pHV = 1020;
    setTf(0); S.play = false; syncPlay(); setFview('map'); S.showArr = false; numT.reset(); ordW.reset();
    if (li === 0) { setMode('div'); setCtl(['sD', 'sC', 'bZones']); showHint('등고선 사이의 알갱이가 퍼지는지 모이는지 봐요', 5200); }
    else if (li === 1) { setMode('low'); setCtl(['sPos', 'timeSw']); showHint('골 축과의 거리를 바꿔 중심 기압이 어떻게 변하는지 봐요', 5200); }
    else if (li === 2) { setMode('high'); setCtl(['timeSwH', 'hNote']); showHint('지도를 눌러 지상 고기압(H)을 놓아 봐요', 5200); }
    else { setMode('fcst'); setCtl(['sT', 'bPlay', 'viewF']); showHint('시간을 흘려 골이 한반도에 닿는 때를 봐요', 5200); }
    updateCtl();
  }
  const levels = [
    {
      title: '상층 발산: 공기 기둥이 가벼워져요', short: '상층 발산', icon: '↔️', phase: '분석', features: ['div'],
      intro: '<p class="si-q">❓ 탐구 질문: 지상 저기압과 고기압은 왜 상층 파동의 어느 자리에서 생기고 커질까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 지상 기압은 위에 있는 <b>공기 기둥의 무게</b>이고(정역학 균형), 지상 저기압에서는 바람이 <b>수렴</b>해 공기가 올라간다고 배웠어요. 또 ‘행성파와 편서풍 파동’에서 골과 능, 평균 약 10 m/s의 동진을 배웠어요.</div>' +
        '<p>상층에서 공기가 퍼져 나가면(<b>발산</b>) 기둥의 공기가 줄어 지상 기압이 <b>내려가요</b>. 지상으로 바람이 모여 들어오는(<b>수렴</b>) 만큼은 다시 채워 줘요. 그래서 <b>지상 기압 변화 = 지상 수렴 유입 − 상층 발산 유출</b>(hPa/6h)이에요. 편서풍 파동에서는 <b>골의 동쪽(앞)</b>이 발산 구역, <b>골의 서쪽(뒤)</b>이 수렴 구역이에요.</p>',
      setup() { resetStep(0); },
      recap: '상층 발산이 지상 수렴보다 크면 지상 기압이 내려가요. 골의 동쪽(앞)은 발산, 서쪽(뒤)은 수렴 구역이에요.',
      summary: '<ul><li>지상 기압 = 위 공기 기둥의 무게. <b>지상 기압 변화 = 지상 수렴 유입 − 상층 발산 유출</b> (6시간당 hPa 환산).</li><li>예: 상층 발산 4.5, 지상 수렴 2.5 hPa/6h → <b>−2.0 hPa/6h</b> → 24시간에 −8 hPa (1008 → 1000 hPa). 상층 수렴이 발산을 넘으면 지상 기압이 올라가요(고기압 강화).</li><li>파동에서 <b>골의 동쪽(앞)</b>: 등고선 간격이 넓어지며 공기가 퍼지는 <b>발산</b> → 저기압 발달에 유리. <b>골의 서쪽(뒤)</b>: <b>수렴</b> → 고기압 발달에 유리.</li><li>저기압은 지상에서 공기가 그냥 가벼워져서 생기는 것이 아니에요. 상층의 발산이 기둥의 질량을 줄이는 거예요.</li></ul>',
      missions: [
        {
          title: '발산·수렴 구역 찾기', manual: true,
          goal: '파동 위의 <b>1~4번</b> 네 곳이 상층 <b>발산</b> 구역인지 <b>수렴</b> 구역인지 골라요.',
          hint: '골의 동쪽(앞)은 등고선 간격이 넓어지며 공기가 퍼지는 발산, 골의 서쪽(뒤)은 수렴이에요. 능의 서쪽은 골의 동쪽과 같은 구역이에요. ‘구역 색으로 확인’ 단추로 확인할 수 있어요.',
          setup() { selDiv.reset(); S.zonesOn = false; syncZones(); setMode('div'); setCtl(['bZones', 'selDiv']); },
          status: () => mark(selDiv.ok()) + ' 고른 곳 ' + selDiv.count() + ' / 4',
          check() {
            if (!selDiv.complete()) return '4곳을 모두 골라 주세요. (지금 ' + selDiv.count() + '곳)';
            if (!selDiv.ok()) { selDiv.mark(selDiv.wrong()); return '빨간 줄이 달라요. 골의 동쪽(앞)과 능의 서쪽은 발산, 골의 서쪽(뒤)과 능의 동쪽은 수렴이에요.'; }
            return true;
          },
          explain: '<b>1번(골의 동쪽)</b>과 <b>4번(능의 서쪽)</b>은 골과 능 사이로 같은 <b>발산</b> 구역이고, <b>2번(골의 서쪽)</b>과 <b>3번(능의 동쪽)</b>은 능과 골 사이로 같은 <b>수렴</b> 구역이에요. 발산 구역에서는 등고선 간격이 넓어지며 공기가 퍼져요.',
        },
        {
          title: '지상 기압 변화 계산',
          goal: '<b>상층 발산 4.5</b>, <b>지상 수렴 2.5 hPa/6h</b>로 맞추고, 지상 기압 변화(= 수렴 − 발산)를 계산해 입력해요.',
          hint: '두 슬라이더를 4.5와 2.5로 맞춰요. 지상 기압 변화 = 2.5 − 4.5 = −2.0 hPa/6h예요. 입력 칸의 단추로 −2.0을 맞춰요.',
          setup() { setD(0); setC(0); S.showNet = false; stpNet.reset(); setMode('div'); setCtl(['sD', 'sC', 'stpNet']); },
          check: () => S.D === 4.5 && S.C === 2.5 && Math.abs(stpNet.value + 2.0) < 0.05, hold: 0.8,
          status: () => mark(S.D === 4.5) + ' 발산 ' + fix(S.D, 1) + ' (목표 4.5) · ' + mark(S.C === 2.5) + ' 수렴 ' + fix(S.C, 1) + ' (목표 2.5) · ' + mark(Math.abs(stpNet.value + 2.0) < 0.05) + ' 입력 ' + sg(stpNet.value, 1),
          explain: '지상 기압 변화 = 2.5 − 4.5 = <b>−2.0 hPa/6h</b>예요. 이 상태가 24시간 이어지면 <b>−8 hPa</b>(1008 → 1000 hPa)가 돼요. 상층 발산이 지상 수렴보다 커서 기둥의 공기가 줄어든 거예요.',
        },
        {
          type: 'quiz', title: '기압이 내려가는 까닭',
          goal: '상층에서 공기가 퍼져 나갈 때 <b>지상 기압이 내려가는</b> 까닭은?',
          setup() { S.showNet = true; setD(4.5); setC(2.5); setMode('div'); setCtl(['sD', 'sC']); },
          choices: ['위에 있던 공기 기둥의 질량이 줄어서 기둥의 무게(지상 기압)가 작아지기 때문이에요', '저기압은 지상에서 공기가 가벼워져서 그냥 생기고, 상층 발산은 관계가 없어요', '상층에서 퍼진 공기가 지표면을 눌러서 기압이 내려가요', '지상 수렴은 기압을 낮추고 상층 발산은 기압을 높여요'],
          answer: 0,
          feedback: ['', '지상 기압은 위 공기 기둥의 무게예요. 상층에서 공기가 빠져나가면 기둥의 질량이 줄어요. 화면의 기둥이 얇아져요.', '퍼져 나간 공기는 기둥에서 빠져나가요. 오히려 누르는 무게가 줄어드는 거예요.', '반대예요. 지상 수렴은 기둥의 공기를 채워 기압을 올리고, 상층 발산은 공기를 빼서 기압을 내려요.'],
          explain: '기둥 위쪽에서 공기가 <b>발산</b>하면 기둥의 공기 질량이 줄어 <b>지상 기압이 내려가요</b>. 지상 수렴으로 들어오는 공기가 이를 일부 채우지만, 발산이 더 크면 순수하게 기압이 내려가 저기압이 발달해요.',
        },
      ],
    },
    {
      title: '저기압 발달: 골의 동쪽에서 커져요', short: '저기압 발달', icon: '🌀', phase: '모형', features: ['low'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 골의 동쪽(앞)이 상층 발산 구역이라서 그 아래 지상 기압이 내려간다고 했어요. 지상 저기압이 골에 대해 어디에 있느냐가 중요해요.</div>' +
        '<p>상층 발산은 골 앞쪽에서 가장 커요. 이 모형에서 지상 기압 경향은 <b>T = 2.5 − 4.5 sin(2πs/L)</b> (hPa/6h, s: 골 축에서 저기압까지 동쪽 거리, L = 5700 km)이에요. s ≈ 1400 km(≈ L/4)에서 T = −2.0이라 24시간에 8 hPa이 내려가요. 골 축이 저기압 <b>바로 위</b>에 오면 발산이 0이 되어 저기압은 더 이상 발달하지 않고, 지상 수렴이 채워서 약해져요. (전선도 폐색돼요.)</p>',
      setup() { resetStep(1); },
      recap: '지상 저기압은 상층 골의 동쪽(앞)에 있을 때 발달하고, 골 축이 바로 위로 오면 더 이상 발달하지 못하고 약해져요.',
      summary: '<ul><li>지상 저기압이 상층 <b>골의 동쪽</b>(발산 구역)에 있으면 중심 기압이 내려가며 <b>발달</b>해요. 예: 골에서 동쪽으로 약 1400 km에서 T = −2.0 hPa/6h → 12시간 1004, 24시간 <b>1000 hPa</b> (처음 1008).</li><li>골 축이 지상 저기압 <b>바로 위</b>에 오면 상층 발산이 사라지고 지상 수렴이 채워서 <b>쇠퇴</b>해요(전선 폐색).</li><li>골 축은 <b>높이에 따라 서쪽으로 기울어요</b>. 그래서 지상 저기압은 상층 골 축의 동쪽 아래에 놓여요.</li><li>파동은 한랭 전선 뒤로 한기를 남하시키고 온난 전선 앞으로 난기를 북상시켜 중위도 저기압의 에너지원이 돼요.</li></ul>',
      missions: [
        {
          title: '발달하는 위치 찾기',
          goal: '지상 저기압을 상층 골의 <b>동쪽</b>에 놓아, 기압 경향 <b>T가 −1.3 hPa/6h 이하</b>(뚜렷이 발달)가 되게 해요.',
          hint: '골 축과의 거리 슬라이더를 오른쪽(골의 동쪽)으로 옮겨요. 골의 동쪽 약 950~1900 km에서 T ≤ −1.3이고, 1425 km 부근이 가장 잘 발달해요.',
          setup() { setPos(0); setTL(0); setMode('low'); setCtl(['sPos', 'timeSw']); },
          check: () => lowOk(), hold: 0.8,
          status: () => mark(lowOk()) + ' ' + posFmt(S.sL) + ' → T = ' + sg(Tlow(S.sL), 1) + ' hPa/6h (목표 −1.3 이하)',
          explain: '골의 동쪽 약 1425 km(= L/4)에서 상층 발산이 가장 커서 <b>T = 2.5 − 4.5 = −2.0 hPa/6h</b>예요. 골의 서쪽이거나 골 바로 아래이면 상층 발산이 없어서 기압이 내려가지 않아요.',
        },
        {
          title: '24시간 뒤의 중심 기압',
          goal: '저기압을 <b>골의 동쪽 1425 km</b>에 놓고 <b>24시간 뒤</b>로 맞춘 뒤, 중심 기압(처음 1008 hPa)을 읽어 <b>hPa</b> 단위로 입력해요.',
          hint: '슬라이더를 ‘골의 동쪽 1425 km’로, 시간을 ‘24시간 뒤’로 맞춰요. 계기판의 숫자를 읽거나 1008 + (−2.0) × 4 = 1000을 계산해요.',
          setup() { setPos(0); setTL(0); numP.reset(); setMode('low'); setCtl(['sPos', 'timeSw', 'numP']); },
          check: () => S.sL === 1425 && S.tL === 24 && numP.near(1000, 0.5), hold: 0.8,
          status: () => mark(S.sL === 1425) + ' ' + posFmt(S.sL) + ' (목표 1425 km) · ' + mark(S.tL === 24) + ' ' + (S.tL === 0 ? '지금' : S.tL + '시간 뒤') + ' · ' + mark(S.sL === 1425 && S.tL === 24 && numP.near(1000, 0.5)) + ' 입력 ' + (numP.has() ? numP.value + ' hPa' : '—'),
          explain: '6시간마다 −2.0 hPa이므로 24시간(4번)이면 <b>−8 hPa</b>이에요. 중심 기압은 1008 − 8 = <b>1000 hPa</b>이에요. (12시간 뒤에는 1004 hPa)',
        },
        {
          type: 'quiz', title: '골이 바로 위로 오면?',
          goal: '상층 골 축이 지상 저기압 <b>바로 위</b>에 오면 저기압이 더 이상 <b>발달하지 않고 약해지는</b> 까닭은?',
          setup() { setPos(0); setTL(24); setMode('low'); setCtl(['sPos', 'timeSw']); },
          choices: ['골 축 바로 아래에서는 상층 발산이 사라지고 지상 수렴이 공기를 채워서 기압이 올라가고, 전선도 폐색되기 때문이에요', '골이 위에 오면 지상으로 더 많은 공기가 빠져나가서 기압이 더 내려가요', '골이 위에 오면 상층 발산이 최대가 되어 가장 빨리 발달해요', '골이 위에 오면 지상 마찰이 없어져서 저기압이 약해져요'],
          answer: 0,
          feedback: ['', '골 바로 아래는 상층 발산이 0이에요. 발산이 있어야 기둥의 공기가 줄어요. 화면에서 s = 0일 때 T가 +2.5가 돼요.', '발산이 최대인 곳은 골의 동쪽 약 L/4 지점이에요. 골 바로 아래에서는 발산이 0이에요.', '마찰은 계속 있어요. 핵심은 상층 발산이 없어지는 것이에요.'],
          explain: '상층 발산은 <b>골의 동쪽</b>에서 크고 골 축 바로 아래에서는 <b>0</b>이에요. 발산이 없으면 지상 수렴이 공기를 채워 기압이 올라가고(T = +2.5), 전선도 <b>폐색</b>돼 저기압이 쇠퇴해요.',
        },
      ],
    },
    {
      title: '고기압 발달: 골의 서쪽에서 커져요', short: '고기압 발달', icon: '☀️', phase: '모형', features: ['high'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 골의 동쪽에서는 상층 발산으로 저기압이 발달했어요. 반대로 <b>골의 서쪽</b>(능의 동쪽)은 상층 <b>수렴</b> 구역이에요.</div>' +
        '<p>상층에서 공기가 모여들면(<b>수렴</b>) 기둥에 공기가 쌓여 지상 기압이 <b>올라가요</b>. 모인 공기는 <b>하강</b>하고, 내려오며 <b>단열 압축</b>되어 따뜻해지면서 구름이 사라져 <b>맑아져요</b>. 지상에서는 바람이 중심에서 바깥으로 <b>발산</b>해요. 이 모형에서 고기압의 기압 경향은 <b>T = −2.5 + 4.5 × (수렴의 크기)</b>(hPa/6h)이고, 골에서 서쪽으로 약 1400 km에서 T = +2.0이에요. 이렇게 골 뒤쪽에서 커지는 지상 고기압이 한랭하고 이동하는 고기압이에요.</p>',
      setup() { resetStep(2); },
      recap: '골의 서쪽(상층 수렴 구역)에서 하강류가 생겨 지상 고기압이 강해지고 맑아져요.',
      summary: '<ul><li><b>골의 서쪽</b>(능의 동쪽)은 상층 <b>수렴</b> 구역: 기둥에 공기가 모여 지상 기압이 올라가요.</li><li>수렴한 공기는 <b>하강</b> → <b>단열 압축</b>으로 기온이 올라 구름이 사라져 <b>맑아요</b>. 지상 고기압 중심에서는 바람이 바깥으로 <b>발산</b>(시계 방향 + 바깥쪽)해요.</li><li>예: 골의 서쪽 약 1400 km에서 T = +2.0 hPa/6h → 24시간에 +8 hPa (1020 → 1028 hPa).</li><li>이런 고기압은 한랭한 이동성 고기압으로 한반도로 접근할 수 있어요.</li></ul>',
      missions: [
        {
          title: '고기압이 커지는 곳',
          goal: '지도를 눌러 지상 고기압(H)을 <b>골의 서쪽</b>(상층 수렴 구역)에 놓아, 기압 경향 <b>T가 +1.5 hPa/6h 이상</b>(뚜렷이 발달)이 되게 해요.',
          hint: '골 축(파란 점선)의 서쪽, 초록색 수렴 구역 한가운데를 눌러요. 골에서 서쪽으로 약 1000~1850 km에서 T ≥ +1.5이고, 약 1425 km가 가장 좋아요.',
          setup() { S.hx = null; S.hClick = false; setTH(0); setMode('high'); setCtl(['timeSwH', 'hNote']); },
          check: () => highOk(), hold: 0.8,
          status: () => (S.hx == null ? mark(false) + ' 아직 H를 놓지 않았어요' : mark(highOk()) + ' H는 골의 ' + (S.hx - XT0 > 0 ? '동쪽 ' : '서쪽 ') + Math.abs(Math.round(S.hx - XT0)) + ' km → T = ' + sg(Thigh(S.hx - XT0), 1) + ' hPa/6h (목표 +1.5 이상)'),
          explain: '골의 서쪽 약 1425 km에서 상층 수렴이 가장 커서 <b>T = −2.5 + 4.5 = +2.0 hPa/6h</b>예요. 골의 동쪽(발산 구역)에서는 오히려 기압이 내려가요.',
        },
        {
          type: 'quiz', title: '고기압에서는 왜 맑을까?',
          goal: '지상 고기압 중심에서 <b>바람이 바깥으로 퍼져 나가고</b> <b>구름이 사라지는</b> 까닭은?',
          setup() { if (S.hx == null) S.hx = XT0 - 1425; S.hClick = true; setTH(24); setMode('high'); setCtl(['timeSwH', 'hNote']); },
          choices: ['상층에서 공기가 수렴해 하강하고, 하강하는 공기가 단열 압축으로 따뜻해져 구름이 사라져요. 중심에서는 지상 공기가 바깥으로 발산해요', '고기압에서는 바람이 불지 않아서 구름이 만들어지지 않아요', '하강하는 공기는 단열 팽창으로 차가워져서 구름이 사라져요', '고기압은 지상에서 공기가 바깥으로 빠져나가서 기압이 높아져요'],
          answer: 0,
          feedback: ['', '고기압에서도 바람은 불어요(시계 방향, 바깥쪽 성분). 하강류가 있어서 구름이 생기지 않아요.', '하강하는 공기는 압력이 커지면서 단열 압축으로 <b>따뜻해져요</b>. 팽창해서 식는 것은 상승하는 공기예요.', '지상에서 공기가 빠져나가도 상층 수렴이 더 많은 공기를 모아 주기 때문에 기압이 올라가요.'],
          explain: '상층 <b>수렴</b> → <b>하강</b> → <b>단열 압축</b>(기온 상승, 상대 습도 감소) → 구름 소멸 → <b>맑음</b>이에요. 지상에서는 공기가 중심에서 바깥으로 <b>발산</b>하며 시계 방향으로 불어요.',
        },
      ],
    },
    {
      title: '일기 예측: 골이 언제 올까?', short: '일기 예측', icon: '🔮', phase: '확인', features: ['fcst'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 골의 앞쪽(동쪽)에서는 저기압이 발달해 구름과 비가 오고, 뒤쪽(서쪽)에서는 고기압이 발달해 맑아진다고 했어요. 이제 이 규칙으로 한반도의 날씨를 예측해 봐요.</div>' +
        '<p>예시 상층 일기도에서 골이 한반도 서쪽 <b>1500 km</b>에 있고, 평균 <b>10 m/s = 36 km/h</b>로 동진해요. 골이 한반도에 닿는 시각은 거리 ÷ 속도예요. 상층 일기도를 구하기 어려우면 <b>지상 일기도와 위성 영상</b>의 구름대 이동으로 1~2일 뒤를 예측하는 대체 활동도 할 수 있어요. 모든 자료는 <b>예시 자료</b>예요. 오늘의 상층 일기도는 기상청 날씨누리에서 확인해 보세요.</p>',
      setup() { resetStep(3); },
      recap: '골이 한반도에 닿는 데 약 42시간 걸려요. 골 앞쪽의 구름·비 → 골 통과 후 북서풍·기온 하강 → 능이 다가오면 맑아요.',
      summary: '<ul><li>골이 서쪽 1500 km에서 10 m/s = 36 km/h로 동진하면 한반도 도착까지 1500 km ÷ 36 km/h ≈ <b>42시간</b>(41.7시간)이에요.</li><li><b>날씨 순서</b>: 골의 앞쪽에서 지상 저기압 접근(기압 하강), <b>구름·비</b> → 골 통과 후 <b>북서풍과 기온 하강</b>, 기압 상승 → 능이 다가오며 <b>맑음</b>.</li><li>파동의 진폭이 커지면 한파·폭염·집중호우 같은 극단 날씨가 늘 수 있어요. 파동의 속도와 진폭이 조금만 달라져도 도착 시각이 달라져서 예측에는 <b>불확실성</b>이 있어요.</li><li>상층 일기도가 없을 때는 지상 일기도와 위성 영상으로 1~2일 뒤를 예측해요.</li></ul>',
      missions: [
        {
          title: '골이 도착하는 시각',
          goal: '골이 한반도 서쪽 <b>1500 km</b>에서 <b>36 km/h</b>(10 m/s)로 동진할 때, 한반도에 닿기까지 걸리는 시간을 <b>시간</b> 단위로 계산해 입력해요.',
          hint: '시간 = 거리 ÷ 속도 = 1500 km ÷ 36 km/h = 41.7시간이에요. 약 42를 입력해요. (시간 슬라이더로 골이 한반도에 닿는 때를 확인해 봐요.)',
          setup() { numT.reset(); S.showArr = false; setTf(0); S.play = false; syncPlay(); setFview('map'); setMode('fcst'); setCtl(['sT', 'bPlay', 'numT']); },
          check: () => numT.near(DIST / SPEED, 1.0), hold: 0.8,
          status: () => mark(numT.near(DIST / SPEED, 1.0)) + ' 입력 ' + (numT.has() ? numT.value + ' 시간' : '—') + ' (1500 km ÷ 36 km/h)',
          explain: '10 m/s = 36 km/h이므로 <b>1500 ÷ 36 ≈ 41.7시간(약 42시간)</b> 뒤에 골 축이 한반도를 지나가요. 이 시각 전에는 골 앞쪽의 구름·비, 이후에는 북서풍과 기온 하강이 나타나요.',
        },
        {
          title: '날씨 변화 순서', manual: true,
          goal: '골이 지나가는 동안 한반도의 날씨 변화 카드 세 장을 <b>시간 순서대로</b> 눌러요.',
          hint: '골이 오기 전(골의 앞쪽)에는 구름과 비, 지나간 뒤에는 북서풍과 기온 하강, 능이 다가오면 맑아요. 시간 슬라이더를 움직여 카드가 켜지는 순서를 확인해 봐요.',
          setup() { S.showArr = true; ordW.reset(); setMode('fcst'); setCtl(['sT', 'bPlay', 'ordW']); },
          status: () => mark(ordW.ok()) + ' 누른 순서 ' + ordW.seq.length + ' / 3',
          check() {
            if (!ordW.complete()) return '세 카드를 모두 눌러 주세요. (지금 ' + ordW.seq.length + '장)';
            if (!ordW.ok()) { ordW.mark(ordW.seq[ordW.firstWrong()]); return '순서가 달라요. 골의 앞쪽 → 골이 지난 뒤 → 능이 다가올 때 순서예요.'; }
            return true;
          },
          explain: '<b>① 구름·비</b>(골의 앞쪽: 상층 발산, 지상 저기압 접근) → <b>② 북서풍·기온 하강</b>(골 통과 후: 한기 남하) → <b>③ 맑음</b>(능이 다가옴: 상층 수렴, 하강류)의 순서예요.',
        },
        {
          type: 'quiz', title: '극단 날씨와 예측의 불확실성',
          goal: '편서풍 파동의 <b>진폭이 커지면</b> 극단 날씨가 늘 수 있는 까닭과, 예측에 <b>불확실성</b>이 있는 까닭은?',
          setup() { S.showArr = true; setMode('fcst'); setCtl(['sT', 'bPlay', 'viewF']); },
          choices: ['진폭이 커지면 한기가 더 남쪽으로, 난기가 더 북쪽으로 오고 파동이 오래 머물 수 있어요. 파동의 속도와 진폭이 조금만 달라져도 도착 시각과 날씨가 달라져서 예측에는 불확실성이 있어요', '진폭이 커지면 남북 기온 차가 사라져서 날씨가 더 일정해져요. 그래서 예측이 쉬워요', '진폭은 날씨와 관계가 없고, 날씨는 지상 마찰로만 정해져요', '파동은 정확히 10 m/s로만 움직여서 예측에 불확실성이 없어요'],
          answer: 0,
          feedback: ['', '진폭이 커지면 남북 기온 차가 파동을 따라 더 크게 섞여서 한파나 폭염 같은 극단 날씨가 더 늘 수 있어요.', '파동의 골과 능이 만드는 상승·하강 기류와 한기·난기의 이동이 날씨를 크게 좌우해요.', '10 m/s는 평균이에요. 실제 속도는 달라지므로 도착 시각에는 오차가 생겨요.'],
          explain: '진폭이 커지면 <b>한기가 더 깊이 남하(한파)</b>하고 <b>난기가 더 북상(폭염)</b>하며, 파동이 정체하면 같은 날씨가 오래 계속돼요. 파동의 속도와 진폭이 조금만 달라져도 도착 시각이 달라지므로 일기 예측에는 <b>불확실성</b>이 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-pressure-systems', mount: '#game', badge: '일기 예보관', homeHref: '../../index.html#hs',
    featureLabels: { div: '↔️ 상층 발산 · 공기 기둥', low: '🌀 저기압 발달 모형', high: '☀️ 고기압 발달 모형', fcst: '🔮 일기 예측 타임라인' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'div') readDiv();
    else if (S.mode === 'low') readLow();
    else if (S.mode === 'high') readHigh();
    else readFcst();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'div') drawDiv(t, dt);
    else if (S.mode === 'low') drawLow(t, dt);
    else if (S.mode === 'high') drawHigh(t, dt);
    else drawFcst(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, selDiv, stpNet, numP, numT, ordW, Tlow, Thigh, XT0, VIEW, upGeo, T_ARR, mapClick, highOk, lowOk,
    get game() { return game; }, setMode, resetStep, updateCtl, setD, setC, setPos, setTL, setTH, setTf, setFview,
  };
})();
