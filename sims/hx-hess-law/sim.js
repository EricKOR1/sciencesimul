/* =========================================================
   물질과 에너지 Ⅲ. 화학 변화의 자발성 - 헤스 법칙 [12물에03-02]
   ① 모형: 경로와 ΔH (엔탈피 도표의 계단: 직접 경로와 두 단계 경로의 ΔH 합이 같음)
   ② 탐구: 식 조작 (반응식을 거꾸로 하면 부호 반대, n배 하면 ΔH 도 n배, 더하면 ΔH 도 더함)
   ③ 분석: CO의 ΔH (직접 재기 어려운 C(s) + ½O₂(g) → CO(g), N₂ → NO₂)
   ④ 적용: 퍼즐 풀기 (SO₃ 생성, 흑연 → 다이아몬드, 메테인 생성)
   표준 생성 엔탈피 표, 결합 에너지 표, 상태 함수 증명은 다루지 않아요. 흑연의 연소 ΔH 는 −393.5 kJ(앞 차시의 −394 kJ 의 정확한 값)을 써요.

   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 960 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9';
  const HOT = '#e2553b', COLD = '#2f7fd8';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const HALO = { stroke: 'rgba(255,255,255,.92)', strokeWidth: 3 };
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sgn = (v, d) => { const r = Math.round(Math.abs(v) * Math.pow(10, d || 0)) / Math.pow(10, d || 0); const s = r === 0 ? '' : v < 0 ? MINUS : '+'; return s + r.toFixed(d || 0); };
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {                                // 20000, 20,000, +92, −54, 2.0e4, 2.0×10^4 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  /* 계수 표기: 0.5 → ½, 1.5 → 1½ */
  const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const CF = (c) => { if (c === 1) return ''; const w = Math.floor(c + 1e-9), f = Math.round((c - w) * 100) / 100; return (w ? String(w) : '') + (f ? FR[f] || String(f) : ''); };
  const fmtC = (c) => CF(Math.abs(c));

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { path: '🪜 직접 가도, 거쳐 가도 높이 차는 같아요', rule: '🔧 반응식을 뒤집고 곱하고 더해요', co: '🧮 재기 어려운 반응의 ΔH 를 구해요', puzzle: '🧩 재료 식으로 목표 반응식을 만들어요' };
  const fv = (v) => (Math.abs(v - Math.round(v)) < 1e-9 && Math.abs(v) !== 283 ? String(Math.abs(Math.round(v))) : Math.abs(v).toFixed(1));
  const sv = (v) => (v < 0 ? MINUS : '+') + fv(v);                 // 부호가 있는 수 (+283.0, −393.5)
  const sd = (v) => (v < 0 ? MINUS : '') + fv(v);                  // 양수에는 + 를 붙이지 않는 수

  /* ================= 반응식 자료 ================= */
  const EQ = {
    cC:  { l: { 'C(s)': 1, 'O₂(g)': 1 }, r: { 'CO₂(g)': 1 }, dH: -393.5 },
    cCO: { l: { 'CO(g)': 1, 'O₂(g)': 0.5 }, r: { 'CO₂(g)': 1 }, dH: -283.0 },
    cH:  { l: { 'H₂(g)': 1, 'O₂(g)': 0.5 }, r: { 'H₂O(l)': 1 }, dH: -286 },
    hg:  { l: { 'H₂(g)': 1, 'O₂(g)': 0.5 }, r: { 'H₂O(g)': 1 }, dH: -242 },
    hl:  { l: { 'H₂O(g)': 1 }, r: { 'H₂O(l)': 1 }, dH: -44 },
    n1:  { l: { 'N₂(g)': 1, 'O₂(g)': 1 }, r: { 'NO(g)': 2 }, dH: 181 },
    n2:  { l: { 'NO(g)': 2, 'O₂(g)': 1 }, r: { 'NO₂(g)': 2 }, dH: -115 },
    s1:  { l: { 'S(s)': 1, 'O₂(g)': 1 }, r: { 'SO₂(g)': 1 }, dH: -297 },
    s2:  { l: { 'SO₂(g)': 2, 'O₂(g)': 1 }, r: { 'SO₃(g)': 2 }, dH: -198 },
    g1:  { l: { 'C(흑연)': 1, 'O₂(g)': 1 }, r: { 'CO₂(g)': 1 }, dH: -393.5 },
    g2:  { l: { 'C(다이아몬드)': 1, 'O₂(g)': 1 }, r: { 'CO₂(g)': 1 }, dH: -395.4 },
    m1:  { l: { 'C(s)': 1, 'O₂(g)': 1 }, r: { 'CO₂(g)': 1 }, dH: -393.5 },
    m2:  { l: { 'H₂(g)': 1, 'O₂(g)': 0.5 }, r: { 'H₂O(l)': 1 }, dH: -286 },
    m3:  { l: { 'CH₄(g)': 1, 'O₂(g)': 2 }, r: { 'CO₂(g)': 1, 'H₂O(l)': 2 }, dH: -890 },
  };
  const TG = {
    co:  { l: { 'C(s)': 1, 'O₂(g)': 0.5 }, r: { 'CO(g)': 1 } },
    no2: { l: { 'N₂(g)': 1, 'O₂(g)': 2 }, r: { 'NO₂(g)': 2 } },
    pa:  { l: { 'S(s)': 2, 'O₂(g)': 3 }, r: { 'SO₃(g)': 2 } },
    pb:  { l: { 'C(흑연)': 1 }, r: { 'C(다이아몬드)': 1 } },
    pc:  { l: { 'C(s)': 1, 'H₂(g)': 2 }, r: { 'CH₄(g)': 1 } },
  };
  /* 식을 거꾸로 하고(flip) k배 한 식 */
  function procEq(e, flip, k) {
    const sc = (o) => { const q = {}; for (const s in o) q[s] = o[s] * k; return q; };
    return { l: sc(flip ? e.r : e.l), r: sc(flip ? e.l : e.r), dH: (flip ? -1 : 1) * k * e.dH };
  }
  /* 여러 식을 더한 결과 */
  function addEqs(procs) {
    const L = {}, R = {};
    procs.forEach((p) => { for (const s in p.l) L[s] = (L[s] || 0) + p.l[s]; for (const s in p.r) R[s] = (R[s] || 0) + p.r[s]; });
    const net = {}; Object.keys(Object.assign({}, L, R)).forEach((s) => { const v = (R[s] || 0) - (L[s] || 0); if (Math.abs(v) > 1e-9) net[s] = v; });
    const cancel = Object.keys(L).filter((s) => R[s]), camt = {}; cancel.forEach((s) => { camt[s] = Math.min(L[s], R[s]); });
    const res = { l: {}, r: {} }; for (const s in net) { if (net[s] < 0) res.l[s] = -net[s]; else res.r[s] = net[s]; }
    return { L, R, net, cancel, camt, res, dH: procs.reduce((a, p) => a + p.dH, 0) };
  }
  const netOfEq = (e) => { const n = {}; for (const s in e.l) n[s] = (n[s] || 0) - e.l[s]; for (const s in e.r) n[s] = (n[s] || 0) + e.r[s]; return n; };
  function sameNet(a, b) { const ks = Object.keys(Object.assign({}, a, b)); return ks.every((s) => Math.abs((a[s] || 0) - (b[s] || 0)) < 1e-9); }
  const sideTxt = (m) => Object.keys(m).map((s) => CF(m[s]) + s).join(' + ');
  const eqTxt = (e) => sideTxt(e.l) + '  →  ' + sideTxt(e.r);

  /* 경로 도표 자료 (kJ, 0 이 가장 높은 수준) */
  const PATHS = [
    { name: '탄소의 연소', lv: [0, -110.5, -393.5], bars: [['C(s)', '+ O₂(g)'], ['CO(g)', '+ ½O₂(g)'], ['CO₂(g)']], vmin: -440, via: 'CO를 거쳐', dir: -393.5, st: [-110.5, -283.0] },
    { name: '수소의 연소', lv: [0, -242, -286], bars: [['H₂(g)', '+ ½O₂(g)'], ['H₂O(g)'], ['H₂O(l)']], vmin: -320, via: 'H₂O(g)를 거쳐', dir: -286, st: [-242, -44] },
  ];
  /* 구하기 · 퍼즐 자료 */
  const COS = [
    { name: 'C + ½O₂ → CO', tg: TG.co, ing: ['cC', 'cCO'], ans: -110.5, tol: 0.6, note: '흑연의 연소와 CO 의 연소로 구해요' },
    { name: 'N₂ + 2O₂ → 2NO₂', tg: TG.no2, ing: ['n1', 'n2'], ans: 66, tol: 1, note: 'N₂ + O₂ → 2NO 와 2NO + O₂ → 2NO₂ 로 구해요' },
  ];
  const PZS = [
    { name: '퍼즐 A', title: 'SO₃ 생성', tg: TG.pa, ing: ['s1', 's2'], ans: -792, tol: 1 },
    { name: '퍼즐 B', title: '흑연 → 다이아몬드', tg: TG.pb, ing: ['g1', 'g2'], ans: 1.9, tol: 0.35 },
    { name: '퍼즐 C', title: '메테인 생성', tg: TG.pc, ing: ['m1', 'm2', 'm3'], ans: -75.5, tol: 0.6 },
  ];
  const ROM = ['(ⅰ)', '(ⅱ)', '(ⅲ)'];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'path', fade: 0, lock: false, t: 0, sub: { rule: 'flip' },
    pa: { sc: 0, run: null, p: 0, seen: [{ direct: false, via: false }, { direct: false, via: false }], q: ['', '', ''], ok: [false, false, false], hl: 0, ballE: 0 },
    ru: { card: 0, flip: false, flipT: 1, flipShow: false, k: 1, kPulse: 1, did: { flip: false, mul: false, add: false }, add: { t: 0, run: false, done: false }, rule: [null, null, null] },
    co: { cs: 0, flip: [[false, false], [false, false]], q: ['', ''], ok: [false, false], solved: [false, false], anim: 1 },
    pz: { cs: 0, flip: [[false, false, false], [false, false, false], [false, false, false]], k: [[1, 1, 0], [1, 1, 0], [1, 1, 1]], q: ['', '', ''], ok: [false, false, false], solved: [false, false, false], anim: 1 },
  };
  let game = null;
  const RULES = [
    { t: '반응식을 거꾸로 쓰면 ΔH 의 부호는', opts: ['그대로예요', '반대가 돼요', '0 이 돼요'], ans: 1, tip: '거꾸로 하면 내놓던 열을 흡수하게 돼요. 부호가 반대가 돼요.' },
    { t: '계수를 n배 하면 ΔH 는', opts: ['그대로예요', 'n배가 돼요', 'n 만큼 커져요'], ans: 1, tip: 'ΔH 는 식에 적힌 계수만큼 반응할 때의 열이라 n배가 돼요.' },
    { t: '두 식을 더하면 ΔH 는', opts: ['곱해요', '빼요', '더해요'], ans: 2, tip: '식을 더하면 ΔH 도 더해요. 소거되는 물질은 ΔH 에 영향이 없어요.' },
  ];
  const ruleOk = () => S.ru.rule.every((v, i) => v === RULES[i].ans);
  const paOkAll = () => S.pa.ok.every((x) => x);
  const paSeenAll = () => S.pa.seen[0].direct && S.pa.seen[0].via;
  const coCase = () => COS[S.co.cs], pzCase = () => PZS[S.pz.cs];
  function coItems(c) { return coCase().ing.map((k, i) => ({ e: EQ[k], flip: S.co.flip[c !== undefined ? c : S.co.cs][i], k: 1 })); }
  function pzItems(c) { c = c !== undefined ? c : S.pz.cs; return PZS[c].ing.map((k, i) => ({ e: EQ[k], flip: S.pz.flip[c][i], k: S.pz.k[c][i] })).filter((o) => o.k > 0); }
  function comboOf(items) { return addEqs(items.map((o) => procEq(o.e, o.flip, o.k))); }
  const coMatch = (c) => { const cc = COS[c], m = comboOf(cc.ing.map((k, i) => ({ e: EQ[k], flip: S.co.flip[c][i], k: 1 }))); return sameNet(m.net, netOfEq(cc.tg)); };
  const pzMatch = (c) => { const items = pzItems(c); if (!items.length) return false; return sameNet(comboOf(items).net, netOfEq(PZS[c].tg)); };
  const comboDH = (items) => comboOf(items).dH;

  /* ================= 공용 그리기 ================= */
  const clip01 = (v) => Math.max(0, Math.min(1, v));
  function bar(x0, x1, y, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }
  function drawTokens(cx, y, toks, size, weight, align) {
    ctx.save(); ctx.font = D.font(size, weight || 800);
    const ws = toks.map((k) => ctx.measureText(k.t).width), tot = ws.reduce((a, b) => a + b, 0); let x = align === 'left' ? cx : cx - tot / 2;
    ctx.restore();
    toks.forEach((k, i) => {
      if (k.bg) { D.roundRect(x - 2, y - size + 1 + (k.dy || 0), ws[i] + 4, size + 7, 6); ctx.fillStyle = C.rgba(k.bg, 0.22 * (k.a != null ? k.a : 1)); ctx.fill(); }
      T(x, y + (k.dy || 0), k.t, size, k.c || INK, 'left', weight || 800, k.a != null ? { alpha: k.a } : null); x += ws[i];
    });
    return tot;
  }
  /* 한쪽 식(species → 계수)을 줄 바꿈하며 그려요. camt: 소거되는 양(species → 양) */
  function drawSide(x, y, maxW, m, size, color, camt, fade) {
    const parts2 = [];
    Object.keys(m).forEach((s) => {
      const ca = camt && camt[s] ? Math.min(camt[s], m[s]) : 0, rest = m[s] - ca;
      if (ca > 1e-9) parts2.push({ t: CF(ca) + s, cn: true });
      if (rest > 1e-9) parts2.push({ t: CF(rest) + s, cn: false });
    });
    ctx.save(); ctx.font = D.font(size, 800);
    let cx = x, cy = y;
    const lay = parts2.map((q, i) => { const txt = (i ? ' + ' : '') + q.t, w = ctx.measureText(txt).width; if (cx + w > x + maxW && i) { cx = x; cy += size + 8; } const o = { txt, w, x: cx, y: cy, cn: q.cn }; cx += w; return o; });
    ctx.restore();
    lay.forEach((o) => {
      if (o.cn) { D.roundRect(o.x - 2, o.y - size + 1, o.w + 4, size + 7, 6); ctx.fillStyle = 'rgba(217,119,6,' + (0.2 * (1 - 0.7 * (fade || 0))) + ')'; ctx.fill(); }
      T(o.x, o.y, o.txt, size, o.cn ? AMB : color, 'left', 800, o.cn ? { alpha: 1 - 0.6 * (fade || 0) } : null);
      if (o.cn && (fade || 0) > 0.3) { ctx.strokeStyle = 'rgba(217,119,6,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x, o.y - size * 0.3); ctx.lineTo(o.x + o.w, o.y - size * 0.3); ctx.stroke(); }
    });
    return cy + 6 - y + size;
  }

  /* ================= ① 경로와 ΔH ================= */
  const PS = () => PATHS[S.pa.sc];
  const PG = () => { const L = RC.L; const bw = 84, gap = 40, x0 = L.x + 106; return { x0, bw, gap, xs: [x0, x0 + bw + gap, x0 + 2 * (bw + gap)], top: L.y + 100, bot: L.y + L.h - 78, ax: L.x + 16 }; };
  const pgY = (v) => { const g = PG(), P = PS(); return g.top + (-v) / (-P.vmin) * (g.bot - g.top); };
  const paRevealed = (k) => { const P = S.pa, sc = P.sc; if (sc === 0) return k === 'dir' ? P.ok[0] : k === 's1' ? P.ok[1] : P.ok[2]; return k === 'dir' ? P.seen[1].direct : P.seen[1].via; };
  function paRun(kind) {
    const P = S.pa; P.run = kind; P.p = 0; P.hl = kind; Sound.click(); updateCtl();
  }
  function stepPath(dt) {
    const P = S.pa;
    if (P.run) {
      P.p = Math.min(1, P.p + dt / (P.run === 'direct' ? 2.2 : 3.2) * (RM ? 8 : 1));
      if (P.p >= 1) { P.seen[P.sc][P.run] = true; P.run = null; Sound.tick(); updateCtl(); }
    }
  }
  function ballPos() {
    const P = S.pa, g = PG(), Pt = PS(), cx = (i) => g.xs[i] + g.bw / 2, cy = (i) => pgY(Pt.lv[i]) - 11;
    const kind = P.run || P.hl;
    if (!kind) return { x: cx(0), y: cy(0) };
    const p = P.run ? sm(P.p) : 1;
    if (kind === 'direct') return { x: cx(0) + (cx(2) - cx(0)) * p, y: cy(0) + (cy(2) - cy(0)) * p - Math.sin(p * Math.PI) * 18 };
    if (p < 0.5) { const q = sm(p * 2); return { x: cx(0) + (cx(1) - cx(0)) * q, y: cy(0) + (cy(1) - cy(0)) * q - Math.sin(q * Math.PI) * 14 }; }
    const q = sm((p - 0.5) * 2); return { x: cx(1) + (cx(2) - cx(1)) * q, y: cy(1) + (cy(2) - cy(1)) * q - Math.sin(q * Math.PI) * 14 };
  }
  function drawPath(t) {
    const L = RC.L, P = S.pa, g = PG(), Pt = PS();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🪜 ' + Pt.name + ': 엔탈피 도표의 계단', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '구슬이 위에서 아래로 내려가며 열을 내놓아요. 높이 차가 ΔH 예요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    D.arrow(g.ax, g.bot + 6, g.ax, g.top - 34, { color: '#8a95a8', width: 2, head: 9 });
    T(g.ax + 6, g.top - 40, '엔탈피 H', 12, MUTED, 'left', 800);
    // 눈금
    for (let v = 0; v >= Pt.vmin + 1; v -= 100) {
      ctx.strokeStyle = v === 0 ? 'rgba(100,116,139,.35)' : '#eef1f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.ax + 26, pgY(v)); ctx.lineTo(L.x + L.w - 12, pgY(v)); ctx.stroke();
      T(g.ax + 46, pgY(v) + 4, v === 0 ? '0' : MINUS + Math.abs(v), 12, MUTED, 'right', 700);
    }
    T(g.ax + 28, g.top - 22, 'kJ', 12, MUTED, 'left', 800);
    // 막대
    Pt.lv.forEach((v, i) => {
      const y = pgY(v); bar(g.xs[i], g.xs[i] + g.bw, y, i === 0 ? '#4b5d7e' : i === 1 ? '#7c8bb0' : '#2f7fd8');
      Pt.bars[i].forEach((s, k) => T(g.xs[i] + g.bw / 2, y - 28 - (Pt.bars[i].length - 1 - k) * 15, s, 12.5, INK, 'center', 800, HALO));
      const rev = i === 1 ? paRevealed('s1') || (P.sc === 1 && paRevealed('via')) : i === 2 ? paRevealed('dir') : true;
      if (i > 0 && rev && (i === 1 ? true : true)) T(g.xs[i] + g.bw / 2, y + 19, sd(v) + ' kJ', 12, '#0f6b3c', 'center', 800);
    });
    // 직접 경로 화살표
    const hl = P.run || P.hl, dirOn = hl === 'direct', viaOn = hl === 'via';
    const xd = g.xs[0] - 18;
    D.arrow(xd, pgY(0), xd, pgY(Pt.lv[2]) - 2, { color: PUR, width: dirOn ? 5 : 3, head: 11, alpha: !hl || dirOn ? 1 : 0.3 });
    D.label(xd + 2, (pgY(0) + pgY(Pt.lv[2])) / 2, paRevealed('dir') ? '직접 ' + sd(Pt.dir) : '직접 ΔH', { size: 12, bg: PUR, align: 'left' });
    // 두 단계 화살표
    [[0, 1, 'ΔH₁', 's1'], [1, 2, 'ΔH₂', 's2']].forEach(([a, b, lab, key], i) => {
      const x = g.xs[a] + g.bw + g.gap / 2;
      D.arrow(x, pgY(Pt.lv[a]), x, pgY(Pt.lv[b]) - 2, { color: AMB, width: viaOn ? 5 : 3, head: 11, alpha: !hl || viaOn ? 1 : 0.3 });
      const show = P.sc === 0 ? (i === 0 ? P.ok[1] : P.ok[2]) : P.seen[1].via;
      D.label(x, (pgY(Pt.lv[a]) + pgY(Pt.lv[b])) / 2, show ? sd(Pt.st[i]) : lab, { size: 12, bg: AMB, align: 'center' });
    });
    const b = ballPos(); D.sphere(b.x, b.y, 11, '#8b5cf6', { shadow: true });
    // 아래 문구
    const sumTxt = P.sc === 0 ? (paOkAll() ? sd(Pt.st[0]) + ' + (' + sd(Pt.st[1]) + ') = ' + sd(Pt.st[0] + Pt.st[1]) + ' = 직접 ' + sd(Pt.dir) : '') : (P.seen[1].via && P.seen[1].direct ? sd(Pt.st[0]) + ' + (' + sd(Pt.st[1]) + ') = ' + sd(Pt.st[0] + Pt.st[1]) + ' = 직접 ' + sd(Pt.dir) : '');
    if (sumTxt) { D.label(L.x + L.w / 2, L.y + L.h - 52, 'ΔH₁ + ΔH₂ = ' + sumTxt, { size: 13, bg: GOOD, align: 'center' }); }
    textBlock(L.x + 14, L.y + L.h - 26, L.w - 28, sumTxt ? '출발점과 도착점의 높이가 같아서 어느 길로 가도 ΔH 의 합은 같아요.' : '두 길로 모두 내려가 보고, 눈금을 읽어 각 화살표의 ΔH 를 적어요.', 12.5, INK, 16, 800);
  }
  function drawPathInfo(t) {
    const R = RC.R, P = S.pa, Pt = PS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 두 경로 비교', 14.5, INK, 'left', 800);
    let y = R.y + 54;
    D.roundRect(R.x + 10, y - 20, R.w - 20, 62, 10); ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fill(); ctx.strokeStyle = PUR; ctx.lineWidth = P.seen[P.sc].direct ? 2 : 1.2; ctx.stroke();
    T(R.x + 20, y, '① 직접 경로', 13.5, PUR, 'left', 800);
    T(R.x + 20, y + 24, 'ΔH = ' + (paRevealed('dir') ? sd(Pt.dir) + ' kJ' : '?'), 15, INK, 'left', 800);
    if (P.seen[P.sc].direct) D.check(R.x + R.w - 28, y + 6, 10, 1);
    y += 76;
    D.roundRect(R.x + 10, y - 20, R.w - 20, 82, 10); ctx.fillStyle = 'rgba(217,119,6,.07)'; ctx.fill(); ctx.strokeStyle = AMB; ctx.lineWidth = P.seen[P.sc].via ? 2 : 1.2; ctx.stroke();
    T(R.x + 20, y, '② ' + Pt.via + ' 두 단계', 13.5, '#b45309', 'left', 800);
    const a = P.sc === 0 ? P.ok[1] : P.seen[1].via, b = P.sc === 0 ? P.ok[2] : P.seen[1].via;
    T(R.x + 20, y + 24, 'ΔH₁ = ' + (a ? sd(Pt.st[0]) : '?') + '   ΔH₂ = ' + (b ? sd(Pt.st[1]) : '?'), 14, INK, 'left', 800);
    T(R.x + 20, y + 46, 'ΔH₁ + ΔH₂ = ' + (a && b ? sd(Pt.st[0] + Pt.st[1]) + ' kJ' : '?'), 14.5, a && b ? '#0f6b3c' : MUTED, 'left', 800);
    if (P.seen[P.sc].via) D.check(R.x + R.w - 28, y + 6, 10, 1);
    y += 92;
    const same = (P.sc === 0 ? paOkAll() : P.seen[1].via && P.seen[1].direct);
    if (same) { D.roundRect(R.x + 10, y, R.w - 20, 66, 10); ctx.fillStyle = 'rgba(20,160,88,.09)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.6; ctx.stroke(); textBlock(R.x + 20, y + 22, R.w - 40, '두 경로의 ΔH 가 같아요! 중간에 어떤 길을 거쳐도 전체 ΔH 는 변하지 않아요.', 12.5, '#0f6b3c', 17, 800); y += 76; }
    if (!PHONE || y + 50 < R.y + R.h) textBlock(R.x + 14, y + 4, R.w - 28, P.sc === 0 ? '산 아래에서 정상까지 오를 때, 길이 달라도 높이 차는 같은 것과 같아요.' : 'H₂ + ½O₂ → H₂O(l) 의 ΔH 는 H₂O(g) 를 거쳐도 같아요: −242 + (−44) = −286 kJ.', 12.5, MUTED, 17, 700);
  }

  /* ================= ② 식 조작 ================= */
  const RUC = [['cC', 'C(s) 의 연소'], ['cCO', 'CO(g) 의 연소'], ['cH', 'H₂(g) 의 연소']];
  const ruE = () => EQ[RUC[S.ru.card][0]];
  function ruFlip() { const U = S.ru; U.oldFlip = U.flip; U.flip = !U.flip; U.flipT = 0; U.did.flip = true; Sound.click(); updateCtl(); }
  function ruMul(k) { const U = S.ru; if (U.k !== k) { U.k = k; U.kPulse = 0; if (k > 1) U.did.mul = true; Sound.tick(); } updateCtl(); }
  function ruCard(i) { const U = S.ru; U.card = i; U.flip = false; U.oldFlip = false; U.flipT = 1; U.k = 1; U.kPulse = 1; updateCtl(); }
  function ruAdd() { const A = S.ru.add; if (A.run) return; A.run = true; A.t = 0; A.done = false; Sound.click(); updateCtl(); }
  function ruAddReset() { const A = S.ru.add; A.run = false; A.t = 0; A.done = false; updateCtl(); }
  function stepRule(dt) {
    const U = S.ru; if (U.flipT < 1) U.flipT = Math.min(1, U.flipT + dt / 0.5 * (RM ? 5 : 1));
    if (U.kPulse < 1) U.kPulse = Math.min(1, U.kPulse + dt / 0.45 * (RM ? 5 : 1));
    const A = U.add; if (A.run) { A.t = Math.min(1, A.t + dt / 3.0 * (RM ? 5 : 1)); if (A.t >= 1) { A.run = false; A.done = true; U.did.add = true; Sound.success(); updateCtl(); } }
  }
  function drawRule(t) {
    const L = RC.L, U = S.ru;
    panel(L.x, L.y, L.w, L.h, 14);
    if (S.sub.rule === 'flip') {
      T(L.x + 14, L.y + 26, '🔄 거꾸로 쓰고, 몇 배 해 보아요', PHONE ? 14 : 15, INK, 'left', 800);
      T(L.x + 14, L.y + 46, '조작판에서 카드를 고르고 ΔH 가 어떻게 변하는지 봐요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
      const e = ruE(), cx = L.x + L.w / 2, cy = L.y + 190, f = U.flipT < 0.5 ? U.oldFlip : U.flip, p = procEq(e, f, U.k);
      T(L.x + 18, L.y + 82, '원래 식', 12.5, MUTED, 'left', 800);
      T(L.x + 18, L.y + 102, eqTxt(e) + '   ΔH = ' + sv(e.dH) + ' kJ', PHONE ? 12 : 13.5, MUTED, 'left', 800);
      const sx = Math.max(0.03, Math.abs(Math.cos(Math.PI * U.flipT))), pulse = 1 + 0.1 * Math.sin(Math.PI * U.kPulse);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sx * pulse, pulse);
      D.shadow(() => { D.roundRect(-L.w / 2 + 16, -62, L.w - 32, 150, 16); ctx.fillStyle = f ? '#fff3e8' : '#f1f6ff'; ctx.fill(); }, { blur: 10, y: 4 });
      D.roundRect(-L.w / 2 + 16, -62, L.w - 32, 150, 16); ctx.strokeStyle = f ? AMB : BLU; ctx.lineWidth = 2.4; ctx.stroke();
      const toks = []; const addSide = (m) => Object.keys(m).forEach((s, i) => { if (i) toks.push({ t: ' + ', c: MUTED }); toks.push({ t: CF(m[s]), c: AMB }); toks.push({ t: s, c: INK }); });
      addSide(p.l); toks.push({ t: '  →  ', c: MUTED }); addSide(p.r);
      const w = drawTokens(0, -14, toks, PHONE ? 15 : 17, 800);
      T(0, 44, 'ΔH = ' + sv(p.dH) + ' kJ', 24, p.dH < 0 ? HOT : COLD, 'center', 800);
      T(0, 74, (f ? '거꾸로 ' : '') + (U.k > 1 ? '× ' + U.k : '') || '', 13, MUTED, 'center', 800);
      ctx.restore();
      // 계산식
      const sgnTxt = f ? '(−1)' : '(+1)';
      textBlock(L.x + 16, L.y + 322, L.w - 32, 'ΔH = ' + sgnTxt + ' × ' + U.k + ' × (' + sv(e.dH) + ') = ' + sv(p.dH) + ' kJ', 14, INK, 20, 800);
      textBlock(L.x + 16, L.y + 352, L.w - 32, f ? '거꾸로 쓰면 반응물과 생성물이 바뀌고 ΔH 의 부호가 반대가 돼요.' : '거꾸로 쓰기를 눌러 보세요.', 13, INK, 18, 700);
      textBlock(L.x + 16, L.y + 392, L.w - 32, U.k > 1 ? '계수를 ' + U.k + '배 하면 반응하는 양이 ' + U.k + '배라 ΔH 도 ' + U.k + '배예요.' : '계수를 2배, 3배로 바꿔 보세요.', 13, INK, 18, 700);
    } else {
      T(L.x + 14, L.y + 26, '➕ 두 식을 더하면?', PHONE ? 14 : 15, INK, 'left', 800);
      T(L.x + 14, L.y + 46, '같은 물질은 소거되고 ΔH 는 더해져요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
      const A = U.add, t1 = A.done ? 1 : A.t, hi = sm(clip01((t1 - 0.12) / 0.2)), mv = sm(clip01((t1 - 0.4) / 0.3)), res = sm(clip01((t1 - 0.72) / 0.28));
      const c1 = [EQ.hg, L.y + 74], c2 = [EQ.hl, L.y + 168];
      [c1, c2].forEach(([e, y], k) => {
        D.shadow(() => { D.roundRect(L.x + 14, y, L.w - 28, 76, 14); ctx.fillStyle = '#f1f6ff'; ctx.fill(); }, { blur: 8, y: 3 }); D.roundRect(L.x + 14, y, L.w - 28, 76, 14); ctx.strokeStyle = BLU; ctx.lineWidth = 1.8; ctx.stroke();
        T(L.x + 26, y + 22, ROM[k], 14, BLU, 'left', 800);
        const toks = []; const side = (m, left) => Object.keys(m).forEach((s, i) => { if (i) toks.push({ t: ' + ', c: MUTED }); const can = s === 'H₂O(g)'; toks.push({ t: CF(m[s]) + s, c: can && hi > 0 ? AMB : INK, bg: can && hi > 0 ? AMB : null, dy: can ? mv * (k === 0 ? 46 : -46) : 0, a: can ? 1 - mv * 0.9 : 1 }); });
        side(e.l); toks.push({ t: '  →  ', c: MUTED }); side(e.r);
        drawTokens(L.x + L.w / 2, y + 40, toks, PHONE ? 15 : 17, 800);
        T(L.x + L.w - 26, y + 64, 'ΔH = ' + sv(e.dH) + ' kJ', 14, HOT, 'right', 800);
      });
      D.sphere(L.x + L.w / 2, L.y + 154, 11, '#8b5cf6', { gloss: true, text: '+' });
      ctx.globalAlpha = res; const ry = L.y + 280 + (1 - res) * 24;
      D.shadow(() => { D.roundRect(L.x + 14, ry, L.w - 28, 92, 14); ctx.fillStyle = '#eefaf3'; ctx.fill(); }, { blur: 8, y: 3 }); D.roundRect(L.x + 14, ry, L.w - 28, 92, 14); ctx.strokeStyle = GOOD; ctx.lineWidth = 2.2; ctx.stroke();
      drawTokens(L.x + L.w / 2, ry + 34, [{ t: 'H₂(g) + ½O₂(g)', c: INK }, { t: '  →  ', c: MUTED }, { t: 'H₂O(l)', c: INK }], PHONE ? 15 : 17, 800);
      T(L.x + L.w / 2, ry + 66, 'ΔH = (' + sv(EQ.hg.dH) + ') + (' + sv(EQ.hl.dH) + ') = ' + sv(EQ.hg.dH + EQ.hl.dH) + ' kJ', 15, HOT, 'center', 800);
      ctx.globalAlpha = 1;
      textBlock(L.x + 16, L.y + 390, L.w - 32, A.done ? 'H₂O(g) 가 양쪽에서 소거되고, ΔH 는 −242 + (−44) = −286 kJ 로 더해졌어요.' : A.run ? '같은 물질 H₂O(g) 가 왼쪽 식의 생성물이자 오른쪽 식의 반응물이에요…' : '「두 식 더하기」를 눌러 보세요.', 13, INK, 18, 800);
    }
  }
  function drawRuleInfo(t) {
    const R = RC.R, U = S.ru;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📏 규칙 정리', 14.5, INK, 'left', 800);
    let y = R.y + 46;
    RULES.forEach((r, i) => {
      const ok = U.rule[i] === r.ans;
      D.roundRect(R.x + 10, y, R.w - 20, 70, 10); ctx.fillStyle = ok ? 'rgba(20,160,88,.09)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = ok ? GOOD : '#dbe3f3'; ctx.lineWidth = ok ? 2 : 1.3; ctx.stroke();
      T(R.x + 20, y + 20, '규칙 ' + (i + 1), 12.5, ok ? '#0f6b3c' : MUTED, 'left', 800);
      const ls = wrap(r.t + ' ' + (ok ? r.opts[r.ans] : '…'), R.w - 40, 12.5, 800); ls.slice(0, 3).forEach((l, k) => T(R.x + 20, y + 38 + k * 16, l, 12.5, ok ? '#0f6b3c' : INK, 'left', 800));
      y += 78;
    });
    const dids = [['뒤집어 보기', U.did.flip], ['계수 바꿔 보기', U.did.mul], ['식 더해 보기', U.did.add]];
    if (!PHONE || y + 24 < R.y + R.h) T(R.x + 14, y + 14, dids.map((d) => mark(d[1]) + ' ' + d[0]).join('  '), 12, MUTED, 'left', 800);
  }

  /* ================= ③ CO의 ΔH · ④ 퍼즐 (공용 조합기) ================= */
  const comboKey = (items) => items.map((o) => (o.flip ? '-' : '+') + o.k).join('|');
  function termTxt(o) { const v = (o.flip ? -1 : 1) * o.e.dH; return (o.k > 1 ? o.k + ' × ' : '') + '(' + sv(v) + ')'; }
  const exprOf = (items) => items.map(termTxt).join(' + ');
  const diffTxt = (net, tgNet) => {
    const ks = Object.keys(Object.assign({}, net, tgNet)).filter((s) => Math.abs((net[s] || 0) - (tgNet[s] || 0)) > 1e-9);
    const lf = [], rt = [];
    ks.forEach((s) => { const d = (net[s] || 0) - (tgNet[s] || 0); (d > 0 ? rt : lf).push(CF(Math.abs(d)) + s); });
    return '목표와 다른 물질' + (lf.length ? ' · 반응물쪽: ' + lf.join(', ') : '') + (rt.length ? ' · 생성물쪽: ' + rt.join(', ') : '');
  };
  function stepCombo(dt) {
    ['co', 'pz'].forEach((m) => {
      const Q = S[m], items = m === 'co' ? coItems() : pzItems(), key = m + Q.cs + ':' + comboKey(items);
      if (Q.key !== key) { Q.key = key; Q.anim = RM ? 1 : 0; }
      Q.anim = Math.min(1, Q.anim + dt / 1.1);
    });
  }
  /* cfg: {title, tg, ings:[{e, flip, k, used}], match} */
  function drawCombo(title, tg, ings, anim, ansDone) {
    const L = RC.L, used = ings.filter((o) => o.k > 0), cb = used.length ? comboOf(used) : null, match = !!cb && sameNet(cb.net, netOfEq(tg));
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, title, PHONE ? 14 : 15, INK, 'left', 800);
    // 목표
    D.roundRect(L.x + 12, L.y + 38, L.w - 24, 52, 12); ctx.fillStyle = match ? 'rgba(20,160,88,.09)' : '#f3efff'; ctx.fill(); ctx.strokeStyle = match ? GOOD : 'rgba(124,58,237,.45)'; ctx.lineWidth = match ? 2.4 : 1.6; ctx.stroke();
    T(L.x + 22, L.y + 56, '🎯 목표', 12.5, PUR, 'left', 800);
    T(L.x + 22, L.y + 78, eqTxt(tg) + (ansDone ? '' : '   ΔH = ?'), PHONE ? 13.5 : 15, INK, 'left', 800);
    // 재료 식
    const ch = ings.length === 3 ? 56 : 62, y0 = L.y + 98;
    ings.forEach((o, i) => {
      const y = y0 + i * (ch + 4), on = o.k > 0, p = procEq(o.e, o.flip, on ? o.k : 1);
      D.roundRect(L.x + 12, y, L.w - 24, ch, 10); ctx.fillStyle = on ? (o.flip ? '#fff3e8' : '#f1f6ff') : '#f4f5f8'; ctx.fill(); ctx.strokeStyle = on ? (o.flip ? AMB : BLU) : '#dde2ec'; ctx.lineWidth = on ? 1.8 : 1.2; ctx.stroke();
      ctx.globalAlpha = on ? 1 : 0.5;
      T(L.x + 22, y + 22, ROM[i], 13.5, o.flip ? '#b45309' : BLU, 'left', 800);
      const toks = []; const side = (m) => Object.keys(m).forEach((s, k) => { if (k) toks.push({ t: ' + ', c: MUTED }); toks.push({ t: CF(m[s]), c: AMB }); toks.push({ t: s, c: INK }); });
      side(p.l); toks.push({ t: ' → ', c: MUTED }); side(p.r);
      drawTokens(L.x + 52, y + 22, toks, PHONE ? 12.5 : 14, 800, 'left');
      T(L.x + 52, y + ch - 10, (on ? (o.flip ? '거꾸로 ' : '') + (o.k > 1 ? '× ' + o.k + ' ' : '') : '사용 안 함 ') + (on ? '  ΔH = ' + sv(p.dH) + ' kJ' : ''), 12.5, on ? (p.dH < 0 ? HOT : COLD) : MUTED, 'left', 800);
      ctx.globalAlpha = 1;
    });
    // 더한 결과
    const sy = y0 + ings.length * (ch + 4) + 8;
    D.roundRect(L.x + 12, sy, L.w - 24, L.y + L.h - 12 - sy, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    if (!cb) { T(L.x + 24, sy + 28, '재료 식을 하나 이상 사용해요 (0 이 아닌 배수).', 13, MUTED, 'left', 700); return { match: false, cb: null }; }
    const fade = sm(anim), mw = L.w - 48 - 56;
    T(L.x + 24, sy + 22, '식을 더하면', 12.5, MUTED, 'left', 800);
    T(L.x + 24, sy + 44, '반응물', 12, MUTED, 'left', 800);
    const h1 = drawSide(L.x + 76, sy + 44, mw + 20, cb.L, 13.5, INK, cb.camt, fade);
    let y = sy + 44 + h1 + 6;
    T(L.x + 24, y, '생성물', 12, MUTED, 'left', 800);
    const h2 = drawSide(L.x + 76, y, mw + 20, cb.R, 13.5, INK, cb.camt, fade);
    y += h2 + 8;
    if (cb.cancel.length) T(L.x + 24, y, '소거: ' + cb.cancel.join(', '), 12.5, '#b45309', 'left', 800);
    y += 24;
    ctx.globalAlpha = fade;
    T(L.x + 24, y, '결과', 12, MUTED, 'left', 800);
    const rl = Object.keys(cb.res.l).length ? sideTxt(cb.res.l) : '(없음)', rr = Object.keys(cb.res.r).length ? sideTxt(cb.res.r) : '(없음)';
    const rw = wrap(rl + '  →  ' + rr, L.w - 48 - 52, 14, 800); rw.forEach((ln, i) => T(L.x + 76, y + i * 18, ln, 14, match ? '#0f6b3c' : BAD, 'left', 800));
    y += rw.length * 18 + 6;
    D.label(L.x + 24, y + 8, match ? '✅ 목표 반응식과 같아요' : '❌ 목표 반응식과 달라요', { size: 12.5, bg: match ? GOOD : BAD, align: 'left' });
    ctx.globalAlpha = 1;
    return { match, cb };
  }
  function drawComboInfo(items, tg, ans, ansDone, extra, solvedList) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧮 ΔH 계산', 14.5, INK, 'left', 800);
    let y = R.y + 52;
    const cb = items.length ? comboOf(items) : null, match = !!cb && sameNet(cb.net, netOfEq(tg));
    if (match) {
      T(R.x + 14, y, '목표 반응식이 되었어요!', 13.5, '#0f6b3c', 'left', 800); y += 24;
      D.roundRect(R.x + 10, y - 6, R.w - 20, 76, 10); ctx.fillStyle = 'rgba(20,160,88,.09)'; ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 1.6; ctx.stroke();
      const ls = wrap('ΔH = ' + exprOf(items), R.w - 40, 13, 800); ls.slice(0, 3).forEach((l, k) => T(R.x + 20, y + 14 + k * 17, l, 13, INK, 'left', 800));
      T(R.x + 20, y + 14 + Math.min(3, ls.length) * 17 + 2, ansDone ? '= ' + sv(cb.dH) + ' kJ' : '= ?  (조작판에 적어요)', 14.5, ansDone ? HOT : PUR, 'left', 800);
      y += 90;
    } else if (cb) {
      const d = diffTxt(cb.net, netOfEq(tg));
      y += textBlock(R.x + 14, y, R.w - 28, '아직 목표 반응식이 아니에요.', 13.5, BAD, 18, 800) + 4;
      y += textBlock(R.x + 14, y, R.w - 28, d, 12.5, INK, 17, 700) + 8;
      y += textBlock(R.x + 14, y, R.w - 28, '목표에 없는 물질이 남지 않도록, 필요한 식을 거꾸로 하거나 몇 배 해요.', 12.5, MUTED, 17, 700) + 4;
    } else y += textBlock(R.x + 14, y, R.w - 28, '재료 식을 사용해 목표 반응식을 만들어요.', 13, MUTED, 18, 700) + 4;
    solvedList.forEach((s, i) => { if (!PHONE || y + 22 < R.y + R.h) T(R.x + 14, y + 6 + i * 22, mark(s[1]) + ' ' + s[0], 13, s[1] ? '#0f6b3c' : MUTED, 'left', 800); });
    y += solvedList.length * 22 + 14;
    if (extra && (!PHONE || y + 40 < R.y + R.h)) textBlock(R.x + 14, y, R.w - 28, extra, 12.5, MUTED, 17, 700);
  }
  function drawCo(t) {
    const Q = S.co, c = coCase(), ings = coItems().map((o) => o);
    drawCombo('🧮 ' + c.name + ' 의 ΔH 를 구해요 (직접 재기 어려워요)', c.tg, ings, Q.anim, Q.solved[Q.cs]);
  }
  function drawCoInfo(t) {
    const Q = S.co, c = coCase();
    drawComboInfo(coItems(), c.tg, c.ans, Q.solved[Q.cs], c.note + '. 같은 물질이 양쪽에 있으면 소거돼요.', COS.map((x, i) => [x.name, Q.solved[i]]));
  }
  function drawPz(t) {
    const Q = S.pz, c = pzCase(), ings = c.ing.map((k, i) => ({ e: EQ[k], flip: Q.flip[Q.cs][i], k: Q.k[Q.cs][i] }));
    drawCombo('🧩 ' + c.name + ': ' + c.title, c.tg, ings, Q.anim, Q.solved[Q.cs]);
  }
  function drawPzInfo(t) {
    const Q = S.pz, c = pzCase();
    drawComboInfo(pzItems(), c.tg, c.ans, Q.solved[Q.cs], '식을 몇 배 하고 거꾸로 하여 더한 뒤, 같은 물질을 소거해 목표 반응식을 만들어요.', PZS.map((x, i) => [x.name + ' ' + x.title, Q.solved[i]]));
  }

  /* ================= 컨트롤 · 공통 ================= */
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  PATHS.forEach((p, i) => $('#paChips').appendChild(chipBtn(p.name, p.name, () => setPa(i))));
  RUC.forEach((c, i) => $('#ruCards').appendChild(chipBtn(c[1], c[1], () => ruCard(i))));
  [1, 2, 3].forEach((k) => $('#ruMul').appendChild(chipBtn('× ' + k, '계수를 ' + k + '배', () => ruMul(k))));
  COS.forEach((c, i) => $('#coChips').appendChild(chipBtn(c.name, c.name, () => setCo(i))));
  PZS.forEach((c, i) => $('#pzChips').appendChild(chipBtn(c.name + ' ' + c.title, c.name, () => setPz(i))));
  RULES.forEach((r, i) => {
    const row = document.createElement('div'); row.style.marginBottom = '8px'; row.dataset.i = i;
    const lab = document.createElement('div'); lab.textContent = (i + 1) + '. ' + r.t; lab.style.cssText = 'font-weight:800;font-size:14px;line-height:1.3'; row.appendChild(lab);
    const ch = document.createElement('div'); ch.className = 'chips';
    r.opts.forEach((o, j) => ch.appendChild(chipBtn(o, o, () => { S.ru.rule[i] = j; if (j !== r.ans) showHint(r.tip, 4500); updateCtl(); })));
    row.appendChild(ch); $('#ruleRows').appendChild(row);
  });
  function setPa(i) { const P = S.pa; P.sc = i; P.run = null; P.hl = 0; P.p = 0; updateCtl(); }
  function paCheck() {
    const P = S.pa, tg = [-393.5, -110.5, -283.0];
    P.ok = [0, 1, 2].map((k) => P.q[k] !== '' && near(parseNum(P.q[k]), tg[k], 20));
  }
  ['#pa1', '#pa2', '#pa3'].forEach((id, k) => {
    const inp = $(id);
    inp.addEventListener('input', () => { const w = S.pa.ok[k]; S.pa.q[k] = inp.value; inp.classList.remove('bad'); paCheck(); if (S.pa.ok[k] && !w) { Sound.success(); parts.burst(RC.L.x + 230, RC.L.y + 200, { count: 10, speed: 110, life: 0.5, size: 3.4 }); } updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || S.pa.ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      showHint(near(Math.abs(v), Math.abs([-393.5, -110.5, -283.0][k]), 22) ? '열을 내놓으며 내려가므로 ΔH 는 음수예요. 부호를 확인해요.' : '화살표의 위쪽 끝과 아래쪽 끝이 가리키는 눈금의 차이를 읽어요. 눈금은 100 kJ 간격이에요.');
    });
  });
  $('#bDirect').addEventListener('click', () => paRun('direct'));
  $('#bVia').addEventListener('click', () => paRun('via'));
  $$('#ruSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sub.rule = b.dataset.v; updateCtl(); }));
  $('#bFlip').addEventListener('click', ruFlip);
  $('#bAdd').addEventListener('click', ruAdd);
  $('#bAddReset').addEventListener('click', () => { Sound.click(); ruAddReset(); });
  function buildCo() {
    const box = $('#coRows'); box.innerHTML = '';
    coCase().ing.forEach((k, i) => {
      const row = document.createElement('div'); row.className = 'qrow'; row.style.alignItems = 'center';
      const lab = document.createElement('span'); lab.textContent = ROM[i] + ' ' + eqTxt(EQ[k]).replace(/\s{2}→\s{2}/, ' → '); lab.style.cssText = 'flex:1 1 100%;font-weight:800;font-size:13.5px;line-height:1.3';
      const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = '🔄 거꾸로 쓰기'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { Sound.click(); S.co.flip[S.co.cs][i] = !S.co.flip[S.co.cs][i]; coCheck(); updateCtl(); });
      row.append(lab, b); box.appendChild(row);
    });
  }
  function buildPz() {
    const box = $('#pzRows'); box.innerHTML = '';
    pzCase().ing.forEach((k, i) => {
      const row = document.createElement('div'); row.className = 'qrow'; row.style.alignItems = 'center'; row.dataset.i = i;
      const lab = document.createElement('span'); lab.textContent = ROM[i] + ' ' + eqTxt(EQ[k]).replace(/\s{2}→\s{2}/, ' → '); lab.style.cssText = 'flex:1 1 100%;font-weight:800;font-size:13px;line-height:1.3';
      const f = document.createElement('button'); f.type = 'button'; f.className = 'fl'; f.textContent = '🔄'; f.setAttribute('aria-label', ROM[i] + ' 거꾸로 쓰기'); f.style.flex = '0 0 54px';
      f.addEventListener('click', () => { Sound.click(); S.pz.flip[S.pz.cs][i] = !S.pz.flip[S.pz.cs][i]; pzCheck(); updateCtl(); });
      row.append(lab, f);
      [0, 1, 2, 3].forEach((m) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.k = m; b.textContent = m === 0 ? '0' : '× ' + m; b.setAttribute('aria-label', ROM[i] + ' ' + m + '배'); b.addEventListener('click', () => { Sound.click(); S.pz.k[S.pz.cs][i] = m; pzCheck(); updateCtl(); }); row.appendChild(b); });
      box.appendChild(row);
    });
  }
  function setCo(i) { S.co.cs = i; buildCo(); coCheck(); updateCtl(); }
  function setPz(i) { S.pz.cs = i; buildPz(); pzCheck(); updateCtl(); }
  const burstAt = (x, y) => parts.burst(x, y, { count: 16, speed: 130, life: 0.7, size: 3.8 });
  function coCheck() {
    const Q = S.co;
    [0, 1].forEach((c) => { const w = Q.ok[c]; Q.ok[c] = coMatch(c) && Q.q[c] !== '' && near(parseNum(Q.q[c]), COS[c].ans, COS[c].tol); if (Q.ok[c] && !Q.solved[c]) { Q.solved[c] = true; Sound.success(); burstAt(RC.L.x + 230, RC.L.y + 380); } });
  }
  function pzCheck() {
    const Q = S.pz;
    [0, 1, 2].forEach((c) => { Q.ok[c] = pzMatch(c) && Q.q[c] !== '' && near(parseNum(Q.q[c]), PZS[c].ans, PZS[c].tol); if (Q.ok[c] && !Q.solved[c]) { Q.solved[c] = true; Sound.success(); burstAt(RC.L.x + 230, RC.L.y + 380); } });
  }
  $('#hco').addEventListener('input', (e) => { S.co.q[S.co.cs] = e.target.value; e.target.classList.remove('bad'); coCheck(); updateCtl(); });
  $('#hpz').addEventListener('input', (e) => { S.pz.q[S.pz.cs] = e.target.value; e.target.classList.remove('bad'); pzCheck(); updateCtl(); });
  function badHint(isCo) {
    const Q = isCo ? S.co : S.pz, c = isCo ? coCase() : pzCase(), match = isCo ? coMatch(Q.cs) : pzMatch(Q.cs), v = parseNum(Q.q[Q.cs]);
    if (!match) return '먼저 재료 식을 알맞게 골라 목표 반응식을 만들어요. 오른쪽 계산 칸을 보면 남은 물질을 알 수 있어요.';
    if (near(Math.abs(v), Math.abs(c.ans), Math.max(1.5, c.tol * 2))) return '크기는 비슷해요. 부호를 확인해요: 거꾸로 쓴 식은 ΔH 의 부호가 반대예요.';
    return 'ΔH 는 사용한 식의 ΔH 를 (거꾸로면 부호 반대, n배면 n배 하여) 모두 더해요. 오른쪽 계산식을 따라 계산해요.';
  }
  $('#hco').addEventListener('change', (e) => { if (e.target.value === '' || S.co.ok[S.co.cs]) return; shakeBad(e.target); showHint(badHint(true), 5200); });
  $('#hpz').addEventListener('change', (e) => { if (e.target.value === '' || S.pz.ok[S.pz.cs]) return; shakeBad(e.target); showHint(badHint(false), 5200); });
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      const toks = n.getAttribute('data-show').split(' ');
      n.hidden = !toks.some((tk) => { const [m, v] = tk.split(':'); return m === S.mode && (v == null || S.sub[m] === v); });
    });
    if (S.mode === 'path') $('#paIn').hidden = S.pa.sc !== 0;
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const P = S.pa;
    $$('#paChips button').forEach((b, i) => b.classList.toggle('on', i === P.sc));
    $('#bVia').textContent = '▶ ' + PS().via + ' 내려가기'; $('#bDirect').disabled = !!P.run; $('#bVia').disabled = !!P.run;
    $('#bDirect').classList.toggle('done', P.seen[P.sc].direct); $('#bVia').classList.toggle('done', P.seen[P.sc].via);
    ['#pa1', '#pa2', '#pa3'].forEach((id, k) => { const inp = $(id), v = P.q[k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', P.ok[k] && v !== ''); });
    const U = S.ru;
    $$('#ruSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.rule));
    $$('#ruCards button').forEach((b, i) => b.classList.toggle('on', i === U.card));
    $$('#ruMul button').forEach((b, i) => b.classList.toggle('on', i + 1 === U.k));
    $('#bFlip').setAttribute('aria-pressed', U.flip ? 'true' : 'false');
    $('#bAdd').disabled = U.add.run;
    $$('#ruleRows > div').forEach((row) => { const i = +row.dataset.i; $$('button', row).forEach((b, j) => { b.classList.toggle('on', U.rule[i] === j); b.classList.toggle('ok', U.rule[i] === j && j === RULES[i].ans); b.classList.toggle('no', U.rule[i] === j && j !== RULES[i].ans); }); });
    const Q = S.co;
    $$('#coChips button').forEach((b, i) => { b.classList.toggle('on', i === Q.cs); b.classList.toggle('done', Q.solved[i]); });
    $$('#coRows button').forEach((b) => b.setAttribute('aria-pressed', Q.flip[Q.cs][+b.dataset.i] ? 'true' : 'false'));
    { const inp = $('#hco'), v = Q.q[Q.cs]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', Q.ok[Q.cs] && v !== ''); }
    const Z = S.pz;
    $$('#pzChips button').forEach((b, i) => { b.classList.toggle('on', i === Z.cs); b.classList.toggle('done', Z.solved[i]); });
    $$('#pzRows .qrow').forEach((row) => { const i = +row.dataset.i; $$('button', row).forEach((b) => { if (b.classList.contains('fl')) b.classList.toggle('on', Z.flip[Z.cs][i]); else b.classList.toggle('on', Z.k[Z.cs][i] === +b.dataset.k); }); });
    { const inp = $('#hpz'), v = Z.q[Z.cs]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', Z.ok[Z.cs] && v !== ''); }
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'path') { const P = S.pa; P.run = null; P.hl = 0; P.p = 0; P.seen[P.sc] = { direct: false, via: false }; if (P.sc === 0) { P.q = ['', '', '']; P.ok = [false, false, false]; } }
    else if (S.mode === 'rule') { if (S.sub.rule === 'add') ruAddReset(); else ruCard(S.ru.card); S.ru.rule = [null, null, null]; }
    else if (S.mode === 'co') { S.co.flip[S.co.cs] = [false, false]; S.co.q[S.co.cs] = ''; S.co.ok[S.co.cs] = false; }
    else { S.pz.flip[S.pz.cs] = [false, false, false]; S.pz.k[S.pz.cs] = S.pz.cs === 2 ? [1, 1, 1] : [1, 1, 0]; S.pz.q[S.pz.cs] = ''; S.pz.ok[S.pz.cs] = false; }
    updateCtl();
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'path') { const P = S.pa, Pt = PS(); L1 = '직접 경로 ΔH'; a = paRevealed('dir') ? sd(Pt.dir) + ' kJ' : '?'; L2 = '두 단계 ΔH 합'; b = (P.sc === 0 ? P.ok[1] && P.ok[2] : P.seen[1].via) ? sd(Pt.st[0] + Pt.st[1]) + ' kJ' : '?'; L3 = '내려가 본 경로'; c = (P.seen[P.sc].direct ? 1 : 0) + (P.seen[P.sc].via ? 1 : 0) + ' / 2'; }
    else if (S.mode === 'rule') { const U = S.ru, p = procEq(ruE(), U.flip, U.k); L1 = '고른 카드'; a = RUC[U.card][1]; L2 = '지금 ΔH'; b = S.sub.rule === 'add' ? (U.add.done ? sv(EQ.hg.dH + EQ.hl.dH) + ' kJ' : '?') : sv(p.dH) + ' kJ'; L3 = '완성한 규칙'; c = U.rule.filter((v, i) => v === RULES[i].ans).length + ' / 3'; }
    else if (S.mode === 'co') { const Q = S.co; L1 = '구할 반응'; a = coCase().name; L2 = '목표 반응식'; b = coMatch(Q.cs) ? '완성' : '아직'; L3 = '구한 반응'; c = Q.solved.filter((x) => x).length + ' / 2'; }
    else { const Q = S.pz; L1 = '퍼즐'; a = pzCase().name; L2 = '목표 반응식'; b = pzMatch(Q.cs) ? '완성' : '아직'; L3 = '푼 퍼즐'; c = Q.solved.filter((x) => x).length + ' / 3'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const resetPath = () => { const P = S.pa; P.sc = 0; P.run = null; P.hl = 0; P.p = 0; P.seen = [{ direct: false, via: false }, { direct: false, via: false }]; P.q = ['', '', '']; P.ok = [false, false, false]; };
  const resetRule = () => { const U = S.ru; U.card = 0; U.flip = false; U.oldFlip = false; U.flipT = 1; U.k = 1; U.kPulse = 1; U.did = { flip: false, mul: false, add: false }; U.add = { t: 0, run: false, done: false }; U.rule = [null, null, null]; S.sub.rule = 'flip'; };
  const resetCo = () => { const Q = S.co; Q.cs = 0; Q.flip = [[false, false], [false, false]]; Q.q = ['', '']; Q.ok = [false, false]; Q.solved = [false, false]; buildCo(); };
  const resetPz = () => { const Q = S.pz; Q.cs = 0; Q.flip = [[false, false, false], [false, false, false], [false, false, false]]; Q.k = [[1, 1, 0], [1, 1, 0], [1, 1, 1]]; Q.q = ['', '', '']; Q.ok = [false, false, false]; Q.solved = [false, false, false]; buildPz(); };
  const levels = [
    {
      title: '경로와 ΔH: 엔탈피 도표의 계단', short: '경로와 ΔH', icon: '🪜', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 직접 실험하기 어려운 반응의 열을 다른 반응의 열로 계산할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(엔탈피와 열화학 반응식)에서</b> 엔탈피 도표와 ΔH 의 부호를 배웠어요. 이번에는 반응이 한 번에 일어날 때와 여러 단계로 나뉠 때를 도표에서 비교해요. (앞 차시의 −394 kJ 은 −393.5 kJ 을 반올림한 값이에요.)</div>' +
        '<p>탄소가 완전 연소해 CO₂ 가 되는 반응을 <b>직접</b> 내려가는 길과, <b>CO 를 거쳐</b> 두 단계로 내려가는 길로 비교해요. 도표의 높이 차가 ΔH 예요. 산 아래에서 정상까지 오를 때 길이 달라도 높이 차는 같은 것과 같아요.</p>',
      features: ['path'],
      setup() { S.lock = false; setMode('path'); },
      recap: '출발점과 도착점이 같으면 어떤 경로로 가도 전체 ΔH 는 같아요. 단계별 ΔH 의 합이 전체 ΔH 예요.',
      summary: '<ul><li>C(s) + O₂(g) → CO₂(g): 직접 ΔH = <b>−393.5 kJ</b>.</li><li>C(s) + ½O₂(g) → CO(g) ΔH₁ = −110.5 kJ, CO(g) + ½O₂(g) → CO₂(g) ΔH₂ = −283.0 kJ → ΔH₁ + ΔH₂ = <b>−393.5 kJ</b> (직접과 같아요).</li><li><b>헤스 법칙</b>: 반응의 ΔH 는 반응물과 생성물의 종류·상태만으로 정해지고 중간 경로와 관계없어요. 단계별 ΔH 의 합 = 전체 ΔH.</li><li>단계가 많다고 열이 더 나오는 것은 아니에요. 수소 연소도 H₂O(g)를 거치면 −242 + (−44) = −286 kJ 로 같아요.</li></ul>',
      missions: [
        {
          title: '두 경로의 ΔH 를 도표에서 읽기',
          goal: '구슬을 <b>직접</b> 경로와 <b>CO 를 거치는</b> 경로로 모두 내려보내고, 도표의 눈금을 읽어 세 화살표의 ΔH 를 적어요.',
          hint: '두 「내려가기」 버튼을 모두 눌러요. 화살표 위·아래 끝의 눈금 차가 ΔH 예요. 직접 경로는 약 −400, C → CO 는 약 −100, CO → CO₂ 는 약 −300 근처예요(±20 kJ 이내면 돼요).',
          setup() { S.lock = true; resetPath(); setMode('path'); },
          check: () => paSeenAll() && paOkAll(), hold: 0.4,
          status: () => '직접 ' + mark(S.pa.seen[0].direct) + ' &nbsp; CO 경유 ' + mark(S.pa.seen[0].via) + ' &nbsp; ΔH 읽기 ' + S.pa.ok.filter((x) => x).length + ' / 3',
          explain: '직접 경로 <b>−393.5 kJ</b>, CO 를 거치면 <b>−110.5</b> 와 <b>−283.0 kJ</b> 이고 합은 −393.5 kJ 로 같아요. 출발점(C + O₂)과 도착점(CO₂)의 엔탈피 수준이 같기 때문이에요.',
        },
        {
          type: 'quiz', title: '단계가 많으면 열이 더 나올까?',
          goal: '“반응이 여러 단계로 나뉘면 단계마다 열이 나오니 전체로는 열이 더 많이 나온다.” 이 말은?',
          setup() { S.lock = true; setMode('path'); },
          choices: ['맞아요. 단계가 많을수록 나오는 열의 합이 커져요', '틀려요. 두 단계로 가면 열이 오히려 줄어들어요', '틀려요. 출발점과 도착점이 같으면 어느 경로로 가도 ΔH 의 합이 같아요', '맞아요. 직접 반응할 때만 열이 덜 나와요'],
          answer: 2,
          feedback: ['단계마다 나오는 열을 더하면 직접 반응의 열과 정확히 같아요. −110.5 + (−283.0) = −393.5 kJ 예요.', '두 단계 합도 −393.5 kJ 로 줄어들지 않아요.', '', '직접 반응도 같은 −393.5 kJ 예요. 경로와 관계없어요.'],
          explain: '엔탈피의 변화는 <b>처음과 나중 상태</b>에만 달려 있어요. 중간에 몇 단계를 거쳐도 합은 같아요. 이것이 헤스 법칙이에요.',
        },
      ],
    },
    {
      title: '식 조작: 뒤집고, 곱하고, 더하기', short: '식 조작', icon: '🔧', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단계별 ΔH 를 더하면 전체 ΔH 가 된다는 것을 보았어요. 이제 반응식 자체를 다루는 세 가지 규칙을 확인해요.</div>' +
        '<p>반응식 카드를 <b>거꾸로</b> 쓰고, 계수를 <b>몇 배</b> 하고, 두 식을 <b>더하며</b> ΔH 가 어떻게 달라지는지 관찰해 규칙을 완성해요.</p>',
      features: ['rule'],
      setup() { S.lock = false; setMode('rule'); },
      recap: '식을 거꾸로 하면 ΔH 의 부호가 반대, n배 하면 ΔH 도 n배, 두 식을 더하면 ΔH 도 더해요.',
      summary: '<ul><li><b>거꾸로</b>: 반응식을 거꾸로 쓰면 ΔH 의 부호가 반대예요. CO₂ → C + O₂ 는 +393.5 kJ.</li><li><b>n배</b>: 계수를 n배 하면 ΔH 도 n배예요. 2CO + O₂ → 2CO₂ 는 −566 kJ.</li><li><b>더하기</b>: 두 식을 더하면 ΔH 도 더해요. 양쪽에 같은 물질이 있으면 소거돼요: H₂ + ½O₂ → H₂O(g) (−242) + H₂O(g) → H₂O(l) (−44) = H₂ + ½O₂ → H₂O(l) (−286 kJ).</li></ul>',
      missions: [
        {
          title: '뒤집기 · 곱하기 · 더하기 해 보기',
          goal: '🔄 카드를 <b>거꾸로</b> 써 보고, 계수를 <b>2배 이상</b>으로 바꿔 보고, ➕ <b>두 식 더하기</b>를 한 번 실행해요.',
          hint: '「뒤집기·곱하기」 화면에서 거꾸로 쓰기와 × 2 를 눌러 보고, 「더하기」 화면에서 「두 식 더하기」를 눌러요.',
          setup() { S.lock = true; resetRule(); setMode('rule'); },
          check: () => S.ru.did.flip && S.ru.did.mul && S.ru.did.add, hold: 0.5,
          status: () => '거꾸로 ' + mark(S.ru.did.flip) + ' &nbsp; 계수 곱하기 ' + mark(S.ru.did.mul) + ' &nbsp; 더하기 ' + mark(S.ru.did.add),
          explain: '거꾸로 쓰면 ΔH 의 부호가 반대가 되고(−393.5 → +393.5), 계수를 2배 하면 ΔH 도 2배(−787)가 되며, 두 식을 더하면 ΔH 도 더해져요(−242 + (−44) = −286).',
        },
        {
          title: '세 가지 규칙 완성하기', manual: true,
          goal: '조작판의 「규칙 완성하기」에서 세 규칙의 빈칸을 알맞게 골라 완성하고 확인해요.',
          hint: '거꾸로 → 내놓던 열을 흡수하는 방향이 되어요. n배 → 반응하는 양이 n배. 더하기 → 에너지 변화도 합쳐져요.',
          setup() { S.lock = true; setMode('rule'); },
          check: () => { const U = S.ru; for (let i = 0; i < 3; i++) { if (U.rule[i] == null) return '규칙 ' + (i + 1) + ' 번의 빈칸을 골라 주세요.'; if (U.rule[i] !== RULES[i].ans) return '규칙 ' + (i + 1) + ' 번이 아직 알맞지 않아요. ' + RULES[i].tip; } return true; },
          explain: '<b>① 거꾸로 → 부호 반대, ② n배 → ΔH 도 n배, ③ 더하기 → ΔH 도 더해요.</b> 이 세 규칙으로 여러 반응식을 조합해 원하는 반응식의 ΔH 를 구할 수 있어요.',
        },
        {
          type: 'quiz', title: '거꾸로 쓰고 3배 하면',
          goal: 'C(s) + O₂(g) → CO₂(g) 의 ΔH 는 −393.5 kJ 예요. 3CO₂(g) → 3C(s) + 3O₂(g) 의 ΔH 는?',
          setup() { S.lock = true; setMode('rule'); },
          choices: ['−393.5 kJ', '−1180.5 kJ', '+1180.5 kJ', '+393.5 kJ'],
          answer: 2,
          feedback: ['거꾸로 쓰고 3배 한 식이라 ΔH 가 달라져요.', '크기는 3배(1180.5)가 맞지만, 거꾸로 쓰면 부호가 반대가 돼요.', '', '부호는 맞지만 계수가 3배라서 ΔH 도 3배예요.'],
          explain: '계수를 3배 하면 3 × (−393.5) = −1180.5 kJ, 거꾸로 쓰면 부호가 반대라서 <b>+1180.5 kJ</b> 이에요.',
        },
      ],
    },
    {
      title: '재기 어려운 반응의 ΔH 구하기', short: 'CO의 ΔH', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 식을 거꾸로 하고, 곱하고, 더하는 규칙을 익혔어요. 이제 이 규칙으로 <b>직접 재기 어려운 반응</b>의 ΔH 를 구해요.</div>' +
        '<p>탄소를 산소와 반응시키면 CO 만 만들기가 어려워요. CO₂ 도 함께 생기기 때문이에요. 그래서 C + ½O₂ → CO 의 ΔH 를 직접 재기 어려워요. 쉽게 잴 수 있는 <b>두 연소 반응의 ΔH</b> 를 조합해 구해요.</p>',
      features: ['co'],
      setup() { S.lock = false; setMode('co'); buildCo(); },
      recap: '재기 쉬운 반응식들을 거꾸로 하고 더해 목표 반응식을 만들면, ΔH 도 같은 방식으로 더해서 구할 수 있어요.',
      summary: '<ul><li>직접 재기 어려운 C(s) + ½O₂(g) → CO(g): 식 ① C(s) + O₂(g) → CO₂(g) (−393.5 kJ) + 식 ② 의 역반응 CO₂(g) → CO(g) + ½O₂(g) (+283.0 kJ) = <b>−110.5 kJ</b>. 양쪽의 CO₂ 와 ½O₂ 가 소거돼요.</li><li>N₂(g) + O₂(g) → 2NO(g) (+181) + 2NO(g) + O₂(g) → 2NO₂(g) (−115) = N₂(g) + 2O₂(g) → 2NO₂(g) <b>+66 kJ</b>.</li><li>헤스 법칙 덕분에 직접 측정하지 못하는 반응의 ΔH 도 측정 가능한 반응의 ΔH 로 계산할 수 있어요.</li></ul>',
      missions: [
        {
          title: 'CO 생성 반응의 ΔH 구하기',
          goal: '식 (ⅰ), (ⅱ) 중 거꾸로 써야 할 식을 골라 <b>C(s) + ½O₂(g) → CO(g)</b> 를 만들고, ΔH 를 구해 적어요.',
          hint: '목표 반응식의 생성물에 CO 가 있어요. (ⅱ)는 CO 가 반응물이니 거꾸로 써야 해요. 그러면 CO₂ 가 소거돼요. ΔH = (−393.5) + (+283.0).',
          setup() { S.lock = true; resetCo(); setMode('co'); },
          check: () => S.co.solved[0], hold: 0.4,
          status: () => '식 만들기 ' + mark(S.co.cs === 0 && coMatch(0)) + ' &nbsp; ΔH ' + mark(S.co.solved[0]),
          explain: '(ⅱ)를 거꾸로 하면 CO₂ → CO + ½O₂ (ΔH = +283.0). (ⅰ)과 더하면 CO₂ 가 소거되어 C + ½O₂ → CO, ΔH = −393.5 + 283.0 = <b>−110.5 kJ</b> 예요.',
        },
        {
          title: 'NO₂ 생성 반응의 ΔH 구하기',
          goal: '구할 반응을 <b>N₂ + 2O₂ → 2NO₂</b> 로 바꾸고, 두 식을 더해 ΔH 를 구해 적어요.',
          hint: '이번에는 두 식을 그대로 더하면 NO 가 소거돼요. ΔH = +181 + (−115).',
          setup() { S.lock = true; const Q = S.co; Q.cs = 1; Q.flip[1] = [false, false]; Q.q[1] = ''; Q.ok[1] = false; Q.solved[1] = false; buildCo(); coCheck(); setMode('co'); },
          check: () => S.co.solved[1], hold: 0.4,
          status: () => '식 만들기 ' + mark(S.co.cs === 1 && coMatch(1)) + ' &nbsp; ΔH ' + mark(S.co.solved[1]),
          explain: '두 식을 그대로 더하면 2NO 가 양쪽에서 소거되어 N₂ + 2O₂ → 2NO₂, ΔH = +181 + (−115) = <b>+66 kJ</b> (흡열)이에요.',
        },
        {
          type: 'quiz', title: '거꾸로 더할 때의 부호',
          goal: '식 (ⅱ) CO(g) + ½O₂(g) → CO₂(g) 의 ΔH 는 −283.0 kJ 예요. 이 식을 거꾸로 해서 더할 때 ΔH 는 어떻게 쓰일까요?',
          setup() { S.lock = true; setMode('co'); },
          choices: ['그대로 −283.0 을 더해요', '+283.0 으로 부호를 바꿔서 더해요', '283.0 을 곱해요', '더하지 않아요'],
          answer: 1,
          feedback: ['거꾸로 썼는데 부호를 바꾸지 않으면 −393.5 − 283.0 = −676.5 가 되어 틀려요.', '', '곱하는 것이 아니라 더해요.', 'ΔH 를 더하지 않으면 목표 반응의 ΔH 를 구할 수 없어요.'],
          explain: '거꾸로 쓴 식의 ΔH 는 부호가 바뀌어 <b>+283.0</b> 이에요. 그래서 ΔH = −393.5 + (+283.0) = −110.5 kJ 예요.',
        },
      ],
    },
    {
      title: '퍼즐 풀기: 반응식 조합', short: '퍼즐 풀기', icon: '🧩', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 식을 조합해 CO 와 NO₂ 의 ΔH 를 구했어요. 이제 재료 식이 더 많은 퍼즐을 풀어 봐요.</div>' +
        '<p>목표 반응식과 재료 반응식이 주어져요. 재료 식을 <b>거꾸로 할지, 몇 배 할지</b> 정해 더했을 때 목표 반응식이 되도록 만들고, ΔH 를 계산해요. 소거되지 않고 남는 물질을 보면 어떤 식을 바꿔야 하는지 알 수 있어요.</p>',
      features: ['puzzle'],
      setup() { S.lock = false; setMode('puzzle'); buildPz(); },
      recap: '목표에 없는 물질이 소거되도록 재료 식을 거꾸로 하거나 배수를 정해 더하면, ΔH 도 같은 방식으로 더해서 구할 수 있어요.',
      summary: '<ul><li>퍼즐 A: 2 × [S + O₂ → SO₂ (−297)] + [2SO₂ + O₂ → 2SO₃ (−198)] → 2S(s) + 3O₂(g) → 2SO₃(g), ΔH = 2 × (−297) + (−198) = <b>−792 kJ</b>.</li><li>퍼즐 B: C(흑연) 연소 (−393.5) + C(다이아몬드) 연소의 역반응 (+395.4) → C(흑연) → C(다이아몬드), ΔH = <b>+1.9 kJ</b>.</li><li>퍼즐 C: C 연소 (−393.5) + 2 × H₂ 연소 (−286) + CH₄ 연소의 역반응 (+890) → C(s) + 2H₂(g) → CH₄(g), ΔH = <b>−75.5 kJ</b>.</li><li>결과 식이 목표 반응식과 다르면 남은 물질을 보고 그 물질이 소거되도록 식을 거꾸로 하거나 배수를 바꿔요.</li></ul>',
      missions: [
        {
          title: '세 퍼즐 풀기',
          goal: '퍼즐 A, B, C 를 모두 풀어요. 재료 식을 알맞게 조합해 목표 반응식을 만들고 ΔH 를 구해 적어요.',
          hint: '퍼즐 A: (ⅰ)을 2배. 퍼즐 B: 다이아몬드 식을 거꾸로. 퍼즐 C: (ⅱ)를 2배, (ⅲ)을 거꾸로. 소거되지 않고 남는 물질이 힌트예요.',
          setup() { S.lock = true; resetPz(); setMode('puzzle'); },
          check: () => S.pz.solved.every((x) => x), hold: 0.4,
          status: () => PZS.map((p, i) => p.name + ' ' + mark(S.pz.solved[i])).join(' &nbsp; '),
          explain: 'A: 2 × (−297) + (−198) = <b>−792 kJ</b>. B: −393.5 + 395.4 = <b>+1.9 kJ</b> (흑연이 조금 더 안정해요). C: −393.5 + 2 × (−286) + 890 = <b>−75.5 kJ</b>. 모두 직접 재기 어려운 반응이에요.',
        },
        {
          type: 'quiz', title: '헤스 법칙이 필요한 까닭',
          goal: '헤스 법칙이 유용한 가장 큰 까닭은?',
          setup() { S.lock = true; setMode('puzzle'); },
          choices: ['모든 반응의 속도를 계산할 수 있어서예요', '직접 재기 어려운 반응의 ΔH 도 재기 쉬운 반응들의 ΔH 로 계산할 수 있어서예요', '반응식의 계수를 외우지 않아도 되어서예요', 'ΔH 가 경로에 따라 달라지는 것을 보여 주어서예요'],
          answer: 1,
          feedback: ['헤스 법칙은 속도가 아니라 ΔH 에 관한 법칙이에요.', '', '계수는 여전히 맞춰야 해요. 헤스 법칙은 ΔH 계산을 도와요.', '반대예요. ΔH 는 경로와 관계없어요.'],
          explain: '부산물이 생기거나 너무 느려서 직접 재기 어려운 반응도 <b>재기 쉬운 반응들의 ΔH</b> 를 조합해 구할 수 있어요. 이것이 헤스 법칙의 유용성이에요.',
        },
        {
          type: 'quiz', title: '결과 식이 목표와 다를 때',
          goal: '재료 식을 더했더니 목표 반응식과 달랐어요. 어떻게 확인하고 고치면 좋을까요?',
          setup() { S.lock = true; setMode('puzzle'); },
          choices: ['ΔH 만 맞으면 되니까 그대로 더해요', '재료 식을 모두 2배로 해요', '남아 있는 물질을 보고, 그 물질이 소거되도록 식을 거꾸로 하거나 배수를 바꿔요', '재료 식을 하나만 써요'],
          answer: 2,
          feedback: ['식이 목표와 다르면 구하려는 반응이 아니에요. ΔH 도 그 반응의 값이 아니에요.', '모두 2배로 하면 목표의 2배가 돼 다시 틀려요.', '', '하나만 써서는 대부분 목표 반응식이 되지 않아요.'],
          explain: '결과 식에서 <b>목표에 없는 물질이 남아 있으면</b> 그 물질이 양쪽에서 소거되도록 식을 거꾸로 하거나 배수를 바꿔요. 식이 목표와 같아진 뒤에 ΔH 를 더해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-hess-law', mount: '#game', badge: '헤스 법칙 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { path: '🪜 엔탈피 도표의 계단', rule: '🔧 반응식 카드 조작', co: '🧮 ΔH 조합 계산', puzzle: '🧩 반응식 퍼즐' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  PATHS.forEach(() => 0);
  buildCo(); buildPz(); setMode('path');
  function stepAll1(dt) { S.t += dt; stepPath(dt); stepRule(dt); stepCombo(dt); }
  let lastFree = false;
  SciSim.loop((dt) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'path') { drawPath(S.t); drawPathInfo(S.t); }
    else if (S.mode === 'rule') { drawRule(S.t); drawRuleInfo(S.t); }
    else if (S.mode === 'co') { drawCo(S.t); drawCoInfo(S.t); }
    else { drawPz(S.t); drawPzInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, EQ, COS, PZS, PATHS, setMode, setPa, paRun, paCheck, ruFlip, ruMul, ruAdd, ruCard, setCo, setPz, coCheck, pzCheck, coMatch, pzMatch, comboOf, buildCo, buildPz,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
