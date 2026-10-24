/* =========================================================
   물질과 에너지 Ⅱ. 용액의 성질 - 물과 수소 결합 [12물에02-01]
   ① 모형: 수소 결합 (물 분자 한 개가 만들 수 있는 수소 결합 4개: 주는 자리 2 + 받는 자리 2)
   ② 관찰: 끓는점 · 녹는점 (16족 수소 화합물 비교, H₂O와 H₂S 가열 곡선)
   ③ 탐구: 얼음의 밀도 (얼음 고리 구조와 부피, 4 °C 최대 밀도, 겨울 호수 단면)
   ④ 적용: 열 · 표면 · 용매 (비열, 증발열, 표면 장력과 모세관, 이온 · 극성 물질의 용해, 사례 카드)
   얼음의 결정 구조 세부, 표면 장력 식, 물의 자동 이온화는 다루지 않아요.
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
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const rad = (d) => d * Math.PI / 180;
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; const t = clamp(((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l2, 0, 1); return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy)); };
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 540 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 598, w: 464, h: 352 } : { x: 490, y: 50, w: 298, h: 498 },
    F: PHONE ? { x: 8, y: 50, w: 464, h: 900 } : { x: 12, y: 50, w: 776, h: 498 },
  };
  const MODE_LABEL = { hb: '🔗 물 분자 사이의 수소 결합', bp: '🌡️ 물은 왜 끓는점이 높을까?', dens: '🧊 얼음은 왜 물에 뜰까?', apply: '🏠 물의 성질이 만드는 일상' };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'hb', fade: 0, lock: false, t: 0,
    sub: { bp: 'trend', dens: 'mol', apply: 'heat' },
    hb: { on: [false, false, false, false], p: [0, 0, 0, 0], sel: '', doneT: 0, burstDone: false, shake: [0, 0, 0, 0] },
    bp: { prop: 'bp', found: false, fprog: 0, tap: -1, run: false, fast: false, tm: 0, ended: false },
    dens: { T: -5, frozen: true, seen: {}, Ta: 10, Tad: 10, lakeOK: 0 },
    ap: { Q: 0, Qd: 0, heatOK: false, liq: 'water', drop: null, surfSeen: {}, sol: 'nacl', dis: null, solSeen: {}, cards: null, sel: -1, drag: null, cardShake: 0 },
  };
  let game = null;

  /* ================= 물 분자 그리기 ================= */
  const HANG = rad(52.25), LPANG = rad(54.75);
  const waterH = (x, y, bis, L0) => [[x + Math.cos(bis - HANG) * L0, y + Math.sin(bis - HANG) * L0], [x + Math.cos(bis + HANG) * L0, y + Math.sin(bis + HANG) * L0]];
  function drawWater(x, y, bis, L0, o) {
    o = o || {}; const k = L0 / 40, hs = waterH(x, y, bis, L0);
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.lp) [-1, 1].forEach((s) => {
      const a = bis + Math.PI + s * LPANG, px = x + Math.cos(a) * 26 * k, py = y + Math.sin(a) * 26 * k, nx = -Math.sin(a) * 4.2 * k, ny = Math.cos(a) * 4.2 * k;
      D.sphere(px + nx, py + ny, 2.9 * k, '#334155', { gloss: false }); D.sphere(px - nx, py - ny, 2.9 * k, '#334155', { gloss: false });
    });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6 * k; ctx.lineCap = 'round';
    hs.forEach((h) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(h[0], h[1]); ctx.stroke(); });
    ctx.lineCap = 'butt';
    D.sphere(x, y, 15 * k, '#ef4444', { gloss: true });
    hs.forEach((h) => D.sphere(h[0], h[1], 8.5 * k, '#f8fafc', { gloss: false, outline: '#94a3b8' }));
    ctx.restore(); return hs;
  }
  /* 작은 물 분자 (입자 모형용) */
  function miniWater(x, y, ang, s, alpha, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const d = 5.2 * s;
    D.sphere(Math.cos(0.91) * d, Math.sin(0.91) * d, 2.7 * s, '#f1f5f9', { gloss: false });
    D.sphere(Math.cos(-0.91) * d, Math.sin(-0.91) * d, 2.7 * s, '#f1f5f9', { gloss: false });
    D.sphere(0, 0, 5.6 * s, o.col || '#ef5350', { gloss: s > 0.8 });
    ctx.restore();
  }

  /* ================= ① 수소 결합: 분자 한 개와 이웃 4개 ================= */
  const HB_ROLE = ['don', 'don', 'acc', 'acc'];
  const HB_ANG = [-142.25, -37.75, 144.75, 35.25].map(rad);
  const HB_BIS = [rad(-87.5), rad(-92.5), rad(17), rad(163)];
  const hbGeo = () => { const L = RC.L, k = PHONE ? 1.0 : 1.18, L0 = 40 * k; return { cx: L.x + L.w / 2, cy: L.y + L.h / 2 - 20, L0, OO: 2.8 * L0, k }; };
  function hbNeighbor(g, i) {
    const a = HB_ANG[i], p = S.hb.p[i], e = sm(p);
    const bx = g.cx + Math.cos(a) * g.OO, by = g.cy + Math.sin(a) * g.OO, far = g.OO * 1.85;
    const sw = RM ? 0 : 9 * Math.sin(S.t * 1.1 + i * 1.9), sw2 = RM ? 0 : 8 * Math.cos(S.t * 0.9 + i * 2.3);
    const L = RC.L;
    const lx = clamp(g.cx + Math.cos(a) * far + sw * 0.7, L.x + 50, L.x + L.w - 50), ly = clamp(g.cy + Math.sin(a) * far + sw2, L.y + 78, L.y + L.h - 118);
    const wob = RM ? 0 : (1 - e) * 0.7 * Math.sin(S.t * 1.3 + i);
    return { x: lerp(lx, bx, e), y: lerp(ly, by, e), bis: HB_BIS[i] + wob, bx, by };
  }
  function hbSegs(g) {      // 이어진 수소 결합 선분 (눌러서 읽기 / 그리기에 함께 써요)
    const out = [], hs = waterH(g.cx, g.cy, -Math.PI / 2, g.L0);
    for (let i = 0; i < 4; i++) {
      if (S.hb.p[i] < 0.9) continue;
      const n = hbNeighbor(g, i);
      if (HB_ROLE[i] === 'don') { const h = hs[i]; const dx = n.x - h[0], dy = n.y - h[1], d = Math.hypot(dx, dy) || 1; out.push({ i, a: [h[0] + dx / d * 10 * g.k, h[1] + dy / d * 10 * g.k], b: [n.x - dx / d * 17 * g.k, n.y - dy / d * 17 * g.k] }); }
      else {
        const tw = HB_ANG[i] + Math.PI, h1 = [n.x + Math.cos(tw) * g.L0, n.y + Math.sin(tw) * g.L0];
        const ex = g.cx + Math.cos(HB_ANG[i]) * 30 * g.k, ey = g.cy + Math.sin(HB_ANG[i]) * 30 * g.k;
        const dx = ex - h1[0], dy = ey - h1[1], d = Math.hypot(dx, dy) || 1; out.push({ i, a: [h1[0] + dx / d * 10 * g.k, h1[1] + dy / d * 10 * g.k], b: [ex, ey] });
      }
    }
    return out;
  }
  const hbCount = () => S.hb.on.filter(Boolean).length;
  const hbAll = () => S.hb.on.every(Boolean) && S.hb.p.every((p) => p > 0.97);
  function hbToggle(i, v) {
    const h = S.hb; h.on[i] = v == null ? !h.on[i] : v; Sound.click();
    if (!h.on[i]) { h.burstDone = false; h.doneT = 0; }
    h.sel = h.on[i] ? 'hb' : h.sel;
    updateCtl();
  }
  function hbReset(allOff) {
    const h = S.hb; h.on = [false, false, false, false]; if (allOff) h.p = h.p.map((p) => Math.min(p, 1)); else h.p = [0, 0, 0, 0];
    h.sel = ''; h.doneT = 0; h.burstDone = false; updateCtl();
  }
  function stepHB(dt) {
    const h = S.hb;
    for (let i = 0; i < 4; i++) { h.p[i] = SciSim.approach(h.p[i], h.on[i] ? 1 : 0, dt, 5.5); if (Math.abs(h.p[i] - (h.on[i] ? 1 : 0)) < 0.004) h.p[i] = h.on[i] ? 1 : 0; h.shake[i] = Math.max(0, h.shake[i] - dt * 3); }
    if (hbAll()) { h.doneT += dt; if (h.doneT > 0.5 && !h.burstDone) { h.burstDone = true; const g = hbGeo(); parts.burst(g.cx, g.cy, { count: 22, speed: 190, colors: ['#ef4444', '#f8fafc', '#38bdf8', '#14a058'] }); Sound.success(); } }
    else h.doneT = 0;
  }
  function drawHB(t) {
    const L = RC.L, g = hbGeo(), h = S.hb, k = g.k;
    T(14, 26, MODE_LABEL.hb, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔗 물 분자 1개는 이웃 분자와 수소 결합을 최대 4개 만들어요', PHONE ? 13 : 14.5, INK, 'left', 800);
    // 자리 안내 (아직 이어지지 않은 자리)
    for (let i = 0; i < 4; i++) {
      const n = hbNeighbor(g, i), e = sm(h.p[i]);
      if (e < 0.98) {
        const pulse = RM ? 0.7 : 0.5 + 0.5 * Math.sin(t * 4 + i);
        ctx.save(); ctx.globalAlpha = 1 - e; ctx.strokeStyle = HB_ROLE[i] === 'don' ? BAD : BLU; ctx.lineWidth = 2.6; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 14;
        ctx.beginPath(); ctx.arc(n.bx, n.by, 36 * k + pulse * 3, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        ctx.save(); ctx.globalAlpha = (1 - e) * 0.9; T(n.bx, n.by - 4, HB_ROLE[i] === 'don' ? 'H 쪽' : '전자쌍 쪽', 12.5, HB_ROLE[i] === 'don' ? BAD : BLU, 'center', 800); T(n.bx, n.by + 12, HB_ROLE[i] === 'don' ? '주는 자리' : '받는 자리', 12.5, HB_ROLE[i] === 'don' ? BAD : BLU, 'center', 800); ctx.restore();
      }
    }
    // 수소 결합 선
    const segs = hbSegs(g);
    segs.forEach((s) => {
      const al = (RM ? 0.95 : 0.6 + 0.4 * Math.sin(t * 5 + s.i * 1.7)) * clamp(h.p[s.i], 0, 1);
      ctx.save(); ctx.strokeStyle = C.rgba(BAD, al); ctx.lineWidth = h.sel === 'hb' ? 4.2 : 3.2; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 18; ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); ctx.stroke(); ctx.restore();
    });
    // 이웃 분자 (이어진 것이 위로 오도록 p 순서)
    for (let i = 0; i < 4; i++) {
      const n = hbNeighbor(g, i);
      drawWater(n.x, n.y, n.bis, g.L0, { lp: true, alpha: lerp(0.78, 1, sm(h.p[i])) });
      const e = sm(h.p[i]);
      if (e > 0.9) {
        if (HB_ROLE[i] === 'don') T(n.x + Math.cos(HB_ANG[i]) * 24 * k, n.y + Math.sin(HB_ANG[i]) * 24 * k - 4, 'δ−', 13, BLU, 'center', 800, HALO);
        else { const tw = HB_ANG[i] + Math.PI; T(n.x + Math.cos(tw) * (g.L0 + 17), n.y + Math.sin(tw) * (g.L0 + 17), 'δ+', 13, BAD, 'center', 800, HALO); }
      }
    }
    // 가운데 분자
    const hs = drawWater(g.cx, g.cy, -Math.PI / 2, g.L0, { lp: true });
    hs.forEach((p, i) => T(p[0] + (i ? 18 : -18), p[1] - 8, 'δ+', 13, BAD, 'center', 800, HALO));
    T(g.cx, g.cy + 3 + 28 * k, 'δ−', 13, BLU, 'center', 800, HALO);
    T(g.cx, g.cy + 5, 'O', 15 * k, '#fff', 'center', 800);
    // 범례
    const ly = L.y + L.h - 52;
    T(L.x + 18, ly, 'δ+ : 부분 양전하 (H 쪽)      δ− : 부분 음전하 (O 쪽)', 13, MUTED, 'left', 800);
    T(L.x + 18, ly + 22, '점선 = 수소 결합 (분자 사이) · 실선 = 공유 결합 (분자 안)', 13, MUTED, 'left', 800);
    // 가운데 분자 위에 표시 + 완성 체크
    if (hbAll()) D.check(L.x + L.w - 34, L.y + 62, 16, sm(h.doneT * 2));
  }
  function drawHBInfo(t) {
    const R = RC.R, h = S.hb, n = hbCount();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📋 결합 읽기', 15, INK, 'left', 800);
    let msg, col = INK;
    if (h.sel === 'cov') { msg = 'O–H 공유 결합(분자 안, 실선): 끊으려면 약 463 kJ/mol이 필요해요. 물이 끓어도 끊어지지 않아요.'; col = '#475569'; }
    else if (h.sel === 'hb' && n > 0) { msg = '수소 결합(분자 사이, 점선): 약 20 kJ/mol로 훨씬 약해서 열운동으로 쉽게 끊어졌다 다시 이어져요.'; col = '#b91c1c'; }
    else if (n === 4) { msg = '완성! H 쪽 2개는 주고, 비공유 전자쌍 쪽 2개는 받아서 이웃 4개와 연결돼요. (그림은 2차원 단순화)'; col = GOOD; }
    else if (n === 0) { msg = '점선 고리를 눌러 이웃 분자를 이어 봐요. 실선(O–H)과 점선도 눌러서 비교해 봐요.'; }
    else msg = '수소 결합 ' + n + '개 연결됐어요. 남은 자리 ' + (4 - n) + '개도 이어 봐요.';
    const hh = textBlock(R.x + 14, R.y + 52, R.w - 28, msg, 14, col, 20, 800);
    // 결합 에너지 비교 (같은 눈금)
    const by = R.y + 52 + hh + 24, bw = R.w - 28;
    T(R.x + 14, by, '결합 하나를 끊는 데 필요한 에너지 (같은 눈금)', 12.5, MUTED, 'left', 800);
    [['O–H 공유 결합', 463, '#64748b', 'cov'], ['수소 결합', 20, BAD, 'hb']].forEach(([nm, v, c, k], i) => {
      const y = by + 14 + i * 50;
      T(R.x + 14, y + 12, nm, 13.5, c, 'left', 800);
      D.roundRect(R.x + 14, y + 20, bw, 14, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(R.x + 14, y + 20, bw, 14, 7); ctx.clip(); ctx.fillStyle = c; ctx.fillRect(R.x + 14, y + 20, bw * v / 463, 14); ctx.restore();
      T(R.x + R.w - 14, y + 12, v + ' kJ/mol', 13, INK, 'right', 800);
      if (h.sel === k) { ctx.strokeStyle = c; ctx.lineWidth = 2; D.roundRect(R.x + 10, y - 2, bw + 8, 42, 8); ctx.stroke(); }
    });
    const ly = by + 14 + 100 + 12;
    if (!PHONE) {
      ctx.strokeStyle = BAD; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(R.x + 16, ly); ctx.lineTo(R.x + 52, ly); ctx.stroke(); ctx.setLineDash([]);
      T(R.x + 60, ly + 5, '수소 결합 (분자 사이)', 13, INK, 'left', 800);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(R.x + 16, ly + 28); ctx.lineTo(R.x + 52, ly + 28); ctx.stroke();
      T(R.x + 60, ly + 33, '공유 결합 (분자 안)', 13, INK, 'left', 800);
    }
  }
  const hbHit = (p) => {
    const g = hbGeo();
    for (let i = 0; i < 4; i++) { const n = hbNeighbor(g, i); if (Math.hypot(p.x - n.x, p.y - n.y) < 40 * g.k || Math.hypot(p.x - n.bx, p.y - n.by) < 38 * g.k) return { t: 'site', i }; }
    for (const s of hbSegs(g)) if (segDist(p, s.a, s.b) < 14) return { t: 'hbond', i: s.i };
    const hs = waterH(g.cx, g.cy, -Math.PI / 2, g.L0);
    for (const h of hs) if (segDist(p, [g.cx, g.cy], h) < 12) return { t: 'cov' };
    return null;
  };

  /* ================= ② 끓는점 · 녹는점 ================= */
  const HYD = [
    { nm: 'H₂O', M: 18, bp: 100, mp: 0, c: '#ef4444' },
    { nm: 'H₂S', M: 34, bp: -60, mp: -86, c: '#a855f7' },
    { nm: 'H₂Se', M: 81, bp: -41, mp: -66, c: '#d97706' },
    { nm: 'H₂Te', M: 130, bp: -2, mp: -49, c: '#0d9488' },
  ];
  function fitLine(prop) {                    // H₂S · H₂Se · H₂Te 세 점의 추세선 (최소제곱)
    const p = HYD.slice(1), n = p.length, mx = p.reduce((a, q) => a + q.M, 0) / n, my = p.reduce((a, q) => a + q[prop], 0) / n;
    const sxy = p.reduce((a, q) => a + (q.M - mx) * (q[prop] - my), 0), sxx = p.reduce((a, q) => a + (q.M - mx) * (q.M - mx), 0);
    const sl = sxy / sxx; return { sl, ic: my - sl * mx, at: (m) => my + sl * (m - mx) };
  }
  const FIT = { bp: fitLine('bp'), mp: fitLine('mp') };
  const PRED = { bp: Math.round(FIT.bp.at(18)), mp: Math.round(FIT.mp.at(18)) };
  const trRect = () => { const L = RC.L; return { x: L.x + 64, y: L.y + 84, w: L.w - 90, h: L.h - 160 }; };
  const trRange = () => (S.bp.prop === 'bp' ? { y0: -100, y1: 120, yt: [-100, -50, 0, 50, 100] } : { y0: -110, y1: 20, yt: [-100, -75, -50, -25, 0] });
  const trX = (m) => { const r = trRect(); return r.x + m / 140 * r.w; };
  const trY = (v) => { const r = trRect(), g = trRange(); return r.y + r.h - (v - g.y0) / (g.y1 - g.y0) * r.h; };
  function bpTap(p) {
    let best = -1, bd = 34;
    HYD.forEach((h, i) => { const d = Math.hypot(p.x - trX(h.M), p.y - trY(h[S.bp.prop])); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { S.bp.tap = best; Sound.tick(); if (best === 0 && !S.bp.found) { S.bp.found = true; parts.burst(trX(18), trY(100), { count: 16, speed: 150 }); updateCtl(); } }
    return best >= 0;
  }
  function drawTrend(t) {
    const L = RC.L, r = trRect(), g = trRange(), b = S.bp, key = b.prop;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, (key === 'bp' ? '16족 수소 화합물의 끓는점' : '16족 수소 화합물의 녹는점') + ' (1 atm)', PHONE ? 14 : 15.5, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '점을 눌러 값을 읽어요', 13, MUTED, 'left', 700);
    // 격자 · 눈금
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1; ctx.fillStyle = MUTED;
    g.yt.forEach((v) => { const y = trY(v); ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); T(r.x - 8, y + 4, sgn(v), 12.5, MUTED, 'right', 700); });
    [0, 20, 40, 60, 80, 100, 120, 140].forEach((m) => { if (m % 20 === 0) { T(trX(m), r.y + r.h + 17, String(m), 12.5, MUTED, 'center', 700); } });
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke();
    if (g.y0 < 0 && g.y1 > 0) { ctx.strokeStyle = '#b6c0d2'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(r.x, trY(0)); ctx.lineTo(r.x + r.w, trY(0)); ctx.stroke(); ctx.setLineDash([]); }
    T(r.x + r.w, r.y + r.h + 36, '분자량 →', 13, MUTED, 'right', 800);
    T(r.x - 6, r.y - 10, '°C', 13, MUTED, 'right', 800);
    // 추세선 (H₂S–H₂Se–H₂Te) 과 H₂O 쪽 연장선
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(trX(34), trY(FIT[key].at(34))); ctx.lineTo(trX(130), trY(FIT[key].at(130))); ctx.stroke();
    if (b.fprog > 0.01) {
      const m1 = 34 - (34 - 18) * b.fprog;
      ctx.strokeStyle = BAD; ctx.beginPath(); ctx.moveTo(trX(34), trY(FIT[key].at(34))); ctx.lineTo(trX(m1), trY(FIT[key].at(m1))); ctx.stroke();
    }
    ctx.setLineDash([]);
    T(trX(131), trY(FIT[key].at(130)) + 20, '추세선', 12.5, '#64748b', 'right', 800);
    if (b.fprog > 0.98) {
      const ya = trY(PRED[key]), yb = trY(HYD[0][key]), x = trX(18) + 26;
      D.arrow(x, ya, x, yb + 4, { color: BAD, width: 3, head: 10 });
      ctx.save(); ctx.fillStyle = C.rgba(BAD, 0.0); ctx.restore();
      D.label(x + 8, (ya + yb) / 2, '+' + (HYD[0][key] - PRED[key]) + ' °C', { size: 14, bg: BAD, align: 'left' });
      D.label(trX(18) - 4, ya + 2, '예상 ' + sgn(PRED[key]) + ' °C', { size: 12, bg: '#475569', align: 'left' });
    }
    // 점
    HYD.forEach((h, i) => {
      const x = trX(h.M), y = trY(h[key]), sel = b.tap === i;
      if (sel) { ctx.strokeStyle = h.c; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke(); }
      D.sphere(x, y, i === 0 && b.found ? 11 : 9.5, h.c, { gloss: true, shadow: true });
      T(x, y - 17, h.nm, 14, INK, 'center', 800, HALO);
    });
    if (b.tap >= 0) {
      const h = HYD[b.tap], x = trX(h.M), y = trY(h[key]);
      const txt = h.nm + ' · 분자량 ' + h.M + ' · ' + sgn(h[key]) + ' °C';
      D.label(clamp(x, r.x + 90, r.x + r.w - 90), y + (b.tap === 0 ? 28 : 36), txt, { size: 13, bg: h.c, align: 'center' });
    }
  }
  function drawTrendInfo(rc, t) {
    const b = S.bp, key = b.prop, nm = key === 'bp' ? '끓는점' : '녹는점';
    panel(rc.x, rc.y, rc.w, rc.h, 14);
    T(rc.x + 14, rc.y + 26, '🔎 읽는 방법', 15, INK, 'left', 800);
    let y = rc.y + 52;
    y += textBlock(rc.x + 14, y, rc.w - 28, 'H₂S, H₂Se, H₂Te는 모양이 같은 굽은 분자예요. 분자량이 클수록 분산력이 커서 ' + nm + '이 올라가요. 세 점이 이루는 추세선을 따라가 봐요.', 13.5, MUTED, 19, 700) + 8;
    if (!b.found) {
      textBlock(rc.x + 14, y + 4, rc.w - 28, '그렇다면 분자량이 가장 작은 H₂O의 ' + nm + '은 이 선 위의 어디에 있을까요? ' + '추세에서 벗어난 점을 눌러 찾아요.', 14, INK, 20, 800);
    } else {
      y += textBlock(rc.x + 14, y, rc.w - 28, '분산력만 있다면 H₂O의 ' + nm + '은 약 ' + sgn(PRED[key]) + ' °C여야 해요. 실제는 ' + sgn(HYD[0][key]) + ' °C로 약 ' + (HYD[0][key] - PRED[key]) + ' °C나 높아요.', 14, INK, 20, 800) + 10;
      textBlock(rc.x + 14, y, rc.w - 28, 'H₂O만 분자 사이에 수소 결합이 있어서 이웃 분자를 떼어 내는 데 훨씬 많은 에너지가 필요하기 때문이에요.', 13.5, '#b91c1c', 19, 800);
    }
    if (b.tap > 0) {
      const h = HYD[b.tap];
      D.label(rc.x + rc.w / 2, rc.y + rc.h - 24, h.nm + '는 추세선 위에 있는 점이에요', { size: 12.5, bg: '#64748b', align: 'center' });
    }
  }

  /* ---- 가열 곡선 ---- */
  const SUBST = {
    h2o: { nm: 'H₂O', fm: '물', c: '#0ea5e9', M: 18, tm: 0, tb: 100, segs: [['h', -100, 0, 3.78], ['m', 0, 6.01], ['h', 0, 100, 7.53], ['b', 100, 40.7], ['h', 100, 150, 1.68]] },
    h2s: { nm: 'H₂S', fm: '황화 수소', c: '#a855f7', M: 34, tm: -86, tb: -60, segs: [['h', -100, -86, 0.77], ['m', -86, 2.38], ['h', -86, -60, 1.74], ['b', -60, 18.7], ['h', -60, 150, 7.18]] },
  };
  ['h2o', 'h2s'].forEach((k) => { const s = SUBST[k]; let ts = 0; s.segs.forEach((g) => { g.ts = ts; g.E = g[0] === 'h' ? g[3] : g[2]; ts += g.E; }); s.tEnd = ts; });
  const T_END = SUBST.h2o.tEnd, T_AX = 60, TM_RATE = 5;
  function evalSub(s, t) {
    let ph = 0;
    for (const g of s.segs) {
      if (t < g.ts + g.E) {
        const f = (t - g.ts) / g.E;
        if (g[0] === 'h') return { T: g[1] + (g[2] - g[1]) * f, ph, g: -1 };
        return { T: g[1], ph, g: f };
      }
      if (g[0] !== 'h') ph++;
    }
    return { T: 150, ph: 2, g: -1 };
  }
  /* 입자 상자 (가상 크기 150 x 190) */
  const BXW = 150, BXH = 190;
  function makeBox(key) {
    const N = 16, ps = [], ranks = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ranks[i], ranks[j]] = [ranks[j], ranks[i]]; }
    for (let i = 0; i < N; i++) {
      const c = i % 4, r = Math.floor(i / 4);
      const s0 = [34.5 + c * 27, BXH - 18 - r * 27], s1 = [33 + c * 28, BXH - 14 - r * 24];
      ps.push({ x: s0[0], y: s0[1], vx: 0, vy: 0, s0, s1, rank: (ranks[i] + 0.5) / N, mode: 0, ang: rnd(0, TAU), spin: rnd(-1.5, 1.5) });
    }
    return { key, ps };
  }
  const BOX = { h2o: makeBox('h2o'), h2s: makeBox('h2s') };
  function stepBox(box, dt, st) {
    const a = Math.sqrt((st.T + 273) / 273);
    box.ps.forEach((p) => {
      let m = st.ph; if (st.g >= 0 && st.g > p.rank) m = st.ph + 1;
      if (m === 2 && p.mode < 2) { const th = rnd(0, TAU), sp = 62 * a; p.vx = Math.cos(th) * sp; p.vy = Math.sin(th) * sp; }
      p.mode = m;
      if (m < 2) {
        const tg = m === 0 ? p.s0 : p.s1, gm = m === 0 ? 7 : 1.7, A = (m === 0 ? 10 : 22) * a, k = 1 - Math.exp(-gm * dt), nz = Math.sqrt(dt);
        p.x += (tg[0] - p.x) * k + rnd(-1, 1) * A * nz; p.y += (tg[1] - p.y) * k + rnd(-1, 1) * A * nz;
        if (m === 1) p.y = clamp(p.y, 84, BXH - 11);
      } else {
        const sp = Math.hypot(p.vx, p.vy) || 1, want = 62 * a; p.vx *= want / sp; p.vy *= want / sp;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 11) { p.x = 11; p.vx = Math.abs(p.vx); } else if (p.x > BXW - 11) { p.x = BXW - 11; p.vx = -Math.abs(p.vx); }
        if (p.y < 11) { p.y = 11; p.vy = Math.abs(p.vy); } else if (p.y > BXH - 11) { p.y = BXH - 11; p.vy = -Math.abs(p.vy); }
      }
      p.x = clamp(p.x, 10, BXW - 10); p.y = clamp(p.y, 10, BXH - 10);
      p.ang += p.spin * dt;
    });
  }
  const NB = []; for (let i = 0; i < 16; i++) { if (i % 4 < 3) NB.push([i, i + 1]); if (i < 12) NB.push([i, i + 4]); }
  function drawBox(box, bx, by, bs, t, st, sub) {
    ctx.save(); ctx.translate(bx, by); ctx.scale(bs, bs);
    D.roundRect(0, 0, BXW, BXH, 10); ctx.fillStyle = 'rgba(240,247,255,.95)'; ctx.fill();
    ctx.save(); D.roundRect(0, 0, BXW, BXH, 10); ctx.clip();
    if (box.key === 'h2o') {
      NB.forEach(([i, j], q) => {
        const a = box.ps[i], b = box.ps[j]; if (a.mode > 1 || b.mode > 1) return;
        const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 44) return;
        const fl = a.mode === 0 && b.mode === 0 ? 0.85 : 0.35 + 0.35 * Math.sin(t * 3 + q * 1.9);
        ctx.strokeStyle = C.rgba(BAD, RM ? 0.6 : fl); ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      });
    }
    box.ps.forEach((p) => {
      if (box.key === 'h2o') miniWater(p.x, p.y, p.ang, 1.0, 1);
      else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
        D.sphere(Math.cos(0.8) * 8, Math.sin(0.8) * 8, 2.7, '#f1f5f9', { gloss: false }); D.sphere(Math.cos(-0.8) * 8, Math.sin(-0.8) * 8, 2.7, '#f1f5f9', { gloss: false });
        D.sphere(0, 0, 7.2, '#eab308', { gloss: true }); ctx.restore();
      }
    });
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; D.roundRect(0, 0, BXW, BXH, 10); ctx.stroke();
    ctx.restore();
  }
  function heatLayout() {
    const L = RC.L, bs = PHONE ? 1.2 : 1.0, bw = BXW * bs, bh = BXH * bs;
    const cw = L.w / 2;
    return [0, 1].map((i) => ({ i, bx: L.x + i * cw + (cw - bw) / 2 - 12, by: L.y + 74, bs, bw, bh, tx: L.x + i * cw + (cw - bw) / 2 - 12 + bw + 22 }));
  }
  function stepBP(dt) {
    const b = S.bp;
    if (b.run && !b.ended) {
      b.tm = Math.min(T_END, b.tm + dt * TM_RATE * (b.fast ? 3 : 1));
      if (b.tm >= T_END - 1e-6) { b.tm = T_END; b.ended = true; b.run = false; updateCtl(); }
    }
    b.fprog = SciSim.approach(b.fprog, b.found ? 1 : 0, dt, 2.2); if (b.found && b.fprog > 0.995) b.fprog = 1;
    ['h2o', 'h2s'].forEach((k) => stepBox(BOX[k], dt, evalSub(SUBST[k], b.tm)));
  }
  const stateName = (st) => ['고체', '액체', '기체'][st.ph] + (st.g >= 0 ? (st.ph === 0 ? ' → 액체 (녹는 중)' : ' → 기체 (끓는 중)') : '');
  function drawHeat(t) {
    const L = RC.L, b = S.bp, lay = heatLayout();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔥 같은 불꽃으로 1 mol씩 가열해요 (−100 °C에서 시작)', PHONE ? 13 : 14.5, INK, 'left', 800);
    ['h2o', 'h2s'].forEach((k, q) => {
      const s = SUBST[k], st = evalSub(s, b.tm), G = lay[q];
      T(G.bx + G.bw / 2, G.by - 10, s.nm + ' · 분자량 ' + s.M, 14.5, s.c, 'center', 800);
      drawBox(BOX[k], G.bx, G.by, G.bs, t, st, s);
      D.thermometer(G.tx, G.by + 12, G.bh * 0.62, st.T, -100, 150, { ticks: false, color: s.c });
      // 버너와 불꽃
      const fy = G.by + G.bh + 46;
      D.roundRect(G.bx + G.bw / 2 - 34, fy - 4, 68, 16, 6); ctx.fillStyle = '#94a3b8'; ctx.fill();
      if (b.run && !b.ended) D.flame(G.bx + G.bw / 2, fy - 4, 40, t, {});
      T(G.bx + G.bw / 2, G.by + G.bh + 20, f1(st.T).replace('-', '−') + ' °C', 16, INK, 'center', 800);
      textBlock(G.bx - 4, G.by + G.bh + 84, G.bw + 24, stateName(st), PHONE ? 13.5 : 13, st.g >= 0 ? BAD : MUTED, 17, 800);
    });
    if (!PHONE) textBlock(L.x + 16, L.y + L.h - 52, L.w - 32, b.tm < 0.01 ? '두 물질 모두 −100 °C의 고체예요. 🔥 가열 시작을 눌러요. (그림의 점선은 H₂O 분자 사이의 수소 결합)' : '온도가 멈추는 곳(수평 구간)에서는 가해 준 열이 분자 사이의 힘을 끊는 데 쓰여요.', 13, MUTED, 18, 700);
  }
  const grRect = () => { const R = RC.R; return PHONE ? { x: R.x + 52, y: R.y + 50, w: R.w - 74, h: 200 } : { x: R.x + 48, y: R.y + 54, w: R.w - 66, h: 280 }; };
  function drawHeatGraph(t) {
    const R = RC.R, b = S.bp, r = grRect();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📈 가열 시간–온도 곡선 (모식도)', 14.5, INK, 'left', 800);
    const X = (s) => r.x + s / T_AX * r.w, Y = (v) => r.y + r.h - (v + 100) / 250 * r.h;
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    [-100, -50, 0, 50, 100, 150].forEach((v) => { ctx.beginPath(); ctx.moveTo(r.x, Y(v)); ctx.lineTo(r.x + r.w, Y(v)); ctx.stroke(); T(r.x - 6, Y(v) + 4, sgn(v), 12, MUTED, 'right', 700); });
    [0, 20, 40, 60].forEach((s) => T(X(s), r.y + r.h + 17, String(s), 12, MUTED, 'center', 700));
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke();
    T(r.x + r.w, r.y + r.h + 34, '가열 시간 (s)', 12.5, MUTED, 'right', 800); T(r.x - 6, r.y - 9, '°C', 12.5, MUTED, 'right', 800);
    ['h2o', 'h2s'].forEach((k) => {
      const s = SUBST[k];
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y - 4, X(Math.min(b.tm, T_AX)) - r.x + 1, r.h + 8); ctx.clip();
      ctx.strokeStyle = s.c; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let q = 0; q <= T_AX; q += 0.25) { const v = evalSub(s, q).T; if (q) ctx.lineTo(X(q), Y(v)); else ctx.moveTo(X(q), Y(v)); }
      ctx.stroke(); ctx.restore();
      const st = evalSub(s, b.tm);
      // 끓는점 수평 구간을 지나고 나면 값을 적어요
      const tb = s.segs.find((g) => g[0] === 'b');
      if (b.tm >= tb.ts + 0.2) {
        const yy = Y(s.tb); ctx.strokeStyle = C.rgba(s.c, 0.5); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r.x, yy); ctx.lineTo(X(tb.ts + tb.E), yy); ctx.stroke(); ctx.setLineDash([]);
        D.label(r.x + r.w - 4, yy + (k === 'h2o' ? -14 : 14), s.nm + ' 끓는점 ' + sgn(s.tb) + ' °C', { size: 12, bg: s.c, align: 'right' });
      }
      D.sphere(X(Math.min(b.tm, T_AX)), Y(st.T), 6.5, s.c, { gloss: true, outline: '#fff' });
    });
    // 범례
    const ly = r.y + r.h + 52;
    ['h2o', 'h2s'].forEach((k, q) => { const s = SUBST[k]; ctx.fillStyle = s.c; ctx.fillRect(R.x + 16 + q * 120, ly - 8, 22, 5); T(R.x + 44 + q * 120, ly - 1, s.nm, 13.5, INK, 'left', 800); });
    if (!PHONE) textBlock(R.x + 14, ly + 26, R.w - 28, b.ended ? 'H₂S는 약 ' + f1(SUBST.h2s.segs[3].ts) + ' s에 끓기 시작했고 −60 °C에서 멈췄어요. H₂O는 ' + f1(SUBST.h2o.segs[3].ts) + ' s에 100 °C에서 끓기 시작해요.' : '같은 불꽃인데 수평 구간(끓는 중)의 온도가 달라요. 어느 물질이 더 높은 온도에서 끓을까요?', 13, b.ended ? INK : MUTED, 18, 800);
  }

  /* ================= ③ 얼음의 밀도 ================= */
  const RHO_W = [0.99984, 0.99990, 0.99994, 0.99996, 0.99997, 0.99996, 0.99994, 0.99990, 0.99985, 0.99978, 0.99970];   // 0 ~ 10 °C (g/cm³)
  const rhoWater = (Tc) => { Tc = clamp(Tc, 0, 10); const i = Math.min(9, Math.floor(Tc)); return lerp(RHO_W[i], RHO_W[i + 1], Tc - i); };
  const rhoIce = (Tc) => 0.9167 + (-Math.min(0, Tc)) * 0.00019;
  const dRho = () => (S.dens.frozen ? rhoIce(S.dens.T) : rhoWater(S.dens.T));
  const f4 = (v) => v.toFixed(4), f5 = (v) => v.toFixed(5);
  const fT = (v) => { const r = Math.round(v * 10) / 10; return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('-', '−'); };
  const fRho = (v) => (v < 0.99 ? f4(v) : f5(v));
  function setDT(v) {
    const d = S.dens; v = clamp(Math.round(v), -10, 10);
    d.T = v; if (v < 0) d.frozen = true; else if (v > 0) d.frozen = false;
    updateCtl();
  }
  function setLT(v) { S.dens.Ta = clamp(Math.round(v), -10, 10); updateCtl(); }
  /* 육각 고리(얼음) 격자: 꼭짓점 = 물 분자, 가운데 = 빈 공간 */
  const HEX = (function () {
    const A = 1, cols = 7, rows = 3, pts = [], key = new Map(), centers = [];
    const vert = (x, y) => { const k = Math.round(x * 100) + ',' + Math.round(y * 100); if (!key.has(k)) { key.set(k, pts.length); pts.push([x, y]); } return key.get(k); };
    const hexes = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = c * Math.sqrt(3) * A + (r % 2 ? Math.sqrt(3) * A / 2 : 0), cy = r * 1.5 * A;
      const vs = []; for (let k = 0; k < 6; k++) { const a = rad(60 * k + 30); vs.push(vert(cx + A * Math.cos(a), cy + A * Math.sin(a))); }
      hexes.push({ cx, cy, vs, r, c }); centers.push([cx, cy]);
    }
    const bonds = []; const seen = new Set();
    hexes.forEach((h) => h.vs.forEach((v, k) => { const w = h.vs[(k + 1) % 6], kk = Math.min(v, w) + '-' + Math.max(v, w); if (!seen.has(kk)) { seen.add(kk); bonds.push([v, w]); } }));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; pts.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    // 액체: 일부 분자가 빈 공간(육각형 가운데)으로 들어가요
    const moveTo = new Map();
    hexes.forEach((h) => { if (h.r === 1 && h.c % 2 === 0 && h.c > 0 && h.c < cols - 1) moveTo.set(h.vs[(h.c + 1) % 6], [h.cx, h.cy]); });
    hexes.forEach((h) => { if (h.r !== 1 && h.c % 3 === 1) { const v = h.vs[(h.c + 3) % 6]; if (!moveTo.has(v)) moveTo.set(v, [h.cx, h.cy]); } });
    return { pts, bonds, hexes, x0, x1, y0, y1, moveTo };
  })();
  const dnBox = () => { const L = RC.L; return PHONE ? { x: L.x + 10, y: L.y + 52, w: L.w - 20, h: 250 } : { x: L.x + 14, y: L.y + 52, w: L.w - 28, h: 232 }; };
  function dnGeom() {   // 상자 안의 분자 위치 (얼음 육각 고리 ↔ 액체 접근)
    const b = dnBox(), pad = 22, sw = (b.w - 2 * pad) / (HEX.x1 - HEX.x0), sh = (b.h - 2 * pad - 14) / (HEX.y1 - HEX.y0), sc = Math.min(sw, sh);
    const ox = b.x + b.w / 2 - (HEX.x0 + HEX.x1) / 2 * sc, oyBottom = b.y + b.h - pad;
    return { b, sc, ice: HEX.pts.map((p) => [ox + p[0] * sc, oyBottom - (HEX.y1 - p[1]) * sc]), cen: HEX.hexes.map((h) => [ox + h.cx * sc, oyBottom - (HEX.y1 - h.cy) * sc]), oyBottom, ox };
  }
  const MOL = HEX.pts.map((_, i) => ({ ang: hash(i, 3) * TAU, ph: hash(i, 9) * TAU, ph2: hash(i, 5) * TAU }));
  function stepDens(dt) {
    const d = S.dens;
    d.q = SciSim.approach(d.q == null ? (d.frozen ? 0 : 1) : d.q, d.frozen ? 0 : 1, dt, 3.5);
    d.Vd = SciSim.approach(d.Vd == null ? 1 / dRho() : d.Vd, 1 / dRho(), dt, 5);
    d.Tad = SciSim.approach(d.Tad, d.Ta, dt, 3); if (Math.abs(d.Tad - d.Ta) < 0.02) d.Tad = d.Ta;
    if (S.mode === 'dens' && S.sub.dens === 'mol') {
      if (d.frozen && Math.abs(d.q) < 0.05) d.seen.ice = true;
      if (!d.frozen && Math.abs(d.q - 1) < 0.05) { d.seen.water = true; if (d.T === 4) d.seen.max = true; }
    }
  }
  function drawDensMol(t) {
    const L = RC.L, d = S.dens, G = dnGeom(), b = G.b, q = sm(d.q == null ? 0 : d.q);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 같은 질량 1.00 g의 물 분자 배열 (2차원 단순화)', PHONE ? 13 : 14.5, INK, 'left', 800);
    D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = '#f7fbff'; ctx.fill(); ctx.strokeStyle = '#cfe0f5'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.clip();
    // 빈 공간 표시 (얼음)
    if (q < 0.7) {
      HEX.hexes.forEach((h, k) => {
        ctx.beginPath(); h.vs.forEach((v, j) => { const p = G.ice[v]; if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
        ctx.fillStyle = 'rgba(56,189,248,' + (0.16 * (1 - q / 0.7)) + ')'; ctx.fill();
      });
    }
    // 분자 위치
    const amp = 1.4 + q * (3.2 + Math.max(0, d.T) * 0.25), sy = lerp(1, 0.925, q);
    const pos = HEX.pts.map((_, i) => {
      const a = G.ice[i], mv = HEX.moveTo.get(i);
      let lx = a[0], ly = a[1];
      if (mv) { const c = G.cen[HEX.hexes.findIndex((h) => h.cx === mv[0] && h.cy === mv[1])]; lx = c[0]; ly = c[1]; }
      lx = G.b.x + G.b.w / 2 + (lx - (G.b.x + G.b.w / 2)) * 0.97; ly = G.oyBottom - (G.oyBottom - ly) * sy;
      let x = lerp(a[0], lx, q), y = lerp(a[1], ly, q);
      if (!RM) { x += Math.sin(t * 2.3 + MOL[i].ph) * amp; y += Math.cos(t * 2.0 + MOL[i].ph2) * amp; }
      return [x, y];
    });
    // 수소 결합 (얼음: 모두 고정, 액체: 일부가 끊어짐)
    const lim = G.sc * 1.3;
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], dd = Math.hypot(dx, dy); if (dd > lim) continue;
      const iceB = q < 0.5 && HEX.bonds.some((bd) => (bd[0] === i && bd[1] === j) || (bd[0] === j && bd[1] === i));
      let al = 0;
      if (iceB) al = 0.95 * (1 - q * 1.6);
      if (q > 0.2) { const alive = hash(i * 7 + j, 13) + 0.35 * Math.sin(t * 1.4 + i * 1.7 + j) < 0.72; if (alive) al = Math.max(al, 0.55 * clamp((q - 0.2) / 0.5, 0, 1)); }
      if (al > 0.03) { ctx.strokeStyle = C.rgba(BAD, al); ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pos[i][0], pos[i][1]); ctx.lineTo(pos[j][0], pos[j][1]); ctx.stroke(); ctx.setLineDash([]); }
    }
    pos.forEach((p, i) => miniWater(p[0], p[1], MOL[i].ang + (RM ? 0 : q * Math.sin(t * 1.2 + i)), 0.95, 1));
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.stroke();
    const lab = d.frozen ? '🧊 얼음: 분자마다 수소 결합이 고정된 육각 고리, 가운데는 빈 공간' : '💧 물: 일부 수소 결합이 끊기고 분자가 빈 공간으로 들어와 더 가까워요';
    D.label(b.x + b.w / 2, b.y + 18, lab, { size: PHONE ? 11.5 : 12.5, bg: d.frozen ? '#0369a1' : '#1d4ed8', align: 'center' });
    // 시료 눈금 (메스실린더)
    const by = b.y + b.h + 12, bh = L.y + L.h - by - 10;
    D.roundRect(L.x + 14, by, L.w - 28, bh, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    const cyl = { x: L.x + 74, y: by + 12, w: 54, h: bh - 40 };
    const V0 = 0.96, V1 = 1.12, Y = (v) => cyl.y + cyl.h - (v - V0) / (V1 - V0) * cyl.h;
    const V = d.Vd == null ? 1 : d.Vd, ly = Y(clamp(V, V0, V1));
    ctx.save(); D.roundRect(cyl.x, cyl.y, cyl.w, cyl.h, 6); ctx.clip();
    const g = ctx.createLinearGradient(0, ly, 0, cyl.y + cyl.h); const frz = d.frozen ? 1 : 0;
    g.addColorStop(0, frz ? 'rgba(207,239,255,.95)' : 'rgba(96,170,255,.75)'); g.addColorStop(1, frz ? 'rgba(165,215,250,.95)' : 'rgba(56,130,230,.85)');
    ctx.fillStyle = g; ctx.fillRect(cyl.x, ly, cyl.w, cyl.y + cyl.h - ly);
    if (d.frozen) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cyl.x + 8, ly + 10 + k * 14); ctx.lineTo(cyl.x + cyl.w - 8, ly + 4 + k * 14 + 8); ctx.stroke(); } }
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 2.8; D.roundRect(cyl.x, cyl.y, cyl.w, cyl.h, 6); ctx.stroke();
    for (let v = 1.00; v <= 1.1201; v += 0.02) { const y = Y(v); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cyl.x - 7, y); ctx.lineTo(cyl.x, y); ctx.stroke(); T(cyl.x - 11, y + 4, v.toFixed(2), 11.5, MUTED, 'right', 700); }
    ctx.strokeStyle = C.rgba(SKY, 0.9); ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cyl.x - 4, Y(1.0)); ctx.lineTo(cyl.x + cyl.w + 52, Y(1.0)); ctx.stroke(); ctx.setLineDash([]);
    T(cyl.x + cyl.w + 8, Y(1.0) + 15, '물 1.00 cm³', 12, SKY, 'left', 800);
    D.arrow(cyl.x + cyl.w + 24, Y(1.0), cyl.x + cyl.w + 24, ly, { color: BAD, width: 2.6, head: 8, alpha: V > 1.002 ? 1 : 0 });
    T(cyl.x + cyl.w / 2, by + bh - 6, '부피 (cm³)', 12, MUTED, 'center', 800);
    const rx = L.x + 180, ry = by + 28;
    const rho = dRho(), Vv = 1 / rho;
    T(rx, ry, '질량  1.00 g', 14, INK, 'left', 800);
    T(rx, ry + 24, '부피  ' + Vv.toFixed(3) + ' cm³', 14, INK, 'left', 800);
    T(rx, ry + 48, '밀도  ' + fRho(rho) + ' g/cm³', 14, INK, 'left', 800);
    const pct = (Vv - 1 / rhoWater(0)) / (1 / rhoWater(0)) * 100;
    if (d.frozen) T(rx, ry + 76, '같은 질량인데 물보다 부피가 약 ' + Math.round((1 / rhoIce(d.T) - 1) * 100) + ' % 커요', 12.5, BAD, 'left', 800);
    else if (d.T === 4) T(rx, ry + 76, '4 °C: 밀도가 가장 커요 (부피 최소)', 12.5, GOOD, 'left', 800);
    else T(rx, ry + 76, d.T < 4 ? '4 °C까지는 온도가 올라갈수록 밀도가 커져요' : '4 °C보다 높으면 온도가 올라갈수록 밀도가 작아져요', 12, MUTED, 'left', 800);
    if (!d.frozen && d.T === 0) T(rx, ry + 96, '(0 °C 물)', 12, MUTED, 'left', 700); if (d.frozen && d.T === 0) T(rx, ry + 96, '(0 °C 얼음)', 12, MUTED, 'left', 700);
    void pct;
  }
  const dnGraphs = () => {
    const R = RC.R;
    if (PHONE) return { g1: { x: R.x + 52, y: R.y + 46, w: 160, h: 230 }, g2: { x: R.x + 268, y: R.y + 46, w: 176, h: 230 } };
    return { g1: { x: R.x + 54, y: R.y + 54, w: R.w - 76, h: 150 }, g2: { x: R.x + 54, y: R.y + 262, w: R.w - 76, h: 150 } };
  };
  function drawDensGraphs(t) {
    const R = RC.R, d = S.dens, G = dnGraphs();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '📈 밀도–온도 그래프', 14.5, INK, 'left', 800);
    // 전체 (−10 ~ 10 °C)
    const g1 = G.g1, X1 = (v) => g1.x + (v + 10) / 20 * g1.w, Y1 = (r) => g1.y + g1.h - (r - 0.90) / 0.10 * g1.h;
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    [0.90, 0.95, 1.00].forEach((r) => { ctx.beginPath(); ctx.moveTo(g1.x, Y1(r)); ctx.lineTo(g1.x + g1.w, Y1(r)); ctx.stroke(); T(g1.x - 5, Y1(r) + 4, r.toFixed(2), 11.5, MUTED, 'right', 700); });
    [-10, 0, 10].forEach((v) => T(X1(v), g1.y + g1.h + 15, sgn(v), 11.5, MUTED, 'center', 700));
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.lineTo(g1.x, g1.y + g1.h); ctx.lineTo(g1.x + g1.w, g1.y + g1.h); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#0369a1'; ctx.beginPath(); ctx.moveTo(X1(-10), Y1(rhoIce(-10))); ctx.lineTo(X1(0), Y1(rhoIce(0))); ctx.stroke();
    ctx.strokeStyle = '#2563eb'; ctx.beginPath(); for (let v = 0; v <= 10; v += 0.5) { if (v) ctx.lineTo(X1(v), Y1(rhoWater(v))); else ctx.moveTo(X1(v), Y1(rhoWater(v))); } ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X1(0), Y1(rhoIce(0))); ctx.lineTo(X1(0), Y1(rhoWater(0))); ctx.stroke(); ctx.setLineDash([]);
    T(X1(-5), Y1(0.917) + 17, '얼음', 12.5, '#0369a1', 'center', 800); T(X1(5), Y1(1.0) + 17, '물', 12.5, '#2563eb', 'center', 800);
    T(g1.x + g1.w, g1.y + g1.h + 30, '온도 (°C)', 11.5, MUTED, 'right', 800); T(g1.x - 4, g1.y - 8, '밀도 (g/cm³)', 11.5, MUTED, 'left', 800);
    const rho = dRho(); D.sphere(X1(d.T), Y1(rho), 6.5, d.frozen ? '#0369a1' : '#2563eb', { gloss: true, outline: '#fff' });
    // 확대 (0 ~ 10 °C, 물)
    const g2 = G.g2, X2 = (v) => g2.x + v / 10 * g2.w, Y2 = (r) => g2.y + g2.h - (r - 0.99965) / 0.00040 * g2.h;
    T(g2.x - 30, g2.y - 14, '🔍 물만 확대 (0 ~ 10 °C)', 13, INK, 'left', 800);
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    [0.9997, 0.9998, 0.9999, 1.0000].forEach((r) => { ctx.beginPath(); ctx.moveTo(g2.x, Y2(r)); ctx.lineTo(g2.x + g2.w, Y2(r)); ctx.stroke(); T(g2.x - 5, Y2(r) + 4, r.toFixed(4), 11, MUTED, 'right', 700); });
    [0, 2, 4, 6, 8, 10].forEach((v) => T(X2(v), g2.y + g2.h + 15, String(v), 11.5, MUTED, 'center', 700));
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g2.x, g2.y); ctx.lineTo(g2.x, g2.y + g2.h); ctx.lineTo(g2.x + g2.w, g2.y + g2.h); ctx.stroke();
    ctx.strokeStyle = C.rgba(GOOD, 0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X2(4), g2.y); ctx.lineTo(X2(4), g2.y + g2.h); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.beginPath(); for (let v = 0; v <= 10; v += 0.25) { if (v) ctx.lineTo(X2(v), Y2(rhoWater(v))); else ctx.moveTo(X2(v), Y2(rhoWater(v))); } ctx.stroke();
    D.label(X2(4), g2.y + 12, '4 °C 최대', { size: 12, bg: GOOD, align: 'center' });
    T(g2.x + g2.w, g2.y + g2.h + 30, '온도 (°C)', 11.5, MUTED, 'right', 800);
    if (!d.frozen) D.sphere(X2(d.T), Y2(rhoWater(d.T)), 6.5, '#2563eb', { gloss: true, outline: '#fff' });
    else T(X2(5), g2.y + g2.h * 0.82, '(얼음일 때는 이 구간에 없어요)', 12, MUTED, 'center', 700);
    if (!PHONE) textBlock(R.x + 14, R.y + R.h - 38, R.w - 28, '물은 0 → 4 °C에서 오히려 밀도가 커져요. 얼음이 되면 갑자기 가벼워져요.', 12.5, MUTED, 17, 700);
  }

  /* ---- 겨울 호수 단면 ---- */
  function lakeTemps(Ta) {                 // 위에서 아래로 5개 층의 물 온도
    if (Ta >= 4) return [Ta, Ta, Ta, Ta, Ta];
    const Ts = Math.max(Ta, 0);
    return [0, 1, 2, 3, 4].map((k) => Ts + (4 - Ts) * k / 4);
  }
  const lakeRho = (Tc) => rhoWater(Tc);
  function drawLake(t) {
    const F = RC.F, d = S.dens, Ta = d.Tad;
    panel(F.x, F.y, F.w, F.h, 14);
    T(F.x + 14, F.y + 26, '🏞️ 겨울 호수의 단면 (색이 짙을수록 밀도가 커요)', PHONE ? 13 : 14.5, INK, 'left', 800);
    const lk = PHONE ? { x: F.x + 12, y: F.y + 44, w: F.w - 24, h: 372 } : { x: F.x + 14, y: F.y + 44, w: 500, h: 372 };
    const air = 60, wy = lk.y + air + 46, lh = 50, wh = lh * 5;
    // 하늘 (기온에 따라 색)
    const cold = clamp((10 - Ta) / 20, 0, 1);
    const sg = ctx.createLinearGradient(0, lk.y, 0, lk.y + air + 46); sg.addColorStop(0, C.mix('#bfe6ff', '#cbd5e1', cold)); sg.addColorStop(1, C.mix('#e8f6ff', '#eef2f7', cold));
    ctx.fillStyle = sg; D.roundRect(lk.x, lk.y, lk.w, air + 46 + 8, 10); ctx.fill();
    T(lk.x + 12, lk.y + 24, '기온 ' + fT(Ta) + ' °C', 16, cold > 0.5 ? '#334155' : '#075985', 'left', 800);
    if (Ta < 4 && !RM) for (let k = 0; k < 7; k++) { const sx = lk.x + 24 + k * (lk.w - 40) / 6 + Math.sin(t * 0.8 + k) * 8, sy = lk.y + 8 + ((t * 18 + k * 23) % (air + 20)); T(sx, sy, '❄', 13, '#7dd3fc', 'center', 700); }
    // 호수 물
    const temps = lakeTemps(Math.round(Ta * 1000) / 1000);
    ctx.save(); D.roundRect(lk.x, wy, lk.w, wh + 6, 8); ctx.clip();
    temps.forEach((tv, k) => {
      const r = lakeRho(tv), tt = clamp((r - 0.99965) / 0.00035, 0, 1);
      ctx.fillStyle = C.mix('#d6edff', '#2358c2', tt); ctx.fillRect(lk.x, wy + k * lh, lk.w, lh + 1);
      if (k) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lk.x, wy + k * lh); ctx.lineTo(lk.x + lk.w, wy + k * lh); ctx.stroke(); }
      const dark = tt > 0.45;
      T(lk.x + 14, wy + k * lh + 20, fT(tv) + ' °C', 15, dark ? '#fff' : '#0b3a7a', 'left', 800);
      T(lk.x + 14, wy + k * lh + 39, fRho(r) + ' g/cm³', 12.5, dark ? '#dbeafe' : '#1e4f8f', 'left', 700);
    });
    // 대류 화살표 (표면이 4 °C를 향해 식는 동안)
    if (Ta > 4.05 && !RM) for (let k = 0; k < 2; k++) { const x = lk.x + lk.w * (0.56 + 0.26 * k), dir = k ? -1 : 1; for (let q = 0; q < 3; q++) { const yy = wy + 30 + ((t * 34 + q * 90) % (wh - 60)); const yv = dir > 0 ? yy : wy + wh - (yy - wy); D.arrow(x, yv - 10, x, yv + 10, { color: 'rgba(255,255,255,.85)', width: 3, head: 8, }); } }
    ctx.restore();
    ctx.strokeStyle = '#6b7f9c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lk.x, wy - 8); ctx.lineTo(lk.x, wy + wh + 6); ctx.lineTo(lk.x + lk.w, wy + wh + 6); ctx.lineTo(lk.x + lk.w, wy - 8); ctx.stroke();
    // 얼음 (물보다 가벼워 위에 떠요: 부피의 약 8 %가 수면 위)
    const th = Ta < 0 ? clamp(-Ta, 0, 10) / 10 * 36 + 6 : 0;
    if (th > 0.5) {
      const iy = wy - th, ih = th;
      const ig = ctx.createLinearGradient(0, iy, 0, iy + ih); ig.addColorStop(0, '#f4fbff'); ig.addColorStop(1, '#bfe3f7');
      ctx.fillStyle = ig; D.roundRect(lk.x + 2, iy, lk.w - 4, ih, 6); ctx.fill(); ctx.strokeStyle = '#8cc4e6'; ctx.lineWidth = 2; ctx.stroke();
      if (ih > 16) T(lk.x + lk.w - 14, iy + ih / 2 + 5, '얼음 (밀도 0.917)', 13, '#0b4f7a', 'right', 800); else T(lk.x + lk.w - 14, iy - 5, '얼음 (밀도 0.917)', 13, '#0b4f7a', 'right', 800);
    }
    // 물고기
    if (!RM || true) { const fx = lk.x + lk.w * 0.74 + (RM ? 0 : Math.sin(t * 0.7) * 26), fy = wy + wh - 16 + (RM ? 0 : Math.sin(t * 1.6) * 3); T(fx, fy, '🐟', 24, INK, 'center', 700); }
    // 설명
    const msg = Ta > 4.05 ? '표면이 식으면 무거워져 가라앉고, 아래의 물이 올라와요. 호수 전체가 섞이며 4 °C를 향해 식어요.'
      : Ta > 0 ? '4 °C보다 차가운 물은 오히려 가벼워서 위에 머물러요. 가장 무거운 4 °C 물이 바닥에 있어요.'
      : '표면만 얼고, 얼음은 물보다 가벼워 위에 떠요. 얼음 아래 바닥의 물은 4 °C여서 물고기가 살아요.';
    const by = lk.y + lk.h + 4;
    textBlock(F.x + 18, by + 18, F.w - 36, msg, PHONE ? 13 : 14, Ta <= 0 ? GOOD : INK, 19, 800);
    // 표
    const tb = PHONE ? { x: F.x + 12, y: by + 70, w: F.w - 24 } : { x: lk.x + lk.w + 16, y: F.y + 44, w: F.w - lk.w - 44 };
    if (!PHONE) {
      D.roundRect(tb.x, tb.y, tb.w, 330, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
      T(tb.x + 12, tb.y + 24, '층별 온도 · 밀도', 14, INK, 'left', 800);
      temps.forEach((tv, k) => { const yy = tb.y + 50 + k * 48; T(tb.x + 12, yy, (k === 0 ? '맨 위' : k === 4 ? '바닥' : '중간 ' + k) + '  ' + fT(tv) + ' °C', 13.5, INK, 'left', 800); T(tb.x + 12, yy + 19, '밀도 ' + fRho(lakeRho(tv)), 12.5, MUTED, 'left', 700); });
      const heavy = temps.reduce((bi, tv, k) => (lakeRho(tv) > lakeRho(temps[bi]) + 1e-9 ? k : bi), 0), same = temps.every((v) => Math.abs(v - temps[0]) < 0.05);
      D.label(tb.x + tb.w / 2, tb.y + 306, same ? '모든 층의 온도가 같아요' : heavy === 4 ? '가장 무거운 층 = 바닥' : '가장 무거운 층 = ' + (heavy + 1) + '번째', { size: 12.5, bg: same ? '#64748b' : heavy === 4 ? GOOD : '#64748b', align: 'center' });
    }
  }

  /* ================= ④ 열 · 표면 · 용매 ================= */
  const MAT = [
    { id: 'water', nm: '물', c: 4.18, col: '#0ea5e9', Lv: 2257 },
    { id: 'eth', nm: '에탄올', c: 2.44, col: '#f59e0b', Lv: 840 },
    { id: 'iron', nm: '철', c: 0.45, col: '#64748b', Lv: 0 },
  ];
  const MASS = 100;
  const dTof = (m, Q) => Q / (MASS * m.c);

  /* --- 비열 실험대 --- */
  function drawHeatBench(t) {
    const F = RC.F, a = S.ap;
    panel(F.x, F.y, F.w, F.h, 14);
    T(F.x + 14, F.y + 26, '🔥 같은 열을 주면 온도는 얼마나 오를까? (각 100 g, 처음 20 °C)', PHONE ? 12.5 : 14.5, INK, 'left', 800);
    const n = 3, gap = 10;
    MAT.forEach((m, i) => {
      const dT = dTof(m, a.Qd), Tn = 20 + dT;
      const rc = PHONE ? { x: F.x + 10, y: F.y + 44 + i * 150, w: F.w - 20, h: 142 } : { x: F.x + 14 + i * ((F.w - 28 + gap) / n), y: F.y + 44, w: (F.w - 28 - gap * 2) / n, h: 316 };
      D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
      // 용기 / 물질
      const vx = PHONE ? rc.x + 54 : rc.x + rc.w / 2 - 30, vy = PHONE ? rc.y + 20 : rc.y + 54, vw = PHONE ? 84 : 92, vh = PHONE ? 90 : 118;
      const heat = clamp(a.Qd / 1000, 0, 1);
      D.roundRect(vx - 10, vy + vh + 6, vw + 20, 12, 5); ctx.fillStyle = C.mix('#94a3b8', '#fb923c', heat); ctx.fill();
      if (a.Qd > 1 && !RM) { for (let k = 0; k < 4; k++) { const fx = vx + 10 + k * (vw - 20) / 3; D.flame(fx, vy + vh + 8, 10 + heat * 12, t + k, {}); } }
      if (m.id === 'iron') {
        const g = ctx.createLinearGradient(vx, vy + 24, vx + vw, vy + vh); g.addColorStop(0, '#cbd5e1'); g.addColorStop(1, '#64748b');
        D.shadow(() => { D.roundRect(vx, vy + 28, vw, vh - 28, 8); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(vx + 8, vy + 36, vw - 30, 5); T(vx + vw / 2, vy + vh / 2 + 18, '철', 20, '#fff', 'center', 800);
        ctx.fillStyle = C.rgba('#ef4444', clamp(dT / 25, 0, 1) * 0.55); D.roundRect(vx, vy + 28, vw, vh - 28, 8); ctx.fill();
      } else {
        D.beaker(vx, vy, vw, vh, { level: 0.72, liquid: m.id === 'water' ? '#7cc4ff' : '#fde68a', t, ticks: 0 });
        T(vx + vw / 2, vy + vh * 0.62, m.nm, 17, m.id === 'water' ? '#0b3a7a' : '#7c4a03', 'center', 800);
      }
      const tx = PHONE ? rc.x + 200 : rc.x + rc.w - 26, ty = PHONE ? rc.y + 18 : rc.y + 42;
      D.thermometer(tx, ty, PHONE ? 84 : 128, clamp(Tn, 15, 45), 15, 45, { ticks: false, color: m.col });
      if (!PHONE) { T(rc.x + rc.w / 2, rc.y + 30, m.nm + ' 100 g', 15, INK, 'center', 800); }
      else T(rc.x + 14, rc.y + 128, m.nm + ' 100 g', 14, INK, 'left', 800);
      T(PHONE ? rc.x + 232 : rc.x + rc.w / 2, PHONE ? rc.y + 30 : rc.y + rc.h - 100, 'c = ' + m.c.toFixed(2) + ' J/(g·°C)', 13, MUTED, PHONE ? 'left' : 'center', 800);
      T(PHONE ? rc.x + 232 : rc.x + rc.w / 2, PHONE ? rc.y + 64 : rc.y + rc.h - 70, '+' + f1(dT) + ' °C', PHONE ? 22 : 24, m.col, PHONE ? 'left' : 'center', 800);
      T(PHONE ? rc.x + 232 : rc.x + rc.w / 2, PHONE ? rc.y + 92 : rc.y + rc.h - 46, f1(Tn) + ' °C', 15, INK, PHONE ? 'left' : 'center', 800);
      const bw = (PHONE ? 210 : rc.w - 28), bx = PHONE ? rc.x + 232 : rc.x + 14, by = PHONE ? rc.y + 108 : rc.y + rc.h - 28;
      D.roundRect(bx, by, bw, 12, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(bx, by, bw, 12, 6); ctx.clip(); ctx.fillStyle = m.col; ctx.fillRect(bx, by, bw * clamp(dT / 25, 0, 1), 12); ctx.restore();
    });
    // 증발열
    const ey = PHONE ? F.y + 44 + 3 * 150 + 4 : F.y + 372, eh = PHONE ? 110 : 112;
    D.roundRect(F.x + 14, ey, F.w - 28, eh, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(F.x + 26, ey + 24, '💨 증발열 (1 g을 기체로 만드는 데 필요한 열)', 13.5, INK, 'left', 800);
    [MAT[0], MAT[1]].forEach((m, i) => {
      const yy = ey + 40 + i * 30, bx = F.x + 100, bw = F.w - 28 - 190;
      T(F.x + 26, yy + 14, m.nm, 13.5, m.col, 'left', 800);
      D.roundRect(bx, yy, bw, 18, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(bx, yy, bw, 18, 8); ctx.clip(); ctx.fillStyle = m.col; ctx.fillRect(bx, yy, bw * m.Lv / 2400, 18); ctx.restore();
      T(bx + bw + 8, yy + 14, m.Lv + ' J/g', 13.5, INK, 'left', 800);
    });
    if (!PHONE) T(F.x + 26, ey + eh - 10, '땀 100 g이 증발하면 약 ' + Math.round(100 * 2257 / 1000) + ' kJ의 열을 가져가요', 12.5, MUTED, 'left', 700);
    else T(F.x + 26, ey + eh - 8, '땀 100 g 증발: 약 226 kJ 흡수', 12.5, MUTED, 'left', 700);
  }

  /* --- 표면 장력 실험대 --- */
  const LIQS = { water: { nm: '물', col: '#7cc4ff', gam: 72, cap: 14.8 }, eth: { nm: '에탄올', col: '#fde68a', gam: 22, cap: 5.8 } };
  function surfLayout() {
    const F = RC.F;
    return PHONE ? { tray: { x: F.x + 14, y: F.y + 48, w: F.w - 28, h: 330 }, cap: { x: F.x + 14, y: F.y + 392, w: F.w - 28, h: 330 }, txt: { x: F.x + 14, y: F.y + 740, w: F.w - 28, h: 140 } }
      : { tray: { x: F.x + 14, y: F.y + 48, w: 436, h: 340 }, cap: { x: F.x + 462, y: F.y + 48, w: F.w - 476, h: 340 }, txt: { x: F.x + 14, y: F.y + 400, w: F.w - 28, h: 86 } };
  }
  const trayGeo = (tr) => ({ wx: tr.x + 26, wy: tr.y + 160, ww: tr.w - 52, wh: 148 });   // 액체 상자 (수면 y = wy)
  function dropStart() {
    const a = S.ap, tr = surfLayout().tray, g = trayGeo(tr);
    a.drop = { t: 0, items: [{ k: 'clip', x: g.wx + g.ww * 0.3, y: tr.y + 52, vy: 0, dent: 0, sunk: false }, { k: 'strider', x: g.wx + g.ww * 0.7, y: tr.y + 50, vy: 0, dent: 0, sunk: false }], liq: a.liq, rest: 0 };
    updateCtl();
  }
  function stepSurf(dt) {
    const a = S.ap, dp = a.drop; if (!dp) return;
    const tr = surfLayout().tray, g = trayGeo(tr); dp.t += dt;
    const w = dp.liq === 'water'; let allRest = true;
    dp.items.forEach((it) => {
      const half = it.k === 'clip' ? 6 : 9, ys = g.wy;                     // 물체 아래쪽이 수면에 닿는 높이
      if (!it.sunk) {
        it.vy += 420 * dt; it.y += it.vy * dt;
        if (w) {
          if (it.y + half >= ys + 2) { const imp = it.vy; it.y = ys - half + 5; it.vy = 0; it.dent = Math.max(it.dent, 0.2 + Math.min(0.6, imp / 400)); it.hit = true; }
          if (it.hit) { it.dent = SciSim.approach(it.dent, 1, dt, 4); it.y = ys - half + 5 * it.dent + (RM ? 0 : Math.sin(dp.t * 2 + (it.k === 'clip' ? 0 : 2)) * 0.7 * (1 - it.dent * 0.6)); }
          else allRest = false;
        } else if (it.y + half >= ys + 2) { it.sunk = true; it.sk = 0; }
        else allRest = false;
      }
      if (it.sunk) {
        it.vy = Math.min(it.vy + 200 * dt, it.k === 'clip' ? 120 : 70); it.y += it.vy * dt;
        const floor = g.wy + g.wh - (it.k === 'clip' ? 8 : 12);
        if (it.y >= floor) { it.y = floor; it.vy = 0; } else allRest = false;
      }
    });
    if (allRest) { dp.rest += dt; if (dp.rest > 1.3) { a.surfSeen[dp.liq] = true; } } else dp.rest = 0;
  }
  function surfaceY(g, x, dp, t) {
    let y = g.wy + (RM ? 0 : Math.sin(x * 0.05 + t * 1.6) * 0.9);
    if (dp && dp.liq === 'water') dp.items.forEach((it) => { if (!it.sunk && it.hit) { const w = it.k === 'clip' ? 34 : 15; y += it.dent * (it.k === 'clip' ? 7 : 4) * Math.exp(-Math.pow((x - it.x) / w, 2)); } });
    return y;
  }
  function drawStrider(x, y, dent, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#3f3a2c'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    [[-1, -1], [-1, 0.2], [-1, 1], [1, -1], [1, 0.2], [1, 1]].forEach(([s, q]) => { ctx.beginPath(); ctx.moveTo(s * 4, -6); ctx.quadraticCurveTo(s * 18, -16 + q * 4, s * (24 + q * 6), 4 + (q > 0 ? 1 : 0)); ctx.stroke(); });
    ctx.fillStyle = '#5b4a2b'; ctx.beginPath(); ctx.ellipse(0, -7, 12, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-10, -9, 3.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawSurf(t) {
    const F = RC.F, a = S.ap, lay = surfLayout(), tr = lay.tray, g = trayGeo(tr), L = LIQS[a.liq], dp = a.drop && a.drop.liq === a.liq ? a.drop : null;
    panel(F.x, F.y, F.w, F.h, 14);
    T(F.x + 14, F.y + 26, '💧 소금쟁이와 클립을 액체 표면에 올려요', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    D.roundRect(tr.x, tr.y, tr.w, tr.h, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    // 쟁반 (유리 용기)
    ctx.save(); D.roundRect(g.wx, g.wy - 14, g.ww, g.wh + 14, 10); ctx.clip();
    ctx.beginPath(); ctx.moveTo(g.wx, g.wy + g.wh + 10);
    for (let x = g.wx; x <= g.wx + g.ww; x += 6) ctx.lineTo(x, surfaceY(g, x, dp, t));
    ctx.lineTo(g.wx + g.ww, g.wy + g.wh + 10); ctx.closePath();
    const lg = ctx.createLinearGradient(0, g.wy, 0, g.wy + g.wh); lg.addColorStop(0, C.rgba(L.col, 0.75)); lg.addColorStop(1, C.rgba(C.shade(L.col, -0.2), 0.85)); ctx.fillStyle = lg; ctx.fill();
    ctx.beginPath(); for (let x = g.wx; x <= g.wx + g.ww; x += 6) { const y = surfaceY(g, x, dp, t); if (x === g.wx) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.wx, g.wy - 14); ctx.lineTo(g.wx, g.wy + g.wh); ctx.lineTo(g.wx + g.ww, g.wy + g.wh); ctx.lineTo(g.wx + g.ww, g.wy - 14); ctx.stroke();
    T(tr.x + 14, tr.y + 24, L.nm + ' · 표면 장력 ' + L.gam + ' mN/m (25 °C)', 13.5, L.nm === '물' ? '#0b3a7a' : '#7c4a03', 'left', 800);
    // 올려 놓은 물체
    if (dp) dp.items.forEach((it) => {
      ctx.save();
      if (it.sunk) ctx.globalAlpha = 0.9;
      if (it.k === 'clip') { D.shadow(() => { D.roundRect(it.x - 26, it.y - 5, 52, 10, 5); ctx.fillStyle = '#b6bfcc'; ctx.fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#6b7788'; ctx.lineWidth = 1.5; D.roundRect(it.x - 26, it.y - 5, 52, 10, 5); ctx.stroke(); }
      else drawStrider(it.x, it.y, it.dent, t);
      ctx.restore();
    });
    if (!dp) { T(g.wx + g.ww * 0.3, tr.y + 60, '📎', 28, INK, 'center', 700); T(g.wx + g.ww * 0.7, tr.y + 60, '🪲', 28, INK, 'center', 700); T(tr.x + tr.w / 2, tr.y + 100, '아래 단추로 올려 보세요', 13, MUTED, 'center', 800); }
    // 결과 라벨
    if (dp) {
      const clip = dp.items[0];
      if (dp.liq === 'water' && clip.hit && dp.rest > 0.3) D.label(clip.x, clip.y - 30, '뜬다! 표면이 움푹 눌려요', { size: 12.5, bg: GOOD, align: 'center' });
      if (dp.liq === 'eth' && clip.sunk) D.label(clip.x, Math.min(clip.y, g.wy + g.wh - 40) - 28, '가라앉아요', { size: 12.5, bg: BAD, align: 'center' });
    }
    // 모세관
    const cp = lay.cap;
    D.roundRect(cp.x, cp.y, cp.w, cp.h, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(cp.x + 12, cp.y + 24, '🧪 가는 유리관을 세웠더니 (모세관 현상)', 13, INK, 'left', 800);
    const by = cp.y + cp.h - 62, rs = [0.5, 1, 2], pxmm = 5, tw = (r) => 6 + r * 9, tubeH = 182;
    const bx0 = cp.x + 14, bw0 = cp.w - 28;
    const lvl = by;                                                                        // 큰 그릇의 수면
    ctx.fillStyle = C.rgba(L.col, 0.7); D.roundRect(bx0, lvl, bw0, 56, 8); ctx.fill(); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 2.4; D.roundRect(bx0, lvl - 4, bw0, 60, 8); ctx.stroke();
    rs.forEach((r, i) => {
      const x = cp.x + cp.w * (0.2 + 0.3 * i), w = tw(r), top = lvl - tubeH;
      const hMax = L.cap / r * pxmm, cur = (a.cap && a.cap[i] != null ? a.cap[i] : 0);
      ctx.fillStyle = C.rgba(L.col, 0.85); ctx.fillRect(x - w / 2 + 1, lvl - cur, w - 2, cur + 20);
      ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2, lvl + 24); ctx.moveTo(x + w / 2, top); ctx.lineTo(x + w / 2, lvl + 24); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - w / 2 + 1, lvl - cur - 2); ctx.quadraticCurveTo(x, lvl - cur + 5, x + w / 2 - 1, lvl - cur - 2); ctx.stroke();
      T(x, top - 8, '반지름 ' + r + ' mm', 12, MUTED, 'center', 800);
      T(x, lvl + 46, (L.cap / r).toFixed(1) + ' mm', 12.5, INK, 'center', 800);
      void hMax;
    });
    // 설명
    const tx = lay.txt;
    D.roundRect(tx.x, tx.y, tx.w, tx.h, 12); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    const st = dp && dp.rest > 0.3;
    const msg = !dp ? '물 분자는 수소 결합으로 서로 강하게 당겨서 표면이 팽팽한 막처럼 행동해요(표면 장력 72 mN/m). 에탄올은 22 mN/m로 훨씬 작아요.'
      : dp.liq === 'water' ? (st ? '물 표면의 분자들은 옆과 아래의 분자와 수소 결합으로 당겨져 있어요. 그래서 무거운 클립과 소금쟁이를 받쳐 줘요. 물이 유리관 벽을 타고 오르는 힘도 이것과 관련 있어요.' : '내려가는 중...')
      : (st ? '에탄올은 수소 결합이 있어도 표면 장력이 작아서(22 mN/m) 클립과 소금쟁이를 받치지 못하고 가라앉아요.' : '내려가는 중...');
    textBlock(tx.x + 14, tx.y + 26, tx.w - 28, msg, PHONE ? 13 : 13.5, INK, 19, 800);
  }
  function stepCap(dt) {
    const a = S.ap, rs = [0.5, 1, 2]; if (!a.cap) a.cap = [0, 0, 0];
    rs.forEach((r, i) => { a.cap[i] = SciSim.approach(a.cap[i], LIQS[a.liq].cap / r * 5, dt, 2.2); });
  }

  /* --- 용매 실험대 --- */
  const SOLS = {
    nacl: { nm: '소금 (NaCl)', n: 12 },
    sug: { nm: '설탕 (C₁₂H₂₂O₁₁)', n: 6 },
    oil: { nm: '기름 (무극성)', n: 0 },
  };
  function solLayout() {
    const F = RC.F;
    return PHONE ? { tank: { x: F.x + 12, y: F.y + 46, w: F.w - 24, h: 420 }, info: { x: F.x + 12, y: F.y + 480, w: F.w - 24, h: 330 } }
      : { tank: { x: F.x + 14, y: F.y + 46, w: 490, h: 436 }, info: { x: F.x + 516, y: F.y + 46, w: F.w - 530, h: 436 } };
  }
  const SW = []; (function () { for (let i = 0; i < 46; i++) SW.push({ x: 0, y: 0, vx: 0, vy: 0, ang: rnd(0, TAU), spin: rnd(-1, 1), init: false }); })();
  function solCrystal() { const tk = solLayout().tank; return { x: tk.x + 22, y: tk.y + tk.h - 104, w: 118, h: 90 }; }
  function solReset() {
    const a = S.ap, tk = solLayout().tank; a.dis = null;
    SW.forEach((p) => { p.x = rnd(tk.x + 16, tk.x + tk.w - 16); p.y = rnd(tk.y + 70, tk.y + tk.h - 16); const th = rnd(0, TAU); p.vx = Math.cos(th) * 26; p.vy = Math.sin(th) * 26; p.init = true; });
  }
  function solStart() {
    const a = S.ap, c = solCrystal(), key = a.sol; if (a.dis && a.dis.sol === key && a.dis.t < 0.1) return;
    const items = [];
    if (key === 'nacl') for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) items.push({ x: c.x + 17 + q * 28, y: c.y + 15 + r * 30, cat: (r + q) % 2 === 0, th: 0 });
    else if (key === 'sug') for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) items.push({ x: c.x + 20 + q * 39, y: c.y + 24 + r * 42, cat: false, th: 0 });
    items.forEach((it, i) => { it.th = (0.25 + 0.7 * ((i * 5) % items.length) / Math.max(1, items.length)) ; it.out = false; it.t = 0; it.vx = 0; it.vy = 0; it.sa = rnd(0, TAU); });
    a.dis = { sol: key, t: 0, items, done: false };
    SW.forEach((p) => { const th = rnd(0, TAU); p.vx = Math.cos(th) * 26; p.vy = Math.sin(th) * 26; });
    updateCtl();
  }
  function stepSol(dt) {
    const a = S.ap, tk = solLayout().tank, c = solCrystal(), dis = a.dis;
    const oil = a.sol === 'oil' && dis;
    const oilR = { x: tk.x + tk.w / 2, y: tk.y + 84, rx: 74, ry: 22 };
    SW.forEach((p) => {
      if (!p.init) { p.x = rnd(tk.x + 16, tk.x + tk.w - 16); p.y = rnd(tk.y + 70, tk.y + tk.h - 16); p.vx = 20; p.vy = 12; p.init = true; }
      p.vx += rnd(-1, 1) * 160 * dt; p.vy += rnd(-1, 1) * 160 * dt;
      const sp = Math.hypot(p.vx, p.vy) || 1, want = 28; p.vx *= want / sp; p.vy *= want / sp;
      p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.spin * dt;
      if (p.x < tk.x + 12) { p.x = tk.x + 12; p.vx = Math.abs(p.vx); } else if (p.x > tk.x + tk.w - 12) { p.x = tk.x + tk.w - 12; p.vx = -Math.abs(p.vx); }
      if (p.y < tk.y + 62) { p.y = tk.y + 62; p.vy = Math.abs(p.vy); } else if (p.y > tk.y + tk.h - 12) { p.y = tk.y + tk.h - 12; p.vy = -Math.abs(p.vy); }
      const cr = !dis || dis.items.some((it) => !it.out) || a.sol === 'oil';
      if (cr && a.sol !== 'oil' && p.x < c.x + c.w + 10 && p.y > c.y - 10 && p.x > c.x - 10) { if (p.x - c.x < c.w / 2) { p.x = c.x - 12; p.vx = -Math.abs(p.vx); } else { p.x = c.x + c.w + 12; p.vx = Math.abs(p.vx); } if (p.y > c.y + c.h + 4) p.y = c.y + c.h + 4; }
      if (a.sol === 'oil') { const dx = (p.x - oilR.x) / (oilR.rx + 12), dy = (p.y - oilR.y) / (oilR.ry + 12); if (dx * dx + dy * dy < 1) { if (dy > 0 || Math.abs(dx) > 0.7) { p.y = oilR.y + (oilR.ry + 12) * Math.max(0.2, Math.sqrt(Math.max(0, 1 - dx * dx))) + 1; p.vy = Math.abs(p.vy); } else { p.y = oilR.y - (oilR.ry + 12) * Math.sqrt(Math.max(0, 1 - dx * dx)) - 1; p.vy = -Math.abs(p.vy); } } }
    });
    if (!dis) return;
    dis.t += dt;
    const frac = clamp((dis.t - 0.4) / 5.5, 0, 1);
    dis.items.forEach((it) => {
      if (!it.out && frac >= it.th) { it.out = true; it.t = 0; const th = rnd(-1.0, 0.3); it.vx = Math.cos(th) * 34; it.vy = Math.sin(th) * 34 - 6; }
      if (it.out) {
        it.t += dt; it.vx += rnd(-1, 1) * 90 * dt; it.vy += rnd(-1, 1) * 90 * dt;
        dis.items.forEach((o2) => { if (o2 !== it && o2.out) { const dx = it.x - o2.x, dy = it.y - o2.y, d = Math.hypot(dx, dy) || 1; if (d < 92) { const f = (92 - d) * 5; it.vx += dx / d * f * dt; it.vy += dy / d * f * dt; } } });
        { const cx2 = c.x + c.w / 2, cy2 = c.y + c.h / 2, dx = it.x - cx2, dy = it.y - cy2, d = Math.hypot(dx, dy) || 1; if (dis.items.some((q) => !q.out) && d < 120) { const f = (120 - d) * 4; it.vx += dx / d * f * dt; it.vy += dy / d * f * dt; } }
        const sp = Math.hypot(it.vx, it.vy) || 1, want = a.sol === 'sug' ? 26 : 32; it.vx *= want / sp; it.vy *= want / sp;
        it.x += it.vx * dt; it.y += it.vy * dt;
        const pad = 46;
        if (it.x < tk.x + pad) { it.x = tk.x + pad; it.vx = Math.abs(it.vx); } else if (it.x > tk.x + tk.w - pad) { it.x = tk.x + tk.w - pad; it.vx = -Math.abs(it.vx); }
        if (it.y < tk.y + 70 + pad * 0.6) { it.y = tk.y + 70 + pad * 0.6; it.vy = Math.abs(it.vy); } else if (it.y > tk.y + tk.h - pad) { it.y = tk.y + tk.h - pad; it.vy = -Math.abs(it.vy); }
        it.sa += dt * 0.5;
      }
    });
    if (a.sol !== 'oil' && dis.items.every((it) => it.out && it.t > 1.1) && !dis.done) { dis.done = true; a.solSeen[a.sol] = true; }
    if (a.sol === 'oil' && dis.t > 4 && !dis.done) { dis.done = true; a.solSeen.oil = true; }
  }
  function drawSol(t) {
    const F = RC.F, a = S.ap, lay = solLayout(), tk = lay.tank, c = solCrystal(), dis = a.dis, key = a.sol;
    panel(F.x, F.y, F.w, F.h, 14);
    T(F.x + 14, F.y + 26, '🧂 물에 넣은 물질의 입자 모형', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    D.roundRect(tk.x, tk.y, tk.w, tk.h, 12); ctx.fillStyle = '#f2f9ff'; ctx.fill();
    ctx.save(); D.roundRect(tk.x, tk.y + 52, tk.w, tk.h - 52, 12); ctx.clip();
    const lg = ctx.createLinearGradient(0, tk.y + 52, 0, tk.y + tk.h); lg.addColorStop(0, 'rgba(125,190,255,.35)'); lg.addColorStop(1, 'rgba(70,140,230,.35)'); ctx.fillStyle = lg; ctx.fillRect(tk.x, tk.y + 52, tk.w, tk.h - 52); ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; D.roundRect(tk.x, tk.y, tk.w, tk.h, 12); ctx.stroke();
    D.label(tk.x + tk.w - 10, tk.y + tk.h - 16, '물 (일부 분자만 그렸어요)', { size: 12, bg: '#475569', align: 'right' });
    // 물 분자 사이의 수소 결합
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1.6;
    for (let i = 0; i < SW.length; i++) for (let j = i + 1; j < SW.length; j++) { const dx = SW[i].x - SW[j].x, dy = SW[i].y - SW[j].y; if (dx * dx + dy * dy < 30 * 30) { ctx.strokeStyle = 'rgba(226,70,75,.38)'; ctx.beginPath(); ctx.moveTo(SW[i].x, SW[i].y); ctx.lineTo(SW[j].x, SW[j].y); ctx.stroke(); } }
    ctx.setLineDash([]);
    SW.forEach((p) => miniWater(p.x, p.y, p.ang, 1.15, 1));
    // 결정
    const drawIon = (it, x, y) => {
      if (key === 'nacl') D.sphere(x, y, it.cat ? 9.5 : 12.5, it.cat ? '#7d93b8' : '#3fae6b', { gloss: true, text: it.cat ? '+' : '−', textScale: 1.0 });
      else { D.sphere(x, y, 13, '#f472b6', { gloss: true }); [[-6, -4], [6, -5], [0, 7]].forEach(([dx, dy]) => D.sphere(x + dx, y + dy, 3.4, '#f8fafc', { gloss: false })); }
    };
    if (key !== 'oil') {
      if (!dis) { const items = []; if (key === 'nacl') for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) items.push({ x: c.x + 17 + q * 28, y: c.y + 15 + r * 30, cat: (r + q) % 2 === 0 }); else for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) items.push({ x: c.x + 20 + q * 39, y: c.y + 24 + r * 42, cat: false }); items.forEach((it) => drawIon(it, it.x, it.y)); }
      else dis.items.forEach((it) => { if (!it.out) drawIon(it, it.x, it.y); });
      if (!dis || dis.items.some((it) => !it.out)) T(c.x + c.w / 2, c.y + c.h + 18, key === 'nacl' ? '소금 결정' : '설탕 결정', 12.5, MUTED, 'center', 800);
    } else {
      const ox = tk.x + tk.w / 2, oy = tk.y + 84;
      if (dis) { const g = ctx.createRadialGradient(ox - 20, oy - 8, 4, ox, oy, 80); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#d99a09'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ox, oy, 74, 22, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke(); T(ox, oy + 5, '기름 방울', 13, '#7c4a03', 'center', 800); }
      else { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.ellipse(tk.x + tk.w / 2, tk.y + 26, 54, 16, 0, 0, TAU); ctx.fill(); T(tk.x + tk.w / 2, tk.y + 31, '기름', 13, '#7c4a03', 'center', 800); }
    }
    // 녹은 입자와 물 껍질
    if (dis && key !== 'oil') dis.items.forEach((it, idx) => {
      if (!it.out) return;
      const e = sm(it.t / 1.0);
      if (key === 'nacl') { ctx.fillStyle = C.rgba(it.cat ? BLU : BAD, 0.10 * e); ctx.beginPath(); ctx.arc(it.x, it.y, (it.cat ? 38 : 44) * (0.6 + 0.4 * e), 0, TAU); ctx.fill(); }
      drawIon(it, it.x, it.y);
      const n = key === 'nacl' ? (it.cat ? 4 : 5) : 6, R = (key === 'nacl' ? (it.cat ? 29 : 34) : 40) * (0.55 + 0.45 * e) + (1 - e) * 10;
      for (let k = 0; k < n; k++) {
        const th = it.sa + k * TAU / n, wx = it.x + Math.cos(th) * R, wy = it.y + Math.sin(th) * R;
        if (key === 'nacl') {
          ctx.strokeStyle = C.rgba(it.cat ? BLU : BAD, 0.7 * e); ctx.lineWidth = 1.8; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(it.x + Math.cos(th) * 14, it.y + Math.sin(th) * 14); ctx.lineTo(wx - Math.cos(th) * 8, wy - Math.sin(th) * 8); ctx.setLineDash([]); ctx.stroke();
          miniWater(wx, wy, it.cat ? th : th + Math.PI, 1.25, e);
        }
        else {
          ctx.strokeStyle = C.rgba(BAD, 0.75 * e); ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(it.x + Math.cos(th) * 14, it.y + Math.sin(th) * 14); ctx.lineTo(wx - Math.cos(th) * 7, wy - Math.sin(th) * 7); ctx.stroke(); ctx.setLineDash([]);
          miniWater(wx, wy, th + Math.PI + (k % 2 ? 0.5 : -0.5), 1.05, e);
        }
      }
    });
    // 안내 글
    const ip = lay.info;
    D.roundRect(ip.x, ip.y, ip.w, ip.h, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(ip.x + 12, ip.y + 26, SOLS[key].nm, 14.5, INK, 'left', 800);
    let y = ip.y + 52;
    const body = key === 'nacl' ? ['이온 결합 물질이에요. 물 분자는 극성이라 O 쪽은 δ−, H 쪽은 δ+예요.', '양이온(Na⁺)은 물 분자의 O(δ−) 쪽이, 음이온(Cl⁻)은 H(δ+) 쪽이 둘러싸며 끌어당겨요(수화).', '그래서 결정에서 떨어져 나와 물속에 퍼져요.']
      : key === 'sug' ? ['설탕은 이온이 아니라 극성 분자예요.', '설탕 분자의 –OH가 물 분자와 수소 결합(빨간 점선)을 만들어 물에 잘 녹아요.', '녹아도 분자 그대로 퍼져요(이온으로 나뉘지 않아요).']
        : ['기름은 무극성 분자라서 물 분자와 끌어당기는 힘이 약해요.', '물 분자들은 서로 수소 결합을 하는 쪽이 더 안정해서 기름을 밀어내요.', '그래서 섞이지 않고 위에 떠요. (닮은 것끼리 녹는다)'];
    body.forEach((s, i) => { y += textBlock(ip.x + 12, y, ip.w - 24, (i + 1) + '. ' + s, PHONE ? 13.5 : 13.5, i === 2 ? GOOD : INK, 19, 700) + 8; });
    const prog = dis ? (key === 'oil' ? clamp(dis.t / 4, 0, 1) : dis.items.filter((it) => it.out).length / dis.items.length) : 0;
    if (dis) {
      D.roundRect(ip.x + 12, ip.y + ip.h - 40, ip.w - 24, 14, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(ip.x + 12, ip.y + ip.h - 40, ip.w - 24, 14, 7); ctx.clip(); ctx.fillStyle = key === 'oil' ? '#f59e0b' : SKY; ctx.fillRect(ip.x + 12, ip.y + ip.h - 40, (ip.w - 24) * prog, 14); ctx.restore();
      T(ip.x + 12, ip.y + ip.h - 12, key === 'oil' ? (dis.done ? '녹지 않고 그대로예요' : '관찰 중...') : (dis.done ? '모두 녹았어요' : '녹는 중... ' + Math.round(prog * 100) + ' %'), 12.5, dis.done ? GOOD : MUTED, 'left', 800);
    }
  }

  /* --- 사례 카드 분류 --- */
  const CBIN = [
    { nm: '큰 비열', sub: '열 저장 · 온도 안정', col: '#f97316' },
    { nm: '큰 증발열', sub: '증발에 열이 많이 필요', col: '#06b6d4' },
    { nm: '표면 장력 · 모세관', sub: '표면이 팽팽 · 관을 올라요', col: '#8b5cf6' },
    { nm: '얼음의 낮은 밀도', sub: '얼음이 물에 떠요', col: '#0ea5e9' },
    { nm: '뛰어난 용매', sub: '극성 · 이온 물질을 녹여요', col: '#16a34a' },
  ];
  const CDEF = [
    { t: '🌊 바다는 기후를 완충해요', ans: 0 },
    { t: '😓 땀이 증발하면 시원해요', ans: 1 },
    { t: '🌱 식물 줄기로 물이 올라가요', ans: 2 },
    { t: '🚰 겨울에 수도관이 터져요', ans: 3 },
    { t: '🏖️ 해변은 낮밤 기온차가 작아요', ans: 0 },
    { t: '💊 약이 물에 녹아 몸에 퍼져요', ans: 4 },
  ];
  function cardsInit() {
    const a = S.ap; a.sel = -1; a.drag = null; a.seq = 0;
    a.cards = CDEF.map((d, i) => ({ id: i, t: d.t, ans: d.ans, bin: -1, seq: 0, x: 0, y: 0, w: 0, h: 0, flag: false, shake: 0, init: false }));
  }
  function cardsGeo() {
    const F = RC.F, bins = [], slots = [];
    if (PHONE) {
      const bw = (F.w - 16 - 8) / 2, bh = 150;
      for (let i = 0; i < 5; i++) bins.push({ x: F.x + 8 + (i % 2) * (bw + 8), y: F.y + 44 + Math.floor(i / 2) * (bh + 8), w: bw, h: bh });
      const ty = F.y + 44 + 3 * (bh + 8) + 34, cw = bw;
      for (let i = 0; i < 6; i++) slots.push({ x: F.x + 8 + (i % 2) * (cw + 8), y: ty + Math.floor(i / 2) * 66, w: cw, h: 58 });
      return { bins, slots, trayY: ty - 12, chipH: 46 };
    }
    const bw = (F.w - 28 - 4 * 8) / 5, bh = 236;
    for (let i = 0; i < 5; i++) bins.push({ x: F.x + 14 + i * (bw + 8), y: F.y + 44, w: bw, h: bh });
    const ty = F.y + 44 + bh + 40, cw = (F.w - 28 - 2 * 10) / 3;
    for (let i = 0; i < 6; i++) slots.push({ x: F.x + 14 + (i % 3) * (cw + 10), y: ty + Math.floor(i / 3) * 66, w: cw, h: 58 });
    return { bins, slots, trayY: ty - 14, chipH: 50 };
  }
  function cardTarget(c, G) {
    if (S.ap.drag && S.ap.drag.i === c.id && S.ap.drag.moved) return { x: S.ap.drag.px - S.ap.drag.ox, y: S.ap.drag.py - S.ap.drag.oy, w: c.w || 150, h: c.h || 50, lift: 1 };
    if (c.bin < 0) { const s = G.slots[c.id]; return { x: s.x, y: s.y, w: s.w, h: s.h, lift: 0 }; }
    const b = G.bins[c.bin], mates = S.ap.cards.filter((q) => q.bin === c.bin).sort((p, q) => p.seq - q.seq), k = mates.indexOf(c);
    const hd = PHONE ? 46 : 66, top = b.y + hd, avail = b.h - hd - 6, sp = mates.length > 1 ? Math.min(G.chipH + 4, (avail - G.chipH) / (mates.length - 1)) : 0;
    return { x: b.x + 6, y: top + k * sp, w: b.w - 12, h: G.chipH, lift: 0 };
  }
  function stepCards(dt) {
    const a = S.ap; if (!a.cards) return; const G = cardsGeo();
    a.cards.forEach((c) => {
      const tg = cardTarget(c, G);
      if (!c.init) { c.x = tg.x; c.y = tg.y; c.w = tg.w; c.h = tg.h; c.init = true; }
      const dragging = a.drag && a.drag.i === c.id && a.drag.moved, r = dragging ? 40 : 14;
      c.x = SciSim.approach(c.x, tg.x, dt, r); c.y = SciSim.approach(c.y, tg.y, dt, r); c.w = SciSim.approach(c.w, tg.w, dt, 14); c.h = SciSim.approach(c.h, tg.h, dt, 14);
      c.lift = SciSim.approach(c.lift || 0, tg.lift || (a.sel === c.id ? 0.6 : 0), dt, 14);
      c.shake = Math.max(0, c.shake - dt * 2.5);
    });
  }
  function cardRect(c) { return { x: c.x, y: c.y, w: c.w, h: c.h }; }
  function drawCards(t) {
    const F = RC.F, a = S.ap, G = cardsGeo();
    panel(F.x, F.y, F.w, F.h, 14);
    T(F.x + 14, F.y + 26, '🗂️ 일상 사례를 원인이 되는 물의 성질에 연결해요', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    G.bins.forEach((b, i) => {
      const hot = a.sel >= 0 || (a.drag && a.drag.moved);
      D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = C.rgba(CBIN[i].col, hot ? 0.13 : 0.07); ctx.fill(); ctx.strokeStyle = C.rgba(CBIN[i].col, hot ? 0.9 : 0.55); ctx.lineWidth = hot ? 2.4 : 1.8; ctx.setLineDash(hot ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
      T(b.x + b.w / 2, b.y + 20, CBIN[i].nm, PHONE ? 14 : 13.5, C.shade(CBIN[i].col, -0.25), 'center', 800);
      textBlock(b.x + b.w / 2, b.y + 36, b.w - 12, CBIN[i].sub, 11.5, MUTED, 14, 700, 'center');
    });
    T(F.x + 16, G.trayY + 4, '사례 카드', 13.5, MUTED, 'left', 800);
    G.slots.forEach((s) => { D.roundRect(s.x, s.y, s.w, s.h, 10); ctx.strokeStyle = '#d0d8e6'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); });
    const order = a.cards.slice().sort((p, q) => ((a.drag && a.drag.i === p.id) - (a.drag && a.drag.i === q.id)) || (p.lift || 0) - (q.lift || 0));
    order.forEach((c) => {
      const lift = c.lift || 0, sx = c.shake > 0 ? Math.sin(c.shake * 30) * 4 * c.shake : 0;
      ctx.save(); ctx.translate(c.x + sx + c.w / 2, c.y + c.h / 2 - lift * 4); ctx.scale(1 + lift * 0.04, 1 + lift * 0.04);
      D.shadow(() => { D.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4 + lift * 10, y: 2 + lift * 4 });
      ctx.strokeStyle = c.flag ? BAD : a.sel === c.id ? BLU : '#cfd8e8'; ctx.lineWidth = c.flag || a.sel === c.id ? 3 : 1.5; D.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10); ctx.stroke();
      const lines = wrap(c.t, c.w - 16, 12.5, 800);
      lines.slice(0, 3).forEach((ln, k) => T(0, -((Math.min(lines.length, 3) - 1) * 8.5) + k * 17 + 4, ln, 12.5, INK, 'center', 800));
      ctx.restore();
    });
    const un = a.cards.filter((c) => c.bin < 0).length;
    T(F.x + F.w - 16, G.trayY + 4, un ? '아직 ' + un + '장이 남았어요' : '모두 분류했어요 · 확인하기를 눌러요', 13, un ? MUTED : GOOD, 'right', 800);
  }
  function cardsAt(p) {
    const a = S.ap; if (!a.cards) return null;
    const order = a.cards.slice().sort((x, y) => (y.lift || 0) - (x.lift || 0)).reverse();
    for (let k = order.length - 1; k >= 0; k--) { const c = order[k]; if (inRect(p, cardRect(c))) return c; }
    return null;
  }
  function binAt(p) { const G = cardsGeo(); return G.bins.findIndex((b) => inRect(p, b)); }
  function cardAssign(c, bi) {
    const a = S.ap; c.bin = bi; c.flag = false; c.seq = ++a.seq; Sound.tick();
    if (bi >= 0) { const G = cardsGeo(), b = G.bins[bi]; parts.burst(b.x + b.w / 2, b.y + 30, { count: 6, speed: 70, life: 0.4, size: 3, colors: [CBIN[bi].col] }); }
  }
  const cardsPlaced = () => S.ap.cards.filter((c) => c.bin >= 0).length;

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      const ok = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const sb = n.getAttribute('data-sub'); let ok2 = true;
      if (sb) { const [m, v] = sb.split(':'); ok2 = S.sub[m] === v; }
      n.hidden = !(ok && ok2);
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const on = (sel, f) => $$(sel).forEach((b) => b.classList.toggle('on', f(b.dataset.v)));
    on('#bpSub button', (v) => S.sub.bp === v); on('#trProp button', (v) => S.bp.prop === v);
    on('#dnSub button', (v) => S.sub.dens === v); on('#apSub button', (v) => S.sub.apply === v);
    on('#sfLiq button', (v) => S.ap.liq === v); on('#svSol button', (v) => S.ap.sol === v);
    const b = S.bp;
    $('#bBreak').disabled = hbCount() === 0;
    $('#bHeat').textContent = b.ended ? '↺ 다시 가열' : b.run ? '⏸ 멈춤' : b.tm > 0 ? '🔥 계속 가열' : '🔥 가열 시작';
    $('#bFast').setAttribute('aria-pressed', b.fast ? 'true' : 'false');
    const d = S.dens;
    $('#oDT').textContent = sgn(d.T) + ' °C'; $('#sDT').value = d.T; $('#dtMinus').disabled = d.T <= -10; $('#dtPlus').disabled = d.T >= 10;
    $('#bPhase').disabled = d.T !== 0; $('#bPhase').textContent = d.T === 0 ? (d.frozen ? '💧 얼음을 녹이기 (0 °C 물)' : '🧊 물을 얼리기 (0 °C 얼음)') : '🧊 얼음 ↔ 💧 물 (0 °C에서 바꿔요)';
    $('#oLT').textContent = sgn(d.Ta) + ' °C'; $('#sLT').value = d.Ta; $('#ltMinus').disabled = d.Ta <= -10; $('#ltPlus').disabled = d.Ta >= 10;
    const a = S.ap;
    $('#oQ').textContent = a.Q + ' J'; $('#sQ').value = a.Q; $('#qMinus').disabled = a.Q <= 0; $('#qPlus').disabled = a.Q >= 1000;
    $('#bDrop').textContent = a.drop && a.drop.liq === a.liq ? '↺ 다시 올려 보기' : '📎 올려 보기';
    $('#bDis').textContent = a.dis && a.dis.sol === a.sol ? '↺ 다시 넣기' : '💧 물에 넣기';
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  function setSub(m, v) { S.sub[m] = v; if (m === 'apply' && v === 'solv' && !S.ap.dis) solReset(); updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#bpSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('bp', b.dataset.v); }));
  $$('#trProp button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.bp.prop = b.dataset.v; updateCtl(); }));
  $$('#dnSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('dens', b.dataset.v); }));
  $$('#apSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('apply', b.dataset.v); }));
  $$('#sfLiq button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.liq = b.dataset.v; S.ap.drop = null; updateCtl(); }));
  $$('#svSol button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.sol = b.dataset.v; S.ap.dis = null; solReset(); updateCtl(); }));
  $('#bBreak').addEventListener('click', () => { Sound.click(); const h = S.hb; h.on = [false, false, false, false]; h.doneT = 0; h.burstDone = false; h.sel = ''; updateCtl(); });
  function bpHeatReset() { const b = S.bp; b.tm = 0; b.run = false; b.ended = false; BOX.h2o = makeBox('h2o'); BOX.h2s = makeBox('h2s'); updateCtl(); }
  $('#bHeat').addEventListener('click', () => { Sound.click(); const b = S.bp; if (b.ended) { bpHeatReset(); b.run = true; } else b.run = !b.run; updateCtl(); });
  $('#bFast').addEventListener('click', () => { Sound.click(); S.bp.fast = !S.bp.fast; updateCtl(); });
  $('#sDT').addEventListener('input', (e) => setDT(+e.target.value));
  $('#dtMinus').addEventListener('click', () => { Sound.tick(); setDT(S.dens.T - 1); });
  $('#dtPlus').addEventListener('click', () => { Sound.tick(); setDT(S.dens.T + 1); });
  $('#bPhase').addEventListener('click', () => { Sound.click(); if (S.dens.T === 0) { S.dens.frozen = !S.dens.frozen; updateCtl(); } });
  $('#sLT').addEventListener('input', (e) => setLT(+e.target.value));
  $('#ltMinus').addEventListener('click', () => { Sound.tick(); setLT(S.dens.Ta - 1); });
  $('#ltPlus').addEventListener('click', () => { Sound.tick(); setLT(S.dens.Ta + 1); });
  const setQ = (v) => { S.ap.Q = clamp(Math.round(v / 50) * 50, 0, 1000); updateCtl(); };
  $('#sQ').addEventListener('input', (e) => setQ(+e.target.value));
  $('#qMinus').addEventListener('click', () => { Sound.tick(); setQ(S.ap.Q - 50); });
  $('#qPlus').addEventListener('click', () => { Sound.tick(); setQ(S.ap.Q + 50); });
  $('#bDrop').addEventListener('click', () => { Sound.click(); dropStart(); });
  $('#bDis').addEventListener('click', () => { Sound.click(); S.ap.dis = null; solReset(); solStart(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'hb') { hbReset(); }
    else if (S.mode === 'bp') { if (S.sub.bp === 'trend') { S.bp.tap = -1; S.bp.found = false; S.bp.fprog = 0; } else bpHeatReset(); }
    else if (S.mode === 'dens') { if (S.sub.dens === 'mol') setDT(-5); else { S.dens.Ta = 10; } }
    else {
      const a = S.ap;
      if (S.sub.apply === 'heat') { a.Q = 0; }
      else if (S.sub.apply === 'surf') { a.drop = null; }
      else if (S.sub.apply === 'solv') { solReset(); }
      else cardsInit();
    }
    updateCtl();
  });

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'hb') {
        const h = hbHit(p); if (!h) return false;
        if (h.t === 'site') hbToggle(h.i); else { S.hb.sel = h.t === 'cov' ? 'cov' : 'hb'; Sound.tick(); }
        return true;
      }
      if (S.mode === 'bp' && S.sub.bp === 'trend') { const r = trRect(); return inRect(p, { x: r.x - 34, y: r.y - 34, w: r.w + 68, h: r.h + 50 }) ? bpTap(p) : false; }
      if (S.mode === 'apply' && S.sub.apply === 'cards') {
        const a = S.ap, c = cardsAt(p);
        if (c) { a.drag = { i: c.id, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false, was: a.sel === c.id }; a.sel = c.id; return true; }
        const bi = binAt(p);
        if (bi >= 0 && a.sel >= 0) { cardAssign(a.cards[a.sel], bi); a.sel = -1; return true; }
        a.sel = -1; return false;
      }
      return false;
    },
    move(p) { const dg = S.ap.drag; if (dg) { dg.px = p.x; dg.py = p.y; if (Math.hypot(p.x - dg.sx, p.y - dg.sy) > 7) dg.moved = true; } },
    up(p) {
      const a = S.ap, dg = a.drag; if (!dg) return;
      const c = a.cards[dg.i];
      if (dg.moved) { cardAssign(c, binAt(p)); a.sel = -1; }
      else if (dg.was) a.sel = -1;
      a.drag = null;
    },
    hover(p) {
      if (S.mode === 'hb') return hbHit(p) ? 'pointer' : null;
      if (S.mode === 'apply' && S.sub.apply === 'cards') return cardsAt(p) ? 'grab' : null;
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'hb') { const h = S.hb; L1 = '수소 결합'; a = hbCount() + ' / 4개'; L2 = '눌러 본 결합'; b = h.sel === 'cov' ? 'O–H 공유 결합' : h.sel === 'hb' ? '수소 결합' : '—'; L3 = '결합 에너지(대략)'; c = h.sel === 'cov' ? '463 kJ/mol' : h.sel === 'hb' ? '20 kJ/mol' : '—'; }
    else if (S.mode === 'bp' && S.sub.bp === 'trend') {
      const bb = S.bp, k = bb.prop, h = bb.tap >= 0 ? HYD[bb.tap] : null; L1 = '선택한 분자'; a = h ? h.nm + ' (' + h.M + ')' : '—'; L2 = k === 'bp' ? '끓는점' : '녹는점'; b = h ? sgn(h[k]) + ' °C' : '—';
      L3 = '추세선과의 차'; c = h ? ((h[k] - FIT[k].at(h.M)) >= 0 ? '+' : '−') + Math.abs(Math.round(h[k] - FIT[k].at(h.M))) + ' °C' : '—';
    }
    else if (S.mode === 'bp') { const bb = S.bp; L1 = 'H₂O 온도'; a = f1(evalSub(SUBST.h2o, bb.tm).T).replace('-', '−') + ' °C'; L2 = 'H₂S 온도'; b = f1(evalSub(SUBST.h2s, bb.tm).T).replace('-', '−') + ' °C'; L3 = '가열 시간'; c = f1(bb.tm) + ' s'; }
    else if (S.mode === 'dens' && S.sub.dens === 'mol') { const d = S.dens, rho = dRho(); L1 = '온도 · 상태'; a = sgn(d.T) + ' °C · ' + (d.frozen ? '얼음' : '물'); L2 = '1.00 g의 부피'; b = (1 / rho).toFixed(3) + ' cm³'; L3 = '밀도'; c = fRho(rho) + ' g/cm³'; }
    else if (S.mode === 'dens') { const d = S.dens, tp = lakeTemps(d.Tad); L1 = '기온'; a = fT(d.Tad) + ' °C'; L2 = '바닥 물 온도'; b = fT(tp[4]) + ' °C'; L3 = '표면 얼음'; c = d.Tad < -0.05 ? '있음 (물 위에 떠요)' : '없음'; }
    else if (S.sub.apply === 'heat') { const q = S.ap.Qd; L1 = '공급한 열'; a = S.ap.Q + ' J'; L2 = '온도 상승 (물 · 에탄올 · 철)'; b = MAT.map((m) => '+' + f1(dTof(m, q))).join(' · ') + ' °C'; L3 = '비열이 큰 순서'; c = '물 > 에탄올 > 철'; }
    else if (S.sub.apply === 'surf') { const A = S.ap, dp = A.drop && A.drop.liq === A.liq ? A.drop : null; L1 = '액체'; a = LIQS[A.liq].nm; L2 = '표면 장력'; b = LIQS[A.liq].gam + ' mN/m'; L3 = '클립'; c = !dp ? '—' : dp.items[0].sunk ? '가라앉음' : dp.items[0].hit ? '떠 있음' : '떨어지는 중'; }
    else if (S.sub.apply === 'solv') { const A = S.ap; L1 = '넣은 물질'; a = SOLS[A.sol].nm; L2 = '결과'; b = !A.dis ? '—' : A.sol === 'oil' ? (A.dis.done ? '녹지 않음' : '관찰 중') : A.dis.done ? '물에 녹음' : '녹는 중'; L3 = '물 분자 쪽'; c = A.sol === 'nacl' ? 'O(δ−)→Na⁺, H(δ+)→Cl⁻' : A.sol === 'sug' ? '–OH와 수소 결합' : '끌어당김 약함'; }
    else { L1 = '분류한 카드'; a = cardsPlaced() + ' / 6장'; L2 = '남은 카드'; b = (6 - cardsPlaced()) + '장'; L3 = '선택한 카드'; c = S.ap.sel >= 0 ? S.ap.cards[S.ap.sel].t : '—'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const hbStatus = () => '수소 결합 ' + hbCount() + ' / 4 ' + mark(hbCount() === 4);
  const densLake = () => S.dens.Ta <= -5 && Math.abs(S.dens.Tad - S.dens.Ta) < 0.1;
  const solAll = () => S.ap.solSeen.nacl && S.ap.solSeen.sug && S.ap.solSeen.oil;
  const surfAll = () => S.ap.surfSeen.water && S.ap.surfSeen.eth;
  function cardsCheck() {
    const a = S.ap, un = a.cards.filter((c) => c.bin < 0).length;
    if (un) return '아직 상자에 넣지 않은 카드가 ' + un + '장 있어요.';
    const wr = a.cards.filter((c) => c.bin !== c.ans);
    if (wr.length) {
      wr.forEach((c) => { if (!c.flag) { c.flag = true; c.shake = 1; } });
      return wr.length + '장이 알맞지 않은 상자에 있어요. 빨간 테두리 카드를 다시 생각해 봐요. (열을 많이 저장? 증발할 때 열 흡수? 좁은 관을 오르는 물? 얼음이 뜨는 성질? 녹이는 성질?)';
    }
    return true;
  }
  const levels = [
    {
      title: '수소 결합: 물 분자의 이웃 만들기', short: '수소 결합', icon: '🔗', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 분자량이 작은 물이 왜 이렇게 특이한 액체일까?</p>' +
        '<div class="si-link">🔗 <b>일반선택 화학과 앞 단원에서</b> 수소 결합은 N·O·F에 결합한 H와 이웃 분자의 비공유 전자쌍 사이에 작용하는 분자 간 힘이라는 것을 배웠어요. 이번에는 물 분자 <b>한 개</b>가 이웃과 최대 몇 개의 수소 결합을 만들 수 있는지 살펴봐요.</div>' +
        '<p>물 분자(H₂O)는 H가 <b>2개</b>이고, O에는 비공유 전자쌍이 <b>2쌍</b> 있어요. 그래서 한 분자가 이웃 분자와 수소 결합을 최대 <b>4개</b>까지 만들 수 있어요. 점선 고리를 눌러 이웃을 이어 봐요.</p>',
      features: ['hb'],
      setup() { S.lock = false; setMode('hb'); },
      recap: '물 분자 한 개는 H 쪽 2개(주는 자리)와 비공유 전자쌍 쪽 2개(받는 자리)로 이웃과 최대 4개의 수소 결합을 만들어요. 수소 결합은 분자 사이의 힘이라 O–H 공유 결합보다 훨씬 약해요.',
      summary: '<ul><li><b>물 분자 한 개</b>: H 2개(수소 결합을 주는 쪽) + O의 비공유 전자쌍 2쌍(받는 쪽) → 이웃과 최대 <b>4개</b>의 수소 결합.</li><li><b>공유 결합</b>(O–H, 분자 안, 약 463 kJ/mol)과 <b>수소 결합</b>(분자 사이, 약 20 kJ/mol)은 완전히 달라요.</li><li>물이 끓거나 얼음이 녹을 때 끊어지는 것은 <b>수소 결합</b>이에요. H₂O 분자는 그대로예요.</li><li>이 수소 결합 그물 때문에 물은 분자량에 비해 끓는점이 높고, 얼음이 물에 뜨는 등 특이한 성질을 가져요.</li></ul>',
      missions: [
        {
          title: '수소 결합 4개 이어 보기',
          goal: '가운데 물 분자의 <b>H 쪽 자리 2개</b>와 <b>비공유 전자쌍 쪽 자리 2개</b>에 이웃 분자를 이어서 수소 결합 <b>4개</b>를 만들어요.',
          hint: '점선 고리(또는 떠 있는 이웃 분자)를 눌러요. 빨간 고리는 H가 주는 자리, 파란 고리는 전자쌍이 받는 자리예요. 잘못 눌렀다면 다시 눌러 끊을 수 있어요.',
          setup() { S.lock = true; hbReset(); setMode('hb'); },
          check: () => hbAll(), hold: 0.8,
          status: () => hbStatus(),
          explain: '물 분자의 H 2개는 이웃 O의 비공유 전자쌍을 향해 수소 결합을 <b>주고</b>(O–H···O), O의 비공유 전자쌍 2쌍은 이웃 H의 수소 결합을 <b>받아요</b>. 그래서 한 분자가 이웃 4개와 연결되어 그물 같은 구조를 만들어요. 점선(수소 결합)은 분자 사이, 실선(O–H 공유 결합)은 분자 안이에요.',
        },
        {
          type: 'quiz', title: '물이 끓을 때 끊어지는 것은?',
          goal: '물이 끓어 수증기가 될 때 일어나는 일로 옳은 것은?',
          setup() { S.lock = true; S.hb.sel = 'cov'; setMode('hb'); },
          choices: ['H–O 공유 결합이 끊어져 수소와 산소 기체가 돼요', '분자 사이의 수소 결합이 끊어지고, H₂O 분자는 그대로 떨어져 나가요', 'H–O 공유 결합과 수소 결합이 모두 끊어져요', '분자 사이의 힘이 없어지면서 물 분자가 사라져요'],
          answer: 1,
          feedback: ['수증기도 H₂O예요. 물을 끓일 때 수소 기체와 산소 기체가 나오지 않아요(그건 물의 전기 분해예요).', '', '공유 결합(약 463 kJ/mol)은 끓일 때 끊어지지 않아요. 끊어지는 것은 약 20 kJ/mol의 수소 결합이에요.', '분자는 사라지지 않아요. 분자 사이의 힘만 끊어져서 분자가 서로 멀어져요.'],
          explain: '물이 끓거나 얼음이 녹을 때 끊어지는 것은 분자 사이의 <b>수소 결합</b>이에요. H₂O 분자 안의 O–H 공유 결합은 그대로이므로 수증기도 H₂O예요.',
        },
      ],
    },
    {
      title: '끓는점·녹는점: 물은 왜 높을까?', short: '끓는점·녹는점', icon: '🌡️', phase: '관찰',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물 분자 하나가 이웃 4개와 수소 결합을 만든다는 것을 확인했어요. 분자 사이의 힘이 큰 물질은 분자를 떼어 내기 어려워 끓는점과 녹는점이 높아요. 정말 그런지 자료로 확인해요.</div>' +
        '<p>16족 원소의 수소 화합물(H₂O, H₂S, H₂Se, H₂Te)은 모양이 비슷해요. 분자량이 커질수록 끓는점이 올라가는 <b>추세</b>가 있는지 보고, 같은 불꽃으로 H₂O와 H₂S를 가열해서 비교해요.</p>',
      features: ['bp'],
      setup() { S.lock = false; setMode('bp'); },
      recap: '16족 수소 화합물 가운데 H₂O의 끓는점과 녹는점만 추세에서 크게 벗어나 높아요. 수소 결합을 끊어야 해서 같은 열을 줘도 훨씬 높은 온도에서 끓어요.',
      summary: '<ul><li>16족 수소 화합물의 끓는점: H₂O <b>100</b>, H₂S <b>−60</b>, H₂Se <b>−41</b>, H₂Te <b>−2</b> °C. 녹는점: <b>0, −86, −66, −49</b> °C.</li><li>H₂S–H₂Se–H₂Te는 분자량이 커질수록 분산력이 커져 끓는점이 올라요. 이 추세선을 H₂O(분자량 18)까지 늘이면 끓는점은 약 <b>−73 °C</b>예요.</li><li>실제 H₂O는 <b>100 °C</b>로 약 173 °C나 높아요. 분자 사이의 <b>수소 결합</b>이 있기 때문이에요.</li><li>가열 곡선의 수평 구간(끓는 중)에서는 가해 준 열이 분자 사이의 힘을 끊는 데 쓰여 온도가 변하지 않아요.</li></ul>',
      missions: [
        {
          title: '추세에서 벗어난 점 찾기',
          goal: '16족 수소 화합물의 끓는점 그래프에서 <b>추세선에서 크게 벗어난 점</b>을 눌러 찾아요.',
          hint: '분자량이 작은 쪽(왼쪽) 점을 눌러 봐요. 점선 추세선은 H₂S, H₂Se, H₂Te 세 점으로 그은 선이에요. 이 선을 왼쪽으로 늘였을 때 가장 많이 어긋나는 점이 답이에요.',
          setup() { S.lock = true; S.sub.bp = 'trend'; S.bp.prop = 'bp'; S.bp.found = false; S.bp.fprog = 0; S.bp.tap = -1; setMode('bp'); },
          check: () => S.bp.found, hold: 0.4,
          status: () => 'H₂O의 점 ' + mark(S.bp.found),
          explain: 'H₂S, H₂Se, H₂Te는 분자량이 클수록 분산력이 커서 끓는점이 일정하게 올라요. 이 추세선을 H₂O까지 늘이면 약 <b>−73 °C</b>지만 실제 H₂O의 끓는점은 <b>100 °C</b>예요. 약 173 °C 높은 까닭은 분자 사이의 수소 결합이에요(녹는점도 같은 경향).',
        },
        {
          title: '같은 불꽃으로 가열 비교',
          goal: '<b>🔥 가열 시작</b>을 눌러 H₂O와 H₂S 1 mol씩을 같은 불꽃으로 끝까지 가열하고, 두 물질이 끓는 온도(수평 구간)를 비교해요.',
          hint: '시간이 오래 걸리면 ⏩ 빠르게를 켜요. 온도 곡선이 평평해지는 구간이 끓는 구간이에요. 가열이 끝나면 완료돼요.',
          setup() { S.lock = true; S.sub.bp = 'heat'; bpHeatReset(); setMode('bp'); },
          check: () => S.bp.ended, hold: 0.3,
          status: () => '가열 ' + Math.round(S.bp.tm / T_END * 100) + ' % ' + mark(S.bp.ended),
          explain: 'H₂S는 <b>−60 °C</b>, H₂O는 <b>100 °C</b>에서 끓었어요(수평 구간). H₂O는 분자량이 더 작아도 분자 사이 수소 결합을 끊어야 하므로 훨씬 높은 온도까지 가열해야 해요. 끓을 때 끊어지는 것은 H–O 공유 결합이 아니라 분자 사이의 힘이에요.',
        },
        {
          type: 'quiz', title: '끓는점이 높은 근거',
          goal: '물의 끓는점이 높은 것이 <b>수소 결합</b> 때문이라는 가장 좋은 근거는?',
          setup() { S.lock = true; S.sub.bp = 'trend'; setMode('bp'); },
          choices: ['H₂O의 분자량이 H₂S보다 작은데도 끓는점이 훨씬 높아요', 'H₂O의 분자량이 H₂S보다 커서 분산력이 커요', 'H₂O에는 O–H 공유 결합이 있지만 H₂S에는 공유 결합이 없어요', 'H₂O를 더 오래 가열했기 때문이에요'],
          answer: 0,
          feedback: ['', 'H₂O의 분자량(18)은 H₂S(34)보다 작아요. 분산력만으로는 H₂O의 끓는점이 더 낮아야 해요.', 'H₂S에도 S–H 공유 결합이 있어요. 끓을 때 끊어지는 것은 공유 결합이 아니에요.', '끓는점은 가열 시간이 아니라 물질의 분자 사이 힘으로 정해져요.'],
          explain: '분자량이 작은 H₂O가 분산력만으로 설명되는 값(약 −73 °C)보다 훨씬 높은 100 °C에서 끓는다는 것은 <b>분산력 이외의 큰 힘</b>, 곧 수소 결합이 있다는 근거예요.',
        },
      ],
    },
    {
      title: '얼음의 밀도: 얼음은 왜 물에 뜰까?', short: '얼음의 밀도', icon: '🧊', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소 결합이 물의 끓는점을 크게 높인다는 것을 보았어요. 이 수소 결합은 물이 <b>얼 때</b>도 특별한 일을 해요.</div>' +
        '<p>대부분의 물질은 고체가 액체보다 밀도가 커요. 그런데 얼음은 물에 떠요. 온도 슬라이더로 같은 질량(1.00 g)의 얼음과 물의 <b>부피</b>를 비교하고, 호수 속 물의 층을 살펴봐요.</p>',
      features: ['dens'],
      setup() { S.lock = false; setMode('dens'); },
      recap: '얼음에서는 수소 결합 4개가 고정된 고리 구조라 빈 공간이 있어 밀도가 작고(0.917 g/cm³), 물은 4 °C에서 밀도가 가장 커요. 그래서 얼음은 물에 뜨고 호수는 위에서부터 얼어요.',
      summary: '<ul><li>물 1.00 g이 얼면 부피가 1.00 cm³ → 약 <b>1.09 cm³</b>(약 9 % 증가). 밀도: 얼음 <b>0.917</b>, 0 °C 물 <b>0.9998</b> g/cm³.</li><li>얼음은 분자마다 수소 결합 4개가 고정된 고리 모양이라 사이에 <b>빈 공간</b>이 있어요. 녹으면 일부 수소 결합이 끊겨 분자가 빈 공간으로 들어가 가까워져요.</li><li>물의 밀도는 <b>4 °C</b>에서 가장 커요(1.000 g/cm³).</li><li>겨울 호수: 얼음은 위에 뜨고 바닥에는 4 °C의 가장 무거운 물이 있어요. 그래서 호수 바닥의 생물이 살아남아요. 물이 얼면 부피가 늘어 수도관이 터질 수 있어요.</li></ul>',
      missions: [
        {
          title: '같은 질량, 다른 부피',
          goal: '온도 슬라이더로 <b>얼음</b>(0 °C 아래)과 <b>물</b>(0 °C 위)의 부피를 읽고, 물의 밀도가 가장 큰 <b>4 °C</b>도 찾아요.',
          hint: '−5 °C 얼음의 부피를 읽은 뒤 온도를 올려 물이 되게 해요. 물일 때 온도를 4 °C에 맞추면 밀도가 가장 커요.',
          setup() { S.lock = true; S.sub.dens = 'mol'; S.dens.seen = {}; setDT(-5); setMode('dens'); },
          check: () => !!(S.dens.seen.ice && S.dens.seen.water && S.dens.seen.max), hold: 0.4,
          status: () => '얼음 ' + mark(S.dens.seen.ice) + ' &nbsp; 물 ' + mark(S.dens.seen.water) + ' &nbsp; 4 °C 최대 밀도 ' + mark(S.dens.seen.max),
          explain: '물 1.00 g이 얼면 부피가 1.00 cm³에서 약 <b>1.09 cm³</b>로 약 9 % 늘어요(밀도 0.917 g/cm³). 얼음에서는 분자마다 수소 결합 4개가 고정된 육각 고리 구조가 만들어져 빈 공간이 생기기 때문이에요. 녹으면 수소 결합 일부가 끊겨 분자가 빈 공간으로 들어와 밀도가 커지고, 물은 <b>4 °C</b>에서 가장 무거워요.',
        },
        {
          title: '겨울 호수 만들기',
          goal: '기온을 <b>−5 °C 이하</b>로 낮춰서 <b>얼음이 위에 뜨고 바닥에는 4 °C 물이 남는</b> 호수를 만들어요.',
          hint: '🏞️ 호수 단면 화면에서 기온 슬라이더를 왼쪽으로 옮겨요. 기온이 4 °C 아래로 내려갈 때 층이 어떻게 달라지는지도 살펴봐요.',
          setup() { S.lock = true; S.sub.dens = 'lake'; S.dens.Ta = 10; setMode('dens'); },
          check: () => densLake(), hold: 0.8,
          status: () => '기온 ' + sgn(S.dens.Ta) + ' °C ' + mark(S.dens.Ta <= -5) + ' &nbsp; 표면 얼음 ' + mark(S.dens.Tad < -0.05),
          explain: '표면 물이 4 °C로 식는 동안은 무거워져 가라앉아 섞이지만, 4 °C보다 차가워지면 오히려 가벼워져 위에 머물러요. 그래서 호수는 표면부터 얼고, 얼음은 물보다 가벼워 위에 떠서 아래 물을 보호해요. 바닥에는 가장 무거운 <b>4 °C 물</b>이 있어 생물이 살아남아요.',
        },
        {
          type: 'quiz', title: '겨울 호수 속 생물',
          goal: '겨울에 호수 표면이 얼어도 바닥의 물고기가 살 수 있는 까닭은?',
          setup() { S.lock = true; S.sub.dens = 'lake'; setMode('dens'); },
          choices: ['얼음이 물보다 밀도가 작아 위에 뜨고, 그 아래 물(바닥은 4 °C)은 얼지 않기 때문이에요', '얼음이 물보다 밀도가 커서 바닥에 가라앉아 물고기를 보호하기 때문이에요', '물은 온도가 낮을수록 항상 밀도가 커서 가장 차가운 물이 바닥에 있기 때문이에요', '호수 바닥에서 열이 나와 물을 데우기 때문이에요'],
          answer: 0,
          feedback: ['', '얼음은 물보다 밀도가 작아서(0.917 g/cm³) 가라앉지 않고 물 위에 떠요.', '물은 4 °C에서 밀도가 가장 커요. 4 °C보다 더 차가워지면 밀도가 다시 작아져서 표면에 머물러요.', '바닥에서 나오는 열 때문이 아니에요. 물의 밀도가 4 °C에서 가장 크다는 성질 때문이에요.'],
          explain: '얼음이 물보다 가벼워 위에 뜨고, 물은 4 °C에서 밀도가 가장 커서 바닥에는 4 °C의 물이 남아요. 표면 얼음이 단열 역할도 해서 바닥 물은 얼지 않아요. (물이 얼 때 부피가 9 % 늘어 수도관이 터지는 것도 같은 성질 때문이에요.)',
        },
      ],
    },
    {
      title: '열·표면·용매: 물의 쓰임새', short: '열·표면·용매', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소 결합이 끓는점과 얼음의 밀도를 설명한다는 것을 확인했어요. 같은 수소 결합과 물의 극성은 <b>열, 표면, 녹이는 능력</b>에서도 나타나요.</div>' +
        '<p>세 실험대에서 ① 같은 열을 줬을 때 물·에탄올·철의 온도 변화(비열), ② 클립과 소금쟁이가 뜨는지(표면 장력), ③ 소금·설탕·기름이 녹는지(용매)를 확인하고, 일상 사례를 원인이 되는 성질에 연결해요.</p>',
      features: ['apply'],
      setup() { S.lock = false; setMode('apply'); if (S.sub.apply === 'solv' && !S.ap.dis) solReset(); },
      recap: '물은 수소 결합과 극성 때문에 비열과 증발열이 크고, 표면 장력이 크며, 이온 · 극성 물질을 잘 녹이는 용매예요.',
      summary: '<ul><li><b>큰 비열</b>: 물 4.18 J/(g·°C) &gt; 에탄올 2.44 &gt; 철 0.45. 같은 열 1000 J을 100 g에 주면 물 +2.4 °C, 에탄올 +4.1 °C, 철 +22 °C. → 바다가 기후를 완충해요.</li><li><b>큰 증발열</b>: 물 2257 J/g, 에탄올 약 840 J/g. 땀 100 g이 증발하면 약 226 kJ을 가져가 몸이 시원해져요.</li><li><b>큰 표면 장력</b>: 물 72, 에탄올 22 mN/m. 그래서 소금쟁이와 클립이 물 표면에 뜨고 가는 관에서 물이 올라가요(모세관 현상).</li><li><b>뛰어난 용매</b>: 극성인 물 분자의 δ−, δ+ 쪽이 이온과 극성 분자를 둘러싸요(수화). 무극성인 기름은 녹지 않아요.</li></ul>',
      missions: [
        {
          title: '세 실험대 확인하기',
          goal: '① <b>🔥 열</b>: 공급하는 열을 <b>1000 J</b>로 맞추기 ② <b>💧 표면</b>: 물과 에탄올에 각각 올려 보기 ③ <b>🧂 용매</b>: 소금 · 설탕 · 기름을 각각 물에 넣어 보기',
          hint: '위쪽 단추로 실험대를 바꿔요. 표면 실험대는 액체를 고르고 「올려 보기」를, 용매 실험대는 물질을 고르고 「물에 넣기」를 눌러요. 결과가 끝까지 나올 때까지 잠시 기다려요.',
          setup() { const a = S.ap; S.lock = true; a.Q = 0; a.Qd = 0; a.heatOK = false; a.surfSeen = {}; a.solSeen = {}; a.drop = null; a.dis = null; a.liq = 'water'; a.sol = 'nacl'; solReset(); S.sub.apply = 'heat'; setMode('apply'); },
          check: () => S.ap.heatOK && surfAll() && solAll(), hold: 0.4,
          status: () => '열 ' + mark(S.ap.heatOK) + ' &nbsp; 표면 ' + mark(surfAll()) + ' &nbsp; 용매 ' + mark(solAll()),
          explain: '같은 열 1000 J을 100 g에 주면 물은 +2.4 °C, 에탄올 +4.1 °C, 철 +22 °C가 올라 <b>비열이 큰 물은 온도가 잘 안 변해요</b>. 물은 수소 결합 덕분에 <b>표면 장력</b>이 커서(72 mN/m) 클립과 소금쟁이가 뜨지만, 에탄올(22)에서는 가라앉아요. 또 극성인 물 분자는 이온과 극성 분자를 둘러싸서 <b>녹이지만</b> 무극성인 기름은 녹이지 못해요.',
        },
        {
          title: '일상 사례 카드 분류하기', manual: true,
          goal: '사례 카드 6장을 원인이 되는 <b>물의 성질 상자</b>에 끌어 놓고(또는 카드와 상자를 차례로 눌러) <b>✔ 확인하기</b>를 눌러요.',
          hint: '바다·해변은 온도가 잘 안 변해요(비열). 땀은 증발할 때 열을 가져가요. 식물 줄기의 물은 좁은 관을 따라 올라가요. 수도관은 얼 때 부피가 늘어요. 약은 물에 녹아 퍼져요.',
          setup() { S.lock = true; S.sub.apply = 'cards'; cardsInit(); setMode('apply'); },
          check: () => cardsCheck(),
          status: () => '분류한 카드 ' + cardsPlaced() + ' / 6 ' + mark(cardsPlaced() === 6),
          explain: '<b>바다 · 해변</b>의 완충은 큰 <b>비열</b>, <b>땀</b>은 큰 <b>증발열</b>, <b>식물 줄기의 물</b>은 표면 장력과 <b>모세관 현상</b>, <b>수도관 동파</b>는 얼 때 부피가 늘어나는 <b>얼음의 낮은 밀도</b>, <b>약</b>은 물이 <b>용매</b>로 작용하는 예예요.',
        },
        {
          type: 'quiz', title: '바닷가와 사막',
          goal: '바닷가는 사막보다 하루 동안의 기온 변화가 작아요. 가장 알맞은 설명은?',
          setup() { S.lock = true; S.sub.apply = 'heat'; setMode('apply'); },
          choices: ['물은 비열이 커서 많은 열을 흡수하거나 내놓아도 온도가 조금만 변하기 때문이에요', '물은 비열이 작아서 열을 빨리 잃기 때문이에요', '물은 증발열이 작아서 쉽게 증발하기 때문이에요', '물은 표면 장력이 커서 열이 표면에 갇히기 때문이에요'],
          answer: 0,
          feedback: ['', '비열이 작으면 온도가 큰 폭으로 변해요. 물은 비열이 커요(4.18 J/(g·°C)).', '물의 증발열은 오히려 커요(2257 J/g). 그리고 기온 변화는 비열과 관련이 깊어요.', '표면 장력은 표면이 팽팽한 정도예요. 열을 저장하는 성질과는 달라요.'],
          explain: '물은 비열이 커서 같은 열을 흡수해도 온도가 조금만 올라가요. 그래서 바다는 낮에 천천히 데워지고 밤에 천천히 식어, 바닷가는 하루 기온 변화가 작아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-water-hbond', mount: '#game', badge: '물의 비밀 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { hb: '🔗 물 분자와 이웃 분자', bp: '🌡️ 16족 비교 · 가열 곡선', dens: '🧊 얼음의 밀도 · 호수 단면', apply: '🏠 열 · 표면 · 용매 실험대' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  cardsInit(); solReset(); S.dens.q = 0; S.dens.Vd = 1 / rhoIce(-5);
  setMode('hb');
  function stepAll1(dt) {
    const a = S.ap;
    a.Qd = SciSim.approach(a.Qd, a.Q, dt, 5); if (Math.abs(a.Qd - a.Q) < 0.5) a.Qd = a.Q;
    if (S.mode === 'apply' && S.sub.apply === 'heat' && a.Q >= 1000 && a.Qd >= 999.5) a.heatOK = true;
    stepHB(dt); stepBP(dt); stepDens(dt);
    if (S.mode === 'apply') {
      if (S.sub.apply === 'surf') { stepSurf(dt); stepCap(dt); }
      if (S.sub.apply === 'solv') stepSol(dt);
      if (S.sub.apply === 'cards') stepCards(dt);
    }
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'hb') { drawHB(t); drawHBInfo(t); }
    else if (S.mode === 'bp') { if (S.sub.bp === 'trend') { drawTrend(t); drawTrendInfo(RC.R, t); } else { drawHeat(t); drawHeatGraph(t); } }
    else if (S.mode === 'dens') { if (S.sub.dens === 'mol') { drawDensMol(t); drawDensGraphs(t); } else drawLake(t); }
    else { const s = S.sub.apply; if (s === 'heat') drawHeatBench(t); else if (s === 'surf') drawSurf(t); else if (s === 'solv') drawSol(t); else drawCards(t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, HYD, FIT, PRED, SUBST, BOX, MAT, CDEF, CBIN, T_END, evalSub, hbGeo, hbNeighbor, hbToggle, hbCount, hbAll, bpTap, trX, trY, trRect, setDT, setLT, dRho, setMode, setSub, dropStart, solStart, solReset, cardsInit, cardsGeo, cardAssign, lakeTemps, rhoWater, rhoIce, densLake, surfAll, solAll, setQ,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
