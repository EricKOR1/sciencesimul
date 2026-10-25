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
     판구조론의 발달사 (대륙 이동설 → 해양저 확장 → 판구조론 → 관측 기기)
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

  const S = {
    mode: 'drift', fade: 0, clock: 0, bad: [],
    // 1) 대륙 이동설
    dr: 0, drTarget: null, fitFlash: 0, clsOn: false,
    // 2) 해양저 확장
    ship: 100, auto: false, spreadT: 1, depth: 2500, vel: 1.0, recN: 0,
    // 3) 판구조론
    years: 0, probe: 60, probeShow: false,
    // 4) 관측 기기
    yr: 1910, gps: 'kr', disp: 10, gpsT: 0,
  };
  const approachV = (cur, tgt, dt, rate) => approach(cur, tgt, dt, rate);

  /* ======================================================
     장면 1: 대륙 이동설 — 남아메리카와 아프리카 (실제 윤곽을 구면 회전으로 맞춰요)
     ====================================================== */
  const AF = [[-17.5, 14.7], [-16.5, 19], [-13, 27.5], [-9.8, 31], [-5.9, 35.8], [3, 36.8], [10, 37.2], [11, 33.5], [20, 32], [30, 31.3], [32.6, 29.9], [35, 24], [38, 18], [43, 12.6], [51.3, 11.8], [49, 6], [44, -1], [40.5, -10], [40.5, -15], [35, -20], [35.5, -24], [32.8, -26], [30, -31], [26, -34], [20, -34.8], [18.4, -34], [17, -29], [14.5, -22], [12, -17], [13.5, -12], [12.3, -6], [9, -1], [9.5, 3.8], [8, 4.3], [4, 6.3], [-2, 4.8], [-8, 4.4], [-13, 8], [-16.7, 12.3]];
  const SAM = [[-77.3, 8.5], [-75.5, 10.8], [-71.5, 12], [-68, 10.7], [-62, 10.7], [-57, 6.3], [-51, 4.5], [-50, 1.5], [-44, -2.5], [-35.5, -5.3], [-35, -8.5], [-39, -13.5], [-39.2, -17.5], [-41, -22.5], [-48.5, -26], [-53, -33.7], [-57, -35], [-58.5, -38], [-62, -39], [-65, -41], [-64, -46], [-67.5, -46.5], [-66, -50], [-69, -52], [-68.5, -55], [-72, -54], [-75, -50], [-73.5, -43], [-73.5, -38], [-71.5, -30], [-70.5, -18], [-76, -14], [-81, -6], [-80.5, -2], [-79.5, 2]];
  const ll2v = (lo, la) => { const a = lo * DEG, b = la * DEG; return [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)]; };
  const v2ll = (v) => [Math.atan2(v[1], v[0]) / DEG, Math.asin(clamp(v[2], -1, 1)) / DEG];
  const rotv = (v, k, ang) => { const c = Math.cos(ang), s = Math.sin(ang), d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2], x = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]; return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)]; };
  const POLE = ll2v(-30.6, 44), FIT = 55 * DEG;
  const saNow = (lo, la, f) => v2ll(rotv(ll2v(lo, la), POLE, FIT * f));
  const saFromFit = (lo, la) => v2ll(rotv(ll2v(lo, la), POLE, -FIT));   // 맞춘 모습의 좌표 → 오늘의 좌표
  const SITES = [
    { id: 'meso', c: '#f97316', n: '메소사우루스', sa: saFromFit(7.5, -27), af: [20, -28.5], r: 4.4 },
    { id: 'glos', c: '#16a34a', n: '글로소프테리스', sa: saFromFit(5, -34), af: [27, -31.5], r: 4.4 },
  ];
  const STRI = [
    { sa: [saFromFit(7, -21.5), saFromFit(0.5, -21.5)], af: [[24, -23], [17.5, -23]] },
    { sa: [saFromFit(5, -29.5), saFromFit(-1.5, -29.5)], af: [[25, -29], [18.5, -29]] },
  ];
  const BELT = { sa: [saFromFit(2, -36.5), saFromFit(10, -35.4)], af: [[19, -33.4], [28, -33.2]] };
  const RCd = PHONE ? { A: { x: 8, y: 8, w: 504, h: 438 }, B: { x: 8, y: 454, w: 504, h: 298 } } : { A: { x: 12, y: 12, w: 520, h: 536 }, B: { x: 540, y: 12, w: 248, h: 536 } };
  const gmap = () => { const A = RCd.A, w = A.w - 20; return { x: A.x + 10, y: A.y + 38, w, h: (w * 95) / 140 }; };
  const mapP = (g, lo, la) => [g.x + ((lo + 85) / 140) * g.w, g.y + ((40 - la) / 95) * g.h];
  const fitPct = () => Math.round(S.dr);
  function driftStep(dt) {
    if (S.drTarget != null) {
      const d = S.drTarget - S.dr;
      if (Math.abs(d) < 0.3) { S.dr = S.drTarget; S.drTarget = null; } else S.dr += Math.sign(d) * Math.min(Math.abs(d), (22 + Math.abs(d) * 0.6) * dt);
      driftUI.sync && driftUI.sync();
    }
    const was = S.fitFlash;
    if (S.dr >= 99.5 && !S.fitDone) { S.fitDone = true; S.fitFlash = 1; const g = gmap(), p = mapP(g, 2, -12); parts.burst(p[0], p[1], { count: 24, speed: 100, life: 0.9, size: 3, gravity: 0, colors: ['#fde047', '#ffffff', '#fb923c'], shape: 'star' }); }
    if (S.dr < 95) S.fitDone = false;
    S.fitFlash = Math.max(0, S.fitFlash - dt);
  }
  const driftUI = { sync: null };
  function drawDrift(t, dt) {
    const { A, B } = RCd, g = gmap(), f = S.dr / 100;
    driftStep(dt);
    card(A, '🗺️ 남아메리카와 아프리카 (실제 윤곽, 단순화)');
    ctx.save(); rr(g.x, g.y, g.w, g.h, 12).clip();
    const og = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); og.addColorStop(0, '#cfe8fb'); og.addColorStop(1, '#a9d2ee'); ctx.fillStyle = og; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let lo = -80; lo <= 50; lo += 20) { const p = mapP(g, lo, 0); ctx.beginPath(); ctx.moveTo(p[0], g.y); ctx.lineTo(p[0], g.y + g.h); ctx.stroke(); }
    for (let la = -40; la <= 40; la += 20) { const p = mapP(g, 0, la); ctx.beginPath(); ctx.moveTo(g.x, p[1]); ctx.lineTo(g.x + g.w, p[1]); ctx.stroke(); }
    const sa = SAM.map((p) => saNow(p[0], p[1], f)).map((p) => mapP(g, p[0], p[1])), af = AF.map((p) => mapP(g, p[0], p[1]));
    // 아프리카
    ctx.beginPath(); af.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = '#e9c46a'; ctx.fill(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.stroke();
    // 남아메리카
    ctx.beginPath(); sa.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = 'rgba(122,178,96,.94)'; ctx.fill(); ctx.strokeStyle = '#3f7d3a'; ctx.lineWidth = 2; ctx.stroke();
    // 증거: 화석
    const on = (id) => true;
    SITES.forEach((s) => {
      const q = saNow(s.sa[0], s.sa[1], f), p1 = mapP(g, q[0], q[1]), p2 = mapP(g, s.af[0], s.af[1]), r = s.r * (g.w / 500) * 3.2;
      [p1, p2].forEach((p) => { ctx.fillStyle = s.c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(p[0], p[1], r, r * 0.8, -0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); });
    });
    // 증거: 빙하가 긁은 방향
    STRI.forEach((s) => {
      const a = saNow(s.sa[0][0], s.sa[0][1], f), b = saNow(s.sa[1][0], s.sa[1][1], f), pa = mapP(g, a[0], a[1]), pb = mapP(g, b[0], b[1]);
      D.arrow(pa[0], pa[1], pb[0], pb[1], { color: '#1d4ed8', width: 3.2, head: 9 });
      const qa = mapP(g, s.af[0][0], s.af[0][1]), qb = mapP(g, s.af[1][0], s.af[1][1]); D.arrow(qa[0], qa[1], qb[0], qb[1], { color: '#1d4ed8', width: 3.2, head: 9 });
    });
    // 증거: 산맥(지질 구조)
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([2, 7]);
    [BELT.sa.map((p) => { const q = saNow(p[0], p[1], f); return mapP(g, q[0], q[1]); }), BELT.af.map((p) => mapP(g, p[0], p[1]))].forEach((l) => { ctx.beginPath(); ctx.moveTo(l[0][0], l[0][1]); ctx.lineTo(l[1][0], l[1][1]); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.restore();
    // 이름
    const cs = (lo, la) => { const q = saNow(lo, la, f); return mapP(g, q[0], q[1]); };
    let p = cs(-60, -12); D.text(p[0], p[1], '남아메리카', { size: 14, weight: 800, color: '#14532d', stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
    p = mapP(g, 20, 5); D.text(p[0], p[1], '아프리카', { size: 14, weight: 800, color: '#713f12', stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
    if (S.fitFlash > 0 || S.dr >= 99.5) D.label(g.x + g.w / 2, g.y + g.h - 18, '맞물렸어요! (약 2억 년 전의 모습)', { bg: '#15803d', size: 13, pad: 10 });
    else D.text(g.x + g.w / 2, g.y + g.h - 10, f < 0.02 ? '현재의 모습' : '대륙 위치: 현재 → 과거 ' + fitPct() + ' %', { size: 13, weight: 800, color: '#475569', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    // 범례
    const ly = g.y + g.h + 18 * FS, lg = [['#f97316', '메소사우루스 화석 (민물 파충류)'], ['#16a34a', '글로소프테리스 화석 (식물)'], ['#1d4ed8', '빙하가 긁은 방향 (화살표)'], ['#7c3aed', '이어지는 산맥·암석 (점선)']];
    lg.forEach((q, i) => { const col = PHONE ? 0 : i % 2, row = PHONE ? i : Math.floor(i / 2), x = A.x + 18 + col * 250, y = ly + row * 21 * FS; ctx.fillStyle = q[0]; ctx.beginPath(); ctx.arc(x + 6, y - 4, 6, 0, TAU); ctx.fill(); D.text(x + 18, y, q[1], { size: 12.5, weight: 800, color: '#334155', align: 'left' }); });
    const ny = ly + (PHONE ? 4 : 2) * 21 * FS + 6;
    const fitMsg = S.dr >= 95 ? '맞추니 화석 분포·빙하 자국·산맥이 하나로 이어져요!' : '슬라이더로 대륙을 맞춰 보면 증거가 이어지는지 볼 수 있어요.';
    D.label(A.x + A.w / 2, ny + 12, fitMsg, { bg: S.dr >= 95 ? '#15803d' : '#475569', size: 12.5, pad: 10 });
    drawWrap(A.x + 18, ny + 42, '메소사우루스는 몸길이 약 1 m의 민물 파충류예요. 바다를 헤엄쳐 건너기 어려워요. 글로소프테리스는 인도·오스트레일리아·남극에서도 나와요(이 그림 밖).', A.w - 36, 12, { align: 'left', color: '#64748b', weight: 700, lh: 1.3 });

    // 오른쪽: 증거와 한계
    card(B, '📜 베게너(1912)의 증거');
    const ok = S.dr >= 95;
    const rows = [
      ['🧩', '해안선', '두 대륙의 해안선 모양이 서로 맞물려요.', ok],
      ['🦎', '화석', '대서양을 건널 수 없는 생물의 화석이 양쪽에 있어요.', ok],
      ['🧊', '빙하 흔적', '같은 시기의 빙하 자국이 한 방향으로 이어져요.', ok],
      ['⛰️', '지질 구조', '산맥과 암석의 종류가 바다 건너 이어져요.', ok],
      ['❓', '원동력', '대륙을 어떤 힘이 밀었을까? 베게너는 설명하지 못했어요.', null],
    ];
    let y = B.y + (PHONE ? 38 : 50);
    const rh = PHONE ? 50 : 76;
    rows.forEach((r, i) => {
      const show = (game && game.free) || S.clsOn || true;
      D.shadow(() => { ctx.fillStyle = r[3] === null ? '#fff7ed' : r[3] ? '#ecfdf5' : '#f8fafc'; rr(B.x + 8, y, B.w - 16, rh - 6, 10).fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = r[3] === null ? '#f59e0b' : r[3] ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; rr(B.x + 8, y, B.w - 16, rh - 6, 10).stroke();
      D.text(B.x + 24, y + (PHONE ? 31 : 26), r[0], { size: 20, weight: 800 });
      D.text(B.x + 44, y + (PHONE ? 18 : 22), r[1] + (r[3] ? ' ✔ 맞아요' : r[3] === null ? ' ✖' : ''), { size: 13.5, weight: 800, color: r[3] === null ? '#b45309' : '#1e293b', align: 'left' });
      drawWrap(B.x + 44, y + (PHONE ? 36 : 42), r[2], B.w - 62, PHONE ? 11.5 : 12, { align: 'left', color: '#475569', weight: 700, lh: 1.25 });
      y += rh;
    });
    if (!PHONE) drawWrap(B.x + 14, y + 10, '1929 홈스: 맨틀의 대류가 대륙을 옮길 수 있다고 제안했어요 (증거는 아직 부족했어요).', B.w - 28, 12, { weight: 800, color: '#0f766e', align: 'left', lh: 1.25 });
  }

  /* ======================================================
     장면 2: 해양저 확장 — 음향 측심, 자기 줄무늬, 암석 나이
     ====================================================== */
  const VH_KM = 25.64;                                  // 한쪽 확장 속도 (km/백만 년 = 2.56 cm/년, 예시)
  const POLS = [[0, 0.78, 'N'], [0.78, 2.58, 'R'], [2.58, 3.6, 'N'], [3.6, 5.9, 'R'], [5.9, 9, 'N']];   // 지자기 시간표(단순화)
  const dSea = (x) => { const a = Math.abs(x); return 2500 + 350 * Math.sqrt(a / VH_KM) + (a < 8 ? 300 * (1 - a / 8) : 0); };
  const rtOf = (x) => Math.round(((2 * dSea(x)) / 1500) * 10) / 10;          // 왕복 시간 (s), 화면 표시값
  const NBIN = 80, PROF = new Array(NBIN).fill(null);
  const binOf = (x) => clamp(Math.floor(((x + 160) / 320) * NBIN), 0, NBIN - 1);
  const RC2 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 300 }, B: { x: 8, y: 316, w: 504, h: 204 }, C: { x: 8, y: 528, w: 504, h: 226 } }
    : { A: { x: 12, y: 12, w: 560, h: 300 }, B: { x: 12, y: 320, w: 560, h: 228 }, C: { x: 580, y: 12, w: 208, h: 536 } };
  const pa2 = () => { const A = RC2.A; return { x: A.x + 48, y: A.y + 34, w: A.w - 64, h: A.h - 62 }; };
  const X2 = (P, km) => P.x + ((km + 160) / 320) * P.w;
  let lastShip = null;
  function sprRecord() {
    const x = S.ship, b1 = binOf(x);
    if (lastShip == null) lastShip = x;
    const b0 = binOf(lastShip), lo = Math.min(b0, b1), hi = Math.max(b0, b1);
    for (let b = lo; b <= hi; b++) if (PROF[b] == null) { PROF[b] = dSea(-160 + ((b + 0.5) / NBIN) * 320); S.recN++; }
    lastShip = x;
  }
  function spreadReset() { PROF.fill(null); S.recN = 0; lastShip = null; S.spreadT = 0; S.auto = false; }
  function spreadStep(dt) {
    S.spreadT = Math.min(1, S.spreadT + dt / 4);
    if (S.auto) { S.ship += 70 * dt * (S.autoDir || 1); if (S.ship >= 160) { S.ship = 160; S.autoDir = -1; S.auto = false; } if (S.ship <= -160) { S.ship = -160; S.autoDir = 1; S.auto = false; } shipUI.sync && shipUI.sync(); }
    S.ship = clamp(S.ship, -160, 160);
    sprRecord();
  }
  const shipUI = { sync: null };
  function drawSpread(t, dt) {
    const { A, B, C } = RC2, P = pa2();
    spreadStep(dt);
    card(A, '🚢 음향 측심기로 해저 단면 알아내기');
    // 하늘과 바다
    const sy = P.y + 38, dy = PHONE ? 0.05 : 0.045, Yd = (d) => sy + d * dy;
    ctx.save(); rr(P.x, P.y, P.w, P.h, 10).clip();
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(P.x, P.y, P.w, sy - P.y);
    const sea = ctx.createLinearGradient(0, sy, 0, P.y + P.h); sea.addColorStop(0, '#74c0e8'); sea.addColorStop(1, '#1f5f8f'); ctx.fillStyle = sea; ctx.fillRect(P.x, sy, P.w, P.y + P.h - sy);
    // 아직 모르는 해저는 안개로
    ctx.fillStyle = 'rgba(15,23,42,.18)'; ctx.fillRect(P.x, Yd(2100), P.w, P.y + P.h - Yd(2100));
    // 측심으로 알아낸 해저 (열)
    const bw = P.w / NBIN;
    for (let b = 0; b < NBIN; b++) { if (PROF[b] == null) continue; const y = Yd(PROF[b]); ctx.fillStyle = '#7c6a55'; ctx.fillRect(P.x + b * bw, y, bw + 0.6, P.y + P.h - y); }
    ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); let st = false;
    for (let b = 0; b < NBIN; b++) { if (PROF[b] == null) { st = false; continue; } const x = P.x + (b + 0.5) * bw, y = Yd(PROF[b]); if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }
    ctx.stroke();
    // 파도
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const x = P.x + (P.w * i) / 50; i ? ctx.lineTo(x, sy + Math.sin(t * 1.6 + i * 0.5) * 1.6) : ctx.moveTo(x, sy); } ctx.stroke();
    // 배와 음파
    const sx = X2(P, S.ship), d = dSea(S.ship), yb = Yd(d), ph = (t % 1.6) / 1.6;
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, sy, P.w, P.h); ctx.clip();
    const k = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5, ry = sy + (yb - sy) * k;
    ctx.strokeStyle = ph < 0.5 ? 'rgba(254,240,138,.95)' : 'rgba(167,243,208,.95)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const r = 8 + i * 9; ctx.globalAlpha = 1 - i * 0.28; ctx.beginPath(); ctx.arc(sx, ry - i * 0 , r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    ctx.globalAlpha = 1; D.dashedLine(sx, sy, sx, yb, { color: 'rgba(254,249,195,.8)', width: 2, dash: [4, 5] });
    ctx.restore();
    ctx.restore();
    const bob = Math.sin(t * 1.6 + S.ship * 0.1) * 1.5;
    ctx.fillStyle = '#ef4444'; poly([[sx - 24, sy - 18 + bob], [sx + 24, sy - 18 + bob], [sx + 17, sy - 3 + bob], [sx - 17, sy - 3 + bob]]); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(sx - 8, sy - 30 + bob, 16, 12); ctx.fillStyle = '#334155'; ctx.fillRect(sx + 1, sy - 38 + bob, 3, 8);
    D.label(sx, P.y + 14, '왕복 ' + rtOf(S.ship).toFixed(1) + ' s', { bg: '#1e293b', size: 12.5, pad: 8 });
    ball(sx, yb, 4.5, '#fde047', false);
    // 눈금
    [0, 1000, 2000, 3000, 4000].forEach((m) => { D.text(P.x - 6, Yd(m) + 4.5, String(m), { size: 12, weight: 700, color: '#64748b', align: 'right' }); if (m > 0) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, Yd(m)); ctx.lineTo(P.x + P.w, Yd(m)); ctx.stroke(); } });
    D.text(P.x - 6, P.y + 10, '수심(m)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    [-160, -80, 0, 80, 160].forEach((km) => D.text(X2(P, km), P.y + P.h + 14 * FS, km === 0 ? '해령 축' : (km > 0 ? '+' : '−') + Math.abs(km) + ' km', { size: 12, weight: 700, color: '#64748b' }));
    D.text(P.x + P.w - 6, P.y + P.h - 8, '세로 눈금은 크게 늘려 그렸어요', { size: 11.5, weight: 700, color: '#e0f2fe', align: 'right', stroke: 'rgba(15,23,42,.4)', strokeWidth: 3 });
    D.text(P.x + 8, sy + 22 * FS, '수심 = 소리 속도(1500 m/s) × 왕복 시간 / 2', { size: 12.5, weight: 800, color: '#ecfeff', align: 'left', stroke: 'rgba(15,23,42,.45)', strokeWidth: 3 });
    // 자기 줄무늬 (평면)
    card(B, '🧲 해저 자기 줄무늬 (위에서 본 모습)');
    const Q = { x: P.x, y: B.y + (PHONE ? 94 : 84), w: P.w, h: PHONE ? 56 : 70 }, ext = S.spreadT * 160;
    ctx.save(); rr(Q.x, Q.y, Q.w, Q.h, 6).clip();
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(Q.x, Q.y, Q.w, Q.h);
    [-1, 1].forEach((sg) => {
      POLS.forEach((p) => {
        const k0 = p[0] * VH_KM, k1 = Math.min(p[1] * VH_KM, 160); if (k0 >= ext) return;
        const a = Math.min(k1, ext); const xa = X2(Q, sg * k0), xb = X2(Q, sg * a);
        ctx.fillStyle = p[2] === 'N' ? '#1f2937' : '#e5e7eb'; ctx.fillRect(Math.min(xa, xb), Q.y, Math.abs(xb - xa) + 0.5, Q.h);
      });
    });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(Q.x, Q.y, Q.w, Q.h, 6).stroke();
    const cxq = X2(Q, 0); D.glow(cxq, Q.y + Q.h / 2, 26, '#f97316', 0.5 + 0.2 * Math.sin(t * 5));
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cxq, Q.y - 6); ctx.lineTo(cxq, Q.y + Q.h + 6); ctx.stroke(); ctx.setLineDash([]);
    // 눈금 (km)과 경계 나이
    [-160, -120, -80, -40, 0, 40, 80, 120, 160].forEach((km) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X2(Q, km), Q.y + Q.h); ctx.lineTo(X2(Q, km), Q.y + Q.h + 5); ctx.stroke(); D.text(X2(Q, km), Q.y + Q.h + 18 * FS, String(Math.abs(km)), { size: 12, weight: 700, color: '#64748b' }); });
    D.text(Q.x + Q.w / 2, Q.y + Q.h + 34 * FS, '해령 축에서 떨어진 거리 (km)', { size: 12, weight: 700, color: '#64748b' });
    [0.78, 2.58, 3.6].forEach((age) => { const km = age * VH_KM; if (km >= ext) return; [-1, 1].forEach((sg) => { ctx.fillStyle = '#f59e0b'; poly([[X2(Q, sg * km), Q.y - 1], [X2(Q, sg * km) - 5, Q.y - 10], [X2(Q, sg * km) + 5, Q.y - 10]]); ctx.fill(); }); });
    const lab = (age, txt) => { const km = age * VH_KM; if (km >= ext) return; D.text(X2(Q, km), Q.y - 14, txt, { size: 11.5, weight: 800, color: '#b45309', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); };
    lab(0.78, '78만 년 전'); if (!PHONE) { lab(2.58, '258만 년'); lab(3.6, '360만 년'); }
    D.text(Q.x + 4, B.y + 44 * FS, '■ 정상 자기(현재와 같음)  □ 역전 자기', { size: 12, weight: 800, color: '#334155', align: 'left' });
    D.text(Q.x + Q.w - 4, B.y + 44 * FS, '▲ 지자기 역전 경계', { size: 12, weight: 800, color: '#b45309', align: 'right' });
    // 시추 시료의 나이 그래프
    card(C, '📈 시추 시료의 나이');
    const GR = PHONE ? { x: C.x + 8, y: C.y + 30, w: C.w - 16, h: C.h - 84 } : { x: C.x, y: C.y + 30, w: C.w, h: 296 };
    const gx = axesBox(GR, { x0: 0, x1: 160, y0: 0, y1: 6, xt: [0, 40, 80, 120, 160], yt: [0, 2, 4, 6], xf: (v) => String(v), pad: { l: 40, r: 14, t: 26, b: 34 } });
    D.text(gx.B.x + gx.B.w / 2, gx.B.y + gx.B.h + 30 * FS, '거리 (km)', { size: 12, weight: 700, color: '#64748b' });
    D.text(gx.B.x - 36, gx.B.y - 9, '나이(백만 년)', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    polyline([[0, 0], [160, 160 / VH_KM]], 'rgba(100,116,139,.55)', 2, gx.X, gx.Y, gx.B);
    [[20, 0.78], [66.2, 2.58], [92.3, 3.6], [151.3, 5.9]].forEach((q) => { if (q[0] < ext) { D.sphere(gx.X(q[0]), gx.Y(q[1]), 5.5, '#f59e0b', { gloss: false }); } });
    if (!PHONE) {
      const ty = gx.B.y + gx.B.h + 56 * FS;
      ['해령에서 멀수록', '암석의 나이가 많아요.', '속도 = 거리 / 시간', '(1 km = 10⁵ cm,', ' 1백만 년 = 10⁶ 년)', '해양 지각 최고령 약 1.8억 년'].forEach((l, i) => D.text(C.x + 14, ty + i * 19 * FS, l, { size: 12.5, weight: 800, color: i < 2 ? '#0f766e' : '#334155', align: 'left' }));
      if (game && game.free) D.text(C.x + 14, ty + 6 * 19 * FS + 6, '한쪽 약 2.6 cm/년 (양쪽 합 약 5.1)', { size: 12.5, weight: 800, color: '#b45309', align: 'left' });
    } else { drawWrap(C.x + 14, C.y + C.h - 36, '해령에서 멀수록 암석의 나이가 많아요. 속도 = 거리 / 시간 (1 km = 10⁵ cm, 1백만 년 = 10⁶ 년)', C.w - 28, 12, { weight: 800, color: '#334155', align: 'left', lh: 1.25 }); }
  }

  /* ======================================================
     장면 3: 판구조론 — 표준 지진계망의 진원 분포(베니오프대)와 판 경계
     ====================================================== */
  const RC3 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 450 }, B: { x: 8, y: 466, w: 504, h: 286 } }
    : { A: { x: 12, y: 12, w: 556, h: 536 }, B: { x: 576, y: 12, w: 212, h: 536 } };
  const geo3 = () => {
    const A = RC3.A, P = { x: A.x + 40, y: A.y + 36, w: A.w - 52 };
    const s = Math.min(P.w / 850, (A.h - 36 - 62) / 700);
    return { A, P, s, X: (x) => P.x + (x + 150) * s, Z: (z) => P.y + 14 + z * s };
  };
  const FOCI = (() => {
    const r = seeded(77), a = [];
    const gauss = () => { let t = 0; for (let i = 0; i < 4; i++) t += r(); return (t - 2) * 1.7; };
    for (let i = 0; i < 340; i++) {
      const q = r(); let x, z;
      if (q < 0.7) { x = 8 + 690 * Math.pow(r(), 1.45); z = clamp(x + gauss() * 9, 0, 700); }
      else if (q < 0.88) { x = (r() - 0.5) * 120; z = r() * 40; }
      else { x = 60 + r() * 340; z = r() * 24; }
      if (x > 690 && z > 700) continue;
      a.push({ x, z, o: r(), ap: -1 });
    }
    a.sort((p, q) => p.o - q.o);
    return a;
  })();
  const depthCol = (z) => (z < 70 ? mixc('#ef4444', '#f97316', z / 70) : z < 300 ? mixc('#f97316', '#eab308', (z - 70) / 230) : z < 500 ? mixc('#eab308', '#22c55e', (z - 300) / 200) : mixc('#22c55e', '#3b82f6', (z - 500) / 200));
  const nFoci = () => Math.round((FOCI.length * clamp(S.years, 0, 30)) / 30);
  const probeDepth = () => Math.round(S.probe / 5) * 5;
  function boundaryIcon(kind, R, t) {
    ctx.save(); rr(R.x, R.y, R.w, R.h, 10).clip();
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(R.x, R.y, R.w, R.h);
    const cx = R.x + R.w / 2, by = R.y + R.h * 0.42;
    if (kind === 'div') {
      ctx.fillStyle = '#6b7a99'; ctx.fillRect(R.x, by, R.w / 2 - 14, R.h); ctx.fillRect(cx + 14, by, R.w / 2 - 14, R.h);
      ctx.fillStyle = '#7c3a1e'; ctx.fillRect(cx - 14, by + 8, 28, R.h); D.glow(cx, by + 12, 26, '#f97316', 0.55 + 0.2 * Math.sin(t * 4));
      ctx.fillStyle = '#ef4444'; for (let i = 0; i < 5; i++) { const f = (t * 0.6 + i / 5) % 1; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2) * 5, R.y + R.h - f * (R.h - by + R.y - 6), 3, 0, TAU); ctx.fill(); }
      D.arrow(cx - 20, by - 14, cx - 60, by - 14, { color: '#1e293b', width: 3, head: 8 }); D.arrow(cx + 20, by - 14, cx + 60, by - 14, { color: '#1e293b', width: 3, head: 8 });
    } else if (kind === 'con') {
      ctx.fillStyle = '#9a8a7a'; ctx.fillRect(cx, by - 8, R.w / 2, R.h); ctx.fillStyle = '#6b7a99'; poly([[R.x, by], [cx, by], [R.x + R.w * 0.85, R.y + R.h], [R.x + R.w * 0.85 - 36, R.y + R.h], [cx - 18, by + 18], [R.x, by + 18]]); ctx.fill();
      ctx.fillStyle = '#7c3a1e'; poly([[cx + 30, by - 8], [cx + 44, by - 24], [cx + 58, by - 8]]); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + 44, by - 24, 3, 0, TAU); ctx.fill();
      D.arrow(R.x + 12, by - 14, R.x + 52, by - 14, { color: '#1e293b', width: 3, head: 8 });
    } else {
      ctx.fillStyle = '#9a8a7a'; ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(R.x, R.y + R.h / 2); ctx.lineTo(R.x + R.w, R.y + R.h / 2); ctx.stroke();
      ctx.fillStyle = '#7c8a99'; ctx.fillRect(R.x, R.y, R.w, R.h / 2 - 2);
      D.arrow(R.x + R.w * 0.3, R.y + R.h * 0.25, R.x + R.w * 0.7, R.y + R.h * 0.25, { color: '#fff', width: 3, head: 8 }); D.arrow(R.x + R.w * 0.7, R.y + R.h * 0.75, R.x + R.w * 0.3, R.y + R.h * 0.75, { color: '#fff', width: 3, head: 8 });
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(R.x, R.y, R.w, R.h, 10).stroke();
  }
  function drawTect(t, dt) {
    const { A, B } = RC3, G = geo3(), P = G.P, s = G.s, X = G.X, Z = G.Z;
    // 진원이 쌓이는 연출
    const n = nFoci();
    for (let i = 0; i < FOCI.length; i++) { if (i < n && FOCI[i].ap < 0) FOCI[i].ap = t; if (i >= n) FOCI[i].ap = -1; }
    card(A, '🌋 표준 지진계망이 기록한 진원 (단면, 예시 자료)');
    const bot = Z(700) + 4;
    ctx.save(); ctx.beginPath(); ctx.rect(P.x - 2, P.y, P.w + 4, bot - P.y); ctx.clip();
    ctx.fillStyle = '#e9f4fd'; ctx.fillRect(P.x - 2, P.y, P.w + 4, bot - P.y);
    // 맨틀
    const mg = ctx.createLinearGradient(0, Z(0), 0, Z(700)); mg.addColorStop(0, '#f3cf94'); mg.addColorStop(1, '#e2955b'); ctx.fillStyle = mg; ctx.fillRect(P.x - 2, Z(0), P.w + 4, Z(700) - Z(0) + 4);
    // 바다
    ctx.fillStyle = '#74c0e8'; ctx.fillRect(P.x - 2, Z(-6), X(0) - P.x + 2, Z(0) - Z(-6));
    // 대륙 암석권 (z < 100) 과 지각
    ctx.fillStyle = '#c9a98a'; poly([[X(0), Z(0)], [X(700), Z(0)], [X(700), Z(100)], [X(100), Z(100)]]); ctx.fill();
    ctx.fillStyle = '#8d6e63'; poly([[X(0), Z(0)], [X(700), Z(0)], [X(700), Z(35)], [X(35), Z(35)]]); ctx.fill();
    // 섭입하는 해양 암석권
    ctx.fillStyle = '#6b7a99'; poly([[X(-150), Z(0)], [X(0), Z(0)], [X(700), Z(700)], [X(559), Z(700)], [X(-41), Z(100)], [X(-150), Z(100)]]); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; poly([[X(-150), Z(0)], [X(0), Z(0)], [X(700), Z(700)]], false); ctx.stroke(); poly([[X(559), Z(700)], [X(-41), Z(100)], [X(-150), Z(100)]], false); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 8]); ctx.lineDashOffset = -t * 14; ctx.beginPath(); ctx.moveTo(X(-140), Z(50)); ctx.lineTo(X(-20), Z(50)); ctx.lineTo(X(20), Z(77)); ctx.lineTo(X(610), Z(650)); ctx.stroke(); ctx.setLineDash([]);
    // 깊이 눈금선
    [0, 100, 200, 300, 400, 500, 600, 700].forEach((z) => { ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, Z(z)); ctx.lineTo(P.x + P.w, Z(z)); ctx.stroke(); });
    // 진원
    for (let i = 0; i < n; i++) {
      const f = FOCI[i]; if (f.ap < 0) continue;
      const k = clamp((t - f.ap) / 0.35, 0, 1), sc = RM ? 1 : SciSim.ease.outBack(k);
      const r = (PHONE ? 3.2 : 3.6) * sc;
      ctx.fillStyle = depthCol(f.z); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(f.x), Z(f.z), Math.max(0.1, r), 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // 눈금
    [0, 100, 200, 300, 400, 500, 600, 700].forEach((z) => D.text(P.x - 6, Z(z) + 4.5, String(z), { size: 12, weight: 700, color: '#64748b', align: 'right' }));
    D.text(P.x - 6, P.y + 8, '깊이(km)', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    [0, 200, 400, 600].forEach((x) => D.text(X(x), bot + 14 * FS, String(x), { size: 12, weight: 700, color: '#64748b' }));
    D.text(P.x + P.w / 2, bot + 30 * FS, '해구에서 대륙 쪽으로 떨어진 거리 (km) · 가로·세로 눈금이 같아요', { size: 12, weight: 700, color: '#64748b' });
    // 이름
    D.text(X(-82), Z(60) + 4, '해양판', { size: 13, weight: 800, color: '#f8fafc', stroke: 'rgba(15,23,42,.4)', strokeWidth: 3 });
    D.text(X(430), Z(18) + 4, '대륙판', { size: 12.5, weight: 800, color: '#fff7ed', stroke: 'rgba(15,23,42,.4)', strokeWidth: 3 });
    D.text(X(150), Z(480) + 4, '맨틀(연약권)', { size: 13, weight: 800, color: '#7c2d12', stroke: 'rgba(255,255,255,.5)', strokeWidth: 3 });
    D.label(X(0), Z(0) - 18 * FS, '해구', { bg: '#1e293b', size: 12.5, pad: 8 });
    D.text(X(-146), Z(100) + 16 * FS, '암석권 약 100 km', { size: 11.5, weight: 800, color: '#f8fafc', align: 'left', stroke: 'rgba(15,23,42,.4)', strokeWidth: 3 });
    D.arrow(X(-134), Z(0) + 4, X(-134), Z(100) - 3, { color: '#f8fafc', width: 2, head: 7 });
    if (S.years >= 8) D.label(X(330), Z(470), '베니오프대: 진원이 깊어져요', { bg: '#7c3aed', size: 12.5, pad: 9 });
    // 진원 깊이 색 범례
    const lg = [['#ef4444', '얕음'], ['#eab308', ''], ['#22c55e', ''], ['#3b82f6', '700 km']];
    const lx = P.x + 6, ly = bot - 22;
    const gr = ctx.createLinearGradient(lx, 0, lx + 120, 0); gr.addColorStop(0, '#ef4444'); gr.addColorStop(0.1, '#f97316'); gr.addColorStop(0.43, '#eab308'); gr.addColorStop(0.71, '#22c55e'); gr.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gr; rr(lx, ly, 120, 9, 4).fill(); D.text(lx, ly - 5, '진원 깊이 색: 얕음', { size: 11.5, weight: 800, color: '#7c2d12', align: 'left' }); D.text(lx + 124, ly + 8, '깊음', { size: 11.5, weight: 800, color: '#7c2d12', align: 'left' });
    // 진원 마커 (끌어서 놓아요)
    if (S.probeShow || (game && game.free)) {
      const px = X(200), pz = Z(S.probe);
      D.dashedLine(px, Z(0), px, Z(700), { color: '#1e293b', width: 2, dash: [4, 5] });
      D.text(px + 6, Z(0) + 12 * FS, '해구에서 200 km', { size: 12, weight: 800, color: '#1e293b', align: 'left', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
      D.glow(px, pz, 22, '#fde047', 0.6);
      D.sphere(px, pz, 9, '#fde047', { gloss: true, outline: '#1e293b', outlineWidth: 2 });
      D.arrow(px + 18, pz - 14, px + 18, pz - 2, { color: '#1e293b', width: 2, head: 6 }); D.arrow(px + 18, pz + 14, px + 18, pz + 2, { color: '#1e293b', width: 2, head: 6 });
      D.label(px + 30, pz, '진원 깊이 ' + probeDepth() + ' km', { bg: '#1e293b', size: 12.5, pad: 8, align: 'left' });
    }
    // 오른쪽: 판 경계 3종
    card(B, '🧭 판 경계 3종과 판구조론');
    const names = [['div', '발산: 해령 (새 지각 생성)'], ['con', '수렴: 해구 (판이 소멸)'], ['trf', '보존: 변환 단층 (위에서 본 모습)']];
    if (!PHONE) {
      names.forEach((q, i) => { const R = { x: B.x + 10, y: B.y + 40 + i * 118, w: B.w - 20, h: 80 }; boundaryIcon(q[0], R, t); drawWrap(B.x + B.w / 2, R.y + R.h + 16 * FS, q[1], B.w - 16, 12, { weight: 800, color: '#334155', lh: 1.15 }); });
      let y = B.y + 40 + 3 * 118 + 4;
      D.text(B.x + B.w / 2, y, '판구조론 =', { size: 13, weight: 800, color: '#1e293b' });
      ['대륙 이동설', '+ 해양저 확장설', '+ 맨틀 대류(원동력)'].forEach((l, i) => D.label(B.x + B.w / 2, y + 22 + i * 26, l, { bg: ['#16a34a', '#0284c7', '#7c3aed'][i], size: 12.5, pad: 9 }));
    } else {
      names.forEach((q, i) => { const w = (B.w - 16 - 16) / 3, R = { x: B.x + 8 + i * (w + 8), y: B.y + 38, w, h: 92 }; boundaryIcon(q[0], R, t); drawWrap(R.x + w / 2, R.y + R.h + 16, q[1], w - 4, 11.5, { weight: 800, color: '#334155', lh: 1.12 }); });
      D.text(B.x + B.w / 2, B.y + 196, '판구조론 = 대륙 이동설 + 해양저 확장설', { size: 13, weight: 800, color: '#1e293b' });
      D.text(B.x + B.w / 2, B.y + 222, '+ 맨틀 대류(원동력)의 통합 이론이에요', { size: 13, weight: 800, color: '#1e293b' });
      D.text(B.x + B.w / 2, B.y + 252, '※ 진원 점은 예시 자료예요', { size: 12, weight: 700, color: '#64748b' });
    }
  }

  /* ======================================================
     장면 4: 관측 기기의 발달 — 연표 슬라이더와 GPS 판 이동
     ====================================================== */
  const RC4 = PHONE
    ? { A: { x: 8, y: 8, w: 504, h: 300 }, B: { x: 8, y: 316, w: 504, h: 268 }, C: { x: 8, y: 592, w: 504, h: 160 } }
    : { A: { x: 12, y: 12, w: 776, h: 300 }, B: { x: 12, y: 320, w: 430, h: 228 }, C: { x: 450, y: 320, w: 338, h: 228 } };
  const INS = [
    { id: 'field', y: 1912, name: '지질 조사', yl: '1912', fact: '같은 화석·빙하·지질 구조 → 대륙 이동설', col: '#a16207' },
    { id: 'sonar', y: 1950, name: '음향 측심기', yl: '1940~50년대', fact: '해령·해구 등 해저 지형 발견', col: '#0284c7' },
    { id: 'mag', y: 1955, name: '자력계', yl: '1950년대', fact: '해저 자기 줄무늬의 좌우 대칭', col: '#dc2626' },
    { id: 'seis', y: 1961, name: '표준 지진계망', yl: '1961', fact: '진원이 해구에서 깊어지는 베니오프대', col: '#7c3aed' },
    { id: 'drill', y: 1968, name: '해저 시추선', yl: '1968', fact: '해령에서 멀수록 지각 나이 증가', col: '#0f766e' },
    { id: 'gps', y: 1985, name: 'VLBI·GPS', yl: '1980~90년대', fact: '판의 이동을 직접 측정(cm/년)', col: '#16a34a' },
  ];
  const EVT = [[1912, '베게너: 대륙 이동설'], [1929, '홈스: 맨틀 대류설 제안'], [1960, '헤스·디츠: 해양저 확장설'], [1963, '바인·매튜스: 줄무늬 대칭'], [1965, '윌슨: 변환 단층'], [1968, '판구조론 정립 (1967~68)']];
  const insK = INS.map(() => 0);
  const Y0 = 1910, Y1 = 2020;
  const GPS = { kr: { v: 3, n: '한반도(예시)', ang: 20 * DEG, dir: 'ESE', d: '동남동' }, hi: { v: 7, n: '하와이(예시)', ang: (180 + 35) * DEG, dir: 'WNW', d: '북서' } };
  const nOn = () => INS.filter((q) => S.yr >= q.y).length;
  function icon(kind, x, y, r, col, t) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const u = r / 22;
    if (kind === 'field') { ctx.beginPath(); ctx.moveTo(-10 * u, 12 * u); ctx.lineTo(8 * u, -8 * u); ctx.stroke(); ctx.fillRect(-1 * u, -16 * u, 16 * u, 8 * u); ctx.fillStyle = '#78716c'; poly([[-14 * u, 14 * u], [-6 * u, 8 * u], [-2 * u, 14 * u]]); ctx.fill(); }
    else if (kind === 'sonar') { ctx.fillStyle = col; poly([[-14 * u, -4 * u], [14 * u, -4 * u], [9 * u, 3 * u], [-9 * u, 3 * u]]); ctx.fill(); ctx.lineWidth = 2.2; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 4 * u, i * 5 * u, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); } }
    else if (kind === 'mag') { ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.arc(0, 2 * u, 10 * u, Math.PI, 0); ctx.lineTo(10 * u, 12 * u); ctx.moveTo(-10 * u, 2 * u); ctx.lineTo(-10 * u, 12 * u); ctx.stroke(); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-13 * u, 8 * u, 6 * u, 6 * u); ctx.fillRect(7 * u, 8 * u, 6 * u, 6 * u); }
    else if (kind === 'seis') { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-14 * u, 0); for (let i = 0; i < 8; i++) ctx.lineTo(-14 * u + (i + 1) * 3.5 * u, (i % 2 ? 1 : -1) * (3 + i * 1.5) * u * (i < 5 ? 1 : 0.5)); ctx.stroke(); }
    else if (kind === 'drill') { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -16 * u); ctx.lineTo(-9 * u, 8 * u); ctx.moveTo(0, -16 * u); ctx.lineTo(9 * u, 8 * u); ctx.moveTo(-5 * u, -2 * u); ctx.lineTo(5 * u, -2 * u); ctx.moveTo(0, 8 * u); ctx.lineTo(0, 16 * u); ctx.stroke(); ctx.fillRect(-14 * u, 8 * u, 28 * u, 4 * u); }
    else { ctx.fillRect(-4 * u, -4 * u, 8 * u, 8 * u); ctx.fillStyle = '#38bdf8'; ctx.fillRect(-15 * u, -3 * u, 9 * u, 6 * u); ctx.fillRect(6 * u, -3 * u, 9 * u, 6 * u); ctx.lineWidth = 2; ctx.strokeStyle = col; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(0, 4 * u, 8 * u * i, Math.PI * 0.25, Math.PI * 0.75); ctx.stroke(); } }
    ctx.restore();
  }
  function timeStep(dt) {
    INS.forEach((q, i) => { insK[i] = approach(insK[i], S.yr >= q.y ? 1 : 0, dt, 9); });
    S.gpsT = Math.min(10, S.gpsT + dt * 2);
  }
  function drawTime(t, dt) {
    const { A, B, C } = RC4;
    timeStep(dt);
    card(A, '⏳ 관측 기기의 발달과 판구조론');
    const TX = (y) => A.x + 30 + ((y - Y0) / (Y1 - Y0)) * (A.w - 60), ay = A.y + (PHONE ? 170 : 196);
    // 축
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TX(Y0), ay); ctx.lineTo(TX(Y1), ay); ctx.stroke();
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(TX(Y0), ay); ctx.lineTo(TX(S.yr), ay); ctx.stroke();
    for (let y = 1910; y <= 2020; y += 10) { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TX(y), ay - 5); ctx.lineTo(TX(y), ay + 5); ctx.stroke(); if (y % 20 === 10 || !PHONE) D.text(TX(y), ay + 20 * FS, String(y), { size: 12, weight: 700, color: '#64748b' }); }
    // 기기 카드 (두 줄로 엇갈려 놓아요)
    const ROW = [0, 0, 1, 0, 1, 0], cw = PHONE ? 40 : 70, chh = PHONE ? 40 : 66;
    INS.forEach((q, i) => {
      const on = insK[i], row = ROW[i], cx = TX(q.y), top = ay - 26 - chh - row * (chh + 12);
      ctx.save(); ctx.globalAlpha = 0.28 + 0.72 * on;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx - cw / 2, top, cw, chh, 12).fill(); }, { blur: 5 * on, y: 2 });
      ctx.strokeStyle = on > 0.5 ? q.col : '#cbd5e1'; ctx.lineWidth = 2.2; rr(cx - cw / 2, top, cw, chh, 12).stroke();
      const sc = 0.78 + 0.22 * on; icon(q.id, cx, top + (PHONE ? chh / 2 : 24), (PHONE ? 15 : 20) * sc, on > 0.5 ? q.col : '#94a3b8', t);
      if (!PHONE) wrapLines(q.name, cw - 6, 11.5, 800).slice(0, 2).forEach((l, k, arr) => D.text(cx, top + 47 + k * 13 - (arr.length === 1 ? -6 : 0), l, { size: 11.5, weight: 800, color: on > 0.5 ? '#1e293b' : '#94a3b8' }));
      ctx.restore();
      ctx.strokeStyle = on > 0.5 ? q.col : '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, top + chh); ctx.lineTo(cx, ay - 1); ctx.stroke();
      ball(cx, ay, 5.5, on > 0.5 ? q.col : '#cbd5e1', false);
      if (on > 0.5 && S.yr - q.y < 6 && !RM) D.ring(cx, ay, 11, t, { color: q.col, speed: 1.6, width: 2 });
    });
    // 사건 표시 (가설 · 이론)
    let cur = null;
    EVT.forEach((e, i) => { const x = TX(e[0]), lit = S.yr >= e[0]; if (lit) cur = e; ctx.fillStyle = lit ? '#f59e0b' : '#cbd5e1'; poly([[x, ay + 28 * FS - 4], [x + 6, ay + 34 * FS - 4], [x, ay + 40 * FS - 4], [x - 6, ay + 34 * FS - 4]]); ctx.fill(); });
    D.text(A.x + 18, ay + 62 * FS, '◆ 가설·이론의 사건', { size: 12, weight: 800, color: '#b45309', align: 'left' });
    if (cur) D.label(A.x + A.w / 2, ay + (PHONE ? 86 : 84) * FS, cur[0] + '  ' + cur[1], { bg: '#b45309', size: 13, pad: 10 });
    else D.text(A.x + A.w / 2, ay + 84 * FS, '연표 슬라이더를 오른쪽으로 움직여 봐요', { size: 13, weight: 700, color: '#64748b' });
    // 현재 연도 표시
    const cxn = TX(S.yr); D.dashedLine(cxn, A.y + 34, cxn, ay, { color: 'rgba(14,165,233,.7)', width: 2 }); D.label(A.x + A.w - 14, A.y + 24, '연표 ' + S.yr + '년', { bg: '#0369a1', size: 13, pad: 9, align: 'right' });
    // 증거 목록
    card(B, '🔦 기기로 확인된 증거');
    const rh = (B.h - 44) / INS.length;
    INS.forEach((q, i) => {
      const y = B.y + 38 + i * rh, on = insK[i], hh = rh - 4;
      ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * on; ctx.fillStyle = on > 0.5 ? mixc('#ffffff', q.col, 0.1) : '#f1f5f9'; rr(B.x + 8, y, B.w - 16, hh, 8).fill();
      ball(B.x + 22, y + hh / 2, 7, on > 0.5 ? q.col : '#94a3b8', false);
      if (PHONE) { D.text(B.x + 36, y + 16, q.name + ' (' + q.yl + ')', { size: 12, weight: 800, color: '#1e293b', align: 'left' }); D.text(B.x + 36, y + 16 + 15 * FS, on > 0.5 ? q.fact : '???', { size: 11.5, weight: 700, color: '#475569', align: 'left' }); }
      else { D.text(B.x + 36, y + 12, q.name + ' (' + q.yl + ')', { size: 12, weight: 800, color: '#1e293b', align: 'left' }); D.text(B.x + 36, y + 24, on > 0.5 ? q.fact : '???', { size: 11.5, weight: 700, color: '#475569', align: 'left' }); }
      ctx.restore();
    });
    // GPS
    card(C, '🛰️ GPS로 잰 판의 이동 (예시 자료)');
    const gOn = S.yr >= 1985 || (game && game.free);
    const G = { x: C.x + 12, y: C.y + 36, w: C.w - 24, h: C.h - (PHONE ? 66 : 78) };
    ctx.fillStyle = '#eef6fb'; rr(G.x, G.y, G.w, G.h, 10).fill();
    if (!gOn) { D.text(G.x + G.w / 2, G.y + G.h / 2, '1980년대 이후에 켜져요', { size: 13.5, weight: 800, color: '#94a3b8' }); }
    else {
      const gs = GPS[S.gps], pxcm = (G.w - 50) / 75, sx0 = S.gps === 'kr' ? G.x + 26 : G.x + G.w - 26, sy0 = S.gps === 'kr' ? G.y + G.h * 0.3 : G.y + G.h * 0.72;
      const dx = Math.cos(gs.ang), dy = Math.sin(gs.ang);
      ctx.save(); rr(G.x, G.y, G.w, G.h, 10).clip();
      const shown = Math.floor(S.gpsT + 1e-6);
      // 눈금자
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx0, sy0 + 14); ctx.lineTo(sx0 + dx * 70 * pxcm, sy0 + 14 + dy * 70 * pxcm); ctx.stroke();
      for (let cm = 0; cm <= 70; cm += 10) { const px = sx0 + dx * cm * pxcm, py = sy0 + 14 + dy * cm * pxcm; ctx.beginPath(); ctx.moveTo(px - dy * 4, py + dx * 4); ctx.lineTo(px + dy * 4, py - dx * 4); ctx.stroke(); if (cm % 20 === 0) D.text(px - dy * 14, py + dx * 14 + 4, cm + ' cm', { size: 11.5, weight: 700, color: '#64748b' }); }
      for (let yy = 0; yy <= shown; yy++) { const cm = yy * gs.v, px = sx0 + dx * cm * pxcm, py = sy0 + dy * cm * pxcm; ctx.strokeStyle = 'rgba(22,163,74,.5)'; ctx.lineWidth = 2; if (yy > 0) { ctx.beginPath(); ctx.moveTo(px - dx * gs.v * pxcm, py - dy * gs.v * pxcm); ctx.lineTo(px, py); ctx.stroke(); } ball(px, py, yy === shown ? 5.5 : 4, yy === 0 ? '#64748b' : '#16a34a', false); if (yy === 0 || yy === 10 || yy === 5) D.text(px - dy * -12 + (yy === 0 ? -2 : 0), py - 10, yy + '년', { size: 11.5, weight: 800, color: '#14532d' }); }
      ctx.restore();
      D.label(G.x + G.w / 2, G.y + G.h - 14, gs.n + ': ' + gs.v + ' cm/년 (' + gs.d + ')', { bg: '#14532d', size: 12.5, pad: 8 });
    }
    drawWrap(C.x + 12, C.y + C.h - 24, '※ 예시 자료예요. 실제 판 이동 자료는 국토지리정보원·한국지질자원연구원 누리집에서 확인해 봐요.', C.w - 24, 11, { align: 'left', color: '#64748b', weight: 700, lh: 1.15 });
  }

  /* ======================================================
     모드 · 조작 연결
     ====================================================== */
  let game = null;
  const MODE_LABEL = { drift: '🧩 대륙 이동설', spread: '🚢 해양저 확장', tect: '🧭 판구조론', time: '🛰️ 관측 기기' };
  const FREE_KEYS = { drift: ['sDr', 'dBtns'], spread: ['sShip', 'shipBtns'], tect: ['sYears'], time: ['sYr', 'gpsSel'] };
  let ctlKeys = [];
  const clsDrift = makeClassify($('#clsDrift'), [
    { id: 'coast', label: '남아메리카 동해안과 아프리카 서해안의 모양이 맞물려요' },
    { id: 'fossil', label: '대서양을 건널 수 없는 생물(메소사우루스 등)의 화석이 양쪽에서 나와요' },
    { id: 'ice', label: '같은 시기의 빙하가 긁은 자국이 대륙을 건너 이어져요' },
    { id: 'rock', label: '산맥과 암석의 종류가 바다 건너 이어져요' },
    { id: 'force', label: '대륙을 움직이는 힘이 무엇인가' },
  ], [{ id: 'yes', label: '대륙 이동설이 설명해요' }, { id: 'no', label: '설명하지 못해요' }], { coast: 'yes', fossil: 'yes', ice: 'yes', rock: 'yes', force: 'no' }, () => { });
  const pairAge = makePair($('#pairAge'), [
    { id: 'L20', label: '왼쪽 20 km: 78만 년' }, { id: 'L66', label: '왼쪽 66 km: 258만 년' }, { id: 'L92', label: '왼쪽 92 km: 360만 년' },
  ], [{ id: 'R66', label: '오른쪽 66 km' }, { id: 'R92', label: '오른쪽 92 km' }, { id: 'R20', label: '오른쪽 20 km' }], { L20: 'R20', L66: 'R66', L92: 'R92' }, () => { });
  const clsBound = makeClassify($('#clsBound'), [
    { id: 'ridge', label: '대서양 중앙 해령' }, { id: 'trench', label: '일본 해구' }, { id: 'fault', label: '산안드레아스 단층' },
  ], [{ id: 'gen', label: '지각 생성' }, { id: 'des', label: '지각 소멸' }, { id: 'con', label: '보존(생성·소멸 없음)' }], { ridge: 'gen', trench: 'des', fault: 'con' }, () => { });
  const pairInst = makePair($('#pairInst'), [
    { id: 'sonar', label: '음향 측심기' }, { id: 'mag', label: '자력계' }, { id: 'seis', label: '표준 지진계망' }, { id: 'drill', label: '해저 시추선' }, { id: 'gps', label: 'VLBI·GPS' },
  ], [
    { id: 'fSeis', label: '진원이 해구에서 대륙 쪽으로 깊어짐' }, { id: 'fGps', label: '판이 해마다 수 cm씩 움직임' }, { id: 'fSonar', label: '해령·해구 같은 해저 지형 발견' }, { id: 'fDrill', label: '해령에서 멀수록 지각의 나이가 많음' }, { id: 'fMag', label: '해령 양쪽의 자기 줄무늬가 대칭' },
  ], { sonar: 'fSonar', mag: 'fMag', seis: 'fSeis', drill: 'fDrill', gps: 'fGps' }, () => { });
  const ordInst = makeOrder($('#ordInst'), [
    { id: 'gps', label: 'VLBI·GPS' }, { id: 'sonar', label: '음향 측심기' }, { id: 'drill', label: '해저 시추선' }, { id: 'mag', label: '자력계' }, { id: 'seis', label: '표준 지진계망' },
  ], ['sonar', 'mag', 'seis', 'drill', 'gps'], () => { });
  const stpDisp = makeStepper($('#stpDisp'), { min: 5, max: 100, step: 5, value: 10, unit: 'cm', dec: 0 });
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
  const fKm = (v) => (v > 0 ? '오른쪽 ' : v < 0 ? '왼쪽 ' : '') + (v === 0 ? '해령 축' : Math.abs(v) + ' km');
  const sDrEl = $('#sDr'), sShipEl = $('#sShip');
  SciSim.bindRange(sDrEl, $('#oDr'), (v) => v + ' %', (v) => { S.dr = +v; S.drTarget = null; });
  driftUI.sync = () => setSlider(sDrEl, $('#oDr'), Math.round(S.dr), (x) => x + ' %');
  SciSim.bindRange(sShipEl, $('#oShip'), fKm, (v) => { S.ship = +v; S.auto = false; });
  shipUI.sync = () => setSlider(sShipEl, $('#oShip'), Math.round(S.ship), fKm);
  SciSim.bindRange($('#sDp'), $('#oDp'), (v) => v + ' m', (v) => { S.depth = +v; });
  SciSim.bindRange($('#sVr'), $('#oVr'), (v) => (+v).toFixed(1) + ' cm/년', (v) => { S.vel = +v; });
  SciSim.bindRange($('#sYears'), $('#oYears'), (v) => v + '년', (v) => { S.years = +v; });
  SciSim.bindRange($('#sYr'), $('#oYr'), (v) => v + '년', (v) => { S.yr = +v; S.gpsT = 0; });
  function setYears(v) { S.years = v; setSlider($('#sYears'), $('#oYears'), v, (x) => x + '년'); }
  function setYr(v) { S.yr = v; setSlider($('#sYr'), $('#oYr'), v, (x) => x + '년'); }
  function setDepth(v) { S.depth = v; setSlider($('#sDp'), $('#oDp'), v, (x) => x + ' m'); }
  function setVel(v) { S.vel = v; setSlider($('#sVr'), $('#oVr'), v, (x) => (+x).toFixed(1) + ' cm/년'); }
  function setShip(v) { S.ship = v; shipUI.sync(); }
  function setGps(k) { S.gps = k; S.gpsT = 0; $('#gpsKr').classList.toggle('on', k === 'kr'); $('#gpsHi').classList.toggle('on', k === 'hi'); }
  $('#gpsKr').addEventListener('click', () => { Sound.click(); setGps('kr'); });
  $('#gpsHi').addEventListener('click', () => { Sound.click(); setGps('hi'); });
  $('#bFit').addEventListener('click', () => { Sound.click(); S.drTarget = 100; });
  $('#bNow').addEventListener('click', () => { Sound.click(); S.drTarget = 0; });
  $('#bAuto').addEventListener('click', () => { Sound.click(); S.auto = !S.auto; if (S.auto) S.autoDir = S.ship > 40 ? -1 : 1; syncAuto(); });
  function syncAuto() { $('#bAuto').textContent = S.auto ? '⏸ 자동 측심 멈춤' : '🚢 자동 측심'; $('#bAuto').classList.toggle('on', S.auto); }
  $('#bSpread').addEventListener('click', () => { Sound.click(); S.spreadT = 0; });
  $('#bProbe').addEventListener('click', () => { Sound.click(); S.probe = 60; });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'spread') { const P = pa2(); if (p.x >= P.x - 12 && p.x <= P.x + P.w + 12 && p.y >= P.y && p.y <= P.y + 110) { S.auto = false; syncAuto(); setShip(clamp(Math.round(((p.x - P.x) / P.w) * 320 - 160), -160, 160)); return true; } return false; }
      if (S.mode === 'tect' && (S.probeShow || (game && game.free))) { const G = geo3(), px = G.X(200); if (Math.abs(p.x - px) < 30 && p.y >= G.Z(0) - 14 && p.y <= G.Z(700) + 14) { S.probe = clamp((p.y - G.Z(0)) / G.s, 0, 700); return true; } }
      return false;
    },
    move(p) {
      if (S.mode === 'spread') { const P = pa2(); setShip(clamp(Math.round(((p.x - P.x) / P.w) * 320 - 160), -160, 160)); }
      else if (S.mode === 'tect') { const G = geo3(); S.probe = clamp((p.y - G.Z(0)) / G.s, 0, 700); }
    },
    hover(p) {
      if (S.mode === 'spread') { const P = pa2(); return p.x >= P.x - 12 && p.x <= P.x + P.w + 12 && p.y >= P.y && p.y <= P.y + 110 ? 'ew-resize' : ''; }
      if (S.mode === 'tect' && (S.probeShow || (game && game.free))) { const G = geo3(); return Math.abs(p.x - G.X(200)) < 30 && p.y >= G.Z(0) - 14 && p.y <= G.Z(700) + 14 ? 'ns-resize' : ''; }
      return '';
    },
  });

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetStep(li) {
    hideHint(); parts.clear(); S.bad = [];
    S.dr = 0; S.drTarget = null; S.fitDone = false; driftUI.sync(); clsDrift.reset();
    spreadReset(); setShip(110); syncAuto(); setDepth(2500); setVel(1.0); pairAge.reset();
    setYears(0); S.probe = 60; S.probeShow = false; clsBound.reset(); FOCI.forEach((f) => { f.ap = -1; });
    setYr(1910); setGps('kr'); stpDisp.reset(); pairInst.reset(); ordInst.reset(); S.gpsT = 0;
    if (li === 0) { setMode('drift'); setCtl(['sDr', 'dBtns']); showHint('대륙 위치 슬라이더를 오른쪽으로 밀어 두 대륙을 맞춰 봐요', 5200); }
    else if (li === 1) { setMode('spread'); setCtl(['sShip', 'shipBtns']); showHint('배를 움직이면 음파가 해저를 재서 단면이 그려져요', 5200); }
    else if (li === 2) { setMode('tect'); setCtl(['sYears']); showHint('관측 기간을 늘려 진원을 모아 봐요', 5200); }
    else { setMode('time'); setCtl(['sYr']); showHint('연표 슬라이더를 오른쪽으로 움직이면 기기가 켜져요', 5200); }
    updateCtl();
  }
  const tRT = () => rtOf(S.ship);
  const levels = [
    {
      title: '대륙 이동설: 증거는 있었지만', short: '대륙 이동설', icon: '🧩', phase: '탐구', features: ['drift'],
      intro: '<p class="si-q">❓ 탐구 질문: 베게너는 왜 80년 가까이 인정받지 못했고, 어떤 관측 기기가 판구조론을 확립시켰을까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 통합과학에서</b> 대륙 이동의 증거(해안선·화석·빙하 흔적)와 판의 경계·맨틀 대류를 배웠어요. 이번 차시는 증거를 <b>어떤 기기</b>로 얻었고 가설이 <b>어떻게 바뀌어</b> 판구조론이 되었는지 연표로 추적해요.</div>' +
        '<p>1912년 <b>베게너</b>는 남아메리카와 아프리카가 원래 붙어 있었다는 <b>대륙 이동설</b>을 주장했어요. 슬라이더로 대륙을 맞춰 보고, 증거가 무엇을 설명하고 무엇을 설명하지 못했는지 가려 봐요. (대륙 윤곽은 단순화한 실제 모양이에요.)</p>',
      setup() { resetStep(0); },
      recap: '베게너(1912)는 해안선·화석·빙하 흔적·지질 구조를 증거로 대륙 이동설을 주장했지만, 대륙을 움직이는 힘을 설명하지 못해 널리 받아들여지지 않았어요.',
      summary: '<ul><li><b>대륙 이동설</b>(베게너, 1912): 대륙이 한 덩어리(판게아)였다가 갈라져 이동했다는 가설. 증거: 남아메리카·아프리카 해안선의 일치, 양쪽에서 나오는 같은 화석(메소사우루스·글로소프테리스), 같은 시기 빙하 흔적, 이어지는 산맥·암석.</li><li>한계: 대륙을 움직이는 <b>원동력</b>을 설명하지 못해 당시 학자들이 받아들이지 않았어요.</li><li>1929년 <b>홈스</b>가 맨틀 대류설을 제안했지만 증거는 부족했어요.</li><li>대륙 이동설은 판구조론의 첫 단계였을 뿐, 베게너가 판구조론을 완성한 것은 아니에요.</li></ul>',
      missions: [
        {
          title: '증거 카드 분류하기', manual: true,
          goal: '카드 5장을 <b>대륙 이동설이 설명하는 것</b>과 <b>설명하지 못하는 것</b>으로 나눠요.',
          hint: '지도의 표시를 봐요. 해안선·화석·빙하 흔적·산맥은 두 대륙을 맞추면 이어져요. 힘의 정체는 그림으로 알 수 없었어요.',
          setup() { clsDrift.reset(); setMode('drift'); setCtl(['sDr', 'dBtns', 'clsDrift']); },
          status: () => mark(clsDrift.ok()) + ' 분류한 카드 ' + clsDrift.count() + ' / 5',
          check() {
            if (!clsDrift.complete()) return '카드 5장을 모두 분류해 주세요. (지금 ' + clsDrift.count() + '장)';
            if (!clsDrift.ok()) { clsDrift.mark(clsDrift.wrong()); return '빨간 카드가 달라요. 대륙을 맞췄을 때 눈으로 확인되는 것인지 생각해 봐요.'; }
            return true;
          },
          explain: '해안선·화석·빙하 흔적·지질 구조 <b>4가지는 대륙을 맞추면 설명</b>돼요. 하지만 <b>대륙을 움직이는 힘</b>은 설명하지 못했어요. 이것이 가설이 받아들여지지 않은 가장 큰 까닭이에요.',
        },
        {
          type: 'quiz', title: '왜 받아들여지지 않았을까?',
          goal: '증거가 여럿이었는데도 베게너의 가설이 널리 받아들여지지 않은 까닭은?',
          setup() { setMode('drift'); setCtl(['sDr', 'dBtns']); },
          choices: ['대륙을 움직이는 힘(원동력)을 설명하지 못했기 때문이에요', '해안선이 전혀 맞지 않았기 때문이에요', '베게너가 이미 판구조론을 완성했기 때문이에요', '당시에는 화석이 발견되지 않았기 때문이에요'],
          answer: 0,
          feedback: ['', '해안선이 맞물리는 것은 가장 눈에 띄는 증거였어요.', '판구조론은 1960년대에 여러 증거가 모여 정립됐어요. 베게너는 대륙 이동설을 주장했을 뿐이에요.', '메소사우루스와 글로소프테리스 같은 화석이 이미 발견되어 있었어요.'],
          explain: '증거가 맞아도 <b>원동력</b>을 설명하지 못하면 이론이 되기 어려웠어요. 이후 해저 탐사 기기가 새로운 증거를 보태 이 문제를 풀었어요.',
        },
      ],
    },
    {
      title: '해양저 확장: 해령에서 새 지각이 생겨요', short: '해양저 확장', icon: '🚢', phase: '분석', features: ['spread'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대륙이 움직인다는 증거는 있었지만 힘이 없었어요. 1940~50년대에 <b>음향 측심기</b>와 <b>자력계</b>가 해저를 처음 자세히 보여 주었어요.</div>' +
        '<p>배가 소리를 쏘고 되돌아오는 시간을 재면 <b>수심 = 소리 속도 × 왕복 시간 ÷ 2</b>예요(바닷속 소리 속도 1500 m/s). 해저 암석의 <b>자기 줄무늬</b>는 지구 자기장이 뒤집힐 때마다 번갈아 생겨요. 속도 = 거리 ÷ 시간으로 해저가 퍼지는 속도를 구해요. (모든 값은 예시예요.)</p>',
      setup() { resetStep(1); },
      recap: '해령에서 새 해양 지각이 생겨 양쪽으로 퍼지므로, 자기 줄무늬는 해령 축을 기준으로 대칭이고 해령에서 멀수록 암석의 나이가 많아요.',
      summary: '<ul><li><b>음향 측심</b>: 수심 = 소리 속도 × 왕복 시간 ÷ 2 (소리 속도 1500 m/s). 왕복 4.0 s → <b>3000 m</b>.</li><li><b>해저 자기 줄무늬</b>는 해령 축을 기준으로 좌우 대칭이에요(바인·매튜스, 1963).</li><li>해령 축에서 20 km 지점이 지자기 역전 경계(약 78만 년 전)이면 한쪽 확장 속도 = 20 km ÷ 78만 년 = 2×10⁶ cm ÷ 7.8×10⁵ 년 ≈ <b>2.6 cm/년</b>(양쪽 합 약 5.1 cm/년).</li><li><b>해양저 확장설</b>(헤스·디츠, 1960): 해령에서 새 해양 지각이 생겨 퍼지고, 해령에서 멀수록 나이가 많아요(최고령 약 1.8억 년). 오래된 해양 지각은 해구에서 사라져요(지구가 팽창하는 것이 아니에요).</li></ul>',
      missions: [
        {
          title: '수심과 확장 속도 구하기',
          goal: '배를 <b>왕복 시간 4.0 s</b>인 곳에 놓고 <b>수심(m)</b>을 입력해요. 또 20 km 지점이 <b>78만 년 전</b> 경계일 때 <b>한쪽 확장 속도</b>를 입력해요.',
          hint: '배 위치 슬라이더나 화면 위쪽을 끌어서 왕복 시간이 4.0 s인 곳을 찾아요. 수심 = 1500 × 4.0 ÷ 2. 속도 = 20 km ÷ 78만 년 (1 km = 10⁵ cm).',
          setup() { setMode('spread'); setCtl(['sShip', 'shipBtns', 'sDp', 'sVr']); },
          check: () => tRT() === 4.0 && S.depth === 3000 && S.vel === 2.6, hold: 0.6,
          status: () => mark(tRT() === 4.0) + ' 왕복 시간 ' + tRT().toFixed(1) + ' s (목표 4.0 s) · ' + mark(S.depth === 3000) + ' 수심 ' + S.depth + ' m · ' + mark(S.vel === 2.6) + ' 속도 ' + S.vel.toFixed(1) + ' cm/년',
          explain: '수심 = 1500 m/s × 4.0 s ÷ 2 = <b>3000 m</b>예요. 확장 속도 = 20 km ÷ 78만 년 = 2×10⁶ cm ÷ 7.8×10⁵ 년 ≈ <b>2.6 cm/년</b>이에요. 해령 양쪽을 합치면 약 5.1 cm/년이에요.',
        },
        {
          title: '대칭인 짝 찾기', manual: true,
          goal: '왼쪽 암석 시료와 <b>나이가 같은</b> 오른쪽 시료를 하나씩 이어요.',
          hint: '해령에서 만들어진 암석은 양쪽으로 똑같이 퍼져 나가요. 같은 나이의 암석은 해령 축에서 같은 거리에 있어요.',
          setup() { pairAge.reset(); setMode('spread'); setCtl(['sShip', 'shipBtns', 'pairAge']); },
          status: () => mark(pairAge.ok()) + ' 이은 쌍 ' + pairAge.count() + ' / 3',
          check() {
            if (!pairAge.complete()) return '3쌍을 모두 이어 주세요. (지금 ' + pairAge.count() + '쌍)';
            if (!pairAge.ok()) { pairAge.mark(pairAge.wrong()); return '빨간 쌍이 달라요. 같은 나이는 해령 축에서 같은 거리에 있어요.'; }
            return true;
          },
          explain: '줄무늬와 암석 나이는 해령 축을 기준으로 <b>좌우 대칭</b>이에요. 같은 시기에 해령에서 만들어진 암석이 양쪽으로 똑같이 밀려났기 때문이에요.',
        },
        {
          type: 'quiz', title: '해령에서 멀수록 나이가 많은 까닭',
          goal: '해령에서 멀어질수록 해양 지각의 암석 나이가 많은 까닭은?',
          setup() { setMode('spread'); setCtl(['sShip', 'shipBtns']); },
          choices: ['해령에서 새 해양 지각이 만들어져 양쪽으로 밀려나기 때문이에요', '지구가 부풀어 올라 해저가 늘어나기 때문이에요', '바닷물이 오래 닿은 암석일수록 나이를 먹기 때문이에요', '해령에서 먼 곳일수록 햇빛이 약하기 때문이에요'],
          answer: 0,
          feedback: ['', '지구가 팽창한다는 증거는 없어요. 해령에서 생긴 만큼 해구에서 해양 지각이 사라져 지구 크기는 거의 일정해요.', '암석의 나이는 만들어진 뒤 흐른 시간이에요. 바닷물과는 관계가 없어요.', '햇빛은 해저 암석의 나이와 관계가 없어요.'],
          explain: '해령에서 새 해양 지각이 생겨 양쪽으로 밀려나므로 <b>멀수록 먼저 만들어진 암석</b>이에요. 오래된 해양 지각은 해구에서 지구 속으로 들어가 사라져요.',
        },
      ],
    },
    {
      title: '판구조론: 이론의 통합', short: '판구조론', icon: '🧭', phase: '설명', features: ['tect'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 해령에서 새 해양 지각이 생긴다는 것을 확인했어요. 새로 생기기만 한다면 지구가 커질 텐데, 오래된 지각은 어디서 사라질까요?</div>' +
        '<p>1961년부터 <b>표준 지진계망</b>이 전 세계 지진을 같은 기준으로 기록해 <b>진원</b>의 위치가 정밀해졌어요. 해구에서 대륙 쪽으로 갈수록 진원이 깊어지는 <b>베니오프대</b>가 나타나요. 관측 기간을 늘려 진원을 모으고, 판 경계 3가지를 정리해 봐요. (진원 점은 예시 자료예요.)</p>',
      setup() { resetStep(2); },
      recap: '진원은 해구에서 대륙 쪽으로 깊어지는 베니오프대를 이뤄요. 판구조론은 대륙 이동설, 해양저 확장설, 맨틀 대류 개념을 통합한 이론이에요.',
      summary: '<ul><li><b>베니오프대</b>: 해구에서 대륙 쪽으로 갈수록 진원 깊이가 증가(경사 약 45°, 해구에서 200 km 지점의 진원 깊이 약 <b>200 km</b>, 최대 약 700 km). 섭입하는 판을 따라 지진이 일어나기 때문이에요.</li><li><b>판 경계 3종</b>: 해령(발산, 지각 생성) · 해구(수렴, 지각 소멸) · 변환 단층(보존, 윌슨 1965).</li><li><b>판</b>은 암석권(약 100 km)이 조각난 것으로, 연약권 위를 움직여요.</li><li><b>판구조론</b>(1967~68) = 대륙 이동설 + 해양저 확장설 + 맨틀 대류 개념의 통합. 판을 움직이는 힘은 다음 차시에서 다뤄요.</li></ul>',
      missions: [
        {
          title: '해구에서 200 km 지점의 진원 깊이',
          goal: '관측 기간을 <b>10년 이상</b>으로 늘려 진원을 모으고, 노란 마커를 끌어 <b>해구에서 200 km</b> 지점의 <b>진원 깊이</b>에 놓아요.',
          hint: '관측 기간 슬라이더를 10년 이상으로 올리면 점들이 모여요. 점선 위의 마커를 위아래로 끌어 점들이 모인 깊이에 맞춰요. (약 200 km 근처예요.)',
          setup() { S.probeShow = true; setMode('tect'); setCtl(['sYears']); },
          check: () => S.years >= 10 && Math.abs(probeDepth() - 200) <= 25, hold: 0.7,
          status: () => mark(S.years >= 10) + ' 관측 기간 ' + S.years + '년 (목표 10년 이상) · ' + mark(Math.abs(probeDepth() - 200) <= 25) + ' 마커 깊이 ' + probeDepth() + ' km (목표 175~225 km)',
          explain: '해구에서 200 km 지점의 진원 깊이는 약 <b>200 km</b>예요. 섭입하는 판이 약 45°로 내려가기 때문에 해구에서 떨어진 거리만큼 진원이 깊어져요.',
        },
        {
          title: '판 경계 3종 분류', manual: true,
          goal: '세 지형이 속한 판 경계를 <b>지각 생성 · 소멸 · 보존</b>으로 나눠요.',
          hint: '해령에서는 새 해양 지각이 만들어져요. 해구에서는 판이 지구 속으로 들어가요. 변환 단층에서는 판이 서로 어긋나며 지나가요.',
          setup() { clsBound.reset(); setMode('tect'); setCtl(['sYears', 'clsBound']); },
          status: () => mark(clsBound.ok()) + ' 분류한 곳 ' + clsBound.count() + ' / 3',
          check() {
            if (!clsBound.complete()) return '3곳을 모두 분류해 주세요. (지금 ' + clsBound.count() + '곳)';
            if (!clsBound.ok()) { clsBound.mark(clsBound.wrong()); return '빨간 줄이 달라요. 오른쪽 그림의 화살표 방향을 다시 봐요.'; }
            return true;
          },
          explain: '<b>해령</b>은 판이 멀어지며 새 지각이 <b>생성</b>되고, <b>해구</b>는 판이 가까워지며 지각이 <b>소멸</b>하며, <b>변환 단층</b>은 판이 나란히 어긋나며 지각이 <b>보존</b>돼요.',
        },
        {
          type: 'quiz', title: '깊은 지진은 왜 한쪽에만?',
          goal: '깊은 지진이 해구에서 <b>대륙 쪽으로만</b> 나타나는 까닭은?',
          setup() { setMode('tect'); setCtl(['sYears']); },
          choices: ['섭입하는 판을 따라 진원이 점점 깊어지기 때문이에요', '대륙 쪽 땅속이 더 뜨겁기 때문이에요', '바다 쪽에는 지진계가 없기 때문이에요', '해구가 대륙 쪽에서 가장 깊기 때문이에요'],
          answer: 0,
          feedback: ['', '깊은 곳에서 지진이 일어나려면 암석이 단단해야 해요. 오히려 섭입하는 차가운 판이 단단해 지진이 생겨요.', '표준 지진계망은 바다 쪽에도 있었어요. 진원이 실제로 한쪽에 몰려 있어요.', '해구의 깊이와 진원의 깊이는 달라요. 진원은 지하 수백 km예요.'],
          explain: '해양판이 해구에서 대륙 아래로 약 45°로 <b>섭입</b>하며 내려가요. 그 판을 따라 지진이 일어나므로 대륙 쪽으로 갈수록 진원이 깊어져요.',
        },
      ],
    },
    {
      title: '관측 기기: 가설에서 이론으로', short: '관측 기기', icon: '🛰️', phase: '기록', features: ['time'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 음향 측심기, 자력계, 표준 지진계망이 증거를 모았어요. 그럼 판구조론은 어떤 순서로 쌓였을까요?</div>' +
        '<p>연표 슬라이더를 움직이면 <b>관측 기기</b>가 하나씩 켜지고, 그 기기로 확인된 증거가 밝아져요. 마지막으로 <b>GPS</b>로 판의 이동을 직접 재어 봐요. (자료는 예시이고, 실제 자료는 누리집에서 확인할 수 있어요.)</p>',
      setup() { resetStep(3); },
      recap: '새 관측 기기가 증거를 보태 가설을 검증하고 수정하면서 대륙 이동설이 해양저 확장설을 거쳐 판구조론으로 발전했어요. 오늘은 GPS로 판의 이동도 직접 재요.',
      summary: '<ul><li><b>연표</b>: 1912 대륙 이동설 → 1929 맨틀 대류설(제안) → 1960 해양저 확장설 → 1963 줄무늬 대칭 → 1965 변환 단층 → 1967~68 판구조론 정립 → 1980~90년대 VLBI·GPS 직접 측정.</li><li><b>기기와 증거</b>: 음향 측심기(해령·해구 발견) · 자력계(자기 줄무늬) · 표준 지진계망(베니오프대) · 해저 시추선(해양 지각 연령) · VLBI·GPS(판 이동 속도).</li><li>GPS 예시: 한반도 약 3 cm/년(동남동) → 10년이면 3 cm × 10 = <b>30 cm</b>, 1억 년이면 약 3000 km.</li><li>과학 이론은 한 사람이 한 번에 완성하지 않고, 기기가 만든 증거로 검증·수정되며 발전해요. 판 운동은 해령·산맥을 만드는 지권의 변화와 화산·지진을 통해 기권·수권과도 이어져요.</li></ul>',
      missions: [
        {
          title: '기기와 증거 짝짓기, 연대순 정렬', manual: true,
          goal: '기기 5개와 <b>밝혀낸 사실</b>을 이어요. 그리고 기기를 <b>등장한 순서</b>(오래된 것부터)로 눌러요.',
          hint: '연표 슬라이더를 움직여 기기가 켜지는 순서를 보고, 오른쪽 목록의 증거와 맞춰 봐요.',
          setup() { pairInst.reset(); ordInst.reset(); setMode('time'); setCtl(['sYr', 'pairInst', 'ordInst']); },
          status: () => mark(pairInst.ok()) + ' 이은 쌍 ' + pairInst.count() + ' / 5 · ' + mark(ordInst.ok()) + ' 고른 순서 ' + ordInst.seq.length + ' / 5',
          check() {
            if (!pairInst.complete()) return '기기 5개를 모두 짝지어 주세요. (지금 ' + pairInst.count() + '쌍)';
            if (!pairInst.ok()) { pairInst.mark(pairInst.wrong()); return '빨간 쌍이 달라요. 기기가 무엇을 재는지 생각해 봐요.'; }
            if (!ordInst.complete()) return '기기를 등장한 순서대로 5개 모두 눌러 주세요. (지금 ' + ordInst.seq.length + '개)';
            if (!ordInst.ok()) { ordInst.mark(ordInst.seq.find((id, i) => id !== ordInst.answerIds[i])); return '순서가 달라요. 연표 슬라이더에서 기기가 켜지는 순서를 확인해 봐요.'; }
            return true;
          },
          explain: '<b>음향 측심기(1940~50년대) → 자력계(1950년대) → 표준 지진계망(1961) → 해저 시추선(1968) → VLBI·GPS(1980~90년대)</b> 순이에요. 기기가 발전할수록 가설을 확인하는 증거가 쌓였어요.',
        },
        {
          title: 'GPS로 판의 이동 거리 구하기',
          goal: '연표를 <b>1985년 이후</b>로 옮기고, 한반도가 <b>3 cm/년</b>으로 움직일 때 <b>10년 동안</b> 이동한 거리(cm)를 입력해요.',
          hint: '거리 = 속도 × 시간 = 3 cm/년 × 10년. 한반도 예시를 고르고, 점이 10년까지 찍히는지 눈금자로도 확인해 봐요.',
          setup() { setYr(1990); setGps('kr'); stpDisp.reset(); setMode('time'); setCtl(['sYr', 'gpsSel', 'stpDisp']); },
          check: () => S.yr >= 1985 && S.gps === 'kr' && stpDisp.value === 30, hold: 0.6,
          status: () => mark(S.yr >= 1985 && S.gps === 'kr') + ' ' + (S.gps === 'kr' ? '한반도' : '하와이') + ' · ' + S.yr + '년 · ' + mark(stpDisp.value === 30) + ' 입력한 거리 ' + stpDisp.value + ' cm',
          explain: '거리 = 3 cm/년 × 10년 = <b>30 cm</b>예요. 이 속도가 1억 년 동안 이어지면 약 3000 km로, 대륙이 움직일 수 있는 이유가 돼요.',
        },
        {
          type: 'quiz', title: '이론은 어떻게 만들어질까?',
          goal: '판구조론이 정립된 과정을 가장 잘 설명한 것은?',
          setup() { setMode('time'); setCtl(['sYr']); },
          choices: ['새 관측 기기가 증거를 보태 가설을 검증하고 고치며 이론으로 발전했어요', '한 사람이 한 번에 발견해서 바로 받아들여졌어요', '기기 없이 생각만으로 정립됐어요', '정립된 뒤에는 더 이상 관측이 필요 없어요'],
          answer: 0,
          feedback: ['', '대륙 이동설(1912)에서 판구조론(1967~68)까지 여러 학자의 가설과 증거가 쌓였어요.', '해저 지형, 자기 줄무늬, 진원 분포, 시료 연령 같은 관측 증거가 결정적이었어요.', 'GPS 같은 기기는 정립 이후에도 판의 이동을 더 정확히 재고 있어요.'],
          explain: '과학 이론은 <b>관측 기기가 만든 증거</b>가 쌓이고 가설이 검증·수정되며 발전해요. 판구조론도 한 사람이 한 번에 발견한 것이 아니에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hs-plate-history', mount: '#game', badge: '판 탐정', homeHref: '../../index.html#hs',
    featureLabels: { drift: '🧩 대륙 맞추기 · 증거', spread: '🚢 음향 측심 · 자기 줄무늬', tect: '🧭 진원 분포 · 판 경계', time: '🛰️ 연표 · 관측 기기 · GPS' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'drift') setReadouts(['대륙 위치', S.dr < 0.5 ? '현재' : fitPct() + ' % 과거로', '맞춤', S.dr >= 99.5 ? '맞물림' : '떨어져 있음', '표시된 증거', '4가지']);
    else if (m === 'spread') setReadouts(['배의 위치', fKm(Math.round(S.ship)), '왕복 시간', tRT().toFixed(1) + ' s', '측심한 곳', S.recN + ' / ' + NBIN + '칸']);
    else if (m === 'tect') setReadouts(['관측 기간', S.years + '년', '기록된 진원', nFoci() + '개', '마커 깊이', S.probeShow || (game && game.free) ? probeDepth() + ' km' : '—']);
    else { const q = GPS[S.gps]; setReadouts(['연도', S.yr + '년', '켜진 기기', nOn() + ' / 6', 'GPS 속도 · ' + q.n.replace('(예시)', ''), q.v + ' cm/년']); }
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
    if (S.mode === 'drift') drawDrift(t, dt);
    else if (S.mode === 'spread') { drawSpread(t, dt); syncAuto(); }
    else if (S.mode === 'tect') drawTect(t, dt);
    else drawTime(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    levels, VW, VH, S, PHONE, clsDrift, pairAge, clsBound, pairInst, ordInst, stpDisp, FOCI, PROF,
    get game() { return game; }, setMode, resetStep, updateCtl, setYears, setYr, setDepth, setVel, setShip, setGps, geo3, pa2, rtOf, dSea, tRT, probeDepth, nFoci,
    setDr(v) { S.dr = v; S.drTarget = null; driftUI.sync(); },
    runSpread(sec) { let k = Math.round(sec * 60); while (k-- > 0) spreadStep(1 / 60); },
    solveDrift() { clsDrift.sel = { coast: 'yes', fossil: 'yes', ice: 'yes', rock: 'yes', force: 'no' }; },
    solveAge() { pairAge.map = { L20: 'R20', L66: 'R66', L92: 'R92' }; },
    solveBound() { clsBound.sel = { ridge: 'gen', trench: 'des', fault: 'con' }; },
    solveInst() { pairInst.map = { sonar: 'fSonar', mag: 'fMag', seis: 'fSeis', drill: 'fDrill', gps: 'fGps' }; ordInst.seq = ['sonar', 'mag', 'seis', 'drill', 'gps']; },
  };
})();
