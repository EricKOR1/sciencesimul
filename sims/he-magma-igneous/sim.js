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
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 마그마와 화성암
     [12지구02-03] 변동대에서 마그마가 생성되고, 그 조성에 따라 다양한 화성암이 생성됨을 설명
     ① 모형: 마그마 생성   ② 실험: 마그마 종류   ③ 탐구: 분화 과정   ④ 적용: 화성암 분류
     ========================================================= */
  initStage('#eaf1f7', 800, 560, 600, 880, 1.22);
  const U = VW / 800;
  const sm01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerpA = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (x <= b[0]) return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); } return pts[pts.length - 1][1]; };

  /* ---------- 마그마 생성 자료 (예시 값) ---------- */
  const DRY = [[0, 1100], [35, 1250], [100, 1400], [150, 1500]];          // 마른 맨틀 암석(감람암)이 녹기 시작하는 온도 (깊이 km, °C)
  const WET = [[0, 800], [35, 950], [100, 1050], [150, 1150]];            // 물이 충분히 있을 때
  const solid = (d, w) => lerp(lerpA(DRY, d), lerpA(WET, d), clamp(w, 0, 100) / 100);      // w: 물의 양(%)
  const mantleT = (d) => 1405 + 0.5 * d;                                    // 상승하는 맨틀 온도 (150 km 1480, 100 km 1455, 50 km 1430)
  const WEDGE = { d: 100, T: 1200 };                                        // 섭입대 맨틀 쐐기
  const CRUST = { d: 30, T0: 700, Tm: 750, Tmagma: 1200 };                  // 대륙 하부 지각
  const crustT = (h) => CRUST.T0 + 1.5 * h;                                 // 마그마의 열(h %)을 받은 지각 암석의 온도
  const meltPct = (T, Ts) => clamp((T - Ts) / 12, 0, 25);
  /* 설계 값 확인 */
  if (mantleT(150) !== 1480 || mantleT(100) !== 1455 || mantleT(50) !== 1430) throw new Error('mantle path');
  if (!(mantleT(150) < solid(150, 0) && mantleT(100) > solid(100, 0) && mantleT(50) > solid(50, 0))) throw new Error('melting rule');
  if (!(WEDGE.T < solid(100, 0) && WEDGE.T > solid(100, 100))) throw new Error('wedge rule');
  if (Math.round(solid(100, 100)) !== 1050) throw new Error('wet solidus');
  if (!(CRUST.T0 < CRUST.Tm && crustT(100) > CRUST.Tm)) throw new Error('crust rule');
  const fx = (v, d) => (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0);

  /* ---------- 마그마의 종류: SiO2 함량 ---------- */
  const TSIO = [[45, 1200], [52, 1000], [63, 800], [70, 650]];              // 온도 (°C)
  const LVIS = [[45, 0], [52, 1.0], [63, 3.0], [70, 4.6]];                   // log10(상대 점성), 염기성 = 1
  const magType = (s) => (s < 52 ? { k: 'b', n: '염기성', rock: '현무암질', col: '#2f2f35', vol: '순상 화산' } : s <= 63 ? { k: 'i', n: '중성', rock: '안산암질', col: '#8a8780', vol: '성층 화산' } : { k: 'a', n: '산성', rock: '화강암질', col: '#e2c3b4', vol: '용암 돔' });
  const rockColor = (s) => mixc('#2b2b31', '#e8cdbf', (s - 45) / 25);
  const viscRel = (s) => Math.pow(10, lerpA(LVIS, s));
  const fmtV = (v) => (v < 9.5 ? fx(v, 1) : fmtN(Math.round(v)));
  const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const flowMax = (s) => 400 / Math.pow(1 + lerpA(LVIS, s), 1.2);

  /* ---------- 분화 과정: 보웬 반응 계열 ---------- */
  const MIN = {
    ol: { n: '감람석', col: '#86b341', ink: '#fff' }, px: { n: '휘석', col: '#38472b', ink: '#fff' }, am: { n: '각섬석', col: '#252c36', ink: '#fff' }, bi: { n: '흑운모', col: '#74492a', ink: '#fff' },
    ca: { n: 'Ca 사장석', col: '#d9d6cc', ink: '#1b2333' }, na: { n: 'Na 사장석', col: '#eceae4', ink: '#1b2333' }, kf: { n: '정장석', col: '#e8b5a4', ink: '#1b2333' }, qz: { n: '석영', col: '#c3ccd6', ink: '#1b2333' }, ms: { n: '백운모', col: '#e6dca6', ink: '#1b2333' },
  };
  /* 단계: [시작 °C, 끝 °C, 분리되는 양(처음 마그마 100 중), 결정의 SiO2 %] */
  const STG = [
    { id: 'ol', a: 1300, b: 1150, m: 20, c0: 40, c1: 40 },
    { id: 'px', a: 1150, b: 1000, m: 18, c0: 51, c1: 51 },
    { id: 'pl', a: 1100, b: 850, m: 22, c0: 46, c1: 62 },
    { id: 'am', a: 1000, b: 850, m: 14, c0: 45, c1: 45 },
    { id: 'bi', a: 850, b: 750, m: 8, c0: 37, c1: 37 },
  ];
  const MAG0 = 50;                                              // 처음 마그마의 SiO2 (%)
  function bowenAt(T) {
    let R = 0, Sx = 0; const part = {};
    STG.forEach((g) => { const fr = clamp((g.a - T) / (g.a - g.b), 0, 1), dm = g.m * fr; part[g.id] = dm; R += dm; Sx += (g.m * (g.c0 * fr + 0.5 * (g.c1 - g.c0) * fr * fr)) / 100; });
    const M = 100 - R, last = 100 - STG.reduce((s, g) => s + g.m, 0);
    const sio = (100 * (MAG0 - Sx)) / M;
    const inplace = clamp((750 - T) / 50, 0, 1);               // 750 °C 이하: 남은 마그마가 제자리에서 굳어요
    return { R, M, melt: M * (1 - inplace), solidInPlace: M * inplace, sio, part, last };
  }
  if (Math.abs(bowenAt(1150).sio - 52.5) > 1e-9 || Math.abs(bowenAt(1150).M - 80) > 1e-9) throw new Error('bowen 1150 ' + bowenAt(1150).sio);
  if (!(bowenAt(750).sio > 63 && bowenAt(1300).sio === 50)) throw new Error('bowen end ' + bowenAt(750).sio);
  const WIN = [   // 보웬 도표 상자 (불연속 계열 · 연속 계열 · 마지막 광물)
    { id: 'ol', col: 0, a: 1300, b: 1150 }, { id: 'px', col: 0, a: 1150, b: 1000 }, { id: 'am', col: 0, a: 1000, b: 850 }, { id: 'bi', col: 0, a: 850, b: 750 },
    { id: 'ca', col: 1, a: 1100, b: 975 }, { id: 'na', col: 1, a: 975, b: 850 },
    { id: 'kf', col: 2, a: 750, b: 700 }, { id: 'ms', col: 3, a: 750, b: 700 }, { id: 'qz', col: 4, a: 750, b: 700 },
  ];

  /* ---------- 화성암 ---------- */
  const ROCK = {
    basalt: { n: '현무암', sio: 'b', tex: 'f', dark: 0.9, min: '감람석·휘석·Ca 사장석', kind: 'basalt' },
    andesite: { n: '안산암', sio: 'i', tex: 'f', dark: 0.55, min: '각섬석·사장석', kind: 'andesite' },
    rhyolite: { n: '유문암', sio: 'a', tex: 'f', dark: 0.15, min: '석영·정장석·사장석', kind: 'rhyolite' },
    gabbro: { n: '반려암', sio: 'b', tex: 'c', dark: 0.9, min: '휘석·Ca 사장석·감람석', kind: 'gabbro' },
    diorite: { n: '섬록암', sio: 'i', tex: 'c', dark: 0.5, min: '각섬석·사장석', kind: 'diorite' },
    granite: { n: '화강암', sio: 'a', tex: 'c', dark: 0.15, min: '석영·정장석·흑운모', kind: 'granite' },
  };
  const ROCKS = ['basalt', 'andesite', 'rhyolite', 'gabbro', 'diorite', 'granite'];
  const CELLS = [];     // 표의 칸: 행(화산암/심성암) x 열(염기성/중성/산성)
  ['v', 'p'].forEach((r) => ['b', 'i', 'a'].forEach((c) => { CELLS.push({ id: r + c, row: r, col: c, rock: ROCKS.find((k) => (ROCK[k].tex === 'f') === (r === 'v') && ROCK[k].sio === c) }); }));
  CELLS.forEach((c) => { if (!c.rock) throw new Error('cell ' + c.id); });
  const SAMPLES = [
    { id: 'sa', n: '시료 A · 어둡고 구멍이 많은 세립질', kind: 'basalt', ans: 'basalt' },
    { id: 'sb', n: '시료 B · 밝고 석영이 보이는 조립질', kind: 'granite', ans: 'granite' },
    { id: 'sc', n: '시료 C · 중간 색의 세립질', kind: 'andesite', ans: 'andesite' },
  ];
  const KOR = [{ id: 'jeju', label: '제주도의 현무암(구멍이 많은 암석)', ans: 'fast' }, { id: 'bukhan', label: '북한산·설악산의 화강암 산', ans: 'slow' }];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'gen', clock: 0, fade: 0, place: 'ridge', depth: 150, depthV: 150, water: 0, waterV: 0, heat: 0, heatV: 0,
    did: { dec: false, wat: false, heat: false }, melt: 0, meltV: 0,
    sio: 45, sioV: 45, flowT: 0, flowSeen: 0, flowRun: 0,
    tc: 1300, tv: 1300, playing: false, sioCalc: 50, crystals: [],
    cards: {}, dragCard: null, bad: [], tableDone: false,
  };

  /* ---------- HTML 도구 ---------- */
  const clsMag = makeClassify($('#clsMag'), [{ id: 'ridge', label: '해령 (발산 경계)' }, { id: 'arc', label: '섭입대의 화산호' }, { id: 'hot', label: '열점 (맨틀 깊은 곳의 상승)' }, { id: 'crust', label: '대륙 지각 하부의 용융' }],
    [{ id: 'b', label: '현무암질' }, { id: 'i', label: '안산암질' }, { id: 'a', label: '화강암질' }], { ridge: 'b', arc: 'i', hot: 'b', crust: 'a' });
  const ordMin = makeOrder($('#ordMin'), ['kf', 'ol', 'qz', 'am', 'bi', 'px'].map((id) => ({ id, label: MIN[id].n })), ['ol', 'px', 'am', 'bi', 'kf', 'qz']);
  const clsSam = makeClassify($('#clsSam'), SAMPLES.map((s) => ({ id: s.id, label: s.n })), ROCKS.map((k) => ({ id: k, label: ROCK[k].n })), Object.fromEntries(SAMPLES.map((s) => [s.id, s.ans])));
  const clsKor = makeClassify($('#clsKor'), KOR, [{ id: 'fast', label: '지표 부근에서 빨리 식음' }, { id: 'slow', label: '땅속 깊은 곳에서 천천히 식음' }], Object.fromEntries(KOR.map((k) => [k.id, k.ans])));
  const stpSi = makeStepper($('#stpSi'), { min: 45, max: 70, step: 0.5, value: 50, dec: 1, unit: '%', onChange: (v) => { S.sioCalc = v; } });

  /* ======================================================
     장면 1: 변동대에서의 마그마 생성
     ====================================================== */
  const GL = PHONE ? { x: 8, y: 8, w: 584, h: 430 } : { x: 10, y: 10, w: 392, h: 396 };
  const GR = PHONE ? { x: 8, y: 446, w: 584, h: 300 } : { x: 410, y: 10, w: 380, h: 396 };
  const GI = PHONE ? { x: 8, y: 754, w: 584, h: 118 } : { x: 10, y: 414, w: 780, h: 136 };
  const PL_ = { x: GR.x + 56, y: GR.y + 58, w: GR.w - 72, h: GR.h - 106 };
  const tX = (T) => PL_.x + (PL_.w * (T - 800)) / 900;
  const dY = (d) => PL_.y + (PL_.h * d) / 150;
  const sYm = (d) => GL.y + 46 + ((GL.h - 66) * d) / 150;               // 단면 그림의 깊이(km) 눈금
  const PLACE_NAME = { ridge: '해령 (발산 경계)', hot: '열점', arc: '섭입대의 화산호', crust: '대륙 지각 하부' };
  function genState() {
    const p = S.place;
    if (p === 'ridge' || p === 'hot') { const d = S.depthV, T = mantleT(d), Ts = solid(d, 0); return { d, T, Ts, melt: meltPct(T, Ts), w: 0 }; }
    if (p === 'arc') { const w = S.waterV, Ts = solid(WEDGE.d, w); return { d: WEDGE.d, T: WEDGE.T, Ts, melt: meltPct(WEDGE.T, Ts), w }; }
    const h = S.heatV, T = crustT(h); return { d: CRUST.d, T, Ts: CRUST.Tm, melt: meltPct(T, CRUST.Tm), h };
  }
  function drawParcel(x, y, melt, t, w, h) {
    w = w || 60; h = h || 40;
    const k = clamp(melt / 5, 0, 1);
    D.shadow(() => { ctx.fillStyle = mixc('#8d8f7c', '#ff9a3f', k); rr(x - w / 2, y - h / 2, w, h, 9).fill(); }, { blur: 6, y: 2 });
    const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; rr(x - w / 2, y - h / 2, w, h, 9).fill();
    const r = seeded(7); ctx.fillStyle = 'rgba(40,50,30,.35)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(x - w / 2 + 6 + r() * (w - 12), y - h / 2 + 6 + r() * (h - 12), 1.6 + r() * 2.2, 0, TAU); ctx.fill(); }
    if (melt > 0) {
      const n = Math.min(8, 2 + Math.ceil(melt / 2));
      for (let i = 0; i < n; i++) { const a = t * 0.8 + i * 2.4; D.sphere(x - w / 2 + 9 + ((i * 37) % (w - 18)), y - h / 2 + 8 + ((i * 53 + Math.sin(a) * 6 + 20) % (h - 16)), 4 + (i % 3), '#ff5a2a', { gloss: true }); }
      ctx.strokeStyle = 'rgba(255,200,80,.9)'; ctx.lineWidth = 2.5; rr(x - w / 2, y - h / 2, w, h, 9).stroke();
    }
  }
  function emitMelt(x, y, rate, dt, col, toX, toY) {
    if (RM) return; const n = rate * dt + Math.random();
    for (let i = 0; i < Math.floor(n); i++) { const dx = toX != null ? (toX - x) : 0, dy = toY != null ? (toY - y) : -80, L = Math.hypot(dx, dy) || 1, sp = 50; parts.emit({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 10, vx: (dx / L) * sp + (Math.random() - 0.5) * 8, vy: (dy / L) * sp, life: Math.max(0.5, L / sp), size: 2.5 + Math.random() * 2.2, color: col || '#ff6a2a', shape: 'circle', fade: true }); }
  }
  function flowChevrons(x, y0, y1, t, col) {
    ctx.strokeStyle = col || 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    const gap = 46, off = RM ? 0 : (t * 26) % gap;
    for (let yy = y1 + off; yy > y0 + 4; yy -= gap) { if (yy > y1) continue; ctx.beginPath(); ctx.moveTo(x - 8, yy + 6); ctx.lineTo(x, yy - 4); ctx.lineTo(x + 8, yy + 6); ctx.stroke(); }
  }
  function drawGenScene(t, dt, G) {
    const L = GL, cx = L.x + L.w / 2, y0 = sYm(0), yP = sYm(35);
    card(L);
    ctx.save(); rr(L.x, L.y, L.w, L.h, 14).clip();
    ctx.fillStyle = '#dff0fa'; ctx.fillRect(L.x, L.y, L.w, L.h);
    const mantle = ctx.createLinearGradient(0, y0, 0, L.y + L.h); mantle.addColorStop(0, '#b8693a'); mantle.addColorStop(1, '#e0964a');
    let pr = null;
    if (S.place === 'ridge' || S.place === 'hot') {
      ctx.fillStyle = '#9fd3ee'; ctx.fillRect(L.x, L.y + 22, L.w, y0 - L.y - 22);
      ctx.fillStyle = mantle; ctx.fillRect(L.x, yP, L.w, L.y + L.h - yP);
      if (S.place === 'ridge') {
        ctx.fillStyle = mantle; ctx.beginPath(); ctx.moveTo(cx - 14, y0); ctx.lineTo(cx + 14, y0); ctx.lineTo(cx + 70, yP); ctx.lineTo(cx - 70, yP); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a4a52'; ctx.beginPath(); ctx.moveTo(cx - 14, y0); ctx.lineTo(cx + 14, y0); ctx.lineTo(cx + 24, y0 + 10); ctx.lineTo(cx - 24, y0 + 10); ctx.closePath(); ctx.fill();
        [[-1], [1]].forEach((sg) => { ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.moveTo(cx + sg[0] * 14, y0); ctx.lineTo(sg[0] > 0 ? L.x + L.w : L.x, y0); ctx.lineTo(sg[0] > 0 ? L.x + L.w : L.x, yP); ctx.lineTo(cx + sg[0] * 70, yP); ctx.closePath(); ctx.fill(); });
        D.arrow(cx - 22, y0 - 8, cx - 80, y0 - 8, { color: '#334155', width: 3, head: 9 }); D.arrow(cx + 22, y0 - 8, cx + 80, y0 - 8, { color: '#334155', width: 3, head: 9 });
        flowChevrons(cx, yP, sYm(150) - 20, t); flowChevrons(cx, y0 + 12, yP, t);
        pr = [cx, sYm(S.depthV)];
      } else {
        ctx.fillStyle = '#8a8478'; ctx.fillRect(L.x, y0, L.w, yP - y0);
        const g2 = ctx.createLinearGradient(0, sYm(150), 0, yP); g2.addColorStop(0, 'rgba(255,170,80,.15)'); g2.addColorStop(1, 'rgba(255,120,40,.65)'); ctx.fillStyle = g2;
        ctx.beginPath(); ctx.moveTo(cx - 70, sYm(150)); ctx.quadraticCurveTo(cx - 20, sYm(100), cx - 16, yP); ctx.lineTo(cx + 16, yP); ctx.quadraticCurveTo(cx + 20, sYm(100), cx + 70, sYm(150)); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6b6f6a'; ctx.beginPath(); ctx.moveTo(cx - 56, y0 + 1); ctx.lineTo(cx - 8, y0 - 26); ctx.lineTo(cx + 8, y0 - 26); ctx.lineTo(cx + 56, y0 + 1); ctx.closePath(); ctx.fill();
        D.text(cx, L.y + 20, '열점 위의 화산섬', { size: 13, weight: 800, color: '#334155' });
        flowChevrons(cx, y0 + 10, sYm(150) - 14, t, 'rgba(255,255,255,.8)');
        pr = [cx, sYm(S.depthV)];
      }
      [0, 50, 100, 150].forEach((d) => { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.x + 6, sYm(d)); ctx.lineTo(L.x + L.w, sYm(d)); ctx.stroke(); D.text(L.x + 8, sYm(d) - 4, d + ' km', { size: 12.5, weight: 800, color: 'rgba(255,255,255,.95)', align: 'left', stroke: 'rgba(80,40,10,.6)', strokeWidth: 3 }); });
      if (G.melt > 0) { emitMelt(pr[0], pr[1] - 8, 3 + G.melt * 1.4, dt, '#ff6a2a', cx, y0 + 12); const ch = clamp(G.melt * 2.2, 6, 34); const gg = ctx.createRadialGradient(cx, y0 + 14, 2, cx, y0 + 14, ch); gg.addColorStop(0, 'rgba(255,230,120,.95)'); gg.addColorStop(1, 'rgba(255,90,30,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, y0 + 14, ch, 0, TAU); ctx.fill(); }
    } else if (S.place === 'arc') {
      const trX = L.x + L.w * 0.26, sx = (d) => trX + (d / 150) * L.w * 0.62, ex = sx(150);
      ctx.fillStyle = '#9fd3ee'; ctx.fillRect(L.x, L.y + 22, trX - L.x, y0 - L.y - 22);
      ctx.fillStyle = mantle; ctx.fillRect(L.x, y0 + 10, L.w, L.y + L.h - y0);
      // 덮는 판
      ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.moveTo(trX, y0); ctx.lineTo(L.x + L.w, y0); ctx.lineTo(L.x + L.w, yP); ctx.lineTo(sx(35), yP); ctx.closePath(); ctx.fill();
      // 맨틀 쐐기 강조
      ctx.fillStyle = 'rgba(255,200,120,.28)'; ctx.beginPath(); ctx.moveTo(sx(35), yP); ctx.lineTo(L.x + L.w, yP); ctx.lineTo(L.x + L.w, sYm(150)); ctx.lineTo(ex, sYm(150)); ctx.closePath(); ctx.fill();
      // 섭입하는 판
      ctx.fillStyle = '#6c7482'; ctx.beginPath(); ctx.moveTo(L.x, y0); ctx.lineTo(trX, y0); ctx.lineTo(ex, sYm(150)); ctx.lineTo(ex - 18, sYm(150) + 16); ctx.lineTo(trX - 6, y0 + 16); ctx.lineTo(L.x, y0 + 16); ctx.closePath(); ctx.fill();
      D.arrow(L.x + 60, y0 + 30, L.x + 110, y0 + 30, { color: '#fff', width: 3, head: 9 });
      D.text(L.x + 80, y0 + 52, '바다 판', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
      D.text(trX + 24, L.y + 18, '해구', { size: 13, weight: 800, color: '#334155' });
      // 화산호
      const vx = sx(100) - 6; ctx.fillStyle = '#6b6f6a'; ctx.beginPath(); ctx.moveTo(vx - 36, y0 + 1); ctx.lineTo(vx - 6, y0 - 24); ctx.lineTo(vx + 6, y0 - 24); ctx.lineTo(vx + 36, y0 + 1); ctx.closePath(); ctx.fill();
      D.text(vx, L.y + 20, '화산호', { size: 13, weight: 800, color: '#334155' });
      [0, 50, 100, 150].forEach((d) => { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.x + 6, sYm(d)); ctx.lineTo(L.x + 40, sYm(d)); ctx.stroke(); D.text(L.x + 8, sYm(d) - 4, d + ' km', { size: 12.5, weight: 800, color: '#334155', align: 'left' }); });
      pr = [sx(100) + 44, sYm(100) - 14];
      // 물 (섭입판에서 올라옴)
      if (!RM && S.waterV > 0 && Math.random() < S.waterV / 100 * 0.9 + 0.05) parts.emit({ x: sx(85) + Math.random() * 20, y: sYm(85) + Math.random() * 40, vx: 14, vy: -34, life: 1.4, size: 3 + Math.random() * 2, color: '#4aa8ff', shape: 'bubble', fade: true });
      if (G.melt > 0) emitMelt(pr[0], pr[1] - 10, 3 + G.melt * 1.6, dt, '#ff6a2a', vx, y0 + 4);
    } else {
      // 대륙 지각 하부 (깊이 0~40 km)
      const cY = (d) => L.y + 46 + ((L.h - 86) * d) / 40, yy0 = cY(0);
      ctx.fillStyle = '#f0e6d2'; ctx.fillRect(L.x, L.y, L.w, yy0 - L.y);
      ctx.fillStyle = '#9d968a'; ctx.beginPath(); ctx.moveTo(L.x + L.w * 0.55, yy0); ctx.lineTo(L.x + L.w * 0.72, yy0 - 34); ctx.lineTo(L.x + L.w * 0.9, yy0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bdb6a8'; ctx.fillRect(L.x, yy0, L.w, cY(15) - yy0);
      const T = crustT(S.heatV), lowCol = mixc('#8b8579', '#ff9a3f', clamp((T - 700) / 160, 0, 1));
      ctx.fillStyle = lowCol; ctx.fillRect(L.x, cY(15), L.w, cY(35) - cY(15));
      ctx.fillStyle = mantle; ctx.fillRect(L.x, cY(35), L.w, L.y + L.h - cY(35));
      D.text(L.x + 70, cY(7.5) + 4, '상부 지각', { size: 13, weight: 800, color: '#4b463e', align: 'left' }); D.text(L.x + 70, cY(23) + 4, '하부 지각', { size: 13, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 }); D.text(L.x + 70, cY(38) + 4, '맨틀', { size: 13, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
      // 마그마의 열 (아래에서 올라오는 현무암질 마그마)
      const mg = ctx.createLinearGradient(0, cY(35), 0, cY(40)); mg.addColorStop(0, '#ff7a30'); mg.addColorStop(1, '#d93a1a'); ctx.fillStyle = mg;
      ctx.beginPath(); ctx.ellipse(cx, cY(36), L.w * 0.32, 14, 0, 0, TAU); ctx.fill(); D.text(cx, cY(36) + 5, '현무암질 마그마 (1200 °C)', { size: 13, weight: 800, color: '#fff' });
      const na = Math.round(S.heatV / 25); for (let i = 0; i < na + 1; i++) { const ax = cx - 80 + i * 40; D.arrow(ax, cY(34) - 2, ax, cY(31), { color: '#ffd24a', width: 3, head: 8, alpha: S.heatV > 0 ? 0.95 : 0.3 }); }
      pr = [cx, cY(30)];
      [0, 10, 20, 30, 40].forEach((d) => { ctx.strokeStyle = 'rgba(51,65,85,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.x + 6, cY(d)); ctx.lineTo(L.x + 60, cY(d)); ctx.stroke(); D.text(L.x + 8, cY(d) - 4, d + ' km', { size: 12.5, weight: 800, color: '#334155', align: 'left' }); });
      if (G.melt > 0) {
        emitMelt(pr[0], pr[1] - 10, 3 + G.melt * 1.6, dt, '#f6b79d', cx, cY(8));
        const bs = clamp(G.melt * 3 + 6, 8, 40); const gg = ctx.createRadialGradient(cx, cY(8), 2, cx, cY(8), bs); gg.addColorStop(0, 'rgba(246,183,157,.95)'); gg.addColorStop(1, 'rgba(246,183,157,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cY(8), bs, 0, TAU); ctx.fill();
      }
    }
    drawParcel(pr[0], pr[1], G.melt, t);
    ctx.restore();
    D.label(L.x + 12 + (S.place === 'crust' ? 70 : 60), L.y + 20 + 0, PLACE_NAME[S.place], { bg: '#334155', size: 13.5, align: 'left' });
    return pr;
  }
  function drawGenGraph(t, dt, G) {
    const R = GR; card(R, S.place === 'crust' ? '🌡️ 하부 지각 암석의 온도' : '📈 깊이-온도 그래프 (예시 값)');
    if (S.place === 'crust') {
      const bx = R.x + R.w * 0.22, by = R.y + 56, bh = R.h - 110, bw = 38, T0 = 600, T1 = 900, yT = (T) => by + bh - (bh * (T - T0)) / (T1 - T0);
      ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, bh, 19).fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(bx, by, bw, bh, 19).stroke();
      const Tn = clamp(G.T, T0, T1), fy = yT(Tn); ctx.fillStyle = mixc('#4aa8ff', '#e2464b', (Tn - T0) / (T1 - T0)); rr(bx + 5, fy, bw - 10, by + bh - fy, 14).fill();
      [600, 700, 750, 800, 900].forEach((T) => { ctx.strokeStyle = T === 750 ? '#7c3aed' : 'rgba(100,116,139,.6)'; ctx.lineWidth = T === 750 ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(bx + bw + 4, yT(T)); ctx.lineTo(bx + bw + (T === 750 ? 120 : 14), yT(T)); ctx.stroke(); D.text(bx - 8, yT(T) + 4.5, T + '', { size: 12.5, weight: 800, color: '#475569', align: 'right' }); });
      D.text(bx + bw + 10, yT(750) - 8, '용융 시작 750 °C', { size: 13.5, weight: 800, color: '#7c3aed', align: 'left' });
      D.text(bx + bw / 2, by - 10, '°C', { size: 13, weight: 800, color: '#64748b' });
      D.sphere(bx + bw / 2, fy, 9, G.melt > 0 ? '#ff5a2a' : '#4aa8ff', { gloss: true });
      D.label(bx + bw + 76, clamp(fy, by + 14, by + bh - 34), '지각 암석 ' + fx(G.T, 0) + ' °C', { bg: G.melt > 0 ? '#c2410c' : '#334155', size: 13.5 });
      drawWrap(R.x + R.w / 2, R.y + R.h - 40 * FS * 0.8, '깊이 30 km의 암석은 700 °C로 녹지 않아요. 마그마(1200 °C)가 열을 주면 온도가 올라가 750 °C를 넘을 때 녹아요.', R.w - 28, 13, { weight: 700, lh: 1.35, color: '#334155' });
      return;
    }
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(PL_.x, PL_.y, PL_.w, PL_.h);
    // 용융 영역 · 고체 영역
    const cur = S.place === 'arc' ? (d) => solid(d, S.waterV) : (d) => solid(d, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(PL_.x, PL_.y, PL_.w, PL_.h); ctx.clip();
    ctx.fillStyle = 'rgba(255,120,60,.13)'; ctx.beginPath(); ctx.moveTo(tX(cur(0)), dY(0)); for (let d = 0; d <= 150; d += 10) ctx.lineTo(tX(cur(d)), dY(d)); ctx.lineTo(PL_.x + PL_.w, dY(150)); ctx.lineTo(PL_.x + PL_.w, dY(0)); ctx.closePath(); ctx.fill();
    ctx.restore();
    [800, 1000, 1200, 1400, 1600].forEach((T) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tX(T), PL_.y); ctx.lineTo(tX(T), PL_.y + PL_.h); ctx.stroke(); D.text(tX(T), PL_.y + PL_.h + 17, String(T), { size: 12.5, weight: 700, color: '#64748b' }); });
    [0, 50, 100, 150].forEach((d) => { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(PL_.x, dY(d)); ctx.lineTo(PL_.x + PL_.w, dY(d)); ctx.stroke(); D.text(PL_.x - 6, dY(d) + 4.5, String(d), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(PL_.x + PL_.w / 2, PL_.y + PL_.h + 36, '온도 (°C)', { size: 13, weight: 800, color: '#475569' });
    D.text(PL_.x - 6, PL_.y - 8, '깊이 (km)', { size: 13, weight: 800, color: '#475569', align: 'right' });
    ctx.save(); ctx.beginPath(); ctx.rect(PL_.x, PL_.y, PL_.w, PL_.h); ctx.clip();
    const curve = (fn, col, w2, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w2; if (dash) ctx.setLineDash(dash); ctx.beginPath(); for (let d = 0; d <= 150; d += 5) (d ? ctx.lineTo(tX(fn(d)), dY(d)) : ctx.moveTo(tX(fn(d)), dY(d))); ctx.stroke(); ctx.setLineDash([]); };
    curve((d) => solid(d, 100), '#4a8fd6', 2, [6, 5]);
    curve((d) => solid(d, 0), S.place === 'arc' ? 'rgba(160,40,40,.45)' : '#b3261e', S.place === 'arc' ? 2 : 3.2);
    if (S.place === 'arc' && S.waterV > 0) curve((d) => solid(d, S.waterV), '#6d28d9', 3.4);
    if (S.place !== 'arc') curve(mantleT, '#ef7d1a', 3.2);
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(PL_.x, PL_.y, PL_.w, PL_.h);
    D.text(PL_.x + 6, PL_.y + 18, '고체', { size: 13.5, weight: 800, color: '#64748b', align: 'left' }); D.text(PL_.x + PL_.w - 6, PL_.y + 18, '일부 용융', { size: 13.5, weight: 800, color: '#c2410c', align: 'right' });
    D.text(tX(solid(140, 0)) + 6, dY(140) + 18, '마른 맨틀', { size: 12.5, weight: 800, color: '#b3261e', align: 'left' });
    D.text(tX(solid(125, 100)) - 6, dY(125), '물이 있을 때', { size: 12.5, weight: 800, color: '#2f6db5', align: 'right' });
    // 점
    const px = tX(G.T), py = dY(G.d);
    if (G.melt > 0 && !RM) D.ring(px, py, 12, t, { color: '#e2464b' });
    D.sphere(px, py, 8, G.melt > 0 ? '#ff5a2a' : '#4a7bd6', { gloss: true });
    D.label(clamp(px, PL_.x + 70, PL_.x + PL_.w - 70), clamp(py - 24, PL_.y + 12, PL_.y + PL_.h - 12), '지금 ' + fx(G.T, 0) + ' °C', { bg: G.melt > 0 ? '#c2410c' : '#334155', size: 13 });
  }
  function drawGen(t, dt) {
    S.depthV = approach(S.depthV, S.depth, dt, 9); S.waterV = approach(S.waterV, S.water, dt, 9); S.heatV = approach(S.heatV, S.heat, dt, 9);
    if (Math.abs(S.depthV - S.depth) < 0.05) S.depthV = S.depth; if (Math.abs(S.waterV - S.water) < 0.05) S.waterV = S.water; if (Math.abs(S.heatV - S.heat) < 0.05) S.heatV = S.heat;
    const G = genState(); S.meltV = approach(S.meltV, G.melt, dt, 8);
    drawGenScene(t, dt, G); drawGenGraph(t, dt, G);
    // 정보 판
    card(GI);
    const p = S.place, y = GI.y + 26 * FS;
    let l1, l2, l3;
    if (p === 'ridge' || p === 'hot') { l1 = '맨틀 물질이 깊이 ' + fx(G.d, 0) + ' km까지 올라왔어요. 올라와도 온도는 거의 그대로(' + fx(G.T, 0) + ' °C)지만, 압력이 줄어 녹기 시작하는 온도가 ' + fx(G.Ts, 0) + ' °C로 낮아져요.'; l2 = G.melt > 0 ? '현재 온도가 녹기 시작하는 온도보다 높아서 일부 녹아요 (약 ' + fx(G.melt, 1) + ' %). → 압력 감소 용융 · 현무암질 마그마' : '현재 온도가 녹기 시작하는 온도보다 낮아서 고체예요. 위로 더 올려 보세요.'; }
    else if (p === 'arc') { l1 = '맨틀 쐐기(깊이 100 km)의 온도는 ' + WEDGE.T + ' °C예요. 물이 ' + fx(G.w, 0) + ' % 더해지면 녹기 시작하는 온도가 ' + fx(G.Ts, 0) + ' °C로 낮아져요.'; l2 = G.melt > 0 ? '쐐기의 온도가 녹기 시작하는 온도보다 높아서 일부 녹아요 (약 ' + fx(G.melt, 1) + ' %). → 물 첨가 용융 · 현무암질~안산암질 마그마' : '물이 적어서 아직 녹는 온도(' + fx(G.Ts, 0) + ' °C)가 ' + WEDGE.T + ' °C보다 높아요. 물의 양을 늘려 보세요.'; }
    else { l1 = '하부 지각(깊이 30 km)의 온도는 ' + fx(G.T, 0) + ' °C예요. 지각 암석이 녹기 시작하는 온도는 ' + CRUST.Tm + ' °C(예시)예요.'; l2 = G.melt > 0 ? '마그마의 열을 받아 암석이 일부 녹아요 (약 ' + fx(G.melt, 1) + ' %). → 열 공급 용융 · 화강암질(유문암질) 마그마' : '아직 ' + CRUST.Tm + ' °C보다 낮아서 녹지 않아요. 열을 더 공급해 보세요.'; }
    D.text(GI.x + 14, GI.y + 8 + 15 * FS, PLACE_NAME[p] + ' 에서', { size: 15, weight: 800, color: '#334155', align: 'left' });
    let yy = drawWrap(GI.x + 16, y + 14 * FS, l1, GI.w - 32, PHONE ? 12.5 : 13.5, { align: 'left', weight: 700, lh: 1.3, color: '#334155' });
    yy = drawWrap(GI.x + 16, yy + (PHONE ? 26 : 24), l2, GI.w - 32, PHONE ? 12.5 : 13.5, { align: 'left', weight: 800, lh: 1.3, color: G.melt > 0 ? '#c2410c' : '#64748b' });
  }

  /* ======================================================
     장면 2: 마그마의 종류와 용암의 흐름
     ====================================================== */
  const VS = PHONE ? { x: 8, y: 8, w: 584, h: 380 } : { x: 10, y: 10, w: 556, h: 396 };
  const VI = PHONE ? { x: 8, y: 396, w: 584, h: 268 } : { x: 574, y: 10, w: 216, h: 396 };
  const VB = PHONE ? { x: 8, y: 672, w: 584, h: 200 } : { x: 10, y: 414, w: 780, h: 136 };
  const SLOPE = 20 * Math.PI / 180, VENT = { x: VS.x + 84, y: VS.y + (PHONE ? 150 : 128) };
  const slPt = (s) => [VENT.x + Math.cos(SLOPE) * s, VENT.y + Math.sin(SLOPE) * s];
  const TAU_F = 2.3;
  function gauge(x, y, w, label, val01, txt, col, ticks) {
    D.text(x, y, label, { size: 13.5, weight: 800, color: '#475569', align: 'left' });
    D.text(x + w, y, txt, { size: 14, weight: 800, color: '#1b2333', align: 'right' });
    ctx.fillStyle = '#e5ebf2'; rr(x, y + 7, w, 12, 6).fill();
    ctx.fillStyle = col; rr(x, y + 7, Math.max(0.1, w * clamp(val01, 0, 1)), 12, 6).fill();
    (ticks || []).forEach((tk) => { ctx.fillStyle = '#334155'; ctx.fillRect(x + w * tk - 1, y + 4, 2, 18); });
  }
  function drawVisc(t, dt) {
    S.sioV = approach(S.sioV, S.sio, dt, 6); if (Math.abs(S.sioV - S.sio) < 0.02) S.sioV = S.sio;
    const s = S.sioV, T = lerpA(TSIO, s), lv = lerpA(LVIS, s), mt = magType(s), mx = flowMax(s);
    S.flowT += dt; if (S.flowT > 9.5) S.flowT = 0;
    const front = mx * (1 - Math.exp(-S.flowT / TAU_F)); S.flowSeen = Math.max(S.flowSeen, S.flowT);
    card(VS);
    ctx.save(); rr(VS.x, VS.y, VS.w, VS.h, 14).clip();
    const sky = ctx.createLinearGradient(0, VS.y, 0, VS.y + VS.h); sky.addColorStop(0, '#cfe6f6'); sky.addColorStop(1, '#eaf3f9'); ctx.fillStyle = sky; ctx.fillRect(VS.x, VS.y, VS.w, VS.h);
    // 경사면
    const e = slPt(520); ctx.fillStyle = '#9b8f7d'; ctx.beginPath(); ctx.moveTo(VS.x, VENT.y - 18); ctx.lineTo(VENT.x - 30, VENT.y - 18); ctx.lineTo(VENT.x, VENT.y); ctx.lineTo(e[0], e[1]); ctx.lineTo(VS.x + VS.w, e[1] + 20); ctx.lineTo(VS.x + VS.w, VS.y + VS.h); ctx.lineTo(VS.x, VS.y + VS.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.07)'; for (let i = 0; i < 60; i++) { const r = seeded(i + 2); const px = VS.x + r() * VS.w, py = VENT.y + 40 + r() * (VS.h - 120); ctx.fillRect(px, py, 3 + r() * 6, 2); }
    // 분화구
    ctx.fillStyle = '#6f6557'; ctx.beginPath(); ctx.moveTo(VENT.x - 36, VENT.y - 18); ctx.lineTo(VENT.x - 14, VENT.y - 26); ctx.lineTo(VENT.x + 6, VENT.y - 8); ctx.lineTo(VENT.x, VENT.y); ctx.lineTo(VENT.x - 30, VENT.y - 18); ctx.fill();
    // 용암
    const hot = mixc('#c4361b', '#ffc04a', clamp((T - 650) / 550, 0, 1)), cold = rockColor(s), th = 7 + 3.4 * lv;
    if (front > 1) {
      const N = 34, top = [], bot = [];
      for (let k = 0; k <= N; k++) { const ss = (front * k) / N, p = slPt(ss), nx = Math.sin(SLOPE), ny = -Math.cos(SLOPE), hh = th * (0.45 + 0.55 * Math.sqrt(Math.max(0, 1 - ss / (front + 1)))) * (k === N ? 0.2 : 1) * Math.min(1, ss / 12 + 0.5); top.push([p[0] + nx * hh * 0, p[1] + ny * hh]); bot.push([p[0], p[1]]); }
      const g = ctx.createLinearGradient(slPt(0)[0], slPt(0)[1], slPt(front)[0], slPt(front)[1]); g.addColorStop(0, hot); g.addColorStop(clamp(0.9 - lv * 0.06, 0.3, 0.9), mixc(hot, cold, 0.5)); g.addColorStop(1, cold);
      ctx.fillStyle = g; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let k = N; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      // 흐름 방향 표시
      const a0 = slPt(Math.min(front * 0.4, 120)), a1 = slPt(Math.min(front * 0.4, 120) + 40); D.arrow(a0[0], a0[1] - th - 10, a1[0], a1[1] - th - 10, { color: '#7c2d12', width: 3, head: 9 });
      const fp = slPt(front); D.label(fp[0], fp[1] + 24, '흐른 거리 ' + Math.round(front) + ' (상대값)', { bg: '#7c2d12', size: 13 });
    }
    // 기준 눈금: 완전히 흐른 거리(현무암질·안산암질·유문암질)
    [[48, '현무암질'], [58, '안산암질'], [68, '유문암질']].forEach((r, i) => { const p = slPt(flowMax(r[0])); ctx.strokeStyle = 'rgba(51,65,85,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(p[0], p[1] + 2); ctx.lineTo(p[0], p[1] + 24 + i * 0); ctx.stroke(); ctx.setLineDash([]); D.text(p[0], p[1] + 40 + (i % 2) * 18, r[1], { size: 12.5, weight: 800, color: '#475569' }); });
    // 분화: 가스와 폭발성
    const ex = clamp(lv / 4.6, 0, 1);
    if (!RM) {
      const rate = 26 + (1 - ex) * 22, n = Math.floor(rate * dt + Math.random());
      for (let i = 0; i < n; i++) {
        if (ex < 0.3) parts.emit({ x: VENT.x - 14 + Math.random() * 8, y: VENT.y - 20, vx: -20 + Math.random() * 60, vy: -80 - Math.random() * 60, life: 0.9, size: 3 + Math.random() * 3, color: hot, gravity: 340, shape: 'circle', fade: true });
        else if (ex < 0.7) { parts.emit({ x: VENT.x - 14, y: VENT.y - 22, vx: -10 + Math.random() * 40, vy: -110 - Math.random() * 40, life: 1.2, size: 3 + Math.random() * 3, color: hot, gravity: 280, shape: 'circle', fade: true }); if (Math.random() < 0.5) parts.emit({ x: VENT.x - 14, y: VENT.y - 30, vx: Math.random() * 30, vy: -60, life: 1.6, size: 8 + Math.random() * 8, color: 'rgba(110,100,95,.5)', shape: 'smoke', fade: true, grow: 12 }); }
        else { if (Math.random() < 0.8) parts.emit({ x: VENT.x - 14 + (Math.random() - 0.5) * 16, y: VENT.y - 30, vx: (Math.random() - 0.5) * 50, vy: -95 - Math.random() * 45, life: 1.9, size: 10 + Math.random() * 10, color: 'rgba(70,62,60,.6)', shape: 'smoke', fade: true, grow: 18 }); if (Math.random() < 0.3) parts.emit({ x: VENT.x - 14, y: VENT.y - 24, vx: -40 + Math.random() * 120, vy: -150 - Math.random() * 60, life: 1.3, size: 3 + Math.random() * 3, color: '#ff8a3c', gravity: 420, shape: 'circle', fade: true }); }
      }
    }
    ctx.restore();
    D.label(VS.x + 12 + 30, VS.y + 20, '같은 경사면에 흘려 비교해요 (경사 20°)', { bg: '#334155', size: 13, align: 'left' });
    // 정보 판
    card(VI, '🧪 마그마 성질');
    const gx = VI.x + 14, gw = VI.w - 28;
    let gy = VI.y + 62 * (PHONE ? 0.85 : 1);
    const colsPerRow = PHONE ? 2 : 1, rowH = PHONE ? 76 : 58, gw2 = PHONE ? (VI.w - 56) / 2 : gw;
    const gs = [
      ['SiO₂ 함량', clamp((s - 45) / 25, 0, 1), fx(s, 0) + ' %', mt.k === 'b' ? '#3b4252' : mt.k === 'i' ? '#8a8780' : '#d9a893', [(52 - 45) / 25, (63 - 45) / 25]],
      ['온도', clamp((T - 600) / 650, 0, 1), fx(T, 0) + ' °C', '#e0742f'],
      ['점성 (염기성 = 1)', clamp(lv / 4.6, 0, 1), '약 ' + fmtV(viscRel(s)) + '배', '#7c3aed'],
      ['폭발성 (가스 갇힘)', ex, ex < 0.3 ? '약함' : ex < 0.7 ? '보통' : '강함', '#e2464b'],
    ];
    gs.forEach((g, i) => { const cx2 = gx + (i % colsPerRow) * (gw2 + 28 * (PHONE ? 1 : 0)), cy2 = gy + Math.floor(i / colsPerRow) * rowH; gauge(cx2, cy2, gw2, g[0], g[1], g[2], g[3], g[4]); });
    const yb = PHONE ? gy + 2 * rowH + 4 : gy + 4 * rowH + 6;
    D.label(VI.x + 16, yb + 8, mt.n + ' · ' + mt.rock, { bg: '#334155', size: 13.5, align: 'left', pad: 7 });
    ctx.fillStyle = rockColor(s); rr(VI.x + 16, yb + 30, 54, 28, 8).fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; rr(VI.x + 16, yb + 30, 54, 28, 8).stroke();
    D.text(VI.x + 78, yb + 50, '암석 색 · 화산: ' + mt.vol, { size: 13, weight: 800, color: '#334155', align: 'left' });
    // 아래 표
    card(VB);
    const cols = [['b', '염기성', '45~52 %', '1000~1200 °C', '점성 작음 · 잘 흘러요', '어두운색 · 순상 화산'], ['i', '중성', '52~63 %', '800~1000 °C', '점성 중간', '중간색 · 성층 화산'], ['a', '산성', '63 % 초과', '650~800 °C', '점성 큼 · 폭발적', '밝은색 · 용암 돔']];
    const cw3 = (VB.w - 28) / 3;
    cols.forEach((c, i) => {
      const x = VB.x + 14 + i * cw3, cur = c[0] === mt.k;
      ctx.fillStyle = cur ? 'rgba(124,58,237,.10)' : 'rgba(100,116,139,.06)'; rr(x, VB.y + 12, cw3 - 8, VB.h - 24, 10).fill(); if (cur) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; rr(x, VB.y + 12, cw3 - 8, VB.h - 24, 10).stroke(); }
      D.text(x + 12, VB.y + 36, c[1] + ' (SiO₂ ' + c[2] + ')', { size: PHONE ? 13 : 14, weight: 800, color: '#1b2333', align: 'left' });
      [c[3], c[4], c[5]].forEach((tx, k) => D.text(x + 12, VB.y + 62 + k * (PHONE ? 26 : 24), tx, { size: PHONE ? 12.5 : 13.5, weight: 700, color: '#475569', align: 'left' }));
    });
  }

  /* ======================================================
     장면 3: 마그마의 분화 (보웬 반응 계열)
     ====================================================== */
  const TKC = PHONE ? { x: 8, y: 8, w: 584, h: 300 } : { x: 10, y: 10, w: 262, h: 540 };
  const TNK = PHONE ? { x: 46, y: 84, w: 210, h: 204 } : { x: 56, y: 84, w: 170, h: 400 };
  const BWC = PHONE ? { x: 8, y: 316, w: 584, h: 424 } : { x: 280, y: 10, w: 510, h: 410 };
  const BIC = PHONE ? { x: 8, y: 748, w: 584, h: 124 } : { x: 280, y: 428, w: 510, h: 122 };
  const PILE_ORDER = ['ol', 'px', 'pl', 'am', 'bi'];
  const PILE_COL = { ol: MIN.ol.col, px: MIN.px.col, pl: '#e2dfd5', am: MIN.am.col, bi: MIN.bi.col };
  const PILE_NAME = { ol: '감람석', px: '휘석', pl: '사장석', am: '각섬석', bi: '흑운모' };
  const meltCol = (T) => mixc('#b4281a', '#ffb347', clamp((T - 700) / 600, 0, 1));
  let prevR = 0;
  const activeMin = (T) => WIN.filter((w) => T < w.a && T > w.b).map((w) => MIN[w.id].n);
  function drawBowen(t, dt) {
    if (S.playing) { S.tc = Math.max(700, S.tc - 52 * dt); setSlider($('#sCool'), $('#oCool'), Math.round(1300 - S.tc), (v) => Math.round(1300 - v) + ' °C'); if (S.tc <= 700) S.playing = false; }
    S.tv = approach(S.tv, S.tc, dt, 6);
    const T = S.tv, B = bowenAt(T), tk = TNK;
    // 탱크
    card(TKC, '🌋 마그마 방 (모식도)');
    D.text(tk.x + tk.w / 2, tk.y - 18, fx(T, 0) + ' °C', { size: 22, weight: 800, color: '#1b2333' });
    ctx.fillStyle = '#7c7568'; rr(tk.x - 14, tk.y - 10, tk.w + 28, tk.h + 24, 18).fill();
    ctx.save(); rr(tk.x, tk.y, tk.w, tk.h, 10).clip();
    ctx.fillStyle = meltCol(T); ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
    const g = ctx.createLinearGradient(tk.x, 0, tk.x + tk.w, 0); g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
    // 거품·빛
    if (B.melt > 5) { ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 14; i++) { const r = seeded(i + 11), yy = tk.y + (tk.h * (100 - B.R - B.solidInPlace) / 100) * r(); ctx.beginPath(); ctx.arc(tk.x + 10 + r() * (tk.w - 20), tk.y + ((yy - tk.y + t * 8 * (0.5 + r())) % Math.max(10, tk.h * B.melt / 100)), 2 + r() * 3, 0, TAU); ctx.fill(); } }
    // 쌓인 결정(아래) 순서대로
    let yb = tk.y + tk.h; const yTop = {};
    PILE_ORDER.forEach((id) => { const h = (tk.h * B.part[id]) / 100; if (h <= 0.05) return; ctx.fillStyle = PILE_COL[id]; ctx.fillRect(tk.x, yb - h, tk.w, h + 0.5); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tk.x, yb - h); ctx.lineTo(tk.x + tk.w, yb - h); ctx.stroke(); const r = seeded(id.charCodeAt(0)); ctx.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < Math.round(h / 3); i++) ctx.fillRect(tk.x + r() * tk.w, yb - h + r() * h, 3, 3); if (h > 16) D.text(tk.x + tk.w / 2, yb - h / 2 + 5, PILE_NAME[id], { size: 13, weight: 800, color: id === 'pl' ? '#1b2333' : '#fff' }); yb -= h; });
    const pileTop = yb;
    // 제자리에서 굳은 부분
    const hs = (tk.h * B.solidInPlace) / 100;
    if (hs > 0.5) { ctx.fillStyle = '#d9b8aa'; ctx.fillRect(tk.x, pileTop - hs, tk.w, hs); const r = seeded(99); for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#e8b5a4', '#c3ccd6', '#e6dca6', '#f1ece6'][i % 4]; ctx.fillRect(tk.x + r() * tk.w, pileTop - hs + r() * hs, 4 + r() * 5, 3 + r() * 4); } if (hs > 16) D.text(tk.x + tk.w / 2, pileTop - hs / 2 + 5, '정장석·석영·백운모', { size: 12.5, weight: 800, color: '#4b2a1c' }); }
    // 떨어지는 결정
    const dR = Math.abs(B.R - prevR); prevR = B.R;
    if (!RM && S.crystals.length < 70) { const act = STG.filter((s) => T <= s.a && T > s.b); const n = Math.floor(dR * 5 + Math.random() * (dR > 0.01 ? 1.2 : 0)); for (let i = 0; i < n && act.length; i++) { const a = act[Math.floor(Math.random() * act.length)]; S.crystals.push({ id: a.id, x: tk.x + 8 + Math.random() * (tk.w - 16), y: tk.y + 4 + Math.random() * Math.max(8, tk.h * B.melt / 100 * 0.6), vy: 50 + Math.random() * 30, rot: Math.random() * 6 }); } }
    for (let i = S.crystals.length - 1; i >= 0; i--) { const c = S.crystals[i]; c.y += c.vy * dt; c.rot += dt * 2; const top = pileTop - hs; if (c.y > top - 4) { S.crystals.splice(i, 1); continue; } ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = PILE_COL[c.id] || '#ddd'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(4, -4); ctx.lineTo(5, 3); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    ctx.strokeStyle = '#5f594e'; ctx.lineWidth = 4; rr(tk.x, tk.y, tk.w, tk.h, 10).stroke();
    if (B.melt > 12) D.text(tk.x + tk.w / 2, tk.y + 8 + (tk.h * Math.max(0, B.melt - 100 + 100) / 100) * 0 + 24, '남은 마그마 ' + fx(B.melt, 0) + ' %', { size: 14.5, weight: 800, color: '#fff', stroke: 'rgba(90,20,0,.55)', strokeWidth: 4 });
    // 오른쪽(휴대폰) 수치
    if (PHONE) { const mt = magType(B.sio); D.text(TKC.x + 300, 90, '남은 마그마의 SiO₂', { size: 14, weight: 800, color: '#475569', align: 'left' }); D.text(TKC.x + 300, 138, fx(B.sio, 1) + ' %', { size: 36, weight: 800, color: '#1b2333', align: 'left' }); D.label(TKC.x + 304, 168, mt.n, { bg: '#334155', size: 14, align: 'left' }); gauge(TKC.x + 300, 200, 270, '남은 마그마의 양', B.M / 100 * (1 - 0) , fx(B.melt, 0) + ' %', '#e0742f'); }
    else {
      const mt = magType(B.sio);
      D.text(TKC.x + TKC.w / 2, TKC.y + TKC.h - 18, '※ 분리된 결정은 아래에 쌓여요', { size: 12.5, weight: 700, color: '#64748b' });
    }
    // 보웬 도표
    const R = BWC; card(R, '📊 보웬 반응 계열 (정출 온도는 예시 값)');
    const x0 = R.x + (PHONE ? 70 : 66), y0 = R.y + 66, y1 = R.y + R.h - 28, yT = (Tt) => y0 + ((y1 - y0) * (1300 - Tt)) / 600;
    for (let Tt = 1300; Tt >= 700; Tt -= 100) { ctx.strokeStyle = 'rgba(100,116,139,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 - 8, yT(Tt)); ctx.lineTo(R.x + R.w - 12, yT(Tt)); ctx.stroke(); D.text(x0 - 12, yT(Tt) + 4.5, String(Tt), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); }
    D.text(R.x + 14, y0 - 12, '°C', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    const cwid = (R.w - (PHONE ? 70 : 66) - 24 - 40) / 2, colX = [x0 + 6, x0 + 6 + cwid + 28, 0];
    D.text(colX[0] + cwid * 0.5, R.y + 52, '불연속 계열', { size: 13.5, weight: 800, color: '#475569' }); D.text(colX[1] + cwid * 0.5, R.y + 52, '연속 계열', { size: 13.5, weight: 800, color: '#475569' });
    WIN.forEach((w) => {
      const m = MIN[w.id], late = w.col >= 2;
      let bx, bw;
      if (!late) { bx = colX[w.col]; bw = cwid; } else { const k = w.col - 2, lw = (R.w - 100) / 3 - 6; bx = x0 + 6 + k * (lw + 8) + (PHONE ? 0 : 0); bw = lw; }
      const ty = yT(w.a), by = yT(w.b) - 2, bh = Math.max(24, by - ty), fr = clamp((w.a - T) / (w.a - w.b), 0, 1), act = fr > 0 && fr < 1;
      const yy = late ? yT(750) + 14 : ty;
      D.shadow(() => { ctx.fillStyle = '#eef2f7'; rr(bx, yy, bw, late ? 40 : bh, 8).fill(); }, { blur: act ? 8 : 2, y: 1 });
      ctx.save(); rr(bx, yy, bw, late ? 40 : bh, 8).clip(); ctx.fillStyle = m.col; ctx.fillRect(bx, yy, bw, (late ? 40 : bh) * fr); ctx.restore();
      ctx.strokeStyle = act ? '#e2464b' : 'rgba(51,65,85,.5)'; ctx.lineWidth = act ? 3 : 1.4; rr(bx, yy, bw, late ? 40 : bh, 8).stroke();
      D.text(bx + bw / 2, yy + (late ? 25 : Math.min(bh / 2 + 5, 22)), m.n, { size: 14, weight: 800, color: '#1b2333', stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
    });
    // 화살표(계열)
    [0, 1].forEach((c) => { const xx = colX[c] + cwid / 2; ctx.strokeStyle = 'rgba(71,85,105,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xx, y0 - 8); ctx.lineTo(xx, y0 - 2); ctx.stroke(); });
    D.text(colX[1] + cwid * 0.5 + cwid * 0.75, yT(1040), '→', { size: 20, weight: 800, color: 'rgba(71,85,105,.0)' });
    // 온도 커서
    const cy = yT(clamp(T, 700, 1300)); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.6; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(x0 - 6, cy); ctx.lineTo(R.x + R.w - 10, cy); ctx.stroke(); ctx.setLineDash([]);
    D.label(R.x + R.w - 56, clamp(cy - 14, y0 + 10, y1 - 8), fx(T, 0) + ' °C', { bg: '#e2464b', size: 13 });
    // 정보 판
    card(BIC);
    const mt = magType(B.sio), act = activeMin(T);
    D.text(BIC.x + 14, BIC.y + 8 + 15 * FS, fx(T, 0) + ' °C 에서', { size: 15, weight: 800, color: '#334155', align: 'left' });
    let yy = drawWrap(BIC.x + 16, BIC.y + 46 * FS, '정출 중인 광물: ' + (act.length ? act.join(' · ') : T >= 1300 ? '아직 없음(모두 녹아 있어요)' : '모두 정출했어요') + '  /  분리된 결정 ' + fx(B.R, 0) + ' %  /  남은 마그마 ' + fx(B.melt, 0) + ' %' + (B.solidInPlace > 0.5 ? ' (제자리에서 굳는 중 ' + fx(B.solidInPlace, 0) + ' %)' : ''), BIC.w - 32, PHONE ? 12.5 : 13.5, { align: 'left', weight: 700, lh: 1.3, color: '#334155' });
    drawWrap(BIC.x + 16, yy + (PHONE ? 28 : 26), '남은 마그마의 SiO₂ 함량: ' + fx(B.sio, 1) + ' % (' + mt.n + ' · ' + mt.rock + ')', BIC.w - 32, PHONE ? 13 : 14, { align: 'left', weight: 800, color: '#7c2d12' });
  }

  /* ======================================================
     장면 4: 화성암 분류표
     ====================================================== */
  const TEX = {};
  function texCanvas(kind) {
    if (TEX[kind]) return TEX[kind];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = seeded(kind.length * 977 + kind.charCodeAt(0) * 31);
    const poly = (x, y, rad, col) => { g.fillStyle = col; g.beginPath(); const n = 5 + Math.floor(r() * 3), a0 = r() * 6; for (let k = 0; k < n; k++) { const a = a0 + (k / n) * TAU, rr2 = rad * (0.75 + r() * 0.4); k ? g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : g.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.8; g.stroke(); };
    const speck = (n, cols, s0, s1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; const s = s0 + r() * (s1 - s0); g.fillRect(r() * 128, r() * 128, s, s); } };
    const coarse = (base, pal, n, r0, r1) => { g.fillStyle = base; g.fillRect(0, 0, 128, 128); for (let i = 0; i < n; i++) poly(r() * 128, r() * 128, r0 + r() * (r1 - r0), pal[Math.floor(r() * pal.length)]); };
    if (kind === 'basalt') { g.fillStyle = '#383840'; g.fillRect(0, 0, 128, 128); speck(420, ['#4d4d57', '#2a2a30', '#5c5c66', '#3d3d45'], 1, 2.6); for (let i = 0; i < 12; i++) { const x = r() * 128, y = r() * 128, rx = 3 + r() * 5, ry = 2 + r() * 4; g.fillStyle = '#17171b'; g.beginPath(); g.ellipse(x, y, rx, ry, r() * 3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 0.6, rx, ry, 0, 0.2, 2.9); g.stroke(); } }
    else if (kind === 'andesite') { g.fillStyle = '#7b7975'; g.fillRect(0, 0, 128, 128); speck(520, ['#8f8d89', '#6a6865', '#9a9893', '#5d5b58'], 1, 2.6); for (let i = 0; i < 14; i++) { g.fillStyle = '#e7e4dc'; const s = 3 + r() * 3; g.save(); g.translate(r() * 128, r() * 128); g.rotate(r() * 3); g.fillRect(-s, -s / 2, s * 2, s); g.restore(); } for (let i = 0; i < 8; i++) { g.fillStyle = '#2a2d2c'; g.fillRect(r() * 128, r() * 128, 2 + r() * 3, 2 + r() * 2); } }
    else if (kind === 'rhyolite') { g.fillStyle = '#d9bbab'; g.fillRect(0, 0, 128, 128); speck(420, ['#e6cfc2', '#c9a595', '#ecd9ce', '#bf9a8a'], 1, 2.4); g.strokeStyle = 'rgba(160,120,105,.45)'; g.lineWidth = 1.2; for (let k = 0; k < 7; k++) { g.beginPath(); for (let x = 0; x <= 128; x += 8) { const y = 10 + k * 18 + Math.sin(x * 0.09 + k) * 4; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } for (let i = 0; i < 6; i++) { g.fillStyle = '#c9ced6'; g.fillRect(r() * 128, r() * 128, 2.5, 2.5); } }
    else if (kind === 'gabbro') coarse('#2c332c', ['#2c352c', '#3b4a3b', '#1f2125', '#2a2d2a', '#8d908a', '#a3a69f'], 150, 8, 14);
    else if (kind === 'diorite') coarse('#c9c7c1', ['#e9e7e2', '#e9e7e2', '#1f2125', '#3d4a3d', '#8d8f8a', '#d8d6d0'], 150, 8, 14);
    else coarse('#e7b9a8', ['#e7b9a8', '#e0a794', '#f1ede7', '#f1ede7', '#b7c0c9', '#b7c0c9', '#27272b'], 150, 8, 14);
    TEX[kind] = c; return c;
  }
  const TBL = PHONE ? { x: 8, y: 8, w: 584, h: 300 } : { x: 10, y: 10, w: 500, h: 394 };
  const CDM = PHONE ? { x: 8, y: 452, w: 584, h: 132 } : { x: 520, y: 10, w: 270, h: 196 };
  const SMP = PHONE ? { x: 8, y: 316, w: 584, h: 128 } : { x: 520, y: 214, w: 270, h: 190 };
  const TRY = PHONE ? { x: 8, y: 592, w: 584, h: 280 } : { x: 10, y: 412, w: 780, h: 138 };
  const CARD = PHONE ? { w: 140, h: 104 } : { w: 112, h: 96 };
  const COLW = (TBL.w - (PHONE ? 120 : 100) - 16) / 3, HDR = PHONE ? 58 : 62, ROWH = (TBL.h - HDR - 14) / 2;
  const cellRect = (row, col) => ({ x: TBL.x + (PHONE ? 120 : 100) + 8 + col * COLW, y: TBL.y + HDR + 6 + row * ROWH, w: COLW - 6, h: ROWH - 6 });
  const SIOI = { b: 0, i: 1, a: 2 };
  const trayHome = (k) => (PHONE ? { x: TRY.x + 16 + (k % 3) * 188, y: TRY.y + 52 + Math.floor(k / 3) * 120 } : { x: TRY.x + 18 + k * 128, y: TRY.y + 30 });
  const TRAY_ORD = ['granite', 'basalt', 'diorite', 'rhyolite', 'gabbro', 'andesite'];
  function initCards() { S.cardObjs = TRAY_ORD.map((id, k) => { const h = trayHome(k); return { id, k, x: h.x, y: h.y, cell: null, lift: 0, pop: 0 }; }); S.dragCard = null; S.bad = []; }
  function drawRockCard(c, x, y, lift) {
    const w = CARD.w, h = CARD.h, R = ROCK[c.id], bad = S.bad.includes(c.id);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); const sc = 1 + lift * 0.08 + c.pop * 0.06; ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 10).fill(); }, { blur: 4 + lift * 10, y: 2 + lift * 6 });
    ctx.save(); rr(x + 4, y + 4, w - 8, h - 34, 7).clip(); ctx.drawImage(texCanvas(R.kind), x + 4, y + 4, w - 8, h - 34); ctx.restore();
    ctx.strokeStyle = bad ? '#e2464b' : 'rgba(0,0,0,.2)'; ctx.lineWidth = bad ? 3.5 : 1.2; rr(x, y, w, h, 10).stroke();
    D.text(x + w / 2, y + h - 11, R.n, { size: 15, weight: 800, color: '#1b2333' });
    ctx.restore();
  }
  function drawClass(t, dt) {
    // 표
    card(TBL);
    const cols = [['염기성', 'SiO₂ 45~52 %', '#3b4252'], ['중성', 'SiO₂ 52~63 %', '#8a8780'], ['산성', 'SiO₂ 63 % 초과', '#d9a893']];
    cols.forEach((c, i) => { const r0 = cellRect(0, i); ctx.fillStyle = c[2]; rr(r0.x, TBL.y + 8, r0.w, HDR - 8, 8).fill(); D.text(r0.x + r0.w / 2, TBL.y + 28, c[0], { size: 15, weight: 800, color: i === 2 ? '#3a2018' : '#fff' }); D.text(r0.x + r0.w / 2, TBL.y + 28 + 18, c[1], { size: 12.5, weight: 700, color: i === 2 ? '#3a2018' : 'rgba(255,255,255,.9)' }); });
    [['화산암', PHONE ? '지표 부근에서 빨리 식음' : '지표 부근에서 빨리 식음', '세립질'], ['심성암', PHONE ? '땅속에서 천천히 식음' : '땅속 깊은 곳에서 천천히 식음', '조립질']].forEach((r, i) => {
      const c0 = cellRect(i, 0), x = TBL.x + 8, w = (PHONE ? 112 : 92);
      ctx.fillStyle = i === 0 ? '#fde7d4' : '#dbe8f7'; rr(x, c0.y, w, c0.h, 8).fill(); D.text(x + w / 2, c0.y + 26, r[0], { size: 15, weight: 800, color: '#1b2333' }); drawWrap(x + w / 2, c0.y + 50, r[1], w - 12, 12.5, { weight: 700, color: '#475569', lh: 1.25 }); D.text(x + w / 2, c0.y + c0.h - 14, r[2], { size: 13, weight: 800, color: '#7c2d12' });
    });
    CELLS.forEach((cl) => { const R = cellRect(cl.row === 'v' ? 0 : 1, SIOI[cl.col]); const occ = S.cardObjs.find((c) => c.cell === cl.id); ctx.setLineDash([6, 4]); ctx.strokeStyle = occ ? 'rgba(20,160,88,.0)' : 'rgba(100,116,139,.6)'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 10).stroke(); ctx.setLineDash([]); if (!occ) { ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(R.x, R.y, R.w, R.h, 10).fill(); } if (S.dragCard && !occ) { const dc = S.dragCard; if (dc.px >= R.x && dc.px <= R.x + R.w && dc.py >= R.y && dc.py <= R.y + R.h) { ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 3; rr(R.x, R.y, R.w, R.h, 10).stroke(); } } });
    // 냉각 속도 데모
    card(CDM, '🧊 식는 속도와 결정 크기');
    const dw = PHONE ? (CDM.w - 44) / 2 : (CDM.w - 36) / 2, dh = PHONE ? 62 : 104, dy = CDM.y + (PHONE ? 46 : 50);
    [[0, '지표 부근 · 빨리 식음', 11, 1.4], [1, '땅속 · 천천히 식음', 46, 6]].forEach((pn) => {
      const x = CDM.x + 14 + pn[0] * (dw + 8), sp = pn[2], dur = pn[3], pr = RM ? 1 : sm01(((t % (dur + 2.5)) / dur));
      ctx.save(); rr(x, dy, dw, dh, 8).clip(); ctx.fillStyle = pn[0] === 0 ? '#ffd9b4' : '#ffc9a0'; ctx.fillRect(x, dy, dw, dh);
      const rows = Math.ceil(dh / (sp * 0.87)) + 1, cols2 = Math.ceil(dw / sp) + 1, rs = seeded(pn[0] + 5);
      for (let ry = 0; ry < rows; ry++) for (let cx2 = 0; cx2 < cols2; cx2++) { const gx = x + cx2 * sp + (ry % 2 ? sp / 2 : 0) + (rs() - 0.5) * sp * 0.25, gy = dy + ry * sp * 0.87 + (rs() - 0.5) * sp * 0.2, rad = (sp * 0.58) * pr; if (rad < 0.8) continue; ctx.fillStyle = ['#7e8a96', '#b9a79b', '#e9e1d6'][(cx2 + ry) % 3]; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; k ? ctx.lineTo(gx + Math.cos(a) * rad, gy + Math.sin(a) * rad) : ctx.moveTo(gx + Math.cos(a) * rad, gy + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(x, dy, dw, dh, 8).stroke();
      D.text(x + dw / 2, dy + dh + 17 * (PHONE ? 1 : 1), pn[1], { size: PHONE ? 12.5 : 12.5, weight: 800, color: '#334155' });
    });
    // 시료
    card(SMP, '🔍 시료 (확대한 모습)');
    const sr = PHONE ? 28 : 36, gap2 = (SMP.w - 28) / 3;
    SAMPLES.forEach((sm, i) => { const cx2 = SMP.x + 14 + gap2 * i + gap2 / 2, cy2 = SMP.y + (PHONE ? 42 : 54) + sr; ctx.save(); ctx.beginPath(); ctx.arc(cx2, cy2, sr, 0, TAU); ctx.clip(); ctx.drawImage(texCanvas(sm.kind), cx2 - sr, cy2 - sr, sr * 2, sr * 2); ctx.restore(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx2, cy2, sr, 0, TAU); ctx.stroke(); D.label(cx2, cy2 + sr + 16, sm.id === 'sa' ? 'A' : sm.id === 'sb' ? 'B' : 'C', { bg: '#334155', size: 13.5, pad: 9 }); });
    // 카드: 표 위 · 보관함
    card(TRY, PHONE ? '🪨 암석 카드를 끌어서 표에 놓아요' : '🪨 암석 카드를 끌어서 표의 알맞은 칸에 놓아요');
    S.cardObjs.forEach((c) => {
      const home = trayHome(c.k);
      if (S.dragCard !== c) { let tx, ty; if (c.cell) { const cl = CELLS.find((q) => q.id === c.cell), R = cellRect(cl.row === 'v' ? 0 : 1, SIOI[cl.col]); tx = R.x + (R.w - CARD.w) / 2; ty = R.y + (R.h - CARD.h) / 2; } else { tx = home.x; ty = home.y; } c.x = approach(c.x, tx, dt, 14); c.y = approach(c.y, ty, dt, 14); }
      c.lift = approach(c.lift, S.dragCard === c ? 1 : 0, dt, 14); c.pop = approach(c.pop, 0, dt, 8);
    });
    S.cardObjs.filter((c) => S.dragCard !== c).forEach((c) => drawRockCard(c, c.x, c.y, 0));
    if (S.dragCard) drawRockCard(S.dragCard, S.dragCard.x, S.dragCard.y, 1);
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { gen: '🌋 마그마 생성', visc: '🧪 마그마의 종류', bowen: '🌡️ 마그마의 분화', class: '🪨 화성암 분류' };
  const FREE_KEYS = { gen: ['scene'], visc: ['sio2'], bowen: ['cool'], class: ['cardhelp'] };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free); let keys = free ? FREE_KEYS[S.mode].slice() : ctlKeys.slice();
    if (S.mode === 'gen' && keys.includes('scene')) keys.push(S.place === 'arc' ? 'sl-arc' : S.place === 'crust' ? 'sl-crust' : 'sl-ridge');
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#sceneBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.p === S.place));
    $('#bPlay').textContent = S.playing ? '⏸ 멈추기' : '▶ 천천히 식히기';
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); S.playing = false; S.crystals = []; if (m === 'visc') S.flowT = 0; } S.mode = m; updateCtl(); }
  function setPlace(p) { S.place = p; parts.clear(); updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); setMode(b.dataset.mode); updateCtl(); }));
  $$('#sceneBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setPlace(b.dataset.p); }));
  SciSim.bindRange($('#sDepth'), $('#oDepth'), (v) => v + ' km', (v) => { S.depth = v; });
  SciSim.bindRange($('#sWater'), $('#oWater'), (v) => v + ' %', (v) => { S.water = v; });
  SciSim.bindRange($('#sHeat'), $('#oHeat'), (v) => v + ' %', (v) => { S.heat = v; });
  SciSim.bindRange($('#sSio'), $('#oSio'), (v) => v + ' %', (v) => { if (Math.abs(v - S.sio) >= 1) S.flowT = 0; S.sio = v; });
  SciSim.bindRange($('#sCool'), $('#oCool'), (v) => (1300 - v) + ' °C', (v) => { S.tc = 1300 - v; S.playing = false; updateCtl(); });
  $('#bFlow').addEventListener('click', () => { Sound.click(); S.flowT = 0; });
  $('#bPlay').addEventListener('click', () => { Sound.click(); if (S.playing) S.playing = false; else { if (S.tc <= 700) { S.tc = 1300; S.tv = 1300; } S.playing = true; } updateCtl(); });
  $('#bOrdMin').addEventListener('click', () => { Sound.click(); ordMin.reset(); });
  $('#bCardReset').addEventListener('click', () => { Sound.click(); initCards(); });
  const fmtR = (v) => v + '';
  function setSl(id, outId, v, fmt) { setSlider($(id), $(outId), v, fmt); }
  const setDepthUI = (v) => { S.depth = v; setSl('#sDepth', '#oDepth', v, (x) => x + ' km'); };
  const setWaterUI = (v) => { S.water = v; setSl('#sWater', '#oWater', v, (x) => x + ' %'); };
  const setHeatUI = (v) => { S.heat = v; setSl('#sHeat', '#oHeat', v, (x) => x + ' %'); };
  const setSioUI = (v) => { S.sio = v; setSl('#sSio', '#oSio', v, (x) => x + ' %'); };
  const setCoolUI = (T) => { S.tc = T; S.playing = false; setSl('#sCool', '#oCool', 1300 - T, (x) => (1300 - x) + ' °C'); };

  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'class') return false;
      for (let i = S.cardObjs.length - 1; i >= 0; i--) { const c = S.cardObjs[i]; if (p.x >= c.x && p.x <= c.x + CARD.w && p.y >= c.y && p.y <= c.y + CARD.h) { S.dragCard = c; c.cell = null; c.off = { x: p.x - c.x, y: p.y - c.y }; c.px = p.x; c.py = p.y; S.bad = S.bad.filter((q) => q !== c.id); S.cardObjs.splice(i, 1); S.cardObjs.push(c); c.lift = 0.2; Sound.click(); return true; } }
      return false;
    },
    move(p) { const c = S.dragCard; if (!c) return; c.x = p.x - c.off.x; c.y = p.y - c.off.y; c.px = p.x; c.py = p.y; },
    up(p) {
      const c = S.dragCard; if (!c) return; S.dragCard = null;
      const hit = CELLS.find((cl) => { const R = cellRect(cl.row === 'v' ? 0 : 1, SIOI[cl.col]); return p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h; });
      if (hit) { const other = S.cardObjs.find((q) => q !== c && q.cell === hit.id); if (other) other.cell = null; c.cell = hit.id; c.pop = 1; Sound.click(); }
      else c.cell = null;
    },
    hover(p) { return S.mode === 'class' && S.cardObjs.some((c) => p.x >= c.x && p.x <= c.x + CARD.w && p.y >= c.y && p.y <= c.y + CARD.h) ? 'grab' : ''; },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.crystals = []; S.playing = false;
    S.place = 'ridge'; setDepthUI(150); S.depthV = 150; setWaterUI(0); S.waterV = 0; setHeatUI(0); S.heatV = 0; S.did = { dec: false, wat: false, heat: false };
    setSioUI(45); S.sioV = 45; S.flowT = 0; clsMag.reset();
    setCoolUI(1300); S.tv = 1300; prevR = 0; ordMin.reset(); stpSi.reset(); S.sioCalc = 50;
    initCards(); clsSam.reset(); clsKor.reset();
    if (li === 0) { setMode('gen'); setCtl(['scene']); showHint('장면을 고르고 슬라이더를 움직여 마그마를 만들어요', 5000); }
    else if (li === 1) { setMode('visc'); setCtl(['sio2']); showHint('SiO₂ 슬라이더로 용암의 흐름을 비교해요', 5000); }
    else if (li === 2) { setMode('bowen'); setCtl(['cool']); showHint('슬라이더로 마그마를 식혀 광물이 생기는 순서를 봐요', 5000); }
    else { setMode('class'); setCtl(['cardhelp']); showHint('암석 카드를 표의 알맞은 칸으로 끌어다 놓아요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '마그마 생성: 변동대의 조건', short: '마그마 생성', icon: '🌋', phase: '모형', features: ['gen'],
      intro: '<p class="si-q">❓ 탐구 질문: 마그마는 어디서 어떻게 만들어지고, 왜 화성암의 색과 결정 크기가 서로 다를까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 판의 경계(발산·수렴·보존)와 맨틀 대류, 화산 활동을 배웠고 <b>중학교에서</b> 화성암이 마그마가 식어 만들어진다는 것을 배웠어요. 이번에는 마그마가 <b>어디서 어떤 조건으로</b> 만들어지는지 살펴봐요.</div>' +
        '<p>지하 깊은 곳의 맨틀은 대부분 고체예요. 암석의 온도가 <b>녹기 시작하는 온도(용융 곡선)</b>보다 높아지면 일부가 녹아 마그마가 돼요. 그런데 온도를 높이지 않아도 마그마가 생기는 경우가 있어요. 압력이 줄거나 물이 더해지면 녹는 온도 자체가 낮아지기 때문이에요. 이 조건이 어느 변동대에서 일어나는지 찾아봐요.</p>',
      setup() { resetStep(0); },
      recap: '마그마는 ① 압력 감소(해령·열점) ② 물 첨가(섭입대) ③ 열 공급(대륙 지각 하부)의 조건에서 만들어져요.',
      summary: '<ul><li><b>압력 감소 용융</b>(해령·열점): 맨틀 물질이 올라오면 압력이 줄어 녹기 시작하는 온도가 낮아져요. 온도는 거의 그대로인데 녹기 시작해요 → 현무암질 마그마. (예시: 150 km 1480 °C &lt; 1500 °C 고체, 100 km 1455 °C &gt; 1400 °C 용융)</li><li><b>물 첨가 용융</b>(섭입대): 섭입하는 판에서 나온 물이 맨틀 쐐기에 들어가 녹는 온도를 낮춰요(예시: 100 km에서 1400 °C → 약 1050 °C) → 현무암질~안산암질 마그마, 화산호.</li><li><b>열 공급 용융</b>(대륙 지각 하부): 올라온 마그마가 지각 하부에 열을 주어 암석이 녹아요 → 화강암질(유문암질) 마그마.</li></ul>',
      missions: [
        {
          title: '세 가지 조건으로 마그마 만들기',
          goal: '변동대 장면을 바꿔 가며 <b>압력 감소(해령·열점) · 물 첨가(섭입대) · 열 공급(대륙 하부)</b> 조건에서 각각 마그마를 만들어요.',
          hint: '해령·열점은 슬라이더로 맨틀 물질을 위로 올려요(깊이를 줄여요). 섭입대는 물의 양을, 대륙 하부는 마그마가 준 열의 양을 늘려요. 점이 용융 곡선의 오른쪽으로 넘어가거나 암석 온도가 750 °C를 넘으면 녹기 시작해요.',
          setup() { S.did = { dec: false, wat: false, heat: false }; setPlace('ridge'); setDepthUI(150); S.depthV = 150; setWaterUI(0); S.waterV = 0; setHeatUI(0); S.heatV = 0; setMode('gen'); setCtl(['scene']); },
          check: () => S.did.dec && S.did.wat && S.did.heat, hold: 0.4,
          status: () => mark(S.did.dec) + ' 압력 감소(해령·열점) · ' + mark(S.did.wat) + ' 물 첨가(섭입대) · ' + mark(S.did.heat) + ' 열 공급(대륙 하부)',
          explain: '해령·열점에서는 맨틀 물질이 <b>올라와 압력이 줄어</b>(약 135 km보다 위에서) 녹기 시작해요. 섭입대에서는 <b>물이 더해져</b> 녹는 온도가 낮아져서 1200 °C의 맨틀 쐐기가 녹아요(물 60 % 이상). 대륙 하부에서는 마그마의 <b>열</b>로 암석 온도가 750 °C를 넘으면 녹아요.',
        },
        {
          type: 'quiz', title: '온도를 높이지 않았는데 생기는 마그마',
          goal: '온도를 높이지 않았는데도 마그마가 생기는 경우를 모두 포함한 설명은?',
          setup() { setMode('gen'); setCtl(['scene']); },
          choices: ['맨틀 물질이 올라와 압력이 줄거나, 물이 더해져 녹는 온도가 낮아지는 경우', '맨틀이 가라앉아 압력이 커지는 경우', '지구 중심에서 열이 갑자기 늘어나는 경우만', '마그마는 온도가 높아져야만 만들어져요'],
          answer: 0,
          feedback: ['', '압력이 커지면 오히려 녹는 온도가 높아져서 더 녹기 어려워요.', '열 공급도 한 가지 원인이지만, 온도를 높이지 않아도 생기는 경우를 설명하지 못해요.', '압력 감소나 물 첨가처럼 녹는 온도가 낮아져도 마그마가 만들어져요.'],
          explain: '마그마는 <b>온도가 올라가서</b>뿐 아니라, <b>압력이 줄어서</b>(해령·열점) 또는 <b>물이 더해져서</b>(섭입대) 녹는 온도가 낮아져도 만들어져요.',
        },
      ],
    },
    {
      title: '마그마의 종류: SiO₂ 함량', short: '마그마 종류', icon: '🧪', phase: '실험', features: ['visc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변동대마다 마그마가 만들어지는 조건이 달랐어요. 그렇게 만들어진 마그마는 <b>성분(SiO₂ 함량)</b>이 서로 달라서 성질도 달라요.</div>' +
        '<p>마그마는 SiO₂ 함량이 <b>52 % 미만이면 염기성, 52~63 %이면 중성, 63 % 초과이면 산성</b>이에요. SiO₂ 함량에 따라 온도, 점성(끈적한 정도), 가스가 빠지는 정도, 암석의 색이 달라져요. 같은 경사면에 흘려 비교하는 실험을 해 봐요.</p>',
      setup() { resetStep(1); },
      recap: 'SiO₂가 많을수록(산성) 점성이 크고 온도는 낮으며 폭발적이고 밝은색 암석이 돼요. 변동대에 따라 만들어지는 마그마가 달라요.',
      summary: '<table class="mini"><tr><th>마그마</th><th>SiO₂</th><th>온도</th><th>점성</th><th>색</th></tr><tr><td>염기성</td><td>45~52 %</td><td>1000~1200 °C</td><td>작음</td><td>어두움</td></tr><tr><td>중성</td><td>52~63 %</td><td>800~1000 °C</td><td>중간</td><td>중간</td></tr><tr><td>산성</td><td>63 % 초과</td><td>650~800 °C</td><td>큼</td><td>밝음</td></tr></table><ul><li>점성이 큰 마그마는 가스가 빠져나가기 어려워 <b>폭발적</b>으로 분출해요.</li><li>변동대와 마그마: 해령·열점 → 현무암질, 섭입대 화산호 → 안산암질(현무암질~), 대륙 하부 용융 → 화강암질.</li></ul>',
      missions: [
        {
          title: '점성이 가장 큰 용암 만들기',
          goal: 'SiO₂ 슬라이더를 움직여 용암이 <b>가장 끈적한(점성이 가장 큰)</b> 마그마를 만들어요. 용암이 어디까지 흐르는지 관찰해요.',
          hint: 'SiO₂ 함량이 많을수록 점성이 커져서 용암이 짧게 흘러요. 슬라이더를 오른쪽으로 옮겨 68 % 이상으로 맞춰요.',
          setup() { setSioUI(45); S.sioV = 45; S.flowT = 0; setMode('visc'); setCtl(['sio2']); },
          check: () => S.sio >= 68, hold: 1.0,
          status: () => mark(S.sio >= 68) + ' SiO₂ ' + S.sio + ' % · 점성 약 ' + fmtV(viscRel(S.sio)) + '배 (목표: 68 % 이상)',
          explain: 'SiO₂가 많은 <b>산성 마그마</b>일수록 점성이 크고 짧게 흘러요. 반대로 SiO₂가 적은 염기성 마그마는 점성이 작아 멀리 흘러요(순상 화산). 이때 온도는 산성일수록 오히려 낮아요(650~800 °C).',
        },
        {
          title: '변동대와 마그마 짝짓기', manual: true,
          goal: '변동대에서 만들어지는 마그마의 종류를 <b>현무암질 · 안산암질 · 화강암질</b> 중에서 골라요.',
          hint: '해령·열점은 맨틀이 압력 감소로 녹은 마그마, 섭입대 화산호는 물이 더해져 녹은 마그마, 대륙 하부는 지각 암석이 녹은 마그마예요. 지각 암석이 녹으면 SiO₂가 많아요.',
          setup() { clsMag.reset(); setMode('visc'); setCtl(['sio2', 'clsmag']); },
          status: () => mark(clsMag.ok()) + ' 짝지은 변동대 ' + clsMag.count() + ' / 4',
          check() {
            if (!clsMag.complete()) return '변동대 4곳을 모두 짝지어 주세요. (지금 ' + clsMag.count() + '곳)';
            const w = clsMag.wrong(); clsMag.mark(w);
            if (w.length) return '빨간 칸 ' + w.length + '곳을 다시 확인해 보세요. 맨틀이 녹았는지, 지각이 녹았는지 생각해 봐요.';
            return true;
          },
          explain: '<b>해령·열점</b>은 맨틀이 녹은 <b>현무암질</b>, <b>섭입대 화산호</b>는 맨틀 쐐기에 물이 더해져 <b>안산암질</b>(현무암질~안산암질), <b>대륙 하부</b>는 지각 암석이 녹아 SiO₂가 많은 <b>화강암질</b> 마그마가 만들어져요.',
        },
        {
          type: 'quiz', title: '점성이 큰 마그마가 폭발적인 까닭',
          goal: '점성이 큰 산성 마그마가 폭발적으로 분출하는 까닭은?',
          setup() { setMode('visc'); setSioUI(66); setCtl(['sio2']); },
          choices: ['점성이 커서 마그마 속 가스가 빠져나가기 어려워 압력이 쌓이다가 한꺼번에 터져요', '점성이 작아서 가스가 쉽게 갇혀요', '온도가 높아서 가스가 폭발해요', '물이 없어서 가스가 생기지 않아요'],
          answer: 0,
          feedback: ['', '점성이 작은 마그마는 가스가 쉽게 빠져나가서 조용히 흘러요.', '산성 마그마는 온도가 오히려 낮아요(650~800 °C).', '마그마 속에는 가스(수증기 등)가 녹아 있어요. 문제는 빠져나가지 못하는 것이에요.'],
          explain: '점성이 큰 마그마는 끈적해서 <b>가스가 빠져나가기 어려워요</b>. 가스 압력이 쌓였다가 한꺼번에 터지면 폭발적인 분화가 돼요. 점성이 작은 마그마는 가스가 쉽게 빠져 용암이 조용히 흘러요.',
        },
      ],
    },
    {
      title: '분화 과정: 보웬 반응 계열', short: '분화 과정', icon: '🌡️', phase: '탐구', features: ['bowen'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마그마의 SiO₂ 함량이 성질을 결정한다는 것을 배웠어요. 그런데 하나의 마그마에서도 여러 성분의 마그마가 만들어질 수 있어요. 마그마가 식으면서 <b>성분이 변하는 과정(분화)</b>을 살펴봐요.</div>' +
        '<p>마그마가 식을 때 모든 광물이 동시에 굳지 않고, <b>높은 온도에서 정출하는 광물부터 차례로</b> 굳어요(보웬 반응 계열). 먼저 생긴 무거운 결정이 가라앉아 분리되면 남은 마그마는 SiO₂가 점점 많아져요. 이것을 <b>분별 정출</b>이라고 해요.</p>',
      setup() { resetStep(2); },
      recap: '마그마가 식으면 광물이 높은 온도부터 차례로 정출하고, 결정이 분리되면 남은 마그마의 SiO₂ 함량이 높아져요(분별 정출).',
      summary: '<ul><li><b>불연속 계열</b>: 감람석 → 휘석 → 각섬석 → 흑운모 (광물이 차례로 바뀌어요). <b>연속 계열</b>: Ca 사장석 → Na 사장석. 마지막에 <b>정장석·백운모·석영</b>이 굳어요.</li><li><b>분별 정출</b>: 먼저 생긴 결정이 가라앉아 분리되면 남은 마그마의 SiO₂ 함량이 높아져요 → 한 마그마에서 여러 종류의 화성암이 만들어질 수 있어요.</li><li>계산 예: SiO₂ 50 %인 마그마에서 SiO₂ 40 %인 감람석 20 %가 분리되면 남은 마그마의 SiO₂ = (50 − 0.2 × 40) ÷ 0.8 = <b>52.5 %</b>.</li></ul>',
      missions: [
        {
          title: '광물이 정출하는 순서', manual: true,
          goal: '슬라이더로 마그마를 식히며 광물이 생기는 순서를 관찰해요. 그리고 <b>높은 온도에서 먼저 정출하는 광물부터</b> 차례로 눌러요.',
          hint: '보웬 도표에서 위쪽(높은 온도)에 있는 광물이 먼저 생겨요. 감람석 다음은 휘석, 그 다음은 각섬석, 흑운모예요. 정장석과 석영은 가장 마지막에 생겨요.',
          setup() { ordMin.reset(); setCoolUI(1300); S.tv = 1300; prevR = 0; S.crystals = []; setMode('bowen'); setCtl(['cool', 'ordmin']); },
          status: () => mark(ordMin.ok()) + ' 고른 광물 ' + ordMin.seq.length + ' / 6',
          check() {
            if (!ordMin.complete()) return '광물 6개를 모두 눌러 주세요. (지금 ' + ordMin.seq.length + '개)';
            if (!ordMin.ok()) { const i = ordMin.firstWrong(); ordMin.mark(ordMin.seq[i]); return (i + 1) + '번째 광물이 맞지 않아요. 보웬 도표에서 정출 온도가 더 높은 광물이 먼저예요.'; }
            ordMin.mark(null); return true;
          },
          explain: '정출 순서는 <b>감람석 → 휘석 → 각섬석 → 흑운모 → 정장석 → 석영</b>이에요. 정출 온도가 높은 광물이 먼저 생기고, 석영이 가장 마지막에 생겨요.',
        },
        {
          title: '남은 마그마의 SiO₂ 계산',
          goal: 'SiO₂ 50 %인 마그마에서 SiO₂ 40 %인 <b>감람석 결정이 20 % 분리</b>됐어요. 남은 마그마의 SiO₂ 함량(%)을 계산해 입력해요.',
          hint: '처음 마그마 100 중 SiO₂는 50이에요. 감람석 20 안에 SiO₂ 40 %가 들어 있으니 SiO₂ 8이 빠져나가요. 남은 마그마는 80이고 SiO₂는 50 − 8 = 42예요. (소수 첫째 자리까지, 0.5 단위)',
          setup() { stpSi.reset(); S.sioCalc = 50; setCoolUI(1300); S.tv = 1300; prevR = 0; S.crystals = []; setMode('bowen'); setCtl(['cool', 'calc']); },
          check: () => S.sioCalc === 52.5, hold: 0.5,
          status: () => mark(S.sioCalc === 52.5) + ' 입력한 값 ' + fx(S.sioCalc, 1) + ' %',
          explain: '남은 마그마의 SiO₂ = (50 − 0.2 × 40) ÷ 0.8 = 42 ÷ 0.8 = <b>52.5 %</b>예요. 슬라이더를 1150 °C에 두면 같은 값이 나와요. SiO₂가 50 %에서 52.5 %로 높아졌어요(중성에 가까워져요).',
        },
        {
          type: 'quiz', title: '같은 마그마에서 서로 다른 암석',
          goal: '하나의 마그마에서 서로 다른 화성암이 만들어질 수 있는 까닭으로 알맞은 것은?',
          setup() { setCoolUI(750); S.tv = 750; S.crystals = []; setMode('bowen'); setCtl(['cool']); },
          choices: ['광물마다 정출하는 온도가 달라서, 먼저 생긴 결정이 분리되면 남은 마그마의 성분이 달라져요', '마그마는 식어도 성분이 변하지 않아서 항상 같은 암석만 생겨요', '모든 광물이 같은 온도에서 동시에 정출해요', '정출 순서는 무작위로 정해져요'],
          answer: 0,
          feedback: ['', '식는 동안 결정이 분리되면 남은 마그마의 성분이 변해요.', '광물마다 정출하기 시작하는 온도가 달라서 순서대로 생겨요.', '정출 순서는 온도에 따라 정해져 있어요(보웬 반응 계열).'],
          explain: '광물마다 <b>정출하는 온도가 달라</b> 높은 온도의 광물부터 생기고, 이 결정이 분리되면 <b>남은 마그마의 SiO₂가 늘어나요</b>(52.5 % → 약 65 %). 그래서 한 마그마에서도 서로 다른 화성암이 만들어질 수 있어요.',
        },
      ],
    },
    {
      title: '화성암 분류: 성분과 조직', short: '화성암 분류', icon: '🪨', phase: '적용', features: ['class'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마그마의 SiO₂ 함량이 다르고, 마그마가 식는 동안 성분도 변한다는 것을 배웠어요. 이제 <b>SiO₂ 함량(성분)</b>과 <b>식는 속도(조직)</b>에 따라 화성암을 분류해 봐요.</div>' +
        '<p>마그마가 <b>지표 부근에서 빨리 식으면</b> 결정이 작은 <b>화산암</b>, <b>땅속 깊은 곳에서 천천히 식으면</b> 결정이 큰 <b>심성암</b>이 돼요. SiO₂ 함량(염기성·중성·산성)과 합치면 화성암은 6종류로 나뉘어요. 이 분류에 우리나라의 제주도 현무암 지형과 북한산·설악산의 화강암 산을 연결해 봐요.</p>',
      setup() { resetStep(3); },
      recap: '화성암은 SiO₂ 함량(염기성·중성·산성)과 식는 속도(화산암·심성암)로 분류해요. 결정이 클수록 땅속 깊은 곳에서 천천히 식었어요.',
      summary: '<table class="mini"><tr><th></th><th>염기성(&lt;52 %)</th><th>중성(52~63 %)</th><th>산성(&gt;63 %)</th></tr><tr><td>화산암(세립)</td><td>현무암</td><td>안산암</td><td>유문암</td></tr><tr><td>심성암(조립)</td><td>반려암</td><td>섬록암</td><td>화강암</td></tr></table><ul><li>염기성일수록 어두운색(유색 광물 많음), 산성일수록 밝은색(석영·장석 많음)이에요.</li><li>결정이 클수록 식는 속도가 느렸고 땅속 깊은 곳에서 만들어졌어요.</li><li><b>제주도 현무암</b>: 염기성 용암이 지표에서 빨리 식은 암석(기공이 많아요). <b>북한산·설악산 화강암</b>: 땅속 깊은 곳에서 천천히 식은 심성암이 융기와 침식으로 지표에 드러난 거예요.</li></ul>',
      missions: [
        {
          title: '화성암 분류표 완성하기', manual: true,
          goal: '암석 카드 6장을 끌어서 <b>SiO₂ 함량(염기성·중성·산성)</b>과 <b>조직(화산암·심성암)</b>에 맞는 칸에 놓아요.',
          hint: '어두운색이고 결정이 작으면 염기성 화산암(현무암), 밝고 석영이 보이는 조립질은 산성 심성암(화강암)이에요. 같은 성분이라도 빨리 식으면 화산암, 천천히 식으면 심성암이에요.',
          setup() { initCards(); setMode('class'); setCtl(['cardhelp']); },
          status: () => mark(S.cardObjs.every((c) => c.cell && CELLS.find((q) => q.id === c.cell).rock === c.id)) + ' 맞게 놓은 카드 ' + S.cardObjs.filter((c) => c.cell && CELLS.find((q) => q.id === c.cell).rock === c.id).length + ' / 6',
          check() {
            const un = S.cardObjs.filter((c) => !c.cell).length;
            if (un) return '카드 ' + un + '장이 아직 표 밖에 있어요. 모든 카드를 표에 놓아 주세요.';
            const w = S.cardObjs.filter((c) => CELLS.find((q) => q.id === c.cell).rock !== c.id).map((c) => c.id); S.bad = w;
            if (w.length) return '빨간 테두리 카드 ' + w.length + '장을 다시 확인해 보세요. 색(성분)과 결정 크기(조직)를 함께 봐요.';
            return true;
          },
          explain: '염기성: <b>현무암(화산암)·반려암(심성암)</b>, 중성: <b>안산암·섬록암</b>, 산성: <b>유문암·화강암</b>이에요. 같은 성분의 마그마가 지표 부근에서 빨리 식으면 화산암, 땅속에서 천천히 식으면 심성암이 돼요.',
        },
        {
          title: '시료 판정과 한반도 사례', manual: true,
          goal: '시료 A·B·C가 어떤 암석인지 <b>색·결정 크기·광물</b>로 판정하고, 제주도 현무암과 북한산 화강암이 만들어진 환경을 골라요.',
          hint: '시료 A는 어둡고 구멍(기공)이 많은 세립질, B는 밝고 석영이 보이는 조립질, C는 중간색의 세립질이에요. 결정이 크면 천천히 식은 암석이에요.',
          setup() { clsSam.reset(); clsKor.reset(); setMode('class'); setCtl(['cardhelp', 'clssam', 'clskor']); },
          status: () => mark(clsSam.ok()) + ' 시료 판정 ' + clsSam.count() + ' / 3 · ' + mark(clsKor.ok()) + ' 환경 ' + clsKor.count() + ' / 2',
          check() {
            if (!clsSam.complete()) return '시료 3개를 모두 판정해 주세요. (지금 ' + clsSam.count() + '개)';
            const w = clsSam.wrong(); clsSam.mark(w);
            if (w.length) return '빨간 시료 ' + w.length + '개를 다시 확인해 보세요. 색과 결정 크기를 살펴봐요.';
            if (!clsKor.complete()) return '한반도 사례 2개의 환경을 모두 골라 주세요. (지금 ' + clsKor.count() + '개)';
            const k = clsKor.wrong(); clsKor.mark(k);
            if (k.length) return '빨간 사례를 다시 확인해 보세요. 기공이 많은 암석과 결정이 큰 암석은 식은 환경이 달라요.';
            return true;
          },
          explain: '시료 A는 <b>현무암</b>(염기성·세립), B는 <b>화강암</b>(산성·조립), C는 <b>안산암</b>(중성·세립)이에요. 제주도 현무암은 <b>지표에서 빨리 식은</b> 암석이고, 북한산·설악산의 화강암은 <b>땅속 깊은 곳에서 천천히 식은</b> 뒤 융기와 침식으로 드러난 암석이에요.',
        },
        {
          type: 'quiz', title: '화강암이 지표에 드러난 까닭',
          goal: '화강암은 땅속 깊은 곳에서 만들어지는데 북한산에서는 지표에 드러나 있어요. 그 까닭은?',
          setup() { setMode('class'); setCtl(['cardhelp']); },
          choices: ['땅속에서 천천히 식은 화강암이 융기하고, 위쪽의 암석이 침식되어 지표에 드러났어요', '화강암은 용암이 지표에서 빨리 식어 만들어졌어요', '화강암은 바닷속에서만 만들어져요', '지표에서는 결정이 크게 자라서 화강암이 돼요'],
          answer: 0,
          feedback: ['', '지표에서 빨리 식으면 결정이 작은 화산암이 돼요. 화강암은 결정이 큰 심성암이에요.', '화강암은 땅속 깊은 곳 마그마가 식어 만들어져요.', '결정이 크려면 오래 천천히 식어야 해서 땅속 깊은 곳에서 만들어져요.'],
          explain: '결정이 큰 화강암은 <b>땅속 깊은 곳에서 천천히 식은 심성암</b>이에요. 오랜 시간 융기와 침식으로 위의 암석이 깎여 나가면서 지표에 드러났어요. 결정이 클수록 식는 속도는 느리고 생성 깊이는 깊어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-magma-igneous', mount: '#game', badge: '마그마 탐험가', homeHref: '../../index.html#he',
    featureLabels: { gen: '🌋 변동대 단면 · 깊이-온도 그래프', visc: '🧪 SiO₂ 슬라이더 · 용암 흐름', bowen: '🌡️ 식히기 슬라이더 · 보웬 반응 계열', class: '🪨 화성암 분류표 · 암석 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'gen') { const G = genState(); setReadouts(['지금 온도', fx(G.T, 0) + ' °C', '녹기 시작하는 온도', fx(G.Ts, 0) + ' °C', '녹은 비율', G.melt > 0 ? '약 ' + fx(G.melt, 1) + ' %' : '고체(0 %)']); }
    else if (m === 'visc') setReadouts(['SiO₂ 함량', S.sio + ' %', '점성(염기성 = 1)', '약 ' + fmtV(viscRel(S.sio)) + '배', '마그마 종류', magType(S.sio).n + ' · ' + magType(S.sio).rock]);
    else if (m === 'bowen') { const B = bowenAt(S.tc); setReadouts(['온도', fx(S.tc, 0) + ' °C', '남은 마그마', fx(B.melt, 0) + ' %', '남은 마그마의 SiO₂', fx(B.sio, 1) + ' %']); }
    else { const ok = S.cardObjs.filter((c) => c.cell && CELLS.find((q) => q.id === c.cell).rock === c.id).length; setReadouts(['표에 놓은 카드', S.cardObjs.filter((c) => c.cell).length + ' / 6', '맞게 놓은 카드', ok + ' / 6', '자료', '예시 자료']); }
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
    if (S.mode === 'gen') { drawGen(t, dt); const G = genState(); if (G.melt > 0) { if (S.place === 'ridge' || S.place === 'hot') S.did.dec = true; else if (S.place === 'arc') S.did.wat = true; else S.did.heat = true; } }
    else if (S.mode === 'visc') drawVisc(t, dt);
    else if (S.mode === 'bowen') drawBowen(t, dt);
    else drawClass(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    VW, VH, S, PHONE, ROCK, CELLS, cellRect, CARD, trayHome, SAMPLES, KOR, clsMag, ordMin, clsSam, clsKor, stpSi, bowenAt, solid, mantleT, crustT, genState, magType, viscRel, flowMax, MIN, WIN,
    get game() { return game; }, setMode, setPlace, resetStep, updateCtl, setDepthUI, setWaterUI, setHeatUI, setSioUI, setCoolUI, initCards,
    solveCards() { S.cardObjs.forEach((c) => { c.cell = CELLS.find((q) => q.rock === c.id).id; }); },
  };

})();
