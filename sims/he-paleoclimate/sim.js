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
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 고기후 연구 방법
     [12지구02-02] 지층과 화석을 통해 지질시대의 환경 변화를 해석 (고기후 연구 방법만 소개, 메커니즘은 다루지 않음)
     ① 탐구: 지질 기록   ② 관찰: 생물 기록   ③ 분석: 빙하·퇴적물   ④ 적용: 방법 평가
     ========================================================= */
  initStage('#eaf1f7', 800, 560, 600, 880, 1.22);
  const U = VW / 800;
  const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* ---------- 지질 기록 단서 ---------- */
  const CLUES = [
    { id: 'till', n: '빙퇴석', d: '모난 자갈과 점토가 뒤섞인 퇴적물', ans: 'cold' },
    { id: 'coal', n: '석탄', d: '식물이 쌓여 만들어진 검은 층', ans: 'wet' },
    { id: 'evap', n: '증발암', d: '석고·암염 같은 하얀 결정 층', ans: 'dry' },
    { id: 'reef', n: '산호초 석회암', d: '산호 화석이 든 석회암', ans: 'sea' },
    { id: 'dune', n: '사막의 사층리', d: '비스듬한 큰 층리가 있는 사암', ans: 'dry' },
  ];
  const CLIM = [{ id: 'cold', label: '한랭' }, { id: 'wet', label: '따뜻하고 습함' }, { id: 'dry', label: '건조' }, { id: 'sea', label: '따뜻한 바다' }];
  /* 대륙 이동 모식도: 석탄기(3.2억 년 전) 적도 부근 → 현재 북위 52° (유럽의 석탄 산지, 예시) */
  const DR = { t0: 320, lat0: 3, lat1: 52 };
  const drLat = (ma) => DR.lat0 + (DR.lat1 - DR.lat0) * (1 - ma / DR.t0);
  const zoneOf = (lat) => (Math.abs(lat) < 23.5 ? { n: '열대', c: '#f3b65b' } : Math.abs(lat) < 66.5 ? { n: '온대', c: '#8fcf86' } : { n: '한대', c: '#b9dcf2' });

  /* ---------- 나이테 (1830년에 벤 나무: 1800~1830년 31겹, 폭 mm, 예시) ---------- */
  const Y0 = 1800, Y1 = 1830, NR = Y1 - Y0 + 1;
  const RW = [];
  { const r = seeded(31); for (let y = Y0; y <= Y1; y++) RW.push(Math.round((1.8 + r() * 0.8) * 10) / 10);
    const fix = { 1810: 2.3, 1811: 2.2, 1812: 2.4, 1813: 2.1, 1814: 2.3, 1815: 2.2, 1816: 0.6, 1817: 1.4, 1818: 2.2, 1819: 2.2, 1820: 2.1 };
    Object.keys(fix).forEach((y) => { RW[y - Y0] = fix[y]; }); }
  const RMEAN = Math.round(RW.slice(10, 21).reduce((a, b) => a + b, 0) / 11 * 100) / 100;       // 1810~1820년 평균
  if (RMEAN !== 2) throw new Error('ring mean ' + RMEAN);
  const RMIN = RW.indexOf(Math.min(...RW)) + Y0;
  if (RMIN !== 1816 || RW.filter((w) => w < 1.5).length !== 2) throw new Error('ring min');
  const RCUM = []; { let s = 0; RW.forEach((w) => { s += w; RCUM.push(s); }); }
  const RTOT = RCUM[NR - 1];

  /* ---------- 화분 (호수 퇴적물, 예시 %) ---------- */
  const POL = [
    { id: 'p1', age: '약 2만 년 전', pine: 60, oak: 5, oth: 35, ans: 'cold' },
    { id: 'p2', age: '약 1만 4천 년 전', pine: 40, oak: 25, oth: 35, ans: 'cold' },
    { id: 'p3', age: '약 8천 년 전', pine: 20, oak: 55, oth: 25, ans: 'warm' },
    { id: 'p4', age: '약 2천 년 전', pine: 25, oak: 50, oth: 25, ans: 'warm' },
  ];
  POL.forEach((p) => { if (p.pine + p.oak + p.oth !== 100) throw new Error('pollen sum'); if ((p.pine > p.oak ? 'cold' : 'warm') !== p.ans) throw new Error('pollen rule'); });

  /* ---------- 빙하 코어 · 해양 퇴적물 곡선 (예시) ---------- */
  const PK = [6, 128, 240, 325, 405, 500, 620, 695, 780, 900];       // 간빙기 정점 (천 년 전)
  const sm01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const fGl = (t) => {
    if (t <= PK[0]) return 1;
    let i = 0; while (i < PK.length - 2 && t > PK[i + 1]) i++;
    const u = (t - PK[i]) / (PK[i + 1] - PK[i]);
    const f = u < 0.1 ? 1 - sm01(u / 0.1) : Math.pow((u - 0.1) / 0.9, 1.7);
    return clamp(f + 0.012 * Math.sin(t * 1.3 + 0.7), 0, 1);
  };
  const fSm = (t) => { let s = 0; for (let k = -2; k <= 2; k++) s += fGl(clamp(t + k * 2, 0, 900)); return s / 5; };
  const CO2 = (t) => 180 + 100 * fGl(t), DT = (t) => -9 + 9 * fGl(Math.max(0, t - 1.5)), D18 = (t) => 5.0 - 1.8 * fSm(clamp(t + 3, 0, 900));
  const fmtAgo = (a) => (a < 0.05 ? '현재' : fmtKa(a) + ' 전');
  const fmtKa = (a) => (a < 10 ? '약 ' + (Math.round(a * 10) / 10) + '천 년' : '약 ' + (Math.round(a) / 10) + '만 년');
  const DEPTH_AGE = [[0, 0], [500, 20], [1000, 70], [2000, 300], [3000, 630], [3270, 800]];
  const ageAtDepth = (d) => { for (let i = 0; i < DEPTH_AGE.length - 1; i++) { const a = DEPTH_AGE[i], b = DEPTH_AGE[i + 1]; if (d <= b[0]) return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0])); } return 800; };
  const depthAtAge = (t) => { for (let i = 0; i < DEPTH_AGE.length - 1; i++) { const a = DEPTH_AGE[i], b = DEPTH_AGE[i + 1]; if (t <= b[1]) return lerp(a[0], b[0], (t - a[1]) / (b[1] - a[1])); } return 3270; };
  const LM_PTS = [[0, 25], [250, 25], [750, 10], [1500, 1000 / 230], [2500, 1000 / 330], [3135, 270 / 170], [3270, 270 / 170]];   // 연층 두께(mm/년): 구간 평균값을 중간 깊이에서 이어요
  const layerMm = (d) => { for (let i = 0; i < LM_PTS.length - 1; i++) { const a = LM_PTS[i], b = LM_PTS[i + 1]; if (d <= b[0]) return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0] || 1)); } return LM_PTS[LM_PTS.length - 1][1]; };
  const GLS = [{ id: 'wA', t: 20, ans: 'gl', n: 'A · 약 2만 년 전' }, { id: 'wB', t: 125, ans: 'ig', n: 'B · 약 12만 5천 년 전' }, { id: 'wC', t: 150, ans: 'gl', n: 'C · 약 15만 년 전' }, { id: 'wD', t: 240, ans: 'ig', n: 'D · 약 24만 년 전' }];
  GLS.forEach((g) => { const co = CO2(g.t), d18 = D18(g.t); const kind = (co > 230) === (d18 < 4.1) ? (co > 230 ? 'ig' : 'gl') : 'x'; if (kind !== g.ans) throw new Error('glacial window ' + g.id + ' ' + co + ' ' + d18); });
  const CO2_LGM = Math.round(CO2(20) / 5) * 5;
  if (CO2_LGM !== 180) throw new Error('LGM CO2 ' + CO2(20));

  /* ---------- 고기후 연구 방법 비교 (예시) ---------- */
  const MTH = [
    { id: 'hist', n: '역사 기록', k: 'doc', reach: 2000, res: '일~연', area: '지역 한정', info: '기온·강수·가뭄' },
    { id: 'ring', n: '나이테', k: 'bio', reach: 10000, res: '연', area: '온대 육상', info: '생장 좋은 해' },
    { id: 'coral', n: '산호 성장선', k: 'bio', reach: 3000, res: '월~연', area: '열대 바다', info: '수온' },
    { id: 'pollen', n: '화분 화석', k: 'bio', reach: 300000, res: '수십~수백 년', area: '육상(호수)', info: '식생→기온·강수' },
    { id: 'ice', n: '빙하 코어', k: 'ice', reach: 800000, res: '연~수십 년', area: '극지·고산', info: 'CO₂·기온' },
    { id: 'ocean', n: '해양 퇴적물', k: 'sed', reach: 100000000, res: '수천 년', area: '전 해양', info: '빙하량(추위)' },
    { id: 'geo', n: '지질 기록', k: 'sed', reach: 500000000, res: '만 년 이상', area: '대륙', info: '한랭·온난·건조' },
  ];
  const MTHI = {}; MTH.forEach((m) => { MTHI[m.id] = m; });
  const SCEN = [
    { id: 'sa', key: 'a', need: 500, label: '(a) 조선 시대(약 500년 전)에 가뭄이 든 해를 연 단위로 알고 싶어요', ans: ['hist', 'ring'] },
    { id: 'sb', key: 'b', need: 800000, label: '(b) 최근 80만 년 동안의 이산화 탄소(CO₂) 농도를 알고 싶어요', ans: ['ice'] },
    { id: 'sc', key: 'c', need: 20000, label: '(c) 마지막 빙기(약 2만 년 전) 한반도의 식생을 알고 싶어요', ans: ['pollen'] },
    { id: 'sd', key: 'd', need: 200000000, label: '(d) 약 2억 년 전의 기후(한랭·온난·건조)를 대략 알고 싶어요', ans: ['geo'] },
  ];
  /* 정답은 시간 범위로 확인: 모든 정답은 필요한 시기에 닿아야 해요 */
  SCEN.forEach((s) => s.ans.forEach((a) => { if (MTHI[a].reach < s.need) throw new Error('scenario reach ' + s.id + a); }));

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'clues', clock: 0, fade: 0, stepNow: false,
    drift: DR.t0, driftV: DR.t0, seenNow: false, driftTr: 0,
    grow: 0, selYear: null, nCount: 0, ringHit: 0,
    depth: 500, depthV: 500, drillT: 0, co2Val: 250, winShow: false, curveRev: 0, scenFocus: 'sa', evalRev: 0,
    bad: [], showCo2: false,
  };

  /* ---------- HTML 도구 ---------- */
  const clsClim = makeClassify($('#clsClim'), CLUES.map((c) => ({ id: c.id, label: c.n })), CLIM, Object.fromEntries(CLUES.map((c) => [c.id, c.ans])));
  const clsPol = makeClassify($('#clsPol'), POL.map((p) => ({ id: p.id, label: p.age })), [{ id: 'cold', label: '서늘·한랭' }, { id: 'warm', label: '따뜻' }], Object.fromEntries(POL.map((p) => [p.id, p.ans])));
  const clsGl = makeClassify($('#clsGl'), GLS.map((g) => ({ id: g.id, label: g.n })), [{ id: 'gl', label: '빙기' }, { id: 'ig', label: '간빙기' }], Object.fromEntries(GLS.map((g) => [g.id, g.ans])));
  const selScen = makeSelects($('#selScen'), SCEN.map((s) => ({ id: s.id, label: s.label })), MTH.map((m) => ({ id: m.id, label: m.n })), Object.fromEntries(SCEN.map((s) => [s.id, s.ans])), () => { /* 선택은 바로 반영 */ });
  const pairLim = makePair($('#pairLim'), [{ id: 'ice', label: '빙하 코어' }, { id: 'ring', label: '나이테' }, { id: 'ocean', label: '해양 퇴적물' }, { id: 'geo', label: '지질 기록' }],
    [{ id: 'lA', label: '정확한 시기를 정하기 어렵고, 한랭·온난·건조처럼 대략만 알 수 있어요' }, { id: 'lB', label: '극지나 고산 지대에서만 얻을 수 있어요' }, { id: 'lC', label: '한 층이 쌓이는 데 오래 걸려 수천 년 단위로만 알 수 있어요' }, { id: 'lD', label: '온대 육상의 나무가 자란 약 1만 년까지만 알 수 있어요' }],
    { ice: 'lB', ring: 'lD', ocean: 'lC', geo: 'lA' });
  const stpAge = makeStepper($('#stpAge'), { min: 0, max: 40, step: 1, value: 0, dec: 0, unit: '겹', onChange: (v) => { S.nCount = v; S.ringHit = 1; } });
  const stpCo2 = makeStepper($('#stpCo2'), { min: 150, max: 320, step: 5, value: 250, dec: 0, unit: 'ppm', onChange: (v) => { S.co2Val = v; } });

  /* ======================================================
     그림 도우미: 암석 노두 그림
     ====================================================== */
  function drawOutcrop(id, x, y, w, h) {
    ctx.save(); rr(x, y, w, h, 10).clip();
    const r = seeded(id.charCodeAt(0) * 31 + id.length);
    if (id === 'till') {
      ctx.fillStyle = '#9a8f80'; ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 46; i++) {
        const cx = x + r() * w, cy = y + r() * h, s = 3 + Math.pow(r(), 2) * 22, n = 5 + Math.floor(r() * 3), g = 90 + Math.floor(r() * 90);
        ctx.fillStyle = 'rgb(' + g + ',' + (g - 6) + ',' + (g - 14) + ')'; ctx.beginPath();
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r() * 0.6, rr2 = s * (0.6 + r() * 0.5); k ? ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2) : ctx.moveTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); }
        ctx.closePath(); ctx.fill();
        if (s > 12) { ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.2 + k * 3); ctx.lineTo(cx + s * 0.5, cy + s * 0.1 + k * 3); ctx.stroke(); } }
      }
    } else if (id === 'coal') {
      ctx.fillStyle = '#d8c7a0'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#b8a784'; ctx.fillRect(x, y, w, h * 0.22); ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
      ctx.fillStyle = '#1f2027'; ctx.fillRect(x, y + h * 0.3, w, h * 0.4);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 12; i++) ctx.fillRect(x + r() * w, y + h * 0.3 + r() * h * 0.4, 6 + r() * 14, 1.5);
      ctx.fillStyle = '#12131a'; ctx.fillRect(x, y + h * 0.46, w, 2); ctx.fillRect(x, y + h * 0.58, w, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y + h * 0.3, w, h * 0.4); ctx.clip(); fossilIco('fern', x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.3, 'rgba(160,165,190,.75)', 'rgba(0,0,0,0)'); ctx.restore();
    } else if (id === 'evap') {
      ctx.fillStyle = '#f2ece4'; ctx.fillRect(x, y, w, h);
      ['#f7d9d6', '#fff', '#eadfd0', '#fff', '#f5cfcc'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x, y + (i * h) / 5, w, h / 5 - 2); });
      for (let i = 0; i < 40; i++) { const s = 3 + r() * 6, cx = x + r() * (w - s), cy = y + r() * (h - s); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(cx, cy, s, s); ctx.strokeStyle = 'rgba(120,110,100,.35)'; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, s, s); }
    } else if (id === 'reef') {
      ctx.fillStyle = '#efe6cb'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(160,130,90,.15)'; for (let i = 0; i < 30; i++) ctx.fillRect(x + r() * w, y + r() * h, 3 + r() * 8, 2);
      fossilIco('coral', x + w * 0.34, y + h * 0.42, Math.min(w, h) * 0.2, '#b79a68', 'rgba(255,248,230,.85)');
      fossilIco('clam', x + w * 0.72, y + h * 0.6, Math.min(w, h) * 0.16, '#b79a68', 'rgba(255,248,230,.85)');
      fossilIco('coral', x + w * 0.62, y + h * 0.26, Math.min(w, h) * 0.13, '#c3a874', 'rgba(255,248,230,.85)');
    } else if (id === 'dune') {
      ctx.fillStyle = '#e4b673'; ctx.fillRect(x, y, w, h);
      const sets = 3;
      for (let s = 0; s < sets; s++) {
        const y0 = y + (s * h) / sets, y1 = y + ((s + 1) * h) / sets;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y0, w, y1 - y0 - 1); ctx.clip();
        ctx.strokeStyle = 'rgba(150,95,40,.55)'; ctx.lineWidth = 1.4;
        for (let i = -6; i < 14; i++) { const x0 = x + i * (w / 8) * (s % 2 ? 1 : 1); ctx.beginPath(); if (s % 2 === 0) { ctx.moveTo(x0, y1); ctx.quadraticCurveTo(x0 + w * 0.25, y1 - (y1 - y0) * 0.35, x0 + w * 0.5, y0); } else { ctx.moveTo(x0 + w * 0.5, y1); ctx.quadraticCurveTo(x0 + w * 0.25, y1 - (y1 - y0) * 0.35, x0, y0); } ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = 'rgba(110,70,30,.35)'; ctx.fillRect(x, y1 - 2, w, 2);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.2; rr(x, y, w, h, 10).stroke();
  }

  /* ======================================================
     장면 1: 지질 기록 단서와 대륙 이동
     ====================================================== */
  function drawClues(t, dt) {
    const cw = PHONE ? 288 : 152, ch = PHONE ? 120 : 196, g = PHONE ? 6 : 6;
    CLUES.forEach((c, i) => {
      const x = PHONE ? 8 + (i % 2) * (cw + g) : (VW - (5 * cw + 4 * g)) / 2 + i * (cw + g), y = PHONE ? 8 + Math.floor(i / 2) * (ch + g) : 8;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, cw, ch, 14).fill(); }, { blur: 5, y: 2 });
      const sel = clsClim.sel[c.id], bad = S.bad.includes(c.id);
      if (sel || bad) { ctx.strokeStyle = bad ? '#e2464b' : '#3867f4'; ctx.lineWidth = 3; rr(x, y, cw, ch, 14).stroke(); }
      if (!PHONE) {
        drawOutcrop(c.id, x + 8, y + 8, cw - 16, 100);
        D.text(x + 10, y + 128, c.n, { size: 15, weight: 800, color: '#1b2333', align: 'left' });
        drawWrap(x + 10, y + 148, c.d, cw - 18, 13, { align: 'left', weight: 700, color: '#64748b', lh: 1.25 });
        if (sel) D.label(x + cw - 8, y + 122, CLIM.find((k) => k.id === sel).label, { bg: '#3867f4', size: 12.5, align: 'right', pad: 6 });
      } else {
        drawOutcrop(c.id, x + 8, y + 8, 110, ch - 16);
        D.text(x + 126, y + 30, c.n, { size: 15, weight: 800, color: '#1b2333', align: 'left' });
        drawWrap(x + 126, y + 54, c.d, cw - 136, 13, { align: 'left', weight: 700, color: '#64748b', lh: 1.25 });
        if (sel) D.label(x + cw - 8, y + ch - 18, CLIM.find((k) => k.id === sel).label, { bg: '#3867f4', size: 12.5, align: 'right', pad: 6 });
      }
    });
    // 대륙 이동 모식도
    const P = PHONE ? { x: 8, y: 8 + 3 * 126 + 4, w: VW - 16, h: VH - (8 + 3 * 126 + 4) - 8 } : { x: 8, y: 212, w: VW - 16, h: VH - 212 - 8 };
    card(P, '🧭 같은 곳의 위도는 달라질 수 있어요 (석탄층이 있는 곳, 유럽의 예시)');
    const sx = P.x + 46, sy = P.y + 46, sw = PHONE ? 180 : 240, sh = P.h - 66;
    const lat = S.driftV, LY = (la) => sy + sh * (1 - (la + 12) / 102);
    [[-12, 23.5, '#f6d9a2'], [23.5, 66.5, '#cfe9c9'], [66.5, 90, '#dcedf8']].forEach((z) => { ctx.fillStyle = z[2]; ctx.fillRect(sx, LY(z[1]), sw, LY(z[0]) - LY(z[1])); });
    ['열대', '온대', '한대'].forEach((n, i) => D.text(sx + sw - 8, [LY(11.7), LY(45), LY(78)][i] + 5, n, { size: 13, weight: 800, color: 'rgba(51,65,85,.7)', align: 'right' }));
    [0, 30, 60, 90].forEach((la) => { ctx.strokeStyle = 'rgba(51,65,85,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, LY(la)); ctx.lineTo(sx + sw, LY(la)); ctx.stroke(); D.text(sx - 6, LY(la) + 4.5, la + '°', { size: 13, weight: 700, color: '#64748b', align: 'right' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(sx, sy, sw, sh);
    D.text(sx + 2, sy - 8, '북위', { size: 13, weight: 700, color: '#64748b', align: 'left' });
    // 경로 · 대륙 · 석탄층
    const lat0y = LY(DR.lat0), lat1y = LY(DR.lat1), cy = LY(lat), cx = sx + sw * 0.5;
    D.dashedLine(cx, lat0y, cx, lat1y, { color: '#64748b', width: 2.2 });
    D.arrow(cx, lat1y + 16, cx, lat1y + 2, { color: '#64748b', width: 2.2, head: 8 });
    const cwd = sw * 0.62, chd = Math.min(52, sh * 0.2);
    D.shadow(() => { ctx.fillStyle = '#b8a37e'; rr(cx - cwd / 2, cy - chd / 2, cwd, chd, 16).fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#1f2027'; rr(cx - cwd * 0.28, cy - 6, cwd * 0.56, 12, 4).fill();
    D.text(cx, cy - chd / 2 - 7, '석탄층이 있는 대륙', { size: 13, weight: 800, color: '#334155' });
    ctx.fillStyle = 'rgba(100,116,139,.45)'; ctx.beginPath(); ctx.arc(cx, lat0y, 6, 0, TAU); ctx.fill(); D.text(cx + 12, lat0y + 5, '석탄기', { size: 13, weight: 700, color: '#64748b', align: 'left' });
    ctx.fillStyle = 'rgba(100,116,139,.45)'; ctx.beginPath(); ctx.arc(cx, lat1y, 6, 0, TAU); ctx.fill(); D.text(cx + 12, lat1y + 5, '현재', { size: 13, weight: 700, color: '#64748b', align: 'left' });
    // 오른쪽 설명
    const rx = sx + sw + 24, rw = P.x + P.w - rx - 14, z = zoneOf(lat);
    const ma = S.driftV >= DR.t0 ? DR.t0 : S.drift;
    const nowMa = clamp(Math.round(S.drift), 0, DR.t0);
    D.text(rx, sy + 14, nowMa > 0 ? '지금으로부터 약 ' + (nowMa / 100).toFixed(1) + '억 년 전' : '현재', { size: 16, weight: 800, color: '#1b2333', align: 'left' });
    D.text(rx, sy + 42, '위도: 북위 약 ' + Math.round(lat) + '°', { size: 15, weight: 800, color: '#334155', align: 'left' });
    D.label(rx + 58, sy + 70, '기후대: ' + z.n, { bg: shade(z.c, -0.35), size: 14, pad: 8 });
    const msg = lat < 23.5 ? '이때는 적도 가까이에 있어서 따뜻하고 습한 곳이었어요. 양치식물 숲이 늪에 묻혀 석탄이 만들어졌어요.' : '대륙이 이동해 지금은 이 위도에 있어요. 석탄층은 그대로지만 지금의 기후는 달라요.';
    drawWrap(rx, sy + 102, msg, rw, PHONE ? 13 : 14, { align: 'left', weight: 700, lh: 1.4, color: '#334155' });
    drawWrap(rx, P.y + P.h - 26, '※ 이동 경로는 단순하게 그린 모식도예요.', rw, 13, { align: 'left', weight: 700, color: '#64748b' });
  }

  /* ======================================================
     장면 2: 나이테
     ====================================================== */
  const TRL = PHONE ? { x: 8, y: 8, w: 584, h: 440 } : { x: 10, y: 10, w: 390, h: 540 };
  const TRC = PHONE ? { cx: 300, cy: 232, R: 190 } : { cx: 205, cy: 280, R: 165 };
  const TRS = TRC.R / RTOT;
  const BAR = PHONE ? { x: 8, y: 456, w: 584, h: 416 } : { x: 410, y: 10, w: 380, h: 372 };
  const BPL = { x: BAR.x + 48, y: BAR.y + 48, w: BAR.w - 64, h: PHONE ? 250 : 236 };
  const barX = (i) => BPL.x + (BPL.w * i) / NR;
  const barH = (w) => (BPL.h * w) / 3.0;
  function drawTree(t, dt) {
    const { cx, cy } = TRC;
    card(TRL, '🌳 나무 단면 (1830년에 베어 낸 나무, 예시)');
    S.grow = RM ? NR : Math.min(NR, S.grow + dt * 9);
    { const kk = Math.min(NR - 1, Math.floor(S.grow)), inn = kk > 0 ? RCUM[kk - 1] : 0, outNow = (inn + (RCUM[kk] - inn) * clamp(S.grow - kk, 0, 1)) * TRS;
      D.shadow(() => { ctx.fillStyle = '#4a2f18'; ctx.beginPath(); ctx.arc(cx, cy, outNow + 7, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 }); }
    for (let k = NR - 1; k >= 0; k--) {
      const fr = clamp(S.grow - k, 0, 1); if (fr <= 0) continue;
      const inner = k > 0 ? RCUM[k - 1] : 0, outer = inner + (RCUM[k] - inner) * fr;
      const ro = outer * TRS, ri = inner * TRS, rm = ri + (ro - ri) * 0.62;
      ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e2b574'; ctx.beginPath(); ctx.arc(cx, cy, rm, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#6b3f1c'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, TAU); ctx.fill();
    // 세어 본 나이테
    const n = Math.min(S.nCount, NR);
    for (let k = 0; k < n; k++) { const ro = RCUM[k] * TRS; ctx.strokeStyle = k === n - 1 ? '#1d4ed8' : 'rgba(29,78,216,.55)'; ctx.lineWidth = k === n - 1 ? 3 : 1.2; ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.stroke(); }
    if (n > 0) { const ro = RCUM[n - 1] * TRS, a = -0.7; D.label(cx + Math.cos(a) * (ro + 6), cy + Math.sin(a) * (ro + 6) - 8, n + '번째', { bg: '#1d4ed8', size: 13, pad: 6 }); }
    // 고른 해
    if (S.selYear != null) { const k = S.selYear - Y0, ri = (k > 0 ? RCUM[k - 1] : 0) * TRS, ro = RCUM[k] * TRS, rm = (ri + ro) / 2; ctx.strokeStyle = '#e2464b'; ctx.lineWidth = Math.max(3.5, ro - ri + 2); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(cx, cy, rm, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    D.text(cx, TRL.y + TRL.h - 14, '안쪽(1800년)에서 바깥쪽(1830년)으로 한 해에 한 겹씩 자라요', { size: 13, weight: 700, color: '#64748b' });
    // 폭 막대 그래프
    card(BAR, '📊 해마다의 나이테 폭 (mm)');
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(BPL.x, BPL.y, BPL.w, BPL.h);
    [0, 1, 2, 3].forEach((v) => { const yy = BPL.y + BPL.h - barH(v); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(BPL.x, yy); ctx.lineTo(BPL.x + BPL.w, yy); ctx.stroke(); D.text(BPL.x - 6, yy + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    const bw = BPL.w / NR;
    for (let i = 0; i < NR; i++) {
      const h = barH(RW[i]) * clamp(S.grow - i + 1, 0, 1), sel = S.selYear === Y0 + i;
      ctx.fillStyle = sel ? '#e2464b' : '#c98b52'; ctx.fillRect(barX(i) + 1, BPL.y + BPL.h - h, bw - 2, h);
    }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(BPL.x, BPL.y, BPL.w, BPL.h);
    [0, 10, 20, 30].forEach((i) => D.text(barX(i) + bw / 2, BPL.y + BPL.h + 17, String(Y0 + i), { size: 12.5, weight: 700, color: '#64748b' }));
    if (S.selYear != null) { const i = S.selYear - Y0; D.label(clamp(barX(i) + bw / 2, BPL.x + 48, BPL.x + BPL.w - 48), BPL.y + BPL.h - barH(RW[i]) - 16, S.selYear + '년 ' + RW[i].toFixed(1) + ' mm', { bg: '#e2464b', size: 13 }); }
    // 1810~1820년 평균 선
    const my = BPL.y + BPL.h - barH(2.0);
    D.dashedLine(barX(10), my, barX(21), my, { color: '#1d4ed8', width: 2.2 });
    D.label(barX(10), my - 14, '1810~1820년 평균 2.0 mm', { bg: '#1d4ed8', size: 12.5, pad: 6, align: 'left' });
    const IB = { x: BAR.x + 14, y: BPL.y + BPL.h + 30, w: BAR.w - 28 };
    drawWrap(BAR.x + BAR.w / 2, IB.y + 14, S.selYear == null ? '막대나 나이테를 눌러 한 해를 골라 봐요. 폭이 좁으면 그해의 생장 조건이 나빴다는 뜻이에요.' : S.selYear + '년의 나이테 폭은 ' + RW[S.selYear - Y0].toFixed(1) + ' mm예요. 평균보다 ' + (RW[S.selYear - Y0] < 2 ? '좁아요(그해 생장 조건이 좋지 않았어요).' : '넓거나 비슷해요(생장 조건이 좋은 편이에요).'), IB.w, PHONE ? 13 : 13.5, { weight: 700, lh: 1.4, color: '#334155' });
  }
  const treeClick = (p) => {
    // 막대
    if (p.x >= BPL.x && p.x <= BPL.x + BPL.w && p.y >= BPL.y - 6 && p.y <= BPL.y + BPL.h + 4) { const i = clamp(Math.floor(((p.x - BPL.x) / BPL.w) * NR), 0, NR - 1); S.selYear = Y0 + i; S.ringHit = 1; Sound.click(); return true; }
    const d = Math.hypot(p.x - TRC.cx, p.y - TRC.cy) / TRS;
    if (d <= RTOT + 0.6) { let k = RCUM.findIndex((c) => c >= d); if (k < 0) k = NR - 1; S.selYear = Y0 + k; Sound.click(); return true; }
    return false;
  };

  /* ======================================================
     장면 3: 호수 퇴적물의 화분
     ====================================================== */
  function drawPollen(t, dt) {
    card({ x: 8, y: 8, w: VW - 16, h: VH - 16 }, '🌼 호수 퇴적물 속 화분 화석의 비율 (예시 자료)');
    const rows = POL.length, top = PHONE ? 74 : 62, pitch = PHONE ? 150 : 98, rh = PHONE ? 112 : 78;
    // 코어
    const cx0 = 22, cw0 = 44;
    ctx.save(); rr(cx0, top - 6, cw0, pitch * rows - (pitch - rh) + 8, 10).clip();
    const cols = ['#cfc7b8', '#b9ae98', '#a5987c', '#8d7f64']; // 위가 젊음
    for (let i = 0; i < rows; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(cx0, top - 6 + (i * (pitch * rows)) / rows, cw0, pitch * rows / rows + 1); }
    ctx.restore();
    ctx.strokeStyle = '#7a6e58'; ctx.lineWidth = 2; rr(cx0, top - 6, cw0, pitch * rows - (pitch - rh) + 8, 10).stroke();
    D.text(cx0 + cw0 / 2, top - 12, '코어', { size: 13, weight: 800, color: '#64748b' });
    const order = [3, 2, 1, 0];      // 위 = 젊은 것
    order.forEach((pi, r) => {
      const p = POL[pi], y = top + r * pitch, sel = clsPol.sel[p.id];
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx0 + cw0 / 2, y + rh / 2, 8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
      D.text(cx0 + cw0 + 14, y + 18, p.age, { size: 15, weight: 800, color: '#1b2333', align: 'left' });
      if (sel) D.label(cx0 + cw0 + 14 + (PHONE ? 4 : 0), y + 42, sel === 'cold' ? '서늘·한랭' : '따뜻', { bg: sel === 'cold' ? '#3b6fb6' : '#e0742f', size: 13, align: 'left', pad: 7 });
      const bx = PHONE ? 22 + cw0 + 20 : 205, bw = VW - bx - 22, by = PHONE ? y + 74 : y + 6, bh = PHONE ? 34 : 50;
      const segs = [[p.pine, '#2f7d4f', '소나무·가문비'], [p.oak, '#d19a3a', '참나무'], [p.oth, '#a9b2bd', '기타']];
      let xx = bx;
      segs.forEach((sg) => { const w = bw * sg[0] / 100; ctx.fillStyle = sg[1]; ctx.fillRect(xx, by, w, bh); if (w >= 44) D.text(xx + w / 2, by + bh / 2 + 5, sg[0] + ' %', { size: 14, weight: 800, color: '#fff' }); else D.text(xx + w / 2, by - 6, sg[0] + ' %', { size: 13, weight: 800, color: '#334155' }); xx += w; });
      ctx.strokeStyle = 'rgba(51,65,85,.5)'; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by, bw, bh);
    });
    // 범례
    const ly = top + rows * pitch + (PHONE ? 6 : -6);
    [['#2f7d4f', '소나무·가문비(침엽수)'], ['#d19a3a', '참나무(낙엽활엽수)'], ['#a9b2bd', '기타']].forEach((l, i) => { const lx = 24 + i * (PHONE ? 0 : 200), lyy = ly + (PHONE ? i * 26 : 0) + 16; ctx.fillStyle = l[0]; ctx.fillRect(lx, lyy - 11, 15, 15); D.text(lx + 22, lyy + 2, l[1], { size: 13.5, weight: 700, color: '#334155', align: 'left' }); });
    drawWrap(VW / 2, ly + (PHONE ? 100 : 56), '판독 규칙: 침엽수(소나무·가문비)가 많으면 서늘하고 추운 기후, 참나무 같은 낙엽활엽수가 많으면 따뜻한 기후예요.', VW - 48, PHONE ? 13 : 13.5, { weight: 700, lh: 1.4, color: '#334155' });
  }

  /* ======================================================
     장면 4: 빙하 코어와 해양 퇴적물
     ====================================================== */
  const IC = PHONE ? { x: 8, y: 22, w: 76, h: 500, gx0: 204, gx1: 548, pa: { y: 28, h: 216 }, pb: { y: 296, h: 216 }, inset: { x: 176, y: 566, w: 236, h: 106 }, tb: { x: 8, y: 700, w: 584, h: 172 }, cardW: 156 }
    : { x: 14, y: 26, w: 100, h: 506, gx0: 196, gx1: 762, pa: { y: 26, h: 172 }, pb: { y: 228, h: 172 }, inset: { x: 196, y: 452, w: 232, h: 80 }, tb: { x: 438, y: 440, w: 352, h: 112 }, cardW: 142 };
  const gxA = (t) => IC.gx0 + (IC.gx1 - IC.gx0) * (800 - t) / 800;
  const CURVE = [];
  for (let t = 800; t >= 0; t -= 2) CURVE.push({ t, co2: CO2(t), dt: DT(t), d18: D18(t) });
  const yCO2 = (v) => IC.pa.y + IC.pa.h * (1 - (v - 160) / 140);
  const yDT = (v) => IC.pa.y + IC.pa.h * (1 - (v + 14) / 20);
  const yD18 = (v) => IC.pb.y + IC.pb.h * (v - 3.0) / 2.2;
  function drawIce(t, dt) {
    S.depthV = approach(S.depthV, S.depth, dt, 8); S.curveRev = RM ? 1 : Math.min(1.1, S.curveRev + dt * 0.9);
    const age = ageAtDepth(S.depthV), dY = (d) => IC.y + (IC.h * d) / 3270;
    // 얼음 코어
    card({ x: 8, y: 8, w: IC.cardW, h: VH - 16 });
    D.text(IC.x + IC.w / 2, IC.y - 8, '빙하 코어', { size: 13.5, weight: 800, color: '#334155' });
    ctx.save(); rr(IC.x, IC.y, IC.w * (PHONE ? 1 : 0.7), IC.h, 8).clip();
    const gI = ctx.createLinearGradient(IC.x, 0, IC.x + IC.w, 0); gI.addColorStop(0, '#e8f6ff'); gI.addColorStop(0.5, '#ffffff'); gI.addColorStop(1, '#cfe8f7'); ctx.fillStyle = gI; ctx.fillRect(IC.x, IC.y, IC.w, IC.h);
    for (let a = 5; a < 800; a += 5) { const y = dY(depthAtAge(a)); ctx.strokeStyle = a % 50 === 0 ? 'rgba(80,130,180,.55)' : 'rgba(110,160,210,.28)'; ctx.lineWidth = a % 50 === 0 ? 1.4 : 0.8; ctx.beginPath(); ctx.moveTo(IC.x, y); ctx.lineTo(IC.x + IC.w, y); ctx.stroke(); }
    const rb = seeded(5); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(IC.x + 6 + rb() * (IC.w - 12), IC.y + rb() * IC.h, 1 + rb() * 1.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#6aa0cf'; ctx.lineWidth = 2; rr(IC.x, IC.y, IC.w * (PHONE ? 1 : 0.7), IC.h, 8).stroke();
    const colW = IC.w * (PHONE ? 1 : 0.7);
    [[500, '2만 년'], [1000, '7만 년'], [2000, '30만 년'], [3000, '63만 년'], [3270, '80만 년']].forEach((tk) => { const y = dY(tk[0]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(IC.x + colW, y); ctx.lineTo(IC.x + colW + 8, y); ctx.stroke(); const last = tk[0] === 3270; D.text(IC.x + colW + 11, y + (last ? -15 : -2), tk[0] + ' m', { size: 12.5, weight: 800, color: '#334155', align: 'left' }); D.text(IC.x + colW + 11, y + (last ? -2 : 12), tk[1], { size: 12.5, weight: 700, color: '#64748b', align: 'left' }); });
    // 시추 막대
    const rodX = IC.x + colW / 2, yb = dY(S.depthV);
    ctx.fillStyle = '#475569'; ctx.fillRect(rodX - 4, IC.y - 14, 8, yb - IC.y + 14); ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(rodX - 8, yb); ctx.lineTo(rodX + 8, yb); ctx.lineTo(rodX, yb + 14); ctx.closePath(); ctx.fill();
    D.label(rodX, clamp(yb - 14, IC.y + 14, IC.y + IC.h - 14), Math.round(S.depthV) + ' m', { bg: '#f59e0b', size: 13, pad: 6 });
    if (!RM && S.depthV < 3260 && Math.random() < 0.3) parts.emit({ x: rodX + (Math.random() - 0.5) * 18, y: yb + 6, vx: (Math.random() - 0.5) * 30, vy: -20, life: 0.8, size: 1.6, color: 'rgba(255,255,255,.95)', shape: 'bubble', fade: true });
    // 그래프 A: CO2 · 기온
    const A = IC.pa, B = IC.pb, x0 = IC.gx0, x1 = IC.gx1;
    card({ x: IC.cardW + 14, y: A.y - 18, w: VW - IC.cardW - 22, h: B.y + B.h - A.y + 58 });
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(x0, A.y, x1 - x0, A.h); ctx.fillRect(x0, B.y, x1 - x0, B.h);
    [[180, 'co'], [220, 'co'], [260, 'co'], [300, 'co']].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yCO2(v[0])); ctx.lineTo(x1, yCO2(v[0])); ctx.stroke(); D.text(x0 - 5, yCO2(v[0]) + 4.5, String(v[0]), { size: 12.5, weight: 800, color: '#c2501d', align: 'right' }); });
    [-8, -4, 0].forEach((v) => D.text(x1 + 5, yDT(v) + 4.5, (v < 0 ? '−' : '') + Math.abs(v), { size: 12.5, weight: 800, color: '#2563c9', align: 'left' }));
    [3.2, 4.0, 4.8].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(x0, yD18(v)); ctx.lineTo(x1, yD18(v)); ctx.stroke(); D.text(x0 - 5, yD18(v) + 4.5, v.toFixed(1), { size: 12.5, weight: 800, color: '#6d4a1c', align: 'right' }); });
    D.text(x0, A.y - 5, 'CO₂ (ppm)', { size: 13, weight: 800, color: '#c2501d', align: 'left' }); D.text(x1, A.y - 5, '기온 편차 (°C)', { size: 13, weight: 800, color: '#2563c9', align: 'right' });
    D.text(x0, B.y - 5, '해양 유공충 껍질의 δ¹⁸O (‰) · 위쪽이 값이 작은 따뜻한 시기', { size: 13, weight: 800, color: '#6d4a1c', align: 'left' });
    ctx.save(); ctx.beginPath(); ctx.rect(x0, A.y - 2, (x1 - x0) * Math.min(1, S.curveRev), A.h + B.y + B.h - A.y - A.h + 4); ctx.clip();
    const line = (key, fy, col, w2) => { ctx.strokeStyle = col; ctx.lineWidth = w2; ctx.lineJoin = 'round'; ctx.beginPath(); CURVE.forEach((c, i) => (i ? ctx.lineTo(gxA(c.t), fy(c[key])) : ctx.moveTo(gxA(c.t), fy(c[key])))); ctx.stroke(); };
    line('co2', yCO2, '#d9662b', 2.6); line('dt', yDT, '#2d6fd6', 2.2); line('d18', yD18, '#8a5a1f', 2.6);
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, A.y, x1 - x0, A.h); ctx.strokeRect(x0, B.y, x1 - x0, B.h);
    [0, 200, 400, 600, 800].forEach((a) => { D.text(gxA(a), B.y + B.h + 17, a === 0 ? '현재' : (PHONE ? a / 10 + '만' : a / 10 + '만 년 전'), { size: 12.5, weight: 700, color: '#64748b', align: a === 800 ? 'left' : a === 0 ? 'right' : 'center' }); ctx.strokeStyle = 'rgba(100,116,139,.18)'; ctx.beginPath(); ctx.moveTo(gxA(a), A.y); ctx.lineTo(gxA(a), A.y + A.h); ctx.moveTo(gxA(a), B.y); ctx.lineTo(gxA(a), B.y + B.h); ctx.stroke(); });
    // 읽기 상자 (판정용 시기)
    if (S.winShow) GLS.forEach((g) => { const px = gxA(g.t); D.dashedLine(px, A.y, px, A.y + A.h, { color: '#7c3aed', width: 2 }); D.dashedLine(px, B.y, px, B.y + B.h, { color: '#7c3aed', width: 2 }); const L = g.n[0]; D.label(px, A.y + 14, L, { bg: '#7c3aed', size: 13, pad: 7 }); D.label(px, B.y + 14, L, { bg: '#7c3aed', size: 13, pad: 7 }); });
    // CO2 읽은 값 (미션)
    if (S.showCo2) D.dashedLine(x0, yCO2(S.co2Val), x1, yCO2(S.co2Val), { color: '#c2501d', width: 2.2 });
    // 시추 커서
    const cxp = gxA(age);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cxp, A.y); ctx.lineTo(cxp, A.y + A.h); ctx.moveTo(cxp, B.y); ctx.lineTo(cxp, B.y + B.h); ctx.stroke();
    [[cxp, yCO2(CO2(age)), '#d9662b'], [cxp, yDT(DT(age)), '#2d6fd6'], [cxp, yD18(D18(age)), '#8a5a1f']].forEach((d) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d[0], d[1], 6, 0, TAU); ctx.fill(); ctx.fillStyle = d[2]; ctx.beginPath(); ctx.arc(d[0], d[1], 4, 0, TAU); ctx.fill(); });
    D.label(clamp(cxp, x0 + 40, x1 - 40), A.y + 11, fmtAgo(age), { bg: '#f59e0b', size: 12.5, pad: 6 });
    // 연층 확대
    const I = IC.inset; D.text(I.x, I.y - 6, '🔍 이 깊이의 연층', { size: 13, weight: 800, color: '#334155', align: 'left' });
    ctx.save(); rr(I.x, I.y, I.w, I.h, 8).clip(); const mm = layerMm(S.depthV), pitch = mm * 3.2;
    ctx.fillStyle = '#eaf5ff'; ctx.fillRect(I.x, I.y, I.w, I.h);
    for (let k = 0; k * pitch < I.h + pitch; k++) { ctx.fillStyle = '#ffffff'; ctx.fillRect(I.x, I.y + k * pitch, I.w, pitch * 0.55); ctx.fillStyle = '#b9d7ee'; ctx.fillRect(I.x, I.y + k * pitch + pitch * 0.55, I.w, pitch * 0.45); }
    ctx.restore(); ctx.strokeStyle = '#6aa0cf'; ctx.lineWidth = 2; rr(I.x, I.y, I.w, I.h, 8).stroke();
    D.text(I.x + I.w / 2, I.y + I.h + 16, '한 해 쌓인 두께 약 ' + (mm < 10 ? mm.toFixed(1) : Math.round(mm)) + ' mm', { size: 13, weight: 800, color: '#334155' });
    const T2 = IC.tb; card(T2);
    drawWrap(T2.x + T2.w / 2, T2.y + 26 * FS, '읽는 법: CO₂와 기온이 낮으면 빙기, 높으면 간빙기예요. 해양 퇴적물의 δ¹⁸O는 값이 클수록 빙하가 많았던 추운 시기예요. 두 기록의 변화 시기가 서로 맞아요.', T2.w - 24, PHONE ? 13 : 13.5, { weight: 700, lh: 1.4, color: '#334155' });
    D.text(T2.x + T2.w / 2, T2.y + T2.h - 10, '※ 곡선은 학습용 예시 자료예요.', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     장면 5: 고기후 연구 방법 비교
     ====================================================== */
  const lg = (v) => Math.log10(v);
  const EVL = PHONE ? { x0: 128, x1: 570, top: 112, pitch: 74 } : { x0: 124, x1: 444, top: 70, pitch: 42 };
  const exAxis = (v) => EVL.x0 + (EVL.x1 - EVL.x0) * (lg(v) - 1.7) / (9.0 - 1.7);
  const KCOL = { doc: '#7b8798', bio: '#3aa56b', ice: '#3b9ad9', sed: '#b0803f' };
  const REACH_TXT = { hist: '약 2천 년', ring: '약 1만 년', coral: '수천 년', pollen: '수십만 년', ice: '약 80만 년', ocean: '약 1억 년', geo: '수억 년' };
  function drawEval(t, dt) {
    S.evalRev = RM ? 1 : Math.min(1.2, S.evalRev + dt * 1.1);
    card({ x: 8, y: 8, w: VW - 16, h: PHONE ? 660 : 392 });
    const { x0, x1, top, pitch } = EVL;
    D.text(18, 30, '방법', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text((x0 + x1) / 2, 30, '얼마나 먼 과거까지 알 수 있나요? (로그 눈금)', { size: 14, weight: 800, color: '#334155' });
    if (!PHONE) { D.text(452, 30, '시간 해상도', { size: 14, weight: 800, color: '#334155', align: 'left' }); D.text(568, 30, '지역', { size: 14, weight: 800, color: '#334155', align: 'left' }); D.text(670, 30, '알 수 있는 정보', { size: 14, weight: 800, color: '#334155', align: 'left' }); }
    // 눈금
    for (let e = 2; e <= 9; e++) { const x = exAxis(Math.pow(10, e)); ctx.strokeStyle = 'rgba(100,116,139,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, top - 8); ctx.lineTo(x, top + MTH.length * pitch - 6); ctx.stroke(); if (e % 2 === 0 || PHONE === false && false) D.text(x, top + MTH.length * pitch + 10, ['', '', '100년', '', '1만', '', '100만', '', '1억', ''][e], { size: 12.5, weight: 700, color: '#64748b' }); else D.text(x, top + MTH.length * pitch + 10, ['', '', '', '1천', '', '10만', '', '1천만', '', '10억'][e], { size: 12.5, weight: 700, color: '#64748b' }); }
    MTH.forEach((m, i) => {
      const y = top + i * pitch, cyr = y + (PHONE ? 20 : pitch / 2 - 4), bh = PHONE ? 26 : 22, w = (exAxis(m.reach) - x0) * clamp(S.evalRev, 0, 1);
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(100,116,139,.06)'; ctx.fillRect(14, y - 6, VW - 44, pitch - 2); }
      D.text(18, cyr + 5, m.n, { size: 14.5, weight: 800, color: '#1b2333', align: 'left' });
      ctx.fillStyle = KCOL[m.k]; rr(x0, cyr - bh / 2, Math.max(w, 0.1), bh, 5).fill();
      const lab = REACH_TXT[m.id];
      if (w > 96) D.text(x0 + w - 8, cyr + 5, lab, { size: 13, weight: 800, color: '#fff', align: 'right' }); else D.text(x0 + w + 8, cyr + 5, lab, { size: 13, weight: 800, color: '#334155', align: 'left' });
      if (!PHONE) { D.text(452, cyr + 5, m.res, { size: 13.5, weight: 700, color: '#334155', align: 'left' }); D.text(568, cyr + 5, m.area, { size: 13.5, weight: 700, color: '#334155', align: 'left' }); D.text(670, cyr + 5, m.info, { size: 13.5, weight: 700, color: '#334155', align: 'left' }); }
      else D.text(18, cyr + 32, '해상도 ' + m.res + ' · ' + m.area + ' · ' + m.info, { size: 12.5, weight: 700, color: '#475569', align: 'left' });
    });
    // 알고 싶은 시기 (세로선)
    SCEN.forEach((s) => { const x = exAxis(s.need), foc = S.scenFocus === s.id; D.dashedLine(x, top - 4, x, top + MTH.length * pitch - 6, { color: foc ? '#7c3aed' : 'rgba(124,58,237,.55)', width: foc ? 3 : 2 }); D.label(x, top - 18, s.key, { bg: '#7c3aed', size: 13, pad: 7 }); });
    // 시나리오 설명
    const SY = PHONE ? 690 : 408, SH = VH - SY - 8;
    card({ x: 8, y: SY, w: VW - 16, h: SH }, '알고 싶은 시기 (세로선과 같은 글자)');
    let yy = SY + 40 * FS;
    SCEN.forEach((s) => { const foc = S.scenFocus === s.id; D.label(26, yy - 4, s.key, { bg: '#7c3aed', size: 13, pad: 7 }); const used = drawWrap(46, yy, s.label.replace(/^\([a-d]\)\s*/, ''), VW - 70, PHONE ? 12.5 : 13.5, { align: 'left', weight: foc ? 800 : 700, color: foc ? '#4c1d95' : '#334155', lh: 1.25 }); yy = used + (PHONE ? 26 : 25); });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { clues: '🪨 지질 기록 단서', tree: '🌳 나이테', pollen: '🌼 화분 화석', ice: '🧊 빙하 코어와 해양 퇴적물', eval: '📊 고기후 연구 방법 비교' };
  const FREE_KEYS = { clues: ['drift'], tree: ['ring'], pollen: [], ice: ['drill'], eval: [] };
  let ctlKeys = [];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode] : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); if (m === 'tree') S.grow = 0; if (m === 'ice') S.curveRev = 0; if (m === 'eval') S.evalRev = 0; } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); if (b.dataset.mode === 'ice') { S.winShow = true; } updateCtl(); }));
  SciSim.bindRange($('#sDrift'), $('#oDrift'), (v) => (v >= DR.t0 ? '석탄기 (3.2억 년 전)' : v <= 0 ? '현재' : (v / 100).toFixed(1) + '억 년 전'), (v) => { S.drift = v; if (v <= 10) S.seenNow = true; });
  SciSim.bindRange($('#sDrill'), $('#oDrill'), (v) => v + ' m', (v) => { S.depth = v; });
  $('#bRingReset').addEventListener('click', () => { Sound.click(); stpAge.reset(); S.nCount = 0; S.selYear = null; S.grow = 0; });
  $('#bPolReset').addEventListener('click', () => { Sound.click(); clsPol.reset(); });
  function setDrift(v) { S.drift = v; setSlider($('#sDrift'), $('#oDrift'), v, (x) => (x >= DR.t0 ? '석탄기 (3.2억 년 전)' : x <= 0 ? '현재' : (x / 100).toFixed(1) + '억 년 전')); }
  function setDepth(v) { S.depth = v; setSlider($('#sDrill'), $('#oDrill'), v, (x) => x + ' m'); }

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'tree') { treeClick(p); return false; }
      if (S.mode === 'eval') { /* 시나리오 선택은 목록에서 */ return false; }
      return false;
    },
    hover(p) { return S.mode === 'tree' ? 'pointer' : ''; },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    clsClim.reset(); S.seenNow = false; setDrift(DR.t0); S.driftV = drLat(DR.t0);
    stpAge.reset(); S.nCount = 0; S.selYear = null; S.grow = 0; clsPol.reset();
    setDepth(500); S.depthV = 500; stpCo2.reset(); S.co2Val = 250; S.showCo2 = false; S.winShow = false; clsGl.reset();
    selScen.reset(); pairLim.reset(); S.scenFocus = 'sa';
    if (li === 0) { setMode('clues'); setCtl(['clsclim', 'drift']); showHint('암석 단서를 보고 옛 기후를 골라요', 5000); }
    else if (li === 1) { setMode('tree'); setCtl(['ring']); showHint('+ 단추로 나이테를 한 겹씩 세어 봐요', 5000); }
    else if (li === 2) { setMode('ice'); setCtl(['drill']); showHint('깊이 슬라이더로 얼음 코어를 시추해 봐요', 5000); }
    else { setMode('eval'); setCtl([]); showHint('알고 싶은 시기에 알맞은 방법을 골라요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '지질 기록: 암석에 남은 기후', short: '지질 기록', icon: '🪨', phase: '탐구', features: ['clues'],
      intro: '<p class="si-q">❓ 탐구 질문: 아무도 기온을 재지 않았던 시대의 기후를 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 지구의 기후가 시간에 따라 변해 왔다는 것과 <b>퇴적암·화석</b>의 쓰임새를 배웠어요. 이번에는 옛 기후를 알아내는 <b>고기후 연구 방법</b>을 비교해 봐요.</div>' +
        '<p>고기후 연구에서는 기후가 변하는 <b>원인이나 자세한 원리</b>보다, 어떤 기록으로 어떻게 알아내는지 <b>방법</b>을 살펴봐요. 먼저 암석에 남은 흔적(지질 기록)이 알려 주는 옛 기후를 알아보고, 대륙이 움직여 지금 위치와 달랐을 수 있다는 점도 함께 확인해요.</p>',
      setup() { resetStep(0); },
      recap: '빙퇴석·석탄·증발암·산호초 석회암·사막의 사층리 같은 지질 기록은 오래전(수억 년 전) 기후를 알려 줘요. 대륙이 이동하므로 위치는 지금과 다를 수 있어요.',
      summary: '<table class="mini"><tr><th>지질 기록</th><th>알려 주는 옛 기후</th></tr><tr><td>빙퇴석</td><td>한랭(빙하 발달)</td></tr><tr><td>석탄</td><td>따뜻하고 습함</td></tr><tr><td>증발암(석고·암염)</td><td>건조</td></tr><tr><td>사막의 사층리 사암</td><td>건조</td></tr><tr><td>산호초 석회암</td><td>따뜻한 바다</td></tr></table><ul><li>지질 기록은 <b>수억 년 전</b>까지 알 수 있지만 시기를 정확히 정하기는 어렵고 대략적인 기후만 알려 줘요.</li><li>대륙이 이동했기 때문에 지금은 추운 곳에서 석탄이 나와도, 석탄이 만들어질 때는 적도 가까이의 따뜻하고 습한 곳이었을 수 있어요.</li></ul>',
      missions: [
        {
          title: '단서와 옛 기후 짝짓기', manual: true,
          goal: '지질 기록 5개가 알려 주는 <b>옛 기후</b>를 골라요. 그리고 <b>시간 슬라이더</b>를 현재까지 움직여 석탄층이 있는 곳의 위도가 어떻게 달라졌는지 확인해요.',
          hint: '빙하가 운반한 퇴적물은 한랭, 식물이 쌓인 석탄은 따뜻하고 습함, 물이 증발해 남은 결정이나 사막의 모래 언덕은 건조, 산호는 따뜻한 바다예요. 시간 슬라이더를 오른쪽 끝(현재)까지 옮겨 보세요.',
          setup() { clsClim.reset(); S.bad = []; S.seenNow = false; setDrift(DR.t0); setMode('clues'); setCtl(['clsclim', 'drift']); },
          status: () => mark(clsClim.ok()) + ' 짝지은 단서 ' + clsClim.count() + ' / 5 · ' + mark(S.seenNow) + ' 시간 슬라이더를 현재까지',
          check() {
            if (!clsClim.complete()) return '단서 5개를 모두 짝지어 주세요. (지금 ' + clsClim.count() + '개)';
            const w = clsClim.wrong(); clsClim.mark(w); S.bad = w;
            if (w.length) return '빨간 단서 ' + w.length + '개를 다시 확인해 보세요. 어떤 환경에서 만들어지는지 생각해 봐요.';
            if (!S.seenNow) return '시간 슬라이더를 현재(0)까지 움직여 석탄층이 있는 곳의 위도 변화를 확인해 주세요.';
            S.bad = []; return true;
          },
          explain: '빙퇴석은 <b>한랭</b>, 석탄은 <b>따뜻하고 습함</b>, 증발암과 사막의 사층리는 <b>건조</b>, 산호초 석회암은 <b>따뜻한 바다</b>를 알려 줘요. 석탄층이 있는 대륙은 석탄기에 적도 가까이(위도 약 3°)에 있다가 이동해 지금은 위도가 훨씬 높아요(예시).',
        },
        {
          type: 'quiz', title: '북쪽의 석탄층',
          goal: '지금은 추운 북쪽 지방의 지층에서 <b>석탄</b>이 나왔어요. 석탄이 만들어질 때 이곳의 기후와 지금까지의 변화로 알맞은 것은?',
          setup() { setMode('clues'); setCtl(['drift']); },
          choices: ['석탄이 만들어질 때도 지금처럼 추운 기후였어요', '석탄이 만들어질 때는 따뜻하고 습한 곳이었고, 그 뒤 대륙이 이동해 지금 위치로 왔을 수 있어요', '식물이 얼음 속에서 자라 석탄이 되었어요', '석탄은 기후와 관계없이 만들어져요'],
          answer: 1,
          feedback: ['석탄은 식물이 늪에 많이 쌓여야 만들어져서 따뜻하고 습한 기후가 필요해요.', '', '석탄의 재료가 되는 식물은 따뜻하고 습한 곳에서 많이 자라요.', '석탄은 식물이 많이 자라는 따뜻하고 습한 환경에서 만들어져요.'],
          explain: '석탄층은 <b>따뜻하고 습한 기후</b>에서 만들어졌지만, 판이 움직여 <b>대륙이 이동</b>했기 때문에 지금의 위치와 기후는 달라요. 그래서 옛 기후는 지금의 위도가 아니라 <b>당시의 위치</b>로 해석해야 해요.',
        },
      ],
    },
    {
      title: '생물 기록: 나이테와 화분', short: '생물 기록', icon: '🌳', phase: '관찰', features: ['tree'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 암석 속 단서로 수억 년 전의 기후를 대략 알 수 있었어요. 이번에는 <b>살아 있던 생물의 기록</b>으로 더 최근의 기후를 정확히 읽어 봐요.</div>' +
        '<p>나무는 해마다 나이테를 한 겹씩 만들어요. 나이테의 개수로 나이를, 폭으로 그해의 생장 조건(기후)을 알 수 있어요. 호수 바닥에 쌓인 퇴적물에는 주변 식물의 <b>화분(꽃가루)</b>이 남아 있어서, 식물의 종류 비율로 수만 년 전의 기후를 읽을 수 있어요. (측정값은 읽는 규칙만 사용해요.)</p>',
      setup() { resetStep(1); },
      recap: '나이테는 연 단위로 최근 기후를, 화분 화석은 수만~수십만 년 전의 식생과 기후를 알려 줘요. 하나의 요인으로만 해석하면 안 돼요.',
      summary: '<ul><li><b>나이테</b>: 한 해에 한 겹. 겹 수 = 나이, <b>폭이 넓으면 생장이 좋은 해</b>(따뜻하고 습함), 좁으면 나쁜 해. 예시: 1816년(탐보라 화산 분출 이듬해, 여름이 없던 해)은 폭 0.6 mm로 매우 좁아요.</li><li>폭이 좁은 까닭이 추위뿐 아니라 <b>가뭄 등</b>일 수도 있어서 다른 기록과 함께 확인해요.</li><li><b>화분 화석</b>(호수 퇴적물): 침엽수(소나무·가문비) 비율이 높으면 서늘·한랭, 참나무 같은 활엽수 비율이 높으면 따뜻한 기후. 예시: 2만 년 전 소나무·가문비 60 % → 8천 년 전 참나무 55 %(따뜻해짐).</li></ul>',
      missions: [
        {
          title: '나이테 세기와 좁은 해 찾기',
          goal: '나무 단면의 나이테를 <b>한 겹씩 세어(＋ 단추)</b> 나이를 입력하고, 막대 그래프에서 <b>폭이 가장 좁은 해</b>를 눌러요.',
          hint: '＋를 누를 때마다 안쪽부터 한 겹씩 파란 선이 늘어나요. 바깥 껍질 안쪽 마지막 겹까지 세면 돼요. 막대 중에서 가장 짧은 막대를 눌러요.',
          setup() { stpAge.reset(); S.nCount = 0; S.selYear = null; S.grow = 0; setMode('tree'); setCtl(['ring']); },
          check: () => stpAge.value === NR && S.selYear === RMIN, hold: 0.6,
          status: () => mark(stpAge.value === NR) + ' 센 나이테 ' + stpAge.value + '겹 · ' + mark(S.selYear === RMIN) + ' 고른 해 ' + (S.selYear == null ? '—' : S.selYear + '년'),
          explain: '나이테는 모두 <b>31겹</b>(1800~1830년)이라 이 나무는 31살이에요. 폭이 가장 좁은 해는 <b>1816년</b>(0.6 mm)이에요. 1815년 탐보라 화산이 분출해 이듬해 기온이 떨어진, 이른바 \'여름이 없던 해\'였기 때문이에요.',
        },
        {
          title: '화분 비율로 기후 읽기', manual: true,
          goal: '호수 퇴적물에서 얻은 화분 비율을 보고, 각 시기를 <b>서늘·한랭</b> 또는 <b>따뜻</b>으로 분류해요.',
          hint: '소나무·가문비(침엽수)가 참나무보다 많으면 서늘·한랭, 참나무가 더 많으면 따뜻한 시기로 읽어요.',
          setup() { clsPol.reset(); setMode('pollen'); setCtl(['clspol']); },
          status: () => mark(clsPol.ok()) + ' 분류한 시기 ' + clsPol.count() + ' / 4',
          check() {
            if (!clsPol.complete()) return '4개 시기를 모두 분류해 주세요. (지금 ' + clsPol.count() + '개)';
            const w = clsPol.wrong(); clsPol.mark(w);
            if (w.length) return '빨간 시기 ' + w.length + '개를 다시 확인해 보세요. 소나무·가문비와 참나무 중 어느 쪽이 더 많은가요?';
            return true;
          },
          explain: '약 2만 년 전(소나무·가문비 60 %)과 약 1만 4천 년 전(40 %)은 침엽수가 더 많아 <b>서늘·한랭</b>, 약 8천 년 전(참나무 55 %)과 약 2천 년 전(50 %)은 참나무가 더 많아 <b>따뜻</b>한 시기예요. 마지막 빙기가 끝나며 점차 따뜻해졌어요.',
        },
        {
          type: 'quiz', title: '좁은 나이테의 해석',
          goal: '어떤 해의 나이테 폭이 좁았어요. 이것만으로 알 수 있는 사실로 알맞은 것은?',
          setup() { setMode('tree'); S.grow = NR; setCtl([]); },
          choices: ['그해는 반드시 기온이 낮았어요', '가뭄이나 병충해 같은 다른 요인으로도 좁아질 수 있어서, 다른 기록과 함께 확인해요', '나이테 폭은 기후와 관계가 없어요', '나이테 폭이 좁으면 홍수가 났다는 뜻이에요'],
          answer: 1,
          feedback: ['기온이 낮아서일 수도 있지만 가뭄 등 다른 이유로도 폭이 좁아져요.', '', '나이테 폭은 그해의 생장 조건(기온·강수 등)을 반영해요.', '홍수와 나이테 폭의 관계를 이렇게 단정할 수는 없어요.'],
          explain: '나이테 폭은 <b>생장 조건 전체</b>의 결과예요. 좁다고 항상 추웠다고 단정할 수 없으니 역사 기록 같은 <b>다른 기록과 교차 확인</b>해요.',
        },
      ],
    },
    {
      title: '빙하와 퇴적물: 80만 년의 기록', short: '빙하·퇴적물', icon: '🧊', phase: '분석', features: ['ice'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 나이테와 화분으로 최근 수만 년의 기후를 읽었어요. 이번에는 더 먼 과거를 담은 <b>빙하 코어</b>와 <b>해양 퇴적물</b>을 살펴봐요.</div>' +
        '<p>극지방의 빙하는 눈이 해마다 쌓여 만들어져서 연층이 보이고, 얼음 속 <b>기포</b>에는 그때의 공기가 갇혀 있어서 이산화 탄소(CO₂) 농도를 알 수 있어요. 해양 퇴적물에는 유공충 껍데기가 쌓여 있어서 <b>산소 동위 원소 비</b>로 빙하가 많았던 시기를 알 수 있어요. (측정 원리는 다루지 않고 읽는 규칙만 사용해요.)</p>',
      setup() { resetStep(2); },
      recap: '빙하 코어는 최근 약 80만 년의 CO₂와 기온을, 해양 퇴적물은 더 오래된 빙하량의 변화를 알려 줘요. 두 기록 모두 빙기와 간빙기가 반복된 것을 보여 줘요.',
      summary: '<ul><li><b>빙하 코어</b>: 연층을 세어 나이를 알고, 기포의 CO₂ 농도와 얼음의 성질로 기온을 추정해요. 최대 약 80만 년. 깊을수록 눌려서 <b>연층이 얇아져요</b>.</li><li><b>해양 퇴적물</b>: 유공충 껍데기의 산소 동위 원소 비가 <b>높을수록 빙하가 많았던 추운 시기</b>. 수백만~1억 년까지.</li><li>두 기록에서 모두 약 10만 년 간격으로 <b>빙기와 간빙기</b>가 반복돼요. 예시: 약 2만 년 전 빙기에 CO₂는 약 180 ppm, 간빙기에는 약 280 ppm.</li></ul>',
      missions: [
        {
          title: '2만 년 전의 얼음 찾기',
          goal: '깊이 슬라이더로 약 <b>2만 년 전</b>의 얼음이 있는 깊이까지 시추하고, 그때의 <b>CO₂ 농도(ppm)</b>를 읽어 입력해요.',
          hint: '깊이를 바꾸면 위의 노란 선이 나이를 가리켜요. 약 2만 년 전은 깊이 500 m 근처예요. 그 위치에서 주황색 CO₂ 곡선의 값을 읽어요. (5 ppm 단위)',
          setup() { setDepth(1500); S.depthV = 1500; stpCo2.reset(); S.co2Val = 250; S.showCo2 = true; S.winShow = false; setMode('ice'); setCtl(['drill', 'co2']); },
          check: () => S.depth >= 480 && S.depth <= 520 && stpCo2.value === 180, hold: 0.6,
          status: () => mark(S.depth >= 480 && S.depth <= 520) + ' 깊이 ' + S.depth + ' m (' + fmtAgo(ageAtDepth(S.depth)) + ') · ' + mark(stpCo2.value === 180) + ' CO₂ ' + stpCo2.value + ' ppm',
          explain: '깊이 약 500 m의 얼음이 <b>약 2만 년 전</b>이고, 이때는 마지막 빙기여서 CO₂가 <b>약 180 ppm</b>으로 가장 낮은 수준이었어요. 간빙기에는 약 280 ppm까지 올라가요. 깊이와 나이의 관계는 예시 자료예요.',
        },
        {
          title: '두 기록으로 빙기·간빙기 판정', manual: true,
          goal: '그래프의 시기 A~D를 두 기록(빙하 코어의 CO₂·기온, 해양 퇴적물의 δ¹⁸O)으로 보고 <b>빙기</b> 또는 <b>간빙기</b>로 판정해요.',
          hint: 'CO₂와 기온이 낮고 δ¹⁸O 값이 큰 시기(그래프에서는 아래쪽)가 빙기예요. 반대로 CO₂와 기온이 높고 δ¹⁸O가 작으면 간빙기예요.',
          setup() { clsGl.reset(); S.winShow = true; S.showCo2 = false; setMode('ice'); setCtl(['clsgl']); },
          status: () => mark(clsGl.ok()) + ' 판정한 시기 ' + clsGl.count() + ' / 4',
          check() {
            if (!clsGl.complete()) return '시기 4개를 모두 판정해 주세요. (지금 ' + clsGl.count() + '개)';
            const w = clsGl.wrong(); clsGl.mark(w);
            if (w.length) return '빨간 시기 ' + w.length + '개를 다시 확인해 보세요. 두 기록이 함께 가리키는 방향을 봐요.';
            return true;
          },
          explain: 'A(약 2만 년 전)와 C(약 15만 년 전)는 CO₂·기온이 낮고 δ¹⁸O가 큰 <b>빙기</b>, B(약 12만 5천 년 전)와 D(약 24만 년 전)는 CO₂·기온이 높고 δ¹⁸O가 작은 <b>간빙기</b>예요. 서로 다른 두 기록의 변화 시기가 맞아서 결과를 믿을 수 있어요.',
        },
        {
          type: 'quiz', title: '깊을수록 얇은 연층',
          goal: '빙하 코어에서 깊은 곳의 연층은 위쪽 연층보다 훨씬 얇아요. 그 까닭은?',
          setup() { setDepth(2500); S.showCo2 = false; S.winShow = false; setMode('ice'); setCtl(['drill']); },
          choices: ['깊은 곳은 눈이 적게 내렸기 때문이에요', '위에 쌓인 눈과 얼음의 무게에 눌려 얇아지기 때문이에요', '깊은 곳의 얼음이 녹았기 때문이에요', '깊은 곳은 연층이 만들어지지 않기 때문이에요'],
          answer: 1,
          feedback: ['눈이 적게 내린 것이 아니라, 쌓인 뒤에 위의 무게로 눌려 얇아진 거예요.', '', '깊은 곳도 얼어 있어서 연층이 남아 있어요. 오히려 눌려서 얇아졌어요.', '연층은 해마다 만들어졌고, 깊은 곳에서는 눌려서 얇게 보일 뿐이에요.'],
          explain: '해마다 쌓인 눈은 위에 계속 쌓이는 눈과 얼음의 <b>무게에 눌려</b> 점점 얇아져요. 그래서 깊을수록 1년의 기록이 얇은 층에 들어 있고, 같은 깊이에 더 오래된 기록이 담겨 있어요.',
        },
      ],
    },
    {
      title: '방법 평가: 어떤 기록을 쓸까', short: '방법 평가', icon: '📊', phase: '적용', features: ['eval'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지질 기록·나이테·화분·빙하 코어·해양 퇴적물을 차례로 살펴봤어요. 이번에는 이 방법들을 <b>비교하고 평가</b>해서, 알고 싶은 시기와 정보에 가장 알맞은 방법을 골라요.</div>' +
        '<p>방법마다 <b>얼마나 먼 과거까지</b> 알 수 있는지(시간 범위), 얼마나 <b>촘촘하게</b> 알 수 있는지(시간 해상도), <b>어느 지역</b>에서 얻을 수 있는지, 어떤 <b>정보</b>를 주는지가 달라요. 장단점을 알아야 알맞은 방법을 고를 수 있어요.</p>',
      setup() { resetStep(3); },
      recap: '고기후 연구 방법은 시간 범위, 해상도, 지역, 알 수 있는 정보가 서로 달라서 목적에 맞게 고르고, 여러 방법의 결과를 교차 확인해요.',
      summary: '<table class="mini"><tr><th>방법</th><th>시간 범위</th><th>해상도</th><th>정보</th></tr><tr><td>역사 기록</td><td>수백~2천 년</td><td>일~연</td><td>기온·강수·가뭄</td></tr><tr><td>나이테</td><td>수천~1만 년</td><td>연</td><td>생장 조건</td></tr><tr><td>산호 성장선</td><td>수백~수천 년</td><td>월~연</td><td>수온</td></tr><tr><td>화분 화석</td><td>수만~수십만 년</td><td>수십~수백 년</td><td>식생</td></tr><tr><td>빙하 코어</td><td>최대 약 80만 년</td><td>연~수십 년</td><td>CO₂·기온</td></tr><tr><td>해양 퇴적물</td><td>수백만~1억 년</td><td>수천 년</td><td>빙하량</td></tr><tr><td>지질 기록</td><td>수억 년</td><td>만 년 이상</td><td>한랭·온난·건조</td></tr></table><ul><li>한 가지 방법만 쓰지 않고 <b>여러 방법의 결과를 교차 확인</b>해요.</li></ul>',
      missions: [
        {
          title: '상황에 알맞은 방법 고르기', manual: true,
          goal: '알고 싶은 시기와 정보가 다른 4가지 상황(a~d)에 <b>가장 알맞은 방법</b>을 골라요.',
          hint: '표에서 세로선(알고 싶은 시기)에 닿는 막대의 방법만 쓸 수 있어요. 그중에서 알고 싶은 정보(가뭄, CO₂, 식생, 대략의 기후)를 주는 방법을 골라요.',
          setup() { selScen.reset(); S.scenFocus = 'sa'; setMode('eval'); setCtl(['selscen']); },
          status: () => mark(selScen.ok()) + ' 고른 상황 ' + selScen.count() + ' / 4',
          check() {
            if (!selScen.complete()) return '4가지 상황 모두에서 방법을 골라 주세요. (지금 ' + selScen.count() + '개)';
            const w = selScen.wrong(); selScen.mark(w); w.length && (S.scenFocus = w[0]);
            if (w.length) return '빨간 상황 ' + w.length + '개를 다시 확인해 보세요. 막대가 세로선에 닿는지, 알고 싶은 정보를 주는지 함께 봐요.';
            return true;
          },
          explain: '(a) 약 500년 전 가뭄 → <b>역사 기록</b>(나이테로도 가능), (b) 80만 년의 CO₂ → <b>빙하 코어</b>(기포 속 공기), (c) 2만 년 전 한반도의 식생 → <b>화분 화석</b>(호수 퇴적물), (d) 2억 년 전의 대략적인 기후 → <b>지질 기록</b>이에요. 해양 퇴적물은 약 1억 년까지만 닿아요.',
        },
        {
          title: '방법별 한계 짝짓기', manual: true,
          goal: '방법 4가지와 각각의 <b>한계(단점)</b>를 짝지어요.',
          hint: '극지에서만 얻는 방법, 나무가 자란 기간까지만 알 수 있는 방법, 한 층이 쌓이는 데 오래 걸려 거칠게만 알 수 있는 방법, 시기를 정확히 정하기 어려운 방법을 떠올려 봐요.',
          setup() { pairLim.reset(); setMode('eval'); setCtl(['pairlim']); },
          status: () => mark(pairLim.ok()) + ' 짝지은 방법 ' + pairLim.count() + ' / 4',
          check() {
            if (!pairLim.complete()) return '방법 4개를 모두 짝지어 주세요. (지금 ' + pairLim.count() + '개)';
            const w = pairLim.wrong(); pairLim.mark(w);
            if (w.length) return '빨간 짝 ' + w.length + '개를 다시 확인해 보세요. 표의 시간 해상도와 지역 열이 단서예요.';
            return true;
          },
          explain: '빙하 코어는 <b>극지·고산에서만</b>, 나이테는 나무가 자란 <b>약 1만 년까지만</b>, 해양 퇴적물은 해상도가 <b>수천 년 단위</b>로 낮고, 지질 기록은 <b>대략적인 기후만</b> 알 수 있어요. 방법마다 장단점이 서로 보완돼요.',
        },
        {
          type: 'quiz', title: '여러 방법을 함께 쓰는 까닭',
          goal: '고기후를 연구할 때 한 가지 방법만 쓰지 않고 여러 방법의 결과를 함께 비교하는 까닭은?',
          setup() { setMode('eval'); setCtl([]); },
          choices: ['한 가지 방법만 써도 모든 시기와 지역을 알 수 있기 때문이에요', '방법마다 시간 범위·해상도·지역이 달라 한계가 있어서, 결과를 교차 확인하면 더 믿을 수 있기 때문이에요', '방법이 많을수록 같은 결과가 나오기 때문이에요', '서로 다른 방법의 결과는 항상 같아서 비교할 필요가 없기 때문이에요'],
          answer: 1,
          feedback: ['각 방법은 닿는 시기와 지역이 달라서 한 가지로 모든 시기를 알 수는 없어요.', '', '방법이 많다고 결과가 저절로 같아지지는 않아요. 서로 비교해 믿을 만한지 확인해요.', '결과가 다를 수 있어서 서로 비교하며 확인해야 해요.'],
          explain: '방법마다 <b>시간 범위·해상도·지역·알 수 있는 정보</b>가 달라 한계가 있어요. 여러 방법의 결과가 서로 맞으면(예: 빙하 코어의 CO₂와 해양 퇴적물의 빙하량) 해석을 더 믿을 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-paleoclimate', mount: '#game', badge: '고기후 탐정', homeHref: '../../index.html#he',
    featureLabels: { clues: '🪨 지질 기록 · 대륙 이동 모식도', tree: '🌳 나이테 · 🌼 화분 화석', ice: '🧊 빙하 코어 · 해양 퇴적물 곡선', eval: '📊 고기후 연구 방법 비교표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'clues') { const la = S.driftV; setReadouts(['시간', S.drift >= DR.t0 ? '석탄기 (3.2억 년 전)' : S.drift <= 0 ? '현재' : (Math.round(S.drift) / 100).toFixed(1) + '억 년 전', '위도', '북위 ' + Math.round(la) + '°', '기후대', zoneOf(la).n]); }
    else if (m === 'tree') setReadouts(['센 나이테', stpAge.value + '겹', '고른 해', S.selYear == null ? '—' : S.selYear + '년', '나이테 폭', S.selYear == null ? '—' : RW[S.selYear - Y0].toFixed(1) + ' mm']);
    else if (m === 'pollen') setReadouts(['분류한 시기', clsPol.count() + ' / 4', '가장 오래된 시기', '약 2만 년 전', '자료', '예시 자료']);
    else if (m === 'ice') { const a = ageAtDepth(S.depth); setReadouts(['깊이', S.depth + ' m', '나이', fmtAgo(a), 'CO₂', Math.round(CO2(a) / 5) * 5 + ' ppm']); }
    else setReadouts(['방법', '7가지', '고른 상황', selScen.count() + ' / 4', '짝지은 한계', pairLim.count() + ' / 4']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) { S.winShow = true; S.showCo2 = false; } updateCtl(); }
    S.driftV = approach(S.driftV, drLat(S.drift), dt, 7);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'clues') drawClues(t, dt);
    else if (S.mode === 'tree') drawTree(t, dt);
    else if (S.mode === 'pollen') drawPollen(t, dt);
    else if (S.mode === 'ice') drawIce(t, dt);
    else drawEval(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    VW, VH, S, PHONE, CLUES, RW, RMIN, NR, POL, GLS, SCEN, MTH, DR, clsClim, clsPol, clsGl, selScen, pairLim, stpAge, stpCo2, ageAtDepth, CO2, DT, D18, TRC, TRS, RCUM, BPL, barX, IC, gxA, EVL, exAxis, treeClick,
    get game() { return game; }, setMode, setDrift, setDepth, resetStep, updateCtl, layerMm,
    solveClues() { CLUES.forEach((c) => { clsClim.sel[c.id] = c.ans; }); },
  };

})();
