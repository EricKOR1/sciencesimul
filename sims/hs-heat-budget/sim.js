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
     지표와 대기의 열수지 (빛의 행로 → 열수지 채우기 → 잠열 → 온난화 모의)
     ====================================================== */
  initStage('#eef3f9', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  let game = null;

  const S = {
    mode: 'path', fade: 0, clock: 0,
    proc: 'scatter', procSeen: { scatter: true }, elev: 60, elevR: 0, surf: 'snow', surfSeen: { snow: true },
    fill: {}, sel: null, wrongIds: [], used: {},
    q: 80, qSeen: { 80: true }, evapSeen: false,
    co2: 280, fb: false, dT: 0, tY: 0, hist: [], eqSeen: false, runSeen: {},
  };

  /* ---------- 장면 1: 빛의 행로 ---------- */
  const RC1 = PHONE
    ? { M: { x: 8, y: 8, w: 504, h: 392 }, N: { x: 8, y: 408, w: 504, h: 304 } }
    : { M: { x: 12, y: 12, w: 776, h: 352 }, N: { x: 12, y: 372, w: 776, h: 176 } };
  const ALB = { sea: 0.06, forest: 0.15, desert: 0.30, snow: 0.80 };
  const SURF_NAME = { sea: '바다', forest: '숲', desert: '사막', snow: '눈' };
  const SC0 = 340;
  const SCAT_K = 0.09;
  const sRel = (nm) => Math.pow(650 / nm, 4);                       // 650 nm 기준 상대 산란
  const airmass = (eDeg) => Math.min(12, 1 / Math.sin((Math.max(eDeg, 4) * Math.PI) / 180));
  const trans = (nm, e) => Math.exp(-SCAT_K * sRel(nm) * airmass(e));
  const refrR = (e) => 0.5 * Math.exp(-e / 6);                      // 굴절각(도), 지평선에서 0.5°
  function pathGeo() {
    const M = RC1.M, I = { x: M.x + 10, y: M.y + 36, w: M.w - 20, h: M.h - 46 };
    I.gy = I.y + I.h - 44; I.toa = I.y + 40; I.ox = I.x + I.w * 0.64;
    return I;
  }
  const sunAt = (I, e) => { const Rs = I.gy - I.y - 18, a = (e * Math.PI) / 180; return { x: I.ox - Rs * Math.cos(a), y: I.gy - Rs * Math.sin(a), Rs }; };
  const PH1 = [], PS = [];
  let spw = { a: 0, b: 0, c: 0 };
  function drawGround(I, kind, t) {
    const gh = 44, y0 = I.gy;
    if (kind === 'sea') { const g = ctx.createLinearGradient(0, y0, 0, y0 + gh); g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#0369a1'); ctx.fillStyle = g; ctx.fillRect(I.x, y0, I.w, gh); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let x = I.x; x <= I.x + I.w; x += 4) { const y = y0 + 8 + k * 12 + Math.sin(x / 14 + t * 1.6 + k) * 2.4; x === I.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); } }
    else if (kind === 'forest') { ctx.fillStyle = '#4d7c0f'; ctx.fillRect(I.x, y0, I.w, gh); for (let x = I.x + 14; x < I.x + I.w; x += 30) { ctx.fillStyle = '#166534'; poly([[x, y0 - 18], [x - 11, y0 + 4], [x + 11, y0 + 4]]); ctx.fill(); ctx.fillStyle = '#14532d'; poly([[x, y0 - 6], [x - 13, y0 + 12], [x + 13, y0 + 12]]); ctx.fill(); ctx.fillStyle = '#713f12'; ctx.fillRect(x - 2, y0 + 12, 4, 6); } }
    else if (kind === 'desert') { const g = ctx.createLinearGradient(0, y0, 0, y0 + gh); g.addColorStop(0, '#fcd34d'); g.addColorStop(1, '#d97706'); ctx.fillStyle = g; ctx.fillRect(I.x, y0, I.w, gh); ctx.fillStyle = 'rgba(180,83,9,.25)'; for (let x = I.x; x < I.x + I.w; x += 120) { ctx.beginPath(); ctx.ellipse(x + 60, y0 + 6, 70, 12, 0, Math.PI, 0); ctx.fill(); } }
    else { const g = ctx.createLinearGradient(0, y0, 0, y0 + gh); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bfdbfe'); ctx.fillStyle = g; ctx.fillRect(I.x, y0, I.w, gh); ctx.fillStyle = '#fff'; for (let x = I.x + 20; x < I.x + I.w; x += 80) { ctx.beginPath(); ctx.ellipse(x, y0 + 2, 46, 11, 0, Math.PI, 0); ctx.fill(); } }
  }
  function drawCloud(cx, cy, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    ctx.fillStyle = '#fff'; D.shadow(() => { ctx.beginPath(); [[-26, 6, 18], [-8, -4, 22], [12, 0, 24], [30, 7, 17], [2, 10, 22]].forEach((c) => { ctx.moveTo(cx + c[0] * s + c[2] * s, cy + c[1] * s); ctx.arc(cx + c[0] * s, cy + c[1] * s, c[2] * s, 0, TAU); }); ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(30,58,138,.25)' });
    ctx.restore();
  }
  function person(x, y) { ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(x, y - 22, 6, 0, TAU); ctx.fill(); ctx.fillRect(x - 5, y - 15, 10, 15); ctx.fillRect(x - 5, y - 1, 3.5, 6); ctx.fillRect(x + 1.5, y - 1, 3.5, 6); }
  function rayLine(x1, y1, x2, y2, col, w, a) { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,' + 0.5 * (a == null ? 1 : a) + ')'; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col; ctx.globalAlpha = a == null ? 1 : a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  function molSmall(kind, x, y, s, glow) {
    if (glow > 0.02) D.glow(x, y, 20 * s, '#fde047', 0.85 * glow);
    if (kind === 'o3') { D.sphere(x - 6 * s, y + 3 * s, 4.4 * s, '#a78bfa'); D.sphere(x + 6 * s, y + 3 * s, 4.4 * s, '#a78bfa'); D.sphere(x, y - 4 * s, 4.4 * s, '#7c3aed'); }
    else if (kind === 'h2o') { D.sphere(x, y - 2 * s, 5.6 * s, '#38bdf8'); D.sphere(x - 7 * s, y + 5 * s, 3.2 * s, '#f1f5f9'); D.sphere(x + 7 * s, y + 5 * s, 3.2 * s, '#f1f5f9'); }
    else { D.sphere(x - 9 * s, y, 4.6 * s, '#f87171'); D.sphere(x + 9 * s, y, 4.6 * s, '#f87171'); D.sphere(x, y, 4.8 * s, '#475569'); }
  }
  const MOL1 = (() => { const rn = seeded(11), a = []; for (let i = 0; i < 10; i++) a.push({ k: 'o3', fx: 0.12 + (i + rn() * 0.6) / 11.5 * 0.82, fy: rn(), glow: 0 }); for (let i = 0; i < 12; i++) a.push({ k: i % 2 ? 'h2o' : 'co2', fx: 0.1 + (i + rn() * 0.6) / 13 * 0.85, fy: rn(), glow: 0 }); return a; })();
  function layerY(I, which) { return which === 'o3' ? [I.toa + 6, I.toa + 44] : [I.gy - 120, I.gy - 54]; }
  function molXY(I, m) { const L = layerY(I, m.k === 'o3' ? 'o3' : 'low'); return { x: I.x + 14 + m.fx * (I.w - 28), y: L[0] + 10 + m.fy * (L[1] - L[0] - 20) }; }
  function drawPhoton1(p) {
    const L = p.kind === 'ir' ? 34 : p.kind === 'uv' ? 14 : 20, wl = p.kind === 'ir' ? 15 : p.kind === 'uv' ? 5 : 9, amp = p.kind === 'ir' ? 4.2 : 3;
    const col = { uv: '#7c3aed', vis: '#f59e0b', ir: '#dc2626' }[p.kind];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col : 'rgba(255,255,255,.75)'; ctx.lineWidth = pass ? 2.2 : 4.4; ctx.beginPath(); for (let u = -L; u <= 0; u += 2) { const y = amp * Math.sin(((u - p.age * 90) / wl) * TAU); u === -L ? ctx.moveTo(u, y) : ctx.lineTo(u, y); } ctx.stroke(); }
    ctx.restore();
  }
  function stepAbsorb(I, dt, sun) {
    if (!RM) { spw.a += dt * 1.3; spw.b += dt * 2.2; spw.c += dt * 2.0; } else if (!PH1.length) { spw.a = spw.b = spw.c = 1.1; }
    const emit = (kind) => {
      if (PH1.length > 50) return;
      if (kind === 'uv') { const m = MOL1.filter((q) => q.k === 'o3')[Math.floor(Math.random() * 10)]; const mp = molXY(I, m); const a = Math.atan2(mp.y - sun.y, mp.x - sun.x); PH1.push({ kind, x: sun.x, y: sun.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, age: 0, m, yEnd: mp.y }); }
      else if (kind === 'vis') { const tx = I.ox - 90 + Math.random() * 180, a = Math.atan2(I.gy - sun.y, tx - sun.x); PH1.push({ kind, x: sun.x, y: sun.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, age: 0, m: null, yEnd: null }); }
      else { const pool = MOL1.filter((q) => q.k !== 'o3'), m = Math.random() < 0.8 ? pool[Math.floor(Math.random() * pool.length)] : null; const mp = m ? molXY(I, m) : null; const x = mp ? mp.x : I.x + 30 + Math.random() * (I.w - 60); const a = mp ? Math.atan2(mp.y - I.gy, mp.x - x) : -Math.PI / 2; PH1.push({ kind, x, y: I.gy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, age: 0, m, yEnd: mp ? mp.y : null }); }
    };
    if (spw.a > 1) { spw.a = 0; emit('uv'); } if (spw.b > 1) { spw.b = 0; emit('vis'); } if (spw.c > 1) { spw.c = 0; emit('ir'); }
    for (let i = PH1.length - 1; i >= 0; i--) {
      const p = PH1[i]; if (p.hold > 0) { p.hold -= dt; if (p.hold <= 0) p.age = 0; continue; }
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; let dead = false;
      if (p.m && p.yEnd != null && ((p.vy > 0 && p.y >= p.yEnd) || (p.vy < 0 && p.y <= p.yEnd))) {
        p.m.glow = 1; dead = true; const mp = molXY(I, p.m);
        for (let k = 0; k < 4; k++) parts.emit({ x: mp.x, y: mp.y, vx: rnd(-40, 40), vy: rnd(-40, 20), life: 0.6, size: 2.6, color: p.kind === 'ir' ? '#fb923c' : '#c4b5fd', drag: 2 });
        if (p.kind === 'ir') { const ang = Math.random() * TAU; PH1.push({ kind: 'ir', x: mp.x, y: mp.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, age: 0, m: null, yEnd: null, hold: 0.35 }); }
      } else if (p.vy > 0 && p.y >= I.gy) { dead = true; for (let k = 0; k < 2; k++) parts.emit({ x: p.x, y: I.gy, vx: rnd(-30, 30), vy: rnd(-50, -15), life: 0.5, size: 2.4, color: '#fb923c', drag: 2, gravity: 40 }); }
      else if (p.y < I.y - 40 || p.x < I.x - 40 || p.x > I.x + I.w + 40) dead = true;
      if (dead) PH1.splice(i, 1);
    }
  }
  const mix3 = (r, g, b) => 'rgb(' + Math.round(clamp(r, 0, 1) * 255) + ',' + Math.round(clamp(g, 0, 1) * 255) + ',' + Math.round(clamp(b, 0, 1) * 255) + ')';
  const sunColor = (e) => { const r = trans(650, e), g = trans(550, e), b = trans(450, e), mx = Math.max(r, g, b); return mix3(r / mx, g / mx, b / mx); };
  function drawPath(t, dt) {
    const { M, N } = RC1, I = pathGeo(), pr = S.proc;
    card(M, '🌤️ 대기를 지나는 태양 복사 (단면 모형)');
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    // 하늘 (우주 → 지표)
    const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#0b1d4d'); sk.addColorStop(0.18, '#1e40af'); sk.addColorStop(1, '#7dc3ff');
    ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.gy - I.y);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(I.x, I.toa); ctx.lineTo(I.x + I.w, I.toa); ctx.stroke(); ctx.setLineDash([]);
    D.text(I.x + 8, I.toa - 8, '우주', { size: 12, weight: 800, color: '#bfdbfe', align: 'left' });
    D.text(I.x + 8, I.toa + 16, '대기', { size: 12, weight: 800, color: '#e0f2fe', align: 'left' });
    drawGround(I, pr === 'reflect' ? S.surf : pr === 'scatter' ? 'forest' : 'forest', t);
    const e = pr === 'refract' ? S.elevR : S.elev;
    // 광자
    MOL1.forEach((m) => { m.glow = Math.max(0, m.glow - dt * 2.2); });
    if (pr === 'scatter') {
      const sun = sunAt(I, S.elev), mm = airmass(S.elev);
      const tb = trans(450, S.elev), tg = trans(550, S.elev), tr = trans(650, S.elev);
      // 빛줄기
      const gr = ctx.createLinearGradient(sun.x, sun.y, I.ox, I.gy); gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.35, '#fff3b0'); gr.addColorStop(1, sunColor(S.elev));
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sun.x, sun.y); ctx.lineTo(I.ox, I.gy); ctx.stroke(); ctx.strokeStyle = gr; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sun.x, sun.y); ctx.lineTo(I.ox, I.gy); ctx.stroke(); ctx.restore();
      // 산란 입자 (파랑이 가장 많이 흩어져요)
      if (!RM) {
        [['#3b82f6', 24 * (1 - tb)], ['#22c55e', 14 * (1 - tg)], ['#ef4444', 24 * (1 - tr)]].forEach((q, qi) => {
          spw['s' + qi] = (spw['s' + qi] || 0) + dt * q[1];
          while (spw['s' + qi] >= 1) { spw['s' + qi] -= 1; if (PS.length > 160) break; const u = Math.random(), px = lerp(sun.x, I.ox, u), py = lerp(sun.y, I.gy, u); if (py < I.toa) continue; const a = Math.random() * TAU; PS.push({ x: px + rnd(-4, 4), y: py + rnd(-4, 4), vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, age: 0, life: 1.0, col: q[0] }); }
        });
      }
      // 구름: 모든 파장을 고르게 산란 → 흰색
      const cl = { x: I.x + I.w * 0.2, y: I.y + I.h * 0.64 };
      ctx.save(); ctx.globalAlpha = 0.55; rayLine(sun.x, sun.y, cl.x, cl.y - 10, '#fff3b0', 3); ctx.restore();
      drawCloud(cl.x, cl.y, 1.1);
      if (!RM) { spw.cl = (spw.cl || 0) + dt * 14; while (spw.cl >= 1) { spw.cl -= 1; if (PS.length > 190) break; const a = Math.random() * TAU; PS.push({ x: cl.x + rnd(-30, 30), y: cl.y + rnd(-14, 10), vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, age: 0, life: 0.9, col: '#ffffff' }); } }
      D.label(cl.x, cl.y + 30, '구름: 모든 파장을 산란 → 흰색', { bg: 'rgba(15,23,42,.6)', size: 12, pad: 7 });
      D.glow(sun.x, sun.y, 40, '#fde047', 0.9); D.sphere(sun.x, sun.y, 15, sunColor(S.elev), { gloss: false });
      person(I.ox, I.gy);
      D.label(clamp(I.ox, I.x + 90, I.x + I.w - 90), I.gy - 40, '공기층을 지나는 길이 ' + fx(mm, 1) + '배', { bg: 'rgba(15,23,42,.65)', size: 12.5, pad: 8 });
    } else if (pr === 'reflect') {
      const a = (60 * Math.PI) / 180, gx = I.ox - 40, sun = { x: gx - 230 * Math.cos(a), y: I.gy - 230 * Math.sin(a) }, al = ALB[S.surf];
      D.glow(sun.x, sun.y, 40, '#fde047', 0.9); D.sphere(sun.x, sun.y, 15, '#facc15', { gloss: false });
      rayLine(sun.x, sun.y, gx, I.gy, '#fde047', 9);
      rayLine(gx, I.gy, gx + 230 * Math.cos(a), I.gy - 230 * Math.sin(a), '#fff7ad', Math.max(0.6, 9 * al), 0.5 + 0.5 * al);
      D.label((sun.x + gx) / 2 - 20, (sun.y + I.gy) / 2 - 8, '입사 ' + SC0 + ' W/m²', { bg: '#a16207', size: 12.5, pad: 8 });
      D.label(gx + 130, I.gy - 100, '반사 ' + Math.round(SC0 * al) + ' W/m²', { bg: '#475569', size: 12.5, pad: 8 });
      // 구름도 반사
      const cl = { x: I.x + I.w * 0.2, y: I.y + I.h * 0.34 };
      rayLine(sun.x, sun.y + 30, cl.x + 10, cl.y + 6, '#fde047', 4, 0.8);
      rayLine(cl.x + 10, cl.y + 6, cl.x + 140, cl.y - 70, '#fff7ad', 3, 0.7);
      drawCloud(cl.x, cl.y, 1.0);
      D.label(cl.x + 8, cl.y + 34, '구름 알베도 0.5~0.8', { bg: 'rgba(15,23,42,.6)', size: 12, pad: 7 });
      D.label(gx, I.gy + 26, SURF_NAME[S.surf] + ' 알베도 ' + al.toFixed(2), { bg: '#0f172a', size: 12.5, pad: 8 });
    } else if (pr === 'absorb') {
      const sun = { x: I.x + 38, y: I.y + 20 };
      D.glow(sun.x, sun.y, 40, '#fde047', 0.9); D.sphere(sun.x, sun.y, 15, '#facc15', { gloss: false });
      ctx.fillStyle = 'rgba(167,139,250,.18)'; const L1 = layerY(I, 'o3'); ctx.fillRect(I.x, L1[0], I.w, L1[1] - L1[0]);
      ctx.fillStyle = 'rgba(56,189,248,.14)'; const L2 = layerY(I, 'low'); ctx.fillRect(I.x, L2[0], I.w, L2[1] - L2[0]);
      MOL1.forEach((m) => { const p = molXY(I, m); molSmall(m.k, p.x, p.y + Math.sin(t * 1.5 + m.fx * 9) * 2, 0.95, m.glow); });
      D.label(I.x + I.w - 8, L1[0] + 12, '오존층 (자외선 흡수)', { bg: '#7c3aed', size: 12, pad: 7, align: 'right' });
      D.label(I.x + I.w - 8, L2[0] + 12, '수증기·CO₂ (적외선 흡수)', { bg: '#0369a1', size: 12, pad: 7, align: 'right' });
      stepAbsorb(I, dt, sun); PH1.forEach((p) => { if (!(p.hold > 0)) drawPhoton1(p); });
    } else {
      // 굴절 (각도는 보기 좋게 과장)
      const Hs = 100, eD = 14 + 3 * e, aT = eD, aA = eD + (12 * refrR(e)) / 0.5, ar = (x) => (x * Math.PI) / 180;
      const ox = I.x + I.w * 0.9, N0 = 16, pts = [[ox, I.gy]];
      for (let i = 1; i <= N0; i++) { const f = i / N0, ang = aA - (aA - aT) * Math.pow(f, 1.6), prev = pts[i - 1], dy = Hs / N0; pts.push([prev[0] - dy / Math.tan(ar(ang)), I.gy - f * Hs]); }
      for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(30,64,175,' + (0.05 + 0.07 * (1 - i / 7)).toFixed(3) + ')'; ctx.fillRect(I.x, I.gy - (i + 1) * (Hs / 7), I.w, Hs / 7 - 1); }
      D.text(I.x + 8, I.gy - Hs - 8, '대기의 아래쪽 (위쪽은 공기가 옅고 아래쪽은 촘촘해요)', { size: 12, weight: 800, color: '#e0f2fe', align: 'left' });
      const top = pts[N0], dd = 80, sunT = { x: top[0] - Math.cos(ar(aT)) * dd, y: top[1] - Math.sin(ar(aT)) * dd };
      const dA = Math.hypot(sunT.x - ox, sunT.y - I.gy), sunA = { x: ox - Math.cos(ar(aA)) * dA, y: I.gy - Math.sin(ar(aA)) * dA };
      ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sunT.x, sunT.y); pts.slice().reverse().forEach((p) => ctx.lineTo(p[0], p[1])); ctx.stroke(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      D.dashedLine(ox, I.gy, sunA.x, sunA.y, { color: '#fff', width: 2 });
      ctx.save(); ctx.globalAlpha = 0.5; D.sphere(sunT.x, sunT.y, 14, '#facc15', { gloss: false }); ctx.restore(); D.glow(sunA.x, sunA.y, 36, '#fde047', 0.8); D.sphere(sunA.x, sunA.y, 14, '#facc15', { gloss: false });
      D.label(sunT.x + 4, sunT.y + 26, '실제 위치', { bg: 'rgba(15,23,42,.65)', size: 12.5, pad: 8, align: 'left' });
      D.label(sunA.x - 4, sunA.y - 26, '보이는 위치', { bg: '#b45309', size: 12.5, pad: 8, align: 'left' });
      person(ox, I.gy);
      D.text(I.x + I.w - 8, I.toa + 22, '(각도는 크게 과장한 그림)', { size: 12, weight: 800, color: '#bfdbfe', align: 'right' });
    }
    // 산란 입자 그리기
    for (let i = PS.length - 1; i >= 0; i--) { const p = PS[i]; p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.age >= p.life || pr !== 'scatter') { PS.splice(i, 1); continue; } ctx.globalAlpha = 1 - p.age / p.life; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (pr !== 'absorb') PH1.length = 0;
    ctx.restore();

    // 아래 설명 판
    card(N, ({ scatter: '🔵 산란: 파장이 짧을수록 더 많이 흩어져요', reflect: '🪞 반사: 입사량 × 알베도', absorb: '🔥 흡수: 기체마다 흡수하는 빛이 달라요', refract: '🌅 굴절: 밀도가 다른 공기층을 지나며 빛이 휘어요' })[pr]);
    const nx = N.x + 16, ny = N.y + 40, nw = N.w - 32;
    if (pr === 'scatter') {
      const bw = nw * (PHONE ? 0.95 : 0.5) - 90;
      [['파랑 450 nm', sRel(450), '#3b82f6'], ['초록 550 nm', sRel(550), '#22c55e'], ['빨강 650 nm', sRel(650), '#ef4444']].forEach((q, i) => {
        const y = ny + i * (PHONE ? 30 : 36); D.text(nx, y + 14, q[0], { size: 13, weight: 800, color: '#334155', align: 'left' });
        ctx.fillStyle = '#eef2f7'; rr(nx + 98, y, bw, 22, 6).fill(); ctx.fillStyle = q[2]; rr(nx + 98, y, (bw * q[1]) / sRel(450), 22, 6).fill();
      });
      D.text(nx, ny + 3 * (PHONE ? 30 : 36) + 10, '산란 세기 ∝ 1 / λ⁴ (막대 길이는 같은 눈금)', { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
      const sx = PHONE ? nx + 20 : nx + nw * 0.5, sy = PHONE ? ny + 3 * 30 + 56 : ny + 20;
      ctx.fillStyle = sunColor(S.elev); ctx.beginPath(); ctx.arc(sx + 20, sy + 30, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = mix3(0.25 + 0.2 * (1 - trans(650, 90)) * 3, 0.55 + 0.25 * (1 - trans(550, 90)), 0.95); ctx.beginPath(); ctx.arc(sx + 120, sy + 30, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
      D.text(sx + 20, sy + 76, '태양 빛 색', { size: 12.5, weight: 800, color: '#475569' }); D.text(sx + 120, sy + 76, '맑은 낮 하늘색', { size: 12.5, weight: 800, color: '#475569' });
      if (!PHONE) drawWrap(N.x + N.w - 16 - 200, sy + 14, S.elev < 25 ? '고도가 낮으면 빛이 지나는 공기층이 길어 푸른빛이 거의 흩어져 사라지고 붉은빛이 남아 석양이 붉어요.' : '푸른빛이 사방으로 흩어져 하늘이 파랗게 보이고, 직접 오는 태양 빛은 노랗게 보여요.', 200, 12.5, { color: '#334155', align: 'left' });
    } else if (pr === 'reflect') {
      const rows = [['바다', 0.06, 0.06, 'sea'], ['숲', 0.15, 0.15, 'forest'], ['사막', 0.30, 0.30, 'desert'], ['구름', 0.5, 0.8, null], ['눈', 0.8, 0.9, 'snow']];
      const bw = nw * (PHONE ? 0.8 : 0.52) - 70, rh = PHONE ? 26 : 25;
      rows.forEach((q, i) => {
        const y = ny + i * (rh + 3), sel = q[3] === S.surf;
        D.text(nx, y + 17, q[0], { size: 13, weight: 800, color: sel ? '#b91c1c' : '#334155', align: 'left' });
        ctx.fillStyle = '#eef2f7'; rr(nx + 52, y + 2, bw, rh - 6, 5).fill();
        ctx.fillStyle = sel ? '#dc2626' : '#64748b'; rr(nx + 52, y + 2, bw * q[1], rh - 6, 5).fill();
        if (q[2] > q[1]) { ctx.fillStyle = 'rgba(100,116,139,.4)'; ctx.fillRect(nx + 52 + bw * q[1], y + 2, bw * (q[2] - q[1]), rh - 6); }
        D.text(nx + 58 + bw, y + 17, q[1] === q[2] ? q[1].toFixed(2) : q[1].toFixed(1) + '~' + q[2].toFixed(1), { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      });
      const al = ALB[S.surf], rf = Math.round(SC0 * al);
      const tx = PHONE ? nx : nx + nw * 0.62, ty = PHONE ? ny + 5 * (rh + 3) + 12 : ny + 14;
      D.text(tx, ty + 6, SURF_NAME[S.surf] + ' 위: 반사량 = 입사량 × 알베도', { size: 13, weight: 800, color: '#0369a1', align: 'left' });
      D.text(tx, ty + 32, SC0 + ' W/m² × ' + al.toFixed(2) + ' = ' + rf + ' W/m²', { size: 17, weight: 800, color: '#b91c1c', align: 'left' });
      D.text(tx, ty + 58, '지표가 흡수: ' + (SC0 - rf) + ' W/m²', { size: 13, weight: 800, color: '#334155', align: 'left' });
    } else if (pr === 'absorb') {
      const cols = [['#7c3aed', '자외선', '오존(O₃)·산소(O₂)가 흡수 → 성층권에서 차단'], ['#f59e0b', '가시광선', '대부분 지나가 지표에 닿아요'], ['#dc2626', '적외선', '수증기·CO₂가 흡수 → 일부는 다시 방출 (지표 쪽으로도)']];
      cols.forEach((q, i) => { const y = ny + i * (PHONE ? 52 : 38); ctx.fillStyle = q[0]; rr(nx, y, 12, 28, 4).fill(); D.text(nx + 22, y + 13, q[1], { size: 14, weight: 800, color: q[0], align: 'left' }); drawWrap(nx + 22 + (PHONE ? 0 : 74), y + (PHONE ? 30 : 13), q[2], nw - (PHONE ? 30 : 100), 12.5, { color: '#334155', align: 'left' }); });
    } else {
      const R0 = refrR(S.elevR);
      D.text(nx, ny + 10, '실제 고도 ' + fx(S.elevR, 1) + '° → 보이는 고도 ' + fx(S.elevR + R0, 2) + '° (굴절각 ' + fx(R0, 2) + '°)', { size: 14, weight: 800, color: '#b91c1c', align: 'left' });
      drawWrap(nx + nw / 2, ny + 36, '지평선 근처에서 빛이 가장 많이 휘어서 태양이 실제보다 약 0.5° 높게 보여요. 그래서 해가 일찍 뜨고 늦게 져서 낮이 수 분 길어져요. (그림의 각도는 크게 과장했어요)', nw, 13, { color: '#334155' });
    }
  }

  /* ======================================================
     장면 2: 전 지구 평균 열수지 채우기 (W/m²)
     ====================================================== */
  const RC2 = PHONE
    ? { D: { x: 8, y: 8, w: 504, h: 456 }, P: { x: 8, y: 472, w: 504, h: 240 } }
    : { D: { x: 12, y: 12, w: 776, h: 388 }, P: { x: 12, y: 408, w: 776, h: 140 } };
  const BL = ['ref', 'atm', 'srf', 'emit', 'back', 'lat', 'sen', 'space'];
  const BANS = { ref: 100, atm: 80, srf: 160, emit: 400, back: 340, lat: 80, sen: 20, space: 240 };
  const BNAME = { ref: '반사', atm: '대기 흡수', srf: '지표 흡수', emit: '지표 복사', back: '대기 역복사', lat: '잠열', sen: '현열', space: '우주로' };
  const BANK = [160, 80, 400, 20, 100, 340, 80, 240].map((v) => ({ v }));
  function bdGeo() {
    const D0 = RC2.D, d = { x: D0.x + 10, y: D0.y + 36, w: D0.w - 20, h: D0.h - 46 };
    d.toa = d.y + d.h * 0.2; d.bt = d.y + d.h * 0.4; d.bb = d.y + d.h * 0.64; d.sf = d.y + d.h * 0.84;
    d.X = (f) => d.x + d.w * f;
    return d;
  }
  // 화살표 정의: x 위치(비율), 시작·끝 y, 값
  function arrowsDef(d) {
    return {
      inc: { fx: 0.06, y0: d.y + 8, y1: d.toa, v: 340, given: true },
      ref: { fx: 0.14, y0: d.toa, y1: d.y + 8, v: 100 },
      srf: { fx: 0.22, y0: d.toa, y1: d.sf, v: 160 },
      atm: { fx: 0.37, y0: d.toa, y1: d.bt + 8, v: 80 },
      emit: { fx: 0.46, y0: d.sf, y1: d.bb, v: 400 },
      win: { fx: 0.53, y0: d.sf, y1: d.y + 62, v: 40, given: true },
      out: { fx: 0.61, y0: d.bt, y1: d.y + 62, v: 200, given: true },
      back: { fx: 0.71, y0: d.bb, y1: d.sf, v: 340 },
      lat: { fx: 0.81, y0: d.sf, y1: d.bb, v: 80 },
      sen: { fx: 0.91, y0: d.sf, y1: d.bb, v: 20 },
    };
  }
  const blankRect = (d, A, id) => {
    const w = 52, h = 28;
    if (id === 'space') return { x: d.X(0.57) - w / 2 - 2, y: d.y + 28, w: w + 10, h };
    const a = A[id], x = d.X(a.fx);
    let y;
    if (id === 'ref') y = (d.toa + d.y + 8) / 2 - 2;
    else if (id === 'srf') y = d.toa + 48;
    else if (id === 'atm') y = d.toa + 12;
    else if (id === 'emit') y = d.bb + 40;
    else if (id === 'back') y = d.bb + 44;
    else if (id === 'lat') y = d.bb + 78;
    else y = d.bb + 40;
    return { x: x + 5, y, w, h };
  };
  const valOf = (id) => (S.fill[id] != null ? BANK[S.fill[id]].v : null);
  const firstEmpty = () => BL.find((id) => S.fill[id] == null);
  function fillWith(ci) {
    if (S.used[ci]) return;
    let id = S.sel && S.fill[S.sel] == null ? S.sel : firstEmpty();
    if (!id) return;
    S.fill[id] = ci; S.used[ci] = id; S.wrongIds = []; S.pop = S.pop || {}; S.pop[id] = 1;
    S.sel = firstEmpty() || null; syncBank();
  }
  function clearBlank(id) { const ci = S.fill[id]; if (ci == null) return; delete S.fill[id]; delete S.used[ci]; S.wrongIds = []; syncBank(); }
  function clearAllFill() { S.fill = {}; S.used = {}; S.sel = 'ref'; S.wrongIds = []; syncBank(); }
  function bdSums() {
    const v = valOf, S1 = (a) => (a.every((x) => x != null) ? a.reduce((s, x) => s + x, 0) : null);
    const e = v('emit');
    const rows = [
      { t: '🌌 우주 (대기 꼭대기)', inn: [340], innS: ['340'], out: [v('ref'), v('space')], outS: [fq(v('ref')), fq(v('space'))] },
      { t: '🌫️ 대기', inn: [v('atm'), e == null ? null : e - 40, v('lat'), v('sen')], innS: [fq(v('atm')), e == null ? '?' : String(e - 40), fq(v('lat')), fq(v('sen'))], out: [200, v('back')], outS: ['200', fq(v('back'))] },
      { t: '🌍 지표', inn: [v('srf'), v('back')], innS: [fq(v('srf')), fq(v('back'))], out: [e, v('lat'), v('sen')], outS: [fq(e), fq(v('lat')), fq(v('sen'))] },
    ];
    rows.forEach((r) => { r.a = S1(r.inn); r.b = S1(r.out); r.ok = r.a != null && r.b != null && r.a === r.b; r.bad = r.a != null && r.b != null && r.a !== r.b; });
    return rows;
  }
  const fq = (x) => (x == null ? '?' : String(x));
  function drawBudget(t, dt) {
    const { D: DD, P } = RC2, d = bdGeo(), A = arrowsDef(d);
    S.pop = S.pop || {};
    card(DD, '🌐 전 지구 평균 열수지 (W/m², 예시) — 빈칸(❔)을 채워요');
    ctx.save(); rr(d.x, d.y, d.w, d.h, 12).clip();
    const sp = ctx.createLinearGradient(0, d.y, 0, d.toa); sp.addColorStop(0, '#0b1020'); sp.addColorStop(1, '#1e3a8a'); ctx.fillStyle = sp; ctx.fillRect(d.x, d.y, d.w, d.toa - d.y);
    const sk = ctx.createLinearGradient(0, d.toa, 0, d.sf); sk.addColorStop(0, '#60a5fa'); sk.addColorStop(1, '#dbeafe'); ctx.fillStyle = sk; ctx.fillRect(d.x, d.toa, d.w, d.sf - d.toa);
    // 대기 상자
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(d.X(0.3), d.bt, d.w * 0.69, d.bb - d.bt, 12).fill(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); rr(d.X(0.3), d.bt, d.w * 0.69, d.bb - d.bt, 12).stroke(); ctx.setLineDash([]);
    D.text(d.X(0.3) + 12, d.bb - 10, '대기 (구름·수증기·온실 기체)', { size: 12.5, weight: 800, color: '#1d4ed8', align: 'left' });
    drawCloud(d.X(0.45), d.bt + 32, 0.55, 0.9);
    // 지표
    const sg = ctx.createLinearGradient(0, d.sf, 0, d.y + d.h); sg.addColorStop(0, '#4d7c0f'); sg.addColorStop(1, '#78350f'); ctx.fillStyle = sg; ctx.fillRect(d.x, d.sf, d.w, d.y + d.h - d.sf);
    D.text(d.x + 10, d.sf + 22, '지표', { size: 13, weight: 800, color: '#fff', align: 'left' });
    D.text(d.x + 10, d.toa - 8, '우주 ↑', { size: 12, weight: 800, color: '#bfdbfe', align: 'left' });
    // 화살표
    const colOf = { inc: '#facc15', ref: '#fff', srf: '#fde047', atm: '#fbbf24', emit: '#f43f5e', win: '#fb7185', out: '#fb7185', back: '#f97316', lat: '#38bdf8', sen: '#f97316' };
    Object.keys(A).forEach((k) => {
      const a = A[k], x = d.X(a.fx), w = 2.5 + a.v * 0.028, hd = Math.max(10, w * 1.6);
      const sh = a.y1 < a.y0 ? 0 : 0;
      D.arrow(x, a.y0, x, a.y1, { color: colOf[k], width: w, head: hd, alpha: 0.95 });
    });
    // 흐르는 점 (움직임)
    if (!RM) Object.keys(A).forEach((k, i) => { const a = A[k], x = d.X(a.fx), u = (t * 0.35 + i * 0.13) % 1; D.sphere(x, a.y0 + (a.y1 - a.y0) * u, 2.8, '#fff', { gloss: false }); });
    ctx.restore();
    // 이름표 · 주어진 값 · 빈칸
    const NM = { inc: ['입사', '태양'], ref: ['반사'], srf: ['지표', '흡수'], atm: ['대기', '흡수'], emit: ['지표', '복사'], win: ['대기창'], out: ['대기', '방출'], back: ['대기', '역복사'], lat: ['잠열'], sen: ['현열'] };
    Object.keys(A).forEach((k) => {
      const a = A[k], x = d.X(a.fx);
      if (a.given) {
        const y = k === 'inc' ? (a.y0 + a.y1) / 2 + 2 : k === 'win' ? d.toa + 4 : d.toa + 6;
        const rx = k === 'inc' ? x + 10 : x + 8;
        D.label(rx, y, a.v + '', { bg: '#0f172a', size: 13, pad: 7, align: 'left' });
        NM[k].forEach((s, i) => D.text(rx + 3, y + 22 + i * 14 * FS * 0.85, s, { size: 11.5, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(15,23,42,.55)', strokeWidth: 3 }));
      }
    });
    D.label(d.X(0.14) + 28, d.toa + 14, '77 + 23', { bg: 'rgba(15,23,42,.72)', size: 11.5, pad: 6 });
    D.text(d.X(0.14) + 28, d.toa + 34, '구름·대기 + 지표', { size: 10.5, weight: 800, color: '#0f172a', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });

    // 합계 확인
    card(P, '⚖️ 합계 확인: 들어오는 에너지 = 나가는 에너지');
    const rows = bdSums();
    const cw = PHONE ? P.w - 28 : (P.w - 44) / 3, chh = PHONE ? 62 : 84;
    rows.forEach((r, i) => {
      const x = P.x + 14 + (PHONE ? 0 : i * (cw + 8)), y = P.y + 38 + (PHONE ? i * (chh + 6) : 0);
      ctx.fillStyle = r.ok ? 'rgba(34,197,94,.14)' : r.bad ? 'rgba(220,38,38,.1)' : '#f1f5f9'; rr(x, y, cw, chh, 10).fill();
      ctx.strokeStyle = r.ok ? '#16a34a' : r.bad ? '#dc2626' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, y, cw, chh, 10).stroke();
      D.text(x + 10, y + 18, r.t + '  ' + (r.ok ? '✅ 균형' : r.bad ? '❌ 맞지 않아요' : '⬜'), { size: 12.5, weight: 800, color: r.ok ? '#15803d' : r.bad ? '#b91c1c' : '#475569', align: 'left' });
      D.text(x + 10, y + 18 + 20 * FS * 0.9, '들어옴 ' + r.innS.join(' + ') + ' = ' + fq(r.a), { size: 12.5, weight: 700, color: '#334155', align: 'left' });
      D.text(x + 10, y + 18 + 40 * FS * 0.9, '나감 ' + r.outS.join(' + ') + ' = ' + fq(r.b), { size: 12.5, weight: 700, color: '#334155', align: 'left' });
    });
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'budget' && game && (game.has('budget') || game.free)) {
        const d = bdGeo(), A = arrowsDef(d);
        for (const id of BL) { const R = blankRect(d, A, id); if (p.x >= R.x - 4 && p.x <= R.x + R.w + 4 && p.y >= R.y - 4 && p.y <= R.y + R.h + 4) { Sound.click(); if (S.fill[id] != null) { clearBlank(id); S.sel = id; } else S.sel = S.sel === id ? null : id; S.wrongIds = []; return false; } }
      }
      return false;
    },
    hover(p) {
      if (S.mode === 'budget' && game && (game.has('budget') || game.free)) { const d = bdGeo(), A = arrowsDef(d); for (const id of BL) { const R = blankRect(d, A, id); if (p.x >= R.x - 4 && p.x <= R.x + R.w + 4 && p.y >= R.y - 4 && p.y <= R.y + R.h + 4) return 'pointer'; } }
      return '';
    },
  });
  function syncBank() {
    $$('#numBank .opt').forEach((b) => { const ci = +b.dataset.ci; b.disabled = S.used[ci] != null; b.classList.toggle('on', S.used[ci] != null); });
  }

  /* ======================================================
     장면 3: 잠열
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 300 }, B: { x: 8, y: 316, w: 504, h: 196 }, C: { x: 8, y: 520, w: 504, h: 192 } }
    : { A: { x: 12, y: 12, w: 380, h: 536 }, B: { x: 400, y: 12, w: 388, h: 268 }, C: { x: 400, y: 288, w: 388, h: 260 } };
  const LV = 2.5e6;
  const evapDay = (q) => (q / LV) * 86400;
  const VAP = [];
  let vapSp = 0, heatCloud = 0;
  const lbars = { rad: 0, sen: 0, lat: 0 };
  function drawLatent(t, dt) {
    const { A, B, C } = RC3;
    card(A, '☁️ 증발할 때 저장한 열이 응결할 때 나와요');
    const I = { x: A.x + 10, y: A.y + 36, w: A.w - 20, h: A.h - 46 };
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.y + I.h); sk.addColorStop(0, '#60a5fa'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    const sea = I.y + I.h * 0.78, cloud = { x: I.x + I.w * 0.58, y: I.y + I.h * 0.2 }, cbase = cloud.y + 26;
    const sg = ctx.createLinearGradient(0, sea, 0, I.y + I.h); sg.addColorStop(0, '#38bdf8'); sg.addColorStop(1, '#0369a1'); ctx.fillStyle = sg; ctx.fillRect(I.x, sea, I.w, I.y + I.h - sea);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let x = I.x; x <= I.x + I.w; x += 4) { const y = sea + 6 + k * 14 + Math.sin(x / 14 + t * 1.6 + k) * 2.2; x === I.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    D.glow(I.x + 36, I.y + 36, 56, '#fde047', 0.8); D.sphere(I.x + 36, I.y + 36, 18, '#facc15', { gloss: false });
    heatCloud = Math.max(0, heatCloud - dt * 0.5);
    D.glow(cloud.x, cloud.y + 10, 110, '#fb923c', clamp(0.1 + heatCloud * 0.55, 0, 0.7));
    drawCloud(cloud.x, cloud.y, 1.7);
    // 수증기
    const rate = (S.q / 80) * 3.2;
    if (!RM) { vapSp += dt * rate; while (vapSp >= 1) { vapSp -= 1; if (VAP.length < 60) VAP.push({ x: I.x + 30 + Math.random() * (I.w - 60), y: sea, vx: rnd(-6, 6), ph: Math.random() * 6, drop: false, age: 0 }); } }
    else if (!VAP.length && S.q > 0) for (let k = 0; k < 8; k++) VAP.push({ x: I.x + 40 + k * ((I.w - 80) / 7), y: sea - 20 - (k % 4) * 60, vx: 0, ph: k, drop: false, age: 0 });
    for (let i = VAP.length - 1; i >= 0; i--) {
      const p = VAP[i]; p.age += dt;
      if (!p.drop) {
        p.y -= 46 * dt; p.x += Math.sin(p.age * 2 + p.ph) * 14 * dt + p.vx * dt;
        if (p.x > cloud.x - 70 && p.x < cloud.x + 70 && p.y < cbase + 6) { p.drop = true; p.age = 0; heatCloud = Math.min(1, heatCloud + 0.09); for (let k = 0; k < 4; k++) { const a = Math.random() * TAU; parts.emit({ x: p.x, y: p.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 10, life: 0.9, size: 3.4, color: '#fb923c', drag: 1.4 }); } }
        else if (p.y < I.y + 6) { VAP.splice(i, 1); continue; }
      } else { p.y += 26 * dt; if (p.age > 1.4) { VAP.splice(i, 1); continue; } }
    }
    VAP.forEach((p) => {
      if (!p.drop) { D.glow(p.x, p.y, 14, '#fb923c', 0.75); D.sphere(p.x, p.y, 5, '#bae6fd', { gloss: false }); }
      else { ctx.globalAlpha = Math.max(0, 1 - p.age / 1.4); D.sphere(p.x, p.y, 4.4, '#ffffff', { gloss: false }); ctx.globalAlpha = 1; }
    });
    if (!RM && S.q > 0 && Math.random() < dt * rate * 1.2) parts.emit({ x: I.x + 30 + Math.random() * (I.w - 60), y: sea + 2, vx: rnd(-12, 12), vy: rnd(-50, -26), life: 0.4, size: 2.8, color: '#fdba74', drag: 2 });
    ctx.restore();
    D.label(I.x + 8, sea + 26, '증발: 열을 흡수해 수증기 속에 저장', { bg: '#0369a1', size: 12.5, pad: 8, align: 'left' });
    D.label(I.x + I.w - 8, I.y + I.h * 0.2 + 52, '응결: 열을 방출 → 구름 안 공기가 데워져요', { bg: '#c2410c', size: 12.5, pad: 8, align: 'right' });
    D.text(I.x + I.w / 2, I.y + I.h - 8, '주황색 빛 = 수증기가 가진 잠열', { size: 12, weight: 800, color: '#fff', stroke: 'rgba(3,105,161,.6)', strokeWidth: 3 });

    // 막대 비교
    card(B, '📊 지표에서 대기로 옮겨 가는 열 (W/m²)');
    const pb = { x: B.x + 50, y: B.y + 46, w: B.w - 70, h: B.h - 46 - 62 }, vals = [['순 복사', 60, '#64748b', '400 − 340'], ['현열', 20, '#f97316', ''], ['잠열', 80, '#0ea5e9', '']];
    const keys = ['rad', 'sen', 'lat'];
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 20, 40, 60, 80, 100].forEach((v) => { const y = pb.y + pb.h - (pb.h * v) / 100; ctx.beginPath(); ctx.moveTo(pb.x, y); ctx.lineTo(pb.x + pb.w, y); ctx.stroke(); D.text(pb.x - 6, y + 4.5, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    const bw2 = pb.w / 3;
    vals.forEach((q, i) => {
      lbars[keys[i]] = approach(lbars[keys[i]], q[1], dt, 5); const v = lbars[keys[i]], h = (pb.h * clamp(v, 0, 100)) / 100, x = pb.x + i * bw2 + bw2 * 0.2, w = bw2 * 0.6;
      ctx.fillStyle = q[2]; rr(x, pb.y + pb.h - h, w, h, Math.min(6, h / 2)).fill();
      D.text(x + w / 2, pb.y + pb.h - h - 6, String(Math.round(v)), { size: 14, weight: 800, color: '#0f172a' });
      D.text(x + w / 2, pb.y + pb.h + 16 * FS, q[0], { size: 13, weight: 800, color: '#334155' });
      if (q[3]) D.text(x + w / 2, pb.y + pb.h + 32 * FS, '(' + q[3] + ')', { size: 11, weight: 700, color: '#64748b' });
    });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    drawWrap(B.x + B.w / 2, B.y + B.h - 10, '합계 60 + 20 + 80 = 160 = 지표 흡수. 비복사 열 이동 중 잠열이 가장 커요 (현열의 4배)', B.w - 20, 12, { color: '#0369a1', weight: 800 });

    // 증발량 계산
    card(C, '🧮 잠열 → 증발량');
    const mq = S.q / LV, day = evapDay(S.q), yr = day * 365, tx = C.x + 16;
    const rl = (k, tgt) => roll(k, tgt, dt, 8);
    D.text(tx, C.y + 56, 'Q = ' + S.q + ' W/m²  (L = 2.5×10⁶ J/kg)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(tx, C.y + 56 + 28 * FS * 0.85, 'm = Q / L = ' + (mq * 1e5).toFixed(1) + '×10⁻⁵ kg/(m²·s)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(tx, C.y + 56 + 56 * FS * 0.85, '1일(86400 s) 동안 = ' + (S.q === 0 ? '0.0' : evapDay(S.q).toFixed(1)) + ' mm/일', { size: 15.5, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(tx, C.y + 56 + 84 * FS * 0.85, '1년 동안 ≈ ' + (S.q === 0 ? '0' : String(Math.round(yr / 10) * 10)) + ' mm/년', { size: 15.5, weight: 800, color: '#0369a1', align: 'left' });
    drawWrap(C.x + C.w / 2, C.y + C.h - (PHONE ? 38 : 50), '전 지구 평균 강수량은 약 1000 mm/년 → 증발한 물은 모두 비로 돌아와요. (1 kg/m² = 1 mm)', C.w - 24, 12.5, { color: '#475569', weight: 800 });
  }

  /* ======================================================
     장면 4: 온난화 모의
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 340 }, B: { x: 8, y: 356, w: 504, h: 232 }, C: { x: 8, y: 596, w: 504, h: 116 } }
    : { A: { x: 12, y: 12, w: 380, h: 536 }, B: { x: 400, y: 12, w: 388, h: 328 }, C: { x: 400, y: 348, w: 388, h: 200 } };
  const SIN = 240, LAM0 = 3.76, FBK = 2.0, CAPY = 8, YR_PER_S = 2;
  const forcing = (c) => 5.35 * Math.log(c / 280);
  const lamEff = () => LAM0 - (S.fb ? FBK : 0);
  const warmN = () => forcing(S.co2) - lamEff() * S.dT;
  const warmOut = () => SIN - forcing(S.co2) + lamEff() * S.dT;
  const atEq = () => forcing(S.co2) > 0.2 && Math.abs(warmN()) < 0.05;
  const nSp = new SciSim.Spring(0, { stiffness: 90, damping: 14 });
  const tSp = new SciSim.Spring(0, { stiffness: 60, damping: 11 });
  let histAcc = 0;
  function stepWarm(dt) {
    let rem = dt * YR_PER_S;
    while (rem > 1e-6) { const h = Math.min(0.05, rem); S.dT += (warmN() / CAPY) * h; S.tY += h; rem -= h; histAcc += h; if (histAcc >= 0.25) { histAcc = 0; S.hist.push([S.tY, S.dT, warmN()]); if (S.hist.length > 400) S.hist.shift(); } }
    if (atEq()) { S.eqSeen = true; S.eqKey = S.co2 + '|' + (S.fb ? 1 : 0); }
  }
  function resetWarm() { S.dT = 0; S.tY = 0; S.hist = []; histAcc = 0; S.eqSeen = false; S.eqKey = null; tSp.value = tSp.target = 0; nSp.value = nSp.target = 0; }
  function drawWarm(t, dt) {
    const { A, B, C } = RC4;
    if (!game || game.phase !== 'intro') stepWarm(dt);
    const F = forcing(S.co2), N = warmN(), OUT = warmOut();
    nSp.target = N; nSp.update(dt); tSp.target = S.dT; tSp.update(dt);
    card(A, '🔥 들어오는 복사 = 나가는 복사?');
    const I = { x: A.x + 10, y: A.y + 36, w: A.w - 20, h: A.h - 46 };
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.y + I.h); sk.addColorStop(0, '#0b1d4d'); sk.addColorStop(0.5, '#3b82f6'); sk.addColorStop(1, '#bfdbfe'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    const gy = I.y + I.h - 40, g = ctx.createLinearGradient(0, gy, 0, I.y + I.h); g.addColorStop(0, '#4d7c0f'); g.addColorStop(1, '#78350f'); ctx.fillStyle = g; ctx.fillRect(I.x, gy, I.w, 40);
    // CO2 입자 (농도에 비례)
    const nco = Math.round(8 + ((S.co2 - 280) / 280) * 22), rn = seeded(5);
    for (let k = 0; k < 40; k++) { const fx = rn(), fy = rn(); if (k >= nco) continue; const x = I.x + I.w * 0.5 + fx * (I.w * 0.5 - 34), y = I.y + I.h * 0.5 + fy * (gy - I.y - I.h * 0.5 - 22) + Math.sin(t * 1.4 + k) * 2.5; drawMolW(x, y); }
    // 화살표
    const ax1 = I.x + I.w * 0.2, ax2 = I.x + I.w * 0.5, wIn = 2 + SIN * 0.06, wOut = 2 + OUT * 0.06;
    D.arrow(ax1, I.y + 14, ax1, I.y + I.h * 0.33, { color: '#facc15', width: wIn, head: wIn * 1.4 });
    D.arrow(ax2, I.y + I.h * 0.33, ax2, I.y + 14, { color: '#fb7185', width: wOut, head: wOut * 1.4 });
    ctx.restore();
    D.label(ax1 + 10, I.y + 22, '들어옴 ' + fx(SIN, 1), { bg: '#a16207', size: 12.5, pad: 7, align: 'left' });
    D.label(ax2 + 10, I.y + 22, '나감 ' + fx(OUT, 1), { bg: '#be123c', size: 12.5, pad: 7, align: 'left' });
    D.text(I.x + 12, I.y + I.h * 0.33 + 18, '단위: W/m²', { size: 12, weight: 800, color: '#e0f2fe', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    // 불균형 막대
    const bx = I.x + I.w - 80, by0 = I.y + 56, bh = I.h * 0.34;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(bx, by0, 28, bh, 8).fill(); const nh = (bh * clamp(nSp.value, 0, 4)) / 4;
    ctx.fillStyle = '#ef4444'; if (nh > 0.5) rr(bx, by0 + bh - nh, 28, nh, Math.min(8, nh / 2)).fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; rr(bx, by0, 28, bh, 8).stroke();
    [0, 1, 2, 3, 4].forEach((v) => { const y = by0 + bh - (bh * v) / 4; ctx.fillStyle = '#94a3b8'; ctx.fillRect(bx + 28, y - 0.7, 5, 1.4); D.text(bx + 36, y + 4, String(v), { size: 11, weight: 700, color: '#e2e8f0', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 }); });
    D.text(bx + 14, by0 - 22, '불균형 N', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    D.label(bx + 14, by0 - 6, fx(N, 1) + ' W/m²', { bg: '#dc2626', size: 12.5, pad: 6 });
    // 온도계
    const tx = I.x + I.w * 0.22, ty = I.y + I.h * 0.5, th = I.h * 0.3;
    const Tabs = 288 + tSp.value, Yt = (k) => ty + th - (th * clamp((k - 287) / 5, 0, 1));
    ctx.fillStyle = '#fff'; rr(tx - 12, ty - 4, 24, th + 8, 12).fill(); const fl = ctx.createLinearGradient(0, Yt(Tabs), 0, ty + th); fl.addColorStop(0, '#f97316'); fl.addColorStop(1, '#dc2626'); ctx.fillStyle = fl; rr(tx - 6, Yt(Tabs), 12, ty + th - Yt(Tabs) + 2, 5).fill();
    [287, 288, 289, 290, 291, 292].forEach((k) => { ctx.fillStyle = '#64748b'; ctx.fillRect(tx + 12, Yt(k) - 0.7, 5, 1.4); D.text(tx + 20, Yt(k) + 4, String(k), { size: 11, weight: 700, color: '#e2e8f0', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 }); });
    D.text(tx + 12, ty - 14, '지표 평균 기온 (K)', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    D.label(tx - 22, ty + th + 24, fx(Tabs, 1) + ' K (' + fx(Tabs - 273, 1) + ' °C)', { bg: '#dc2626', size: 12.5, pad: 7, align: 'left' });
    // 상태 문구
    const eq = atEq();
    D.label(I.x + I.w / 2, I.y + I.h - 20, F < 0.2 ? '지금은 평형 상태 (CO₂ 280 ppm)' : eq ? '새 평형: 들어옴 = 나감' : '나감 < 들어옴 → 지표가 데워져요', { bg: eq ? '#15803d' : F < 0.2 ? '#475569' : '#b45309', size: 13, pad: 10 });
    // 시간 그래프
    card(B, '📈 지표 온도 변화 ΔT와 불균형 N  (모의 시간 ' + fx(S.tY, 0) + '년)');
    const pb = { x: B.x + 48, y: B.y + 44, w: B.w - 48 - 48, h: B.h - 44 - (PHONE ? 40 : 46) };
    const tEnd = Math.max(40, S.tY), tStart = tEnd - 40, X = (y) => pb.x + (pb.w * (y - tStart)) / 40, YT = (v) => pb.y + pb.h - (pb.h * clamp(v, 0, 3)) / 3, YN = (v) => pb.y + pb.h - (pb.h * clamp(v, 0, 4)) / 4;
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 1, 2, 3].forEach((v) => { const y = YT(v); ctx.beginPath(); ctx.moveTo(pb.x, y); ctx.lineTo(pb.x + pb.w, y); ctx.stroke(); D.text(pb.x - 6, y + 4.5, String(v), { size: 12, weight: 700, color: '#dc2626', align: 'right' }); });
    [0, 1, 2, 3, 4].forEach((v) => D.text(pb.x + pb.w + 6, YN(v) + 4.5, String(v), { size: 12, weight: 700, color: '#2563eb', align: 'left' }));
    for (let k = 0; k <= 4; k++) { const yy = tStart + k * 10; D.text(X(yy), pb.y + pb.h + 15 * FS, String(Math.round(yy)), { size: 12, weight: 700, color: '#64748b' }); }
    D.text(pb.x - 4, pb.y - 8, 'ΔT (K)', { size: 12, weight: 800, color: '#dc2626', align: 'right' }); D.text(pb.x + pb.w + 4, pb.y - 8, 'N (W/m²)', { size: 12, weight: 800, color: '#2563eb', align: 'left' });
    ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip();
    const pts = S.hist.concat([[S.tY, S.dT, N]]);
    [[1, YT, '#dc2626'], [2, YN, '#2563eb']].forEach((q) => { ctx.beginPath(); pts.forEach((p, i) => { const x = X(p[0]), y = q[1](p[q[0]]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = q[2]; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    D.sphere(X(S.tY), YT(S.dT), 5, '#dc2626', { gloss: false }); D.sphere(X(S.tY), YN(N), 5, '#2563eb', { gloss: false });
    D.text(pb.x + pb.w / 2, pb.y + pb.h + 32 * FS, '모의 시간 (년) · 표층 해양만 고려한 단순 모형', { size: 11.5, weight: 700, color: '#64748b' });

    // 식과 값
    card(C, '🧮 복사 강제력과 반응');
    const tx2 = C.x + 14;
    if (PHONE) { drawWrap(tx2 + (C.w - 28) / 2, C.y + 40, 'F = 5.35 ln(C/280) = ' + fx(F, 1) + ' W/m² · 나감 = 240 − F + λΔT · N = F − λΔT, λ = ' + fx(lamEff(), 2) + ' W/m²/K' + (S.fb ? ' (수증기 되먹임)' : ''), C.w - 28, 12.5, { color: '#334155', weight: 800 }); }
    else {
      D.text(tx2, C.y + 54, 'CO₂ ' + S.co2 + ' ppm → 복사 강제력 F = 5.35 ln(C/280)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
      D.text(tx2, C.y + 54 + 26 * FS * 0.85, '= ' + fx(F, 1) + ' W/m² (대기가 지표 복사를 더 가둬 나가는 복사가 줄어요)', { size: 13, weight: 800, color: '#b91c1c', align: 'left' });
      D.text(tx2, C.y + 54 + 52 * FS * 0.85, '나가는 복사 = 240 − F + λΔT,  N = F − λΔT', { size: 13, weight: 700, color: '#334155', align: 'left' });
      D.text(tx2, C.y + 54 + 78 * FS * 0.85, 'λ = ' + fx(lamEff(), 2) + ' W/m²/K ' + (S.fb ? '(σT⁴ 증가 3.76 − 수증기 되먹임 2.0)' : '(지표가 1 K 오르면 나가는 복사 3.76 증가)'), { size: 12.5, weight: 700, color: '#475569', align: 'left' });
      D.text(tx2, C.y + 54 + 104 * FS * 0.85, '수증기 되먹임 ' + (S.fb ? '켬: 온도가 오르면 수증기가 늘어 효과가 커져요' : '끔'), { size: 12.5, weight: 800, color: S.fb ? '#0369a1' : '#64748b', align: 'left' });
    }
  }
  function drawMolW(x, y) { D.sphere(x - 8, y, 4.2, '#f87171', { gloss: false }); D.sphere(x + 8, y, 4.2, '#f87171', { gloss: false }); D.sphere(x, y, 4.6, '#475569', { gloss: false }); }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const MODES = [['path', '🔭 빛의 행로'], ['budget', '🧮 열수지'], ['latent', '💧 잠열'], ['warm', '📈 온난화']];
  const MODE_LABEL = { path: '🔭 태양 복사가 대기를 지나는 길', budget: '🧮 전 지구 평균 열수지 채우기', latent: '💧 잠열: 가장 큰 비복사 열 이동', warm: '📈 CO₂ 증가와 새로운 평형' };
  const FREE_KEYS = { path: ['proc', 'elev', 'elevR', 'surf'], budget: ['bank'], latent: ['qSl'], warm: ['co2', 'fb'] };
  let ctlKeys = [];
  $('#modeSeg').innerHTML = MODES.map((m) => '<button type="button" data-mode="' + m[0] + '">' + m[1] + '</button>').join('');
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free);
    let keys = free ? FREE_KEYS[S.mode].slice() : ctlKeys.slice();
    // 과정에 따라 필요한 슬라이더만
    if (S.mode === 'path') {
      keys = keys.filter((k) => !((k === 'elev' && !(S.proc === 'scatter')) || (k === 'elevR' && S.proc !== 'refract') || (k === 'surf' && S.proc !== 'reflect')));
      if (keys.includes('ratioIn') && S.proc !== 'scatter') keys = keys.filter((k) => k !== 'ratioIn');
    }
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  // 장면 1
  function setProc(p) { S.proc = p; S.procSeen[p] = true; syncSeg('#procBtns', 'pr', p); PH1.length = 0; PS.length = 0; updateCtl(); }
  bindSeg('#procBtns', 'pr', setProc);
  SciSim.bindRange($('#sElev'), $('#oElev'), (v) => v + '°', (v) => { S.elev = +v; });
  SciSim.bindRange($('#sElevR'), $('#oElevR'), (v) => (+v).toFixed(1) + '°', (v) => { S.elevR = +v; });
  bindSeg('#surfBtns', 's', (s) => { S.surf = s; S.surfSeen[s] = true; syncSeg('#surfBtns', 's', s); });
  clearBadOnInput('.num-in');
  const pairProc = makePair($('#pairProc'), [{ id: 'sky', label: '푸른 하늘' }, { id: 'cloud', label: '구름의 흰색' }, { id: 'ozone', label: '오존층의 자외선 차단' }, { id: 'rise', label: '일출 때 태양이 높게 보임' }],
    [{ id: 'abs', label: '흡수' }, { id: 'ref', label: '굴절' }, { id: 'sr', label: '산란·반사' }, { id: 'sca', label: '산란' }], { sky: 'sca', cloud: 'sr', ozone: 'abs', rise: 'ref' }, () => { });

  // 장면 2
  $('#numBank').innerHTML = BANK.map((b, i) => '<button class="opt" type="button" data-ci="' + i + '">' + b.v + '</button>').join('');
  $$('#numBank .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); fillWith(+b.dataset.ci); }));
  $('#bClearFill').addEventListener('click', () => { Sound.click(); clearAllFill(); });

  // 장면 3
  SciSim.bindRange($('#sQ'), $('#oQ'), (v) => v + ' W/m²', (v) => { S.q = +v; S.qSeen[v] = true; });
  const ordHeat = makeOrder($('#ordHeat'), [{ id: 'sen', label: '현열 (공기와 직접 접촉해 전달되는 열)' }, { id: 'lat', label: '잠열 (증발·응결에 숨어 있는 열)' }, { id: 'rad', label: '순 복사 (지표 복사 − 대기 역복사)' }], ['lat', 'rad', 'sen'], () => { });

  // 장면 4
  SciSim.bindRange($('#sCo2'), $('#oCo2'), (v) => v + ' ppm', (v) => { S.co2 = +v; S.runSeen[v] = true; });
  function syncFb() { $('#tFb').classList.toggle('on', S.fb); }
  $('#tFb').addEventListener('click', () => { Sound.click(); S.fb = !S.fb; syncFb(); });
  $('#bWarmReset').addEventListener('click', () => { Sound.click(); resetWarm(); });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); flash.t = 0; PH1.length = 0; PS.length = 0; VAP.length = 0;
    $$('.num-in').forEach((e) => { e.value = ''; e.classList.remove('bad'); });
    pairProc.reset(); ordHeat.reset();
    S.proc = 'scatter'; S.procSeen = { scatter: true }; S.elev = 60; S.elevR = 0; S.surf = 'snow'; S.surfSeen = { snow: true };
    setSlider($('#sElev'), $('#oElev'), 60, (v) => v + '°'); setSlider($('#sElevR'), $('#oElevR'), 0, (v) => (+v).toFixed(1) + '°'); syncSeg('#procBtns', 'pr', 'scatter'); syncSeg('#surfBtns', 's', 'snow');
    S.fill = {}; S.used = {}; S.sel = 'ref'; S.wrongIds = []; syncBank();
    S.q = 80; S.qSeen = { 80: true }; setSlider($('#sQ'), $('#oQ'), 80, (v) => v + ' W/m²'); lbars.rad = lbars.sen = lbars.lat = 0; heatCloud = 0;
    S.co2 = 280; S.fb = false; setSlider($('#sCo2'), $('#oCo2'), 280, (v) => v + ' ppm'); S.runSeen = { 280: true }; syncFb(); resetWarm();
    if (li === 0) { setMode('path'); setCtl(['proc', 'elev', 'elevR', 'ratioIn']); showHint('과정을 하나씩 눌러 빛이 어떻게 달라지는지 봐요', 5200); }
    else if (li === 1) { setMode('budget'); setCtl(['bank']); showHint('빈칸(❔)을 누르고 숫자 카드를 눌러 채워요', 5200); }
    else if (li === 2) { setMode('latent'); setCtl(['qSl']); showHint('주황색 빛이 수증기와 함께 올라가 구름에서 나와요', 5200); }
    else { setMode('warm'); setCtl(['co2', 'fb']); showHint('CO₂ 농도를 올리면 불균형 막대가 생겼다가 줄어들어요', 5200); }
    updateCtl();
  }
  const procSeenAll = () => ['scatter', 'reflect', 'absorb', 'refract'].every((p) => S.procSeen[p]);
  const filledN = () => BL.filter((id) => S.fill[id] != null).length;
  const okRows = () => bdSums().filter((r) => r.ok).length;
  const levels = [
    {
      title: '태양 빛이 대기를 지나는 길', short: '빛의 행로', icon: '🔭', phase: '관찰', features: ['path'],
      intro: '<p class="si-q">❓ 탐구 질문: 지표가 받는 태양 에너지보다 지표가 내놓는 에너지가 더 큰데도 지구는 왜 계속 식지 않을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학2</b>에서 100 단위로 나눈 지구의 열수지와 온실 효과를, <b>중3</b>에서 반사 30 %·흡수 70 %의 복사 평형을 배웠어요. 이번에는 같은 열수지를 <b>W/m²</b> 단위로 정량화해요.</div>' +
        '<p>태양 복사는 지표에 닿기 전에 대기에서 <b>산란, 반사, 흡수, 굴절</b>을 겪어요. 먼저 네 가지 과정을 하나씩 살펴봐요. 과정 단추를 눌러 빛의 행로가 어떻게 달라지는지 비교해 보세요.</p>',
      setup() { resetStep(0); },
      recap: '산란은 파장이 짧을수록 세고(∝ 1/λ⁴), 반사량은 입사량 × 알베도예요. 오존은 자외선, 수증기·CO₂는 적외선을 흡수하고, 굴절 때문에 지평선 근처 태양이 약 0.5° 높게 보여요.',
      summary: '<ul><li><b>산란</b>: 레일리 산란은 1/λ⁴에 비례 → 푸른빛(450 nm)이 붉은빛(650 nm)보다 (650/450)⁴ ≈ 4.3~4.4배 더 산란 → 푸른 하늘, 붉은 석양. 구름 입자는 파장에 관계없이 산란해서 흰색이에요.</li><li><b>반사</b>: 반사량 = 입사 × 알베도. 알베도: 바다 0.06, 숲 0.15, 사막 0.30, 구름 0.5~0.8, 눈 0.8~0.9. (눈 위 340 × 0.8 = 272 W/m²)</li><li><b>흡수</b>: 오존 → 자외선, 수증기·CO₂ → 적외선. <b>굴절</b>: 공기 밀도 차로 빛이 휘어 지평선 근처 태양이 실제보다 약 0.5° 높게 보여요 → 낮이 수 분 길어져요.</li></ul>',
      missions: [
        {
          title: '푸른빛은 얼마나 더 산란될까', manual: true,
          goal: '산란되는 정도는 <b>1 / λ⁴</b>에 비례해요. 푸른빛(450 nm)이 붉은빛(650 nm)보다 몇 배 더 산란되는지 <b>소수 첫째 자리</b>까지 계산해 입력해요.',
          hint: '(650 / 450)⁴을 계산해요. 650 / 450 ≈ 1.44 → 제곱하면 약 2.09 → 다시 제곱하면 약 4.4예요.',
          setup() { $('#iRatio').value = ''; setMode('path'); setProc('scatter'); setCtl(['proc', 'elev', 'ratioIn']); },
          status: () => mark(near($in('#iRatio'), 4.35, 0.15)) + ' 입력한 값 ' + ($in('#iRatio') == null ? '—' : $in('#iRatio') + '배') + ' · 태양 고도를 낮춰 석양 색을 확인해 봐요',
          check() {
            const v = $in('#iRatio'); if (v == null) return '배수를 입력해 주세요.';
            const ok = near(v, 4.35, 0.15); markBad('#iRatio', !ok);
            if (!ok) return near(v, 1.44, 0.1) || near(v, 2.09, 0.1) ? '1/λ⁴은 λ를 <b>네 번</b> 곱한 거예요. (650 / 450)을 4제곱해 봐요.' : '푸른빛이 더 많이 산란돼요. (650 / 450)⁴을 계산해 소수 첫째 자리까지 구해 봐요.';
            return true;
          },
          explain: '(650 / 450)⁴ = 1.444⁴ ≈ <b>4.35</b>, 약 4.3~4.4배예요. 푸른빛이 훨씬 많이 흩어져서 낮 하늘이 파랗고, 석양처럼 공기층을 길게 지날 때는 푸른빛이 다 흩어져 붉은빛만 남아요.',
        },
        {
          title: '현상과 물리 과정 짝짓기', manual: true,
          goal: '과정 단추로 산란·반사·흡수·굴절 장면을 모두 살펴보고, <b>현상</b>과 <b>물리 과정</b>을 짝지어요.',
          hint: '푸른 하늘은 작은 공기 분자에 의한 산란, 구름은 입자가 커서 파장에 관계없이 산란·반사, 오존은 자외선을 흡수, 일출 때 태양이 높게 보이는 것은 공기층에서 빛이 휘기 때문이에요.',
          setup() { pairProc.reset(); setMode('path'); setCtl(['proc', 'elev', 'elevR', 'surf', 'pairProc']); },
          status: () => mark(pairProc.ok()) + ' 짝지은 현상 ' + pairProc.count() + ' / 4 · ' + mark(procSeenAll()) + ' 살펴본 과정 ' + ['scatter', 'reflect', 'absorb', 'refract'].filter((p) => S.procSeen[p]).length + ' / 4',
          check() {
            if (!pairProc.complete()) return '현상 4개를 모두 짝지어 주세요. (지금 ' + pairProc.count() + '개)';
            if (!pairProc.ok()) { pairProc.mark(pairProc.wrong()); return '빨간 짝이 달라요. 과정 단추로 장면을 다시 확인해 봐요.'; }
            return true;
          },
          explain: '<b>푸른 하늘</b>은 산란, <b>구름의 흰색</b>은 모든 파장의 산란·반사, <b>오존층의 자외선 차단</b>은 흡수, <b>일출 때 태양이 높게 보이는 것</b>은 굴절이에요.',
        },
        {
          type: 'quiz', title: '눈 덮인 지표의 반사',
          goal: '눈(알베도 0.8) 위에 <b>340 W/m²</b>의 태양 복사가 들어올 때 반사되는 양과, 눈 덮임이 넓어질 때 일어나는 일로 옳은 것은?',
          setup() { setMode('path'); setProc('reflect'); S.surf = 'snow'; syncSeg('#surfBtns', 's', 'snow'); setCtl(['proc', 'surf']); },
          choices: ['272 W/m²를 반사해요. 눈이 늘면 반사가 늘어 지표가 흡수하는 에너지가 줄고 더 차가워져요.', '68 W/m²를 반사해요. 눈이 늘면 흡수가 늘어 지표가 더 따뜻해져요.', '272 W/m²를 반사해요. 눈이 늘면 반사가 줄어 지표가 더 따뜻해져요.', '340 W/m²를 모두 반사해요. 눈 위에서는 열이 전혀 흡수되지 않아요.'],
          answer: 0,
          feedback: ['', '340 × 0.8 = 272가 반사량이에요. 68은 흡수되는 양이에요.', '눈은 알베도가 커서 눈 덮임이 늘수록 반사가 늘어요.', '알베도 0.8이면 80 %를 반사하고 20 %(68 W/m²)는 흡수돼요.'],
          explain: '반사량 = 340 × 0.8 = <b>272 W/m²</b>, 흡수 68 W/m²예요. 눈 덮임이 늘면 반사가 늘고 흡수가 줄어 지표가 더 차가워지고, 그러면 눈이 더 늘어나는 <b>양의 되먹임</b>이 일어나요.',
        },
      ],
    },
    {
      title: '전 지구 평균 열수지 완성하기', short: '열수지 채우기', icon: '🧮', phase: '분석', features: ['budget'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양 복사가 대기에서 반사·흡수되는 것을 살펴봤어요. 이제 전 지구 평균 열수지를 <b>W/m²</b>로 완성해요.</div>' +
        '<p>지구가 받는 태양 복사는 태양 상수 1361 W/m²를 지구 표면 전체에 고르게 나눈 <b>340 W/m²</b>(= 1361 / 4)예요. 반사 100은 구름·대기 77과 지표 23으로 이루어져 있어요. 도해의 빈칸 8곳을 <b>숫자 카드</b>로 채우고, 아래 <b>합계 확인</b>에서 우주·대기·지표가 각각 균형인지 확인해요.</p>',
      setup() { resetStep(1); },
      recap: '지표는 160 + 340 = 400 + 80 + 20, 대기는 80 + 360 + 80 + 20 = 200 + 340, 우주 쪽은 340 = 100 + 240으로 모두 균형이에요. 지표가 내놓는 복사 400이 흡수한 태양 복사 160보다 큰 것은 대기 역복사 340이 있기 때문이에요.',
      summary: '<ul><li>입사 340 = 반사 100(구름·대기 77, 지표 23) + 대기 흡수 80 + 지표 흡수 160. (예시, 정수로 단순화)</li><li><b>지표</b>: 흡수 160 + 대기 역복사 340 = 방출 400 + 잠열 80 + 현열 20.</li><li><b>대기</b>: 태양 흡수 80 + 지표 복사 흡수 360 + 잠열 80 + 현열 20 = 540 = 우주로 200 + 지표로 340. (지표 복사 400 중 40은 대기창으로 우주로 직행)</li><li>우주로 나가는 복사 = 200 + 40 = <b>240</b> = 흡수한 태양 복사 340 − 100 → <b>복사 평형</b>. 지구 온도가 일정한 까닭이에요.</li></ul>',
      missions: [
        {
          title: '열수지 도해 완성', manual: true,
          goal: '도해의 빈칸 <b>8곳</b>에 숫자 카드를 놓아 열수지를 완성해요. 아래 <b>합계 확인</b>이 모두 ✅가 되어야 해요.',
          hint: '지표: 160 + 340 = 방출 + 잠열 + 현열이고, 잠열이 현열보다 커요. 반사 100은 77 + 23, 우주로 가는 복사는 대기 방출 200 + 대기창 40이에요. 합계 확인에서 ❌인 곳의 숫자를 바꿔 봐요.',
          setup() { clearAllFill(); setMode('budget'); setCtl(['bank']); },
          status: () => mark(filledN() === 8) + ' 채운 칸 ' + filledN() + ' / 8 · ' + mark(okRows() === 3) + ' 균형이 맞는 곳 ' + okRows() + ' / 3',
          check() {
            const n = filledN(); if (n < 8) return '빈칸이 ' + (8 - n) + '곳 남았어요. 모두 채워 주세요.';
            const wrong = BL.filter((id) => valOf(id) !== BANS[id]);
            if (wrong.length) { S.wrongIds = wrong; return '빨간 칸이 달라요. 아래 합계 확인에서 ❌인 곳을 보고 고쳐 봐요.'; }
            return true;
          },
          explain: '반사 <b>100</b>, 대기 흡수 <b>80</b>, 지표 흡수 <b>160</b>, 지표 복사 <b>400</b>, 대기 역복사 <b>340</b>, 잠열 <b>80</b>, 현열 <b>20</b>, 우주로 <b>240</b>이에요. 세 곳의 합계가 모두 맞아야 열수지가 완성돼요.',
        },
        {
          title: '복사 평형 확인', manual: true,
          goal: '우주로 나가는 복사는 지구가 <b>흡수한 태양 복사(340 − 100)</b>와 같아야 해요. 그 값을 계산해 W/m²로 입력해요.',
          hint: '입사 340에서 반사 100을 빼면 지구가 흡수하는 에너지예요. 도해의 우주로 나가는 복사(200 + 40)와 같은지도 확인해 봐요.',
          setup() { $('#iSpace').value = ''; setMode('budget'); setCtl(['bank', 'spaceIn']); },
          status: () => mark(near($in('#iSpace'), 240, 0.5)) + ' 입력 ' + ($in('#iSpace') == null ? '—' : $in('#iSpace') + ' W/m²'),
          check() {
            const v = $in('#iSpace'); if (v == null) return '값을 입력해 주세요.';
            const ok = near(v, 240, 0.5); markBad('#iSpace', !ok);
            if (!ok) return v === 340 ? '340은 입사량이에요. 반사된 100은 빼야 해요.' : '340 − 100을 계산해 봐요.';
            return true;
          },
          explain: '340 − 100 = <b>240 W/m²</b>. 우주로 나가는 복사(대기 200 + 대기창 40 = 240)와 같아서 지구 전체는 <b>복사 평형</b>이고 평균 기온이 일정해요.',
        },
        {
          type: 'quiz', title: '복사 400이 160보다 큰데도 균형인 까닭',
          goal: '지표가 내놓는 복사(400)가 지표가 흡수하는 태양 복사(160)보다 큰데도 지표가 계속 식지 않는 까닭은?',
          setup() { setMode('budget'); setCtl(['bank']); },
          choices: ['지표가 스스로 에너지를 만들어 내기 때문이에요.', '대기가 지표 복사를 흡수했다가 340을 지표로 되돌려 보내서, 지표는 160 + 340 = 500을 받고 400 + 80 + 20 = 500을 내놓기 때문이에요.', '태양 복사가 사실은 400이기 때문이에요.', '잠열이 지표 복사를 모두 없애 주기 때문이에요.'],
          answer: 1,
          feedback: ['에너지는 새로 생기지 않아요. 어딘가에서 받아야 해요.', '', '태양 복사 중 지표가 흡수하는 것은 160이에요.', '잠열은 지표의 열을 대기로 옮기는 것일 뿐 복사를 없애지 않아요.'],
          explain: '대기의 <b>역복사 340</b>이 지표에 더해져서 지표가 받는 에너지는 160 + 340 = 500이고, 내놓는 에너지도 400 + 80 + 20 = 500이에요. 이 <b>온실 효과</b> 덕분에 지표가 따뜻하게 유지돼요.',
        },
      ],
    },
    {
      title: '잠열: 가장 큰 열 이동', short: '잠열', icon: '💧', phase: '탐구', features: ['latent'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지표가 대기로 내놓는 열 중 비복사 열 이동이 현열 20과 잠열 80임을 확인했어요. 잠열은 어떤 열일까요? (<b>진로선택 역학과 에너지</b>의 Q = mL을 떠올려 봐요.)</div>' +
        '<p>물이 증발할 때는 증발 잠열 <b>L = 2.5×10⁶ J/kg</b>을 흡수하고, 수증기가 응결하면 같은 양을 방출해요. 잠열 80 W/m²가 얼마나 많은 물을 증발시키는지 계산하고, 그 열이 구름에서 어떻게 나오는지 살펴봐요.</p>',
      setup() { resetStep(2); },
      recap: '잠열 80 W/m²는 하루 약 2.8 mm(연 약 1010 mm)의 물을 증발시켜요. 증발할 때 흡수한 열은 수증기 속에 저장되었다가 응결할 때 방출돼서 구름 속 공기를 데워요.',
      summary: '<ul><li>지표에서 대기로 가는 열(W/m²): 순 복사 60(= 400 − 340), 현열 20, <b>잠열 80</b>. 비복사 열 이동 중 잠열이 가장 커요 (현열의 4배).</li><li>증발량 m = Q / L = 80 / (2.5×10⁶) = 3.2×10⁻⁵ kg/(m²·s) ≈ <b>2.8 mm/일 ≈ 1010 mm/년</b> ≈ 전 지구 평균 강수량(약 1000 mm) → 증발한 물은 모두 비로 돌아와요.</li><li>증발할 때 열이 <b>사라지는 것이 아니라</b> 수증기 속에 저장되었다가, 응결할 때 방출돼서 구름 속 공기를 데우고 상승을 키워요 (→ 다음 차시: 습윤 단열 감률).</li></ul>',
      missions: [
        {
          title: '증발량 계산', manual: true,
          goal: '잠열 <b>80 W/m²</b>가 증발시키는 물의 양을 <b>m = Q / L</b>(L = 2.5×10⁶ J/kg)로 구해 <b>mm/일</b>로 입력해요. (1 kg/m² = 1 mm)',
          hint: 'm = 80 / 2.5×10⁶ = 3.2×10⁻⁵ kg/(m²·s)이에요. 하루는 86400초이니 3.2×10⁻⁵ × 86400을 계산해 봐요.',
          setup() { $('#iEvap').value = ''; S.q = 80; setSlider($('#sQ'), $('#oQ'), 80, (v) => v + ' W/m²'); setMode('latent'); setCtl(['qSl', 'evapIn']); },
          status: () => mark(S.q === 80) + ' Q = ' + S.q + ' W/m² (목표 80) · ' + mark(near($in('#iEvap'), evapDay(80), 0.1)) + ' 입력 ' + ($in('#iEvap') == null ? '—' : $in('#iEvap') + ' mm/일'),
          check() {
            if (S.q !== 80) return '먼저 잠열 플럭스 Q를 80 W/m²로 맞춰 주세요.';
            const v = $in('#iEvap'); if (v == null) return '증발량을 입력해 주세요.';
            const ok = near(v, evapDay(80), 0.1); markBad('#iEvap', !ok);
            if (!ok) return near(v, 3.2e-5, 1e-5) || v < 0.01 ? '3.2×10⁻⁵는 1초당 값이에요. 86400초를 곱해 하루 값으로 바꿔요.' : '3.2×10⁻⁵ kg/(m²·s) × 86400 s를 계산해 mm/일로 구해 봐요.';
            return true;
          },
          explain: 'm = 80 / (2.5×10⁶) = 3.2×10⁻⁵ kg/(m²·s), 하루(86400 s) 동안 약 2.76 kg/m² = <b>약 2.8 mm/일</b>이에요. 1년이면 약 1010 mm로, 전 지구 평균 강수량(약 1000 mm)과 같아요.',
        },
        {
          title: '열 이동의 크기 순서', manual: true,
          goal: '지표에서 대기로 열을 옮기는 세 가지 방식을 <b>큰 순서대로</b> 눌러 번호를 매겨요.',
          hint: '막대 그래프를 보세요. 잠열 80, 순 복사 60, 현열 20이에요.',
          setup() { ordHeat.reset(); setMode('latent'); setCtl(['qSl', 'ordHeat']); },
          status: () => mark(ordHeat.ok()) + ' 고른 항목 ' + ordHeat.seq.length + ' / 3',
          check() {
            if (!ordHeat.complete()) return '세 가지를 모두 눌러 순서를 매겨 주세요.';
            if (!ordHeat.ok()) { ordHeat.mark(ordHeat.seq[ordHeat.firstWrong()]); return '빨간 항목부터 순서가 달라요. 막대 그래프의 크기를 비교해 봐요.'; }
            return true;
          },
          explain: '잠열 80 &gt; 순 복사 60 &gt; 현열 20 순서예요. 비복사 열 이동만 보면 <b>잠열이 현열의 4배</b>로 가장 커서, 물이 증발·응결하는 과정이 지구의 열 순환에서 아주 중요해요.',
        },
        {
          type: 'quiz', title: '구름이 만들어질 때 공기가 데워지는 까닭',
          goal: '구름이 만들어질 때 주변 공기가 따뜻해지는 까닭은?',
          setup() { setMode('latent'); setCtl(['qSl']); },
          choices: ['수증기가 응결하면서 증발할 때 저장해 둔 잠열을 방출하기 때문이에요.', '증발할 때 열이 사라졌다가 구름에서 새로 생기기 때문이에요.', '구름이 태양 빛을 모두 흡수하기 때문이에요.', '수증기가 물방울이 되면 에너지가 줄어들어 온도가 오르기 때문이에요.'],
          answer: 0,
          feedback: ['', '열은 사라지지 않아요. 수증기 속에 저장(잠열)되어 있다가 응결할 때 방출돼요.', '구름은 태양 빛을 대부분 반사·산란해서 흰색으로 보여요. 공기를 데우는 주된 열원은 응결 잠열이에요.', '에너지는 줄어드는 것이 아니라 열의 형태로 주변에 방출돼요.'],
          explain: '증발할 때 흡수한 열은 사라지지 않고 <b>수증기 속에 잠열로 저장</b>되어 있다가, 수증기가 <b>응결할 때 방출</b>돼요. 이 열이 구름 속 공기를 데워 상승을 키워요. 이 내용은 다음 차시의 습윤 단열 감률로 이어져요.',
        },
      ],
    },
    {
      title: '온난화 모의: 새로운 평형', short: '온난화 모의', icon: '📈', phase: '분석', features: ['warm'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 들어오는 복사와 나가는 복사가 같을 때 지구 온도가 일정하다는 것을 확인했어요. 온실 기체가 늘면 이 균형이 어떻게 깨질까요? (<b>디지털·AI 소양</b>: 슬라이더와 그래프로 모의해 봐요.)</div>' +
        '<p>CO₂가 280 ppm에서 560 ppm으로 <b>2배</b>가 되면 대기가 지표 복사를 더 가두어, 나가는 복사가 <b>약 3.7 W/m²</b> 줄어요 (복사 강제력 F = 5.35 ln(C/280)). 그러면 <b>들어옴 &gt; 나감</b>이어서 지표가 데워져요. 지표가 데워지면 나가는 복사가 늘어요 (Δ(σT⁴) ≈ 4σT³ΔT = 3.76 W/m² 매 K). 새 평형이 될 때까지 지켜봐요.</p>',
      setup() { resetStep(3); },
      recap: 'CO₂ 2배는 나가는 복사를 약 3.7 W/m² 줄여 불균형을 만들고, 지표가 약 1.0 K 데워져 나가는 복사가 늘어난 뒤에 새 평형이 돼요. 수증기 되먹임이 있으면 2배 이상(약 2 K)이 돼요.',
      summary: '<ul><li>CO₂ 2배(280 → 560 ppm): 복사 강제력 F = 5.35 ln 2 ≈ <b>3.7 W/m²</b> → 일시적 불균형(들어옴 &gt; 나감).</li><li>지표 온도가 오르면 나가는 복사가 늘어요: Δ(σT⁴) ≈ 4σT³ΔT = <b>3.76 W/m²/K</b> (255 K 기준). 새 평형 ΔT = 3.7 / 3.76 ≈ <b>1.0 K</b> (되먹임 없음).</li><li>수증기 되먹임(온도↑ → 수증기↑ → 온실 효과↑)이 더해지면 약 2배 이상(약 2 K)으로 커져요.</li><li>온실 기체 증가는 \'들어오는 에너지 = 나가는 에너지\'를 깨뜨리고, 지구는 <b>더 높은 온도에서</b> 새 평형을 찾아요.</li></ul>',
      missions: [
        {
          title: 'CO₂ 2배, 새 평형의 ΔT', manual: true,
          goal: 'CO₂를 <b>560 ppm</b>으로 올리고(수증기 되먹임은 끈 채로) 불균형 N이 0에 가까워져 <b>새 평형</b>이 되면, 지표 온도 변화 ΔT를 K로 입력해요.',
          hint: 'CO₂ 슬라이더를 560 ppm으로 올리고 기다려요. 붉은 곡선(ΔT)이 더 이상 오르지 않고 파란 곡선(N)이 0이 되면 평형이에요. ΔT = F / 3.76으로 계산해도 돼요.',
          setup() { S.co2 = 280; S.fb = false; setSlider($('#sCo2'), $('#oCo2'), 280, (v) => v + ' ppm'); syncFb(); resetWarm(); $('#iDT').value = ''; setMode('warm'); setCtl(['co2', 'fb', 'dtIn']); },
          status: () => mark(S.co2 === 560) + ' CO₂ ' + S.co2 + ' ppm · ' + mark(!S.fb) + ' 되먹임 끔 · ' + mark(atEq()) + ' 새 평형 · ' + mark(near($in('#iDT'), 1.0, 0.1)) + ' 입력 ' + ($in('#iDT') == null ? '—' : $in('#iDT') + ' K'),
          check() {
            if (S.co2 !== 560) return '먼저 CO₂ 농도를 560 ppm(2배)으로 올려 주세요.';
            if (S.fb) return '수증기 되먹임을 끈 상태에서 구해 주세요.';
            if (!atEq()) return '아직 새 평형이 아니에요. 불균형 N이 0에 가까워질 때까지 기다려요.';
            const v = $in('#iDT'); if (v == null) return 'ΔT를 입력해 주세요.';
            const ok = near(v, 1.0, 0.1); markBad('#iDT', !ok);
            if (!ok) return v > 3 ? '3.7 W/m²는 에너지 불균형이에요. 온도로 바꾸려면 3.76 W/m²/K으로 나눠 봐요.' : '새 평형에서 읽은 ΔT를 입력해요. (F / 3.76으로도 구할 수 있어요.)';
            return true;
          },
          explain: '새 평형에서는 나가는 복사가 다시 240 W/m²가 되어야 해요. 3.76 W/m²/K × ΔT = 3.7 W/m²에서 <b>ΔT ≈ 1.0 K</b>(되먹임 없음)예요. 수증기 되먹임을 켜면 같은 3.7 W/m²에서 약 2.1 K까지 올라가요.',
        },
        {
          type: 'quiz', title: '평형이 깨졌다가 다시 맞춰지는 과정',
          goal: 'CO₂가 2배가 된 뒤 일어나는 일을 바르게 설명한 것은?',
          setup() { setMode('warm'); setCtl(['co2', 'fb']); },
          choices: ['들어오는 복사와 나가는 복사는 처음부터 계속 같아서 지표 온도는 변하지 않아요.', '나가는 복사가 줄어 들어옴 &gt; 나감이 되고, 지표가 데워져 나가는 복사가 늘면서 더 높은 온도에서 다시 평형이 돼요.', '들어오는 복사가 계속 늘어나서 지표 온도는 끝없이 올라가요.', '수증기 되먹임을 켜면 새 평형의 온도 변화가 더 작아져요.'],
          answer: 1,
          feedback: ['CO₂가 늘면 나가는 복사가 줄어서 순간적으로 불균형이 생겨요.', '', '들어오는 복사는 그대로예요. 지표 온도가 오르면 나가는 복사가 늘어 평형을 찾아요.', '수증기 되먹임은 온난화를 더 키워서 ΔT가 더 커져요.'],
          explain: '온실 기체가 늘면 <b>나가는 복사가 줄어</b> 들어옴 &gt; 나감이 되고 지표가 데워져요. 온도가 오르면 나가는 복사가 늘어나 <b>더 높은 온도에서 새 평형</b>을 되찾아요. 수증기 되먹임은 이 온난화를 키워요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-heat-budget', mount: '#game', badge: '열수지 분석가', homeHref: '../../index.html#hs',
    featureLabels: { path: '🔭 빛의 행로 단면', budget: '🧮 열수지 도해', latent: '💧 증발·응결 잠열', warm: '📈 온난화 모의' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'path') {
      if (S.proc === 'scatter') setReadouts(['태양 고도', S.elev + '°', '공기층을 지나는 길이', fx(airmass(S.elev), 1) + '배', '태양 빛 색', S.elev < 25 ? '붉은 기운' : '노란 기운']);
      else if (S.proc === 'reflect') { const al = ALB[S.surf]; setReadouts(['지표', SURF_NAME[S.surf], '알베도', al.toFixed(2), '반사량 (입사 340 기준)', Math.round(SC0 * al) + ' W/m²']); }
      else if (S.proc === 'absorb') setReadouts(['자외선', '오존이 흡수', '가시광선', '대부분 통과', '적외선', '수증기·CO₂가 흡수']);
      else setReadouts(['실제 고도', fx(S.elevR, 1) + '°', '보이는 고도', fx(S.elevR + refrR(S.elevR), 2) + '°', '굴절각', fx(refrR(S.elevR), 2) + '°']);
    } else if (m === 'budget') setReadouts(['채운 칸', filledN() + ' / 8', '균형이 맞는 곳', okRows() + ' / 3', '선택한 칸', S.sel ? BNAME[S.sel] : '—']);
    else if (m === 'latent') setReadouts(['잠열 플럭스 Q', S.q + ' W/m²', '증발량', fx(evapDay(S.q), 1) + ' mm/일', '연 증발량', (S.q === 0 ? '0' : String(Math.round(evapDay(S.q) * 365 / 10) * 10)) + ' mm/년']);
    else setReadouts(['CO₂ 농도', S.co2 + ' ppm', '불균형 N', fx(warmN(), 1) + ' W/m²', '지표 온도 변화 ΔT', '+' + fx(S.dT, 1) + ' K']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false, lastProc = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef3f9'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'path') drawPath(t, dt);
    else if (S.mode === 'budget') drawBudget(t, dt);
    else if (S.mode === 'latent') drawLatent(t, dt);
    else drawWarm(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, BANK, BANS, BL, pairProc, ordHeat, bdSums, bdGeo, arrowsDef, blankRect,
    get game() { return game; }, setMode, resetStep, updateCtl, setProc, fillWith, clearBlank, clearAllFill, valOf, evapDay, forcing, warmN, atEq, lamEff, resetWarm, stepWarm,
  };

})();
