(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [];
    String(str).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((tok) => {
        const sep = line ? ' ' : '';
        if (ctx.measureText(line + sep + tok).width <= maxW) { line += sep + tok; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
        for (const ch of tok) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f0 = (v) => String(Math.round(v));
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- 파장 → 색 ---------- */
  const WLC = [];
  (function () {
    for (let i = 0; i <= 800; i++) {
      const l = 380 + i * 0.5;
      let r = 0, g = 0, b = 0;
      if (l < 440) { r = -(l - 440) / 60; b = 1; }
      else if (l < 490) { g = (l - 440) / 50; b = 1; }
      else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; }
      else if (l < 645) { r = 1; g = -(l - 645) / 65; }
      else { r = 1; }
      const f = l < 420 ? 0.45 + 0.55 * (l - 380) / 40 : l > 700 ? 0.45 + 0.55 * (780 - l) / 80 : 1;
      const gm = 0.8;
      WLC.push([Math.round(255 * Math.pow(Math.max(0, r) * f, gm)), Math.round(255 * Math.pow(Math.max(0, g) * f, gm)), Math.round(255 * Math.pow(Math.max(0, b) * f, gm))]);
    }
  })();
  const wl = (l) => WLC[clamp(Math.round((l - 380) * 2), 0, 800)];
  const wlHex = (l, a) => { const c = wl(l); return a == null ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const rgbHex = (c) => '#' + c.map((v) => ('0' + v.toString(16)).slice(-2)).join('');
  const wlSolid = (l) => rgbHex(wl(l));

  /* ---------- 캔버스 버튼 · 포인터 ---------- */
  const HITS = [];
  const DRAG = { down: null, move: null, up: null, hover: null };
  function hitAt(p) { for (let i = HITS.length - 1; i >= 0; i--) { const h = HITS[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  function cbtn(x, y, w, h, label, fn, o) {
    o = o || {};
    const on = !!o.on, dis = !!o.disabled;
    D.roundRect(x, y, w, h, o.r != null ? o.r : h / 2);
    ctx.fillStyle = dis ? '#eef0f4' : on ? (o.color || '#f26b3a') : '#fff'; ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = dis ? '#cfd5df' : (o.color || '#f26b3a'); ctx.stroke();
    T(x + w / 2, y + h / 2 + (o.size || 14) * 0.36, label, o.size || 14, dis ? '#a3acba' : on ? '#fff' : '#26324a', 'center', 800);
    if (!dis && fn) HITS.push({ x, y, w, h, fn });
  }
  let press = null;
  SciSim.pointer(view, {
    down(p) {
      if (DRAG.down && DRAG.down(p)) { press = { drag: true }; return true; }
      const h = hitAt(p); if (h) { press = { hit: h, x: p.x, y: p.y }; return true; } return false;
    },
    move(p) { if (press && press.drag && DRAG.move) DRAG.move(p); },
    up(p) {
      if (press && press.drag) { DRAG.up && DRAG.up(p); }
      else if (press && press.hit && Math.hypot(p.x - press.x, p.y - press.y) < 14) press.hit.fn(p);
      press = null;
    },
    hover(p) { if (DRAG.hover) { const c = DRAG.hover(p); if (c) return c; } return hitAt(p) ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 · 툴바 ---------- */
  let rlast = '';
  function readouts(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    $('#l1').textContent = L1; $('#v1').textContent = a; $('#l2').textContent = L2; $('#v2').textContent = b; $('#l3').textContent = L3; $('#v3').textContent = c;
  }
  function setTb(label, items, cur, onPick) {
    $('#tbLabel').textContent = label;
    const seg = $('#tbSeg'); seg.innerHTML = '';
    seg.hidden = !items || items.length < 2;
    (items || []).forEach((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = it[1]; b.dataset.v = it[0];
      b.classList.toggle('on', it[0] === cur);
      b.addEventListener('click', () => { Sound.click(); onPick(it[0]); });
      seg.appendChild(b);
    });
  }
  const setSlider = (id, v, min, max, outId, txt) => {
    const e = $(id); if (!e) return; if (+e.value !== v) e.value = v;
    e.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%');
    if (outId) $(outId).textContent = txt;
  };
  const syncSeg = (sel, v) => $$(sel + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  function mkSelects(host, defs, store, okStore) {
    // defs: [[question, [[value, label]...], answer]]
    host.innerHTML = '';
    const sels = [];
    defs.forEach((w, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + w[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', w[0].replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + w[1].map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
      sel.addEventListener('change', () => { store[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okStore[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return sels;
  }
  function checkSelects(defs, sels, store, okStore) {
    const miss = defs.filter((w, i) => !store[i]);
    if (miss.length) return { miss: miss.length };
    let bad = 0;
    defs.forEach((w, i) => {
      const ok = store[i] === w[2];
      if (!ok) bad++;
      if (!ok && okStore[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
      if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
      okStore[i] = ok;
    });
    return { bad };
  }
  const numOf = (s) => parseFloat(String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));


  /* =========================================================
     물리학 Ⅲ. 빛과 물질 - p-n 접합과 다이오드 (단원 7차시)
     성취기준 [12물리03-05] 고체의 에너지띠 구조로부터 도체와 부도체의 차이를 알고, 반도체 소자의 원리를 설명할 수 있다.
     ① 모형: p-n 접합과 공핍층 · 전위 장벽
     ② 실험: 순방향 · 역방향 전압과 I–V 그래프
     ③ 분석: 반파 · 전파 정류와 축전기 평활
     ④ 적용: LED(전류 제한 저항)와 태양 전지
     쇼클리 다이오드 식, 항복 현상, 접합 용량, 트랜지스터·집적 회로는 다루지 않아요.
     ========================================================= */

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const V_BI = 0.7;                                              // 접합면의 전위 장벽 = 규소 다이오드의 문턱 전압 (V)
  const NVT = 0.0388, R_SER = 20, I_REF = 5e-3;                  // I–V 곡선의 모양 상수, 회로의 보호 저항 20 Ω, V_D = 0.7 V 일 때 전류 5 mA
  const I_S = I_REF / (Math.exp(V_BI / NVT) - 1);
  const iDiode = (v) => I_S * (Math.exp(Math.min(v, 1.2) / NVT) - 1);   // A
  function solveVd(vs) {                                         // (V_s − V_D) ÷ R = I(V_D) 를 만족하는 다이오드 전압
    let lo = Math.min(vs, 0) - 1, hi = Math.max(vs, 0) + 0.2;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if ((vs - mid) / R_SER - iDiode(mid) > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  const wFrac = (vd) => (vd >= V_BI ? 0.2 : Math.max(0.2, Math.sqrt((V_BI - vd) / V_BI)));   // 공핍층 폭 ÷ 평형 때의 폭
  const fmtI = (A) => { const mA = A * 1000; return Math.abs(mA) < 0.001 ? '≈ 0' : Math.abs(mA) < 1 ? mA.toFixed(3) : mA.toFixed(1); };
  const VS_MIN = -5, VS_MAX = 2, GX0 = -5, GX1 = 1, GY1 = 70;      // 입력 범위, 그래프의 가로(V)·세로(mA) 범위
  const NC = 8, NR = 5, DEP_MAX = 3;                             // 결정의 열·행 수, 평형에서 한쪽 공핍 열 수
  const V_AMP = 12, V_LOSS = 0.7, F_AC = 1, TAU_C = 3, SCOPE_S = 4;  // 교류 진폭(V), 다이오드 1개의 전압 강하, 화면에서 보이는 주파수(Hz), 축전기 방전 시간(s), 파형 표시 시간(s)
  const V_SRC = 5, I_TGT = 20, I_MAXLED = 28, R_OPT = [100, 120, 150, 180, 220, 330];   // 전지 5 V, 목표 전류 20 mA, 타 버리는 전류(mA)
  const LED = { red: { name: '빨강', eg: 1.9, vf: 2.0 }, green: { name: '초록', eg: 2.3, vf: 2.4 }, blue: { name: '파랑', eg: 2.7, vf: 2.8 } };
  const HC = 1240, EG_SI = 1.1, I_SC = 40, V_OC = 0.55, NM_VIS = 550, NM_IR = 1300;
  const lamOfEg = (eg) => Math.round(HC / eg);
  const ledI = (col, R, pol) => (pol === 'fwd' ? Math.max(0, (V_SRC - LED[col].vf) / R * 1000) : 0);   // mA

  /* ---------- 상태 ---------- */
  const mkJ = () => {
    const cells = [];
    for (const side of ['p', 'n']) for (let c = 0; c < NC; c++) for (let r = 0; r < NR; r++) cells.push({ side, c, r, ph: Math.random() * 6, alive: true, mv: 0, moving: false });
    return { cells, g: 60, joined: false, joining: false, depStarted: 0, depDone: 0, depT: 0, wv: 0, hold: 0, seen: {} };
  };
  const mkV = () => ({ vs: 0, vd: 0, W: 1, rows: [], hp: Array.from({ length: 16 }, () => ({ u: Math.random(), y: Math.random() })), en: Array.from({ length: 16 }, () => ({ u: Math.random(), y: Math.random() })), dots: 0, sparks: [] });
  const mkR = () => ({ mode: 'half', dir: -1, br: [false, false, false, false], cap: 'off', t: 0, acc: 0, vc: 0, hist: [], flips: 0, tHalf: 0, shortT: 0, seen: {}, cur: { vin: 0, vr: 0, out: 0, short: false, on: [] } });
  const mkL = () => ({ sub: 'led', col: 'red', R: 330, pol: 'fwd', burnT: 0, burnt: false, tOK: 0, ph: [], em: 0, sl: 'vis', inten: 50, sOK: 0, seen: {}, car: [], sph: [], sacc: 0 });
  const S = { mode: 'junc', t: 0, fade: 0, j: mkJ(), v: mkV(), r: mkR(), l: mkL() };
  const fldSt = {}, fldOk = {};
  let game = null, need = '';
  const MODES = { junc: '🔺 p-n 접합', iv: '📈 전압과 전류', rect: '〰️ 정류 회로', led: '💡 LED와 태양 전지' };
  const L_VIEWS = [['led', 'LED'], ['sol', '태양 전지']];

  /* ---------- 장면 · 컨트롤 ---------- */
  const subOf = () => (S.mode === 'rect' ? S.r.mode : S.mode === 'led' ? S.l.sub : '');
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-need')) on = n.getAttribute('data-need') === need;
      if (on && n.hasAttribute('data-hide')) on = n.getAttribute('data-hide') !== need;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(subOf()) >= 0;
      n.hidden = !on;
    });
    if (S.mode === 'led') setTb(MODES.led, L_VIEWS, S.l.sub, (v) => { S.l.sub = v; S.fade = 1; updateCtl(); });
    else setTb(MODES[S.mode], null);
    syncSeg('#rmSeg', S.r.mode); syncSeg('#capSeg', S.r.cap); syncSeg('#colSeg', S.l.col); syncSeg('#rSeg', S.l.R); syncSeg('#polSeg', S.l.pol); syncSeg('#slSeg', S.l.sl);
    setSlider('#sVs', S.v.vs, VS_MIN, VS_MAX, '#oVs', f2(S.v.vs) + ' V');
    setSlider('#sInt', S.l.inten, 0, 100, '#oInt', S.l.inten + ' %');
    $('#bJoin').disabled = S.j.joined || S.j.joining; $('#bSep').disabled = !S.j.joined && !S.j.joining && S.j.g >= 59.9;
  }

  /* ---------- 공통 그리기 ---------- */
  const COL_P = '#f2873a', COL_N = '#3867f4';
  const hDot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r || 6, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2; ctx.stroke(); T(x, y + (r || 6) * 0.42, '+', (r || 6) * 1.5, '#e2552a', 'center', 800); };
  const eDot = (x, y, r) => { D.sphere(x, y, r || 5.5, '#2f6df6', { gloss: (r || 5.5) > 6, shadow: false }); };
  const ionSq = (x, y, s, plus, a) => { ctx.globalAlpha = a; D.roundRect(x - s, y - s, s * 2, s * 2, 3); ctx.fillStyle = plus ? '#ffd9d0' : '#d9e3ff'; ctx.fill(); ctx.strokeStyle = plus ? '#e2552a' : '#3867f4'; ctx.lineWidth = 1.6; ctx.stroke(); T(x, y + s * 0.55, plus ? '+' : '−', s * 1.8, plus ? '#c2410c' : '#1d4ed8', 'center', 800); ctx.globalAlpha = 1; };
  function diodeSym(x, y, ang, o) {
    o = o || {}; const h = o.h || 13, w = o.w || 12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (o.on) D.glow(0, 0, 26, '#ffb400', 0.6);
    ctx.fillStyle = o.on ? '#ffd447' : '#fff'; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-h, -w); ctx.lineTo(-h, w); ctx.lineTo(h, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(h, -w); ctx.lineTo(h, w); ctx.stroke();
    ctx.restore();
  }
  const wire = (pts, c, w) => { ctx.strokeStyle = c || '#6b7488'; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); };
  const resistor = (x, y, w, h, label, vert) => { D.shadow(() => { D.roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.fillStyle = '#f5e6c8'; ctx.fill(); }, { blur: 4, y: 1 }); ctx.strokeStyle = '#a07c3a'; ctx.lineWidth = 2; D.roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.stroke(); T(x, y + 5, label, 13, '#6b4b13', 'center', 800); };
  const polyPos = (path, q) => { // 경로 위의 위치 (q: 0~1)
    let tot = 0; const seg = []; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(d); tot += d; }
    let t = ((q % 1) + 1) % 1 * tot; for (let i = 0; i < seg.length; i++) { if (t <= seg[i]) { const k = seg[i] ? t / seg[i] : 0; return [lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k)]; } t -= seg[i]; }
    return path[path.length - 1];
  };

  /* ================= ① 접합 ================= */
  const LJ = PHONE
    ? { p: [12, 12, 456, 300], xj: 240, cell: 22, rowY: 100, rowH: 30, g0: 40, pot: [12, 320, 456, 190], tx: [12, 518, 456, 190] }
    : { p: [14, 14, 772, 330], xj: 400, cell: 38, rowY: 108, rowH: 40, g0: 60, pot: [14, 352, 772, 194], tx: null };
  const cellX = (side, c, g) => (side === 'p' ? LJ.xj - g / 2 - (c + 0.5) * LJ.cell : LJ.xj + g / 2 + (c + 0.5) * LJ.cell);
  const cellY = (r) => LJ.rowY + r * LJ.rowH;
  function joinNow() {
    const j = S.j; if (j.joined || j.joining) return;
    j.joining = true; Sound.click();
    SciSim.tween(j, { g: 0 }, { duration: RM ? 0.01 : 0.9, ease: 'outCubic', onDone: () => { j.joined = true; j.joining = false; j.depT = 0.3; updateCtl(); } });
    updateCtl();
  }
  function separateNow() {
    const j = S.j; Sound.click();
    j.joined = false; j.joining = false; j.depStarted = 0; j.depDone = 0; j.depT = 0; j.hold = 0;
    j.cells.forEach((c) => { c.alive = true; c.mv = 0; c.moving = false; });
    SciSim.tween(j, { g: LJ.g0 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: updateCtl });
    updateCtl();
  }
  function stepJunc(dt) {
    const j = S.j;
    if (j.joined && j.depStarted < DEP_MAX) { j.depT += dt; if (j.depT > 0.85) { j.depT = 0; const k = j.depStarted++; j.cells.forEach((c) => { if (c.c === k) c.moving = true; }); Sound.tick(); } }
    j.cells.forEach((c) => {
      if (c.moving && c.alive) {
        c.mv += dt / 0.55;
        if (c.mv >= 1) { c.alive = false; c.moving = false; if (c.side === 'p') parts.burst(LJ.xj, cellY(c.r), { count: 4, speed: 60, size: 2.4, colors: ['#ffd447', '#fff'], gravity: 0, life: 0.4 }); }
      }
    });
    for (let k = j.depDone; k < j.depStarted; k++) { if (j.cells.filter((c) => c.c === k && c.alive).length === 0) j.depDone = k + 1; else break; }
    j.wv = SciSim.approach(j.wv, j.depDone, dt, 5);
    j.hold = (j.joined && j.depDone >= DEP_MAX) ? j.hold + dt : 0;
    if (j.hold > 0.4) j.seen.dep = true;
  }
  function drawJunc(dt) {
    const j = S.j, g = LJ, cl = g.cell;
    panel(g.p[0], g.p[1], g.p[2], g.p[3]);
    T(g.p[0] + 14, g.p[1] + 26, 'p형 반도체와 n형 반도체를 맞대면', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const top = cellY(0) - g.rowH / 2, bh = NR * g.rowH;
    [['p', -1], ['n', 1]].forEach((s) => {
      const side = s[0], x0 = side === 'p' ? g.xj - j.g / 2 - NC * cl : g.xj + j.g / 2;
      D.shadow(() => { D.roundRect(x0, top, NC * cl, bh, 10); ctx.fillStyle = side === 'p' ? '#fff3ea' : '#ecf2ff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = side === 'p' ? COL_P : COL_N; ctx.lineWidth = 2.4; D.roundRect(x0, top, NC * cl, bh, 10); ctx.stroke();
      T(x0 + NC * cl / 2, top - 9, side === 'p' ? 'p형 · 양공 ⊕이 많아요' : 'n형 · 전자 ⊖이 많아요', PHONE ? 12 : 14, side === 'p' ? '#c2410c' : '#1d4ed8', 'center', 800);
    });
    // 공핍층
    const wpx = j.wv * cl;
    if (wpx > 1) { ctx.fillStyle = 'rgba(120,130,150,.16)'; ctx.fillRect(g.xj - wpx, top, wpx * 2, bh); ctx.strokeStyle = 'rgba(90,102,121,.7)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeRect(g.xj - wpx, top, wpx * 2, bh); ctx.setLineDash([]); T(g.xj, top + bh + 18, '공핍층 · 이동 전하가 없어요', PHONE ? 11.5 : 13, '#5a6679', 'center', 800); }
    // 이온과 이동 전하
    j.cells.forEach((c) => {
      const x = cellX(c.side, c.c, j.g), y = cellY(c.r), dep = c.c < j.depDone;
      ionSq(x - cl * 0.16, y - g.rowH * 0.18, PHONE ? 5 : 7, c.side === 'n', dep ? 1 : 0.38);
      if (!c.alive) return;
      const q = c.moving ? SciSim.ease.inOutQuad(clamp(c.mv, 0, 1)) : 0;
      const jx = x + cl * 0.17 + Math.sin(S.t * 3 + c.ph) * 2.6, jy = y + g.rowH * 0.18 + Math.cos(S.t * 2.6 + c.ph * 1.3) * 2.6;
      const px = lerp(jx, g.xj, q), py = lerp(jy, y, q);
      if (c.side === 'p') hDot(px, py, PHONE ? 5 : 6.5); else eDot(px, py, PHONE ? 4.8 : 5.8);
    });
    // 전기장
    if (j.wv > 0.5) {
      const a = clamp(j.wv / DEP_MAX, 0, 1);
      for (let r = 1; r <= NR - 2; r += 1) D.arrow(g.xj + wpx - 8, cellY(r) + g.rowH * 0.5, g.xj - wpx + 8, cellY(r) + g.rowH * 0.5, { color: 'rgba(20,160,88,' + (0.35 + 0.55 * a) + ')', width: 3, head: 10 });
      D.label(g.xj, top - (PHONE ? 38 : 30), '전기장 E', { bg: '#14a058', size: PHONE ? 11.5 : 13 });
    }
    // 전위 그래프
    const q = g.pot; panel(q[0], q[1], q[2], q[3]);
    T(q[0] + 14, q[1] + 24, '접합면 근처의 전위 (n형 쪽이 더 높아요)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const gy0 = q[1] + q[3] - 36, gh = q[3] - 84, vTop = V_BI * 1.1, vy = (v) => gy0 - v / vTop * gh;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0] + 40, gy0 + 8); ctx.lineTo(q[0] + 40, vy(vTop) - 4); ctx.moveTo(q[0] + 40, gy0); ctx.lineTo(q[0] + q[2] - 16, gy0); ctx.stroke();
    T(q[0] + 34, vy(V_BI) + 4, f1(V_BI), 12, '#5a6679', 'right', 700); T(q[0] + 34, gy0 + 4, '0', 12, '#5a6679', 'right', 700); T(q[0] + 46, vy(vTop) + 2, 'V', 12, '#5a6679', 'left', 700);
    const vn = V_BI * clamp(j.wv / DEP_MAX, 0, 1), xa = g.xj - wpx, xb = g.xj + wpx;
    ctx.beginPath(); ctx.moveTo(q[0] + 40, vy(0));
    const xs = q[0] + 40, xe = q[0] + q[2] - 16;
    for (let x = xs; x <= xe; x += 3) { const t = wpx > 1 ? smooth((x - xa) / (xb - xa)) : 0; ctx.lineTo(x, vy(vn * t)); }
    ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 4; ctx.stroke();
    if (vn > 0.05) {
      D.arrow(g.xj + wpx + 30, vy(0) - 4, g.xj + wpx + 30, vy(vn) + 4, { color: '#14a058', width: 2.5, head: 9 });
      T(g.xj + wpx + 40, (vy(0) + vy(vn)) / 2 + 4, '장벽 ' + f1(vn) + ' V', PHONE ? 12 : 14, '#0f7a43', 'left', 800);
      T(xa - 10, vy(0) - 8, 'p형 쪽', 12.5, '#c2410c', 'right', 800); T(xb + 10, vy(vn) - 8, 'n형 쪽', 12.5, '#1d4ed8', 'left', 800);
    }
    if (PHONE && g.tx) { panel(g.tx[0], g.tx[1], g.tx[2], g.tx[3]); textBlock(g.tx[0] + 14, g.tx[1] + 26, g.tx[2] - 28, j.joined ? (j.depDone >= DEP_MAX ? '접합면 근처에서 전자와 양공이 만나 사라졌어요. 이동 전하가 없어진 공핍층에는 고정된 이온만 남아 전기장과 전위 장벽 ' + f1(V_BI) + ' V가 생겼어요.' : '접합면 근처의 전자와 양공이 서로 확산해 만나서 사라지고 있어요.') : '“접합하기”를 눌러 두 반도체를 맞대 보세요.', 13, '#3a465c', 19, 700); }
    else if (!PHONE) { T(q[0] + q[2] - 14, q[1] + 24, j.joined ? (j.depDone >= DEP_MAX ? '확산이 멈췄어요: 장벽이 전하의 확산을 막아요' : '전자와 양공이 서로 확산해 만나고 있어요') : '아직 떨어져 있어서 장벽이 없어요', 13.5, j.depDone >= DEP_MAX ? '#0f7a43' : '#5a6679', 'right', 800); }
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ② 전압과 전류 ================= */
  const LI = PHONE
    ? { s: [12, 12, 456, 200], g: [12, 220, 456, 268], m: [12, 496, 456, 212], xj: 240, bx0: 40, bx1: 440, by: 128, bh: 56, wy: 62 }
    : { s: [14, 14, 772, 206], g: [14, 228, 470, 318], m: [492, 228, 294, 318], xj: 400, bx0: 90, bx1: 710, by: 118, bh: 66, wy: 62 };
  function curState() { const v = S.v; v.vd = solveVd(v.vs); v.I = iDiode(v.vd); v.mA = v.I * 1000; }
  function stepIV(dt) {
    const v = S.v; curState();
    v.W = SciSim.approach(v.W, wFrac(v.vd), dt, 8);
    const sp = v.mA > 0.05 ? clamp(v.mA * 0.04, 0.05, 2.4) : 0;
    v.dots = (v.dots + sp * dt * 0.5) % 1;
    [v.hp, v.en].forEach((arr, k) => arr.forEach((c) => {
      if (sp > 0) { c.u -= sp * dt; if (c.u < 0) { c.u += 1; v.sparks.push({ x: 0, y: c.y, t: 0, k }); } }
    }));
    v.sparks.forEach((s) => { s.t += dt; }); v.sparks = v.sparks.filter((s) => s.t < 0.4).slice(-30);
  }
  function recordIV() {
    const v = S.v; curState();
    const row = { vs: Math.round(v.vs * 100) / 100, vd: Math.round(v.vd * 1000) / 1000, I: v.I };
    const i = v.rows.findIndex((r) => Math.abs(r.vs - row.vs) < 1e-9);
    if (i >= 0) v.rows[i] = row; else v.rows.push(row);
    v.rows.sort((a, b) => a.vd - b.vd);
    Sound.success(); const gp = gPos(row.vd, row.I * 1000); parts.burst(gp[0], gp[1], { count: 8, speed: 80, size: 3, colors: ['#7c5cff', '#ffb400'], gravity: 100 });
  }
  const gGeom = () => { const q = LI.g; return { x0: q[0] + 56, x1: q[0] + q[2] - 18, y0: q[1] + q[3] - 44, y1: q[1] + 52 }; };
  const gPos = (vd, mA) => { const a = gGeom(); return [a.x0 + (vd - GX0) / (GX1 - GX0) * (a.x1 - a.x0), a.y0 - clamp(mA, -3, GY1) / (GY1 + 3) * (a.y0 - a.y1) * 1 - 0]; };
  function drawIV(dt) {
    const v = S.v, g = LI, W0 = PHONE ? 56 : 70, Wpx = W0 * v.W;
    panel(g.s[0], g.s[1], g.s[2], g.s[3]);
    // 회로 (위쪽 도선)
    const xp0 = g.bx0 + 20, xn1 = g.bx1 - 20, wy = g.s[1] + g.wy, by = g.s[1] + g.by - 14, bh = g.bh;
    const fw = v.vs >= 0;
    wire([[xp0, by], [xp0, wy], [g.xj - 50, wy]]); wire([[g.xj + 50, wy], [xn1, wy], [xn1, by]]);
    // 전지
    const bx = g.xj; D.shadow(() => { D.roundRect(bx - 50, wy - 22, 100, 44, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(bx - 38, wy + 7, fw ? '+' : '−', 20, '#ffd447', 'center', 800); T(bx + 38, wy + 7, fw ? '−' : '+', 20, '#ffd447', 'center', 800); T(bx, wy + 5, f2(Math.abs(v.vs)) + ' V', 13, '#fff', 'center', 800);
    resistor(xp0 + 74, wy, 60, 24, R_SER + ' Ω'); D.sphere(xn1 - 70, wy, 17, '#fff', { gloss: false, outline: '#394258' }); T(xn1 - 70, wy + 5, 'A', 15, '#26324a', 'center', 800);
    T(xn1 - 70, wy - 24, fmtI(v.I) + ' mA', 12.5, '#0f7a43', 'center', 800);
    // 전류 점 (도선 위)
    if (v.mA > 0.05) {
      const path = fw ? [[xn1, by], [xn1, wy], [g.xj + 50, wy], [g.xj - 50, wy], [xp0, wy], [xp0, by]].reverse() : [];
      const path2 = [[xp0, by], [xp0, wy], [g.xj - 50, wy], [g.xj + 50, wy], [xn1, wy], [xn1, by]];
      for (let k = 0; k < 8; k++) { const pp = polyPos(path2, ((fw ? 1 - v.dots : v.dots) + k / 8)); ctx.beginPath(); ctx.arc(pp[0], pp[1], 3, 0, TAU); ctx.fillStyle = '#e2552a'; ctx.fill(); }
    }
    // p-n 구조
    const xjL = g.xj - Wpx / 2, xjR = g.xj + Wpx / 2;
    [[g.bx0, xjL, '#fff3ea', COL_P, 'p'], [xjR, g.bx1, '#ecf2ff', COL_N, 'n']].forEach((b) => { D.roundRect(b[0], by, b[1] - b[0], bh, 8); ctx.fillStyle = b[2]; ctx.fill(); ctx.strokeStyle = b[3]; ctx.lineWidth = 2.4; ctx.stroke(); });
    ctx.fillStyle = 'rgba(120,130,150,.18)'; ctx.fillRect(xjL, by, xjR - xjL, bh);
    T(g.bx0 + 14, by + 20, 'p', 16, '#c2410c', 'left', 800); T(g.bx1 - 14, by + 20, 'n', 16, '#1d4ed8', 'right', 800);
    // 공핍층의 이온
    const cols = Math.max(1, Math.round(Wpx / 2 / 11));
    for (let c = 0; c < cols; c++) for (let r = 0; r < 4; r++) { const yy = by + 11 + r * (bh - 18) / 3; ionSq(g.xj - 6 - c * 11 - 0.0, yy, 4, false, 0.9); ionSq(g.xj + 6 + c * 11, yy, 4, true, 0.9); }
    // 이동 전하
    [[v.hp, -1], [v.en, 1]].forEach((s, k) => s[0].forEach((c) => {
      const yy = by + 10 + c.y * (bh - 20);
      if (k === 0) { const e = xjL - 6, f = g.bx0 + 36, x = lerp(f, e, 1 - c.u); if (x < e) hDot(x, yy, 5.5); }
      else { const e = xjR + 6, f = g.bx1 - 36, x = lerp(f, e, 1 - c.u); if (x > e) eDot(x, yy, 4.8); }
    }));
    v.sparks.forEach((s) => { const q = s.t / 0.4, xx = s.k === 0 ? xjL - 6 : xjR + 6; ctx.beginPath(); ctx.arc(xx, by + 10 + s.y * (bh - 20), 4 + 10 * q, 0, TAU); ctx.strokeStyle = 'rgba(255,196,0,' + (1 - q) + ')'; ctx.lineWidth = 2.4; ctx.stroke(); });
    T(g.xj, by + bh + 20, '공핍층 폭 ' + f2(v.W) + ' (평형 = 1.00)', PHONE ? 12 : 13.5, '#5a6679', 'center', 800);
    T(g.bx0, by + bh + 20, fw ? '← p형에 + 극 (순방향)' : '← p형에 − 극 (역방향)', PHONE ? 11 : 12.5, fw ? '#0f7a43' : '#b42318', 'left', 800);
    // 그래프
    const a = gGeom(), q = g.g; panel(q[0], q[1], q[2], q[3]);
    T(q[0] + 14, q[1] + 26, 'I–V 그래프', PHONE ? 13 : 14.5, '#26324a', 'left', 800); T(q[0] + q[2] - 14, q[1] + 26, 'I (mA)', 12, '#5a6679', 'right', 700);
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1; for (let x = GX0; x <= GX1; x++) { const p = gPos(x, 0); ctx.beginPath(); ctx.moveTo(p[0], a.y0); ctx.lineTo(p[0], a.y1); ctx.stroke(); }
    for (let y = 0; y <= GY1; y += 10) { const p = gPos(0, y); ctx.beginPath(); ctx.moveTo(a.x0, p[1]); ctx.lineTo(a.x1, p[1]); ctx.stroke(); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; const o = gPos(0, 0); ctx.beginPath(); ctx.moveTo(a.x0, o[1]); ctx.lineTo(a.x1, o[1]); ctx.moveTo(o[0], a.y0 + 4); ctx.lineTo(o[0], a.y1 - 6); ctx.stroke();
    for (let x = GX0; x <= GX1; x++) { const p = gPos(x, 0); T(p[0], a.y0 + 20 + 0, String(x), 11.5, '#5a6679', 'center', 700); }
    T((a.x0 + a.x1) / 2, a.y0 + 38, '다이오드 양단 전압 V_D (V)', 12, '#5a6679', 'center', 700);
    for (let y = 0; y <= GY1; y += 10) { const p = gPos(GX0, y); T(a.x0 - 8, p[1] + 4, String(y), 11, '#5a6679', 'right', 700); }
    // 기록한 점과 현재 위치
    if (v.rows.length >= 6 || (game && game.free)) { ctx.beginPath(); for (let k = 0; k <= 120; k++) { const vd = GX0 + (GX1 - GX0) * k / 120; if (vd > 0.82) break; const p = gPos(vd, iDiode(vd) * 1000); if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = 'rgba(124,92,255,.45)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2.2; ctx.stroke(); ctx.setLineDash([]); }
    if (v.rows.length > 1) { ctx.beginPath(); v.rows.forEach((r, k) => { const p = gPos(r.vd, r.I * 1000); if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }); ctx.strokeStyle = 'rgba(124,92,255,.7)'; ctx.lineWidth = 2.4; ctx.stroke(); }
    v.rows.forEach((r) => { const p = gPos(r.vd, r.I * 1000); D.sphere(p[0], p[1], 6, '#7c5cff', { gloss: true }); });
    const cp = gPos(v.vd, v.mA), pulse = 1 + 0.2 * Math.sin(S.t * 6); D.glow(cp[0], cp[1], 20 * pulse, '#f26b3a', 0.5); D.sphere(cp[0], cp[1], 6.5, '#f26b3a', { gloss: true, shadow: true });
    const kn = gPos(V_BI, 0); T(kn[0] - 10, a.y0 - 30, '문턱 약 ' + f1(V_BI) + ' V', 11.5, '#7c5cff', 'right', 800);
    // 숫자 패널
    const m = g.m; panel(m[0], m[1], m[2], m[3]);
    T(m[0] + 14, m[1] + 26, '측정값', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    [['전원 전압 V_s', f2(v.vs) + ' V'], ['다이오드 전압 V_D', f2(v.vd) + ' V'], ['전류 I', fmtI(v.I) + ' mA']].forEach((r, i) => { const y = m[1] + (PHONE ? 46 : 52) + i * (PHONE ? 22 : 26); T(m[0] + 14, y, r[0], 13, '#5a6679', 'left', 800); T(m[0] + m[2] - 14, y, r[1], 15.5, i === 2 ? '#0f7a43' : '#26324a', 'right', 800); });
    const ty = m[1] + (PHONE ? 118 : 134); T(m[0] + 14, ty, '기록표', 12.5, '#5a6679', 'left', 800);
    const nrows = Math.floor((m[1] + m[3] - ty - 14) / 22); const shown = v.rows.slice(0, 50).sort((a2, b2) => a2.vs - b2.vs).slice(-nrows);
    shown.forEach((r, i) => { const y = ty + 22 + i * 22; T(m[0] + 14, y, 'V_s ' + f2(r.vs), 12.5, '#26324a', 'left', 700); T(m[0] + m[2] * 0.5, y, 'V_D ' + f2(r.vd), 12.5, '#26324a', 'left', 700); T(m[0] + m[2] - 14, y, fmtI(r.I) + ' mA', 12.5, '#0f7a43', 'right', 800); });
    if (!shown.length) T(m[0] + m[2] / 2, ty + 36, '📏 기록하기로 점을 모아요', 12.5, '#98a2b3', 'center', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ③ 정류 ================= */
  const LR = PHONE
    ? { c: [12, 12, 456, 232], cx: 232, cy: 124, ax: 72, ay: 50, srcX: 44, scope: [12, 252, 456, 240], note: [12, 500, 456, 208] }
    : { c: [14, 14, 772, 252], cx: 414, cy: 136, ax: 120, ay: 74, srcX: 130, scope: [14, 274, 772, 272], note: null };
  const BR_EDGES = [[0, 3], [1, 3], [2, 0], [2, 1]];   // 점 번호 A=0, B=1, M=2, P=3 · D1: A→P, D2: B→P, D3: M→A, D4: M→B (정상 방향의 (애노드, 캐소드))
  function bridgePts() { const g = LR; return { A: [g.cx - g.ax, g.cy], B: [g.cx + g.ax, g.cy], P: [g.cx, g.cy - g.ay], M: [g.cx, g.cy + g.ay] }; }
  function bridgeOut(vin, br) {
    const mag = Math.abs(vin), n = br;
    let pos, neg, short;
    if (vin >= 0) { pos = n[0] && n[3]; neg = !n[2] && !n[1]; short = (n[0] && !n[1]) || (!n[2] && n[3]); }
    else { pos = n[1] && n[2]; neg = !n[3] && !n[0]; short = (n[1] && !n[0]) || (!n[3] && n[2]); }
    if (mag < 2 * V_LOSS) return { v: 0, short: short && mag > 1.5, on: [] };
    if (short) return { v: 0, short: true, on: [] };
    const v = pos ? mag - 2 * V_LOSS : neg ? -(mag - 2 * V_LOSS) : 0;
    const on = []; if (vin >= 0) { if (pos) on.push(0, 3); if (neg) on.push(2, 1); } else { if (pos) on.push(1, 2); if (neg) on.push(3, 0); }
    return { v, short: false, on };
  }
  function rectOut(r, vin) {
    if (r.mode === 'half') { const v = r.dir > 0 ? Math.max(0, vin - V_LOSS) : Math.min(0, vin + V_LOSS); return { v, short: false, on: v !== 0 ? [0] : [] }; }
    return bridgeOut(vin, r.br);
  }
  const bridgeOK = (r) => r.br.every(Boolean);
  function stepRect(dt) {
    const r = S.r; r.acc += dt;
    while (r.acc >= 0.02) {
      r.acc -= 0.02; r.t += 0.02;
      const vin = V_AMP * Math.sin(TAU * F_AC * r.t), o = rectOut(r, vin); r.cur = { vin, vr: o.v, short: o.short, on: o.on };
      if (r.cap === 'on') { if (Math.abs(o.v) > Math.abs(r.vc) && (o.v * r.vc >= 0)) r.vc = o.v; else r.vc *= Math.exp(-0.02 / TAU_C); }
      else r.vc = 0;
      const out = r.cap === 'on' ? r.vc : o.v; r.cur.out = out;
      r.hist.push({ t: r.t, vin, out, short: o.short }); while (r.hist.length && r.t - r.hist[0].t > SCOPE_S) r.hist.shift();
    }
    if (r.mode === 'half' && r.dir > 0 && r.cap === 'off') r.tHalf += dt; else if (!(r.mode === 'half' && r.dir > 0 && r.cap === 'off')) r.tHalf = 0;
    if (r.tHalf > 2 && r.flips >= 2) r.seen.half = true;
    r.shortT = r.cur.short ? r.shortT + dt : 0;
  }
  const rectMsg = () => {
    const r = S.r;
    if (r.mode === 'half') return r.dir > 0 ? '다이오드가 + 반주기만 통과시켜요 → 반파 정류. 출력은 한쪽 부호뿐이에요.' : '다이오드를 뒤집으면 − 반주기만 통과해 출력 극성이 뒤집혀요.';
    if (r.cur.short || r.shortT > 0.2) return '⚠️ 단락! 두 다이오드가 전원을 직접 이어 버렸어요. 방향을 다시 맞춰 보세요.';
    return bridgeOK(r) ? (r.cap === 'on' ? '전파 정류 + 축전기 평활: 물결이 작아져 직류에 가까워요.' : '네 다이오드가 두 반주기를 모두 + 방향으로 뒤집어 줘요 → 전파 정류.') : '다이오드를 눌러 방향을 바꿔 출력이 + 방향의 전파 정류 파형이 되게 하세요.';
  };
  function drawRect(dt) {
    const r = S.r, g = LR, c = g.c;
    panel(c[0], c[1], c[2], c[3]);
    T(c[0] + 14, c[1] + 24, r.mode === 'half' ? '교류 12 V → 다이오드 1개 → 부하' : '교류 12 V → 다이오드 4개(브리지) → 부하', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    if (!PHONE) T(c[0] + c[2] - 14, c[1] + 24, '(화면에서는 교류를 ' + F_AC + ' Hz로 천천히 보여요)', 12, '#7b8aa3', 'right', 700);
    const lx = g.cx + (PHONE ? 150 : 250), capX = g.cx + (PHONE ? 100 : 196), topY = g.cy - (PHONE ? 78 : 100), botY = g.cy + (PHONE ? 76 : 98);
    // 교류 전원
    const sx = g.srcX; D.shadow(() => { ctx.beginPath(); ctx.arc(sx, g.cy, 24, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#394258'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(sx, g.cy, 24, 0, TAU); ctx.stroke();
    ctx.beginPath(); for (let i = -14; i <= 14; i++) { const x = sx + i, y = g.cy - 7 * Math.sin(i / 14 * TAU / 1.0); if (i === -14) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = '#2f6df6'; ctx.lineWidth = 2.6; ctx.stroke();
    T(sx, g.cy + 42, '교류 ' + V_AMP + ' V', 12.5, '#26324a', 'center', 800);
    const cur = r.cur, sgn = Math.sign(cur.out);
    // 부하
    const loadY = g.cy; resistor(lx, loadY, 30, 64, '부하'); T(lx + 28, loadY - 22, 'V_out', 12, '#c2410c', 'left', 800);
    if (r.mode === 'half') {
      wire([[sx, g.cy - 24], [sx, topY], [g.cx - 70, topY]]); wire([[g.cx + 70, topY], [lx, topY], [lx, loadY - 32]]); wire([[lx, loadY + 32], [lx, botY], [sx, botY], [sx, g.cy + 24]]);
      const on = cur.on.length > 0;
      diodeSym(g.cx, topY, r.dir > 0 ? 0 : Math.PI, { on, h: 15, w: 13 }); wire([[g.cx - 70, topY], [g.cx - 22, topY]]); wire([[g.cx + 22, topY], [g.cx + 70, topY]]);
      HITS.push({ x: g.cx - 34, y: topY - 28, w: 68, h: 56, fn: () => flipHalf() });
      T(g.cx, topY - 26, '다이오드 (눌러서 뒤집기)', PHONE ? 11 : 12, '#5a6679', 'center', 800);
    } else {
      const P = bridgePts();
      // 도선: 전원 → A, 전원 → B (아래로 돌아서), P → 부하 위, M → 부하 아래
      wire([[sx + 24, g.cy], [P.A[0], P.A[1]]]);
      const by2 = botY + (PHONE ? 14 : 14), bx2 = P.B[0] + (PHONE ? 52 : 70);
      wire([[sx, g.cy + 24], [sx, by2], [bx2, by2], [bx2, P.B[1]], [P.B[0], P.B[1]]]);
      wire([[P.P[0], P.P[1]], [P.P[0], topY], [lx, topY], [lx, loadY - 32]]);
      const hopX = bx2;
      wire([[lx, loadY + 32], [lx, botY], [hopX + 8, botY]]); ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hopX, botY, 8, 0, Math.PI, true); ctx.stroke(); wire([[hopX - 8, botY], [P.M[0], botY], [P.M[0], P.M[1]]]);
      if (r.cap === 'on') { /* 축전기 */ }
      // 다이오드 네 개
      BR_EDGES.forEach((e, i) => {
        const pa = [P.A, P.B, P.M, P.P][e[0]], pc = [P.A, P.B, P.M, P.P][e[1]];
        const mx = (pa[0] + pc[0]) / 2, my = (pa[1] + pc[1]) / 2;
        let ang = Math.atan2(pc[1] - pa[1], pc[0] - pa[0]); if (!r.br[i]) ang += Math.PI;
        wire([pa, pc], '#6b7488', 3);
        diodeSym(mx, my, ang, { on: cur.on.indexOf(i) >= 0, h: PHONE ? 10 : 13, w: PHONE ? 9 : 12 });
        D.label(mx + (i === 0 || i === 2 ? -30 : 30), my + (i < 2 ? -22 : 22), 'D' + (i + 1), { bg: r.br[i] ? '#14a058' : '#e2464b', size: 11.5 });
        HITS.push({ x: mx - 24, y: my - 24, w: 48, h: 48, fn: () => flipBridge(i) });
      });
      [['A', P.A, -14, 4], ['B', P.B, 14, 4], ['+', P.P, 0, -14], ['−', P.M, 0, 20]].forEach((n) => { ctx.beginPath(); ctx.arc(n[1][0], n[1][1], 4, 0, TAU); ctx.fillStyle = '#394258'; ctx.fill(); T(n[1][0] + n[2], n[1][1] + n[3], n[0], 12.5, n[0] === '+' ? '#c2410c' : n[0] === '−' ? '#1d4ed8' : '#5a6679', 'center', 800); });
    }
    // 축전기 (부하와 병렬)
    if (r.cap === 'on') {
      wire([[capX, topY], [capX, g.cy - 8]]); wire([[capX, g.cy + 8], [capX, botY]]);
      ctx.strokeStyle = '#26324a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(capX - 16, g.cy - 8); ctx.lineTo(capX + 16, g.cy - 8); ctx.moveTo(capX - 16, g.cy + 8); ctx.lineTo(capX + 16, g.cy + 8); ctx.stroke();
      T(capX, g.cy + 30, '축전기', 12, '#26324a', 'center', 800);
    }
    if (cur.short) { D.label(g.cx, g.cy, '⚠ 단락!', { bg: '#e2464b', size: 15 }); }
    // 출력 표시
    D.label(lx, c[1] + c[3] - 16, 'V_out = ' + (cur.out >= 0 ? '+' : '−') + f1(Math.abs(cur.out)) + ' V', { bg: Math.abs(cur.out) < 0.05 ? '#7b8aa3' : sgn > 0 ? '#14a058' : '#e2464b', size: 13 });
    // 파형
    const s = g.scope; panel(s[0], s[1], s[2], s[3]);
    T(s[0] + 14, s[1] + 24, '오실로스코프 · 최근 ' + SCOPE_S + '초', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const px0 = s[0] + 52, px1 = s[0] + s[2] - 16, py0 = s[1] + 40, py1 = s[1] + s[3] - 20, vmax = 14, ys = (v) => (py0 + py1) / 2 - v / vmax * (py1 - py0) / 2;
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1; for (let v = -12; v <= 12; v += 6) { ctx.beginPath(); ctx.moveTo(px0, ys(v)); ctx.lineTo(px1, ys(v)); ctx.stroke(); T(px0 - 6, ys(v) + 4, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), 11, '#5a6679', 'right', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, ys(0)); ctx.lineTo(px1, ys(0)); ctx.stroke(); T(px0 - 6, py0 - 6, 'V', 11, '#5a6679', 'right', 700);
    const tx = (t) => px1 - (r.t - t) / SCOPE_S * (px1 - px0);
    [['vin', '#2f6df6', '입력(교류)', 2.6], ['out', '#f26b3a', '출력(부하 양단)', 3.6]].forEach((ln) => {
      ctx.beginPath(); r.hist.forEach((h, i) => { const x = tx(h.t), y = ys(h[ln[0]]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.strokeStyle = ln[1]; ctx.lineWidth = ln[3]; ctx.lineJoin = 'round'; ctx.stroke();
    });
    D.label(px0 + 70, s[1] + s[3] - 12, '입력', { bg: '#2f6df6', size: 11.5 }); D.label(px0 + 140, s[1] + s[3] - 12, '출력', { bg: '#f26b3a', size: 11.5 });
    if (!PHONE) T(s[0] + s[2] - 14, s[1] + 24, rectMsg(), 13, r.cur.short ? '#b42318' : '#3a465c', 'right', 800);
    else { const n = g.note; panel(n[0], n[1], n[2], n[3]); textBlock(n[0] + 14, n[1] + 28, n[2] - 28, rectMsg(), 13.5, r.cur.short ? '#b42318' : '#3a465c', 20, 800); textBlock(n[0] + 14, n[1] + 112, n[2] - 28, '다이오드 방향은 화면에서 직접 눌러 바꿀 수 있어요. 교류는 ' + F_AC + ' Hz로 천천히 보여 줘요.', 12.5, '#5a6679', 18, 700); }
    parts.update(dt); parts.draw(ctx);
  }
  function flipHalf() { S.r.dir = -S.r.dir; S.r.flips++; Sound.click(); }
  function flipBridge(i) { S.r.br[i] = !S.r.br[i]; S.r.flips++; Sound.click(); }

  /* ================= ④ LED · 태양 전지 ================= */
  const LL = PHONE
    ? { c: [12, 12, 456, 236], z: [12, 256, 456, 232], f: [12, 496, 456, 212] }
    : { c: [14, 14, 430, 330], z: [452, 14, 334, 330], f: [14, 352, 772, 194] };
  function stepLed(dt) {
    const l = S.l, I = ledI(l.col, l.R, l.pol);
    l.I = l.burnt ? 0 : I; l.bright = SciSim.approach(l.bright || 0, l.burnt ? 0 : clamp(I / I_TGT, 0, 1.6), dt, 8);
    if (I > I_MAXLED && !l.burnt) { l.burnT += dt; if (l.burnT > 0.8) { l.burnt = true; Sound.fail(); parts.burst(LL.c[0] + 300, LL.c[1] + 150, { count: 14, speed: 120, size: 3, colors: ['#555b66', '#ffb400'], gravity: 80 }); } } else if (I <= I_MAXLED) l.burnT = 0;
    l.tOK = (l.col === 'red' && l.pol === 'fwd' && !l.burnt && I >= 18 && I <= 22) ? l.tOK + dt : 0;
    if (l.tOK > 0.8) l.seen.led = true;
    // 접합부 전하
    const emit = l.pol === 'fwd' && I > 0.5 && !l.burnt;
    if (emit) { l.em += dt * clamp(I / 4, 0.5, 8); while (l.em >= 1) { l.em -= 1; l.ph.push({ t: 0, y: rnd(-1, 1) }); } }
    l.ph.forEach((p) => { p.t += dt; }); l.ph = l.ph.filter((p) => p.t < 1.1);
    // 태양 전지
    const eph = HC / (l.sl === 'vis' ? NM_VIS : NM_IR), eff = eph >= EG_SI ? 1 : 0;
    l.sI = I_SC * (l.inten / 100) * eff;
    l.sacc += dt * (l.inten / 100) * 5;
    while (l.sacc >= 1) { l.sacc -= 1; l.sph.push({ x: rnd(0.15, 0.85), t: 0, ok: eff === 1 }); }
    l.sph.forEach((p) => { p.t += dt * 0.9; if (p.ok && !p.pair && p.t >= 0.45) { p.pair = true; l.car.push({ x: p.x, t: 0 }); } });
    l.sph = l.sph.filter((p) => p.t < 1);
    l.car.forEach((c) => { c.t += dt * 0.7; }); l.car = l.car.filter((c) => c.t < 1);
    l.sOK = (l.sl === 'vis' && l.inten >= 80) ? l.sOK + dt : 0; if (l.sOK > 0.8) l.seen.vis = true;
    if (l.sl === 'ir' && l.inten >= 80) { l.sOK2 = (l.sOK2 || 0) + dt; if (l.sOK2 > 1.2) l.seen.ir = true; } else l.sOK2 = 0;
  }
  function drawLed(dt) {
    const l = S.l, g = LL;
    if (l.sub === 'led') {
      const c = g.c, I = l.I || 0, led = LED[l.col], lam = lamOfEg(led.eg), colHex = wlSolid(lam);
      panel(c[0], c[1], c[2], c[3]);
      T(c[0] + 14, c[1] + 26, '전원 ' + V_SRC + ' V → 저항 → LED', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      const x0 = c[0] + (PHONE ? 40 : 52), x1 = c[0] + c[2] - (PHONE ? 64 : 64), y0 = c[1] + (PHONE ? 62 : 80), y1 = c[1] + c[3] - (PHONE ? 52 : 56);
      const fwd = l.pol === 'fwd';
      wire([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]);
      D.shadow(() => { D.roundRect(x0 - 24, (y0 + y1) / 2 - 36, 48, 72, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
      T(x0, (y0 + y1) / 2 - 10, V_SRC + ' V', 13, '#fff', 'center', 800); T(x0, (y0 + y1) / 2 + 12, fwd ? '+ 위' : '− 위', 13, '#ffd447', 'center', 800);
      resistor((x0 + x1) / 2 - (PHONE ? 40 : 60), y0, 70, 26, l.R + ' Ω');
      // LED
      const lx = x1, ly = (y0 + y1) / 2;
      const br = clamp(l.bright || 0, 0, 1.4);
      if (br > 0.02) { ctx.save(); D.roundRect(c[0], c[1], c[2], c[3], 14); ctx.clip(); D.glow(lx, ly, 60 + 50 * br, colHex, clamp(0.25 + 0.35 * br, 0, 0.85)); ctx.restore(); }
      D.shadow(() => { ctx.beginPath(); ctx.arc(lx, ly - 6, 24, Math.PI, 0); ctx.lineTo(lx + 24, ly + 22); ctx.lineTo(lx - 24, ly + 22); ctx.closePath(); ctx.fillStyle = l.burnt ? '#3a2b27' : br > 0.02 ? C.mix('#ffffff', colHex, clamp(0.35 + br * 0.5, 0, 1)) : C.rgba(colHex, 0.35); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(lx, ly - 6, 24, Math.PI, 0); ctx.lineTo(lx + 24, ly + 22); ctx.lineTo(lx - 24, ly + 22); ctx.closePath(); ctx.stroke();
      diodeSym(lx, ly + 48, Math.PI / 2 * (fwd ? 1 : -1) + 0, { on: false, h: 10, w: 10 });
      T(lx - 18, ly + 52, fwd ? 'p→n' : 'n→p', 11, '#5a6679', 'right', 700);
      T(lx, ly - 40, led.name + ' LED', 13, '#26324a', 'center', 800);
      if (l.burnt) D.label(lx, ly - 64, '💥 타 버렸어요', { bg: '#e2464b', size: 14 });
      // 전류 점
      if (I > 0.5 && !l.burnt) { const path = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; for (let k = 0; k < 10; k++) { const pp = polyPos(path, (S.t * clamp(I / 60, 0.08, 0.5) + k / 10) % 1); ctx.beginPath(); ctx.arc(pp[0], pp[1], 3, 0, TAU); ctx.fillStyle = '#e2552a'; ctx.fill(); } }
      T(c[0] + c[2] / 2, c[1] + c[3] - 16, fwd ? (I > 0.5 ? 'I = ' + f1(I) + ' mA' : 'I = 0') : '전지를 반대로 연결: 전류가 거의 흐르지 않아요 (I ≈ 0)', PHONE ? 13 : 14.5, fwd ? '#0f7a43' : '#b42318', 'center', 800);
      // 접합부 확대
      const z = g.z; panel(z[0], z[1], z[2], z[3]);
      T(z[0] + 14, z[1] + 26, '🔍 LED 접합부', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      const cx = z[0] + z[2] / 2, cy = z[1] + z[3] / 2 + 6, hw = z[2] / 2 - 24, hh = (PHONE ? 62 : 80);
      D.roundRect(cx - hw, cy - hh, hw - 6 + (fwd ? 0 : -14), hh * 2, 8); ctx.fillStyle = '#fff3ea'; ctx.fill(); ctx.strokeStyle = COL_P; ctx.lineWidth = 2.2; ctx.stroke();
      D.roundRect(cx + 6 + (fwd ? 0 : 14), cy - hh, hw - 6 + (fwd ? 0 : -14), hh * 2, 8); ctx.fillStyle = '#ecf2ff'; ctx.fill(); ctx.strokeStyle = COL_N; ctx.stroke();
      T(cx - hw / 2, cy - hh - 8, 'p형', 13, '#c2410c', 'center', 800); T(cx + hw / 2 + 6, cy - hh - 8, 'n형', 13, '#1d4ed8', 'center', 800);
      const flow = (S.t * (fwd ? clamp(I / 30, 0.1, 0.7) : 0)) % 1;
      for (let k = 0; k < 5; k++) for (let m = 0; m < 2; m++) {
        const yy = cy - hh + 14 + (k + m * 0.4 + 0.3) * (hh * 2 - 28) / 5;
        const u = fwd ? (((k * 0.37 + m * 0.5 + flow) % 1)) : 0.5 + 0.1 * m;
        const hx = lerp(cx - hw + 14, cx - 14, u), ex = lerp(cx + hw - 14, cx + 14, u);
        if (m === 0) hDot(hx, yy, 5.5); else eDot(ex, yy, 5);
      }
      l.ph.forEach((p) => { const q = p.t / 1.1, x = cx + q * (hw + 20) * (1) , y = cy + p.y * hh * 0.7 - q * 20; ctx.save(); ctx.globalAlpha = 1 - q; D.glow(cx, cy + p.y * hh * 0.7, 14, colHex, 0.6 * (1 - q)); ctx.strokeStyle = colHex; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 22; i++) { const xx = cx + q * hw + i, yy = cy + p.y * hh * 0.7 - q * 24 + 5 * Math.sin(i / 3 - S.t * 12); if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); ctx.restore(); });
      T(cx, cy + hh + 24, fwd ? (l.burnt ? 'LED가 타 버려서 전류도, 빛도 없어요' : I > 0.5 ? '전자와 양공이 접합부에서 만나 빛(광자)을 내요' : '전류가 약해서 빛이 거의 없어요') : '장벽이 높아져 전자와 양공이 만나지 못해요', PHONE ? 11.5 : 12.5, '#3a465c', 'center', 800);
      // 정보
      const f = g.f; panel(f[0], f[1], f[2], f[3]);
      T(f[0] + 14, f[1] + 26, '전류 제한 저항 계산', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      textBlock(f[0] + 14, f[1] + 54, PHONE ? f[2] - 28 : 400, '전원 ' + V_SRC + ' V − LED ' + f1(led.vf) + ' V = 저항에 걸리는 ' + f1(V_SRC - led.vf) + ' V\nI = ' + f1(V_SRC - led.vf) + ' V / ' + l.R + ' Ω = ' + f1(ledI(l.col, l.R, 'fwd')) + ' mA' + (ledI(l.col, l.R, 'fwd') > I_MAXLED ? '  (너무 커요!)' : ''), PHONE ? 13.5 : 15, '#26324a', 24, 800);
      textBlock(f[0] + 14, f[1] + (PHONE ? 118 : 128), PHONE ? f[2] - 28 : 400, '띠 간격 ' + f1(led.eg) + ' eV → 광자 에너지 ≈ ' + f1(led.eg) + ' eV → 파장 ≈ ' + lam + ' nm (' + led.name + '). 띠 간격이 클수록 파란 빛이에요. 목표 전류는 ' + I_TGT + ' mA, ' + I_MAXLED + ' mA를 넘으면 타요.', PHONE ? 12 : 13, '#3a465c', PHONE ? 17 : 18, 700);
      if (!PHONE) {
        const bx = f[0] + 450, by = f[1] + 36, bw = 150, bhh = 120, sc = bhh / 3.0;
        T(bx + bw / 2 + 20, f[1] + 24, '띠 그림', 13, '#26324a', 'center', 800);
        const cb = by + 12, vbT = cb + led.eg * sc * 0.0 + 28 + (led.eg - 1.5) * sc * 0.7;
        const yC = by + 8, yV = by + 8 + 26 + led.eg * (bhh - 56) / 2.7;
        D.roundRect(bx, yC, bw, 26, 6); ctx.fillStyle = 'rgba(242,107,58,.15)'; ctx.fill(); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; ctx.stroke();
        D.roundRect(bx, yV, bw, 26, 6); ctx.fillStyle = 'rgba(47,109,246,.2)'; ctx.fill(); ctx.strokeStyle = '#2f6df6'; ctx.stroke();
        T(bx + bw + 8, yC + 18, '전도띠', 12, '#c2410c', 'left', 800); T(bx + bw + 8, yV + 18, '원자가띠', 12, '#1d4ed8', 'left', 800);
        eDot(bx + 40, yC + 13, 5.5); const tt = (S.t * 1.4) % 1; D.arrow(bx + 40, yC + 30, bx + 40, yV - 2, { color: colHex, width: 3, head: 9 }); hDot(bx + 40, yV + 13, 5.5);
        D.arrow(bx + 100, yC + 30 + 0, bx + 100, yV - 2, { color: 'rgba(0,0,0,0)', width: 1 });
        T(bx + 108, (yC + 26 + yV) / 2 + 4, 'E = ' + f1(led.eg) + ' eV', 12.5, '#26324a', 'left', 800);
        T(bx + bw / 2 + 20, yV + 48, '재결합하며 빛 방출', 12, '#5a6679', 'center', 700);
      }
    } else {
      const c = g.c, z = g.z, f = g.f, eph = HC / (l.sl === 'vis' ? NM_VIS : NM_IR), ok = eph >= EG_SI;
      panel(14, 14, PHONE ? 456 : 772, PHONE ? 330 : 330);
      const px = PHONE ? 12 : 14, pw = PHONE ? 456 : 772;
      T(px + 14, 40, '태양 전지(p-n 접합)에 빛을 비추면', PHONE ? 13 : 15, '#26324a', 'left', 800);
      const cx0 = px + (PHONE ? 60 : 120), cw = PHONE ? 250 : 400, nTop = 130, nH = 30, depH = 40, pH = 74;
      const yN = nTop, yD = nTop + nH, yP = yD + depH;
      D.shadow(() => { D.roundRect(cx0, yN, cw, nH, 6); ctx.fillStyle = '#d9e5ff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = 'rgba(150,160,180,.35)'; ctx.fillRect(cx0, yD, cw, depH);
      D.roundRect(cx0, yP, cw, pH, 6); ctx.fillStyle = '#ffe3d1'; ctx.fill();
      ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 2; ctx.strokeRect(cx0, yN, cw, nH + depH + pH);
      T(cx0 + 10, yN + 20, 'n형 (얇은 층)', 12.5, '#1d4ed8', 'left', 800); T(cx0 + 10, yD + 25, '공핍층 · 전기장 ↓ (n → p)', 12.5, '#26324a', 'left', 800); T(cx0 + 10, yP + 24, 'p형', 12.5, '#c2410c', 'left', 800);
      // 전기장 표시
      for (let k = 0; k < 3; k++) D.arrow(cx0 + cw * (0.7 + 0.12 * k), yD + 4, cx0 + cw * (0.7 + 0.12 * k), yD + depH - 4, { color: 'rgba(20,160,88,.55)', width: 2.4, head: 8 });
      // 외부 회로
      const wx = cx0 + cw + (PHONE ? 20 : 60), wy0 = yN + 8, wy1 = yP + pH - 8;
      const path = [[cx0 + cw, wy0], [wx, wy0], [wx, wy1], [cx0 + cw, wy1]];
      wire(path); resistor(wx, (wy0 + wy1) / 2, 44, 26, ''); D.sphere(wx, (wy0 + wy1) / 2, 18, '#fff', { gloss: false, outline: '#394258' }); T(wx, (wy0 + wy1) / 2 + 5, 'A', 15, '#26324a', 'center', 800);
      T(wx, wy0 - 10, fmtI(l.sI / 1000) + ' mA', 13, '#0f7a43', 'center', 800);
      if (l.sI > 0.1) for (let k = 0; k < 8; k++) { const pp = polyPos(path, 1 - ((S.t * clamp(l.sI / 80, 0.1, 0.5) + k / 8) % 1)); ctx.beginPath(); ctx.arc(pp[0], pp[1], 3, 0, TAU); ctx.fillStyle = '#e2552a'; ctx.fill(); }
      // 광자
      const phc = ok ? wlSolid(NM_VIS) : '#c2410c';
      l.sph.forEach((p) => { const x = cx0 + p.x * cw, y = lerp(60, ok ? yD + depH / 2 : yP + pH + 6, Math.min(1, p.t / (ok ? 0.45 : 1))); if (ok && p.t >= 0.45) return; D.glow(x, y, 14, phc, 0.5); ctx.strokeStyle = phc; ctx.lineWidth = 3; ctx.beginPath(); for (let i = -16; i <= 16; i += 2) { const xx = x + 5 * Math.sin(i / 4 * 1.2), yy = y + i; if (i === -16) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); });
      l.car.forEach((c2) => { const x = cx0 + c2.x * cw, q = SciSim.ease.outCubic(clamp(c2.t, 0, 1)); eDot(x + 8 * q, lerp(yD + depH / 2, yN + nH / 2, q), 5.5); hDot(x - 8 * q, lerp(yD + depH / 2, yP + pH / 2, q), 5.5); });
      D.label(px + pw / 2, 76, '광자 에너지 ' + f2(eph) + ' eV ' + (ok ? '≥' : '<') + ' 띠 간격 ' + f1(EG_SI) + ' eV → ' + (ok ? '전자–양공 쌍이 생겨요' : '쌍이 생기지 않아요'), { bg: ok ? '#14a058' : '#e2464b', size: PHONE ? 12 : 13.5 });
      const y2 = PHONE ? 352 : 352, ph2 = PHONE ? 356 : 194;
      panel(px, y2, pw, ph2);
      T(px + 14, y2 + 26, '광전류 ∝ 빛의 세기', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      const bw = pw - 28, by = y2 + 44; ctx.fillStyle = '#eef1f7'; ctx.fillRect(px + 14, by, bw, 20); ctx.fillStyle = '#14a058'; ctx.fillRect(px + 14, by, bw * clamp(l.sI / I_SC, 0, 1), 20);
      T(px + 14, by + 38, '0', 11.5, '#5a6679', 'left', 700); T(px + 14 + bw, by + 38, I_SC + ' mA', 11.5, '#5a6679', 'right', 700);
      T(px + 14 + bw * clamp(l.sI / I_SC, 0, 1), by + 38, f1(l.sI) + ' mA', 12.5, '#0f7a43', l.sI / I_SC > 0.85 ? 'right' : 'left', 800);
      textBlock(px + 14, by + 64, pw - 28, '빛이 접합부에서 전자–양공 쌍을 만들면 전기장이 전자는 n형 쪽, 양공은 p형 쪽으로 갈라놓아요. 이렇게 쌓인 전하가 외부 회로로 흐르는 것이 광전류예요. 전지 1개의 전압은 약 ' + f2(V_OC) + ' V예요. (세기 100 %일 때 ' + I_SC + ' mA)', PHONE ? 12.5 : 13.5, '#3a465c', PHONE ? 18 : 20, 700);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 읽음 칸 ---------- */
  function updReadouts() {
    if (S.mode === 'junc') {
      const j = S.j; readouts('접합 상태', j.joined ? '접합됨' : j.joining ? '맞대는 중' : '떨어져 있음', '공핍층', j.depDone + ' / ' + DEP_MAX + ' 열', '전위 장벽', f1(V_BI * clamp(j.wv / DEP_MAX, 0, 1)) + ' V');
    } else if (S.mode === 'iv') {
      const v = S.v; readouts('다이오드 전압 V_D', f2(v.vd) + ' V', '전류 I', fmtI(v.I) + ' mA', '공핍층 폭', f2(v.W) + ' (평형 = 1)');
    } else if (S.mode === 'rect') {
      const r = S.r; readouts('회로', r.mode === 'half' ? '반파 정류' : '브리지 (전파 정류)', '출력 전압', (r.cur.out >= 0 ? '+' : '−') + f1(Math.abs(r.cur.out)) + ' V', '축전기', r.cap === 'on' ? '연결' : '없음');
    } else if (S.l.sub === 'led') {
      const l = S.l; readouts('LED', LED[l.col].name + ' · ' + lamOfEg(LED[l.col].eg) + ' nm', '전류 I', f1(l.I || 0) + ' mA', '저항 R', l.R + ' Ω');
    } else {
      const l = S.l; readouts('빛', l.sl === 'vis' ? '가시광 ' + NM_VIS + ' nm' : '적외선 ' + NM_IR + ' nm', '세기', l.inten + ' %', '광전류', f1(l.sI || 0) + ' mA');
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  $('#bJoin').addEventListener('click', joinNow); $('#bSep').addEventListener('click', separateNow);
  $('#sVs').addEventListener('input', (e) => { S.v.vs = Math.round(+e.target.value * 100) / 100; Sound.tick(); updateCtl(); });
  $('#bRec').addEventListener('click', () => { Sound.click(); recordIV(); });
  $('#bRecClear').addEventListener('click', () => { Sound.click(); S.v.rows = []; });
  $$('#rmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.mode = b.dataset.v; updateCtl(); }));
  $$('#capSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.cap = b.dataset.v; updateCtl(); }));
  $('#bFlip').addEventListener('click', flipHalf);
  $$('#colSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l.col = b.dataset.v; S.l.burnt = false; S.l.burnT = 0; updateCtl(); }));
  const rSeg = $('#rSeg'); R_OPT.forEach((R) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = R; b.textContent = R + ' Ω'; b.addEventListener('click', () => { Sound.click(); S.l.R = R; S.l.burnt = false; S.l.burnT = 0; updateCtl(); }); rSeg.appendChild(b); });
  $$('#polSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l.pol = b.dataset.v; updateCtl(); }));
  $$('#slSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l.sl = b.dataset.v; updateCtl(); }));
  $('#sInt').addEventListener('input', (e) => { S.l.inten = +e.target.value; Sound.tick(); updateCtl(); });
  const FLD = [
    ['접합면 근처 공핍층의 전기장 방향은?', [['np', 'n형 → p형'], ['pn', 'p형 → n형']], 'np'],
    ['전위가 더 높은 쪽은?', [['n', 'n형 쪽'], ['p', 'p형 쪽']], 'n'],
    ['이 전위 장벽은 n형의 전자가 p형으로 넘어가는 확산을', [['stop', '막아요'], ['help', '도와요']], 'stop'],
  ];
  const fldSels = mkSelects($('#fldRows'), FLD, fldSt, fldOk);
  const resetSel = (sels, st, ok) => { Object.keys(st).forEach((k) => delete st[k]); Object.keys(ok).forEach((k) => delete ok[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); };

  /* ================= 미션 ================= */
  const rowNear = (v) => v.rows.some((r) => r.vd >= 0.65 && r.vd <= 0.75);
  const rowLow = (v) => v.rows.some((r) => r.vd >= 0.2 && r.vd <= 0.5);
  const rowRev = (v) => v.rows.some((r) => Math.abs(r.vs - VS_MIN) < 1e-9);
  const levels = [
    {
      title: 'p형과 n형을 맞대면', short: '접합', icon: '🔺', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 충전기에는 왜 다이오드가 들어갈까? 전지 방향을 반대로 끼우면 LED는 왜 안 켜질까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(에너지띠와 반도체)에서</b> 불순물을 넣어 전자가 많은 <b>n형</b>과 양공이 많은 <b>p형</b> 반도체를 만들었어요. 둘을 맞대면 접합면에서 어떤 일이 생길까요?</div>' +
        '<p><b>🔍 입자 모형</b>으로 접합면 근처를 살펴봐요. 네모는 제자리에 고정된 이온이고, 동그라미는 움직이는 전하(양공 ⊕, 전자 ⊖)예요.</p>',
      features: ['junc'],
      setup() { separateNow(); S.j = mkJ(); need = ''; resetSel(fldSels, fldSt, fldOk); setScene('junc'); updateCtl(); },
      recap: 'p형과 n형을 맞대면 접합면 근처에서 전자와 양공이 서로 확산해 만나서 사라지고, 이동 전하가 없는 공핍층이 생겨요. 남은 고정 이온이 n → p 방향의 전기장과 약 0.7 V의 전위 장벽을 만들어 더 이상의 확산을 막아요.',
      summary: '<ul><li>p형(다수 = 양공)과 n형(다수 = 전자)을 접합하면 농도 차이로 전자는 p쪽으로, 양공은 n쪽으로 <b>확산</b>해 만나서 사라져요.</li><li>접합면 근처에는 이동 전하가 없는 <b>공핍층</b>이 생기고, n쪽의 <b>+ 이온</b>과 p쪽의 <b>− 이온</b>이 드러나 <b>n → p 방향의 전기장</b>이 생겨요.</li><li>그 결과 n형 쪽의 전위가 더 높은 <b>전위 장벽(약 ' + f1(V_BI) + ' V)</b>이 생겨 전하의 확산을 막아요 → 확산이 멈춰 공핍층의 폭이 일정해져요.</li></ul>',
      missions: [
        {
          title: '접합해서 공핍층 만들기',
          goal: '<b>🔗 접합하기</b>를 눌러 두 반도체를 맞대고, 접합면 양쪽 <b>' + DEP_MAX + '열</b>의 전자와 양공이 사라져 공핍층이 만들어질 때까지 기다리세요.',
          hint: '접합하기 버튼을 누른 뒤 화면을 지켜봐요. 약 3초 뒤 접합면 양쪽에서 전자와 양공이 만나 사라지고 회색 공핍층이 나타나요.',
          setup() { need = ''; updateCtl(); setScene('junc'); },
          check: () => S.j.seen.dep && S.j.joined,
          hold: 0.1,
          status: () => mark(S.j.joined) + ' 접합함 &nbsp; ' + mark(S.j.depDone >= DEP_MAX) + ' 공핍층 형성 (' + S.j.depDone + ' / ' + DEP_MAX + ' 열)',
          explain: '접합면 가까이의 전자(n형)와 양공(p형)이 서로 확산해 만나 사라지면서, 이동 전하가 없는 <b>공핍층</b>이 생겨요. 이 자리에는 움직일 수 없는 + 이온(n쪽)과 − 이온(p쪽)만 남아요.',
        },
        {
          title: '전기장과 전위 장벽의 방향', manual: true,
          goal: '공핍층의 전기장 방향, 전위가 더 높은 쪽, 장벽이 확산에 미치는 영향을 고르고 ✔ 확인하기를 누르세요.',
          hint: '전기장은 + 전하(n쪽의 + 이온)에서 − 전하(p쪽의 − 이온)로 향해요. 전위는 + 이온이 있는 쪽이 높아요. 전위 그래프를 보세요.',
          setup() { need = 'fld'; resetSel(fldSels, fldSt, fldOk); updateCtl(); setScene('junc'); if (!S.j.joined && !S.j.joining) joinNow(); },
          check() {
            const r = checkSelects(FLD, fldSels, fldSt, fldOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 화면의 전기장 화살표와 전위 그래프를 확인해 보세요.' : true;
          },
          status: () => '고른 칸 ' + FLD.filter((w, i) => fldSt[i]).length + ' / ' + FLD.length,
          explain: '공핍층에서는 n쪽의 <b>+ 이온</b>에서 p쪽의 <b>− 이온</b> 쪽으로 전기장이 향해요 (n → p). 그래서 <b>n형 쪽의 전위가 약 ' + f1(V_BI) + ' V 더 높고</b>, 전자가 n에서 p로 넘어가려면 오르막을 올라야 해서 확산이 <b>막혀요</b>.',
        },
        {
          type: 'quiz', title: '확산이 멈추는 까닭',
          goal: '공핍층이 어느 정도 커진 뒤 전자와 양공의 확산이 멈추는 까닭은?',
          setup() { need = ''; updateCtl(); setScene('junc'); },
          choices: ['전위 장벽(전기장)이 전하의 확산을 막기 때문', '전자와 양공이 모두 없어졌기 때문', '농도 차이가 더 커졌기 때문', '반도체가 가열되었기 때문'],
          answer: 0,
          feedback: ['', '접합면에서 먼 곳에는 전자와 양공이 많이 남아 있어요. 접합면 근처만 사라졌어요.', '확산은 농도 차이 때문에 일어나요. 멈추는 것은 전기장이 반대 방향으로 막기 때문이에요.', '가열은 관계가 없어요. 접합면의 이온이 만든 전기장이 핵심이에요.'],
          explain: '공핍층에 드러난 이온이 만든 <b>n → p 방향의 전기장</b>이 전자를 n쪽으로, 양공을 p쪽으로 되밀어요. 확산하려는 경향과 이 전기장이 균형을 이루면 확산이 멈추고 공핍층의 폭이 일정해져요.',
        },
      ],
    },
    {
      title: '전압의 방향에 따른 전류', short: '전압 방향', icon: '📈', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> p-n 접합에 공핍층과 약 ' + f1(V_BI) + ' V의 전위 장벽이 생긴다는 것을 알았어요. 바깥에서 전압을 걸면 이 장벽이 어떻게 달라질까요?</div>' +
        '<p>전원 전압 V<sub>s</sub>를 −' + Math.abs(VS_MIN) + ' V ~ +' + VS_MAX + ' V로 바꾸며 <b>공핍층의 폭</b>과 <b>전류</b>를 관찰하고 I–V 그래프를 완성해요. 회로에는 ' + R_SER + ' Ω 보호 저항이 있어요.</p>',
      features: ['iv'],
      setup() { S.v = mkV(); need = ''; setScene('iv'); updateCtl(); },
      recap: '순방향(p형에 + 극)에서는 공핍층이 좁아지고 장벽이 낮아져 약 0.7 V부터 전류가 급격히 늘어요. 역방향에서는 공핍층이 넓어지고 장벽이 높아져 전류가 거의 0이에요. 그래서 다이오드는 전류를 한쪽 방향으로만 흘려요.',
      summary: '<ul><li><b>순방향</b>(p형에 + 극): 공핍층이 <b>좁아지고</b> 장벽이 낮아져 전자와 양공이 접합면을 넘어요 → 전류가 흘러요. 규소 다이오드는 약 <b>' + f1(V_BI) + ' V</b> 이상에서 급증해요.</li><li><b>역방향</b>(p형에 − 극): 공핍층이 <b>넓어지고</b> 장벽이 높아져 전류가 거의 <b>0</b>이에요.</li><li>I–V 그래프는 직선이 아니에요 (옴의 법칙을 따르는 저항과 달라요). 문턱 전압 아래에서는 거의 0이다가 넘으면 급격히 증가해요.</li><li>다이오드는 한쪽 방향으로만 전류를 흘리는 <b>정류</b> 소자예요.</li></ul>',
      missions: [
        {
          title: '순방향 문턱과 역방향 전류 측정하기',
          goal: '전압을 바꿔 가며 <b>📏 이 점 기록하기</b>로 ① 다이오드 전압 V<sub>D</sub>가 <b>0.65 ~ 0.75 V</b>인 점, ② V<sub>D</sub>가 <b>0.2 ~ 0.5 V</b>인 점, ③ 역방향 최대 전압 <b>V<sub>s</sub> = −5 V</b>인 점을 기록하세요.',
          hint: '전원 전압을 0.8 V 근처까지 올리면 V_D가 0.7 V쯤 돼요. 0.3 V ~ 0.5 V에서 전류가 거의 없는지도 확인해요. 마지막으로 슬라이더를 왼쪽 끝(−5 V)에 두고 기록해요.',
          setup() { need = ''; updateCtl(); setScene('iv'); },
          check: () => rowNear(S.v) && rowLow(S.v) && rowRev(S.v),
          hold: 0.2,
          status: () => mark(rowNear(S.v)) + ' V_D 0.65~0.75 V &nbsp; ' + mark(rowLow(S.v)) + ' V_D 0.2~0.5 V &nbsp; ' + mark(rowRev(S.v)) + ' V_s = −5 V<br>지금: V_s = ' + f2(S.v.vs) + ' V → V_D = ' + f2(S.v.vd) + ' V, I = ' + fmtI(S.v.I) + ' mA',
          explain: 'V<sub>D</sub> ≈ 0.7 V에서 전류는 약 <b>' + fmtI(iDiode(0.7)) + ' mA</b>이지만, V<sub>D</sub> = 0.5 V에서는 <b>' + fmtI(iDiode(0.5)) + ' mA</b>로 거의 0이에요. 역방향 −5 V에서는 <b>' + fmtI(iDiode(solveVd(-5))) + ' mA</b>(거의 0)예요. 문턱 전압을 넘으면 전류가 급격히 늘어나는 비선형 그래프가 돼요.',
        },
        {
          type: 'quiz', title: '다이오드의 I–V 그래프',
          goal: '순방향 전압을 0에서 올려 갈 때 전류의 변화로 옳은 것은?',
          setup() { need = ''; updateCtl(); setScene('iv'); },
          choices: ['전압에 비례해서 일정하게 증가한다 (저항처럼)', '처음에는 거의 0이다가 약 0.7 V를 넘으면 급격히 증가한다', '전압이 커질수록 전류가 줄어든다', '전압과 관계없이 일정하다'],
          answer: 1,
          feedback: ['그래프가 직선이 아니에요. 점을 기록해 곡선의 모양을 확인해 보세요.', '', '전류는 오히려 늘어나요. 그래프의 오른쪽을 보세요.', '전압을 바꾸면 전류가 크게 달라져요.'],
          explain: '순방향 전압이 작을 때는 전위 장벽이 아직 높아 전류가 거의 없고, 전압이 약 <b>' + f1(V_BI) + ' V</b>에 가까워 장벽이 충분히 낮아지면 전자와 양공이 접합면을 많이 넘어 전류가 <b>급격히 증가</b>해요. 전압에 비례하는 저항(옴의 법칙)과 달라요.',
        },
      ],
    },
    {
      title: '다이오드로 교류를 직류로', short: '정류', icon: '〰️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 다이오드가 전류를 한쪽 방향으로만 흘린다는 것을 알았어요. 교류는 전류의 방향이 계속 바뀌는데, 이것을 다이오드에 연결하면 어떻게 될까요? (스마트폰 충전기 어댑터에 들어 있는 회로예요.)</div>' +
        '<p>진폭 ' + V_AMP + ' V의 <b>교류</b>를 다이오드 1개(<b>반파 정류</b>)와 다이오드 4개(<b>브리지</b>, <b>전파 정류</b>)에 연결하고, 부하에 병렬로 <b>축전기</b>를 달면 파형이 어떻게 달라지는지 관찰해요.</p>',
      features: ['rect'],
      setup() { S.r = mkR(); need = ''; setScene('rect'); updateCtl(); },
      recap: '다이오드 1개는 교류의 한쪽 반주기만 통과시키는 반파 정류, 다이오드 4개의 브리지는 두 반주기를 모두 같은 방향으로 바꾸는 전파 정류예요. 축전기를 병렬로 달면 물결이 줄어 직류에 가까워져요. 다이오드를 반대로 달면 출력의 극성이 뒤집혀요.',
      summary: '<ul><li><b>반파 정류</b>: 다이오드 1개 → + 반주기만 통과. 출력 최댓값은 약 ' + f1(V_AMP - V_LOSS) + ' V (' + V_AMP + ' V − 다이오드 강하 ' + f1(V_LOSS) + ' V).</li><li><b>전파 정류</b>: 다이오드 4개(브리지) → 두 반주기 모두 같은 방향. 출력 최댓값 약 ' + f1(V_AMP - 2 * V_LOSS) + ' V (다이오드 2개를 지나므로).</li><li>부하와 <b>병렬로 축전기</b>를 달면 전압이 올라갈 때 충전하고 내려갈 때 방전해 <b>평활</b>돼요 → 직류에 가까워져요. 스마트폰 충전기 어댑터의 구조예요.</li><li>전자 기기는 <b>직류</b>가 필요해요. 다이오드를 반대로 달면 출력 극성이 뒤집혀요.</li></ul>',
      missions: [
        {
          title: '반파 정류 파형 만들기',
          goal: '<b>다이오드 1개</b> 회로에서 출력이 <b>+쪽 반파</b>가 되게 하고(축전기 없이 2초 이상), 다이오드 방향을 <b>2번 이상 뒤집어</b> 출력 극성이 바뀌는 것도 확인하세요.',
          hint: '처음에는 다이오드가 거꾸로 달려 있어서 출력이 −쪽이에요. 🔄 다이오드 방향 뒤집기(또는 화면의 다이오드를 눌러요)를 눌러 + 쪽으로 만들고, 한 번 더 뒤집었다가 다시 +쪽으로 맞춰요.',
          setup() { need = ''; S.r.mode = 'half'; S.r.cap = 'off'; S.r.tHalf = 0; S.r.flips = 0; S.r.seen = {}; updateCtl(); setScene('rect'); },
          check: () => S.r.seen.half,
          hold: 0.2,
          status: () => mark(S.r.mode === 'half' && S.r.dir > 0 && S.r.cap === 'off' && S.r.tHalf > 2) + ' +쪽 반파 정류 2초 (' + f1(Math.min(2, S.r.tHalf)) + ' / 2.0초) &nbsp; ' + mark(S.r.flips >= 2) + ' 뒤집기 ' + S.r.flips + ' / 2번',
          explain: '다이오드는 순방향일 때만 전류를 흘리므로 교류의 <b>한쪽 반주기만</b> 통과시켜요 (반파 정류). 출력 최댓값은 ' + V_AMP + ' − ' + f1(V_LOSS) + ' = <b>' + f1(V_AMP - V_LOSS) + ' V</b>예요. 다이오드를 반대로 달면 반대쪽 반주기만 통과해 <b>출력 극성이 뒤집혀요</b>.',
        },
        {
          title: '브리지 회로 배선하고 평활하기', manual: true,
          goal: '<b>다이오드 4개(브리지)</b>를 눌러 네 개의 방향을 맞추고, <b>축전기를 연결</b>해 직류에 가까운 + 출력을 만든 뒤 ✔ 확인하기를 누르세요.',
          hint: '처음에는 네 다이오드가 모두 거꾸로예요. 출력 단자 + 쪽(위)으로 전류가 모이도록 D1, D2는 + 단자(위) 쪽을, D3, D4는 − 단자(아래)에서 입력 쪽을 향하게 해요. 파형이 − 쪽이면 모두 반대, 단락 경고가 나오면 두 개만 뒤집힌 거예요.',
          setup() { need = ''; S.r.mode = 'bridge'; S.r.cap = 'off'; S.r.br = [false, false, false, false]; updateCtl(); setScene('rect'); },
          check() {
            const r = S.r;
            if (r.mode !== 'bridge') return '먼저 다이오드 4개(브리지) 회로를 골라요.';
            if (!bridgeOK(r)) return r.cur.short || r.shortT > 0 ? '아직 방향이 맞지 않아 단락이 생겨요. 네 다이오드의 방향(삼각형)을 다시 확인해 보세요.' : '출력이 아직 + 방향의 전파 정류 파형이 아니에요. 네 다이오드의 방향을 다시 맞춰 보세요.';
            if (r.cap !== 'on') return '배선은 맞았어요! 이제 부하와 병렬로 축전기를 연결해 물결을 줄여 보세요.';
            return true;
          },
          status: () => mark(bridgeOK(S.r) && S.r.mode === 'bridge') + ' 4개의 방향이 올바름 (' + S.r.br.filter(Boolean).length + ' / 4) &nbsp; ' + mark(S.r.cap === 'on') + ' 축전기 연결',
          explain: '브리지 회로는 입력 극성에 관계없이 항상 <b>두 개의 다이오드</b>가 전류를 + 단자 쪽으로 보내서 두 반주기를 모두 +로 만들어요 (전파 정류). 출력 최댓값은 ' + V_AMP + ' − 2 × ' + f1(V_LOSS) + ' = <b>' + f1(V_AMP - 2 * V_LOSS) + ' V</b>예요. 병렬 <b>축전기</b>는 전압이 낮아질 때 방전하여 물결을 평평하게 만들어요.',
        },
        {
          type: 'quiz', title: '다이오드를 거꾸로 달면?',
          goal: '반파 정류 회로에서 다이오드를 반대 방향으로 달면 출력은 어떻게 될까요?',
          setup() { need = ''; S.r.mode = 'half'; updateCtl(); setScene('rect'); },
          choices: ['출력이 사라진다 (항상 0)', '− 쪽 반주기만 통과해 출력의 극성이 뒤집힌다', '출력이 교류 그대로 나온다', '출력이 두 배가 된다'],
          answer: 1,
          feedback: ['방향이 반대여도 반대쪽 반주기에는 전류가 흘러요.', '', '다이오드는 한쪽 방향만 통과시키므로 교류 그대로는 나오지 않아요.', '다이오드는 전압을 키우지 못해요. 오히려 0.7 V 정도 줄어요.'],
          explain: '다이오드는 순방향일 때만 전류를 흘려요. 반대로 달면 <b>− 쪽 반주기</b>에서 순방향이 되어 출력이 <b>음(−)</b>이 돼요. 전자 기기는 보통 + 극과 − 극이 정해진 <b>직류</b>가 필요해서 다이오드 방향이 중요해요.',
        },
      ],
    },
    {
      title: 'LED와 태양 전지', short: 'LED·전지', icon: '💡', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> p-n 접합에서 전자와 양공이 만나고(재결합), 접합의 전기장이 전하를 갈라놓는다는 것을 배웠어요. 이 두 현상이 <b>LED</b>와 <b>태양 전지</b>의 원리예요.</div>' +
        '<p><b>LED</b>: 순방향 전류가 흐르면 전자와 양공이 접합부에서 재결합하며 <b>띠 간격에 해당하는 에너지의 빛</b>을 내요. <b>태양 전지</b>: 빛이 접합부에 전자–양공 쌍을 만들면 전기장이 둘을 갈라놓아 전류가 흘러요. (위쪽 버튼으로 두 화면을 바꿔요.)</p>',
      features: ['led'],
      setup() { S.l = mkL(); need = ''; setScene('led'); updateCtl(); },
      recap: 'LED는 순방향 전류에서 전자와 양공이 접합부에서 재결합하며 띠 간격만큼의 에너지를 가진 빛을 내고, 전류 제한 저항으로 전류를 약 20 mA로 맞춰요. 태양 전지는 빛이 만든 전자–양공 쌍을 접합의 전기장이 갈라 전류를 만들며, 광자 에너지가 띠 간격보다 작은 빛은 전류를 만들지 못해요.',
      summary: '<ul><li><b>LED</b>: 순방향 전류 → 접합부에서 전자와 양공이 <b>재결합</b>하며 빛(광자 에너지 ≈ 띠 간격). 빨강 ' + f1(LED.red.eg) + ' eV(≈ ' + lamOfEg(LED.red.eg) + ' nm), 초록 ' + f1(LED.green.eg) + ' eV(≈ ' + lamOfEg(LED.green.eg) + ' nm), 파랑 ' + f1(LED.blue.eg) + ' eV(≈ ' + lamOfEg(LED.blue.eg) + ' nm) → 띠 간격이 클수록 파란 빛.</li><li><b>전류 제한 저항</b>: R = (전원 − LED 전압) ÷ 목표 전류 = (' + V_SRC + ' − ' + f1(LED.red.vf) + ') V ÷ ' + (I_TGT / 1000).toFixed(3) + ' A = <b>' + Math.round((V_SRC - LED.red.vf) / (I_TGT / 1000)) + ' Ω</b> (빨간 LED). 저항이 너무 작으면 전류가 커져 타 버려요.</li><li>LED는 <b>역방향</b>에서는 장벽이 높아져 재결합이 없어 켜지지 않아요.</li><li><b>광다이오드 · 태양 전지</b>: 빛 → 접합부에 전자–양공 쌍 → 전기장이 전자는 n형, 양공은 p형으로 분리 → 전류. 광전류는 빛의 세기에 비례하고, 광자 에너지가 띠 간격(규소 ' + f1(EG_SI) + ' eV)보다 작은 적외선은 쌍을 만들지 못해요.</li></ul>',
      missions: [
        {
          title: '빨간 LED에 알맞은 저항 고르기',
          goal: '<b>빨간 LED</b>를 <b>정방향</b>으로 연결하고, 전류를 목표 <b>' + I_TGT + ' mA</b> 안팎(' + 18 + ' ~ ' + 22 + ' mA)으로 맞추는 저항을 골라 1초 가까이 유지하세요.',
          hint: 'R = (전원 − LED 전압) ÷ 전류 = (' + V_SRC + ' − ' + f1(LED.red.vf) + ') V ÷ ' + (I_TGT / 1000).toFixed(3) + ' A. 이 값에 가장 가까운 저항을 골라요. 저항이 너무 작으면 LED가 타 버려요.',
          setup() { need = ''; S.l.sub = 'led'; S.l.col = 'red'; S.l.pol = 'fwd'; S.l.R = 330; updateCtl(); setScene('led'); },
          check: () => S.l.seen.led,
          hold: 0.1,
          status: () => mark(S.l.col === 'red') + ' 빨간 LED &nbsp; ' + mark(S.l.pol === 'fwd') + ' 정방향 &nbsp; ' + mark(S.l.tOK > 0.3 || S.l.seen.led) + ' 전류 ' + f1(S.l.I || 0) + ' mA (18 ~ 22 mA)',
          explain: 'R = (' + V_SRC + ' − ' + f1(LED.red.vf) + ') V ÷ ' + (I_TGT / 1000).toFixed(3) + ' A = <b>' + Math.round((V_SRC - LED.red.vf) / (I_TGT / 1000)) + ' Ω</b>. 이때 전류는 정확히 ' + I_TGT + ' mA예요. 저항이 ' + R_OPT[0] + ' Ω이면 전류가 ' + f1(ledI('red', R_OPT[0], 'fwd')) + ' mA로 너무 커서 LED가 타 버려요.',
        },
        {
          title: '태양 전지로 광전류 만들기',
          goal: '<b>태양 전지</b> 화면에서 <b>가시광</b>의 세기를 <b>80 % 이상</b>으로 올려 광전류를 만들고, <b>적외선</b>을 100 %로 비춰도 전류가 생기지 않는 것을 확인하세요.',
          hint: '위쪽에서 “태양 전지”를 고르고 빛에서 가시광을 골라 세기 슬라이더를 오른쪽으로 올려요. 그다음 적외선으로 바꿔 세기를 높여도 전류가 0인지 1~2초 지켜봐요.',
          setup() { need = ''; S.l.sub = 'sol'; S.l.seen = {}; S.l.sOK = 0; S.l.sOK2 = 0; updateCtl(); setScene('led'); },
          check: () => S.l.seen.vis && S.l.seen.ir,
          hold: 0.1,
          status: () => mark(S.l.seen.vis) + ' 가시광 80 % 이상 (지금 ' + (S.l.sl === 'vis' ? S.l.inten + ' %' : '—') + ') &nbsp; ' + mark(S.l.seen.ir) + ' 적외선 80 % 이상에서도 전류 0',
          explain: '가시광(' + NM_VIS + ' nm)의 광자 에너지는 ' + f2(HC / NM_VIS) + ' eV로 규소의 띠 간격 ' + f1(EG_SI) + ' eV보다 커서 전자–양공 쌍을 만들어요. 세기 100 %에서 광전류는 ' + I_SC + ' mA(세기에 비례). 적외선(' + NM_IR + ' nm)은 ' + f2(HC / NM_IR) + ' eV로 모자라서 아무리 세게 비춰도 전류가 0이에요.',
        },
        {
          type: 'quiz', title: '전지를 반대로 끼우면 LED가 안 켜지는 까닭',
          goal: 'LED의 전지를 반대로 연결하면 켜지지 않는 까닭은?',
          setup() { need = ''; S.l.sub = 'led'; updateCtl(); setScene('led'); },
          choices: ['역방향에서는 전위 장벽이 높아지고 공핍층이 넓어져 전류가 거의 흐르지 않기 때문', 'LED 속의 전자가 모두 사라지기 때문', '역방향에서는 저항이 0이 되기 때문', '전지의 전압이 낮아지기 때문'],
          answer: 0,
          feedback: ['', '전자는 사라지지 않아요. 접합부에서 전자와 양공이 만나지 못하는 거예요.', '저항이 0이면 전류가 커져야 하는데, 오히려 전류가 거의 0이에요.', '전지의 전압은 같아요. 연결 방향만 달라졌어요.'],
          explain: '역방향 전압은 전위 장벽을 <b>더 높이고 공핍층을 넓혀</b> 전자와 양공이 접합부에서 만나지 못하게 해요. 전류가 거의 없으니 <b>재결합으로 내는 빛</b>도 없어요. 또 LED는 열보다 빛으로 에너지를 많이 바꾸므로 백열전구보다 효율이 높아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-pn-diode', mount: '#game', badge: '다이오드 설계자', homeHref: '../../index.html#hp',
    featureLabels: { junc: '🔺 p-n 접합 입자 모형 · 전위 그래프', iv: '📈 가변 전원 · 전류계 · I–V 그래프', rect: '〰️ 교류 전원 · 다이오드 · 오실로스코프', led: '💡 LED · 태양 전지' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  let lastLvl = -1, lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.level !== lastLvl || game.free !== lastFree)) { lastLvl = game.level; lastFree = game.free; updateCtl(); }
    HITS.length = 0;
    stepJunc(dt); stepIV(dt); stepRect(dt); stepLed(dt);
    view.apply(); ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'junc') drawJunc(dt); else if (S.mode === 'iv') drawIV(dt); else if (S.mode === 'rect') drawRect(dt); else drawLed(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    updReadouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, updateCtl, solveVd, iDiode, bridgeOut, rectOut, joinNow, recordIV, ledI, LED, V_BI, LR, bridgePts, flipBridge, flipHalf, wFrac,
  };
})();
