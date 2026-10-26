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
     기조력과 평형 조석론 (기조력 → 달과 태양 → 평형 조석 → 조석 주기)
     ====================================================== */
  initStage('#e8eef8', 800, 560, 520, 900, 1.22);
  let game = null;
  const DEG = Math.PI / 180;
  const r2 = (x) => Math.round(x * 100) / 100;
  const fixm = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d) < 0 ? '−' : '') + Math.abs(Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const MN = 7.35e22, DM = 3.844e8, SN = 1.99e30, DS = 1.496e11;          // 달·태양의 질량(kg)과 평균 거리(m)
  const tf = (M, d) => M / (d * d * d);                                    // 기조력 ∝ M/d³ (임의 단위)
  const RATIO_MS = tf(MN, DM) / tf(SN, DS);                                // 달/태양 ≈ 2.2
  const PERI = 3.56e8, APO = 4.07e8, RATIO_PA = Math.pow(APO / PERI, 3);   // 근지점/원지점 ≈ 1.5
  const HM = 0.49, HS = 0.23;                                              // 평형 조석의 조차: 달 0.49 m, 태양 0.23 m
  const rangeAt = (th) => Math.sqrt(HM * HM + HS * HS + 2 * HM * HS * Math.cos(2 * th));   // 합성 조차
  const SYN = 29.5, LDAY = 24 + 50.5 / 60, DELAY_MIN = 50.5;               // 삭망월 29.5일, 태음일 24시간 50분
  const thOfDay = (d) => (360 * d / SYN) * DEG;
  const hhmm = (min) => { const m = Math.round(min); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

  const S = {
    mode: 'force', fade: 0, clock: 0,
    // 1. 기조력
    stage: 1, stV: [0, 0, 0], bulge: 0,
    // 2. 달과 태양
    dm: 3.844, dmV: 3.844, cmpT: 0, seenPA: false,
    // 3. 평형 조석
    day: 0, dayV: 0, hr: 0, playing: false, ran24: false, seenSpring: false, seenNeap: false, tideCurve: [], highsSeen: 0,
    // 4. 조석 주기
    c2: 0, c2run: false, ranCyc: false, showAns: false, dayRow: 0, tblT: 0,
  };

  /* ======================================================
     장면 1: 기조력 = 그 지점의 달의 인력 − 중심의 평균 인력
     ====================================================== */
  const DR = 384400 / 6371;                                // 달까지 거리 / 지구 반지름 (≈ 60.3)
  const KT = 20;                                           // 기조력 화살표 확대 배율
  const forceRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 620 }, B: { x: 8, y: 636, w: 504, h: 256 } }, { A: { x: 12, y: 12, w: 776, h: 410 }, B: { x: 12, y: 430, w: 776, h: 118 } });
  const PTS = [['A', 0, '달 쪽 면'], ['B', -90, '옆면'], ['C', 180, '달 반대쪽 면'], ['D', 90, '옆면']];
  function forceGeom() {
    const { A, B } = forceRC();
    const g = { A, B, Re: PHONE ? 78 : 90, L0: PHONE ? 56 : 62 };
    g.ex = A.x + (PHONE ? 176 : 270); g.ey = A.y + (PHONE ? 300 : 220); g.mx = A.x + A.w - (PHONE ? 46 : 70); g.my = g.ey;
    return g;
  }
  /* 지구 반지름을 1로 둔 좌표에서 지점 P의 달의 인력과 기조력 (달의 인력 방향 = 오른쪽) */
  function pullAt(px, py) {
    const dx = DR - px, dy = -py, r = Math.hypot(dx, dy), k = (DR * DR) / (r * r * r);
    return [dx * k, dy * k];
  }
  function forceStep(dt) {
    for (let i = 0; i < 3; i++) S.stV[i] = approach(S.stV[i], S.stage > i ? 1 : 0, dt, 4.5);
    S.bulge = approach(S.bulge, S.stage >= 3 ? 1 : 0, dt, 2.2);
  }
  function drawForce(t, dt) {
    forceStep(dt);
    const g = forceGeom(), { A, B, Re, L0, ex, ey } = g;
    card(A, '🌙 지구에 작용하는 달의 인력과 기조력 (지구를 위에서 본 모습)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.space(A.x, A.y + 30, A.w, A.h - 30, t, { stars: 60, top: '#243a6b', bottom: '#0b1330' });
    // 달
    D.glow(g.mx, g.my, 60, '#fde68a', 0.35); D.sphere(g.mx, g.my, PHONE ? 22 : 28, '#e5e7eb', { shadow: true });
    D.text(g.mx, g.my + (PHONE ? 46 : 54), '달', { size: 14, weight: 900, color: '#fef3c7' });
    D.dashedLine(ex + Re + 130, ey, g.mx - 34, ey, { color: 'rgba(253,230,138,.6)', width: 1.6, dash: [5, 6] });
    D.text((ex + Re + 140 + g.mx - 40) / 2, ey + 22, '달까지 약 38만 km (축소)', { size: 12, weight: 700, color: '#e2e8f0' });
    // 물층 (기조력 단계에서 두 곳이 부풀어요)
    ctx.fillStyle = 'rgba(56,189,248,.82)'; ctx.beginPath();
    for (let i = 0; i <= 90; i++) { const a = (i / 90) * TAU, r = Re + 9 + S.bulge * 17 * Math.cos(2 * a); const x = ex + Math.cos(a) * r, y = ey + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    // 지구
    const gr = ctx.createRadialGradient(ex - Re * 0.35, ey - Re * 0.4, Re * 0.1, ex, ey, Re); gr.addColorStop(0, '#6aa9e8'); gr.addColorStop(1, '#1e4f94');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ex, ey, Re, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(134,192,126,.9)'; [[-0.35, -0.2, 0.3], [0.25, 0.3, 0.22], [-0.05, 0.55, 0.16]].forEach((c) => { ctx.beginPath(); ctx.ellipse(ex + c[0] * Re, ey + c[1] * Re, c[2] * Re, c[2] * Re * 0.7, 0.4, 0, TAU); ctx.fill(); });
    D.text(ex, ey + 5, '지구', { size: 14, weight: 900, color: '#fff', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 });
    // 지점 A~D와 화살표
    const col = { pull: '#60a5fa', mean: '#cbd5e1', tid: '#f87171' };
    PTS.forEach((pt, i) => {
      const a = pt[1] * DEG, px = ex + Math.cos(a) * Re, py = ey + Math.sin(a) * Re, tv = tidalAtPt(i);
      const pull = tv.pull;
      // ① 달의 인력 (파랑)
      const s1 = S.stV[0];
      arrowS(px, py, px + pull[0] * L0 * s1, py + pull[1] * L0 * s1, { color: col.pull, width: 4.5, head: 10 });
      // ② 중심의 평균 인력 (회색 점선, 같은 길이로 모든 지점에서)
      const s2 = S.stV[1];
      const off = i === 0 ? -10 : i === 2 ? 10 : 0;
      if (s2 > 0.02) arrowS(px, py + off, px + L0 * s2, py + off, { color: col.mean, width: 3.5, head: 9, dash: [5, 4] });
      // ③ 기조력 (빨강, 20배 확대)
      const s3 = S.stV[2];
      arrowS(px, py, px + tv.tid[0] * L0 * KT * s3, py + tv.tid[1] * L0 * KT * s3, { color: col.tid, width: 6, head: 13 });
      D.sphere(px, py, 11, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 2, text: pt[0], textScale: 1.0 });
    });
    // 중심의 평균 인력
    if (S.stV[1] > 0.02) { arrowS(ex, ey + 30, ex + L0 * S.stV[1], ey + 30, { color: col.mean, width: 3.5, head: 9, dash: [5, 4] }); D.text(ex + L0 * 0.5, ey + 49, '중심', { size: 12, weight: 800, color: '#e2e8f0' }); }
    // 수치 라벨 (중심의 인력 = 1)
    if (S.stV[0] > 0.5) {
      const nr = Math.pow(DR / (DR - 1), 2), fr = Math.pow(DR / (DR + 1), 2);
      D.label(ex + Re + L0 * 0.6 + 10, ey - 22, '달의 인력 ' + fN(nr, 3), { bg: '#2563eb', size: 12, pad: 6, align: 'left' });
      D.label(ex - Re + 6, ey - 36, '달의 인력 ' + fN(fr, 3), { bg: '#2563eb', size: 12, pad: 6, align: 'left' });
      D.text(ex, ey - Re - 34, '중심의 인력 = 1.000 (기준)', { size: 12, weight: 800, color: '#e2e8f0' });
    }
    if (S.stage >= 3) D.label(ex, ey + Re + 40, PHONE ? '물이 두 곳에서 부풀어요 (과장)' : '물이 달 쪽과 반대쪽 두 곳에서 부풀어요 (높이 과장)', { bg: '#0369a1', size: 12.5, pad: 9 });
    // 범례
    const lx = A.x + 14; let ly = A.y + 52;
    [[col.pull, '① 달의 인력'], [col.mean, '② 중심의 평균 인력'], [col.tid, '③ 기조력 (' + KT + '배 확대)']].forEach((l, i) => { if (S.stage > i || (game && game.free)) { ctx.fillStyle = l[0]; ctx.fillRect(lx, ly - 6, 22, 5); D.text(lx + 30, ly, l[1], { size: 12.5, weight: 800, color: '#f1f5f9', align: 'left' }); ly += 21 * FS * 0.95; } });
    ctx.restore();
    // ---- B 설명
    card(B, '💡 ' + ['① 지점마다 달의 인력이 달라요', '② 지구 전체가 받는 평균 인력과 비교해요', '③ 기조력 = 달의 인력 − 중심의 평균 인력'][S.stage - 1]);
    const lines = [
      '달에 가까운 A면은 인력이 중심보다 커서 달 쪽으로, 먼 C면은 중심보다 작아서 달의 반대쪽으로 쏠려요.',
      '지구는 달과 함께 공전하며 중심이 받는 평균 인력만큼 한꺼번에 끌려가요. 이 기준과 비교해요.',
      '옆면(B, D)은 인력의 방향이 조금 달라서 합력이 지구 중심 쪽을 향해요. 그래서 바다는 달 쪽과 반대쪽에서 부풀어요.',
    ];
    para(B.x + 16, B.y + 56 * FS * 0.85, B.w - 32, lines[S.stage - 1], 14.5, '#334155', 700);
    para(B.x + 16, B.y + B.h - (PHONE ? 40 : 12), B.w - 32, '※ 인력의 크기(1/거리²)와 방향의 차이를 계산한 값이에요. 기조력의 크기 ∝ M/d³', 12, '#64748b', 700);
  }
  function tidalAtPt(i) {
    // 지구 반지름 = 1, 달의 방향 = +x. 화면에서 위쪽 옆면(B)은 y가 위(−)이므로 인력의 y 성분 부호를 맞춰요.
    const a = [1, 0, -1, 0][i], bUp = [0, 1, 0, -1][i];          // bUp: 위쪽이면 +1 (물리 좌표의 y)
    const p = pullAt(a, bUp), pull = [p[0], -p[1]];                // 화면 좌표로 변환 (y 반전)
    return { pull, tid: [pull[0] - 1, pull[1]] };
  }
  function readForce() {
    setReadouts(['달의 인력 (A면)', fN(Math.pow(DR / (DR - 1), 2), 3) + ' (중심 = 1)', '달의 인력 (C면)', fN(Math.pow(DR / (DR + 1), 2), 3) + ' (중심 = 1)', '기조력 (A·C면)', '+' + fN(Math.pow(DR / (DR - 1), 2) - 1, 3) + ' · ' + fN(Math.pow(DR / (DR + 1), 2) - 1, 3)]);
  }

  /* ======================================================
     장면 2: 달과 태양 — 기조력 ∝ M/d³
     ====================================================== */
  const cmpRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 470 }, B: { x: 8, y: 486, w: 504, h: 406 } }, { A: { x: 12, y: 12, w: 776, h: 296 }, B: { x: 12, y: 316, w: 776, h: 232 } });
  const sci = (x, d) => { const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' }; return m.toFixed(d) + '×10' + String(e).split('').map((c) => SUP[c] || c).join(''); };
  const TFM = tf(MN, DM), TFS = tf(SN, DS);
  function cmpStep(dt) { S.dmV = approach(S.dmV, S.dm, dt, 8); S.cmpT = Math.min(1, S.cmpT + dt / (RM ? 0.01 : 1.2)); }
  function orbitR(th, a, e) { return (a * (1 - e * e)) / (1 + e * Math.cos(th)); }
  function drawCompare(t, dt) {
    cmpStep(dt);
    const { A, B } = cmpRC();
    card(A, '⚖️ 달과 태양: 기조력의 크기는 M / d³ 에 비례');
    const show = S.showCmp || (game && game.free), q = smooth(S.cmpT);
    const cols = PHONE ? 2 : 3, cw = (A.w - 24 - 10 * (cols - 1)) / cols, ch1 = PHONE ? 190 : A.h - 54;
    const cards = [['달', '#e5e7eb', MN, DM, '7.35×10²² kg', '3.844×10⁸ m'], ['태양', '#fbbf24', SN, DS, '1.99×10³⁰ kg', '1.496×10¹¹ m']];
    cards.forEach((c, i) => {
      const x = A.x + 12 + i * (cw + 10), y = A.y + 42;
      D.shadow(() => { ctx.fillStyle = '#f8fafc'; rr(x, y, cw, ch1, 12).fill(); }, { blur: 5, y: 2 });
      D.glow(x + 38, y + 40, 40, c[1], 0.4); D.sphere(x + 38, y + 40, i ? 26 : 16, c[1], { shadow: true });
      D.text(x + 80, y + 36, c[0], { size: 16, weight: 900, color: '#1e293b', align: 'left' });
      D.text(x + 14, y + 86, '질량 M = ' + c[4], { size: 13, weight: 800, color: '#334155', align: 'left' });
      D.text(x + 14, y + 110, '거리 d = ' + c[5], { size: 13, weight: 800, color: '#334155', align: 'left' });
      const v = tf(c[2], c[3]);
      D.text(x + 14, y + 140, 'M / d³ = ' + sci(v, 2), { size: 14.5, weight: 900, color: i ? '#b45309' : '#0369a1', align: 'left' });
      D.text(x + 14, y + 164, '= ' + c[4].split(' ')[0] + ' / (' + c[5].split(' ')[0] + ')³', { size: 12, weight: 700, color: '#475569', align: 'left' });
      D.text(x + 14, y + 186, '(임의 단위, 비교용)', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
    });
    // 세 번째 칸(태블릿): 비교
    const bx = PHONE ? A.x + 12 : A.x + 12 + 2 * (cw + 10), by = PHONE ? A.y + 42 + ch1 + 10 : A.y + 42, bw = cw, bh = PHONE ? A.h - 42 - ch1 - 20 : ch1;
    D.shadow(() => { ctx.fillStyle = '#f8fafc'; rr(bx, by, bw, bh, 12).fill(); }, { blur: 5, y: 2 });
    let yy = by + 22;
    D.text(bx + 14, yy, '태양 / 달 비교', { size: 14, weight: 900, color: '#1e293b', align: 'left' }); yy += 6;
    yy = para(bx + 14, yy + 18 * FS * 0.8, bw - 28, '질량: 태양이 달의 ' + sci(SN / MN, 1) + ' 배', 12.5, '#334155', 800);
    yy = para(bx + 14, yy + 4, bw - 28, '거리: 태양이 달의 ' + fN(DS / DM, 0) + ' 배 → 세제곱 ' + sci(Math.pow(DS / DM, 3), 1) + ' 배', 12.5, '#334155', 800);
    yy += 8;
    // 막대 (M/d³)
    const mx = bx + 14, mw = bw - 28, bar = (v, c, lab, yb) => { const x0 = mx + 38, w0 = mw - 38 - 92; D.text(mx, yb + 15, lab[0], { size: 12.5, weight: 800, color: '#334155', align: 'left' }); ctx.fillStyle = '#e2e8f0'; rr(x0, yb, w0, 20, 6).fill(); const w = w0 * clamp(v / (TFM * 1.15), 0, 1) * q; ctx.fillStyle = c; rr(x0, yb, Math.max(2, w), 20, 6).fill(); D.text(x0 + w0 + 6, yb + 15, lab[1], { size: 12, weight: 900, color: '#1e293b', align: 'left' }); };
    bar(TFM, '#0ea5e9', ['달', sci(TFM, 2)], yy); bar(TFS, '#f59e0b', ['태양', sci(TFS, 2)], yy + 28);
    yy += 74;
    D.text(bx + 14, yy, show ? '달 / 태양 = ' + fN(RATIO_MS, 1) + ' 배' : '달 / 태양 = ?', { size: 16, weight: 900, color: show ? '#be123c' : '#94a3b8', align: 'left' });
    // ---- B: 달의 공전 궤도
    card(B, '🌙 달의 궤도는 타원: 근지점과 원지점');
    const a = PHONE ? 108 : 92, e = (APO - PERI) / (APO + PERI), aKm = (APO + PERI) / 2e8;     // aKm: 단위 10⁵ km (3.815)
    const cx = B.x + (PHONE ? B.w / 2 - 20 : 250), cy = B.y + (PHONE ? 160 : 134);
    // 궤도 (지구가 한 초점)
    ctx.strokeStyle = 'rgba(100,116,139,.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const th2 = (i / 120) * TAU, r = orbitR(th2, a, e); const x = cx + r * Math.cos(th2), y = cy - r * Math.sin(th2); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // 지구 (초점), 달
    const th = Math.acos(clamp(((aKm * (1 - e * e)) / S.dmV - 1) / e, -1, 1)), rpx = (S.dmV / aKm) * a;
    const earthX = cx, earthY = cy, mxp = earthX + Math.cos(th) * rpx, myp = earthY - Math.sin(th) * rpx;
    D.sphere(earthX, earthY, 14, '#3b82f6', { shadow: true }); D.text(earthX, earthY + 30, '지구', { size: 12, weight: 800, color: '#334155' });
    ctx.strokeStyle = 'rgba(30,41,59,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(earthX, earthY); ctx.lineTo(mxp, myp); ctx.stroke();
    D.sphere(mxp, myp, 9, '#e5e7eb', { shadow: true });
    D.label(clamp(mxp, B.x + 70, B.x + B.w - 70), myp - 22, 'd = ' + fN(S.dmV, 2) + '×10⁵ km', { bg: '#334155', size: 12, pad: 6 });
    // 근지점·원지점 표지
    D.text(earthX + (PERI / 1e8 / aKm) * a + 4, earthY + 20, '근지점 3.56', { size: 12, weight: 800, color: '#0369a1', align: 'left' });
    D.text(earthX - (APO / 1e8 / aKm) * a - 4, earthY + 20, '원지점 4.07', { size: 12, weight: 800, color: '#b45309', align: 'right' });
    // 막대: 평균 거리일 때를 1로
    const gx = PHONE ? B.x + 20 : B.x + 470, gw = PHONE ? B.w - 40 : B.w - 490, gy = PHONE ? B.y + 296 : B.y + 50, rowH = PHONE ? 32 : 38;
    D.text(gx, gy - 8, '달의 기조력 (평균 거리일 때 = 1.00)', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    const rel = (d) => Math.pow(DM / 1e8 / d, 3) * 1;   // d는 10⁵ km 단위
    const items = [['근지점', rel(PERI / 1e8), '#0ea5e9'], ['지금', rel(S.dmV), '#8b5cf6'], ['원지점', rel(APO / 1e8), '#f59e0b']];
    items.forEach((it, i) => {
      const y = gy + 6 + i * rowH; D.text(gx, y + 18, it[0], { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      const x0 = gx + 56, w0 = gw - 56 - 44; ctx.fillStyle = '#e2e8f0'; rr(x0, y, w0, 24, 6).fill();
      ctx.fillStyle = it[2]; rr(x0, y, Math.max(2, w0 * clamp(it[1] / 1.4, 0, 1)), 24, 6).fill();
      D.text(x0 + w0 + 6, y + 17, fN(it[1], 2), { size: 13, weight: 900, color: '#1e293b', align: 'left' });
    });
    const x1 = gx + 56 + (gw - 100) * (1 / 1.4); D.dashedLine(x1, gy + 2, x1, gy + 6 + 3 * rowH, { color: '#64748b', width: 1.5, dash: [4, 4] });
  }
  function readCompare() {
    const show = S.showCmp || (game && game.free);
    setReadouts(['M / d³ (달)', sci(TFM, 2), 'M / d³ (태양)', sci(TFS, 2), '달 / 태양', show ? fN(RATIO_MS, 1) + ' 배' : '직접 계산해요']);
  }

  /* ======================================================
     장면 3: 평형 조석 — 달과 태양의 부풀음이 합쳐져요
     ====================================================== */
  const eqRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 450 }, B: { x: 8, y: 466, w: 504, h: 280 }, C: { x: 8, y: 754, w: 504, h: 138 } }, { A: { x: 12, y: 12, w: 396, h: 406 }, B: { x: 416, y: 12, w: 372, h: 406 }, C: { x: 12, y: 426, w: 776, h: 122 } });
  const A0 = -Math.PI / 4;                                        // 하루 관측을 시작할 때의 달 기준 각도
  const alphaM = (h) => A0 + (TAU * h) / LDAY;                    // 관측점이 달과 이루는 각 (달 남중 = 0)
  const etaAt = (h, th) => (HM / 2) * Math.cos(2 * alphaM(h)) + (HS / 2) * Math.cos(2 * (alphaM(h) + th));
  const phaseName = (d) => { const near = (x) => Math.abs(d - x) <= 0.8; return near(0) || near(SYN) ? '삭 (새달)' : near(SYN / 4) ? '상현' : near(SYN / 2) ? '망 (보름달)' : near(SYN * 0.75) ? '하현' : d < SYN / 2 ? (d < SYN / 4 ? '초승달 쪽' : '보름 전') : (d < SYN * 0.75 ? '보름 후' : '그믐 쪽'); };
  const rangeDay = (d) => rangeAt(thOfDay(d));
  const isSpring = (d) => rangeDay(d) >= 0.70, isNeap = (d) => rangeDay(d) <= 0.28;
  function highsOf(th) {
    let n = 0, prev = etaAt(-0.05, th), cur = etaAt(0, th);
    for (let h = 0.05; h <= 24.001; h += 0.05) { const nx = etaAt(h, th); if (cur > prev && cur >= nx && cur > 0) n++; prev = cur; cur = nx; }
    return n;
  }
  function eqStep(dt) {
    S.dayV = approach(S.dayV, S.day, dt, 7);
    if (S.playing) { S.hr = Math.min(24, S.hr + dt * (RM ? 24 : 3)); if (S.hr >= 24) { S.playing = false; S.ran24 = true; } }
    if (isSpring(S.day)) S.seenSpring = true;
    if (isNeap(S.day)) S.seenNeap = true;
  }
  function drawEquil(t, dt) {
    eqStep(dt);
    const { A, B, C } = eqRC(), th = thOfDay(S.dayV), Rv = rangeAt(th);
    // ---- A: 위에서 본 지구
    card(A, '🌍 지구를 덮은 바다 (북극 위에서 본 모습)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.space(A.x, A.y + 30, A.w, A.h - 30, t, { stars: 50, top: '#243a6b', bottom: '#0b1330' });
    const cx = A.x + A.w / 2 + 24, cy = A.y + A.h / 2 + 18, Re = PHONE ? 74 : 66, Ro = Math.min(A.w / 2 - 70, A.h / 2 - 50, 128), KP = 78;
    // 태양 빛
    for (let i = -3; i <= 3; i++) arrowS(A.x + 56, cy + i * 34, A.x + 96, cy + i * 34, { color: 'rgba(253,224,71,.8)', width: 3, head: 9 });
    D.glow(A.x + 18, cy, 62, '#fde047', 0.55); D.sphere(A.x + 16, cy, 24, '#fbbf24', { shadow: false });
    D.text(A.x + 18, cy + 46, '태양', { size: 12.5, weight: 800, color: '#fef3c7' });
    ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const psiM = Math.PI - th, psiS = Math.PI;
    const eta = (psi) => (HM / 2) * Math.cos(2 * (psi - psiM)) + (HS / 2) * Math.cos(2 * (psi - psiS));
    // 물층
    ctx.fillStyle = 'rgba(56,189,248,.85)'; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU, r = Re + 9 + KP * eta(a); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(224,242,254,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 지구 (자전하는 대륙)
    const psiO = psiM - alphaM(S.hr);
    const gr = ctx.createRadialGradient(cx - Re * 0.35, cy - Re * 0.4, Re * 0.1, cx, cy, Re); gr.addColorStop(0, '#6aa9e8'); gr.addColorStop(1, '#1e4f94');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(psiO);
    ctx.fillStyle = 'rgba(134,192,126,.92)'; [[0.45, 0.1, 0.28], [-0.2, -0.45, 0.2], [-0.3, 0.4, 0.18], [0.1, -0.1, 0.12]].forEach((c) => { ctx.beginPath(); ctx.ellipse(c[0] * Re, c[1] * Re, c[2] * Re, c[2] * Re * 0.75, 0.5, 0, TAU); ctx.fill(); });
    ctx.restore();
    // 관측점 (자전을 따라 돌아요)
    const ox = cx + Math.cos(psiO) * Re, oy = cy + Math.sin(psiO) * Re, ho = Re + 9 + KP * eta(psiO);
    D.dashedLine(ox, oy, cx + Math.cos(psiO) * ho, cy + Math.sin(psiO) * ho, { color: '#fff', width: 2, dash: [3, 3] });
    D.sphere(ox, oy, 8, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.label(cx + Math.cos(psiO) * (Re + 40) + (Math.cos(psiO) < 0 ? -4 : 4), cy + Math.sin(psiO) * (Re + 40), '관측점', { bg: '#ef4444', size: 12, pad: 6, align: Math.cos(psiO) < 0 ? 'right' : 'left' });
    // 달
    const mx = cx + Math.cos(psiM) * Ro, my = cy + Math.sin(psiM) * Ro;
    D.sphere(mx, my, 15, '#e5e7eb', { shadow: true });
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, 15, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(15,23,42,.7)'; ctx.fillRect(mx, my - 16, 17, 32); ctx.restore();
    D.text(mx, my + (my < cy ? -22 : 30), '달', { size: 12.5, weight: 800, color: '#fef3c7' });
    D.label(A.x + A.w / 2, A.y + A.h - 22, S.ran24 || S.playing || S.hr > 0 ? '시각 ' + hhmm(S.hr * 60) + ' (0시부터)' : '날짜: ' + fN(S.dayV, 1) + '일 · ' + phaseName(S.day), { bg: '#334155', size: 13, pad: 10 });
    D.text(A.x + 12, A.y + A.h - 40, '높이는 크게 과장했어요', { size: 11.5, weight: 700, color: '#cbd5e1', align: 'left' });
    ctx.restore();
    // ---- B: 조위 곡선
    card(B, '📈 한 지점의 하루 조위 (날짜 ' + fN(S.day, 1) + '일 · ' + phaseName(S.day) + ')');
    const P = { x: B.x + 52, y: B.y + 50, w: B.w - 70, h: B.h - 100 };
    const X = (h) => P.x + (P.w * h) / 24, Y = (m) => P.y + P.h / 2 - (P.h / 2) * (m / 0.4);
    ctx.fillStyle = '#f8fafc'; rr(P.x, P.y, P.w, P.h, 4).fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [-0.4, -0.2, 0, 0.2, 0.4].forEach((m) => { ctx.strokeStyle = m === 0 ? '#94a3b8' : '#e2e8f0'; ctx.beginPath(); ctx.moveTo(P.x, Y(m)); ctx.lineTo(P.x + P.w, Y(m)); ctx.stroke(); D.text(P.x - 6, Y(m) + 4.5, (m > 0 ? '+' : m < 0 ? '−' : '') + Math.abs(m).toFixed(1), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    for (let h = 0; h <= 24; h += 6) { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(X(h), P.y); ctx.lineTo(X(h), P.y + P.h); ctx.stroke(); D.text(X(h), P.y + P.h + 16, h + '시', { size: 12, weight: 700, color: '#64748b' }); }
    D.text(P.x - 6, P.y - 16, '조위(m)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
    ctx.strokeStyle = 'rgba(2,132,199,.25)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let h = 0; h <= 24.001; h += 0.2) { const x = X(h), y = Y(etaAt(h, th)); h === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let h = 0; h <= S.hr + 0.001; h += 0.1) { const hh = Math.min(h, S.hr), x = X(hh), y = Y(etaAt(hh, th)); h === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // 만조(▲) 표시
    let prev = etaAt(-0.05, th), cur = etaAt(0, th), n = 0;
    for (let h = 0.05; h <= 24.001; h += 0.05) { const nx = etaAt(h, th); if (cur > prev && cur >= nx && cur > 0 && h - 0.05 <= S.hr) { n++; const x = X(h - 0.05), y = Y(cur); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x - 7, y + 20); ctx.lineTo(x + 7, y + 20); ctx.closePath(); ctx.fill(); D.text(x, y + 36, n + '회', { size: 12, weight: 900, color: '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); } prev = cur; cur = nx; }
    ctx.restore();
    const hx = X(S.hr), hy = Y(etaAt(S.hr, th)); D.sphere(hx, hy, 6, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.text(B.x + B.w / 2, B.y + B.h - 14, '관측점의 조위: ' + (etaAt(S.hr, th) < 0 ? '−' : '+') + Math.abs(etaAt(S.hr, th)).toFixed(2) + ' m  (평형 조석)', { size: 13, weight: 800, color: '#0369a1' });
    // ---- C: 조차 막대
    card(C, '📊 평형 조석의 조차 (높은 만조 − 낮은 간조)');
    const lx = C.x + (PHONE ? 100 : 130), lw = C.w - (PHONE ? 100 : 130) - 70, X2 = (m) => lx + (lw * clamp(m, 0, 0.8)) / 0.8;
    const rowsC = [['달만', HM, '#0ea5e9'], ['태양만', HS, '#f59e0b'], ['합성 조차', Rv, isSpring(S.day) ? '#dc2626' : isNeap(S.day) ? '#2563eb' : '#8b5cf6']];
    const rh = (C.h - 42) / 3;
    rowsC.forEach((r, i) => { const y = C.y + 34 + i * rh; D.text(C.x + 14, y + rh * 0.62, r[0], { size: 13, weight: 800, color: '#334155', align: 'left' }); ctx.fillStyle = '#f1f5f9'; rr(lx, y + 2, lw, rh - 6, 5).fill(); ctx.fillStyle = r[2]; rr(lx, y + 2, Math.max(2, X2(r[1]) - lx), rh - 6, 5).fill(); D.text(X2(r[1]) + 6, y + rh * 0.62, fN(r[1], 2) + ' m', { size: 13, weight: 900, color: '#1e293b', align: 'left' }); });
    if (isSpring(S.day)) D.label(C.x + C.w - 14, C.y + 20, '사리 (대조)', { bg: '#dc2626', size: 12.5, pad: 8, align: 'right' });
    else if (isNeap(S.day)) D.label(C.x + C.w - 14, C.y + 20, '조금 (소조)', { bg: '#2563eb', size: 12.5, pad: 8, align: 'right' });
  }
  function readEquil() {
    const th = thOfDay(S.day);
    setReadouts(['달 · 태양 위상', fN(S.day, 1) + '일 · ' + phaseName(S.day), '조차', fN(rangeAt(th), 2) + ' m', '하루 만조 횟수', S.ran24 || (game && game.free) ? highsOf(th) + '회' : '재생해서 세어요']);
  }

  /* ======================================================
     장면 4: 조석 주기 — 태음일 24시간 50분, 만조 시각은 매일 약 50분씩 늦어져요
     ====================================================== */
  const cycRC = () => phoneRC({ A: { x: 8, y: 8, w: 504, h: 420 }, B: { x: 8, y: 436, w: 504, h: 456 } }, { A: { x: 12, y: 12, w: 776, h: 266 }, B: { x: 12, y: 286, w: 776, h: 262 } });
  const MOON_DAY_DEG = 360 / SYN;                                    // 달이 하루에 공전하는 각도 ≈ 12.2°
  const high1 = (d) => 360 + DELAY_MIN * d;                          // d일 뒤 오전 만조 시각(분): 오늘 06:00
  const high2 = (d) => high1(d) + (LDAY / 2) * 60;                   // 오후 만조 = 약 12시간 25분 뒤
  const hm = (h) => Math.floor(h) + '시간 ' + Math.floor((h - Math.floor(h)) * 60 + 1e-9) + '분';
  function cycStep(dt) {
    if (S.c2run) {
      S.c2 = Math.min(LDAY, S.c2 + dt * (RM ? 30 : 5));
      if (S.c2 >= LDAY - 1e-9) { S.c2run = false; S.ranCyc = true; const g = cycGeom(); parts.burst(g.mx, g.my, { count: 22, speed: 170, colors: ['#fde68a', '#fbbf24', '#38bdf8'] }); }
    }
    S.tblT = approach(S.tblT, 1, dt, 3);
  }
  function cycGeom() {
    const { A, B } = cycRC();
    const g = { A, B, cx: A.x + (PHONE ? 170 : 190), cy: A.y + (PHONE ? 190 : 150), Re: PHONE ? 62 : 56, Ro: PHONE ? 150 : 124 };
    g.mx = g.cx + g.Ro * Math.cos(-MOON_DAY_DEG * DEG * (S.c2 / 24)); g.my = g.cy + g.Ro * Math.sin(-MOON_DAY_DEG * DEG * (S.c2 / 24));
    return g;
  }
  function drawCycle(t, dt) {
    cycStep(dt);
    const g = cycGeom(), { A, B, cx, cy, Re, Ro } = g, h = S.c2;
    card(A, '🌍🌙 달이 다시 남중하기까지 (북극 위에서 본 모습)');
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    D.space(A.x, A.y + 30, A.w, A.h - 30, t, { stars: 50, top: '#243a6b', bottom: '#0b1330' });
    const phiM = -MOON_DAY_DEG * DEG * (h / 24), psi = -TAU * (h / 24);       // 달의 방향과 관측점의 방향 (별 기준)
    // 처음의 달 방향(0시)과 현재 달 방향
    D.dashedLine(cx, cy, cx + (Ro + 26) * Math.cos(0), cy, { color: 'rgba(148,163,184,.7)', width: 1.6, dash: [4, 5] });
    D.text(cx + Ro + 30, cy + 22, '0시의 달 방향', { size: 11.5, weight: 700, color: '#cbd5e1', align: 'left' });
    ctx.strokeStyle = 'rgba(253,230,138,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(g.mx, g.my); ctx.stroke();
    // 달이 이동한 각 (호)
    if (h > 0.2) { ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, Ro * 0.62, phiM, 0); ctx.stroke(); }
    if (h >= 24) D.label(cx + 8, cy - Re - 26, MOON_DAY_DEG.toFixed(1) + '° (하루 동안 달의 이동)', { bg: '#a16207', size: 12, pad: 7, align: 'left' });
    // 지구와 관측점
    D.glow(cx, cy, Re + 22, '#38bdf8', 0.25);
    const gr = ctx.createRadialGradient(cx - Re * 0.35, cy - Re * 0.4, Re * 0.1, cx, cy, Re); gr.addColorStop(0, '#6aa9e8'); gr.addColorStop(1, '#1e4f94');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(psi);
    ctx.fillStyle = 'rgba(134,192,126,.92)'; [[0.45, 0.1, 0.28], [-0.2, -0.45, 0.2], [-0.3, 0.4, 0.18]].forEach((c) => { ctx.beginPath(); ctx.ellipse(c[0] * Re, c[1] * Re, c[2] * Re, c[2] * Re * 0.75, 0.5, 0, TAU); ctx.fill(); });
    ctx.restore();
    const ox = cx + Math.cos(psi) * Re, oy = cy + Math.sin(psi) * Re;
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(psi) * (Ro + 14), cy + Math.sin(psi) * (Ro + 14)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(ox, oy, 8, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.sphere(g.mx, g.my, 14, '#e5e7eb', { shadow: true });
    D.text(g.mx, g.my - 22, '달', { size: 12.5, weight: 800, color: '#fef3c7' });
    const trans = S.ranCyc && h >= LDAY - 1e-6;
    if (trans) D.ring(g.mx, g.my, 22, t, { color: '#fde047', speed: 1.2, width: 2.4 });
    // 시계
    D.label(cx, A.y + A.h - 20, '경과 시간 ' + hm(h) + (trans ? ' · 달이 다시 남중!' : (h >= 24 ? ' (한 바퀴 돌았지만 달이 아직…)' : '')), { bg: trans ? '#15803d' : '#334155', size: 13, pad: 10 });
    // 설명 카드 (태블릿은 오른쪽, 휴대폰은 숨김)
    if (!PHONE) {
      const sx = A.x + 410, sw = A.w - 410 - 14; let sy = A.y + 44;
      const stepsT = [['① 24시간', '지구가 한 바퀴 돌아 관측점이 0시의 방향으로 돌아와요.', h >= 24 || h > 0], ['② 그동안', '달도 같은 방향으로 공전해서 약 ' + MOON_DAY_DEG.toFixed(1) + '° 이동했어요.', h >= 24], ['③ 더 돌아야', '관측점이 달을 다시 향하려면 지구가 그만큼 더 돌아야 해요.', trans]];
      stepsT.forEach((s2, i) => {
        const hh = 62; D.shadow(() => { ctx.fillStyle = s2[2] ? 'rgba(255,255,255,.97)' : 'rgba(226,232,240,.8)'; rr(sx, sy, sw, hh, 10).fill(); }, { blur: 4, y: 2 });
        D.text(sx + 12, sy + 20, s2[0], { size: 13.5, weight: 900, color: s2[2] ? '#1e3a8a' : '#475569', align: 'left' });
        para(sx + 12, sy + 38, sw - 24, s2[1], 12, s2[2] ? '#334155' : '#475569', 700);
        sy += hh + 8;
      });
    }
    ctx.restore();
    // ---- B: 만조 시각 달력
    card(B, '📅 만조 시각 달력 (오늘 오전 만조 06:00 예시)');
    const rows = 7, labW = PHONE ? 62 : 74, rtW = PHONE ? 0 : 150, rh = (B.h - 74) / rows, ax = B.x + 14 + labW, aw = B.w - 28 - labW - rtW, by0 = B.y + 56;
    const AX = (min) => ax + (aw * min) / 1440;
    for (let hh2 = 0; hh2 <= 24; hh2 += 6) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(AX(hh2 * 60), by0 - 6); ctx.lineTo(AX(hh2 * 60), by0 + rows * rh); ctx.stroke(); D.text(AX(hh2 * 60), by0 - 12, hh2 + '시', { size: 11.5, weight: 700, color: '#64748b' }); }
    const showAll = S.showAns || (game && game.free);
    for (let d = 0; d < rows; d++) {
      const y = by0 + d * rh, vis = d <= 2 || showAll, hidden = d === 3 && !showAll;
      ctx.fillStyle = d === S.dayRow ? 'rgba(14,165,233,.14)' : (d % 2 ? '#f8fafc' : '#fff'); rr(B.x + 8, y + 1, B.w - 16, rh - 2, 6).fill();
      D.text(B.x + 16, y + rh * 0.62, d === 0 ? '오늘' : d + '일 뒤', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      if (!vis && !hidden) { D.text(ax + aw / 2, y + rh * 0.62, '· · ·', { size: 13, weight: 800, color: '#cbd5e1' }); continue; }
      if (hidden) { D.text(ax + aw / 2, y + rh * 0.64, '? (직접 계산해서 오른쪽 입력칸에 써요)', { size: 12.5, weight: 800, color: '#94a3b8' }); if (!PHONE) D.text(B.x + B.w - 14, y + rh * 0.62, '??:?? · ??:??', { size: 12.5, weight: 800, color: '#94a3b8', align: 'right' }); continue; }
      [high1(d), high2(d)].forEach((m, k) => {
        const x = AX(m * S.tblT + 360 * (1 - S.tblT)), yy = y + rh * 0.5;
        ctx.fillStyle = k ? '#2563eb' : '#dc2626'; ctx.beginPath(); ctx.moveTo(x, yy - 8); ctx.lineTo(x - 6, yy + 5); ctx.lineTo(x + 6, yy + 5); ctx.closePath(); ctx.fill();
        if (PHONE) D.text(x, yy + rh * 0.42, hhmm(m), { size: 11, weight: 800, color: '#334155' });
      });
      if (!PHONE) D.text(B.x + B.w - 14, y + rh * 0.62, hhmm(high1(d)) + ' · ' + hhmm(high2(d)), { size: 12.5, weight: 800, color: '#334155', align: 'right' });
    }
    // 지연 화살표 (첫 줄 → 마지막 줄 오전 만조)
    const lastD = showAll ? rows - 1 : 2;
    if (lastD >= 1) { D.dashedLine(AX(high1(0)), by0 + rh * 0.5, AX(high1(lastD)), by0 + lastD * rh + rh * 0.5, { color: 'rgba(220,38,38,.55)', width: 2, dash: [5, 4] }); }
    D.text(B.x + B.w / 2, B.y + B.h - 10, '▲ 빨강: 오전 만조 · 파랑: 오후 만조 (두 만조 사이 약 12시간 25분)', { size: 12, weight: 700, color: '#64748b' });
  }
  function readCycle() {
    setReadouts(['달이 하루에 이동', MOON_DAY_DEG.toFixed(1) + '°', '태음일', S.ranCyc || (game && game.free) ? '24시간 50분' : '재생해서 재요', '만조 간격', S.showAns || (game && game.free) ? '약 12시간 25분' : '달력에서 읽어요']);
  }

  /* ======================================================
     입력 도구 · 컨트롤
     ====================================================== */
  const stCh = makeChoice($('#stCh'), [{ id: '1', label: '① 달의 인력' }, { id: '2', label: '② 중심의 평균 인력' }, { id: '3', label: '③ 차이 = 기조력' }], (v) => { S.stage = +v; });
  const letter = (c, col) => '<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:' + col + ';color:#fff;font-weight:900;font-size:13px;margin-right:6px">' + c + '</span>';
  const DIR_OPTS = [{ id: 'toward', label: '달 쪽으로' }, { id: 'away', label: '달의 반대쪽으로' }, { id: 'center', label: '지구 중심 쪽으로' }];
  const selDir = makeSelects($('#selDir'), [
    { id: 'p1', label: letter('A', '#f59e0b') + '달에 가까운 면' }, { id: 'p2', label: letter('B', '#f59e0b') + '위쪽 옆면' },
    { id: 'p3', label: letter('C', '#f59e0b') + '달의 반대쪽 면' }, { id: 'p4', label: letter('D', '#f59e0b') + '아래쪽 옆면' },
  ], DIR_OPTS, { p1: 'toward', p2: 'center', p3: 'away', p4: 'center' });
  const numMS = makeNum($('#numMS'), { label: '달 / 태양', unit: '배' });
  const numPA = makeNum($('#numPA'), { label: '근지점 / 원지점', unit: '배' });
  const stpN = makeStepper($('#stpN'), { min: 0, max: 4, step: 1, value: 0, dec: 0, unit: '회' });
  const numLH = makeNum($('#numLH'), { label: '시간', unit: '시간' });
  const numLM = makeNum($('#numLM'), { label: '분', unit: '분' });
  const numTH = makeNum($('#numTH'), { label: '시', unit: '시' });
  const numTM = makeNum($('#numTM'), { label: '분', unit: '분' });
  SciSim.bindRange($('#sDm'), $('#oDm'), (v) => fN(v, 2) + '×10⁵ km', (v) => { S.dm = +v; if (+v <= 3.57 || +v >= 4.06) S.seenPA = true; });
  SciSim.bindRange($('#sDay'), $('#oDay'), (v) => fN(v, 1) + '일 · ' + phaseName(+v), (v) => { S.day = +v; });
  SciSim.bindRange($('#sRow'), $('#oRow'), (v) => (+v === 0 ? '오늘' : v + '일 뒤'), (v) => { S.dayRow = +v; });
  const setDm = (v) => { S.dm = v; S.dmV = v; setSlider($('#sDm'), $('#oDm'), v, (x) => fN(x, 2) + '×10⁵ km'); };
  const setDay = (v) => { S.day = v; setSlider($('#sDay'), $('#oDay'), v, (x) => fN(x, 1) + '일 · ' + phaseName(+x)); };
  const setRow = (v) => { S.dayRow = v; setSlider($('#sRow'), $('#oRow'), v, (x) => (+x === 0 ? '오늘' : x + '일 뒤')); };
  const setStage = (v) => { S.stage = v; stCh.set(String(v)); };
  $('#bPlay').addEventListener('click', () => { Sound.click(); S.hr = 0; S.playing = true; syncBtns(); });
  $('#bCyc').addEventListener('click', () => { Sound.click(); S.c2 = 0; S.c2run = true; S.ranCyc = false; parts.clear(); syncBtns(); });
  const setTx = (el, tx) => { if (el.textContent !== tx) el.textContent = tx; };
  function syncBtns() {
    setTx($('#bPlay'), S.playing ? '⏳ 재생 중…' : S.hr > 0 ? '↺ 하루 다시 재생' : '▶ 하루 재생 (24시간)');
    setTx($('#bCyc'), S.c2run ? '⏳ 지나가는 중…' : S.c2 > 0 ? '↺ 처음부터 다시' : '▶ 하루 지나기');
  }

  const MODE_LABEL = { force: '🌙 기조력', compare: '⚖️ 달과 태양', equil: '🌍 평형 조석', cycle: '📅 조석 주기' };
  const FREE_KEYS = { force: ['stCh'], compare: ['sDm'], equil: ['sDay', 'bPlay'], cycle: ['bCyc', 'sRow'] };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode] : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    syncBtns();
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear();
    setStage(1); S.stV = [0, 0, 0]; S.bulge = 0; selDir.reset();
    setDm(3.844); S.showCmp = false; S.cmpT = 0; numMS.reset(); numPA.reset(); S.seenPA = false;
    setDay(3.5); S.dayV = 3.5; S.hr = 0; S.playing = false; S.ran24 = false; S.seenSpring = false; S.seenNeap = false; stpN.reset();
    S.c2 = 0; S.c2run = false; S.ranCyc = false; S.showAns = false; setRow(3); S.tblT = 0; numLH.reset(); numLM.reset(); numTH.reset(); numTM.reset();
    if (li === 0) { setMode('force'); setCtl(['stCh', 'selDir']); showHint('①②③ 단추를 차례로 눌러 화살표를 비교해 봐요', 5200); }
    else if (li === 1) { setMode('compare'); setCtl(['numMSc']); showHint('달과 태양의 M, d를 보고 M / d³ 를 비교해 봐요', 5200); }
    else if (li === 2) { setMode('equil'); setCtl(['sDay']); showHint('날짜 슬라이더로 달의 위치(위상)를 바꿔 봐요', 5200); }
    else { setMode('cycle'); setCtl(['bCyc', 'calcLD']); showHint('‘하루 지나기’를 눌러 달이 다시 남중할 때까지 지켜봐요', 5200); }
    updateCtl();
  }
  const mark2 = mark;
  const levels = [
    {
      title: '기조력: 인력의 차이가 바다를 부풀려요', short: '기조력', icon: '🌙', phase: '모형', features: ['force'],
      intro: '<p class="si-q">❓ 탐구 질문: 바다는 달이 있는 쪽에서만 부풀까? 하루에 만조가 두 번 생기는 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 ‘해일의 원인과 피해’에서</b> 총 수위에 <b>천문 조위</b>가 더해졌어요. 그 조위, 곧 밀물과 썰물은 달과 태양이 만들어요. 중학교에서 달의 위상과 조석(밀물·썰물)을 배운 것을 이어서 알아봐요.</div>' +
        '<p><b>기조력</b>은 조석을 일으키는 힘이에요. 달의 인력은 거리에 따라 달라요. 달에 가까운 면은 세고 먼 면은 약해요. 그런데 지구는 달과 함께 공전하면서 <b>중심이 받는 평균 인력</b>만큼 끌려가요. 이 평균과의 <b>차이</b>가 기조력이에요. (기조력을 유도하지는 않고 그림으로 확인해요.)</p>',
      setup() { resetStep(0); },
      recap: '기조력은 그 지점의 달의 인력에서 지구 중심의 평균 인력을 뺀 값이에요. 그래서 달 쪽과 반대쪽 두 곳에서 바닷물이 부풀어요.',
      summary: '<ul><li><b>기조력</b> = (그 지점에서 받는 달의 인력) − (지구 중심이 받는 평균 인력).</li><li>달에 가까운 면(A)은 인력이 평균보다 커서 <b>달 쪽으로</b>, 먼 면(C)은 평균보다 작아서 <b>달의 반대쪽으로</b>, 옆면(B, D)은 합력이 <b>지구 중심 쪽</b>을 향해요.</li><li>그래서 바다는 <b>달 쪽과 반대쪽 두 곳</b>에서 부풀어요 → 하루에 만조가 약 2번. 기조력의 크기는 <b>M / d³</b>에 비례해요.</li></ul>',
      missions: [
        {
          title: '지점별 기조력 방향', manual: true,
          goal: '①→②→③ 단추를 눌러 화살표를 비교하고, 지구 위 네 지점(A~D)의 <b>기조력 방향</b>을 골라요.',
          hint: '③ 단추를 누르면 빨간 기조력 화살표가 보여요. A는 오른쪽(달 쪽), C는 왼쪽(달의 반대쪽), 옆면 B와 D는 지구 중심 쪽을 향해요.',
          setup() { setStage(1); selDir.reset(); setMode('force'); setCtl(['stCh', 'selDir']); },
          status: () => mark2(selDir.ok()) + ' 방향을 고른 지점 ' + selDir.count() + ' / 4' + (S.stage < 3 ? ' (③ 단추를 눌러 확인해요)' : ''),
          check() {
            if (!selDir.complete()) return '네 지점 모두 골라 주세요. (지금 ' + selDir.count() + '곳)';
            if (!selDir.ok()) { selDir.mark(selDir.wrong()); return '빨간 줄이 달라요. ③ 기조력 화살표의 방향을 다시 봐요.'; }
            return true;
          },
          explain: 'A면은 <b>달 쪽으로</b>(달의 인력 &gt; 평균), C면은 <b>달의 반대쪽으로</b>(달의 인력 &lt; 평균), 옆면 B와 D는 <b>지구 중심 쪽으로</b> 기조력이 작용해요. 중심이 받는 평균 인력과의 차이만 남기 때문이에요.',
        },
        {
          type: 'quiz', title: '달 반대쪽에서도 부풀어요',
          goal: '달의 <b>반대쪽 면</b>에서도 바닷물이 부푸는 까닭은?',
          setup() { setStage(3); setMode('force'); setCtl(['stCh']); },
          choices: ['그쪽에서는 달의 인력이 지구 중심이 받는 평균 인력보다 작아서, 상대적으로 달의 반대쪽으로 쏠리기 때문이에요', '그쪽 바다는 태양의 인력 때문에 부풀기 때문이에요', '지구 자전의 원심력 때문이에요', '그쪽에서는 달의 인력이 전혀 작용하지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '태양도 기조력을 만들지만 달 반대쪽 부풀음의 원인은 아니에요. 달만 있어도 두 곳이 부풀어요.', '자전의 원심력은 지구 어디서나 대칭이라 두 곳의 부풀음을 만들지 않아요. 기조력은 달의 인력의 차이예요.', '반대쪽에도 달의 인력은 작용해요. 다만 중심의 평균 인력보다 작아서 차이(기조력)가 달의 반대쪽을 향해요.'],
          explain: '반대쪽 면의 달의 인력은 평균보다 약 3.2 % 작아요(C면 0.968). 그래서 평균과의 차이인 기조력이 달의 반대쪽을 향하고, 바다는 <b>달 쪽과 반대쪽 두 곳</b>에서 부풀어요.',
        },
      ],
    },
    {
      title: '달과 태양: 기조력은 M / d³', short: '달과 태양', icon: '⚖️', phase: '분석', features: ['compare'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기조력이 인력의 차이라는 것을 봤어요. 그런데 태양은 질량이 달의 약 2700만 배인데 기조력은 더 클까요? <b>기조력의 크기는 M / d³에 비례</b>해요(주어진 관계로 써요).</div>' +
        '<p>M은 천체의 질량, d는 지구에서의 거리예요. 거리가 <b>세제곱</b>으로 효과를 내서, 멀리 있는 천체는 질량이 커도 기조력이 약해요. 달의 궤도는 타원이라 근지점과 원지점에서도 기조력이 달라요.</p>',
      setup() { resetStep(1); },
      recap: '기조력은 M / d³에 비례해요. 달의 기조력은 태양의 약 2.2배(태양은 달의 약 0.46배)이고, 근지점에서는 원지점의 약 1.5배예요.',
      summary: '<ul><li>기조력 ∝ <b>M / d³</b>. 달: 7.35×10²² kg, 3.844×10⁸ m → 1.29×10⁻³. 태양: 1.99×10³⁰ kg, 1.496×10¹¹ m → 5.9×10⁻⁴ (임의 단위).</li><li><b>달의 기조력은 태양의 약 2.2배</b>(태양은 달의 약 0.46배). 태양은 질량이 약 2.7×10⁷ 배지만 거리가 약 389배 멀어서 거리 효과(389³ ≈ 5.9×10⁷)가 더 커요.</li><li>달 궤도: 근지점 3.56×10⁵ km, 원지점 4.07×10⁵ km → 기조력 비 (4.07/3.56)³ ≈ <b>1.5배</b>.</li></ul>',
      missions: [
        {
          title: '달과 태양의 기조력 비',
          goal: '두 천체의 M / d³ 값을 비교해서 <b>달의 기조력은 태양의 몇 배</b>인지 소수 첫째 자리까지 입력해요.',
          hint: '1.29×10⁻³ / 5.9×10⁻⁴ ≈ 2.2예요. 질량 비(2.7×10⁷)를 거리 비의 세제곱(5.9×10⁷)으로 나눈 값의 역수와 같아요.',
          setup() { S.showCmp = false; S.cmpT = 0; numMS.reset(); setMode('compare'); setCtl(['numMSc']); },
          check: () => numMS.near(Number(fN(RATIO_MS, 1)), 0.1), hold: 0.8,
          status: () => mark2(numMS.near(Number(fN(RATIO_MS, 1)), 0.1)) + ' 입력 ' + (numMS.has() ? numMS.value + ' 배' : '?'),
          explain: '달 M/d³ ≈ 1.29×10⁻³, 태양 ≈ 5.9×10⁻⁴이므로 <b>달 / 태양 ≈ 2.2</b>예요. 거꾸로 태양의 기조력은 달의 약 0.46배예요. 성취기준에서 말하는 “달이 태양의 2배 정도”와 같아요.',
        },
        {
          title: '근지점과 원지점',
          goal: '달의 거리 슬라이더를 <b>근지점(3.56)</b>과 <b>원지점(4.07)</b>으로 움직여 보고, 근지점의 기조력이 원지점의 <b>몇 배</b>인지 입력해요.',
          hint: '막대 그래프의 두 값(1.26과 0.84)을 나누거나, (4.07 / 3.56)³을 계산해요. 약 1.5예요.',
          setup() { S.showCmp = true; S.seenPA = false; setDm(3.844); numPA.reset(); setMode('compare'); setCtl(['sDm', 'numPAc']); },
          check: () => S.seenPA && numPA.near(Number(fN(RATIO_PA, 1)), 0.1), hold: 0.8,
          status: () => mark2(S.seenPA) + ' 근지점·원지점 확인 · ' + mark2(numPA.near(Number(fN(RATIO_PA, 1)), 0.1)) + ' 입력 ' + (numPA.has() ? numPA.value + ' 배' : '?'),
          explain: '기조력 ∝ 1/d³이므로 (4.07/3.56)³ ≈ <b>1.5</b>배예요. 근지점 부근의 보름·그믐에는 조차가 특히 커져요.',
        },
        {
          type: 'quiz', title: '질량이 큰 태양이 왜 약할까?',
          goal: '태양은 질량이 달의 약 2700만 배인데도 기조력은 달보다 작은 까닭은?',
          setup() { S.showCmp = true; setDm(3.844); setMode('compare'); setCtl(['sDm']); },
          choices: ['기조력은 거리의 세제곱에 반비례하는데, 태양이 달보다 약 389배 멀어서 거리 효과(약 5900만 배)가 질량 효과(약 2700만 배)보다 크기 때문이에요', '태양은 인력이 없어서 조석에 영향을 주지 못해요', '태양은 달보다 가벼워서 기조력이 작아요', '태양 빛이 인력을 약하게 만들기 때문이에요'],
          answer: 0,
          feedback: ['', '태양도 기조력을 만들어요. 달의 약 0.46배의 크기로 조석에 영향을 줘요.', '태양의 질량은 달의 약 2700만 배예요. 질량이 아니라 거리 효과가 문제예요.', '빛은 인력과 관계가 없어요. 인력은 질량과 거리로 정해져요.'],
          explain: '질량 비 2.7×10⁷ 배보다 거리 비 389의 세제곱 5.9×10⁷ 배가 더 커서 태양의 M/d³는 달의 약 0.46배예요. 그래서 조석에서는 <b>달의 영향이 약 2배</b> 더 커요.',
        },
      ],
    },
    {
      title: '평형 조석: 두 부풀음이 합쳐져요', short: '평형 조석', icon: '🌍', phase: '모형', features: ['equil'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달의 기조력이 태양의 약 2.2배라는 것을 확인했어요. 이제 <b>바다가 지구 전체를 덮고 있고 즉시 평형을 이룬다</b>고 가정한 <b>평형 조석</b>을 살펴봐요.</div>' +
        '<p>달만 있을 때 조차(높은 만조와 낮은 간조의 차)는 약 <b>0.49 m</b>, 태양만 있으면 약 <b>0.23 m</b>예요. 달과 태양의 부풀음이 어떻게 합쳐지는지 위상 슬라이더로 알아봐요. 지구가 자전하면 한 지점은 두 부풀음을 차례로 지나가요. (동적 조석론은 다루지 않아요.)</p>',
      setup() { resetStep(2); },
      recap: '삭과 망에는 달과 태양의 부풀음이 겹쳐 사리(조차 0.72 m), 상현과 하현에는 어긋나 조금(조차 0.26 m)이에요. 한 지점에서는 하루 약 2번 만조가 와요.',
      summary: '<ul><li><b>평형 조석</b>: 바다가 지구를 덮고 즉시 평형을 이룬다고 가정. 조차는 달만 <b>0.49 m</b>, 태양만 <b>0.23 m</b>.</li><li><b>사리</b>(대조): 삭·망(지구–달–태양이 일직선) → 부풀음이 겹쳐 조차 0.49 + 0.23 = <b>0.72 m</b>. <b>조금</b>(소조): 상현·하현(직각) → 서로 상쇄되어 0.49 − 0.23 = <b>0.26 m</b>.</li><li>한 달(29.5일)에 사리와 조금이 각각 <b>두 번</b>(약 14.8일 간격). 보름달(망)에도 사리예요.</li><li>지구가 자전하며 한 지점이 두 부풀음을 지나므로 <b>하루 약 2번</b> 만조가 와요.</li></ul>',
      missions: [
        {
          title: '사리와 조금 찾기',
          goal: '날짜 슬라이더를 움직여 <b>사리</b>(조차 0.70 m 이상)가 되는 위상과 <b>조금</b>(조차 0.28 m 이하)이 되는 위상을 각각 찾아요.',
          hint: '삭(0일)이나 망(약 14.8일)에서 조차가 가장 크고, 상현(약 7.4일)이나 하현(약 22.1일)에서 가장 작아요.',
          setup() { setDay(3.5); S.dayV = 3.5; S.seenSpring = false; S.seenNeap = false; setMode('equil'); setCtl(['sDay']); },
          check: () => S.seenSpring && S.seenNeap, hold: 0.5,
          status: () => mark2(S.seenSpring) + ' 사리 확인 · ' + mark2(S.seenNeap) + ' 조금 확인 · 지금 조차 ' + fN(rangeDay(S.day), 2) + ' m (' + phaseName(S.day) + ')',
          explain: '삭·망에서는 달과 태양의 부풀음이 같은 선에 놓여 겹치므로 조차가 0.49 + 0.23 = <b>0.72 m</b>(사리), 상현·하현에서는 직각이라 서로 상쇄되어 0.49 − 0.23 = <b>0.26 m</b>(조금)예요.',
        },
        {
          title: '하루에 만조는 몇 번?',
          goal: '<b>하루 재생</b>을 눌러 한 지점의 24시간 조위 곡선을 그리고, 만조가 몇 번 오는지 입력해요.',
          hint: '‘하루 재생’을 누르면 관측점이 지구와 함께 돌며 곡선이 그려져요. 빨간 ▲ 표시를 세어 보세요.',
          setup() { S.hr = 0; S.playing = false; S.ran24 = false; stpN.reset(); setMode('equil'); setCtl(['sDay', 'bPlay', 'stpN']); },
          check: () => S.ran24 && stpN.value === highsOf(thOfDay(S.day)), hold: 0.6,
          status: () => mark2(S.ran24) + ' 24시간 재생 · ' + mark2(S.ran24 && stpN.value === highsOf(thOfDay(S.day))) + ' 만조 ' + stpN.value + '회',
          explain: '관측점은 하루에 달 쪽 부풀음과 반대쪽 부풀음을 차례로 지나가요. 그래서 하루에 만조가 <b>약 2번</b>(간조도 2번) 와요. 이것을 <b>반일주조</b>라고 해요.',
        },
        {
          type: 'quiz', title: '보름달에도 사리인 까닭',
          goal: '달이 태양의 <b>반대쪽</b>에 있는 보름(망)에도 사리가 되는 까닭은?',
          setup() { setDay(14.5); S.dayV = 14.5; setMode('equil'); setCtl(['sDay']); },
          choices: ['망에는 달이 지구를 사이에 두고 태양의 반대쪽에 있어서, 달 쪽·반대쪽 부풀음과 태양 쪽·반대쪽 부풀음이 같은 선에서 겹치기 때문이에요', '보름달은 더 밝아서 인력이 더 커지기 때문이에요', '사리는 삭에만 생기고 보름에는 조금이에요', '상현과 하현에도 부풀음이 겹쳐서 사리가 돼요'],
          answer: 0,
          feedback: ['', '달의 밝기는 인력과 관계없어요. 위치(일직선)가 핵심이에요.', '삭에서 달과 태양이 같은 쪽에 있을 때도, 망에서 반대쪽에 있을 때도 부풀음이 같은 선에 겹쳐서 모두 사리예요.', '상현·하현은 달이 태양과 직각이라 부풀음이 어긋나서 조금이에요.'],
          explain: '기조력은 <b>양쪽(달 쪽과 반대쪽)</b>을 부풀려요. 삭이든 망이든 지구–달–태양이 일직선이면 달의 부풀음과 태양의 부풀음이 겹쳐서 사리예요. 상현·하현은 직각이라 어긋나 조금이에요.',
        },
      ],
    },
    {
      title: '조석 주기: 매일 약 50분씩 늦어요', short: '조석 주기', icon: '📅', phase: '기록', features: ['cycle'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 하루에 만조가 약 2번 온다고 했어요. 그런데 만조는 매일 같은 시각에 올까요? 달이 <b>공전</b>한다는 점에 주목해요.</div>' +
        '<p>지구가 한 바퀴 도는 데 24시간이 걸려도, 그동안 달도 같은 방향으로 약 12.2°(360° / 29.5일) 이동해요. 그래서 관측점이 달을 다시 향하려면 더 돌아야 해요. 달이 같은 자오선에 다시 오는 시간(<b>태음일</b>)을 직접 재고, 만조 시각표를 만들어 봐요.</p>',
      setup() { resetStep(3); },
      recap: '달이 같은 자오선에 다시 오는 데 24시간 50분이 걸려서, 만조 시각은 매일 약 50분씩 늦어지고 만조 간격은 약 12시간 25분이에요.',
      summary: '<ul><li><b>태음일</b>: 달이 같은 자오선에 다시 오는 시간 = 24시간 / (1 − 1/29.5) ≈ <b>24시간 50분</b>. 달이 하루에 약 12.2° 공전하기 때문이에요.</li><li>그래서 만조 시각은 <b>매일 약 50분씩 늦어져요</b>. 오늘 오전 만조가 06:00이면 3일 뒤는 약 08:30이에요.</li><li>하루 두 번의 만조 간격은 태음일의 절반 = 약 <b>12시간 25분</b>(12시간이 아니에요).</li><li>사리·조금은 약 14.8일마다 되풀이돼요.</li></ul>',
      missions: [
        {
          title: '태음일 재기',
          goal: '‘하루 지나기’를 눌러 달이 같은 자오선에 <b>다시 오는 시간</b>을 재고, <b>시간과 분</b>으로 입력해요.',
          hint: '지구가 한 바퀴(24시간) 돈 뒤에도 달이 조금 이동해서, 관측점이 달을 다시 향하려면 더 돌아야 해요. 마지막 ‘경과 시간’을 읽어요(약 50분 더).',
          setup() { S.c2 = 0; S.c2run = false; S.ranCyc = false; numLH.reset(); numLM.reset(); setMode('cycle'); setCtl(['bCyc', 'calcLD']); },
          check: () => S.ranCyc && numLH.near(24, 0) && numLM.near(50, 2), hold: 0.8,
          status: () => mark2(S.ranCyc) + ' 달이 다시 남중 · ' + mark2(numLH.near(24, 0) && numLM.near(50, 2)) + ' 입력 ' + (numLH.has() ? numLH.value : '?') + '시간 ' + (numLM.has() ? numLM.value : '?') + '분',
          explain: '달은 하루에 약 360°/29.5 ≈ 12.2° 공전해요. 그 각도만큼 지구가 더 돌아야 하므로 24시간 / (1 − 1/29.5) ≈ <b>24시간 50분</b>이에요.',
        },
        {
          title: '3일 뒤 만조 시각', manual: true,
          goal: '오늘 오전 만조가 <b>06:00</b>일 때, <b>3일 뒤</b> 오전 만조 시각을 입력해요. 달력 슬라이더로 줄을 골라 볼 수 있어요.',
          hint: '1일 뒤 06:51, 2일 뒤 07:41처럼 매일 약 50분씩 늦어져요. 3일이면 약 150분(2시간 30분)이 늦어져요.',
          setup() { S.showAns = false; setRow(3); numTH.reset(); numTM.reset(); S.tblT = 0; setMode('cycle'); setCtl(['sRow', 'calcT2']); },
          status: () => mark2(numTH.has() && numTM.has() && Math.abs(numTH.value * 60 + numTM.value - high1(3)) <= 10) + ' 입력 ' + (numTH.has() ? numTH.value : '?') + '시 ' + (numTM.has() ? numTM.value : '?') + '분',
          check() {
            if (!numTH.has() || !numTM.has()) return '시와 분을 모두 입력해 주세요.';
            const m = numTH.value * 60 + numTM.value;
            if (Math.abs(m - high1(3)) > 10) return '매일 약 50분씩 늦어져요. 3일이면 50분 × 3 = 150분이 늦어지니 06:00에 더해 보세요.';
            return true;
          },
          explain: '50.5분 × 3 ≈ 150분(2시간 30분)이라 06:00 + 2시간 30분 = <b>약 08:30</b>이에요. 오후 만조도 같은 만큼 늦어져 약 20:55가 돼요.',
        },
        {
          type: 'quiz', title: '12시간이 아니라 12시간 25분',
          goal: '두 만조 사이가 12시간이 아니라 약 <b>12시간 25분</b>인 까닭은?',
          setup() { S.showAns = true; S.tblT = 0; setRow(6); setMode('cycle'); setCtl(['sRow']); },
          choices: ['달이 공전해서 달이 같은 자오선에 다시 오는 데 24시간 50분이 걸리고, 하루 두 번의 만조는 그 절반 간격이기 때문이에요', '지구의 자전 속도가 매일 불규칙하게 바뀌기 때문이에요', '태양의 인력이 만조를 25분 늦추기 때문이에요', '바닷물이 움직이는 데 시간이 걸리기 때문이에요'],
          answer: 0,
          feedback: ['', '지구 자전은 아주 일정해요. 달이 이동한다는 점이 핵심이에요.', '태양이 아니라 달의 공전이 시각을 늦춰요. 달력의 빨강·파랑 표시가 매일 늦어지는 모습을 봐요.', '평형 조석에서는 즉시 평형을 이룬다고 가정해요. 늦어지는 까닭은 달이 공전하기 때문이에요.'],
          explain: '태음일 = 24시간 50분이고 만조는 하루 두 번이므로 간격은 그 절반인 <b>약 12시간 25분</b>이에요. 그래서 만조 시각이 매일 약 50분씩 늦어져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-tidal-force', mount: '#game', badge: '조석 탐험가', homeHref: '../../index.html#hs',
    featureLabels: { force: '🌙 기조력 화살표', compare: '⚖️ M / d³ 비교 · 달 궤도', equil: '🌍 평형 조석 · 조위 곡선', cycle: '📅 태음일 · 만조 시각 달력' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'force') readForce();
    else if (S.mode === 'compare') readCompare();
    else if (S.mode === 'equil') readEquil();
    else readCycle();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'force') drawForce(t, dt);
    else if (S.mode === 'compare') drawCompare(t, dt);
    else if (S.mode === 'equil') drawEquil(t, dt);
    else drawCycle(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts(); syncBtns();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, selDir, numMS, numPA, stpN, numLH, numLM, numTH, numTM, RATIO_MS, RATIO_PA, rangeAt, rangeDay, highsOf, thOfDay, high1,
    get game() { return game; }, setCtl, setMode, resetStep, updateCtl, setStage, setDm, setDay, setRow,
  };
})();
