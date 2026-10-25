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
     산소 대폭발과 철광층 (남세균 → 호상 철광층 → 산소 증가 → 오존층)
     ====================================================== */
  initStage('#eaf1f7', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }

  const S = {
    mode: 'mat', fade: 0, clock: 0, bad: [],
    light: 0, co: 60, o2n: 0, layerGrown: 0, grow: 0, zoomP: 0,
    po: 0, per: true, pEff: 0, stripes: 0, coreShow: false, atm: 0,
    age: 40, ox: 0.1, landK: 0,
    evShow: false,
  };

  /* ======================================================
     장면 1: 남세균 매트와 스트로마톨라이트
     ====================================================== */
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 400 }, B: { x: 8, y: 416, w: 250, h: 270 }, C: { x: 264, y: 416, w: 248, h: 270 } }
    : { A: { x: 12, y: 12, w: 500, h: 536 }, B: { x: 520, y: 12, w: 268, h: 300 }, C: { x: 520, y: 320, w: 268, h: 228 } };
  const MAXSH = 22;
  const CO2D = (() => { const rnd = seeded(5), a = []; for (let i = 0; i < 34; i++) a.push({ x: rnd(), y: rnd(), sp: 14 + rnd() * 10 }); return a; })();
  const BUB1 = [], ZP = [], ZC = [], ZB = [];
  const matPhoto = () => (S.light * S.co) / 100;                 // 광합성 속도 (0~100 %)
  const geoMat = () => {
    const A = RC1.A, sb = { x: A.x + 12, y: A.y + 40, w: A.w - 24, h: A.h - 52 };
    sb.ys = sb.y + sb.h * 0.16; sb.yf = sb.y + sb.h * 0.88; sb.cx = sb.x + sb.w / 2;
    return sb;
  };
  const shellDims = () => {
    const N = Math.min(MAXSH, 3 + S.layerGrown), g = smooth(S.grow);
    const rx0 = PHONE ? 66 : 80, ry0 = PHONE ? 36 : 44, tx = PHONE ? 5.2 : 6.4, ty = PHONE ? 3.8 : 4.8;
    return { N, g, rx0, ry0, tx, ty, rxOut: rx0 + tx * (N - 1) + tx * g, ryOut: ry0 + ty * (N - 1) + ty * g };
  };
  const domeY = (x, sb, d) => { const k = (x - sb.cx) / d.rxOut; return Math.abs(k) >= 1 ? sb.yf : sb.yf - d.ryOut * Math.sqrt(1 - k * k); };
  function matStep(dt) {
    const sb = geoMat(), d = shellDims(), P = matPhoto();
    // 층이 자라요 (시간을 크게 가속)
    S.grow += (P / 100) * 0.4 * dt;
    if (S.grow >= 1) { S.grow -= 1; S.layerGrown++; }
    // 산소 기포
    BUB1.acc = (BUB1.acc || 0) + (P / 100) * 9 * dt;
    while (BUB1.acc >= 1) {
      BUB1.acc -= 1; S.o2n++;
      const th = Math.PI + 0.35 + Math.random() * (Math.PI - 0.7), dd = shellDims();
      BUB1.push({ x: sb.cx + dd.rxOut * Math.cos(th), y: sb.yf + dd.ryOut * Math.sin(th) - 2, r: 3 + Math.random() * 2.2, ph: Math.random() * 6 });
    }
    for (let i = BUB1.length - 1; i >= 0; i--) {
      const b = BUB1[i]; b.y -= 62 * dt; b.x += Math.sin(b.y * 0.08 + b.ph) * 14 * dt;
      if (b.y <= sb.ys + 2) { parts.burst(b.x, sb.ys, { count: 4, speed: 40, life: 0.35, size: 2, gravity: 80, colors: ['#e0f2fe', '#ffffff'] }); BUB1.splice(i, 1); }
    }
    // 확대 그림
    const Z = zoomBox(), cells = zoomCells(Z);
    ZP.acc = (ZP.acc || 0) + (S.light / 100) * 6 * dt; while (ZP.acc >= 1) { ZP.acc -= 1; const c = cells[Math.floor(Math.random() * 3)]; ZP.push({ x: c.x + (Math.random() - 0.5) * c.w * 0.6, y: Z.y + 4, ty: c.y - 2 }); }
    for (let i = ZP.length - 1; i >= 0; i--) { const p = ZP[i]; p.y += 105 * dt; if (p.y >= p.ty) ZP.splice(i, 1); }
    ZC.acc = (ZC.acc || 0) + (S.co / 100) * 5 * dt; while (ZC.acc >= 1) { ZC.acc -= 1; const c = cells[Math.floor(Math.random() * 3)]; ZC.push({ x: c.x + (Math.random() - 0.5) * c.w * 0.7, y: Z.y + 4, ty: c.y - 2, vx: (Math.random() - 0.5) * 10 }); }
    for (let i = ZC.length - 1; i >= 0; i--) { const p = ZC[i]; p.y += 55 * dt; p.x += p.vx * dt; if (p.y >= p.ty) ZC.splice(i, 1); }
    ZB.acc = (ZB.acc || 0) + (P / 100) * 4.5 * dt; while (ZB.acc >= 1) { ZB.acc -= 1; const c = cells[Math.floor(Math.random() * 3)]; ZB.push({ x: c.x + (Math.random() - 0.5) * c.w * 0.5, y: c.y - 6, r: 3 + Math.random() * 2, ph: Math.random() * 6 }); }
    for (let i = ZB.length - 1; i >= 0; i--) { const p = ZB[i]; p.y -= 58 * dt; p.x += Math.sin(p.y * 0.12 + p.ph) * 10 * dt; if (p.y <= Z.y + 6) ZB.splice(i, 1); }
  }
  const zoomBox = () => { const B = RC1.B; return { x: B.x + 12, y: B.y + 40, w: B.w - 24, h: PHONE ? 150 : 170 }; };
  const zoomCells = (Z) => [0, 1, 2].map((i) => ({ x: Z.x + Z.w * (0.2 + 0.3 * i), y: Z.y + Z.h - 46, w: Z.w * 0.26, h: 28 }));
  function drawCell(c, t) {
    ctx.fillStyle = '#4ea34a'; rr(c.x - c.w / 2, c.y, c.w, c.h, 13).fill(); ctx.strokeStyle = '#2f6b2c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(21,83,45,.55)'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(c.x - c.w * 0.36, c.y + 8 + k * 6); ctx.quadraticCurveTo(c.x, c.y + 4 + k * 6 + Math.sin(t * 2 + k) * 1.2, c.x + c.w * 0.36, c.y + 8 + k * 6); ctx.stroke(); }
  }
  function drawMat(t, dt) {
    const { A, B, C } = RC1, sb = geoMat(), d = shellDims(), P = matPhoto();
    matStep(dt);
    card(A, '🌊 얕은 바다 밑의 스트로마톨라이트 (단면)');
    ctx.save(); rr(sb.x, sb.y, sb.w, sb.h, 12).clip();
    const sk = ctx.createLinearGradient(0, sb.y, 0, sb.ys); sk.addColorStop(0, '#dbeafe'); sk.addColorStop(1, '#f0f9ff'); ctx.fillStyle = sk; ctx.fillRect(sb.x, sb.y, sb.w, sb.ys - sb.y);
    const sea = ctx.createLinearGradient(0, sb.ys, 0, sb.yf); sea.addColorStop(0, '#6cc3ee'); sea.addColorStop(1, '#2d7db3'); ctx.fillStyle = sea; ctx.fillRect(sb.x, sb.ys, sb.w, sb.yf - sb.ys);
    ctx.fillStyle = '#dccba4'; ctx.fillRect(sb.x, sb.yf, sb.w, sb.y + sb.h - sb.yf);
    // 햇빛
    const L = S.light / 100;
    if (L > 0.02) for (let k = 0; k < 6; k++) { const x0 = sb.x + 40 + k * 22; ctx.fillStyle = 'rgba(255,248,200,' + (0.05 + 0.13 * L) + ')'; poly([[x0, sb.y + 20], [x0 + 26, sb.y + 20], [x0 + 170 + k * 40, sb.yf], [x0 + 110 + k * 40, sb.yf]]); ctx.fill(); }
    D.glow(sb.x + 52, sb.y + 36, 56, '#fde047', 0.25 + 0.7 * L); D.sphere(sb.x + 52, sb.y + 36, 20, mixc('#fde68a', '#fbbf24', L), { gloss: false });
    D.text(sb.x + 52, sb.y + 78, '빛 ' + S.light + ' %', { size: 13, weight: 800, color: '#92400e' });
    // 이산화 탄소 알갱이 (돔 위에서만 떨어져요)
    const nco = Math.round((S.co / 100) * CO2D.length);
    CO2D.forEach((q, i) => {
      if (i >= nco) return; const x = sb.x + 14 + q.x * (sb.w - 28), span = sb.yf - sb.ys, yy = sb.ys + 10 + ((q.y * span + t * q.sp) % span), yd = domeY(x, sb, d);
      if (yy >= yd - 4) return; ball(x, yy, 3.4, '#475569', false);
    });
    if (nco > 0) D.text(sb.x + sb.w - 12, sb.ys + 26, 'CO₂', { size: 12.5, weight: 800, color: '#334155', align: 'right' });
    // 스트로마톨라이트: 겹겹이 쌓인 층
    const NS = d.N + (S.grow > 0.01 ? 1 : 0);
    for (let i = NS - 1; i >= 0; i--) {
      const part = i >= d.N ? d.g : 1;
      const rx = d.rx0 + d.tx * (i - (i >= d.N ? 1 : 0)) + (i >= d.N ? d.tx * part : 0), ry = d.ry0 + d.ty * (i - (i >= d.N ? 1 : 0)) + (i >= d.N ? d.ty * part : 0);
      const living = i === NS - 1;
      ctx.fillStyle = living ? '#4f9b3c' : i % 2 ? '#a8946a' : '#7d6d49';
      ctx.beginPath(); ctx.ellipse(sb.cx, sb.yf, rx, ry, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = living ? '#2f6b2c' : 'rgba(60,45,20,.35)'; ctx.lineWidth = living ? 2 : 1; ctx.stroke();
    }
    ctx.restore();
    // 살아 있는 남세균 알갱이
    for (let i = 0; i < 26; i++) { const th = Math.PI + 0.2 + (i / 25) * (Math.PI - 0.4), x = sb.cx + d.rxOut * Math.cos(th), y = sb.yf + d.ryOut * Math.sin(th); ctx.fillStyle = '#86d36b'; ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3 + i) * (P > 0 ? 1 : 0.2); ctx.beginPath(); ctx.arc(x, y, 2.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    // 기포
    BUB1.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(224,242,254,.55)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const x = sb.x + (sb.w * i) / 40; i ? ctx.lineTo(x, sb.ys + Math.sin(t * 1.5 + i * 0.5) * 1.8) : ctx.moveTo(x, sb.ys); } ctx.stroke();
    D.label(sb.cx, sb.yf - d.ryOut - 20, '남세균 매트 · 층 ' + (3 + S.layerGrown) + '겹', { bg: '#2f6b2c', size: 12.5, pad: 8 });
    D.text(sb.x + sb.w - 12, sb.y + sb.h - 8, '시간을 크게 가속한 모습이에요', { size: 12, weight: 700, color: '#78613a', align: 'right' });

    // 확대 그림
    card(B, '🔍 남세균 매트 확대');
    const Z = zoomBox(), cells = zoomCells(Z);
    ctx.save(); rr(Z.x, Z.y, Z.w, Z.h, 10).clip();
    const zg = ctx.createLinearGradient(0, Z.y, 0, Z.y + Z.h); zg.addColorStop(0, '#bfe7fa'); zg.addColorStop(1, '#6cb7e0'); ctx.fillStyle = zg; ctx.fillRect(Z.x, Z.y, Z.w, Z.h);
    ctx.fillStyle = '#bda878'; ctx.fillRect(Z.x, Z.y + Z.h - 18, Z.w, 18);
    cells.forEach((c) => drawCell(c, t));
    ZC.forEach((p) => ball(p.x, p.y, 3.2, '#475569', false));
    ZP.forEach((p) => { D.spark(p.x, p.y, 5, t, '#fde047'); });
    ZB.forEach((p) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(224,242,254,.7)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    D.text(Z.x + 8, Z.y + 18 * FS, '☀️ 빛 → ', { size: 12, weight: 800, color: '#92400e', align: 'left' });
    D.text(Z.x + Z.w - 8, Z.y + 18 * FS, 'O₂ ↑', { size: 12.5, weight: 800, color: '#0369a1', align: 'right' });
    D.text(Z.x + Z.w / 2, Z.y + Z.h + 20 * FS, PHONE ? '빛 + CO₂ + 물 → 포도당 + O₂' : '남세균 세포: 빛 + CO₂ + 물 → 포도당 + O₂', { size: 12, weight: 700, color: '#475569' });
    D.text(B.x + B.w / 2, B.y + B.h - 14, '노랑: 빛 · 회색: CO₂ · 파랑: 산소 기포', { size: 12, weight: 700, color: '#64748b' });

    // 반응식과 기록
    card(C, '⚗️ 광합성');
    D.text(C.x + C.w / 2, C.y + 52 * FS, '6CO₂ + 6H₂O', { size: 15.5, weight: 800, color: '#334155' });
    D.arrow(C.x + C.w / 2, C.y + 62 * FS, C.x + C.w / 2, C.y + 92 * FS, { color: '#f59e0b', width: 3.5, head: 11 });
    D.text(C.x + C.w / 2 + 14, C.y + 82 * FS, '빛에너지', { size: 12, weight: 800, color: '#b45309', align: 'left' });
    D.text(C.x + C.w / 2, C.y + 114 * FS, 'C₆H₁₂O₆ + 6O₂', { size: 15.5, weight: 800, color: '#0369a1' });
    const by = C.y + C.h - 66;
    D.text(C.x + 16, by, '광합성 속도 ' + Math.round(P) + ' %', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(C.x + 16, by + 6, C.w - 32, 12, 6).fill(); ctx.fillStyle = '#22c55e'; rr(C.x + 16, by + 6, Math.max(0.1, (C.w - 32) * P / 100), 12, 6).fill();
    D.text(C.x + 16, by + 40, '산소 기포 ' + S.o2n + '개 · 새 층 ' + S.layerGrown + '겹', { size: 13.5, weight: 800, color: '#1e293b', align: 'left' });
  }

  /* ======================================================
     장면 2: 호상 철광층
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 400 }, B1: { x: 8, y: 416, w: 504, h: 110 }, B2: { x: 8, y: 534, w: 504, h: 180 } }
    : { A: { x: 12, y: 12, w: 560, h: 536 }, B1: { x: 580, y: 12, w: 208, h: 214 }, B2: { x: 580, y: 234, w: 208, h: 314 } };
  const SEA = { t: 0, ions: [], bub: [], red: [], slices: [], acc: 0, vt: 0, slAcc: 0, redAcc: 0, run: 0, ema: 0 };
  const SEDH = 130, RPU = 1.0, SIPX = 1.25;
  const seaG = () => {
    const A = RC2.A, sb = { x: A.x + 14, y: A.y + 42, w: A.w - 28, h: A.h - 58 };
    sb.ys = sb.y + 44; sb.yb = sb.y + sb.h - (PHONE ? 84 : SEDH); sb.sh = sb.y + sb.h - sb.yb;
    sb.ix0 = sb.x + (PHONE ? 112 : 124); sb.ix1 = sb.x + sb.w - 72; sb.iy0 = sb.ys + 14; sb.iy1 = sb.yb - 60;
    sb.vx = sb.x + sb.w - 40; sb.mx = sb.x + 66;
    return sb;
  };
  function seaReset() {
    const g = seaG(), rnd = seeded(41);
    SEA.t = 0; SEA.bub = []; SEA.red = []; SEA.slices = []; SEA.acc = 0; SEA.vt = 0; SEA.slAcc = 0; SEA.redAcc = 0; SEA.run = 0; SEA.ema = 0;
    SEA.ions = []; for (let i = 0; i < 100; i++) SEA.ions.push({ x: g.ix0 + rnd() * (g.ix1 - g.ix0), y: g.iy0 + rnd() * (g.iy1 - g.iy0), vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, res: false });
    S.stripes = 0; S.atm = 0; S.pEff = 0;
  }
  function seaStep(dt) {
    const g = seaG();
    SEA.t += dt;
    S.pEff = S.po * (S.per ? 1 + 0.9 * Math.sin((TAU * SEA.t) / 5) : 1);
    // 열수 분출구에서 철 이온이 공급돼요
    SEA.vt += dt * 0.8; while (SEA.vt >= 1) { SEA.vt -= 1; if (SEA.ions.length < 100) SEA.ions.push({ x: g.vx - 6, y: g.yb - 46, vx: -22, vy: -8, res: false }); }
    // 산소 생산
    SEA.acc += S.pEff * dt;
    while (SEA.acc >= 1) {
      SEA.acc -= 1;
      const ox = g.mx + (Math.random() - 0.5) * 50, oy = g.yb - 44;
      let best = null, bd = 1e9; SEA.ions.forEach((q) => { if (!q.res) { const dd = Math.hypot(q.x - ox, q.y - oy); if (dd < bd) { bd = dd; best = q; } } });
      if (best) { best.res = true; SEA.bub.push({ x: ox, y: oy, tgt: best, r: 3.6 }); } else SEA.bub.push({ x: ox, y: oy, tgt: null, r: 3.6, ph: Math.random() * 6 });
    }
    for (let i = SEA.bub.length - 1; i >= 0; i--) {
      const b = SEA.bub[i];
      if (b.tgt) {
        const dx = b.tgt.x - b.x, dy = b.tgt.y - b.y, dd = Math.hypot(dx, dy);
        if (dd < 7) { const k = SEA.ions.indexOf(b.tgt); if (k >= 0) SEA.ions.splice(k, 1); SEA.red.push({ x: b.tgt.x, y: b.tgt.y }); parts.burst(b.tgt.x, b.tgt.y, { count: 7, speed: 55, life: 0.5, size: 2.4, gravity: 0, colors: ['#ef4444', '#f97316', '#fca5a5'] }); SEA.bub.splice(i, 1); continue; }
        b.x += (dx / dd) * 180 * dt; b.y += (dy / dd) * 180 * dt;
      } else {
        b.y -= 65 * dt; b.x += Math.sin(b.y * 0.09 + b.ph) * 16 * dt;
        if (b.y <= g.ys) { S.atm += 1; parts.burst(b.x, g.ys, { count: 5, speed: 50, life: 0.4, size: 2, gravity: 60, colors: ['#e0f2fe', '#fff'] }); SEA.bub.splice(i, 1); }
      }
    }
    SEA.ions.forEach((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx = clamp(q.vx + (Math.random() - 0.5) * 60 * dt, -16, 16); q.vy = clamp(q.vy + (Math.random() - 0.5) * 60 * dt, -16, 16);
      if (q.x < g.ix0) { q.x = g.ix0; q.vx = Math.abs(q.vx); } if (q.x > g.ix1) { q.x = g.ix1; q.vx = -Math.abs(q.vx); }
      if (q.y < g.iy0) { q.y = g.iy0; q.vy = Math.abs(q.vy); } if (q.y > g.iy1) { q.y = g.iy1; q.vy = -Math.abs(q.vy); }
    });
    for (let i = SEA.red.length - 1; i >= 0; i--) { const r = SEA.red[i]; r.y += 140 * dt; if (r.y >= g.yb) { SEA.redAcc += 1; SEA.red.splice(i, 1); } }
    // 퇴적층: 0.25초마다 한 겹 (붉은 산화철 + 회백색 규질)
    SEA.slAcc += dt;
    while (SEA.slAcc >= 0.25) {
      SEA.slAcc -= 0.25; const raw = SEA.redAcc; SEA.redAcc = 0; SEA.ema += (raw - SEA.ema) * 0.2; SEA.slices.unshift({ red: SEA.ema });
      if (SEA.slices.length > 400) SEA.slices.pop();
      if (SEA.ema * RPU > SIPX) SEA.run++; else { if (SEA.run >= 4) S.stripes++; SEA.run = 0; }
    }
  }
  function drawBif(t, dt) {
    const { A, B1, B2 } = RC2, g = seaG();
    seaStep(dt);
    card(A, '🌊 철 이온이 녹아 있는 원시 바다 (단면, 예시)');
    ctx.save(); rr(g.x, g.y, g.w, g.h, 12).clip();
    ctx.fillStyle = '#e8f3fb'; ctx.fillRect(g.x, g.y, g.w, g.ys - g.y);
    const sea = ctx.createLinearGradient(0, g.ys, 0, g.yb); sea.addColorStop(0, '#74c0d8'); sea.addColorStop(1, '#2f7f8f'); ctx.fillStyle = sea; ctx.fillRect(g.x, g.ys, g.w, g.yb - g.ys);
    // 퇴적층(위: 나중에 쌓인 것)
    ctx.fillStyle = '#6b6258'; ctx.fillRect(g.x, g.yb, g.w, g.sh);
    let y = g.yb;
    for (let i = 0; i < SEA.slices.length && y < g.yb + g.sh; i++) {
      const hr = SEA.slices[i].red * RPU, hh = hr + 1.1;
      ctx.fillStyle = mixc('#d6d3d1', '#b91c1c', smooth((hr - 0.5) / 1.5)); ctx.fillRect(g.x, y, g.w, hh + 0.6); y += hh;
    }
    // 산소 생산자(스트로마톨라이트)와 열수 분출구
    ctx.fillStyle = '#4f9b3c'; ctx.beginPath(); ctx.ellipse(g.mx, g.yb, 56, 40, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2f6b2c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#57534e'; poly([[g.vx - 16, g.yb], [g.vx - 7, g.yb - 40], [g.vx + 7, g.yb - 40], [g.vx + 16, g.yb]]); ctx.fill();
    D.glow(g.vx, g.yb - 40, 26, '#4ade80', 0.45);
    // 철 이온(초록), 산소 기포, 붉은 산화철
    SEA.ions.forEach((q) => ball(q.x, q.y, 4.6, '#35c26a', true));
    SEA.red.forEach((r) => ball(r.x, r.y, 4.2, '#c2410c', true));
    SEA.bub.forEach((b) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(224,242,254,.75)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const x = g.x + (g.w * i) / 40; i ? ctx.lineTo(x, g.ys + Math.sin(t * 1.5 + i * 0.5) * 1.6) : ctx.moveTo(x, g.ys); } ctx.stroke();
    D.text(g.x + 10, g.y + 24 * FS, '대기', { size: 13.5, weight: 800, color: '#475569', align: 'left' });
    D.text(g.mx, g.yb - 52, '남세균', { size: 12.5, weight: 800, color: '#14532d' });
    D.text(g.vx - 4, g.yb - 52, '열수 분출구', { size: 12, weight: 800, color: '#f0fdf4', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
    D.text(g.x + g.w - 8, g.yb + 18 * FS, '퇴적물(위: 나중에 쌓임)', { size: 12, weight: 700, color: '#f5f5f4', align: 'right' });
    // 범례
    const lg = [['#35c26a', 'Fe²⁺ (물에 녹은 철)'], ['#c2410c', '산화철 (녹지 않고 가라앉음)']];
    lg.forEach((q, i) => { const lx = g.x + 12 + i * (PHONE ? 0 : 160), ly = g.ys + 22 * FS + i * (PHONE ? 20 : 0) + (PHONE ? 0 : 0); ball(lx + 4, ly - 4, 4.6, q[0], false); D.text(lx + 14, ly, q[1], { size: 12, weight: 700, color: '#f8fafc', align: 'left', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 }); });
    if (SEA.ions.length === 0) D.label(g.x + g.w / 2, g.ys + 60, '철이 다 쓰였어요: 산소가 대기로 나가요', { bg: '#0369a1', size: 13, pad: 9 });
    // 오른쪽: 철 잔량, 대기 산소
    card(B1, '📊 철 잔량과 대기 산소');
    const bw = PHONE ? 200 : 54;
    if (PHONE) {
      const x0 = B1.x + 20, w = B1.w - 160;
      D.text(x0, B1.y + 54, 'Fe²⁺ 철 잔량', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(x0, B1.y + 60, w, 14, 7).fill(); ctx.fillStyle = '#35c26a'; rr(x0, B1.y + 60, Math.max(0.1, w * SEA.ions.length / 100), 14, 7).fill();
      D.text(x0 + w + 8, B1.y + 72, SEA.ions.length + ' / 100', { size: 13.5, weight: 800, color: '#14532d', align: 'left' });
      D.text(x0, B1.y + 96, '대기 산소 계기', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(x0 + 120, B1.y + 84, w - 120, 14, 7).fill(); ctx.fillStyle = '#38bdf8'; rr(x0 + 120, B1.y + 84, Math.max(0.1, (w - 120) * Math.min(S.atm, 100) / 100), 14, 7).fill();
      D.text(x0 + w + 8, B1.y + 96, Math.min(S.atm, 100) + ' / 100', { size: 13.5, weight: 800, color: '#0369a1', align: 'left' });
    } else {
      const x0 = B1.x + 28, y0 = B1.y + 62, h = B1.h - 98;
      [[x0, '#35c26a', SEA.ions.length, 'Fe²⁺', '철 잔량'], [x0 + 92, '#38bdf8', Math.min(S.atm, 100), 'O₂', '대기 산소']].forEach((q) => {
        ctx.fillStyle = '#e2e8f0'; rr(q[0], y0, bw, h, 8).fill(); ctx.fillStyle = q[1]; const hh = (h * q[2]) / 100; rr(q[0], y0 + h - hh, bw, Math.max(0.1, hh), 8).fill();
        D.text(q[0] + bw / 2, y0 + h + 16 * FS, q[4], { size: 12.5, weight: 800, color: '#334155' }); D.text(q[0] + bw / 2, y0 - 6, String(q[2]), { size: 13.5, weight: 800, color: '#1e293b' });
      });
    }
    // 줄무늬 표본
    card(B2, '🪨 붉은 줄무늬 (' + (S.coreShow || (game && game.free) ? '표본 예시' : '쌓인 기록') + ')');
    const showEx = S.coreShow || (game && game.free);
    if (showEx) drawCoreExample(B2);
    else {
      D.text(B2.x + 14, B2.y + 56, '🟥 붉은 층 = 산화철', { size: 12.5, weight: 700, color: '#7f1d1d', align: 'left' });
      D.text(B2.x + 14, B2.y + 56 + 20 * FS, '⬜ 회백색 층 = 규질(처트)', { size: 12.5, weight: 700, color: '#57534e', align: 'left' });
      D.text(B2.x + 14, B2.y + 56 + 48 * FS, '완성된 붉은 줄무늬 ' + S.stripes + '개', { size: 14, weight: 800, color: '#1e293b', align: 'left' });
      D.text(B2.x + 14, B2.y + 56 + 72 * FS, '산소 생산 ' + (Math.round(S.pEff * 10) / 10).toFixed(1) + ' 단위/천만 년', { size: 12.5, weight: 700, color: '#475569', align: 'left' });
    }
  }
  const CORE = [{ id: 'A', y: 0.10, h: 0.08 }, { id: 'B', y: 0.34, h: 0.10 }, { id: 'C', y: 0.58, h: 0.08 }, { id: 'D', y: 0.80, h: 0.10 }];
  function drawCoreExample(B2) {
    const x = B2.x + (PHONE ? 40 : 24), y = B2.y + 46, w = PHONE ? 120 : 64, h = B2.h - (PHONE ? 62 : 70);
    ctx.fillStyle = '#d6d3d1'; rr(x, y, w, h, 6).fill();
    CORE.forEach((c) => { ctx.fillStyle = '#b91c1c'; ctx.fillRect(x, y + h * c.y, w, h * c.h); D.label(x + w + 14, y + h * (c.y + c.h / 2), '줄무늬 ' + c.id, { bg: '#7f1d1d', size: 12.5, pad: 7, align: 'left' }); });
    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 2; rr(x, y, w, h, 6).stroke();
    D.text(x + w / 2, y - 6, '위(나중)', { size: 12, weight: 800, color: '#475569' }); D.text(x + w / 2, y + h + 15 * FS, '아래(먼저)', { size: 12, weight: 800, color: '#475569' });
  }

  /* ======================================================
     장면 3: 산소 대폭발 (시간에 따른 해양 철과 대기 산소)
     ====================================================== */
  const RC3 = PHONE ? { A: { x: 8, y: 8, w: 504, h: 704 } } : { A: { x: 12, y: 12, w: 776, h: 536 } };
  const FE_PTS = [[40, 100], [29, 100], [24, 30], [18, 0], [0, 0]];
  const O2_PTS = [[40, 0.0005], [24, 0.0005], [22, 1.5], [21, 2], [8, 8], [5, 40], [3, 150], [0, 100]];
  const feAt = (a) => { for (let i = 1; i < FE_PTS.length; i++) if (a >= FE_PTS[i][0]) { const p = FE_PTS[i - 1], q = FE_PTS[i], f = (a - q[0]) / (p[0] - q[0]); return q[1] + (p[1] - q[1]) * f; } return 0; };
  const o2At = (a) => {
    for (let i = 1; i < O2_PTS.length; i++) if (a >= O2_PTS[i][0]) { const p = O2_PTS[i - 1], q = O2_PTS[i], f = (a - q[0]) / (p[0] - q[0]); return Math.exp(Math.log(q[1]) + (Math.log(p[1]) - Math.log(q[1])) * f); }
    return 100;
  };
  const fO2 = (v) => (v < 0.001 ? '0.001 % 미만' : v < 1 ? (Math.round(v * 100) / 100).toFixed(2) + ' %' : v < 10 ? (Math.round(v * 10) / 10).toFixed(1) + ' %' : Math.round(v) + ' %');
  const fAge = (a) => (a <= 0 ? '현재' : a + '억 년 전');
  const EVID = [{ id: 'py', a: 24, t: '쇄설성 황철석 소멸', c: '#7c3aed' }, { id: 'rb', a: 22, t: '적색층 출현', c: '#dc2626' }, { id: 'bf', a: 18, t: '호상 철광층 소멸', c: '#b45309' }];
  const geo3 = () => {
    const A = RC3.A, x0 = A.x + (PHONE ? 62 : 70), x1 = A.x + A.w - (PHONE ? 20 : 26);
    return PHONE
      ? { A, x0, x1, sch: { x: A.x + 14, y: A.y + 44, w: A.w - 28, h: 110 }, fe: { y: A.y + 196, h: 120 }, o2: { y: A.y + 350, h: 190 }, bar: { y: A.y + 588, h: 84 } }
      : { A, x0, x1, sch: { x: A.x + 16, y: A.y + 40, w: A.w - 32, h: 90 }, fe: { y: A.y + 172, h: 92 }, o2: { y: A.y + 296, h: 126 }, bar: { y: A.y + 458, h: 70 } };
  };
  const Xa = (a, g) => g.x0 + ((g.x1 - g.x0) * (40 - a)) / 40;
  function drawGoe(t, dt) {
    const g = geo3(), A = g.A, a = S.age;
    card(A, '📈 40억 년 전부터 현재까지 (예시 곡선)');
    // 모식도: 바다와 대기
    const sc = g.sch; ctx.fillStyle = '#f1f5f9'; rr(sc.x, sc.y, sc.w, sc.h, 10).fill();
    const half = sc.w / 2 - 8;
    D.text(sc.x + 10, sc.y + 18 * FS, '🌬️ 대기 (산소 O₂)', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    D.text(sc.x + half + 22, sc.y + 18 * FS, '🌊 바다 (철 Fe²⁺)', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    const nO = clamp(Math.round((Math.log10(o2At(a)) + 3.3) * 3.4), 0, 20), nF = Math.round((feAt(a) / 100) * 30);
    const rA = seeded(3), rB = seeded(8);
    for (let i = 0; i < 20; i++) { const x = sc.x + 14 + rA() * (half - 24), y = sc.y + 30 * FS + rA() * (sc.h - 30 * FS - 12); if (i < nO) ball(x + Math.sin(t * 1.5 + i) * 2, y + Math.cos(t * 1.3 + i) * 2, 5, '#38bdf8', true); }
    for (let i = 0; i < 30; i++) { const x = sc.x + half + 24 + rB() * (half - 30), y = sc.y + 30 * FS + rB() * (sc.h - 30 * FS - 12); if (i < nF) ball(x + Math.sin(t * 1.2 + i) * 2, y + Math.cos(t * 1.1 + i) * 2, 4.6, '#35c26a', true); }
    D.text(sc.x + sc.w - 8, sc.y + sc.h - 6, '(알갱이 수는 모식도예요)', { size: 11.5, weight: 700, color: '#94a3b8', align: 'right' });
    // 공통 그림 함수
    const aged = (v) => v;
    function frame(P, ymin, ymax, yTicks, yLab, yFmt, title, ylog) {
      const Y = (v) => (ylog ? P.y + P.h - (P.h * (Math.log10(v) - Math.log10(ymin))) / (Math.log10(ymax) - Math.log10(ymin)) : P.y + P.h - (P.h * (v - ymin)) / (ymax - ymin));
      ctx.fillStyle = '#f8fafc'; rr(g.x0, P.y, g.x1 - g.x0, P.h, 4).fill();
      yTicks.forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, Y(v)); ctx.lineTo(g.x1, Y(v)); ctx.stroke(); D.text(g.x0 - 6, Y(v) + 4.5, yFmt(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
      [40, 30, 20, 10, 0].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(Xa(v, g), P.y); ctx.lineTo(Xa(v, g), P.y + P.h); ctx.stroke(); });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(g.x0, P.y, g.x1 - g.x0, P.h);
      D.text(g.x0 + 8, P.y + 15 * FS, title, { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      return Y;
    }
    // 철 곡선
    const YF = frame(g.fe, 0, 100, [0, 50, 100], 'Fe', (v) => String(v), '🟢 바다의 철 Fe²⁺ (상대량)', false);
    const bx0 = Xa(28, g), bx1 = Xa(18, g);
    ctx.fillStyle = 'rgba(220,38,38,.12)'; ctx.fillRect(bx0, g.fe.y, bx1 - bx0, g.fe.h);
    D.text((bx0 + bx1) / 2 + (PHONE ? 0 : 40), PHONE ? g.fe.y + g.fe.h - 6 : g.fe.y + 14 * FS, PHONE ? '호상 철광층 최성기' : '호상 철광층이 가장 많이 쌓인 시기', { size: 11.5, weight: 800, color: '#b91c1c' });
    const curve = (pts, Y, col, fn) => {
      ctx.lineJoin = 'round'; ctx.lineWidth = 3;
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? col : 'rgba(148,163,184,.55)'; ctx.setLineDash(pass ? [] : [5, 5]); ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 160; i++) { const aa = 40 - (i / 160) * 40; if (pass && aa < a - 1e-9) { if (started) { ctx.lineTo(Xa(a, g), Y(fn(a))); } break; } const x = Xa(aa, g), y = Y(fn(aa)); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };
    curve(FE_PTS, YF, '#16a34a', feAt);
    // 산소 곡선(로그)
    const YO = frame(g.o2, 0.0001, 1000, [0.001, 0.1, 10, 1000], 'O2', (v) => String(v), '🔵 대기 산소 O₂ (현재 = 100 %, 로그 눈금)', true);
    curve(O2_PTS, YO, '#0284c7', o2At);
    D.dashedLine(g.x0, YO(100), g.x1, YO(100), { color: 'rgba(14,165,233,.5)', width: 1.5 }); D.text(g.x1 - 4, YO(100) - 4, '현재 100 %', { size: 11.5, weight: 700, color: '#0369a1', align: 'right' });
    // 시간 눈금
    [40, 30, 20, 10, 0].forEach((v) => D.text(Xa(v, g), g.o2.y + g.o2.h + 15 * FS, v === 0 ? '현재' : v + '억', { size: 12, weight: 700, color: '#64748b', align: v === 40 ? 'left' : v === 0 ? 'right' : 'center' }));
    D.text((g.x0 + g.x1) / 2, g.o2.y + g.o2.h + 31 * FS, '시간 (억 년 전)', { size: 12, weight: 700, color: '#64748b' });
    // 현재 시각 커서
    const cx = Xa(a, g); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx, g.fe.y); ctx.lineTo(cx, g.o2.y + g.o2.h); ctx.stroke();
    D.sphere(cx, YF(feAt(a)), 6, '#16a34a', { shadow: true }); D.sphere(cx, YO(o2At(a)), 6, '#0284c7', { shadow: true });
    D.label(clamp(cx, g.x0 + 40, g.x1 - 40), g.fe.y - 8, fAge(a), { bg: '#7c3aed', size: 12.5, pad: 7 });
    // 증거 카드(연대순으로 배치하면 시간 막대에 나타나요)
    const bar = g.bar;
    ctx.fillStyle = '#f1f5f9'; rr(g.x0, bar.y, g.x1 - g.x0, bar.h, 8).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2; rr(g.x0, bar.y, g.x1 - g.x0, bar.h, 8).stroke();
    D.text(g.x0 - 6, bar.y + bar.h / 2 + 4, '증거', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    const show = S.evShow || ordEv.ok() || (game && game.free);
    if (show) EVID.forEach((e, i) => {
      const x = Xa(e.a, g); ctx.globalAlpha = 0.55; ctx.strokeStyle = e.c; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, g.fe.y); ctx.lineTo(x, bar.y + 8); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      D.sphere(x, bar.y + 12, 6.5, e.c, { gloss: false }); D.text(x + (PHONE ? (i === 0 ? -10 : 0) : 0), bar.y + 36 + i * 15 * FS, e.t + ' (약 ' + e.a + '억)', { size: 11.5, weight: 800, color: e.c, align: PHONE && i === 0 ? 'right' : 'center' });
    }); else D.text((g.x0 + g.x1) / 2, bar.y + bar.h / 2 + 5, '증거 카드를 연대순으로 놓으면 이곳에 나타나요', { size: 12.5, weight: 700, color: '#94a3b8' });
    const hint = a > 24 ? '철이 산소를 가져가서 대기 산소는 거의 없어요' : a > 18 ? '표층의 철이 줄어든 뒤 산소가 대기로 나가요' : '산소가 늘어 깊은 바다까지 산소화돼요';
    D.text(sc.x + sc.w / 2, g.fe.y - 26, hint, { size: 12.5, weight: 800, color: '#0369a1' });
  }

  /* ======================================================
     장면 4: 오존층과 공진화
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 440 }, B: { x: 8, y: 456, w: 504, h: 118 }, C: { x: 8, y: 582, w: 504, h: 132 } }
    : { A: { x: 12, y: 12, w: 500, h: 536 }, B: { x: 520, y: 12, w: 268, h: 200 }, C: { x: 520, y: 220, w: 268, h: 328 } };
  const O3of = (x) => Math.sqrt(x) / 10;            // 현재 = 1
  const UVof = (x) => 100 * Math.exp(-7 * O3of(x)); // 지표 자외선(대기 꼭대기 = 100)
  const LAM = 6;                                    // 바닷물 속에서 자외선이 1/e로 줄어드는 깊이(m, 예시)
  const dSafe = (uv) => (uv > 20 ? LAM * Math.log(uv / 20) : 0);
  const fX = (x) => (x < 1 ? (Math.round(x * 100) / 100).toFixed(2) : x < 10 ? (Math.round(x * 10) / 10).toFixed(1) : String(Math.round(x)));
  const LIFE = (() => { const rnd = seeded(61), a = []; for (let i = 0; i < 10; i++) a.push({ u: rnd(), v: rnd(), ph: rnd() * 6 }); return a; })();
  const PLANT = [0.12, 0.3, 0.5, 0.72, 0.88];
  function drawOzone(t, dt) {
    const { A, B, C } = RC4, x = S.ox, O3 = O3of(x), uv = UVof(x), landOK = Math.round(uv) <= 20, ds = dSafe(uv);
    S.landK = approach(S.landK, landOK ? 1 : 0, dt, 2.5);
    card(A, '🛡️ 오존층이 자외선을 막아요 (단면, 예시)');
    const sb = { x: A.x + 12, y: A.y + 40, w: A.w - 24, h: A.h - 52 };
    const yo = sb.y + sb.h * 0.3, th = 52 * O3, yg = sb.y + sb.h * 0.56, mpx = (sb.h * 0.42) / 33;   // 깊이 33 m까지
    const mid = sb.x + sb.w / 2;
    ctx.save(); rr(sb.x, sb.y, sb.w, sb.h, 12).clip();
    const sk = ctx.createLinearGradient(0, sb.y, 0, yg); sk.addColorStop(0, '#1e3a8a'); sk.addColorStop(0.35, '#7dd3fc'); sk.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sk; ctx.fillRect(sb.x, sb.y, sb.w, yg - sb.y);
    // 오존층
    if (th > 0.4) { const og = ctx.createLinearGradient(0, yo - th / 2, 0, yo + th / 2); og.addColorStop(0, 'rgba(167,139,250,0)'); og.addColorStop(0.5, 'rgba(139,92,246,' + clamp(0.35 + 0.5 * O3, 0, 0.85) + ')'); og.addColorStop(1, 'rgba(167,139,250,0)'); ctx.fillStyle = og; ctx.fillRect(sb.x, yo - th / 2, sb.w, th); }
    // 땅과 바다
    ctx.fillStyle = '#9a7b4f'; ctx.fillRect(sb.x, yg, mid - sb.x, sb.y + sb.h - yg);
    ctx.fillStyle = '#8f7449'; ctx.fillRect(sb.x, yg, mid - sb.x, 10);
    const sea = ctx.createLinearGradient(0, yg, 0, sb.y + sb.h); sea.addColorStop(0, '#5cc0ea'); sea.addColorStop(1, '#0b4f7e'); ctx.fillStyle = sea; ctx.fillRect(mid, yg, sb.x + sb.w - mid, sb.y + sb.h - yg);
    // 바닷속 안전 구역(자외선이 충분히 약해지는 깊이 이상)
    const dy = yg + ds * mpx;
    ctx.fillStyle = 'rgba(34,197,94,.22)'; ctx.fillRect(mid, dy, sb.x + sb.w - mid, sb.y + sb.h - dy);
    if (ds > 0.05) { ctx.fillStyle = 'rgba(239,68,68,.18)'; ctx.fillRect(mid, yg, sb.x + sb.w - mid, ds * mpx); }
    D.dashedLine(mid, dy, sb.x + sb.w, dy, { color: '#15803d', width: 2.4 });
    // 육지 식물
    ctx.globalAlpha = S.landK; PLANT.forEach((p, i) => { const px = sb.x + 14 + p * (mid - sb.x - 28), py = yg; ctx.fillStyle = '#16a34a'; poly([[px, py - 4 - 20 * S.landK], [px - 7, py], [px + 7, py]]); ctx.fill(); ctx.fillStyle = '#15803d'; ctx.fillRect(px - 1.2, py - 4, 2.4, 6); }); ctx.globalAlpha = 1;
    // 바닷속 생물(안전 구역 안에서만)
    LIFE.forEach((q) => { const lx = mid + 16 + q.u * (sb.x + sb.w - mid - 32) + Math.sin(t + q.ph) * 4, ly = clamp(dy + 12 + q.v * (sb.y + sb.h - dy - 26), dy + 10, sb.y + sb.h - 10); if (ly > dy + 8) ball(lx, ly, 4.2, '#86efac', true); });
    ctx.restore();
    // 자외선 화살표: 굵기 = 세기(%) (대기 꼭대기 100 %)
    const ax = [sb.x + sb.w * 0.2, sb.x + sb.w * 0.36, mid + sb.w * 0.14, mid + sb.w * 0.32];
    ax.forEach((px) => {
      const w0 = 7, yA = sb.y + 10;
      ctx.fillStyle = 'rgba(124,58,237,.95)'; ctx.fillRect(px - w0 / 2, yA, w0, yo - th / 2 - yA);
      poly([[px - 8, yo - th / 2 - 2], [px + 8, yo - th / 2 - 2], [px, yo - th / 2 + 8]]); ctx.fill();
      const w1 = (w0 * uv) / 100, yS = yo + th / 2;
      if (w1 > 0.15) { ctx.fillStyle = 'rgba(124,58,237,.95)'; ctx.fillRect(px - w1 / 2, yS, w1, yg - yS); }
      if (px > mid) { for (let m = 0; m < 33; m += 3) { const wv = (w1 * Math.exp(-m / LAM)); if (wv > 0.1) { ctx.fillStyle = 'rgba(124,58,237,.8)'; ctx.fillRect(px - wv / 2, yg + m * mpx, wv, 3 * mpx); } } }
    });
    D.text(sb.x + 10, sb.y + 24 * FS, '☀️ 자외선 100 %', { size: 12.5, weight: 800, color: '#fde68a', align: 'left' });
    D.text(sb.x + sb.w - 10, yo - th / 2 - 8, th > 0.4 ? '오존층 (현재의 ' + Math.round(O3 * 100) + ' %)' : '오존층 없음', { size: 12.5, weight: 800, color: '#ede9fe', align: 'right', stroke: 'rgba(76,29,149,.55)', strokeWidth: 3 });
    D.text(sb.x + 10, yg - 34, '지표에 닿는 자외선 ' + Math.round(uv) + ' %', { size: 12.5, weight: 800, color: '#4c1d95', align: 'left' });
    D.label(sb.x + (mid - sb.x) / 2, yg + 28, landOK ? '육지 생물 가능' : '육지는 위험해요', { bg: landOK ? '#15803d' : '#b91c1c', size: 12.5, pad: 8 });
    D.label(mid + (sb.x + sb.w - mid) / 2, clamp(dy + 24, yg + 28, sb.y + sb.h - 26), ds > 0.5 ? '깊이 ' + Math.round(ds) + ' m 이상 가능' : '바다 전체 가능', { bg: '#15803d', size: 12.5, pad: 8 });
    // 깊이 눈금
    [10, 20, 30].forEach((m) => { D.text(sb.x + sb.w - 8, yg + m * mpx + 4.5, m + ' m', { size: 11.5, weight: 700, color: '#e0f2fe', align: 'right' }); });
    D.text(mid + 8, sb.y + sb.h - 8, '바닷물 속 깊이', { size: 11.5, weight: 700, color: '#e0f2fe', align: 'left' });

    // 막대
    card(B, '📊 산소 → 오존 → 자외선');
    const bx = B.x + 18, bw = B.w - 36;
    const rows = [['대기 산소 (현재 = 100)', x, 100, '#38bdf8', fX(x) + ' %'], ['오존 O₃ 양 (현재 = 100)', O3 * 100, 100, '#a78bfa', String(Math.round(O3 * 100))], [PHONE ? '지표 자외선 (점선 = 20 %)' : '지표 자외선 (꼭대기 = 100)', uv, 100, '#7c3aed', Math.round(uv) + ' %']];
    const rh = PHONE ? 28 : 46;
    rows.forEach((r, i) => {
      const y = B.y + (PHONE ? 46 : 52) + i * rh;
      D.text(bx, y - 5, r[0], { size: 12, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(bx, y, bw - 56, 13, 6).fill(); ctx.fillStyle = r[3]; rr(bx, y, Math.max(0.1, (bw - 56) * clamp(r[1], 0, r[2]) / r[2]), 13, 6).fill();
      D.text(bx + bw - 50, y + 11, r[4], { size: 13, weight: 800, color: '#1e293b', align: 'left' });
    });
    const ux = bx + (bw - 56) * 0.2, uy = B.y + (PHONE ? 46 : 52) + 2 * rh;
    D.dashedLine(ux, uy - 6, ux, uy + 19, { color: '#15803d', width: 2.2 });
    if (!PHONE) D.text(ux + 4, uy + 31, '20 % 이하면 육지 생물 가능', { size: 11.5, weight: 800, color: '#15803d', align: 'left' });

    // 인과 사슬
    card(C, '🔗 생명과 지구의 공진화');
    const chain = ['남세균 광합성', '해양의 철 산화', '대기 산소 증가', '오존층 형성', '육상 생물 진출'];
    if (PHONE) {
      chain.forEach((c, i) => { const cw = (C.w - 24) / 5; const cx0 = C.x + 12 + cw * i + cw / 2; D.sphere(cx0, C.y + 62, 14, ['#22c55e', '#ef4444', '#38bdf8', '#a78bfa', '#16a34a'][i], { gloss: true, text: String(i + 1) }); const ls = wrapLines(c, cw - 4, 11.5, 800); ls.forEach((l, k) => D.text(cx0, C.y + 92 + k * 15 * FS, l, { size: 11.5, weight: 800, color: '#334155' })); if (i < 4) D.text(cx0 + cw / 2, C.y + 67, '›', { size: 18, weight: 800, color: '#94a3b8' }); });
      D.text(C.x + C.w / 2, C.y + C.h - 8, '산소 호흡 생물도 번성해요 (ATP 약 30 vs 발효 2)', { size: 11.5, weight: 800, color: '#0369a1' });
    } else {
      chain.forEach((c, i) => { const y = C.y + 52 + i * 44; D.sphere(C.x + 28, y + 10, 13, ['#22c55e', '#ef4444', '#38bdf8', '#a78bfa', '#16a34a'][i], { gloss: true, text: String(i + 1) }); D.text(C.x + 52, y + 15, c, { size: 14, weight: 800, color: '#334155', align: 'left' }); if (i < 4) D.text(C.x + 28, y + 36, '▼', { size: 11, weight: 800, color: '#94a3b8' }); });
      D.text(C.x + C.w / 2, C.y + C.h - 30, '+ 산소 호흡 생물의 번성', { size: 13, weight: 800, color: '#0369a1' });
      D.text(C.x + C.w / 2, C.y + C.h - 11, '포도당 1분자당 ATP 약 30 (발효는 2)', { size: 12, weight: 700, color: '#475569' });
    }
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { mat: '🫧 남세균 · 스트로마톨라이트', bif: '🟥 호상 철광층', goe: '📈 산소 대폭발', ozone: '🛡️ 오존층과 공진화' };
  const FREE_KEYS = { mat: ['sL', 'sCO'], bif: ['sPo'], goe: ['sTm'], ozone: ['sOx'] };
  let ctlKeys = [];
  const ordCore = makeOrder($('#ordCore'), [{ id: 'B', label: '줄무늬 B' }, { id: 'D', label: '줄무늬 D' }, { id: 'A', label: '줄무늬 A' }, { id: 'C', label: '줄무늬 C' }], ['D', 'C', 'B', 'A'], () => { });
  const ordEv = makeOrder($('#ordEv'), [
    { id: 'rb', label: '육상에 붉은 퇴적층(적색층)이 나타남' }, { id: 'bf', label: '호상 철광층이 거의 사라짐 (깊은 바다까지 산소화)' }, { id: 'py', label: '하천 퇴적물의 쇄설성 황철석·우라니나이트가 사라짐' },
  ], ['py', 'rb', 'bf'], () => { });
  const stpAge = makeStepper($('#stpAge'), { min: 20, max: 30, step: 1, value: 30, unit: '억 년 전', dec: 0 });
  const ordChain = makeOrder($('#ordChain'), [
    { id: 'd', label: '산소(O₂)가 자외선과 반응해 오존층이 생겨요' }, { id: 'a', label: '남세균이 광합성으로 산소를 내놓아요' }, { id: 'e', label: '자외선이 줄어 생물이 육지로 올라와요' },
    { id: 'c', label: '철이 줄고 대기의 산소가 늘어나요' }, { id: 'b', label: '바다의 철 이온이 산소와 결합해 산화철로 가라앉아요' },
  ], ['a', 'b', 'c', 'd', 'e'], () => { });
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
  SciSim.bindRange($('#sL'), $('#oL'), (v) => v + ' %', (v) => { S.light = v; });
  SciSim.bindRange($('#sCO'), $('#oCO'), (v) => v + ' %', (v) => { S.co = v; });
  SciSim.bindRange($('#sPo'), $('#oPo'), (v) => (+v).toFixed(1).replace('.0', '') + ' 단위/천만 년', (v) => { S.po = v; });
  const ageOf = (v) => 40 - v;
  SciSim.bindRange($('#sTm'), $('#oTm'), (v) => fAge(ageOf(+v)), (v) => { S.age = ageOf(v); });
  const fOx = (v) => fX(Math.pow(10, +v)) + ' %';
  SciSim.bindRange($('#sOx'), $('#oOx'), fOx, (v) => { S.ox = Math.pow(10, v); });
  function setL(v) { S.light = v; setSlider($('#sL'), $('#oL'), v, (x) => x + ' %'); }
  function setCO(v) { S.co = v; setSlider($('#sCO'), $('#oCO'), v, (x) => x + ' %'); }
  function setPo(v) { S.po = v; setSlider($('#sPo'), $('#oPo'), v, (x) => (+x).toFixed(1).replace('.0', '') + ' 단위/천만 년'); }
  function setAge(a) { S.age = a; setSlider($('#sTm'), $('#oTm'), 40 - a, (x) => fAge(ageOf(+x))); }
  function setOx(u) { S.ox = Math.pow(10, u); setSlider($('#sOx'), $('#oOx'), u, fOx); }
  function syncPer() { const b = $('#bPer'); b.textContent = '🔄 주기 변화: ' + (S.per ? '켜짐' : '꺼짐'); b.classList.toggle('on', S.per); }
  $('#bPer').addEventListener('click', () => { Sound.click(); S.per = !S.per; syncPer(); });
  $('#bSea').addEventListener('click', () => { Sound.click(); seaReset(); });
  $('#bCoreReset').addEventListener('click', () => { Sound.click(); ordCore.reset(); });
  $('#bEvReset').addEventListener('click', () => { Sound.click(); ordEv.reset(); });
  $('#bChainReset').addEventListener('click', () => { Sound.click(); ordChain.reset(); });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    setL(0); setCO(60); S.o2n = 0; S.layerGrown = 0; S.grow = 0; BUB1.length = 0; ZP.length = 0; ZC.length = 0; ZB.length = 0; BUB1.acc = 0;
    setPo(0); S.per = true; syncPer(); seaReset(); S.coreShow = false; ordCore.reset();
    setAge(40); ordEv.reset(); stpAge.reset(); S.evShow = false;
    setOx(-1); S.landK = 0; ordChain.reset();
    if (li === 0) { setMode('mat'); setCtl(['sL', 'sCO']); showHint('빛을 켜서 남세균이 어떻게 되는지 봐요', 5000); }
    else if (li === 1) { setMode('bif'); setCtl(['sPo']); showHint('산소 생산을 켜면 바닷속 철 이온이 어떻게 되는지 봐요', 5000); }
    else if (li === 2) { setMode('goe'); setCtl(['sTm']); showHint('시간 슬라이더를 오른쪽으로 움직여 봐요', 5000); }
    else { setMode('ozone'); setCtl(['sOx']); showHint('대기 산소를 높이면 오존층과 자외선이 어떻게 변하는지 봐요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '남세균: 산소를 내놓은 첫 생물', short: '남세균', icon: '🫧', phase: '관찰', features: ['mat'],
      intro: '<p class="si-q">❓ 탐구 질문: 바다 밑에 쌓인 붉은 줄무늬 바위는 지구 대기가 바뀐 이야기를 어떻게 들려줄까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시와 통합과학에서</b> 원시 대기에는 산소가 거의 없었다는 것과, 광합성이 빛에너지로 이산화 탄소와 물에서 포도당을 만드는 반응이라는 것을 배웠어요. 이번 차시는 <b>생명체 탄생 이후</b> 생명과 지구가 서로 영향을 주고받은 과정을 따라가요.</div>' +
        '<p><b>스트로마톨라이트</b>는 남세균 매트가 층층이 쌓여 만들어진 구조예요. 약 35억 년 전의 화석이 있어요. 남세균은 광합성으로 <b>산소</b>를 내놓은 가장 오래된 생물이에요. 빛과 CO₂를 바꿔 보며 어떻게 되는지 살펴봐요. (시간은 크게 가속해 보여 줘요.)</p>',
      setup() { resetStep(0); },
      recap: '남세균은 빛과 CO₂, 물로 광합성을 해 산소 기포를 내놓고, 매트가 층층이 쌓여 스트로마톨라이트가 돼요.',
      summary: '<ul><li><b>스트로마톨라이트</b>: 남세균 매트가 층층이 쌓인 구조. 화석은 약 <b>35억 년 전</b>부터 나와요.</li><li>산소를 내놓는 광합성: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (빛에너지 사용).</li><li>빛과 CO₂가 많을수록 광합성이 활발해 산소 기포가 많이 나오고 층이 빨리 자라요.</li><li>육상 식물이 아니라 <b>남세균</b>이 산소를 처음 만든 생물이에요.</li></ul>',
      missions: [
        {
          title: '빛을 켜서 산소 기포와 새 층 확인',
          goal: '빛의 세기를 올려 남세균이 <b>산소 기포를 15개 이상</b> 내놓고 <b>새 층이 2겹 이상</b> 자라는 것을 확인해요.',
          hint: '빛 슬라이더를 오른쪽으로 밀어 100 %까지 올리고 기다려요. CO₂도 충분해야 해요. 기포와 층 수는 오른쪽 아래 카드에 보여요.',
          setup() { setL(0); setCO(60); S.o2n = 0; S.layerGrown = 0; S.grow = 0; setMode('mat'); setCtl(['sL', 'sCO']); },
          check: () => S.o2n >= 15 && S.layerGrown >= 2, hold: 0.4,
          status: () => mark(S.o2n >= 15) + ' 산소 기포 ' + S.o2n + '개 (목표 15개) · ' + mark(S.layerGrown >= 2) + ' 새로 자란 층 ' + S.layerGrown + '겹 (목표 2겹)',
          explain: '남세균은 <b>빛과 CO₂</b>로 광합성을 해 포도당을 만들고 <b>산소(O₂)</b>를 내놓아요. 빛이 없으면 기포가 나오지 않아요. 매트가 층층이 쌓여 <b>스트로마톨라이트</b>가 돼요.',
        },
        {
          type: 'quiz', title: '산소를 처음 만든 생물',
          goal: '산소를 내놓는 광합성을 <b>처음 한 생물</b>로 알맞은 것은?',
          setup() { setMode('mat'); setCtl(['sL', 'sCO']); },
          choices: ['육상 식물', '남세균', '공룡', '고사리와 같은 양치식물'],
          answer: 1,
          feedback: ['육상 식물은 약 4.5억 년 전에야 육지로 올라왔어요. 산소는 그보다 훨씬 전에 남세균이 만들었어요.', '', '공룡은 산소를 만드는 생물이 아니에요. 훨씬 나중에 나타났어요.', '양치식물도 육상 식물이라서 훨씬 나중에 나타났어요.'],
          explain: '산소를 내놓는 광합성을 처음 한 생물은 바다에 살던 <b>남세균</b>이에요. 육상 식물이 산소를 처음 만든 것은 아니에요.',
        },
      ],
    },
    {
      title: '호상 철광층: 산소는 철이 먼저 가져갔다', short: '호상철광층', icon: '🟥', phase: '모형', features: ['bif'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 남세균이 산소를 내놓는다는 것을 확인했어요. 그런데 대기의 산소는 처음 수억 년 동안 거의 늘지 않았어요. 산소는 어디로 갔을까요?</div>' +
        '<p>그때 바닷물에는 물에 녹은 <b>철 이온(Fe²⁺)</b>이 많았어요(해저 열수 활동이 공급해요). 산소가 이 철 이온과 만나면 물에 녹지 않는 <b>산화철(Fe³⁺)</b>이 되어 가라앉아요. 이 붉은 층과 규질 층이 번갈아 쌓인 줄무늬 암석이 <b>호상 철광층</b>이에요. (산소 생산량: 단위/천만 년, 철 저장고 약 100 단위인 단순 모형)</p>',
      setup() { resetStep(1); },
      recap: '남세균이 내놓은 산소는 먼저 바닷속 철 이온을 산화해 붉은 산화철로 가라앉히며 호상 철광층을 만들어서, 한동안 대기에 쌓이지 못했어요.',
      summary: '<ul><li>바닷물 속 <b>Fe²⁺</b>(물에 녹음) + O₂ → <b>Fe³⁺ 산화철</b>(물에 녹지 않아 가라앉음). 이 과정에서 산소가 소모돼요.</li><li><b>호상 철광층(BIF)</b>: 붉은 산화철 층과 규질 층이 번갈아 쌓인 줄무늬 퇴적암. 약 38억~18억 년 전(특히 약 28억~18억 년 전)에 쌓였고 세계 철광석의 대부분이에요.</li><li>산소 생산이 주기적으로 변하면 붉은 층과 규질 층이 번갈아 쌓여요.</li><li>단순 모형: 철 저장고 약 100 단위, 산소 생산 약 5 단위/천만 년 → <b>철이 거의 다 쓰인 뒤에야</b> 산소가 대기로 나가요.</li><li>지구시스템 연계: 생물(생물권)이 바다(수권)의 철을 바꿔 지권에 철광층을 남겼어요.</li></ul>',
      missions: [
        {
          title: '산소를 생산시켜 줄무늬 3개 쌓기',
          goal: '산소 생산을 켜(주기 변화는 켜진 채로) 붉은 줄무늬가 <b>3개</b> 쌓이게 해요.',
          hint: '산소 생산 슬라이더를 4~8 정도로 올리고 20초쯤 기다려요. 산소 기포가 철 이온을 만나면 붉게 변해 가라앉아요.',
          setup() { seaReset(); setPo(0); S.per = true; syncPer(); setMode('bif'); setCtl(['sPo']); },
          check: () => S.stripes >= 3, hold: 0.4,
          status: () => mark(S.stripes >= 3) + ' 붉은 줄무늬 ' + S.stripes + '개 (목표 3개) · 철 잔량 ' + SEA.ions.length + ' / 100',
          explain: '산소는 철 이온을 만나 <b>산화철</b>로 가라앉았어요. 산소 생산이 주기적으로 커졌다 작아지니 붉은 층(산화철이 많은 때)과 회백색 규질 층이 <b>번갈아</b> 쌓여 줄무늬가 생겼어요.',
        },
        {
          title: '줄무늬를 먼저 쌓인 순서로', manual: true,
          goal: '표본에 있는 붉은 줄무늬 A~D를 <b>먼저 쌓인 순서</b>(오래된 것부터)로 눌러요.',
          hint: '퇴적층은 아래에서부터 쌓여요. 맨 아래가 가장 먼저 쌓인 줄무늬예요.',
          setup() { ordCore.reset(); S.coreShow = true; setMode('bif'); setCtl(['sPo', 'ordcore']); },
          status: () => mark(ordCore.ok()) + ' 고른 줄무늬 ' + ordCore.seq.length + ' / 4',
          check() {
            if (!ordCore.complete()) return '줄무늬 4개를 모두 눌러 순서를 정해 주세요. (지금 ' + ordCore.seq.length + '개)';
            if (!ordCore.ok()) { ordCore.mark(ordCore.seq.find((id, i) => id !== ordCore.answerIds[i])); return '순서가 달라요. 아래층이 먼저 쌓였다는 것을 떠올려 봐요.'; }
            return true;
          },
          explain: '퇴적물은 <b>아래에서 위로</b> 쌓여요. 따라서 먼저 쌓인 순서는 맨 아래 <b>D → C → B → A</b>예요.',
        },
        {
          type: 'quiz', title: '산소가 대기에 쌓이지 못한 까닭',
          goal: '남세균이 산소를 내놓았는데도 처음 수억 년 동안 대기의 산소가 거의 늘지 않았어요. 그 까닭은?',
          setup() { S.coreShow = false; setMode('bif'); setCtl(['sPo']); },
          choices: ['남세균이 아직 산소를 만들지 못했기 때문이에요', '바다의 철 이온이 산소와 결합하며 산소를 모두 소모했기 때문이에요', '산소가 만들어지는 즉시 대기에 쌓이기 때문이에요', '산소가 모두 우주로 날아갔기 때문이에요'],
          answer: 1,
          feedback: ['남세균은 이미 산소를 만들고 있었어요(스트로마톨라이트 화석).', '', '산소는 만들어지는 즉시 대기에 쌓이지 않아요. 먼저 바닷속의 철과 반응했어요.', '산소가 우주로 날아갔다는 증거는 없어요. 철과 결합해 산화철로 쌓였어요.'],
          explain: '처음에는 남세균이 만든 산소가 <b>바닷속 철 이온과 결합</b>해 산화철로 가라앉으며 모두 소모됐어요. 바다의 철이 다 쓰인 뒤에야 산소가 대기로 나가 쌓이기 시작했어요.',
        },
      ],
    },
    {
      title: '산소 대폭발: 철이 다 쓰인 뒤', short: '산소 증가', icon: '📈', phase: '분석', features: ['goe'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산소가 먼저 바다의 철을 산화한다는 것을 확인했어요. 철이 거의 다 쓰이면 산소는 어떻게 될까요?</div>' +
        '<p>바다의 철이 줄어든 뒤에는 산소가 바다에서 대기로 나갔어요. 약 24억~21억 년 전 대기 산소가 현재의 1 % 미만에서 약 1~10 %로 늘어난 일을 <b>산소 대폭발</b>(대산화 사건)이라고 해요. 시간 슬라이더로 해양의 철과 대기 산소 곡선을 읽고, <b>증거</b>의 연대를 확인해 봐요. (곡선은 예시 자료예요.)</p>',
      setup() { resetStep(2); },
      recap: '바다의 철이 줄어든 뒤인 약 24억 년 전부터 대기 산소가 늘기 시작했고, 황철석 소멸·적색층·호상 철광층 소멸이 그 증거예요.',
      summary: '<ul><li>대기 산소: 약 27억 년 전 0.001 % 미만 → 약 22억 년 전 약 1~10 % (<b>산소 대폭발</b>, 약 24억~21억 년 전) → 8억~5억 년 전 약 10~50 % → 약 3억 년 전 석탄기 약 150 %(숲의 유기물 매몰로 일시 과다) → 현재 100 %(현재 21 % 기준).</li><li>증거 3가지: ① 쇄설성 황철석·우라니나이트가 약 <b>24억</b> 년 전 이후 사라짐(산소에 풍화됨) ② 육상 <b>적색층</b>이 약 <b>22억</b> 년 전부터 나타남 ③ 호상 철광층이 약 <b>18억</b> 년 전 거의 사라짐(깊은 바다까지 산소화).</li><li>산소를 내기 시작한 시기(≥35억 년 전)와 대기 산소가 늘어난 시기(약 24억 년 전)가 다른 까닭은 그동안 산소가 철을 산화하는 데 쓰였기 때문이에요.</li></ul>',
      missions: [
        {
          title: '증거를 연대순으로 놓기', manual: true,
          goal: '산소가 늘어난 증거 3가지를 <b>일어난 순서(오래된 것부터)</b>로 눌러요. 시간 슬라이더로 곡선도 살펴봐요.',
          hint: '황철석이 사라진 것은 약 24억 년 전, 적색층은 약 22억 년 전, 호상 철광층이 거의 사라진 것은 약 18억 년 전이에요. (24억 년 전이 가장 먼저예요.)',
          setup() { ordEv.reset(); S.evShow = false; setAge(40); setMode('goe'); setCtl(['sTm', 'ordev']); },
          status: () => mark(ordEv.ok()) + ' 고른 증거 ' + ordEv.seq.length + ' / 3',
          check() {
            if (!ordEv.complete()) return '증거 3가지를 모두 눌러 순서를 정해 주세요. (지금 ' + ordEv.seq.length + '개)';
            if (!ordEv.ok()) { ordEv.mark(ordEv.seq.find((id, i) => id !== ordEv.answerIds[i])); return '순서가 달라요. 산소가 늘어나면서 차례로 나타난 일을 생각해 봐요.'; }
            return true;
          },
          explain: '① 약 <b>24억</b> 년 전 쇄설성 황철석·우라니나이트 소멸 → ② 약 <b>22억</b> 년 전 육상 적색층 출현 → ③ 약 <b>18억</b> 년 전 호상 철광층 거의 소멸 순이에요. 모두 대기·바다의 산소가 늘었음을 알려 줘요.',
        },
        {
          title: '대기 산소가 늘기 시작한 시기 읽기',
          goal: '시간 슬라이더를 움직여 대기 O₂ 곡선이 <b>처음 늘기 시작하는 시기</b>를 찾고, 억 년 전 단위로 입력해요.',
          hint: '곡선이 바닥(0.001 % 미만)에 붙어 있다가 처음 위로 올라가는 시기를 찾아요. 철 곡선이 줄어든 뒤예요. 20억~30억 년 전 사이를 살펴봐요.',
          setup() { stpAge.reset(); S.evShow = true; setMode('goe'); setCtl(['sTm', 'stpAge']); },
          check: () => stpAge.value === 24, hold: 0.5,
          status: () => mark(stpAge.value === 24) + ' 입력한 시기 ' + stpAge.value + '억 년 전',
          explain: '대기 산소는 약 <b>24억 년 전</b>부터 늘기 시작했어요. 이때는 바다의 철이 많이 줄어든 뒤라 산소가 더 이상 철을 산화하는 데 다 쓰이지 않고 대기로 나갈 수 있었어요.',
        },
        {
          type: 'quiz', title: '산소 생산 시기와 대기 산소 증가 시기가 다른 까닭',
          goal: '남세균은 약 35억 년 전부터 산소를 내놓았지만 대기 산소는 약 24억 년 전부터 늘었어요. 그 까닭은?',
          setup() { setMode('goe'); setCtl(['sTm']); },
          choices: ['산소가 만들어지는 즉시 대기에 쌓였기 때문이에요', '그동안 산소가 바다의 철 등을 산화하는 데 쓰이다가, 철이 줄어든 뒤에야 대기로 나갔기 때문이에요', '24억 년 전에야 남세균이 처음 나타났기 때문이에요', '산소가 오존으로 모두 바뀌었기 때문이에요'],
          answer: 1,
          feedback: ['만들어지는 즉시 대기에 쌓였다면 대기 산소는 훨씬 일찍 늘었을 거예요.', '', '남세균 화석(스트로마톨라이트)은 약 35억 년 전부터 나와요.', '오존은 산소가 어느 정도 늘어난 뒤에 만들어져요. 이 시기의 산소 부족과는 관계가 없어요.'],
          explain: '산소를 내기 시작한 시기와 대기 산소가 늘어난 시기가 다른 것은, 처음에는 산소가 <b>바다의 철을 산화</b>하는 데 쓰였기 때문이에요. 철이 줄어든 뒤에야 산소가 대기에 쌓였어요.',
        },
      ],
    },
    {
      title: '오존층과 공진화', short: '오존층', icon: '🛡️', phase: '적용', features: ['ozone'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대기 산소가 약 24억 년 전부터 늘었어요. 대기에 산소가 늘면 하늘에는 어떤 변화가 생길까요?</div>' +
        '<p>대기의 산소(O₂)가 자외선을 받으면 <b>오존(O₃)</b>이 만들어져요(O₂ + 자외선 → O₃). 오존층이 두꺼워지면 생물에 해로운 <b>자외선</b>이 지표에 덜 닿아요. 대기 산소 농도를 바꾸며 오존층, 지표 자외선, 생물이 살 수 있는 곳이 어떻게 달라지는지 살펴봐요. (모델 값은 예시예요.)</p>',
      setup() { resetStep(3); },
      recap: '대기 산소가 늘면 오존층이 생겨 지표의 자외선이 줄고, 생물이 육지로 올라올 수 있었어요. 생명과 환경은 서로 영향을 주고받으며 함께 변해요(공진화).',
      summary: '<ul><li><b>오존층</b>: O₂ + 자외선 → O₃. 대기 산소가 현재의 약 1~10 % 이상이면 오존층이 자외선을 상당히 막아요. 육상 생물은 약 <b>4.5억 년 전</b>에 진출해요.</li><li>그 전에는 자외선이 약해지는 <b>바닷속 깊이 약 10 m</b> 이상에서만 안전했어요(예시).</li><li>인과 사슬: 남세균 광합성 → 해양 철 산화 → 대기 산소 증가 → 오존층 형성 → 육상 생물 진출. 또 산소 호흡은 에너지 효율이 높아 다양한 진핵생물이 번성했어요(포도당 1분자당 ATP 약 30 vs 발효 2).</li><li><b>공진화</b>: 생명이 환경을 바꾸고, 바뀐 환경이 다시 생명에 영향을 주며 함께 변해 가는 것. 지권·수권·기권·생물권이 서로 연결돼 있어요.</li></ul>',
      missions: [
        {
          title: '육지 생물이 살 수 있게 하기',
          goal: '대기 산소 농도를 높여 <b>지표 자외선을 20 % 이하</b>로 줄이고, <b>육지 생물 가능</b> 표시가 켜지게 해요.',
          hint: '슬라이더를 오른쪽으로 밀어 산소를 늘려요. 현재의 약 5 % 정도면 지표 자외선이 20 % 근처가 돼요.',
          setup() { setOx(-1); S.landK = 0; setMode('ozone'); setCtl(['sOx']); },
          check: () => Math.round(UVof(S.ox)) <= 20, hold: 0.8,
          status: () => mark(Math.round(UVof(S.ox)) <= 20) + ' 산소 ' + fX(S.ox) + ' % · 지표 자외선 ' + Math.round(UVof(S.ox)) + ' % (목표 20 % 이하)',
          explain: '산소가 늘어 <b>오존층</b>이 두꺼워지면 자외선이 대부분 흡수돼요. 이 모형에서는 대기 산소가 현재의 약 5 % 이상일 때 지표 자외선이 20 % 이하로 줄어 육지 생물이 살 수 있어요(예시).',
        },
        {
          title: '인과 사슬 순서 배열', manual: true,
          goal: '남세균에서 육상 생물의 진출까지 <b>일어난 순서</b>대로 5가지를 눌러요.',
          hint: '산소를 만드는 것이 시작이에요. 산소가 먼저 철과 결합하고, 그다음 대기 산소가 늘어요. 그다음이 오존층이에요.',
          setup() { ordChain.reset(); setOx(1); setMode('ozone'); setCtl(['sOx', 'ordchain']); },
          status: () => mark(ordChain.ok()) + ' 고른 단계 ' + ordChain.seq.length + ' / 5',
          check() {
            if (!ordChain.complete()) return '5가지를 모두 눌러 순서를 정해 주세요. (지금 ' + ordChain.seq.length + '개)';
            if (!ordChain.ok()) { ordChain.mark(ordChain.seq.find((id, i) => id !== ordChain.answerIds[i])); return '순서가 달라요. 빨간 항목이 어느 때 일어났는지 다시 생각해 봐요.'; }
            return true;
          },
          explain: '<b>남세균 광합성 → 해양 철 산화 → 대기 산소 증가 → 오존층 형성 → 육상 생물 진출</b> 순이에요. 산소 호흡 생물의 번성도 산소 증가의 결과예요.',
        },
        {
          type: 'quiz', title: '공진화란?',
          goal: '생명이 환경을 바꾸고(산소를 늘림), 바뀐 환경이 다시 생명에 영향을 주어(오존층·육상 진출) 함께 변해 가는 것을 무엇이라고 할까요?',
          setup() { setMode('ozone'); setCtl(['sOx']); },
          choices: ['자연 선택', '공진화', '대륙 이동', '지구 온난화'],
          answer: 1,
          feedback: ['자연 선택은 환경에 알맞은 생물이 더 많이 살아남는 것이에요. 환경이 생물에 의해 바뀐다는 뜻까지는 담지 못해요.', '', '대륙 이동은 판이 움직이는 현상이에요.', '지구 온난화는 지구의 평균 기온이 오르는 현상이에요.'],
          explain: '생명과 행성이 서로 영향을 주고받으며 함께 변해 가는 것을 <b>공진화</b>라고 해요. 남세균이 만든 산소가 대기·바다·지권을 바꾸고, 바뀐 환경이 다시 생물의 진화에 영향을 주었어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-oxygen-bif', mount: '#game', badge: '산소 탐정', homeHref: '../../index.html#hs',
    featureLabels: { mat: '🫧 스트로마톨라이트 · 남세균 확대', bif: '🟥 호상 철광층 쌓기 모형', goe: '📈 해양 철·대기 산소 곡선', ozone: '🛡️ 오존층 · 지표 자외선' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'mat') setReadouts(['광합성 속도', Math.round(matPhoto()) + ' %', '산소 기포', S.o2n + '개', '새로 자란 층', S.layerGrown + '겹']);
    else if (m === 'bif') setReadouts(['철 잔량', SEA.ions.length + ' / 100', '붉은 줄무늬', S.stripes + '개', '대기로 나간 산소', Math.min(S.atm, 100) + ' 단위']);
    else if (m === 'goe') setReadouts(['시기', fAge(S.age), '해양 철', Math.round(feAt(S.age)) + ' (상대량)', '대기 O₂', fO2(o2At(S.age))]);
    else setReadouts(['대기 산소', fX(S.ox) + ' %', '오존 양', Math.round(O3of(S.ox) * 100) + ' (현재=100)', '지표 자외선', Math.round(UVof(S.ox)) + ' %']);
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
    if (S.mode === 'mat') drawMat(t, dt);
    else if (S.mode === 'bif') drawBif(t, dt);
    else if (S.mode === 'goe') drawGoe(t, dt);
    else drawOzone(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, SEA, stpAge, ordCore, ordEv, ordChain, feAt, o2At, UVof, O3of, dSafe, EVID,
    get game() { return game; }, setMode, setL, setCO, setPo, setAge, setOx, resetStep, updateCtl, seaReset, seaStep, matStep,
    runSea(sec) { let k = Math.round(sec * 60); while (k-- > 0) seaStep(1 / 60); },
    runMat(sec) { let k = Math.round(sec * 60); while (k-- > 0) matStep(1 / 60); },
    solveCore() { ordCore.seq = ['D', 'C', 'B', 'A']; }, solveEv() { ordEv.seq = ['py', 'rb', 'bf']; }, solveChain() { ordChain.seq = ['a', 'b', 'c', 'd', 'e']; },
  };
})();
