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
     화산 활동과 화산암 (화산체 형태 → 분출물 → 박편 관찰 → 암석 순환)
     ====================================================== */
  initStage('#eaf1f7', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const SUPm = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUPm[c] || c).join('');

  const S = {
    mode: 'shape', fade: 0, clock: 0, bad: [],
    vis: 5, run: false, started: false,
    gas: 3, vis2: 2.5, nExp: 0, nExpHi: 0, expAt: -99, flashK: 0,
    slide: 'bas', seen: {}, meas: {}, mark: null, slideK: 1, L: 1, coolT: 1, coolShow: false,
    role: 0, roleSeen: {},
  };

  /* ======================================================
     장면 1: 화산체 형태
     ====================================================== */
  const RCs = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 448 }, B: { x: 8, y: 464, w: 504, h: 248 } }
    : { A: { x: 12, y: 12, w: 776, h: 392 }, B: { x: 12, y: 412, w: 776, h: 136 } };
  const secBox = () => { const A = RCs.A; const m = { x: A.x + 12, y: A.y + 38, w: A.w - 24, h: A.h - 50 }; m.yG = m.y + m.h - (PHONE ? 100 : 104); return m; };
  const SB = secBox();
  const NC = (() => { let n = Math.floor(SB.w / 4); if (n % 2 === 0) n -= 1; return n; })();
  const CC = (NC - 1) / 2, DX = SB.w / NC;
  const XC = (i) => SB.x + (i + 0.5) * DX;
  const V0 = 0.0318 * SB.w * SB.w;         // 마그마 방에서 나올 수 있는 마그마의 양(단면적, 모형 단위)
  const ERUPT_SEC = 6;                      // 모두 분출하는 데 걸리는 시간(시간 가속)
  /* 점성 지수(log η) → 화산체 경사각(°): 2 → 5°, 6 → 25°, 9 → 35° (모형) */
  const critDeg = (v) => { v = clamp(v, 2, 9); return v <= 6 ? 5 + 20 * Math.pow((v - 2) / 4, 1.5) : 25 + (10 * (v - 6)) / 3; };
  const rockOf = (v) => (v <= 3.5 ? 'bas' : v <= 7 ? 'and' : 'rhy');
  const ROCKQ = { bas: '현무암질', and: '안산암질', rhy: '유문암질' };
  const etaTxt = (v) => (v === Math.round(v) ? '10' + sup(v) : '10^' + v.toFixed(1)) + ' Pa·s';

  const VOL = { strata: [], top: null, hot: new Float32Array(NC), used: 0, layered: false };
  function newStratum(first) {
    const prev = first ? new Float32Array(NC) : VOL.top.h;
    const n = VOL.strata.length;
    const type = VOL.layered && n % 2 === 1 ? 'pyro' : 'lava';
    const st = { type, shade: n % 2, h: Float32Array.from(prev), prev };
    VOL.strata.push(st); VOL.top = st;
  }
  function volReset() {
    VOL.strata = []; VOL.top = null; VOL.hot.fill(0); VOL.used = 0; VOL.layered = S.vis >= 5;
    newStratum(true);
    parts.clear();
  }
  function relax(sweeps) {
    const lim = Math.tan((critDeg(S.vis) * Math.PI) / 180) * DX, h = VOL.top.h, p = VOL.top.prev, hot = VOL.hot;
    for (let s = 0; s < sweeps; s++) {
      for (let i = CC; i < NC - 1; i++) {
        const d = h[i] - h[i + 1];
        if (d > lim) { const t = Math.min((d - lim) / 2, h[i] - p[i]); if (t > 0) { h[i] -= t; h[i + 1] += t; if (t > 0.004) hot[i + 1] = 1; } }
        else if (d < -lim) { const t = Math.min((-d - lim) / 2, h[i + 1] - p[i + 1]); if (t > 0) { h[i + 1] -= t; h[i] += t; if (t > 0.004) hot[i] = 1; } }
      }
      for (let i = CC; i > 0; i--) {
        const d = h[i] - h[i - 1];
        if (d > lim) { const t = Math.min((d - lim) / 2, h[i] - p[i]); if (t > 0) { h[i] -= t; h[i - 1] += t; if (t > 0.004) hot[i - 1] = 1; } }
        else if (d < -lim) { const t = Math.min((-d - lim) / 2, h[i - 1] - p[i - 1]); if (t > 0) { h[i - 1] -= t; h[i] += t; if (t > 0.004) hot[i] = 1; } }
      }
      // 가장자리: 바다로 흘러 들어가요
      if (h[NC - 1] > lim) h[NC - 1] = Math.max(lim, p[NC - 1]);
      if (h[0] > lim) h[0] = Math.max(lim, p[0]);
    }
  }
  function measure() {
    const h = VOL.top.h; let H = 0, R = 0;
    for (let i = 0; i < NC; i++) { if (h[i] > H) H = h[i]; if (h[i] > 0.1) R = Math.max(R, Math.abs(i - CC)); }
    const Rpx = (R + 0.5) * DX;
    return { H, Rpx, deg: H >= 6 ? (Math.atan2(H, Rpx) * 180) / Math.PI : null };
  }
  const slopeNow = () => { const m = measure(); return m.deg == null ? null : Math.round(m.deg); };
  const erupted = () => VOL.used / V0;
  const typeOfSlope = (d) => (d == null ? '—' : d <= 10 ? '순상 화산' : d >= 25 ? '성층 화산' : '중간 형태');
  function shapeStep(dt) {
    const hot = VOL.hot;
    for (let i = 0; i < NC; i++) if (hot[i] > 0) hot[i] = Math.max(0, hot[i] - dt * 0.9);
    if (S.run && VOL.used < V0 - 1e-6) {
      const dv = Math.min((V0 / ERUPT_SEC) * dt, V0 - VOL.used);
      VOL.used += dv;
      const idx = Math.min(9, Math.floor(VOL.used / (V0 / 10) - 1e-9));
      while (VOL.strata.length - 1 < idx) newStratum(false);
      const sub = 6, h = VOL.top.h;
      for (let k = 0; k < sub; k++) {
        const add = dv / sub / DX / 3;
        h[CC - 1] += add; h[CC] += add; h[CC + 1] += add;
        hot[CC - 1] = hot[CC] = hot[CC + 1] = 1;
        relax(22);
      }
      if (VOL.used >= V0 - 1e-6) { S.run = false; syncRun(); }
      // 분출구에서 솟는 입자
      const top = SB.yG - VOL.top.h[CC], vx = XC(CC);
      if (!RM) {
        if (S.vis < 4) { if (Math.random() < dt * 60) parts.emit({ x: vx + rnd(-4, 4), y: top, vx: rnd(-35, 35), vy: rnd(-150, -80), life: 0.7, size: 2.4, color: '#fb923c', gravity: 380, drag: 0.2 }); }
        else if (Math.random() < dt * 24) parts.emit({ x: vx + rnd(-5, 5), y: top, vx: rnd(-14, 14), vy: rnd(-70, -35), life: 1.6, size: 12, grow: 10, color: VOL.layered ? 'rgba(120,113,108,.55)' : 'rgba(150,140,130,.5)', shape: 'smoke', gravity: -8, drag: 0.5 });
      }
    } else relax(14);
  }
  function drawShape(t, dt) {
    const { A, B } = RCs, M = SB;
    shapeStep(dt);
    card(A, '🌋 화산체의 단면 (모형: 가로·세로 비율이 같아요)');
    ctx.save(); rr(M.x, M.y, M.w, M.h, 12).clip();
    const g = ctx.createLinearGradient(0, M.y, 0, M.yG);
    g.addColorStop(0, '#9ed4f5'); g.addColorStop(1, '#e8f5fb'); ctx.fillStyle = g; ctx.fillRect(M.x, M.y, M.w, M.yG - M.y);
    // 땅
    const gg = ctx.createLinearGradient(0, M.yG, 0, M.y + M.h);
    gg.addColorStop(0, '#a98466'); gg.addColorStop(1, '#6b4e37'); ctx.fillStyle = gg; ctx.fillRect(M.x, M.yG, M.w, M.y + M.h - M.yG);
    ctx.strokeStyle = 'rgba(60,40,25,.25)'; ctx.lineWidth = 1.4;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(M.x, M.yG + k * 18); ctx.lineTo(M.x + M.w, M.yG + k * 18 + (k % 2 ? 6 : -4)); ctx.stroke(); }
    // 마그마 방
    const q = clamp(1 - VOL.used / V0, 0, 1), cx = XC(CC), cy = M.yG + (PHONE ? 70 : 74), rx = PHONE ? 96 : 120, ry = 24;
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#4a2418'; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    const ly = cy + ry - ry * 2 * q;
    const mg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry); mg.addColorStop(0, '#fbbf24'); mg.addColorStop(1, '#dc2626');
    ctx.fillStyle = mg; ctx.fillRect(cx - rx, ly, rx * 2, cy + ry - ly);
    ctx.restore();
    ctx.strokeStyle = '#2b130c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    D.text(cx, cy + 5 * FS, '마그마 방 ' + Math.round(q * 100) + ' %', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(60,20,10,.7)', strokeWidth: 3 });
    // 화산체 (아래층부터 위로)
    for (let k = VOL.strata.length - 1; k >= 0; k--) {
      const st = VOL.strata[k];
      ctx.beginPath(); ctx.moveTo(M.x, M.yG);
      for (let i = 0; i < NC; i++) ctx.lineTo(XC(i), M.yG - st.h[i]);
      ctx.lineTo(M.x + M.w, M.yG); ctx.closePath();
      ctx.fillStyle = st.type === 'pyro' ? (st.shade ? '#dcc79c' : '#cfb68a') : (st.shade ? '#7a6b62' : '#665850');
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,22,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    // 분출구 통로
    const topY = M.yG - VOL.top.h[CC];
    ctx.fillStyle = S.run ? 'rgba(251,146,60,.95)' : 'rgba(124,45,18,.75)';
    ctx.fillRect(cx - 5, topY + 2, 10, cy - ry - topY - 2 + 1);
    // 갓 흘러나온 뜨거운 용암
    ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    for (let i = 0; i < NC - 1; i++) {
      const hv = Math.max(VOL.hot[i], VOL.hot[i + 1]);
      if (hv < 0.04 || VOL.top.h[i] < 0.2) continue;
      ctx.strokeStyle = 'rgba(255,' + Math.round(110 + 90 * (1 - hv)) + ',40,' + (0.95 * hv).toFixed(2) + ')';
      ctx.beginPath(); ctx.moveTo(XC(i), M.yG - VOL.top.h[i] - 1); ctx.lineTo(XC(i + 1), M.yG - VOL.top.h[i + 1] - 1); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // 측정선 · 각도
    const m = measure();
    if (m.deg != null) {
      const bx = cx + m.Rpx, by = M.yG, apx = cx, apy = M.yG - m.H;
      if (m.Rpx < M.w / 2 - 4) {
        D.dashedLine(bx, by, apx, apy, { color: '#dc2626', width: 2.2 });
        D.dashedLine(bx, by, bx - Math.min(110, m.Rpx + 30), by, { color: '#334155', width: 1.6 });
      } else D.dashedLine(cx + M.w / 2, by - 0, apx, apy, { color: '#dc2626', width: 2.2 });
      const th = (m.deg * Math.PI) / 180, ex = Math.min(bx, M.x + M.w - 4);
      const rad = Math.min(48, Math.max(20, m.Rpx * 0.35));
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ex, by, rad, Math.PI, Math.PI + th); ctx.stroke();
      const am = Math.PI + th / 2;
      D.label(ex + Math.cos(am) * (rad + 24), by + Math.sin(am) * (rad + 24) - 6, '경사 ' + Math.round(m.deg) + '°', { bg: '#dc2626', size: 13, pad: 7 });
    }
    // 마그마 방 · 수증기 구름 이름
    if (VOL.strata.length > 1 || VOL.used > 0) {
      const last = VOL.top;
      D.label(M.x + 112, M.y + 22, last.type === 'pyro' ? '지금 쌓이는 층: 화산 쇄설물' : '지금 쌓이는 층: 용암', { bg: last.type === 'pyro' ? '#a8895a' : '#57534e', size: 12.5, pad: 8 });
    }
    ctx.restore();
    D.text(M.x + M.w - 8, M.y + 20, VOL.layered ? '용암과 화산 쇄설물이 번갈아 층을 이뤄요' : '용암만 흘러 쌓여요', { size: 13, weight: 800, color: '#475569', align: 'right' });

    // 아래 카드: 점성 눈금과 화산 종류
    card(B, '🧪 마그마의 점성과 화산 종류');
    const bx0 = B.x + 20, bw = PHONE ? B.w - 40 : 380, by0 = B.y + (PHONE ? 70 : 62), X = (v) => bx0 + ((v - 2) / 7) * bw;
    const segs = [[2, 4, '#b45309', '현무암질', '10²~10³'], [4, 7.5, '#a8a29e', '안산암질', '약 10⁶'], [7.5, 9, '#e7d3b0', '유문암질', '10⁸ 이상']];
    segs.forEach((s) => {
      ctx.fillStyle = s[2]; ctx.fillRect(X(s[0]), by0, X(s[1]) - X(s[0]), 16);
      D.text((X(s[0]) + X(s[1])) / 2, by0 - 6, s[3], { size: 12.5, weight: 800, color: '#44403c' });
      D.text((X(s[0]) + X(s[1])) / 2, by0 + 34 * (PHONE ? 0.92 : 0.9), s[4] + ' Pa·s', { size: 12, weight: 700, color: '#64748b' });
    });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.4; ctx.strokeRect(bx0, by0, bw, 16);
    const mx = X(S.vis);
    poly([[mx, by0 - 2], [mx - 7, by0 - 15], [mx + 7, by0 - 15]]); ctx.fillStyle = '#dc2626'; ctx.fill();
    D.text(bx0 + bw / 2, B.y + B.h - 10, '점성 지수 log η: 오른쪽일수록 끈적해요 (SiO₂가 많은 마그마)', { size: 12.5, weight: 700, color: '#64748b' });
    // 오른쪽(또는 아래) 설명
    const deg = slopeNow(), ty = typeOfSlope(deg);
    const tx = PHONE ? B.x + 14 : B.x + 420, tw = PHONE ? B.w - 28 : B.w - 436, tyy = PHONE ? B.y + 124 : B.y + 40;
    const txt = ty === '순상 화산' ? '순상 화산: 현무암질, 점성 작음 → 용암이 멀리 퍼져 완만(예: 마우나로아 경사 약 5°, 높이 4170 m, 폭 약 120 km). 조용히 분출해요.'
      : ty === '성층 화산' ? '성층 화산: 안산암질~유문암질, 점성 큼 → 분출구 가까이 쌓여 급경사(예: 후지산·세인트헬렌스 경사 약 30°). 폭발적으로 분출해요.'
        : ty === '중간 형태' ? '순상과 성층의 중간 형태예요. 점성이 커질수록 용암이 멀리 가지 못해 가팔라져요.' : '점성 지수를 고르고 \'분출\'을 눌러 화산체를 쌓아 봐요.';
    D.text(tx, tyy + 4, '현재: ' + ROCKQ[rockOf(S.vis)] + ' 마그마' + (deg == null ? '' : ' · ' + ty), { size: 14, weight: 800, color: '#334155', align: 'left' });
    drawWrap(tx, tyy + 26 * FS * 0.85, txt, tw, 13, { align: 'left', weight: 700, color: '#475569', lh: 1.28 });
  }

  /* ======================================================
     장면 2: 분출물 (기포가 빠져나가는가, 갇히는가)
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 276 }, B: { x: 8, y: 292, w: 504, h: 200 }, C: { x: 8, y: 500, w: 504, h: 212 } }
    : { A: { x: 12, y: 12, w: 430, h: 536 }, B: { x: 450, y: 12, w: 338, h: 250 }, C: { x: 450, y: 270, w: 338, h: 278 } };
  const CAP = 40;
  const tRise = (v) => 0.25 * Math.pow(10, (v - 2) / 1.1);           // 기포가 통로를 올라오는 데 걸리는 시간(s, 모형)
  const bubRate = (g) => 6 * g;                                       // 초당 생기는 기포 수
  const steadyN = (g, v) => bubRate(g) * tRise(v);                    // 통로에 쌓이는 기포 수(안정 상태)
  const BUB = [], BOMBS = [], LAND = [];
  const EJ = { acc: 0, cnt: { ash: 0, lap: 0, bomb: 0 }, glow: 0 };
  const conduit = () => {
    const A = RC2.A, E = { x: A.x + 10, y: A.y + 40, w: A.w - 20, h: A.h - 50 };
    const gb = PHONE ? 112 : 150; E.yG = E.y + E.h - gb; E.cx = E.x + E.w / 2;
    const air = E.yG - E.y, deg = critDeg(S.vis2), tn = Math.tan((deg * Math.PI) / 180);
    E.H = Math.max(28, Math.min(air * 0.5, (E.w / 2 - 10) * tn)); E.Wb = E.H / tn;
    E.top = E.yG - E.H; E.cy = E.yG + (PHONE ? 72 : 106); E.ry = PHONE ? 22 : 28; E.rx = PHONE ? 80 : 100;
    E.bot = E.cy - E.ry; E.L = E.bot - E.top; E.tn = tn;
    return E;
  };
  const surfY = (E, x) => E.yG - Math.max(0, E.H - Math.abs(x - E.cx) * E.tn);
  function ejectReset() { BUB.length = 0; BOMBS.length = 0; LAND.length = 0; EJ.acc = 0; EJ.cnt = { ash: 0, lap: 0, bomb: 0 }; S.nExp = 0; S.nExpHi = 0; S.expAt = -99; S.flashK = 0; }
  function explode() {
    const E = conduit();
    S.nExp++; if (S.vis2 >= 6) S.nExpHi++;
    S.expAt = S.clock; S.flashK = 1; BUB.length = 0;
    Sound.fail && Sound.tone(110, 0.35, 'sawtooth', 0.07);
    const big = clamp(steadyN(S.gas, S.vis2) / CAP, 1, 4);
    const nAsh = RM ? 0 : Math.round(16 + 3 * big), nLap = Math.round(14 + 4 * big), nBomb = Math.round(4 + big);
    for (let i = 0; i < nAsh; i++) parts.emit({ x: E.cx + rnd(-10, 10), y: E.top, vx: rnd(-55, 55), vy: rnd(-250, -120), life: rnd(1.8, 2.6), size: rnd(16, 26), grow: rnd(16, 28), color: i % 3 ? 'rgba(87,83,78,.6)' : 'rgba(120,113,108,.55)', shape: 'smoke', gravity: -14, drag: 0.7 });
    for (let i = 0; i < nLap; i++) { const a = rnd(-1.15, 1.15); BOMBS.push({ x: E.cx, y: E.top, vx: Math.sin(a) * rnd(110, 190), vy: -Math.cos(a) * rnd(250, 360), r: rnd(2, 3), kind: 'lap', tr: [] }); }
    for (let i = 0; i < nBomb; i++) { const a = rnd(-1.0, 1.0); BOMBS.push({ x: E.cx, y: E.top, vx: Math.sin(a) * rnd(90, 170), vy: -Math.cos(a) * rnd(240, 320), r: rnd(6, 9), kind: 'bomb', tr: [] }); }
    EJ.cnt.ash += 60; EJ.cnt.lap += nLap; EJ.cnt.bomb += nBomb;
  }
  function ejectStep(dt) {
    const E = conduit(), T = tRise(S.vis2), r = bubRate(S.gas), fl = T > 6;
    EJ.acc += r * dt;
    while (EJ.acc >= 1) { EJ.acc -= 1; BUB.push({ s: 0, jx: rnd(-1, 1), jy: Math.random(), ph: rnd(0, 6), sz: rnd(2.4, 4) }); }
    for (let i = BUB.length - 1; i >= 0; i--) {
      const b = BUB[i]; b.s += dt / T;
      if (b.s >= 1) {
        BUB.splice(i, 1);
        if (!RM && parts.count < 80) parts.emit({ x: E.cx + rnd(-4, 4), y: E.top, vx: rnd(-14, 14), vy: rnd(-60, -30), life: 1.1, size: 5, grow: 8, color: 'rgba(255,255,255,.7)', shape: 'smoke', gravity: -6, drag: 0.8 });
      }
    }
    if (BUB.length >= CAP) explode();
    // 날아가는 화산탄 · 화산력 (경사면에 부딪히면 멈춰요)
    for (let i = BOMBS.length - 1; i >= 0; i--) {
      const b = BOMBS[i];
      b.vy += 430 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.tr.push([b.x, b.y]); if (b.tr.length > 7) b.tr.shift();
      const sy = surfY(E, b.x);
      if (b.y >= sy || b.x < E.x + 4 || b.x > E.x + E.w - 4) {
        if (b.x >= E.x + 4 && b.x <= E.x + E.w - 4) { LAND.push({ x: b.x, y: sy - b.r * 0.5, r: b.r, kind: b.kind, a: 1 }); if (LAND.length > 70) LAND.shift(); }
        BOMBS.splice(i, 1);
      }
    }
    LAND.forEach((l) => { l.a = Math.max(0.35, l.a - dt * 0.02); });
    S.flashK = approach(S.flashK, 0, dt, 3);
    if (S.flashK < 0.01) S.flashK = 0;
  }
  const steadyInfo = () => {
    const n = steadyN(S.gas, S.vis2), P = n / CAP, f = P / (1 + P), gas = S.gas;
    const lava = Math.round((100 - gas) * (1 - f) * 10) / 10;
    const pyro = Math.round((100 - gas - lava) * 10) / 10;
    return { n, P, f, lava, pyro, gas, explosive: n >= CAP };
  };
  const CLS_COL = { ash: '#a8a29e', lap: '#78716c', bomb: '#44403c' };
  function drawEject(t, dt) {
    const { A, B, C } = RC2, E = conduit();
    ejectStep(dt);
    card(A, '🌋 분출구와 통로의 단면 (기포 = 마그마에 녹아 있던 가스)');
    ctx.save(); rr(E.x, E.y, E.w, E.h, 12).clip();
    const g = ctx.createLinearGradient(0, E.y, 0, E.yG);
    g.addColorStop(0, '#9ed4f5'); g.addColorStop(1, '#e8f5fb'); ctx.fillStyle = g; ctx.fillRect(E.x, E.y, E.w, E.yG - E.y);
    const gg = ctx.createLinearGradient(0, E.yG, 0, E.y + E.h); gg.addColorStop(0, '#a98466'); gg.addColorStop(1, '#6b4e37');
    ctx.fillStyle = gg; ctx.fillRect(E.x, E.yG, E.w, E.y + E.h - E.yG);
    // 화산체
    const cg = ctx.createLinearGradient(0, E.top, 0, E.yG); cg.addColorStop(0, '#7d6e65'); cg.addColorStop(1, '#5f524b');
    ctx.fillStyle = cg; poly([[E.cx - E.Wb, E.yG], [E.cx, E.top], [E.cx + E.Wb, E.yG]]); ctx.fill();
    ctx.strokeStyle = 'rgba(40,28,22,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 마그마 방
    ctx.fillStyle = '#4a2418'; ctx.beginPath(); ctx.ellipse(E.cx, E.cy, E.rx, E.ry, 0, 0, TAU); ctx.fill();
    const mg = ctx.createLinearGradient(0, E.cy - E.ry, 0, E.cy + E.ry); mg.addColorStop(0, '#fbbf24'); mg.addColorStop(1, '#dc2626');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(E.cx, E.cy, E.rx - 3, E.ry - 3, 0, 0, TAU); ctx.fill();
    D.text(E.cx, E.cy + 5 * FS, '마그마 방', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(60,20,10,.7)', strokeWidth: 3 });
    // 통로
    const cw = 18;
    const pg = ctx.createLinearGradient(0, E.top, 0, E.bot); pg.addColorStop(0, '#f59e0b'); pg.addColorStop(1, '#ea580c');
    ctx.fillStyle = pg; ctx.fillRect(E.cx - cw / 2, E.top, cw, E.L + 2);
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.strokeRect(E.cx - cw / 2, E.top, cw, E.L + 2);
    // 기포
    const T = tRise(S.vis2), stuck = T > 6;
    BUB.forEach((b) => {
      const yy = stuck ? E.bot - 6 - b.jy * (E.L - 12) : E.bot - b.s * E.L, xx = E.cx + (stuck ? b.jx * (cw / 2 - 4) + Math.sin(S.clock * 1.4 + b.ph) * 1.2 : b.jx * (cw / 2 - 5));
      ctx.fillStyle = 'rgba(255,255,230,.9)'; ctx.strokeStyle = 'rgba(120,53,15,.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(xx, yy, b.sz, 0, TAU); ctx.fill(); ctx.stroke();
    });
    // 조용한 분출이면 용암이 흘러내려요
    const st = steadyInfo();
    if (!st.explosive) {
      ctx.lineWidth = 6; ctx.lineCap = 'round';
      [-1, 1].forEach((sd) => {
        const len = Math.min(E.Wb * 0.6, 40 + 10 * S.gas), k = 0.5 + 0.5 * Math.sin(t * 2.2);
        ctx.strokeStyle = 'rgba(251,146,60,' + (0.7 + 0.2 * k).toFixed(2) + ')'; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -t * 18;
        ctx.beginPath(); ctx.moveTo(E.cx, E.top + 1); ctx.lineTo(E.cx + sd * len, surfY(E, E.cx + sd * len) - 1); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.lineCap = 'butt';
      D.glow(E.cx, E.top, 26, '#fb923c', 0.45);
      if (!RM && Math.random() < dt * (3 + S.gas * 3) && S.vis2 < 4) parts.emit({ x: E.cx + rnd(-3, 3), y: E.top, vx: rnd(-30, 30), vy: rnd(-120, -60), life: 0.7, size: 2.3, color: '#fb923c', gravity: 380, drag: 0.2 });
    }
    // 쌓인 화산탄
    LAND.forEach((l) => { ctx.globalAlpha = l.a; ctx.fillStyle = l.kind === 'bomb' ? '#3f2a1e' : '#57534e'; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 날아가는 것
    BOMBS.forEach((b) => {
      b.tr.forEach((p, i) => { ctx.fillStyle = 'rgba(251,146,60,' + (0.05 + 0.5 * (i / b.tr.length)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], b.r * 0.6, 0, TAU); ctx.fill(); });
      ctx.fillStyle = b.kind === 'bomb' ? '#7c2d12' : '#44403c'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 1; ctx.stroke();
    });
    if (S.flashK > 0) D.glow(E.cx, E.top, 70 + 40 * S.flashK, '#fde68a', 0.8 * S.flashK);
    ctx.restore();
    // 이름표
    D.label(E.cx, E.top - 22 < E.y + 14 ? E.y + 14 : E.top - 22, '분출구', { bg: '#475569', size: 12.5, pad: 7 });
    const since = S.clock - S.expAt;
    D.text(E.x + 8, E.y + E.h - 6, '폭발 횟수 ' + S.nExp + '회' + (since < 1.5 ? ' 💥' : ''), { size: 13.5, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(30,20,15,.7)', strokeWidth: 3 });

    // 분출물 구성 카드
    card(B, '📊 분출물의 구성 (질량 %, 예시 모형)');
    const bars = [['용암', st.lava, '#ea580c'], ['화산 쇄설물', st.pyro, '#78716c'], ['화산 가스', st.gas, '#60a5fa']];
    const lx = B.x + 14, bx = B.x + (PHONE ? 118 : 108), bw = B.w - (bx - B.x) - 62, by = B.y + 46;
    bars.forEach((b, i) => {
      const y = by + i * (PHONE ? 28 : 32);
      D.text(lx, y + 14 * FS * 0.82, b[0], { size: 13.5, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(bx, y, bw, 20, 4).fill();
      const w = bw * clamp(b[1] / 100, 0, 1);
      if (w > 0.5) { ctx.fillStyle = b[2]; rr(bx, y, Math.max(2, w), 20, 4).fill(); }
      D.text(bx + bw + 6, y + 14 * FS * 0.82, (Math.round(b[1] * 10) / 10).toFixed(1) + ' %', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    });
    const py = by + 3 * (PHONE ? 28 : 32) + 6;
    D.text(lx, py + 12, '가스 압력 (갇힌 기포 ' + BUB.length + ' / ' + CAP + ')', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const pw = B.w - 28, pp = clamp(BUB.length / CAP, 0, 1);
    ctx.fillStyle = '#e2e8f0'; rr(lx, py + 20, pw, 18, 5).fill();
    ctx.fillStyle = mixc('#38bdf8', '#dc2626', pp); if (pp > 0.01) rr(lx, py + 20, Math.max(3, pw * pp), 18, 5).fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.4; rr(lx, py + 20, pw, 18, 5).stroke();
    D.text(B.x + B.w / 2, py + (PHONE ? 56 : 58), st.explosive ? '→ 폭발적 분출: 가스가 빠져나가지 못해 압력이 쌓여요' : '→ 조용한 분출: 가스가 빠져나가 압력이 쌓이지 않아요', { size: 13, weight: 800, color: st.explosive ? '#b91c1c' : '#15803d' });

    // 쇄설물 크기 · 가스 성분
    card(C, '📏 화산 쇄설물의 지름 (눈금은 10배씩)');
    const sx0 = C.x + 36, sw = C.w - 72, sy = C.y + (PHONE ? 62 : 70), LX = (mm) => sx0 + ((Math.log10(mm) + 1) / 5) * sw;
    const segsz = [[0.1, 2, '#d6d3d1', '화산재'], [2, 64, '#a8a29e', '화산력'], [64, 10000, '#57534e', '화산탄·화산괴']];
    segsz.forEach((s) => {
      ctx.fillStyle = s[2]; ctx.fillRect(LX(s[0]), sy, LX(s[1]) - LX(s[0]), 16);
      D.text((LX(s[0]) + LX(s[1])) / 2, sy - 6, s[3], { size: 12.5, weight: 800, color: '#44403c' });
    });
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.4; ctx.strokeRect(sx0, sy, sw, 16);
    [[0.1, '0.1 mm'], [2, '2 mm'], [64, '64 mm'], [1000, '1 m']].forEach((q) => {
      ctx.fillStyle = '#334155'; ctx.fillRect(LX(q[0]) - 0.75, sy + 16, 1.5, 7);
      D.text(LX(q[0]), sy + 38, q[1], { size: 12, weight: 700, color: '#475569' });
    });
    if (S.cardsShow) {
      [['C', 0.5], ['D', 20], ['E', 300], ['F', 1000]].forEach((q) => {
        const x = LX(q[1]), y = sy + 64;
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, sy + 16); ctx.lineTo(x, y - 9); ctx.stroke();
        D.sphere(x, y, 9, '#dc2626', { text: q[0], textScale: 1.05 });
      });
    }
    const gy = C.y + (PHONE ? 166 : 178);
    D.text(C.x + 14, gy - 12, '💨 화산 가스의 성분 (예시)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const gs = [['H₂O', 80, '#60a5fa'], ['CO₂', 10, '#9ca3af'], ['SO₂', 6, '#facc15'], ['기타', 4, '#d1d5db']];
    let gx = C.x + 14; const gw = C.w - 28;
    gs.forEach((q) => { const w = (gw * q[1]) / 100; ctx.fillStyle = q[2]; ctx.fillRect(gx, gy, w, 20); if (q[0] === 'H₂O') D.text(gx + w / 2, gy + 14 * FS * 0.82, 'H₂O 80', { size: 12.5, weight: 800, color: '#1e293b' }); gx += w; });
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.4; ctx.strokeRect(C.x + 14, gy, gw, 20);
    D.text(C.x + C.w / 2, gy + 42 * (PHONE ? 0.85 : 1), '수증기 80 % · CO₂ 10 % · SO₂ 6 % · 기타 4 % (예시)', { size: 13, weight: 800, color: '#1d4ed8' });
    if (!PHONE) {
      D.text(C.x + 14, C.y + C.h - 40, '쌓인 쇄설물: 화산재 ' + EJ.cnt.ash + ' · 화산력 ' + EJ.cnt.lap + ' · 화산탄 ' + EJ.cnt.bomb + ' (개, 모형)', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
      D.text(C.x + 14, C.y + C.h - 18, '기포가 통로를 올라오는 시간: ' + (T < 10 ? T.toFixed(1) + '초' : T < 1000 ? Math.round(T) + '초' : '1000초 이상') + ' (모형)', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    }
  }

  /* ======================================================
     장면 3: 박편 관찰 (가상 현미경)
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 424 }, B: { x: 8, y: 440, w: 250, h: 272 }, C: { x: 264, y: 440, w: 248, h: 272 } }
    : { A: { x: 12, y: 12, w: 430, h: 536 }, B: { x: 450, y: 12, w: 338, h: 296 }, C: { x: 450, y: 316, w: 338, h: 232 } };
  const RF = PHONE ? 148 : 176, FOVMM = 8, PXMM = (2 * RF) / FOVMM;
  const SL = {
    bas: { name: '현무암', cls: '화산암', ico: '🟫', seed: 11, leg: [['#7a5c46', '갈색 유리(석기)'], ['#e6e0d0', '작은 사장석'], ['#a3c24b', '감람석 반정'], ['#2f3a2c', '휘석 반정']] },
    and: { name: '안산암', cls: '화산암', ico: '⬜', seed: 23, leg: [['#8a8582', '회색 석기'], ['#f2eee2', '사장석 반정'], ['#2a2724', '각섬석 반정']] },
    rhy: { name: '유문암', cls: '화산암', ico: '🟨', seed: 37, leg: [['#d0bfa8', '담갈색 유리(석기)'], ['#e5e7eb', '석영 반정'], ['#f1d9c4', '알칼리 장석 반정']] },
    gra: { name: '화강암', cls: '심성암', ico: '🟧', seed: 41, leg: [['#cfd6dc', '석영'], ['#e8b9a2', '정장석'], ['#f4f0e8', '사장석'], ['#4b3a30', '흑운모']] },
    gab: { name: '반려암', cls: '심성암', ico: '⬛', seed: 59, leg: [['#44563a', '휘석'], ['#e9e7df', '사장석'], ['#9bbf4a', '감람석']] },
  };
  const SLIDE_IDS = ['bas', 'and', 'rhy', 'gra', 'gab'];
  const SLIDE_CACHE = {};
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  /* 보로노이 조립질 박편 (화강암 · 반려암) */
  function genCoarse(id) {
    const N = 2 * RF, R2 = 2, rn = seeded(SL[id].seed);
    const gran = id === 'gra';
    const types = gran ? ['q', 'q', 'q', 'q', 'k', 'k', 'k', 'k', 'p', 'p', 'p', 'b', 'b'] : ['x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'o'];
    const COL = gran ? { q: '#cfd6dc', k: '#e8b9a2', p: '#f4f0e8', b: '#4b3a30' } : { x: '#44563a', p: '#e9e7df', o: '#9bbf4a' };
    const NAME = gran ? { q: '석영', k: '정장석', p: '사장석', b: '흑운모' } : { x: '휘석', p: '사장석', o: '감람석' };
    for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(rn() * (i + 1)); const t = types[i]; types[i] = types[j]; types[j] = t; }
    const sites = [];
    let guard = 0;
    const minD = (gran ? 0.62 : 0.55) * Math.sqrt((N * N) / types.length);
    while (sites.length < types.length && guard++ < 4000) {
      const x = rn() * N, y = rn() * N;
      if (sites.every((s) => Math.hypot(s.x - x, s.y - y) > minD * (1 - guard / 9000))) sites.push({ x, y, t: types[sites.length], id: sites.length, ang: rn() * Math.PI });
    }
    const c = document.createElement('canvas'); c.width = c.height = N * R2;
    const o = c.getContext('2d'), img = o.createImageData(N * R2, N * R2), dat = img.data;
    const rgb = {}; Object.keys(COL).forEach((k) => { rgb[k] = hexRGB(COL[k]); });
    for (let py = 0; py < N * R2; py++) {
      for (let px = 0; px < N * R2; px++) {
        const x = px / R2, y = py / R2; let d1 = 1e9, d2 = 1e9, k1 = 0;
        for (let k = 0; k < sites.length; k++) { const dx = sites[k].x - x, dy = sites[k].y - y, d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d; }
        const s = sites[k1], col = rgb[s.t], dd = Math.sqrt(d2) - Math.sqrt(d1);
        let f = 1 - 0.1 * Math.min(1, Math.sqrt(d1) / (minD * 0.9));
        const nz = (((px * 73856093) ^ (py * 19349663)) & 255) / 255;
        f += (nz - 0.5) * 0.07;
        if (s.t === 'p') f += 0.06 * Math.sin((x * Math.cos(s.ang) + y * Math.sin(s.ang)) * 0.55);
        if (s.t === 'b') f += 0.1 * Math.sin((x * Math.cos(s.ang) + y * Math.sin(s.ang)) * 1.3);
        let r = col[0] * f, g = col[1] * f, b = col[2] * f;
        if (dd < 1.3) { const w = 1 - dd / 1.3; r = r * (1 - 0.75 * w) + 30 * 0.75 * w; g = g * (1 - 0.75 * w) + 30 * 0.75 * w; b = b * (1 - 0.75 * w) + 34 * 0.75 * w; }
        const i4 = (py * N * R2 + px) * 4; dat[i4] = r; dat[i4 + 1] = g; dat[i4 + 2] = b; dat[i4 + 3] = 255;
      }
    }
    o.putImageData(img, 0, 0);
    // 결정 크기(가장 긴 지름) 계산
    const pts = sites.map(() => []);
    for (let y = 0; y < N; y += 2) for (let x = 0; x < N; x += 2) { let d1 = 1e9, k1 = 0; for (let k = 0; k < sites.length; k++) { const dx = sites[k].x - x, dy = sites[k].y - y, d = dx * dx + dy * dy; if (d < d1) { d1 = d; k1 = k; } } pts[k1].push([x, y]); }
    const cr = sites.map((s, k) => {
      let best = null, clipped = false;
      pts[k].forEach((p) => { if (Math.hypot(p[0] - RF, p[1] - RF) > RF - 3) clipped = true; });
      for (let a = 0; a < 8; a++) {
        const th = (a * Math.PI) / 8, ux = Math.cos(th), uy = Math.sin(th); let mn = 1e9, mx = -1e9, pm = null, pM = null;
        pts[k].forEach((p) => { const pr = p[0] * ux + p[1] * uy; if (pr < mn) { mn = pr; pm = p; } if (pr > mx) { mx = pr; pM = p; } });
        if (!best || mx - mn > best.len) best = { len: mx - mn, p1: pm, p2: pM };
      }
      return { kind: 'cell', id, k, t: s.t, name: NAME[s.t], x: s.x, y: s.y, len: best ? best.len + 2 : 0, p1: best && best.p1, p2: best && best.p2, clipped };
    });
    return { c, crystals: cr, sites, N, coarse: true };
  }

  /* 반상 · 유리질 박편 (현무암 · 안산암 · 유문암) */
  function genPorph(id) {
    const N = 2 * RF, R2 = 2, rn = seeded(SL[id].seed);
    const c = document.createElement('canvas'); c.width = c.height = N * R2;
    const o = c.getContext('2d'); o.scale(R2, R2);
    const bg = { bas: '#7a5c46', and: '#8a8582', rhy: '#d0bfa8' }[id];
    o.fillStyle = bg; o.fillRect(0, 0, N, N);
    // 유리의 얼룩
    for (let i = 0; i < 46; i++) {
      const x = rn() * N, y = rn() * N, r = 20 + rn() * 50, g = o.createRadialGradient(x, y, 0, x, y, r);
      const dark = rn() < 0.5; g.addColorStop(0, dark ? 'rgba(30,20,10,.14)' : 'rgba(255,240,220,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = g; o.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    if (id === 'rhy') {
      o.lineWidth = 1.6;
      for (let k = 0; k < 34; k++) {
        const y0 = k * 11 + rn() * 6, amp = 3 + rn() * 7, ph = rn() * 6, fr = 0.012 + rn() * 0.02;
        o.strokeStyle = rn() < 0.5 ? 'rgba(150,120,90,.38)' : 'rgba(255,248,235,.32)';
        o.beginPath(); for (let x = 0; x <= N; x += 6) { const y = y0 + Math.sin(x * fr + ph) * amp; x ? o.lineTo(x, y) : o.moveTo(x, y); } o.stroke();
      }
    }
    const crys = [];
    const okPos = (x, y, r) => Math.hypot(x - RF, y - RF) < RF - r - 6;
    const lath = (x, y, ang, len, wid, fill, stroke, twin) => {
      o.save(); o.translate(x, y); o.rotate(ang);
      o.fillStyle = fill; o.beginPath();
      o.moveTo(-len / 2 + wid * 0.25, -wid / 2); o.lineTo(len / 2 - wid * 0.25, -wid / 2); o.lineTo(len / 2, 0); o.lineTo(len / 2 - wid * 0.25, wid / 2); o.lineTo(-len / 2 + wid * 0.25, wid / 2); o.lineTo(-len / 2, 0); o.closePath(); o.fill();
      if (stroke) { o.strokeStyle = stroke; o.lineWidth = len > 16 ? 1.3 : 0.7; o.stroke(); }
      if (twin) { o.strokeStyle = 'rgba(120,115,105,.35)'; o.lineWidth = 0.8; for (let u = -len / 2 + 5; u < len / 2 - 3; u += 5) { o.beginPath(); o.moveTo(u, -wid / 2 + 1); o.lineTo(u, wid / 2 - 1); o.stroke(); } }
      o.restore();
    };
    const rnd2 = (a, b) => a + rn() * (b - a);
    const mm = (v) => v * PXMM;
    // 석기의 작은 결정
    const MAT = { bas: [520, 0.1, 0.32, '#e6e0d0', '#6b5d4a'], and: [760, 0.05, 0.2, '#d8d3c8', '#6f6a64'], rhy: [60, 0.05, 0.14, '#efe7da', '#a6937c'] }[id];
    const flowA = rn() * Math.PI;
    for (let i = 0; i < MAT[0]; i++) {
      const x = rn() * N, y = rn() * N, len = mm(rnd2(MAT[1], MAT[2])), wid = Math.max(1.3, len * rnd2(0.22, 0.34));
      const ang = flowA + (rn() - 0.5) * (id === 'rhy' ? 0.5 : 1.3);
      lath(x, y, ang, len, wid, MAT[3], MAT[4], false);
      if (okPos(x, y, len / 2) && len >= mm(0.08)) crys.push({ kind: 'xtal', id, x, y, ang, len, wid, name: id === 'rhy' ? '미세한 결정' : '작은 사장석', mat: true });
    }
    if (id !== 'rhy') for (let i = 0; i < 160; i++) { const x = rn() * N, y = rn() * N, r = rnd2(1, 2.4); o.fillStyle = id === 'bas' ? 'rgba(40,50,35,.85)' : 'rgba(40,36,32,.8)'; o.beginPath(); o.arc(x, y, r, 0, TAU); o.fill(); }
    // 반정
    const pheno = [];
    const place = (len, wid, tries) => {
      for (let t = 0; t < (tries || 300); t++) {
        const x = rnd2(40, N - 40), y = rnd2(40, N - 40), r = len / 2 + 4;
        if (!okPos(x, y, r)) continue;
        if (pheno.every((q) => Math.hypot(q.x - x, q.y - y) > q.r + r + 3)) { const p = { x, y, r }; pheno.push(p); return p; }
      }
      return null;
    };
    const addPh = (name, lenMin, lenMax, aspect, fill, stroke, shape, twin) => {
      const len = mm(rnd2(lenMin, lenMax)), wid = len * aspect, p = place(len, wid);
      if (!p) return;
      const ang = rn() * Math.PI;
      if (shape === 'round') {
        o.save(); o.translate(p.x, p.y); o.rotate(ang);
        const g = o.createRadialGradient(-len * 0.12, -len * 0.12, 1, 0, 0, len / 2); g.addColorStop(0, '#fff'); g.addColorStop(1, fill);
        o.fillStyle = g; o.beginPath();
        for (let a = 0; a < 12; a++) { const rr0 = (len / 2) * (0.86 + 0.14 * Math.sin(a * 2.7 + p.x)), th = (a / 12) * TAU; a ? o.lineTo(Math.cos(th) * rr0, Math.sin(th) * rr0 * aspect) : o.moveTo(Math.cos(th) * rr0, Math.sin(th) * rr0 * aspect); }
        o.closePath(); o.fill(); o.strokeStyle = stroke; o.lineWidth = 1.6; o.stroke();
        o.strokeStyle = 'rgba(70,60,40,.35)'; o.lineWidth = 1; o.beginPath(); o.moveTo(-len * 0.25, -len * 0.05); o.lineTo(len * 0.1, len * 0.12); o.lineTo(len * 0.22, -len * 0.08); o.stroke();
        o.restore();
      } else lath(p.x, p.y, ang, len, wid, fill, stroke, twin);
      crys.push({ kind: 'xtal', id, x: p.x, y: p.y, ang, len, wid: shape === 'round' ? len * aspect : wid, name, mat: false });
    };
    if (id === 'bas') {
      for (let i = 0; i < 5; i++) addPh('감람석 반정', 0.7, 1.3, 0.85, '#a3c24b', '#3f6212', 'round');
      for (let i = 0; i < 3; i++) addPh('휘석 반정', 0.6, 1.0, 0.55, '#2f3a2c', '#111827', 'lath');
      for (let i = 0; i < 2; i++) addPh('사장석 반정', 1.0, 1.6, 0.26, '#f3efe6', '#78716c', 'lath', true);
    } else if (id === 'and') {
      for (let i = 0; i < 6; i++) addPh('사장석 반정', 1.0, 2.0, 0.36, '#f2eee2', '#57534e', 'lath', true);
      for (let i = 0; i < 4; i++) addPh('각섬석 반정', 0.6, 1.2, 0.3, '#2a2724', '#0c0a09', 'lath');
    } else {
      for (let i = 0; i < 3; i++) addPh('석영 반정', 0.6, 1.0, 0.9, '#e5e7eb', '#6b7280', 'round');
      for (let i = 0; i < 2; i++) addPh('알칼리 장석 반정', 0.8, 1.2, 0.5, '#f1d9c4', '#a16207', 'lath', true);
    }
    return { c, crystals: crys, N, coarse: false };
  }
  function getSlide(id) { return SLIDE_CACHE[id] || (SLIDE_CACHE[id] = id === 'gra' || id === 'gab' ? genCoarse(id) : genPorph(id)); }

  /* 결정 하나 재기 (누른 위치 → 결정) */
  function pickCrystal(id, ux, uy) {
    const sl = getSlide(id);
    if (sl.coarse) {
      let best = -1, bd = 1e9;
      sl.sites.forEach((s, k) => { const d = Math.hypot(s.x - ux, s.y - uy); if (d < bd) { bd = d; best = k; } });
      return best < 0 ? null : sl.crystals[best];
    }
    let best = null, bs = 1e9;
    sl.crystals.forEach((c) => {
      const dx = ux - c.x, dy = uy - c.y, ca = Math.cos(-c.ang), sa = Math.sin(-c.ang), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
      const pad = Math.max(5, 11 - c.len * 0.3);
      if (Math.abs(lx) <= c.len / 2 + pad && Math.abs(ly) <= c.wid / 2 + pad) {
        const sc = Math.hypot(lx / (c.len / 2 + pad), ly / (c.wid / 2 + pad)) + (c.mat ? 0.35 : 0);
        if (sc < bs) { bs = sc; best = c; }
      }
    });
    return best;
  }
  const fmm = (mmv) => (mmv >= 1 ? mmv.toFixed(1) : mmv.toFixed(2)) + ' mm';
  const fovC = () => { const A = RC3.A; return { x: A.x + A.w / 2, y: A.y + 44 + RF + 6 }; };
  function fovPick(p) {
    const f = fovC(), ux = p.x - f.x + RF, uy = p.y - f.y + RF;
    if (Math.hypot(p.x - f.x, p.y - f.y) > RF) return false;
    const c = pickCrystal(S.slide, ux, uy);
    if (!c) { S.mark = { msg: 1, ux, uy, t: S.clock }; say('이곳은 석기(유리와 아주 작은 결정)예요. 알갱이를 따로 재기 어려우니 보이는 결정을 눌러 봐요.', true, 3.2); return true; }
    if (c.clipped) { say('이 결정은 시야 가장자리에서 잘렸어요. 다른 결정을 눌러 재어 봐요.', true, 3); return true; }
    let mm0, p1, p2;
    if (c.kind === 'cell') { mm0 = c.len / PXMM; p1 = c.p1; p2 = c.p2; }
    else { mm0 = c.len / PXMM; p1 = [c.x - (Math.cos(c.ang) * c.len) / 2, c.y - (Math.sin(c.ang) * c.len) / 2]; p2 = [c.x + (Math.cos(c.ang) * c.len) / 2, c.y + (Math.sin(c.ang) * c.len) / 2]; }
    mm0 = Math.round(mm0 * 100) / 100;
    S.mark = { c, mm: mm0, p1, p2, id: S.slide, t: S.clock, hl: c.kind === 'cell' ? cellHL(S.slide, c.k) : null };
    const L = S.meas[S.slide] || (S.meas[S.slide] = []);
    const key = c.kind === 'cell' ? 'c' + c.k : 'x' + Math.round(c.x) + '_' + Math.round(c.y);
    if (!L.some((e) => e.key === key)) L.push({ key, name: c.name, mm: mm0 });
    Sound.tick();
    return true;
  }
  function cellHL(id, k) {
    const sl = getSlide(id), N = sl.N, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const o = cv.getContext('2d'), img = o.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let d1 = 1e9, k1 = 0; for (let j = 0; j < sl.sites.length; j++) { const dx = sl.sites[j].x - x, dy = sl.sites[j].y - y, dd = dx * dx + dy * dy; if (dd < d1) { d1 = dd; k1 = j; } }
      if (k1 === k) { const i4 = (y * N + x) * 4; d[i4] = 255; d[i4 + 1] = 230; d[i4 + 2] = 80; d[i4 + 3] = 70; }
    }
    o.putImageData(img, 0, 0); return cv;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'thin' && (game && (game.has('thin') || game.free))) { fovPick(p); return false; }
      return false;
    },
  });

  /* 냉각 시간과 결정 크기 (예시 모형) */
  const LS = [1, 10, 100, 1000], KAPPA = 1e-6;
  const tCool = (L) => (L * L) / KAPPA;
  const xtalMM = (t) => 0.01 * Math.pow(t, 0.25);
  const fmmC = (v) => (v < 1 ? v.toFixed(1) : v < 9.95 ? v.toFixed(1) : String(Math.round(v))) + ' mm';
  const fL = (L) => (L >= 1000 ? '1 km' : L + ' m');
  const sciS = (t) => '10' + sup(Math.round(Math.log10(t))) + ' s';

  function drawThin(t, dt) {
    const { A, B, C } = RC3, f = fovC();
    S.slideK = approach(S.slideK, 1, dt, 5);
    card(A, PHONE ? '🔬 가상 현미경 (시야 지름 8 mm)' : '🔬 가상 현미경: 박편 관찰 (시야 지름 8 mm, 광물은 색으로 구분)');
    const sl = getSlide(S.slide);
    ctx.save(); ctx.beginPath(); ctx.arc(f.x, f.y, RF, 0, TAU); ctx.clip();
    ctx.globalAlpha = clamp(S.slideK * 1.2, 0, 1);
    ctx.drawImage(sl.c, f.x - RF, f.y - RF, 2 * RF, 2 * RF);
    ctx.globalAlpha = 1;
    // 측정 표시
    const m = S.mark;
    if (m && m.c && m.id === S.slide) {
      if (m.hl) ctx.drawImage(m.hl, f.x - RF, f.y - RF, 2 * RF, 2 * RF);
      else {
        ctx.save(); ctx.translate(f.x - RF + m.c.x, f.y - RF + m.c.y); ctx.rotate(m.c.ang);
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 3]);
        D.roundRect(-m.c.len / 2 - 3, -m.c.wid / 2 - 3, m.c.len + 6, m.c.wid + 6, 4); ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
      }
      const x1 = f.x - RF + m.p1[0], y1 = f.y - RF + m.p1[1], x2 = f.x - RF + m.p2[0], y2 = f.y - RF + m.p2[1];
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny) || 1;
      [[x1, y1], [x2, y2]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0] - (nx / nl) * 6, q[1] - (ny / nl) * 6); ctx.lineTo(q[0] + (nx / nl) * 6, q[1] + (ny / nl) * 6); ctx.stroke(); });
    }
    ctx.restore();
    // 렌즈 테두리
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(f.x, f.y, RF + 3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, RF - 1, 0.9 * Math.PI, 1.5 * Math.PI); ctx.stroke();
    if (m && m.c && m.id === S.slide) {
      const mx = f.x - RF + (m.p1[0] + m.p2[0]) / 2, my = f.y - RF + (m.p1[1] + m.p2[1]) / 2;
      D.label(clamp(mx, f.x - RF + 36, f.x + RF - 36), clamp(my - 16, f.y - RF + 14, f.y + RF - 14), m.c.name + ' ' + fmm(m.mm), { bg: '#dc2626', size: 13, pad: 7 });
    }
    // 눈금자
    const sx = f.x - RF + 22, sy = f.y + RF - 22;
    D.shadow(() => { ctx.fillStyle = 'rgba(15,23,42,.78)'; rr(sx - 10, sy - 20, PXMM + 52, 32, 8).fill(); }, { blur: 4, y: 1 });
    ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy - 2, PXMM, 4); ctx.fillRect(sx, sy - 8, 2, 16); ctx.fillRect(sx + PXMM - 2, sy - 8, 2, 16);
    D.text(sx + PXMM + 8, sy + 5 * FS, '1 mm', { size: 13, weight: 800, color: '#fff', align: 'left' });
    // 이름표
    const info = SL[S.slide];
    D.text(A.x + A.w / 2, f.y + RF + 28 * FS, info.ico + ' ' + info.name + ' 박편', { size: 17, weight: 800, color: '#1e293b' });
    drawWrap(A.x + A.w / 2, f.y + RF + 50 * FS, '결정을 눌러 길이를 재어 봐요. 눈금자(1 mm)와 비교하면 돼요.', A.w - 40, 13, { color: '#475569' });

    // B: 박편 정보
    card(B, '🧾 ' + info.name + ' 박편 정보');
    let yy = B.y + 46;
    D.text(B.x + 14, yy, '보이는 광물 (색 표시)', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    yy += 8;
    info.leg.forEach((q) => {
      yy += 24 * (PHONE ? 0.95 : 1);
      ctx.fillStyle = q[0]; rr(B.x + 14, yy - 14 * FS * 0.85, 18, 14, 3).fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; rr(B.x + 14, yy - 14 * FS * 0.85, 18, 14, 3).stroke();
      D.text(B.x + 40, yy - 2, q[1], { size: 13, weight: 700, color: '#334155', align: 'left' });
    });
    yy += 28;
    D.text(B.x + 14, yy, '측정한 결정', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    const L = S.meas[S.slide] || [];
    if (!L.length) D.text(B.x + 14, yy + 22, '아직 없어요', { size: 13, weight: 700, color: '#94a3b8', align: 'left' });
    L.slice(-(PHONE ? 3 : 4)).forEach((e, i) => D.text(B.x + 14, yy + 22 + i * 20, '• ' + e.name + ' ' + fmm(e.mm), { size: 13, weight: 700, color: '#334155', align: 'left' }));
    const seenN = SLIDE_IDS.filter((k) => S.seen[k]).length, measN = SLIDE_IDS.filter((k) => (S.meas[k] || []).length > 0).length;
    D.text(B.x + B.w - 12, B.y + B.h - 12, '본 박편 ' + seenN + '/5 · 재어 본 박편 ' + measN + '/5', { size: 12.5, weight: 800, color: '#0369a1', align: 'right' });

    // C: 냉각 시간과 결정 크기
    if (S.coolShow || (game && game.free)) drawCool(C, dt);
    else {
      card(C, '⏳ 냉각 시간과 결정 크기');
      drawWrap(C.x + C.w / 2, C.y + C.h / 2 - 8, '이 카드는 다음 미션에서 열려요. 박편 5종을 먼저 관찰해 봐요.', C.w - 40, 14, { color: '#64748b' });
    }
  }
  function drawCool(C, dt) {
    card(C, '⏳ 냉각 시간과 결정 크기 (κ = 10⁻⁶ m²/s, t = L²/κ)');
    S.coolT = approach(S.coolT, 1, dt, 0.7);
    const rows = LS.map((L, i) => ({ L, i, t: tCool(L), mm: xtalMM(tCool(L)) }));
    const top = C.y + 46, rh = (C.h - 56) / 4, bx = C.x + (PHONE ? 100 : 128), bw = C.w - (bx - C.x) - (PHONE ? 52 : 74);
    const X = (v) => bx + ((Math.log10(v) + 1) / 2.2) * bw;                 // 0.1 mm ~ 15.8 mm 로그 눈금
    rows.forEach((r) => {
      const y = top + r.i * rh, sel = S.L === r.i;
      if (sel) { ctx.fillStyle = 'rgba(14,165,233,.12)'; rr(C.x + 6, y, C.w - 12, rh - 2, 8).fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; rr(C.x + 6, y, C.w - 12, rh - 2, 8).stroke(); }
      const th = 8 + 7 * r.i;
      const hotK = sel ? 1 - S.coolT : 0;
      ctx.fillStyle = sel ? mixc('#6b7280', '#f97316', hotK) : '#6b7280'; rr(C.x + 14, y + rh / 2 - th / 2 - 1, 22, th, 3).fill();
      D.text(C.x + 44, y + rh / 2 - 3, '두께 ' + fL(r.L), { size: 13, weight: 800, color: '#334155', align: 'left' });
      D.text(C.x + 44, y + rh / 2 + 13, sciS(r.t), { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
      const k = sel ? S.coolT : 1, mmNow = Math.max(0.1, r.mm * k);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx, y + rh / 2 - 7, bw, 14);
      ctx.fillStyle = sel ? '#0ea5e9' : '#94a3b8'; ctx.fillRect(bx, y + rh / 2 - 7, clamp(X(mmNow) - bx, 0, bw), 14);
      D.text(bx + bw + 6, y + rh / 2 + 5, fmmC(r.mm * k), { size: 13, weight: 800, color: '#334155', align: 'left' });
    });
  }

  /* ======================================================
     장면 4: 암석 순환에서 화산 활동의 역할
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 360 }, B: { x: 8, y: 376, w: 504, h: 196 }, C: { x: 8, y: 580, w: 504, h: 132 } }
    : { A: { x: 12, y: 12, w: 430, h: 536 }, B: { x: 450, y: 12, w: 338, h: 296 }, C: { x: 450, y: 316, w: 338, h: 232 } };
  const NODEW = PHONE ? 98 : 104, NODEH = PHONE ? 34 : 38;
  const CU = PHONE ? { m: 0.46, l: 0.15, r: 0.77 } : { m: 0.5, l: 0.17, r: 0.72 };
  const CYC = {
    M: { u: CU.m, v: 0.18, t: '마그마', c: '#dc2626' },
    P: { u: CU.l, v: 0.4, t: '심성암', c: '#b45309' },
    V: { u: CU.r, v: 0.3, t: '🌋 화산 활동', c: '#ea580c' },
    R: { u: CU.r, v: 0.5, t: '화산암', c: '#92400e' },
    Sd: { u: CU.r, v: 0.7, t: '퇴적물', c: '#a16207' },
    Se: { u: CU.m, v: 0.86, t: '퇴적암(응회암 등)', c: '#a8a29e' },
    Me: { u: CU.l, v: 0.7, t: '변성암', c: '#6d28d9' },
    At: { u: CU.r, v: 0.1, t: '☁️ 기권(CO₂)', c: '#0ea5e9' },
  };
  const ARR = [
    { a: 'M', b: 'P', t: '지하에서 천천히 식음', roles: [] },
    { a: 'M', b: 'V', t: '분출', roles: [0, 1, 2] },
    { a: 'V', b: 'R', t: '용암이 굳음', roles: [0] },
    { a: 'V', b: 'At', t: 'CO₂·수증기', roles: [1] },
    { a: 'V', b: 'Sd', t: '화산재', roles: [2], bend: 1 },
    { a: 'R', b: 'Sd', t: '풍화·침식', roles: [] },
    { a: 'P', b: 'Sd', t: '융기·풍화', roles: [] },
    { a: 'Sd', b: 'Se', t: '다져져 굳음', roles: [2] },
    { a: 'Se', b: 'Me', t: '열과 압력', roles: [] },
    { a: 'Me', b: 'M', t: '용융', roles: [] },
  ];
  const cycBox = () => { const A = RC4.A; return { x: A.x + 10, y: A.y + 40, w: A.w - 20, h: A.h - 50 }; };
  const nodePos = (k) => { const b = cycBox(), n = CYC[k]; return { x: b.x + n.u * b.w, y: b.y + n.v * b.h }; };
  function edgePt(k, tx, ty) {
    const p = nodePos(k), dx = tx - p.x, dy = ty - p.y, hw = NODEW / 2 + 3, hh = NODEH / 2 + 3;
    const s = Math.min(dx ? hw / Math.abs(dx) : 1e9, dy ? hh / Math.abs(dy) : 1e9);
    return { x: p.x + dx * Math.min(1, s), y: p.y + dy * Math.min(1, s) };
  }
  const roleName = ['새 암석 공급', 'CO₂ 방출', '화산재 퇴적'];
  const ROLE_TXT = [
    '마그마가 지표로 나와 굳으면 새로운 화산암이 만들어져요. 이렇게 지구 내부 물질을 지표로 가져와 암석 순환을 시작해요. 해령·열점에서는 현무암, 섭입대에서는 안산암이 주로 만들어져요.',
    '화산 가스에는 수증기뿐 아니라 CO₂도 있어요. 화산 활동은 지권 깊은 곳의 탄소를 기권으로 되돌려 보내 탄소 순환을 이어 줘요(현재 약 0.1 GtC/년, 예시).',
    '화산재 같은 화산 쇄설물이 쌓여 굳으면 퇴적암인 응회암이 돼요. 화산 활동은 퇴적암의 재료도 공급해요.',
  ];
  function drawCycle(t, dt) {
    const { A, B, C } = RC4, bx = cycBox();
    card(A, '🔄 암석 순환과 화산 활동');
    // 화살표
    ARR.forEach((ar) => {
      const on = ar.roles.includes(S.role), pa = nodePos(ar.a), pb = nodePos(ar.b);
      let p1 = edgePt(ar.a, pb.x, pb.y), p2 = edgePt(ar.b, pa.x, pa.y);
      const col = on ? ['#dc2626', '#0ea5e9', '#a16207'][S.role] : '#cbd5e1';
      if (ar.bend) {
        const k = PHONE ? 54 : 46, q1 = { x: pa.x + NODEW / 2 + 3, y: pa.y + 6 }, q2 = { x: pb.x + NODEW / 2 + 3, y: pb.y - 6 };
        ctx.strokeStyle = col; ctx.lineWidth = on ? 4 : 2.4; ctx.setLineDash(on ? [] : [6, 5]);
        ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.bezierCurveTo(q1.x + k * 0.55, q1.y + 6, q2.x + k * 0.55, q2.y - 6, q2.x, q2.y); ctx.stroke(); ctx.setLineDash([]);
        poly([[q2.x + 0.5, q2.y + 3], [q2.x - 9, q2.y - 10], [q2.x + 9, q2.y - 10]]); ctx.fillStyle = col; ctx.fill();
        ctx.save(); ctx.translate(q1.x + k * 0.62 + 11, (q1.y + q2.y) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, ar.t, { size: 12.5, weight: 800, color: on ? col : '#94a3b8' }); ctx.restore();
        if (on && !RM) { const f = (t * 0.5) % 1, bz = (a, b2, c2, d2, tt) => (1 - tt) ** 3 * a + 3 * (1 - tt) ** 2 * tt * b2 + 3 * (1 - tt) * tt * tt * c2 + tt ** 3 * d2; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bz(q1.x, q1.x + k * 0.55, q2.x + k * 0.55, q2.x, f), bz(q1.y, q1.y + 6, q2.y - 6, q2.y, f), 4, 0, TAU); ctx.fill(); }
        return;
      }
      D.arrow(p1.x, p1.y, p2.x, p2.y, { color: col, width: on ? 4.2 : 2.4, head: on ? 14 : 10, alpha: on ? 1 : 0.9 });
      if (on && !RM) for (let i = 0; i < 3; i++) { const f = (t * 0.55 + i / 3) % 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lerp(p1.x, p2.x, f), lerp(p1.y, p2.y, f), 3.8, 0, TAU); ctx.fill(); }
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      D.text(mx, my - 5, ar.t, { size: 12.5, weight: 800, color: on ? col : '#94a3b8', stroke: '#fff', strokeWidth: 3.5 });
    });
    // 마디
    Object.keys(CYC).forEach((k) => {
      const n = CYC[k], p = nodePos(k);
      const on = (S.role === 0 && (k === 'R' || k === 'V')) || (S.role === 1 && (k === 'At' || k === 'V')) || (S.role === 2 && (k === 'Se' || k === 'Sd' || k === 'V'));
      if (on) D.glow(p.x, p.y, NODEW * 0.75, '#fde047', 0.45);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(p.x - NODEW / 2, p.y - NODEH / 2, NODEW, NODEH, 12).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = n.c; ctx.lineWidth = on ? 3.4 : 2.2; rr(p.x - NODEW / 2, p.y - NODEH / 2, NODEW, NODEH, 12).stroke();
      const small = n.t.length > 8;
      const nt = k === 'Se' && S.role === 2 ? '응회암(퇴적암)' : n.t;
      D.text(p.x, p.y + 5 * FS, nt, { size: small ? 12.5 : 14, weight: 800, color: '#1e293b' });
    });
    D.text(A.x + A.w / 2, A.y + A.h - 12, '굵은 화살표 = 화산 활동이 하는 일 (아래 단추로 바꿔요)', { size: 12.5, weight: 700, color: '#64748b' });

    // B: 판 경계별 화산
    card(B, '🗺️ 어디에서 어떤 마그마가 올라올까?');
    const q = { x: B.x + 10, y: B.y + 40, w: B.w - 20, h: B.h - 50 }, U = (u) => q.x + u * q.w, V = (v) => q.y + v * q.h;
    ctx.save(); rr(q.x, q.y, q.w, q.h, 10).clip();
    ctx.fillStyle = '#dbeafe'; ctx.fillRect(q.x, q.y, q.w, V(0.3));
    ctx.fillStyle = '#93c5fd'; ctx.fillRect(q.x, V(0.3), U(0.66) - q.x, V(0.12));         // 바닷물
    const mg = ctx.createLinearGradient(0, V(0.42), 0, q.y + q.h); mg.addColorStop(0, '#f59e0b'); mg.addColorStop(1, '#b45309');
    ctx.fillStyle = mg; ctx.fillRect(q.x, V(0.42), q.w, q.h);                                // 맨틀
    // 대륙 지각
    ctx.fillStyle = '#a8a29e'; poly([[U(0.64), V(0.3)], [q.x + q.w, V(0.3)], [q.x + q.w, V(0.5)], [U(0.64), V(0.44)]]); ctx.fill();
    ctx.fillStyle = '#86efac'; ctx.fillRect(U(0.64), V(0.27), q.w, V(0.03));
    // 해양 판 (암석권)
    ctx.fillStyle = '#64748b'; poly([[q.x, V(0.42)], [U(0.62), V(0.42)], [U(0.62), V(0.5)], [q.x, V(0.5)]]); ctx.fill();
    // 섭입하는 판
    ctx.fillStyle = '#64748b'; poly([[U(0.62), V(0.42)], [U(0.66), V(0.44)], [U(1), V(0.84)], [U(1), V(0.97)], [U(0.62), V(0.5)]]); ctx.fill();
    // 해령 (왼쪽): 마그마 상승
    ctx.fillStyle = '#dc2626'; poly([[U(0.07), V(0.5)], [U(0.13), V(0.5)], [U(0.105), V(0.4)]]); ctx.fill();
    ctx.fillStyle = '#7c2d12'; poly([[U(0.04), V(0.43)], [U(0.105), V(0.34)], [U(0.17), V(0.43)]]); ctx.fill();
    // 플룸 (가운데)
    const pg = ctx.createLinearGradient(0, V(0.95), 0, V(0.5)); pg.addColorStop(0, 'rgba(239,68,68,.95)'); pg.addColorStop(1, 'rgba(239,68,68,.55)');
    ctx.fillStyle = pg; poly([[U(0.33), V(0.97)], [U(0.43), V(0.97)], [U(0.395), V(0.55)], [U(0.375), V(0.55)]]); ctx.fill();
    ctx.fillStyle = '#7c2d12'; poly([[U(0.33), V(0.43)], [U(0.385), V(0.28)], [U(0.44), V(0.43)]]); ctx.fill();
    // 호상 화산 (오른쪽)
    ctx.fillStyle = '#78716c'; poly([[U(0.72), V(0.28)], [U(0.8), V(0.14)], [U(0.88), V(0.28)]]); ctx.fill();
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(U(0.8), V(0.14)); ctx.lineTo(U(0.78), V(0.62)); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; rr(q.x, q.y, q.w, q.h, 10).stroke();
    const lab = (x, y, a, b, c) => { D.label(x, y, a, { bg: c, size: 12.5, pad: 7 }); D.text(x, y + 22 * FS, b, { size: 12.5, weight: 800, color: '#1e293b', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); };
    lab(U(0.105), V(0.07), '해령', '현무암', '#dc2626');
    lab(U(0.385), V(0.07), '열점', '현무암', '#dc2626');
    lab(U(0.8), V(0.43 + 0.0), '섭입대', '안산암', '#7c3aed');
    if (S.role === 0 && !RM) { [[0.105, 0.4], [0.385, 0.3], [0.8, 0.18]].forEach((pp, i) => D.ring(U(pp[0]), V(pp[1]), 26, ((t * 0.7 + i * 0.33) % 1), { color: '#fde047' })); }
    D.text(q.x + q.w / 2, q.y + q.h - 8, '해양 지각은 해령에서 만들어지는 현무암질이 대부분이에요', { size: 12, weight: 800, color: '#fff', stroke: 'rgba(60,30,10,.7)', strokeWidth: 3 });

    // C: 역할 설명
    card(C, '📝 화산 활동의 역할 ' + (S.role + 1) + ': ' + roleName[S.role]);
    drawWrap(C.x + 16, C.y + (PHONE ? 52 : 56 * FS * 0.82), ROLE_TXT[S.role], C.w - 32, PHONE ? 13 : 14, { align: 'left', color: '#334155', lh: PHONE ? 1.25 : 1.34 });
    if (!PHONE) D.text(C.x + C.w - 12, C.y + C.h - 12, '연결: 지권 → 기권(가스) · 지권(화산재) → 퇴적', { size: 12, weight: 700, color: '#64748b', align: 'right' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { shape: '🌋 화산체의 형태', eject: '💨 분출물', thin: '🔬 박편 관찰', cycle: '🔄 암석 순환' };
  const FREE_KEYS = { shape: ['sVis', 'shapeBtns'], eject: ['sGas', 'sVis2'], thin: ['slides', 'coolL'], cycle: ['roles'] };
  let ctlKeys = [];
  const SELOPT = [{ id: 'lava', label: '용암' }, { id: 'gas', label: '화산 가스' }, { id: 'ash', label: '화산재' }, { id: 'lap', label: '화산력' }, { id: 'bomb', label: '화산탄·화산괴' }];
  const selEject = makeSelects($('#selEject'), [
    { id: 'A', label: '🔥 A. 붉게 흘러내리는 액체 암석' },
    { id: 'B', label: '💨 B. 분출구에서 새어 나오는 기체 (H₂O·CO₂·SO₂ 등)' },
    { id: 'C', label: '🌫️ C. 지름 0.5 mm의 가는 가루' },
    { id: 'D', label: '⚫ D. 지름 20 mm의 자갈 같은 알갱이' },
    { id: 'E', label: '🪨 E. 지름 300 mm, 날아가며 굳은 덩어리' },
    { id: 'F', label: '🧱 F. 지름 1000 mm의 각진 바위 조각' },
  ], SELOPT, { A: 'lava', B: 'gas', C: 'ash', D: 'lap', E: 'bomb', F: 'bomb' }, () => { S.bad = []; });
  const THOPT = [{ id: 'vg', label: '화산암 · 유리질 조직' }, { id: 'vp', label: '화산암 · 반상 조직' }, { id: 'pc', label: '심성암 · 조립질 조직' }];
  const selThin = makeSelects($('#selThin'), SLIDE_IDS.map((k) => ({ id: k, label: SL[k].ico + ' ' + SL[k].name + ' 박편' })), THOPT,
    { bas: 'vp', and: 'vp', rhy: ['vg', 'vp'], gra: 'pc', gab: 'pc' }, () => { });
  const stpYr = makeStepper($('#stpYr'), { min: 0, max: 20, step: 1, value: 0, unit: '년', dec: 0 });
  const pairRock = makePair($('#pairRock'),
    [{ id: 'bas', label: '현무암' }, { id: 'and', label: '안산암' }, { id: 'tuff', label: '응회암 (퇴적암)' }],
    [{ id: 'ash', label: '화산재가 쌓여 굳은 곳' }, { id: 'ridge', label: '해령·열점의 마그마가 굳은 곳' }, { id: 'sub', label: '섭입대의 화산' }],
    { bas: 'ridge', and: 'sub', tuff: 'ash' }, () => { });

  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode] : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); updateCtl(); }));
  const fVis = (v) => etaTxt(+v);
  SciSim.bindRange($('#sVis'), $('#oVis'), fVis, (v) => { S.vis = +v; volReset(); });
  SciSim.bindRange($('#sGas'), $('#oGas'), (v) => (+v).toFixed(1) + ' %', (v) => { S.gas = +v; });
  SciSim.bindRange($('#sVis2'), $('#oVis2'), fVis, (v) => { S.vis2 = +v; });
  function setVis(v) { S.vis = v; setSlider($('#sVis'), $('#oVis'), v, fVis); }
  function setGas(v) { S.gas = v; setSlider($('#sGas'), $('#oGas'), v, (x) => (+x).toFixed(1) + ' %'); }
  function setVis2(v) { S.vis2 = v; setSlider($('#sVis2'), $('#oVis2'), v, fVis); }
  function syncRun() { const b = $('#bRun'); b.textContent = S.run ? '⏸ 분출 멈춤' : VOL.used >= V0 - 1e-6 ? '🌋 다시 분출(새 화산)' : VOL.used > 0 ? '🌋 분출 이어가기' : '🌋 분출 시작'; b.classList.toggle('on', S.run); }
  $('#bRun').addEventListener('click', () => {
    Sound.click();
    if (S.run) S.run = false;
    else { if (VOL.used >= V0 - 1e-6) volReset(); S.run = true; S.started = true; }
    syncRun();
  });
  $('#bNewV').addEventListener('click', () => { Sound.click(); S.run = false; volReset(); syncRun(); });
  function syncSlides() { $$('#slideBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.id === S.slide)); }
  $$('#slideBtns .opt').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); S.slide = b.dataset.id; S.seen[S.slide] = true; S.slideK = 0; S.mark = null; syncSlides();
  }));
  function syncCool() { $$('#coolBtns .opt').forEach((b) => b.classList.toggle('on', +b.dataset.i === S.L)); }
  $$('#coolBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.L = +b.dataset.i; S.coolT = 0; syncCool(); }));
  function syncRoles() { $$('#roleBtns .opt').forEach((b) => b.classList.toggle('on', +b.dataset.i === S.role)); }
  $$('#roleBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.role = +b.dataset.i; S.roleSeen[S.role] = true; syncRoles(); }));
  $('#bEjReset').addEventListener('click', () => { Sound.click(); ejectReset(); });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    S.run = false; setVis(5); volReset(); syncRun();
    setGas(3); setVis2(2.5); ejectReset(); S.cardsShow = false; selEject.reset();
    S.slide = 'bas'; S.seen = { bas: true }; S.meas = {}; S.mark = null; S.slideK = 1; selThin.reset(); S.L = 1; S.coolT = 1; S.coolShow = false; stpYr.reset(); syncSlides(); syncCool();
    S.role = 0; S.roleSeen = { 0: true }; syncRoles(); pairRock.reset();
    flash.t = 0;
    if (li === 0) { setMode('shape'); setCtl(['sVis', 'shapeBtns']); showHint('점성 지수를 고르고 \'분출 시작\'을 눌러 화산체를 쌓아 봐요', 5200); }
    else if (li === 1) { setMode('eject'); setCtl(['sGas', 'sVis2']); showHint('점성 지수를 바꾸면 통로 속 기포가 어떻게 움직이는지 봐요', 5200); }
    else if (li === 2) { setMode('thin'); setCtl(['slides']); showHint('박편을 골라 결정을 눌러 보면 길이를 잴 수 있어요', 5200); }
    else { setMode('cycle'); setCtl(['roles']); showHint('역할 단추를 눌러 화산 활동이 하는 일을 살펴봐요', 5200); }
    updateCtl();
  }
  const slopeChip = (ok, d) => mark(ok) + ' 경사 ' + (d == null ? '—' : d + '°');
  const levels = [
    {
      title: '화산체 형태: 점성이 모양을 정해요', short: '화산체 형태', icon: '🌋', phase: '모형', features: ['shape'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 마그마인데 어떤 화산은 낮고 완만하고, 어떤 화산은 높고 폭발적일까? 암석 속 결정은 무엇을 기억하고 있을까?</p>' +
        '<div class="si-link">🔗 <b>일반선택 지구과학에서</b> 마그마는 SiO₂가 많을수록 점성이 크다는 것과 마그마가 만들어지는 조건을 배웠어요. 이번 차시는 그 결과가 <b>화산체의 모양, 분출물, 암석의 조직</b>을 어떻게 정하는지 따라가요.</div>' +
        '<p>화산의 모양은 분출구에서 나온 마그마가 얼마나 멀리 흐르는지로 정해져요. <b>점성 지수(log η)</b>를 바꾸고 분출시켜 화산체를 쌓아 봐요. 현무암질은 10²~10³, 안산암질은 약 10⁶, 유문암질은 10⁸ Pa·s 이상이에요. (단순화한 모형이에요.)</p>',
      setup() { resetStep(0); },
      recap: '점성이 작은 현무암질 마그마는 멀리 퍼져 완만한 순상 화산을, 점성이 큰 안산암질~유문암질 마그마는 가까이 쌓여 용암과 쇄설물이 번갈아 쌓인 성층 화산을 만들어요.',
      summary: '<ul><li><b>순상 화산</b>: 현무암질 마그마(점성 10²~10³ Pa·s)가 멀리 흘러 경사가 완만해요(마우나로아: 경사 약 5°, 높이 4170 m, 폭 약 120 km). 조용히 분출해요.</li><li><b>성층 화산</b>: 안산암질~유문암질 마그마(점성 약 10⁶~10⁸ Pa·s 이상)가 분출구 가까이 쌓여 경사가 커요(후지산·세인트헬렌스: 경사 약 30°). 용암과 화산 쇄설물이 번갈아 쌓여 층을 이뤄요.</li><li>모형 값: 점성 지수 2 → 경사 약 5°, 6 → 약 25°, 9 → 약 35°.</li><li>지구시스템 연계: 화산체는 지권의 마그마가 지표에서 굳어 쌓인 지형이에요.</li></ul>',
      missions: [
        {
          title: '순상 화산 만들기',
          goal: '점성 지수를 <b>3 이하</b>로 낮추고 마그마를 <b>60 % 이상</b> 분출시켜, 경사 <b>10° 이하</b>의 완만한 화산체를 만들어요.',
          hint: '점성 슬라이더를 왼쪽 끝(2~3)으로 옮긴 뒤 \'분출 시작\'을 눌러요. 마그마 방이 40 % 이하로 줄 때까지 기다려요.',
          setup() { S.run = false; setVis(5); volReset(); syncRun(); setMode('shape'); setCtl(['sVis', 'shapeBtns']); },
          check: () => { const d = slopeNow(); return d != null && d <= 10 && erupted() >= 0.6; }, hold: 0.5,
          status: () => { const d = slopeNow(); return slopeChip(d != null && d <= 10, d) + ' (목표 10° 이하) · ' + mark(erupted() >= 0.6) + ' 분출 ' + Math.round(erupted() * 100) + ' % (목표 60 %)'; },
          explain: '점성이 작은 현무암질 마그마는 <b>멀리 흘러</b> 경사가 약 5°~10°인 완만한 <b>순상 화산</b>을 만들어요. 하와이의 마우나로아가 대표적이에요.',
        },
        {
          title: '성층 화산 만들기',
          goal: '점성 지수를 <b>6 이상</b>으로 올리고 마그마를 <b>60 % 이상</b> 분출시켜, 경사 <b>25° 이상</b>이고 층이 쌓인 화산체를 만들어요.',
          hint: '점성 슬라이더를 오른쪽(6~9)으로 옮기고 \'분출 시작\'을 눌러요. 갈색 용암층과 연한 노란색 쇄설물층이 번갈아 쌓이면 돼요.',
          setup() { S.run = false; setVis(5); volReset(); syncRun(); setMode('shape'); setCtl(['sVis', 'shapeBtns']); },
          check: () => { const d = slopeNow(); return d != null && d >= 25 && erupted() >= 0.6 && VOL.layered && VOL.strata.length >= 5; }, hold: 0.5,
          status: () => { const d = slopeNow(); return slopeChip(d != null && d >= 25, d) + ' (목표 25° 이상) · ' + mark(erupted() >= 0.6) + ' 분출 ' + Math.round(erupted() * 100) + ' % · ' + mark(VOL.layered && VOL.strata.length >= 5) + ' 쌓인 층 ' + (VOL.layered ? VOL.strata.length : 0) + '겹 (목표 5겹)'; },
          explain: '점성이 큰 마그마는 멀리 흐르지 못하고 분출구 가까이에 쌓여 <b>경사가 큰 성층 화산</b>이 돼요. 폭발적으로 분출해 <b>용암과 화산 쇄설물이 번갈아</b> 층을 이뤄요.',
        },
        {
          type: 'quiz', title: '마우나로아와 후지산',
          goal: '마우나로아(경사 약 5°)와 후지산(경사 약 30°)의 모양이 다른 가장 큰 까닭은 무엇일까요?',
          setup() { setMode('shape'); setCtl(['sVis', 'shapeBtns']); },
          choices: ['마우나로아는 바다 위에, 후지산은 육지에 있기 때문이에요.', '마우나로아의 마그마는 점성이 작아 멀리 퍼지고, 후지산의 마그마는 점성이 커서 가까이 쌓이기 때문이에요.', '마우나로아의 마그마가 훨씬 차갑기 때문이에요.', '화산은 모두 같은 원뿔 모양으로 생기는데 오래된 정도만 다르기 때문이에요.'],
          answer: 1,
          feedback: ['화산이 놓인 장소가 아니라 마그마의 성질이 모양을 정해요.', '', '마그마가 차가워서가 아니라, 성질(점성)의 차이 때문이에요.', '화산이 모두 같은 원뿔 모양은 아니에요. 마그마의 점성에 따라 완만한 순상 화산과 가파른 성층 화산으로 나뉘어요.'],
          explain: '마그마의 <b>점성</b>이 화산체의 모양을 정해요. 점성이 작으면 멀리 퍼져 완만한 순상 화산, 점성이 크면 가까이 쌓여 가파른 성층 화산이 돼요.',
        },
      ],
    },
    {
      title: '분출물: 기포가 빠져나가는가', short: '분출물', icon: '💨', phase: '탐구', features: ['eject'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 점성이 큰 마그마는 가파른 성층 화산을 만든다고 했어요. 성층 화산은 왜 폭발적으로 분출할까요? 마그마에 녹아 있던 <b>가스</b>(주로 수증기)에 주목해요.</div>' +
        '<p>분출물은 <b>용암</b>, <b>화산 쇄설물</b>(화산재 &lt; 2 mm, 화산력 2~64 mm, 화산탄·화산괴 &gt; 64 mm), <b>화산 가스</b>예요. 마그마 통로를 오르는 기포(가스)가 빠져나가지 못하고 쌓이면 압력이 올라가 폭발해요. 용존 수증기는 현무암질 약 0.5~1 %, 유문암질 약 4~6 %예요. 점성과 수증기 양을 바꿔 비교해 봐요. (예시 모형)</p>',
      setup() { resetStep(1); },
      recap: '점성이 크면 기포가 빠져나가지 못해 압력이 쌓여 폭발적으로 분출하고, 점성이 작으면 가스가 빠져나가 조용히 분출해요. 분출물은 용암, 화산 쇄설물, 화산 가스예요.',
      summary: '<ul><li>분출물: <b>용암</b>, <b>화산 쇄설물</b>(화산재 지름 &lt; 2 mm · 화산력 2~64 mm · 화산탄·화산괴 &gt; 64 mm), <b>화산 가스</b>(<b>수증기가 가장 많고</b> CO₂, SO₂ 등).</li><li>점성이 큰 마그마는 가스가 빠져나가기 어려워 <b>압력이 쌓이다가 폭발</b>해요. 점성이 작으면 가스가 빠져나가 조용히 분출해요(수증기가 많아도 점성이 작으면 조용할 수 있어요).</li><li>용존 수증기: 현무암질 약 0.5~1 %, 유문암질 약 4~6 %.</li><li>지구시스템 연계: 화산 가스는 지권에서 기권으로 물질을 옮기고, 화산재는 다시 지표에 쌓여요.</li></ul>',
      missions: [
        {
          title: '폭발적 분출 일으키기',
          goal: '점성 지수를 <b>6 이상</b>으로 올려 통로에서 <b>폭발이 2번</b> 일어나게 해요. 점성이 작을 때(2~3)와도 비교해 봐요.',
          hint: '점성 슬라이더를 6 이상으로 올리고 수증기 양을 3 % 안팎으로 두면 몇 초 안에 압력이 가득 차서 폭발해요.',
          setup() { setVis2(2.5); setGas(3); ejectReset(); setMode('eject'); setCtl(['sGas', 'sVis2']); },
          check: () => S.vis2 >= 6 && S.nExpHi >= 2, hold: 0.3,
          status: () => mark(S.vis2 >= 6) + ' 점성 지수 ' + S.vis2 + ' (목표 6 이상) · ' + mark(S.nExpHi >= 2) + ' 폭발 ' + S.nExpHi + '회 (목표 2회)',
          explain: '점성이 큰 마그마에서는 기포가 <b>올라오는 데 오래 걸려</b> 통로에 갇혀요. 압력이 한계를 넘으면 <b>폭발</b>해 화산재, 화산탄이 날아가요. 점성이 작으면 기포가 빠져나가 용암이 조용히 흘러요.',
        },
        {
          title: '분출물 카드 분류', manual: true,
          goal: '카드 6장을 <b>용암 · 화산 가스 · 화산재 · 화산력 · 화산탄·화산괴</b> 중 알맞은 것으로 분류해요.',
          hint: '아래 지름 눈금을 봐요. 지름 2 mm 미만은 화산재, 2~64 mm는 화산력, 64 mm 초과는 화산탄·화산괴예요.',
          setup() { S.cardsShow = true; selEject.reset(); setMode('eject'); setCtl(['selEject']); },
          status: () => mark(selEject.ok()) + ' 분류한 카드 ' + selEject.count() + ' / 6',
          check() {
            if (!selEject.complete()) return '카드 6장을 모두 분류해 주세요. (지금 ' + selEject.count() + '장)';
            if (!selEject.ok()) { selEject.mark(selEject.wrong()); return '빨간 카드가 달라요. 지름 눈금에서 알갱이의 지름이 어디에 해당하는지 확인해 봐요.'; }
            return true;
          },
          explain: '화산 쇄설물은 지름으로 나눠요. <b>화산재 &lt; 2 mm</b>, <b>화산력 2~64 mm</b>, <b>화산탄·화산괴 &gt; 64 mm</b>예요. 화산 가스는 수증기가 가장 많아요.',
        },
        {
          type: 'quiz', title: '점성과 폭발',
          goal: '점성이 큰 마그마의 분출이 폭발적인 까닭은 무엇일까요?',
          setup() { S.cardsShow = false; setMode('eject'); setCtl(['sGas', 'sVis2']); },
          choices: ['점성이 크면 마그마의 온도가 높아 저절로 폭발하기 때문이에요.', '가스가 빠져나가기 어려워 압력이 쌓이다가 한꺼번에 터지기 때문이에요.', '점성이 큰 마그마에는 가스가 전혀 들어 있지 않기 때문이에요.', '점성이 크면 가스가 쉽게 빠져나가 한꺼번에 날아가기 때문이에요.'],
          answer: 1,
          feedback: ['폭발은 온도가 아니라 갇힌 가스의 압력 때문이에요.', '', '화산 가스(수증기 등)는 마그마에 녹아 있고, 유문암질에는 오히려 더 많아요.', '점성이 크면 오히려 가스가 빠져나가기 어려워요.'],
          explain: '점성이 크면 가스 기포가 <b>빠져나가기 어려워</b> 마그마 속에 갇히고 압력이 쌓여요. 한계를 넘으면 한꺼번에 터지는 <b>폭발적 분출</b>이 돼요.',
        },
      ],
    },
    {
      title: '박편 관찰: 결정이 기억하는 냉각', short: '박편 관찰', icon: '🔬', phase: '관찰', features: ['thin'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마그마가 지표로 분출하는 방식을 알아봤어요. 분출해 빨리 식은 <b>화산암</b>과 지하 깊은 곳에서 천천히 식은 <b>심성암</b>은 어떻게 다를까요? (일반선택 지구과학의 암석 분류를 이어요.)</div>' +
        '<p>가상 <b>편광현미경</b>으로 박편 5종을 관찰해요. 광학적 성질은 다루지 않고, 광물을 <b>색</b>으로 구분해 결정의 <b>크기와 모양(조직)</b>만 비교해요. 결정을 누르면 눈금자(1 mm)로 잰 길이를 보여 줘요. (예시 박편)</p>',
      setup() { resetStep(2); },
      recap: '화산암은 빨리 식어 유리질이거나 큰 결정(반정)이 작은 석기 속에 있는 반상 조직이고, 심성암은 천천히 식어 결정이 크게 자란 조립질 조직이에요.',
      summary: '<ul><li><b>화산암</b>: 지표 가까이에서 빨리 식음 → <b>유리질</b> 또는 <b>반상 조직</b>(큰 결정 <b>반정</b> + 작은 결정·유리 <b>석기</b>). 현무암·안산암·유문암.</li><li><b>심성암</b>: 지하 깊은 곳에서 천천히 식음 → 결정이 2~5 mm로 크고 고르게 맞물린 <b>조립질 조직</b>. 화강암·반려암.</li><li>냉각 시간 t ≈ L²/κ (κ = 10⁻⁶ m²/s): 두께 1 m → 약 12일, 10 m → 약 3년, 1 km → 약 3만 년. 두께가 1000배면 냉각 시간은 100만 배예요.</li><li>반정은 마그마 방에서 먼저 자란 결정, 석기는 분출 후 빨리 식은 부분이에요.</li><li>지구시스템 연계: 같은 마그마가 식는 장소(지표 vs 지하)에 따라 서로 다른 암석이 돼요.</li></ul>',
      missions: [
        {
          title: '박편을 관찰하고 분류하기', manual: true,
          goal: '박편 5종을 모두 보고 결정을 하나씩 잰 뒤, 각각 <b>화산암/심성암</b>과 <b>조직 이름</b>(유리질·반상·조립질)을 골라요.',
          hint: '박편 단추로 5종을 모두 바꿔 보고, 결정을 눌러 길이를 재요. 결정이 크고 고르게 맞물리면 조립질, 큰 결정이 작은 알갱이나 유리 속에 있으면 반상, 거의 유리면 유리질이에요.',
          setup() { selThin.reset(); setMode('thin'); setCtl(['slides', 'selThin']); },
          status: () => mark(SLIDE_IDS.every((k) => S.seen[k])) + ' 본 박편 ' + SLIDE_IDS.filter((k) => S.seen[k]).length + '/5 · ' + mark(SLIDE_IDS.every((k) => (S.meas[k] || []).length > 0)) + ' 결정을 잰 박편 ' + SLIDE_IDS.filter((k) => (S.meas[k] || []).length > 0).length + '/5 · ' + mark(selThin.ok()) + ' 분류 ' + selThin.count() + '/5',
          check() {
            const miss = SLIDE_IDS.filter((k) => !S.seen[k]);
            if (miss.length) return '아직 보지 않은 박편이 있어요: ' + miss.map((k) => SL[k].name).join(', ') + '. 박편 단추로 바꿔 관찰해 봐요.';
            const nm = SLIDE_IDS.filter((k) => !(S.meas[k] || []).length);
            if (nm.length) return '결정을 눌러 길이를 재어 보지 않은 박편이 있어요: ' + nm.map((k) => SL[k].name).join(', ') + '.';
            if (!selThin.complete()) return '박편 5종을 모두 분류해 주세요. (지금 ' + selThin.count() + '종)';
            if (!selThin.ok()) { selThin.mark(selThin.wrong()); return '빨간 박편이 달라요. 결정의 크기와 석기(또는 유리)의 유무를 다시 비교해 봐요.'; }
            return true;
          },
          explain: '<b>현무암·안산암</b>은 큰 반정이 작은 결정과 유리로 된 석기 속에 있는 <b>반상 조직</b>, <b>유문암</b>은 석기 대부분이 <b>유리질</b>(반정이 조금 섞이기도 해요)이에요. <b>화강암·반려암</b>은 결정이 크고 고르게 맞물린 <b>조립질</b>의 심성암이에요.',
        },
        {
          title: '두께 10 m 용암류의 냉각 시간',
          goal: '두께 L = <b>10 m</b>를 고르고, 냉각 시간 t = L²/κ (κ = 10⁻⁶ m²/s)를 <b>년</b>으로 바꿔 입력해요. (1년 ≈ 3×10⁷ 초)',
          hint: 't = (10 m)² / (10⁻⁶ m²/s) = 10⁸ 초예요. 10⁸ ÷ 3×10⁷ 은 약 3이에요. 두께 단추에서 10 m를 골라 확인해요.',
          setup() { S.coolShow = true; S.L = 0; S.coolT = 0; syncCool(); stpYr.reset(); setMode('thin'); setCtl(['coolL', 'stpYr']); },
          check: () => S.L === 1 && stpYr.value === 3, hold: 0.5,
          status: () => mark(S.L === 1) + ' 두께 ' + fL(LS[S.L]) + ' (목표 10 m) · ' + mark(stpYr.value === 3) + ' 입력한 냉각 시간 ' + stpYr.value + '년',
          explain: 't ≈ L²/κ = (10 m)² / 10⁻⁶ m²/s = 10⁸ 초 ≈ <b>3년</b>이에요. 두께가 1 m이면 약 12일, 1 km이면 약 3만 년이에요. 두께가 1000배가 되면 냉각 시간은 <b>100만 배</b>가 되어, 지하의 큰 마그마 방에서는 결정이 자랄 시간이 충분해요.',
        },
        {
          type: 'quiz', title: '결정이 큰 까닭',
          goal: '심성암의 결정이 크고, 반상 조직에 큰 결정(반정)이 있는 까닭으로 알맞은 것은?',
          setup() { S.coolShow = true; setMode('thin'); setCtl(['slides', 'coolL']); },
          choices: ['심성암은 지표에서 빨리 식어 결정이 크고, 반정은 분출한 뒤에 생겨요.', '심성암은 지하 깊은 곳에서 천천히 식어 결정이 크고, 반정은 마그마 방에서 먼저 자랐으며 작은 석기는 분출 뒤 빨리 식은 부분이에요.', '심성암은 점성이 작아서 결정이 크고, 반정과 석기는 같은 속도로 식어요.', '반정이 있는 암석은 모두 지하 깊은 곳에서만 식어요.'],
          answer: 1,
          feedback: ['빨리 식으면 결정이 자랄 시간이 부족해 작아져요. 심성암은 천천히 식은 암석이에요.', '', '결정 크기는 점성이 아니라 식는 속도(냉각 시간)와 관계가 깊어요. 반정과 석기는 식는 속도가 달랐어요.', '반상 조직은 지하(마그마 방)에서 천천히 식을 때 반정이 자라고, 이후 분출해 빨리 식으며 석기가 생겨요.'],
          explain: '결정이 자라려면 시간이 필요해요. 지하 깊은 곳에서 <b>천천히 식으면 큰 결정</b>(심성암의 조립질), 먼저 마그마 방에서 자란 <b>반정</b>이 분출 뒤 빨리 식은 작은 <b>석기</b> 속에 박힌 것이 <b>반상 조직</b>이에요.',
        },
      ],
    },
    {
      title: '암석 순환: 화산 활동의 역할', short: '암석 순환', icon: '🔄', phase: '적용', features: ['cycle'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 화산이 새 암석(화산암), 화산 쇄설물, 가스를 만든다는 것을 확인했어요. 이제 <b>암석 순환</b> 전체에서 화산 활동이 하는 일을 정리해요.</div>' +
        '<p>암석 순환도에서 역할 단추를 눌러 화산 활동이 하는 일 세 가지(<b>새 암석 공급, CO₂ 방출, 화산재 퇴적</b>)를 살펴보고, 판의 경계에 따라 어떤 암석이 만들어지는지 알아봐요.</p>',
      setup() { resetStep(3); },
      recap: '화산 활동은 새 화성암을 공급해 암석 순환을 시작하고, CO₂를 기권에 돌려보내며, 화산재로 퇴적암(응회암)의 재료를 공급해요.',
      summary: '<ul><li>화산 활동의 역할: ① 지구 내부 물질을 지표로 가져와 <b>새 화성암 공급</b>(순환의 출발점) ② <b>CO₂ 방출</b>(탄소 순환) ③ <b>화산재</b>가 쌓여 <b>응회암</b>(퇴적암) 생성.</li><li>마그마 생산량(어림): 해령 약 70 %, 섭입대 약 20 %, 열점 약 10 %.</li><li>판의 경계별 암석: 해령·열점 → <b>현무암</b>, 섭입대 → <b>안산암</b>.</li><li>해양 지각은 해령에서 만들어진 <b>현무암질</b>이 대부분이에요.</li><li>지구시스템 연계: 지권(마그마) → 기권(가스) → 수권·지권(퇴적)으로 물질이 이어져요.</li></ul>',
      missions: [
        {
          title: '암석과 생성 장소 짝짓기', manual: true,
          goal: '<b>현무암 · 안산암 · 응회암</b>을 각각 만들어지는 곳과 이어요.',
          hint: '오른쪽 그림을 봐요. 해령과 열점은 맨틀에서 올라온 현무암질 마그마, 섭입대는 안산암질 마그마예요. 응회암은 화산재가 굳은 퇴적암이에요.',
          setup() { pairRock.reset(); setMode('cycle'); setCtl(['roles', 'pairRock']); },
          status: () => mark(pairRock.ok()) + ' 이은 짝 ' + pairRock.count() + ' / 3',
          check() {
            if (!pairRock.complete()) return '세 가지를 모두 이어 주세요. (지금 ' + pairRock.count() + '개)';
            if (!pairRock.ok()) { pairRock.mark(pairRock.wrong()); return '빨간 짝이 달라요. 그림에서 해령·열점·섭입대에 적힌 암석을 확인해 봐요.'; }
            return true;
          },
          explain: '<b>해령·열점</b>에서는 맨틀 물질이 올라와 녹은 <b>현무암질</b> 마그마가, <b>섭입대</b>에서는 <b>안산암질</b> 마그마가 만들어져요. <b>응회암</b>은 화산재가 쌓여 굳은 퇴적암이에요.',
        },
        {
          type: 'quiz', title: '해양 지각과 현무암',
          goal: '해양 지각이 대부분 현무암질인 까닭으로 알맞은 것은?',
          setup() { setMode('cycle'); setCtl(['roles']); },
          choices: ['해양 지각은 퇴적암으로 이루어져 있기 때문이에요.', '해령에서 맨틀 물질이 올라와 녹아 생긴 현무암질 마그마가 해저에 분출해 굳기 때문이에요.', '해구에서 대륙 지각이 가라앉아 녹기 때문이에요.', '바닷물과 반응해 모든 암석이 현무암으로 변하기 때문이에요.'],
          answer: 1,
          feedback: ['해양 지각의 대부분은 퇴적암이 아니라 화성암(현무암질)이에요.', '', '해구에서는 해양 판이 가라앉아 소멸해요. 새 해양 지각은 해령에서 만들어져요.', '암석이 바닷물에 의해 현무암이 되지는 않아요. 마그마가 굳어 현무암이 돼요.'],
          explain: '해령에서 맨틀 물질이 올라오며 녹아 생긴 <b>현무암질 마그마</b>가 해저에 분출해 굳어 해양 지각을 이뤄요. 이렇게 화산 활동은 <b>새 암석을 공급</b>하며 암석 순환을 시작해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-volcano-rocks', mount: '#game', badge: '화산 탐험가', homeHref: '../../index.html#hs',
    featureLabels: { shape: '🌋 화산체 쌓기 모형', eject: '💨 분출물 · 기포 모형', thin: '🔬 가상 편광현미경', cycle: '🔄 암석 순환도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'shape') { const d = slopeNow(); setReadouts(['점성', etaTxt(S.vis), '화산체 경사각(측정)', d == null ? '—' : d + '° · ' + typeOfSlope(d), '분출한 마그마', Math.round(erupted() * 100) + ' %']); }
    else if (m === 'eject') { const st = steadyInfo(), T = tRise(S.vis2); setReadouts(['기포 상승 시간', T < 10 ? T.toFixed(1) + ' 초' : T < 1000 ? Math.round(T) + ' 초' : '1000초 이상', '폭발 횟수', S.nExp + '회', '분출 양식', st.explosive ? '폭발적' : '조용함']); }
    else if (m === 'thin') { const L = S.mark && S.mark.c && S.mark.id === S.slide ? fmm(S.mark.mm) : '—'; setReadouts(['박편', SL[S.slide].name, '잰 결정의 길이', L, '본 박편', SLIDE_IDS.filter((k) => S.seen[k]).length + ' / 5']); }
    else setReadouts(['역할', roleName[S.role], '해령·열점', '현무암', '섭입대', '안산암']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  SLIDE_IDS.forEach((k, i) => setTimeout(() => getSlide(k), 600 + i * 450));
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'shape') drawShape(t, dt);
    else if (S.mode === 'eject') drawEject(t, dt);
    else if (S.mode === 'thin') drawThin(t, dt);
    else drawCycle(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, VOL, BUB, SL, selThin, selEject, pairRock, stpYr, RF, PXMM, V0, critDeg, measure, steadyN, tRise, fovC,
    get game() { return game; }, setMode, setVis, setVis2, setGas, resetStep, updateCtl, volReset, shapeStep, relax, explode, ejectStep, ejectReset, getSlide, pickCrystal, fovPick,
    runShape(sec) { S.run = true; let k = Math.round(sec * 60); while (k-- > 0) shapeStep(1 / 60); syncRun(); },
    runEject(sec) { let k = Math.round(sec * 60); S.clock = S.clock || 0; while (k-- > 0) { S.clock += 1 / 60; ejectStep(1 / 60); } },
    measureAll() { SLIDE_IDS.forEach((k) => { S.seen[k] = true; S.meas[k] = [{ key: 'x', name: 'test', mm: 1 }]; }); },
    solveThin() { selThin.set('bas', 'vp'); selThin.set('and', 'vp'); selThin.set('rhy', 'vg'); selThin.set('gra', 'pc'); selThin.set('gab', 'pc'); },
    solveEj() { selEject.set('A', 'lava'); selEject.set('B', 'gas'); selEject.set('C', 'ash'); selEject.set('D', 'lap'); selEject.set('E', 'bomb'); selEject.set('F', 'bomb'); },
    solvePair() { pairRock.map = { bas: 'ridge', and: 'sub', tuff: 'ash' }; },
    syncSlides, syncCool, syncRoles,
  };
})();
