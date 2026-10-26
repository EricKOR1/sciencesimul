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

  /* ---------- 추가 도우미 ---------- */
  const $in = (sel) => { const e = $(sel); const v = e ? parseFloat(String(e.value).replace(',', '.')) : NaN; return isFinite(v) ? v : null; };
  const near = (v, a, tol) => v != null && Math.abs(v - a) <= tol + 1e-9;
  function bindSeg(sel, attr, onPick) { $$(sel + ' .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); onPick(b.dataset[attr]); })); }
  function syncSeg(sel, attr, val) { $$(sel + ' .opt').forEach((b) => b.classList.toggle('on', b.dataset[attr] === String(val))); }
  const fx = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const minus = (s) => String(s).replace('-', '−');
  /* 입력칸을 고치면 빨간 표시를 지워요 */
  function clearBadOnInput(sel) { $$(sel).forEach((e) => e.addEventListener('input', () => e.classList.remove('bad'))); }
  function markBad(sel, bad) { const e = $(sel); if (e) e.classList.toggle('bad', !!bad); }
  /* 부드러운 숫자 */
  const rollers = {};
  function roll(key, target, dt, rate) { const r = rollers[key] || (rollers[key] = { v: target }); r.v = RM ? target : SciSim.approach(r.v, target, dt, rate || 9); return r.v; }
  /* 화면 가장자리 안으로 라벨 위치 묶기 */
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  /* 작은 클릭 파티클 */
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

  /* ======================================================
     안개·구름 생성과 강수 (응결 고도 → 푄 현상 → 안개 → 강수 과정)
     ====================================================== */
  initStage('#eef3f9', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  let game = null;
  const es = (T) => 6.112 * Math.exp((17.62 * T) / (243.12 + T));
  const rh = (T, Td) => clamp((100 * es(Td)) / es(T), 0, 100);
  const GD = 0.010, GM = 0.005, GDEW = 0.002;

  const S = {
    mode: 'lcl', fade: 0, clock: 0,
    T: 25, Td: 17, z: 0, zEnd: 1700, seenLcl: {},
    pos: 0, posV: 0, fPlay: false, rec: { crest: null, foot: null },
    fog: 'rad', cloud: 0, wind: 1, hour: 0, fogSeen: {}, fogEver: false,
    ctype: 'warm', gnd: 'warm', run: null, ev: { warmRain: false, coldRain: false, coldSnow: false },
  };
  const lclOf = (T, Td) => 125 * Math.max(0, T - Td);

  /* ======================================================
     장면 1: 응결 고도
     ====================================================== */
  const RC1 = PHONE
    ? { L: { x: 8, y: 8, w: 504, h: 300 }, G: { x: 8, y: 316, w: 504, h: 396 } }
    : { L: { x: 12, y: 12, w: 330, h: 536 }, G: { x: 350, y: 12, w: 438, h: 536 } };
  const ZMAX = 5000;
  function colG(Pn) { const c = { x: Pn.x + 10, y: Pn.y + 38, w: Pn.w - 20, h: Pn.h - 48 }; c.gy = c.y + c.h - 30; c.Y = (z) => c.gy - ((c.gy - c.y - 18) * z) / ZMAX; c.cx = c.x + c.w * (PHONE ? 0.42 : 0.45); return c; }
  const tCol = (T) => mixc('#38bdf8', '#f97316', clamp((T - 5) / 30, 0, 1));
  function drawBalloon(x, y, r, T, sat, t) {
    D.glow(x, y, r * 2, tCol(T), 0.35); D.sphere(x, y, r, tCol(T), { shadow: true });
    if (sat) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.clip(); for (let k = 0; k < 9; k++) { const a = k * 2.4 + t * 0.6, r0 = r * 0.6 * ((k % 3) / 3 + 0.3); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r0, y + Math.sin(a) * r0, 2.2, 0, TAU); ctx.fill(); } ctx.restore(); }
  }
  function drawCloud(cx, cy, s, a) {
    ctx.save(); ctx.globalAlpha *= a == null ? 1 : a; ctx.fillStyle = '#fff'; ctx.beginPath();
    [[-26, 6, 18], [-8, -4, 22], [12, 0, 24], [30, 7, 17], [2, 10, 22]].forEach((c) => { ctx.moveTo(cx + c[0] * s + c[2] * s, cy + c[1] * s); ctx.arc(cx + c[0] * s, cy + c[1] * s, c[2] * s, 0, TAU); }); ctx.fill(); ctx.restore();
  }
  function restartRise() { S.z = 0; S.zEnd = Math.min(ZMAX, lclOf(S.T, S.Td) + 700); S.cloudMade = false; }
  const pT = (z, T, Td) => { const l = lclOf(T, Td); return z <= l ? T - GD * z : T - GD * l - GM * (z - l); };
  const pTd = (z, T, Td) => { const l = lclOf(T, Td); return z <= l ? Td - GDEW * z : pT(z, T, Td); };
  function drawLcl(t, dt) {
    const { L, G } = RC1, c = colG(L), lcl = lclOf(S.T, S.Td);
    const prev = S.z; S.z = Math.min(S.zEnd, S.z + 1000 * dt);
    if (prev < lcl && S.z >= lcl && lcl > 0) { S.cloudMade = true; for (let k = 0; k < 16; k++) parts.emit({ x: c.x + 30 + Math.random() * (c.w - 60), y: c.Y(lcl) + rnd(-8, 8), vx: rnd(-14, 14), vy: rnd(-8, 4), life: 1.6, size: 14, color: 'rgba(255,255,255,.9)', shape: 'smoke', grow: 12 }); }
    if (lcl === 0) S.cloudMade = true;
    const z = S.z, Tp = pT(z, S.T, S.Td), Td = pTd(z, S.T, S.Td), sat = z >= lcl - 0.5;
    card(L, '🎈 상승하는 공기 덩어리');
    ctx.save(); rr(c.x, c.y, c.w, c.h, 12).clip();
    const sk = ctx.createLinearGradient(0, c.y, 0, c.gy); sk.addColorStop(0, '#60a5fa'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    for (let km = 0; km <= 5; km++) { const y = c.Y(km * 1000); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(c.x, y); ctx.lineTo(c.x + c.w, y); ctx.stroke(); ctx.setLineDash([]); if (km) D.text(c.x + 6, y - 4, km + ' km', { size: 12, weight: 800, color: '#1e3a8a', align: 'left' }); }
    if (S.cloudMade) { ctx.globalAlpha = 0.95; for (let k = 0; k < 6; k++) drawCloud(c.x + 40 + k * ((c.w - 80) / 5), c.Y(lcl) - 14 + (k % 2) * 10, 1.1); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(30,64,175,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, c.Y(lcl)); ctx.lineTo(c.x + c.w, c.Y(lcl)); ctx.stroke(); ctx.setLineDash([]); }
    const gg = ctx.createLinearGradient(0, c.gy, 0, c.y + c.h); gg.addColorStop(0, '#6b8f4e'); gg.addColorStop(1, '#4d7c0f'); ctx.fillStyle = gg; ctx.fillRect(c.x, c.gy, c.w, 40);
    ctx.restore();
    if (S.cloudMade) D.label(c.x + c.w - 8, c.Y(lcl) + (lcl < 500 ? -14 : 14), '구름 밑면 ' + lcl + ' m', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'right' });
    const r = 15 * Math.exp(z / 9000), by = c.Y(z);
    drawBalloon(c.cx, by, r, Tp, sat, t);
    D.arrow(c.cx, by - r - 6, c.cx, by - r - 30, { color: '#f97316', width: 4, head: 11 });
    const lx = c.cx + r + 16, ly = clamp(by, c.y + 40, c.gy - 20);
    D.label(lx, ly - 12, '기온 ' + minus(fx(Tp, 1)) + ' °C', { bg: '#ea580c', size: 12.5, pad: 8, align: 'left' });
    D.label(lx, ly + 12, '이슬점 ' + minus(fx(Td, 1)) + ' °C', { bg: '#0f766e', size: 12.5, pad: 8, align: 'left' });
    D.text(c.cx, c.y + c.h - 8, '지표 T = ' + S.T + ' °C, Td = ' + S.Td + ' °C', { size: 12, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });

    // 그래프: T − Td vs 높이
    card(G, '📉 기온과 이슬점의 차이 T − Td');
    const pb = { x: G.x + 54, y: G.y + 56, w: G.w - 54 - 18, h: G.h - 56 - (PHONE ? 118 : 138) };
    const X = (zz) => pb.x + (pb.w * zz) / ZMAX, Y = (v) => pb.y + pb.h - (pb.h * v) / 40;
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 1000, 2000, 3000, 4000, 5000].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), pb.y); ctx.lineTo(X(v), pb.y + pb.h); ctx.stroke(); D.text(X(v), pb.y + pb.h + 15 * FS, String(v), { size: 12.5, weight: 700, color: '#64748b' }); });
    [0, 10, 20, 30, 40].forEach((v) => { ctx.beginPath(); ctx.moveTo(pb.x, Y(v)); ctx.lineTo(pb.x + pb.w, Y(v)); ctx.stroke(); D.text(pb.x - 6, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(pb.x + pb.w / 2, pb.y + pb.h + 32 * FS, '높이 (m)', { size: 12.5, weight: 700, color: '#64748b' }); D.text(pb.x - 6, pb.y - 10, 'T − Td (°C)', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip();
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(X(0), Y(S.T - S.Td)); ctx.lineTo(X(lcl), Y(0)); ctx.lineTo(X(ZMAX), Y(0)); ctx.stroke();
    ctx.restore(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    const cur = Math.max(0, S.T - S.Td - 0.008 * Math.min(z, lcl));
    D.sphere(X(Math.min(z, ZMAX)), Y(z >= lcl ? 0 : cur), 6.5, '#ea580c', { shadow: true });
    if (S.cloudMade) { D.dashedLine(X(lcl), Y(0), X(lcl), pb.y, { color: '#1d4ed8', width: 1.6 }); D.label(clamp(X(lcl), pb.x + 70, pb.x + pb.w - 70), pb.y + 18, 'LCL ' + lcl + ' m', { bg: '#1d4ed8', size: 12.5, pad: 8 }); }
    D.label(pb.x + 10, pb.y + 18 + (S.cloudMade ? 30 : 0), '1 km 오를 때마다 약 8 °C씩 줄어요', { bg: 'rgba(15,23,42,.7)', size: 12, pad: 7, align: 'left' });
    // 식
    const ty = G.y + G.h - (PHONE ? 84 : 98);
    ctx.fillStyle = 'rgba(14,165,233,.1)'; rr(G.x + 12, ty - 8, G.w - 24, PHONE ? 78 : 92, 10).fill();
    D.text(G.x + 24, ty + 12, '건조 단열 냉각 약 9.8 ≈ 10 °C/km, 이슬점 하강 약 1.8 ≈ 2 °C/km', { size: 12, weight: 700, color: '#334155', align: 'left' });
    D.text(G.x + 24, ty + 12 + 22 * FS * 0.9, '→ T − Td는 1 km당 약 8 °C 줄어요', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    D.text(G.x + 24, ty + 12 + 46 * FS * 0.9, 'LCL = (T − Td) / 8 °C/km = 125 × (' + S.T + ' − ' + S.Td + ') = ' + lcl + ' m', { size: PHONE ? 12.5 : 14, weight: 800, color: '#1d4ed8', align: 'left' });
  }

  /* ======================================================
     장면 2: 푄 현상
     ====================================================== */
  const RC2 = PHONE
    ? { M: { x: 8, y: 8, w: 504, h: 372 }, I: { x: 8, y: 388, w: 504, h: 324 } }
    : { M: { x: 12, y: 12, w: 776, h: 396 }, I: { x: 12, y: 416, w: 776, h: 132 } };
  const zOfU = (u) => (u < 0.5 ? 6000 * u : 6000 * (1 - u));
  function fState(u) {
    const z = zOfU(u);
    if (u <= 0.5) { const T = z <= 1000 ? 25 - GD * z : 15 - GM * (z - 1000), Td = z <= 1000 ? 17 - GDEW * z : T; return { z, T, Td, rh: z <= 1000 ? rh(T, Td) : 100, st: z <= 1000 ? '건조 단열 상승' : '습윤 단열 상승 · 구름과 비' }; }
    const T = 5 + GD * (3000 - z), Td = 5 + GDEW * (3000 - z); return { z, T, Td, rh: rh(T, Td), st: '건조 단열 하강 · 구름 없음' };
  }
  function mtnGeo() {
    const M = RC2.M, I = { x: M.x + 10, y: M.y + 36, w: M.w - 20, h: M.h - 46 }; I.gy = I.y + I.h - 22;
    I.Y = (z) => I.gy - (z / 3000) * (I.gy - I.y - 76); I.xa = I.x + I.w * 0.06; I.xc = I.x + I.w * 0.46; I.xb = I.x + I.w * 0.9;
    I.X = (u) => (u <= 0.5 ? I.xa + (I.xc - I.xa) * (u / 0.5) : I.xc + (I.xb - I.xc) * ((u - 0.5) / 0.5));
    return I;
  }
  function drawFoehn(t, dt) {
    const { M, I: IP } = RC2, I = mtnGeo();
    if (S.fPlay) { S.pos = Math.min(100, S.pos + 14 * dt); setSlider($('#sPos'), $('#oPos'), Math.round(S.pos), (v) => v + ' %'); if (S.pos >= 100) { S.fPlay = false; syncPlayF(); } }
    const prevU = S.posV / 100;
    S.posV = approach(S.posV, S.pos, dt, 12);
    const u = S.posV / 100, st = fState(u);
    if ((prevU - 0.5) * (u - 0.5) <= 0 && prevU !== u && u !== 0) { const c5 = fState(0.5); S.rec.crest = { T: c5.T, Td: c5.Td, rh: c5.rh }; }
    if (u > 0.9995) { const c1 = fState(1); S.rec.foot = { T: c1.T, Td: c1.Td, rh: c1.rh }; }
    card(M, '⛰️ 산을 넘는 바람 (지표 25 °C, 이슬점 17 °C, 산 높이 3000 m)');
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#60a5fa'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    // 산
    const mg = ctx.createLinearGradient(0, I.Y(3000), 0, I.gy); mg.addColorStop(0, '#f1f5f9'); mg.addColorStop(0.25, '#a8a29e'); mg.addColorStop(1, '#65a30d');
    ctx.fillStyle = mg; poly([[I.x, I.gy], [I.xa, I.gy], [I.xc, I.Y(3000)], [I.xb, I.gy], [I.x + I.w, I.gy], [I.x + I.w, I.y + I.h], [I.x, I.y + I.h]]); ctx.fill();
    ctx.strokeStyle = '#57534e'; ctx.lineWidth = 2; poly([[I.xa, I.gy], [I.xc, I.Y(3000)], [I.xb, I.gy]], false); ctx.stroke();
    // 구름 (풍상 사면과 산꼭대기, 산 앞쪽)
    const cl = [[0.3, 1150], [0.38, 1700], [0.43, 2300], [0.5, 2900], [0.56, 3150]];
    cl.forEach((c, i) => drawCloud(I.xa + (I.xc - I.xa) * (c[1] / 3000) - 6, I.Y(c[1]) - 30, 0.9 + (i === 3 ? 0.35 : 0), 0.95));
    ctx.strokeStyle = 'rgba(30,64,175,.6)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(I.x, I.Y(1000)); ctx.lineTo(I.xa + (I.xc - I.xa) * (1000 / 3000), I.Y(1000)); ctx.stroke(); ctx.setLineDash([]);
    // 비 (풍상 사면)
    if (!RM && Math.random() < dt * 70) { const f = 0.15 + Math.random() * 0.7, zz = 1000 + f * 2000, xx = I.xa + (I.xc - I.xa) * (zz / 3000) - 4; parts.emit({ x: xx, y: I.Y(zz) - 20, vx: -10, vy: 190, life: 0.3 + 0.12 * (zz / 3000), size: 1.8, color: 'rgba(30,64,175,.85)', shape: 'square' }); }
    // 풍하의 뜨거운 공기
    if (!RM && Math.random() < dt * 14) parts.emit({ x: I.xc + (I.xb - I.xc) * (0.55 + Math.random() * 0.45), y: I.gy - 6, vx: rnd(-8, 8), vy: rnd(-60, -30), life: 1.6, size: 6, color: 'rgba(239,68,68,.45)', shape: 'smoke', grow: 7 });
    ctx.restore();
    D.label(I.xa + 30, I.Y(500) + 4, '풍상 사면: 비', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'left' });
    D.label(I.xb + 8, I.gy - 104, '풍하 사면: 고온 건조', { bg: '#b91c1c', size: 12.5, pad: 8, align: 'right' });
    D.label(I.xa + (I.xc - I.xa) / 3 + 8, I.Y(1000) - 8, 'LCL 1000 m', { bg: 'rgba(30,64,175,.85)', size: 11.5, pad: 6, align: 'left' });
    D.text(I.xc, I.Y(3000) - 54, '정상 3000 m', { size: 12.5, weight: 800, color: '#0f172a' });
    // 바람 화살표
    D.arrow(I.x + 14, I.gy - 120, I.xa + 40, I.gy - 120, { color: '#0ea5e9', width: 5, head: 13 });
    // 공기 덩어리
    const px = I.X(u), py = I.Y(st.z) - 22;
    D.glow(px, py, 26, tCol(st.T), 0.4); D.sphere(px, py, 14, tCol(st.T), { shadow: true });
    D.label(clamp(px, I.x + 130, I.x + I.w - 130), py - 32, '기온 ' + fx(st.T, 1) + ' °C · 이슬점 ' + fx(st.Td, 1) + ' °C', { bg: 'rgba(15,23,42,.8)', size: 12.5, pad: 8 });
    // 정보 판
    card(IP, '🧭 지금 위치의 공기와 기록');
    const row = (i, nm, v) => { const x = IP.x + 14, y = IP.y + 44 + i * (PHONE ? 70 : 0); return { x, y }; };
    const items = [['지금', st], ['산 정상 기록', S.rec.crest ? Object.assign({ z: 3000 }, S.rec.crest) : null], ['풍하 산기슭 기록', S.rec.foot ? Object.assign({ z: 0 }, S.rec.foot) : null]];
    const cw = PHONE ? IP.w - 28 : (IP.w - 40) / 3, chh = PHONE ? 92 : 80;
    items.forEach((q, i) => {
      const x = IP.x + 14 + (PHONE ? 0 : i * (cw + 6)), y = IP.y + 38 + (PHONE ? i * (chh + 6) : 0), v = q[1];
      ctx.fillStyle = i === 0 ? 'rgba(14,165,233,.12)' : '#f1f5f9'; rr(x, y, cw, chh, 10).fill(); ctx.strokeStyle = i === 0 ? '#0ea5e9' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, y, cw, chh, 10).stroke();
      D.text(x + 10, y + 18, q[0], { size: 13, weight: 800, color: '#334155', align: 'left' });
      if (v) {
        D.text(x + 10, y + 18 + 22 * FS * 0.95, '기온 ' + fx(v.T, 1) + ' °C · 이슬점 ' + fx(v.Td, 1) + ' °C', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
        D.text(x + 10, y + 18 + 42 * FS * 0.95, '상대 습도 ' + Math.round(v.rh) + ' %' + (i === 0 ? ' · 높이 ' + Math.round(st.z) + ' m' : ''), { size: 12.5, weight: 700, color: '#334155', align: 'left' });
        if (i === 0) D.text(x + 10, y + 18 + 62 * FS * 0.95, st.st, { size: 12, weight: 800, color: '#0369a1', align: 'left' });
      } else D.text(x + 10, y + 18 + 24 * FS * 0.95, '덩어리가 그곳을 지나면 기록돼요', { size: 12, weight: 700, color: '#94a3b8', align: 'left' });
    });
  }

  /* ======================================================
     장면 3: 안개
     ====================================================== */
  const RC3 = PHONE
    ? { M: { x: 8, y: 8, w: 504, h: 330 }, I: { x: 8, y: 346, w: 504, h: 366 } }
    : { M: { x: 12, y: 12, w: 776, h: 320 }, I: { x: 12, y: 340, w: 776, h: 208 } };
  const FT0 = 15, FTD = 11;
  const fogRate = () => 0.7 * (1 - (0.85 * S.cloud) / 100) * (1 - 0.06 * S.wind);
  const fogT = (h) => { const k = fogRate(), tmin = FT0 - k * 11; return h <= 11 ? FT0 - k * h : Math.min(FT0 + 5, tmin + 2.5 * (h - 11)); };
  function fogInfo(h) {
    const T = fogT(h), ex = FTD - T;
    if (ex <= 0) return { T, ex: 0, V: 10, st: 'clear', nm: '안개 없음 (기온이 이슬점보다 높아요)' };
    if (S.wind >= 5) return { T, ex, V: 10, st: 'stratus', nm: '층운 (바람이 섞어 올려서 땅에서 떠 있어요)' };
    const V = 10 / (1 + 25 * ex);
    return V < 1 ? { T, ex, V, st: 'fog', nm: '안개 (가시거리 1 km 미만)' } : { T, ex, V, st: 'mist', nm: '엷은 안개 (가시거리 1 km 이상)' };
  }
  const hourTxt = (h) => { const x = (19 + h) % 24; return (x === 0 ? 24 : x) % 24 + '시' + (h % 1 ? ' 30분' : ''); };
  const wisps = Array.from({ length: 22 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, sp: 0.2 + Math.random() * 0.5 }));
  function fogLayer(x0, w, gy, H, a, t, lift) {
    if (a < 0.02 || H < 2) return;
    const g = ctx.createLinearGradient(0, gy - lift - H, 0, gy - lift); g.addColorStop(0, 'rgba(241,245,249,0)'); g.addColorStop(0.5, 'rgba(241,245,249,' + (0.7 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + (0.92 * a).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(x0, gy - lift - H, w, H);
    wisps.forEach((q, i) => { const x = x0 + ((q.x * w + t * 12 * q.sp) % w), y = gy - lift - q.y * H; ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * a).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x, y, 36 * q.s, 9 * q.s, 0, 0, TAU); ctx.fill(); });
  }
  function house(x, y, s, lit) { ctx.fillStyle = '#7c2d12'; ctx.fillRect(x - 14 * s, y - 16 * s, 28 * s, 16 * s); ctx.fillStyle = '#9a3412'; poly([[x - 17 * s, y - 16 * s], [x, y - 30 * s], [x + 17 * s, y - 16 * s]]); ctx.fill(); ctx.fillStyle = lit ? '#fde047' : '#1e293b'; ctx.fillRect(x - 4 * s, y - 11 * s, 8 * s, 8 * s); }
  function drawFog(t, dt) {
    const { M, I: IP } = RC3, f = S.fog;
    const I = { x: M.x + 10, y: M.y + 36, w: M.w - 20, h: M.h - 46 }; I.gy = I.y + I.h - 26;
    const h = S.hour;
    const info = fogInfo(h);
    card(M, ({ rad: '🌙 복사 안개: 맑고 바람 약한 밤', adv: '🌊 이류 안개: 따뜻한 공기가 찬 해면 위로', steam: '♨️ 증기(김) 안개: 찬 공기가 따뜻한 물 위로', up: '⛰️ 활승 안개: 공기가 산비탈을 오르며' })[f]);
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    if (f === 'rad') {
      const lv = h < 1 ? 0.3 - 0.3 * h : h < 9 ? 0 : (h - 9) / 4;
      const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, mixc('#050816', '#7dd3fc', clamp(lv, 0, 1))); sk.addColorStop(1, mixc('#1e3a8a', h >= 10 ? '#fed7aa' : '#e0f2fe', clamp(lv * 1.2, 0, 1))); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
      if (lv < 0.5) for (let k = 0; k < 28; k++) { ctx.globalAlpha = (0.5 - lv) * 2 * (0.5 + 0.5 * Math.sin(t * 2 + k)); D.sphere(I.x + ((k * 83) % I.w), I.y + 12 + ((k * 47) % (I.h * 0.5)), 1.4, '#fff', { gloss: false }); } ctx.globalAlpha = 1;
      if (h >= 11) { const sy = I.gy - 30 - (h - 11) * 45; D.glow(I.x + I.w * 0.82, sy, 70, '#fde047', 0.9); D.sphere(I.x + I.w * 0.82, sy, 22, '#facc15', { gloss: false }); } else if (lv < 0.4) D.sphere(I.x + I.w * 0.14, I.y + 46, 18, '#fef9c3', { gloss: false });
      // 구름
      const nc = Math.round(S.cloud / 20);
      for (let k = 0; k < nc; k++) drawCloud(I.x + 90 + k * ((I.w - 180) / Math.max(1, nc - 0.5)), I.y + 60 + (k % 2) * 36, 1.4, 0.75 - 0.3 * lv);
      // 바람
      const na = Math.min(5, Math.ceil(S.wind / 2));
      if (S.wind > 0) for (let k = 0; k < na; k++) { const sp = 20 + S.wind * 16, xx = I.x + ((t * sp + k * 160) % (I.w + 60)) - 30, yy = I.y + 110 + k * 18; D.arrow(xx, yy, xx + 18 + S.wind * 4, yy, { color: 'rgba(37,99,235,.8)', width: 2.6, head: 8 }); }
      const gg = ctx.createLinearGradient(0, I.gy, 0, I.y + I.h); gg.addColorStop(0, mixc('#14532d', '#6b8f4e', clamp(lv, 0, 1))); gg.addColorStop(1, '#3f2d1a'); ctx.fillStyle = gg; ctx.fillRect(I.x, I.gy, I.w, I.y + I.h - I.gy);
      for (let k = 0; k < 4; k++) house(I.x + 80 + k * ((I.w - 160) / 3), I.gy, 1.3, lv < 0.4 && k % 2 === 0);
      const Hmax = PHONE ? 120 : 110;
      if (info.st === 'fog') fogLayer(I.x, I.w, I.gy, Hmax * (0.45 + 0.55 * Math.min(1, info.ex / 4)), 1, t, 0);
      else if (info.st === 'mist') fogLayer(I.x, I.w, I.gy, 40, 0.5, t, 0);
      else if (info.st === 'stratus') { ctx.save(); ctx.globalAlpha = 0.85; for (let k = 0; k < 9; k++) drawCloud(I.x + 30 + k * ((I.w - 60) / 8), I.gy - 100 + (k % 2) * 8, 1.2); ctx.restore(); }
    } else if (f === 'adv') {
      const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#93c5fd'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
      const sg = ctx.createLinearGradient(0, I.gy - 20, 0, I.y + I.h); sg.addColorStop(0, '#0ea5e9'); sg.addColorStop(1, '#075985'); ctx.fillStyle = sg; ctx.fillRect(I.x, I.gy - 20, I.w, I.h);
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let x = I.x; x <= I.x + I.w; x += 4) { const y = I.gy - 8 + k * 14 + Math.sin(x / 13 + t * 1.6 + k) * 2.2; x === I.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
      const k2 = clamp((t * 0.12) % 1, 0, 1); S.advA = approach(S.advA || 0, 1, dt, 0.8);
      const g2 = ctx.createLinearGradient(I.x, 0, I.x + I.w, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.45, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(255,255,255,' + (0.85 * S.advA).toFixed(3) + ')'); ctx.fillStyle = g2; ctx.fillRect(I.x, I.gy - 100, I.w, 100);
      wisps.forEach((q) => { const x = I.x + I.w * 0.4 + ((q.x * I.w * 0.6 + t * 14 * q.sp) % (I.w * 0.6)), y = I.gy - 6 - q.y * 90; ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x, y, 34 * q.s, 9 * q.s, 0, 0, TAU); ctx.fill(); });
      D.arrow(I.x + 16, I.y + 70, I.x + I.w * 0.9, I.y + 70, { color: '#ef4444', width: 7, head: 18 });
      [[0.12, '25 °C', '#ef4444'], [0.45, '20 °C = 이슬점', '#f59e0b'], [0.78, '17 °C 이슬점 아래 → 응결', '#2563eb']].forEach((q) => D.label(I.x + I.w * q[0] + (q[0] > 0.7 ? -60 : 0), I.y + 98, q[1], { bg: q[2], size: 12.5, pad: 8, align: 'left' }));
      D.label(I.x + 20, I.y + 44, '따뜻하고 습한 공기 (이슬점 20 °C)', { bg: '#b91c1c', size: 12.5, pad: 8, align: 'left' }); D.label(I.x + 20, I.gy + 14, '찬 해면 (12 °C)', { bg: '#075985', size: 12.5, pad: 8, align: 'left' });
    } else if (f === 'steam') {
      const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#bfdbfe'); sk.addColorStop(1, '#f1f5f9'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
      const wg = ctx.createLinearGradient(0, I.gy - 10, 0, I.y + I.h); wg.addColorStop(0, '#38bdf8'); wg.addColorStop(1, '#0369a1'); ctx.fillStyle = wg; ctx.fillRect(I.x + I.w * 0.12, I.gy - 10, I.w * 0.76, I.h);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(I.x, I.gy - 10, I.w * 0.12, I.h); ctx.fillRect(I.x + I.w * 0.88, I.gy - 10, I.w * 0.12, I.h);
      if (!RM && Math.random() < dt * 22) parts.emit({ x: I.x + I.w * (0.14 + Math.random() * 0.72), y: I.gy - 10, vx: rnd(-8, 8), vy: rnd(-48, -26), life: 2.2, size: 7, color: 'rgba(255,255,255,.7)', shape: 'smoke', grow: 9 });
      D.arrow(I.x + 16, I.y + 60, I.x + I.w * 0.9, I.y + 60, { color: '#2563eb', width: 7, head: 18 });
      D.label(I.x + 20, I.y + 36, '차가운 공기 (−5 °C)', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'left' }); D.label(I.x + I.w * 0.5, I.gy + 14, '따뜻한 물 (10 °C): 수증기가 증발해요', { bg: '#075985', size: 12.5, pad: 8 });
      D.label(I.x + I.w * 0.5, I.y + 110, '수증기가 찬 공기를 만나 응결 → 김', { bg: 'rgba(15,23,42,.65)', size: 12.5, pad: 8 });
    } else {
      const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#93c5fd'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
      const mg = ctx.createLinearGradient(0, I.y + 60, 0, I.gy); mg.addColorStop(0, '#a8a29e'); mg.addColorStop(1, '#4d7c0f'); ctx.fillStyle = mg; poly([[I.x, I.gy], [I.x + I.w * 0.35, I.gy], [I.x + I.w * 0.8, I.y + 62], [I.x + I.w, I.y + 62], [I.x + I.w, I.y + I.h], [I.x, I.y + I.h]]); ctx.fill();
      const bx0 = I.x + I.w * 0.35, by0 = I.gy, bx1 = I.x + I.w * 0.8, by1 = I.y + 62;
      for (let k = 0; k < 14; k++) { const u = 0.15 + 0.8 * ((k * 0.37 + t * 0.05) % 1), x = bx0 + (bx1 - bx0) * u, y = by0 + (by1 - by0) * u; ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * u).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x - 14, y - 14 - 8 * Math.sin(k), 30, 11, -0.7, 0, TAU); ctx.fill(); }
      D.arrow(I.x + 30, I.gy - 20, bx0 + (bx1 - bx0) * 0.55 - 12, by0 + (by1 - by0) * 0.55 - 34, { color: '#0ea5e9', width: 7, head: 18 });
      D.label(I.x + 20, I.y + 44, '습한 공기가 산비탈을 따라 올라가요', { bg: '#0369a1', size: 12.5, pad: 8, align: 'left' }); D.label(I.x + I.w * 0.6, I.gy - 18, '단열 팽창 → 냉각 → 이슬점 도달', { bg: 'rgba(15,23,42,.7)', size: 12.5, pad: 8 });
    }
    ctx.restore();
    if (f === 'rad') {
      D.label(I.x + I.w - 10, I.y + 22, hourTxt(h) + ' · 기온 ' + fx(info.T, 1) + ' °C · 이슬점 ' + FTD + ' °C', { bg: 'rgba(15,23,42,.75)', size: 12.5, pad: 9, align: 'right' });
      D.label(I.x + 10, I.gy + 14, info.nm, { bg: info.st === 'fog' ? '#475569' : info.st === 'stratus' ? '#0369a1' : '#15803d', size: 12.5, pad: 9, align: 'left' });
    }
    // 아래 판
    card(IP, f === 'rad' ? '📈 밤새 기온과 이슬점 (예시: 저녁 7시 기온 15 °C, 이슬점 11 °C)' : '📋 이 안개가 생기는 까닭');
    if (f === 'rad') {
      const pb = { x: IP.x + 48, y: IP.y + 56, w: PHONE ? IP.w - 48 - 18 : IP.w * 0.6 - 48, h: PHONE ? 150 : IP.h - 56 - 40 };
      const X = (hh) => pb.x + (pb.w * hh) / 13, Y = (T) => pb.y + pb.h - (pb.h * (T - 5)) / 12;
      ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      [5, 8, 11, 14, 17].forEach((v) => { ctx.beginPath(); ctx.moveTo(pb.x, Y(v)); ctx.lineTo(pb.x + pb.w, Y(v)); ctx.stroke(); D.text(pb.x - 6, Y(v) + 4.5, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
      [0, 3, 6, 9, 12].forEach((hh) => { ctx.beginPath(); ctx.moveTo(X(hh), pb.y); ctx.lineTo(X(hh), pb.y + pb.h); ctx.stroke(); D.text(X(hh), pb.y + pb.h + 15 * FS, hourTxt(hh).replace('시', ''), { size: 12, weight: 700, color: '#64748b' }); });
      D.text(pb.x + pb.w / 2, pb.y + pb.h + 31 * FS, '시각 (시)', { size: 12, weight: 700, color: '#64748b' }); D.text(pb.x - 6, pb.y - 10, '기온 (°C)', { size: 12, weight: 800, color: '#64748b', align: 'right' });
      ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip();
      // 안개 구간 색칠
      for (let hh = 0; hh < 13; hh += 0.25) { const i1 = fogInfo(hh); if (i1.ex > 0 && S.wind < 5) { ctx.fillStyle = 'rgba(148,163,184,.3)'; ctx.fillRect(X(hh), pb.y, X(hh + 0.25) - X(hh) + 0.5, pb.h); } else if (i1.ex > 0) { ctx.fillStyle = 'rgba(56,189,248,.22)'; ctx.fillRect(X(hh), pb.y, X(hh + 0.25) - X(hh) + 0.5, pb.h); } }
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pb.x, Y(FTD)); ctx.lineTo(pb.x + pb.w, Y(FTD)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath(); for (let hh = 0; hh <= 13.01; hh += 0.25) { const x = X(hh), y = Y(fogT(hh)); hh === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      ctx.restore(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
      D.dashedLine(X(h), pb.y, X(h), pb.y + pb.h, { color: '#475569', width: 1.6 }); D.sphere(X(h), Y(info.T), 6.5, '#ea580c', { shadow: true });
      D.text(pb.x + pb.w - 6, Y(FTD) - 6, '이슬점 11 °C', { size: 12, weight: 800, color: '#2563eb', align: 'right' });
      const tx = PHONE ? IP.x + 16 : pb.x + pb.w + 24, ty = PHONE ? pb.y + pb.h + 66 : IP.y + 54, tw = PHONE ? IP.w - 32 : IP.x + IP.w - tx - 14;
      const lines = [['기온', fx(info.T, 1) + ' °C'], ['이슬점', FTD + ' °C'], ['가시거리', info.st === 'fog' || info.st === 'mist' ? fx(info.V, 2) + ' km' : '10 km 이상'], ['상태', info.st === 'fog' ? '안개' : info.st === 'stratus' ? '층운' : info.st === 'mist' ? '엷은 안개' : '맑음']];
      lines.forEach((q, i) => { const x = tx + (PHONE ? (i % 2) * (tw / 2) : 0), y = ty + (PHONE ? Math.floor(i / 2) * 34 : i * 34); D.text(x, y, q[0], { size: 12.5, weight: 800, color: '#64748b', align: 'left' }); D.text(x + (PHONE ? 66 : 62), y, q[1], { size: 14, weight: 800, color: i === 3 && info.st === 'fog' ? '#b91c1c' : '#0f172a', align: 'left' }); });
      if (PHONE) drawWrap(IP.x + IP.w / 2, IP.y + IP.h - 52, '맑고(구름양 적음) 바람이 약하면(5 m/s 미만) 복사 냉각으로 기온이 이슬점까지 떨어져 안개가 끼요. 바람이 5 m/s 이상이면 섞여서 안개 대신 층운이 되고, 해가 뜨면 기온이 올라 안개가 사라져요.', IP.w - 28, 12, { color: '#475569', weight: 800 });
      else drawWrap(tx + tw / 2, IP.y + IP.h - 40, '바람이 5 m/s 이상이면 섞여 층운, 해가 뜨면 소멸', tw, 12, { color: '#475569', weight: 800 });
    } else {
      const txt = { adv: ['따뜻하고 습한 공기가 찬 해면·지면 위로 이동하며 냉각돼요.', '예: 서해·남해의 봄·여름 해무'], steam: ['찬 공기가 따뜻한 수면 위를 지날 때 증발한 수증기가 응결해요.', '예: 겨울 아침의 강·호수 (김)'], up: ['공기가 산비탈을 오르며 단열 팽창으로 냉각돼요.', '구름이 산 사면에 걸린 것과 같은 원리예요.'] }[f];
      drawWrap(IP.x + IP.w / 2, IP.y + 60, txt[0], IP.w - 40, 15, { color: '#0f172a', weight: 800 });
      drawWrap(IP.x + IP.w / 2, IP.y + 100, txt[1], IP.w - 40, 14, { color: '#0369a1', weight: 800 });
      drawWrap(IP.x + IP.w / 2, IP.y + (PHONE ? 150 : 140), '안개 = 지표 부근에 생긴 구름 (가시거리 1 km 미만). 구름과 같은 응결 원리예요.', IP.w - 40, 13, { color: '#475569', weight: 700 });
    }
  }

  /* ======================================================
     장면 4: 강수 과정 (병합설 · 빙정설)
     ====================================================== */
  const RC4 = PHONE
    ? { M: { x: 8, y: 8, w: 504, h: 380 }, I: { x: 8, y: 396, w: 504, h: 316 } }
    : { M: { x: 12, y: 12, w: 520, h: 536 }, I: { x: 540, y: 12, w: 248, h: 536 } };
  const FALL = [[10, 0.01], [50, 0.25], [100, 0.7], [500, 4], [1000, 6.5]];
  function vOf(r) {
    if (r <= 10) return 0.01 * Math.pow(r / 10, 2); if (r >= 1000) return 6.5;
    for (let i = 0; i < FALL.length - 1; i++) if (r <= FALL[i + 1][0]) { const a = FALL[i], b = FALL[i + 1], f = (Math.log(r) - Math.log(a[0])) / (Math.log(b[0]) - Math.log(a[0])); return Math.exp(Math.log(a[1]) + f * (Math.log(b[1]) - Math.log(a[1]))); }
    return 6.5;
  }
  const rpx = (r) => 3 + (9 * (Math.log10(Math.max(10, r)) - 1)) / 2;
  const DRP = (() => { const rn = seeded(23), a = []; for (let i = 0; i < 130; i++) a.push({ fx: rn(), fy: rn(), ph: rn() * 6, alive: true, back: 0 }); return a; })();
  const SCD = (() => { const rn = seeded(41), a = []; for (let i = 0; i < 46; i++) a.push({ fx: rn(), fy: rn(), ph: rn() * 6 }); return a; })();
  function pcGeo() {
    const M = RC4.M, I = { x: M.x + 10, y: M.y + 36, w: M.w - 20, h: M.h - 46 };
    I.gy = I.y + I.h - 36; I.cb = I.y + I.h * 0.52; I.ct = I.y + 18; I.zero = I.y + I.h * 0.47;
    return I;
  }
  function cloudBody(I) {
    const g = ctx.createLinearGradient(0, I.ct, 0, I.cb); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cbd5e1'); ctx.fillStyle = g; ctx.beginPath();
    const n = 9; for (let k = 0; k < n; k++) { const x = I.x + 50 + k * ((I.w - 100) / (n - 1)), r = 46 + 14 * Math.sin(k * 1.7); ctx.moveTo(x + r, I.ct + 70 + 8 * Math.sin(k)); ctx.arc(x, I.ct + 70 + 8 * Math.sin(k), r, 0, TAU); }
    ctx.rect(I.x + 40, I.ct + 60, I.w - 80, I.cb - I.ct - 62); ctx.fill();
  }
  function hexa(x, y, r, rot, col, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = col; ctx.lineWidth = lw || 2; ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) { ctx.save(); ctx.rotate((k * Math.PI) / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0); ctx.moveTo(r * 0.55, 0); ctx.lineTo(r * 0.8, r * 0.26); ctx.moveTo(r * 0.55, 0); ctx.lineTo(r * 0.8, -r * 0.26); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  function startPrecip() {
    const I = pcGeo();
    if (S.ctype === 'warm') { DRP.forEach((d) => { d.alive = true; }); S.run = { type: 'warm', t: 0, x: I.x + I.w * 0.5, y: I.ct + 56, r: 10, landed: false, done: 0, n: 1 }; }
    else S.run = { type: 'cold', t: 0, cr: [0, 1, 2].map((i) => ({ x: I.x + I.w * (0.28 + i * 0.22), y: I.ct + 120 + (i % 2) * 20, r: 6, rot: i, melt: 0, landed: false })), landed: false, done: 0 };
    S.rainT = 0;
  }
  function drawPrecip(t, dt) {
    const { M, I: IP } = RC4, I = pcGeo(), ru = S.run, warm = S.ctype === 'warm';
    card(M, warm ? '☁️ 따뜻한 구름 (0 °C 이상): 충돌·병합으로 비' : '❄️ 차가운 구름 (−10 °C): 빙정 성장으로 눈·비');
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#93c5fd'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    cloudBody(I);
    // 지상
    const gcold = !warm && S.gnd === 'cold';
    const gg = ctx.createLinearGradient(0, I.gy, 0, I.y + I.h); if (gcold) { gg.addColorStop(0, '#f8fafc'); gg.addColorStop(1, '#cbd5e1'); } else { gg.addColorStop(0, '#6b8f4e'); gg.addColorStop(1, '#4d7c0f'); } ctx.fillStyle = gg; ctx.fillRect(I.x, I.gy, I.w, I.y + I.h - I.gy);
    if (!warm) { ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.setLineDash([7, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(I.x, I.zero); ctx.lineTo(I.x + I.w, I.zero); ctx.stroke(); ctx.setLineDash([]); }
    // 물방울
    if (warm) {
      let bigR = ru && ru.type === 'warm' ? ru.r : 10, rp = rpx(bigR);
      DRP.forEach((d) => { if (!d.alive) return; const x = I.x + 52 + d.fx * (I.w - 104) + Math.sin(t * 0.8 + d.ph) * 2.5, y = I.ct + 40 + d.fy * (I.cb - I.ct - 56) + Math.cos(t * 0.7 + d.ph) * 2.5; d.x = x; d.y = y; ctx.fillStyle = 'rgba(37,99,235,.75)'; ctx.beginPath(); ctx.arc(x, y, 2.1, 0, TAU); ctx.fill(); });
      if (ru && ru.type === 'warm') {
        if (S.runOn) {
          ru.t += dt; ru.r = 10 * Math.pow(100, Math.min(ru.t, 6) / 6); bigR = ru.r; rp = rpx(ru.r);
          const v = vOf(ru.r) * 45; ru.y += v * dt; ru.x += Math.sin(ru.t * 3) * 3 * dt;
          DRP.forEach((d) => { if (d.alive && d.x != null && ru.y < I.cb + 4 && dist(d.x, d.y, ru.x, ru.y) < rp + 6) { d.alive = false; ru.n++; parts.emit({ x: d.x, y: d.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.35, size: 3, color: '#2563eb', drag: 3 }); } });
          if (ru.y >= I.gy - rp && !ru.landed) { ru.landed = true; S.ev.warmRain = true; S.rainT = 2.2; for (let k = 0; k < 14; k++) parts.emit({ x: ru.x, y: I.gy - 2, vx: rnd(-80, 80), vy: rnd(-130, -40), life: 0.6, size: 2.6, color: '#3b82f6', gravity: 320, drag: 1 }); }
          if (ru.landed) { ru.done += dt; if (ru.done > 2.6) S.runOn = false; }
        }
        if (!ru.landed) { D.sphere(ru.x, ru.y, rp, '#3b82f6', { shadow: true }); D.label(ru.x + rp + 8, ru.y, '반지름 ' + (ru.r >= 1000 ? '1 mm' : Math.round(ru.r) + ' µm'), { bg: 'rgba(15,23,42,.75)', size: 12, pad: 7, align: 'left' }); }
        else D.label(I.x + I.w / 2, I.gy + 18, '비가 내려요!', { bg: '#1d4ed8', size: 13, pad: 10 });
      } else { D.sphere(I.x + I.w * 0.5, I.ct + 56, rpx(10), '#3b82f6'); D.text(I.x + I.w * 0.5 + 18, I.ct + 60, '큰 구름 방울(반지름 10 µm)', { size: 12, weight: 800, color: '#1e3a8a', align: 'left', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); }
    } else {
      // 과냉각 물방울과 빙정
      const prog = ru && ru.type === 'cold' ? clamp(ru.t / 6, 0, 1) : 0;
      SCD.forEach((d, i) => { const x = I.x + 52 + d.fx * (I.w - 104) + Math.sin(t * 0.8 + d.ph) * 2, y = I.ct + 36 + d.fy * (I.cb - I.ct - 80) + Math.cos(t * 0.7 + d.ph) * 2, rr0 = 4.2 * (1 - 0.7 * prog * (0.4 + 0.6 * ((i % 5) / 4))); d.x = x; d.y = y; D.sphere(x, y, rr0, '#60a5fa', { gloss: false }); });
      if (ru && ru.type === 'cold') {
        if (S.runOn) {
          ru.t += dt;
          if (ru.t < 6 && Math.random() < dt * 24) { const d = SCD[Math.floor(Math.random() * SCD.length)], c = ru.cr[Math.floor(Math.random() * 3)]; if (d.x != null) parts.emit({ x: d.x, y: d.y, vx: (c.x - d.x) / 0.9, vy: (c.y - d.y) / 0.9, life: 0.9, size: 2.4, color: '#e0f2fe', fade: false }); }
          ru.cr.forEach((c) => {
            c.r = 6 + 14 * Math.pow(Math.min(1, ru.t / 6), 1.2); c.rot += 0.004;
            if (ru.t > 6) { c.y += (30 + 36 * (c.r / 20)) * (ru.t - 6 > 0 ? 1 : 0) * dt * 1.6; if (c.y > I.zero && S.gnd === 'warm') c.melt = Math.min(1, c.melt + dt * 2.2); }
            if (c.y >= I.gy - 6 && !c.landed) { c.landed = true; if (S.gnd === 'warm') S.ev.coldRain = true; else S.ev.coldSnow = true; S.rainT = 2; for (let k = 0; k < 8; k++) parts.emit({ x: c.x, y: I.gy - 2, vx: rnd(-50, 50), vy: rnd(-90, -30), life: 0.6, size: 2.6, color: S.gnd === 'warm' ? '#3b82f6' : '#ffffff', gravity: 240, drag: 1 }); }
          });
          if (ru.cr.every((c) => c.landed)) { ru.done += dt; if (ru.done > 2) S.runOn = false; }
        }
        ru.cr.forEach((c) => { if (c.landed) return; if (c.melt > 0.5) D.sphere(c.x, c.y, 5 + 3 * (1 - c.melt), '#3b82f6', { shadow: true }); else { ctx.save(); ctx.globalAlpha = 1 - c.melt; D.glow(c.x, c.y, c.r + 8, '#e0f2fe', 0.6); hexa(c.x, c.y, c.r, c.rot, '#0ea5e9', 2.6); ctx.restore(); } });
      } else { [0, 1, 2].forEach((i) => hexa(I.x + I.w * (0.28 + i * 0.22), I.ct + 120 + (i % 2) * 20, 6, i, '#0ea5e9', 2.4)); }
      D.label(I.x + 10, I.ct + 14, '−10 °C 부근', { bg: '#1d4ed8', size: 12, pad: 7, align: 'left' }); D.label(I.x + I.w - 10, I.zero - 12, '0 °C', { bg: '#1e3a8a', size: 12, pad: 7, align: 'right' });
      D.label(I.x + 10, I.gy + 18, '지상 ' + (S.gnd === 'warm' ? '+5 °C' : '−5 °C'), { bg: S.gnd === 'warm' ? '#b45309' : '#0369a1', size: 12.5, pad: 8, align: 'left' });
    }
    // 비·눈 줄기
    S.rainT = Math.max(0, (S.rainT || 0) - dt);
    if (S.rainT > 0 && !RM && Math.random() < dt * 60) parts.emit({ x: I.x + 50 + Math.random() * (I.w - 100), y: I.cb, vx: 0, vy: warm || S.gnd === 'warm' ? 260 : 70, life: warm || S.gnd === 'warm' ? 0.7 : 2.4, size: warm || S.gnd === 'warm' ? 1.6 : 2.6, color: warm || S.gnd === 'warm' ? 'rgba(37,99,235,.8)' : '#ffffff', shape: warm || S.gnd === 'warm' ? 'square' : 'circle' });
    ctx.restore();

    // 정보 판
    card(IP, warm ? '📊 크기와 낙하 속도' : '🔬 포화 수증기압 (−10 °C)');
    if (warm) {
      const rcur = ru && ru.type === 'warm' ? ru.r : 10, rowH = PHONE ? 32 : 50, y0 = IP.y + 44;
      let hi = 0, best = 1e9; FALL.forEach((f, i) => { const dd = Math.abs(Math.log(rcur) - Math.log(f[0])); if (dd < best) { best = dd; hi = i; } });
      D.text(IP.x + 14, y0 - 4, '반지름', { size: 12, weight: 800, color: '#64748b', align: 'left' }); D.text(IP.x + IP.w - 14, y0 - 4, '낙하 속도', { size: 12, weight: 800, color: '#64748b', align: 'right' });
      FALL.forEach((f, i) => {
        const y = y0 + 6 + i * rowH, on = i === hi && ru && ru.type === 'warm' && ru.t > 0;
        ctx.fillStyle = on ? 'rgba(14,165,233,.16)' : '#f1f5f9'; rr(IP.x + 10, y, IP.w - 20, rowH - 6, 8).fill(); if (on) { ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; rr(IP.x + 10, y, IP.w - 20, rowH - 6, 8).stroke(); }
        D.text(IP.x + 20, y + (rowH - 6) * 0.62, f[0] >= 1000 ? '1 mm (빗방울)' : f[0] + ' µm' + (f[0] === 10 ? ' (구름 방울)' : ''), { size: 12.5, weight: 800, color: '#0f172a', align: 'left' });
        D.text(IP.x + IP.w - 20, y + (rowH - 6) * 0.62, f[1] + ' m/s', { size: 13, weight: 800, color: '#b91c1c', align: 'right' });
      });
      const nn = ru && ru.type === 'warm' ? Math.pow(ru.r / 10, 3) : 1;
      const yb = y0 + 6 + 5 * rowH + 8;
      D.text(IP.x + 14, yb + 14, '병합한 구름 방울 수 n = (r / 10 µm)³', { size: 12, weight: 800, color: '#334155', align: 'left' });
      D.text(IP.x + 14, yb + 14 + 26 * FS * 0.9, nn < 1000 ? String(Math.round(nn)) + '개' : nn >= 9.9e5 ? '약 10⁶ 개 (100만 개)' : Math.round(nn).toLocaleString('ko-KR') + '개', { size: 16, weight: 800, color: '#1d4ed8', align: 'left' });
      drawWrap(IP.x + IP.w / 2, IP.y + IP.h - (PHONE ? 30 : 56), '큰 방울일수록 빨리 떨어져서 작은 방울과 충돌·병합해요. 빗방울 1개(1 mm)는 구름 방울(10 µm) 10⁶개예요.', IP.w - 24, 12, { color: '#475569', weight: 800 });
    } else {
      const bw = IP.w - 40, bx = IP.x + 20; const vals = [['물 위 포화 수증기압', 2.86, '#3b82f6'], ['얼음 위 포화 수증기압', 2.60, '#0ea5e9']];
      vals.forEach((q, i) => { const y = IP.y + 56 + i * 72; D.text(bx, y, q[0], { size: 12.5, weight: 800, color: '#334155', align: 'left' }); ctx.fillStyle = '#eef2f7'; rr(bx, y + 8, bw, 24, 6).fill(); ctx.fillStyle = q[2]; rr(bx, y + 8, (bw * q[1]) / 3, 24, 6).fill(); D.text(bx + (bw * q[1]) / 3 - 6, y + 25, q[1].toFixed(2) + ' hPa', { size: 13, weight: 800, color: '#fff', align: 'right' }); });
      const yb = IP.y + 56 + 2 * 72;
      D.text(bx, yb + 4, '얼음 위에서의 상대 습도 (물 위에서 포화일 때)', { size: 12, weight: 800, color: '#334155', align: 'left' });
      D.text(bx, yb + 30 * FS * 0.9, '2.86 / 2.60 ≈ ' + Math.round((2.86 / 2.60) * 100) + ' %', { size: 17, weight: 800, color: '#b91c1c', align: 'left' });
      drawWrap(IP.x + IP.w / 2, IP.y + IP.h - (PHONE ? 66 : 128), '수증기가 물방울에서 빙정으로 옮겨 가며 빙정이 자라요. 빙정이 커서 떨어지다 녹으면 비, 녹지 않으면 눈이에요. (과냉각 수적: 0 °C 아래에서도 얼지 않은 물방울)', IP.w - 24, 12, { color: '#475569', weight: 800 });
    }
  }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const MODES = [['lcl', '📏 응결 고도'], ['foehn', '⛰️ 푄'], ['fog', '🌫️ 안개'], ['precip', '🌧️ 강수']];
  const MODE_LABEL = { lcl: '📏 응결 고도: 구름 밑면 구하기', foehn: '⛰️ 푄 현상: 산을 넘는 바람', fog: '🌫️ 안개의 생성', precip: '🌧️ 강수 과정: 병합설과 빙정설' };
  const FREE_KEYS = { lcl: ['tds'], foehn: ['fPos'], fog: ['fogType', 'fogRad'], precip: ['cloudSel'] };
  let ctlKeys = [];
  $('#modeSeg').innerHTML = MODES.map((m) => '<button type="button" data-mode="' + m[0] + '">' + m[1] + '</button>').join('');
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free);
    let keys = free ? FREE_KEYS[S.mode].slice() : ctlKeys.slice();
    if (S.mode === 'fog' && S.fog !== 'rad') keys = keys.filter((k) => k !== 'fogRad');
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    const cs = $('#cloudSel'); if (cs) { const cold = S.ctype === 'cold'; $('#gndHead').hidden = !cold; $('#gndBtns').hidden = !cold; }
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  clearBadOnInput('.num-in');

  // 장면 1
  function fixTd() { if (S.Td > S.T) { S.Td = S.T; setSlider($('#sTd'), $('#oTd'), S.Td, (v) => v + ' °C'); } }
  SciSim.bindRange($('#sT'), $('#oT'), (v) => v + ' °C', (v) => { S.T = +v; fixTd(); restartRise(); S.seenLcl[lclOf(S.T, S.Td)] = true; });
  SciSim.bindRange($('#sTd'), $('#oTd'), (v) => v + ' °C', (v) => { S.Td = Math.min(+v, S.T); if (+v > S.T) setSlider($('#sTd'), $('#oTd'), S.Td, (q) => q + ' °C'); restartRise(); S.seenLcl[lclOf(S.T, S.Td)] = true; });
  $('#bRise').addEventListener('click', () => { Sound.click(); restartRise(); });
  function setTT(T, Td) { S.T = T; S.Td = Math.min(Td, T); setSlider($('#sT'), $('#oT'), S.T, (v) => v + ' °C'); setSlider($('#sTd'), $('#oTd'), S.Td, (v) => v + ' °C'); restartRise(); S.seenLcl[lclOf(S.T, S.Td)] = true; }
  // 장면 2
  function syncPlayF() { $('#bFoehnPlay').textContent = S.fPlay ? '⏸ 멈춤' : S.pos >= 100 ? '↺ 다시 넘게 하기' : '▶ 산을 넘게 하기'; }
  SciSim.bindRange($('#sPos'), $('#oPos'), (v) => v + ' %', (v) => { S.fPlay = false; S.pos = +v; syncPlayF(); });
  $('#bFoehnPlay').addEventListener('click', () => { Sound.click(); if (S.fPlay) S.fPlay = false; else { if (S.pos >= 100) { S.pos = 0; S.posV = 0; } S.fPlay = true; } syncPlayF(); });
  function setPos(v) { S.fPlay = false; S.pos = v; setSlider($('#sPos'), $('#oPos'), v, (x) => x + ' %'); syncPlayF(); }
  // 장면 3
  function syncFog() { syncSeg('#fogBtns', 'f', S.fog); }
  bindSeg('#fogBtns', 'f', (f) => { S.fog = f; S.fogSeen[f] = true; syncFog(); updateCtl(); parts.clear(); });
  SciSim.bindRange($('#sCloud'), $('#oCloud'), (v) => v + ' %', (v) => { S.cloud = +v; });
  SciSim.bindRange($('#sWind'), $('#oWind'), (v) => v + ' m/s', (v) => { S.wind = +v; });
  SciSim.bindRange($('#sHour'), $('#oHour'), (v) => hourTxt(+v), (v) => { S.hour = +v; });
  const pairFog = makePair($('#pairFog'), [{ id: 'rad', label: '복사 안개' }, { id: 'adv', label: '이류 안개' }, { id: 'steam', label: '증기(김) 안개' }, { id: 'up', label: '활승 안개' }],
    [{ id: 'c3', label: '찬 공기가 따뜻한 수면 위를 지나며 수증기가 응결' }, { id: 'c1', label: '맑고 바람 약한 밤 복사 냉각으로 기온이 이슬점까지 하강' }, { id: 'c4', label: '공기가 산비탈을 오르며 단열 냉각' }, { id: 'c2', label: '따뜻하고 습한 공기가 찬 해면 위로 이동하며 냉각' }],
    { rad: 'c1', adv: 'c2', steam: 'c3', up: 'c4' }, () => { });
  // 장면 4
  function syncPc() { syncSeg('#cloudBtns', 'c', S.ctype); syncSeg('#gndBtns', 'g', S.gnd); updateCtl(); }
  bindSeg('#cloudBtns', 'c', (c) => { S.ctype = c; S.run = null; S.runOn = false; S.rainT = 0; parts.clear(); DRP.forEach((d) => { d.alive = true; }); syncPc(); });
  bindSeg('#gndBtns', 'g', (g) => { S.gnd = g; S.run = null; S.runOn = false; S.rainT = 0; parts.clear(); syncPc(); });
  $('#bPrecip').addEventListener('click', () => { Sound.click(); parts.clear(); startPrecip(); S.runOn = true; });
  const clsPrecip = makeClassify($('#clsPrecip'), [
    { id: 'p1', label: '🌴 열대 해양에서 갑자기 쏟아지는 <b>스콜</b>' }, { id: 'p2', label: '🏔️ 중위도 <b>겨울</b> 눈구름' }, { id: 'p3', label: '☁️ 구름 꼭대기 온도가 0 °C보다 높은 <b>낮은 구름</b>의 이슬비' },
    { id: 'p4', label: '❄️ 구름 꼭대기 온도가 −15 °C인 <b>층적운</b>' }, { id: 'p5', label: '🌊 온난 다습한 해양의 <b>따뜻한 적운</b>' }, { id: 'p6', label: '🗻 고위도·고산 지역의 <b>매우 차가운 구름</b>' },
  ], [{ id: 'c', label: '병합설' }, { id: 'i', label: '빙정설' }], { p1: 'c', p2: 'i', p3: 'c', p4: 'i', p5: 'c', p6: 'i' }, () => { });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); flash.t = 0; S.fPlay = false; syncPlayF(); S.run = null; S.runOn = false; S.rainT = 0; DRP.forEach((d) => { d.alive = true; });
    $$('.num-in').forEach((e) => { e.value = ''; e.classList.remove('bad'); });
    setTT(25, 17); S.seenLcl = { 1000: true };
    S.pos = 0; S.posV = 0; setSlider($('#sPos'), $('#oPos'), 0, (v) => v + ' %'); S.rec = { crest: null, foot: null };
    S.fog = 'rad'; S.fogSeen = { rad: true }; syncFog(); S.cloud = 0; S.wind = 1; S.hour = 0; S.hourV = 0; S.fogEver = false; setSlider($('#sCloud'), $('#oCloud'), 0, (v) => v + ' %'); setSlider($('#sWind'), $('#oWind'), 1, (v) => v + ' m/s'); setSlider($('#sHour'), $('#oHour'), 0, (v) => hourTxt(+v));
    pairFog.reset(); clsPrecip.reset();
    S.ctype = 'warm'; S.gnd = 'warm'; S.ev = { warmRain: false, coldRain: false, coldSnow: false }; syncPc();
    if (li === 0) { setMode('lcl'); setCtl(['tds', 'lclIn']); showHint('T와 Td를 바꾸면 구름 밑면이 달라져요', 5200); }
    else if (li === 1) { setMode('foehn'); setCtl(['fPos', 'fIn']); showHint('▶ 산을 넘게 하기를 눌러 공기 덩어리를 따라가요', 5200); }
    else if (li === 2) { setMode('fog'); setCtl(['fogType', 'fogRad']); showHint('밤 시각을 밀어 기온이 이슬점까지 내려가는지 봐요', 5200); }
    else { setMode('precip'); setCtl(['cloudSel']); showHint('▶ 강수 과정 시작을 눌러 비가 되는 과정을 봐요', 5200); }
    updateCtl();
  }
  const fogNow = () => fogInfo(S.hour);
  const levels = [
    {
      title: '응결 고도: 구름 밑면 구하기', short: '응결 고도', icon: '📏', phase: '분석', features: ['lcl'],
      intro: '<p class="si-q">❓ 탐구 질문: 안개와 구름은 어떻게 다를까? 구름 속 작은 물방울이 어떻게 한 방울의 빗방울이 될까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(기온의 연직 분포와 안정도)</b>에서 건조 단열 감률과 이슬점의 하강으로 상승 응결 고도(LCL)가 125 × (T − Td) m임을 확인했어요. 이번에는 이 식이 어디서 나오는지 살펴보고 여러 날씨에 적용해요.</div>' +
        '<p>덩어리가 오를 때 기온은 약 10 °C/km(정확히는 9.8), 이슬점은 약 2 °C/km(1.8)씩 내려가요. 그래서 둘의 차이 T − Td는 1 km 오를 때마다 약 <b>8 °C</b>씩 줄어들고, 차이가 0이 되는 높이에서 구름이 생겨요: <b>z = (T − Td) / 8 km = 125 × (T − Td) m</b>.</p>',
      setup() { resetStep(0); },
      recap: 'LCL = 125 × (T − Td) m는 T와 Td의 차이가 1 km 오를 때마다 약 8 °C씩 줄어든다는 뜻이에요. 기온과 이슬점의 차이가 작을수록 구름 밑면이 낮고, 무더운 날처럼 차이가 크면 높아요.',
      summary: '<ul><li>건조 단열 냉각 약 9.8 ≈ 10 °C/km, 이슬점 하강 약 1.8 ≈ 2 °C/km → T − Td는 1 km 오를 때 약 <b>8 °C</b> 감소.</li><li>상승 응결 고도 <b>LCL = (T − Td) / 8 km = 125 (T − Td) m</b>. T = 30, Td = 18 °C → 1500 m, T = 20, Td = 18 °C → 250 m.</li><li>구름 밑면 기온 = T − 1.0 °C/100 m × LCL (예: 25 °C, LCL 1000 m → 15 °C, 이때 이슬점도 15 °C).</li><li>무더운 날 T − Td가 크면 구름 밑면이 높고, 습한 날은 낮아요.</li></ul>',
      missions: [
        {
          title: 'T = 30 °C, Td = 18 °C의 구름 밑면', manual: true,
          goal: '지표 기온 <b>30 °C</b>, 이슬점 <b>18 °C</b>로 맞추고, 상승 응결 고도 <b>LCL = 125 × (T − Td)</b>를 계산해 m로 입력해요.',
          hint: 'T − Td = 30 − 18 = 12 °C이니 125 × 12를 계산해요. 슬라이더를 맞추고 덩어리를 올려 구름 밑면의 높이를 확인해도 돼요.',
          setup() { setTT(25, 17); $('#iLcl').value = ''; setMode('lcl'); setCtl(['tds', 'lclIn']); },
          status: () => mark(S.T === 30 && S.Td === 18) + ' T = ' + S.T + ', Td = ' + S.Td + ' (목표 30, 18) · ' + mark(near($in('#iLcl'), 1500, 25)) + ' 입력 ' + ($in('#iLcl') == null ? '—' : $in('#iLcl') + ' m'),
          check() {
            if (S.T !== 30 || S.Td !== 18) return '먼저 지표 기온을 30 °C, 이슬점을 18 °C로 맞춰 주세요.';
            const v = $in('#iLcl'); if (v == null) return '높이를 입력해 주세요.';
            const ok = near(v, 1500, 25); markBad('#iLcl', !ok);
            if (!ok) return near(v, 12, 1) ? '12는 T − Td 값이에요. 125를 곱해 m로 바꿔 봐요.' : '125 × (30 − 18)을 계산해 봐요.';
            return true;
          },
          explain: 'LCL = 125 × (30 − 18) = 125 × 12 = <b>1500 m</b>예요. T − Td가 12 °C이고 1 km 오를 때마다 약 8 °C씩 줄어들기 때문에 1.5 km에서 0이 돼요.',
        },
        {
          title: '구름 밑면을 250 m로 낮추기',
          goal: '지표 기온 20 °C에서 시작해 <b>이슬점을 올려</b> 구름 밑면(LCL)을 <b>250 m</b>로 만들어요.',
          hint: 'LCL = 125 × (T − Td) = 250이 되려면 T − Td가 2 °C여야 해요. T가 20 °C이니 이슬점을 18 °C로 올려요.',
          setup() { setTT(20, 10); setMode('lcl'); setCtl(['tds']); },
          check: () => Math.abs(lclOf(S.T, S.Td) - 250) <= 1, hold: 0.6,
          status: () => mark(Math.abs(lclOf(S.T, S.Td) - 250) <= 1) + ' T = ' + S.T + ', Td = ' + S.Td + ' → LCL ' + lclOf(S.T, S.Td) + ' m (목표 250 m)',
          explain: 'T − Td = 2 °C이면 LCL = 125 × 2 = <b>250 m</b>예요. 공기 중 수증기가 많아 이슬점이 기온에 가까울수록 구름 밑면이 낮아지고, 차이가 0이면 구름이 땅에 닿아 안개가 돼요.',
        },
        {
          type: 'quiz', title: '계수 125의 의미',
          goal: 'LCL = 125 × (T − Td)에서 계수 125가 나타내는 것과, 무더운 여름날 구름 밑면이 높은 까닭으로 알맞은 것은?',
          setup() { setMode('lcl'); setCtl(['tds']); },
          choices: ['덩어리가 1 km 오를 때마다 T와 Td의 차이가 약 8 °C 줄어요(1000 m / 8 = 125 m당 1 °C). 무더운 날은 T − Td가 커서 구름 밑면이 높아요.', '덩어리가 100 m 오를 때마다 기온이 1.25 °C씩 내려가요. 무더운 날은 기온이 높아서 구름이 아예 안 생겨요.', '이슬점이 1 km마다 125 °C씩 내려가기 때문이에요.', '구름 밑면의 높이는 습도와 상관없이 기온으로만 정해져요.'],
          answer: 0,
          feedback: ['', '기온은 건조 단열로 100 m당 1.0 °C씩 내려가요. 125는 T − Td 1 °C가 줄어드는 데 필요한 높이(m)예요.', '이슬점은 1 km에 약 2 °C씩 내려가요.', '구름 밑면은 기온과 이슬점의 차이 T − Td로 정해져요.'],
          explain: '기온은 약 10 °C/km, 이슬점은 약 2 °C/km씩 내려가서 차이는 1 km마다 약 <b>8 °C</b> 줄어요. 그래서 차이 1 °C를 없애는 데 1000 / 8 = <b>125 m</b>가 필요해요. 무더운 날처럼 T − Td가 크면 구름 밑면이 높아요.',
        },
      ],
    },
    {
      title: '푄 현상: 산을 넘는 공기', short: '푄 현상', icon: '⛰️', phase: '탐구', features: ['foehn'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상승하는 공기는 LCL에서 구름을 만들고 그 위에서는 습윤 단열 감률(0.5 °C/100 m)로 식는다는 것을 확인했어요. 공기가 산을 넘으면 어떤 일이 생길까요?</div>' +
        '<p>풍상 사면(바람이 부딪히는 쪽)의 지표 기온 25 °C, 이슬점 17 °C인 공기가 3000 m의 산을 넘어요. LCL(1000 m) 위에서는 구름이 생기고 비가 내려요. 응결한 물이 비로 빠져나간 공기는 풍하 사면을 내려오며 <b>건조 단열 감률 1.0 °C/100 m</b>로 데워져요.</p>',
      setup() { resetStep(1); },
      recap: '풍상 사면에서 비를 내려 수증기를 잃은 공기는 풍하 사면에서 건조 단열로 내려와 산기슭에서 35 °C(풍상 25 °C보다 높음), 상대 습도 약 23 %의 고온 건조한 바람(푄)이 돼요.',
      summary: '<ul><li>풍상 사면: LCL 1000 m(15 °C)까지 건조 단열(1.0 °C/100 m) 상승 → 정상 3000 m까지 습윤 단열(0.5 °C/100 m): 15 − 10 = <b>5 °C</b>. 구름과 비가 생겨요.</li><li>풍하 사면: 응결수가 비로 사라진 뒤 건조 단열로 3000 m를 내려오면 5 + 30 = <b>35 °C</b> (풍상 25 °C보다 높아요). 이슬점은 약 5 °C에서 1 km에 약 2 °C씩 올라 약 11 °C → 상대 습도 약 <b>23 %</b>.</li><li>이렇게 산을 넘어 불어 내려오는 고온 건조한 바람을 <b>푄(풍하 사면의 건조 단열 가열)</b>이라 해요. \'산을 넘으면 기온이 원래대로 돌아온다\'는 오개념이에요.</li></ul>',
      missions: [
        {
          title: '정상과 산기슭의 기온', manual: true,
          goal: '공기 덩어리가 산을 넘게 해서 <b>산 정상(3000 m)</b>과 <b>풍하 산기슭(0 m)</b>의 기온을 읽고 °C로 입력해요.',
          hint: '▶ 산을 넘게 하기를 누르면 덩어리가 움직여요. 정상에서는 습윤 단열(15 − 10 = 5 °C), 풍하 산기슭에서는 건조 단열(5 + 30 = 35 °C)이에요. 기록 칸에도 값이 남아요.',
          setup() { $('#iCrest').value = ''; $('#iFoot').value = ''; S.rec = { crest: null, foot: null }; setPos(0); S.posV = 0; setMode('foehn'); setCtl(['fPos', 'fIn']); },
          status: () => mark(!!S.rec.crest) + ' 정상 통과 · ' + mark(!!S.rec.foot) + ' 풍하 산기슭 도착 · ' + mark(near($in('#iCrest'), 5, 0.5) && near($in('#iFoot'), 35, 0.5)) + ' 입력 ' + ($in('#iCrest') == null ? '—' : $in('#iCrest')) + ' / ' + ($in('#iFoot') == null ? '—' : $in('#iFoot')) + ' °C',
          check() {
            if (!S.rec.crest || !S.rec.foot) return '먼저 덩어리를 산 정상을 지나 풍하 산기슭까지 보내 주세요.';
            const a = $in('#iCrest'), b = $in('#iFoot'); if (a == null || b == null) return '두 칸에 모두 값을 입력해 주세요.';
            const oa = near(a, 5, 0.5), ob = near(b, 35, 0.5); markBad('#iCrest', !oa); markBad('#iFoot', !ob);
            if (!oa) return '정상: LCL(1000 m, 15 °C) 위 2000 m는 습윤 단열 0.5 °C/100 m로 식어요. 15 − 10 = ?';
            if (!ob) return b < 26 ? '내려올 때는 구름이 없어 건조 단열 1.0 °C/100 m로 데워져요. 정상 기온에 30 °C를 더해 봐요.' : '정상의 기온에서 3000 m를 건조 단열(1.0 °C/100 m)로 내려오면 몇 °C일까요?';
            return true;
          },
          explain: '정상: 15 °C − 0.5 °C/100 m × 2000 m = <b>5 °C</b>. 풍하 산기슭: 구름 속 수증기가 비로 빠져나가 건조 단열로 내려오므로 5 + 1.0 × 30 = <b>35 °C</b>예요. 풍상(25 °C)보다 10 °C 더 높고 건조해요(상대 습도 약 23 %).',
        },
        {
          type: 'quiz', title: '풍하 사면이 더 덥고 건조한 까닭',
          goal: '푄이 불 때 풍하 산기슭이 풍상 산기슭보다 더 덥고 건조한 까닭은?',
          setup() { setMode('foehn'); setCtl(['fPos']); },
          choices: ['산을 넘으면 공기의 기온이 원래 값(25 °C)으로 돌아오기 때문이에요.', '풍상 사면에서 응결한 수증기가 비로 빠져나가고, 풍하 사면에서는 건조 단열(1.0 °C/100 m)로 더 많이 데워지기 때문이에요.', '풍하 사면에서는 태양이 더 오래 비치기 때문이에요.', '풍하 사면에서는 공기가 팽창하며 열을 내놓기 때문이에요.'],
          answer: 1,
          feedback: ['오른쪽으로 내려오는 공기는 올라갈 때보다 데워지는 비율(1.0)이 커서 원래 25 °C보다 높아져요.', '', '일조 시간이 아니라 단열 가열 때문이에요.', '내려오는 공기는 압축되며 온도가 올라가요.'],
          explain: '올라갈 때 일부 구간은 습윤 단열(0.5 °C/100 m)로 덜 식고, 내려올 때는 응결수가 비로 사라져 <b>건조 단열(1.0 °C/100 m)</b>로 더 많이 데워져요. 그래서 풍하 산기슭이 풍상보다 높은 기온(35 °C)과 낮은 습도(약 23 %)가 돼요.',
        },
      ],
    },
    {
      title: '안개: 땅에 닿은 구름', short: '안개', icon: '🌫️', phase: '모형', features: ['fog'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산을 오르는 공기가 단열 냉각되어 이슬점에 도달하면 구름이 생긴다는 것을 확인했어요. <b>안개</b>는 지표 부근에 생긴 구름(가시거리 1 km 미만)이에요.</div>' +
        '<p>안개는 공기가 이슬점까지 식는 방법에 따라 <b>복사 안개 · 이류 안개 · 증기(김) 안개 · 활승 안개</b>로 나뉘어요. 먼저 복사 안개가 생기는 조건을 직접 맞춰 봐요: 구름양, 풍속, 밤 시각을 바꾸면 기온이 이슬점까지 내려가는지 달라져요. (저녁 7시 기온 15 °C, 이슬점 11 °C)</p>',
      setup() { resetStep(2); },
      recap: '복사 안개는 맑고 바람이 약한 밤에 복사 냉각으로 기온이 이슬점까지 내려갈 때 생기고, 해가 뜨면 사라져요. 바람이 약 5 m/s 이상이면 섞여서 안개 대신 층운이 돼요.',
      summary: '<ul><li>안개 = 지표 부근에 생긴 구름(가시거리 1 km 미만). 구름과 같은 응결 원리예요.</li><li><b>복사 안개</b>: 맑고 바람 약한 밤 복사 냉각으로 기온이 이슬점까지 하강 (T 15 °C, Td 11 °C이면 4 °C 하강 필요). 풍속 약 5 m/s 이상이면 섞여 층운, 해가 뜨면 소멸.</li><li><b>이류 안개</b>: 따뜻하고 습한 공기가 찬 해면·지면 위로 이동하며 냉각 (서해·남해의 봄·여름 해무).</li><li><b>증기(김) 안개</b>: 찬 공기가 따뜻한 수면 위를 지날 때 증발한 수증기가 응결 (겨울 아침 강·호수). <b>활승 안개</b>: 공기가 산비탈을 오르며 단열 냉각.</li><li>불안정하면 적운형(수직 발달), 안정하면 층운형(수평)이에요.</li></ul>',
      missions: [
        {
          title: '복사 안개를 만들어 봐요',
          goal: '<b>복사 안개</b>를 선택하고, 구름양과 풍속과 시각을 맞춰 밤새 <b>기온이 이슬점까지 내려가</b> 안개(가시거리 1 km 미만)가 생기게 해요.',
          hint: '구름양은 적게(맑게), 풍속은 약하게(5 m/s 미만) 한 뒤, 밤 시각 슬라이더를 새벽(2시~6시 무렵)으로 옮겨 기온(주황 곡선)이 이슬점 아래로 내려가게 해요.',
          setup() { S.fog = 'rad'; syncFog(); S.cloud = 60; S.wind = 7; S.hour = 0; S.hourV = 0; setSlider($('#sCloud'), $('#oCloud'), 60, (v) => v + ' %'); setSlider($('#sWind'), $('#oWind'), 7, (v) => v + ' m/s'); setSlider($('#sHour'), $('#oHour'), 0, (v) => hourTxt(+v)); setMode('fog'); setCtl(['fogType', 'fogRad']); },
          check: () => S.fog === 'rad' && fogNow().st === 'fog', hold: 0.8,
          status: () => mark(S.cloud <= 45) + ' 맑음(구름양 ' + S.cloud + ' %) · ' + mark(S.wind < 5) + ' 약풍(' + S.wind + ' m/s) · ' + mark(fogNow().T <= FTD) + ' 기온 ' + fx(fogNow().T, 1) + ' °C → 이슬점 ' + FTD + ' °C · ' + mark(fogNow().st === 'fog') + ' 안개',
          explain: '구름이 적고 바람이 약한 밤에는 지표가 복사 냉각으로 빨리 식어서 기온이 이슬점(11 °C)까지 내려가고 <b>복사 안개</b>가 생겨요. 구름이 많으면 복사 냉각이 줄고, 바람이 5 m/s 이상이면 아래위 공기가 섞여 안개 대신 층운이 되며, 해가 뜨면 기온이 이슬점보다 올라가 안개가 사라져요.',
        },
        {
          title: '안개와 생성 원인 짝짓기', manual: true,
          goal: '네 가지 안개를 하나씩 살펴보고, <b>안개의 종류</b>와 <b>생성 원인</b>을 짝지어요.',
          hint: '안개 단추를 눌러 장면을 바꿔 봐요. 복사 안개는 밤의 복사 냉각, 이류 안개는 찬 해면 위의 따뜻한 공기, 증기 안개는 따뜻한 수면 위의 찬 공기, 활승 안개는 산비탈이에요.',
          setup() { pairFog.reset(); setMode('fog'); setCtl(['fogType', 'pairFog']); },
          status: () => mark(pairFog.ok()) + ' 짝지은 안개 ' + pairFog.count() + ' / 4 · ' + mark(['rad', 'adv', 'steam', 'up'].every((k) => S.fogSeen[k])) + ' 살펴본 장면 ' + ['rad', 'adv', 'steam', 'up'].filter((k) => S.fogSeen[k]).length + ' / 4',
          check() {
            if (!pairFog.complete()) return '네 가지를 모두 짝지어 주세요. (지금 ' + pairFog.count() + '개)';
            if (!pairFog.ok()) { pairFog.mark(pairFog.wrong()); return '빨간 짝이 달라요. 안개 장면의 공기 이동과 온도 차를 다시 봐요.'; }
            return true;
          },
          explain: '<b>복사 안개</b>: 맑은 밤 복사 냉각, <b>이류 안개</b>: 따뜻하고 습한 공기가 찬 해면 위로 이동하며 냉각, <b>증기(김) 안개</b>: 찬 공기가 따뜻한 수면 위를 지날 때 증발한 수증기가 응결, <b>활승 안개</b>: 산비탈을 오르며 단열 냉각이에요.',
        },
        {
          type: 'quiz', title: '안개와 구름, 해가 뜨면?',
          goal: '안개에 대한 설명으로 옳은 것은?',
          setup() { setMode('fog'); setCtl(['fogType', 'fogRad']); },
          choices: ['안개는 구름과 전혀 다른 원리로 생겨요.', '안개는 지표에 닿은 구름이고 같은 응결 원리로 생기며, 복사 안개는 해가 뜨면 기온이 올라 사라져요.', '복사 안개는 바람이 강할수록 더 짙게 생겨요.', '안개는 기온이 이슬점보다 한참 높을 때 생겨요.'],
          answer: 1,
          feedback: ['안개도 공기가 이슬점까지 식어 수증기가 응결해서 생겨요. 구름과 같은 원리예요.', '', '바람이 약 5 m/s 이상이면 아래위 공기가 섞여 안개가 아니라 층운이 돼요.', '응결은 기온이 이슬점 이하일 때 일어나요.'],
          explain: '안개는 <b>지표에 닿은 구름</b>이에요(가시거리 1 km 미만). 공기가 이슬점까지 식어 수증기가 응결하는 원리는 구름과 같고, 복사 안개는 해가 뜨면 기온이 이슬점보다 높아져 사라져요.',
        },
      ],
    },
    {
      title: '강수 과정: 병합설과 빙정설', short: '강수 과정', icon: '🌧️', phase: '탐구', features: ['precip'],
      intro: '<div class="si-link">🔗 <b>중3 구름의 생성</b>에서 병합설과 빙정설을 정성적으로 배웠어요. 이번에는 낙하 속도와 포화 수증기압의 <b>수치</b>로 두 과정을 확인해요.</div>' +
        '<p><b>병합설</b>(0 °C 이상의 따뜻한 구름): 큰 방울이 더 빨리 떨어지며 작은 방울과 충돌·병합해요. <b>빙정설</b>(−10~−20 °C의 차가운 구름): 얼지 않은 과냉각 물방울과 빙정이 함께 있으면, 포화 수증기압이 물 위(2.86 hPa)에서 얼음 위(2.60 hPa)보다 커서 수증기가 빙정으로 옮겨 가 빙정이 자라요. (인공강우는 구름씨 요오드화 은으로 빙정 핵을 제공해요.)</p>',
      setup() { resetStep(3); },
      recap: '따뜻한 구름에서는 낙하 속도 차로 구름 방울 10⁶개가 병합해 빗방울이 되고, 차가운 구름에서는 과냉각 물방울의 수증기가 빙정으로 옮겨 가 빙정이 자라 눈이나 비가 돼요.',
      summary: '<ul><li><b>병합설</b>(따뜻한 구름): 낙하 속도 10 µm 0.01 m/s, 50 µm 0.25, 100 µm 0.7, 500 µm 4, 1 mm 6.5 m/s. 빗방울 1개(반지름 1 mm)는 구름 방울(10 µm) <b>10⁶개</b>의 부피. 열대 해양의 구름.</li><li><b>빙정설</b>(차가운 구름, −10~−20 °C): 과냉각 물방울과 빙정 공존, 포화 수증기압(−10 °C) 물 위 2.86 hPa &gt; 얼음 위 2.60 hPa → 얼음 위 상대 습도 약 110 % → 수증기가 빙정에 승화해 빙정 성장 → 낙하 중 녹으면 비, 녹지 않으면 눈. 중위도 겨울 구름.</li><li>빙정설은 \'구름 속 물방울이 전부 얼어서 떨어진다\'는 설명이 아니에요. 인공강우는 구름씨(요오드화 은)로 빙정 핵을 제공해요.</li></ul>',
      missions: [
        {
          title: '비와 눈을 내리게 하기',
          goal: '<b>따뜻한 구름</b>에서 비를, <b>차가운 구름</b>에서 지상 −5 °C일 때 눈을, 지상 +5 °C일 때 비를 내리게 해요. (구름 단면을 고르고 ▶ 강수 과정 시작)',
          hint: '구름 단면 단추로 구름을 고르고 ▶ 강수 과정 시작을 눌러요. 차가운 구름에서는 지상 기온 단추(+5 °C / −5 °C)를 바꿔 가며 각각 한 번씩 보세요. 한 번 끝까지 보는 데 약 10초 걸려요.',
          setup() { S.ev = { warmRain: false, coldRain: false, coldSnow: false }; S.ctype = 'warm'; S.gnd = 'warm'; S.run = null; S.runOn = false; syncPc(); setMode('precip'); setCtl(['cloudSel']); },
          check: () => S.ev.warmRain && S.ev.coldRain && S.ev.coldSnow, hold: 0.4,
          status: () => mark(S.ev.warmRain) + ' 따뜻한 구름 → 비 · ' + mark(S.ev.coldSnow) + ' 차가운 구름(지상 −5 °C) → 눈 · ' + mark(S.ev.coldRain) + ' 차가운 구름(지상 +5 °C) → 비',
          explain: '따뜻한 구름에서는 큰 방울이 작은 방울과 충돌·병합해 <b>비</b>가 돼요. 차가운 구름에서는 빙정이 자라 떨어지는데, 지상 기온이 0 °C보다 높아 <b>녹으면 비</b>, 영하라서 녹지 않으면 <b>눈</b>으로 내려요.',
        },
        {
          title: '구름 사례 분류', manual: true,
          goal: '구름 사례 6장을 <b>병합설</b>로 설명되는지 <b>빙정설</b>로 설명되는지 분류해요.',
          hint: '구름 속 온도가 0 °C보다 높으면 병합설, −10~−20 °C처럼 차가우면 빙정설이에요. 열대 해양과 따뜻한 구름은 병합, 겨울 눈구름과 아주 차가운 구름은 빙정이에요.',
          setup() { clsPrecip.reset(); setMode('precip'); setCtl(['cloudSel', 'clsPrecip']); },
          status: () => mark(clsPrecip.ok()) + ' 분류한 사례 ' + clsPrecip.count() + ' / 6',
          check() {
            if (!clsPrecip.complete()) return '사례 6개를 모두 분류해 주세요. (지금 ' + clsPrecip.count() + '개)';
            if (!clsPrecip.ok()) { clsPrecip.mark(clsPrecip.wrong()); return '빨간 사례가 달라요. 구름 속 온도가 0 °C 위인지 아래인지 확인해 봐요.'; }
            return true;
          },
          explain: '<b>병합설</b>: 열대 해양의 스콜, 0 °C 위 낮은 구름의 이슬비, 온난 다습한 해양의 따뜻한 적운. <b>빙정설</b>: 중위도 겨울 눈구름, −15 °C의 층적운, 고위도·고산의 아주 차가운 구름.',
        },
        {
          type: 'quiz', title: '과냉각 물방울의 역할',
          goal: '빙정설에서 −10 °C 구름 속의 <b>얼지 않은 과냉각 물방울</b>의 역할로 알맞은 것은?',
          setup() { setMode('precip'); setCtl(['cloudSel']); S.ctype = 'cold'; syncPc(); },
          choices: ['구름 속 물방울이 전부 얼어서 한꺼번에 떨어져요.', '빙정에게 수증기를 공급하는 역할이에요. 물 위의 포화 수증기압이 얼음 위보다 커서 수증기가 물방울에서 빙정으로 옮겨 가요.', '과냉각 물방울은 병합설에서만 나타나요.', '과냉각 물방울이 빙정을 녹여서 비가 돼요.'],
          answer: 1,
          feedback: ['빙정설은 \'물방울이 전부 얼는다\'는 설명이 아니에요. 물방울은 증발해 수증기를 빙정에 내줘요.', '', '과냉각 물방울은 0 °C 아래의 차가운 구름에서 빙정과 함께 있어요.', '빙정은 수증기를 얻어 성장해서 떨어져요. 녹는 것은 낙하하며 0 °C 위를 지날 때예요.'],
          explain: '−10 °C에서 포화 수증기압은 물 위 <b>2.86 hPa</b> &gt; 얼음 위 <b>2.60 hPa</b>예요. 그래서 물 위에서 포화인 공기가 얼음 위에서는 상대 습도 약 110 %가 되어 수증기가 <b>과냉각 물방울에서 빙정으로</b> 옮겨 가고, 빙정이 자라요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-cloud-precip', mount: '#game', badge: '구름·강수 분석가', homeHref: '../../index.html#hs',
    featureLabels: { lcl: '📏 응결 고도 계산기', foehn: '⛰️ 산을 넘는 바람', fog: '🌫️ 안개 4종 장면', precip: '🌧️ 구름 단면 2종' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'lcl') setReadouts(['T − Td', (S.T - S.Td) + ' °C', '구름 밑면(LCL)', lclOf(S.T, S.Td) + ' m', '구름 밑면 기온', fx(pT(lclOf(S.T, S.Td), S.T, S.Td), 1) + ' °C']);
    else if (m === 'foehn') { const st = fState(S.posV / 100); setReadouts(['높이', Math.round(st.z) + ' m', '기온 / 이슬점', fx(st.T, 1) + ' / ' + fx(st.Td, 1) + ' °C', '상대 습도', Math.round(st.rh) + ' %']); }
    else if (m === 'fog') { if (S.fog === 'rad') { const i = fogNow(); setReadouts(['시각', hourTxt(S.hour), '기온 → 이슬점', fx(i.T, 1) + ' → ' + FTD + ' °C', '가시거리', i.st === 'fog' || i.st === 'mist' ? fx(i.V, 2) + ' km' : '10 km 이상']); } else setReadouts(['안개의 종류', ({ adv: '이류 안개', steam: '증기(김) 안개', up: '활승 안개' })[S.fog], '원인', ({ adv: '찬 해면 위 냉각', steam: '따뜻한 수면 위 응결', up: '산비탈 단열 냉각' })[S.fog], '공통 원리', '이슬점까지 냉각']); }
    else { const r = S.run; setReadouts(['구름', S.ctype === 'warm' ? '따뜻한 구름 (병합)' : '차가운 구름 (빙정)', '진행', r ? fx(Math.min(r.t, 99), 1) + ' 초' : '시작 전', '결과', S.ctype === 'warm' ? (S.ev.warmRain ? '비' : '—') : (S.gnd === 'warm' ? (S.ev.coldRain ? '비' : '—') : (S.ev.coldSnow ? '눈' : '—'))]); }
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef3f9'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'lcl') drawLcl(t, dt);
    else if (S.mode === 'foehn') drawFoehn(t, dt);
    else if (S.mode === 'fog') drawFog(t, dt);
    else drawPrecip(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, pairFog, clsPrecip, lclOf, fState, fogInfo, fogT, vOf, mtnGeo,
    get game() { return game; }, setMode, resetStep, updateCtl, setTT, setPos, startPrecip, rh,
  };

})();
