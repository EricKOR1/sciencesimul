/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 염의 가수 분해 [12반응01-04]
   ① 실험: 염의 액성 (NaCl · CH₃COONa · NH₄Cl · CH₃COONH₄ · Na₂CO₃, 예측 → 녹이기 → pH 측정)  ② 모형: 이온 모형 (이온이 물과 H⁺를 주고받는 순간, 구경꾼 이온)
   ③ 설명: Ka · Kb 판단 (이온의 K = Kw ÷ 짝의 K, 산 / 염기 / 구경꾼, 약산 + 약염기 염은 Ka와 Kb 비교)  ④ 적용: 예측과 계산 ([OH⁻] ≈ √(Kh·C), 측정값과 비교, 농도 변화)
   다양성자 산의 염(Na₂CO₃ 등)은 측정값만, 약산–약염기 염의 정확한 pH 공식은 다루지 않아요. 모든 용액은 25 °C. */
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
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
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



  const MODE_LABEL = { test: '🧂 염의 액성', ion: '🧩 이온 모형', judge: '📋 Ka·Kb 판단', calc: '🧮 예측과 계산' };
  const SPL = SciSim.ease;
  const rect = (x, y, w, h) => ({ x, y, w, h });

  /* ---------- 자료 (25 °C, 0.10 M 염 수용액) ---------- */
  const KA_AC = 1.8e-5, KB_NH3 = 1.8e-5, KA_HF = 6.8e-4, KA_HCN = 6.2e-10;
  const KH_AC = KW / KA_AC, KA_NH4 = KW / KB_NH3;                   // 5.6×10⁻¹⁰ (CH₃COO⁻의 Kb, NH₄⁺의 Ka)
  const KB_F = KW / KA_HF, KB_CN = KW / KA_HCN;                      // 1.5×10⁻¹¹, 1.6×10⁻⁵
  const SALT = {
    nacl: { f: 'NaCl', name: '염화 나트륨', meas: 7.0 },
    ac: { f: 'CH₃COONa', name: '아세트산 나트륨', meas: 8.9 },
    nh4cl: { f: 'NH₄Cl', name: '염화 암모늄', meas: 5.1 },
    acnh4: { f: 'CH₃COONH₄', name: '아세트산 암모늄', meas: 7.0 },
    na2co3: { f: 'Na₂CO₃', name: '탄산 나트륨', meas: 11.7 },
    nh4f: { f: 'NH₄F', name: '플루오린화 암모늄', meas: 6.2 },
    nh4cn: { f: 'NH₄CN', name: '사이안화 암모늄', meas: null },
  };
  const SK = ['nacl', 'ac', 'nh4cl', 'acnh4', 'na2co3'];
  const KIND = { a: '산성', n: '중성', b: '염기성' }, KIND_COL = { a: '#dc2626', n: '#16a34a', b: '#2563eb' };
  const kindOfPh = (p) => (p < 6.95 ? 'a' : p > 7.05 ? 'b' : 'n');
  const WHY = [['', '예측의 근거 고르기'], ['neu', '중화 반응으로 만들어졌으니 중성일 거예요'], ['wa', '약산에서 온 음이온이 들어 있어요'], ['wb', '약염기에서 온 양이온이 들어 있어요'], ['ss', '강산과 강염기에서 온 이온뿐이에요'], ['both', '약산과 약염기에서 온 이온이 둘 다 있어요'], ['idk', '잘 모르겠어요']];
  const hydPh = (Kh, Cc, acid) => { const x = Math.sqrt(Kh * Cc); const p = -Math.log10(x); return acid ? p : 14 - p; };
  const CONCV = { c10: 0.10, c01: 0.010 }, CONCT = { c10: '0.10 M', c01: '0.010 M' };
  const calcPh = (k, c) => r2d(k === 'ac' ? hydPh(KH_AC, CONCV[c], false) : hydPh(KA_NH4, CONCV[c], true));   // 8.87 / 8.37 · 5.13 / 5.63
  const calcX = (k, c) => Math.sqrt((k === 'ac' ? KH_AC : KA_NH4) * CONCV[c]);

  /* ============ ① 염의 액성 ============ */
  const tsG = () => {
    const bw = PHONE ? 76 : 112, bh = PHONE ? 96 : 84, by = MAIN.y + 160;
    return { bw, bh, by, xs: SK.map((k, i) => MAIN.x + MAIN.w * (0.1 + 0.2 * i)), rail: MAIN.y + (PHONE ? 140 : 144),
      meter: rect(MAIN.x + (PHONE ? 8 : 14), MAIN.y + 8, PHONE ? 176 : 224, PHONE ? 124 : 122), tbl: rect(MAIN.x + (PHONE ? 192 : 248), MAIN.y + 8, PHONE ? 264 : 514, PHONE ? 124 : 122),
      strip: rect(MAIN.x + (PHONE ? 22 : 40), MAIN.y + (PHONE ? 330 : 296), MAIN.w - (PHONE ? 44 : 80), 16) };
  };
  const TS_LEVEL = 0.6;
  Object.assign(S, {
    mode: 'test', sub: { calc: 'ac' },
    ts: { cur: null, pick: null, pred: {}, why: {}, done: {}, px: 0, tip: 0, init: false, disp: 7, state: 'idle', liq: {}, tmr: 0, spX: 0, spT: 0, spoon: 0 },
  });
  const tsCount = () => SK.filter((k) => S.ts.done[k]).length;
  const tsPredCount = () => SK.filter((k) => S.ts.pred[k]).length;
  const tsBusy = () => ['pour', 'move', 'dip', 'settle'].indexOf(S.ts.state) >= 0;
  function tsReset() { const w = S.ts; w.cur = null; w.pick = null; w.pred = {}; w.why = {}; w.done = {}; w.liq = {}; w.state = 'idle'; w.disp = 7; w.init = false; w.tmr = 0; w.spoon = 0; updateCtl(); }
  function tsSelect(k) { const w = S.ts; if (tsBusy()) return; w.cur = k; w.pick = w.pred[k] || null; selWhy.value = w.why[k] || ''; if (w.state === 'read') w.state = 'idle'; Sound.click(); updateCtl(); }
  function tsPick(v) { if (tsBusy() || !S.ts.cur) return; S.ts.pick = v; Sound.click(); updateCtl(); }
  function tsRec() {
    const w = S.ts; if (!w.cur) { showHint('먼저 염을 골라요.', 2400); return; }
    if (!w.pick) { showHint('산성 · 중성 · 염기성 중 하나를 골라요.', 2600); Sound.fail(); return; }
    if (!selWhy.value) { showHint('예측의 근거도 골라요.', 2600); Sound.fail(); return; }
    w.pred[w.cur] = w.pick; w.why[w.cur] = selWhy.value; Sound.success(); updateCtl();
  }
  function tsMeasure() {
    const w = S.ts; if (!w.cur || tsBusy()) return;
    if (!w.pred[w.cur] && !(game && game.free)) { showHint('먼저 액성을 예측하고 “예측 기록”을 눌러요.', 3200); Sound.fail(); return; }
    w.state = 'pour'; w.tmr = 0; Sound.click(); updateCtl();
  }
  function stepTest(dt) {
    const w = S.ts, g = tsG(), key = w.cur, ix = key ? SK.indexOf(key) : -1;
    const restX = MAIN.x + MAIN.w / 2, upY = g.rail + 10, downY = g.by + 5 + (g.bh - 11) * (1 - TS_LEVEL) + 24;
    if (!w.init) { w.init = true; w.px = restX; w.tip = upY; w.spX = restX; }
    const surf = g.by + 5 + (g.bh - 11) * (1 - TS_LEVEL);
    if (w.state === 'pour') {
      w.tmr += dt; const bx = g.xs[ix];
      w.spX = ap(w.spX, bx, dt, 7); w.spoon = ap(w.spoon, 1, dt, 7);
      if (w.tmr > 0.55 && w.tmr < 1.25 && !RM) {
        for (let i = 0; i < 2; i++) parts.emit({ x: w.spX - 6 + Math.random() * 12, y: g.by - 38, vx: (Math.random() - 0.5) * 18, vy: 20, life: Math.sqrt(2 * (surf - (g.by - 38)) / 560) * 1.0, size: 2.2, color: '#ffffff', gravity: 560, shape: 'square', fade: false });
      }
      if (w.tmr > 1.7) { w.state = 'move'; }
    } else w.spoon = ap(w.spoon, 0, dt, 8);
    const tx = ix >= 0 && ['move', 'dip', 'settle', 'read'].indexOf(w.state) >= 0 ? g.xs[ix] : restX;
    let ty = upY;
    if (w.state === 'move' && Math.abs(w.px - tx) < 2) w.state = 'dip';
    if (w.state === 'dip' || w.state === 'settle' || w.state === 'read') ty = downY;
    if (w.state === 'idle' || w.state === 'pour') w.px = ap(w.px, restX, dt, 6);
    else if (w.state === 'move' && Math.abs(w.tip - upY) > 6) { /* 먼저 올라가요 */ } else w.px = ap(w.px, tx, dt, 6);
    w.tip = ap(w.tip, ty, dt, 6);
    if (w.state === 'dip' && Math.abs(w.tip - downY) < 3) { w.state = 'settle'; w.disp = 7.0; }
    if (w.state === 'settle') {
      const tgt = SALT[key].meas; w.disp = ap(w.disp, tgt, dt, 3.2);
      if (Math.abs(w.disp - tgt) < 0.012) { w.disp = tgt; w.state = 'read'; if (!w.done[key]) { w.done[key] = true; Sound.success(); flash(g.xs[ix], g.by - 10, ['#ffb400', '#14a058', '#8b5cf6']); updateCtl(); } }
    }
    if (key && ((w.state === 'pour' && w.tmr > 1.0) || ['move', 'dip', 'settle'].indexOf(w.state) >= 0)) w.liq[key] = ap(w.liq[key] || 0, 1, dt, 3);
    SK.forEach((k) => { if (w.done[k]) w.liq[k] = ap(w.liq[k] || 0, 1, dt, 3); });
  }
  function drawTest(t) {
    const w = S.ts, g = tsG(), key = w.cur;
    T(14, 26, '🧂 염의 액성을 예측하고, 물에 녹여 pH를 측정해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const mt = g.meter;
    D.shadow(() => { D.roundRect(mt.x, mt.y, mt.w, mt.h, 12); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 6, y: 3 });
    T(mt.x + 14, mt.y + 26, 'pH 미터', 14, '#9ca3af', 'left', 800);
    const inLiq = w.state === 'settle' || w.state === 'read';
    T(mt.x + mt.w - 16, mt.y + (PHONE ? 76 : 84), inLiq ? w.disp.toFixed(1) : '—', PHONE ? 38 : 46, inLiq ? (w.state === 'read' ? '#4ade80' : '#facc15') : '#6b7280', 'right', 800);
    T(mt.x + 14, mt.y + mt.h - 14, key ? '선택: ' + SALT[key].f : '염을 골라요', 13, '#9ca3af', 'left', 700);
    const tb = g.tbl;
    D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const c0 = tb.x + 12, c1 = tb.x + (PHONE ? 100 : 170), c2 = tb.x + (PHONE ? 158 : 290), c3 = tb.x + (PHONE ? 214 : 410);
    T(c0, tb.y + 22, '염 (0.10 M)', 13, MUTED, 'left', 800); T(c1, tb.y + 22, '예측', 13, MUTED, 'left', 800); T(c2, tb.y + 22, '측정 pH', 13, MUTED, 'left', 800); T(c3, tb.y + 22, PHONE ? '일치' : '예측 일치', 13, MUTED, 'left', 800);
    SK.forEach((k, i) => {
      const yy = tb.y + 44 + i * (PHONE ? 18 : 18.5), p = w.pred[k], d = w.done[k];
      if (key === k) { D.roundRect(tb.x + 4, yy - 14, tb.w - 8, 18, 6); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); }
      T(c0, yy, SALT[k].f, PHONE ? 13 : 14, INK, 'left', 800);
      T(c1, yy, p ? KIND[p] : '—', PHONE ? 13 : 14, p ? KIND_COL[p] : '#9ca3af', 'left', 800);
      T(c2, yy, d ? SALT[k].meas.toFixed(1) : '—', 14, d ? INK : '#9ca3af', 'left', 800);
      T(c3, yy, d && p ? (kindOfPh(SALT[k].meas) === p ? (PHONE ? '✅' : '✅ 맞음') : (PHONE ? '❌' : '❌ 달랐어요')) : '—', PHONE ? 13 : 14, d && p ? INK : '#9ca3af', 'left', 800);
    });
    // 레일 · 프로브 · 전선
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(MAIN.x + 24, g.rail); ctx.lineTo(MAIN.x + MAIN.w - 24, g.rail); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(w.px, g.rail); ctx.bezierCurveTo(w.px, g.rail - 24, mt.x + mt.w - 30, mt.y + mt.h + 36, mt.x + mt.w - 30, mt.y + mt.h); ctx.stroke();
    SK.forEach((k, i) => {
      const x = g.xs[i] - g.bw / 2, on = key === k, col = C.mix('#e8f1ff', phColor(SALT[k].meas), (w.liq[k] || 0) * 0.9);
      if (on) { D.roundRect(x - 8, g.by - 8, g.bw + 16, g.bh + 48, 14); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      beaker(x, g.by, g.bw, g.bh, { level: TS_LEVEL, color: col, alpha: 0.72 });
      T(g.xs[i], g.by + g.bh + 20, SALT[k].f, PHONE ? 12.5 : 14.5, INK, 'center', 800);
      T(g.xs[i], g.by + g.bh + (PHONE ? 36 : 38), w.pred[k] ? '예측 ' + KIND[w.pred[k]] : '', 12.5, w.pred[k] ? KIND_COL[w.pred[k]] : MUTED, 'center', 800);
    });
    // 숟가락
    if (w.spoon > 0.02 && key) {
      const sx = w.spX, sy = g.by - 56 - 10 * (1 - w.spoon), tilt = -0.5 * clamp((w.tmr - 0.4) / 0.4, 0, 1);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(tilt); ctx.globalAlpha = clamp(w.spoon, 0, 1);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(34, -14); ctx.lineTo(0, 0); ctx.stroke();
      D.roundRect(-14, -4, 28, 12, 6); ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
      if (w.tmr < 1.2) { ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(-9 + i * 3.6, -7 - (i % 2) * 2, 3, 3); }
      ctx.restore();
    }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(w.px, g.rail); ctx.lineTo(w.px, w.tip); ctx.stroke();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(w.px - 1, g.rail + 6); ctx.lineTo(w.px - 1, w.tip - 2); ctx.stroke();
    D.sphere(w.px, w.tip + 3, 5.5, '#0ea5e9', { gloss: false });
    // pH 띠 + 측정 표시
    const st = g.strip; phStrip(st.x, st.y, st.w, st.h, { r: 6 }); phTicks(st.x, st.y + st.h + 2, st.w, PHONE ? 2 : 1, 12.5);
    const px = (v) => st.x + st.w * clamp(v, 0, 14) / 14;
    SK.forEach((k) => { if (w.done[k]) D.sphere(px(SALT[k].meas) + (k === 'acnh4' ? 8 : k === 'nacl' ? -8 : 0), st.y + st.h / 2, 7, k === 'nacl' || k === 'acnh4' ? '#14a058' : KIND_COL[kindOfPh(SALT[k].meas)], { gloss: false, outline: '#fff', outlineWidth: 2 }); });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '염 수용액은 모두 중성일까요?', 15, '#b45309', 'left', 800);
    const n = tsCount();
    const body = n < 5 ? '염을 고르고 액성(산성 · 중성 · 염기성)과 그렇게 생각한 근거를 정해 “예측 기록”을 누른 뒤 “녹여서 측정”을 눌러요. 만능 지시약 색과 pH 미터로 확인해요. (측정 ' + n + ' / 5)' : '같은 0.10 M인데 NaCl과 CH₃COONH₄는 pH 7.0, CH₃COONa는 8.9, Na₂CO₃는 11.7로 염기성, NH₄Cl은 5.1로 산성이에요. 중화 반응으로 생긴 염이라도 액성이 달라요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  /* ============ ② 이온 모형 ============ */
  const MD_ORDER = ['nacl', 'ac', 'nh4cl'];
  const MD_SALT = { nacl: { cat: 'na', an: 'cl', f: 'NaCl' }, ac: { cat: 'na', an: 'ac', f: 'CH₃COONa' }, nh4cl: { cat: 'nh4', an: 'cl', f: 'NH₄Cl' } };
  const PK = {
    w: { lab: 'H₂O', col: '#7dd3fc', r: 11, tc: '#0c4a6e', ts: 0.82 }, na: { lab: 'Na⁺', col: '#a855f7', r: 12 }, cl: { lab: 'Cl⁻', col: '#16a34a', r: 12 },
    nh4: { lab: 'NH₄⁺', col: '#ec4899', r: 14, ts: 0.78 }, ac: { lab: 'CH₃COO⁻', col: '#f59e0b', cap: true, w: 64, h: 28 }, hac: { lab: 'CH₃COOH', col: '#fde68a', cap: true, w: 64, h: 28, tc: '#7c4a03' },
    oh: { lab: 'OH⁻', col: '#3b82f6', r: 12, ts: 0.8 }, h3o: { lab: 'H₃O⁺', col: '#ef4444', r: 13, ts: 0.75 }, nh3: { lab: 'NH₃', col: '#fbcfe8', r: 12, tc: '#9d174d', ts: 0.85 },
  };
  const pkR = (k) => (PK[k].cap ? 21 : PK[k].r + 1);
  const mdG = () => (PHONE
    ? { box: rect(MAIN.x + 8, MAIN.y + 40, 448, 222), eq: rect(MAIN.x + 8, MAIN.y + 270, 448, 80), kc: rect(MAIN.x + 8, MAIN.y + 356, 448, 62) }
    : { box: rect(MAIN.x + 14, MAIN.y + 40, 470, 290), eq: rect(MAIN.x + 498, MAIN.y + 40, 264, 164), kc: rect(MAIN.x + 498, MAIN.y + 212, 264, 118) });
  S.md = { salt: 'ac', p: [], evt: null, auto: 3.2, hold: 0, events: { ac: 0, nh4cl: 0 }, built: false, caption: '' };
  const mdInner = () => { const b = mdG().box; return { x0: b.x + 8, y0: b.y + 34, x1: b.x + b.w - 8, y1: b.y + b.h - 8 }; };
  function mdBuild(salt) {
    const md = S.md, cfg = MD_SALT[salt], g = mdInner(); md.salt = salt; md.p = []; md.evt = null; md.hold = 0.55; md.auto = 3.0;
    const cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2;
    const cols = 4, rows = 3, sx = 44, sy = 36;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = (r + c) % 2 === 0 ? cfg.cat : cfg.an;
      md.p.push({ k, x: cx - (cols - 1) * sx / 2 + c * sx, y: cy - (rows - 1) * sy / 2 + r * sy, vx: 0, vy: 0, lat: true, shake: 0, pin: false, home: k });
    }
    const nw = PHONE ? 20 : 30; let tries = 0;
    while (md.p.filter((q) => q.k === 'w').length < nw && tries < 3000) {
      tries++; const x = g.x0 + 14 + Math.random() * (g.x1 - g.x0 - 28), y = g.y0 + 14 + Math.random() * (g.y1 - g.y0 - 28);
      if (Math.abs(x - cx) < 120 && Math.abs(y - cy) < 78) continue;
      if (md.p.some((q) => Math.hypot(q.x - x, q.y - y) < 26)) continue;
      const a = Math.random() * TAU; md.p.push({ k: 'w', x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, lat: false, shake: 0, pin: false, home: 'w' });
    }
    md.p.forEach((q) => { if (q.lat) q.x += (Math.random() - 0.5) * 2; });
    md.built = true;
  }
  const mdElig = (q) => (S.md.salt === 'ac' && q.home === 'ac') || (S.md.salt === 'nh4cl' && q.home === 'nh4');
  function mdStart(A) {
    const md = S.md; if (md.evt) return false;
    if (!A) { const list = md.p.filter((q) => mdElig(q) && !q.lat); if (!list.length) return false; A = list[Math.floor(Math.random() * list.length)]; }
    let W = null, bd = 1e9; md.p.forEach((q) => { if (q.k !== 'w' || q.lat) return; const d = Math.hypot(q.x - A.x, q.y - A.y); if (d < bd) { bd = d; W = q; } });
    if (!W) return false;
    A.pin = true; W.pin = true; A.vx = A.vy = 0; W.vx = W.vy = 0;
    md.evt = { A, W, phase: 'approach', t: 0, h: 0, anion: A.home === 'ac' };
    Sound.click(); return true;
  }
  function mdTap(p) {
    const md = S.md; let best = null, bd = 1e9;
    md.p.forEach((q) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < pkR(q.k) + 6 && d < bd) { bd = d; best = q; } });
    if (!best) return;
    if (best.lat) { showHint('결정이 아직 녹는 중이에요. 잠시만 기다려요.', 1800); return; }
    if (md.evt) { showHint('반응이 진행 중이에요. 끝난 뒤에 다시 눌러요.', 1800); return; }
    if (mdElig(best)) { mdStart(best); return; }
    best.shake = 0.5; Sound.fail();
    if (best.k === 'na' || best.k === 'cl') showHint(PK[best.k].lab + '는 물과 반응하지 않아요. 구경꾼 이온이에요.', 3000);
    else if (best.k === 'w') showHint('물 분자예요. 이온을 눌러 보세요.', 2000);
    else showHint('이 염에서 물과 반응하는 이온을 눌러요.', 2200);
  }
  function stepModel(dt) {
    const md = S.md; if (!md.built) return;
    const g = mdInner(), p = md.p, ev = md.evt;
    if (md.hold > 0) { md.hold -= dt; if (md.hold <= 0) p.forEach((q) => { if (q.lat) { const cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2, a = Math.atan2(q.y - cy, q.x - cx) + (Math.random() - 0.5) * 0.7; q.lat = false; q.vx = Math.cos(a) * 70; q.vy = Math.sin(a) * 70; } }); }
    // 브라운 운동
    p.forEach((q) => {
      if (q.lat) return;
      q.shake = ap(q.shake, 0, dt, 5);
      if (q.pin) return;
      const sp = q.k === 'w' ? 34 : 24;
      if (!RM) { q.vx += (Math.random() - 0.5) * 260 * dt; q.vy += (Math.random() - 0.5) * 260 * dt; }
      const v = Math.hypot(q.vx, q.vy) || 1, vt = clamp(v, sp * 0.45, sp * 1.5); q.vx *= vt / v; q.vy *= vt / v;
      if (RM) { q.vx = 0; q.vy = 0; }
      q.x += q.vx * dt; q.y += q.vy * dt;
    });
    // 겹침 밀어내기 + 벽 반사
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      for (let j = i + 1; j < p.length; j++) {
        const b = p[j]; if (a.lat && b.lat) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, md2 = pkR(a.k) + pkR(b.k) - (a.pin && b.pin ? 6 : 0);
        if (d < md2 && !(ev && ((a === ev.A && b === ev.W) || (a === ev.W && b === ev.A)))) {
          const o = (md2 - d) / 2, ux = dx / d, uy = dy / d;
          if (!a.pin && !a.lat) { a.x -= ux * o; a.y -= uy * o; a.vx -= ux * 8; a.vy -= uy * 8; }
          if (!b.pin && !b.lat) { b.x += ux * o; b.y += uy * o; b.vx += ux * 8; b.vy += uy * 8; }
        }
      }
    }
    p.forEach((q) => {
      if (q.lat) return; const r = pkR(q.k);
      if (q.x < g.x0 + r) { q.x = g.x0 + r; q.vx = Math.abs(q.vx); } if (q.x > g.x1 - r) { q.x = g.x1 - r; q.vx = -Math.abs(q.vx); }
      if (q.y < g.y0 + r) { q.y = g.y0 + r; q.vy = Math.abs(q.vy); } if (q.y > g.y1 - r) { q.y = g.y1 - r; q.vy = -Math.abs(q.vy); }
    });
    // 반응 사건
    if (ev) {
      const A = ev.A, W = ev.W; ev.t += dt;
      const don = ev.anion ? W : A, acc = ev.anion ? A : W;
      if (ev.phase === 'approach') {
        const dx = W.x - A.x, dy = W.y - A.y, d = Math.hypot(dx, dy) || 1, want = pkR(A.k) + pkR('w') - 4;
        const tx = A.x + dx / d * want, ty = A.y + dy / d * want;
        W.x = ap(W.x, tx, dt, 6); W.y = ap(W.y, ty, dt, 6);
        if (ev.t > 0.8 || Math.abs(d - want) < 2) { ev.phase = 'xfer'; ev.t = 0; ev.h = 0; md.caption = ev.anion ? 'H₂O가 H⁺를 CH₃COO⁻에게 줘요' : 'NH₄⁺가 H⁺를 H₂O에게 줘요'; }
      } else if (ev.phase === 'xfer') {
        ev.h = Math.min(1, ev.t / 0.6);
        if (ev.h >= 1) {
          if (ev.anion) { A.k = 'hac'; W.k = 'oh'; } else { A.k = 'nh3'; W.k = 'h3o'; }
          md.events[md.salt]++; parts.burst((A.x + W.x) / 2, (A.y + W.y) / 2, { count: 10, speed: 70, size: 2.6, colors: ['#fde68a', '#bfdbfe', '#fff'], life: 0.5, gravity: 0 });
          Sound.tick(); ev.phase = 'hold'; ev.t = 0; md.caption = ev.anion ? 'CH₃COOH와 OH⁻가 생겼어요 (염기성의 까닭)' : 'NH₃와 H₃O⁺가 생겼어요 (산성의 까닭)';
        }
      } else if (ev.phase === 'hold') { if (ev.t > 1.4) { ev.phase = 'back'; ev.t = 0; md.caption = '곧 H⁺가 되돌아가요 (동적 평형)'; } }
      else if (ev.phase === 'back') {
        ev.h = Math.max(0, 1 - ev.t / 0.6);
        if (ev.h <= 0) { A.k = A.home; W.k = 'w'; ev.phase = 'sep'; ev.t = 0; md.caption = '대부분의 이온은 반응하지 않은 채로 있어요'; }
      } else if (ev.phase === 'sep') {
        if (ev.t > 0.4) { [A, W].forEach((q) => { q.pin = false; const a = Math.random() * TAU; q.vx = Math.cos(a) * 30; q.vy = Math.sin(a) * 30; }); md.evt = null; md.auto = 4.2; }
      }
    } else if (S.mode === 'ion' && (md.salt === 'ac' || md.salt === 'nh4cl')) {
      md.auto -= dt; if (md.auto <= 0) { if (!mdStart(null)) md.auto = 1; else md.auto = 5; }
    }
  }
  function drawIonShape(q, t) {
    const c = PK[q.k], jx = q.shake > 0.01 ? Math.sin(t * 60) * 3 * q.shake : 0;
    const x = q.x + jx, y = q.y;
    const dim = (S.md.salt !== 'nacl' && !mdElig(q) && (q.k === 'na' || q.k === 'cl' || q.home === 'na' || q.home === 'cl')) ? 0.55 : 1;
    ctx.save(); ctx.globalAlpha = (q.lat ? 1 : 1) * (q.k === 'w' ? 0.92 : dim);
    if (c.cap) {
      const gr = ctx.createLinearGradient(0, y - c.h / 2, 0, y + c.h / 2); gr.addColorStop(0, C.shade(c.col, 0.35)); gr.addColorStop(0.5, c.col); gr.addColorStop(1, C.shade(c.col, -0.3));
      D.roundRect(x - c.w / 2, y - c.h / 2, c.w, c.h, c.h / 2); ctx.fillStyle = gr; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - c.w * 0.2, y - c.h * 0.28, c.w * 0.18, c.h * 0.12, 0, 0, TAU); ctx.fill();
      T(x, y + 4.2, c.lab, 11.5, c.tc || '#fff', 'center', 800);
    } else D.sphere(x, y, c.r, c.col, { gloss: true, text: c.lab, textColor: c.tc || '#fff', textScale: c.ts || 0.9 });
    ctx.restore();
  }
  function drawModel(t) {
    const g = mdG(), md = S.md, b = g.box, ev = md.evt;
    T(14, 26, '🧩 염이 녹으면 이온이 물과 만나요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.roundRect(b.x, b.y, b.w, b.h, 14); const gr2 = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); gr2.addColorStop(0, '#f4f9ff'); gr2.addColorStop(1, '#dcecff'); ctx.fillStyle = gr2; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2.4; ctx.stroke();
    T(b.x + 12, b.y + 22, '🔍 ' + MD_SALT[md.salt].f + ' 수용액 (확대)', 13.5, '#1e40af', 'left', 800);
    if (!ev) T(b.x + b.w - 12, b.y + 22, md.hold > 0 ? '결정이 녹아 이온이 퍼져요' : '이온을 눌러 물과 만나게 해 보세요', PHONE ? 12 : 13, MUTED, 'right', 700);
    if (ev && md.caption) D.label(b.x + b.w / 2, b.y + b.h - 18, md.caption, { size: PHONE ? 12 : 13, bg: 'rgba(255,251,235,.95)', color: '#b45309', border: '#d9c98a' });
    if (ev && (ev.phase === 'hold')) { const mx = (ev.A.x + ev.W.x) / 2, my = (ev.A.y + ev.W.y) / 2; D.glow(mx, my, 46, '#fde68a', 0.5); }
    md.p.forEach((q) => { if (q.k === 'w') drawIonShape(q, t); });
    md.p.forEach((q) => { if (q.k !== 'w') drawIonShape(q, t); });
    if (ev && (ev.phase === 'xfer' || ev.phase === 'back')) {
      const don = ev.anion ? ev.W : ev.A, acc = ev.anion ? ev.A : ev.W, u = SPL.inOutCubic(clamp(ev.anion ? ev.h : ev.h, 0, 1));
      const f = ev.anion ? u : u;     // 0 = 주는 쪽, 1 = 받는 쪽
      const mx = (don.x + acc.x) / 2, my = (don.y + acc.y) / 2 - 22 * Math.sin(f * Math.PI);
      const x = don.x + (acc.x - don.x) * f, y = don.y + (acc.y - don.y) * f - 26 * Math.sin(f * Math.PI);
      void mx; void my;
      ctx.strokeStyle = 'rgba(239,68,68,.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(don.x, don.y); ctx.quadraticCurveTo((don.x + acc.x) / 2, (don.y + acc.y) / 2 - 36, acc.x, acc.y); ctx.stroke(); ctx.setLineDash([]);
      D.glow(x, y, 14, '#ffffff', 0.7); D.sphere(x, y, 6, '#ffffff', { gloss: false, outline: '#ef4444', outlineWidth: 2 }); T(x, y + 3.6, 'H⁺', 8.5, '#ef4444', 'center', 800);
      if (!RM) parts.emit({ x, y, vx: 0, vy: 0, life: 0.35, size: 2.4, color: '#fca5a5', gravity: 0, shape: 'circle' });
    }
    // 반응식 카드
    const e = g.eq;
    D.roundRect(e.x, e.y, e.w, e.h, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2; ctx.stroke();
    T(e.x + 12, e.y + 22, '물과의 반응', 13.5, '#8a6d00', 'left', 800);
    const fw = ev && (ev.phase === 'xfer' || ev.phase === 'hold'), bw2 = ev && ev.phase === 'back';
    const line = (y, a, on) => { T(e.x + 12, y, a, PHONE ? 14.5 : 16, on ? '#b45309' : INK, 'left', 800); };
    const on = fw || bw2;
    if (md.salt === 'ac') {
      if (PHONE) line(e.y + 50, 'CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻', on); else { line(e.y + 50, 'CH₃COO⁻ + H₂O', on); line(e.y + 74, '⇌ CH₃COOH + OH⁻', on); }
      T(e.x + 12, e.y + (PHONE ? 72 : 100), 'Na⁺는 반응하지 않는 구경꾼 이온', 13, MUTED, 'left', 700);
      if (!PHONE) textBlock(e.x + 12, e.y + 128, e.w - 24, 'OH⁻가 늘어 용액이 염기성이에요.', 13, '#2563eb', 18, 800);
    } else if (md.salt === 'nh4cl') {
      if (PHONE) line(e.y + 50, 'NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺', on); else { line(e.y + 50, 'NH₄⁺ + H₂O', on); line(e.y + 74, '⇌ NH₃ + H₃O⁺', on); }
      T(e.x + 12, e.y + (PHONE ? 72 : 100), 'Cl⁻는 반응하지 않는 구경꾼 이온', 13, MUTED, 'left', 700);
      if (!PHONE) textBlock(e.x + 12, e.y + 128, e.w - 24, 'H₃O⁺가 늘어 용액이 산성이에요.', 13, '#dc2626', 18, 800);
    } else {
      line(e.y + 50, 'Na⁺ + H₂O → (반응 없음)', false); line(e.y + (PHONE ? 70 : 76), 'Cl⁻ + H₂O → (반응 없음)', false);
      if (!PHONE) textBlock(e.x + 12, e.y + 108, e.w - 24, 'H₃O⁺도 OH⁻도 늘지 않아 중성이에요.', 13, '#16a34a', 18, 800);
    }
    // K 카드
    const k = g.kc;
    D.roundRect(k.x, k.y, k.w, k.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const spect = md.salt === 'nacl';
    T(k.x + 12, k.y + 22, spect ? '이온화 상수' : (md.salt === 'ac' ? 'CH₃COO⁻의 Kb = Kw / Ka' : 'NH₄⁺의 Ka = Kw / Kb'), PHONE ? 13 : 13.5, INK, 'left', 800);
    const kv = spect ? 0 : KH_AC, bx = k.x + 14, bw = k.w - 28, by = k.y + (PHONE ? 32 : 42), bh = 14;
    D.roundRect(bx, by, bw, bh, 6); ctx.fillStyle = '#e9e5f5'; ctx.fill();
    if (kv > 0) { const f = clamp((Math.log10(kv) + 14) / 14, 0, 1); D.roundRect(bx, by, Math.max(0, bw * f), bh, 6); ctx.fillStyle = '#8b5cf6'; ctx.fill(); }
    T(bx, by + bh + 15, '10⁻¹⁴', 11.5, MUTED, 'left', 700); T(bx + bw, by + bh + 15, '1', 11.5, MUTED, 'right', 700);
    T(bx + bw / 2, by + bh + 15, spect ? 'K 를 쓰지 않아요 (거의 0)' : sci(kv, 2), 12.5, spect ? MUTED : '#5b21b6', 'center', 800);
    if (!PHONE) textBlock(k.x + 12, k.y + 86, k.w - 24, spect ? '강산 · 강염기의 짝은 H⁺를 주고받는 능력이 거의 없어요.' : '아주 작은 K → 물과의 반응은 드물어요. (0.10 M에서 반응한 이온은 약 0.0075 %)', 12.5, MUTED, 17, 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '가수 분해: 이온이 물과 반응하는 현상', 15, '#b45309', 'left', 800);
    const cnt = md.events.ac + md.events.nh4cl;
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '염이 물에 녹아 생긴 이온 중 약산의 짝염기(CH₃COO⁻)나 약염기의 짝산(NH₄⁺)만 물과 H⁺를 주고받아요. 반응은 가끔 일어나고(작은 K), 곧 되돌아가는 동적 평형이에요. 실제로 반응해 있는 이온은 아주 적지만 그 OH⁻ 또는 H₃O⁺가 액성을 정해요. (본 반응 ' + cnt + '회)', 14.5, INK, 21, 700);
  }

  /* ============ ③ Ka · Kb 판단 ============ */
  const IONROW = [
    { ion: 'Na⁺', par: 'NaOH (강염기)', pk: '—', ik: '없음', role: '구경꾼', rc: '#64748b' },
    { ion: 'Cl⁻', par: 'HCl (강산)', pk: '—', ik: '없음', role: '구경꾼', rc: '#64748b' },
    { ion: 'CH₃COO⁻', par: 'CH₃COOH (약산)', pk: 'Ka ' + sci(KA_AC, 2), ik: 'Kb ' + sci(KH_AC, 2), role: '염기', rc: '#2563eb' },
    { ion: 'NH₄⁺', par: 'NH₃ (약염기)', pk: 'Kb ' + sci(KB_NH3, 2), ik: 'Ka ' + sci(KA_NH4, 2), role: '산', rc: '#dc2626' },
    { ion: 'F⁻', par: 'HF (약산)', pk: 'Ka ' + sci(KA_HF, 2), ik: 'Kb ', role: '염기', rc: '#2563eb', kb: true },
    { ion: 'CN⁻', par: 'HCN (약산)', pk: 'Ka ' + sci(KA_HCN, 2), ik: 'Kb ' + sci(KB_CN, 2), role: '염기', rc: '#2563eb' },
  ];
  const JK = ['nacl', 'ac', 'nh4cl', 'acnh4', 'nh4f', 'nh4cn'];
  const JION = { nacl: [0, 1], ac: [0, 2], nh4cl: [3, 1], acnh4: [3, 2], nh4f: [3, 4], nh4cn: [3, 5] };
  const JANS = { nacl: 'n', ac: 'b', nh4cl: 'a', acnh4: 'n', nh4f: 'a', nh4cn: 'b' };
  const ionKa = (i) => (i === 3 ? KA_NH4 : 0), ionKb = (i) => (i === 2 ? KH_AC : i === 4 ? KB_F : i === 5 ? KB_CN : 0);
  function jdRatio(k) { const [c, a] = JION[k]; const A = ionKa(c), B = ionKb(a); if (!A && !B) return 0; return Math.log10((A || 1e-20) / (B || 1e-20)); }
  const jdKind = (k) => { const r = jdRatio(k); return Math.abs(r) < 0.02 ? 'n' : r > 0 ? 'a' : 'b'; };
  S.jd = { k: 'nh4f', tilt: 0 };
  const jdG = () => (PHONE
    ? { tb: rect(MAIN.x + 8, MAIN.y + 8, 448, 216), bl: rect(MAIN.x + 8, MAIN.y + 232, 448, 186) }
    : { tb: rect(MAIN.x + 14, MAIN.y + 8, 470, 326), bl: rect(MAIN.x + 498, MAIN.y + 8, 264, 326) });
  const kbOk = () => kbRow.ok;
  function stepJudge(dt) { const j = S.jd, hide = JION[j.k][1] === 4 && !kbOk() && !(game && game.free), tgt = hide ? 0 : -clamp(jdRatio(j.k) / 3, -1, 1) * 0.3; j.tilt = ap(j.tilt, tgt, dt, 4); }
  function drawJudge(t) {
    const g = jdG(), j = S.jd, free = game && game.free;
    T(14, 26, '📋 이온의 K를 비교해 염 수용액의 액성을 판단해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const tb = g.tb;
    D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cx = PHONE ? [8, 72, 190, 288, 378] : [12, 90, 204, 306, 410], rh = PHONE ? 29 : 36, ry0 = tb.y + (PHONE ? 38 : 44);
    ['이온', '짝이 된 산·염기', '짝의 K', '이온의 K', '판정'].forEach((h, i) => T(tb.x + cx[i], tb.y + 22, h, PHONE ? 12.5 : 13.5, MUTED, 'left', 800));
    D.roundRect(tb.x + 4, tb.y + 30, tb.w - 8, 2, 1); ctx.fillStyle = '#e3def5'; ctx.fill();
    const sel = JION[j.k];
    IONROW.forEach((r, i) => {
      const yy = ry0 + i * rh + (PHONE ? 6 : 12), hi = sel.indexOf(i) >= 0;
      if (hi) { D.roundRect(tb.x + 4, yy - (PHONE ? 20 : 26), tb.w - 8, rh - 2, 8); ctx.fillStyle = 'rgba(139,92,246,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(139,92,246,.45)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      T(tb.x + cx[0], yy, r.ion, PHONE ? 13.5 : 15.5, INK, 'left', 800); T(tb.x + cx[1], yy, r.par, PHONE ? 12.5 : 13.5, INK, 'left', 700);
      T(tb.x + cx[2], yy, r.pk, PHONE ? 12.5 : 13.5, MUTED, 'left', 700);
      const hide = r.kb && !kbOk() && !free;
      T(tb.x + cx[3], yy, r.kb ? (hide ? 'Kb ?' : 'Kb ' + sci(KB_F, 2)) : r.ik, PHONE ? 12.5 : 13.5, hide ? '#b8aed6' : '#5b21b6', 'left', 800);
      D.roundRect(tb.x + cx[4] - 4, yy - (PHONE ? 14 : 16), 52, PHONE ? 20 : 22, 11); ctx.fillStyle = C.rgba(r.rc, 0.14); ctx.fill();
      T(tb.x + cx[4] + 22, yy + (PHONE ? 1 : 1.5), r.role, PHONE ? 12.5 : 13.5, r.rc, 'center', 800);
    });
    if (!PHONE) { textBlock(tb.x + 12, tb.y + tb.h - 52, tb.w - 24, '이온의 K = Kw / (짝의 K).  강산 · 강염기의 짝(Na⁺, Cl⁻)은 물과 반응하지 않는 구경꾼이에요. 약산 · 약염기의 짝은 물과 반응해요.', 13, INK, 18, 700); }
    // 저울
    const b = g.bl;
    D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const [ci, ai] = JION[j.k], Ka = ionKa(ci), Kb = ionKb(ai);
    T(b.x + 12, b.y + 22, SALT[j.k].f + (PHONE ? '' : ' 수용액'), PHONE ? 13.5 : 15, '#5b21b6', 'left', 800);
    const px = b.x + b.w / 2, py = b.y + (PHONE ? 84 : 98), L = PHONE ? 120 : (b.w - 60) / 2;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py + 8); ctx.lineTo(px, py + (PHONE ? 90 : 108)); ctx.stroke();
    D.roundRect(px - 34, py + (PHONE ? 90 : 108), 68, 8, 4); ctx.fillStyle = '#94a3b8'; ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(j.tilt);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore();
    D.sphere(px, py, 7, '#475569', { gloss: false });
    [-1, 1].forEach((sd) => {
      const ex = px + Math.cos(j.tilt) * L * sd, ey = py + Math.sin(j.tilt) * L * sd, ph = PHONE ? 38 : 56;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 22, ey + ph); ctx.moveTo(ex, ey); ctx.lineTo(ex + 22, ey + ph); ctx.stroke();
      D.roundRect(ex - 28, ey + ph, 56, 10, 5); ctx.fillStyle = sd < 0 ? '#fca5a5' : '#93c5fd'; ctx.fill();
      const K = sd < 0 ? Ka : Kb, hide = sd > 0 && ai === 4 && !kbOk() && !free;
      T(ex, ey + ph - 8, sd < 0 ? (Ka ? 'Ka' : '없음') : (Kb ? 'Kb' : '없음'), 13, sd < 0 ? '#b91c1c' : '#1d4ed8', 'center', 800);
      T(ex, ey + ph + 28, hide ? '?' : (K ? sci(K, 2) : 'K ≈ 0'), 12, MUTED, 'center', 800);
      T(ex, ey - 10, sd < 0 ? '산 쪽' : '염기 쪽', 12.5, sd < 0 ? '#b91c1c' : '#1d4ed8', 'center', 800);
    });
    const kind = jdKind(j.k), ratio = jdRatio(j.k);
    const hideR = ai === 4 && !kbOk() && !free;
    const txt = hideR ? 'F⁻의 Kb를 구하면 비교할 수 있어요' : (kind === 'n' ? (Ka || Kb ? 'Ka = Kb → 중성' : '둘 다 구경꾼 → 중성') : kind === 'a' ? (Kb ? 'Ka > Kb → 산성' : '산 쪽만 반응 → 산성') : (Ka ? 'Ka < Kb → 염기성' : '염기 쪽만 반응 → 염기성'));
    if (PHONE) T(b.x + b.w - 12, b.y + 22, txt, 13.5, hideR ? MUTED : KIND_COL[kind], 'right', 800); else T(b.x + b.w / 2, b.y + b.h - 40, txt, 14.5, hideR ? MUTED : KIND_COL[kind], 'center', 800);
    if (!PHONE && !hideR && Ka && Kb) T(b.x + b.w / 2, b.y + b.h - 16, 'Ka / Kb ≈ ' + (Math.abs(ratio) < 0.02 ? '1' : (ratio > 0 ? sci(Math.pow(10, ratio), 2) : '1 / ' + sci(Math.pow(10, -ratio), 2))), 12.5, MUTED, 'center', 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '판정 순서', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '① 양이온과 음이온이 각각 어떤 산 · 염기의 짝인지 찾아요.\n② 짝이 약하면 그 이온이 물과 반응해요 (구경꾼이 아니에요).\n③ 산 쪽과 염기 쪽이 둘 다 반응하면 Ka와 Kb의 크기를 비교해요. 큰 쪽의 액성이 이겨요.', 14.5, INK, 21, 700);
  }


  /* ============ ④ 예측과 계산 ============ */
  S.cc = { k: 'ac', c: 'c10', m1: 8.87, m2: 8.87 };
  const ccG = () => (PHONE
    ? { cd: rect(MAIN.x + 8, MAIN.y + 38, 448, 186), tb: rect(MAIN.x + 8, MAIN.y + 232, 448, 88), gg: rect(MAIN.x + 8, MAIN.y + 328, 448, 98) }
    : { cd: rect(MAIN.x + 14, MAIN.y + 40, 396, 290), tb: rect(MAIN.x + 422, MAIN.y + 40, 340, 120), gg: rect(MAIN.x + 422, MAIN.y + 168, 340, 162) });
  const ccDone = (k) => (k === 'ac' ? acRows.every((r) => r.ok) : nhRows.every((r) => r.ok));
  const ccStep = (k) => (k === 'ac' ? acRows.filter((r) => r.ok).length : nhRows.filter((r) => r.ok).length);
  function ccSetSalt(k) { S.cc.k = k; S.sub.calc = k === 'ac' ? 'ac' : 'nh4'; if (!(ccDone(k) || (game && game.free))) S.cc.c = 'c10'; Sound.click(); updateCtl(); }
  function ccSetConc(c) { if (c === 'c01' && !(ccDone(S.cc.k) || (game && game.free))) { showHint('먼저 0.10 M 계산을 마쳐요.', 2400); return; } S.cc.c = c; Sound.click(); updateCtl(); }
  const ccTheory = (k, c) => calcPh(k, c);
  function stepCalc(dt) { const cc = S.cc; cc.m1 = ap(cc.m1, ccTheory(cc.k, 'c10'), dt, 5); cc.m2 = ap(cc.m2, ccTheory(cc.k, 'c01'), dt, 5); }
  const errPct = (k) => Math.abs(SALT[k].meas - ccTheory(k, 'c10')) / ccTheory(k, 'c10') * 100;
  function drawCalc(t) {
    const g = ccG(), cc = S.cc, k = cc.k, acid = k === 'nh4cl', free = game && game.free, st = ccStep(k), c = cc.c;
    T(14, 26, '🧮 가수 분해 상수로 염 수용액의 pH를 계산해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const cd = g.cd; D.roundRect(cd.x, cd.y, cd.w, cd.h, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2.2; ctx.stroke();
    T(cd.x + 14, cd.y + 26, (k === 'ac' ? CONCT[c] + ' CH₃COONa 수용액' : CONCT[c] + ' NH₄Cl 수용액'), PHONE ? 14 : 16, '#8a6d00', 'left', 800);
    const full = free || (ccDone(k) && c === 'c01') || false, shown = (n) => st >= n || free || c === 'c01';
    const x = calcX(k, c), val = (n, txt) => (shown(n) ? txt : '?');
    const lines = k === 'ac' ? [
      ['① CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻', true],
      ['② Kh = Kw / Ka = 1.0×10⁻¹⁴ / 1.8×10⁻⁵ = ' + val(1, sci(KH_AC, 2)), st >= 1 || c === 'c01' || free],
      ['③ [OH⁻] = √(Kh·C) = ' + val(2, sci(x, 2) + ' M'), shown(2)],
      ['④ pOH = −log[OH⁻] = ' + val(3, r2d(-Math.log10(x)).toFixed(2)), shown(3)],
      ['⑤ pH = 14 − pOH = ' + val(4, ccTheory(k, c).toFixed(2)), shown(4)],
    ] : [
      ['① NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺', true],
      ['② Ka = Kw / Kb = 1.0×10⁻¹⁴ / 1.8×10⁻⁵ = ' + sci(KA_NH4, 2), true],
      ['③ [H⁺] = √(Ka·C) = ' + val(1, sci(x, 2) + ' M'), shown(1)],
      ['④ pH = −log[H⁺] = ' + val(2, ccTheory(k, c).toFixed(2)), shown(2)],
    ];
    lines.forEach((l, i) => { const y = cd.y + 62 + i * (PHONE ? 28 : 40); T(cd.x + 14, y, l[0], PHONE ? 13 : 15, l[1] ? (l[0].indexOf('?') >= 0 ? '#5b21b6' : INK) : '#9a8ec0', 'left', 800); });
    if (!PHONE) textBlock(cd.x + 14, cd.y + 62 + lines.length * 40 + 2, cd.w - 28, acid ? '양이온 NH₄⁺가 산 역할을 해서 H₃O⁺가 생기므로 [H⁺]를 구하고 pH = −log[H⁺]예요. Cl⁻는 구경꾼이에요.' : '음이온 CH₃COO⁻가 염기 역할을 해서 OH⁻가 생기므로 [OH⁻] → pOH → pH 순서예요. Na⁺는 구경꾼이에요.', 14, MUTED, 20, 700);
    // 이론값 vs 측정값
    const tb = g.tb; D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cA = tb.x + 12, cB = tb.x + (PHONE ? 190 : 140), cC = tb.x + (PHONE ? 272 : 214), cD = tb.x + tb.w - 12;
    T(cA, tb.y + 22, '0.10 M 염', 13, MUTED, 'left', 800); T(cB, tb.y + 22, '이론 pH', 13, MUTED, 'left', 800); T(cC, tb.y + 22, '측정 pH', 13, MUTED, 'left', 800); T(cD, tb.y + 22, '오차(%)', 13, MUTED, 'right', 800);
    ['ac', 'nh4cl'].forEach((q, i) => {
      const yy = tb.y + 48 + i * (PHONE ? 22 : 30), known = ccDone(q) || free, cur = q === k;
      if (cur) { D.roundRect(tb.x + 4, yy - 18, tb.w - 8, PHONE ? 24 : 28, 7); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); }
      T(cA, yy, SALT[q].f, PHONE ? 13 : 14.5, INK, 'left', 800); T(cB, yy, known ? ccTheory(q, 'c10').toFixed(2) : '?', 14.5, known ? INK : '#b8aed6', 'left', 800); T(cC, yy, SALT[q].meas.toFixed(1), 14.5, INK, 'left', 800); T(cD, yy, known ? errPct(q).toFixed(1) : '?', 14.5, known ? INK : '#b8aed6', 'right', 800);
    });
    // 농도에 따른 pH
    const gg = g.gg; D.roundRect(gg.x, gg.y, gg.w, gg.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(gg.x + 12, gg.y + 22, '농도에 따른 pH', PHONE ? 13 : 14.5, '#5b21b6', 'left', 800);
    const sx = gg.x + 18, sw = gg.w - 36, sy = gg.y + (PHONE ? 44 : 56), sh = 18, pxv = (v) => sx + sw * clamp(v, 0, 14) / 14;
    phStrip(sx, sy, sw, sh, { r: 6 });
    ctx.strokeStyle = 'rgba(40,50,80,.55)'; ctx.lineWidth = 1.4;
    for (let p = 0; p <= 14; p += 2) { ctx.beginPath(); ctx.moveTo(pxv(p), sy + sh); ctx.lineTo(pxv(p), sy + sh + 5); ctx.stroke(); T(pxv(p), sy + sh + 18, String(p), 12.5, INK, 'center', 800); }
    const known = ccDone(k) || free;
    if (known) {
      const dn = (px2, label, col, al) => { ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px2, sy - 1); ctx.lineTo(px2 - 7, sy - 13); ctx.lineTo(px2 + 7, sy - 13); ctx.closePath(); ctx.fill(); ctx.stroke(); T(px2 + (al === 'right' ? 2 : al === 'left' ? -2 : 0), sy - 17, label, 12.5, col, al || 'center', 800); };
      if (c === 'c01') { const leftIs1 = cc.m1 <= cc.m2; dn(pxv(cc.m1), '0.10 M', '#7c3aed', leftIs1 ? 'right' : 'left'); dn(pxv(cc.m2), '0.010 M', '#d97706', leftIs1 ? 'left' : 'right'); }
      else dn(pxv(cc.m1), '0.10 M', '#7c3aed', 'center');
      D.sphere(pxv(SALT[k].meas), sy + sh / 2, 6, '#14a058', { gloss: false, outline: '#fff', outlineWidth: 2 });
      if (!PHONE) textBlock(gg.x + 12, gg.y + sy - gg.y + sh + 34, gg.w - 24, c === 'c01' ? '10배 묽히면 [' + (acid ? 'H⁺' : 'OH⁻') + ']가 √10 분의 1이 되어 pH가 약 0.5만큼 ' + (acid ? '올라요' : '내려가요') + '. (' + ccTheory(k, 'c10').toFixed(2) + ' → ' + ccTheory(k, 'c01').toFixed(2) + ')' : '▼ 이론값, ● 측정값이에요. 농도를 0.010 M로 바꿔 보세요.', 13, MUTED, 18, 700);
    } else T(gg.x + gg.w / 2, gg.y + gg.h - (PHONE ? 6 : 40), '계산을 마치면 이론값이 표시돼요', 13.5, MUTED, 'center', 800);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '[OH⁻] ≈ √(Kh·C),  [H⁺] ≈ √(Ka·C)', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '염 수용액의 pH도 약산 · 약염기와 같은 근사식으로 구해요. 짝염기(또는 짝산)가 물과 반응하는 정도를 Kh = Kw / K로 나타내고, 반응하는 양은 처음 농도에 비해 아주 작아서(0.0075 %) 근사식을 써도 돼요.', 14.5, INK, 21, 700);
    void full;
  }

  function onLeave() {}
  /* ---------- 포인터 ---------- */
  const inBox = (p) => { const b = mdG().box; return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'test') { const g = tsG(); for (let i = 0; i < SK.length; i++) { if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 6 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 30) { tsSelect(SK[i]); return false; } } }
      if (S.mode === 'ion' && inBox(p)) mdTap(p);
      return false;
    },
    hover(p) {
      if (S.mode === 'test') { const g = tsG(); for (let i = 0; i < SK.length; i++) if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 6 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 30) return 'pointer'; }
      if (S.mode === 'ion' && inBox(p)) return 'pointer';
      return 'default';
    },
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
  const KOPT = [['', '고르기'], ['a', '산성'], ['n', '중성'], ['b', '염기성']];
  makeChips($('#slSel'), SK.map((k) => [k, SALT[k].f]), (v) => tsSelect(v));
  makeChips($('#pdSel'), [['a', '산성'], ['n', '중성'], ['b', '염기성']], (v) => tsPick(v));
  makeChips($('#ionSel'), MD_ORDER.map((k) => [k, MD_SALT[k].f]), (v) => { S.md.salt !== v && mdBuild(v); updateCtl(); });
  makeChips($('#jdSel'), JK.map((k) => [k, SALT[k].f]), (v) => { S.jd.k = v; updateCtl(); });
  makeChips($('#cSalt'), [['ac', 'CH₃COONa'], ['nh4cl', 'NH₄Cl']], (v) => ccSetSalt(v));
  const selWhy = $('#selWhy');
  WHY.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; selWhy.appendChild(o); });
  selWhy.addEventListener('change', () => { Sound.click(); updateCtl(); });
  const cmpSels = SK.map((k) => mkSel($('#cmpHost'), SALT[k].f, KOPT, kindOfPh(SALT[k].meas)));
  const jdgSels = JK.map((k) => mkSel($('#jdgHost'), SALT[k].f, KOPT, JANS[k]));
  const kbRow = mkRow($('#kbHost'), { label: 'F⁻의 Kb = Kw ÷ Ka(HF)', sci: true, ans: KB_F, rel: 0.04 }, () => updateCtl());
  const acRows = [
    mkRow($('#calcAc'), { label: 'Kh = Kw ÷ Ka (CH₃COO⁻의 Kb)', sci: true, ans: KH_AC, rel: 0.04 }, () => updateCtl()),
    mkRow($('#calcAc'), { label: '[OH⁻] = √(Kh·C) (M)', sci: true, ans: calcX('ac', 'c10'), rel: 0.03 }, () => updateCtl()),
    mkRow($('#calcAc'), { label: 'pOH (소수 둘째 자리)', ans: r2d(-Math.log10(calcX('ac', 'c10'))), tol: 0.015, ph: '0.00' }, () => updateCtl()),
    mkRow($('#calcAc'), { label: 'pH = 14 − pOH', ans: calcPh('ac', 'c10'), tol: 0.015, ph: '0.00' }, () => updateCtl()),
  ];
  const nhRows = [
    mkRow($('#calcNh'), { label: '[H⁺] = √(Ka·C) (M)', sci: true, ans: calcX('nh4cl', 'c10'), rel: 0.03 }, () => updateCtl()),
    mkRow($('#calcNh'), { label: 'pH = −log[H⁺]', ans: calcPh('nh4cl', 'c10'), tol: 0.015, ph: '0.00' }, () => updateCtl()),
  ];
  $('#bPredRec').addEventListener('click', tsRec); $('#bMeas').addEventListener('click', tsMeasure);
  $('#bEvt').addEventListener('click', () => { const md = S.md; if (md.evt) return; if (md.salt === 'nacl') { showHint('NaCl의 Na⁺와 Cl⁻는 물과 반응하지 않아요. 다른 염을 골라 보세요.', 3200); Sound.fail(); return; } if (md.hold > 0) { showHint('결정이 아직 녹는 중이에요. 잠시만 기다려요.', 1800); return; } mdStart(null); });
  $$('#cConc button').forEach((b) => b.addEventListener('click', () => ccSetConc(b.dataset.v)));

  function uiExtra() {
    if (typeof nhRows === 'undefined') return;
    const w = S.ts, cur = w.cur, busy = tsBusy(), free = game && game.free;
    markChips($('#slSel'), cur, w.done);
    $$('#pdSel button').forEach((b) => { b.classList.toggle('on', w.pick === b.dataset.v); b.disabled = busy || !cur; });
    selWhy.disabled = busy || !cur;
    $('#bPredRec').disabled = !cur || busy; $('#bMeas').disabled = !cur || busy || (!w.pred[cur] && !free);
    markChips($('#ionSel'), S.md.salt); $('#bEvt').disabled = !!S.md.evt;
    markChips($('#jdSel'), S.jd.k);
    markChips($('#cSalt'), S.cc.k, { ac: ccDone('ac'), nh4cl: ccDone('nh4cl') });
    $$('#cConc button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.cc.c); b.disabled = b.dataset.v === 'c01' && !(ccDone(S.cc.k) || free); });
  }

  function readouts() {
    const m = S.mode;
    if (m === 'test') { const k = S.ts.cur; setRead('선택한 염', k ? SALT[k].f : '—', '예측 → 측정', k ? (S.ts.pred[k] ? KIND[S.ts.pred[k]] : '—') + ' → ' + (S.ts.done[k] ? SALT[k].meas.toFixed(1) : '—') : '—', '측정한 염', tsCount() + ' / 5'); }
    else if (m === 'ion') { const md = S.md; setRead('염', MD_SALT[md.salt].f, '물과 반응하는 이온', md.salt === 'ac' ? 'CH₃COO⁻' : md.salt === 'nh4cl' ? 'NH₄⁺' : '없음', '반응 본 횟수', md.events.ac + md.events.nh4cl + '회'); }
    else if (m === 'judge') { const j = S.jd, hide = JION[j.k][1] === 4 && !kbRow.ok && !(game && game.free); setRead('염', SALT[j.k].f, '이온', IONROW[JION[j.k][0]].ion + ' · ' + IONROW[JION[j.k][1]].ion, '액성', hide ? '?' : KIND[jdKind(j.k)]); }
    else { const cc = S.cc, st = ccStep(cc.k), known = ccDone(cc.k) || (game && game.free); setRead('염 · 농도', SALT[cc.k].f + ' · ' + CONCT[cc.c], cc.k === 'ac' ? '[OH⁻]' : '[H⁺]', st >= (cc.k === 'ac' ? 2 : 1) || known ? sci(calcX(cc.k, cc.c), 2) + ' M' : '?', 'pH', known || cc.c === 'c01' ? ccTheory(cc.k, cc.c).toFixed(2) : '?'); }
  }

  /* ================= 미션 ================= */
  const cmpOkN = () => cmpSels.filter((s) => s.value === s.ans).length;
  const jdgOkN = () => jdgSels.filter((s) => s.value === s.ans).length;
  const levels = [
    {
      title: '염의 액성: 예측하고 측정하기', short: '염의 액성', icon: '🧂', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 소금(NaCl)은 중성인데, 베이킹 소다나 염화 암모늄 같은 염은 왜 중성이 아닐까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 산과 염기가 중화 반응하면 물과 염이 생긴다고 배웠어요. <b>앞 차시</b>에서 강산–강염기 당량점은 pH 7이었지요. 그럼 다른 산과 염기가 만든 염의 수용액도 항상 중성일까요?</div>' +
        '<p>염 5가지를 물에 녹이기 전에 <b>액성(산성 · 중성 · 염기성)을 예측</b>하고 그렇게 생각한 <b>근거</b>도 골라요. 그다음 pH 미터와 만능 지시약으로 측정해 예측과 비교해요. 실험할 때는 <b>보안경과 장갑</b>을 착용하고, 남은 용액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['test'],
      setup() { S.gate = ''; tsReset(); cmpSels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); selWhy.value = ''; setScene('test'); },
      recap: '같은 0.10 M 염 수용액이어도 NaCl · CH₃COONH₄는 pH 7.0, CH₃COONa는 8.9, Na₂CO₃는 11.7로 염기성, NH₄Cl은 5.1로 산성이었어요. 중화 반응으로 생긴 염이라고 모두 중성은 아니에요.',
      summary: '<ul><li>0.10 M 염 수용액의 측정 pH: NaCl <b>7.0</b>, CH₃COONa <b>8.9</b>, NH₄Cl <b>5.1</b>, CH₃COONH₄ <b>7.0</b>, Na₂CO₃ <b>11.7</b></li><li>염의 액성은 염을 이루는 산과 염기의 세기에 따라 달라요: 강산 + 강염기(NaCl)는 중성, 약산 + 강염기(CH₃COONa)는 염기성, 강산 + 약염기(NH₄Cl)는 산성</li><li>“중화 반응으로 생긴 염은 항상 중성이다”는 <b>틀린</b> 설명이에요.</li><li>Na₂CO₃는 다양성자 산(H₂CO₃)의 염이라 이 차시에서는 측정값만 사용해요.</li><li>안전: 보안경 · 장갑 착용, 폐액은 폐수 처리 기준에 따라 처리</li></ul>',
      missions: [
        {
          title: '다섯 가지 염 예측하고 측정하기',
          goal: '염 다섯 가지의 액성을 <b>예측해 기록</b>하고 물에 녹여 <b>측정</b>하세요.',
          hint: '염을 고르고 액성과 근거를 정해 “예측 기록”, 그다음 “녹여서 측정”을 눌러요. 염을 이루는 산과 염기가 강한지 약한지 생각해 보세요.',
          setup() { S.gate = ''; setScene('test'); },
          check: () => tsPredCount() === 5 && tsCount() === 5, hold: 0.6,
          status: () => '예측 ' + tsPredCount() + ' / 5 &nbsp; 측정 ' + tsCount() + ' / 5 ' + mark(tsCount() === 5 && tsPredCount() === 5),
          explain: '측정값: NaCl 7.0, CH₃COONa 8.9, NH₄Cl 5.1, CH₃COONH₄ 7.0, Na₂CO₃ 11.7. 같은 중화 반응으로 생긴 염인데도 액성이 달라요. 왜 그런지는 다음 단계에서 이온 모형으로 알아봐요.',
        },
        {
          title: '측정 결과로 액성 정리하기', manual: true,
          goal: '측정한 pH를 보고 다섯 염의 <b>액성</b>을 고른 뒤 <b>✔ 확인하기</b>를 누르세요. (pH 7보다 작으면 산성, 7이면 중성, 크면 염기성)',
          hint: 'NaCl 7.0, CH₃COONa 8.9, NH₄Cl 5.1, CH₃COONH₄ 7.0, Na₂CO₃ 11.7이에요. 7과 비교해 보세요.',
          setup() { S.gate = 'cmp'; setScene('test'); updateCtl(); },
          check() { if (cmpSels.some((s) => !s.value)) return '다섯 칸을 모두 골라 주세요.'; const n = cmpOkN(); return n === 5 ? true : (5 - n) + '칸이 달라요. pH가 7보다 작은지, 같은지, 큰지 다시 비교해 보세요.'; },
          status: () => '맞은 칸 ' + cmpOkN() + ' / 5',
          explain: '산성: NH₄Cl(pH 5.1). 중성: NaCl, CH₃COONH₄(pH 7.0). 염기성: CH₃COONa(8.9), Na₂CO₃(11.7). 내가 한 예측과 비교해 보면 어떤 염에서 예상이 빗나갔는지 알 수 있어요.',
        },
        {
          type: 'quiz', title: '중화로 생긴 염은 항상 중성일까?',
          goal: '“중화 반응으로 생긴 염의 수용액은 <b>항상 중성</b>이다”라는 설명을 평가해 보세요.',
          setup() { S.gate = ''; setScene('test'); },
          choices: ['맞아요. 산과 염기가 서로의 성질을 완전히 없애기 때문이에요', '틀려요. 염의 종류에 따라 액성이 달라요 (CH₃COONa는 염기성, NH₄Cl은 산성)', '틀려요. 염 수용액은 모두 산성이에요', '틀려요. 염은 물에 녹지 않아서 액성이 없어요'],
          answer: 1,
          feedback: ['중화되는 것은 H⁺와 OH⁻의 몰수예요. 생긴 염의 이온이 물과 다시 반응할 수 있어서 용액이 중성이 아닐 수도 있어요.', '', '실험에서 NaCl은 7.0, CH₃COONa는 8.9로 산성이 아니었어요.', '염은 물에 녹아 이온으로 나뉘어서 pH 미터로 값을 잴 수 있어요.'],
          explain: 'H⁺ + OH⁻ → H₂O 로 중화는 일어났지만, 그 결과 생긴 염의 이온이 물과 반응하면 H₃O⁺ 나 OH⁻ 가 다시 생겨요. 그래서 염의 종류에 따라 액성이 <b>달라요</b>.',
        },
      ],
    },
    {
      title: '이온 모형: 이온이 물과 만나면', short: '이온 모형', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 중화 반응의 염인데도 CH₃COONa는 염기성, NH₄Cl은 산성이었어요. 염이 물에 녹으면 용액 속에서 무슨 일이 일어날까요?</div>' +
        '<p>염은 물에 녹아 <b>이온</b>으로 나뉘어요. 이 이온 중 일부가 <b>물 분자와 H⁺를 주고받는</b> 현상을 <b>가수 분해</b>라고 해요. 브뢴스테드–라우리 정의로 보면 CH₃COO⁻는 H⁺를 받는 염기, NH₄⁺는 H⁺를 주는 산이에요.</p>',
      features: ['ion'],
      setup() { S.gate = ''; S.md.events = { ac: 0, nh4cl: 0 }; mdBuild('ac'); setScene('ion'); },
      recap: 'CH₃COO⁻는 물에게서 H⁺를 받아 CH₃COOH와 OH⁻를 만들어 염기성, NH₄⁺는 물에 H⁺를 주어 NH₃와 H₃O⁺를 만들어 산성이 돼요. Na⁺와 Cl⁻는 물과 반응하지 않는 구경꾼이에요.',
      summary: '<ul><li>염은 물에 녹아 이온으로 나뉘고, 일부 이온이 물과 H⁺를 주고받아요 → <b>가수 분해</b></li><li>CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ : CH₃COO⁻가 H⁺를 받는 <b>염기</b> → OH⁻ 생성 → 염기성</li><li>NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺ : NH₄⁺가 H⁺를 주는 <b>산</b> → H₃O⁺ 생성 → 산성</li><li>Na⁺, Cl⁻는 물과 반응하지 않는 <b>구경꾼</b> 이온이에요. 그래서 NaCl 수용액은 중성이에요.</li><li>이 반응의 상수는 작아서(5.6×10⁻¹⁰) 반응은 드물게 일어나고, 곧 되돌아가는 동적 평형이에요.</li></ul>',
      missions: [
        {
          title: '이온이 물과 반응하는 순간 보기',
          goal: '<b>CH₃COONa</b>와 <b>NH₄Cl</b> 각각에서 이온이 물과 H⁺를 주고받는 순간을 한 번씩 보세요.',
          hint: '염을 고르고 “반응 순간 보기”를 누르거나 입자 상자에서 CH₃COO⁻ 또는 NH₄⁺를 직접 눌러요. H⁺(흰 공)가 건너가는 모습을 보세요.',
          setup() { S.gate = ''; setScene('ion'); },
          check: () => S.md.events.ac >= 1 && S.md.events.nh4cl >= 1, hold: 0.5,
          status: () => 'CH₃COONa ' + mark(S.md.events.ac >= 1) + ' &nbsp; NH₄Cl ' + mark(S.md.events.nh4cl >= 1),
          explain: 'CH₃COONa에서는 물 분자가 H⁺를 CH₃COO⁻에게 주어 CH₃COOH와 OH⁻가 생겨요(염기성). NH₄Cl에서는 NH₄⁺가 H⁺를 물 분자에게 주어 NH₃와 H₃O⁺가 생겨요(산성). 두 반응 모두 곧 되돌아가는 평형이에요.',
        },
        {
          type: 'quiz', title: 'Na⁺와 Cl⁻가 반응하지 않는 까닭',
          goal: 'NaCl 수용액에서 <b>Na⁺와 Cl⁻가 물과 반응하지 않는</b> 까닭은?',
          setup() { S.gate = ''; setScene('ion'); },
          choices: ['물에 녹지 않기 때문이에요', 'Na⁺는 강염기 NaOH의, Cl⁻는 강산 HCl의 짝이라서 H⁺를 주고받는 능력이 거의 없기 때문이에요', '전하를 띠고 있지 않기 때문이에요', '이온의 크기가 너무 크기 때문이에요'],
          answer: 1,
          feedback: ['NaCl은 물에 잘 녹아 Na⁺와 Cl⁻로 나뉘어요. 문제는 이온이 물과 반응하느냐예요.', '', 'Na⁺와 Cl⁻도 전하를 띠고 있어요. 이온이라 전하가 있어요.', '크기가 아니라 짝이 되는 산 · 염기가 강한지 약한지가 중요해요.'],
          explain: 'Na⁺의 짝은 강염기 NaOH, Cl⁻의 짝은 강산 HCl이에요. 강한 산 · 염기의 짝은 H⁺를 거의 주고받지 못해서(K가 거의 0) 물과 반응하지 않아요. 그래서 구경꾼이고 NaCl 수용액은 중성이에요.',
        },
      ],
    },
    {
      title: 'Ka · Kb 판단: 산 · 염기 · 구경꾼', short: 'Ka·Kb 판단', icon: '📋', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 어떤 이온은 물과 반응하고 어떤 이온은 구경꾼이었어요. 이온마다 차이가 나는 까닭을 <b>이온화 상수</b>로 설명해 볼까요?</div>' +
        '<p>이온의 K는 <b>짝의 K와 곱해서 Kw가 돼요</b> (Ka × Kb = Kw). 따라서 이온의 K = Kw ÷ (짝의 K)예요. 짝이 약할수록 이온의 K가 커서 물과 잘 반응해요. 양이온과 음이온이 <b>둘 다</b> 반응하면 Ka와 Kb의 크기를 비교해요.</p>',
      features: ['judge'],
      setup() { S.gate = ''; S.jd.k = 'nh4f'; kbRow.clear(); jdgSels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); setScene('judge'); },
      recap: '이온의 K = Kw ÷ (짝의 K). 강산 · 강염기의 짝은 구경꾼, 약산의 짝염기는 염기(Kb), 약염기의 짝산은 산(Ka)이에요. 둘 다 반응하는 염은 Ka와 Kb 중 큰 쪽의 액성을 띠고 같으면 중성이에요.',
      summary: '<ul><li>이온의 K = Kw ÷ 짝의 K: Kb(CH₃COO⁻) = <b>5.6×10⁻¹⁰</b>, Ka(NH₄⁺) = <b>5.6×10⁻¹⁰</b>, Kb(F⁻) = <b>1.5×10⁻¹¹</b>, Kb(CN⁻) = <b>1.6×10⁻⁵</b></li><li>판정 절차: ① 이온이 어떤 산 · 염기의 짝인가 ② 짝이 약하면 이온이 반응 ③ 둘 다 반응하면 Ka와 Kb 비교</li><li>NaCl: 구경꾼 + 구경꾼 → 중성 / CH₃COONa: 염기 → 염기성 / NH₄Cl: 산 → 산성</li><li>CH₃COONH₄: Ka(NH₄⁺) = Kb(CH₃COO⁻) → <b>중성</b> / NH₄F: Ka(NH₄⁺) > Kb(F⁻) → 약한 <b>산성</b> / NH₄CN: Ka < Kb(CN⁻) → <b>염기성</b></li></ul>',
      missions: [
        {
          title: 'F⁻의 Kb 계산하기',
          goal: 'HF의 Ka = 6.8×10⁻⁴ 일 때 <b>F⁻의 Kb</b> (= Kw ÷ Ka)를 구하세요.',
          hint: 'Kb = 1.0×10⁻¹⁴ ÷ 6.8×10⁻⁴ = (1.0 ÷ 6.8)×10⁻¹⁰ ≈ 1.5×10⁻¹¹ 이에요. 앞 칸에는 1.5, 뒤 칸에는 −11을 써요.',
          setup() { S.gate = 'kb'; kbRow.clear(); S.jd.k = 'nh4f'; setScene('judge'); updateCtl(); },
          check: () => kbRow.ok, hold: 0.4,
          status: () => 'Kb(F⁻) ' + mark(kbRow.ok),
          explain: 'Kb(F⁻) = Kw ÷ Ka(HF) = 1.0×10⁻¹⁴ ÷ 6.8×10⁻⁴ ≈ <b>1.5×10⁻¹¹</b>. HF는 비교적 센 약산이라 그 짝염기 F⁻의 Kb는 아주 작아요.',
        },
        {
          title: '염 6종의 액성 판정하기', manual: true,
          goal: '여섯 염의 <b>액성</b>을 판정표를 보고 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '염을 눌러 이온과 저울을 보세요. NH₄F는 Ka(NH₄⁺) = 5.6×10⁻¹⁰과 Kb(F⁻) = 1.5×10⁻¹¹을, NH₄CN은 Ka(NH₄⁺)와 Kb(CN⁻) = 1.6×10⁻⁵을 비교해요.',
          setup() { S.gate = 'jdg'; setScene('judge'); updateCtl(); },
          check() { if (jdgSels.some((s) => !s.value)) return '여섯 칸을 모두 골라 주세요.'; const n = jdgOkN(); return n === 6 ? true : (6 - n) + '칸이 달라요. 이온이 구경꾼인지, 산 · 염기인지 확인하고 둘 다 반응하면 Ka와 Kb를 비교하세요.'; },
          status: () => '맞은 칸 ' + jdgOkN() + ' / 6',
          explain: 'NaCl 중성, CH₃COONa 염기성, NH₄Cl 산성, CH₃COONH₄ 중성(Ka = Kb), NH₄F 약한 산성(Ka > Kb), NH₄CN 염기성(Ka < Kb)이에요.',
        },
        {
          type: 'quiz', title: 'CH₃COONH₄가 중성인 까닭',
          goal: 'CH₃COONH₄ 수용액이 <b>중성</b>인 까닭은?',
          setup() { S.gate = ''; S.jd.k = 'acnh4'; setScene('judge'); },
          choices: ['두 이온이 모두 물과 반응하지 않기 때문이에요', 'CH₃COO⁻의 Kb와 NH₄⁺의 Ka가 같아서 OH⁻와 H₃O⁺가 같은 정도로 생기기 때문이에요', '약산과 약염기가 서로 중화해서 이온이 없어지기 때문이에요', 'Na⁺가 들어 있기 때문이에요'],
          answer: 1,
          feedback: ['CH₃COO⁻와 NH₄⁺는 둘 다 물과 반응해요. 구경꾼이 아니에요.', '', '이온이 없어지는 것이 아니에요. 두 이온이 모두 물과 반응하지만 그 정도가 같을 뿐이에요.', 'CH₃COONH₄에는 Na⁺가 없어요. 양이온은 NH₄⁺예요.'],
          explain: 'CH₃COO⁻는 OH⁻를, NH₄⁺는 H₃O⁺를 만들어요. Kb(CH₃COO⁻) = Ka(NH₄⁺) = 5.6×10⁻¹⁰ 로 같아서 두 효과가 서로 상쇄돼 용액은 <b>중성</b>이에요. 이 경우는 우연히 두 값이 같은 거예요.',
        },
      ],
    },
    {
      title: '예측과 계산: 염 수용액의 pH', short: '예측·계산', icon: '🧮', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 이온의 K로 염 수용액의 액성을 판단했어요. 이제 <b>pH 값</b>까지 예측해서 측정값과 비교해 봐요. 약산 · 약염기의 pH를 구할 때와 <b>같은 근사식</b>을 쓸 거예요.</div>' +
        '<p>CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ 에서 Kh = Kw ÷ Ka 이고 [OH⁻] ≈ √(Kh·C)예요. NH₄⁺는 [H⁺] ≈ √(Ka·C)예요. 계산한 이론값을 측정값과 비교하고, 농도를 10배 묽히면 pH가 얼마나 변하는지도 살펴봐요.</p>',
      features: ['calc'],
      setup() { S.gate = ''; acRows.forEach((r) => r.clear()); nhRows.forEach((r) => r.clear()); S.cc.k = 'ac'; S.cc.c = 'c10'; S.sub.calc = 'ac'; setScene('calc'); },
      recap: '0.10 M CH₃COONa는 Kh = 5.6×10⁻¹⁰, [OH⁻] = 7.5×10⁻⁶ M, pH 8.87(측정 8.9). 0.10 M NH₄Cl은 [H⁺] = 7.5×10⁻⁶ M, pH 5.13(측정 5.1)이에요. 10배 묽히면 pH가 약 0.5 변해요.',
      summary: '<ul><li>CH₃COONa: Kh = Kw ÷ Ka = 5.6×10⁻¹⁰ → [OH⁻] = √(5.6×10⁻¹⁰ × 0.10) = 7.5×10⁻⁶ M → pOH 5.13 → pH <b>8.87</b> (측정 8.9)</li><li>NH₄Cl: Ka(NH₄⁺) = 5.6×10⁻¹⁰ → [H⁺] = 7.5×10⁻⁶ M → pH <b>5.13</b> (측정 5.1)</li><li>0.010 M로 묽히면 CH₃COONa는 pH <b>8.37</b>, NH₄Cl은 pH <b>5.63</b>: 10배 묽힐 때 약 0.5 변해요.</li><li>적정에서 약산–강염기의 당량점 pH가 7보다 큰 까닭: 당량점의 용액은 CH₃COONa이고, CH₃COO⁻가 물과 반응해 OH⁻를 만들기 때문이에요. (다음 단계의 곡선에서 확인)</li></ul>',
      missions: [
        {
          title: '두 염 수용액의 pH 계산하기',
          goal: '<b>0.10 M CH₃COONa</b>와 <b>0.10 M NH₄Cl</b>의 pH를 근사식으로 계산해 입력하세요.',
          hint: 'CH₃COONa: Kh = 5.6×10⁻¹⁰ → [OH⁻] = √(Kh × 0.10) = 7.5×10⁻⁶ M → pOH = 5.13 → pH = 14 − 5.13. NH₄Cl: [H⁺] = √(5.6×10⁻¹⁰ × 0.10) = 7.5×10⁻⁶ M → pH = 5.13이에요.',
          setup() { S.gate = ''; acRows.forEach((r) => r.clear()); nhRows.forEach((r) => r.clear()); S.cc.k = 'ac'; S.cc.c = 'c10'; S.sub.calc = 'ac'; setScene('calc'); updateCtl(); },
          check: () => ccDone('ac') && ccDone('nh4cl'), hold: 0.5,
          status: () => 'CH₃COONa ' + acRows.filter((r) => r.ok).length + ' / 4 &nbsp; NH₄Cl ' + nhRows.filter((r) => r.ok).length + ' / 2 ' + mark(ccDone('ac') && ccDone('nh4cl')),
          explain: '이론값은 CH₃COONa pH <b>8.87</b>(측정 8.9, 오차 0.3 %), NH₄Cl pH <b>5.13</b>(측정 5.1, 오차 0.6 %)로 측정값과 잘 맞아요. 근사식 √(Kh·C)를 쓸 수 있는 까닭은 반응한 이온이 처음 농도의 0.0075 %로 아주 적기 때문이에요.',
        },
        {
          type: 'quiz', title: 'CH₃COONa 수용액이 염기성인 까닭',
          goal: 'CH₃COONa 수용액의 pH가 <b>7보다 큰</b> 까닭은?',
          setup() { S.gate = ''; setScene('calc'); },
          choices: ['Na⁺가 물과 반응해 OH⁻를 만들기 때문이에요', 'CH₃COO⁻가 물에게서 H⁺를 받아 CH₃COOH와 OH⁻를 만들기 때문이에요', 'CH₃COOH가 강산이기 때문이에요', 'CH₃COONa는 NaOH와 같은 강염기이기 때문이에요'],
          answer: 1,
          feedback: ['Na⁺는 강염기 NaOH의 짝산이라 물과 반응하지 않는 구경꾼이에요.', '', 'CH₃COOH는 약산(Ka = 1.8×10⁻⁵)이에요. 약산의 짝염기라서 가수 분해가 일어나요.', 'CH₃COONa 자체는 염이에요. 염기성인 이유는 이온 중 CH₃COO⁻가 염기로 작용하기 때문이에요.'],
          explain: 'CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ 로 OH⁻가 생겨 [OH⁻] > [H⁺]가 되고 pH가 7보다 커요. Na⁺는 구경꾼이에요. (앞의 이온 모형 단계와 같은 내용이에요.)',
        },
        {
          type: 'quiz', title: '정리: 약산–강염기 적정의 당량점',
          goal: '아세트산(CH₃COOH)을 NaOH로 적정할 때 <b>당량점의 pH가 7보다 큰</b> 까닭을 미리 짐작해 보세요.',
          setup() { S.gate = ''; setScene('calc'); },
          choices: ['당량점에서 용액에는 CH₃COONa가 있고, CH₃COO⁻의 가수 분해로 OH⁻가 생기기 때문이에요', '당량점에서는 NaOH가 남아 있기 때문이에요', '당량점에서는 CH₃COOH가 모두 H⁺로 바뀌기 때문이에요', '아세트산은 물보다 pH가 높은 물질이기 때문이에요'],
          answer: 0,
          feedback: ['', '당량점은 산과 염기가 정확히 같은 몰수로 만나는 지점이라 NaOH가 남지 않아요.', '아세트산은 약산이라 일부만 이온화해요. 당량점에서는 CH₃COO⁻와 Na⁺가 있어요.', '당량점의 pH는 용액에 들어 있는 염의 가수 분해로 정해져요.'],
          explain: '아세트산과 NaOH가 같은 몰수로 만나면 CH₃COONa 수용액이 돼요. 이 염의 CH₃COO⁻가 물과 반응해 OH⁻를 만들어 pH가 7보다 커요(농도 0.050 M이면 약 8.7). 강산–강염기의 당량점이 pH 7인 것과 달라요. 다음 차시의 약산–강염기 적정 곡선에서 확인해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-salt-hydrolysis', mount: '#game', badge: '가수 분해 박사', homeHref: '../../index.html#hr',
    featureLabels: { test: '🧂 예측 · pH 측정', ion: '🧩 이온 입자 모형', judge: '📋 Ka · Kb 판정표 · 저울', calc: '🧮 pH 계산 · 농도 변화' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  mdBuild('ac');
  setScene('test');
  function stepAll1(dt) { stepTest(dt); stepModel(dt); stepJudge(dt); stepCalc(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'test') drawTest(t); else if (S.mode === 'ion') drawModel(t); else if (S.mode === 'judge') drawJudge(t); else drawCalc(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, SALT, SK, JK, cmpSels, jdgSels, kbRow, acRows, nhRows, selWhy, tsG, mdG, jdG, ccG, mdInner, tsSelect, tsPick, tsRec, tsMeasure, tsCount, mdBuild, mdStart, jdKind, jdRatio, calcPh, calcX, ccSetSalt, ccSetConc, ccDone, errPct,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
