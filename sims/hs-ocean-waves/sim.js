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

  /* ======================================================
     판을 움직이는 힘과 플룸 (해령의 힘 → 섭입의 힘 → 맨틀 플룸 → 열점 추적)
     ====================================================== */

  /* ======================================================
     해파: 심해파와 천해파 (해파 실험 → 심해파 → 천해파 → 전이파)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 900, 1.22);
  let game = null;
  const DEG = Math.PI / 180;
  const G = 9.8;
  const fN = (x, d) => Number(x).toFixed(d);
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }
  const arrowS = (x1, y1, x2, y2, o) => {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.8) return;
    D.arrow(x1, y1, x2, y2, Object.assign({}, o, { head: Math.min((o && o.head) || 12, L * 0.62), width: Math.min((o && o.width) || 4, Math.max(1.2, L * 0.45)) }));
  };
  const phoneRC = (a, b) => (PHONE ? a : b);
  function rcOf(mode) {
    if (mode === 'wave') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 388 }, B: { x: 8, y: 404, w: 504, h: 250 } }, { A: { x: 12, y: 12, w: 776, h: 396 }, B: { x: 12, y: 416, w: 776, h: 132 } });
    if (mode === 'deep') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 520 }, B: { x: 8, y: 536, w: 504, h: 340 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    if (mode === 'shallow') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 460 }, B: { x: 8, y: 476, w: 504, h: 300 } }, { A: { x: 12, y: 12, w: 776, h: 400 }, B: { x: 12, y: 420, w: 776, h: 128 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 480 }, B: { x: 8, y: 496, w: 504, h: 398 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
  }

  /* ---------- 파동 물리 도우미 ---------- */
  function solveK(T, h) { const w = TAU / T; let k = (w * w) / G; for (let i = 0; i < 80; i++) { const kn = (w * w) / (G * Math.tanh(k * h)); k = 0.5 * (k + kn); } return k; }
  function waveOf(T, h) {
    const k = solveK(T, h), lam = TAU / k, c = lam / T, kh = k * h;
    const cg = c * 0.5 * (1 + (kh > 12 ? 0 : (2 * kh) / Math.sinh(2 * kh)));
    return { k, lam, c, cg, hl: h / lam, cDeep: (G * T) / TAU, cShallow: Math.sqrt(G * h) };
  }
  /* 입자 궤도의 반지름(가로 a, 세로 b): s = 수면에서 아래로 잰 깊이 (m), A = 진폭 */
  function orbitAB(k, h, A, s) {
    const kh = k * h;
    if (kh > 9) { const e = Math.exp(-k * s); return [A * e, A * e]; }
    return [(A * Math.cosh(k * (h - s))) / Math.sinh(kh), (A * Math.sinh(k * (h - s))) / Math.sinh(kh)];
  }
  const classOf = (hl) => (hl > 0.5 ? 'deep' : hl < 0.05 ? 'shallow' : 'trans');
  const CLS_NAME = { deep: '심해파', trans: '전이파', shallow: '천해파' };

  const S = {
    mode: 'wave', fade: 0, clock: 0,
    // 1. 해파 실험
    sub: 'wind', U: 10, tH: 6, F: 100, windPh: 0, hsV: 0.5,
    T: 1.2, amp: 5, wm: false, frontT: 0, tailT: null, obs: 0, reach: false, hist: [], stpC: 0,
    // 2. 심해파
    T2: 6, ph2: 0, showTbl: false,
    // 3. 천해파
    sub3: 'depth', h3: 4000, rec: {}, pos3: 0, posVis: {}, breaks: 0, ph3: 0, lastBrk: -1, foam: [],
    // 4. 전이파
    h4: 400, vis4: {}, ph4: 0,
  };

  /* ======================================================
     장면 1: 해파 실험 — 풍파와 파랑 수조
     ====================================================== */
  const hsOf = (U, t, F) => 0.0214 * U * U * (1 - Math.exp(-F / (15 * U))) * (1 - Math.exp(-t / (0.8 * U)));
  const TANK_H = 3, TANK_L = 8;
  function waveGeom() {
    const A = rcOf('wave').A, tx0 = A.x + 22, pad = 40;
    const xw0 = tx0 + pad, xw1 = A.x + A.w - 22, pxm = (xw1 - xw0) / TANK_L;
    const ys = A.y + (PHONE ? 150 : 128);
    return { A, tx0, xw0, xw1, pxm, ys, floor: ys + TANK_H * pxm * (PHONE ? 1 : 0.92), gain: 5 };
  }
  function tankStep(dt) {
    const wv = waveOf(S.T, TANK_H);
    S.ph1 = ((S.ph1 || 0) + dt * (TAU / S.T)) % (TAU * 1000);
    if (S.wm) { S.frontT += dt; S.tailT = null; } else if (S.frontT > 0) { S.tailT = (S.tailT == null ? 0 : S.tailT) + dt; S.frontT += dt; }
    const xf = wv.cg * S.frontT;
    if (S.wm && xf >= 7.2) { S.reach = true; S.obs += dt; }
    if (!S.wm && S.tailT != null && S.tailT * wv.cg > 9) { S.frontT = 0; S.tailT = null; S.reach = false; }
  }
  const smoothE = (x) => smooth(clamp(x, 0, 1));
  function envAt(x, wv) {
    if (S.frontT <= 0) return 0;
    const xf = wv.cg * S.frontT, half = 0.5 * wv.lam;
    let e = smoothE((xf - x) / half);
    if (S.tailT != null) e *= smoothE((x - wv.cg * S.tailT) / half);
    return e;
  }
  function drawTank(t, dt) {
    const g = waveGeom(), { A } = g, wv = waveOf(S.T, TANK_H);
    tankStep(dt);
    const Am = S.amp / 100, th = S.ph1 || 0, k = wv.k, w = TAU / S.T;
    ctx.fillStyle = '#eef4fa'; rr(A.x, A.y, A.w, A.h, 14).fill();
    D.text(A.x + 14, A.y + 22 * FS, '🌊 파랑 수조 (길이 8 m, 수심 3 m)', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    if (PHONE) D.text(A.x + A.w / 2, A.y + A.h - 10, '※ 파도의 높이와 부표의 움직임은 크게 과장했어요', { size: 11, weight: 700, color: '#64748b' }); else D.text(A.x + A.w - 14, A.y + 22 * FS, '※ 파도의 높이와 부표의 움직임은 크게 과장했어요', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    // 수조 유리와 물
    ctx.fillStyle = '#fff'; rr(g.tx0 - 4, g.ys - 60, g.xw1 - g.tx0 + 8, g.floor - g.ys + 66, 8).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(g.tx0 - 4, g.ys - 60, g.xw1 - g.tx0 + 8, g.floor - g.ys + 66, 8).stroke();
    const px = (x) => g.xw0 + x * g.pxm, eta = (x) => Am * envAt(x, wv) * Math.cos(k * x - th), yS = (x) => g.ys - eta(x) * g.pxm * g.gain;
    const NSMP = 134, ySamp = new Array(NSMP + 1);
    for (let i = 0; i <= NSMP; i++) ySamp[i] = yS((TANK_L * i) / NSMP);
    ctx.save(); ctx.beginPath(); ctx.rect(g.tx0, g.ys - 60, g.xw1 - g.tx0, g.floor - g.ys + 60); ctx.clip();
    const wg = ctx.createLinearGradient(0, g.ys - 20, 0, g.floor); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(1, '#2f6ea3');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.xw0, g.floor);
    for (let i = 0; i <= NSMP; i++) ctx.lineTo(px((TANK_L * i) / NSMP), ySamp[i]); ctx.lineTo(g.xw1, g.floor); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= NSMP; i++) { const X = px((TANK_L * i) / NSMP), Y = ySamp[i]; i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke();
    // 궤도 (x = 4 m 기둥)
    const xc = 4.6;
    [0, 0.25, 0.5, 0.9, 1.4].forEach((s, i) => {
      const ab = orbitAB(k, TANK_H, Am, s), env = envAt(xc, wv), r = ab[0] * g.pxm * g.gain * env, cxp = px(xc), cyp = g.ys + s * g.pxm * 0.92;
      if (r < 0.7) return;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, TAU); ctx.stroke();
      const thp = k * xc - th; ball(cxp - r * Math.sin(thp), cyp - r * Math.cos(thp), 4, '#fde68a', false);
    });
    ctx.restore();
    // 조파기
    const pad = Math.sin(th) * Am * g.pxm * g.gain * 0.9 * Math.min(1, S.frontT * 3) * (S.wm ? 1 : (S.tailT != null ? clamp(1 - S.tailT * 3, 0, 1) : 0));
    ctx.fillStyle = '#94a3b8'; rr(g.xw0 - 30 + pad, g.ys - 40, 28, g.floor - g.ys + 40, 6).fill();
    D.text(g.xw0 - 16 + pad, g.ys - 46, '조파기', { size: 11.5, weight: 800, color: '#475569' });
    // 부표: 평균 위치 점선과 현재 위치
    S.hist = S.hist || [];
    [2, 4.6, 6.4].forEach((x0, bi) => {
      const env = envAt(x0, wv), phase = k * x0 - th, xi = -Am * env * Math.sin(phase) * g.pxm * g.gain * 1.0, yy = g.ys - Am * env * Math.cos(phase) * g.pxm * g.gain;
      D.dashedLine(px(x0), g.ys - 52, px(x0), g.floor, { color: 'rgba(30,41,59,.4)', width: 1.5, dash: [4, 5] });
      if (bi === 1) { S.hist.push([px(x0) + xi, yy]); if (S.hist.length > 80) S.hist.shift(); }
      ctx.save(); ctx.translate(px(x0) + xi, yy);
      ctx.fillStyle = '#dc2626'; rr(-9, -9, 18, 9, 3).fill(); ctx.fillStyle = '#fef2f2'; rr(-9, 0, 18, 6, 3).fill();
      ctx.restore();
      D.text(px(x0), g.ys - 56, '부표 ' + 'ABC'[bi], { size: 11.5, weight: 800, color: '#7f1d1d' });
    });
    if (S.hist.length > 2) { ctx.strokeStyle = 'rgba(220,38,38,.65)'; ctx.lineWidth = 2; ctx.beginPath(); S.hist.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
    // 파장 눈금자 (마루 사이)
    if (S.frontT > 0 && S.wm) {
      for (let n = -2; n < 40; n++) {
        const x1 = (TAU * n + th) / k, x2 = x1 + wv.lam;
        if (x1 > 0.6 && x2 < Math.min(7.6, wv.cg * S.frontT - 0.3 * wv.lam)) {
          const y = g.ys - 38 - Am * g.pxm * g.gain;
          ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(x1), y); ctx.lineTo(px(x2), y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px(x1), y - 6); ctx.lineTo(px(x1), y + 6); ctx.moveTo(px(x2), y - 6); ctx.lineTo(px(x2), y + 6); ctx.stroke();
          D.label((px(x1) + px(x2)) / 2, y - 14, '파장 λ = ' + fN(wv.lam, 1) + ' m', { bg: '#7c3aed', size: 12.5, pad: 7 });
          break;
        }
      }
    }
    // 바닥
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(g.xw0, g.floor, g.xw1 - g.xw0, 7);
    D.text(g.xw1 - 6, g.floor + 22 * FS, '← 8 m →', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    // 에너지 전파 화살표
    if (S.wm && S.frontT > 1) arrowS(px(0.4), g.floor + 18, px(2.4), g.floor + 18, { color: '#7c3aed', width: 4, head: 11 });
    // ----- B: 정보 상자
    const B = rcOf('wave').B;
    card(B, '📋 측정값');
    const horiz = B.w > 600, items = [['주기 T', fN(S.T, 1) + ' s', '#1e3a8a'], ['진동수 f = 1/T', fN(1 / S.T, 2) + ' Hz', '#1e3a8a'], ['파장 λ', fN(wv.lam, 1) + ' m', '#7c3aed'], ['파속 c = λ/T', S.showC || (game && game.free) ? fN(wv.lam / S.T, 2) + ' m/s' : '직접 계산해요', '#0f766e']];
    items.forEach((it, i) => {
      const bx = horiz ? B.x + 16 + i * ((B.w - 32) / 4) : B.x + 16, by = horiz ? B.y + 54 * FS : B.y + 46 * FS + i * 34 * FS;
      D.text(bx, by, it[0], { size: 12.5, weight: 700, color: '#64748b', align: 'left' }); D.text(bx + (horiz ? 0 : 150), horiz ? by + 28 * FS : by, it[1], { size: 16, weight: 900, color: it[2], align: 'left' });
    });
    const secy = horiz ? B.y + 112 * FS : B.y + B.h - 14;
    const stt = S.reach ? '파가 수조 끝까지 전달됐어요. 부표는 제자리에서 맴돌아요.' : S.wm ? '파가 오른쪽으로 퍼져 나가요…' : '조파기를 켜 보세요';
    D.text(B.x + B.w / 2, secy, stt, { size: 13, weight: 800, color: '#334155' });
  }
  function readTank() {
    const wv = waveOf(S.T, TANK_H);
    setReadouts(['조파기', S.wm ? '켜짐' : '꺼짐', '주기 T · 파장 λ', fN(S.T, 1) + ' s · ' + fN(wv.lam, 1) + ' m', '부표 관찰 시간', fN(Math.min(S.obs, 99), 1) + ' s']);
  }

  /* ---------- 풍파 장면 ---------- */
  function windGeom() { const A = rcOf('wave').A; return { A, y0: A.y + (PHONE ? 250 : 230), x0: A.x + 70, x1: A.x + A.w - 18 }; }
  function drawWind(t, dt) {
    const g = windGeom(), { A } = g, hs = hsOf(S.U, S.tH, S.F);
    S.hsV = approach(S.hsV, hs, dt, 5); S.windPh += dt * (6 + S.U * 0.5);
    ctx.fillStyle = '#eaf4fb'; rr(A.x, A.y, A.w, A.h, 14).fill();
    D.text(A.x + 14, A.y + 22 * FS, '🌬️ 바람이 만드는 파도 (풍파) · 예시 모형', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    // 육지(바람이 시작되는 해안)
    ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(A.x, g.y0 - 30); ctx.lineTo(g.x0 - 20, g.y0 - 10); ctx.lineTo(g.x0, g.y0 + 6); ctx.lineTo(g.x0, A.y + A.h); ctx.lineTo(A.x, A.y + A.h); ctx.closePath(); ctx.fill();
    D.text(A.x + 36, g.y0 + 40, '해안', { size: 13, weight: 800, color: '#57534e' });
    const L = g.x1 - g.x0, lamV = 36 + 5 * S.U, pxm = PHONE ? 8 : 10;
    const hOf = (x) => { const u = (x - g.x0) / L; return S.hsV * ((1 - Math.exp(-3 * u)) / (1 - Math.exp(-3))); };
    const cV = Math.sqrt(lamV) * 14;
    const surf = (x) => { const u = x - g.x0, a = hOf(x) * pxm * 0.5; return g.y0 - a * (0.7 * Math.cos(TAU * (u - cV * t) / lamV) + 0.3 * Math.cos(TAU * (u - cV * 0.8 * t) / (lamV * 0.55) + 1.3)); };
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, A.y + 30, g.x1 - g.x0 + 20, A.h - 34); ctx.clip();
    const wg = ctx.createLinearGradient(0, g.y0 - 90, 0, A.y + A.h); wg.addColorStop(0, '#9fd8f5'); wg.addColorStop(1, '#1d5a8c');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.x0, A.y + A.h); for (let x = g.x0; x <= g.x1 + 20; x += 4) ctx.lineTo(x, surf(x)); ctx.lineTo(g.x1 + 20, A.y + A.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = g.x0; x <= g.x1 + 20; x += 4) (x === g.x0 ? ctx.moveTo(x, surf(x)) : ctx.lineTo(x, surf(x))); ctx.stroke();
    ctx.restore();
    // 바람 줄무늬
    ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const nStr = 6 + Math.round(S.U / 3), Ls = 18 + S.U * 1.6;
    for (let i = 0; i < nStr; i++) {
      const yy = A.y + 48 + ((i * 37) % 71) * (g.y0 - A.y - 150) / 71 + 30 * ((i % 3) / 3), xx = g.x0 + ((((i * 131) % 97) / 97 * L + t * (50 + S.U * 6)) % (L + 40)) - 20;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + Ls, yy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xx + Ls - 7, yy - 5); ctx.lineTo(xx + Ls, yy); ctx.lineTo(xx + Ls - 7, yy + 5); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // 취송 거리 표시
    const by = A.y + A.h - 26 * FS;
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x0, by); ctx.lineTo(g.x1, by); ctx.moveTo(g.x0, by - 6); ctx.lineTo(g.x0, by + 6); ctx.moveTo(g.x1, by - 6); ctx.lineTo(g.x1, by + 6); ctx.stroke();
    D.label((g.x0 + g.x1) / 2, by - 14, '취송 거리 F = ' + S.F + ' km', { bg: '#7c3aed', size: 12.5 });
    D.label(A.x + A.w - 100, A.y + 60 * FS, '풍속 U = ' + S.U + ' m/s', { bg: '#475569', size: 12.5 });
    D.label(A.x + A.w - 100, A.y + 88 * FS, '불어온 시간 ' + S.tH + ' h', { bg: '#475569', size: 12.5 });
    // 파고 눈금
    const hsPx = S.hsV * pxm; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; const xr = g.x1 - 14; ctx.beginPath(); ctx.moveTo(xr, g.y0 - hsPx / 2); ctx.lineTo(xr, g.y0 + hsPx / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xr - 6, g.y0 - hsPx / 2); ctx.lineTo(xr + 6, g.y0 - hsPx / 2); ctx.moveTo(xr - 6, g.y0 + hsPx / 2); ctx.lineTo(xr + 6, g.y0 + hsPx / 2); ctx.stroke();
    D.label(xr - 8, g.y0 + hsPx / 2 + 22, '파고 ' + fN(hs, 1) + ' m', { bg: '#dc2626', size: 13, align: 'right' });
    // B
    const B = rcOf('wave').B; card(B, '📋 풍파가 커지는 조건');
    D.text(B.x + 16, B.y + 56 * FS, '파고를 키우는 세 가지: 풍속 · 바람이 부는 시간 · 바람이 부는 거리(취송 거리)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    drawWrap(B.x + B.w / 2, B.y + 88 * FS, '셋 중 가장 모자란 조건이 파고를 제한해요. 폭풍에서 멀리 퍼져 나간 규칙적이고 긴 파도를 너울이라고 해요.', B.w - 40, 13, { color: '#475569' });
    D.text(B.x + B.w / 2, B.y + B.h - 14, '※ 파고 값은 예시 모형으로 계산한 거예요', { size: 11.5, weight: 700, color: '#64748b' });
  }
  function readWind() { setReadouts(['풍속 · 시간 · 거리', S.U + ' m/s · ' + S.tH + ' h · ' + S.F + ' km', '파고(예시)', fN(hsOf(S.U, S.tH, S.F), 1) + ' m', '해파가 전달하는 것', '에너지와 파형']); }

  /* ======================================================
     장면 2: 심해파 — 수심과 관계없이 주기로 속도가 정해져요
     ====================================================== */
  const lamDeep = (T) => (G * T * T) / TAU, cDeep = (T) => (G * T) / TAU;
  const ZS = [0, 0.125, 0.25, 0.375, 0.5];
  const pctAt = (zl) => 100 * Math.exp(-TAU * zl);
  function drawDeepScene(t, dt) {
    const { A, B } = rcOf('deep');
    S.ph2 += dt * 2 * (TAU / S.T2);
    const lam = lamDeep(S.T2), c = cDeep(S.T2);
    ctx.fillStyle = '#eef4fa'; rr(A.x, A.y, A.w, A.h, 14).fill();
    D.text(A.x + 14, A.y + 22 * FS, '🌊 깊은 바다의 해파 (수심 4000 m, 화면은 2배속)', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const xl = A.x + 22, xr = A.x + A.w - 22, lamPx = (xr - xl) / 1.6, kp = TAU / lamPx, R0 = Math.min(20, lamPx * 0.066);
    const ys = A.y + (PHONE ? 96 : 92), dpx = lamPx;           // 깊이 눈금: 파장 하나 = lamPx
    const yS = (x) => ys - R0 * Math.cos(kp * (x - xl) - S.ph2);
    const wg = ctx.createLinearGradient(0, ys - 20, 0, ys + dpx); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(1, '#23608f');
    ctx.save(); ctx.beginPath(); ctx.rect(xl, A.y + 40, xr - xl, ys + dpx - A.y - 40); ctx.clip();
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(xl, ys + dpx); for (let x = xl; x <= xr + 1; x += 4) ctx.lineTo(x, yS(x)); ctx.lineTo(xr, ys + dpx); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); for (let x = xl; x <= xr + 1; x += 4) (x === xl ? ctx.moveTo(x, yS(x)) : ctx.lineTo(x, yS(x))); ctx.stroke();
    // 깊이 눈금선
    ZS.concat([0.75, 1]).forEach((zl) => { if (zl === 0) return; ctx.strokeStyle = zl === 0.5 ? 'rgba(253,230,138,.9)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = zl === 0.5 ? 2 : 1; ctx.setLineDash(zl === 0.5 ? [7, 5] : []); ctx.beginPath(); ctx.moveTo(xl, ys + zl * dpx); ctx.lineTo(xr, ys + zl * dpx); ctx.stroke(); ctx.setLineDash([]); });
    // 입자 궤도
    const xc = xl + 0.8 * lamPx, th = kp * (xc - xl) - S.ph2;
    ZS.forEach((zl) => {
      const r = R0 * Math.exp(-TAU * zl), cy = ys + zl * dpx;
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(xc, cy, r, 0, TAU); ctx.stroke();
      ball(xc - r * Math.sin(th), cy - r * Math.cos(th), Math.max(2.6, Math.min(5, r * 0.5)), '#fde68a', false);
      D.text(xc + R0 + 10, cy + 4, Math.round(pctAt(zl)) + ' %', { size: 12, weight: 900, color: '#ffffff', align: 'left', stroke: 'rgba(15,40,70,.7)', strokeWidth: 3 });
    });
    ctx.restore();
    // 부표 하나 (제자리)
    const xb = xl + 0.3 * lamPx, thb = kp * (xb - xl) - S.ph2, bx = xb - R0 * Math.sin(thb), by = ys - R0 * Math.cos(thb);
    D.dashedLine(xb, ys - 40, xb, ys + 10, { color: 'rgba(30,41,59,.5)', width: 1.5, dash: [4, 4] });
    ctx.save(); ctx.translate(bx, by); ctx.fillStyle = '#dc2626'; rr(-8, -8, 16, 8, 3).fill(); ctx.fillStyle = '#fef2f2'; rr(-8, 0, 16, 5, 3).fill(); ctx.restore();
    // 깊이 표시
    D.text(xl + 6, ys + 0.5 * dpx - 6, '깊이 λ/2', { size: 12.5, weight: 900, color: '#fde68a', align: 'left', stroke: 'rgba(15,40,70,.7)', strokeWidth: 3 });
    D.text(xl + 6, ys + dpx - 6, '깊이 λ', { size: 12, weight: 800, color: '#e0f2fe', align: 'left', stroke: 'rgba(15,40,70,.6)', strokeWidth: 3 });
    // 파장 표시와 진행 방향
    D.dashedLine(xl + 0.0 * lamPx, ys - R0 - 22, xl + lamPx, ys - R0 - 22, { color: '#7c3aed', width: 2.5, dash: [1, 0] });
    D.label(xl + lamPx / 2, ys - R0 - 38, 'λ = ' + fN(lam, 0) + ' m', { bg: '#7c3aed', size: 13 });
    arrowS(xr - 120, ys - R0 - 34, xr - 30, ys - R0 - 34, { color: '#7c3aed', width: 4, head: 12 });
    D.text(xr - 75, ys - R0 - 42, '파형이 이동', { size: 12, weight: 800, color: '#6d28d9' });
    D.text(A.x + A.w / 2, ys + dpx + 28 * FS, '입자는 제자리에서 원운동 · 아래로 갈수록 궤도가 작아져요', { size: 13, weight: 800, color: '#334155' });
    D.text(A.x + A.w / 2, ys + dpx + 50 * FS, '(수심 > λ/2 이면 바닥의 영향이 없는 심해파)', { size: 12, weight: 700, color: '#64748b' });
    // ----- B
    card(B, '📊 주기와 궤도');
    const x0 = B.x + 14, ww = B.w - 28; let y = B.y + 50 * FS;
    D.text(x0, y, '주기 T = ' + S.T2 + ' s', { size: 15, weight: 900, color: '#1e3a8a', align: 'left' });
    D.text(x0, y + 24 * FS, '파장 λ = gT²/2π = ' + fN(lam, 0) + ' m', { size: 13.5, weight: 800, color: '#7c3aed', align: 'left' });
    const showC = S.showC2 || (game && game.free);
    D.text(x0, y + 48 * FS, '파속 c = gT/2π = ' + (showC ? fN(c, 1) + ' m/s' : '?'), { size: 13.5, weight: 800, color: '#0f766e', align: 'left' });
    y += 80 * FS;
    D.text(x0, y, '궤도 크기 (수면 = 100 %)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    const bh = Math.min(22 * FS, (PHONE ? 20 : 22) * FS);
    ZS.forEach((zl, i) => {
      const by2 = y + 10 + i * (bh + 6);
      D.text(x0, by2 + bh * 0.72, zl === 0 ? '수면' : zl === 0.5 ? 'λ/2' : (zl * 8) + 'λ/8', { size: 12, weight: 800, color: '#475569', align: 'left' });
      const bx = x0 + 44, bw = ww - 44 - 46; ctx.fillStyle = '#e2e8f0'; rr(bx, by2, bw, bh, 6).fill();
      const wb = bw * pctAt(zl) / 100; if (wb > 0.3) { ctx.fillStyle = zl === 0.5 ? '#f59e0b' : '#0ea5e9'; rr(bx, by2, wb, bh, 6).fill(); }
      D.text(bx + bw + 6, by2 + bh * 0.72, Math.round(pctAt(zl)) + ' %', { size: 12, weight: 900, color: '#334155', align: 'left' });
    });
    y += 10 + ZS.length * (bh + 6) + 18 * FS;
    // 태풍 너울 표
    if (S.showTbl || (game && game.free)) {
      D.text(x0, y, '폭풍(3000 km 밖)에서 온 파', { size: 13, weight: 800, color: '#334155', align: 'left' });
      [6, 10, 16].forEach((T, i) => { const yy = y + 22 * FS + i * 22 * FS; D.text(x0, yy, 'T = ' + T + ' s', { size: 12.5, weight: 800, color: '#1e3a8a', align: 'left' }); D.text(x0 + 70, yy, 'λ ' + fN(lamDeep(T), 0) + ' m', { size: 12.5, weight: 700, color: '#7c3aed', align: 'left' }); D.text(x0 + ww, yy, 'c ' + fN(cDeep(T), 1) + ' m/s', { size: 12.5, weight: 800, color: '#0f766e', align: 'right' }); });
    } else drawWrap(B.x + B.w / 2, y + 6, '주기가 길면 파장과 파속이 모두 커져요. 수심은 속도에 관계없어요.', ww, 12.5, { color: '#475569' });
  }
  function readDeep() {
    const showC = S.showC2 || (game && game.free);
    setReadouts(['주기 T', S.T2 + ' s', '파장 λ', fN(lamDeep(S.T2), 0) + ' m', '파속 c', showC ? fN(cDeep(S.T2), 1) + ' m/s' : '직접 계산해요']);
  }

  /* ======================================================
     장면 3: 천해파 — c = √(gh), 해빈에서 파장이 줄고 파고가 커져요
     ====================================================== */
  const DEPTHS3 = [4000, 1000, 100, 10];
  const cSh = (h) => Math.sqrt(G * h);
  const T_LONG = 600;                          // 수심별 비교에 쓰는 긴 파의 주기(10분)
  // 해빈: 수심 2.4 m에서 해안까지 경사 1:20 (T = 10 s)
  const BEACH = { h0: 2.4, len: 48, T: 10, H0: 0.5, gam: 0.78, N: 240, uMax: 0.96 };
  let beachTbl = null;
  function buildBeach() {
    const N = BEACH.N, w = TAU / BEACH.T, du = BEACH.uMax / N, rows = []; let th = 0, xb = -1;
    for (let i = 0; i <= N; i++) {
      const u = i * du, h = BEACH.h0 * (1 - u), c = Math.sqrt(G * h);
      if (i > 0) { const hp = BEACH.h0 * (1 - (u - du)), cp = Math.sqrt(G * hp); th += 0.5 * (w / c + w / cp) * BEACH.len * du; }
      const Hg = BEACH.H0 * Math.pow(BEACH.h0 / h, 0.25), H = Math.min(Hg, BEACH.gam * h);
      if (xb < 0 && Hg >= BEACH.gam * h) xb = i;
      rows.push({ u, h, c, lam: c * BEACH.T, th, H, Hg });
    }
    return { rows, xb };
  }
  function beachGeom() {
    const A = rcOf('shallow').A, x0 = A.x + 28, x1 = A.x + A.w - 70, ys = A.y + (PHONE ? 150 : 138), pz = PHONE ? 54 : 66;
    return { A, x0, x1, ys, pz, X: (u) => x0 + u * (x1 - x0) };
  }
  function shallowStep(dt) {
    if (!beachTbl) beachTbl = buildBeach();
    S.ph3 += dt * 2.5 * (TAU / BEACH.T);
    S.ph3d = (S.ph3d || 0) + dt * (1.2 + 0.35 * Math.pow(cSh(S.h3), 0.5));
    // 쇄파 횟수 세기: 쇄파점에서 마루가 지날 때마다
    const xb = beachTbl.rows[beachTbl.xb];
    if (S.sub3 === 'beach' && xb) {
      const phi = xb.th - S.ph3, n = Math.floor(phi / TAU);
      const wasN = S.lastBrk; S.lastBrk = n;
      if (wasN !== -1e9 && S.lastBrk !== wasN && wasN != null) {
        S.breaks++;
        const g = beachGeom(), x = g.X(xb.u);
        for (let i = 0; i < 12; i++) S.foam.push({ x: x + Math.random() * 14, y: g.ys - xb.H * g.pz * 0.5 + Math.random() * 6, vx: 20 + Math.random() * 50, vy: -30 - Math.random() * 30, a: 0, life: 0.9 + Math.random() * 0.5 });
      }
    }
    S.foam.forEach((p) => { p.a += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; });
    S.foam = S.foam.filter((p) => p.a < p.life);
  }
  function drawShallow(t, dt) {
    shallowStep(dt);
    if (S.sub3 === 'depth') drawDepthScene(t); else drawBeach(t);
  }
  function drawDepthScene(t) {
    const { A, B } = rcOf('shallow'), h = S.h3, c = cSh(h), kk = TAU / (c * T_LONG), lamKm = (c * T_LONG) / 1000;
    ctx.fillStyle = '#eef4fa'; rr(A.x, A.y, A.w, A.h, 14).fill();
    D.text(A.x + 14, A.y + 22 * FS, '🌊 긴 파(주기 10분)가 수심이 다른 바다를 지날 때 (그림은 축소)', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const xl = A.x + 28, xr = A.x + A.w - 28, ys = A.y + (PHONE ? 130 : 120), box = PHONE ? 190 : 200, lamPx = Math.min(300, (xr - xl) / 2.2), kp = TAU / lamPx, R0 = 12;
    const yS = (x) => ys - R0 * Math.cos(kp * (x - xl) - S.ph3d);
    const wg = ctx.createLinearGradient(0, ys - 10, 0, ys + box); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(1, '#2f6ea3');
    ctx.save(); ctx.beginPath(); ctx.rect(xl, A.y + 40, xr - xl, ys + box + 12 - A.y - 40); ctx.clip();
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(xl, ys + box); for (let x = xl; x <= xr + 1; x += 4) ctx.lineTo(x, yS(x)); ctx.lineTo(xr, ys + box); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = xl; x <= xr + 1; x += 4) (x === xl ? ctx.moveTo(x, yS(x)) : ctx.lineTo(x, yS(x))); ctx.stroke();
    // 궤도 (타원): 수면에서 바닥까지 4개 깊이
    const xc = xl + 1.3 * lamPx, th = kp * (xc - xl) - S.ph3d;
    [0, 1 / 3, 2 / 3, 0.97].forEach((fr) => {
      const [a, b] = orbitAB(kk, h, 1, fr * h), ap = Math.min(R0 * a, 125), bp = R0 * b, cy = ys + fr * box;
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(xc, cy, Math.max(ap, 0.6), Math.max(bp, 0.4), 0, 0, TAU); ctx.stroke();
      ball(xc - ap * Math.sin(th), cy - bp * Math.cos(th), 3.8, '#fde68a', false);
    });
    ctx.restore();
    // 바닥
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(xl, ys + box, xr - xl, 10);
    D.text(xl + 4, ys + box + 28 * FS, '해저', { size: 12, weight: 800, color: '#6b5a45', align: 'left' });
    // 수심 표시
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xr - 24, ys); ctx.lineTo(xr - 24, ys + box); ctx.moveTo(xr - 30, ys); ctx.lineTo(xr - 18, ys); ctx.moveTo(xr - 30, ys + box); ctx.lineTo(xr - 18, ys + box); ctx.stroke();
    D.label(xr - 24, ys + box / 2, '수심 ' + h + ' m', { bg: '#334155', size: 13 });
    D.text(xc, ys + box + 28 * FS, '입자 궤도: 수면은 타원, 바닥에서는 수평 왕복', { size: 12.5, weight: 800, color: '#334155' });
    if (kk * h < 0.2) D.text(xc, ys + box + 46 * FS, '(실제 타원은 훨씬 더 납작해요 — 가로 길이를 줄여서 그렸어요)', { size: 11.5, weight: 700, color: '#64748b' });
    D.text(A.x + 14, A.y + 46 * FS, '파장 λ = c·T ≈ ' + (lamKm >= 10 ? fN(lamKm, 0) : fN(lamKm, 1)) + ' km (수심의 ' + Math.round((c * T_LONG) / h) + '배)', { size: 12.5, weight: 800, color: '#7c3aed', align: 'left' });
    // 속도계
    const gx = A.x + A.w - 270, gy = A.y + 38, gw = 250;
    ctx.fillStyle = '#e2e8f0'; rr(gx, gy, gw, 14, 7).fill();
    S.cV = approach(S.cV == null ? c : S.cV, c, 1 / 60, 8);
    const gwid = gw * clamp(S.cV / 260, 0, 1); if (gwid > 0.5) { ctx.fillStyle = '#0ea5e9'; rr(gx, gy, gwid, 14, 7).fill(); }
    D.text(gx, gy + 30, '0', { size: 11, weight: 700, color: '#64748b', align: 'left' }); D.text(gx + gw, gy + 30, '260 m/s', { size: 11, weight: 700, color: '#64748b', align: 'right' });
    D.text(gx + (gw * 250) / 260, gy - 4, '✈ 여객기 약 250 m/s', { size: 11, weight: 800, color: '#334155', align: 'right' });
    D.label(gx + Math.min(gw - 60, Math.max(60, gwid)), gy + 52, 'c = √(g·h) = ' + fN(c, c >= 100 ? 0 : 1) + ' m/s', { bg: '#0369a1', size: 13 });
    // ----- B: 기록표
    card(B, '📋 파속 기록표 (c = √(gh))');
    const nC = 4, cw = (B.w - 28) / nC, horiz = B.w > B.h * 2;
    DEPTHS3.forEach((d, i) => {
      const bx = horiz ? B.x + 14 + i * cw : B.x + 14, by = horiz ? B.y + 42 * FS : B.y + 40 * FS + i * 62 * FS, on = S.rec[d] || (game && game.free), cc = cSh(d);
      const bw = horiz ? cw - 10 : B.w - 28;
      D.shadow(() => { ctx.fillStyle = on ? '#ecfdf5' : '#f8fafc'; rr(bx, by, bw, horiz ? B.h - 54 * FS : 54 * FS, 10).fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = d === S.h3 ? '#0ea5e9' : on ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = d === S.h3 ? 3 : 1.5; rr(bx, by, bw, horiz ? B.h - 54 * FS : 54 * FS, 10).stroke();
      D.text(bx + 10, by + 22 * FS, '수심 ' + d + ' m', { size: 13.5, weight: 900, color: '#1e3a8a', align: 'left' });
      D.text(bx + 10, by + 44 * FS, on ? fN(cc, cc >= 100 ? 0 : 1) + ' m/s' + (horiz ? '' : '  (' + fN(cc * 3.6, 0) + ' km/h)') : '— (기록 전)', { size: 14, weight: 900, color: on ? '#15803d' : '#94a3b8', align: 'left' });
      if (horiz && on) D.text(bx + 10, by + 64 * FS, '약 ' + fN(cc * 3.6, 0) + ' km/h', { size: 12, weight: 700, color: '#475569', align: 'left' });
    });
  }
  function drawBeach(t) {
    const g = beachGeom(), A = g.A, B = rcOf('shallow').B, rows = beachTbl.rows, N = rows.length - 1;
    ctx.fillStyle = '#eef4fa'; rr(A.x, A.y, A.w, A.h, 14).fill();
    D.text(A.x + 14, A.y + 22 * FS, '🏖️ 완만한 해빈으로 다가오는 파 (T = 10 s 일정, 2.5배속)', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const sur = (i) => g.ys - (rows[i].H / 2) * g.pz * Math.cos(rows[i].th - S.ph3);
    const flr = (i) => g.ys + rows[i].h * g.pz;
    ctx.save(); ctx.beginPath(); ctx.rect(A.x + 6, A.y + 36, A.w - 12, A.h - 40); ctx.clip();
    // 물
    const wg = ctx.createLinearGradient(0, g.ys - 40, 0, g.ys + BEACH.h0 * g.pz); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(1, '#2f6ea3');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.x0, flr(0)); for (let i = 0; i <= N; i++) ctx.lineTo(g.X(rows[i].u), sur(i)); ctx.lineTo(g.X(rows[N].u), flr(N)); for (let i = N; i >= 0; i -= 4) ctx.lineTo(g.X(rows[i].u), flr(i)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i <= N; i++) (i ? ctx.lineTo(g.X(rows[i].u), sur(i)) : ctx.moveTo(g.X(rows[i].u), sur(i))); ctx.stroke();
    // 해저와 모래
    ctx.fillStyle = '#d6bf8f'; ctx.beginPath(); ctx.moveTo(g.x0, A.y + A.h); ctx.lineTo(g.x0, flr(0)); for (let i = 0; i <= N; i += 2) ctx.lineTo(g.X(rows[i].u), flr(i)); ctx.lineTo(g.x1 + 70, g.ys + 2); ctx.lineTo(A.x + A.w, g.ys + 2); ctx.lineTo(A.x + A.w, A.y + A.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a8905f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.x0, flr(0)); for (let i = 0; i <= N; i += 2) ctx.lineTo(g.X(rows[i].u), flr(i)); ctx.stroke();
    // 쇄파 거품
    S.foam.forEach((p) => { ctx.globalAlpha = clamp(1 - p.a / p.life, 0, 1); ball(p.x, p.y, 3.4, '#ffffff', false); }); ctx.globalAlpha = 1;
    // 쇄파 구간 표시
    const xb = rows[beachTbl.xb], xbx = g.X(xb.u);
    ctx.restore();
    D.text((xbx + g.X(rows[N].u)) / 2 + 20, g.ys + 70, '쇄파 구간', { size: 12.5, weight: 900, color: '#6d28d9' });
    D.text((xbx + g.X(rows[N].u)) / 2 + 20, g.ys + 70 + 16 * FS, '(파고 > 수심의 0.78배)', { size: 11.5, weight: 800, color: '#6d28d9' });
    D.dashedLine(xbx, g.ys - 60, xbx, g.ys + 40 + rows[beachTbl.xb].h * g.pz * 0.5, { color: '#7c3aed', width: 2, dash: [5, 5] });
    D.text(g.x0 + 4, flr(0) + 22 * FS, '수심 2.4 m', { size: 12, weight: 800, color: '#7a6638', align: 'left' }); D.text(g.X(rows[N].u) - 4, g.ys + 24 * FS, '해안', { size: 12.5, weight: 800, color: '#7a6638', align: 'right' });
    // 관측 위치
    const pi = clamp(Math.round((S.pos3 / 100) * N), 0, N), pr = rows[pi], px = g.X(pr.u);
    S.posVis[pr.u < 0.33 ? 0 : pr.u < 0.66 ? 1 : 2] = true;
    D.dashedLine(px, g.ys - 70, px, flr(pi), { color: '#dc2626', width: 2.5, dash: [5, 4] });
    D.sphere(px, sur(pi), 7, '#dc2626', { gloss: false, outline: '#fff', outlineWidth: 2 });
    // 파장 눈금 (관측 위치 기준 오른쪽으로 λ)
    const lamPx = pr.lam / BEACH.len * (g.x1 - g.x0), ex = Math.min(px + lamPx, g.x1 + 60), ly = g.ys - 80;
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, ly); ctx.lineTo(ex, ly); ctx.moveTo(px, ly - 6); ctx.lineTo(px, ly + 6); ctx.moveTo(ex, ly - 6); ctx.lineTo(ex, ly + 6); ctx.stroke();
    D.label(clamp((px + ex) / 2, A.x + 80, A.x + A.w - 80), ly - 14, 'λ = ' + fN(pr.lam, 0) + ' m', { bg: '#7c3aed', size: 12.5 });
    // B: 관측 위치 값
    card(B, '📍 빨간 점에서 잰 값');
    const items = [['수심 h', fN(pr.h, 2) + ' m', '#1e3a8a'], ['파속 c = √(gh)', fN(pr.c, 1) + ' m/s', '#0f766e'], ['파장 λ = c·T', fN(pr.lam, 0) + ' m', '#7c3aed'], ['파고 H', fN(pr.H, 2) + ' m', '#dc2626'], ['주기 T', '10 s (변함없음)', '#334155']];
    const horiz = B.w > B.h * 2, cw2 = (B.w - 28) / 5;
    items.forEach((it, i) => {
      const bx = horiz ? B.x + 16 + i * cw2 : B.x + 16, by = horiz ? B.y + 52 * FS : B.y + 46 * FS + i * 38 * FS;
      D.text(bx, by, it[0], { size: 12, weight: 700, color: '#64748b', align: 'left' }); D.text(horiz ? bx : bx + 160, horiz ? by + 26 * FS : by, it[1], { size: 15, weight: 900, color: it[2], align: 'left' });
    });
    D.text(B.x + B.w / 2, B.y + B.h - 12, '관측 위치를 옮겨 보고, 부서지는 파도(쇄파)를 3번 세어 봐요: ' + Math.min(S.breaks, 99) + ' / 3', { size: 12.5, weight: 800, color: '#334155' });
  }
  function readShallow() {
    if (S.sub3 === 'depth') setReadouts(['수심 h', S.h3 + ' m', '파속 c = √(gh)', fN(cSh(S.h3), cSh(S.h3) >= 100 ? 0 : 1) + ' m/s', '기록한 수심', DEPTHS3.filter((d) => S.rec[d]).length + ' / 4']);
    else { const N = BEACH.N, pr = (beachTbl || buildBeach()).rows[clamp(Math.round((S.pos3 / 100) * N), 0, N)]; setReadouts(['관측 위치 수심', fN(pr.h, 2) + ' m', '파속 · 파장', fN(pr.c, 1) + ' m/s · ' + fN(pr.lam, 0) + ' m', '쇄파 관찰', Math.min(S.breaks, 99) + '번']); }
  }

  /* ======================================================
     장면 4: 전이파 — 같은 파(T = 10 s)를 여러 수심으로
     ====================================================== */
  const DEPTHS4 = [400, 100, 40, 10, 2];
  const T4 = 10;
  const ZCOL = { deep: '#2563eb', trans: '#f59e0b', shallow: '#16a34a' };
  function drawTrans(t, dt) {
    const { A, B } = rcOf('trans'), h = S.h4, wv = waveOf(T4, h), cls = classOf(wv.hl);
    S.ph4 += dt * 2 * (TAU / T4);
    ctx.fillStyle = '#eef4fa'; rr(A.x, A.y, A.w, A.h, 14).fill();
    D.text(A.x + 14, A.y + 22 * FS, '🌊 같은 파 (T = 10 s) · 수심 ' + h + ' m (화면은 2배속)', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const showCls = S.showCls || (game && game.free);
    if (showCls) D.label(A.x + A.w - 70, A.y + 50 * FS, CLS_NAME[cls], { bg: ZCOL[cls], size: 15, pad: 12 });
    const xl = A.x + 22, xr = A.x + A.w - 22, lamPx = (xr - xl) / 1.6, kp = TAU / lamPx, R0 = 13;
    const ys = A.y + (PHONE ? 112 : 108), box = PHONE ? 250 : 270, dView = Math.min(h, wv.lam);
    const yS = (x) => ys - R0 * Math.cos(kp * (x - xl) - S.ph4);
    const zpx = (s) => (s / dView) * box;
    const wg = ctx.createLinearGradient(0, ys - 10, 0, ys + box); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(1, '#23608f');
    ctx.save(); ctx.beginPath(); ctx.rect(xl, A.y + 40, xr - xl, ys + box + 14 - A.y - 40); ctx.clip();
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(xl, ys + box); for (let x = xl; x <= xr + 1; x += 4) ctx.lineTo(x, yS(x)); ctx.lineTo(xr, ys + box); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); for (let x = xl; x <= xr + 1; x += 4) (x === xl ? ctx.moveTo(x, yS(x)) : ctx.lineTo(x, yS(x))); ctx.stroke();
    const xc = xl + 1.1 * lamPx, th = kp * (xc - xl) - S.ph4;
    for (let j = 0; j <= 4; j++) {
      const floor = h <= wv.lam && j === 4, s = floor ? h * 0.97 : (j / 4) * dView, [a, b] = orbitAB(wv.k, h, 1, s), ap = R0 * a, bp = R0 * b, cy = ys + (floor ? box * 0.97 : zpx(s));
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(xc, cy, Math.max(ap, 0.6), Math.max(bp, 0.4), 0, 0, TAU); ctx.stroke();
      if (ap > 0.8) ball(xc - ap * Math.sin(th), cy - bp * Math.cos(th), 3.8, '#fde68a', false);
      D.text(xc + Math.max(ap, 4) + 10, cy + 4, fN(floor ? h : s, s >= 100 ? 0 : s >= 10 ? 0 : 1) + ' m', { size: 11, weight: 800, color: '#ffffff', align: 'left', stroke: 'rgba(15,40,70,.7)', strokeWidth: 3 });
    }
    ctx.restore();
    if (h <= wv.lam) { ctx.fillStyle = '#6b5a45'; ctx.fillRect(xl, ys + box, xr - xl, 10); D.text(xl + 4, ys + box + 26 * FS, '해저 (수심 ' + h + ' m)', { size: 12, weight: 800, color: '#6b5a45', align: 'left' }); }
    else { D.text(xl + 4, ys + box + 26 * FS, '↓ 바닥은 훨씬 아래(수심 ' + h + ' m)예요. 그림은 깊이 λ까지만 보여 줘요.', { size: 12, weight: 800, color: '#475569', align: 'left' }); }
    D.label(xl + lamPx / 2, ys - R0 - 24, 'λ = ' + fN(wv.lam, wv.lam >= 100 ? 0 : 1) + ' m', { bg: '#7c3aed', size: 13 });
    drawWrap(A.x + A.w / 2, A.y + A.h - (PHONE ? 30 : 18), '깊이 눈금은 그림 높이에 맞춰 달라져요. 궤도는 심해에서 원, 얕아질수록 타원으로 변해요.', A.w - 30, 11.5, { color: '#64748b' });
    // ----- B
    card(B, '📏 h/λ 와 파속');
    const x0 = B.x + 14, ww = B.w - 28; let y = B.y + 50 * FS;
    // 로그 막대: h/λ = 0.01 ~ 10
    const lx = (v) => x0 + ww * ((Math.log10(clamp(v, 0.01, 10)) + 2) / 3);
    const zones = [[0.01, 0.05, '#86efac'], [0.05, 0.5, '#fcd34d'], [0.5, 10, '#93c5fd']];
    zones.forEach((z) => { ctx.fillStyle = z[2]; ctx.fillRect(lx(z[0]), y, lx(z[1]) - lx(z[0]), 18); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y, ww, 18);
    [0.05, 0.5].forEach((v) => { ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx(v), y - 4); ctx.lineTo(lx(v), y + 22); ctx.stroke(); D.text(lx(v), y + 38, v === 0.05 ? '1/20' : '1/2', { size: 11.5, weight: 800, color: '#334155' }); });
    D.text(lx(0.02), y - 8, '천해', { size: 11.5, weight: 800, color: '#15803d' }); D.text(lx(0.16), y - 8, '전이', { size: 11.5, weight: 800, color: '#b45309' }); D.text(lx(3), y - 8, '심해', { size: 11.5, weight: 800, color: '#1d4ed8' });
    DEPTHS4.forEach((d) => { const w2 = waveOf(T4, d); const on = S.vis4[d]; D.sphere(lx(w2.hl), y + 9, d === h ? 8 : 4.5, on || d === h ? ZCOL[classOf(w2.hl)] : '#cbd5e1', { gloss: false, outline: '#fff', outlineWidth: d === h ? 2.5 : 1 }); });
    y += 62 * FS;
    D.text(x0, y, 'h/λ = ' + fN(wv.hl, wv.hl >= 1 ? 1 : 3), { size: 15, weight: 900, color: '#1e3a8a', align: 'left' });
    D.text(x0, y + 22 * FS, '(h = ' + h + ' m, λ = ' + fN(wv.lam, 0) + ' m)', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    y += 54 * FS;
    D.text(x0, y, '파속 c = λ/T', { size: 13, weight: 800, color: '#334155', align: 'left' });
    D.text(x0 + ww, y, fN(wv.c, 1) + ' m/s', { size: 15, weight: 900, color: '#0f766e', align: 'right' });
    const rows = [['심해파 식 gT/2π', wv.cDeep], ['천해파 식 √(gh)', wv.cShallow]];
    rows.forEach((r, i) => {
      const yy = y + 34 * FS + i * 52 * FS, err = ((r[1] - wv.c) / wv.c) * 100, ok = Math.abs(err) < 5;
      D.text(x0, yy, r[0], { size: 12.5, weight: 800, color: '#475569', align: 'left' });
      D.text(x0, yy + 22 * FS, fN(r[1], 1) + ' m/s', { size: 14, weight: 900, color: ok ? '#15803d' : '#b91c1c', align: 'left' });
      D.label(x0 + ww - 4, yy + 16 * FS, ok ? '잘 맞아요' : '오차 ' + (err > 0 ? '+' : '−') + fN(Math.abs(err), 0) + ' %', { bg: ok ? '#15803d' : '#b91c1c', size: 12, pad: 7, align: 'right' });
    });
    y += 34 * FS + 2 * 52 * FS + 4;
    drawWrap(B.x + B.w / 2, y + 8, !showCls ? 'h/λ 값으로 어느 영역인지 직접 판단해 봐요.' : cls === 'trans' ? '전이 영역에서는 두 근사식이 모두 어긋나요. 정확한 식으로 계산해야 해요.' : cls === 'deep' ? '심해파 식이 잘 맞아요 (수심과 무관).' : '천해파 식이 잘 맞아요 (수심으로 결정).', ww, 12.5, { color: '#334155' });
  }
  function readTrans() {
    const wv = waveOf(T4, S.h4);
    setReadouts(['수심 h', S.h4 + ' m', 'h/λ', fN(wv.hl, wv.hl >= 1 ? 1 : 3), '파속 c', fN(wv.c, 1) + ' m/s']);
  }

  /* ======================================================
     입력 도구 · 컨트롤
     ====================================================== */
  const stpC = makeStepper($('#stpC'), { min: 0, max: 6, step: 0.1, value: 0, dec: 1, unit: 'm/s' });
  const stpC2 = makeStepper($('#stpC2'), { min: 0, max: 40, step: 0.1, value: 0, dec: 1, unit: 'm/s' });
  const stpR = makeStepper($('#stpR'), { min: 0, max: 100, step: 1, value: 0, dec: 0, unit: '%' });
  const ordArr = makeOrder($('#ordArr'), [
    { id: 't6', label: 'T = 6 s 인 파' }, { id: 't16', label: 'T = 16 s 인 파' }, { id: 't10', label: 'T = 10 s 인 파' },
  ], ['t16', 't10', 't6'], () => { });
  const clsDepth = makeClassify($('#clsDepth'), DEPTHS4.map((d) => ({ id: 'd' + d, label: '수심 ' + d + ' m' })), [{ id: 'deep', label: '심해파' }, { id: 'trans', label: '전이파' }, { id: 'shallow', label: '천해파' }], { d400: 'deep', d100: 'deep', d40: 'trans', d10: 'trans', d2: 'shallow' }, () => { });

  SciSim.bindRange($('#sU'), $('#oU'), (v) => v + ' m/s', (v) => { S.U = +v; });
  SciSim.bindRange($('#sTH'), $('#oTH'), (v) => v + ' h', (v) => { S.tH = +v; });
  SciSim.bindRange($('#sF'), $('#oF'), (v) => v + ' km', (v) => { S.F = +v; });
  SciSim.bindRange($('#sT'), $('#oT'), (v) => fN(v, 1) + ' s', (v) => { S.T = +v; });
  SciSim.bindRange($('#sAmp'), $('#oAmp'), (v) => v + ' cm', (v) => { S.amp = +v; });
  SciSim.bindRange($('#sT2'), $('#oT2'), (v) => v + ' s', (v) => { S.T2 = +v; });
  SciSim.bindRange($('#sPos'), $('#oPos'), (v) => v + ' %', (v) => { S.pos3 = +v; });
  const setU = (v) => { S.U = v; setSlider($('#sU'), $('#oU'), v, (x) => x + ' m/s'); };
  const setTH = (v) => { S.tH = v; setSlider($('#sTH'), $('#oTH'), v, (x) => x + ' h'); };
  const setF = (v) => { S.F = v; setSlider($('#sF'), $('#oF'), v, (x) => x + ' km'); };
  const setT = (v) => { S.T = v; setSlider($('#sT'), $('#oT'), v, (x) => fN(x, 1) + ' s'); };
  const setAmp = (v) => { S.amp = v; setSlider($('#sAmp'), $('#oAmp'), v, (x) => x + ' cm'); };
  const setT2 = (v) => { S.T2 = v; setSlider($('#sT2'), $('#oT2'), v, (x) => x + ' s'); };
  const setPos = (v) => { S.pos3 = v; setSlider($('#sPos'), $('#oPos'), v, (x) => x + ' %'); };
  function setSub1(k) { S.sub = k; $$('#sub1 .opt').forEach((b) => b.classList.toggle('on', b.dataset.s === k)); updateCtl(); }
  $$('#sub1 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub1(b.dataset.s); }));
  function setSub3(k) { if (S.sub3 !== k) { S.fade = 0.6; S.lastBrk = -1e9; } S.sub3 = k; $$('#sub3 .opt').forEach((b) => b.classList.toggle('on', b.dataset.s === k)); updateCtl(); }
  $$('#sub3 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub3(b.dataset.s); }));
  function syncWm() { $('#bWm').textContent = S.wm ? '⏹ 조파기 끄기' : '▶ 조파기 켜기'; $('#bWm').classList.toggle('on', S.wm); }
  $('#bWm').addEventListener('click', () => { Sound.click(); toggleWm(); });
  function toggleWm() {
    if (S.wm) { S.wm = false; S.tailT = 0; }
    else { S.wm = true; if (S.tailT != null || S.frontT <= 0) { S.frontT = 0; S.tailT = null; S.reach = false; } S.hist = []; }
    syncWm();
  }
  function setH3(h) { S.h3 = h; $$('#depth3 .opt').forEach((b) => b.classList.toggle('on', +b.dataset.h === h)); }
  $$('#depth3 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setH3(+b.dataset.h); }));
  function syncRec() { const b = $('#bRec'); b.textContent = S.rec[S.h3] ? '✔ 기록했어요 (다시 누르면 지워요)' : '📌 이 수심의 파속 기록하기'; b.classList.toggle('on', !!S.rec[S.h3]); }
  $('#bRec').addEventListener('click', () => { Sound.click(); S.rec[S.h3] = !S.rec[S.h3]; syncRec(); });
  function setH4(h) { S.h4 = h; S.vis4[h] = true; $$('#depth4 .opt').forEach((b) => b.classList.toggle('on', +b.dataset.h === h)); }
  $$('#depth4 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setH4(+b.dataset.h); }));

  const MODE_LABEL = { wave: '🌊 해파 실험', deep: '🌐 심해파', shallow: '🏖️ 천해파', trans: '📏 전이파' };
  let ctlKeys = [];
  function freeKeys() {
    if (S.mode === 'wave') return S.sub === 'wind' ? ['sub1', 'sU', 'sTH', 'sF'] : ['sub1', 'bWm', 'sT', 'sAmp'];
    if (S.mode === 'deep') return ['sT2'];
    if (S.mode === 'shallow') return S.sub3 === 'depth' ? ['sub3', 'depth3', 'bRec'] : ['sub3', 'sPos'];
    return ['depth4'];
  }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? freeKeys() : ctlKeys;
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
    setU(10); setTH(6); setF(100); S.hsV = hsOf(10, 6, 100);
    setT(1.2); setAmp(5); S.wm = false; S.frontT = 0; S.tailT = null; S.obs = 0; S.reach = false; S.hist = []; S.showC = false; stpC.reset(); syncWm(); setSub1('wind');
    setT2(6); S.showC2 = false; S.showTbl = false; stpC2.reset(); stpR.reset(); ordArr.reset();
    S.rec = {}; setH3(4000); setSub3('depth'); setPos(0); S.posVis = {}; S.breaks = 0; S.foam = []; S.lastBrk = -1e9; syncRec(); S.cV = null;
    S.vis4 = {}; setH4(400); S.showCls = false; clsDepth.reset();
    if (li === 0) { setMode('wave'); setSub1('wind'); setCtl(['sU', 'sTH', 'sF']); showHint('풍속, 시간, 거리를 키우면 파도가 어떻게 달라지는지 봐요', 5200); }
    else if (li === 1) { setMode('deep'); setCtl(['sT2']); showHint('주기 슬라이더를 움직여 파장과 속도를 비교해 봐요', 5200); }
    else if (li === 2) { setMode('shallow'); setSub3('depth'); setCtl(['depth3', 'bRec']); showHint('수심 단추를 눌러 파속이 어떻게 달라지는지 봐요', 5200); }
    else { setMode('trans'); setCtl(['depth4']); showHint('수심 단추를 눌러 h/λ와 파속을 살펴봐요', 5200); }
    updateCtl();
  }
  const nearEq = (a, b) => Math.abs(a - b) < 1e-6;
  const levels = [
    {
      title: '해파 실험: 파형이 달려와요', short: '해파 실험', icon: '🌊', phase: '실험', features: ['wave'],
      intro: '<p class="si-q">❓ 탐구 질문: 바다 위의 파도는 물이 달려오는 것일까, 모양만 달려오는 것일까? 수심이 파도의 속도를 바꿀까?</p>' +
        '<div class="si-link">🔗 <b>진로선택 역학과 에너지에서</b> 파동의 속도 <b>v = fλ</b>를 배웠고, <b>앞 차시</b>에서는 해수면의 기울기가 해류를 만드는 것을 봤어요. 이번에는 해수면이 <b>주기적으로 오르내리며</b> 퍼져 나가는 <b>해파</b>를 살펴봐요.</div>' +
        '<p>해파는 해수면이 <b>주기적으로 상하 운동</b>하면서 <b>에너지를 전파</b>하는 현상이에요. 바닷물이 파와 함께 이동하는 것이 아니에요. 대부분의 해파는 <b>바람</b>이 만들고, 파고는 풍속 · 바람이 부는 시간 · 바람이 부는 거리(<b>취송 거리</b>)에 따라 커져요. 파의 속도는 <b>c = λ/T</b> (= fλ)예요.</p>',
      setup() { resetStep(0); },
      recap: '해파는 해수면이 주기적으로 오르내리며 에너지와 파형을 전파하는 현상이에요. 바닷물이 이동하는 것이 아니고, 파속은 c = λ/T예요.',
      summary: '<ul><li><b>해파</b>: 해수면이 주기적으로 상하 운동하면서 <b>에너지를 전파</b>하는 현상. <b>바닷물이 직접 이동하는 것이 아니에요</b>. 물 입자는 제자리 근처에서 원을 그리고 파형만 앞으로 나아가요.</li><li><b>풍파</b>는 바람이 만들어요. 파고는 <b>풍속 · 바람이 부는 시간 · 취송 거리</b>가 클수록 커져요(셋 중 가장 모자란 조건이 한계). 폭풍에서 멀리 퍼져 나간 규칙적이고 긴 파는 <b>너울</b>이에요.</li><li><b>파속 c = λ/T = fλ</b>. 수조 예시: T = 1.6 s, λ = 4.0 m → c = 2.5 m/s.</li><li>파가 전달하는 것은 <b>에너지와 파형</b>이에요.</li></ul>',
      missions: [
        {
          title: '풍파 키우기',
          goal: '풍속 · 바람이 부는 시간 · 취송 거리를 키워 <b>파고를 4 m 이상</b>으로 만들어요.',
          hint: '하나만 크게 해서는 한계가 있어요. 예를 들어 풍속 20 m/s, 24시간, 500 km 정도로 해 봐요.',
          setup() { setMode('wave'); setSub1('wind'); setCtl(['sU', 'sTH', 'sF']); },
          check: () => hsOf(S.U, S.tH, S.F) >= 4, hold: 0.8,
          status: () => mark(hsOf(S.U, S.tH, S.F) >= 4) + ' 파고 ' + fN(hsOf(S.U, S.tH, S.F), 1) + ' m (목표 4 m 이상) · 풍속 ' + S.U + ' m/s · ' + S.tH + ' h · ' + S.F + ' km',
          explain: '파고는 <b>풍속이 클수록, 바람이 오래 불수록, 바람이 부는 거리(취송 거리)가 길수록</b> 커져요. 셋 중 하나라도 모자라면 파고가 거기에서 막혀요. 이렇게 바람이 만든 파가 폭풍 지역을 벗어나 멀리 가면 파장이 길고 규칙적인 <b>너울</b>이 돼요.',
        },
        {
          title: '파속 구하기',
          goal: '<b>조파기를 켜고</b> 주기를 <b>T = 1.6 s</b>로 맞춘 뒤, 화면에서 읽은 파장으로 파속 <b>c = λ/T</b>를 계산해 입력해요. 파가 끝까지 가는 동안 부표를 지켜봐요.',
          hint: 'T = 1.6 s에서 화면의 파장은 약 4.0 m예요. c = 4.0 m ÷ 1.6 s = 2.5 m/s이에요. 부표 A·B·C가 제자리에서 맴도는지도 살펴봐요.',
          setup() { S.showC = false; setMode('wave'); setSub1('tank'); setCtl(['bWm', 'sT', 'stpC']); stpC.reset(); },
          check: () => S.wm && nearEq(S.T, 1.6) && S.reach && S.obs >= 2 && nearEq(stpC.value, 2.5), hold: 0.8,
          status: () => mark(S.wm) + ' 조파기 켜짐 · ' + mark(nearEq(S.T, 1.6)) + ' T ' + fN(S.T, 1) + ' s (목표 1.6) · ' + mark(S.reach && S.obs >= 2) + ' 파가 끝까지 전달·부표 관찰 · ' + mark(nearEq(stpC.value, 2.5)) + ' 입력 ' + fN(stpC.value, 1) + ' m/s',
          explain: 'c = λ/T = 4.0 m ÷ 1.6 s = <b>2.5 m/s</b>예요. 부표는 파가 지나가도 <b>제자리에서 원을 그리며</b> 오르내릴 뿐 파장만큼 멀리 나아가지 않아요. 앞으로 나아가는 것은 <b>파형과 에너지</b>예요.',
        },
        {
          type: 'quiz', title: '파도가 나르는 것은?',
          goal: '해안으로 밀려오는 파도가 전달하는 것은?',
          setup() { S.showC = true; setMode('wave'); setSub1('tank'); setCtl(['bWm', 'sT', 'sAmp']); },
          choices: ['에너지와 파형이에요. 물 입자는 제자리에서 원운동만 해요', '바닷물 자체예요. 파도가 물을 해안으로 계속 밀어 나르는 거예요', '바닷물과 에너지를 모두 같은 속도로 실어 날라요', '아무것도 전달하지 않고 수면이 제멋대로 흔들릴 뿐이에요'],
          answer: 0,
          feedback: ['', '부표가 파와 함께 파장만큼 이동하지 않고 제자리를 맴도는 것을 봤어요. 물이 달려오는 것이 아니에요.', '에너지는 파의 속도로 전달되지만, 물 입자는 거의 제자리예요. 부표가 이를 보여 줘요.', '해파는 규칙적인 주기와 파장을 가지고 에너지를 전달해요. 조파기가 만든 파를 다시 봐요.'],
          explain: '해파는 <b>에너지와 파형</b>을 전달해요. 물 입자는 제자리 근처에서 <b>원(타원) 운동</b>만 하고, 파가 해안에 닿아도 바닷물이 계속 밀려가는 것은 아니에요.',
        },
      ],
    },
    {
      title: '심해파: 주기가 속도를 정해요', short: '심해파', icon: '🌐', phase: '분석', features: ['deep'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 파속 c = λ/T이고 물 입자는 제자리에서 원운동한다는 것을 봤어요. 수심이 충분히 <b>깊으면</b> 파는 어떻게 움직일까요?</div>' +
        '<p>수심이 파장의 절반보다 깊을 때(<b>h &gt; λ/2</b>) 바닥의 영향을 받지 않는 파를 <b>심해파</b>라고 해요. 이때 <b>λ = gT²/2π</b>, <b>c = gT/2π</b>예요. 파속은 수심이 아니라 <b>주기</b>가 정하고, 주기가 길수록 빨라요(분산성). 입자 궤도는 <b>원</b>이고 깊이 z에서 반지름이 <b>e<sup>−2πz/λ</sup></b>배로 줄어요. (식은 유도하지 않고 계산 도구로 써요.)</p>',
      setup() { resetStep(1); },
      recap: '심해파는 수심이 아니라 주기가 속도를 정해요(c = gT/2π). 주기가 길수록 빠르고, 입자 궤도는 깊이에 따라 줄어 깊이 λ/2에서 약 4 %가 돼요.',
      summary: '<ul><li><b>심해파</b>(수심 h &gt; λ/2): <b>λ = gT²/2π</b>, <b>c = gT/2π</b> → 약 λ ≈ 1.56 T² (m), c ≈ 1.56 T (m/s). <b>T = 10 s이면 λ = 156 m, c = 15.6 m/s.</b></li><li>속도는 <b>수심과 무관</b>하고 <b>주기가 길수록 빨라요</b>(분산). 그래서 먼 폭풍의 <b>긴 너울이 먼저</b> 도착해요.</li><li>입자 궤도는 <b>원</b>, 반지름은 깊이 z에서 e<sup>−2πz/λ</sup>배. <b>깊이 λ/2에서 약 4 %</b>, 거의 움직이지 않아요.</li></ul>',
      missions: [
        {
          title: 'T = 10 s의 파속과 궤도',
          goal: '주기를 <b>T = 10 s</b>로 맞추고, 파속 <b>c</b>(m/s)와 <b>깊이 λ/2에서의 궤도 크기</b>(수면 대비 %)를 입력해요.',
          hint: 'c = gT/2π = 9.8 × 10 ÷ 6.28 ≈ 15.6 m/s예요. 궤도 크기는 그림 오른쪽 숫자에서 깊이 λ/2(노란 점선) 줄을 읽어요.',
          setup() { S.showC2 = false; S.showTbl = false; setMode('deep'); setCtl(['sT2', 'stpC2', 'stpR']); stpC2.reset(); stpR.reset(); },
          check: () => S.T2 === 10 && nearEq(stpC2.value, Number(fN(cDeep(10), 1))) && stpR.value === Math.round(pctAt(0.5)), hold: 0.8,
          status: () => mark(S.T2 === 10) + ' T ' + S.T2 + ' s (목표 10) · ' + mark(S.T2 === 10 && nearEq(stpC2.value, Number(fN(cDeep(10), 1)))) + ' c ' + fN(stpC2.value, 1) + ' m/s · ' + mark(stpR.value === Math.round(pctAt(0.5))) + ' 궤도 ' + stpR.value + ' %',
          explain: 'c = gT/2π = 9.8 × 10 ÷ 2π ≈ <b>15.6 m/s</b>(λ = 156 m)이고, 깊이 λ/2에서는 e<sup>−π</sup> ≈ 0.043, 곧 수면 궤도의 <b>약 4 %</b>예요. 심해파의 에너지는 대부분 수면 가까이에 있어요.',
        },
        {
          title: '먼저 도착하는 파', manual: true,
          goal: '3000 km 떨어진 폭풍에서 출발한 세 파 중 <b>먼저 도착하는 순서</b>대로 눌러요.',
          hint: '심해파는 주기가 길수록 빨라요. 표에서 파속 c가 큰 파부터 눌러요.',
          setup() { S.showC2 = true; S.showTbl = true; ordArr.reset(); setMode('deep'); setCtl(['ordArr']); },
          status: () => mark(ordArr.ok()) + ' 누른 파 ' + ordArr.seq.length + ' / 3',
          check() {
            if (!ordArr.complete()) return '세 파를 모두 눌러 주세요. (지금 ' + ordArr.seq.length + '개)';
            if (!ordArr.ok()) { ordArr.mark(ordArr.seq[ordArr.firstWrong()]); return '순서가 달라요. 심해파는 주기가 길수록 파속이 커요.'; }
            return true;
          },
          explain: 'c = gT/2π이므로 T = 16 s(25 m/s) → 10 s(15.6 m/s) → 6 s(9.4 m/s) 순으로 빨라요. 3000 km를 오는 데 각각 약 33시간, 53시간, 89시간 걸려요. 그래서 <b>긴 너울이 먼저</b> 도착해요.',
        },
        {
          type: 'quiz', title: '깊을수록 빠를까?',
          goal: '심해파의 속도에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.showC2 = true; S.showTbl = true; setMode('deep'); setCtl(['sT2']); },
          choices: ['수심과 무관하고 주기가 길수록 빨라요', '바다가 깊을수록 모든 파가 빨라져요', '파장과 주기에 관계없이 항상 √(gh)예요', '진폭이 클수록 빨라요'],
          answer: 0,
          feedback: ['', '심해파는 이미 바닥의 영향을 받지 않는 파라서 수심이 더 깊어져도 속도가 달라지지 않아요.', 'c = √(gh)는 수심이 아주 얕을 때(천해파)의 식이에요.', '이 식 c = gT/2π에는 진폭이 들어 있지 않아요. 주기가 정해요.'],
          explain: '심해파는 c = gT/2π라서 <b>수심과 상관없고 주기에 비례</b>해요. 그래서 깊은 바다에서는 긴 주기의 파(너울)가 짧은 주기의 풍파보다 빨라서 먼저 도착해요.',
        },
      ],
    },
    {
      title: '천해파: 수심이 속도를 정해요', short: '천해파', icon: '🏖️', phase: '분석', features: ['shallow'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 깊은 바다에서는 파의 속도가 주기로 정해졌어요. 수심이 파장에 비해 <b>매우 얕으면</b> 어떻게 될까요?</div>' +
        '<p>수심이 파장의 1/20보다 얕을 때(<b>h &lt; λ/20</b>) 파를 <b>천해파</b>라고 해요. 이때 파속은 <b>c = √(gh)</b>로 <b>수심에만</b> 관계하고 파장이나 주기와는 무관해요. 입자 궤도는 <b>타원</b>이고, 바닥에서는 <b>수평으로 왕복</b>해요. 파가 해안으로 다가가면 수심이 줄어 속도와 파장이 줄고 파고는 커져서 결국 <b>부서져요(쇄파)</b>.</p>',
      setup() { resetStep(2); },
      recap: '천해파의 속도는 수심만으로 정해져요(c = √(gh)). 해안으로 다가가면 주기는 그대로이고 속도·파장은 줄고 파고는 커져 쇄파가 일어나요.',
      summary: '<ul><li><b>천해파</b>(h &lt; λ/20): <b>c = √(gh)</b> — 파장·주기와 무관. 수심 <b>4000 m → 약 198 m/s(약 713 km/h)</b>, 1000 m → 99 m/s, 100 m → 약 31 m/s, <b>10 m → 약 9.9 m/s</b>.</li><li>입자 궤도는 <b>타원</b>이고 바닥에서는 수평 왕복. 수면에서는 가로로 납작한 타원이에요.</li><li>해안으로 접근하면 <b>주기 T는 일정</b>하고 속도 c와 파장 λ(= cT)는 줄며 파고는 커져요. 파고가 수심의 약 <b>0.78배</b>를 넘으면 부서져요(쇄파).</li><li>수심 4000 m의 긴 파는 여객기만큼 빨라서 지진 해일(쓰나미)이 먼 곳까지 금방 도착해요.</li></ul>',
      missions: [
        {
          title: '수심 3곳의 파속 기록',
          goal: '수심 <b>4000 m · 100 m · 10 m</b>를 각각 눌러 파속을 <b>기록</b>해요.',
          hint: '수심 단추를 누르고 ‘이 수심의 파속 기록하기’를 눌러요. 세 수심 모두 기록하면 돼요.',
          setup() { setMode('shallow'); setSub3('depth'); setCtl(['depth3', 'bRec']); },
          check: () => S.rec[4000] && S.rec[100] && S.rec[10], hold: 0.6,
          status: () => mark(S.rec[4000]) + ' 4000 m · ' + mark(S.rec[100]) + ' 100 m · ' + mark(S.rec[10]) + ' 10 m',
          explain: 'c = √(gh)에서 <b>4000 m → 198 m/s</b>(약 713 km/h), <b>100 m → 31 m/s</b>, <b>10 m → 9.9 m/s</b>예요. 파장이나 주기가 아니라 <b>수심</b>만으로 정해져요. 수심이 얕아질수록 느려져요.',
        },
        {
          title: '해안으로 다가오는 파 관찰',
          goal: '완만한 해빈에서 관측 위치를 <b>바다 쪽 · 중간 · 해안 쪽</b>으로 옮겨 보고, 파도가 <b>부서지는 모습을 3번</b> 지켜봐요.',
          hint: '‘관측 위치’ 슬라이더를 0 %, 50 %, 90 % 근처로 옮겨 값이 어떻게 변하는지 봐요. 보라색 점선 오른쪽에서 파도가 부서져요.',
          setup() { setMode('shallow'); setSub3('beach'); setCtl(['sPos']); S.posVis = {}; S.breaks = 0; S.lastBrk = -1e9; },
          check: () => S.sub3 === 'beach' && S.posVis[0] && S.posVis[1] && S.posVis[2] && S.breaks >= 3, hold: 0.5,
          status: () => mark(S.posVis[0] && S.posVis[1] && S.posVis[2]) + ' 관측한 위치 ' + [0, 1, 2].filter((i) => S.posVis[i]).length + ' / 3 · ' + mark(S.breaks >= 3) + ' 쇄파 ' + Math.min(S.breaks, 3) + ' / 3',
          explain: '해안으로 갈수록 수심이 줄어 <b>속도 c = √(gh)와 파장 λ = cT가 줄어요</b>(T는 일정). 에너지가 좁아져 <b>파고는 커지고</b>, 파고가 수심의 약 0.78배를 넘으면 마루가 앞으로 쏠려 <b>부서져요</b>.',
        },
        {
          type: 'quiz', title: '비행기만큼 빠른 파',
          goal: '수심 4000 m의 긴 파가 약 <b>198 m/s</b>(여객기급)로 달릴 수 있는 까닭은?',
          setup() { setMode('shallow'); setSub3('depth'); setH3(4000); setCtl(['depth3']); },
          choices: ['파장이 수심보다 훨씬 길면 파속이 c = √(gh)로 수심만으로 정해지는데, 4000 m는 수심이 커서 값이 커요', '파장이 짧을수록 빨라서 4000 m의 파는 파장이 아주 짧기 때문이에요', '4000 m의 파는 주기가 길수록 빨라지는 심해파 식 gT/2π를 쓰기 때문이에요', '바다가 깊으면 물이 같이 흘러서 파가 물에 실려 가기 때문이에요'],
          answer: 0,
          feedback: ['', '이 파는 파장이 아주 길어요(약 119 km). 천해파는 파장이 길수록 천해 조건에 잘 맞아요.', '수심이 파장의 1/20보다 얕으면 천해파라서 gT/2π 식이 아니라 √(gh)를 써요.', '해파는 물이 이동하는 것이 아니라 에너지와 파형이 전파되는 거예요.'],
          explain: '파장이 수심의 20배보다 길면 천해파이고 <b>c = √(gh)</b>예요. 수심 4000 m이면 √(9.8 × 4000) ≈ <b>198 m/s</b>(약 713 km/h)로, <b>파장과 주기에는 관계가 없어요</b>. 쓰나미 같은 긴 파가 바다를 가로질러 금방 도착하는 까닭이에요.',
        },
      ],
    },
    {
      title: '전이파: 심해파와 천해파 사이', short: '전이파', icon: '📏', phase: '탐구', features: ['trans'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 깊은 바다(h &gt; λ/2)에서는 주기가, 아주 얕은 바다(h &lt; λ/20)에서는 수심이 파속을 정했어요. 그 사이 영역은 어떨까요?</div>' +
        '<p>같은 파(T = 10 s)가 해안으로 다가오는 것처럼 수심 <b>400 · 100 · 40 · 10 · 2 m</b>로 옮겨 보며 <b>h/λ</b>를 확인해요. <b>λ/20 &lt; h &lt; λ/2</b>인 영역을 <b>전이파</b>라고 하며, 이 영역에서는 두 근사식이 모두 어긋나요. 속도는 <b>c = √[(gλ/2π)·tanh(2πh/λ)]</b>로 구해요(계산은 도구가 해요).</p>',
      setup() { resetStep(3); },
      recap: '파가 해안으로 오는 동안 주기는 변하지 않고, 속도·파장·파고는 변해요. 전이파는 λ/20 < h < λ/2 구간이에요.',
      summary: '<ul><li><b>심해파</b> h/λ &gt; 1/2 → c = gT/2π · <b>천해파</b> h/λ &lt; 1/20 → c = √(gh) · <b>전이파</b> 1/20 &lt; h/λ &lt; 1/2 (두 식 모두 어긋남).</li><li>T = 10 s의 파: <b>400 m</b> λ ≈ 156 m, h/λ ≈ 2.6, c ≈ 15.6 m/s <b>심해</b> · <b>100 m</b> λ ≈ 156 m, 0.64, 15.6 <b>심해</b> · <b>40 m</b> λ ≈ 146 m, 0.27, 14.6 <b>전이</b> · <b>10 m</b> λ ≈ 92 m, 0.11, 9.2 <b>전이</b> · <b>2 m</b> λ ≈ 44 m, 0.046, 4.4 <b>천해</b>.</li><li>해안으로 오는 동안 <b>변하지 않는 양은 주기 T</b>예요. <b>속도 · 파장 · 파고</b>는 변해요.</li></ul>',
      missions: [
        {
          title: '수심 5곳 분류하기', manual: true,
          goal: '수심 5곳을 모두 눌러 h/λ를 확인하고, <b>심해파 · 전이파 · 천해파</b>로 분류해요.',
          hint: '심해파는 h/λ > 1/2, 천해파는 h/λ < 1/20(0.05), 그 사이가 전이파예요. 수심 단추를 눌러 오른쪽 h/λ 값을 읽어요.',
          setup() { S.showCls = false; clsDepth.reset(); S.vis4 = {}; setH4(400); setMode('trans'); setCtl(['depth4', 'clsDepth']); },
          status: () => mark(DEPTHS4.every((d) => S.vis4[d])) + ' 확인한 수심 ' + DEPTHS4.filter((d) => S.vis4[d]).length + ' / 5 · ' + mark(clsDepth.ok()) + ' 분류 ' + clsDepth.count() + ' / 5',
          check() {
            if (!DEPTHS4.every((d) => S.vis4[d])) return '수심 5곳을 모두 눌러서 h/λ를 확인해 주세요.';
            if (!clsDepth.complete()) return '5곳을 모두 분류해 주세요. (지금 ' + clsDepth.count() + '곳)';
            if (!clsDepth.ok()) { clsDepth.mark(clsDepth.wrong()); return '빨간 줄이 달라요. h/λ가 1/2보다 큰지, 1/20(0.05)보다 작은지 확인해 봐요.'; }
            return true;
          },
          explain: '<b>400 m(h/λ ≈ 2.6)와 100 m(0.64)</b>는 1/2보다 커서 <b>심해파</b>, <b>40 m(0.27)와 10 m(0.11)</b>는 <b>전이파</b>, <b>2 m(0.046)</b>는 1/20보다 작아 <b>천해파</b>예요.',
        },
        {
          type: 'quiz', title: '해안으로 오는 동안 변하지 않는 것',
          goal: '파가 먼바다에서 해안으로 다가오는 동안 <b>변하지 않는 양</b>은?',
          setup() { S.showCls = true; setMode('trans'); setCtl(['depth4']); },
          choices: ['주기 T', '파속 c', '파장 λ', '파고 H'],
          answer: 0,
          feedback: ['', '수심이 줄면 파속이 줄어요. 화면의 c 값이 400 m에서 2 m까지 줄어드는 것을 봐요.', '파장은 λ = cT라서 c가 줄면 같이 줄어요. 화면에서 λ가 156 m에서 44 m로 줄었어요.', '파고는 얕아질수록 커졌다가 쇄파로 줄어요.'],
          explain: '파의 <b>주기 T는 파원이 정해서 변하지 않아요</b>. 수심이 줄면 속도 c가 줄고, λ = cT도 줄고, 에너지가 모여 파고가 커져요. 전이파는 이 변화가 일어나는 중간 영역이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-ocean-waves', mount: '#game', badge: '파도 탐험가', homeHref: '../../index.html#hs',
    featureLabels: { wave: '🌊 풍파 · 파랑 수조', deep: '🌐 심해파 궤도 · 파속', shallow: '🏖️ 수심별 파속 · 해빈', trans: '📏 h/λ 영역 · 두 근사식' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'wave') { if (S.sub === 'wind') readWind(); else readTank(); }
    else if (S.mode === 'deep') readDeep();
    else if (S.mode === 'shallow') readShallow();
    else readTrans();
  }
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== 'shallow') S.lastBrk = -1e9;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'wave') { if (S.sub === 'wind') drawWind(t, dt); else drawTank(t, dt); }
    else if (S.mode === 'deep') drawDeepScene(t, dt);
    else if (S.mode === 'shallow') drawShallow(t, dt);
    else drawTrans(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, stpC, stpC2, stpR, ordArr, clsDepth, waveOf, hsOf, cDeep, pctAt, DEPTHS3, DEPTHS4,
    get game() { return game; }, setMode, resetStep, updateCtl, setU, setTH, setF, setT, setT2, setPos, setSub1, setSub3, setH3, setH4, toggleWm, beach: () => beachTbl,
  };
})();
