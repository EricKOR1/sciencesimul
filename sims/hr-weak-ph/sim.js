/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 약산·약염기의 pH [12반응01-02]
   ① 실험: pH 측정 (0.10 M HCl · NaOH · CH₃COOH · NH₃, 예측 → 측정)  ② 모형: 평형 표 (처음 · 변화 · 평형, Ka = x²/(0.10 − x))
   ③ 분석: 근사식 ([H⁺] ≈ √(Ka·C), 이온화도 5 % 이하 조건, 이론값 vs 측정값)  ④ 분석: 농도와 pH (0.10 · 0.010 · 0.0010 M, 근사 vs 정확한 값)
   다양성자 산, 약산 + 강산 혼합, 활동도, 염의 pH(⑤차시)는 다루지 않아요. 모든 용액은 25 °C. */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6', BG = '#f3f0fb';
  const ACID = '#ef6a4a', BASE = '#3b82f6';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
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
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const e10 = (e) => Math.pow(10, e);

  /* ---------- 숫자 표기 ---------- */
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supStr = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  function sciParts(x, dig) {
    if (!(x > 0)) return ['0', 0];
    let e = Math.floor(Math.log10(x) + 1e-9), m = +(x / Math.pow(10, e)).toPrecision(dig || 2);
    if (m >= 10) { m = +(m / 10).toPrecision(dig || 2); e++; }
    return [m.toFixed(Math.max(0, (dig || 2) - 1)), e];
  }
  const sci = (x, dig) => { const q = sciParts(x, dig); return q[0] + '×10' + supStr(q[1]); };
  const f1 = (v) => v.toFixed(1);
  const f2 = (v) => v.toFixed(2);
  const MINUS = '−';
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2d = (x) => Math.round(x * 100) / 100;
  const KW = 1.0e-14;

  /* ---------- 상태 (공통) ---------- */
  const S = { mode: '', sub: {}, gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (typeof onLeave === 'function') onLeave(S.mode); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb && typeof MODE_LABEL !== 'undefined') tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 입력 칸 (십진수 / 과학적 표기) ---------- */
  function mkRow(host, sp, onChange) {
    const w = document.createElement('div'); w.className = sp.sci ? 'sci-line' : 'row-line';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = sp.label; w.appendChild(lab);
    const box = document.createElement('div'); box.className = sp.sci ? 'sci-in' : 'in-wrap'; w.appendChild(box);
    const mk = (cls, ph, mode) => { const i = document.createElement('input'); i.type = 'text'; i.className = 'num-in ' + (cls || ''); i.inputMode = mode || 'decimal'; i.autocomplete = 'off'; i.placeholder = ph || ''; i.setAttribute('aria-label', String(sp.label).replace(/<[^>]+>/g, '')); return i; };
    const r = { sp, el: w, ok: false };
    if (sp.sci) {
      r.c = mk('c', '1.0'); r.e = mk('e', '지수', 'text');
      const x = document.createElement('span'); x.className = 'x'; x.textContent = '×10';
      const u = document.createElement('span'); u.className = 'x'; u.textContent = sp.unit || '';
      box.append(r.c, x, r.e, u); r.ins = [r.c, r.e];
    } else {
      r.i = mk('', sp.ph || '0'); box.appendChild(r.i);
      if (sp.unit) { const u = document.createElement('span'); u.className = 'unit'; u.textContent = sp.unit; box.appendChild(u); }
      r.ins = [r.i];
    }
    r.read = () => (sp.sci ? (() => { const c = parseNum(r.c.value), e = parseNum(r.e.value); return isNaN(c) || isNaN(e) ? NaN : c * Math.pow(10, e); })() : parseNum(r.i.value));
    r.test = () => { const v = r.read(); if (isNaN(v)) return null; return sp.sci ? Math.abs(v / sp.ans - 1) <= (sp.rel || 0.03) : near(v, sp.ans, sp.tol); };
    r.paint = (showBad) => {
      const t = r.test(); r.ok = t === true;
      r.ins.forEach((i) => { i.classList.toggle('ok', t === true); if (t !== false) i.classList.remove('bad'); else if (showBad) i.classList.add('bad'); });
    };
    r.clear = () => { r.ins.forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); }); r.ok = false; };
    r.setAns = () => { if (sp.sci) { const q = sciParts(sp.ans, 2); r.c.value = q[0]; r.e.value = q[1]; } else r.i.value = sp.show != null ? sp.show : String(sp.ans); r.paint(false); };
    r.ins.forEach((i) => {
      i.addEventListener('input', () => { const was = r.ok; r.paint(false); if (r.ok && !was) Sound.tick(); onChange && onChange(r, false); });
      i.addEventListener('change', () => { r.paint(true); onChange && onChange(r, true); });
    });
    host.appendChild(w);
    return r;
  }

  /* ---------- 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 ---------- */
  function beaker(x, y, w, h, o) {
    o = o || {};
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11;
    const level = clamp(o.level == null ? 0 : o.level, 0, 1), ly = iy + ih * (1 - level);
    const rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    D.shadow(() => { path(x, y, w, h, rad); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    if (level > 0.002) {
      ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, ly, 0, iy + ih);
      const c = o.color || '#9bc8ff'; g.addColorStop(0, C.rgba(c, o.alpha != null ? o.alpha : 0.62)); g.addColorStop(1, C.rgba(C.shade(c, -0.18), Math.min(0.95, (o.alpha != null ? o.alpha : 0.62) + 0.18)));
      ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
      ctx.restore();
    }
    (o.ticks || []).forEach((tk) => {
      const ty = iy + ih * (1 - tk.f);
      ctx.strokeStyle = 'rgba(70,90,120,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w - 2, ty); ctx.lineTo(x + w - (tk.long ? 20 : 12), ty); ctx.stroke();
      if (tk.label) T(x + w + 5, ty + 4.5, tk.label, 13, MUTED, 'left', 700);
    });
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
    return { x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih, level };
  }
  /* 액체 안에 갇힌 입자 : 정규화 좌표(u, v)를 현재 액체 영역에 펼쳐 놓아요 (영역 밖으로 나가지 않음) */
  const r2 = (i) => [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    const mx = Math.min(k, Math.max(0, (x1 - x0) / 2)), my = Math.min(k, Math.max(0, (y1 - y0) / 2));
    return [px + Math.sin(t * 1.3 + i * 1.9) * mx * (px > x0 && px < x1 ? 1 : 0), py + Math.cos(t * 1.1 + i * 2.3) * my * (py > y0 && py < y1 ? 1 : 0)];
  }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const PH_STOPS = [[0, '#ef4444'], [3, '#f97316'], [5.5, '#facc15'], [7, '#4ade80'], [9, '#38bdf8'], [12, '#6366f1'], [14, '#8b5cf6']];
  function phColor(pH) {
    const p = clamp(pH, 0, 14);
    for (let i = 1; i < PH_STOPS.length; i++) if (p <= PH_STOPS[i][0]) { const a = PH_STOPS[i - 1], b = PH_STOPS[i]; return C.mix(a[1], b[1], (p - a[0]) / (b[0] - a[0])); }
    return PH_STOPS[PH_STOPS.length - 1][1];
  }
  function phStrip(x, y, w, h, o) {
    o = o || {};
    const g = ctx.createLinearGradient(x, 0, x + w, 0); PH_STOPS.forEach(([p, c]) => g.addColorStop(p / 14, c));
    D.roundRect(x, y, w, h, o.r != null ? o.r : 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,80,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function phTicks(x, y, w, every, size) {
    ctx.strokeStyle = 'rgba(40,50,80,.55)'; ctx.lineWidth = 1.4;
    for (let p = 0; p <= 14; p++) { const px = x + w * p / 14; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + 6); ctx.stroke(); if (p % every === 0) T(px, y + 6 + (size || 13) + 3, String(p), size || 13, INK, 'center', 800); }
  }
  /* 입자 한 개 (이온 · 분자) : 라벨이 들어간 구 */
  function ion(x, y, r, color, label, o) {
    o = o || {};
    D.sphere(x, y, r, color, { gloss: r > 7, text: label, textColor: o.tc || '#fff', textScale: o.ts || 0.9, outline: o.outline });
  }
  /* 아래 첨자 · 위 첨자 문자를 이용한 짝산 표기 도우미 */
  const done_ = (b) => (b ? '✅' : '⬜');
  /* 표준 이온화 계산 */
  function weakX(Ka, Cc) { return (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * Cc)) / 2; }   // 이차 방정식의 정확한 해
  function approxX(Ka, Cc) { return Math.sqrt(Ka * Cc); }


  const MODE_LABEL = { meas: '🧪 pH 측정', ice: '🧩 평형 표', approx: '🧮 근사식', conc: '📈 농도와 pH' };
  const SPL = SciSim.ease;

  /* ---------- 자료 (25 °C, 0.10 M) ---------- */
  const KA = 1.8e-5, KB = 1.8e-5, C0 = 0.10;
  const SOL = {
    hcl: { f: 'HCl', kind: '강산', theory: 1.00, meas: 1.02, col: '#dc2626' },
    naoh: { f: 'NaOH', kind: '강염기', theory: 13.00, meas: 12.97, col: '#2563eb' },
    ch3: { f: 'CH₃COOH', kind: '약산', theory: 2.87, meas: 2.89, col: '#d97706' },
    nh3: { f: 'NH₃', kind: '약염기', theory: 11.13, meas: 11.10, col: '#7c3aed' },
  };
  const SK = ['hcl', 'naoh', 'ch3', 'nh3'];
  const errPct = (k) => Math.abs(SOL[k].meas - SOL[k].theory) / SOL[k].theory * 100;
  const xApprox = (C) => Math.sqrt(KA * C), xExact = (C) => weakX(KA, C);
  const pHof = (x) => -Math.log10(x);
  const CONC3 = [0.10, 0.010, 0.0010], CONC3_TXT = ['0.10 M', '0.010 M', '0.0010 M'];
  const ccApprox = CONC3.map((C) => r2d(pHof(xApprox(C)))), ccExact = CONC3.map((C) => r2d(pHof(xExact(C))));   // 2.87 3.37 3.87 / 2.88 3.38 3.90
  const ccAlpha = CONC3.map((C) => xExact(C) / C), ccRatio = CONC3.map((C) => xApprox(C) / C);
  const fmtP = (v) => (v >= 10 ? v.toFixed(1) : v.toFixed(2));

  /* ============ ① pH 측정 ============ */
  const wsG = () => {
    const bw = PHONE ? 88 : 112, bh = PHONE ? 96 : 84, by = MAIN.y + (PHONE ? 176 : 160);
    return { bw, bh, by, xs: SK.map((k, i) => MAIN.x + MAIN.w * (0.125 + 0.25 * i)), rail: MAIN.y + (PHONE ? 140 : 138),
      meter: { x: MAIN.x + (PHONE ? 8 : 16), y: MAIN.y + 10, w: PHONE ? 196 : 232, h: PHONE ? 100 : 110 }, tbl: { x: MAIN.x + (PHONE ? 212 : 260), y: MAIN.y + 10, w: PHONE ? 244 : 500, h: PHONE ? 100 : 110 },
      strip: { x: MAIN.x + (PHONE ? 26 : 40), y: MAIN.y + (PHONE ? 352 : 296), w: MAIN.w - (PHONE ? 52 : 80), h: 16 } };
  };
  const WS_LEVEL = 0.6;
  Object.assign(S, {
    mode: 'meas', sub: { approx: 'acid' },
    ws: { cur: null, pv: 7, pred: { hcl: null, naoh: null, ch3: null, nh3: null }, done: { hcl: false, naoh: false, ch3: false, nh3: false }, px: 0, tip: 0, init: false, disp: 7, state: 'idle', liq: { hcl: 0, naoh: 0, ch3: 0, nh3: 0 }, wob: 0 },
  });
  const wsCount = () => SK.filter((k) => S.ws.done[k]).length;
  const wsPredCount = () => SK.filter((k) => S.ws.pred[k] != null).length;
  function wsReset() { const w = S.ws; w.cur = null; w.state = 'idle'; w.pred = { hcl: null, naoh: null, ch3: null, nh3: null }; w.done = { hcl: false, naoh: false, ch3: false, nh3: false }; w.liq = { hcl: 0, naoh: 0, ch3: 0, nh3: 0 }; w.disp = 7; w.init = false; w.pv = 7; updateCtl(); }
  function wsSelect(k) { const w = S.ws; if (w.state === 'move' || w.state === 'dip' || w.state === 'settle') return; w.cur = k; w.pv = w.pred[k] != null ? w.pred[k] : 7; if (w.state === 'read') w.state = 'idle'; Sound.click(); updateCtl(); }
  function wsRecPred() { const w = S.ws; if (!w.cur) { showHint('먼저 시약병을 골라요.', 2400); return; } w.pred[w.cur] = w.pv; Sound.success(); updateCtl(); }
  function wsMeasure() {
    const w = S.ws; if (!w.cur) return;
    if (w.pred[w.cur] == null && !(game && game.free)) { showHint('먼저 이 용액의 pH를 예측하고 “예측 기록”을 눌러요.', 3200); Sound.fail(); return; }
    if (w.state === 'move' || w.state === 'dip' || w.state === 'settle') return;
    w.state = 'move'; Sound.click(); updateCtl();
  }
  function stepMeas(dt) {
    const w = S.ws, g = wsG(), key = w.cur, ix = key ? SK.indexOf(key) : -1;
    const restX = MAIN.x + MAIN.w / 2, upY = g.rail + 10, downY = g.by + 5 + (g.bh - 11) * (1 - WS_LEVEL) + 24;
    if (!w.init) { w.init = true; w.px = restX; w.tip = upY; }
    const tx = ix >= 0 && w.state !== 'idle' ? g.xs[ix] : restX;
    let ty = upY;
    if (w.state === 'move' && Math.abs(w.px - tx) < 2) w.state = 'dip';
    if (w.state === 'dip' || w.state === 'settle' || w.state === 'read') ty = downY;
    if (w.state === 'idle') { w.px = ap(w.px, restX, dt, 6); }
    else if (w.state === 'move' && Math.abs(w.tip - upY) > 6) { /* 먼저 올라가요 */ } else w.px = ap(w.px, tx, dt, 6);
    w.tip = ap(w.tip, ty, dt, 6);
    if (w.state === 'dip' && Math.abs(w.tip - downY) < 3) { w.state = 'settle'; w.wob = 0.35; w.disp = 7.0; }
    if (w.state === 'settle') {
      const tgt = SOL[key].meas; w.disp = ap(w.disp, tgt, dt, 3.2);
      if (Math.abs(w.disp - tgt) < 0.012) { w.disp = tgt; w.state = 'read'; if (!w.done[key]) { w.done[key] = true; Sound.success(); flash(g.xs[ix], g.by - 10, ['#ffb400', '#14a058', '#8b5cf6']); updateCtl(); } }
    }
    SK.forEach((k) => { w.liq[k] = ap(w.liq[k], w.done[k] ? 1 : 0, dt, 3); });
  }
  function drawMeas(t) {
    const w = S.ws, g = wsG(), key = w.cur;
    T(14, 26, '🧪 pH를 먼저 예측하고, pH 미터로 측정해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const mt = g.meter;
    D.shadow(() => { D.roundRect(mt.x, mt.y, mt.w, mt.h, 12); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 6, y: 3 });
    T(mt.x + 14, mt.y + 26, 'pH 미터', 14, '#9ca3af', 'left', 800);
    const inLiq = w.state === 'settle' || w.state === 'read';
    T(mt.x + mt.w - 16, mt.y + 74, inLiq ? w.disp.toFixed(2) : '—', 40, inLiq ? (w.state === 'read' ? '#4ade80' : '#facc15') : '#6b7280', 'right', 800);
    T(mt.x + 14, mt.y + 96, key ? '선택: ' + SOL[key].f : '시약병을 골라요', 12.5, '#9ca3af', 'left', 700);
    // 기록표
    const tb = g.tbl;
    D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const c0 = tb.x + 12, c1 = tb.x + (PHONE ? 104 : 160), c2 = tb.x + (PHONE ? 158 : 280), c3 = tb.x + (PHONE ? 228 : 400);
    T(c0, tb.y + 22, '용액', 13, MUTED, 'left', 800); T(c1, tb.y + 22, '예측 ▽', 13, MUTED, 'left', 800); T(c2, tb.y + 22, '측정 ●', 13, MUTED, 'left', 800); if (!PHONE) T(c3, tb.y + 22, '예측 − 측정', 13, MUTED, 'left', 800);
    SK.forEach((k, i) => {
      const yy = tb.y + (PHONE ? 40 : 44) + i * (PHONE ? 17 : 19), p = w.pred[k], d = w.done[k];
      T(c0, yy, SOL[k].f + (PHONE ? '' : ' (' + SOL[k].kind + ')'), PHONE ? 13 : 14, SOL[k].col, 'left', 800);
      T(c1, yy, p != null ? p.toFixed(1) : '—', 14, INK, 'left', 800); T(c2, yy, d ? SOL[k].meas.toFixed(2) : '—', 14, d ? INK : '#9ca3af', 'left', 800);
      if (!PHONE) T(c3, yy, d && p != null ? (p - SOL[k].meas >= 0 ? '+' : MINUS) + Math.abs(p - SOL[k].meas).toFixed(2) : '—', 14, INK, 'left', 800);
    });
    // 레일 · 프로브 · 전선
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(MAIN.x + 24, g.rail); ctx.lineTo(MAIN.x + MAIN.w - 24, g.rail); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(w.px, g.rail); ctx.bezierCurveTo(w.px, g.rail - 30, mt.x + mt.w - 30, mt.y + mt.h + 50, mt.x + mt.w - 30, mt.y + mt.h); ctx.stroke();
    // 시약병 (비커)
    SK.forEach((k, i) => {
      const x = g.xs[i] - g.bw / 2, on = key === k, col = C.mix('#e8f1ff', phColor(SOL[k].meas), w.liq[k] * 0.9);
      if (on) { D.roundRect(x - 8, g.by - 8, g.bw + 16, g.bh + 48, 14); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      beaker(x, g.by, g.bw, g.bh, { level: WS_LEVEL, color: col, alpha: 0.72 });
      T(g.xs[i], g.by + g.bh + 20, '0.10 M ' + SOL[k].f, PHONE ? 13 : 14.5, INK, 'center', 800);
    });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(w.px, g.rail); ctx.lineTo(w.px, w.tip); ctx.stroke();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(w.px - 1, g.rail + 6); ctx.lineTo(w.px - 1, w.tip - 2); ctx.stroke();
    D.sphere(w.px, w.tip + 3, 5.5, '#0ea5e9', { gloss: false });
    // pH 띠 + 예측(▽)·측정(●) 표시
    const st = g.strip; phStrip(st.x, st.y, st.w, st.h, { r: 6 }); phTicks(st.x, st.y + st.h + 2, st.w, PHONE ? 2 : 1, 12.5);
    const px = (v) => st.x + st.w * clamp(v, 0, 14) / 14;
    SK.forEach((k, i) => {
      const p = w.pred[k], m = w.done[k] ? SOL[k].meas : null;
      if (p != null) { ctx.fillStyle = '#fff'; ctx.strokeStyle = SOL[k].col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(px(p), st.y - 1); ctx.lineTo(px(p) - 7, st.y - 13); ctx.lineTo(px(p) + 7, st.y - 13); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (m != null) { D.sphere(px(m), st.y + st.h / 2, 7, SOL[k].col, { gloss: false, outline: '#fff', outlineWidth: 2 }); }
    });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '같은 0.10 M인데 pH는 어떨까요?', 15, '#b45309', 'left', 800);
    const n = wsCount();
    const body = n < 4 ? '용액을 고르고 예측 pH를 슬라이더로 정해 “예측 기록”을 누른 뒤 “측정하기”를 눌러요. 강한 쪽(HCl, NaOH)과 약한 쪽(CH₃COOH, NH₃)을 나눠 생각해 보세요. (측정 ' + n + ' / 4)' : '강산 HCl은 pH 1.02인데 같은 농도의 약산 CH₃COOH는 2.89, 강염기 NaOH는 12.97인데 약염기 NH₃는 11.10이에요. 약한 산 · 염기는 일부만 이온화해서 pH가 7 쪽으로 가까워요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ② 평형 표 ============ */
  const ICE_ANS = ['−x', '+x', '+x', '0.10 − x', 'x', 'x'];
  const NU = 1000;
  const icG = () => {
    if (PHONE) return { tb: { x: MAIN.x + 12, y: MAIN.y + 40, w: 440, hh: 30, rh: 44, c0: 78 }, b1: { x: MAIN.x + 12, y: MAIN.y + 226, w: 216, h: 112 }, b2: { x: MAIN.x + 236, y: MAIN.y + 226, w: 216, h: 112 }, gg: { x: MAIN.x + 12, y: MAIN.y + 362, w: 440, h: 58 } };
    return { tb: { x: MAIN.x + 14, y: MAIN.y + 40, w: 392, hh: 34, rh: 52, c0: 86 }, b1: { x: MAIN.x + 418, y: MAIN.y + 40, w: 164, h: 150 }, b2: { x: MAIN.x + 598, y: MAIN.y + 40, w: 164, h: 150 }, gg: { x: MAIN.x + 418, y: MAIN.y + 232, w: 344, h: 98 } };
  };
  const icPerm = (() => { const a = Array.from({ length: NU }, (_, i) => i); let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  const icPts = Array.from({ length: NU }, (_, i) => { const q = r2(i + 40); return { u: q[0], v: q[1] }; });
  S.ic = { xmM: 0, xd: 0, selOk: [false, false, false, false, false, false], pop: [0, 0, 0, 0, 0, 0], tblDone: false, tdPop: 0 };
  const icX = () => S.ic.xmM * 1e-3;
  const icVal = (x) => x * x / (C0 - x);
  const icRatio = () => icVal(icX()) / KA;
  const icOk = () => Math.abs(icRatio() - 1) <= 0.05;
  const icTbl = () => S.ic.selOk.every(Boolean);
  function icSetX(mM) { S.ic.xmM = clamp(Math.round(mM * 100) / 100, 0, 5); updateCtl(); }
  function stepIce(dt) {
    const ic = S.ic; ic.xd = ap(ic.xd, ic.xmM, dt, 9); if (Math.abs(ic.xd - ic.xmM) < 0.002) ic.xd = ic.xmM;
    for (let i = 0; i < 6; i++) { if (ic.selOk[i] && ic.pop[i] < 1) ic.pop[i] = Math.min(1, ic.pop[i] + dt * 3); if (!ic.selOk[i]) ic.pop[i] = 0; }
    const td = icTbl(); ic.tdPop = ap(ic.tdPop, td ? 1 : 0, dt, 4);
  }
  function unitBox(B, nIon, title) {
    D.roundRect(B.x, B.y, B.w, B.h, 10); const gr = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); gr.addColorStop(0, '#eaf4ff'); gr.addColorStop(1, '#d9ebff'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2; ctx.stroke();
    T(B.x + B.w / 2, B.y - 8, title, 13.5, INK, 'center', 800);
    const px0 = B.x + 8, py0 = B.y + 8, pw = B.w - 16, ph = B.h - 16;
    for (let n = 0; n < NU; n++) {
      const q = icPts[n], x = px0 + q.u * pw, y = py0 + q.v * ph;
      if (n < nIon) {
        ctx.fillStyle = '#a21caf'; ctx.beginPath(); ctx.arc(x, y, 3.1, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(clamp(x + 5, px0, px0 + pw), clamp(y - 4, py0, py0 + ph), 2.6, 0, TAU); ctx.fill(); ctx.stroke();
      } else { ctx.fillStyle = 'rgba(236,72,153,.75)'; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fill(); }
    }
  }
  function drawIce(t) {
    const ic = S.ic, G = icG(), tb = G.tb, x = ic.xd * 1e-3;
    T(14, 26, '🧩 CH₃COOH ⇌ H⁺ + CH₃COO⁻ 의 평형 표', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 표
    const cw = (tb.w - tb.c0) / 3, cx = (j) => tb.x + tb.c0 + cw * (j + 0.5);
    D.roundRect(tb.x, tb.y, tb.w, tb.hh + tb.rh * 3, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d9d2ee'; ctx.lineWidth = 2; ctx.stroke();
    D.roundRect(tb.x, tb.y, tb.w, tb.hh, 10); ctx.fillStyle = '#f1ecff'; ctx.fill();
    ['CH₃COOH', 'H⁺', 'CH₃COO⁻'].forEach((f, j) => T(cx(j), tb.y + tb.hh / 2 + 6, f, PHONE ? 14.5 : 16.5, '#5b21b6', 'center', 800));
    ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 1.5;
    for (let r = 0; r <= 3; r++) { ctx.beginPath(); ctx.moveTo(tb.x, tb.y + tb.hh + tb.rh * r); ctx.lineTo(tb.x + tb.w, tb.y + tb.hh + tb.rh * r); ctx.stroke(); }
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(tb.x + tb.c0 + cw * j, tb.y); ctx.lineTo(tb.x + tb.c0 + cw * j, tb.y + tb.hh + tb.rh * 3); ctx.stroke(); }
    const rows = ['처음 (M)', '변화 (M)', '평형 (M)'];
    rows.forEach((r, i) => T(tb.x + 10, tb.y + tb.hh + tb.rh * (i + 0.5) + 6, r, PHONE ? 13.5 : 15, INK, 'left', 800));
    ['0.10', '0', '0'].forEach((v, j) => T(cx(j), tb.y + tb.hh + tb.rh * 0.5 + 7, v, PHONE ? 18 : 21, INK, 'center', 800));
    for (let i = 0; i < 6; i++) {
      const row = 1 + Math.floor(i / 3), j = i % 3, yy = tb.y + tb.hh + tb.rh * (row + 0.5) + 7;
      if (ic.selOk[i]) { const k = SPL.outBack(clamp(ic.pop[i], 0, 1)); ctx.save(); ctx.translate(cx(j), yy - 7); ctx.scale(k, k); T(0, 7, ICE_ANS[i], PHONE ? 18 : 21, '#14803f', 'center', 800); ctx.restore(); }
      else T(cx(j), yy, '?', PHONE ? 18 : 21, '#b8aed6', 'center', 800);
    }
    // 입자 상자 (HA 1000개 기준)
    const nIon = clamp(Math.round(NU * x / C0), 0, NU);
    unitBox(G.b1, 0, '처음'); unitBox(G.b2, nIon, '평형 (x 슬라이더)');
    const cy2 = G.b2.y + G.b2.h + 16;
    T(G.b2.x + G.b2.w / 2, cy2, 'HA ' + (NU - nIon) + ' · H⁺ ' + nIon + ' · A⁻ ' + nIon, PHONE ? 12.5 : 13.5, INK, 'center', 800);
    T(G.b1.x + G.b1.w / 2, cy2, 'HA ' + NU + '개 기준', PHONE ? 12.5 : 13.5, MUTED, 'center', 800);
    // 계산값 vs Ka
    const gg = G.gg;
    D.roundRect(gg.x, gg.y, gg.w, gg.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    if (!ic.tblDone && !icTbl() && !(game && game.free)) {
      T(gg.x + gg.w / 2, gg.y + gg.h / 2 + 5, '평형 표를 채우면 Ka 식이 나타나요', 14, MUTED, 'center', 800);
    } else {
      const val = icVal(x), ax0 = gg.x + 22, ax1 = gg.x + gg.w - 22, lg = (v) => ax0 + (clamp(Math.log10(Math.max(v, 1e-12)), -9, -3) + 9) / 6 * (ax1 - ax0), ay = gg.y + gg.h - (PHONE ? 16 : 24);
      T(gg.x + 12, gg.y + 20, 'x² / (0.10 − x) = ' + (x < 5e-8 ? '0' : sci(val, 2)), PHONE ? 13.5 : 15, '#5b21b6', 'left', 800);
      T(gg.x + gg.w - 12, gg.y + 20, 'Ka = ' + sci(KA, 2), PHONE ? 13.5 : 15, '#14803f', 'right', 800);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
      for (let e = -9; e <= -3; e += (PHONE ? 2 : 1)) { const px = lg(Math.pow(10, e)); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, ay - 3); ctx.lineTo(px, ay + 4); ctx.stroke(); if (!PHONE) T(px, ay + 17, '10' + supStr(e), 11.5, MUTED, 'center', 700); }
      const kx = lg(KA); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx, ay - 22); ctx.lineTo(kx, ay + 6); ctx.stroke();
      const ok = Math.abs(val / KA - 1) <= 0.05, vx = lg(val);
      D.sphere(vx, ay, 7.5, ok ? '#14a058' : PUR, { gloss: false, outline: '#fff', outlineWidth: 2 });
      if (ok) D.ring(vx, ay, 12, t, { color: '#14a058', width: 2.4, speed: 1.2 });
      T(gg.x + gg.w / 2, gg.y + 40, ok ? '같아졌어요! 평형 상태예요' : val < KA ? '아직 Ka보다 작아요 → x가 더 커져야 해요 (정반응)' : 'Ka보다 커요 → x가 너무 커요 (역반응)', PHONE ? 12.5 : 13.5, ok ? '#14803f' : INK, 'center', 800);
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, 'Ka = [H⁺][CH₃COO⁻] / [CH₃COOH] = x² / (0.10 − x)', 15, '#b45309', 'left', 800);
    const body = icTbl() || (game && game.free) ? '처음 CH₃COOH 0.10 M 중 x만큼 이온화하면 평형에서 [CH₃COOH] = 0.10 − x, [H⁺] = [CH₃COO⁻] = x예요. x를 바꿔 가며 x²/(0.10 − x)이 Ka와 같아지는 x를 찾으면 그것이 평형 상태의 x예요.' : '“변화” 행은 반응이 진행되며 변하는 양이에요. CH₃COOH는 줄고(−), H⁺와 CH₃COO⁻는 늘어나요(+). 평형 행은 처음 + 변화예요. 오른쪽 목록에서 표의 빈칸을 골라 채워 보세요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ③ 근사식 ============ */
  S.ap = { k: 'ch3' };
  const apG = () => (PHONE ? { cd: { x: MAIN.x + 12, y: MAIN.y + 38, w: 440, h: 176 }, tb: { x: MAIN.x + 12, y: MAIN.y + 222, w: 440, h: 114 }, gg: { x: MAIN.x + 12, y: MAIN.y + 344, w: 440, h: 74 } }
    : { cd: { x: MAIN.x + 14, y: MAIN.y + 40, w: 396, h: 290 }, tb: { x: MAIN.x + 422, y: MAIN.y + 40, w: 340, h: 166 }, gg: { x: MAIN.x + 422, y: MAIN.y + 216, w: 340, h: 114 } });
  const apDone = (k) => (k === 'ch3' ? apAcidRows.every((r) => r.ok) : apBaseRows.every((r) => r.ok));
  const apStep = (k) => (k === 'ch3' ? apAcidRows.filter((r) => r.ok).length : apBaseRows.filter((r) => r.ok).length);
  function apSet(k) { S.ap.k = k; S.sub.approx = k === 'ch3' ? 'acid' : 'base'; Sound.click(); updateCtl(); }
  function drawApprox(t) {
    const g = apG(), k = S.ap.k, acid = k === 'ch3', free = game && game.free;
    T(14, 26, '🧮 x ≪ C 이면 0.10 − x ≈ 0.10 으로 근사해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 계산 카드
    const cd = g.cd; D.roundRect(cd.x, cd.y, cd.w, cd.h, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2.2; ctx.stroke();
    const st = apStep(k), done = apDone(k) || free, X0 = acid ? 'x = [H⁺]' : 'x = [OH⁻]';
    T(cd.x + 14, cd.y + 26, acid ? '0.10 M CH₃COOH  (Ka = 1.8×10⁻⁵)' : '0.10 M NH₃  (Kb = 1.8×10⁻⁵)', PHONE ? 14 : 16, '#8a6d00', 'left', 800);
    const val = (ok, txt) => (ok || free ? txt : '?');
    const sx = sci(xApprox(C0), 3), px = pHof(xApprox(C0));
    const lines = acid ? [
      ['① ' + (PHONE ? 'Ka = x²/(0.10 − x)' : '평형 표에서 Ka = x² / (0.10 − x)'), true],
      ['② x ≪ 0.10 이므로 0.10 − x ≈ 0.10', true],
      ['   Ka ≈ x²/0.10  →  x = √(Ka·C) = √(1.8×10⁻⁵ × 0.10)', true],
      ['   [H⁺] = x = ' + val(st >= 1, sx.replace('×', ' × ') + ' M'), st >= 1],
      ['③ pH = −log[H⁺] = ' + val(st >= 2, r2d(px).toFixed(2)), st >= 2],
    ] : [
      ['① NH₃ + H₂O ⇌ NH₄⁺ + OH⁻ ,  Kb = x² / (0.10 − x)', true],
      ['② x ≪ 0.10 이므로 x = √(Kb·C) = √(1.8×10⁻⁵ × 0.10)', true],
      ['   [OH⁻] = x = ' + val(st >= 1, sx.replace('×', ' × ') + ' M'), st >= 1],
      ['③ pOH = −log[OH⁻] = ' + val(st >= 2, r2d(px).toFixed(2)), st >= 2],
      ['④ pH = 14 − pOH = ' + val(st >= 3, r2d(14 - r2d(px)).toFixed(2)), st >= 3],
    ];
    lines.forEach((l, i) => { const y = cd.y + 56 + i * (PHONE ? 25 : 34); T(cd.x + 14, y, l[0], PHONE ? 13 : 14.5, l[1] ? (i >= 3 || l[0].indexOf('?') >= 0 ? '#5b21b6' : INK) : '#9a8ec0', 'left', 800); });
    if (!PHONE) { textBlock(cd.x + 14, cd.y + 56 + 5 * 34 + 8, cd.w - 28, acid ? '약염기는 [OH⁻] ≈ √(Kb·C)로 같은 방법을 써요.' : '먼저 구하는 것은 [OH⁻]이고, 마지막에 pH = 14 − pOH를 해요.', 14, MUTED, 20, 700); }
    // 이론값 vs 측정값
    const tb = g.tb; D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cA = tb.x + 12, cB = tb.x + (PHONE ? 190 : 150), cC = tb.x + (PHONE ? 270 : 220), cD = tb.x + tb.w - 12;
    T(cA, tb.y + 22, '0.10 M 용액', 13, MUTED, 'left', 800); T(cB, tb.y + 22, '이론 pH', 13, MUTED, 'left', 800); T(cC, tb.y + 22, '측정 pH', 13, MUTED, 'left', 800); T(cD, tb.y + 22, '오차(%)', 13, MUTED, 'right', 800);
    SK.forEach((q, i) => {
      const yy = tb.y + 46 + i * (PHONE ? 21 : 28), known = q === 'hcl' || q === 'naoh' || (q === 'ch3' && (apDone('ch3') || free)) || (q === 'nh3' && (apDone('nh3') || free)), cur = (q === 'ch3' && acid) || (q === 'nh3' && !acid);
      if (cur) { D.roundRect(tb.x + 4, yy - 17, tb.w - 8, PHONE ? 22 : 26, 7); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); }
      T(cA, yy, SOL[q].f + (PHONE ? '' : ' (' + SOL[q].kind + ')'), PHONE ? 13 : 14, SOL[q].col, 'left', 800);
      T(cB, yy, known ? SOL[q].theory.toFixed(2) : '?', 14.5, known ? INK : '#b8aed6', 'left', 800); T(cC, yy, SOL[q].meas.toFixed(2), 14.5, INK, 'left', 800);
      T(cD, yy, known ? errPct(q).toFixed(1) : '?', 14.5, known ? INK : '#b8aed6', 'right', 800);
    });
    // 적용 조건 검사기 (이온화도 x/C ≤ 5 %)
    const gg = g.gg; D.roundRect(gg.x, gg.y, gg.w, gg.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(gg.x + 12, gg.y + 22, '근사식 적용 조건: x/C ≤ 5 %', PHONE ? 13 : 14.5, '#5b21b6', 'left', 800);
    if (st >= 1 || free) {
      const r = xApprox(C0) / C0 * 100, bx = gg.x + 14, bw = gg.w - 28, by = gg.y + (PHONE ? 34 : 40), bh = 16, axmax = 10, ok = r <= 5;
      D.roundRect(bx, by, bw, bh, 6); ctx.fillStyle = '#e9e5f5'; ctx.fill();
      const wv = bw * r / axmax; D.roundRect(bx, by, wv, bh, 6); ctx.fillStyle = ok ? '#14a058' : '#e2464b'; ctx.fill();
      const lx = bx + bw * 5 / axmax; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lx, by - 5); ctx.lineTo(lx, by + bh + 5); ctx.stroke(); ctx.setLineDash([]);
      T(lx, by + bh + 17, '5 %', 12.5, '#b91c1c', 'center', 800); T(bx, by + bh + 17, '0', 12.5, MUTED, 'left', 700); T(bx + bw, by + bh + 17, '10 %', 12.5, MUTED, 'right', 700);
      T(bx + wv + 8, by + 12.5, 'x/C = ' + r.toFixed(1) + ' %', 12.5, ok ? '#14803f' : '#b91c1c', 'left', 800);
      if (!PHONE) T(gg.x + gg.w / 2, gg.y + gg.h - 8, ok ? '5 % 이하라서 근사식을 써도 돼요' : '5 %를 넘어서 근사식을 쓸 수 없어요', 13.5, ok ? '#14803f' : '#b91c1c', 'center', 800);
    } else T(gg.x + gg.w / 2, gg.y + gg.h / 2 + 12, '[H⁺](또는 [OH⁻])를 구하면 확인할 수 있어요', 13.5, MUTED, 'center', 800);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '약산 [H⁺] ≈ √(Ka·C) ,  약염기 [OH⁻] ≈ √(Kb·C)  (이온화도 5 % 이하일 때)', PHONE ? 13 : 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '같은 0.10 M이라도 약산은 강산보다 pH가 약 1.9 높고, 약염기는 강염기보다 약 1.9 낮아요. 이론값과 측정값은 비슷하지만 조금씩 오차가 있어요. 표의 이론값은 근사식으로 구한 값이에요.', 14.5, INK, 21, 700);
  }

  /* ============ ④ 농도와 pH ============ */
  S.cc = { ci: 0, rec: [false, false, false], nd: 13, pop: [0, 0, 0], pv: 0 };
  const ccG = () => (PHONE ? { bx: { x: MAIN.x + 12, y: MAIN.y + 48, w: 440, h: 98 }, gr: { x: MAIN.x + 12, y: MAIN.y + 176, w: 224, h: 126 }, ga: { x: MAIN.x + 244, y: MAIN.y + 176, w: 208, h: 126 }, tb: { x: MAIN.x + 12, y: MAIN.y + 310, w: 440, h: 106 } }
    : { bx: { x: MAIN.x + 14, y: MAIN.y + 52, w: 252, h: 156 }, gr: { x: MAIN.x + 280, y: MAIN.y + 40, w: 296, h: 178 }, ga: { x: MAIN.x + 588, y: MAIN.y + 40, w: 174, h: 178 }, tb: { x: MAIN.x + 14, y: MAIN.y + 232, w: 748, h: 100 } });
  const ccCount = () => S.cc.rec.filter(Boolean).length;
  function ccSet(i) { S.cc.ci = clamp(i, 0, 2); updateCtl(); }
  function ccRecord() { const c = S.cc, i = c.ci; if (c.rec[i]) return; c.rec[i] = true; c.pop[i] = 0.001; Sound.success(); updateCtl(); }
  function ccClear() { S.cc.rec = [false, false, false]; S.cc.pop = [0, 0, 0]; updateCtl(); }
  function stepConc(dt) {
    const c = S.cc; c.nd = ap(c.nd, Math.round(NU * ccAlpha[c.ci]), dt, 6); c.pv = ap(c.pv, c.ci, dt, 8);
    for (let i = 0; i < 3; i++) if (c.pop[i] > 0 && c.pop[i] < 1) c.pop[i] = Math.min(1, c.pop[i] + dt * 3);
  }
  function drawConc(t) {
    const c = S.cc, g = ccG(), i = c.ci, nIon = Math.round(c.nd);
    T(14, 26, '📈 묽을수록 pH와 이온화도는 어떻게 변할까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 입자 상자
    unitBox(g.bx, nIon, 'CH₃COOH ' + CONC3_TXT[i] + '  (HA 1000개 기준)');
    const by2 = g.bx.y + g.bx.h + (PHONE ? 20 : 18);
    T(g.bx.x + g.bx.w / 2, by2, '이온화된 HA ' + nIon + '/' + NU + '개 → α = ' + (nIon / NU * 100).toFixed(1) + ' %', PHONE ? 13.5 : 13.5, '#b45309', 'center', 800);
    if (!PHONE) { T(g.bx.x + g.bx.w / 2, by2 + 22, 'H⁺ ' + nIon + '개 = A⁻ ' + nIon + '개', 13, MUTED, 'center', 700); T(g.bx.x + g.bx.w / 2, by2 + 42, '묽혀도 HA의 수는 같게 비교해요', 12.5, MUTED, 'center', 700); }
    // pH 그래프 (가로: −log C, 세로: pH)
    const gr = g.gr; D.roundRect(gr.x, gr.y, gr.w, gr.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const px0 = gr.x + 34, px1 = gr.x + gr.w - 14, py0 = gr.y + 28, py1 = gr.y + gr.h - 32, X = (v) => px0 + (v - 0.5) / 3 * (px1 - px0), Y = (v) => py1 - v / 5 * (py1 - py0);
    T(gr.x + 10, gr.y + 18, 'pH 그래프', PHONE ? 12.5 : 13.5, INK, 'left', 800);
    { // 범례 (색 점과 함께)
      const items = PHONE ? [['HCl', '#dc2626', 0], ['정확', '#d97706', 0]] : [['HCl', '#dc2626', 0], ['CH₃COOH(정확)', '#d97706', 0], ['근사', '#d97706', 1]], fs = PHONE ? 11.5 : 11.5;
      ctx.save(); ctx.font = D.font(fs, 700);
      let lx = gr.x + gr.w - 10;
      for (let n = items.length - 1; n >= 0; n--) {
        const it = items[n], w = ctx.measureText(it[0]).width; lx -= w;
        T(lx, gr.y + 18, it[0], fs, MUTED, 'left', 700); lx -= 8;
        ctx.beginPath(); ctx.arc(lx, gr.y + 14, 4, 0, TAU);
        if (it[2]) { ctx.strokeStyle = it[1]; ctx.lineWidth = 1.8; ctx.stroke(); } else { ctx.fillStyle = it[1]; ctx.fill(); }
        lx -= 12;
      }
      ctx.restore();
    }
    ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1.2;
    for (let y = 0; y <= 5; y++) { ctx.beginPath(); ctx.moveTo(px0, Y(y)); ctx.lineTo(px1, Y(y)); ctx.stroke(); T(px0 - 6, Y(y) + 4.5, String(y), 12.5, MUTED, 'right', 700); }
    for (let x = 1; x <= 3; x++) { ctx.beginPath(); ctx.moveTo(X(x), py0); ctx.lineTo(X(x), py1); ctx.stroke(); T(X(x), py1 + 16, String(x), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, py0 - 4); ctx.lineTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();
    T((px0 + px1) / 2, gr.y + gr.h - 6, PHONE ? '−log C (1=0.10, 2=0.010, 3=0.0010 M)' : '−log C  (1 = 0.10 M, 2 = 0.010 M, 3 = 0.0010 M)', PHONE ? 11 : 11.5, MUTED, 'center', 700);
    // 현재 농도 표시선
    const cxp = X(1 + c.pv); ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cxp, py0); ctx.lineTo(cxp, py1); ctx.stroke(); ctx.setLineDash([]);
    const series = [{ key: 'hcl', name: '● HCl', col: '#dc2626', vals: [1, 2, 3] }, { key: 'ex', name: '● CH₃COOH 정확', col: '#d97706', vals: ccExact }];
    series.forEach((sr) => {
      const pts = []; for (let k = 0; k < 3; k++) if (c.rec[k]) pts.push([X(k + 1), Y(sr.vals[k]), k]);
      if (pts.length > 1) { ctx.strokeStyle = sr.col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, n) => (n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
      pts.forEach((q) => { const r = 6 * SPL.outBack(clamp(c.pop[q[2]] || 1, 0, 1)); D.sphere(q[0], q[1], Math.max(0.1, r), sr.col, { gloss: false, outline: '#fff', outlineWidth: 1.5 }); });
    });
    for (let k = 0; k < 3; k++) if (c.rec[k]) { const r = 5.5 * SPL.outBack(clamp(c.pop[k] || 1, 0, 1)); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(k + 1), Y(ccApprox[k]), Math.max(0.1, r + 4), 0, TAU); ctx.stroke(); }
    // 근사 조건 게이지 (x/C와 5 % 선)
    const ga = g.ga; D.roundRect(ga.x, ga.y, ga.w, ga.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(ga.x + 10, ga.y + 18, '근사 조건 x/C', 13.5, INK, 'left', 800);
    const gx = ga.x + 18, gw = ga.w - 36, gy = ga.y + 34, gh = ga.h - 74, rr = ccRatio[i] * 100, rmax = 15, bw2 = Math.min(gw, 56), bx2 = gx + (gw - bw2) / 2;
    D.roundRect(bx2, gy, bw2, gh, 6); ctx.fillStyle = '#e9e5f5'; ctx.fill();
    const hh = gh * clamp(rr / rmax, 0, 1); D.roundRect(bx2, gy + gh - hh, bw2, hh, 6); ctx.fillStyle = rr <= 5 ? '#14a058' : '#e2464b'; ctx.fill();
    const ly = gy + gh - gh * 5 / rmax; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(gx - 6, ly); ctx.lineTo(gx + gw + 6, ly); ctx.stroke(); ctx.setLineDash([]);
    T(gx - 4, ly - 5, '5 %', 12.5, '#b91c1c', 'left', 800); T(bx2 + bw2 + 6, gy + gh - hh + 14, rr.toFixed(1) + ' %', 13, INK, 'left', 800);
    T(ga.x + ga.w / 2, ga.y + ga.h - 22, rr <= 5 ? '근사식 OK' : '근사 부적합', 13.5, rr <= 5 ? '#14803f' : '#b91c1c', 'center', 800);
    T(ga.x + ga.w / 2, ga.y + ga.h - 6, '(세로 눈금 0 ~ 15 %)', 11.5, MUTED, 'center', 700);
    // 기록표
    const tb = g.tb; D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cols = PHONE ? [12, 92, 168, 262, 380] : [14, 140, 270, 420, 590];
    ['농도', 'HCl pH', 'CH₃COOH 근사 pH', 'CH₃COOH 정확한 pH', '이온화도 α'].forEach((h, j) => T(tb.x + cols[j], tb.y + 20, PHONE ? ['농도', 'HCl', '근사', '정확', 'α'][j] : h, 13, MUTED, 'left', 800));
    for (let k = 0; k < 3; k++) {
      const yy = tb.y + 44 + k * (PHONE ? 22 : 24), rec = c.rec[k];
      if (k === i) { D.roundRect(tb.x + 4, yy - 17, tb.w - 8, PHONE ? 22 : 24, 6); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); }
      const vals = [CONC3_TXT[k], rec ? String(k + 1) + '.00' : '—', rec ? ccApprox[k].toFixed(2) : '—', rec ? ccExact[k].toFixed(2) : '—', rec ? (ccAlpha[k] * 100).toFixed(1) + ' %' : '—'];
      vals.forEach((v, j) => T(tb.x + cols[j], yy, v, 14, j === 0 || rec ? INK : '#b0b8c8', 'left', 800));
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '10배 묽히면 강산 pH는 +1, 약산 pH는 약 +0.5', 15, '#b45309', 'left', 800);
    let body = '농도 단추로 0.10 M → 0.010 M → 0.0010 M로 묽히며 “이 농도 기록하기”를 눌러요. 묽을수록 이온화도 α가 커져서 pH가 1씩 오르지 않고 약 0.5씩 올라가요.';
    if (ccCount() === 3 || (game && game.free)) body = '0.0010 M에서는 x/C가 13 %로 5 %를 넘어서 근사식(3.87)이 맞지 않아요. 이때는 이차 방정식을 계산기로 풀어 정확한 값(3.90)을 구해요. 약산의 pH 변화: 2.88 → 3.38 → 3.90 (약 +0.5).';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  function onLeave() {}
  /* ---------- 포인터 (탭) ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'meas') { const g = wsG(); for (let i = 0; i < 4; i++) { if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 6 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 30) { wsSelect(SK[i]); return false; } } }
      return false;
    },
    hover(p) { if (S.mode === 'meas') { const g = wsG(); for (let i = 0; i < 4; i++) if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 6 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 30) return 'pointer'; } return 'default'; },
  });

  /* ---------- UI 요소 ---------- */
  makeChips($('#wsSel'), SK.map((k) => [k, '0.10 M ' + SOL[k].f]), (v) => wsSelect(v));
  makeChips($('#apSel'), [['ch3', '약산 CH₃COOH'], ['nh3', '약염기 NH₃']], (v) => apSet(v));
  const mkSel = (host, label, opts, ans) => {
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = label;
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', label.replace(/<[^>]+>/g, ''));
    opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
    host.append(lab, sel); sel.ans = ans;
    sel.addEventListener('change', () => { Sound.click(); sel.classList.toggle('ok', sel.value === ans); sel.classList.toggle('bad', !!sel.value && sel.value !== ans); updateCtl(); });
    return sel;
  };
  const TO = [['', '고르기'], ['−x', '−x'], ['+x', '+x'], ['x', 'x'], ['0.10 − x', '0.10 − x'], ['0.10 + x', '0.10 + x'], ['0.10', '0.10'], ['0', '0']];
  const tblSel = ['변화 · CH₃COOH', '변화 · H⁺', '변화 · CH₃COO⁻', '평형 · CH₃COOH', '평형 · H⁺', '평형 · CH₃COO⁻'].map((l, i) => mkSel($('#tblSel'), l, TO, ICE_ANS[i]));
  const apAcidRows = [
    mkRow($('#apAcid'), { label: '[H⁺] = √(Ka·C) (M)', sci: true, ans: xApprox(C0), rel: 0.04 }, () => updateCtl()),
    mkRow($('#apAcid'), { label: 'pH (소수 둘째 자리)', ans: 2.87, tol: 0.025, ph: '0.00' }, () => updateCtl()),
  ];
  const apBaseRows = [
    mkRow($('#apBase'), { label: '[OH⁻] = √(Kb·C) (M)', sci: true, ans: xApprox(C0), rel: 0.04 }, () => updateCtl()),
    mkRow($('#apBase'), { label: 'pOH', ans: 2.87, tol: 0.025, ph: '0.00' }, () => updateCtl()),
    mkRow($('#apBase'), { label: 'pH = 14 − pOH', ans: 11.13, tol: 0.025, ph: '0.00' }, () => updateCtl()),
  ];
  const selBrk = $('#selBrk');
  selBrk.addEventListener('change', () => { Sound.click(); updateCtl(); });
  const sPred = $('#sPred'), sX = $('#sX'), sCc = $('#sCc');
  sPred.addEventListener('input', () => { S.ws.pv = +sPred.value; updateCtl(); });
  $('#pdMinus').addEventListener('click', () => { Sound.tick(); S.ws.pv = clamp(S.ws.pv - 0.5, 0, 14); updateCtl(); });
  $('#pdPlus').addEventListener('click', () => { Sound.tick(); S.ws.pv = clamp(S.ws.pv + 0.5, 0, 14); updateCtl(); });
  $('#bPredRec').addEventListener('click', wsRecPred); $('#bWMeas').addEventListener('click', wsMeasure);
  sX.addEventListener('input', () => icSetX(+sX.value / 100));
  $('#xMinus').addEventListener('click', () => { Sound.tick(); icSetX(S.ic.xmM - 0.01); }); $('#xPlus').addEventListener('click', () => { Sound.tick(); icSetX(S.ic.xmM + 0.01); });
  sCc.addEventListener('input', () => ccSet(+sCc.value));
  $('#ccMinus').addEventListener('click', () => { Sound.tick(); ccSet(S.cc.ci - 1); }); $('#ccPlus').addEventListener('click', () => { Sound.tick(); ccSet(S.cc.ci + 1); });
  $('#bRecCc').addEventListener('click', ccRecord); $('#bClrCc').addEventListener('click', () => { Sound.click(); ccClear(); });

  function uiExtra() {
    if (typeof selBrk === 'undefined') return;
    const w = S.ws, cur = w.cur, busy = w.state === 'move' || w.state === 'dip' || w.state === 'settle';
    markChips($('#wsSel'), cur, w.done);
    $('#oPred').textContent = '예측 pH ' + w.pv.toFixed(1) + (cur && w.pred[cur] != null ? ' (기록: ' + w.pred[cur].toFixed(1) + ')' : ''); sPred.value = w.pv;
    $('#pdMinus').disabled = w.pv <= 0; $('#pdPlus').disabled = w.pv >= 14;
    $('#bPredRec').disabled = !cur || busy; $('#bWMeas').disabled = !cur || busy || (w.pred[cur] == null && !(game && game.free));
    $('#sPred').disabled = !cur || busy;
    const ic = S.ic; sX.value = Math.round(ic.xmM * 100);
    const q = sciParts(ic.xmM * 1e-3 || 1e-9, 3);
    $('#oX').textContent = ic.xmM <= 0 ? 'x = 0 M' : 'x = ' + ic.xmM.toFixed(2) + '×10⁻³ M';
    $('#xMinus').disabled = ic.xmM <= 0; $('#xPlus').disabled = ic.xmM >= 5;
    $('#xNote').textContent = icTbl() || (game && game.free) ? (icOk() ? 'x²/(0.10 − x) = ' + sci(icVal(icX()), 2) + ' ≈ Ka! 평형이에요.' : 'x²/(0.10 − x) = ' + (ic.xmM <= 0 ? '0' : sci(icVal(icX()), 2)) + ' 가 Ka(1.8×10⁻⁵)와 같아지는 x를 찾아요. − + 단추는 0.01씩 조절해요.') : '표를 채우고 나면 x²/(0.10 − x) 값을 Ka와 비교할 수 있어요.';
    markChips($('#apSel'), S.ap.k, { ch3: apDone('ch3'), nh3: apDone('nh3') });
    sCc.value = S.cc.ci; $('#oCc').textContent = CONC3_TXT[S.cc.ci]; $('#ccMinus').disabled = S.cc.ci <= 0; $('#ccPlus').disabled = S.cc.ci >= 2;
    $('#bRecCc').disabled = S.cc.rec[S.cc.ci]; $('#bRecCc').textContent = S.cc.rec[S.cc.ci] ? '✅ 기록했어요' : '📋 이 농도 기록하기';
    tblSel.forEach((s, i) => { S.ic.selOk[i] = s.value === s.ans; });
  }

  function readouts() {
    const m = S.mode;
    if (m === 'meas') { const k = S.ws.cur, rd = S.ws.state === 'read'; setRead('선택한 용액', k ? '0.10 M ' + SOL[k].f : '—', '예측 → 측정', k ? (S.ws.pred[k] != null ? S.ws.pred[k].toFixed(1) : '—') + ' → ' + (S.ws.done[k] ? SOL[k].meas.toFixed(2) : '—') : '—', '측정한 용액', wsCount() + ' / 4'); }
    else if (m === 'ice') { const ic = S.ic; setRead('x (이온화한 양)', ic.xmM <= 0 ? '0 M' : ic.xmM.toFixed(2) + '×10⁻³ M', 'x²/(0.10 − x)', icTbl() || (game && game.free) ? (ic.xmM <= 0 ? '0' : sci(icVal(icX()), 2)) : '?', 'Ka', sci(KA, 2)); }
    else if (m === 'approx') { const k = S.ap.k, st = apStep(k); setRead(k === 'ch3' ? '[H⁺] ≈ √(Ka·C)' : '[OH⁻] ≈ √(Kb·C)', st >= 1 ? sci(xApprox(C0), 3) + ' M' : '?', k === 'ch3' ? 'pH' : 'pOH', st >= 2 ? r2d(pHof(xApprox(C0))).toFixed(2) : '?', k === 'ch3' ? '이온화도 x/C' : 'pH', k === 'ch3' ? (st >= 1 ? (xApprox(C0) / C0 * 100).toFixed(1) + ' %' : '?') : (st >= 3 ? '11.13' : '?')); }
    else { const i = S.cc.ci; setRead('농도', CONC3_TXT[i], '정확 pH (근사)', ccExact[i].toFixed(2) + ' (' + ccApprox[i].toFixed(2) + ')', '이온화도 α', (ccAlpha[i] * 100).toFixed(1) + ' %'); }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: 'pH 측정: 강한 쪽과 약한 쪽', short: 'pH 측정', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 농도가 같은 염산(pH 1.00)과 식초 성분 아세트산의 pH는 왜 다를까? 약산의 pH를 계산으로 예측할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 산의 세기를 Ka로 비교했고, 강산은 [H⁺] = C, <b>pH 단원</b>에서 pH = −log[H⁺]를 배웠어요. 약산·약염기는 일부만 이온화한다는 것을 알았지요.</div>' +
        '<p>0.10 M HCl, NaOH, CH₃COOH, NH₃의 <b>pH를 먼저 예측</b>하고 pH 미터로 측정해요. 강산 · 강염기 쪽과 약한 쪽을 나누어 생각해 보세요. 실험할 때는 <b>보안경과 장갑</b>을 착용하고, 남은 용액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['meas'],
      setup() { S.gate = ''; wsReset(); setScene('meas'); },
      recap: '같은 0.10 M이어도 약산은 강산보다 pH가 높고(CH₃COOH 2.89, HCl 1.02), 약염기는 강염기보다 pH가 낮아요(NH₃ 11.10, NaOH 12.97). 약산·약염기는 일부만 이온화하기 때문이에요.',
      summary: '<ul><li>0.10 M 수용액의 측정 pH: HCl <b>1.02</b>, NaOH <b>12.97</b>, CH₃COOH <b>2.89</b>, NH₃ <b>11.10</b></li><li>강산 · 강염기: [H⁺] = C, [OH⁻] = C → 이론 pH 1.00, 13.00</li><li>약산은 강산보다 pH가 약 1.9 높고 약염기는 강염기보다 약 1.9 낮아요.</li><li>이유: 약산 · 약염기는 <b>일부만 이온화</b>해서 [H⁺](또는 [OH⁻])가 0.10 M보다 훨씬 작아요.</li><li>안전: 보안경 · 장갑, 폐액은 폐수 처리 기준에 따라 처리</li></ul>',
      missions: [
        {
          title: '네 용액 예측하고 측정하기',
          goal: '네 용액 각각의 pH를 <b>예측해 기록</b>하고, pH 미터로 <b>측정</b>하세요.',
          hint: '시약병을 고르고 예측 슬라이더로 pH를 정해 “예측 기록”, 그다음 “측정하기”를 눌러요. 강산과 약산 중 pH가 더 작은 쪽은 어느 쪽일까요?',
          setup() { S.gate = ''; setScene('meas'); },
          check: () => wsPredCount() === 4 && wsCount() === 4, hold: 0.6,
          status: () => '예측 ' + wsPredCount() + ' / 4 &nbsp; 측정 ' + wsCount() + ' / 4 ' + mark(wsCount() === 4 && wsPredCount() === 4),
          explain: '측정값: HCl 1.02, NaOH 12.97, CH₃COOH 2.89, NH₃ 11.10. 같은 0.10 M인데 약산 CH₃COOH는 pH 1이 아니라 약 2.9, 약염기 NH₃는 pH 13이 아니라 약 11.1이에요.',
        },
        {
          type: 'quiz', title: 'CH₃COOH의 pH가 1이 아닌 까닭',
          goal: '0.10 M CH₃COOH의 pH가 <b>1이 아니라 2.89</b>인 까닭은?',
          setup() { S.gate = ''; setScene('meas'); },
          choices: ['CH₃COOH는 물에서 전혀 이온화하지 않기 때문이에요', '일부만 이온화해서 [H⁺]가 0.10 M보다 훨씬 작기 때문이에요', '아세트산은 염기이기 때문이에요', 'pH 미터가 정확하지 않기 때문이에요'],
          answer: 1,
          feedback: ['전혀 이온화하지 않는다면 pH가 7에 가까워야 해요. 일부는 이온화해요.', '', '아세트산은 산이에요. 염기라면 pH가 7보다 컸을 거예요.', '다른 용액의 측정값은 이론값과 잘 맞아요. 약산이라서 달라요.'],
          explain: '[H⁺] = 10^(−2.89) ≈ 1.3×10⁻³ M로, 처음 농도 0.10 M의 약 1 %예요. 일부만 이온화하는 약산이라서 pH가 강산(1.00)보다 높아요.',
        },
      ],
    },
    {
      title: '평형 표: 처음 · 변화 · 평형', short: '평형 표', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 약산은 일부만 이온화한다는 것을 확인했어요. 그 <b>일부(x)</b>를 어떻게 구할까요? 화학 평형 단원의 <b>평형 표</b>를 써요.</div>' +
        '<p>CH₃COOH ⇌ H⁺ + CH₃COO⁻ 에서 처음 · 변화 · 평형의 농도를 표로 정리하고, 변화량 x로 <b>Ka = x²/(0.10 − x)</b> 식을 세워요.</p>',
      features: ['ice'],
      setup() { S.gate = ''; tblSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); icSetX(0); setScene('ice'); },
      recap: '약산의 평형 표: CH₃COOH 0.10 − x, H⁺ x, CH₃COO⁻ x. Ka = [H⁺][CH₃COO⁻]/[CH₃COOH] = x²/(0.10 − x)를 만족하는 x가 평형에서 이온화한 양이에요.',
      summary: '<ul><li>CH₃COOH ⇌ H⁺ + CH₃COO⁻ (처음 0.10 / 0 / 0)</li><li>변화: −x / +x / +x, 평형: <b>0.10 − x / x / x</b></li><li><b>Ka = x² / (0.10 − x) = 1.8×10⁻⁵</b></li><li>1 : 1로 생성되므로 평형에서 [H⁺] = [CH₃COO⁻] = x</li><li>x ≈ 1.33×10⁻³ M (HA 1000개 중 약 13개가 이온화)</li></ul>',
      missions: [
        {
          title: '평형 표 채우기', manual: true,
          goal: 'CH₃COOH ⇌ H⁺ + CH₃COO⁻ 의 <b>변화</b> 행과 <b>평형</b> 행의 여섯 칸을 채우고 <b>✔ 확인하기</b>를 누르세요. (처음 0.10 / 0 / 0)',
          hint: '반응이 x만큼 진행되면 CH₃COOH는 x 줄고(−x), H⁺와 CH₃COO⁻는 각각 x 늘어요(+x). 평형 = 처음 + 변화예요.',
          setup() { S.gate = 'tbl'; tblSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); setScene('ice'); updateCtl(); },
          check() {
            if (tblSel.some((s) => !s.value)) return '여섯 칸을 모두 골라 주세요.';
            const n = tblSel.filter((s) => s.value === s.ans).length; if (n === 6) return true;
            return (n < 6 ? (6 - n) + '칸이 달라요. ' : '') + '변화 행은 −x, +x, +x, 평형 행은 처음 + 변화(0.10 − x, x, x)예요.';
          },
          status: () => '맞은 칸 ' + tblSel.filter((s) => s.value === s.ans).length + ' / 6',
          explain: '변화: −x, +x, +x. 평형: [CH₃COOH] = 0.10 − x, [H⁺] = x, [CH₃COO⁻] = x. 그래서 <b>Ka = x·x/(0.10 − x) = x²/(0.10 − x)</b>를 세울 수 있어요.',
        },
        {
          title: '평형이 되는 x 찾기',
          goal: 'x 슬라이더를 움직여 <b>x²/(0.10 − x)가 Ka(1.8×10⁻⁵)와 같아지는</b> x를 찾으세요. (±5 % 이내)',
          hint: 'x가 너무 작으면 값이 Ka보다 작고, 너무 크면 커요. x = 1.3×10⁻³ M 근처(슬라이더 1.3 근처)예요. − + 단추는 0.01씩 움직여요.',
          setup() { S.gate = ''; if (!icTbl()) tblSel.forEach((q) => { q.value = q.ans; q.classList.add('ok'); q.classList.remove('bad'); }); icSetX(0); setScene('ice'); updateCtl(); },
          check: () => icOk(), hold: 0.8,
          status: () => 'x = ' + S.ic.xmM.toFixed(2) + '×10⁻³ M , 값 ' + (S.ic.xmM <= 0 ? '0' : sci(icVal(icX()), 2)) + ' ' + mark(icOk()),
          explain: 'x ≈ 1.33×10⁻³ M에서 x²/(0.10 − x) = 1.8×10⁻⁵ 로 Ka와 같아요. 이때 HA 1000개 중 약 13개가 이온화해 있어요(이온화도 약 1.3 %).',
        },
        {
          type: 'quiz', title: '[H⁺] = [CH₃COO⁻] 인 까닭',
          goal: '평형에서 <b>[H⁺]와 [CH₃COO⁻]가 같은</b> 까닭은?',
          setup() { S.gate = ''; setScene('ice'); },
          choices: ['CH₃COO⁻가 물에서 H⁺로 바뀌기 때문이에요', 'CH₃COOH 1개가 이온화할 때 H⁺ 1개와 CH₃COO⁻ 1개가 1 : 1로 생기기 때문이에요', '물이 H⁺를 더 많이 내놓기 때문이에요', '두 이온은 항상 같은 농도로 정해진 값이기 때문이에요'],
          answer: 1,
          feedback: ['CH₃COO⁻는 H⁺로 바뀌지 않아요. CH₃COOH가 갈라져서 두 이온이 함께 생겨요.', '', '물의 자동 이온화로 생기는 H⁺(1.0×10⁻⁷ M)는 1.3×10⁻³ M에 비해 아주 작아서 무시해요.', '값이 정해져 있는 것이 아니라 반응식의 계수비(1 : 1)에서 나오는 거예요.'],
          explain: 'CH₃COOH → H⁺ + CH₃COO⁻ 은 계수가 1 : 1 : 1이라서 이온이 <b>같은 양 x씩</b> 생겨요. 그래서 [H⁺] = [CH₃COO⁻] = x예요.',
        },
      ],
    },
    {
      title: '근사식: [H⁺] ≈ √(Ka·C)', short: '근사식', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Ka = x²/(0.10 − x)를 세웠어요. 이 이차식을 매번 풀기는 어려워요. x가 처음 농도보다 <b>훨씬 작다</b>면 쉽게 근사할 수 있어요.</div>' +
        '<p>x ≪ 0.10 이면 0.10 − x ≈ 0.10 이므로 <b>x = √(Ka·C)</b>예요. 약염기는 [OH⁻] ≈ √(Kb·C)로 같은 방법을 써요. 단, <b>이온화도(x/C)가 5 % 이하</b>일 때만 쓸 수 있어요.</p>',
      features: ['approx'],
      setup() { S.gate = ''; apAcidRows.forEach((r) => r.clear()); apBaseRows.forEach((r) => r.clear()); apSet('ch3'); setScene('approx'); },
      recap: '약산 [H⁺] ≈ √(Ka·C), 약염기 [OH⁻] ≈ √(Kb·C) (이온화도 5 % 이하일 때). 0.10 M CH₃COOH는 pH 2.87, 0.10 M NH₃는 pH 11.13으로 측정값(2.89, 11.10)과 잘 맞아요.',
      summary: '<ul><li>x ≪ C → C − x ≈ C → <b>[H⁺] ≈ √(Ka·C)</b> (약산), <b>[OH⁻] ≈ √(Kb·C)</b> (약염기)</li><li>적용 조건: 이온화도 x/C ≤ <b>5 %</b></li><li>0.10 M CH₃COOH: [H⁺] = √(1.8×10⁻⁵ × 0.10) = 1.34×10⁻³ M → pH <b>2.87</b> (측정 2.89)</li><li>0.10 M NH₃: [OH⁻] = 1.34×10⁻³ M → pOH 2.87 → pH = 14 − 2.87 = <b>11.13</b> (측정 11.10)</li><li>이론값과 측정값 오차: HCl 2.0 %, NaOH 0.2 %, CH₃COOH 0.7 %, NH₃ 0.3 %</li></ul>',
      missions: [
        {
          title: '약산의 pH 계산하기',
          goal: '근사식으로 <b>0.10 M CH₃COOH</b>의 [H⁺]와 pH를 구하세요. (Ka = 1.8×10⁻⁵)',
          hint: '[H⁺] = √(1.8×10⁻⁵ × 0.10) = √(1.8×10⁻⁶) ≈ 1.34×10⁻³ M. 그다음 pH = −log(1.34×10⁻³) = 3 − log 1.34 ≈ 2.87이에요.',
          setup() { S.gate = ''; apAcidRows.forEach((r) => r.clear()); apSet('ch3'); setScene('approx'); },
          check: () => apAcidRows.every((r) => r.ok), hold: 0.5,
          status: () => '[H⁺] ' + mark(apAcidRows[0].ok) + ' &nbsp; pH ' + mark(apAcidRows[1].ok),
          explain: '[H⁺] = √(Ka·C) = √(1.8×10⁻⁵ × 0.10) = 1.34×10⁻³ M, pH = −log(1.34×10⁻³) = <b>2.87</b>. 이온화도 x/C = 1.3 %로 5 % 이하라서 근사식을 써도 돼요. 측정값 2.89와 0.7 % 차이예요.',
        },
        {
          title: '약염기의 pH 계산하기',
          goal: '<b>0.10 M NH₃</b>의 [OH⁻], pOH, pH를 차례로 구하세요. (Kb = 1.8×10⁻⁵)',
          hint: '[OH⁻] = √(Kb·C) = 1.34×10⁻³ M → pOH = −log[OH⁻] = 2.87 → pH = 14 − pOH = 11.13이에요.',
          setup() { S.gate = ''; apBaseRows.forEach((r) => r.clear()); apSet('nh3'); setScene('approx'); },
          check: () => apBaseRows.every((r) => r.ok), hold: 0.5,
          status: () => '[OH⁻] ' + mark(apBaseRows[0].ok) + ' pOH ' + mark(apBaseRows[1].ok) + ' pH ' + mark(apBaseRows[2].ok),
          explain: '[OH⁻] = √(Kb·C) = 1.34×10⁻³ M, pOH = 2.87, pH = 14 − 2.87 = <b>11.13</b>. 측정값 11.10과 잘 맞아요. 약염기는 약산과 같은 방법이고 마지막에 14에서 빼는 단계만 더 있어요.',
        },
        {
          type: 'quiz', title: 'NH₃의 pH 계산 순서',
          goal: '약염기 NH₃ 수용액의 pH를 구할 때의 <b>올바른 순서</b>는?',
          setup() { S.gate = ''; setScene('approx'); },
          choices: ['pH를 먼저 구하고 14에서 빼서 [OH⁻]를 구해요', '[OH⁻]를 먼저 구하고, pOH를 거쳐 마지막에 pH = 14 − pOH를 해요', '[H⁺] = √(Ka·C)로 바로 pH를 구해요', 'pOH와 pH는 같아서 구분하지 않아요'],
          answer: 1,
          feedback: ['염기에서는 OH⁻가 직접 생겨서 [OH⁻]를 먼저 구해요.', '', 'NH₃에는 Ka가 아니라 Kb를 써요. 그리고 바로 구하는 것은 [OH⁻]예요.', 'pH + pOH = 14 이므로 서로 달라요 (25 °C).'],
          explain: '약염기는 [OH⁻] = √(Kb·C) → pOH = −log[OH⁻] → <b>pH = 14 − pOH</b> 순서예요. 먼저 구하는 것이 [OH⁻]이고 마지막에 14 − pOH를 해요.',
        },
      ],
    },
    {
      title: '농도와 pH: 근사식이 깨질 때', short: '농도와 pH', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 근사식은 이온화도가 5 % 이하일 때 쓸 수 있다고 배웠어요. 용액을 묽히면 이온화도는 어떻게 될까요? 근사식은 계속 맞을까요?</div>' +
        '<p>CH₃COOH를 0.10 M → 0.010 M → 0.0010 M로 묽히며 pH를 기록해요. 강산 HCl과도 비교해 보세요. 근사식이 맞지 않을 때는 이차 방정식을 계산기로 푼 <b>정확한 값</b>을 써요.</p>',
      features: ['conc'],
      setup() { S.gate = ''; ccClear(); ccSet(0); setScene('conc'); },
      recap: '묽을수록 이온화도가 커져서 약산의 pH는 10배 희석에 약 0.5씩만 올라가요(강산은 1씩). 0.0010 M에서는 이온화도가 약 13 %로 5 %를 넘어 근사식(3.87)이 맞지 않고 정확한 값은 3.90이에요.',
      summary: '<ul><li>CH₃COOH pH (근사 → 정확): 0.10 M <b>2.87 → 2.88</b>, 0.010 M <b>3.37 → 3.38</b>, 0.0010 M <b>3.87 → 3.90</b></li><li>이온화도: 0.10 M 1.3 % → 0.010 M 4.2 % → 0.0010 M <b>약 13 %</b></li><li>0.0010 M에서는 5 %를 넘어 <b>근사식 부적합</b> → 이차 방정식으로 구한 정확한 값 3.90</li><li>10배 묽힐 때: 강산 pH <b>+1</b> (1 → 2 → 3), 약산 pH 약 <b>+0.5</b></li></ul>',
      missions: [
        {
          title: '농도별 pH 기록하기',
          goal: '세 농도(0.10 M, 0.010 M, 0.0010 M)를 차례로 골라 <b>“이 농도 기록하기”</b>를 눌러 pH를 기록하세요.',
          hint: '농도 슬라이더의 + 단추로 묽히고, 각 농도에서 기록 단추를 눌러요. 그래프에 점이 찍혀요.',
          setup() { S.gate = ''; ccClear(); ccSet(0); setScene('conc'); },
          check: () => ccCount() === 3, hold: 0.6,
          status: () => '기록 ' + ccCount() + ' / 3 ' + mark(ccCount() === 3),
          explain: 'HCl은 1.00 → 2.00 → 3.00으로 1씩 올라가지만, CH₃COOH는 2.88 → 3.38 → 3.90으로 약 0.5씩만 올라가요. 묽을수록 이온화도가 커지기 때문이에요.',
        },
        {
          title: '근사식이 깨지는 농도 찾기', manual: true,
          goal: '이온화도(x/C)가 <b>5 %를 넘어</b> 근사식을 쓸 수 없는 농도를 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '농도를 바꾸면서 오른쪽의 근사 조건 막대가 5 % 선을 넘는 때를 찾아요.',
          setup() { S.gate = 'brk'; selBrk.value = ''; setScene('conc'); updateCtl(); },
          check() { if (!selBrk.value) return '하나를 골라 주세요.'; return selBrk.value === '2' ? true : (selBrk.value === '0' ? '0.10 M에서는 x/C가 1.3 %로 5 % 이하예요. 더 묽은 용액을 살펴보세요.' : '0.010 M에서는 x/C가 4.2 %로 아직 5 % 이하예요. 더 묽은 용액을 살펴보세요.'); },
          status: () => '선택 ' + (selBrk.value ? CONC3_TXT[+selBrk.value] : '—'),
          explain: '0.0010 M에서는 근사식의 x/C = √(Ka·C)/C ≈ 13 %로 5 %를 넘어요. 그래서 근사식 값(3.87)이 아니라 이차 방정식으로 구한 정확한 값 <b>3.90</b>을 써야 해요.',
        },
        {
          type: 'quiz', title: '약산을 10배 묽히면?',
          goal: '약산을 10배 묽히면 pH가 1이 아니라 <b>약 0.5</b>만 올라가는 까닭은?',
          setup() { S.gate = ''; setScene('conc'); },
          choices: ['묽을수록 이온화도가 커져서 [H⁺]가 1/10보다 덜 줄어들기 때문이에요', '약산은 물에 녹지 않기 때문이에요', 'Ka가 10배 커지기 때문이에요', '묽히면 H⁺가 모두 사라지기 때문이에요'],
          answer: 0,
          feedback: ['', '약산도 물에 녹아 일부 이온화해요.', 'Ka는 온도가 같으면 변하지 않아요.', '묽혀도 H⁺는 남아 있어요. 다만 농도가 줄어요.'],
          explain: '약산은 [H⁺] ≈ √(Ka·C)이므로 C가 1/10이 되면 [H⁺]는 1/√10 ≈ 0.32배가 돼요. pH는 0.5만 올라요. 강산은 [H⁺] = C이므로 [H⁺]가 1/10이 되어 pH가 1 올라요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-weak-ph', mount: '#game', badge: '약산 pH 박사', homeHref: '../../index.html#hr',
    featureLabels: { meas: '🧪 예측 · pH 미터', ice: '🧩 평형 표 · 입자 수', approx: '🧮 근사식 계산 · 이론값 비교', conc: '📈 농도 슬라이더 · pH 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('meas');
  function stepAll1(dt) { stepMeas(dt); stepIce(dt); stepConc(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'meas') drawMeas(t); else if (S.mode === 'ice') drawIce(t); else if (S.mode === 'approx') drawApprox(t); else drawConc(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, SOL, SK, tblSel, apAcidRows, apBaseRows, selBrk, wsG, icG, apG, ccG, wsSelect, wsRecPred, wsMeasure, wsCount, icSetX, icOk, icVal, apSet, ccSet, ccRecord, ccApprox, ccExact, ccAlpha, ccRatio, errPct,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
