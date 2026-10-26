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
     지진파로 본 지구 내부 (지각 두께 → 속도 불연속 → 암영대 → 단층 촬영)
     ====================================================== */
  initStage('#eaf1f7', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const V1 = 6.0, V2 = 8.0;                                   // 지각, 상부 맨틀의 P파 속도(km/s, 예시)
  const SINC = V1 / V2, COSC = Math.sqrt(1 - SINC * SINC), TANC = SINC / COSC;
  const REG = {
    A: { xc: 160, xmax: 300, tmax: 50, step: 20, x0: 20, noise: 0.12, tol: 8, xt: 50, tt: 10, nm: '지역 A', pos: 2 },
    B: { xc: 37, xmax: 100, tmax: 18, step: 6, x0: 6, noise: 0.04, tol: 3, xt: 20, tt: 5, nm: '지역 B', pos: 1 },
  };
  const Hof = (r) => REG[r].xc / (2 * Math.sqrt((V2 + V1) / (V2 - V1)));    // = (x_c/2)·√((v2−v1)/(v2+v1))
  const tiOf = (r) => (2 * Hof(r) * COSC) / V1;
  const critOf = (r) => 2 * Hof(r) * TANC;
  const tDir = (x) => x / V1;
  const tHead = (r, x) => x / V2 + tiOf(r);
  const firstT = (r, x) => (x >= critOf(r) ? Math.min(tDir(x), tHead(r, x)) : tDir(x));
  const DATA = {};
  ['A', 'B'].forEach((r) => {
    const rn = seeded(r === 'A' ? 5 : 9); DATA[r] = [];
    for (let x = REG[r].x0; x <= REG[r].xmax - (r === 'A' ? 0 : 4); x += REG[r].step) DATA[r].push({ x, t: firstT(r, x) + (rn() - 0.5) * 2 * REG[r].noise });
  });

  const S = {
    mode: 'crust', fade: 0, clock: 0, bad: [],
    reg: 'A', cx: { A: 0, B: 0 }, ans: { A: 0, B: 0 }, rt: 0, rtOn: false, doneA: false, doneB: false,
    dp: 0, found: {}, miss: 0, jumpFlash: 0,
    shW: 'P', dl: 60, lo: 90, hi: 130, bandK: 0, seenDl: {},
    slow: null, reason: null, tomoSeen: false,
  };

  /* ======================================================
     장면 1: 직접파와 모호면 굴절파
     ====================================================== */
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 184 }, B: { x: 8, y: 200, w: 504, h: 296 }, C: { x: 8, y: 504, w: 504, h: 208 } }
    : { A: { x: 12, y: 12, w: 776, h: 204 }, B: { x: 12, y: 224, w: 500, h: 324 }, C: { x: 520, y: 224, w: 268, h: 324 } };
  const grGeo = () => { const B = RC1.B, g = { x: B.x + 50, y: B.y + 40, w: B.w - 50 - 16, h: B.h - 40 - 60 }; return g; };
  const gXr = (g, x) => g.x + (x / REG[S.reg].xmax) * g.w, gYr = (g, t) => g.y + g.h - (t / REG[S.reg].tmax) * g.h;
  const xOfPx = (g, px) => { const R = REG[S.reg]; const st = R.pos; return clamp(Math.round(((px - g.x) / g.w) * R.xmax / st) * st, 0, R.xmax); };
  const okReg = (r) => S.cx[r] > 0 && Math.abs(S.cx[r] - REG[r].xc) <= REG[r].tol && Math.abs(S.ans[r] - Hof(r)) <= 1.3;
  let dragG = false;
  function setCx(v) { S.cx[S.reg] = v; setSlider($('#sCx'), $('#oCx'), v, (x) => x + ' km'); }
  function shoot() { S.rt = 0; S.rtOn = true; }
  const diaGeo = () => {
    const A = RC1.A, R = REG[S.reg], H = Hof(S.reg), g = { x0: A.x + 36, x1: A.x + A.w - 30, y0: A.y + 56 };
    g.sc = (g.x1 - g.x0) / R.xmax; g.yM = g.y0 + H * g.sc; g.yB = A.y + A.h - 12; g.H = H; return g;
  };
  function drawCrust(t, dt) {
    const { A, B, C } = RC1, R = REG[S.reg], d = diaGeo(), g = grGeo(), H = Hof(S.reg);
    const cx = S.cx[S.reg] > 0 ? S.cx[S.reg] : R.xmax * 0.6, crit = critOf(S.reg);
    if (S.rtOn) { S.rt += dt * 6; if (S.rt > 150) S.rtOn = false; }
    // 단면
    card(A, '🌍 ' + R.nm + ' 단면 (가로·세로 눈금 같음, 진원은 지표 근처)');
    ctx.save(); rr(A.x + 10, A.y + 38, A.w - 20, A.h - 46, 12).clip();
    ctx.fillStyle = '#dbeafe'; ctx.fillRect(A.x + 10, A.y + 38, A.w - 20, d.y0 - A.y - 38);
    const cg = ctx.createLinearGradient(0, d.y0, 0, d.yM); cg.addColorStop(0, '#c9ad8b'); cg.addColorStop(1, '#a98a68');
    ctx.fillStyle = cg; ctx.fillRect(A.x + 10, d.y0, A.w - 20, d.yM - d.y0);
    const mg = ctx.createLinearGradient(0, d.yM, 0, d.yB + 10); mg.addColorStop(0, '#8a5a44'); mg.addColorStop(1, '#5b3a2c');
    ctx.fillStyle = mg; ctx.fillRect(A.x + 10, d.yM, A.w - 20, d.yB - d.yM + 12);
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.x + 10, d.yM); ctx.lineTo(A.x + A.w - 10, d.yM); ctx.stroke();
    D.text(A.x + A.w - 18, d.yM + 18 * FS, '상부 맨틀  v₂ = 8.0 km/s', { size: 13, weight: 800, color: '#fde7d0', align: 'right' });
    D.text(A.x + A.w - 18, (d.y0 + d.yM) / 2 + 5, H * d.sc > 26 ? '지각  v₁ = 6.0 km/s' : '지각 (얇아요)', { size: 13, weight: 800, color: '#4a3524', align: 'right' });
    // 관측소 눈금
    for (let x = R.x0; x <= R.xmax; x += R.step) { const px = d.x0 + x * d.sc; ctx.fillStyle = '#334155'; ctx.fillRect(px - 1, d.y0 - 5, 2, 5); }
    // 파선
    const px = d.x0 + cx * d.sc;
    const thx = H * TANC;                                          // 임계각으로 내려가는 수평 거리
    const dirPath = [[d.x0, d.y0 + 2], [px, d.y0 + 2]];
    ctx.lineWidth = 3.4; ctx.strokeStyle = '#2563eb'; ctx.beginPath(); ctx.moveTo(dirPath[0][0], dirPath[0][1]); ctx.lineTo(dirPath[1][0], dirPath[1][1]); ctx.stroke();
    const hasHead = cx >= crit;
    let refPath = null;
    if (hasHead) {
      refPath = [[d.x0, d.y0 + 2], [d.x0 + thx * d.sc, d.yM], [px - thx * d.sc, d.yM], [px, d.y0 + 2]];
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3.4; ctx.beginPath(); refPath.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      D.text(d.x0 + (thx * d.sc) / 2 + 40, (d.y0 + d.yM) / 2 + 2, '임계각', { size: 12, weight: 800, color: '#ea580c', align: 'right', stroke: '#c9ad8b', strokeWidth: 3 });
    }
    // 펄스 (실제 속도 비율, 6배속)
    if (S.rt > 0) {
      const td = tDir(cx), th = hasHead ? tHead(S.reg, cx) : 1e9;
      const pd = Math.min(1, S.rt / td); D.sphere(d.x0 + (px - d.x0) * pd, d.y0 + 2, 6.5, '#2563eb');
      if (hasHead) {
        const L1 = H / COSC, t1 = L1 / V1, t2 = (cx - 2 * thx) / V2;
        let pos;
        if (S.rt <= t1) { const f = S.rt / t1; pos = [lerp(refPath[0][0], refPath[1][0], f), lerp(refPath[0][1], refPath[1][1], f)]; }
        else if (S.rt <= t1 + t2) { const f = (S.rt - t1) / t2; pos = [lerp(refPath[1][0], refPath[2][0], f), d.yM]; }
        else { const f = Math.min(1, (S.rt - t1 - t2) / t1); pos = [lerp(refPath[2][0], refPath[3][0], f), lerp(refPath[2][1], refPath[3][1], f)]; }
        D.sphere(pos[0], pos[1], 6.5, '#ea580c');
      }
      const firstDir = !hasHead || td <= th;
      if (S.rt >= Math.min(td, th)) D.label(clamp(px, A.x + 90, A.x + A.w - 90), d.y0 - 18, (firstDir ? '직접파' : '굴절파') + '가 먼저 도착 (' + fixn(Math.min(td, th), 1) + ' s)', { bg: firstDir ? '#2563eb' : '#ea580c', size: 12.5, pad: 7 });
    }
    ctx.restore();
    D.label(d.x0, d.y0 - 18, '진원(★)', { bg: '#dc2626', size: 12.5, pad: 7 });
    ctx.fillStyle = '#dc2626'; starPolyIn(d.x0, d.y0 - 2, 8, 3.6);
    ctx.fillStyle = '#0f172a'; poly([[px, d.y0 - 12], [px - 8, d.y0 + 2], [px + 8, d.y0 + 2]]); ctx.fill();
    D.text(px, d.y0 - 17, S.cx[S.reg] > 0 ? 'x = ' + cx + ' km' : '관측소', { size: 12.5, weight: 800, color: '#0f172a', stroke: '#dbeafe', strokeWidth: 3 });
    if (!hasHead) D.text(A.x + A.w / 2, d.yM + 24 * FS, '이 거리(임계 거리 약 ' + Math.round(crit) + ' km)보다 가까우면 굴절파가 도착하지 않아요', { size: 12.5, weight: 800, color: '#fde7d0' });

    // 주시 곡선
    card(B, '📈 ' + R.nm + ' 주시 곡선: 처음 도착한 지진파 (예시 자료)');
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let x = 0; x <= R.xmax; x += R.xt) { const X = gXr(g, x); ctx.beginPath(); ctx.moveTo(X, g.y); ctx.lineTo(X, g.y + g.h); ctx.stroke(); D.text(X, g.y + g.h + 15 * FS, String(x), { size: 12.5, weight: 700, color: '#64748b' }); }
    for (let tt = 0; tt <= R.tmax; tt += R.tt) { const Y = gYr(g, tt); ctx.beginPath(); ctx.moveTo(g.x, Y); ctx.lineTo(g.x + g.w, Y); ctx.stroke(); D.text(g.x - 6, Y + 4.5, String(tt), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); }
    D.text(g.x + g.w / 2, g.y + g.h + 34 * FS, '관측소까지의 거리 (km)', { size: 12.5, weight: 700, color: '#64748b' });
    ctx.save(); ctx.translate(B.x + 14, g.y + g.h / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '도착 시간 (초)', { size: 12.5, weight: 700, color: '#64748b' }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(gXr(g, 0), gYr(g, 0)); ctx.lineTo(gXr(g, R.xmax), gYr(g, tDir(R.xmax))); ctx.stroke();
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.6; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(gXr(g, 0), gYr(g, tHead(S.reg, 0))); ctx.lineTo(gXr(g, crit), gYr(g, tHead(S.reg, crit))); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(gXr(g, crit), gYr(g, tHead(S.reg, crit))); ctx.lineTo(gXr(g, R.xmax), gYr(g, tHead(S.reg, R.xmax))); ctx.stroke();
    DATA[S.reg].forEach((p) => { const x = gXr(g, p.x), y = gYr(g, p.t); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x, y, 4.4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke(); });
    if (S.cx[S.reg] > 0) {
      const x = gXr(g, cx), yd = gYr(g, tDir(cx)), yh = gYr(g, tHead(S.reg, cx)), ok = Math.abs(cx - R.xc) <= R.tol, col = ok ? '#15803d' : '#dc2626';
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, g.y); ctx.lineTo(x, g.y + g.h); ctx.setLineDash([]); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, yd); ctx.lineTo(x, yh); ctx.stroke();
      const gap = tDir(cx) - tHead(S.reg, cx);
      ctx.restore(); ctx.save();
      D.label(clamp(x, g.x + 60, g.x + g.w - 60), g.y + 14, '두 직선의 시간 차 ' + (gap >= 0 ? '+' : '−') + fixn(Math.abs(gap), 1) + ' s', { bg: col, size: 12.5, pad: 7 });
      ctx.restore(); ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(g.x, g.y, g.w, g.h);
    D.text(gXr(g, R.xmax * 0.62), gYr(g, tDir(R.xmax * 0.62)) + 20, '직접파 (v₁)', { size: 12.5, weight: 800, color: '#2563eb', align: 'center', stroke: '#f8fafc', strokeWidth: 3 });
    D.text(gXr(g, R.xmax * 0.8), gYr(g, tHead(S.reg, R.xmax * 0.8)) - 12, '굴절파 (v₂)', { size: 12.5, weight: 800, color: '#ea580c', align: 'center', stroke: '#f8fafc', strokeWidth: 3 });
    if (!PHONE) D.text(B.x + B.w / 2, B.y + B.h - 8, '검은 점 = 관측소가 기록한 처음 도착 시간', { size: 12.5, weight: 700, color: '#64748b' });

    // 계산 도움
    card(C, '🧮 지각 두께 구하기');
    const lines = PHONE ? [
      ['직접파 t = x/6.0 · 굴절파 t = x/8.0 + tᵢ', '#ea580c'],
      ['두 직선이 만나는 거리 = 교차 거리 x_c', '#334155'],
      ['H = (x_c/2)·√((v₂−v₁)/(v₂+v₁)) ≈ 0.378 × (x_c/2)', '#0f172a'],
    ] : [
      ['직접파  t = x / 6.0', '#2563eb'], ['굴절파  t = x / 8.0 + tᵢ', '#ea580c'],
      ['두 직선이 만나는 거리 = 교차 거리 x_c', '#334155'],
      ['H = (x_c / 2) · √((v₂ − v₁)/(v₂ + v₁))', '#0f172a'],
      ['  = (x_c / 2) × √(2/14) ≈ 0.378 × (x_c / 2)', '#0f172a'],
    ];
    let yy = C.y + 54;
    lines.forEach((l) => { yy += drawWrap(C.x + 12, yy, l[0], C.w - 24, PHONE ? 13 : 13.5, { align: 'left', color: l[1], weight: 800 }) - yy + (PHONE ? 25 : 26) * FS * 0.98; });
    if (PHONE) D.text(C.x + 12, yy + 2, 'x_c ' + (S.cx[S.reg] > 0 ? S.cx[S.reg] + ' km' : '—') + '  ·  H ' + (S.ans[S.reg] > 0 ? S.ans[S.reg] + ' km' : '—'), { size: 14, weight: 800, color: '#b91c1c', align: 'left' });
    else {
      D.text(C.x + 12, yy + 4, '읽은 교차 거리 x_c: ' + (S.cx[S.reg] > 0 ? S.cx[S.reg] + ' km' : '—'), { size: 14, weight: 800, color: '#b91c1c', align: 'left' });
      D.text(C.x + 12, yy + 28 * FS, '입력한 지각 두께: ' + (S.ans[S.reg] > 0 ? S.ans[S.reg] + ' km' : '—'), { size: 14, weight: 800, color: '#0369a1', align: 'left' });
      D.text(C.x + 12, C.y + C.h - 12, '대륙 지각 평균 약 35 km · 해양 지각 약 5~7 km', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    }
  }
  const fixn = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  function starPolyIn(x, y, R, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rad = i % 2 ? r : R; i ? ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }

  /* ======================================================
     장면 2: 속도–깊이 그래프와 속도 불연속면
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 336 }, B: { x: 8, y: 352, w: 504, h: 244 }, C: { x: 8, y: 604, w: 504, h: 108 } }
    : { A: { x: 12, y: 12, w: 430, h: 536 }, B: { x: 450, y: 12, w: 338, h: 330 }, C: { x: 450, y: 350, w: 338, h: 198 } };
  const RE = 6371;
  const VPT = [[0, 6.0, 3.5], [35, 6.0, 3.5], [35, 8.0, 4.5], [410, 9.1, 5.0], [660, 10.7, 5.9], [2891, 13.7, 7.3], [2891, 8.0, 0], [5150, 10.4, 0], [5150, 11.0, 3.5], [6371, 11.3, 3.6]];
  function velAt(d) {
    let i = 0;
    for (let k = 0; k < VPT.length - 1; k++) if (d >= VPT[k][0]) i = k;
    // 불연속면에서는 아래층 값을 써요
    const a = VPT[i], b = VPT[Math.min(i + 1, VPT.length - 1)];
    if (b[0] === a[0] || d >= b[0]) return { p: b[1], s: b[2] };
    const f = (d - a[0]) / (b[0] - a[0]);
    return { p: a[1] + (b[1] - a[1]) * f, s: a[2] + (b[2] - a[2]) * f };
  }
  const layerOf = (d) => (d < 35 ? '지각' : d < 410 ? '상부 맨틀' : d < 660 ? '맨틀 전이대' : d < 2891 ? '하부 맨틀' : d < 5150 ? '외핵 (액체)' : '내핵 (고체)');
  const depthOfS = (s) => RE * Math.pow(s / 1000, 2);
  const JUMPS = [
    { id: 'moho', d0: 35, d1: 35, nm: '모호면', sh: '모호면', sub: '약 35 km' },
    { id: 'tz', d0: 410, d1: 660, nm: '410·660 km 전이대', sh: '전이대', sub: '410~660 km' },
    { id: 'cmb', d0: 2891, d1: 2891, nm: '맨틀-핵 경계 (구텐베르크)', sh: '구텐베르크', sub: '2891 km' },
    { id: 'icb', d0: 5150, d1: 5150, nm: '내핵 경계 (레만)', sh: '레만', sub: '5150 km' },
  ];
  const vGeo = () => {
    const A = RC2.A, g = { x: A.x + 52, y: A.y + 44, w: A.w - 52 - (PHONE ? 128 : 116), h: A.h - 44 - 36 };
    g.X = (v) => g.x + (v / 14) * g.w; g.Y = (d) => g.y + Math.sqrt(clamp(d, 0, RE) / RE) * g.h; return g;
  };
  function vClick(p) {
    const g = vGeo();
    if (p.x < g.x - 4 || p.x > g.x + g.w + 4 || p.y < g.y - 2 || p.y > g.y + g.h + 4) return false;
    let hit = null;
    JUMPS.forEach((j) => { const y0 = g.Y(j.d0) - (j.d0 === j.d1 ? 12 : 8), y1 = g.Y(j.d1) + (j.d0 === j.d1 ? 12 : 8); if (p.y >= y0 && p.y <= y1) hit = j; });
    if (hit) { if (!S.found[hit.id]) { S.found[hit.id] = true; S.jumpFlash = 1; Sound.success(); parts.burst(g.x + g.w / 2, g.Y((hit.d0 + hit.d1) / 2), { count: 14, speed: 130, life: 0.7 }); say(hit.nm + ' (' + hit.sub + '): 속도가 급하게 변하는 곳이에요', false, 2.4); } }
    else { S.miss++; say('이곳은 속도가 완만하게 변하는 구간이에요. 급하게 변하는 곳(수평으로 꺾이는 곳)을 찾아봐요.', true, 2.6); }
    return true;
  }
  function drawDisc(t, dt) {
    const { A, B, C } = RC2, g = vGeo(), dep = depthOfS(S.dp), vv = velAt(dep);
    S.jumpFlash = approach(S.jumpFlash, 0, dt, 3);
    card(A, '📉 지진파 속도와 깊이 (단순화한 모델) · 눈금: 깊이는 √ 간격');
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let v = 0; v <= 14; v += 2) { const x = g.X(v); ctx.beginPath(); ctx.moveTo(x, g.y); ctx.lineTo(x, g.y + g.h); ctx.stroke(); D.text(x, g.y + g.h + 16 * FS, String(v), { size: 12.5, weight: 700, color: '#64748b' }); }
    D.text(g.x + g.w / 2, A.y + 36, '속도 (km/s)', { size: 12.5, weight: 700, color: '#64748b' });
    [0, 100, 410, 660, 1000, 2891, 4000, 5150, 6371].forEach((d) => { const y = g.Y(d); ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + g.w, y); ctx.stroke(); D.text(g.x - 6, y + 4.5, String(d), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    ctx.save(); ctx.translate(A.x + 12, g.y + g.h / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '깊이 (km)', { size: 12.5, weight: 700, color: '#64748b' }); ctx.restore();
    // 층 색
    [[0, 35, '#c9ad8b'], [35, 2891, '#f3d9b8'], [2891, 5150, '#fde8a8'], [5150, 6371, '#fff3c4']].forEach((q) => { ctx.fillStyle = rgba(q[2], 0.35); ctx.fillRect(g.x, g.Y(q[0]), g.w, g.Y(q[1]) - g.Y(q[0])); });
    // 찾은 불연속면
    JUMPS.forEach((j) => { if (!S.found[j.id]) return; const y0 = g.Y(j.d0) - (j.d0 === j.d1 ? 3 : 0), y1 = g.Y(j.d1) + (j.d0 === j.d1 ? 3 : 0); ctx.fillStyle = 'rgba(34,197,94,.38)'; ctx.fillRect(g.x, y0, g.w, Math.max(6, y1 - y0)); D.text(g.x + g.w + 8, (y0 + y1) / 2 + 4, '✔ ' + j.sh, { size: 12.5, weight: 800, color: '#15803d', align: 'left' }); });
    // 곡선
    ctx.save(); ctx.beginPath(); ctx.rect(g.x - 2, g.y - 2, g.w + 4, g.h + 4); ctx.clip();
    [['p', '#2563eb', 'P파'], ['s', '#ea580c', 'S파']].forEach((q, qi) => {
      ctx.strokeStyle = q[1]; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
      VPT.forEach((pt, i) => { const x = g.X(qi ? pt[2] : pt[1]), y = g.Y(pt[0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(g.x, g.y, g.w, g.h);
    D.label(g.X(10.4), g.Y(200), 'P파', { bg: '#2563eb', size: 12.5, pad: 7 });
    D.label(g.X(3.3), g.Y(300), 'S파', { bg: '#ea580c', size: 12.5, pad: 7 });
    D.text(g.X(1.1), g.Y(3900), 'S파 0', { size: 13, weight: 800, color: '#b45309' });
    D.text(g.X(1.1), g.Y(3900) + 16 * FS, '(액체)', { size: 12.5, weight: 800, color: '#b45309' });
    // 탐침
    const py = g.y + (S.dp / 1000) * g.h;
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(g.x, py); ctx.lineTo(g.x + g.w, py); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(g.X(vv.p), py, 6, '#2563eb'); D.sphere(g.X(vv.s), py, 6, '#ea580c');
    ctx.fillStyle = '#dc2626'; poly([[g.x - 14, py], [g.x - 4, py - 6], [g.x - 4, py + 6]]); ctx.fill();
    D.text(g.x + g.w / 2, A.y + A.h - 8, '곡선을 눌러 속도가 급하게 변하는 곳을 찾아요 (' + JUMPS.filter((j) => S.found[j.id]).length + '/4)', { size: 13, weight: 800, color: '#0369a1' });

    // 지구 단면
    card(B, '🌐 지구의 층 구조 (축척대로)');
    const Re = Math.min(B.w / 2 - 24, (B.h - 62) / 2), ex = B.x + B.w / 2, ey = B.y + 42 + Re;
    const rad = (d) => Re * (1 - d / RE);
    const ring = (r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fill(); };
    D.shadow(() => ring(Re, '#8b5e3c'), { blur: 8, y: 3 });
    ring(Math.min(Re - 3, rad(35)), '#e8a96b'); ring(rad(410), '#e59a54'); ring(rad(660), '#d9803a');
    ring(rad(2891), '#fbbf24'); ring(rad(5150), '#fff0a6');
    ctx.strokeStyle = 'rgba(120,53,15,.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    [410, 660].forEach((d) => { ctx.beginPath(); ctx.arc(ex, ey, rad(d), 0, TAU); ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.8; [2891, 5150].forEach((d) => { ctx.beginPath(); ctx.arc(ex, ey, rad(d), 0, TAU); ctx.stroke(); });
    JUMPS.forEach((j) => { if (!S.found[j.id]) return; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3.6; [j.d0, j.d1].filter((d, i, a) => a.indexOf(d) === i).forEach((d) => { ctx.beginPath(); ctx.arc(ex, ey, Math.min(Re - 1, rad(d)), 0, TAU); ctx.stroke(); }); });
    D.text(ex - Re * 0.5, ey + Re * 0.7, '맨틀 (고체)', { size: 13, weight: 800, color: '#7c2d12' });
    D.text(ex - Re * 0.3, ey + Re * 0.3, '외핵 (액체)', { size: 12.5, weight: 800, color: '#92400e' });
    D.text(ex, ey + 4, '내핵', { size: 12, weight: 800, color: '#92400e' });
    const pr = rad(dep);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(ex, ey - Re); ctx.lineTo(ex, ey); ctx.stroke();
    D.sphere(ex, ey - pr, 7, '#dc2626');
    D.label(ex + Re * 0.48, ey - pr, Math.round(dep) + ' km', { bg: '#dc2626', size: 12.5, pad: 7, align: 'left' });
    D.text(B.x + B.w / 2, B.y + B.h - 8, '탐침: ' + layerOf(dep) + ' · P ' + fixn(vv.p, 1) + ' km/s · S ' + fixn(vv.s, 1) + ' km/s', { size: 13, weight: 800, color: '#334155' });

    // 밀도 표
    card(C, '⚖️ 층의 밀도와 상태');
    const rows = [['지각', '0~35 km', '2.7~2.9', '고체'], ['맨틀', '35~2891 km', '3.4~5.6', '고체'], ['외핵', '2891~5150 km', '약 10~12', '액체'], ['내핵', '5150~6371 km', '약 13', '고체']];
    if (!PHONE) {
      const cw = [60, 112, 98, 56], x0 = C.x + 12;
      ['층', '깊이', '밀도(g/cm³)', '상태'].forEach((h, i) => D.text(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, C.y + 48, h, { size: 12.5, weight: 800, color: '#64748b' }));
      rows.forEach((r, k) => { const y = C.y + 58 + k * 32; ctx.fillStyle = layerOf(dep).indexOf(r[0]) === 0 || (r[0] === '맨틀' && /맨틀/.test(layerOf(dep))) ? 'rgba(14,165,233,.16)' : '#f8fafc'; rr(x0 - 4, y, C.w - 16, 28, 7).fill(); r.forEach((tx, i) => D.text(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, y + 19, tx, { size: 13, weight: i === 0 ? 800 : 700, color: i === 3 && tx === '액체' ? '#b45309' : '#334155' })); });
    } else {
      rows.forEach((r, k) => D.text(C.x + 14 + (k % 2) * 250, C.y + 52 + Math.floor(k / 2) * 28 * FS, r[0] + ' ' + r[2] + ' · ' + r[3], { size: 13, weight: 800, color: '#334155', align: 'left' }));
    }
  }

  /* ======================================================
     장면 3: 암영대 (P파 암영대 103°~142°, S파 암영대 103° 이후)
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 436 }, B: { x: 8, y: 452, w: 504, h: 260 } }
    : { A: { x: 12, y: 12, w: 540, h: 536 }, B: { x: 560, y: 12, w: 228, h: 536 } };
  const RCf = 3480 / RE, RIf = (RE - 5150) / RE, EG = 51.5, DG = 103, DS = 142;
  const shGeo = () => { const A = RC3.A, R = Math.min(A.w / 2 - 44, (A.h - 74) / 2); return { R, cx: A.x + A.w / 2, cy: A.y + 52 + R }; };
  const deg = (a) => (a * Math.PI) / 180;
  const pol = (g, r, th) => [g.cx + g.R * r * Math.sin(th), g.cy - g.R * r * Math.cos(th)];
  function mantleRay(g, D_) {
    const rmin = 1 - (1 - RCf) * Math.pow(D_ / DG, 1.5), pts = [];
    for (let k = 0; k <= 24; k++) { const f = k / 24, ph = f * D_, r = rmin + (1 - rmin) * Math.pow((ph - D_ / 2) / (D_ / 2), 2); pts.push(pol(g, r, deg(ph))); }
    return pts;
  }
  function legIn(g, E) { const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, r = RCf + (1 - RCf) * Math.pow(1 - u, 2); pts.push(pol(g, r, deg(E * u))); } return pts; }
  function legOut(g, D_, E) { const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, r = RCf + (1 - RCf) * u * u; pts.push(pol(g, r, deg(D_ - E + E * u))); } return pts; }
  const coreDelta = (E) => 180 - (38 * E) / EG;
  function coreRay(g, E) {
    const D_ = coreDelta(E), a = pol(g, RCf, deg(E)), b = pol(g, RCf, deg(D_ - E)), mid = [];
    for (let k = 1; k < 10; k++) mid.push([lerp(a[0], b[0], k / 10), lerp(a[1], b[1], k / 10)]);
    return legIn(g, E).concat(mid, legOut(g, D_, E));
  }
  function lehmannRay(g) {
    const E = 30, D_ = 120, pts = legIn(g, E), c1 = pol(g, RCf, deg(E)), ic = pol(g, RIf, deg(60)), c2 = pol(g, RCf, deg(D_ - E));
    for (let k = 1; k <= 8; k++) pts.push([lerp(c1[0], ic[0], k / 8), lerp(c1[1], ic[1], k / 8)]);
    for (let k = 1; k <= 8; k++) pts.push([lerp(ic[0], c2[0], k / 8), lerp(ic[1], c2[1], k / 8)]);
    return pts.concat(legOut(g, D_, E));
  }
  const plen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function along(pts, d) { let acc = 0; for (let i = 1; i < pts.length; i++) { const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + sl >= d) { const f = (d - acc) / (sl || 1); return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; } acc += sl; } return pts[pts.length - 1]; }
  let RAYS = null, RAYG = '';
  function buildRays(g) {
    const key = g.R + '|' + g.cx + '|' + g.cy; if (RAYG === key) return; RAYG = key;
    RAYS = { Pm: [20, 40, 60, 80, 95, 103].map((d) => mantleRay(g, d)), Pc: [46, 36, 26, 16, 6, 0].map((E) => coreRay(g, E)), L: lehmannRay(g),
      Sm: [20, 40, 60, 80, 95, 103].map((d) => mantleRay(g, d)), Ss: [45, 34, 23].map((E) => legIn(g, E)) };
    Object.keys(RAYS).forEach((k) => { if (k === 'L') RAYS.Lh = 0; });
  }
  const pArr = (D_) => D_ <= DG || D_ >= DS, sArr = (D_) => D_ <= DG;
  function drawShadow(t, dt) {
    const { A, B } = RC3, g = shGeo(); buildRays(g);
    const showP = S.shW !== 'S', showS = S.shW !== 'P';
    S.bandK = approach(S.bandK, (tabOk() || (game && game.free)) ? 1 : 0, dt, 3);
    card(A, PHONE ? '🌐 지구 내부를 지나는 지진파 (단순화 모형)' : '🌐 지구 내부를 지나는 지진파 (진원은 위쪽, 단순화한 광선 모형)');
    // 층
    const ring = (r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * r, 0, TAU); ctx.fill(); };
    D.shadow(() => ring(1, '#8b5e3c'), { blur: 8, y: 3 });
    ring(1 - 35 / RE - 0.004, '#e8a96b'); ring(1 - 660 / RE, '#e29a52'); ring(RCf, '#fbbf24'); ring(RIf, '#fff0a6');
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; [RCf, RIf].forEach((r) => { ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * r, 0, TAU); ctx.stroke(); });
    D.text(g.cx - g.R * 0.62, g.cy - g.R * 0.58, '맨틀 (고체)', { size: 13, weight: 800, color: '#7c2d12' });
    D.text(g.cx - g.R * 0.3, g.cy + g.R * 0.1, '외핵 (액체)', { size: 13, weight: 800, color: '#92400e' });
    D.text(g.cx, g.cy + 5, '내핵', { size: 12.5, weight: 800, color: '#92400e' });
    // 암영대 띠
    const band = S.bandK;
    if (band > 0.01) {
      ctx.save(); ctx.globalAlpha = band;
      [[-1, 1]].forEach(() => { [-1, 1].forEach((sd) => {
        if (showP) { ctx.strokeStyle = 'rgba(30,41,59,.88)'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R + 12, deg(sd * DG - 90), deg(sd * DS - 90), sd < 0); ctx.stroke(); }
        if (showS) { ctx.strokeStyle = 'rgba(234,88,12,.55)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R + (showP ? 25 : 12), deg(sd * DG - 90), deg(sd * 180 - 90), sd < 0); ctx.stroke(); }
      }); });
      ctx.restore();
      if (showP && !PHONE) { const q = pol(g, 1.165, deg(122.5)); D.label(q[0] + 4, q[1] + 6, 'P파 암영대 103°~142°', { bg: '#1e293b', size: 12.5, pad: 7, align: 'left' }); }
      if (showS && !PHONE) { const q = pol(g, 1.29, deg(160)); D.label(Math.min(q[0], A.x + A.w - 100), q[1] + 4, 'S파 암영대 103° 이후', { bg: '#c2410c', size: 12.5, pad: 7, align: 'right' }); }
    }
    // 각도 눈금
    for (let a = 0; a <= 180; a += 30) { const p0 = pol(g, 1, deg(a)), p1 = pol(g, 1.045, deg(a)), p2 = pol(g, 1.1, deg(a)); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); if (!(band > 0.5 && a >= 90 && a <= 150)) D.text(p2[0] + (a === 0 ? 0 : 6), p2[1] + (a === 0 ? -2 : 4), a + '°', { size: 12, weight: 800, color: '#475569', align: a === 0 ? 'center' : 'left' }); }
    // 광선
    const drawRay = (pts, col, w, dash, alpha) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha == null ? 0.9 : alpha; ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; };
    const pulses = (pts, col, speed, off) => { if (RM) return; const L = plen(pts), per = L + 80, d = ((t * speed + off) % per); if (d <= L) { const q = along(pts, d); D.sphere(q[0], q[1], 4.4, col); } };
    if (showP) {
      RAYS.Pm.forEach((p, i) => { drawRay(p, '#2563eb', i === 5 ? 3.2 : 1.8); pulses(p, '#60a5fa', 240, i * 53); });
      RAYS.Pc.forEach((p, i) => { drawRay(p, '#1d4ed8', 1.8); pulses(p, '#93c5fd', 240, i * 71); });
      drawRay(RAYS.L, '#7c3aed', 1.8, [5, 4], 0.85);
      const lq = pol(g, 0.36, deg(75)); D.text(lq[0] + 12, lq[1] - 6, '약한 P파(내핵 반사)', { size: 11.5, weight: 800, color: '#6d28d9', align: 'left', stroke: '#fbbf24', strokeWidth: 3 });
    }
    if (showS) {
      RAYS.Sm.forEach((p, i) => { drawRay(p, '#ea580c', i === 5 ? 3.2 : 1.8, null, showP ? 0.65 : 0.9); pulses(p, '#fdba74', 140, i * 61); });
      RAYS.Ss.forEach((p, i) => { drawRay(p, '#ea580c', 1.8, null, showP ? 0.65 : 0.9); const e = p[p.length - 1]; D.text(e[0], e[1] + 5, '×', { size: 18, weight: 900, color: '#b91c1c' }); const L = plen(p), per = L + 70, d = (t * 140 + i * 40) % per; if (d <= L) { const q = along(p, d); D.sphere(q[0], q[1], 4.4, '#fdba74'); } });
    }
    // 진원 · 관측점
    const src = pol(g, 1, 0); ctx.fillStyle = '#dc2626'; starPolyIn(src[0], src[1] - 2, 10, 4.4); D.label(src[0] + 56, src[1] - 12, '진원(진앙)', { bg: '#dc2626', size: 12.5, pad: 7 });
    const st = pol(g, 1.0, deg(S.dl)), st2 = pol(g, 1.06, deg(S.dl));
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, -Math.PI / 2, deg(S.dl) - Math.PI / 2); ctx.stroke();
    D.sphere(st2[0], st2[1], 8, '#0f172a'); D.ring(st2[0], st2[1], 14, t, { color: '#0ea5e9' });
    const lab = pol(g, 0.84, deg(S.dl));
    D.label(lab[0], lab[1], 'Δ = ' + S.dl + '°', { bg: '#0f172a', size: 13, pad: 8 });

    // 도착 여부 카드
    card(B, '📋 이 관측점에서는?');
    const p = pArr(S.dl), s = sArr(S.dl), x0 = B.x + 14;
    D.text(x0, B.y + 54, '진앙각 Δ = ' + S.dl + '°', { size: 16, weight: 800, color: '#0f172a', align: 'left' });
    const row = (y, nm, ok, col, why) => {
      ctx.fillStyle = ok ? 'rgba(22,163,74,.14)' : 'rgba(220,38,38,.12)'; rr(B.x + 8, y, B.w - 16, PHONE ? 74 : 104, 10).fill();
      ctx.strokeStyle = ok ? '#16a34a' : '#dc2626'; ctx.lineWidth = 2; rr(B.x + 8, y, B.w - 16, PHONE ? 74 : 104, 10).stroke();
      D.text(x0, y + 22, nm + (ok ? ' · 도착해요 ○' : ' · 도착하지 못해요 ×'), { size: 14.5, weight: 800, color: ok ? '#15803d' : '#b91c1c', align: 'left' });
      drawWrap(x0, y + 44, why, B.w - 36, 12.5, { align: 'left', color: '#334155', lh: 1.25 });
    };
    row(B.y + 68, 'P파', p, '#2563eb', S.dl <= DG ? '맨틀을 지나 곧바로 도착해요.' : S.dl < DS ? '외핵에 들어가며 크게 굴절되어 이 구간에는 도달하지 못해요. (내핵에서 반사된 아주 약한 P파만 와요)' : '외핵과 내핵을 통과해 늦게 도착해요.');
    row(B.y + 68 + (PHONE ? 82 : 114), 'S파', s, '#ea580c', S.dl <= DG ? '맨틀(고체)만 지나 도착해요.' : '핵의 바깥 부분(외핵)이 액체라 S파가 통과하지 못해요.');
    if (!PHONE) D.text(x0, B.y + B.h - 12, 'P파 속도는 외핵에서 8.0 km/s로 급감해요.', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    else if (band > 0.3) D.text(B.x + B.w / 2, B.y + B.h - 12, '검은 띠: P파 암영대 · 주황 띠: S파 암영대 (지구 그림 바깥)', { size: 12.5, weight: 800, color: '#334155' });
  }
  const tabOk = () => { try { return clsTab.ok(); } catch (e) { return false; } };

  /* ======================================================
     장면 4: 지진파 단층 촬영
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 360 }, B: { x: 8, y: 376, w: 504, h: 336 } }
    : { A: { x: 12, y: 12, w: 330, h: 536 }, B: { x: 350, y: 12, w: 438, h: 536 } };
  const CELLS = ['a', 'b', 'c', 'd'];
  const PATHS = [{ id: 'r1', nm: '가로 경로 1', cells: ['a', 'b'], obs: 2 }, { id: 'r2', nm: '가로 경로 2', cells: ['c', 'd'], obs: 0 }, { id: 'c1', nm: '세로 경로 1', cells: ['a', 'c'], obs: 2 }, { id: 'c2', nm: '세로 경로 2', cells: ['b', 'd'], obs: 0 }];
  const predOf = (p) => (S.slow && p.cells.includes(S.slow) ? 2 : 0);
  const gridGeo = () => {
    const A = RC4.A, cs = PHONE ? 74 : 92, gx = PHONE ? A.x + 150 : A.x + 78, gy = A.y + (PHONE ? 92 : 96);
    return { cs, x: gx, y: gy, cell: (id) => { const i = CELLS.indexOf(id); return { x: gx + (i % 2) * cs, y: gy + Math.floor(i / 2) * cs, w: cs, h: cs }; } };
  };
  function tomoDown(p) {
    const g = gridGeo();
    for (const id of CELLS) { const c = g.cell(id); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { S.slow = S.slow === id ? null : id; Sound.click(); syncTomo(); return false; } }
    return false;
  }
  /* 예시 영상: 속도 편차(느림 = +, 빠름 = −) */
  const TOMO_MK = [{ id: 'A', th: -78, r: 0.82 }, { id: 'B', th: -150, r: 0.64 }, { id: 'C', th: 128, r: 0.78 }];
  const TOMO_IMG = {};
  const dth = (a, b) => ((a - b + 540) % 360) - 180;
  function tomoImage(Re) {
    const key = Math.round(Re); if (TOMO_IMG[key]) return TOMO_IMG[key];
    const N = key * 2, c = document.createElement('canvas'); c.width = c.height = N; const o = c.getContext('2d'), img = o.createImageData(N, N), d = img.data;
    const rn = seeded(31), blobs = []; for (let i = 0; i < 26; i++) blobs.push({ th: rn() * 360, r: 0.58 + rn() * 0.4, s: 0.03 + rn() * 0.04, a: (rn() - 0.5) * 0.3 });
    const toXY = (th, r) => [r * Math.sin(deg(th)), r * Math.cos(deg(th))];
    const path = (pts) => pts.map((q) => toXY(q[0], q[1]));
    const slab1 = path([[-62, 0.995], [-68, 0.93], [-75, 0.86], [-82, 0.78], [-88, 0.7], [-92, 0.62], [-94, 0.57]]);
    const slab2 = path([[62, 0.995], [70, 0.92], [78, 0.85], [85, 0.77], [90, 0.69], [93, 0.62]]);
    const plume = []; for (let r = 0.56; r <= 1.0; r += 0.04) plume.push(toXY(128 + Math.sin(r * 9) * 2, r));
    const segD = (px, py, P) => { let m = 1e9; for (let i = 0; i < P.length - 1; i++) { const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1], vx = bx - ax, vy = by - ay, f = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1); m = Math.min(m, Math.hypot(px - ax - vx * f, py - ay - vy * f)); } return m; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const nx = (x + 0.5 - key) / key, ny = -(y + 0.5 - key) / key, r = Math.hypot(nx, ny), i4 = (y * N + x) * 4;
      if (r > 1) { d[i4 + 3] = 0; continue; }
      let col;
      if (r < RCf) col = [226, 232, 240];
      else {
        const th = (Math.atan2(nx, ny) * 180) / Math.PI;
        let v = 0;
        v -= Math.exp(-Math.pow(segD(nx, ny, slab1) / 0.05, 2)) * 1.0;
        v -= Math.exp(-Math.pow(segD(nx, ny, slab2) / 0.05, 2)) * 0.85;
        v += Math.exp(-Math.pow((r - 0.66) / 0.12, 2) - Math.pow(dth(th, -150) / 24, 2)) * 1.0;
        v += Math.exp(-Math.pow((r - 0.66) / 0.12, 2) - Math.pow(dth(th, 25) / 22, 2)) * 0.9;
        v += Math.exp(-Math.pow(segD(nx, ny, plume) / 0.035, 2)) * 0.85;
        blobs.forEach((b) => { const q = toXY(b.th, b.r); v += b.a * Math.exp(-(Math.pow(nx - q[0], 2) + Math.pow(ny - q[1], 2)) / (b.s * b.s)); });
        v = clamp(v, -1, 1);
        col = v >= 0 ? [255 - v * (255 - 220), 255 - v * (255 - 38), 255 - v * (255 - 38)] : [255 + v * (255 - 29), 255 + v * (255 - 78), 255 + v * (255 - 216)];
        col = [col[0] * 0.97 + 8, col[1] * 0.97 + 8, col[2] * 0.97 + 8];
      }
      d[i4] = col[0]; d[i4 + 1] = col[1]; d[i4 + 2] = col[2]; d[i4 + 3] = 255;
    }
    o.putImageData(img, 0, 0); return (TOMO_IMG[key] = c);
  }
  function drawTomo(t, dt) {
    const { A, B } = RC4, g = gridGeo();
    card(A, '🧩 2×2 격자 퍼즐: 어느 칸이 느릴까?');
    CELLS.forEach((id) => {
      const c = g.cell(id), sel = S.slow === id;
      const fill = sel ? (S.reason === 'cold' ? '#93c5fd' : S.reason === 'hot' ? '#fca5a5' : '#fde68a') : '#f1f5f9';
      ctx.globalAlpha = 0.9; D.shadow(() => { ctx.fillStyle = fill; rr(c.x + 3, c.y + 3, c.w - 6, c.h - 6, 10).fill(); }, { blur: 4, y: 1 }); ctx.globalAlpha = 1;
      ctx.strokeStyle = sel ? '#b91c1c' : '#94a3b8'; ctx.lineWidth = sel ? 3.4 : 1.8; rr(c.x + 3, c.y + 3, c.w - 6, c.h - 6, 10).stroke();
      D.text(c.x + c.w / 2, c.y + c.h / 2 + 7, id, { size: 22, weight: 800, color: sel ? '#7f1d1d' : '#64748b' });
      if (sel) D.text(c.x + c.w / 2, c.y + c.h - 14, '느린 칸?', { size: 12, weight: 800, color: '#b91c1c' });
    });
    ctx.globalAlpha = 0.88;
    const colp = ['#2563eb', '#0ea5e9', '#7c3aed', '#a855f7'];
    PATHS.forEach((p, k) => {
      const horiz = k < 2, idx = k % 2;
      const c0 = g.cell(horiz ? (idx ? 'c' : 'a') : (idx ? 'b' : 'a')), cy0 = c0.y + c0.h / 2, cx0 = c0.x + c0.w / 2;
      const ok = !S.slow ? null : predOf(p) === p.obs;
      const col = ok == null ? colp[k] : ok ? '#16a34a' : '#dc2626';
      if (horiz) { D.arrow(g.x - 40, cy0, g.x + g.cs * 2 + 6, cy0, { color: col, width: 3.4, head: 11 }); D.label(g.x + g.cs * 2 + 38 * (PHONE ? 0.9 : 1), cy0, '+' + p.obs + ' s', { bg: col, size: 13, pad: 7 }); D.text(g.x - 44, cy0 - 8, '경로' + (idx + 1), { size: 12.5, weight: 800, color: col, align: 'right' }); }
      else { D.arrow(cx0, g.y - 36, cx0, g.y + g.cs * 2 + 8, { color: col, width: 3.4, head: 11 }); D.label(cx0, g.y + g.cs * 2 + 28, '+' + p.obs + ' s', { bg: col, size: 13, pad: 7 }); D.text(cx0, g.y - 42, '경로' + (idx + 3), { size: 12.5, weight: 800, color: col }); }
    });
    ctx.globalAlpha = 1;
    // 표
    const ty = g.y + g.cs * 2 + (PHONE ? 52 : 62), x0 = A.x + 14, cw = PHONE ? [150, 100, 100, 70] : [118, 62, 62, 52];
    if (!PHONE) ['경로', '관측', '내 예측', '일치'].forEach((h, i) => D.text(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, ty, h, { size: 12.5, weight: 800, color: '#64748b' }));
    PATHS.forEach((p, k) => {
      const y = ty + 8 + k * (PHONE ? 0 : 28), yy = PHONE ? ty + 8 : y;
      if (PHONE && k > 0) return;
    });
    const rowH = PHONE ? 11 : 26;
    if (!PHONE) PATHS.forEach((p, k) => {
      const y = ty + 10 + k * rowH * 1.08, pr = predOf(p), ok = S.slow ? pr === p.obs : null;
      ctx.fillStyle = ok == null ? '#f8fafc' : ok ? 'rgba(22,163,74,.14)' : 'rgba(220,38,38,.12)'; rr(x0 - 4, y, A.w - 20, rowH, 7).fill();
      [p.nm, '+' + p.obs + ' s', S.slow ? '+' + pr + ' s' : '—', ok == null ? '' : ok ? '✅' : '❌'].forEach((tx, i) => D.text(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, y + 18, tx, { size: 12.5, weight: 800, color: '#334155' }));
    });
    if (PHONE) {
      const s2 = PATHS.map((p) => (S.slow ? (predOf(p) === p.obs ? '✅' : '❌') : '⬜')).join(' ');
      D.text(A.x + A.w / 2, g.y + g.cs * 2 + 56, '경로 1~4 일치: ' + s2, { size: 13.5, weight: 800, color: '#334155' });
    }
    const all = S.slow && PATHS.every((p) => predOf(p) === p.obs);
    drawWrap(A.x + A.w / 2, A.y + A.h - (PHONE ? 30 : 48), S.slow ? (all ? '네 경로의 지연 시간이 모두 맞아요! 느린 칸은 ' + S.slow + '예요.' : '관측과 맞지 않는 경로(빨강)가 있어요. 다른 칸을 눌러 봐요.') : '칸을 눌러 "이 칸이 +2 s 느리다"고 가정해 봐요.', A.w - 30, 13, { color: all ? '#15803d' : '#475569', weight: 800 });

    // 영상
    card(B, '🌍 지구 단면의 속도 편차 (예시 영상)');
    const Re = Math.min(B.w / 2 - 20, (B.h - 100) / 2), ex = B.x + B.w / 2, ey = B.y + 40 + Re;
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, Re, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.drawImage(tomoImage(Re), ex - Math.round(Re), ey - Math.round(Re), Math.round(Re) * 2, Math.round(Re) * 2);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, Re, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey, Re * RCf, 0, TAU); ctx.stroke();
    D.text(ex, ey + 5, '핵', { size: 14, weight: 800, color: '#64748b' });
    TOMO_MK.forEach((m) => { const px = ex + Re * m.r * Math.sin(deg(m.th)), py = ey - Re * m.r * Math.cos(deg(m.th)); D.sphere(px, py, 12, '#0f172a', { text: m.id, textScale: 1.0 }); D.ring(px, py, 17, t + (m.id.charCodeAt(0) % 3) * 0.3, { color: '#facc15', width: 2.4 }); });
    // 색 막대
    const cb = { x: B.x + 30, y: B.y + B.h - (PHONE ? 60 : 34), w: B.w - 60, h: 14 }, gr = ctx.createLinearGradient(cb.x, 0, cb.x + cb.w, 0);
    gr.addColorStop(0, '#dc2626'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gr; ctx.fillRect(cb.x, cb.y, cb.w, cb.h); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);
    D.text(cb.x, cb.y - 5, '지진파 속도 느림 (뜨거움)', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(cb.x + cb.w, cb.y - 5, '빠름 (차가움)', { size: 12.5, weight: 800, color: '#1d4ed8', align: 'right' });
    drawWrap(B.x + B.w / 2, B.y + B.h - (PHONE ? 22 : 8), '예시 영상이에요. 실제 영상은 연구 기관의 지진파 단층 촬영 자료에서 확인해 보세요.', B.w - 24, 11.5, { color: '#64748b' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { crust: '📈 지각 두께', disc: '📉 속도 불연속', shadow: '🌐 암영대', tomo: '🧩 단층 촬영' };
  const FREE_KEYS = { crust: ['regBtns', 'sCx', 'bShoot'], disc: ['sDp'], shadow: ['shWave', 'sDl'], tomo: ['reasonBtns'] };
  let ctlKeys = [];
  const clsReg = makeClassify($('#clsReg'), [{ id: 'A', label: '지역 A (교차 거리 160 km)' }, { id: 'B', label: '지역 B (교차 거리 37 km)' }],
    [{ id: 'cont', label: '대륙 지각' }, { id: 'ocean', label: '해양 지각' }], { A: 'cont', B: 'ocean' }, () => { });
  const clsTab = makeClassify($('#clsTab'), [60, 110, 120, 150, 170].map((d) => ({ id: 'd' + d, label: '관측점 ' + d + '°' })),
    [{ id: 'both', label: 'P·S 모두' }, { id: 'P', label: 'P파만' }, { id: 'S', label: 'S파만' }, { id: 'none', label: '둘 다 ×' }],
    { d60: 'both', d110: 'none', d120: 'none', d150: 'P', d170: 'P' }, () => { });
  const selTomo = makeSelects($('#selTomo'), [
    { id: 'A', label: 'A: 파랑, 지표 부근에서 아래로 길게 뻗어요' },
    { id: 'B', label: 'B: 빨강, 맨틀 바닥(핵 경계) 위에 넓게 퍼져요' },
    { id: 'C', label: 'C: 빨강, 핵 경계에서 지표 쪽으로 좁은 기둥이에요' },
  ], [{ id: 'slab', label: '섭입한 판 (차갑고 빠름)' }, { id: 'plume', label: '플룸 (뜨겁고 느림)' }, { id: 'super', label: '슈퍼플룸 (대규모 뜨거운 상승 영역)' }],
  { A: 'slab', B: 'super', C: 'plume' }, () => { });

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

  function syncCx() {
    const R = REG[S.reg], s = $('#sCx'); s.max = R.xmax; s.step = R.pos;
    setSlider(s, $('#oCx'), S.cx[S.reg], (x) => (+x > 0 ? x + ' km' : '—'));
  }
  function syncH() { setSlider($('#sH'), $('#oH'), S.ans[S.reg], (x) => (+x > 0 ? x + ' km' : '—')); }
  function syncReg() { $$('#regBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.r === S.reg)); }
  function setReg(r) { S.reg = r; S.fade = 1; S.rt = 0; S.rtOn = false; syncReg(); syncCx(); syncH(); }
  $$('#regBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setReg(b.dataset.r); }));
  SciSim.bindRange($('#sCx'), $('#oCx'), (x) => (+x > 0 ? x + ' km' : '—'), (v) => { S.cx[S.reg] = +v; });
  SciSim.bindRange($('#sH'), $('#oH'), (x) => (+x > 0 ? x + ' km' : '—'), (v) => { S.ans[S.reg] = +v; });
  $('#bShoot').addEventListener('click', () => { Sound.click(); if (S.cx[S.reg] <= 0) { say('먼저 그래프를 눌러 관측소 위치를 정해요.', true, 2.4); return; } shoot(); });
  SciSim.bindRange($('#sDp'), $('#oDp'), (v) => Math.round(depthOfS(+v)) + ' km', (v) => { S.dp = +v; });
  function setDp(v) { S.dp = v; setSlider($('#sDp'), $('#oDp'), v, (x) => Math.round(depthOfS(+x)) + ' km'); }
  function syncSh() { $$('#shBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.w === S.shW)); }
  $$('#shBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.shW = b.dataset.w; syncSh(); }));
  SciSim.bindRange($('#sDl'), $('#oDl'), (v) => v + '°', (v) => { S.dl = +v; S.seenDl[v] = true; });
  SciSim.bindRange($('#sLo'), $('#oLo'), (v) => v + '°', (v) => { S.lo = +v; });
  SciSim.bindRange($('#sHi'), $('#oHi'), (v) => v + '°', (v) => { S.hi = +v; });
  function setDl(v) { S.dl = v; setSlider($('#sDl'), $('#oDl'), v, (x) => x + '°'); }
  function setLoHi(a, b) { S.lo = a; S.hi = b; setSlider($('#sLo'), $('#oLo'), a, (x) => x + '°'); setSlider($('#sHi'), $('#oHi'), b, (x) => x + '°'); }
  function syncTomo() { $$('#reasonBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.reason)); }
  $$('#reasonBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.reason = S.reason === b.dataset.k ? null : b.dataset.k; syncTomo(); }));
  $('#bSlow').addEventListener('click', () => { Sound.click(); S.slow = null; S.reason = null; syncTomo(); });

  SciSim.pointer(view, {
    down(p) {
      if (!game || !(game.free || game.has(S.mode))) return false;
      if (S.mode === 'crust') {
        const g = grGeo();
        if (p.x >= g.x - 6 && p.x <= g.x + g.w + 6 && p.y >= g.y - 4 && p.y <= g.y + g.h + 4) { dragG = true; setCx(xOfPx(g, p.x)); return true; }
      } else if (S.mode === 'disc') vClick(p);
      else if (S.mode === 'tomo') tomoDown(p);
      return false;
    },
    move(p) { if (S.mode === 'crust' && dragG) setCx(xOfPx(grGeo(), p.x)); },
    up() { dragG = false; },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = []; flash.t = 0;
    S.cx = { A: 0, B: 0 }; S.ans = { A: 0, B: 0 }; S.rt = 0; S.rtOn = false; setReg('A'); clsReg.reset();
    S.found = {}; S.miss = 0; setDp(0);
    S.shW = 'P'; syncSh(); setDl(60); setLoHi(90, 130); S.seenDl = {}; S.bandK = 0; clsTab.reset();
    S.slow = null; S.reason = null; syncTomo(); selTomo.reset();
    if (li === 0) { setMode('crust'); setCtl(['regBtns', 'sCx', 'sH', 'bShoot']); showHint('그래프에서 두 직선이 만나는 곳을 찾아봐요', 5200); }
    else if (li === 1) { setMode('disc'); setCtl(['sDp']); showHint('탐침을 내려 보며 속도가 급하게 변하는 곳을 찾아요', 5200); }
    else if (li === 2) { setMode('shadow'); setCtl(['shWave', 'sDl']); showHint('관측점 각도를 바꿔 P파와 S파가 오는지 봐요', 5200); }
    else { setMode('tomo'); setCtl(['reasonBtns']); showHint('격자의 칸을 눌러 어느 칸이 느린지 가정해 봐요', 5200); }
    updateCtl();
  }
  const levels = [
    {
      title: '지각 두께: 직접파와 굴절파', short: '지각 두께', icon: '📈', phase: '분석', features: ['crust'],
      intro: '<p class="si-q">❓ 탐구 질문: 아무도 가 보지 못한 땅속 수천 km를 지진파만으로 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 지진파의 종류와 속도(P파 6.0 km/s, S파 3.5 km/s), 그리고 주시 곡선을 배웠어요. 지진파는 지구 내부에서 속도가 바뀌는 곳을 만나면 굴절해요. 이번 차시는 그 흔적을 읽어 지구 내부를 알아내요.</div>' +
        '<p>진원 가까이에서는 지각을 곧바로 지난 <b>직접파</b>가 먼저 도착하고, 멀리에서는 지각 아래 <b>상부 맨틀(8.0 km/s)</b>의 윗면을 따라 달린 <b>굴절파</b>가 먼저 도착해요. 두 직선이 만나는 <b>교차 거리</b>로 지각의 두께를 구해요. 지각과 맨틀의 경계는 1909년 모호로비치치가 발견해 <b>모호면</b>이라고 불러요. (예시 자료)</p>',
      setup() { resetStep(0); },
      recap: '직접파와 굴절파의 주시 곡선이 만나는 교차 거리에서 H = (x_c/2)·√((v₂−v₁)/(v₂+v₁))로 지각의 두께를 구해요. 대륙 지각은 두껍고 해양 지각은 얇아요.',
      summary: '<ul><li>지각 속도 v₁ = 6.0 km/s, 상부 맨틀 v₂ = 8.0 km/s(예시). 직접파 t = x/v₁, 모호면 굴절파 t = x/v₂ + tᵢ.</li><li>두 직선이 만나는 <b>교차 거리 x_c</b>: H = (x_c/2)·√((v₂ − v₁)/(v₂ + v₁)) = 0.378 × (x_c/2).</li><li>한반도 부근 x_c = 160 km → H ≈ 30 km, 해양 x_c = 37 km → H ≈ 7 km. 대륙 지각 평균 약 35 km, 해양 지각 약 5~7 km, 히말라야 아래 약 70 km.</li><li>x_c보다 먼 곳에서는 속도가 큰 맨틀 윗면을 따라 온 <b>굴절파가 더 먼저</b> 도착해요. 모호면은 모호로비치치가 1909년에 발견했어요.</li><li>지구시스템 연계: 지진파는 지권의 층 구조를 알려 주는 탐침이에요.</li></ul>',
      missions: [
        {
          title: '지역 A의 지각 두께',
          goal: '지역 A 그래프에서 두 직선이 만나는 <b>교차 거리</b>를 찾고, 공식으로 구한 <b>지각 두께 H(약 30 km)</b>를 입력해요.',
          hint: '그래프를 눌러 끌면 점선이 움직여요. 두 직선의 시간 차가 0이 되는 곳이 교차 거리예요. H = 0.378 × (x_c/2)로 계산해 슬라이더로 입력해요.',
          setup() { S.cx.A = 0; S.ans.A = 0; setReg('A'); setMode('crust'); setCtl(['regBtns', 'sCx', 'sH', 'bShoot']); },
          check: () => okReg('A'), hold: 0.5,
          status: () => mark(S.cx.A > 0 && Math.abs(S.cx.A - REG.A.xc) <= REG.A.tol) + ' 교차 거리 ' + (S.cx.A > 0 ? S.cx.A + ' km' : '—') + ' · ' + mark(Math.abs(S.ans.A - Hof('A')) <= 1.3 && S.ans.A > 0) + ' 입력한 지각 두께 ' + (S.ans.A > 0 ? S.ans.A + ' km' : '—'),
          explain: '교차 거리 x_c = <b>160 km</b>이므로 H = 0.378 × (160/2) ≈ <b>30 km</b>예요. 한반도 부근 대륙 지각의 두께와 비슷해요.',
        },
        {
          title: '대륙 지각과 해양 지각 판별', manual: true,
          goal: '지역 B에서도 교차 거리(약 37 km)와 지각 두께(약 7 km)를 구한 뒤, 지역 A·B를 <b>대륙 지각 / 해양 지각</b>으로 판별해요.',
          hint: '지역 B 단추를 누르고 같은 방법으로 해 봐요. H = 0.378 × (x_c/2)예요. 지각이 두꺼우면 대륙, 얇으면 해양이에요.',
          setup() { clsReg.reset(); setReg('B'); setMode('crust'); setCtl(['regBtns', 'sCx', 'sH', 'clsReg']); },
          status: () => mark(okReg('A')) + ' 지역 A · ' + mark(okReg('B')) + ' 지역 B(교차 ' + (S.cx.B > 0 ? S.cx.B + ' km' : '—') + ', H ' + (S.ans.B > 0 ? S.ans.B + ' km' : '—') + ') · ' + mark(clsReg.ok()) + ' 판별 ' + clsReg.count() + '/2',
          check() {
            if (!okReg('A')) return '지역 A의 교차 거리와 지각 두께(약 30 km)를 먼저 구해 주세요.';
            if (!okReg('B')) return '지역 B의 교차 거리(약 37 km)와 지각 두께(약 7 km)를 구해 주세요.';
            if (!clsReg.complete()) return '두 지역을 모두 판별해 주세요.';
            if (!clsReg.ok()) { clsReg.mark(clsReg.wrong()); return '빨간 지역이 달라요. 지각 두께가 두꺼운지 얇은지 비교해 봐요.'; }
            return true;
          },
          explain: '지역 A는 H ≈ 30 km로 두꺼운 <b>대륙 지각</b>, 지역 B는 H ≈ 7 km로 얇은 <b>해양 지각</b>이에요. 대륙 지각 평균은 약 35 km, 해양 지각은 약 5~7 km예요.',
        },
        {
          type: 'quiz', title: '굴절파가 먼저 도착하는 까닭',
          goal: '교차 거리보다 먼 관측소에서 <b>굴절파가 직접파보다 먼저</b> 도착하는 까닭은?',
          setup() { setMode('crust'); setCtl(['regBtns', 'sCx', 'bShoot']); },
          choices: ['굴절파가 직접파보다 훨씬 짧은 경로로 오기 때문이에요.', '굴절파는 더 깊은 곳, 속도가 큰 상부 맨틀의 윗면을 따라 달려 경로가 길어도 시간을 벌기 때문이에요.', '굴절파는 지표에서 에너지를 더 얻기 때문이에요.', '먼 거리에서는 직접파가 사라지기 때문이에요.'],
          answer: 1,
          feedback: ['굴절파의 경로가 더 길어요. 하지만 더 빠른 곳을 지나가요.', '', '파의 에너지가 아니라 지나는 곳의 속도 차이 때문이에요.', '직접파도 도착하지만 더 늦을 뿐이에요.'],
          explain: '모호면 아래 맨틀 물질은 지각보다 <b>단단하고 무거워서</b> 지진파 속도가 급증해요(6.0 → 8.0 km/s). 먼 거리에서는 이 빠른 층을 따라 온 <b>굴절파가 더 먼저</b> 도착해요.',
        },
      ],
    },
    {
      title: '속도 불연속: 층의 경계를 찾아라', short: '속도 불연속', icon: '📉', phase: '탐구', features: ['disc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모호면에서 지진파 속도가 급증하는 것을 확인했어요. 지구 깊은 곳에도 이런 경계가 더 있을까요? 지진파 속도를 깊이에 따라 그려 봐요.</div>' +
        '<p>P파와 S파의 속도–깊이 그래프(단순화한 모델)를 따라 내려가며 <b>속도가 급하게 변하는 곳</b>을 찾고 지구의 층과 연결해요. 속도가 크게 바뀌는 곳이 물질의 종류나 상태가 바뀌는 경계예요.</p>',
      setup() { resetStep(1); },
      recap: '속도가 급변하는 모호면(약 35 km), 410·660 km 전이대, 맨틀-핵 경계(2891 km), 내핵 경계(5150 km)가 지구 내부의 층을 나눠요. 외핵에서는 P파 속도가 급감하고 S파가 사라져요.',
      summary: '<ul><li>속도 불연속면: <b>모호면</b>(약 35 km) · 410·660 km 전이대 · <b>구텐베르크 불연속면</b>(맨틀–외핵, 2891 km) · <b>레만 불연속면</b>(외핵–내핵, 5150 km).</li><li>속도(P/S, km/s, 단순화): 지각 6.0/3.5 → 맨틀 8.0/4.5 ~ 13.7/7.3 → 외핵 8.0/0 ~ 10.4/0 → 내핵 11.0/3.5.</li><li>외핵에서 <b>S파 속도 0</b>, P파 속도 급감 → 외핵은 <b>액체</b>.</li><li>밀도(g/cm³): 지각 2.7~2.9, 맨틀 3.4~5.6, 외핵 약 10~12, 내핵 약 13.</li></ul>',
      missions: [
        {
          title: '속도 급변 지점 4곳 찾기',
          goal: '그래프에서 속도가 급하게 변하는 곳 <b>4곳</b>(모호면 · 410·660 km 전이대 · 맨틀-핵 경계 · 내핵 경계)을 눌러요.',
          hint: '곡선이 수평으로 꺾여 속도가 갑자기 달라지는 곳이에요. 깊이 눈금이 √ 간격이라 위쪽이 넓게 보여요. 전이대는 410~660 km 사이 띠를 눌러요.',
          setup() { S.found = {}; S.miss = 0; setMode('disc'); setCtl(['sDp']); },
          check: () => JUMPS.every((j) => S.found[j.id]), hold: 0.4,
          status: () => JUMPS.map((j) => mark(S.found[j.id]) + ' ' + j.nm.split(' ')[0]).join(' · ') + ' (헛짚음 ' + S.miss + '번)',
          explain: '속도가 급하게 변하는 <b>모호면</b>, <b>410·660 km 전이대</b>, <b>맨틀-핵 경계(2891 km)</b>, <b>내핵 경계(5150 km)</b>가 지구의 층 경계예요.',
        },
        {
          type: 'quiz', title: '2900 km에서 일어나는 일',
          goal: '깊이 약 2900 km에서 <b>P파 속도가 급감</b>하고 <b>S파가 사라지는</b> 것은 무엇을 뜻할까요?',
          setup() { setMode('disc'); setCtl(['sDp']); },
          choices: ['그 아래에 지진파를 모두 흡수하는 물질이 있다는 뜻이에요.', '그 아래가 액체 상태(외핵)라는 뜻이에요. S파는 액체를 통과하지 못하고 P파는 느려져요.', '그 아래가 더 단단한 고체라는 뜻이에요.', '지진파가 그곳에서 모두 반사된다는 뜻이에요.'],
          answer: 1,
          feedback: ['P파는 느려질 뿐 계속 진행해요. 사라지는 것은 S파뿐이에요.', '', '더 단단한 고체라면 속도가 커져야 해요.', '일부는 반사되지만, S파가 사라지는 까닭은 액체이기 때문이에요.'],
          explain: 'S파는 <b>액체를 통과하지 못하고</b> P파 속도도 급감하므로, 깊이 2900 km 아래의 <b>외핵은 액체</b>예요. 앞 차시에서 배운 S파의 성질이 이렇게 쓰여요.',
        },
      ],
    },
    {
      title: '암영대: 외핵이 액체라는 증거', short: '암영대', icon: '🌐', phase: '모형', features: ['shadow'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 깊이 2900 km에서 속도가 급변하는 것을 확인했어요. 이 경계 때문에 지구 표면에는 지진파가 도착하지 않는 구역이 생겨요.</div>' +
        '<p>진원에서 퍼지는 P파와 S파의 경로를 지구 단면에서 따라가 봐요. 관측점의 <b>진앙각 Δ</b>(진원과 이루는 중심각)를 바꿔 P파와 S파가 도착하는지 살펴보면 <b>암영대</b>를 알 수 있어요. (경로는 단순화한 모형이에요.)</p>',
      setup() { resetStep(2); },
      recap: 'P파는 외핵에서 굴절해 진앙각 103°~142°에 도착하지 못하고(암영대), S파는 액체인 외핵을 통과하지 못해 103° 너머에 도착하지 않아요.',
      summary: '<ul><li><b>P파 암영대</b>: 진앙각 103°~142°. 외핵으로 들어가며 굴절해 도달하지 못해요. 142° 이후에는 핵을 통과해 늦게 도착해요.</li><li><b>S파 암영대</b>: 103° 이후 전부. 외핵이 액체라 S파가 통과하지 못해요 → <b>외핵은 액체</b>.</li><li><b>내핵</b>: 레만(1936)이 P파 암영대 안에서 약한 P파를 발견 → 내핵에서 굴절·반사된 것으로 해석.</li><li>지구시스템 연계: 지진파의 경로가 지권의 내부 상태(고체/액체)를 알려 줘요.</li></ul>',
      missions: [
        {
          title: '암영대 기록표', manual: true,
          goal: '관측점 5곳(60°·110°·120°·150°·170°)에서 <b>P파와 S파가 오는지</b> 표에 기록하고, P파 암영대의 <b>시작·끝 각도</b>를 맞춰요.',
          hint: '관측점 슬라이더를 각 각도에 맞춰 오른쪽 카드를 읽어요. 표가 맞으면 지구 그림에 암영대 띠가 나타나요. 띠의 각도를 읽어 시작·끝 슬라이더를 맞춰요.',
          setup() { clsTab.reset(); S.bandK = 0; setLoHi(90, 130); setMode('shadow'); setCtl(['shWave', 'sDl', 'clsTab', 'sLo', 'sHi']); },
          status: () => mark(clsTab.ok()) + ' 기록표 ' + clsTab.count() + '/5 · ' + mark(S.lo === 103 && S.hi === 142) + ' P파 암영대 ' + S.lo + '°~' + S.hi + '°',
          check() {
            if (!clsTab.complete()) return '관측점 5곳을 모두 기록해 주세요. (지금 ' + clsTab.count() + '곳)';
            if (!clsTab.ok()) { clsTab.mark(clsTab.wrong()); return '빨간 관측점이 달라요. 그 각도에 관측점을 놓고 P파·S파 카드를 다시 읽어 봐요.'; }
            if (S.lo !== 103 || S.hi !== 142) return '표는 맞아요! 이제 지구 그림의 띠에서 P파 암영대의 시작과 끝 각도(103°~142°)를 슬라이더로 맞춰 주세요.';
            return true;
          },
          explain: 'P파는 <b>0°~103°</b>와 <b>142° 이후</b>에 도착하고 <b>103°~142°</b>는 암영대예요. S파는 <b>103°</b>를 넘으면 도착하지 못해요. (120°에서는 내핵에서 반사된 아주 약한 P파만 와요.)',
        },
        {
          type: 'quiz', title: '암영대로 알아낸 것',
          goal: 'S파가 103° 너머에 도착하지 않는 것과 레만의 발견을 바르게 설명한 것은?',
          setup() { setMode('shadow'); setCtl(['shWave', 'sDl']); },
          choices: ['S파가 내핵에서 모두 흡수되기 때문이고, 레만은 S파 암영대 안에서 약한 S파를 발견했어요.', 'S파는 액체인 외핵을 통과하지 못해 103° 너머에 오지 않아요. 레만은 P파 암영대 안에서 약한 P파를 발견해 내핵에서 굴절·반사된 것으로 해석했어요.', 'S파는 맨틀에서 소멸하기 때문이고, 레만은 표면파로 내핵을 발견했어요.', 'P파가 외핵을 통과하지 못해서 암영대가 생겨요.'],
          answer: 1,
          feedback: ['S파는 외핵(액체)에서 막혀요. 내핵에서 흡수되는 것이 아니에요.', '', 'S파가 사라지는 곳은 맨틀이 아니라 외핵이에요.', 'P파는 외핵을 통과하지만 크게 굴절해서 103°~142°에 도달하지 못해요.'],
          explain: 'S파 암영대는 <b>외핵이 액체</b>라는 증거예요. P파 암영대 안에 도달한 약한 P파는 <b>내핵 경계(레만 불연속면)</b>에서 굴절·반사된 것으로, 레만이 1936년에 내핵의 존재를 알아낸 근거예요.',
        },
      ],
    },
    {
      title: '단층 촬영: 속도 편차로 보는 지구', short: '단층 촬영', icon: '🧩', phase: '분석', features: ['tomo'],
      intro: '<div class="si-link">🔗 <b>앞 차시(판을 움직이는 힘과 플룸)에서</b> 플룸 구조의 증거로 지진파 단층 촬영 영상을 읽어 봤어요. 이제 그 원리를 알아봐요. 많은 지진과 관측소 사이의 <b>도착 시간이 표준 모형보다 빠르거나 느린 정도</b>를 모아 속도 편차의 3차원 지도를 계산해요.</div>' +
        '<p>CT 촬영처럼 여러 방향의 경로를 겹쳐 안쪽을 알아내요. 지진파 속도가 <b>느린 곳은 뜨겁고</b>(상승하는 플룸), <b>빠른 곳은 차가워요</b>(섭입한 판). (예시 영상이에요.)</p>',
      setup() { resetStep(3); },
      recap: '여러 경로의 지연 시간을 모으면 느린 칸을 알아낼 수 있어요. 지진파 속도가 느린 곳은 뜨거운 플룸, 빠른 곳은 차가운 섭입한 판이에요.',
      summary: '<ul><li><b>지진파 단층 촬영</b>: 많은 경로의 도착 시간이 표준 모형보다 빠르거나 느린 정도를 모아 속도 편차의 3차원 지도를 계산해요.</li><li>속도 <b>느림 = 뜨거움</b>(상승하는 플룸, 아프리카·태평양 아래 슈퍼플룸), 속도 <b>빠름 = 차가움</b>(섭입한 판).</li><li>격자 퍼즐: 가로 경로 1 +2 s, 가로 경로 2 0 s, 세로 경로 1 +2 s, 세로 경로 2 0 s → 칸 a만 +2 s 느려요.</li><li>속도는 온도뿐 아니라 조성에도 영향을 받아요. (예시 영상)</li></ul>',
      missions: [
        {
          title: '가장 느린 칸 찾기',
          goal: '격자에서 <b>가장 느린 칸</b>을 찾아 누르고, 그 이유(<b>뜨거워요</b> 또는 <b>차가워요</b>)를 골라요.',
          hint: '느린 칸을 지나는 경로만 지연돼요. 지연이 +2 s인 경로는 가로 1과 세로 1이에요. 그 두 경로가 겹치는 칸이 느린 칸이에요. 느리다 = 뜨겁다예요.',
          setup() { S.slow = null; S.reason = null; syncTomo(); setMode('tomo'); setCtl(['reasonBtns']); },
          check: () => S.slow === 'a' && S.reason === 'hot', hold: 0.5,
          status: () => mark(S.slow === 'a') + ' 느린 칸 ' + (S.slow || '—') + ' · ' + mark(S.reason === 'hot') + ' 이유 ' + (S.reason === 'hot' ? '뜨거워요' : S.reason === 'cold' ? '차가워요' : '—'),
          explain: '가로 경로 1(a+b)과 세로 경로 1(a+c)만 +2 s 늦으므로 두 경로가 겹치는 <b>칸 a</b>가 느려요. 지진파 속도가 느린 곳은 보통 <b>온도가 높은 곳</b>이에요.',
        },
        {
          title: '영상 속 구조 해석', manual: true,
          goal: '예시 영상의 <b>A · B · C</b>가 각각 <b>섭입한 판 · 플룸 · 슈퍼플룸</b> 중 무엇인지 색과 위치로 해석해요.',
          hint: '파랑은 빠름(차가움), 빨강은 느림(뜨거움)이에요. 핵 경계에서 넓게 퍼지면 슈퍼플룸, 좁은 기둥이면 플룸이에요.',
          setup() { selTomo.reset(); setMode('tomo'); setCtl(['reasonBtns', 'selTomo']); },
          status: () => mark(selTomo.ok()) + ' 해석한 구조 ' + selTomo.count() + ' / 3',
          check() {
            if (!selTomo.complete()) return 'A·B·C를 모두 해석해 주세요. (지금 ' + selTomo.count() + '개)';
            if (!selTomo.ok()) { selTomo.mark(selTomo.wrong()); return '빨간 항목이 달라요. 색(파랑/빨강)과 위치(지표 쪽/핵 경계 쪽), 모양(넓게/좁게)을 다시 봐요.'; }
            return true;
          },
          explain: '<b>A</b>(파랑)는 지표에서 가라앉은 차가운 <b>섭입한 판</b>, <b>B</b>(빨강, 핵 경계에 넓게)는 대규모 상승 영역인 <b>슈퍼플룸</b>, <b>C</b>(빨강, 좁은 기둥)는 열점 아래의 <b>플룸</b>이에요.',
        },
        {
          type: 'quiz', title: 'CT 촬영과 닮은 점',
          goal: '지진파 단층 촬영이 의료용 CT 촬영과 비슷하다고 하는 까닭은?',
          setup() { setMode('tomo'); setCtl(['reasonBtns']); },
          choices: ['지구에 X선을 쏘아서 내부를 찍기 때문이에요.', '여러 방향으로 지나온 신호(도착 시간)의 차이를 모아 내부의 입체 모습을 계산해 내기 때문이에요.', '지구 속에 카메라를 내려 보내 직접 찍기 때문이에요.', '지진파가 모든 곳에서 같은 속도로 지나가기 때문이에요.'],
          answer: 1,
          feedback: ['X선이 아니라 지진파를 이용해요.', '', '지구 속 깊은 곳에는 카메라를 보낼 수 없어요.', '속도가 다르기 때문에 지연 시간의 차이로 내부를 알 수 있어요.'],
          explain: '여러 방향의 경로에서 얻은 <b>도착 시간의 지연</b>을 컴퓨터로 겹쳐 내부를 입체적으로 복원해요. 지진파 속도는 <b>온도와 조성</b>에 따라 달라서 지구 내부의 뜨겁고 차가운 곳을 알려 줘요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-earth-interior', mount: '#game', badge: '지구 탐사대', homeHref: '../../index.html#hs',
    featureLabels: { crust: '📈 직접파 · 굴절파 주시 곡선', disc: '📉 속도–깊이 그래프', shadow: '🌐 지구 단면의 파선과 암영대', tomo: '🧩 격자 퍼즐 · 예시 영상' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'crust') setReadouts([REG[S.reg].nm, 'x_c ' + (S.cx[S.reg] > 0 ? S.cx[S.reg] + ' km' : '—'), '입력한 지각 두께', S.ans[S.reg] > 0 ? S.ans[S.reg] + ' km' : '—', '맞춘 지역', ['A', 'B'].filter(okReg).length + ' / 2']);
    else if (m === 'disc') { const dep = depthOfS(S.dp), v = velAt(dep); setReadouts(['깊이 · 층', Math.round(dep) + ' km · ' + layerOf(dep), 'P파 · S파 속도', fixn(v.p, 1) + ' · ' + fixn(v.s, 1) + ' km/s', '찾은 경계', JUMPS.filter((j) => S.found[j.id]).length + ' / 4']); }
    else if (m === 'shadow') setReadouts(['진앙각 Δ', S.dl + '°', 'P파', pArr(S.dl) ? '도착 ○' : '도착 ×', 'S파', sArr(S.dl) ? '도착 ○' : '도착 ×']);
    else setReadouts(['느린 칸', S.slow || '—', '이유', S.reason === 'hot' ? '뜨거움' : S.reason === 'cold' ? '차가움' : '—', '일치한 경로', S.slow ? PATHS.filter((p) => predOf(p) === p.obs).length + ' / 4' : '—']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  setTimeout(() => { const B = RC4.B; tomoImage(Math.min(B.w / 2 - 20, (B.h - 100) / 2)); }, 700);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    const T0 = performance.now();
    if (S.mode === 'crust') drawCrust(t, dt);
    else if (S.mode === 'disc') drawDisc(t, dt);
    else if (S.mode === 'shadow') drawShadow(t, dt);
    else drawTomo(t, dt);
    S.dbgMs = performance.now() - T0;
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, REG, Hof, okReg, clsReg, clsTab, selTomo, JUMPS, vGeo, grGeo, gridGeo, predOf, PATHS, pArr, sArr,
    get game() { return game; }, setMode, resetStep, updateCtl, setReg, setDp, setDl, setLoHi, syncTomo, syncSh, shoot,
    setCx(v, r) { if (r) setReg(r); S.cx[S.reg] = v; syncCx(); },
    setAns(v, r) { if (r) setReg(r); S.ans[S.reg] = v; syncH(); },
    findAll() { JUMPS.forEach((j) => { S.found[j.id] = true; }); },
    solveReg() { clsReg.sel = { A: 'cont', B: 'ocean' }; },
    solveTab() { clsTab.sel = { d60: 'both', d110: 'none', d120: 'none', d150: 'P', d170: 'P' }; },
    solveTomo() { selTomo.set('A', 'slab'); selTomo.set('B', 'super'); selTomo.set('C', 'plume'); },
  };
})();
