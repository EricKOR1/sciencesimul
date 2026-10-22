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
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 우리나라의 악기상
     [12지구01-04] 뇌우, 집중호우, 폭설, 강풍, 황사 등 주요 악기상의 생성 메커니즘과 대처 방안
     ① 모형: 뇌우   ② 모형: 집중호우   ③ 탐구: 폭설·강풍   ④ 적용: 황사·대처
     ========================================================= */
  initStage('#cfe4f4', 800, 560, 600, 880, 1.28);
  const U = VW / 800;

  /* ---------- 본문에 쓰는 숫자는 모두 여기서 가져와요 ---------- */
  const K = {
    SOUND: 340,                               // 소리의 속력 (m/s)
    DISTS: [1.7, 2.04, 1.36, 2.38],           // 번개가 치는 거리 (km): 5, 6, 4, 7초 뒤에 천둥이 들려요
    R_PER_V: 20, CRIT: 30,                    // 수증기 공급 1배당 강수 강도 (mm/h), 집중호우 기준 (mm/h)
    HOURS: 3, CAP: 5,                         // 관측 시간(시간), 배수 용량 (만 m³, 예시)
    SURF: { forest: 0.10, house: 0.40, city: 0.80 },
    SNOW_DT: 20, DT0: 8, DT_PER_KM: 4, TMAX: 6,   // 폭설 기준 온도차(°C), 눈구름 두께 = (온도차 − 8) ÷ 4 (km, 최대 6)
    EAST_K: 1.5,                              // 동해안 산비탈 눈구름 두께 = 1.5 × 바람 세기 (km)
    DA: 220, DB: 100, VK: 2200,               // 지도 A, B 등압선 간격 (km), 풍속 = 2200 ÷ 간격 (m/s, 예시)
    DUST_KM: 2000, DUST_V: [40, 50, 80],
  };
  const SURF_NAME = { forest: '숲', house: '주택지', city: '도시' };
  const dTof = (sst, tup) => sst - tup;
  const thickOf = (dT) => clamp((dT - K.DT0) / K.DT_PER_KM, 0, K.TMAX);
  const rateOf = (v) => K.R_PER_V * v;                     // mm/h
  const totalOf = (v) => rateOf(v) * K.HOURS;              // mm (3시간)
  const volOf = (v) => (totalOf(v) * 1000) / 10000;        // 1 km²에 내린 비 (만 m³)
  const windOf = (d) => Math.round(K.VK / d);
  const STG = [null,
    { name: '적운 단계', up: 0.8, down: 0, rain: 0, top: 0.5, anvil: 0, fade: 0 },
    { name: '성숙 단계', up: 1, down: 0.9, rain: 1, top: 1, anvil: 1, fade: 0 },
    { name: '소멸 단계', up: 0.1, down: 0.8, rain: 0.4, top: 0.85, anvil: 1, fade: 0.55 }];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'storm', clock: 0, fade: 0,
    stage: 1, up: 0.8, down: 0, rain: 0, top: 0.5, anvil: 0, shade: 0, cfade: 0,
    bolt: null, flashA: 0, thunder: null, lastDelay: null, lastDist: null, strikeIdx: 0, lights: 0, popT: 0,
    laps: 0, hail: { s: 0, laps: 0, mode: 'loop', x: 0, y: 0, vy: 0, wait: 0 }, pel: [0, 0.25, 0.5, 0.75].map((s) => ({ s })),
    V: 2, surf: 'city', rt: 3, rtPlay: false, rtSmooth: 3, rainDots: [], cells: [], cellT: 0, replays: 0,
    sst: 8, tup: -4, thickS: 1, ew: 2, ewS: 2, snowAcc: 0,
    windOK: false,
    dust: { v: 50, running: false, h: 0, arrived: false, arrivedV: null, pack: [] }, dustT: 0,
    chk: { surfSeen: false },
  };
  const ordItems = [
    { id: 'b', label: '하강 기류가 우세해지고 비가 약해지며 구름이 흩어져요' },
    { id: 'c', label: '상승 기류만 있어서 구름이 위로 자라요' },
    { id: 'a', label: '상승 기류와 하강 기류가 함께 있고, 강한 비와 번개가 나타나요' }];
  const ord = makeOrder($('#ordBox'), ordItems, ['c', 'a', 'b']);
  const stpDist = makeStepper($('#stpDist'), { min: 0.1, max: 4, step: 0.1, value: 0.1, dec: 1, unit: 'km' });
  const stpVol = makeStepper($('#stpVol'), { min: 0, max: 30, step: 1, value: 0, dec: 0, unit: '만 m³' });
  const stpHr = makeStepper($('#stpHr'), { min: 5, max: 100, step: 5, value: 5, dec: 0, unit: '시간' });
  const windCls = makeClassify($('#windBox'), [{ id: 'A', label: '지도 A (등압선 간격이 넓은 곳)' }, { id: 'B', label: '지도 B (등압선이 촘촘한 곳)' }],
    [{ id: 'weak', label: '약한 바람<br>약 ' + windOf(K.DA) + ' m/s' }, { id: 'strong', label: '센 바람<br>약 ' + windOf(K.DB) + ' m/s' }], { A: 'weak', B: 'strong' });
  const HAZ = [{ id: 'th', label: '⛈️ 뇌우' }, { id: 'fl', label: '🌧️ 집중호우' }, { id: 'sn', label: '❄️ 폭설' }, { id: 'wi', label: '💨 강풍' }, { id: 'du', label: '🌫️ 황사' }];
  const RESP = [
    { id: 'wi', label: '간판·비닐하우스 등 시설물을 단단히 고정해요' },
    { id: 'th', label: '건물이나 자동차 안으로 대피하고 금속 물체에서 떨어져요' },
    { id: 'du', label: '보건용 마스크를 쓰고 외출을 줄여요' },
    { id: 'sn', label: '제설 작업을 하고 체인 등 월동 장비를 갖춰요' },
    { id: 'fl', label: '지하 공간과 하천 둔치에 가지 않고 높은 곳으로 피해요' }];
  const match = makePair($('#matchBox'), HAZ, RESP, { th: 'th', fl: 'fl', sn: 'sn', wi: 'wi', du: 'du' });

  /* ---------- 배치 ---------- */
  const G = PHONE ? { gy: 596, by: 448, ty: 96 } : { gy: 478, by: 336, ty: 56 };
  const CX = 0.62 * VW, HW = 0.19 * VW, OBS = 0.08 * VW, PPK = 0.30 * VW;
  const INF = PHONE ? { x: 8, y: 640, w: 584, h: 232 } : { x: 12, y: 12, w: 196, h: 244 };
  const MR = PHONE ? { x: 8, y: 8, w: 584, h: 400 } : { x: 10, y: 10, w: 780, h: 336 };
  const LR = PHONE ? { x: 8, y: 416, w: 584, h: 456 } : { x: 10, y: 356, w: 780, h: 194 };
  const SPD_PX = (K.SOUND / 1000) * PPK;                   // 소리가 1초에 가는 화면 거리

  /* ======================================================
     STEP 1 : 뇌우
     ====================================================== */
  function setStage(st, snap) {
    S.stage = st;
    if (snap) { const g = STG[st]; S.up = g.up; S.down = g.down; S.rain = g.rain; S.top = g.top; S.anvil = g.anvil; S.cfade = g.fade; }
    $('#oStage').textContent = STG[st].name;
    setSlider($('#sStage'), null, st);
  }
  function stepStorm(dt) {
    const g = STG[S.stage];
    S.up = approach(S.up, g.up, dt, 2.2); S.down = approach(S.down, g.down, dt, 2.2); S.rain = approach(S.rain, g.rain, dt, 2.2);
    S.top = approach(S.top, g.top, dt, 1.6); S.anvil = approach(S.anvil, g.anvil, dt, 1.4); S.cfade = approach(S.cfade, g.fade, dt, 1.2);
    S.shade = approach(S.shade, S.rain, dt, 2);
    S.flashA = Math.max(0, S.flashA - dt * 3.2);
    if (S.bolt) { S.bolt.t += dt; if (S.bolt.t > 0.7) S.bolt = null; }
    // 천둥: 소리 파동이 관측자에게 가는 시간
    const th = S.thunder;
    if (th) {
      if (!th.arrived) {
        th.t += dt;
        if (th.t * SPD_PX >= th.x - OBS) {
          th.arrived = true; th.t = th.delay; S.popT = 2.2; Sound.tone(70, 0.9, 'sawtooth', 0.09); Sound.tone(52, 1.1, 'triangle', 0.08, 0.05);
          parts.burst(OBS, G.gy - 40 * U, { count: 10, speed: 70, size: 3, life: 0.7, colors: ['#94a3b8', '#e2e8f0'], gravity: 0 });
        }
      } else th.after = (th.after || 0) + dt;
    }
    if (S.popT > 0) S.popT -= dt;
    // 비
    if (!RM) {
      S.rainAcc = (S.rainAcc || 0) + dt * S.rain * 120;
      while (S.rainAcc >= 1) {
        S.rainAcc -= 1; const xx = CX + 62 * U + rnd(-52, 60) * U, vy = rnd(380, 460);
        parts.emit({ x: xx, y: G.by + 8, vx: -10, vy, life: (G.gy - G.by - 10) / vy, size: 2.1, color: '#2f6fa8', shape: 'square', fade: false, alpha: 0.9 });
      }
    }
    // 얼음 알갱이 (상승 기류를 타고 오르내려요)
    const vis = smooth((S.top - 0.8) / 0.2) * smooth((S.up - 0.4) / 0.4);
    S.pelVis = vis;
    const P = loopLen();
    if (vis > 0.02) {
      S.pel.forEach((p) => { p.s = (p.s + dt * 230 * U * Math.max(0.3, S.up)) % P; });
      const h = S.hail;
      if (h.mode === 'loop') {
        const prev = h.s; h.s += dt * 230 * U * Math.max(0.3, S.up);
        if (h.s >= P) { h.s -= P; h.laps += 1; if (h.laps >= 6) { h.mode = 'fall'; const q = loopPos(h.s); h.x = q[0]; h.y = q[1]; h.vy = 0; } }
      } else if (h.mode === 'fall') {
        h.vy += 700 * dt; h.y += h.vy * dt; h.x += (CX + 62 * U + 18 * U - h.x) * Math.min(1, dt * 3);
        if (h.y >= G.gy - 4) { parts.burst(h.x, G.gy - 4, { count: 12, speed: 120, size: 3.2, life: 0.8, colors: ['#e0f2fe', '#ffffff', '#93c5fd'], gravity: 400 }); Sound.tone(900, 0.06, 'square', 0.04); h.mode = 'wait'; h.wait = 1.2; }
      } else { h.wait -= dt; if (h.wait <= 0) { h.mode = 'loop'; h.laps = 0; h.s = 0; } }
    } else if (S.hail.mode !== 'loop') { S.hail.mode = 'loop'; S.hail.laps = 0; S.hail.s = 0; }
  }
  const yT = () => G.by - 0.88 * (G.by - G.ty), yB = () => G.by - 0.30 * (G.by - G.ty);
  const xU = () => CX - 62 * U, xD = () => CX + 62 * U;
  function loopLen() { return 2 * ((xD() - xU()) + (yB() - yT())); }
  function loopPos(s) {
    const Lx = xD() - xU(), Ly = yB() - yT(); s = ((s % (2 * (Lx + Ly))) + 2 * (Lx + Ly)) % (2 * (Lx + Ly));
    if (s < Ly) return [xU(), yB() - s];
    s -= Ly; if (s < Lx) return [xU() + s, yT()];
    s -= Lx; if (s < Ly) return [xD(), yT() + s];
    s -= Ly; return [xD() - s, yB()];
  }
  function strike() {
    if (S.stage !== 2) { say('번개는 구름이 가장 발달한 성숙 단계에서 일어나요. 슬라이더를 가운데로 옮겨 보세요.', true); Sound.fail(); return; }
    if (S.thunder && !S.thunder.arrived) { say('천둥소리가 도착할 때까지 기다려요.', true); return; }
    const d = K.DISTS[S.strikeIdx % K.DISTS.length]; S.strikeIdx++; S.lights++;
    const x = OBS + d * PPK, delay = Math.round((d * 1000) / K.SOUND);
    const pts = [[x, G.by + 6 * U]]; const n = 9;
    for (let i = 1; i <= n; i++) pts.push([x + (i === n ? 0 : rnd(-16, 16) * U), G.by + 6 * U + ((G.gy - G.by - 6 * U) * i) / n]);
    const br = []; const bi = 3; br.push([pts[bi][0], pts[bi][1]], [pts[bi][0] + 34 * U, pts[bi][1] + 40 * U], [pts[bi][0] + 28 * U, pts[bi][1] + 80 * U]);
    S.bolt = { pts, br, t: 0 }; S.flashA = 1; S.thunder = { x, d, delay, t: 0, arrived: false };
    S.lastDelay = delay; S.lastDist = d; stpDist.reset();
    Sound.tone(1400, 0.05, 'square', 0.06);
  }
  function drawGroundScene(t) {
    // 하늘
    const dark = S.shade;
    D.sky(0, 0, VW, G.gy, mixc('#86bfe6', '#5f7186', dark * 0.55), mixc('#d4e8f6', '#a9b6c4', dark * 0.5));
    D.ground(0, G.gy, VW, (PHONE ? 40 : VH - G.gy));
    if (PHONE) { ctx.fillStyle = '#dcecf8'; ctx.fillRect(0, G.gy + 40, VW, VH - G.gy - 40); }
    // 0 °C 높이
    const fy = G.by - 0.42 * (G.by - G.ty);
    D.dashedLine(20 * U, fy, VW - 20 * U, fy, { color: 'rgba(30,64,120,.55)', width: 2, dash: [8, 6] });
  }
  function drawCloud(t) {
    const by = G.by, top = by - S.top * (by - G.ty), h = Math.max(1, by - top);
    ctx.save();
    // 모루(anvil)
    if (S.anvil > 0.02) {
      const aw = S.anvil * HW * 1.25, ay = top + 16 * U;
      const g = ctx.createLinearGradient(0, ay - 20 * U, 0, ay + 22 * U); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c3cfdd');
      ctx.globalAlpha = 1 - 0.3 * S.cfade; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(CX + aw * 0.12, ay, aw, 22 * U, 0, 0, TAU); ctx.fill();
    }
    // 탑
    ctx.globalAlpha = 1 - 0.35 * S.cfade;
    const n = Math.max(3, Math.round(h / (20 * U)));
    for (let i = 0; i <= n; i++) {
      const f = i / n, y = by - f * h, r = (54 - 10 * f + 6 * Math.sin(i * 1.7)) * U, x = CX + Math.sin(i * 2.3 + 0.6) * 16 * U + (S.cfade ? Math.sin(t * 0.8 + i) * 4 * U * S.cfade : 0);
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, mixc('#cfd9e6', '#8fa0b4', S.shade * (1 - f) * 0.8));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // 구름 밑면
    const bg = ctx.createLinearGradient(0, by - 26 * U, 0, by + 26 * U); bg.addColorStop(0, mixc('#e5ebf3', '#8b9bb0', S.shade)); bg.addColorStop(1, mixc('#b4c1d1', '#56667c', S.shade));
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(CX, by, HW * (0.62 + 0.38 * smooth(S.top / 0.9)), 24 * U, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawStorm(t) {
    drawGroundScene(t);
    // 관측자
    const ox = OBS, oy = G.gy - 2;
    ctx.fillStyle = '#334155'; rr(ox - 7 * U, oy - 30 * U, 14 * U, 26 * U, 6).fill();
    D.sphere(ox, oy - 38 * U, 9 * U, '#f1c9a0', { gloss: false });
    ctx.fillStyle = '#334155'; ctx.fillRect(ox - 8 * U, oy - 4, 5 * U, 8 * U); ctx.fillRect(ox + 3 * U, oy - 4, 5 * U, 8 * U);
    D.text(ox, oy + 22 * U, '나', { size: 14, weight: 800, color: '#1e293b' });
    // 구름 + 기류
    drawCloud(t);
    D.text(VW - 20 * U, G.by - 0.42 * (G.by - G.ty) - 7, PHONE ? '0 °C 높이' : '0 °C 높이  (이 위는 영하)', { size: 13, weight: 800, color: '#1e4078', align: 'right', stroke: '#ffffff', strokeWidth: 4 });
    const by = G.by, top = by - S.top * (by - G.ty), h = by - top;
    if (S.up > 0.12) {
      const len = clamp(S.up, 0, 1) * h * 0.82;
      D.arrow(xU(), by + 14 * U, xU(), by + 14 * U - len, { color: '#e11d48', width: 3 + S.up * 5, head: 16 });
      if (S.up > 0.3) lbl(xU() - 52 * U, by - len * 0.45, '상승 기류', { bg: '#e11d48' });
    }
    if (S.down > 0.12) {
      const len = clamp(S.down, 0, 1) * h * 0.8;
      D.arrow(xD(), by - len, xD(), by + 16 * U, { color: '#2563eb', width: 3 + S.down * 5, head: 16 });
      if (S.down > 0.3) lbl(xD() + 56 * U, by - len * 0.5, '하강 기류', { bg: '#2563eb' });
    }
    // 땅 위로 퍼지는 찬 공기 (하강 기류가 땅에 닿은 뒤)
    if (S.down > 0.3) {
      const L = S.down * 80 * U;
      D.arrow(xD(), G.gy - 8, xD() + L, G.gy - 8, { color: '#2563eb', width: 4, head: 12, alpha: 0.85 });
      D.arrow(xD(), G.gy - 8, xD() - L, G.gy - 8, { color: '#2563eb', width: 4, head: 12, alpha: 0.85 });
      if (S.down > 0.6) lbl(xD() + L + 6 * U, G.gy - 30 * U, '찬 공기가 퍼져요 (돌풍)', { bg: '#2563eb', size: 12.5, align: 'left' });
    }
    // 얼음 알갱이
    if (S.pelVis > 0.02) {
      ctx.save(); ctx.globalAlpha = S.pelVis;
      S.pel.forEach((p) => { const q = loopPos(p.s); D.sphere(q[0], q[1], 4.2 * U, '#e0f2fe', { gloss: false, outline: '#7aa5d1', outlineWidth: 1 }); });
      const h2 = S.hail;
      if (h2.mode === 'loop') { const q = loopPos(h2.s); h2.x = q[0]; h2.y = q[1]; }
      if (h2.mode !== 'wait') { const hr = (6 + h2.laps * 0.9) * U; D.sphere(h2.x, h2.y, hr, '#ffffff', { outline: '#4b7fb8', outlineWidth: 2 }); }
      ctx.restore();
      if (S.stage === 2) lbl(CX + 20 * U, top + 8 * U, '얼음 알갱이', { bg: '#475569', size: 12.5 });
    }
    // 번개
    if (S.bolt) {
      const b = S.bolt, a = [1, 0.2, 1, 0.6, 0.15, 0.4][Math.floor(b.t * 14)] != null ? [1, 0.2, 1, 0.6, 0.15, 0.4][Math.floor(b.t * 14)] : 0;
      if (b.t < 0.45) {
        ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        [[14, 'rgba(250,204,21,.25)'], [7, 'rgba(255,240,150,.6)'], [3, '#ffffff']].forEach(([w, c]) => { ctx.strokeStyle = c; ctx.lineWidth = w * U; ctx.globalAlpha = a; ctx.beginPath(); b.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.beginPath(); b.br.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
        ctx.restore();
        D.glow(b.pts[b.pts.length - 1][0], G.gy, 60 * U, '#fde047', 0.5 * a);
      }
      if (b.t < 1.6) lbl(b.pts[0][0] + 22 * U, G.gy - 118 * U, '빛: 거의 바로 도착 (3×10⁸ m/s)', { bg: '#a16207', size: 12.5, align: 'left' });
    }
    // 소리 파동
    const th = S.thunder;
    if (th && th.t < th.delay + 0.1 && !th.arrived) {
      for (let k = 0; k < 3; k++) {
        const r = th.t * SPD_PX - k * 26 * U; if (r < 6) continue;
        ctx.strokeStyle = rgba('#6d28d9', 0.7 - k * 0.2); ctx.lineWidth = 3.5 - k; ctx.beginPath(); ctx.arc(th.x, G.gy - 2, r, Math.PI, TAU); ctx.stroke();
      }
      if (th.t * SPD_PX > 60 * U) lbl(th.x - th.t * SPD_PX * 0.72, G.gy - 2 - th.t * SPD_PX * 0.69, '소리: 340 m/s', { bg: '#6d28d9', size: 12.5 });
    }
    if (S.popT > 0) { ctx.save(); ctx.globalAlpha = clamp(S.popT, 0, 1); D.text(OBS + 40 * U, G.gy - 78 * U - (2.2 - S.popT) * 8, '쿠르릉!', { size: 22, weight: 800, color: '#6d28d9', stroke: '#ffffff' }); ctx.restore(); }
    // 번쩍 효과
    if (S.flashA > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + 0.55 * S.flashA + ')'; ctx.fillRect(0, 0, VW, VH); }
    // 단계 이름표
    const gx = CX, nm = STG[S.stage].name;
    lbl(gx, 22, '☁️ ' + nm, { bg: '#0369a1', size: 15 });
    // 정보 판: 시계 · 우박 단면
    drawStormInfo(t);
  }
  function drawStormInfo(t) {
    const R = INF; card(R, '');
    // 시계
    const sw = PHONE ? { x: R.x + 8, y: R.y + 6, w: 270, h: R.h - 12 } : { x: R.x + 6, y: R.y + 6, w: R.w - 12, h: 100 };
    D.text(sw.x + sw.w / 2, sw.y + 22 * FS, '⚡ 번쩍 → 천둥까지', { size: 14, weight: 800, color: '#334155' });
    const th = S.thunder, tt = th ? Math.min(th.t, th.delay) : 0;
    const txt = th ? fix(tt, 1) + ' 초' : '— 초';
    D.text(sw.x + sw.w / 2, sw.y + 58 * FS, txt, { size: 30, weight: 800, color: th && th.arrived ? '#6d28d9' : '#0f172a' });
    if (S.lastDelay != null && th && th.arrived) D.text(sw.x + sw.w / 2, sw.y + 80 * FS, '소리가 간 거리 = 340 m/s × ' + th.delay + ' 초', { size: 12.5, weight: 800, color: '#6d28d9' });
    else D.text(sw.x + sw.w / 2, sw.y + 80 * FS, S.stage === 2 ? '⚡ 버튼을 눌러 시계를 시작해요' : '성숙 단계에서 번개가 쳐요', { size: 12.5, weight: 700, color: '#64748b' });
    // 우박 단면
    const hx = PHONE ? R.x + R.w - 150 : R.x + R.w / 2, hy = PHONE ? R.y + R.h / 2 + 4 : R.y + 176;
    const hr = PHONE ? 62 : 42, laps = S.hail.mode === 'loop' ? S.hail.laps : (S.hail.mode === 'wait' ? 6 : 6);
    D.text(hx, hy - hr - 8 * FS, '🔍 우박 단면', { size: 13.5, weight: 800, color: '#334155' });
    ctx.save(); ctx.globalAlpha = S.pelVis > 0.05 ? 1 : 0.35;
    const nr = Math.max(1, laps);
    for (let i = nr; i >= 1; i--) { const rr0 = hr * (i / 6); ctx.fillStyle = i % 2 ? '#f8fafc' : '#9ec5ea'; ctx.beginPath(); ctx.arc(hx, hy, rr0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6b95c4'; ctx.lineWidth = 1.2; ctx.stroke(); }
    if (laps < 1) { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(hx, hy, hr / 6, 0, TAU); ctx.fill(); }
    ctx.restore();
    D.text(hx, hy + hr + 16 * FS, S.pelVis > 0.05 ? '얼음 층 ' + Math.max(1, laps) + '개' : '(성숙 단계에서 보여요)', { size: 12.5, weight: 800, color: '#475569' });
  }

  /* ======================================================
     STEP 2 : 집중호우
     ====================================================== */
  const MAPPOLY = [[.42, .10], [.55, .06], [.66, .12], [.72, .24], [.70, .40], [.74, .55], [.70, .70], [.60, .84], [.50, .92], [.44, .80], [.46, .64], [.40, .52], [.43, .36], [.38, .22]];
  const OBSPT = { fx: 0.56, fy: 0.46 };
  const FRONT_Y = 0.46;
  function cellColor(R) { return R >= 50 ? '#b91c1c' : R >= K.CRIT ? '#ea580c' : R >= 20 ? '#ca8a04' : '#16a34a'; }
  function stepRain(dt) {
    S.rtSmooth = S.rtPlay ? S.rt : S.rtSmooth;
    if (S.rtPlay) { S.rt += dt / 3; if (S.rt >= 1) { S.rt = 1; S.rtPlay = false; } }
    // 비구름: 앞에서 서쪽에서 동쪽으로 줄지어 지나가요
    const R = rateOf(S.V), rate = 0.12 + S.V * 0.22;       // 초당 생기는 비구름 수
    S.cellT += dt * rate;
    while (S.cellT >= 1) { S.cellT -= 1; S.cells.push({ fx: 0.12, fy: FRONT_Y + rnd(-0.03, 0.03), w: rnd(0.05, 0.075), grow: 0 }); }
    S.cells.forEach((c) => { c.fx += dt * 0.11; c.grow = Math.min(1, c.grow + dt * 1.5); });
    S.cells = S.cells.filter((c) => c.fx < 0.92);
    // 관측 지점 위의 비
    const onObs = S.cells.some((c) => Math.abs(c.fx - OBSPT.fx) < c.w * 0.8);
    S.obsRain = approach(S.obsRain || 0, onObs ? 1 : 0, dt, 8);
    if (!RM && S.obsRain > 0.3) {
      S.dropAcc = (S.dropAcc || 0) + dt * 30 * S.V;
      while (S.dropAcc >= 1) { S.dropAcc -= 1; parts.emit({ x: MR.x + MR.w * OBSPT.fx + rnd(-16, 16), y: MR.y + MR.h * OBSPT.fy - 14, vx: -6, vy: 120, life: 0.4, size: 1.6, color: '#2563eb', shape: 'square', fade: true, gravity: 0 }); }
    }
  }
  function drawFrontSymbol(x0, x1, y, t) {
    ctx.save(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2563eb';
    const seg = 34 * U * (PHONE ? 0.9 : 1), n = Math.floor((x1 - x0) / seg);
    for (let i = 0; i < n; i++) {
      const a = x0 + i * seg, b = a + seg;
      if (i % 2 === 0) { ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.moveTo(a + 4, y); ctx.lineTo(b - 4, y); ctx.lineTo((a + b) / 2, y - 14 * U); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(a + 4, y); ctx.arc((a + b) / 2, y, (seg - 8) / 2, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.beginPath(); }
    }
    ctx.restore();
  }
  function drawRainMap(t) {
    const R = MR;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    ctx.fillStyle = '#bfe0f5'; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = '#d9d3b4'; ctx.fillRect(R.x, R.y, R.w * 0.14, R.h);                       // 대륙
    D.text(R.x + R.w * 0.07, R.y + R.h * 0.12, '중국', { size: 13, weight: 800, color: '#7a6f43' });
    D.text(R.x + R.w * 0.28, R.y + R.h * 0.12, '서해', { size: 13, weight: 800, color: '#3b7ea8' });
    D.text(R.x + R.w * 0.88, R.y + R.h * 0.12, '동해', { size: 13, weight: 800, color: '#3b7ea8' });
    ctx.fillStyle = '#9ec88a'; ctx.beginPath(); MAPPOLY.forEach((p, i) => { const x = R.x + R.w * p[0], y = R.y + R.h * p[1]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5e8a4e'; ctx.lineWidth = 2; ctx.stroke();
    D.text(R.x + R.w * 0.575, R.y + R.h * 0.2, '한반도', { size: 13, weight: 800, color: '#3c6330' });
    // 북태평양 고기압
    const hx = R.x + R.w * 0.86, hy = R.y + R.h * 0.88;
    for (let k = 3; k >= 1; k--) { ctx.strokeStyle = 'rgba(190,60,60,' + (0.18 + k * 0.1) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, hy, R.w * 0.08 * k, R.h * 0.1 * k, 0, 0, TAU); ctx.stroke(); }
    D.text(hx, hy + 5, '고', { size: 20, weight: 800, color: '#b91c1c' });
    D.text(hx - R.w * 0.02, hy - R.h * 0.2, '북태평양 고기압', { size: 12.5, weight: 800, color: '#b91c1c' });
    // 정체 전선
    drawFrontSymbol(R.x + R.w * 0.04, R.x + R.w * 0.96, R.y + R.h * FRONT_Y + 20 * U, t);
    lbl(R.x + R.w * 0.2, R.y + R.h * FRONT_Y + 52 * U, '장마 전선 (한곳에 머물러요)', { bg: '#2563eb', size: 12.5 });
    // 남서 기류 (수증기): 굵기와 입자 수가 공급량에 비례
    const v = S.V;
    [[0.10, 0.92, 0.32, 0.60], [0.22, 0.98, 0.44, 0.62], [0.34, 0.99, 0.54, 0.64]].forEach((a, i) => {
      const x1 = R.x + R.w * a[0], y1 = R.y + R.h * a[1], x2 = R.x + R.w * a[2], y2 = R.y + R.h * a[3];
      D.arrow(x1, y1, x2, y2, { color: 'rgba(14,116,144,.85)', width: 3 + v * 2.2, head: 12 + v * 2 });
      const n = Math.round(3 + v * 2.5);
      for (let k = 0; k < n; k++) { const f = ((t * 0.18 + k / n + i * 0.13) % 1); D.sphere(lerp(x1, x2, f), lerp(y1, y2, f), 3.2, '#7dd3fc', { gloss: false }); }
    });
    lbl(R.x + R.w * 0.2, R.y + R.h * 0.84, '남서 기류: 따뜻하고 습한 공기', { bg: '#0e7490', size: 12.5 });
    // 비구름
    S.cells.forEach((c) => {
      const x = R.x + R.w * c.fx, y = R.y + R.h * c.fy, rx = R.w * c.w * c.grow, ry = rx * 0.55;
      const col = cellColor(rateOf(S.V));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, rgba(col, 0.85)); g.addColorStop(1, rgba(col, 0.1));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    });
    // 관측 지점
    const ox = R.x + R.w * OBSPT.fx, oy = R.y + R.h * OBSPT.fy;
    D.sphere(ox, oy, 8, '#fff', { gloss: false, outline: '#0f172a', outlineWidth: 2.5 });
    D.text(ox, oy + 5, '×', { size: 14, weight: 800, color: '#0f172a' });
    lbl(ox + 6, oy - 26 * U, '우리 지역', { bg: '#0f172a', size: 12.5 });
    if (S.obsRain > 0.3) D.ring(ox, oy, 15, t, { color: '#2563eb', speed: 1.4 });
    ctx.restore();
  }
  function barH(R, x, y, w, val, max, col) { const ww = clamp(val / max, 0, 1) * w; if (ww > 0.5) { ctx.fillStyle = col; rr(x, y, ww, R, 5).fill(); } }
  function drawRainPanels(t) {
    const Ra = PHONE ? { x: LR.x, y: LR.y, w: LR.w, h: 224 } : { x: LR.x, y: LR.y, w: 384, h: LR.h };
    const Rb = PHONE ? { x: LR.x, y: LR.y + 232, w: LR.w, h: 224 } : { x: LR.x + 396, y: LR.y, w: 384, h: LR.h };
    // (가) 시간 - 강수 그래프
    card(Ra, '시간별 강수 강도 (예시 모형)');
    const A = axesBox({ x: Ra.x, y: Ra.y + 6, w: Ra.w, h: Ra.h - 6 }, { x0: 0, x1: 3, y0: 0, y1: 80, xt: [0, 1, 2, 3], yt: [0, 30, 60], xf: (v) => v + '시간', pad: { l: 46, r: 14, t: 30, b: 28 } });
    const R = rateOf(S.V), cur = S.rtPlay || S.rt < 1 ? S.rt : 1;
    [0, 1, 2].forEach((h) => {
      const frac = clamp(cur * 3 - h, 0, 1); if (frac <= 0) return;
      const x0 = A.X(h + 0.12), x1 = A.X(h + 0.88), top = A.Y(R * frac);
      ctx.fillStyle = cellColor(R); rr(x0, top, x1 - x0, A.Y(0) - top, 4).fill();
      if (frac >= 1) D.text((x0 + x1) / 2, top - 6, R + ' mm/h', { size: 13, weight: 800, color: '#0f172a' });
    });
    ctx.save(); ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(A.B.x, A.Y(K.CRIT)); ctx.lineTo(A.B.x + A.B.w, A.Y(K.CRIT)); ctx.stroke(); ctx.restore();
    D.text(A.B.x + 6, A.Y(K.CRIT) - 6, '집중호우 기준 30 mm/h', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left', stroke: '#ffffff', strokeWidth: 4 });
    const cumNow = R * K.HOURS * cur;
    D.text(Ra.x + Ra.w - 14, Ra.y + 8 + 15 * FS, '누적 ' + Math.round(cumNow) + ' mm', { size: 15, weight: 800, color: '#0f172a', align: 'right' });
    if (cur > 0 && cur < 1) { const cx = A.X(cur * 3); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, A.B.y); ctx.lineTo(cx, A.B.y + A.B.h); ctx.stroke(); }
    // (나) 땅 위로 흐르는 물
    card(Rb, '1 km²에 내린 비는 어디로? (예시 모형)');
    const x0 = Rb.x + 118, wmax = Rb.w - 118 - 20, MAXV = 24;
    const vol = volOf(S.V), ratio = K.SURF[S.surf], run = vol * ratio;
    const rowY = Rb.y + 44 * FS;
    D.text(Rb.x + 14, rowY + 15, '내린 비', { size: 14, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#eef2f7'; rr(x0, rowY, wmax, 24, 6).fill();
    barH(24, x0, rowY, wmax, vol, MAXV, '#38bdf8');
    D.text(x0 + clamp(vol / MAXV, 0, 1) * wmax - 6, rowY + 17, vol + ' 만 m³', { size: 13.5, weight: 800, color: '#0c4a6e', align: 'right' });
    const row2 = rowY + 44 * FS;
    D.text(Rb.x + 14, row2 + 15, '지표 유출', { size: 14, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#eef2f7'; rr(x0, row2, wmax, 24, 6).fill();
    barH(24, x0, row2, wmax, run, MAXV, run > K.CAP ? '#dc2626' : '#16a34a');
    D.text(x0 + clamp(run / MAXV, 0, 1) * wmax + (run / MAXV > 0.75 ? -6 : 6), row2 + 17, fix(run, 1) + ' 만 m³', { size: 13.5, weight: 800, color: run / MAXV > 0.75 ? '#ffffff' : '#0f172a', align: run / MAXV > 0.75 ? 'right' : 'left' });
    // 배수 용량선
    const cx = x0 + (K.CAP / MAXV) * wmax;
    ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx, rowY - 6); ctx.lineTo(cx, row2 + 32); ctx.stroke(); ctx.restore();
    D.text(cx, row2 + 50 * FS, '배수 용량 ' + K.CAP + ' 만 m³', { size: 12.5, weight: 800, color: '#6d28d9' });
    const flood = run > K.CAP;
    lbl(Rb.x + Rb.w / 2, Rb.y + Rb.h - 22 * FS, SURF_NAME[S.surf] + '(유출 ' + Math.round(ratio * 100) + ' %) · ' + (flood ? '넘친 물 ' + fix(run - K.CAP, 1) + ' 만 m³ → 침수 위험' : '배수 용량 안 → 안전'), { bg: flood ? '#b91c1c' : '#15803d', size: 13 });
  }

  /* ======================================================
     STEP 3 : 폭설 · 강풍
     ====================================================== */
  function stepSnow(dt) {
    const dT = dTof(S.sst, S.tup), th = thickOf(dT);
    S.thickS = approach(S.thickS, th, dt, 3);
    S.ewS = approach(S.ewS, S.ew, dt, 3);
    if (!RM) {
      const R = MR, seaY = R.y + R.h - (PHONE ? 70 : 62), pxKm = (R.h - 90) / 6.6;
      if (S.mode === 'west') {
        S.vapAcc = (S.vapAcc || 0) + dt * (4 + S.sst * 2.2);
        while (S.vapAcc >= 1) { S.vapAcc -= 1; parts.emit({ x: R.x + R.w * rnd(0.2, 0.74), y: seaY - 2, vx: 16, vy: -rnd(30, 52), life: rnd(0.9, 1.5), size: 3, color: '#7dd3fc', shape: 'bubble' }); }
        if (th > 0.2) {
          S.snowAcc += dt * th * (th >= 3 ? 26 : 8);
          while (S.snowAcc >= 1) { S.snowAcc -= 1; const sx = R.x + R.w * rnd(0.72, 0.99); const sy = seaY - th * pxKm * 0.5 - 20 * U, vy = rnd(50, 80); parts.emit({ x: sx, y: sy, vx: -26, vy, life: Math.min(6, (seaY - 6 - sy) / vy), size: rnd(2, 3.2), color: '#ffffff', shape: 'circle', fade: false, alpha: 0.95 }); }
        }
      } else if (S.mode === 'east') {
        S.snowAcc += dt * S.ewS * 7;
        while (S.snowAcc >= 1) { S.snowAcc -= 1; parts.emit({ x: R.x + R.w * rnd(0.46, 0.70), y: R.y + R.h * rnd(0.22, 0.36), vx: -22 * S.ewS * 0.6, vy: rnd(40, 70), life: 1.5, size: rnd(1.8, 3), color: '#ffffff', shape: 'circle', fade: false, alpha: 0.95 }); }
      }
    }
  }
  function cloudBlob(x, y, w, h, alpha, col) {
    const n = Math.max(2, Math.round(w / (26 * U)));
    for (let i = 0; i < n; i++) {
      const f = i / Math.max(1, n - 1), cx = x + f * w, r = Math.max(10 * U, h * 0.5 * (0.8 + 0.2 * Math.sin(i * 1.9)));
      const g = ctx.createRadialGradient(cx - r * 0.3, y - r * 0.2, r * 0.1, cx, y, r);
      g.addColorStop(0, rgba('#ffffff', alpha)); g.addColorStop(1, rgba(col || '#c5d2e0', alpha));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.fill();
    }
  }
  function cloudBand(x0, x1, baseFn, hFn, dark) {
    const N = 48, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const x = lerp(x0, x1, i / N), b = baseFn(x), h = hFn(x) * Math.sqrt(Math.min(1, (x - x0) / (36 * U), (x1 - x) / (36 * U))); top.push([x, b - h]); bot.push([x, b]); }
    let minY = 1e9, maxB = -1e9; top.forEach((p) => { if (p[1] < minY) minY = p[1]; }); bot.forEach((p) => { if (p[1] > maxB) maxB = p[1]; });
    ctx.save();
    const g = ctx.createLinearGradient(0, minY, 0, maxB); g.addColorStop(0, '#ffffff'); g.addColorStop(1, mixc('#d3deea', '#8a9bb0', dark));
    ctx.fillStyle = g; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); ctx.fill();
    for (let i = 0; i <= N; i += 2) { const h = bot[i][1] - top[i][1]; if (h < 6) continue; const r = clamp(h * 0.3, 4, 24 * U); const gg = ctx.createRadialGradient(top[i][0] - r * 0.3, top[i][1] - r * 0.3, r * 0.1, top[i][0], top[i][1] + r * 0.2, r * 1.2); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, mixc('#d6e0ec', '#92a3b8', dark * 0.7)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(top[i][0], top[i][1] + r * 0.3, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawWest(t) {
    const R = MR, seaY = R.y + R.h - (PHONE ? 70 : 62), pxKm = (R.h - 90) / 6.6;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const sk = ctx.createLinearGradient(0, R.y, 0, seaY); sk.addColorStop(0, '#9ec3e0'); sk.addColorStop(1, '#dbe9f5'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, R.h);
    const xL = R.x + R.w * 0.16, xC = R.x + R.w * 0.76;
    // 대륙 · 바다 · 해안
    ctx.fillStyle = '#eef3f8'; ctx.fillRect(R.x, seaY - 10, xL - R.x, R.h); ctx.fillStyle = '#ffffff'; ctx.fillRect(R.x, seaY - 14, xL - R.x, 6);
    const sc = mixc('#3b8fd0', '#e08a4a', clamp((S.sst - 0) / 14, 0, 1) * 0.55);
    const sg = ctx.createLinearGradient(0, seaY, 0, R.y + R.h); sg.addColorStop(0, sc); sg.addColorStop(1, shade(sc, -0.3)); ctx.fillStyle = sg; ctx.fillRect(xL, seaY, xC - xL, R.y + R.h - seaY);
    ctx.fillStyle = '#c9d8a8'; ctx.fillRect(xC, seaY - 8, R.x + R.w - xC, R.h); ctx.fillStyle = '#f3f7fb'; ctx.fillRect(xC, seaY - 12, R.x + R.w - xC, 6);
    D.text((R.x + xL) / 2, seaY + 26 * FS, '시베리아·중국', { size: 12.5, weight: 800, color: '#475569' });
    D.text((xL + xC) / 2, seaY + 24 * FS, '서해  해수면 ' + S.sst + ' °C', { size: 14, weight: 800, color: '#ffffff', stroke: 'rgba(0,50,100,.55)' });
    D.text((xC + R.x + R.w) / 2, seaY + 26 * FS, '서해안', { size: 12.5, weight: 800, color: '#3c5a2a' });
    // 상공 1.5 km 선
    const y15 = seaY - 1.5 * pxKm;
    D.dashedLine(R.x + 8, y15, R.x + R.w - 8, y15, { color: 'rgba(30,64,120,.5)', width: 1.8 });
    D.text(R.x + 10, y15 - 6, '상공 약 1.5 km: ' + mn(S.tup, 0) + ' °C', { size: 13, weight: 800, color: '#1e4078', align: 'left', stroke: '#ffffff', strokeWidth: 4 });
    // 눈구름: 바다 위에서 점점 두꺼워져요
    const th = S.thickS;
    if (th > 0.05) cloudBand(xL, xC + (R.x + R.w - xC) * 0.1, () => seaY - 0.4 * pxKm, (x) => th * pxKm * smooth((x - xL) / (xC - xL) / 0.9), clamp(th / 6, 0, 1) * 0.8);
    // 찬 공기의 흐름 (왼쪽에서 오른쪽으로) — 바다 위를 지나며 데워져요
    const nA = 5;
    for (let i = 0; i < nA; i++) {
      const yy = seaY - [0.9, 2.3, 3.2, 4.1, 5.0][i] * pxKm, x1 = R.x + 20, x2 = R.x + R.w * 0.62;
      const f = (t * 0.1 + i / nA) % 1, px = lerp(x1, x2, f), warm = smooth((px - xL) / (xC - xL));
      D.arrow(px - 34 * U, yy, px + 6, yy, { color: mixc('#2563eb', '#f97316', warm), width: 4, head: 11, alpha: 0.9 });
    }
    lbl(R.x + R.w * 0.2, R.y + 24, '북서쪽의 차고 건조한 공기', { bg: '#2563eb', size: 13 });
    // 두께 표시자 (오른쪽 눈금)
    const tx = R.x + R.w - 44;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, seaY); ctx.lineTo(tx, seaY - K.TMAX * pxKm); ctx.stroke();
    for (let k = 0; k <= K.TMAX; k += 1) { ctx.beginPath(); ctx.moveTo(tx - 4, seaY - k * pxKm); ctx.lineTo(tx + 4, seaY - k * pxKm); ctx.stroke(); if (k % 2 === 0) D.text(tx - 8, seaY - k * pxKm + 4.5, k + ' km', { size: 12, weight: 700, color: '#475569', align: 'right' }); }
    ctx.restore();
    // 서해안 눈
    // (눈 입자는 parts)
  }
  function drawWestPanel(t) {
    const R = LR; card(R, '눈구름 두께 = (온도차 − ' + K.DT0 + ') ÷ ' + K.DT_PER_KM + ' (km, 교육용 근사)'.replace('÷', '/'));
    const dT = dTof(S.sst, S.tup), th = thickOf(dT);
    // 계산식
    const y1 = R.y + 22 * FS + 22;
    D.text(R.x + 16, y1 + 6, '온도차 = 해수면 온도 − 상공 기온', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(R.x + 16, y1 + 6 + 28 * FS, S.sst + ' − (' + mn(S.tup, 0) + ') = ' + dT + ' °C', { size: 22, weight: 800, color: dT >= K.SNOW_DT ? '#15803d' : '#0f172a', align: 'left' });
    // 두께 막대
    const bx = R.x + 16, by = y1 + 6 + 62 * FS, bw = R.w - 32;
    ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, 26, 8).fill();
    const ww = clamp(th / K.TMAX, 0, 1) * bw; if (ww > 0.5) { ctx.fillStyle = th >= 3 ? '#2563eb' : '#94a3b8'; rr(bx, by, ww, 26, 8).fill(); }
    const tx = bx + (3 / K.TMAX) * bw;
    ctx.save(); ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(tx, by - 6); ctx.lineTo(tx, by + 32); ctx.stroke(); ctx.restore();
    D.text(tx, by + 48 * FS, '3 km 이상이면 폭설 (온도차 ' + K.SNOW_DT + ' °C 이상)', { size: 12.5, weight: 800, color: '#b91c1c' });
    D.text(bx + Math.min(ww, bw) - 6, by + 18, fix(th, 1) + ' km', { size: 13.5, weight: 800, color: ww > 60 ? '#ffffff' : '#0f172a', align: ww > 60 ? 'right' : 'left' });
    const ok = dT >= K.SNOW_DT;
    lbl(R.x + R.w / 2, R.y + R.h - 20 * FS, ok ? '❄️ 눈구름이 두껍게 발달해요 → 서해안 폭설 가능' : '눈구름이 얇아요 → 많은 눈은 어려워요', { bg: ok ? '#1d4ed8' : '#64748b', size: 13.5 });
  }
  function drawEast(t) {
    const R = MR; ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const baseY = R.y + R.h - 56;
    const sk = ctx.createLinearGradient(0, R.y, 0, baseY); sk.addColorStop(0, '#a9c4dc'); sk.addColorStop(1, '#dce9f4'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, R.h);
    // 동해 (오른쪽), 태백산맥 (가운데), 서쪽 내륙
    const mx = R.x + R.w * 0.40, my = baseY - R.h * 0.36, xs = R.x + R.w * 0.66;
    ctx.fillStyle = '#3a8dc9'; ctx.fillRect(xs, baseY, R.x + R.w - xs, R.h);
    ctx.fillStyle = '#b8c79b'; ctx.fillRect(R.x, baseY, xs - R.x, R.h);
    ctx.fillStyle = '#8a9a6e'; ctx.beginPath(); ctx.moveTo(R.x, baseY); ctx.lineTo(R.x + R.w * 0.12, baseY - R.h * 0.08); ctx.lineTo(mx, my); ctx.lineTo(xs, baseY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f8fb'; ctx.beginPath(); ctx.moveTo(mx - 38 * U, my + 30 * U); ctx.lineTo(mx, my); ctx.lineTo(mx + 56 * U, my + 56 * U); ctx.lineTo(mx + 20 * U, my + 40 * U); ctx.closePath(); ctx.fill();
    D.text(mx + 70 * U, my + 78 * U, '태백산맥', { size: 13.5, weight: 800, color: '#ffffff', stroke: 'rgba(40,60,30,.6)' });
    D.text(xs + (R.x + R.w - xs) / 2, baseY + 24 * FS, '동해', { size: 14, weight: 800, color: '#ffffff', stroke: 'rgba(0,50,100,.5)' });
    D.text(R.x + R.w * 0.14, baseY + 24 * FS, '영서 (산 너머)', { size: 12.5, weight: 800, color: '#3c4a2a' });
    D.text(xs - 54 * U, baseY + 24 * FS, '영동 (동해안)', { size: 12.5, weight: 800, color: '#3c4a2a' });
    // 바람 (동해에서 산 비탈을 타고 올라가요) + 눈구름
    const s = S.ewS, th = K.EAST_K * s;                       // 비탈 위 눈구름 두께 (km)
    const pxKm = (R.h - 150) / 6.6;
    const nA = 4;
    for (let i = 0; i < nA; i++) {
      const f = (t * (0.08 + 0.05 * s) + i / nA) % 1, px = lerp(R.x + R.w - 30, mx + 30, f);
      const gy = baseY - clamp((xs - px) / (xs - mx), 0, 1) * (baseY - my), py = (px > xs ? baseY : gy) - 52 * U - i * 3 * U;
      D.arrow(px + 28 * U, py, px - 6, py - (px > xs ? 0 : 10 * U), { color: '#2563eb', width: 2.5 + s * 1.5, head: 10, alpha: 0.9 });
    }
    // 눈구름: 바람받이 비탈에서 두꺼워져요
    cloudBand(mx - 6, xs + 10, (x) => baseY - clamp((xs - x) / (xs - mx), 0, 1) * (baseY - my) - 12 * U, (x) => th * pxKm * smooth(1 - (x - (mx - 6)) / (xs + 10 - (mx - 6))), clamp(th / 6, 0, 1) * 0.8);
    lbl(R.x + R.w * 0.78, R.y + 24, '북동풍이 동해에서 불어와요', { bg: '#2563eb', size: 13 });
    lbl(R.x + R.w * 0.2, R.y + 24, '산을 넘으면 건조해져요 (눈이 적어요)', { bg: '#64748b', size: 12.5 });
    ctx.restore();
  }
  function drawEastPanel(t) {
    const R = LR; card(R, '동해안 지형성 강설 (모형)');
    const th = K.EAST_K * S.ew;
    const bx = R.x + 16, bw = R.w - 32, by = R.y + 70 * FS;
    D.text(R.x + 16, R.y + 50 * FS, '바람받이 비탈의 눈구름 두께 = ' + K.EAST_K + ' × 바람 세기(' + S.ew + ') = ' + fix(th, 1) + ' km', { size: 14, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, 26, 8).fill();
    const ww = clamp(th / K.TMAX, 0, 1) * bw; if (ww > 0.5) { ctx.fillStyle = '#2563eb'; rr(bx, by, ww, 26, 8).fill(); }
    D.text(bx + bw, by + 46 * FS, '0 ~ 6 km', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    drawWrap(R.x + R.w / 2, by + 74 * FS, '서해안은 "바다에서 얻은 열과 수증기", 동해안은 "산비탈을 타고 오르는 공기"가 눈구름을 키워요.', R.w - 40, 13.5, { color: '#1e293b' });
  }
  function isobars(R, d, name, hide) {
    // 등압선: 지도 R 안에 가로로 나란히, 간격 d km (지도 폭 = 480 km)
    const kmPx = R.w / 480, sp = d * kmPx, y0 = R.y + R.h * 0.30;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 12).clip();
    ctx.fillStyle = '#f3f8e9'; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.lineWidth = 2.6; ctx.strokeStyle = '#475569';
    for (let k = 0, y = y0; y < R.y + R.h - 30; k++, y += sp) {
      ctx.beginPath(); for (let x = R.x; x <= R.x + R.w; x += 8) { const yy = y + Math.sin((x - R.x) / R.w * Math.PI * 1.2) * 8 * U; x === R.x ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
      D.text(R.x + 12, y - 8, (1004 + 4 * k) + ' hPa', { size: 12.5, weight: 800, color: '#475569', align: 'left' });
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 12).stroke();
    D.text(R.x + 12, R.y + 22 * FS, '지도 ' + name, { size: 16, weight: 800, color: '#0f172a', align: 'left' });
    D.text(R.x + R.w - 10, R.y + 22 * FS, '등압선 4 hPa 간격', { size: 12, weight: 800, color: '#475569', align: 'right' });
    D.text(R.x + R.w - 10, R.y + R.h - 10, '북쪽(위)이 저기압', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    const v = windOf(d), L = clamp(v * 7.5 * U, 20, R.w * 0.8), ay = y0 + sp / 2;
    D.arrow(R.x + R.w / 2 - L / 2, ay, R.x + R.w / 2 + L / 2, ay, { color: '#e11d48', width: 4 + v * 0.18, head: 14 });
    lbl(R.x + R.w / 2, ay + 30 * U, hide ? '바람 ? m/s' : '바람 약 ' + v + ' m/s', { bg: hide ? '#64748b' : '#e11d48', size: 13 });
  }
  function drawWind(t) {
    const gap = 12, w = PHONE ? MR.w : (MR.w - gap) / 2, h = PHONE ? (MR.h - gap) / 2 : MR.h;
    const RA = { x: MR.x, y: MR.y, w, h }, RB = PHONE ? { x: MR.x, y: MR.y + h + gap, w, h } : { x: MR.x + w + gap, y: MR.y, w, h };
    isobars(RA, K.DA, 'A', !windOK()); isobars(RB, K.DB, 'B', !windOK());
  }
  const windOK = () => windCls.ok();
  function drawWindPanel(t) {
    const R = LR; card(R, '등압선 간격과 바람 세기');
    const lines = ['등압선 사이의 간격이 <b>좁을수록</b> 기압 차이가 커서 바람이 세게 불어요.'];
    drawWrap(R.x + R.w / 2, R.y + 56 * FS, '등압선이 촘촘할수록 기압이 가까운 거리에서 크게 변해요 → 바람이 세요', R.w - 40, 15, { color: '#1e293b' });
    const ya = R.y + 110 * FS;
    D.text(R.x + 20, ya, '지도 A: 간격 ' + K.DA + ' km', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    D.text(R.x + 20, ya + 26 * FS, '지도 B: 간격 ' + K.DB + ' km', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    D.text(R.x + R.w - 20, ya, windOK() ? '약 ' + windOf(K.DA) + ' m/s (약함)' : '풍속 ?', { size: 14.5, weight: 800, color: '#e11d48', align: 'right' });
    D.text(R.x + R.w - 20, ya + 26 * FS, windOK() ? '약 ' + windOf(K.DB) + ' m/s (강함)' : '풍속 ?', { size: 14.5, weight: 800, color: '#e11d48', align: 'right' });
    if (windOK()) D.text(R.x + R.w / 2, ya + 58 * FS, '풍속 = ' + K.VK + ' / 간격  (교육용 단순 모형)', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     STEP 4 : 황사
     ====================================================== */
  function dustX(h) { return clamp((K.DUST_V.indexOf(S.dust.v) >= 0 ? S.dust.v : 50) * h / K.DUST_KM, 0, 1); }
  function stepDust(dt) {
    const d = S.dust;
    if (d.running) {
      d.h += dt / 0.14;                                    // 화면에서는 1시간이 0.14초
      if (d.v * d.h >= K.DUST_KM) { d.h = K.DUST_KM / d.v; d.running = false; d.arrived = true; d.arrivedV = d.v; Sound.success(); showHint('도착! ' + K.DUST_KM + ' km를 ' + d.v + ' km/h로 가면 ' + (K.DUST_KM / d.v) + '시간이 걸려요.', 4200); }
    }
    S.dustT += dt;
    const R = MR, x0 = R.x + R.w * 0.10, x1 = R.x + R.w * 0.88, gy = R.y + R.h - (PHONE ? 90 : 78);
    if (!RM) {
      // 발원지에서 먼지가 솟아올라요
      S.dsAcc = (S.dsAcc || 0) + dt * 14;
      while (S.dsAcc >= 1) { S.dsAcc -= 1; parts.emit({ x: x0 + rnd(-30, 30) * U, y: gy - 6, vx: rnd(-4, 10), vy: -rnd(50, 80), life: 1.6, size: 6, grow: 5, color: 'rgba(196,146,70,.7)', shape: 'smoke' }); }
      if (d.running || d.h > 0) {
        const fx = x0 + (x1 - x0) * dustX(d.h), fy = gy - 0.34 * (R.h - 120);
        S.dsAcc2 = (S.dsAcc2 || 0) + dt * 24;
        while (S.dsAcc2 >= 1) { S.dsAcc2 -= 1; parts.emit({ x: fx + rnd(-14, 14), y: fy + rnd(-16, 16), vx: rnd(-14, 6), vy: rnd(-6, 6), life: 0.9, size: 7, grow: 4, color: 'rgba(196,146,70,.65)', shape: 'smoke' }); }
      }
    }
  }
  function drawDust(t) {
    const R = MR, x0 = R.x + R.w * 0.10, x1 = R.x + R.w * 0.88, gy = R.y + R.h - (PHONE ? 90 : 78), top = R.y + 44;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const sk = ctx.createLinearGradient(0, R.y, 0, gy); sk.addColorStop(0, '#b8cfe3'); sk.addColorStop(1, '#e6dcc3'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = '#d6b982'; ctx.fillRect(R.x, gy, R.x + R.w * 0.2 - R.x, R.h); ctx.fillStyle = '#9ec88a'; ctx.fillRect(R.x + R.w * 0.2, gy, R.w * 0.8, R.h);
    ctx.fillStyle = '#3a8dc9'; ctx.fillRect(R.x + R.w * 0.34, gy, R.w * 0.18, R.h);
    D.text(R.x + R.w * 0.10, gy + 22 * FS, '발원지', { size: 14, weight: 800, color: '#6b4a15' });
    D.text(R.x + R.w * 0.10, gy + 40 * FS, '(고비 사막·내몽골)', { size: 12, weight: 700, color: '#6b4a15' });
    D.text(R.x + R.w * 0.43, gy + 22 * FS, '서해', { size: 13.5, weight: 800, color: '#fff' });
    D.text(x1, gy + 22 * FS, '한반도', { size: 14, weight: 800, color: '#2c5a1f' });
    // 상승 → 편서풍 → 하강
    const hy = gy - 0.34 * (R.h - 120);
    D.arrow(x0, gy - 8, x0, hy - 6, { color: '#c2410c', width: 6, head: 16 });
    lbl(x0 + 4, gy - 0.18 * (R.h - 120), '저기압의 상승 기류', { bg: '#c2410c', size: 12.5, align: 'left' });
    D.arrow(x0 + 24 * U, hy, x1 - 30 * U, hy, { color: '#2563eb', width: 6, head: 16, alpha: 0.9 });
    lbl((x0 + x1) / 2, hy - 30 * U, '상층 편서풍 (서 → 동)', { bg: '#2563eb', size: 13 });
    D.arrow(x1 - 10 * U, hy + 4, x1 - 10 * U, gy - 8, { color: '#a16207', width: 5, head: 14, alpha: 0.85 });
    // 거리 눈금
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; const ry = gy + 58 * FS;
    ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke();
    [0, 1, 2].forEach((k) => { const xx = lerp(x0, x1, k / 2); ctx.beginPath(); ctx.moveTo(xx, ry - 5); ctx.lineTo(xx, ry + 5); ctx.stroke(); D.text(xx, ry + 20 * FS, (k * K.DUST_KM / 2) + ' km', { size: 12.5, weight: 800, color: '#334155' }); });
    // 황사 덩어리
    const d = S.dust, fx = x0 + (x1 - x0) * dustX(d.h);
    if (d.h > 0) {
      D.glow(fx, hy, 46 * U, '#b45309', 0.35);
      for (let k = 0; k < 7; k++) { const a = k * 2.4 + t * 0.7; D.sphere(fx + Math.cos(a) * 16 * U, hy + Math.sin(a) * 11 * U, 6 * U, '#b9873b', { gloss: false }); }
      if (d.arrived) { D.check(x1 - 30 * U, gy - 40 * U, 16, 1); }
    }
    ctx.restore();
    // 시계
    const hh = Math.floor(Math.min(d.h, K.DUST_KM / d.v) + 1e-6);
    lbl(R.x + R.w * 0.5, R.y + 24, '⏱ 출발 후 ' + hh + ' 시간 · ' + Math.min(K.DUST_KM, d.v * hh) + ' km 이동', { bg: '#1e293b', size: 14 });
  }
  function drawDustPanel(t) {
    const R = LR; card(R, '이동 시간 = 거리 ÷ 속력'.replace('÷', '/'));
    const v = S.dust.v;
    D.text(R.x + 18, R.y + 62 * FS, '거리 ' + K.DUST_KM + ' km · 속력 ' + v + ' km/h', { size: 16, weight: 800, color: '#334155', align: 'left' });
    D.text(R.x + 18, R.y + 96 * FS, '도착까지 ' + (S.dust.arrived && S.dust.arrivedV === v ? K.DUST_KM / v + ' 시간' : '? 시간'), { size: 24, weight: 800, color: '#b45309', align: 'left' });
    drawWrap(R.x + R.w / 2, R.y + R.h - 44 * FS, '황사는 발원지의 마른 흙먼지가 상승 기류로 높이 올라, 편서풍을 타고 한반도까지 와요.', R.w - 40, 13.5, { color: '#475569' });
  }

  /* ======================================================
     화면 전환 · 조작
     ====================================================== */
  let game = null;
  const MODE_LABEL = { storm: '⛈️ 뇌우', rain: '🌧️ 집중호우', west: '❄️ 서해안 눈', east: '🏔️ 동해안 눈', wind: '💨 강풍', dust: '🌫️ 황사' };
  const MODE_LV = { storm: 0, rain: 1, west: 2, east: 2, wind: 2, dust: 3 };
  let ctlKeys = [];
  function setCtl(keys) { ctlKeys = keys; updateCtl(); }
  const FREE_KEYS = { storm: ['stage'], rain: ['vap', 'surface'], west: ['sst'], east: ['ewind'], wind: ['windbox'], dust: ['dust'] };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const keys = game && game.free ? FREE_KEYS[S.mode] : ctlKeys;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    const seg = $('#modeSeg'), free = !!(game && game.free), lv = MODE_LV[S.mode];
    seg.hidden = !(free || lv === 2);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = !(free || (lv === 2 && MODE_LV[b.dataset.mode] === 2)); });
    $$('#surfBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.s === S.surf));
    $$('#dsBtns .opt').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.dust.v));
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); if (!(game && game.free)) ctlKeys = FREE_KEYS[b.dataset.mode]; updateCtl(); }));
  SciSim.bindRange($('#sStage'), null, null, (v) => { setStage(v); });
  $('#sStage').addEventListener('input', () => { setStage(+$('#sStage').value); Sound.tick(); });
  SciSim.bindRange($('#sVap'), $('#oVap'), (v) => '×' + v.toFixed(1), (v) => { S.V = v; S.rt = 1; S.rtPlay = false; });
  SciSim.bindRange($('#sSst'), $('#oSst'), (v) => v + ' °C', (v) => { S.sst = v; });
  SciSim.bindRange($('#sTup'), $('#oTup'), (v) => mn(v, 0) + ' °C', (v) => { S.tup = v; });
  const EWN = ['', '약함', '보통', '강함'];
  SciSim.bindRange($('#sEw'), $('#oEw'), (v) => EWN[v], (v) => { S.ew = v; });
  $('#bLight').addEventListener('click', () => { Sound.click(); strike(); });
  $('#bOrdReset').addEventListener('click', () => { Sound.click(); ord.reset(); });
  $$('#surfBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.surf = b.dataset.s; S.chk.surfSeen = true; updateCtl(); }));
  $('#bReplay').addEventListener('click', () => { Sound.click(); S.rt = 0; S.rtPlay = true; S.replays++; });
  $$('#dsBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.dust.running) return; S.dust.v = +b.dataset.v; S.dust.h = 0; S.dust.arrived = false; $('#oDs').textContent = S.dust.v + ' km/h'; updateCtl(); }));
  $('#bDust').addEventListener('click', () => { Sound.click(); S.dust.h = 0; S.dust.arrived = false; S.dust.running = true; });

  function resetStep(li) {
    hideHint(); parts.clear(); S.bolt = null; S.thunder = null; S.flashA = 0; S.popT = 0;
    S.rtPlay = false; S.rt = 1; S.dust.running = false; S.dust.h = 0; S.dust.arrived = false; S.dust.arrivedV = null;
    ord.reset(); windCls.reset(); match.reset();
    if (li === 0) { setMode('storm'); setStage(1, true); S.hail.laps = 0; S.hail.s = 0; S.hail.mode = 'loop'; S.lastDelay = null; S.lastDist = null; S.strikeIdx = 0; stpDist.reset(); setCtl(['stage']); showHint('슬라이더를 움직여 뇌우의 발달 단계를 살펴봐요', 5000); }
    else if (li === 1) { setMode('rain'); S.V = 1; setSlider($('#sVap'), $('#oVap'), 1, (v) => '×' + v.toFixed(1)); S.surf = 'city'; stpVol.reset(); S.cells = []; S.rt = 1; setCtl(['vap', 'vol']); showHint('수증기 공급 슬라이더를 올려 비구름이 지나가는 모습을 봐요', 5000); }
    else if (li === 2) { setMode('west'); S.sst = 8; S.tup = -4; setSlider($('#sSst'), $('#oSst'), 8, (v) => v + ' °C'); setSlider($('#sTup'), $('#oTup'), -4, (v) => mn(v, 0) + ' °C'); S.ew = 2; setSlider($('#sEw'), $('#oEw'), 2, (v) => EWN[v]); setCtl(['sst']); showHint('서해 수온과 상공 기온 슬라이더를 움직여 봐요', 5000); }
    else { setMode('dust'); S.dust.v = 50; $('#oDs').textContent = '50 km/h'; stpHr.reset(); setCtl(['dust', 'hours']); showHint('실제 악기상 특보는 기상청 날씨누리에서 확인해요', 5000); }
    updateCtl();
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const mdate = '';
  const levels = [
    {
      title: '뇌우: 적란운의 일생', short: '뇌우', icon: '⛈️', phase: '모형', features: ['storm'],
      intro: '<p class="si-q">❓ 탐구 질문: 여름 소나기, 장마철 폭우, 겨울 서해안의 눈은 각각 어떻게 만들어질까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 한랭 전선이 지나갈 때 적운형 구름에서 소나기가 내리고, 따뜻한 공기가 올라가면 구름이 생긴다고 배웠어요.</div>' +
        '<p>우리나라에는 <b>뇌우, 집중호우, 폭설, 강풍, 황사</b> 같은 악기상이 자주 나타나요. 먼저 <b>뇌우</b>예요. 뇌우는 <b>적란운</b>에서 번개·천둥·소나기(때로 우박)가 나타나는 현상이에요. 적란운 단면에서 <b>상승 기류와 하강 기류</b>가 어떻게 달라지는지 보고, 번개와 천둥의 시간 차로 거리를 재 봐요.</p>',
      setup() { resetStep(0); },
      recap: '뇌우는 적운 단계(상승 기류) → 성숙 단계(상승·하강 기류, 강한 비·번개) → 소멸 단계(하강 기류 우세)로 발달하고, 번개와 천둥의 시간 차로 거리를 구할 수 있어요.',
      summary: '<ul><li><b>뇌우</b>: 적란운에서 번개·천둥·소나기(때로 우박)가 나타나는 현상.</li><li>발달: <b>적운 단계</b>(상승 기류) → <b>성숙 단계</b>(상승·하강 기류 공존, 강한 비·번개) → <b>소멸 단계</b>(하강 기류 우세).</li><li><b>우박</b>: 강한 상승 기류 속에서 얼음 알갱이가 오르내리며 층 구조로 자라요.</li><li>번개 거리 = 소리의 속력(약 340 m/s) × 시간(s). 예) 5초 → 1.7 km.</li><li>대처: 건물·자동차 안으로 대피, 넓은 들판·나무 아래·물가 피하기.</li></ul>',
      missions: [
        {
          title: '발달 단계의 순서 정하기', manual: true,
          goal: '슬라이더로 <b>적운 → 성숙 → 소멸</b> 단계를 모두 살펴본 뒤, 일어나는 순서대로 설명 카드를 눌러요.',
          hint: '구름이 막 자랄 때는 상승 기류만 있어요. 비와 번개가 가장 강한 때는 하강 기류가 생긴 뒤예요.',
          setup() { setCtl(['stage', 'order']); },
          status: () => mark(ord.complete()) + ' 고른 카드 ' + ord.seq.length + ' / 3 · ' + mark(ord.ok()) + ' 순서',
          check() {
            if (!ord.complete()) return '카드 3장을 모두 눌러 순서를 정해 주세요. (지금 ' + ord.seq.length + '장)';
            if (!ord.ok()) { const i = ord.firstWrong(); ord.mark(ord.seq[i]); return (i + 1) + '번째로 고른 카드가 맞지 않아요. 슬라이더를 다시 움직이며 어떤 기류가 있는지 살펴봐요.'; }
            ord.mark(null); return true;
          },
          explain: '<b>적운 단계</b>에서는 상승 기류만 있어 구름이 자라고, <b>성숙 단계</b>에서는 상승·하강 기류가 함께 있어 강한 비·번개·우박이 나타나요. <b>소멸 단계</b>에서는 하강 기류가 우세해져 비가 약해지고 구름이 흩어져요.',
        },
        {
          title: '천둥소리로 번개까지의 거리 구하기',
          goal: '성숙 단계에서 <b>⚡ 번개 치게 하기</b>를 누르고, 번쩍인 뒤 천둥이 들릴 때까지 걸린 시간으로 번개까지의 <b>거리(km)</b>를 계산해 입력해요.',
          hint: '거리(m) = 340 m/s × 시간(초)예요. 시계가 멈추면 그 숫자를 쓰고, 1000 m = 1 km로 바꿔요.',
          setup() { S.thunder = null; S.bolt = null; S.lastDelay = null; S.lastDist = null; S.strikeIdx = 0; setStage(2, false); stpDist.reset(); setCtl(['stage', 'dist']); },
          check: () => S.lastDelay != null && !!S.thunder && S.thunder.arrived && Math.abs(stpDist.value - (K.SOUND * S.lastDelay) / 1000) <= 0.06, hold: 0.6,
          status: () => mark(S.lastDelay != null && !!S.thunder && S.thunder.arrived) + ' 시간 ' + (S.lastDelay != null && S.thunder && S.thunder.arrived ? S.lastDelay + '초' : '재는 중') + ' · ' + mark(S.lastDelay != null && Math.abs(stpDist.value - (K.SOUND * S.lastDelay) / 1000) <= 0.06) + ' 내 계산 ' + fix(stpDist.value, 1) + ' km',
          explain: '빛은 약 3×10⁸ m/s로 거의 바로 오지만 소리는 약 340 m/s라서, 번쩍인 뒤 시간이 지나 천둥이 들려요. 예를 들어 <b>5초</b> 뒤에 들렸다면 340 m/s × 5 s = 1700 m = <b>1.7 km</b>예요.',
        },
        {
          type: 'quiz', title: '뇌우가 칠 때의 대처',
          goal: '번개가 치는 뇌우 속에서 가장 안전한 행동은?',
          setup() { setCtl(['stage']); },
          choices: ['넓은 들판에서 우산을 높이 들고 서 있어요', '건물이나 자동차 안으로 들어가고, 나무 아래·높은 곳·물가는 피해요', '큰 나무 밑에서 비를 피해요', '수영장이나 바다에서 계속 물놀이를 해요'],
          answer: 1,
          feedback: ['우산을 든 사람이 가장 높은 물체가 되어 번개가 떨어질 위험이 커요.', '', '나무에 친 번개가 사람에게 옮겨 붙을 수 있어 위험해요.', '물가와 물속은 번개가 퍼지기 쉬워 매우 위험해요.'],
          explain: '번개는 높은 곳이나 뾰족한 물체로 떨어지기 쉬워요. <b>건물·자동차 안</b>으로 대피하고, 천둥이 멎은 뒤에도 30분쯤 기다리는 것이 좋아요.',
        },
      ],
    },
    {
      title: '집중호우: 줄지어 지나가는 비구름', short: '집중호우', icon: '🌧️', phase: '모형', features: ['rain'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 뇌우는 한 지역에 잠깐 강한 비를 내린다는 것을 알았어요. 이번에는 같은 곳에 비구름이 <b>계속 지나가는</b> 경우예요.</div>' +
        '<p>장마철에는 <b>장마 전선이 한곳에 머물고</b>, 북태평양 고기압 가장자리를 따라 <b>따뜻하고 습한 남서 기류</b>가 계속 들어와요. 그러면 비구름이 줄지어 같은 곳을 지나가 짧은 시간에 많은 비가 내려요. 1시간에 30 mm 이상이면 집중호우로 볼 수 있어요. 수증기 공급량에 따른 강수량을 계산하고, 땅의 모습에 따라 물이 어떻게 달라지는지 비교해요. (기온이 1 °C 오르면 포화 수증기량이 약 7 % 늘어요.)</p>',
      setup() { resetStep(1); },
      recap: '장마 전선이 머물고 수증기가 계속 공급되면 같은 곳에 비구름이 반복해서 지나가 집중호우가 생겨요. 포장 면적이 넓은 도시는 빗물이 한꺼번에 흘러 침수가 잘 일어나요.',
      summary: '<ul><li><b>집중호우</b>(예: 1시간 30 mm 이상): <b>장마 전선 정체</b> + 북태평양 고기압 가장자리로 따뜻하고 습한 공기가 계속 유입 → 비구름이 같은 지역을 반복 통과(선형 강수대).</li><li>기온이 1 °C 오르면 포화 수증기량이 약 7 % 늘어 더 많은 비를 만들 수 있어요.</li><li>강수량 환산: 1 mm × 1 km² = 1000 m³. 50 mm/h × 3 h = 150 mm → 1 km²에 15만 m³.</li><li><b>도시 홍수</b>: 불투수 면적(포장)이 넓을수록 빗물이 스며들지 못해 지표 유출 비율이 커져요(예시: 숲 10 %, 도시 80 %).</li><li>대처: 지하 공간·하천 둔치 접근 금지, 높은 곳으로 대피.</li></ul>',
      missions: [
        {
          title: '3시간에 150 mm 이상 만들고 부피로 바꾸기',
          goal: '수증기 공급량을 올려 <b>3시간 누적 강수량을 150 mm 이상</b>으로 만들고, 그 비가 1 km²에 내린 <b>부피(만 m³)</b>를 입력해요.',
          hint: '1 mm × 1 km² = 1000 m³예요. 누적 강수량(mm) × 1000을 m³로 구한 뒤 10000으로 나누면 만 m³예요. 150 mm이면 150000 m³ = 15만 m³.',
          setup() { S.V = 1; setSlider($('#sVap'), $('#oVap'), 1, (v) => '×' + v.toFixed(1)); stpVol.reset(); setCtl(['vap', 'vol']); },
          check: () => totalOf(S.V) >= 150 && stpVol.value === volOf(S.V), hold: 0.6,
          status: () => mark(totalOf(S.V) >= 150) + ' 3시간 누적 ' + totalOf(S.V) + ' mm (150 이상) · ' + mark(stpVol.value === volOf(S.V) && totalOf(S.V) > 0) + ' 입력 ' + stpVol.value + ' 만 m³',
          explain: '수증기가 많이 공급될수록 강수 강도가 커져요. 50 mm/h × 3 h = <b>150 mm</b>이고, 1 mm × 1 km² = 1000 m³이므로 150 × 1000 = 150000 m³ = <b>15만 m³</b>의 물이 1 km²에 쏟아진 거예요.',
        },
        {
          type: 'quiz', title: '도시에서 침수가 더 잘 나는 까닭',
          goal: '같은 150 mm의 비가 와도 숲(유출 1.5만 m³)보다 도시(유출 12만 m³)에서 침수가 더 잘 일어나요. 그 까닭은?',
          setup() { S.V = 2.5; setSlider($('#sVap'), $('#oVap'), 2.5, (v) => '×' + v.toFixed(1)); S.surf = 'city'; S.rt = 1; setCtl(['vap', 'surface']); },
          choices: ['도시에는 비구름이 더 많이 몰려와서', '도시의 땅은 비가 더 따뜻해서', '도시는 포장 면적이 넓어 빗물이 땅속으로 스며들지 못하고, 한꺼번에 지표를 따라 흘러 하수구와 하천으로 몰리기 때문이에요', '숲은 비를 모두 증발시켜서'],
          answer: 2,
          feedback: ['같은 비가 내리는 조건이에요. 달라지는 것은 땅의 모습이에요.', '비의 온도가 아니라 빗물이 흘러가는 길이 문제예요.', '', '숲에서는 흙과 식물이 물을 흡수하고 천천히 내보내요. 증발만으로 설명되지는 않아요.'],
          explain: '불투수 면적이 넓을수록 지표 유출 비율이 커져(숲 10 %, 도시 80 %) 짧은 시간에 많은 물이 배수 용량을 넘어요. 집중호우가 짧은 시간·좁은 지역에 몰리는 것은 장마 전선이 정체하고 비구름이 줄지어 같은 곳을 지나기 때문이에요.',
        },
      ],
    },
    {
      title: '폭설과 강풍: 바다와 지형의 영향', short: '폭설·강풍', icon: '❄️', phase: '탐구', features: ['snow'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 따뜻하고 습한 공기가 비구름을 만든다는 것을 확인했어요. 겨울에도 대기가 <b>바다에서 열과 수증기를 받으면</b> 구름이 크게 발달해요.</div>' +
        '<p><b>서해안 폭설</b>은 시베리아의 차고 건조한 공기가 상대적으로 따뜻한 서해 위를 지나면서 열과 수증기를 공급받아 눈구름이 발달해 생겨요. <b>동해안 폭설</b>은 북동풍이 태백산맥을 따라 올라가며 눈구름이 발달하는 지형성 강설이에요. 또 <b>강풍</b>은 일기도에서 등압선 간격이 좁을수록 세게 불어요. 세 장면을 차례로 탐구해요.</p>',
      setup() { resetStep(2); },
      recap: '서해안 폭설은 해수면과 상공 기온의 차이가 클수록, 동해안 폭설은 북동풍이 산비탈을 타고 오를수록 눈구름이 발달해요. 등압선 간격이 좁을수록 바람이 세요.',
      summary: '<ul><li><b>서해안 폭설</b>: 차고 건조한 시베리아 공기가 따뜻한 서해 위를 지나며 열·수증기를 공급받아 눈구름 발달. 해수면 온도와 상공(약 1.5 km) 기온의 차이가 클수록(교육용 기준 약 20 °C 이상) 눈구름이 두꺼워져요.</li><li><b>동해안 폭설</b>: 북동풍이 태백산맥을 따라 올라가며 눈구름이 발달하는 <b>지형성 강설</b>.</li><li><b>강풍</b>: 등압선이 촘촘할수록(기압 차가 클수록) 바람이 세요. 해안·산 정상에서 더 강하고, 겨울철 발달한 저기압·태풍·봄철 건조한 날에 자주 나타나요.</li><li>대처: 제설과 월동 장비, 간판·시설물 고정.</li></ul>',
      missions: [
        {
          title: '서해안 폭설 조건 만들기',
          goal: '해수면 온도와 상공 기온의 <b>차이를 20 °C 이상</b>으로 만들어 눈구름 두께를 3 km 이상으로 키워요.',
          hint: '상공 기온을 낮추거나(슬라이더를 왼쪽으로) 해수면 온도를 높여서 온도차 = 해수면 온도 − 상공 기온이 20 °C 이상이 되게 해요.',
          setup() { setMode('west'); S.sst = 8; S.tup = -4; setSlider($('#sSst'), $('#oSst'), 8, (v) => v + ' °C'); setSlider($('#sTup'), $('#oTup'), -4, (v) => mn(v, 0) + ' °C'); setCtl(['sst']); },
          check: () => dTof(S.sst, S.tup) >= K.SNOW_DT && S.mode === 'west', hold: 0.8,
          status: () => mark(dTof(S.sst, S.tup) >= K.SNOW_DT) + ' 온도차 ' + dTof(S.sst, S.tup) + ' °C (20 이상) · 눈구름 ' + fix(thickOf(dTof(S.sst, S.tup)), 1) + ' km (3 이상)',
          explain: '찬 공기가 따뜻한 바다 위를 지나면 바다에서 열과 수증기를 받아 아래층이 불안정해져요. 온도차가 클수록 눈구름이 더 두껍게 발달해 서해안에 폭설이 내려요. 서해 수온이 낮아지면 온도차가 줄어 눈구름이 약해져요.',
        },
        {
          title: '등압선 간격과 바람 세기 짝짓기', manual: true,
          goal: '<b>강풍</b> 탭의 두 일기도에서 등압선 간격을 비교하고, 지도 A와 B에 알맞은 바람을 골라요.',
          hint: '등압선이 촘촘한 지도일수록 가까운 거리에서 기압이 크게 변해 바람이 세게 불어요. 빨간 화살표가 긴 지도가 센 바람이에요.',
          setup() { setMode('wind'); windCls.reset(); setCtl(['windbox']); },
          status: () => mark(windCls.complete()) + ' 고른 지도 ' + windCls.count() + ' / 2 · ' + mark(windCls.ok()) + ' 짝',
          check() {
            if (!windCls.complete()) return '지도 A와 B 모두 바람을 골라 주세요.';
            const w = windCls.wrong(); windCls.mark(w);
            if (w.length) return '지도 ' + w.join(', ') + '의 바람을 다시 생각해 보세요. 등압선이 촘촘할수록 바람이 세요.';
            return true;
          },
          explain: '지도 A는 등압선 간격이 ' + K.DA + ' km로 넓어 바람이 약 ' + windOf(K.DA) + ' m/s로 약하고, 지도 B는 ' + K.DB + ' km로 촘촘해 약 ' + windOf(K.DB) + ' m/s로 세요. 기압 차가 클수록 공기가 빨리 움직여요.',
        },
        {
          type: 'quiz', title: '서해안 폭설과 동해안 폭설',
          goal: '서해안 폭설과 동해안 폭설이 생기는 주된 까닭을 알맞게 짝지은 것은?',
          setup() { setMode('west'); setCtl(['sst']); },
          choices: ['서해안은 차고 건조한 공기가 따뜻한 서해에서 열과 수증기를 얻어서, 동해안은 북동풍이 산맥을 타고 올라가서', '서해안은 북동풍이 산맥을 타고 올라가서, 동해안은 서해에서 열과 수증기를 얻어서', '둘 다 장마 전선이 정체해서', '둘 다 황사가 눈구름의 씨앗이 되어서'],
          answer: 0,
          feedback: ['', '두 지역의 원인이 거꾸로예요. 서해안은 바다에서 얻은 열·수증기, 동해안은 산맥(지형)이 핵심이에요.', '장마 전선은 여름의 집중호우 원인이에요. 겨울 폭설과는 달라요.', '황사는 봄철 현상이고, 눈구름의 발달 원인과는 관계가 없어요.'],
          explain: '서해안 폭설은 <b>바다의 열·수증기</b>가, 동해안 폭설은 <b>산맥을 따라 오르는 공기(지형)</b>가 눈구름을 키워요. 서해 수온이 낮아지면 해수면과 상공의 온도차가 줄어 눈구름이 얇아져요.',
        },
      ],
    },
    {
      title: '황사와 대처: 악기상에 대비하기', short: '황사·대처', icon: '🌫️', phase: '적용', features: ['dust'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 폭설과 강풍이 생기는 까닭을 알아봤어요. 이번에는 <b>멀리서 날아오는</b> 악기상인 황사를 살펴보고, 다섯 가지 악기상에 대한 대처 방안을 정리해요.</div>' +
        '<p><b>황사</b>는 발원지(고비 사막·내몽골·타클라마칸)가 봄철에 해빙으로 건조해지고, 강한 저기압의 <b>상승 기류</b>가 흙먼지를 높이 올리면 <b>상층 편서풍</b>을 타고 한반도에 도달하는 현상이에요. 이동 시간은 <b>거리 ÷ 속력</b>으로 구할 수 있어요. 실제 악기상 특보와 황사 정보는 기상청 날씨누리에서 확인할 수 있어요.</p>',
      setup() { resetStep(3); },
      recap: '황사는 발원지의 흙먼지가 상승 기류로 올라 편서풍을 타고 와요. 이동 시간 = 거리 ÷ 속력이고, 악기상마다 알맞은 대처 방안이 있어요.',
      summary: '<ul><li><b>황사</b>: 발원지(고비 사막·내몽골·타클라마칸)의 건조한 지표 + 강한 저기압의 상승 기류 → 상층 편서풍을 타고 한반도 도달. 이동 시간 = 거리 ÷ 속력 (2000 km ÷ 50 km/h = 40시간).</li><li>황사는 한반도에서 생긴 먼지가 아니라 <b>먼 곳의 흙먼지</b>예요.</li><li><b>대처</b>: 뇌우 – 건물 안으로 대피·금속 물체 멀리하기 / 집중호우 – 지하 공간·하천 접근 금지 / 폭설 – 제설과 월동 장비 / 강풍 – 간판·시설물 고정 / 황사 – 마스크 착용·외출 자제.</li><li>실시간 정보는 기상청 날씨누리에서 확인해요.</li></ul>',
      missions: [
        {
          title: '황사의 도착 시간 예측하기',
          goal: '황사가 <b>2000 km</b> 떨어진 한반도까지 상층 편서풍 <b>50 km/h</b>로 이동해요. 걸리는 시간을 입력하고 <b>▶ 황사 출발</b>로 확인해요.',
          hint: '시간 = 거리 ÷ 속력 = 2000 km ÷ 50 km/h예요. 속력을 50 km/h로 고르고 ▶를 눌러 도착 시간을 확인해 보세요.',
          setup() { S.dust.v = 50; S.dust.h = 0; S.dust.arrived = false; S.dust.arrivedV = null; $('#oDs').textContent = '50 km/h'; stpHr.reset(); setCtl(['dust', 'hours']); updateCtl(); },
          check: () => S.dust.v === 50 && stpHr.value === K.DUST_KM / 50 && S.dust.arrived && S.dust.arrivedV === 50, hold: 0.6,
          status: () => mark(S.dust.v === 50) + ' 속력 ' + S.dust.v + ' km/h · ' + mark(stpHr.value === K.DUST_KM / S.dust.v) + ' 예측 ' + stpHr.value + '시간 · ' + mark(S.dust.arrived && S.dust.arrivedV === 50) + ' 도착 확인',
          explain: '이동 시간 = 거리 ÷ 속력 = 2000 km ÷ 50 km/h = <b>40시간</b>이에요. 속력이 빠를수록(80 km/h → 25시간) 더 빨리 도착해요. 그래서 황사 예보는 발원지에서 먼지가 날리기 시작한 때부터 도착 시각을 미리 알려 줘요.',
        },
        {
          title: '악기상과 대처 방안 짝짓기', manual: true,
          goal: '다섯 가지 악기상에 알맞은 <b>대처 방안</b>을 하나씩 이어요.',
          hint: '뇌우는 번개를 피하는 것, 집중호우는 물이 모이는 곳을 피하는 것, 폭설은 쌓인 눈, 강풍은 날아갈 물건, 황사는 먼지를 막는 것이 핵심이에요.',
          setup() { match.reset(); setCtl(['match']); },
          status: () => mark(match.complete()) + ' 짝지은 것 ' + match.count() + ' / 5 · ' + mark(match.ok()) + ' 알맞음',
          check() {
            if (!match.complete()) return '악기상 5개를 모두 이어 주세요. (지금 ' + match.count() + '개)';
            const w = match.wrong(); match.mark(w);
            if (w.length) { const h = HAZ.find((x) => x.id === w[0]); return '"' + h.label.replace(/^\S+\s/, '') + '"' + josa(h.label.replace(/^\S+\s/, ''), '은/는') + ' 다른 대처 방안과 이어져 있어요. (빨간 칸 ' + w.length + '개)'; }
            return true;
          },
          explain: '뇌우는 <b>대피·금속 물체 멀리하기</b>, 집중호우는 <b>지하 공간·하천 접근 금지</b>, 폭설은 <b>제설과 월동 장비</b>, 강풍은 <b>시설물 고정</b>, 황사는 <b>마스크 착용·외출 자제</b>가 기본이에요.',
        },
        {
          type: 'quiz', title: '황사에 대한 옳은 설명',
          goal: '황사에 대한 설명으로 옳은 것은?',
          setup() { setCtl(['dust']); },
          choices: ['황사는 한반도의 도시에서 생긴 먼지가 모인 거예요', '황사는 남동풍을 타고 태평양에서 와요', '황사가 심한 날에는 얇은 천 마스크만 쓰면 충분해요', '황사는 발원지의 흙먼지가 상승 기류로 올라 편서풍을 타고 오므로, 심한 날엔 보건용 마스크를 쓰고 외출을 줄여요'],
          answer: 3,
          feedback: ['황사의 발원지는 한반도가 아니라 고비 사막·내몽골 같은 먼 곳이에요.', '우리나라 위쪽 상공에는 서쪽에서 동쪽으로 부는 편서풍이 불어서 황사도 서쪽에서 와요.', '황사 입자는 아주 작아서 천 마스크로는 잘 걸러지지 않아요. 보건용 마스크가 필요해요.', ''],
          explain: '황사는 <b>먼 발원지의 흙먼지</b>가 편서풍을 타고 오는 현상이에요. 심한 날에는 보건용 마스크를 쓰고 외출을 줄이며, 실시간 정보는 기상청 날씨누리에서 확인해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-severe-weather', mount: '#game', badge: '악기상 분석가', homeHref: '../../index.html#he',
    featureLabels: { storm: '⛈️ 발달 단계 슬라이더 · ⚡ 번개 · 천둥 시계', rain: '🌧️ 수증기 공급 슬라이더 · 강수 그래프 · 유출 막대', snow: '❄️ 해수면·상공 기온 · 동해안 · 등압선 지도', dust: '🌫️ 황사 이동 · 대처 방안 짝짓기' },
    onFeatures() { updateCtl(); },
    levels,
  });
  const origIntro = null;

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'storm') setReadouts(['발달 단계', STG[S.stage].name, '번쩍 → 천둥', S.lastDelay != null && S.thunder && S.thunder.arrived ? S.lastDelay + '초 (' + fix(K.SOUND * S.lastDelay / 1000, 2) + ' km)' : S.thunder ? '재는 중…' : '— (⚡를 눌러요)', '우박의 얼음 층', S.stage === 2 && S.pelVis > 0.5 ? Math.max(1, S.hail.mode === 'loop' ? S.hail.laps : 6) + '개' : '—']);
    else if (m === 'rain') setReadouts(['수증기 공급', '×' + S.V.toFixed(1), '강수 강도', rateOf(S.V) + ' mm/h' + (rateOf(S.V) >= K.CRIT ? ' (집중호우)' : ''), '3시간 누적', totalOf(S.V) + ' mm']);
    else if (m === 'west') { const dT = dTof(S.sst, S.tup); setReadouts(['해수면 − 상공 기온', dT + ' °C', '눈구름 두께', fix(thickOf(dT), 1) + ' km', '판정', dT >= K.SNOW_DT ? '폭설 가능' : '눈이 약함']); }
    else if (m === 'east') setReadouts(['북동풍', EWN[S.ew], '비탈 눈구름 두께', fix(K.EAST_K * S.ew, 1) + ' km', '원인', '지형(산맥)']);
    else if (m === 'wind') setReadouts(['지도 A 간격', K.DA + ' km', '지도 B 간격', K.DB + ' km', '바람', windOK() ? 'A 약 ' + windOf(K.DA) + ' · B 약 ' + windOf(K.DB) + ' m/s' : '비교해 보세요']);
    else setReadouts(['이동 거리', K.DUST_KM + ' km', '속력', S.dust.v + ' km/h', '도착까지', S.dust.arrived && S.dust.arrivedV === S.dust.v ? K.DUST_KM / S.dust.v + ' 시간' : S.dust.running ? '이동 중…' : '▶ 눌러 확인']);
  }

  /* ---------- 루프 ---------- */
  resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'storm') stepStorm(dt);
    else if (S.mode === 'rain') stepRain(dt);
    else if (S.mode === 'west' || S.mode === 'east') stepSnow(dt);
    else if (S.mode === 'dust') stepDust(dt);
    if (S.mode !== 'west' && S.mode !== 'east') { S.snowAcc = 0; }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#dcecf8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'storm') drawStorm(t);
    else if (S.mode === 'rain') { drawRainMap(t); drawRainPanels(t); }
    else if (S.mode === 'west') { drawWest(t); drawWestPanel(t); }
    else if (S.mode === 'east') { drawEast(t); drawEastPanel(t); }
    else if (S.mode === 'wind') { drawWind(t); drawWindPanel(t); }
    else { drawDust(t); drawDustPanel(t); }
    parts.draw(ctx);
    drawFlash(dt, S.mode === 'storm' ? 44 : 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    VW, VH, S, K, ord, stpDist, stpVol, stpHr, windCls, match, windOf, thickOf, totalOf, volOf, rateOf, setStage, setMode, strike, resetStep, MR, LR, G, INF,
    get game() { return game; },
    setV(v) { S.V = v; setSlider($('#sVap'), $('#oVap'), v, (x) => '×' + x.toFixed(1)); },
    setSnow(s, t) { S.sst = s; S.tup = t; setSlider($('#sSst'), $('#oSst'), s, (x) => x + ' °C'); setSlider($('#sTup'), $('#oTup'), t, (x) => mn(x, 0) + ' °C'); },
    finishThunder() { if (S.thunder) { S.thunder.t = S.thunder.delay + 1; } },
  };

})();
