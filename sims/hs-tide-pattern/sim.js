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
     조석 자료와 지역별 양상 (조위 곡선 → 조석 유형 → 조차와 지형 → 자료 분석)
     ====================================================== */
  initStage('#e8f0f6', 800, 560, 520, 900, 1.22);
  let game = null;
  const DEG = Math.PI / 180;
  const r2 = (x) => Math.round(x * 100) / 100;
  const fixm = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d) < 0 ? '−' : '') + Math.abs(Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const hhmm = (h) => { const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const G = 9.8, EQ = 0.72;
  const cOf = (h) => Math.sqrt(G * h);

  /* 인천 3일 조위 (예시 자료): [시각(시), 높이(m), 'H' 고조 / 'L' 저조] */
  const T = (d, hh, mm) => (d - 1) * 24 + hh + mm / 60;
  const EXT = [
    [T(1, 0, 0) - 4.08, 0.5, 'L'],
    [T(1, 2, 10), 8.1, 'H'], [T(1, 8, 20), 0.6, 'L'], [T(1, 14, 35), 8.4, 'H'], [T(1, 20, 45), 0.5, 'L'],
    [T(2, 3, 0), 8.3, 'H'], [T(2, 9, 10), 0.5, 'L'], [T(2, 15, 25), 8.6, 'H'], [T(2, 21, 35), 0.4, 'L'],
    [T(3, 3, 50), 8.4, 'H'], [T(3, 10, 0), 0.5, 'L'], [T(3, 16, 15), 8.6, 'H'], [T(3, 22, 25), 0.5, 'L'],
    [T(3, 24, 0) + 4.67, 8.5, 'H'],
  ];
  function tideAt(t) {
    t = clamp(t, EXT[0][0], EXT[EXT.length - 1][0] - 1e-6);
    let i = 0; while (i < EXT.length - 2 && t >= EXT[i + 1][0]) i++;
    const a = EXT[i], b = EXT[i + 1], u = (t - a[0]) / (b[0] - a[0]);
    return a[1] + (b[1] - a[1]) * (1 - Math.cos(Math.PI * u)) / 2;
  }
  const dayOf = (t) => Math.floor(t / 24) + 1;

  const S = {
    mode: 'curve', fade: 0, clock: 0,
    // 1. 조위 곡선
    cur: 20, curV: 20, rec: [], drawT: 0, dragCur: false,
    // 2. 조석 유형
    dec: 0, decV: 0, ty: 0, typeT: 0,
    // 3. 조차와 지형
    rt: 0, showRatio: false, sel: null, mapT: 0,
    // 4. 자료 분석
    marks: [], mT: 0, monT: 0, showNext: false,
  };
  const curveRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 380 }, B: { x: 8, y: 396, w: 504, h: 496 } }, { A: { x: 12, y: 12, w: 776, h: 330 }, B: { x: 12, y: 350, w: 776, h: 198 } });

  /* ======================================================
     장면 1: 인천 3일 조위 곡선 읽기
     ====================================================== */
  function curveGeom() {
    const { A, B } = curveRC();
    const P = { x: A.x + 50, y: A.y + 50, w: A.w - 70, h: A.h - 106 };
    return { A, B, P, X: (t) => P.x + (P.w * t) / 72, Y: (m) => P.y + P.h - (P.h * m) / 9.5 };
  }
  function drawCurve(t, dt) {
    S.curV = approach(S.curV, S.cur, dt, 14); S.drawT = Math.min(1, S.drawT + dt / (RM ? 0.01 : 2.4));
    const g = curveGeom(), { A, B, P, X, Y } = g, q = smooth(S.drawT);
    card(A, PHONE ? '📈 인천의 3일 조위 (예시 자료)' : '📈 인천 관측소의 3일 조위 (예시 자료)');
    ctx.fillStyle = '#f8fafc'; rr(P.x, P.y, P.w, P.h, 4).fill();
    ctx.lineWidth = 1;
    for (let m = 0; m <= 9; m += 3) { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(P.x, Y(m)); ctx.lineTo(P.x + P.w, Y(m)); ctx.stroke(); D.text(P.x - 6, Y(m) + 4.5, m + ' m', { size: 12, weight: 700, color: '#64748b', align: 'right' }); }
    for (let h = 0; h <= 72; h += 6) { ctx.strokeStyle = h % 24 === 0 ? '#94a3b8' : '#e2e8f0'; ctx.beginPath(); ctx.moveTo(X(h), P.y); ctx.lineTo(X(h), P.y + P.h); ctx.stroke(); D.text(X(h), P.y + P.h + 15 * FS, String(h % 24).padStart(2, '0'), { size: 11.5, weight: 700, color: '#64748b' }); }
    [0, 1, 2].forEach((d) => D.text(X(d * 24 + 12), P.y + P.h + 33 * FS, (d + 1) + '일차', { size: 13, weight: 800, color: '#334155' }));
    D.text(P.x - 6, P.y - 10, '조위(기준면 위)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w * q + 0.5, P.h); ctx.clip();
    ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    for (let h = 0; h <= 72.001; h += 0.25) ctx.lineTo(X(h), Y(tideAt(h)));
    ctx.lineTo(X(72), Y(0)); ctx.closePath();
    const wg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); wg.addColorStop(0, 'rgba(56,189,248,.5)'); wg.addColorStop(1, 'rgba(56,189,248,.12)'); ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let h = 0; h <= 72.001; h += 0.25) { const x = X(h), y = Y(tideAt(h)); h === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
    // 기록한 점
    S.rec.forEach((i) => { const e = EXT[i], x = X(e[0]), y = Y(e[1]); D.sphere(x, y, 7, e[2] === 'H' ? '#dc2626' : '#2563eb', { gloss: false, outline: '#fff', outlineWidth: 2 }); D.text(x, e[2] === 'H' ? y - 13 : y + 22, hhmm(e[0] % 24), { size: 11.5, weight: 900, color: e[2] === 'H' ? '#b91c1c' : '#1d4ed8', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); });
    // 커서 (끌어서 읽어요)
    const cx = X(S.curV), cy = Y(tideAt(S.curV));
    D.dashedLine(cx, P.y, cx, P.y + P.h, { color: '#475569', width: 1.8, dash: [5, 4] });
    D.sphere(cx, cy, 8, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true });
    if (!S.curSeen) D.ring(cx, cy, 15, t, { color: '#f59e0b', speed: 1.1, width: 2 });
    D.label(clamp(cx, P.x + 70, P.x + P.w - 70), P.y - 12, dayOf(S.curV) + '일차 ' + hhmm(S.curV % 24) + ' · ' + fN(tideAt(S.curV), 2) + ' m', { bg: '#334155', size: 12.5, pad: 8 });
    // ---- B 기록표
    card(B, PHONE ? '📋 기록표 (‘기록하기’로 채워요)' : '📋 기록표: 가까운 고조·저조에서 ‘기록하기’를 눌러요');
    const cols = 3, lw = PHONE ? 74 : 100, cw = (B.w - 28 - lw) / cols, rh = (B.h - 70) / 5, x0 = B.x + 14, y0 = B.y + 48;
    const rowsName = ['', '오전 고조', '낮 저조', '오후 고조', '밤 저조'];
    for (let c = 0; c < cols; c++) D.text(x0 + lw + c * cw + cw / 2, y0 + rh * 0.6, (c + 1) + '일차', { size: 13.5, weight: 900, color: '#1e3a8a' });
    for (let r = 1; r < 5; r++) {
      const y = y0 + r * rh; ctx.fillStyle = r % 2 ? '#f8fafc' : '#fff'; rr(x0 - 4, y + 1, B.w - 20, rh - 2, 6).fill();
      D.text(x0, y + rh * 0.64, rowsName[r], { size: 12.5, weight: 800, color: r % 2 ? '#b91c1c' : '#1d4ed8', align: 'left' });
      for (let c = 0; c < cols; c++) {
        const idx = 1 + c * 4 + (r - 1), got = S.rec.includes(idx), e = EXT[idx];
        D.text(x0 + lw + c * cw + cw / 2, y + rh * 0.64, got ? hhmm(e[0] % 24) + ' · ' + fN(e[1], 1) + ' m' : '?', { size: PHONE ? 12 : 13, weight: got ? 900 : 700, color: got ? '#1e293b' : '#cbd5e1' });
      }
    }
  }
  function nearestExt(t) { let bi = -1, bd = 99; EXT.forEach((e, i) => { if (i > 0 && i < EXT.length - 1 && Math.abs(e[0] - t) < bd) { bd = Math.abs(e[0] - t); bi = i; } }); return { i: bi, d: bd }; }
  function recordHere() {
    const n = nearestExt(S.cur);
    if (n.d > 0.9) { say('가까운 고조·저조가 없어요. 곡선의 꼭대기나 바닥으로 이동해요', true); return false; }
    if (S.rec.includes(n.i)) { say('이미 기록했어요', true); return false; }
    S.rec.push(n.i); S.cur = EXT[n.i][0]; const g = curveGeom(); parts.burst(g.X(EXT[n.i][0]), g.Y(EXT[n.i][1]), { count: 12, speed: 120, life: 0.6 }); Sound.success(); return true;
  }
  function readCurve() {
    setReadouts(['커서 시각', dayOf(S.cur) + '일차 ' + hhmm(S.cur % 24), '조위', fN(tideAt(S.cur), 2) + ' m', '기록한 점', S.rec.length + ' / 12']);
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'curve') return false;
      const g = curveGeom(); if (p.y < g.A.y + 28 || p.y > g.A.y + g.A.h) return false;
      if (p.x < g.P.x - 14 || p.x > g.P.x + g.P.w + 14) return false;
      S.dragCur = true; S.curSeen = true; mvCur(p); return true;
    },
    move(p) { if (S.dragCur) mvCur(p); },
    up() { S.dragCur = false; },
    hover(p) { if (S.mode !== 'curve') return ''; const g = curveGeom(); return p.x >= g.P.x && p.x <= g.P.x + g.P.w && p.y > g.A.y + 28 && p.y < g.A.y + g.A.h ? 'ew-resize' : ''; },
  });
  function mvCur(p) { const g = curveGeom(); S.cur = clamp(Math.round(((p.x - g.P.x) / g.P.w) * 72 * 12) / 12, 0, 72); setSlider($('#sCur'), $('#oCur'), S.cur, curTxt); }
  const curTxt = (v) => dayOf(+v) + '일차 ' + hhmm(+v % 24);

  /* ======================================================
     장면 2: 조석 유형 — 반일주조 · 일주조 · 혼합조
     ====================================================== */
  const T2 = 12.42, T1 = 23.93, cw = (a, Tp, p, t) => a * Math.cos((TAU * (t - p)) / Tp);
  const STN = [
    { id: 'ton', name: '통킹만', sub: '베트남·중국 해안', ymax: 3.5, col: '#0d9488', f: (t) => 1.9 + cw(0.15, T2, 2.0, t) + cw(0.9, T1, 14, t) },
    { id: 'inc', name: '인천', sub: '황해', ymax: 9, col: '#2563eb', f: (t) => 4.3 + cw(3.9, T2, 3.0, t) + cw(0.12, T1, 2, t) },
    { id: 'sf', name: '샌프란시스코', sub: '미국 서해안', ymax: 3, col: '#c2410c', f: (t) => 1.3 + cw(0.6, T2, 3, t) + cw(0.3, T1, 0, t) },
  ];
  const TYPE_NAME = { semi: '반일주조', diur: '일주조', mixed: '혼합조' }, TYPE_OF = { ton: 'diur', inc: 'semi', sf: 'mixed' };
  function extremaOf(f) {
    const hs = [], ls = []; let prev = f(-0.05), cur = f(0);
    for (let t = 0.05; t <= 24.001; t += 0.05) { const nx = f(t); if (cur > prev && cur >= nx) hs.push([t - 0.05, cur]); if (cur < prev && cur <= nx) ls.push([t - 0.05, cur]); prev = cur; cur = nx; }
    return { hs, ls };
  }
  STN.forEach((s) => { s.ex = extremaOf(s.f); });
  const typeRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 570 }, B: { x: 8, y: 586, w: 504, h: 306 } }, { A: { x: 12, y: 12, w: 776, h: 250 }, B: { x: 12, y: 270, w: 776, h: 278 } });
  const PHI = 35, KT = 0.49 / 1.5;                                   // 관측 위도 35°N, 평형 조석 계수
  const etaZ = (cz) => (KT * (3 * cz * cz - 1)) / 2;
  function drawTypes(t, dt) {
    S.decV = approach(S.decV, S.dec, dt, 8); S.typeT = Math.min(1, S.typeT + dt / (RM ? 0.01 : 1.6));
    const { A, B } = typeRC(), q = smooth(S.typeT);
    card(A, PHONE ? '🌐 세 관측소의 24시간 조위 (예시 자료)' : '🌐 세 관측소의 24시간 조위 (예시 자료): 하루 고조 횟수와 높이를 비교해요');
    const gap = 10, cols = PHONE ? 1 : 3, cwid = (A.w - 20 - gap * (cols - 1)) / cols, chh = PHONE ? (A.h - 50 - gap * 2) / 3 : A.h - 54;
    STN.forEach((s, i) => {
      const x = A.x + 10 + (PHONE ? 0 : i * (cwid + gap)), y = A.y + 42 + (PHONE ? i * (chh + gap) : 0);
      D.shadow(() => { ctx.fillStyle = '#f8fafc'; rr(x, y, cwid, chh, 12).fill(); }, { blur: 5, y: 2 });
      D.text(x + 12, y + 20, (i + 1) + ' ' + s.name, { size: 14, weight: 900, color: s.col, align: 'left' });
      D.text(x + cwid - 10, y + 20, s.sub, { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
      const P = { x: x + 38, y: y + 32, w: cwid - 50, h: chh - 78 }, X = (h) => P.x + (P.w * h) / 24, Y = (m) => P.y + P.h - (P.h * m) / s.ymax;
      ctx.fillStyle = '#fff'; rr(P.x, P.y, P.w, P.h, 4).fill();
      for (let m = 0; m <= s.ymax; m += s.ymax > 5 ? 3 : 1) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, Y(m)); ctx.lineTo(P.x + P.w, Y(m)); ctx.stroke(); D.text(P.x - 5, Y(m) + 4, String(m), { size: 11, weight: 700, color: '#64748b', align: 'right' }); }
      for (let h = 0; h <= 24; h += 6) { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(X(h), P.y); ctx.lineTo(X(h), P.y + P.h); ctx.stroke(); D.text(X(h), P.y + P.h + 14, String(h), { size: 11, weight: 700, color: '#64748b' }); }
      ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w * q + 0.5, P.h); ctx.clip();
      ctx.strokeStyle = s.col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let h = 0; h <= 24.001; h += 0.2) { const px = X(h), py = Y(s.f(h)); h === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); ctx.restore();
      if (q > 0.98) s.ex.hs.forEach((e, k) => { const px = X(e[0]), py = Y(e[1]); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(px, py - 3); ctx.lineTo(px - 5, py - 12); ctx.lineTo(px + 5, py - 12); ctx.closePath(); ctx.fill(); });
      D.text(x + 12, y + chh - 9, '고조 ' + s.ex.hs.length + '회' + (s.ex.hs.length > 1 ? ' · ' + s.ex.hs.map((e) => fN(e[1], 1)).join(' / ') + ' m' : ' · ' + fN(s.ex.hs[0][1], 1) + ' m'), { size: 12.5, weight: 900, color: '#334155', align: 'left' });
    });
    // ---- B: 달의 적위와 하루 두 번 만조의 높이 차
    card(B, PHONE ? '🌙 달의 적위와 하루 두 만조의 높이' : '🌙 달의 적위가 크면 하루 두 번의 만조 높이가 달라져요 (관측 위도 35°N)');
    const dec = S.decV * DEG, phi = PHI * DEG;
    const cx = B.x + (PHONE ? 160 : 135), cy = B.y + (PHONE ? 128 : 158), Re = PHONE ? 54 : 62, K = PHONE ? 100 : 110;
    // 달 방향
    const mdx = Math.cos(dec), mdy = -Math.sin(dec);
    ctx.save(); rr(B.x, B.y + 30, PHONE ? B.w : 300, PHONE ? 210 : B.h - 30, 12).clip();
    D.space(B.x, B.y + 30, PHONE ? B.w : 300, PHONE ? 210 : B.h - 30, t, { stars: 40, top: '#243a6b', bottom: '#0b1330' });
    ctx.restore();
    ctx.fillStyle = 'rgba(56,189,248,.85)'; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU, ux = Math.cos(a), uy = Math.sin(a), czz = ux * mdx + uy * mdy; const r = Re + 9 + K * etaZ(czz) * 0.9; const x = cx + ux * r, y = cy + uy * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    const gr = ctx.createRadialGradient(cx - Re * 0.35, cy - Re * 0.4, Re * 0.1, cx, cy, Re); gr.addColorStop(0, '#6aa9e8'); gr.addColorStop(1, '#1e4f94'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx - Re - 22, cy); ctx.lineTo(cx + Re + 22, cy); ctx.stroke(); ctx.setLineDash([]);
    D.text(cx - Re - 24, cy - 6, '적도', { size: 11.5, weight: 800, color: '#e2e8f0', align: 'right' });
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(cx, cy - Re - 20); ctx.lineTo(cx, cy + Re + 20); ctx.stroke(); D.text(cx + 6, cy - Re - 24, '북', { size: 11.5, weight: 800, color: '#e2e8f0', align: 'left' });
    // 달
    const md = PHONE ? 165 : 130, mx = cx + mdx * md, my = cy + mdy * md;
    D.dashedLine(cx, cy, mx - mdx * 18, my - mdy * 18, { color: 'rgba(253,230,138,.6)', width: 1.5, dash: [4, 5] });
    D.sphere(mx, my, 15, '#e5e7eb', { shadow: true }); D.text(mx, my + 30, '달 (적위 ' + Math.round(S.decV) + '°)', { size: 12, weight: 800, color: '#fef3c7' });
    // 두 관측점 (달을 향한 면과 그 반대면)
    const p1 = [cx + Math.cos(phi) * Re, cy - Math.sin(phi) * Re], p2 = [cx - Math.cos(phi) * Re, cy - Math.sin(phi) * Re];
    D.sphere(p1[0], p1[1], 7, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 2 }); D.sphere(p2[0], p2[1], 7, '#f97316', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.text(p1[0] + 12, p1[1] - 6, '①', { size: 13, weight: 900, color: '#fecaca', align: 'left' }); D.text(p2[0] - 12, p2[1] - 6, '②', { size: 13, weight: 900, color: '#fed7aa', align: 'right' });
    D.text(PHONE ? B.x + B.w - 10 : cx, PHONE ? B.y + 46 : B.y + B.h - 8, '높이는 크게 과장했어요', { size: 11.5, weight: 700, color: '#94a3b8', align: PHONE ? 'right' : 'center' });
    // 오른쪽(휴대폰은 아래): 하루 조위 곡선과 두 만조
    const gx = PHONE ? B.x + 14 : B.x + 346, gy = PHONE ? B.y + 254 : B.y + 50, gw = PHONE ? B.w - 28 : B.w - 362, gh = PHONE ? 0 : B.h - 132;
    const h1 = etaZ(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec)), h2 = etaZ(Math.sin(phi) * Math.sin(dec) - Math.cos(phi) * Math.cos(dec));
    if (!PHONE) {
      const X = (h) => gx + (gw * h) / 24.84, Y = (m) => gy + gh - (gh * (m + 0.2)) / 0.65;
      ctx.fillStyle = '#f8fafc'; rr(gx, gy, gw, gh, 4).fill();
      [-0.2, 0, 0.2, 0.4].forEach((m) => { ctx.strokeStyle = m === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, Y(m)); ctx.lineTo(gx + gw, Y(m)); ctx.stroke(); D.text(gx - 5, Y(m) + 4, fixm(m, 1), { size: 11, weight: 700, color: '#64748b', align: 'right' }); });
      ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 3; ctx.beginPath();
      for (let h = 0; h <= 24.84; h += 0.2) { const tt = (TAU * h) / 24.84, cz = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(tt); const x = X(h), y = Y(etaZ(cz)); h === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      [[0, h1, '#ef4444', '①'], [12.42, h2, '#f97316', '②']].forEach((m) => { D.sphere(X(m[0]), Y(m[1]), 6, m[2], { gloss: false, outline: '#fff', outlineWidth: 2 }); });
      D.text(gx + gw / 2, gy - 8, '한 지점의 하루(약 25시간) 조위 (m)', { size: 12, weight: 800, color: '#334155' });
    }
    const ty0 = PHONE ? B.y + 262 : gy + gh + 22;
    D.label(gx + 4, ty0, '① 첫째 만조 ' + fixm(h1, 2) + ' m', { bg: '#ef4444', size: 12.5, pad: 7, align: 'left' });
    D.label(gx + 4, ty0 + 26, '② 둘째 만조 ' + fixm(h2, 2) + ' m', { bg: '#f97316', size: 12.5, pad: 7, align: 'left' });
    D.text(gx + (PHONE ? 230 : 4), ty0 + (PHONE ? 4 : 50), '높이 차 ' + fN(Math.abs(h1 - h2), 2) + ' m', { size: 13, weight: 900, color: Math.abs(h1 - h2) > 0.2 ? '#be123c' : '#334155', align: 'left' });
  }
  function readTypes() {
    const dec = S.dec * DEG, phi = PHI * DEG;
    const h1 = etaZ(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec)), h2 = etaZ(Math.sin(phi) * Math.sin(dec) - Math.cos(phi) * Math.cos(dec));
    setReadouts(['달의 적위', Math.round(S.dec) + '°', '하루 두 만조의 높이 차', fN(Math.abs(h1 - h2), 2) + ' m', '경향', Math.abs(h1 - h2) > 0.2 ? '혼합조·일주조' : '반일주조']);
  }

  /* ======================================================
     장면 3: 조차와 지형 — 서해 대 동해
     ====================================================== */
  const SITES = [
    { id: 'incheon', name: '인천', lon: 126.6, lat: 37.45, range: 8.5, side: -1, col: '#2563eb' },
    { id: 'mokpo', name: '목포', lon: 126.4, lat: 34.8, range: 4.0, side: -1, col: '#0891b2' },
    { id: 'busan', name: '부산', lon: 129.0, lat: 35.1, range: 1.2, side: 1, col: '#d97706' },
    { id: 'sokcho', name: '속초', lon: 128.6, lat: 38.2, range: 0.3, side: 1, col: '#7c3aed' },
  ];
  const KOREA = [[124.7, 39.7], [125.1, 38.9], [125.0, 38.1], [126.2, 37.75], [126.6, 37.4], [126.4, 36.95], [126.15, 36.7], [126.5, 36.1], [126.55, 35.7], [126.4, 35.2], [126.3, 34.7], [126.5, 34.35], [127.0, 34.6], [127.5, 34.85], [128.0, 34.75], [128.5, 34.95], [129.1, 35.1], [129.4, 35.55], [129.45, 36.05], [129.4, 36.8], [129.15, 37.5], [128.6, 38.15], [128.35, 38.6], [127.6, 39.2], [127.5, 39.9], [126.5, 40.0]];
  const SEA = { west: { name: '서해', depth: 44, col: '#2563eb' }, east: { name: '동해', depth: 1700, col: '#7c3aed' } };
  const rangeRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 520 }, B: { x: 8, y: 536, w: 504, h: 180 }, C: { x: 8, y: 724, w: 504, h: 168 } }, { A: { x: 12, y: 12, w: 400, h: 536 }, B: { x: 420, y: 12, w: 368, h: 262 }, C: { x: 420, y: 282, w: 368, h: 266 } });
  const BARPX = 14;                                           // 1 m = 14 px (조차 막대)
  function mapGeom() {
    const { A } = rangeRC(), sc = Math.min((A.h - 70) / (6.4 * 111), (A.w - 16) / (5.8 * 88.6));
    const ox = A.x + A.w / 2 - (127.1 - 124.2) * 88.6 * sc + (PHONE ? 0 : -6), oy = A.y + 40;
    const P = (lon, lat) => [A.x + A.w / 2 + (lon - 127.2) * 88.6 * sc, oy + (40.0 - lat) * 111 * sc];
    return { A, P, sc };
  }
  function rangeStep(dt) { S.rt += dt; S.mapT = Math.min(1, S.mapT + dt / (RM ? 0.01 : 1.4)); }
  function drawRange(t, dt) {
    rangeStep(dt);
    const { B, C } = rangeRC(), g = mapGeom(), { A, P } = g, q = smooth(S.mapT);
    card(A, '🗺️ 우리나라 해안의 대조차 (예시 자료)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    ctx.fillStyle = '#d6ebf7'; ctx.fillRect(A.x, A.y + 30, A.w, A.h);
    ctx.fillStyle = '#c9dfa8'; ctx.beginPath(); KOREA.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8aa56a'; ctx.lineWidth = 2; ctx.stroke();
    const w1 = P(124.9, 36.4), e1 = P(130.2, 36.9);
    D.text(A.x + 14, w1[1] + 6, '서해', { size: 15, weight: 900, color: '#1d4ed8', align: 'left' }); D.text(A.x + 14, w1[1] + 24, '평균 수심 ' + SEA.west.depth + ' m', { size: 11.5, weight: 800, color: '#1d4ed8', align: 'left' });
    D.text(A.x + A.w - 12, e1[1] + 40, '동해', { size: 15, weight: 900, color: '#6d28d9', align: 'right' }); D.text(A.x + A.w - 12, e1[1] + 58, '평균 수심 약 ' + SEA.east.depth + ' m', { size: 11.5, weight: 800, color: '#6d28d9', align: 'right' });
    // 막대 (축척대로: 1 m = 14 px), 점선 눈금 = 평형 조석 0.72 m
    SITES.forEach((s, i) => {
      const [x, y] = P(s.lon, s.lat), len = s.range * BARPX * q, hh = 15;
      const bx = s.side < 0 ? x - len : x; ctx.fillStyle = rgba(s.col, 0.9); if (len > 0.5) rr(bx, y - hh / 2, len, hh, Math.min(4, len / 2)).fill();
      const ex = x + s.side * EQ * BARPX; ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, y - hh / 2 - 3); ctx.lineTo(ex, y + hh / 2 + 3); ctx.stroke();
      D.sphere(x, y, 6, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 2 });
      const tx = s.side < 0 ? x - len - 6 : x + len + 8, al = s.side < 0 ? 'right' : 'left';
      D.text(tx, y - 4, s.name, { size: 13, weight: 900, color: '#1e293b', align: al, stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
      D.text(tx, y + 12, fN(s.range, 1) + ' m', { size: 12.5, weight: 900, color: s.col, align: al, stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    });
    // 범례
    ctx.fillStyle = '#111827'; ctx.fillRect(A.x + 14, A.y + A.h - 40, 2, 14); D.text(A.x + 22, A.y + A.h - 29, '검은 눈금 = 평형 조석의 최대 조차 0.72 m (막대 길이와 같은 축척)', { size: 11.5, weight: 800, color: '#334155', align: 'left' });
    D.text(A.x + 14, A.y + A.h - 12, '막대 1 m = 14 px · 막대가 길수록 조차가 커요', { size: 11.5, weight: 700, color: '#475569', align: 'left' });
    ctx.restore();
    // ---- B·C: 단면과 조석파
    [['west', B, 21], ['east', C, 129]].forEach(([k, R, c]) => {
      const sea = SEA[k], isW = k === 'west';
      card(R, (isW ? '🌊 서해(얕고 복잡한 만): ' : '🌊 동해(깊고 해안선이 단순): ') + '조석파 c = √(gh)');
      const x0 = R.x + 12, x1 = R.x + R.w - 12, y0 = R.y + 108, dpx = isW ? 42 : 100;
      ctx.save(); rr(R.x, R.y + 30, R.w, R.h - 30, 12).clip();
      D.sky(R.x, R.y + 30, R.w, R.h - 30, '#dcecf8', '#f2f9fd');
      // 조석파: 얕을수록 느리고, 만이 좁아질수록 파고가 커져요
      const speedPx = c * 1.4, L = x1 - x0, wl = L * 0.9, amp = (u) => (isW ? 1.0 * 6.6 + (8.5 - 1.0) * 6.6 * Math.pow(u, 2.2) : 0.3 * 6.6);
      const top = [];
      for (let x = x0; x <= x1 + 0.1; x += 4) { const u = (x - x0) / L, ph = ((x - x0 - speedPx * S.rt * 0.5) / wl) * TAU; top.push([x, y0 - amp(u) * 0.5 * (1 + Math.sin(ph)) * 1 + Math.sin(x * 0.07 - t * 2) * 0.5]); }
      ctx.fillStyle = 'rgba(56,189,248,.82)'; ctx.beginPath(); ctx.moveTo(x0, y0 + dpx); top.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(x1, y0 + dpx); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      // 바닥 (서해는 얕은 대륙붕, 동해는 깊고 해안이 가파름)
      ctx.fillStyle = '#d9c7a0'; ctx.beginPath(); ctx.moveTo(R.x, R.y + R.h);
      ctx.lineTo(R.x, y0 + dpx); ctx.lineTo(isW ? x1 - 20 : x1 - 70, y0 + dpx); ctx.lineTo(x1, isW ? y0 + dpx - 14 : y0 - 8); ctx.lineTo(R.x + R.w, isW ? y0 + dpx - 14 : y0 - 8); ctx.lineTo(R.x + R.w, R.y + R.h); ctx.closePath(); ctx.fill();
      D.dashedLine(x0, y0, x1, y0, { color: 'rgba(30,64,100,.4)', width: 1.2, dash: [5, 5] });
      D.text(x0 + 4, y0 + dpx + 18, '평균 수심 h = ' + sea.depth + ' m (수심은 줄여서 그렸어요)', { size: 12, weight: 700, color: '#6b5a36', align: 'left' });
      D.label(x0 + 4, R.y + 50, '파속 c = √(9.8 × ' + sea.depth + ') = ' + c + ' m/s', { bg: sea.col, size: 12.5, pad: 8, align: 'left' });
      D.label(x1 - 2, R.y + 78, isW ? '인천 조차 8.5 m (증폭)' : '속초 조차 0.3 m', { bg: isW ? '#dc2626' : '#64748b', size: 12.5, pad: 8, align: 'right' });
      ctx.restore();
    });
  }
  function readRange() {
    const show = S.showRatio || (game && game.free);
    setReadouts(['인천 조차 / 평형 조석', show ? fN(8.5 / EQ, 1) + ' 배' : '직접 계산해요', '서해 조석파 속도', '약 ' + Math.round(cOf(44)) + ' m/s', '동해 조석파 속도', '약 ' + Math.round(cOf(1700)) + ' m/s']);
  }

  /* ======================================================
     장면 4: 자료 분석 — 인천 30일 조위와 달의 위상
     ====================================================== */
  const monR = (d) => 6.3 + 2.6 * Math.cos((TAU * (d - 2.5)) / 14.77);          // 조차 (m), 음력 d일
  const monEta = (d) => 4.5 + (monR(d) / 2) * Math.cos(TAU * ((d - 1) * 24) / 12.42 - 0.9);
  const MON = []; for (let d = 1; d <= 31.001; d += 0.03) MON.push([d, monEta(d)]);
  const monRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 400 }, B: { x: 8, y: 416, w: 504, h: 476 } }, { A: { x: 12, y: 12, w: 776, h: 322 }, B: { x: 12, y: 342, w: 776, h: 206 } });
  function monGeom() {
    const { A, B } = monRC(), P = { x: A.x + 46, y: A.y + 44, w: A.w - 62, h: A.h - 90 };
    return { A, B, P, X: (d) => P.x + (P.w * (d - 1)) / 30, Y: (m) => P.y + P.h - (P.h * m) / 10 };
  }
  function calGeom() {
    const { B } = monRC(), cols = PHONE ? 10 : 15, rows = 30 / cols, cw = (B.w - 20) / cols, ch = PHONE ? 86 : (B.h - 62) / rows;
    return { B, cols, rows, cw, ch, x0: B.x + 10, y0: B.y + 36 + (PHONE ? 0 : 0) };
  }
  function moonIcon(x, y, r, age) {
    const ph = (age / 29.53) % 1, k = Math.cos(TAU * ph);
    ctx.save(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.beginPath();
    if (ph < 0.5) { ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false); ctx.ellipse(x, y, Math.max(0.01, Math.abs(k)) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0); }
    else { ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2, false); ctx.ellipse(x, y, Math.max(0.01, Math.abs(k)) * r, r, 0, -Math.PI / 2, Math.PI / 2, k > 0); }
    ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  }
  const PH_NAME = { 1: '삭', 8: '상현', 15: '망', 23: '하현' };
  const isSpringDay = (d) => monR(d) >= 8.5;
  function drawMonth(t, dt) {
    S.mT = Math.min(1, S.mT + dt / (RM ? 0.01 : 3.2)); S.monT = approach(S.monT, 1, dt, 3);
    const g = monGeom(), { A, P, X, Y } = g, q = smooth(S.mT);
    card(A, '📈 인천의 30일 조위 (예시 자료, 음력 날짜)');
    ctx.fillStyle = '#f8fafc'; rr(P.x, P.y, P.w, P.h, 4).fill();
    for (let m = 0; m <= 10; m += 2) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, Y(m)); ctx.lineTo(P.x + P.w, Y(m)); ctx.stroke(); D.text(P.x - 6, Y(m) + 4.5, m + ' m', { size: 12, weight: 700, color: '#64748b', align: 'right' }); }
    for (let d = 1; d <= 31; d += (PHONE ? 5 : 2)) { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(X(d), P.y); ctx.lineTo(X(d), P.y + P.h); ctx.stroke(); D.text(X(d), P.y + P.h + 15 * FS, String(d), { size: 11.5, weight: 700, color: '#64748b' }); }
    D.text(P.x + P.w / 2, P.y + P.h + 32 * FS, '음력 날짜(일)', { size: 12, weight: 800, color: '#475569' });
    // 표시한 사리 날짜
    S.marks.forEach((d) => { ctx.fillStyle = 'rgba(220,38,38,.14)'; ctx.fillRect(X(d) - P.w / 60, P.y, P.w / 30, P.h); D.dashedLine(X(d), P.y, X(d), P.y + P.h, { color: '#dc2626', width: 2, dash: [4, 4] }); D.label(clamp(X(d), P.x + 44, P.x + P.w - 44), P.y + 12, '음력 ' + d + '일 · 조차 ' + fN(monR(d), 1) + ' m', { bg: '#dc2626', size: 11.5, pad: 6 }); });
    // 조위 곡선 (흐르며 그려져요)
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w * q + 0.5, P.h); ctx.clip();
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.beginPath();
    MON.forEach((p, i) => { const x = X(p[0]), y = Y(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    // 고조·저조의 포락선
    ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
    [['#dc2626', 1], ['#2563eb', -1]].forEach(([col, sg]) => { ctx.strokeStyle = col; ctx.beginPath(); for (let d = 1; d <= 31.001; d += 0.25) { const y = Y(4.5 + sg * monR(d) / 2), x = X(d); d === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); });
    ctx.setLineDash([]); ctx.restore();
    D.text(P.x + P.w - 4, P.y + P.h - 6, '빨강: 고조 · 파랑: 저조의 높이 변화', { size: 11.5, weight: 800, color: '#475569', align: 'right', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    // 다음 사리 예측선
    if (S.marks.length && S.showNext && numNext.has()) {
      const d0 = Math.min.apply(null, S.marks), d1 = d0 + numNext.value;
      arrowS(X(d0), P.y + P.h - 20, X(Math.min(d1, 31)), P.y + P.h - 20, { color: '#15803d', width: 3, head: 10 });
      D.label((X(d0) + X(Math.min(d1, 31))) / 2, P.y + P.h - 38, '예측 ' + fN(numNext.value, 1) + '일 뒤', { bg: '#15803d', size: 12, pad: 7 });
    }
    // ---- B: 달 위상 달력 (눌러서 사리 날짜 표시)
    const cg = calGeom(), { B, cols, cw, ch, x0, y0 } = cg;
    card(B, (PHONE ? '🌙 위상 달력: 눌러서 사리 표시 (' : '🌙 달의 위상 달력: 날짜를 눌러 사리를 표시해요 (') + S.marks.length + ' / 2)');
    for (let d = 1; d <= 30; d++) {
      const c = (d - 1) % cols, r = Math.floor((d - 1) / cols), x = x0 + c * cw, y = y0 + r * ch, on = S.marks.includes(d);
      ctx.fillStyle = on ? 'rgba(254,202,202,.95)' : (r % 2 ? '#f8fafc' : '#f1f5f9'); rr(x + 2, y + 2, cw - 4, ch - 4, 8).fill();
      if (on) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; rr(x + 2, y + 2, cw - 4, ch - 4, 8).stroke(); }
      moonIcon(x + cw / 2, y + (PHONE ? 22 : 19), PHONE ? 12 : 10, d - 1);
      D.text(x + cw / 2, y + (PHONE ? 50 : 41), (PH_NAME[d] ? PH_NAME[d] : d + '일'), { size: PH_NAME[d] ? 12 : 12, weight: PH_NAME[d] ? 900 : 700, color: PH_NAME[d] ? '#b45309' : '#334155' });
      D.text(x + cw / 2, y + (PHONE ? 70 : 54), fN(monR(d), 1), { size: PHONE ? 12 : 11.5, weight: 800, color: '#0369a1' });
    }
    if (!PHONE) D.text(B.x + B.w - 12, B.y + 22, '(칸 아래 숫자 = 그날의 조차 m)', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    else D.text(B.x + B.w - 12, B.y + B.h - 8, '칸 아래 숫자 = 그날의 조차(m)', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
  }
  function readMonth() {
    const m = S.marks.slice().sort((a, b) => a - b);
    setReadouts(['표시한 날', m.length ? m.map((d) => '음력 ' + d + '일').join(', ') : '아직 없어요', '표시한 날의 조차', m.length ? m.map((d) => fN(monR(d), 1) + ' m').join(', ') : '—', '평균 조차 (30일)', fN(Array.from({ length: 30 }, (_, i) => monR(i + 1)).reduce((a, b) => a + b, 0) / 30, 1) + ' m']);
  }
  function toggleMark(d) {
    const i = S.marks.indexOf(d);
    if (i >= 0) S.marks.splice(i, 1); else { S.marks.push(d); if (S.marks.length > 2) S.marks.shift(); const g = monGeom(); parts.burst(g.X(d), g.P.y + g.P.h * 0.4, { count: 10, speed: 110, life: 0.5, colors: ['#dc2626', '#f59e0b'] }); }
    Sound.click();
  }

  /* ======================================================
     입력 도구 · 컨트롤
     ====================================================== */
  const numDelay = makeNum($('#numDelay'), { label: '하루 지연', unit: '분' });
  const numRng = makeNum($('#numRng'), { label: '평균 조차', unit: 'm' });
  const numRatio = makeNum($('#numRatio'), { label: '인천 조차 / 평형 조석', unit: '배' });
  const numNext = makeNum($('#numNext'), { label: '다음 사리까지', unit: '일' });
  const selType = makeSelects($('#selType'), STN.map((s, i) => ({ id: s.id, label: (i + 1) + ' ' + s.name })), [{ id: 'semi', label: '반일주조' }, { id: 'diur', label: '일주조' }, { id: 'mixed', label: '혼합조' }], TYPE_OF);
  const ordRange = makeOrder($('#ordRange'), [{ id: 'sokcho', label: '속초 (동해)' }, { id: 'busan', label: '부산 (남해)' }, { id: 'incheon', label: '인천 (서해)' }, { id: 'mokpo', label: '목포 (서남해)' }], ['incheon', 'mokpo', 'busan', 'sokcho'], () => { });
  SciSim.bindRange($('#sCur'), $('#oCur'), curTxt, (v) => { S.cur = +v; S.curSeen = true; });
  SciSim.bindRange($('#sDec'), $('#oDec'), (v) => v + '°', (v) => { S.dec = +v; });
  const setCur = (v) => { S.cur = v; S.curV = v; setSlider($('#sCur'), $('#oCur'), v, curTxt); };
  const setDec = (v) => { S.dec = v; setSlider($('#sDec'), $('#oDec'), v, (x) => x + '°'); };
  $('#bRec').addEventListener('click', () => { recordHere(); });
  $('#bClr').addEventListener('click', () => { Sound.click(); S.marks = []; });
  // 달력과 그래프를 눌러 사리 날짜 표시
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'month') return false;
      const cg = calGeom(), mg = monGeom();
      if (p.x >= cg.x0 && p.x < cg.x0 + cg.cols * cg.cw && p.y >= cg.y0 && p.y < cg.y0 + cg.rows * cg.ch) {
        const c = Math.floor((p.x - cg.x0) / cg.cw), r = Math.floor((p.y - cg.y0) / cg.ch), d = r * cg.cols + c + 1;
        if (d >= 1 && d <= 30) toggleMark(d);
      } else if (p.x >= mg.P.x && p.x <= mg.P.x + mg.P.w && p.y >= mg.P.y && p.y <= mg.P.y + mg.P.h) {
        const d = clamp(Math.round(1 + ((p.x - mg.P.x) / mg.P.w) * 30), 1, 30); toggleMark(d);
      }
      return false;
    },
    hover(p) { if (S.mode !== 'month') return ''; const cg = calGeom(); return p.x >= cg.x0 && p.y >= cg.y0 && p.y < cg.y0 + cg.rows * cg.ch ? 'pointer' : ''; },
  });

  const MODE_LABEL = { curve: '📈 조위 곡선', types: '🌐 조석 유형', range: '🗺️ 조차와 지형', month: '📅 자료 분석' };
  const FREE_KEYS = { curve: ['sCur', 'bRec'], types: ['sDec'], range: [], month: ['bClr'] };
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
  const MORNING = [1, 5, 9];
  const mark2 = mark;
  function resetStep(li) {
    hideHint(); parts.clear();
    setCur(20); S.rec = []; S.drawT = 0; S.curSeen = false; numDelay.reset(); numRng.reset();
    setDec(0); S.decV = 0; S.typeT = 0; selType.reset();
    S.mapT = 0; S.rt = 0; S.showRatio = false; numRatio.reset(); ordRange.reset();
    S.marks = []; S.mT = 0; S.showNext = false; numNext.reset();
    if (li === 0) { setMode('curve'); setCtl(['sCur', 'bRec', 'calcPat']); showHint('곡선 위의 주황 점을 끌어서 시각과 조위를 읽어 봐요', 5200); }
    else if (li === 1) { setMode('types'); setCtl(['selType', 'sDec']); showHint('세 곡선의 고조 횟수와 높이를 비교해 봐요', 5200); }
    else if (li === 2) { setMode('range'); setCtl(['numRatioC']); showHint('막대가 길수록 조차가 커요. 검은 눈금은 평형 조석 0.72 m예요', 5200); }
    else { setMode('month'); setCtl(['bClr']); showHint('달력의 날짜를 눌러 조차가 가장 큰 날(사리)을 표시해요', 5200); }
    updateCtl();
  }
  const recMorning = () => MORNING.filter((i) => S.rec.includes(i)).length;
  const patOk = () => recMorning() === 3 && numDelay.near(50, 5) && numRng.near(7.9, 0.3);
  const springOk = () => S.marks.length === 2 && S.marks.every((d) => monR(d) >= 8.5) && Math.abs(S.marks[0] - S.marks[1]) > 7;
  const levels = [
    {
      title: '조위 곡선: 고조·저조와 매일의 지연', short: '조위 곡선', icon: '📈', phase: '관찰', features: ['curve'],
      intro: '<p class="si-q">❓ 탐구 질문: 실시간 조위 그래프의 규칙을 찾으면 내일 만조 시각과 다음 사리 날짜를 예측할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 ‘기조력과 평형 조석론’에서</b> 만조는 하루 약 2번 오고 매일 약 50분씩 늦어진다고 했어요. 이제 <b>실제 관측소의 조위 자료</b>(예시)로 그 규칙을 확인해 봐요.</div>' +
        '<p>인천 관측소의 3일 조위 곡선이에요. <b>고조</b>는 물이 가장 높은 때, <b>저조</b>는 가장 낮은 때예요. <b>조차</b> = 고조 − 저조예요. 곡선의 점을 끌어 읽고 고조·저조를 <b>기록</b>해 봐요. (실제 조위 자료는 국립해양조사원 누리집에서 확인해 보세요.)</p>',
      setup() { resetStep(0); },
      recap: '인천의 고조는 하루 2번이고 높이가 비슷하며(반일주조), 시각이 매일 약 50분씩 늦어져요. 조차는 약 7.9 m예요.',
      summary: '<ul><li><b>고조·저조</b>: 하루 약 2번씩. 인천 예시: 1일차 고조 02:10 · 14:35, 2일차 03:00 · 15:25, 3일차 03:50 · 16:15.</li><li>같은 고조가 <b>매일 약 50분씩</b> 늦어져요 (달이 같은 자오선에 다시 오는 시간 24시간 50분).</li><li><b>조차</b> = 고조 − 저조. 평균 고조 약 8.4 m, 평균 저조 약 0.5 m → <b>약 7.9 m</b>. 하루 두 번의 고조 높이가 비슷한 <b>반일주조</b>예요.</li></ul>',
      missions: [
        {
          title: '고조 시각 기록하고 규칙 찾기',
          goal: '3일 동안의 <b>오전 고조</b>를 모두 ‘기록하기’로 기록하고, <b>하루 평균 지연 시간</b>(분)과 <b>평균 조차</b>(m)를 입력해요.',
          hint: '주황 점을 곡선의 꼭대기로 끌고 ‘기록하기’를 눌러요. 02:10 → 03:00 → 03:50이면 하루에 몇 분 늦어질까요? 평균 고조(약 8.4 m)에서 평균 저조(약 0.5 m)를 빼요.',
          setup() { S.rec = []; numDelay.reset(); numRng.reset(); setCur(20); setMode('curve'); setCtl(['sCur', 'bRec', 'calcPat']); },
          check: () => patOk(), hold: 0.8,
          status: () => mark2(recMorning() === 3) + ' 오전 고조 기록 ' + recMorning() + ' / 3 · ' + mark2(numDelay.near(50, 5)) + ' 지연 ' + (numDelay.has() ? numDelay.value + '분' : '?') + ' · ' + mark2(numRng.near(7.9, 0.3)) + ' 조차 ' + (numRng.has() ? numRng.value + ' m' : '?'),
          explain: '오전 고조는 02:10 → 03:00 → 03:50으로 <b>매일 50분씩</b> 늦어져요. 조차는 평균 고조 약 8.4 m − 평균 저조 약 0.5 m = <b>약 7.9 m</b>예요. 하루에 고조가 2번이고 두 고조의 높이가 비슷해요.',
        },
        {
          type: 'quiz', title: '왜 두 번이고, 왜 늦어질까?',
          goal: '하루에 고조가 <b>두 번</b> 오고 시각이 <b>매일 늦어지는</b> 까닭을 앞 차시와 연결하면?',
          setup() { setMode('curve'); setCtl(['sCur']); },
          choices: ['지구가 달 쪽 부풀음과 반대쪽 부풀음을 차례로 지나서 하루 약 2번, 달이 공전해서 같은 자오선에 다시 오는 데 24시간 50분이 걸려서 매일 약 50분씩 늦어져요', '바닷물이 하루에 두 번 지구 중심을 오가기 때문이에요', '태양이 매일 50분씩 늦게 뜨기 때문이에요', '관측 장비가 매일 늦게 기록하기 때문이에요'],
          answer: 0,
          feedback: ['', '바닷물이 중심을 오가는 것이 아니라 지구가 두 부풀음(기조력)을 지나가는 거예요.', '해가 뜨는 시각이 아니라 달의 공전(하루 약 12.2°)이 시각을 늦춰요.', '기록 장비는 정확해요. 늦어지는 것은 달이 공전하기 때문이에요.'],
          explain: '기조력 때문에 바다는 달 쪽과 반대쪽 <b>두 곳</b>에서 부풀고, 지구가 자전하며 그 사이를 지나가요 → 하루 약 2번. 달이 공전해서 태음일이 <b>24시간 50분</b>이므로 만조 시각은 매일 약 50분씩 늦어져요.',
        },
      ],
    },
    {
      title: '조석 유형: 고조 횟수와 높이로 가려요', short: '조석 유형', icon: '🌐', phase: '분석', features: ['types'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 인천은 하루 2번, 높이가 비슷한 고조가 왔어요. 그런데 다른 바다에서도 같을까요? 세계 여러 관측소의 24시간 조위를 비교해요.</div>' +
        '<p>조석은 <b>하루의 고조 횟수와 높이</b>로 구분해요. <b>반일주조</b>: 하루 고조 2회, 높이 비슷. <b>일주조</b>: 하루 고조 1회. <b>혼합조</b>: 하루 고조 2회지만 높이 차가 커요. 달의 <b>적위</b>(적도에서 벗어난 정도)가 크면 하루 두 번의 부풀음 높이가 달라져요.</p>',
      setup() { resetStep(1); },
      recap: '고조가 하루 2회·높이 비슷하면 반일주조, 1회면 일주조, 2회인데 높이 차가 크면 혼합조예요. 달의 적위가 크면 두 부풀음의 높이가 달라져요.',
      summary: '<ul><li><b>반일주조</b>: 하루 고조 2회, 높이 비슷 (인천, 우리나라 대부분). <b>일주조</b>: 하루 고조 1회 (통킹만). <b>혼합조</b>: 하루 2회이나 높이 차 큼 (샌프란시스코).</li><li><b>달의 적위</b>가 크면 달 쪽 부풀음과 반대쪽 부풀음의 위도별 높이가 달라져 하루 두 고조의 높이 차가 커져요 → 혼합조·일주조 경향.</li><li>평형 조석론은 이런 지역별 차이를 완전히 설명하지 못해요. 실제 바다는 <b>해안선·수심·바다 크기</b>가 달라서 조석이 지역마다 다르게 나타나요.</li></ul>',
      missions: [
        {
          title: '곡선 세 개 분류', manual: true,
          goal: '세 관측소의 24시간 조위 곡선을 <b>반일주조 · 일주조 · 혼합조</b>로 분류해요.',
          hint: '고조(빨간 ▲)가 몇 번인지, 높이가 비슷한지 봐요. 1번은 하루에 한 번, 2번은 두 번이 비슷, 3번은 두 번이지만 높이가 달라요.',
          setup() { S.typeT = 0; selType.reset(); setMode('types'); setCtl(['selType', 'sDec']); },
          status: () => mark2(selType.ok()) + ' 분류한 곡선 ' + selType.count() + ' / 3',
          check() {
            if (!selType.complete()) return '곡선 세 개를 모두 분류해 주세요. (지금 ' + selType.count() + '개)';
            if (!selType.ok()) { selType.mark(selType.wrong()); return '빨간 줄이 달라요. 하루 고조 횟수와 두 고조의 높이를 다시 비교해 봐요.'; }
            return true;
          },
          explain: '통킹만은 하루 고조 <b>1회</b>라 일주조, 인천은 2회이고 높이가 비슷해 반일주조(8.3 / 8.1 m), 샌프란시스코는 2회이지만 높이 차가 커서(2.1 / 1.7 m) 혼합조예요.',
        },
        {
          type: 'quiz', title: '평형 조석론과 지역별 차이',
          goal: '평형 조석론만으로는 설명이 안 되는 <b>지역별 차이</b>의 원인과, 일주조·혼합조가 나타나는 조건은?',
          setup() { setDec(28); S.decV = 28; setMode('types'); setCtl(['sDec']); },
          choices: ['실제 바다는 해안선·수심·바다 크기가 달라 조석이 지역마다 다르게 나타나고, 달의 적위가 클 때 하루 두 부풀음의 높이 차가 커져 혼합조·일주조 경향이 나타나요', '지역마다 달이 다른 달이라서 그래요', '일주조는 달이 뜨지 않는 날에 나타나요', '평형 조석론은 모든 지역의 조석을 완벽히 설명해요'],
          answer: 0,
          feedback: ['', '달은 하나예요. 같은 달이라도 바다의 모양과 수심이 달라서 지역마다 조석이 달라요.', '달이 없는 날은 없어요. 일주조·혼합조는 달의 적위가 크고 지역의 바다 조건이 맞을 때 나타나요.', '평형 조석론은 바다가 지구 전체를 덮고 즉시 평형을 이룬다고 가정해서, 지형 효과를 설명하지 못해요. 다음 단계에서 확인해요.'],
          explain: '평형 조석론은 <b>바다 전체가 지구를 덮는다</b>고 가정해서 지형을 고려하지 않아요. 실제로는 해안선·수심·바다 크기에 따라 조석이 달라요. 또 달의 <b>적위가 크면</b> 하루 두 번의 부풀음 높이가 달라져 혼합조·일주조 경향이 커져요(슬라이더로 확인).',
        },
      ],
    },
    {
      title: '조차와 지형: 평형 조석의 12배', short: '조차와 지형', icon: '🗺️', phase: '분석', features: ['range'],
      intro: '<div class="si-link">🔗 <b>앞 차시 ‘기조력과 평형 조석론’에서</b> 평형 조석의 최대 조차는 사리 때 <b>0.72 m</b>였어요. 그런데 인천의 조차는 약 8.5 m예요. 이 차이는 어디서 올까요? 또 <b>천해파 속도 c = √(gh)</b>를 다시 써요.</div>' +
        '<p>조석파는 파장이 수천 km인 <b>천해파</b>예요. 서해는 평균 수심 약 44 m로 얕고 해안선이 복잡하며 만이 좁아져요. 동해는 평균 수심 약 1700 m로 깊고 해안선이 단순해요. 지도의 막대는 각 지점의 대조차(예시 값)예요.</p>',
      setup() { resetStep(2); },
      recap: '평형 조석의 최대 조차 0.72 m보다 인천은 약 12배 커요. 서해안은 얕은 대륙붕과 복잡한 만에서 조석파가 증폭되기 때문이에요.',
      summary: '<ul><li>대조차(예시): 인천 약 <b>8.5 m</b>, 목포 약 4.0 m, 부산 약 1.2 m, 속초 약 0.3 m. 평형 조석 최대 0.72 m의 인천은 8.5 / 0.72 ≈ <b>12배</b>.</li><li>조석파는 천해파 c = √(gh): 서해(h ≈ 44 m) ≈ <b>21 m/s</b>, 동해(h ≈ 1700 m) ≈ <b>129 m/s</b>.</li><li>서해는 얕은 대륙붕과 <b>복잡한 해안선·좁아지는 만</b>에서 조석파가 모이고(마찰·지형 효과) 파고가 커져요. 동해는 거의 증폭되지 않아요. 조차가 큰 곳은 <b>조력 발전</b>에 유리해요(시화호 등).</li></ul>',
      missions: [
        {
          title: '인천의 조차는 몇 배?',
          goal: '인천의 대조차(8.5 m)는 평형 조석의 최대 조차(0.72 m)의 <b>몇 배</b>인지 계산해 입력해요.',
          hint: '8.5 / 0.72 ≈ 11.8이에요. 소수 첫째 자리나 정수로 입력해요.',
          setup() { S.showRatio = false; numRatio.reset(); setMode('range'); setCtl(['numRatioC']); },
          check: () => numRatio.near(8.5 / EQ, 0.6), hold: 0.8,
          status: () => mark2(numRatio.near(8.5 / EQ, 0.6)) + ' 입력 ' + (numRatio.has() ? numRatio.value + ' 배' : '?'),
          explain: '8.5 / 0.72 ≈ <b>11.8배</b>, 곧 약 12배예요. 평형 조석론은 이 큰 차이를 설명하지 못해요. 바다의 지형이 조석을 키우기 때문이에요.',
        },
        {
          title: '조차 큰 순서로 늘어놓기', manual: true,
          goal: '네 지점을 지도의 막대를 보고 <b>조차가 큰 순서</b>로 차례로 눌러요.',
          hint: '막대가 가장 긴 곳부터 눌러요. 서해안(인천, 목포)이 크고 동해안(속초)이 가장 작아요.',
          setup() { S.showRatio = true; ordRange.reset(); setMode('range'); setCtl(['ordRange']); },
          status: () => mark2(ordRange.ok()) + ' 고른 순서 ' + ordRange.seq.length + ' / 4',
          check() {
            if (!ordRange.complete()) return '네 지점을 모두 눌러 주세요. (지금 ' + ordRange.seq.length + '개)';
            if (!ordRange.ok()) { ordRange.mark(ordRange.seq[ordRange.firstWrong()]); return '순서가 달라요. 지도의 막대 길이를 다시 비교해 봐요.'; }
            return true;
          },
          explain: '인천(8.5 m) &gt; 목포(4.0 m) &gt; 부산(1.2 m) &gt; 속초(0.3 m) 순서예요. 얕은 서해로 갈수록 조차가 크고, 깊은 동해는 평형 조석(0.72 m)보다도 작아요.',
        },
        {
          type: 'quiz', title: '서해안의 조차가 큰 까닭',
          goal: '서해안의 조차가 동해안보다 훨씬 큰 까닭은?',
          setup() { S.showRatio = true; setMode('range'); setCtl([]); },
          choices: ['얕은 대륙붕과 복잡한 해안선, 좁아지는 만에서 조석파가 모여 증폭되기 때문이에요', '서해에는 달이 더 가까이 있기 때문이에요', '서해가 동해보다 훨씬 깊기 때문이에요', '서해에서는 태양의 인력이 더 크기 때문이에요'],
          answer: 0,
          feedback: ['', '달까지의 거리는 어디서나 거의 같아요. 서해의 지형이 조석파를 키워요.', '반대예요. 서해는 평균 수심 약 44 m로 얕고, 동해는 약 1700 m로 깊어요.', '태양의 기조력은 지역에 따라 달라지지 않아요. 지역 차이는 바다의 지형 때문이에요.'],
          explain: '조석파는 천해파라 c = √(gh)로 얕은 서해(약 21 m/s)에서는 느려지고, 만이 좁아지면서 에너지가 모여 <b>파고(조차)가 커져요</b>. 동해(약 129 m/s)는 거의 증폭이 없어요. 평형 조석론은 이런 <b>지형 효과</b>를 다루지 않는 한계가 있어요.',
        },
      ],
    },
    {
      title: '자료 분석: 사리·조금과 달의 위상', short: '자료 분석', icon: '📅', phase: '분석', features: ['month'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 서해안은 조차가 크다는 것을 확인했어요. 이제 인천의 <b>30일 조위</b>에서 조차가 크고 작은 날을 찾아 달의 위상과 비교하고 다음 사리를 <b>예측</b>해 봐요.</div>' +
        '<p>조위 그래프의 위·아래 폭이 커졌다 작아졌다 해요. 폭이 가장 큰 때가 <b>사리</b>, 가장 작은 때가 <b>조금</b>이에요. 아래 달력의 달 모양은 음력 날짜의 위상이에요(삭 = 음력 1일, 상현 = 8일, 망 = 15일, 하현 = 23일). 예시 자료예요.</p>',
      setup() { resetStep(3); },
      recap: '사리는 삭·망 1~2일 뒤에, 조금은 상현·하현 1~2일 뒤에 나타나고 약 14.8일마다 되풀이돼요. 이를 이용하면 다음 사리를 예측할 수 있어요.',
      summary: '<ul><li>인천 30일 조위(예시): <b>사리</b>(조차 약 8.6~9.0 m)는 삭(음력 1일)·망(15일)의 <b>1~2일 뒤</b>, <b>조금</b>(조차 약 3.5~4 m)은 상현(8일)·하현(23일)의 1~2일 뒤.</li><li>사리와 사리 사이는 약 <b>14.8일</b>(삭망월 29.5일의 절반). 이 규칙으로 다음 사리 날짜를 예측할 수 있어요.</li><li>적용: 사리 때 <b>갯벌이 넓게 드러나</b> 갯벌 체험에 좋고, 조차가 큰 곳·큰 때에 <b>조력 발전</b>이 유리해요. 단, 예측한 조위에 <b>폭풍 해일</b>이 더해지면 실제 수위는 높아질 수 있어요.</li></ul>',
      missions: [
        {
          title: '사리 날짜 두 곳 표시',
          goal: '조차가 가장 큰 날(<b>사리</b>)을 달력에서 눌러 <b>두 곳</b> 표시해요. (한 달에 두 번 있어요)',
          hint: '달력 칸 아래의 조차 숫자가 8.5 m 이상인 날이에요. 삭(1일)과 망(15일) 1~2일 뒤쯤이에요.',
          setup() { S.marks = []; S.showNext = false; setMode('month'); setCtl(['bClr']); },
          check: () => springOk(), hold: 0.8,
          status: () => mark2(S.marks.length === 2) + ' 표시 ' + S.marks.length + ' / 2 · ' + mark2(springOk()) + ' 사리 확인 ' + (S.marks.length ? S.marks.slice().sort((a, b) => a - b).map((d) => fN(monR(d), 1) + ' m').join(', ') : ''),
          explain: '사리는 조차가 약 8.6~9.0 m로 가장 큰 날이에요. 삭(음력 1일) 1~2일 뒤인 음력 2~3일, 망(15일) 1~2일 뒤인 음력 16~18일 무렵이에요. 두 사리 사이는 약 15일이에요.',
        },
        {
          title: '다음 사리는 며칠 뒤?',
          goal: '첫 사리를 기준으로 <b>다음 사리가 며칠 뒤</b>에 오는지 예측해 입력해요.',
          hint: '삭망월 29.5일의 절반이에요. 두 표시한 날 사이의 간격을 읽어도 돼요.',
          setup() { S.showNext = true; numNext.reset(); if (!springOk()) S.marks = [2, 17]; setMode('month'); setCtl(['calcNext']); },
          check: () => numNext.near(14.8, 1), hold: 0.8,
          status: () => mark2(numNext.near(14.8, 1)) + ' 예측 ' + (numNext.has() ? numNext.value + '일 뒤' : '?'),
          explain: '사리는 달이 삭이거나 망일 때(지구–달–태양이 일직선)마다 오므로 삭망월 29.5일의 절반인 약 <b>14.8일</b> 간격이에요. 같은 규칙으로 내일의 만조 시각(약 50분 늦어짐)도 예측할 수 있어요.',
        },
        {
          type: 'quiz', title: '자료를 활용할 때 생각할 점',
          goal: '갯벌 체험이나 조력 발전에 유리한 때와 곳, 그리고 예측이 맞아도 실제 수위가 달라질 수 있는 까닭은?',
          setup() { S.showNext = true; setMode('month'); setCtl(['bClr']); },
          choices: ['조차가 큰 사리 때, 서해안처럼 조차가 큰 곳이 유리해요. 예측한 조위에 폭풍 해일이 더해지면 실제 수위는 예측보다 높아질 수 있어요', '조금 때 갯벌이 가장 넓게 드러나요', '조력 발전은 조차가 작은 동해안이 가장 유리해요', '조위 예측이 맞으면 폭풍 해일이 와도 수위는 변하지 않아요'],
          answer: 0,
          feedback: ['', '갯벌은 물이 멀리 빠지는 사리 때 가장 넓게 드러나요. 조금 때는 조차가 작아 덜 드러나요.', '조력 발전은 조차가 클수록 유리해요. 동해안은 조차가 0.3 m 정도로 작아요.', '조위 예측은 천문 조위만이에요. 총 수위 = 천문 조위 + 해일 편차이므로 폭풍 해일이 겹치면 달라져요.'],
          explain: '조력 발전과 갯벌 체험은 조차가 큰 <b>사리 때, 서해안</b>에서 유리해요. 천문 조위는 정확히 예측해도 총 수위 = 천문 조위 + 폭풍 해일 편차이므로, <b>태풍이 만조와 겹치면</b> 예측보다 수위가 훨씬 높아질 수 있어요(앞 차시).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-tide-pattern', mount: '#game', badge: '조석 분석가', homeHref: '../../index.html#hs',
    featureLabels: { curve: '📈 조위 곡선 · 기록표', types: '🌐 조석 유형 · 달의 적위', range: '🗺️ 해안 조차 지도 · 단면', month: '📅 30일 조위 · 위상 달력' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'curve') readCurve();
    else if (S.mode === 'types') readTypes();
    else if (S.mode === 'range') readRange();
    else readMonth();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f0f6'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'curve') drawCurve(t, dt);
    else if (S.mode === 'types') drawTypes(t, dt);
    else if (S.mode === 'range') drawRange(t, dt);
    else drawMonth(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, numDelay, numRng, numRatio, numNext, selType, ordRange, EXT, monR, tideAt, recordHere, toggleMark, calGeom, monGeom, curveGeom,
    get game() { return game; }, setCtl, setMode, resetStep, updateCtl, setCur, setDec,
  };
})();
