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


  /* =========================================================
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 용승과 엘니뇨-남방진동
     [12지구01-05] 해수의 용승과 침강, 엘니뇨-남방진동(ENSO)의 진행 과정 및 관련 현상
     ① 모형: 용승·침강   ② 관찰: 정상 상태   ③ 예측: 엘니뇨·라니냐   ④ 분석: 남방진동
     ========================================================= */
  initStage('#d6e8f5', 800, 560, 600, 880, 1.28);
  const U = VW / 800;
  const MR = PHONE ? { x: 8, y: 8, w: 584, h: 400 } : { x: 10, y: 10, w: 780, h: 340 };
  const LR = PHONE ? { x: 8, y: 416, w: 584, h: 456 } : { x: 10, y: 358, w: 780, h: 192 };

  /* ---------- 상태 지표 p: +1 = 엘니뇨, 0 = 정상, −1 = 라니냐 (세 점 사이를 직선으로 이어요) ---------- */
  const anc = (p, la, no, el) => (p >= 0 ? lerp(no, el, Math.min(p, 1.3)) : lerp(no, la, Math.min(-p, 1.3)));
  const TA = {           // [라니냐, 정상, 엘니뇨]  (예시 값)
    sstW: [29.5, 29.0, 28.5], sstC: [26.0, 27.0, 28.5], sstE: [22.4, 24.0, 26.4],      // 표층 수온 (°C): 서·중앙·동태평양
    thW: [200, 150, 100], thE: [30, 50, 90],                                           // 수온 약층 깊이 (m): 서·동
    slope: [70, 50, 10], upw: [0.9, 0.6, 0.2], rainX: [0.12, 0.22, 0.62],               // 서쪽 해수면이 높은 정도 (cm), 용승 세기, 강수 중심 위치(0 서 ~ 1 동)
    walk: [1.2, 1.0, 0.5], tah: [1015.5, 1013.5, 1011.0], dar: [1008.0, 1009.5, 1011.5], // 워커 순환 세기, 타히티·다윈 해면 기압 (hPa)
  };
  const A = (k, p) => anc(p, TA[k][0], TA[k][1], TA[k][2]);
  const N34_BASE = 24.0;                                    // 동태평양 평년 수온 (°C): 수온 편차의 기준
  const WP = [150, 100, 40];                                  // 무역풍 세기(평소의 %): 라니냐 · 정상 · 엘니뇨
  const windPct = (p) => anc(p, WP[0], WP[1], WP[2]);
  const pOfPct = (pct) => (pct >= 100 ? -(pct - 100) / (WP[0] - 100) : (100 - pct) / (100 - WP[2]));   // 무역풍 세기 → p
  const soiOf = (p) => Math.round((A('tah', p) - A('dar', p)) * 10) / 10;
  const sstAt = (k, xf, P) => {                              // 가로 위치 xf(0~1)에서의 표층 수온: 서(0.05)·중앙(0.5)·동(0.95) 세 점을 매끈하게 잇기
    const x = clamp(xf, 0.05, 0.95), w = A('sstW', P), c = A('sstC', P), e = A('sstE', P);
    return w * ((x - 0.5) * (x - 0.95)) / ((0.05 - 0.5) * (0.05 - 0.95)) + c * ((x - 0.05) * (x - 0.95)) / ((0.5 - 0.05) * (0.5 - 0.95)) + e * ((x - 0.05) * (x - 0.5)) / ((0.95 - 0.05) * (0.95 - 0.5));
  };
  const depAt = (xf, P) => A('thE', P) + (A('thW', P) - A('thE', P)) * (1 - smooth((xf - 0.1) / 0.8));
  const SST_STOPS = [[20, '#2a62c9'], [23, '#58b0e2'], [26, '#f5d05a'], [29, '#ee7d36']];
  const sstColor = (T) => { if (T <= SST_STOPS[0][0]) return SST_STOPS[0][1]; for (let i = 1; i < SST_STOPS.length; i++) if (T <= SST_STOPS[i][0]) return mixc(SST_STOPS[i - 1][1], SST_STOPS[i][1], (T - SST_STOPS[i - 1][0]) / (SST_STOPS[i][0] - SST_STOPS[i - 1][0])); return SST_STOPS[SST_STOPS.length - 1][1]; };

  /* ---------- 엘니뇨 · 라니냐 예시 자료: 수온 편차 (Niño 3.4, 예시) ---------- */
  const SER = [];
  { const r = seeded(7); const EV = [[1997.95, 2.4, 0.38], [1999.9, -1.5, 0.7], [2002.9, 1.2, 0.3], [2004.65, 0.85, 0.09], [2010.95, -1.6, 0.55], [2015.95, 2.6, 0.45]];
    for (let m = 0; m <= 12 * 23; m++) { const y = 1995 + m / 12; let a = 0; EV.forEach((e) => { a += e[1] * Math.exp(-0.5 * Math.pow((y - e[0]) / e[2], 2)); }); a += (r() - 0.5) * 0.12; SER.push({ y, a: Math.round(a * 10) / 10 }); } }
  const RUNS = [];
  { let cur = null; SER.forEach((d, i) => { const sg = d.a >= 0.5 ? 1 : d.a <= -0.5 ? -1 : 0; if (sg && cur && cur.sg === sg) { cur.e = i; cur.n++; if (Math.abs(d.a) > Math.abs(SER[cur.pk].a)) cur.pk = i; } else { if (cur) RUNS.push(cur); cur = sg ? { sg, s: i, e: i, n: 1, pk: i } : null; } }); if (cur) RUNS.push(cur); }
  RUNS.forEach((r, i) => { r.id = 'ABCDEFGH'[i]; r.kind = r.n >= 5 ? (r.sg > 0 ? 'el' : 'la') : 'no'; });
  const yrOf = (r) => { const a = SER[r.s].y, b = SER[r.e].y; const f = (v) => Math.floor(v); return f(a) === f(b) ? f(a) + '년' : f(a) + '~' + f(b); };
  const soiSer = (a) => soiOf(a > 0 ? a / 2.4 : a / 1.6);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'coast', clock: 0, fade: 0,
    dir: 'N', ws: 2, Us: 2, up: 0,                      // 해안 바람 방향 · 세기, 부드러운 값
    pct: 100, pW: 0, pS: 0, pT: 0, pR: 0,                // 부드러운 지표 (바람, 수온, 수온 약층, 강수·용승)
    tgt: [0, 0, 0, 0], sign: 1, stage: 0, playing: false, playT: 0, started: false,
    reveal: false, sub: 'soi', sw: new SciSim.Spring(0, { stiffness: 90, damping: 12 }), dw: new SciSim.Spring(0, { stiffness: 90, damping: 12 }),
    maxStage: 0, seenStrong: false, plank: [], fish: [],
  };
  const STAGE_MULT = [[0, 0, 0, 0], [0.7, 0, 0, 0], [1, 0.8, 0, 0], [1, 1, 1, 0], [1, 1, 1, 1]];
  const NAME_EL = ['정상 상태', '① 무역풍 약화', '② 난수 동쪽으로', '③ 수온 약층 변화', '④ 용승 약화·강수 이동'];
  const NAME_LA = ['정상 상태', '① 무역풍 강화', '② 난수 서쪽에 더 모임', '③ 수온 약층 변화', '④ 용승 강화·강수 서쪽'];

  /* ---------- HTML 도구 ---------- */
  const clsUp = makeClassify($('#clsUp'), [
    { id: 'a', label: '수온이 낮은 심층수가 표층으로 올라와요' }, { id: 'c', label: '표층의 산소가 심층으로 운반돼요' },
    { id: 'b', label: '영양염이 풍부해 식물 플랑크톤이 늘어요' }, { id: 'd', label: '표층수가 모여드는 곳에서 일어나요' },
    { id: 'e', label: '페루 연안 같은 좋은 어장이 만들어져요' }, { id: 'f', label: '따뜻한 표층수가 아래로 내려가요' }],
  [{ id: 'up', label: '용승' }, { id: 'dn', label: '침강' }], { a: 'up', b: 'up', c: 'dn', d: 'dn', e: 'up', f: 'dn' });
  const ordEn = makeOrder($('#ordEn'), [
    { id: 'd', label: '찬 물이 올라오는 용승이 약해져요' }, { id: 'b', label: '서태평양의 따뜻한 물이 동쪽으로 퍼져요' }, { id: 'e', label: '비구름의 중심이 동쪽으로 옮겨 가요' },
    { id: 'a', label: '무역풍이 약해져요' }, { id: 'c', label: '동태평양의 수온 약층이 깊어져요' }], ['a', 'b', 'c', 'd', 'e']);
  const clsSpan = makeClassify($('#clsSpan'), RUNS.map((r) => ({ id: r.id, label: '구간 ' + r.id + ' (' + yrOf(r) + ', 편차 ' + sgn(SER[r.pk].a, 1) + ' °C, ' + r.n + '개월)' })),
    [{ id: 'el', label: '엘니뇨' }, { id: 'la', label: '라니냐' }, { id: 'no', label: '해당 없음' }], Object.fromEntries(RUNS.map((r) => [r.id, r.kind])));
  const stpS = [0, 1, 2].map((i) => makeStepper($('#stpS' + i), { min: -5, max: 12, step: 0.5, value: 0, dec: 1, unit: 'hPa' }));
  const ordFb = makeOrder($('#ordFb'), [
    { id: 'c', label: '동·서 기압 차이가 줄어들어요' }, { id: 'a', label: '무역풍이 약해져요' }, { id: 'd', label: '무역풍이 더 약해져요' }, { id: 'b', label: '동태평양 수온이 올라요' }], ['a', 'b', 'c', 'd']);
  const IMP = [{ id: 'pe', label: '페루 연안 (동태평양)' }, { id: 'in', label: '인도네시아·호주 동부 (서태평양)' }, { id: 'kr', label: '우리나라의 겨울' }];
  const clsImp = makeClassify($('#clsImp'), IMP, [{ id: 'rain', label: '많은 비·홍수' }, { id: 'dry', label: '가뭄·산불' }, { id: 'warm', label: '기온이 높은 경향' }], { pe: 'rain', in: 'dry', kr: 'warm' });

  /* ======================================================
     모형 변수 (부드러운 값) · 시간 진행
     ====================================================== */
  const mv = () => ({
    pct: Math.round(windPct(S.pW)), sstW: A('sstW', S.pS), sstE: A('sstE', S.pS), thW: A('thW', S.pT), thE: A('thE', S.pT), slope: A('slope', S.pT),
    upw: A('upw', S.pR), rainX: A('rainX', S.pR), walk: A('walk', S.pR), walkW: Math.max(0, S.pR) * 0.7 * (S.pR > 0.5 ? 1 : 0.5), tah: A('tah', S.pW), dar: A('dar', S.pW),
  });
  const n34 = (m) => m.sstE - N34_BASE;
  function setTargets(a) { S.tgt = a; }
  function stageTargets(st, sign) { const m = STAGE_MULT[st]; setTargets(m.map((v) => v * sign)); }
  function applyStage(st, snap) {
    S.stage = st; stageTargets(st, S.sign); S.maxStage = Math.max(S.maxStage, st);
    $('#oPh').textContent = (S.sign > 0 ? NAME_EL : NAME_LA)[st]; setSlider($('#sPh'), null, st);
    if (snap) { S.pW = S.tgt[0]; S.pS = S.tgt[1]; S.pT = S.tgt[2]; S.pR = S.tgt[3]; }
  }
  function applyPct(pct, snap) {
    S.pct = pct; const p = pOfPct(pct); setTargets([p, p, p, p]);
    if (pct >= 130) S.seenStrong = true;
    setSlider($('#sTr'), $('#oTr'), pct, (v) => v + ' %');
    if (snap) { S.pW = S.pS = S.pT = S.pR = p; }
  }
  function stepModel(dt) {
    S.pW = approach(S.pW, S.tgt[0], dt, 2.6); S.pS = approach(S.pS, S.tgt[1], dt, 2.6); S.pT = approach(S.pT, S.tgt[2], dt, 2.6); S.pR = approach(S.pR, S.tgt[3], dt, 2.6);
    const m = mv(); S.sw.target = m.tah; S.dw.target = m.dar; S.sw.update(dt); S.dw.update(dt);
    if (S.playing) { S.playT += dt; if (S.playT >= 1.7) { S.playT = 0; if (S.stage < 4) applyStage(S.stage + 1); else S.playing = false; } }
  }
  /* 용승 · 침강 (해안) */
  const Utgt = () => (S.dir === 'N' ? S.ws : S.dir === 'S' ? -S.ws : 0);
  function stepCoast(dt) {
    S.Us = approach(S.Us, Utgt(), dt, 2.2);
    const u = S.Us;
    if (!RM) {
      const R = MR, seaY = R.y + R.h * 0.30, dpx = (R.h * 0.62) / 300;
      if (u > 0.2) { S.nAcc = (S.nAcc || 0) + dt * u * 7; while (S.nAcc >= 1) { S.nAcc -= 1; parts.emit({ x: R.x + R.w * rnd(0.66, 0.80), y: seaY + 250 * dpx, vx: rnd(-6, 6), vy: -rnd(38, 52) * (0.6 + u * 0.25), life: (250 * dpx - 8) / (45 * (0.6 + u * 0.25)), size: 2.6, color: '#d9a400', shape: 'square', fade: false }); } }
      if (u < -0.2) { S.oAcc = (S.oAcc || 0) + dt * -u * 5; while (S.oAcc >= 1) { S.oAcc -= 1; parts.emit({ x: R.x + R.w * rnd(0.70, 0.80), y: seaY + 6, vx: rnd(-4, 4), vy: rnd(26, 36), life: rnd(2.4, 3.2), size: 3.2, color: '#7dd3fc', shape: 'bubble' }); } }
    }
  }
  const coastVals = (u) => {
    const sst = u >= 0 ? 24 - 1.5 * u : 24 - 0.5 * u;
    const nut = Math.max(5, 20 + 25 * u);
    return { sst, nut, chl: nut * 0.8, o2: Math.max(0, -u) / 3 * 100 };
  };

  /* ======================================================
     그리기: 해안 용승 · 침강
     ====================================================== */
  function drawCoast(t) {
    const R = MR, u = S.Us, seaY = R.y + R.h * 0.30, dpx = (R.h * 0.62) / 300, xC = R.x + R.w * 0.82, xR = R.x + R.w;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const sk = ctx.createLinearGradient(0, R.y, 0, seaY); sk.addColorStop(0, '#9cc4e4'); sk.addColorStop(1, '#e2effa'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, seaY - R.y);
    // 바다: 줄무늬로 색을 칠해요 (따뜻한 표층 + 찬 심층)
    const g0 = (xf) => smooth((xf - 0.55) / 0.27);
    for (let x = R.x; x < xC; x += 4) {
      const xf = (x - R.x) / R.w, g = g0(xf), dw = clamp((40 + 90 * g * Math.max(0, -u) / 3 - 26 * g * Math.max(0, u) / 3) * dpx, 5, 400);
      const warm = sstColor(24 + (coastVals(u).sst - 24) * g + 1.5);
      const deep = ctx.createLinearGradient(0, seaY + dw, 0, R.y + R.h); deep.addColorStop(0, '#1f5aa8'); deep.addColorStop(1, '#0c2c5c');
      ctx.fillStyle = warm; ctx.fillRect(x, seaY, 4.5, dw);
      ctx.fillStyle = deep; ctx.fillRect(x, seaY + dw, 4.5, R.y + R.h - seaY - dw);
    }
    // 바닥과 육지
    ctx.fillStyle = '#7a5c3a'; ctx.beginPath(); ctx.moveTo(R.x + R.w * 0.5, R.y + R.h); ctx.lineTo(R.x + R.w * 0.6, seaY + 230 * dpx); ctx.lineTo(xC - 30 * U, seaY + 48 * dpx); ctx.lineTo(xC, seaY + 30 * dpx); ctx.lineTo(xC, R.y + R.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8c79b'; ctx.fillRect(xC, seaY - 16 * U, xR - xC, R.y + R.h - seaY + 16 * U); ctx.fillStyle = '#8fa774'; ctx.fillRect(xC, seaY - 16 * U, xR - xC, 6);
    D.text((xC + xR) / 2, seaY + 40 * FS, '남아메리카', { size: 13.5, weight: 800, color: '#3c4a2a' });
    D.text((xC + xR) / 2, seaY + 58 * FS, '(페루 연안)', { size: 12.5, weight: 700, color: '#3c4a2a' });
    D.text(R.x + 12, seaY - 8, '← 서쪽 (먼바다)', { size: 12.5, weight: 800, color: '#365673', align: 'left' });
    // 깊이 눈금
    [0, 100, 200, 300].forEach((d) => { D.text(R.x + 8, seaY + d * dpx + (d ? 4 : 14), d + ' m', { size: 12, weight: 700, color: 'rgba(255,255,255,.85)', align: 'left' }); });
    // 바람 기호: ⊗ 화면 안쪽(북쪽), ⊙ 화면 바깥(남쪽)
    const wx = R.x + R.w * 0.22, wy = R.y + R.h * 0.12, n = S.dir === '0' ? 0 : S.ws;
    for (let i = 0; i < n; i++) {
      const cx = wx + i * 46 * U, cy = wy, r = 15 * U;
      ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
      if (S.dir === 'N') { ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy + r * 0.6); ctx.moveTo(cx + r * 0.6, cy - r * 0.6); ctx.lineTo(cx - r * 0.6, cy + r * 0.6); ctx.stroke(); }
      else { ctx.fillStyle = '#1e3a5f'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, TAU); ctx.fill(); }
    }
    lbl(wx + Math.max(0, n - 1) * 23 * U, wy + 34 * U, S.dir === 'N' ? '바람: 북쪽으로 (화면 안쪽) 세기 ' + S.ws : S.dir === 'S' ? '바람: 남쪽으로 (화면 바깥) 세기 ' + S.ws : '바람 없음', { bg: '#1e3a5f', size: 13 });
    // 표층수 이동 화살표
    if (Math.abs(u) > 0.15) {
      const L = Math.abs(u) / 3 * 120 * U + 20, dirx = u > 0 ? -1 : 1, y = seaY + 14 * U;
      [0.52, 0.66].forEach((f) => { const x = R.x + R.w * f + (u > 0 ? 40 * U : 0); D.arrow(x - dirx * L / 2, y, x + dirx * L / 2, y, { color: '#ffffff', width: 4, head: 12, alpha: 0.95 }); });
      lbl(R.x + R.w * 0.58, seaY - 22 * U, u > 0 ? '표층수가 바다 쪽(서쪽)으로 밀려가요' : '표층수가 해안 쪽(동쪽)으로 밀려와요', { bg: 'rgba(15,40,80,.8)', size: 12.5 });
    }
    // 용승 / 침강 화살표
    const ax = [R.x + R.w * 0.72, R.x + R.w * 0.78];
    if (u > 0.15) ax.forEach((x) => D.arrow(x, seaY + 250 * dpx, x, seaY + 18 * U, { color: '#fde68a', width: 3 + u * 2.2, head: 14, alpha: 0.95 }));
    if (u < -0.15) ax.forEach((x) => D.arrow(x, seaY + 14 * U, x, seaY + (70 + 80 * Math.min(1, -u / 3)) * dpx, { color: '#bfdbfe', width: 3 + (-u) * 2.2, head: 14, alpha: 0.95 }));
    if (u > 0.5) lbl(R.x + R.w * 0.75, seaY + 130 * dpx, '용승: 찬 심층수가 올라와요', { bg: '#b45309', size: 12.5 });
    if (u < -0.5) lbl(R.x + R.w * 0.75, seaY + 130 * dpx, '침강: 표층수가 내려가요', { bg: '#1d4ed8', size: 12.5 });
    // 식물 플랑크톤과 물고기
    const cv = coastVals(u), np = Math.round(cv.chl / 4);
    for (let i = 0; i < np; i++) { const f = (i * 0.618) % 1, x = R.x + R.w * (0.62 + 0.19 * f) + Math.sin(t * 0.8 + i * 2.1) * 4, y = seaY + (6 + ((i * 37) % 22)) * U; D.sphere(x, y, 2.6 * U, '#4ade80', { gloss: false }); }
    const nf = Math.floor(cv.chl / 25);
    for (let i = 0; i < nf; i++) { const x = R.x + R.w * (0.62 + 0.04 * i) + Math.sin(t * 0.9 + i) * 8, y = seaY + (44 + i * 14) * U; ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(x, y, 10 * U, 5 * U, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 9 * U, y); ctx.lineTo(x + 16 * U, y - 5 * U); ctx.lineTo(x + 16 * U, y + 5 * U); ctx.closePath(); ctx.fill(); }
    if (np > 0) D.text(xC - 6, seaY - 8 * U, '식물 플랑크톤', { size: 12.5, weight: 800, color: '#14532d', align: 'right', stroke: '#ffffff', strokeWidth: 3 });
    ctx.restore();
  }
  function bar(x, y, w, label, val, max, txt, col) {
    D.text(x, y + 16, label, { size: 14, weight: 800, color: '#334155', align: 'left' });
    const bx = x + 108 * (PHONE ? 1.1 : 1), bw = w - 108 * (PHONE ? 1.1 : 1) - 4;
    ctx.fillStyle = '#eef2f7'; rr(bx, y, bw, 24, 7).fill();
    const ww = clamp(val / max, 0, 1) * bw; if (ww > 0.5) { ctx.fillStyle = col; rr(bx, y, ww, 24, 7).fill(); }
    D.text(bx + Math.min(ww, bw) + (ww > bw * 0.7 ? -6 : 6), y + 17, txt, { size: 13, weight: 800, color: ww > bw * 0.7 ? '#fff' : '#0f172a', align: ww > bw * 0.7 ? 'right' : 'left' });
  }
  function drawCoastPanel(t) {
    const R = LR, wL = PHONE ? R.w : 430, hh = PHONE ? 230 : R.h;
    const Ra = { x: R.x, y: R.y, w: wL, h: hh }, Rb = PHONE ? { x: R.x, y: R.y + hh + 8, w: R.w, h: 216 } : { x: R.x + wL + 10, y: R.y, w: R.w - wL - 10, h: R.h };
    card(Ra, '해안 바다의 변화 (예시 모형)');
    const cv = coastVals(S.Us), x = Ra.x + 14, w = Ra.w - 28, y0 = Ra.y + 40 * FS;
    bar(x, y0, w, '표층 수온', cv.sst - 18, 12, fix(cv.sst, 1) + ' °C', '#f97316');
    bar(x, y0 + 36 * FS, w, '영양염', cv.nut, 100, Math.round(cv.nut) + '', '#a16207');
    bar(x, y0 + 72 * FS, w, '식물 플랑크톤', cv.chl, 100, Math.round(cv.chl) + '', '#16a34a');
    bar(x, y0 + 108 * FS, w, '산소 운반', cv.o2, 100, Math.round(cv.o2) + '', '#2563eb');
    if (!PHONE) D.text(Ra.x + 14, Ra.y + Ra.h - 8, '수온: 18 ~ 30 °C 눈금 · 영양염·플랑크톤·산소 운반: 상대값(0~100)', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    // 적도 용승 · 아열대 침강
    card(Rb, '적도 바다에서도 (남북 단면)');
    const ex = Rb.x + Rb.w / 2, ey = Rb.y + 58 * FS, ew = Rb.w - 40;
    const sy = ey + 24 * FS;
    ctx.fillStyle = '#9ec7ea'; ctx.fillRect(Rb.x + 14, sy, Rb.w - 28, Rb.h - (sy - Rb.y) - 12);
    D.text(Rb.x + 22, sy + 16 * FS, '북위 ~25°', { size: 12, weight: 700, color: '#0c3b66', align: 'left' }); D.text(Rb.x + Rb.w - 22, sy + 16 * FS, '남위 ~25°', { size: 12, weight: 700, color: '#0c3b66', align: 'right' });
    D.text(ex, sy + 16 * FS, '적도', { size: 12, weight: 800, color: '#0c3b66' });
    [-1, 1].forEach((s) => D.arrow(ex + s * 8, sy - 4, ex + s * 80 * U, sy - 4, { color: '#1e3a5f', width: 3, head: 9 }));
    D.arrow(ex, sy + 56 * FS, ex, sy + 24 * FS, { color: '#b45309', width: 4, head: 10 });
    [-1, 1].forEach((s) => D.arrow(ex + s * 100 * U, sy + 26 * FS, ex + s * 100 * U, sy + 58 * FS, { color: '#1d4ed8', width: 4, head: 10 }));
    D.text(ex, ey - 6, '무역풍이 표층수를 적도 양쪽으로 밀어요', { size: 12, weight: 800, color: '#334155' });
    D.text(ex, Rb.y + Rb.h - 18 * FS, '적도: 용승 · 아열대: 침강', { size: 13, weight: 800, color: '#0f172a' });
  }

  /* ======================================================
     그리기: 적도 태평양 동서 단면 (정상 · 엘니뇨 · 라니냐)
     ====================================================== */
  function drawLoop(xa, xb, yb, yt, str, t, col) {
    if (str < 0.05) return;
    const pts = [[xa, yb], [xa, yt], [xb, yt], [xb, yb], [xa, yb]], lens = [], tot = pts.slice(1).reduce((s, p, i) => { const l = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]); lens.push(l); return s + l; }, 0);
    ctx.save(); ctx.strokeStyle = rgba(col, 0.28 * Math.min(1, str)); ctx.lineWidth = 8 * Math.min(1.3, str); ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    const n = Math.max(5, Math.round(tot / 70));
    for (let k = 0; k < n; k++) {
      let d = ((t * 0.12 * str + k / n) % 1) * tot, i = 0; while (d > lens[i] && i < lens.length - 1) { d -= lens[i]; i++; }
      const f = d / lens[i], x = lerp(pts[i][0], pts[i + 1][0], f), y = lerp(pts[i][1], pts[i + 1][1], f);
      D.sphere(x, y, 4.4 * U, col, { gloss: false });
    }
    ctx.restore();
  }
  function cloudPuff(x, y, s, rain, t) {
    const g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, s * 0.1, x, y, s);
    [[0, 0], [-0.7, 0.2], [0.7, 0.2], [-0.35, -0.5], [0.35, -0.55]].forEach((o, i) => { const gg = ctx.createRadialGradient(x + o[0] * s - s * 0.2, y + o[1] * s - s * 0.2, s * 0.1, x + o[0] * s, y + o[1] * s, s * 0.7); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, rain ? '#8e9db0' : '#d2dce8'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x + o[0] * s, y + o[1] * s, s * 0.62, 0, TAU); ctx.fill(); });
    if (rain) { ctx.strokeStyle = '#3a79b8'; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const rx = x + (k - 2.5) * s * 0.28, off = ((t * 90 + k * 17) % 40); ctx.beginPath(); ctx.moveTo(rx, y + s * 0.6 + off); ctx.lineTo(rx - 3, y + s * 0.6 + off + 12); ctx.stroke(); } }
  }
  function drawEquator(t, o) {
    o = o || {};
    const R = MR, m = mv(), xL = R.x + R.w * 0.045, xR = R.x + R.w * 0.955, W = xR - xL;
    const seaY = R.y + R.h * 0.44, mPx = (R.h * 0.44) / 300, slopePx = m.slope * 0.2 * U;
    const ysAt = (xf) => seaY - slopePx * (1 - xf);
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const sk = ctx.createLinearGradient(0, R.y, 0, seaY); sk.addColorStop(0, '#9fc6e6'); sk.addColorStop(1, '#e3effa'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, seaY - R.y);
    // 바다 (줄무늬)
    for (let x = xL; x < xR; x += 4) {
      const xf = (x - xL) / W, ys = ysAt(xf), th = seaY + depAt(xf, S.pT) * mPx;
      ctx.fillStyle = sstColor(sstAt(0, xf, S.pS)); ctx.fillRect(x, ys, 4.5, th - ys);
      const dg = ctx.createLinearGradient(0, th, 0, R.y + R.h - 26 * FS); dg.addColorStop(0, '#2b6cb5'); dg.addColorStop(1, '#0d2f5e'); ctx.fillStyle = dg; ctx.fillRect(x, th, 4.5, R.y + R.h - 26 * FS - th);
    }
    // 수온 약층 곡선
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]); ctx.beginPath();
    for (let x = xL; x <= xR; x += 6) { const xf = (x - xL) / W, y = seaY + depAt(xf, S.pT) * mPx; x === xL ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    // 육지
    ctx.fillStyle = '#9cb582'; ctx.fillRect(R.x, seaY - 12 * U, xL - R.x, R.h); ctx.fillRect(xR, seaY - 12 * U, R.x + R.w - xR, R.h);
    ctx.fillStyle = '#6b4f30'; ctx.fillRect(R.x, R.y + R.h - 26 * FS, R.w, 26 * FS);
    D.text(R.x + 4, seaY + 16 * FS, '인도네시아', { size: 11.5, weight: 800, color: '#2f4a1f', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); D.text(xR + (R.x + R.w - xR) / 2, seaY + 16 * FS, '페루', { size: 12.5, weight: 800, color: '#2f4a1f' });
    D.text(R.x + 10, R.y + R.h - 9, PHONE ? '서 ' + fix(m.sstW, 1) + ' °C · 약층 ' + Math.round(m.thW) + ' m' : '서태평양 · 표층 ' + fix(m.sstW, 1) + ' °C · 약층 ' + Math.round(m.thW) + ' m', { size: 12.5, weight: 800, color: '#ffffff', align: 'left' });
    D.text(R.x + R.w - 10, R.y + R.h - 9, PHONE ? '동 ' + fix(m.sstE, 1) + ' °C · 약층 ' + Math.round(m.thE) + ' m' : '동태평양 · 표층 ' + fix(m.sstE, 1) + ' °C · 약층 ' + Math.round(m.thE) + ' m', { size: 12.5, weight: 800, color: '#ffffff', align: 'right' });
    D.text((xL + xR) / 2, seaY + 250 * mPx, '수온 약층 (점선): 따뜻한 물 / 찬 물의 경계', { size: 12.5, weight: 800, color: '#ffffff', stroke: 'rgba(10,40,90,.55)', strokeWidth: 3 });
    // 해수면 높이
    D.text(xL + 6, ysAt(0.05) - 8, '해수면 +' + Math.round(m.slope) + ' cm', { size: 12.5, weight: 800, color: '#0c3b66', align: 'left' }); 
    // 용승 화살표 (동쪽)
    if (m.upw > 0.12) { const ux = xL + W * 0.86; D.arrow(ux, seaY + 215 * mPx, ux, seaY + 22 * U, { color: '#fde68a', width: 2 + m.upw * 7, head: 12 + m.upw * 5, alpha: 0.95 }); lbl(ux - 44 * U, seaY + 140 * mPx, '용승 ' + (m.upw >= 0.75 ? '강' : m.upw >= 0.4 ? '보통' : '약'), { bg: '#b45309', size: 12.5 }); }
    // 무역풍 (동 → 서)
    const wlen = clamp((m.pct / 100) * 70 * U, 8, 110 * U);
    for (let i = 0; i < 4; i++) { const x = xL + W * (0.2 + i * 0.2), y = seaY - 18 * U; D.arrow(x + wlen / 2, y, x - wlen / 2, y, { color: '#1d4ed8', width: 3.5, head: 10, alpha: 0.9 }); }
    lbl(xL + W * 0.74, seaY - 44 * U, '무역풍 (동 → 서) ' + m.pct + ' %', { bg: '#1d4ed8', size: 12.5 });
    // 워커 순환
    const yb = seaY - 30 * U, yt = R.y + R.h * 0.12, xr = xL + W * m.rainX, xs = xL + W * 0.9;
    drawLoop(xr, xs, yb, yt, m.walk, t, '#7c3aed');
    if (m.walkW > 0.05) drawLoop(xL + W * 0.1, xr, yb, yt + 16 * U, m.walkW * 1.2, t, '#f59e0b');
    // 비구름과 맑은 곳
    cloudPuff(xr, yt + 12 * U, 28 * U, true, t);
    lbl(xr, yt - 18 * U, '비가 많은 곳 (공기 상승)', { bg: '#475569', size: 12.5 });
    const dryW = smooth((m.rainX - 0.3) / 0.2);
    if (dryW > 0.05) { ctx.save(); ctx.globalAlpha = dryW; D.sphere(xL + W * 0.07, yt + 22 * U, 13 * U, '#fbbf24', { gloss: false }); D.text(xL + W * 0.07, yt + 52 * U, '가뭄 쪽', { size: 12.5, weight: 800, color: '#92400e' }); ctx.restore(); }
    D.sphere(xL + W * 0.93, yt + 20 * U, 11 * U, '#fbbf24', { gloss: false }); D.text(xL + W * 0.93 - 2, yt + 48 * U, '맑고 건조', { size: 12, weight: 800, color: '#92400e' });
    ctx.restore();
    // Niño 3.4 감시 해역 표시
    if (o.nino) { const n = n34(m); lbl(R.x + R.w * 0.5, R.y + R.h * 0.44 + 170 * (R.h * 0.44) / 300, 'Niño 3.4 수온 편차 ' + sgn(n, 1) + ' °C', { bg: n >= 0.5 ? '#dc2626' : n <= -0.5 ? '#2563eb' : '#475569', size: 14 }); }
  }
  /* 기압계 (타히티 · 다윈) */
  function dialNeedle(cx, cy, r, val, label, sub, col) {
    ctx.save();
    const a0 = Math.PI * 0.85, a1 = Math.PI * 2.15, f = clamp((val - 1005) / 13, 0, 1), a = lerp(a0, a1, f);
    ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
    for (let k = 0; k <= 13; k++) { const aa = lerp(a0, a1, k / 13), r1 = r - (k % 5 === 0 ? 10 : 6) * U; ctx.strokeStyle = '#64748b'; ctx.lineWidth = k % 5 === 0 ? 2.4 : 1.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * r1, cy + Math.sin(aa) * r1); ctx.lineTo(cx + Math.cos(aa) * (r - 2), cy + Math.sin(aa) * (r - 2)); ctx.stroke(); }
    [1005, 1010, 1015].forEach((v) => { const aa = lerp(a0, a1, (v - 1005) / 13), rr2 = r - 22 * U; D.text(cx + Math.cos(aa) * rr2, cy + Math.sin(aa) * rr2 + 4, String(v), { size: 11, weight: 700, color: '#475569' }); });
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 14 * U), cy + Math.sin(a) * (r - 14 * U)); ctx.stroke();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill(); ctx.restore();
    D.text(cx, cy + r + 18 * FS, label, { size: 13.5, weight: 800, color: '#334155' });
    D.text(cx, cy + r + 36 * FS, sub, { size: 14, weight: 800, color: col });
  }
  function drawGauges(t) {
    const R = LR; card(R, '기압계: 해면 기압 (예시)');
    const r = PHONE ? 64 : 42, cy = R.y + (PHONE ? 130 : 76) * (PHONE ? 1 : 1);
    const m = mv(), diff = S.sw.value - S.dw.value;
    dialNeedle(R.x + (PHONE ? 110 : 120), cy, r, S.dw.value, '다윈 (서태평양)', fix(S.dw.value, 1) + ' hPa', '#7c3aed');
    dialNeedle(R.x + (PHONE ? 300 : 300), cy, r, S.sw.value, '타히티 (동태평양)', fix(S.sw.value, 1) + ' hPa', '#be185d');
    const bx = R.x + (PHONE ? 440 : 500), bw = PHONE ? 130 : 260;
    D.text(bx + bw / 2, R.y + 40 * FS, '기압 차이', { size: 14, weight: 800, color: '#334155' });
    D.text(bx + bw / 2, R.y + 62 * FS, '타히티 − 다윈', { size: 13, weight: 700, color: '#64748b' });
    D.text(bx + bw / 2, R.y + 106 * FS, sgn(diff, 1) + ' hPa', { size: PHONE ? 22 : 30, weight: 800, color: diff < 1 ? '#dc2626' : '#15803d' });
    D.text(bx + bw / 2, R.y + 132 * FS, diff >= 3 ? '동서 차이가 커요' : '차이가 작아졌어요', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     그리기: 엘니뇨 · 라니냐 (Niño 3.4 그래프)
     ====================================================== */
  function drawSeries(R, title, o) {
    card(R, title);
    const ax = axesBox({ x: R.x, y: R.y + 4, w: R.w, h: R.h - 4 }, { x0: 1995, x1: 2018, y0: o.y0, y1: o.y1, xt: [1995, 2000, 2005, 2010, 2015], yt: o.yt, yf: o.yf, pad: { l: 46, r: 14, t: 30, b: 26 } });
    return ax;
  }
  function drawNinoGraph(t, R, reveal, marks) {
    const ax = drawSeries(R, 'Niño 3.4 수온 편차 (예시 자료, °C)', { y0: -2.5, y1: 3.5, yt: [-2, -1, 0, 1, 2, 3], yf: (v) => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0') });
    const { B, X, Y } = ax;
    ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
    if (reveal) RUNS.forEach((r) => { if (r.kind === 'no') return; ctx.fillStyle = r.sg > 0 ? 'rgba(239,68,68,.18)' : 'rgba(59,130,246,.18)'; ctx.fillRect(X(SER[r.s].y), B.y, X(SER[r.e].y) - X(SER[r.s].y) + 3, B.h); });
    [[0.5, '#dc2626'], [-0.5, '#2563eb']].forEach(([v, c]) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(B.x, Y(v)); ctx.lineTo(B.x + B.w, Y(v)); ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(B.x, Y(0)); ctx.lineTo(B.x + B.w, Y(0)); ctx.stroke();
    ctx.restore();
    polyline(SER.map((d) => [d.y, d.a]), '#0f172a', 2.2, X, Y, B);
    D.text(B.x + B.w - 4, Y(0.5) - 5, '+0.5 °C', { size: 12, weight: 800, color: '#dc2626', align: 'right' });
    D.text(B.x + B.w - 4, Y(-0.5) + 14, '−0.5 °C', { size: 12, weight: 800, color: '#2563eb', align: 'right' });
    RUNS.forEach((r) => { const p = SER[r.pk]; D.label(X(p.y), r.sg > 0 ? Y(p.a) - 14 : Y(p.a) + 16, r.id, { bg: reveal ? (r.kind === 'el' ? '#dc2626' : r.kind === 'la' ? '#2563eb' : '#64748b') : '#334155', size: 12.5, pad: 6 }); });
  }

  /* ======================================================
     그리기: 남방진동 (세 상태 · 그래프 · 되먹임 · 영향 지도)
     ====================================================== */
  function drawStates(t) {
    const R = MR, gap = 10, cw = (R.w - gap * 2) / 3, ch = R.h;
    const ST = [{ name: '정상 상태', p: 0, c: '#475569' }, { name: '엘니뇨', p: 1, c: '#dc2626' }, { name: '라니냐', p: -1, c: '#2563eb' }];
    ST.forEach((s, i) => {
      const x = R.x + i * (cw + gap), Rc = { x, y: R.y, w: cw, h: ch };
      card(Rc, '');
      D.text(x + cw / 2, R.y + 26 * FS, s.name, { size: 16, weight: 800, color: s.c });
      const rr0 = Math.min(cw * 0.32, PHONE ? 44 : 52 * 1), cy = R.y + (PHONE ? 100 : 118);
      const tah = A('tah', s.p), dar = A('dar', s.p);
      dialNeedle(x + cw * 0.27, cy, rr0 * 0.86, dar, '다윈', fix(dar, 1), '#7c3aed');
      dialNeedle(x + cw * 0.73, cy, rr0 * 0.86, tah, '타히티', fix(tah, 1), '#be185d');
      const by = R.y + R.h - 96 * FS;
      D.text(x + cw / 2, by, '타히티 − 다윈', { size: 13.5, weight: 800, color: '#334155' });
      const ok = stpS[i].value === soiOf(s.p), shown = S.sub === 'soi' && S.soiShown;
      D.text(x + cw / 2, by + 32 * FS, '내 계산: ' + sgn(stpS[i].value, 1) + ' hPa', { size: 17, weight: 800, color: ok ? '#15803d' : '#0f172a' });
      D.text(x + cw / 2, by + 56 * FS, ok ? '✅ 맞아요' : '입력해 보세요', { size: 13, weight: 800, color: ok ? '#15803d' : '#64748b' });
    });
  }
  function drawSoiGraph(t, R) {
    card(R, '남방진동 지수(타히티 − 다윈)와 수온 편차 (예시 자료)');
    const gap = 6, hh = (R.h - 36 * FS - gap) / 2;
    const R1 = { x: R.x, y: R.y + 24 * FS, w: R.w, h: hh }, R2 = { x: R.x, y: R.y + 24 * FS + hh + gap, w: R.w, h: hh };
    const a1 = axesBox(R1, { x0: 1995, x1: 2018, y0: -2.5, y1: 3.5, yt: [-2, 0, 2], yf: (v) => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0'), pad: { l: 46, r: 14, t: 8, b: 6 } });
    ctx.save(); ctx.beginPath(); ctx.rect(a1.B.x, a1.B.y, a1.B.w, a1.B.h); ctx.clip();
    RUNS.forEach((r) => { if (r.kind === 'no') return; ctx.fillStyle = r.sg > 0 ? 'rgba(239,68,68,.16)' : 'rgba(59,130,246,.16)'; ctx.fillRect(a1.X(SER[r.s].y), a1.B.y, a1.X(SER[r.e].y) - a1.X(SER[r.s].y) + 3, a1.B.h); }); ctx.restore();
    polyline(SER.map((d) => [d.y, d.a]), '#dc2626', 2.2, a1.X, a1.Y, a1.B);
    D.text(a1.X(2005.6), a1.B.y + 14 * FS, '수온 편차(°C)', { size: 12.5, weight: 800, color: '#dc2626', align: 'left' });
    const a2 = axesBox(R2, { x0: 1995, x1: 2018, y0: -3, y1: 11, xt: [1995, 2000, 2005, 2010, 2015], yt: [0, 4, 8], yf: (v) => (v > 0 ? '+' + v : String(v)), pad: { l: 46, r: 14, t: 6, b: 24 } });
    ctx.save(); ctx.beginPath(); ctx.rect(a2.B.x, a2.B.y, a2.B.w, a2.B.h); ctx.clip();
    RUNS.forEach((r) => { if (r.kind === 'no') return; ctx.fillStyle = r.sg > 0 ? 'rgba(239,68,68,.16)' : 'rgba(59,130,246,.16)'; ctx.fillRect(a2.X(SER[r.s].y), a2.B.y, a2.X(SER[r.e].y) - a2.X(SER[r.s].y) + 3, a2.B.h); });
    const bw = Math.max(1, a2.B.w / SER.length);
    SER.forEach((d) => { const v = soiSer(d.a), x = a2.X(d.y), y0 = a2.Y(4.0), y1 = a2.Y(v); ctx.fillStyle = v >= 4 ? '#0284c7' : '#7c3aed'; ctx.fillRect(x - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0)); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(a2.B.x, a2.Y(4)); ctx.lineTo(a2.B.x + a2.B.w, a2.Y(4)); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    D.text(a2.X(2005.2), a2.B.y + 14 * FS, '기압 차이(hPa), 점선 = 정상 +4.0', { size: 12.5, weight: 800, color: '#5b21b6', align: 'left' });
  }
  const FBN = { a: [0.22, 0.30], b: [0.74, 0.30], c: [0.74, 0.74], d: [0.22, 0.74] };
  const FBL = { a: '무역풍 약화', b: '동태평양 수온 상승', c: '동서 기압 차이 감소', d: '무역풍이 더 약해짐' };
  function drawFeedback(t, R) {
    card(R, '');
    D.text(R.x + R.w / 2, R.y + 24 * FS, '엘니뇨가 스스로 커지는 고리 (양의 되먹임)', { size: 15, weight: 800, color: '#334155' });
    const cx = (id) => R.x + R.w * FBN[id][0], cy = (id) => R.y + 36 * FS + (R.h - 50 * FS) * (FBN[id][1] - 0.2) / 0.64 + 20 * FS;
    const seq = ordFb.seq;
    for (let i = 0; i + 1 < seq.length + (seq.length === 4 ? 1 : 0); i++) {
      const a = seq[i], b = seq[(i + 1) % 4], good = ordFb.answerIds.indexOf(b) === (ordFb.answerIds.indexOf(a) + 1) % 4;
      const x1 = cx(a), y1 = cy(a), x2 = cx(b), y2 = cy(b), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      D.arrow(x1 + ux * 64 * U, y1 + uy * 28 * U * (Math.abs(uy) > 0.5 ? 1.2 : 0.3), x2 - ux * 64 * U, y2 - uy * 28 * U * (Math.abs(uy) > 0.5 ? 1.2 : 0.3), { color: good ? '#16a34a' : '#dc2626', width: 4, head: 13 });
    }
    ['a', 'b', 'c', 'd'].forEach((id) => {
      const x = cx(id), y = cy(id), i = seq.indexOf(id), w = 126 * U * (PHONE ? 1.0 : 1), h = 44 * FS * (PHONE ? 0.9 : 1);
      D.shadow(() => { ctx.fillStyle = i >= 0 ? '#fff7ed' : '#ffffff'; rr(x - w / 2, y - h / 2, w, h, 10).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = i >= 0 ? '#ea580c' : '#cbd5e1'; ctx.lineWidth = 2.2; rr(x - w / 2, y - h / 2, w, h, 10).stroke();
      drawWrap(x, y - (wrapLines(FBL[id], w - 14, 12.5, 800).length - 1) * 8 * FS + 4, FBL[id], w - 14, 12.5, { weight: 800, color: '#1e293b', lh: 1.2 });
      if (i >= 0) D.sphere(x - w / 2 + 6, y - h / 2 + 6, 10, '#ea580c', { text: String(i + 1), gloss: false });
    });
  }
  function drawImpactMap(t, R) {
    card(R, '');
    D.text(R.x + R.w / 2, R.y + 24 * FS, '엘니뇨가 나타났을 때 영향 (경향) — 예시 지도', { size: 15, weight: 800, color: '#334155' });
    const mx = R.x + 12, my = R.y + 36 * FS, mw = R.w - 24, mh = R.h - 36 * FS - 12;
    ctx.save(); rr(mx, my, mw, mh, 10).clip(); ctx.fillStyle = '#b9dcf2'; ctx.fillRect(mx, my, mw, mh);
    const land = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(mx + mw * p[0], my + mh * p[1]) : ctx.moveTo(mx + mw * p[0], my + mh * p[1]))); ctx.closePath(); ctx.fill(); };
    land([[0, 0.05], [0.14, 0.02], [0.2, 0.25], [0.12, 0.45], [0, 0.4]], '#a9c58f');                  // 동아시아
    land([[0.02, 0.58], [0.2, 0.5], [0.3, 0.62], [0.24, 0.9], [0.05, 0.92]], '#bfc98f');                 // 인도네시아·호주
    land([[0.9, 0.3], [1, 0.25], [1, 0.95], [0.9, 0.9], [0.86, 0.6]], '#a9c58f');                         // 남아메리카
    D.text(mx + mw * 0.07, my + mh * 0.40, '동아시아', { size: 12, weight: 800, color: '#3a5a22' }); D.text(mx + mw * 0.15, my + mh * 0.95, '인도네시아·호주', { size: 12, weight: 800, color: '#5a5a22' });
    D.text(mx + mw * 0.94, my + mh * 0.85, '남미', { size: 12, weight: 800, color: '#3a5a22' });
    ctx.restore();
    const pts = [['pe', 0.86, 0.5, '페루 연안'], ['in', 0.2, 0.7, '인도네시아·호주 동부'], ['kr', 0.12, 0.2, '우리나라']];
    pts.forEach(([id, fx, fy, name]) => { const x = mx + mw * fx, y = my + mh * fy, sel = clsImp.sel[id]; D.sphere(x, y, 11 * U, sel === 'rain' ? '#2563eb' : sel === 'dry' ? '#d97706' : sel === 'warm' ? '#dc2626' : '#64748b', { gloss: false, outline: '#fff', outlineWidth: 2 }); D.label(x, y - 24 * U, name, { bg: '#334155', size: 12, pad: 6 }); if (clsImp.sel[id]) D.text(x, y + 28 * U, { rain: '많은 비', dry: '가뭄', warm: '기온 높음' }[sel], { size: 12.5, weight: 800, color: '#0f172a', stroke: '#ffffff' }); });
    const cx = mx + mw * 0.5, cy2 = my + mh * 0.34;
    D.arrow(mx + mw * 0.38, cy2 + 6 * U, mx + mw * 0.72, cy2 + 6 * U, { color: '#dc2626', width: 4, head: 12 });
    D.text(mx + mw * 0.55, cy2 - 8 * U, '난수와 비구름이 동쪽으로', { size: 12.5, weight: 800, color: '#7f1d1d' });
  }

  /* ======================================================
     조작 · 화면 전환
     ====================================================== */
  let game = null;
  const MODE_LABEL = { coast: '🌊 용승과 침강', normal: '🌐 적도 태평양의 정상 상태', enso: '🌡️ 엘니뇨와 라니냐', soi: '📈 남방진동' };
  const MODE_LV = { coast: 0, normal: 1, enso: 2, soi: 3 };
  let ctlKeys = [];
  const FREE_KEYS = { coast: ['wind1'], normal: ['trade'], enso: ['phase'], soi: [] };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const keys = game && game.free ? FREE_KEYS[S.mode] : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    const seg = $('#modeSeg'), free = !!(game && game.free);
    seg.hidden = !free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#wdBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.d === S.dir));
    $$('#enBtns .opt').forEach((b) => b.classList.toggle('on', +b.dataset.s === S.sign));
    $('#oWd').textContent = S.dir === 'N' ? '북쪽으로 · 세기 ' + S.ws : S.dir === 'S' ? '남쪽으로 · 세기 ' + S.ws : '바람 없음';
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  function enterMode(m) {
    setMode(m);
    if (m === 'coast') { S.dir = 'N'; S.ws = 2; setSlider($('#sWs'), null, 2); }
    else if (m === 'normal') applyPct(100, true);
    else if (m === 'enso') { S.sign = 1; applyStage(0, true); S.playing = false; }
    else { S.pW = S.pS = S.pT = S.pR = 0; setTargets([0, 0, 0, 0]); }
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterMode(b.dataset.mode); ctlKeys = FREE_KEYS[b.dataset.mode]; updateCtl(); }));
  $$('#wdBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.dir = b.dataset.d; updateCtl(); }));
  SciSim.bindRange($('#sWs'), null, null, (v) => { S.ws = v; updateCtl(); });
  SciSim.bindRange($('#sTr'), $('#oTr'), (v) => v + ' %', (v) => applyPct(v, false));
  SciSim.bindRange($('#sPh'), null, null, (v) => { S.playing = false; applyStage(v); Sound.tick(); });
  $$('#enBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sign = +b.dataset.s; S.playing = false; applyStage(S.stage); updateCtl(); }));
  $('#bPlay').addEventListener('click', () => { Sound.click(); applyStage(0, false); S.playing = true; S.playT = 1.0; });
  $('#bOrdEn').addEventListener('click', () => { Sound.click(); ordEn.reset(); });

  function resetStep(li) {
    hideHint(); parts.clear(); S.playing = false; S.reveal = false;
    ordEn.reset(); clsUp.reset(); clsSpan.reset(); ordFb.reset(); clsImp.reset(); stpS.forEach((s) => s.reset());
    if (li === 0) { enterMode('coast'); S.Us = 0; S.dir = 'N'; S.ws = 1; setSlider($('#sWs'), null, 1); setCtl(['wind1']); showHint('바람의 방향과 세기를 바꿔서 바다 속 변화를 봐요', 5000); }
    else if (li === 1) { enterMode('normal'); S.seenStrong = false; applyPct(100, true); setCtl(['trade']); showHint('무역풍 세기 슬라이더를 움직여 봐요', 5000); }
    else if (li === 2) { enterMode('enso'); S.maxStage = 0; applyStage(0, true); setCtl(['phase']); showHint('진행 과정 슬라이더를 ①에서 ④로 옮기거나 ▶를 눌러 봐요', 5000); }
    else { enterMode('soi'); S.sub = 'soi'; setCtl(['soi']); showHint('세 상태의 기압을 읽고 차이를 계산해요', 5000); }
    updateCtl();
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const SOI = { n: soiOf(0), e: soiOf(1), l: soiOf(-1) };
  const levels = [
    {
      title: '용승과 침강: 바람이 바다를 움직여요', short: '용승·침강', icon: '🌊', phase: '모형', features: ['coast'],
      intro: '<p class="si-q">❓ 탐구 질문: 적도 태평양의 바람과 바닷물은 서로 어떻게 영향을 주고받고, 몇 년마다 왜 이상 기후가 나타날까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 엘니뇨가 무역풍이 약해져 따뜻한 해수가 동쪽으로 이동하는 현상이라고 정성적으로 배웠어요. 이번에는 그 바탕이 되는 <b>바람과 바다의 상호작용</b>부터 자세히 살펴봐요.</div>' +
        '<p>바람이 한 방향으로 계속 불면 표층 해수가 이동해요. (표층 해수는 바람 방향의 한쪽 옆으로 움직인다는 것은 <b>관측 사실</b>로 받아들여요.) 표층수가 멀어지면 그 빈자리를 채우려 찬 심층수가 올라오는 <b>용승</b>이, 표층수가 모이는 곳에서는 아래로 내려가는 <b>침강</b>이 일어나요.</p>',
      setup() { resetStep(0); },
      recap: '바람이 표층수를 해안에서 멀리 밀면 용승(찬 물·영양염 풍부 → 좋은 어장), 표층수가 해안에 모이면 침강(산소를 심층으로 운반)이 일어나요.',
      summary: '<ul><li><b>용승</b>: 표층수가 바람으로 멀어지면 찬 심층수(영양염 풍부)가 올라와요 → 식물 플랑크톤 증가 → <b>좋은 어장</b>(페루 연안, 적도 동태평양).</li><li><b>침강</b>: 표층수가 모이는 곳에서 아래로 내려가며 <b>산소를 심층으로 운반</b>해요.</li><li>남반구 페루 연안에서 해안을 따라 북쪽으로 바람이 불면 표층수가 바다 쪽(서쪽)으로 이동 → 용승.</li><li>적도에서는 무역풍이 표층수를 양쪽으로 밀어 <b>용승</b>, 아열대 해역에서는 표층수가 모여 <b>침강</b>이 일어나요.</li></ul>',
      missions: [
        {
          title: '바람을 바꿔 용승 만들기',
          goal: '해안을 따라 부는 바람의 방향과 세기를 바꿔서 <b>용승</b>이 <b>세기 2 이상</b>으로 일어나게 해요.',
          hint: '남아메리카 서쪽 해안에서는 <b>북쪽으로 부는 바람(⊗)</b>이 표층수를 바다 쪽으로 밀어 내요. 세기 슬라이더를 2 이상으로 올려요.',
          setup() { S.dir = '0'; S.ws = 1; setSlider($('#sWs'), null, 1); setCtl(['wind1']); },
          check: () => S.dir === 'N' && S.ws >= 2 && Math.abs(S.Us - S.ws) < 0.15, hold: 0.8,
          status: () => mark(S.dir === 'N') + ' 바람 ' + (S.dir === 'N' ? '북쪽으로' : S.dir === 'S' ? '남쪽으로' : '없음') + ' · ' + mark(S.dir === 'N' && S.ws >= 2) + ' 세기 ' + S.ws + ' (2 이상)',
          explain: '바람이 북쪽으로 불면 표층수가 바다 쪽(서쪽)으로 밀려가요. 그 빈자리를 채우려 <b>찬 심층수가 올라오고</b>(용승), 영양염이 늘어 식물 플랑크톤과 물고기가 많아져요. 반대로 남쪽으로 불면 표층수가 해안에 모여 <b>침강</b>이 일어나요.',
        },
        {
          title: '용승과 침강의 특징 분류하기', manual: true,
          goal: '용승과 침강의 특징 카드 6장을 알맞은 쪽으로 분류해요. (바람 방향을 바꾸면서 확인해 보세요.)',
          hint: '찬 물·영양염·좋은 어장은 용승, 산소 운반·표층수가 모이는 곳·따뜻한 물이 내려가는 것은 침강이에요.',
          setup() { clsUp.reset(); setCtl(['wind1', 'cls1']); },
          status: () => mark(clsUp.complete()) + ' 분류한 카드 ' + clsUp.count() + ' / 6 · ' + mark(clsUp.ok()) + ' 모두 맞음',
          check() {
            if (!clsUp.complete()) return '카드 6장을 모두 분류해 주세요. (지금 ' + clsUp.count() + '장)';
            const w = clsUp.wrong(); clsUp.mark(w);
            if (w.length) return '빨간 칸 ' + w.length + '개를 다시 생각해 보세요. 찬 물과 영양염은 어느 쪽 특징일까요?';
            return true;
          },
          explain: '<b>용승</b>: 수온이 낮은 심층수 상승, 영양염 풍부 → 식물 플랑크톤 증가 → 좋은 어장. <b>침강</b>: 표층수가 모이는 곳에서 따뜻한 표층수가 내려가고 표층의 산소를 심층으로 운반해요.',
        },
        {
          type: 'quiz', title: '용승 해역이 좋은 어장인 까닭',
          goal: '페루 연안처럼 용승이 일어나는 바다에 물고기가 많은 까닭은?',
          setup() { setCtl(['wind1']); },
          choices: ['바닷물이 따뜻해서 물고기가 많이 모이기 때문이에요', '표층수가 많아서 물고기가 숨을 곳이 많기 때문이에요', '올라온 찬 심층수에 영양염이 풍부해 식물 플랑크톤이 늘고, 이를 먹는 먹이 사슬이 풍부해지기 때문이에요', '용승은 물고기를 직접 위로 밀어 올리기 때문이에요'],
          answer: 2,
          feedback: ['용승 해역은 오히려 주변보다 수온이 낮아요.', '표층수의 양보다 먹이가 되는 식물 플랑크톤이 중요해요.', '', '용승은 영양염을 올려 보내는 거예요. 물고기가 많은 까닭은 먹이가 늘어서예요.'],
          explain: '심층수에는 죽은 생물이 분해되어 생긴 <b>영양염</b>이 많아요. 용승으로 영양염이 햇빛이 닿는 표층에 오면 식물 플랑크톤이 늘고, 먹이 사슬을 따라 물고기도 많아져 좋은 어장이 돼요.',
        },
      ],
    },
    {
      title: '정상 상태: 무역풍과 워커 순환', short: '정상 상태', icon: '🌐', phase: '관찰', features: ['normal'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바람이 표층수를 움직여 용승과 침강을 만든다는 것을 확인했어요. 적도 태평양에서는 동쪽에서 서쪽으로 부는 <b>무역풍</b>이 그 역할을 해요.</div>' +
        '<p>평상시(정상 상태)에는 무역풍이 따뜻한 표층수를 서쪽으로 모아 서태평양의 <b>수온 약층</b>이 깊고(약 ' + TA.thW[1] + ' m) 해수면이 동쪽보다 약 ' + TA.slope[1] + ' cm 높아요. 동태평양은 찬 물이 올라와(용승) 수온 약층이 얕아요(약 ' + TA.thE[1] + ' m). 대기에서는 서쪽에서 공기가 올라가 비가 많고 동쪽에서는 내려가 건조한 <b>워커 순환</b>이 생겨요. 서태평양 다윈은 저기압, 동태평양 타히티는 고기압이에요. (예시 값)</p>',
      setup() { resetStep(1); },
      recap: '정상 상태에서는 무역풍이 난수를 서쪽에 모아 서쪽 수온 약층이 깊고 비가 많으며, 동쪽은 용승으로 차갑고 건조해요(워커 순환, 타히티 고기압·다윈 저기압).',
      summary: '<ul><li>정상 상태: 무역풍(동 → 서) → 서태평양에 따뜻한 해수 축적. 표층 수온 서 ' + TA.sstW[1] + ' °C · 동 ' + TA.sstE[1] + ' °C, 수온 약층 깊이 서 약 ' + TA.thW[1] + ' m · 동 약 ' + TA.thE[1] + ' m, 서쪽 해수면이 약 ' + TA.slope[1] + ' cm 높아요.</li><li><b>워커 순환</b>: 서태평양에서 공기 상승(강수 많음), 동태평양에서 하강(건조), 지표에서는 무역풍.</li><li>해면 기압: 동태평양(타히티) 고기압 &gt; 서태평양(다윈) 저기압. 남방진동지수(SOI)의 개념 = 타히티 − 다윈. 예시: 정상 ' + TA.tah[1] + ' − ' + TA.dar[1] + ' = +' + fix(SOI.n, 1) + ' hPa.</li><li>무역풍이 강해지면 서쪽 난수 축적이 더 커지고 약층이 더 깊어져요.</li></ul>',
      missions: [
        {
          title: '무역풍을 강하게 해 보기',
          goal: '무역풍을 평소의 <b>130 % 이상</b>으로 세게 하고, 서쪽 수온 약층 깊이가 <b>170 m 이상</b>으로 깊어지는 것을 확인해요.',
          hint: '무역풍 세기 슬라이더를 오른쪽(130 이상)으로 옮기고 잠시 기다려요. 서쪽 약층 깊이가 150 m에서 늘어나요.',
          setup() { applyPct(100, true); S.seenStrong = false; setCtl(['trade']); },
          check: () => S.pct >= 130 && A('thW', pOfPct(S.pct)) >= 170 && Math.abs(mv().thW - A('thW', pOfPct(S.pct))) < 1, hold: 0.8,
          status: () => mark(S.pct >= 130) + ' 무역풍 ' + S.pct + ' % (130 이상) · ' + mark(mv().thW >= 170 - 1) + ' 서쪽 약층 ' + Math.round(mv().thW) + ' m (170 이상)',
          explain: '무역풍이 강해지면 따뜻한 표층수가 더 많이 서쪽으로 모여 서쪽 해수면이 더 높아지고 <b>서쪽 수온 약층이 더 깊어져요</b>(약 ' + TA.thW[1] + ' m → ' + Math.round(A('thW', pOfPct(130))) + ' m). 동쪽은 더 많은 찬 물이 올라와 약층이 얕아져요.',
        },
        {
          type: 'quiz', title: '동서 바다와 날씨의 차이',
          goal: '정상 상태에서 동태평양이 서태평양보다 차갑고, 서태평양에는 비가 많은 까닭으로 알맞은 것은?',
          setup() { applyPct(100, true); setCtl(['trade']); },
          choices: ['동태평양은 햇빛을 덜 받고, 서태평양은 더 받기 때문이에요', '무역풍이 따뜻한 표층수를 서쪽으로 모으고 동쪽에서는 찬 물이 올라오며, 따뜻한 서쪽 바다 위에서는 공기가 상승해 비구름이 생기기 때문이에요', '동태평양은 바다가 더 깊어서 차갑고, 서태평양은 육지가 많아 비가 와요', '서태평양에서는 무역풍이 서쪽에서 불어와서 비를 몰고 와요'],
          answer: 1,
          feedback: ['두 해역이 받는 햇빛의 양은 거의 같아요. 바람이 만든 해수 분포가 원인이에요.', '', '동태평양에서도 비가 오지 않는 이유는 바다 깊이가 아니라 용승과 하강 기류 때문이에요.', '무역풍은 동쪽에서 서쪽으로 불어요. 서쪽에 따뜻한 물이 모이게 하는 바람이에요.'],
          explain: '무역풍 → 따뜻한 난수가 서쪽에 모임·동쪽은 용승으로 차가움 → 서쪽에서 공기가 상승(비구름, 많은 비) → 동쪽에서 하강(건조): 이것이 <b>워커 순환</b>이에요. 대기와 바다가 서로 영향을 주고받고 있어요.',
        },
      ],
    },
    {
      title: '엘니뇨와 라니냐: 무역풍의 변화', short: '엘니뇨·라니냐', icon: '🌡️', phase: '예측', features: ['enso'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 무역풍이 약해지거나 강해지면 수온 약층·해수면·워커 순환이 함께 달라진다는 것을 봤어요. 이 변화가 몇 년마다 한 번 크게 나타나는 것이 <b>엘니뇨와 라니냐</b>예요.</div>' +
        '<p><b>엘니뇨</b>는 무역풍이 약해져 서쪽의 따뜻한 해수가 동쪽으로 퍼지고 동태평양의 수온이 평소보다 높아지는 현상이에요. 기준은 감시 해역 <b>Niño 3.4</b>의 수온 편차가 <b>+0.5 °C 이상으로 5개월 이상</b> 이어지는 경우예요. <b>라니냐</b>는 반대로 −0.5 °C 이하예요. 약 2~7년 주기로 나타나요. 진행 과정을 따라가고, 그래프에서 엘니뇨와 라니냐 구간을 찾아요.</p>',
      setup() { resetStep(2); },
      recap: '엘니뇨: 무역풍 약화 → 난수 동진 → 동태평양 수온 약층 깊어짐·용승 약화 → 강수 중심 동쪽 이동. 라니냐는 반대예요. 수온 편차 ±0.5 °C를 5개월 이상이 기준이에요.',
      summary: '<ul><li><b>엘니뇨</b>: 무역풍 약화 → 서쪽 난수가 동쪽으로 이동 → 동태평양 표층 수온 상승(Niño 3.4 편차 +0.5 °C 이상이 5개월 이상) → 수온 약층이 깊어지고 용승 약화(영양염·어획량 감소) → 대류 활발 중심이 동쪽으로 → 동태평양 강수 증가(페루 폭우), 서태평양 가뭄(인도네시아·호주 산불).</li><li><b>라니냐</b>: 반대. 무역풍 강화, 동태평양 수온 편차 −0.5 °C 이하. 주기 약 2~7년.</li><li>수온 편차 예시: 1997~98 엘니뇨 +2.4, 2015~16 엘니뇨 +2.6, 2010~11 라니냐 −1.6.</li><li>엘니뇨 때 페루 어획량이 줄어드는 까닭: 용승 약화 → 영양염·식물 플랑크톤 감소.</li></ul>',
      missions: [
        {
          title: '엘니뇨의 진행 순서 정하기', manual: true,
          goal: '<b>🔥 엘니뇨</b>의 진행 과정을 ①~④ 단계로 살펴본 뒤, 일어나는 순서대로 카드 5장을 눌러요.',
          hint: '시작은 바람이에요. 바람이 약해지면 따뜻한 물이 움직이고, 바다 속 약층이 변하고, 용승이 약해진 뒤 비구름 중심이 옮겨 가요.',
          setup() { S.sign = 1; applyStage(0, true); ordEn.reset(); setCtl(['phase', 'ord3']); },
          status: () => mark(ordEn.complete()) + ' 고른 카드 ' + ordEn.seq.length + ' / 5 · ' + mark(ordEn.ok()) + ' 순서',
          check() {
            if (!ordEn.complete()) return '카드 5장을 모두 눌러 순서를 정해 주세요. (지금 ' + ordEn.seq.length + '장)';
            if (!ordEn.ok()) { const i = ordEn.firstWrong(); ordEn.mark(ordEn.seq[i]); return (i + 1) + '번째로 고른 카드가 맞지 않아요. ①~④ 단계를 다시 살펴봐요.'; }
            ordEn.mark(null); return true;
          },
          explain: '엘니뇨는 <b>무역풍 약화 → 난수 동진 → 동태평양 수온 약층 깊어짐 → 용승 약화 → 강수 중심 동쪽 이동</b> 순서로 진행돼요. 라니냐는 이 반대 방향이에요.',
        },
        {
          title: '그래프에서 엘니뇨·라니냐 구간 판정하기', manual: true,
          goal: 'Niño 3.4 수온 편차 그래프의 구간 A~F를 <b>엘니뇨 · 라니냐 · 해당 없음</b>으로 판정해요. (±0.5 °C를 넘는 상태가 5개월 이상이어야 해요.)',
          hint: '구간 이름 옆의 편차 부호와 개월 수를 보세요. +0.5 이상이 5개월 이상이면 엘니뇨, −0.5 이하가 5개월 이상이면 라니냐예요. 5개월이 안 되면 해당 없음이에요.',
          setup() { clsSpan.reset(); S.reveal = false; setCtl(['phase', 'cls3']); },
          status: () => mark(clsSpan.complete()) + ' 판정한 구간 ' + clsSpan.count() + ' / ' + RUNS.length + ' · ' + mark(clsSpan.ok()) + ' 모두 맞음',
          check() {
            if (!clsSpan.complete()) return '구간 ' + RUNS.length + '개를 모두 판정해 주세요. (지금 ' + clsSpan.count() + '개)';
            const w = clsSpan.wrong(); clsSpan.mark(w);
            if (w.length) return '구간 ' + w.join(', ') + '의 판정을 다시 확인해 보세요. 부호와 지속 기간(5개월 이상)을 함께 봐요.';
            S.reveal = true; return true;
          },
          explain: '엘니뇨는 편차가 <b>+0.5 °C 이상으로 5개월 이상</b>, 라니냐는 <b>−0.5 °C 이하로 5개월 이상</b>이에요. 구간 D는 +0.5 °C를 넘었지만 ' + (RUNS.find((r) => r.kind === 'no') ? RUNS.find((r) => r.kind === 'no').n : 3) + '개월뿐이라 엘니뇨로 보지 않아요.',
        },
        {
          type: 'quiz', title: '엘니뇨 때 페루 어획량이 줄어드는 까닭',
          goal: '엘니뇨가 나타나면 페루 앞바다의 어획량이 크게 줄어요. 그 까닭은?',
          setup() { S.sign = 1; applyStage(4, false); setCtl(['phase']); },
          choices: ['바닷물이 너무 차가워져서 물고기가 얼어요', '무역풍이 강해져 물고기가 서쪽으로 밀려가요', '비가 많이 와서 바닷물이 싱거워져요', '용승이 약해져 영양염이 줄고, 식물 플랑크톤과 이를 먹는 물고기가 줄어요'],
          answer: 3,
          feedback: ['엘니뇨 때는 동태평양 바닷물이 오히려 평소보다 따뜻해져요.', '엘니뇨 때는 무역풍이 약해져요.', '강수 변화가 있기는 하지만, 어획량 감소의 핵심 원인은 먹이가 되는 플랑크톤의 감소예요.', ''],
          explain: '엘니뇨 때는 동태평양의 수온 약층이 깊어지고 <b>용승이 약해져</b> 표층에 올라오는 영양염이 줄어요. 그러면 식물 플랑크톤이 줄고 먹이 사슬을 따라 물고기도 줄어 어획량이 감소해요.',
        },
      ],
    },
    {
      title: '남방진동: 대기와 바다가 한 몸으로', short: '남방진동', icon: '📈', phase: '분석', features: ['soi'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엘니뇨 때 무역풍이 약해지고 비구름이 동쪽으로 옮겨 가는 것을 봤어요. 대기 쪽에서 보면 동서의 <b>기압 차이</b>가 달라지는 현상이에요.</div>' +
        '<p><b>남방진동</b>은 동태평양(타히티)과 서태평양(다윈)의 해면 기압이 시소처럼 번갈아 높고 낮아지는 현상이에요. 남방진동지수는 <b>(타히티 − 다윈)</b>으로 나타내요. 엘니뇨는 바다에서 본 이름, 남방진동은 대기에서 본 이름이고 둘을 합쳐 <b>ENSO</b>라고 해요. 세 상태의 기압차를 계산하고, 엘니뇨가 스스로 커지는 되먹임과 세계 각지의 영향을 정리해요. (예시 자료)</p>',
      setup() { resetStep(3); },
      recap: '엘니뇨 때는 타히티 − 다윈 기압차가 줄어(역전될 수도) 무역풍이 더 약해지는 양의 되먹임이 생겨요. 엘니뇨와 남방진동은 한 현상(ENSO)이고, 영향은 경향이에요.',
      summary: '<ul><li><b>남방진동지수</b> = 타히티 해면 기압 − 다윈 해면 기압. 예시: 정상 ' + TA.tah[1] + ' − ' + TA.dar[1] + ' = +' + fix(SOI.n, 1) + ' hPa, 엘니뇨 ' + TA.tah[2] + ' − ' + TA.dar[2] + ' = ' + sgn(SOI.e, 1).replace('+', '+') + ' hPa(차이가 줄고 역전), 라니냐 ' + TA.tah[0] + ' − ' + TA.dar[0] + ' = +' + fix(SOI.l, 1) + ' hPa(차이가 큼).</li><li>수온 편차가 클수록 기압차가 작아져요: <b>역상관</b>.</li><li><b>되먹임</b>: 무역풍 약화 → 동태평양 수온 상승 → 동서 기압차 감소 → 무역풍이 더 약해짐.</li><li>엘니뇨 시기의 영향(경향): 페루 폭우·홍수, 인도네시아·호주 가뭄·산불, 우리나라는 겨울에 기온이 높고 강수가 많은 경향. 항상 같지는 않아요.</li><li>엘니뇨(해양)와 남방진동(대기)은 한 현상 = <b>ENSO</b>.</li></ul>',
      missions: [
        {
          title: '세 상태의 기압차 구하기',
          goal: '정상 상태·엘니뇨·라니냐의 <b>타히티 − 다윈</b> 기압차(hPa)를 계산해 입력해요.',
          hint: '카드에 적힌 다윈(왼쪽)과 타히티(오른쪽) 기압을 읽고 타히티에서 다윈을 빼요. 엘니뇨의 값은 음수예요. ＋/－ 단추는 0.5 hPa씩 움직여요.',
          setup() { S.sub = 'soi'; stpS.forEach((s) => s.reset()); setCtl(['soi']); },
          check: () => stpS[0].value === SOI.n && stpS[1].value === SOI.e && stpS[2].value === SOI.l, hold: 0.6,
          status: () => mark(stpS[0].value === SOI.n) + ' 정상 ' + sgn(stpS[0].value, 1) + ' · ' + mark(stpS[1].value === SOI.e) + ' 엘니뇨 ' + sgn(stpS[1].value, 1) + ' · ' + mark(stpS[2].value === SOI.l) + ' 라니냐 ' + sgn(stpS[2].value, 1),
          explain: '정상: ' + TA.tah[1] + ' − ' + TA.dar[1] + ' = <b>+' + fix(SOI.n, 1) + '</b> hPa, 엘니뇨: ' + TA.tah[2] + ' − ' + TA.dar[2] + ' = <b>' + sgn(SOI.e, 1) + '</b> hPa(차이가 줄고 역전), 라니냐: ' + TA.tah[0] + ' − ' + TA.dar[0] + ' = <b>+' + fix(SOI.l, 1) + '</b> hPa(차이가 커요). 기압 차이는 무역풍을 부는 힘이에요.',
        },
        {
          title: '되먹임과 영향 정리하기', manual: true,
          goal: '엘니뇨가 스스로 커지는 <b>되먹임 고리</b>를 순서대로 이어요. 그리고 엘니뇨 시기의 지역별 영향을 분류해요.',
          hint: '고리는 무역풍 약화에서 시작해 한 바퀴 돌아 다시 무역풍 약화로 이어져요. 따뜻한 물과 비구름이 동쪽으로 오면 서쪽은 비가 줄어요.',
          setup() { S.sub = 'fb'; ordFb.reset(); clsImp.reset(); setCtl(['ord4', 'cls4']); },
          status: () => mark(ordFb.ok()) + ' 되먹임 순서 ' + ordFb.seq.length + ' / 4 · ' + mark(clsImp.ok()) + ' 영향 분류 ' + clsImp.count() + ' / 3',
          check() {
            if (!ordFb.complete()) return '되먹임 카드 4장을 모두 눌러 순서를 정해 주세요. (지금 ' + ordFb.seq.length + '장)';
            if (!ordFb.ok()) { const i = ordFb.firstWrong(); ordFb.mark(ordFb.seq[i]); return (i + 1) + '번째 카드가 맞지 않아요. 무역풍 약화 → 수온 상승 → 기압차 감소 → 더 약한 무역풍 순서예요.'; }
            ordFb.mark(null);
            if (!clsImp.complete()) return '지역별 영향 3곳을 모두 분류해 주세요. (지금 ' + clsImp.count() + '곳)';
            const w = clsImp.wrong(); clsImp.mark(w);
            if (w.length) return '빨간 칸 ' + w.length + '곳을 다시 확인해 보세요. 비구름이 동쪽으로 옮겨 가면 서쪽은 어떻게 될까요?';
            return true;
          },
          explain: '<b>무역풍 약화 → 동태평양 수온 상승 → 동서 기압차 감소 → 무역풍이 더 약해져요</b>. 처음 변화를 키우는 양의 되먹임이에요. 영향(경향): 페루는 폭우·홍수, 인도네시아·호주는 가뭄·산불, 우리나라는 겨울철 기온이 높은 경향이에요.',
        },
        {
          type: 'quiz', title: '엘니뇨와 남방진동',
          goal: '엘니뇨와 남방진동에 대한 설명으로 알맞은 것은?',
          setup() { S.sub = 'soi'; setCtl([]); },
          choices: ['엘니뇨와 남방진동은 해양에서 본 하나의 현상과 대기에서 본 모습이고, 합쳐서 ENSO라고 불러요. 영향은 경향이라 매번 똑같지는 않아요', '엘니뇨는 대기 현상이고 남방진동은 해양 현상으로 서로 관계가 없어요', '엘니뇨가 오면 모든 나라에서 반드시 같은 날씨가 나타나요', '남방진동은 한 번 시작되면 영원히 계속돼요'],
          answer: 0,
          feedback: ['', '두 현상은 서로 원인과 결과가 되어 함께 나타나요. 해양과 대기가 상호작용하는 하나의 현상이에요.', '영향은 경향이에요. 같은 엘니뇨라도 지역별 날씨는 해마다 달라요.', '약 2~7년 주기로 반복되며 정상 상태로 돌아와요.'],
          explain: '엘니뇨(해양)와 남방진동(대기)은 서로 영향을 주고받는 <b>한 현상(ENSO)</b>이에요. 영향은 <b>경향</b>이라 항상 같지는 않으니, 실제 자료는 기상청과 해양 관측 기관의 누리집에서 확인해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-enso', mount: '#game', badge: 'ENSO 탐험가', homeHref: '../../index.html#he',
    featureLabels: { coast: '🌊 바람 방향·세기 · 용승·침강 단면', normal: '🌐 무역풍 슬라이더 · 워커 순환 · 기압계', enso: '🌡️ 진행 과정 · Niño 3.4 그래프', soi: '📈 기압차 계산 · 되먹임 · 영향 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = mv();
    if (S.mode === 'coast') { const cv = coastVals(S.Us); setReadouts(['바람', S.dir === 'N' ? '북쪽으로 · 세기 ' + S.ws : S.dir === 'S' ? '남쪽으로 · 세기 ' + S.ws : '없음', '연안 표층 수온', fix(cv.sst, 1) + ' °C', '영양염', Math.round(cv.nut) + ' (0~100)']); }
    else if (S.mode === 'normal') setReadouts(['무역풍 세기', m.pct + ' % (평소 100)', '서쪽 수온 약층', Math.round(m.thW) + ' m', '타히티 − 다윈', sgn(S.sw.value - S.dw.value, 1) + ' hPa']);
    else if (S.mode === 'enso') { const n = n34(m); setReadouts(['진행 단계', (S.sign > 0 ? NAME_EL : NAME_LA)[S.stage], 'Niño 3.4 수온 편차', sgn(n, 1) + ' °C', '판정', n >= 0.5 ? '엘니뇨 상태' : n <= -0.5 ? '라니냐 상태' : '정상 범위']); }
    else setReadouts(['정상 · 엘니뇨 · 라니냐', sgn(SOI.n, 1) + ' · ' + sgn(SOI.e, 1) + ' · ' + sgn(SOI.l, 1), '단위', 'hPa (타히티 − 다윈)', '자료', '예시 자료']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    stepModel(dt);
    if (S.mode === 'coast') stepCoast(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#d6e8f5'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'coast') { drawCoast(t); drawCoastPanel(t); }
    else if (S.mode === 'normal') { drawEquator(t, {}); drawGauges(t); }
    else if (S.mode === 'enso') { drawEquator(t, { nino: true }); drawNinoGraph(t, LR, S.reveal); }
    else {
      if (S.sub === 'fb') { const gap = 10; if (PHONE) { drawFeedback(t, { x: MR.x, y: MR.y, w: MR.w, h: MR.h / 2 - 5 }); drawImpactMap(t, { x: MR.x, y: MR.y + MR.h / 2 + 5, w: MR.w, h: MR.h / 2 - 5 }); } else { drawFeedback(t, { x: MR.x, y: MR.y, w: MR.w * 0.5 - 5, h: MR.h }); drawImpactMap(t, { x: MR.x + MR.w * 0.5 + 5, y: MR.y, w: MR.w * 0.5 - 5, h: MR.h }); } }
      else drawStates(t);
      drawSoiGraph(t, LR);
    }
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    VW, VH, S, TA, SER, RUNS, SOI, A, soiOf, mv, ordEn, clsUp, clsSpan, stpS, ordFb, clsImp, applyPct, applyStage, enterMode, resetStep, coastVals,
    get game() { return game; },
    settle() { for (let i = 0; i < 200; i++) stepModel(0.05); S.Us = Utgt(); },
  };

})();
