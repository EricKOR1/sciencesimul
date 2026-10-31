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
     지형류와 해수면 경사 (해수면 경사 → 압력 경도력 → 힘의 균형 → 유속 계산)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 900, 1.22);
  let game = null;
  const DEG = Math.PI / 180;
  const OMEGA = 7.29e-5, RHO = 1025, G = 9.8;
  const fOf = (lat) => 2 * OMEGA * Math.sin(lat * DEG);
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  function sci(x, d) {
    if (x === 0) return '0';
    const neg = x < 0; x = Math.abs(x);
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (+m.toFixed(d) >= 10) { m /= 10; e += 1; }
    return (neg ? '−' : '') + m.toFixed(d) + '×10' + sup(e);
  }
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
  const ocean = (R, c1, c2) => {
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, c1 || '#d3ecfa'); g.addColorStop(1, c2 || '#a9d4ee');
    ctx.fillStyle = g; rr(R.x, R.y, R.w, R.h, 14).fill();
  };
  const phoneRC = (a, b) => (PHONE ? a : b);
  function rcOf(mode) {
    if (mode === 'ssh') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 350 }, B: { x: 8, y: 366, w: 504, h: 230 }, C: { x: 8, y: 604, w: 504, h: 280 } }, { A: { x: 12, y: 12, w: 392, h: 372 }, B: { x: 412, y: 12, w: 376, h: 372 }, C: { x: 12, y: 392, w: 776, h: 156 } });
    if (mode === 'tank') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 430 }, B: { x: 8, y: 446, w: 504, h: 420 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    if (mode === 'rot') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 470 }, B: { x: 8, y: 486, w: 504, h: 380 } }, { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 380 }, B: { x: 8, y: 396, w: 504, h: 480 } }, { A: { x: 12, y: 12, w: 340, h: 536 }, B: { x: 360, y: 12, w: 428, h: 536 } });
  }
  const mixc2 = (a, b, t) => mixc(a, b, t);

  const S = {
    mode: 'ssh', fade: 0, clock: 0,
    // 1. 해수면 경사
    pa: 0.6, pb: -0.6, drag: null, mapA: 0, chainT: 0, probeSeen: false,
    // 2. 압력 경도력
    z: 0, dEta: 0, rel: 0, barrier: 0, relGo: false, showP: false, fl: [], zV: 0,
    // 3. 힘의 균형
    rot: false, dEta2: 0.8, lat2: 30, dEta2V: 0.8, lat2V: 30, parcels: [], rtime: 0, geo: false, geoT: 0, names2: false,
    // 4. 유속 계산
    sc: 'kuro', eta4: 0.8, dx4: 100, lat4: 33, showV: false, gp: [],
  };

  /* ======================================================
     장면 1: 해수면 경사 — 해수면은 평평하지 않아요
     ====================================================== */
  const RN = 0.95;                                              // 중앙에서 이만큼 떨어지면 가장자리(−0.5 m)
  const etaR = (r) => 0.5 * Math.cos(Math.PI * Math.min(r / RN, 1));  // r: 중심에서의 거리(정규화), 단위 m
  const etaX = (x) => etaR(Math.abs(x));
  let mapImg = null;
  function buildMap(w, h) {
    const c = document.createElement('canvas'), W = Math.ceil(w / 3), H = Math.ceil(h / 3); c.width = W; c.height = H;
    const o = c.getContext('2d'), im = o.createImageData(W, H), U = Math.min(w, h) / 2 - 6;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const dx = (i + 0.5) * 3 - w / 2, dy = (j + 0.5) * 3 - h / 2, e = etaR(Math.hypot(dx, dy) / U);
      const t = (e + 0.5) / 1.0;       // 0(낮음) ~ 1(높음)
      let r, g, b;
      if (t < 0.5) { const k = t / 0.5; r = 37 + (245 - 37) * k; g = 99 + (248 - 99) * k; b = 235 + (255 - 235) * k; }
      else { const k = (t - 0.5) / 0.5; r = 245 + (220 - 245) * k; g = 248 + (38 - 248) * k; b = 255 + (38 - 255) * k; }
      const p = (j * W + i) * 4; im.data[p] = r; im.data[p + 1] = g; im.data[p + 2] = b; im.data[p + 3] = 255;
    }
    o.putImageData(im, 0, 0);
    return c;
  }
  const etaCol = (e) => { const t = clamp((e + 0.5) / 1.0, 0, 1); return t < 0.5 ? mixc('#2563eb', '#f1f5f9', t / 0.5) : mixc('#f1f5f9', '#dc2626', (t - 0.5) / 0.5); };
  function sshGeom() {
    const { A, B } = rcOf('ssh');
    const U = Math.min(A.w, A.h) / 2 - 6, cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 8;
    const P = { x: B.x + 52, y: B.y + 48, w: B.w - 70, h: B.h - 146 };    // 단면 그래프
    return { A, B, U, cx, cy, P };
  }
  const profX = (g, xn) => g.P.x + ((xn + 1) / 2) * g.P.w;
  const profY = (g, e) => g.P.y + g.P.h - ((e + 0.7) / 1.4) * g.P.h;
  function probePos(g, k, where) {
    const xn = k === 'a' ? S.pa : S.pb, e = etaX(xn);
    return where === 'map' ? { x: g.cx + xn * g.U, y: g.cy } : { x: profX(g, xn), y: profY(g, e) };
  }
  function drawSsh(t, dt) {
    const g = sshGeom(), { A, B, U, cx, cy, P } = g;
    S.mapA = approach(S.mapA, 1, dt, 3.2);
    S.chainT = Math.min(1, S.chainT + dt / (RM ? 0.01 : 4.2));
    // ----- A: 해수면 높이 지도 (예시)
    card(A, '🛰️ 해수면 높이 지도 (위성 고도계 예시)');
    if (!mapImg) mapImg = buildMap(A.w, A.h);
    ctx.save(); rr(A.x, A.y + 34, A.w, A.h - 34, 12).clip();
    ctx.fillStyle = '#eef2f7'; ctx.fillRect(A.x, A.y, A.w, A.h);
    ctx.globalAlpha = S.mapA; ctx.imageSmoothingEnabled = true; ctx.drawImage(mapImg, A.x, A.y, mapImg.width * 3, mapImg.height * 3);
    ctx.globalAlpha = 1;
    // 등수위선
    [[0.25, '+0.25 m'], [0, '0 m'], [-0.25, '−0.25 m']].forEach(([e, lab]) => {
      const r = (Math.acos(2 * e) / Math.PI) * RN * U;
      ctx.strokeStyle = 'rgba(30,41,59,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      D.text(cx, cy - r - 4, lab, { size: 11.5, weight: 800, color: '#1e293b', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    });
    D.text(cx, cy + 6, 'H', { size: 22, weight: 900, color: '#7f1d1d', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
    D.text(A.x + 24, A.y + 62, 'L', { size: 20, weight: 900, color: '#1e3a8a', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
    // 단면선
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(cx - U, cy); ctx.lineTo(cx + U, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 색 막대
    const kx = A.x + 14, ky = A.y + A.h - 22, kw = 150;
    const kg = ctx.createLinearGradient(kx, 0, kx + kw, 0); kg.addColorStop(0, '#2563eb'); kg.addColorStop(0.5, '#f1f5f9'); kg.addColorStop(1, '#dc2626');
    ctx.fillStyle = kg; rr(kx, ky, kw, 10, 5).fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; rr(kx, ky, kw, 10, 5).stroke();
    D.text(kx, ky - 4, '낮음 −0.5', { size: 11, weight: 800, color: '#1e3a8a', align: 'left' }); D.text(kx + kw, ky - 4, '+0.5 m 높음', { size: 11, weight: 800, color: '#991b1b', align: 'right' });
    // 탐침 A·B (지도)
    ['a', 'b'].forEach((k) => {
      const p = probePos(g, k, 'map'), col = k === 'a' ? '#dc2626' : '#2563eb';
      D.sphere(p.x, p.y, 11, col, { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: k.toUpperCase(), textScale: 1.0 });
      if (!S.probeSeen) D.ring(p.x, p.y, 17, t, { color: col, speed: 1.1, width: 2 });
    });
    // ----- B: 단면 그래프
    card(B, '📈 단면선을 따라 본 해수면 높이');
    const bgc = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); bgc.addColorStop(0, '#f1f5f9'); bgc.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgc; rr(P.x, P.y, P.w, P.h, 6).fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [-0.5, 0, 0.5].forEach((e) => { ctx.strokeStyle = e === 0 ? '#94a3b8' : '#cbd5e1'; ctx.setLineDash(e === 0 ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(P.x, profY(g, e)); ctx.lineTo(P.x + P.w, profY(g, e)); ctx.stroke(); ctx.setLineDash([]); D.text(P.x - 6, profY(g, e) + 4.5, (e > 0 ? '+' : e < 0 ? '−' : '') + Math.abs(e).toFixed(1), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(P.x - 6, P.y - 8, '높이(m)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
    ctx.beginPath(); ctx.moveTo(P.x, P.y + P.h);
    for (let i = 0; i <= 80; i++) { const xn = -1 + (2 * i) / 80; ctx.lineTo(profX(g, xn), profY(g, etaX(xn) * S.mapA)); }
    ctx.lineTo(P.x + P.w, P.y + P.h); ctx.closePath();
    const wg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); wg.addColorStop(0, 'rgba(56,189,248,.65)'); wg.addColorStop(1, 'rgba(14,116,144,.35)'); ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const xn = -1 + (2 * i) / 80; const x = profX(g, xn), y = profY(g, etaX(xn) * S.mapA); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    D.text(P.x, P.y + P.h + 16, '서', { size: 12.5, weight: 800, color: '#475569', align: 'left' }); D.text(P.x + P.w, P.y + P.h + 16, '동', { size: 12.5, weight: 800, color: '#475569', align: 'right' });
    D.text(P.x + P.w / 2, P.y + P.h + 16, '가장자리 ← 중앙 → 가장자리', { size: 11.5, weight: 700, color: '#64748b' });
    ['a', 'b'].forEach((k) => {
      const p = probePos(g, k, 'prof'), col = k === 'a' ? '#dc2626' : '#2563eb', e = etaX(k === 'a' ? S.pa : S.pb);
      D.dashedLine(p.x, p.y, p.x, P.y + P.h, { color: rgba(col, 0.7), width: 2, dash: [4, 4] });
      D.sphere(p.x, p.y, 10, col, { gloss: false, outline: '#fff', outlineWidth: 2.5, shadow: true, text: k.toUpperCase(), textScale: 1.0 });
    });
    const ea = etaX(S.pa), eb = etaX(S.pb);
    D.label(B.x + B.w * 0.27, B.y + B.h - 52 * FS, 'A  ' + (ea >= 0 ? '+' : '−') + Math.abs(ea).toFixed(2) + ' m', { bg: '#dc2626', size: 13.5 });
    D.label(B.x + B.w * 0.73, B.y + B.h - 52 * FS, 'B  ' + (eb >= 0 ? '+' : '−') + Math.abs(eb).toFixed(2) + ' m', { bg: '#2563eb', size: 13.5 });
    D.text(B.x + B.w / 2, B.y + B.h - 14, 'A와 B의 높이 차 Δη를 구해요 (A − B)', { size: 12.5, weight: 800, color: '#334155' });
    // ----- C: 원인 사슬 카드
    const C = rcOf('ssh').C;
    const cards = [['🌬️', '무역풍과 편서풍', '아열대 해역에 바람이 불어요'], ['🌀', '에크만 수송 수렴', '약 30°N 쪽으로 표층수가 모여요'], ['🌊', '중앙 해수면 상승', '중앙이 가장자리보다 약 1 m 높아요']];
    const vert = C.h > C.w * 0.4, cw = vert ? C.w - 20 : (C.w - 2 * 38 - 20) / 3, ch = vert ? (C.h - 2 * 28 - 14) / 3 : C.h - 18;
    cards.forEach((cd, i) => {
      const tk = clamp(S.chainT * 3.2 - i * 0.95, 0, 1); if (tk <= 0) return;
      const x = vert ? C.x + 10 : C.x + 10 + i * (cw + 38), y = vert ? C.y + 7 + i * (ch + 28) : C.y + 9 + (1 - smooth(tk)) * 14;
      ctx.save(); ctx.globalAlpha = smooth(tk);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, cw, ch, 14).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = i === 2 ? '#dc2626' : '#0ea5e9'; ctx.lineWidth = 2; rr(x, y, cw, ch, 14).stroke();
      D.text(x + 30, y + ch / 2 + 10 * FS, cd[0], { size: 28, weight: 700 });
      D.text(x + 56, y + ch / 2 - 4, '원인 ' + (i + 1) + ' · ' + cd[1], { size: 14, weight: 900, color: '#1e3a8a', align: 'left' });
      drawWrapL(x + 56, y + ch / 2 + 14 * FS, cd[2], cw - 66, 12.5, '#475569');
      ctx.restore();
      if (i < 2) { const ax = vert ? x + cw / 2 : x + cw + 4, ay = vert ? y + ch + 4 : y + ch / 2; arrowS(ax, ay, vert ? ax : ax + 30, vert ? ay + 20 : ay, { color: '#0ea5e9', width: 4, head: 10, alpha: smooth(tk) }); }
    });
  }
  function drawWrapL(x, y, text, maxW, size, color) { drawWrap(x, y, text, maxW, size, { color, align: 'left' }); }
  function readSsh() {
    setReadouts(['A 지점 높이', (etaX(S.pa) >= 0 ? '+' : '−') + Math.abs(etaX(S.pa)).toFixed(2) + ' m', 'B 지점 높이', (etaX(S.pb) >= 0 ? '+' : '−') + Math.abs(etaX(S.pb)).toFixed(2) + ' m', '높이 차 Δη', (game && game.free) || S.showD ? (etaX(S.pa) - etaX(S.pb)).toFixed(2) + ' m' : '직접 계산해요']);
  }
  /* 포인터: 탐침 A, B 끌기 */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'ssh') return false;
      const g = sshGeom(); let best = 34, hit = null;
      ['a', 'b'].forEach((k) => ['map', 'prof'].forEach((w) => { const q = probePos(g, k, w), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < best) { best = d; hit = { k, w }; } }));
      if (!hit) return false; S.drag = hit; S.probeSeen = true; mvProbe(p); return true;
    },
    move(p) { if (S.drag) mvProbe(p); },
    up() { S.drag = null; },
    hover(p) { if (S.mode !== 'ssh') return ''; const g = sshGeom(); return ['a', 'b'].some((k) => ['map', 'prof'].some((w) => { const q = probePos(g, k, w); return Math.hypot(p.x - q.x, p.y - q.y) < 30; })) ? 'grab' : ''; },
  });
  function mvProbe(p) {
    const g = sshGeom(), d = S.drag; if (!d) return;
    const xn = d.w === 'map' ? (p.x - g.cx) / g.U : ((p.x - g.P.x) / g.P.w) * 2 - 1;
    S[d.k === 'a' ? 'pa' : 'pb'] = clamp(Math.round(clamp(xn, -1, 1) * 100) / 100, -1, 1);
  }

  /* ======================================================
     장면 2: 압력 경도력 — 정역학 균형과 같은 깊이의 압력 차
     ====================================================== */
  const pAt = (z, eta) => RHO * G * (z + eta);                  // 정역학 압력(대기압 제외), Pa
  function tankGeom() {
    const A = rcOf('tank').A, kE = PHONE ? 30 : 40;
    const g = { A, tx0: A.x + 30, tx1: A.x + A.w - 30, rim: A.y + (PHONE ? 78 : 88), ym: A.y + (PHONE ? 130 : 148), kE };
    g.bot = A.y + A.h - 40; g.kz = (g.bot - g.ym - 12) / 200; g.xc = (g.tx0 + g.tx1) / 2;
    return g;
  }
  function tankStep(dt) {
    S.zV = approach(S.zV, S.z, dt, 12);
    S.barrier = approach(S.barrier, S.relGo ? 1 : 0, dt, 4.5);
    if (S.relGo && S.barrier > 0.6) S.rel = approach(S.rel, 1, dt, 1.25); else if (!S.relGo) S.rel = approach(S.rel, 0, dt, 3);
    if (S.rel > 0.995) S.rel = 1;
    const cur = S.dEta * (1 - S.rel), g = tankGeom();
    if (S.relGo && S.barrier > 0.6 && cur > 0.02 && !RM) {
      S.fl.push({ x: g.xc - 100 + Math.random() * 40, y: g.ym + 10 + Math.random() * (g.bot - g.ym - 24), a: 0, v: 40 + cur * 70 });
    }
    S.fl.forEach((p) => { p.a += dt; p.x += p.v * dt; });
    S.fl = S.fl.filter((p) => p.a < 1.3 && S.fl.length < 70);
  }
  function drawTank(t, dt) {
    const { A, B } = rcOf('tank'), g = tankGeom();
    tankStep(dt);
    const cur = S.dEta * (1 - S.rel), eA = cur / 2, eB = -cur / 2;
    ocean(A, '#eef4fa', '#dfe9f3');
    D.text(A.x + 14, A.y + 22 * FS, '🧪 수조 단면 (회전하지 않는 수조)', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const yA = g.ym - g.kE * eA, yB = g.ym - g.kE * eB;
    // 수조 안쪽(그림자 있는 유리)
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(g.tx0 - 8, g.rim - 14, g.tx1 - g.tx0 + 16, g.bot - g.rim + 22, 10).fill(); }, { blur: 8, y: 3 });
    // 물
    ctx.save(); ctx.beginPath(); ctx.rect(g.tx0, g.rim - 12, g.tx1 - g.tx0, g.bot - g.rim + 12); ctx.clip();
    const wg = ctx.createLinearGradient(0, g.ym - 40, 0, g.bot); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(1, '#2f6ea3');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.tx0, g.bot); ctx.lineTo(g.tx0, yA); ctx.lineTo(g.xc - 22, yA); ctx.lineTo(g.xc + 22, yB); ctx.lineTo(g.tx1, yB); ctx.lineTo(g.tx1, g.bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.tx0, yA); ctx.lineTo(g.xc - 22, yA); ctx.lineTo(g.xc + 22, yB); ctx.lineTo(g.tx1, yB); ctx.stroke();
    // 흐름 입자
    S.fl.forEach((p) => { const a = Math.sin((p.a / 1.3) * Math.PI); ctx.globalAlpha = 0.85 * a; arrowS(p.x, p.y, p.x + 20, p.y, { color: '#ffffff', width: 3, head: 7 }); }); ctx.globalAlpha = 1;
    // 깊이 눈금선
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    [50, 100, 150, 200].forEach((z) => { ctx.beginPath(); ctx.moveTo(g.tx0, g.ym + z * g.kz); ctx.lineTo(g.tx1, g.ym + z * g.kz); ctx.stroke(); });
    ctx.restore();
    // 평균 해수면, 깊이 눈금
    D.dashedLine(g.tx0 - 6, g.ym, g.tx1 + 6, g.ym, { color: '#475569', width: 1.5, dash: [5, 5] });
    D.text(g.tx1 - 8, g.ym - 5, '평균 해수면 0 m', { size: 11.5, weight: 800, color: '#475569', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    [0, 50, 100, 150, 200].forEach((z) => { D.text(g.tx0 + 6, g.ym + z * g.kz - 4, z + ' m', { size: 11, weight: 700, color: z === 0 ? 'rgba(0,0,0,0)' : '#e0f2fe', align: 'left' }); });
    // 칸막이
    const lift = S.barrier * 78;
    if (S.barrier < 0.98) {
      ctx.save(); ctx.globalAlpha = 1 - S.barrier * 0.85; ctx.beginPath(); ctx.rect(g.tx0 - 8, A.y + 30, g.tx1 - g.tx0 + 16, g.bot - A.y - 22); ctx.clip();
      D.shadow(() => { ctx.fillStyle = '#94a3b8'; rr(g.xc - 5, g.rim - 22 - lift, 10, g.bot - g.rim + 22, 3).fill(); }, { blur: 4, y: 2 });
      ctx.restore();
    }
    // 수조 테두리
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(g.tx0 - 5, g.rim - 12); ctx.lineTo(g.tx0 - 5, g.bot + 4); ctx.lineTo(g.tx1 + 5, g.bot + 4); ctx.lineTo(g.tx1 + 5, g.rim - 12); ctx.stroke();
    // 탐침 두 점 (같은 깊이)
    const yp = g.ym + S.zV * g.kz, xa = g.xc - 90, xb = g.xc + 90;
    [[xa, yA, 'A', '#dc2626', eA], [xb, yB, 'B', '#2563eb', eB]].forEach(([x, ys, nm, col]) => {
      ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, ys + 4); ctx.lineTo(x, yp); ctx.stroke(); ctx.lineCap = 'butt';
      D.sphere(x, yp, 11, col, { gloss: false, outline: '#fff', outlineWidth: 2.5, text: nm, textScale: 1.0 });
    });
    D.dashedLine(xa + 14, yp, xb - 14, yp, { color: '#0f172a', width: 2, dash: [4, 4] });
    D.label(g.xc, yp - 14, '같은 깊이 ' + S.z + ' m', { bg: '#334155', size: 12 });
    D.text(g.tx0 + 4, g.rim - 26, '※ 해수면 높이 차는 크게 과장한 그림이에요 (실제로는 수심의 약 1 %)', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
    // 압력 경도력 화살표
    const show = S.showP || (game && game.free), dp = pAt(S.z, eA) - pAt(S.z, eB);
    if (show && dp > 1) { const L = 70 + 90 * clamp(dp / 2.1e4, 0, 1); arrowS(g.xc - L / 2, g.bot - 26, g.xc + L / 2, g.bot - 26, { color: '#f97316', width: 7, head: 16 }); D.label(g.xc, g.bot - 46, '압력 경도력 (높은 쪽 → 낮은 쪽)', { bg: '#c2410c', size: 12.5 }); }
    if (S.relGo && S.rel > 0.97) D.label(g.xc, g.rim + 34, '수면이 평평해지면 압력 차가 사라져요', { bg: '#15803d', size: 13 });
    // ----- B: 수치
    card(B, '📏 정역학 압력');
    const horiz = B.w > B.h;
    const x0 = B.x + 14, ww = B.w - 28; let y = B.y + 52 * FS;
    D.text(x0, y, 'p = ρ g h', { size: 16, weight: 900, color: '#1e3a8a', align: 'left' });
    D.text(x0, y + 20 * FS, 'ρ = 1025 kg/m³, g = 9.8 m/s²', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    y += 54 * FS;
    D.text(x0, y, '깊이 z = ' + S.z + ' m', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(x0, y + 24 * FS, 'ρ g z = ' + (show ? sci(pAt(S.z, 0), 2) + ' Pa' : '?'), { size: 14, weight: 800, color: '#0f766e', align: 'left' });
    y += 62 * FS;
    D.text(x0, y, 'Δη = η_A − η_B = ' + fN(cur, 2) + ' m', { size: 14, weight: 800, color: '#334155', align: 'left' });
    y += 30 * FS;
    D.text(x0, y, 'p_A = ' + (show ? sci(pAt(S.z, eA), 3) : '?') + ' Pa', { size: 13.5, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(x0, y + 22 * FS, 'p_B = ' + (show ? sci(pAt(S.z, eB), 3) : '?') + ' Pa', { size: 13.5, weight: 800, color: '#1d4ed8', align: 'left' });
    y += 54 * FS;
    D.text(x0, y, 'Δp = p_A − p_B = ρ g Δη', { size: 14, weight: 900, color: '#9a3412', align: 'left' });
    D.text(x0, y + 22 * FS, '= ' + (show ? sci(dp, 2) + ' Pa' : '?'), { size: 14.5, weight: 900, color: '#9a3412', align: 'left' });
    // Δp 막대
    const by = y + 40 * FS; ctx.fillStyle = '#e2e8f0'; rr(x0, by, ww, 16, 8).fill();
    S.dpV = approach(S.dpV == null ? dp : S.dpV, dp, dt, 9);
    const bw = show ? ww * clamp(S.dpV / 2.1e4, 0, 1) : 0; if (bw > 0.5) { ctx.fillStyle = '#f97316'; rr(x0, by, bw, 16, 8).fill(); }
    D.text(x0, by + 32, '0', { size: 11.5, weight: 700, color: '#64748b', align: 'left' }); D.text(x0 + ww, by + 32, '2×10⁴ Pa', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    drawWrap(B.x + B.w / 2, by + 56 * FS, '압력은 해수면이 높은 쪽이 커요 → 압력 경도력은 높은 쪽에서 낮은 쪽을 향해요', ww, 12.5, { color: '#334155' });
  }
  function readTank() {
    const cur = S.dEta * (1 - S.rel);
    setReadouts(['기준 깊이 z', S.z + ' m', '해수면 높이 차 Δη', fN(cur, 2) + ' m', '압력 차 Δp', S.showP || (game && game.free) ? sci(pAt(S.z, cur / 2) - pAt(S.z, -cur / 2), 2) + ' Pa' : '직접 계산해요']);
  }

  /* ======================================================
     장면 3: 힘의 균형 — 회전 수조에서 해류는 등수위선을 따라 흘러요
     ====================================================== */
  const TS = 16461;                    // 화면의 1초 = 실제 약 4.6시간 (회전 효과를 빨리 보려고 시간을 늘린 값)
  const KPX = 400;                     // 속도 1 m/s = 초당 400 px
  const RDAMP = 0.7;
  const WPHYS = 1e6;                   // 그림 속 바다의 폭 1000 km
  const ACC_PX = 90;                   // 가속도 1×10⁻⁵ m/s² = 90 px
  function rotGeom() {
    const A = rcOf('rot').A, P = { x: A.x + 16, y: A.y + 46, w: A.w - 32, h: A.h - 96 };
    return { A, P };
  }
  function pgfOf() { return (G * S.dEta2V) / WPHYS; }                  // 압력 경도력(단위 질량당), m/s²
  function vgOf() { return pgfOf() / fOf(S.lat2V); }                     // 지형류 유속(크기), m/s
  function newParcels() {
    const { P } = rotGeom();
    S.parcels = [0, 1, 2, 3, 4].map((i) => ({ x: P.x + P.w * 0.5, y: P.y + P.h * (0.1 + 0.18 * i), u: 0, v: 0, age: 0, tr: [[]], out: false }));
    S.rtime = 0; S.geoT = 0; S.geo = false;
  }
  function rotStep(dt) {
    S.dEta2V = approach(S.dEta2V, S.dEta2, dt, 10); S.lat2V = approach(S.lat2V, S.lat2, dt, 10);
    const { P } = rotGeom();
    if (!S.parcels.length) newParcels();
    S.rtime += dt;
    if (S.rtime > 9) newParcels();
    const f = S.rot ? fOf(S.lat2V) * TS : 0, ap = pgfOf() * TS, vg = S.rot ? -pgfOf() / fOf(S.lat2V) : 0;
    const n = Math.ceil(dt / 0.01), h = dt / n;
    S.parcels.forEach((p, idx) => {
      for (let k = 0; k < n; k++) {
        let du, dv;
        if (S.rot) { du = ap + f * p.v - RDAMP * p.u; dv = -f * p.u - RDAMP * (p.v - vg); } else { du = ap - RDAMP * p.u; dv = -RDAMP * p.v; }
        p.u += du * h; p.v += dv * h; p.age += h;
        p.x += p.u * KPX * h; p.y -= p.v * KPX * h;
        if (p.y > P.y + P.h) { p.y -= P.h; p.tr.push([]); }
        if (p.y < P.y) { p.y += P.h; p.tr.push([]); }
        if (p.x > P.x + P.w - 4) { p.x = P.x + P.w * 0.5; p.u = 0; p.v = 0; p.tr.push([]); p.age = 0; }
      }
      const cur = p.tr[p.tr.length - 1]; cur.push([p.x, p.y]); if (cur.length > 150) cur.shift();
      if (p.tr.length > 4) p.tr.shift();
    });
    // 정상 상태 판정: 가운데 물덩이가 지형류 속도에 충분히 가까운가?
    const L = S.parcels[2], gv = vgOf();
    const ok = S.rot && L.age > 2 && Math.abs(L.u) < 0.05 * gv && Math.abs(-L.v - gv) < 0.05 * gv;
    S.geo = ok; S.geoT = ok ? S.geoT + dt : 0;
  }
  function drawRot(t, dt) {
    const { A, B } = rcOf('rot'), { P } = rotGeom();
    rotStep(dt);
    ocean(A, '#eef4fa', '#dfe9f3');
    D.text(A.x + 14, A.y + 22 * FS, '🔭 위에서 본 바다 (북반구) · 폭 1000 km · ' + (S.rot ? '회전 수조 켜짐' : '회전 없음'), { size: 13.5, weight: 800, color: '#1e3a8a', align: 'left' });
    D.text(A.x + A.w - 14, A.y + 22 * FS, 'N ↑', { size: 13.5, weight: 900, color: '#1e3a8a', align: 'right' });
    // 해수면 높이 색 (서쪽이 높고 동쪽이 낮아요)
    const gr = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0); gr.addColorStop(0, '#f87171'); gr.addColorStop(0.5, '#f1f5f9'); gr.addColorStop(1, '#60a5fa');
    ctx.fillStyle = gr; rr(P.x, P.y, P.w, P.h, 10).fill();
    ctx.save(); rr(P.x, P.y, P.w, P.h, 10).clip();
    // 등수위선(세로)
    for (let i = 1; i < 4; i++) {
      const x = P.x + (P.w * i) / 4, e = (S.dEta2V / 2) * (1 - (2 * i) / 4);
      ctx.strokeStyle = 'rgba(30,41,59,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke(); ctx.setLineDash([]);
      D.text(x, P.y + P.h - 8, (e > 0.0001 ? '+' : e < -0.0001 ? '−' : '') + Math.abs(e).toFixed(2) + ' m', { size: 11.5, weight: 800, color: '#1e293b', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    }
    // 자취
    S.parcels.forEach((p) => {
      p.tr.forEach((seg) => {
        if (seg.length < 2) return; const n = seg.length, ch = 10;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let s0 = 0; s0 < n - 1; s0 += ch) { const s1 = Math.min(n - 1, s0 + ch); ctx.strokeStyle = 'rgba(14,116,144,' + ((s1 / n) * 0.85).toFixed(3) + ')'; ctx.lineWidth = 3 + 3 * (s1 / n); ctx.beginPath(); ctx.moveTo(seg[s0][0], seg[s0][1]); for (let i = s0 + 1; i <= s1; i++) ctx.lineTo(seg[i][0], seg[i][1]); ctx.stroke(); }
      });
    });
    S.parcels.forEach((p) => ball(p.x, p.y, 8, '#0ea5e9', true));
    // 힘 화살표 (가운데 물덩이의 현재 값을 고정된 그림 상자에 그려요)
    const L = S.parcels[2], pg = pgfOf(), f = S.rot ? fOf(S.lat2V) : 0, cor = [f * L.v, -f * L.u];     // (동, 북) 성분
    const Vm = Math.hypot(L.u, L.v), sc = 50 / 1e-5;
    ctx.restore();
    const DB = { x: P.x + 10, y: P.y + 40, w: 190, h: 160 };
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(DB.x, DB.y, DB.w, DB.h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(DB.x + DB.w / 2, DB.y + 18, '가운데 물덩이의 힘 (북반구)', { size: 12, weight: 800, color: '#334155' });
    const ox = DB.x + DB.w / 2, oy = DB.y + 70;
    D.sphere(ox, oy, 6, '#0ea5e9', { gloss: true });
    arrowS(ox + 7, oy, ox + 7 + pg * sc, oy, { color: '#dc2626', width: 6, head: 13 });
    if (S.rot) arrowS(ox - 7, oy, ox - 7 + cor[0] * sc, oy - cor[1] * sc, { color: '#f97316', width: 6, head: 13 });
    if (Vm > 0.003) arrowS(ox, oy + 8, ox + L.u * 170, oy + 8 - L.v * 170, { color: '#15803d', width: 4.5, head: 11 });
    D.text(DB.x + DB.w - 8, oy - 10, '압력 경도력', { size: 11.5, weight: 900, color: '#b91c1c', align: 'right' });
    if (S.rot) D.text(DB.x + 8, oy - 10, '전향력', { size: 11.5, weight: 900, color: '#c2410c', align: 'left' });
    if (Vm > 0.003) D.text(DB.x + DB.w - 8, DB.y + DB.h - 12, '해류 V (초록)', { size: 11.5, weight: 900, color: '#15803d', align: 'right' });
    if (S.geo) { D.check(DB.x + 20, DB.y + DB.h - 22, 12, 1); D.text(DB.x + 38, DB.y + DB.h - 17, '균형!', { size: 13, weight: 900, color: '#15803d', align: 'left' }); }
    D.label(P.x + 30, P.y + 18, 'H 높음(서)', { bg: '#dc2626', size: 12, pad: 6, align: 'left' });
    D.label(P.x + P.w - 30, P.y + 18, '낮음(동) L', { bg: '#2563eb', size: 12, pad: 6, align: 'right' });
    D.text(A.x + A.w / 2, A.y + A.h - 22 * FS, S.rot ? '회전하는 바다: 물이 오른쪽으로 휘며 등수위선과 나란히 흘러요' : '회전하지 않는 바다: 물이 높은 쪽에서 낮은 쪽으로 곧바로 흘러요', { size: 13, weight: 800, color: '#334155' });
    // ----- B 패널
    card(B, '⚖️ 힘과 유속');
    const x0 = B.x + 14, ww = B.w - 28; let y = B.y + 50 * FS;
    const gv = vgOf(), angle = Vm > 0.001 ? Math.atan2(Math.abs(L.u), Math.abs(L.v)) / DEG : 0;
    D.label(B.x + B.w / 2, y, S.rot ? '🌀 회전 수조' : '⏸️ 회전 없음', { bg: S.rot ? '#7c3aed' : '#64748b', size: 13.5, pad: 12 });
    y += 38 * FS;
    D.text(x0, y, '압력 경도력  g·Δη/Δx', { size: 13.5, weight: 800, color: '#b91c1c', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(x0, y + 8, ww, 14, 7).fill(); ctx.fillStyle = '#dc2626'; rr(x0, y + 8, Math.max(2, ww * clamp(pg / 1.5e-5, 0, 1)), 14, 7).fill();
    D.text(x0, y + 42 * FS, sci(pg, 2) + ' m/s²', { size: 14, weight: 900, color: '#b91c1c', align: 'left' });
    y += 62 * FS;
    D.text(x0, y, '전향력  f·V', { size: 13.5, weight: 800, color: '#c2410c', align: 'left' });
    const cv = Math.hypot(cor[0], cor[1]);
    ctx.fillStyle = '#e2e8f0'; rr(x0, y + 8, ww, 14, 7).fill(); ctx.fillStyle = '#f97316'; rr(x0, y + 8, Math.max(2, ww * clamp(cv / 1.5e-5, 0, 1)), 14, 7).fill();
    D.text(x0, y + 42 * FS, S.rot ? sci(cv, 2) + ' m/s²' : '0 (회전 없음)', { size: 14, weight: 900, color: '#c2410c', align: 'left' });
    y += 66 * FS;
    D.text(x0, y, '해류의 속력  V = ' + fN(Vm, 3) + ' m/s', { size: 13.5, weight: 800, color: '#15803d', align: 'left' });
    D.text(x0, y + 22 * FS, S.rot ? '정상 상태 (g/f)(Δη/Δx) = ' + fN(gv, 3) + ' m/s' : '정상 상태 없음: 계속 높은 곳 → 낮은 곳', { size: 12, weight: 700, color: '#475569', align: 'left' });
    y += 50 * FS;
    D.text(x0, y, '흐름과 등수위선의 각도  ' + (Vm > 0.001 ? Math.round(angle) + '°' : '—'), { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    D.text(x0, y + 22 * FS, S.rot ? '0°에 가까울수록 나란히 흘러요' : '90° = 등수위선을 곧바로 가로질러요', { size: 12, weight: 700, color: '#475569', align: 'left' });
    S.angle = angle;
  }
  function readRot() {
    const L = S.parcels[2] || { u: 0, v: 0 };
    setReadouts(['위도', S.lat2 + '°N', '해수면 경사 Δη/Δx', fN(S.dEta2, 1) + ' m / 1000 km', '해류 V', fN(Math.hypot(L.u, L.v), 3) + ' m/s']);
  }

  /* ======================================================
     장면 4: 유속 계산 — v = (g/f)(Δη/Δx)
     ====================================================== */
  const vCalc = (eta, dxKm, lat) => (G * (eta / (dxKm * 1000))) / fOf(lat);
  const fmtV = (v) => (v >= 0.2 ? fN(v, 1) : fN(v, 2));
  const SCEN = { kuro: { name: '쿠로시오형 서안 해류', eta: 0.8, dx: 100, lat: 33 }, gyre: { name: '아열대 순환 내부', eta: 1.0, dx: 1500, lat: 30 } };
  const curV = () => vCalc(S.eta4, S.dx4, S.lat4);
  function calcStep(dt) {
    if (!S.gp.length) for (let i = 0; i < 72; i++) S.gp.push({ r: 0.12 + Math.random() * 0.84, th: Math.random() * TAU });
    const { A } = rcOf('calc'), Rr = Math.min(A.w, A.h) / 2 - 36, v = curV();
    S.gp.forEach((p) => { p.th += ((v * 120) / Math.max(20, p.r * Rr)) * dt; if (p.th > TAU) p.th -= TAU; });
  }
  function drawCalc(t, dt) {
    const { A, B } = rcOf('calc');
    calcStep(dt);
    const v = curV(), f = fOf(S.lat4), gr = S.eta4 / (S.dx4 * 1000);
    card(A, '🔄 아열대 순환 (북반구, 위에서 본 모습)');
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 12, Rr = Math.min(A.w, A.h) / 2 - 36;
    const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, Rr * 1.05); rg.addColorStop(0, '#fecaca'); rg.addColorStop(0.5, '#f1f5f9'); rg.addColorStop(1, '#bfdbfe');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, Rr * 1.05, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,41,59,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
    [0.33, 0.55, 0.77].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy, Rr * k, 0, TAU); ctx.stroke(); }); ctx.setLineDash([]);
    S.gp.forEach((p) => { const x = cx + Math.cos(p.th) * p.r * Rr, y = cy + Math.sin(p.th) * p.r * Rr; ball(x, y, 4.2, '#0e7490', true); });
    D.text(cx, cy + 8, 'H', { size: 24, weight: 900, color: '#7f1d1d', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
    D.text(cx + Rr * 0.92, cy - Rr * 0.86, 'L', { size: 20, weight: 900, color: '#1e3a8a', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
    // 균형 화살표 (동쪽 지점)
    const px = cx + Rr * 0.56, py = cy;
    arrowS(px, py, px + 38, py, { color: '#dc2626', width: 6, head: 12 });
    arrowS(px, py, px - 38, py, { color: '#f97316', width: 6, head: 12 });
    arrowS(px, py, px, py + 36, { color: '#15803d', width: 5, head: 11 });
    D.label(clamp(px + 24, A.x + 60, A.x + A.w - 60), py - 20, '압력 경도력', { bg: '#dc2626', size: 12, pad: 6 });
    D.label(clamp(px - 24, A.x + 60, A.x + A.w - 60), py + 30, '전향력', { bg: '#c2410c', size: 12, pad: 6, align: 'right' });
    D.label(px + 8, py + 52, '해류', { bg: '#15803d', size: 12, pad: 6, align: 'left' });
    D.label(cx, A.y + A.h - 22 * FS, '시계 방향으로 흘러요 (높은 곳이 오른쪽)', { bg: '#334155', size: 13 });
    // ----- B
    card(B, '🧮 지형류 속도 계산');
    const x0 = B.x + 16, ww = B.w - 32; let y = B.y + 52 * FS;
    const sc = S.sc === 'kuro' ? SCEN.kuro.name : S.sc === 'gyre' ? SCEN.gyre.name : '직접 설정한 해역';
    D.label(B.x + B.w / 2, y - 4, sc, { bg: '#0369a1', size: 13.5, pad: 12 });
    y += 30 * FS;
    D.text(B.x + B.w / 2, y, 'g·(Δη/Δx) = f·v   →   v = (g/f)·(Δη/Δx)', { size: 14.5, weight: 900, color: '#1e3a8a' });
    y += 28 * FS;
    const show = S.showV || (game && game.free);
    const lines = [
      ['g = 9.8 m/s²', '#334155'],
      ['Δη = ' + fN(S.eta4, 1) + ' m,  Δx = ' + S.dx4 + ' km = ' + sci(S.dx4 * 1000, 1) + ' m', '#334155'],
      ['Δη/Δx = ' + sci(gr, 2), '#334155'],
      ['f = 2Ω sin' + S.lat4 + '° = ' + sci(f, 2) + ' s⁻¹', '#9a3412'],
      ['v = 9.8 × ' + sci(gr, 2) + ' / ' + sci(f, 2), '#0f766e'],
      ['  = ' + (show ? fmtV(v) + ' m/s' : '?'), '#0f766e'],
    ];
    lines.forEach((l, i) => D.text(x0, y + i * 23 * FS, l[0], { size: i >= 4 ? 14.5 : 13.5, weight: i >= 4 ? 900 : 700, color: l[1], align: 'left' }));
    y += lines.length * 23 * FS + 8;
    D.text(x0, y, '※ 적도 부근(f → 0)에서는 이 식을 쓸 수 없어요', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    y += 20 * FS;
    // 막대 비교
    const bars = [['쿠로시오형', vCalc(0.8, 100, 33), '#0ea5e9'], ['아열대 내부', vCalc(1, 1500, 30), '#14b8a6'], ['같은 경사, 60°N', vCalc(1, 1500, 60), '#8b5cf6']];
    if (S.sc === 'free') bars.push(['내 설정', v, '#f59e0b']);
    D.text(x0, y + 8, '유속 비교 (m/s)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    const showB = S.showBars || (game && game.free);
    const bh = Math.min(26 * FS, (B.y + B.h - y - 30) / bars.length - 6);
    bars.forEach((b, i) => {
      const by = y + 22 + i * (bh + 8), lw = ww * 0.36, bx = x0 + lw;
      D.text(x0, by + bh * 0.72, b[0], { size: 12, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(bx, by, ww - lw, bh, 6).fill();
      if (showB) { const bw = (ww - lw) * clamp(b[1] / 1.2, 0, 1); if (bw > 0.3) { ctx.fillStyle = b[2]; rr(bx, by, bw, bh, 6).fill(); } D.text(bx + Math.max(bw, 0) + 6, by + bh * 0.72, fmtV(b[1]), { size: 12.5, weight: 900, color: '#334155', align: 'left' }); }
      else D.text(bx + 8, by + bh * 0.72, '?', { size: 12.5, weight: 800, color: '#94a3b8', align: 'left' });
    });
    D.text(x0 + ww, y + 8, '0 ~ 1.2', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
  }
  function readCalc() {
    const show = S.showV || (game && game.free);
    setReadouts(['해수면 경사 Δη/Δx', fN(S.eta4, 1) + ' m / ' + S.dx4 + ' km', '위도 · f (s⁻¹)', S.lat4 + '°N · ' + sci(fOf(S.lat4), 2), '지형류 유속 v', show ? fmtV(curV()) + ' m/s' : '직접 계산해요']);
  }

  /* ======================================================
     입력 도구 · 컨트롤
     ====================================================== */
  const stpD = makeStepper($('#stpD'), { min: 0, max: 2, step: 0.1, value: 0, dec: 1, unit: 'm' });
  const stpP = makeStepper($('#stpP'), { min: 0, max: 3, step: 0.1, value: 0, dec: 1, unit: '×10⁶ Pa' });
  const stpDp = makeStepper($('#stpDp'), { min: 0, max: 3, step: 0.1, value: 0, dec: 1, unit: '×10⁴ Pa' });
  const stpV = makeStepper($('#stpV'), { min: 0, max: 3, step: 0.1, value: 0, dec: 1, unit: 'm/s' });
  const caseSvg = (hd) => {
    const dir = { W: [0, 0, 1, 0], E: [1, 0, 0, 0], N: [0, 0, 0, 1] }[hd], lp = { W: [6, 30, 54, 30], E: [54, 30, 6, 30], N: [30, 12, 30, 48] }[hd];
    return '<svg width="64" height="52" viewBox="0 0 64 52" style="vertical-align:middle;margin-right:8px;border-radius:8px"><defs><linearGradient id="g' + hd + '" x1="' + dir[0] + '" y1="' + dir[1] + '" x2="' + dir[2] + '" y2="' + dir[3] + '"><stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#60a5fa"/></linearGradient></defs><rect x="2" y="2" width="60" height="48" rx="8" fill="url(#g' + hd + ')" stroke="#94a3b8"/><text x="' + lp[0] + '" y="' + (lp[1] + 5) + '" font-size="13" font-weight="900" fill="#7f1d1d" text-anchor="middle">H</text><text x="' + lp[2] + '" y="' + (lp[3] + 5) + '" font-size="13" font-weight="900" fill="#1e3a8a" text-anchor="middle">L</text><text x="58" y="14" font-size="9" font-weight="800" fill="#334155" text-anchor="end">N↑</text></svg>';
  };
  const selDir = makeSelects($('#selDir'), [
    { id: 'a', label: caseSvg('W') + '높은 곳(H)이 <b>서쪽</b>, 낮은 곳(L)이 동쪽' },
    { id: 'b', label: caseSvg('N') + '높은 곳(H)이 <b>북쪽</b>, 낮은 곳(L)이 남쪽' },
    { id: 'c', label: caseSvg('E') + '높은 곳(H)이 <b>동쪽</b>, 낮은 곳(L)이 서쪽' },
  ], [{ id: 'n', label: '북쪽으로 흘러요' }, { id: 'e', label: '동쪽으로 흘러요' }, { id: 's', label: '남쪽으로 흘러요' }, { id: 'w', label: '서쪽으로 흘러요' }], { a: 's', b: 'w', c: 'n' }, () => { });
  const ordSpeed = makeOrder($('#ordSpeed'), [
    { id: 'gyre', label: '아열대 순환 내부 (1 m / 1500 km, 30°N)' }, { id: 'n60', label: '같은 경사에서 60°N 해역' }, { id: 'kuro', label: '쿠로시오형 서안 해류 (0.8 m / 100 km, 33°N)' },
  ], ['kuro', 'gyre', 'n60'], () => { });
  const ordChain = makeOrder($('#ordChain'), [
    { id: 'c4', label: '압력 경도력(바깥쪽)과 전향력(안쪽)의 균형' }, { id: 'c2', label: '에크만 수송이 약 30°N으로 수렴' }, { id: 'c5', label: '시계 방향의 지형류' },
    { id: 'c1', label: '무역풍과 편서풍' }, { id: 'c3', label: '중앙 해수면이 약 1 m 높아짐' },
  ], ['c1', 'c2', 'c3', 'c4', 'c5'], () => { });

  SciSim.bindRange($('#sZ'), $('#oZ'), (v) => v + ' m', (v) => { S.z = +v; });
  SciSim.bindRange($('#sEta'), $('#oEta'), (v) => fN(v, 2) + ' m', (v) => { S.dEta = +v; S.relGo = false; });
  SciSim.bindRange($('#sEta2'), $('#oEta2'), (v) => fN(v, 1) + ' m', (v) => { S.dEta2 = +v; });
  SciSim.bindRange($('#sLat2'), $('#oLat2'), (v) => v + '°N', (v) => { S.lat2 = +v; });
  SciSim.bindRange($('#sEtaC'), $('#oEtaC'), (v) => fN(v, 1) + ' m', (v) => { S.eta4 = +v; S.sc = 'free'; syncSc(); });
  SciSim.bindRange($('#sDxC'), $('#oDxC'), (v) => v + ' km', (v) => { S.dx4 = +v; S.sc = 'free'; syncSc(); });
  SciSim.bindRange($('#sLatC'), $('#oLatC'), (v) => v + '°N', (v) => { S.lat4 = +v; S.sc = 'free'; syncSc(); });
  const setZ = (v) => { S.z = v; S.zV = v; setSlider($('#sZ'), $('#oZ'), v, (x) => x + ' m'); };
  const setEta = (v) => { S.dEta = v; S.relGo = false; S.rel = 0; setSlider($('#sEta'), $('#oEta'), v, (x) => fN(x, 2) + ' m'); };
  const setEta2 = (v) => { S.dEta2 = v; setSlider($('#sEta2'), $('#oEta2'), v, (x) => fN(x, 1) + ' m'); };
  const setLat2 = (v) => { S.lat2 = v; setSlider($('#sLat2'), $('#oLat2'), v, (x) => x + '°N'); };
  function setSc(k) {
    S.sc = k;
    if (k !== 'free') { const c = SCEN[k]; S.eta4 = c.eta; S.dx4 = c.dx; S.lat4 = c.lat; }
    setSlider($('#sEtaC'), $('#oEtaC'), S.eta4, (x) => fN(x, 1) + ' m'); setSlider($('#sDxC'), $('#oDxC'), S.dx4, (x) => x + ' km'); setSlider($('#sLatC'), $('#oLatC'), S.lat4, (x) => x + '°N');
    syncSc();
  }
  function syncSc() { $$('#scSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.sc === S.sc)); }
  $$('#scSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSc(b.dataset.sc); }));
  function setRot(on) { S.rot = on; $$('#rotSw .opt').forEach((b) => b.classList.toggle('on', (b.dataset.r === '1') === on)); newParcels(); }
  $$('#rotSw .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setRot(b.dataset.r === '1'); }));
  $('#bDrop').addEventListener('click', () => { Sound.click(); newParcels(); });
  function syncRel() { $('#bRel').textContent = S.relGo ? '↺ 칸막이 다시 내리기' : '🧱 칸막이 빼기'; }
  $('#bRel').addEventListener('click', () => {
    Sound.click();
    if (S.relGo) { S.relGo = false; } else if (S.dEta <= 0) { say('먼저 해수면 높이 차 Δη를 0보다 크게 해요', true); return; } else S.relGo = true;
    syncRel();
  });

  const MODE_LABEL = { ssh: '🛰️ 해수면 높이 지도', tank: '🧪 압력 경도력', rot: '⚖️ 회전 수조', calc: '🧮 유속 계산' };
  const FREE_KEYS = { ssh: [], tank: ['sZ', 'sEta', 'bRel'], rot: ['rotSw', 'sEta2', 'sLat2', 'bDrop'], calc: ['scSeg', 'sEtaC', 'sDxC', 'sLatC'] };
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
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); setMode(b.dataset.mode); }));

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear();
    S.pa = 0.6; S.pb = -0.6; S.drag = null; S.mapA = 0; S.chainT = 0; S.probeSeen = false; S.showD = false; stpD.reset();
    setZ(0); setEta(0); S.barrier = 0; S.relGo = false; S.rel = 0; S.showP = false; S.fl = []; stpP.reset(); stpDp.reset(); syncRel(); S.dpV = null;
    setEta2(0.8); S.dEta2V = 0.8; setLat2(30); S.lat2V = 30; setRot(false); S.parcels = []; selDir.reset();
    setSc('kuro'); S.showV = false; S.showBars = false; stpV.reset(); ordSpeed.reset(); ordChain.reset();
    if (li === 0) { setMode('ssh'); setCtl(['stpD']); showHint('지도의 A, B 표시를 끌어서 위치를 바꿔 봐요', 5200); }
    else if (li === 1) { setMode('tank'); setCtl(['sZ']); showHint('수심 슬라이더로 두 점의 깊이를 바꿔 봐요', 5200); }
    else if (li === 2) { setMode('rot'); setCtl(['rotSw', 'sEta2', 'sLat2', 'bDrop']); showHint('회전 수조를 켜고 물덩이의 경로를 봐요', 5200); }
    else { setMode('calc'); setCtl(['scSeg', 'stpV']); showHint('해역을 고르고 계산식에 값을 넣어 봐요', 5200); }
    updateCtl();
  }
  const vKuro = () => Number(fmtV(vCalc(0.8, 100, 33)));
  const levels = [
    {
      title: '해수면 경사: 바다 표면은 평평하지 않아요', short: '해수면 경사', icon: '🛰️', phase: '관찰', features: ['ssh'],
      intro: '<p class="si-q">❓ 탐구 질문: 해수면이 높은 곳의 물은 낮은 곳으로 곧바로 흘러가지 않고, 왜 등수위선을 따라 흐를까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 ‘전향력과 에크만 수송’에서</b> 약 30°N 해역에서는 무역풍과 편서풍 아래의 에크만 수송이 한곳으로 <b>수렴</b>해서 물이 쌓이고 해수면이 높아진다고 했어요. 이번 차시에서는 그 높아진 해수면이 어떤 해류를 만드는지 알아봐요.</div>' +
        '<p>위성 고도계로 해수면 높이를 재면 바다 표면은 <b>평평하지 않아요</b>. 아열대 해역은 중앙이 가장자리보다 약 <b>1 m</b> 높아요. (그림은 예시 자료예요. 실제 자료는 국립해양조사원 누리집에서 볼 수 있어요.)</p>',
      setup() { resetStep(0); },
      recap: '해수면은 평평하지 않아요. 아열대 해역은 에크만 수송이 수렴해서 중앙이 가장자리보다 약 1 m 높아요.',
      summary: '<ul><li>위성 고도계로 재면 해수면은 <b>평평하지 않아요</b>. 아열대 순환 해역은 <b>중앙이 가장자리보다 약 1 m 높아요</b>.</li><li>원인: 무역풍·편서풍 → <b>에크만 수송 수렴</b>(약 30°N) → 중앙에 물이 쌓여 해수면 상승.</li><li>해수면 높이가 같은 점을 이은 선이 <b>등수위선</b>이에요.</li></ul>',
      missions: [
        {
          title: '높이 차 Δη 읽기',
          goal: '탐침 <b>A를 중앙(H)</b>에, <b>B를 가장자리</b>에 놓고, 두 높이의 차 <b>Δη = A − B</b>를 <b>m</b> 단위로 입력해요.',
          hint: 'A와 B를 끌어서 맞춰요. A는 약 +0.5 m, B는 약 −0.5 m쯤에 놓으면 돼요. 두 값의 차를 구해요.',
          setup() { S.showD = false; setMode('ssh'); setCtl(['stpD']); },
          check: () => { const a = etaX(S.pa), b = etaX(S.pb); return a >= 0.45 && b <= -0.45 && Math.abs(stpD.value - (a - b)) <= 0.1 + 1e-9; }, hold: 0.8,
          status: () => { const a = etaX(S.pa), b = etaX(S.pb); return mark(a >= 0.45) + ' A는 중앙(' + (a >= 0 ? '+' : '−') + fN(Math.abs(a), 2) + ' m) · ' + mark(b <= -0.45) + ' B는 가장자리(' + (b >= 0 ? '+' : '−') + fN(Math.abs(b), 2) + ' m) · ' + mark(a >= 0.45 && b <= -0.45 && Math.abs(stpD.value - (a - b)) <= 0.1 + 1e-9) + ' 입력 ' + fN(stpD.value, 1) + ' m'; },
          explain: '중앙은 약 <b>+0.5 m</b>, 가장자리는 약 <b>−0.5 m</b>라서 Δη = 0.5 − (−0.5) = <b>약 1 m</b>예요. 바다 표면이 평평하지 않고 중앙이 볼록하게 솟아 있어요.',
        },
        {
          type: 'quiz', title: '왜 평평하지 않을까?',
          goal: '아열대 해역의 해수면이 중앙에서 <b>높아진</b> 까닭은?',
          setup() { S.showD = true; setMode('ssh'); setCtl([]); },
          choices: ['바람이 만든 에크만 수송이 한곳으로 수렴해서 물이 쌓이기 때문이에요', '달의 인력이 중앙을 더 세게 끌어당기기 때문이에요', '바다 표면은 어디서나 같은 높이예요. 그림이 잘못됐어요', '중앙의 물이 가장자리보다 가벼워서 둥둥 뜨기 때문이에요'],
          answer: 0,
          feedback: ['', '달의 인력은 조석(밀물·썰물)을 만들어요. 아열대 해역의 오래 지속되는 해수면 경사의 원인은 아니에요.', '위성 고도계로 재면 바다 표면은 어디서나 같은 높이가 아니에요. 지도의 색 차이가 높이 차이예요.', '밀도 차도 해수면 높이에 영향을 주지만, 이 해역의 주된 원인은 에크만 수송의 수렴이에요.'],
          explain: '무역풍과 편서풍 아래에서 에크만 수송이 약 30°N으로 <b>수렴</b>하면 물이 쌓여 중앙이 높아져요. 이 높아진 해수면이 다음 단계에서 보는 <b>압력 차</b>를 만들어요.',
        },
      ],
    },
    {
      title: '압력 경도력: 높은 쪽에서 낮은 쪽으로', short: '압력 경도력', icon: '🧪', phase: '모형', features: ['tank'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 해수면이 중앙에서 약 1 m 높다는 것을 확인했어요. 그 높이 차가 물을 밀어내는 힘이 되는 까닭을 수조 모형으로 알아봐요.</div>' +
        '<p>바닷속 압력은 위에 있는 물기둥의 무게로 정해져요(<b>정역학 균형</b>): <b>p = ρ g h</b>. 수심 z에서 압력은 ρ g z예요(대기압은 따로). 해수면이 높은 쪽은 같은 깊이에서도 위의 물기둥이 더 높아서 압력이 더 커요. 이 압력 차 때문에 물은 <b>높은 쪽에서 낮은 쪽으로</b> 밀려요(<b>압력 경도력</b>). 단위 질량당 크기는 g(Δη/Δx)예요.</p>',
      setup() { resetStep(1); },
      recap: '같은 깊이의 압력은 위 물기둥의 무게라서 해수면이 높은 쪽이 커요. 압력 경도력은 해수면이 높은 쪽에서 낮은 쪽을 향하고, 크기는 g(Δη/Δx)예요.',
      summary: '<ul><li><b>정역학 균형</b>: 수심 z의 압력 p = ρ g z. 수심 100 m에서 1025 × 9.8 × 100 ≈ <b>1.0×10⁶ Pa</b>(약 10기압, 대기압 별도).</li><li>같은 깊이 두 점의 압력 차 <b>Δp = ρ g Δη</b>. Δη = 1 m이면 약 <b>1.0×10⁴ Pa</b>(100 hPa).</li><li>수평 <b>압력 경도력</b>(단위 질량당) = −(1/ρ)∂p/∂x = <b>−g ∂η/∂x</b>. 해수면이 높은 쪽 → 낮은 쪽으로 밀어요.</li><li>회전하지 않는 수조에서는 물이 곧바로 흘러 해수면이 평평해져요.</li></ul>',
      missions: [
        {
          title: '수심 100 m의 압력',
          goal: '수심을 <b>100 m</b>에 맞추고, 압력 p = ρ g z를 <b>×10⁶ Pa</b> 단위로 계산해 입력해요.',
          hint: 'p = 1025 × 9.8 × 100 = 1,004,500 Pa예요. ×10⁶ Pa 단위로는 약 1.0이에요.',
          setup() { S.showP = false; setEta(0); S.relGo = false; syncRel(); setZ(0); stpP.reset(); setMode('tank'); setCtl(['sZ', 'stpP']); },
          check: () => S.z === 100 && stpP.value === Number(fN(pAt(100, 0) / 1e6, 1)), hold: 0.8,
          status: () => mark(S.z === 100) + ' 수심 ' + S.z + ' m (목표 100 m) · ' + mark(S.z === 100 && stpP.value === Number(fN(pAt(100, 0) / 1e6, 1))) + ' 입력 ' + fN(stpP.value, 1) + '×10⁶ Pa',
          explain: 'p = ρ g z = 1025 × 9.8 × 100 ≈ <b>1.0×10⁶ Pa</b>예요. 물 10 m마다 약 1기압(약 1×10⁵ Pa)씩 늘어나서 100 m에서는 약 10기압이에요.',
        },
        {
          title: 'Δη = 1 m의 압력 차',
          goal: '해수면 높이 차를 <b>Δη = 1 m</b>로 맞추고, 같은 깊이 두 점의 <b>압력 차 Δp</b>를 <b>×10⁴ Pa</b> 단위로 입력해요.',
          hint: 'Δp = ρ g Δη = 1025 × 9.8 × 1 = 10,045 Pa예요. ×10⁴ Pa 단위로는 약 1.0이에요.',
          setup() { S.showP = false; setZ(100); setEta(0); stpDp.reset(); S.relGo = false; syncRel(); setMode('tank'); setCtl(['sEta', 'stpDp']); },
          check: () => S.dEta === 1 && stpDp.value === Number(fN((RHO * G * 1) / 1e4, 1)), hold: 0.8,
          status: () => mark(S.dEta === 1) + ' Δη ' + fN(S.dEta, 2) + ' m (목표 1 m) · ' + mark(S.dEta === 1 && stpDp.value === Number(fN((RHO * G) / 1e4, 1))) + ' 입력 ' + fN(stpDp.value, 1) + '×10⁴ Pa',
          explain: 'Δp = ρ g Δη = 1025 × 9.8 × 1 ≈ <b>1.0×10⁴ Pa</b>(100 hPa)예요. 수심 100 m의 압력(1.0×10⁶ Pa)에 비하면 1 %지만, 넓은 바다에서는 이 작은 차이가 큰 물덩이를 움직여요.',
        },
        {
          type: 'quiz', title: '압력 경도력의 방향',
          goal: '칸막이를 빼면 수조의 물은 어느 쪽으로 움직이고, 그 까닭은?',
          setup() { S.showP = true; setZ(100); setEta(1); setMode('tank'); setCtl(['sEta', 'bRel']); },
          choices: ['해수면이 높은 쪽에서 낮은 쪽으로 움직여요. 높은 쪽의 같은 깊이 압력이 더 크기 때문이에요', '해수면이 낮은 쪽에서 높은 쪽으로 움직여요. 낮은 쪽의 압력이 더 크기 때문이에요', '압력은 깊이에만 관계해서 물은 움직이지 않아요', '바람이 불지 않으면 물은 움직이지 않아요'],
          answer: 0,
          feedback: ['', '위 물기둥이 더 높고 무거운 쪽(해수면이 높은 쪽)의 압력이 커요. 물은 압력이 큰 쪽에서 작은 쪽으로 밀려요.', '같은 깊이라도 위에 있는 물기둥의 높이가 다르면 압력이 달라요. 수조에서 두 점의 압력 차를 읽어 봐요.', '수조 모형은 바람 없이 압력 차만으로도 물이 흘러요. 칸막이를 빼서 확인해 봐요.'],
          explain: '해수면이 높은 쪽은 같은 깊이에서 위 물기둥이 더 높아 압력이 커요. 물은 <b>압력이 큰 쪽 → 작은 쪽</b>, 곧 높은 해수면 → 낮은 해수면으로 밀리고, 회전하지 않으면 해수면이 곧 평평해져요.',
        },
      ],
    },
    {
      title: '힘의 균형: 해류는 등수위선을 따라요', short: '힘의 균형', icon: '⚖️', phase: '탐구', features: ['rot'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회전하지 않는 수조에서는 물이 높은 쪽에서 낮은 쪽으로 곧바로 흘러 해수면이 평평해졌어요. 그런데 지구는 자전해요. <b>전향력</b>까지 더하면 어떻게 될까요?</div>' +
        '<p>회전 수조를 켜면 처음에는 물이 낮은 쪽으로 움직이다가 점점 <b>오른쪽으로 휘어요</b>. 결국 압력 경도력과 전향력이 <b>크기가 같고 방향이 반대</b>가 되어 균형을 이루면, 해류는 <b>등수위선과 나란히</b> 흘러요. 이것이 <b>지형류</b>예요. (화면에서는 몇 시간 걸리는 과정을 빨리 보여 줘요.)</p>',
      setup() { resetStep(2); },
      recap: '압력 경도력과 전향력이 균형을 이루면 해류는 등수위선과 나란히 흘러요. 북반구에서는 해수면이 높은 쪽이 해류의 오른쪽에 와요.',
      summary: '<ul><li><b>지형류</b>: 압력 경도력과 전향력이 균형을 이룰 때의 해류. <b>g·(Δη/Δx) = f·v</b>.</li><li>정상 상태에서 해류는 <b>등수위선과 나란히</b> 흐르고, 높은 곳에서 낮은 곳으로 흐르지 않아요.</li><li>북반구에서는 <b>해수면이 높은 쪽을 오른쪽에 두고</b> 흘러요. (남반구는 왼쪽)</li><li>그래서 중앙이 높은 아열대 순환에서는 <b>시계 방향</b>으로 흘러요.</li></ul>',
      missions: [
        {
          title: '균형 이루기',
          goal: '<b>회전 수조</b>를 켜고, 물덩이가 압력 경도력과 전향력이 <b>균형</b>을 이뤄 등수위선과 나란히 흐르게 해요.',
          hint: '회전 수조 단추를 눌러요. 5초쯤 기다리면 물덩이의 경로가 휘다가 세로(등수위선) 방향으로 곧게 흘러요. 안 되면 ‘물덩이 놓기’를 눌러요.',
          setup() { setRot(false); setMode('rot'); setCtl(['rotSw', 'sEta2', 'sLat2', 'bDrop']); },
          check: () => S.rot && S.geo && S.geoT > 0.5, hold: 0.5,
          status: () => mark(S.rot) + ' 회전 수조 · ' + mark(S.rot && S.geo) + ' 균형(흐름과 등수위선의 각도 ' + Math.round(S.angle || 0) + '°)',
          explain: '회전하는 바다에서는 물이 높은 쪽에서 낮은 쪽으로 가기 시작하다가 전향력으로 오른쪽으로 휘어요. 두 힘이 <b>크기가 같고 방향이 반대</b>가 되면 해류는 <b>등수위선과 나란히</b> 흘러요.',
        },
        {
          title: '해류 방향 판정', manual: true,
          goal: '북반구에서 <b>해수면이 높은 쪽이 해류의 오른쪽</b>에 오는 흐름 방향을 3곳 모두 골라요.',
          hint: '해류를 따라 바라볼 때 오른손 쪽에 H가 오게 해요. H가 서쪽이면 남쪽을 보고 흐를 때 H(서쪽)가 오른쪽이에요.',
          setup() { selDir.reset(); setMode('rot'); setCtl(['rotSw', 'selDir']); },
          status: () => mark(selDir.ok()) + ' 고른 곳 ' + selDir.count() + ' / 3',
          check() {
            if (!selDir.complete()) return '3곳 모두 방향을 골라 주세요. (지금 ' + selDir.count() + '곳)';
            if (!selDir.ok()) { selDir.mark(selDir.wrong()); return '빨간 줄이 달라요. 해류를 따라 바라볼 때 오른쪽에 높은 곳(H)이 오는지 확인해 봐요.'; }
            return true;
          },
          explain: 'H가 서쪽이면 <b>남쪽</b>(남쪽을 보면 오른쪽이 서쪽), H가 북쪽이면 <b>서쪽</b>(서쪽을 보면 오른쪽이 북쪽), H가 동쪽이면 <b>북쪽</b>(북쪽을 보면 오른쪽이 동쪽)으로 흘러요. 모두 높은 곳이 오른쪽에 와요.',
        },
        {
          type: 'quiz', title: '왜 높은 곳에서 낮은 곳으로 흐르지 않을까?',
          goal: '정상 상태의 지형류가 높은 곳에서 낮은 곳으로 <b>곧바로 흐르지 않는</b> 까닭은?',
          setup() { setMode('rot'); setCtl(['rotSw', 'sEta2', 'sLat2']); },
          choices: ['압력 경도력과 전향력이 크기가 같고 방향이 반대라서 합이 0이기 때문이에요', '해수면이 곧 평평해져서 압력 경도력이 사라지기 때문이에요', '해수는 원래 높은 곳에서 낮은 곳으로 흘러요. 그림의 흐름이 틀렸어요', '바다 바닥의 마찰이 해류를 가로막기 때문이에요'],
          answer: 0,
          feedback: ['', '해수면 경사는 유지돼요. 경사가 있어서 압력 경도력이 있고, 이를 전향력이 정확히 상쇄해요.', '회전하지 않는 수조에서는 그렇지만 지구에서는 전향력이 작용해요. 회전 수조를 켜서 비교해 봐요.', '이 모형은 마찰이 거의 없는 바다를 가정해요. 균형을 이루는 것은 전향력이에요.'],
          explain: '압력 경도력(높은 쪽 → 낮은 쪽)과 전향력(해류의 오른쪽 직각)이 <b>같은 크기, 반대 방향</b>이 되면 합력이 0이라 해류는 더 휘지 않고 일정하게 <b>등수위선을 따라</b> 흘러요.',
        },
      ],
    },
    {
      title: '유속 계산: v = (g/f)(Δη/Δx)', short: '유속 계산', icon: '🧮', phase: '분석', features: ['calc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력 경도력 g(Δη/Δx)와 전향력 f·v가 균형을 이룬다는 것을 봤어요. 이 균형식으로 실제 해류의 <b>속도</b>를 구해 봐요.</div>' +
        '<p>균형식 <b>g·(Δη/Δx) = f·v</b>에서 <b>v = (g/f)(Δη/Δx)</b>예요. 방향은 해수면이 높은 쪽을 오른쪽에 두는 방향이에요. 같은 해수면 경사라도 <b>위도가 높아 f가 크면 유속은 작아져요</b>. 적도 부근은 f → 0이라 이 식을 쓸 수 없어요.</p>',
      setup() { resetStep(3); },
      recap: '지형류의 속도는 v = (g/f)(Δη/Δx)예요. 해수면 경사가 클수록 빠르고, 위도가 높아 f가 클수록 느려요. 적도 부근에서는 쓸 수 없어요.',
      summary: '<ul><li><b>v = (g/f)(Δη/Δx)</b>: 해수면 경사 Δη/Δx가 클수록 빠르고, f가 클수록(위도가 높을수록) 느려요.</li><li><b>쿠로시오형</b>: Δη = 0.8 m, Δx = 100 km, 33°N(f = 7.9×10⁻⁵) → v ≈ <b>1.0 m/s</b>. <b>아열대 순환 내부</b>: Δη = 1 m, Δx = 1500 km, 30°N(f = 7.3×10⁻⁵) → v ≈ <b>0.09 m/s</b>. 같은 경사에서 60°N면 약 0.58배.</li><li>인과 사슬: 무역풍·편서풍 → 에크만 수송 수렴(약 30°N) → 중앙 해수면 약 1 m 상승 → 압력 경도력(바깥쪽)과 전향력(안쪽)의 균형 → <b>시계 방향 지형류</b>.</li><li>적도 부근에서는 f → 0이라 이 식을 쓸 수 없어요.</li></ul>',
      missions: [
        {
          title: '쿠로시오 유속 계산',
          goal: '<b>쿠로시오형</b>(Δη = 0.8 m, Δx = 100 km, 33°N)의 유속 v를 계산해 <b>m/s</b> 단위로 입력해요.',
          hint: 'v = 9.8 × (0.8 / 100,000) / 7.94×10⁻⁵ ≈ 0.99 m/s예요. 소수 첫째 자리까지는 1.0이에요.',
          setup() { S.showV = false; S.showBars = false; setSc('kuro'); stpV.reset(); setMode('calc'); setCtl(['scSeg', 'stpV']); },
          check: () => S.sc === 'kuro' && stpV.value === vKuro(), hold: 0.8,
          status: () => mark(S.sc === 'kuro') + ' 해역 쿠로시오형 · ' + mark(S.sc === 'kuro' && stpV.value === vKuro()) + ' 입력 ' + fN(stpV.value, 1) + ' m/s',
          explain: 'v = (9.8 / 7.94×10⁻⁵) × (0.8 / 10⁵ m) ≈ <b>0.99 m/s</b>, 곧 약 <b>1.0 m/s</b>예요. 경사가 가파른 서안 해류는 빨라요.',
        },
        {
          title: '유속 순서와 인과 사슬', manual: true,
          goal: '해류를 <b>빠른 순서</b>로 차례로 누르고, 아열대 순환이 생기는 <b>원인 5단계</b>를 순서대로 눌러요.',
          hint: '막대 그래프에서 가장 긴 막대부터 눌러요. 원인 사슬은 바람에서 시작해 시계 방향의 흐름으로 끝나요.',
          setup() { S.showV = true; S.showBars = true; setSc('kuro'); ordSpeed.reset(); ordChain.reset(); setMode('calc'); setCtl(['ordSpeed', 'ordChain']); },
          status: () => mark(ordSpeed.ok()) + ' 유속 순서 ' + ordSpeed.seq.length + ' / 3 · ' + mark(ordChain.ok()) + ' 원인 사슬 ' + ordChain.seq.length + ' / 5',
          check() {
            if (!ordSpeed.complete()) return '해류 3개를 빠른 순서로 모두 눌러 주세요.';
            if (!ordSpeed.ok()) { ordSpeed.mark(ordSpeed.seq[ordSpeed.firstWrong()]); return '유속 순서가 달라요. 막대 그래프의 값을 비교해 봐요.'; }
            if (!ordChain.complete()) return '원인 사슬 5단계를 모두 눌러 주세요.';
            if (!ordChain.ok()) { ordChain.mark(ordChain.seq[ordChain.firstWrong()]); return '원인 사슬의 순서가 달라요. 바람에서 시작해 어떤 순서로 이어질까요?'; }
            return true;
          },
          explain: '유속은 <b>쿠로시오형(약 1.0 m/s) > 아열대 내부 30°N(약 0.09 m/s) > 같은 경사의 60°N(약 0.05 m/s)</b>예요. 바람 → 에크만 수렴 → 해수면 상승 → 힘의 균형 → 시계 방향 지형류 순으로 이어져요.',
        },
        {
          type: 'quiz', title: '위도와 지형류',
          goal: '같은 해수면 경사에서 <b>위도가 높을수록 유속이 작은</b> 까닭과 <b>적도 부근</b>에서 이 식을 못 쓰는 까닭은?',
          setup() { S.showV = true; S.showBars = true; setSc('gyre'); setMode('calc'); setCtl(['sEtaC', 'sDxC', 'sLatC']); },
          choices: ['위도가 높을수록 f가 커서 v가 작아져요. 적도에서는 f → 0이라 v가 한없이 커져 식을 쓸 수 없어요', '위도가 높을수록 해수면 경사가 작아져서 유속이 작아요. 적도에서는 해류가 흐르지 않아요', '위도가 높을수록 중력이 약해져서 유속이 작아져요. 적도에서는 중력이 가장 커요', '위도와 유속은 관계가 없어요. 적도에서도 식을 그대로 쓸 수 있어요'],
          answer: 0,
          feedback: ['', '같은 경사를 가정했어요. 달라지는 것은 f예요. 슬라이더로 위도를 바꿔 v를 확인해 봐요.', '중력가속도의 변화는 아주 작아요. f = 2Ω sinφ가 위도에 따라 달라지는 것이 핵심이에요.', 'v = (g/f)(Δη/Δx)에서 f가 위도에 따라 달라져요. 위도 슬라이더를 움직여 비교해 봐요.'],
          explain: 'v ∝ 1/f이고 f = 2Ω sinφ예요. 위도가 높으면 f가 커져 v가 작아지고(60°는 30°의 약 0.58배), 적도 부근은 f → 0이라 v가 한없이 커지므로 <b>지형류 식을 쓸 수 없어요</b>.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-geostrophic-current', mount: '#game', badge: '지형류 박사', homeHref: '../../index.html#hs',
    featureLabels: { ssh: '🛰️ 해수면 높이 지도 · 단면', tank: '🧪 수조 · 압력 계산', rot: '⚖️ 회전 수조 · 힘 화살표', calc: '🧮 지형류 계산 패널' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    if (S.mode === 'ssh') readSsh();
    else if (S.mode === 'tank') readTank();
    else if (S.mode === 'rot') readRot();
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
    if (S.mode === 'ssh') drawSsh(t, dt);
    else if (S.mode === 'tank') drawTank(t, dt);
    else if (S.mode === 'rot') drawRot(t, dt);
    else drawCalc(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    levels, VW, VH, S, PHONE, stpD, stpP, stpDp, stpV, selDir, ordSpeed, ordChain, etaX, pAt, vCalc, fmtV, vgOf, pgfOf,
    get game() { return game; }, setMode, resetStep, updateCtl, setZ, setEta, setEta2, setLat2, setSc, setRot, newParcels, sshGeom, probePos, rotGeom,
  };
})();
