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
  /* 보조: 별 모양 / 다각형 */
  function poly(pts, close) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); }
  const mfmt = (ma) => (ma >= 100 ? (Math.round(ma) / 100).toFixed(2).replace(/0$/, '') + '억 년' : ma >= 10 ? Math.round(ma * 100) + '만 년' : Math.round(ma * 100) + '만 년');
  /* 알림 말풍선 위치 가변 */
  /* ======================================================
     그림 도우미: 화석 아이콘 (돌에 새겨진 모양)
     ====================================================== */
  function fossilIco(id, cx, cy, s, col, light) {
    col = col || '#5b4a36'; light = light || 'rgba(255,248,230,.75)';
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 30, s / 30);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const rrr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    if (id === 'trilo') {
      ctx.beginPath(); ctx.ellipse(0, -11, 15, 12, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 6; i++) { const w = 14.5 - i * 0.9, y = -11 + i * 3.7; rrr(-w, y, 2 * w, 3.1, 1.4); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, 11, 10, 9, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = light; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4.5, -12); ctx.lineTo(-3.5, 18); ctx.moveTo(4.5, -12); ctx.lineTo(3.5, 18); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6, -15, 1.6, 0, TAU); ctx.arc(6, -15, 1.6, 0, TAU); ctx.fillStyle = light; ctx.fill();
    } else if (id === 'coral') {
      const hx = (x, y, r) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; i ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = light; ctx.lineWidth = 1.5; ctx.stroke(); };
      const r = 8.4, dx = r * 1.732;
      hx(0, 0, r); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hx(dx * Math.cos(a), dx * Math.sin(a), r); }
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
    } else if (id === 'fern') {
      ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(2, 24); ctx.quadraticCurveTo(-3, 0, 1, -24); ctx.stroke();
      for (let i = 0; i < 9; i++) { const y = 18 - i * 4.7, l = 3.5 + Math.min(i, 8 - i) * 2.6 + 3, x0 = -0.7 * (1 - Math.abs(y) / 30) + 1;
        [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.ellipse(x0 + sg * l / 2, y - 2.6, l / 2, 2.1, sg * -0.5, 0, TAU); ctx.fill(); }); }
    } else if (id === 'clam') {
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.arc(0, 18, 34, Math.PI * 1.16, Math.PI * 1.84); ctx.closePath(); ctx.fill();
      rrr(-8, 14, 16, 8, 3); ctx.fill();
      ctx.strokeStyle = light; ctx.lineWidth = 1.3;
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.22 + i * 0.1); ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(Math.cos(a) * 31, 18 + Math.sin(a) * 31); ctx.stroke(); }
    } else if (id === 'fusu') {
      const sp = (x, y, rx, ry, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = light; ctx.lineWidth = 1.2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * rx / 3.6, -ry * Math.sqrt(Math.max(0, 1 - Math.pow(i / 3.6, 2))) + 1); ctx.lineTo(i * rx / 3.6, ry * Math.sqrt(Math.max(0, 1 - Math.pow(i / 3.6, 2))) - 1); ctx.stroke(); } ctx.restore(); };
      sp(0, -2, 21, 8, -0.3); sp(-6, 14, 11, 4.6, 0.25); sp(12, 12, 9, 3.8, -0.15);
    } else if (id === 'ammo') {
      let px = 0, py = 0;
      for (let k = 1; k <= 120; k++) { const th = k * 0.0785, r = 1.2 + th * 2.3, x = Math.cos(th + 0.4) * r, y = Math.sin(th + 0.4) * r; ctx.lineWidth = 1.5 + th * 0.62; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); px = x; py = y; }
      ctx.strokeStyle = light; ctx.lineWidth = 1.2;
      for (let th = 3; th < 9.2; th += 0.62) { const r = 1.2 + th * 2.3, w = 1.5 + th * 0.62; ctx.beginPath(); ctx.moveTo(Math.cos(th + 0.4) * (r - w * .5), Math.sin(th + 0.4) * (r - w * .5)); ctx.lineTo(Math.cos(th + 0.4) * (r + w * .5), Math.sin(th + 0.4) * (r + w * .5)); ctx.stroke(); }
    } else if (id === 'nummu') {
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill(); ctx.strokeStyle = light; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let k = 0; k <= 80; k++) { const th = k * 0.15, r = 2 + th * 1.5; k ? ctx.lineTo(Math.cos(th) * r, Math.sin(th) * r) : ctx.moveTo(2, 0); } ctx.stroke();
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke(); }
    } else if (id === 'print') {
      ctx.beginPath(); ctx.ellipse(0, 13, 10, 9, 0, 0, TAU); ctx.fill();
      [-0.62, 0, 0.62].forEach((a) => { ctx.save(); ctx.translate(0, 8); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -11, 5.2, 11, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-3, -20); ctx.lineTo(0, -27); ctx.lineTo(3, -20); ctx.fill(); ctx.restore(); });
    } else if (id === 'mammoth') {
      ctx.beginPath(); ctx.ellipse(6, 0, 20, 13, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-14, -5, 11, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-5, -12, 9, Math.PI, 2 * Math.PI); ctx.fill();
      [-4, 3, 12, 20].forEach((x) => { rrr(x, 7, 5.5, 16, 2); ctx.fill(); });
      ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-27, 14, -21, 22); ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-19, 4); ctx.quadraticCurveTo(-14, 17, -26, 14); ctx.stroke();
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(-16, -8, 1.5, 0, TAU); ctx.fill();
    } else if (id === 'grapto') {
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-18, 20); ctx.lineTo(18, -20); ctx.stroke();
      for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9, x = -18 + 36 * t, y = 20 - 40 * t; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 4); ctx.lineTo(x + 3, y + 8.5); ctx.closePath(); ctx.fill(); }
      ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, 22); ctx.lineTo(8, 8); ctx.stroke();
    } else if (id === 'dino') {
      ctx.beginPath(); ctx.ellipse(4, 6, 15, 8.5, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-18, -4, -17, -17); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-18, -19, 5.5, 3.4, -0.3, 0, TAU); ctx.fill();
      ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(18, 7); ctx.quadraticCurveTo(26, 8, 29, 18); ctx.stroke();
      [-3, 10].forEach((x) => { rrr(x, 11, 5, 13, 2); ctx.fill(); });
    } else if (id === 'bird') {
      ctx.beginPath(); ctx.ellipse(2, 3, 12, 6.5, 0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-11, -2, 4.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-20, -1); ctx.lineTo(-15, 1); ctx.fill();
      ctx.beginPath(); ctx.ellipse(2, -8, 4.8, 13, 0.5, 0, TAU); ctx.fill();
      ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(26, 8 + i * 5); ctx.stroke(); }
      ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(-2, 16); ctx.moveTo(5, 8); ctx.lineTo(6, 16); ctx.stroke();
    } else if (id === 'mamm') {
      ctx.beginPath(); ctx.ellipse(2, 3, 13, 7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-13, 0, 6.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-17, -4); ctx.lineTo(-17, -11); ctx.lineTo(-12, -5); ctx.fill(); ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(-8, -11); ctx.lineTo(-8, -3); ctx.fill();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 3); ctx.quadraticCurveTo(24, 0, 24, -9); ctx.stroke();
      ctx.lineWidth = 2.6; [-5, 0, 8, 12].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, 17); ctx.stroke(); });
    }
    ctx.restore();
  }
  /* 돌 판 (화석이 새겨진 암석 조각) */
  function rockTile(x, y, w, h, base) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, shade(base, 0.12)); g.addColorStop(1, shade(base, -0.1));
    ctx.fillStyle = g; rr(x, y, w, h, 10).fill();
    ctx.save(); rr(x, y, w, h, 10).clip(); const r = seeded(Math.round(x * 7 + y * 13));
    for (let i = 0; i < 30; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; ctx.fillRect(x + r() * w, y + r() * h, 1 + r() * 4, 1 + r() * 3); }
    ctx.restore();
  }


  /* =========================================================
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 지질시대와 화석
     [12지구02-02] 지질시대를 기(紀) 수준에서 구분하고 지층과 화석으로 생물과 환경 변화를 해석
     ① 관찰: 화석   ② 모형: 지질시대   ③ 탐구: 생물 변천   ④ 분석: 한반도 화석
     ========================================================= */
  initStage('#eaf1f7', 800, 560, 600, 880, 1.22);
  const U = VW / 800;

  /* ---------- 지질시대 자료 (기(紀) 수준, 단위: 백만 년 전 = Ma) ---------- */
  const EP = [
    { id: 'cam', n: '캄브리아기', k: '캄', s: 539, e: 485, c: '#7fa056', era: 'pal' },
    { id: 'ord', n: '오르도비스기', k: '오', s: 485, e: 444, c: '#009270', era: 'pal' },
    { id: 'sil', n: '실루리아기', k: '실', s: 444, e: 419, c: '#b3e1b6', era: 'pal' },
    { id: 'dev', n: '데본기', k: '데', s: 419, e: 359, c: '#cb8c37', era: 'pal' },
    { id: 'carb', n: '석탄기', k: '석', s: 359, e: 299, c: '#67a599', era: 'pal' },
    { id: 'per', n: '페름기', k: '페', s: 299, e: 252, c: '#f04028', era: 'pal' },
    { id: 'tri', n: '트라이아스기', k: '트', s: 252, e: 201, c: '#812b92', era: 'mes' },
    { id: 'jur', n: '쥐라기', k: '쥐', s: 201, e: 145, c: '#34b2c9', era: 'mes' },
    { id: 'cre', n: '백악기', k: '백', s: 145, e: 66, c: '#7fc64e', era: 'mes' },
    { id: 'pal', n: '팔레오기', k: '팔', s: 66, e: 23, c: '#fd9a52', era: 'cen' },
    { id: 'neo', n: '네오기', k: '네', s: 23, e: 2.58, c: '#ffe619', era: 'cen' },
    { id: 'qua', n: '제4기', k: '4', s: 2.58, e: 0, c: '#f9f97f', era: 'cen' },
  ];
  const EPI = {}; EP.forEach((e, i) => { EPI[e.id] = i; });
  const PRE = { id: 'pre', n: '선캄브리아시대', s: 4600, e: 539, c: '#9c8f80' };
  const ERA = { pal: { n: '고생대', s: 539, e: 252, c: '#5fa35f' }, mes: { n: '중생대', s: 252, e: 66, c: '#3aa6c7' }, cen: { n: '신생대', s: 66, e: 0, c: '#f2a65a' } };
  const AGE_TXT = (ma) => (ma >= 100 ? (ma / 100).toFixed(2).replace(/0$/, '') + '억 년' : ma >= 10 ? Math.round(ma * 100) + '만 년' : Math.round(ma * 100) + '만 년');
  const epRange = (e) => AGE_TXT(e.s) + ' ~ ' + (e.e === 0 ? '현재' : AGE_TXT(e.e));
  const dayMin = (ma) => 1440 * (4600 - ma) / 4600;                       // 지질 시계: 46억 년 = 24시간
  const hhmm = (m) => { m = Math.round(m); const h = Math.floor(m / 60) % 24, mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };
  const ageOfMin = (m) => 4600 * (1 - m / 1440);
  const ageShort = (ma) => (ma >= 100 ? (ma / 100).toFixed(1) + '억 년' : ma >= 1 ? Math.round(ma) * 100 + '만 년' : '100만 년 이내');
  const snap5 = (m) => clamp(Math.round(m / 5) * 5, 0, 1435);
  const CLK = [   // 지질 시계에 표시할 세 경계 (5분 단위)
    { id: 'pal', n: '고생대 시작', ma: 539, tgt: 1270, col: ERA.pal.c },
    { id: 'mes', n: '중생대 시작', ma: 252, tgt: 1360, col: ERA.mes.c },
    { id: 'cen', n: '신생대 시작', ma: 66, tgt: 1420, col: ERA.cen.c },
  ];
  /* 지질 시계의 정답 시각 (5분 단위로 맞춘 값)이 계산값과 같은지 확인 */
  CLK.forEach((c) => { c.calc = dayMin(c.ma); if (Math.abs(snap5(c.calc) - c.tgt) > 0.01) throw new Error('clock target ' + c.id + ' ' + snap5(c.calc)); });

  /* ---------- 화석 카드 10장 ---------- */
  const FOS = [
    { id: 'coral', n: '산호', sp: [444, 0], wide: true, many: true, env: '따뜻하고 얕은 바다', lim: true, ans: 'si', envAns: 'warmsea' },
    { id: 'fern', n: '고사리', sp: [419, 0], wide: true, many: true, env: '따뜻하고 습한 육지', lim: true, ans: 'si', envAns: 'wetland' },
    { id: 'clam', n: '조개', sp: [539, 0], wide: true, many: true, env: '얕은 바다·갯벌', lim: true, ans: 'si', envAns: 'shore' },
    { id: 'trilo', n: '삼엽충', sp: [539, 444], wide: true, many: true, env: '여러 바다', lim: false, ans: 'std' },
    { id: 'grapto', n: '필석', sp: [485, 419], wide: true, many: true, env: '여러 바다', lim: false, ans: 'std' },
    { id: 'fusu', n: '방추충', sp: [330, 252], wide: true, many: true, env: '여러 바다', lim: false, ans: 'std' },
    { id: 'ammo', n: '암모나이트', sp: [252, 66], wide: true, many: true, env: '여러 바다', lim: false, ans: 'std' },
    { id: 'nummu', n: '화폐석', sp: [66, 23], wide: true, many: true, env: '여러 바다', lim: false, ans: 'std' },
    { id: 'mammoth', n: '매머드', sp: [2.58, 0], wide: true, many: true, env: '북반구 초원', lim: false, ans: 'std' },
    { id: 'print', n: '공룡 발자국', sp: [230, 66], wide: false, many: false, env: '여러 물가', lim: false, ans: 'none' },
  ];
  const FOSI = {}; FOS.forEach((f) => { FOSI[f.id] = f; });
  const CLS_NAME = { std: '표준 화석', si: '시상 화석', none: '둘 다 아님' };
  const CLS_COL = { std: '#3867f4', si: '#14a058', none: '#7b8798' };
  const CYCLE = [null, 'std', 'si', 'none'];
  /* 번성한 기(紀) 칸: 12개 칸 중 번성 기간과 겹치는 칸 (표준 화석 조건을 자료에서 계산) */
  const fosSlots = (f) => EP.map((e, i) => (e.s > f.sp[1] && e.e < f.sp[0] ? i : -1)).filter((i) => i >= 0);
  FOS.forEach((f) => {
    f.slots = fosSlots(f); f.short = new Set(f.slots.map((i) => EP[i].era)).size === 1;
    const std = f.short && f.wide && f.many, si = f.lim && !f.short, calc = std ? 'std' : si ? 'si' : 'none';
    if (calc !== f.ans) throw new Error('fossil rule mismatch ' + f.id + ' ' + calc);
  });

  /* ---------- 가상 지층의 화석 조합 (번성한 기(紀), 예시) ---------- */
  const BIO = [
    { id: 'trilo', n: '삼엽충', a: 'cam', b: 'ord', ico: 'trilo' },
    { id: 'grapto', n: '필석', a: 'ord', b: 'sil', ico: 'grapto' },
    { id: 'fusu', n: '방추충', a: 'carb', b: 'per', ico: 'fusu' },
    { id: 'fernf', n: '양치식물 숲', a: 'carb', b: 'carb', ico: 'fern' },
    { id: 'ammo', n: '암모나이트', a: 'tri', b: 'cre', ico: 'ammo' },
    { id: 'dino', n: '공룡', a: 'tri', b: 'cre', ico: 'dino' },
    { id: 'archae', n: '시조새', a: 'jur', b: 'jur', ico: 'bird' },
    { id: 'nummu', n: '화폐석', a: 'pal', b: 'pal', ico: 'nummu' },
    { id: 'mamm', n: '포유류', a: 'pal', b: 'qua', ico: 'mamm' },
  ];
  const BIOI = {}; BIO.forEach((b) => { BIOI[b.id] = b; });
  const LAYERS = [   // 아래 → 위 (가상 주상도)
    { id: 'L1', n: '① 맨 아래층', fos: ['trilo', 'grapto'], ans: 'ord', col: '#a98f6d' },
    { id: 'L2', n: '② 아래에서 둘째', fos: ['fusu', 'fernf'], ans: 'carb', col: '#7d8b86' },
    { id: 'L3', n: '③ 위에서 둘째', fos: ['ammo', 'dino', 'archae'], ans: 'jur', col: '#a58f7e' },
    { id: 'L4', n: '④ 맨 위층', fos: ['nummu', 'mamm'], ans: 'pal', col: '#b9a98d' },
  ];
  LAYERS.forEach((L) => {            // 정답을 번성 기간의 교집합으로 계산해 확인
    let lo = 0, hi = 11; L.fos.forEach((f) => { lo = Math.max(lo, EPI[BIOI[f].a]); hi = Math.min(hi, EPI[BIOI[f].b]); });
    if (lo !== hi || EP[lo].id !== L.ans) throw new Error('layer intersection ' + L.id);
  });

  /* ---------- 대멸종: 해양 생물 속 수 (예시), 감소율은 그래프의 두 점에서 계산 ---------- */
  const DIV = [[539, 20], [520, 50], [500, 62], [486, 62], [484, 46], [462, 100], [445, 100], [443, 15], [430, 45], [415, 70], [395, 80], [373, 80], [371, 20], [350, 50], [330, 70], [305, 85], [301, 85], [297, 66], [280, 85], [253, 85], [251, 3.4], [245, 12], [230, 35], [215, 55], [202, 60], [200, 12], [185, 35], [175, 55], [160, 70], [150, 80], [140, 80], [130, 90], [100, 100], [67, 100], [65, 24], [55, 50], [40, 70], [34, 60], [25, 80], [10, 90], [0, 100]];
  const divAt = (ma) => { for (let i = 0; i < DIV.length - 1; i++) { const a = DIV[i], b = DIV[i + 1]; if (ma <= a[0] && ma >= b[0]) return lerp(a[1], b[1], (a[0] - ma) / (a[0] - b[0] || 1)); } return DIV[DIV.length - 1][1]; };
  const EXT = [   // 후보 9곳: 대멸종 5회 + 작은 감소 3곳 + 감소 없는 곳 1곳 (i = 감소 직전 점의 번호)
    { id: 'x1', n: '캄브리아기 말', pt: [486, 62], big: false },
    { id: 'x2', n: '오르도비스기 말', pt: [445, 100], big: true },
    { id: 'x3', n: '데본기 후기', pt: [373, 80], big: true },
    { id: 'x4', n: '석탄기 말', pt: [301, 85], big: false },
    { id: 'x5', n: '페름기 말', pt: [253, 85], big: true },
    { id: 'x6', n: '트라이아스기 말', pt: [202, 60], big: true },
    { id: 'x7', n: '쥐라기 말', pt: [150, 80], big: false },
    { id: 'x8', n: '백악기 말', pt: [67, 100], big: true },
    { id: 'x9', n: '팔레오기 말', pt: [40, 70], big: false },
  ];
  EXT.forEach((x) => {
    const i = DIV.findIndex((d) => d[0] === x.pt[0] && d[1] === x.pt[1]); if (i < 0) throw new Error('ext pt ' + x.id);
    x.y0 = DIV[i][1]; x.y1 = DIV[i + 1][1]; x.ma = (DIV[i][0] + DIV[i + 1][0]) / 2;
    x.drop = Math.round((1 - x.y1 / x.y0) * 100);
    if ((x.drop >= 75) !== x.big) throw new Error('ext big ' + x.id + ' ' + x.drop);
  });
  const EXT_DROP = { x2: 85, x3: 75, x5: 96, x6: 80, x8: 76 };
  EXT.forEach((x) => { if (x.big && EXT_DROP[x.id] !== x.drop) throw new Error('ext drop ' + x.id + ' ' + x.drop); });

  /* ---------- 한반도 화석 지점 (예시 자료) ---------- */
  const SITES = [
    { id: 'taebaek', loc: '강원 태백', fos: '삼엽충', lon: 128.98, lat: 37.17, era: 'e1', env: 'sea', ico: 'trilo', grp: '조선누층군', hint: '강원 남쪽 산지' },
    { id: 'jeongseon', loc: '강원 정선', fos: '방추충', lon: 128.66, lat: 37.38, era: 'e2', env: 'sea', ico: 'fusu', grp: '평안누층군', hint: '태백의 북서쪽' },
    { id: 'boryeong', loc: '충남 보령', fos: '식물', lon: 126.60, lat: 36.35, era: 'e3', env: 'land', ico: 'fern', grp: '대동누층군', hint: '충남 서해안' },
    { id: 'goseong', loc: '경남 고성', fos: '공룡 발자국', lon: 128.32, lat: 34.97, era: 'e4', env: 'lake', ico: 'print', grp: '경상누층군', hint: '경남 남해안' },
    { id: 'pohang', loc: '경북 포항', fos: '식물', lon: 129.37, lat: 36.03, era: 'e5', env: 'land', ico: 'fern', grp: '신생대 퇴적층', hint: '경북 동해안' },
    { id: 'seogwipo', loc: '제주 서귀포', fos: '바다 조개', lon: 126.56, lat: 33.25, era: 'e5', env: 'sea', ico: 'clam', grp: '신생대 퇴적층', hint: '제주도 남쪽' },
  ];
  const SITEI = {}; SITES.forEach((s) => { SITEI[s.id] = s; });
  const SITE_ERA = [{ id: 'e1', label: '고생대 캄브리아~오르도비스기' }, { id: 'e2', label: '고생대 석탄~페름기' }, { id: 'e3', label: '중생대 트라이아스~쥐라기' }, { id: 'e4', label: '중생대 백악기' }, { id: 'e5', label: '신생대' }];
  const SITE_ENV = [{ id: 'sea', label: '바다' }, { id: 'lake', label: '호숫가' }, { id: 'land', label: '육지(숲·습지)' }];
  const KOREA = [[126.68, 37.78], [126.45, 37.62], [126.55, 37.45], [126.70, 37.25], [126.92, 37.08], [126.78, 36.93], [126.62, 36.9], [126.35, 36.96], [126.15, 36.8], [126.33, 36.6], [126.5, 36.38], [126.55, 36.05], [126.72, 35.95], [126.5, 35.7], [126.45, 35.45], [126.3, 35.15], [126.4, 34.9], [126.3, 34.6], [126.5, 34.35], [126.85, 34.45], [127.2, 34.55], [127.45, 34.5], [127.65, 34.75], [127.95, 34.88], [128.3, 34.85], [128.65, 34.72], [128.85, 35.02], [129.1, 35.15], [129.35, 35.45], [129.45, 35.65], [129.55, 36.08], [129.4, 36.55], [129.4, 37.05], [129.15, 37.45], [128.95, 37.75], [128.55, 38.2], [128.35, 38.62], [127.8, 38.35], [127.3, 38.32], [126.9, 37.95]];
  const CITIES = [['서울', 126.98, 37.56], ['강릉', 128.9, 37.75], ['대전', 127.38, 36.35], ['대구', 128.6, 35.87], ['광주', 126.85, 35.16], ['부산', 129.07, 35.18]];
  const PROV = [['강원', 128.35, 37.95], ['경기', 127.45, 37.32], ['충남', 126.75, 36.62], ['충북', 127.85, 36.85], ['전북', 127.15, 35.75], ['전남', 126.95, 34.75], ['경북', 128.85, 36.45], ['경남', 128.3, 35.45]];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'form', clock: 0, fade: 0, sub: 'age',
    hard: true, fast: true, fo: { run: false, t: 0, res: null, hard: true, fast: true }, seenOK: false, seenFail: false,
    cls: {}, badCards: [], envOk: false,
    ordShow: [], ordOk: false, ordBad: -1,
    mk: CLK.map((c, i) => ({ id: c.id, t: [360, 720, 1080][i], tx: [360, 720, 1080][i], locked: false, pop: 0 })), dragMk: -1, clockReveal: false,
    layer: 0, ansShown: {}, lyOk: false,
    marks: {}, extBad: [], extOk: false, extRev: 0,
    pins: [], dragPin: -1, mapShake: 0, mapMsg: '',
    bioAnim: 0, pop: {},
  };

  /* ---------- HTML 도구 ---------- */
  const ordEp = makeOrder($('#ordEp'), ['per', 'cam', 'jur', 'neo', 'sil', 'carb', 'pal', 'ord', 'cre', 'dev', 'qua', 'tri'].map((id) => ({ id, label: EP[EPI[id]].n })), EP.map((e) => e.id), () => { syncOrd(); });
  $('#ordEp').classList.add('grid2');
  const clsEnv = makeClassify($('#clsEnv'), [{ id: 'coral', label: '🪸 산호' }, { id: 'fern', label: '🌿 고사리' }, { id: 'clam', label: '🐚 조개' }],
    [{ id: 'warmsea', label: '따뜻하고 얕은 바다' }, { id: 'wetland', label: '따뜻하고 습한 육지' }, { id: 'shore', label: '얕은 바다·갯벌' }], { coral: 'warmsea', fern: 'wetland', clam: 'shore' });
  const selLy = makeSelects($('#selLy'), LAYERS.map((L) => ({ id: L.id, label: L.n })), EP.map((e) => ({ id: e.id, label: e.n })), Object.fromEntries(LAYERS.map((L) => [L.id, L.ans])), () => { /* 선택은 바로 반영 */ });
  /* 지점마다 시대와 환경 두 칸 */
  const selSite = (function () {
    const root = $('#selSite'); root.innerHTML = ''; root.classList.add('sels');
    const st = { era: {}, env: {}, rows: {} };
    SITES.forEach((s) => {
      const row = mk('div', 'sel-row'); st.rows[s.id] = row;
      row.appendChild(mk('label', 'sel-lab', s.loc + ' · ' + s.fos));
      const a = mk('select', 'sel'), b = mk('select', 'sel');
      a.setAttribute('aria-label', s.loc + ' 시대'); b.setAttribute('aria-label', s.loc + ' 환경');
      const oa = mk('option', '', '시대'); oa.value = ''; a.appendChild(oa); SITE_ERA.forEach((o) => { const e = mk('option', '', o.label); e.value = o.id; a.appendChild(e); });
      const ob = mk('option', '', '환경'); ob.value = ''; b.appendChild(ob); SITE_ENV.forEach((o) => { const e = mk('option', '', o.label); e.value = o.id; b.appendChild(e); });
      a.addEventListener('change', () => { Sound.click(); st.era[s.id] = a.value || null; row.classList.remove('bad'); });
      b.addEventListener('change', () => { Sound.click(); st.env[s.id] = b.value || null; row.classList.remove('bad'); });
      row.append(a, b); root.appendChild(row); st[s.id] = [a, b];
    });
    st.reset = () => { st.era = {}; st.env = {}; SITES.forEach((s) => { st[s.id][0].value = ''; st[s.id][1].value = ''; st.rows[s.id].classList.remove('bad'); }); };
    st.set = (id, e, v) => { st.era[id] = e; st.env[id] = v; st[id][0].value = e; st[id][1].value = v; };
    st.count = () => SITES.filter((s) => st.era[s.id] && st.env[s.id]).length;
    st.wrong = () => SITES.filter((s) => st.era[s.id] && st.env[s.id] && (st.era[s.id] !== s.era || st.env[s.id] !== s.env)).map((s) => s.id);
    st.ok = () => st.count() === SITES.length && st.wrong().length === 0;
    st.mark = (ids) => SITES.forEach((s) => st.rows[s.id].classList.toggle('bad', ids.includes(s.id)));
    return st;
  })();
  function syncOrd() { S.ordShow = ordEp.seq.slice(); S.ordBad = -1; S.ordOk = false; ordEp.mark(null); }

  /* ======================================================
     장면 1: 화석이 만들어지는 과정
     ====================================================== */
  const FM = { alive: '#c98b52', dead: '#8d7b68' };
  function startForm() {
    S.fo = { run: true, t: 0, res: null, hard: S.hard, fast: S.fast, sx: 0 }; parts.clear(); hideHint();
    Sound.click && Sound.click();
  }
  function resetForm() { S.fo = { run: false, t: 0, res: null, hard: S.hard, fast: S.fast, sx: 0 }; parts.clear(); }
  function finishForm() {
    const fo = S.fo; fo.run = false; fo.t = 8.2; fo.res = fo.hard && fo.fast;
    if (fo.res) { S.seenOK = true; parts.burst(S.fo.bx || 300, S.fo.by || 300, { count: 22, colors: ['#e0b46c', '#c98b52', '#ffd98a', '#fff3c4'], speed: 150 }); say('화석이 만들어졌어요!', false, 2.6); Sound.success && Sound.success(); }
    else { S.seenFail = true; say('화석이 되지 못했어요', true, 2.6); }
  }
  function drawJelly(x, y, sc, alpha, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(-4, -8, 2, 0, 0, 26); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(236,160,205,.75)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, Math.PI, 2 * Math.PI); ctx.quadraticCurveTo(0, 8, -24, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(236,160,205,.8)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 6.5, 3); ctx.bezierCurveTo(i * 6.5 + Math.sin(t * 3 + i) * 4, 14, i * 6.5 - Math.sin(t * 3 + i) * 4, 22, i * 6.5 + Math.sin(t * 2 + i) * 3, 32); ctx.stroke(); }
    ctx.restore();
  }
  function drawOrg(hard, x, y, rot, sc, alpha, t, dead) {
    if (!hard) { drawJelly(x, y, sc, alpha, t); return; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    D.shadow(() => { fossilIco('trilo', 0, 0, 32 * sc, dead ? '#8a7864' : '#b9773b', 'rgba(255,240,210,.8)'); }, { blur: 4, y: 2 });
    ctx.restore();
  }
  function drawCrab(x, y, t, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.fillStyle = '#d96a4a'; ctx.strokeStyle = '#b4492e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, TAU); ctx.fill();
    for (let i = -2; i <= 2; i++) { if (i === 0) continue; ctx.beginPath(); ctx.moveTo(i * 4, 5); ctx.lineTo(i * 7 + Math.sin(t * 9 + i) * 1.5, 12); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(-14, -5 + Math.sin(t * 8) * 1.5, 4, 0, TAU); ctx.arc(14, -5 - Math.sin(t * 8) * 1.5, 4, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawForm(t, dt) {
    const SC = PHONE ? { x: 8, y: 8, w: 584, h: 540 } : { x: 10, y: 10, w: 780, h: 392 };
    const IN = PHONE ? { x: 8, y: 556, w: 584, h: 316 } : { x: 10, y: 410, w: 780, h: 140 };
    const fo = S.fo; if (fo.run) { fo.t += dt; if (fo.t >= 8.2) finishForm(); }
    const T = fo.t, hard = fo.run || fo.res != null ? fo.hard : S.hard, fast = fo.run || fo.res != null ? fo.fast : S.fast;
    const sbY = SC.y + SC.h - (PHONE ? 170 : 112), X0 = SC.x + SC.w * (PHONE ? 0.5 : 0.42), Yr = sbY - 22;
    ctx.save(); rr(SC.x, SC.y, SC.w, SC.h, 14).clip();
    let g = ctx.createLinearGradient(0, SC.y, 0, sbY); g.addColorStop(0, '#c6ecf8'); g.addColorStop(1, '#4d9bc4'); ctx.fillStyle = g; ctx.fillRect(SC.x, SC.y, SC.w, sbY - SC.y + 6);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,.07)'; const x0 = SC.x + 60 + i * SC.w / 4 + Math.sin(t * 0.4 + i) * 12; ctx.beginPath(); ctx.moveTo(x0, SC.y); ctx.lineTo(x0 + 70, SC.y); ctx.lineTo(x0 + 10, sbY); ctx.lineTo(x0 - 60, sbY); ctx.fill(); }
    // 바닥의 오래된 지층
    const bandH = (SC.y + SC.h - sbY) / 3;
    ['#cdbd9d', '#b9a888', '#a09070'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(SC.x, sbY + i * bandH, SC.w, bandH + 1); });
    ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 40; i++) { const r = seeded(i + 3); ctx.fillRect(SC.x + r() * SC.w, sbY + r() * (SC.y + SC.h - sbY), 3, 2); }
    // 시간 단계
    const stage = T < 1.6 ? 0 : T < 3.5 ? 1 : T < 6.5 ? 2 : 3;
    const Hfull = fast ? 74 : 8, H = stage < 2 ? 0 : Hfull * SciSim.ease.inOutQuad(clamp((T - 3.5) / 3, 0, 1));
    // 생물 위치
    let ox, oy, rot = 0, sc = 1, al = 1;
    if (T < 1.6) { ox = X0 - 100 + T * 62 + Math.sin(t * 2) * 6; oy = SC.y + 110 + Math.sin(t * 3) * 10; }
    else {
      const u = SciSim.ease.inOutQuad(clamp((T - 1.6) / 1.9, 0, 1)); const sx0 = X0 - 100 + 1.6 * 62, sy0 = SC.y + 110;
      ox = lerp(sx0, X0, u) + Math.sin(T * 5) * (1 - u) * 6; oy = lerp(sy0, Yr, u); rot = hard ? lerp(0, 1.5708, u) + 0 : 0;
      if (!hard) { sc = lerp(1, 0.9, u); }
    }
    const dead = T >= 1.6;
    // 분해 · 깨짐
    if (T > 4.2 && !(hard && fast)) { const k = clamp((T - 4.2) / 3.2, 0, 1); al = 1 - k; }
    if (T > 5.4 && !hard && fast) al = Math.min(al, 1 - clamp((T - 5.4) / 1.6, 0, 1));
    fo.bx = ox; fo.by = oy;
    // 생물 그리기 (쌓인 퇴적물 아래에 묻히기 전)
    const coverTop = sbY - H;
    if (hard && !fast && T > 4.4) {      // 느린 매몰 + 껍데기: 파편으로 부서져요
      const k = clamp((T - 4.4) / 3, 0, 1);
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(ox + (i - 1.5) * 14 * (1 + k * 2.2), oy + k * 8 * (i % 2)); ctx.rotate(1.5708 + i * 0.8 * k); ctx.beginPath(); ctx.fillStyle = '#8a7864'; ctx.ellipse(0, 0, 9, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else drawOrg(hard, ox, oy, rot, sc, al, t, dead);
    if (dead && !fast && T > 3.6 && T < 7.4) { drawCrab(lerp(ox + 110, ox + 22, clamp((T - 3.6) / 1.4, 0, 1)), sbY - 8, t, clamp((7.4 - T) / 0.8, 0, 1)); }
    if (dead && !hard && T > 3.6 && T < 7.2) { for (let i = 0; i < 2; i++) if (Math.random() < 0.35) parts.emit({ x: ox + (Math.random() - 0.5) * 24, y: oy - 8, vx: 0, vy: -26, life: 1.3, size: 2 + Math.random() * 2.5, color: 'rgba(255,255,255,.85)', shape: 'bubble', fade: true }); }
    // 퇴적물 더미
    if (H > 0.5) {
      const w = PHONE ? 300 : 360, topY = sbY - H;
      const rock = fast && hard ? clamp((T - 6.5) / 1.7, 0, 1) : 0;
      const col = mixc('#d8c8a4', '#8f7f66', rock);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X0 - w / 2 - 40, sbY + 2); ctx.quadraticCurveTo(X0 - w / 2, topY + 6, X0 - w / 2 + 50, topY); ctx.lineTo(X0 + w / 2 - 50, topY); ctx.quadraticCurveTo(X0 + w / 2, topY + 6, X0 + w / 2 + 40, sbY + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,30,.25)'; ctx.lineWidth = 1.4; for (let k = 1; k < 6; k++) { const yy = topY + k * H / 6; if (yy < sbY - 1) { ctx.beginPath(); ctx.moveTo(X0 - w / 2 + 14 + k * 6, yy); ctx.lineTo(X0 + w / 2 - 14 - k * 6, yy); ctx.stroke(); } }
      if (fast && hard && T > 5.2) {   // 퇴적물 속에 묻힌 껍데기가 비쳐 보여요
        ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * rock; ctx.translate(ox, Math.min(oy, sbY - 22)); ctx.rotate(1.5708); fossilIco('trilo', 0, 0, 28, rock > 0.2 ? '#4f4130' : '#a46c36', 'rgba(255,240,210,.7)'); ctx.restore();
      }
    }
    // 떨어지는 퇴적물
    if (fo.run && T > 3.0 && T < 6.6) {
      const rate = fast ? 90 : 9, n = Math.round(rate * dt + Math.random());
      for (let i = 0; i < n; i++) parts.emit({ x: X0 + (Math.random() - 0.5) * 330, y: SC.y + 20, vx: (Math.random() - 0.5) * 10, vy: 160, life: Math.max(0.2, (coverTop - SC.y - 24) / 160), size: 2.4, color: '#c9ad7d', shape: 'square', fade: false });
    }
    ctx.restore();
    // 단계 이름표
    const names = ['① 살아 있어요', '② 죽어서 가라앉아요', fast ? '③ 퇴적물이 빨리 덮어요' : '③ 퇴적물이 천천히 쌓여요', fo.res == null ? '④ 굳는 중…' : fo.res ? '④ 암석이 되고 화석이 남아요' : '④ 흔적이 남지 않아요'];
    D.label(SC.x + 12 + 70, SC.y + 22, names[stage], { bg: '#334155', size: 13.5, align: 'left' });
    D.text(SC.x + SC.w - 14, SC.y + 28, T < 3.5 ? '' : T < 6.6 ? '수천~수만 년' : '수백만 년 뒤', { size: 13.5, weight: 800, color: '#334155', align: 'right' });
    if (!fo.run && fo.res == null) D.label(X0, SC.y + SC.h * 0.42 + 40, '▶ 단추를 눌러 시작해요', { bg: 'rgba(51,65,85,.9)', size: 14 });
    // 결과 표시: 화석 조각
    if (fo.res != null) {
      const pw = 190, ph = 100, px = fo.res ? SC.x + SC.w - pw - 14 : SC.x + SC.w - pw - 14, py = SC.y + 48;
      D.shadow(() => { ctx.fillStyle = fo.res ? '#e9efe0' : '#f4e9e9'; rr(px, py, pw, ph, 12).fill(); }, { blur: 6, y: 2 });
      if (fo.res) { rockTile(px + 8, py + 8, 74, ph - 16, '#a89678'); fossilIco('trilo', px + 45, py + ph / 2, 28, '#4a3b28', 'rgba(255,245,220,.7)'); D.text(px + 88, py + 40, '화석', { size: 17, weight: 800, color: '#14663a', align: 'left' }); D.text(px + 88, py + 64, '발견!', { size: 15, weight: 800, color: '#14663a', align: 'left' }); }
      else { D.text(px + pw / 2, py + 42, '화석 없음', { size: 17, weight: 800, color: '#a3262b' }); D.text(px + pw / 2, py + 66, '남은 흔적이 없어요', { size: 13.5, weight: 700, color: '#7f1d1d' }); }
    }
    // 정보 카드
    card(IN);
    D.text(IN.x + 14, IN.y + 8 + 15 * FS, '화석이 되려면', { size: 15, weight: 800, color: '#334155', align: 'left' });
    const okH = hard, okF = fast, rows = [[okH, '① 몸에 단단한 부분(껍데기·뼈)이 있어요', '단단한 부분이 없으면 금방 분해돼요'], [okF, '② 죽은 뒤 퇴적물에 빨리 묻혀요', '늦게 묻히면 분해되거나 부서져요']];
    rows.forEach((r, i) => {
      const yy = IN.y + 34 * FS + 14 + i * (PHONE ? 62 : 32);
      D.text(IN.x + 18, yy + 5, r[0] ? '✅' : '❌', { size: 16, align: 'left' });
      D.text(IN.x + 48, yy + 5, r[1], { size: 14.5, weight: 800, color: r[0] ? '#14663a' : '#a3262b', align: 'left' });
      if (!r[0] && PHONE) D.text(IN.x + 48, yy + 5 + 22, r[2], { size: 13, weight: 700, color: '#64748b', align: 'left' });
      if (!r[0] && !PHONE) D.text(IN.x + 440, yy + 5, r[2], { size: 13.5, weight: 700, color: '#64748b', align: 'left' });
    });
    const yy = IN.y + IN.h - (PHONE ? 52 : 22);
    const resT = fo.res == null ? (okH && okF ? '두 조건이 모두 맞아요 → 화석이 될 수 있어요' : '조건이 모두 맞아야 화석으로 남을 수 있어요') : fo.res ? '결과: 화석이 만들어졌어요 ✅' : '결과: 화석이 되지 못했어요 ❌';
    D.text(IN.x + IN.w / 2, yy, resT, { size: 15, weight: 800, color: fo.res === false ? '#a3262b' : fo.res ? '#14663a' : '#334155' });
  }

  /* ======================================================
     장면 2: 화석 카드 10장 (표준 화석 · 시상 화석)
     ====================================================== */
  const cardRects = () => {
    const out = [];
    if (!PHONE) { const cw = 152, ch = 212, g = 6, x0 = (VW - (5 * cw + 4 * g)) / 2; FOS.forEach((f, i) => out.push({ f, x: x0 + (i % 5) * (cw + g), y: 8 + Math.floor(i / 5) * (ch + g), w: cw, h: ch })); }
    else { const cw = 288, ch = 140, g = 5; FOS.forEach((f, i) => out.push({ f, x: 8 + (i % 2) * (cw + g + 0), y: 8 + Math.floor(i / 2) * (ch + g), w: cw, h: ch })); }
    return out;
  };
  function drawEpRuler(x, y, w, h, slots, col) {
    const cw = w / 12;
    for (let i = 0; i < 12; i++) {
      const era = ERA[EP[i].era]; ctx.fillStyle = rgba(era.c, 0.22); ctx.fillRect(x + i * cw, y, cw - 0.6, h);
      if (slots.includes(i)) { ctx.fillStyle = col; ctx.fillRect(x + i * cw, y, cw - 0.6, h); }
    }
    ctx.strokeStyle = 'rgba(51,65,85,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }
  function drawFossilCard(R, f, t) {
    const c = S.cls[f.id], bad = S.badCards.includes(f.id), pop = S.pop[f.id] || 0;
    ctx.save(); const cx = R.x + R.w / 2, cy = R.y + R.h / 2; ctx.translate(cx, cy); ctx.scale(1 + pop * 0.05, 1 + pop * 0.05); ctx.translate(-cx, -cy);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 6, y: 2 });
    const bc = bad ? '#e2464b' : c ? CLS_COL[c] : '#cbd5e1';
    ctx.strokeStyle = bc; ctx.lineWidth = c || bad ? 3.5 : 1.5; rr(R.x, R.y, R.w, R.h, 14).stroke();
    const wide = R.w > 200;
    const tile = wide ? { x: R.x + 8, y: R.y + 8, w: 96, h: R.h - 16 } : { x: R.x + 8, y: R.y + 8, w: R.w - 16, h: 62 };
    rockTile(tile.x, tile.y, tile.w, tile.h, '#c8b896');
    fossilIco(f.id, tile.x + tile.w / 2, tile.y + tile.h / 2, wide ? 34 : 27, '#4f402c', 'rgba(255,248,230,.75)');
    const ix = wide ? R.x + 114 : R.x + 10, iw = wide ? R.w - 122 : R.w - 20;
    const dy = wide ? [22, 20, 22, 22, 20] : [90, 20, 24, 24, 22];
    let y = R.y + dy[0];
    D.text(ix, y, f.n, { size: 16, weight: 800, color: '#1b2333', align: 'left' });
    if (c) D.label(R.x + R.w - 8, y - 5, c === 'std' ? '표준' : c === 'si' ? '시상' : '아님', { bg: CLS_COL[c], size: 13, align: 'right', pad: 7 });
    const lw = wide ? 44 : 38, bw = iw - lw - 2;
    y += dy[1];
    D.text(ix, y + 11, '번성', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    drawEpRuler(ix + lw, y, bw, 14, f.slots, '#e0742f');
    y += dy[2];
    D.text(ix, y + 14, '분포', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    ctx.fillStyle = '#e8f1f8'; rr(ix + lw, y, 44, 22, 8).fill();
    const pts = f.wide ? [[6, 6], [18, 14], [30, 5], [38, 15], [12, 17], [25, 11], [35, 9]] : [[8, 14], [13, 10], [10, 17]];
    ctx.fillStyle = '#3867f4'; pts.forEach((p) => { ctx.beginPath(); ctx.arc(ix + lw + p[0], y + p[1] - 1, 2.6, 0, TAU); ctx.fill(); });
    D.text(ix + lw + 50, y + 14, f.wide ? '넓음' : '좁음', { size: 13, weight: 700, color: '#334155', align: 'left' });
    y += dy[3];
    D.text(ix, y + 12, '개체', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(ix + lw + 5 + i * 9.5, y + 9, 3.8, 0, TAU); ctx.fillStyle = i < (f.many ? 5 : 2) ? '#14a058' : '#dbe3ec'; ctx.fill(); }
    D.text(ix + lw + 54, y + 13, f.many ? '많음' : '적음', { size: 13, weight: 700, color: '#334155', align: 'left' });
    y += dy[4];
    if (!wide) { D.text(ix, y + 12, '환경', { size: 13, weight: 800, color: '#64748b', align: 'left' }); drawWrap(ix + lw, y + 12, f.env, iw - lw, 13, { align: 'left', weight: 700, color: f.lim ? '#14663a' : '#64748b', lh: 1.2 }); }
    else drawWrap(ix, y + 12, '📍 ' + f.env, iw, 13, { align: 'left', weight: 700, color: f.lim ? '#14663a' : '#64748b', lh: 1.2 });
    ctx.restore();
  }
  function drawCards(t, dt) {
    cardRects().forEach((R) => drawFossilCard(R, R.f, t));
    Object.keys(S.pop).forEach((k) => { S.pop[k] = approach(S.pop[k], 0, dt, 9); });
    const by = PHONE ? 8 + 5 * 145 + 2 : 8 + 2 * 218 + 2, bh = VH - by - 8;
    card({ x: 8, y: by, w: VW - 16, h: bh });
    const rows = [['표준 화석', '#3867f4', '번성한 시기가 짧고(한 시대 안) · 넓게 분포하고 · 개체 수가 많아요 → 지층의 시대를 알려 줘요'], ['시상 화석', '#14a058', '특정 환경에서만 살고 오래 살아남은 생물 → 퇴적 환경을 알려 줘요'], ['둘 다 아님', '#7b8798', '두 조건에 모두 맞지 않아요']];
    let yy = by + 22 * FS;
    rows.forEach((r, i) => {
      ctx.fillStyle = r[1]; rr(18, yy - 12 * FS + 2, 14, 14, 4).fill();
      const used = drawWrap(PHONE ? 40 : 40, yy + 2, r[0] + ': ' + r[2], VW - 64, PHONE ? 12.5 : 13.5, { align: 'left', weight: 700 });
      yy = used + (PHONE ? 22 : 24);
    });
    D.text(VW - 16, by + bh - 8, '카드를 눌러 분류를 바꿔요', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
  }

  /* ======================================================
     장면 3: 기(紀)의 순서 (아래가 오래된 지층)
     ====================================================== */
  const lum = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return 0.6; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const inkOn = (hex) => (lum(hex) > 0.62 ? '#1b2333' : '#ffffff');
  S.opop = {};
  function drawOrder(t, dt) {
    const rowH = PHONE ? 52 : 36, baseH = PHONE ? 56 : 40, gap = 3;
    const LX = PHONE ? 8 : 14, LW = PHONE ? 440 : 366, bottom = VH - 12;
    const yRow = (k) => bottom - baseH - gap - (k + 1) * (rowH + gap) + gap;
    // 선캄브리아 바닥
    D.shadow(() => { ctx.fillStyle = PRE.c; rr(LX, bottom - baseH, LW, baseH, 8).fill(); }, { blur: 4, y: 2 });
    D.text(LX + 14, bottom - baseH / 2 + 5, '선캄브리아시대', { size: 15, weight: 800, color: '#fff', align: 'left' });
    D.text(LX + LW - 12, bottom - baseH / 2 + 5, S.ordOk ? '46억 ~ 5.39억 년 전' : '가장 아래 (가장 오래됨)', { size: 13, weight: 700, color: 'rgba(255,255,255,.9)', align: 'right' });
    for (let k = 0; k < 12; k++) {
      const y = yRow(k), id = S.ordShow[k], e = id ? EP[EPI[id]] : null;
      const pop = S.opop[k] || 0; ctx.save(); ctx.translate(LX + LW / 2, y + rowH / 2); ctx.scale(1 + pop * 0.04, 1 + pop * 0.12); ctx.translate(-(LX + LW / 2), -(y + rowH / 2));
      if (e) {
        const bad = S.ordBad === k;
        D.shadow(() => { ctx.fillStyle = e.c; rr(LX, y, LW, rowH, 8).fill(); }, { blur: 3, y: 1 });
        if (bad) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; rr(LX, y, LW, rowH, 8).stroke(); }
        D.text(LX + 14, y + rowH / 2 + 5, e.n, { size: 15, weight: 800, color: inkOn(e.c), align: 'left' });
        if (S.ordOk) D.text(LX + LW - 12, y + rowH / 2 + 5, AGE_TXT(e.s) + ' ~ ' + (e.e === 0 ? '현재' : AGE_TXT(e.e)), { size: 13, weight: 700, color: inkOn(e.c), align: 'right' });
      } else {
        ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; rr(LX, y, LW, rowH, 8).stroke(); ctx.setLineDash([]);
        D.text(LX + LW / 2, y + rowH / 2 + 5, k === ordEp.seq.length ? '▶ 여기에 쌓여요' : '', { size: 13, weight: 700, color: '#64748b' });
      }
      ctx.restore();
      S.opop[k] = approach(S.opop[k] || 0, 0, dt, 8);
    }
    // 시대 묶음
    const grp = [['pal', 0, 5], ['mes', 6, 8], ['cen', 9, 11]];
    const bx = LX + LW + 8;
    grp.forEach((g) => {
      const y0 = yRow(g[2]), y1 = yRow(g[1]) + rowH, on = S.ordShow.length > g[2], onAny = S.ordShow.length > g[1];
      ctx.fillStyle = on || S.ordOk ? ERA[g[0]].c : '#d5dde8'; rr(bx, y0, 9, y1 - y0, 4).fill();
      D.text(bx + 16, (y0 + y1) / 2 + 5, ERA[g[0]].n, { size: 14.5, weight: 800, color: on ? '#334155' : '#94a3b8', align: 'left' });
      if (S.ordOk) D.text(bx + 16, (y0 + y1) / 2 + 5 + 20 * FS * 0.8, g[2] - g[1] + 1 + '개 기', { size: 13, weight: 700, color: '#64748b', align: 'left' });
    });
    if (!PHONE) {
      const R = { x: 520, y: 10, w: 270, h: 286 };
      card(R, '지질시대 구분');
      const items = [[PRE.c, '선캄브리아시대', '46억 ~ 5.39억 년 전'], [ERA.pal.c, '고생대', '5.39억 ~ 2.52억 년 전'], [ERA.mes.c, '중생대', '2.52억 년 전 ~ 6600만 년 전'], [ERA.cen.c, '신생대', '6600만 년 전 ~ 현재']];
      items.forEach((it, i) => { const y = R.y + 44 + i * 58; ctx.fillStyle = it[0]; rr(R.x + 14, y, 12, 40, 4).fill(); D.text(R.x + 36, y + 17, it[1], { size: 15, weight: 800, color: '#1b2333', align: 'left' }); D.text(R.x + 36, y + 37, it[2], { size: 13, weight: 700, color: '#64748b', align: 'left' }); });
      const R2 = { x: 520, y: 306, w: 270, h: 244 };
      card(R2);
      drawWrap(R2.x + R2.w / 2, R2.y + 30, '지층은 아래에 있는 것이 먼저 쌓였어요(지층 누중의 법칙). 가장 오래된 기(紀)부터 차례로 골라 아래에서 위로 쌓아 보세요.', R2.w - 28, 14, { weight: 700, lh: 1.4 });
      drawWrap(R2.x + R2.w / 2, R2.y + 150, '기(紀)보다 더 작은 세(世) 단위는 이 수업에서 다루지 않아요.', R2.w - 28, 13.5, { weight: 700, color: '#64748b', lh: 1.4 });
    }
  }

  /* ======================================================
     장면 4: 지질 시계 (46억 년 = 24시간)
     ====================================================== */
  const CK = PHONE ? { cx: 300, cy: 252, R: 176 } : { cx: 226, cy: 284, R: 176 };
  const TH = 40, PCT_PRE = (Math.round(4061 / 4600 * 1000) / 10).toFixed(1);
  const mAng = (m) => -Math.PI / 2 + (m / 1440) * TAU;
  const angMin = (x, y) => { let a = Math.atan2(y - CK.cy, x - CK.cx) + Math.PI / 2; a = ((a % TAU) + TAU) % TAU; return (a / TAU) * 1440; };
  const mkPos = (m, r) => [CK.cx + Math.cos(mAng(m)) * r, CK.cy + Math.sin(mAng(m)) * r];
  function arcBand(m0, m1, r0, r1, col) {
    ctx.beginPath(); ctx.arc(CK.cx, CK.cy, r1, mAng(m0), mAng(m1)); ctx.arc(CK.cx, CK.cy, r0, mAng(m1), mAng(m0), true); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  S.lastMk = -1;
  function drawClock(t, dt) {
    const { cx, cy, R } = CK;
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    // 고리
    const rev = S.clockReveal || (game && game.free);
    arcBand(0, 1440, R - TH, R, '#e6ecf3');
    const tm = S.mk.map((m) => m.t).sort((x, y) => x - y), lk = S.mk.map((m) => m.locked || rev);
    if (lk[0]) arcBand(0, tm[0], R - TH, R, PRE.c);
    if (lk[0] && lk[1]) arcBand(tm[0], tm[1], R - TH, R, ERA.pal.c);
    if (lk[1] && lk[2]) arcBand(tm[1], tm[2], R - TH, R, ERA.mes.c);
    if (lk[2]) arcBand(tm[2], 1440, R - TH, R, ERA.cen.c);
    // 눈금
    for (let h = 0; h < 24; h++) {
      const a = mAng(h * 60), r0 = R - TH - (h % 3 === 0 ? 8 : 4);
      ctx.strokeStyle = h % 3 === 0 ? '#475569' : '#94a3b8'; ctx.lineWidth = h % 3 === 0 ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - TH), cy + Math.sin(a) * (R - TH)); ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.stroke();
      if (h % 3 === 0) { const p = mkPos(h * 60, R - TH - 24); D.text(p[0], p[1] + 5, h + '시', { size: 13.5, weight: 800, color: '#475569' }); }
    }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.arc(cx, cy, R - TH, 0, TAU); ctx.stroke();
    // 시대 이름 (맞춘 구간에만 표시)
    if (lk[0]) { const p = mkPos(tm[0] / 2, R - TH / 2); D.text(p[0], p[1] + 5, '선캄브리아', { size: 13.5, weight: 800, color: '#fff' }); }
    if (lk[0] && lk[1]) { const p = mkPos((tm[0] + tm[1]) / 2, R + 14); D.text(p[0] - 10, p[1] + 4, '고생대', { size: 13, weight: 800, color: shade(ERA.pal.c, -0.25) }); }
    // 가운데 글자
    const mk = S.lastMk >= 0 ? S.mk[S.lastMk] : null;
    if (mk) {
      D.text(cx, cy - 18, hhmm(mk.t), { size: 36, weight: 800, color: '#1b2333' });
      D.text(cx, cy + 14, '약 ' + ageShort(ageOfMin(mk.t)) + ' 전', { size: 17, weight: 800, color: '#334155' });
      D.text(cx, cy + 40, CLK[S.lastMk].n, { size: 14, weight: 700, color: '#64748b' });
    } else {
      D.text(cx, cy - 18, '지질 시계', { size: 22, weight: 800, color: '#1b2333' });
      D.text(cx, cy + 12, '46억 년 = 24시간', { size: 16, weight: 800, color: '#334155' });
      D.text(cx, cy + 36, '1시간 ≈ 1.9억 년', { size: 14, weight: 700, color: '#64748b' });
    }
    // 마커
    S.mk.forEach((m, i) => {
      const c = CLK[i], a = mAng(m.t), p0 = mkPos(m.t, R - TH - 2), p1 = mkPos(m.t, R + 12), hp = mkPos(m.t, R + 22);
      ctx.strokeStyle = m.locked ? '#14a058' : '#1b2333'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      const big = S.dragMk === i ? 1.15 : 1 + m.pop * 0.25;
      D.shadow(() => { ctx.fillStyle = m.locked ? '#14a058' : c.col; ctx.beginPath(); ctx.arc(hp[0], hp[1], 16 * big, 0, TAU); ctx.fill(); }, { blur: S.dragMk === i ? 9 : 4, y: S.dragMk === i ? 4 : 2 });
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hp[0], hp[1], 16 * big, 0, TAU); ctx.stroke();
      D.text(hp[0], hp[1] + 6, m.locked ? '✓' : String(i + 1), { size: 16, weight: 800, color: '#fff' });
      m.pop = approach(m.pop, 0, dt, 8);
      if (!m.locked && S.dragMk !== i && !(game && game.free)) D.ring(hp[0], hp[1], 20, t * 0.8 + i * 0.3, { color: c.col, alpha: 0.5 });
    });
    // 오른쪽(또는 아래) 표
    const P = PHONE ? { x: 8, y: 478, w: 584 } : { x: 450, y: 10, w: 340 };
    const rowH = PHONE ? 46 : 44;
    const hA = 36 + 3 * rowH + 8;
    card({ x: P.x, y: P.y, w: P.w, h: hA }, '경계의 시각');
    S.mk.forEach((m, i) => {
      const c = CLK[i], y = P.y + 38 * FS + i * rowH;
      ctx.fillStyle = m.locked ? '#14a058' : c.col; ctx.beginPath(); ctx.arc(P.x + 24, y + 6, 12, 0, TAU); ctx.fill();
      D.text(P.x + 24, y + 11, m.locked ? '✓' : String(i + 1), { size: 14, weight: 800, color: '#fff' });
      D.text(P.x + 46, y + 4, c.n + ' (' + AGE_TXT(c.ma) + ' 전)', { size: 14, weight: 800, color: '#1b2333', align: 'left' });
      D.text(P.x + 46, y + 4 + 18, hhmm(m.t) + ' → 약 ' + ageShort(ageOfMin(m.t)) + ' 전', { size: 13, weight: 700, color: m.locked ? '#14663a' : '#64748b', align: 'left' });
    });
    // 46억 년 막대 (실제 비율)
    const yB = P.y + hA + (PHONE ? 8 : 12), wB = P.w - 28, xB = P.x + 14;
    const hB = PHONE ? 88 : 84;
    card({ x: P.x, y: yB, w: P.w, h: hB }, '46억 년 중 차지하는 비율');
    const segs = [[PRE, 4600 - 539], [ERA.pal, 287], [ERA.mes, 186], [ERA.cen, 66]];
    let xx = xB; const by = yB + 38 * FS, bh = 20;
    segs.forEach((sg) => { const w = wB * sg[1] / 4600; ctx.fillStyle = sg[0].c; ctx.fillRect(xx, by, w, bh); xx += w; });
    ctx.strokeStyle = 'rgba(51,65,85,.5)'; ctx.lineWidth = 1; ctx.strokeRect(xB, by, wB, bh);
    D.text(xB, by + bh + 16 * FS, '선캄브리아시대 ' + PCT_PRE + ' %', { size: 13.5, weight: 800, color: '#6b6258', align: 'left' });
    D.text(xB + wB, by + bh + 16 * FS, '고·중·신생대 ' + (100 - +PCT_PRE).toFixed(1) + ' %', { size: 13.5, weight: 800, color: '#334155', align: 'right' });
    // 고생대·중생대·신생대 길이 비교
    const yC = yB + hB + (PHONE ? 8 : 12), hC = VH - yC - (PHONE ? 8 : 10);
    card({ x: P.x, y: yC, w: P.w, h: hC }, '고생대 · 중생대 · 신생대의 길이');
    const dur = [[ERA.pal, 287], [ERA.mes, 186], [ERA.cen, 66]], lab = PHONE ? 76 : 64, mw = P.w - lab - (PHONE ? 130 : 108);
    dur.forEach((d, i) => {
      const y = yC + 34 * FS + i * ((hC - 34 * FS - 6) / 3) + 2, w = mw * d[1] / 287;
      D.text(P.x + 14, y + 14, d[0].n, { size: 14, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = d[0].c; rr(P.x + lab, y, w, 20, 5).fill();
      D.text(P.x + lab + w + 8, y + 15, AGE_TXT(d[1]), { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    });
  }

  /* ======================================================
     장면 5: 가상 지층의 화석 조합 + 대멸종 그래프
     ====================================================== */
  const layerRects = () => {
    const out = [];
    if (!PHONE) { const h = 128, g = 6; LAYERS.forEach((L, i) => out.push({ L, i, x: 12, y: 10 + (3 - i) * (h + g), w: 228, h })); }
    else { const h = 74, g = 5; LAYERS.forEach((L, i) => out.push({ L, i, x: 8, y: 8 + (3 - i) * (h + g), w: 584, h })); }
    return out;
  };
  const CH = PHONE ? { x: 8, y: 338, lab: 118, colW: (584 - 118) / 12, rowH: 36 } : { x: 252, y: 10, lab: 104, colW: (VW - 252 - 8 - 104) / 12, rowH: 38 };
  function drawStrataAge(t, dt) {
    layerRects().forEach((R) => {
      const L = R.L, act = S.layer === R.i, ok = selLy.val[L.id] === L.ans;
      ctx.save(); const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      D.shadow(() => { ctx.fillStyle = L.col; rr(R.x, R.y, R.w, R.h, 10).fill(); }, { blur: act ? 8 : 3, y: act ? 4 : 1 });
      ctx.save(); rr(R.x, R.y, R.w, R.h, 10).clip(); const r = seeded(R.i * 17 + 5);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)'; ctx.fillRect(R.x + r() * R.w, R.y + r() * R.h, 2 + r() * 8, 1 + r() * 2); }
      ctx.restore();
      ctx.strokeStyle = act ? '#e0742f' : 'rgba(0,0,0,.18)'; ctx.lineWidth = act ? 4 : 1.5; rr(R.x, R.y, R.w, R.h, 10).stroke();
      D.label(R.x + 10, R.y + 17, L.n, { bg: '#334155', size: 13, align: 'left', pad: 7 });
      const sel = selLy.val[L.id];
      if (sel) D.label(R.x + R.w - 10, R.y + R.h - 17, '→ ' + EP[EPI[sel]].n, { bg: ok ? '#14a058' : '#7b8798', size: 13, align: 'right', pad: 7 });
      // 화석
      const n = L.fos.length;
      L.fos.forEach((fid, k) => {
        const b = BIOI[fid];
        if (!PHONE) { const px = R.x + 38 + (k % 2) * 76 + (n === 3 && k === 2 ? 38 : 0), py = R.y + 56 + Math.floor(k / 2) * 36; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(px, py, 18, 0, TAU); ctx.fill(); fossilIco(b.ico, px, py, 14, '#4a3b28', 'rgba(255,248,230,.8)'); }
        else { const px = R.x + 210 + k * 70, py = R.y + 40; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(px, py, 24, 0, TAU); ctx.fill(); fossilIco(b.ico, px, py, 20, '#4a3b28', 'rgba(255,248,230,.8)'); }
      });
      if (!PHONE) { D.text(R.x + 10, R.y + R.h - 10, L.fos.map((f) => BIOI[f].n).join('·'), { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.35)', strokeWidth: 3, align: 'left' }); }
      else D.text(R.x + 12, R.y + 56, L.fos.map((f) => BIOI[f].n).join(' · '), { size: 13, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.35)', strokeWidth: 3, align: 'left' });
      ctx.restore();
    });
    D.text(PHONE ? 300 : 126, PHONE ? 336 : 556, '↑ 위로 갈수록 나중에 쌓인 층', { size: 12.5, weight: 700, color: '#64748b' });
    // 번성 기간 표
    const x0 = CH.x + CH.lab, cw = CH.colW, y0 = CH.y;
    card({ x: CH.x - (PHONE ? 0 : 2), y: CH.y - (PHONE ? 2 : 0), w: (PHONE ? 584 : VW - 252 - 6), h: PHONE ? 400 : 418 });
    const hy = y0 + 8;
    EP.forEach((e, i) => { ctx.fillStyle = e.c; ctx.fillRect(x0 + i * cw, hy, cw - 1, 26); D.text(x0 + i * cw + cw / 2, hy + 18, e.k, { size: 14, weight: 800, color: inkOn(e.c) }); });
    D.text(CH.x + 10, hy + 18, '번성한 기(紀)', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    [['pal', 0, 5], ['mes', 6, 8], ['cen', 9, 11]].forEach((g) => { ctx.fillStyle = ERA[g[0]].c; ctx.fillRect(x0 + g[1] * cw, hy + 29, (g[2] - g[1] + 1) * cw - 1, 18); D.text(x0 + (g[1] + g[2] + 1) / 2 * cw, hy + 43, ERA[g[0]].n, { size: 13, weight: 800, color: inkOn(ERA[g[0]].c) }); });
    const ry = hy + 54, lay = LAYERS[S.layer];
    // 선택한 칸 표시 (활성 층)
    const sel = selLy.val[lay.id];
    if (sel) { const ci = EPI[sel], ok = sel === lay.ans; ctx.fillStyle = ok ? 'rgba(20,160,88,.18)' : 'rgba(224,116,47,.14)'; ctx.fillRect(x0 + ci * cw, ry - 2, cw - 1, BIO.length * CH.rowH + 2); ctx.setLineDash([5, 3]); ctx.strokeStyle = ok ? '#14a058' : '#e0742f'; ctx.lineWidth = 2.2; ctx.strokeRect(x0 + ci * cw, ry - 2, cw - 1, BIO.length * CH.rowH + 2); ctx.setLineDash([]); }
    BIO.forEach((b, i) => {
      const y = ry + i * CH.rowH, on = lay.fos.includes(b.id);
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(100,116,139,.06)'; ctx.fillRect(CH.x + 4, y, x0 - CH.x - 4 + 12 * cw, CH.rowH); }
      D.text(CH.x + 10, y + CH.rowH / 2 + 5, b.n, { size: 13.5, weight: on ? 800 : 700, color: on ? '#b4521a' : '#64748b', align: 'left' });
      const a = EPI[b.a], z = EPI[b.b];
      ctx.fillStyle = on ? '#e0742f' : '#cbd5e1'; rr(x0 + a * cw + 1, y + 6, (z - a + 1) * cw - 3, CH.rowH - 12, 6).fill();
    });
    for (let i = 0; i <= 12; i++) { ctx.strokeStyle = 'rgba(100,116,139,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + i * cw - 0.5, ry - 2); ctx.lineTo(x0 + i * cw - 0.5, ry + BIO.length * CH.rowH); ctx.stroke(); }
    // 안내
    const nbox = PHONE ? { x: 8, y: 748, w: 584, h: VH - 748 - 8 } : { x: CH.x - 2, y: 436, w: VW - 252 - 6, h: VH - 436 - 10 };
    card(nbox);
    drawWrap(nbox.x + nbox.w / 2, nbox.y + 24 * FS, '층을 눌러 고른 뒤, 그 층의 화석(주황색 줄)이 모두 번성한 기(紀)를 찾아요. 아래에서 고른 기는 점선 칸으로 표시돼요.', nbox.w - 24, PHONE ? 13 : 13.5, { weight: 700, lh: 1.35 });
    drawWrap(nbox.x + nbox.w / 2, nbox.y + nbox.h - 44, '선택한 층: ' + lay.n + ' — ' + lay.fos.map((f) => BIOI[f].n).join(', '), nbox.w - 24, 13.5, { weight: 800, color: '#b4521a' });
    D.text(nbox.x + nbox.w / 2, nbox.y + nbox.h - 10, '번성한 기(紀)는 학습용 예시 자료예요.', { size: 12.5, weight: 700, color: '#64748b' });
  }

  const EXR = PHONE ? { x: 62, y: 84, w: 520, h: 380 } : { x: 70, y: 58, w: 716, h: 256 };
  const exX = (ma) => EXR.x + EXR.w * (545 - ma) / 545;
  const exY = (v) => EXR.y + EXR.h * (1 - v / 100);
  function drawExt(t, dt) {
    const R = EXR;
    card({ x: 8, y: 8, w: VW - 16, h: PHONE ? 640 : 442 });
    D.text(18, 8 + 16 + 4, '해양 생물 속(屬)의 수 (최대 = 100, 예시 자료)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(R.x, R.y, R.w, R.h);
    [0, 25, 50, 75, 100].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(R.x, exY(v)); ctx.lineTo(R.x + R.w, exY(v)); ctx.stroke(); D.text(R.x - 6, exY(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    // 기(紀) 띠
    EP.forEach((e) => { const x0 = exX(e.s), x1 = exX(e.e); ctx.fillStyle = rgba(e.c, 0.1); ctx.fillRect(x0, R.y, x1 - x0, R.h); });
    // 곡선 (왼쪽이 오래된 시기)
    const grow = RM ? 1 : clamp(S.extRev, 0, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w * grow, R.h); ctx.clip();
    ctx.beginPath(); DIV.forEach((d, i) => (i ? ctx.lineTo(exX(d[0]), exY(d[1])) : ctx.moveTo(exX(d[0]), exY(d[1])))); ctx.lineTo(exX(0), exY(0)); ctx.lineTo(exX(539), exY(0)); ctx.closePath();
    const gg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); gg.addColorStop(0, 'rgba(56,103,244,.35)'); gg.addColorStop(1, 'rgba(56,103,244,.04)'); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = '#2d55c9'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath(); DIV.forEach((d, i) => (i ? ctx.lineTo(exX(d[0]), exY(d[1])) : ctx.moveTo(exX(d[0]), exY(d[1])))); ctx.stroke();
    ctx.restore();
    S.extRev = approach(S.extRev, 1.2, dt, 1.4);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(R.x, R.y, R.w, R.h);
    // 기 이름 띠
    const sy = R.y + R.h + 3;
    EP.forEach((e) => { const x0 = exX(e.s), x1 = exX(e.e); ctx.fillStyle = e.c; ctx.fillRect(x0, sy, Math.max(1, x1 - x0 - 1), 26); if (x1 - x0 > 14) D.text((x0 + x1) / 2, sy + 18, e.k, { size: 13.5, weight: 800, color: inkOn(e.c) }); });
    D.text(R.x, sy + 44, '5.39억 년 전', { size: 13, weight: 700, color: '#64748b', align: 'left' }); D.text(R.x + R.w, sy + 44, '현재', { size: 13, weight: 700, color: '#64748b', align: 'right' });
    D.text(R.x + R.w / 2, sy + 44, '← 오래된 시기  ·  시간  ·  최근 →', { size: 13, weight: 700, color: '#64748b' });
    // 후보 깃발
    EXT.forEach((x, i) => {
      const px = exX(x.ma), on = !!S.marks[x.id], bad = S.extBad.includes(x.id);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = on ? (bad ? '#e2464b' : '#e2464b') : 'rgba(71,85,105,.45)'; ctx.lineWidth = on ? 2.4 : 1.4; ctx.beginPath(); ctx.moveTo(px, R.y - 4); ctx.lineTo(px, R.y + R.h); ctx.stroke(); ctx.setLineDash([]);
      if (on) { ctx.fillStyle = 'rgba(226,70,75,.12)'; ctx.fillRect(px - 9, R.y, 18, R.h); }
      const fy = R.y - 14;
      ctx.fillStyle = on ? '#e2464b' : '#475569'; ctx.beginPath(); ctx.arc(px, fy, 12, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      D.text(px, fy + 5, String(i + 1), { size: 13, weight: 800, color: '#fff' });
      if (on) { const yy = exY(Math.max(x.y1, 4)); D.label(clamp(px, R.x + 48, R.x + R.w - 48), clamp(yy - 22, R.y + 14, R.y + R.h - 14), '−' + x.drop + ' %', { bg: x.drop >= 75 ? '#b91c1c' : '#64748b', size: 13.5 }); }
    });
    // 안내 목록
    const ly = sy + 62, items = EXT.map((x, i) => (i + 1) + ' ' + x.n);
    const used = drawWrap(PHONE ? 20 : 20, ly + 8, items.join('   ·   '), VW - 56, 13, { weight: 700, color: '#334155', align: 'left', lh: 1.45 });
    const nb = { x: 8, y: PHONE ? 656 : 456, w: VW - 16, h: VH - (PHONE ? 656 : 456) - 8 };
    card(nb);
    drawWrap(nb.x + nb.w / 2, nb.y + 26 * FS, '번호 깃발을 눌러 해양 생물이 약 75 % 이상 크게 줄어든 시기에 표시해요. 표시하면 감소율이 나타나요. 감소가 작은 곳은 대멸종이 아니에요.', nb.w - 28, PHONE ? 13 : 13.5, { weight: 700, lh: 1.4 });
  }

  /* ======================================================
     장면 6: 한반도 화석 분포 지도
     ====================================================== */
  const MP = PHONE ? { x: 8, y: 8, w: 300, h: 560 } : { x: 10, y: 10, w: 290, h: 540 };
  const mSy = (MP.h - 34) / 5.9, mSx = mSy * 0.81;
  const mapP = (lon, lat) => [MP.x + 10 + (lon - 125.95) * mSx, MP.y + 16 + (38.9 - lat) * mSy];
  const trayPos = (k) => (PHONE ? { x: 316, y: 8 + k * 93, w: 276, h: 88 } : { x: 312 + (k % 2) * 240, y: 40 + Math.floor(k / 2) * 112, w: 232, h: 104 });
  const TRAY_ORDER = ['seogwipo', 'taebaek', 'pohang', 'boryeong', 'jeongseon', 'goseong'];
  function initPins() {
    S.pins = TRAY_ORDER.map((id, k) => { const T = trayPos(k); return { id, k, x: T.x + T.w - 24, y: T.y + T.h - 12, hx: T.x + T.w - 24, hy: T.y + T.h - 12, placed: false, lift: 0, pop: 0, shake: 0, sp: new SciSim.Spring(0, { stiffness: 140, damping: 11 }) }; });
    S.dragPin = -1; S.selPin = -1; S.mapMsg = '';
  }
  function drawPin(x, y, col, ico, sc, lift) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    D.shadow(() => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -22); ctx.arc(0, -29, 15, Math.PI * 0.8, Math.PI * 0.2, false); ctx.lineTo(0, 0); ctx.fill();
    }, { blur: 3 + lift * 8, y: 2 + lift * 6, color: 'rgba(0,0,0,.35)' });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -29, 12, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(0, -29); ctx.fillStyle = '#fff'; fossilIco(ico, 0, 0, 9.5, '#fff', 'rgba(0,0,0,.35)'); ctx.restore();
    ctx.restore();
  }
  const siteEraCol = (s) => (s.era === 'e1' || s.era === 'e2' ? ERA.pal.c : s.era === 'e3' || s.era === 'e4' ? ERA.mes.c : ERA.cen.c);
  function drawMap(t, dt) {
    // 지도
    D.shadow(() => { ctx.fillStyle = '#cfe4f2'; rr(MP.x, MP.y, MP.w, MP.h, 14).fill(); }, { blur: 5, y: 2 });
    ctx.save(); rr(MP.x, MP.y, MP.w, MP.h, 14).clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const yy = MP.y + 40 + i * 90; ctx.beginPath(); ctx.moveTo(MP.x, yy); ctx.lineTo(MP.x + MP.w, yy); ctx.stroke(); }
    ctx.fillStyle = '#eee7d3'; ctx.strokeStyle = '#a79d82'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); KOREA.forEach((p, i) => { const q = mapP(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke();
    const jc = mapP(126.55, 33.38); ctx.beginPath(); ctx.ellipse(jc[0], jc[1], 0.4 * mSx, 0.17 * mSy, -0.08, 0, TAU); ctx.fill(); ctx.stroke();
    // 북쪽 경계 (휴전선 부근)
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#8b8165'; ctx.beginPath(); [[128.35, 38.62], [127.8, 38.35], [127.3, 38.32], [126.9, 37.95], [126.68, 37.78]].forEach((p, i) => { const q = mapP(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.setLineDash([]);
    PROV.forEach((p) => { const q = mapP(p[1], p[2]); D.text(q[0], q[1], p[0], { size: 14, weight: 800, color: 'rgba(100,90,60,.55)' }); });
    CITIES.forEach((c) => { const q = mapP(c[1], c[2]); ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(q[0], q[1], 3.4, 0, TAU); ctx.fill(); D.text(q[0] + 6, q[1] + 4.5, c[0], { size: 13, weight: 700, color: '#334155', align: 'left', stroke: 'rgba(238,231,211,.9)', strokeWidth: 3 }); });
    D.text(MP.x + MP.w - 26, MP.y + 26, 'N', { size: 15, weight: 800, color: '#475569' }); D.arrow(MP.x + MP.w - 26, MP.y + 54, MP.x + MP.w - 26, MP.y + 32, { color: '#475569', width: 2.5, head: 7 });
    D.text(jc[0] + 0.4 * mSx + 10, jc[1] - 18, '제주도', { size: 13, weight: 800, color: 'rgba(100,90,60,.7)', align: 'left' });
    ctx.restore();
    // 놓인 핀
    S.pins.forEach((pn) => {
      if (!pn.placed) return; const st = SITEI[pn.id], q = mapP(st.lon, st.lat);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 6, 3, 0, 0, TAU); ctx.fill();
      const sc = 1 + clamp(pn.sp.value, -0.4, 0.8) * 0.5; pn.sp.update(dt);
      drawPin(q[0], q[1], S.mapEra ? siteEraCol(st) : '#e2464b', st.ico, sc, 0);
      if (S.selPin === pn.k) D.ring(q[0], q[1], 16, t, { color: '#1b2333' });
      D.label(q[0] + (q[0] > MP.x + MP.w - 70 ? -14 : 16), q[1] - 6, st.loc.split(' ')[1], { bg: 'rgba(27,35,51,.88)', size: 13, align: q[0] > MP.x + MP.w - 70 ? 'right' : 'left', pad: 6 });
    });
    // 보관함
    D.text(PHONE ? 316 : 312, PHONE ? 8 : 28, PHONE ? '' : '화석 지점 카드', { size: 15, weight: 800, color: '#334155', align: 'left' });
    S.pins.forEach((pn) => {
      const st = SITEI[pn.id], T = trayPos(pn.k), dragging = S.dragPin === pn.k;
      ctx.save(); if (pn.shake > 0) { ctx.translate(Math.sin(pn.shake * 40) * 5 * pn.shake, 0); pn.shake = Math.max(0, pn.shake - dt * 2.4); }
      ctx.globalAlpha = pn.placed ? 0.55 : 1;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(T.x, T.y, T.w, T.h, 12).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = pn.placed ? '#14a058' : dragging ? '#e2464b' : '#cbd5e1'; ctx.lineWidth = pn.placed ? 3 : 1.5; rr(T.x, T.y, T.w, T.h, 12).stroke();
      const tw = PHONE ? 60 : 72; rockTile(T.x + 6, T.y + (T.h - tw) / 2, tw, tw, '#c8b896'); fossilIco(st.ico, T.x + 6 + tw / 2, T.y + T.h / 2, PHONE ? 22 : 26, '#4f402c', 'rgba(255,248,230,.75)');
      const tx = T.x + tw + 14, ty = T.y + T.h / 2 - 20;
      D.text(tx, ty, st.loc, { size: 15, weight: 800, color: '#1b2333', align: 'left' });
      D.text(tx, ty + 22, st.fos, { size: 14, weight: 700, color: '#475569', align: 'left' });
      D.text(tx, ty + 42, pn.placed ? '✅ 놓았어요' : st.hint, { size: 13, weight: 700, color: pn.placed ? '#14663a' : '#64748b', align: 'left' });
      ctx.restore();
    });
    // 끄는 핀
    S.pins.forEach((pn) => {
      if (pn.placed) return; const st = SITEI[pn.id];
      pn.lift = approach(pn.lift, S.dragPin === pn.k ? 1 : 0, dt, 14);
      if (S.dragPin !== pn.k) { pn.x = approach(pn.x, pn.hx, dt, 12); pn.y = approach(pn.y, pn.hy, dt, 12); }
      if (S.dragPin === pn.k || Math.hypot(pn.x - pn.hx, pn.y - pn.hy) > 1.5) { drawPin(pn.x, pn.y, '#e2464b', st.ico, 1 + pn.lift * 0.18, pn.lift); }
      else drawPin(pn.hx, pn.hy, '#e2464b', st.ico, 0.62, 0);
    });
    // 안내 / 정보 판
    const IP = PHONE ? { x: 8, y: 576, w: VW - 16, h: VH - 584 } : { x: 312, y: 40 + 3 * 112 + 4, w: 472, h: VH - (40 + 3 * 112 + 4) - 10 };
    card(IP);
    const n = S.pins.filter((p) => p.placed).length;
    D.text(IP.x + 14, IP.y + 8 + 15 * FS, '화석 분포 지도  ' + n + ' / 6 지점', { size: 15, weight: 800, color: '#334155', align: 'left' });
    const sel = S.selPin >= 0 ? SITEI[S.pins[S.selPin].id] : null;
    let msg = S.mapMsg || (n === 0 ? '카드를 끌어다 지도 위 알맞은 곳에 놓아요. 지도에 적힌 도(道) 이름과 도시를 단서로 써요.' : n < 6 ? '지도에 놓은 핀을 누르면 지점 정보가 나와요.' : '6개 지점을 모두 놓았어요!');
    if (sel && !S.mapMsg) msg = sel.loc + ' · ' + sel.fos + ' (' + sel.grp + ' 일대)';
    drawWrap(IP.x + IP.w / 2, IP.y + 50 * FS, msg, IP.w - 28, PHONE ? 13 : 14, { weight: 700, lh: 1.4, color: S.mapMsg ? '#a3262b' : '#334155' });
    if (S.mapEra) { [['고생대', ERA.pal.c], ['중생대', ERA.mes.c], ['신생대', ERA.cen.c]].forEach((e, i) => { const lx = IP.x + 20 + i * 100 * (PHONE ? 1.25 : 1), ly = IP.y + IP.h - 36; ctx.fillStyle = e[1]; ctx.beginPath(); ctx.arc(lx, ly, 8, 0, TAU); ctx.fill(); D.text(lx + 14, ly + 5, e[0], { size: 13.5, weight: 800, color: '#334155', align: 'left' }); }); }
    D.text(IP.x + IP.w / 2, IP.y + IP.h - 10, '※ 지점과 화석은 예시 자료예요. 정확한 지층명은 박물관·지질공원 누리집에서 확인해요.', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { form: '🦴 화석이 만들어지는 과정', cards: '🃏 화석 카드 10장', order: '📏 기(紀)의 순서', clock: '🕰️ 지질 시계', strata: '📚 가상 지층과 대멸종', map: '🗺️ 한반도 화석 분포 지도' };
  const FREE_KEYS = { form: ['form', 'form2'], cards: ['cardhelp'], order: [], clock: ['clockhelp'], strata: ['subseg'], map: ['maphelp'] };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free);
    let keys = free ? FREE_KEYS[S.mode].slice() : ctlKeys;
    if (free && S.mode === 'strata') keys.push(S.sub === 'age' ? 'sely' : 'exthelp');
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === (S.mode === 'order' ? 'clock' : S.mode)));
    $$('#fmBody .opt').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'hard') === S.hard));
    $$('#fmBury .opt').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'fast') === S.fast));
    $$('#subSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); if (S.mode === 'form') resetForm(); } S.mode = m; updateCtl(); }
  const MODE_OF_BTN = { form: 'form', cards: 'cards', clock: 'clock', strata: 'strata', map: 'map' };
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); const m = MODE_OF_BTN[b.dataset.mode]; setMode(m);
    if (m === 'clock') { S.clockReveal = true; S.mk.forEach((k, i) => { k.t = CLK[i].tgt; k.locked = false; }); S.lastMk = -1; } if (m === 'map' && !S.pins.length) initPins(); if (m === 'strata') S.extRev = 0;
    updateCtl();
  }));
  $$('#fmBody .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.hard = b.dataset.v === 'hard'; resetForm(); updateCtl(); }));
  $$('#fmBury .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fast = b.dataset.v === 'fast'; resetForm(); updateCtl(); }));
  $('#bForm').addEventListener('click', () => { startForm(); });
  $$('#subSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sub = b.dataset.v; if (S.sub === 'ext') S.extRev = 0; updateCtl(); }));
  $('#bOrdEp').addEventListener('click', () => { Sound.click(); ordEp.reset(); syncOrd(); S.opop = {}; });
  $('#bClockReset').addEventListener('click', () => { Sound.click(); resetMarkers(); });
  $('#bCardReset').addEventListener('click', () => { Sound.click(); S.cls = {}; S.badCards = []; });
  $('#bExtReset').addEventListener('click', () => { Sound.click(); S.marks = {}; S.extBad = []; });
  $('#bMapReset').addEventListener('click', () => { Sound.click(); initPins(); S.mapEra = false; });
  function resetMarkers() { S.mk.forEach((m, i) => { m.t = [360, 720, 1080][i]; m.locked = false; m.pop = 0; }); S.dragMk = -1; S.lastMk = -1; S.clockReveal = false; }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'cards') {
        const R = cardRects().find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (R) { const c = S.cls[R.f.id] || null; S.cls[R.f.id] = CYCLE[(CYCLE.indexOf(c) + 1) % CYCLE.length]; S.badCards = S.badCards.filter((x) => x !== R.f.id); S.pop[R.f.id] = 1; Sound.click(); }
        return false;
      }
      if (S.mode === 'clock') {
        let best = -1, bd = 34;
        S.mk.forEach((m, i) => { if (m.locked && !(game && game.free)) return; const hp = mkPos(m.t, CK.R + 22), d = Math.hypot(hp[0] - p.x, hp[1] - p.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { S.dragMk = best; S.lastMk = best; S.mk[best].locked = false; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'strata') {
        if (S.sub === 'age') { const R = layerRects().find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h); if (R) { S.layer = R.i; Sound.click(); } }
        else { let best = null, bd = 18; EXT.forEach((x) => { const d = Math.abs(exX(x.ma) - p.x); if (d < bd && p.y >= EXR.y - 30 && p.y <= EXR.y + EXR.h) { bd = d; best = x; } }); if (best) { S.marks[best.id] = !S.marks[best.id]; if (!S.marks[best.id]) delete S.marks[best.id]; S.extBad = S.extBad.filter((i) => i !== best.id); Sound.click(); } }
        return false;
      }
      if (S.mode === 'map') {
        for (let k = 0; k < S.pins.length; k++) {
          const pn = S.pins[k], T = trayPos(k);
          if (p.x >= T.x && p.x <= T.x + T.w && p.y >= T.y && p.y <= T.y + T.h) {
            if (pn.placed) { S.selPin = k; S.mapMsg = ''; Sound.click(); return false; }
            S.dragPin = k; pn.x = p.x; pn.y = p.y; S.mapMsg = ''; Sound.click(); return true;
          }
        }
        for (let k = 0; k < S.pins.length; k++) { const pn = S.pins[k]; if (!pn.placed) continue; const q = mapP(SITEI[pn.id].lon, SITEI[pn.id].lat); if (Math.hypot(q[0] - p.x, q[1] - 28 - p.y) < 26) { S.selPin = k; S.mapMsg = ''; Sound.click(); return false; } }
      }
      return false;
    },
    move(p) {
      if (S.mode === 'clock' && S.dragMk >= 0) { const m = S.mk[S.dragMk], nt = snap5(angMin(p.x, p.y)); if (nt !== m.t) { m.t = nt; Sound.tick(); } }
      else if (S.mode === 'map' && S.dragPin >= 0) { const pn = S.pins[S.dragPin]; pn.x = p.x; pn.y = p.y; }
    },
    up(p) {
      if (S.mode === 'clock' && S.dragMk >= 0) {
        const i = S.dragMk, m = S.mk[i]; S.dragMk = -1;
        if (m.t === CLK[i].tgt) {
          m.locked = true; m.pop = 1; const hp = mkPos(m.t, CK.R + 22); parts.burst(hp[0], hp[1], { count: 16, speed: 140 }); Sound.success();
          say(CLK[i].n + ' ' + hhmm(m.t) + ' 완료! 약 ' + ageShort(ageOfMin(m.t)) + ' 전이에요', false, 2.4);
        }
      } else if (S.mode === 'map' && S.dragPin >= 0) {
        const k = S.dragPin, pn = S.pins[k], st = SITEI[pn.id]; S.dragPin = -1;
        const inMap = p.x >= MP.x && p.x <= MP.x + MP.w && p.y >= MP.y && p.y <= MP.y + MP.h;
        if (!inMap) { pn.shake = 0.01; return; }
        let near = null, nd = 1e9; SITES.forEach((s) => { const q = mapP(s.lon, s.lat), d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < nd) { nd = d; near = s; } });
        const own = mapP(st.lon, st.lat), dOwn = Math.hypot(own[0] - p.x, own[1] - p.y);
        if (near.id === st.id && dOwn <= 28) {
          pn.placed = true; pn.sp.value = 0; pn.sp.target = 0; pn.sp.velocity = 6; S.selPin = k; S.mapMsg = '';
          parts.burst(own[0], own[1] - 10, { count: 14, speed: 120 }); Sound.success();
        } else {
          pn.shake = 1; Sound.fail();
          S.mapMsg = st.loc + josa(st.loc, '은/는') + ' 이 자리가 아니에요. 힌트: ' + st.hint + '.';
        }
      }
    },
    hover(p) {
      if (S.mode === 'cards') return cardRects().some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) ? 'pointer' : '';
      if (S.mode === 'clock') return S.mk.some((m) => { const hp = mkPos(m.t, CK.R + 22); return Math.hypot(hp[0] - p.x, hp[1] - p.y) < 28; }) ? 'grab' : '';
      if (S.mode === 'map') return S.pins.some((pn, k) => { const T = trayPos(k); return !pn.placed && p.x >= T.x && p.x <= T.x + T.w && p.y >= T.y && p.y <= T.y + T.h; }) ? 'grab' : '';
      return '';
    },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear();
    resetForm(); S.seenOK = false; S.seenFail = false; S.hard = true; S.fast = true;
    S.cls = {}; S.badCards = []; clsEnv.reset();
    ordEp.reset(); syncOrd(); S.opop = {}; resetMarkers();
    selLy.reset(); S.layer = 0; S.sub = 'age'; S.marks = {}; S.extBad = []; S.extRev = 0;
    selSite.reset(); initPins(); S.mapEra = false; S.mapMsg = '';
    if (li === 0) { setMode('form'); setCtl(['form', 'form2']); showHint('몸과 묻히는 속도를 고르고 ▶ 실험 시작을 눌러요', 5000); }
    else if (li === 1) { setMode('order'); setCtl(['ord12']); showHint('가장 오래된 기(紀)부터 차례로 눌러 쌓아요', 5000); }
    else if (li === 2) { setMode('strata'); setCtl(['sely']); showHint('층을 눌러 고르고 아래 목록에서 기(紀)를 골라요', 5000); }
    else { setMode('map'); setCtl(['maphelp']); showHint('카드를 지도 위로 끌어다 놓아요', 5000); }
    updateCtl();
  }
  const catCount = (c) => FOS.filter((f) => S.cls[f.id] === c).length;
  const levels = [
    {
      title: '화석: 과거 생물의 기록', short: '화석', icon: '🦴', phase: '관찰', features: ['form'],
      intro: '<p class="si-q">❓ 탐구 질문: 수억 년 전에 살았던 생물과 그곳의 환경을 화석 하나로 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>초등학교·통합과학에서</b> 지층 속 화석으로 옛 생물과 환경을 알 수 있고, 지구가 약 46억 년 전에 생겼다는 것을 배웠어요. 이번에는 <b>화석이 만들어지는 조건</b>과 화석의 쓰임새를 자세히 살펴봐요.</div>' +
        '<p><b>화석</b>은 지질시대에 살았던 생물의 유해나 흔적이에요. 모든 생물이 화석이 되지는 않아요. 먼저 화석이 만들어지는 조건을 실험하고, 시대를 알려 주는 <b>표준 화석</b>과 환경을 알려 주는 <b>시상 화석</b>을 구분해 봐요.</p>',
      setup() { resetStep(0); },
      recap: '화석은 몸에 단단한 부분이 있고 죽은 뒤 빨리 묻힌 생물이 남긴 기록이에요. 시대는 표준 화석이, 환경은 시상 화석이 알려 줘요.',
      summary: '<ul><li><b>화석</b>: 지질시대 생물의 유해·흔적. 단단한 부분이 있고 <b>빨리 묻혀야</b> 화석이 되기 쉬워요.</li><li><b>표준 화석</b>: 번성한 기간이 짧고 넓은 지역에 분포하며 개체 수가 많은 화석 → 지층의 <b>시대</b>를 알려 줘요. (삼엽충·필석: 고생대 초·중기, 방추충: 고생대 후기, 암모나이트: 중생대, 화폐석·매머드: 신생대)</li><li><b>시상 화석</b>: 특정 환경에서만 사는 생물의 화석 → 퇴적 <b>환경</b>을 알려 줘요. (산호: 따뜻하고 얕은 바다, 고사리: 따뜻하고 습한 육지, 조개: 얕은 바다·갯벌)</li><li>공룡 발자국처럼 시대와 환경의 단서가 되지 못하는 화석도 있어요.</li></ul>',
      missions: [
        {
          title: '화석이 만들어지는 조건 실험', goal: '생물의 몸과 묻히는 속도를 바꿔 가며 ▶ 실험을 해요. <b>화석이 만들어지는 경우와 안 만들어지는 경우</b>를 모두 관찰해요.',
          hint: '조건을 하나씩 바꿔 가며 실험해요. 한 번의 실험은 약 8초 걸려요. 단단한 껍데기와 빠른 매몰을 모두 고른 실험, 그리고 하나를 바꾼 실험이 필요해요.',
          setup() { resetForm(); S.seenOK = false; S.seenFail = false; setMode('form'); setCtl(['form', 'form2']); },
          check: () => S.seenOK && S.seenFail, hold: 0.5,
          status: () => mark(S.seenOK) + ' 화석이 만들어진 경우 관찰 · ' + mark(S.seenFail) + ' 만들어지지 않은 경우 관찰',
          explain: '화석이 되려면 ① 껍데기·뼈 같은 <b>단단한 부분</b>이 있고 ② 죽은 뒤 퇴적물에 <b>빨리 묻혀야</b> 해요. 단단한 부분이 없거나 늦게 묻히면 분해되거나 부서져서 흔적이 남지 않아요.',
        },
        {
          title: '표준 화석과 시상 화석 구분하기', manual: true,
          goal: '카드 10장을 눌러 <b>표준 화석 · 시상 화석 · 둘 다 아님</b>으로 나눠요. 그리고 시상 화석 3개가 알려 주는 환경을 골라요.',
          hint: '카드의 번성 칸이 한 시대 안에만 있고, 분포가 넓고 개체 수가 많으면 표준 화석이에요. 번성 칸이 여러 시대에 걸치고 특정 환경에서만 살면 시상 화석이에요. 카드를 누를 때마다 분류가 바뀌어요.',
          setup() { S.cls = {}; S.badCards = []; clsEnv.reset(); setMode('cards'); setCtl(['cardhelp', 'clsenv']); },
          status: () => mark(Object.values(S.cls).filter(Boolean).length === 10) + ' 분류한 카드 ' + Object.values(S.cls).filter(Boolean).length + ' / 10 · ' + mark(clsEnv.complete()) + ' 환경 ' + clsEnv.count() + ' / 3',
          check() {
            const n = Object.values(S.cls).filter(Boolean).length;
            if (n < 10) return '카드 10장을 모두 분류해 주세요. (지금 ' + n + '장)';
            const w = FOS.filter((f) => S.cls[f.id] !== f.ans).map((f) => f.id); S.badCards = w;
            if (w.length) return '빨간 테두리 카드 ' + w.length + '장을 다시 확인해 보세요. 번성 칸이 몇 개 시대에 걸치는지, 환경이 한정되는지 살펴봐요.';
            if (!clsEnv.complete()) return '시상 화석 3개가 알려 주는 환경을 모두 골라 주세요. (지금 ' + clsEnv.count() + '개)';
            const e = clsEnv.wrong(); clsEnv.mark(e);
            if (e.length) return '빨간 칸의 환경을 다시 확인해 보세요. 산호는 바다, 고사리는 육지에서 살아요.';
            return true;
          },
          explain: '표준 화석은 <b>삼엽충·필석·방추충·암모나이트·화폐석·매머드</b>예요. 모두 번성한 시기가 한 시대 안이고 넓게 퍼져 있어요. 시상 화석은 <b>산호(따뜻하고 얕은 바다)·고사리(따뜻하고 습한 육지)·조개(얕은 바다·갯벌)</b>예요. 공룡 발자국은 분포가 좁고 드물어 둘 다 아니에요.',
        },
        {
          type: 'quiz', title: '삼엽충 화석이 알려 주는 것',
          goal: '서로 멀리 떨어진 두 지역의 지층에서 모두 <b>삼엽충</b> 화석이 나왔어요. 이 사실로 알 수 있는 것은?',
          setup() { setMode('cards'); setCtl([]); },
          choices: ['두 지층은 같은 시대(고생대 초기)에 쌓였을 가능성이 높아요', '두 지층은 모두 따뜻하고 얕은 바다에서 쌓였어요', '두 지층은 서로 다른 시대에 쌓였어요', '삼엽충은 지금도 두 지역에 살고 있어요'],
          answer: 0,
          feedback: ['', '삼엽충은 여러 바다에서 두루 살았기 때문에 특정 환경을 알려 주지 않아요. 시대를 알려 주는 표준 화석이에요.', '표준 화석은 짧은 시기에만 번성했기 때문에, 같은 화석이 나온 지층은 같은 시대로 볼 수 있어요.', '삼엽충은 고생대 말(페름기 말)에 멸종했어요.'],
          explain: '표준 화석은 번성한 기간이 짧고 넓게 분포해서, 멀리 떨어진 지층에서 같은 화석이 나오면 <b>같은 시대의 지층</b>으로 대비할 수 있어요. 환경을 알려 주는 것은 시상 화석이에요.',
        },
      ],
    },
    {
      title: '지질시대: 46억 년을 시계로', short: '지질시대', icon: '🕰️', phase: '모형', features: ['clock'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 표준 화석이 지층의 시대를 알려 준다고 배웠어요. 시대를 나누는 이름이 바로 <b>지질시대</b>예요.</div>' +
        '<p>지질시대는 생물계의 큰 변화를 기준으로 선캄브리아시대 · 고생대 · 중생대 · 신생대로 크게 나누고, 이 수업에서는 더 나눈 <b>기(紀)</b> 단위까지 살펴봐요. 먼저 기 12개를 오래된 순서로 쌓아 보고, 지구의 역사 <b>46억 년을 24시간</b>으로 줄인 지질 시계에서 시대의 길이를 느껴 봐요.</p>',
      setup() { resetStep(1); },
      recap: '지질시대는 선캄브리아시대(약 88 %)와 고생대·중생대·신생대로 나누고, 고생대 이후는 12개의 기로 나눠요.',
      summary: '<table class="mini"><tr><th>시대</th><th>기(紀)</th><th>시작 시기</th></tr><tr><td rowspan="6">고생대</td><td>캄브리아기</td><td>5.39억 년 전</td></tr><tr><td>오르도비스기</td><td>4.85억</td></tr><tr><td>실루리아기</td><td>4.44억</td></tr><tr><td>데본기</td><td>4.19억</td></tr><tr><td>석탄기</td><td>3.59억</td></tr><tr><td>페름기</td><td>2.99억</td></tr><tr><td rowspan="3">중생대</td><td>트라이아스기</td><td>2.52억</td></tr><tr><td>쥐라기</td><td>2.01억</td></tr><tr><td>백악기</td><td>1.45억</td></tr><tr><td rowspan="3">신생대</td><td>팔레오기</td><td>6600만 년 전</td></tr><tr><td>네오기</td><td>2300만</td></tr><tr><td>제4기</td><td>258만</td></tr></table><ul><li>선캄브리아시대(46억~5.39억 년 전)는 전체 지구 역사의 약 <b>88 %</b>예요.</li><li>46억 년을 24시간으로 줄이면 고생대 시작 약 21시 10분, 중생대 시작 약 22시 40분, 신생대 시작 약 23시 40분이에요. (경계 나이는 자료마다 조금씩 달라요.)</li></ul>',
      missions: [
        {
          title: '12개의 기(紀)를 오래된 순서로', manual: true,
          goal: '고생대부터 신생대까지 <b>기(紀) 12개</b>를 가장 오래된 것부터 차례로 눌러 아래에서 위로 쌓아요.',
          hint: '고생대는 캄브리아기 · 오르도비스기 · 실루리아기 · 데본기 · 석탄기 · 페름기, 중생대는 트라이아스기 · 쥐라기 · 백악기, 신생대는 팔레오기 · 네오기 · 제4기예요.',
          setup() { setMode('order'); ordEp.reset(); syncOrd(); setCtl(['ord12']); },
          status: () => mark(ordEp.ok()) + ' 쌓은 기 ' + ordEp.seq.length + ' / 12',
          check() {
            if (!ordEp.complete()) return '기(紀) 12개를 모두 눌러 주세요. (지금 ' + ordEp.seq.length + '개)';
            if (!ordEp.ok()) { const i = ordEp.firstWrong(); S.ordBad = i; ordEp.mark(ordEp.seq[i]); return (i + 1) + '번째 기가 맞지 않아요. 아래쪽이 더 오래된 시대예요.'; }
            S.ordOk = true; S.ordBad = -1; return true;
          },
          explain: '오래된 순서는 <b>캄브리아기 → 오르도비스기 → 실루리아기 → 데본기 → 석탄기 → 페름기</b>(고생대), <b>트라이아스기 → 쥐라기 → 백악기</b>(중생대), <b>팔레오기 → 네오기 → 제4기</b>(신생대)예요.',
        },
        {
          title: '지질 시계에 경계 맞추기',
          goal: '시계의 깃발 ①②③을 끌어서 <b>고생대 · 중생대 · 신생대의 시작</b> 시각에 맞춰요. (5분 단위, 46억 년 = 24시간)',
          hint: '시각 = 24시간 × (46억 − 경계 나이) ÷ 46억 이에요. 깃발을 움직이면 가운데에 시각과 나이가 나와요. 고생대 시작 5.39억 년 전은 21시 10분 근처예요.',
          setup() { resetMarkers(); setMode('clock'); setCtl(['clockhelp']); },
          check: () => S.mk.every((m) => m.locked), hold: 0.5,
          status: () => S.mk.map((m, i) => mark(m.locked) + ' ' + CLK[i].n + ' ' + hhmm(m.t)).join(' · '),
          explain: '고생대 시작 5.39억 년 전 → 24 × (46 − 5.39) ÷ 46 ≈ <b>21시 11분</b>(21:10), 중생대 시작 2.52억 년 전 → 약 <b>22시 41분</b>(22:40), 신생대 시작 6600만 년 전 → 약 <b>23시 39분</b>(23:40)이에요. 선캄브리아시대는 하루의 약 88 %, 현생 인류가 나타난 약 30만 년 전은 자정 약 6초 전이에요.',
        },
      ],
    },
    {
      title: '생물 변천: 화석 조합으로 시대 읽기', short: '생물 변천', icon: '📚', phase: '탐구', features: ['strata'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지질시대를 12개의 기(紀)로 나눴어요. 이번에는 지층 속 <b>화석 조합</b>으로 그 지층이 어느 기에 쌓였는지 읽어 봐요.</div>' +
        '<p>생물은 시대에 따라 번성하고 사라졌어요. 한 가지 화석만으로는 기를 좁히기 어렵지만, 여러 화석이 <b>함께 번성한 기</b>를 찾으면 기를 정할 수 있어요. 그리고 짧은 기간에 많은 생물이 사라진 <b>대멸종</b>이 지질시대의 중요한 경계가 된 까닭도 살펴봐요.</p>',
      setup() { resetStep(2); },
      recap: '화석 조합이 겹치는 기를 찾으면 지층의 시대를 알 수 있어요. 다섯 번의 대멸종 뒤에는 새로운 생물군이 번성했어요.',
      summary: '<ul><li><b>삼엽충·필석</b>: 고생대 오르도비스기 · <b>방추충·양치식물 숲</b>: 석탄기 · <b>암모나이트·공룡·시조새</b>: 중생대(시조새는 쥐라기) · <b>화폐석·포유류</b>: 팔레오기에 번성. (번성한 기는 예시)</li><li>여러 화석의 번성 기간이 <b>겹치는 기</b>가 지층의 시대예요.</li><li><b>대멸종 5회</b>(해양 생물 감소율, 대략): 오르도비스기 말 약 85 %, 데본기 후기 약 75 %, 페름기 말 약 96 %(최대), 트라이아스기 말 약 80 %, 백악기 말 약 76 %(공룡 멸종).</li><li>대멸종 뒤에는 살아남은 생물이 비어 있던 환경으로 퍼지며 새로운 생물군이 번성해요.</li></ul>',
      missions: [
        {
          title: '화석 조합으로 기(紀) 판정하기',
          goal: '가상 지층 4개의 화석 조합을 보고, 각 층이 쌓인 <b>기(紀)</b>를 아래 목록에서 골라요.',
          hint: '층을 눌러 고르면 그 층의 화석이 표에서 주황색으로 보여요. 주황색 줄이 모두 겹치는 칸이 정답이에요. 맨 아래층은 삼엽충과 필석이 함께 번성한 기예요.',
          setup() { selLy.reset(); S.layer = 0; S.sub = 'age'; setMode('strata'); setCtl(['sely']); },
          check: () => selLy.ok(), hold: 0.6,
          status: () => LAYERS.map((L) => mark(selLy.val[L.id] === L.ans) + ' ' + L.n.slice(0, 1)).join(' · ') + ' (맞게 고른 층 ' + LAYERS.filter((L) => selLy.val[L.id] === L.ans).length + ' / 4)',
          explain: '① 삼엽충+필석 → <b>오르도비스기</b>, ② 방추충+양치식물 숲 → <b>석탄기</b>, ③ 암모나이트+공룡+시조새 → <b>쥐라기</b>(시조새가 쥐라기), ④ 화폐석+포유류 → <b>팔레오기</b>예요. 번성 기간이 겹치는 기를 찾으면 돼요.',
        },
        {
          title: '대멸종 5회 찾기', manual: true,
          goal: '그래프에서 해양 생물이 크게 줄어든 시기를 <b>5곳</b> 표시해요. 번호 깃발을 눌러 표시해요.',
          hint: '표시하면 감소율이 나타나요. 약 75 % 이상 줄어든 곳이 대멸종이에요. 감소가 작은 곳은 표시하지 않아요.',
          setup() { S.sub = 'ext'; S.extRev = 0; S.marks = {}; S.extBad = []; setMode('strata'); setCtl(['exthelp']); updateCtl(); },
          status: () => { const n = Object.keys(S.marks).length; return mark(n === 5 && EXT.filter((x) => x.big).every((x) => S.marks[x.id])) + ' 표시한 곳 ' + n + ' / 5'; },
          check() {
            const sel = EXT.filter((x) => S.marks[x.id]);
            if (sel.length < 5) return '대멸종이라고 생각하는 곳을 5곳 표시해 주세요. (지금 ' + sel.length + '곳)';
            const bad = sel.filter((x) => !x.big).map((x) => x.id), miss = EXT.filter((x) => x.big && !S.marks[x.id]);
            S.extBad = bad;
            if (sel.length > 5) return '5곳만 표시해야 해요. 감소율이 작은 곳은 빼 주세요.';
            if (bad.length) return '감소율이 작은 곳이 섞여 있어요. 감소가 75 % 이상인 곳만 대멸종이에요.';
            if (miss.length) return '아직 찾지 못한 대멸종이 있어요. 그래프에서 크게 떨어지는 곳을 찾아봐요.';
            return true;
          },
          explain: '대멸종 5회는 <b>오르도비스기 말(약 85 %) · 데본기 후기(약 75 %) · 페름기 말(약 96 %, 최대) · 트라이아스기 말(약 80 %) · 백악기 말(약 76 %)</b>이에요. 수치는 자료마다 다른 대략 값이에요.',
        },
        {
          type: 'quiz', title: '삼엽충과 공룡, 대멸종 뒤의 변화',
          goal: '다음 중 옳은 설명은?',
          setup() { S.sub = 'age'; setMode('strata'); setCtl([]); updateCtl(); },
          choices: ['삼엽충과 공룡은 같은 시대에 함께 살았어요', '대멸종으로 많은 생물이 사라진 뒤, 살아남은 생물이 비어 있던 환경으로 퍼져 새로운 생물군이 번성했어요', '대멸종 뒤에는 사라진 생물이 곧바로 모두 되살아났어요', '대멸종은 지구 역사에서 한 번도 일어나지 않았어요'],
          answer: 1,
          feedback: ['삼엽충은 고생대에, 공룡은 중생대에 살았어요. 두 시대 사이에는 약 2억 년의 차이가 있어요.', '', '한번 멸종한 생물은 되살아나지 않아요. 살아남은 생물이 새로 번성해요.', '지질시대 동안 큰 대멸종이 5번 있었어요.'],
          explain: '삼엽충(고생대)과 공룡(중생대)은 <b>함께 살지 않았어요</b>. 대멸종 뒤에는 경쟁자가 사라져 살아남은 생물이 빈 환경으로 퍼지며 새로운 생물군이 번성하고, 이 변화가 지질시대를 나누는 기준이 돼요.',
        },
      ],
    },
    {
      title: '한반도 화석 분포 지도', short: '한반도 화석', icon: '🗺️', phase: '분석', features: ['map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화석 조합으로 시대를 읽었어요. 이번에는 같은 방법으로 <b>우리나라에서 나오는 화석</b>의 시대와 옛 환경을 알아봐요.</div>' +
        '<p>한반도 곳곳에는 고생대의 삼엽충부터 신생대의 식물과 조개까지 여러 시대의 화석이 남아 있어요. 화석 지점 6곳(예시 자료)을 지도에 놓아 <b>화석 분포 지도</b>를 그리고, 화석으로 그 땅의 옛 환경을 추론해요.</p>',
      setup() { resetStep(3); },
      recap: '한반도에는 고생대 바다 생물부터 중생대 공룡, 신생대 식물까지 여러 시대의 화석이 남아 있고, 같은 땅도 시대에 따라 환경이 바뀌었어요.',
      summary: '<table class="mini"><tr><th>지점</th><th>화석</th><th>시대</th><th>옛 환경</th></tr><tr><td>강원 태백</td><td>삼엽충</td><td>고생대 캄브리아~오르도비스기</td><td>바다</td></tr><tr><td>강원 정선</td><td>방추충</td><td>고생대 석탄~페름기</td><td>바다</td></tr><tr><td>충남 보령</td><td>식물</td><td>중생대 트라이아스~쥐라기</td><td>육지</td></tr><tr><td>경남 고성</td><td>공룡 발자국</td><td>중생대 백악기</td><td>호숫가</td></tr><tr><td>경북 포항</td><td>식물</td><td>신생대</td><td>육지</td></tr><tr><td>제주 서귀포</td><td>바다 조개</td><td>신생대</td><td>바다</td></tr></table><ul><li>같은 땅에서도 시대에 따라 바다(고생대) → 육지·호숫가(중생대)처럼 환경이 달라졌어요.</li><li>지점과 지층 이름은 예시 자료예요. 정확한 내용은 박물관·지질공원 누리집에서 확인해요.</li></ul>',
      missions: [
        {
          title: '화석 분포 지도 그리기',
          goal: '화석 지점 카드 6장을 끌어서 <b>지도 위 알맞은 곳</b>에 놓아요.',
          hint: '카드에 적힌 도(道)와 힌트, 지도의 도시 이름을 단서로 삼아요. 핀의 뾰족한 끝이 가리키는 곳이 지점이에요.',
          setup() { initPins(); S.mapEra = false; S.mapMsg = ''; setMode('map'); setCtl(['maphelp']); },
          check: () => S.pins.length === 6 && S.pins.every((p) => p.placed), hold: 0.6,
          status: () => mark(S.pins.every((p) => p.placed)) + ' 놓은 지점 ' + S.pins.filter((p) => p.placed).length + ' / 6',
          explain: '태백·정선은 강원도 남쪽, 보령은 충남 서해안, 고성은 경남 남해안, 포항은 경북 동해안, 서귀포는 제주도 남쪽에 있어요. 이렇게 지점을 찍으면 어느 지역에 어떤 시대의 화석이 있는지 한눈에 볼 수 있어요.',
        },
        {
          title: '지점별 시대와 옛 환경 추론', manual: true,
          goal: '6개 지점의 화석으로 <b>지층의 시대</b>와 <b>옛 환경</b>(바다·호숫가·육지)을 골라요.',
          hint: '삼엽충·방추충은 고생대 바다 생물, 공룡 발자국은 중생대 백악기 호숫가의 흔적, 식물은 육지에서 자라요. 바다 조개는 바다에서 살아요.',
          setup() { selSite.reset(); S.mapEra = false; setMode('map'); setCtl(['selsite', 'maphelp']); },
          status: () => mark(selSite.ok()) + ' 고른 지점 ' + selSite.count() + ' / 6',
          check() {
            if (selSite.count() < 6) return '6개 지점의 시대와 환경을 모두 골라 주세요. (지금 ' + selSite.count() + '곳)';
            const w = selSite.wrong(); selSite.mark(w);
            if (w.length) return '빨간 지점 ' + w.length + '곳을 다시 확인해 보세요. 화석의 종류가 시대와 환경을 알려 줘요.';
            S.mapEra = true; return true;
          },
          explain: '태백의 삼엽충은 <b>고생대 초기 바다</b>, 정선의 방추충은 <b>고생대 후기 바다</b>, 보령의 식물은 <b>중생대 초·중기 육지</b>, 고성의 공룡 발자국은 <b>중생대 백악기 호숫가</b>, 포항의 식물은 <b>신생대 육지</b>, 서귀포의 바다 조개는 <b>신생대 바다</b>를 알려 줘요.',
        },
        {
          type: 'quiz', title: '같은 땅, 달라진 환경',
          goal: '한 지역의 아래 지층에서는 <b>삼엽충</b> 화석이, 훨씬 위 지층에서는 <b>공룡 발자국</b> 화석이 나왔어요. 이 땅에서 일어난 일로 알맞은 것은?',
          setup() { S.mapEra = true; setMode('map'); setCtl([]); },
          choices: ['고생대에는 바다였다가 땅이 솟아올라 중생대에는 육지(호숫가)가 되었어요', '삼엽충과 공룡이 같은 시대에 함께 살았어요', '위 지층이 먼저 쌓이고 아래 지층이 나중에 쌓였어요', '이 땅은 한 번도 환경이 변하지 않았어요'],
          answer: 0,
          feedback: ['', '삼엽충은 고생대, 공룡은 중생대에 살았어요. 서로 다른 시대의 생물이에요.', '변형되지 않았다면 아래 지층이 먼저 쌓였어요(지층 누중의 법칙).', '화석이 서로 다르다는 것은 시대에 따라 환경이 변했다는 증거예요.'],
          explain: '아래 지층의 삼엽충은 <b>고생대 바다</b>, 위 지층의 공룡 발자국은 <b>중생대 호숫가</b>의 증거예요. 같은 땅이 지각 변동과 해수면 변화로 바다에서 육지로 바뀌었다는 것을 화석이 보여 줘요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-geologic-time', mount: '#game', badge: '화석 탐험가', homeHref: '../../index.html#he',
    featureLabels: { form: '🦴 화석 만들기 · 화석 카드', clock: '🕰️ 기(紀)의 순서 · 지질 시계', strata: '📚 가상 지층 · 대멸종 그래프', map: '🗺️ 한반도 화석 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode, n = (id) => EP[EPI[id]].n;
    if (m === 'form') setReadouts(['생물의 몸', (S.fo.run || S.fo.res != null ? S.fo.hard : S.hard) ? '단단한 껍데기' : '단단한 부분 없음', '묻히는 속도', (S.fo.run || S.fo.res != null ? S.fo.fast : S.fast) ? '빠름' : '느림', '결과', S.fo.res == null ? (S.fo.run ? '실험 중…' : '실험 전') : S.fo.res ? '화석이 됨' : '화석이 안 됨']);
    else if (m === 'cards') setReadouts(['분류한 카드', Object.values(S.cls).filter(Boolean).length + ' / 10', '표준 화석', catCount('std') + '장', '시상 화석', catCount('si') + '장']);
    else if (m === 'order') setReadouts(['쌓은 기(紀)', ordEp.seq.length + ' / 12', '가장 아래', ordEp.seq.length ? n(ordEp.seq[0]) : '—', '가장 위', ordEp.seq.length ? n(ordEp.seq[ordEp.seq.length - 1]) : '—']);
    else if (m === 'clock') setReadouts(S.mk.flatMap((k, i) => [CLK[i].n, hhmm(k.t)]));
    else if (m === 'strata') {
      if (S.sub === 'age') { const L = LAYERS[S.layer], v = selLy.val[L.id]; setReadouts(['고른 층', L.n, '고른 기(紀)', v ? EP[EPI[v]].n : '—', '맞게 고른 층', LAYERS.filter((x) => selLy.val[x.id] === x.ans).length + ' / 4']); }
      else { const k = EXT.filter((x) => S.marks[x.id]); setReadouts(['표시한 곳', k.length + ' 곳', '75 % 이상 감소한 곳', k.filter((x) => x.drop >= 75).length + ' 곳', '자료', '예시 자료']); }
    } else setReadouts(['놓은 지점', S.pins.filter((p) => p.placed).length + ' / 6', '선택한 지점', S.selPin >= 0 ? SITEI[S.pins[S.selPin].id].loc : '—', '화석', S.selPin >= 0 ? SITEI[S.pins[S.selPin].id].fos : '—']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) { S.clockReveal = true; S.mapEra = true; S.mk.forEach((k, i) => { k.t = CLK[i].tgt; k.locked = false; }); } updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'form') drawForm(t, dt);
    else if (S.mode === 'cards') drawCards(t, dt);
    else if (S.mode === 'order') drawOrder(t, dt);
    else if (S.mode === 'clock') drawClock(t, dt);
    else if (S.mode === 'strata') (S.sub === 'age' ? drawStrataAge : drawExt)(t, dt);
    else drawMap(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    VW, VH, S, EP, FOS, LAYERS, EXT, SITES, CLK, PHONE, ordEp, clsEnv, selLy, selSite, mapP, mkPos, trayPos, cardRects, layerRects, exX, EXR, MP,
    get game() { return game; },
    finishForm, startForm, setMode, resetStep, initPins, updateCtl,
    solveCards() { FOS.forEach((f) => { S.cls[f.id] = f.ans; }); clsEnv.reset(); FOS.filter((f) => f.envAns).forEach((f) => clsEnv.sel[f.id] = f.envAns); },
    solveOrder() { ordEp.reset(); EP.forEach((e) => ordEp.seq.push(e.id)); ordEp.complete(); syncOrd(); },
    solveClock() { S.mk.forEach((m, i) => { m.t = CLK[i].tgt; m.locked = true; }); },
    solveLayers() { LAYERS.forEach((L) => selLy.set(L.id, L.ans)); },
    solveExt() { S.marks = {}; EXT.filter((x) => x.big).forEach((x) => { S.marks[x.id] = true; }); },
    solveSites() { SITES.forEach((s) => selSite.set(s.id, s.era, s.env)); },
    placeAll() { S.pins.forEach((p) => { p.placed = true; }); },
  };

})();
