/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 이온화 상수와 산·염기 세기 [12반응01-02]
   ① 관찰: 같은 농도 비교 (0.10 M HCl · HCOOH · CH₃COOH · HCN의 pH와 전류)  ② 모형: 이온화 모형 (HA 100개, 이온화도 α, 동적 평형)
   ③ 분석: Ka로 순위 (로그 눈금, pKa)  ④ 적용: 짝산·짝염기 (Ka × Kb = Kw)
   약산의 pH 계산은 다음 차시, 염의 가수 분해는 ⑤차시. 다단계 이온화는 H₂CO₃의 1단계만 써요. 모든 용액은 25 °C. */
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


  const MODE_LABEL = { meas: '🌡️ 같은 농도 비교', model: '🧩 이온화 모형', rank: '📊 Ka로 순위', pair: '⚖️ 짝산·짝염기' };
  const SPL = SciSim.ease;

  /* ---------- 자료 (25 °C) ---------- */
  const AC = {
    hcl: { f: 'HCl', strong: true, ph: 1.00, col: '#16a34a', an: 'Cl⁻' },
    hf: { f: 'HF', Ka: 6.8e-4, pKa: 3.17, col: '#14b8a6', an: 'F⁻' },
    hcooh: { f: 'HCOOH', Ka: 1.8e-4, pKa: 3.74, ph: 2.37, col: '#f59e0b', an: 'HCOO⁻' },
    ch3: { f: 'CH₃COOH', Ka: 1.8e-5, pKa: 4.74, ph: 2.87, col: '#ec4899', an: 'CH₃COO⁻' },
    h2co3: { f: 'H₂CO₃', Ka: 4.3e-7, pKa: 6.37, col: '#a855f7', an: 'HCO₃⁻' },
    hcn: { f: 'HCN', Ka: 6.2e-10, pKa: 9.21, ph: 5.10, col: '#6366f1', an: 'CN⁻' },
    nh4: { f: 'NH₄⁺', Ka: 5.6e-10, pKa: 9.25, col: '#3b82f6', an: 'NH₃' },
  };
  const MSK = ['hcl', 'hcooh', 'ch3', 'hcn'];                   // 0.10 M 측정 용액
  const RKK = ['hf', 'hcooh', 'ch3', 'h2co3', 'hcn', 'nh4'];      // Ka 표 (센 순서가 아닌 표 순서와 같게 정렬해 두지 않음)
  const RK_SHOW = ['ch3', 'nh4', 'hf', 'hcn', 'h2co3', 'hcooh'];  // 표에 보이는 순서 (섞어 둠)
  const RK_TRUE = RKK.slice().sort((a, b) => AC[b].Ka - AC[a].Ka);
  const alphaOf = (k, Cc) => (AC[k].strong ? 1 : weakX(AC[k].Ka, Cc) / Cc);
  const relCur = (ph) => Math.pow(10, -ph) / 0.10 * 100;          // HCl = 100 으로 본 상대 전류 (%)
  const fmtRel = (v) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(3));
  const fmtAlpha = (a) => { const p = a * 100; return p >= 99.5 ? '100' : p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p >= 0.1 ? p.toFixed(2) : p.toPrecision(2); };
  const ordNames = (arr) => arr.map((k) => AC[k].f).join(' > ');

  /* ---------- 순서 매기기 목록 ---------- */
  function mkOrder(host, keys, label, onChange) {
    const o = { order: [], btns: {} };
    keys.forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt';
      const no = document.createElement('span'); no.className = 'no'; b.appendChild(no); b.appendChild(document.createTextNode(label(k)));
      b.addEventListener('click', () => { Sound.click(); const i = o.order.indexOf(k); if (i >= 0) o.order.splice(i, 1); else o.order.push(k); o.paint(); onChange && onChange(); });
      host.appendChild(b); o.btns[k] = b;
    });
    o.paint = () => keys.forEach((k) => { const i = o.order.indexOf(k), b = o.btns[k]; b.classList.toggle('on', i >= 0); b.querySelector('.no').textContent = i >= 0 ? String(i + 1) : ''; });
    o.clear = () => { o.order = []; o.paint(); };
    o.lock = (v) => keys.forEach((k) => { o.btns[k].disabled = v; });
    return o;
  }

  /* ============ ① 같은 농도 비교 ============ */
  const msG = () => {
    const bw = PHONE ? 88 : 112, bh = PHONE ? 118 : 100, by = MAIN.y + (PHONE ? 186 : 176);
    return { bw, bh, by, xs: MSK.map((k, i) => MAIN.x + MAIN.w * (0.125 + 0.25 * i)), rail: MAIN.y + (PHONE ? 142 : 138),
      meter: { x: MAIN.x + (PHONE ? 8 : 16), y: MAIN.y + 10, w: PHONE ? 222 : 232, h: PHONE ? 100 : 110 }, bulb: { x: MAIN.x + (PHONE ? 238 : 268), y: MAIN.y + 10, w: PHONE ? 218 : 492, h: PHONE ? 100 : 110 } };
  };
  const MS_LEVEL = 0.6;
  Object.assign(S, {
    mode: 'meas',
    ms: { cur: null, done: { hcl: false, hcooh: false, ch3: false, hcn: false }, pred: null, px: 0, tip: 0, init: false, disp: 7, state: 'idle', bright: 0, wob: 0, hold: 0, order: [], liq: { hcl: 0, hcooh: 0, ch3: 0, hcn: 0 } },
  });
  const msCount = () => MSK.filter((k) => S.ms.done[k]).length;
  const measuredOrder = () => MSK.slice().sort((a, b) => AC[a].ph - AC[b].ph);     // 이온이 많은 순 (pH가 작은 순)
  function msSelect(k) {
    if (!S.ms.pred && !(game && game.free)) { showHint('먼저 이온이 많을 것 같은 순서를 예측하고 “예측 기록하기”를 눌러요.', 3600); Sound.fail(); return; }
    Sound.click(); S.ms.cur = k; S.ms.state = 'move'; S.ms.hold = 0; updateCtl();
  }
  function msMeasure() {
    const m = S.ms;
    if (!m.pred && !(game && game.free)) { showHint('먼저 이온이 많을 것 같은 순서를 예측하고 “예측 기록하기”를 눌러요.', 3600); Sound.fail(); return; }
    if (!m.cur) return;
    m.state = 'move'; m.hold = 0; Sound.click(); updateCtl();
  }
  function msReset() { const m = S.ms; m.cur = null; m.state = 'idle'; m.done = { hcl: false, hcooh: false, ch3: false, hcn: false }; m.liq = { hcl: 0, hcooh: 0, ch3: 0, hcn: 0 }; m.bright = 0; m.disp = 7; m.pred = null; m.init = false; if (typeof prOrd !== 'undefined') prOrd.clear(); updateCtl(); }
  function stepMeas(dt) {
    const m = S.ms, g = msG();
    const key = m.cur, ix = key ? MSK.indexOf(key) : -1;
    const restX = MAIN.x + MAIN.w / 2, upY = g.rail + 10, downY = g.by + 5 + (g.bh - 11) * (1 - MS_LEVEL) + 26;
    if (!m.init) { m.init = true; m.px = restX; m.tip = upY; }
    let tx = ix >= 0 ? g.xs[ix] : restX, ty = upY;
    if (m.state === 'move') { const nearX = Math.abs(m.px - tx) < 2; if (nearX && ix >= 0) { m.state = 'dip'; } }
    if (m.state === 'dip' || m.state === 'settle') ty = downY;
    m.px = ap(m.px, m.state === 'move' && Math.abs(m.tip - upY) > 6 ? m.px : tx, dt, 6); m.tip = ap(m.tip, ty, dt, 6);
    if (m.state === 'move' && Math.abs(m.tip - upY) <= 6) m.px = ap(m.px, tx, dt, 6);
    if (m.state === 'dip' && Math.abs(m.tip - downY) < 3) { m.state = 'settle'; m.wob = 0.35; m.disp = 7.0; }
    if (m.state === 'settle') {
      const tgt = AC[key].ph; m.wob = Math.max(0, m.wob - dt * 0.2);
      m.disp = ap(m.disp, tgt, dt, 3.2);
      if (Math.abs(m.disp - tgt) < 0.012 && m.wob < 0.28) {
        m.disp = tgt; m.state = 'read'; if (!m.done[key]) { m.done[key] = true; Sound.success(); const gx = g.xs[ix]; flash(gx, g.by - 10, ['#ffb400', '#14a058', '#8b5cf6']); updateCtl(); }
      }
    }
    const brT = (m.state === 'read' || m.state === 'settle') && key ? clamp(Math.pow(relCur(AC[key].ph) / 100, 0.4), 0, 1) * (m.state === 'read' ? 1 : clamp((7 - m.disp) / (7 - AC[key].ph + 1e-6), 0, 1)) : 0;
    m.bright = ap(m.bright, brT, dt, 4);
    MSK.forEach((k) => { m.liq[k] = ap(m.liq[k], m.done[k] ? 1 : 0, dt, 3); });
  }
  function drawMeas(t) {
    const m = S.ms, g = msG(), key = m.cur;
    T(14, 26, '🌡️ 같은 농도(0.10 M)인데 pH와 전류가 같을까요?', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // pH 미터
    const mt = g.meter;
    D.shadow(() => { D.roundRect(mt.x, mt.y, mt.w, mt.h, 12); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 6, y: 3 });
    T(mt.x + 14, mt.y + 26, 'pH 미터', 14, '#9ca3af', 'left', 800);
    const inLiq = m.state === 'settle' || m.state === 'read';
    T(mt.x + mt.w - 16, mt.y + 74, inLiq ? m.disp.toFixed(2) : '—', 40, inLiq ? (m.state === 'read' ? '#4ade80' : '#facc15') : '#6b7280', 'right', 800);
    T(mt.x + 14, mt.y + 86, key ? '선택: ' + AC[key].f : '용액을 골라요', 12.5, '#9ca3af', 'left', 700, { alpha: PHONE ? 0 : 1 });
    // 전구 회로
    const bl = g.bulb;
    D.shadow(() => { D.roundRect(bl.x, bl.y, bl.w, bl.h, 12); ctx.fillStyle = '#fffaf0'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 2; D.roundRect(bl.x, bl.y, bl.w, bl.h, 12); ctx.stroke();
    const bx = bl.x + (PHONE ? 46 : 62), by2 = bl.y + 44;
    if (m.bright > 0.01) D.glow(bx, by2, 20 + 44 * m.bright, '#fde047', 0.75 * m.bright);
    ctx.fillStyle = C.mix('#e5e7eb', '#fef08a', m.bright); ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(bx, by2, 21, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = m.bright > 0.1 ? '#f59e0b' : '#9ca3af'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(bx - 7, by2 + 17); ctx.lineTo(bx - 7, by2 - 2); ctx.lineTo(bx - 2, by2 - 8); ctx.lineTo(bx + 2, by2 - 2); ctx.lineTo(bx + 7, by2 - 8); ctx.lineTo(bx + 7, by2 + 17); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.fillRect(bx - 9, by2 + 20, 18, 9);
    const cur = key && (m.state === 'read') ? relCur(AC[key].ph) : null;
    T(bx + (PHONE ? 34 : 40), bl.y + 28, '상대 전류 (HCl = 100)', PHONE ? 13 : 14, MUTED, 'left', 800);
    T(bx + (PHONE ? 34 : 40), bl.y + 62, cur != null ? fmtRel(cur) : '—', PHONE ? 26 : 30, cur != null ? '#b45309' : '#9ca3af', 'left', 800);
    if (!PHONE) {
      // 측정 요약 막대 (세로로 각 용액의 상대 전류: 로그가 아닌 실제 값 그대로)
      const sx = bl.x + 258, sw = bl.w - 274;
      T(sx, bl.y + 24, '측정한 값 (상대 전류 %)', 13, MUTED, 'left', 800);
      MSK.forEach((k, i) => {
        const yy = bl.y + 34 + i * 18, v = relCur(AC[k].ph);
        T(sx, yy + 10, AC[k].f, 12.5, INK, 'left', 800); D.roundRect(sx + 70, yy + 2, sw - 150, 9, 4); ctx.fillStyle = '#efe8d5'; ctx.fill();
        if (m.done[k]) { const w = (sw - 150) * clamp(v / 100, 0, 1); if (w >= 0.5) { D.roundRect(sx + 70, yy + 2, w, 9, Math.min(4, w / 2)); ctx.fillStyle = AC[k].col; ctx.fill(); } T(sx + sw - 74 + 74, yy + 10, fmtRel(v), 12.5, INK, 'right', 800); }
      });
    }
    // 레일과 프로브
    const upY = g.rail + 10;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(MAIN.x + 24, g.rail); ctx.lineTo(MAIN.x + MAIN.w - 24, g.rail); ctx.stroke();
    // 전선
    const wire = (A, B) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.bezierCurveTo(A.x, A.y - 30, B.x, B.y + 50, B.x, B.y); ctx.stroke(); };
    wire({ x: m.px - 3, y: g.rail }, { x: mt.x + mt.w - 30, y: mt.y + mt.h }); wire({ x: m.px + 3, y: g.rail }, { x: bx, y: by2 + 29 });
    // 비커 4개
    MSK.forEach((k, i) => {
      const x = g.xs[i] - g.bw / 2, a = AC[k], on = key === k;
      const col = C.mix('#cfe8ff', phColor(a.ph), m.liq[k] * 0.9);
      if (on) { D.roundRect(x - 8, g.by - 10, g.bw + 16, g.bh + 54, 14); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      beaker(x, g.by, g.bw, g.bh, { level: MS_LEVEL, color: col, alpha: 0.72 });
      T(g.xs[i], g.by + g.bh + 22, '0.10 M ' + a.f, PHONE ? 13 : 14.5, INK, 'center', 800);
      if (m.done[k]) { const v = 'pH ' + a.ph.toFixed(2); D.label(g.xs[i], g.by + g.bh + 42, v, { bg: '#26324a', size: 13 }); }
      else T(g.xs[i], g.by + g.bh + 44, '측정 전', 13, '#94a3b8', 'center', 700);
    });
    // 프로브 (유리 막대)
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.px, g.rail); ctx.lineTo(m.px, m.tip); ctx.stroke();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(m.px - 1, g.rail + 6); ctx.lineTo(m.px - 1, m.tip - 2); ctx.stroke();
    D.sphere(m.px, m.tip + 3, 5.5, '#0ea5e9', { gloss: false });
    // 설명
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '농도(처음 넣은 몰수)가 같아도 H⁺ 농도가 달라요', 15, '#b45309', 'left', 800);
    const n = msCount();
    let body = !m.pred && !(game && game.free) ? '먼저 오른쪽에서 “이온이 많은 순서”를 예측하고 기록해요. 그다음 네 용액을 하나씩 측정해요.' : n < 4 ? '용액을 골라 “측정하기”를 눌러요. pH가 작을수록 H⁺가 많고, 이온이 많을수록 전류가 세게 흘러 전구가 밝아져요. (' + n + ' / 4)' : '[H⁺] = 10^(−pH) 이에요. HCl 1.0×10⁻¹ M, HCOOH 4.3×10⁻³ M, CH₃COOH 1.3×10⁻³ M, HCN 7.9×10⁻⁶ M — 처음 농도는 모두 0.10 M인데 H⁺ 농도는 아주 달라요!';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ② 이온화 모형 ============ */
  const MDK = ['hcl', 'hcooh', 'ch3', 'hcn'];
  const CONCS = [0.10, 0.050, 0.010];
  const CONC_TXT = ['0.10 M', '0.050 M', '0.010 M'];
  const NP = 100;
  const mdBox = () => (PHONE ? { x: MAIN.x + 12, y: MAIN.y + 40, w: 440, h: 206 } : { x: MAIN.x + 14, y: MAIN.y + 40, w: 420, h: 252 });
  const mdPerm = (() => { const a = Array.from({ length: 112 }, (_, i) => i); let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, NP); })();
  const mdHome = (i) => { const B = mdBox(), idx = mdPerm[i], cols = 14, rows = 8, c = idx % cols, r = Math.floor(idx / cols), q = r2(i + 3); return { x: B.x + (c + 0.5 + (q[0] - 0.5) * 0.35) * B.w / cols, y: B.y + 8 + (r + 0.5 + (q[1] - 0.5) * 0.35) * (B.h - 16) / rows }; };
  const mdWater = (n) => Array.from({ length: n }, (_, i) => { const q = r2(i + 120); return { u: q[0], v: q[1] }; });
  S.md = {
    k: 'ch3', ci: 0, lo: 1, hi: 2, frac: 0.33, evt: 0.5, n: 0, sum: 0, T: 0, ff: 0, fb: 0,
    pts: Array.from({ length: NP }, (_, i) => ({ ion: 0, tIon: 0, ang: (i * 2.399) % TAU })), water: mdWater(170), seen: {},
  };
  const mdAlpha = () => alphaOf(S.md.k, CONCS[S.md.ci]);
  const mdIonN = () => S.md.pts.filter((p) => p.tIon === 1).length;
  function mdSet(k, ci) {
    const m = S.md; m.k = k; m.ci = clamp(ci, 0, 2);
    const n0 = NP * mdAlpha(), lo = Math.floor(n0 + 1e-9);
    m.lo = lo; m.hi = Math.min(NP, lo + 1); m.frac = n0 - lo < 1e-9 ? 0 : n0 - lo; if (m.frac === 0) m.hi = lo;
    m.sum = 0; m.T = 0; m.evt = 0.4;
    // 입자 상태를 새 값에 맞춤
    const idxs = m.pts.map((_, i) => i); m.pts.forEach((p) => { p.tIon = 0; });
    for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
    const target = m.lo + (m.frac > 0 && Math.random() < m.frac ? 1 : 0);
    for (let i = 0; i < target; i++) m.pts[idxs[i]].tIon = 1;
    m.n = mdIonN(); m.seen[k + ci] = true; updateCtl();
  }
  function mdEvent() {
    const m = S.md, ions = m.pts.filter((p) => p.tIon === 1), neu = m.pts.filter((p) => p.tIon === 0);
    const n = ions.length, nominal = m.lo + m.frac, avg = m.T > 1 ? m.sum / m.T : nominal;
    const pHi = m.frac > 0 ? clamp(m.frac + 1.6 * (nominal - avg), 0.02, 0.98) : 0;      // 평균이 이론값 근처로 모이도록 살짝 보정
    const tgt = m.lo + (Math.random() < pHi ? 1 : 0);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (tgt > n && neu.length) { pick(neu).tIon = 1; m.ff = 1; }
    else if (tgt < n && ions.length) { pick(ions).tIon = 0; m.fb = 1; }
    else if (n > 0 && neu.length > 0) { pick(ions).tIon = 0; pick(neu).tIon = 1; m.ff = 1; m.fb = 1; }
  }
  function stepModel(dt) {
    const m = S.md;
    m.pts.forEach((p) => { p.ion = ap(p.ion, p.tIon, dt, 6); if (Math.abs(p.ion - p.tIon) < 0.01) p.ion = p.tIon; });
    m.ff = Math.max(0, m.ff - dt * 2.4); m.fb = Math.max(0, m.fb - dt * 2.4);
    if (m.lo < NP && (m.frac > 0 || m.lo > 0)) { m.evt -= dt; if (m.evt <= 0) { m.evt = -Math.log(Math.max(1e-6, Math.random())) / 1.3; mdEvent(); } }
    m.n = mdIonN();
    if (S.mode === 'model') { m.sum += m.n * dt; m.T += dt; }
  }
  const mdAvg = () => (S.md.T > 0.25 ? S.md.sum / S.md.T : S.md.n);
  function drawModel(t) {
    const m = S.md, B = mdBox(), a = AC[m.k], Cc = CONCS[m.ci];
    T(14, 26, '🧩 용액 속 HA 100개 중 몇 개가 이온이 될까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.roundRect(B.x, B.y, B.w, B.h, 12); const gr = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); gr.addColorStop(0, '#eaf4ff'); gr.addColorStop(1, '#d6e9ff'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2; ctx.stroke();
    // 물 분자 (농도가 묽을수록 많이)
    const nw = [30, 75, 170][m.ci];
    ctx.fillStyle = 'rgba(96,165,250,.38)';
    for (let i = 0; i < nw; i++) { const q = m.water[i]; ctx.beginPath(); ctx.arc(B.x + 8 + q.u * (B.w - 16), B.y + 8 + q.v * (B.h - 16), 2.3, 0, TAU); ctx.fill(); }
    // HA 입자
    const rA = 6.8, rH = 4.2;
    m.pts.forEach((p, i) => {
      const h = mdHome(i), w = RM ? 0 : 1.3, ox = Math.sin(t * 1.3 + i * 1.7) * w, oy = Math.cos(t * 1.1 + i * 2.1) * w;
      const ux = Math.cos(p.ang), uy = Math.sin(p.ang), dH = 8.2 + 11 * p.ion, dA = -5.2 * p.ion;
      const ax = h.x + ox + ux * dA, ay = h.y + oy + uy * dA, hx = h.x + ox + ux * dH, hy = h.y + oy + uy * dH;
      if (p.ion > 0.05) D.glow((ax + hx) / 2, (ay + hy) / 2, 17, '#fbbf24', 0.5 * p.ion);
      D.sphere(ax, ay, rA, a.col, { gloss: false });
      ctx.fillStyle = '#fff'; ctx.strokeStyle = p.ion > 0.5 ? '#ef4444' : '#94a3b8'; ctx.lineWidth = p.ion > 0.5 ? 1.8 : 1; ctx.beginPath(); ctx.arc(hx, hy, rH, 0, TAU); ctx.fill(); ctx.stroke();
      if (p.ion > 0.5) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx - 2, hy); ctx.lineTo(hx + 2, hy); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx, hy + 2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.moveTo(ax - 2.6, ay); ctx.lineTo(ax + 2.6, ay); ctx.stroke(); }
    });
    // 오른쪽(또는 아래) 정보 패널
    const n = m.n, avg = mdAvg();
    const P = PHONE ? { x: MAIN.x + 12, y: B.y + B.h + 10, w: 440, h: MAIN.y + MAIN.h - (B.y + B.h) - 18 } : { x: B.x + B.w + 12, y: B.y, w: MAIN.x + MAIN.w - (B.x + B.w) - 26, h: B.h };
    D.roundRect(P.x, P.y, P.w, P.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const lh = PHONE ? 22 : 30;
    T(P.x + 12, P.y + 24, a.f + '  ' + CONC_TXT[m.ci], 16, INK, 'left', 800);
    const eq = a.strong ? a.f + ' → H⁺ + ' + a.an : a.f + ' ⇌ H⁺ + ' + a.an;
    T(P.x + 12, P.y + 24 + lh, eq, PHONE ? 14 : 15, '#5b21b6', 'left', 800);
    if (!a.strong) {
      // 정반응 · 역반응 화살표
      const ax0 = P.x + P.w - 66, ay = P.y + 20;
      D.arrow(ax0, ay - 5, ax0 + 46, ay - 5, { color: m.ff > 0.05 ? '#ef4444' : '#cbd5e1', width: 2 + 2 * m.ff, head: 9 }); D.arrow(ax0 + 46, ay + 6, ax0, ay + 6, { color: m.fb > 0.05 ? '#2563eb' : '#cbd5e1', width: 2 + 2 * m.fb, head: 9 });
    }
    T(P.x + 12, P.y + 24 + lh * 2 + 4, '이온화된 HA: ' + n + '개 / ' + NP + '개', PHONE ? 15 : 17, INK, 'left', 800);
    const ap_ = a.strong ? 100 : avg;
    T(P.x + 12, P.y + 24 + lh * 3 + 6, '평균 이온화도 α = ' + (a.strong ? '≈ 100' : (a.Ka && NP * mdAlpha() < 0.1 ? '0 (이론 ' + fmtAlpha(mdAlpha()) + ')' : ap_.toFixed(1))) + ' %', PHONE ? 14.5 : 16, '#b45309', 'left', 800);
    // α 막대 (0 ~ 100 % 눈금)
    const bx = P.x + 12, bw = P.w - 24, by = P.y + 24 + lh * 3 + (PHONE ? 14 : 20);
    D.roundRect(bx, by, bw, 12, 6); ctx.fillStyle = '#e9e5f5'; ctx.fill();
    const wv = bw * clamp(ap_ / 100, 0, 1); if (wv >= 0.6) { D.roundRect(bx, by, wv, 12, Math.min(6, wv / 2)); ctx.fillStyle = '#f59e0b'; ctx.fill(); }
    T(bx, by + 28, '0 %', 12.5, MUTED, 'left', 700); T(bx + bw, by + 28, '100 %', 12.5, MUTED, 'right', 700);
    if (!a.strong) {
      const x = weakX(a.Ka, Cc);
      T(P.x + 12, by + (PHONE ? 48 : 52), 'Ka = x²/(C−x) = ' + sci(x * x / (Cc - x), 2) + '  (변하지 않아요)', PHONE ? 12.5 : 13.5, '#14803f', 'left', 800);
    } else T(P.x + 12, by + (PHONE ? 48 : 52), '센 산은 거의 100 % 이온화 → Ka를 쓰지 않아요', PHONE ? 12.5 : 13.5, '#14803f', 'left', 800);
    // 아래 설명
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '이온화도 α = 이온화한 HA 수 / 처음 HA 수 × 100 (%)', 15, '#b45309', 'left', 800);
    let body;
    if (a.strong) body = '염산은 HA 100개가 거의 모두 H⁺와 Cl⁻로 갈라져 있어요. 그래서 같은 농도에서 H⁺ 농도가 가장 커요.';
    else if (m.k === 'hcn') body = 'HCN은 100개 중 하나도 이온화하지 않은 때가 대부분이에요(α ≈ ' + fmtAlpha(mdAlpha()) + ' %). 거의 모두 분자 상태로 평형을 이뤄요.';
    else body = '약산은 일부만 이온화하고 나머지는 분자 상태로 평형을 이뤄요. 이온화(→)와 재결합(←)이 계속 일어나서 이온화된 수가 ' + m.lo + '개와 ' + m.hi + '개 사이에서 오르내려요 (동적 평형).';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
    if (!a.strong && m.k !== 'hcn') textBlock(INFO.x + 16, INFO.y + (PHONE ? 150 : 116), INFO.w - 32, m.k === 'ch3' ? '농도를 0.10 M → 0.010 M로 묽혀 보세요. 이온화도 α는 커지지만 Ka는 그대로예요.' : '같은 농도에서 Ka가 큰 산일수록 이온화도 α가 커요.', 14, '#5b21b6', 20, 800);
  }

  /* ============ ③ Ka로 순위 ============ */
  const rkG = () => {
    if (PHONE) return { tb: { x: MAIN.x + 12, y: MAIN.y + 38, w: 440, rh: 28 }, eq: { x: MAIN.x + 12, y: MAIN.y + 240, w: 440, h: 64 }, ax: { x: MAIN.x + 12, y: MAIN.y + 310, w: 440, h: 108 } };
    return { tb: { x: MAIN.x + 14, y: MAIN.y + 40, w: 340, rh: 32 }, eq: { x: MAIN.x + 366, y: MAIN.y + 40, w: 396, h: 102 }, ax: { x: MAIN.x + 366, y: MAIN.y + 152, w: 396, h: 178 } };
  };
  S.rk = { k: 'ch3', bx: {}, init: false, ordPop: 0, rowOk: false };
  const kaX = (ka, ax) => ax.x + 24 + (Math.log10(ka) + 10) / 7 * (ax.w - 48);
  const rkRowRect = (i) => { const G = rkG(); return { x: G.tb.x, y: G.tb.y + 30 + i * G.tb.rh, w: G.tb.w, h: G.tb.rh - 2 }; };
  function rkEnter() { const G = rkG(); RKK.forEach((k) => { S.rk.bx[k] = G.ax.x + 24; }); S.rk.init = true; }
  function stepRank(dt) {
    const G = rkG(); if (!S.rk.init) rkEnter();
    RKK.forEach((k) => { S.rk.bx[k] = ap(S.rk.bx[k], kaX(AC[k].Ka, G.ax), dt, 4); });
  }
  function drawRank(t) {
    const G = rkG(), sel = S.rk.k, a0 = AC[sel], ord = rkOrd ? rkOrd.order : [];
    T(14, 26, '📊 Ka가 클수록 센 산이에요', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 표
    const tb = G.tb, c1 = tb.x + 14, c2 = tb.x + (PHONE ? 170 : 150), c3 = tb.x + tb.w - 12;
    T(c1 + 30, tb.y + 20, '산 (0.10 M)', 13.5, MUTED, 'left', 800); T(c2 + 26, tb.y + 20, 'Ka', 13.5, MUTED, 'left', 800); T(c3, tb.y + 20, 'pKa', 13.5, MUTED, 'right', 800);
    RK_SHOW.forEach((k, i) => {
      const r = rkRowRect(i), a = AC[k], on = sel === k;
      D.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fillStyle = on ? 'rgba(139,92,246,.14)' : (i % 2 ? '#faf8ff' : '#fff'); ctx.fill(); if (on) { ctx.strokeStyle = PUR; ctx.lineWidth = 2; ctx.stroke(); }
      const oi = ord.indexOf(k);
      D.sphere(r.x + 17, r.y + r.h / 2, 9, a.col, { gloss: false });
      if (oi >= 0) { ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.arc(r.x + 17, r.y + r.h / 2, 9, 0, TAU); ctx.fill(); T(r.x + 17, r.y + r.h / 2 + 5, String(oi + 1), 13, '#fff', 'center', 800); }
      T(c1 + 30, r.y + r.h / 2 + 6, a.f, 16, INK, 'left', 800); T(c2 + 26, r.y + r.h / 2 + 6, sci(a.Ka, 2), PHONE ? 14 : 15, INK, 'left', 800); T(c3, r.y + r.h / 2 + 6, a.pKa.toFixed(2), 15, MUTED, 'right', 800);
    });
    // 평형 막대 (0.10 M에서 이온으로 갈라진 비율)
    const e = G.eq, al = alphaOf(sel, 0.10);
    D.roundRect(e.x, e.y, e.w, e.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(e.x + 12, e.y + 22, a0.f + ' ⇌ H⁺ + ' + a0.an + '  (0.10 M)', PHONE ? 13.5 : 14.5, '#5b21b6', 'left', 800);
    const bx = e.x + 12, bw = e.w - 24, by = e.y + (PHONE ? 28 : 34), bh = PHONE ? 14 : 18;
    D.roundRect(bx, by, bw, bh, 5); ctx.fillStyle = a0.col; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    const iw = bw * al; if (iw >= 0.5) { D.roundRect(bx + bw - iw, by, iw, bh, Math.min(5, iw / 2)); ctx.fillStyle = '#f59e0b'; ctx.fill(); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; D.roundRect(bx, by, bw, bh, 5); ctx.stroke();
    T(bx + 6, by + (PHONE ? 11 : 13.5), '분자 HA', 12.5, INK, 'left', 800, { alpha: 0.9 }); T(bx + bw, by + bh + (PHONE ? 14 : 17), '이온 H⁺ + ' + a0.an + ' ← 오른쪽', 12.5, '#b45309', 'right', 800);
    T(bx, by + bh + (PHONE ? 14 : 17), 'α = ' + fmtAlpha(al) + ' %', 13.5, INK, 'left', 800);
    if (!PHONE) T(bx, by + bh + 36 + 2, al < 0.005 ? '이온 쪽이 너무 짧아서 거의 보이지 않아요.' : 'Ka가 클수록 평형이 이온 쪽(오른쪽)에 치우쳐 있어요.', 12.5, MUTED, 'left', 700);
    // 로그 눈금
    const ax = G.ax;
    D.roundRect(ax.x, ax.y, ax.w, ax.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(ax.x + 12, ax.y + 20, 'Ka를 로그 눈금에 놓으면', 13.5, '#5b21b6', 'left', 800); T(ax.x + ax.w - 12, ax.y + 20, '센 산 →', 13.5, '#b45309', 'right', 800);
    const ay = ax.y + ax.h - (PHONE ? 28 : 36);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax.x + 14, ay); ctx.lineTo(ax.x + ax.w - 14, ay); ctx.stroke();
    for (let e10_ = -10; e10_ <= -3; e10_++) { const px = ax.x + 24 + (e10_ + 10) / 7 * (ax.w - 48); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, ay - 4); ctx.lineTo(px, ay + 5); ctx.stroke(); if (!PHONE || e10_ % 1 === 0) T(px, ay + 20, '10' + supStr(e10_), PHONE ? 11.5 : 12.5, MUTED, 'center', 700); }
    const sorted = RKK.slice().sort((p, q) => AC[p].Ka - AC[q].Ka);
    const tiers = PHONE ? 2 : 4, tierH = PHONE ? 20 : 26;
    sorted.forEach((k, i) => {
      const px = S.rk.bx[k], a = AC[k], tier = i % tiers, ly = ay - 20 - tier * tierH - 8, on = sel === k;
      ctx.strokeStyle = on ? PUR : 'rgba(100,116,139,.55)'; ctx.lineWidth = on ? 2.2 : 1.2; ctx.beginPath(); ctx.moveTo(px, ay); ctx.lineTo(px, ly + 6); ctx.stroke();
      D.sphere(px, ay, on ? 8.5 : 7, a.col, { gloss: false, outline: on ? PUR : '#fff', outlineWidth: 1.6 });
      D.label(px, ly, a.f, { bg: on ? PUR : a.col, size: PHONE ? 12.5 : 13, pad: 6 });
    });
    // 설명
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, 'Ka가 클수록 센 산 · pKa = −log Ka 가 작을수록 센 산', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, 'Ka = [H⁺][A⁻] / [HA] (물은 식에서 생략). 같은 온도에서 Ka는 산마다 정해진 값이에요. Ka가 클수록 평형이 이온 쪽으로 치우쳐서 이온화도가 크고 더 센 산이에요. Ka는 10의 거듭제곱으로 넓게 퍼져 있어서 로그 눈금으로 나타내요.', 14.5, INK, 21, 700);
  }

  /* ============ ④ 짝산·짝염기 ============ */
  const PQ = [
    { k: 'hf', acid: 'HF', base: 'F⁻', Ka: 6.8e-4, Kb: 1.5e-11, pKa: 3.17 },
    { k: 'ch3', acid: 'CH₃COOH', base: 'CH₃COO⁻', Ka: 1.8e-5, Kb: 5.6e-10, pKa: 4.74 },
    { k: 'h2co3', acid: 'H₂CO₃', base: 'HCO₃⁻', Ka: 4.3e-7, Kb: 2.3e-8, pKa: 6.37 },
    { k: 'hcn', acid: 'HCN', base: 'CN⁻', Ka: 6.2e-10, Kb: 1.6e-5, pKa: 9.21 },
    { k: 'nh4', acid: 'NH₄⁺', base: 'NH₃', Ka: 5.6e-10, Kb: 1.8e-5, pKa: 9.25 },
    { k: 'mnh', acid: 'CH₃NH₃⁺', base: 'CH₃NH₂', Ka: 2.3e-11, Kb: 4.4e-4, pKa: 10.64 },
  ];
  const pqOf = (k) => PQ.find((q) => q.k === k);
  const PQ_COL = { hf: '#14b8a6', ch3: '#ec4899', h2co3: '#a855f7', hcn: '#6366f1', nh4: '#3b82f6', mnh: '#0ea5e9' };
  S.pq = { k: 'ch3', th: new SciSim.Spring(0, { stiffness: 60, damping: 9 }), pop: 0 };
  const pqTilt = (q) => clamp((7 - q.pKa) * 0.05, -0.2, 0.2);
  const kbRowOk = [false, false];
  function pqMask(k, side) { // 계산 미션 중에는 답이 되는 값을 가려요
    if (S.gate !== 'calc') return false;
    return (k === 'ch3' && side === 'Kb' && !kbRowOk[0]) || (k === 'nh4' && side === 'Ka' && !kbRowOk[1]);
  }
  function stepPair(dt) {
    const p = S.pq; p.th.target = pqTilt(pqOf(p.k)); p.th.update(dt); p.pop = Math.max(0, p.pop - dt);
  }
  function drawPair(t) {
    const p = S.pq, q = pqOf(p.k);
    T(14, 26, '⚖️ 센 산의 짝염기는 약하고, 약한 산의 짝염기는 상대적으로 세요', PHONE ? 12.5 : 16, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const BAL = PHONE ? { x: MAIN.x + 12, y: MAIN.y + 36, w: 440, h: 228 } : { x: MAIN.x + 14, y: MAIN.y + 38, w: 430, h: 292 };
    D.roundRect(BAL.x, BAL.y, BAL.w, BAL.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cx = BAL.x + BAL.w / 2, piv = { x: cx, y: BAL.y + (PHONE ? 62 : 74) }, L = Math.min(160, BAL.w * 0.37), th = p.th.value;
    const pl = { x: cx - L * Math.cos(th), y: piv.y + L * Math.sin(th) }, pr = { x: cx + L * Math.cos(th), y: piv.y - L * Math.sin(th) };
    // 받침
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(cx, piv.y); ctx.lineTo(cx - 26, BAL.y + BAL.h - 14); ctx.lineTo(cx + 26, BAL.y + BAL.h - 14); ctx.closePath(); ctx.fill();
    D.roundRect(cx - 62, BAL.y + BAL.h - 16, 124, 10, 5); ctx.fillStyle = '#64748b'; ctx.fill();
    // 저울대
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pr.x, pr.y); ctx.stroke();
    D.sphere(cx, piv.y, 8, '#334155', { gloss: false });
    const pan = (P, who, label, form, kText, col, role) => {
      const sl = PHONE ? 66 : 82, py = P.y + sl;
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x - 54, py); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + 54, py); ctx.stroke();
      D.roundRect(P.x - 62, py, 124, 9, 4); ctx.fillStyle = '#64748b'; ctx.fill();
      D.shadow(() => { D.sphere(P.x, py - 24, 24, col, { gloss: true }); }, { blur: 6, y: 3 });
      T(P.x, py - 18, form, form.length > 6 ? 12.5 : 15, '#fff', 'center', 800, { stroke: 'rgba(30,41,80,.5)', strokeWidth: 3 });
      T(P.x, py + 28, role, 13.5, role === '산' ? '#c2410c' : '#1d4ed8', 'center', 800);
      T(P.x, py + 48, kText, PHONE ? 13.5 : 15, INK, 'center', 800);
    };
    const kaT = pqMask(q.k, 'Ka') ? 'Ka = ?' : 'Ka = ' + sci(q.Ka, 2), kbT = pqMask(q.k, 'Kb') ? 'Kb = ?' : 'Kb = ' + sci(q.Kb, 2);
    pan(pl, 'L', '산', q.acid, kaT, PQ_COL[q.k], '산');
    pan(pr, 'R', '짝염기', q.base, kbT, C.mix(PQ_COL[q.k], '#94a3b8', 0.45), '짝염기');
    // 이름표
    if (!PHONE) { T(BAL.x + 14, BAL.y + 24, '산의 세기 (Ka)', 13.5, '#c2410c', 'left', 800); T(BAL.x + BAL.w - 14, BAL.y + 24, '짝염기의 세기 (Kb)', 13.5, '#1d4ed8', 'right', 800); }
    else { T(BAL.x + 10, BAL.y + 20, '산 Ka', 13, '#c2410c', 'left', 800); T(BAL.x + BAL.w - 10, BAL.y + 20, '짝염기 Kb', 13, '#1d4ed8', 'right', 800); }
    // 수치 패널
    const P = PHONE ? { x: MAIN.x + 12, y: BAL.y + BAL.h + 8, w: 440, h: MAIN.y + MAIN.h - (BAL.y + BAL.h) - 16 } : { x: BAL.x + BAL.w + 12, y: BAL.y, w: MAIN.x + MAIN.w - (BAL.x + BAL.w) - 26, h: BAL.h };
    D.roundRect(P.x, P.y, P.w, P.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const lh = PHONE ? 22 : 30; let yy = P.y + 24;
    T(P.x + 12, yy, q.acid + ' / ' + q.base, 15, INK, 'left', 800); yy += lh;
    T(P.x + 12, yy, 'pKa = ' + q.pKa.toFixed(2), 14.5, MUTED, 'left', 800); yy += lh;
    T(P.x + 12, yy, 'Ka × Kb = Kw = 1.0×10⁻¹⁴', PHONE ? 14 : 14.5, '#5b21b6', 'left', 800); yy += lh;
    const strongAcid = q.Ka > q.Kb;
    if (!PHONE) {
      yy += 4; yy += textBlock(P.x + 12, yy, P.w - 24, strongAcid ? 'Ka가 Kb보다 커서 이 쌍은 산 쪽이 더 세요. 짝염기는 약해요.' : 'Ka가 Kb보다 작아서 산은 약하고, 짝염기가 상대적으로 세요.', 14, INK, 20, 700);
      yy += 8; textBlock(P.x + 12, yy, P.w - 24, '반올림한 값을 곱하면 아주 조금 다를 수 있어요.', 12.5, MUTED, 17, 700);
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, S.gate === 'base' ? '염기의 세기는 Kb로 비교해요 (Kb가 클수록 센 염기)' : '산–짝염기 쌍: Ka × Kb = Kw', 15, '#b45309', 'left', 800);
    if (S.gate === 'base') {
      const bs = [{ n: 'NH₃', kb: 1.8e-5, c: '#3b82f6' }, { n: 'CH₃NH₂', kb: 4.4e-4, c: '#0ea5e9' }];
      const bx = INFO.x + 16, bw = INFO.w - 32 - 200;
      bs.forEach((b, i) => { const y = INFO.y + 66 + i * 30, w = bw * (Math.log10(b.kb) + 6) / 3 * 0.9; T(bx, y + 6, b.n, 14.5, INK, 'left', 800); D.roundRect(bx + 80, y - 8, Math.max(2, w), 16, 6); ctx.fillStyle = b.c; ctx.fill(); T(bx + 88 + Math.max(2, w), y + 5, 'Kb = ' + sci(b.kb, 2) + '  (로그 눈금 길이)', 13.5, INK, 'left', 800); });
      textBlock(INFO.x + 16, INFO.y + 130, INFO.w - 32, '막대 길이는 log Kb에 비례해요.', 12.5, MUTED, 17, 700);
    } else textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, 'H⁺를 준 산(HA)과 H⁺를 받은 짝염기(A⁻)는 Ka × Kb = Kw (25 °C에서 1.0×10⁻¹⁴)를 만족해요. 그래서 한쪽이 클수록 다른 쪽은 작아져요: 센 산 → 약한 짝염기, 약한 산 → 비교적 센 짝염기. 쌍을 바꿔 가며 저울이 어느 쪽으로 기우는지 보세요.', 14.5, INK, 21, 700);
  }

  function onLeave() {}
  /* ---------- 포인터 (탭) ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'meas') { const g = msG(); for (let i = 0; i < 4; i++) { if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 6 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 50) { msSelect(MSK[i]); return false; } } }
      else if (S.mode === 'rank') {
        for (let i = 0; i < RK_SHOW.length; i++) { const r = rkRowRect(i); if (pointInRect(p, r)) { rkPick(RK_SHOW[i]); return false; } }
        const G = rkG(); RKK.forEach((k) => { if (Math.hypot(p.x - S.rk.bx[k], p.y - (G.ax.y + G.ax.h - (PHONE ? 28 : 36))) <= 12) rkPick(k); });
      }
      return false;
    },
    hover(p) {
      if (S.mode === 'meas') { const g = msG(); for (let i = 0; i < 4; i++) if (Math.abs(p.x - g.xs[i]) <= g.bw / 2 + 6 && p.y >= g.by - 8 && p.y <= g.by + g.bh + 50) return 'pointer'; }
      if (S.mode === 'rank') { for (let i = 0; i < RK_SHOW.length; i++) if (pointInRect(p, rkRowRect(i))) return 'pointer'; }
      return 'default';
    },
  });
  function rkPick(k) { S.rk.k = k; Sound.tick(); updateCtl(); }

  /* ---------- UI 요소 ---------- */
  const prOrd = mkOrder($('#prList'), MSK, (k) => AC[k].f, () => updateCtl());
  const msOrd = mkOrder($('#msOrd'), MSK, (k) => AC[k].f, () => updateCtl());
  const rkOrd = mkOrder($('#rkOrd'), RK_SHOW, (k) => AC[k].f + ' (Ka ' + sci(AC[k].Ka, 2) + ')', () => updateCtl());
  makeChips($('#msSel'), MSK.map((k) => [k, '0.10 M ' + AC[k].f]), (v) => msSelect(v));
  makeChips($('#mdSel'), MDK.map((k) => [k, AC[k].f]), (v) => mdSet(v, S.md.ci));
  makeChips($('#rkSel'), RK_SHOW.map((k) => [k, AC[k].f]), (v) => { S.rk.k = v; updateCtl(); });
  makeChips($('#pqSel'), PQ.map((q) => [q.k, q.acid + ' / ' + q.base]), (v) => { S.pq.k = v; S.pq.pop = 0.4; updateCtl(); });
  $('#bMeasure').addEventListener('click', msMeasure);
  $('#bPred').addEventListener('click', () => { if (prOrd.order.length < 4) { showHint('네 용액을 모두 눌러 순서를 정해 주세요.', 2600); Sound.fail(); return; } Sound.success(); S.ms.pred = prOrd.order.slice(); prOrd.lock(true); updateCtl(); });
  $('#bOrdClr').addEventListener('click', () => { Sound.click(); msOrd.clear(); updateCtl(); });
  $('#bRkClr').addEventListener('click', () => { Sound.click(); rkOrd.clear(); updateCtl(); });
  const alRows = [mkRow($('#alRows'), { label: '0.10 M CH₃COOH의 이온화도 α', ans: 1.3, tol: 0.8, unit: '%', ph: '0.0' }, () => updateCtl()), mkRow($('#alRows'), { label: '0.010 M CH₃COOH의 이온화도 α', ans: 4.2, tol: 0.8, unit: '%', ph: '0.0' }, () => updateCtl())];
  const rtRow = mkRow($('#rtRows'), { label: 'HF의 Ka는 CH₃COOH의 Ka의 약 몇 배일까요?', ans: 38, tol: 1.5, unit: '배', ph: '0' }, () => updateCtl());
  const kbRows = [mkRow($('#kbRows'), { label: 'CH₃COO⁻의 Kb (Ka(CH₃COOH) = 1.8×10⁻⁵)', sci: true, ans: 5.6e-10, rel: 0.03 }, () => updateCtl()), mkRow($('#kbRows'), { label: 'NH₄⁺의 Ka (Kb(NH₃) = 1.8×10⁻⁵)', sci: true, ans: 5.6e-10, rel: 0.03 }, () => updateCtl())];
  const selBase = $('#selBase');
  selBase.addEventListener('change', () => { Sound.click(); selBase.classList.remove('bad', 'ok'); updateCtl(); });
  const sConc = $('#sConc');
  sConc.addEventListener('input', () => { mdSet(S.md.k, +sConc.value); });
  $('#cMinus').addEventListener('click', () => { Sound.tick(); mdSet(S.md.k, S.md.ci - 1); });
  $('#cPlus').addEventListener('click', () => { Sound.tick(); mdSet(S.md.k, S.md.ci + 1); });

  function uiExtra() {
    if (typeof rtRow === 'undefined') return;
    kbRowOk[0] = kbRows[0].ok; kbRowOk[1] = kbRows[1].ok;
    markChips($('#msSel'), S.ms.cur, S.ms.done);
    const g = game && game.free;
    $('#predBox').hidden = !!S.ms.pred || S.mode !== 'meas' || !!g;
    $('#bPred').disabled = prOrd.order.length < 4;
    $('#bMeasure').disabled = !S.ms.cur || !(S.ms.pred || g) || S.ms.state === 'move' || S.ms.state === 'dip' || S.ms.state === 'settle';
    markChips($('#mdSel'), S.md.k, S.md.seen && null);
    $('#oConc').textContent = CONC_TXT[S.md.ci]; sConc.value = S.md.ci; $('#cMinus').disabled = S.md.ci <= 0; $('#cPlus').disabled = S.md.ci >= 2;
    $('#cNote').textContent = AC[S.md.k].strong ? '염산은 묽혀도 거의 100 % 이온화해요.' : S.md.ci === 0 ? '+ 단추를 누르면 용액이 묽어져요.' : '묽어질수록 물 분자(연한 점)가 많아지고 이온화도가 변해요.';
    const rd = {}; RKK.forEach((k) => { rd[k] = false; });
    markChips($('#rkSel'), S.rk.k, rd);
    markChips($('#pqSel'), S.pq.k);
  }

  function readouts() {
    const m = S.mode;
    if (m === 'meas') { const k = S.ms.cur, rd = S.ms.state === 'read'; setRead('선택한 용액', k ? '0.10 M ' + AC[k].f : '—', 'pH', rd ? AC[k].ph.toFixed(2) : '—', '상대 전류 (HCl = 100)', rd ? fmtRel(relCur(AC[k].ph)) : '—'); }
    else if (m === 'model') { const a = AC[S.md.k]; setRead('이온화된 HA', S.md.n + '개 / ' + NP + '개', '평균 α', (a.strong ? '≈ 100' : S.md.lo === 0 && NP * mdAlpha() < 0.1 ? '≈ 0' : mdAvg().toFixed(1)) + ' %', 'Ka', a.strong ? '쓰지 않음' : sci(a.Ka, 2)); }
    else if (m === 'rank') { const a = AC[S.rk.k]; setRead('선택한 산', a.f, 'Ka', sci(a.Ka, 2), 'pKa', a.pKa.toFixed(2)); }
    else { const q = pqOf(S.pq.k); setRead(q.acid + ' / ' + q.base, '짝산–짝염기', 'Ka (산)', pqMask(q.k, 'Ka') ? '?' : sci(q.Ka, 2), 'Kb (짝염기)', pqMask(q.k, 'Kb') ? '?' : sci(q.Kb, 2)); }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '같은 농도 비교: pH와 전류', short: '같은 농도 비교', icon: '🌡️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 농도가 같은 염산과 식초(아세트산)는 같은 정도로 신가? 산의 “센 정도”를 숫자 하나로 나타낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 산은 H⁺를 주는 입자라는 것을 배웠어요. <b>화학 평형 · pH</b> 단원에서는 pH = −log[H⁺]를 배웠고, 아세트산이 약산이라는 것도 만났어요. 이번에는 산마다 H⁺를 내놓는 정도를 비교해요.</div>' +
        '<p>0.10 M HCl, HCOOH(폼산), CH₃COOH(아세트산), HCN의 <b>pH</b>와 <b>전류</b>를 측정해요. 측정하기 전에 이온이 많을 것 같은 순서를 먼저 예측해 보세요. (보안경과 장갑 착용, 폐액은 폐수 처리 기준에 따라 처리)</p>',
      features: ['meas'],
      setup() { S.gate = ''; msReset(); prOrd.lock(false); prOrd.clear(); msOrd.clear(); setScene('meas'); },
      recap: '처음 농도가 같아도 산마다 H⁺ 농도가 달라요. pH가 작을수록 H⁺가 많고, 이온이 많을수록 전류가 세요. 이온화되는 정도가 산마다 달라서예요.',
      summary: '<ul><li>0.10 M 수용액의 pH: HCl <b>1.00</b>, HCOOH <b>2.37</b>, CH₃COOH <b>2.87</b>, HCN <b>5.10</b></li><li>[H⁺] = 10^(−pH): 1.0×10⁻¹ · 4.3×10⁻³ · 1.3×10⁻³ · 7.9×10⁻⁶ M</li><li>이온이 많은 순서(전류가 센 순서): HCl &gt; HCOOH &gt; CH₃COOH &gt; HCN</li><li>같은 농도여도 <b>이온화되는 정도</b>가 산마다 달라요.</li></ul>',
      missions: [
        {
          title: '예측하고 네 용액 측정하기',
          goal: '이온이 많을 것 같은 <b>순서를 예측</b>해 기록한 뒤, 네 용액의 pH와 전류를 모두 측정하세요.',
          hint: '오른쪽의 “예측” 목록에서 네 용액을 차례로 누르고 “예측 기록하기”를 눌러요. 그다음 용액 단추를 누르거나 그림의 비커를 눌러요.',
          setup() { S.gate = ''; setScene('meas'); },
          check: () => !!S.ms.pred && msCount() === 4, hold: 0.6,
          status: () => '예측 ' + mark(!!S.ms.pred) + ' &nbsp; 측정 ' + msCount() + ' / 4 ' + mark(msCount() === 4),
          explain: 'HCl 1.00, HCOOH 2.37, CH₃COOH 2.87, HCN 5.10. 처음 농도는 모두 0.10 M인데 pH가 이렇게 달라요. pH가 작을수록 H⁺ 농도가 커요. 예측한 순서와 비교해 보세요.',
        },
        {
          title: '측정 결과로 순서 매기기', manual: true,
          goal: '측정한 결과를 보고, <b>이온이 많은(전류가 센)</b> 용액부터 순서대로 눌러요.',
          hint: 'pH가 작을수록 [H⁺]가 커요. 가장 작은 pH부터 차례로 눌러요.',
          setup() { S.gate = 'ord'; msOrd.clear(); setScene('meas'); updateCtl(); },
          check() {
            const o = msOrd.order; if (o.length < 4) return '네 용액을 모두 눌러 주세요. (' + o.length + ' / 4)';
            const t = measuredOrder(); for (let i = 0; i < 4; i++) if (o[i] !== t[i]) return (i + 1) + '번째가 달라요. pH 값을 비교해 보세요. pH가 작을수록 H⁺가 많아서 이온이 많아요.';
            return true;
          },
          status: () => '고른 용액 ' + msOrd.order.length + ' / 4',
          explain: '이온이 많은 순서는 HCl(pH 1.00) &gt; HCOOH(2.37) &gt; CH₃COOH(2.87) &gt; HCN(5.10)이에요. 이 순서는 전류가 센 순서와도 같아요.',
        },
        {
          type: 'quiz', title: '농도가 같으면 H⁺ 농도도 같을까?',
          goal: '“농도가 같은 산 수용액은 H⁺ 농도도 같다.” 이 설명은 맞을까요?',
          setup() { S.gate = ''; setScene('meas'); },
          choices: ['맞아요. 농도가 같으면 이온의 수도 같아요', '틀려요. 산마다 이온화되는 정도가 달라서 H⁺ 농도가 달라요', '틀려요. 산의 부피가 서로 달라서 그래요', '맞아요. 다만 측정 오차 때문에 값이 달라 보여요'],
          answer: 1,
          feedback: ['처음 농도(넣은 산의 몰수)와 H⁺ 농도는 달라요. 일부만 이온화하는 산이 있어요.', '', '네 용액의 부피와 농도는 모두 같게 만들었어요.', '오차가 아니라 산마다 이온화되는 정도가 달라서 생기는 큰 차이예요.'],
          explain: '처음 농도가 같아도 이온화하는 비율이 달라요. HCl은 거의 모두 이온화하지만 HCN은 아주 일부만 이온화해요. 다음 단계에서 입자 모형으로 확인해요.',
        },
      ],
    },
    {
      title: '이온화 모형: 일부만 이온이 되는 약산', short: '이온화 모형', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 농도의 산도 H⁺ 농도가 달랐어요. 입자 모형에서 HA 100개를 놓고 <b>몇 개가 이온이 되는지</b> 세어 보아요.</div>' +
        '<p>HA 분자가 H⁺와 A⁻로 갈라지고(→) 다시 합쳐지는(←) 일이 계속 일어나는 <b>동적 평형</b>이에요. 이온화한 비율이 <b>이온화도 α</b>예요.</p>',
      features: ['model'],
      setup() { S.gate = ''; mdSet('ch3', 0); setScene('model'); },
      recap: '이온화도 α = 이온화한 HA의 수 / 처음 HA의 수예요. 센 산은 거의 100 %, 약산은 일부만 이온화해서 평형을 이뤄요. 묽으면 α는 커지지만 Ka는 그대로예요.',
      summary: '<ul><li>약산 HA ⇌ H⁺ + A⁻ : 이온화(→)와 재결합(←)이 계속 일어나는 <b>동적 평형</b></li><li><b>이온화도 α</b> = 이온화한 양 / 처음 양 (×100 %)</li><li>0.10 M CH₃COOH: 100개 중 1~2개 이온화, α ≈ <b>1.3 %</b> → 0.010 M: α ≈ <b>4.2 %</b></li><li>묽을수록 α는 커지지만 <b>Ka는 온도가 같으면 변하지 않아요</b>.</li><li>HCl 같은 센 산은 거의 100 % 이온화 → Ka를 쓰지 않아요.</li></ul>',
      missions: [
        {
          title: '이온화도 α 구하기',
          goal: 'CH₃COOH 상자에서 이온화된 HA 수를 보고, <b>0.10 M</b>과 <b>0.010 M</b>일 때의 이온화도 α(%)를 구하세요.',
          hint: '이온화된 수가 오르내려요. 평균 이온화도 α를 읽으면 돼요. 0.10 M에서는 1과 2 사이(약 1.3), 0.010 M에서는 4와 5 사이(약 4.2)예요. 농도 슬라이더의 + 단추로 묽혀요.',
          setup() { S.gate = 'alpha'; alRows.forEach((r) => r.clear()); mdSet('ch3', 0); setScene('model'); updateCtl(); },
          check: () => alRows[0].ok && alRows[1].ok, hold: 0.5,
          status: () => '0.10 M ' + mark(alRows[0].ok) + ' &nbsp; 0.010 M ' + mark(alRows[1].ok),
          explain: '0.10 M에서는 HA 100개 중 약 1.3개(α ≈ 1.3 %), 0.010 M에서는 약 4.2개(α ≈ 4.2 %)가 이온화해요. 묽을수록 이온화도가 커져요.',
        },
        {
          type: 'quiz', title: '묽히면 α와 Ka는?',
          goal: 'CH₃COOH 용액을 0.10 M에서 0.010 M로 묽힐 때, <b>이온화도 α와 이온화 상수 Ka</b>는 어떻게 될까요?',
          setup() { S.gate = ''; mdSet('ch3', 1); setScene('model'); },
          choices: ['α와 Ka가 모두 커져요', 'α는 커지지만 Ka는 변하지 않아요', 'α는 변하지 않고 Ka만 작아져요', 'α와 Ka 모두 변하지 않아요'],
          answer: 1,
          feedback: ['Ka는 온도가 같으면 농도와 관계없이 일정한 값이에요.', '', 'α도 농도에 따라 변해요. 묽을수록 커졌어요.', '상자에서 이온화된 수가 늘어난 것을 봤지요. α는 변해요.'],
          explain: 'Ka = x²/(C−x)에서 C가 작아지면 x/C가 커져야 같은 Ka가 유지돼요. 그래서 α는 커지고 Ka는 일정해요. Ka는 농도가 아니라 <b>온도</b>에만 영향을 받아요.',
        },
      ],
    },
    {
      title: 'Ka로 순위: 산의 세기를 숫자로', short: 'Ka로 순위', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 조건에서도 산마다 이온화되는 정도가 달랐고, Ka는 농도와 상관없이 일정했어요. 그러면 <b>Ka 값 하나</b>로 산의 세기를 비교할 수 있겠지요?</div>' +
        '<p>Ka = [H⁺][A⁻] / [HA]는 평형 상수(화학 평형 단원의 K)와 같은 꼴이에요. 물은 상수로 보고 식에서 빼요. Ka가 크면 평형이 이온 쪽으로 치우쳐서 센 산이에요. 그리고 <b>pKa = −log Ka</b>도 써요.</p>',
      features: ['rank'],
      setup() { S.gate = ''; rkOrd.clear(); rkEnter(); setScene('rank'); },
      recap: 'Ka가 클수록(pKa가 작을수록) 센 산이에요. Ka는 10의 거듭제곱으로 넓게 퍼져 있어서 로그 눈금이 편해요. Ka의 비로 세기의 차이도 어림할 수 있어요.',
      summary: '<ul><li>Ka (25 °C): HF 6.8×10⁻⁴ (pKa 3.17) &gt; HCOOH 1.8×10⁻⁴ (3.74) &gt; CH₃COOH 1.8×10⁻⁵ (4.74) &gt; H₂CO₃ 4.3×10⁻⁷ (6.37, 1단계) &gt; HCN 6.2×10⁻¹⁰ (9.21) &gt; NH₄⁺ 5.6×10⁻¹⁰ (9.25)</li><li>Ka가 클수록 평형이 이온 쪽으로 치우쳐 있어요 → 센 산, pKa는 작아요.</li><li>HF의 Ka / CH₃COOH의 Ka = 6.8×10⁻⁴ / 1.8×10⁻⁵ ≈ <b>38배</b></li></ul>',
      missions: [
        {
          title: '산 6개를 센 순서로', manual: true,
          goal: '여섯 산을 <b>센 산부터</b> 차례로 눌러요. (표의 Ka를 비교해요)',
          hint: 'Ka가 클수록 센 산이에요. 10⁻⁴가 10⁻⁵보다 커요. 지수가 큰 쪽(덜 음수인 쪽)이 큰 수예요.',
          setup() { S.gate = 'rord'; rkOrd.clear(); setScene('rank'); updateCtl(); },
          check() {
            const o = rkOrd.order; if (o.length < 6) return '여섯 산을 모두 눌러 주세요. (' + o.length + ' / 6)';
            for (let i = 0; i < 6; i++) if (o[i] !== RK_TRUE[i]) return (i + 1) + '번째가 달라요. Ka 값을 다시 비교해 보세요. Ka가 클수록 센 산이에요.';
            return true;
          },
          status: () => '고른 산 ' + rkOrd.order.length + ' / 6',
          explain: '센 순서: ' + ordNames(RKK.slice().sort((a, b) => AC[b].Ka - AC[a].Ka)) + '. HCN과 NH₄⁺는 Ka가 거의 비슷하지만 6.2×10⁻¹⁰이 5.6×10⁻¹⁰보다 조금 커요.',
        },
        {
          title: 'HF는 CH₃COOH보다 몇 배 센 산?',
          goal: 'HF의 Ka(6.8×10⁻⁴)는 CH₃COOH의 Ka(1.8×10⁻⁵)의 <b>약 몇 배</b>인지 정수로 구하세요.',
          hint: '두 값의 비를 구해요. 6.8×10⁻⁴ ÷ 1.8×10⁻⁵ = (6.8 ÷ 1.8) × 10 이에요.',
          setup() { S.gate = 'ratio'; rtRow.clear(); setScene('rank'); updateCtl(); },
          check: () => rtRow.ok, hold: 0.5,
          status: () => 'Ka 비 ' + mark(rtRow.ok),
          explain: '6.8×10⁻⁴ / 1.8×10⁻⁵ = (6.8/1.8) × 10 ≈ 3.8 × 10 = <b>약 38배</b>. 같은 농도에서 HF가 CH₃COOH보다 이온화가 훨씬 더 잘 일어나요.',
        },
        {
          type: 'quiz', title: 'Ka와 pKa',
          goal: 'Ka가 <b>가장 큰</b> 산의 pKa는 어떨까요?',
          setup() { S.gate = ''; setScene('rank'); },
          choices: ['pKa가 가장 커요', 'pKa가 가장 작아요', 'pKa는 항상 7이에요', 'Ka와 pKa는 관계가 없어요'],
          answer: 1,
          feedback: ['pKa = −log Ka 이므로 Ka가 클수록 pKa는 작아져요.', '', 'pKa는 산마다 달라요. 7은 중성의 pH예요.', 'pKa = −log Ka 로 정의돼요.'],
          explain: 'pKa = −log Ka 이므로 <b>Ka가 클수록 pKa는 작아요</b>. 표에서 HF의 pKa가 3.17로 가장 작고 가장 센 산이에요.',
        },
      ],
    },
    {
      title: '짝산·짝염기: Ka × Kb = Kw', short: '짝산·짝염기', icon: '⚖️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 차시에서</b> 산이 H⁺를 잃으면 짝염기가 된다고 배웠어요. 그러면 산의 세기와 짝염기의 세기는 어떤 관계일까요?</div>' +
        '<p>염기의 세기는 <b>Kb</b>로 나타내요 (B + H₂O ⇌ BH⁺ + OH⁻, Kb = [BH⁺][OH⁻] / [B]). 짝산–짝염기 쌍에서는 <b>Ka × Kb = Kw = 1.0×10⁻¹⁴</b> 이에요.</p>',
      features: ['pair'],
      setup() { S.gate = ''; S.pq.k = 'ch3'; setScene('pair'); },
      recap: '짝산–짝염기 쌍에서 Ka × Kb = Kw = 1.0×10⁻¹⁴ 이에요. 센 산의 짝염기는 약하고, 약한 산의 짝염기는 상대적으로 세요. 약산의 짝염기는 중성이 아니라 약한 염기예요.',
      summary: '<ul><li>약염기 B + H₂O ⇌ BH⁺ + OH⁻ , <b>Kb = [BH⁺][OH⁻] / [B]</b> (클수록 센 염기)</li><li>짝산–짝염기: <b>Ka × Kb = Kw = 1.0×10⁻¹⁴</b> (25 °C)</li><li>CH₃COO⁻의 Kb = 1.0×10⁻¹⁴ / 1.8×10⁻⁵ = <b>5.6×10⁻¹⁰</b>, NH₄⁺의 Ka = 1.0×10⁻¹⁴ / 1.8×10⁻⁵ = <b>5.6×10⁻¹⁰</b></li><li>Kb: CH₃NH₂ 4.4×10⁻⁴ &gt; NH₃ 1.8×10⁻⁵ → CH₃NH₂가 더 센 염기</li><li>HCN(Ka 6.2×10⁻¹⁰)은 아주 약한 산 → CN⁻(Kb 1.6×10⁻⁵)는 비교적 센 염기</li></ul>',
      missions: [
        {
          title: '짝염기의 Kb, 짝산의 Ka 계산하기',
          goal: 'Ka × Kb = Kw 를 이용해 <b>CH₃COO⁻의 Kb</b>와 <b>NH₄⁺의 Ka</b>를 구하세요.',
          hint: 'Kb = Kw / Ka = (1.0×10⁻¹⁴) / (1.8×10⁻⁵) ≈ 5.6×10⁻¹⁰. NH₄⁺의 Ka = Kw / Kb(NH₃)도 같은 방법으로 구해요. 저울 그림에서 쌍을 바꿔 보며 필요한 값을 찾아요.',
          setup() { S.gate = 'calc'; kbRows.forEach((r) => r.clear()); S.pq.k = 'ch3'; setScene('pair'); updateCtl(); },
          check: () => kbRows[0].ok && kbRows[1].ok, hold: 0.5,
          status: () => 'CH₃COO⁻의 Kb ' + mark(kbRows[0].ok) + ' &nbsp; NH₄⁺의 Ka ' + mark(kbRows[1].ok),
          explain: 'Kb(CH₃COO⁻) = 1.0×10⁻¹⁴ / 1.8×10⁻⁵ = <b>5.6×10⁻¹⁰</b>, Ka(NH₄⁺) = 1.0×10⁻¹⁴ / 1.8×10⁻⁵ = <b>5.6×10⁻¹⁰</b>. 둘 다 약한 짝이에요: 약산의 짝염기는 약한 염기, 약염기의 짝산은 약한 산이에요.',
        },
        {
          title: '더 센 염기 고르기', manual: true,
          goal: 'NH₃와 CH₃NH₂ 중 <b>더 센 염기</b>를 고르세요. (Kb 표를 비교해요)',
          hint: 'Kb가 클수록 센 염기예요. 1.8×10⁻⁵와 4.4×10⁻⁴ 중 어느 쪽이 더 클까요?',
          setup() { S.gate = 'base'; selBase.value = ''; selBase.classList.remove('bad', 'ok'); setScene('pair'); updateCtl(); },
          check() { if (!selBase.value) return '하나를 골라 주세요.'; return selBase.value === 'ch3nh2' ? true : 'NH₃의 Kb는 1.8×10⁻⁵이고 CH₃NH₂의 Kb는 4.4×10⁻⁴이에요. 지수를 비교해 보세요.'; },
          status: () => '고른 염기 ' + (selBase.value === 'ch3nh2' ? 'CH₃NH₂ ' + mark(true) : selBase.value ? 'NH₃' : '—'),
          explain: 'Kb(CH₃NH₂) = 4.4×10⁻⁴ 이 Kb(NH₃) = 1.8×10⁻⁵ 보다 커서 <b>CH₃NH₂</b>가 더 센 염기예요. (약 24배)',
        },
        {
          type: 'quiz', title: 'CN⁻는 어떤 염기?',
          goal: 'HCN은 매우 약한 산(Ka = 6.2×10⁻¹⁰)이에요. 그 짝염기 <b>CN⁻</b>에 대한 설명으로 옳은 것은?',
          setup() { S.gate = ''; S.pq.k = 'hcn'; setScene('pair'); },
          choices: ['약산의 짝염기는 항상 중성이라서 H⁺를 받지 않아요', 'CN⁻는 비교적 센 염기예요 (Kb = 1.6×10⁻⁵)', 'CN⁻는 HCl처럼 거의 100 % 반응하는 강염기예요', 'CN⁻는 산이에요'],
          answer: 1,
          feedback: ['Ka × Kb = Kw 이므로 Ka가 아주 작으면 Kb는 상대적으로 커요. 중성이 아니에요.', '', 'Kb = 1.6×10⁻⁵ 은 약염기 수준이에요. NaOH 같은 강염기와는 달라요.', 'CN⁻는 H⁺를 받는 염기예요.'],
          explain: 'Kb(CN⁻) = Kw / Ka(HCN) = 1.0×10⁻¹⁴ / 6.2×10⁻¹⁰ ≈ <b>1.6×10⁻⁵</b>. 약한 산일수록 그 짝염기는 상대적으로 세요. 이 사실은 뒤에서 염의 가수 분해에 쓰여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-acid-strength', mount: '#game', badge: '이온화 상수 박사', homeHref: '../../index.html#hr',
    featureLabels: { meas: '🌡️ pH 미터 · 전구 측정', model: '🧩 HA 100개 이온화 모형', rank: '📊 Ka 표 · 로그 눈금', pair: '⚖️ 짝산·짝염기 저울' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('meas');
  mdSet('ch3', 0);
  function stepAll1(dt) { stepMeas(dt); stepModel(dt); stepRank(dt); stepPair(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { if (S.mode === 'rank') rkEnter(); if (S.mode === 'model') { S.md.sum = 0; S.md.T = 0; } lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'meas') drawMeas(t); else if (S.mode === 'model') drawModel(t); else if (S.mode === 'rank') drawRank(t); else drawPair(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, AC, MSK, RK_TRUE, RK_SHOW, PQ, prOrd, msOrd, rkOrd, alRows, rtRow, kbRows, selBase, msG, rkG, rkRowRect, mdSet, mdAvg, msSelect, msMeasure, msCount, measuredOrder, alphaOf, rkPick,
    get game() { return game; }, setScene, uiExtra, mdIonN,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
