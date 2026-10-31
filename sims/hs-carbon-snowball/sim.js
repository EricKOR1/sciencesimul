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
     탄소·물의 순환 (석회암 퇴적 → 탄소 되먹임 → 얼음덩어리 지구 → 물과 지형)
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
  const SUP = ['10⁰', '10¹', '10²', '10³', '10⁴', '10⁵', '10⁶', '10⁷', '10⁸'];

  const S = {
    mode: 'cyc', fade: 0, clock: 0, bad: [],
    // 1) 순환
    co: 100, namesOn: false, vAcc: 0, rAcc: 0, dAcc: 0, ionAcc: 0, limeN: 0, lime: [0], pkN: 0,
    // 2) 되먹임
    v: 1, x: 1, tM: 0, play: true, fast: false, acc: 0,
    // 3) 얼음덩어리
    ice: 70, phase: 'normal', idle: 9, tz: 0, accel: false, predict: 100, famt: 0, capShown: false,
    // 4) 물과 지형
    Q: 2, sl: 4, mea: 0.43, signsOn: false,
  };
  const rr2 = (a, b) => a + Math.random() * (b - a);
  /* 꺾은선에서 u에 대응하는 v (u가 오름차순이든 내림차순이든) */
  function interpU(pts, u) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if ((u >= a[0] && u <= b[0]) || (u <= a[0] && u >= b[0])) { const d = b[0] - a[0]; return d === 0 ? a[1] : a[1] + (b[1] - a[1]) * ((u - a[0]) / d); }
    }
    return pts[pts.length - 1][1];
  }

  /* ======================================================
     장면 1: 탄소의 순환 (화산 → 대기 → 풍화 → 강 → 바다 → 석회암 → 섭입 → 화산)
     ====================================================== */
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 452 }, B: { x: 8, y: 468, w: 504, h: 284 } }
    : { A: { x: 12, y: 12, w: 548, h: 536 }, B: { x: 568, y: 12, w: 220, h: 536 } };
  const g1 = () => { const A = RC1.A; return { x: A.x + 10, y: A.y + 38, w: A.w - 20, h: A.h - 48 }; };
  const PU = (g, u, v) => [g.x + u * g.w, g.y + v * g.h];
  const TER = [[0, 0.36], [0.06, 0.36], [0.14, 0.205], [0.22, 0.36], [0.30, 0.36], [0.36, 0.21], [0.40, 0.145], [0.46, 0.25], [0.52, 0.37]];
  const MARGIN = [[0.52, 0.37], [0.57, 0.52], [0.61, 0.66], [0.64, 0.75]];
  const SLAB = [[1.0, 0.70], [0.78, 0.70], [0.70, 0.72], [0.64, 0.75], [0.50, 0.82], [0.36, 0.90], [0.26, 0.96]];
  const SLABEND = [[0.64, 0.75], [0.50, 0.82], [0.36, 0.90], [0.31, 0.93]];
  const COND = [[0.31, 0.915], [0.22, 0.64], [0.16, 0.34], [0.14, 0.215]];
  const RIV = [[0.405, 0.175], [0.45, 0.25], [0.49, 0.33], [0.525, 0.372]];
  const VCO = [], RAIN = [], IONS = [], SHELLS = [], PKS = [];
  const SLAB_T = 0.05;
  const seaFloorV = (u) => interpU(SLAB, u);
  const stackPx = () => Math.min(44, S.lime.reduce((a, b) => a + b, 0) * 0.5);
  function pathLen(pts, g) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot((pts[i][0] - pts[i - 1][0]) * g.w, (pts[i][1] - pts[i - 1][1]) * g.h); return L; }
  function pathAt(pts, g, s) {
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot((pts[i][0] - pts[i - 1][0]) * g.w, (pts[i][1] - pts[i - 1][1]) * g.h);
      if (s <= L || i === pts.length - 1) { const f = L ? clamp(s / L, 0, 1) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; }
      s -= L;
    }
    return pts[pts.length - 1];
  }
  const carbonRate = () => 0.1 * (S.co / 100);   // 풍화 소비(석회암 퇴적) 속도 (GtC/년, 예시)

  function cycStep(dt) {
    const g = g1(), co = S.co / 100;
    // 화산이 CO2를 내보내요 (0.1 GtC/년으로 일정)
    S.vAcc += 1.3 * dt;
    while (S.vAcc >= 1) { S.vAcc -= 1; const c = PU(g, 0.14, 0.215); VCO.push({ x: c[0] + rr2(-3, 3), y: c[1] - 4, vx: rr2(-9, 9), vy: -rr2(34, 52), life: 0 }); }
    for (let i = VCO.length - 1; i >= 0; i--) { const p = VCO[i]; p.y += p.vy * dt; p.x += p.vx * dt; p.life += dt; if (p.y < g.y + g.h * 0.05 || p.life > 6) VCO.splice(i, 1); }
    // 빗방울 (산 위로 내리는 비의 양은 CO2가 많을수록 산성이 강하고 풍화가 빨라요)
    S.rAcc += 3 * co * dt;
    while (S.rAcc >= 1 && RAIN.length < 60) { S.rAcc -= 1; const c = PU(g, rr2(0.33, 0.46), 0.1); RAIN.push({ x: c[0], y: c[1], m: true }); }
    if (S.rAcc > 6) S.rAcc = 0;
    S.dAcc += 2 * dt;
    while (S.dAcc >= 1 && RAIN.length < 60) { S.dAcc -= 1; const c = PU(g, rr2(0.33, 0.5), 0.1); RAIN.push({ x: c[0], y: c[1], m: false, dec: true }); }
    if (S.dAcc > 4) S.dAcc = 0;
    for (let i = RAIN.length - 1; i >= 0; i--) {
      const d = RAIN[i]; d.y += 175 * dt;
      const u = (d.x - g.x) / g.w, gy = g.y + g.h * interpU(TER, u);
      if (d.y >= gy - 2) {
        if (d.m && IONS.length < 80) {
          const t0 = PU(g, RIV[0][0], RIV[0][1]);
          IONS.push({ x: d.x, y: gy - 2, st: 0, s: 0, tx: t0[0], ty: t0[1] });
          parts.burst(d.x, gy - 2, { count: 3, speed: 28, life: 0.3, size: 1.8, gravity: 40, colors: ['#bae6fd', '#fda4af'] });
        }
        RAIN.splice(i, 1);
      }
    }
    // 이온: 암석 → 강 → 바다
    const RL = pathLen(RIV, g);
    for (let i = IONS.length - 1; i >= 0; i--) {
      const q = IONS[i];
      if (q.st === 0) { const dx = q.tx - q.x, dy = q.ty - q.y, dd = Math.hypot(dx, dy); if (dd < 5) { q.st = 1; q.s = 0; } else { q.x += (dx / dd) * 70 * dt; q.y += (dy / dd) * 70 * dt; } }
      else if (q.st === 1) { q.s += 78 * dt; const p = pathAt(RIV, g, q.s), c = PU(g, p[0], p[1]); q.x = c[0]; q.y = c[1] - 2; if (q.s >= RL) { q.st = 2; const t = PU(g, rr2(0.77, 0.97), 0.42); q.tx = t[0]; q.ty = t[1]; } }
      else if (q.st === 2) { const dx = q.tx - q.x, dy = q.ty - q.y, dd = Math.hypot(dx, dy); if (dd < 4) { q.st = 3; SHELLS.push({ x: q.x, y: q.y }); IONS.splice(i, 1); parts.burst(q.x, q.y, { count: 4, speed: 22, life: 0.35, size: 2, gravity: 0, colors: ['#ffffff', '#fef9c3'] }); } else { q.x += (dx / dd) * 52 * dt; q.y += (dy / dd) * 52 * dt; } }
    }
    // 껍데기: 가라앉아 석회암층이 돼요
    const sp = stackPx();
    for (let i = SHELLS.length - 1; i >= 0; i--) {
      const s = SHELLS[i]; s.y += 38 * dt;
      const u = (s.x - g.x) / g.w, fy = g.y + g.h * seaFloorV(u) - sp;
      if (s.y >= fy) {
        S.limeN++; S.lime[S.lime.length - 1]++;
        if (S.lime[S.lime.length - 1] >= 12) S.lime.push(0);
        while (S.lime.reduce((a, b) => a + b, 0) * 0.5 > 44 && S.lime.length > 1) S.lime.shift();
        if (Math.random() < 0.4 && PKS.length < 14) PKS.push({ st: 0, s: 0, u: clamp(u, 0.74, 0.98) });
        SHELLS.splice(i, 1);
      }
    }
    // 섭입대를 따라 내려가는 탄산염 → 마그마 → 화산
    const slabPath = (u0) => [[u0, seaFloorV(u0)]].concat(SLABEND.filter((p) => p[0] < u0 - 0.001));
    const SL = {};
    for (let i = PKS.length - 1; i >= 0; i--) {
      const k = PKS[i];
      if (k.st === 0) {
        if (!k.path) { k.path = slabPath(k.u); k.len = pathLen(k.path, g); }
        k.s += 34 * dt;
        if (k.s >= k.len) { k.st = 1; k.s = 0; }
      } else {
        k.s += 62 * dt;
        if (k.s >= pathLen(COND, g)) { const c = PU(g, 0.14, 0.215); parts.burst(c[0], c[1] - 4, { count: 8, speed: 70, life: 0.7, size: 2.6, gravity: -20, colors: ['#fb923c', '#f87171', '#9ca3af'] }); for (let j = 0; j < 3; j++) VCO.push({ x: c[0] + rr2(-4, 4), y: c[1] - 6, vx: rr2(-12, 12), vy: -rr2(34, 52), life: 0 }); PKS.splice(i, 1); }
      }
    }
  }
  function drawLabel1(g, u, v, num, name, col) {
    const c = PU(g, u, v), R = 13 * (PHONE ? 1.05 : 1);
    D.sphere(c[0], c[1], R, col, { gloss: true, text: String(num), outline: '#fff', outlineWidth: 2 });
    if (S.namesOn || (game && game.free)) D.label(c[0] + R + 6, c[1], name, { bg: '#1e293b', size: 12.5, pad: 7, align: 'left' });
  }
  function drawCyc(t, dt) {
    const { A, B } = RC1, g = g1(), co = S.co / 100;
    cycStep(dt);
    card(A, '🌍 탄소의 순환 (단면 모식도)');
    ctx.save(); rr(g.x, g.y, g.w, g.h, 12).clip();
    const P = (u, v) => PU(g, u, v), pp = (arr) => arr.map((q) => P(q[0], q[1]));
    // 하늘
    const sk = ctx.createLinearGradient(0, g.y, 0, g.y + g.h * 0.4); sk.addColorStop(0, '#cfe8fb'); sk.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sk; ctx.fillRect(g.x, g.y, g.w, g.h);
    // 맨틀(바닥 전체)
    const mg = ctx.createLinearGradient(0, g.y + g.h * 0.7, 0, g.y + g.h); mg.addColorStop(0, '#c2884f'); mg.addColorStop(1, '#a8582f'); ctx.fillStyle = mg; ctx.fillRect(g.x, g.y + g.h * 0.36, g.w, g.h * 0.64);
    // 바다
    ctx.beginPath(); ctx.moveTo(...P(0.52, 0.37)); ctx.lineTo(...P(1.02, 0.37)); ctx.lineTo(...P(1.02, 0.70));
    SLAB.slice(1, 4).forEach((q) => ctx.lineTo(...P(q[0], q[1])));
    MARGIN.slice().reverse().slice(1).forEach((q) => ctx.lineTo(...P(q[0], q[1])));
    ctx.closePath(); const sg = ctx.createLinearGradient(0, g.y + g.h * 0.37, 0, g.y + g.h * 0.72); sg.addColorStop(0, '#6cc3ee'); sg.addColorStop(1, '#2d7db3'); ctx.fillStyle = sg; ctx.fill();
    // 해양 지각(섭입하는 판)
    ctx.beginPath(); SLAB.forEach((q, i) => { const c = P(q[0] + (i === 0 ? 0.03 : 0), q[1]); i ? ctx.lineTo(...c) : ctx.moveTo(...c); });
    for (let i = SLAB.length - 1; i >= 0; i--) ctx.lineTo(...P(SLAB[i][0] + (i === 0 ? 0.03 : 0), SLAB[i][1] + SLAB_T));
    ctx.closePath(); ctx.fillStyle = '#5b6b7e'; ctx.fill(); ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5; ctx.stroke();
    // 대륙
    ctx.beginPath(); TER.forEach((q, i) => (i ? ctx.lineTo(...P(q[0], q[1])) : ctx.moveTo(...P(q[0], q[1]))));
    MARGIN.slice(1).forEach((q) => ctx.lineTo(...P(q[0], q[1])));
    SLAB.slice(3).forEach((q) => ctx.lineTo(...P(q[0], q[1] - 0.003)));
    ctx.lineTo(...P(0, 0.965)); ctx.closePath();
    const cg = ctx.createLinearGradient(0, g.y + g.h * 0.15, 0, g.y + g.h * 0.95); cg.addColorStop(0, '#9a8f7a'); cg.addColorStop(0.35, '#8a7f6c'); cg.addColorStop(1, '#6e665a'); ctx.fillStyle = cg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#4b4438'; ctx.stroke();
    // 산의 규산염 암석 표면
    ctx.beginPath(); TER.slice(5).forEach((q, i) => (i ? ctx.lineTo(...P(q[0], q[1])) : ctx.moveTo(...P(q[0], q[1])))); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4; ctx.stroke();
    // 마그마 통로
    ctx.beginPath(); COND.forEach((q, i) => (i ? ctx.lineTo(...P(q[0], q[1])) : ctx.moveTo(...P(q[0], q[1])))); ctx.strokeStyle = 'rgba(239,68,68,.45)'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
    // 화산 분화구 불빛
    const cr = P(0.14, 0.215); D.glow(cr[0], cr[1] - 3, 22, '#fb923c', 0.35 + 0.15 * Math.sin(t * 5));
    // 강
    ctx.beginPath(); RIV.forEach((q, i) => (i ? ctx.lineTo(...P(q[0], q[1])) : ctx.moveTo(...P(q[0], q[1])))); ctx.strokeStyle = '#38a3dc'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.stroke();
    // 파도(수면)
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const c = P(0.52 + 0.48 * i / 40, 0.37); i ? ctx.lineTo(c[0], c[1] + Math.sin(t * 1.5 + i * 0.6) * 1.6) : ctx.moveTo(c[0], c[1]); } ctx.stroke();
    // 석회암 퇴적층 (바다 바닥)
    const sp = stackPx(); let yy = 0;
    const fx0 = P(0.74, 0)[0], fx1 = P(1.0, 0)[0];
    const stackTot = S.lime.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < S.lime.length; i++) {
      const hh = (S.lime[i] / stackTot) * sp; if (hh <= 0.05) continue;
      ctx.fillStyle = i % 2 ? '#e7e5e4' : '#cfcac4';
      ctx.beginPath(); ctx.moveTo(fx0, P(0.74, seaFloorV(0.74))[1] - yy); ctx.lineTo(fx0, P(0.74, seaFloorV(0.74))[1] - yy - hh);
      for (let k = 1; k <= 6; k++) { const u = 0.74 + (0.26 * k) / 6; ctx.lineTo(P(u, 0)[0], P(0, seaFloorV(u))[1] - yy - hh); }
      for (let k = 6; k >= 1; k--) { const u = 0.74 + (0.26 * k) / 6; ctx.lineTo(P(u, 0)[0], P(0, seaFloorV(u))[1] - yy); }
      ctx.closePath(); ctx.fill(); yy += hh;
    }
    // 판 이동 표시(칼날 무늬)
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([7, 9]); ctx.lineDashOffset = -t * 14; ctx.beginPath(); SLAB.forEach((q, i) => { const c = P(q[0] + (i === 0 ? 0.03 : 0), q[1] + SLAB_T / 2); i ? ctx.lineTo(...c) : ctx.moveTo(...c); }); ctx.stroke(); ctx.restore();
    // 구름과 비
    const cl = P(0.4, 0.085); ctx.fillStyle = 'rgba(255,255,255,.96)'; [[-34, 4, 20], [-12, -6, 24], [12, -2, 22], [34, 5, 18]].forEach((q) => { ctx.beginPath(); ctx.arc(cl[0] + q[0], cl[1] + q[1], q[2], 0, TAU); ctx.fill(); });
    const acid = clamp((co - 0.25) / 3.75, 0, 1);
    RAIN.forEach((d) => { ctx.strokeStyle = d.m ? mixc('#7dd3fc', '#f472b6', 0.25 + 0.7 * acid) : 'rgba(125,211,252,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, d.y - 6); ctx.lineTo(d.x - 1, d.y); ctx.stroke(); });
    // 대기의 CO2 (CO2 양에 비례)
    const nco = Math.round(3 + co / 4 * 40), rA = seeded(11);
    for (let i = 0; i < 48; i++) {
      const u = 0.04 + rA() * 0.92, v = 0.05 + rA() * 0.2, ph = rA() * 6;
      if (i < nco) ball(g.x + u * g.w + Math.sin(t * 0.8 + ph) * 6, g.y + v * g.h + Math.cos(t * 0.7 + ph) * 4, 3.6, '#475569', false);
    }
    VCO.forEach((p) => { ctx.globalAlpha = clamp(1 - p.life / 6, 0.25, 1); ball(p.x, p.y, 3.4, '#475569', false); ctx.globalAlpha = 1; });
    D.text(g.x + 10, g.y + 18 * FS, '대기 (CO₂ ' + S.co + ' %)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    // 이온과 껍데기, 탄산염 덩어리
    IONS.forEach((q) => ball(q.x, q.y, 3.4, q.st === 0 ? '#f9a8d4' : '#22d3ee', false));
    SHELLS.forEach((s) => { ctx.fillStyle = '#fffbeb'; ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 3.6, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    PKS.forEach((k) => {
      if (k.st === 0 && k.path) { const p = pathAt(k.path, g, k.s), c = P(p[0], p[1]); ctx.fillStyle = '#f5f5f4'; ctx.strokeStyle = '#78716c'; ctx.lineWidth = 1.2; rr(c[0] - 4.5, c[1] - 8, 9, 7, 2).fill(); ctx.stroke(); }
      else if (k.st === 1) { const p = pathAt(COND, g, k.s), c = P(p[0], p[1]); D.glow(c[0], c[1], 11, '#f97316', 0.8); ball(c[0], c[1], 4.2, '#f97316', false); }
    });
    ctx.restore();
    // 물체 이름
    const nm = (u, v, txt, col) => { const c = P(u, v); D.text(c[0], c[1], txt, { size: 12.5, weight: 800, color: col || '#f8fafc', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 }); };
    nm(0.14, 0.45, '화산'); nm(0.37, 0.43, '규산염 암석(산)'); nm(0.85, 0.52, '바다'); nm(0.47, 0.60, '대륙 지각');
    if (!PHONE) { nm(0.62, 0.89, '맨틀', '#fff7ed'); nm(0.62, 0.795, '해양판', '#e2e8f0'); } else { nm(0.66, 0.9, '맨틀', '#fff7ed'); }
    const c1 = P(0.14, 0.36); D.text(c1[0], c1[1] + 4, '(화산 활동)', { size: 11.5, weight: 700, color: '#fef3c7', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 });
    // 번호 표지
    drawLabel1(g, 0.14, 0.155, 1, '화산 방출', '#dc2626');
    drawLabel1(g, 0.355, 0.15, 2, '풍화', '#d97706');
    drawLabel1(g, 0.88, 0.62, 3, '퇴적', '#0891b2');
    drawLabel1(g, 0.5, 0.74, 4, '섭입', '#7c3aed');
    if (S.namesOn || (game && game.free)) { const q = P(0.78, 0.86); D.text(q[0], q[1], '석회암(CaCO₃) → 섭입 → 화산', { size: 12, weight: 800, color: '#fff7ed', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 }); }
    else { const q = P(0.78, 0.86); D.text(q[0], q[1], '흰 덩어리 = 탄산염(CaCO₃)', { size: 12, weight: 800, color: '#fff7ed', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 }); }
    D.text(g.x + g.w - 10, g.y + g.h - 8, '모식도예요 (크기·시간은 단순화)', { size: 11.5, weight: 700, color: '#fde68a', align: 'right', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 });

    // 오른쪽: 탄소 저장고 (로그 눈금)
    card(B, '📊 탄소 저장고 (GtC, 로그 눈금)');
    const items = [['대기', 880, '#64748b'], ['해양', 38000, '#2d7db3'], ['탄산염암', 6e7, '#a8a29e']];
    const LV0 = 1, LV1 = 8;
    if (!PHONE) {
      const bx0 = B.x + 42, by0 = B.y + 56, bh = 330, bw = 40, gap = 20;
      for (let k = LV0; k <= LV1; k++) { const y = by0 + bh - (bh * (k - LV0)) / (LV1 - LV0); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx0 - 4, y); ctx.lineTo(B.x + B.w - 10, y); ctx.stroke(); D.text(bx0 - 8, y + 4.5, SUP[k], { size: 12, weight: 700, color: '#64748b', align: 'right' }); }
      items.forEach((it, i) => {
        const hh = (bh * (Math.log10(it[1]) - LV0)) / (LV1 - LV0), x = bx0 + 4 + i * (bw + gap);
        ctx.fillStyle = it[2]; rr(x, by0 + bh - hh, bw, hh, 6).fill();
        D.text(x + bw / 2, by0 + bh - hh - 7, it[1] >= 1e6 ? '약 6천만' : it[1].toLocaleString('en-US').replace(/,/g, ' '), { size: 12.5, weight: 800, color: '#1e293b' });
        D.text(x + bw / 2, by0 + bh + 16 * FS, it[0], { size: 12.5, weight: 800, color: '#334155' });
      });
      D.text(B.x + B.w / 2, by0 + bh + 38 * FS, '눈금은 10에서 시작해요', { size: 11.5, weight: 700, color: '#64748b' });
      const ty = by0 + bh + 62 * FS;
      ['암석 속 탄소는 대기의 약 7만 배', '지표 탄소의 99.9 % 이상이 암석', '화산 방출 0.1 GtC/년'].forEach((l, i) => D.text(B.x + 14, ty + i * 19 * FS, l, { size: 12.5, weight: 800, color: i === 2 ? '#b91c1c' : '#334155', align: 'left' }));
      D.text(B.x + 14, ty + 3 * 19 * FS, '풍화·퇴적 ' + carbonRate().toFixed(2) + ' GtC/년', { size: 12.5, weight: 800, color: '#0e7490', align: 'left' });
    } else {
      const bx0 = B.x + 92, by0 = B.y + 50, bw = B.w - 120, bh = 26, gap = 12;
      items.forEach((it, i) => {
        const y = by0 + i * (bh + gap), ww = (bw * (Math.log10(it[1]) - LV0)) / (LV1 - LV0);
        ctx.fillStyle = '#eef2f7'; rr(bx0, y, bw, bh, 6).fill(); ctx.fillStyle = it[2]; rr(bx0, y, ww, bh, 6).fill();
        D.text(bx0 - 8, y + bh / 2 + 5, it[0], { size: 13, weight: 800, color: '#334155', align: 'right' });
        if (it[1] >= 1e6) D.text(bx0 + ww - 8, y + bh / 2 + 5, '약 6천만', { size: 12.5, weight: 800, color: '#fff', align: 'right', stroke: 'rgba(15,23,42,.35)', strokeWidth: 3 }); else D.text(bx0 + ww + 6, y + bh / 2 + 5, it[1].toLocaleString('en-US').replace(/,/g, ' '), { size: 12.5, weight: 800, color: '#1e293b', align: 'left' });
      });
      const ay = by0 + 3 * (bh + gap) - 4;
      for (let k = LV0; k <= LV1; k += 1) { const x = bx0 + (bw * (k - LV0)) / (LV1 - LV0); ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 5); ctx.stroke(); D.text(x, ay + 19, SUP[k], { size: 11.5, weight: 700, color: '#64748b' }); }
      let ty = ay + 36;
      ['눈금(로그)은 10에서 시작해요.', '암석 속 탄소는 대기의 약 7만 배, 지표 탄소의 99.9 % 이상이 암석이에요.', '화산 방출 0.1 GtC/년', '풍화·퇴적(CO₂ ' + S.co + ' %) ' + carbonRate().toFixed(2) + ' GtC/년'].forEach((l, i) => { ty = drawWrap(B.x + 14, ty, l, B.w - 28, 12, { weight: 800, align: 'left', color: i === 2 ? '#b91c1c' : i === 3 ? '#0e7490' : '#334155' }) + 17; });
    }
  }

  /* ======================================================
     장면 2: 탄소 되먹임 (CO2 → 기온 → 풍화 → CO2)
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 524 }, B: { x: 8, y: 540, w: 504, h: 212 } }
    : { A: { x: 12, y: 12, w: 548, h: 536 }, B: { x: 568, y: 12, w: 220, h: 536 } };
  const fbV = () => 0.1 * S.v;                       // 화산 방출 (GtC/년)
  const fbW = () => 0.1 * Math.pow(S.x, 0.6);        // 풍화 소비 (GtC/년): 기온이 5 ℃ 오르면 2배 (예시)
  const fbPPM = () => 280 * S.x;
  const fbT = () => 15 + 3 * Math.log2(S.x);         // CO2가 2배가 될 때마다 +3 ℃ (예시)
  const fbEq = () => { const p = fbRatio(); return p >= 98 && p <= 102; };
  const HIST = [[0, 280, 15]];
  const fR = (v, d) => Number(v).toFixed(d);
  function fbReset() { S.x = 1; S.tM = 0; S.acc = 0; HIST.length = 0; HIST.push([0, 280, 15]); }
  function fbStep(dt) {
    if (!S.play) return;
    let dM = dt * (S.fast ? 0.9 : 0.3);
    while (dM > 1e-9) {
      const h = Math.min(0.01, dM); dM -= h;
      S.x = Math.max(0.05, S.x + ((S.v - Math.pow(S.x, 0.6)) / 0.3) * h);
      S.tM += h; S.acc += h;
      if (S.acc >= 0.02) { S.acc -= 0.02; HIST.push([S.tM, fbPPM(), fbT()]); if (HIST.length > 2400) { for (let i = HIST.length - 2; i > 0; i -= 2) HIST.splice(i, 1); } }
    }
  }
  function drawFb(t, dt) {
    const { A, B } = RC2;
    fbStep(dt);
    card(A, '🔁 닫힌 고리: CO₂ → 기온 → 풍화 → CO₂ (예시 모형)');
    const LP = { x: A.x + 10, y: A.y + 34, w: A.w - 20, h: PHONE ? 270 : 262 };
    ctx.fillStyle = '#f1f5f9'; rr(LP.x, LP.y, LP.w, LP.h, 12).fill();
    const cx = LP.x + LP.w / 2, nw = PHONE ? 142 : 150, nh = 58;
    const N = [
      { k: 'co', x: cx, y: LP.y + 12 + nh / 2, t: '대기 CO₂', v: Math.round(fbPPM()) + ' ppm', c: '#475569' },
      { k: 'te', x: cx + LP.w * 0.27, y: LP.y + LP.h - 16 - nh / 2, t: '지구 기온', v: fR(fbT(), 1) + ' ℃', c: '#dc2626' },
      { k: 'we', x: cx - LP.w * 0.27, y: LP.y + LP.h - 16 - nh / 2, t: '풍화 속도', v: fR(fbW(), 3) + ' GtC/년', c: '#0e7490' },
    ];
    const edge = (a, b, ka, kb) => { // 노드 사각형 가장자리 사이의 선분
      const dx = b.x - a.x, dy = b.y - a.y;
      const clip = (n, sx, sy) => { const k = Math.min((nw / 2 + 4) / Math.abs(sx || 1e-9), (nh / 2 + 4) / Math.abs(sy || 1e-9)); return [n.x + sx * k, n.y + sy * k]; };
      return [clip(a, dx, dy), clip(b, -dx, -dy)];
    };
    const links = [[0, 1, '온실 효과', 0], [1, 2, '비·풍화 활발', 1], [2, 0, 'CO₂ 소비', 2]];
    const sign = ['+', '+', '−'], showSign = S.signsOn || (game && game.free);
    links.forEach((L, i) => {
      const a = N[L[0]], b = N[L[1]], e = edge(a, b), mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2;
      D.arrow(e[0][0], e[0][1], e[1][0], e[1][1], { color: i === 2 ? '#0e7490' : '#ea580c', width: 4, head: 13 });
      const ph = (t * 0.45 + i / 3) % 1; ctx.fillStyle = '#fff'; ctx.strokeStyle = i === 2 ? '#0e7490' : '#ea580c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e[0][0] + (e[1][0] - e[0][0]) * ph, e[0][1] + (e[1][1] - e[0][1]) * ph, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      const bx = mx, by = my;
      D.sphere(bx, by, 15, showSign ? (sign[i] === '+' ? '#f97316' : '#0891b2') : '#64748b', { gloss: true, text: showSign ? sign[i] : String(i + 1), textScale: 1.25 });
      D.text(bx + (i === 0 ? 22 : i === 2 ? -22 : 0), by + (i === 1 ? -22 : 5), L[2], { size: 12.5, weight: 800, color: '#334155', align: i === 0 ? 'left' : i === 2 ? 'right' : 'center', stroke: 'rgba(241,245,249,.9)', strokeWidth: 4 });
    });
    N.forEach((n) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(n.x - nw / 2, n.y - nh / 2, nw, nh, 14).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = n.c; ctx.lineWidth = 2.5; rr(n.x - nw / 2, n.y - nh / 2, nw, nh, 14).stroke();
      D.text(n.x, n.y - 8, n.t, { size: 13, weight: 800, color: '#475569' }); D.text(n.x, n.y + 17, n.v, { size: 16.5, weight: 800, color: n.c });
    });
    // 화산 방출 입력
    const vx = LP.x + 10, vy = N[0].y;
    D.arrow(vx + 44, vy, N[0].x - nw / 2 - 5, vy, { color: '#b91c1c', width: 3 + S.v, head: 12 });
    D.text(vx, vy - 20, '🌋 화산 방출', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' }); D.text(vx, vy + 22, '×' + fR(S.v, 1).replace('.0', '') + ' (' + fR(fbV(), 2) + ' GtC/년)', { size: 12, weight: 800, color: '#b91c1c', align: 'left' });
    // 고리의 종류
    const lx = cx, ly = LP.y + LP.h * 0.56;
    if (showSign) { D.label(lx, ly - 6, '음(−)의 되먹임', { bg: '#0e7490', size: 13, pad: 9 }); D.text(lx, ly + 20, '변화를 줄여 균형으로', { size: 12, weight: 700, color: '#475569' }); }
    else { D.text(lx, ly - 2, '부호(+/−)를', { size: 12, weight: 800, color: '#475569' }); D.text(lx, ly + 15, '알아내 봐요', { size: 12, weight: 800, color: '#475569' }); }

    // 시간 그래프
    const G = { x: A.x + 8, y: A.y + 34 + LP.h + 8, w: A.w - 16, h: A.h - 34 - LP.h - 14 };
    const xmax = Math.max(8, Math.ceil(S.tM / 4) * 4);
    const ax = axesBox(G, { x0: 0, x1: xmax, y0: 0, y1: 2000, xt: xmax <= 8 ? [0, 2, 4, 6, 8] : [0, xmax / 4, xmax / 2, (xmax * 3) / 4, xmax], yt: [0, 500, 1000, 1500, 2000], xf: (v) => String(Math.round(v)), pad: { l: 48, r: 40, t: 30, b: 34 } });
    const B2 = ax.B, TY = (v) => B2.y + B2.h - (B2.h * (v - 5)) / 25;
    D.text(B2.x + B2.w / 2, B2.y + B2.h + 29 * FS, '시간 (백만 년)', { size: 12, weight: 700, color: '#64748b' });
    D.text(G.x + 6, B2.y - 14, 'CO₂ (ppm)', { size: 11.5, weight: 800, color: '#1d4ed8', align: 'left' }); D.text(B2.x + B2.w + 34, B2.y - 14, '기온', { size: 11.5, weight: 800, color: '#dc2626', align: 'right' });
    [10, 20, 30].forEach((v) => D.text(B2.x + B2.w + 5, TY(v) + 4.5, v + '℃', { size: 12, weight: 700, color: '#dc2626', align: 'left' }));
    const eqppm = 280 * Math.pow(S.v, 1 / 0.6);
    D.dashedLine(B2.x, ax.Y(eqppm), B2.x + B2.w, ax.Y(eqppm), { color: 'rgba(29,78,216,.5)', width: 2 });
    D.text(B2.x + B2.w - 4, ax.Y(eqppm) - 5, '새 균형 CO₂ ' + Math.round(eqppm) + ' ppm', { size: 11.5, weight: 800, color: '#1d4ed8', align: 'right' });
    polyline(HIST.map((p) => [p[0], p[1]]), '#2563eb', 3, ax.X, ax.Y, B2);
    ctx.save(); ctx.beginPath(); ctx.rect(B2.x, B2.y, B2.w, B2.h); ctx.clip(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; ctx.setLineDash([2, 4]); ctx.beginPath(); HIST.forEach((p, i) => { const x = ax.X(p[0]), y = TY(p[2]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
    const hl = HIST[HIST.length - 1]; D.sphere(ax.X(hl[0]), ax.Y(hl[1]), 5.5, '#2563eb', { gloss: false });

    // 방출과 소비 (오른쪽)
    card(B, '⚖️ 방출 = 소비 ?');
    const eq = fbEq();
    const Vv = fbV(), Wv = fbW();
    if (!PHONE) {
      const x0 = B.x + 36, y0 = B.y + 64, bh = 290, bw = 54;
      for (let k = 0; k <= 3; k++) { const y = y0 + bh - (bh * k) / 3; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 - 4, y); ctx.lineTo(B.x + B.w - 10, y); ctx.stroke(); D.text(x0 - 7, y + 4.5, (k * 0.1).toFixed(1), { size: 12, weight: 700, color: '#64748b', align: 'right' }); }
      D.text(x0 - 7, y0 - 10, 'GtC/년', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
      [[Vv, '#ef4444', '화산 방출', x0 + 8], [Wv, '#14b8a6', '풍화 소비', x0 + 8 + bw + 22]].forEach((q) => {
        const hh = clamp((bh * q[0]) / 0.3, 0, bh); ctx.fillStyle = q[1]; rr(q[3], y0 + bh - hh, bw, hh, 6).fill();
        D.text(q[3] + bw / 2, y0 + bh - hh - 7, fR(q[0], 3), { size: 13, weight: 800, color: '#1e293b' }); D.text(q[3] + bw / 2, y0 + bh + 17 * FS, q[2], { size: 12.5, weight: 800, color: '#334155' });
      });
      D.label(B.x + B.w / 2, y0 + bh + 48 * FS, eq ? '균형이에요 (소비 ≈ 방출)' : Wv < Vv ? '소비 < 방출: CO₂ 증가' : '소비 > 방출: CO₂ 감소', { bg: eq ? '#15803d' : Wv < Vv ? '#c2410c' : '#0369a1', size: 12.5, pad: 8 });
      D.text(B.x + 14, y0 + bh + 82 * FS, '경과 ' + fR(S.tM, 1) + ' 백만 년', { size: 13, weight: 800, color: '#334155', align: 'left' });
      D.text(B.x + 14, y0 + bh + 104 * FS, '(1초 = ' + (S.fast ? '90' : '30') + '만 년)', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    } else {
      const x0 = B.x + 100, w = B.w - 230, y0 = B.y + 56;
      [[Vv, '#ef4444', '화산 방출'], [Wv, '#14b8a6', '풍화 소비']].forEach((q, i) => {
        const y = y0 + i * 44, ww = clamp((w * q[0]) / 0.3, 0, w);
        ctx.fillStyle = '#eef2f7'; rr(x0, y, w, 26, 6).fill(); ctx.fillStyle = q[1]; rr(x0, y, ww, 26, 6).fill();
        D.text(x0 - 8, y + 19, q[2], { size: 13, weight: 800, color: '#334155', align: 'right' }); D.text(x0 + w + 8, y + 19, fR(q[0], 3) + ' GtC/년', { size: 13, weight: 800, color: '#1e293b', align: 'left' });
      });
      D.label(B.x + B.w / 2, y0 + 118, eq ? '균형이에요 (소비 ≈ 방출)' : Wv < Vv ? '소비 < 방출: CO₂ 증가' : '소비 > 방출: CO₂ 감소', { bg: eq ? '#15803d' : Wv < Vv ? '#c2410c' : '#0369a1', size: 13, pad: 9 });
      D.text(B.x + 16, y0 + 160, '경과 ' + fR(S.tM, 1) + ' 백만 년 (1초 = ' + (S.fast ? '90' : '30') + '만 년)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    }
  }

  /* ======================================================
     장면 3: 얼음덩어리 지구 (얼음-알베도 되먹임, 복사 평형 온도, CO2 누적)
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 300 }, B1: { x: 8, y: 316, w: 504, h: 212 }, B2: { x: 8, y: 536, w: 504, h: 140 }, B3: { x: 8, y: 684, w: 504, h: 68 } }
    : { A: { x: 12, y: 12, w: 340, h: 536 }, B1: { x: 360, y: 12, w: 428, h: 214 }, B2: { x: 360, y: 234, w: 428, h: 196 }, B3: { x: 360, y: 438, w: 428, h: 110 } };
  const SOL = 1279, SIG = 5.67e-8;
  const iceF = (phi) => 1 - Math.sin((clamp(phi, 0, 90) * Math.PI) / 180);       // 얼음 덮인 면적 비율
  const albedoOf = (phi) => 0.30 + 0.30 * iceF(phi);
  const tempOf = (A) => Math.pow((SOL * (1 - A)) / (4 * SIG), 0.25);
  const tC = (K) => Math.round(K - 273.15);
  const co2z = () => 40000 * S.tz;                 // 결빙 중 쌓인 화산 CO2 (ppm 환산: 0.1 GtC/년 = 4만 ppm/백만 년)
  const sgnC = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const iceUI = { sync: null };
  function iceStep(dt) {
    S.idle += dt;
    const sync = () => { if (iceUI.sync) iceUI.sync(); };
    if (S.phase === 'normal') {
      if (S.ice < 30) S.phase = 'runaway';
      else if (S.idle > 0.8 && Math.abs(S.ice - 70) > 0.05) { S.ice = approach(S.ice, 70, dt, 1.8); sync(); }
    }
    if (S.phase === 'runaway') {
      S.ice -= 15 * dt; sync();
      if (S.ice <= 0.3) { S.ice = 0; S.phase = 'frozen'; S.tz = 0; S.frozenSeen = true; sync(); parts.burst(RC3.A.x + RC3.A.w / 2, RC3.A.y + 120, { count: 26, speed: 120, life: 1.0, size: 3, gravity: 20, colors: ['#ffffff', '#bae6fd', '#e0f2fe'], shape: 'star' }); }
    } else if (S.phase === 'frozen') {
      if (S.accel) { S.tz += 0.45 * dt; if (co2z() >= 100000) { S.tz = 2.5; S.phase = 'melting'; S.accel = false; } }
    } else if (S.phase === 'melting') {
      S.ice = approach(S.ice, 90, dt, 1.2); sync();
      if (S.ice >= 89.4) { S.ice = 90; S.phase = 'melted'; S.capShown = true; sync(); }
    }
  }
  function iceReset() { S.ice = 70; S.phase = 'normal'; S.idle = 9; S.tz = 0; S.accel = false; S.frozenSeen = false; S.capShown = false; if (iceUI.sync) iceUI.sync(); }
  function evidenceCard(x, y, w, h, kind, lit, label) {
    ctx.save(); ctx.globalAlpha = lit ? 1 : 0.42;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 10).fill(); }, { blur: 4, y: 1 });
    const ax = x + 8, ay = y + 8, aw = w - 16, ah = h - (PHONE ? 30 : 38);
    ctx.save(); rr(ax, ay, aw, ah, 6).clip();
    if (kind === 'till') {
      ctx.fillStyle = '#8b8076'; ctx.fillRect(ax, ay, aw, ah);
      const r = seeded(21); for (let i = 0; i < 16; i++) { const bx = ax + r() * aw, by = ay + r() * ah, bs = 3 + r() * 7; ctx.fillStyle = ['#57534e', '#a8a29e', '#44403c', '#d6d3d1'][i % 4]; poly([[bx, by - bs], [bx + bs, by - bs * 0.2], [bx + bs * 0.5, by + bs], [bx - bs * 0.8, by + bs * 0.6]]); ctx.fill(); }
    } else if (kind === 'cap') {
      ctx.fillStyle = '#6b625a'; ctx.fillRect(ax, ay + ah * 0.5, aw, ah * 0.5);
      const r = seeded(5); for (let i = 0; i < 8; i++) { ctx.fillStyle = '#44403c'; ctx.beginPath(); ctx.arc(ax + r() * aw, ay + ah * (0.6 + r() * 0.35), 2 + r() * 3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#f2e6d3'; ctx.fillRect(ax, ay, aw, ah * 0.5); ctx.strokeStyle = 'rgba(180,150,110,.6)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(ax, ay + (ah * 0.5 * k) / 4); ctx.lineTo(ax + aw, ay + (ah * 0.5 * k) / 4); ctx.stroke(); }
    } else {
      for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#d6d3d1' : '#b91c1c'; ctx.fillRect(ax, ay + (ah * k) / 8, aw, ah / 8 + 0.6); }
    }
    ctx.restore();
    ctx.strokeStyle = lit ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, y, w, h, 10).stroke();
    const ls = wrapLines(label, w - 10, PHONE ? 11 : 11.5, 800);
    ls.slice(0, 2).forEach((l, i) => D.text(x + w / 2, y + h - (ls.length > 1 ? 21 : 10) + i * 13 * FS - (PHONE ? 2 : 0), l, { size: PHONE ? 11 : 11.5, weight: 800, color: '#334155' }));
    if (lit) D.text(x + w - 8, y + 18, '✔', { size: 13, weight: 800, color: '#16a34a', align: 'right', stroke: '#fff', strokeWidth: 3 });
    ctx.restore();
  }
  function drawIce(t, dt) {
    const { A, B1, B2, B3 } = RC3;
    iceStep(dt);
    const free = !!(game && game.free);
    card(A, '🌍 얼음선이 내려오면?');
    const R = PHONE ? 84 : 118, cx = PHONE ? A.x + 142 : A.x + 190, cy = A.y + (PHONE ? 44 : 48) + R;
    const phi = S.ice, ph = (phi * Math.PI) / 180, sn = Math.sin(ph);
    const Aal = albedoOf(phi), Tk = tempOf(Aal), f = iceF(phi);
    // 지구
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const og = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R); og.addColorStop(0, '#5aa9e6'); og.addColorStop(1, '#1d5a96'); ctx.fillStyle = og; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.fillStyle = '#5faa55'; [[-0.35, -0.1, 0.42, 0.22, 0.4], [0.35, 0.18, 0.3, 0.2, -0.3], [-0.05, -0.55, 0.3, 0.12, 0], [0.5, -0.3, 0.2, 0.14, 0.5], [-0.55, 0.4, 0.22, 0.14, 0.3]].forEach((q) => { ctx.beginPath(); ctx.ellipse(cx + q[0] * R, cy + q[1] * R, q[2] * R, q[3] * R, q[4], 0, TAU); ctx.fill(); });
    const yTop = cy - R * sn, yBot = cy + R * sn;
    ctx.fillStyle = '#f4f9ff'; ctx.fillRect(cx - R, cy - R, 2 * R, yTop - (cy - R)); ctx.fillRect(cx - R, yBot, 2 * R, cy + R - yBot);
    ctx.strokeStyle = 'rgba(147,197,253,.9)'; ctx.lineWidth = 3; if (sn < 0.999) { ctx.beginPath(); ctx.moveTo(cx - R, yTop); ctx.lineTo(cx + R, yTop); ctx.moveTo(cx - R, yBot); ctx.lineTo(cx + R, yBot); ctx.stroke(); }
    if (sn < 0.12) { ctx.strokeStyle = 'rgba(147,197,253,.55)'; ctx.lineWidth = 1.5; const rc = seeded(9); for (let i = 0; i < 9; i++) { ctx.beginPath(); let px = cx + (rc() - 0.5) * 1.6 * R, py = cy + (rc() - 0.5) * 1.6 * R; ctx.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (rc() - 0.5) * 50; py += (rc() - 0.5) * 50; ctx.lineTo(px, py); } ctx.stroke(); } }
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    const sh = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.2, cx, cy, R); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(15,23,42,.38)'); ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // 위도 30° 한계선
    [-1, 1].forEach((sg) => { const y = cy + sg * R * 0.5; D.dashedLine(cx - R * 0.866 - 6, y, cx + R * 0.866 + 6, y, { color: '#dc2626', width: 2 }); });
    D.text(cx + R * 0.866 + 12, cy - R * 0.5 + 4.5, '30°', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
    // 얼음선 표지
    const ly = cy - R * sn, lb = D.label(cx - R - 10, ly, Math.round(phi) + '°', { bg: '#0ea5e9', size: 12.5, pad: 7, align: 'right' });
    D.arrow(cx - R - 8, ly, cx - R + 14, ly, { color: '#0ea5e9', width: 2.5, head: 8 });
    if (S.phase === 'runaway' || S.phase === 'frozen') D.label(cx, cy, S.phase === 'frozen' ? '전 지구 결빙!' : '되먹임 폭주!', { bg: S.phase === 'frozen' ? '#0369a1' : '#b91c1c', size: 14, pad: 11 });
    if (S.phase === 'melting') D.label(cx, cy, '얼음이 녹아요', { bg: '#c2410c', size: 14, pad: 11 });
    if (S.phase === 'melted' || free && S.phase === 'melted') D.label(cx, cy + R * 0.55, '캡 카보네이트 퇴적', { bg: '#a16207', size: 12.5, pad: 8 });
    // 정보
    const x0 = PHONE ? A.x + 262 : A.x + 16, y0 = PHONE ? A.y + 80 : cy + R + 32, lh = PHONE ? 24 : 21;
    const info = ['얼음선 위도 ' + Math.round(phi) + '°', '얼음 덮인 면적 ' + Math.round(f * 100) + ' % (1 − sin φ)', '알베도 A = ' + Aal.toFixed(2)];
    info.forEach((l, i) => D.text(x0, y0 + i * lh, l, { size: 13.5, weight: 800, color: i === 0 ? '#0369a1' : '#334155', align: 'left' }));
    const chain = ['얼음 증가', '반사율(알베도) 증가', '기온 하강'];
    const hot = S.phase === 'runaway';
    if (PHONE) {
      let px = A.x + 12; const py = A.y + A.h - 20;
      chain.forEach((c, i) => { const r = D.label(px, py, c, { bg: hot ? '#dc2626' : '#475569', size: 11.5, pad: 6, align: 'left' }); px = r.x + r.w + 6; if (i < 2) { D.text(px + 3, py + 5, '→', { size: 13, weight: 800, color: '#64748b' }); px += 20; } });
      D.text(A.x + A.w / 2, py - 24, '↺ 얼음이 더 늘어요: 양(+)의 되먹임', { size: 12, weight: 800, color: '#b91c1c' });
    } else {
      const cy2 = y0 + 3 * lh + 8;
      chain.forEach((c, i) => {
        const yy = cy2 + i * 31, px = x0;
        D.label(px, yy, c, { bg: hot ? '#dc2626' : '#475569', size: 12.5, pad: 8, align: 'left' });
        if (i < 2) D.text(px + 14, yy + 17, '↓', { size: 13, weight: 800, color: '#64748b' });
      });
      D.text(x0 + 130, cy2 + 36, '↺ 얼음이 더 늘어요', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
      D.text(x0 + 130, cy2 + 54, '양(+)의 되먹임', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
    }
    // 복사 평형 온도 (오른쪽 위)
    card(B1, '🌡️ 복사 평형 온도 (온실 효과를 뺀 값)');
    D.text(B1.x + B1.w / 2, B1.y + 54 * FS, 'T = [ S(1 − A) / (4σ) ]^(1/4)', { size: 16, weight: 800, color: '#1e293b' });
    D.text(B1.x + B1.w / 2, B1.y + 74 * FS, 'S = 1279 W/m² (당시 태양 복사, 현재의 약 94 %) · σ = 5.67×10⁻⁸', { size: PHONE ? 11.5 : 12, weight: 700, color: '#64748b' });
    const kx0 = B1.x + 34, kx1 = B1.x + B1.w - 34, ay = B1.y + (PHONE ? 150 : 140), KX = (T) => kx0 + ((T - 200) / 60) * (kx1 - kx0);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(kx0, ay); ctx.lineTo(kx1, ay); ctx.stroke();
    [200, 210, 220, 230, 240, 250, 260].forEach((T) => { ctx.beginPath(); ctx.moveTo(KX(T), ay - 4); ctx.lineTo(KX(T), ay + 4); ctx.stroke(); D.text(KX(T), ay + 18, T + (T === 260 ? ' K' : ''), { size: 12, weight: 700, color: '#64748b' }); });
    const TP = [[tempOf(0.30), '#16a34a', '현재 A=0.30', 251, -1], [tempOf(0.60), '#0284c7', '전 지구 결빙 A=0.60', 218, -1]];
    TP.forEach((q) => { D.sphere(KX(q[0]), ay, 7, q[1], { gloss: false }); D.text(KX(q[0]), ay - 30 * FS, Math.round(q[0]) + ' K (' + sgnC(tC(q[0])) + ' ℃)', { size: 12.5, weight: 800, color: q[1] }); D.text(KX(q[0]), ay - 14 * FS, q[2], { size: 11.5, weight: 700, color: q[1] }); });
    D.sphere(KX(Tk), ay, 9, '#f97316', { gloss: true }); D.ring(KX(Tk), ay, 13, t, { color: '#f97316' });
    D.label(PHONE ? B1.x + B1.w - 12 : KX(Tk), ay + 44 * FS, '지금 A=' + Aal.toFixed(2) + ' → ' + Math.round(Tk) + ' K (' + sgnC(tC(Tk)) + ' ℃)', { bg: '#ea580c', size: 12.5, pad: 8, align: PHONE ? 'right' : 'center' });
    // CO2 누적
    card(B2, '☁️ 결빙 중 화산 CO₂가 쌓여요');
    const GB = { x: B2.x, y: B2.y + (PHONE ? 22 : 26), w: B2.w, h: B2.h - (PHONE ? 22 : 26) };
    const gx = axesBox(GB, { x0: 0, x1: 3, y0: 0, y1: 120000, xt: [0, 1, 2, 3], yt: [0, 50000, 100000], xf: (v) => v + '', yf: (v) => (v === 0 ? '0' : v / 10000 + '만'), pad: { l: 44, r: 16, t: 12, b: PHONE ? 38 : 32 } });
    D.text(gx.B.x + gx.B.w / 2, gx.B.y + gx.B.h + (PHONE ? 36 : 28), '결빙 후 시간 (백만 년) · CO₂ (ppm)', { size: 11.5, weight: 700, color: '#64748b' });
    D.dashedLine(gx.B.x, gx.Y(100000), gx.B.x + gx.B.w, gx.Y(100000), { color: '#dc2626', width: 2 });
    D.text(gx.B.x + 6, gx.Y(100000) + (PHONE ? 14 : -5), '융해 임계 10만 ppm (약 0.1기압)', { size: 11.5, weight: 800, color: '#b91c1c', align: 'left' });
    if (S.phase === 'frozen' || S.phase === 'melting' || S.phase === 'melted') {
      polyline([[0, 0], [S.tz, co2z()]], '#ea580c', 3.5, gx.X, gx.Y, gx.B);
      D.sphere(gx.X(S.tz), gx.Y(Math.min(co2z(), 120000)), 5.5, '#ea580c', { gloss: false });
    } else D.text(gx.B.x + gx.B.w / 2, gx.B.y + gx.B.h / 2 + 18, '얼음선을 30° 아래로 밀면 CO₂가 쌓이기 시작해요', { size: 12.5, weight: 800, color: '#94a3b8' });
    if (S.showPred) { const px = gx.X(S.predict / 100); D.dashedLine(px, gx.B.y, px, gx.B.y + gx.B.h, { color: '#7c3aed', width: 2 }); D.text(px + 4, gx.B.y + 14, '내 예측 ' + S.predict + '만 년', { size: 11.5, weight: 800, color: '#6d28d9', align: px > gx.B.x + gx.B.w - 100 ? 'right' : 'left' }); }
    // 증거 카드
    const fr = S.phase === 'frozen' || S.phase === 'melting' || S.phase === 'melted', mt = S.phase === 'melted';
    card(B3, null, { bg: 'rgba(255,255,255,.7)' });
    const cw = (B3.w - 16 - 16) / 3;
    evidenceCard(B3.x + 8, B3.y + 6, cw, B3.h - 12, 'till', fr || free, '저위도에도 빙하 퇴적물');
    evidenceCard(B3.x + 8 + cw + 8, B3.y + 6, cw, B3.h - 12, 'cap', mt || free, '캡 카보네이트(융해 뒤)');
    evidenceCard(B3.x + 8 + 2 * (cw + 8), B3.y + 6, cw, B3.h - 12, 'bif', fr || free, '호상 철광층 재등장');
  }

  /* ======================================================
     장면 4: 물과 지형 (상류 V자곡 · 중류 곡류 · 하류 삼각주)
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 340 }, B: { x: 8, y: 356, w: 504, h: 200 }, C: { x: 8, y: 564, w: 504, h: 188 } }
    : { A: { x: 12, y: 12, w: 548, h: 536 }, B: { x: 568, y: 12, w: 220, h: 262 }, C: { x: 568, y: 282, w: 220, h: 266 } };
  const g4 = () => { const A = RC4.A; return { x: A.x + 10, y: A.y + 38, w: A.w - 20, h: A.h - 48 }; };
  const UC = 0.76, VS = 0.70;
  const rvH = () => 0.30 + 0.075 * S.sl;
  const vGround = (u) => (u <= UC ? VS - rvH() * Math.pow(1 - u / UC, 2) : VS + 0.22 * Math.pow((u - UC) / (1 - UC), 0.8));
  const vOutOf = () => Math.round((0.2 * (S.Q + S.sl)) * 10) / 10;   // 곡류 바깥쪽 유속 (m/s, 예시)
  const vInOf = () => Math.round(vOutOf() * 0.25 * 10) / 10;           // 안쪽 유속
  const meaTarget = () => clamp((vOutOf() - 0.6) / 1.4, 0.1, 1);
  const meaWidth = () => Math.round(S.mea * 500);                       // 굽이 폭 (m, 예시)
  const WAT = [], SED = [], ION4 = [], SHL4 = [];
  const NB = 50, DEP = new Array(NB).fill(0); let LIMEH = 0;
  function riverReset() { WAT.length = 0; SED.length = 0; ION4.length = 0; SHL4.length = 0; DEP.fill(0); LIMEH = 0; S.mea = meaTarget() * 0.55; S.sedN = 0; S.sAcc = 0; S.iAcc = 0; }
  function vLoc(u, g) {
    const du = 0.01, dv = vGround(Math.min(u + du, UC)) - vGround(Math.max(u - du, 0)), sl = Math.max(0, (dv / (Math.min(u + du, UC) - Math.max(u - du, 0) || 1)) * (g.h / g.w));
    return (22 + 14 * S.Q) * (0.3 + 1.1 * Math.sqrt(clamp(sl, 0, 1.6)));
  }
  function riverStep(dt) {
    const g = g4();
    S.mea = approach(S.mea, meaTarget(), dt, 0.35);
    // 물 입자
    const nW = 50 + 10 * S.Q;
    while (WAT.length < nW) WAT.push({ u: Math.random() * UC, o: rr2(-1, 1) });
    for (let i = WAT.length - 1; i >= 0; i--) { const w = WAT[i]; if (i >= nW) { WAT.splice(i, 1); continue; } w.u += (vLoc(w.u, g) / g.w) * dt; if (w.u > UC + 0.01) { w.u = rr2(0, 0.05); } }
    // 침식된 퇴적물
    S.sAcc += 0.35 * S.sl * S.Q * dt;
    while (S.sAcc >= 1) { S.sAcc -= 1; if (SED.length < 130) SED.push({ u: rr2(0.04, 0.26), z: rr2(2, 8) }); }
    if (S.sAcc > 3) S.sAcc = 0;
    for (let i = SED.length - 1; i >= 0; i--) {
      const q = SED[i], uu = Math.min(q.u, UC), v = q.u > UC ? 24 : vLoc(uu, g) * 0.9;
      q.u += (v / g.w) * dt;
      const thr = 40 + 6 * S.Q, vl = q.u > UC ? 20 : vLoc(Math.min(q.u, UC), g);
      const pset = q.u > UC ? 1.6 : vl < thr ? 1.6 * (1 - vl / thr) : 0;
      if (q.u >= 0.985 || Math.random() < pset * dt) { const b = clamp(Math.floor(q.u * NB), 0, NB - 1); const cap = b / NB > UC ? 62 : 26; DEP[b] = Math.min(cap, DEP[b] + 0.7); S.sedN++; SED.splice(i, 1); }
    }
    // 녹아 있는 이온 → 바다 → 석회암 재료
    S.iAcc += 1.4 * dt; while (S.iAcc >= 1) { S.iAcc -= 1; if (ION4.length < 40) ION4.push({ u: rr2(0.08, 0.3) }); }
    for (let i = ION4.length - 1; i >= 0; i--) { const q = ION4[i]; q.u += (vLoc(Math.min(q.u, UC), g) / g.w) * dt; if (q.u >= UC) { SHL4.push({ x: g.x + g.w * rr2(0.8, 0.97), y: g.y + g.h * VS + 4 }); ION4.splice(i, 1); } }
    for (let i = SHL4.length - 1; i >= 0; i--) { const s = SHL4[i]; s.y += 34 * dt; const u = (s.x - g.x) / g.w, fy = g.y + g.h * vGround(u) - DEP[clamp(Math.floor(u * NB), 0, NB - 1)] - LIMEH * 0.4; if (s.y >= fy) { LIMEH = Math.min(18, LIMEH + 0.5); SHL4.splice(i, 1); } }
  }
  function meanderPts(gb, amp, lam, n) {
    const pts = [], yc = gb.y + gb.h / 2;
    for (let i = 0; i <= n; i++) { const x = gb.x + (gb.w * i) / n; pts.push([x, yc + amp * Math.sin((TAU * (x - gb.x)) / lam)]); }
    return pts;
  }
  function drawRiver(t, dt) {
    const { A, B, C } = RC4, g = g4();
    riverStep(dt);
    card(A, '🏞️ 강의 흐름: 침식 · 운반 · 퇴적 (단면)');
    const P = (u, v) => PU(g, u, v), vo = vOutOf(), vi = vInOf();
    ctx.save(); rr(g.x, g.y, g.w, g.h, 12).clip();
    const sk = ctx.createLinearGradient(0, g.y, 0, g.y + g.h * VS); sk.addColorStop(0, '#d6ecfb'); sk.addColorStop(1, '#f2f9ff'); ctx.fillStyle = sk; ctx.fillRect(g.x, g.y, g.w, g.h);
    // 구역 띠
    [[0, 0.28, '상류'], [0.28, 0.58, '중류'], [0.58, 1.0, '하류']].forEach((z, i) => { ctx.fillStyle = i % 2 ? 'rgba(14,165,233,.05)' : 'rgba(14,165,233,.11)'; ctx.fillRect(g.x + g.w * z[0], g.y, g.w * (z[1] - z[0]), g.h); });
    // 바다
    const seaTop = g.y + g.h * VS;
    ctx.beginPath(); ctx.moveTo(P(UC, VS)[0], seaTop); ctx.lineTo(g.x + g.w, seaTop); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.lineTo(P(UC, VS)[0], g.y + g.h); ctx.closePath();
    const sg = ctx.createLinearGradient(0, seaTop, 0, g.y + g.h); sg.addColorStop(0, '#6cc3ee'); sg.addColorStop(1, '#2d7db3'); ctx.fillStyle = sg; ctx.fill();
    // 땅(암석)
    ctx.beginPath(); ctx.moveTo(g.x, g.y + g.h);
    for (let i = 0; i <= 100; i++) { const u = i / 100, c = P(u, vGround(u)); ctx.lineTo(c[0], c[1]); }
    ctx.lineTo(g.x + g.w, g.y + g.h); ctx.closePath();
    const gg = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); gg.addColorStop(0, '#9b9082'); gg.addColorStop(1, '#6a6256'); ctx.fillStyle = gg; ctx.fill();
    // 퇴적물(밝은 갈색): 위에 쌓여요
    ctx.fillStyle = '#d8b98a';
    for (let b = 0; b < NB; b++) { const u0 = b / NB, u1 = (b + 1) / NB; if (DEP[b] < 0.3) continue; const a = P(u0, vGround(u0)), c = P(u1, vGround(u1)); ctx.beginPath(); ctx.moveTo(a[0], a[1] + 1); ctx.lineTo(a[0], a[1] - DEP[b]); ctx.lineTo(c[0] + 0.6, c[1] - DEP[b]); ctx.lineTo(c[0] + 0.6, c[1] + 1); ctx.closePath(); ctx.fill(); }
    // 바다 바닥 석회암 재료
    if (LIMEH > 0.2) { const a = P(0.8, vGround(0.8)), c = P(1, vGround(1)); ctx.fillStyle = '#f1efe9'; ctx.beginPath(); ctx.moveTo(a[0], a[1] - DEP[clamp(Math.floor(0.8 * NB), 0, NB - 1)]); ctx.lineTo(c[0], c[1] - DEP[NB - 1]); ctx.lineTo(c[0], c[1] - DEP[NB - 1] - LIMEH * 0.4); ctx.lineTo(a[0], a[1] - DEP[clamp(Math.floor(0.8 * NB), 0, NB - 1)] - LIMEH * 0.4); ctx.closePath(); ctx.fill(); }
    // 강물 띠
    ctx.beginPath(); for (let i = 0; i <= 80; i++) { const u = (UC * i) / 80, c = P(u, vGround(u)); const yy = c[1] - 1 - DEP[clamp(Math.floor(u * NB), 0, NB - 1)]; i ? ctx.lineTo(c[0], yy) : ctx.moveTo(c[0], yy); }
    ctx.strokeStyle = '#38a3dc'; ctx.lineWidth = 3 + S.Q; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    WAT.forEach((w) => { const c = P(w.u, vGround(w.u)); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(c[0], c[1] - 2 - DEP[clamp(Math.floor(w.u * NB), 0, NB - 1)] + w.o * (1 + S.Q * 0.35), 1.8, 0, TAU); ctx.fill(); });
    SED.forEach((q) => { const u = Math.min(q.u, 1), c = P(u, vGround(u)); const yy = q.u > UC ? seaTop + 10 + (q.u - UC) * 70 : c[1] - 6 - q.z * 0.5 - DEP[clamp(Math.floor(u * NB), 0, NB - 1)]; ball(c[0], yy, 3, '#a16207', false); });
    ION4.forEach((q) => { const c = P(q.u, vGround(q.u)); ball(c[0], c[1] - 9 - DEP[clamp(Math.floor(q.u * NB), 0, NB - 1)], 3, '#22d3ee', false); });
    SHL4.forEach((s) => { ctx.fillStyle = '#fffbeb'; ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 3.4, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 30; i++) { const c = P(UC + (1 - UC) * i / 30, VS); i ? ctx.lineTo(c[0], c[1] + Math.sin(t * 1.5 + i * 0.6) * 1.5) : ctx.moveTo(c[0], c[1]); } ctx.stroke();
    // 구역 이름
    [[0.14, '상류'], [0.43, '중류'], [0.79, '하류']].forEach((z) => D.text(g.x + g.w * z[0], g.y + 18 * FS, z[1], { size: 13.5, weight: 800, color: '#075985' }));
    ctx.restore();
    // 작은 단면 그림 두 개
    const iw = PHONE ? 110 : 118, ih = PHONE ? 64 : 70, ix = g.x + g.w * 0.31, iy = g.y + 32 * FS + (PHONE ? 4 : 10);
    const inset = (x, y, title, fn) => { D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(x, y, iw, ih + 22, 8).fill(); }, { blur: 4, y: 1 }); ctx.save(); rr(x + 4, y + 4, iw - 8, ih - 8, 5).clip(); fn(x + 4, y + 4, iw - 8, ih - 8); ctx.restore(); D.text(x + iw / 2, y + ih + 13, title, { size: 11.5, weight: 800, color: '#334155' }); };
    inset(ix, iy, '상류 단면: V자곡', (x, y, w, h) => {
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#8b8076'; poly([[x, y + h * 0.15], [x + w * 0.42, y + h], [x + w * 0.58, y + h], [x + w, y + h * 0.15], [x + w, y + h], [x, y + h]]); ctx.fill();
      ctx.fillStyle = '#38a3dc'; ctx.fillRect(x + w * 0.43, y + h * 0.88, w * 0.14, h * 0.12); D.arrow(x + w * 0.5, y + h * 0.28, x + w * 0.5, y + h * 0.78, { color: '#dc2626', width: 3, head: 9 });
    });
    inset(ix + iw + 10, iy, '하류: 삼각주 (퇴적)', (x, y, w, h) => {
      ctx.fillStyle = '#6cc3ee'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#d8b98a'; poly([[x, y + h * 0.3], [x + w * 0.45, y + h * 0.3], [x + w * 0.95, y + h * 0.9], [x + w * 0.1, y + h * 0.9]]); ctx.fill();
      ctx.fillStyle = '#86efac'; ctx.fillRect(x, y, w * 0.45, h * 0.3); ctx.strokeStyle = '#38a3dc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + 2); ctx.lineTo(x + w * 0.3, y + h * 0.3); ctx.stroke();
    });
    D.text(g.x + g.w - 8, g.y + g.h - 8, '→ 바다에서 석회암 재료로', { size: 12, weight: 800, color: '#f0f9ff', align: 'right', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    ball(g.x + 16, g.y + g.h - 13, 3, '#a16207', false); D.text(g.x + 26, g.y + g.h - 8, '흙·모래', { size: 12, weight: 800, color: '#fff7ed', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    ball(g.x + 92, g.y + g.h - 13, 3, '#22d3ee', false); D.text(g.x + 102, g.y + g.h - 8, '녹은 이온(Ca²⁺)', { size: 12, weight: 800, color: '#fff7ed', align: 'left', stroke: 'rgba(15,23,42,.5)', strokeWidth: 3 });
    // 중류 곡류 (평면)
    card(B, '🔍 중류의 곡류 (위에서 본 모습)');
    const gb = { x: B.x + 8, y: B.y + 34, w: B.w - 16, h: B.h - 42 };
    ctx.save(); rr(gb.x, gb.y, gb.w, gb.h, 10).clip();
    ctx.fillStyle = '#d7e8bd'; ctx.fillRect(gb.x, gb.y, gb.w, gb.h);
    const lam = gb.w / (PHONE ? 2.5 : 1.5), amp = S.mea * gb.h * 0.3, wch = 7 + 2.4 * S.Q;
    const pts = meanderPts(gb, amp, lam, 70);
    // 범람원 색 띠
    ctx.strokeStyle = 'rgba(217,199,150,.9)'; ctx.lineWidth = wch + 16; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = '#38a3dc'; ctx.lineWidth = wch; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 흐름 점
    for (let k = 0; k < 9; k++) { const f = (t * 0.1 * (0.6 + 0.2 * vo) + k / 9) % 1, i = Math.floor(f * 70), p = pts[i]; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, TAU); ctx.fill(); }
    // 각 굽이의 바깥쪽 침식(빨강)과 안쪽 퇴적(모래)
    const nBend = Math.floor((gb.w / lam) * 2);
    for (let k = 0; k < nBend; k++) {
      const x = gb.x + lam * (0.25 + 0.5 * k), yc = gb.y + gb.h / 2 + amp * Math.sin((TAU * (x - gb.x)) / lam), up = Math.sin((TAU * (x - gb.x)) / lam) < 0; // up: 위쪽이 바깥
      const outY = yc + (up ? -1 : 1) * (wch / 2), inY = yc + (up ? 1 : -1) * (wch / 2);
      if (x > gb.x + 14 && x < gb.x + gb.w - 14) {
        ctx.fillStyle = '#e9c98f'; ctx.beginPath(); ctx.ellipse(x, inY + (up ? 1 : -1) * 3.5, 15 + 0.5 * amp * 0.12, 5, 0, 0, TAU); ctx.fill();
        D.arrow(x, outY, x, outY + (up ? -1 : 1) * (10 + 6 * vo), { color: '#dc2626', width: 2.6, head: 7 });
      }
    }
    // 유속 화살표(첫 번째 굽이의 바깥/안쪽)
    const xa = gb.x + lam * (PHONE ? 0.75 : 0.75), ya = gb.y + gb.h / 2 + amp * Math.sin((TAU * (xa - gb.x)) / lam), upA = Math.sin((TAU * (xa - gb.x)) / lam) < 0;
    const oy = ya + (upA ? -1 : 1) * (wch / 2 + 15), iy2 = ya + (upA ? 1 : -1) * (wch / 2 + 15);
    D.arrow(xa - 6, oy, xa - 6 + vo * 30, oy, { color: '#dc2626', width: 3, head: 9 });
    D.arrow(xa - 6, iy2, xa - 6 + vi * 30, iy2, { color: '#0369a1', width: 3, head: 9 });
    D.dashedLine(xa, ya - 40, xa, ya + 40, { color: '#334155', width: 1.5, dash: [4, 3] });
    D.text(xa + 8, ya + (upA ? -34 : 44), 'A', { size: 12.5, weight: 800, color: '#1e293b', align: 'left' }); D.text(xa + 8, ya + (upA ? 44 : -34), 'A′', { size: 12.5, weight: 800, color: '#1e293b', align: 'left' });
    ctx.restore();
    D.text(gb.x + 8, gb.y + gb.h - 8, '바깥 ' + fix(vo, 1) + ' m/s · 안쪽 ' + fix(vi, 1) + ' m/s', { size: 12, weight: 800, color: '#334155', align: 'left', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 단면
    card(C, '✂️ 단면 A–A′ (굽이의 꼭대기)');
    const gc = { x: C.x + 8, y: C.y + 34, w: C.w - 16, h: C.h - 42 }, y0 = gc.y + gc.h * 0.3, xL = gc.x + gc.w * 0.12, xR = gc.x + gc.w * 0.88;
    ctx.save(); rr(gc.x, gc.y, gc.w, gc.h, 10).clip();
    ctx.fillStyle = '#e8f3fb'; ctx.fillRect(gc.x, gc.y, gc.w, gc.h);
    const depth = gc.h * (0.34 + 0.05 * S.Q), yw = y0 + 12 - 2.2 * S.Q;
    // 땅
    ctx.fillStyle = '#b8a584'; ctx.beginPath(); ctx.moveTo(gc.x, y0); ctx.lineTo(xL, y0); ctx.lineTo(xL + 4, y0 + depth); ctx.quadraticCurveTo(gc.x + gc.w * 0.45, y0 + depth + 4, gc.x + gc.w * 0.72, y0 + depth * 0.45); ctx.lineTo(xR, y0 + 4); ctx.lineTo(gc.x + gc.w, y0); ctx.lineTo(gc.x + gc.w, gc.y + gc.h); ctx.lineTo(gc.x, gc.y + gc.h); ctx.closePath(); ctx.fill();
    // 물
    ctx.fillStyle = 'rgba(56,163,220,.85)'; ctx.beginPath(); ctx.moveTo(xL + 1, yw); ctx.lineTo(xL + 4, y0 + depth); ctx.quadraticCurveTo(gc.x + gc.w * 0.45, y0 + depth + 4, gc.x + gc.w * 0.72, y0 + depth * 0.45); ctx.lineTo(xR, y0 + 4 > yw ? y0 + 4 : yw); ctx.lineTo(xR, yw); ctx.closePath(); ctx.fill();
    // 안쪽 모래톱(퇴적)
    ctx.fillStyle = '#e9c98f'; ctx.beginPath(); ctx.moveTo(gc.x + gc.w * 0.72, y0 + depth * 0.45); ctx.quadraticCurveTo(gc.x + gc.w * 0.8, y0 + depth * 0.3, xR, y0 + 4); ctx.lineTo(gc.x + gc.w * 0.72, y0 + depth * 0.45); ctx.fill();
    ctx.restore();
    // 물이 화면 안쪽으로 흘러요: 원 크기 = 유속
    const rO = 5 + 9 * vo / 2, rI = 5 + 9 * vi / 2, oxx = gc.x + gc.w * 0.26, oyy = y0 + depth * 0.5, ixx = gc.x + gc.w * 0.74, iyy = yw + 14;
    [[oxx, oyy, rO, '#dc2626', fix(vo, 1)], [ixx, iyy, rI, '#0369a1', fix(vi, 1)]].forEach((q) => { ctx.strokeStyle = q[3]; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(q[0] - q[2] * 0.55, q[1] - q[2] * 0.55); ctx.lineTo(q[0] + q[2] * 0.55, q[1] + q[2] * 0.55); ctx.moveTo(q[0] + q[2] * 0.55, q[1] - q[2] * 0.55); ctx.lineTo(q[0] - q[2] * 0.55, q[1] + q[2] * 0.55); ctx.stroke(); D.text(q[0], q[1] + q[2] + 15, q[4] + ' m/s', { size: 12.5, weight: 800, color: q[3], stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); });
    D.arrow(xL + 14, oyy - 10, xL - 4, oyy - 10, { color: '#dc2626', width: 3, head: 8 });
    D.text(gc.x + 6, y0 - 8, 'A 바깥쪽: 침식', { size: 12, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(gc.x + gc.w - 6, y0 - 8, 'A′ 안쪽: 퇴적', { size: 12, weight: 800, color: '#a16207', align: 'right' });
    for (let k = 0; k < 4; k++) { const f = (t * 0.5 + k / 4) % 1; ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(gc.x + gc.w * (0.68 + 0.08 * k / 4 + 0.03 * Math.sin(k)), yw + 6 + f * (y0 + depth * 0.4 - yw - 4), 2.4, 0, TAU); ctx.fill(); }
    D.text(gc.x + gc.w / 2, gc.y + gc.h - 24, '⊗ 물은 화면 안쪽으로 흘러요', { size: 11.5, weight: 700, color: '#475569' });
    D.text(gc.x + gc.w / 2, gc.y + gc.h - 8, '원이 클수록 빠른 흐름', { size: 11.5, weight: 700, color: '#475569' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { cyc: '🪨 탄소의 순환', fb: '🌡️ 탄소 되먹임', ice: '🧊 얼음덩어리 지구', river: '🏞️ 물과 지형' };
  const FREE_KEYS = { cyc: ['sCO'], fb: ['sV', 'fbBtns'], ice: ['sIce', 'iceBtns'], river: ['sQ', 'sSl'] };
  let ctlKeys = [];
  const OPTS_LBL = [{ id: 'volc', label: '화산 방출' }, { id: 'weath', label: '풍화' }, { id: 'dep', label: '퇴적' }, { id: 'sub', label: '섭입' }];
  const selLbl = makeSelects($('#selLbl'), [
    { id: 'n1', label: '① 화산 꼭대기' }, { id: 'n2', label: '② 산비탈 (비가 내리는 곳)' }, { id: 'n3', label: '③ 바다 밑바닥' }, { id: 'n4', label: '④ 판이 가라앉는 곳' },
  ], OPTS_LBL, { n1: 'volc', n2: 'weath', n3: 'dep', n4: 'sub' }, () => { });
  const OPTS_SG = [{ id: 'p', label: '+ 같은 방향' }, { id: 'm', label: '− 반대 방향' }];
  const selSign = makeSelects($('#selSign'), [
    { id: 'c1', label: '① CO₂가 늘면 기온은?' }, { id: 'c2', label: '② 기온이 오르면 풍화 속도는?' }, { id: 'c3', label: '③ 풍화가 빨라지면 대기 CO₂는?' },
    { id: 'c4', label: '고리 전체의 종류', options: [{ id: 'neg', label: '음의 되먹임 (변화를 줄임)' }, { id: 'pos', label: '양의 되먹임 (변화를 키움)' }] },
  ], OPTS_SG, { c1: 'p', c2: 'p', c3: 'm', c4: 'neg' }, () => { });
  const pairRiver = makePair($('#pairRiver'), [
    { id: 'down', label: '하방 침식 (상류)' }, { id: 'side', label: '측방 침식 (곡류 바깥쪽)' }, { id: 'bar', label: '퇴적 (곡류 안쪽)' }, { id: 'delta', label: '퇴적 (하구)' }, { id: 'flood', label: '넘친 물의 퇴적 (중류)' },
  ], [
    { id: 'rDelta', label: '삼각주' }, { id: 'rBar', label: '점 모래톱' }, { id: 'rV', label: 'V자곡' }, { id: 'rFlood', label: '범람원' }, { id: 'rCliff', label: '깎아지른 둑' },
  ], { down: 'rV', side: 'rCliff', bar: 'rBar', delta: 'rDelta', flood: 'rFlood' }, () => { });
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
  const fSp = (v) => '×' + (+v).toFixed(1).replace('.0', '');
  SciSim.bindRange($('#sCO'), $('#oCO'), (v) => v + ' %', (v) => { S.co = +v; });
  SciSim.bindRange($('#sV'), $('#oV'), fSp, (v) => { S.v = +v; });
  SciSim.bindRange($('#sTe'), $('#oTe'), (v) => v + '만 년', (v) => { S.predict = +v; });
  SciSim.bindRange($('#sQ'), $('#oQ'), (v) => v + '단계', (v) => { S.Q = +v; });
  SciSim.bindRange($('#sSl'), $('#oSl'), (v) => v + '단계', (v) => { S.sl = +v; });
  const fIce = (v) => Math.round(v) + '°';
  const sIceEl = $('#sIce');
  SciSim.bindRange(sIceEl, $('#oIce'), fIce, (v) => {
    if (S.phase !== 'normal') { setSlider(sIceEl, $('#oIce'), S.ice, fIce); return; }
    S.ice = +v; S.idle = 0;
  });
  iceUI.sync = () => setSlider(sIceEl, $('#oIce'), S.ice, fIce);
  function setCO(v) { S.co = v; setSlider($('#sCO'), $('#oCO'), v, (x) => x + ' %'); }
  function setV(v) { S.v = v; setSlider($('#sV'), $('#oV'), v, fSp); }
  function setTe(v) { S.predict = v; setSlider($('#sTe'), $('#oTe'), v, (x) => x + '만 년'); }
  function setQ(v) { S.Q = v; setSlider($('#sQ'), $('#oQ'), v, (x) => x + '단계'); }
  function setSl(v) { S.sl = v; setSlider($('#sSl'), $('#oSl'), v, (x) => x + '단계'); }
  function syncPlay() { $('#bPlay').textContent = S.play ? '⏸ 멈춤' : '▶ 계속'; $('#bFast').textContent = '⏩ 빠르게: ' + (S.fast ? '켜짐' : '꺼짐'); $('#bFast').classList.toggle('on', S.fast); }
  function syncAcc() { const b = $('#bAcc'), tx = S.accel ? '⏸ CO₂ 쌓기 멈춤' : '⏩ 결빙 중 CO₂ 쌓이기 보기'; if (b.textContent !== tx) b.textContent = tx; b.classList.toggle('on', S.accel); }
  $('#bPlay').addEventListener('click', () => { Sound.click(); S.play = !S.play; syncPlay(); });
  $('#bFast').addEventListener('click', () => { Sound.click(); S.fast = !S.fast; syncPlay(); });
  $('#bFbReset').addEventListener('click', () => { Sound.click(); fbReset(); S.play = true; syncPlay(); });
  $('#bAcc').addEventListener('click', () => { Sound.click(); if (S.phase === 'frozen') { S.accel = !S.accel; syncAcc(); } else say(S.phase === 'normal' || S.phase === 'runaway' ? '먼저 얼음선을 30° 아래로 밀어 전 지구를 얼려요' : '이미 녹았어요. “처음으로”를 눌러 다시 해 봐요', true); });
  $('#bIceReset').addEventListener('click', () => { Sound.click(); iceReset(); syncAcc(); });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    VCO.length = 0; RAIN.length = 0; IONS.length = 0; SHELLS.length = 0; PKS.length = 0;
    if (li === 0) { S.lime = [0]; S.limeN = 0; }
    S.namesOn = false; selLbl.reset(); setCO(100);
    setV(1); fbReset(); S.play = true; S.fast = false; syncPlay(); S.signsOn = false; selSign.reset();
    iceReset(); S.showPred = false; setTe(100); syncAcc();
    setQ(2); setSl(4); riverReset(); pairRiver.reset();
    if (li === 0) { setMode('cyc'); setCtl(['sCO']); showHint('CO₂ 양 슬라이더를 움직여 풍화와 석회암 퇴적이 어떻게 달라지는지 봐요', 5200); }
    else if (li === 1) { setMode('fb'); setCtl(['sV', 'fbBtns']); showHint('화산 방출 슬라이더를 올리면 CO₂와 기온이 어떻게 변하는지 봐요', 5200); }
    else if (li === 2) { setMode('ice'); setCtl(['sIce', 'iceBtns']); showHint('얼음선 슬라이더를 아래로 밀어 봐요 (30°가 갈림길이에요)', 5200); }
    else { setMode('river'); setCtl(['sQ', 'sSl']); showHint('유량과 경사를 바꿔 강의 변화를 살펴봐요', 5200); }
    updateCtl();
  }
  const fbRatio = () => Math.floor((fbW() / fbV()) * 100 + 1e-9);
  const iceName = () => ({ normal: '정상', runaway: '폭주 중', frozen: '전 지구 결빙', melting: '녹는 중', melted: '녹음' }[S.phase]);
  const levels = [
    {
      title: '석회암 퇴적: 탄소가 돌 속에 갇혀요', short: '석회암 퇴적', icon: '🪨', phase: '모형', features: ['cyc'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구는 한때 꽁꽁 얼어붙었는데도 어떻게 다시 녹았고, 금성처럼 타오르지도 않고 수십억 년 동안 온화함을 유지했을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학과 앞 차시에서</b> 탄소가 대기·바다·생물·암석 사이를 돈다는 것(탄소 순환)과, 남세균이 대기를 바꾼 일을 배웠어요. 이번 차시는 탄소와 물이 <b>지권·수권·기권</b>을 오가며 지구를 바꾼 과정을 따라가요.</div>' +
        '<p>지표의 탄소는 대부분 <b>석회암 같은 탄산염암</b>에 들어 있어요. 화산이 내보낸 CO₂는 빗물에 녹아 약한 산이 되어 <b>규산염 암석을 풍화</b>시켜요(CaSiO₃ + CO₂ → CaCO₃ + SiO₂). 강물이 실어 나른 Ca²⁺ 이온으로 바다 생물이 껍데기를 만들고, 그 껍데기가 쌓여 <b>석회암</b>이 돼요. 섭입으로 끌려 내려간 탄산염은 화산이 다시 돌려줘요. 대기 CO₂ 양을 바꾸며 살펴봐요. (수치는 예시예요.)</p>',
      setup() { resetStep(0); },
      recap: '화산이 내보낸 CO₂는 풍화와 석회암 퇴적으로 암석에 갇히고, 섭입과 화산으로 되돌아오는 순환을 해요. 지표 탄소의 대부분은 암석에 있어요.',
      summary: '<ul><li><b>탄소 저장고</b>(예시): 대기 약 880 GtC, 해양 약 38 000 GtC, <b>탄산염암(석회암 등) 약 6천만 GtC</b> → 지표 탄소의 99.9 % 이상이 암석에 있어요.</li><li><b>탄소 순환</b>: 화산이 CO₂ 방출(현재 약 0.1 GtC/년) → 빗물에 녹아 약한 산 → 규산염 암석 풍화(CaSiO₃ + CO₂ → CaCO₃ + SiO₂) → 강물이 Ca²⁺·HCO₃⁻ 운반 → 바다에서 생물 껍데기·침전으로 <b>석회암 퇴적</b> → 섭입·변성·화산으로 CO₂ 복귀.</li><li>CO₂가 많을수록 빗물이 더 산성이라 풍화가 빨라지고 석회암 퇴적도 늘어요(예시 모형).</li><li>시간 척도는 수만~수백만 년이에요. 지구시스템 연계: 기권의 CO₂가 지권의 암석과 수권의 바다를 거쳐 되돌아와요.</li></ul>',
      missions: [
        {
          title: '순환 경로의 이름 붙이기', manual: true,
          goal: '그림의 번호 ①~④가 가리키는 <b>과정의 이름</b>을 골라요.',
          hint: '화산에서 CO₂가 나와요(①). 비가 산의 암석을 녹여요(②). 바다 밑에 껍데기가 쌓여요(③). 판이 가라앉으며 탄산염을 데려가요(④).',
          setup() { S.namesOn = false; selLbl.reset(); setMode('cyc'); setCtl(['sCO', 'selLbl']); },
          status: () => mark(selLbl.ok()) + ' 이름을 붙인 곳 ' + selLbl.count() + ' / 4',
          check() {
            if (!selLbl.complete()) return '①~④를 모두 골라 주세요. (지금 ' + selLbl.count() + '개)';
            if (!selLbl.ok()) { selLbl.mark(selLbl.wrong()); return '다시 확인해 봐요. 빨간 줄이 달라요. 그림의 흰 덩어리와 CO₂의 이동을 따라가 봐요.'; }
            return true;
          },
          explain: '① <b>화산 방출</b>(CO₂를 대기로) → ② <b>풍화</b>(빗물이 규산염 암석을 녹임) → ③ <b>퇴적</b>(바다에서 석회암이 쌓임) → ④ <b>섭입</b>(탄산염이 판과 함께 내려가 다시 화산으로)이에요.',
        },
        {
          type: 'quiz', title: '탄소가 암석에 갇히는 방식',
          goal: '지표 탄소의 대부분은 석회암 같은 암석에 있어요. 석회암이 쌓이는 과정은 <b>대기 CO₂</b>를 어떻게 줄일까요?',
          setup() { S.namesOn = true; setMode('cyc'); setCtl(['sCO']); },
          choices: ['풍화로 녹은 Ca²⁺·HCO₃⁻가 바다에서 CaCO₃가 되어 가라앉으며, 대기에서 온 탄소를 암석에 가둬요', '화산이 CO₂를 빨아들여 석회암으로 바꿔요', '석회암은 바닷물이 굳은 것이라 탄소와 관계가 없어요', '석회암이 쌓일 때 CO₂가 새로 만들어져 대기로 나가요'],
          answer: 0,
          feedback: ['', '화산은 CO₂를 빨아들이는 곳이 아니라 내보내는 곳이에요.', '석회암(CaCO₃)은 탄소를 품은 암석이에요. 대기 CO₂에서 온 탄소가 들어 있어요.', '석회암이 쌓이면 대기의 탄소가 암석으로 옮겨 가요. 새 CO₂가 생기는 것이 아니라 줄어들어요.'],
          explain: '풍화로 녹아든 Ca²⁺·HCO₃⁻가 바다에서 <b>CaCO₃(석회암)</b>로 쌓이면 대기의 탄소가 <b>암석에 저장</b>돼요. 그래서 지표 탄소의 대부분이 암석에 있어요.',
        },
      ],
    },
    {
      title: '탄소 되먹임: 지구의 온도 조절 장치', short: '탄소 되먹임', icon: '🌡️', phase: '탐구', features: ['fb'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화산이 CO₂를 내보내고, 풍화와 석회암 퇴적이 CO₂를 암석에 가둔다는 것을 봤어요. 화산이 갑자기 CO₂를 더 내보내면 어떻게 될까요?</div>' +
        '<p>CO₂가 늘면 온실 효과로 기온이 올라요. 기온이 오르면 비가 많이 오고 <b>풍화가 빨라져</b> CO₂를 더 많이 소비해요. 이 닫힌 고리를 수백만 년을 압축해 돌려 봐요. (예시 규칙: CO₂가 2배가 될 때마다 기온 +3 ℃, 기온이 5 ℃ 오르면 풍화 2배)</p>',
      setup() { resetStep(1); },
      recap: '화산이 CO₂를 더 내보내면 기온이 올라 풍화가 빨라지고, 풍화가 CO₂를 더 소비해 새 균형에 이르러요. 이런 음의 되먹임이 지구의 온도를 안정시켜요.',
      summary: '<ul><li><b>탄산염–규산염 순환의 되먹임(음)</b>: 기온↑ → 강수·풍화↑ → CO₂ 소비↑ → CO₂↓ → 기온↓. 변화를 줄여 균형으로 되돌려요.</li><li>새 균형에서는 <b>풍화 소비 = 화산 방출</b>이에요. 예시: 화산 방출이 2배(0.2 GtC/년)가 되면 CO₂는 280 → 약 890 ppm, 기온은 15 → 약 20 ℃에서 균형을 이뤄요.</li><li>시간 척도는 수만~수백만 년이라 몇 백 년 안에 일어나는 기후 변화를 막아 주지는 못해요.</li><li>이 되먹임 덕분에 지구는 수십억 년 동안 온화함을 유지할 수 있었어요(지권–기권–수권의 연결).</li></ul>',
      missions: [
        {
          title: '화산 방출 2배, 새 균형까지',
          goal: '화산 방출을 <b>2배</b>로 올리고, 풍화 소비가 화산 방출과 같아질 때(<b>새 균형</b>)까지 기다려요.',
          hint: '슬라이더를 ×2에 맞추고 막대 두 개가 같아질 때까지 기다려요. “⏩ 빠르게”를 켜면 시간이 3배로 흘러요. 풍화 소비/방출이 98 % 이상이면 돼요.',
          setup() { setMode('fb'); setCtl(['sV', 'fbBtns']); },
          check: () => S.v === 2 && fbEq(), hold: 0.8,
          status: () => mark(S.v === 2) + ' 화산 방출 ' + fSp(S.v) + ' (목표 ×2) · ' + mark(S.v === 2 && fbEq()) + ' 풍화 소비/방출 ' + fbRatio() + ' % (목표 98 % 이상)',
          explain: '화산 방출이 2배가 되자 CO₂가 늘고 기온이 올랐어요. 기온이 오르면 풍화가 빨라져 소비가 늘고, 소비가 방출과 같아지는 <b>새 균형</b>(CO₂ 약 890 ppm, 약 20 ℃)에서 멈췄어요.',
        },
        {
          title: '되먹임 고리의 부호', manual: true,
          goal: '고리의 ①②③ 연결이 <b>같은 방향(+)</b>인지 <b>반대 방향(−)</b>인지 고르고, 고리 전체의 종류를 골라요.',
          hint: 'CO₂가 늘면 기온은 오르고(+), 기온이 오르면 풍화는 빨라져요(+). 풍화가 빨라지면 CO₂는 줄어요(−). 부호를 곱하면 전체는 −예요.',
          setup() { S.signsOn = false; selSign.reset(); setMode('fb'); setCtl(['sV', 'fbBtns', 'selSign']); },
          status: () => mark(selSign.ok()) + ' 고른 칸 ' + selSign.count() + ' / 4',
          check() {
            if (!selSign.complete()) return '네 칸을 모두 골라 주세요. (지금 ' + selSign.count() + '칸)';
            if (!selSign.ok()) { selSign.mark(selSign.wrong()); return '빨간 줄이 달라요. 화면의 그래프와 막대를 보며 원인과 결과를 다시 생각해 봐요.'; }
            return true;
          },
          explain: 'CO₂↑ → 기온↑(+), 기온↑ → 풍화↑(+), 풍화↑ → CO₂↓(−). (+)(+)(−)이므로 고리 전체는 <b>음(−)의 되먹임</b>이에요. 변화를 줄여 균형으로 되돌려요.',
        },
        {
          type: 'quiz', title: '왜 지구 온도가 안정될까?',
          goal: '탄소 되먹임이 지구의 온도를 <b>안정</b>시키는 까닭은?',
          setup() { S.signsOn = true; setMode('fb'); setCtl(['sV', 'fbBtns']); },
          choices: ['기온이 오르면 풍화가 빨라져 CO₂가 줄고, 기온이 다시 내려가기 때문이에요 (음의 되먹임)', '기온이 오르면 풍화가 느려져 CO₂가 더 늘기 때문이에요', '얼음이 늘면 햇빛이 더 많이 반사되어 기온이 계속 내려가기 때문이에요', '화산이 CO₂를 전혀 내보내지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '반대예요. 기온이 오르면 풍화가 빨라져요. 풍화가 느려지면 CO₂가 쌓이기만 해요.', '이것은 얼음-알베도 되먹임이에요. 변화를 키우는 양(+)의 되먹임이라 온도를 안정시키지 못해요. 다음 단계에서 만나요.', '화산은 CO₂를 계속 내보내요. 균형은 소비가 방출을 따라 맞춰지며 생겨요.'],
          explain: '기온이 오르면 풍화가 빨라져 CO₂가 줄고 기온이 내려가요. 변화를 <b>줄이는 음의 되먹임</b>이라 온도가 안정돼요. 반대로 얼음-알베도 되먹임은 변화를 키우는 <b>양의 되먹임</b>이에요.',
        },
      ],
    },
    {
      title: '얼음덩어리 지구: 폭주한 되먹임', short: '얼음덩어리', icon: '🧊', phase: '분석', features: ['ice'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탄소 되먹임이 온도를 안정시킨다는 것을 확인했어요. 그런데 약 <b>7.2억~6.3억 년 전</b> 지구는 전 지구가 얼어붙었어요(얼음덩어리 지구). 어떻게 이런 일이 가능했을까요?</div>' +
        '<p>바다의 반사율은 약 0.06이지만 눈·얼음은 0.6~0.9예요. 얼음이 늘면 햇빛 반사가 늘어 기온이 더 내려가고, 얼음이 더 늘어요. 이것이 <b>얼음-알베도 되먹임(양)</b>이에요. 당시 태양 복사는 S ≈ 1279 W/m²(현재 1361의 약 94 %)였어요. 얼음선을 적도 쪽으로 밀어 보세요. (단순 모형: 얼음선이 위도 약 30°보다 내려오면 폭주)</p>',
      setup() { resetStep(2); },
      recap: '얼음선이 위도 약 30°보다 낮아지면 얼음-알베도 되먹임이 폭주해 전 지구가 얼고, 풍화가 멈춘 동안 화산 CO₂가 쌓여 약 250만 년 뒤 온실 효과로 녹았어요.',
      summary: '<ul><li><b>얼음-알베도 되먹임(양)</b>: 얼음↑ → 반사↑ → 기온↓ → 얼음↑. 얼음선이 위도 약 30°에 이르면(단순 모형) 폭주해 전 지구 결빙.</li><li>복사 평형 온도 T = [S(1 − A)/(4σ)]<sup>1/4</sup> (σ = 5.67×10⁻⁸): S ≈ 1279 W/m²일 때 A = 0.30 → <b>251 K(−22 ℃)</b>, A = 0.60 → <b>218 K(−55 ℃)</b>. (온실 효과를 뺀 값)</li><li>결빙 중에는 풍화가 멈추고 화산 CO₂만 쌓여요. 융해에 필요한 CO₂ 약 0.1기압(10만 ppm) ≈ 2.5×10⁵ GtC를 화산 0.1 GtC/년으로 채우면 2.5×10⁵ ÷ 0.1 = 2.5×10⁶ 년 = <b>약 250만 년</b>.</li><li>융해 뒤 극심한 온실 상태 → 풍화 폭증 → 얼음 퇴적물 바로 위의 <b>캡 카보네이트</b>.</li><li>증거 3가지: 저위도의 빙하 퇴적물, 캡 카보네이트, 호상 철광층의 재등장(산소가 차단되어 Fe²⁺가 다시 쌓임).</li></ul>',
      missions: [
        {
          title: '얼음선 30° 아래로: 폭주 확인',
          goal: '얼음선 슬라이더를 <b>30°보다 아래(적도 쪽)</b>로 밀어 전 지구가 얼어붙는 <b>폭주</b>를 확인해요.',
          hint: '얼음선 슬라이더를 왼쪽 끝쪽으로 밀어 29° 이하로 내려 봐요. 30° 위쪽에서는 얼음이 다시 물러나요.',
          setup() { setMode('ice'); setCtl(['sIce', 'iceBtns']); },
          check: () => !!S.frozenSeen, hold: 0.5,
          status: () => mark(!!S.frozenSeen) + ' 얼음선 ' + Math.round(S.ice) + '° · 상태: ' + iceName() + ' (목표: 전 지구 결빙)',
          explain: '얼음선이 30° 아래로 내려오면 알베도가 올라 기온이 더 내려가고 얼음이 더 늘어나는 <b>양의 되먹임</b>이 폭주해요. 복사 평형 온도는 251 K에서 218 K로 떨어졌어요.',
        },
        {
          title: '융해에 필요한 시간 구하기',
          goal: '결빙 중에는 풍화가 멈추고 화산 CO₂만 쌓여요. 필요한 CO₂ <b>2.5×10⁵ GtC</b>를 화산 방출 <b>0.1 GtC/년</b>으로 채우는 데 걸리는 시간을 <b>만 년</b> 단위로 맞춰요.',
          hint: '시간 = 필요한 CO₂ 양 ÷ 방출 속도 = 2.5×10⁵ ÷ 0.1 = 2.5×10⁶ 년이에요. 1만 년은 10⁴ 년이에요. “⏩ 결빙 중 CO₂ 쌓이기 보기”로 확인할 수 있어요.',
          setup() { if (!(S.phase === 'frozen' || S.phase === 'melting' || S.phase === 'melted')) { S.ice = 0; S.phase = 'frozen'; S.tz = 0; S.frozenSeen = true; iceUI.sync(); } S.showPred = true; setMode('ice'); setCtl(['sIce', 'iceBtns', 'sTe']); },
          check: () => S.predict === 250, hold: 0.6,
          status: () => mark(S.predict === 250) + ' 내 예측 ' + S.predict + '만 년 (2.5×10⁵ ÷ 0.1 년)',
          explain: 't = 2.5×10⁵ GtC ÷ 0.1 GtC/년 = 2.5×10⁶ 년, 곧 <b>약 250만 년</b>이에요. 이 시간 동안 화산 CO₂가 쌓여 10만 ppm에 이르면 온실 효과로 얼음이 녹아요.',
        },
        {
          type: 'quiz', title: '얼음덩어리 지구에서 탈출한 까닭',
          goal: '꽁꽁 언 지구가 다시 녹을 수 있었던 까닭은?',
          setup() { S.showPred = false; setMode('ice'); setCtl(['sIce', 'iceBtns']); },
          choices: ['얼음이 햇빛을 더 많이 흡수했기 때문이에요', '풍화가 멈춘 동안 화산 CO₂가 대기에 쌓여 온실 효과가 아주 커졌기 때문이에요', '태양이 갑자기 훨씬 밝아졌기 때문이에요', '화산 활동이 완전히 멈췄기 때문이에요'],
          answer: 1,
          feedback: ['얼음은 햇빛을 흡수하기보다 반사해요. 그래서 더 얼어붙었어요.', '', '당시 태양은 지금보다 약 6 % 어두웠어요. 밝아져서 녹은 것이 아니에요.', '화산이 계속 CO₂를 내보냈기 때문에 대기에 CO₂가 쌓일 수 있었어요.'],
          explain: '결빙 중에는 풍화가 멈추어 CO₂를 소비하지 못했고 화산 CO₂만 쌓였어요. 약 <b>10만 ppm</b>에 이르자 온실 효과로 얼음이 녹았고, 이어진 극심한 온실 상태에서 풍화가 폭증해 <b>캡 카보네이트</b>가 쌓였어요.',
        },
      ],
    },
    {
      title: '물과 지형: 풍화 · 침식 · 퇴적', short: '물과 지형', icon: '🏞️', phase: '탐구', features: ['river'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 풍화로 녹은 이온이 바다의 석회암이 된다는 것을 봤어요. 풍화된 물질은 어떻게 바다까지 갈까요? 그 길이 바로 <b>물의 순환</b>이 만드는 지형이에요.</div>' +
        '<p>물은 <b>태양</b>(증발)과 <b>중력</b>(흐름)으로 순환하며 <b>풍화·침식·운반·퇴적</b>으로 지형을 만들어요. 상류는 경사가 급해 <b>하방 침식</b>으로 V자곡을 만들고, 중류는 굽이치며 바깥쪽을 깎고 안쪽에 쌓고, 하류는 흙이 쌓여 삼각주가 돼요. 유량과 경사를 바꿔 봐요. (유속은 예시 값이에요.)</p>',
      setup() { resetStep(3); },
      recap: '강은 상류에서 깎고(하방 침식), 중류에서 굽이치며 바깥쪽은 깎고 안쪽에는 쌓고, 하류에서 삼각주를 만들어요. 풍화·침식·퇴적의 산물은 바다 생물의 석회암 재료가 돼요.',
      summary: '<ul><li><b>물의 순환</b>: 에너지원은 태양(증발)과 중력(흐름). 풍화·침식·운반·퇴적으로 지형을 만들어요.</li><li><b>상류</b>: 경사가 급하고 유속이 빨라 하방 침식 → <b>V자곡</b>. <b>중류</b>: 곡류 바깥쪽은 유속이 빨라(예시 1.2 m/s) 침식, 안쪽은 느려(0.3 m/s) 퇴적(점 모래톱), 홍수 때 <b>범람원</b>. <b>하류</b>: 유속이 줄어 퇴적 → <b>삼각주</b>.</li><li>유량이 늘면 곡류 바깥쪽 유속이 커져 침식이 심해지고 굽이가 커져요.</li><li>풍화·침식·퇴적 산물은 바다로 가 퇴적물과 석회암의 재료가 돼요. 생물 껍데기에 의한 석회암 퇴적은 약 5.4억 년 전 이후 늘었어요. 생명과 지구는 서로 영향을 주며 함께 변해 왔어요(공진화).</li></ul>',
      missions: [
        {
          title: '유량을 늘려 곡류 키우기',
          goal: '<b>유량을 4단계 이상</b>으로 늘려 곡류 바깥쪽의 침식을 키우고, 굽이 폭이 <b>300 m 이상</b> 자라게 해요.',
          hint: '경사는 그대로 두고 유량 슬라이더를 4~5단계로 올려요. 굽이가 천천히 커져요. 오른쪽 위 그림에서 굽이 폭을 확인해요.',
          setup() { setMode('river'); setCtl(['sQ', 'sSl']); },
          check: () => S.Q >= 4 && meaWidth() >= 300, hold: 0.8,
          status: () => mark(S.Q >= 4) + ' 유량 ' + S.Q + '단계 (목표 4단계 이상) · ' + mark(meaWidth() >= 300) + ' 굽이 폭 ' + meaWidth() + ' m (목표 300 m)',
          explain: '유량이 늘면 곡류 바깥쪽 유속이 커져(' + '예: 1.6 m/s 이상) 바깥쪽 둑이 더 깎이고, 안쪽에는 모래가 쌓여 굽이가 점점 커져요.',
        },
        {
          title: '작용과 지형 짝짓기', manual: true,
          goal: '왼쪽의 <b>작용</b>과 오른쪽의 <b>지형</b>을 하나씩 이어요.',
          hint: '깎는 작용은 상류의 V자곡과 곡류 바깥쪽의 둑에서, 쌓는 작용은 곡류 안쪽·범람원·하구에서 일어나요.',
          setup() { pairRiver.reset(); setMode('river'); setCtl(['sQ', 'sSl', 'pairRiver']); },
          status: () => mark(pairRiver.ok()) + ' 이은 쌍 ' + pairRiver.count() + ' / 5',
          check() {
            if (!pairRiver.complete()) return '5쌍을 모두 이어 주세요. (지금 ' + pairRiver.count() + '쌍)';
            if (!pairRiver.ok()) { pairRiver.mark(pairRiver.wrong()); return '빨간 쌍이 달라요. 깎이는 곳과 쌓이는 곳을 구분해 봐요.'; }
            return true;
          },
          explain: '<b>하방 침식–V자곡</b>, <b>측방 침식–깎아지른 둑</b>(곡류 바깥쪽), <b>퇴적–점 모래톱</b>(곡류 안쪽은 유속이 느려 쌓임), <b>하구 퇴적–삼각주</b>, <b>넘친 물의 퇴적–범람원</b>이에요.',
        },
        {
          type: 'quiz', title: '육지와 바다는 이어져 있어요',
          goal: '육지의 풍화·침식으로 강물에 녹아든 <b>Ca²⁺ 이온</b>은 바다에서 어떻게 될까요?',
          setup() { setMode('river'); setCtl(['sQ', 'sSl']); },
          choices: ['생물의 껍데기와 침전물(CaCO₃)이 되어 쌓여 석회암의 재료가 돼요', '바다에 닿으면 모두 사라져요', '바다의 석회암은 육지의 풍화와 관계없이 만들어져요', '강물은 이온을 운반하지 못해요'],
          answer: 0,
          feedback: ['', '사라지지 않아요. 바닷물에 녹아 있다가 생물이 껍데기로 만들고 가라앉아요.', '그림의 초록 이온이 강을 따라 바다로 가 껍데기가 되는 것을 봤어요. 육지의 풍화와 이어져 있어요.', '강물은 흙과 모래뿐 아니라 녹은 이온도 운반해요.'],
          explain: '풍화·침식·퇴적으로 육지의 물질이 바다로 가서 <b>석회암의 재료</b>가 돼요. 생물이 껍데기를 만들어 탄소를 가두고, 그 환경 변화가 다시 생물에 영향을 주는 <b>공진화</b>로 지권·수권·기권·생물권이 이어져 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-carbon-snowball', mount: '#game', badge: '탄소 탐정', homeHref: '../../index.html#hs',
    featureLabels: { cyc: '🪨 탄소의 순환 · 저장고', fb: '🌡️ 탄소 되먹임 고리', ice: '🧊 얼음-알베도 · 복사 평형 온도', river: '🏞️ 강의 침식과 퇴적' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'cyc') setReadouts(['풍화·퇴적 속도', carbonRate().toFixed(2) + ' GtC/년', '화산 방출', '0.10 GtC/년', '쌓인 껍데기', S.limeN + '개']);
    else if (m === 'fb') setReadouts(['대기 CO₂', Math.round(fbPPM()) + ' ppm', '지구 기온', fR(fbT(), 1) + ' ℃', '풍화 소비/방출', fbRatio() + ' %']);
    else if (m === 'ice') { const A = albedoOf(S.ice), T = tempOf(A); setReadouts(['얼음선', Math.round(S.ice) + '°', '알베도 A', A.toFixed(2), '복사 평형 온도', Math.round(T) + ' K (' + sgnC(tC(T)) + ' ℃)']); }
    else setReadouts(['바깥쪽 유속', fix(vOutOf(), 1) + ' m/s', '안쪽 유속', fix(vInOf(), 1) + ' m/s', '굽이 폭', meaWidth() + ' m']);
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
    if (S.mode === 'cyc') drawCyc(t, dt);
    else if (S.mode === 'fb') drawFb(t, dt);
    else if (S.mode === 'ice') { drawIce(t, dt); syncAcc(); }
    else drawRiver(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, HIST, selLbl, selSign, pairRiver,
    get game() { return game; }, setMode, setCO, setV, setTe, setQ, setSl, resetStep, updateCtl, fbReset, iceReset, riverReset, cycStep, fbStep, iceStep, riverStep,
    albedoOf, tempOf, fbEq, fbRatio, meaWidth, vOutOf, vInOf, iceName,
    setIce(v) { S.ice = v; S.idle = 0; iceUI.sync(); },
    runFb(sec) { let k = Math.round(sec * 60); while (k-- > 0) fbStep(1 / 60); },
    runCyc(sec) { let k = Math.round(sec * 60); while (k-- > 0) cycStep(1 / 60); },
    runIce(sec) { let k = Math.round(sec * 60); while (k-- > 0) iceStep(1 / 60); },
    runRiver(sec) { let k = Math.round(sec * 60); while (k-- > 0) riverStep(1 / 60); },
    solveLbl() { ['n1', 'n2', 'n3', 'n4'].forEach((k, i) => selLbl.set(k, ['volc', 'weath', 'dep', 'sub'][i])); },
    solveSign() { selSign.set('c1', 'p'); selSign.set('c2', 'p'); selSign.set('c3', 'm'); selSign.set('c4', 'neg'); },
    solvePair() { pairRiver.map = { down: 'rV', side: 'rCliff', bar: 'rBar', delta: 'rDelta', flood: 'rFlood' }; },
  };
})();
