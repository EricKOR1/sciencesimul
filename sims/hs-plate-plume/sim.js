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
  initStage('#eaf1f7', 800, 560, 520, 760, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }
  const DEG = Math.PI / 180;
  const SUP = { 10: '10', 12: '12', 13: '13', 5: '5' };

  const S = {
    mode: 'ridge', fade: 0, clock: 0, bad: [],
    age: 10, ageV: 10, read: 3000, showD: false,
    L: 500, showF: false, stF: 1.0,
    pv: 5, pf: 0, hold: 0, tomoOn: false, tomoK: 0, tblOn: false, tr: 30,
    tau: 0, play: false, plotted: { maui: false, oahu: false, kauai: false }, hv: 5, fitShow: false,
  };
  const fN = (x, d) => Number(x).toFixed(d);

  /* ======================================================
     장면 1: 해령의 힘 — 식으면서 가라앉는 해양 암석권
     ====================================================== */
  const dSea = (t) => 2500 + 350 * Math.sqrt(t);          // 수심 (m), t: 백만 년
  const hLith = (t) => 12 * Math.sqrt(t);                  // 암석권 두께 (km, 예시)
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 488 }, B: { x: 8, y: 504, w: 504, h: 248 } }
    : { A: { x: 12, y: 12, w: 560, h: 536 }, B: { x: 580, y: 12, w: 208, h: 536 } };
  const RID = [];
  function ridgeStep(dt) {
    S.ageV = approach(S.ageV, S.age, dt, 12);
    S.racc = (S.racc || 0) + 5 * dt;
    while (S.racc >= 1) { S.racc -= 1; if (RID.length < 40) RID.push({ x: 0, y: Math.random() }); }
    for (let i = RID.length - 1; i >= 0; i--) { const q = RID[i]; q.x += 3.2 * dt; if (q.x > 70) RID.splice(i, 1); }
  }
  function drawRidge(t, dt) {
    const { A, B } = RC1;
    ridgeStep(dt);
    card(A, '🌊 해령에서 멀어질수록 식어서 가라앉아요 (모형)');
    const PA = { x: A.x + 56, y: A.y + (PHONE ? 52 : 56), w: A.w - 76, h: PHONE ? 166 : 196 };
    const X = (tt) => PA.x + (tt / 70) * PA.w, Yd = (d) => PA.y + ((d - 2400) / 3200) * PA.h;
    // 수심 그래프
    ctx.save(); rr(PA.x, PA.y, PA.w, PA.h, 6).clip();
    ctx.fillStyle = '#cfeaf9'; ctx.fillRect(PA.x, PA.y, PA.w, PA.h);
    ctx.beginPath(); ctx.moveTo(PA.x, PA.y + PA.h); for (let i = 0; i <= 140; i++) { const tt = (70 * i) / 140; ctx.lineTo(X(tt), Yd(dSea(tt))); } ctx.lineTo(PA.x + PA.w, PA.y + PA.h); ctx.closePath();
    const gg = ctx.createLinearGradient(0, PA.y, 0, PA.y + PA.h); gg.addColorStop(0, '#8a7a68'); gg.addColorStop(1, '#5d5246'); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    [2500, 3000, 3500, 4000, 4500, 5000, 5500].forEach((d) => { ctx.beginPath(); ctx.moveTo(PA.x, Yd(d)); ctx.lineTo(PA.x + PA.w, Yd(d)); ctx.stroke(); });
    [0, 10, 20, 30, 40, 50, 60, 70].forEach((tt) => { ctx.beginPath(); ctx.moveTo(X(tt), PA.y); ctx.lineTo(X(tt), PA.y + PA.h); ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i <= 140; i++) { const tt = (70 * i) / 140; i ? ctx.lineTo(X(tt), Yd(dSea(tt))) : ctx.moveTo(X(tt), Yd(dSea(tt))); } ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(PA.x, PA.y, PA.w, PA.h, 6).stroke();
    [2500, 3000, 3500, 4000, 4500, 5000, 5500].forEach((d) => D.text(PA.x - 6, Yd(d) + 4.5, String(d), { size: 12, weight: 700, color: '#64748b', align: 'right' }));
    D.text(PA.x - 6, PA.y - 8, '수심(m)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    D.text(PA.x + 8, PA.y + 16 * FS, '물', { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
    // 해령 미는 힘 (얇은 화살표)
    D.arrow(X(5), Yd(dSea(5)) - 10, X(11), Yd(dSea(11)) - 2, { color: '#dc2626', width: 3, head: 9 });
    D.label(X(17), Yd(dSea(17)) - 22, '해령 미는 힘', { bg: '#dc2626', size: 12, pad: 7 });
    D.text(PA.x + 6, PA.y + PA.h - 8, '해령', { size: 12.5, weight: 800, color: '#fef3c7', align: 'left' });
    // 마커
    const av = S.ageV, mx = X(av), my = Yd(dSea(av));
    D.dashedLine(mx, PA.y, mx, PA.y + PA.h, { color: '#7c3aed', width: 2 }); ball(mx, my, 6, '#7c3aed', true);
    D.label(mx, PA.y + PA.h + 12 * FS, '나이 ' + Math.round(av) + '백만 년', { bg: '#7c3aed', size: 12.5, pad: 8 });
    // 암석권 두께
    const PL = { x: PA.x, y: PA.y + PA.h + 58, w: PA.w, h: PHONE ? 128 : 150 };
    const YL = (h) => PL.y + (h / 110) * PL.h;
    ctx.save(); rr(PL.x, PL.y, PL.w, PL.h, 6).clip();
    const ag = ctx.createLinearGradient(0, PL.y, 0, PL.y + PL.h); ag.addColorStop(0, '#fdba74'); ag.addColorStop(1, '#ea580c'); ctx.fillStyle = ag; ctx.fillRect(PL.x, PL.y, PL.w, PL.h);
    ctx.beginPath(); ctx.moveTo(PL.x, PL.y); ctx.lineTo(PL.x + PL.w, PL.y); for (let i = 140; i >= 0; i--) { const tt = (70 * i) / 140; ctx.lineTo(X(tt), YL(hLith(tt))); } ctx.closePath();
    const lg = ctx.createLinearGradient(0, PL.y, 0, PL.y + PL.h * 0.95); lg.addColorStop(0, '#3b82f6'); lg.addColorStop(0.55, '#93c5fd'); lg.addColorStop(1, '#fdba74'); ctx.fillStyle = lg; ctx.fill();
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 140; i++) { const tt = (70 * i) / 140; i ? ctx.lineTo(X(tt), YL(hLith(tt))) : ctx.moveTo(X(tt), YL(hLith(tt))); } ctx.stroke();
    RID.forEach((q) => { const yy = PL.y + PL.h - 6 - q.y * 18; ctx.fillStyle = mixc('#ef4444', '#fb923c', q.x / 25); ctx.globalAlpha = clamp(1 - q.x / 30, 0, 1); ctx.beginPath(); ctx.arc(X(q.x), yy, 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(PL.x, PL.y, PL.w, PL.h, 6).stroke();
    D.text(PL.x + PL.w - 8, PL.y + PL.h - 8, '연약권(뜨거운 맨틀)', { size: 12.5, weight: 800, color: '#7c2d12', align: 'right' });
    D.text(PL.x + 8, PL.y + 16 * FS, '식은 암석권: 시간이 갈수록 두꺼워져요', { size: 12.5, weight: 800, color: '#f8fafc', align: 'left', stroke: 'rgba(30,58,138,.6)', strokeWidth: 3 });
    [0, 50, 100].forEach((h) => D.text(PL.x - 6, YL(h) + 4.5, String(h), { size: 12, weight: 700, color: '#64748b', align: 'right' }));
    D.text(PL.x - 6, PL.y - 8, '두께(km)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    D.dashedLine(mx, PL.y, mx, PL.y + PL.h, { color: '#7c3aed', width: 2 }); ball(mx, YL(hLith(av)), 5.5, '#7c3aed', true);
    D.label(mx + (mx > PL.x + PL.w - 90 ? -50 : 50), YL(hLith(av)) + 4 + (hLith(av) > 70 ? -18 : 18), '두께 ' + Math.round(hLith(av)) + ' km', { bg: '#1e3a8a', size: 12.5, pad: 8 });
    [0, 10, 20, 30, 40, 50, 60, 70].forEach((tt) => D.text(X(tt), PL.y + PL.h + 15 * FS, String(tt), { size: 12, weight: 700, color: '#64748b' }));
    D.text(PL.x + PL.w / 2, PL.y + PL.h + 32 * FS, '해령에서 멀어진 해양 암석권의 나이 (백만 년)', { size: 12, weight: 700, color: '#64748b' });
    // 오른쪽 설명
    card(B, '📐 식으면 어떻게 될까?');
    const f1 = ['수심 d = 2500 + 350√t  (m)', 't: 나이(백만 년)', '예: 25 → 4250 m, 70 → 5430 m'];
    const bx = B.x + 14;
    if (!PHONE) {
      f1.forEach((l, i) => D.text(bx, B.y + 56 + i * 21 * FS, l, { size: i === 0 ? 14 : 12.5, weight: 800, color: i === 0 ? '#1e293b' : '#475569', align: 'left' }));
      D.text(bx, B.y + 150 * FS, '암석권 두께 h ≈ 12√t (km, 예시)', { size: 12.5, weight: 800, color: '#1e3a8a', align: 'left' });
      D.text(bx, B.y + 186 * FS, '식으면 이렇게 변해요', { size: 13, weight: 800, color: '#334155', align: 'left' });
      const chain = ['온도 낮아짐', '밀도 커짐', '더 가라앉음'];
      chain.forEach((c, i) => { D.label(bx, B.y + 212 * FS + i * 34 * FS, c, { bg: ['#3b82f6', '#6366f1', '#0f766e'][i], size: 12.5, pad: 9, align: 'left' }); if (i < 2) D.text(bx + 18, B.y + 212 * FS + i * 34 * FS + 21 * FS, '↓', { size: 13, weight: 800, color: '#64748b' }); });
      const py = B.y + 340 * FS;
      D.text(bx, py, '해령 미는 힘 (예시)', { size: 13, weight: 800, color: '#b91c1c', align: 'left' });
      D.arrow(bx, py + 24 * FS, bx + 22, py + 24 * FS, { color: '#dc2626', width: 3, head: 8 });
      D.text(bx + 30, py + 29 * FS, '약 2.5×10¹² N/m', { size: 13, weight: 800, color: '#7f1d1d', align: 'left' });
      drawWrap(bx, py + 58 * FS, '해령 쪽이 높아서 암석권이 연약권 위의 비탈을 따라 미끄러지려는 힘이에요.', B.w - 26, 12, { align: 'left', color: '#475569', weight: 700, lh: 1.3 });
      drawWrap(bx, py + 128 * FS, '※ 마그마가 판을 밀어내는 힘이 아니에요.', B.w - 26, 12, { align: 'left', color: '#b45309', weight: 800, lh: 1.3 });
    } else {
      f1.forEach((l, i) => D.text(bx, B.y + 54 + i * 21 * FS, l, { size: i === 0 ? 14 : 12.5, weight: 800, color: i === 0 ? '#1e293b' : '#475569', align: 'left' }));
      D.text(bx, B.y + 54 + 3 * 21 * FS, '암석권 두께 h ≈ 12√t (km, 예시)', { size: 12.5, weight: 800, color: '#1e3a8a', align: 'left' });
      D.text(bx, B.y + 54 + 4 * 21 * FS + 4, '식으면: 온도↓ → 밀도↑ → 더 가라앉음', { size: 12.5, weight: 800, color: '#0f766e', align: 'left' });
      D.arrow(bx, B.y + 54 + 5 * 21 * FS + 8, bx + 22, B.y + 54 + 5 * 21 * FS + 8, { color: '#dc2626', width: 3, head: 8 });
      D.text(bx + 30, B.y + 54 + 5 * 21 * FS + 13, '해령 미는 힘 약 2.5×10¹² N/m (예시)', { size: 12.5, weight: 800, color: '#7f1d1d', align: 'left' });
      drawWrap(bx, B.y + 54 + 6 * 21 * FS + 14, '해령이 높아 암석권이 비탈을 따라 미끄러지려는 힘이에요. 마그마가 판을 밀어내는 힘이 아니에요.', B.w - 26, 12, { align: 'left', color: '#475569', weight: 700, lh: 1.3 });
    }
  }

  /* ======================================================
     장면 2: 섭입의 힘 — 판이 스스로 당기는 힘 어림과 판의 속도
     ====================================================== */
  const DRHO = 80, GRAV = 10, HKM = 70;                         // 80 kg/m³, 10 m/s², 70 km (예시)
  const RPUSH = 2.5e12;                                          // 해령 미는 힘 (N/m, 예시)
  const slabF = (Lkm) => DRHO * GRAV * (HKM * 1000) * (Lkm * 1000);     // F = Δρ g h L (N/m)
  const PLATES = [
    { id: 'pac', n: '태평양판', v: 8, k: 'long' }, { id: 'coc', n: '코코스판', v: 7, k: 'long' }, { id: 'naz', n: '나스카판', v: 7, k: 'long' }, { id: 'ind', n: '인도–오스트레일리아판', v: 6, k: 'long' },
    { id: 'afr', n: '아프리카판', v: 2, k: 'few' }, { id: 'nam', n: '북아메리카판', v: 1.5, k: 'few' }, { id: 'eur', n: '유라시아판', v: 1, k: 'few' }, { id: 'ant', n: '남극판', v: 1, k: 'few' },
  ];
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 268 }, C: { x: 8, y: 284, w: 504, h: 200 }, B: { x: 8, y: 492, w: 504, h: 260 } }
    : { A: { x: 12, y: 12, w: 560, h: 300 }, B: { x: 12, y: 320, w: 560, h: 228 }, C: { x: 580, y: 12, w: 208, h: 536 } };
  const fpow = (v) => { const e = Math.floor(Math.log10(v)); return (v / Math.pow(10, e)).toFixed(2).replace(/\.?0+$/, '') + '×10' + String(e).replace(/[0-9]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]); };
  function drawSlab(t, dt) {
    const { A, B, C } = RC2;
    card(A, '⛓️ 섭입하는 판이 당겨요 (모식도)');
    const ys = A.y + (PHONE ? 100 : 108), xt = A.x + (PHONE ? 250 : 300), sc = Math.min(0.4, (A.y + A.h - 8 - ys - 24) / 545, (A.x + A.w - 12 - 130 - xt) / 495), hp = HKM * sc, Lp = S.L * sc, xs = A.x + 22;
    const d = Lp * Math.SQRT1_2, n = [-Math.SQRT1_2 * hp, Math.SQRT1_2 * hp];
    const T1 = [xt + d, ys + d], B1 = [T1[0] + n[0], T1[1] + n[1]];
    const box = { x: A.x + 10, y: A.y + 38, w: A.w - 20, h: A.h - 46 };
    ctx.save(); rr(box.x, box.y, box.w, box.h, 12).clip();
    ctx.fillStyle = '#dff1fc'; ctx.fillRect(box.x, box.y, box.w, box.h);
    const mg = ctx.createLinearGradient(0, ys, 0, box.y + box.h); mg.addColorStop(0, '#f3cf94'); mg.addColorStop(1, '#e2955b'); ctx.fillStyle = mg; ctx.fillRect(box.x, ys, box.w, box.y + box.h - ys);
    ctx.fillStyle = '#74c0e8'; ctx.fillRect(box.x, ys - 10, xt - box.x, 10);
    // 대륙
    ctx.fillStyle = '#c9a98a'; poly([[xt, ys - 14], [box.x + box.w + 4, ys - 14], [box.x + box.w + 4, T1[1] + 8], [T1[0] + 8, T1[1] + 8], [T1[0], T1[1]], [xt, ys]]); ctx.fill();
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(xt, ys - 14, box.x + box.w + 4 - xt, 14 * 0.9);
    // 해양 암석권과 슬랩
    ctx.fillStyle = '#6b7a99'; poly([[xs, ys], [xt, ys], T1, B1, [xt + n[0] * 0 - (Math.SQRT2 - 1) * hp, ys + hp], [xs, ys + hp]]); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; poly([[xs, ys], [xt, ys], T1], false); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([7, 8]); ctx.lineDashOffset = -t * 16; ctx.beginPath(); ctx.moveTo(xs, ys + hp / 2); ctx.lineTo(xt - hp * 0.2, ys + hp / 2); ctx.lineTo(T1[0] + n[0] / 2, T1[1] + n[1] / 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 힘 화살표 (길이는 힘에 비례)
    const F = slabF(S.L), Fmax = slabF(700), maxLen = PHONE ? 150 : 170;
    const lenPull = (F / Fmax) * maxLen, lenPush = (RPUSH / Fmax) * maxLen, ay = ys - 28;
    D.arrow(xt - 14 - lenPull, ay, xt - 14, ay, { color: '#dc2626', width: 6, head: 16 });
    D.label(xt - 14 - lenPull / 2, ay - 20, '당기는 힘 (슬랩 당김)', { bg: '#dc2626', size: 12.5, pad: 8 });
    D.arrow(xs + 10, ay, xs + 10 + Math.max(lenPush, 11), ay, { color: '#2563eb', width: 3, head: 8 });
    D.label(xs + 52, ay - 20, '해령 미는 힘', { bg: '#2563eb', size: 12.5, pad: 8 });
    D.text(xs + 4, ys + hp + 17 * FS, '← 해령 쪽', { size: 12, weight: 800, color: '#334155', align: 'left' });
    D.label(xt - 44, ys + hp + 22 * FS, '해구', { bg: '#1e293b', size: 12, pad: 7 });
    D.text(T1[0] + 14, T1[1] - 4, '섭입하는 판', { size: 12.5, weight: 800, color: '#f8fafc', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    D.text(T1[0] + 14, T1[1] + 15 * FS, '길이 L = ' + S.L + ' km', { size: 12.5, weight: 800, color: '#fef9c3', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    D.text(box.x + 8, box.y + box.h - 8, '두께 h = 70 km, 주변 맨틀보다 80 kg/m³ 무거워요 (예시)', { size: 11.5, weight: 800, color: '#7c2d12', align: 'left' });
    D.text(box.x + box.w - 8, box.y + 16 * FS, '대륙판', { size: 12.5, weight: 800, color: '#fff7ed', align: 'right', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 });
    // 판의 속도
    card(B, '🏃 판의 속도 (예시) · 섭입대가 붙은 판일수록?');
    const rh = PHONE ? 26 : 22, x0 = B.x + (PHONE ? 196 : 170), bwMax = B.w - (PHONE ? 196 : 170) - 78, ok = clsPlate.ok(), selAll = clsPlate.complete();
    PLATES.forEach((p, i) => {
      const y = B.y + 40 + i * rh, sel = clsPlate.sel[p.id], w = (bwMax * p.v) / 9;
      D.text(x0 - 8, y + rh * 0.62, p.n, { size: PHONE ? 12 : 12.5, weight: 800, color: '#334155', align: 'right' });
      ctx.fillStyle = '#eef2f7'; rr(x0, y + 2, bwMax, rh - 5, 5).fill();
      ctx.fillStyle = sel === 'long' ? '#f97316' : sel === 'few' ? '#64748b' : '#cbd5e1'; rr(x0, y + 2, w, rh - 5, 5).fill();
      D.text(x0 + w + 6, y + rh * 0.62, p.v + ' cm/년', { size: 12, weight: 800, color: '#1e293b', align: 'left' });
    });
    const ly = B.y + 40 + PLATES.length * rh + 14;
    ctx.fillStyle = '#f97316'; ctx.fillRect(B.x + 14, ly - 9, 12, 12); D.text(B.x + 32, ly + 2, '섭입대가 길게 붙음', { size: 12, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#64748b'; ctx.fillRect(B.x + 170, ly - 9, 12, 12); D.text(B.x + 188, ly + 2, '거의 없음', { size: 12, weight: 800, color: '#334155', align: 'left' });
    if (ok || (game && game.free)) D.label(B.x + B.w - 14, ly - 2, '섭입대가 붙은 판이 빨라요!', { bg: '#15803d', size: 12.5, pad: 9, align: 'right' });
    else D.text(B.x + B.w - 14, ly + 2, '분류하면 색이 칠해져요', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    // 힘 어림 계산
    card(C, '🧮 힘 어림: F = Δρ·g·h·L');
    const cx0 = C.x + 14, rev = S.showF || (game && game.free);
    const rows = [['Δρ', '80 kg/m³'], ['g', '10 m/s²'], ['h', '70 km = 7×10⁴ m'], ['L', S.L + ' km = ' + fpow(S.L * 1000) + ' m']];
    const y0 = C.y + 54;
    rows.forEach((r, i) => { D.text(cx0, y0 + i * 22 * FS, r[0] + ' = ' + r[1], { size: PHONE ? 13 : 12.5, weight: 800, color: '#334155', align: 'left' }); });
    const fy = y0 + 4 * 22 * FS + 6;
    if (rev) { D.label(cx0, fy + 4, 'F = ' + fpow(slabF(S.L)) + ' N/m', { bg: '#dc2626', size: 13.5, pad: 9, align: 'left' }); D.text(cx0, fy + 32 * FS, '해령 미는 힘의 ' + fN(slabF(S.L) / RPUSH, 1) + '배', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' }); }
    else D.label(cx0, fy + 4, 'F = ?  (직접 계산해 봐요)', { bg: '#475569', size: 13, pad: 9, align: 'left' });
    // 막대 비교
    const bx = PHONE ? C.x + C.w - 190 : C.x + 30, by0 = PHONE ? C.y + 150 : fy + 66 * FS, bh = PHONE ? 0 : 150, bw = 46;
    if (!PHONE) {
      const base = by0 + bh;
      [[F, '#dc2626', '당기는 힘', bx], [RPUSH, '#2563eb', '미는 힘', bx + bw + 28]].forEach((q) => { const hh = (bh * q[0]) / Fmax; ctx.fillStyle = '#eef2f7'; rr(q[3], by0, bw, bh, 6).fill(); ctx.fillStyle = q[1]; rr(q[3], base - Math.max(hh, 0.1), bw, Math.max(hh, 0.1), 6).fill(); D.text(q[3] + bw / 2, base + 17 * FS, q[2], { size: 12, weight: 800, color: '#334155' }); if (rev) D.text(q[3] + bw / 2, base - hh - 6, fpow(q[0]), { size: 11.5, weight: 800, color: '#1e293b' }); });
      D.text(C.x + C.w / 2, base + 38 * FS, '(눈금: L = 700 km일 때가 가득 찬 칸)', { size: 11, weight: 700, color: '#64748b' });
    } else {
      const hbar = (q, y) => { const w = (170 * q[0]) / Fmax; ctx.fillStyle = '#eef2f7'; rr(bx, y, 170, 22, 6).fill(); ctx.fillStyle = q[1]; rr(bx, y, Math.max(w, 0.1), 22, 6).fill(); D.text(bx - 8, y + 16, q[2], { size: 12, weight: 800, color: '#334155', align: 'right' }); if (rev) D.text(bx + 176, y + 16, fpow(q[0]), { size: 11.5, weight: 800, color: '#1e293b', align: 'left' }); };
      hbar([F, '#dc2626', '당기는 힘'], C.y + 62); hbar([RPUSH, '#2563eb', '미는 힘'], C.y + 94);
      D.text(bx + 170, C.y + 134, '(가득 찬 칸: L = 700 km)', { size: 11, weight: 700, color: '#64748b', align: 'right' });
    }
  }

  /* ======================================================
     장면 3: 맨틀 플룸 — 상부 맨틀 운동과 맨틀-핵 경계에서 올라오는 플룸
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 414 }, B: { x: 8, y: 430, w: 504, h: 322 } }
    : { A: { x: 12, y: 12, w: 430, h: 536 }, B: { x: 450, y: 12, w: 338, h: 536 } };
  const REARTH = 6371, ZCMB = 2900, Z670 = 670;
  const polar = (cx, cy, r, phi) => [cx + r * Math.cos(phi * DEG), cy + r * Math.sin(phi * DEG)];
  const plumeAng = (u) => -135 + 5 * Math.sin(u * Math.PI * 2);                   // u: 0(핵-맨틀 경계)~1(지표)
  const slabAng = (u) => -45 - 14 * (1 - u);
  const riseKm = () => Math.round(S.pf * ZCMB);
  const riseMyr = () => (S.pf * ZCMB * 1000 * 100) / S.pv / 1e6;         // 상승 시간(백만 년): km → cm, 속도 cm/년
  function geoE(R, cx, cy) { const s = R / REARTH; return { R, cx, cy, s, rc: R - ZCMB * s, r670: R - Z670 * s, rOut: R - 5150 * s }; }
  function plumePt(G, u) { const r = G.rc + u * (G.R - G.rc); return polar(G.cx, G.cy, r, plumeAng(u)); }
  function slabPt(G, u) { const r = G.rc + u * (G.R - G.rc); return polar(G.cx, G.cy, r, slabAng(u)); }
  function plumeStep(dt) {
    if (S.pf < 1) { S.pf = Math.min(1, S.pf + dt * 0.125 * (S.pv / 5)); if (S.pf >= 1) S.hold = 1.8; }
    else { S.hold -= dt; if (S.hold <= 0) { S.pf = 0; } }
    S.tomoK = approach(S.tomoK, S.tomoOn || (game && game.free) ? 1 : 0, dt, 2.5);
  }
  function drawEarthLayers(G, withLabels, t) {
    const { cx, cy, R } = G;
    const ring = (r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); };
    ring(R, '#8b6f58'); ring(R - 6, '#f2cf9b');
    const g2 = ctx.createRadialGradient(cx, cy, G.rc, cx, cy, G.r670); g2.addColorStop(0, '#dc8a52'); g2.addColorStop(1, '#f2cf9b');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9a56a'; ctx.beginPath(); ctx.arc(cx, cy, G.r670, 0, TAU); ctx.fill();
    const g3 = ctx.createRadialGradient(cx, cy, G.rc, cx, cy, G.r670); g3.addColorStop(0, '#d9824a'); g3.addColorStop(1, '#eeb67e'); ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(cx, cy, G.r670, 0, TAU); ctx.fill();
    ring(G.rc, '#fbbf24'); ring(G.rOut, '#fde68a');
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    [G.r670, G.rc].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = '#7c4a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    if (withLabels) {
      const L = (r, txt, col) => D.text(cx, cy + r + 4, txt, { size: 12, weight: 800, color: col || '#7c2d12', stroke: 'rgba(255,255,255,.55)', strokeWidth: 3 });
      L((G.R + G.r670) / 2 - 3, '상부 맨틀 (약 670 km까지)'); L((G.r670 + G.rc) / 2, '하부 맨틀'); L((G.rc + G.rOut) / 2 + 2, '외핵'); L(0, '내핵', '#92400e');
    }
  }
  function drawPlume(t, dt) {
    const { A, B } = RC3;
    plumeStep(dt);
    card(A, '🌍 지구 단면: 판 운동과 플룸 (모식도)');
    const R = PHONE ? 140 : 186, G = geoE(R, A.x + A.w / 2, A.y + 46 + R + 8);
    drawEarthLayers(G, true, t);
    // 상부 맨틀의 대류와 판 운동
    const arcArrow = (phi0, phi1, r, col) => { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const p = polar(G.cx, G.cy, r, phi0 + ((phi1 - phi0) * i) / 12); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); const e = polar(G.cx, G.cy, r, phi1), b = polar(G.cx, G.cy, r, phi1 - Math.sign(phi1 - phi0) * 5); D.arrow(b[0], b[1], e[0], e[1], { color: col, width: 4, head: 10 }); };
    const rm = (G.R + G.r670) / 2 - 4;
    arcArrow(-25, 20, rm, '#1d4ed8'); arcArrow(150, 105, rm, '#1d4ed8'); arcArrow(-95, -60, G.R - 3, '#0f172a');
    // 섭입한 차가운 판 (콜드 플룸)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(37,99,235,.85)'; ctx.lineWidth = 9; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const p = slabPt(G, 1 - i / 24); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 9; i++) { const u = 1 - ((t * 0.12 + i / 9) % 1), p = slabPt(G, u); ball(p[0], p[1], 3.4, '#93c5fd', false); }
    // 맨틀 플룸
    const f = S.pf, pts = [];
    for (let i = 0; i <= 28; i++) { const u = (i / 28) * f; pts.push(plumePt(G, u)); }
    if (f > 0.005) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [[16, 'rgba(239,68,68,.18)'], [10, 'rgba(239,68,68,.42)'], [5.5, 'rgba(220,38,38,.95)']].forEach((q) => { ctx.strokeStyle = q[1]; ctx.lineWidth = q[0]; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
      ctx.restore();
      const h = pts[pts.length - 1], hr = 6 + 9 * f; D.glow(h[0], h[1], hr * 2.4, '#f97316', 0.6); D.sphere(h[0], h[1], hr, '#ef4444', { gloss: true });
      for (let i = 0; i < 10; i++) { const u = ((t * 0.3 + i / 10) % 1) * f, p = plumePt(G, u); ball(p[0] + Math.sin(i * 3 + t) * 3, p[1] + Math.cos(i * 2 + t) * 3, 2.6, '#fecaca', false); }
    }
    // 열점 화산
    const sp = polar(G.cx, G.cy, G.R, plumeAng(1));
    ctx.fillStyle = '#7c3a1e'; const nrm = [Math.cos(plumeAng(1) * DEG), Math.sin(plumeAng(1) * DEG)], tg = [-nrm[1], nrm[0]];
    poly([[sp[0] + tg[0] * 12, sp[1] + tg[1] * 12], [sp[0] + nrm[0] * 17, sp[1] + nrm[1] * 17], [sp[0] - tg[0] * 12, sp[1] - tg[1] * 12]]); ctx.fill();
    if (S.pf >= 1) D.glow(sp[0] + nrm[0] * 18, sp[1] + nrm[1] * 18, 26, '#fb923c', 0.5 + 0.3 * Math.sin(t * 8));
    // 이름표
    const lab = (p, txt, col, dx, dy, al) => D.label(p[0] + dx, p[1] + dy, txt, { bg: col, size: 12.5, pad: 8, align: al || 'center' });
    lab(plumePt(G, 0.55), '맨틀 플룸', '#b91c1c', -12, 0, 'right');
    lab(slabPt(G, 0.62), '섭입한 판', '#1d4ed8', 12, 0, 'left');
    D.label(G.cx - G.R * 0.62, G.cy - G.R - 4, '열점 화산', { bg: '#7c3a1e', size: 12.5, pad: 8 });
    D.text(G.cx, G.cy - G.rc - 6, '▲ 맨틀-핵 경계 (깊이 약 2900 km)', { size: 11.5, weight: 800, color: '#78350f', stroke: 'rgba(255,255,255,.75)', strokeWidth: 3 });
    // 진행 정보
    const iy = G.cy + G.R + 22 * FS;
    D.text(A.x + 14, iy, '플룸 상승 속도 ' + S.pv + ' cm/년 (예시) · 올라온 거리 ' + riseKm() + ' km', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    const tShow = S.tmShow || (game && game.free);
    D.text(A.x + 14, iy + 21 * FS, tShow ? '걸린 시간 ' + Math.round(riseMyr()) + ' 백만 년 (전체 ' + fN(290 / S.pv, 0) + ' 백만 년)' : '걸린 시간은 직접 계산해 봐요 (거리 / 속도)', { size: 12.5, weight: 800, color: '#7f1d1d', align: 'left' });
    D.text(A.x + A.w - 14, A.y + A.h - 10, '지각은 실제보다 두껍게 그렸어요', { size: 11, weight: 700, color: '#94a3b8', align: 'right' });
    // 오른쪽: 지진파 단층 촬영 영상 (예시)
    card(B, '🩻 지진파 단층 촬영 영상 (예시 영상)');
    const RB = PHONE ? 100 : 130, T = geoE(RB, B.x + (PHONE ? 134 : B.w / 2), B.y + 46 + RB + 8);
    ctx.save(); ctx.beginPath(); ctx.arc(T.cx, T.cy, RB, 0, TAU); ctx.clip();
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(T.cx - RB, T.cy - RB, 2 * RB, 2 * RB);
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(T.cx, T.cy, T.rc, 0, TAU); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(T.cx, T.cy, T.rOut, 0, TAU); ctx.fill();
    ctx.globalAlpha = S.tomoK;
    const blob = (phi, rr0, rad, col) => { const p = polar(T.cx, T.cy, rr0, phi), g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], rad, 0, TAU); ctx.fill(); };
    blob(8, T.rc + 18, RB * 0.46, '#dc2626'); blob(190, T.rc + 18, RB * 0.46, '#dc2626'); blob(45, T.rc + 6, RB * 0.28, '#f97316');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[18, 'rgba(220,38,38,.2)'], [10, 'rgba(220,38,38,.45)'], [4.5, 'rgba(185,28,28,.8)']].forEach((q) => { ctx.strokeStyle = q[1]; ctx.lineWidth = q[0]; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const p = plumePt(T, i / 24); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); });
    [[22, 'rgba(37,99,235,.2)'], [13, 'rgba(37,99,235,.45)'], [6, 'rgba(29,78,216,.85)']].forEach((q) => { ctx.strokeStyle = q[1]; ctx.lineWidth = q[0]; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const p = slabPt(T, 1 - i / 24); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); });
    const sb = (phi, wd) => { ctx.strokeStyle = 'rgba(29,78,216,.55)'; ctx.lineWidth = wd; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const r = T.rc + (i / 12) * (T.R - T.rc), p = polar(T.cx, T.cy, r, phi + 6 * (1 - i / 12)); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); };
    sb(100, 10);
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(T.cx, T.cy, RB, 0, TAU); ctx.stroke();
    if (S.tomoK < 0.4) D.text(T.cx, T.cy + 5, '“🩻 영상 보기”를 눌러요', { size: 12.5, weight: 800, color: '#64748b' });
    const lgx = PHONE ? B.x + 262 : B.x + 20, lgy = PHONE ? B.y + 70 : B.y + 46 + 2 * RB + 28;
    const gr = ctx.createLinearGradient(lgx, 0, lgx + (PHONE ? 220 : 298), 0); gr.addColorStop(0, '#dc2626'); gr.addColorStop(0.5, '#f1f5f9'); gr.addColorStop(1, '#2563eb');
    ctx.fillStyle = gr; rr(lgx, lgy, PHONE ? 220 : 298, 11, 5).fill();
    D.text(lgx, lgy + 28 * FS, '빨강: 지진파가 느림 = 뜨거움', { size: 12, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(lgx + (PHONE ? 220 : 298), lgy + (PHONE ? 50 : 48) * FS, '파랑: 빠름 = 차가움', { size: 12, weight: 800, color: '#1d4ed8', align: 'right' });
    // 정리표
    const ty = PHONE ? B.y + 196 : B.y + 46 + 2 * RB + 86 * FS;
    if (S.tblOn || (game && game.free)) {
      const cw = (B.w - 28 - 74) / 2, x0 = B.x + 14, rows = [['', '상부 맨틀 운동', '플룸'], ['발생 깊이', '약 670 km까지', '맨틀-핵 경계 2900 km'], ['모양', '판 아래 대류·섭입', '기둥(머리+꼬리)'], ['지표 결과', '판 경계의 화산·지진', '판 경계 밖 열점']];
      const rh = PHONE ? 28 : 29;
      rows.forEach((r, i) => { const y = ty + i * rh; [0, 1, 2].forEach((c) => { const x = c === 0 ? x0 : x0 + 74 + (c - 1) * cw, w = c === 0 ? 74 : cw; ctx.fillStyle = i === 0 ? (c === 1 ? '#1d4ed8' : c === 2 ? '#b91c1c' : '#475569') : c === 0 ? '#e2e8f0' : '#f8fafc'; ctx.fillRect(x, y, w - 2, rh - 2); const ls = wrapLines(r[c], w - 8, PHONE ? 11 : 11.5, 800); ls.slice(0, 2).forEach((l, k) => D.text(x + w / 2 - 1, y + (ls.length > 1 ? 12 : 17) + k * 12 * FS, l, { size: PHONE ? 11 : 11.5, weight: 800, color: i === 0 ? '#fff' : '#1e293b' })); }); });
    } else drawWrap(B.x + B.w / 2, ty + 10, '플룸을 지진파 단층 촬영으로 보는 원리는 “지진파로 본 지구 내부” 차시에서 배워요.', B.w - 40, 12.5, { color: '#475569', weight: 700 });
  }

  /* ======================================================
     장면 4: 열점 추적 — 하와이 열도의 나이와 거리, 엠퍼러 꺾임
     ====================================================== */
  const ISL = [
    { id: 'haw', n: '하와이 섬', age: 0, d: 0 }, { id: 'maui', n: '마우이', age: 1.3, d: 130 }, { id: 'oahu', n: '오아후', age: 3.4, d: 340 }, { id: 'kauai', n: '카우아이', age: 5.1, d: 510 },
  ];
  const VPL = 100;                                  // 판 이동 속도 (km/백만 년 = 10 cm/년, 예시)
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 256 }, B: { x: 8, y: 272, w: 504, h: 218 }, C: { x: 8, y: 498, w: 504, h: 254 } }
    : { A: { x: 12, y: 12, w: 540, h: 300 }, B: { x: 12, y: 320, w: 540, h: 228 }, C: { x: 560, y: 12, w: 228, h: 536 } };
  const TAU0 = -5.6;
  const tauNow = () => TAU0 + (0 - TAU0) * S.tau;
  const g4 = () => { const A = RC4.A, g = { x: A.x + 10, y: A.y + 36, w: A.w - 20, h: A.h - 44 }; g.xh = g.x + g.w - (PHONE ? 62 : 70); g.kx = (g.xh - g.x - 74) / 520; g.sh = g.h / 254; g.ys = g.y + g.h * 0.38; g.yf = g.ys + g.h * 0.17; g.yb = g.yf + g.h * 0.20; return g; };
  const islPos = (k, g) => { const ageSince = tauNow() + k.age; if (ageSince < -1e-9) return null; const dist = VPL * Math.max(ageSince, 0); const x = g.xh - dist * g.kx, hh = Math.max(14, 92 * (1 - 0.07 * ageSince)) * clamp(ageSince / 0.4 + 0.02, 0, 1) * g.sh; return { x, h: hh, dist, ageSince }; };
  function hotStep(dt) {
    if (S.play) { S.tau = Math.min(1, S.tau + dt / 7); if (S.tau >= 1) S.play = false; }
  }
  function drawHot(t, dt) {
    const { A, B, C } = RC4, g = g4();
    hotStep(dt);
    card(A, '🌋 판이 움직이고 열점은 거의 그대로예요 (단면)');
    ctx.save(); rr(g.x, g.y, g.w, g.h, 12).clip();
    ctx.fillStyle = '#e3f3fc'; ctx.fillRect(g.x, g.y, g.w, g.h);
    const wg = ctx.createLinearGradient(0, g.ys, 0, g.yf); wg.addColorStop(0, '#74c0e8'); wg.addColorStop(1, '#3b8bbf'); ctx.fillStyle = wg; ctx.fillRect(g.x, g.ys, g.w, g.yf - g.ys);
    const mg = ctx.createLinearGradient(0, g.yb, 0, g.y + g.h); mg.addColorStop(0, '#f3cf94'); mg.addColorStop(1, '#e2955b'); ctx.fillStyle = mg; ctx.fillRect(g.x, g.yb, g.w, g.y + g.h - g.yb);
    // 판 (암석권): 왼쪽으로 이동
    ctx.fillStyle = '#6b7a99'; ctx.fillRect(g.x, g.yf, g.w, g.yb - g.yf);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.setLineDash([9, 11]); ctx.lineDashOffset = S.play || S.tau < 1 ? t * 30 : t * 20; ctx.beginPath(); ctx.moveTo(g.x, (g.yf + g.yb) / 2); ctx.lineTo(g.x + g.w, (g.yf + g.yb) / 2); ctx.stroke(); ctx.setLineDash([]);
    // 플룸
    const px = g.xh;
    ctx.save(); ctx.lineCap = 'round'; [[22, 'rgba(239,68,68,.2)'], [14, 'rgba(239,68,68,.45)'], [7, 'rgba(220,38,38,.95)']].forEach((q) => { ctx.strokeStyle = q[1]; ctx.lineWidth = q[0]; ctx.beginPath(); ctx.moveTo(px, g.y + g.h); ctx.lineTo(px, g.yb + 2); ctx.stroke(); }); ctx.restore();
    D.glow(px, g.yb + 6, 38, '#f97316', 0.55); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(px, g.yb + 6, 30, 11, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 8; i++) { const f = (t * 0.35 + i / 8) % 1; ball(px + Math.sin(i * 2.1 + t) * 4, g.y + g.h - f * (g.y + g.h - g.yb), 2.6, '#fecaca', false); }
    // 마그마 통로 (고정된 열점 → 활화산)
    ctx.strokeStyle = 'rgba(239,68,68,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, g.yb); ctx.lineTo(px, g.yf - 20 * g.sh); ctx.stroke();
    // 섬들 (바다 속으로 잠기는 부분도 보이게 물을 위에 덮어요)
    const ps = ISL.map((k) => ({ k, p: islPos(k, g) }));
    ps.slice().reverse().forEach(({ k, p }) => {
      if (!p) return; const w = p.h * 1.0, top = g.yf - p.h;
      ctx.fillStyle = k.age === 0 ? '#4a3b32' : '#6b5b4a'; ctx.beginPath(); ctx.moveTo(p.x - w, g.yf); ctx.quadraticCurveTo(p.x - w * 0.45, top + p.h * 0.12, p.x, top); ctx.quadraticCurveTo(p.x + w * 0.45, top + p.h * 0.12, p.x + w, g.yf); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.ys - g.y); ctx.clip(); ctx.fillStyle = k.age === 0 ? '#5b4636' : '#4d8b4a'; ctx.beginPath(); ctx.moveTo(p.x - w, g.yf); ctx.quadraticCurveTo(p.x - w * 0.45, top + p.h * 0.12, p.x, top); ctx.quadraticCurveTo(p.x + w * 0.45, top + p.h * 0.12, p.x + w, g.yf); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    ctx.fillStyle = 'rgba(80,160,214,.42)'; ctx.fillRect(g.x, g.ys, g.w, g.yf - g.ys);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const x = g.x + (g.w * i) / 50; i ? ctx.lineTo(x, g.ys + Math.sin(t * 1.5 + i * 0.5) * 1.4) : ctx.moveTo(x, g.ys); } ctx.stroke();
    ctx.restore();
    // 활화산의 불빛과 분출
    const p0 = ps[0].p;
    if (p0 && S.tau >= 0.98) { D.glow(p0.x, g.yf - p0.h - 2, 20, '#fb923c', 0.55 + 0.3 * Math.sin(t * 8)); if (!RM && Math.random() < dt * 5) parts.burst(p0.x, g.yf - p0.h - 3, { count: 3, speed: 55, life: 0.5, size: 2.2, gravity: 120, colors: ['#fb923c', '#fde047'] }); }
    // 거리 눈금과 이름표
    const ry = g.y + g.h - 30 * FS;
    ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.xh, ry); ctx.lineTo(g.xh - 520 * g.kx, ry); ctx.stroke();
    for (let d = 0; d <= 500; d += 100) { const x = g.xh - d * g.kx; ctx.beginPath(); ctx.moveTo(x, ry - 4); ctx.lineTo(x, ry + 4); ctx.stroke(); D.text(x, ry + 17 * FS, String(d), { size: 11.5, weight: 800, color: '#fff7ed', stroke: 'rgba(124,45,18,.6)', strokeWidth: 3 }); }
    D.text(g.xh - 520 * g.kx + 4, ry - 9, (PHONE ? '거리(km)' : '열점에서의 거리(km)'), { size: 11.5, weight: 800, color: '#fff7ed', align: 'left', stroke: 'rgba(124,45,18,.6)', strokeWidth: 3 });
    const canTap = S.tau >= 0.999;
    ps.forEach(({ k, p }) => {
      if (!p) return; const top = g.yf - p.h, plotted = k.id !== 'haw' && S.plotted[k.id];
      const ly = Math.max(g.y + 14, top - 42 * FS);
      D.label(p.x, ly, k.n, { bg: plotted ? '#15803d' : k.age === 0 ? '#b91c1c' : '#334155', size: PHONE ? 11 : 12, pad: 6 });
      D.text(p.x, ly + 20 * FS, k.age === 0 ? '활동 중' : fN(k.age, 1) + '백만 년', { size: 11.5, weight: 800, color: '#0f172a', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
      if (canTap && k.id !== 'haw') { D.ring(p.x, top - 2, 11, t, { color: plotted ? '#16a34a' : '#f59e0b', speed: 1.3, width: 2.5 }); }
    });
    D.arrow(g.x + g.w * 0.46, g.yf + (g.yb - g.yf) * 0.5 - 9 - 0, g.x + g.w * 0.46 - 70, g.yf + (g.yb - g.yf) * 0.5 - 9, { color: '#f8fafc', width: 5, head: 13 });
    D.text(g.x + g.w * 0.46 - 36 + (PHONE ? 40 : 0), g.yf + (g.yb - g.yf) * 0.5 + 18 * FS, '판 이동 (북서쪽) 10 cm/년', { size: 12, weight: 800, color: '#f8fafc', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 });
    D.text(px - 16, g.y + g.h - 52 * FS, '플룸 (거의 고정)', { size: 12, weight: 800, color: '#fff7ed', align: 'right', stroke: 'rgba(127,29,29,.6)', strokeWidth: 3 });
    D.text(g.x + 10, g.y + 16 * FS, S.tau >= 1 ? '지금의 모습 (섬을 눌러 점을 찍어요)' : '경과 ' + fN(S.tau * -TAU0, 1) + ' 백만 년', { size: 12, weight: 800, color: '#7c2d12', align: 'left' });
    // 그래프
    card(B, '📈 섬의 나이와 열점에서의 거리');
    const gb = { x: B.x, y: B.y + 28, w: B.w, h: B.h - 28 };
    const ax = axesBox(gb, { x0: 0, x1: 6, y0: 0, y1: 600, xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 100, 200, 300, 400, 500, 600], pad: { l: 50, r: 16, t: 14, b: 38 } });
    D.text(ax.B.x + ax.B.w / 2, ax.B.y + ax.B.h + 33 * FS, '섬의 나이 (백만 년)', { size: 12, weight: 700, color: '#64748b' });
    D.text(gb.x + 6, ax.B.y - 4, '거리(km)', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    D.sphere(ax.X(0), ax.Y(0), 6, '#b91c1c', { gloss: false });
    const plotted = ISL.filter((k) => k.id !== 'haw' && S.plotted[k.id]);
    plotted.forEach((k) => { D.sphere(ax.X(k.age), ax.Y(k.d), 7, '#16a34a', { gloss: true }); D.text(ax.X(k.age) + 10, ax.Y(k.d) + 14, k.n, { size: 12, weight: 800, color: '#14532d', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); });
    if (plotted.length === 3) {
      polyline([[0, 0], [6, 600]], 'rgba(22,163,74,.75)', 3, ax.X, ax.Y, ax.B);
      const sx = S.slopeShow || (game && game.free);
      D.arrow(ax.X(2), ax.Y(200), ax.X(4), ax.Y(200), { color: '#7c3aed', width: 2.5, head: 8 }); D.arrow(ax.X(4), ax.Y(200), ax.X(4), ax.Y(400), { color: '#7c3aed', width: 2.5, head: 8 });
      D.text(ax.X(3), ax.Y(200) + 16 * FS, '나이 차 2백만 년', { size: 12, weight: 800, color: '#6d28d9' });
      D.text(ax.X(4) + 8, ax.Y(300) + 4, sx ? '거리 차 200 km' : '거리 차 ?', { size: 12, weight: 800, color: '#6d28d9', align: 'left' });
      D.label(ax.X(1.2), ax.Y(520), '기울기 = 거리 / 나이' + (sx ? ' = 100 km/백만 년 = 10 cm/년' : ''), { bg: '#15803d', size: 12.5, pad: 8, align: 'left' });
    } else D.text(ax.B.x + ax.B.w - 10, ax.B.y + 22, '점 ' + plotted.length + ' / 3 (섬을 눌러 찍어요)', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    // 표와 엠퍼러 꺾임
    card(C, PHONE ? '📋 섬 자료와 엠퍼러 꺾임' : '📋 섬 자료');
    const tx = C.x + 12, tw = PHONE ? 236 : C.w - 24, rh = PHONE ? 28 : 30, ty = C.y + 36;
    const cols = [tw * 0.34, tw * 0.38, tw * 0.28];
    [['섬', '나이(백만년)', '거리(km)']].concat(ISL.map((k) => [k.n, k.age === 0 ? '0' : fN(k.age, 1), String(k.d)])).forEach((r, i) => {
      let x = tx; r.forEach((c, j) => { const w = cols[j]; ctx.fillStyle = i === 0 ? '#475569' : (i > 1 && S.plotted[ISL[i - 1].id] ? '#dcfce7' : '#f8fafc'); ctx.fillRect(x, ty + i * rh, w - 2, rh - 2); const ls = wrapLines(c, w - 6, 11.5, 800); ls.slice(0, 2).forEach((l, kk) => D.text(x + w / 2 - 1, ty + i * rh + (ls.length > 1 ? 12 : 18) + kk * 12 * FS, l, { size: 11.5, weight: 800, color: i === 0 ? '#fff' : '#1e293b' })); x += w; });
    });
    const ey = PHONE ? C.y + 36 : ty + 5 * rh + 18;
    const E = PHONE ? { x: C.x + 262, y: C.y + 36, w: C.w - 274, h: C.h - 50 } : { x: C.x + 8, y: ey + 14, w: C.w - 16, h: C.y + C.h - ey - 24 };
    D.text(E.x + (PHONE ? 4 : 4), E.y - 4, '엠퍼러 꺾임 (모식도)', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    const sc = Math.min((E.w - 24) / 5006, (E.h - 76) / 4955), H = [E.x + E.w - 14, E.y + E.h - 30];
    const P1 = [H[0] + 4700 * sc * Math.cos(160 * DEG), H[1] - 4700 * sc * Math.sin(160 * DEG)], P2 = [P1[0] + 3400 * sc * Math.cos(100 * DEG), P1[1] - 3400 * sc * Math.sin(100 * DEG)];
    ctx.fillStyle = '#dbeafe'; rr(E.x, E.y + 4, E.w, E.h - 4, 10).fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(H[0], H[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();
    ctx.strokeStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]); ctx.stroke();
    [0, 10, 20, 30, 40, 47, 60, 70, 80].forEach((a) => { const dd = a * 100, pt = dd <= 4700 ? [H[0] + dd * sc * Math.cos(160 * DEG), H[1] - dd * sc * Math.sin(160 * DEG)] : [P1[0] + (dd - 4700) * sc * Math.cos(100 * DEG), P1[1] - (dd - 4700) * sc * Math.sin(100 * DEG)]; ball(pt[0], pt[1], a === 47 ? 6 : 4, a === 0 ? '#b91c1c' : a === 47 ? '#16a34a' : '#fff', false); if (a === 80) D.text(pt[0] + (dd <= 4700 ? 0 : 12), pt[1] - (dd <= 4700 ? 8 : -4), '80백만 년', { size: 11, weight: 800, color: '#334155', align: dd <= 4700 ? 'center' : 'left' }); });
    D.text(H[0] + 4, H[1] + 18 * FS, '열점 (고정)', { size: 11.5, weight: 800, color: '#b91c1c', align: 'right' });
    D.label(PHONE ? P1[0] - 8 : P1[0] + 10, P1[1] + 22 * FS, PHONE ? '약 4700만 년 전' : '약 4700만 년 전 꺾임', { bg: '#16a34a', size: 11.5, pad: 6, align: PHONE ? 'right' : 'left' });
    const m1 = [(H[0] + P1[0]) / 2, (H[1] + P1[1]) / 2 + 22], m2 = [(P1[0] + P2[0]) / 2 + 14, (P1[1] + P2[1]) / 2];
    D.arrow(m1[0], m1[1], m1[0] + 34 * Math.cos(160 * DEG), m1[1] - 34 * Math.sin(160 * DEG), { color: '#c2410c', width: 3, head: 8 });
    D.arrow(m2[0], m2[1], m2[0] + 34 * Math.cos(100 * DEG), m2[1] - 34 * Math.sin(100 * DEG), { color: '#6d28d9', width: 3, head: 8 });
    D.text(PHONE ? m1[0] - 30 : m1[0], m1[1] + 16 * FS, PHONE ? '지금' : '지금: 서북서', { size: 11.5, weight: 800, color: '#c2410c' });
    D.text(m2[0] + 8, m2[1] + 22, PHONE ? '이전' : '이전: 북북서', { size: 11.5, weight: 800, color: '#6d28d9', align: 'left' });
    D.text(E.x + 6, E.y + E.h - 6, (PHONE ? '단순화한 모식도' : '길이는 단순화해서 그렸어요'), { size: 11, weight: 700, color: '#64748b', align: 'left' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { ridge: '🌊 해령의 힘', slab: '⛓️ 섭입의 힘', plume: '🔥 맨틀 플룸', hot: '🏝️ 열점 추적' };
  const FREE_KEYS = { ridge: ['sAge'], slab: ['sL'], plume: ['sPv', 'plumeBtns'], hot: ['hotBtns'] };
  let ctlKeys = [];
  const clsPlate = makeClassify($('#clsPlate'), PLATES.map((p) => ({ id: p.id, label: p.n + ' (' + p.v + ' cm/년)' })), [{ id: 'long', label: '길게 붙음' }, { id: 'few', label: '거의 없음' }],
    PLATES.reduce((a, p) => { a[p.id] = p.k; return a; }, {}), () => { });
  $$('#clsPlate .cls-row').forEach((r) => r.classList.add('compact'));
  const stpF = makeStepper($('#stpF'), { min: 0.5, max: 5, step: 0.1, value: 1.0, unit: '×10¹³ N/m', dec: 1 });
  const clsPlume = makeClassify($('#clsPlume'), [
    { id: 'a', label: '발생 깊이: 상부 맨틀(약 670 km까지)' }, { id: 'b', label: '맨틀-핵 경계(약 2900 km)에서 시작' }, { id: 'c', label: '모양: 기둥(머리와 꼬리)' },
    { id: 'd', label: '판의 이동과 섭입을 동반' }, { id: 'e', label: '판 경계가 아닌 곳에도 화산(열점)' }, { id: 'f', label: '해령·해구 같은 판 경계에서 화산·지진' },
  ], [{ id: 'up', label: '상부 맨틀 운동(판 운동)' }, { id: 'pl', label: '플룸' }], { a: 'up', b: 'pl', c: 'pl', d: 'up', e: 'pl', f: 'up' }, () => { });
  const stpHv = makeStepper($('#stpHv'), { min: 1, max: 20, step: 1, value: 5, unit: 'cm/년', dec: 0 });
  const clsVolc = makeClassify($('#clsVolc'), [
    { id: 'haw', label: '하와이 (태평양판 한가운데)' }, { id: 'jpn', label: '일본' }, { id: 'ice', label: '아이슬란드' }, { id: 'yel', label: '옐로스톤 (북아메리카 대륙 안쪽)' }, { id: 'and', label: '안데스 산맥' },
  ], [{ id: 'hot', label: '열점' }, { id: 'sub', label: '섭입대' }, { id: 'rid', label: '해령' }], { haw: 'hot', jpn: 'sub', ice: ['rid', 'hot'], yel: 'hot', and: 'sub' }, () => { });
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
  SciSim.bindRange($('#sAge'), $('#oAge'), (v) => v + '백만 년', (v) => { S.age = +v; });
  SciSim.bindRange($('#sRd'), $('#oRd'), (v) => v + ' m', (v) => { S.read = +v; });
  SciSim.bindRange($('#sL'), $('#oL'), (v) => v + ' km', (v) => { S.L = +v; });
  SciSim.bindRange($('#sPv'), $('#oPv'), (v) => v + ' cm/년', (v) => { S.pv = +v; });
  SciSim.bindRange($('#sTr'), $('#oTr'), (v) => v + '백만 년', (v) => { S.tr = +v; });
  const setAge = (v) => { S.age = v; setSlider($('#sAge'), $('#oAge'), v, (x) => x + '백만 년'); };
  const setRead = (v) => { S.read = v; setSlider($('#sRd'), $('#oRd'), v, (x) => x + ' m'); };
  const setL = (v) => { S.L = v; setSlider($('#sL'), $('#oL'), v, (x) => x + ' km'); };
  const setPv = (v) => { S.pv = v; setSlider($('#sPv'), $('#oPv'), v, (x) => x + ' cm/년'); };
  const setTr = (v) => { S.tr = v; setSlider($('#sTr'), $('#oTr'), v, (x) => x + '백만 년'); };
  function syncPlot() {
    [['bPlotM', 'maui', '마우이'], ['bPlotO', 'oahu', '오아후'], ['bPlotK', 'kauai', '카우아이']].forEach((q) => { const b = $('#' + q[0]); b.textContent = (S.plotted[q[1]] ? '✔ ' : '') + q[2]; b.classList.toggle('on', S.plotted[q[1]]); });
    $('#bPlay').textContent = S.play ? '⏸ 재생 중…' : '▶ 처음부터 재생';
  }
  function togglePlot(id) { if (S.tau < 0.999) { say('재생이 끝난 뒤에 섬을 눌러 점을 찍을 수 있어요', true); return; } S.plotted[id] = !S.plotted[id]; Sound.click(); syncPlot(); }
  $('#bPlotM').addEventListener('click', () => togglePlot('maui')); $('#bPlotO').addEventListener('click', () => togglePlot('oahu')); $('#bPlotK').addEventListener('click', () => togglePlot('kauai'));
  $('#bPlay').addEventListener('click', () => { Sound.click(); S.tau = 0; S.play = true; syncPlot(); });
  $('#bTomo').addEventListener('click', () => { Sound.click(); S.tomoOn = !S.tomoOn; $('#bTomo').classList.toggle('on', S.tomoOn); });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'hot' || S.tau < 0.999) return false;
      const g = g4(); let hit = null, best = 34;
      ISL.forEach((k) => { if (k.id === 'haw') return; const q = islPos(k, g); if (!q) return; const d = Math.hypot(p.x - q.x, p.y - (g.yf - q.h * 0.6)); if (d < best) { best = d; hit = k; } });
      if (hit) { togglePlot(hit.id); } return false;
    },
    hover(p) { if (S.mode !== 'hot' || S.tau < 0.999) return ''; const g = g4(); return ISL.some((k) => { if (k.id === 'haw') return false; const q = islPos(k, g); return q && Math.hypot(p.x - q.x, p.y - (g.yf - q.h * 0.6)) < 34; }) ? 'pointer' : ''; },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    setAge(10); S.ageV = 10; setRead(3000); S.showD = false; RID.length = 0;
    setL(300); stpF.reset(); S.showF = false; clsPlate.reset();
    setPv(5); setTr(30); S.pf = 0; S.hold = 0; S.tomoOn = false; S.tomoK = 0; S.tblOn = false; S.tmShow = false; clsPlume.reset(); $('#bTomo').classList.remove('on');
    S.tau = 1; S.play = false; S.plotted = { maui: false, oahu: false, kauai: false }; stpHv.reset(); clsVolc.reset(); S.slopeShow = false; syncPlot();
    if (li === 0) { setMode('ridge'); setCtl(['sAge']); showHint('나이 슬라이더를 움직여 식은 정도에 따라 바다 깊이가 어떻게 달라지는지 봐요', 5200); }
    else if (li === 1) { setMode('slab'); setCtl(['sL']); showHint('섭입한 길이 L을 바꾸면 당기는 힘이 어떻게 변하는지 봐요', 5200); }
    else if (li === 2) { setMode('plume'); setCtl(['sPv', 'plumeBtns']); showHint('플룸이 맨틀-핵 경계에서 올라오는 모습을 봐요', 5200); }
    else { setMode('hot'); setCtl(['hotBtns']); showHint('“처음부터 재생”으로 섬이 하나씩 생기는 모습을 봐요', 5200); }
    updateCtl();
  }
  const levels = [
    {
      title: '해령의 힘: 식어서 가라앉는 판', short: '해령의 힘', icon: '🌊', phase: '모형', features: ['ridge'],
      intro: '<p class="si-q">❓ 탐구 질문: 판은 맨틀에 실려 가는 뗏목일까, 스스로 움직이는 주인공일까? 그리고 하와이는 왜 판의 경계가 아닌데 화산이 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학과 앞 차시에서</b> 해령에서 새 해양 지각이 생겨 멀어지고 해구에서 사라진다는 것, 맨틀 대류로 판이 움직인다는 것을 배웠어요. 이번 차시는 판을 움직이는 <b>힘</b>과, 판 아래 깊은 곳에서 올라오는 <b>플룸</b>을 구분해요.</div>' +
        '<p>해양 암석권은 해령에서 막 생겼을 때는 뜨거워 밀도가 작아요. 해령에서 멀어질수록 식어서 <b>두꺼워지고 밀도가 커져 가라앉아요</b>. 그래서 수심이 <b>d ≈ 2500 + 350√t</b> (m, t는 백만 년)로 깊어져요. 해령이 주변보다 높아 암석권이 비탈을 따라 미끄러지려는 힘이 <b>해령 미는 힘</b>이에요. (수치는 예시예요.)</p>',
      setup() { resetStep(0); },
      recap: '해양 암석권은 해령에서 멀어질수록 식어 밀도가 커지고 가라앉아요. 높은 해령에서 암석권이 미끄러지려는 힘이 해령 미는 힘이에요.',
      summary: '<ul><li><b>해양 암석권의 냉각</b>: 나이 t(백만 년)가 클수록 식어서 두꺼워지고 밀도가 커져 가라앉아요. 수심 d ≈ 2500 + 350√t (m): t = 0 → 2500 m, 25 → 4250 m, <b>49 → 4950 m</b>, 70 → 5430 m. 암석권 두께는 약 12√t km(예시).</li><li><b>해령 미는 힘</b>(ridge push): 해령이 높아 암석권이 연약권 위 비탈을 따라 미끄러지려는 힘으로 약 <b>2.5×10¹² N/m</b>(예시).</li><li>해령이 높은 까닭은 뜨겁고 밀도가 작아 <b>부력으로 떠 있기</b> 때문이에요. 마그마가 솟아 판을 밀어내는 것이 아니에요.</li><li>판을 움직이는 힘은 맨틀 대류에 끌려가는 수동적인 움직임이 아니라 판이 스스로 받는 <b>능동적인 힘</b>이에요.</li></ul>',
      missions: [
        {
          title: '나이 49백만 년의 수심 읽기',
          goal: '나이를 <b>49백만 년</b>에 맞추고, 수심 공식 d ≈ 2500 + 350√t로 구한 <b>수심(m)</b>을 입력해요.',
          hint: '√49 = 7이에요. 350 × 7 = 2450이고, 여기에 2500을 더해요. 그래프에서도 그 깊이를 확인할 수 있어요.',
          setup() { S.showD = false; setMode('ridge'); setCtl(['sAge', 'sRd']); },
          check: () => S.age === 49 && S.read === 4950, hold: 0.6,
          status: () => mark(S.age === 49) + ' 나이 ' + S.age + '백만 년 (목표 49) · ' + mark(S.read === 4950) + ' 입력한 수심 ' + S.read + ' m',
          explain: 'd = 2500 + 350 × √49 = 2500 + 350 × 7 = <b>4950 m</b>예요. 식을수록 밀도가 커져 가라앉기 때문에 나이가 많을수록 바다가 깊어요.',
        },
        {
          type: 'quiz', title: '해령은 왜 높을까?',
          goal: '해령이 주변 해저보다 <b>높은</b> 까닭은?',
          setup() { S.showD = true; setMode('ridge'); setCtl(['sAge']); },
          choices: ['해령의 암석권이 뜨겁고 밀도가 작아 부력으로 떠 있기 때문이에요', '해령에서 마그마가 솟아 판을 위에서 밀어내기 때문이에요', '해령에 퇴적물이 두껍게 쌓이기 때문이에요', '해령에서는 암석이 식어 밀도가 작아지기 때문이에요'],
          answer: 0,
          feedback: ['', '마그마가 판을 밀어내는 것이 아니에요. 새로 생긴 암석권이 뜨거워 가벼워서 높이 떠 있는 것이에요.', '해령에는 퇴적물이 거의 없어요. 퇴적물은 해령에서 멀수록 두꺼워져요.', '식으면 밀도가 작아지는 것이 아니라 커져요. 그래서 해령에서 멀수록 가라앉아요.'],
          explain: '해령의 암석권은 <b>뜨겁고 밀도가 작아</b> 연약권 위에 높이 떠 있어요. 멀어지며 식어 밀도가 커지면 가라앉고, 높은 해령에서 비탈을 따라 미끄러지려는 힘이 <b>해령 미는 힘</b>이에요.',
        },
      ],
    },
    {
      title: '섭입의 힘: 판이 스스로 당겨요', short: '섭입의 힘', icon: '⛓️', phase: '분석', features: ['slab'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 해령 미는 힘이 약 2.5×10¹² N/m임을 봤어요. 식은 판의 끝이 해구에서 맨틀 속으로 가라앉으면 어떤 힘이 생길까요?</div>' +
        '<p>섭입하는 판은 주변 맨틀보다 무거워서 중력으로 가라앉으며 판 전체를 <b>당겨요</b>. 어림값은 <b>F ≈ Δρ·g·h·L</b>이에요(Δρ: 밀도 차, h: 판 두께, L: 가라앉은 길이). 또 섭입대가 길게 붙은 판이 정말 빠른지 8개 판의 속도로 확인해 봐요. (수치는 예시예요.)</p>',
      setup() { resetStep(1); },
      recap: '섭입하는 판이 당기는 힘은 해령 미는 힘의 약 10배로 판을 움직이는 가장 큰 힘이에요. 섭입대가 길게 붙은 판일수록 빨라요.',
      summary: '<ul><li><b>섭입하는 판이 당기는 힘</b>(slab pull) F ≈ Δρ g h L. Δρ = 80 kg/m³, g = 10 m/s², h = 70 km, L = 500 km이면 F = 80 × 10 × 7×10⁴ × 5×10⁵ = <b>2.8×10¹³ N/m</b>.</li><li>이는 해령 미는 힘(약 2.5×10¹² N/m)의 약 10배로 <b>가장 큰 힘</b>이에요.</li><li>판 속도(예시): 태평양판 8 · 코코스판 7 · 나스카판 7 · 인도–오스트레일리아판 6 cm/년(섭입대가 길게 붙음), 아프리카판 2 · 북아메리카판 1.5 · 유라시아판 1 · 남극판 1 cm/년(거의 없음). <b>섭입대가 붙은 판이 빨라요.</b></li><li>판은 맨틀 대류에 얹혀 컨베이어처럼 끌려가는 것이 아니라 <b>스스로 당기고 밀리며</b> 움직여요.</li></ul>',
      missions: [
        {
          title: '판 8개 분류하기', manual: true,
          goal: '판 8개를 <b>섭입대가 길게 붙은 판</b>과 <b>거의 없는 판</b>으로 나눠 속도를 비교해요.',
          hint: '태평양을 둘러싼 해구(불의 고리)에는 태평양판·나스카판·코코스판이 가라앉고, 인도–오스트레일리아판도 길게 가라앉아요. 나머지는 섭입대가 짧아요.',
          setup() { clsPlate.reset(); setMode('slab'); setCtl(['sL', 'clsPlate']); },
          status: () => mark(clsPlate.ok()) + ' 분류한 판 ' + clsPlate.count() + ' / 8',
          check() {
            if (!clsPlate.complete()) return '8개 판을 모두 분류해 주세요. (지금 ' + clsPlate.count() + '개)';
            if (!clsPlate.ok()) { clsPlate.mark(clsPlate.wrong()); return '빨간 줄이 달라요. 가라앉는 판 가장자리에 해구가 길게 이어지는지 생각해 봐요.'; }
            return true;
          },
          explain: '<b>태평양·코코스·나스카·인도–오스트레일리아판</b>은 섭입대가 길게 붙어 있고 빨라요(6~8 cm/년). <b>아프리카·북아메리카·유라시아·남극판</b>은 섭입대가 거의 없고 느려요(1~2 cm/년).',
        },
        {
          title: '당기는 힘 계산하기',
          goal: '<b>L = 500 km</b>일 때 당기는 힘 F = Δρ·g·h·L을 <b>×10¹³ N/m</b> 단위로 계산해 입력해요.',
          hint: 'F = 80 × 10 × (7×10⁴) × (5×10⁵). 80 × 10 = 800, 800 × 7×10⁴ = 5.6×10⁷, 5.6×10⁷ × 5×10⁵ = 2.8×10¹³이에요.',
          setup() { setL(500); stpF.reset(); S.showF = false; setMode('slab'); setCtl(['sL', 'stpF']); },
          check: () => S.L === 500 && stpF.value === 2.8, hold: 0.6,
          status: () => mark(S.L === 500) + ' 가라앉은 길이 ' + S.L + ' km (목표 500) · ' + mark(stpF.value === 2.8) + ' 입력한 힘 ' + stpF.value.toFixed(1) + '×10¹³ N/m',
          explain: 'F = 80 × 10 × 7×10⁴ × 5×10⁵ = <b>2.8×10¹³ N/m</b>예요. 해령 미는 힘(2.5×10¹² N/m)의 약 11배로, 어림으로 10배 이상이에요.',
        },
        {
          type: 'quiz', title: '판을 움직이는 주된 힘',
          goal: '판을 움직이는 <b>가장 큰 힘</b>은?',
          setup() { S.showF = true; setMode('slab'); setCtl(['sL']); },
          choices: ['섭입하는 판이 당기는 힘 (슬랩 당김)', '판이 맨틀 대류 위에 얹혀 컨베이어처럼 끌려가는 힘', '해령에서 마그마가 판을 밀어내는 힘', '달의 인력'],
          answer: 0,
          feedback: ['', '판은 맨틀에 수동적으로 끌려가는 것이 아니에요. 판 스스로 받는 힘이 더 커요.', '해령 미는 힘은 슬랩 당김의 약 1/10 수준이에요. 마그마가 밀어내는 것도 아니에요.', '달의 인력은 조석을 일으키지만 판을 움직이는 주된 힘은 아니에요.'],
          explain: '섭입하는 판은 주변 맨틀보다 무거워 가라앉으며 판을 <b>당겨요</b>. 이 힘이 해령 미는 힘의 약 10배로 <b>가장 큰 힘</b>이라서 섭입대가 길게 붙은 판이 빨라요.',
        },
      ],
    },
    {
      title: '맨틀 플룸: 핵에서 올라오는 기둥', short: '맨틀 플룸', icon: '🔥', phase: '모형', features: ['plume'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 판은 해령과 섭입대의 힘으로 움직였어요. 이 운동은 지구 표면에서 약 670 km까지의 <b>상부 맨틀</b>에서 일어나요. 그런데 판의 경계가 아닌 곳에도 화산이 있어요.</div>' +
        '<p>맨틀 가장 깊은 곳인 <b>맨틀-핵 경계</b>(깊이 약 2900 km)에서 데워진 뜨거운 물질이 기둥 모양으로 올라오는 것을 <b>플룸</b>이라고 해요. 반대로 섭입한 차가운 판은 하부 맨틀로 가라앉아요. 지진파 단층 촬영 영상에서는 뜨거운 곳이 지진파가 <b>느려서</b> 빨갛게 보여요. (예시 영상이에요.)</p>',
      setup() { resetStep(2); },
      recap: '상부 맨틀의 대류와 판 운동은 판 경계에서 화산·지진을 만들고, 맨틀-핵 경계에서 올라오는 플룸은 판 경계가 아닌 곳에도 열점 화산을 만들어요.',
      summary: '<ul><li><b>상부 맨틀의 운동(판 운동)</b>: 지표에서 약 670 km까지. 해령·해구 같은 판 경계에서 화산과 지진이 생겨요.</li><li><b>맨틀 플룸</b>: 깊이 약 2900 km의 맨틀-핵 경계에서 데워져 올라오는 뜨거운 기둥(머리와 꼬리). 지표에 닿으면 판 경계가 아닌 곳에 화산 활동(<b>열점</b>)을 만들어요.</li><li>상승 속도 5 cm/년(예시)이면 2900 km ÷ 5 cm/년 = 2.9×10⁶ m ÷ 0.05 m/년 = 5.8×10⁷ 년, 곧 <b>약 5800만 년</b>(약 6천만 년)이에요.</li><li>섭입한 차가운 판은 하부 맨틀로 가라앉아요(콜드 플룸, 지진파 빠름). 아프리카·태평양 아래에는 뜨거운 대규모 상승 영역(슈퍼 플룸, 지진파 느림)이 있어요.</li><li>맨틀 깊은 곳의 운동이 지표의 화산 활동(지권)과 기권·수권을 이어 주어요.</li></ul>',
      missions: [
        {
          title: '상부 맨틀 운동과 플룸 구분하기', manual: true,
          goal: '카드 6장을 <b>상부 맨틀 운동(판 운동)</b>과 <b>플룸</b>으로 나눠요.',
          hint: '판이 움직이는 상부 맨틀은 약 670 km까지예요. 플룸은 훨씬 깊은 2900 km에서 시작해 기둥으로 올라와 판 경계가 아닌 곳에도 화산을 만들어요.',
          setup() { clsPlume.reset(); S.tblOn = false; S.tmShow = false; setMode('plume'); setCtl(['sPv', 'plumeBtns', 'clsPlume']); },
          status: () => mark(clsPlume.ok()) + ' 분류한 카드 ' + clsPlume.count() + ' / 6',
          check() {
            if (!clsPlume.complete()) return '카드 6장을 모두 분류해 주세요. (지금 ' + clsPlume.count() + '장)';
            if (!clsPlume.ok()) { clsPlume.mark(clsPlume.wrong()); return '빨간 카드가 달라요. 깊이와 모양, 화산이 생기는 위치를 지구 단면에서 확인해 봐요.'; }
            return true;
          },
          explain: '<b>상부 맨틀 운동</b>은 약 670 km까지, 판의 이동·섭입을 동반하고 판 경계에서 화산·지진이 생겨요. <b>플룸</b>은 2900 km의 맨틀-핵 경계에서 시작하는 기둥으로, 판 경계가 아닌 곳에도 열점 화산을 만들어요.',
        },
        {
          title: '플룸이 올라오는 데 걸린 시간',
          goal: '플룸이 <b>5 cm/년</b>으로 맨틀-핵 경계(2900 km)에서 지표까지 올라오는 데 걸리는 시간을 <b>백만 년</b> 단위로 입력해요.',
          hint: '시간 = 거리 ÷ 속도 = 2900 km ÷ 5 cm/년. 2900 km = 2.9×10⁶ m, 5 cm/년 = 0.05 m/년이에요. 결과는 약 5.8×10⁷ 년이에요.',
          setup() { setPv(5); setTr(30); S.pf = 0; S.tmShow = false; setMode('plume'); setCtl(['sPv', 'sTr']); },
          check: () => S.pv === 5 && Math.abs(S.tr - 58) <= 1, hold: 0.6,
          status: () => mark(S.pv === 5) + ' 상승 속도 ' + S.pv + ' cm/년 (목표 5) · ' + mark(Math.abs(S.tr - 58) <= 1) + ' 내 답 ' + S.tr + '백만 년',
          explain: '시간 = 2.9×10⁶ m ÷ 0.05 m/년 = 5.8×10⁷ 년, 곧 <b>약 58백만 년</b>(약 6천만 년)이에요. 플룸은 천천히 오래 올라와 열점을 만들어요.',
        },
        {
          type: 'quiz', title: '판의 경계가 아닌 곳의 화산',
          goal: '판의 경계가 아닌 곳에 <b>화산</b>이 생기는 까닭은?',
          setup() { S.tblOn = true; S.tmShow = true; setMode('plume'); setCtl(['sPv', 'plumeBtns']); },
          choices: ['맨틀-핵 경계에서 데워진 뜨거운 물질이 기둥으로 올라와 판 아래를 뚫기 때문이에요', '판 경계의 틈으로 마그마가 멀리 새어 나오기 때문이에요', '섭입한 판이 녹아 올라오기 때문이에요', '해령이 그곳까지 이동해 왔기 때문이에요'],
          answer: 0,
          feedback: ['', '틈으로 멀리 새어 나오는 것이 아니에요. 훨씬 깊은 곳에서 올라오는 뜨거운 기둥이 원인이에요.', '섭입한 판이 녹는 것은 섭입대 화산이에요. 열점은 맨틀-핵 경계에서 올라오는 플룸 때문이에요.', '해령이 이동해 오는 것이 아니에요. 열점은 거의 한 자리에 있는 플룸 위에 생겨요.'],
          explain: '<b>맨틀-핵 경계</b>(약 2900 km)에서 데워진 뜨거운 물질이 <b>기둥(플룸)</b>으로 올라와 판 아래를 뚫으면, 판의 경계가 아닌 곳에도 화산이 생겨요. 플룸 상승류의 사례가 <b>열점</b>이에요.',
        },
      ],
    },
    {
      title: '열점 추적: 고정된 플룸 위를 지나는 판', short: '열점 추적', icon: '🏝️', phase: '분석', features: ['hot'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 플룸이 판 아래를 뚫고 올라와 판의 경계가 아닌 곳에 열점 화산을 만든다는 것을 봤어요. 그 위를 판이 지나가면 어떤 흔적이 남을까요?</div>' +
        '<p>열점은 거의 한 자리에 있고, 판은 움직여요. 그래서 열점 위에 생긴 화산섬은 판과 함께 멀어지고 <b>새 화산섬</b>이 줄지어 생겨요. 하와이 열도에서 섬의 <b>나이와 거리</b>를 그래프에 찍어 판의 이동 속도를 구해 봐요. (거리는 단순화한 예시예요.)</p>',
      setup() { resetStep(3); },
      recap: '열점은 거의 고정이고 판이 움직이므로 섬의 나이와 열점으로부터의 거리가 비례해요. 기울기가 판 이동 속도이고, 열도가 꺾인 곳은 판 이동 방향이 바뀐 증거예요.',
      summary: '<ul><li><b>하와이 열점</b>(예시): 하와이 섬 0 km·0 백만 년, 마우이 130 km·1.3, 오아후 340 km·3.4, 카우아이 510 km·5.1 → 거리 ÷ 나이 = <b>100 km/백만 년 = 10 cm/년</b>(1 km/백만 년 = 0.1 cm/년). 판이 북서쪽으로 이동해요.</li><li>열점은 거의 고정되어 있어 섬의 <b>나이는 열점에서 멀수록 많아요</b>.</li><li><b>엠퍼러 해산군</b>과 하와이 열도가 약 <b>4700만 년 전</b>에 꺾여 있어요. 열점이 고정이라면 이는 <b>판 이동 방향이 바뀐 단서</b>예요.</li><li>열점은 <b>플룸 상승류의 사례</b>예요. 열점·섭입대·해령은 화산이 생기는 방식이 달라요(옐로스톤은 대륙 열점, 아이슬란드는 해령과 열점이 겹침).</li></ul>',
      missions: [
        {
          title: '점 찍고 판 이동 속도 구하기',
          goal: '마우이·오아후·카우아이를 눌러 <b>점 3개</b>를 찍고, 기울기로 구한 <b>판 이동 속도(cm/년)</b>를 입력해요.',
          hint: '“▶ 처음부터 재생”이 끝난 뒤 섬(또는 버튼)을 눌러요. 기울기 = 거리 ÷ 나이 = 130 km ÷ 1.3백만 년 = 100 km/백만 년. 1 km/백만 년 = 0.1 cm/년이에요.',
          setup() { S.plotted = { maui: false, oahu: false, kauai: false }; stpHv.reset(); S.slopeShow = false; S.tau = 1; S.play = false; syncPlot(); setMode('hot'); setCtl(['hotBtns', 'stpHv']); },
          check: () => S.plotted.maui && S.plotted.oahu && S.plotted.kauai && stpHv.value === 10, hold: 0.6,
          status: () => mark(S.plotted.maui && S.plotted.oahu && S.plotted.kauai) + ' 찍은 점 ' + [S.plotted.maui, S.plotted.oahu, S.plotted.kauai].filter(Boolean).length + ' / 3 · ' + mark(stpHv.value === 10) + ' 입력한 속도 ' + stpHv.value + ' cm/년',
          explain: '세 점이 한 직선 위에 있고 기울기는 <b>100 km/백만 년 = 10 cm/년</b>이에요. 열점이 거의 고정이므로 이 값이 <b>판의 이동 속도</b>예요.',
        },
        {
          title: '화산 5곳 분류하기', manual: true,
          goal: '화산 5곳이 <b>열점 · 섭입대 · 해령</b> 중 어디에 속하는지 골라요.',
          hint: '판 한가운데나 대륙 안쪽의 화산은 플룸 때문이에요(열점). 해구 옆 화산 호는 섭입대예요. 아이슬란드는 해령이 열점과 겹친 곳이라 두 가지 모두 인정돼요.',
          setup() { clsVolc.reset(); S.slopeShow = true; setMode('hot'); setCtl(['hotBtns', 'clsVolc']); },
          status: () => mark(clsVolc.ok()) + ' 분류한 곳 ' + clsVolc.count() + ' / 5',
          check() {
            if (!clsVolc.complete()) return '5곳을 모두 분류해 주세요. (지금 ' + clsVolc.count() + '곳)';
            if (!clsVolc.ok()) { clsVolc.mark(clsVolc.wrong()); return '빨간 줄이 달라요. 판 경계인지 아닌지, 해구가 있는지 생각해 봐요.'; }
            return true;
          },
          explain: '<b>하와이</b>(태평양판 한가운데)와 <b>옐로스톤</b>(대륙 안쪽)은 열점, <b>일본</b>과 <b>안데스</b>는 섭입대, <b>아이슬란드</b>는 해령이면서 열점이에요.',
        },
        {
          type: 'quiz', title: '열도가 꺾인 까닭',
          goal: '열점이 거의 고정이라면, 하와이–엠퍼러 열도가 약 4700만 년 전에 <b>꺾인 것</b>은 무엇을 뜻할까요?',
          setup() { S.slopeShow = true; setMode('hot'); setCtl(['hotBtns']); },
          choices: ['판의 이동 방향이 바뀌었다는 증거예요', '열점(플룸)이 갑자기 옆으로 옮겨 갔기 때문이에요', '화산이 폭발하면서 섬이 휘어졌기 때문이에요', '해령이 그곳으로 이동했기 때문이에요'],
          answer: 0,
          feedback: ['', '열점이 거의 고정이라는 것이 이 해석의 전제예요. 열점이 옮겨 다닌다면 속도 계산이 의미가 없어요.', '섬의 위치는 화산이 만들어진 자리에서 판과 함께 움직인 결과예요. 폭발로 휘지 않아요.', '하와이는 판의 경계가 아니에요. 해령이 이동해 온 것이 아니에요.'],
          explain: '열점이 거의 고정이면 화산섬의 줄이 꺾인 곳은 <b>판 이동 방향이 바뀐 시기</b>를 알려 줘요. 열점은 <b>플룸 상승류의 사례</b>라서 판과 달리 거의 움직이지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-plate-plume', mount: '#game', badge: '맨틀 탐정', homeHref: '../../index.html#hs',
    featureLabels: { ridge: '🌊 해양 암석권의 냉각 · 해령 미는 힘', slab: '⛓️ 슬랩 당김 · 판의 속도', plume: '🔥 지구 단면 · 단층 촬영 영상', hot: '🏝️ 하와이 열도 · 엠퍼러 꺾임' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'ridge') setReadouts(['해양 암석권 나이', S.age + '백만 년', '암석권 두께', '약 ' + Math.round(hLith(S.age)) + ' km', '수심', S.showD || (game && game.free) ? Math.round(dSea(S.age)) + ' m' : '공식으로 구해요']);
    else if (m === 'slab') setReadouts(['가라앉은 길이 L', S.L + ' km', '당기는 힘', S.showF || (game && game.free) ? fpow(slabF(S.L)) + ' N/m' : '직접 계산해요', '해령 미는 힘', '2.5×10¹² N/m']);
    else if (m === 'plume') setReadouts(['플룸 상승 속도', S.pv + ' cm/년', '올라온 거리', riseKm() + ' km', '전체 걸리는 시간', S.tmShow || (game && game.free) ? Math.round(290 / S.pv) + '백만 년' : '직접 계산해요']);
    else setReadouts(['판 이동 속도', '10 cm/년', '찍은 점', [S.plotted.maui, S.plotted.oahu, S.plotted.kauai].filter(Boolean).length + ' / 3', '엠퍼러 꺾임', '약 4700만 년 전']);
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
    if (S.mode === 'ridge') drawRidge(t, dt);
    else if (S.mode === 'slab') drawSlab(t, dt);
    else if (S.mode === 'plume') drawPlume(t, dt);
    else { drawHot(t, dt); syncPlot(); }
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, clsPlate, clsPlume, clsVolc, stpF, stpHv, g4, islPos,
    get game() { return game; }, setMode, resetStep, updateCtl, setAge, setRead, setL, setPv, setTr, slabF, dSea, hLith, riseKm, togglePlot,
    solvePlate() { clsPlate.sel = PLATES.reduce((a, p) => { a[p.id] = p.k; return a; }, {}); },
    solvePlume() { clsPlume.sel = { a: 'up', b: 'pl', c: 'pl', d: 'up', e: 'pl', f: 'up' }; },
    solveVolc() { clsVolc.sel = { haw: 'hot', jpn: 'sub', ice: 'rid', yel: 'hot', and: 'sub' }; },
  };
})();
