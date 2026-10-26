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
     기온의 연직 분포와 안정도 (단열 감률 → 안정도 판정 → 단열선도 → 안정도 변화)
     ====================================================== */
  initStage('#eef3f9', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  let game = null;

  /* ---------- 모형 (예시 사운딩) ---------- */
  const T0 = 25, TD0 = 17, GD = 0.010, GM = 0.005, GDEW = 0.002;     // °C/m
  const LCL = 125 * (T0 - TD0);                                      // 1000 m
  const parcelT = (z) => (z <= LCL ? T0 - GD * z : T0 - GD * LCL - GM * (z - LCL));
  const parcelTd = (z) => (z <= LCL ? TD0 - GDEW * z : parcelT(z));
  const ENVG = [0.4, 0.7, 1.2];                                      // °C/100 m
  const envT = (g, z) => T0 - (g / 100) * z;
  const ENVC = ['#16a34a', '#d97706', '#dc2626'];
  const ENVNAME = ['절대 안정', '조건부 불안정', '절대 불안정'];
  const stabOf = (g) => (g < 0.5 ? 's' : g < 1.0 ? 'c' : 'u');

  const S = {
    mode: 'lapse', fade: 0, clock: 0,
    z: 0, zV: 0, lift: false, seenCloud: false, cloudA: 0,
    env: 1, zJ: 0, seen1km: {}, envSeen: { 1: true },
    pp: 0, ppT: 0, building: false, marks: { lcl: null, lfc: null }, markSel: 'lcl',
    sit: 3, sst: 8, t850: -12, sitSeen: {},
  };

  /* ======================================================
     장면 1: 상승하는 공기 덩어리
     ====================================================== */
  const RC1 = PHONE
    ? { L: { x: 8, y: 8, w: 504, h: 290 }, G: { x: 8, y: 306, w: 504, h: 406 } }
    : { L: { x: 12, y: 12, w: 330, h: 536 }, G: { x: 350, y: 12, w: 438, h: 536 } };
  const ZMAX1 = 4000;
  function colGeo(Pn, zmax) {
    const c = { x: Pn.x + 10, y: Pn.y + 38, w: Pn.w - 20, h: Pn.h - 48 };
    c.gy = c.y + c.h - 30; c.Y = (z) => c.gy - ((c.gy - c.y - 18) * z) / zmax; c.cx = c.x + c.w * (PHONE ? 0.42 : 0.5);
    return c;
  }
  const tCol = (T) => mixc('#38bdf8', '#f97316', clamp((T - 5) / 20, 0, 1));
  function drawBalloon(x, y, r, T, sat, t) {
    ctx.save();
    D.glow(x, y, r * 2, tCol(T), 0.35);
    D.sphere(x, y, r, tCol(T), { shadow: true });
    if (sat) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.clip(); for (let k = 0; k < 9; k++) { const a = k * 2.4 + t * 0.6, rr0 = r * 0.6 * ((k % 3) / 3 + 0.3); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0, 2.2, 0, TAU); ctx.fill(); } ctx.restore(); }
    ctx.restore();
  }
  function drawLapse(t, dt) {
    const { L, G } = RC1, c = colGeo(L, ZMAX1);
    if (S.lift) { S.z = Math.min(ZMAX1, S.z + 520 * dt); setSlider($('#sZ'), $('#oZ'), Math.round(S.z / 50) * 50, (v) => v + ' m'); if (S.z >= ZMAX1) { S.lift = false; syncLift(); } }
    const prevZ = S.zV; S.zV = approach(S.zV, S.z, dt, 14);
    const z = S.zV, Tp = parcelT(z), Td = parcelTd(z), sat = z >= LCL - 0.5;
    if (prevZ < LCL && z >= LCL) { S.seenCloud = true; for (let k = 0; k < 18; k++) parts.emit({ x: c.x + 30 + Math.random() * (c.w - 60), y: c.Y(LCL) + rnd(-8, 8), vx: rnd(-14, 14), vy: rnd(-8, 4), life: 1.6, size: 14, color: 'rgba(255,255,255,.9)', shape: 'smoke', grow: 12, fade: true }); }
    S.cloudA = approach(S.cloudA, z >= LCL ? 1 : 0, dt, 2.5);
    card(L, '🎈 상승하는 공기 덩어리');
    ctx.save(); rr(c.x, c.y, c.w, c.h, 12).clip();
    const sk = ctx.createLinearGradient(0, c.y, 0, c.gy); sk.addColorStop(0, '#60a5fa'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    // 높이 눈금
    for (let km = 0; km <= 4; km++) { const y = c.Y(km * 1000); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(c.x, y); ctx.lineTo(c.x + c.w, y); ctx.stroke(); ctx.setLineDash([]); D.text(c.x + 6, y - 4, km === 0 ? '' : km + ' km', { size: 12, weight: 800, color: '#1e3a8a', align: 'left' }); }
    // 구름 밑면
    if (S.cloudA > 0.02) { ctx.globalAlpha = S.cloudA; for (let k = 0; k < 6; k++) drawCloud(c.x + 40 + k * ((c.w - 80) / 5), c.Y(LCL) - 14 + (k % 2) * 10, 1.1, 0.9); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(30,64,175,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, c.Y(LCL)); ctx.lineTo(c.x + c.w, c.Y(LCL)); ctx.stroke(); ctx.setLineDash([]); }
    // 지표
    const gg = ctx.createLinearGradient(0, c.gy, 0, c.y + c.h); gg.addColorStop(0, '#6b8f4e'); gg.addColorStop(1, '#4d7c0f'); ctx.fillStyle = gg; ctx.fillRect(c.x, c.gy, c.w, 40);
    ctx.restore();
    if (S.cloudA > 0.5) D.label(c.x + c.w - 8, c.Y(LCL) + 14, '구름 밑면 ' + LCL + ' m', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'right' });
    // 풍선
    const r = 16 * Math.exp(z / 9000), by = c.Y(z);
    if (!RM && S.lift) for (let k = 0; k < 2; k++) parts.emit({ x: c.cx + rnd(-r, r), y: by + r + 4, vx: 0, vy: 30, life: 0.5, size: 3, color: 'rgba(255,255,255,.6)' });
    drawBalloon(c.cx, by, r, Tp, sat, t);
    D.arrow(c.cx, by - r - 6, c.cx, by - r - 34, { color: '#f97316', width: 4, head: 11 });
    const lx = c.cx + r + 16, ly = clamp(by, c.y + 40, c.gy - 18);
    D.label(lx, ly - 12, '기온 ' + minus(fx(Tp, 1)) + ' °C', { bg: '#ea580c', size: 12.5, pad: 8, align: 'left' });
    D.label(lx, ly + 12, '이슬점 ' + minus(fx(Td, 1)) + ' °C', { bg: '#0f766e', size: 12.5, pad: 8, align: 'left' });
    D.text(c.cx, c.y + c.h - 8, '지표', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    D.text(c.x + c.w - 8, c.y + 16, '(부피 변화는 과장해서 그렸어요)', { size: 11, weight: 700, color: '#1e3a8a', align: 'right' });

    // 오른쪽: 기온과 높이 그래프
    card(G, '🌡️ 덩어리의 기온과 이슬점 (높이에 따른 변화)');
    const pb = { x: G.x + 52, y: G.y + 44, w: G.w - 52 - 18, h: G.h - 44 - (PHONE ? 132 : 150) };
    const X = (T) => pb.x + (pb.w * T) / 30, Y = (zz) => pb.y + pb.h - (pb.h * zz) / ZMAX1;
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 5, 10, 15, 20, 25, 30].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), pb.y); ctx.lineTo(X(v), pb.y + pb.h); ctx.stroke(); D.text(X(v), pb.y + pb.h + 15 * FS, String(v), { size: 12.5, weight: 700, color: '#64748b' }); });
    [0, 1000, 2000, 3000, 4000].forEach((v) => { ctx.beginPath(); ctx.moveTo(pb.x, Y(v)); ctx.lineTo(pb.x + pb.w, Y(v)); ctx.stroke(); D.text(pb.x - 6, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(pb.x + pb.w / 2, pb.y + pb.h + 32 * FS, '기온 (°C)', { size: 12.5, weight: 700, color: '#64748b' }); D.text(pb.x - 6, pb.y - 10, '높이 (m)', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip(); ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 2.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(TD0), Y(0)); ctx.lineTo(X(parcelTd(LCL)), Y(LCL)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(X(T0), Y(0)); ctx.lineTo(X(parcelT(LCL)), Y(LCL)); ctx.lineTo(X(parcelT(ZMAX1)), Y(ZMAX1)); ctx.stroke();
    // 현재까지 (진하게)
    ctx.strokeStyle = 'rgba(234,88,12,.0)'; ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    D.dashedLine(pb.x, Y(z), X(Tp), Y(z), { color: '#64748b', width: 1.4 }); D.dashedLine(X(Tp), Y(z), X(Tp), pb.y + pb.h, { color: '#64748b', width: 1.4 });
    D.sphere(X(Tp), Y(z), 6.5, '#ea580c', { shadow: true }); if (z < LCL) D.sphere(X(Td), Y(z), 5.5, '#14b8a6', { gloss: false });
    D.label(X(parcelT(LCL)) + 8, Y(LCL), z >= LCL ? '구름 밑면: 기온 = 이슬점' : '기온과 이슬점이 만나는 곳', { bg: '#1d4ed8', size: 12, pad: 7, align: 'left' });
    D.label(pb.x + 8, pb.y + 16, '─ 기온  ┄ 이슬점', { bg: 'rgba(15,23,42,.65)', size: 12, pad: 7, align: 'left' });
    // 감률 설명
    const ty = G.y + G.h - (PHONE ? 84 : 98);
    const rows = [['#ea580c', '구름 아래 (포화 전)', '건조 단열 감률 1.0 °C/100 m', z < LCL], ['#0f766e', '이슬점', '약 0.2 °C/100 m씩 내려가요', z < LCL], ['#2563eb', '구름 속 (포화 뒤)', '습윤 단열 감률 약 0.5 °C/100 m', z >= LCL]];
    rows.forEach((q, i) => {
      const y = ty + i * (PHONE ? 26 : 30);
      ctx.fillStyle = q[3] ? rgba(q[0], 0.14) : 'rgba(241,245,249,.9)'; rr(G.x + 12, y - 4, G.w - 24, PHONE ? 24 : 27, 8).fill();
      ctx.fillStyle = q[0]; rr(G.x + 18, y + 2, 8, PHONE ? 12 : 14, 3).fill();
      D.text(G.x + 34, y + 13 * FS * 0.95, q[1] + ': ' + q[2], { size: 12.5, weight: q[3] ? 800 : 700, color: q[3] ? '#0f172a' : '#64748b', align: 'left' });
    });
  }
  function drawCloud(cx, cy, s, a) {
    ctx.save(); ctx.globalAlpha *= a == null ? 1 : a;
    ctx.fillStyle = '#fff'; ctx.beginPath(); [[-26, 6, 18], [-8, -4, 22], [12, 0, 24], [30, 7, 17], [2, 10, 22]].forEach((c) => { ctx.moveTo(cx + c[0] * s + c[2] * s, cy + c[1] * s); ctx.arc(cx + c[0] * s, cy + c[1] * s, c[2] * s, 0, TAU); }); ctx.fill();
    ctx.restore();
  }

  /* ======================================================
     장면 2: 안정도 판정 (환경 곡선 vs 덩어리 곡선)
     ====================================================== */
  const RC2 = PHONE
    ? { C: { x: 8, y: 8, w: 504, h: 190 }, G: { x: 8, y: 206, w: 504, h: 506 } }
    : { C: { x: 12, y: 12, w: 214, h: 536 }, G: { x: 234, y: 12, w: 554, h: 536 } };
  const ZMAX2 = 3000;
  const dTj = (g, z) => parcelT(z) - envT(g, z);
  function drawJudge(t, dt) {
    const { C, G } = RC2, g = ENVG[S.env];
    const z = S.zJ, Tp = parcelT(z), Te = envT(g, z), dT = Tp - Te;
    // 오른쪽: 그래프
    card(G, '📈 주변 기온 곡선과 덩어리 곡선');
    const pb = { x: G.x + 54, y: G.y + 44, w: G.w - 54 - 20, h: G.h - 44 - (PHONE ? 100 : 112) };
    const xmin = -12, xmax = 27, X = (T) => pb.x + (pb.w * (T - xmin)) / (xmax - xmin), Y = (zz) => pb.y + pb.h - (pb.h * zz) / ZMAX2;
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [-10, -5, 0, 5, 10, 15, 20, 25].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), pb.y); ctx.lineTo(X(v), pb.y + pb.h); ctx.stroke(); D.text(X(v), pb.y + pb.h + 15 * FS, minus(v), { size: 12.5, weight: 700, color: '#64748b' }); });
    [0, 500, 1000, 1500, 2000, 2500, 3000].forEach((v) => { ctx.beginPath(); ctx.moveTo(pb.x, Y(v)); ctx.lineTo(pb.x + pb.w, Y(v)); ctx.stroke(); D.text(pb.x - 6, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(pb.x + pb.w / 2, pb.y + pb.h + 32 * FS, '기온 (°C)', { size: 12.5, weight: 700, color: '#64748b' }); D.text(pb.x - 6, pb.y - 10, '높이 (m)', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip();
    // 덩어리와 선택한 환경 곡선 사이의 색칠
    const step = 25;
    for (let zz = 0; zz < ZMAX2; zz += step) {
      const d1 = dTj(g, zz), d2 = dTj(g, zz + step), m = (d1 + d2) / 2;
      if (Math.abs(m) < 0.01) continue;
      ctx.fillStyle = m > 0 ? 'rgba(239,68,68,.30)' : 'rgba(59,130,246,.26)';
      poly([[X(parcelT(zz)), Y(zz)], [X(parcelT(zz + step)), Y(zz + step)], [X(envT(g, zz + step)), Y(zz + step)], [X(envT(g, zz)), Y(zz)]]); ctx.fill();
    }
    ENVG.forEach((gg, i) => { ctx.strokeStyle = ENVC[i]; ctx.globalAlpha = i === S.env ? 1 : 0.28; ctx.lineWidth = i === S.env ? 3.6 : 2; ctx.beginPath(); ctx.moveTo(X(T0), Y(0)); ctx.lineTo(X(envT(gg, ZMAX2)), Y(ZMAX2)); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(X(T0), Y(0)); ctx.lineTo(X(parcelT(LCL)), Y(LCL)); ctx.lineTo(X(parcelT(ZMAX2)), Y(ZMAX2)); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    // 표시
    D.dashedLine(pb.x, Y(z), pb.x + pb.w, Y(z), { color: '#64748b', width: 1.4 });
    D.sphere(X(Tp), Y(z), 6.5, '#2563eb', { shadow: true }); D.sphere(X(Te), Y(z), 6.5, ENVC[S.env], { shadow: true });
    if (z > 0) D.label(clamp((X(Tp) + X(Te)) / 2, pb.x + 70, pb.x + pb.w - 70), clamp(Y(z) - 20, pb.y + 16, pb.y + pb.h - 16), '덩어리 − 주변 = ' + (dT > 0.04 ? '+' : dT < -0.04 ? '−' : '') + fx(Math.abs(dT), 1) + ' °C', { bg: dT > 0.04 ? '#dc2626' : dT < -0.04 ? '#2563eb' : '#475569', size: 12.5, pad: 8 });
    D.label(pb.x + 8, pb.y + 16, '─ 덩어리 (파랑)   ─ 주변 (' + (g).toFixed(1) + ' °C/100 m)', { bg: 'rgba(15,23,42,.7)', size: 12, pad: 7, align: 'left' });
    const ly = G.y + G.h - (PHONE ? 22 : 26);
    D.text(G.x + 16, ly - 18 * FS, '붉은 면: 덩어리가 주변보다 따뜻해요 (떠올라요)   푸른 면: 더 차가워요 (제자리로)', { size: 12, weight: 800, color: '#475569', align: 'left' });
    D.text(G.x + 16, ly, '판정 기준: 환경 감률 < 습윤 0.5 → 절대 안정, 0.5 ~ 1.0 → 조건부 불안정, > 1.0(건조) → 절대 불안정', { size: 12, weight: 800, color: '#0369a1', align: 'left' });

    // 왼쪽(위): 공기 기둥과 덩어리
    card(C, '🎈 덩어리의 운명');
    const c = colGeo(C, ZMAX2);
    ctx.save(); rr(c.x, c.y, c.w, c.h, 12).clip();
    const sk = ctx.createLinearGradient(0, c.y, 0, c.gy); sk.addColorStop(0, '#93c5fd'); sk.addColorStop(1, '#eff6ff'); ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    for (let km = 0; km <= 3; km++) { const y = c.Y(km * 1000); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(c.x, y); ctx.lineTo(c.x + c.w, y); ctx.stroke(); ctx.setLineDash([]); if (km) D.text(c.x + 6, y - 4, km + ' km', { size: 11.5, weight: 800, color: '#1e3a8a', align: 'left' }); }
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(c.x, c.gy, c.w, 40);
    if (z >= LCL) drawCloud(c.cx + (PHONE ? 100 : 0), c.Y(LCL) - 10, 0.9, 0.85);
    ctx.restore();
    const by = c.Y(z), r = 15;
    drawBalloon(c.cx, by, r, Tp, z >= LCL, t);
    if (z > 0 && Math.abs(dT) > 0.04) { const L2 = clamp(Math.abs(dT) * 4, 12, 50); if (dT > 0) D.arrow(c.cx, by - r - 4, c.cx, by - r - 4 - L2, { color: '#dc2626', width: 5, head: 13 }); else D.arrow(c.cx, by + r + 4, c.cx, by + r + 4 + L2, { color: '#2563eb', width: 5, head: 13 }); }
    D.text(c.cx, c.gy + 24, '지표', { size: 12, weight: 800, color: '#fff' });
    const msg = z <= 0 ? '높이를 올려 봐요' : Math.abs(dT) <= 0.04 ? '주변과 같아요' : dT > 0 ? '더 따뜻 → 떠올라요' : '더 차가움 → 가라앉아요';
    D.label(c.cx + (PHONE ? 130 : 0), PHONE ? c.y + 30 : c.y + 24, msg, { bg: dT > 0.04 ? '#dc2626' : dT < -0.04 ? '#2563eb' : '#475569', size: 11.5, pad: 7 });
    D.text(c.x + c.w - 6, c.gy - 6, '주변 ' + minus(fx(Te, 1)) + ' °C · 덩어리 ' + minus(fx(Tp, 1)) + ' °C', { size: 11.5, weight: 800, color: '#0f172a', align: 'right' });
  }

  /* ======================================================
     장면 3: 단열선도 (기울어진 온도축)
     ====================================================== */
  const RC3 = PHONE
    ? { P: { x: 8, y: 8, w: 504, h: 500 }, Lg: { x: 8, y: 516, w: 504, h: 196 } }
    : { P: { x: 12, y: 12, w: 776, h: 536 }, Lg: null };
  const SK = 6, ZT = 4.4, XMAX = 40;
  const LFCZ = 2.5, LCLZ = LCL / 1000;
  function skGeo() {
    const P = RC3.P, B = PHONE ? { x: P.x + 48, y: P.y + 40, w: P.w - 48 - 16, h: P.h - 40 - 46 } : { x: P.x + 56, y: P.y + 42, w: P.w - 56 - 200, h: P.h - 42 - 46 };
    B.X = (T, z) => B.x + (B.w * (T + SK * z)) / XMAX; B.Y = (z) => B.y + B.h - (B.h * z) / ZT;
    return B;
  }
  const ptXZ = (B, p) => { const z = ((B.y + B.h - p.y) / B.h) * ZT, xs = ((p.x - B.x) / B.w) * XMAX; return { z, xs, T: xs - SK * z }; };
  const okLCL = (B) => S.marks.lcl && dist(B.X(S.marks.lcl.T, S.marks.lcl.z), B.Y(S.marks.lcl.z), B.X(parcelT(LCL), LCLZ), B.Y(LCLZ)) <= 24;
  const okLFC = (B) => S.marks.lfc && dist(B.X(S.marks.lfc.T, S.marks.lfc.z), B.Y(S.marks.lfc.z), B.X(7.5, LFCZ), B.Y(LFCZ)) <= 26;
  const WS17 = (0.622 * 19.37 / (1000 - 19.37)) * 1000;
  function drawSkew(t, dt) {
    const P = RC3.P, B = skGeo();
    if (S.building) { S.pp = Math.min(ZT, S.pp + 0.75 * dt); if (S.pp >= ZT) { S.building = false; } }
    card(P, '📐 단열선도 (예시 사운딩: 지표 25 °C, 이슬점 17 °C, 환경 감률 0.7 °C/100 m)');
    ctx.fillStyle = '#fbfdff'; rr(B.x, B.y, B.w, B.h, 4).fill();
    ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip(); ctx.lineJoin = 'round';
    // 등온선
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; for (let T = -40; T <= 40; T += 10) { ctx.beginPath(); ctx.moveTo(B.X(T, 0), B.Y(0)); ctx.lineTo(B.X(T, ZT), B.Y(ZT)); ctx.stroke(); }
    // 등압선
    [1000, 900, 800, 700, 600].forEach((p) => { const z = 8.4 * Math.log(1000 / p); ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(B.x, B.Y(z)); ctx.lineTo(B.x + B.w, B.Y(z)); ctx.stroke(); });
    // 건조 단열선
    ctx.strokeStyle = 'rgba(146,64,14,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 4]);
    for (let T = -30; T <= 70; T += 10) { ctx.beginPath(); ctx.moveTo(B.X(T, 0), B.Y(0)); ctx.lineTo(B.X(T - 10 * ZT, ZT), B.Y(ZT)); ctx.stroke(); }
    // 습윤 단열선
    ctx.strokeStyle = 'rgba(22,163,74,.6)';
    for (let Tb = -10; Tb <= 50; Tb += 5) { ctx.beginPath(); ctx.moveTo(B.X(Tb, 0), B.Y(0)); ctx.lineTo(B.X(Tb - 5 * ZT, ZT), B.Y(ZT)); ctx.stroke(); }
    // 등포화혼합비선
    ctx.strokeStyle = 'rgba(124,58,237,.55)'; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.6;
    for (let Td = -10; Td <= 30; Td += 5) { ctx.beginPath(); ctx.moveTo(B.X(Td, 0), B.Y(0)); ctx.lineTo(B.X(Td - 2 * ZT, ZT), B.Y(ZT)); ctx.stroke(); }
    ctx.setLineDash([]);
    // 이슬점 곡선 (지표 17 °C의 등포화혼합비선)
    ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(B.X(TD0, 0), B.Y(0)); ctx.lineTo(B.X(parcelTd(LCL), LCLZ), B.Y(LCLZ)); ctx.stroke();
    // 환경 곡선
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(B.X(T0, 0), B.Y(0)); ctx.lineTo(B.X(envT(0.7, ZT * 1000), ZT), B.Y(ZT)); ctx.stroke();
    // 덩어리 경로 (그려지는 중)
    const zp = S.pp;
    if (zp > 0) {
      ctx.lineWidth = 4.6; ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(B.X(T0, 0), B.Y(0)); ctx.lineTo(B.X(parcelT(Math.min(zp, LCLZ) * 1000), Math.min(zp, LCLZ)), B.Y(Math.min(zp, LCLZ))); ctx.stroke();
      if (zp > LCLZ) { ctx.strokeStyle = '#15803d'; ctx.beginPath(); ctx.moveTo(B.X(parcelT(LCL), LCLZ), B.Y(LCLZ)); ctx.lineTo(B.X(parcelT(zp * 1000), zp), B.Y(zp)); ctx.stroke(); }
    }
    ctx.restore();
    // 축 표시
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(B.x, B.y, B.w, B.h);
    for (let T = 0; T <= 40; T += 10) D.text(B.X(T, 0), B.y + B.h + 15 * FS, String(T), { size: 12.5, weight: 700, color: '#64748b' });
    D.text(B.x + B.w / 2, B.y + B.h + 32 * FS, '기온 (°C) — 등온선이 오른쪽 위로 기울어져 있어요', { size: 12, weight: 700, color: '#64748b' });
    [1000, 900, 800, 700, 600].forEach((p) => { const z = 8.4 * Math.log(1000 / p); D.text(B.x - 6, B.Y(z) + 4.5, String(p), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(B.x - 6, B.y - 10, '기압(hPa)', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    [0, 1, 2, 3, 4].forEach((km) => D.text(B.x + B.w - 5, B.Y(km) - 3, km + ' km', { size: 11.5, weight: 800, color: '#0369a1', align: 'right' }));
    // 덩어리 마커
    if (zp > 0) { D.sphere(B.X(parcelT(zp * 1000), zp), B.Y(zp), 7, zp <= LCLZ ? '#f97316' : '#22c55e', { shadow: true }); }
    // 표시한 점
    ['lcl', 'lfc'].forEach((k) => {
      const m = S.marks[k]; if (!m) return; const x = B.X(m.T, m.z), y = B.Y(m.z), ok = k === 'lcl' ? okLCL(B) : okLFC(B);
      ctx.strokeStyle = ok ? '#16a34a' : '#2563eb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
      D.label(clamp(x, B.x + 90, B.x + B.w - 90), y - 24, (k === 'lcl' ? 'LCL ' : 'LFC ') + fx(m.z, 1) + ' km · ' + minus(fx(m.T, 1)) + ' °C', { bg: ok ? '#15803d' : '#2563eb', size: 12.5, pad: 8 });
      if (ok) D.ring(x, y, 17, t, { color: '#16a34a' });
    });
    // 범례
    const legX = PHONE ? RC3.Lg.x : B.x + B.w + 14, legY = PHONE ? RC3.Lg.y : P.y + 42, legW = PHONE ? RC3.Lg.w : P.x + P.w - legX - 12;
    if (PHONE) card(RC3.Lg, '🔖 선의 이름');
    const items = [['#92400e', '건조 단열선', '건조 단열 감률 1.0 °C/100 m', true], ['#16a34a', '습윤 단열선', '약 0.5 °C/100 m (단순화)', true], ['#7c3aed', '등포화혼합비선', '이슬점이 따라 내려가는 선', true], ['#b91c1c', '환경 곡선', '지금 대기의 기온 분포', false], ['#0f766e', '이슬점 곡선', '지표 17 °C (혼합비 약 ' + Math.round(WS17) + ' g/kg)', false], ['#ea580c', '덩어리 경로', '건조 → 습윤 단열선을 따라', false]];
    items.forEach((q, i) => {
      const cols = PHONE ? 2 : 1, cw = PHONE ? (legW - 24) / 2 : legW, ix = legX + (PHONE ? 12 + (i % 2) * cw : 0), iy = legY + (PHONE ? 40 + Math.floor(i / 2) * 50 : i * 50);
      ctx.strokeStyle = q[0]; ctx.lineWidth = q[3] ? 2 : 4; if (q[3]) ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(ix, iy + 8); ctx.lineTo(ix + 26, iy + 8); ctx.stroke(); ctx.setLineDash([]);
      D.text(ix + 34, iy + 12, q[1], { size: 12.5, weight: 800, color: '#1e293b', align: 'left' });
      D.text(ix + 34, iy + 12 + 16 * FS * 0.9, q[2], { size: PHONE ? 10.5 : 11.5, weight: 700, color: '#64748b', align: 'left' });
    });
    if (!PHONE) {
      drawWrap(legX + legW / 2, legY + 6 * 50 + 14, 'LCL: 덩어리가 건조 단열선을 따라 오르다 이슬점 곡선과 만나는 곳', legW, 12, { color: '#0369a1', weight: 800 });
      drawWrap(legX + legW / 2, legY + 6 * 50 + 14 + 54, 'LFC: 덩어리 경로가 환경 곡선과 만나는 곳 (그 위에서는 덩어리가 더 따뜻해요)', legW, 12, { color: '#b45309', weight: 800 });
    }
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'skew' && game && (game.has('skew') || game.free)) { const B = skGeo(); if (p.x >= B.x - 6 && p.x <= B.x + B.w + 6 && p.y >= B.y - 6 && p.y <= B.y + B.h + 6) { setMarkAt(p); return true; } }
      return false;
    },
    move(p) { if (S.mode === 'skew') setMarkAt(p); },
    hover(p) { if (S.mode === 'skew' && game && (game.has('skew') || game.free)) { const B = skGeo(); if (p.x >= B.x && p.x <= B.x + B.w && p.y >= B.y && p.y <= B.y + B.h) return 'crosshair'; } return ''; },
  });
  function setMarkAt(p) {
    const B = skGeo(), q = ptXZ(B, { x: clamp(p.x, B.x, B.x + B.w), y: clamp(p.y, B.y, B.y + B.h) });
    S.marks[S.markSel] = { z: q.z, T: q.T };
  }

  /* ======================================================
     장면 4: 안정도가 바뀌는 상황
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 300 }, B: { x: 8, y: 316, w: 504, h: 238 }, C: { x: 8, y: 562, w: 504, h: 150 } }
    : { A: { x: 12, y: 12, w: 380, h: 536 }, B: { x: 400, y: 12, w: 388, h: 300 }, C: { x: 400, y: 320, w: 388, h: 228 } };
  const ZL = [0, 0.5, 1, 1.5, 2, 3];
  const PROF = {
    base: [25, 21.5, 18, 14.5, 11, 4], day: [31, 25.4, 20.2, 15.6, 11.8, 5], night: [14, 17, 16, 13.2, 10, 3],
    subs: [25, 21.5, 18, 16.5, 17.5, 11.5], upper: [25, 21.5, 18, 12.5, 6, -6],
  };
  const seaProf = () => [S.sst, S.sst - (S.sst - S.t850) / 3, S.sst - (2 * (S.sst - S.t850)) / 3, S.t850, S.t850 - 3.5, S.t850 - 10.5];
  const profOf = (i) => [PROF.day, PROF.night, PROF.subs, seaProf(), PROF.upper][i];
  const SITN = ['낮 지표 가열', '맑은 밤 복사 냉각', '고기압 중심의 침강', '겨울 서해 위의 찬 대륙 공기', '상층 한기 유입'];
  const SITD = ['햇볕에 지표가 뜨거워져요', '구름 없는 밤, 지표가 열을 우주로 내보내요', '높은 곳의 공기가 가라앉으며 단열 압축으로 데워져요', '시베리아의 차가운 공기가 따뜻한 바다 위로 지나가요', '높은 하늘에 차가운 공기가 들어와요'];
  const curP = [25, 21.5, 18, 14.5, 11, 4];
  const lapseOf = (P0) => { let mx = -99, inv = false; for (let i = 0; i < P0.length - 1; i++) { const g = ((P0[i] - P0[i + 1]) / (ZL[i + 1] - ZL[i])) / 10; if (g < -0.02) inv = true; mx = Math.max(mx, g); } return { max: mx, inv }; };
  const gamSea = () => (S.sst - S.t850) / 1.5 / 10;
  const catOf = (g) => (g < 0.5 ? 's' : g < 1.0 ? 'c' : 'u');
  function drawChange(t, dt) {
    const { A, B, C } = RC4, sit = S.sit, target = profOf(sit);
    for (let i = 0; i < 6; i++) curP[i] = approach(curP[i], target[i], dt, 4);
    // 장면
    card(A, '🎬 ' + SITN[sit]);
    const I = { x: A.x + 10, y: A.y + 36, w: A.w - 20, h: A.h - 46 }, gy = I.y + I.h - 36;
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const night = sit === 1;
    const sk = ctx.createLinearGradient(0, I.y, 0, gy); if (night) { sk.addColorStop(0, '#0b1020'); sk.addColorStop(1, '#1e3a8a'); } else if (sit === 4) { sk.addColorStop(0, '#475569'); sk.addColorStop(1, '#94a3b8'); } else { sk.addColorStop(0, '#60a5fa'); sk.addColorStop(1, '#e0f2fe'); }
    ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    const seaScene = sit === 3;
    if (seaScene) { const sg = ctx.createLinearGradient(0, gy, 0, I.y + I.h); sg.addColorStop(0, '#38bdf8'); sg.addColorStop(1, '#075985'); ctx.fillStyle = sg; ctx.fillRect(I.x, gy, I.w * 0.78, I.y + I.h - gy); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(I.x + I.w * 0.78, gy - 10, I.w * 0.22, I.y + I.h - gy + 10); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let x = I.x; x <= I.x + I.w * 0.78; x += 4) { const y = gy + 8 + k * 12 + Math.sin(x / 13 + t * 1.8 + k) * 2.2; x === I.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); } }
    else { const gg = ctx.createLinearGradient(0, gy, 0, I.y + I.h); if (night) { gg.addColorStop(0, '#1e40af'); gg.addColorStop(1, '#172554'); } else if (sit === 0) { gg.addColorStop(0, '#d97706'); gg.addColorStop(1, '#78350f'); } else { gg.addColorStop(0, '#6b8f4e'); gg.addColorStop(1, '#4d7c0f'); } ctx.fillStyle = gg; ctx.fillRect(I.x, gy, I.w, I.y + I.h - gy); }
    if (sit === 0) {
      D.glow(I.x + I.w - 50, I.y + 66, 70, '#fde047', 0.9); D.sphere(I.x + I.w - 50, I.y + 66, 24, '#facc15', { gloss: false });
      ctx.strokeStyle = 'rgba(255,200,120,.55)'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); for (let y = gy; y > gy - 60; y -= 3) { const x = I.x + 40 + k * ((I.w - 80) / 4) + Math.sin(y / 7 + t * 4 + k) * 5; y === gy ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
      if (!RM && Math.random() < dt * 5) parts.emit({ x: I.x + 30 + Math.random() * (I.w - 60), y: gy - 4, vx: rnd(-6, 6), vy: rnd(-70, -45), life: 2.6, size: 4, color: 'rgba(255,255,255,.55)', shape: 'bubble' });
      S.cu = approach(S.cu || 0, 1, dt, 0.8); drawCloud(I.x + I.w * 0.5, I.y + 80 - 14 * S.cu, 1.2 + 0.9 * S.cu, 0.95);
    } else if (sit === 1) {
      for (let k = 0; k < 24; k++) { const sx = I.x + ((k * 97) % I.w), sy = I.y + 36 + ((k * 53) % 90); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + k); D.sphere(sx, sy, 1.6, '#fff', { gloss: false }); } ctx.globalAlpha = 1;
      D.sphere(I.x + 60, I.y + 72, 22, '#fef9c3', { gloss: false });
      S.fog = approach(S.fog || 0, 1, dt, 0.6); ctx.fillStyle = 'rgba(226,232,240,' + (0.55 * S.fog).toFixed(3) + ')'; ctx.fillRect(I.x, gy - 38 * S.fog, I.w, 38 * S.fog + 2);
      for (let k = 0; k < 5; k++) D.arrow(I.x + 40 + k * ((I.w - 80) / 4), gy - 6, I.x + 40 + k * ((I.w - 80) / 4), gy - 6 - 44, { color: '#fda4af', width: 3, head: 9, alpha: 0.8 });
      D.text(I.x + I.w - 10, gy - 52, '지표가 복사로 식어요', { size: 12, weight: 800, color: '#fecdd3', align: 'right' });
    } else if (sit === 2) {
      D.text(I.x + I.w / 2, I.y + 78, 'H', { size: 34, weight: 800, color: '#1d4ed8', stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
      for (let k = 0; k < 4; k++) { const x = I.x + 50 + k * ((I.w - 100) / 3), y = I.y + 92 + ((t * 28 + k * 20) % 46); D.arrow(x, y, x, y + 34, { color: '#2563eb', width: 4, head: 11, alpha: 0.85 }); }
      const ly = I.y + I.h * 0.5; ctx.fillStyle = 'rgba(251,146,60,.35)'; ctx.fillRect(I.x, ly - 12, I.w, 24); ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(I.x, ly); ctx.lineTo(I.x + I.w, ly); ctx.stroke(); ctx.setLineDash([]);
      D.label(I.x + I.w - 8, ly - 22, '따뜻한 공기층 (덮개)', { bg: '#c2410c', size: 12, pad: 7, align: 'right' });
      S.haze = S.haze || Array.from({ length: 26 }, (_, k) => ({ x: Math.random(), y: Math.random(), ph: Math.random() * 6 }));
      S.haze.forEach((h) => { const x = I.x + 16 + h.x * (I.w - 32) + Math.sin(t * 0.8 + h.ph) * 5, y = ly + 26 + h.y * (gy - ly - 40); ctx.fillStyle = 'rgba(100,116,139,.55)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); });
      D.text(I.x + 10, gy - 10, '오염 물질이 갇혀요', { size: 12, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    } else if (sit === 3) {
      const wx = I.x + ((t * 40) % 120);
      D.arrow(I.x + 18, I.y + 56, I.x + I.w * 0.5, I.y + 56, { color: '#1d4ed8', width: 6, head: 16 }); D.label(I.x + 20, I.y + 78, '차가운 대륙 공기', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'left' });
      S.sea = approach(S.sea || 0, 1, dt, 0.7);
      [0.22, 0.42, 0.62].forEach((f, i) => { const hh = (30 + 38 * i) * S.sea; drawCloud(I.x + I.w * f, gy - 70 - hh * 0.9, 1.0 + 0.45 * i, 0.95); });
      if (!RM && Math.random() < dt * 8) parts.emit({ x: I.x + 30 + Math.random() * (I.w * 0.7), y: gy + 2, vx: rnd(-8, 8), vy: rnd(-60, -35), life: 1.6, size: 5, color: 'rgba(255,255,255,.5)', shape: 'smoke', grow: 5 });
      for (let k = 0; k < 14; k++) { const sx = I.x + I.w * 0.55 + ((k * 61) % (I.w * 0.45)), sy = I.y + 90 + ((t * 40 + k * 37) % (gy - I.y - 100)); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, TAU); ctx.fill(); }
      D.text(I.x + I.w * 0.78 + 6, gy + 24, '서해안', { size: 12.5, weight: 800, color: '#334155', align: 'left' }); D.text(I.x + 14, gy + 24, '서해 (따뜻한 바다)', { size: 12.5, weight: 800, color: '#fff', align: 'left' });
    } else {
      D.arrow(I.x + 18, I.y + 56, I.x + I.w * 0.7, I.y + 56, { color: '#1d4ed8', width: 6, head: 16 }); D.label(I.x + 20, I.y + 78, '상층의 찬 공기', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'left' });
      S.cb = approach(S.cb || 0, 1, dt, 0.7); const cx = I.x + I.w * 0.5, base = gy - 50;
      [0, 1, 2, 3].forEach((i) => drawCloud(cx + (i % 2 ? 22 : -22), base - i * 40 * S.cb, 1.5 - 0.1 * i, i < 3 ? 0.95 : 0.8));
      if (!RM && Math.random() < dt * 0.9) { S.flash = 0.25; }
      S.flash = Math.max(0, (S.flash || 0) - dt); if (S.flash > 0) { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(cx, base - 20); ctx.lineTo(cx - 10, base + 10); ctx.lineTo(cx + 6, base + 14); ctx.lineTo(cx - 6, base + 46); ctx.stroke(); }
      if (!RM && S.cb > 0.5 && Math.random() < dt * 6) parts.emit({ x: cx + rnd(-40, 40), y: base + 20, vx: rnd(-8, 8), vy: 150, life: 0.5, size: 2, color: 'rgba(147,197,253,.9)' });
    }
    ctx.restore();
    D.label(I.x + I.w / 2, I.y + 20, SITD[sit], { bg: 'rgba(15,23,42,.72)', size: PHONE ? 11 : 12, pad: 8 });

    // 기온 분포 그래프
    card(B, '🌡️ 주변 기온 분포 (이 상황) vs 덩어리의 건조 단열선');
    const pb = { x: B.x + 52, y: B.y + 42, w: B.w - 52 - 18, h: B.h - 42 - (PHONE ? 84 : 98) };
    const xmin = -30, xmax = 34, X = (T) => pb.x + (pb.w * (T - xmin)) / (xmax - xmin), Y = (z) => pb.y + pb.h - (pb.h * z) / 3;
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [-30, -20, -10, 0, 10, 20, 30].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), pb.y); ctx.lineTo(X(v), pb.y + pb.h); ctx.stroke(); D.text(X(v), pb.y + pb.h + 15 * FS, minus(v), { size: 12, weight: 700, color: '#64748b' }); });
    [0, 1, 2, 3].forEach((v) => { ctx.beginPath(); ctx.moveTo(pb.x, Y(v)); ctx.lineTo(pb.x + pb.w, Y(v)); ctx.stroke(); D.text(pb.x - 6, Y(v) + 4.5, v + ' km', { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip(); ctx.lineJoin = 'round';
    // 덩어리(건조 단열) 선과의 비교 색칠
    for (let k = 0; k < 60; k++) {
      const z1 = (k / 60) * 3, z2 = ((k + 1) / 60) * 3, ev = (zz) => { let i = 0; while (i < 4 && zz > ZL[i + 1]) i++; const f = (zz - ZL[i]) / (ZL[i + 1] - ZL[i]); return curP[i] + (curP[i + 1] - curP[i]) * f; };
      const d1 = curP[0] - 10 * z1 - ev(z1), d2 = curP[0] - 10 * z2 - ev(z2);
      ctx.fillStyle = (d1 + d2) / 2 > 0 ? 'rgba(239,68,68,.26)' : 'rgba(59,130,246,.2)';
      poly([[X(curP[0] - 10 * z1), Y(z1)], [X(curP[0] - 10 * z2), Y(z2)], [X(ev(z2)), Y(z2)], [X(ev(z1)), Y(z1)]]); ctx.fill();
    }
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.6; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(X(curP[0]), Y(0)); ctx.lineTo(X(curP[0] - 30), Y(3)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 3.8; ctx.beginPath(); ZL.forEach((z, i) => { const x = X(curP[i]), y = Y(z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.restore(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    D.label(pb.x + 8, pb.y + 16, '─ 주변(붉은 실선)  ┄ 덩어리(건조 단열)', { bg: 'rgba(15,23,42,.7)', size: 11.5, pad: 7, align: 'left' });
    const L0 = lapseOf(curP);
    drawWrap(B.x + B.w / 2, B.y + B.h - (PHONE ? 40 : 52), '붉은 면: 덩어리가 더 따뜻해 떠올라요 · 푸른 면: 더 차가워 제자리로', B.w - 20, 12, { color: '#475569', weight: 800 });
    D.text(B.x + B.w / 2, B.y + B.h - 12, L0.inv ? '기온 역전층이 있어요 (높이 올라갈수록 기온이 오르는 층)' : '가장 가파른 층의 감률 ' + fx(L0.max, 2) + ' °C/100 m', { size: 13, weight: 800, color: '#b91c1c' });

    // 서해 계산 패널
    card(C, '🧮 겨울 서해: 해수면 ' + S.sst + ' °C 위로 ' + minus(S.t850) + ' °C(1.5 km)의 공기');
    const g = gamSea(), cat = catOf(g), tx = C.x + 16;
    D.text(tx, C.y + 56, '감률 = (' + S.sst + ' − (' + minus(S.t850) + ')) / 1.5 km', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    D.text(tx, C.y + 56 + 26 * FS * 0.9, '= ' + fx(S.sst - S.t850, 0) + ' °C / 1.5 km = ' + fx((S.sst - S.t850) / 1.5, 1) + ' °C/km', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    D.text(tx, C.y + 56 + 54 * FS * 0.9, '= ' + fx(g, 2) + ' °C/100 m', { size: 17, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(tx, C.y + 56 + 80 * FS * 0.9, '건조 단열 감률 1.0, 습윤 0.5와 비교하면?', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    // 눈금 막대
    const bx = C.x + 16, bw = C.w - 32, by = C.y + C.h - (PHONE ? 30 : 38), gx = (v) => bx + (bw * clamp(v, 0, 1.6)) / 1.6;
    ctx.fillStyle = 'rgba(34,197,94,.35)'; ctx.fillRect(bx, by, gx(0.5) - bx, 12); ctx.fillStyle = 'rgba(245,158,11,.4)'; ctx.fillRect(gx(0.5), by, gx(1.0) - gx(0.5), 12); ctx.fillStyle = 'rgba(239,68,68,.4)'; ctx.fillRect(gx(1.0), by, bx + bw - gx(1.0), 12);
    D.text(gx(0.25), by + 26, '절대 안정', { size: 11.5, weight: 800, color: '#15803d' }); D.text(gx(0.75), by + 26, '조건부 불안정', { size: 11.5, weight: 800, color: '#b45309' }); D.text(gx(1.3), by + 26, '절대 불안정', { size: 11.5, weight: 800, color: '#b91c1c' });
    D.sphere(gx(g), by + 6, 8, '#1d4ed8', { shadow: true });
  }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const MODES = [['lapse', '🎈 단열 감률'], ['judge', '⚖️ 안정도'], ['skew', '📐 단열선도'], ['change', '🎬 안정도 변화']];
  const MODE_LABEL = { lapse: '🎈 상승하는 공기 덩어리와 단열 감률', judge: '⚖️ 환경 곡선과 덩어리 곡선 비교', skew: '📐 단열선도 읽기', change: '🎬 안정도가 바뀌는 상황' };
  const FREE_KEYS = { lapse: ['lift'], judge: ['envSel', 'zJ'], skew: ['markSel'], change: ['sea', 'selSit'] };
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
  clearBadOnInput('.num-in');

  // 장면 1
  function syncLift() { const b = $('#bLift'); b.textContent = S.lift ? '⏸ 멈춤' : '▶ 자동으로 올리기'; }
  SciSim.bindRange($('#sZ'), $('#oZ'), (v) => v + ' m', (v) => { S.lift = false; S.z = +v; syncLift(); });
  $('#bLift').addEventListener('click', () => { Sound.click(); if (S.lift) S.lift = false; else { if (S.z >= ZMAX1) { S.z = 0; S.zV = 0; } S.lift = true; } syncLift(); });
  $('#bDown').addEventListener('click', () => { Sound.click(); S.lift = false; S.z = 0; setSlider($('#sZ'), $('#oZ'), 0, (v) => v + ' m'); syncLift(); });
  function setZ(v) { S.lift = false; S.z = v; setSlider($('#sZ'), $('#oZ'), v, (x) => x + ' m'); syncLift(); }
  // 장면 2
  function syncEnv() { syncSeg('#envBtns', 'e', S.env); }
  bindSeg('#envBtns', 'e', (e) => { S.env = +e; S.envSeen[e] = true; syncEnv(); if (S.zJ === 1000) S.seen1km[S.env] = true; });
  SciSim.bindRange($('#sZJ'), $('#oZJ'), (v) => v + ' m', (v) => { S.zJ = +v; if (+v === 1000) S.seen1km[S.env] = true; });
  function setZJ(v) { S.zJ = v; setSlider($('#sZJ'), $('#oZJ'), v, (x) => x + ' m'); if (v === 1000) S.seen1km[S.env] = true; }
  const clsEnv = makeClassify($('#clsEnv'), [{ id: 'e0', label: '환경 감률 <b>0.4</b> °C/100 m' }, { id: 'e1', label: '환경 감률 <b>0.7</b> °C/100 m' }, { id: 'e2', label: '환경 감률 <b>1.2</b> °C/100 m' }],
    [{ id: 's', label: '절대 안정' }, { id: 'c', label: '조건부 불안정' }, { id: 'u', label: '절대 불안정' }], { e0: 's', e1: 'c', e2: 'u' }, () => { });
  const clsWarm = makeClassify($('#clsWarm'), [{ id: 'w0', label: '환경 감률 <b>0.4</b>일 때' }, { id: 'w2', label: '환경 감률 <b>1.2</b>일 때' }],
    [{ id: 'w', label: '주변보다 따뜻' }, { id: 'k', label: '주변보다 차가움' }], { w0: 'k', w2: 'w' }, () => { });
  // 장면 3
  function syncMark() { syncSeg('#markBtns', 'm', S.markSel); }
  bindSeg('#markBtns', 'm', (m) => { S.markSel = m; syncMark(); });
  $('#bBuild').addEventListener('click', () => { Sound.click(); S.pp = 0; S.building = true; });
  $('#bMarkClr').addEventListener('click', () => { Sound.click(); S.marks = { lcl: null, lfc: null }; });
  // 장면 4
  SciSim.bindRange($('#sSst'), $('#oSst'), (v) => v + ' °C', (v) => { S.sst = +v; });
  SciSim.bindRange($('#sT850'), $('#oT850'), (v) => minus(v) + ' °C', (v) => { S.t850 = +v; });
  function syncGam() { syncSeg('#gamBtns', 'g', S.gamPick || ''); }
  bindSeg('#gamBtns', 'g', (g) => { S.gamPick = g; syncGam(); });
  const selSit = makeSelects($('#selSit'), [
    { id: 'd0', label: '☀️ 낮 지표 가열' }, { id: 'd1', label: '🌙 맑은 밤 복사 냉각' }, { id: 'd2', label: '🅷 고기압 침강' }, { id: 'd3', label: '❄️ 겨울 서해 위 찬 공기' }, { id: 'd4', label: '🌬️ 상층 한기 유입' },
  ], [], { d0: 'x', d1: 'x', d2: 'x', d3: 'x', d4: 'x' }, () => { });
  // 상황 카드마다 두 개의 선택: (변화 방향, 날씨)
  const SITANS = { d0: ['un', ['sh']], d1: ['st', ['fog', 'smog']], d2: ['st', ['smog']], d3: ['un', ['snow']], d4: ['un', ['sh']] };
  (function buildSit() {
    const root = $('#selSit'); root.innerHTML = ''; root.classList.add('sels');
    const dirOpts = [['un', '불안정해져요'], ['st', '안정해져요']], wOpts = [['sh', '소나기·뇌우'], ['fog', '안개'], ['smog', '스모그(대기 정체)'], ['snow', '눈구름·대설']];
    selSit.rows = {}; selSit.val = {};
    ['d0', 'd1', 'd2', 'd3', 'd4'].forEach((id, i) => {
      const row = mk('div', 'sel-row'); row.dataset.i = i; selSit.rows[id] = row;
      row.appendChild(mk('label', 'sel-lab', ['☀️ 낮 지표 가열', '🌙 맑은 밤 복사 냉각', '🅷 고기압 침강', '❄️ 겨울 서해 위 찬 공기', '🌬️ 상층 한기 유입'][i]));
      const s1 = mk('select', 'sel'), s2 = mk('select', 'sel');
      [[s1, dirOpts, '안정도 변화'], [s2, wOpts, '날씨']].forEach((q) => { const o0 = mk('option', '', q[2] + ' ▾'); o0.value = ''; q[0].appendChild(o0); q[1].forEach((o) => { const op = mk('option', '', o[1]); op.value = o[0]; q[0].appendChild(op); }); q[0].setAttribute('aria-label', q[2]); row.appendChild(q[0]); });
      const upd = () => { Sound.click(); selSit.val[id] = [s1.value || null, s2.value || null]; row.classList.remove('bad'); };
      s1.addEventListener('change', upd); s2.addEventListener('change', upd);
      const focus = () => { S.sit = i; S.sitSeen[i] = true; };
      row.addEventListener('focusin', focus); row.addEventListener('pointerdown', focus);
      root.appendChild(row);
    });
    selSit.count = () => Object.keys(selSit.val).filter((k) => selSit.val[k] && selSit.val[k][0] && selSit.val[k][1]).length;
    selSit.complete = () => selSit.count() === 5;
    selSit.wrong = () => Object.keys(SITANS).filter((k) => { const v = selSit.val[k]; return v && v[0] && v[1] && !(v[0] === SITANS[k][0] && SITANS[k][1].includes(v[1])); });
    selSit.ok = () => selSit.complete() && selSit.wrong().length === 0;
    selSit.mark = (ids) => Object.keys(selSit.rows).forEach((k) => selSit.rows[k].classList.toggle('bad', ids.includes(k)));
    selSit.reset = () => { selSit.val = {}; $$('#selSit select').forEach((e) => { e.value = ''; }); selSit.mark([]); };
  })();

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); flash.t = 0; S.lift = false; syncLift();
    $$('.num-in').forEach((e) => { e.value = ''; e.classList.remove('bad'); });
    S.z = 0; S.zV = 0; S.seenCloud = false; S.cloudA = 0; setSlider($('#sZ'), $('#oZ'), 0, (v) => v + ' m');
    S.env = 1; S.envSeen = { 1: true }; S.seen1km = {}; syncEnv(); setZJ(0); clsEnv.reset(); clsWarm.reset();
    S.pp = 0; S.building = false; S.marks = { lcl: null, lfc: null }; S.markSel = 'lcl'; syncMark();
    S.sit = 3; S.sitSeen = {}; S.sst = 8; S.t850 = -12; setSlider($('#sSst'), $('#oSst'), 8, (v) => v + ' °C'); setSlider($('#sT850'), $('#oT850'), -12, (v) => minus(v) + ' °C'); S.gamPick = null; syncGam(); selSit.reset();
    S.cu = S.fog = S.sea = S.cb = 0;
    if (li === 0) { setMode('lapse'); setCtl(['lift', 'lcl']); showHint('슬라이더로 덩어리를 올리면 기온과 이슬점이 변해요', 5200); }
    else if (li === 1) { setMode('judge'); setCtl(['envSel', 'zJ']); showHint('덩어리 높이를 바꾸며 주변 기온과 비교해 봐요', 5200); }
    else if (li === 2) { setMode('skew'); setCtl(['markSel']); showHint('▶ 덩어리 띄우기를 눌러 경로를 그려 봐요', 5200); }
    else { setMode('change'); setCtl(['sea', 'gamIn']); showHint('해수면 온도와 상층 기온으로 감률을 계산해 봐요', 5200); }
    updateCtl();
  }
  const lclV = () => $in('#iLcl'), t2V = () => $in('#iT2000');
  const levels = [
    {
      title: '공기 덩어리가 오르며 식어요', short: '단열 감률', icon: '🎈', phase: '실험', features: ['lapse'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 공기라도 어떤 날은 구름이 하늘 높이 솟고, 어떤 날은 낮고 평평한 구름만 끼는 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>중3 구름의 생성</b>에서 \'상승 → 단열 팽창 → 냉각 → 응결\'을 배웠고, <b>진로선택 역학과 에너지</b>의 열역학 제1법칙에서 단열 팽창하면 기체의 온도가 내려간다는 것을 배웠어요. 이번에는 이 과정을 <b>수치</b>로 나타내요.</div>' +
        '<p>지표 기온 25 °C, 이슬점 17 °C인 공기 덩어리를 높이 올려 봐요. 포화되기 전에는 <b>건조 단열 감률 1.0 °C/100 m</b>(약 9.8 °C/km)로 식고, 포화된 뒤(구름 속)에는 <b>습윤 단열 감률 약 0.5 °C/100 m</b>로 식어요. 이슬점도 약 0.2 °C/100 m씩 내려가요.</p>',
      setup() { resetStep(0); },
      recap: '덩어리는 포화되기 전 1.0 °C/100 m로 식고, 이슬점은 약 0.2 °C/100 m씩 내려가 1000 m에서 둘이 만나 구름이 생겨요. 구름 속에서는 응결 잠열 때문에 약 0.5 °C/100 m로만 식어요.',
      summary: '<ul><li>건조 단열 감률 Γd = <b>1.0 °C/100 m</b>(약 9.8 °C/km), 습윤(포화) 단열 감률 Γm ≈ <b>0.5 °C/100 m</b>(평균값, 응결 잠열 방출 때문에 작아요). 이슬점은 약 0.2 °C/100 m씩 내려가요.</li><li>예시 덩어리(지표 25 °C, 이슬점 17 °C): 상승 응결 고도 LCL = 125 × (25 − 17) = <b>1000 m</b>, 구름 밑면 기온 15 °C. 2000 m에서 10 °C, 3000 m에서 5 °C.</li><li>구름 속에서도 1 °C/100 m로 식는다는 것은 오개념이에요.</li></ul>',
      missions: [
        {
          title: '구름 밑면의 높이 찾기', manual: true,
          goal: '덩어리를 올리며 <b>기온과 이슬점이 만나 구름이 생기는 높이</b>를 찾고, 구름 밑면의 높이(m)를 입력해요.',
          hint: '자동으로 올리기를 눌러 보세요. 기온과 이슬점이 같아지는 순간 구름이 생겨요. 125 × (25 − 17)로 계산해도 돼요.',
          setup() { $('#iLcl').value = ''; setMode('lapse'); setCtl(['lift', 'lcl']); },
          status: () => mark(S.seenCloud) + ' 구름이 생기는 것 확인 · ' + mark(near(lclV(), LCL, 50)) + ' 입력 ' + (lclV() == null ? '—' : lclV() + ' m'),
          check() {
            if (!S.seenCloud) return '먼저 덩어리를 올려서 구름이 생기는 것을 확인해 보세요.';
            const v = lclV(); if (v == null) return '높이를 입력해 주세요.';
            const ok = near(v, LCL, 50); markBad('#iLcl', !ok);
            if (!ok) return '기온 − 이슬점이 0이 되는 높이예요. (25 − 17) °C에서 건조 단열로 오르며 8 °C 차이가 줄어드는 높이를 확인해 봐요.';
            return true;
          },
          explain: '덩어리 기온은 1.0 °C/100 m, 이슬점은 0.2 °C/100 m씩 내려가서 둘의 차이가 100 m마다 0.8 °C씩 줄어요. 차이 8 °C가 0이 되는 높이는 <b>1000 m</b>이고, 이때 기온과 이슬점이 15 °C로 같아져 응결(구름 생성)이 시작돼요. (LCL = 125 × 8 = 1000 m)',
        },
        {
          title: '2000 m에서의 덩어리 기온', manual: true,
          goal: '덩어리를 <b>2000 m</b>까지 올려서, 이때 덩어리의 기온(°C)을 입력해요.',
          hint: '1000 m까지는 1.0 °C/100 m(25 → 15 °C), 그 위는 0.5 °C/100 m로 식어요. 1000 m를 더 올라가면 5 °C 더 내려가요.',
          setup() { $('#iT2000').value = ''; setMode('lapse'); setCtl(['lift', 't2000']); },
          status: () => mark(S.z === 2000) + ' 높이 ' + S.z + ' m (목표 2000) · ' + mark(near(t2V(), parcelT(2000), 0.3)) + ' 입력 ' + (t2V() == null ? '—' : t2V() + ' °C'),
          check() {
            if (S.z !== 2000) return '덩어리 높이를 2000 m로 맞춰 주세요.';
            const v = t2V(); if (v == null) return '기온을 입력해 주세요.';
            const ok = near(v, parcelT(2000), 0.3); markBad('#iT2000', !ok);
            if (!ok) return near(v, 5, 0.3) ? '5 °C는 3000 m의 값이에요. 2000 m일 때 온도계를 다시 읽어 봐요.' : v === 5 || v < 6 ? '구름 속에서는 0.5 °C/100 m로만 식어요.' : '구름 밑면(1000 m)에서 15 °C이고, 그 위 1000 m는 0.5 °C/100 m로 식어요.';
            return true;
          },
          explain: '1000 m까지 25 → 15 °C(1.0 °C/100 m), 그 위 1000 m는 습윤 단열 감률 0.5 °C/100 m로 5 °C 내려가 2000 m에서 <b>10 °C</b>예요. 3000 m에서는 5 °C가 돼요.',
        },
        {
          type: 'quiz', title: '구름 속에서 덜 식는 까닭',
          goal: '습윤 단열 감률(약 0.5 °C/100 m)이 건조 단열 감률(1.0 °C/100 m)보다 작은 까닭은?',
          setup() { setMode('lapse'); setCtl(['lift']); },
          choices: ['구름 속 공기는 더 이상 팽창하지 않기 때문이에요.', '수증기가 응결하면서 잠열을 방출해 공기를 데우기 때문이에요.', '구름 속에서도 포화 여부와 관계없이 똑같이 1.0 °C/100 m로 식어요.', '구름이 태양 빛을 막아서 식는 속도가 느려지기 때문이에요.'],
          answer: 1,
          feedback: ['올라가면 기압이 낮아져 구름 속 공기도 계속 팽창하고 냉각돼요.', '', '구름 속(포화)에서는 응결 잠열이 방출돼 식는 속도가 줄어들어요. 구름 속에서도 1.0 °C/100 m로 식는다는 것은 오개념이에요.', '식는 속도는 햇빛이 아니라 단열 팽창과 응결 잠열로 정해져요.'],
          explain: '포화된 덩어리가 올라가면 수증기가 응결하면서 <b>잠열을 방출</b>해 덩어리를 데워요. 그래서 구름 속에서는 건조 단열 감률(1.0)보다 작은 <b>약 0.5 °C/100 m</b>로 식어요. (앞 차시 열수지의 잠열과 이어져요.)',
        },
      ],
    },
    {
      title: '안정도 판정: 덩어리와 주변 비교', short: '안정도 판정', icon: '⚖️', phase: '분석', features: ['judge'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 덩어리가 오르며 식는 비율(단열 감률)을 알았어요. 이번에는 <b>주변(환경) 공기의 기온 분포</b>와 비교해 덩어리가 계속 올라갈지 판정해요.</div>' +
        '<p>덩어리가 주변보다 <b>따뜻하면</b> 부력으로 계속 올라가요(불안정), <b>차가우면</b> 제자리로 돌아와요(안정). 환경 기온 감률 Γ를 단열 감률과 비교해요: Γ &lt; 0.5는 <b>절대 안정</b>, 0.5 &lt; Γ &lt; 1.0은 <b>조건부 불안정</b>, Γ &gt; 1.0은 <b>절대 불안정</b>이에요.</p>',
      setup() { resetStep(1); },
      recap: '안정도는 환경 기온 감률을 덩어리의 단열 감률(습윤 0.5, 건조 1.0)과 비교해 정해요. 0.4는 절대 안정, 0.7은 조건부 불안정, 1.2는 절대 불안정이에요.',
      summary: '<ul><li>덩어리가 주변보다 <b>따뜻하면</b> 부력으로 상승(불안정), <b>차가우면</b> 제자리로 돌아옴(안정).</li><li>환경 감률 Γ &lt; Γm(0.5) <b>절대 안정</b> · Γm &lt; Γ &lt; Γd(1.0) <b>조건부 불안정</b> · Γ &gt; Γd <b>절대 불안정</b>.</li><li>예시 덩어리를 1 km 올렸을 때(15 °C): Γ = 0.4이면 주변 21 °C로 덩어리가 차갑고, Γ = 1.2이면 주변 13 °C로 덩어리가 따뜻해요.</li><li>안정도의 기준은 감률의 비교예요. \'안정 = 바람이 없다\'는 오개념이에요.</li></ul>',
      missions: [
        {
          title: '환경 곡선 세 가지 분류', manual: true,
          goal: '주변 기온 감률이 <b>0.4 · 0.7 · 1.2</b> °C/100 m인 세 대기를 <b>절대 안정 · 조건부 불안정 · 절대 불안정</b>으로 분류해요.',
          hint: '감률을 습윤 단열 감률 0.5와 건조 단열 감률 1.0에 견줘 보세요. 0.5보다 작으면 절대 안정, 1.0보다 크면 절대 불안정, 그 사이는 조건부 불안정이에요.',
          setup() { clsEnv.reset(); setMode('judge'); setCtl(['envSel', 'zJ', 'clsEnv']); },
          status: () => mark(clsEnv.ok()) + ' 분류 ' + clsEnv.count() + ' / 3 · ' + mark([0, 1, 2].every((e) => S.envSeen[e])) + ' 살펴본 곡선 ' + [0, 1, 2].filter((e) => S.envSeen[e]).length + ' / 3',
          check() {
            if (!clsEnv.complete()) return '세 가지를 모두 분류해 주세요. (지금 ' + clsEnv.count() + '개)';
            if (!clsEnv.ok()) { clsEnv.mark(clsEnv.wrong()); return '빨간 항목이 달라요. 환경 감률을 0.5와 1.0에 견줘 봐요.'; }
            return true;
          },
          explain: '<b>0.4 &lt; 0.5</b> → 덩어리가 항상 더 차가워 <b>절대 안정</b>, <b>0.5 &lt; 0.7 &lt; 1.0</b> → 습윤일 때는 불안정, 건조일 때는 안정이라 <b>조건부 불안정</b>, <b>1.2 &gt; 1.0</b> → 덩어리가 항상 더 따뜻해 <b>절대 불안정</b>이에요.',
        },
        {
          title: '1 km 높이에서 덩어리의 기온 비교', manual: true,
          goal: '덩어리 높이를 <b>1000 m</b>로 맞추고, 환경 감률이 <b>0.4</b>일 때와 <b>1.2</b>일 때 덩어리가 주변보다 따뜻한지 차가운지 골라요.',
          hint: '주변 곡선 단추(0.4, 1.2)를 번갈아 눌러 보며 높이 1000 m에서 덩어리(15 °C)와 주변을 비교해요. 붉은 면은 덩어리가 더 따뜻한 구간이에요.',
          setup() { clsWarm.reset(); S.seen1km = {}; setMode('judge'); setCtl(['envSel', 'zJ', 'clsWarm']); },
          status: () => mark(!!S.seen1km[0]) + ' 0.4 · 1 km 확인 ' + mark(!!S.seen1km[2]) + ' 1.2 · 1 km 확인 · ' + mark(clsWarm.ok()) + ' 고른 것 ' + clsWarm.count() + ' / 2',
          check() {
            if (!S.seen1km[0] || !S.seen1km[2]) return '높이를 1000 m로 맞추고, 환경 감률 0.4와 1.2를 모두 확인해 주세요.';
            if (!clsWarm.complete()) return '두 경우를 모두 골라 주세요.';
            if (!clsWarm.ok()) { clsWarm.mark(clsWarm.wrong()); return '빨간 항목이 달라요. 1000 m에서 덩어리는 15 °C예요. 주변 온도(0.4면 21 °C, 1.2면 13 °C)와 비교해 봐요.'; }
            return true;
          },
          explain: '1000 m에서 덩어리는 15 °C예요. 감률 0.4이면 주변이 21 °C라 덩어리가 <b>6 °C 더 차가워</b> 제자리로 돌아가고, 감률 1.2이면 주변이 13 °C라 덩어리가 <b>2 °C 더 따뜻해</b> 계속 올라가요.',
        },
        {
          type: 'quiz', title: '안정도의 기준',
          goal: '대기의 안정도를 판정하는 기준으로 알맞은 것은?',
          setup() { setMode('judge'); setCtl(['envSel', 'zJ']); },
          choices: ['바람이 없으면 안정하고 바람이 세면 불안정해요.', '환경 기온 감률을 상승하는 덩어리의 단열 감률(습윤 0.5, 건조 1.0)과 비교해요.', '지표 기온이 높을수록 항상 불안정해요.', '구름이 많을수록 항상 안정해요.'],
          answer: 1,
          feedback: ['안정도는 바람이 아니라 기온의 연직 분포로 정해져요. \'안정 = 바람이 없다\'는 오개념이에요.', '', '지표 기온 자체가 아니라 높이에 따른 기온 감소율이 중요해요.', '구름의 양이 아니라 감률의 비교로 정해요.'],
          explain: '안정도는 <b>환경 기온 감률</b>과 <b>덩어리의 단열 감률</b>을 비교해서 정해요. 덩어리가 주변보다 따뜻해지면(감률이 크면) 불안정, 차가워지면 안정이에요. 바람의 세기와는 별개예요.',
        },
      ],
    },
    {
      title: '단열선도로 구름 읽기', short: '단열선도', icon: '📐', phase: '분석', features: ['skew'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 덩어리와 주변의 기온을 그래프로 비교했어요. 기상학자들은 이를 한 장에 모아 둔 <b>단열선도</b>를 써요.</div>' +
        '<p>단열선도는 세로축이 기압(로그 눈금, 고도 눈금 함께), 가로축이 기온(오른쪽 위로 기울어져 있음)이에요. <b>건조 단열선</b>, <b>습윤 단열선</b>, <b>등포화혼합비선</b>을 읽어요. 덩어리는 건조 단열선을 따라 오르다 <b>이슬점 곡선</b>과 만나는 <b>LCL</b>에서 구름이 생기고, 이후 습윤 단열선을 따라 올라가 <b>환경 곡선</b>과 만나는 <b>LFC</b>를 넘으면 스스로 떠올라요.</p>',
      setup() { resetStep(2); },
      recap: '지표 25 °C, 이슬점 17 °C 덩어리는 LCL 약 1.0 km(15 °C)에서 구름이 생기고, 환경 곡선과 만나는 LFC 약 2.5 km(7.5 °C) 위에서는 주변보다 따뜻해 스스로 상승해요.',
      summary: '<ul><li>단열선도: 세로축 기압(로그), 가로축 기온(기울어진 축), 건조 단열선 · 습윤 단열선 · 등포화혼합비선 · 환경 곡선 · 이슬점 곡선.</li><li>덩어리 경로: 건조 단열선을 따라 상승 → 이슬점 곡선(등포화혼합비선)과 만나는 곳이 <b>LCL</b>(약 1.0 km, 15 °C) → 습윤 단열선을 따라 상승 → 환경 곡선과 만나는 곳이 <b>LFC</b>(약 2.5 km, 7.5 °C).</li><li>LCL~LFC 구간에서는 덩어리가 주변보다 차가워서 산비탈·전선 같은 <b>강제 상승</b>이 필요하고, LFC 위에서는 덩어리가 더 따뜻해 적운이 높이 발달해요 (조건부 불안정).</li></ul>',
      missions: [
        {
          title: 'LCL 찾기',
          goal: '덩어리를 띄워 경로를 그린 뒤, <b>LCL 표시</b>를 고르고 단열선도에서 <b>건조 단열선과 이슬점 곡선이 만나는 곳</b>을 눌러요.',
          hint: '▶ 덩어리 띄우기를 누르면 주황색 건조 단열선이 그려져요. 청록색 이슬점 곡선과 만나는 곳이 약 1.0 km예요. 눌러서 끌어 위치를 고쳐도 돼요.',
          setup() { S.marks = { lcl: null, lfc: null }; S.markSel = 'lcl'; syncMark(); S.pp = 0; setMode('skew'); setCtl(['markSel']); },
          check: () => okLCL(skGeo()), hold: 0.5,
          status: () => mark(S.pp >= LCLZ) + ' 덩어리 경로 그리기 · ' + mark(okLCL(skGeo())) + ' LCL ' + (S.marks.lcl ? fx(S.marks.lcl.z, 1) + ' km' : '—'),
          explain: '건조 단열선(주황)과 이슬점 곡선(청록, 등포화혼합비선)은 지표에서 8 °C 떨어져 출발해 <b>약 1.0 km(15 °C)</b>에서 만나요. 이곳이 상승 응결 고도 LCL이에요.',
        },
        {
          title: 'LFC 찾기',
          goal: '<b>LFC 표시</b>를 고르고, 덩어리 경로(습윤 단열선)가 <b>환경 곡선과 만나는 곳</b>(약 2.5 km, 7.5 °C)을 눌러요.',
          hint: 'LCL 위에서는 초록색 습윤 단열선을 따라가요. 붉은 환경 곡선과 다시 만나는 곳이 LFC예요. 그 아래에서는 덩어리가 주변보다 차가워요.',
          setup() { S.markSel = 'lfc'; syncMark(); S.pp = ZT; setMode('skew'); setCtl(['markSel']); },
          check: () => okLFC(skGeo()), hold: 0.5,
          status: () => mark(okLFC(skGeo())) + ' LFC ' + (S.marks.lfc ? fx(S.marks.lfc.z, 1) + ' km, ' + minus(fx(S.marks.lfc.T, 1)) + ' °C' : '—'),
          explain: '습윤 단열선(15 − 0.5(z−1000))과 환경 곡선(25 − 0.7z)이 만나는 높이는 <b>2500 m</b>이고 기온은 <b>7.5 °C</b>예요. 이 LFC 위에서는 덩어리가 주변보다 따뜻해서 스스로 상승해요.',
        },
        {
          type: 'quiz', title: 'LCL과 LFC 사이의 덩어리',
          goal: 'LCL과 LFC 사이에서는 덩어리가 주변보다 차가운데도, 산비탈·전선 같은 강제 상승으로 LFC를 넘으면 소나기구름이 발달하는 까닭은?',
          setup() { setMode('skew'); setCtl(['markSel']); },
          choices: ['조건부 불안정이라, LFC 위에서는 덩어리가 주변보다 따뜻해져 스스로 계속 상승하기 때문이에요.', '절대 불안정이라 처음부터 스스로 상승하기 때문이에요.', 'LFC 아래에서도 덩어리가 주변보다 항상 따뜻하기 때문이에요.', '강제 상승이 구름 입자를 직접 만들어 주기 때문이에요.'],
          answer: 0,
          feedback: ['', '절대 불안정이면 LCL 아래에서부터 덩어리가 더 따뜻해요. 이 사운딩은 조건부 불안정이라 LFC까지는 밀어 올려야 해요.', 'LFC 아래(LCL~LFC)에서는 덩어리가 주변보다 차가워요.', '강제 상승은 덩어리를 LFC까지 밀어 올릴 뿐이고, 그 뒤는 부력으로 올라가요.'],
          explain: '환경 감률이 0.5와 1.0 사이인 <b>조건부 불안정</b>에서는 LFC 아래에서 덩어리가 주변보다 차갑지만, 강제 상승으로 <b>LFC를 넘으면</b> 덩어리가 더 따뜻해져 스스로 상승하며 적운이 높이 발달해요.',
        },
      ],
    },
    {
      title: '안정도가 바뀌는 상황', short: '안정도 변화', icon: '🎬', phase: '적용', features: ['change'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 안정도는 주변 기온의 연직 분포에 따라 정해진다고 배웠어요. 실제 날씨에서 안정도는 어떤 상황에서 바뀔까요?</div>' +
        '<p>낮에는 지표가 가열되어 불안정해지고, 맑은 밤에는 복사 냉각으로 지표 근처 기온 역전(안정)이 생겨 안개가 끼요. 고기압 중심에서는 침강하는 공기가 단열 압축되어 역전층이 생기고, 겨울 서해에서는 차가운 시베리아 공기가 따뜻한 바다 위를 지나며 매우 불안정해져 눈구름이 발달해요.</p>',
      setup() { resetStep(3); },
      recap: '지표 가열·상층 한기·바다 위 찬 공기는 안정도를 낮추고(불안정), 복사 냉각·고기압 침강은 안정도를 높여요(역전층). 겨울 서해 상공의 감률 약 1.33 °C/100 m는 절대 불안정이라 대설이 내려요.',
      summary: '<ul><li><b>낮 지표 가열</b> → 감률 증가 → 불안정(소나기). <b>맑은 밤 복사 냉각</b> → 지표 근처 기온 역전 → 안정(안개·스모그). <b>고기압 침강</b> → 단열 압축 가열 → 역전층(스모그). <b>상층 한기 유입</b> → 감률 증가 → 불안정(소나기·뇌우).</li><li>겨울 서해: 시베리아 한랭 기단(850 hPa, 약 1.5 km 기온 −12 °C)이 해수면 8 °C 위로 오면 Γ = 20 °C / 1.5 km ≈ <b>1.33 °C/100 m &gt; 1.0</b> → 절대 불안정 → 눈구름 발달, 서해안 대설.</li></ul>',
      missions: [
        {
          title: '겨울 서해 상공의 기온 감률', manual: true,
          goal: '해수면 <b>8 °C</b>, 약 1.5 km(850 hPa) 기온 <b>−12 °C</b>일 때 서해 상공의 기온 감률을 °C/100 m로 입력하고, 안정도를 골라요.',
          hint: '(8 − (−12)) / 1.5 km = 20 / 1.5 = 13.3 °C/km이고, 100 m로 바꾸면 1.33 °C/100 m예요. 건조 단열 감률(1.0)보다 커요.',
          setup() { S.sit = 3; S.sst = 8; S.t850 = -12; setSlider($('#sSst'), $('#oSst'), 8, (v) => v + ' °C'); setSlider($('#sT850'), $('#oT850'), -12, (v) => minus(v) + ' °C'); $('#iGam').value = ''; S.gamPick = null; syncGam(); setMode('change'); setCtl(['sea', 'gamIn']); },
          status: () => mark(near($in('#iGam'), gamSea(), 0.03)) + ' 입력 ' + ($in('#iGam') == null ? '—' : $in('#iGam') + ' °C/100 m') + ' · ' + mark(S.gamPick === catOf(gamSea())) + ' 안정도 ' + (S.gamPick ? ({ s: '절대 안정', c: '조건부 불안정', u: '절대 불안정' })[S.gamPick] : '—'),
          check() {
            const v = $in('#iGam'); if (v == null) return '기온 감률을 입력해 주세요.';
            const ok = near(v, gamSea(), 0.03); markBad('#iGam', !ok);
            if (!ok) return near(v, gamSea() * 10, 0.3) ? '13.3은 1 km당 값(°C/km)이에요. 100 m당 값으로 바꿔 봐요.' : '(해수면 기온 − 1.5 km 기온) / 1.5 km를 계산한 뒤, 100 m당 값으로 바꿔 봐요.';
            if (!S.gamPick) return '안정도(절대 안정 · 조건부 불안정 · 절대 불안정)도 골라 주세요.';
            if (S.gamPick !== catOf(gamSea())) return '감률 ' + fx(gamSea(), 2) + ' °C/100 m를 습윤 0.5, 건조 1.0과 비교해 봐요.';
            return true;
          },
          explain: 'Γ = (8 − (−12)) / 1.5 km = 13.3 °C/km = <b>1.33 °C/100 m</b>예요. 건조 단열 감률 1.0보다 크므로 <b>절대 불안정</b>이라 공기가 강하게 상승해 눈구름이 발달하고, 서해안에 대설이 내려요.',
        },
        {
          title: '상황 카드 분류', manual: true,
          goal: '상황 카드 5장마다 <b>안정도가 어느 쪽으로 바뀌는지</b>와 <b>나타나는 날씨</b>를 골라요.',
          hint: '칸을 누르면 장면과 그래프가 바뀌어요. 지표가 뜨겁거나 위가 차가우면 불안정(소나기·눈구름), 지표가 식거나 위에서 공기가 내려와 덮개가 생기면 안정(안개·스모그)이에요.',
          setup() { selSit.reset(); S.sitSeen = {}; S.sit = 0; setMode('change'); setCtl(['selSit']); },
          status: () => mark(selSit.ok()) + ' 고른 카드 ' + selSit.count() + ' / 5 · ' + mark(Object.keys(S.sitSeen).length >= 5) + ' 살펴본 장면 ' + Object.keys(S.sitSeen).length + ' / 5',
          check() {
            if (!selSit.complete()) return '카드 5장마다 두 가지를 모두 골라 주세요. (지금 ' + selSit.count() + '장)';
            if (!selSit.ok()) { selSit.mark(selSit.wrong()); return '빨간 카드가 달라요. 장면과 기온 그래프에서 감률이 커졌는지, 역전층이 생겼는지 확인해 봐요.'; }
            return true;
          },
          explain: '<b>낮 지표 가열</b>·<b>겨울 서해 위 찬 공기</b>·<b>상층 한기 유입</b>은 감률이 커져 불안정해지고(소나기·눈구름), <b>맑은 밤 복사 냉각</b>은 지표 근처 역전층으로 안정해져 안개가 끼며, <b>고기압 침강</b>은 단열 압축 가열로 역전층(덮개)이 생겨 스모그가 갇혀요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-stability', mount: '#game', badge: '대기 안정도 분석가', homeHref: '../../index.html#hs',
    featureLabels: { lapse: '🎈 상승하는 공기 덩어리', judge: '⚖️ 환경 곡선과 덩어리 비교', skew: '📐 단열선도', change: '🎬 안정도가 바뀌는 상황' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'lapse') setReadouts(['덩어리 높이', Math.round(S.zV) + ' m', '덩어리 기온', minus(fx(parcelT(S.zV), 1)) + ' °C', '이슬점', minus(fx(parcelTd(S.zV), 1)) + ' °C']);
    else if (m === 'judge') { const dT = dTj(ENVG[S.env], S.zJ); setReadouts(['환경 감률', ENVG[S.env].toFixed(1) + ' °C/100 m', '덩어리 − 주변', (dT > 0.04 ? '+' : dT < -0.04 ? '−' : '') + fx(Math.abs(dT), 1) + ' °C', '높이', S.zJ + ' m']); }
    else if (m === 'skew') setReadouts(['덩어리 경로', S.pp >= ZT ? '완성' : S.pp > 0 ? '그리는 중' : '아직', 'LCL 표시', S.marks.lcl ? fx(S.marks.lcl.z, 1) + ' km' : '—', 'LFC 표시', S.marks.lfc ? fx(S.marks.lfc.z, 1) + ' km' : '—']);
    else setReadouts(['지금 장면', SITN[S.sit], '서해 상공 감률', fx(gamSea(), 2) + ' °C/100 m', '판정 기준', '0.5 · 1.0 °C/100 m']);
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
    if (S.mode === 'lapse') drawLapse(t, dt);
    else if (S.mode === 'judge') drawJudge(t, dt);
    else if (S.mode === 'skew') drawSkew(t, dt);
    else drawChange(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, clsEnv, clsWarm, selSit, parcelT, parcelTd, envT, skGeo, okLCL, okLFC, LCL, ZT, SITANS,
    get game() { return game; }, setMode, resetStep, updateCtl, setZ, setZJ, setMarkAt, gamSea, catOf, lapseOf, profOf,
  };

})();
