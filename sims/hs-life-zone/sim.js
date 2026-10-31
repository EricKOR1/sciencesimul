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
  const $in = (sel) => { const e = $(sel); const v = e ? parseFloat(String(e.value).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.')) : NaN; return isFinite(v) ? v : null; };
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
     선택적 흡수와 생명가능지대 (선택적 흡수 → 온실 효과 → 자외선 차단 → 물과 생명)
     ====================================================== */
  initStage('#eef3f9', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  let game = null;

  const S = {
    mode: 'spec', fade: 0, clock: 0,
    // 장면 1
    gas: { o3: false, h2o: false, co2: false, ch4: false }, w: { o3: 0, h2o: 0, co2: 0, ch4: 0 }, lamV: 35, gasSeen: {},
    // 장면 2
    planet: 'earth', atm: 0, seenAtm: { 0: false, 1: false }, planetsSeen: { earth: true }, atmV: 0, barGrow: 0,
    // 장면 3
    du: 300, duV: 300, cfc: null, duSeen: {},
    // 장면 4
    dist: 1.0, distV: 1.0, prop: 0, propSeen: { 0: true },
  };
  const TEMP = new SciSim.Spring(255, { stiffness: 55, damping: 10 });

  /* ---------- 복사 곡선과 대기 투과율 모형 (예시) ---------- */
  const LMIN = 0.1, LMAX = 20, LGMIN = Math.log10(LMIN), LGMAX = Math.log10(LMAX), NS = 360;
  const LAM = []; for (let i = 0; i < NS; i++) LAM.push(Math.pow(10, LGMIN + ((LGMAX - LGMIN) * i) / (NS - 1)));
  const planck = (l, T) => Math.pow(l, -5) / (Math.exp(14387.77 / (l * T)) - 1);
  const normC = (T) => { const a = LAM.map((l) => planck(l, T)); const m = Math.max.apply(null, a); return a.map((v) => v / m); };
  const SUNC = normC(5800), EARC = normC(288);
  const peakOf = (c) => LAM[c.indexOf(1)];
  const ga = (l, c, s, a) => a * Math.exp(-0.5 * Math.pow((l - c) / s, 2));
  const smoothS = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ABS = {
    o3(l) {
      let a = 0;
      if (l < 0.29) a = 0.99;
      else if (l < 0.30) a = lerp(0.99, 0.5, (l - 0.29) / 0.01);
      else if (l < 0.40) a = lerp(0.5, 0.1, smoothS((l - 0.30) / 0.10));
      a = Math.max(a, 0.1 * smoothS((l - 0.36) / 0.04) * (1 - smoothS((l - 0.72) / 0.08)), ga(l, 9.6, 0.45, 0.16));
      return a;
    },
    h2o(l) {
      let a = Math.max(ga(l, 0.94, 0.025, 0.45), ga(l, 1.13, 0.03, 0.25), ga(l, 1.4, 0.06, 0.85), ga(l, 1.9, 0.08, 0.92), ga(l, 2.7, 0.2, 0.95), ga(l, 6.3, 0.9, 0.98));
      a = Math.max(a, ga(l, 10, 2.4, 0.085));
      if (l > 13) a = Math.max(a, 0.99 * smoothS((l - 13) / 7));
      return a;
    },
    co2(l) { return Math.max(ga(l, 2.0, 0.04, 0.3), ga(l, 2.7, 0.12, 0.6), ga(l, 4.3, 0.2, 0.99), 0.99 * Math.exp(-Math.pow(Math.abs(l - 15) / 1.8, 4))); },
    ch4(l) { return Math.max(ga(l, 3.3, 0.12, 0.7), ga(l, 7.7, 0.45, 0.85)); },
  };
  const GAS_IDS = ['o3', 'h2o', 'co2', 'ch4'];
  const GCOL = { o3: '#8b5cf6', h2o: '#0ea5e9', co2: '#64748b', ch4: '#16a34a' };
  const GNAME = { o3: 'O₂·O₃', h2o: 'H₂O', co2: 'CO₂', ch4: 'CH₄' };
  const transAt = (l, w) => { let t = 1; GAS_IDS.forEach((g) => { if (w[g] > 0.001) t *= 1 - w[g] * ABS[g](l); }); return t; };
  const ALLON = { o3: 1, h2o: 1, co2: 1, ch4: 1 };
  const avgT = (lo, hi, w) => { let s = 0, n = 0; for (let i = 0; i < NS; i++) if (LAM[i] >= lo && LAM[i] <= hi) { s += transAt(LAM[i], w); n++; } return n ? s / n : 0; };
  const WIN_ALL = avgT(8, 12, ALLON), VIS_ALL = avgT(0.4, 0.7, ALLON);

  const RC = PHONE
    ? { P: { x: 8, y: 8, w: 504, h: 214 }, G: { x: 8, y: 230, w: 504, h: 482 } }
    : { P: { x: 12, y: 12, w: 776, h: 200 }, G: { x: 12, y: 220, w: 776, h: 328 } };
  const specGeo = () => {
    const G = RC.G, B = { x: G.x + 46, y: G.y + 34, w: G.w - 46 - 14, h: G.h - 34 - (PHONE ? 66 : 54) };
    B.X = (l) => B.x + (B.w * (Math.log10(l) - LGMIN)) / (LGMAX - LGMIN);
    B.Y = (v) => B.y + B.h * (1 - v);
    return B;
  };
  const lamOfV = (v) => Math.pow(10, LGMIN + ((LGMAX - LGMIN) * v) / 100);
  const fLam = (l) => (l < 1 ? l.toFixed(2) : l < 10 ? l.toFixed(1) : l.toFixed(1)) + ' µm';

  /* ---------- 분자 그림 ---------- */
  function drawMol(kind, x, y, s, glow, a) {
    ctx.save(); ctx.globalAlpha = a;
    if (glow > 0.02) D.glow(x, y, 22 * s, '#fde047', 0.85 * glow);
    if (kind === 'o3') { D.sphere(x - 7 * s, y + 4 * s, 5 * s, '#a78bfa'); D.sphere(x + 7 * s, y + 4 * s, 5 * s, '#a78bfa'); D.sphere(x, y - 5 * s, 5 * s, '#7c3aed'); }
    else if (kind === 'h2o') { D.sphere(x, y - 2 * s, 6.5 * s, '#38bdf8'); D.sphere(x - 8 * s, y + 6 * s, 3.6 * s, '#f1f5f9'); D.sphere(x + 8 * s, y + 6 * s, 3.6 * s, '#f1f5f9'); }
    else if (kind === 'co2') { D.sphere(x - 10 * s, y, 5.4 * s, '#f87171'); D.sphere(x + 10 * s, y, 5.4 * s, '#f87171'); D.sphere(x, y, 5.6 * s, '#475569'); }
    else { D.sphere(x, y, 5.6 * s, '#4ade80'); [[-8, -7], [8, -7], [-8, 7], [8, 7]].forEach((q) => D.sphere(x + q[0] * s, y + q[1] * s, 3.2 * s, '#f1f5f9')); }
    ctx.restore();
  }

  /* ---------- 장면 1 위쪽: 대기를 지나는 빛 ---------- */
  const MOLS = (() => {
    const rn = seeded(7), a = [];
    GAS_IDS.forEach((g, gi) => { for (let k = 0; k < 8; k++) a.push({ g, fx: 0.06 + ((k + 0.15 + rn() * 0.7 + gi * 0.25) % 8) / 8.2 * 0.9, fy: rn(), ph: rn() * 6, glow: 0 }); });
    return a;
  })();
  const PH = [];
  const spawnT = { uv: 0, vis: 0, ir: 0 };
  const PCOL = { uv: '#7c3aed', vb: '#2563eb', vg: '#16a34a', ir: '#dc2626' };
  function atmosGeo() {
    const P = RC.P, I = { x: P.x + 10, y: P.y + 34, w: P.w - 20, h: P.h - 44 };
    I.a0 = I.y + I.h * 0.3; I.a1 = I.y + I.h * 0.72; I.gr = I.y + I.h - 24; I.sx = I.x + 34; I.sy = I.y + 22;
    return I;
  }
  const molPos = (m, I) => ({ x: I.x + 18 + m.fx * (I.w - 36), y: I.a0 + 14 + m.fy * (I.a1 - I.a0 - 28) + Math.sin(S.clock * 1.4 + m.ph) * 2.5 });
  function pickMol(gs) { const c = MOLS.filter((m) => gs.includes(m.g)); return c[Math.floor(Math.random() * c.length)] || null; }
  function emitPhoton(kind, I) {
    if (PH.length > 70) return;
    const w = S.w;
    if (kind === 'ir') {
      const pAbs = 1 - (1 - 0.88 * w.h2o) * (1 - 0.92 * w.co2) * (1 - 0.6 * w.ch4);
      let m = null;
      if (Math.random() < pAbs) { const on = GAS_IDS.filter((g) => g !== 'o3' && w[g] > 0.3); m = pickMol(on.length ? on : ['h2o']); }
      const mp = m ? molPos(m, I) : null;
      const x = mp ? mp.x + (Math.random() - 0.5) * 10 : I.x + 20 + Math.random() * (I.w - 40);
      const tx = mp ? mp.x : x + (Math.random() - 0.5) * 30, ty = mp ? mp.y : I.y - 40;
      const a = Math.atan2(ty - I.gr, tx - x), sp = 120;
      PH.push({ kind, x, y: I.gr, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, mol: m, yEnd: mp ? mp.y : null });
    } else {
      const k = kind === 'uv' ? 'uv' : Math.random() < 0.5 ? 'vb' : 'vg';
      let m = null;
      if (kind === 'uv' && Math.random() < 0.97 * w.o3) m = pickMol(['o3']);
      const mp = m ? molPos(m, I) : null;
      const tx = mp ? mp.x : I.x + 40 + Math.random() * (I.w - 60), ty = mp ? mp.y : I.gr;
      const a = Math.atan2(ty - I.sy, tx - I.sx), sp = 150;
      PH.push({ kind: k, x: I.sx, y: I.sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, mol: m, yEnd: mp ? mp.y : null });
    }
  }
  function drawPhoton(p) {
    const L = p.kind === 'ir' ? 34 : p.kind === 'uv' ? 14 : 20, wl = p.kind === 'ir' ? 15 : p.kind === 'uv' ? 5 : 9, amp = p.kind === 'ir' ? 4.2 : 3;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? PCOL[p.kind] : 'rgba(255,255,255,.75)'; ctx.lineWidth = pass ? 2.2 : 4.4; ctx.beginPath();
      for (let u = -L; u <= 0; u += 2) { const y = amp * Math.sin(((u - p.age * 90) / wl) * TAU) * (1 + u / L * 0.2); u === -L ? ctx.moveTo(u, y) : ctx.lineTo(u, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawAtmos(t, dt) {
    const P = RC.P, I = atmosGeo();
    card(P, '🌍 대기를 지나는 빛 (모형)');
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.y + I.h); sk.addColorStop(0, '#1e3a8a'); sk.addColorStop(0.35, '#3b82f6'); sk.addColorStop(1, '#bfdbfe');
    ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    // 대기층
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(I.x, I.a0, I.w, I.a1 - I.a0);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(I.x, I.a0); ctx.lineTo(I.x + I.w, I.a0); ctx.moveTo(I.x, I.a1); ctx.lineTo(I.x + I.w, I.a1); ctx.stroke(); ctx.setLineDash([]);
    // 지표
    const gl = clamp(S.groundHeat || 0, 0, 1);
    const gg = ctx.createLinearGradient(0, I.gr, 0, I.y + I.h); gg.addColorStop(0, mixc('#6b8f4e', '#f59e0b', gl * 0.5)); gg.addColorStop(1, '#8a6a45');
    ctx.fillStyle = gg; ctx.fillRect(I.x, I.gr, I.w, I.y + I.h - I.gr);
    S.groundHeat = Math.max(0, (S.groundHeat || 0) - dt * 0.5);
    // 분자
    MOLS.forEach((m) => {
      const a = S.w[m.g]; m.glow = Math.max(0, m.glow - dt * 2.2);
      if (a < 0.03) return;
      const p = molPos(m, I); drawMol(m.g, p.x, p.y, PHONE ? 1.0 : 0.95, m.glow, a);
    });
    // 태양
    D.glow(I.sx, I.sy, 44, '#fde047', 0.9); D.sphere(I.sx, I.sy, 14, '#facc15', { gloss: false });
    // 광자 만들기
    if (!RM) {
      spawnT.uv += dt * 1.5; spawnT.vis += dt * 1.8; spawnT.ir += dt * 2.4;
      if (spawnT.uv > 1) { spawnT.uv = 0; emitPhoton('uv', I); }
      if (spawnT.vis > 1) { spawnT.vis = 0; emitPhoton('vis', I); }
      if (spawnT.ir > 1) { spawnT.ir = 0; emitPhoton('ir', I); }
    } else if (!PH.length) { ['uv', 'vis', 'ir', 'vis', 'ir'].forEach((k) => emitPhoton(k, I)); }
    for (let i = PH.length - 1; i >= 0; i--) {
      const p = PH[i]; p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      let dead = false;
      if (p.mol && p.yEnd != null && ((p.vy > 0 && p.y >= p.yEnd) || (p.vy < 0 && p.y <= p.yEnd))) {
        // 흡수
        p.mol.glow = 1; dead = true;
        for (let k = 0; k < 4; k++) parts.emit({ x: molPos(p.mol, I).x, y: p.yEnd, vx: rnd(-40, 40), vy: rnd(-40, 20), life: 0.6, size: 2.6, color: p.kind === 'ir' ? '#fb923c' : '#c4b5fd', drag: 2, shape: 'circle' });
        if (p.kind === 'ir') {
          const mpx = molPos(p.mol, I); const ang = Math.random() * TAU, sp = 120;
          PH.push({ kind: 'ir', x: mpx.x, y: mpx.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, age: -0.35, mol: null, yEnd: null, re: true, hold: 0.35 });
        }
      } else if (p.hold > 0) { p.hold -= dt; p.x -= p.vx * dt; p.y -= p.vy * dt; if (p.hold <= 0) p.age = 0; }
      else if (p.vy > 0 && p.y >= I.gr) {
        dead = true; S.groundHeat = Math.min(1, (S.groundHeat || 0) + 0.12);
        for (let k = 0; k < 2; k++) parts.emit({ x: p.x, y: I.gr, vx: rnd(-30, 30), vy: rnd(-50, -15), life: 0.5, size: 2.4, color: '#fb923c', drag: 2, gravity: 40 });
      } else if (p.y < I.y - 50 || p.x < I.x - 40 || p.x > I.x + I.w + 40) dead = true;
      if (dead) PH.splice(i, 1);
    }
    PH.forEach((p) => { if (!p.hold || p.hold <= 0) drawPhoton(p); });
    ctx.restore();
    // 라벨
    D.label(I.x + I.w - 8, I.a0 + 14, '대기', { bg: 'rgba(15,23,42,.55)', size: 12.5, pad: 7, align: 'right' });
    D.label(I.x + I.w - 8, I.gr + 12, '지표', { bg: 'rgba(15,23,42,.55)', size: 12.5, pad: 7, align: 'right' });
    const legY = I.y + 12;
    let lxx = I.x + 64;
    [['uv', '자외선', 66], ['vb', '가시광선', 80], ['ir', PHONE ? '적외선(지구 복사)' : '적외선 (지구가 내놓는 빛)', PHONE ? 148 : 178]].forEach((q) => {
      D.label(lxx, legY, q[1], { bg: PCOL[q[0]], size: 12, pad: 7, align: 'left' });
      lxx += q[2] + 8;
    });
    D.text(I.sx, I.sy + 30, '태양', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
  }

  /* ---------- 장면 1 아래쪽: 투과율 그래프 ---------- */
  function drawSpec(t, dt) {
    const G = RC.G, B = specGeo();
    GAS_IDS.forEach((g) => { S.w[g] = approach(S.w[g], S.gas[g] ? 1 : 0, dt, 5); });
    drawAtmos(t, dt);
    card(G, '📈 파장별 대기 투과율과 복사 곡선 (예시)');
    // 상자와 눈금
    ctx.fillStyle = '#f8fafc'; rr(B.x, B.y, B.w, B.h, 4).fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#e2e8f0';
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(B.x, B.Y(v)); ctx.lineTo(B.x + B.w, B.Y(v)); ctx.stroke(); D.text(B.x - 6, B.Y(v) + 4.5, Math.round(v * 100) + '%', { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    [0.1, 0.2, 0.5, 1, 2, 5, 10, 20].forEach((l) => { ctx.beginPath(); ctx.moveTo(B.X(l), B.y); ctx.lineTo(B.X(l), B.y + B.h); ctx.stroke(); D.text(B.X(l), B.y + B.h + 15 * FS, String(l), { size: 12.5, weight: 700, color: '#64748b' }); });
    D.text(B.x + B.w / 2, B.y + B.h + 32 * FS, '파장 (µm, 로그 눈금)', { size: 12.5, weight: 700, color: '#64748b' });
    ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
    // 빛의 종류 띠
    const bands = [[LMIN, 0.4, '#8b5cf6', '자외선'], [0.4, 0.7, null, '가시광선'], [0.7, LMAX, '#ef4444', '적외선']];
    bands.forEach((b) => {
      const x0 = B.X(b[0]), x1 = B.X(b[1]);
      if (b[2]) { ctx.fillStyle = rgba(b[2], 0.1); ctx.fillRect(x0, B.y, x1 - x0, B.h); }
      else { const gr = ctx.createLinearGradient(x0, 0, x1, 0); ['#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#ef4444'].forEach((c, i) => gr.addColorStop(i / 4, rgba(c, 0.22))); ctx.fillStyle = gr; ctx.fillRect(x0, B.y, x1 - x0, B.h); }
    });
    // 대기창
    const wx0 = B.X(8), wx1 = B.X(12);
    ctx.fillStyle = 'rgba(34,197,94,.10)'; ctx.fillRect(wx0, B.y, wx1 - wx0, B.h);
    // 태양 · 지구 복사 곡선
    const drawEm = (arr, col, a1) => {
      ctx.beginPath(); ctx.moveTo(B.X(LAM[0]), B.Y(0));
      for (let i = 0; i < NS; i++) ctx.lineTo(B.X(LAM[i]), B.Y(arr[i] * 0.9));
      ctx.lineTo(B.X(LAM[NS - 1]), B.Y(0)); ctx.closePath(); ctx.fillStyle = rgba(col, a1); ctx.fill();
      ctx.beginPath(); for (let i = 0; i < NS; i++) { const x = B.X(LAM[i]), y = B.Y(arr[i] * 0.9); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
    };
    drawEm(SUNC, '#f59e0b', 0.26); drawEm(EARC, '#e11d48', 0.2);
    // 기체별 흡수 띠
    GAS_IDS.forEach((g) => {
      const w = S.w[g]; if (w < 0.02) return;
      ctx.beginPath(); ctx.moveTo(B.X(LAM[0]), B.Y(1));
      for (let i = 0; i < NS; i++) ctx.lineTo(B.X(LAM[i]), B.Y(1 - w * ABS[g](LAM[i])));
      ctx.lineTo(B.X(LAM[NS - 1]), B.Y(1)); ctx.closePath(); ctx.fillStyle = rgba(GCOL[g], 0.34); ctx.fill();
    });
    // 투과율 곡선
    const tr = []; for (let i = 0; i < NS; i++) tr.push(transAt(LAM[i], S.w));
    ctx.beginPath(); for (let i = 0; i < NS; i++) { const x = B.X(LAM[i]), y = B.Y(tr[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    // 띠 이름
    bands.forEach((b) => { const cx = (B.X(Math.max(b[0], LMIN)) + B.X(Math.min(b[1], LMAX))) / 2; D.text(cx, B.y + 14 * FS, b[3], { size: 12.5, weight: 800, color: b[2] || '#16a34a', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); });
    D.text(B.X(8) + (B.X(12) - B.X(8)) / 2, B.y + B.h - 8, '대기창 8~12 µm', { size: 12.5, weight: 800, color: '#15803d', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // 곡선 이름표
    const iS = SUNC.indexOf(1), iE = EARC.indexOf(1);
    D.text(clamp(B.X(LAM[iS]) + (PHONE ? 4 : 0), B.x + 52, B.x + B.w - 60), B.Y(0.9) - 6 + 16 * FS, '태양 복사 5800 K', { size: 12.5, weight: 800, color: '#b45309', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    D.text(clamp(B.X(LAM[iE]) - (PHONE ? 6 : 0), B.x + 56, B.x + B.w - 56), B.Y(0.9) - 6 + 16 * FS, '지구 복사 288 K', { size: 12.5, weight: 800, color: '#be123c', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // 커서
    const lam = lamOfV(S.lamV), cx = B.X(lam), tv = transAt(lam, S.w);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, B.y); ctx.lineTo(cx, B.y + B.h); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cx, B.Y(tv), 6, '#2563eb', { shadow: true });
    D.label(clamp(cx, B.x + 62, B.x + B.w - 62), clamp(B.Y(tv) - 18, B.y + 30, B.y + B.h - 22), fLam(lam) + ' · ' + Math.round(tv * 100) + ' %', { bg: '#2563eb', size: 12.5, pad: 7 });
    // 기체 이름표
    const act = GAS_IDS.filter((g) => S.w[g] > 0.5);
    let lx = B.x + 4; const ly = B.y + B.h + (PHONE ? 52 : 46);
    if (!act.length) D.text(B.x + 4, ly, '기체를 켜면 투과율이 낮아지는 파장대가 색으로 보여요', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    GAS_IDS.forEach((g) => { if (S.w[g] < 0.5) return; const r = D.label(lx, ly, GNAME[g], { bg: GCOL[g], size: 12.5, pad: 7, align: 'left' }); lx += r.w + 6; });
    // 읽음
    S.visAvg = avgT(0.4, 0.7, S.w); S.winAvg = avgT(8, 12, S.w);
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'spec' && game && (game.has('spec') || game.free)) {
        const B = specGeo();
        if (p.x >= B.x - 8 && p.x <= B.x + B.w + 8 && p.y >= RC.G.y && p.y <= RC.G.y + RC.G.h) { setLamFromX(p.x); return true; }
      }
      if (S.mode === 'hz' && game && (game.has('hz') || game.free)) {
        const O = hzGeo();
        if (p.x >= O.x0 - 14 && p.x <= O.x1 + 14 && p.y >= O.y - 56 && p.y <= O.y + 60) { setDistFromX(p.x); return true; }
      }
      return false;
    },
    move(p) { if (S.mode === 'spec') setLamFromX(p.x); else if (S.mode === 'hz') setDistFromX(p.x); },
    hover(p) {
      if (S.mode === 'spec' && game && (game.has('spec') || game.free)) { const B = specGeo(); if (p.x >= B.x && p.x <= B.x + B.w && p.y >= RC.G.y && p.y <= RC.G.y + RC.G.h) return 'ew-resize'; }
      if (S.mode === 'hz' && game && (game.has('hz') || game.free)) { const O = hzGeo(); if (p.x >= O.x0 - 14 && p.x <= O.x1 + 14 && p.y >= O.y - 56 && p.y <= O.y + 60) return 'ew-resize'; }
      return '';
    },
  });
  function setLamFromX(x) {
    const B = specGeo(), v = clamp(((x - B.x) / B.w) * 100, 0, 100);
    S.lamV = Math.round(v * 2) / 2; setSlider($('#sLam'), $('#oLam'), S.lamV, (q) => fLam(lamOfV(q)));
  }

  /* ======================================================
     장면 2: 온실 효과
     ====================================================== */
  const SIG = 5.670374e-8;
  const PLN = ['earth', 'venus', 'mars'];
  const PLD = {
    earth: { nm: '지구', S: 1361, A: 0.30, Tr: 288, c1: '#7dd3fc', c2: '#1d4ed8', halo: '#93c5fd', h0: 0.55, note: '대기압 1기압' },
    venus: { nm: '금성', S: 2600, A: 0.77, Tr: 737, c1: '#fde68a', c2: '#b45309', halo: '#fef3c7', h0: 1, note: '대기압 92기압 · CO₂ 약 96 %' },
    mars: { nm: '화성', S: 589, A: 0.25, Tr: 213, c1: '#fdba74', c2: '#9a3412', halo: '#fecaca', h0: 0.12, note: '대기압 0.006기압' },
  };
  const teq = (p) => Math.round(Math.pow((p.S * (1 - p.A)) / (4 * SIG), 0.25));
  PLN.forEach((k) => { PLD[k].Te = teq(PLD[k]); PLD[k].gh = PLD[k].Tr - PLD[k].Te; });
  const fK = (k) => k + ' K (' + minus(k - 273) + ' °C)';
  const RC2 = PHONE
    ? { L: { x: 8, y: 8, w: 504, h: 372 }, R: { x: 8, y: 388, w: 504, h: 324 } }
    : { L: { x: 12, y: 12, w: 410, h: 536 }, R: { x: 430, y: 12, w: 358, h: 536 } };
  const TMAXK = 800;
  function drawGH(t, dt) {
    const { L, R } = RC2, pl = PLD[S.planet];
    S.atmV = approach(S.atmV, S.atm, dt, 4); S.barGrow = approach(S.barGrow, 1, dt, 3);
    TEMP.target = S.atm ? pl.Tr : pl.Te; TEMP.update(dt);
    const tv = TEMP.value;
    card(L, '🪐 ' + pl.nm + ' (대기 ' + (S.atm ? '있음' : '없음') + ')');
    const sp = { x: L.x + 10, y: L.y + 36, w: L.w - 20, h: L.h - 46 };
    ctx.save(); rr(sp.x, sp.y, sp.w, sp.h, 12).clip(); D.space(sp.x, sp.y, sp.w, sp.h, t, { stars: 60 }); ctx.restore();
    const thW = 86, pr = Math.min((sp.w - thW) * 0.2, sp.h * 0.2), pcx = sp.x + 70 + (sp.w - thW - 70) * 0.5, pcy = sp.y + sp.h * (PHONE ? 0.42 : 0.38);
    // 태양빛
    D.glow(sp.x + 8, pcy, 70, '#fde047', 0.55);
    D.sphere(sp.x + 8, pcy, 26, '#facc15', { gloss: false });
    for (let k = -1; k <= 1; k++) {
      const y = pcy + k * pr * 0.55, hw = Math.sqrt(Math.max(0, pr * pr - k * k * pr * pr * 0.3025));
      D.arrow(sp.x + 44, y, pcx - hw - 6, y, { color: '#fde047', width: 4.5, head: 12 });
      if (!RM) { const u = (t * 0.6 + k * 0.3) % 1; D.sphere(sp.x + 44 + u * (pcx - hw - sp.x - 56), y, 3.4, '#fff', { gloss: false }); }
    }
    D.text(sp.x + 14, pcy - 42, 'S = ' + pl.S + ' W/m²', { size: 12.5, weight: 800, color: '#fde68a', align: 'left', stroke: 'rgba(15,23,42,.7)', strokeWidth: 3 });
    // 행성과 대기
    ctx.save();
    const halo = S.atmV * pl.h0;
    if (halo > 0.02) { D.glow(pcx, pcy, pr * (1.55 + halo * 0.4), pl.halo, 0.55 * halo + 0.1); ctx.strokeStyle = rgba(pl.halo, 0.35 + 0.45 * halo); ctx.lineWidth = 3 + 10 * halo; ctx.beginPath(); ctx.arc(pcx, pcy, pr + 4 + 5 * halo, 0, TAU); ctx.stroke(); }
    D.sphere(pcx, pcy, pr, pl.c1, { dark: pl.c2, shadow: true });
    ctx.restore();
    // 반사
    D.arrow(pcx - pr * 0.5, pcy - pr * 0.92, pcx - pr * 0.95 - 8, pcy - pr * 1.6, { color: '#fff', width: 2 + 7 * pl.A, head: 11 });
    D.text(pcx - pr * 0.95 - 14, pcy - pr * 1.66, '반사 A = ' + Math.round(pl.A * 100) + ' %', { size: 12.5, weight: 800, color: '#fff', align: 'right', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    // 지구가 내놓는 적외선과 대기가 되돌려 보내는 복사
    for (let k = 0; k < 3; k++) {
      const a = -0.55 + k * 0.55, x0 = pcx + Math.cos(a) * (pr + 8), y0 = pcy + Math.sin(a) * (pr + 8);
      const x1 = pcx + Math.cos(a) * (pr + 58), y1 = pcy + Math.sin(a) * (pr + 58);
      D.arrow(x0, y0, x1, y1, { color: '#fb7185', width: 4.4, head: 12, alpha: 0.95 });
      if (S.atmV > 0.05) {
        const mx = x0 + (x1 - x0) * 0.55, my = y0 + (y1 - y0) * 0.55, nx = -Math.sin(a), ny = Math.cos(a);
        D.arrow(mx + nx * 13, my + ny * 13, x0 + nx * 13 + (x1 - x0) * 0.1, y0 + ny * 13 + (y1 - y0) * 0.1, { color: '#fda4af', width: 3 * S.atmV + 0.4, head: 6 + 4 * S.atmV, alpha: 0.15 + 0.75 * S.atmV, dash: [5, 4] });
      }
    }
    D.text(pcx + pr + 22, pcy - pr - 12, '적외선', { size: 12.5, weight: 800, color: '#fecdd3', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    // 온도계
    const tx = sp.x + sp.w - 44, ty0 = sp.y + 62, th = sp.h - 150;
    const Yk = (k) => ty0 + th - (th * clamp(k, 0, TMAXK)) / TMAXK;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(tx - 14, ty0 - 6, 28, th + 12, 14).fill();
    ctx.fillStyle = 'rgba(56,189,248,.55)'; ctx.fillRect(tx - 14, Yk(373), 28, Yk(273) - Yk(373));
    const fl = ctx.createLinearGradient(0, Yk(tv), 0, ty0 + th); fl.addColorStop(0, '#f97316'); fl.addColorStop(1, '#dc2626');
    ctx.fillStyle = fl; rr(tx - 7, Yk(tv), 14, ty0 + th - Yk(tv) + 4, 5).fill();
    [0, 200, 400, 600, 800].forEach((k) => { ctx.fillStyle = '#64748b'; ctx.fillRect(tx - 22, Yk(k) - 0.75, 6, 1.5); D.text(tx - 25, Yk(k) + 4.5, String(k), { size: 11.5, weight: 700, color: '#cbd5e1', align: 'right' }); });
    D.text(tx, ty0 - 34, '온도 (K)', { size: 12, weight: 800, color: '#e2e8f0' });
    D.label(tx, ty0 - 16, Math.round(tv) + ' K', { bg: '#dc2626', size: 13, pad: 7 });
    D.text(tx - 26, Yk(323) - 1, '액체 물', { size: 11.5, weight: 800, color: '#bae6fd', align: 'right' });
    D.text(tx - 26, Yk(323) + 12, '273~373 K', { size: 11, weight: 700, color: '#bae6fd', align: 'right' });
    // 식과 값
    const fy = sp.y + sp.h - 58;
    ctx.fillStyle = 'rgba(15,23,42,.66)'; rr(sp.x + 8, fy - 8, sp.w - 16, 58, 10).fill();
    D.text(sp.x + 18, fy + 10, '평형 T = [S(1−A) / (4σ)]^(1/4) = ' + pl.Te + ' K (' + minus(pl.Te - 273) + ' °C)', { size: 12.5, weight: 800, color: '#fff', align: 'left' });
    D.text(sp.x + 18, fy + 30, '실제 평균 ' + pl.Tr + ' K → 온실 효과 ' + (S.planet === 'mars' ? '+3 K (약 3~5 K)' : '+' + pl.gh + ' K') + ' · ' + pl.note, { size: 12, weight: 700, color: '#fde68a', align: 'left' });
    if (S.atmV > 0.5) D.text(sp.x + 18, fy + 46, '점선 화살표: 대기가 되돌려 보내는 적외선', { size: 11.5, weight: 700, color: '#fecdd3', align: 'left', alpha: S.atmV });

    // 비교 막대
    card(R, '📊 세 행성의 평형 온도와 실제 평균 온도');
    const bx = R.x + 54, bw = R.w - 54 - 22, rowH = (R.h - 84) / 3;
    PLN.forEach((k, i) => {
      const q = PLD[k], y0 = R.y + 44 + i * rowH, sel = k === S.planet;
      if (sel) { ctx.fillStyle = 'rgba(14,165,233,.1)'; rr(R.x + 8, y0 - 4, R.w - 16, rowH - 4, 10).fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; rr(R.x + 8, y0 - 4, R.w - 16, rowH - 4, 10).stroke(); }
      D.text(R.x + 18, y0 + 16, q.nm, { size: 15, weight: 800, color: '#334155', align: 'left' });
      D.text(R.x + R.w - 18, y0 + 16, '온실 효과 ' + (k === 'mars' ? '+3 K (약 3~5 K)' : '+' + q.gh + ' K'), { size: 13, weight: 800, color: '#b91c1c', align: 'right' });
      const bh = Math.min(26, (rowH - 44) / 2.2);
      [['평형', q.Te, '#94a3b8'], ['실제', q.Tr, '#ef4444']].forEach((b, j) => {
        const yy = y0 + 26 + j * (bh + 7), ww = (bw * clamp(b[1], 0, TMAXK)) / TMAXK * S.barGrow;
        ctx.fillStyle = '#eef2f7'; rr(bx, yy, bw, bh, 5).fill();
        ctx.fillStyle = b[2]; if (ww > 0.5) rr(bx, yy, ww, bh, Math.min(5, ww / 2)).fill();
        D.text(bx - 5, yy + bh * 0.75, b[0], { size: 12, weight: 800, color: '#64748b', align: 'right' });
        if (ww > bw * 0.75) D.text(bx + ww - 6, yy + bh * 0.76, b[1] + ' K', { size: 12.5, weight: 800, color: '#fff', align: 'right' });
        else D.text(bx + ww + 5, yy + bh * 0.76, b[1] + ' K', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      });
    });
    [0, 200, 400, 600, 800].forEach((k) => { const x = bx + (bw * k) / TMAXK; D.text(x, R.y + R.h - 12, String(k), { size: 11.5, weight: 700, color: '#94a3b8' }); });
  }

  /* ======================================================
     장면 3: 오존층과 자외선 B 차단
     ====================================================== */
  const RC3 = PHONE
    ? { P: { x: 8, y: 8, w: 504, h: 300 }, G: { x: 8, y: 316, w: 504, h: 228 }, I: { x: 8, y: 552, w: 504, h: 160 } }
    : { P: { x: 12, y: 12, w: 300, h: 536 }, G: { x: 320, y: 12, w: 468, h: 296 }, I: { x: 320, y: 316, w: 468, h: 232 } };
  const uvT = (du) => Math.exp((-1.5 * du) / 100);
  const fPct = (v) => (v * 100).toFixed(1) + ' %';
  const OZ_N = 40;
  const OZ = (() => { const rn = seeded(31), g = () => Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(TAU * rn()); const a = []; for (let i = 0; i < OZ_N; i++) a.push({ z: clamp(25 + g() * 6, 15, 36), fx: rn(), ph: rn() * 6 }); return a; })();
  const UVP = [];
  const CFCP = [];
  let uvSpawn = 0, cfcSpawn = 0;
  function ozGeo() {
    const P = RC3.P, pr = { x: P.x + 12, y: P.y + 38, w: P.w - 24, h: P.h - (PHONE ? 52 : 52) };
    pr.Y = (km) => pr.y + pr.h * (1 - km / 50);
    return pr;
  }
  const ozC = (z) => Math.exp(-0.5 * Math.pow((z - 25) / 6.5, 2));
  function drawOzone(t, dt) {
    const { P, G, I } = RC3, pr = ozGeo(), du = S.du, T = uvT(du);
    card(P, '🌍 고도에 따른 오존 분포 (예시)');
    ctx.save(); rr(pr.x, pr.y, pr.w, pr.h, 12).clip();
    const sk = ctx.createLinearGradient(0, pr.y, 0, pr.y + pr.h); sk.addColorStop(0, '#1e1b4b'); sk.addColorStop(0.45, '#3b82f6'); sk.addColorStop(1, '#dbeafe');
    ctx.fillStyle = sk; ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
    // 성층권 · 대류권 경계
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(pr.x, pr.Y(12)); ctx.lineTo(pr.x + pr.w, pr.Y(12)); ctx.stroke(); ctx.setLineDash([]);
    // 오존층 띠 (20~30 km)
    ctx.fillStyle = 'rgba(167,139,250,.18)'; ctx.fillRect(pr.x, pr.Y(30), pr.w, pr.Y(20) - pr.Y(30));
    ctx.strokeStyle = 'rgba(196,181,253,.9)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pr.x, pr.Y(30)); ctx.lineTo(pr.x + pr.w, pr.Y(30)); ctx.moveTo(pr.x, pr.Y(20)); ctx.lineTo(pr.x + pr.w, pr.Y(20)); ctx.stroke(); ctx.setLineDash([]);
    // 오존 농도 곡선
    const xb = pr.x + 44, maxW = pr.w - 66, wDu = du / 400;
    ctx.beginPath(); ctx.moveTo(xb, pr.Y(50));
    for (let km = 50; km >= 0; km -= 1) ctx.lineTo(xb + maxW * ozC(km) * wDu, pr.Y(km));
    ctx.lineTo(xb, pr.Y(0)); ctx.closePath(); ctx.fillStyle = 'rgba(139,92,246,.42)'; ctx.fill();
    ctx.beginPath(); for (let km = 50; km >= 0; km -= 1) { const x = xb + maxW * ozC(km) * wDu, y = pr.Y(km); km === 50 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2.4; ctx.stroke();
    // 지표
    ctx.fillStyle = '#6b8f4e'; ctx.fillRect(pr.x, pr.Y(0) - 8, pr.w, 12);
    // 오존 분자
    const n = du / 10;
    OZ.forEach((o, i) => {
      const a = clamp(n - i, 0, 1); if (a < 0.02) return;
      const x = xb + 14 + o.fx * (pr.w - 82), y = pr.Y(o.z) + Math.sin(t * 1.6 + o.ph) * 2;
      drawMol('o3', x, y, 0.62, 0, a);
    });
    // 자외선
    if (!RM) { uvSpawn += dt * 9; while (uvSpawn >= 1) { uvSpawn -= 1; if (UVP.length < 50) { const abs = Math.random() > T; UVP.push({ x: pr.x + 20 + Math.random() * (pr.w - 40), y: pr.y - 8, vy: 110, age: 0, zAbs: abs ? clamp(25 + (Math.random() + Math.random() + Math.random() - 1.5) * 9, 17, 34) : null }); } } }
    else if (!UVP.length) for (let k = 0; k < 8; k++) UVP.push({ x: pr.x + 20 + (k + 0.5) * ((pr.w - 40) / 8), y: pr.Y(8 + (k % 3) * 8), vy: 0, age: 0, zAbs: null });
    for (let i = UVP.length - 1; i >= 0; i--) {
      const u = UVP[i]; u.age += dt; u.y += u.vy * dt;
      let dead = false;
      if (u.zAbs != null && u.y >= pr.Y(u.zAbs)) { dead = true; for (let k = 0; k < 5; k++) parts.emit({ x: u.x, y: u.y, vx: rnd(-50, 50), vy: rnd(-50, 20), life: 0.55, size: 2.6, color: '#fde68a', drag: 2 }); }
      else if (u.y >= pr.Y(0) - 8) { dead = true; for (let k = 0; k < 4; k++) parts.emit({ x: u.x, y: pr.Y(0) - 8, vx: rnd(-40, 40), vy: rnd(-60, -20), life: 0.5, size: 2.8, color: '#f472b6', drag: 1.5, gravity: 120 }); }
      if (dead) UVP.splice(i, 1);
    }
    UVP.forEach((u) => { ctx.save(); ctx.translate(u.x, u.y); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4.4; ctx.beginPath(); for (let q = -18; q <= 0; q += 2) { const xx = 3 * Math.sin((q - u.age * 70) / 5 * TAU / 2); q === -18 ? ctx.moveTo(xx, q) : ctx.lineTo(xx, q); } ctx.stroke(); ctx.strokeStyle = '#a21caf'; ctx.lineWidth = 2.2; ctx.beginPath(); for (let q = -18; q <= 0; q += 2) { const xx = 3 * Math.sin((q - u.age * 70) / 5 * TAU / 2); q === -18 ? ctx.moveTo(xx, q) : ctx.lineTo(xx, q); } ctx.stroke(); ctx.restore(); });
    // 프레온
    if (S.cfc) {
      cfcSpawn += dt * 3;
      while (cfcSpawn >= 1 && S.cfc.spawn > 0) { cfcSpawn -= 1; S.cfc.spawn--; CFCP.push({ x: pr.x + 30 + Math.random() * (pr.w - 60), z: 0, cl: false, age: 0, ph: Math.random() * 6 }); }
      CFCP.forEach((c) => {
        c.age += dt;
        if (!c.cl) { c.z += 7 * dt; if (c.z >= 24) { c.cl = true; c.age = 0; parts.burst(c.x, pr.Y(c.z), { count: 8, speed: 70, life: 0.5, colors: ['#4ade80', '#fde047'], gravity: 0 }); } }
        else { c.x += Math.sin(c.age * 3 + c.ph) * 22 * dt; c.z += Math.cos(c.age * 2.3 + c.ph) * 2 * dt; }
      });
      for (let i = CFCP.length - 1; i >= 0; i--) if (CFCP[i].cl && CFCP[i].age > 4.5) CFCP.splice(i, 1);
      CFCP.forEach((c) => { const x = c.x, y = pr.Y(c.z); if (!c.cl) { D.sphere(x, y, 7, '#94a3b8'); D.text(x, y + 4, 'C', { size: 10, weight: 800, color: '#fff' }); } else { D.glow(x, y, 20, '#4ade80', 0.5); D.sphere(x, y, 6.5, '#22c55e'); D.text(x, y + 3.5, 'Cl', { size: 9.5, weight: 800, color: '#fff' }); } });
    } else CFCP.length = 0;
    ctx.restore();
    // 라벨
    D.label(pr.x + pr.w - 6, pr.Y(25), '오존층 20~30 km', { bg: '#7c3aed', size: 12.5, pad: 7, align: 'right' });
    D.label(pr.x + pr.w - 6, pr.Y(42), '성층권', { bg: 'rgba(15,23,42,.55)', size: 12.5, pad: 7, align: 'right' });
    D.label(pr.x + pr.w - 6, pr.Y(6), '대류권', { bg: 'rgba(15,23,42,.55)', size: 12.5, pad: 7, align: 'right' });
    [0, 10, 20, 30, 40, 50].forEach((km) => D.text(pr.x + 4, pr.Y(km) + (km === 0 ? -12 : 4), km + (km === 50 ? ' km' : ''), { size: 11.5, weight: 700, color: '#e2e8f0', align: 'left', stroke: 'rgba(15,23,42,.55)', strokeWidth: 3 }));
    D.label(pr.x + pr.w / 2, pr.y + 16, '태양의 자외선(UV-B) ▼', { bg: '#a21caf', size: 12.5, pad: 8 });
    if (S.cfc && du <= 105) D.label(pr.x + pr.w / 2, pr.Y(34.5), '오존 구멍!', { bg: '#dc2626', size: 13.5, pad: 9 });

    // 투과율 그래프
    card(G, '📉 오존 전량과 UV-B 투과율  (투과율 = e^(−τ), τ = 1.5 × DU/100)');
    const gb = { x: G.x + 46, y: G.y + 40, w: G.w - 46 - 18, h: G.h - 40 - 44 };
    const gX = (v) => gb.x + (gb.w * (v - 100)) / 300, gY = (v) => gb.y + gb.h - gb.h * clamp(v, 0, 1);
    ctx.fillStyle = '#f8fafc'; rr(gb.x, gb.y, gb.w, gb.h, 4).fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(gb.x, gY(v)); ctx.lineTo(gb.x + gb.w, gY(v)); ctx.stroke(); D.text(gb.x - 6, gY(v) + 4.5, Math.round(v * 100) + '%', { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    [100, 150, 200, 250, 300, 350, 400].forEach((v) => { ctx.beginPath(); ctx.moveTo(gX(v), gb.y); ctx.lineTo(gX(v), gb.y + gb.h); ctx.stroke(); D.text(gX(v), gb.y + gb.h + 15 * FS, String(v), { size: 12.5, weight: 700, color: '#64748b' }); });
    D.text(gb.x + gb.w / 2, gb.y + gb.h + 32 * FS, '오존 전량 (DU)', { size: 12.5, weight: 700, color: '#64748b' });
    ctx.save(); ctx.beginPath(); ctx.rect(gb.x, gb.y, gb.w, gb.h); ctx.clip();
    ctx.beginPath(); for (let v = 100; v <= 400; v += 5) { const x = gX(v), y = gY(uvT(v)); v === 100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = '#a21caf'; ctx.lineWidth = 3.2; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(gb.x, gb.y, gb.w, gb.h);
    [300, 150, 100].forEach((v) => { D.sphere(gX(v), gY(uvT(v)), 4.2, '#c084fc', { gloss: false }); });
    D.dashedLine(gX(du), gY(T), gX(du), gb.y + gb.h, { color: '#64748b', width: 1.6 });
    D.sphere(gX(du), gY(T), 7, '#dc2626', { shadow: true });
    D.label(clamp(gX(du) + (du > 330 ? -52 : 54), gb.x + 46, gb.x + gb.w - 46), clamp(gY(T) - 22, gb.y + 14, gb.y + gb.h - 18), Math.round(du) + ' DU · ' + fPct(T), { bg: '#dc2626', size: 12.5, pad: 7 });

    // 비교 막대
    card(I, '🔬 오존이 줄면 UV-B가 얼마나 늘까?');
    const rows = [[300, '정상'], [150, '감소'], [100, '구멍']];
    const bx = I.x + (PHONE ? 96 : 116), bw = I.w - (PHONE ? 96 : 116) - 70, mx = 0.25, rh = PHONE ? 26 : 34, ry0 = I.y + 46;
    rows.forEach((r, i) => {
      const v = uvT(r[0]), y = ry0 + i * (rh + (PHONE ? 6 : 10));
      D.text(I.x + 14, y + rh * 0.68, r[1] + ' ' + r[0] + ' DU', { size: 13, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#eef2f7'; rr(bx, y, bw, rh, 6).fill();
      const ww = (bw * Math.min(v, mx)) / mx; ctx.fillStyle = '#a21caf'; if (ww > 0.5) rr(bx, y, ww, rh, Math.min(6, ww / 2)).fill();
      D.text(bx + bw + 6, y + rh * 0.7, fPct(v), { size: 13, weight: 800, color: '#a21caf', align: 'left' });
      if (Math.abs(S.du - r[0]) < 5) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.4; rr(bx - 3, y - 3, bw + 6, rh + 6, 8).stroke(); }
    });
    const ratio = uvT(100) / uvT(300);
    drawWrap(I.x + I.w / 2, ry0 + 3 * (rh + (PHONE ? 6 : 10)) + (PHONE ? 6 : 8), '오존이 1/3로 줄면(300 → 100 DU) UV-B 투과율이 ' + fPct(uvT(300)) + ' → ' + fPct(uvT(100)) + ', 약 ' + Math.round(ratio) + '배 → DNA 손상(피부암, 광합성 저해)', I.w - 28, 13, { color: '#7e22ce' });
  }
  function startCfc() {
    if (S.duTw) S.duTw.cancel();
    S.cfc = { spawn: 14 };
    S.duTw = SciSim.tween(S, { du: 100 }, { duration: 6, ease: 'inOutSine', onUpdate: syncDu, onDone: () => { S.duTw = null; syncDu(); setTimeout(() => { if (S.cfc && S.cfc.spawn <= 0) S.cfc = null; }, 4800); } });
  }
  function stopCfc() { if (S.duTw) { S.duTw.cancel(); S.duTw = null; } S.cfc = null; CFCP.length = 0; }
  function tweenDu(v) { if (S.duTw) S.duTw.cancel(); S.cfc = null; CFCP.length = 0; S.duTw = SciSim.tween(S, { du: v }, { duration: 0.9, ease: 'outCubic', onUpdate: syncDu, onDone: () => { S.duTw = null; syncDu(); } }); }
  function syncDu() { const d = clamp(Math.round(S.du), 100, 400); setSlider($('#sDu'), $('#oDu'), d, (x) => Math.round(x) + ' DU'); S.duSeen[Math.round(d / 10) * 10] = true; }

  /* ======================================================
     장면 4: 물과 생명 (생명가능지대)
     ====================================================== */
  const RC4 = PHONE
    ? { O: { x: 8, y: 8, w: 504, h: 270 }, W: { x: 8, y: 286, w: 504, h: 426 } }
    : { O: { x: 12, y: 12, w: 776, h: 252 }, W: { x: 12, y: 272, w: 776, h: 276 } };
  const hzGeo = () => {
    const O = RC4.O, g = { x0: O.x + (PHONE ? 66 : 96), x1: O.x + O.w - 26, y: O.y + (PHONE ? 158 : 150) };
    g.X = (d) => g.x0 + ((d - 0.5) / 1.5) * (g.x1 - g.x0); return g;
  };
  const sOf = (d) => 1361 / (d * d);
  const stateOf = (d) => (d < 0.95 ? 0 : d <= 1.4 ? 1 : 2);
  const STN4 = ['증발 (물이 끓어 수증기로)', '액체 물', '얼음 (얼어붙음)'];
  S.stM = [0, 1, 0];
  function drawHZ(t, dt) {
    const { O, W } = RC4, g = hzGeo(), d = S.dist, st = stateOf(d);
    for (let i = 0; i < 3; i++) S.stM[i] = approach(S.stM[i], i === st ? 1 : 0, dt, 6);
    card(O, '🛰️ 태양과의 거리와 받는 복사 S = 1361 / d²  (d: AU)');
    ctx.save(); rr(O.x + 10, O.y + 36, O.w - 20, O.h - 46, 12).clip();
    const bg = ctx.createLinearGradient(O.x, 0, O.x + O.w, 0); bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#0f172a'); ctx.fillStyle = bg; ctx.fillRect(O.x, O.y, O.w, O.h);
    D.space(O.x + 10, O.y + 36, O.w - 20, O.h - 46, t, { stars: 50, top: '#1e1b4b', bottom: '#0b1020' });
    // 생명가능지대
    const zx0 = g.X(0.95), zx1 = g.X(1.4);
    const zg = ctx.createLinearGradient(0, g.y - 78, 0, g.y + 56); zg.addColorStop(0, 'rgba(74,222,128,.08)'); zg.addColorStop(0.5, 'rgba(74,222,128,.32)'); zg.addColorStop(1, 'rgba(74,222,128,.08)');
    ctx.fillStyle = zg; ctx.fillRect(zx0, g.y - 78, zx1 - zx0, 134);
    ctx.strokeStyle = 'rgba(134,239,172,.9)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(zx0, g.y - 78); ctx.lineTo(zx0, g.y + 56); ctx.moveTo(zx1, g.y - 78); ctx.lineTo(zx1, g.y + 56); ctx.stroke(); ctx.setLineDash([]);
    // 태양
    D.glow(O.x + 18, g.y, 90, '#fde047', 0.55); D.sphere(O.x + 18, g.y, 34, '#facc15', { gloss: false });
    // 축
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    [0.5, 1, 1.5, 2].forEach((v) => { ctx.beginPath(); ctx.moveTo(g.X(v), g.y - 5); ctx.lineTo(g.X(v), g.y + 5); ctx.stroke(); D.text(g.X(v), g.y + 22, v.toFixed(1), { size: 12.5, weight: 700, color: '#cbd5e1' }); });
    D.text(g.x1 - 4, g.y + 40, 'AU', { size: 12.5, weight: 800, color: '#cbd5e1', align: 'right' });
    // 이름 있는 행성
    [['금성', 0.72, '#fde68a'], ['지구', 1.0, '#60a5fa'], ['화성', 1.52, '#f97316']].forEach((q) => {
      const x = g.X(q[1]), y = g.y - 40;
      D.sphere(x, y, 9, q[2]); D.text(x, y - 14, q[0] + ' ' + q[1].toFixed(2), { size: 12, weight: 800, color: '#e2e8f0', stroke: 'rgba(15,23,42,.7)', strokeWidth: 3 });
      ctx.strokeStyle = 'rgba(203,213,225,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, g.y); ctx.stroke();
    });
    D.text((zx0 + zx1) / 2, g.y - (PHONE ? 90 : 62), '생명가능지대', { size: 13.5, weight: 800, color: '#bbf7d0', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    D.text((zx0 + zx1) / 2, g.y - (PHONE ? 74 : 46), '0.95~1.4 AU', { size: 12, weight: 700, color: '#bbf7d0', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    // 내 행성 (끌 수 있어요)
    const mx = g.X(d), my = g.y + 6;
    D.ring(mx, my, 26, t, { color: '#38bdf8' });
    const cSteam = '#c2410c', cLiq = '#2563eb', cIce = '#e0f2fe';
    const col = mixc(mixc(cSteam, cLiq, S.stM[1]), cIce, S.stM[2]);
    D.sphere(mx, my, 20, col, { shadow: true });
    if (S.stM[0] > 0.3 && !RM && Math.random() < 0.35) parts.emit({ x: mx + rnd(-14, 14), y: my - 16, vx: rnd(-10, 10), vy: rnd(-50, -28), life: 1.1, size: 7, color: 'rgba(255,255,255,.8)', shape: 'smoke', grow: 8 });
    if (S.stM[1] > 0.5) { ctx.save(); ctx.beginPath(); ctx.arc(mx, my, 19, 0, TAU); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.6; for (let k = -1; k <= 1; k++) { ctx.beginPath(); for (let u = -20; u <= 20; u += 3) { const yy = my + k * 7 + Math.sin(u / 4 + t * 2 + k) * 2; u === -20 ? ctx.moveTo(mx + u, yy) : ctx.lineTo(mx + u, yy); } ctx.stroke(); } ctx.restore(); }
    if (S.stM[2] > 0.5) { ctx.strokeStyle = 'rgba(59,130,246,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(mx - 12, my - 6); ctx.lineTo(mx - 2, my + 2); ctx.lineTo(mx + 8, my - 8); ctx.moveTo(mx - 2, my + 2); ctx.lineTo(mx - 4, my + 14); ctx.stroke(); }
    ctx.restore();
    // 읽음 글
    const Sv = Math.round(sOf(d));
    ctx.fillStyle = 'rgba(15,23,42,.78)'; rr(O.x + 18, g.y + 38, PHONE ? 330 : 380, 52, 10).fill();
    D.text(O.x + 28, g.y + 58, 'd = ' + d.toFixed(2) + ' AU → S = 1361 / ' + d.toFixed(2) + '² = ' + Sv + ' W/m²', { size: 13.5, weight: 800, color: '#fde68a', align: 'left' });
    D.text(O.x + 28, g.y + 79, '지구의 ' + (Sv / 1361).toFixed(2) + '배 · 표면: ' + ['증발', '액체 물', '얼음'][st], { size: 13, weight: 800, color: '#fff', align: 'left' });

    // 물의 성질 카드
    card(W, '💧 물의 성질: ' + ['큰 비열 (4.2 J/g·K)', '큰 증발 잠열 (2.26 MJ/kg)', '얼음(밀도 0.92)이 물 위에 떠요', '극성 용매'][S.prop]);
    const wr = { x: W.x + 12, y: W.y + 38, w: W.w - 24, h: W.h - 50 };
    ctx.save(); rr(wr.x, wr.y, wr.w, wr.h, 12).clip();
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(wr.x, wr.y, wr.w, wr.h);
    [drawPropC, drawPropL, drawPropIce, drawPropPolar][S.prop](wr, t, dt);
    ctx.restore();
  }
  function propText(r, l1, l2) {
    const y1 = drawWrap(r.x + r.w / 2, r.y + 20, l1, r.w - 24, 13, { color: '#0369a1', weight: 800 });
    const y2 = drawWrap(r.x + r.w / 2, y1 + 18 * FS, l2, r.w - 24, 12.5, { color: '#475569' });
    return y2;
  }
  /* 물의 성질 1: 비열 */
  function drawPropC(r, t, dt) {
    const cyc = 9, u = ((t % cyc) / cyc), uu = Math.min(1, u / 0.8);
    const tw = 20 + 40 * uu * 0.8 / 4.2, tr = 20 + 40 * uu;
    const cw = r.w / 2, by = r.y + r.h - 46;
    [[0, '물', tw, '#38bdf8'], [1, '모래·암석', tr, '#d6b98c']].forEach((q) => {
      const cx = r.x + cw * q[0] + cw / 2, bw = PHONE ? 110 : 130, bh = PHONE ? 118 : 100;
      if (q[0] === 0) D.beaker(cx - bw / 2, by - bh - 24, bw, bh, { level: 0.7, liquid: q[3], t, ticks: 0 });
      else { ctx.fillStyle = q[3]; poly([[cx - bw / 2 - 6, by - 24], [cx - 28, by - bh - 4], [cx + 28, by - bh - 4], [cx + bw / 2 + 6, by - 24]]); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(cx - bw / 2 - 6, by - 28, bw + 12, 4); }
      D.flame(cx, by - 8, 20 + 5 * Math.sin(t * 9), t);
      D.label(cx, by + 14, q[1] + '  ' + minus(fx(q[2], 1)) + ' °C', { bg: q[0] ? '#a16207' : '#0284c7', size: 13, pad: 9 });
      D.thermometer(cx + bw / 2 + 24, by - bh - 22, bh - 16, q[2], 20, 62, { ticks: false, color: q[0] ? '#f97316' : '#0ea5e9' });
    });
    propText(r, '같은 열을 같은 시간 동안 가해도 비열이 큰 물은 온도가 덜 올라요', '비열: 물 4.2 J/g·K, 모래·암석 약 0.8 J/g·K (같은 질량) → 바다는 기온 변화를 줄여 줘요');
  }
  /* 물의 성질 2: 증발 잠열 */
  function drawPropL(r, t, dt) {
    const wy = r.y + r.h * 0.55;
    const wg = ctx.createLinearGradient(0, wy, 0, r.y + r.h); wg.addColorStop(0, '#7dd3fc'); wg.addColorStop(1, '#0ea5e9'); ctx.fillStyle = wg; ctx.fillRect(r.x, wy, r.w, r.h);
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(r.x, r.y, r.w, wy - r.y);
    for (let k = 0; k < 7; k++) { const x = r.x + 40 + k * ((r.w - 80) / 6), ph = (t * 0.4 + k * 0.37) % 1, y = wy - ph * (wy - r.y - 20); const a = Math.sin(ph * Math.PI); D.sphere(x + Math.sin(ph * 6 + k) * 8, y, 6, '#38bdf8', { gloss: false }); D.glow(x + Math.sin(ph * 6 + k) * 8, y, 14, '#fb923c', 0.7 * a); }
    for (let k = 0; k < 7; k++) D.sphere(r.x + 30 + k * ((r.w - 60) / 6) + Math.sin(t * 2 + k) * 4, wy + 18 + (k % 3) * 18 + Math.cos(t * 2.2 + k) * 3, 6, '#0369a1', { gloss: false });
    D.arrow(r.x + 24, wy - 74, r.x + 24, wy - 10, { color: '#f59e0b', width: 5, head: 13 });
    D.text(r.x + 34, wy - 56, '열을 흡수', { size: 12.5, weight: 800, color: '#b45309', align: 'left' });
    const bx = r.x + r.w - (PHONE ? 220 : 270), bw = PHONE ? 200 : 250, by0 = r.y + 14;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(bx - 10, by0 - 6, bw + 20, PHONE ? 104 : 110, 10).fill();
    [['1 kg 증발 (잠열)', 2.26, '#f97316'], ['1 kg을 0 → 100 °C로 가열', 0.42, '#38bdf8']].forEach((q, i) => {
      const y = by0 + 18 + i * 44;
      D.text(bx, y - 4, q[0], { size: 12, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#eef2f7'; rr(bx, y + 2, bw, 16, 5).fill(); ctx.fillStyle = q[2]; rr(bx, y + 2, (bw * q[1]) / 2.26 * clamp((t % 6) / 1.2, 0, 1), 16, 5).fill();
      D.text(bx + bw * q[1] / 2.26 * clamp((t % 6) / 1.2, 0, 1) + (q[1] > 1 ? -4 : 6), y + 15, q[1].toFixed(2) + ' MJ', { size: 12, weight: 800, color: q[1] > 1 ? '#fff' : '#334155', align: q[1] > 1 ? 'right' : 'left' });
    });
    drawWrap(r.x + r.w / 2, r.y + r.h - 22 * FS, '증발할 때 열을 가져가 주변이 식고, 수증기가 응결하면 그 열을 내놓아요', r.w - 24, 12.5, { color: '#fff', weight: 800 });
  }
  /* 물의 성질 3: 얼음이 떠요 */
  function drawPropIce(r, t, dt) {
    const wy = r.y + r.h * 0.34;
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(r.x, r.y, r.w, wy - r.y);
    const wg = ctx.createLinearGradient(0, wy, 0, r.y + r.h); wg.addColorStop(0, '#7dd3fc'); wg.addColorStop(1, '#0369a1'); ctx.fillStyle = wg; ctx.fillRect(r.x, wy, r.w, r.y + r.h - wy);
    const th = 24, bob = Math.sin(t * 1.4) * 1.5;
    ctx.fillStyle = 'rgba(240,249,255,.95)'; rr(r.x + 10, wy - th * 0.08 + bob, r.w - 20, th, 6).fill(); ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 2; rr(r.x + 10, wy - th * 0.08 + bob, r.w - 20, th, 6).stroke();
    D.text(r.x + 22, wy + th * 0.62 + bob, '얼음 (밀도 0.92 g/cm³)', { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
    D.text(r.x + 22, wy + th + 30, '액체 물 (밀도 1.00 g/cm³)', { size: 12.5, weight: 800, color: '#e0f2fe', align: 'left', stroke: 'rgba(3,105,161,.5)', strokeWidth: 3 });
    // 물고기
    for (let k = 0; k < 2; k++) {
      const fx = r.x + 60 + ((t * (28 + k * 9) + k * 220) % (r.w - 120)), fy = r.y + r.h * 0.7 + k * 26 + Math.sin(t * 2 + k) * 4;
      ctx.fillStyle = k ? '#fb923c' : '#fbbf24'; ctx.beginPath(); ctx.ellipse(fx, fy, 15, 7, 0, 0, TAU); ctx.fill(); poly([[fx - 13, fy], [fx - 24, fy - 8], [fx - 24, fy + 8]]); ctx.fill(); D.sphere(fx + 8, fy - 1.5, 1.8, '#0f172a', { gloss: false });
    }
    propText(r, '얼음이 물보다 가벼워서 호수 위에 떠요', '얼음이 이불처럼 덮이면 그 아래 물은 얼지 않아서 수중 생물이 겨울을 날 수 있어요');
  }
  /* 물의 성질 4: 극성 용매 */
  function drawPropPolar(r, t, dt) {
    ctx.fillStyle = '#bae6fd'; ctx.fillRect(r.x, r.y, r.w, r.h);
    const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.55, R0 = PHONE ? 62 : 74;
    const ions = [[-1, '#94a3b8', 'Na⁺', -1], [1, '#22c55e', 'Cl⁻', 1]];
    ions.forEach((q) => {
      const ix = cx + q[0] * R0 * 0.62;
      D.glow(ix, cy, 40, q[1], 0.35); D.sphere(ix, cy, q[0] < 0 ? 13 : 17, q[1]); D.text(ix, cy + 4.5, q[2], { size: 11.5, weight: 800, color: '#fff' });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + t * 0.5 * q[0] + (q[0] < 0 ? 0 : 0.6), rad = (q[0] < 0 ? 40 : 44) + Math.sin(t * 2 + k) * 2;
        const wx = ix + Math.cos(a) * rad, wy = cy + Math.sin(a) * rad;
        const dirA = Math.atan2(wy - cy, wx - ix);   // 바깥쪽을 가리키는 각
        // Na⁺는 산소(−)쪽이, Cl⁻는 수소(+)쪽이 이온을 향해요
        const toward = q[0] < 0 ? dirA + Math.PI : dirA;
        const ox = wx + Math.cos(toward) * 0.0, oy = wy + Math.sin(toward) * 0.0;
        // 물 분자: O 중심에서 H 두 개
        if (q[0] < 0) { D.sphere(wx, wy, 7, '#ef4444'); [-0.9, 0.9].forEach((s) => D.sphere(wx + Math.cos(dirA + s) * 9, wy + Math.sin(dirA + s) * 9, 3.6, '#f8fafc')); }
        else { D.sphere(wx, wy, 7, '#ef4444'); [-0.9, 0.9].forEach((s) => D.sphere(wx + Math.cos(dirA + Math.PI + s) * 9, wy + Math.sin(dirA + Math.PI + s) * 9, 3.6, '#f8fafc')); }
      }
    });
    propText(r, '물 분자는 O쪽이 약한 (−), H쪽이 약한 (+)인 극성 분자예요', '소금(Na⁺, Cl⁻) 같은 이온 물질과 영양소를 잘 녹여서 생명 활동의 무대가 돼요');
    D.text(r.x + r.w / 2, r.y + r.h - 12, '붉은 구 = 산소(O), 흰 구 = 수소(H)', { size: 12, weight: 700, color: '#0c4a6e' });
  }
  function setDistFromX(x) {
    const g = hzGeo(), d = clamp(0.5 + ((x - g.x0) / (g.x1 - g.x0)) * 1.5, 0.5, 2);
    S.dist = Math.round(d * 100) / 100; setSlider($('#sDist'), $('#oDist'), S.dist, (q) => (+q).toFixed(2) + ' AU');
  }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const MODES = [['spec', '📈 흡수'], ['gh', '🌡️ 온실'], ['o3', '☀️ 오존'], ['hz', '💧 물']];
  const MODE_LABEL = { spec: '📈 선택적 흡수: 파장별 대기 투과율', gh: '🌡️ 온실 효과: 대기가 없을 때와 있을 때', o3: '☀️ 오존층과 자외선(UV-B) 차단', hz: '💧 물과 생명가능지대' };
  const FREE_KEYS = { spec: ['gases', 'lam'], gh: ['planet', 'atm'], o3: ['du'], hz: ['dist', 'props'] };
  let ctlKeys = [];
  $('#modeSeg').innerHTML = MODES.map((m) => '<button type="button" data-mode="' + m[0] + '">' + m[1] + '</button>').join('');
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

  // 장면 1
  function syncGas() { $$('#gasBtns .tog').forEach((b) => b.classList.toggle('on', !!S.gas[b.dataset.g])); }
  $$('#gasBtns .tog').forEach((b) => b.addEventListener('click', () => { Sound.click(); const g = b.dataset.g; S.gas[g] = !S.gas[g]; if (S.gas[g]) S.gasSeen[g] = true; syncGas(); }));
  $('#bGasAll').addEventListener('click', () => { Sound.click(); GAS_IDS.forEach((g) => { S.gas[g] = true; S.gasSeen[g] = true; }); syncGas(); });
  $('#bGasNone').addEventListener('click', () => { Sound.click(); GAS_IDS.forEach((g) => { S.gas[g] = false; }); syncGas(); });
  SciSim.bindRange($('#sLam'), $('#oLam'), (v) => fLam(lamOfV(v)), (v) => { S.lamV = +v; });
  clearBadOnInput('.num-in');
  const clsGas = makeClassify($('#clsGas'), [
    { id: 'g1', label: '<b>오존</b> (O₃)' }, { id: 'g2', label: '<b>산소</b> (O₂)' }, { id: 'g3', label: '<b>수증기</b> (H₂O)' },
    { id: 'g4', label: '<b>이산화 탄소</b> (CO₂)' }, { id: 'g5', label: '<b>메테인</b> (CH₄)' },
  ], [{ id: 'uv', label: '자외선' }, { id: 'vis', label: '가시광선' }, { id: 'ir', label: '적외선' }], { g1: 'uv', g2: 'uv', g3: 'ir', g4: 'ir', g5: 'ir' }, () => { });

  // 장면 2
  const ATM_NOTE = {
    earth: '지구: 대기가 있으면 온실 기체가 지구가 내놓는 적외선을 일부 되돌려 보내요.',
    venus: '금성: 92기압의 두꺼운 CO₂ 대기가 적외선을 거의 가둬 둬요.',
    mars: '화성: 대기가 아주 얇아(0.006기압) 거의 달라지지 않아요.',
  };
  function syncGH() {
    syncSeg('#planetBtns', 'p', S.planet); syncSeg('#atmBtns', 'a', S.atm);
    $('#atmNote').textContent = ATM_NOTE[S.planet];
  }
  bindSeg('#planetBtns', 'p', (p) => { S.planet = p; S.planetsSeen[p] = true; S.barGrow = Math.min(S.barGrow, 1); syncGH(); });
  bindSeg('#atmBtns', 'a', (a) => { S.atm = +a; syncGH(); });
  const pairPl = makePair($('#pairPl'), [{ id: 'venus', label: '금성' }, { id: 'earth', label: '지구' }, { id: 'mars', label: '화성' }],
    [{ id: 'r33', label: '+33 K' }, { id: 'r510', label: '+510 K' }, { id: 'r3', label: '+약 3~5 K' }], { venus: 'r510', earth: 'r33', mars: 'r3' }, () => { });

  // 장면 3
  SciSim.bindRange($('#sDu'), $('#oDu'), (v) => Math.round(v) + ' DU', (v) => { stopCfc(); S.du = +v; S.duSeen[+v] = true; });
  bindSeg('#duBtns', 'du', (v) => tweenDu(+v));
  $('#bCfc').addEventListener('click', () => { Sound.click(); startCfc(); });

  // 장면 4
  SciSim.bindRange($('#sDist'), $('#oDist'), (v) => (+v).toFixed(2) + ' AU', (v) => { S.dist = +v; });
  bindSeg('#propBtns', 'pr', (p) => { S.prop = +p; S.propSeen[p] = true; syncSeg('#propBtns', 'pr', p); });
  const clsLife = makeClassify($('#clsLife'), [
    { id: 'c1', label: '액체 상태의 <b>물</b>이 존재할 수 있는 거리' },
    { id: 'c2', label: '<b>적당한 온실 효과</b>' },
    { id: 'c3', label: '해로운 자외선을 막는 <b>오존층</b>' },
    { id: 'c4', label: '대기를 붙잡아 둘 만한 <b>중력</b>(과 자기장)' },
    { id: 'c5', label: '태양에 되도록 <b>가까워서</b> 늘 100 °C가 넘는 표면' },
    { id: 'c6', label: '온실 효과가 <b>전혀 없는</b> 얇은 대기' },
  ], [{ id: 'T', label: '필요해요' }, { id: 'F', label: '필요 없어요' }], { c1: 'T', c2: 'T', c3: 'T', c4: 'T', c5: 'F', c6: 'F' }, () => { });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); flash.t = 0; PH.length = 0; UVP.length = 0; stopCfc();
    GAS_IDS.forEach((g) => { S.gas[g] = false; }); S.gasSeen = {}; syncGas(); S.lamV = 35; setSlider($('#sLam'), $('#oLam'), 35, (q) => fLam(lamOfV(q)));
    $$('.num-in').forEach((e) => { e.value = ''; e.classList.remove('bad'); });
    clsGas.reset(); pairPl.reset(); clsLife.reset();
    S.planet = 'earth'; S.atm = 0; S.seenAtm = { 0: false, 1: false }; S.planetsSeen = { earth: true }; TEMP.value = PLD.earth.Te; TEMP.target = PLD.earth.Te; TEMP.velocity = 0; S.atmV = 0; S.barGrow = 0; syncGH();
    S.du = 300; S.duSeen = { 300: true }; syncDu();
    S.dist = 1; setSlider($('#sDist'), $('#oDist'), 1, (q) => (+q).toFixed(2) + ' AU'); S.prop = 0; S.propSeen = { 0: true }; syncSeg('#propBtns', 'pr', 0);
    if (li === 0) { setMode('spec'); setCtl(['gases', 'lam', 'peakIn']); showHint('기체 단추를 켜면 투과율이 낮아지는 파장대가 색으로 보여요', 5200); }
    else if (li === 1) { setMode('gh'); setCtl(['planet', 'atm']); showHint('대기를 없음에서 있음으로 바꾸면 온도계가 올라가요', 5200); }
    else if (li === 2) { setMode('o3'); setCtl(['du']); showHint('오존 전량 슬라이더를 움직이면 통과하는 자외선이 달라져요', 5200); }
    else { setMode('hz'); setCtl(['dist', 'props']); showHint('행성 표시를 끌어서 태양과의 거리를 바꿔 봐요', 5200); }
    updateCtl();
  }
  const sunV = () => $in('#iSun'), earV = () => $in('#iEarth');
  const okSun = () => near(sunV(), 0.5, 0.03), okEar = () => near(earV(), 10.1, 0.3);
  const levels = [
    {
      title: '대기는 빛을 골라서 흡수해요', short: '선택적 흡수', icon: '📈', phase: '분석', features: ['spec'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구에서 생명이 살 수 있는 이유를 대기와 물의 성질로 설명할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학·중학교에서</b> 지구의 복사 평형(반사 30 %, 흡수 70 %)과 온실 효과를 배웠고, <b>일반선택 지구과학(he-blackbody)</b>에서 빈의 법칙 λmax = 2898 / T (µm)와 E = σT⁴을 배웠어요. 이번에는 대기 기체가 파장에 따라 빛을 다르게 흡수하는 <b>선택적 흡수</b>로 한 걸음 더 나아가요.</div>' +
        '<p>태양(표면 5800 K)과 지구(표면 288 K)는 복사 세기가 가장 큰 파장이 서로 달라요. 아래 그래프에서 <b>기체 단추</b>를 켜 보면, 기체마다 투과율이 크게 낮아지는 파장대가 달라요. 대기는 어떤 빛은 통과시키고, 어떤 빛은 막을까요?</p>',
      setup() { resetStep(0); },
      recap: '대기는 선택적 흡수체예요. 자외선은 O₂·O₃가, 적외선은 H₂O·CO₂·CH₄가 주로 흡수하고, 태양의 가시광선은 지표에 닿지만 지구가 내놓는 적외선은 대부분 흡수돼요.',
      summary: '<ul><li>태양(5800 K)은 <b>가시광선</b>(λmax ≈ 0.50 µm), 지구(288 K)는 <b>적외선</b>(λmax ≈ 10.1 µm)이 가장 세요. (λmax = 2898 / T)</li><li>대기 기체는 <b>선택적 흡수체</b>: 자외선은 <b>O₂·O₃</b>, 적외선은 <b>H₂O·CO₂·CH₄(·O₃)</b>가 주로 흡수해요.</li><li>가시광선(0.4~0.7 µm)은 약 90 %가 지나가고, CO₂ 4.3·15 µm, 수증기 6.3 µm와 20 µm 이상은 거의 0 %예요. 8~12 µm <b>대기창</b>은 약 80 %가 통과해요.</li><li>그래서 태양의 가시광선은 지표를 데우고, 지구의 적외선은 대기에 흡수되어 일부가 되돌아와요 → <b>온실 효과</b>의 바탕.</li></ul>',
      missions: [
        {
          title: '복사 최대 파장 계산', manual: true,
          goal: '<b>빈의 법칙 λmax = 2898 / T</b>로 태양(5800 K)과 지구 표면(288 K)의 복사 세기가 가장 큰 파장을 구해 µm로 입력해요.',
          hint: '2898 / 5800은 약 0.50, 2898 / 288은 약 10.1이에요. 그래프에서 두 곡선의 봉우리 위치와 비교해 봐요.',
          setup() { $('#iSun').value = ''; $('#iEarth').value = ''; setMode('spec'); setCtl(['gases', 'lam', 'peakIn']); },
          status: () => mark(okSun()) + ' 태양 ' + (sunV() == null ? '—' : sunV() + ' µm') + ' · ' + mark(okEar()) + ' 지구 ' + (earV() == null ? '—' : earV() + ' µm'),
          check() {
            const a = sunV(), b = earV();
            if (a == null || b == null) return '두 칸에 모두 값을 입력해 주세요.';
            markBad('#iSun', !okSun()); markBad('#iEarth', !okEar());
            if (!okSun() && !okEar()) return 'λmax = 2898 / T에서 T는 켈빈(K) 온도예요. 두 값을 다시 계산해 봐요.';
            if (!okSun()) return '태양: 2898 / 5800은 약 몇 µm일까요? 소수 둘째 자리까지 계산해 봐요.';
            if (!okEar()) return '지구: 2898 / 288은 약 몇 µm일까요? 소수 첫째 자리까지 계산해 봐요.';
            return true;
          },
          explain: '태양: 2898 / 5800 ≈ <b>0.50 µm</b>(가시광선), 지구: 2898 / 288 ≈ <b>10.1 µm</b>(적외선)이에요. 뜨거운 물체일수록 짧은 파장의 빛을 세게 내보내요.',
        },
        {
          title: '기체와 흡수하는 빛 짝짓기', manual: true,
          goal: '기체를 하나씩 켜 보고, 각 기체가 <b>주로 흡수하는 빛</b>(자외선·가시광선·적외선)을 골라요.',
          hint: 'O₂·O₃ 단추를 켜면 0.3 µm보다 짧은 쪽, H₂O·CO₂·CH₄를 켜면 0.7 µm보다 긴 쪽에서 투과율이 파여요.',
          setup() { clsGas.reset(); setMode('spec'); setCtl(['gases', 'lam', 'clsGas']); },
          status: () => mark(clsGas.ok()) + ' 고른 기체 ' + clsGas.count() + ' / 5 · ' + mark(GAS_IDS.every((g) => S.gasSeen[g])) + ' 켜 본 기체 ' + GAS_IDS.filter((g) => S.gasSeen[g]).length + ' / 4',
          check() {
            if (!clsGas.complete()) return '기체 5개를 모두 골라 주세요. (지금 ' + clsGas.count() + '개)';
            if (!clsGas.ok()) { clsGas.mark(clsGas.wrong()); return '빨간 기체가 달라요. 단추를 켜서 투과율이 파이는 곳이 자외선(0.4 µm보다 짧음)인지 적외선(0.7 µm보다 긺)인지 확인해 봐요.'; }
            return true;
          },
          explain: '<b>산소·오존</b>은 파장 0.29 µm보다 짧은 <b>자외선</b>을, <b>수증기·이산화 탄소·메테인</b>은 <b>적외선</b>을 주로 흡수해요. 이렇게 기체마다 흡수하는 파장이 달라서 선택적 흡수체라고 해요.',
        },
        {
          type: 'quiz', title: '가시광선은 통과, 적외선은 흡수',
          goal: '태양의 가시광선은 대기를 지나 지표에 닿는데, 지구가 내놓는 적외선은 대기에 많이 흡수돼요. 이 사실로 설명할 수 있는 것은?',
          setup() { setMode('spec'); setCtl(['gases', 'lam']); },
          choices: ['밤에도 지구가 밝게 보이는 현상', '온실 효과: 가시광선은 지표를 데우고, 지표가 내는 적외선은 온실 기체가 흡수해 대기를 데워요.', '오존층이 적외선을 모두 차단해 지표가 차가워지는 현상', '대기가 없어도 같은 원리로 지구가 따뜻해지는 현상'],
          answer: 1,
          feedback: ['밝기와는 상관없어요. 흡수하는 빛의 종류에 대한 이야기예요.', '', '적외선은 오존이 아니라 주로 수증기·CO₂ 등이 흡수해요.', '대기가 없으면 적외선을 흡수할 기체가 없어서 이 효과가 없어요.'],
          explain: '대기는 태양의 <b>가시광선은 통과</b>시키고, 지표가 내놓는 <b>적외선은 흡수</b>했다가 일부를 지표로 되돌려 보내요. 이것이 <b>온실 효과</b>예요. 다음 단계에서 그 크기를 계산해 봐요.',
        },
      ],
    },
    {
      title: '대기가 있으면 얼마나 따뜻할까', short: '온실 효과', icon: '🌡️', phase: '모형', features: ['gh'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대기가 가시광선은 통과시키고 지구가 내놓는 적외선은 흡수하는 선택적 흡수체임을 확인했어요. 이 성질이 행성의 온도를 얼마나 바꿀까요?</div>' +
        '<p>대기가 없다면 행성은 받은 태양 에너지와 내보내는 복사가 같아지는 <b>복사 평형 온도 T = [S(1−A) / (4σ)]^(1/4)</b>가 돼요. (S: 받는 복사, A: 반사율, σ = 5.67×10⁻⁸ W/m²·K⁴) 실제 평균 온도와 평형 온도의 차이가 <b>온실 효과</b>의 크기예요. 지구·금성·화성을 비교해 봐요.</p>',
      setup() { resetStep(1); },
      recap: '대기가 없다면 지구는 255 K(−18 °C)지만 실제는 288 K(15 °C)로, 온실 효과가 +33 K예요. 금성은 +510 K, 화성은 약 +3 K로 대기의 두께에 따라 크게 달라요.',
      summary: '<ul><li>대기가 없을 때 복사 평형 온도 T = [S(1−A) / (4σ)]^(1/4): 지구(S = 1361 W/m², A = 0.30)는 <b>255 K(−18 °C)</b>, 실제 평균은 <b>288 K(15 °C)</b> → 온실 효과 <b>+33 K</b>.</li><li>금성(S = 2600, A = 0.77): 평형 227 K, 실제 737 K → <b>+510 K</b> (CO₂ 약 96 %, 92기압). 화성(0.006기압): 평형 210 K, 실제 약 213 K → <b>+약 3~5 K</b>.</li><li>온실 효과는 없애야 할 현상이 아니라 생명에 꼭 필요한 현상이에요. 문제는 온실 기체가 늘어 효과가 <b>강화</b>되는 것이에요.</li><li>금성이 뜨거운 까닭은 태양에 가깝기 때문만이 아니라 <b>두꺼운 CO₂ 대기</b> 때문이에요. (평형 온도는 오히려 지구보다 낮아요.)</li></ul>',
      missions: [
        {
          title: '지구의 온실 효과 확인',
          goal: '행성을 <b>지구</b>로 두고 대기를 <b>없음 → 있음</b>으로 바꿔, 두 온도의 차이(온실 효과)를 확인해요.',
          hint: '대기 없음일 때 온도계가 255 K에서 멈춘 것을 보고, 대기 있음으로 바꿔 288 K에 닿을 때까지 기다려요.',
          setup() { S.planet = 'earth'; S.atm = 0; S.seenAtm = { 0: false, 1: false }; syncGH(); setMode('gh'); setCtl(['planet', 'atm']); },
          check: () => S.planet === 'earth' && S.atm === 1 && S.seenAtm[0] && S.seenAtm[1] && Math.abs(TEMP.value - 288) < 1, hold: 0.8,
          status: () => mark(S.planet === 'earth') + ' 지구 · ' + mark(S.seenAtm[0]) + ' 대기 없음 255 K · ' + mark(S.seenAtm[1]) + ' 대기 있음 288 K' + (S.seenAtm[0] && S.seenAtm[1] ? ' → 차이 +33 K' : ''),
          explain: '대기가 없으면 복사 평형 온도 <b>255 K(−18 °C)</b>, 실제 평균 <b>288 K(15 °C)</b>예요. 차이 <b>+33 K</b>가 온실 효과이고, 이 덕분에 물이 얼어붙지 않아요.',
        },
        {
          title: '세 행성의 온실 효과 짝짓기', manual: true,
          goal: '행성을 바꿔 가며 평형 온도와 실제 온도를 비교하고, 행성과 <b>온실 효과의 크기</b>를 짝지어요.',
          hint: '금성은 227 K → 737 K, 지구는 255 K → 288 K, 화성은 210 K → 약 213 K예요. 차이를 계산해 봐요.',
          setup() { pairPl.reset(); setMode('gh'); setCtl(['planet', 'atm', 'pairPl']); },
          status: () => mark(pairPl.ok()) + ' 짝지은 행성 ' + pairPl.count() + ' / 3 · ' + mark(['earth', 'venus', 'mars'].every((p) => S.planetsSeen[p])) + ' 살펴본 행성 ' + ['earth', 'venus', 'mars'].filter((p) => S.planetsSeen[p]).length + ' / 3',
          check() {
            if (!pairPl.complete()) return '행성 3개를 모두 짝지어 주세요. (지금 ' + pairPl.count() + '개)';
            if (!pairPl.ok()) { pairPl.mark(pairPl.wrong()); return '빨간 짝이 달라요. (실제 온도 − 평형 온도)를 행성마다 계산해 봐요.'; }
            return true;
          },
          explain: '금성 737 − 227 = <b>+510 K</b>, 지구 288 − 255 = <b>+33 K</b>, 화성 약 213 − 210 = <b>+약 3 K</b>이에요. 대기가 두꺼울수록, 온실 기체(CO₂)가 많을수록 온실 효과가 커요.',
        },
        {
          type: 'quiz', title: '온실 효과에 대한 올바른 설명',
          goal: '온실 효과에 대한 설명으로 옳은 것은?',
          setup() { setMode('gh'); setCtl(['planet', 'atm']); },
          choices: ['온실 효과는 지구에 해로운 현상이므로 완전히 없애는 것이 좋아요.', '온실 효과가 아예 없으면 지구 평균 기온은 약 −18 °C예요. 문제는 온실 효과가 지나치게 강해지는 것이에요.', '금성이 뜨거운 까닭은 오직 태양에 가깝기 때문이에요.', '화성은 대기가 얇아서 온실 효과가 지구보다 커요.'],
          answer: 1,
          feedback: ['온실 효과가 없으면 지구는 −18 °C로 꽁꽁 얼어붙어요. 생명에는 꼭 필요하고, 문제는 효과가 강화되는 것이에요.', '', '금성의 평형 온도는 227 K로 지구(255 K)보다 낮아요. 737 K의 대부분은 두꺼운 CO₂ 대기의 온실 효과(+510 K)예요.', '화성은 대기가 아주 얇아서 온실 효과가 약 3 K밖에 안 돼요.'],
          explain: '온실 효과가 없으면 지구 평균은 <b>−18 °C</b>예요. 온실 효과는 생명에 꼭 필요하고, 온실 기체가 늘어 <b>강화</b>되는 것이 문제예요. 금성은 반사율이 높아 평형 온도(227 K)가 낮지만, <b>두꺼운 CO₂ 대기</b> 때문에 737 K까지 올라가요.',
        },
      ],
    },
    {
      title: '오존층이 자외선을 막아요', short: '자외선 차단', icon: '☀️', phase: '탐구', features: ['o3'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대기가 있어서 지구가 따뜻해진다는 것을 알았어요. 대기는 해로운 <b>자외선</b>도 막아 줘요. 자외선을 막는 층은 어디에 있고, 얼마나 막을까요?</div>' +
        '<p>오존(O₃)은 성층권 20~30 km에 가장 많아요. 오존의 양은 <b>돕슨 단위(DU)</b>로 나타내요. (300 DU = 표준 상태에서 두께 3 mm) 생물에 해로운 자외선 B(UV-B, 파장 약 0.30 µm)의 투과율은 모형에서 <b>e^(−τ), τ = 1.5 × DU/100</b>으로 계산해요. 오존 전량을 바꿔 보며 통과하는 자외선을 지켜봐요.</p>',
      setup() { resetStep(2); },
      recap: 'UV-B 투과율은 오존 전량이 300 DU일 때 약 1 %, 150 DU일 때 약 10 %, 100 DU일 때 약 22 %예요. 오존이 1/3로 줄면 UV-B가 약 20배가 돼요.',
      summary: '<ul><li>오존층은 성층권 <b>20~30 km</b>에 있고, 오존 전량은 DU로 나타내요. (300 DU = 표준 상태에서 두께 3 mm)</li><li>UV-B 투과율 = e^(−τ), τ = 1.5 × DU/100: <b>300 DU → 약 1 %, 150 DU → 약 10 %, 100 DU → 약 22 %</b>. 오존이 1/3로 줄면 UV-B가 약 20배 → DNA 손상(피부암, 광합성 저해).</li><li>성층권에서 O₂가 자외선에 분해되어 생긴 산소 원자가 O₂와 결합해 O₃가 만들어져요.</li><li><b>프레온 가스(CFC)</b>의 염소가 오존을 파괴해요 (몬트리올 의정서로 규제). 성층권 오존은 생명을 보호하는 고마운 기체예요.</li></ul>',
      missions: [
        {
          title: '오존 구멍의 자외선 투과율', manual: true,
          goal: '오존 전량을 <b>100 DU</b>로 맞추고, UV-B 투과율(%)을 구해 입력해요. (τ = 1.5 × DU/100, 투과율 = e^(−τ))',
          hint: 'DU = 100이면 τ = 1.5예요. e^(−1.5)는 약 0.22이니 퍼센트로는 약 22 %예요. 그래프의 100 DU 점에서도 읽을 수 있어요.',
          setup() { $('#iUv').value = ''; $('#iUv').classList.remove('bad'); S.du = 300; syncDu(); setMode('o3'); setCtl(['du', 'uvIn']); },
          status: () => mark(Math.round(S.du) === 100) + ' 오존 ' + Math.round(S.du) + ' DU (목표 100) · ' + mark(near($in('#iUv'), uvT(100) * 100, 1.5)) + ' 입력 ' + ($in('#iUv') == null ? '—' : $in('#iUv') + ' %'),
          check() {
            if (Math.round(S.du) !== 100) return '먼저 오존 전량을 100 DU로 맞춰 주세요.';
            const v = $in('#iUv'); if (v == null) return '투과율(%)을 입력해 주세요.';
            const ok = near(v, uvT(100) * 100, 1.5); markBad('#iUv', !ok);
            if (!ok) return v < 5 ? '300 DU 때의 값(약 1 %)에 가까워요. 100 DU에서는 τ = 1.5이고 e^(−1.5)를 퍼센트로 바꿔 봐요.' : '투과율 = e^(−1.5)예요. 약 몇 %인지 다시 계산해 봐요.';
            return true;
          },
          explain: 'τ = 1.5 × 100/100 = 1.5, 투과율 = e^(−1.5) ≈ 0.22, 즉 <b>약 22 %</b>예요. 정상(300 DU)의 약 1 %보다 <b>약 20배</b> 많은 UV-B가 지표에 닿아요.',
        },
        {
          type: 'quiz', title: '오존층이 20~30 km에 있는 까닭',
          goal: '오존이 성층권 20~30 km에 가장 많은 까닭과 오존에 대한 설명으로 옳은 것은?',
          setup() { setMode('o3'); setCtl(['du']); },
          choices: ['성층권에서 O₂가 자외선에 분해되어 생긴 산소 원자가 O₂와 결합해 O₃가 만들어지기 때문이에요.', '오존은 지표에서 만들어져 바람을 타고 가장 높은 곳에 모이기 때문이에요.', '오존은 모두 해로운 기체이므로 성층권에 오존이 많을수록 생물에게 나빠요.', '프레온 가스는 오존과 반응하지 않아서 오존층에 영향을 주지 않아요.'],
          answer: 0,
          feedback: ['', '오존층은 성층권에서 O₂가 자외선을 흡수하며 만들어진 거예요.', '지표 근처에서 생기는 오존은 해롭지만, 성층권 오존은 자외선을 막아 생명을 보호해요.', '프레온(CFC)의 염소가 오존을 파괴해서 오존 구멍이 생겨요. 몬트리올 의정서로 사용을 규제해요.'],
          explain: '성층권에서 <b>O₂가 자외선을 흡수해 분해</b>되고, 생긴 산소 원자가 O₂와 결합해 <b>O₃</b>가 만들어져요. 그 결과 오존이 20~30 km에서 가장 많고, 이 오존이 UV-B를 흡수해 생명을 보호해요. 프레온의 염소는 오존을 파괴해요.',
        },
      ],
    },
    {
      title: '물과 생명가능지대', short: '물과 생명', icon: '💧', phase: '적용', features: ['hz'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온실 효과와 오존층이 지구를 따뜻하고 안전하게 해 준다는 것을 알았어요. 마지막으로 <b>액체 물</b>이 존재할 수 있는 위치, 즉 생명가능지대를 살펴봐요.</div>' +
        '<p>생명가능지대는 <b>액체 물이 존재할 수 있는 항성 둘레 영역</b>이에요. 태양 둘레의 생명가능지대는 약 0.95~1.4 AU(연구마다 다름)예요. 받는 복사 <b>S = 1361 / d²</b>(d: AU)이고, 물은 비열이 크고 얼음이 물에 뜨는 등 생명에 유리한 성질을 가졌어요.</p>',
      setup() { resetStep(3); },
      recap: '액체 물이 존재하는 거리(약 0.95~1.4 AU)에 있고, 적당한 온실 효과·자외선 차단·대기 유지가 함께 갖춰진 곳이 생명이 살 수 있는 곳이에요.',
      summary: '<ul><li>받는 복사 S = 1361 / d²: 금성(0.72 AU)은 약 2625 W/m²(지구의 약 1.9배), 화성(1.52 AU)은 약 589 W/m²(약 0.43배).</li><li><b>생명가능지대</b> = 액체 물이 존재할 수 있는 영역 (태양은 약 0.95~1.4 AU). 더 가까우면 물이 증발하고 더 멀면 얼어요.</li><li>지구 생명의 조건: 액체 물, 적당한 온실 효과, 자외선 차단(오존층), 대기를 붙잡아 두는 중력·자기장.</li><li>물의 성질: 비열 4.2 J/g·K(기온 변화 완충), 증발 잠열 2.26 MJ/kg, 얼음(밀도 0.92)이 물에 떠서 호수 바닥이 얼지 않음, 극성 용매.</li></ul>',
      missions: [
        {
          title: '금성과 화성이 받는 복사', manual: true,
          goal: '<b>S = 1361 / d²</b>로 금성(0.72 AU)과 화성(1.52 AU)이 받는 복사를 계산해 W/m²로 입력해요.',
          hint: '금성: 1361 / 0.72² = 1361 / 0.5184 ≈ 2625, 화성: 1361 / 1.52² = 1361 / 2.3104 ≈ 589예요. 거리 슬라이더를 0.72와 1.52에 맞춰 확인해도 돼요.',
          setup() { $('#iVenus').value = ''; $('#iMars').value = ''; setMode('hz'); setCtl(['dist', 'sIn']); },
          status: () => mark(near($in('#iVenus'), sOf(0.72), 25)) + ' 금성 ' + ($in('#iVenus') == null ? '—' : $in('#iVenus')) + ' · ' + mark(near($in('#iMars'), sOf(1.52), 15)) + ' 화성 ' + ($in('#iMars') == null ? '—' : $in('#iMars')) + ' (W/m²)',
          check() {
            const a = $in('#iVenus'), b = $in('#iMars');
            if (a == null || b == null) return '두 칸에 모두 값을 입력해 주세요.';
            const oa = near(a, sOf(0.72), 25), ob = near(b, sOf(1.52), 15);
            markBad('#iVenus', !oa); markBad('#iMars', !ob);
            if (!oa && !ob) return 'S = 1361 / d²에서 d는 AU 단위 거리예요. 제곱을 잊지 말고 다시 계산해 봐요.';
            if (!oa) return '금성은 지구보다 태양에 가까워서 S가 1361보다 커요. 1361 / 0.72²을 계산해 봐요.';
            if (!ob) return '화성은 지구보다 멀어서 S가 1361보다 작아요. 1361 / 1.52²을 계산해 봐요.';
            return true;
          },
          explain: '금성: 1361 / 0.72² ≈ <b>2625 W/m²</b>(지구의 약 1.9배), 화성: 1361 / 1.52² ≈ <b>589 W/m²</b>(약 0.43배)예요. 복사는 거리의 제곱에 반비례해요. (금성의 실제 평균 거리 0.723 AU로는 약 2600 W/m²로, 2단계에서 쓴 S = 2600이 이 값이에요.)',
        },
        {
          title: '생명에 필요한 조건 고르기', manual: true,
          goal: '카드 6장을 <b>지구에 생명이 존재하는 데 필요한 조건</b>인지 아닌지 분류해요.',
          hint: '거리 슬라이더로 물의 상태를 확인하고, 앞 단계의 온실 효과와 오존층을 떠올려 봐요. 태양에 너무 가까우면 물이 증발해요.',
          setup() { clsLife.reset(); setMode('hz'); setCtl(['dist', 'props', 'clsLife']); },
          status: () => mark(clsLife.ok()) + ' 분류한 카드 ' + clsLife.count() + ' / 6',
          check() {
            if (!clsLife.complete()) return '카드 6장을 모두 분류해 주세요. (지금 ' + clsLife.count() + '장)';
            if (!clsLife.ok()) { clsLife.mark(clsLife.wrong()); return '빨간 카드가 달라요. 너무 가깝거나 온실 효과가 없으면 물이 존재하기 어려워요.'; }
            return true;
          },
          explain: '생명에는 <b>액체 물, 적당한 온실 효과, 자외선 차단, 대기를 유지하는 중력·자기장</b>이 필요해요. 태양에 너무 가까우면 물이 증발하고, 온실 효과가 전혀 없으면 −18 °C로 얼어붙어요.',
        },
        {
          type: 'quiz', title: '물의 성질과 기후·생물',
          goal: '물의 성질과 그 의미를 바르게 짝지은 것은?',
          setup() { setMode('hz'); setCtl(['dist', 'props']); },
          choices: ['물은 비열이 작아서 낮과 밤의 기온 차가 커져요.', '물은 비열이 커서 기온 변화를 줄여 주고, 얼음은 물보다 밀도가 작아 호수 표면에 떠서 아래 물이 얼지 않게 해요.', '얼음은 물보다 밀도가 커서 호수 바닥부터 얼어요.', '물은 비극성 분자라서 이온 물질을 거의 녹이지 못해요.'],
          answer: 1,
          feedback: ['물의 비열(4.2 J/g·K)은 큰 편이라 바다는 천천히 데워지고 천천히 식어요.', '', '얼음의 밀도는 0.92로 물(1.00)보다 작아서 물 위에 떠요.', '물은 극성 분자라서 이온 물질과 영양소를 잘 녹여요.'],
          explain: '물은 <b>비열이 커서</b> 바다가 기온 변화를 완충해 주고, <b>얼음이 물에 떠서</b>(밀도 0.92) 호수 표면에서부터 얼기 때문에 아래의 물은 얼지 않아 수중 생물이 살아남아요. 또 <b>극성 용매</b>라서 영양소를 잘 녹여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-life-zone', mount: '#game', badge: '생명 탐험가', homeHref: '../../index.html#hs',
    featureLabels: { spec: '📈 대기 투과율 그래프', gh: '🌡️ 행성 온도 비교', o3: '☀️ 오존 전량 슬라이더', hz: '💧 생명가능지대 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'spec') { const l = lamOfV(S.lamV); setReadouts(['파장 커서', fLam(l), '커서 투과율', Math.round(transAt(l, S.w) * 100) + ' %', '평균: 가시광선·대기창', Math.round((S.visAvg || 1) * 100) + ' % · ' + Math.round((S.winAvg || 1) * 100) + ' %']); }
    else if (m === 'gh') { const p = PLD[S.planet]; setReadouts(['행성', p.nm + ' · 대기 ' + (S.atm ? '있음' : '없음'), '지금 표면 온도', Math.round(TEMP.value) + ' K (' + minus(Math.round(TEMP.value) - 273) + ' °C)', '평형 → 실제 평균', p.Te + ' → ' + p.Tr + ' K']); }
    else if (m === 'o3') { setReadouts(['오존 전량', Math.round(S.du) + ' DU (두께 ' + (Math.round(S.du) / 100).toFixed(1) + ' mm)', 'UV-B 투과율', fPct(uvT(S.du)), '정상(300 DU) 대비', (uvT(S.du) / uvT(300)).toFixed(1) + '배']); }
    else { const d = S.dist; setReadouts(['태양과의 거리', d.toFixed(2) + ' AU', '받는 복사 S', Math.round(sOf(d)) + ' W/m²', '물의 상태', ['증발', '액체 물', '얼음'][stateOf(d)]]); }
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 상태 기록
    if (S.mode === 'gh' && S.planet === 'earth' && Math.abs(TEMP.value - (S.atm ? 288 : 255)) < 0.8) S.seenAtm[S.atm] = true;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef3f9'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'spec') drawSpec(t, dt);
    else if (S.mode === 'gh') drawGH(t, dt);
    else if (S.mode === 'o3') drawOzone(t, dt);
    else drawHZ(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, TEMP, PLD, clsGas, clsLife, pairPl, ABS, transAt, avgT, WIN_ALL, VIS_ALL, peakOf, SUNC, EARC, uvT, sOf,
    get game() { return game; }, setMode, resetStep, updateCtl, startCfc, tweenDu, syncDu, syncGH, specGeo, hzGeo, atmosGeo, ozGeo,
  };

})();
