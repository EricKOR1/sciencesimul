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

  /* ======================================================
     전향력과 에크만 수송 (전향력 → 에크만 나선 → 에크만 수송 → 용승·침강)
     ====================================================== */
  initStage('#e8f1f8', 800, 560, 520, 880, 1.22);
  let game = null;
  const DEG = Math.PI / 180;
  const OMEGA = 7.29e-5, RHO = 1025;
  const fOf = (lat) => 2 * OMEGA * Math.sin(lat * DEG);
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  function sci(x, d) {
    if (x === 0) return '0';
    const neg = x < 0; x = Math.abs(x);
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (+m.toFixed(d) >= 10) { m /= 10; e += 1; }
    return (neg ? '−' : '') + m.toFixed(d) + '×10' + sup(e);
  }
  const compass = (h) => ['북', '동', '남', '서'][Math.round((((h % 360) + 360) % 360) / 90) % 4];
  const vecOf = (h) => [Math.sin(h * DEG), -Math.cos(h * DEG)];
  const angNorm = (a) => ((a % 360) + 360) % 360;
  const angDiff = (a, b) => { let d = angNorm(a - b); if (d > 180) d -= 360; return d; };
  const approachAng = (cur, tgt, dt, rate) => { const d = angDiff(tgt, cur); return RM ? tgt : cur + d * (1 - Math.exp(-rate * dt)); };

  const S = {
    mode: 'cor', fade: 0, clock: 0,
    // 전향력
    lat: 0, latV: 0, auto: 0, parts: [],
    // 에크만 나선
    wind: 0, windV: 0, meas: {}, g: {}, sumT: 0, sumOn: false, net: null, angIn: 0,
    // 에크만 수송
    tau: 0.10, tauV: 0.10, lat3: 30, lat3V: 30, hem: 'N', stage3: 0, names: false, wp: [], wpT: 0,
    // 용승·침강
    scene: 'ca', wd2: { ca: 0, pe: 180, eq: 90 }, wd2V: 0, sV: [0, 0], hit: { ca: false, pe: false, eq: false }, upT: { ca: 0, pe: 0, eq: 0 },
    sec: [], sst: [], secInit: '',
  };
  const fN = (x, d) => Number(x).toFixed(d);
  const TAU2 = Math.PI * 2;
  const SPR = {};
  function sprite(color, r, gloss) {
    const key = color + '|' + r + '|' + gloss; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color, { gloss });
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color, gloss) { const s = sprite(color, Math.round(r * 2) / 2, gloss); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }
  const LAY = [0, 25, 50, 100];
  const V0 = 20, DZ = 100;
  const spTh = (z) => 45 + (180 * z) / DZ;
  const spV = (z) => V0 * Math.exp((-Math.PI * z) / DZ);

  const phoneRC = (a, b) => (PHONE ? a : b);
  /* 장면별 그림 상자 */
  function rcOf(mode) {
    if (mode === 'cor') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 470 }, B: { x: 8, y: 486, w: 504, h: 214 } }, { A: { x: 12, y: 12, w: 556, h: 536 }, B: { x: 576, y: 12, w: 212, h: 536 } });
    if (mode === 'spiral') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 330 }, B: { x: 8, y: 346, w: 504, h: 230 }, C: { x: 8, y: 584, w: 504, h: 288 } }, { A: { x: 12, y: 12, w: 392, h: 536 }, B: { x: 412, y: 12, w: 376, h: 264 }, C: { x: 412, y: 284, w: 376, h: 264 } });
    if (mode === 'balance') return phoneRC({ A: { x: 8, y: 8, w: 504, h: 330 }, B: { x: 8, y: 346, w: 504, h: 526 } }, { A: { x: 12, y: 12, w: 380, h: 536 }, B: { x: 400, y: 12, w: 388, h: 536 } });
    return phoneRC({ A: { x: 8, y: 8, w: 504, h: 330 }, B: { x: 8, y: 346, w: 504, h: 526 } }, { A: { x: 12, y: 12, w: 316, h: 536 }, B: { x: 336, y: 12, w: 452, h: 536 } });
  }

  /* 바람 줄무늬 (공통) */
  const STREAK = Array.from({ length: 16 }, (_, i) => ({ u: (i * 0.37) % 1, v: (i * 0.61 + 0.13) % 1, l: 0.5 + ((i * 7) % 5) / 10 }));
  function windStreaks(R, h, t, color, alpha) {
    const [dx, dy] = vecOf(h);
    ctx.save(); ctx.beginPath(); ctx.rect(R.x + 2, R.y + 2, R.w - 4, R.h - 4); ctx.clip();
    ctx.strokeStyle = rgba(color || '#ffffff', alpha != null ? alpha : 0.55); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const span = Math.hypot(R.w, R.h), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    STREAK.forEach((s) => {
      const along = ((s.u + t * 0.16 * (RM ? 0 : 1)) % 1) * span - span / 2, across = (s.v - 0.5) * span * 0.9;
      const x = cx + dx * along - dy * across, y = cy + dy * along + dx * across, L = 26 + 26 * s.l;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * L, y + dy * L); ctx.stroke();
    });
    ctx.restore();
  }
  const ocean = (R, c1, c2) => {
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, c1 || '#d3ecfa'); g.addColorStop(1, c2 || '#a9d4ee');
    ctx.fillStyle = g; rr(R.x, R.y, R.w, R.h, 14).fill();
  };
  const NS = (R) => {
    D.text(R.x + R.w - 18, R.y + 22 * FS, 'N', { size: 14, weight: 900, color: '#1e3a8a' });
    D.arrow(R.x + R.w - 18, R.y + 48 * FS, R.x + R.w - 18, R.y + 26 * FS + 6, { color: '#1e3a8a', width: 2.5, head: 8 });
  };
  const arrowS = (x1, y1, x2, y2, o) => { // 짧은 화살표도 길이에 비례해서 그림
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.8) return;
    D.arrow(x1, y1, x2, y2, Object.assign({}, o, { head: Math.min((o && o.head) || 12, L * 0.62), width: Math.min((o && o.width) || 4, Math.max(1.2, L * 0.45)) }));
  };

  /* ======================================================
     장면 1: 전향력 — 위도에 따라 휘는 물덩이
     ====================================================== */
  const SPD_T = 2.2;
  function launch() {
    const A = rcOf('cor').A, u = Math.min(A.w, A.h) / 2 - 22;
    [0, 90, 180, 270].forEach((h) => S.parts.push({ x: A.x + A.w / 2, y: A.y + A.h / 2, h0: h, h: h * DEG, age: 0, tr: [], life: SPD_T, u }));
    S.auto = 0;
  }
  function corStep(dt) {
    S.latV = approach(S.latV, S.lat, dt, 9);
    S.auto += dt;
    if (S.auto > 3.6) launch();
    const sn = Math.sin(S.latV * DEG);
    S.parts.forEach((p) => {
      p.age += dt;
      if (p.age <= p.life) {
        const sp = p.u / SPD_T, R = 0.45 * p.u;
        p.h += (sn / R) * sp * dt;
        p.x += Math.sin(p.h) * sp * dt; p.y -= Math.cos(p.h) * sp * dt;
        p.tr.push([p.x, p.y]); if (p.tr.length > 220) p.tr.shift();
      }
    });
    S.parts = S.parts.filter((p) => p.age < p.life + 1.2);
  }
  function globe(cx, cy, r, lat) {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#9fd8f5'); g.addColorStop(0.6, '#3b8fd0'); g.addColorStop(1, '#1d4f8f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    [-60, -30, 0, 30, 60].forEach((l) => { const y = cy - r * Math.sin(l * DEG); ctx.beginPath(); ctx.moveTo(cx - r, y); ctx.lineTo(cx + r, y); ctx.stroke(); });
    [-60, -30, 0, 30, 60].forEach((m) => { ctx.beginPath(); ctx.ellipse(cx, cy, r * Math.abs(Math.sin(m * DEG)), r, 0, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2.5; const yl = cy - r * Math.sin(lat * DEG); ctx.beginPath(); ctx.moveTo(cx - r, yl); ctx.lineTo(cx + r, yl); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy - r * 0.5, r * 0.28, r * 0.15, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - r - 12); ctx.lineTo(cx, cy + r + 12); ctx.stroke();
    const yl2 = cy - r * Math.sin(lat * DEG), xr = Math.sqrt(Math.max(0, r * r - (yl2 - cy) * (yl2 - cy)));
    D.sphere(cx, yl2, 6, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.arrow(cx - r * 0.55, cy + r * 0.12, cx + r * 0.55, cy + r * 0.12, { color: '#f8fafc', width: 2.5, head: 8 });
    D.text(cx, cy + r + 20 * FS, '자전 (서 → 동)', { size: 12, weight: 800, color: '#334155' });
    D.text(cx + xr * 0.0, cy - r - 17 * FS, 'N', { size: 12.5, weight: 900, color: '#334155' });
  }
  function latText(l) { return l === 0 ? '0° (적도)' : Math.abs(l) + '°' + (l > 0 ? 'N' : 'S'); }
  function drawCor(t, dt) {
    const { A, B } = rcOf('cor');
    corStep(dt);
    ocean(A);
    // 격자
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let x = A.x + A.w / 2 % 56; x < A.x + A.w; x += 56) { ctx.beginPath(); ctx.moveTo(x, A.y); ctx.lineTo(x, A.y + A.h); ctx.stroke(); }
    for (let y = A.y + A.h / 2 % 56; y < A.y + A.h; y += 56) { ctx.beginPath(); ctx.moveTo(A.x, y); ctx.lineTo(A.x + A.w, y); ctx.stroke(); }
    ctx.restore();
    NS(A);
    D.text(A.x + 14, A.y + 22 * FS, '🌊 위에서 내려다본 바다 (' + (S.lat >= 0 ? '북' : '남') + '반구 기준 위도 ' + latText(S.lat) + ')', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2, u = Math.min(A.w, A.h) / 2 - 22;
    // 전향력이 없다면 가는 길 (점선)
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    [0, 90, 180, 270].forEach((h) => { const [dx, dy] = vecOf(h); D.dashedLine(cx, cy, cx + dx * u, cy + dy * u, { color: 'rgba(30,58,138,.35)', width: 2, dash: [5, 6] }); });
    D.sphere(cx, cy, 7, '#334155', { gloss: false });
    // 자취와 물덩이
    S.parts.forEach((p) => {
      const fadeA = p.age <= p.life ? 1 : clamp(1 - (p.age - p.life) / 1.2, 0, 1);
      if (p.tr.length > 1) {
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const n = p.tr.length, ch = 10;
        for (let s0 = 0; s0 < n - 1; s0 += ch) {
          const s1 = Math.min(n - 1, s0 + ch), a = (s1 / n) * 0.85 * fadeA;
          ctx.strokeStyle = 'rgba(14,116,144,' + a.toFixed(3) + ')'; ctx.lineWidth = 3 + 3 * (s1 / n);
          ctx.beginPath(); ctx.moveTo(p.tr[s0][0], p.tr[s0][1]); for (let i = s0 + 1; i <= s1; i++) ctx.lineTo(p.tr[i][0], p.tr[i][1]); ctx.stroke();
        }
      }
      if (p.age <= p.life) {
        ball(p.x, p.y, 9, '#0ea5e9', true);
        const sn = Math.sin(S.latV * DEG);
        if (Math.abs(sn) > 0.02) {
          const rh = p.h + Math.sign(sn) * (Math.PI / 2), L = 16 + 50 * Math.abs(sn);
          arrowS(p.x, p.y, p.x + Math.sin(rh) * L, p.y - Math.cos(rh) * L, { color: '#f97316', width: 4, head: 11 });
        }
      }
    });
    ctx.restore();
    if (Math.abs(S.latV) < 1.2) D.label(cx, A.y + A.h - 30 * FS, '적도: 전향력 0 → 직진', { bg: '#334155', size: 13.5 });
    else D.label(cx, A.y + A.h - 30 * FS, S.lat > 0 ? '북반구: 운동 방향의 오른쪽으로 휘어요 (주황 화살표 = 전향력)' : '남반구: 운동 방향의 왼쪽으로 휘어요 (주황 화살표 = 전향력)', { bg: '#c2410c', size: 13 });
    // 오른쪽(또는 아래) 패널
    card(B, '🌐 지구와 전향력');
    const f = fOf(S.latV), horiz = B.w > B.h * 0.9;
    const gx = horiz ? B.x + 84 : B.x + B.w / 2, gy = horiz ? B.y + B.h / 2 + 8 : B.y + 120, gr = horiz ? 52 : 56;
    globe(gx, gy, gr, S.latV);
    const bx = horiz ? B.x + 170 : B.x + 16, bw = horiz ? B.w - 190 : B.w - 32, by = horiz ? B.y + 44 : B.y + 238;
    D.text(bx, by, '전향 매개변수 f = 2Ω sinφ', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const fmax = 2 * OMEGA;
    ctx.fillStyle = '#e2e8f0'; rr(bx, by + 10, bw, 16, 8).fill();
    const fw = bw * clamp(Math.abs(f) / fmax, 0, 1);
    if (fw > 0.5) { ctx.fillStyle = f >= 0 ? '#f97316' : '#8b5cf6'; rr(bx, by + 10, Math.max(fw, 0), 16, 8).fill(); }
    D.text(bx, by + 44, 'f = ' + (Math.abs(f) < 1e-9 ? '0' : sci(Math.abs(S.latV) < 0.05 ? 0 : f, 2)) + ' s⁻¹', { size: 15, weight: 900, color: '#9a3412', align: 'left' });
    D.text(bx, by + 44 + 20 * FS, '0 ~ 1.46×10⁻⁴ (극에서 최대)', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
    const sy2 = by + 44 + 56 * FS;
    D.text(bx, sy2, '물덩이의 속력 |v|', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(bx, sy2 + 10, bw, 16, 8).fill(); ctx.fillStyle = '#0ea5e9'; rr(bx, sy2 + 10, bw, 16, 8).fill();
    D.text(bx, sy2 + 44, '1.00 m/s → 늘 같아요', { size: 15, weight: 900, color: '#075985', align: 'left' });
    D.text(bx, sy2 + 44 + 20 * FS, '방향만 바뀌고 속력은 그대로', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
  }
  function readCor() {
    const f = fOf(S.lat);
    setReadouts(['위도', latText(S.lat), '전향 매개변수 f', S.lat === 0 ? '0 s⁻¹' : sci(f, 2) + ' s⁻¹', '전향 가속도 a = f·v (v = 1 m/s)', S.lat === 0 ? '0 m/s²' : sci(Math.abs(f), 2) + ' m/s²']);
  }

  /* ======================================================
     장면 2: 에크만 나선 — 층마다 오른쪽으로 더 돌고 더 느려져요
     ====================================================== */
  const layCol = (z) => mixc('#38bdf8', '#1e3a8a', z / DZ);
  const NCH = 10;
  const CH = Array.from({ length: NCH }, (_, k) => 5 + (k * DZ) / NCH);          // 10 m 두께 층의 가운데 깊이
  function netVec() {
    let sx = 0, sy = 0;
    CH.forEach((z) => { const h = (S.windV + spTh(z)) * DEG, v = spV(z); sx += v * Math.sin(h); sy -= v * Math.cos(h); });
    return { sx, sy };
  }
  function netRel() { // 바람 방향 기준 합 벡터의 각도(오른쪽, 도)
    const { sx, sy } = netVec();
    return angNorm(Math.atan2(sx, -sy) / DEG - S.windV);
  }
  function spiralStep(dt) {
    S.windV = approachAng(S.windV, S.wind, dt, 7);
    LAY.forEach((z) => { const tg = S.meas[z] || (game && game.free) ? 1 : 0; S.g[z] = approach(S.g[z] || 0, tg, dt, 7); });
    if (S.sumOn) S.sumT = Math.min(1, S.sumT + dt / (RM ? 0.01 : 3.4)); else S.sumT = 0;
  }
  function drawSpiral(t, dt) {
    const { A, B, C } = rcOf('spiral');
    spiralStep(dt);
    const free = !!(game && game.free);
    // ----- A: 위에서 본 모습
    ocean(A, '#d9eefb', '#b4daf0');
    NS(A);
    D.text(A.x + 14, A.y + 22 * FS, '🛰️ 위에서 본 모습', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    windStreaks(A, S.windV, t, '#ffffff', 0.6);
    const O = { x: A.x + A.w / 2, y: A.y + A.h / 2 + 14 };
    const Ls = (Math.min(A.w, A.h) * 0.3) / V0;
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    ctx.strokeStyle = 'rgba(30,58,138,.22)'; ctx.lineWidth = 1;
    [5, 10, 15, 20].forEach((v) => { ctx.beginPath(); ctx.arc(O.x, O.y, v * Ls, 0, TAU); ctx.stroke(); });
    const [wx, wy] = vecOf(S.windV);
    D.dashedLine(O.x, O.y, O.x + wx * (V0 * Ls + 26), O.y + wy * (V0 * Ls + 26), { color: '#1d4ed8', width: 2, dash: [6, 6] });
    // 바람 화살표
    const wl = Math.min(A.w, A.h) * 0.25;
    arrowS(O.x - wx * (wl + 70), O.y - wy * (wl + 70), O.x - wx * 58, O.y - wy * 58, { color: '#1d4ed8', width: 7, head: 16 });
    D.label(clamp(O.x - wx * (wl + 70) * 0.78 + wy * 28, A.x + 62, A.x + A.w - 62), O.y - wy * (wl + 70) * 0.78 - wx * 28, '바람 → ' + compass(S.wind) + '쪽', { bg: '#1d4ed8', size: 13 });
    // 나선(끝점 연결)
    const zmax = Math.max(0, ...LAY.filter((z) => S.meas[z] || free));
    if (zmax > 0) {
      ctx.strokeStyle = 'rgba(30,58,138,.55)'; ctx.lineWidth = 2.5; ctx.setLineDash([2, 5]); ctx.lineCap = 'round'; ctx.beginPath();
      for (let z = 0; z <= zmax + 0.01; z += 2) { const h = (S.windV + spTh(z)) * DEG, L = spV(z) * Ls; const x = O.x + Math.sin(h) * L, y = O.y - Math.cos(h) * L; z === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // 층별 화살표 (깊은 층부터)
    const tips = [];
    [...LAY].reverse().forEach((z) => {
      const g = S.g[z] || 0; if (g < 0.01) return;
      const h = (S.windV + spTh(z)) * DEG, L = spV(z) * Ls * smooth(g), ex = O.x + Math.sin(h) * L, ey = O.y - Math.cos(h) * L;
      arrowS(O.x, O.y, ex, ey, { color: layCol(z), width: 5.5, head: 13 });
      tips.push({ z, h, ex, ey });
    });
    D.sphere(O.x, O.y, 5, '#334155', { gloss: false });
    tips.forEach((q) => { const lx = q.ex + Math.sin(q.h) * 22 + (Math.sin(q.h) >= 0 ? 4 : -4), ly = q.ey - Math.cos(q.h) * 14; D.label(lx, ly, q.z + ' m', { bg: layCol(q.z), size: 12, pad: 6, align: Math.sin(q.h) >= 0 ? 'left' : 'right' }); });
    // 각도 표시
    if (S.g[0] > 0.5) {
      const r0 = 30 + 0 * Ls;
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(O.x, O.y, r0, (S.windV - 90) * DEG, (S.windV + 45 - 90) * DEG); ctx.stroke();
      const mh = (S.windV + 22.5) * DEG;
      D.text(O.x + Math.sin(mh) * (r0 + 16), O.y - Math.cos(mh) * (r0 + 16) + 5, '45°', { size: 14, weight: 900, color: '#c2410c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    }
    ctx.restore();
    if (!tips.length) D.label(O.x, A.y + A.h - 32 * FS, '오른쪽 표의 깊이를 눌러 해류를 측정해요', { bg: '#334155', size: 13 });
    // ----- B: 옆에서 본 모습(비스듬한 그림)
    card(B, '🧊 비스듬히 본 모습 (깊이 방향)');
    const bx = B.x + B.w * 0.5, top = B.y + 76, zs = (B.h - 136) / 100;
    const P = (e, n, z) => [bx + e * 1.0, top + z * zs - n * 0.42];
    const ky = 3.6, HS = 80;
    // 물기둥 눈금
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, top - 8); ctx.lineTo(bx, top + 100 * zs + 8); ctx.stroke();
    LAY.forEach((z) => { const y = top + z * zs; ctx.beginPath(); ctx.moveTo(bx - 5, y); ctx.lineTo(bx + 5, y); ctx.stroke(); D.text(B.x + 16, y + 4, z + ' m', { size: 12, weight: 800, color: '#64748b', align: 'left' }); });
    // 바람 (수면 위)
    {
      const [e, n] = [Math.sin(S.windV * DEG), Math.cos(S.windV * DEG)], p0 = P(-e * 64, -n * 64, -14), p1 = P(e * 64, n * 64, -14);
      arrowS(p0[0], p0[1], p1[0], p1[1], { color: '#1d4ed8', width: 5, head: 13 });
      D.text(B.x + B.w - 14, top - 18, '바람', { size: 12.5, weight: 800, color: '#1d4ed8', align: 'right' });
    }
    // 층(면) 그리기: 깊은 층부터
    [...LAY].reverse().forEach((z) => {
      const g = S.g[z] || 0;
      const q = [P(-HS, -HS, z), P(HS, -HS, z), P(HS, HS, z), P(-HS, HS, z)];
      ctx.fillStyle = rgba(layCol(z), 0.10 + 0.08 * g); ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(layCol(z), 0.45); ctx.lineWidth = 1.5; ctx.stroke();
      if (g > 0.01) {
        const h = (S.windV + spTh(z)) * DEG, L = spV(z) * ky * smooth(g), p0 = P(0, 0, z), p1 = P(Math.sin(h) * L, Math.cos(h) * L, z);
        arrowS(p0[0], p0[1], p1[0], p1[1], { color: layCol(z), width: 4.5, head: 11 });
      }
    });
    if (zmax > 0) {
      ctx.strokeStyle = 'rgba(30,58,138,.7)'; ctx.lineWidth = 2.5; ctx.setLineDash([2, 5]); ctx.beginPath();
      for (let z = 0; z <= zmax + 0.01; z += 2) { const h = (S.windV + spTh(z)) * DEG, L = spV(z) * ky * Math.min(1, S.g[LAY[0]] || 0); const p = P(Math.sin(h) * L, Math.cos(h) * L, z); z === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    D.text(B.x + B.w - 14, B.y + B.h - 10, '깊어질수록 오른쪽으로 돌며 짧아져요', { size: 12.5, weight: 800, color: '#475569', align: 'right' });
    // ----- C: 층별 화살표 합치기
    card(C, '➕ 층별 화살표를 이어 붙이면 (10 m 층 10개)');
    // 화살표를 이어 붙인 전체가 상자 안에 들어오도록 크기와 위치를 정해요
    const inner = { x: C.x + 18, y: C.y + 48, w: C.w - 36, h: C.h - 48 - 46 };
    let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0, cx0 = 0, cy0 = 0;
    CH.forEach((z) => { const h = (S.windV + spTh(z)) * DEG, v = spV(z); cx0 += Math.sin(h) * v; cy0 -= Math.cos(h) * v; bx0 = Math.min(bx0, cx0); bx1 = Math.max(bx1, cx0); by0 = Math.min(by0, cy0); by1 = Math.max(by1, cy0); });
    const Lc = Math.min(inner.w / Math.max(bx1 - bx0, 1), inner.h / Math.max(by1 - by0, 1), 4) * 0.9;
    const co = { x: inner.x + inner.w / 2 - ((bx0 + bx1) / 2) * Lc, y: inner.y + inner.h / 2 - ((by0 + by1) / 2) * Lc };
    const [cwx, cwy] = vecOf(S.windV);
    D.dashedLine(co.x, co.y, co.x + cwx * 56, co.y + cwy * 56, { color: '#1d4ed8', width: 2, dash: [6, 6] });
    D.text(co.x + cwx * 70, co.y + cwy * 70 + 4, '바람', { size: 12.5, weight: 800, color: '#1d4ed8' });
    if (S.sumT <= 0) {
      D.label(C.x + C.w / 2, C.y + C.h - 26 * FS, '‘더하기’ 단추를 누르면 화살표가 이어 붙어요', { bg: '#334155', size: 13 });
      D.sphere(co.x, co.y, 5, '#334155', { gloss: false });
    } else {
      let px = co.x, py = co.y;
      const per = 0.82 / NCH;
      CH.forEach((z, k) => {
        const tk = clamp((S.sumT - k * per) / per, 0, 1); if (tk <= 0) return;
        const h = (S.windV + spTh(z)) * DEG, L = spV(z) * Lc * smooth(tk), nx = px + Math.sin(h) * L, ny = py - Math.cos(h) * L;
        arrowS(px, py, nx, ny, { color: layCol(z), width: 4, head: 8 });
        px = nx; py = ny;
      });
      D.sphere(co.x, co.y, 5, '#334155', { gloss: false });
      if (S.sumT >= 0.99) {
        const nv = netVec();
        const nx = co.x + nv.sx * Lc, ny = co.y + nv.sy * Lc;
        arrowS(co.x, co.y, nx, ny, { color: '#dc2626', width: 6, head: 15 });
        D.label((co.x + nx) / 2 - (ny - co.y) * 0.0 + 6, (co.y + ny) / 2 - 18, '평균 수송(합)', { bg: '#dc2626', size: 12.5 });
        S.net = Math.round(netRel());
        D.label(C.x + C.w / 2, C.y + C.h - 26 * FS, '합한 방향: 바람의 오른쪽 ' + S.net + '°', { bg: '#15803d', size: 14 });
      }
    }
  }
  function readSpiral() {
    const n = LAY.filter((z) => S.meas[z]).length;
    setReadouts(['바람', compass(S.wind) + '쪽으로 부는 바람', '측정한 층', (game && game.free ? 4 : n) + ' / 4', '표면 해류 방향', S.meas[0] || (game && game.free) ? '바람의 오른쪽 45°' : '측정해 봐요']);
  }
  function renderLayTable() {
    const tb = $('#layTbl tbody'); if (!tb) return;
    if (!tb.children.length) {
      LAY.forEach((z) => {
        const tr = mk('tr'); tr.dataset.z = z;
        const td0 = mk('td'), b = mk('button', 'lay-btn', z + ' m'); b.type = 'button'; b.addEventListener('click', () => { Sound.click(); measure(z); }); td0.appendChild(b);
        tr.append(td0, mk('td', 'lay-val q', '?'), mk('td', 'lay-val q', '?'));
        tb.appendChild(tr);
      });
    }
    LAY.forEach((z, i) => {
      const tr = tb.children[i], on = !!S.meas[z] || (game && game.free);
      tr.children[0].firstChild.classList.toggle('on', on);
      tr.children[1].textContent = on ? '오른쪽 ' + Math.round(spTh(z)) + '°' : '?'; tr.children[1].classList.toggle('q', !on);
      tr.children[2].textContent = on ? fN(spV(z), 1) + ' cm/s' : '?'; tr.children[2].classList.toggle('q', !on);
    });
  }
  function measure(z) { S.meas[z] = true; S.g[z] = S.g[z] || 0; if (S.mode === 'spiral') { const A = rcOf('spiral').A; parts.burst(A.x + A.w / 2, A.y + A.h / 2 + 14, { count: 8, speed: 90, life: 0.5, colors: ['#38bdf8', '#1e3a8a'], shape: 'circle' }); } renderLayTable(); }

  /* ======================================================
     장면 3: 에크만 수송 — 힘의 균형과 M = τ/(ρf)
     ====================================================== */
  const windU = (tau) => Math.sqrt(tau / (1.2 * 1.3e-3));
  function ekVals() {
    const sgn = S.hem === 'N' ? 1 : -1, f = sgn * fOf(S.lat3), M = S.tau / (RHO * Math.abs(f));
    return { f, M, Q: M, sgn };           // 폭 1000 km = 10⁶ m 이므로 Q(Sv) = M(m²/s) × 10⁶ ÷ 10⁶
  }
  function balStep(dt) {
    S.tauV = approach(S.tauV, S.tau, dt, 9);
    S.lat3V = approach(S.lat3V, S.lat3, dt, 9);
    const B = rcOf('balance').B;
    const mp = { x: B.x + 10, y: B.y + 36, w: B.w - 20, h: Math.min(196, B.h * 0.36) };
    const v = ekVals(), spd = 10 * v.M * v.sgn;
    while (S.wp.length < 30) S.wp.push({ x: mp.x + Math.random() * mp.w, y: mp.y + 14 + Math.random() * (mp.h - 28) });
    S.wp.forEach((p) => { p.x += spd * dt; if (p.x > mp.x + mp.w + 4) p.x = mp.x - 2; if (p.x < mp.x - 4) p.x = mp.x + mp.w + 2; });
    S.mp = mp;
  }
  const BADGE = (x, y, n) => { D.sphere(x, y, 12, '#7c3aed', { gloss: false, text: n, textColor: '#fff', textScale: 1.0 }); };
  function drawBalance(t, dt) {
    const { A, B } = rcOf('balance');
    balStep(dt);
    const v = ekVals();
    // ----- A: 힘 균형
    ocean(A, '#dbeefb', '#bddcf2');
    windStreaks(A, 0, t, '#ffffff', 0.6);
    D.text(A.x + 14, A.y + 22 * FS, '⚖️ 에크만 층 전체에 작용하는 힘 (' + (S.hem === 'N' ? '북반구' : '남반구') + ')', { size: 14, weight: 800, color: '#1e3a8a', align: 'left' });
    NS(A);
    const O = { x: A.x + A.w / 2, y: A.y + A.h * 0.5 + 6 };
    const tp = 700 * S.tauV, mp2 = (20 * S.tauV) / (RHO * Math.max(1e-9, Math.abs(fOf(S.lat3V)))); // τ와 f를 따라가는 화살표 길이
    // 물기둥(에크만 층)
    D.shadow(() => { ctx.fillStyle = 'rgba(14,116,144,.9)'; rr(O.x - 26, O.y - 18, 52, 36, 10).fill(); }, { blur: 6, y: 3 });
    D.text(O.x, O.y + 5, '표층수', { size: 12.5, weight: 800, color: '#fff' });
    const col = S.hem === 'N' ? 1 : -1;
    // ① 바람이 끄는 힘
    arrowS(O.x, O.y - 20, O.x, O.y - 20 - tp, { color: '#1d4ed8', width: 7, head: 16 });
    // ② 전향력 (크기 같고 방향 반대)
    arrowS(O.x, O.y + 20, O.x, O.y + 20 + tp, { color: '#f97316', width: 7, head: 16 });
    // ③ 에크만 수송 (바람의 오른쪽 / 왼쪽)
    arrowS(O.x + col * 30, O.y, O.x + col * (30 + mp2), O.y, { color: '#0d9488', width: 7, head: 16 });
    const nameOn = S.names || (game && game.free);
    const lab = (x, y, n, txt, c) => { if (nameOn) D.label(x, y, txt, { bg: c, size: 13 }); else BADGE(x, y, n); };
    lab(O.x + 74, O.y - 20 - tp * 0.55, '①', '바람이 끄는 힘 (τ)', '#1d4ed8');
    lab(O.x + 74, O.y + 20 + tp * 0.55, '②', '전향력 (ρ f M)', '#c2410c');
    lab(O.x + col * (30 + Math.min(mp2, A.w * 0.34)) * 0.5 + (Math.abs(mp2) < 60 ? col * 40 : 0), O.y - 28, '③', '에크만 수송 (M)', '#0f766e');
    if (nameOn) {
      D.text(A.x + A.w / 2, A.y + A.h - 54 * FS, '정상 상태: 바람이 끄는 힘 + 전향력 = 0', { size: 14, weight: 900, color: '#1e3a8a' });
      D.text(A.x + A.w / 2, A.y + A.h - 32 * FS, 'τ = ρ f M  →  M = τ / (ρ f)', { size: 14.5, weight: 900, color: '#334155' });
    } else {
      D.text(A.x + A.w / 2, A.y + A.h - 40 * FS, '크기가 같고 방향이 반대인 두 힘이 균형을 이뤄요', { size: 13.5, weight: 800, color: '#334155' });
    }
    // 직각 표시 (전향력은 수송의 오른쪽(왼쪽) 직각)
    D.text(A.x + 14, A.y + A.h - 14, '화살표 길이는 크기에 비례해요 (τ와 전향력은 같은 길이)', { size: 11, weight: 700, color: '#64748b', align: 'left' });
    // ----- B: 지도와 계산
    card(B, '🗺️ 위에서 본 바다와 계산');
    const mp = S.mp;
    ctx.save(); rr(mp.x, mp.y, mp.w, mp.h, 10).clip();
    const gg = ctx.createLinearGradient(0, mp.y, 0, mp.y + mp.h); gg.addColorStop(0, '#d3ecfa'); gg.addColorStop(1, '#a9d4ee'); ctx.fillStyle = gg; ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
    windStreaks(mp, 0, t, '#ffffff', 0.55);
    S.wp.forEach((p) => { ball(p.x, p.y, 4.5, '#0e7490', true); });
    ctx.restore();
    const bxs = v.sgn > 0 ? mp.x + mp.w - 34 : mp.x + 34;
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(bxs, mp.y + 6); ctx.lineTo(bxs, mp.y + mp.h - 6); ctx.stroke(); ctx.setLineDash([]);
    D.label(PHONE ? bxs - 12 : bxs, mp.y + mp.h / 2, '폭 1000 km', { bg: '#7c3aed', size: 12.5 });
    D.label(mp.x + (PHONE ? 100 : 64), mp.y + 16, '바람 ↑ 북쪽 (약 ' + Math.round(windU(S.tau)) + ' m/s)', { bg: '#1d4ed8', size: 12.5, pad: 7 });
    D.label(mp.x + mp.w / 2, mp.y + mp.h - 14, v.sgn > 0 ? '표층수는 동쪽(오른쪽)으로 이동' : '표층수는 서쪽(왼쪽)으로 이동', { bg: '#0f766e', size: 12.5 });
    // 수송량 막대
    const qy = mp.y + mp.h + 22, qx = B.x + 18, qw = B.w - 36;
    D.text(qx, qy, '총 수송량 Q  (1 Sv = 10⁶ m³/s)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; rr(qx, qy + 8, qw, 16, 8).fill();
    S.qV = approach(S.qV == null ? v.Q : S.qV, v.Q, dt, 9);
    const showQ = S.showQ || (game && game.free);
    const qwid = showQ ? qw * clamp(S.qV / 8, 0, 1) : 0; if (qwid > 0.5) { ctx.fillStyle = '#0d9488'; rr(qx, qy + 8, qwid, 16, 8).fill(); }
    [0, 2, 4, 6, 8].forEach((s) => D.text(qx + (qw * s) / 8, qy + 40, String(s), { size: 11.5, weight: 700, color: '#64748b' }));
    // 계산식
    const cy0 = qy + 62 * FS, lh = 22 * FS;
    const fTxt = sci(Math.abs(v.f), 2);
    const lines = [
      ['τ = ' + fN(S.tau, 2) + ' N/m²   (ρ = 1025 kg/m³)', '#334155'],
      ['f = 2Ω sinφ = ' + (v.sgn < 0 ? '−' : '') + fTxt + ' s⁻¹ (' + S.lat3 + '°' + (S.hem === 'N' ? 'N' : 'S') + ')', '#9a3412'],
      ['M = τ / (ρ|f|) = ' + fN(S.tau, 2) + ' / (1025 × ' + fTxt + ') = ' + (showQ ? fN(v.M, 1) : '?') + ' m²/s', '#0f766e'],
      ['Q = M × 1000 km = ' + (showQ ? fN(v.M, 1) + ' × 10⁶ m³/s = ' + fN(v.Q, 1) : '? × 10⁶ m³/s = ?') + ' Sv', '#1e3a8a'],
    ];
    lines.forEach((l, i) => D.text(qx, cy0 + i * lh, l[0], { size: i >= 2 ? 13.5 : 13, weight: i >= 2 ? 900 : 700, color: l[1], align: 'left' }));
  }
  function readBalance() {
    const v = ekVals();
    setReadouts(['위도 · 반구', S.lat3 + '° ' + (S.hem === 'N' ? '북반구' : '남반구'), '에크만 수송 M', S.showQ || (game && game.free) ? fN(v.M, 1) + ' m²/s' : '직접 계산해요', '폭 1000 km 수송량', S.showQ || (game && game.free) ? fN(v.Q, 1) + ' Sv' : '직접 계산해요']);
  }

  /* ======================================================
     장면 4: 용승 · 침강 — 에크만 수송의 수렴과 발산
     ====================================================== */
  const SCN = {
    ca: { name: '캘리포니아 연안', sub: '북반구 약 35°N · 육지가 동쪽', kind: 'coast', hemi: 1 },
    pe: { name: '페루 연안', sub: '남반구 약 10°S · 육지가 동쪽', kind: 'coast', hemi: -1 },
    eq: { name: '적도 해역', sub: '적도 양쪽 · 남북 단면', kind: 'center', hemi: 0 },
    sub: { name: '아열대 해역', sub: '약 30°N 부근 · 남북 단면', kind: 'center', hemi: 0 },
  };
  const rd = (x) => Math.round(x);
  /* 현재 바람으로 정해지는 수송 방향과 용승/침강 */
  function sceneState(sc) {
    sc = sc || S.scene;
    const c = SCN[sc], w = sc === 'sub' ? 270 : S.wd2[sc];
    if (c.kind === 'coast') {
      const T = w + 90 * c.hemi, e = rd(Math.sin(T * DEG)), s = e; // 동쪽(육지 쪽) 성분 > 0 이면 육지로 몰려요
      return { w, T, s: [s], res: s < 0 ? 'up' : s > 0 ? 'down' : 'none' };
    }
    if (sc === 'sub') return { w: 0, T: 0, s: [1, 1], res: 'down' };
    const TN = w + 90, TS = w - 90, sR = -rd(Math.cos(TN * DEG)), sL = rd(Math.cos(TS * DEG)); // 중심으로 향하면 +1
    return { w, T: TN, TS, s: [sL, sR], res: sL < 0 && sR < 0 ? 'up' : sL > 0 && sR > 0 ? 'down' : 'none' };
  }
  const wdName = (w) => compass(w) + '쪽으로';
  const RES_TXT = { up: '용승', down: '침강', none: '용승·침강 없음' };
  function secGeom() {
    const B = rcOf('apply').B, c = SCN[S.scene];
    const W = { x0: B.x + 16, x1: B.x + B.w - 16, ytop: B.y + 160, ybot: B.y + B.h - (PHONE ? 30 : 34) };
    W.w = W.x1 - W.x0; W.h = W.ybot - W.ytop;
    let halves;
    if (c.kind === 'coast') { W.xc = W.x1 - Math.min(96, W.w * 0.2); halves = [{ idx: 0, xo: W.x0, xw: W.xc, dir: 1 }]; }
    else { W.xe = (W.x0 + W.x1) / 2; halves = [{ idx: 0, xo: W.x0, xw: W.xe, dir: 1 }, { idx: 1, xo: W.x1, xw: W.xe, dir: -1 }]; }
    return { B, W, halves };
  }
  const DF = 0.28, NP = 96;
  function secInit() {
    const { W, halves } = secGeom();
    S.sec = [];
    for (let i = 0; i < NP; i++) {
      const hi = halves.length > 1 ? (i % 2) : 0, h = halves[hi];
      const lo = Math.min(h.xo, h.xw), hiX = Math.max(h.xo, h.xw), yf = 0.04 + Math.random() * 0.92;
      S.sec.push({ x: lo + Math.random() * (hiX - lo), yf, T: yf < DF ? 1 : 0, hi });
    }
    S.sst = new Array(40).fill(0.9); S.secInit = S.scene;
  }
  function secStep(dt) {
    if (S.secInit !== S.scene) secInit();
    const { W, halves } = secGeom(), st = sceneState();
    halves.forEach((h) => { S.sV[h.idx] = approach(S.sV[h.idx], st.s[h.idx] || 0, dt, 3.2); });
    const U0 = 0.17 * W.w, Wv = 0.34, Lc = 0.22 * W.w * (halves.length > 1 ? 0.7 : 1);
    const bins = new Array(S.sst.length).fill(0), cnt = new Array(S.sst.length).fill(0);
    S.sec.forEach((p) => {
      const h = halves[p.hi], s = S.sV[h.idx], surf = p.yf < DF;
      let vx = surf ? s * U0 * h.dir : -s * U0 * h.dir * (DF / (1 - DF));
      let vy = 0;
      if (Math.abs(p.x - h.xw) < Lc) vy = s * Wv * (1 - Math.abs(p.x - h.xw) / (Lc * 1.3));
      p.x += vx * dt; p.yf = clamp(p.yf + vy * dt, 0.03, 0.97);
      // 벽(해안·중심선)을 넘지 않아요
      const wallLo = h.dir > 0 ? -1e9 : h.xw + 2, wallHi = h.dir > 0 ? h.xw - 2 : 1e9;
      p.x = clamp(p.x, wallLo, wallHi);
      // 바깥 경계에서 되돌아와요 (반대층으로)
      if ((h.dir > 0 && p.x < h.xo) || (h.dir < 0 && p.x > h.xo)) {
        p.x = h.xo + h.dir * 2;
        if (s < 0) { p.yf = DF + 0.08 + Math.random() * 0.8; } else { p.yf = 0.03 + Math.random() * (DF - 0.08); p.T = 1; }
      }
      // 수온: 표층은 데워지고 깊은 층은 차가워요
      p.T += ((surf ? 1 : 0) - p.T) * (surf ? 0.35 : 0.3) * dt;
      if (surf) { const bi = clamp(Math.floor(((p.x - W.x0) / W.w) * bins.length), 0, bins.length - 1); bins[bi] += p.T; cnt[bi]++; }
    });
    S.sst = S.sst.map((v, i) => (cnt[i] ? approach(v, bins[i] / cnt[i], dt, 3) : v));
    // 연속해서 용승이 일어나면 장면을 완성한 것으로 표시
    ['ca', 'pe', 'eq'].forEach((k) => {
      if (S.scene === k && sceneState(k).res === 'up') { S.upT[k] += dt; if (S.upT[k] > 1.0 && !S.hit[k]) { S.hit[k] = true; S.hitFx = { k, t: 0 }; const B = rcOf('apply').B; parts.burst(B.x + B.w / 2, B.y + 60, { count: 18, speed: 150, life: 0.9, size: 4 }); Sound.success(); } }
      else if (S.scene === k) S.upT[k] = 0;
    });
    if (S.hitFx) S.hitFx.t += dt;
  }
  const tmpCol = (T) => mixc('#2563eb', '#fb923c', clamp(T, 0, 1));
  function drawApply(t, dt) {
    const { A, B } = rcOf('apply');
    secStep(dt);
    const sc = S.scene, c = SCN[sc], st = sceneState();
    S.wd2V = approachAng(S.wd2V, sc === 'sub' ? 270 : S.wd2[sc], dt, 7);
    // ----- A: 위에서 본 지도
    ocean(A, '#d6ecfa', '#b0d6ee');
    D.text(A.x + 14, A.y + 22 * FS, '🗺️ ' + c.name, { size: 14.5, weight: 800, color: '#1e3a8a', align: 'left' });
    D.text(A.x + 14, A.y + 40 * FS, c.sub, { size: 12, weight: 700, color: '#475569', align: 'left' });
    NS(A);
    const wV = S.wd2V;
    const tArrow = (x, y, w, hemi, len, lab) => { // 바람 → 수송(바람 기준 오른쪽/왼쪽 90°)
      const [wx, wy] = vecOf(w), th = w + 90 * hemi, [tx, ty] = vecOf(th);
      arrowS(x - wx * len * 0.5, y - wy * len * 0.5, x + wx * len * 0.5, y + wy * len * 0.5, { color: '#1d4ed8', width: 6, head: 14 });
      arrowS(x, y, x + tx * len * 0.78, y + ty * len * 0.78, { color: '#0d9488', width: 6, head: 14 });
      D.sphere(x, y, 4, '#334155', { gloss: false });
      D.label(x + tx * len * 0.78 + (tx >= 0 ? 6 : -6) * Math.abs(tx), y + ty * len * 0.78 + (ty >= 0 ? 14 : -14) * Math.abs(ty) + (Math.abs(tx) > 0.5 ? -12 : 0), '수송', { bg: '#0d9488', size: 12, pad: 6, align: tx > 0.5 ? 'left' : tx < -0.5 ? 'right' : 'center' });
      if (lab) D.label(x + wx * len * 0.5 + (wx >= 0 ? 6 : -6), y + wy * len * 0.5 - 12, lab, { bg: '#1d4ed8', size: 12, pad: 6, align: wx >= 0 ? 'left' : 'right' });
    };
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    if (c.kind === 'coast') {
      const lx = A.x + A.w * 0.72;
      // 육지
      ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(lx, A.y);
      for (let y = 0; y <= A.h; y += 14) ctx.lineTo(lx + Math.sin(y * 0.045) * 9 + Math.sin(y * 0.11) * 4, A.y + y);
      ctx.lineTo(A.x + A.w, A.y + A.h); ctx.lineTo(A.x + A.w, A.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(101,163,13,.55)'; ctx.fillRect(lx + 40, A.y, A.w - (lx + 40 - A.x), A.h);
      D.text((lx + A.x + A.w) / 2 + 6, A.y + A.h / 2, '육지', { size: 15, weight: 900, color: '#57534e' });
      windStreaks({ x: A.x, y: A.y, w: lx - A.x, h: A.h }, wV, t, '#ffffff', 0.6);
      tArrow(A.x + (lx - A.x) * 0.6, A.y + A.h * 0.52, wV, c.hemi, Math.min(96, (lx - A.x) * 0.44), '바람');
      D.text(A.x + 14, A.y + A.h - 40 * FS, '바람: ' + wdName(S.wd2[sc]), { size: 13.5, weight: 800, color: '#1d4ed8', align: 'left' });
      D.text(A.x + 14, A.y + A.h - 20 * FS, '수송: ' + wdName(st.T) + '  (바람의 ' + (c.hemi > 0 ? '오른쪽' : '왼쪽') + ' 90°)', { size: 13.5, weight: 800, color: '#0f766e', align: 'left' });
    } else {
      const ey = A.y + A.h * 0.5;
      if (sc === 'eq') {
        windStreaks(A, wV, t, '#ffffff', 0.55);
        D.dashedLine(A.x, ey, A.x + A.w, ey, { color: '#be123c', width: 3, dash: [8, 6] });
        D.label(A.x + A.w - 52, ey - 14, '적도', { bg: '#be123c', size: 12.5 });
        D.text(A.x + 14, ey - 96 * FS, '북반구', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
        D.text(A.x + 14, ey + 112 * FS, '남반구', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' });
        tArrow(A.x + A.w * 0.5, ey - 84, wV, 1, Math.min(110, A.w * 0.34), '바람');
        tArrow(A.x + A.w * 0.5, ey + 84, wV, -1, Math.min(110, A.w * 0.34), '');
        D.text(A.x + 14, A.y + A.h - 40 * FS, '바람: ' + wdName(S.wd2.eq), { size: 13.5, weight: 800, color: '#1d4ed8', align: 'left' });
        D.text(A.x + 14, A.y + A.h - 20 * FS, '북반구는 오른쪽, 남반구는 왼쪽으로 수송', { size: 12.5, weight: 800, color: '#0f766e', align: 'left' });
      } else {
        windStreaks({ x: A.x, y: ey, w: A.w, h: A.h / 2 }, 90, t, '#ffffff', 0.55);
        windStreaks({ x: A.x, y: A.y, w: A.w, h: A.h / 2 }, 270, t, '#ffffff', 0.55);
        ctx.fillStyle = 'rgba(251,146,60,.18)'; ctx.fillRect(A.x, ey - 18, A.w, 36);
        D.dashedLine(A.x, ey, A.x + A.w, ey, { color: '#c2410c', width: 3, dash: [8, 6] });
        D.label(A.x + A.w - 80, ey - 24, '수렴 · 약 30°N', { bg: '#c2410c', size: 12.5 });
        const L = Math.min(100, A.w * 0.3);
        // 위쪽(북쪽): 편서풍(동쪽으로) → 수송은 오른쪽 = 남쪽
        arrowS(A.x + A.w * 0.5 - L / 2, A.y + A.h * 0.2, A.x + A.w * 0.5 + L / 2, A.y + A.h * 0.2, { color: '#1d4ed8', width: 6, head: 14 });
        arrowS(A.x + A.w * 0.5, A.y + A.h * 0.2, A.x + A.w * 0.5, A.y + A.h * 0.2 + L * 0.78, { color: '#0d9488', width: 6, head: 14 });
        D.label(A.x + A.w * 0.5 - L / 2 - 4, A.y + A.h * 0.2 - 16, '편서풍', { bg: '#1d4ed8', size: 12, pad: 6, align: 'right' });
        // 아래쪽(남쪽): 무역풍(서쪽으로) → 수송은 오른쪽 = 북쪽
        arrowS(A.x + A.w * 0.5 + L / 2, A.y + A.h * 0.8, A.x + A.w * 0.5 - L / 2, A.y + A.h * 0.8, { color: '#1d4ed8', width: 6, head: 14 });
        arrowS(A.x + A.w * 0.5, A.y + A.h * 0.8, A.x + A.w * 0.5, A.y + A.h * 0.8 - L * 0.78, { color: '#0d9488', width: 6, head: 14 });
        D.label(A.x + A.w * 0.5 + L / 2 + 4, A.y + A.h * 0.8 + 16, '무역풍', { bg: '#1d4ed8', size: 12, pad: 6, align: 'left' });
        D.text(A.x + 14, A.y + A.h - 20 * FS, '두 수송이 중심선으로 모여요 → 수렴', { size: 12.5, weight: 800, color: '#0f766e', align: 'left' });
      }
    }
    ctx.restore();
    // ----- B: 단면
    card(B, '🧊 단면: 표층수의 움직임과 아래 물');
    const { W, halves } = secGeom();
    // 상태 배지
    const bcol = st.res === 'up' ? '#1d4ed8' : st.res === 'down' ? '#c2410c' : '#64748b';
    D.label(B.x + B.w / 2, B.y + 52 * FS, RES_TXT[st.res], { bg: bcol, size: 15, pad: 12 });
    const sub = st.res === 'up' ? '표층수가 멀어져서 차갑고 영양염이 많은 깊은 물이 올라와요' : st.res === 'down' ? '표층수가 모여 쌓이며 아래로 가라앉아요' : (c.kind === 'coast' ? '수송이 해안과 나란해서 수렴·발산이 없어요' : '남북 방향의 수송이 없어서 수렴·발산이 없어요');
    drawWrap(B.x + B.w / 2, B.y + 80 * FS, sub, B.w - 28, 12.5, { color: '#334155' });
    // 수면 높이(과장)
    const amp = 12 * FS, Lb = 0.12 * W.w;
    const ysurf = (x) => { let y = W.ytop; halves.forEach((h) => { y -= S.sV[h.idx] * amp * Math.exp(-Math.pow((x - h.xw) / Lb, 2)); }); return y; };
    // 물
    const wg = ctx.createLinearGradient(0, W.ytop, 0, W.ybot); wg.addColorStop(0, '#bfe6f8'); wg.addColorStop(DF, '#8cc9ea'); wg.addColorStop(1, '#2f6ea3');
    ctx.save(); ctx.beginPath(); ctx.rect(B.x + 6, W.ytop - 22, B.w - 12, B.y + B.h - W.ytop + 18); ctx.clip();
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(W.x0, W.ybot);
    for (let x = W.x0; x <= W.x1 + 0.1; x += 6) ctx.lineTo(x, ysurf(x));
    ctx.lineTo(W.x1, W.ybot); ctx.closePath(); ctx.fill();
    if (c.kind === 'coast') {
      // 육지(해안)
      ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(W.xc, W.ytop - 14); ctx.lineTo(W.x1, W.ytop - 14); ctx.lineTo(W.x1, W.ybot); ctx.lineTo(W.xc - 6, W.ybot); ctx.lineTo(W.xc, W.ytop - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(101,163,13,.6)'; ctx.fillRect(W.xc + 6, W.ytop - 22, W.x1 - W.xc - 6, 10);
      D.text((W.xc + W.x1) / 2 + 2, W.ytop + 40, '육지', { size: 14, weight: 900, color: '#57534e' });
    }
    // 에크만 층 경계
    D.dashedLine(W.x0, W.ytop + DF * W.h, c.kind === 'coast' ? W.xc : W.x1, W.ytop + DF * W.h, { color: 'rgba(255,255,255,.75)', width: 2, dash: [6, 6] });
    // 입자
    S.sec.forEach((p) => { const x = p.x, y = ysurf(x) + p.yf * (W.ybot - ysurf(x)); ball(x, y, 4.6, tmpCol(p.T), true); });
    // 수직 흐름 화살표
    halves.forEach((h) => {
      const s = S.sV[h.idx]; if (Math.abs(s) < 0.08) return;
      const xa = h.xw - h.dir * Math.min(46, W.w * 0.1), ya = W.ytop + (DF + 0.32) * W.h, L = 50 * Math.abs(s);
      if (s < 0) arrowS(xa, ya + L / 2, xa, ya - L / 2, { color: '#1e3a8a', width: 6, head: 13 }); else arrowS(xa, ya - L / 2, xa, ya + L / 2, { color: '#c2410c', width: 6, head: 13 });
    });
    // 수평 흐름 화살표(표층)
    halves.forEach((h) => {
      const s = S.sV[h.idx]; if (Math.abs(s) < 0.08) return;
      const sg = Math.sign(s * h.dir), xm = (h.xo + h.xw) / 2, y = W.ytop + DF * 0.5 * W.h + 4, L = 56 * Math.abs(s);
      arrowS(xm - sg * L / 2, y, xm + sg * L / 2, y, { color: '#0f766e', width: 6, head: 13 });
    });
    ctx.restore();
    // 해저(바닥)
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(W.x0, W.ybot, W.w, 8);
    // 표층 수온 띠
    const sy = W.ytop - 34, n = S.sst.length;
    for (let i = 0; i < n; i++) {
      const x0 = W.x0 + (W.w * i) / n; if (c.kind === 'coast' && x0 > W.xc) break;
      ctx.fillStyle = tmpCol(S.sst[i]); ctx.fillRect(x0, sy, W.w / n + 0.6, 10);
    }
    ctx.strokeStyle = 'rgba(51,65,85,.4)'; ctx.lineWidth = 1; ctx.strokeRect(W.x0, sy, c.kind === 'coast' ? W.xc - W.x0 : W.w, 10);
    D.text(W.x0, sy - 5, '표층 수온 (파랑 = 차가움, 주황 = 따뜻함)', { size: 11.5, weight: 800, color: '#334155', align: 'left' });
    if (c.kind === 'coast') { D.text(W.x0 + 2, W.ybot + 22 * FS, '← 서쪽 (바다)', { size: 12, weight: 800, color: '#475569', align: 'left' }); D.text(W.xc, W.ybot + 22 * FS, '해안', { size: 12, weight: 800, color: '#475569' }); }
    else { D.text(W.x0 + 2, W.ybot + 22 * FS, '← 남쪽', { size: 12, weight: 800, color: '#475569', align: 'left' }); D.text(W.x1 - 2, W.ybot + 22 * FS, '북쪽 →', { size: 12, weight: 800, color: '#475569', align: 'right' }); D.text(W.xe, W.ybot + 22 * FS, sc === 'eq' ? '적도' : '약 30°N', { size: 12, weight: 800, color: '#475569' }); }
    if (S.hitFx && S.hitFx.k === sc && S.hitFx.t < 1.6) D.check(B.x + B.w - 30, B.y + 28, 14, clamp(S.hitFx.t / 0.4, 0, 1));
    else if (['ca', 'pe', 'eq'].includes(sc) && S.hit[sc]) D.check(B.x + B.w - 30, B.y + 28, 14, 1);
  }
  function readApply() {
    const st = sceneState(), c = SCN[S.scene];
    setReadouts(['장면', c.name, '바람', S.scene === 'sub' ? '무역풍 · 편서풍' : wdName(S.wd2[S.scene]), '결과', RES_TXT[st.res]]);
  }

  /* ======================================================
     입력 도구 · 컨트롤
     ====================================================== */
  const stpF = makeStepper($('#stpF'), { min: 0, max: 15, step: 0.1, value: 0, dec: 1, unit: '×10⁻⁵ s⁻¹' });
  const clsDir = makeClassify($('#clsDir'), [
    { id: 'a', label: '북반구 30°N에서 북쪽으로 움직이는 해수' }, { id: 'b', label: '남반구 30°S에서 동쪽으로 움직이는 해수' },
    { id: 'c', label: '적도(0°)에서 움직이는 해수' }, { id: 'd', label: '북반구 60°N에서 서쪽으로 움직이는 해수' }, { id: 'e', label: '남반구 60°S에서 남쪽으로 움직이는 해수' },
  ], [{ id: 'r', label: '오른쪽' }, { id: 'l', label: '왼쪽' }, { id: 'n', label: '휘지 않음' }], { a: 'r', b: 'l', c: 'n', d: 'r', e: 'l' }, () => { });
  const stpAng = makeStepper($('#stpAng'), { min: 0, max: 180, step: 5, value: 0, dec: 0, unit: '°' });
  const stpQ = makeStepper($('#stpQ'), { min: 0, max: 10, step: 0.1, value: 0, dec: 1, unit: 'Sv' });
  const selForce = makeSelects($('#selForce'), [
    { id: 'a', label: '① 위쪽(북쪽) 화살표' }, { id: 'b', label: '② 아래쪽(남쪽) 화살표' }, { id: 'c', label: '③ 옆으로 향한 화살표' },
  ], [{ id: 'tau', label: '바람이 끄는 힘' }, { id: 'cor', label: '전향력' }, { id: 'M', label: '에크만 수송' }], { a: 'tau', b: 'cor', c: 'M' }, () => { });
  S.netChoice = null;

  const latLabel = (v) => (v === 0 ? '0° (적도)' : Math.abs(v) + '°' + (v > 0 ? 'N' : 'S'));
  SciSim.bindRange($('#sLat'), $('#oLat'), latLabel, (v) => { S.lat = +v; });
  SciSim.bindRange($('#sTau'), $('#oTau'), (v) => fN(v, 2) + ' N/m²', (v) => { S.tau = +v; });
  SciSim.bindRange($('#sLat3'), $('#oLat3'), (v) => v + '°' + (S.hem === 'N' ? 'N' : 'S'), (v) => { S.lat3 = +v; });
  const setLat = (v) => { S.lat = v; setSlider($('#sLat'), $('#oLat'), v, latLabel); };
  const setTau = (v) => { S.tau = v; setSlider($('#sTau'), $('#oTau'), v, (x) => fN(x, 2) + ' N/m²'); };
  const setLat3 = (v) => { S.lat3 = v; setSlider($('#sLat3'), $('#oLat3'), v, (x) => x + '°' + (S.hem === 'N' ? 'N' : 'S')); };
  function setHem(h) { S.hem = h; $$('#hemSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.hm === h)); $('#oLat3').textContent = S.lat3 + '°' + (h === 'N' ? 'N' : 'S'); }
  $$('#hemSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setHem(b.dataset.hm); }));
  function setWind(h) { S.wind = h; $$('#wdSeg .opt').forEach((b) => b.classList.toggle('on', +b.dataset.h === h)); }
  $$('#wdSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setWind(+b.dataset.h); }));
  function syncWd2() { $$('#wdSeg2 .opt').forEach((b) => b.classList.toggle('on', S.scene !== 'sub' && +b.dataset.h === S.wd2[S.scene])); $$('#sceneSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.sc === S.scene)); }
  function setWd2(h) { if (S.scene === 'sub') return; S.wd2[S.scene] = h; syncWd2(); }
  $$('#wdSeg2 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setWd2(+b.dataset.h); }));
  function setScene(sc) { if (S.scene !== sc) { S.fade = 0.7; parts.clear(); } S.scene = sc; S.wd2V = sc === 'sub' ? 270 : S.wd2[sc]; syncWd2(); updateCtl(); }
  $$('#sceneSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.sc); }));
  function updNet() { $$('#netSeg .opt').forEach((b) => b.classList.toggle('on', S.netChoice === +b.dataset.a)); }
  $$('#netSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.netChoice = +b.dataset.a; updNet(); }));
  $('#bLaunch').addEventListener('click', () => { Sound.click(); launch(); });
  $('#bSum').addEventListener('click', () => { Sound.click(); if (!(S.meas[0] && S.meas[25] && S.meas[50] && S.meas[100]) && !(game && game.free)) { say('먼저 층 4개를 모두 측정해요', true); return; } S.sumT = 0; S.sumOn = true; });

  const MODE_LABEL = { cor: '🌐 전향력 모형', spiral: '🌀 에크만 나선', balance: '⚖️ 에크만 수송', apply: '🌊 용승 · 침강' };
  const FREE_KEYS = { cor: ['sLat', 'launch'], spiral: ['wdSeg', 'layers', 'sumRow'], balance: ['sTau', 'sLat3', 'hemSeg'], apply: ['sceneSeg', 'wdSeg2'] };
  let ctlKeys = ['sLat', 'launch', 'stpF'];
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free);
    let keys = free ? FREE_KEYS[S.mode] : ctlKeys;
    if (S.mode === 'apply' && S.scene === 'sub') keys = keys.filter((k) => k !== 'wdSeg2');
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    $('#modeSeg').hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; if (m === 'cor') { S.auto = 3; } updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); setMode(b.dataset.mode); }));
  renderLayTable();

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear();
    setLat(0); S.latV = 0; S.parts = []; S.auto = 2.4; stpF.reset(); clsDir.reset();
    setWind(0); S.windV = 0; S.meas = {}; S.g = {}; S.sumOn = false; S.sumT = 0; S.net = null; S.netChoice = null; stpAng.reset(); renderLayTable(); updNet();
    setTau(0.10); S.tauV = 0.10; setLat3(30); S.lat3V = 30; setHem('N'); S.showQ = false; S.names = false; stpQ.reset(); selForce.reset(); S.qV = null; S.wp = [];
    S.scene = 'ca'; S.wd2 = { ca: 0, pe: 180, eq: 90 }; S.hit = { ca: false, pe: false, eq: false }; S.upT = { ca: 0, pe: 0, eq: 0 }; S.hitFx = null; S.secInit = ''; S.wd2V = 0; S.sV = [0, 0]; syncWd2();
    if (li === 0) { setMode('cor'); setCtl(['sLat', 'launch']); showHint('위도 슬라이더를 움직이며 물덩이의 경로를 살펴봐요', 5200); }
    else if (li === 1) { setMode('spiral'); setCtl(['wdSeg', 'layers']); showHint('표에서 깊이를 눌러 층마다 해류를 측정해 봐요', 5200); }
    else if (li === 2) { setMode('balance'); setCtl(['sTau', 'sLat3']); showHint('바람 응력과 위도를 바꾸며 힘의 균형을 봐요', 5200); }
    else { setMode('apply'); setCtl(['sceneSeg', 'wdSeg2']); showHint('장면을 고르고 바람 방향을 바꿔 봐요', 5200); }
    updateCtl();
  }
  const levels = [
    {
      title: '전향력: 지구 자전이 방향을 휘게 해요', short: '전향력', icon: '🧭', phase: '모형', features: ['cor'],
      intro: '<p class="si-q">❓ 탐구 질문: 바람이 북쪽으로 불면 바닷물은 왜 서쪽이나 동쪽으로 움직일까?</p>' +
        '<div class="si-link">🔗 <b>지구과학에서</b> 엘니뇨와 라니냐를 배우며, 바람이 불 때 표층수가 <b>바람 방향의 옆으로</b> 이동하고 연안에서 용승이 일어난다는 관측을 봤어요. 이번 차시에서는 그 <b>까닭</b>을 힘으로 설명해요. 첫걸음은 지구 자전이 만드는 <b>전향력</b>이에요.</div>' +
        '<p>자전하는 지구 위에서 보면 움직이는 물체가 <b>옆으로 휘는 것처럼</b> 보여요. 이 겉보기 힘이 <b>전향력</b>이에요. 전향력은 속도에 <b>수직</b>이라서 속력은 바꾸지 않고 <b>방향만</b> 바꿔요. 북반구에서는 운동 방향의 <b>오른쪽</b>, 남반구에서는 <b>왼쪽</b>이에요.</p>' +
        '<p>단위 질량당 전향 가속도는 <b>a = f·v</b>이고, 전향 매개변수는 <b>f = 2Ω sinφ</b> (Ω = 7.29×10⁻⁵ rad/s, φ: 위도)예요.</p>',
      setup() { resetStep(0); },
      recap: '전향력은 회전하는 지구에서 보이는 겉보기 힘이에요. 속도에 수직이라 방향만 바꾸고, 북반구는 오른쪽·남반구는 왼쪽이며 적도에서는 0이에요.',
      summary: '<ul><li><b>전향력</b>(코리올리 힘): 자전하는 지구에서 움직이는 물체에 작용하는 <b>겉보기 힘</b>. 속도에 수직이라 <b>방향만</b> 바꾸고 속력은 그대로예요.</li><li>방향: 북반구 <b>오른쪽</b>, 남반구 <b>왼쪽</b>.</li><li><b>f = 2Ω sinφ</b>, Ω = 7.29×10⁻⁵ rad/s. 적도 0, 30° 7.29×10⁻⁵, 45° 1.03×10⁻⁴, 60° 1.26×10⁻⁴, 극 1.46×10⁻⁴ s⁻¹. 위도가 높을수록 커요.</li><li>전향 가속도 <b>a = f·v</b>: 45°, v = 1 m/s이면 약 1.03×10⁻⁴ m/s². 아주 작지만 넓은 바다에서 오랫동안 쌓이면 해류의 방향을 바꿔요.</li><li>욕조 물이 한쪽으로 빠지는 것은 전향력 때문이 아니에요. 욕조는 너무 작아서 전향력의 효과가 거의 없어요.</li></ul>',
      missions: [
        {
          title: '30°N에서 f 읽기',
          goal: '위도를 <b>30°N</b>에 맞추고, 화면에서 읽은 전향 매개변수 <b>f</b>를 <b>×10⁻⁵ s⁻¹</b> 단위로 입력해요.',
          hint: 'f = 2Ω sinφ = 2 × 7.29×10⁻⁵ × sin30° = 7.29×10⁻⁵ s⁻¹예요. ×10⁻⁵ 단위로는 약 7.3이에요.',
          setup() { setMode('cor'); setCtl(['sLat', 'launch', 'stpF']); stpF.reset(); },
          check: () => S.lat === 30 && Math.abs(stpF.value - 7.29) < 0.06, hold: 0.8,
          status: () => mark(S.lat === 30) + ' 위도 ' + latLabel(S.lat) + ' (목표 30°N) · ' + mark(Math.abs(stpF.value - 7.29) < 0.06) + ' 입력한 f ' + fN(stpF.value, 1) + '×10⁻⁵ s⁻¹',
          explain: 'f = 2Ω sinφ = 2 × 7.29×10⁻⁵ × 0.5 = <b>7.29×10⁻⁵ s⁻¹</b>(약 7.3×10⁻⁵)예요. 위도가 커질수록 sinφ가 커져서 f도 커지고, 적도에서는 sin0° = 0이라 f = 0이에요.',
        },
        {
          title: '어느 쪽으로 휠까?', manual: true,
          goal: '물덩이 5가지가 운동 방향의 <b>오른쪽 · 왼쪽 · 휘지 않음</b> 중 어느 쪽인지 골라요.',
          hint: '북반구는 오른쪽, 남반구는 왼쪽이에요. 움직이는 방향이 동서든 남북이든 상관없고, 적도에서는 f = 0이에요.',
          setup() { clsDir.reset(); setMode('cor'); setCtl(['sLat', 'launch', 'clsDir']); },
          status: () => mark(clsDir.ok()) + ' 분류한 카드 ' + clsDir.count() + ' / 5',
          check() {
            if (!clsDir.complete()) return '5가지를 모두 골라 주세요. (지금 ' + clsDir.count() + '개)';
            if (!clsDir.ok()) { clsDir.mark(clsDir.wrong()); return '빨간 줄이 달라요. 반구와 적도 여부를 생각해 보고, 위도를 바꿔 경로를 다시 살펴봐요.'; }
            return true;
          },
          explain: '<b>북반구</b>(30°N, 60°N)는 운동 방향의 <b>오른쪽</b>, <b>남반구</b>(30°S, 60°S)는 <b>왼쪽</b>이에요. 물이 어느 방향으로 움직이든 같고, <b>적도</b>에서는 전향력이 0이라 휘지 않아요.',
        },
        {
          type: 'quiz', title: '전향력에 대한 바른 설명',
          goal: '전향력에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { setMode('cor'); setCtl(['sLat', 'launch']); },
          choices: ['속도에 수직인 겉보기 힘이라서 속력은 그대로이고 방향만 바뀌어요', '적도에서는 지구가 자전하지 않아서 전향력이 0이에요', '전향력 때문에 욕조 물은 북반구에서 항상 같은 방향으로 빠져요', '전향력은 움직이는 물체를 점점 더 빠르게 만들어요'],
          answer: 0,
          feedback: ['', '적도에서도 지구는 자전해요. f = 2Ω sinφ에서 위도 0°의 sin0° = 0이라 전향력이 0이 되는 것이에요.', '욕조는 너무 작고 물이 금방 빠져서 전향력의 효과가 거의 없어요. 배수구 모양과 물의 처음 흔들림이 더 커요.', '전향력은 속도에 수직이라 속력을 바꾸지 못해요. 화면의 속력 막대도 늘 1.00 m/s예요.'],
          explain: '전향력은 속도에 <b>수직</b>인 <b>겉보기 힘</b>이라 물체를 빠르게 하거나 느리게 하지 못하고 <b>방향만</b> 바꿔요. 지구는 적도에서도 자전하지만 f = 2Ω sinφ가 sin0° = 0이라 적도의 전향력은 0이에요.',
        },
      ],
    },
    {
      title: '에크만 나선: 깊어질수록 오른쪽으로 돌아요', short: '에크만 나선', icon: '🌀', phase: '모형', features: ['spiral'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 북반구의 전향력은 움직이는 물의 오른쪽 방향으로 작용한다는 것을 봤어요. 바람이 바다 표면을 끌면 어떤 일이 일어날까요?</div>' +
        '<p>바람이 해수면을 끌면 표층수가 움직이다가 전향력을 받아 바람의 <b>오른쪽</b>으로 휘어요. 그 아래층은 위층에 끌려 움직이고, 또 전향력으로 휘어서 <b>깊어질수록 오른쪽으로 더 돌면서 속력이 줄어요</b>. 이 모양이 <b>에크만 나선</b>이에요. (수식은 풀지 않고 결과만 봐요.)</p>' +
        '<p>예시(북반구): 풍속 10 m/s, 표면 해류 V₀ = 0.20 m/s, 에크만 층 깊이 D = 100 m. 깊이 z에서 방향은 바람의 오른쪽 <b>45° + 180°×(z/D)</b>, 속력은 <b>V₀·e<sup>−πz/D</sup></b>예요.</p>',
      setup() { resetStep(1); },
      recap: '북반구에서 표면 해류는 바람의 오른쪽 45°로 흐르고, 깊어질수록 오른쪽으로 더 돌며 느려지는 나선이 돼요. 층 전체의 평균 수송은 바람의 오른쪽 90°예요.',
      summary: '<ul><li><b>에크만 나선</b>(북반구): 표면 해류는 바람의 <b>오른쪽 45°</b>. 깊어질수록 <b>오른쪽으로 더 돌고 속력이 줄어요</b>.</li><li>예시(V₀ = 20 cm/s, D = 100 m): <b>0 m</b> 오른쪽 45°, 20.0 cm/s · <b>25 m</b> 90°, 9.1 cm/s · <b>50 m</b> 135°, 4.2 cm/s · <b>100 m</b> 225°(표면과 반대 방향), 0.9 cm/s.</li><li>까닭: 바람이 끄는 표층수가 전향력으로 휘고, 아래층은 위층에 끌려 움직이면서 또 휘어요.</li><li>층별 화살표를 모두 더하면 <b>평균 수송은 바람의 오른쪽 90°</b>(북반구)예요. 남반구에서는 왼쪽 90°예요.</li></ul>',
      missions: [
        {
          title: '층마다 측정하기',
          goal: '표의 깊이 <b>4개</b>를 눌러 모두 측정하고, <b>표면(0 m) 해류</b>가 바람의 오른쪽 몇 도인지 입력해요.',
          hint: '0 m 줄의 방향 칸을 읽어요. 바람 방향(점선)과 파란 화살표 사이 각도 표시도 같은 값이에요.',
          setup() { setMode('spiral'); setCtl(['wdSeg', 'layers', 'stpAng']); stpAng.reset(); },
          check: () => LAY.every((z) => S.meas[z]) && stpAng.value === 45, hold: 0.8,
          status: () => mark(LAY.every((z) => S.meas[z])) + ' 측정한 층 ' + LAY.filter((z) => S.meas[z]).length + ' / 4 · ' + mark(stpAng.value === 45) + ' 입력한 각도 ' + stpAng.value + '° (표면)',
          explain: '표면 해류는 바람의 오른쪽 <b>45°</b>이고, 25 m에서 90°, 50 m에서 135°, 100 m에서는 <b>225°</b>(표면과 거의 반대)로 돌아요. 속력은 20.0 → 9.1 → 4.2 → 0.9 cm/s로 줄어요. 이것이 <b>에크만 나선</b>이에요.',
        },
        {
          title: '층별 화살표 더하기',
          goal: '‘모두 더하기’를 눌러 화살표를 이어 붙이고, 합친 <b>평균 수송</b>이 바람의 어느 쪽인지 골라요.',
          hint: '바람 방향의 점선과 빨간 합 화살표 사이 각도를 봐요. 표면은 오른쪽 45°였지만 층 전체를 더하면 더 돌아요.',
          setup() { setMode('spiral'); LAY.forEach((z) => { S.meas[z] = true; }); renderLayTable(); S.netChoice = null; updNet(); S.sumOn = false; S.sumT = 0; setCtl(['wdSeg', 'sumRow']); },
          check: () => S.sumOn && S.sumT >= 0.99 && S.netChoice === 90 && S.net === 90, hold: 0.6,
          status: () => mark(S.sumOn && S.sumT >= 0.99) + ' 화살표 더하기 · ' + mark(S.netChoice === 90) + ' 고른 방향 ' + (S.netChoice == null ? '—' : S.netChoice === 0 ? '바람과 같은 방향' : S.netChoice === 270 ? '왼쪽 90°' : '오른쪽 ' + S.netChoice + '°'),
          explain: '층마다 방향이 다르게 돌고 줄어들어서, 이어 붙이면 합은 바람의 <b>오른쪽 90°</b>를 가리켜요. 바람 방향을 바꿔도 합은 늘 그 오른쪽 직각이에요. 이 평균 이동이 <b>에크만 수송</b>이에요.',
        },
        {
          type: 'quiz', title: '왜 45°로 흐를까?',
          goal: '표층 해류가 바람 방향이 아니라 <b>오른쪽으로 45° 기운</b> 방향으로 흐르고, 깊이에 따라 <b>나선</b>을 그리는 까닭은?',
          setup() { setMode('spiral'); setCtl(['wdSeg', 'layers']); },
          choices: ['바람이 끄는 표층수가 전향력으로 휘고, 아래층은 위층에 끌리면서 또 휘기 때문이에요', '바람이 원래 오른쪽으로 비스듬히 불기 때문이에요', '바닷물이 지구 자전 방향(동쪽)으로 흐르려 하기 때문이에요', '해저 지형이 해류를 오른쪽으로 밀기 때문이에요'],
          answer: 0,
          feedback: ['', '바람 방향은 화면에서 정해 둔 한 방향이에요. 바람 방향이 어떻든 해류는 그 오른쪽으로 기울어요.', '자전 방향과는 상관없어요. 바람의 방향이 바뀌면 해류도 따라서 바뀌어요.', '이 장면은 깊은 바다를 가정해서 바닥의 영향이 없어요. 원인은 전향력이에요.'],
          explain: '표층수는 바람에 끌려 움직이다가 <b>전향력</b>으로 오른쪽으로 휘어요. 바로 아래층은 위층에 끌려 움직이고, 이 층도 전향력으로 또 휘어요. 이렇게 층마다 조금씩 더 돌고 약해져서 <b>나선</b>이 만들어져요.',
        },
      ],
    },
    {
      title: '에크만 수송: M = τ/(ρf)', short: '에크만 수송', icon: '⚖️', phase: '분석', features: ['balance'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 층별 해류를 모두 더한 평균 수송이 바람의 오른쪽 직각이라는 것을 봤어요. 이번에는 이 수송을 <b>힘의 균형</b>으로 설명하고 양을 계산해 봐요.</div>' +
        '<p>에크만 층 전체를 하나의 덩어리로 보면, 바람이 끄는 힘(<b>바람 응력 τ</b>)과 수송 방향의 오른쪽 직각으로 작용하는 <b>전향력</b>이 정상 상태에서 크기가 같고 방향이 반대로 균형을 이뤄요. 그래서 수송은 바람의 오른쪽 직각이고, 단위 폭당 수송량은 <b>M = τ/(ρf)</b> (m²/s)예요.</p>' +
        '<p>τ = ρ<sub>공기</sub>C<sub>D</sub>U² ≈ 1.2×1.3×10⁻³×10² ≈ 0.15 N/m² (풍속 10 m/s), 바닷물의 밀도 ρ = 1025 kg/m³. 폭이 1000 km이면 총 수송량은 M × 10⁶ m이고, 1 Sv = 10⁶ m³/s예요.</p>',
      setup() { resetStep(2); },
      recap: '에크만 수송은 바람이 끄는 힘과 전향력의 균형으로 생겨요. 수송량 M = τ/(ρf)는 바람이 강할수록, 위도가 낮을수록(f가 작을수록) 커요.',
      summary: '<ul><li><b>힘의 균형</b>(정상 상태): 바람이 끄는 힘 τ + 전향력 ρ f M = 0 → 수송은 바람의 <b>오른쪽 직각</b>(북반구)이에요.</li><li><b>에크만 수송량 M = τ/(ρf)</b> (단위 폭당, m²/s). τ = ρ<sub>공기</sub>C<sub>D</sub>U² ≈ 0.15 N/m² (U = 10 m/s), ρ = 1025 kg/m³.</li><li>45°N: f = 1.03×10⁻⁴ → <b>M ≈ 1.4 m²/s</b> → 폭 1000 km에서 1.4×10⁶ m³/s = <b>1.4 Sv</b>. 15°N: f = 3.77×10⁻⁵ → M ≈ 3.9 m²/s.</li><li>같은 바람이면 <b>저위도일수록 f가 작아서 수송이 커요.</b> 남반구에서는 수송 방향이 바람의 <b>왼쪽</b>이에요.</li></ul>',
      missions: [
        {
          title: '45°N의 수송량 계산',
          goal: '바람 응력 <b>τ = 0.15 N/m²</b>, 위도 <b>45°N</b>로 맞추고, 폭 1000 km의 총 수송량을 <b>Sv</b> 단위로 계산해 입력해요.',
          hint: 'f = 2Ω sin45° ≈ 1.03×10⁻⁴ s⁻¹. M = 0.15 ÷ (1025 × 1.03×10⁻⁴) ≈ 1.4 m²/s. 폭 1000 km = 10⁶ m이므로 M × 10⁶ m³/s = 1.4 Sv예요.',
          setup() { S.showQ = false; S.names = false; setMode('balance'); setHem('N'); setCtl(['sTau', 'sLat3', 'stpQ']); stpQ.reset(); },
          check: () => S.tau === 0.15 && S.lat3 === 45 && S.hem === 'N' && Math.abs(stpQ.value - Number(fN(ekVals().Q, 1))) < 1e-6, hold: 0.8,
          status: () => mark(S.tau === 0.15) + ' τ ' + fN(S.tau, 2) + ' N/m² (목표 0.15) · ' + mark(S.lat3 === 45 && S.hem === 'N') + ' 위도 ' + S.lat3 + '°' + (S.hem === 'N' ? 'N' : 'S') + ' (목표 45°N) · ' + mark(Math.abs(stpQ.value - Number(fN(ekVals().Q, 1))) < 1e-6 && S.tau === 0.15 && S.lat3 === 45) + ' 입력 ' + fN(stpQ.value, 1) + ' Sv',
          explain: 'M = τ/(ρf) = 0.15 ÷ (1025 × 1.03×10⁻⁴) ≈ <b>1.4 m²/s</b>예요. 폭 1000 km(10⁶ m)에서는 1.4×10⁶ m³/s, 곧 <b>1.4 Sv</b>예요. 바람이 강해질수록(τ↑) 수송이 늘어요.',
        },
        {
          title: '힘 화살표 이름 붙이기', manual: true,
          goal: '그림의 화살표 ①②③에 알맞은 이름을 붙여요.',
          hint: '위쪽 화살표는 바람이 해수를 끄는 방향이에요. 전향력은 그 힘과 크기가 같고 방향이 반대예요. 옆으로 향한 화살표는 평균 이동(수송)이에요.',
          setup() { S.showQ = true; S.names = false; selForce.reset(); setMode('balance'); setCtl(['sTau', 'sLat3', 'selForce']); },
          status: () => mark(selForce.ok()) + ' 이름 붙인 화살표 ' + selForce.count() + ' / 3',
          check() {
            if (!selForce.complete()) return '화살표 3개의 이름을 모두 골라 주세요. (지금 ' + selForce.count() + '개)';
            if (!selForce.ok()) { selForce.mark(selForce.wrong()); return '빨간 줄이 달라요. 크기가 같고 방향이 반대인 두 힘이 무엇인지 생각해 봐요.'; }
            return true;
          },
          explain: '① <b>바람이 끄는 힘</b>(τ)과 ② <b>전향력</b>(ρfM)은 크기가 같고 방향이 반대라 균형을 이뤄요. 전향력은 ③ <b>수송</b>의 오른쪽 직각이므로, 수송은 바람의 오른쪽 직각이 돼요.',
        },
        {
          type: 'quiz', title: '위도와 반구에 따른 수송',
          goal: '같은 바람이 불 때 <b>저위도(15°N)</b>가 <b>45°N</b>보다 수송량이 큰 까닭은?',
          setup() { S.showQ = true; S.names = true; setMode('balance'); setCtl(['sTau', 'sLat3', 'hemSeg']); },
          choices: ['저위도일수록 f가 작아서 M = τ/(ρf)가 커져요', '저위도일수록 바람이 더 세게 불어서 τ가 커져요', '저위도에서는 전향력이 커서 해수를 더 멀리 밀어요', '위도와 수송량은 아무 관계가 없어요'],
          answer: 0,
          feedback: ['', '두 위도에서 같은 바람(τ)을 가정했어요. 달라지는 것은 f예요.', '전향력 매개변수 f는 위도가 낮을수록 작아요. 전향력이 작으면 균형을 이루려 수송이 커져야 해요.', 'M = τ/(ρf)에서 f는 위도에 따라 달라요. 반구 단추를 눌러 남반구의 수송 방향도 살펴봐요.'],
          explain: '같은 τ에서 <b>M = τ/(ρf)</b>이므로 f가 작은 저위도에서 수송이 커요(15°N ≈ 3.9 m²/s, 45°N ≈ 1.4 m²/s). 한편 같은 바람이라도 <b>남반구에서는 f의 부호가 반대라 수송이 바람의 왼쪽</b>으로 향해요.',
        },
      ],
    },
    {
      title: '용승과 침강: 수송이 모이고 흩어져요', short: '용승·침강', icon: '🌊', phase: '적용', features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에크만 수송이 바람의 오른쪽(북반구) 또는 왼쪽(남반구) 직각으로 향한다는 것을 계산했어요. 이 수송의 <b>방향</b>이 연안과 적도, 아열대 해역에서 어떤 결과를 낳을까요?</div>' +
        '<p>표층수가 <b>멀어지면(발산)</b> 빈자리를 채우려 깊은 곳의 차가운 물이 올라와요 → <b>용승</b>. 표층수가 <b>모이면(수렴)</b> 물이 쌓이며 아래로 가라앉아요 → <b>침강</b>. 지구과학에서 관측 사실로 만났던 용승을 이제 에크만 수송으로 설명할 수 있어요.</p>' +
        '<p>장면을 골라 바람 방향을 바꿔 보며, 수송 방향에 따라 수렴과 발산이 어떻게 일어나는지 확인해요.</p>',
      setup() { resetStep(3); },
      recap: '에크만 수송이 해안이나 적도에서 멀어지면 용승, 모이면 침강이 일어나요. 아열대 해역은 수송이 모여 침강하고 해수면이 높아져요.',
      summary: '<ul><li><b>용승</b>: 표층수가 발산해 깊은 곳의 차갑고 영양염이 풍부한 물이 올라와요. <b>침강</b>: 표층수가 수렴해 아래로 가라앉아요.</li><li><b>캘리포니아 연안</b>(북반구): 바람이 해안을 따라 남쪽으로 불면 수송은 오른쪽 = 바다 쪽 → 용승.</li><li><b>페루 연안</b>(남반구): 바람이 북쪽으로 불면 수송은 왼쪽 = 바다 쪽 → 용승. 영양염이 풍부해 멸치 어장이 만들어져요.</li><li><b>적도</b>: 무역풍(동→서)에서 북쪽은 오른쪽(북쪽), 남쪽은 왼쪽(남쪽)으로 수송 → 발산 → 용승.</li><li><b>아열대(약 30°N)</b>: 무역풍 아래 수송은 북쪽, 편서풍 아래 수송은 남쪽 → 수렴 → 침강, 해수면이 주변보다 높아져요. (다음 차시의 지형류로 이어져요.)</li></ul>',
      missions: [
        {
          title: '세 곳에서 용승 만들기',
          goal: '<b>캘리포니아 연안 · 페루 연안 · 적도 해역</b>에서 각각 바람 방향을 정해 <b>용승</b>이 일어나게 해요.',
          hint: '표층수가 해안(또는 적도)에서 멀어지는 쪽으로 수송되어야 해요. 수송은 바람의 오른쪽(북반구)·왼쪽(남반구) 직각이에요. 해안은 동쪽에 있어요.',
          setup() { setMode('apply'); setCtl(['sceneSeg', 'wdSeg2']); },
          check: () => S.hit.ca && S.hit.pe && S.hit.eq, hold: 0.5,
          status: () => mark(S.hit.ca) + ' 캘리포니아 · ' + mark(S.hit.pe) + ' 페루 · ' + mark(S.hit.eq) + ' 적도',
          explain: '<b>캘리포니아</b>(북반구)는 바람이 남쪽으로 불 때 수송이 오른쪽(서쪽, 바다 쪽), <b>페루</b>(남반구)는 바람이 북쪽으로 불 때 수송이 왼쪽(서쪽, 바다 쪽), <b>적도</b>는 무역풍(서쪽으로)에서 북쪽은 북으로, 남쪽은 남으로 수송되어 발산해요. 모두 <b>용승</b>이에요. 용승이 영양염을 올려 보내서 페루 앞바다는 세계적인 멸치 어장이에요.',
        },
        {
          type: 'quiz', title: '아열대 해역에서는?',
          goal: '약 30°N의 <b>아열대 해역</b>에서는 무역풍과 편서풍에 의한 에크만 수송이 어떤 결과를 낳을까요?',
          setup() { setMode('apply'); setScene('sub'); setCtl(['sceneSeg']); },
          choices: ['수송이 모여(수렴) 표층수가 가라앉고, 해수면이 주변보다 높아져요', '수송이 흩어져(발산) 깊은 물이 올라와요', '수송이 서로 상쇄되어 해수면에는 아무 변화가 없어요', '수송이 모두 적도 쪽으로만 향해요'],
          answer: 0,
          feedback: ['', '발산은 적도에서 일어나요. 아열대에서는 무역풍 아래 수송은 북쪽, 편서풍 아래 수송은 남쪽이라 중심선으로 모여요.', '수송이 서로 마주 오기 때문에 물이 쌓여요. 그림의 수면이 올라가는 것을 단면에서 확인해 봐요.', '무역풍 아래는 북쪽, 편서풍 아래는 남쪽으로 수송돼요. 한쪽으로만 향하지 않아요.'],
          explain: '약 30°N에서는 무역풍 아래 수송이 <b>북쪽</b>으로, 편서풍 아래 수송이 <b>남쪽</b>으로 향해 한곳으로 <b>수렴</b>해요. 물이 쌓여 <b>침강</b>하고 <b>해수면이 높아져요</b>. 이 높아진 해수면이 만드는 압력 차가 다음 차시의 <b>지형류</b>를 일으켜요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-ekman-transport', mount: '#game', badge: '에크만 탐정', homeHref: '../../index.html#hs',
    featureLabels: { cor: '🧭 전향력 모형 · 위도 슬라이더', spiral: '🌀 에크만 나선 · 층별 측정', balance: '⚖️ 힘의 균형 · 수송량 계산', apply: '🌊 용승 · 침강 단면' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'cor') readCor();
    else if (S.mode === 'spiral') readSpiral();
    else if (S.mode === 'balance') readBalance();
    else readApply();
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); renderLayTable(); if (!game.free) { S.sumOn = false; } }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'cor') drawCor(t, dt);
    else if (S.mode === 'spiral') drawSpiral(t, dt);
    else if (S.mode === 'balance') drawBalance(t, dt);
    else drawApply(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, clsDir, stpF, stpAng, stpQ, selForce, LAY,
    get game() { return game; }, setMode, resetStep, updateCtl, setLat, setTau, setLat3, setHem, setWind, setScene, setWd2, measure, ekVals, sceneState, netRel, fOf, spV, spTh,
    solveDir() { clsDir.sel = { a: 'r', b: 'l', c: 'n', d: 'r', e: 'l' }; },
    solveForce() { selForce.set('a', 'tau'); selForce.set('b', 'cor'); selForce.set('c', 'M'); },
  };
})();
