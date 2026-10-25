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
     태양계의 형성 (성운 수축 → 응축 → 집적 → 분화)
     ====================================================== */
  initStage('#eaf1f7', 800, 560, 520, 800, 1.25);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  const sci = (x) => { let e = Math.floor(Math.log10(x)); let m = Math.round((x / Math.pow(10, e)) * 10) / 10; if (m >= 10) { m = 1; e += 1; } return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + '×10' + sup(e); };
  const fv = (v) => String(Math.round(v * 10) / 10);
  const fau = (r) => (r >= 10 ? String(Math.round(r)) : (Math.round(r * 10) / 10).toFixed(1));

  const S = {
    mode: 'collapse', fade: 0, clock: 0, bad: [],
    r: 100, rv: 100, spin: 0, spin2: 0, diskDone: false,
    dist: 1, distV: 1, iceK: 0,
    v: 1, meltSeen: false,
    diff: 0, diffDir: 0, heat4: 0,
  };

  /* 구 모양 그림 캐시 (입자가 많은 장면을 가볍게) */
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }

  /* 어두운 카드 */
  function dcard(R, title, bg) {
    D.shadow(() => { ctx.fillStyle = bg || '#0f1b33'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 6, y: 2 });
    if (title) D.text(R.x + 14, R.y + 8 + 15 * FS, title, { size: 14.5, weight: 800, color: '#e2e8f0', align: 'left' });
  }

  /* ---------- 공통 계산 ---------- */
  const tempAt = (r) => 280 / Math.sqrt(r);           // 원반 온도(K), r은 AU
  const SNOW_T = 170;
  const SNOW_R = Math.pow(280 / SNOW_T, 2);            // 눈선 약 2.7 AU
  const MELT_E = 1.6e6;                                // 암석 용융에 필요한 에너지(J/kg)
  const eKin = (vkm) => 0.5 * Math.pow(vkm * 1000, 2);
  const Rcore = 0.546, Rcrust = 0.985;
  const RHO = { core: 10.9, mantle: 4.5, crust: 2.8 };
  const VOLF = { core: Math.pow(Rcore, 3), mantle: Math.pow(Rcrust, 3) - Math.pow(Rcore, 3), crust: 1 - Math.pow(Rcrust, 3) };
  const RHO_MEAN = RHO.core * VOLF.core + RHO.mantle * VOLF.mantle + RHO.crust * VOLF.crust;

  /* ======================================================
     장면 1: 성운 수축
     ====================================================== */
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 300 }, B: { x: 8, y: 316, w: 504, h: 236 }, C: { x: 8, y: 560, w: 504, h: 232 } }
    : { A: { x: 12, y: 12, w: 384, h: 340 }, B: { x: 404, y: 12, w: 384, h: 340 }, C: { x: 12, y: 360, w: 776, h: 188 } };
  const NEB = (() => {
    const rnd = seeded(7), a = [];
    for (let i = 0; i < 200; i++) {
      const rho = Math.sqrt(rnd()), ang = rnd() * TAU, zs = Math.sqrt(Math.max(0, 1 - rho * rho));
      a.push({ rho, ang, z: (rnd() * 2 - 1) * zs, sz: 0.9 + rnd() * 1.5, h: rnd() });
    }
    return a;
  })();
  const rpFor = (R, rv) => { const mx = Math.min(R.w / 2 - 30, R.h / 2 - 36); return mx * 0.3 + mx * 0.7 * ((rv - 10) / 90); };
  const flatOf = (rv) => smooth((100 - rv) / 85);
  const heatOf = (rv) => smooth((100 - rv) / 90);

  function nebHaze(cx, cy, Rp, ry, heat) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / Rp);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Rp);
    g.addColorStop(0, rgba('#fbbf6a', 0.18 + 0.4 * heat)); g.addColorStop(0.55, 'rgba(129,140,248,.16)'); g.addColorStop(1, 'rgba(129,140,248,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, Rp, 0, TAU); ctx.fill(); ctx.restore();
  }
  function protoSun(cx, cy, heat, t) {
    if (heat < 0.04) return;
    const r = 3 + 11 * heat;
    D.glow(cx, cy, r * 3.4, '#fbbf24', 0.5 * heat);
    D.sphere(cx, cy, r, mixc('#f59e0b', '#fff3b0', heat * 0.7 + 0.1 * Math.sin(t * 3)), { gloss: false });
  }
  function drawSkater(cx, cy, arm, spin) {
    // 스케이터: 팔을 펴면 느리게, 오므리면 빠르게 (모식도)
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 14); ctx.stroke();           // 몸통
    ctx.beginPath(); ctx.moveTo(cx, cy + 14); ctx.lineTo(cx - 7, cy + 40); ctx.moveTo(cx, cy + 14); ctx.lineTo(cx + 7, cy + 40); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - arm, cy - 12); ctx.lineTo(cx + arm, cy - 12); ctx.stroke(); // 팔
    D.sphere(cx, cy - 32, 9, '#fcd9b6', { gloss: false });
    D.sphere(cx - arm, cy - 12, 4.5, '#fcd9b6', { gloss: false }); D.sphere(cx + arm, cy - 12, 4.5, '#fcd9b6', { gloss: false });
    // 회전 표시(얼음판 위의 타원 호)
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) { const a0 = spin + (k * TAU) / 3; ctx.beginPath(); ctx.ellipse(cx, cy + 42, 30, 8, 0, a0, a0 + 0.9); ctx.stroke(); }
    ctx.restore();
  }
  function drawCollapse(t, dt) {
    const { A, B, C } = RC1;
    const heat = heatOf(S.rv), flat = flatOf(S.rv), v = 100 / S.rv;
    S.spin += dt * (RM ? 0.3 : 0.12 * Math.pow(100 / S.rv, 1.5));
    S.spin2 += dt * (0.12 * Math.pow(100 / S.rv, 1.5));
    // --- 위에서 본 모습
    dcard(A, '👁️ 위에서 본 성운 (모식도)');
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 12, Rp = rpFor(A, S.rv);
    nebHaze(cx, cy, Rp, Rp, heat);
    NEB.forEach((p) => {
      const ang = p.ang + S.spin * (1 + 0.9 * (1 - p.rho));
      const x = cx + Math.cos(ang) * p.rho * Rp, y = cy + Math.sin(ang) * p.rho * Rp;
      ctx.fillStyle = rgba(mixc('#cbd5e1', '#fcd34d', (1 - p.rho) * heat), 0.45 + 0.5 * (1 - p.rho)); ctx.beginPath(); ctx.arc(x, y, p.sz, 0, TAU); ctx.fill();
    });
    protoSun(cx, cy, heat, t);
    ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 회전 방향 화살표
    const ar = Rp + 12, a1 = -0.55, a0 = a1 - 1.0;
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, ar, a0, a1); ctx.stroke();
    const hx = cx + Math.cos(a1) * ar, hy = cy + Math.sin(a1) * ar, tx = -Math.sin(a1), ty = Math.cos(a1);
    ctx.fillStyle = '#38bdf8'; poly([[hx + tx * 10, hy + ty * 10], [hx - ty * 6 - tx * 1, hy + tx * 6 - ty * 1], [hx + ty * 6 - tx * 1, hy - tx * 6 - ty * 1]]); ctx.fill();
    D.text(cx, A.y + A.h - 12, 'r = ' + Math.round(S.r) + ' AU', { size: 14, weight: 800, color: '#bae6fd' });

    // --- 옆에서 본 모습
    dcard(B, '👀 옆에서 본 성운 (모식도)');
    const bx = B.x + B.w / 2, by = B.y + B.h / 2 + 12, Rs = rpFor(B, S.rv);
    const Hs = Math.max(2.5, Rs * (1 - 0.92 * flat));
    nebHaze(bx, by, Rs, Hs, heat);
    ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(bx, by - Rs - 14); ctx.lineTo(bx, by + Rs + 14); ctx.stroke(); ctx.setLineDash([]);
    D.text(bx + 6, by - Rs - 16 < B.y + 36 ? B.y + 40 : by - Rs - 16, '회전축', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    NEB.forEach((p) => {
      const ang = p.ang + S.spin * (1 + 0.9 * (1 - p.rho));
      const x = bx + Math.cos(ang) * p.rho * Rs, y = by + p.z * Hs;
      const behind = Math.sin(ang) < 0;
      ctx.fillStyle = rgba(mixc('#cbd5e1', '#fcd34d', (1 - p.rho) * heat), behind ? 0.3 : 0.75); ctx.beginPath(); ctx.arc(x, y, p.sz, 0, TAU); ctx.fill();
    });
    protoSun(bx, by, heat, t);
    ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.ellipse(bx, by, Rs, Hs, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (S.r <= 15) {
      D.label(bx, B.y + B.h - 22, '✔ 납작한 원반 + 원시 태양', { bg: '#15803d', size: 13.5, pad: 9 });
    } else {
      D.text(bx, B.y + B.h - 14, flat < 0.3 ? '아직 둥근 구름' : '점점 납작해져요', { size: 13.5, weight: 700, color: '#94a3b8' });
    }

    // --- 아래: r × v = 일정
    card(C, '🔁 수축하면 회전이 빨라져요 (회전 운동의 양 보존: r × v 일정)');
    const bw = PHONE ? 300 : 330, x0 = C.x + 22, y1 = C.y + (PHONE ? 62 : 66), y2 = y1 + 46;
    D.text(x0, y1 - 12, '반지름 r', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(x0, y1, bw, 16, 8).fill();
    ctx.fillStyle = '#38bdf8'; rr(x0, y1, Math.max(0.1, bw * clamp(S.rv, 0, 100) / 100), 16, 8).fill();
    D.text(x0 + bw + 10, y1 + 13, Math.round(S.r) + ' AU', { size: 14, weight: 800, color: '#0369a1', align: 'left' });
    D.text(x0, y2 - 12, '회전 속도 v (처음의 몇 배)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(x0, y2, bw, 16, 8).fill();
    ctx.fillStyle = '#f97316'; rr(x0, y2, Math.max(0.1, bw * clamp(v, 0, 10) / 10), 16, 8).fill();
    D.text(x0 + bw + 10, y2 + 13, fv(100 / S.r) + '배', { size: 14, weight: 800, color: '#c2410c', align: 'left' });
    D.text(x0, y2 + 40, 'r × v = ' + Math.round((S.r * 100) / S.r) + ' (일정) — r이 줄어든 만큼 v가 커져요', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const sx = PHONE ? C.x + C.w - 100 : C.x + C.w - 150, sy = C.y + (PHONE ? 170 : 108);
    const arm = 12 + 36 * ((S.rv - 10) / 90);
    if (PHONE) { D.text(C.x + C.w / 2, C.y + 120, '⛸️ 스케이터 비유: 팔을 오므리면 더 빨리 돌아요', { size: 12.5, weight: 700, color: '#475569' }); }
    else { D.text(sx, C.y + 34, '⛸️ 팔을 오므리면 더 빨리 돌아요', { size: 13, weight: 700, color: '#475569' }); }
    drawSkater(sx, sy - (PHONE ? 10 : 0), arm, S.spin2 * 3);
  }

  /* ======================================================
     장면 2: 응축 (온도에 따라 달라지는 고체 알갱이)
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 338 }, B: { x: 8, y: 354, w: 504, h: 208 }, C: { x: 8, y: 570, w: 504, h: 222 } }
    : { A: { x: 12, y: 12, w: 776, h: 304 }, B: { x: 12, y: 324, w: 380, h: 224 }, C: { x: 400, y: 324, w: 388, h: 224 } };
  const LGR = Math.log(35 / 0.3);
  const geo2 = () => {
    const A = RC2.A, x0 = A.x + (PHONE ? 48 : 56), x1 = A.x + A.w - (PHONE ? 18 : 26), GT = A.y + (PHONE ? 52 : 48), GB = GT + (PHONE ? 140 : 126);
    return { x0, x1, GT, GB, SY: GB + (PHONE ? 76 : 62) };
  };
  const dX = (r, g) => g.x0 + ((g.x1 - g.x0) * Math.log(clamp(r, 0.3, 35) / 0.3)) / LGR;
  const rFromSlider = (v) => 0.3 * Math.pow(35 / 0.3, v / 1000);
  const sliderOfR = (r) => Math.round((1000 * Math.log(r / 0.3)) / LGR);
  const PLANETS = [
    { id: 'me', n: '수성', r: 0.4, c: '#9ca3af', s: 4.5 }, { id: 'ea', n: '지구', r: 1, c: '#3b82f6', s: 6 },
    { id: 'ju', n: '목성', r: 5.2, c: '#d6a36a', s: 11 }, { id: 'ne', n: '해왕성', r: 30, c: '#60a5fa', s: 8 },
  ];
  const GRAINS = (() => { const rnd = seeded(31), a = []; for (let i = 0; i < 6; i++) a.push({ x: rnd(), y: rnd(), ice: false, s: 7 + rnd() * 3 }); for (let i = 0; i < 18; i++) a.push({ x: rnd(), y: rnd(), ice: true, s: 6 + rnd() * 3, ph: rnd() * 6 }); return a; })();
  const SPK = (() => { const rnd = seeded(5), a = []; for (let i = 0; i < 46; i++) a.push({ u: rnd(), v: rnd() * 2 - 1, ph: rnd() * 7, s: 2 + rnd() * 2.5 }); return a; })();

  function drawCondense(t, dt) {
    const { A, B, C } = RC2, g = geo2();
    S.distV = approach(S.distV, S.dist, dt, 14);
    const T = tempAt(S.dist), cold = T < SNOW_T;
    S.iceK = approach(S.iceK, cold ? 1 : 0, dt, 6);
    card(A);
    D.text(A.x + 14, A.y + 8 + 15 * FS, '🌡️ 원반의 온도 T = 280 K / √(r / 1 AU)', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    const xs = dX(SNOW_R, g);
    // 영역 색
    ctx.fillStyle = 'rgba(251,146,60,.10)'; ctx.fillRect(g.x0, g.GT, xs - g.x0, g.GB - g.GT);
    ctx.fillStyle = 'rgba(56,189,248,.12)'; ctx.fillRect(xs, g.GT, g.x1 - xs, g.GB - g.GT);
    // 격자·축
    const Ty = (T0) => g.GB - ((g.GB - g.GT) * T0) / 520;
    ctx.lineWidth = 1; ctx.strokeStyle = '#e2e8f0';
    [0, 100, 200, 300, 400, 500].forEach((T0) => { ctx.beginPath(); ctx.moveTo(g.x0, Ty(T0)); ctx.lineTo(g.x1, Ty(T0)); ctx.stroke(); D.text(g.x0 - 6, Ty(T0) + 4.5, String(T0), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(g.x0 - 6, g.GT - 8, 'T (K)', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    [0.3, 1, 3, 10, 30].forEach((r0) => { const x = dX(r0, g); ctx.beginPath(); ctx.moveTo(x, g.GT); ctx.lineTo(x, g.GB); ctx.stroke(); D.text(x, g.GB + 15 * FS, r0 + ' AU', { size: 12.5, weight: 700, color: '#64748b', align: r0 === 0.3 ? 'left' : 'center' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(g.x0, g.GT, g.x1 - g.x0, g.GB - g.GT);
    // 눈선
    D.dashedLine(g.x0, Ty(SNOW_T), g.x1, Ty(SNOW_T), { color: '#0284c7', width: 2 });
    D.dashedLine(xs, g.GT, xs, g.SY + 30, { color: '#0284c7', width: 2 });
    D.text(g.x1 - 4, Ty(SNOW_T) - 6, '물 얼음이 생기는 온도 170 K', { size: 12.5, weight: 800, color: '#0369a1', align: 'right' });
    D.label(xs, g.GT + 12, '눈선 약 ' + fau(SNOW_R) + ' AU', { bg: '#0284c7', size: 12.5, pad: 7 });
    // 곡선
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.GT, g.x1 - g.x0, g.GB - g.GT); ctx.clip();
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 90; i++) { const r0 = 0.3 * Math.pow(35 / 0.3, i / 90), x = dX(r0, g), y = Ty(tempAt(r0)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    // 원반 단면(띠)
    const sy = g.SY, hf = (x) => 5 + 17 * ((x - g.x0) / (g.x1 - g.x0));
    const gr = ctx.createLinearGradient(g.x0, 0, g.x1, 0);
    const sp = (xs - g.x0) / (g.x1 - g.x0);
    gr.addColorStop(0, '#a16207'); gr.addColorStop(clamp(sp - 0.01, 0, 1), '#b08968'); gr.addColorStop(clamp(sp + 0.01, 0, 1), '#d7ecf8'); gr.addColorStop(1, '#bfdbfe');
    ctx.fillStyle = gr; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const x = g.x0 + ((g.x1 - g.x0) * i) / 40; i ? ctx.lineTo(x, sy - hf(x)) : ctx.moveTo(x, sy - hf(x)); }
    for (let i = 40; i >= 0; i--) { const x = g.x0 + ((g.x1 - g.x0) * i) / 40; ctx.lineTo(x, sy + hf(x)); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    SPK.forEach((p) => { const x = g.x0 + (g.x1 - g.x0) * p.u; if (x < xs + 6) return; const y = sy + p.v * hf(x) * 0.8, a = RM ? 1 : 0.5 + 0.5 * Math.sin(t * 3 + p.ph); D.spark(x, y, p.s * (0.5 + a * 0.6), t, 'rgba(255,255,255,.95)'); });
    D.glow(g.x0 - 6, sy, 40, '#fbbf24', 0.9);
    D.text(g.x0 + 20, sy - 30, '원시 태양', { size: 12.5, weight: 800, color: '#92400e', align: 'left' });
    // 행성 위치 표시
    PLANETS.forEach((p) => { const x = dX(p.r, g); D.sphere(x, sy, p.s, p.c, { shadow: true }); D.text(x, sy + 36 + (PHONE ? 4 : 0), p.n, { size: 12.5, weight: 800, color: '#334155' }); });
    // 선택 위치
    const mx = dX(S.distV, g), my = Ty(tempAt(S.distV));
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(mx, g.GT); ctx.lineTo(mx, g.SY + 28); ctx.stroke();
    D.sphere(mx, my, 7, '#7c3aed', { shadow: true });
    D.label(clamp(mx, g.x0 + 70, g.x1 - 70), clamp(my - 20, g.GT + 34, g.GB - 10), fau(S.dist) + ' AU · ' + Math.round(T) + ' K', { bg: '#7c3aed', size: 13, pad: 7 });
    if (!PHONE) D.text(g.x0 + 4, A.y + A.h - 8, '구역 색: 주황 = 금속·규산염만 고체 / 파랑 = 물 얼음도 고체', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });

    // --- 알갱이 상자
    card(B, '🔍 이 위치에서 고체가 되는 알갱이');
    const bx = B.x + 16, by = B.y + 44, bw = B.w - 32, bh = B.h - 96;
    ctx.fillStyle = '#f1f5f9'; rr(bx, by, bw, bh, 12).fill();
    ctx.save(); rr(bx, by, bw, bh, 12).clip();
    GRAINS.forEach((p) => {
      const x = bx + 14 + p.x * (bw - 28), y = by + 14 + p.y * (bh - 28);
      if (!p.ice) { D.sphere(x, y, p.s, p.x < 0.5 ? '#9a6b3f' : '#78716c', { shadow: true }); }
      else if (S.iceK > 0.02) {
        const k = S.iceK, s = p.s * k; ctx.save(); ctx.globalAlpha = clamp(k * 1.4, 0, 1);
        D.sphere(x, y, s, '#cdeaff', { outline: '#7dd3fc' });
        if (!RM && k > 0.9) D.spark(x + s * 0.5, y - s * 0.5, 4, t + p.ph, '#ffffff');
        ctx.restore();
      }
    });
    ctx.restore();
    // 상대량 막대 (단위 1 = 금속·규산염)
    const U = PHONE ? 60 : 56, uy = B.y + B.h - 34, ux = B.x + 16;
    D.text(ux, uy - 10, '고체 재료의 양 (금속·규산염 = 1)', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#9a6b3f'; rr(ux, uy, U, 16, 6).fill();
    if (S.iceK > 0.01) { ctx.fillStyle = '#7dd3fc'; rr(ux + U, uy, Math.max(0.1, 3 * U * S.iceK), 16, 6).fill(); }
    D.text(ux + U + 3 * U + 10, uy + 13, (cold ? 4 : 1) + '배', { size: 14, weight: 800, color: '#334155', align: 'left' });

    // --- 만들어지는 행성
    card(C, '🪐 여기서 자라는 행성');
    const px = C.x + C.w / 2, py = C.y + C.h / 2 + 12;
    const kk = S.iceK;
    if (kk > 0.02) {
      const hr = 34 + 52 * kk;
      D.glow(px, py, hr * 1.45, '#93c5fd', 0.55 * kk);
      for (let i = 0; i < 12; i++) { // 기체가 핵으로 흘러들어요
        const a = (i / 12) * TAU + t * 0.4, d = hr * (1.05 - ((t * 0.5 + i * 0.37) % 1) * 0.7);
        ctx.fillStyle = 'rgba(147,197,253,' + (0.75 * kk) + ')'; ctx.beginPath(); ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, 2.4, 0, TAU); ctx.fill();
      }
    }
    D.sphere(px, py, 17 + 13 * kk, kk > 0.5 ? '#9cc7e6' : '#a1887f', { shadow: true });
    D.text(px, C.y + C.h - 36, cold ? '큰 얼음·암석 핵이 수소·헬륨 기체를 끌어당겨요' : '암석·금속뿐이라 작은 지구형 행성이 돼요', { size: 13.5, weight: 800, color: '#334155' });
    D.text(px, C.y + C.h - 14, cold ? '→ 목성형 행성' : '→ 지구형 행성', { size: 14, weight: 800, color: cold ? '#0369a1' : '#9a3412' });
  }

  /* ======================================================
     장면 3: 집적 (미행성체 → 원시 행성)
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 332 }, G: { x: 8, y: 348, w: 504, h: 190 }, C: { x: 8, y: 546, w: 504, h: 246 } }
    : { A: { x: 12, y: 12, w: 470, h: 322 }, G: { x: 490, y: 12, w: 298, h: 322 }, C: { x: 12, y: 342, w: 776, h: 206 } };
  const ACCP = { N: 100, R0: 70, R1: 140, GM: 6.2e5, G: 400, eps: 5, drag: 0.3, k: 2.2, ecc: 0.1, RW: 150, RIN: 32 };
  const T_END = 30;       // 모형 시간(초) = 1억 년
  const ACC = { B: [], T: 0, rem: 0, play: false, fast: false, hist: [], maxM: 1, lastH: 0, ev: [] };
  function accReset() {
    const rnd = seeded(11), P = ACCP; ACC.B = [];
    for (let i = 0; i < P.N; i++) {
      const r = P.R0 + (P.R1 - P.R0) * Math.sqrt(rnd()), a = rnd() * TAU, vc = Math.sqrt(P.GM / r), dv = (rnd() - 0.5) * P.ecc * vc, dr = (rnd() - 0.5) * P.ecc * vc;
      ACC.B.push({ m: 1, x: Math.cos(a) * r, y: Math.sin(a) * r, vx: -Math.sin(a) * (vc + dv) + Math.cos(a) * dr, vy: Math.cos(a) * (vc + dv) + Math.sin(a) * dr, heat: 0 });
    }
    ACC.T = 0; ACC.rem = 0; ACC.play = false; ACC.hist = [[0, 1]]; ACC.maxM = 1; ACC.lastH = 0; ACC.ev = [];
  }
  const bodyR = (m) => ACCP.k * Math.cbrt(m);
  function accStep(h) {
    const B = ACC.B, P = ACCP, n = B.length;
    for (let i = 0; i < n; i++) {
      const b = B[i], r2 = b.x * b.x + b.y * b.y, r = Math.sqrt(r2), gg = -P.GM / (r2 * r), vc = Math.sqrt(P.GM / r);
      b.ax = gg * b.x - P.drag * (b.vx + (b.y / r) * vc); b.ay = gg * b.y - P.drag * (b.vy - (b.x / r) * vc);
    }
    for (let i = 0; i < n; i++) {
      const a = B[i];
      for (let j = i + 1; j < n; j++) {
        const c = B[j], dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy + P.eps * P.eps, inv = P.G / (d2 * Math.sqrt(d2));
        a.ax += c.m * dx * inv; a.ay += c.m * dy * inv; c.ax -= a.m * dx * inv; c.ay -= a.m * dy * inv;
      }
    }
    for (let i = 0; i < n; i++) {
      const b = B[i]; b.vx += b.ax * h; b.vy += b.ay * h; b.x += b.vx * h; b.y += b.vy * h;
      const r = Math.hypot(b.x, b.y), rb = bodyR(b.m), rmax = P.RW - rb;
      if (r > rmax || r < P.RIN + rb) { // 원반 영역 안에 머물게 (바깥·안쪽 벽)
        const tgt = r > rmax ? rmax : P.RIN + rb, ux = b.x / r, uy = b.y / r, vr = b.vx * ux + b.vy * uy;
        b.x = ux * tgt; b.y = uy * tgt;
        if ((r > rmax && vr > 0) || (r <= rmax && vr < 0)) { b.vx -= 1.5 * vr * ux; b.vy -= 1.5 * vr * uy; }
      }
      b.heat = Math.max(0, b.heat - h * 0.9);
    }
    for (let i = 0; i < B.length; i++) {
      for (let j = B.length - 1; j > i; j--) {
        const a = B[i], c = B[j], dx = c.x - a.x, dy = c.y - a.y, rr2 = bodyR(a.m) + bodyR(c.m);
        if (dx * dx + dy * dy < rr2 * rr2) {
          const m = a.m + c.m;
          a.x = (a.x * a.m + c.x * c.m) / m; a.y = (a.y * a.m + c.y * c.m) / m; a.vx = (a.vx * a.m + c.vx * c.m) / m; a.vy = (a.vy * a.m + c.vy * c.m) / m;
          a.m = m; a.heat = 1; B.splice(j, 1); ACC.ev.push([a.x, a.y, m]);
        }
      }
    }
    ACC.T += h;
  }
  function accAdvance(dt) {
    if (!ACC.play) return;
    ACC.rem += dt * (ACC.fast ? 3 : 1);
    let k = 0;
    while (ACC.rem >= 1 / 120 && k < 24 && ACC.T < T_END) { accStep(1 / 120); ACC.rem -= 1 / 120; k++; }
    if (ACC.T >= T_END) { ACC.T = T_END; ACC.play = false; ACC.rem = 0; }
    ACC.maxM = ACC.B.reduce((m, b) => Math.max(m, b.m), 0);
    if (ACC.T - ACC.lastH >= 0.2 || ACC.T >= T_END) { ACC.lastH = ACC.T; ACC.hist.push([ACC.T, ACC.maxM]); }
    syncPlayBtn();
  }
  const tMan = () => Math.round((10000 * ACC.T) / T_END);
  const fTime = (n) => (n >= 10000 ? '1억 년' : n.toLocaleString('ko-KR') + '만 년');
  const fME = (m) => (m / 100).toFixed(2);
  function syncPlayBtn() {
    const b = $('#bPlay'); if (!b) return;
    const label = ACC.T >= T_END ? '✔ 끝' : ACC.play ? '⏸ 멈춤' : ACC.T > 0 ? '▶ 이어서' : '▶ 시작';
    if (b.textContent !== label) b.textContent = label;
    $('#bFast').classList.toggle('on', ACC.fast);
  }
  const IMP = { t: -1, dur: 1, v: 1, heat: 0, melt: 0, idle: 0, hit: false, label: '' };
  let impTimer = null;
  function startImpact() {
    clearTimeout(impTimer);
    IMP.t = 0; IMP.v = S.v; IMP.dur = 1.8 / (0.5 + 0.35 * S.v); IMP.hit = false; IMP.idle = 0;
  }
  function drawAccrete(t, dt) {
    const { A, G, C } = RC3;
    accAdvance(dt);
    // 이벤트(합체) 효과
    const sc = Math.min((A.w / 2 - 10) / ACCP.RW, (A.h / 2 - 24) / ACCP.RW), cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 8;
    while (ACC.ev.length) { const e = ACC.ev.shift(); if (ACC.ev.length < 30) parts.burst(cx + e[0] * sc, cy + e[1] * sc, { count: 6, speed: 50, life: 0.45, size: 2, gravity: 0, colors: ['#fbbf24', '#fde68a', '#fb923c'] }); }
    dcard(A, '☄️ 미행성체의 충돌과 합체 (위에서 본 모습)');
    ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(cx, cy, ACCP.RW * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.glow(cx, cy, 70, '#fbbf24', 0.5); D.sphere(cx, cy, ACCP.RIN * sc * 0.55, '#fcd34d', { gloss: false });
    // 큰 천체 찾기
    let big = null; ACC.B.forEach((b) => { if (!big || b.m > big.m) big = b; });
    ACC.B.forEach((b) => {
      const k = clamp(Math.log(b.m) / Math.log(60), 0, 1), col = mixc(mixc('#8d8579', '#a8734a', k), '#ef4444', b.heat * 0.7);
      if (b.m > 8) D.sphere(cx + b.x * sc, cy + b.y * sc, Math.max(1.6, bodyR(b.m) * sc), col, { gloss: true }); else ball(cx + b.x * sc, cy + b.y * sc, Math.max(1.6, bodyR(b.m) * sc), b.heat > 0.05 ? col : (k < 0.3 ? '#8d8579' : '#a0704a'), false);
      if (b.heat > 0.05) D.glow(cx + b.x * sc, cy + b.y * sc, bodyR(b.m) * sc * 2.4, '#fb923c', 0.5 * b.heat);
    });
    if (big && big.m >= 3) {
      const bxp = cx + big.x * sc, byp = cy + big.y * sc;
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(bxp, byp, bodyR(big.m) * sc + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      D.label(clamp(bxp, A.x + 70, A.x + A.w - 70), clamp(byp - bodyR(big.m) * sc - 20, A.y + 34, A.y + A.h - 14), '가장 큰 천체 ' + fME(big.m) + ' M⊕', { bg: '#7c3aed', size: 12.5, pad: 7 });
    }
    D.text(A.x + A.w - 12, A.y + 8 + 15 * FS, '천체 ' + ACC.B.length + '개', { size: 13.5, weight: 800, color: '#cbd5e1', align: 'right' });
    if (!ACC.play && ACC.T === 0) D.text(cx, A.y + A.h - 14, '▶ 시작을 눌러 보세요', { size: 14, weight: 800, color: '#fde68a' });
    if (ACC.T >= T_END) D.text(cx, A.y + A.h - 14, '1억 년이 지났어요: 원시 행성들이 남았어요', { size: 13.5, weight: 800, color: '#fde68a' });

    // 그래프: 가장 큰 천체의 질량
    card(G, '📈 가장 큰 천체의 질량');
    const gx = G.x + (PHONE ? 54 : 50), gy = G.y + 40, gw = G.w - (PHONE ? 74 : 66), gh = G.h - (PHONE ? 78 : 84);
    const X = (tt) => gx + (gw * tt) / T_END, Y = (m) => gy + gh - (gh * clamp(m, 0, 100)) / 100;
    ctx.fillStyle = '#f8fafc'; rr(gx, gy, gw, gh, 4).fill();
    [0, 25, 50, 75, 100].forEach((m) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, Y(m)); ctx.lineTo(gx + gw, Y(m)); ctx.stroke(); D.text(gx - 6, Y(m) + 4.5, (m / 100).toFixed(2), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    [0, 0.25, 0.5, 0.75, 1].forEach((f, i) => { D.text(gx + gw * f, gy + gh + 15 * FS, ['0', '2500만', '5000만', '7500만', '1억 년'][i], { size: 12, weight: 700, color: '#64748b', align: i === 0 ? 'left' : i === 4 ? 'right' : 'center' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
    D.dashedLine(gx, Y(10), gx + gw, Y(10), { color: '#7c3aed', width: 2 });
    D.text(gx + gw - 4, Y(10) - 6, '목표 0.10', { size: 12.5, weight: 800, color: '#6d28d9', align: 'right' });
    D.text(G.x + 12, G.y + G.h - 8, '세로축: 지구 질량(M⊕)의 배수', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.beginPath();
    const H = ACC.hist.concat([[ACC.T, ACC.maxM]]);
    H.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.stroke(); ctx.restore();
    D.sphere(X(ACC.T), Y(ACC.maxM), 5, '#ea580c', { gloss: false });

    // 충돌 실험
    card(C, '💥 충돌 에너지와 암석의 용융 (단위 질량당)');
    const I = PHONE ? { x: C.x + 10, y: C.y + 36, w: C.w - 20, h: 112 } : { x: C.x + 10, y: C.y + 34, w: 372, h: C.h - 44 };
    const E = PHONE ? { x: C.x + 20, y: C.y + 160, w: C.w - 40, h: 80 } : { x: C.x + 400, y: C.y + 34, w: C.w - 420, h: C.h - 44 };
    drawImpact(I, t, dt);
    drawEnergy(E);
  }
  function drawImpact(I, t, dt) {
    ctx.save(); rr(I.x, I.y, I.w, I.h, 12).clip();
    const gsky = ctx.createLinearGradient(0, I.y, 0, I.y + I.h); gsky.addColorStop(0, '#1e293b'); gsky.addColorStop(1, '#334155');
    ctx.fillStyle = gsky; ctx.fillRect(I.x, I.y, I.w, I.h);
    const gy = I.y + I.h - 16; ctx.fillStyle = '#475569'; ctx.fillRect(I.x, gy, I.w, 16);
    const rx = I.x + I.w - 96, ry = gy - 44;           // 목표 암석 중심
    const sx = I.x + 30, sy = I.y + 28;                 // 충돌체 출발
    const tx = rx - 46, ty = ry - 22;                   // 충돌 지점(암석 왼쪽 위 가장자리)
    if (IMP.t >= 0) {
      IMP.t += dt;
      if (!IMP.hit && IMP.t >= IMP.dur) {
        IMP.hit = true; const E0 = eKin(IMP.v);
        parts.burst(tx, ty, { count: E0 >= MELT_E ? 26 : 12, speed: 60 + IMP.v * 12, life: 0.8, size: 3, gravity: 200, colors: E0 >= MELT_E ? ['#fbbf24', '#f97316', '#ef4444'] : ['#cbd5e1', '#94a3b8'] });
        if (E0 >= MELT_E) S.meltSeen = true;
      }
    }
    const E0 = eKin(IMP.hit ? IMP.v : S.v), ratio = E0 / MELT_E;
    const heatT = IMP.hit ? Math.min(1, ratio) : 0, meltT = IMP.hit && ratio >= 1 ? 1 : 0;
    if (IMP.hit) IMP.idle += dt; if (IMP.idle > 5) { IMP.heat = approach(IMP.heat, 0, dt, 1.2); IMP.melt = approach(IMP.melt, 0, dt, 1.2); } else { IMP.heat = approach(IMP.heat, heatT, dt, 5); IMP.melt = approach(IMP.melt, meltT, dt, 4); }
    // 암석
    const wob = IMP.melt > 0.05 ? Math.sin(t * 5) * 2.2 * IMP.melt : 0;
    if (IMP.melt > 0.05) D.glow(rx, ry, 110, '#fb923c', 0.55 * IMP.melt);
    ctx.fillStyle = mixc(mixc('#94a3b8', '#ef4444', IMP.heat * 0.85), '#fbbf24', IMP.melt);
    ctx.beginPath(); ctx.moveTo(rx - 62, gy); ctx.lineTo(rx - 56, ry + 6 + wob); ctx.lineTo(rx - 32, ry - 24 - wob); ctx.lineTo(rx + 10, ry - 34 + wob); ctx.lineTo(rx + 48, ry - 16 - wob); ctx.lineTo(rx + 66, ry + 12 + wob); ctx.lineTo(rx + 72, gy); ctx.closePath(); ctx.fill();
    if (IMP.melt > 0.3) { ctx.fillStyle = rgba('#fff7c2', 0.5 * IMP.melt); ctx.beginPath(); ctx.ellipse(rx + 4, ry - 6, 26, 12, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(15,23,42,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 충돌체
    if (IMP.t >= 0 && !IMP.hit) {
      const p = IMP.t / IMP.dur, x = lerp(sx, tx, p), y = lerp(sy, ty, p);
      D.sphere(x, y, 8, '#cbd5e1', { shadow: true });
      D.arrow(x - 40 * Math.min(1, 0.3 + S.v / 8), y - 40 * Math.min(1, 0.3 + S.v / 8) * ((ty - sy) / (tx - sx)), x - 10, y - 10 * ((ty - sy) / (tx - sx)), { color: '#fbbf24', width: 3, head: 9 });
    } else if (IMP.t < 0) {
      D.sphere(sx, sy, 8, '#cbd5e1', { shadow: true });
      D.text(sx + 16, sy + 5, 'v = ' + fv(S.v) + ' km/s', { size: 12.5, weight: 800, color: '#e2e8f0', align: 'left' });
    }
    ctx.restore();
    const msg = !IMP.hit ? (IMP.t < 0 ? '속도를 고르고 “충돌시키기”를 눌러요' : '충돌 중…') : ratio >= 1 ? '녹았어요! 용융 필요량의 ' + (Math.round(ratio * 10) / 10) + '배' : '가열되지만 아직 녹지 않아요 (용융 필요량의 ' + Math.round(ratio * 100) + ' %)';
    D.label(I.x + I.w / 2, I.y + I.h - 8 - (PHONE ? 0 : 0), msg, { bg: IMP.hit && ratio >= 1 ? '#dc2626' : '#475569', size: 12.5, pad: 8 });
  }
  function drawEnergy(E) {
    const e = eKin(S.v), L = (x) => Math.log10(x);
    const x0 = E.x + 6, W = E.w - (PHONE ? 20 : 20), Xe = (val) => x0 + (W * (L(val) - 5)) / 3;
    const y1 = E.y + 22;
    D.text(x0, E.y + 8, '½v² (충돌 때 단위 질량의 운동 에너지, 로그 눈금)', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(x0, y1, W, 22, 6).fill();
    const hot = e >= MELT_E;
    ctx.fillStyle = hot ? '#ef4444' : '#f59e0b'; rr(x0, y1, Math.max(0.1, Xe(e) - x0), 22, 6).fill();
    D.dashedLine(Xe(MELT_E), y1 - 4, Xe(MELT_E), y1 + 52, { color: '#0f172a', width: 2.4 });
    D.text(x0, y1 + 70, '┆ 검은 점선: 암석이 녹는 데 필요한 에너지 ' + sci(MELT_E) + ' J/kg', { size: 12.5, weight: 800, color: '#0f172a', align: 'left' });
    [5, 6, 7, 8].forEach((p) => { D.text(Xe(Math.pow(10, p)), y1 + 40, '10' + sup(p), { size: 12, weight: 700, color: '#64748b', align: p === 5 ? 'left' : p === 8 ? 'right' : 'center' }); });
    D.text(x0 + 4, y1 + 17, sci(e) + ' J/kg', { size: 13.5, weight: 800, color: hot ? '#fff' : '#334155', align: 'left' });
  }

  /* ======================================================
     장면 4: 분화 (밀도 차로 층 구조가 생겨요)
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 470 }, B: { x: 8, y: 486, w: 504, h: 306 } }
    : { A: { x: 12, y: 12, w: 470, h: 536 }, B: { x: 490, y: 12, w: 298, h: 536 } };
  const NP4 = 560;
  const P4 = (() => {
    const rnd = seeded(23), a = [], nL = Math.round(NP4 * (1 - Rcrust * Rcrust)), nI = Math.round(NP4 * Rcore * Rcore);
    for (let i = 0; i < NP4; i++) {
      const type = i < nI ? 'fe' : i < nI + nL ? 'lt' : 'si';
      a.push({ type, sx: 0, sy: 0, tx: 0, ty: 0, d: 0, ph: rnd() * 7 });
    }
    // 시작: 섞인 위치 / 끝: 층별 위치(반지름 비율)
    a.forEach((p) => {
      const sr = Math.sqrt(rnd()) * 0.94, sa = rnd() * TAU; p.sx = Math.cos(sa) * sr; p.sy = Math.sin(sa) * sr;
      let lo, hi; if (p.type === 'fe') { lo = 0; hi = Rcore - 0.04; } else if (p.type === 'si') { lo = Rcore + 0.04; hi = Rcrust - 0.04; } else { lo = Rcrust + 0.003; hi = 0.985; }
      const tr = Math.sqrt(lerp(lo * lo, hi * hi, rnd())), ta = rnd() * TAU; p.tx = Math.cos(ta) * tr; p.ty = Math.sin(ta) * tr;
      p.d = p.type === 'fe' ? rnd() * 0.25 : p.type === 'si' ? 0.1 + rnd() * 0.3 : 0.2 + rnd() * 0.3;
    });
    return a;
  })();
  const P4COL = { fe: '#8b97ab', si: '#d2733a', lt: '#f3e3b5' };
  function drawDiffer(t, dt) {
    const { A, B } = RC4;
    S.diff = clamp(S.diff + S.diffDir * dt * (S.diffDir > 0 ? 0.2 : 0.7), 0, 1);
    if (S.diffDir > 0 && S.diff >= 1) S.diffDir = 0; if (S.diffDir < 0 && S.diff <= 0) S.diffDir = 0;
    const p = RM ? Math.round(S.diff) : S.diff;
    card(A, '🌍 원시 지구의 단면 (마그마 바다)', { bg: '#fff7ed' });
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 14, Rd = Math.min(A.w / 2 - 22, A.h / 2 - 40);
    const heat = S.diffDir > 0 ? 1 : 0; S.heat4 = approach(S.heat4, heat, dt, 2.5);
    D.glow(cx, cy, Rd * (1.25 + 0.12 * S.heat4), '#fb923c', 0.35 + 0.35 * (1 - p * 0.5) + 0.2 * S.heat4);
    // 바탕: 섞여 있을 때는 마그마, 분리되면 층 색
    const gm = ctx.createRadialGradient(cx - Rd * 0.3, cy - Rd * 0.3, Rd * 0.1, cx, cy, Rd);
    gm.addColorStop(0, '#fdba74'); gm.addColorStop(1, '#ea580c');
    ctx.fillStyle = gm; ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalAlpha = smooth(p);
    ctx.fillStyle = '#a8522b'; ctx.beginPath(); ctx.arc(cx, cy, Rd * Rcrust, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d6dbe4'; ctx.beginPath(); ctx.arc(cx, cy, Rd * Rcore, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f5e6bd'; ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, TAU); ctx.arc(cx, cy, Rd * Rcrust, 0, TAU, true); ctx.fill();
    ctx.restore();
    P4.forEach((q) => {
      const k = smooth(clamp((p - q.d * 0.5) / 0.5, 0, 1)), shake = (1 - k) * Math.min(1, S.diffDir > 0 ? 1 : 0.2) * (RM ? 0 : 1);
      const jx = Math.sin(t * 9 + q.ph) * 2.2 * shake * (p > 0 && p < 1 ? 1 : 0), jy = Math.cos(t * 8 + q.ph * 1.3) * 2.2 * shake * (p > 0 && p < 1 ? 1 : 0);
      const x = cx + lerp(q.sx, q.tx, k) * Rd + jx, y = cy + lerp(q.sy, q.ty, k) * Rd + jy;
      ball(x, y, q.type === 'lt' ? 3 : 5.4, P4COL[q.type], q.type !== 'lt');
    });
    ctx.strokeStyle = 'rgba(120,53,15,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, TAU); ctx.stroke();
    // 층 이름
    if (p > 0.9) {
      const a = clamp((p - 0.9) * 10, 0, 1); ctx.save(); ctx.globalAlpha = a;
      D.label(cx, cy, '핵 (철·니켈)', { bg: '#475569', size: 13, pad: 8 });
      D.label(cx, cy - Rd * 0.78, '맨틀 (규산염)', { bg: '#9a3412', size: 13, pad: 8 });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a; D.label(cx, A.y + A.h - 14, '가장 가벼운 물질 (바깥 얇은 층)', { bg: '#a16207', size: 12.5, pad: 8 }); ctx.restore();
    } else {
      D.text(cx, A.y + A.h - 12, p > 0.01 ? (S.diffDir > 0 ? '무거운 입자가 가라앉고 있어요…' : '다시 섞이고 있어요…') : '철·규산염·가벼운 입자가 섞여 있어요', { size: 13.5, weight: 800, color: '#9a3412' });
    }
    if (S.diffDir > 0) D.text(A.x + A.w - 12, A.y + 8 + 15 * FS, '중력 에너지 → 열 🔥', { size: 13, weight: 800, color: '#c2410c', align: 'right' });
    // 범례
    const ly = A.y + 8 + 15 * FS + (PHONE ? 22 : 24);
    [['fe', '철·니켈'], ['si', '규산염'], ['lt', '가벼운 물질']].forEach((q, i) => { const lx = A.x + 16 + i * (PHONE ? 130 : 110); D.sphere(lx, ly, 5.5, P4COL[q[0]], { gloss: false }); D.text(lx + 10, ly + 4.5, q[1], { size: 12.5, weight: 700, color: '#475569', align: 'left' }); });

    // 오른쪽: 밀도 분포
    card(B, '📊 반지름에 따른 밀도');
    const gx = B.x + 50, gy = B.y + 44, gw = B.w - 70, gh = PHONE ? 150 : 250;
    const X = (f) => gx + gw * f, Y = (rho) => gy + gh - (gh * rho) / 12;
    ctx.fillStyle = '#f8fafc'; rr(gx, gy, gw, gh, 4).fill();
    [0, 3, 6, 9, 12].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); D.text(gx - 6, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(gx - 6, gy - 8, 'g/cm³', { size: 12, weight: 800, color: '#64748b', align: 'right' });
    D.text(gx, gy + gh + 15 * FS, '중심', { size: 12.5, weight: 700, color: '#64748b', align: 'left' }); D.text(gx + gw, gy + gh + 15 * FS, '표면', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
    const kk = smooth(p), rc = lerp(RHO_MEAN, RHO.core, kk), rm = lerp(RHO_MEAN, RHO.mantle, kk), rcr = lerp(RHO_MEAN, RHO.crust, kk);
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    ctx.fillStyle = 'rgba(56,189,248,.18)'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), Y(rc)); ctx.lineTo(X(Rcore), Y(rc)); ctx.lineTo(X(Rcore), Y(rm)); ctx.lineTo(X(Rcrust), Y(rm)); ctx.lineTo(X(Rcrust), Y(rcr)); ctx.lineTo(X(1), Y(rcr)); ctx.lineTo(X(1), Y(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(X(0), Y(rc)); ctx.lineTo(X(Rcore), Y(rc)); ctx.lineTo(X(Rcore), Y(rm)); ctx.lineTo(X(Rcrust), Y(rm)); ctx.lineTo(X(Rcrust), Y(rcr)); ctx.lineTo(X(1), Y(rcr)); ctx.stroke();
    ctx.restore();
    D.dashedLine(gx, Y(RHO_MEAN), gx + gw, Y(RHO_MEAN), { color: '#7c3aed', width: 2 });
    D.text(gx + gw - 4, Y(RHO_MEAN) - 5, '지구 평균 ' + RHO_MEAN.toFixed(1), { size: 12.5, weight: 800, color: '#6d28d9', align: 'right' });
    if (kk > 0.95) {
      D.text(X(Rcore / 2), Y(RHO.core) - 6, '약 ' + RHO.core.toFixed(0), { size: 12.5, weight: 800, color: '#0369a1' });
      D.text(X((Rcore + Rcrust) / 2), Y(RHO.mantle) - 6, '약 ' + RHO.mantle.toFixed(1), { size: 12.5, weight: 800, color: '#0369a1' });
      D.text(X(1) - 3, Y(RHO.crust) + 16, '지표 암석 ' + RHO.crust.toFixed(1), { size: 12, weight: 800, color: '#0369a1', align: 'right' });
    }
    let ty = gy + gh + 44 * (PHONE ? 0.8 : 1);
    const lines = ['핵 반지름 = 지구 반지름의 약 ' + Math.round(Rcore * 100) + ' %', '핵의 부피 = 지구 부피의 약 ' + Math.round(VOLF.core * 100) + ' % (' + Rcore + '³)', '평균 밀도: 분화 전 ' + RHO_MEAN.toFixed(1) + ' → 분화 후 ' + RHO_MEAN.toFixed(1) + ' g/cm³'];
    lines.forEach((l, i) => D.text(B.x + 16, ty + i * 24 * (PHONE ? 0.92 : 1), l, { size: 13.5, weight: 800, color: '#334155', align: 'left' }));
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { collapse: '🌀 성운 수축', condense: '🧊 응축', accrete: '☄️ 집적', differ: '⚖️ 분화' };
  const FREE_KEYS = { collapse: ['sR'], condense: ['sD'], accrete: ['play', 'vimp'], differ: ['diff'] };
  let ctlKeys = [];
  const stpV = makeStepper($('#stpV'), { min: 1, max: 20, step: 1, value: 1, unit: '배', dec: 0 });
  const MAT_ITEMS = PLANETS.map((p) => ({ id: p.id, label: p.n + ' · ' + fau(p.r) + ' AU · ' + Math.round(tempAt(p.r)) + ' K' }));
  const MAT_BINS = [{ id: 'a', label: '금속·규산염만' }, { id: 'b', label: '+ 물 얼음' }];
  const clsMat = makeClassify($('#clsMat'), MAT_ITEMS, MAT_BINS, { me: 'a', ea: 'a', ju: 'b', ne: 'b' }, () => { S.bad = []; });
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
  const fmtR = (v) => v + ' AU';
  SciSim.bindRange($('#sR'), $('#oR'), fmtR, (v) => { S.r = v; });
  const fmtD = (v) => fau(rFromSlider(v)) + ' AU';
  SciSim.bindRange($('#sD'), $('#oD'), fmtD, (v) => { S.dist = rFromSlider(v); });
  SciSim.bindRange($('#sV'), $('#oV'), (v) => fv(v) + ' km/s', (v) => { S.v = v; clearTimeout(impTimer); impTimer = setTimeout(startImpact, 600); });
  function setR(v) { S.r = v; setSlider($('#sR'), $('#oR'), v, fmtR); }
  function setDist(r) { S.dist = r; setSlider($('#sD'), $('#oD'), sliderOfR(r), fmtD); $('#oD').textContent = fau(r) + ' AU'; }
  function setV(v) { S.v = v; setSlider($('#sV'), $('#oV'), v, (x) => fv(x) + ' km/s'); }
  $$('#presets .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setDist(+b.dataset.r); }));
  $('#bPlay').addEventListener('click', () => { Sound.click(); if (ACC.T >= T_END) return; ACC.play = !ACC.play; syncPlayBtn(); });
  $('#bFast').addEventListener('click', () => { Sound.click(); ACC.fast = !ACC.fast; syncPlayBtn(); });
  $('#bAccReset').addEventListener('click', () => { Sound.click(); accReset(); syncPlayBtn(); });
  $('#bImpact').addEventListener('click', () => { Sound.click(); startImpact(); });
  $('#bDiff').addEventListener('click', () => { Sound.click(); if (S.diff < 1) S.diffDir = 1; });
  $('#bMix').addEventListener('click', () => { Sound.click(); S.diffDir = -1; });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'condense') return false;
      const g = geo2();
      if (p.x < g.x0 - 6 || p.x > g.x1 + 6 || p.y < g.GT - 8 || p.y > g.SY + 40) return false;
      setDist(clamp(0.3 * Math.exp((LGR * (p.x - g.x0)) / (g.x1 - g.x0)), 0.3, 35)); return true;
    },
    move(p) { const g = geo2(); setDist(clamp(0.3 * Math.exp((LGR * (p.x - g.x0)) / (g.x1 - g.x0)), 0.3, 35)); },
    hover(p) { if (S.mode !== 'condense') return ''; const g = geo2(); return p.x >= g.x0 - 6 && p.x <= g.x1 + 6 && p.y >= g.GT - 8 && p.y <= g.SY + 40 ? 'ew-resize' : ''; },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    clearTimeout(impTimer); IMP.t = -1; IMP.hit = false; IMP.heat = 0; IMP.melt = 0; IMP.idle = 0; S.meltSeen = false;
    setR(100); S.rv = 100; S.diskDone = false; stpV.reset();
    setDist(1); S.distV = 1; clsMat.reset();
    accReset(); setV(1); syncPlayBtn();
    S.diff = 0; S.diffDir = 0; S.heat4 = 0;
    if (li === 0) { setMode('collapse'); setCtl(['sR']); showHint('슬라이더를 왼쪽으로 밀어 성운을 수축시켜 봐요', 5000); }
    else if (li === 1) { setMode('condense'); setCtl(['sD']); showHint('거리를 바꾸며 온도와 알갱이를 살펴봐요', 5000); }
    else if (li === 2) { setMode('accrete'); setCtl(['play']); showHint('▶ 시작을 눌러 미행성체가 뭉치는 모습을 봐요', 5000); }
    else { setMode('differ'); setCtl(['diff']); showHint('“분화 실행”을 눌러 입자들이 층을 이루게 해요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '성운 수축: 납작한 원반이 되다', short: '성운 수축', icon: '🌀', phase: '모형', features: ['collapse'],
      intro: '<p class="si-q">❓ 탐구 질문: 먼지 구름이던 성운이 어떻게 층이 있는 행성 지구가 되었을까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 통합과학에서</b> 태양계 행성을 지구형·목성형으로 나누고, 지구가 지각·맨틀·핵의 층으로 이루어져 있다는 것을 배웠어요. 이번에는 행성들이 <b>어떻게 만들어졌는지</b> 거슬러 올라가 봐요.</div>' +
        '<p>약 46억 년 전, 가스와 먼지로 이루어진 거대한 <b>성운</b>이 자신의 중력으로 수축하기 시작했어요. 성운은 처음부터 아주 천천히 회전하고 있었어요. 질량이 변하지 않으면 회전하는 물체의 <b>반지름 r × 회전 속도 v</b>는 일정해요(회전 운동의 양 보존). 수축하면 어떤 일이 생길까요?</p>',
      setup() { resetStep(0); },
      recap: '성운이 수축하면 회전 속도가 빨라지고(r × v 일정), 회전축 방향으로 납작한 원반이 되며 중심에 원시 태양이 생겨요.',
      summary: '<ul><li>약 46억 년 전 회전하던 <b>성운</b>이 중력으로 수축해요.</li><li>회전 운동의 양 보존: 질량이 같으면 <b>r × v = 일정</b>. 예시: r이 100 AU → 10 AU로 1/10이 되면 v는 <b>10배</b>.</li><li>회전축 방향으로는 수축하지만 회전하는 면에서는 원심 효과 때문에 덜 수축해 <b>납작한 원반</b>이 되고, 중심에 <b>원시 태양</b>이 생겨요.</li><li>그래서 행성들은 거의 같은 평면에서 같은 방향으로 공전해요.</li></ul>',
      missions: [
        {
          title: '성운을 원반으로 수축시키기',
          goal: '반지름 r 슬라이더를 왼쪽으로 밀어 성운을 <b>15 AU 이하</b>로 수축시키고, 옆에서 본 모습이 <b>납작한 원반</b>이 되는 것을 확인해요.',
          hint: '슬라이더를 왼쪽 끝(10 AU) 근처까지 밀면 옆에서 본 성운이 얇아져요.',
          setup() { setR(100); S.rv = 100; setMode('collapse'); setCtl(['sR']); },
          check: () => S.r <= 15, hold: 0.6,
          status: () => mark(S.r <= 15) + ' 반지름 r = ' + Math.round(S.r) + ' AU (목표 15 AU 이하)',
          explain: '성운이 수축하면서 회전 속도가 빨라지고, 회전축 방향으로는 납작해졌어요. 그래서 <b>납작한 원반</b>과 그 중심의 <b>원시 태양</b>이 만들어져요.',
        },
        {
          title: '회전 속도는 몇 배가 될까',
          goal: '성운의 반지름 r이 100 AU에서 <b>1/10(10 AU)</b>이 되면 회전 속도 v는 처음의 몇 배가 될까요? 숫자를 입력해요.',
          hint: 'r × v가 일정해요. r이 1/10이 되면 v는 거꾸로 10배가 돼요. 아래쪽 막대에서도 확인해 보세요.',
          setup() { setMode('collapse'); setCtl(['sR', 'qv']); },
          check: () => stpV.value === 10, hold: 0.5,
          status: () => mark(stpV.value === 10) + ' 입력한 값 ' + stpV.value + '배',
          explain: 'r × v = 일정이므로 100 AU × 1 = 10 AU × <b>10</b>. 반지름이 1/10이 되면 회전 속도는 <b>10배</b>가 돼요. 스케이터가 팔을 오므리면 더 빨리 도는 것과 같아요.',
        },
        {
          type: 'quiz', title: '같은 평면, 같은 방향의 공전',
          goal: '태양계 행성들은 거의 같은 평면에서 같은 방향으로 공전해요. 그 까닭으로 가장 알맞은 것은?',
          setup() { setMode('collapse'); setCtl(['sR']); },
          choices: ['행성들이 태양에서 떨어져 나온 조각이기 때문이에요', '회전하던 성운이 납작한 원반이 되었고, 그 원반에서 행성이 만들어졌기 때문이에요', '행성들의 중력이 서로 궤도를 맞춰 주었기 때문이에요', '우연히 그렇게 되었을 뿐 까닭이 없어요'],
          answer: 1,
          feedback: ['행성은 태양에서 떨어져 나온 조각이 아니라 같은 성운의 원반에서 따로 뭉쳐 만들어졌어요.', '', '행성 사이의 중력은 약해서 궤도 면을 맞출 수 없어요. 처음 원반의 모양이 그대로 남은 거예요.', '같은 방향·같은 평면이라는 규칙성은 원반에서 만들어졌다는 증거예요.'],
          explain: '회전하던 성운이 수축하며 <b>납작한 원반</b>이 되었고, 행성은 이 원반에서 만들어졌어요. 그래서 행성의 공전 궤도는 거의 같은 평면에 있고 공전 방향도 같아요.',
        },
      ],
    },
    {
      title: '응축: 눈선의 안과 바깥', short: '응축', icon: '🧊', phase: '탐구', features: ['condense'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 성운이 납작한 원반이 되고 중심에 원시 태양이 생겼어요. 원반은 태양에서 멀수록 차가워요.</div>' +
        '<p>원반의 온도는 태양에서 멀어질수록 낮아져요. 온도에 따라 <b>고체로 응축</b>하는 물질이 달라요. 금속과 규산염은 원반 어디서나 고체이지만, <b>물 얼음</b>은 약 170 K 이하인 곳에서만 생겨요. 이 경계를 <b>눈선</b>이라고 해요. 거리 슬라이더를 움직이며 온도와 알갱이를 살펴봐요.</p>',
      setup() { resetStep(1); },
      recap: '눈선(약 170 K, 약 2.7 AU) 안쪽은 금속·규산염만 고체라 작은 지구형 행성이, 바깥은 얼음까지 응축해 큰 핵이 자라 목성형 행성이 돼요.',
      summary: '<table class="mini"><tr><th>천체</th><th>거리</th><th>온도(예시)</th><th>응축하는 고체</th></tr><tr><td>수성</td><td>0.4 AU</td><td>약 440 K</td><td>금속·규산염</td></tr><tr><td>지구</td><td>1 AU</td><td>280 K</td><td>금속·규산염</td></tr><tr><td>눈선</td><td>약 2.7 AU</td><td>170 K</td><td>물 얼음 시작</td></tr><tr><td>목성</td><td>5.2 AU</td><td>약 123 K</td><td>+ 물 얼음</td></tr><tr><td>해왕성</td><td>30 AU</td><td>약 51 K</td><td>+ 물 얼음</td></tr></table><ul><li>눈선 바깥은 얼음이 더해져 고체 재료가 약 <b>4배</b>예요.</li><li>큰 핵이 빨리 자라 <b>수소·헬륨 기체</b>를 끌어당겨 목성형 행성이 돼요. 안쪽은 암석·금속뿐이라 작은 지구형 행성이에요.</li></ul>',
      missions: [
        {
          title: '눈선 찾기',
          goal: '거리 슬라이더를 움직여 원반의 온도가 <b>물 얼음이 응축하는 170 K</b>(±5 K)이 되는 위치, 곧 <b>눈선</b>을 찾아요.',
          hint: '지구(280 K)와 목성(123 K) 사이예요. 온도가 170 K 근처가 될 때까지 거리를 조금씩 바꿔 보세요. 약 2.7 AU예요.',
          setup() { setDist(1); S.distV = 1; setMode('condense'); setCtl(['sD']); },
          check: () => Math.round(tempAt(S.dist)) >= 165 && Math.round(tempAt(S.dist)) <= 175, hold: 0.8,
          status: () => mark(Math.round(tempAt(S.dist)) >= 165 && Math.round(tempAt(S.dist)) <= 175) + ' 거리 ' + fau(S.dist) + ' AU · 온도 ' + Math.round(tempAt(S.dist)) + ' K (목표 165~175 K)',
          explain: '온도 T = 280 K / √(r / 1 AU)가 170 K가 되는 거리는 r = (280/170)² ≈ <b>2.7 AU</b>예요. 이 눈선의 안쪽에서는 물이 얼음으로 응축하지 못해요.',
        },
        {
          title: '거리별 고체 재료 짝짓기', manual: true,
          goal: '각 행성의 위치에서 고체로 응축해 있는 재료를 골라요. 온도를 170 K와 비교해요.',
          hint: '온도가 170 K보다 높으면 물은 기체로 남아서 금속·규산염만 고체예요. 170 K보다 낮으면 물 얼음도 고체예요.',
          setup() { clsMat.reset(); S.bad = []; setMode('condense'); setCtl(['sD', 'cards']); },
          status: () => mark(clsMat.ok()) + ' 짝지은 위치 ' + clsMat.count() + ' / 4',
          check() {
            if (!clsMat.complete()) return '위치 4곳을 모두 골라 주세요. (지금 ' + clsMat.count() + '곳)';
            const w = clsMat.wrong(); clsMat.mark(w);
            if (w.length) return '빨간 위치 ' + w.length + '곳을 다시 확인해 보세요. 그 온도가 170 K보다 높은지 낮은지 비교해요.';
            return true;
          },
          explain: '수성(약 443 K)과 지구(280 K)는 170 K보다 높아 <b>금속·규산염</b>만 고체예요. 목성(약 123 K)과 해왕성(약 51 K)은 170 K보다 낮아 <b>물 얼음</b>도 고체예요(더 추운 곳에서는 다른 얼음도 생겨요).',
        },
        {
          type: 'quiz', title: '목성형 행성이 바깥에서 자란 까닭',
          goal: '목성형 행성이 눈선 <b>바깥</b>에서 크게 자란 까닭으로 알맞은 것은?',
          setup() { setDist(5.2); S.distV = 5.2; setMode('condense'); setCtl(['sD']); },
          choices: ['처음부터 기체 덩어리로 태어났기 때문이에요', '얼음까지 응축해 고체 재료가 약 4배 많아서 큰 핵이 빨리 자라 기체를 끌어당겼기 때문이에요', '태양에서 멀어 중력이 없었기 때문이에요', '눈선 안쪽에는 재료가 하나도 없었기 때문이에요'],
          answer: 1,
          feedback: ['목성형 행성도 처음에는 고체 핵이 먼저 자랐고, 그 뒤에 기체를 끌어당겼어요.', '', '행성이 만들어지는 데에는 원반 속 물질 사이의 중력이 중요해요. 태양에서 멀어도 중력은 있어요.', '안쪽에도 금속·규산염 재료는 있었지만, 얼음이 없어서 양이 적었어요.'],
          explain: '눈선 바깥에서는 금속·규산염에 <b>물 얼음</b>이 더해져 고체 재료가 약 4배예요. 큰 핵이 빨리 자라 중력으로 <b>수소·헬륨 기체</b>를 끌어당겨 목성형 행성이 되었어요. 처음부터 기체 덩어리였던 것은 아니에요.',
        },
      ],
    },
    {
      title: '집적: 부딪치고 뭉치다', short: '집적', icon: '☄️', phase: '모형', features: ['accrete'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원반 속에서 고체 알갱이가 응축했어요. 지구형 행성의 재료인 금속·규산염 알갱이가 이제 어떻게 행성이 될까요?</div>' +
        '<p>알갱이는 서로 붙어 수 km 크기의 <b>미행성체</b>가 되고, 미행성체는 중력으로 서로 끌어당겨 충돌·합체하며 <b>원시 행성</b>으로 자라요. 큰 천체일수록 더 잘 끌어당겨 더 빨리 커지는 <b>폭주 성장</b>이 일어나요. 지구는 이렇게 약 수천만~1억 년 동안 만들어졌어요. (이 모형은 단순화한 예시예요.)</p>',
      setup() { resetStep(2); },
      recap: '미행성체가 충돌·합체하며 원시 행성이 자라요. 충돌의 운동 에너지(½v²)가 열로 바뀌어 암석을 녹일 수 있어요.',
      summary: '<ul><li><b>집적</b>: 먼지 → 미행성체(수 km) → 원시 행성. 큰 천체가 더 잘 끌어당겨 <b>폭주 성장</b>해요. 지구의 집적은 약 수천만~1억 년.</li><li>충돌 에너지(단위 질량당) ½v². 예시: v = 1 km/s → 5×10⁵ J/kg, 2 km/s → 2×10⁶ J/kg.</li><li>암석을 녹이는 데 약 1.6×10⁶ J/kg가 필요해요 → 약 2 km/s 이상이면 녹아요.</li><li>원시 지구 말기의 충돌 속도는 탈출 속도 약 11 km/s와 비슷해 ½v² ≈ 6×10⁷ J/kg로, 용융에 필요한 값의 <b>약 40배</b>예요. 그래서 원시 지구는 <b>마그마 바다</b> 상태가 되었어요.</li></ul>',
      missions: [
        {
          title: '원시 행성 만들기',
          goal: '▶ 시작을 눌러 미행성체를 합쳐, 가장 큰 천체의 질량이 <b>지구 질량의 0.1배</b> 이상이 되게 해요.',
          hint: '▶ 시작을 누르고 기다려요. ⏩ ×3 단추로 더 빠르게 볼 수 있어요. 가장 큰 천체의 질량은 오른쪽 그래프에 나타나요.',
          setup() { accReset(); setMode('accrete'); setCtl(['play']); syncPlayBtn(); },
          check: () => ACC.maxM >= 10, hold: 0.4,
          status: () => mark(ACC.maxM >= 10) + ' 가장 큰 천체 ' + fME(ACC.maxM) + ' M⊕ (목표 0.10 이상) · ' + fTime(tMan()),
          explain: '처음 지구 질량의 1/100이던 미행성체 100개가 충돌·합체하며 점점 커지고, 큰 천체일수록 더 잘 끌어당겨 <b>폭주 성장</b>해요. 이렇게 지구 질량의 0.1배가 넘는 <b>원시 행성</b>이 만들어져요.',
        },
        {
          title: '충돌 속도와 암석의 용융',
          goal: '충돌 속도를 <b>2 km/s 이상</b>으로 올려 “충돌시키기”를 눌러요. ½v²가 암석이 녹는 데 필요한 에너지(1.6×10⁶ J/kg)를 넘으면 암석이 녹아요.',
          hint: '충돌 속도 슬라이더를 2 km/s 이상으로 옮기면 잠시 뒤 충돌이 일어나요. 막대가 검은 선(용융 필요량)을 넘으면 암석이 녹아요.',
          setup() { setV(1); S.meltSeen = false; IMP.t = -1; IMP.hit = false; IMP.heat = 0; IMP.melt = 0; setMode('accrete'); setCtl(['play', 'vimp']); },
          check: () => S.v >= 2 && S.meltSeen, hold: 0.5,
          status: () => mark(S.v >= 2) + ' 충돌 속도 ' + fv(S.v) + ' km/s · ' + mark(S.meltSeen) + ' 암석이 녹는 것 확인',
          explain: '½v²는 v = 1 km/s에서 5×10⁵, 2 km/s에서 <b>2×10⁶ J/kg</b>예요. 용융에 필요한 약 1.6×10⁶ J/kg보다 크므로 약 2 km/s 이상이면 암석이 녹아요. 원시 지구 말기의 충돌은 이보다 훨씬 빨랐어요.',
        },
        {
          type: 'quiz', title: '원시 지구가 녹은 까닭',
          goal: '집적이 끝나갈 무렵 원시 지구가 <b>녹은 상태</b>(마그마 바다)가 된 가장 큰 까닭은?',
          setup() { setMode('accrete'); setCtl(['play', 'vimp']); },
          choices: ['충돌한 천체들의 운동 에너지가 열로 바뀌었기 때문이에요', '태양이 지구를 직접 녹였기 때문이에요', '처음부터 지구가 녹아 있는 별이었기 때문이에요', '지구가 너무 빨리 식었기 때문이에요'],
          answer: 0,
          feedback: ['', '태양의 복사 에너지만으로는 행성 전체를 녹일 수 없어요.', '지구는 별이 아니라 먼지와 암석이 모여 만들어졌어요.', '식으면 굳어요. 녹은 까닭은 충돌로 열이 계속 더해졌기 때문이에요.'],
          explain: '빠르게 충돌한 천체의 <b>운동 에너지가 열로 바뀌어</b> 암석을 녹였어요. 말기 충돌의 ½v²(약 6×10⁷ J/kg)는 용융에 필요한 값의 약 40배예요.',
        },
      ],
    },
    {
      title: '분화: 무거운 것은 가라앉는다', short: '분화', icon: '⚖️', phase: '모형', features: ['differ'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌 에너지로 원시 지구가 전체적으로 녹은 <b>마그마 바다</b> 상태가 되었어요.</div>' +
        '<p>녹은 원시 지구에서는 밀도가 큰 물질이 중심으로 가라앉고 가벼운 물질은 위로 떠올랐어요. 이 과정을 <b>분화</b>라고 해요. 섞여 있던 철·니켈, 규산염, 가벼운 물질이 층을 이뤄 <b>핵 · 맨틀 · 지각</b>이 만들어졌어요. 이때 중력 에너지가 열로 방출돼요.</p>',
      setup() { resetStep(3); },
      recap: '마그마 바다에서 밀도 차로 철·니켈은 중심으로 가라앉아 핵, 규산염은 맨틀, 가장 가벼운 물질은 위로 모여 층 구조가 생겼어요.',
      summary: '<ul><li><b>분화</b>: 녹은 원시 지구에서 밀도 차로 물질이 층을 이뤄요. 철·니켈 합금(약 8 g/cm³, 핵 내부는 압력으로 약 11~13) → 중심의 <b>핵</b>, 규산염(맨틀 약 3.3~5.6) → <b>맨틀</b>, 가장 가벼운 물질(약 2.7~3.0) → 위쪽 <b>지각</b>.</li><li>핵은 반지름의 약 55 %, 부피의 약 16 %.</li><li>분화 전·후에 지구 전체의 평균 밀도는 <b>같아요</b>(약 5.5 g/cm³). 지표 암석(약 2.8)보다 훨씬 크다는 것은 내부에 무거운 물질이 있다는 증거예요.</li><li>분화로 중력 에너지가 열로 방출돼요.</li></ul>',
      missions: [
        {
          title: '분화시켜 3층 만들기',
          goal: '“분화 실행”을 눌러 섞여 있던 입자들이 밀도 순서대로 <b>핵 · 맨틀 · 가벼운 바깥층</b> 3층으로 나뉘게 해요.',
          hint: '아래쪽 “🔥 분화 실행” 단추를 누르고 입자들이 다 자리 잡을 때까지 5초쯤 기다려요.',
          setup() { S.diff = 0; S.diffDir = 0; setMode('differ'); setCtl(['diff']); },
          check: () => S.diff >= 0.98, hold: 0.5,
          status: () => mark(S.diff >= 0.98) + ' 분화 진행 ' + Math.round(S.diff * 100) + ' %',
          explain: '밀도가 큰 <b>철·니켈</b>은 중심으로 가라앉아 핵이 되고, <b>규산염</b>은 맨틀을 이루며, 가장 가벼운 물질은 위로 떠올랐어요. 분화가 끝나면 평균 밀도(약 5.5 g/cm³)는 그대로예요.',
        },
        {
          type: 'quiz', title: '지구 평균 밀도가 알려 주는 것',
          goal: '지구의 평균 밀도는 약 <b>5.5 g/cm³</b>이고 지표 암석의 밀도는 약 <b>2.8 g/cm³</b>예요. 이 차이가 알려 주는 사실은?',
          setup() { S.diff = 1; S.diffDir = 0; setMode('differ'); setCtl(['diff']); },
          choices: ['지구 내부에 지표 암석보다 훨씬 무거운 물질(철 등)이 있어요', '지구는 처음부터 지금과 같은 층 구조였어요', '지구 내부는 비어 있어요', '지표 암석이 지구 전체를 대표해요'],
          answer: 0,
          feedback: ['', '처음에는 물질이 섞여 있었고, 녹은 상태에서 분화를 거쳐 층 구조가 생겼어요.', '속이 비었다면 평균 밀도가 더 작아졌을 거예요.', '지표 암석의 밀도가 평균보다 훨씬 작으니 지표 암석만으로는 전체를 설명할 수 없어요.'],
          explain: '지표 암석(약 2.8)보다 평균 밀도(약 5.5)가 훨씬 크다는 것은 내부에 <b>더 무거운 물질</b>(철·니켈의 핵)이 있다는 증거예요. 지구는 처음부터 층 구조였던 것이 아니라 <b>분화</b>를 거쳐 층 구조를 갖추게 되었어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-solar-nebula', mount: '#game', badge: '태양계 건축가', homeHref: '../../index.html#hs',
    featureLabels: { collapse: '🌀 성운 수축 · 원반', condense: '🧊 응축 온도 · 눈선', accrete: '☄️ 집적 · 충돌 에너지', differ: '⚖️ 분화 · 밀도 분포' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'collapse') setReadouts(['반지름 r', Math.round(S.r) + ' AU', '회전 속도 v', fv(100 / S.r) + '배', 'r × v', '100 (일정)']);
    else if (m === 'condense') { const T = tempAt(S.dist); setReadouts(['거리', fau(S.dist) + ' AU', '온도', Math.round(T) + ' K', '고체 재료', T < SNOW_T ? '금속·규산염 + 얼음' : '금속·규산염']); }
    else if (m === 'accrete') setReadouts(['가장 큰 천체', fME(ACC.maxM) + ' M⊕', '경과 시간', fTime(tMan()), '½v²', sci(eKin(S.v)) + ' J/kg']);
    else setReadouts(['분화 진행', Math.round(S.diff * 100) + ' %', '핵 반지름', '약 ' + Math.round(Rcore * 100) + ' %', '평균 밀도', RHO_MEAN.toFixed(1) + ' g/cm³']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.rv = approach(S.rv, S.r, dt, 7);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'collapse') drawCollapse(t, dt);
    else if (S.mode === 'condense') drawCondense(t, dt);
    else if (S.mode === 'accrete') drawAccrete(t, dt);
    else drawDiffer(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    if (S.r <= 15 && !S.diskDone && S.mode === 'collapse') { S.diskDone = true; const B = RC1.B; parts.burst(B.x + B.w / 2, B.y + B.h / 2, { count: 22, speed: 140, colors: ['#fbbf24', '#38bdf8', '#a78bfa'] }); }
    if (S.r > 20) S.diskDone = false;
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, ACC, ACCP, IMP, T_END, stpV, clsMat, RC1, RC2, RC3, RC4, tempAt, SNOW_R, eKin, MELT_E, RHO_MEAN, VOLF,
    get game() { return game; }, setMode, setR, setDist, setV, resetStep, updateCtl, accStep, accAdvance, startImpact, geo2, dX,
    runAcc(sec) { ACC.play = true; let k = Math.round(sec * 120); while (k-- > 0 && ACC.T < T_END) accStep(1 / 120); ACC.maxM = ACC.B.reduce((m, b) => Math.max(m, b.m), 0); ACC.hist.push([ACC.T, ACC.maxM]); },
    solveMat() { PLANETS.forEach((p) => { clsMat.sel[p.id] = p.r > SNOW_R ? 'b' : 'a'; }); },
  };
})();
