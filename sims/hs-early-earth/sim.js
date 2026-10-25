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
    st.wrong = () => items.filter((it) => st.sel[it.id] && st.sel[it.id] !== answer[it.id]).map((it) => it.id);
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
     원시 지구의 권역 형성 (마그마 바다 → 원시 대기 → 원시 바다 → 행성 비교)
     ====================================================== */
  initStage('#eaf1f7', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const SUPm = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUPm[c] || c).join('');
  const fp = (x) => (x >= 10 ? String(Math.round(x)) : x >= 1 ? (Math.round(x * 10) / 10).toFixed(1) : x >= 0.01 ? (Math.round(x * 100) / 100).toFixed(2) : x.toFixed(4));
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }

  const S = {
    mode: 'magma', fade: 0, clock: 0, bad: [],
    T: 1500, crustK: 0,
    revealed: false, revK: 0,
    Te: 800, c: 0, rain: 0, ocK: 0,
    R: 1, showAtm: true, near: null,
  };

  /* ======================================================
     장면 1: 마그마 바다
     ====================================================== */
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 440 }, B: { x: 8, y: 456, w: 504, h: 200 } }
    : { A: { x: 12, y: 12, w: 776, h: 372 }, B: { x: 12, y: 392, w: 776, h: 156 } };
  const NCRY = 36, T_CRY0 = 1400, T_CRUST = 1100, RHO_MAG = 2.8, RHO_OL = 3.3, RHO_PL = 2.7;
  const CRY = (() => {
    const rnd = seeded(3);
    return Array.from({ length: NCRY }, (_, i) => ({ type: i % 2 ? 'pl' : 'ol', g: 0, on: false, x: 0, y: 0, rot: rnd() * 3, sz: 9 + rnd() * 3, u: rnd(), v: rnd(), w: rnd(), rest: false, ph: rnd() * 6 }));
  })();
  const magBox = () => { const A = RC1.A; const m = { x: A.x + 16, y: A.y + 50, w: A.w - 32, h: A.h - 66 }; m.ys = m.y + 26; m.yf = m.y + m.h - (PHONE ? 70 : 52); return m; };
  const fracOf = (T) => clamp((T_CRY0 - T) / (T_CRY0 - T_CRUST), 0, 1);
  const nCry = (T) => Math.floor(fracOf(T) * NCRY + 1e-9);
  function cryStep(dt) {
    const M = magBox(), n = nCry(S.T);
    CRY.forEach((c, i) => {
      const want = i < n;
      if (want && !c.on) {
        c.on = true; c.g = 0; c.rest = false;
        c.x = M.x + 30 + c.u * (M.w - 60);
        c.y = c.type === 'ol' ? M.ys + 24 + c.v * (M.yf - M.ys - 90) : M.ys + 24 + c.v * (M.yf - M.ys) * 0.4;
      } else if (!want && c.on) { c.on = false; }
      if (c.on) {
        c.g = approach(c.g, 1, dt, 6);
        if (!c.rest) {
          if (c.type === 'ol') { c.y += 300 * (RHO_OL - RHO_MAG) * dt; const ry = M.yf - 7 - ((i >> 1) % 3) * 9; if (c.y >= ry) { c.y = ry; c.rest = true; } }
          else { c.y -= 300 * (RHO_MAG - RHO_PL) * dt; const ry = M.ys + 10 + ((i >> 1) % 2) * 9; if (c.y <= ry) { c.y = ry; c.rest = true; } }
          c.x += Math.sin(S.clock * 2 + c.ph) * 8 * dt;
          c.x = clamp(c.x, M.x + 14, M.x + M.w - 14);
        }
      } else if (c.g > 0) { c.g = approach(c.g, 0, dt, 8); if (c.g < 0.02) c.g = 0; }
    });
  }
  function drawCrystal(c) {
    if (c.g <= 0.01) return;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.type === 'ol' ? c.rot : c.rot * 0.2); ctx.scale(c.g, c.g);
    if (c.type === 'ol') { ctx.fillStyle = '#7fae3f'; poly([[0, -c.sz], [c.sz * 0.85, 0], [0, c.sz], [-c.sz * 0.85, 0]]); ctx.fill(); ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else { ctx.fillStyle = '#f3efe6'; rr(-c.sz * 1.15, -c.sz * 0.42, c.sz * 2.3, c.sz * 0.84, 3).fill(); ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
  }
  function drawMagma(t, dt) {
    const { A, B } = RC1, M = magBox();
    const plUp = CRY.every((c) => c.type !== 'pl' || !c.on || c.rest);
    S.crustK = approach(S.crustK, S.T <= T_CRUST && plUp ? 1 : 0, dt, 1.4);
    if (S.crustK < 0.001) S.crustK = 0;
    cryStep(dt);
    card(A, '🔥 마그마 바다의 단면 (원시 지구의 바깥쪽, 예시)');
    const k = clamp((S.T - 1000) / 500, 0, 1);
    // 우주(위) · 마그마 · 고체 하부
    ctx.save(); rr(M.x, M.y, M.w, M.h, 12).clip();
    ctx.fillStyle = '#1e293b'; ctx.fillRect(M.x, M.y, M.w, M.ys - M.y);
    const gm = ctx.createLinearGradient(0, M.ys, 0, M.yf);
    gm.addColorStop(0, mixc('#b91c1c', '#fde68a', k * 0.85)); gm.addColorStop(1, mixc('#7f1d1d', '#f97316', k * 0.7));
    ctx.fillStyle = gm; ctx.beginPath(); ctx.moveTo(M.x, M.yf);
    for (let i = 0; i <= 40; i++) { const x = M.x + (M.w * i) / 40, w = (1 - S.crustK) * Math.sin(t * 1.6 + i * 0.7) * 3.2; ctx.lineTo(x, M.ys + w); }
    ctx.lineTo(M.x + M.w, M.yf); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#44403c'; ctx.fillRect(M.x, M.yf, M.w, M.y + M.h - M.yf);
    D.text(M.x + M.w / 2, M.yf + 24 * FS, '고체 상태의 아래층', { size: 13, weight: 700, color: '#d6d3d1' });
    // 쌓인 감람석 층(바닥)
    const nOl = CRY.filter((c) => c.type === 'ol' && c.rest && c.on).length;
    if (nOl > 0) { ctx.fillStyle = 'rgba(101,163,13,.35)'; ctx.fillRect(M.x, M.yf - 8 - Math.min(3, nOl / 4) * 6, M.w, 8 + Math.min(3, nOl / 4) * 6); }
    CRY.forEach(drawCrystal);
    // 표면 빛
    D.glow(M.x + M.w / 2, M.ys, M.w * 0.45, '#fde68a', 0.35 * k * (1 - S.crustK));
    // 원시 지각(굳은 판 조각이 자라서 이어져요)
    if (S.crustK > 0.01) {
      const segs = 8, sw = M.w / segs;
      for (let j = 0; j < segs; j++) {
        const cx = M.x + (j + 0.5) * sw, hw = (sw / 2) * 1.04 * clamp(S.crustK * 1.05, 0, 1);
        ctx.fillStyle = '#cfc7ba'; rr(cx - hw, M.ys - 7, hw * 2, 15, 4).fill(); ctx.strokeStyle = '#78716c'; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
    ctx.restore();
    // 표시
    D.label(M.x + M.w - 8 - 0, M.ys - 14, '표면 온도 ' + S.T + ' K', { bg: mixc('#0369a1', '#dc2626', k), size: 13, pad: 8, align: 'right' });
    D.text(M.x + 10, M.y + 17 * FS, S.crustK >= 0.98 ? '✔ 원시 지각이 굳었어요' : S.T <= T_CRY0 ? '결정이 생겨 가라앉거나 떠올라요' : '전체가 녹은 마그마 바다예요', { size: 13.5, weight: 800, color: '#e2e8f0', align: 'left' });
    if (S.crustK >= 0.98) D.label(M.x + M.w / 2, M.ys - 22, '원시 지각 (사장석이 모인 가벼운 암석)', { bg: '#78716c', size: 12.5, pad: 8 });
    // 밀도 비교 카드
    card(B, '⚖️ 마그마(약 2.8 g/cm³)와 결정의 밀도 비교');
    const x0 = B.x + (PHONE ? 30 : 60), x1 = B.x + B.w - (PHONE ? 30 : 60), Xd = (r) => x0 + ((x1 - x0) * (r - 2.4)) / 1.2, ay = B.y + (PHONE ? 110 : 100);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x0, ay, x1 - x0, 6);
    [2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6].forEach((r) => { ctx.fillStyle = '#94a3b8'; ctx.fillRect(Xd(r) - 0.75, ay, 1.5, 12); D.text(Xd(r), ay + 28 * (PHONE ? 0.8 : 1), r.toFixed(1), { size: 12, weight: 700, color: '#64748b' }); });
    D.dashedLine(Xd(RHO_MAG), ay - 44, Xd(RHO_MAG), ay + 6, { color: '#dc2626', width: 2.6 });
    D.label(Xd(RHO_MAG), ay - 56, '마그마 2.8', { bg: '#dc2626', size: 12.5, pad: 7 });
    ctx.fillStyle = '#f3efe6'; rr(Xd(RHO_PL) - 14, ay - 14, 28, 12, 3).fill(); ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1.4; ctx.stroke();
    D.text(Xd(RHO_PL), ay - 22 - (PHONE ? 22 : 0), '사장석 2.7 ↑ 떠올라요', { size: 12.5, weight: 800, color: '#57534e', align: 'right' });
    ctx.fillStyle = '#7fae3f'; poly([[Xd(RHO_OL), ay - 17], [Xd(RHO_OL) + 12, ay - 8], [Xd(RHO_OL), ay + 1], [Xd(RHO_OL) - 12, ay - 8]]); ctx.fill(); ctx.strokeStyle = '#3f6212'; ctx.stroke();
    D.text(Xd(RHO_OL), ay - 24 - (PHONE ? 22 : 0), '감람석 3.3 ↓ 가라앉아요', { size: 12.5, weight: 800, color: '#3f6212', align: 'left' });
    D.text(B.x + B.w / 2, B.y + B.h - 12, '밀도(g/cm³)', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     장면 2: 원시 대기 (탈기)
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 320 }, B: { x: 8, y: 336, w: 504, h: 200 }, C: { x: 8, y: 544, w: 504, h: 160 } }
    : { A: { x: 12, y: 12, w: 430, h: 536 }, B: { x: 450, y: 12, w: 338, h: 300 }, C: { x: 450, y: 320, w: 338, h: 228 } };
  const GAS = [{ id: 'h2o', n: '수증기(H₂O)', p: 270, c: '#60a5fa' }, { id: 'co2', n: '이산화 탄소(CO₂)', p: 60, c: '#6b7280' }, { id: 'n2', n: '질소(N₂)', p: 1, c: '#a78bfa' }, { id: 'o2', n: '산소(O₂)', p: 0, c: '#ef4444' }];
  const GAS_TOT = 331;
  const GSEQ = (() => { const a = []; for (let i = 0; i < 65; i++) a.push('h2o'); for (let i = 0; i < 14; i++) a.push('co2'); a.push('n2'); const rnd = seeded(77); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  const GCOL = { h2o: '#60a5fa', co2: '#6b7280', n2: '#a78bfa' };
  const G2 = { dots: [], bub: [], hhe: [], timer: 0, n: 0 };
  function gasReset() { G2.dots = []; G2.bub = []; G2.hhe = []; G2.timer = 0; G2.n = 0; }
  const gasBox = () => { const A = RC2.A, b = { x: A.x + 14, y: A.y + 44, w: A.w - 28, h: A.h - 58 }; b.ym = b.y + b.h * (PHONE ? 0.72 : 0.8); return b; };
  function gasStep(dt) {
    const b = gasBox();
    G2.timer -= dt;
    if (G2.timer <= 0 && G2.n < GSEQ.length) { G2.timer = 0.11; G2.bub.push({ x: b.x + 24 + Math.random() * (b.w - 48), y: b.y + b.h - 6, s: 4 + Math.random() * 3, id: GSEQ[G2.n++] }); }
    for (let i = G2.bub.length - 1; i >= 0; i--) {
      const q = G2.bub[i]; q.y -= 70 * dt; q.x += Math.sin(q.y * 0.1) * 12 * dt;
      if (q.y <= b.ym + 3) { G2.dots.push({ x: q.x, y: b.ym - 6, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, id: q.id }); G2.bub.splice(i, 1); }
    }
    G2.dots.forEach((d) => {
      d.x += d.vx * dt; d.y += d.vy * dt; d.vx += (Math.random() - 0.5) * 140 * dt; d.vy += (Math.random() - 0.5) * 140 * dt;
      d.vx = clamp(d.vx, -50, 50); d.vy = clamp(d.vy, -50, 50);
      if (d.x < b.x + 6) { d.x = b.x + 6; d.vx = Math.abs(d.vx); } if (d.x > b.x + b.w - 6) { d.x = b.x + b.w - 6; d.vx = -Math.abs(d.vx); }
      if (d.y < b.y + 38) { d.y = b.y + 38; d.vy = Math.abs(d.vy); } if (d.y > b.ym - 6) { d.y = b.ym - 6; d.vy = -Math.abs(d.vy); }
    });
    // 수소·헬륨은 흩어져 사라져요
    if (Math.random() < dt * 3.2 && G2.hhe.length < 14) G2.hhe.push({ x: b.x + 20 + Math.random() * (b.w - 40), y: b.y + 120 + Math.random() * 50, age: 0 });
    for (let i = G2.hhe.length - 1; i >= 0; i--) { const q = G2.hhe[i]; q.age += dt; q.y -= 38 * dt; q.x += 14 * dt; if (q.age > 2.4) G2.hhe.splice(i, 1); }
  }
  function drawGas(t, dt) {
    const { A, B, C } = RC2, b = gasBox();
    S.revK = approach(S.revK, S.revealed ? 1 : 0, dt, 2.6);
    gasStep(dt);
    card(A, '💨 마그마에서 빠져나오는 기체 (탈기)');
    ctx.save(); rr(b.x, b.y, b.w, b.h, 12).clip();
    const gs = ctx.createLinearGradient(0, b.y, 0, b.ym); gs.addColorStop(0, '#1e293b'); gs.addColorStop(1, '#4b3b4a');
    ctx.fillStyle = gs; ctx.fillRect(b.x, b.y, b.w, b.ym - b.y);
    const gm = ctx.createLinearGradient(0, b.ym, 0, b.y + b.h); gm.addColorStop(0, '#fb923c'); gm.addColorStop(1, '#991b1b');
    ctx.fillStyle = gm; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h);
    for (let i = 0; i <= 40; i++) { const x = b.x + (b.w * i) / 40; ctx.lineTo(x, b.ym + Math.sin(t * 1.8 + i * 0.6) * 3); }
    ctx.lineTo(b.x + b.w, b.y + b.h); ctx.closePath(); ctx.fill();
    // 기포
    G2.bub.forEach((q) => { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(255,237,213,.35)'; ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, TAU); ctx.fill(); ctx.stroke(); });
    // 대기 중의 기체 분자
    G2.dots.forEach((d) => { ball(d.x, d.y, 4.6, S.revealed ? GCOL[d.id] : '#cbd5e1', false); });
    // 수소·헬륨
    G2.hhe.forEach((q) => { ctx.fillStyle = 'rgba(253,230,138,' + (0.85 * (1 - q.age / 2.4)) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, TAU); ctx.fill(); });
    ctx.restore();
    D.text(b.x + 12, b.y + 22 * FS, '원시 대기', { size: 14, weight: 800, color: '#e2e8f0', align: 'left' });
    D.text(b.x + b.w - 10, b.ym + 24 * FS, '마그마', { size: 14, weight: 800, color: '#fff', align: 'right' });
    D.text(b.x + 12, b.y + 160 * (PHONE ? 0.8 : 1), '✨ 성운의 수소·헬륨은 태양풍과 약한 중력 때문에 흩어졌어요', { size: 12.5, weight: 700, color: '#fde68a', align: 'left' });
    D.text(b.x + b.w / 2, b.y + b.h - 10, G2.n >= GSEQ.length ? '탈기가 이어져 대기가 만들어졌어요' : '기포가 올라와 터지며 기체가 나와요…', { size: 13, weight: 800, color: '#fff7ed' });
    if (S.revealed) { GAS.slice(0, 3).forEach((g, i) => { ball(b.x + 18 + i * (PHONE ? 150 : 120), b.y + 42 * FS, 5, g.c, false); D.text(b.x + 28 + i * (PHONE ? 150 : 120), b.y + 42 * FS + 4.5, g.n.split('(')[0], { size: 12, weight: 700, color: '#e2e8f0', align: 'left' }); }); }

    // 원시 대기 막대(로그 눈금)
    card(B, '📊 원시 대기의 성분 (기압, 로그 눈금, 예시)');
    const x0 = B.x + (PHONE ? 118 : 108), W = B.w - (PHONE ? 118 : 108) - 22, Xl = (p) => x0 + (W * (Math.log10(p) + 1)) / 4; // 0.1~1000
    const by0 = B.y + (PHONE ? 52 : 56), pitch = PHONE ? 34 : 44, bh = PHONE ? 22 : 26;
    [0.1, 1, 10, 100, 1000].forEach((p) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Xl(p), by0 - 8); ctx.lineTo(Xl(p), by0 + pitch * 4 - 6); ctx.stroke(); D.text(Xl(p), by0 + pitch * 4 + 8 * FS, String(p), { size: 12, weight: 700, color: '#64748b', align: p === 1000 ? 'right' : p === 0.1 ? 'left' : 'center' }); });
    GAS.forEach((g, i) => {
      const y = by0 + i * pitch;
      D.text(B.x + 14, y + bh / 2 + 5, S.revealed ? g.n.split('(')[0] : '성분 ' + 'ABCD'[i], { size: 13, weight: 800, color: '#334155', align: 'left' });
      if (S.revK > 0.02) {
        if (g.p > 0) {
          const w = Math.max(0, (Xl(g.p) - x0) * S.revK);
          ctx.fillStyle = g.c; rr(x0, y, w, bh, 5).fill();
          if (S.revK > 0.9) D.text(Xl(g.p) + 6 > B.x + B.w - 50 ? Xl(g.p) - 6 : Xl(g.p) + 6, y + bh / 2 + 5, g.p + ' 기압', { size: 13, weight: 800, color: Xl(g.p) + 6 > B.x + B.w - 50 ? '#fff' : '#334155', align: Xl(g.p) + 6 > B.x + B.w - 50 ? 'right' : 'left' });
        } else if (S.revK > 0.9) D.text(x0 + 4, y + bh / 2 + 5, '거의 0 (눈금 밖)', { size: 13, weight: 800, color: '#b91c1c', align: 'left' });
      }
    });
    if (S.revK <= 0.02) D.text(B.x + B.w / 2, B.y + B.h - 16, '순서를 정하고 “결과 보기”를 눌러요', { size: 14, weight: 800, color: '#64748b' });

    // 오늘날의 대기와 비교
    card(C, '🌍 오늘날 대기와 비교 (부피 %)');
    const sx = C.x + 18, sw = C.w - 36, sy1 = C.y + (PHONE ? 52 : 62), sh = PHONE ? 26 : 30;
    D.text(sx, sy1 - 8, '오늘날의 대기', { size: 13, weight: 800, color: '#334155', align: 'left' });
    const today = [['N₂', 78, '#a78bfa'], ['O₂', 21, '#ef4444'], ['기타', 1, '#cbd5e1']];
    let xx = sx; today.forEach((q) => { const w = (sw * q[1]) / 100; ctx.fillStyle = q[2]; ctx.fillRect(xx, sy1, w, sh); if (w > 40) D.text(xx + w / 2, sy1 + sh / 2 + 5, q[0] + ' ' + q[1] + ' %', { size: 13, weight: 800, color: '#fff' }); xx += w; });
    D.text(sx + sw, sy1 + sh + 16 * FS, '기타(아르곤 등) 1 %', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    const sy2 = sy1 + sh + (PHONE ? 54 : 70);
    D.text(sx, sy2 - 8, '원시 대기 (예시)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    if (S.revK > 0.02) {
      let x2 = sx; GAS.slice(0, 3).forEach((g) => { const w = (sw * g.p) / GAS_TOT * S.revK; ctx.fillStyle = g.c; ctx.fillRect(x2, sy2, w, sh); x2 += w; });
      if (S.revK > 0.9) D.text(sx + 8, sy2 + sh / 2 + 5, 'H₂O 82 %', { size: 13, weight: 800, color: '#fff', align: 'left' });
      if (S.revK > 0.9) D.text(sx + (sw * 270) / GAS_TOT + (sw * 60) / GAS_TOT / 2, sy2 + sh / 2 + 5, 'CO₂', { size: 12.5, weight: 800, color: '#fff' });
      if (S.revK > 0.9) D.text(sx + sw, sy2 + sh + 16 * FS, 'CO₂ 18 % · N₂ 약 0.3 % · O₂ 거의 0', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    } else D.text(sx + sw / 2, sy2 + sh / 2 + 5, '?', { size: 16, weight: 800, color: '#94a3b8' });
  }

  /* ======================================================
     장면 3: 원시 바다
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 380 }, B: { x: 8, y: 396, w: 248, h: 264 }, C: { x: 264, y: 396, w: 248, h: 264 } }
    : { A: { x: 12, y: 12, w: 500, h: 536 }, B: { x: 520, y: 12, w: 268, h: 268 }, C: { x: 520, y: 288, w: 268, h: 260 } };
  const PSAT = [[20, 0.023], [60, 0.197], [100, 1.0], [150, 4.7], [200, 15.3], [250, 39.2], [300, 84.8], [350, 163], [374, 218]];
  const psat = (T) => { if (T <= 20) return 0.023; if (T >= 374) return 218; for (let i = 1; i < PSAT.length; i++) if (T <= PSAT[i][0]) { const a = PSAT[i - 1], b = PSAT[i], f = (T - a[0]) / (b[0] - a[0]); return Math.exp(Math.log(a[1]) + f * (Math.log(b[1]) - Math.log(a[1]))); } return 218; };
  const fOcean = (T) => (T >= 374 ? 0 : clamp(1 - psat(T) / 270, 0, 1));
  const pH2O = (T) => (T >= 374 ? 270 : Math.min(270, psat(T)));
  const pCO2 = (T, c) => 60 - (60 - 0.0004) * (c / 100) * fOcean(T);
  const pTot = (T, c) => pH2O(T) + pCO2(T, c) + 1;
  const pSpr = new SciSim.Spring(331, { stiffness: 90, damping: 14 });
  const CLOUD = (() => { const rnd = seeded(13), a = []; for (let i = 0; i < 16; i++) a.push({ x: rnd(), y: rnd(), s: 26 + rnd() * 26 }); return a; })();
  const RAIN = (() => { const rnd = seeded(19), a = []; for (let i = 0; i < 70; i++) a.push({ x: rnd(), ph: rnd(), sp: 0.8 + rnd() * 0.6 }); return a; })();
  function drawOcean(t, dt) {
    const { A, B, C } = RC3;
    const F = fOcean(S.Te), vap = pH2O(S.Te) / 270, tot = pTot(S.Te, S.c);
    S.ocK = approach(S.ocK, F, dt, 3);
    const rainT = S.Te < 374 && F < 0.985 ? 0.3 + 0.7 * (1 - F) : 0; S.rain = approach(S.rain, rainT, dt, 2);
    pSpr.target = tot; pSpr.update(dt);
    card(A, '🌧️ 식어 가는 원시 지구의 표면 (예시)');
    // 온도계
    const tx = A.x + 26, ty0 = A.y + 52, ty1 = A.y + A.h - 40, Ty = (T) => ty1 - ((ty1 - ty0) * (T - 20)) / 780;
    ctx.fillStyle = '#e2e8f0'; rr(tx - 7, ty0 - 4, 14, ty1 - ty0 + 8, 7).fill();
    const hot = clamp((S.Te - 20) / 780, 0, 1);
    ctx.fillStyle = mixc('#38bdf8', '#ef4444', hot); rr(tx - 7, Ty(S.Te), 14, ty1 - Ty(S.Te) + 4, 7).fill();
    D.sphere(tx, ty1 + 4, 11, mixc('#38bdf8', '#ef4444', hot), { gloss: true });
    D.dashedLine(tx - 14, Ty(374), tx + 56, Ty(374), { color: '#0369a1', width: 2.4 });
    D.text(tx - 12, Ty(374) + 4.5, '374', { size: 12, weight: 800, color: '#0369a1', align: 'right' });
    [100, 700].forEach((v) => D.text(tx - 12, Ty(v) + 4.5, String(v), { size: 11.5, weight: 700, color: '#64748b', align: 'right' }));
    D.text(tx, ty0 - 10, '°C', { size: 12, weight: 800, color: '#64748b' });
    // 장면
    const SB = { x: A.x + 74, y: A.y + 40, w: A.w - 90, h: A.h - 56 };
    const yTop = SB.y + SB.h * 0.6, yFloor = SB.y + SB.h * 0.9;
    ctx.save(); rr(SB.x, SB.y, SB.w, SB.h, 12).clip();
    const sk = ctx.createLinearGradient(0, SB.y, 0, yTop);
    const hh = clamp((S.Te - 100) / 700, 0, 1);
    sk.addColorStop(0, mixc('#7dd3fc', '#7c2d12', hh)); sk.addColorStop(1, mixc('#e0f2fe', '#f97316', hh));
    ctx.fillStyle = sk; ctx.fillRect(SB.x, SB.y, SB.w, SB.h);
    // 구름(수증기)
    CLOUD.forEach((c, i) => {
      const x = SB.x + ((c.x * SB.w + t * (6 + (i % 4) * 2)) % (SB.w + 80)) - 40, y = SB.y + 20 + c.y * (yTop - SB.y - 80);
      ctx.fillStyle = mixc('#ffffff', '#e5d1c5', hh) ; ctx.globalAlpha = clamp(0.1 + 0.8 * vap, 0, 0.9) * 0.8;
      ctx.beginPath(); ctx.arc(x, y, c.s * (0.8 + 0.5 * vap), 0, TAU); ctx.arc(x + c.s * 0.7, y + 4, c.s * 0.75 * (0.8 + 0.5 * vap), 0, TAU); ctx.arc(x - c.s * 0.7, y + 6, c.s * 0.7 * (0.8 + 0.5 * vap), 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 비
    if (S.rain > 0.02) {
      ctx.strokeStyle = 'rgba(30,64,175,' + (0.35 + 0.4 * S.rain) + ')'; ctx.lineWidth = 1.8;
      RAIN.forEach((q, i) => { if (i / RAIN.length > S.rain) return; const yy = SB.y + 70 + ((q.ph * 400 + t * 260 * q.sp) % (yTop - SB.y - 20)); const xx = SB.x + q.x * SB.w; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 3, yy + 12); ctx.stroke(); });
    }
    // 바다와 바위 바닥
    const lvl = yFloor - (yFloor - yTop) * S.ocK;
    if (S.ocK > 0.003) {
      const gw = ctx.createLinearGradient(0, lvl, 0, yFloor); gw.addColorStop(0, 'rgba(56,189,248,.85)'); gw.addColorStop(1, 'rgba(3,105,161,.95)');
      ctx.fillStyle = gw; ctx.beginPath(); ctx.moveTo(SB.x, yFloor);
      for (let i = 0; i <= 30; i++) { const x = SB.x + (SB.w * i) / 30; ctx.lineTo(x, lvl + Math.sin(t * 2 + i * 0.8) * 2.2); }
      ctx.lineTo(SB.x + SB.w, yFloor); ctx.closePath(); ctx.fill();
      if (S.rain > 0.1 && !RM) for (let i = 0; i < 6; i++) { const q = RAIN[i * 11]; const rx = SB.x + q.x * SB.w, k = (t * q.sp * 1.3 + q.ph) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(rx, lvl, 3 + k * 10, 1.5 + k * 3, 0, 0, TAU); ctx.stroke(); }
    }
    // 바위(양쪽 벽 + 바닥)
    const rock = mixc('#6b5b52', '#dc2626', hh * 0.75);
    ctx.fillStyle = rock; ctx.fillRect(SB.x, yFloor, SB.w, SB.y + SB.h - yFloor);
    ctx.beginPath(); ctx.moveTo(SB.x, yTop); ctx.lineTo(SB.x + 44, yTop); ctx.lineTo(SB.x + 44, yFloor); ctx.lineTo(SB.x, yFloor); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(SB.x + SB.w, yTop); ctx.lineTo(SB.x + SB.w - 44, yTop); ctx.lineTo(SB.x + SB.w - 44, yFloor); ctx.lineTo(SB.x + SB.w, yFloor); ctx.closePath(); ctx.fill();
    if (hh > 0.15) { D.glow(SB.x + SB.w / 2, yFloor + 10, SB.w * 0.45, '#fb923c', 0.4 * hh); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(71,85,105,.4)'; ctx.lineWidth = 1.5; rr(SB.x, SB.y, SB.w, SB.h, 12).stroke();
    D.text(SB.x + SB.w / 2, SB.y + SB.h - 8, S.Te >= 374 ? '뜨거워서 물이 모두 수증기예요' : F < 0.99 ? '수증기가 응결해 비가 내려요' : '바다가 만들어졌어요', { size: 13.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.55)', strokeWidth: 4 });
    if (S.ocK > 0.08) D.label(SB.x + SB.w / 2, clamp(lvl - 16, SB.y + 34, yFloor - 20), '원시 바다 ' + Math.round(F * 100) + ' %', { bg: '#0369a1', size: 13, pad: 8 });

    // 대기압 막대
    card(B, '🫧 대기의 기체 (기압)');
    const bx = B.x + 20, by0 = B.y + 44, bH = B.h - 62, Yp = (p) => (bH * p) / 340;
    ctx.fillStyle = '#f1f5f9'; rr(bx, by0, 56, bH, 6).fill();
    [0, 100, 200, 300].forEach((p) => { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 56, by0 + bH - Yp(p)); ctx.lineTo(bx + 64, by0 + bH - Yp(p)); ctx.stroke(); D.text(bx + 68, by0 + bH - Yp(p) + 4, String(p), { size: 11.5, weight: 700, color: '#64748b', align: 'left' }); });
    const segs = [['n2', 1, '#a78bfa'], ['co2', pCO2(S.Te, S.c), '#6b7280'], ['h2o', pH2O(S.Te), '#60a5fa']];
    let yy = by0 + bH; segs.forEach((s) => { const h = Yp(s[1]); ctx.fillStyle = s[2]; ctx.fillRect(bx, yy - h, 56, h); yy -= h; });
    const lx = bx + 124, ly = by0 + 14;
    [['수증기', pH2O(S.Te), '#60a5fa'], ['CO₂', pCO2(S.Te, S.c), '#6b7280'], ['N₂', 1, '#a78bfa']].forEach((q, i) => { ball(lx - 12, ly + i * 36 + 0, 5, q[2], false); D.text(lx, ly + i * 36 - 4, q[0], { size: 12.5, weight: 700, color: '#475569', align: 'left' }); D.text(lx, ly + i * 36 + 14, fp(q[1]) + ' 기압', { size: 13.5, weight: 800, color: '#1e293b', align: 'left' }); });
    // 계기
    card(C, '🧭 총 대기압');
    const dcx = C.x + C.w / 2, dcy = C.y + C.h * 0.55, dr = Math.min(C.w / 2 - 20, C.h * 0.4);
    D.dial(dcx, dcy, dr, pSpr.value, 0, 350, { ticks: 7, label: '기압', color: '#dc2626' });
    D.text(dcx, C.y + C.h - 12, '총 ' + fp(tot) + ' 기압', { size: 15, weight: 800, color: '#1e293b' });
  }

  /* ======================================================
     장면 4: 행성 비교
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 312 }, B: { x: 8, y: 328, w: 504, h: 214 }, C: { x: 8, y: 550, w: 504, h: 160 } }
    : { A: { x: 12, y: 12, w: 776, h: 292 }, B: { x: 12, y: 312, w: 430, h: 236 }, C: { x: 450, y: 312, w: 338, h: 236 } };
  const PL = [
    { id: 'me', n: '수성', R: 0.38, g: 3.7, v: 4.3, atm: '거의 0', T: '약 170', act: '활동 없음 (수축 지형)', mag: '약한 자기장', c: '#9ca3af' },
    { id: 've', n: '금성', R: 0.95, g: 8.9, v: 10.4, atm: '92', T: '460', act: '판구조 없음 (화산 지형 흔적)', mag: '자기장 없음', c: '#e5b96a' },
    { id: 'ea', n: '지구', R: 1.0, g: 9.8, v: 11.2, atm: '1', T: '15', act: '판구조, 활발한 화산', mag: '강한 자기장', c: '#3b82f6' },
    { id: 'ma', n: '화성', R: 0.53, g: 3.7, v: 5.0, atm: '0.006', T: '평균 −60', act: '과거 활발, 현재 거의 없음', mag: '약 40억 년 전 소멸', c: '#d9674b' },
  ];
  const COOLP = [{ n: '달', R: 0.27 }, { n: '수성', R: 0.38 }, { n: '화성', R: 0.53 }, { n: '금성', R: 0.95 }, { n: '지구', R: 1.0 }];
  const idxOf = (R) => 1 / R;
  function drawPlanets(t, dt) {
    const { A, B, C } = RC4;
    const hideAtm = !S.showAtm && !pairAtm.ok() && !(game && game.free);
    card(A, '🪐 지구형 행성 비교 (예시 자료)');
    const cols = PHONE
      ? [['행성', 12, 88], ['반지름', 100, 52], ['탈출 속도', 152, 62], ['대기압', 214, 64], ['표면 온도', 278, 76], ['판구조·화산', 354, 150]]
      : [['행성', 14, 124], ['반지름', 138, 60], ['중력', 198, 66], ['탈출 속도', 264, 78], ['대기압', 342, 84], ['표면 온도', 426, 104], ['판구조·화산·자기장', 530, 236]];
    const hy = A.y + 44, rowH = PHONE ? 62 : 54;
    cols.forEach((c) => D.text(A.x + c[1] + (c[0] === '행성' || c[0].startsWith('판구조') ? 0 : c[2] / 2), hy, c[0], { size: 12.5, weight: 800, color: '#64748b', align: c[0] === '행성' || c[0].startsWith('판구조') ? 'left' : 'center' }));
    const unit = (c) => ({ '반지름': '(지구=1)', '중력': 'm/s²', '탈출 속도': 'km/s', '대기압': '기압', '표면 온도': '°C' }[c[0]] || '');
    cols.forEach((c) => { const u = unit(c); if (u) D.text(A.x + c[1] + c[2] / 2, hy + 14 * FS, u, { size: 11, weight: 700, color: '#94a3b8' }); });
    PL.forEach((p, i) => {
      const y = hy + 22 * FS + 6 + i * rowH, near = S.near === p.id;
      if (near) { ctx.fillStyle = 'rgba(14,165,233,.12)'; rr(A.x + 6, y, A.w - 12, rowH - 4, 10).fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.stroke(); }
      else if (i % 2 === 0) { ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(A.x + 6, y, A.w - 12, rowH - 4, 10).fill(); }
      const cy = y + (rowH - 4) / 2;
      D.sphere(A.x + 30, cy, 4 + p.R * 17, p.c, { shadow: true });
      D.text(A.x + 56 + (PHONE ? -6 : 8), cy + 5, p.n, { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
      const num = (ci, s, col) => D.text(A.x + cols[ci][1] + cols[ci][2] / 2, cy + 5, s, { size: 14, weight: 800, color: col || '#1e293b' });
      num(1, p.R.toFixed(2));
      if (PHONE) { num(2, String(p.v)); num(3, hideAtm ? '?' : p.atm, hideAtm ? '#7c3aed' : undefined); num(4, p.T.replace('약 ', '≈').replace('평균 ', '')); }
      else { num(2, String(p.g)); num(3, String(p.v)); num(4, hideAtm ? '?' : p.atm, hideAtm ? '#7c3aed' : undefined); num(5, p.T); }
      const ac = cols[cols.length - 1], lines = wrapLines(p.act + (PHONE ? '' : ' · ' + p.mag), ac[2] - 8, 12.5, 700);
      lines.forEach((l, k) => D.text(A.x + ac[1], cy + 5 - (lines.length - 1) * 8 * FS + k * 15.5 * FS, l, { size: 12.5, weight: 700, color: '#334155', align: 'left' }));
    });
    // 냉각 속도 그래프
    card(B, '⏱️ 냉각 속도 지표 ∝ 표면적 / 부피 ∝ 1/R');
    const gx = B.x + 52, gy = B.y + 44, gw = B.w - 74, gh = B.h - 90;
    const X = (R) => gx + (gw * (R - 0.2)) / 1.0, Y = (v) => gy + gh - (gh * (v - 0.5)) / 4.7;
    ctx.fillStyle = '#f8fafc'; rr(gx, gy, gw, gh, 4).fill();
    [1, 2, 3, 4, 5].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); D.text(gx - 6, Y(v) + 4.5, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2].forEach((R) => D.text(X(R), gy + gh + 15 * FS, R.toFixed(1), { size: 12, weight: 700, color: '#64748b' }));
    D.text(gx + gw / 2, gy + gh + 30 * FS, '반지름 R (지구 = 1)', { size: 12, weight: 700, color: '#64748b' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const R = 0.2 + (i / 60) * 1.0, x = X(R), y = Y(idxOf(R)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    const LOFF = [[9, -7, 'left'], [-9, 4, 'right'], [9, 16, 'left'], [-8, -9, 'right'], [9, -9, 'left']];
    COOLP.forEach((q, i) => { const x = X(q.R), y = Y(idxOf(q.R)); D.sphere(x, y, 5, '#64748b', { gloss: false }); D.text(x + LOFF[i][0], y + LOFF[i][1], q.n, { size: 12, weight: 800, color: '#475569', align: LOFF[i][2] }); });
    const sx = X(S.R), sy = Y(idxOf(S.R));
    D.dashedLine(sx, gy, sx, gy + gh, { color: '#7c3aed', width: 2 });
    D.sphere(sx, sy, 7, '#7c3aed', { shadow: true });
    D.label(clamp(sx, gx + 52, gx + gw - 52), gy + 38 * (PHONE ? 1.1 : 1), 'R ' + S.R.toFixed(2) + ' → ' + idxOf(S.R).toFixed(2), { bg: '#7c3aed', size: 12.5, pad: 7 });
    D.text(gx + 6, gy + 16, '작은 천체일수록 빨리 식어요', { size: 12, weight: 700, color: '#0369a1', align: 'left' });
    // 탈출 속도
    card(C, '🚀 탈출 속도 (km/s)');
    const bars = [PL[0], PL[3], PL[1], PL[2]], bx = C.x + 70, bw = C.w - 100, by = C.y + 46, bp = (C.h - 90) / 4;
    bars.forEach((p, i) => {
      const y = by + i * bp, w = (bw * p.v) / 12, near = S.near === p.id;
      D.text(C.x + 14, y + bp * 0.45 + 4, p.n, { size: 13, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(bx, y + 4, bw, bp - 14, 5).fill();
      ctx.fillStyle = near ? '#7c3aed' : p.c; rr(bx, y + 4, w, bp - 14, 5).fill();
      D.text(bx + w + 6 > C.x + C.w - 36 ? bx + w - 6 : bx + w + 6, y + bp * 0.45 + 4, p.v.toFixed(1), { size: 13, weight: 800, color: bx + w + 6 > C.x + C.w - 36 ? '#fff' : '#334155', align: bx + w + 6 > C.x + C.w - 36 ? 'right' : 'left' });
    });
    D.text(C.x + C.w / 2, C.y + C.h - 14, '클수록 같은 조건에서 대기를 붙잡기 쉬워요', { size: 12.5, weight: 800, color: '#0369a1' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { magma: '🔥 마그마 바다', gas: '💨 원시 대기', ocean: '🌧️ 원시 바다', planets: '🪐 행성 비교' };
  const FREE_KEYS = { magma: ['sT'], gas: ['ordgas'], ocean: ['sTe', 'sC'], planets: ['sR'] };
  let ctlKeys = [];
  const stpP = makeStepper($('#stpP'), { min: 0, max: 350, step: 10, value: 0, unit: '기압', dec: 0 });
  const clsMag = makeClassify($('#clsMag'), [
    { id: 'ol', label: '감람석 · 밀도 약 3.3' }, { id: 'px', label: '휘석 · 밀도 약 3.3 (예시)' }, { id: 'pl', label: '사장석 · 밀도 약 2.7' }, { id: 'kf', label: '칼륨 장석 · 밀도 약 2.6' },
  ], [{ id: 'sink', label: '가라앉음' }, { id: 'float', label: '뜸' }], { ol: 'sink', px: 'sink', pl: 'float', kf: 'float' }, () => { S.bad = []; });
  const ordGas = makeOrder($('#ordGas'), [{ id: 'n2', label: '질소 (N₂)' }, { id: 'o2', label: '산소 (O₂)' }, { id: 'h2o', label: '수증기 (H₂O)' }, { id: 'co2', label: '이산화 탄소 (CO₂)' }], ['h2o', 'co2', 'n2', 'o2'], () => { });
  const pairAtm = makePair($('#pairAtm'), PL.map((p) => ({ id: p.id, label: p.n + ' (R ' + p.R.toFixed(2) + ', 탈출 속도 ' + p.v + ' km/s)' })),
    [{ id: 'a0', label: '거의 0 기압' }, { id: 'a1', label: '0.006 기압' }, { id: 'a2', label: '1 기압' }, { id: 'a3', label: '92 기압' }], { me: 'a0', ve: 'a3', ea: 'a2', ma: 'a1' }, () => { });
  const clsEv = makeClassify($('#clsEv'), [
    { id: 'e1', label: '충분히 커서 내부 열이 오래 보존됐어요' }, { id: 'e2', label: '태양에서 적당한 거리라 액체 물이 있을 수 있었어요' }, { id: 'e3', label: '중력이 커서 바다와 대기를 붙잡았어요' },
    { id: 'e4', label: '지구형 행성 중 가장 작아서 빨리 식었어요' }, { id: 'e5', label: '바다가 모두 증발해 사라졌어요' }, { id: 'e6', label: '태양에서 가장 멀리 있어요' },
  ], [{ id: 'y', label: '근거 맞음' }, { id: 'n', label: '근거 아님' }], { e1: 'y', e2: 'y', e3: 'y', e4: 'n', e5: 'n', e6: 'n' }, () => { S.bad = []; });
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode] : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); if (m === 'gas') gasReset(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); updateCtl(); }));
  SciSim.bindRange($('#sT'), $('#oT'), (v) => v + ' K', (v) => { S.T = v; });
  SciSim.bindRange($('#sTe'), $('#oTe'), (v) => v + ' °C', (v) => { S.Te = v; });
  SciSim.bindRange($('#sC'), $('#oC'), (v) => v + ' %', (v) => { S.c = v; });
  SciSim.bindRange($('#sR'), $('#oR'), (v) => (+v).toFixed(2), (v) => { S.R = v; nearUpd(); });
  const nearUpd = () => { const p = COOLP.find((q) => Math.abs(q.R - S.R) < 0.0051); const m = { 수성: 'me', 금성: 've', 지구: 'ea', 화성: 'ma' }; S.near = p ? m[p.n] || null : null; };
  function setT(v) { S.T = v; setSlider($('#sT'), $('#oT'), v, (x) => x + ' K'); }
  function setTe(v) { S.Te = v; setSlider($('#sTe'), $('#oTe'), v, (x) => x + ' °C'); }
  function setC(v) { S.c = v; setSlider($('#sC'), $('#oC'), v, (x) => x + ' %'); }
  function setRr(v) { S.R = v; setSlider($('#sR'), $('#oR'), v, (x) => (+x).toFixed(2)); nearUpd(); }
  $$('#presets .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setRr(+b.dataset.r); }));
  $('#bReveal').addEventListener('click', () => { Sound.click(); if (!ordGas.complete()) { say('먼저 4가지 성분의 순서를 모두 정해 주세요.', true); return; } S.revealed = true; });
  $('#bOrdReset').addEventListener('click', () => { Sound.click(); ordGas.reset(); S.revealed = false; gasReset(); });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    setT(1500); S.crustK = 0; CRY.forEach((c) => { c.on = false; c.g = 0; c.rest = false; }); clsMag.reset();
    gasReset(); ordGas.reset(); S.revealed = false; S.revK = 0;
    setTe(800); setC(0); S.ocK = 0; S.rain = 0; pSpr.value = pSpr.target = pTot(800, 0); stpP.reset();
    setRr(1); pairAtm.reset(); clsEv.reset(); S.showAtm = true;
    if (li === 0) { setMode('magma'); setCtl(['sT']); showHint('온도를 낮춰 마그마 바다를 식혀 봐요', 5000); }
    else if (li === 1) { setMode('gas'); setCtl(['ordgas']); showHint('마그마에서 나오는 기체의 많은 순서를 예측해 봐요', 5000); }
    else if (li === 2) { setMode('ocean'); setCtl(['sTe']); showHint('지표 온도를 낮춰 수증기가 어떻게 되는지 봐요', 5000); }
    else { setMode('planets'); setCtl(['sR']); }
    updateCtl();
  }
  const levels = [
    {
      title: '마그마 바다: 식으며 굳다', short: '마그마 바다', icon: '🔥', phase: '모형', features: ['magma'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 재료로 태어난 지구형 행성 중 왜 지구만 바다와 판구조, 생명을 가진 역동적인 행성이 되었을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시와 지구과학에서</b> 집적과 분화로 원시 지구가 녹은 <b>마그마 바다</b> 상태가 된 것을, 그리고 마그마가 식으며 광물이 만들어져 화성암이 되는 것을 배웠어요. 이번에는 마그마 바다가 식으며 <b>지각·대기·바다</b>가 차례로 생기는 과정을 따라가요.</div>' +
        '<p>이번 차시는 <b>지구에 생명체가 탄생하기 전</b>까지의 권역 형성만 다뤄요. 먼저 마그마 바다가 식으면 어떻게 암석이 만들어지는지 살펴봐요. 마그마 속에 생긴 결정은 마그마(밀도 약 2.8 g/cm³)보다 무거우면 가라앉고 가벼우면 떠올라요.</p>',
      setup() { resetStep(0); },
      recap: '마그마 바다가 식으며 결정이 생기고, 무거운 결정은 가라앉고 가벼운 결정은 떠올라 표면에 굳어 원시 지각이 만들어졌어요.',
      summary: '<ul><li>마그마 바다가 식으면 <b>결정이 정출</b>해요(예시: 약 1400 K부터). 마그마 밀도 약 2.8 g/cm³보다 무거운 <b>감람석(약 3.3)</b>은 가라앉고, 가벼운 <b>사장석(약 2.7)</b>은 떠올라 표면에 모여 굳어 <b>원시 지각</b>이 돼요.</li><li>이렇게 마그마 바다에서 <b>화성암</b>이 만들어졌어요. 원시 지각은 오늘날의 대륙과는 달라요.</li><li>가장 오래된 암석은 약 40억 년(캐나다 아카스타 편마암), 가장 오래된 광물 알갱이(지르콘)는 약 44억 년 → 그때 이미 <b>액체 물</b>이 있었다는 단서예요.</li><li>지구시스템 연계: 마그마(지권)가 식어 만든 암석 표면이 이후 대기·바다와 상호작용하며 변해요.</li></ul>',
      missions: [
        {
          title: '마그마 바다를 식혀 원시 지각 만들기',
          goal: '표면 온도를 <b>1100 K 이하</b>로 낮춰 마그마 바다 위에 <b>원시 지각</b>이 굳게 해요.',
          hint: '슬라이더를 왼쪽 끝(1000 K) 쪽으로 천천히 밀어요. 결정이 생기고 나서 표면이 굳어요.',
          setup() { setT(1500); S.crustK = 0; setMode('magma'); setCtl(['sT']); },
          check: () => S.T <= T_CRUST && S.crustK >= 0.98, hold: 0.5,
          status: () => mark(S.T <= T_CRUST) + ' 표면 온도 ' + S.T + ' K (목표 1100 K 이하) · ' + mark(S.crustK >= 0.98) + ' 원시 지각 ' + Math.round(S.crustK * 100) + ' %',
          explain: '마그마 바다가 식으며 <b>결정이 정출</b>했어요. 가벼운 사장석 결정이 표면에 모여 굳으면서 <b>원시 지각</b>이 만들어졌어요. 무거운 감람석은 아래로 가라앉아 쌓였어요.',
        },
        {
          title: '가라앉을까, 뜰까?', manual: true,
          goal: '마그마의 밀도(약 2.8 g/cm³)와 비교해 결정 4가지가 <b>가라앉는지, 뜨는지</b> 분류해요.',
          hint: '결정의 밀도가 마그마의 2.8보다 크면 가라앉고, 작으면 떠요.',
          setup() { clsMag.reset(); S.bad = []; setMode('magma'); setCtl(['sT', 'clsmag']); },
          status: () => mark(clsMag.ok()) + ' 분류한 결정 ' + clsMag.count() + ' / 4',
          check() {
            if (!clsMag.complete()) return '결정 4가지를 모두 분류해 주세요. (지금 ' + clsMag.count() + '개)';
            const w = clsMag.wrong(); clsMag.mark(w);
            if (w.length) return '빨간 결정 ' + w.length + '개를 다시 확인해 보세요. 2.8과 비교해요.';
            return true;
          },
          explain: '감람석·휘석(약 3.3)은 마그마(약 2.8)보다 무거워 <b>가라앉고</b>, 사장석(약 2.7)·칼륨 장석(약 2.6)은 가벼워 <b>떠올라요</b>. 밀도 차이로 결정이 위아래로 나뉘어요.',
        },
        {
          type: 'quiz', title: '원시 지각은 어떤 모습이었을까',
          goal: '마그마 바다가 식어 만들어진 <b>원시 지각</b>에 대한 설명으로 알맞은 것은?',
          setup() { setMode('magma'); setCtl(['sT']); },
          choices: ['마그마가 식으며 결정이 생겨, 밀도 차이로 나뉘어 굳은 화성암이에요', '처음부터 오늘날과 같은 대륙과 해양으로 나뉘어 있었어요', '마그마 바다 전체가 한꺼번에 굳어 하나의 암석이 되었어요', '결정은 밀도와 관계없이 마그마 속에 고르게 퍼져 있었어요'],
          answer: 0,
          feedback: ['', '대륙은 오랜 시간 동안 만들어진 것으로, 원시 지각은 지금의 대륙과 달랐어요.', '결정은 천천히 정출했고, 무거운 것과 가벼운 것이 나뉘었어요.', '밀도 차이 때문에 무거운 결정은 가라앉고 가벼운 결정은 떠올라요.'],
          explain: '마그마 바다에서는 결정이 생기며 <b>밀도 차이</b>로 가라앉거나 떠올랐고, 표면에 굳은 <b>화성암</b>이 원시 지각이 되었어요. 처음부터 지금과 같은 대륙이었던 것은 아니에요.',
        },
      ],
    },
    {
      title: '원시 대기: 마그마에서 나온 기체', short: '원시 대기', icon: '💨', phase: '예측', features: ['gas'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마그마 바다가 식어 표면에 원시 지각이 생겼어요. 집적과 마그마 바다에서는 갇혀 있던 <b>휘발 성분</b>이 새어 나와요(탈기).</div>' +
        '<p>태양 성운의 수소·헬륨으로 이루어진 처음 대기는 태양풍과 약한 중력 때문에 사라졌어요. 대신 마그마에서 빠져나온 기체가 <b>원시 대기</b>가 되었어요. 어떤 기체가 가장 많았을까요? 먼저 <b>예측</b>하고 확인해 봐요.</p>',
      setup() { resetStep(1); },
      recap: '원시 대기는 마그마에서 빠져나온 수증기(가장 많음), 이산화 탄소, 질소 등으로 이루어졌고 산소는 거의 없었어요.',
      summary: '<ul><li>성운의 수소·헬륨 대기는 <b>태양풍과 약한 중력</b>으로 사라졌어요.</li><li>집적·마그마 바다에서 새어 나온 휘발 성분이 <b>원시 대기</b>: 수증기(H₂O)가 가장 많고, 이산화 탄소(CO₂), 질소(N₂) 순. <b>산소(O₂)는 거의 없었어요</b>. 예시: 수증기 약 270, CO₂ 약 60, N₂ 약 1 기압.</li><li>오늘날 대기는 N₂ 78 %, O₂ 21 %로 원시 대기와 완전히 달라요.</li><li>지구시스템 연계: 지권(마그마)에서 기권(대기)이 만들어졌어요.</li></ul>',
      missions: [
        {
          title: '원시 대기 성분 예측하기', manual: true,
          goal: '마그마에서 나온 원시 대기에 <b>많은 기체부터 1, 2, 3, 4</b> 순서를 정하고, <b>“결과 보기”</b>를 눌러 확인해요.',
          hint: '화산에서 나오는 가스를 떠올려 봐요. 가장 많은 것은 물이 기체가 된 것이에요. 산소는 어떨까요?',
          setup() { ordGas.reset(); S.revealed = false; gasReset(); setMode('gas'); setCtl(['ordgas']); },
          status: () => mark(ordGas.ok()) + ' 순서 ' + ordGas.seq.length + ' / 4 · ' + mark(S.revealed) + ' 결과 확인',
          check() {
            if (!ordGas.complete()) return '4가지 성분의 순서를 모두 정해 주세요. (지금 ' + ordGas.seq.length + '개)';
            if (!ordGas.ok()) { ordGas.mark(ordGas.seq.find((id, i) => id !== ordGas.answerIds[i])); return '순서가 달라요. 빨간 성분의 순서를 다시 생각해 보세요.'; }
            if (!S.revealed) return '“결과 보기”를 눌러 막대로 확인해 주세요.';
            return true;
          },
          explain: '원시 대기는 <b>수증기(H₂O) &gt; 이산화 탄소(CO₂) &gt; 질소(N₂)</b> 순으로 많았고(예시: 약 270, 60, 1 기압) <b>산소(O₂)는 거의 없었어요</b>. 오늘날 대기(N₂ 78 %, O₂ 21 %)와 크게 달라요.',
        },
        {
          type: 'quiz', title: '원시 대기에 산소가 없었던 까닭',
          goal: '원시 대기에 산소가 거의 없었던 까닭으로 알맞은 것은?',
          setup() { S.revealed = true; setMode('gas'); setCtl(['ordgas']); },
          choices: ['대기는 처음부터 오늘날과 같았기 때문이에요', '마그마에서 나온 기체에는 산소가 거의 없었고, 산소를 만드는 생물도 아직 없었기 때문이에요', '산소는 태양풍에 모두 날아갔기 때문이에요', '산소가 있었지만 바다에 모두 녹았기 때문이에요'],
          answer: 1,
          feedback: ['원시 대기는 오늘날과 완전히 달랐어요.', '', '태양풍에 사라진 것은 가벼운 수소·헬륨이에요.', '이때는 아직 바다도 없었고, 산소는 광합성 생물이 나타난 뒤에 늘어나요.'],
          explain: '원시 대기는 마그마에서 나온 기체(수증기·CO₂·N₂ 등)로 이루어져 <b>산소가 거의 없었어요</b>. 산소는 광합성을 하는 생물이 나타난 뒤에야 늘어나요(다음 차시).',
        },
      ],
    },
    {
      title: '원시 바다: 식어서 비가 내리다', short: '원시 바다', icon: '🌧️', phase: '모형', features: ['ocean'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원시 대기는 수증기가 가장 많았어요. 지구의 물이 모두 수증기였다면 지표의 압력은 p = Mg/A = (1.4×10²¹ kg × 9.8)/(5.1×10¹⁴ m²) ≈ 2.7×10⁷ Pa, 곧 약 <b>270 기압</b>이에요.</div>' +
        '<p>지표가 식어 물의 <b>임계 온도 374 °C</b> 아래로 내려가면 수증기가 응결해 뜨거운 비가 되고 <b>원시 바다</b>가 생겨요. 바다가 생긴 뒤에는 대기의 CO₂가 바닷물에 녹고 칼슘 이온과 결합해 <b>탄산염(석회암)</b>으로 가라앉아요.</p>',
      setup() { resetStep(2); },
      recap: '지표가 374 °C 아래로 식으면 수증기가 응결해 비와 바다가 생기고, 바다에 CO₂가 녹아 탄산염으로 묻히면서 대기압이 크게 줄었어요.',
      summary: '<ul><li>물이 모두 수증기였다면 지표 압력은 약 <b>270 기압</b>. 지표가 물의 임계 온도 <b>374 °C</b> 아래로 식으면 수증기가 응결해 <b>비 → 원시 바다</b>.</li><li>응결 뒤 남은 대기: CO₂ 약 60 기압 + N₂ 약 1 기압 → 약 <b>60 기압</b>.</li><li>바다가 CO₂를 녹이고 칼슘 이온과 결합해 <b>탄산염(석회암)으로 퇴적</b> → 대기 CO₂가 줄어 오늘날 0.04 %(0.0004 기압). 암석에 갇힌 CO₂ 양은 약 60 기압 상당으로, 금성 대기의 CO₂(약 90 기압)와 비슷한 양이에요.</li><li>권역 간 상호작용: 기권(수증기·CO₂) ↔ 수권(바다) ↔ 지권(탄산염 암석). 최초 생명 흔적은 약 38억~35억 년 전이에요.</li></ul>',
      missions: [
        {
          title: '지표를 식혀 바다 만들기',
          goal: '지표 온도를 <b>374 °C 아래</b>로 낮춰 수증기가 응결해 <b>원시 바다</b>가 생기게 해요.',
          hint: '슬라이더를 왼쪽으로 밀어요. 임계 온도 374 °C(눈금 가운데보다 약간 왼쪽) 아래로 내려가면 비가 내려요.',
          setup() { setTe(800); S.ocK = 0; setMode('ocean'); setCtl(['sTe']); },
          check: () => S.Te < 374, hold: 0.8,
          status: () => mark(S.Te < 374) + ' 지표 온도 ' + S.Te + ' °C (목표 374 °C 미만) · 바다 ' + Math.round(fOcean(S.Te) * 100) + ' %',
          explain: '물의 임계 온도 <b>374 °C</b> 아래로 식으면 수증기가 응결해 뜨거운 비가 내리고 <b>원시 바다</b>가 생겨요. 더 식을수록 바다의 물이 늘고 대기 중 수증기는 줄어요.',
        },
        {
          title: '응결 뒤 남은 대기압',
          goal: '지표 온도를 <b>100 °C 이하</b>로 낮추고(바다에 묻힌 CO₂는 0 %), 계기판에 보이는 대기압을 <b>10 기압 단위로 어림해</b> 입력해요.',
          hint: '물이 거의 응결하면 남는 것은 CO₂ 약 60 기압과 N₂ 약 1 기압이에요. 계기판 값을 가장 가까운 10의 배수로 어림해요.',
          setup() { setTe(800); setC(0); stpP.reset(); S.ocK = 0; setMode('ocean'); setCtl(['sTe', 'stpP']); },
          check: () => S.Te <= 100 && S.c === 0 && stpP.value === 60, hold: 0.8,
          status: () => mark(S.Te <= 100) + ' 지표 ' + S.Te + ' °C · ' + mark(S.c === 0) + ' 묻힌 CO₂ ' + S.c + ' % · ' + mark(stpP.value === 60) + ' 입력 ' + stpP.value + ' 기압 (계기판 ' + fp(pTot(S.Te, S.c)) + ' 기압)',
          explain: '바다가 생기고 나면 수증기는 대부분 사라지고 <b>CO₂ 약 60 기압 + N₂ 약 1 기압</b>이 남아 대기압은 약 <b>60 기압</b>이에요. 처음 270 기압보다 크게 줄었어요.',
        },
        {
          type: 'quiz', title: '바다가 CO₂를 줄인 방법',
          goal: '바다가 생긴 뒤 대기의 CO₂가 크게 줄어 오늘날 0.04 %가 된 과정으로 알맞은 것은? (CO₂ 슬라이더로 확인해요.)',
          setup() { setMode('ocean'); setCtl(['sTe', 'sC']); setTe(100); },
          choices: ['CO₂가 우주로 모두 날아갔어요', 'CO₂가 바닷물에 녹고 칼슘 이온과 결합해 탄산염(석회암)으로 퇴적되었어요', 'CO₂가 모두 산소로 바뀌었어요', '바다가 생겨도 CO₂는 그대로 60 기압이었어요'],
          answer: 1,
          feedback: ['CO₂는 무거워서 우주로 쉽게 빠져나가지 않아요. 암석 속에 갇혔어요.', '', '산소는 이때 만들어지지 않았어요. 산소는 광합성 생물이 나타난 뒤에 늘어나요.', '바다가 CO₂를 녹이고 묻으면서 대기 CO₂가 줄었어요.'],
          explain: '기권의 CO₂가 수권(바다)에 녹고, 칼슘 이온과 결합해 지권에 <b>탄산염 암석</b>으로 쌓였어요. 이렇게 <b>기권·수권·지권이 서로 작용</b>하며 대기압이 약 1 기압으로 줄었어요.',
        },
      ],
    },
    {
      title: '행성 비교: 왜 지구만?', short: '행성 비교', icon: '🪐', phase: '분석', features: ['planets'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구는 마그마 바다에서 원시 지각·대기·바다가 차례로 생겼어요. 같은 재료로 태어난 다른 <b>고체 행성</b>은 어떻게 되었을까요?</div>' +
        '<p>수성·금성·지구·화성은 모두 암석으로 이루어진 행성이지만 오늘날 모습이 아주 달라요. <b>크기, 태양과의 거리, 대기와 바다</b>에 따라 어떻게 달라졌는지 표와 그래프로 비교해 지구가 <b>역동적인 행성</b>이 된 이유를 찾아봐요. (표의 값은 예시 자료예요.)</p>',
      setup() { resetStep(3); S.showAtm = false; },
      recap: '지구는 충분히 커서 내부 열이 오래 남아 판구조와 자기장이 유지되고, 태양에서 적당한 거리라 액체 물이 있어 바다와 대기를 유지했어요.',
      summary: '<table class="mini"><tr><th></th><th>수성</th><th>금성</th><th>지구</th><th>화성</th></tr><tr><td>반지름(지구=1)</td><td>0.38</td><td>0.95</td><td>1.00</td><td>0.53</td></tr><tr><td>탈출 속도(km/s)</td><td>4.3</td><td>10.4</td><td>11.2</td><td>5.0</td></tr><tr><td>대기압(기압)</td><td>거의 0</td><td>92</td><td>1</td><td>0.006</td></tr><tr><td>판구조·활동</td><td>없음</td><td>판구조 없음</td><td>활발</td><td>과거 활발</td></tr></table><ul><li>냉각 속도 지표 ∝ 표면적/부피 ∝ 1/R: 지구 1.0, 금성 1.05, 화성 1.9, 수성 2.6, 달 3.7 (작을수록 빨리 식음).</li><li>금성은 태양에 가까워(받는 에너지 지구의 약 1.9배) 바다가 증발하고 수증기가 분해되어 수소가 우주로 빠져나갔어요.</li><li>지구가 역동적인 이유: 충분한 크기 → 내부 열 보존 → 맨틀 대류·판구조·자기장 / 적당한 태양 거리 → 액체 물 / 바다와 대기 유지.</li></ul>',
      missions: [
        {
          title: '행성과 대기압 짝짓기', manual: true,
          goal: '네 행성의 크기와 탈출 속도를 보고 <b>대기압</b>을 짝지어요. 표에서 ‘?’였던 칸이 채워져요.',
          hint: '탈출 속도가 작은 천체는 대기를 붙잡기 어려워 대기가 거의 없어요. 금성은 이산화 탄소 대기가 아주 두꺼워요.',
          setup() { pairAtm.reset(); S.showAtm = false; setMode('planets'); setCtl(['sR', 'pairatm']); },
          status: () => mark(pairAtm.ok()) + ' 짝지은 행성 ' + pairAtm.count() + ' / 4',
          check() {
            if (!pairAtm.complete()) return '행성 4개를 모두 짝지어 주세요. (지금 ' + pairAtm.count() + '개)';
            const w = pairAtm.wrong(); pairAtm.mark(w);
            if (w.length) return '빨간 행성 ' + w.length + '개를 다시 확인해 보세요. 탈출 속도가 작을수록 대기가 얇아요.';
            return true;
          },
          explain: '수성(거의 0)은 크기가 작고 탈출 속도(4.3 km/s)가 작아 대기를 붙잡지 못했어요. 화성(0.006)도 작고, 금성은 CO₂ 대기가 <b>92 기압</b>, 지구는 <b>1 기압</b>이에요.',
        },
        {
          title: '지구가 역동적인 이유 고르기', manual: true,
          goal: '아래 6가지 중 <b>지구가 역동적인 행성이 된 이유로 맞는 근거</b>와 아닌 것을 분류해요.',
          hint: '크기 → 내부 열과 판구조·자기장, 태양과의 거리 → 액체 물, 중력 → 바다·대기 유지를 떠올려 봐요. 금성과 화성의 경우는 지구와 다른 이유예요.',
          setup() { clsEv.reset(); S.bad = []; S.showAtm = true; setMode('planets'); setCtl(['sR', 'clsev']); },
          status: () => mark(clsEv.ok()) + ' 분류한 근거 ' + clsEv.count() + ' / 6',
          check() {
            if (!clsEv.complete()) return '6가지를 모두 분류해 주세요. (지금 ' + clsEv.count() + '개)';
            const w = clsEv.wrong(); clsEv.mark(w);
            if (w.length) return '빨간 항목 ' + w.length + '개를 다시 확인해 보세요. 지구의 이유인지, 다른 행성의 이유인지 생각해 봐요.';
            return true;
          },
          explain: '지구는 <b>충분히 커서 내부 열이 오래 남아</b> 맨틀 대류·판구조·자기장이 유지되고, <b>태양에서 적당한 거리</b>라 액체 물이 있으며, 중력이 커서 <b>바다와 대기를 붙잡았어요</b>. 작아서 빨리 식은 것은 수성·화성의 이유이고, 바다가 증발한 것은 금성의 이유예요.',
        },
        {
          type: 'quiz', title: '화성이 빨리 식은 까닭',
          goal: '화성은 지구보다 훨씬 빨리 식어 지금은 화산 활동이 거의 없어요. 그 까닭으로 알맞은 것은? (반지름 슬라이더로 냉각 속도 지표를 비교해 봐요.)',
          setup() { S.showAtm = true; setMode('planets'); setCtl(['sR']); setRr(0.53); },
          choices: ['화성은 표면적/부피 비가 커서 내부 열이 더 빨리 빠져나갔기 때문이에요', '화성에는 철이 하나도 없기 때문이에요', '화성에 바다가 너무 많기 때문이에요', '화성은 태양과 가장 가깝기 때문이에요'],
          answer: 0,
          feedback: ['', '냉각 속도는 주로 크기와 관련이 있어요. 화성 내부에도 철이 있어요.', '화성은 오히려 물이 거의 없어요.', '화성은 지구보다 태양에서 멀어요. 크기가 작아서 식는 속도가 빠른 거예요.'],
          explain: '작은 천체일수록 부피에 비해 표면적이 커서(<b>표면적/부피 ∝ 1/R</b>) 내부 열이 빨리 빠져나가요. 화성은 지구의 약 0.53배 크기로 냉각 지표가 약 1.9라 판구조와 화산 활동이 일찍 멈췄어요. 금성은 크기는 지구와 비슷하지만 태양에 가까워 바다가 증발했어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-early-earth', mount: '#game', badge: '지구 진화 탐정', homeHref: '../../index.html#hs',
    featureLabels: { magma: '🔥 마그마 바다 · 결정 정출', gas: '💨 원시 대기 · 탈기', ocean: '🌧️ 원시 바다 · 대기압 계기', planets: '🪐 고체 행성 비교표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'magma') { const n = CRY.filter((c) => c.on).length; setReadouts(['표면 온도', S.T + ' K', '결정', n + '개', '상태', S.crustK >= 0.98 ? '원시 지각 형성' : S.T <= T_CRY0 ? '결정 정출 중' : '마그마 바다']); }
    else if (m === 'gas') setReadouts(['나온 기체', G2.dots.length + '개', '예측한 순서', ordGas.seq.length + ' / 4', '결과', S.revealed ? '확인함' : '아직']);
    else if (m === 'ocean') setReadouts(['지표 온도', S.Te + ' °C', '총 대기압', fp(pTot(S.Te, S.c)) + ' 기압', '바다', Math.round(fOcean(S.Te) * 100) + ' %']);
    else setReadouts(['반지름 R', S.R.toFixed(2), '냉각 속도 지표 1/R', idxOf(S.R).toFixed(2), '가까운 천체', S.near ? PL.find((p) => p.id === S.near).n : (COOLP.find((q) => Math.abs(q.R - S.R) < 0.0051) || { n: '—' }).n]);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'magma') drawMagma(t, dt);
    else if (S.mode === 'gas') drawGas(t, dt);
    else if (S.mode === 'ocean') drawOcean(t, dt);
    else drawPlanets(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, CRY, G2, stpP, clsMag, ordGas, pairAtm, clsEv, fOcean, pH2O, pCO2, pTot, psat, PL, RC1, RC2, RC3, RC4,
    get game() { return game; }, setMode, setT, setTe, setC, setRr, resetStep, updateCtl,
    solveMag() { clsMag.sel = { ol: 'sink', px: 'sink', pl: 'float', kf: 'float' }; },
    solveOrd() { ordGas.seq = ['h2o', 'co2', 'n2', 'o2']; },
    solvePair() { pairAtm.map = { me: 'a0', ve: 'a3', ea: 'a2', ma: 'a1' }; },
    solveEv() { clsEv.sel = { e1: 'y', e2: 'y', e3: 'y', e4: 'n', e5: 'n', e6: 'n' }; },
  };
})();
