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
     정역학 균형과 연직 운동 (기압 분포 → 정역학 균형 → 기온과 층후 → 연직 운동)
     ====================================================== */
  initStage('#eef3f9', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  let game = null;
  const G0 = 9.8, RG = 287;

  /* 표준 대기 (예시) */
  const ZT = [0, 1, 2, 3, 5, 5.5, 8, 10, 11, 16], PT = [1013, 899, 795, 701, 540, 500, 357, 265, 227, 103];
  function pOf(z) {
    z = clamp(z, 0, 16); let i = 0; while (i < ZT.length - 2 && z > ZT[i + 1]) i++;
    const f = (z - ZT[i]) / (ZT[i + 1] - ZT[i]); return Math.exp(Math.log(PT[i]) + f * (Math.log(PT[i + 1]) - Math.log(PT[i])));
  }
  const massOf = (p) => (p * 100) / G0;           // 1 m² 위 공기 질량 (kg)
  const Tstd = (z) => (z < 11 ? 288 - 6.5 * z : 216.5);
  const rhoStd = (z) => (pOf(z) * 100) / (RG * Tstd(z));

  const S = {
    mode: 'pres', fade: 0, clock: 0,
    zS: 0, dots: [],
    rho: 1.2, dz: 100, grav: true, sOff: 0, vOff: 0, rhoSeen: {}, dzSeen: {}, gravOffSeen: false,
    view: 'cols', dTns: 20, viewSeen: { cols: true },
    cause: 'buoy', dTb: 1.0, dCv: 1.0, causeSeen: { buoy: true }, bT: 0, bRun: true,
  };

  /* ======================================================
     장면 1: 기압의 연직 분포
     ====================================================== */
  const RC1 = PHONE
    ? { G: { x: 8, y: 8, w: 504, h: 380 }, C: { x: 8, y: 396, w: 504, h: 316 } }
    : { C: { x: 12, y: 12, w: 270, h: 536 }, G: { x: 290, y: 12, w: 498, h: 536 } };
  const ZH = 16;
  // 공기 입자 (밀도에 비례해 분포)
  const NP = 150;
  const PARTS = (() => {
    const zs = [], cdf = []; let acc = 0;
    for (let z = 0; z <= ZH; z += 0.1) { acc += rhoStd(z) * 0.1; zs.push(z); cdf.push(acc); }
    const rn = seeded(5), a = [];
    for (let i = 0; i < NP; i++) { const u = (i + 0.5) / NP * acc; let k = 0; while (k < cdf.length - 1 && cdf[k] < u) k++; a.push({ z: zs[k], fx: rn(), ph: rn() * 6 }); }
    return a;
  })();
  function miniDial(cx, cy, r, val) {
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }, { blur: 8, y: 2 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (v) => a0 + (a1 - a0) * clamp(v / 1100, 0, 1);
    for (let v = 0; v <= 1100; v += 100) { const a = ang(v), big = v % 500 === 0; ctx.strokeStyle = '#475569'; ctx.lineWidth = big ? 2.4 : 1.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); ctx.lineTo(cx + Math.cos(a) * (r - (big ? 13 : 9)), cy + Math.sin(a) * (r - (big ? 13 : 9))); ctx.stroke(); }
    [0, 500, 1000].forEach((v) => { const a = ang(v); D.text(cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22) + 4, String(v), { size: 10.5, weight: 800, color: '#475569' }); });
    const a = ang(val); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14)); ctx.stroke();
    D.sphere(cx, cy, 4.5, '#334155', { gloss: false }); D.text(cx, cy + r * 0.52, 'hPa', { size: 11, weight: 800, color: '#64748b' });
  }
  const dialV = new SciSim.Spring(1013, { stiffness: 80, damping: 14 });
  function drawPres(t, dt) {
    const { C, G } = RC1, z = S.zS, p = pOf(z);
    dialV.target = p; dialV.update(dt);
    // 공기 기둥
    card(C, '🌍 1 m² 위의 공기 기둥');
    const c = { x: C.x + 12, y: C.y + 40, w: C.w - 24, h: C.h - 52 }; c.gy = c.y + c.h - 18; c.Y = (zz) => c.gy - ((c.gy - c.y - 8) * zz) / ZH;
    const colX = c.x + (PHONE ? 20 : 14), colW = PHONE ? c.w * 0.36 : c.w * 0.5;
    ctx.save(); rr(c.x, c.y, c.w, c.h, 12).clip();
    const sk = ctx.createLinearGradient(0, c.y, 0, c.gy); sk.addColorStop(0, '#1e3a8a'); sk.addColorStop(1, '#bfdbfe'); ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(c.x, c.gy, c.w, c.h);
    // 관측 고도 위쪽 공기(눌러요) 강조
    ctx.fillStyle = 'rgba(251,146,60,.18)'; ctx.fillRect(colX, c.y, colW, c.Y(z) - c.y);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(colX, c.y + 1, colW, c.gy - c.y - 1); ctx.setLineDash([]);
    PARTS.forEach((q) => { const x = colX + 6 + q.fx * (colW - 12) + Math.sin(t * 2 + q.ph) * 3, y = c.Y(q.z) + Math.cos(t * 1.7 + q.ph) * 3 - 3; ctx.fillStyle = q.z >= z ? 'rgba(254,215,170,.95)' : 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); });
    ctx.restore();
    [0, 4, 8, 12, 16].forEach((k) => D.text(c.x + 4, c.Y(k) - 3, k + ' km', { size: 11.5, weight: 800, color: '#e0f2fe', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3, alpha: 0 }));
    // 관측선과 기압계
    const yz = c.Y(z); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(colX - 6, yz); ctx.lineTo(colX + colW + 6, yz); ctx.stroke();
    D.label(colX + colW / 2, Math.min(c.gy - 50, Math.max(c.y + 16, yz - 14)), z.toFixed(1) + ' km', { bg: '#dc2626', size: 12.5, pad: 8 });
    const dx = PHONE ? c.x + c.w * 0.72 : c.x + c.w * 0.5, dr = PHONE ? 52 : 40;
    if (PHONE) miniDial(dx, c.y + 80, dr, dialV.value);
    const fm = Math.round(massOf(p)).toLocaleString('ko-KR');
    const tx = PHONE ? c.x + c.w * 0.5 : c.x + 8, ty = PHONE ? c.y + 156 : c.y + 20;
    if (!PHONE) { D.text(c.x + c.w - 8, c.y + 28, '기압', { size: 12, weight: 800, color: '#e0f2fe', align: 'right', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 }); miniDial(c.x + c.w - 54, c.y + 92, 46, dialV.value); }
    D.label(c.x + c.w / 2, c.gy - 4, '이 위의 공기 질량 = p/g ≈ ' + fm + ' kg', { bg: 'rgba(15,23,42,.75)', size: PHONE ? 12 : 12, pad: 8 });
    D.text(c.x + c.w - 8, Math.min(yz + 14, c.gy - 30), 'p = ' + Math.round(p) + ' hPa', { size: 13, weight: 800, color: '#fff', align: 'right', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });

    // 그래프
    card(G, '📈 고도에 따른 기압 (표준 대기, 예시)');
    const pb = { x: G.x + 52, y: G.y + 52, w: G.w - 52 - 20, h: G.h - 52 - (PHONE ? 70 : 64) };
    const X = (pp) => pb.x + (pb.w * pp) / 1100, Y = (zz) => pb.y + pb.h - (pb.h * zz) / ZH;
    ctx.fillStyle = '#f8fafc'; rr(pb.x, pb.y, pb.w, pb.h, 4).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 200, 400, 600, 800, 1000].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), pb.y); ctx.lineTo(X(v), pb.y + pb.h); ctx.stroke(); D.text(X(v), pb.y + pb.h + 15 * FS, String(v), { size: 12, weight: 700, color: '#64748b' }); });
    [0, 4, 8, 12, 16].forEach((v) => { ctx.beginPath(); ctx.moveTo(pb.x, Y(v)); ctx.lineTo(pb.x + pb.w, Y(v)); ctx.stroke(); D.text(pb.x - 6, Y(v) + 4.5, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(pb.x + pb.w / 2, pb.y + pb.h + 32 * FS, '기압 (hPa)', { size: 12.5, weight: 700, color: '#64748b' }); D.text(pb.x + 6, pb.y + 16, '높이 (km)', { size: 12, weight: 800, color: '#64748b', align: 'left' });
    ctx.save(); ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip();
    ctx.strokeStyle = 'rgba(37,99,235,.28)'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 160; k++) { const zz = k * 0.1, x = X(pOf(zz)), y = Y(zz); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    const dd = S.dots.slice().sort((a, b) => a - b);
    if (dd.length > 1) { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath(); dd.forEach((q, i) => { const x = X(pOf(q)), y = Y(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    dd.forEach((q) => { D.sphere(X(pOf(q)), Y(q), 5.2, '#2563eb', { gloss: false }); });
    D.dashedLine(pb.x, Y(z), X(p), Y(z), { color: '#64748b', width: 1.4 }); D.dashedLine(X(p), Y(z), X(p), pb.y + pb.h, { color: '#64748b', width: 1.4 });
    D.sphere(X(p), Y(z), 7, '#dc2626', { shadow: true });
    D.label(clamp(X(p) + 60, pb.x + 70, pb.x + pb.w - 60), clamp(Y(z) - 18, pb.y + 16, pb.y + pb.h - 14), z.toFixed(1) + ' km · ' + Math.round(p) + ' hPa', { bg: '#dc2626', size: 12.5, pad: 8 });
    D.text(G.x + 16, G.y + G.h - 12, '‘● 기록’ 단추로 점을 찍고, 곡선이 직선이 아닌지 살펴봐요 (기록한 점 ' + S.dots.length + '개)', { size: 12, weight: 800, color: '#475569', align: 'left' });
  }

  /* ======================================================
     장면 2: 정역학 균형
     ====================================================== */
  const RC2 = PHONE
    ? { B: { x: 8, y: 8, w: 504, h: 400 }, I: { x: 8, y: 416, w: 504, h: 296 } }
    : { B: { x: 12, y: 12, w: 500, h: 536 }, I: { x: 520, y: 12, w: 268, h: 536 } };
  const dpPa = () => S.rho * G0 * S.dz;
  function drawHydro(t, dt) {
    const { B, I: IP } = RC2, dp = dpPa(), W = S.rho * G0 * S.dz;
    // 중력이 없으면 위로 가속
    if (!S.grav) { S.vOff += 70 * dt; S.sOff += S.vOff * dt; if (S.sOff > 340) { S.sOff = -60; S.vOff = 20; } } else { S.vOff = 0; S.sOff = approach(S.sOff, 0, dt, 6); }
    card(B, '🧱 공기층(블록)에 작용하는 힘');
    const I = { x: B.x + 10, y: B.y + 36, w: B.w - 20, h: B.h - 46 };
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.y + I.h); sk.addColorStop(0, '#bfdbfe'); sk.addColorStop(1, '#eff6ff'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(I.x, I.y + I.h - 20, I.w, 20);
    const bw = PHONE ? 190 : 250, bh = 80 + ((S.dz - 50) / 450) * 120, cx = I.x + I.w * 0.45, cy0 = I.y + I.h * 0.52, cy = cy0 - S.sOff;
    // 블록
    const bx = cx - bw / 2, by = cy - bh / 2;
    const bg = ctx.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, 'rgba(96,165,250,' + (0.25 + 0.4 * S.rho / 1.3).toFixed(2) + ')'); bg.addColorStop(1, 'rgba(37,99,235,' + (0.3 + 0.45 * S.rho / 1.3).toFixed(2) + ')');
    ctx.fillStyle = bg; rr(bx, by, bw, bh, 8).fill(); ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.4; rr(bx, by, bw, bh, 8).stroke();
    const nm = Math.round(10 + 50 * (S.rho / 1.3)), rn = seeded(9);
    for (let k = 0; k < nm; k++) { const x = bx + 8 + rn() * (bw - 16) + Math.sin(t * 3 + k) * 2, y = by + 8 + rn() * (bh - 16) + Math.cos(t * 2.6 + k) * 2; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 2.3, 0, TAU); ctx.fill(); }
    D.text(cx, by + bh / 2 + 5, 'ρ = ' + S.rho.toFixed(2) + ' kg/m³ · Δz = ' + S.dz + ' m', { size: 12.5, weight: 800, color: '#0f172a', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 위·아래 압력
    D.arrow(cx - bw * 0.25, by - 56, cx - bw * 0.25, by - 4, { color: '#64748b', width: 6, head: 14 });
    D.text(cx - bw * 0.25 + 12, by - 30, '위 압력 p', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    D.arrow(cx - bw * 0.25, by + bh + 56, cx - bw * 0.25, by + bh + 4, { color: '#64748b', width: 6 + dp * 0.0035, head: 14 + dp * 0.0016 });
    D.text(cx - bw * 0.25 + 12, by + bh + 36, '아래 압력 p + Δp', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    // 합력 화살표 (눈금 같음): 압력 차의 위쪽 힘 vs 중력
    const k = 0.0042, lenA = 90;
    D.arrow(cx + bw * 0.62 + 8, cy + 6, cx + bw * 0.62 + 8, cy - lenA, { color: '#16a34a', width: 2 + dp * k, head: 12 + dp * k * 1.2 });
    D.text(cx + bw * 0.62 + 8, cy - lenA - 10, '압력 차의 힘 ↑', { size: 12, weight: 800, color: '#15803d', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    if (S.grav) { D.arrow(cx + bw * 0.62 + 52, cy - 6, cx + bw * 0.62 + 52, cy + lenA, { color: '#dc2626', width: 2 + W * k, head: 12 + W * k * 1.2 }); D.text(cx + bw * 0.62 + 52, cy + lenA + 18, '중력 ↓', { size: 12, weight: 800, color: '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); }
    ctx.restore();
    const bal = S.grav ? '균형: 압력 차의 힘 = 중력 (공기가 가만히 있어요)' : '중력이 없으면 압력 차의 힘 때문에 위로 달아나요!';
    D.label(I.x + I.w / 2, I.y + 18, bal, { bg: S.grav ? '#15803d' : '#b91c1c', size: PHONE ? 11.5 : 12.5, pad: 9 });

    // 계산 판
    card(IP, '🧮 Δp = ρ g Δz');
    const tx = IP.x + 14;
    const lines = [['ρ = ' + S.rho.toFixed(2) + ' kg/m³', '#334155'], ['g = 9.8 m/s²', '#334155'], ['Δz = ' + S.dz + ' m', '#334155'], ['Δp = ' + S.rho.toFixed(2) + ' × 9.8 × ' + S.dz, '#334155'], ['= ' + Math.round(dp).toLocaleString('ko-KR') + ' Pa', '#b91c1c'], ['= ' + (dp / 100).toFixed(1) + ' hPa', '#b91c1c']];
    lines.forEach((q, i) => D.text(tx, IP.y + 56 + i * 28 * FS * 0.9, q[0], { size: i >= 4 ? 16 : 14, weight: 800, color: q[1], align: 'left' }));
    drawWrap(IP.x + IP.w / 2, IP.y + 56 + 6 * 28 * FS * 0.9 + 6, '위쪽으로의 압력 경도력과 아래쪽 중력이 균형이라 공기가 떨어지지도, 우주로 달아나지도 않아요.', IP.w - 28, 12.5, { color: '#0369a1', weight: 800 });
    D.text(tx, IP.y + IP.h - 14, '기압은 높을수록 100 m당 감소량이 작아요 (밀도 ↓)', { size: 11.5, weight: 700, color: '#64748b', align: 'left', alpha: PHONE ? 0 : 1 });
  }

  /* ======================================================
     장면 3: 기온과 층후
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 430 }, I: { x: 8, y: 446, w: 504, h: 266 } }
    : { A: { x: 12, y: 12, w: 520, h: 536 }, I: { x: 540, y: 12, w: 248, h: 536 } };
  const thickM = (T) => ((RG * T) / G0) * Math.log(2);              // 1000~500 hPa 층후 (m)
  const pAtZ = (T, zk) => 1000 * Math.exp((-zk * 1000) / ((RG * T) / G0));
  const COLT = [250, 270, 290], COLC = ['#3b82f6', '#64748b', '#ef4444'], COLN = ['찬 공기 기둥', '보통 기둥', '따뜻한 공기 기둥'];
  const spH = COLT.map((T) => new SciSim.Spring(thickM(T) / 1000, { stiffness: 70, damping: 12 }));
  const NSsp = { z: new SciSim.Spring(thickM(280) / 1000, { stiffness: 70, damping: 12 }), zn: new SciSim.Spring(thickM(260) / 1000, { stiffness: 70, damping: 12 }) };
  const fmt2 = (m) => (m / 1000).toFixed(2);
  function drawThick(t, dt) {
    const { A, I: IP } = RC3;
    const I = { x: A.x + 10, y: A.y + 36, w: A.w - 20, h: A.h - 46 }; I.gy = I.y + I.h - 26; const pxk = (I.gy - I.y - 54) / 6.6; I.Y = (zk) => I.gy - zk * pxk;
    card(A, S.view === 'cols' ? '🌡️ 같은 지상 기압(1000 hPa)의 공기 기둥 3개' : '🧭 남북 단면: 같은 지상 기압, 다른 기온');
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#dbeafe'); sk.addColorStop(1, '#f8fafc'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(I.x, I.gy, I.w, 26);
    [0, 1, 2, 3, 4, 5, 6].forEach((k) => { ctx.strokeStyle = 'rgba(100,116,139,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(I.x, I.Y(k)); ctx.lineTo(I.x + I.w, I.Y(k)); ctx.stroke(); if (k) D.text(I.x + 6, I.Y(k) - 3, k + ' km', { size: 11.5, weight: 800, color: '#64748b', align: 'left' }); });
    if (S.view === 'cols') {
      const cw = I.w / 3;
      COLT.forEach((T, i) => {
        spH[i].target = thickM(T) / 1000; spH[i].update(dt);
        const x0 = I.x + i * cw + cw * 0.18, w = cw * 0.64, top = I.Y(spH[i].value);
        const g = ctx.createLinearGradient(0, top, 0, I.gy); g.addColorStop(0, rgba(COLC[i], 0.12)); g.addColorStop(1, rgba(COLC[i], 0.4)); ctx.fillStyle = g; ctx.fillRect(x0, top, w, I.gy - top);
        const n = 70, rn = seeded(7 + i);
        for (let k = 0; k < n; k++) { const f = Math.pow(rn(), 1.7), zk = f * spH[i].value, x = x0 + 6 + rn() * (w - 12) + Math.sin(t * 2 + k) * 2, y = I.Y(zk); if (rn() > 0.55 + 0.45 * Math.exp(-zk / (T / 40))) { } ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = COLC[i]; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x0 - 6, top); ctx.lineTo(x0 + w + 6, top); ctx.stroke();
        D.label(x0 + w / 2, top - 16, '500 hPa 면 ' + fmt2(spH[i].value * 1000) + ' km', { bg: COLC[i], size: 12, pad: 7 });
        D.text(x0 + w / 2, I.gy + 18, COLN[i] + ' ' + T + ' K', { size: 12, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
        D.text(x0 + w / 2, I.Y(0.4), '1000 hPa', { size: 11.5, weight: 800, color: '#0f172a' });
      });
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(I.x, I.Y(5.5)); ctx.lineTo(I.x + I.w, I.Y(5.5)); ctx.stroke(); ctx.setLineDash([]);
      D.text(I.x + I.w - 6, I.Y(5.5) + 16, '5.5 km', { size: 12, weight: 800, color: '#6d28d9', align: 'right' });
    } else {
      const Tm = 270, TS = Tm + S.dTns / 2, TN = Tm - S.dTns / 2;
      NSsp.z.target = thickM(TS) / 1000; NSsp.zn.target = thickM(TN) / 1000; NSsp.z.update(dt); NSsp.zn.update(dt);
      const xl = I.x + 36, xr = I.x + I.w - 36, zl = NSsp.z.value, zr = NSsp.zn.value;
      const tilt = (zk) => zk; // 높이 그대로 그림 (기울기는 실제 값이며 눈에 잘 띄지 않으면 확대 눈금 표시)
      const Ys = (zk) => I.Y(zk);
      const g = ctx.createLinearGradient(xl, 0, xr, 0); g.addColorStop(0, 'rgba(239,68,68,.28)'); g.addColorStop(1, 'rgba(59,130,246,.28)');
      ctx.fillStyle = g; poly([[xl, I.gy], [xr, I.gy], [xr, Ys(zr)], [xl, Ys(zl)]]); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(xl, Ys(zl)); ctx.lineTo(xr, Ys(zr)); ctx.stroke();
      D.label((xl + xr) / 2, Math.min(Ys(zl), Ys(zr)) - 24, '500 hPa 등압면 (남북 높이 차 ' + Math.round(thickM(TS) - thickM(TN)) + ' m)', { bg: '#0f172a', size: 12, pad: 8 });
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(xl, I.Y(5.5)); ctx.lineTo(xr, I.Y(5.5)); ctx.stroke(); ctx.setLineDash([]);
      const pS = pAtZ(TS, 5.5), pN = pAtZ(TN, 5.5);
      D.label(xl + 40, I.Y(5.5) + 22, Math.round(pS) + ' hPa', { bg: '#ef4444', size: 12, pad: 7 }); D.label(xr - 40, I.Y(5.5) + 22, Math.round(pN) + ' hPa', { bg: '#3b82f6', size: 12, pad: 7 });
      const al = clamp((pS - pN) * 2.2, 0, 120); if (al > 4) D.arrow((xl + xr) / 2 - al / 2, I.Y(5.5) + 30, (xl + xr) / 2 + al / 2, I.Y(5.5) + 30, { color: '#7c3aed', width: 5, head: 14 });
      D.text((xl + xr) / 2, I.Y(5.5) + 56, '상층 기압 경도력 (높은 기압 → 낮은 기압)', { size: 11.5, weight: 800, color: '#6d28d9', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3, alpha: al > 4 ? 1 : 0 });
      D.text(xl, I.gy + 18, '남쪽 (따뜻 ' + TS.toFixed(0) + ' K)', { size: 12, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 }); D.text(xr, I.gy + 18, '북쪽 (찬 ' + TN.toFixed(0) + ' K)', { size: 12, weight: 800, color: '#fff', align: 'right', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    }
    ctx.restore();

    card(IP, '🧮 층후 Δz = (R T̄ / g) ln(p₁/p₂)');
    const tx = IP.x + 14;
    D.text(tx, IP.y + 56, 'R = 287 J/(kg·K), g = 9.8 m/s²', { size: 12.5, weight: 800, color: '#475569', align: 'left' });
    D.text(tx, IP.y + 56 + 24 * FS * 0.9, 'p₁ / p₂ = 1000 / 500 → ln 2 = 0.693', { size: 12.5, weight: 800, color: '#475569', align: 'left' });
    COLT.forEach((T, i) => { const y = IP.y + 56 + (58 + i * 52) * FS * 0.9; ctx.fillStyle = rgba(COLC[i], 0.14); rr(IP.x + 10, y - 16, IP.w - 20, 46 * FS * 0.9, 8).fill(); D.text(tx, y + 2, 'T̄ = ' + T + ' K → 층후 ' + fmt2(thickM(T)) + ' km', { size: 13, weight: 800, color: COLC[i], align: 'left' }); D.text(tx, y + 2 + 20 * FS * 0.9, '5.5 km의 기압 ' + Math.round(pAtZ(T, 5.5)) + ' hPa', { size: 12.5, weight: 800, color: '#334155', align: 'left' }); });
    drawWrap(IP.x + IP.w / 2, IP.y + 56 + 232 * FS * 0.9, '따뜻한 기둥은 밀도가 작아 같은 기압 간격이 더 두꺼워요. 그래서 따뜻한 쪽의 500 hPa 면이 더 높고, 같은 높이에서는 따뜻한 쪽의 기압이 더 높아요.', IP.w - 28, 12.5, { color: '#0369a1', weight: 800 });
  }

  /* ======================================================
     장면 4: 연직 운동의 원인
     ====================================================== */
  const RC4 = PHONE
    ? { V: { x: 8, y: 8, w: 504, h: 392 }, I: { x: 8, y: 408, w: 504, h: 304 } }
    : { V: { x: 12, y: 12, w: 776, h: 396 }, I: { x: 12, y: 416, w: 776, h: 132 } };
  const aOf = () => (G0 * S.dTb) / 300, t1km = () => Math.sqrt(2000 / aOf());
  const wOfD = () => S.dCv * 1e-5 * 2000;
  function drawVert(t, dt) {
    const { V, I: IP } = RC4, cz = S.cause;
    const I = { x: V.x + 10, y: V.y + 36, w: V.w - 20, h: V.h - 46 }; I.gy = I.y + I.h - 22;
    card(V, ({ buoy: '🔥 부력: 주변보다 따뜻한 덩어리는 위로 가속돼요', conv: '🧭 수평 수렴: 지상에서 모이면 위로 올라가요', terr: '⛰️ 지형: 산을 만나면 강제로 올라가요', front: '🌫️ 전선: 찬 공기 쐐기 위로 밀려 올라가요' })[cz]);
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const sk = ctx.createLinearGradient(0, I.y, 0, I.gy); sk.addColorStop(0, '#93c5fd'); sk.addColorStop(1, '#eff6ff'); ctx.fillStyle = sk; ctx.fillRect(I.x, I.y, I.w, I.h);
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(I.x, I.gy, I.w, 22);
    const cx = I.x + I.w / 2;
    if (cz === 'buoy') {
      const a = aOf(), T1 = t1km(), k = T1 / 5.5;                    // 1 km 상승을 약 5.5초로 보여 줘요 (시간 압축)
      if (S.bRun) S.bT += dt * k;
      const zm = 0.5 * a * S.bT * S.bT, pxk = (I.gy - I.y - 40) / 1.3, y = I.gy - 24 - zm / 1000 * pxk;
      if (zm >= 1250) { S.bRun = false; S.bHold = (S.bHold || 0) + dt; if (S.bHold > 1.2) { S.bT = 0; S.bHold = 0; S.bRun = true; } }
      for (let kk = 0; kk <= 1; kk += 0.5) { const yy = I.gy - 24 - kk * pxk; ctx.strokeStyle = 'rgba(30,64,175,.45)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(I.x, yy); ctx.lineTo(I.x + I.w, yy); ctx.stroke(); ctx.setLineDash([]); D.text(I.x + 8, yy - 4, kk * 1000 + ' m', { size: 12, weight: 800, color: '#1e3a8a', align: 'left' }); }
      // 주변 공기 점
      for (let q = 0; q < 24; q++) { const x = I.x + 20 + ((q * 97) % (I.w - 40)), yy = I.y + 20 + ((q * 53) % (I.gy - I.y - 40)); ctx.fillStyle = 'rgba(30,64,175,.18)'; ctx.beginPath(); ctx.arc(x, yy, 3, 0, TAU); ctx.fill(); }
      const Tq = 300 + S.dTb;
      if (!RM && S.bRun) parts.emit({ x: cx + rnd(-8, 8), y: y + 18, vx: 0, vy: 20, life: 0.8, size: 4, color: 'rgba(239,68,68,.45)', shape: 'smoke', grow: 4 });
      D.glow(cx, y, 40, '#ef4444', 0.4); D.sphere(cx, y, 20, '#f87171', { shadow: true }); D.text(cx, y + 4.5, '+' + S.dTb.toFixed(1) + ' K', { size: 12, weight: 800, color: '#fff' });
      D.arrow(cx + 44, y + 16, cx + 44, y - 36, { color: '#dc2626', width: 2 + S.dTb * 1.2, head: 12 });
      D.label(cx + 70, y, 'a = g ΔT / T = ' + a.toFixed(3) + ' m/s²', { bg: '#b91c1c', size: 12.5, pad: 8, align: 'left' });
      D.label(I.x + I.w - 10, I.y + 22, '지금 ' + Math.max(0, Math.round(zm)) + ' m · ' + Math.round(S.bT) + ' s', { bg: 'rgba(15,23,42,.75)', size: 12.5, pad: 8, align: 'right' });
    } else if (cz === 'conv') {
      const w = wOfD(), H = I.gy - I.y - 40;
      const zb = I.gy - 6, ztop = I.gy - H * 0.9;
      ctx.fillStyle = 'rgba(14,165,233,.1)'; ctx.fillRect(I.x + I.w * 0.2, ztop, I.w * 0.6, zb - ztop); ctx.strokeStyle = '#0369a1'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.strokeRect(I.x + I.w * 0.2, ztop, I.w * 0.6, zb - ztop); ctx.setLineDash([]);
      D.text(I.x + I.w * 0.2 + 8, ztop + 16, '수렴층 두께 h = 2 km', { size: 12, weight: 800, color: '#0369a1', align: 'left' });
      const wc = D.arrow;
      for (let kk = 0; kk < 4; kk++) { const y = zb - 24 - kk * 18, dxx = 70 + (kk % 2) * 6, ph = (t * 40 + kk * 17) % 40; wc(I.x + I.w * 0.2 - 40 + ph * 0.2, y, cx - 26, y, { color: '#0284c7', width: 4 + S.dCv * 1.5, head: 11, alpha: 0.8 }); wc(I.x + I.w * 0.8 + 40 - ph * 0.2, y, cx + 26, y, { color: '#0284c7', width: 4 + S.dCv * 1.5, head: 11, alpha: 0.8 }); }
      D.arrow(cx, zb - 100, cx, ztop + 18, { color: '#16a34a', width: 4 + (w / 0.06) * 6, head: 18 });
      D.label(cx + 70, (zb + ztop) / 2, 'w = D × h = ' + (S.dCv * 1e-5).toExponential(1).replace('e-5', '×10⁻⁵').replace('e-6', '') + ' × 2000 = ' + w.toFixed(3) + ' m/s', { bg: '#15803d', size: 12.5, pad: 8, align: 'left' });
      D.label(cx - 130, zb - 120, '수평 수렴 D', { bg: '#0369a1', size: 12.5, pad: 8 });
      if (!RM && Math.random() < dt * 8) parts.emit({ x: cx + rnd(-30, 30), y: zb - 30, vx: 0, vy: -20 - w * 1200, life: 1.6, size: 3, color: 'rgba(255,255,255,.8)' });
    } else if (cz === 'terr') {
      ctx.fillStyle = '#78716c'; poly([[I.x + I.w * 0.4, I.gy], [I.x + I.w * 0.62, I.y + 80], [I.x + I.w * 0.86, I.gy]]); ctx.fill();
      for (let kk = 0; kk < 5; kk++) { const y = I.gy - 30 - kk * 38, x1 = I.x + 30 + ((t * 70 + kk * 40) % 120); D.arrow(x1, y, I.x + I.w * (0.4 + 0.22 * (I.gy - y) / (I.gy - I.y - 80)) - 20, y - 18 * (kk + 1) * 0.35, { color: '#0284c7', width: 4, head: 11, alpha: 0.85 }); }
      for (let q = 0; q < 3; q++) { drawCloud(I.x + I.w * (0.5 + q * 0.1), I.y + 60 + q * 8, 1.0 + 0.2 * q, 0.95); }
      D.label(I.x + 16, I.y + 24, '산비탈을 따라 강제로 올라가요 → 구름·산악 강수', { bg: '#0369a1', size: 12.5, pad: 8, align: 'left' });
    } else {
      // 한랭 전선: 찬 공기가 쐐기 모양(앞쪽이 가파름)으로 파고들고, 따뜻한 공기는 그 비탈을 따라 밀려 올라가요
      const nx0 = I.x + I.w * 0.36, wh = 190, onS = (x, off) => ({ x, y: I.gy - wh * clamp((nx0 - x) / (nx0 - I.x), 0, 1) - off });
      ctx.fillStyle = 'rgba(59,130,246,.55)'; poly([[I.x, I.gy], [nx0, I.gy], [I.x, I.gy - wh]]); ctx.fill();
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nx0, I.gy); ctx.lineTo(I.x, I.gy - wh); ctx.stroke();
      D.label(I.x + 14, I.gy - 40, '찬 공기 (쐐기)', { bg: '#1d4ed8', size: 12.5, pad: 8, align: 'left' });
      D.arrow(I.x + I.w * 0.5, I.gy - 70, I.x + I.w * 0.5 + 60, I.gy - 70, { color: '#1d4ed8', width: 4, head: 11, alpha: 0.0 });
      const path = [[I.x + I.w * 0.9, I.gy - 26], [nx0 + 6, I.gy - 26], [onS(I.x + 24, 24).x, onS(I.x + 24, 24).y]], seg = [Math.hypot(path[1][0] - path[0][0], path[1][1] - path[0][1]), Math.hypot(path[2][0] - path[1][0], path[2][1] - path[1][1])], tot = seg[0] + seg[1];
      for (let kk = 0; kk < 4; kk++) { const ph = ((t * 0.3 + kk * 0.25) % 1) * tot; let px, py; if (ph < seg[0]) { const f = ph / seg[0]; px = lerp(path[0][0], path[1][0], f); py = lerp(path[0][1], path[1][1], f); } else { const f = (ph - seg[0]) / seg[1]; px = lerp(path[1][0], path[2][0], f); py = lerp(path[1][1], path[2][1], f); } D.sphere(px, py, 8, '#fb923c', { gloss: false }); }
      const a0 = onS(nx0 - 40, 26), a1 = onS(I.x + 60, 26);
      D.arrow(a0.x, a0.y, a1.x, a1.y, { color: '#f97316', width: 6, head: 16 });
      D.label(I.x + I.w - 14, I.gy - 40, '따뜻한 공기', { bg: '#c2410c', size: 12.5, pad: 8, align: 'right' });
      for (let q = 0; q < 4; q++) drawCloud(I.x + I.w * (0.28 + q * 0.12), I.y + 70 + (q % 2) * 18, 1.1 + 0.15 * q, 0.95);
      D.label(I.x + I.w * 0.5, I.y + 24, '찬 공기 위로 밀려 올라가며 적운이 생겨요', { bg: '#0369a1', size: 12.5, pad: 8 });
    }
    ctx.restore();

    card(IP, '📋 이 원인으로 올라가는 연직 속도');
    const tx = IP.x + 16;
    let ln = [];
    if (cz === 'buoy') { const T1 = t1km(); ln = ['a = g ΔT / T = 9.8 × ' + S.dTb.toFixed(1) + ' / 300 = ' + aOf().toFixed(3) + ' m/s²', '1 km 상승 시간 t = √(2z / a) = √(2000 / ' + aOf().toFixed(3) + ') = ' + Math.round(T1) + ' s ≈ ' + (T1 / 60).toFixed(1) + '분', '소나기구름 속 상승류가 이 방식이에요. (연직 속도 수 m/s)']; }
    else if (cz === 'conv') { const w = wOfD(); ln = ['연속 방정식(밀도 일정): ∂w/∂z = −(수평 발산) = 수렴', 'w = D × h = ' + S.dCv.toFixed(1) + '×10⁻⁵ × 2000 = ' + w.toFixed(3) + ' m/s = ' + (w * 100).toFixed(1) + ' cm/s', '하루(86400 s)에 약 ' + (w * 86400 / 1000).toFixed(1) + ' km 올라가요. 저기압 중심 구름이 이 방식이에요.']; }
    else if (cz === 'terr') ln = ['바람이 산을 만나면 산비탈을 따라 강제로 올라가요.', '올라가는 공기가 식어 구름이 생기고 산악 강수가 내려요.', '(앞 차시의 푄 현상과 같은 장면이에요)'];
    else ln = ['찬 공기는 무거워서 쐐기처럼 파고들고, 따뜻한 공기는 그 위로 밀려 올라가요.', '한랭 전선에서는 좁은 구간에서 빠르게 올라 적운형 구름이 생겨요.', '(온난 전선에서는 완만한 층운형 구름)'];
    ln.forEach((q, i) => drawWrap(IP.x + IP.w / 2, IP.y + 52 + i * (PHONE ? 62 : 26), q, IP.w - 32, PHONE ? 13 : 13, { color: i === 1 ? '#b91c1c' : '#334155', weight: 800 }));
  }
  function drawCloud(cx, cy, s, a) { ctx.save(); ctx.globalAlpha *= a == null ? 1 : a; ctx.fillStyle = '#fff'; ctx.beginPath(); [[-26, 6, 18], [-8, -4, 22], [12, 0, 24], [30, 7, 17], [2, 10, 22]].forEach((c) => { ctx.moveTo(cx + c[0] * s + c[2] * s, cy + c[1] * s); ctx.arc(cx + c[0] * s, cy + c[1] * s, c[2] * s, 0, TAU); }); ctx.fill(); ctx.restore(); }

  /* ======================================================
     HTML 도구 연결
     ====================================================== */
  const MODES = [['pres', '📈 기압 분포'], ['hydro', '🧱 정역학 균형'], ['thick', '🌡️ 층후'], ['vert', '🎈 연직 운동']];
  const MODE_LABEL = { pres: '📈 높이에 따른 기압', hydro: '🧱 정역학 균형: Δp = ρgΔz', thick: '🌡️ 기온과 층후', vert: '🎈 연직 운동이 생기는 원인' };
  const FREE_KEYS = { pres: ['zS'], hydro: ['rho', 'dzS', 'grav'], thick: ['viewSel', 'dTns'], vert: ['causeSel', 'dTb', 'dCv'] };
  let ctlKeys = [];
  $('#modeSeg').innerHTML = MODES.map((m) => '<button type="button" data-mode="' + m[0] + '">' + m[1] + '</button>').join('');
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free);
    let keys = free ? FREE_KEYS[S.mode].slice() : ctlKeys.slice();
    if (S.mode === 'thick') keys = keys.filter((k) => !(k === 'dTns' && S.view !== 'ns'));
    if (S.mode === 'vert') keys = keys.filter((k) => !((k === 'dTb' && S.cause !== 'buoy') || (k === 'dCv' && S.cause !== 'conv')));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  clearBadOnInput('.num-in');

  // 장면 1
  SciSim.bindRange($('#sZS'), $('#oZS'), (v) => (+v).toFixed(1) + ' km', (v) => { S.zS = +v; });
  $('#bDot').addEventListener('click', () => { Sound.click(); if (!S.dots.includes(S.zS)) S.dots.push(S.zS); });
  $('#bDotClr').addEventListener('click', () => { Sound.click(); S.dots = []; });
  function setZS(v) { S.zS = v; setSlider($('#sZS'), $('#oZS'), v, (x) => (+x).toFixed(1) + ' km'); }
  // 장면 2
  SciSim.bindRange($('#sRho'), $('#oRho'), (v) => (+v).toFixed(2) + ' kg/m³', (v) => { S.rho = +v; });
  function setRho(v) { S.rho = v; setSlider($('#sRho'), $('#oRho'), v, (x) => (+x).toFixed(2) + ' kg/m³'); S.rhoSeen[v] = true; }
  bindSeg('#rhoBtns', 'r', (r) => setRho(+r));
  SciSim.bindRange($('#sDz'), $('#oDz'), (v) => v + ' m', (v) => { S.dz = +v; });
  function setDz(v) { S.dz = v; setSlider($('#sDz'), $('#oDz'), v, (x) => x + ' m'); }
  function syncGrav() { $('#tGrav').classList.toggle('on', S.grav); $('#tGrav').lastElementChild.textContent = S.grav ? '🌍 중력 켜기 (켜짐)' : '🌍 중력 켜기 (꺼짐)'; }
  $('#tGrav').addEventListener('click', () => { Sound.click(); S.grav = !S.grav; if (!S.grav) { S.gravOffSeen = true; S.vOff = 0; S.sOff = 0; } syncGrav(); });
  // 장면 3
  function syncView() { syncSeg('#viewBtns', 'v', S.view); updateCtl(); }
  bindSeg('#viewBtns', 'v', (v) => { S.view = v; S.viewSeen[v] = true; syncView(); });
  SciSim.bindRange($('#sDTns'), $('#oDTns'), (v) => v + ' K', (v) => { S.dTns = +v; });
  const clsThick = makeClassify($('#clsThick'), [
    { id: 't1', label: '같은 지상 기압이면 <b>따뜻한 기둥</b>에서 500 hPa 면이 더 높아요' },
    { id: 't2', label: '같은 기압 면은 <b>어디서나 같은 높이</b>에 있어요' },
    { id: 't3', label: '기둥이 따뜻할수록 1000~500 hPa 층후가 <b>작아요</b>' },
    { id: 't4', label: '같은 높이(5.5 km)에서는 <b>따뜻한 쪽의 기압이 더 높아요</b>' },
  ], [{ id: 'T', label: '맞아요' }, { id: 'F', label: '틀려요' }], { t1: 'T', t2: 'F', t3: 'F', t4: 'T' }, () => { });
  // 장면 4
  function syncCause() { syncSeg('#causeBtns', 'c', S.cause); updateCtl(); }
  bindSeg('#causeBtns', 'c', (c) => { S.cause = c; S.causeSeen[c] = true; S.bT = 0; S.bRun = true; syncCause(); parts.clear(); });
  SciSim.bindRange($('#sDTb'), $('#oDTb'), (v) => (+v).toFixed(1) + ' K', (v) => { S.dTb = +v; S.bT = 0; S.bRun = true; });
  SciSim.bindRange($('#sDCv'), $('#oDCv'), (v) => (+v).toFixed(1), (v) => { S.dCv = +v; });
  $('#bBuoy').addEventListener('click', () => { Sound.click(); S.bT = 0; S.bRun = true; });
  function setDTb(v) { S.dTb = v; S.bT = 0; S.bRun = true; setSlider($('#sDTb'), $('#oDTb'), v, (x) => (+x).toFixed(1) + ' K'); }
  const pairVert = makePair($('#pairVert'), [{ id: 'sh', label: '소나기' }, { id: 'lo', label: '저기압 중심의 구름' }, { id: 'mt', label: '산악 강수' }, { id: 'cf', label: '한랭 전선의 적운' }],
    [{ id: 'fr', label: '전선' }, { id: 'bu', label: '부력' }, { id: 'te', label: '지형' }, { id: 'co', label: '수렴' }], { sh: 'bu', lo: 'co', mt: 'te', cf: 'fr' }, () => { });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); flash.t = 0;
    $$('.num-in').forEach((e) => { e.value = ''; e.classList.remove('bad'); });
    setZS(0); S.dots = []; dialV.value = dialV.target = 1013; dialV.velocity = 0;
    setRho(1.2); S.rhoSeen = {}; setDz(100); S.grav = true; S.sOff = 0; S.vOff = 0; S.gravOffSeen = false; syncGrav();
    S.view = 'cols'; S.viewSeen = { cols: true }; syncView(); S.dTns = 20; setSlider($('#sDTns'), $('#oDTns'), 20, (v) => v + ' K'); clsThick.reset();
    S.cause = 'buoy'; S.causeSeen = { buoy: true }; syncCause(); setDTb(1.0); S.dCv = 1.0; setSlider($('#sDCv'), $('#oDCv'), 1, (v) => (+v).toFixed(1)); pairVert.reset();
    if (li === 0) { setMode('pres'); setCtl(['zS', 'pIn']); showHint('관측 고도를 올리며 기압계 바늘을 봐요', 5200); }
    else if (li === 1) { setMode('hydro'); setCtl(['rho', 'dzS', 'grav']); showHint('밀도와 두께를 바꾸면 압력 차가 달라져요', 5200); }
    else if (li === 2) { setMode('thick'); setCtl(['viewSel']); showHint('따뜻한 기둥일수록 500 hPa 면이 높아져요', 5200); }
    else { setMode('vert'); setCtl(['causeSel', 'dTb', 'dCv']); showHint('원인을 바꿔 가며 공기가 올라가는 모습을 봐요', 5200); }
    updateCtl();
  }
  const pS = () => pOf(5.5);
  const levels = [
    {
      title: '높이에 따라 기압이 줄어요', short: '기압 분포', icon: '📈', phase: '분석', features: ['pres'],
      intro: '<p class="si-q">❓ 탐구 질문: 높은 산에 오르면 귀가 먹먹한 이유는? 또 공기는 왜 위로 올라가기도 하고 가라앉기도 할까?</p>' +
        '<div class="si-link">🔗 <b>중3 기압과 바람</b>에서 기압이 공기의 무게로 생긴다는 것을, <b>일반선택 지구과학</b>에서 고·저기압과 일기도를 배웠어요. 이번에는 기압이 높이에 따라 변하는 모양을 수치로 알아봐요. (이상 기체 상태 방정식 p = ρRT는 알려진 것으로 써요.)</div>' +
        '<p>기압은 그 위에 있는 <b>공기의 무게</b>예요. 높이 올라갈수록 위에 실린 공기가 줄어서 기압이 낮아져요. 표준 대기(예시)의 기압을 높이별로 읽고, 1 m² 위에 얼마나 많은 공기가 실려 있는지 계산해 봐요.</p>',
      setup() { resetStep(0); },
      recap: '기압은 높이 올라갈수록 줄어드는데 직선이 아니라 지수적으로 줄어요. 5.5 km에서 지상의 절반(약 500 hPa)이고, 지상 1 m² 위의 공기 질량은 약 1.03×10⁴ kg(약 10톤)이에요.',
      summary: '<ul><li>표준 대기(예시): 0 km 1013, 1 km 899, 2 km 795, 3 km 701, 5 km 540, <b>5.5 km 약 500</b>, 8 km 357, 10 km 265, 11 km 227, 16 km 103 hPa.</li><li>1 m² 위 공기 기둥의 질량 = p / g = 1.013×10⁵ / 9.8 ≈ <b>1.03×10⁴ kg</b>(약 10톤). 대기 질량의 절반이 약 5.5 km 아래에 있어요.</li><li>기압이 높이에 따라 <b>지수적으로 감소</b>해요 (위에 실린 공기가 줄고, 아래 공기가 눌려 더 촘촘해서). 직선으로 줄어드는 것이 아니에요.</li></ul>',
      missions: [
        {
          title: '고도 5.5 km의 기압', manual: true,
          goal: '관측 고도를 <b>5.5 km</b>로 맞추고, 기압(hPa)을 읽어 입력해요. 지상 기압(1013 hPa)의 약 몇 분의 1일까요?',
          hint: '슬라이더를 5.5 km에 맞추면 기압계 바늘과 그래프의 점이 약 500 hPa를 가리켜요. 지상의 약 절반이에요.',
          setup() { $('#iP55').value = ''; setZS(0); setMode('pres'); setCtl(['zS', 'pIn']); },
          status: () => mark(S.zS === 5.5) + ' 고도 ' + S.zS.toFixed(1) + ' km (목표 5.5) · ' + mark(near($in('#iP55'), pS(), 15)) + ' 입력 ' + ($in('#iP55') == null ? '—' : $in('#iP55') + ' hPa'),
          check() {
            if (S.zS !== 5.5) return '먼저 관측 고도를 5.5 km로 맞춰 주세요.';
            const v = $in('#iP55'); if (v == null) return '기압을 입력해 주세요.';
            const ok = near(v, pS(), 15); markBad('#iP55', !ok);
            if (!ok) return '기압계 바늘이 가리키는 값(hPa)을 읽어 봐요. 지상 기압의 약 절반이에요.';
            return true;
          },
          explain: '고도 5.5 km에서 기압은 약 <b>500 hPa</b>로 지상(1013 hPa)의 약 절반이에요. 즉 대기 질량의 절반이 5.5 km 아래에 모여 있어요.',
        },
        {
          title: '1 m² 위의 공기 질량', manual: true,
          goal: '지상 기압 1013 hPa(= 1.013×10⁵ Pa)는 1 m² 위 공기 기둥의 무게예요. <b>m = p / g</b>로 공기의 질량(kg)을 구해 입력해요.',
          hint: '1.013×10⁵ Pa / 9.8 m/s² = 약 10340 kg이에요. 1 Pa = 1 N/m²이고, 무게 = mg예요.',
          setup() { $('#iMass').value = ''; setZS(0); setMode('pres'); setCtl(['zS', 'massIn']); },
          status: () => mark(near($in('#iMass'), massOf(1013), 250)) + ' 입력 ' + ($in('#iMass') == null ? '—' : $in('#iMass') + ' kg'),
          check() {
            const v = $in('#iMass'); if (v == null) return '질량을 입력해 주세요.';
            const ok = near(v, massOf(1013), 250); markBad('#iMass', !ok);
            if (!ok) return v < 100 ? '단위를 확인해요. 1013 hPa = 101300 Pa이고, 질량은 kg 단위예요.' : 'm = p / g = 101300 / 9.8을 계산해 봐요.';
            return true;
          },
          explain: 'm = p / g = 1.013×10⁵ / 9.8 ≈ <b>1.03×10⁴ kg</b>(약 10톤)이에요. 우리 머리 위 1 m²에 승용차 몇 대 무게의 공기가 얹혀 있는 셈이에요.',
        },
        {
          type: 'quiz', title: '기압이 줄어드는 모양',
          goal: '기압이 높이에 따라 줄어드는 모양과 그 까닭으로 알맞은 것은?',
          setup() { setMode('pres'); setCtl(['zS']); },
          choices: ['일정한 비율로 직선처럼 줄어요.', '지수적으로 줄어요. 위에 실린 공기가 줄고, 공기가 눌려 아래쪽이 더 촘촘하기(밀도가 크기) 때문이에요.', '높이와 상관없이 일정해요.', '높이 올라갈수록 기압이 커져요.'],
          answer: 1,
          feedback: ['직선이라면 100 m마다 같은 양씩 줄어야 해요. 낮은 곳에서는 100 m당 감소량이 훨씬 커요. (기압이 직선으로 줄어든다는 것은 오개념이에요.)', '', '높이 올라갈수록 위에 실린 공기가 줄어 기압이 낮아져요.', '높은 산에서 귀가 먹먹한 것은 기압이 낮아지기 때문이에요.'],
          explain: '기압은 위에 실린 공기의 무게예요. 위로 갈수록 실린 공기가 줄고, 아래쪽 공기는 눌려서 밀도가 커서 <b>아래에서는 100 m당 더 많이 줄고 위에서는 덜 줄어요</b>. 그래서 곡선(지수 감소)이 돼요.',
        },
      ],
    },
    {
      title: '정역학 균형: 떨어지지도 달아나지도 않아요', short: '정역학 균형', icon: '🧱', phase: '모형', features: ['hydro'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기압이 위에 실린 공기의 무게라는 것을 확인했어요. 그렇다면 공기층 하나에는 어떤 힘이 작용할까요?</div>' +
        '<p>두께 Δz, 밀도 ρ인 얇은 공기층에서 <b>아래쪽 압력 − 위쪽 압력 = 층의 무게</b>예요. 그래서 <b>Δp = −ρgΔz</b>(위로 갈수록 기압이 줄어요)예요. 위쪽으로의 압력 차의 힘과 아래쪽 중력이 균형이라 공기가 떨어지지도 우주로 달아나지도 않아요. 이것이 <b>정역학 균형</b>이에요.</p>',
      setup() { resetStep(1); },
      recap: '정역학 균형에서는 압력 차의 힘(위)과 중력(아래)이 같아요. 지표 부근(ρ = 1.2)에서는 100 m당 약 11.8 hPa, 5 km 부근(ρ = 0.74)에서는 약 7.3 hPa 줄어요.',
      summary: '<ul><li>정역학 균형: <b>Δp = −ρ g Δz</b>. 위로의 압력 경도력과 아래로의 중력이 균형이라 공기가 떨어지지도 달아나지도 않아요. (중력이 없다면 압력 차 때문에 위로 달아나요.)</li><li>지표 부근 ρ = 1.2 kg/m³, Δz = 100 m → |Δp| = 1.2 × 9.8 × 100 = 1176 Pa ≈ <b>11.8 hPa</b>.</li><li>5 km 부근 ρ = 0.74 → |Δp| ≈ 725 Pa ≈ <b>7.3 hPa</b>. 높을수록 밀도가 작아 100 m당 감소량이 작고, 그래서 기압이 지수적으로 줄어요.</li><li>\'공기는 가벼워서 중력을 받지 않는다\'는 오개념이에요. 공기도 질량이 있어 중력을 받아요.</li></ul>',
      missions: [
        {
          title: '100 m당 기압 감소량', manual: true,
          goal: '층의 두께 Δz = <b>100 m</b>일 때, <b>지표 부근(ρ = 1.2)</b>과 <b>5 km 부근(ρ = 0.74)</b>에서 100 m당 기압 감소량 Δp = ρgΔz를 hPa로 계산해 입력해요.',
          hint: '지표: 1.2 × 9.8 × 100 = 1176 Pa = 약 11.8 hPa, 5 km: 0.74 × 9.8 × 100 = 725 Pa = 약 7.3 hPa예요. (1 hPa = 100 Pa) 밀도 단추와 두께 슬라이더로 확인해도 돼요.',
          setup() { $('#iDp0').value = ''; $('#iDp5').value = ''; setRho(1.2); setDz(100); setMode('hydro'); setCtl(['rho', 'grav', 'dpIn']); },
          status: () => mark(near($in('#iDp0'), 11.76, 0.7)) + ' 지표 ' + ($in('#iDp0') == null ? '—' : $in('#iDp0')) + ' · ' + mark(near($in('#iDp5'), 7.25, 0.7)) + ' 5 km ' + ($in('#iDp5') == null ? '—' : $in('#iDp5')) + ' (hPa)',
          check() {
            const a = $in('#iDp0'), b = $in('#iDp5'); if (a == null || b == null) return '두 칸에 모두 값을 입력해 주세요.';
            const oa = near(a, 11.76, 0.7), ob = near(b, 7.25, 0.7); markBad('#iDp0', !oa); markBad('#iDp5', !ob);
            if (!oa || !ob) return (a > 100 || b > 100) ? '1176 Pa는 hPa로는 11.76이에요. 100으로 나눠 단위를 바꿔 봐요.' : 'Δp = ρ × 9.8 × 100 Pa를 계산한 뒤 hPa로 바꿔 봐요. 높은 곳이 낮은 곳보다 작아요.';
            return true;
          },
          explain: '지표: 1.2 × 9.8 × 100 = 1176 Pa ≈ <b>11.8 hPa</b>, 5 km: 0.74 × 9.8 × 100 ≈ 725 Pa ≈ <b>7.3 hPa</b>이에요. 높은 곳은 공기가 옅어(밀도 작음) 같은 두께의 무게가 작아서 기압이 덜 줄어요.',
        },
        {
          type: 'quiz', title: '공기가 떨어지지도 달아나지도 않는 까닭',
          goal: '대기의 공기가 지표로 떨어지지도, 우주로 달아나지도 않는 까닭으로 알맞은 것은?',
          setup() { setMode('hydro'); setCtl(['rho', 'grav']); },
          choices: ['공기는 가벼워서 중력을 받지 않기 때문이에요.', '위쪽으로의 압력 경도력과 아래쪽 중력이 균형을 이루기 때문이에요.', '공기가 너무 가벼워 바람이 계속 받쳐 주기 때문이에요.', '지구의 자전 때문에 공기가 제자리에 붙어 있어요.'],
          answer: 1,
          feedback: ['공기도 질량이 있어서 중력을 받아요. 가볍다는 것과 중력을 안 받는다는 것은 달라요.', '', '바람이 받쳐 주는 것이 아니라 압력 차의 힘이 위로 받쳐 줘요.', '자전이 아니라 압력 경도력과 중력의 균형이 핵심이에요.'],
          explain: '아래쪽 압력이 위쪽 압력보다 커서 생기는 <b>위쪽 힘</b>이 아래쪽 <b>중력</b>과 같아서(정역학 균형) 공기가 가만히 있어요. 중력을 끄면 압력 차의 힘 때문에 위로 달아나는 것을 장면에서 볼 수 있어요.',
        },
      ],
    },
    {
      title: '기온에 따라 달라지는 층후', short: '기온과 층후', icon: '🌡️', phase: '탐구', features: ['thick'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Δp = −ρgΔz에서 밀도가 작을수록 같은 기압 간격이 더 두꺼워진다는 것을 알았어요. 밀도는 기온에 따라 달라요(p = ρRT).</div>' +
        '<p>두 등압면 사이의 두께를 <b>층후</b>라고 해요. 정역학 균형과 상태 방정식을 합치면 <b>Δz = (R T̄ / g) ln(p₁/p₂)</b>예요. 따뜻한 공기 기둥은 팽창해 같은 기압 면의 높이가 높고, 같은 지상 기압에서도 남북 기온 차가 있으면 상층에 수평 기압 차가 생겨요 (→ 제트류와 상층 일기도).</p>',
      setup() { resetStep(2); },
      recap: '평균 기온 T̄가 높을수록 1000~500 hPa 층후가 커서(250 K 약 5.07 km, 270 K 약 5.48 km, 290 K 약 5.89 km) 따뜻한 쪽의 500 hPa 면이 높고, 같은 높이에서 상층 기압도 높아요.',
      summary: '<ul><li>층후 Δz = (R T̄ / g) ln(p₁/p₂). 1000~500 hPa 층후: T̄ = 250 K → 약 5.07 km, 270 K → 약 <b>5.48 km</b>, 290 K → 약 5.89 km.</li><li>따뜻한 공기 기둥은 밀도가 작아 같은 기압 간격이 더 두꺼워 <b>같은 기압 면의 높이가 높아요</b> (상층 고기압 쪽이 따뜻해요). \'같은 기압 면은 어디서나 같은 높이\'는 오개념이에요.</li><li>같은 지상 기압에서도 남북 기온 차가 있으면 같은 높이의 상층에서 따뜻한 쪽 기압이 높아 수평 압력 경도력이 생겨요 (→ 제트류).</li></ul>',
      missions: [
        {
          title: 'T̄ = 270 K의 층후', manual: true,
          goal: '평균 기온 <b>270 K</b>인 공기 기둥의 <b>1000~500 hPa 층후</b>를 Δz = (R T̄ / g) ln(1000/500)로 계산해 km로 입력해요. (R = 287, g = 9.8)',
          hint: '(287 × 270 / 9.8) × ln 2 = 7907 m × 0.693 ≈ 5480 m이에요. 화면의 기둥 높이와 비교해 봐요.',
          setup() { $('#iThick').value = ''; S.view = 'cols'; syncView(); setMode('thick'); setCtl(['viewSel', 'thIn']); },
          status: () => mark(near($in('#iThick'), thickM(270) / 1000, 0.1)) + ' 입력 ' + ($in('#iThick') == null ? '—' : $in('#iThick') + ' km'),
          check() {
            const v = $in('#iThick'); if (v == null) return '층후를 입력해 주세요.';
            const ok = near(v, thickM(270) / 1000, 0.1); markBad('#iThick', !ok);
            if (!ok) return v > 100 ? 'km 단위로 입력해요. 5480 m는 약 5.5 km예요.' : '(287 × 270 / 9.8) × ln 2를 계산하면 m 단위로 나와요. km로 바꿔 봐요.';
            return true;
          },
          explain: '(287 × 270 / 9.8) ln 2 = 7907 × 0.693 ≈ 5480 m = <b>약 5.5 km</b>예요. 250 K이면 약 5.07 km, 290 K이면 약 5.89 km로 따뜻할수록 두꺼워요.',
        },
        {
          title: '따뜻한 쪽과 찬 쪽 비교', manual: true,
          goal: '공기 기둥 3개와 남북 단면을 모두 살펴보고, 설명 4개가 <b>맞는지 틀린지</b> 골라요.',
          hint: '보기 단추로 남북 단면도 확인해요. 따뜻한 쪽에서 500 hPa 면이 더 높고, 같은 높이(5.5 km)에서 기압도 더 커요.',
          setup() { clsThick.reset(); S.viewSeen = { cols: true }; setMode('thick'); setCtl(['viewSel', 'dTns', 'clsThick']); },
          status: () => mark(clsThick.ok()) + ' 고른 설명 ' + clsThick.count() + ' / 4 · ' + mark(!!S.viewSeen.ns) + ' 남북 단면 확인',
          check() {
            if (!clsThick.complete()) return '설명 4개를 모두 골라 주세요. (지금 ' + clsThick.count() + '개)';
            if (!clsThick.ok()) { clsThick.mark(clsThick.wrong()); return '빨간 설명이 달라요. 기둥 3개 장면과 남북 단면에서 500 hPa 면의 높이를 다시 비교해 봐요.'; }
            return true;
          },
          explain: '따뜻한 기둥은 층후가 커서 <b>500 hPa 면이 더 높고</b>, 같은 높이에서는 <b>따뜻한 쪽의 기압이 더 높아요</b>. 같은 기압 면이 어디서나 같은 높이에 있는 것은 아니에요.',
        },
        {
          type: 'quiz', title: '따뜻한 기둥의 층후가 큰 까닭',
          goal: '따뜻한 공기 기둥의 층후가 큰 까닭으로 알맞은 것은?',
          setup() { setMode('thick'); setCtl(['viewSel', 'dTns']); },
          choices: ['따뜻한 공기는 밀도가 작아서 같은 기압 간격(500 hPa)을 만들려면 더 두꺼워야 해요.', '따뜻한 공기가 더 무거워서 아래로 가라앉아요.', '같은 기압 면은 어디서나 같은 높이에 있어요.', '따뜻한 공기에서는 중력이 작아져요.'],
          answer: 0,
          feedback: ['', '따뜻한 공기는 밀도가 작아서(가벼워서) 같은 질량이 더 두껍게 퍼져요.', '기둥의 온도에 따라 같은 기압 면의 높이가 달라요. (같은 기압 면은 어디서나 같은 높이라는 것은 오개념이에요.)', '중력은 거의 변하지 않아요. 달라지는 것은 밀도예요.'],
          explain: '같은 기압 간격(1000 → 500 hPa) 사이의 공기 질량은 같아요. 따뜻한 공기는 <b>밀도가 작아</b> 그 질량이 더 두꺼운 층을 차지해요. 그래서 층후가 크고 같은 기압 면이 높아요.',
        },
      ],
    },
    {
      title: '연직 운동은 왜 생길까', short: '연직 운동', icon: '🎈', phase: '예측', features: ['vert'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 대규모에서는 압력 경도력과 중력이 거의 정확히 균형(정역학 균형)이라고 배웠어요. 그런데도 공기는 위로 올라가기도 하고 가라앉기도 해요. 이 균형을 아주 조금 깨뜨리는 원인을 찾아봐요.</div>' +
        '<p>연직 운동은 네 가지 원인으로 생겨요. (1) <b>부력</b>: 덩어리가 주변보다 ΔT 따뜻하면 a = gΔT/T. (2) <b>수평 수렴·발산</b>: 연속 방정식(밀도 일정 근사)에서 ∂w/∂z = −(수평 발산). (3) <b>지형</b>에 의한 강제 상승. (4) <b>전선면</b> 위로 밀려 올라가기. 연직 가속은 정역학 균형을 아주 조금만 깨뜨려서 대규모에서는 거의 균형으로 취급해요.</p>',
      setup() { resetStep(3); },
      recap: 'ΔT = 1 K 덩어리는 a ≈ 0.033 m/s²로 1 km 올라가는 데 약 250 s(약 4분)가 걸려요. 지상 수렴 1×10⁻⁵ s⁻¹, 두께 2 km이면 w = 2 cm/s(하루 약 1.7 km)로 작지만 며칠 지속돼 넓은 구름을 만들어요.',
      summary: '<ul><li><b>부력</b>: a = g ΔT / T. ΔT = 1 K, T = 300 K → 0.033 m/s², 1 km 상승 시간 t = √(2z/a) ≈ 250 s ≈ <b>4분</b>. (소나기)</li><li><b>수평 수렴</b>: ∂w/∂z = −(수평 발산). 지상 수렴 D = 1×10⁻⁵ s⁻¹, 수렴층 두께 2 km → w = 1×10⁻⁵ × 2000 = 0.02 m/s = <b>2 cm/s</b>(하루 약 1.7 km). (저기압 구름)</li><li><b>지형</b> 강제 상승(산악 강수), <b>전선면</b> 위로 밀려 올라감(한랭 전선 적운).</li><li>대규모 연직 속도는 부력 상승보다 훨씬 작지만 며칠 지속돼서 넓은 구름·강수를 만들어요.</li></ul>',
      missions: [
        {
          title: '1 km 올라가는 데 걸리는 시간', manual: true,
          goal: '<b>부력</b> 장면에서 덩어리가 주변보다 <b>ΔT = 1 K</b> 따뜻할 때(T = 300 K), 1 km 올라가는 데 걸리는 시간을 t = √(2z/a)로 구해 <b>분</b> 단위로 입력해요.',
          hint: 'a = 9.8 × 1 / 300 = 0.033 m/s²이에요. t = √(2 × 1000 / 0.033) ≈ 247 s이니 분으로 바꾸면 약 4분이에요.',
          setup() { $('#iMin').value = ''; S.cause = 'buoy'; syncCause(); setDTb(1.0); setMode('vert'); setCtl(['causeSel', 'dTb', 'minIn']); },
          status: () => mark(S.cause === 'buoy' && Math.abs(S.dTb - 1) < 0.05) + ' 부력 · ΔT ' + S.dTb.toFixed(1) + ' K (목표 1.0) · ' + mark(near($in('#iMin'), t1km() / 60, 0.5)) + ' 입력 ' + ($in('#iMin') == null ? '—' : $in('#iMin') + '분'),
          check() {
            if (S.cause !== 'buoy' || Math.abs(S.dTb - 1) > 0.05) return '부력 장면에서 덩어리의 ΔT를 1.0 K로 맞춰 주세요.';
            const v = $in('#iMin'); if (v == null) return '시간을 입력해 주세요.';
            const ok = near(v, t1km() / 60, 0.5); markBad('#iMin', !ok);
            if (!ok) return v > 30 ? '247은 초 단위예요. 60으로 나눠 분으로 바꿔 봐요.' : 't = √(2z / a)에서 a = gΔT / T = 0.033 m/s², z = 1000 m예요.';
            return true;
          },
          explain: 'a = g ΔT / T = 9.8 × 1 / 300 ≈ 0.033 m/s², t = √(2z / a) = √(2000 / 0.033) ≈ <b>250 s ≈ 4분</b>이에요. 소나기구름 속에서는 이렇게 몇 분 만에 1 km 올라가는 강한 상승류가 생겨요.',
        },
        {
          title: '현상과 연직 운동의 원인 짝짓기', manual: true,
          goal: '네 가지 원인 장면을 모두 살펴보고, <b>현상</b>과 <b>연직 운동의 원인</b>을 짝지어요.',
          hint: '소나기는 지표가 가열되어 덩어리가 따뜻해지는 것(부력), 저기압 중심은 지상에서 공기가 모이는 것(수렴), 산악 강수는 산비탈(지형), 한랭 전선 적운은 찬 공기 쐐기(전선)예요.',
          setup() { pairVert.reset(); S.causeSeen = { buoy: true }; setMode('vert'); setCtl(['causeSel', 'dTb', 'dCv', 'pairVert']); },
          status: () => mark(pairVert.ok()) + ' 짝지은 현상 ' + pairVert.count() + ' / 4 · ' + mark(['buoy', 'conv', 'terr', 'front'].every((c) => S.causeSeen[c])) + ' 살펴본 원인 ' + ['buoy', 'conv', 'terr', 'front'].filter((c) => S.causeSeen[c]).length + ' / 4',
          check() {
            if (!pairVert.complete()) return '현상 4개를 모두 짝지어 주세요. (지금 ' + pairVert.count() + '개)';
            if (!pairVert.ok()) { pairVert.mark(pairVert.wrong()); return '빨간 짝이 달라요. 원인 장면을 다시 살펴봐요.'; }
            return true;
          },
          explain: '<b>소나기</b>는 부력, <b>저기압 중심의 구름</b>은 지상 수렴, <b>산악 강수</b>는 지형에 의한 강제 상승, <b>한랭 전선의 적운</b>은 찬 공기 쐐기 위로 밀려 올라가는 전선의 효과예요.',
        },
        {
          type: 'quiz', title: '작은 연직 속도의 힘',
          goal: '지상 수렴 D = 1×10⁻⁵ s⁻¹, 수렴층 두께 2 km일 때 상승 속도와, 이것이 소나기의 부력 상승보다 훨씬 작은데도 중요한 까닭은?',
          setup() { S.cause = 'conv'; syncCause(); setMode('vert'); setCtl(['causeSel', 'dCv']); },
          choices: ['w = D × h = 0.02 m/s(2 cm/s)이고, 작지만 며칠 지속돼 하루 약 1.7 km 올라가 넓은 지역에 구름을 만들어요.', 'w = 2 m/s이고, 소나기와 똑같이 몇 분 만에 구름이 만들어져요.', 'w = 2 cm/s이지만 너무 작아서 날씨와는 관계가 없어요.', 'w = 0.2 mm/s라서 하루에 20 m밖에 못 올라가요.'],
          answer: 0,
          feedback: ['', '1×10⁻⁵ × 2000 = 0.02 m/s이지 2 m/s가 아니에요.', '작아도 며칠 지속되고 넓은 지역에 걸쳐 있어서 큰 구름 계를 만들어요.', '0.02 m/s = 2 cm/s이고 하루(86400 s)면 약 1.7 km예요.'],
          explain: 'w = 1×10⁻⁵ s⁻¹ × 2000 m = <b>0.02 m/s(2 cm/s)</b>예요. 소나기의 상승(수 m/s)보다 훨씬 작지만 <b>며칠</b> 동안 <b>넓은 지역</b>에서 이어져(하루 약 1.7 km) 저기압의 넓은 구름 지역을 만들어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-hydrostatic', mount: '#game', badge: '정역학 분석가', homeHref: '../../index.html#hs',
    featureLabels: { pres: '📈 높이–기압 그래프', hydro: '🧱 공기층 힘의 균형', thick: '🌡️ 층후 비교', vert: '🎈 연직 운동 4가지 원인' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'pres') setReadouts(['관측 고도', S.zS.toFixed(1) + ' km', '기압', Math.round(pOf(S.zS)) + ' hPa', '위 공기 질량 (1 m²)', Math.round(massOf(pOf(S.zS))).toLocaleString('ko-KR') + ' kg']);
    else if (m === 'hydro') setReadouts(['밀도 ρ · 두께 Δz', S.rho.toFixed(2) + ' kg/m³ · ' + S.dz + ' m', 'Δp = ρgΔz', Math.round(dpPa()).toLocaleString('ko-KR') + ' Pa', '= ' + (dpPa() / 100).toFixed(1) + ' hPa', S.grav ? '균형 상태' : '중력 없음']);
    else if (m === 'thick') setReadouts(['보기', S.view === 'cols' ? '공기 기둥 3개' : '남북 단면 (ΔT ' + S.dTns + ' K)', '층후 250 · 270 · 290 K', fmt2(thickM(250)) + ' · ' + fmt2(thickM(270)) + ' · ' + fmt2(thickM(290)) + ' km', '5.5 km의 기압', Math.round(pAtZ(250, 5.5)) + ' · ' + Math.round(pAtZ(270, 5.5)) + ' · ' + Math.round(pAtZ(290, 5.5)) + ' hPa']);
    else if (S.cause === 'buoy') setReadouts(['원인', '부력 (ΔT ' + S.dTb.toFixed(1) + ' K)', '가속도 a', aOf().toFixed(3) + ' m/s²', '1 km 상승 시간', Math.round(t1km()) + ' s (' + (t1km() / 60).toFixed(1) + '분)']);
    else if (S.cause === 'conv') setReadouts(['원인', '수평 수렴 (D ' + S.dCv.toFixed(1) + '×10⁻⁵)', '상승 속도 w', (wOfD() * 100).toFixed(1) + ' cm/s', '하루 상승', (wOfD() * 86.4).toFixed(1) + ' km']);
    else setReadouts(['원인', S.cause === 'terr' ? '지형' : '전선', '공기의 움직임', '강제로 올라가요', '결과', S.cause === 'terr' ? '산악 강수' : '적운형 구름']);
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
    if (S.mode === 'pres') drawPres(t, dt);
    else if (S.mode === 'hydro') drawHydro(t, dt);
    else if (S.mode === 'thick') drawThick(t, dt);
    else drawVert(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, pairVert, clsThick, pOf, massOf, thickM, pAtZ, aOf, t1km, wOfD,
    get game() { return game; }, setMode, resetStep, updateCtl, setZS, setRho, setDz, setDTb,
  };

})();
