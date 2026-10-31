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
     지진파의 종류와 특성 (지진파 기록 → P파·S파 → 주시 곡선 → 한반도 지진)
     ====================================================== */
  initStage('#eaf1f7', 800, 560, 520, 720, 1.22);
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close !== false) ctx.closePath(); };
  const VP = 6.0, VS = 3.5, VR = 3.2;            // 지각 평균 속도(km/s, 예시)
  const DST = 210, TMAX = 80;                      // 진앙 거리(km), 기록 시간(s)
  const TA = { P: DST / VP, S: DST / VS, R: DST / VR };
  const WCOL = { P: '#2563eb', S: '#ea580c', R: '#16a34a' };
  const WNAME = { P: 'P파', S: 'S파', R: '표면파' };

  const S = {
    mode: 'rec', fade: 0, clock: 0, bad: [],
    t: 0, playing: false, marks: { P: null, S: null, R: null }, markSel: 'P',
    wave: 'P', med: 'solid', wT: 0, farAmp: 0, wSeen: {},
    st: 'A', dm: { A: 0, B: 0, C: 0 }, pin: null, solved: false, solvedK: 0, ttSeen: {},
    mg: 5, yr: 50, korSeen: {},
  };

  /* ======================================================
     장면 1: 지진파 기록
     ====================================================== */
  const RC1 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 232 }, B: { x: 8, y: 248, w: 504, h: 300 }, C: { x: 8, y: 556, w: 504, h: 156 } }
    : { A: { x: 12, y: 12, w: 776, h: 232 }, B: { x: 12, y: 252, w: 776, h: 296 } };
  const SPEED = 8;                               // 시간 가속
  const env = (tau, rise, dec) => (tau < 0 ? 0 : (1 - Math.exp(-tau / rise)) * Math.exp(-tau / dec));
  const CH = [{ n: '상하(Z)', aP: 0.9, aS: 0.45, aR: 3.0 }, { n: '남북(N)', aP: 0.35, aS: 1.5, aR: 2.2 }, { n: '동서(E)', aP: 0.3, aS: 1.7, aR: 2.6 }];
  function trace(c, t) {
    const ch = CH[c];
    let v = 0.06 * (Math.sin(t * 9.1 + c * 2.3) + 0.6 * Math.sin(t * 17.3 + c));
    v += ch.aP * env(t - TA.P, 0.25, 5) * Math.sin((TAU * (t - TA.P)) / 1.0 + c);
    v += ch.aS * env(t - TA.S, 0.5, 8) * Math.sin((TAU * (t - TA.S)) / 2.0 + 0.7 * c);
    v += ch.aR * env(t - TA.R, 2.0, 16) * Math.sin((TAU * (t - TA.R)) / 4.6 + 1.9);
    return v;
  }
  const crossGeo = () => {
    const A = RC1.A, g = { x0: A.x + 56, x1: A.x + A.w - 56, yG: A.y + 84, yB: A.y + A.h - 14 };
    g.sc = (g.x1 - g.x0) / DST;                    // px per km
    return g;
  };
  const recGeo = () => {
    const B = RC1.B, g = { x: B.x + 84, y: B.y + 40, w: B.w - 84 - 18, h: B.h - 40 - 44 };
    g.pxs = g.w / TMAX; g.bh = g.h / 3; return g;
  };
  const tOfX = (x) => clamp((x - recGeo().x) / recGeo().pxs, 0, TMAX);
  const fT = (t) => (Math.round(t * 10) / 10).toFixed(1);
  function drawLegend(x, y, w) {
    ['P', 'S', 'R'].forEach((k, i) => {
      const yy = y + i * 22 * FS * 0.95;
      ctx.fillStyle = WCOL[k]; rr(x, yy - 10, 12, 12, 3).fill();
      D.text(x + 20, yy + 1, k === 'P' ? 'P파 6.0 km/s · 가장 빨라요' : k === 'S' ? 'S파 3.5 km/s' : '표면파 약 3.2 km/s · 진폭이 가장 커요', { size: 13, weight: 800, color: '#334155', align: 'left' });
    });
  }
  function drawRec(t, dt) {
    const { A, B } = RC1, G = crossGeo(), R = recGeo();
    if (S.playing) {
      S.t = Math.min(TMAX, S.t + dt * SPEED);
      if (S.t >= TMAX) { S.playing = false; syncPlay(); }
      setSlider($('#sT'), $('#oT'), Math.round(S.t), (x) => x + ' 초');
    }
    const tt = S.t;
    card(A, '🌍 진원에서 관측소까지 (단면, 진앙 거리 ' + DST + ' km, 진원 깊이는 무시한 단순 모형)');
    ctx.save(); rr(A.x + 10, A.y + 38, A.w - 20, A.h - 48, 12).clip();
    const sky = ctx.createLinearGradient(0, A.y + 38, 0, G.yG); sky.addColorStop(0, '#bfe3f7'); sky.addColorStop(1, '#eaf6fc');
    ctx.fillStyle = sky; ctx.fillRect(A.x + 10, A.y + 38, A.w - 20, G.yG - A.y - 38);
    const cr = ctx.createLinearGradient(0, G.yG, 0, G.yB); cr.addColorStop(0, '#b79a7a'); cr.addColorStop(1, '#7d6249');
    ctx.fillStyle = cr; ctx.fillRect(A.x + 10, G.yG, A.w - 20, G.yB - G.yG + 10);
    // 파면 (P, S)
    [['P', VP], ['S', VS]].forEach((q) => {
      const rpx = q[1] * tt * G.sc;
      if (rpx <= 1) return;
      ctx.save(); ctx.beginPath(); ctx.rect(A.x + 10, G.yG, A.w - 20, G.yB - G.yG + 10); ctx.clip();
      for (let k = 0; k < 3; k++) {
        const rr0 = rpx - k * 14 * FS; if (rr0 <= 1) continue;
        ctx.strokeStyle = rgba(WCOL[q[0]], k === 0 ? 0.95 : 0.3 - k * 0.1); ctx.lineWidth = k === 0 ? 4 : 2.4;
        ctx.beginPath(); ctx.arc(G.x0, G.yG, rr0, 0, Math.PI); ctx.stroke();
      }
      ctx.restore();
    });
    // 표면파: 지표가 출렁여요
    const xs = G.x0 + VR * tt * G.sc;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.x + 10, G.yG);
    const amp = 13 * (1 - 0) ;
    for (let x = A.x + 10; x <= A.x + A.w - 10; x += 3) {
      let y = G.yG;
      if (x >= G.x0 && x <= xs) { const d = (xs - x) / G.sc; y -= amp * Math.exp(-d / 38) * Math.sin((TAU * d) / 14) * Math.min(1, (xs - x) / 12 + 0.05); }
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (tt > 0.2 && xs < G.x1 + 30) { D.sphere(Math.min(xs, A.x + A.w - 14), G.yG, 6, '#16a34a'); }
    // 진원 · 관측소
    const sh = tt >= TA.P ? trace(0, tt) * 2.2 : 0;
    ctx.fillStyle = '#dc2626'; poly([[G.x0, G.yG + 10], [G.x0 + 9, G.yG - 4], [G.x0 - 9, G.yG - 4]]); ctx.fill();
    D.glow(G.x0, G.yG, 28, '#fde047', tt < 2 ? 0.7 : 0.25);
    ctx.save(); ctx.translate(G.x1 + sh, G.yG);
    ctx.fillStyle = '#1e293b'; rr(-13, -26, 26, 22, 4).fill(); ctx.fillStyle = '#fde047'; ctx.fillRect(-9, -22, 18, 6); ctx.fillStyle = '#475569'; ctx.fillRect(-16, -4, 32, 5);
    ctx.restore();
    ctx.restore();
    D.label(G.x0 - 22, G.yG - 40, '진앙(지진 발생 지점)', { bg: '#dc2626', size: 12.5, pad: 7, align: 'left' });
    D.label(G.x1 + 22, G.yG - 52, '관측소 (지진계)', { bg: '#334155', size: 12.5, pad: 7, align: 'right' });
    D.dashedLine(G.x0, G.yG + 22, G.x1, G.yG + 22, { color: '#fff', width: 2 });
    D.label((G.x0 + G.x1) / 2, G.yG + 22, '진앙 거리 ' + DST + ' km', { bg: 'rgba(15,23,42,.8)', size: 13, pad: 8 });
    // 도착 알림
    [['P', TA.P, 56], ['S', TA.S, 76], ['R', TA.R, 96]].forEach((q) => {
      if (tt >= q[1]) D.label(G.x1 - 6, G.yG + 22 + q[2] - 24 > A.y + A.h - 22 ? A.y + A.h - 22 : G.yG + 22 + q[2] - 24, WNAME[q[0]] + ' 도착', { bg: WCOL[q[0]], size: 12.5, pad: 7, align: 'right' });
    });
    if (!PHONE) { D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(A.x + 16, A.y + A.h - 74, 330, 64, 10).fill(); }, { blur: 4, y: 1 }); drawLegend(A.x + 30, A.y + A.h - 52, 260); }

    // 지진 기록
    card(B, '📈 지진계 기록 (예시): 가로 = 지진 발생 후 시간(초)');
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(R.x, R.y, R.w, R.h);
    for (let c = 0; c < 3; c++) { ctx.fillStyle = c % 2 ? 'rgba(148,163,184,.1)' : 'rgba(148,163,184,.04)'; ctx.fillRect(R.x, R.y + c * R.bh, R.w, R.bh); }
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let s = 0; s <= TMAX; s += 10) { const x = R.x + s * R.pxs; ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, R.y + R.h); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(R.x, R.y, R.w, R.h);
    for (let s = 0; s <= TMAX; s += 10) D.text(R.x + s * R.pxs, R.y + R.h + 16 * FS, String(s), { size: 12.5, weight: 700, color: '#64748b' });
    D.text(R.x + R.w / 2, R.y + R.h + 34 * FS, '시간 (초)', { size: 12.5, weight: 700, color: '#64748b' });
    for (let c = 0; c < 3; c++) {
      const cy = R.y + (c + 0.5) * R.bh, half = R.bh / 2 - 3;
      D.text(R.x - 8, cy + 4, CH[c].n, { size: 13, weight: 800, color: '#475569', align: 'right' });
      ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y + c * R.bh, R.w, R.bh); ctx.clip();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(R.x, cy); ctx.lineTo(R.x + R.w, cy); ctx.stroke();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.beginPath();
      const n = Math.floor(tt / 0.2);
      for (let i = 0; i <= n; i++) { const ti = i * 0.2, y = cy - (clamp(trace(c, ti), -3.3, 3.3) / 3.3) * half; i ? ctx.lineTo(R.x + ti * R.pxs, y) : ctx.moveTo(R.x + ti * R.pxs, y); }
      const yEnd = cy - (clamp(trace(c, tt), -3.3, 3.3) / 3.3) * half;
      ctx.lineTo(R.x + tt * R.pxs, yEnd); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(R.x + tt * R.pxs, yEnd, 3.4, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(220,38,38,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(R.x + tt * R.pxs, R.y); ctx.lineTo(R.x + tt * R.pxs, R.y + R.h); ctx.stroke();
    // 표시한 도착 시각
    ['P', 'S', 'R'].forEach((k, i) => {
      const m = S.marks[k]; if (m == null) return;
      const x = R.x + m * R.pxs;
      ctx.strokeStyle = WCOL[k]; ctx.lineWidth = 2.4; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, R.y + R.h); ctx.stroke(); ctx.setLineDash([]);
      D.label(Math.min(x + 4, R.x + R.w - 92), R.y + 14 + i * 22, WNAME[k] + ' ' + fT(m) + ' s', { bg: WCOL[k], size: 12.5, pad: 6, align: 'left' });
    });
    if (S.marks.P != null && S.marks.S != null) D.text(R.x + R.w - 4, R.y + R.h + 34 * FS, 'S−P 시간 = ' + fT(S.marks.S - S.marks.P) + ' 초', { size: 13.5, weight: 800, color: '#0369a1', align: 'right' });
    if (PHONE) { card(RC1.C, '🔖 세 가지 파의 특징'); drawLegend(RC1.C.x + 20, RC1.C.y + 56, RC1.C.w); drawWrap(RC1.C.x + RC1.C.w / 2, RC1.C.y + 56 + 22 * FS * 0.95 * 2 + 28, '기록에서 처음 작은 흔들림이 P파, 다음이 S파, 마지막이 큰 표면파예요.', RC1.C.w - 32, 13, { color: '#475569' }); }
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'rec' && game && (game.has('rec') || game.free)) {
        const R = recGeo();
        if (p.x >= R.x - 6 && p.x <= R.x + R.w + 6 && p.y >= R.y - 6 && p.y <= R.y + R.h + 6) { setMark(p.x); return true; }
      }
      if (S.mode === 'tt' && game && (game.has('tt') || game.free)) return ttDown(p);
      return false;
    },
    move(p) { if (S.mode === 'rec') setMark(p.x); else if (S.mode === 'tt') ttMove(p); },
    up() { },
  });
  function setMark(x) {
    const t = Math.min(Math.round(tOfX(x) * 2) / 2, S.t);
    S.marks[S.markSel] = Math.round(t * 2) / 2;
  }

  /* ======================================================
     장면 2: P파 · S파 · 표면파의 입자 모형
     ====================================================== */
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 330 }, B: { x: 8, y: 346, w: 504, h: 366 } }
    : { A: { x: 12, y: 12, w: 776, h: 316 }, B: { x: 12, y: 336, w: 776, h: 212 } };
  const SPR = {};
  function sprite(color, r) {
    const key = color + '|' + r; if (SPR[key]) return SPR[key];
    const sz = Math.ceil(2 * r + 6), c = document.createElement('canvas'); c.width = c.height = sz * 2;
    const o = c.getContext('2d'); o.scale(2, 2); SciSim.draw(o).sphere(sz / 2, sz / 2, r, color);
    return (SPR[key] = { c, sz });
  }
  function ball(x, y, r, color) { const s = sprite(color, Math.round(r * 2) / 2); ctx.drawImage(s.c, x - s.sz / 2, y - s.sz / 2, s.sz, s.sz); }
  const COLS = PHONE ? 18 : 26, ROWS = 8;
  const latGeo = () => {
    const A = RC2.A, L = { x: A.x + 40, y: A.y + 98, w: A.w - 80, h: A.h - 138 };
    L.sx = L.w / (COLS - 1); L.sy = L.h / (ROWS - 1);
    L.vP = L.w / 4.0; L.vS = (L.vP * VS) / VP; L.vR = (L.vP * VR) / VP;     // px/s (속도 비는 6.0 : 3.5 : 3.2)
    return L;
  };
  const WPER = 1.5, WOM = TAU / WPER;
  const vOf = (L, w) => (w === 'P' ? L.vP : w === 'S' ? L.vS : L.vR);
  const sm = (x) => smooth(x);
  /* 한 점의 변위: xr = 원천에서의 거리(px), z = 표면 깊이(px) */
  function disp(L, w, med, xr, z, tw) {
    const v = vOf(L, w), k = WOM / v, xf = v * tw, lam = v * WPER;
    const e = sm((xf - xr) / (0.6 * lam));
    const f = w === 'S' && med === 'liquid' ? Math.exp(-xr / (1.2 * L.sx)) : 1;
    const ph = k * xr - WOM * tw;
    if (w === 'P') return { x: 8 * e * f * Math.cos(ph), y: 0, e: e * f };
    if (w === 'S') return { x: 0, y: 11 * e * f * Math.cos(ph), e: e * f };
    const dec = Math.exp(-z / (1.7 * L.sy));
    return { x: -9 * e * f * dec * Math.cos(ph), y: -7 * e * f * dec * Math.sin(ph), e: e * f };
  }
  function waveReset() { S.wT = 0; }
  function farAmpNow() { const L = latGeo(), d = disp(L, S.wave, S.med, L.w, 0, S.wT); return Math.round(d.e * 100); }
  const arriveT = (w) => { const L = latGeo(); return L.w / vOf(L, w); };
  const WROWS = {
    P: ['P파 (종파)', '진행 방향과 나란하게 압축·팽창', '6.0 km/s (가장 빠름)', '고체 · 액체 · 기체'],
    S: ['S파 (횡파)', '진행 방향에 수직으로 흔들림', '3.5 km/s', '고체만 (액체 ×)'],
    R: ['표면파', '지표를 따라 타원을 그리며 진동', '약 3.2 km/s (진폭 최대)', '지표 부근의 고체'],
  };
  function drawWave(t, dt) {
    const { A, B } = RC2, L = latGeo();
    S.wT += dt;
    S.farAmp = farAmpNow();
    const liq = S.med === 'liquid', w = S.wave;
    card(A, '🧩 입자 격자로 본 지진파 (' + (liq ? '액체' : '고체') + ' 매질, 시간 가속 모형)');
    // 매질
    const bgc = liq ? '#d7ebff' : '#eadfce';
    ctx.fillStyle = bgc; rr(L.x - 24, L.y - 18, L.w + 48, L.h + 36, 12).fill();
    ctx.strokeStyle = liq ? '#60a5fa' : '#a8896a'; ctx.lineWidth = 2.5; rr(L.x - 24, L.y - 18, L.w + 48, L.h + 36, 12).stroke();
    if (w === 'R') {
      ctx.fillStyle = '#cfe8f7'; ctx.fillRect(L.x - 22, L.y - 52, L.w + 44, 36);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.x - 24, L.y - 18); ctx.lineTo(L.x + L.w + 24, L.y - 18); ctx.stroke();
      D.text(L.x + L.w - 4, L.y - 28, '지표 (공기와 닿은 면)', { size: 12.5, weight: 800, color: '#475569', align: 'right' });
    }
    // 원천 판
    const src = (() => { const ph = -WOM * S.wT; return w === 'P' ? { x: 8 * Math.cos(ph), y: 0 } : w === 'S' ? { x: 0, y: 11 * Math.cos(ph) } : { x: -9 * Math.cos(ph), y: -7 * Math.sin(ph) }; })();
    ctx.fillStyle = '#7c2d12'; rr(L.x - 20 + src.x, L.y - 14 + src.y, 10, L.h + 28, 4).fill();
    // 입자 위치
    const P = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const xr = i * L.sx, z = j * L.sy, d = disp(L, w, S.med, xr, z, S.wT);
      P.push({ i, j, x: L.x + xr + d.x, y: L.y + z + d.y, x0: L.x + xr, y0: L.y + z, d });
    }
    const at = (i, j) => P[j * COLS + i];
    // 결합(용수철): 고체에서만 그려요
    if (!liq) {
      ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const a = at(i, j);
        if (i + 1 < COLS) { const b = at(i + 1, j); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        if (j + 1 < ROWS) { const b = at(i, j + 1); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      }
      ctx.stroke();
    }
    // 제자리 점 (입자는 제자리에서 진동만 해요)
    ctx.fillStyle = 'rgba(30,41,59,.22)';
    P.forEach((q) => { ctx.beginPath(); ctx.arc(q.x0, q.y0, 1.8, 0, TAU); ctx.fill(); });
    const rad = PHONE ? 4.4 : 5.4, trI = PHONE ? 6 : 8, trJ = w === 'R' ? 0 : 3;
    P.forEach((q) => {
      let col;
      if (w === 'P') { const a = q.i > 0 && q.i < COLS - 1 ? at(q.i + 1, q.j).d.x - at(q.i - 1, q.j).d.x : 0; col = mixc('#7dd3fc', '#1d4ed8', clamp(0.5 - a / 14, 0, 1)); }
      else if (w === 'S') col = mixc('#fdba74', '#c2410c', clamp(0.5 + q.d.y / 22, 0, 1));
      else col = mixc('#86efac', '#15803d', clamp(0.5 + q.d.y / 14, 0, 1));
      if (liq) col = mixc(col, '#93c5fd', 0.35);
      ball(q.x, q.y, q.i === trI && q.j === trJ ? rad + 1.6 : rad, q.i === trI && q.j === trJ ? '#e11d48' : col);
    });
    // 진동 방향 표시 (빨간 입자의 움직임 범위)
    const tr = at(trI, trJ);
    ctx.strokeStyle = 'rgba(225,29,72,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    if (w === 'P') { ctx.beginPath(); ctx.moveTo(tr.x0 - 10, tr.y0); ctx.lineTo(tr.x0 + 10, tr.y0); ctx.stroke(); }
    else if (w === 'S') { ctx.beginPath(); ctx.moveTo(tr.x0, tr.y0 - 13); ctx.lineTo(tr.x0, tr.y0 + 13); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(tr.x0, tr.y0, 9, 7, 0, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    // 화살표 두 개: 진행 방향, 진동 방향
    const ay = L.y - (w === 'R' ? 60 : 36) + 4;
    const ax0 = PHONE ? L.x + 4 : L.x + L.w * 0.3;
    D.arrow(ax0, ay, ax0 + (PHONE ? 56 : 78), ay, { color: '#0369a1', width: 3.4, head: 12 });
    D.text(ax0 + (PHONE ? 64 : 88), ay + 5, '진행 방향', { size: 13, weight: 800, color: '#0369a1', align: 'left' });
    const vx = ax0 + (PHONE ? 150 : 230);
    if (w === 'P') { D.arrow(vx, ay, vx + 34, ay, { color: '#e11d48', width: 3.4, head: 11 }); D.arrow(vx + 34, ay, vx, ay, { color: '#e11d48', width: 3.4, head: 11 }); }
    else if (w === 'S') { D.arrow(vx + 17, ay + 14, vx + 17, ay - 14, { color: '#e11d48', width: 3.4, head: 11 }); D.arrow(vx + 17, ay - 14, vx + 17, ay + 14, { color: '#e11d48', width: 3.4, head: 11 }); }
    else { ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(vx + 17, ay, 16, 10, 0, 0, TAU); ctx.stroke(); }
    D.text(vx + 46, ay + 5, w === 'P' ? '진동 방향 (나란함)' : w === 'S' ? '진동 방향 (수직)' : '입자의 운동 (타원)', { size: 13, weight: 800, color: '#e11d48', align: 'left' });
    if (liq && w === 'S') D.label(L.x + L.w * 0.5, L.y + L.h / 2, '액체는 모양이 변해도 되돌아오려는 힘이 없어 S파가 전해지지 않아요', { bg: 'rgba(185,28,28,.92)', size: 13, pad: 9 });
    D.text(A.x + A.w - 14, A.y + A.h - 10, '오른쪽 끝 입자의 흔들림: ' + S.farAmp + ' %', { size: 13.5, weight: 800, color: S.farAmp < 5 && S.wT > arriveT(w) ? '#b91c1c' : '#334155', align: 'right' });
    if (!PHONE) D.text(A.x + 16, A.y + A.h - 10, '빨간 입자: 제자리에서만 진동해요', { size: 13, weight: 700, color: '#475569', align: 'left' });

    // 비교표
    card(B, '📋 세 가지 지진파 비교 (지각 평균 속도, 예시)');
    const keys = ['P', 'S', 'R'];
    if (!PHONE) {
      const cw = [118, 250, 160, 220], x0 = B.x + 14, hy = B.y + 36;
      const heads = ['파', '진동 방향', '속도', '통과하는 매질'];
      let cx = x0; heads.forEach((h, i) => { D.text(cx + cw[i] / 2, hy + 18, h, { size: 13, weight: 800, color: '#64748b' }); cx += cw[i]; });
      keys.forEach((k, r) => {
        const y = hy + 28 + r * 32, sel = w === k;
        ctx.fillStyle = sel ? rgba(WCOL[k], 0.14) : '#f8fafc'; rr(x0 - 4, y, cw.reduce((a, b) => a + b, 0) + 8, 28, 8).fill();
        if (sel) { ctx.strokeStyle = WCOL[k]; ctx.lineWidth = 2; rr(x0 - 4, y, cw.reduce((a, b) => a + b, 0) + 8, 28, 8).stroke(); }
        let c2 = x0; WROWS[k].forEach((tx, i) => { D.text(c2 + cw[i] / 2, y + 19, tx, { size: 13, weight: i === 0 ? 800 : 700, color: i === 0 ? WCOL[k] : '#334155' }); c2 += cw[i]; });
      });
    } else {
      keys.forEach((k, r) => {
        const y = B.y + 38 + r * 78, sel = w === k;
        ctx.fillStyle = sel ? rgba(WCOL[k], 0.14) : '#f8fafc'; rr(B.x + 10, y, B.w - 20, 72, 10).fill();
        if (sel) { ctx.strokeStyle = WCOL[k]; ctx.lineWidth = 2.4; rr(B.x + 10, y, B.w - 20, 72, 10).stroke(); }
        D.text(B.x + 22, y + 20, WROWS[k][0] + ' · ' + WROWS[k][2], { size: 13.5, weight: 800, color: WCOL[k], align: 'left' });
        D.text(B.x + 22, y + 42, WROWS[k][1], { size: 13, weight: 700, color: '#334155', align: 'left' });
        D.text(B.x + 22, y + 62, '통과: ' + WROWS[k][3], { size: 13, weight: 700, color: '#475569', align: 'left' });
      });
    }
    const fy = PHONE ? B.y + B.h - 64 : B.y + B.h - 38;
    if (!liq) {
      drawWrap(B.x + B.w / 2, fy, 'S파 속도 v_S = √(μ/ρ) = √(3.7×10¹⁰ Pa / 3000 kg/m³) ≈ 3.5 km/s', B.w - 24, 14, { color: '#0f172a', weight: 800 });
      D.text(B.x + B.w / 2, fy + 22 * FS + (PHONE ? 14 : 0), 'μ(강성률): 모양이 바뀔 때 되돌리려는 힘의 크기', { size: 13, weight: 700, color: '#64748b' });
    } else {
      drawWrap(B.x + B.w / 2, fy, '액체는 μ = 0 → v_S = √(0/ρ) = 0 : S파는 액체를 통과하지 못해요', B.w - 24, 14, { color: '#b91c1c', weight: 800 });
      drawWrap(B.x + B.w / 2, fy + 22 * FS + (PHONE ? 14 : 0), 'P파는 부피 변화(압축·팽창)만 있으면 되므로 액체도 통과해요', B.w - 24, 13, { color: '#64748b' });
    }
  }

  /* ======================================================
     장면 3: 주시 곡선과 진앙 찾기
     ====================================================== */
  const RC3 = PHONE
    ? { B: { x: 8, y: 8, w: 504, h: 290 }, A: { x: 8, y: 306, w: 504, h: 406 } }
    : { A: { x: 12, y: 12, w: 410, h: 536 }, B: { x: 430, y: 12, w: 358, h: 326 }, C: { x: 430, y: 346, w: 358, h: 202 } };
  const STN = {
    A: { x: -150, y: -147, dt: 25, c: '#2563eb' },
    B: { x: 240, y: 235, dt: 40, c: '#ea580c' },
    C: { x: 84, y: -94, dt: 15, c: '#16a34a' },
  };
  const ST_IDS = ['A', 'B', 'C'];
  const KDT = (VP * VS) / (VP - VS);                 // d = 8.4 × Δt
  const TTOL = 8;                                    // 거리 읽기 허용 오차(km)
  const matched = (k) => S.dm[k] > 0 && Math.abs(S.dm[k] - KDT * STN[k].dt) <= TTOL;
  const allMatched = () => ST_IDS.every(matched);
  const pinOk = () => !!S.pin && Math.hypot(S.pin.x, S.pin.y) <= 15;
  const mapGeo = () => {
    const A = RC3.A, size = Math.min(A.w - 28, A.h - (PHONE ? 92 : 64)), g = { x: A.x + (A.w - size) / 2, y: A.y + 40, w: size, h: size };
    g.s = size / 550; return g;
  };
  const mpx = (g, x) => g.x + (x + 250) * g.s, mpy = (g, y) => g.y + (300 - y) * g.s;
  const grGeo = () => { const B = RC3.B, g = { x: B.x + 52, y: B.y + 38, w: B.w - 52 - 16, h: B.h - 38 - (PHONE ? 76 : 70) }; return g; };
  const gX = (g, d) => g.x + (d / 350) * g.w, gY = (g, t) => g.y + g.h - (t / 100) * g.h;
  const dOfX = (g, x) => clamp(Math.round(((x - g.x) / g.w) * 350 / 2) * 2, 0, 350);
  let ttDrag = null;
  function ttDown(p) {
    const g = grGeo(), m = mapGeo();
    if (p.x >= g.x - 8 && p.x <= g.x + g.w + 8 && p.y >= g.y - 8 && p.y <= g.y + g.h + 8) { ttDrag = 'g'; S.dm[S.st] = dOfX(g, p.x); S.ttSeen[S.st] = true; return true; }
    // 관측소 삼각형을 눌러 고르기
    for (const k of ST_IDS) { if (Math.hypot(p.x - mpx(m, STN[k].x), p.y - mpy(m, STN[k].y)) < 18) { selSt(k); return false; } }
    if (p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h) { ttDrag = 'm'; setPin(p); return true; }
    return false;
  }
  function ttMove(p) {
    if (ttDrag === 'g') { const g = grGeo(); S.dm[S.st] = dOfX(g, p.x); }
    else if (ttDrag === 'm') setPin(p);
  }
  function setPin(p) { const m = mapGeo(); S.pin = { x: Math.round(clamp((p.x - m.x) / m.s - 250, -250, 300)), y: Math.round(clamp(300 - (p.y - m.y) / m.s, -250, 300)) }; }
  function selSt(k) { S.st = k; S.ttSeen[k] = true; syncSt(); }
  const clockTxt = (sec) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };

  function drawTT(t, dt) {
    const { A, B, C } = RC3, g = grGeo(), m = mapGeo(), st = STN[S.st];
    S.solved = allMatched() && pinOk();
    S.solvedK = approach(S.solvedK, S.solved ? 1 : 0, dt, 4);
    // 그래프
    card(B, '📈 주시 곡선: 진앙 거리와 도착 시간');
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let d = 0; d <= 350; d += 50) { const x = gX(g, d); ctx.beginPath(); ctx.moveTo(x, g.y); ctx.lineTo(x, g.y + g.h); ctx.stroke(); if (d % 100 === 0) D.text(x, g.y + g.h + 15 * FS, String(d), { size: 12.5, weight: 700, color: '#64748b' }); }
    for (let tt = 0; tt <= 100; tt += 20) { const y = gY(g, tt); ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + g.w, y); ctx.stroke(); D.text(g.x - 6, y + 4.5, String(tt), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); }
    D.text(g.x + g.w / 2, g.y + g.h + 32 * FS, '진앙 거리 (km)', { size: 12.5, weight: 700, color: '#64748b' });
    ctx.save(); ctx.translate(B.x + 14, g.y + g.h / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '시간 (초)', { size: 12.5, weight: 700, color: '#64748b' }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    [['R', VR, true], ['S', VS, false], ['P', VP, false]].forEach((q) => {
      ctx.strokeStyle = WCOL[q[0]]; ctx.lineWidth = q[2] ? 2 : 3.4; ctx.setLineDash(q[2] ? [6, 5] : []);
      ctx.beginPath(); ctx.moveTo(gX(g, 0), gY(g, 0)); ctx.lineTo(gX(g, 350), gY(g, 350 / q[1])); ctx.stroke(); ctx.setLineDash([]);
    });
    // 관측소의 S−P 시간(자)
    const rx = g.x + 12, hR = (st.dt / 100) * g.h;
    ctx.fillStyle = rgba(st.c, 0.22); ctx.fillRect(rx - 6, g.y + g.h - hR, 12, hR);
    ctx.strokeStyle = st.c; ctx.lineWidth = 2.4; ctx.strokeRect(rx - 6, g.y + g.h - hR, 12, hR);
    // 움직이는 괄호
    const dm = S.dm[S.st];
    if (dm > 0) {
      const x = gX(g, dm), yP = gY(g, dm / VP), yS = gY(g, dm / VS), ok = matched(S.st), col = ok ? '#15803d' : '#dc2626';
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x, yP); ctx.lineTo(x, yS); ctx.moveTo(x - 6, yP); ctx.lineTo(x + 6, yP); ctx.moveTo(x - 6, yS); ctx.lineTo(x + 6, yS); ctx.stroke();
      ctx.restore(); ctx.save();
      D.label(clamp(x + 6, g.x + 70, g.x + g.w - 60), clamp((yP + yS) / 2, g.y + 14, g.y + g.h - 14), 'S−P ' + (Math.round((dm / KDT) * 10) / 10).toFixed(1) + ' s', { bg: col, size: 12.5, pad: 6 });
      ctx.restore(); ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
      ctx.strokeStyle = 'rgba(71,85,105,.5)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, yS); ctx.lineTo(x, g.y + g.h); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(g.x, g.y, g.w, g.h);
    if (dm > 0) D.label(clamp(gX(g, dm), g.x + 30, g.x + g.w - 30), g.y + g.h + 0, dm + ' km', { bg: matched(S.st) ? '#15803d' : '#475569', size: 12.5, pad: 6 });
    D.text(rx, g.y + 14 * FS, '자', { size: 12.5, weight: 800, color: st.c });
    [['P', '#2563eb', 0.55], ['S', '#ea580c', 0.88]].forEach((q) => {
      const d = q[0] === 'P' ? 330 : 345, y = gY(g, d / (q[0] === 'P' ? VP : VS));
      if (y > g.y + 8) D.text(gX(g, d) - 4, y - 7, q[0], { size: 14, weight: 800, color: q[1], align: 'right', stroke: '#fff', strokeWidth: 3 });
    });
    D.text(gX(g, 330), gY(g, 330 / VR) - 6, '표면파', { size: 12.5, weight: 800, color: '#15803d', align: 'right', stroke: '#fff', strokeWidth: 3 });
    if (PHONE) D.text(B.x + 14, g.y + g.h + 54, '관측소 ' + S.st + ': S−P ' + st.dt + ' s인 색 막대에 괄호 높이를 맞춰요', { size: 12.5, weight: 800, color: st.c, align: 'left' });
    else drawWrap(B.x + 14, B.y + B.h - 22, '관측소 ' + S.st + ': 색 막대(S−P ' + st.dt + ' s)와 괄호 높이가 같아지는 거리를 찾아요', B.w - 28, 12.5, { color: st.c, align: 'left', weight: 800, lh: 1.2 });
    if (PHONE) {
      if (matched('A')) D.text(B.x + 14, g.y + g.h + 72, '발생 시각 = P파 도착(10:20:35) − ' + Math.round(S.dm.A / VP) + ' s = ' + clockTxt(10 * 3600 + 20 * 60 + 35 - Math.round(S.dm.A / VP)), { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
    }

    // 지도
    card(A, '🗺️ 지도: 거리를 반지름으로 하는 원 (북쪽이 위)');
    ctx.save(); rr(m.x, m.y, m.w, m.h, 8).clip();
    ctx.fillStyle = '#e6f0e4'; ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.strokeStyle = '#cfdccb'; ctx.lineWidth = 1;
    for (let v = -200; v <= 300; v += 100) { ctx.beginPath(); ctx.moveTo(mpx(m, v), m.y); ctx.lineTo(mpx(m, v), m.y + m.h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(m.x, mpy(m, v)); ctx.lineTo(m.x + m.w, mpy(m, v)); ctx.stroke(); }
    ST_IDS.forEach((k) => {
      const d = S.dm[k]; if (d <= 0) return;
      const ok = matched(k), n = STN[k], cx = mpx(m, n.x), cy = mpy(m, n.y), rp = d * m.s;
      ctx.strokeStyle = n.c; ctx.lineWidth = ok ? 3.4 : 2; ctx.setLineDash(ok ? [] : [7, 5]); ctx.globalAlpha = k === S.st ? 1 : 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (ok) { ctx.fillStyle = rgba(n.c, 0.06); ctx.fill(); }
    });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(m.x, m.y, m.w, m.h, 8).stroke();
    [-200, 0, 200].forEach((v) => { D.text(mpx(m, v), m.y + m.h + 14 * FS, String(v), { size: 12, weight: 700, color: '#94a3b8' }); D.text(m.x + 4, mpy(m, v) - 3, String(v), { size: 12, weight: 700, color: '#94a3b8', align: 'left' }); });
    ST_IDS.forEach((k) => {
      const n = STN[k], x = mpx(m, n.x), y = mpy(m, n.y);
      if (k === S.st) D.ring(x, y, 17, t, { color: n.c });
      ctx.fillStyle = n.c; poly([[x, y - 10], [x - 9, y + 7], [x + 9, y + 7]]); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
      D.text(x, y - 15, k, { size: 14, weight: 800, color: n.c, stroke: '#fff', strokeWidth: 3.5 });
    });
    if (S.pin) {
      const x = mpx(m, S.pin.x), y = mpy(m, S.pin.y);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x - 9, y + 9); ctx.stroke();
      D.label(x, y + 22, '내가 찍은 점 (' + S.pin.x + ', ' + S.pin.y + ') km', { bg: '#dc2626', size: 12, pad: 6 });
    }
    if (S.solvedK > 0.02) {
      const x = mpx(m, 0), y = mpy(m, 0);
      ctx.save(); ctx.globalAlpha = S.solvedK; D.glow(x, y, 34, '#fde047', 0.9); D.sphere(x, y, 9, '#dc2626', { text: '★', textScale: 1.2 }); ctx.restore();
      if (S.solved && Math.random() < 0.02 && !RM) parts.burst(x, y, { count: 14, speed: 120, life: 0.7 });
      D.label(x, y - 24, '진앙 (0, 0)', { bg: '#b91c1c', size: 13, pad: 8 });
    }
    D.text(A.x + A.w / 2, A.y + A.h - 8, '원이 겹치는 곳을 눌러 진앙을 표시해요 (단위: km)', { size: 12.5, weight: 700, color: '#64748b' });

    // 표
    if (!PHONE && C) {
      card(C, '🧮 관측소 기록 (S−P 시간은 예시 자료)');
      const x0 = C.x + 14, cw = [74, 84, 100, 56];
      ['관측소', 'S−P 시간', '찾은 거리', '확인'].forEach((h, i) => D.text(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, C.y + 50, h, { size: 12.5, weight: 800, color: '#64748b' }));
      ST_IDS.forEach((k, i) => {
        const y = C.y + 60 + i * 30, sel = S.st === k;
        ctx.fillStyle = sel ? rgba(STN[k].c, 0.14) : '#f8fafc'; rr(x0 - 4, y, C.w - 20, 26, 7).fill();
        const cs = [k, STN[k].dt + ' s', S.dm[k] > 0 ? S.dm[k] + ' km' : '—', matched(k) ? '✅' : '⬜'];
        cs.forEach((tx, c) => D.text(x0 + cw.slice(0, c).reduce((a, b) => a + b, 0) + cw[c] / 2, y + 18, tx, { size: 13.5, weight: 800, color: c === 0 ? STN[k].c : '#334155' }));
      });
      const ay = C.y + 170;
      if (matched('A')) {
        const tp = Math.round(S.dm.A / VP);
        D.text(x0, ay, '발생 시각 = P파 도착 시각 − P파 이동 시간', { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
        D.text(x0, ay + 20 * FS, 'A: 10:20:35 − (' + S.dm.A + ' km / 6.0 km/s = ' + tp + ' s) = ' + clockTxt(10 * 3600 + 20 * 60 + 35 - tp), { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      } else D.text(x0, ay + 6, '관측소 A를 먼저 맞추면 지진 발생 시각을 구할 수 있어요.', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    }
  }

  /* ======================================================
     장면 4: 한반도 지진 (예시 자료)
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 340 }, B: { x: 8, y: 356, w: 504, h: 176 }, C: { x: 8, y: 540, w: 504, h: 172 } }
    : { A: { x: 12, y: 12, w: 420, h: 536 }, B: { x: 440, y: 12, w: 348, h: 270 }, C: { x: 440, y: 290, w: 348, h: 258 } };
  const NTAB = { 2: 70, 3: 10, 4: 1.2, 5: 0.15, 6: 0.015, 7: 0.0015 };   // 규모 이상 지진의 연평균 횟수(예시)
  const fN = (n) => (n >= 10 ? String(Math.round(n)) : n >= 1 ? n.toFixed(1) : n >= 0.1 ? n.toFixed(2) : n >= 0.01 ? n.toFixed(3) : n.toFixed(4));
  const Tof = (m) => 1 / NTAB[m];
  const fTy = (T) => (T < 1 ? '약 ' + Math.round(T * 365) + '일' : T < 10 ? (Math.round(T * 10) / 10).toFixed(1) + '년' : Math.round(T) + '년');
  const probOf = (m, yr) => 1 - Math.exp(-yr / Tof(m));
  const fProb = (p) => (p >= 0.995 ? '약 100 %' : p < 0.005 ? '1 % 미만' : Math.round(p * 100) + ' %');
  const MAPK = () => {
    const A = RC4.A, g = { x: A.x + 12, y: A.y + 40, w: A.w - 24, h: A.h - (PHONE ? 62 : 70) };
    g.lat1 = PHONE ? 39.2 : 43; g.sc = g.h / (g.lat1 - 33); g.k = 0.81 * g.sc; return g;
  };
  const lx = (g, lon) => g.x + (lon - 124) * g.k, ly = (g, lat) => g.y + (g.lat1 - lat) * g.sc;
  const KOR = [[124.35, 39.9], [125.0, 39.6], [125.3, 38.7], [124.9, 38.05], [125.4, 37.65], [126.3, 37.75], [126.6, 37.4], [126.3, 36.9], [126.5, 36.4], [126.7, 35.95], [126.5, 35.55], [126.3, 34.8], [126.55, 34.3], [127.2, 34.5], [127.7, 34.75], [128.4, 34.85], [129.05, 35.1], [129.4, 35.5], [129.5, 36.05], [129.4, 36.9], [129.15, 37.45], [128.95, 37.75], [128.6, 38.25], [128.35, 38.65], [127.6, 39.2], [127.7, 39.7], [128.4, 40.4], [129.3, 40.9], [129.8, 41.5], [130.4, 42.2], [130.65, 42.35], [129.4, 42.45], [128.1, 42.0], [127.0, 41.7], [126.1, 41.1], [125.3, 40.5]];
  const JPN = [[129.9, 33.0], [129.7, 33.4], [130.4, 33.9], [131.0, 34.4], [132.4, 35.2], [134.0, 35.6], [136, 35.4], [136, 33.0]];
  const QK = (() => {
    const rn = seeded(17), zones = [[129.2, 35.8, 0.3, 5], [126.8, 36.4, 0.45, 3], [127.9, 37.4, 0.45, 3], [125.6, 36.9, 0.5, 2], [130.3, 36.4, 0.5, 2], [127.4, 35.2, 0.5, 2], [128.4, 38.0, 0.45, 2], [125.8, 34.9, 0.4, 1]];
    const tot = zones.reduce((a, z) => a + z[3], 0), g2 = () => Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(TAU * rn());
    const pick = () => { let r = rn() * tot; for (const z of zones) { r -= z[3]; if (r <= 0) return [z[0] + g2() * z[2], z[1] + g2() * z[2] * 0.9]; } return [127.5, 36.5]; };
    const q = [{ lon: 129.19, lat: 35.77, m: 5.8, nm: '2016 경주 5.8' }, { lon: 129.37, lat: 36.11, m: 5.4, nm: '2017 포항 5.4' }];
    for (let i = 0; i < 10; i++) { const p = pick(); q.push({ lon: p[0], lat: p[1], m: 4 + Math.pow(rn(), 1.4) * 0.95 }); }
    for (let i = 0; i < 88; i++) { const p = pick(); q.push({ lon: p[0], lat: p[1], m: 3 + Math.pow(rn(), 1.8) * 0.99 }); }
    return q;
  })();
  const nQ = (m) => QK.filter((q) => q.m >= m).length;
  function starP(x, y, R, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rad = i % 2 ? r : R; i ? ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); }
  function drawKor(t, dt) {
    const { A, B, C } = RC4, g = MAPK();
    card(A, '🗺️ 한반도와 주변의 지진 (예시 자료, 최근 10년 모형)');
    ctx.save(); rr(g.x, g.y, g.w, g.h, 10).clip();
    ctx.fillStyle = '#cfe6f7'; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = '#e4dcc3'; poly(JPN.map((p) => [lx(g, p[0]), ly(g, p[1])])); ctx.fill(); ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#e8e2cc'; poly(KOR.map((p) => [lx(g, p[0]), ly(g, p[1])])); ctx.fill(); ctx.strokeStyle = '#78716c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(lx(g, 126.55), ly(g, 33.38), 0.32 * g.k, 0.13 * g.sc, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // 활성 단층(예시 위치)
    D.dashedLine(lx(g, 129.1), ly(g, 35.1), lx(g, 129.45), ly(g, 36.2), { color: '#7c3aed', width: 2.4 });
    // 압축력
    const sy2 = ly(g, PHONE ? 33.9 : 34.4);
    D.arrow(lx(g, 124.25), sy2, lx(g, 124.95), sy2, { color: '#0369a1', width: 3, head: 10 });
    D.arrow(lx(g, PHONE ? 133.3 : 132.3), sy2, lx(g, PHONE ? 132.6 : 131.6), sy2, { color: '#0369a1', width: 3, head: 10 });
    // 지진
    const q5 = [];
    QK.forEach((q) => {
      if (q.m < S.mg) return;
      const x = lx(g, q.lon), y = ly(g, q.lat);
      if (q.m >= 5) { q5.push([q, x, y]); return; }
      const r = 2.6 + (q.m - 3) * 3.4;
      ctx.fillStyle = rgba(mixc('#fbbf24', '#dc2626', (q.m - 3) / 2), 0.78); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,20,20,.55)'; ctx.lineWidth = 1; ctx.stroke();
    });
    q5.forEach((p) => { ctx.fillStyle = '#b91c1c'; starP(p[1], p[2], 11, 5); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(g.x, g.y, g.w, g.h, 10).stroke();
    q5.forEach((p) => D.label(Math.min(p[1] + 8, g.x + g.w - 62), p[2] + (p[0].nm.indexOf('포항') >= 0 ? -16 : 18), p[0].nm, { bg: '#b91c1c', size: 12, pad: 6, align: 'left' }));
    [['서울', 126.98, 37.57], ['부산', 129.05, 35.18]].forEach((c) => { ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(lx(g, c[1]), ly(g, c[2]), 3.4, 0, TAU); ctx.fill(); D.text(lx(g, c[1]) - 6, ly(g, c[2]) + 4, c[0], { size: 12, weight: 800, color: '#1e293b', align: 'right', stroke: '#e8e2cc', strokeWidth: 3 }); });
    D.text(lx(g, 127.9), ly(g, PHONE ? 38.3 : 38.9), '한반도 (유라시아판 안쪽)', { size: 13, weight: 800, color: '#57534e' });
    D.text(lx(g, 125.8), ly(g, PHONE ? 33.55 : 33.55), '동서 방향 압축력(예시) →  ← ', { size: 11.5, weight: 800, color: '#0369a1', align: 'left' });
    D.text(lx(g, 128.2), ly(g, 36.0) + 2, '', {});
    D.text(lx(g, 129.6), ly(g, 36.65), '활성 단층(예시)', { size: 12, weight: 800, color: '#7c3aed', align: 'left', stroke: '#cfe6f7', strokeWidth: 3 });
    D.text(lx(g, PHONE ? 132.6 : 132.5), ly(g, 34.9), '일본', { size: 13, weight: 800, color: '#78716c' });
    D.text(g.x + g.w / 2, A.y + A.h - 10, '판의 경계는 멀리 동쪽(일본 쪽)에 있어요 · 점 크기 = 규모', { size: 12.5, weight: 700, color: '#64748b' });
    D.text(g.x + 8, g.y + 18 * FS, '규모 ' + S.mg + ' 이상: 10년간 ' + nQ(S.mg) + '회 (예시)', { size: 13.5, weight: 800, color: '#334155', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });

    // 규모–빈도 그래프
    card(B, '📊 규모가 클수록 드물어요 (연평균 횟수)');
    const pb = { x: B.x + 56, y: B.y + 46, w: B.w - 56 - 16, h: B.h - 46 - 52 };
    const Y = (n) => pb.y + pb.h - ((Math.log10(n) + 3) / 5) * pb.h;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0.001, 0.01, 0.1, 1, 10, 100].forEach((n) => { const y = Y(n); ctx.beginPath(); ctx.moveTo(pb.x, y); ctx.lineTo(pb.x + pb.w, y); ctx.stroke(); D.text(pb.x - 6, y + 4.5, n >= 1 ? String(n) : String(n), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    const ms = [2, 3, 4, 5, 6, 7], bw = pb.w / ms.length;
    ms.forEach((m, i) => {
      const x = pb.x + i * bw + bw * 0.16, w = bw * 0.68, y = Y(NTAB[m]), sel = m === S.mg;
      ctx.fillStyle = sel ? '#dc2626' : m < S.mg ? '#cbd5e1' : '#f59e0b'; ctx.fillRect(x, y, w, pb.y + pb.h - y);
      if (sel) { ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, pb.y + pb.h - y); }
      D.text(x + w / 2, Math.max(pb.y + 12, y - 5), fN(NTAB[m]), { size: 12, weight: 800, color: '#334155' });
      D.text(x + w / 2, pb.y + pb.h + 16 * FS, '≥' + m, { size: 12.5, weight: 800, color: sel ? '#b91c1c' : '#64748b' });
    });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    D.text(B.x + B.w / 2, B.y + B.h - 8, '규모 1 증가: 횟수 약 1/10, 에너지 약 32배', { size: 12.5, weight: 800, color: '#0369a1' });

    // 재현 주기와 확률
    card(C, '⏱️ 재현 주기와 확률 (예시 모형, 실제 확률 아님)');
    const T = Tof(S.mg), p = probOf(S.mg, S.yr), tx = C.x + 14;
    D.text(tx, C.y + 50, '규모 ≥ ' + S.mg + ' : 연평균 ' + fN(NTAB[S.mg]) + '회', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(tx, C.y + 50 + 24 * FS, '재현 주기 T = 1 / 횟수 ≈ ' + fTy(T), { size: 14, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(tx, C.y + 50 + 48 * FS, '기간 t = ' + S.yr + '년', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(tx, C.y + 50 + 72 * FS, 'P = 1 − e^(−t/T) ≈ ' + fProb(p), { size: 15, weight: 800, color: '#0369a1', align: 'left' });
    const qb = { x: C.x + (PHONE ? 270 : 14), y: C.y + (PHONE ? 38 : 150), w: PHONE ? C.w - 270 - 18 : C.w - 28, h: PHONE ? C.h - 70 : 70 };
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; for (let v = 0; v <= 100; v += 25) { const y = qb.y + qb.h - (v / 100) * qb.h; ctx.beginPath(); ctx.moveTo(qb.x, y); ctx.lineTo(qb.x + qb.w, y); ctx.stroke(); }
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.beginPath();
    for (let y = 0; y <= 100; y += 2) { const pp = probOf(S.mg, y), X = qb.x + (y / 100) * qb.w, Yy = qb.y + qb.h - pp * qb.h; y ? ctx.lineTo(X, Yy) : ctx.moveTo(X, Yy); }
    ctx.stroke();
    const mx = qb.x + (S.yr / 100) * qb.w, my = qb.y + qb.h - p * qb.h;
    D.dashedLine(mx, qb.y + qb.h, mx, my, { color: '#64748b', width: 1.6 }); D.sphere(mx, my, 5.5, '#dc2626');
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; ctx.strokeRect(qb.x, qb.y, qb.w, qb.h);
    D.text(qb.x + qb.w / 2, qb.y + qb.h + 15 * FS, '기간 t (년) 0 ~ 100 → 확률 0 ~ 100 %', { size: 12, weight: 700, color: '#64748b' });
    if (!PHONE) D.text(C.x + C.w / 2, C.y + C.h - 8, '정확한 시기와 장소는 예측할 수 없어요. 확률로만 평가해요.', { size: 12.5, weight: 800, color: '#64748b' });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { rec: '📈 지진파 기록', wave: '🧩 P파 · S파 · 표면파', tt: '🗺️ 주시 곡선과 진앙', kor: '🇰🇷 한반도 지진' };
  const FREE_KEYS = { rec: ['recT', 'markSel'], wave: ['waveSel', 'medSel'], tt: ['stBtns'], kor: ['sMg', 'sYr'] };
  let ctlKeys = [];
  const clsWave = makeClassify($('#clsWave'), [
    { id: 'w1', label: '입자가 진행 방향과 나란하게 압축·팽창해요' },
    { id: 'w2', label: '입자가 진행 방향에 수직으로 흔들려요' },
    { id: 'w3', label: '지표를 따라 진행하며 입자가 타원을 그려요' },
    { id: 'w4', label: '고체뿐 아니라 액체와 기체도 통과해요' },
    { id: 'w5', label: '액체를 통과하지 못해요 (실체파)' },
    { id: 'w6', label: '가장 늦게 도착하고 진폭이 가장 커요' },
  ], [{ id: 'P', label: 'P파' }, { id: 'S', label: 'S파' }, { id: 'R', label: '표면파' }], { w1: 'P', w2: 'S', w3: 'R', w4: 'P', w5: 'S', w6: 'R' }, () => { });
  const clsKor = makeClassify($('#clsKor'), [
    { id: 'k1', label: '한반도는 판의 경계가 아니라 유라시아판 안쪽에 있어요' },
    { id: 'k2', label: '판이 미는 힘이 쌓이다가 활성 단층에서 한꺼번에 풀리며 지진이 일어나요' },
    { id: 'k3', label: '규모가 작은 지진이 큰 지진보다 훨씬 자주 일어나요' },
    { id: 'k4', label: '판의 경계에서 멀어서 큰 지진은 절대 일어나지 않아요' },
    { id: 'k5', label: '지진이 일어날 정확한 날짜와 장소를 미리 알 수 있어요' },
    { id: 'k6', label: '규모가 1 커지면 지진 에너지는 약 10배가 돼요' },
  ], [{ id: 'T', label: '맞아요' }, { id: 'F', label: '틀려요' }], { k1: 'T', k2: 'T', k3: 'T', k4: 'F', k5: 'F', k6: 'F' }, () => { });

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

  function syncPlay() { const b = $('#bPlay'); b.textContent = S.playing ? '⏸ 멈춤' : S.t >= TMAX ? '↺ 다시 지진 발생' : '▶ 지진 발생'; b.classList.toggle('on', S.playing); }
  $('#bPlay').addEventListener('click', () => { Sound.click(); if (S.playing) S.playing = false; else { if (S.t >= TMAX) S.t = 0; S.playing = true; } syncPlay(); });
  SciSim.bindRange($('#sT'), $('#oT'), (v) => v + ' 초', (v) => { S.playing = false; S.t = +v; syncPlay(); });
  function setT(v) { S.t = v; setSlider($('#sT'), $('#oT'), v, (x) => x + ' 초'); }
  function syncMark() { $$('#markBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.w === S.markSel)); }
  $$('#markBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.markSel = b.dataset.w; syncMark(); }));
  function syncWave() { $$('#waveBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.w === S.wave)); $$('#medBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.m === S.med)); }
  function setWave(w) {
    if (w === 'R' && S.med === 'liquid') { say('표면파는 고체 표면에서 전해지는 파라서, 이 모형에서는 고체에서만 보여 줘요.', true, 3.2); return; }
    S.wave = w; S.wSeen[w] = true; waveReset(); syncWave();
  }
  function setMed(m) {
    S.med = m; if (m === 'liquid' && S.wave === 'R') S.wave = 'P'; waveReset(); syncWave();
  }
  $$('#waveBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setWave(b.dataset.w); }));
  $$('#medBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMed(b.dataset.m); }));
  $('#bWave').addEventListener('click', () => { Sound.click(); waveReset(); });
  function syncSt() {
    $$('#stBtns .opt').forEach((b) => { const k = b.dataset.k; b.classList.toggle('on', k === S.st); b.textContent = k + ' · S−P ' + STN[k].dt + ' s' + (matched(k) ? ' ✅' : ''); });
  }
  $$('#stBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); selSt(b.dataset.k); }));
  $('#bPinReset').addEventListener('click', () => { Sound.click(); S.pin = null; S.dm = { A: 0, B: 0, C: 0 }; syncSt(); });
  SciSim.bindRange($('#sMg'), $('#oMg'), (v) => '규모 ' + v + ' 이상', (v) => { S.mg = +v; S.korSeen[v] = true; });
  SciSim.bindRange($('#sYr'), $('#oYr'), (v) => v + '년', (v) => { S.yr = +v; });
  SciSim.bindRange($('#ansT'), $('#oAns'), (v) => v + '년', () => { });
  function setMg(v) { S.mg = v; setSlider($('#sMg'), $('#oMg'), v, (x) => '규모 ' + x + ' 이상'); }
  function setYr(v) { S.yr = v; setSlider($('#sYr'), $('#oYr'), v, (x) => x + '년'); }
  function setAns(v) { setSlider($('#ansT'), $('#oAns'), v, (x) => x + '년'); }
  const ansT = () => +$('#ansT').value;

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = []; flash.t = 0;
    S.playing = false; setT(0); S.marks = { P: null, S: null, R: null }; S.markSel = 'P'; syncMark(); syncPlay();
    S.wave = 'P'; S.med = 'solid'; waveReset(); S.wSeen = { P: true }; syncWave(); clsWave.reset();
    S.st = 'A'; S.dm = { A: 0, B: 0, C: 0 }; S.pin = null; S.ttSeen = { A: true }; S.solvedK = 0; ttDrag = null; syncSt();
    setMg(4); setYr(50); S.korSeen = {}; setAns(0); clsKor.reset();
    if (li === 0) { setMode('rec'); setCtl(['recT', 'markSel']); showHint('▶를 눌러 지진 기록이 그려지는 것을 봐요', 5200); }
    else if (li === 1) { setMode('wave'); setCtl(['waveSel', 'medSel']); showHint('파 종류를 바꿔 입자의 움직임을 비교해 봐요', 5200); }
    else if (li === 2) { setMode('tt'); setCtl(['stBtns']); showHint('그래프에서 S−P 시간에 맞는 거리를 찾아봐요', 5200); }
    else { setMode('kor'); setCtl(['sMg', 'sYr']); showHint('규모 기준을 바꾸면 지도의 점과 확률이 달라져요', 5200); }
    updateCtl();
  }
  const mrk = () => ['P', 'S', 'R'].map((k) => mark(markOk(k)) + ' ' + WNAME[k] + ' ' + (S.marks[k] == null ? '—' : fT(S.marks[k]) + ' s')).join(' · ');
  const markOk = (k) => S.marks[k] != null && Math.abs(S.marks[k] - TA[k]) <= (k === 'R' ? 3 : 2);
  const levels = [
    {
      title: '지진파 기록: 세 가지 흔들림', short: '지진파 기록', icon: '📈', phase: '관찰', features: ['rec'],
      intro: '<p class="si-q">❓ 탐구 질문: 지진계 기록에서 세 가지 흔들림은 무엇이 다르고, 흔들림의 도착 시간 차이로 지진이 일어난 곳을 어떻게 알아낼까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 지진계가 P파와 S파의 도착 시간 차이를 이용해 진원까지의 거리를 알려 주는 센서라는 것을 배웠고, <b>역학과 에너지</b>에서 종파와 횡파를 배웠어요. 이번에는 실제 지진 기록으로 지진파의 종류와 특성을 정리해요.</div>' +
        '<p>지진이 나면 <b>P파, S파, 표면파</b>가 차례로 도착해요. 지각의 평균 속도는 P파 6.0 km/s, S파 3.5 km/s, 표면파 약 3.2 km/s예요(예시). 진앙 거리 210 km인 관측소의 기록을 보고 도착 시각을 찾아봐요. (시간을 8배 빠르게 보여 줘요.)</p>',
      setup() { resetStep(0); },
      recap: '기록에서 처음 작은 흔들림이 P파, 다음이 S파, 마지막에 가장 큰 진폭으로 오는 것이 표면파예요. 진폭이 큰 파가 가장 빠른 것은 아니에요.',
      summary: '<ul><li>지진파는 <b>실체파(P파·S파)</b>와 <b>표면파</b>로 나뉘어요. 지각 평균 속도: P파 6.0 km/s &gt; S파 3.5 km/s &gt; 표면파 약 3.2 km/s.</li><li>지진계 기록에는 <b>P파 → S파 → 표면파</b> 순으로 도착해요. 표면파의 진폭이 가장 크고 피해도 가장 커요.</li><li>진앙 거리 210 km: P파 35 s, S파 60 s, 표면파 약 66 s에 도착(S−P 시간 25 s).</li><li>지구시스템 연계: 지진파는 지권(지각)을 통해 에너지를 전달해요.</li></ul>',
      missions: [
        {
          title: '도착 시각 표시하기',
          goal: '기록을 끝까지 그린 뒤, <b>P파 · S파 · 표면파</b>가 처음 도착한 시각을 기록지에서 눌러 표시해요.',
          hint: '▶로 기록을 그린 뒤 파 단추를 고르고 기록지를 눌러요. P파는 처음 작게 흔들리는 곳, S파는 더 커지는 곳, 표면파는 가장 크게 흔들리기 시작하는 곳이에요. 각 2~3초 안이면 돼요.',
          setup() { S.marks = { P: null, S: null, R: null }; S.markSel = 'P'; syncMark(); setMode('rec'); setCtl(['recT', 'markSel']); },
          check: () => markOk('P') && markOk('S') && markOk('R'), hold: 0.5,
          status: () => mrk() + (S.t < 70 ? ' · 기록을 70초까지 그려야 해요' : ''),
          explain: '진앙 거리 210 km에서 P파는 210/6.0 = <b>35 s</b>, S파는 210/3.5 = <b>60 s</b>, 표면파는 210/3.2 ≈ <b>66 s</b>에 도착해요. S−P 시간은 25 s예요.',
        },
        {
          type: 'quiz', title: '가장 빠른 파, 가장 큰 파',
          goal: '지진계 기록에서 <b>가장 먼저 도착하는 파</b>와 <b>진폭이 가장 큰 파</b>를 바르게 짝지은 것은?',
          setup() { setMode('rec'); setCtl(['recT']); },
          choices: ['가장 먼저: 표면파 · 진폭 최대: P파', '가장 먼저: P파 · 진폭 최대: 표면파', '가장 먼저: S파 · 진폭 최대: P파', '가장 먼저: P파 · 진폭 최대: S파'],
          answer: 1,
          feedback: ['표면파는 가장 늦게 도착해요.', '', 'S파는 P파보다 늦게 도착하고, P파의 진폭은 작아요.', '진폭이 가장 큰 것은 S파가 아니라 표면파예요. 진폭이 큰 파가 가장 빠른 것은 아니에요.'],
          explain: '속도는 <b>P파가 가장 빨라</b> 먼저 도착하고, <b>표면파</b>는 가장 늦게 오지만 진폭이 가장 커서 피해도 가장 커요.',
        },
      ],
    },
    {
      title: 'P파와 S파: 입자는 어떻게 흔들릴까', short: 'P파·S파', icon: '🧩', phase: '모형', features: ['wave'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 도착 시각이 다른 세 가지 파를 기록에서 찾았어요. 왜 속도가 다를까요? 입자가 어떻게 흔들리는지 격자 모형으로 알아봐요.</div>' +
        '<p><b>종파</b>인 P파는 진동 방향이 진행 방향과 나란하고, <b>횡파</b>인 S파는 수직이에요. 표면파는 지표를 따라 타원을 그리며 진동해요. 매질을 <b>고체</b>와 <b>액체</b>로 바꿔 보면 S파가 어떻게 되는지 알 수 있어요. 파는 진행해도 입자는 제자리에서 진동만 해요.</p>',
      setup() { resetStep(1); },
      recap: 'P파는 종파로 고체·액체·기체를 모두 통과하고, S파는 횡파로 고체만 통과해요. 표면파는 지표를 따라 타원 운동을 해요.',
      summary: '<ul><li><b>P파</b>(종파): 진동 방향 ∥ 진행 방향. 고체·액체·기체 모두 통과. 가장 빨라요.</li><li><b>S파</b>(횡파): 진동 방향 ⟂ 진행 방향. 고체만 통과해요. v_S = √(μ/ρ)에서 액체는 강성률 μ = 0이라 S파가 전해지지 않아요(μ = 3.7×10¹⁰ Pa, ρ = 3000 kg/m³이면 3.5 km/s).</li><li><b>표면파</b>: 지표 부근을 따라 진행하며 입자가 타원 운동을 하고, 진폭이 가장 커요.</li><li>이 성질이 다음 차시에서 외핵의 상태를 알려 주는 근거가 돼요.</li></ul>',
      missions: [
        {
          title: '진동 방향 카드 분류', manual: true,
          goal: '카드 6장을 <b>P파 · S파 · 표면파</b> 중 알맞은 것으로 분류해요.',
          hint: '파 종류를 하나씩 눌러 빨간 입자가 어떻게 움직이는지 봐요. 나란하면 P파, 수직이면 S파, 타원이면 표면파예요.',
          setup() { clsWave.reset(); setMode('wave'); setCtl(['waveSel', 'medSel', 'clsWave']); },
          status: () => mark(clsWave.ok()) + ' 분류한 카드 ' + clsWave.count() + ' / 6',
          check() {
            if (!clsWave.complete()) return '카드 6장을 모두 분류해 주세요. (지금 ' + clsWave.count() + '장)';
            if (!clsWave.ok()) { clsWave.mark(clsWave.wrong()); return '빨간 카드가 달라요. 격자 모형에서 입자의 진동 방향과 통과 매질을 다시 확인해 봐요.'; }
            return true;
          },
          explain: '<b>P파</b>는 진행 방향과 나란하게 압축·팽창하는 종파로 액체·기체도 통과해요. <b>S파</b>는 수직으로 흔들리는 횡파로 액체를 통과하지 못해요. <b>표면파</b>는 지표를 따라 타원 운동을 하며 가장 늦게 오고 진폭이 가장 커요.',
        },
        {
          title: '액체에서 S파가 사라지는지 확인',
          goal: '파를 <b>S파</b>, 매질을 <b>액체</b>로 바꾸고 파가 오른쪽 끝에 닿을 때까지 기다려 <b>오른쪽 끝 입자의 흔들림이 5 % 미만</b>임을 확인해요.',
          hint: 'S파와 액체 단추를 누른 뒤 약 7초 기다려요. 고체일 때와 비교해 보면 좋아요. 흔들림 %는 격자 아래쪽에 보여요.',
          setup() { S.wave = 'S'; S.med = 'solid'; waveReset(); syncWave(); setMode('wave'); setCtl(['waveSel', 'medSel']); },
          check: () => S.wave === 'S' && S.med === 'liquid' && S.wT > arriveT('S') + 0.5 && S.farAmp < 5, hold: 0.8,
          status: () => mark(S.wave === 'S') + ' S파 · ' + mark(S.med === 'liquid') + ' 액체 · ' + mark(S.wT > arriveT('S') + 0.5 && S.farAmp < 5) + ' 오른쪽 끝 흔들림 ' + (S.wT > arriveT('S') + 0.5 ? S.farAmp + ' %' : '파가 도착하길 기다려요'),
          explain: '액체는 모양이 바뀌어도 되돌아오려는 힘(강성률 μ)이 없어서 <b>v_S = √(μ/ρ) = 0</b>이에요. 그래서 S파는 액체에서 전해지지 않고, P파는 통과해요.',
        },
        {
          type: 'quiz', title: 'S파가 액체를 못 지나는 까닭',
          goal: 'S파가 액체를 통과하지 못하는 까닭으로 알맞은 것은?',
          setup() { setMode('wave'); setCtl(['waveSel', 'medSel']); },
          choices: ['S파는 속도가 너무 느려서 액체 속에서 멈춰요.', '액체는 모양이 변해도 되돌아오려는 힘(전단 저항)이 없어서 횡파를 전달하지 못해요.', 'S파는 진폭이 작아서 액체에 흡수돼요.', '액체 속에서는 모든 지진파가 전해지지 않아요.'],
          answer: 1,
          feedback: ['속도가 느려서가 아니라 전달하는 힘(강성률)이 없기 때문이에요.', '', '진폭의 크기가 아니라 매질의 성질 때문이에요.', 'P파는 액체도 통과해요. 이 차이가 지구 내부를 알아내는 열쇠가 돼요.'],
          explain: '액체는 전단 변형에 저항하지 못해 <b>S파(횡파)를 전달하지 못해요</b>. 이 성질 때문에 다음 차시에서 S파가 지나지 못하는 구간으로 <b>외핵이 액체</b>임을 알 수 있어요.',
        },
      ],
    },
    {
      title: '주시 곡선: 진앙을 찾아라', short: '주시 곡선', icon: '🗺️', phase: '분석', features: ['tt'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> P파가 S파보다 빠르다는 것을 확인했어요. 두 파의 <b>도착 시간 차(S−P 시간)</b>는 거리가 멀수록 커져요. 이를 이용해 진앙 거리를 구해요.</div>' +
        '<p>P파는 t = d/6.0, S파는 t = d/3.5 (d: 진앙 거리 km, t: 초)예요. 그래프에서 두 직선 사이의 세로 길이가 관측소의 S−P 시간과 같아지는 거리를 찾고, 지도에 그 거리를 반지름으로 하는 원을 그려요. 세 관측소의 원이 만나는 곳이 진앙이에요. (예시 자료)</p>',
      setup() { resetStep(2); },
      recap: 'S−P 시간이 클수록 진앙 거리가 멀어요(d ≈ 8.4 × S−P). 관측소 3곳의 원이 만나는 점이 진앙이에요.',
      summary: '<ul><li>주시 곡선: 거리–도착 시간 그래프. P파 t = d/6.0, S파 t = d/3.5.</li><li>S−P 시간 Δt = d(1/3.5 − 1/6.0) = d/8.4 → <b>d = 8.4 × Δt</b>. (Δt = 25 s이면 d = 210 km)</li><li>관측소 1곳으로는 <b>거리</b>만 알고 방향을 몰라요. <b>3곳</b>의 원이 만나는 점이 진앙이에요.</li><li>지진 발생 시각 = P파 도착 시각 − d/6.0 (P파가 10:20:35에 도착하고 d = 210 km이면 10:20:00).</li></ul>',
      missions: [
        {
          title: '관측소 A의 진앙 거리',
          goal: '관측소 A의 S−P 시간은 <b>25 s</b>예요. 그래프에서 두 직선 사이의 세로 길이가 25 s가 되는 <b>진앙 거리(약 210 km)</b>를 찾아요.',
          hint: '그래프를 눌러 끌면 괄호가 움직여요. 괄호 높이(S−P)가 왼쪽 색 막대(25 s)와 같아지는 곳에서 거리를 읽어요. 오른쪽으로 갈수록 두 직선이 벌어져요.',
          setup() { S.st = 'A'; S.dm = { A: 0, B: 0, C: 0 }; S.pin = null; syncSt(); setMode('tt'); setCtl(['stBtns']); },
          check: () => matched('A'), hold: 0.4,
          status: () => mark(matched('A')) + ' 관측소 A 거리 ' + (S.dm.A > 0 ? S.dm.A + ' km' : '—') + ' (목표 210 km 안팎)',
          explain: 'Δt = d(1/3.5 − 1/6.0) = d/8.4 이므로 <b>d = 8.4 × 25 s = 210 km</b>예요. 이 거리가 관측소 A를 중심으로 한 원의 반지름이에요.',
        },
        {
          title: '세 원이 만나는 진앙 찾기',
          goal: '관측소 B(40 s)와 C(15 s)의 거리도 구해 <b>세 원이 만나는 곳</b>을 지도에서 눌러 진앙을 표시해요.',
          hint: 'B는 약 336 km, C는 약 126 km예요. 관측소 단추로 바꿔 가며 그래프를 눌러요. 세 원이 한 점에서 만나요.',
          setup() { setMode('tt'); setCtl(['stBtns']); },
          check: () => allMatched() && pinOk(), hold: 0.6,
          status: () => ST_IDS.map((k) => mark(matched(k)) + ' ' + k + ' ' + (S.dm[k] > 0 ? S.dm[k] + ' km' : '—')).join(' · ') + ' · ' + mark(pinOk()) + ' 진앙 표시',
          explain: 'A(210 km), B(336 km), C(126 km)를 반지름으로 하는 세 원은 <b>한 점(진앙)</b>에서 만나요. 이 점이 진앙이에요.',
        },
        {
          type: 'quiz', title: '관측소 한 곳으로는 부족해요',
          goal: '관측소 1곳의 기록만으로는 진앙을 정할 수 없는 까닭은?',
          setup() { setMode('tt'); setCtl(['stBtns']); },
          choices: ['S−P 시간으로는 거리를 구할 수 없기 때문이에요.', '거리만 알 수 있고 방향을 모르기 때문에, 원 위의 어느 점인지 알 수 없어요.', 'P파가 너무 빨라 관측소에 기록되지 않기 때문이에요.', '관측소 한 곳에서는 S파가 기록되지 않기 때문이에요.'],
          answer: 1,
          feedback: ['S−P 시간으로 거리를 구할 수 있어요.', '', 'P파도 기록돼요. 문제는 방향 정보가 없다는 것이에요.', 'S파도 기록돼요.'],
          explain: '관측소 1곳으로는 <b>거리</b>만 알고 <b>방향</b>을 몰라서 진앙이 원 위의 어느 점인지 알 수 없어요. 관측소가 <b>3곳</b> 있어야 원이 한 점에서 만나요.',
        },
      ],
    },
    {
      title: '한반도 지진: 드물지만 일어나요', short: '한반도 지진', icon: '🇰🇷', phase: '분석', features: ['kor'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 진앙을 찾는 방법을 배웠어요. 이제 진앙들이 모인 <b>지진의 분포</b>를 보고, 한반도 지진의 특성과 발생 가능성을 어림해 봐요.</div>' +
        '<p>한반도는 판의 경계가 아니라 유라시아판 안쪽에 있지만 지진이 일어나요. <b>규모</b>는 지진 자체의 에너지 크기(하나의 값)이고, <b>진도</b>는 지역마다 느끼는 흔들림 정도예요. 규모가 클수록 드물게 일어나는 규칙을 이용해 재현 주기와 확률을 어림해 봐요. (예시 자료)</p>',
      setup() { resetStep(3); },
      recap: '한반도는 판 내부라 큰 지진이 드물지만, 규모가 작은 지진은 자주 일어나고 규모가 1 커질 때마다 횟수는 약 1/10이 돼요. 정확한 시기는 예측할 수 없고 확률로만 평가해요.',
      summary: '<ul><li>한반도 지진: 판의 경계가 아닌 유라시아판 내부, 활성 단층 근처, 동서 방향 압축 응력. 규모 5 이상 대표 사례(예시): 1978 홍성 5.0, 2016 경주 5.8, 2017 포항 5.4.</li><li>규모 이상 지진의 연평균 횟수(예시): ≥2.0 약 70, ≥3.0 약 10, ≥4.0 약 1.2, ≥5.0 약 0.15 → 규모 1 증가 시 횟수는 약 1/8~1/10.</li><li>규모 1 차이는 <b>에너지 약 32배</b>(10^1.5), 진폭 10배. <b>규모</b>(지진의 크기)와 <b>진도</b>(지역별 흔들림)는 달라요.</li><li>재현 주기 T = 1/(연평균 횟수): 규모 ≥5는 약 6.7년, 규모 ≥6은 약 67년. 기간 t 동안 한 번 이상 일어날 확률 ≈ 1 − e^(−t/T)(규모 ≥6, 50년 → 약 53 %, 예시 모형).</li><li>지구시스템 연계: 판 운동이 지권에 쌓은 힘이 지진으로 풀려요.</li></ul>',
      missions: [
        {
          title: '규모 6 이상의 재현 주기',
          goal: '규모 기준을 <b>6</b>으로 맞추고, 재현 주기 T = 1/(연평균 횟수)를 <b>년</b>으로 입력해요. (규모 ≥6은 연 0.015회)',
          hint: '1 / 0.015 는 약 66.7이에요. 규모 슬라이더를 6으로 두고 아래 입력 슬라이더를 67년 안팎으로 맞춰요.',
          setup() { setMg(4); setAns(0); setMode('kor'); setCtl(['sMg', 'sYr', 'ansT']); },
          check: () => S.mg === 6 && ansT() >= 66 && ansT() <= 68, hold: 0.5,
          status: () => mark(S.mg === 6) + ' 규모 기준 ' + S.mg + ' (목표 6) · ' + mark(ansT() >= 66 && ansT() <= 68) + ' 입력한 재현 주기 ' + ansT() + '년',
          explain: 'T = 1 / 0.015 ≈ <b>67년</b>이에요. 규모 ≥6 지진은 평균적으로 약 67년에 한 번 일어난다는 뜻이고, 이 값은 평균일 뿐 일정한 간격으로 일어난다는 뜻은 아니에요.',
        },
        {
          title: '한반도 지진의 특성', manual: true,
          goal: '설명 6개가 <b>맞는지 틀린지</b> 골라요.',
          hint: '지도와 그래프를 다시 봐요. 판 내부여도 지진이 일어나고, 규모가 작을수록 훨씬 자주 일어나요. 지진 시기를 정확히 예측하는 것은 현재 불가능하고 에너지는 규모 1당 약 32배예요.',
          setup() { clsKor.reset(); setMode('kor'); setCtl(['sMg', 'sYr', 'clsKor']); },
          status: () => mark(clsKor.ok()) + ' 고른 설명 ' + clsKor.count() + ' / 6',
          check() {
            if (!clsKor.complete()) return '설명 6개를 모두 골라 주세요. (지금 ' + clsKor.count() + '개)';
            if (!clsKor.ok()) { clsKor.mark(clsKor.wrong()); return '빨간 설명이 달라요. 지도, 규모–빈도 그래프, 에너지 비(32배)를 다시 떠올려 봐요.'; }
            return true;
          },
          explain: '한반도는 <b>판 내부</b>에 있지만 판 이동으로 쌓인 힘이 <b>활성 단층</b>에서 풀리며 지진이 일어나요. 작은 지진이 훨씬 자주 일어나고, 큰 지진도 일어날 수 있어요. 정확한 시기·장소는 예측할 수 없고, 규모 1 차이는 에너지 약 <b>32배</b>예요.',
        },
        {
          type: 'quiz', title: '규모 1의 차이',
          goal: '규모가 1 커지면 지진이 방출하는 <b>에너지</b>는 약 몇 배가 될까요?',
          setup() { setMode('kor'); setCtl(['sMg', 'sYr']); },
          choices: ['약 2배', '약 10배', '약 32배', '약 100배'],
          answer: 2,
          feedback: ['규모는 로그 눈금이라 1 차이도 훨씬 커요.', '진폭은 약 10배이지만 에너지는 10^1.5 ≈ 32배예요.', '', '규모 2 차이일 때 약 1000배(32×32)가 돼요.'],
          explain: '규모 1 차이는 진폭이 약 10배, 에너지가 10^1.5 ≈ <b>32배</b>예요. 규모 6은 규모 5보다 에너지가 약 32배 커요. 규모는 지진 자체의 크기이고 진도는 지역별 흔들림 정도예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-seismic-waves', mount: '#game', badge: '지진 탐정', homeHref: '../../index.html#hs',
    featureLabels: { rec: '📈 지진계 기록지', wave: '🧩 입자 격자 모형', tt: '🗺️ 주시 곡선 · 진앙 지도', kor: '🇰🇷 한반도 지진 분포' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'rec') setReadouts(['경과 시간', fT(S.t) + ' 초', 'P파 표시', S.marks.P == null ? '—' : fT(S.marks.P) + ' 초', 'S파 표시', S.marks.S == null ? '—' : fT(S.marks.S) + ' 초']);
    else if (m === 'wave') setReadouts(['파 종류', WNAME[S.wave] + ' · ' + (S.med === 'liquid' ? '액체' : '고체'), '진동 방향', S.wave === 'P' ? '진행 방향과 나란함' : S.wave === 'S' ? '진행 방향에 수직' : '타원 운동', '오른쪽 끝 흔들림', S.farAmp + ' %']);
    else if (m === 'tt') setReadouts(['관측소 ' + S.st, 'S−P ' + STN[S.st].dt + ' s', '찾은 거리', S.dm[S.st] > 0 ? S.dm[S.st] + ' km' : '—', '맞춘 관측소', ST_IDS.filter(matched).length + ' / 3']);
    else setReadouts(['규모 기준', '≥ ' + S.mg, '재현 주기 T', fTy(Tof(S.mg)), S.yr + '년 안에 일어날 확률', fProb(probOf(S.mg, S.yr))]);
    
  }
  let lastStKey = '';
  function syncStLabels() { const k = ST_IDS.map(matched).join(''); if (k !== lastStKey) { lastStKey = k; syncSt(); } }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f7'; ctx.fillRect(0, 0, VW, VH);
    const T0 = performance.now();
    if (S.mode === 'rec') drawRec(t, dt);
    else if (S.mode === 'wave') drawWave(t, dt);
    else if (S.mode === 'tt') drawTT(t, dt);
    else drawKor(t, dt);
    S.dbgMs = performance.now() - T0;
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts(); syncStLabels();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, STN, TA, clsWave, clsKor, matched, allMatched, pinOk, trace, KDT,
    get game() { return game; }, setMode, resetStep, updateCtl, setT, setMg, setYr, setAns, setWave, setMed, selSt, syncSt, nQ, probOf, Tof,
    runWave(sec) { S.wT += sec; },
    setMarks(p, s, r) { S.marks = { P: p, S: s, R: r }; },
    setDm(a, b, c) { S.dm = { A: a, B: b, C: c }; syncSt(); },
    setPinKm(x, y) { S.pin = { x, y }; },
    solveWave() { clsWave.seq = null; ['P', 'S', 'R', 'P', 'S', 'R'].forEach((v, i) => { clsWave.sel['w' + (i + 1)] = v; }); },
    solveKor() { ['T', 'T', 'T', 'F', 'F', 'F'].forEach((v, i) => { clsKor.sel['k' + (i + 1)] = v; }); },
    syncMark, syncWave,
  };
})();
