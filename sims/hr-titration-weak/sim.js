/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 약산-강염기 적정 곡선 [12반응01-03]
   ① 분석: 곡선 비교 (0.100 M CH₃COOH 20.0 mL + 0.100 M NaOH, 강산 곡선과 겹쳐 차이점 표시)  ② 탐구: 반당량점 (pH = pKa, Ka = [H⁺])
   ③ 설명: 당량점 pH (CH₃COONa의 가수 분해, 입자 모형)  ④ 적용: 지시약 (변색 범위, 종말점 오차, 식초 적정 문제)
   pH는 전하 균형으로 정확히 계산하고(pKa 4.74), 헨더슨–하셀바흐 식은 쓰지 않고 Ka 식에서 직접 유도해요. 약염기–강산 적정은 곡선의 대칭 사례로만 언급해요. 모든 용액은 25 °C. */
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



  const MODE_LABEL = { cmp: '📈 곡선 비교', half: '🎯 반당량점', eq: '🧪 당량점 pH', ind: '🎨 지시약' };
  const SPL = SciSim.ease;
  const rect = (x, y, w, h) => ({ x, y, w, h });
  const sgn = (v) => (v > 0.0049 ? '+' : v < -0.0049 ? MINUS : '±') + Math.abs(v).toFixed(2);

  /* ---------- 화학: 0.100 M 약산 20.0 mL 를 0.100 M NaOH 로 적정 (전하 균형으로 정확히 계산) ---------- */
  const VA = 20.0, C0 = 0.100, VMAX = 40;
  const ACIDS = {
    ac: { f: 'CH₃COOH', a: 'CH₃COO⁻', pKa: 4.74, Ka: Math.pow(10, -4.74), col: '#7c3aed', fa: 'HA' },
    fa: { f: 'HCOOH', a: 'HCOO⁻', pKa: 3.74, Ka: Math.pow(10, -3.74), col: '#0891b2' },
  };
  function pHss(Vb) {
    const net = C0 * (Vb - VA) / (VA + Vb), sq = Math.sqrt(net * net + 4 * KW);
    return -Math.log10(net <= 0 ? (-net + sq) / 2 : 2 * KW / (net + sq));
  }
  function pHwa(Ka, Vb) {
    const Na = C0 * Vb / (VA + Vb), Ct = C0 * VA / (VA + Vb);
    let lo = -14, hi = 0;
    for (let i = 0; i < 70; i++) {
      const m = (lo + hi) / 2, h = Math.pow(10, m);
      if (h + Na - Ct * Ka / (Ka + h) - KW / h > 0) hi = m; else lo = m;
    }
    return -(lo + hi) / 2;
  }
  const pHc = (id, V) => (id === 'st' ? pHss(V) : pHwa(ACIDS[id].Ka, V));
  const pHr = (id, V) => r2d(pHc(id, V));
  const STD_V = [0, 1, 5, 10, 15, 19, 19.9, 20, 20.1, 21, 25, 30, 40];
  const fmtV = (vc) => (vc / 100).toFixed(2);
  const curveCache = {};
  function curvePts(id, xmax) {
    const key = id + xmax; if (curveCache[key]) return curveCache[key];
    const vs = [];
    for (let v = 0; v <= xmax + 1e-9; v += 0.1) { if (v < 19.6 || v > 20.4) vs.push(+v.toFixed(3)); }
    for (let v = 19.6; v <= 20.4 + 1e-9; v += 0.005) vs.push(+v.toFixed(3));
    vs.sort((a, b) => a - b);
    return (curveCache[key] = vs.filter((v) => v <= xmax).map((v) => [v, pHc(id, v)]));
  }
  /* 지시약 (변색 범위) */
  const IND = {
    mo: { name: '메틸 오렌지', lo: 3.1, hi: 4.4, cols: ['#e23a33', '#f08a2e', '#f6cf3a'], note: '빨강 → 노랑' },
    btb: { name: 'BTB', lo: 6.0, hi: 7.6, cols: ['#f2cf2e', '#4cb86a', '#2f6fd0'], note: '노랑 → 파랑' },
    pp: { name: '페놀프탈레인', lo: 8.2, hi: 10.0, cols: ['#dbeaf8', '#f0a0c8', '#e0338f'], note: '무색 → 분홍' },
  };
  const IK = ['mo', 'btb', 'pp'];
  function indColor(k, pH) {
    const d = IND[k], t = clamp((pH - d.lo) / (d.hi - d.lo), 0, 1);
    return t < 0.5 ? C.mix(d.cols[0], d.cols[1], t * 2) : C.mix(d.cols[1], d.cols[2], t * 2 - 1);
  }
  const firstV = (thr) => { for (let n = 0; n <= 4000; n++) { if (pHc('ac', n / 100) >= thr) return n / 100; } return 40; };
  const vcache = {};
  const vStart = (k) => (vcache['s' + k] != null ? vcache['s' + k] : (vcache['s' + k] = firstV(IND[k].lo)));
  const vEnd = (k) => (vcache['e' + k] != null ? vcache['e' + k] : (vcache['e' + k] = firstV(IND[k].hi)));

  /* ---------- 상태 ---------- */
  Object.assign(S, {
    mode: 'cmp', sub: { ind: 'cmp' },
    cm: { table: [], view: 'pts', ov: false, lp: 0, marks: {}, shake: 0, flashBad: 0 },
    hf: { acid: 'ac', V: 10, seen: {}, drag: false, list: { HA: [], A: [], Na: [], OH: [] }, acc: 0, init: false },
    eq: { V: 20, list: { HA: [], A: [], Na: [], OH: [] }, acc: 0, init: false, sp: {} },
    ind: { k: 'mo', V: 0, run: null, res: { mo: null, btb: null, pp: null }, drip: 0, pulse: 0, mode: 'cmp' },
  });

  /* ---------- 공통 그림 도구 ---------- */
  function plotArea(r, xmax) {
    const gx0 = r.x + 42, gx1 = r.x + r.w - 14, gy0 = r.y + 14, gy1 = r.y + r.h - 38;
    return { r, xmax, gx0, gx1, gy0, gy1, X: (v) => gx0 + v / xmax * (gx1 - gx0), Y: (p) => gy1 - clamp(p, 0, 14) / 14 * (gy1 - gy0) };
  }
  function drawAxes(P, o) {
    o = o || {};
    D.roundRect(P.r.x, P.r.y, P.r.w, P.r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1.2;
    for (let p = 0; p <= 14; p += 2) { ctx.beginPath(); ctx.moveTo(P.gx0, P.Y(p)); ctx.lineTo(P.gx1, P.Y(p)); ctx.stroke(); T(P.gx0 - 6, P.Y(p) + 4.5, String(p), 13, MUTED, 'right', 700); }
    const stepX = o.stepX || (P.xmax > 30 ? 10 : 5);
    for (let v = 0; v <= P.xmax + 1e-9; v += stepX) { ctx.beginPath(); ctx.moveTo(P.X(v), P.gy0); ctx.lineTo(P.X(v), P.gy1); ctx.stroke(); T(P.X(v), P.gy1 + 17, String(v), 13, MUTED, 'center', 700); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.gx0, P.gy0 - 4); ctx.lineTo(P.gx0, P.gy1); ctx.lineTo(P.gx1, P.gy1); ctx.stroke();
    T(P.gx0 + 4, P.gy0 - 3, 'pH', 13, INK, 'left', 800);
    T((P.gx0 + P.gx1) / 2, P.r.y + P.r.h - 6, 'NaOH 부피 (mL)', 13, INK, 'center', 800);
  }
  function strokeCurve(P, id, color, w, alpha, dash) {
    const pts = curvePts(id, P.xmax);
    ctx.save(); ctx.beginPath(); ctx.rect(P.gx0, P.gy0 - 2, P.gx1 - P.gx0, P.gy1 - P.gy0 + 4); ctx.clip();
    ctx.strokeStyle = C.rgba(color, alpha == null ? 1 : alpha); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(P.X(q[0]), P.Y(q[1])) : ctx.moveTo(P.X(q[0]), P.Y(q[1]))));
    ctx.stroke(); ctx.restore();
  }
  function vArrow(x, y0, y1, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    const d = y1 > y0 ? -1 : 1;
    [[y0, -d], [y1, d]].forEach(([yy, dd]) => { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 4.5, yy + dd * 9); ctx.lineTo(x + 4.5, yy + dd * 9); ctx.closePath(); ctx.fill(); });
  }

  /* ============ ① 곡선 비교 ============ */
  const MARKS = [
    { id: 'a', t: '① 시작 pH가 더 높아요', ok: true, why: '' },
    { id: 'b', t: '② 처음에 pH가 빨리 오른 뒤 완만하게 올라가는 구간이 있어요', ok: true, why: '' },
    { id: 'c', t: '③ 당량점의 pH가 7보다 커요', ok: true, why: '' },
    { id: 'd', t: '④ 급변하는 pH 폭이 더 좁아요', ok: true, why: '' },
    { id: 'e', t: '⑤ 당량점의 부피가 더 커요', ok: false, why: '곡선을 겹쳐 보면 당량점의 부피는 둘 다 20.0 mL예요. 몰수가 같기 때문이에요.' },
    { id: 'f', t: '⑥ NaOH를 많이 넣은 뒤의 pH가 더 낮아요', ok: false, why: '25 mL 이후에는 두 곡선이 거의 겹쳐요. 과량의 NaOH가 pH를 정하기 때문이에요.' },
  ];
  const cmG = () => (PHONE
    ? { r: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 252), tb: rect(MAIN.x + 8, MAIN.y + 262, 448, 156) }
    : { r: rect(MAIN.x + 8, MAIN.y + 4, 560, MAIN.h - 8), tb: rect(MAIN.x + 578, MAIN.y + 8, 190, 326) });
  function cmPts() { return S.cm.table.slice().sort((a, b) => a.Vc - b.Vc); }
  function cmLoad() {
    const cm = S.cm; let k = 0;
    STD_V.forEach((v) => { const vc = Math.round(v * 100); if (!cm.table.some((p) => p.Vc === vc)) { cm.table.push({ Vc: vc, ph: pHr('ac', v), t0: S.t + 0.1 + k * 0.1 }); k++; } });
    if (k) Sound.success(); updateCtl();
  }
  function cmReset() { const cm = S.cm; cm.table = []; cm.view = 'pts'; cm.ov = false; cm.lp = 0; cm.marks = {}; cm.bad = {}; cm.shake = 0; updateCtl(); }
  const cmMarkN = () => MARKS.filter((m) => m.ok && S.cm.marks[m.id]).length;
  function cmMark(id) {
    const cm = S.cm, m = MARKS.find((q) => q.id === id);
    if (!cm.ov) { showHint('먼저 “강산 곡선 겹치기”를 눌러 두 곡선을 비교해요.', 2800); Sound.fail(); return; }
    if (!m.ok) { cm.shake = 0.5; cm.bad = cm.bad || {}; cm.bad[id] = true; Sound.fail(); showHint(m.why, 4200); updateCtl(); return; }
    cm.marks[id] = !cm.marks[id]; Sound.tick(); updateCtl();
  }
  const cmDone = () => cmPts().length >= 12 && S.cm.view === 'line' && S.cm.ov;
  function stepCmp(dt) { const cm = S.cm; cm.lp = ap(cm.lp, cm.view === 'line' ? 1 : 0, dt, 2.6); if (Math.abs(cm.lp - (cm.view === 'line' ? 1 : 0)) < 0.004) cm.lp = cm.view === 'line' ? 1 : 0; cm.shake = ap(cm.shake, 0, dt, 4); }
  function callout(x, y, txt, color, size) { D.label(x, y, txt, { size: size || 13, bg: '#fff', color: color || '#26324a', border: color || '#cbd5e1' }); }
  function drawCmp(t) {
    const g = cmG(), P = plotArea(g.r, VMAX), cm = S.cm, pts = cmPts();
    T(14, 26, '📈 약산 곡선을 그려 강산 곡선과 비교해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawAxes(P);
    if (cm.ov) {
      strokeCurve(P, 'st', '#2563eb', 3, 0.5, [7, 5]);
      D.label(P.X(12), P.Y(0.62), '강산–강염기', { size: 12.5, bg: '#fff', color: '#2563eb', border: '#93c5fd' });
    }
    if (pts.length > 1 && cm.lp > 0.003) {
      ctx.save(); ctx.beginPath(); ctx.rect(P.gx0 - 4, P.gy0 - 6, (P.X(pts[pts.length - 1].Vc / 100) - P.gx0 + 8) * cm.lp, P.gy1 - P.gy0 + 12); ctx.clip();
      strokeCurve(P, 'ac', '#7c3aed', 3.4); ctx.restore();
    }
    pts.forEach((p) => { if (t < p.t0) return; const k = SPL.outBack(clamp((t - p.t0) / 0.35, 0, 1)); D.sphere(P.X(p.Vc / 100), P.Y(p.ph), Math.max(0.1, 5 * k), '#ea580c', { gloss: false, outline: '#fff', outlineWidth: 1.6 }); });
    if (cm.ov && pts.length) D.label(P.X(15.5), P.Y(3.6), '약산–강염기', { size: 12.5, bg: '#fff', color: '#7c3aed', border: '#c4b5fd' });
    if (!pts.length) T((P.gx0 + P.gx1) / 2, (P.gy0 + P.gy1) / 2, '“자료표 불러오기”를 눌러 점을 찍어요', 14.5, '#9a8ec0', 'center', 800);
    // 차이점 표시
    const mk = cm.marks;
    if (mk.a && pts.length) {
      const x = P.X(0) + 12; vArrow(x, P.Y(1.0), P.Y(2.87), '#dc2626');
      callout(P.X(9), P.Y(2.2), '시작 pH 2.87 / 1.00', '#dc2626');
    }
    if (mk.b && pts.length) {
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(P.X(2), P.Y(5.7)); ctx.lineTo(P.X(18), P.Y(5.7)); ctx.stroke(); ctx.setLineDash([]);
      [2, 18].forEach((v) => { ctx.beginPath(); ctx.moveTo(P.X(v), P.Y(5.7) - 6); ctx.lineTo(P.X(v), P.Y(5.7) + 6); ctx.stroke(); });
      callout(P.X(10), P.Y(6.9), PHONE ? '급상승 뒤 완만 (완충 구간)' : '초반 급상승 뒤 완만한 구간 (완충 구간)', '#b45309');
    }
    if (mk.c && pts.length) {
      const x = P.X(20) + 14; vArrow(x, P.Y(7.0), P.Y(8.72), '#16a34a');
      callout(P.X(28), P.Y(7.85), '당량점 pH 8.72 / 7.00', '#15803d');
      D.ring(P.X(20), P.Y(8.72), 9, t, { color: '#16a34a', width: 2.2, speed: 1 });
    }
    if (mk.d && pts.length) {
      const xs = P.X(36.2), xw = P.X(38.8);
      ctx.fillStyle = 'rgba(37,99,235,.25)'; ctx.fillRect(xs - 4, P.Y(10.4), 8, P.Y(3.6) - P.Y(10.4));
      ctx.fillStyle = 'rgba(124,58,237,.35)'; ctx.fillRect(xw - 4, P.Y(10.4), 8, P.Y(7.04) - P.Y(10.4));
      T(xs, P.Y(3.6) + 16, '6.80', 12.5, '#2563eb', 'center', 800); T(xw, P.Y(7.04) + 16, '3.36', 12.5, '#7c3aed', 'center', 800);
      callout((xs + xw) / 2 - 22, P.Y(10.4) - 22, '급변 폭', '#7c3aed', 12.5);
    }
    // 자료표
    const tb = g.tb;
    D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cols = PHONE ? 2 : 1, rows = PHONE ? 7 : 13, rh = PHONE ? 19 : 22, cw = (tb.w - 16) / cols;
    for (let c = 0; c < cols; c++) { const x0 = tb.x + 8 + c * cw; T(x0 + 6, tb.y + 20, 'V (mL)', 13, MUTED, 'left', 800); T(x0 + cw - 12, tb.y + 20, 'pH', 13, MUTED, 'right', 800); }
    pts.forEach((p, i) => {
      const c = Math.floor(i / rows), r = i % rows, x0 = tb.x + 8 + c * cw, yy = tb.y + 40 + r * rh;
      const pop = clamp((t - p.t0) / 0.3, 0, 1); ctx.save(); ctx.globalAlpha = pop;
      T(x0 + 6, yy, fmtV(p.Vc), 14, INK, 'left', 800); T(x0 + cw - 12, yy, p.ph.toFixed(2), 14, '#5b21b6', 'right', 800); ctx.restore();
    });
    if (!pts.length) T(tb.x + tb.w / 2, tb.y + tb.h / 2 + 4, '표가 비어 있어요', 13.5, '#9a8ec0', 'center', 800);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '약산–강염기 적정 곡선: 0.100 M CH₃COOH 20.0 mL', 15, '#b45309', 'left', 800);
    let body = '자료표를 불러와 점을 찍고 선으로 이은 뒤, 강산–강염기 곡선(점선)을 겹쳐 보세요. 같은 점과 다른 점이 보여요.';
    if (cmDone()) body = '두 곡선은 당량점 부피(20.0 mL)와 NaOH를 많이 넣은 뒤의 pH가 같아요. 하지만 시작 pH, 초반의 모양, 당량점의 pH, 급변 폭이 달라요. 다른 점을 눌러 곡선 위에 표시해 보세요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  /* ============ 입자 상자 (② 반당량점 · ③ 당량점 공용) ============ */
  const PCOL = { HA: '#fbbf24', A: '#ea580c', Na: '#a855f7', OH: '#3b82f6' };
  const POFF = { HA: 0, A: 20, Na: 40, OH: 70 }, PMAX = { HA: 20, A: 20, Na: 30, OH: 10 };
  const pbG = () => (PHONE
    ? { r: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 204), box: rect(MAIN.x + 8, MAIN.y + 214, MAIN.w - 16, 150), leg: rect(MAIN.x + 8, MAIN.y + 370, MAIN.w - 16, 52) }
    : { r: rect(MAIN.x + 8, MAIN.y + 4, 396, MAIN.h - 8), box: rect(MAIN.x + 416, MAIN.y + 8, 352, 240), leg: rect(MAIN.x + 416, MAIN.y + 256, 352, 78) });
  const pbCells = (() => {
    const g = pbG(), bw = g.box.w - 16, bh = g.box.h - 38;
    const cols = Math.round(Math.sqrt(90 * bw / bh)), rows = Math.ceil(90 / cols), n = cols * rows;
    const perm = Array.from({ length: n }, (_, i) => i); let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    return { cols, rows, perm };
  })();
  const pbTargets = (V) => ({ HA: Math.max(0, 20 - V), A: Math.min(V, 20), Na: V, OH: Math.max(0, V - 20) });
  function pbSlot(k, i) {
    const g = pbG(), bx = g.box.x + 8, by = g.box.y + 30, bw = g.box.w - 16, bh = g.box.h - 38, c = pbCells, cell = c.perm[POFF[k] + i];
    const col = cell % c.cols, row = Math.floor(cell / c.cols);
    return { x: bx + (col + 0.5) * bw / c.cols, y: by + (row + 0.5) * bh / c.rows, cw: bw / c.cols, ch: bh / c.rows };
  }
  function sysInit(sys, V) { sys.init = true; const tc = pbTargets(V); Object.keys(tc).forEach((k) => { sys.list[k] = []; for (let i = 0; i < tc[k]; i++) sys.list[k].push({ k, i, s: 1, u: 1, fx: 0, fy: 0, dying: false, ph: Math.random() * 6 }); }); }
  function sysStep(sys, dt, V) {
    if (!sys.init) sysInit(sys, V);
    sys.acc -= dt;
    if (sys.acc <= 0) {
      sys.acc = 0.03; const tc = pbTargets(V), g = pbG();
      ['HA', 'A', 'Na', 'OH'].forEach((k) => {
        const L = sys.list[k], alive = L.filter((p) => !p.dying);
        if (alive.length > tc[k]) {
          const p = alive[alive.length - 1]; p.dying = true; const sl = pbSlot(k, p.i);
          if (k === 'HA') sys.lastHA = { x: sl.x, y: sl.y }; if (k === 'A') sys.lastA = { x: sl.x, y: sl.y };
          parts.burst(sl.x, sl.y, { count: k === 'HA' ? 8 : 5, speed: 80, size: 2.4, colors: [PCOL[k], '#fff'], life: 0.45, gravity: 40 });
        } else if (alive.length < tc[k]) {
          const used = {}; L.forEach((p) => { used[p.i] = 1; }); let i = 0; while (used[i]) i++;
          if (i >= PMAX[k]) return;
          const sl = pbSlot(k, i); let fx = sl.x, fy = g.box.y + 4;
          if (k === 'A' && sys.lastHA) { fx = sys.lastHA.x; fy = sys.lastHA.y; } else if (k === 'HA' && sys.lastA) { fx = sys.lastA.x; fy = sys.lastA.y; }
          L.push({ k, i, s: 0, u: 0, fx, fy, dying: false, ph: Math.random() * 6 });
        }
      });
    }
    Object.keys(sys.list).forEach((k) => {
      const L = sys.list[k];
      for (let n = L.length - 1; n >= 0; n--) { const p = L[n]; p.s = ap(p.s, p.dying ? 0 : 1, dt, p.dying ? 14 : 8); p.u = ap(p.u, 1, dt, 6); if (p.dying && p.s < 0.03) L.splice(n, 1); }
    });
    if (RM) Object.keys(sys.list).forEach((k) => sys.list[k].forEach((p) => { p.s = p.dying ? 0 : 1; p.u = 1; }));
  }
  const sysCount = (sys, k) => sys.list[k].filter((p) => !p.dying).length;
  function drawSys(sys, t, ac, title) {
    const g = pbG(), b = g.box;
    D.roundRect(b.x, b.y, b.w, b.h, 12); const gr2 = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); gr2.addColorStop(0, '#f4f9ff'); gr2.addColorStop(1, '#e4f0ff'); ctx.fillStyle = gr2; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2; ctx.stroke();
    T(b.x + 12, b.y + 21, '🔍 ' + title, PHONE ? 12.5 : 13.5, '#1e40af', 'left', 800);
    const s0 = pbSlot('HA', 0), r0 = Math.min(s0.cw, s0.ch) * 0.43;
    ['Na', 'OH', 'A', 'HA'].forEach((k) => {
      sys.list[k].forEach((p) => {
        const sl = pbSlot(k, p.i), u = SPL.outCubic(clamp(p.u, 0, 1)), w = RM ? 0 : 1.5;
        const x = p.fx + (sl.x - p.fx) * u + Math.sin(t * 1.3 + p.ph) * w, y = p.fy + (sl.y - p.fy) * u + Math.cos(t * 1.1 + p.ph * 1.7) * w;
        const r = Math.max(0.1, (k === 'Na' ? r0 * 0.78 : r0) * SPL.outBack(clamp(p.s, 0, 1)));
        const lab = k === 'HA' ? 'HA' : k === 'A' ? 'A⁻' : k === 'Na' ? 'Na⁺' : 'OH⁻';
        D.sphere(x, y, r, PCOL[k], { gloss: true, text: lab, textColor: k === 'HA' ? '#5b3a00' : '#fff', textScale: k === 'Na' || k === 'OH' ? 0.78 : 0.9 });
      });
    });
    void ac;
  }
  function drawLegend(sys, ac) {
    const g = pbG(), L = g.leg;
    D.roundRect(L.x, L.y, L.w, L.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 1.6; ctx.stroke();
    const items = [['HA', 'HA = ' + ACIDS[ac].f], ['A', 'A⁻ = ' + ACIDS[ac].a], ['Na', 'Na⁺'], ['OH', 'OH⁻']];
    const half = PHONE ? 4 : 2;
    items.forEach(([k, lab], i) => {
      const col = i % 2, row = Math.floor(i / 2), cw = (L.w - 16) / 2;
      const x = L.x + 10 + col * cw, y = L.y + (PHONE ? 20 : 22) + row * (PHONE ? 22 : 24);
      D.sphere(x + 6, y - 4, 6, PCOL[k], { gloss: false });
      T(x + 17, y, lab + ' ' + sysCount(sys, k) + '개', PHONE ? 12.5 : 14, INK, 'left', 800);
    });
    void half;
    if (!PHONE) T(L.x + L.w / 2, L.y + L.h - 8, '● 1개 = 0.10 mmol (처음 HA 20개 = 2.00 mmol)', 12, MUTED, 'center', 700);
  }

  /* ============ ② 반당량점 ============ */
  S.hf.sys = { list: { HA: [], A: [], Na: [], OH: [] }, acc: 0, init: false };
  const hfPh = () => pHr(S.hf.acid, S.hf.V);
  const hfHalf = (ac) => pHr(ac, 10);
  function hfSetV(v) {
    const nv = clamp(Math.round(v), 0, 30); if (nv === S.hf.V) return;
    S.hf.V = nv; if (!S.hf.drag) S.hf.seen[S.hf.acid + nv] = true; Sound.tick(); updateCtl();
  }
  function hfAcid(a) { S.hf.acid = a; S.hf.seen[a + S.hf.V] = true; Sound.click(); updateCtl(); }
  function stepHalf(dt) { sysStep(S.hf.sys, dt, S.hf.V); }
  function drawHalf(t) {
    const g = pbG(), P = plotArea(g.r, 30), hf = S.hf, ac = hf.acid, V = hf.V, ph = pHc(ac, V), other = ac === 'ac' ? 'fa' : 'ac';
    T(14, 26, '🎯 곡선 위의 점을 끌어 반당량점을 찾아요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawAxes(P);
    strokeCurve(P, other, ACIDS[other].col, 2, 0.35, [6, 5]);
    strokeCurve(P, ac, ACIDS[ac].col, 3.4);
    // 당량점 · 반당량점 눈금
    ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
    [10, 20].forEach((v) => { ctx.beginPath(); ctx.moveTo(P.X(v), P.gy0); ctx.lineTo(P.X(v), P.gy1); ctx.stroke(); }); ctx.setLineDash([]);
    T(P.X(10), P.gy0 + 14, '반당량점', 12.5, '#475569', 'center', 800); T(P.X(20) + 4, P.gy0 + 14, '당량점', 12.5, '#475569', 'left', 800);
    const mx = P.X(V), my = P.Y(ph), half = V === 10;
    ctx.strokeStyle = C.rgba(ACIDS[ac].col, 0.55); ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, P.gy1); ctx.moveTo(mx, my); ctx.lineTo(P.gx0, my); ctx.stroke(); ctx.setLineDash([]);
    if (half) { D.ring(mx, my, 14, t, { color: '#16a34a', width: 2.6, speed: 1.1 }); D.label(P.gx0 + 38, my - 14, 'pH ' + ph.toFixed(2), { size: 13, bg: '#16a34a', color: '#fff' }); }
    D.glow(mx, my, 24, ACIDS[ac].col, 0.45); D.sphere(mx, my, 9, ACIDS[ac].col, { outline: '#fff', outlineWidth: 2.4, shadow: true });
    D.label(clamp(mx + (mx > P.gx1 - 100 ? -70 : 70), P.gx0 + 66, P.gx1 - 66), clamp(my + (my < P.gy0 + 44 ? 26 : 24), P.gy0 + 14, P.gy1 - 30), V + ' mL · pH ' + ph.toFixed(2), { size: 13.5, bg: '#fff', color: '#5b21b6' });
    drawSys(hf.sys, t, ac, ACIDS[ac].f + ' 적정 (' + V + ' mL)');
    drawLegend(hf.sys, ac);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const nh = sysCount(hf.sys, 'HA'), na = sysCount(hf.sys, 'A');
    T(INFO.x + 16, INFO.y + 26, 'NaOH ' + V + ' mL:  ' + ACIDS[ac].f + ' ' + (V <= 20 ? 20 - V : 0) + '개 · ' + ACIDS[ac].a + ' ' + Math.min(V, 20) + '개', 15, '#b45309', 'left', 800);
    let body = 'Ka = [H⁺][A⁻] / [HA]  이에요. 점을 끌어 ' + ACIDS[ac].f + '와 ' + ACIDS[ac].a + '의 개수를 비교해 보세요.';
    if (V === 10) body = '반당량점(10 mL)에서는 ' + ACIDS[ac].f + '와 ' + ACIDS[ac].a + '가 10개씩 같아요. [HA] = [A⁻] 이면 Ka = [H⁺] 이므로  pH = pKa = ' + ACIDS[ac].pKa.toFixed(2) + '  (Ka = ' + sci(ACIDS[ac].Ka, 2) + ').';
    else if (V === 0) body = '처음에는 ' + ACIDS[ac].f + '만 있고 ' + ACIDS[ac].a + '는 거의 없어요. [A⁻]가 아주 작아서 pH가 낮아요 (' + ph.toFixed(2) + ').';
    else if (V < 20) body = '[HA]와 [A⁻]의 비가 ' + nh + ' : ' + na + ' 이에요. [A⁻]가 [HA]보다 ' + (na > nh ? '많아서 [H⁺] = Ka × [HA]/[A⁻] 가 작아져 pH가 pKa보다 커요.' : '적어서 [H⁺] = Ka × [HA]/[A⁻] 가 커져 pH가 pKa보다 작아요.');
    else if (V === 20) body = '당량점에서는 ' + ACIDS[ac].f + '가 모두 ' + ACIDS[ac].a + '로 바뀌었어요. pH는 ' + ph.toFixed(2) + ' (7보다 커요).';
    else body = 'NaOH가 남아 OH⁻ 가 늘었어요. pH ' + ph.toFixed(2) + '.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ③ 당량점 pH ============ */
  S.eq.sys = { list: { HA: [], A: [], Na: [], OH: [] }, acc: 0, init: false };
  S.eq.vd = 20; S.eq.sel = 20;
  function eqSet(v) { S.eq.sel = v; S.eq.V = v; Sound.click(); updateCtl(); }
  const EQS = [['ha', 'CH₃COOH (대부분)', false], ['a', 'CH₃COO⁻', true], ['na', 'Na⁺', true], ['oh', 'OH⁻ (NaOH가 남아서 많이 있어요)', false], ['h3o', 'H₃O⁺ (많이)', false]];
  const KH_EQ = KW / ACIDS.ac.Ka, C_EQ = C0 * VA / (VA + 20);               // 5.5×10⁻¹⁰, 0.0500 M
  const eqX = Math.sqrt(KH_EQ * C_EQ);                                      // [OH⁻] = 5.2×10⁻⁶ M
  const eqPhTheory = r2d(14 + Math.log10(eqX));                             // 8.72
  function stepEq(dt) { sysStep(S.eq.sys, dt, S.eq.V); S.eq.vd = ap(S.eq.vd, S.eq.V, dt, 6); }
  function drawEq(t) {
    const g = pbG(), P = plotArea(g.r, 30), eq = S.eq, V = eq.V, ph = pHc('ac', V);
    T(14, 26, '🧪 당량점에서 용액에는 무엇이 들어 있을까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawAxes(P);
    strokeCurve(P, 'st', '#2563eb', 2, 0.4, [6, 5]);
    strokeCurve(P, 'ac', '#7c3aed', 3.4);
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(P.gx0, P.Y(7)); ctx.lineTo(P.gx1, P.Y(7)); ctx.stroke(); ctx.setLineDash([]);
    T(P.gx0 + 6, P.Y(7) - 5, 'pH 7', 12.5, '#475569', 'left', 800);
    [10, 20, 25].forEach((v) => { const sel = v === eq.sel; ctx.fillStyle = '#fff'; ctx.strokeStyle = sel ? '#16a34a' : '#a78bfa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.X(v), P.Y(pHc('ac', v)), 6, 0, TAU); ctx.fill(); ctx.stroke(); });
    const mx = P.X(eq.vd), my = P.Y(pHc('ac', eq.vd));
    D.glow(mx, my, 24, '#8b5cf6', 0.45); D.sphere(mx, my, 9, '#8b5cf6', { outline: '#fff', outlineWidth: 2.4, shadow: true });
    if (V === 20) D.ring(mx, my, 15, t, { color: '#dc2626', width: 2.4, speed: 1.1 });
    D.label(clamp(mx + (mx > P.gx1 - 100 ? -70 : 70), P.gx0 + 66, P.gx1 - 66), clamp(my + 24, P.gy0 + 14, P.gy1 - 30), V + ' mL · pH ' + ph.toFixed(2), { size: 13.5, bg: '#fff', color: '#5b21b6' });
    drawSys(eq.sys, t, 'ac', 'NaOH ' + V + ' mL 일 때 입자');
    drawLegend(eq.sys, 'ac');
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, V === 20 ? '당량점: CH₃COONa 0.0500 M 수용액' : V === 10 ? '반당량점: CH₃COOH와 CH₃COO⁻가 함께' : 'NaOH 과량: CH₃COO⁻와 OH⁻', 15, '#b45309', 'left', 800);
    let body;
    if (V === 20) body = '아세트산 2.00 mmol이 NaOH 2.00 mmol과 모두 반응해 CH₃COO⁻ 2.00 mmol만 남아요 (전체 40.0 mL → 0.0500 M). CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ 로 OH⁻가 생겨 pH가 7보다 커요.';
    else if (V === 10) body = 'CH₃COOH 1.00 mmol과 CH₃COO⁻ 1.00 mmol이 함께 있어요 (반당량점). OH⁻는 거의 없고 pH는 pKa 근처예요.';
    else body = '당량점을 넘어 NaOH가 0.50 mmol 남았어요. 이 OH⁻가 pH를 정하고 CH₃COO⁻의 가수 분해는 무시할 만큼 작아요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ④ 지시약 ============ */
  const inG = () => (PHONE
    ? { r: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 232), fl: rect(MAIN.x + 8, MAIN.y + 244, 226, 172), res: rect(MAIN.x + 242, MAIN.y + 244, 214, 172) }
    : { r: rect(MAIN.x + 8, MAIN.y + 4, 430, MAIN.h - 8), fl: rect(MAIN.x + 450, MAIN.y + 8, 318, 196), res: rect(MAIN.x + 450, MAIN.y + 212, 318, 122) });
  const indPh = () => pHc('ac', S.ind.V);
  const indN = () => IK.filter((k) => S.ind.res[k]).length;
  function indSelect(k) { const n = S.ind; if (n.run) return; n.k = k; Sound.click(); updateCtl(); }
  function indStart() { const n = S.ind; if (n.run) return; n.V = 0; n.run = { k: n.k, vend: vEnd(n.k) }; n.drip = 0; Sound.click(); updateCtl(); }
  function indReset() { const n = S.ind; n.run = null; n.V = 0; Sound.click(); updateCtl(); }
  function indMode(m) { const n = S.ind; n.run = null; n.mode = m; S.sub.ind = m; Sound.click(); updateCtl(); }
  function stepInd(dt) {
    const n = S.ind; n.pulse = ap(n.pulse, 0, dt, 2.5);
    if (!n.run) return;
    const rem = n.run.vend - n.V, sp = rem > 1.0 ? 8 : rem > 0.15 ? 1.4 : 0.35;
    n.V = Math.min(n.run.vend, n.V + sp * dt);
    n.drip += dt * (rem > 1.0 ? 9 : rem > 0.15 ? 4 : 1.6);
    const g = inG(), cx = g.fl.x + (PHONE ? 62 : 90), by = g.fl.y + g.fl.h - 22, fh = PHONE ? 96 : 112, tip = by - fh - 6, surf = by - (fh * 0.68) * (0.5 + 0.12 * n.V / 30) - 6;
    while (n.drip >= 1) { n.drip -= 1; if (!RM) parts.emit({ x: cx, y: tip, vx: 0, vy: 0, life: Math.sqrt(2 * Math.max(10, surf - tip) / 700), size: 3, color: '#4a7df0', gravity: 700, fade: false, shape: 'circle' }); }
    if (n.V >= n.run.vend - 1e-9) {
      n.V = n.run.vend; const k = n.run.k;
      n.res[k] = { v: n.run.vend, err: Math.round((n.run.vend - 20) * 100) / 100, sp: Math.round((vEnd(k) - vStart(k)) * 100) / 100 };
      n.run = null; n.pulse = 1; Sound.success(); flash(cx, by - 40, [indColor(k, IND[k].hi), '#14a058', '#ffb400']); updateCtl();
    }
  }
  const okInd = (r) => Math.abs(r.err) <= 0.1 && r.sp <= 0.2;
  function drawBurette(x, y0, h, reading, o) {
    o = o || {};
    const max = o.max || 50, w = o.w || 26, liquid = o.liquid || '#a9c8ff', top = y0 - 14, bot = y0 + h + 6;
    const yOf = (v) => y0 + (v / max) * h;
    ctx.save();
    ctx.save(); D.roundRect(x - w / 2, top, w, bot - top, 8); ctx.clip();
    const ly = yOf(clamp(reading, 0, max));
    const gg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gg.addColorStop(0, C.rgba(liquid, 0.95)); gg.addColorStop(0.5, C.rgba(C.shade(liquid, 0.3), 0.8)); gg.addColorStop(1, C.rgba(liquid, 0.95));
    ctx.fillStyle = gg; ctx.fillRect(x - w / 2, ly, w, bot - ly);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; D.roundRect(x - w / 2, top, w, bot - top, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 5, top + 8); ctx.lineTo(x - w / 2 + 5, bot - 8); ctx.stroke();
    for (let v = 0; v <= max; v += 5) {
      const major = v % 10 === 0, yy = yOf(v);
      ctx.strokeStyle = '#4b5563'; ctx.lineWidth = major ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(x + w / 2 - (major ? 12 : 7), yy); ctx.lineTo(x + w / 2, yy); ctx.stroke();
      if (major) T(x + w / 2 + 5, yy + 4.5, String(v), 13, MUTED, 'left', 800);
    }
    const vy = bot + 6;
    D.roundRect(x - 4, bot, 8, 16, 2); ctx.fillStyle = '#9ca3af'; ctx.fill();
    ctx.save(); ctx.translate(x, vy + 6); D.roundRect(-13, -4, 26, 8, 4); ctx.fillStyle = '#6b7280'; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(x - 4, vy + 16); ctx.lineTo(x + 4, vy + 16); ctx.lineTo(x + 1.5, vy + 32); ctx.lineTo(x - 1.5, vy + 32); ctx.closePath(); ctx.fill();
    ctx.restore();
    return { tipY: vy + 32, yOf };
  }
  const VIN_V = 23.5, VIN_M = 0.100 * VIN_V / 20.0;                 // 0.1175 M
  function drawInd(t) {
    const n = S.ind, g = (PHONE && n.mode === 'vin') ? { r: rect(MAIN.x + 4, MAIN.y + 4, 166, MAIN.h - 8), fl: rect(MAIN.x + 176, MAIN.y + 8, 280, 196), res: rect(MAIN.x + 176, MAIN.y + 212, 280, 206) } : inG(), P = plotArea(g.r, 30), pH = indPh();
    T(14, 26, n.mode === 'vin' ? '🥗 식초의 농도를 적정 결과로 구해요' : '🎨 약산 적정에 알맞은 지시약은 무엇일까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    if (n.mode === 'cmp') {
      drawAxes(P);
      IK.forEach((k) => {
        const d = IND[k], y0 = P.Y(d.hi), y1 = P.Y(d.lo), sel = n.k === k;
        const gg = ctx.createLinearGradient(0, y0, 0, y1); gg.addColorStop(0, C.rgba(d.cols[2], 0.6)); gg.addColorStop(0.5, C.rgba(d.cols[1], 0.6)); gg.addColorStop(1, C.rgba(d.cols[0], 0.6));
        ctx.fillStyle = gg; ctx.fillRect(P.gx0, y0, P.gx1 - P.gx0, y1 - y0);
        ctx.strokeStyle = sel ? '#26324a' : 'rgba(38,50,74,.28)'; ctx.lineWidth = sel ? 2.4 : 1; ctx.strokeRect(P.gx0, y0, P.gx1 - P.gx0, y1 - y0);
      });
      strokeCurve(P, 'st', '#94a3b8', 2, 0.55, [6, 5]);
      strokeCurve(P, 'ac', '#7c3aed', 3.4);
      const pa = pHr('ac', 19.9), pb = pHr('ac', 20.1);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]);
      [pa, pb].forEach((p) => { ctx.beginPath(); ctx.moveTo(P.gx0, P.Y(p)); ctx.lineTo(P.gx1, P.Y(p)); ctx.stroke(); });
      ctx.setLineDash([]);
      D.label(P.gx0 + (PHONE ? 90 : 100), P.Y(pb) - 12, '급변 구간 pH ' + pa.toFixed(2) + ' ~ ' + pb.toFixed(2), { size: 13, bg: '#fff', color: '#b91c1c' });
      IK.forEach((k) => { const d = IND[k]; D.label(P.gx1 - 6, (P.Y(d.hi) + P.Y(d.lo)) / 2, d.name + ' ' + d.lo.toFixed(1) + '~' + d.hi.toFixed(1), { size: 13, bg: 'rgba(255,255,255,.82)', color: n.k === k ? '#111827' : '#334155', align: 'right', pad: 5 }); });
      IK.forEach((k) => {
        const r = n.res[k]; if (!r) return;
        const x = P.X(r.v), y = P.Y(pHc('ac', r.v));
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = indColor(k, IND[k].hi); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.8; ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12); ctx.restore();
      });
      const cx0 = P.X(n.V), cy0 = P.Y(pH);
      D.glow(cx0, cy0, 20, '#8b5cf6', 0.4); D.sphere(cx0, cy0, 7.5, indColor(n.k, pH), { outline: '#26324a', outlineWidth: 2 });
      if (n.pulse > 0.02) D.ring(cx0, cy0, 14 + 20 * (1 - n.pulse), t, { color: '#14a058', width: 2.6, speed: 0 });
    } else {
      // 식초 적정 장치
      const bx = PHONE ? 70 : 110, by0 = MAIN.y + 40, bh = PHONE ? 190 : 112;
      const stBase = MAIN.y + MAIN.h - 14;
      const bu = drawBurette(bx, by0 + 20, bh, VIN_V, { max: 50, w: PHONE ? 22 : 26 });
      T(bx, by0 + 2, '0.100 M NaOH', 13, '#1d4ed8', 'center', 800);
      D.roundRect(bx - 70, stBase, 140, 10, 5); ctx.fillStyle = '#6b7280'; ctx.fill();
      const fby = stBase - 2, fh = PHONE ? 100 : 104;
      D.flask(bx, fby, 124, fh, { level: 0.5, liquid: indColor('pp', 11), t });
      T(bx + (PHONE ? 62 : 98), bu.yOf(VIN_V) + 4, '23.5 mL', PHONE ? 12.5 : 13.5, '#dc2626', 'left', 800);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + (PHONE ? 36 : 44), bu.yOf(VIN_V)); ctx.lineTo(bx + (PHONE ? 58 : 94), bu.yOf(VIN_V)); ctx.stroke();
      void P;
    }
    // 플라스크 카드 (지시약 비교) / 문제 카드 (식초)
    const f = g.fl;
    D.roundRect(f.x, f.y, f.w, f.h, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    if (n.mode === 'cmp') {
      T(f.x + 10, f.y + 20, PHONE ? '플라스크 + ' + IND[n.k].name : '플라스크 (CH₃COOH 20.0 mL + ' + IND[n.k].name + ')', PHONE ? 12.5 : 13.5, INK, 'left', 800);
      const fcx = f.x + (PHONE ? 62 : 90), fby = f.y + f.h - 22, fh = PHONE ? 96 : 112, fw = PHONE ? 104 : 124;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fcx, f.y + 28); ctx.lineTo(fcx, fby - fh - 12); ctx.stroke();
      D.flask(fcx, fby, fw, fh, { level: 0.5 + 0.12 * n.V / 30, liquid: indColor(n.k, pH), t });
      const tx = f.x + (PHONE ? 122 : 176);
      T(tx, f.y + 54, 'NaOH ' + n.V.toFixed(2) + ' mL', PHONE ? 14 : 17, '#1d4ed8', 'left', 800);
      T(tx, f.y + (PHONE ? 76 : 82), 'pH ' + pH.toFixed(2), PHONE ? 14 : 17, '#5b21b6', 'left', 800);
      T(tx, f.y + (PHONE ? 100 : 110), IND[n.k].note, PHONE ? 12.5 : 14, MUTED, 'left', 800);
      T(tx, f.y + (PHONE ? 122 : 134), n.run ? (PHONE ? '적정 중…' : '적정하는 중…') : (n.res[n.k] ? (PHONE ? '기록됨' : '종말점 기록됨') : '▶ 적정하기'), PHONE ? 12.5 : 14, n.run ? '#b45309' : '#14803f', 'left', 800);
    } else {
      T(f.x + 10, f.y + 22, '문제', 14.5, '#b45309', 'left', 800);
      textBlock(f.x + 12, f.y + 48, f.w - 24, '식초 20.0 mL를 0.100 M NaOH로 적정했더니 페놀프탈레인이 분홍색으로 변하는 때가 NaOH 23.5 mL였어요.', PHONE ? 13 : 14.5, INK, PHONE ? 19 : 22, 700);
      textBlock(f.x + 12, f.y + (PHONE ? 130 : 142), f.w - 24, '식초의 산은 아세트산(1가 산)이에요. aMV = bM′V′', PHONE ? 12.5 : 14, MUTED, 19, 700);
    }
    const rs = g.res;
    D.roundRect(rs.x, rs.y, rs.w, rs.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    if (n.mode === 'cmp') {
      const cA = rs.x + 8, cB = rs.x + (PHONE ? 96 : 124), cC = rs.x + (PHONE ? 140 : 190), cD = rs.x + rs.w - 8;
      T(cA, rs.y + 20, '지시약', 13, MUTED, 'left', 800); T(cB, rs.y + 20, '종말점', 13, MUTED, 'left', 800); T(cC, rs.y + 20, '오차', 13, MUTED, 'left', 800); T(cD, rs.y + 20, PHONE ? '폭' : '변색 폭', 13, MUTED, 'right', 800);
      IK.forEach((k, i) => {
        const yy = rs.y + 44 + i * (PHONE ? 28 : 26), r = n.res[k];
        if (n.k === k) { D.roundRect(rs.x + 4, yy - 17, rs.w - 8, 24, 7); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); }
        D.sphere(cA + 5, yy - 5, 5, indColor(k, IND[k].hi), { gloss: false, outline: '#26324a', outlineWidth: 1 });
        T(cA + 14, yy, IND[k].name, PHONE ? 11 : 13, INK, 'left', 800);
        T(cB, yy, r ? r.v.toFixed(2) : '—', 13.5, r ? INK : '#b0b8c8', 'left', 800);
        T(cC, yy, r ? sgn(r.err) : '—', 13.5, r ? (Math.abs(r.err) <= 0.1 ? '#14803f' : '#b91c1c') : '#b0b8c8', 'left', 800);
        T(cD, yy, r ? r.sp.toFixed(2) + (PHONE ? '' : ' mL') : '—', 13.5, r ? (r.sp <= 0.2 ? '#14803f' : '#b91c1c') : '#b0b8c8', 'right', 800);
      });
      T(rs.x + rs.w / 2, rs.y + rs.h - 8, PHONE ? '오차 = 종말점 − 20.00 mL' : '오차 = 종말점 − 당량점,  폭 = 변색에 걸린 부피', PHONE ? 11.5 : 12.5, MUTED, 'center', 700);
    } else {
      T(rs.x + 12, rs.y + 22, '계산', 14.5, '#b45309', 'left', 800);
      const done = vinRow.ok || (game && game.free);
      T(rs.x + 12, rs.y + 50, 'aMV = bM′V′  (a = b = 1)', PHONE ? 13 : 15, INK, 'left', 800);
      T(rs.x + 12, rs.y + 76, 'M × 20.0 mL = 0.100 M × 23.5 mL', PHONE ? 13 : 15, INK, 'left', 800);
      T(rs.x + 12, rs.y + 104, 'M = ' + (done ? VIN_M.toFixed(4) + ' M ≈ 0.118 M' : '?'), PHONE ? 14 : 16, done ? '#14803f' : '#5b21b6', 'left', 800);
    }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    let ttl, body;
    if (n.mode === 'vin') { ttl = '곡선으로 해석한 식초 적정'; body = '식초(약산) + NaOH 적정이라 당량점의 pH는 7보다 커요. 그래서 페놀프탈레인으로 변색을 보면 종말점이 당량점과 거의 같아요. 변색 부피 23.5 mL로 aMV = bM′V′를 써서 농도를 구해요.'; }
    else {
      ttl = '약산 적정에 알맞은 지시약은?';
      body = '지시약을 고르고 “적정하기”를 눌러요. 종말점은 색이 완전히 바뀐 지점이고 폭은 색이 변하기 시작해서 끝날 때까지 걸린 NaOH의 부피예요. 변색 범위가 빨간 점선(급변 구간) 안에 있어야 해요.';
      if (n.res.mo && n.res.pp) body = '메틸 오렌지(3.1~4.4)는 NaOH ' + n.res.mo.v.toFixed(2) + ' mL에서 이미 변색이 끝나 종말점이 당량점보다 ' + Math.abs(n.res.mo.err).toFixed(2) + ' mL나 일러요. 페놀프탈레인(8.2~10.0)은 급변 구간(pH 7.04 ~ 10.40) 안에서 변해 오차가 ' + Math.abs(n.res.pp.err).toFixed(2) + ' mL로 작아요.';
      if (n.res.btb && n.res.mo && n.res.pp) body += ' BTB(6.0~7.6)는 종말점은 가깝지만 변색에 NaOH ' + n.res.btb.sp.toFixed(2) + ' mL가 걸려 색이 천천히 바뀌어 끝점을 정하기 어려워요.';
    }
    T(INFO.x + 16, INFO.y + 26, ttl, 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  function onLeave(m) { if (m === 'ind') S.ind.run = null; if (m === 'half') S.hf.drag = false; }
  /* ---------- 포인터 (반당량점 곡선 위 점 끌기) ---------- */
  const hfPlot = () => plotArea(pbG().r, 30);
  const hfX = (x) => { const P = hfPlot(); return (x - P.gx0) / (P.gx1 - P.gx0) * 30; };
  const inHf = (p) => { const P = hfPlot(); return p.x >= P.gx0 - 12 && p.x <= P.gx1 + 12 && p.y >= P.gy0 - 12 && p.y <= P.gy1 + 16; };
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'half' && inHf(p)) { S.hf.drag = true; hfSetV(hfX(p.x)); return true; } return false; },
    move(p) { if (S.hf.drag) hfSetV(hfX(p.x)); },
    up() { if (S.hf.drag) { S.hf.drag = false; S.hf.seen[S.hf.acid + S.hf.V] = true; updateCtl(); } },
    hover(p) { return S.mode === 'half' && inHf(p) ? 'ew-resize' : 'default'; },
  });

  /* ---------- UI 요소 ---------- */
  S.cm.bad = {};
  const mkList = $('#mkList');
  MARKS.forEach((m) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.id = m.id; b.textContent = m.t; b.addEventListener('click', () => cmMark(m.id)); mkList.appendChild(b); });
  const spList = $('#spList');
  EQS.forEach(([id, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.id = id; b.textContent = t; b.addEventListener('click', () => { Sound.click(); S.eq.sp[id] = !S.eq.sp[id]; updateCtl(); }); spList.appendChild(b); });
  makeChips($('#acSel'), [['ac', 'CH₃COOH'], ['fa', 'HCOOH']], (v) => hfAcid(v));
  makeChips($('#eqQ'), [[10, '10 mL (반당량점)'], [20, '20 mL (당량점)'], [25, '25 mL']], (v) => eqSet(+v));
  makeChips($('#indSel'), IK.map((k) => [k, IND[k].name]), (v) => indSelect(v));
  const pkRows = [
    mkRow($('#pkHost'), { label: 'CH₃COOH의 반당량점 pH', ans: pHr('ac', 10), tol: 0.015, ph: '0.00' }, () => updateCtl()),
    mkRow($('#pkHost'), { label: 'HCOOH의 반당량점 pH', ans: pHr('fa', 10), tol: 0.015, ph: '0.00' }, () => updateCtl()),
    mkRow($('#pkHost'), { label: 'CH₃COOH의 Ka = 10^(−pH)', sci: true, ans: ACIDS.ac.Ka, rel: 0.04 }, () => updateCtl()),
  ];
  const eqRows = [
    mkRow($('#eqHost'), { label: '[OH⁻] = √(Kh·C) (M)', sci: true, ans: eqX, rel: 0.05 }, () => updateCtl()),
    mkRow($('#eqHost'), { label: 'pH = 14 − pOH', ans: eqPhTheory, tol: 0.015, ph: '0.00' }, () => updateCtl()),
  ];
  const vinRow = mkRow($('#vinHost'), { label: '아세트산의 농도 M', ans: VIN_M, tol: 0.0025, ph: '0.000', unit: 'M' }, () => updateCtl());
  $('#bLoad').addEventListener('click', cmLoad);
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cm.view = b.dataset.v; updateCtl(); }));
  $$('#ovSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cm.ov = b.dataset.v === 'on'; updateCtl(); }));
  const sV = $('#sV');
  sV.addEventListener('input', () => hfSetV(+sV.value));
  $('#vMinus').addEventListener('click', () => hfSetV(S.hf.V - 1)); $('#vPlus').addEventListener('click', () => hfSetV(S.hf.V + 1));
  $$('#imSeg button').forEach((b) => b.addEventListener('click', () => indMode(b.dataset.v)));
  $('#bRun').addEventListener('click', indStart); $('#bRst').addEventListener('click', indReset);

  function uiExtra() {
    if (typeof vinRow === 'undefined') return;
    const cm = S.cm, hf = S.hf, eq = S.eq, n = S.ind;
    const stdLeft = STD_V.some((v) => !cm.table.some((p) => p.Vc === Math.round(v * 100)));
    $('#bLoad').disabled = !stdLeft; $('#bLoad').textContent = stdLeft ? '📥 자료표 불러오기' : '✅ 자료표를 불러왔어요';
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === cm.view));
    $$('#ovSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'on') === cm.ov));
    $$('#mkList .opt').forEach((b) => { const m = MARKS.find((q) => q.id === b.dataset.id); b.classList.toggle('on', !!cm.marks[m.id]); b.classList.toggle('bad', !!cm.bad[m.id]); });
    markChips($('#acSel'), hf.acid);
    sV.value = hf.V; $('#oV').textContent = hf.V + ' mL'; $('#vMinus').disabled = hf.V <= 0; $('#vPlus').disabled = hf.V >= 30;
    markChips($('#eqQ'), eq.sel);
    $$('#spList .opt').forEach((b) => b.classList.toggle('on', !!eq.sp[b.dataset.id]));
    $$('#imSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === n.mode));
    markChips($('#indSel'), n.k, { mo: n.res.mo, btb: n.res.btb, pp: n.res.pp });
    $$('#indSel button').forEach((b) => { b.disabled = !!n.run; });
    $('#bRun').disabled = !!n.run; $('#bRun').textContent = n.run ? '⏳ 적정하는 중…' : (n.res[n.k] ? '▶ 다시 적정하기' : '▶ 적정하기');
  }

  function readouts() {
    const m = S.mode;
    if (m === 'cmp') { const pts = cmPts(); setRead('찍은 점', pts.length + '개', '표시한 차이점', cmMarkN() + ' / 4', '강산 곡선', S.cm.ov ? '겹침' : '끔'); }
    else if (m === 'half') { const h = S.hf, tc = pbTargets(h.V); setRead(ACIDS[h.acid].f + ' · NaOH', h.V + ' mL', 'pH', hfPh().toFixed(2), 'HA : A⁻ (개)', tc.HA + ' : ' + tc.A); }
    else if (m === 'eq') { const e = S.eq, tc = pbTargets(e.V); setRead('넣은 NaOH', e.V + ' mL', 'pH', pHr('ac', e.V).toFixed(2), 'HA · A⁻ · OH⁻ (개)', tc.HA + ' · ' + tc.A + ' · ' + tc.OH); }
    else { const n = S.ind; if (n.mode === 'vin') setRead('식초 20.0 mL', '0.100 M NaOH', '변색 부피', '23.5 mL', '아세트산 농도', vinRow.ok || (game && game.free) ? VIN_M.toFixed(3) + ' M' : '?'); else { const r = n.res[n.k]; setRead('지시약', IND[n.k].name, '종말점', r ? r.v.toFixed(2) + ' mL' : '—', '오차 · 변색 폭', r ? sgn(r.err) + ' · ' + r.sp.toFixed(2) + ' mL' : '—'); } }
  }

  /* ================= 미션 ================= */
  const pkSeen = () => !!(S.hf.seen.ac10 && S.hf.seen.fa10);
  const eqSpOk = () => { const sp = S.eq.sp; return !!sp.a && !!sp.na && !sp.ha && !sp.oh && !sp.h3o; };
  const levels = [
    {
      title: '곡선 비교: 약산 vs 강산', short: '곡선 비교', icon: '📈', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 아세트산 용액을 강염기로 적정하면 강산의 곡선과 무엇이 같고 무엇이 다를까? 곡선에서 산의 세기를 읽을 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> HCl을 NaOH로 적정한 곡선(당량점 pH 7)을 그렸고, CH₃COOH가 약산(Ka = 1.8×10⁻⁵)이라는 것도 배웠어요. 같은 NaOH로 약산을 적정하면 곡선이 어떻게 달라질까요?</div>' +
        '<p>0.100 M CH₃COOH 20.0 mL를 0.100 M NaOH로 적정한 자료를 그래프에 찍고 선으로 이은 뒤, <b>강산 곡선을 겹쳐</b> 같은 점과 다른 점을 찾아 곡선 위에 표시해요.</p>',
      features: ['cmp'],
      setup() { S.gate = ''; cmReset(); S.cm.bad = {}; setScene('cmp'); },
      recap: '약산–강염기 곡선은 강산 곡선과 당량점의 부피(20.0 mL)는 같지만 시작 pH가 높고(2.87), 초반에 오른 뒤 완만한 구간이 있고, 당량점의 pH가 7보다 크며(8.72), 급변 폭이 좁아요(7.04 → 10.40).',
      summary: '<ul><li>0.100 M CH₃COOH 20.0 mL + 0.100 M NaOH: 0 mL <b>2.87</b>, 10.0 mL <b>4.74</b>, 20.0 mL <b>8.72</b>, 25.0 mL <b>12.05</b></li><li>강산–강염기 곡선과 <b>같은 점</b>: 당량점의 부피 20.0 mL(몰수가 같아요), 과량의 NaOH를 넣은 뒤의 pH</li><li><b>다른 점 4가지</b>: ① 시작 pH 2.87(강산 1.00) ② 초반에 빨리 오른 뒤 완만한 구간(완충 구간) ③ 당량점 pH 8.72(강산 7.00) ④ 급변 폭 7.04 → 10.40(강산 3.60 → 10.40)</li><li>약산은 일부만 이온화해서 처음 [H⁺]가 작고, 당량점의 생성물 CH₃COO⁻가 물과 반응해 OH⁻를 만들어요.</li></ul>',
      missions: [
        {
          title: '곡선 그리고 강산 곡선 겹치기',
          goal: '<b>자료표 불러오기</b>로 점을 찍고 <b>선 연결</b>한 뒤 <b>강산 곡선 겹치기</b>를 켜서 두 곡선을 비교하세요.',
          hint: '“📥 자료표 불러오기” → “〰 선 연결” → “강산 곡선 겹치기” 순서로 눌러요.',
          setup() { S.gate = ''; setScene('cmp'); },
          check: () => cmDone(), hold: 0.8,
          status: () => '점 ' + cmPts().length + '개 ' + mark(cmPts().length >= 12) + ' 선 ' + mark(S.cm.view === 'line') + ' 강산 곡선 ' + mark(S.cm.ov),
          explain: '약산 곡선(보라색)이 강산 곡선(파란 점선)보다 처음에는 위에 있다가 당량점 근처에서 급변하고, 25 mL 이후에는 거의 겹쳐요.',
        },
        {
          title: '강산 곡선과 다른 점 표시하기', manual: true,
          goal: '두 곡선을 비교해 <b>다른 점을 3개 이상</b> 눌러 곡선 위에 표시하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시작 pH, 곡선의 모양, 당량점의 pH, 급변하는 폭을 살펴보세요. 두 곡선이 같은 부분(당량점의 부피, 끝부분의 pH)은 다른 점이 아니에요.',
          setup() { S.gate = 'mk'; setScene('cmp'); updateCtl(); },
          check() { const n = cmMarkN(); return n >= 3 ? true : (n ? n + '개 표시했어요. ' : '') + '다른 점을 3개 이상 눌러 표시해 주세요. (강산 곡선 겹치기를 켜야 해요)'; },
          status: () => '표시한 차이점 ' + cmMarkN() + ' / 3',
          explain: '다른 점: ① 시작 pH 2.87(강산 1.00) ② 초반에 빨리 오른 뒤 완만한 구간 ③ 당량점 pH 8.72(강산 7.00) ④ 급변 폭 3.36(강산 6.80). 이 중 ②의 완만한 구간이 다음 단계의 반당량점과 연결돼요.',
        },
        {
          type: 'quiz', title: '당량점의 부피가 같은 까닭',
          goal: '약산 CH₃COOH 곡선의 당량점 부피가 강산 HCl 곡선과 <b>같은 20.0 mL</b>인 까닭은?',
          setup() { S.gate = ''; setScene('cmp'); },
          choices: ['산의 몰수(2.00 mmol)가 같아서 반응에 필요한 NaOH의 몰수도 같기 때문이에요', '약산은 세기가 약해서 NaOH가 더 필요하기 때문이에요', '약산은 일부만 이온화하므로 NaOH가 덜 필요하기 때문이에요', '당량점의 부피는 pH가 7일 때로 정해지기 때문이에요'],
          answer: 0,
          feedback: ['', '세기와 상관없이 필요한 NaOH의 양은 산의 전체 몰수로 정해져요. NaOH가 H⁺를 가져가면 평형이 이동해 남은 CH₃COOH도 계속 이온화해요.', '이온화하지 않은 CH₃COOH도 NaOH가 H⁺를 가져가면 이온화(평형 이동)해서 모두 반응해요.', '약산의 당량점은 pH 8.72로 7이 아니에요. 당량점은 산과 염기의 몰수가 같은 지점이에요.'],
          explain: 'CH₃COOH 0.100 M × 20.0 mL = 2.00 mmol은 NaOH 2.00 mmol과 1 : 1로 반응해요. aMV = bM′V′ 에서 V = 20.0 mL로 강산과 같아요. 다른 것은 당량점의 pH예요.',
        },
      ],
    },
    {
      title: '반당량점: pH = pKa', short: '반당량점', icon: '🎯', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 약산 곡선에는 pH가 천천히 오르는 <b>완만한 구간</b>이 있었어요. 그 한가운데, 당량점 부피의 절반인 <b>반당량점</b>에서는 무슨 일이 일어날까요?</div>' +
        '<p>반당량점(NaOH 10.0 mL)에서는 CH₃COOH 절반이 CH₃COO⁻로 바뀌어 둘의 양이 같아요. Ka = [H⁺][CH₃COO⁻]/[CH₃COOH] 에서 두 농도가 같으면 <b>Ka = [H⁺]</b>, 즉 <b>pH = pKa</b>예요. 곡선에서 pKa를 읽어 산의 세기를 알아봐요.</p>',
      features: ['half'],
      setup() { S.gate = ''; S.hf.acid = 'ac'; S.hf.V = 6; S.hf.seen = {}; pkRows.forEach((r) => r.clear()); setScene('half'); },
      recap: '반당량점에서는 [HA] = [A⁻]이므로 Ka = [H⁺], pH = pKa예요. CH₃COOH는 pKa 4.74(Ka = 1.8×10⁻⁵), HCOOH는 pKa 3.74(Ka = 1.8×10⁻⁴)라서 pKa가 작은 산일수록 반당량점이 아래에 있고 더 센 산이에요.',
      summary: '<ul><li>반당량점 = 당량점 부피의 절반(10.0 mL). 이때 CH₃COOH와 CH₃COO⁻의 양이 같아요.</li><li>Ka = [H⁺][A⁻]/[HA] 에서 [A⁻] = [HA] 이면 <b>Ka = [H⁺]</b> → <b>pH = pKa</b> (헨더슨–하셀바흐 식 없이 Ka 식에서 바로)</li><li>CH₃COOH: 반당량점 pH <b>4.74</b> → Ka = 10⁻⁴·⁷⁴ = <b>1.8×10⁻⁵</b></li><li>HCOOH: 반당량점 pH <b>3.74</b> → Ka = <b>1.8×10⁻⁴</b> (더 센 산, 곡선이 아래로 이동)</li><li>곡선으로 산의 세기(pKa)를 읽을 수 있어요.</li></ul>',
      missions: [
        {
          title: '반당량점 pH 읽고 Ka 구하기',
          goal: '두 산의 곡선에서 <b>반당량점(10 mL)의 pH</b>를 읽고, CH₃COOH의 <b>Ka</b>를 구하세요.',
          hint: '점을 10 mL로 옮기고 pH를 읽어요. 산을 바꾸면 곡선이 바뀌어요. Ka = 10^(−pH) = 10^(−4.74) = 1.8×10⁻⁵ 예요.',
          setup() { S.gate = 'pk'; pkRows.forEach((r) => r.clear()); S.hf.acid = 'ac'; setScene('half'); updateCtl(); },
          check: () => pkRows.every((r) => r.ok) && pkSeen(), hold: 0.5,
          status: () => '10 mL 확인 ' + mark(pkSeen()) + ' pH ' + mark(pkRows[0].ok && pkRows[1].ok) + ' Ka ' + mark(pkRows[2].ok),
          explain: 'CH₃COOH: 반당량점 pH 4.74 = pKa → Ka = 10⁻⁴·⁷⁴ = 1.8×10⁻⁵. HCOOH: pH 3.74 = pKa → Ka = 1.8×10⁻⁴. 두 산 모두 pH가 pKa와 같아요.',
        },
        {
          type: 'quiz', title: 'pKa가 작은 산의 곡선',
          goal: 'HCOOH(pKa 3.74)의 곡선은 CH₃COOH(pKa 4.74)보다 반당량점이 <b>아래</b>에 있었어요. 이것이 뜻하는 것은?',
          setup() { S.gate = ''; setScene('half'); },
          choices: ['pKa가 작을수록 Ka가 커서 더 센 산이에요', 'pKa가 작을수록 Ka가 작아서 더 약한 산이에요', '두 산의 세기는 같고 곡선만 이동한 거예요', '반당량점의 pH는 산의 세기와 관계가 없어요'],
          answer: 0,
          feedback: ['', 'pKa = −log Ka 라서 pKa가 작을수록 Ka가 커요 (3.74 → 1.8×10⁻⁴, 4.74 → 1.8×10⁻⁵).', '반당량점의 pH(= pKa)가 달라서 Ka가 10배 차이가 나요. 세기가 달라요.', '반당량점에서는 pH = pKa이므로 pH가 산의 세기를 알려 줘요.'],
          explain: 'pH = pKa = −log Ka 이므로 반당량점 pH가 낮을수록 Ka가 커서 센 산이에요. HCOOH의 Ka(1.8×10⁻⁴)는 CH₃COOH(1.8×10⁻⁵)의 10배예요.',
        },
      ],
    },
    {
      title: '당량점 pH: 왜 7보다 클까', short: '당량점 pH', icon: '🧪', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 곡선 한가운데(반당량점)에서 pKa를 읽었어요. 이제 <b>당량점</b>의 pH가 8.72로 7보다 큰 까닭을 알아봐요. 앞에서 배운 <b>염의 가수 분해</b>가 열쇠예요.</div>' +
        '<p>당량점(20 mL)에서는 CH₃COOH가 모두 CH₃COO⁻로 바뀌어 용액에는 <b>CH₃COONa 0.0500 M</b>만 있어요. CH₃COO⁻는 약산의 짝염기라서 물과 반응해 OH⁻를 만들어요.</p>',
      features: ['eq'],
      setup() { S.gate = ''; eqSet(20); S.eq.sp = {}; eqRows.forEach((r) => r.clear()); setScene('eq'); },
      recap: '당량점의 용액은 CH₃COONa이고, CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ 로 OH⁻가 생겨 pH가 7보다 커요. [OH⁻] = √(Kh·C) = 5.2×10⁻⁶ M → pH 8.72로 곡선의 값과 같아요.',
      summary: '<ul><li>당량점(20.0 mL): CH₃COOH 2.00 mmol + NaOH 2.00 mmol → CH₃COONa 2.00 mmol, 전체 40.0 mL → <b>0.0500 M</b></li><li>CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ (가수 분해), Ka = 10⁻⁴·⁷⁴ = 1.82×10⁻⁵ → Kh = Kw/Ka ≈ <b>5.5×10⁻¹⁰</b></li><li>[OH⁻] = √(Kh·C) = √(5.5×10⁻¹⁰ × 0.0500) = <b>5.2×10⁻⁶ M</b> → pOH 5.28 → pH = <b>8.72</b></li><li>곡선의 값(8.72)과 이론값이 같아요. 당량점이 항상 pH 7인 것은 아니에요. 강산–강염기에서만 7이에요.</li><li>25 mL: 과량의 OH⁻가 pH를 정해요 (pH 12.05).</li></ul>',
      missions: [
        {
          title: '당량점 용액의 입자 고르기', manual: true,
          goal: '당량점(20 mL)의 용액에 <b>많이 들어 있는 입자</b>를 모두 골라 <b>✔ 확인하기</b>를 누르세요. (물 분자는 제외)',
          hint: '지점을 20 mL로 하고 입자 상자를 살펴보세요. CH₃COOH와 NaOH는 모두 반응해서 사라졌어요.',
          setup() { S.gate = 'sp'; eqSet(20); S.eq.sp = {}; setScene('eq'); updateCtl(); },
          check() {
            const sp = S.eq.sp, sel = EQS.filter((q) => sp[q[0]]).map((q) => q[0]);
            if (!sel.length) return '입자를 골라 주세요.';
            if (sp.ha) return 'CH₃COOH는 모두 반응했어요. 가수 분해로 생기는 양은 아주 적어요.';
            if (sp.oh) return 'NaOH가 남았다면 당량점을 지난 거예요. 당량점에서는 OH⁻가 아주 조금(5.2×10⁻⁶ M)만 있어요.';
            if (sp.h3o) return '이 용액은 염기성이라 H₃O⁺는 아주 적어요.';
            return eqSpOk() ? true : '더 있어요. CH₃COO⁻와 짝이 되는 양이온도 골라 보세요.';
          },
          status: () => '선택 ' + EQS.filter((q) => S.eq.sp[q[0]]).map((q) => q[1].split(' ')[0]).join(', '),
          explain: '당량점에는 CH₃COO⁻와 Na⁺가 같은 양(0.0500 M)씩 있어요. CH₃COOH와 OH⁻는 CH₃COO⁻의 가수 분해로 생긴 극소량(약 5×10⁻⁶ M)뿐이에요.',
        },
        {
          title: '당량점 pH 이론값 계산하기',
          goal: '0.0500 M CH₃COONa의 <b>[OH⁻]</b>와 <b>pH</b>를 계산해 곡선의 값과 비교하세요.',
          hint: 'Ka = 10⁻⁴·⁷⁴ = 1.82×10⁻⁵ 이므로 Kh = Kw/Ka ≈ 5.5×10⁻¹⁰, [OH⁻] = √(5.5×10⁻¹⁰ × 0.0500) = √(2.7×10⁻¹¹) ≈ 5.2×10⁻⁶ M. pOH = 5.28, pH = 14 − 5.28 = 8.72예요.',
          setup() { S.gate = 'eqc'; eqSet(20); eqRows.forEach((r) => r.clear()); setScene('eq'); updateCtl(); },
          check: () => eqRows.every((r) => r.ok), hold: 0.5,
          status: () => '[OH⁻] ' + mark(eqRows[0].ok) + ' &nbsp; pH ' + mark(eqRows[1].ok),
          explain: '[OH⁻] = √(Kh·C) = 5.2×10⁻⁶ M → pOH = 5.28 → pH = <b>8.72</b>. 곡선에서 20.0 mL의 pH(8.72)와 같아요. 가수 분해로 당량점의 pH를 정확히 예측할 수 있어요.',
        },
        {
          type: 'quiz', title: '당량점이 pH 7이 아닌 까닭',
          goal: '아세트산–수산화 나트륨 적정의 당량점이 <b>pH 7이 아닌</b> 까닭은?',
          setup() { S.gate = ''; setScene('eq'); },
          choices: ['당량점의 용액에서 CH₃COO⁻가 물과 반응해 OH⁻를 만들기 때문이에요', '당량점에서 NaOH가 조금 남아 있기 때문이에요', '당량점의 pH는 항상 7이고 측정이 틀린 거예요', '아세트산이 당량점에서 모두 H⁺로 바뀌기 때문이에요'],
          answer: 0,
          feedback: ['', '당량점은 산과 염기가 같은 몰수로 만나는 지점이라 NaOH가 남지 않아요. 남는 것은 염 CH₃COONa예요.', '당량점이 항상 pH 7인 것은 아니에요. 강산–강염기에서만 7이에요. 약산–강염기는 8.72로 7보다 커요.', '아세트산은 약산이라 H⁺로 모두 바뀌지 않아요. 당량점에서는 CH₃COO⁻가 돼요.'],
          explain: '생성물 CH₃COO⁻는 약산의 짝염기라서 CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻ 로 OH⁻를 만들어 pH가 7보다 커요. 강산–강염기에서는 Na⁺와 Cl⁻가 구경꾼이라 pH 7이에요.',
        },
      ],
    },
    {
      title: '지시약: 약산 적정에 알맞은 것', short: '지시약', icon: '🎨', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 약산 곡선은 당량점이 pH 8.72이고 급변 구간이 7.04 ~ 10.40으로 강산 때보다 좁고 위쪽에 있다는 것을 알았어요. 그러면 <b>어떤 지시약</b>을 써야 당량점을 정확히 찾을 수 있을까요?</div>' +
        '<p>변색 범위를 곡선에 겹쳐 보고 지시약 세 가지로 실제로 적정해 <b>종말점</b>(색이 완전히 바뀐 지점)과 변색에 걸린 부피(폭)를 비교해요. 그다음 식초의 농도를 구하는 문제도 풀어 봐요.</p>',
      features: ['ind'],
      setup() { S.gate = ''; const n = S.ind; n.run = null; n.V = 0; n.mode = 'cmp'; S.sub.ind = 'cmp'; n.res = { mo: null, btb: null, pp: null }; vinRow.clear(); setScene('ind'); },
      recap: '약산–강염기 적정에는 급변 구간(pH 7 ~ 10) 안에서 변하는 페놀프탈레인이 알맞아요. 메틸 오렌지는 NaOH 약 6 mL에서 이미 색이 변해 종말점이 당량점보다 13 mL 이상 일찍 오고, BTB는 색이 천천히 바뀌어요.',
      summary: '<ul><li>급변 구간: 19.9 → 20.1 mL, pH <b>7.04 → 10.40</b> (강산–강염기 3.60 → 10.40)</li><li>페놀프탈레인(8.2 ~ 10.0): 종말점 20.04 mL, 오차 +0.04 mL, 변색 폭 0.04 mL → <b>적합</b></li><li>메틸 오렌지(3.1 ~ 4.4): 종말점 6.27 mL, 오차 <b>−13.73 mL</b> → 부적합</li><li>BTB(6.0 ~ 7.6): 종말점 19.98 mL로 가깝지만 변색에 약 1.02 mL가 걸려 끝점을 정하기 어려워 부적합</li><li>식초 20.0 mL 적정: 변색 23.5 mL → M = 0.100 × 23.5 ÷ 20.0 = <b>0.118 M</b> (aMV = bM′V′)</li></ul>',
      missions: [
        {
          title: '메틸 오렌지와 페놀프탈레인으로 적정하기',
          goal: '<b>메틸 오렌지</b>와 <b>페놀프탈레인</b>으로 각각 “적정하기”를 눌러 종말점의 부피를 비교하세요.',
          hint: '지시약을 고르고 ▶ 적정하기를 눌러요. 종말점과 오차가 표에 기록돼요. BTB도 해 보면 비교가 더 잘 돼요.',
          setup() { S.gate = ''; S.ind.run = null; S.ind.V = 0; S.ind.mode = 'cmp'; S.sub.ind = 'cmp'; setScene('ind'); updateCtl(); },
          check: () => !!S.ind.res.mo && !!S.ind.res.pp, hold: 0.6,
          status: () => '메틸 오렌지 ' + mark(!!S.ind.res.mo) + ' 페놀프탈레인 ' + mark(!!S.ind.res.pp),
          explain: '메틸 오렌지의 종말점은 6.27 mL로 당량점(20.00 mL)보다 13.73 mL 일러요(NaOH 6 mL 부근에서 이미 pH 4.4). 페놀프탈레인은 20.04 mL로 거의 같아요.',
        },
        {
          title: '식초의 농도 구하기',
          goal: '식초 20.0 mL를 0.100 M NaOH로 적정해 <b>23.5 mL</b>에서 변색했어요. 식초의 <b>아세트산 농도</b>를 구하세요.',
          hint: 'aMV = bM′V′ 에서 a = b = 1 이므로 M × 20.0 = 0.100 × 23.5 입니다. M = 0.100 × 23.5 ÷ 20.0 이에요.',
          setup() { S.gate = 'vin'; S.ind.run = null; S.ind.mode = 'vin'; S.sub.ind = 'vin'; vinRow.clear(); setScene('ind'); updateCtl(); },
          check: () => vinRow.ok, hold: 0.4,
          status: () => '농도 ' + mark(vinRow.ok),
          explain: 'M = 0.100 M × 23.5 mL ÷ 20.0 mL = 0.1175 M ≈ <b>0.118 M</b>. 화학 단원의 식초 적정을 곡선으로 해석하면, 약산 적정이라 당량점이 pH 8.7이라서 페놀프탈레인으로 변색을 봤어요.',
        },
        {
          type: 'quiz', title: '메틸 오렌지를 쓰면 안 되는 까닭',
          goal: '약산–강염기 적정에 <b>메틸 오렌지</b>를 쓰면 안 되는 까닭은?',
          setup() { S.gate = ''; S.ind.mode = 'cmp'; S.sub.ind = 'cmp'; setScene('ind'); },
          choices: ['변색 범위(pH 3.1 ~ 4.4)가 당량점(pH 8.72)보다 훨씬 낮아서 당량점 전에 이미 색이 변하기 때문이에요', '메틸 오렌지는 염기에서는 색이 변하지 않기 때문이에요', '메틸 오렌지는 비싸서 쓰지 않아요', '약산 적정에서는 지시약을 쓸 수 없기 때문이에요'],
          answer: 0,
          feedback: ['', '메틸 오렌지는 pH 4.4 이상에서 노란색으로 변해 있어요. 문제는 색이 변하는 시점이에요.', '이유는 가격이 아니라 변색 범위예요.', '약산 적정에도 급변 구간에 맞는 지시약(페놀프탈레인)을 쓸 수 있어요.'],
          explain: '약산 곡선에서는 NaOH 약 6 mL(pH 4.4)에서 메틸 오렌지의 색이 이미 완전히 변해 종말점이 당량점(20 mL)보다 13 mL 이상 일찍 와요. 변색 범위가 급변 구간 안에 있어야 정확해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-titration-weak', mount: '#game', badge: '약산 적정 박사', homeHref: '../../index.html#hr',
    featureLabels: { cmp: '📈 그래프 · 강산 곡선 겹치기', half: '🎯 반당량점 · pKa 읽기', eq: '🧪 당량점 입자 · pH 계산', ind: '🎨 지시약 · 식초 적정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('cmp');
  function stepAll1(dt) { stepCmp(dt); stepHalf(dt); stepEq(dt); stepInd(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'cmp') drawCmp(t); else if (S.mode === 'half') drawHalf(t); else if (S.mode === 'eq') drawEq(t); else drawInd(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, IND, IK, STD_V, ACIDS, pHc, pHr, vEnd, vStart, cmG, pbG, inG, plotArea, pkRows, eqRows, vinRow, pbSlot, pbTargets, sysCount,
    cmLoad, cmMark, cmDone, cmPts, hfSetV, hfAcid, eqSet, indSelect, indStart, indReset, indMode, setScene, uiExtra, eqPhTheory, eqX, VIN_M,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
