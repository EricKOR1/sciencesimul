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
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 기후변화의 원인과 해결
     [12지구01-06] 기후변화의 원인(자연적·인위적 요인)과 인간 활동에 의한 기후변화의 해결 방법
     ① 분석: 기후 기록   ② 모형: 자연적 요인   ③ 분석: 인위적 요인   ④ 적용: 해결 방법
     ========================================================= */
  initStage('#e3eef7', 800, 560, 600, 880, 1.28);
  const U = VW / 800;
  const MR = PHONE ? { x: 8, y: 8, w: 584, h: 400 } : { x: 10, y: 10, w: 780, h: 340 };
  const LR = PHONE ? { x: 8, y: 416, w: 584, h: 456 } : { x: 10, y: 358, w: 780, h: 192 };

  /* ---------- 본문에 쓰는 숫자는 모두 여기서 가져와요 (예시 자료) ---------- */
  const K = {
    C0: 280, CNOW: 420, SENS: 0.8,                    // 산업화 이전·현재 CO₂ (ppm), 평형 기온 상승 = 0.8 °C ÷ (W/m²) × ΔF
    F: [['이산화 탄소', 2.16], ['메테인', 0.54], ['아산화 질소', 0.21], ['할로겐 화합물', 0.41], ['대류권 오존', 0.47], ['에어로졸', -1.10]],  // 인위적 요인 (W/m²)
    SUN: 0.01,                                       // 태양 활동 (자연적 요인)
    Q0: 480, K_EPS: 6, EPS0: 23.3,                   // 북위 65° 6월 하지 일사량(원 궤도·기울기 23.3°) W/m², 기울기 1°당 변화 (교육용 근사)
    ALB_ICE: 0.8, ALB_REST: 0.10,                    // 얼음의 반사율, 숲·바다의 평균 반사율
    VOLC_MIN: -0.5,                                  // 1991 피나투보형 분출의 최저 기온 편차
    RATE: 2.4, SINK: 0.5, Y0: 2025, Y1: 2100, YCUT: 2050,   // 배출 100 %일 때 CO₂ 증가 속도(ppm/년), 흡수원 몫, 시나리오 연도
    MEAS: { ren: ['재생 에너지 확대', 25, '#f59e0b'], eff: ['에너지 효율 개선', 15, '#0ea5e9'], for: ['산림 보전·조림', 10, '#16a34a'], ccs: ['탄소 포집·저장', 5, '#8b5cf6'] },
  };
  const forceCo2 = (c) => 5.35 * Math.log(Math.max(c, 1) / K.C0);                // ΔF = 5.35 ln(C / 280)
  const teq = (c) => K.SENS * forceCo2(c);
  const ANTHRO = K.F.reduce((s, f) => s + f[1], 0);                                // 인위적 요인의 합 (예시: 약 +2.7)
  const fmtAge = (a) => (a === 0 ? '현재' : fix(a / 10, 1) + '만 년 전');

  /* ---------- 최근 80만 년 CO₂와 기온 (예시 자료: 빙하 코어 모양을 단순화) ---------- */
  const TERM = [0, 11, 128, 245, 335, 430, 535, 625, 715, 810];
  const rawT = (a) => {
    let i = 0; while (i < TERM.length - 2 && a >= TERM[i + 1]) i++;
    const young = TERM[i], old = TERM[i + 1]; let T;
    if (a < 11) T = 0.2; else { const f = (old - a) / (old - young); T = f < 0.1 ? 0.8 - 0.3 * (f / 0.1) : f < 0.92 ? 0.5 - 6.6 * Math.pow((f - 0.1) / 0.82, 1.1) : -6.1 + 6.6 * smooth((f - 0.92) / 0.08); }
    return T + 0.3 * Math.sin(2 * Math.PI * a / 41) + 0.2 * Math.sin(2 * Math.PI * a / 23 + 1);
  };
  const T00 = rawT(0);
  const AG = []; for (let a = 0; a <= 800; a += 5) { const T = Math.round((rawT(a) - T00) * 10) / 10, C = Math.round(clamp(180 + (100 * (T + 6.5)) / 6.9, 180, 290)); AG.push({ a, T, C }); }
  const atAge = (a) => AG[clamp(Math.round(a / 5), 0, AG.length - 1)];
  const GLACIAL_T = -4.5, INTER_T = -1.0;
  /* 최근 150여 년 (예시) */
  const YR = [];
  { const r = seeded(21); for (let y = 1850; y <= 2022; y++) YR.push({ y, C: Math.round(280 + 140 * Math.pow((y - 1850) / 172, 2.5)), T: Math.round((y < 1910 ? 0 : 1.25 * Math.pow((y - 1910) / 112, 2.0)) * 100 + (r() - 0.5) * 18) / 100 }); }
  /* 관측 · 모의 기온 곡선 (예시) */
  const VOLS = [[1883, 0.25], [1902, 0.12], [1963, 0.15], [1982, 0.18], [1991, 0.30]];
  const volDip = (t) => (t < 0 ? 0 : t * Math.exp(1 - t));
  const natural = (y) => 0.05 * Math.sin((2 * Math.PI * (y - 1850)) / 11) + 0.04 * Math.sin((2 * Math.PI * (y - 1850)) / 90) - VOLS.reduce((s, v) => s + v[1] * volDip(y - v[0]), 0);
  const humanF = (y) => (y < 1900 ? 0 : 1.2 * Math.pow((y - 1900) / 120, 2.3));
  const OBS = [], SNAT = [], SALL = [];
  { const r = seeded(5), r2 = seeded(9), r3 = seeded(13); for (let y = 1850; y <= 2020; y++) { const n = natural(y), h = humanF(y); OBS.push({ y, v: Math.round((n + h + (r() - 0.5) * 0.14) * 100) / 100 }); SNAT.push({ y, v: Math.round((n + (r2() - 0.5) * 0.06) * 100) / 100 }); SALL.push({ y, v: Math.round((n + h + (r3() - 0.5) * 0.06) * 100) / 100 }); } }
  /* 미래 시나리오 */
  function scen(cut) {
    const out = []; let c = K.CNOW;
    for (let y = K.Y0; y <= K.Y1; y++) {
      out.push({ y, c, t: teq(c) });
      const e = y < K.YCUT ? 1 - (cut * (y - K.Y0)) / (K.YCUT - K.Y0) : 1 - cut;
      c += (K.RATE * (e - K.SINK)) / K.SINK;
    }
    return out;
  }
  const BASE = scen(0);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'record', clock: 0, fade: 0, draw: 0, cur: 0, marks: [], dragCore: false,
    e: 0.03, eps: 23.3, phi: 0, eS: 0.03, epsS: 23.3, phiS: 0,
    vt: 6, vrun: false, volcanoRuns: 0,
    ice: 20, iceS: 20, pulse: 0, warmN: 0,
    co2: 280, co2S: 280, barP: 0, sumShown: false, simShown: false,
    picks: new Set(), cutS: 0, evc: BASE.map((r) => r.c), evt: BASE.map((r) => r.t), evInit: false,
    sub: 0,
  };
  S.bub = []; { const r = seeded(33); for (let i = 0; i < 230; i++) S.bub.push({ a: r() * 800, dx: r() * 2 - 1, r: 1.6 + r() * 1.8 }); }

  /* ---------- HTML 도구 ---------- */
  const clsTime = makeClassify($('#clsTime'), [
    { id: 'vo', label: '🌋 화산 활동 (대규모 분출 뒤 에어로졸)' }, { id: 'su', label: '☀️ 태양 활동의 변화 (흑점 주기 등)' }, { id: 'hu', label: '🏭 인간 활동 (산업화 이후 온실 기체 배출)' },
    { id: 'or', label: '🪐 지구 공전 궤도·자전축의 변화' }, { id: 'pl', label: '🌏 판(대륙)의 이동' }],
  [{ id: 's1', label: '수 년' }, { id: 's2', label: '수십~수백 년' }, { id: 's3', label: '수만~10만 년' }, { id: 's4', label: '수백만 년 이상' }], { vo: 's1', su: 's2', hu: 's2', or: 's3', pl: 's4' });
  const NATIDS = [
    { id: 'a', label: '☀️ 태양 활동의 변화' }, { id: 'b', label: '🪐 지구 공전 궤도 요소의 변화' }, { id: 'c', label: '🌋 화산 활동' }, { id: 'd', label: '🌊 해양 순환의 변화' },
    { id: 'e', label: '🌏 판(대륙)의 이동' }, { id: 'f', label: '🛢️ 화석 연료 사용 (온실 기체 배출)' }, { id: 'g', label: '🪓 삼림 벌채' }];
  const clsNat = makeClassify($('#clsNat'), NATIDS, [{ id: 'ext', label: '자연적<br>(지구 외부)' }, { id: 'int', label: '자연적<br>(지구 내부)' }, { id: 'hum', label: '인위적' }], { a: 'ext', b: 'ext', c: 'int', d: 'int', e: 'int', f: 'hum', g: 'hum' });
  const stpF = makeStepper($('#stpF'), { min: 0, max: 5, step: 0.1, value: 0, dec: 1, unit: 'W/m²' });
  const stpSum = makeStepper($('#stpSum'), { min: -2, max: 6, step: 0.1, value: 0, dec: 1, unit: 'W/m²' });
  const clsSim = makeClassify($('#clsSim'), [{ id: 'A', label: '모의 곡선 A (주황 점선)' }, { id: 'B', label: '모의 곡선 B (초록 점선)' }],
    [{ id: 'nat', label: '자연 요인만' }, { id: 'all', label: '자연 + 인위 요인' }], { A: 'nat', B: 'all' });
  const clsAdapt = makeClassify($('#clsAdapt'), [
    { id: 'a', label: '재생 에너지 발전소를 늘려요' }, { id: 'b', label: '해안 제방을 높이 쌓아요' }, { id: 'c', label: '숲을 보전하고 나무를 심어요' }, { id: 'd', label: '가뭄에 강한 작물을 개발해요' },
    { id: 'e', label: '폭염·홍수 조기 경보 체계를 만들어요' }, { id: 'f', label: '건물의 에너지 효율을 높여요' }, { id: 'g', label: '배출된 이산화 탄소를 포집해 저장해요' }],
  [{ id: 'mit', label: '완화' }, { id: 'ada', label: '적응' }], { a: 'mit', b: 'ada', c: 'mit', d: 'ada', e: 'ada', f: 'mit', g: 'mit' });
  const cutOf = () => [...S.picks].reduce((s, k) => s + K.MEAS[k][1], 0);

  /* ======================================================
     1. 기후 기록: 빙하 코어와 80만 년 그래프
     ====================================================== */
  const PADR = { l: 46, r: 46, t: 46, b: 30 };
  const recLay = () => {
    const cw = PHONE ? 104 : 136, Rc = { x: MR.x, y: MR.y, w: cw, h: MR.h }, Rg = { x: MR.x + cw + 8, y: MR.y, w: MR.w - cw - 8, h: MR.h };
    const B = { x: Rg.x + PADR.l, y: Rg.y + PADR.t, w: Rg.w - PADR.l - PADR.r, h: Rg.h - PADR.t - PADR.b };
    return { Rc, Rg, B, X: (a) => B.x + B.w * (1 - a / 800), ageAt: (x) => clamp((1 - (x - B.x) / B.w) * 800, 0, 800) };
  };
  const tMap = (T) => 150 + ((T + 9) / 12) * 300;
  function setCur(a, silent) { S.cur = clamp(Math.round(a / 5) * 5, 0, 800); setSlider($('#sAge'), $('#oAge'), S.cur, fmtAge); }
  function drawRecord(t) {
    const L = recLay(), { Rc, Rg, B, X } = L;
    // 빙하 코어
    card(Rc, '빙하 코어');
    const cx = Rc.x + Rc.w * 0.6, top = Rc.y + 52 * FS, bot = Rc.y + Rc.h - 26 * FS, cwid = 46 * U * (PHONE ? 0.9 : 1);
    const yA = (a) => top + ((bot - top) * a) / 800, revA = S.draw * 800;
    ctx.save(); rr(cx - cwid / 2, top, cwid, bot - top, 10).clip();
    ctx.fillStyle = '#eef6fc'; ctx.fillRect(cx - cwid / 2, top, cwid, bot - top);
    for (let a = 0; a < 800; a += 10) { if (a > revA) break; const d = atAge(a + 5); ctx.fillStyle = mixc('#dff0fb', '#a9cdea', clamp((-d.T) / 7, 0, 1)); ctx.fillRect(cx - cwid / 2, yA(a), cwid, Math.max(1, yA(Math.min(a + 10, revA)) - yA(a))); }
    S.bub.forEach((b) => { if (b.a > revA) return; const d = atAge(b.a); ctx.fillStyle = mixc('#d9ecff', '#1d4ed8', clamp((d.C - 180) / 110, 0, 1)); ctx.beginPath(); ctx.arc(cx + b.dx * cwid * 0.36, yA(b.a), b.r * U, 0, TAU); ctx.fill(); });
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.5; rr(cx - cwid / 2, top, cwid, bot - top, 10).stroke();
    // 시추기
    if (S.draw < 0.999) { const dy = yA(revA); ctx.fillStyle = '#64748b'; ctx.fillRect(cx - 4, top - 30 * FS, 8, dy - top + 30 * FS); ctx.beginPath(); ctx.moveTo(cx - cwid / 2 - 4, dy); ctx.lineTo(cx + cwid / 2 + 4, dy); ctx.lineTo(cx, dy + 14 * U); ctx.closePath(); ctx.fillStyle = '#f59e0b'; ctx.fill(); if (!RM) parts.emit({ x: cx + rnd(-10, 10), y: dy + 12 * U, vx: rnd(-30, 30), vy: -rnd(20, 50), life: 0.5, size: 2.2, color: '#e2e8f0', gravity: 120 }); }
    [[0, '현재'], [400, '40만'], [800, '80만']].forEach(([a, n]) => D.text(cx - cwid / 2 - 5, yA(a) + (a === 0 ? 12 : a === 800 ? -2 : 5), n, { size: 11.5, weight: 800, color: '#475569', align: 'right' }));
    if (S.draw > 0.02) { const my = yA(clamp(S.cur, 0, revA)); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - cwid / 2 - 8, my); ctx.lineTo(cx + cwid / 2 + 8, my); ctx.stroke(); D.sphere(cx - cwid / 2 - 8, my, 4.5, '#ef4444', { gloss: false }); }
    D.text(cx, bot + 17 * FS, '기포 = 옛 공기', { size: 11.5, weight: 800, color: '#1d4ed8' });
    // 그래프
    card(Rg, '');
    D.text(Rg.x + 14, Rg.y + 8 + 15 * FS, '최근 80만 년의 CO₂와 기온 편차 (예시 자료)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const ax = axesBox(Rg, { x0: 800, x1: 0, y0: 150, y1: 450, xt: [800, 600, 400, 200, 0], xf: (v) => (v === 0 ? '현재' : v / 10 + '만 년 전'), yt: [200, 300, 400], yf: (v) => v, pad: PADR });
    D.text(B.x - 40, B.y - 8, 'CO₂(ppm)', { size: 12, weight: 800, color: '#2563eb', align: 'left' }); D.text(B.x + B.w + 40, B.y - 8, '기온 편차(°C)', { size: 12, weight: 800, color: '#dc2626', align: 'right' });
    [-6, -3, 0].forEach((v) => D.text(B.x + B.w + 6, ax.Y(tMap(v)) + 4.5, (v < 0 ? '−' : '') + Math.abs(v), { size: 12.5, weight: 700, color: '#dc2626', align: 'left' }));
    const rv = AG.filter((d) => d.a <= revA);
    polyline(rv.map((d) => [d.a, d.C]), '#2563eb', 3, ax.X, ax.Y, B); polyline(rv.map((d) => [d.a, tMap(d.T)]), '#dc2626', 3, ax.X, ax.Y, B);
    // 현재 420 ppm
    if (S.draw > 0.98) { D.sphere(X(0), ax.Y(K.CNOW), 6 * U, '#7c3aed', { gloss: false }); D.label(X(0) - 8, ax.Y(K.CNOW) - 14 * U, '현재 약 ' + K.CNOW + ' ppm', { bg: '#7c3aed', size: 12, pad: 6, align: 'right' }); }
    // 표시
    S.marks.forEach((m, i) => { const mx = X(m.a); ctx.strokeStyle = m.kind === 'g' ? '#1d4ed8' : m.kind === 'i' ? '#c2410c' : '#64748b'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mx, B.y); ctx.lineTo(mx, B.y + B.h); ctx.stroke(); ctx.setLineDash([]); D.sphere(mx, B.y + 8, 9, ctx.strokeStyle, { text: String(i + 1), gloss: false }); });
    // 커서
    if (S.draw > 0.02) {
      const cA = clamp(S.cur, 0, revA), d = atAge(cA), mx = X(cA);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(mx, B.y); ctx.lineTo(mx, B.y + B.h); ctx.stroke();
      D.sphere(mx, ax.Y(d.C), 5.5, '#2563eb', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); D.sphere(mx, ax.Y(tMap(d.T)), 5.5, '#dc2626', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      const tx = clamp(mx, B.x + 90 * U, B.x + B.w - 90 * U);
      D.label(tx, B.y + B.h - 16 * FS, fmtAge(cA) + ' · CO₂ ' + d.C + ' ppm · ' + sgn(d.T, 1) + ' °C', { bg: '#1e293b', size: 12.5, pad: 7 });
    }
  }
  function drawZoom(t, R) {
    card(R, '최근 150여 년 확대 (예시 자료)');
    const ax = axesBox({ x: R.x, y: R.y + 6, w: R.w, h: R.h - 6 }, { x0: 1850, x1: 2022, y0: 260, y1: 440, xt: [1850, 1900, 1950, 2000], yt: [300, 350, 400], pad: { l: 44, r: 44, t: 44, b: 24 } });
    const tm = (T) => 260 + ((T + 0.4) / 2.0) * 180, p = S.draw >= 0.98 ? 1 : 0.3 + S.draw * 0.7;
    polyline(YR.map((d) => [d.y, d.C]), '#2563eb', 2.6, ax.X, ax.Y, ax.B); polyline(YR.map((d) => [d.y, tm(d.T)]), '#dc2626', 2.2, ax.X, ax.Y, ax.B);
    [0, 1].forEach((v) => D.text(ax.B.x + ax.B.w + 5, ax.Y(tm(v)) + 4.5, String(v), { size: 12, weight: 700, color: '#dc2626', align: 'left' }));
    D.text(ax.B.x - 38, ax.B.y - 7, 'CO₂(ppm)', { size: 11.5, weight: 800, color: '#2563eb', align: 'left' }); D.text(ax.B.x + ax.B.w + 38, ax.B.y - 7, '기온 편차(°C)', { size: 11.5, weight: 800, color: '#dc2626', align: 'right' });
    const last = YR[YR.length - 1]; D.label(ax.X(2008) - 4, ax.Y(last.C) + 10, 'CO₂ ' + last.C + ' ppm', { bg: '#2563eb', size: 12, pad: 6, align: 'right' });
  }
  function drawRecInfo(t, R) {
    card(R, '기록에서 읽을 수 있는 것');
    const last = YR[YR.length - 1], rows = [
      '빙기와 간빙기가 약 10만 년 주기로 되풀이되고, CO₂와 기온이 함께 변해요 (CO₂ ' + Math.min(...AG.map((d) => d.C)) + ' ~ ' + Math.max(...AG.map((d) => d.C)) + ' ppm).',
      '최근 150여 년: CO₂ ' + YR[0].C + ' → ' + last.C + ' ppm (+' + (last.C - YR[0].C) + ' ppm), 기온 편차 약 ' + sgn(last.T, 1) + ' °C.',
      '현재 CO₂(약 ' + K.CNOW + ' ppm)는 80만 년 동안의 최댓값(' + Math.max(...AG.map((d) => d.C)) + ' ppm)보다 훨씬 높아요.'];
    let y = R.y + 40 * FS;
    rows.forEach((r) => { y = drawWrap(R.x + R.w / 2, y, r, R.w - 30, 13.5, { color: '#1e293b', align: 'center', lh: 1.28 }) + 24 * FS * 0.95; });
    drawWrap(R.x + R.w / 2, R.y + R.h - 20 * FS, '※ 예시 자료예요. 실제 자료는 기상청 기후정보포털 등에서 확인해요.', R.w - 30, 12.5, { color: '#64748b', weight: 700 });
  }

  /* ======================================================
     2. 자연적 요인
     ====================================================== */
  const Qsun = (e, eps, phi) => (K.Q0 + K.K_EPS * (eps - K.EPS0)) * Math.pow((1 + e * Math.cos((phi * Math.PI) / 180)) / (1 - e * e), 2);
  const rAU = (e, phi) => (1 - e * e) / (1 + e * Math.cos((phi * Math.PI) / 180));
  function drawOrbit(t) {
    const Ro = PHONE ? { x: MR.x, y: MR.y, w: MR.w, h: 200 } : { x: MR.x, y: MR.y, w: MR.w * 0.46, h: MR.h };
    const Rq = PHONE ? { x: MR.x, y: MR.y + 208, w: MR.w, h: 192 } : { x: MR.x + MR.w * 0.46 + 8, y: MR.y, w: MR.w * 0.54 - 8, h: MR.h };
    card(Ro, '지구의 공전 궤도 (위에서 본 모습)');
    const ed = Math.min(S.eS * 8, 0.5), a = Math.min(Ro.w * 0.34, Ro.h * 0.30), cx0 = Ro.x + Ro.w * 0.47, cy0 = Ro.y + Ro.h * (PHONE ? 0.56 : 0.5), b = a * Math.sqrt(1 - ed * ed), sx = cx0 + a * ed;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(cx0, cy0, a, b, 0, 0, TAU); ctx.stroke();
    D.glow(sx, cy0, 36 * U, '#fbbf24', 0.5); D.sphere(sx, cy0, 15 * U, '#fbbf24', { gloss: true });
    D.text(cx0 + a + 4, cy0 + 4, '근일점', { size: 11.5, weight: 800, color: '#64748b', align: 'left' }); D.text(cx0 - a - 4, cy0 + 4, '원일점', { size: 11.5, weight: 800, color: '#64748b', align: 'right' });
    const th = (S.phiS * Math.PI) / 180, r = (a * (1 - ed * ed)) / (1 + ed * Math.cos(th)), ex = sx + r * Math.cos(th), ey = cy0 - r * Math.sin(th);
    D.dashedLine(sx, cy0, ex, ey, { color: '#f59e0b', width: 2 });
    D.sphere(ex, ey, 10 * U, '#3b82f6', { gloss: true }); D.label(ex, ey - 22 * U, '6월 하지', { bg: '#0369a1', size: 12, pad: 6 });
    D.text(cx0, Ro.y + Ro.h - 26 * FS, '이심률 ' + fix(S.eS, 2) + ' (그림은 8배로 과장해요)', { size: 12, weight: 800, color: '#334155' }); D.text(cx0, Ro.y + Ro.h - 8, '6월 하지의 태양 거리 ' + fix(rAU(S.eS, S.phiS), 3) + ' AU', { size: 12, weight: 800, color: '#334155' });
    // 자전축 기울기 (작은 그림)
    const gx = Ro.x + 50 * U, gy = Ro.y + 82 * U, gr = 26 * U;
    D.sphere(gx, gy, gr, '#60a5fa', { gloss: true });
    const ang = (S.epsS * Math.PI) / 180; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - Math.sin(ang) * (gr + 14), gy + Math.cos(ang) * (gr + 14)); ctx.lineTo(gx + Math.sin(ang) * (gr + 14), gy - Math.cos(ang) * (gr + 14)); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, gy + gr + 14); ctx.lineTo(gx, gy - gr - 14); ctx.stroke(); ctx.setLineDash([]);
    D.text(gx, gy + gr + 30 * FS, '기울기 ' + fix(S.epsS, 1) + '°', { size: 12, weight: 800, color: '#1e293b' });
    // 일사량 곡선
    card(Rq, '');
    D.text(Rq.x + 14, Rq.y + 8 + 15 * FS, '북위 65° 6월 하지 일사량 (W/m²)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const ax = axesBox(Rq, { x0: 0, x1: 360, y0: 400, y1: 560, xt: [0, 90, 180, 270, 360], xf: (v) => v + '°', yt: [400, 450, 500, 550], pad: { l: 46, r: 14, t: 34, b: 40 } });
    const base = K.Q0 + K.K_EPS * (S.epsS - K.EPS0);
    const pts = []; for (let p = 0; p <= 360; p += 6) pts.push([p, Qsun(S.eS, S.epsS, p)]);
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ax.B.x, ax.Y(base)); ctx.lineTo(ax.B.x + ax.B.w, ax.Y(base)); ctx.stroke(); ctx.restore();
    polyline(pts, '#7c3aed', 3.2, ax.X, ax.Y, ax.B);
    const q = Qsun(S.eS, S.epsS, S.phiS), mx = ax.X(S.phiS % 360 === 0 && S.phiS >= 360 ? 360 : S.phiS);
    D.sphere(mx, ax.Y(q), 6.5, '#7c3aed', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.label(clamp(mx, ax.B.x + 52 * U, ax.B.x + ax.B.w - 52 * U), ax.Y(q) - 20 * U, fix(q, 1) + ' W/m²', { bg: '#7c3aed', size: 12.5, pad: 7 });
    D.text(ax.B.x + 6, ax.Y(base) - 6, '원 궤도일 때 ' + fix(base, 1), { size: 12, weight: 800, color: '#64748b', align: 'left' });
    D.text(Rq.x + Rq.w / 2, Rq.y + Rq.h - 7, '가로축: 6월 하지일 때 지구의 궤도 위치(세차)', { size: 12, weight: 700, color: '#64748b' });
  }
  function drawOrbitPanel(t) {
    const R = LR; card(R, '일사량 계산 (교육용 근사식)');
    const q = Qsun(S.eS, S.epsS, S.phiS), base0 = K.Q0 + K.K_EPS * (S.epsS - K.EPS0);
    D.text(R.x + 16, R.y + 54 * FS, '기울기 효과: ' + K.Q0 + ' + ' + K.K_EPS + ' × (' + fix(S.epsS, 1) + ' − ' + K.EPS0 + ') = ' + fix(base0, 1) + ' W/m²', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(R.x + 16, R.y + 84 * FS, '거리 효과: × (태양 거리)⁻² = × ' + fix(q / base0, 3), { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(R.x + 16, R.y + 118 * FS, '일사량 = ' + fix(q, 1) + ' W/m²  (원 궤도·기울기 ' + K.EPS0 + '°일 때 ' + K.Q0 + ' 대비 ' + sgn(q - K.Q0, 1) + ')', { size: 15.5, weight: 800, color: '#6d28d9', align: 'left' });
    drawWrap(R.x + R.w / 2, R.y + R.h - 24 * FS, '이 변화는 수만~10만 년에 걸쳐 천천히 일어나요.', R.w - 30, 13, { color: '#64748b' });
  }
  /* 화산 */
  const volH = (t) => clamp(volDip(t), 0, 1);
  function drawVolcano(t) {
    const Rg = PHONE ? { x: MR.x, y: MR.y, w: MR.w, h: 200 } : { x: MR.x, y: MR.y, w: MR.w * 0.5, h: MR.h };
    const Rq = PHONE ? { x: MR.x, y: MR.y + 208, w: MR.w, h: 192 } : { x: MR.x + MR.w * 0.5 + 8, y: MR.y, w: MR.w * 0.5 - 8, h: MR.h };
    card(Rg, '');
    const cx = Rg.x + Rg.w * 0.62, cy = Rg.y + Rg.h * 0.5, r = Math.min(Rg.w, Rg.h) * 0.30, al = volH(S.vt);
    // 햇빛
    [-0.5, 0, 0.5].forEach((f) => { const y = cy + f * r * 1.2; D.arrow(Rg.x + 14, y, cx - r * 1.5 - (1 - al) * 0, y, { color: 'rgba(245,158,11,.9)', width: 5, head: 13 }); });
    D.sphere(cx, cy, r, '#4f95d9', { gloss: true });
    ctx.fillStyle = '#5da86a'; ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.2, r * 0.3, r * 0.2, 0.4, 0, TAU); ctx.ellipse(cx + r * 0.3, cy + r * 0.25, r * 0.25, r * 0.17, -0.3, 0, TAU); ctx.fill();
    // 에어로졸 층
    if (al > 0.02) { ctx.save(); ctx.strokeStyle = 'rgba(146,98,48,' + (0.25 + 0.55 * al) + ')'; ctx.lineWidth = 7 + 9 * al; ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, TAU); ctx.stroke(); ctx.restore(); for (let k = 0; k < 40; k++) { const a = k * 2.399 + t * 0.2; D.sphere(cx + Math.cos(a) * r * 1.18, cy + Math.sin(a) * r * 1.18, 3 * U, '#92643a', { gloss: false }); } }
    // 반사되는 햇빛
    [-0.5, 0, 0.5].forEach((f) => { if (al > 0.03) { const y = cy + f * r * 1.2, x = cx - r * 1.3; D.arrow(x, y, x - 38 * U - al * 30 * U, y + (f === 0 ? -34 : f * 40) * U, { color: 'rgba(250,204,21,.95)', width: 2 + al * 4, head: 11 }); } });
    D.text(Rg.x + Rg.w / 2, Rg.y + 26 * FS, '화산 분출 → 성층권 에어로졸 → 햇빛 반사', { size: 14, weight: 800, color: '#334155' });
    D.text(cx, cy + r * 1.18 + 26 * FS, al > 0.1 ? '반사된 햇빛이 늘어요' : '평소', { size: 13, weight: 800, color: '#92400e' });
    // 화산
    ctx.fillStyle = '#6b5b4b'; ctx.beginPath(); ctx.moveTo(Rg.x + 20, Rg.y + Rg.h - 10); ctx.lineTo(Rg.x + 62, Rg.y + Rg.h - 56 * FS); ctx.lineTo(Rg.x + 104, Rg.y + Rg.h - 10); ctx.closePath(); ctx.fill();
    // 그래프
    card(Rq, '');
    D.text(Rq.x + 14, Rq.y + 8 + 15 * FS, '전 지구 평균 기온 편차 (예시: 1991 피나투보형)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const ax = axesBox(Rq, { x0: 0, x1: 5, y0: -0.8, y1: 0.3, xt: [0, 1, 2, 3, 4, 5], xf: (v) => v + '년', yt: [-0.6, -0.3, 0], yf: (v) => (v < 0 ? '−' + Math.abs(v).toFixed(1) : '0'), pad: { l: 46, r: 14, t: 34, b: 42 } });
    const pts = []; for (let tt = 0; tt <= Math.min(S.vt, 5) + 1e-6; tt += 0.05) pts.push([tt, K.VOLC_MIN * volH(tt)]);
    if (pts.length > 1) polyline(pts, '#dc2626', 3.2, ax.X, ax.Y, ax.B);
    if (S.vt > 1.0) { D.sphere(ax.X(1), ax.Y(K.VOLC_MIN), 5.5, '#dc2626', { gloss: false }); D.label(ax.X(1) + 8, ax.Y(K.VOLC_MIN) + 14 * U, '약 1년 뒤 ' + sgn(K.VOLC_MIN, 1) + ' °C', { bg: '#dc2626', size: 12, pad: 6, align: 'left' }); }
    D.text(Rq.x + Rq.w / 2, Rq.y + Rq.h - 6, '분출 뒤 지난 시간 → 1~2년 동안 낮아졌다가 회복해요', { size: 12, weight: 700, color: '#64748b' });
  }
  /* 얼음 반사율 */
  const albOf = (f) => K.ALB_ICE * f + K.ALB_REST * (1 - f);
  function drawIce(t) {
    const Rg = PHONE ? { x: MR.x, y: MR.y, w: MR.w, h: 210 } : { x: MR.x, y: MR.y, w: MR.w * 0.5, h: MR.h };
    const Rb = PHONE ? { x: MR.x, y: MR.y + 218, w: MR.w, h: 182 } : { x: MR.x + MR.w * 0.5 + 8, y: MR.y, w: MR.w * 0.5 - 8, h: MR.h };
    const f = S.iceS / 100, alb = albOf(f);
    card(Rg, '');
    const cx = Rg.x + Rg.w * 0.6, cy = Rg.y + Rg.h * 0.54, r = Math.min(Rg.w * 0.3, Rg.h * 0.34);
    [-0.55, 0, 0.55].forEach((k) => { const y = cy + k * r * 1.3; D.arrow(Rg.x + 14, y, cx - r - 8, y, { color: 'rgba(245,158,11,.9)', width: 5, head: 12 }); });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r); g.addColorStop(0, '#6bb0e6'); g.addColorStop(1, '#2d67ad'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#5da86a'; ctx.beginPath(); ctx.ellipse(cx - r * 0.2, cy - r * 0.05, r * 0.32, r * 0.2, 0.3, 0, TAU); ctx.ellipse(cx + r * 0.25, cy + r * 0.3, r * 0.22, r * 0.14, -0.3, 0, TAU); ctx.fill();
    const yy = r * (1 - f);
    ctx.fillStyle = '#f4f9fd'; ctx.fillRect(cx - r, cy - r, r * 2, r - yy); ctx.fillRect(cx - r, cy + yy, r * 2, r - yy);
    ctx.restore(); ctx.strokeStyle = 'rgba(30,64,120,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    // 반사 화살표: 얼음 쪽에서 굵게
    [[-0.78, -1], [0.78, 1]].forEach(([k, s]) => { if (f > 0.02) { const x0 = cx - r * 0.55, y0 = cy + k * r * 0.95; D.arrow(x0, y0, x0 - 46 * U, y0 + s * 46 * U, { color: 'rgba(250,204,21,.95)', width: 1.5 + f * 9, head: 10 }); } });
    D.text(cx, cy - r - 10 * FS, '북극', { size: 12, weight: 800, color: '#475569' }); D.text(cx, cy + r + 20 * FS, '남극', { size: 12, weight: 800, color: '#475569' });
    D.text(Rg.x + Rg.w / 2, Rg.y + 24 * FS, '얼음이 줄면 → 반사율↓ → 흡수↑ → 기온↑ → 더 녹아요', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#334155' });
    if (S.pulse > 0.02) D.ring(cx, cy - r * 0.9, 24 * U * (1 + (1 - S.pulse)), t, { color: '#dc2626', speed: 1.5 });
    // 오른쪽: 반사율 표와 막대
    card(Rb, '표면의 반사율 (예시)');
    const items = [['눈·얼음', 0.8, '#bfe3fb'], ['구름', 0.5, '#d7dee8'], ['숲', 0.15, '#4ea35f'], ['바다', 0.06, '#2d67ad']];
    items.forEach((it, i) => { const y = Rb.y + 40 * FS + i * 24 * FS; D.text(Rb.x + 14, y + 14, it[0], { size: 13.5, weight: 800, color: '#334155', align: 'left' }); ctx.fillStyle = '#eef2f7'; rr(Rb.x + 78 * U + 20, y, Rb.w - 78 * U - 70, 17, 5).fill(); ctx.fillStyle = it[2]; rr(Rb.x + 78 * U + 20, y, (Rb.w - 78 * U - 70) * it[1], 17, 5).fill(); D.text(Rb.x + Rb.w - 12, y + 14, String(it[1]), { size: 13, weight: 800, color: '#0f172a', align: 'right' }); });
    const y0 = Rb.y + 40 * FS + 4 * 24 * FS + 12;
    D.text(Rb.x + 14, y0 + 14, '지표 평균 반사율 = ' + K.ALB_ICE + ' × ' + fix(f, 2) + ' + ' + K.ALB_REST + ' × ' + fix(1 - f, 2) + ' = ' + fix(alb, 2), { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    D.text(Rb.x + 14, y0 + 14 + 26 * FS, '흡수하는 태양 에너지 = 1 − ' + fix(alb, 2) + ' = ' + fix(1 - alb, 2), { size: 15, weight: 800, color: '#b45309', align: 'left' });
    const bx = Rb.x + 14, bw = Rb.w - 28, by = y0 + 14 + 44 * FS;
    ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, 18, 6).fill(); ctx.fillStyle = '#f59e0b'; rr(bx, by, bw * clamp(1 - alb, 0, 1), 18, 6).fill();
    D.text(bx + bw, by + 34 * FS, '← 흡수 (0 ~ 1)', { size: 12, weight: 700, color: '#64748b', align: 'right' });
  }
  function drawIcePanel(t) {
    const R = LR; card(R, '양의 되먹임: 처음의 변화를 더 키워요');
    const n = ['얼음이 줄어요', '반사율이 낮아져요', '흡수하는 에너지가 늘어요', '기온이 올라요'], w = (R.w - 40 - (PHONE ? 0 : 0)) / (PHONE ? 1 : 4);
    for (let i = 0; i < 4; i++) {
      const x = PHONE ? R.x + 20 : R.x + 20 + i * (w + 0), y = PHONE ? R.y + 50 * FS + i * 62 * FS : R.y + 62 * FS, bw = PHONE ? w : w - 22, bh = PHONE ? 46 * FS : 56 * FS;
      const on = S.pulse > 0 && ((t * 1.6) % 4) >= i && ((t * 1.6) % 4) < i + 1.2;
      D.shadow(() => { ctx.fillStyle = on ? '#fff7ed' : '#fff'; rr(x, y, bw, bh, 10).fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = on ? '#ea580c' : '#cbd5e1'; ctx.lineWidth = 2.2; rr(x, y, bw, bh, 10).stroke();
      drawWrap(x + bw / 2, y + bh / 2 + 4 * FS - (wrapLines(n[i], bw - 12, 13, 800).length - 1) * 8, n[i], bw - 12, 13, { weight: 800, color: '#1e293b', lh: 1.2 });
      if (!PHONE && i < 3) D.arrow(x + bw + 2, y + bh / 2, x + bw + 20, y + bh / 2, { color: '#ea580c', width: 3, head: 9 });
    }
    if (!PHONE) D.text(R.x + R.w / 2, R.y + R.h - 20 * FS, '얼음 면적 ' + Math.round(S.iceS) + ' % → 흡수 ' + fix(1 - albOf(S.iceS / 100), 2) + '  (5 % 녹을 때마다 ' + fix((albOf(S.iceS / 100) - albOf(Math.max(0, S.iceS - 5) / 100)), 3) + '씩 흡수가 늘어요)', { size: 13, weight: 800, color: '#7c2d12' });
  }

  /* ======================================================
     3. 인위적 요인
     ====================================================== */
  function drawForcBars(t, R) {
    card(R, '복사 강제력 (1750년 대비, W/m², 예시 자료)');
    const rows = K.F.concat([['태양 활동 (자연)', K.SUN]]), x0 = R.x + 14, lw = (PHONE ? 112 : 122), bx = x0 + lw, bw = R.w - lw - 30, vmin = -1.5, vmax = 2.5;
    const X = (v) => bx + (bw * (v - vmin)) / (vmax - vmin), y0 = R.y + 40 * FS, rh = Math.min(32 * FS, (R.h - 108 * FS) / rows.length);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), y0 - 4); ctx.lineTo(X(0), y0 + rows.length * rh); ctx.stroke();
    [-1, 1, 2].forEach((v) => D.text(X(v), y0 + rows.length * rh + 15 * FS, (v < 0 ? '−' : '+') + Math.abs(v), { size: 12, weight: 700, color: '#64748b' }));
    rows.forEach((rw, i) => {
      const y = y0 + i * rh, v = rw[1] * S.barP, nat = i === rows.length - 1;
      D.text(x0, y + rh * 0.62, rw[0], { size: 12.8, weight: 800, color: nat ? '#64748b' : '#334155', align: 'left' });
      const xa = X(0), xb = X(v), wbar = Math.abs(xb - xa);
      if (wbar >= 1) { ctx.fillStyle = nat ? '#94a3b8' : v >= 0 ? '#ea580c' : '#2563eb'; rr(Math.min(xa, xb), y + 4, wbar, rh - 8, 4).fill(); }
      D.text(v >= 0 ? xb + 5 : xb - 5, y + rh * 0.62, sgn(rw[1] * Math.min(1, S.barP * 1.0), 2), { size: 12.5, weight: 800, color: '#0f172a', align: v >= 0 ? 'left' : 'right' });
    });
    const sy = y0 + rows.length * rh + 38 * FS;
    D.text(R.x + R.w / 2, sy, S.sumShown ? '인위적 요인의 합 = ' + sgn(ANTHRO, 2) + ' W/m²  (약 ' + sgn(ANTHRO, 1) + ')' : '인위적 요인의 합 = ?   (태양 활동은 제외)', { size: 14.5, weight: 800, color: S.sumShown ? '#c2410c' : '#475569' });
  }
  function drawForcCalc(t, R) {
    card(R, '이산화 탄소 농도 → 복사 강제력');
    const c = S.co2S, F = forceCo2(c), dT = teq(c);
    D.text(R.x + R.w / 2, R.y + 54 * FS, 'ΔF = 5.35 × ln(C / ' + K.C0 + ')', { size: 17, weight: 800, color: '#334155' });
    D.text(R.x + R.w / 2, R.y + 84 * FS, 'ln(' + Math.round(c) + ' / ' + K.C0 + ') = ' + fix(Math.log(c / K.C0), 3), { size: 14, weight: 800, color: '#64748b' });
    D.text(R.x + R.w / 2, R.y + 118 * FS, 'ΔF = ' + fix(F, 2) + ' W/m²', { size: 22, weight: 800, color: '#c2410c' });
    D.text(R.x + R.w / 2, R.y + 148 * FS, '평형 기온 상승 ≈ ' + K.SENS + ' × ' + fix(F, 2) + ' = ' + fix(dT, 1) + ' °C', { size: 15, weight: 800, color: '#b91c1c' });
    const bx = R.x + 16, bw = R.w - 32, by = R.y + R.h - 48 * FS;
    ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, 20, 7).fill(); const ww = clamp(F / 4, 0, 1) * bw; if (ww > 0.5) { ctx.fillStyle = '#ea580c'; rr(bx, by, ww, 20, 7).fill(); }
    D.text(bx, by + 36 * FS, '0', { size: 12, weight: 700, color: '#64748b', align: 'left' }); D.text(bx + bw, by + 36 * FS, '4 W/m²', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    D.text(bx + bw / 2, by + 36 * FS, '막대 값과 조금 달라요(근사식)', { size: 11.5, weight: 700, color: '#94a3b8' });
  }
  function drawForcCurves(t, R) {
    card(R, PHONE ? '기온 편차 (예시, °C)' : '지구 평균 기온 편차 (예시 자료, °C)');
    const ax = axesBox({ x: R.x, y: R.y + 6, w: R.w, h: R.h - 6 }, { x0: 1850, x1: 2020, y0: -0.6, y1: 1.6, xt: [1850, 1900, 1950, 2000], yt: [0, 0.5, 1, 1.5], yf: (v) => fix(v, 1), pad: { l: 44, r: 14, t: 34, b: 26 } });
    polyline(SNAT.map((d) => [d.y, d.v]), '#f59e0b', 2.4, ax.X, ax.Y, ax.B); polyline(SALL.map((d) => [d.y, d.v]), '#16a34a', 2.4, ax.X, ax.Y, ax.B);
    polyline(OBS.map((d) => [d.y, d.v]), '#0f172a', 3, ax.X, ax.Y, ax.B);
    const xs = R.x + R.w - (PHONE ? 290 : 330);
    [['관측', '#0f172a', ''], ['모의 A', '#f59e0b', ''], ['모의 B', '#16a34a', '']].forEach((l, i) => { D.sphere(xs + i * (PHONE ? 96 : 108), R.y + 18 * FS, 5, l[1], { gloss: false }); D.text(xs + i * (PHONE ? 96 : 108) + 10, R.y + 18 * FS + 5, l[0], { size: 12.5, weight: 800, color: '#334155', align: 'left' }); });
    if (S.simShown) { D.label(ax.X(1930), ax.Y(0.95), 'A: 자연 요인만 / B: 자연 + 인위 요인', { bg: '#15803d', size: 12.5, pad: 7 }); }
  }

  /* ======================================================
     4. 해결 방법
     ====================================================== */
  function recalcFut(jump) {
    const sc = scen(cutOf() / 100); S.sc = sc;
    if (jump || !S.evInit) { sc.forEach((r, i) => { S.evc[i] = r.c; S.evt[i] = r.t; }); S.evInit = true; }
  }
  const final = () => S.sc[S.sc.length - 1];
  function stepFut(dt) { const n = S.sc.length; for (let i = 0; i < n; i++) { S.evc[i] = approach(S.evc[i], S.sc[i].c, dt, 8); S.evt[i] = approach(S.evt[i], S.sc[i].t, dt, 8); } S.cutS = approach(S.cutS, cutOf(), dt, 8); }
  function futGraph(R, title, o) {
    card(R, title);
    const ax = axesBox({ x: R.x, y: R.y + 4, w: R.w, h: R.h - 4 }, { x0: K.Y0, x1: K.Y1, y0: o.y0, y1: o.y1, xt: [2025, 2050, 2075, 2100], yt: o.yt, yf: o.yf, pad: { l: 46, r: 22, t: 34, b: 26 } });
    polyline(BASE.map((r, i) => [r.y, o.base(r)]), '#94a3b8', 2.4, ax.X, ax.Y, ax.B);
    polyline(S.evc.map((c, i) => [BASE[i].y, o.val(i)]), o.col, 3.4, ax.X, ax.Y, ax.B);
    if (o.ref) { ctx.save(); ctx.strokeStyle = o.ref.col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(ax.B.x, ax.Y(o.ref.v)); ctx.lineTo(ax.B.x + ax.B.w, ax.Y(o.ref.v)); ctx.stroke(); ctx.restore(); D.text(ax.B.x + 6, ax.Y(o.ref.v) - 5, o.ref.label, { size: 12, weight: 800, color: o.ref.col, align: 'left' }); }
    const ys = o.val(S.evc.length - 1); D.label(ax.X(2100) - 6, ax.Y(clamp(ys, o.y0 + (o.y1 - o.y0) * 0.06, o.y1)) - 14, o.end(), { bg: o.col, size: 12.5, pad: 7, align: 'right' });
    D.text(ax.B.x + ax.B.w - 6, ax.Y(o.base(BASE[BASE.length - 1])) + (o.baseDy || 16), '배출 유지', { size: 12, weight: 800, color: '#64748b', align: 'right' });
  }
  function drawFut(t) {
    const gap = 8, G1 = PHONE ? { x: MR.x, y: MR.y, w: MR.w, h: 196 } : { x: MR.x, y: MR.y, w: MR.w / 2 - gap / 2, h: MR.h }, G2 = PHONE ? { x: MR.x, y: MR.y + 204, w: MR.w, h: 196 } : { x: MR.x + MR.w / 2 + gap / 2, y: MR.y, w: MR.w / 2 - gap / 2, h: MR.h };
    futGraph(G1, '대기 중 CO₂ 농도 (ppm)', { y0: 380, y1: 620, yt: [400, 500, 600], yf: (v) => v, col: '#16a34a', base: (r) => r.c, val: (i) => S.evc[i], end: () => Math.round(final().c) + ' ppm', ref: null, baseDy: 18 });
    futGraph(G2, '평형 기온 상승 (°C, 산업화 이전 대비)', { y0: 1.0, y1: 3.6, yt: [1.5, 2, 2.5, 3], yf: (v) => fix(v, 1), col: '#dc2626', base: (r) => r.t, val: (i) => S.evt[i], end: () => sgn(final().t, 1) + ' °C', ref: { v: 2.0, col: '#2563eb', label: '+2.0 °C' }, baseDy: 18 });
  }
  function drawFutPanel(t) {
    const R = LR; card(R, '2050년까지 배출 감축 (현재 배출 대비, 예시)');
    const bx = R.x + 16, bw = R.w - 32, by = R.y + 56 * FS, bh = 28 * FS, vmax = 60;
    ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, bh, 8).fill();
    let acc = 0; Object.keys(K.MEAS).forEach((k) => { if (!S.picks.has(k)) return; const w = (K.MEAS[k][1] / vmax) * bw; ctx.fillStyle = K.MEAS[k][2]; rr(bx + (acc / vmax) * bw + 1, by + 2, w - 2, bh - 4, 6).fill(); D.text(bx + (acc / vmax) * bw + w / 2, by + bh * 0.68, String(K.MEAS[k][1]), { size: 12.5, weight: 800, color: '#fff' }); acc += K.MEAS[k][1]; });
    const gx = bx + (50 / vmax) * bw; ctx.save(); ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(gx, by - 8); ctx.lineTo(gx, by + bh + 8); ctx.stroke(); ctx.restore();
    D.text(gx, by - 12 * FS, '목표 50 %', { size: 12.5, weight: 800, color: '#b91c1c' });
    D.text(bx, by + bh + 20 * FS, '0', { size: 12, weight: 700, color: '#64748b', align: 'left' }); D.text(bx + bw, by + bh + 20 * FS, '60 %', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    D.text(R.x + R.w / 2, by + bh + 52 * FS, '감축 ' + cutOf() + ' % → 2050년 배출은 현재의 ' + (100 - cutOf()) + ' % · 2100년 CO₂ ' + Math.round(final().c) + ' ppm', { size: 14.5, weight: 800, color: cutOf() >= 50 ? '#15803d' : '#334155' });
    drawWrap(R.x + R.w / 2, R.y + R.h - 22 * FS, '흡수원(바다·식물)이 현재 배출의 절반을 흡수한다고 가정해요. 배출이 흡수와 같아지면 농도 증가가 멈춰요.', R.w - 30, 12.5, { color: '#64748b' });
  }

  /* ======================================================
     조작 · 화면 전환
     ====================================================== */
  let game = null;
  const MODE_LABEL = { record: '📈 기후 기록', orbit: '🪐 공전 궤도와 자전축', volcano: '🌋 화산 활동', ice: '🧊 얼음-반사율 되먹임', forc: '🏭 복사 강제력', fut: '🌍 감축 시나리오' };
  const MODE_LV = { record: 0, orbit: 1, volcano: 1, ice: 1, forc: 2, fut: 3 };
  let ctlKeys = [];
  const FREE_KEYS = { record: ['cur'], orbit: ['orb'], volcano: ['vol'], ice: ['ice'], forc: ['co2'], fut: ['meas'] };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    const free = !!(game && game.free), keys = free ? FREE_KEYS[S.mode] : ctlKeys, lv = MODE_LV[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !keys.includes(c.dataset.k); });
    const seg = $('#modeSeg'); seg.hidden = !(free || lv === 1);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = !(free || (lv === 1 && MODE_LV[b.dataset.mode] === 1)); });
    $$('#measBtns .opt').forEach((b) => b.classList.toggle('on', S.picks.has(b.dataset.m)));
    $('#oCut').textContent = cutOf() + ' %';
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); if (m === 'forc') { S.barP = 0; } if (m === 'volcano') { S.vt = 6; S.vrun = false; } }
    S.mode = m; updateCtl();
  }
  function setCtl(k) { ctlKeys = k; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); if (!(game && game.free)) { ctlKeys = ctlKeys.filter((k) => ['cls2'].includes(k)).concat(FREE_KEYS[b.dataset.mode]); } updateCtl(); }));
  SciSim.bindRange($('#sAge'), $('#oAge'), fmtAge, (v) => { S.cur = v; });
  $('#bMark').addEventListener('click', () => {
    Sound.click(); const d = atAge(S.cur), kind = d.T <= GLACIAL_T ? 'g' : d.T >= INTER_T ? 'i' : 'm';
    if (S.marks.some((m) => m.a === S.cur)) { say('이미 표시한 시기예요.', true); return; }
    if (S.marks.length >= 6) { say('표시는 6개까지예요. 지우고 다시 해요.', true); return; }
    S.marks.push({ a: S.cur, kind, T: d.T, C: d.C }); say(fmtAge(S.cur) + ' 표시: CO₂ ' + d.C + ' ppm, 기온 편차 ' + sgn(d.T, 1) + ' °C', false, 2.2);
  });
  $('#bMarkClr').addEventListener('click', () => { Sound.click(); S.marks = []; });
  SciSim.bindRange($('#sEcc'), $('#oEcc'), (v) => fix(v, 2), (v) => { S.e = v; });
  SciSim.bindRange($('#sEps'), $('#oEps'), (v) => fix(v, 1) + '°', (v) => { S.eps = Math.round(v * 10) / 10; });
  SciSim.bindRange($('#sPhi'), $('#oPhi'), (v) => v + '°', (v) => { S.phi = v; });
  $('#bVolc').addEventListener('click', () => { Sound.click(); S.vt = 0; S.vrun = true; S.volcanoRuns++; Sound.tone(80, 0.6, 'sawtooth', 0.1); });
  SciSim.bindRange($('#sIce'), $('#oIce'), (v) => v + ' %', (v) => { S.ice = v; });
  $('#bWarm').addEventListener('click', () => { Sound.click(); S.ice = Math.max(0, S.ice - 5); S.warmN++; S.pulse = 1; setSlider($('#sIce'), $('#oIce'), S.ice, (v) => v + ' %'); });
  SciSim.bindRange($('#sCo2'), $('#oCo2'), (v) => v + ' ppm', (v) => { S.co2 = v; });
  $$('#measBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); const k = b.dataset.m; if (S.picks.has(k)) S.picks.delete(k); else S.picks.add(k); recalcFut(false); updateCtl(); }));

  /* 그래프를 눌러 끌기 (기후 기록) */
  SciSim.pointer(view, {
    down(p) { if (S.mode !== 'record') return false; const L = recLay(); if (p.x >= L.B.x - 10 && p.x <= L.B.x + L.B.w + 10 && p.y >= L.B.y - 6 && p.y <= L.B.y + L.B.h + 6) { S.dragCore = true; setCur(Math.min(L.ageAt(p.x), S.draw * 800)); return true; } return false; },
    move(p) { if (S.dragCore) setCur(Math.min(recLay().ageAt(p.x), S.draw * 800)); },
    up() { S.dragCore = false; },
    hover(p) { if (S.mode !== 'record') return 'default'; const L = recLay(); return p.x >= L.B.x && p.x <= L.B.x + L.B.w && p.y >= L.B.y && p.y <= L.B.y + L.B.h ? 'ew-resize' : 'default'; },
  });

  function resetStep(li) {
    hideHint(); parts.clear(); clsTime.reset(); clsNat.reset(); clsSim.reset(); clsAdapt.reset(); stpF.reset(); stpSum.reset();
    S.marks = []; S.sumShown = false; S.simShown = false; S.vrun = false; S.vt = 6;
    if (li === 0) { setMode('record'); S.draw = 0; setCur(0); setCtl(['cur']); showHint('빙하 코어가 깊이 시추되면서 80만 년 기록이 그려져요', 5200); }
    else if (li === 1) { setMode('orbit'); S.e = 0.03; S.eps = 23.3; S.phi = 0; setSlider($('#sEcc'), $('#oEcc'), 0.03, (v) => fix(v, 2)); setSlider($('#sEps'), $('#oEps'), 23.3, (v) => fix(v, 1) + '°'); setSlider($('#sPhi'), $('#oPhi'), 0, (v) => v + '°'); setCtl(['orb']); showHint('슬라이더로 공전·자전의 변화를 만들어 봐요', 5200); }
    else if (li === 2) { setMode('forc'); S.co2 = 280; S.co2S = 280; S.barP = 0; setSlider($('#sCo2'), $('#oCo2'), 280, (v) => v + ' ppm'); setCtl(['co2', 'calc']); showHint('막대 값과 이산화 탄소 농도 슬라이더로 복사 강제력을 계산해요', 5200); }
    else { setMode('fut'); S.picks.clear(); recalcFut(true); setCtl(['meas']); showHint('감축 수단을 골라 2100년의 모습을 바꿔 봐요', 5200); }
    updateCtl();
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const markOK = (kind) => S.marks.some((m) => m.kind === kind);
  const levels = [
    {
      title: '기후 기록: 빙하 코어가 들려주는 이야기', short: '기후 기록', icon: '📈', phase: '분석', features: ['record'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구의 기후는 왜 바뀌어 왔고, 지금의 온난화는 과거의 변화와 무엇이 다를까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 온실 효과와 열수지, 되먹임을 배웠어요. 이번에는 <b>과거의 기록</b>에서 기후가 어떻게 변해 왔는지 읽고, 그 원인을 설명하는 <b>가설</b>을 추론해요.</div>' +
        '<p>기후변화는 기후의 평균 상태가 <b>장기간(보통 30년 이상)</b> 변하는 것이에요. 남극과 그린란드의 <b>빙하 코어</b>에는 눈이 쌓이며 가둔 <b>옛 공기(기포)</b>가 들어 있어서, 깊이에 따라 수십만 년 전의 이산화 탄소 농도와 기온을 알 수 있어요. (모든 그래프는 단순화한 <b>예시 자료</b>예요.)</p>',
      setup() { resetStep(0); },
      recap: '빙하 코어 기록에서 빙기와 간빙기가 약 10만 년 주기로 되풀이되고 CO₂와 기온이 함께 변해요. 현재 CO₂는 과거 80만 년의 최댓값을 훨씬 넘어요.',
      summary: '<ul><li><b>빙하 코어</b>: 쌓인 눈 속에 갇힌 옛 공기(기포)로 과거의 CO₂ 농도를, 얼음의 성분으로 기온을 알아내요.</li><li>최근 80만 년: CO₂ 약 180 ppm(빙기) ~ 280 ppm(간빙기), 약 10만 년 주기로 기온과 함께 변해요. 현재는 약 420 ppm.</li><li>기후변화의 원인 가설은 <b>시간 규모</b>가 맞아야 해요: 화산(수 년), 태양 활동·인간 활동(수십~수백 년), 공전 궤도(수만~10만 년), 판의 이동(수백만 년 이상).</li><li>CO₂와 기온이 함께 변해도 어느 쪽이 원인인지는 바로 알 수 없어서 <b>시간 순서·메커니즘 등 추가 근거</b>가 필요해요.</li></ul>',
      missions: [
        {
          title: '빙기와 간빙기 찾아 표시하기',
          goal: '그래프를 끌거나 슬라이더로 시기를 고르고 <b>📍 표시</b>해요. <b>가장 추운 빙기</b>(기온 편차 −4.5 °C 이하)와 <b>따뜻한 간빙기</b>(−1.0 °C 이상) 시기를 하나씩 표시해요.',
          hint: '그래프에서 빨간 선(기온)이 아래로 푹 꺼진 곳이 빙기, 위쪽에 있는 곳이 간빙기예요. 그때 파란 선(CO₂)도 함께 낮거나 높아요.',
          setup() { S.marks = []; setCtl(['cur']); },
          check: () => markOK('g') && markOK('i') && S.draw > 0.98, hold: 0.5,
          status: () => mark(markOK('g')) + ' 빙기(−4.5 °C 이하) ' + S.marks.filter((m) => m.kind === 'g').length + '개 · ' + mark(markOK('i')) + ' 간빙기(−1.0 °C 이상) ' + S.marks.filter((m) => m.kind === 'i').length + '개',
          explain: '빙기에는 기온 편차가 낮고(약 −6 °C) CO₂도 약 180~200 ppm으로 낮아요. 간빙기에는 기온이 높고 CO₂도 약 270~280 ppm으로 높아요. 두 곡선이 <b>함께 변하는</b> 것을 알 수 있어요.',
        },
        {
          title: '가설을 시간 규모에 따라 분류하기', manual: true,
          goal: '기후변화의 원인 가설 5가지가 <b>얼마나 오랜 시간 규모</b>로 작용하는지 알맞은 칸에 분류해요.',
          hint: '화산 분출의 효과는 1~2년 안에 사라져요. 빙기와 간빙기의 10만 년 주기와 맞는 것은 지구 공전 궤도의 변화예요. 산업화 이후는 약 150년이에요.',
          setup() { clsTime.reset(); setCtl(['cls1']); },
          status: () => mark(clsTime.complete()) + ' 분류 ' + clsTime.count() + ' / 5 · ' + mark(clsTime.ok()) + ' 모두 맞음',
          check() {
            if (!clsTime.complete()) return '가설 5개를 모두 분류해 주세요. (지금 ' + clsTime.count() + '개)';
            const w = clsTime.wrong(); clsTime.mark(w);
            if (w.length) return '빨간 칸 ' + w.length + '개를 다시 생각해 보세요. 그 현상이 기후에 영향을 주는 기간이 얼마나 될까요?';
            return true;
          },
          explain: '화산 활동은 <b>수 년</b>, 태양 활동 변화와 인간 활동(산업화 이후)은 <b>수십~수백 년</b>, 공전 궤도 요소 변화는 <b>수만~10만 년</b>, 판의 이동은 <b>수백만 년 이상</b>의 시간 규모로 작용해요. 약 10만 년 주기의 빙기·간빙기는 공전 궤도 변화와 시간 규모가 맞아요.',
        },
        {
          type: 'quiz', title: '함께 변한다고 원인이 정해질까?',
          goal: '그래프에서 CO₂와 기온이 함께 변해요. 그런데 어느 쪽이 원인인지 바로 정하기 어려운 까닭은?',
          setup() { setCtl(['cur']); },
          choices: ['둘 중 하나는 반드시 측정이 잘못되었기 때문이에요', '함께 변한다는 사실만으로는 원인과 결과의 방향을 알 수 없어서, 시간 순서나 작용 원리 같은 추가 근거가 필요하기 때문이에요', 'CO₂는 기온에 전혀 영향을 줄 수 없기 때문이에요', '기온이 오르면 CO₂가 반드시 줄어들기 때문이에요'],
          answer: 1,
          feedback: ['두 곡선 모두 믿을 만한 기록이에요. 문제는 측정이 아니라 해석이에요.', '', 'CO₂는 온실 기체라서 기온에 영향을 줘요. 다만 이 그래프만으로 원인을 단정할 수는 없어요.', '그래프에서 기온이 높을 때 CO₂도 높아요.'],
          explain: '함께 변하는 것(상관)이 곧 원인과 결과(인과)는 아니에요. 빙기에는 궤도 변화로 기온이 먼저 변하고 CO₂가 되먹임으로 변화를 키웠다고 보는 것처럼, <b>시간 순서·메커니즘·다른 증거</b>를 함께 살펴야 해요.',
        },
      ],
    },
    {
      title: '자연적 요인: 궤도, 화산, 얼음', short: '자연적 요인', icon: '🪐', phase: '모형', features: ['orbit'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 약 10만 년 주기의 빙기·간빙기와 시간 규모가 맞는 가설은 <b>공전 궤도의 변화</b>였어요. 이를 <b>밀란코비치 주기</b>라고 해요.</div>' +
        '<p>지구 공전 궤도의 <b>이심률</b>(약 10만 년), <b>자전축 기울기</b>(22.1°~24.5°, 약 4.1만 년), <b>세차</b>(약 2.6만 년)가 바뀌면 북반구 고위도의 <b>여름철 일사량</b>이 달라져 빙기와 간빙기에 영향을 줘요. 또 화산 에어로졸은 햇빛을 반사해 기온을 잠시 낮추고, 얼음이 줄면 반사율이 낮아져 더 따뜻해지는 <b>양의 되먹임</b>이 생겨요. 위쪽 탭으로 세 장면을 오가며 살펴봐요.</p>',
      setup() { resetStep(1); },
      recap: '이심률·자전축 기울기·세차의 주기적 변화는 여름철 일사량을 바꾸어 빙기와 간빙기에 영향을 줘요. 화산은 1~2년의 냉각, 얼음-반사율은 양의 되먹임을 일으켜요.',
      summary: '<ul><li><b>밀란코비치 주기</b>: 이심률 약 10만 년, 자전축 기울기 22.1°~24.5°(약 4.1만 년), 세차 약 2.6만 년 → 북반구 고위도 여름철 일사량 변화 → 빙기·간빙기.</li><li>자전축 기울기가 클수록 고위도 여름 일사량이 늘어요. (이 모형: 기울기 1°당 약 6 W/m²)</li><li><b>화산 활동</b>: 1991년 피나투보 분출 후 성층권 에어로졸이 햇빛을 반사해 전 지구 평균 약 −0.5 °C, 1~2년 지속.</li><li><b>얼음-반사율 되먹임</b>: 반사율 눈·얼음 0.8, 구름 0.5, 숲 0.15, 바다 0.06 → 빙하가 녹으면 반사율↓ → 흡수↑ → 더 따뜻(양의 되먹임).</li><li>자연적 요인: 지구 외부(태양 활동, 공전 궤도 요소), 지구 내부(화산 활동, 해양 순환, 판의 이동).</li></ul>',
      missions: [
        {
          title: '자전축 기울기를 키우고 요인 분류하기', manual: true,
          goal: '<b>자전축 기울기를 24.5°</b>로 키워 6월 하지 일사량이 늘어나는 것을 확인하고, 기후변화 요인 카드 7장을 분류해요.',
          hint: '기울기 슬라이더를 오른쪽 끝(24.5°)으로 옮겨요. 요인 분류에서 태양 활동·공전 궤도는 지구 외부, 화산·해양·판은 지구 내부, 화석 연료·삼림 벌채는 인위적이에요.',
          setup() { setMode('orbit'); S.eps = 23.3; setSlider($('#sEps'), $('#oEps'), 23.3, (v) => fix(v, 1) + '°'); clsNat.reset(); setCtl(['orb', 'cls2']); },
          status: () => mark(S.eps === 24.5) + ' 기울기 ' + fix(S.eps, 1) + '° (24.5) · ' + mark(clsNat.ok()) + ' 분류 ' + clsNat.count() + ' / 7',
          check() {
            if (S.eps !== 24.5) return '자전축 기울기를 24.5°로 올려 보세요. (지금 ' + fix(S.eps, 1) + '°)';
            if (!clsNat.complete()) return '요인 카드 7장을 모두 분류해 주세요. (지금 ' + clsNat.count() + '장)';
            const w = clsNat.wrong(); clsNat.mark(w);
            if (w.length) { const it = NATIDS.find((x) => x.id === w[0]); return '"' + it.label.replace(/^\S+\s/, '') + '"의 분류를 다시 생각해 보세요. (빨간 칸 ' + w.length + '개)'; }
            return true;
          },
          explain: '자전축 기울기가 23.3°에서 24.5°로 커지면 북반구 고위도의 여름 일사량이 약 ' + fix(K.K_EPS * (24.5 - K.EPS0), 1) + ' W/m² 늘어요. 자연적 요인은 지구 <b>외부</b>(태양 활동·공전 궤도)와 <b>내부</b>(화산·해양 순환·판의 이동)로 나뉘고, 화석 연료 사용·삼림 벌채는 <b>인위적</b> 요인이에요.',
        },
        {
          type: 'quiz', title: '최근 100년의 온난화는 왜 밀란코비치 주기가 아닐까?',
          goal: '최근 100년 사이의 빠른 온난화를 밀란코비치 주기로 설명할 수 없는 까닭은?',
          setup() { setCtl(['orb']); },
          choices: ['궤도가 최근 100년 동안 갑자기 크게 바뀌었기 때문이에요', '밀란코비치 주기는 기온에 영향을 주지 않기 때문이에요', '자전축은 100년마다 크게 흔들리기 때문이에요', '주기가 수만 년이라 100년 사이에는 거의 변하지 않고, 같은 기간 태양 활동에도 뚜렷한 증가가 없기 때문이에요'],
          answer: 3,
          feedback: ['공전 궤도 요소는 수만 년에 걸쳐 아주 천천히 변해요.', '밀란코비치 주기는 빙기·간빙기에 영향을 주는 중요한 요인이에요. 다만 시간 규모가 달라요.', '자전축 기울기의 주기는 약 4.1만 년이에요.', ''],
          explain: '이심률(약 10만 년)·자전축 기울기(약 4.1만 년)·세차(약 2.6만 년)는 <b>수만 년 규모</b>로 변해 100년 동안에는 거의 달라지지 않아요. 같은 기간 태양 활동에도 뚜렷한 증가가 없으니, 최근의 급격한 온난화는 다른 원인이 필요해요.',
        },
      ],
    },
    {
      title: '인위적 요인: 복사 강제력의 계산', short: '인위적 요인', icon: '🏭', phase: '분석', features: ['forc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자연적 요인은 최근 100년의 빠른 변화를 설명하기 어렵다는 것을 알았어요. 그렇다면 <b>인위적 요인</b>은 얼마나 기여할까요?</div>' +
        '<p><b>복사 강제력</b>은 어떤 요인이 지구의 에너지 균형을 얼마나 바꾸는지를 W/m²로 나타낸 값이에요(1750년 대비, IPCC 자료를 단순화한 예시). 온실 기체는 +로, 에어로졸은 −로 작용해요. 이산화 탄소의 복사 강제력은 <b>ΔF = 5.35 × ln(C ÷ 280)</b>로 근사하고, 평형 기온 상승은 약 <b>0.8 °C ÷ (W/m²) × ΔF</b>예요.</p>',
      setup() { resetStep(2); },
      recap: '인위적 요인의 복사 강제력은 온실 기체가 +, 에어로졸이 −로 작용해 합이 약 +2.7 W/m²이고, 자연 요인만 넣은 모의로는 최근의 온난화가 재현되지 않아요.',
      summary: '<ul><li>복사 강제력(1750년 대비, 예시, W/m²): CO₂ +2.16, CH₄ +0.54, N₂O +0.21, 할로겐 화합물 +0.41, 대류권 오존 +0.47, 에어로졸(구름 효과 포함) −1.10 → 인위적 합 약 <b>+2.7</b>. 태양 활동(자연)은 +0.01.</li><li>CO₂ 복사 강제력 근사: <b>ΔF = 5.35 × ln(C ÷ 280)</b>. 420 ppm → 약 2.17 W/m², 560 ppm → 약 3.71 W/m².</li><li>평형 기온 상승 ≈ 0.8 × ΔF: 420 ppm 약 +1.7 °C, 560 ppm 약 +3.0 °C. (실제 관측은 바다가 열을 흡수해 늦춰져요.)</li><li>관측 기온은 <b>자연 + 인위 요인</b>을 넣은 모의와 잘 맞고, 자연 요인만 넣은 모의는 최근 수십 년의 상승을 설명하지 못해요.</li><li>인위적 요인이 모두 온난화를 일으키는 것은 아니에요. 에어로졸은 햇빛을 반사해 <b>냉각</b> 효과가 있어요.</li></ul>',
      missions: [
        {
          title: '420 ppm의 복사 강제력과 인위적 합 구하기',
          goal: '농도 슬라이더를 <b>420 ppm</b>으로 맞추고 ΔF를 읽어 입력해요. 그리고 막대 그래프에서 <b>인위적 요인</b>을 모두 더한 값도 입력해요. (소수 첫째 자리까지)',
          hint: 'ΔF = 5.35 × ln(420 ÷ 280) = 5.35 × 0.405 = 약 2.17이라서 2.2예요. 인위적 요인은 CO₂, CH₄, N₂O, 할로겐 화합물, 대류권 오존, 에어로졸(−)을 더하고 태양 활동은 빼요.',
          setup() { S.co2 = 280; setSlider($('#sCo2'), $('#oCo2'), 280, (v) => v + ' ppm'); stpF.reset(); stpSum.reset(); S.sumShown = false; setCtl(['co2', 'calc']); },
          check: () => S.co2 === K.CNOW && stpF.value === Math.round(forceCo2(K.CNOW) * 10) / 10 && stpSum.value === Math.round(ANTHRO * 10) / 10, hold: 0.6,
          status: () => mark(S.co2 === K.CNOW) + ' 농도 ' + S.co2 + ' ppm · ' + mark(stpF.value === Math.round(forceCo2(K.CNOW) * 10) / 10 && S.co2 === K.CNOW) + ' ΔF ' + fix(stpF.value, 1) + ' · ' + mark(stpSum.value === Math.round(ANTHRO * 10) / 10) + ' 인위적 합 ' + fix(stpSum.value, 1),
          explain: 'ΔF = 5.35 × ln(420 ÷ 280) = 5.35 × 0.405 ≈ <b>2.17 W/m²</b>이에요. 인위적 요인은 2.16 + 0.54 + 0.21 + 0.41 + 0.47 − 1.10 = <b>' + fix(ANTHRO, 2) + '</b>, 약 <b>+2.7 W/m²</b>예요. 태양 활동(+0.01)은 자연적 요인이라 제외해요.',
        },
        {
          title: '관측과 맞는 모의 곡선 판별하기', manual: true,
          goal: '검은색 <b>관측</b> 곡선과 비교해, 모의 곡선 A와 B가 각각 어떤 요인을 넣은 것인지 판별해요.',
          hint: '최근 수십 년의 기온 상승이 재현되는 곡선은 인위적 요인까지 넣은 것이고, 상승이 거의 없는 곡선은 자연 요인(태양 활동·화산)만 넣은 것이에요.',
          setup() { clsSim.reset(); S.simShown = false; setCtl(['cls3']); },
          status: () => mark(clsSim.complete()) + ' 판별 ' + clsSim.count() + ' / 2 · ' + mark(clsSim.ok()) + ' 알맞음',
          check() {
            if (!clsSim.complete()) return '모의 곡선 A와 B를 모두 판별해 주세요.';
            const w = clsSim.wrong(); clsSim.mark(w);
            if (w.length) return '모의 곡선 ' + w.join(', ') + '의 판별을 다시 해 보세요. 관측처럼 오르는 곡선은 어느 쪽일까요?';
            S.simShown = true; return true;
          },
          explain: '자연 요인(태양 활동, 화산)만 넣은 모의(A)는 화산 분출로 잠시 낮아질 뿐 최근의 상승을 설명하지 못해요. <b>자연 + 인위 요인</b>을 넣은 모의(B)는 관측과 잘 맞아요. 최근의 온난화에는 인간 활동이 크게 기여했다는 뜻이에요.',
        },
        {
          type: 'quiz', title: '인위적 요인은 모두 온난화를 일으킬까?',
          goal: '복사 강제력 막대 그래프에서 에어로졸은 <b>−1.10</b>이에요. 이에 대한 설명으로 알맞은 것은?',
          setup() { setCtl(['co2']); },
          choices: ['에어로졸은 햇빛을 반사·산란해 냉각 효과를 내므로, 인위적 요인이 모두 온난화를 일으키는 것은 아니에요', '에어로졸은 온실 기체라서 기온을 더 올려요', '에어로졸은 자연적 요인이라서 음수예요', '음수는 계산 실수라서 무시해도 돼요'],
          answer: 0,
          feedback: ['', '에어로졸은 온실 기체가 아니라 작은 입자예요. 햇빛을 되돌려 보내 냉각 효과가 있어요.', '여기서 에어로졸은 연소 등 인간 활동에서 나온 것을 말해요. 음수는 냉각 효과를 뜻해요.', '음수는 지구를 식히는 방향의 강제력이라는 뜻이에요.'],
          explain: '인위적 에어로졸(연소 등에서 나온 입자, 구름 효과 포함)은 햇빛을 반사해 <b>냉각</b>시켜요(−1.10 W/m²). 그래서 인위적 요인 중에도 냉각으로 작용하는 것이 있고, 합은 +2.7 W/m²이에요.',
        },
      ],
    },
    {
      title: '해결 방법: 완화와 적응', short: '해결 방법', icon: '🌍', phase: '적용', features: ['fut'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 최근의 온난화에 인위적 요인이 크게 기여했다는 것을 확인했어요. 원인이 인간 활동이라면 <b>해결도 우리의 선택</b>에 달려 있어요.</div>' +
        '<p>기후변화 대응은 <b>완화</b>(배출을 줄이고 흡수원을 늘리기)와 <b>적응</b>(변화한 기후에 맞춰 피해 줄이기)으로 나눠요. 단순화한 시나리오에서 대기 CO₂는 현재 배출(100 %)일 때 해마다 약 2.4 ppm 늘고, 바다와 식물이 현재 배출의 약 50 %를 흡수한다고 가정해요. 감축 수단 카드를 골라 2050년까지 배출을 줄이면 2100년이 어떻게 달라지는지 살펴봐요.</p>',
      setup() { resetStep(3); },
      recap: '배출을 흡수량 수준(현재의 50 %)까지 줄이면 CO₂ 증가가 멈춰요. 완화로 원인을 줄이고, 불가피한 변화는 적응으로 대비해요.',
      summary: '<ul><li>시나리오(단순화): 연 증가량 = 2.4 × (배출 비율 − 0.5) ÷ 0.5 (ppm). 배출 유지(100 %)이면 2100년 약 600 ppm, 2050년까지 직선으로 50 % 감축하면 약 450 ppm에서 멈춰요.</li><li>감축 수단(현재 배출 대비 %, 예시): 재생 에너지 확대 25, 에너지 효율 개선 15, 산림 보전·조림 10, 탄소 포집·저장 5.</li><li><b>완화</b>: 배출을 줄이고 흡수원을 늘리는 것(재생 에너지, 효율 개선, 산림 보전, 탄소 포집). <b>적응</b>: 변화한 기후의 피해를 줄이는 것(제방 보강, 가뭄에 강한 작물, 조기 경보).</li><li>적응만으로는 원인인 배출이 계속 쌓이므로 부족해요. 숲과 바다 같은 <b>흡수원 보전</b>도 중요해요.</li></ul>',
      missions: [
        {
          title: '배출을 50 % 이상 줄이는 조합 만들기',
          goal: '감축 수단 카드를 골라 <b>2050년까지 배출 감축을 50 % 이상</b>으로 만들어요.',
          hint: '재생 에너지(25) + 에너지 효율(15) + 산림 보전(10) = 50이에요. 네 개를 모두 고르면 55 %예요.',
          setup() { S.picks.clear(); recalcFut(false); setCtl(['meas']); },
          check: () => cutOf() >= 50 && Math.abs(S.cutS - cutOf()) < 0.5, hold: 0.8,
          status: () => mark(cutOf() >= 50) + ' 감축 ' + cutOf() + ' % (50 이상) · 2100년 CO₂ ' + Math.round(final().c) + ' ppm · ' + sgn(final().t, 1) + ' °C',
          explain: '감축 합이 50 %가 되면 2050년 배출이 흡수량(현재 배출의 50 %)과 같아져 CO₂ 증가가 멈추고 약 450 ppm에서 안정돼요. 배출을 유지하면 2100년에 약 600 ppm까지 늘어요.',
        },
        {
          title: '완화와 적응 분류하기', manual: true,
          goal: '기후변화 대응 방안 7가지를 <b>완화</b>와 <b>적응</b>으로 분류해요.',
          hint: '원인인 배출을 줄이거나 흡수원을 늘리면 완화, 이미 일어나는 변화의 피해를 줄이는 준비는 적응이에요.',
          setup() { clsAdapt.reset(); setCtl(['cls4']); },
          status: () => mark(clsAdapt.complete()) + ' 분류 ' + clsAdapt.count() + ' / 7 · ' + mark(clsAdapt.ok()) + ' 모두 맞음',
          check() {
            if (!clsAdapt.complete()) return '카드 7장을 모두 분류해 주세요. (지금 ' + clsAdapt.count() + '장)';
            const w = clsAdapt.wrong(); clsAdapt.mark(w);
            if (w.length) return '빨간 칸 ' + w.length + '개를 다시 생각해 보세요. 배출을 줄이는 일일까요, 피해에 대비하는 일일까요?';
            return true;
          },
          explain: '<b>완화</b>: 재생 에너지 확대, 에너지 효율 개선, 산림 보전·조림, 탄소 포집·저장. <b>적응</b>: 제방 보강, 가뭄에 강한 작물 개발, 조기 경보 체계.',
        },
        {
          type: 'quiz', title: '적응만으로는 부족한 까닭',
          goal: '배출을 줄이지 않고 <b>적응</b>만 하면 충분하지 않은 까닭은?',
          setup() { setCtl(['meas']); },
          choices: ['적응은 비용이 전혀 들지 않아서 오히려 나빠요', '기후변화가 이미 멈췄기 때문이에요', '원인인 배출이 줄지 않으면 CO₂가 계속 쌓여 변화가 더 커지고, 적응해야 할 피해도 계속 늘어나기 때문이에요', '숲과 바다는 CO₂를 흡수하지 못하기 때문이에요'],
          answer: 2,
          feedback: ['적응에도 비용이 들지만 문제는 비용이 아니라 원인이 해결되지 않는다는 점이에요.', '배출이 계속되면 농도와 기온은 계속 올라가요.', '', '숲과 바다는 배출의 약 절반을 흡수해 주고 있어요. 그래서 흡수원 보전이 중요해요.'],
          explain: '배출이 흡수보다 많으면 CO₂가 계속 쌓여 기온 상승이 커지므로 <b>완화</b>로 원인을 줄여야 해요. 적응은 이미 불가피한 변화에 대비하는 것이고, 숲·바다 같은 <b>흡수원 보전</b>은 배출을 줄이는 노력과 함께 중요해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-climate-change', mount: '#game', badge: '기후 탐정', homeHref: '../../index.html#he',
    featureLabels: { record: '📈 빙하 코어 · 80만 년 그래프 · 최근 150년', orbit: '🪐 공전·자전 슬라이더 · 화산 · 얼음 반사율', forc: '🏭 복사 강제력 막대 · ΔF 계산 · 관측과 모의 곡선', fut: '🌍 감축 수단 카드 · 2100년 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'record') { const d = atAge(S.cur); setReadouts(['시기', fmtAge(S.cur), 'CO₂ 농도', d.C + ' ppm', '기온 편차', sgn(d.T, 1) + ' °C']); }
    else if (m === 'orbit') setReadouts(['이심률 · 기울기', fix(S.e, 2) + ' · ' + fix(S.eps, 1) + '°', '6월 하지 일사량', fix(Qsun(S.e, S.eps, S.phi), 1) + ' W/m²', '원 궤도·23.3° 대비', sgn(Qsun(S.e, S.eps, S.phi) - K.Q0, 1) + ' W/m²']);
    else if (m === 'volcano') setReadouts(['분출 후', S.vt >= 6 ? '—' : fix(Math.min(S.vt, 5), 1) + '년', '기온 편차', sgn(K.VOLC_MIN * volH(S.vt), 2) + ' °C', '분출 횟수', S.volcanoRuns + '번']);
    else if (m === 'ice') { const a = albOf(S.ice / 100); setReadouts(['얼음 면적', S.ice + ' %', '지표 반사율', fix(a, 2), '흡수 에너지', fix(1 - a, 2)]); }
    else if (m === 'forc') setReadouts(['CO₂ 농도', S.co2 + ' ppm', 'ΔF = 5.35 ln(C/280)', fix(forceCo2(S.co2), 2) + ' W/m²', '평형 기온 상승', sgn(teq(S.co2), 1) + ' °C']);
    else setReadouts(['배출 감축', cutOf() + ' %', '2100년 CO₂', Math.round(final().c) + ' ppm', '평형 기온 상승', sgn(final().t, 1) + ' °C']);
  }

  /* ---------- 루프 ---------- */
  recalcFut(true); resetStep(0);
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.draw = Math.min(1, S.draw + dt / (RM ? 0.01 : 3.2)); const snap = (c, tg, e) => (Math.abs(c - tg) < e ? tg : c); S.eS = snap(approach(S.eS, S.e, dt, 6), S.e, 1e-4); S.epsS = snap(approach(S.epsS, S.eps, dt, 6), S.eps, 1e-3); S.phiS = snap(approach(S.phiS, S.phi, dt, 6), S.phi, 0.01);
    S.iceS = (() => { const v = approach(S.iceS, S.ice, dt, 5); return Math.abs(v - S.ice) < 0.01 ? S.ice : v; })(); S.pulse = Math.max(0, S.pulse - dt * 0.35); S.co2S = (() => { const v = approach(S.co2S, S.co2, dt, 6); return Math.abs(v - S.co2) < 0.01 ? S.co2 : v; })(); S.barP = approach(S.barP, 1, dt, 4);
    if (S.vrun) { S.vt += dt * 0.8; if (S.vt >= 5) { S.vt = 5; S.vrun = false; } }
    if (S.mode === 'fut') stepFut(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e3eef7'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'record') { drawRecord(t); if (PHONE) { drawZoom(t, { x: LR.x, y: LR.y, w: LR.w, h: 230 }); drawRecInfo(t, { x: LR.x, y: LR.y + 238, w: LR.w, h: 218 }); } else { drawZoom(t, { x: LR.x, y: LR.y, w: LR.w * 0.56 - 4, h: LR.h }); drawRecInfo(t, { x: LR.x + LR.w * 0.56 + 4, y: LR.y, w: LR.w * 0.44 - 4, h: LR.h }); } }
    else if (S.mode === 'orbit') { drawOrbit(t); drawOrbitPanel(t); }
    else if (S.mode === 'volcano') { drawVolcano(t); drawOrbitPanelVol(t); }
    else if (S.mode === 'ice') { drawIce(t); drawIcePanel(t); }
    else if (S.mode === 'forc') {
      const gap = 8;
      if (PHONE) { drawForcBars(t, { x: MR.x, y: MR.y, w: MR.w, h: 250 }); drawForcCalc(t, { x: MR.x, y: MR.y + 258, w: MR.w, h: 150 + 0 }); drawForcCurves(t, { x: LR.x, y: LR.y + 6, w: LR.w, h: 270 }); }
      else { drawForcBars(t, { x: MR.x, y: MR.y, w: MR.w * 0.54 - gap / 2, h: MR.h }); drawForcCalc(t, { x: MR.x + MR.w * 0.54 + gap / 2, y: MR.y, w: MR.w * 0.46 - gap / 2, h: MR.h }); drawForcCurves(t, LR); }
    }
    else { drawFut(t); drawFutPanel(t); }
    parts.draw(ctx);
    drawFlash(dt, 14);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });
  function drawOrbitPanelVol(t) {
    const R = LR; card(R, '1991년 피나투보 분출 (예시)');
    drawWrap(R.x + R.w / 2, R.y + 60 * FS, '큰 화산이 분출하면 성층권까지 올라간 이산화 황이 에어로졸이 되어 햇빛을 반사해요.', R.w - 40, 15, { color: '#1e293b' });
    drawWrap(R.x + R.w / 2, R.y + 112 * FS, '전 지구 평균 기온이 약 ' + sgn(K.VOLC_MIN, 1) + ' °C 낮아졌다가 1~2년 뒤 회복해요. 그래서 화산은 수 년 규모의 자연적 요인이에요.', R.w - 40, 15, { color: '#1e293b' });
  }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    VW, VH, S, K, AG, YR, OBS, SNAT, SALL, BASE, scen, forceCo2, teq, ANTHRO, Qsun, albOf, atAge, clsTime, clsNat, stpF, stpSum, clsSim, clsAdapt, cutOf, recLay, resetStep, setMode, setCur, GLACIAL_T, INTER_T,
    get game() { return game; },
    finishDraw() { S.draw = 1; },
    finalOf() { return final(); },
  };

})();
