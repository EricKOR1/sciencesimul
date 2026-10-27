/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 완충 용액과 혈액 [12반응01-05]
   ① 실험: 물과 비교 (물 100 mL / 완충 용액 100 mL에 0.10 M HCl · NaOH 1 mL, pH 변화 측정)  ② 모형: 완충 원리 (CH₃COOH ⇌ H⁺ + CH₃COO⁻ 평형 이동, 완충 용량)
   ③ 설명: 혈액 완충 (CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻, 폐의 CO₂ 배출)  ④ 예측: 몸의 조절 (운동 · 과호흡 · 호흡 억제 · 레몬즙, 정상 범위 pH 7.35 ~ 7.45)
   복잡한 pH 계산(헨더슨–하셀바흐 식, 완충 용량 계산)은 하지 않고 pH 수치는 측정 자료로 제공해요. 다른 생체 완충계(인산염 · 단백질)는 이름만 언급해요. 모든 용액은 25 °C. */
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



  const MODE_LABEL = { beak: '💧 물과 비교', mech: '🧩 완충 원리', blood: '🩸 혈액 완충', regul: '🏃 몸의 조절' };
  const SPL = SciSim.ease;
  const rect = (x, y, w, h) => ({ x, y, w, h });

  /* ---------- 자료 (25 °C, 측정값) ---------- */
  const KA = Math.pow(10, -4.74);                    // CH₃COOH (pKa 4.74)
  function phGen(Ct, Na, Cl) {                       // 전하 균형: [H⁺] + [Na⁺] = [A⁻] + [Cl⁻] + [OH⁻]
    let lo = -14, hi = 0;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, h = Math.pow(10, m); if (h + Na - Ct * KA / (KA + h) - Cl - KW / h > 0) hi = m; else lo = m; }
    return -(lo + hi) / 2;
  }
  /* 완충 용액 100 mL(CH₃COOH 10 mmol + CH₃COONa 10 mmol)에 0.10 M HCl x mL (또는 NaOH x mL)를 넣은 측정 자료 */
  const bufPh = (x, base) => phGen(20 / (100 + x), (10 + (base ? 0.1 * x : 0)) / (100 + x), (base ? 0 : 0.1 * x) / (100 + x));
  const acOnlyPh = (x, base) => phGen(10 / (100 + x), (base ? 0.1 * x : 0) / (100 + x), (base ? 0 : 0.1 * x) / (100 + x));
  const BK = {
    water: { name: '물 100 mL', base: 7.0, hcl: 3.0, naoh: 11.0 },
    buf: { name: '완충 용액 100 mL', base: r2d(bufPh(0)), hcl: r2d(bufPh(1)), naoh: r2d(bufPh(1, true)) },
  };
  const ACO = { base: r2d(acOnlyPh(0)), hcl: r2d(acOnlyPh(1)), naoh: r2d(acOnlyPh(1, true)) };
  const CAP_X = [0, 20, 40, 60, 80, 90, 100];
  const capPh = (x) => r2d(bufPh(x));
  const RG = { hcl: { name: '0.10 M HCl 1 mL', short: 'HCl', col: '#ef4444' }, naoh: { name: '0.10 M NaOH 1 mL', short: 'NaOH', col: '#3b82f6' } };
  const BKS = ['water', 'buf'], RGS = ['hcl', 'naoh'];

  Object.assign(S, {
    mode: 'beak', sub: { mech: 'part' },
    bk: { cur: 'water', rg: 'hcl', state: 'idle', tmr: 0, dx: 0, init: false, drops: [], tb: null, tr: null, pHd: { water: 7.0, buf: BK.buf.base }, pHt: { water: 7.0, buf: BK.buf.base }, trial: { water: { hcl: null, naoh: null }, buf: { hcl: null, naoh: null } }, bulb: 0, shake: 0 },
    mc: { view: 'part', sol: 'buf', capX: 0, capMax: 0, shift: 0, shiftT: 0, nH: 0, nO: 0, p: [], built: false, evtH: 0, evtO: 0, caps: 0 },
    bl: { hco3: 24, co2: 1.2, hcoD: 24, co2D: 1.2, needle: 7.4, nd: 7.4, shift: 0, shiftT: 0, nH: 0, nO: 0, bubbles: [], acid: 0, phase: 'idle', tm: 0, flow: 0 },
    rg: { sc: 'ex', pred: {}, body: {}, played: {}, run: null, nd: 7.4, ndT: 7.4, hco: 24, co2: 1.2, hcoD: 24, co2D: 1.2, tm: 0, flow: 0, shift: 0 },
  });
  const mmm = (v) => v.toFixed(1);

  /* ============ ① 물과 비교 ============ */
  const bkG = () => (PHONE
    ? { bw: 104, bh: 116, by: MAIN.y + 124, xs: [MAIN.x + 76, MAIN.x + 254], gx: [MAIN.x + 140, MAIN.x + 318], gy: MAIN.y + 100, gh: 170, tb: rect(MAIN.x + 8, MAIN.y + 288, 448, 130), rest: MAIN.x + 232, tipY: MAIN.y + 112 }
    : { bw: 126, bh: 128, by: MAIN.y + 146, xs: [MAIN.x + 100, MAIN.x + 330], gx: [MAIN.x + 180, MAIN.x + 410], gy: MAIN.y + 112, gh: 190, tb: rect(MAIN.x + 450, MAIN.y + 8, 318, 326), rest: MAIN.x + 215, tipY: MAIN.y + 128 });
  const BK_LEVEL = 0.6;
  const bkCount = () => BKS.reduce((n, b) => n + RGS.filter((r) => S.bk.trial[b][r]).length, 0);
  const bkBusy = () => S.bk.state !== 'idle';
  function bkSelect(b) { if (bkBusy()) return; S.bk.cur = b; Sound.click(); updateCtl(); }
  function bkReagent(r) { if (bkBusy()) return; S.bk.rg = r; Sound.click(); updateCtl(); }
  function bkDrop() {
    const k = S.bk; if (bkBusy()) return;
    k.tb = k.cur; k.tr = k.rg; k.state = 'move'; k.tmr = 0; k.drops = []; k.pHt[k.tb] = BK[k.tb].base; Sound.click(); updateCtl();
  }
  function bkReset() { const k = S.bk; k.state = 'idle'; k.drops = []; k.tb = null; k.tr = null; k.trial = { water: { hcl: null, naoh: null }, buf: { hcl: null, naoh: null } }; BKS.forEach((b) => { k.pHt[b] = BK[b].base; k.pHd[b] = BK[b].base; }); updateCtl(); }
  function stepBeak(dt) {
    const k = S.bk, g = bkG();
    if (!k.init) { k.init = true; k.dx = g.rest; }
    k.bulb = ap(k.bulb, 0, dt, 6); k.shake = ap(k.shake, 0, dt, 5);
    BKS.forEach((b) => { k.pHd[b] = ap(k.pHd[b], k.pHt[b], dt, 4); if (Math.abs(k.pHd[b] - k.pHt[b]) < 0.003) k.pHd[b] = k.pHt[b]; });
    const ix = k.tb ? BKS.indexOf(k.tb) : -1;
    if (k.state === 'idle') k.dx = ap(k.dx, g.rest, dt, 6);
    else if (k.state === 'move') { k.dx = ap(k.dx, g.xs[ix], dt, 7); if (Math.abs(k.dx - g.xs[ix]) < 2) { k.state = 'drip'; k.tmr = 0; k.nd = 0; } }
    else if (k.state === 'drip') {
      k.tmr += dt; k.dx = g.xs[ix];
      const surf = g.by + 5 + (g.bh - 11) * (1 - BK_LEVEL);
      while (k.nd < 6 && k.tmr > 0.25 + k.nd * 0.22) { k.nd++; k.bulb = 1; k.drops.push({ x: g.xs[ix] + (Math.random() - 0.5) * 6, y: g.tipY + 12, vy: 30, live: true }); }
      for (let i = k.drops.length - 1; i >= 0; i--) {
        const q = k.drops[i]; q.vy += 900 * dt; q.y += q.vy * dt;
        if (q.y >= surf) { k.drops.splice(i, 1); for (let n = 0; n < 4; n++) parts.emit({ x: q.x, y: surf, vx: (Math.random() - 0.5) * 70, vy: -60 - Math.random() * 50, life: 0.45, size: 2.2, color: RG[k.tr].col, gravity: 420, shape: 'circle' }); }
      }
      if (k.nd >= 6 && !k.drops.length) { k.state = 'settle'; k.tmr = 0; k.pHt[k.tb] = BK[k.tb][k.tr]; }
    } else if (k.state === 'settle') {
      k.tmr += dt;
      if (Math.abs(k.pHd[k.tb] - k.pHt[k.tb]) < 0.004 && k.tmr > 0.6) {
        k.trial[k.tb][k.tr] = { before: BK[k.tb].base, after: BK[k.tb][k.tr] }; Sound.success(); flash(g.xs[ix], g.by + 30, [RG[k.tr].col, '#14a058', '#ffb400']);
        k.state = 'idle'; k.tb = null; updateCtl();
      }
    }
  }
  function drawDropper(x, y, col, squeeze, moving) {
    ctx.save(); ctx.translate(x, y);
    const sq = 1 - 0.18 * squeeze;
    ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.ellipse(0, -62, 11 * (2 - sq), 14 * sq, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-4, -66, 3.4, 6 * sq, -0.4, 0, TAU); ctx.fill();
    D.roundRect(-5.5, -50, 11, 12, 3); ctx.fillStyle = '#9ca3af'; ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.2; D.roundRect(-5, -40, 10, 40, 4); ctx.fillStyle = C.rgba(col, 0.55); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.rgba(col, 0.9); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(1.6, 12); ctx.lineTo(-1.6, 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore(); void moving;
  }
  function drawBeak(t) {
    const k = S.bk, g = bkG();
    T(14, 26, '💧 물과 완충 용액에 산과 염기를 1 mL씩 넣어요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    BKS.forEach((b, i) => {
      const x = g.xs[i] - g.bw / 2, on = k.cur === b, pd = k.pHd[b];
      if (on) { D.roundRect(x - 10, g.by - 12, g.bw + 52, g.bh + 76, 14); ctx.fillStyle = 'rgba(139,92,246,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 2; ctx.stroke(); }
      const col = C.mix('#e8f1ff', phColor(pd), 0.88);
      beaker(x, g.by, g.bw, g.bh, { level: BK_LEVEL, color: col, alpha: 0.8 });
      T(g.xs[i], g.by + g.bh + 20, BK[b].name, PHONE ? 13 : 14.5, INK, 'center', 800);
      T(g.xs[i], g.by + g.bh + 44, 'pH ' + pd.toFixed(2), PHONE ? 16 : 20, '#5b21b6', 'center', 800);
      // pH 막대
      const gx = g.gx[i], gy = g.gy, gh = g.gh, Y = (p) => gy + gh * (1 - clamp(p, 0, 14) / 14);
      const gr = ctx.createLinearGradient(0, gy, 0, gy + gh); PH_STOPS.slice().reverse().forEach(([p, c]) => gr.addColorStop(1 - p / 14, c));
      D.roundRect(gx, gy, 14, gh, 7); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = 'rgba(40,50,80,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let p = 0; p <= 14; p += 2) { T(gx + 20, Y(p) + 4.5, String(p), 12, MUTED, 'left', 700); }
      const b0 = BK[b].base;
      ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx + 7, Y(b0), 6, 0, TAU); ctx.fill(); ctx.stroke();
      if (Math.abs(pd - b0) > 0.004) {
        ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(gx + 7, Y(b0)); ctx.lineTo(gx + 7, Y(pd)); ctx.stroke();
        D.sphere(gx + 7, Y(pd), 6.5, '#8b5cf6', { gloss: false, outline: '#fff', outlineWidth: 2 });
      }
    });
    // 스포이트
    const rgc = RG[k.tr || k.rg].col, sq = k.state === 'drip' ? k.bulb : 0;
    drawDropper(k.dx, g.tipY, rgc, sq, k.state !== 'idle');
    T(k.dx, g.tipY - 90, RG[k.tr || k.rg].short + ' 0.10 M', 12.5, rgc, 'center', 800);
    k.drops.forEach((q) => { ctx.fillStyle = rgc; ctx.beginPath(); ctx.ellipse(q.x, q.y, 3, 4.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(q.x - 1, q.y - 1.4, 1, 0, TAU); ctx.fill(); });
    // 기록표
    const tb = g.tb;
    D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(tb.x + 12, tb.y + 22, '기록표 (넣기 전 → 넣은 뒤)', 13.5, INK, 'left', 800);
    const known = dlRows.every((r) => r.ok) || (game && game.free);
    let row = 0;
    BKS.forEach((b) => RGS.forEach((r) => {
      const yy = tb.y + (PHONE ? 46 : 56) + row * (PHONE ? 22 : 56), tr = k.trial[b][r];
      if (!PHONE) { D.roundRect(tb.x + 8, yy - 24, tb.w - 16, 46, 9); ctx.fillStyle = tr ? '#fff' : 'rgba(255,255,255,.5)'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 1.4; ctx.stroke(); }
      const label = (b === 'water' ? '물' : '완충') + ' + ' + RG[r].short;
      if (PHONE) {
        T(tb.x + 10, yy, label, 13.5, RG[r].col, 'left', 800);
        T(tb.x + 150, yy, tr ? tr.before.toFixed(2) + ' → ' + tr.after.toFixed(2) : '—', 14, tr ? INK : '#b0b8c8', 'left', 800);
        T(tb.x + tb.w - 10, yy, tr ? (known ? 'Δ ' + Math.abs(tr.after - tr.before).toFixed(2) : 'Δ ?') : '', 14, '#b45309', 'right', 800);
      } else {
        T(tb.x + 18, yy - 4, label, 14, RG[r].col, 'left', 800);
        T(tb.x + 18, yy + 15, tr ? tr.before.toFixed(2) + '  →  ' + tr.after.toFixed(2) : '아직 안 넣었어요', 15, tr ? INK : '#b0b8c8', 'left', 800);
        T(tb.x + tb.w - 18, yy + 8, tr ? (known ? 'Δ ' + Math.abs(tr.after - tr.before).toFixed(2) : 'Δ ?') : '', 16, '#b45309', 'right', 800);
      }
      row++;
    }));
    if (!PHONE) T(tb.x + tb.w / 2, tb.y + tb.h - 18, '만능 지시약 색: 빨강 → 노랑 → 초록 → 파랑 → 보라', 12.5, MUTED, 'center', 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '같은 양의 산 · 염기를 넣으면 pH는 얼마나 변할까요?', 15, '#b45309', 'left', 800);
    const n = bkCount();
    let body = '비커를 고르고 넣을 용액을 고른 뒤 “1 mL 넣기”를 눌러요. 네 가지 경우를 모두 해 보세요. (기록 ' + n + ' / 4)';
    if (n === 4) body = '물은 pH가 7.00에서 3.00 또는 11.00으로 4.00이나 변했지만, 완충 용액은 4.74에서 4.73 또는 4.75로 0.01만 변했어요. 만능 지시약 색도 물만 크게 변해요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  /* ============ ② 완충 원리 ============ */
  const MK = {
    HA: { lab: 'HA', col: '#fbbf24', r: 12, tc: '#5b3a00', ts: 0.9 }, A: { lab: 'A⁻', col: '#ea580c', r: 12, ts: 0.9 }, H: { lab: 'H⁺', col: '#ef4444', r: 9, ts: 0.85 },
    OH: { lab: 'OH⁻', col: '#3b82f6', r: 12, ts: 0.78 }, W: { lab: 'H₂O', col: '#bae6fd', r: 10, tc: '#0c4a6e', ts: 0.78 },
  };
  const MSOL = { buf: { name: '완충 용액', ha: 12, a: 12, h: 1 }, ac: { name: '아세트산만', ha: 23, a: 1, h: 1 } };
  const mcG = () => (PHONE
    ? { box: rect(MAIN.x + 8, MAIN.y + 40, 448, 220), eq: rect(MAIN.x + 8, MAIN.y + 268, 448, 70), dt: rect(MAIN.x + 8, MAIN.y + 344, 448, 74), gr: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 232), cp: rect(MAIN.x + 8, MAIN.y + 242, 448, 176) }
    : { box: rect(MAIN.x + 14, MAIN.y + 40, 470, 290), eq: rect(MAIN.x + 498, MAIN.y + 40, 264, 120), dt: rect(MAIN.x + 498, MAIN.y + 168, 264, 162), gr: rect(MAIN.x + 8, MAIN.y + 4, 496, MAIN.h - 8), cp: rect(MAIN.x + 516, MAIN.y + 8, 252, 326) });
  const mcIn = () => { const b = mcG().box; return { x0: b.x + 8, y0: b.y + 34, x1: b.x + b.w - 8, y1: b.y + b.h - 8 }; };
  const mkR = (k) => MK[k].r + 1;
  function mcBuild(sol) {
    const mc = S.mc, g = mcIn(), c = MSOL[sol]; mc.sol = sol; mc.p = []; mc.built = true; mc.shift = 0; mc.shiftT = 0; mc.nH = 0; mc.nO = 0; mc.msg = '';
    const place = (k, n) => { let tries = 0; for (let i = 0; i < n && tries < 4000; tries++) { const x = g.x0 + 16 + Math.random() * (g.x1 - g.x0 - 32), y = g.y0 + 16 + Math.random() * (g.y1 - g.y0 - 32); if (mc.p.some((q) => Math.hypot(q.x - x, q.y - y) < 28)) continue; const a = Math.random() * TAU; mc.p.push({ k, x, y, vx: Math.cos(a) * 24, vy: Math.sin(a) * 24, tgt: null, claimed: false, dead: false, trail: 0 }); i++; } };
    place('HA', c.ha); place('A', c.a); place('H', c.h);
  }
  function mcAdd(kind) {
    const mc = S.mc, g = mcIn();
    for (let i = 0; i < 3; i++) {
      const x = g.x0 + 30 + Math.random() * (g.x1 - g.x0 - 60), y = g.y0 - 6 - i * 16;
      const q = { k: kind, x, y, vx: 0, vy: 40, tgt: null, claimed: false, dead: false, trail: 0, seek: true };
      const want = kind === 'H' ? 'A' : 'HA';
      let best = null, bd = 1e9; mc.p.forEach((o) => { if (o.k === want && !o.claimed && !o.dead) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } } });
      if (best) { best.claimed = true; q.tgt = best; }
      mc.p.push(q);
    }
    mc.last = kind;
    if (kind === 'H') { mc.nH++; mc.shift = -1; } else { mc.nO++; mc.shift = 1; }
    mc.shiftT = 2.2; Sound.click();
    const sol = mc.sol, cnt = (k) => mc.p.filter((o) => o.k === k && !o.dead).length;
    void sol; void cnt; updateCtl();
  }
  const mcCount = (k) => S.mc.p.filter((o) => o.k === k && !o.dead).length;
  const mcFree = () => S.mc.p.filter((o) => o.k === 'H' && !o.dead).length;
  function stepMech(dt) {
    const mc = S.mc; if (!mc.built) return;
    mc.shiftT = Math.max(0, mc.shiftT - dt); if (mc.shiftT <= 0 && mc.shift) mc.shift = 0;
    const g = mcIn(), p = mc.p;
    p.forEach((q) => {
      if (q.dead) return;
      if (q.seek && q.tgt && !q.tgt.dead) {
        const dx = q.tgt.x - q.x, dy = q.tgt.y - q.y, d = Math.hypot(dx, dy) || 1, sp = 170;
        q.x += dx / d * sp * dt; q.y += dy / d * sp * dt; q.trail += dt;
        if (!RM && q.trail > 0.03) { q.trail = 0; parts.emit({ x: q.x, y: q.y, vx: 0, vy: 0, life: 0.3, size: 2.2, color: q.k === 'H' ? '#fca5a5' : '#93c5fd', gravity: 0, shape: 'circle' }); }
        if (d < mkR(q.k) + mkR(q.tgt.k) - 4) {
          if (q.k === 'H') { q.tgt.k = 'HA'; q.dead = true; } else { q.tgt.k = 'A'; q.k = 'W'; q.seek = false; q.tgt = null; }
          parts.burst(q.tgt ? q.tgt.x : q.x, q.tgt ? q.tgt.y : q.y, { count: 8, speed: 70, size: 2.4, colors: ['#fde68a', '#fff', '#fdba74'], life: 0.45, gravity: 0 });
          if (q.dead) { const o = p.find((z) => z.claimed && z.k === 'HA' && Math.hypot(z.x - q.x, z.y - q.y) < 30); if (o) o.claimed = false; } else { const o = p.find((z) => z.claimed && z.k === 'A' && Math.hypot(z.x - q.x, z.y - q.y) < 30); if (o) o.claimed = false; }
          Sound.tick();
        }
        return;
      }
      if (q.seek && !q.tgt) { q.seek = false; const a = Math.random() * TAU; q.vx = Math.cos(a) * 26; q.vy = 26 * Math.abs(Math.sin(a)) + 8; }
      if (!RM) { q.vx += (Math.random() - 0.5) * 240 * dt; q.vy += (Math.random() - 0.5) * 240 * dt; }
      const sp0 = q.k === 'H' || q.k === 'W' ? 32 : 22, v = Math.hypot(q.vx, q.vy) || 1, vt = clamp(v, sp0 * 0.45, sp0 * 1.5); q.vx *= vt / v; q.vy *= vt / v;
      if (RM) { q.vx = 0; q.vy = 0; }
      q.x += q.vx * dt; q.y += q.vy * dt;
    });
    for (let i = 0; i < p.length; i++) {
      const a = p[i]; if (a.dead || (a.seek && a.tgt)) continue;
      for (let j = i + 1; j < p.length; j++) {
        const b = p[j]; if (b.dead || (b.seek && b.tgt)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, m = mkR(a.k) + mkR(b.k);
        if (d < m) { const o = (m - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * o; a.y -= uy * o; b.x += ux * o; b.y += uy * o; a.vx -= ux * 6; a.vy -= uy * 6; b.vx += ux * 6; b.vy += uy * 6; }
      }
    }
    p.forEach((q) => {
      if (q.dead || (q.seek && q.tgt)) return; const r = mkR(q.k);
      if (q.x < g.x0 + r) { q.x = g.x0 + r; q.vx = Math.abs(q.vx); } if (q.x > g.x1 - r) { q.x = g.x1 - r; q.vx = -Math.abs(q.vx); }
      if (q.y < g.y0 + r && !q.seek) { q.y = g.y0 + r; q.vy = Math.abs(q.vy); } if (q.y > g.y1 - r) { q.y = g.y1 - r; q.vy = -Math.abs(q.vy); }
    });
    for (let i = p.length - 1; i >= 0; i--) if (p[i].dead) p.splice(i, 1);
  }
  const capPhX = () => capPh(S.mc.capX);
  function drawMech(t) {
    const g = mcG(), mc = S.mc;
    if (mc.view === 'cap') return drawCap(t);
    const b = g.box, sol = MSOL[mc.sol];
    T(14, 26, '🧩 완충 용액에 H⁺와 OH⁻를 넣으면?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.roundRect(b.x, b.y, b.w, b.h, 14); const gr2 = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); gr2.addColorStop(0, '#f4f9ff'); gr2.addColorStop(1, '#dcecff'); ctx.fillStyle = gr2; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2.4; ctx.stroke();
    T(b.x + 12, b.y + 22, '🔍 ' + sol.name + ' (HA = CH₃COOH, A⁻ = CH₃COO⁻)', PHONE ? 12 : 13.5, '#1e40af', 'left', 800);
    mc.p.forEach((q) => { const c = MK[q.k]; if (q.k === 'W') D.sphere(q.x, q.y, c.r, c.col, { gloss: true, text: c.lab, textColor: c.tc, textScale: c.ts }); });
    mc.p.forEach((q) => { const c = MK[q.k]; if (q.k !== 'W') D.sphere(q.x, q.y, c.r, c.col, { gloss: true, text: c.lab, textColor: c.tc || '#fff', textScale: c.ts, shadow: q.seek }); });
    // 평형식 카드
    const e = g.eq;
    D.roundRect(e.x, e.y, e.w, e.h, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2; ctx.stroke();
    T(e.x + 12, e.y + 22, '평형', 13.5, '#8a6d00', 'left', 800);
    const cy = e.y + (PHONE ? 46 : 56);
    T(e.x + 12, cy, 'CH₃COOH', PHONE ? 15 : 14, INK, 'left', 800);
    const ax0 = e.x + (PHONE ? 112 : 86), ax1 = ax0 + (PHONE ? 70 : 40);
    const left = mc.shift < 0, right = mc.shift > 0;
    D.arrow(ax1, cy - 9, ax0, cy - 9, { color: left ? '#dc2626' : '#94a3b8', width: left ? 5 : 2.4, head: left ? 11 : 8 });
    D.arrow(ax0, cy + 6, ax1, cy + 6, { color: right ? '#2563eb' : '#94a3b8', width: right ? 5 : 2.4, head: right ? 11 : 8 });
    T(ax1 + 8, cy, 'H⁺ + CH₃COO⁻', PHONE ? 15 : 14, INK, 'left', 800);
    if (!PHONE) T(e.x + 12, e.y + 92, left ? '← 왼쪽으로 이동 (H⁺를 받아요)' : right ? '→ 오른쪽으로 이동 (H⁺를 내놓아요)' : '평형 상태: 양쪽이 모두 있어요', 13.5, left ? '#b91c1c' : right ? '#1d4ed8' : MUTED, 'left', 800);
    else T(e.x + 12, e.y + 66, left ? '← 왼쪽으로 이동' : right ? '→ 오른쪽으로 이동' : '평형 상태', 13, left ? '#b91c1c' : right ? '#1d4ed8' : MUTED, 'left', 800);
    // 개수 · 측정값 카드
    const d = g.dt;
    D.roundRect(d.x, d.y, d.w, d.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    if (!PHONE) {
      T(d.x + 12, d.y + 22, '입자 수', 13.5, INK, 'left', 800);
      [['HA', 'CH₃COOH'], ['A', 'CH₃COO⁻'], ['H', '자유 H⁺']].forEach(([k, lab], i) => { const yy = d.y + 46 + i * 22; D.sphere(d.x + 18, yy - 4, 6, MK[k].col, { gloss: false }); T(d.x + 32, yy, lab, 13.5, INK, 'left', 800); T(d.x + d.w - 14, yy, (k === 'H' ? mcFree() : mcCount(k)) + '개', 14, '#5b21b6', 'right', 800); });
      const m = mc.sol === 'buf' ? BK.buf : ACO;
      T(d.x + 12, d.y + 124, '측정 pH (100 mL에 1 mL를 넣을 때)', 12.5, MUTED, 'left', 800);
      T(d.x + 12, d.y + 146, '처음 ' + m.base.toFixed(2) + ' · HCl ' + m.hcl.toFixed(2) + ' · NaOH ' + m.naoh.toFixed(2), 13.5, INK, 'left', 800);
    } else {
      [['HA', 'CH₃COOH'], ['A', 'CH₃COO⁻'], ['H', '자유 H⁺']].forEach(([k, lab], i) => { const xx = d.x + 12 + i * 148; D.sphere(xx + 5, d.y + 22, 5, MK[k].col, { gloss: false }); T(xx + 16, d.y + 27, lab + ' ' + (k === 'H' ? mcFree() : mcCount(k)), 13, INK, 'left', 800); });
      const m = mc.sol === 'buf' ? BK.buf : ACO;
      T(d.x + 12, d.y + 56, '측정 pH  처음 ' + m.base.toFixed(2) + ' · HCl 1 mL ' + m.hcl.toFixed(2) + ' · NaOH 1 mL ' + m.naoh.toFixed(2), 12.5, INK, 'left', 800);
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '약산 + 짝염기가 함께 있어야 완충 작용을 해요', 15, '#b45309', 'left', 800);
    let body = 'H⁺나 OH⁻를 넣어 보세요. H⁺는 CH₃COO⁻가 받아 CH₃COOH가 되고, OH⁻는 CH₃COOH가 H⁺를 내놓아 물이 돼요. 그래서 자유 H⁺의 수가 거의 변하지 않아요. (입자 수는 모형이에요)';
    if (mc.sol === 'ac') body = '아세트산만 있는 용액에는 H⁺를 받아 줄 CH₃COO⁻가 거의 없어요. H⁺를 넣으면 그대로 남아 자유 H⁺ 수가 크게 늘고 pH가 크게 변해요. 측정값도 2.87 → ' + ACO.hcl.toFixed(2) + ' 로 완충 용액(4.74 → 4.73)보다 훨씬 많이 변해요.';
    else if (mc.last === 'H' && mc.sol === 'buf' && mcCount('A') === 0) body = 'CH₃COO⁻가 모두 H⁺를 받아 CH₃COOH가 되어 더 받아 줄 입자가 없어요. 이제 넣은 H⁺는 그대로 남아요. 완충 용량의 한계예요!';
    else if (mc.last === 'H' && mc.sol === 'buf') body = '넣은 H⁺를 CH₃COO⁻가 받아 CH₃COOH가 됐어요 (평형이 왼쪽으로). 자유 H⁺ 수는 그대로예요. 계속 넣으면 CH₃COO⁻가 줄어들어요.';
    else if (mc.last === 'OH' && mc.sol === 'buf') body = '넣은 OH⁻는 CH₃COOH가 H⁺를 내놓아 물(H₂O)이 됐어요 (평형이 오른쪽으로). 자유 H⁺ 수는 그대로예요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }
  /* 완충 용량 그래프 */
  const capCurve = (() => { const a = []; for (let x = 0; x <= 110; x += 1) a.push([x, bufPh(x)]); return a; })();
  function drawCap(t) {
    const g = mcG(), mc = S.mc, gr = g.gr, cp = g.cp;
    T(14, 26, '📈 염산을 넣을수록 pH는 어떻게 변할까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.roundRect(gr.x, gr.y, gr.w, gr.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const gx0 = gr.x + 44, gx1 = gr.x + gr.w - 16, gy0 = gr.y + 20, gy1 = gr.y + gr.h - 40, X = (v) => gx0 + v / 110 * (gx1 - gx0), Y = (p) => gy1 - (clamp(p, 2, 5.2) - 2) / 3.2 * (gy1 - gy0);
    ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1.2;
    for (let p = 2; p <= 5; p += 0.5) { ctx.beginPath(); ctx.moveTo(gx0, Y(p)); ctx.lineTo(gx1, Y(p)); ctx.stroke(); T(gx0 - 6, Y(p) + 4.5, p.toFixed(1), 12.5, MUTED, 'right', 700); }
    for (let v = 0; v <= 110; v += 20) { ctx.beginPath(); ctx.moveTo(X(v), gy0); ctx.lineTo(X(v), gy1); ctx.stroke(); T(X(v), gy1 + 17, String(v), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    T(gx0 + 4, gy0 - 5, 'pH', 13, INK, 'left', 800); T((gx0 + gx1) / 2, gr.y + gr.h - 6, '넣은 0.10 M HCl (mL)', 13, INK, 'center', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(gx0, gy0 - 4, gx1 - gx0, gy1 - gy0 + 6); ctx.clip();
    ctx.strokeStyle = 'rgba(124,58,237,.55)'; ctx.lineWidth = 2.4; ctx.beginPath(); capCurve.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke();
    ctx.restore();
    CAP_X.forEach((x) => D.sphere(X(x), Y(capPh(x)), 5.5, '#ea580c', { gloss: false, outline: '#fff', outlineWidth: 1.6 }));
    // 완충 구간 / 급락 표시 (용량 소진은 문제를 푼 뒤에 표시)
    const cx = S.mc.capX, my = Y(capPh(cx)), mx = X(cx);
    ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, gy1); ctx.moveTo(mx, my); ctx.lineTo(gx0, my); ctx.stroke(); ctx.setLineDash([]);
    D.glow(mx, my, 22, '#8b5cf6', 0.45); D.sphere(mx, my, 8.5, '#8b5cf6', { outline: '#fff', outlineWidth: 2.2, shadow: true });
    D.label(clamp(mx + (mx > gx1 - 130 ? -76 : 76), gx0 + 70, gx1 - 70), clamp(my - 24, gy0 + 12, gy1 - 30), cx + ' mL · pH ' + capPh(cx).toFixed(2), { size: 13.5, bg: '#fff', color: '#5b21b6' });
    if (capSolved()) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(100), gy0); ctx.lineTo(X(100), gy1); ctx.stroke(); ctx.setLineDash([]); D.label(X(100) - 4, gy0 + 22, 'CH₃COO⁻ 모두 소진', { size: 12.5, bg: '#fff', color: '#b91c1c', align: 'right' }); }
    // 카드: 입자 막대 + 표
    D.roundRect(cp.x, cp.y, cp.w, cp.h, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(cp.x + 12, cp.y + 22, '완충 용액 100 mL 속 물질 (mmol)', 13.5, INK, 'left', 800);
    const a = Math.max(0, 10 - 0.1 * cx), ha = 10 + Math.min(0.1 * cx, 10), hx = Math.max(0, 0.1 * cx - 10), bw = cp.w - 156, bx = cp.x + 112;
    [['CH₃COO⁻', a, '#ea580c'], ['CH₃COOH', ha, '#fbbf24'], ['남은 H⁺', hx, '#ef4444']].forEach(([lab, v, col], i) => {
      const yy = cp.y + 50 + i * (PHONE ? 28 : 36);
      T(cp.x + 12, yy + 4, lab, 13, INK, 'left', 800);
      D.roundRect(bx, yy - 8, bw, 14, 6); ctx.fillStyle = '#e9e5f5'; ctx.fill();
      const w = bw * clamp(v / 20, 0, 1); if (w > 0.5) { D.roundRect(bx, yy - 8, w, 14, 6); ctx.fillStyle = col; ctx.fill(); }
      T(bx + bw + 4, yy + 4, v.toFixed(1), 12.5, MUTED, 'left', 700);
    });
    const ty = cp.y + (PHONE ? 140 : 164);
    if (!PHONE) { T(cp.x + 12, ty - 8, '측정 자료 (HCl mL → pH)', 13, MUTED, 'left', 800); CAP_X.forEach((x, i) => { const yy = ty + 14 + i * 20; if (x === cx) { D.roundRect(cp.x + 6, yy - 15, cp.w - 12, 20, 6); ctx.fillStyle = 'rgba(139,92,246,.12)'; ctx.fill(); } T(cp.x + 16, yy, x + ' mL', 13, INK, 'left', 800); T(cp.x + cp.w - 16, yy, capPh(x).toFixed(2), 13.5, '#5b21b6', 'right', 800); }); }
    else T(cp.x + 12, ty, '측정: ' + CAP_X.map((x) => x + ' mL ' + capPh(x).toFixed(2)).join(' · '), 11, MUTED, 'left', 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '완충 용량에는 한계가 있어요', 15, '#b45309', 'left', 800);
    let body = '슬라이더로 염산을 넣어 보세요. 처음에는 pH가 조금씩만 내려가요(완충 구간). 하지만 CH₃COO⁻가 H⁺를 계속 받으면 줄어들어요.';
    if (mc.capMax >= 100) body = '염산을 많이 넣으면 H⁺를 받아 줄 CH₃COO⁻(10 mmol)가 모두 쓰여 pH가 크게 내려가요. 이제 완충 작용을 할 수 없어요. 완충 용액이 막을 수 있는 산·염기의 양에는 한계가 있어요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }
  const capSolved = () => (selCap.value === '100' && S.mc.capMax >= 100) || (game && game.free);
  function mcSetCap(v) { const c = clamp(Math.round(v / 5) * 5, 0, 110); if (c === S.mc.capX) return; S.mc.capX = c; S.mc.capMax = Math.max(S.mc.capMax, c); Sound.tick(); updateCtl(); }
  function mcView(v) { S.mc.view = v; S.sub.mech = v; Sound.click(); updateCtl(); }

  /* ============ ③ 혈액 완충 ============ */
  const blG = () => (PHONE
    ? { df: rect(MAIN.x + 8, MAIN.y + 40, 448, 190), eq: rect(MAIN.x + 8, MAIN.y + 236, 448, 182) }
    : { df: rect(MAIN.x + 14, MAIN.y + 40, 440, 290), eq: rect(MAIN.x + 466, MAIN.y + 40, 296, 290) });
  function blAct(kind) {
    const bl = S.bl; if (bl.phase !== 'idle') { showHint('조절이 끝날 때까지 잠깐 기다려요.', 1800); return; }
    bl.phase = 'react'; bl.tm = 0; bl.kind = kind;
    if (kind === 'H') { bl.nH++; bl.shift = -1; } else { bl.nO++; bl.shift = 1; }
    bl.shiftT = 4; Sound.click(); updateCtl();
  }
  function stepBlood(dt) {
    const bl = S.bl;
    bl.flow += dt * 50; bl.shiftT = Math.max(0, bl.shiftT - dt); if (bl.shiftT <= 0) bl.shift = 0;
    if (bl.phase === 'react') {
      bl.tm += dt;
      if (bl.kind === 'H') { bl.hco3 = 23.2; bl.co2 = 2.0; bl.needle = 7.36; } else { bl.hco3 = 24.6; bl.co2 = 0.6; bl.needle = 7.43; }
      if (bl.tm > 1.4) { bl.phase = 'breath'; bl.tm = 0; }
    } else if (bl.phase === 'breath') {
      bl.tm += dt; bl.co2 = 1.2; bl.needle = bl.kind === 'H' ? 7.39 : 7.41;
      if (!RM && bl.kind === 'H' && Math.random() < dt * 8) bl.bubbles.push({ x: 0, y: 0, u: 0, v: Math.random(), sp: 0.5 + Math.random() * 0.3 });
      if (bl.tm > 3.2) { bl.phase = 'idle'; bl.needle = 7.4; bl.hco3 = 24; bl.co2 = 1.2; bl.tm = 0; updateCtl(); }
    }
    bl.hcoD = ap(bl.hcoD, bl.hco3, dt, 3); bl.co2D = ap(bl.co2D, bl.co2, dt, 3); bl.nd = ap(bl.nd, bl.needle, dt, 5);
    for (let i = bl.bubbles.length - 1; i >= 0; i--) { const b = bl.bubbles[i]; b.u += dt * b.sp; if (b.u >= 1) bl.bubbles.splice(i, 1); }
  }
  function drawBlood(t, regul) {
    const g = blG(), bl = S.bl, df = g.df, eq = g.eq, sc = regul ? SCN[S.rg.sc] : null, run = regul && S.rg.run;
    T(14, 26, regul ? '🏃 상황에 따라 혈액 pH는 어떻게 될까요?' : '🩸 혈액 속 H₂CO₃ / HCO₃⁻가 pH를 지켜요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.roundRect(df.x, df.y, df.w, df.h, 14); const gg = ctx.createLinearGradient(0, df.y, 0, df.y + df.h); gg.addColorStop(0, '#fff7f5'); gg.addColorStop(1, '#ffe8e4'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#f2b8ae'; ctx.lineWidth = 2; ctx.stroke();
    // 조직 · 혈관 · 폐
    const W = df.w, H = df.h, X0 = df.x, Y0 = df.y, vy = Y0 + H * 0.52, vh = PHONE ? 26 : 34;
    const tis = rect(X0 + 12, Y0 + 28, W * 0.26, H - 44), lung = rect(X0 + W * 0.7, Y0 + 28, W * 0.28 - 12, H - 44);
    D.roundRect(tis.x, tis.y, tis.w, tis.h, 16); ctx.fillStyle = '#fde2d9'; ctx.fill(); ctx.strokeStyle = '#eab3a6'; ctx.lineWidth = 2; ctx.stroke();
    T(tis.x + tis.w / 2, tis.y + 20, '근육 세포', PHONE ? 12.5 : 13.5, '#9a3412', 'center', 800);
    for (let i = 0; i < 6; i++) { const cx = tis.x + 18 + (i % 2) * (tis.w - 36), cy = tis.y + 44 + Math.floor(i / 2) * ((tis.h - 70) / 3); D.sphere(cx, cy, PHONE ? 8 : 10, '#f4a58f', { gloss: true }); }
    D.roundRect(lung.x, lung.y, lung.w, lung.h, 22); ctx.fillStyle = '#dbeafe'; ctx.fill(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
    T(lung.x + lung.w / 2, lung.y + 20, '폐', PHONE ? 12.5 : 13.5, '#1e40af', 'center', 800);
    const br = 0.5 + 0.5 * Math.sin(t * (bl.phase === 'breath' ? 5 : 1.6));
    for (let i = 0; i < 5; i++) { const cx = lung.x + lung.w / 2 + Math.cos(i * 1.7) * lung.w * 0.22, cy = lung.y + 52 + i * ((lung.h - 70) / 5); D.sphere(cx, cy, (PHONE ? 7 : 9) * (1 + 0.18 * br), '#bfdbfe', { gloss: true }); }
    // 혈관
    const vx0 = tis.x + tis.w - 2, vx1 = lung.x + 2;
    D.roundRect(vx0, vy - vh / 2, vx1 - vx0, vh, vh / 2); const vg = ctx.createLinearGradient(0, vy - vh / 2, 0, vy + vh / 2); vg.addColorStop(0, '#fca5a5'); vg.addColorStop(1, '#ef4444'); ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2; ctx.stroke();
    T((vx0 + vx1) / 2, vy - vh / 2 - 8, '혈관 (혈액)', PHONE ? 12.5 : 13.5, '#b91c1c', 'center', 800);
    for (let i = 0; i < 6; i++) { const u = ((bl.flow / (vx1 - vx0) + i / 6) % 1), x = vx0 + 14 + u * (vx1 - vx0 - 28); D.sphere(x, vy + Math.sin(i * 2.1) * (vh * 0.2), PHONE ? 4.5 : 5.5, '#fff1f2', { gloss: false, outline: '#b91c1c', outlineWidth: 1 }); }
    // CO₂ 방울: 세포 → 혈액 → 폐 → 몸 밖
    const nb = 5;
    for (let i = 0; i < nb; i++) {
      const u = ((t * 0.18 + i / nb) % 1), x = tis.x + tis.w - 8 + u * (vx1 - vx0 - 4), y = vy - vh / 2 + 4 + Math.sin(u * 9 + i) * 3;
      if (u < 0.9) { ctx.fillStyle = 'rgba(100,116,139,.85)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); T(x, y + 3, 'CO₂', 7.5, '#fff', 'center', 800); }
    }
    bl.bubbles.forEach((b) => { const x = lung.x + lung.w / 2 + (b.v - 0.5) * lung.w * 0.5, y = lung.y + lung.h - 20 - b.u * (lung.h - 20) - 10; ctx.fillStyle = 'rgba(100,116,139,' + (1 - b.u) * 0.9 + ')'; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.fill(); T(x, y + 3, 'CO₂', 7.5, '#fff', 'center', 800); });
    if ((bl.phase === 'breath' && bl.kind === 'H') || (run && (bl.phase === 'r2' || bl.phase === 'r1') && (bl.kind === 'Cd' || (bl.kind === 'H' && bl.phase === 'r2')))) { D.arrow(lung.x + lung.w / 2, lung.y + 4, lung.x + lung.w / 2, lung.y - 6 + (PHONE ? 12 : 0), { color: '#475569', width: 3, head: 8 }); }
    // 산 / 염기 입자
    if (bl.phase === 'react' || (bl.phase === 'r1' && (bl.kind === 'H' || bl.kind === 'O'))) {
      const u = clamp(bl.tm / 1.2, 0, 1), cx = (vx0 + vx1) / 2;
      for (let i = 0; i < 4; i++) { const px = tis.x + tis.w + (cx - tis.x - tis.w) * clamp(u * 1.4 - i * 0.08, 0, 1), py = (bl.kind === 'H' ? tis.y + 60 : Y0 + 18) + (vy - (bl.kind === 'H' ? tis.y + 60 : Y0 + 18)) * clamp(u * 1.4 - i * 0.08, 0, 1) + i * 5;
        D.sphere(px, py + i * 2, 6, bl.kind === 'H' ? '#ef4444' : '#3b82f6', { gloss: false, text: bl.kind === 'H' ? 'H⁺' : 'OH⁻', textScale: 0.9 }); }
      D.label(cx, vy + vh / 2 + 22, bl.kind === 'H' ? (regul && sc ? sc.cause2 : 'H⁺ ↑  (젖산 등)') : 'OH⁻ ↑', { size: 12.5, bg: '#fff', color: bl.kind === 'H' ? '#dc2626' : '#2563eb' });
    }
    // 평형 카드
    D.roundRect(eq.x, eq.y, eq.w, eq.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(eq.x + 12, eq.y + 22, '혈액 속 평형', 13.5, INK, 'left', 800);
    const left = bl.shift < 0, right = bl.shift > 0, ey = eq.y + (PHONE ? 46 : 52);
    T(eq.x + 12, ey, PHONE ? 'CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻' : 'CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻', PHONE ? 14.5 : 14, INK, 'left', 800);
    T(eq.x + 12, ey + 22, left ? '← 왼쪽으로 이동: HCO₃⁻가 H⁺를 받아요' : right ? '→ 오른쪽으로 이동: H₂CO₃가 H⁺를 내놓아요' : '평형 상태', PHONE ? 12.5 : 13, left ? '#b91c1c' : right ? '#1d4ed8' : MUTED, 'left', 800);
    // 막대 (mM): HCO₃⁻ 24, CO₂ 1.2 (0~30 mM 눈금)
    const bx = eq.x + (PHONE ? 62 : 92), bw = eq.w - (PHONE ? 150 : 150), by0 = eq.y + (PHONE ? 90 : 106);
    [['HCO₃⁻', bl.hcoD, '#8b5cf6'], [PHONE ? 'CO₂' : 'CO₂ (H₂CO₃)', bl.co2D, '#64748b']].forEach(([lab, v, col], i) => {
      const yy = by0 + i * (PHONE ? 30 : 34);
      T(eq.x + 12, yy + 4, lab, PHONE ? 12 : 12.5, INK, 'left', 800);
      D.roundRect(bx, yy - 8, bw, 14, 6); ctx.fillStyle = '#e9e5f5'; ctx.fill();
      const w = bw * clamp(v / 30, 0, 1); if (w > 0.5) { D.roundRect(bx, yy - 8, Math.max(3, w), 14, 6); ctx.fillStyle = col; ctx.fill(); }
      const nrm = i === 0 ? 24 : 1.2, calm = bl.phase === 'idle', dtxt = Math.abs(v - nrm) < 0.05 ? mmm(v) + ' mM' : (v > nrm ? '↑ 늘어요' : '↓ 줄어요');
      T(bx + bw + 6, yy + 4, calm ? mmm(v) + ' mM' : dtxt, 12.5, calm || Math.abs(v - nrm) < 0.05 ? MUTED : (v > nrm ? '#dc2626' : '#2563eb'), 'left', 800);
    });
    T(eq.x + eq.w / 2, by0 + (PHONE ? 62 : 70), 'HCO₃⁻가 훨씬 많지만(약 20 : 1) 두 물질이 함께 있어요', PHONE ? 11.5 : 12, MUTED, 'center', 700);
    // pH 눈금 (7.0 ~ 7.8)
    const sx = eq.x + 16, sw = eq.w - 32, sy = eq.y + eq.h - (PHONE ? 40 : 52), pxv = (p) => sx + sw * (p - 7.0) / 0.8;
    D.roundRect(sx, sy, sw, 14, 7); ctx.fillStyle = '#fecaca'; ctx.fill();
    D.roundRect(pxv(7.35), sy, pxv(7.45) - pxv(7.35), 14, 3); ctx.fillStyle = '#4ade80'; ctx.fill();
    for (let p = 7.0; p <= 7.801; p += 0.2) { T(pxv(p), sy + 30, p.toFixed(1), 12, MUTED, 'center', 700); }
    if (!(regul && bl.phase[0] === 'r')) T(pxv(7.4), sy - 6, '정상 7.35 ~ 7.45', 12, '#15803d', 'center', 800); else T(pxv(7.4), sy + 46, '정상 7.35 ~ 7.45', 11.5, '#15803d', 'center', 800);
    const nx = pxv(clamp(bl.nd, 7.0, 7.8)), outR = regul && bl.phase[0] === 'r' && (bl.needle < 7.35 || bl.needle > 7.45);
    if (regul && bl.phase[0] === 'r') { D.label(PHONE ? eq.x + eq.w - 78 : clamp(nx, eq.x + 50, eq.x + eq.w - 50), PHONE ? eq.y + 20 : sy - 30, 'pH ' + S.rg.shown.toFixed(2) + (outR ? '  ⚠ 위험' : ''), { size: 13, bg: outR ? '#dc2626' : '#16a34a', color: '#fff' }); }
    ctx.fillStyle = outR ? '#dc2626' : '#26324a'; ctx.beginPath(); ctx.moveTo(nx, sy + 16); ctx.lineTo(nx - 6, sy + 28); ctx.lineTo(nx + 6, sy + 28); ctx.closePath(); ctx.fill();
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (regul) return drawRegulInfo(sc, run);
    T(INFO.x + 16, INFO.y + 26, '혈액 pH 7.4는 평형 이동으로 지켜져요', 15, '#b45309', 'left', 800);
    let body = '세포가 만든 CO₂가 혈액에 녹아 H₂CO₃가 되고, H₂CO₃ ⇌ H⁺ + HCO₃⁻ 평형을 이뤄요. “산(H⁺) 늘리기”와 “염기(OH⁻) 늘리기”를 눌러 평형이 어느 쪽으로 이동하는지 보세요.';
    if (bl.phase === 'react' || bl.phase === 'breath') body = bl.kind === 'H' ? 'H⁺가 늘면 평형이 왼쪽으로 이동해 HCO₃⁻가 H⁺를 받아 소모되고 CO₂가 늘어요. 늘어난 CO₂는 폐로 가서 숨으로 내보내요. 그래서 혈액 pH는 7.4 근처로 유지돼요.' : 'OH⁻가 늘면 H₂CO₃가 H⁺를 내놓아 OH⁻를 중화해요(평형이 오른쪽으로). 줄어든 CO₂는 호흡으로 다시 맞춰져 pH가 7.4 근처로 유지돼요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  /* ============ ④ 몸의 조절 ============ */
  const DIRS = [['down', '크게 내려가요'], ['same', '거의 그대로예요'], ['up', '크게 올라가요']];
  const DIR_T = { down: '크게 내려가요 (정상 범위 밖)', same: '거의 그대로예요 (정상 범위 안)', up: '크게 올라가요 (정상 범위 밖)' };
  const BODY = [['', '몸의 반응 고르기'], ['fast', '호흡을 빠르게 해 CO₂를 더 내보내요'], ['slow', '호흡을 느리게 해 CO₂를 모아요'], ['kid', '신장이 H⁺를 더 배설해요'], ['none', '아무 반응도 일어나지 않아요']];
  const BODY_T = { fast: '호흡을 빠르게 해 CO₂를 더 내보내요', slow: '호흡을 느리게 해 CO₂를 모아요', kid: '신장이 H⁺를 더 배설해요', none: '아무 반응도 일어나지 않아요' };
  const SCN = {
    ex: { name: '격렬한 운동', icon: '🏃', cause: '운동하면 근육에서 젖산이 쌓여 H⁺가 늘어요.', cause2: '젖산 H⁺ ↑', dir: 'same', body: 'fast', kind: 'H', p1: { hco: 23.2, co2: 2.0, nd: 7.37, shift: -1 }, p2: { hco: 23.2, co2: 1.2, nd: 7.40, shift: 0 }, pH: '7.37', pHend: '7.40',
      note: 'H⁺가 늘면 평형이 왼쪽으로 이동해 HCO₃⁻가 소모되고 CO₂가 늘어요. 호흡이 빨라져 CO₂를 내보내면 혈액 pH는 정상 범위(7.35 ~ 7.45)에 머물러요.' },
    hyper: { name: '과호흡', icon: '💨', cause: '숨을 너무 빠르게 쉬어 CO₂가 너무 많이 빠져나가요.', cause2: '', dir: 'up', body: 'slow', kind: 'Cd', p1: { hco: 24, co2: 0.8, nd: 7.60, shift: -1 }, p2: { hco: 24, co2: 0.8, nd: 7.60, shift: -1 }, pH: '7.60', pHend: '7.60',
      note: 'CO₂가 줄면 평형이 왼쪽으로 이동해 H⁺가 HCO₃⁻와 결합해 줄어요. 혈액 pH가 7.6으로 올라 정상 범위를 벗어났어요(알칼리증). 몸은 호흡을 늦춰 CO₂를 모아요.' },
    hypo: { name: '호흡 억제', icon: '😶', cause: '숨을 제대로 쉬지 못해 CO₂가 몸에 쌓여요.', cause2: '', dir: 'down', body: 'fast', kind: 'Cu', p1: { hco: 24, co2: 2.0, nd: 7.20, shift: 1 }, p2: { hco: 24, co2: 2.0, nd: 7.20, shift: 1 }, pH: '7.20', pHend: '7.20',
      note: 'CO₂가 쌓이면 평형이 오른쪽으로 이동해 H⁺가 늘어요. 혈액 pH가 7.2로 내려가 정상 범위를 벗어났어요(산증). 호흡을 빠르게 해 CO₂를 내보내야 해요.' },
    lemon: { name: '레몬즙 섭취', icon: '🍋', cause: '레몬즙의 산이 소화·흡수되어 혈액에 H⁺가 조금 들어와요.', cause2: '산 H⁺ ↑', dir: 'same', body: 'kid', kind: 'H', p1: { hco: 23.6, co2: 1.5, nd: 7.40, shift: -1 }, p2: { hco: 24, co2: 1.2, nd: 7.40, shift: 0 }, pH: '7.40', pHend: '7.40',
      note: '들어온 H⁺는 HCO₃⁻가 받아 완충하고, 신장이 남는 H⁺를 소변으로 내보내요. 혈액 pH는 7.40으로 거의 변하지 않아요.' },
  };
  const SK4 = ['ex', 'hyper', 'hypo', 'lemon'];
  S.rg.shown = 7.4;
  const rgPlayed = () => SK4.filter((k) => S.rg.played[k]).length;
  function rgSelect(k) { if (S.rg.run) return; S.rg.sc = k; Sound.click(); updateCtl(); }
  function rgDir(v) { if (S.rg.run) return; S.rg.dirPick = v; Sound.click(); updateCtl(); }
  function rgPlay() {
    const rg = S.rg, k = rg.sc; if (rg.run) return;
    if (!rg.dirPick || !selBody.value) { showHint('혈액 pH와 몸의 반응을 모두 골라요.', 2600); Sound.fail(); return; }
    rg.pred[k] = rg.dirPick; rg.body[k] = selBody.value;
    const sc = SCN[k], bl = S.bl;
    rg.run = { sc: k, tm: 0 }; bl.phase = 'r1'; bl.tm = 0; bl.kind = sc.kind; bl.shift = sc.p1.shift; bl.shiftT = 99; bl.hco3 = sc.p1.hco; bl.co2 = sc.p1.co2; bl.needle = sc.p1.nd; bl.bubbles = [];
    Sound.click(); updateCtl();
  }
  function rgReset() { const rg = S.rg, bl = S.bl; rg.run = null; rg.shown = 7.4; bl.phase = 'idle'; bl.shift = 0; bl.shiftT = 0; bl.hco3 = 24; bl.co2 = 1.2; bl.needle = 7.4; bl.bubbles = []; updateCtl(); }
  function stepRegul(dt) {
    const rg = S.rg, bl = S.bl; if (!rg.run) return;
    const sc = SCN[rg.run.sc]; rg.run.tm += dt; bl.tm += dt;
    if (bl.phase === 'r1' && rg.run.tm > 1.8) { bl.phase = 'r2'; bl.hco3 = sc.p2.hco; bl.co2 = sc.p2.co2; bl.needle = sc.p2.nd; bl.shift = sc.p2.shift; }
    if (bl.phase === 'r2' && !RM && Math.random() < dt * 6 && (sc.kind === 'H' || sc.kind === 'Cd')) bl.bubbles.push({ x: 0, y: 0, u: 0, v: Math.random(), sp: 0.5 + Math.random() * 0.3 });
    rg.shown = ap(rg.shown, bl.needle, dt, 4);
    if (bl.phase === 'r2' && rg.run.tm > 4.2) {
      bl.phase = 'rdone'; rg.shown = bl.needle; const k = rg.run.sc;
      if (!rg.played[k]) rg.played[k] = true;
      Sound.success(); flash(S.mode === 'regul' ? MAIN.x + MAIN.w * 0.65 : 400, MAIN.y + 80, [SCN[k].p2.nd > 7.45 || SCN[k].p2.nd < 7.35 ? '#dc2626' : '#14a058', '#ffb400', '#8b5cf6']);
      rg.run = null; rg.last = k; updateCtl();
    }
  }
  function drawRegulInfo(sc, run) {
    const rg = S.rg, last = rg.last && !run ? rg.last : null;
    let ttl = sc.icon + ' ' + sc.name, body = sc.cause + ' 혈액 pH는 어떻게 될까요? 예측을 고르고 “예측하고 재생”을 눌러요.';
    if (run) { body = sc.cause + ' 평형이 이동하는 모습을 보세요…'; }
    else if (last && rg.last === rg.sc && rg.played[last]) {
      const s2 = SCN[last], okD = rg.pred[last] === s2.dir, okB = rg.body[last] === s2.body;
      ttl = s2.icon + ' ' + s2.name + ': 혈액 pH ' + s2.pHend + (s2.p2.nd < 7.35 || s2.p2.nd > 7.45 ? ' (정상 범위 밖, 위험)' : ' (정상 범위 안)');
      body = s2.note + '  내 예측: pH ' + (okD ? '✅' : '❌ ' + DIR_T[s2.dir]) + ' · 몸의 반응 ' + (okB ? '✅' : '❌ ' + BODY_T[s2.body]);
    }
    T(INFO.x + 16, INFO.y + 26, ttl, 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  function onLeave(m) { if (m === 'beak') { S.bk.state = 'idle'; S.bk.drops = []; S.bk.tb = null; } if (m === 'regul') rgReset(); }
  /* ---------- 포인터 (비커 눌러 고르기) ---------- */
  const bkHit = (p) => { const g = bkG(); for (let i = 0; i < 2; i++) { if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 8 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 52) return BKS[i]; } return null; };
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'beak') { const b = bkHit(p); if (b) bkSelect(b); } return false; },
    hover(p) { return S.mode === 'beak' && bkHit(p) ? 'pointer' : 'default'; },
  });
  /* ---------- UI 요소 ---------- */
  const mkSel = (host, label, opts, ans) => {
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = label;
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', label.replace(/<[^>]+>/g, ''));
    opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
    host.append(lab, sel); sel.ans = ans;
    sel.addEventListener('change', () => { Sound.click(); sel.classList.toggle('ok', sel.value === ans); sel.classList.toggle('bad', !!sel.value && sel.value !== ans); updateCtl(); });
    return sel;
  };
  makeChips($('#bkSel'), BKS.map((b) => [b, BK[b].name]), (v) => bkSelect(v));
  makeChips($('#rgSel'), RGS.map((r) => [r, RG[r].name]), (v) => bkReagent(v));
  makeChips($('#msSel'), [['buf', '완충 용액'], ['ac', '아세트산만']], (v) => { if (S.mc.sol !== v) { mcBuild(v); Sound.click(); } updateCtl(); });
  makeChips($('#scSel'), SK4.map((k) => [k, SCN[k].icon + ' ' + SCN[k].name]), (v) => rgSelect(v));
  makeChips($('#dirSel'), DIRS, (v) => rgDir(v));
  const selBody = $('#selBody'); BODY.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; selBody.appendChild(o); });
  selBody.addEventListener('change', () => { Sound.click(); updateCtl(); });
  const SHIFT_OPT = [['', '고르기'], ['L', '왼쪽 (CH₃COOH가 늘어요)'], ['R', '오른쪽 (이온이 늘어요)'], ['N', '이동하지 않아요']];
  const shSels = [mkSel($('#shHost'), 'H⁺를 넣으면', SHIFT_OPT, 'L'), mkSel($('#shHost'), 'OH⁻를 넣으면', SHIFT_OPT, 'R')];
  const BL_OPT = [['', '고르기'], ['L', '왼쪽 (HCO₃⁻가 H⁺를 받아요)'], ['R', '오른쪽 (H₂CO₃가 H⁺를 내놓아요)'], ['N', '이동하지 않아요']];
  const blSels = [mkSel($('#blHost'), 'H⁺가 늘어나면', BL_OPT, 'L'), mkSel($('#blHost'), 'OH⁻가 늘어나면', BL_OPT, 'R')];
  const dlRows = [
    mkRow($('#dlHost'), { label: '물 + HCl 1 mL', ans: 4.0, tol: 0.05, ph: '0.00' }, () => updateCtl()),
    mkRow($('#dlHost'), { label: '물 + NaOH 1 mL', ans: 4.0, tol: 0.05, ph: '0.00' }, () => updateCtl()),
    mkRow($('#dlHost'), { label: '완충 용액 + HCl 1 mL', ans: 0.01, tol: 0.004, ph: '0.00' }, () => updateCtl()),
    mkRow($('#dlHost'), { label: '완충 용액 + NaOH 1 mL', ans: 0.01, tol: 0.004, ph: '0.00' }, () => updateCtl()),
  ];
  const selCap = $('#selCap'); selCap.addEventListener('change', () => { Sound.click(); updateCtl(); });
  $('#bDrop').addEventListener('click', bkDrop);
  $$('#mvSeg button').forEach((b) => b.addEventListener('click', () => mcView(b.dataset.v)));
  $('#bAddH').addEventListener('click', () => { if (S.mc.view === 'part') mcAdd('H'); }); $('#bAddO').addEventListener('click', () => { if (S.mc.view === 'part') mcAdd('OH'); });
  $('#bMRst').addEventListener('click', () => { mcBuild(S.mc.sol); Sound.click(); updateCtl(); });
  const sC = $('#sC'); sC.addEventListener('input', () => mcSetCap(+sC.value));
  $('#cMinus').addEventListener('click', () => mcSetCap(S.mc.capX - 5)); $('#cPlus').addEventListener('click', () => mcSetCap(S.mc.capX + 5));
  $('#bBH').addEventListener('click', () => blAct('H')); $('#bBO').addEventListener('click', () => blAct('O'));
  $('#bScn').addEventListener('click', rgPlay);

  function uiExtra() {
    if (typeof dlRows === 'undefined') return;
    const k = S.bk, mc = S.mc, bl = S.bl, rg = S.rg, busy = bkBusy();
    markChips($('#bkSel'), k.cur); markChips($('#rgSel'), k.rg);
    $$('#bkSel button, #rgSel button').forEach((b) => { b.disabled = busy; });
    $('#bDrop').disabled = busy; $('#bDrop').textContent = busy ? '⏳ 넣는 중…' : '💧 1 mL 넣기';
    $$('#mvSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === mc.view));
    markChips($('#msSel'), mc.sol);
    sC.value = mc.capX; $('#oC').textContent = mc.capX + ' mL'; $('#cMinus').disabled = mc.capX <= 0; $('#cPlus').disabled = mc.capX >= 110;
    $('#bBH').disabled = bl.phase !== 'idle'; $('#bBO').disabled = bl.phase !== 'idle';
    markChips($('#scSel'), rg.sc, rg.played);
    $$('#dirSel button').forEach((b) => { b.classList.toggle('on', rg.dirPick === b.dataset.v); b.disabled = !!rg.run; });
    selBody.disabled = !!rg.run; $('#bScn').disabled = !!rg.run; $('#bScn').textContent = rg.run ? '⏳ 재생 중…' : '🔒 예측하고 재생';
    $$('#scSel button').forEach((b) => { b.disabled = !!rg.run; });
  }

  function readouts() {
    const m = S.mode;
    if (m === 'beak') { const k = S.bk; setRead('선택한 비커', BK[k.cur].name, '넣은 용액', RG[k.rg].name, '기록한 경우', bkCount() + ' / 4'); }
    else if (m === 'mech') { const mc = S.mc; if (mc.view === 'part') setRead('용액', MSOL[mc.sol].name, 'CH₃COOH · CH₃COO⁻ (개)', mcCount('HA') + ' · ' + mcCount('A'), '자유 H⁺ (개)', mcFree() + ''); else setRead('넣은 0.10 M HCl', mc.capX + ' mL', 'pH (측정)', capPh(mc.capX).toFixed(2), 'CH₃COO⁻ 남은 양', Math.max(0, 10 - 0.1 * mc.capX).toFixed(1) + ' mmol'); }
    else if (m === 'blood') { const bl = S.bl; setRead('혈액 pH', '7.4 (정상 7.35 ~ 7.45)', '상태', bl.phase === 'idle' ? '평형' : bl.kind === 'H' ? '왼쪽으로 이동' : '오른쪽으로 이동', '조절 횟수', (bl.nH + bl.nO) + '회'); }
    else { const rg = S.rg, sc = SCN[rg.sc]; setRead('상황', sc.icon + ' ' + sc.name, '혈액 pH', rg.run ? rg.shown.toFixed(2) : (rg.played[rg.sc] ? sc.pHend : '7.40'), '재생한 상황', rgPlayed() + ' / 4'); }
  }

  /* ================= 미션 ================= */
  const shDone = () => shSels.every((s) => s.value === s.ans) && S.mc.nH >= 1 && S.mc.nO >= 1;
  const blDone = () => blSels.every((s) => s.value === s.ans) && S.bl.nH >= 1 && S.bl.nO >= 1;
  const levels = [
    {
      title: '물과 비교: pH는 얼마나 변할까', short: '물과 비교', icon: '💧', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 레몬즙을 짜 넣어도 우리 혈액은 왜 산성이 되지 않을까?</p>' +
        '<div class="si-link">🔗 <b>화학 단원에서</b> 화학 평형(르샤틀리에 원리)과 혈액 속 평형을 미리 만났고, <b>앞 차시들에서</b> CH₃COOH와 CH₃COO⁻의 평형을 배웠어요. 산이나 염기를 넣어도 pH가 거의 변하지 않는 용액이 있을까요?</div>' +
        '<p>물 100 mL와 <b>완충 용액</b> 100 mL(0.10 M CH₃COOH + 0.10 M CH₃COONa)에 스포이트로 0.10 M HCl 1 mL, 0.10 M NaOH 1 mL를 각각 넣고 pH가 얼마나 변하는지 비교해요. 실험할 때는 <b>보안경과 장갑</b>을 착용하고, 남은 용액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['beak'],
      setup() { S.gate = ''; bkReset(); dlRows.forEach((r) => r.clear()); setScene('beak'); },
      recap: '같은 양의 산이나 염기를 넣었을 때 물은 pH가 7.00에서 3.00 또는 11.00으로 4.00이나 변했지만, 완충 용액은 4.74에서 4.73 또는 4.75로 0.01만 변했어요. 약산과 그 짝염기가 함께 있기 때문이에요.',
      summary: '<ul><li>물 100 mL(pH 7.00): 0.10 M HCl 1 mL → <b>3.00</b>, 0.10 M NaOH 1 mL → <b>11.00</b> (변화량 4.00)</li><li>완충 용액 100 mL(0.10 M CH₃COOH + 0.10 M CH₃COONa, pH 4.74): HCl 1 mL → <b>4.73</b>, NaOH 1 mL → <b>4.75</b> (변화량 0.01)</li><li>완충 용액: 산이나 염기를 조금 넣어도 pH가 거의 변하지 않는 용액</li><li>가설: 약산과 그 짝염기가 함께 있어서 넣은 H⁺와 OH⁻를 받아 주거나 중화시킨다.</li><li>안전: 보안경 · 장갑 착용, 폐액은 폐수 처리 기준에 따라 처리</li></ul>',
      missions: [
        {
          title: '두 비커에 산과 염기 넣어 보기',
          goal: '<b>물</b>과 <b>완충 용액</b> 각각에 <b>0.10 M HCl 1 mL</b>와 <b>0.10 M NaOH 1 mL</b>를 넣어 네 가지 경우의 pH를 기록하세요.',
          hint: '비커를 고르고 넣을 용액을 고른 뒤 “1 mL 넣기”를 눌러요. 넣을 때마다 새 용액 100 mL로 시작해요. 네 번 해야 해요.',
          setup() { S.gate = ''; setScene('beak'); },
          check: () => bkCount() === 4, hold: 0.6,
          status: () => '기록 ' + bkCount() + ' / 4 ' + mark(bkCount() === 4),
          explain: '물: 7.00 → 3.00(HCl), 11.00(NaOH). 완충 용액: 4.74 → 4.73(HCl), 4.75(NaOH). 같은 1 mL인데 물은 pH가 4나 변하고 완충 용액은 0.01만 변했어요.',
        },
        {
          title: 'pH 변화량 비교하기', manual: true,
          goal: '기록표에서 넣기 전과 넣은 뒤의 pH 차이(<b>변화량</b>)를 네 경우 모두 구해 입력하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '변화량은 큰 값에서 작은 값을 뺀 크기예요. 물 + HCl: 7.00과 3.00의 차는 4.00. 완충 용액 + HCl: 4.74와 4.73의 차는 0.01이에요.',
          setup() { S.gate = 'dl'; setScene('beak'); updateCtl(); },
          check() { if (dlRows.some((r) => isNaN(r.read()))) return '네 칸을 모두 입력하세요.'; const n = dlRows.filter((r) => r.ok).length; return n === 4 ? true : (4 - n) + '칸이 달라요. 기록표의 넣기 전과 넣은 뒤 값의 차이를 다시 구해 보세요.'; },
          status: () => '맞은 칸 ' + dlRows.filter((r) => r.ok).length + ' / 4',
          explain: '변화량: 물 + HCl 4.00, 물 + NaOH 4.00, 완충 용액 + HCl 0.01, 완충 용액 + NaOH 0.01. 완충 용액의 변화량은 물의 약 400분의 1이에요.',
        },
        {
          type: 'quiz', title: '완충 용액의 pH가 거의 안 변한 까닭',
          goal: '완충 용액에서 pH가 거의 변하지 않은 까닭을 가장 알맞게 설명한 <b>가설</b>은?',
          setup() { S.gate = ''; setScene('beak'); },
          choices: ['약산(CH₃COOH)과 그 짝염기(CH₃COO⁻)가 함께 있어서 넣은 H⁺와 OH⁻를 각각 없애 주기 때문이에요', 'CH₃COOH가 강산이라서 H⁺를 모두 흡수하기 때문이에요', '완충 용액에는 물이 들어 있지 않기 때문이에요', 'pH 미터가 완충 용액에서는 정확하지 않기 때문이에요'],
          answer: 0,
          feedback: ['', 'CH₃COOH는 약산이에요(Ka = 1.8×10⁻⁵). 강산이라면 완충이 되지 않아요.', '완충 용액도 물에 녹아 있어요. 중요한 것은 약산과 짝염기가 함께 있다는 점이에요.', '물과 같은 pH 미터로 쟀고 4.74 → 4.73으로 값이 분명히 달라요.'],
          explain: '넣은 H⁺는 CH₃COO⁻가 받아 CH₃COOH가 되고, 넣은 OH⁻는 CH₃COOH가 H⁺를 내놓아 물이 돼요. 두 물질이 함께 있으면 둘 다 막아 줄 수 있어요. 다음 단계에서 입자 모형으로 확인해요.',
        },
      ],
    },
    {
      title: '완충 원리: 평형 이동', short: '완충 원리', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 약산과 짝염기가 함께 있는 용액은 pH가 거의 변하지 않았어요. 입자 수준에서 <b>무슨 일이 일어나는지</b> 볼까요? 화학 평형의 <b>르샤틀리에 원리</b>를 떠올려요.</div>' +
        '<p>CH₃COOH ⇌ H⁺ + CH₃COO⁻ 평형에 H⁺를 넣으면 평형은 H⁺를 줄이는 쪽(<b>왼쪽</b>)으로, OH⁻를 넣으면 H⁺가 줄어드니 H⁺를 늘리는 쪽(<b>오른쪽</b>)으로 이동해요. 그래서 자유 H⁺의 수가 거의 변하지 않아요. 단, 받아 줄 입자가 모두 쓰이면 <b>완충 용량의 한계</b>에 이르러요.</p>',
      features: ['mech'],
      setup() { S.gate = ''; S.mc.view = 'part'; S.sub.mech = 'part'; S.mc.capX = 0; S.mc.capMax = 0; shSels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); selCap.value = ''; S.mc.nH = 0; S.mc.nO = 0; mcBuild('buf'); setScene('mech'); },
      recap: 'H⁺를 넣으면 CH₃COO⁻가 받아 CH₃COOH가 되고(평형이 왼쪽으로), OH⁻를 넣으면 CH₃COOH가 H⁺를 내놓아 H₂O가 돼요(평형이 오른쪽으로). 둘 다 있어야 완충이 되고, 받아 줄 입자가 모두 소진되면 pH가 급변해요.',
      summary: '<ul><li>완충 용액 = 약산과 그 짝염기(또는 약염기와 그 짝산)가 함께 들어 있는 용액</li><li>H⁺를 넣으면 평형이 <b>왼쪽</b>으로: CH₃COO⁻ + H⁺ → CH₃COOH (짝염기가 소모)</li><li>OH⁻를 넣으면 평형이 <b>오른쪽</b>으로: CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O (약산이 소모)</li><li>아세트산만 있는 용액은 H⁺를 받아 줄 CH₃COO⁻가 없어 pH가 크게 변해요 (측정: 2.87 → 2.72).</li><li>완충 용량의 한계: 0.10 M HCl을 완충 용액 100 mL에 넣을 때 pH는 0 mL <b>4.74</b>, 40 mL <b>4.37</b>, 80 mL <b>3.79</b>, 100 mL <b>2.87</b>. CH₃COO⁻ 10 mmol이 모두 쓰이는 100 mL에서 급락해요.</li></ul>',
      missions: [
        {
          title: '평형이 이동하는 방향 찾기', manual: true,
          goal: '입자 모형에서 <b>H⁺와 OH⁻를 한 번씩 넣어 보고</b>, 평형이 이동하는 방향을 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“H⁺ 넣기”와 “OH⁻ 넣기”를 눌러요. H⁺를 넣으면 CH₃COO⁻가 H⁺를 받아 CH₃COOH가 늘어요. OH⁻를 넣으면 반대예요.',
          setup() { S.gate = 'shift'; S.mc.view = 'part'; S.sub.mech = 'part'; setScene('mech'); updateCtl(); },
          check() { if (S.mc.nH < 1 || S.mc.nO < 1) return '먼저 입자 모형에서 H⁺와 OH⁻를 한 번씩 넣어 보세요.'; if (shSels.some((s) => !s.value)) return '두 칸을 모두 골라 주세요.'; return shDone() ? true : 'H⁺가 늘면 줄이는 쪽으로, OH⁻를 넣으면 H⁺가 줄어서 늘리는 쪽으로 이동해요. 입자 모형에서 CH₃COOH가 늘었는지 확인해 보세요.'; },
          status: () => '넣어 본 횟수 H⁺ ' + S.mc.nH + ' · OH⁻ ' + S.mc.nO + ' &nbsp; 정답 ' + shSels.filter((s) => s.value === s.ans).length + ' / 2',
          explain: 'H⁺를 넣으면 평형이 <b>왼쪽</b>(CH₃COOH가 늘어요)으로, OH⁻를 넣으면 OH⁻가 H⁺와 반응해 줄어든 H⁺를 채우려고 <b>오른쪽</b>(이온이 늘어요)으로 이동해요. 두 경우 모두 자유 H⁺ 수가 거의 그대로예요.',
        },
        {
          title: '완충 용량의 한계 찾기', manual: true,
          goal: '“📈 완충 용량”으로 바꿔 염산을 넣으며 pH가 급락하는 곳을 찾고, <b>CH₃COO⁻가 모두 쓰이는 HCl 부피</b>를 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '완충 용액 100 mL에는 CH₃COO⁻가 10 mmol 있고, 0.10 M HCl 1 mL에는 H⁺가 0.10 mmol 있어요. 슬라이더를 끝까지 움직여 pH가 급락하는 곳을 보세요.',
          setup() { S.gate = 'cap'; S.mc.view = 'cap'; S.sub.mech = 'cap'; setScene('mech'); updateCtl(); },
          check() { if (S.mc.capMax < 100) return '슬라이더를 100 mL 이상으로 움직여 pH가 어떻게 변하는지 먼저 살펴보세요.'; if (!selCap.value) return '부피를 하나 골라 주세요.'; return selCap.value === '100' ? true : (+selCap.value < 100 ? selCap.value + ' mL를 넣을 때까지는 CH₃COO⁻가 아직 남아 있어요 (H⁺ ' + (0.1 * selCap.value).toFixed(1) + ' mmol을 받았어요).' : 'CH₃COO⁻는 10 mmol뿐이라서 그보다 일찍 모두 쓰여요. H⁺ 10 mmol은 몇 mL의 0.10 M HCl에 들어 있을까요?'); },
          status: () => '최대 ' + S.mc.capMax + ' mL 살펴봄 ' + mark(S.mc.capMax >= 100) + ' &nbsp; 선택 ' + (selCap.value ? selCap.value + ' mL' : '—'),
          explain: 'CH₃COO⁻ 10 mmol은 H⁺ 10 mmol을 받을 수 있고, 0.10 M HCl 100 mL에 H⁺ 10 mmol이 있어요. 그래서 <b>100 mL</b>에서 CH₃COO⁻가 모두 소진돼 pH가 2.87로 급락해요. 완충 용액이 막을 수 있는 양에는 한계(완충 용량)가 있어요.',
        },
        {
          type: 'quiz', title: '약산과 짝염기가 함께 필요한 까닭',
          goal: '완충 용액에 <b>약산과 짝염기가 함께</b> 있어야 하는 까닭은?',
          setup() { S.gate = ''; S.mc.view = 'part'; S.sub.mech = 'part'; setScene('mech'); },
          choices: ['짝염기는 H⁺를 받아 주고 약산은 OH⁻를 중화해 주어서, 산과 염기 양쪽을 모두 막을 수 있기 때문이에요', '약산만 있어도 H⁺와 OH⁻를 모두 막을 수 있기 때문이에요', '짝염기만 있으면 H⁺를 계속 받을 수 있기 때문이에요', '물이 H⁺와 OH⁻를 모두 흡수하기 때문이에요'],
          answer: 0,
          feedback: ['', '아세트산만 있는 용액에서는 H⁺를 받아 줄 CH₃COO⁻가 없어 pH가 크게 변했어요(측정 2.87 → 2.72).', '짝염기만 있으면 OH⁻를 중화해 줄 약산이 없어요. 두 물질이 모두 필요해요.', '물은 산이나 염기를 넣으면 pH가 4나 변했어요. 물은 완충 작용을 하지 못해요.'],
          explain: '약산(CH₃COOH)은 OH⁻를 중화하고(H⁺를 내놓아), 짝염기(CH₃COO⁻)는 H⁺를 받아요. 한쪽만 있으면 한 방향의 변화만 막을 수 있어서 완충 용액이 되지 못해요.',
        },
      ],
    },
    {
      title: '혈액 완충: H₂CO₃ / HCO₃⁻', short: '혈액 완충', icon: '🩸', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 약산과 짝염기가 평형을 이동시키며 pH를 지키는 것을 봤어요. 우리 몸의 <b>혈액</b>에도 같은 원리가 있어요. 화학 단원에서 만났던 혈액 속 탄산 평형이에요.</div>' +
        '<p>세포가 만든 CO₂가 혈액에 녹으면 CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻ 평형을 이뤄요. 혈액에서는 <b>H₂CO₃(약산)</b>과 <b>HCO₃⁻(짝염기)</b>가 완충 작용을 해서 pH를 <b>7.35 ~ 7.45</b>로 유지해요. (탄산음료를 따면 거품이 나는 것도 CO₂의 용해 평형이 이동하기 때문이에요.)</p>',
      features: ['blood'],
      setup() { S.gate = ''; S.bl.nH = 0; S.bl.nO = 0; S.bl.phase = 'idle'; S.bl.shift = 0; S.bl.hco3 = 24; S.bl.co2 = 1.2; S.bl.needle = 7.4; blSels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); setScene('blood'); },
      recap: '혈액에서는 H⁺가 늘면 평형이 왼쪽으로 이동해 HCO₃⁻가 소모되고 CO₂가 늘어 폐로 배출돼요. OH⁻가 늘면 H₂CO₃가 H⁺를 내놓아 중화해요. H₂CO₃(약산) + HCO₃⁻(짝염기)가 혈액의 완충계예요.',
      summary: '<ul><li>혈액의 정상 pH: <b>7.35 ~ 7.45</b> (약 7.4)</li><li>평형: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻ (H₂CO₃가 약산, HCO₃⁻가 짝염기)</li><li>H⁺가 늘면 평형이 <b>왼쪽</b>: HCO₃⁻ 소모, CO₂ 증가 → 폐로 배출</li><li>OH⁻가 늘면 평형이 <b>오른쪽</b>: H₂CO₃가 H⁺를 내놓아 OH⁻를 중화</li><li>정상 혈액에는 HCO₃⁻ ≈ 24 mM, 용해 CO₂ ≈ 1.2 mM로 HCO₃⁻가 훨씬 많지만(약 20 : 1) 두 물질이 함께 있어요.</li><li>이 밖의 생체 완충계: 인산염, 단백질 (이름만)</li></ul>',
      missions: [
        {
          title: '혈액에서 평형이 이동하는 방향', manual: true,
          goal: '혈액에 <b>산(H⁺)과 염기(OH⁻)를 한 번씩 늘려 보고</b>, 평형이 이동하는 방향을 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“산(H⁺) 늘리기”와 “염기(OH⁻) 늘리기”를 눌러 막대가 어떻게 변하는지 보세요. H⁺가 늘면 HCO₃⁻가 줄어요.',
          setup() { S.gate = 'bl'; setScene('blood'); updateCtl(); },
          check() { if (S.bl.nH < 1 || S.bl.nO < 1) return '먼저 산(H⁺)과 염기(OH⁻)를 한 번씩 늘려 보세요.'; if (blSels.some((s) => !s.value)) return '두 칸을 모두 골라 주세요.'; return blDone() ? true : 'H⁺가 늘면 H⁺를 줄이는 쪽으로, OH⁻가 늘면 H⁺를 보충하는 쪽으로 평형이 이동해요. 막대의 변화를 다시 보세요.'; },
          status: () => '늘려 본 횟수 H⁺ ' + S.bl.nH + ' · OH⁻ ' + S.bl.nO + ' &nbsp; 정답 ' + blSels.filter((s) => s.value === s.ans).length + ' / 2',
          explain: 'H⁺가 늘면 평형이 <b>왼쪽</b>(HCO₃⁻ + H⁺ → H₂CO₃ → CO₂ + H₂O)으로 이동해 HCO₃⁻가 소모되고 CO₂가 늘어요. OH⁻가 늘면 <b>오른쪽</b>으로 이동해 H₂CO₃가 H⁺를 내놓아 OH⁻를 중화해요.',
        },
        {
          type: 'quiz', title: '혈액 속 H₂CO₃ / HCO₃⁻가 하는 일',
          goal: '혈액 속 <b>H₂CO₃와 HCO₃⁻</b>가 하는 일은?',
          setup() { S.gate = ''; setScene('blood'); },
          choices: ['H⁺가 늘면 HCO₃⁻가 받고 OH⁻가 늘면 H₂CO₃가 H⁺를 내놓아, 혈액 pH를 7.4 근처로 유지해요', '혈액을 항상 pH 7(중성)로 만들어요', '혈액의 산소를 운반해요', '혈액을 강한 산성으로 만들어 세균을 없애요'],
          answer: 0,
          feedback: ['', '정상 혈액의 pH는 7.4로 약한 염기성이에요. 중성이 아니에요.', '산소를 운반하는 것은 적혈구의 헤모글로빈이에요. H₂CO₃와 HCO₃⁻는 pH를 지켜요.', '혈액이 산성이 되면 위험해요. 정상 pH는 7.35 ~ 7.45예요.'],
          explain: '혈액의 H₂CO₃(약산)와 HCO₃⁻(짝염기)는 H⁺와 OH⁻를 각각 받거나 내놓는 완충계예요. 늘어난 CO₂는 폐로 배출되고, 이렇게 평형 이동과 호흡이 pH 7.4를 지켜 줘요. (탄산음료의 거품도 같은 CO₂ 평형이 이동해서 생겨요.)',
        },
      ],
    },
    {
      title: '몸의 조절: 상황별 혈액 pH 예측', short: '몸의 조절', icon: '🏃', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혈액의 H₂CO₃ / HCO₃⁻가 평형 이동으로 pH를 지키고, 폐가 CO₂를 내보내는 것을 봤어요. 일상의 여러 <b>상황</b>에서 혈액 pH는 어떻게 될까요?</div>' +
        '<p>네 가지 상황(격렬한 운동 · 과호흡 · 호흡 억제 · 레몬즙 섭취)에서 <b>혈액 pH의 변화</b>와 <b>몸의 반응</b>을 예측해 고르고 재생해요. pH가 정상 범위(7.35 ~ 7.45)를 벗어나면 위험해요. pH 수치는 측정 자료예요.</p>',
      features: ['regul'],
      setup() { S.gate = ''; rgReset(); S.rg.sc = 'ex'; S.rg.dirPick = null; S.rg.pred = {}; S.rg.body = {}; S.rg.played = {}; S.rg.last = null; selBody.value = ''; setScene('regul'); },
      recap: '운동 · 레몬즙처럼 산이 들어와도 완충과 호흡 · 신장의 조절로 pH는 정상 범위에 머물러요. 하지만 과호흡(pH 7.6)이나 호흡 억제(pH 7.2)는 CO₂ 농도가 바뀌어 정상 범위를 벗어나 위험해요. 완충 용량에는 한계가 있어요.',
      summary: '<ul><li>격렬한 운동: 젖산(H⁺) ↑ → HCO₃⁻ 소모, CO₂ ↑ → 호흡 빠르게 → pH <b>7.40</b> 유지 (정상 범위)</li><li>과호흡: CO₂ ↓ → 평형 왼쪽 → H⁺ ↓ → pH <b>7.60</b> (알칼리증, 위험)</li><li>호흡 억제: CO₂ ↑ → 평형 오른쪽 → H⁺ ↑ → pH <b>7.20</b> (산증, 위험)</li><li>레몬즙 섭취: H⁺를 HCO₃⁻가 받고 신장이 H⁺ 배설 → pH <b>7.40</b></li><li>pH가 크게 벗어나면 효소의 활성이 pH에 민감해서 위험해요. 완충 용액의 용량에는 한계가 있어요.</li></ul>',
      missions: [
        {
          title: '상황 세 가지 예측하고 재생하기',
          goal: '<b>세 가지 이상의 상황</b>에서 혈액 pH와 몸의 반응을 예측해 고르고 “예측하고 재생”을 눌러 결과를 확인하세요.',
          hint: '상황을 고르고 혈액 pH 예측과 몸의 반응을 고른 뒤 재생해요. CO₂가 줄면 평형이 왼쪽, 늘면 오른쪽으로 이동해요.',
          setup() { S.gate = ''; setScene('regul'); },
          check: () => rgPlayed() >= 3, hold: 0.6,
          status: () => '재생한 상황 ' + rgPlayed() + ' / 3 ' + mark(rgPlayed() >= 3),
          explain: '운동과 레몬즙은 pH 7.4 근처로 유지되지만, 과호흡(7.60)과 호흡 억제(7.20)는 CO₂의 양이 직접 바뀌어 정상 범위를 벗어나요.',
        },
        {
          type: 'quiz', title: 'pH가 크게 벗어나면 위험한 까닭',
          goal: '완충 작용이 있어도 혈액 pH가 정상 범위에서 <b>크게 벗어나면 위험한</b> 까닭은?',
          setup() { S.gate = ''; setScene('regul'); },
          choices: ['몸속 효소의 활성이 pH에 민감해서 pH가 달라지면 제 기능을 못 하기 때문이에요', '혈액의 색이 변하기 때문이에요', '체온이 즉시 올라가기 때문이에요', 'pH가 변하면 피가 굳어 버리기 때문이에요'],
          answer: 0,
          feedback: ['', '위험한 까닭은 색이 아니라 몸속 화학 반응이 제대로 일어나지 못하기 때문이에요.', 'pH 변화가 체온을 바로 올리지는 않아요. 효소의 활성이 문제예요.', '혈액이 굳는 것과는 관계가 없어요. 효소의 활성이 pH의 영향을 받아요.'],
          explain: '효소는 알맞은 pH에서 가장 잘 작용해요. 혈액 pH가 7.35 ~ 7.45를 크게 벗어나면 효소의 활성이 떨어져 몸속 화학 반응이 제대로 일어나지 못해요.',
        },
        {
          type: 'quiz', title: '완충 용액은 pH를 무한히 유지할까?',
          goal: '“완충 용액은 산이나 염기를 <b>얼마든지 넣어도</b> pH를 계속 유지한다”는 설명은 맞을까요?',
          setup() { S.gate = ''; setScene('regul'); },
          choices: ['맞아요. 완충 용액은 pH를 항상 유지해요', '틀려요. 받아 줄 입자(짝염기나 약산)가 모두 쓰이면 완충 작용을 못 해서 pH가 급변해요', '틀려요. 완충 용액은 처음부터 pH를 유지하지 못해요', '맞아요. 대신 온도가 변할 때만 pH가 변해요'],
          answer: 1,
          feedback: ['앞 단계에서 HCl을 100 mL 넣었을 때 CH₃COO⁻가 소진되어 pH가 2.87로 급락했어요. 한계가 있어요.', '', '처음에는 완충 용액이 pH를 거의 유지했어요(4.74 → 4.73).', '산이나 염기를 많이 넣어도 pH가 변해요. 완충 용량의 한계 때문이에요.'],
          explain: '완충 용액이 막을 수 있는 산 · 염기의 양(완충 용량)은 약산과 짝염기의 양으로 정해져요. 한쪽이 모두 쓰이면 pH가 급변해요. 그래서 혈액도 호흡과 신장의 도움으로 조절해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-buffer', mount: '#game', badge: '완충 박사', homeHref: '../../index.html#hr',
    featureLabels: { beak: '💧 물 · 완충 용액 비교 · pH 막대', mech: '🧩 평형 이동 입자 모형 · 완충 용량', blood: '🩸 혈액 H₂CO₃ / HCO₃⁻ 평형', regul: '🏃 상황별 pH 예측' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  mcBuild('buf');
  setScene('beak');
  function stepAll1(dt) { stepBeak(dt); stepMech(dt); stepBlood(dt); stepRegul(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'beak') drawBeak(t); else if (S.mode === 'mech') drawMech(t); else if (S.mode === 'blood') drawBlood(t, false); else drawBlood(t, true);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, BK, ACO, MSOL, SCN, SK4, dlRows, shSels, blSels, selCap, selBody, bkG, mcG, blG, bkSelect, bkReagent, bkDrop, bkBusy, bkCount, mcBuild, mcAdd, mcCount, mcFree, mcSetCap, mcView, blAct, rgSelect, rgDir, rgPlay, rgPlayed, capPh, bufPh,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
