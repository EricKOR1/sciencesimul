/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 강산-강염기 적정 곡선 [12반응01-03]
   ① 실험: 데이터 수집 (0.100 M HCl 20.0 mL + 0.100 M NaOH, 뷰렛으로 넣으며 pH 기록)  ② 분석: 곡선 그리기 (pH-부피 그래프, 4구간, 기울기 최대 = 당량점)
   ③ 모형: 이온 모형 (0 · 10 · 20 · 25 mL 지점의 H⁺ OH⁻ Na⁺ Cl⁻)  ④ 적용: 지시약 선택 (변색 범위와 급변 구간, 0.10 M / 0.010 M)
   pH는 전하 균형(h − Kw/h = −(NaOH 몰수 − HCl 몰수)/전체 부피)으로 정확히 계산해요. 약산 적정(⑥차시), 다양성자 산, 미분 곡선 수식은 다루지 않아요. 모든 용액은 25 °C. */
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



  const MODE_LABEL = { data: '🧪 데이터 수집', graph: '📈 곡선 그리기', ion: '🧩 이온 모형', ind: '🎨 지시약 선택' };
  const SPL = SciSim.ease;

  /* ---------- 화학: 0.100 M HCl 20.0 mL 를 NaOH 로 적정 (전하 균형으로 정확히 계산) ---------- */
  const VA = 20.0, C10 = 0.100, C01 = 0.010;
  const CONCV = { c10: C10, c01: C01 }, CONCT = { c10: '0.10 M', c01: '0.010 M' };
  function pHof(Cc, Vb) {
    const net = Cc * (Vb - VA) / (VA + Vb);                     // [OH⁻] − [H⁺] (알짜)
    const sq = Math.sqrt(net * net + 4 * KW);
    const h = net <= 0 ? (-net + sq) / 2 : 2 * KW / (net + sq);
    return -Math.log10(h);
  }
  const pHr = (Cc, Vb) => r2d(pHof(Cc, Vb));
  const STD_V = [0, 10, 15, 19, 19.9, 19.99, 20, 20.01, 20.1, 21, 25, 30, 40];
  const VMAX = 40;
  const fmtV = (vc) => (vc / 100).toFixed(2);

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
  /* 종말점: 변색이 끝나 색이 완전히 바뀐 가장 이른 부피 (0.01 mL 눈금) */
  const vEndCache = {};
  function vEnd(c, k) {
    const key = c + k; if (vEndCache[key] != null) return vEndCache[key];
    const Cc = CONCV[c], hi = IND[k].hi; let v = 0;
    for (let n = 0; n <= 4000; n++) { if (pHof(Cc, n / 100) >= hi) { v = n / 100; break; } }
    vEndCache[key] = v; return v;
  }
  /* 곡선 표본 (캐시) */
  const curveCache = {};
  function curvePts(c, xmax) {
    const key = c + xmax; if (curveCache[key]) return curveCache[key];
    const Cc = CONCV[c], vs = [];
    for (let v = 0; v <= xmax + 1e-9; v += 0.1) { if (v < 19.6 || v > 20.4) vs.push(+v.toFixed(3)); }
    for (let v = 19.6; v <= 20.4 + 1e-9; v += 0.005) vs.push(+v.toFixed(3));
    vs.sort((a, b) => a - b);
    return (curveCache[key] = vs.filter((v) => v <= xmax).map((v) => [v, pHof(Cc, v)]));
  }

  /* ---------- 상태 ---------- */
  const ZONES = [[0, 5, '초기', '#fde68a'], [5, 19.9, '완만', '#bfdbfe'], [19.9, 20.1, '급변', '#fca5a5'], [20.1, 40, '염기 과량', '#c4b5fd']];
  Object.assign(S, {
    mode: 'data', sub: {}, pred: null,
    dt: { Vc: 0, Vd: 0, step: 500, auto: true, pts: [], drops: [], pHd: 1, swirl: 0, valve: 0, shake: 0, init: false },
    gr: { view: 'pts', ov: 'none', lp: 0, linked: false },
    io: { V: 10, list: { H: [], Cl: [], Na: [], OH: [], W: [] }, acc: 0, seen: {}, init: false, pop: 0 },
    ind: { k: 'mo', c: 'c10', V: 0, Vd: 0, run: null, res: { c10: { mo: null, btb: null, pp: null }, c01: { mo: null, btb: null, pp: null } }, drip: 0, pulse: 0 },
  });
  const STEPS = [['500', '빠르게 +5 mL'], ['100', '+1 mL'], ['5', '한 방울 +0.05 mL'], ['1', '아주 조금 +0.01 mL']];
  const rect = (x, y, w, h) => ({ x, y, w, h });

  /* ---------- 공통 그림 도구 ---------- */
  function drawBurette(x, y0, h, reading, o) {
    o = o || {};
    const max = o.max || 50, w = o.w || 26, liquid = o.liquid || '#a9c8ff', top = y0 - 14, bot = y0 + h + 6;
    const yOf = (v) => y0 + (v / max) * h;
    ctx.save();
    ctx.save(); D.roundRect(x - w / 2, top, w, bot - top, 8); ctx.clip();
    const ly = yOf(clamp(reading, 0, max));
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, C.rgba(liquid, 0.95)); g.addColorStop(0.5, C.rgba(C.shade(liquid, 0.3), 0.8)); g.addColorStop(1, C.rgba(liquid, 0.95));
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, ly, w, bot - ly);
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
    ctx.save(); ctx.translate(x, vy + 6); ctx.rotate(o.open ? -1.2 : 0); D.roundRect(-13, -4, 26, 8, 4); ctx.fillStyle = o.open ? '#e2464b' : '#6b7280'; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(x - 4, vy + 16); ctx.lineTo(x + 4, vy + 16); ctx.lineTo(x + 1.5, vy + 32); ctx.lineTo(x - 1.5, vy + 32); ctx.closePath(); ctx.fill();
    ctx.restore();
    return { tipY: vy + 32, yOf };
  }
  function drawStand(poleX, bx0, bx1, baseY, topY, arms) {
    ctx.save();
    D.roundRect(bx0, baseY, bx1 - bx0, 10, 5); ctx.fillStyle = '#6b7280'; ctx.fill();
    D.roundRect(poleX - 4, topY, 8, baseY - topY + 4, 3); ctx.fillStyle = '#9ca3af'; ctx.fill();
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    (arms || []).forEach(([ay, ax]) => { ctx.beginPath(); ctx.moveTo(poleX, ay); ctx.lineTo(ax, ay); ctx.stroke(); });
    ctx.restore();
  }
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
  function strokeCurve(P, c, color, w, alpha) {
    const pts = curvePts(c, P.xmax);
    ctx.save(); ctx.beginPath(); ctx.rect(P.gx0, P.gy0 - 2, P.gx1 - P.gx0, P.gy1 - P.gy0 + 4); ctx.clip();
    ctx.strokeStyle = C.rgba(color, alpha == null ? 1 : alpha); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(P.X(q[0]), P.Y(q[1])) : ctx.moveTo(P.X(q[0]), P.Y(q[1]))));
    ctx.stroke(); ctx.restore();
  }
  const phWater = (pH) => C.mix('#d8ecff', phColor(pH), 0.8);

  /* ============ ① 데이터 수집 ============ */
  const dtG = () => (PHONE
    ? { bx: 64, y0: 92, bh: 226, bx0: 14, bx1: 160, base: MAIN.y + MAIN.h - 12, pole: 150, bk: { x: 18, y: 366, w: 112, h: 96 }, probeX: 112, probeTop: 336,
        meter: rect(MAIN.x + 182, MAIN.y + 8, 282, 100), tbl: rect(MAIN.x + 182, MAIN.y + 116, 282, 300), cols: 2, rows: 12, rh: 22 }
    : { bx: 110, y0: 84, bh: 130, bx0: 24, bx1: 236, base: MAIN.y + MAIN.h - 12, pole: 215, bk: { x: 42, y: 268, w: 132, h: 110 }, probeX: 156, probeTop: 246,
        meter: rect(MAIN.x + 250, MAIN.y + 8, 518, 80), tbl: rect(MAIN.x + 250, MAIN.y + 98, 518, 236), cols: 3, rows: 8, rh: 24 });
  const dtPh = () => pHr(C10, S.dt.Vc / 100);
  const dtCap = 24;
  function dtRecord(quiet) {
    const d = S.dt, vc = d.Vc;
    if (d.pts.some((p) => p.Vc === vc)) { if (!quiet) showHint('이 부피는 이미 기록했어요. NaOH를 더 넣고 기록해요.', 2600); return false; }
    if (d.pts.length >= dtCap) { if (!quiet) showHint('기록표가 가득 찼어요. “새 시료”로 다시 시작해요.', 2800); return false; }
    d.pts.push({ Vc: vc, ph: dtPh(), t0: S.t }); d.pts.sort((a, b) => a.Vc - b.Vc); Sound.tick(); updateCtl(); return true;
  }
  function dtAdd() {
    const d = S.dt;
    if (d.Vc >= VMAX * 100) { showHint('뷰렛 눈금 40 mL까지만 넣어요. “새 시료”로 다시 시작할 수 있어요.', 3000); d.shake = 0.4; Sound.fail(); return; }
    const old = d.Vc; d.Vc = Math.min(VMAX * 100, d.Vc + d.step);
    const g = dtG(), n = clamp(Math.round((d.Vc - old) / 100), 1, 6);
    for (let i = 0; i < n; i++) d.drops.push({ x: g.bx, y: -1, vy: 0, delay: i * 0.1, live: false });
    Sound.click();
    if (d.auto) dtRecord(true);
    updateCtl();
  }
  function dtNew() {
    const d = S.dt; d.Vc = 0; d.Vd = 0; d.pts = []; d.drops = []; d.pHd = 1; d.swirl = 0; d.valve = 0; Sound.click(); updateCtl();
  }
  function stepData(dt) {
    const d = S.dt, g = dtG();
    d.Vd = ap(d.Vd, d.Vc / 100, dt, 5); if (Math.abs(d.Vd - d.Vc / 100) < 0.004) d.Vd = d.Vc / 100;
    const tgt = dtPh(); d.pHd = ap(d.pHd, tgt, dt, 4.5); if (Math.abs(d.pHd - tgt) < 0.004) d.pHd = tgt;
    d.swirl = ap(d.swirl, 0, dt, 2.2); d.shake = ap(d.shake, 0, dt, 5);
    const surf = g.bk.y + 5 + (g.bk.h - 11) * (1 - dtLevel());
    const tipY = g.y0 + g.bh + 6 + 6 + 32;
    d.valve = ap(d.valve, d.drops.length ? 1 : 0, dt, 12);
    for (let i = d.drops.length - 1; i >= 0; i--) {
      const q = d.drops[i];
      if (!q.live) { q.delay -= dt; if (q.delay <= 0) { q.live = true; q.y = tipY; q.vy = 40; } continue; }
      q.vy += 900 * dt; q.y += q.vy * dt;
      if (q.y >= surf) {
        d.drops.splice(i, 1); d.swirl = 1;
        for (let k = 0; k < 4; k++) parts.emit({ x: q.x, y: surf, vx: (Math.random() - 0.5) * 70, vy: -60 - Math.random() * 50, life: 0.45, size: 2.2, color: '#7aa7ff', gravity: 420, shape: 'circle' });
      }
    }
  }
  const dtLevel = () => 0.36 + 0.3 * clamp(S.dt.Vd / VMAX, 0, 1);
  function drawData(t) {
    const d = S.dt, g = dtG();
    T(14, 26, '🧪 NaOH를 조금씩 넣으며 pH를 기록해요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawStand(g.pole, g.bx0, g.bx1, g.base, g.y0 - 8, [[g.y0 + 36, g.bx + 10], [g.probeTop, g.probeX + 6]]);
    const br = drawBurette(g.bx, g.y0, g.bh, clamp(d.Vd, 0, 50), { max: 50, liquid: '#9fc2ff', w: PHONE ? 22 : 26, open: d.valve > 0.5 });
    // 뷰렛 액면: NaOH를 넣은 만큼 내려가요 (눈금 0이 위)
    ctx.save(); const yv = br.yOf(clamp(d.Vd, 0, 50));
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.bx - 17, yv); ctx.lineTo(g.bx - 12, yv); ctx.stroke(); ctx.restore();
    T(g.bx - 16, g.y0 - 20, '0.100 M NaOH', PHONE ? 12.5 : 13.5, '#1d4ed8', 'center', 800);
    // 비커 + 용액
    const lvl = dtLevel(), col = phWater(d.pHd);
    ctx.save(); ctx.translate(g.bk.x + g.bk.w / 2, g.bk.y + g.bk.h); ctx.rotate(Math.sin(t * 15) * 0.012 * d.swirl); ctx.translate(-(g.bk.x + g.bk.w / 2), -(g.bk.y + g.bk.h));
    beaker(g.bk.x, g.bk.y, g.bk.w, g.bk.h, { level: lvl, color: col, alpha: 0.78 });
    ctx.restore();
    // 방울
    d.drops.forEach((q) => { if (q.live) { ctx.fillStyle = '#4a7df0'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 3.4, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(q.x - 1, q.y - 1.5, 1.1, 0, TAU); ctx.fill(); } });
    // pH 전극
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.probeX, g.probeTop); ctx.lineTo(g.probeX, g.bk.y + g.bk.h - 24); ctx.stroke();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(g.probeX - 1.5, g.probeTop + 4); ctx.lineTo(g.probeX - 1.5, g.bk.y + g.bk.h - 20); ctx.stroke();
    D.sphere(g.probeX, g.bk.y + g.bk.h - 20, 5.2, '#0ea5e9', { gloss: false });
    const mt = g.meter;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(g.probeX, g.probeTop); ctx.bezierCurveTo(g.probeX, g.probeTop - 44, mt.x - 30, mt.y + mt.h + 34, mt.x, mt.y + mt.h - 14); ctx.stroke();
    // pH 미터
    D.shadow(() => { D.roundRect(mt.x, mt.y, mt.w, mt.h, 12); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 6, y: 3 });
    T(mt.x + 14, mt.y + 24, 'pH 미터', 14, '#9ca3af', 'left', 800);
    const settled = Math.abs(d.pHd - dtPh()) < 0.01;
    T(mt.x + (PHONE ? 130 : 200), mt.y + mt.h - (PHONE ? 22 : 18), d.pHd.toFixed(2), PHONE ? 44 : 48, settled ? '#4ade80' : '#facc15', 'right', 800);
    T(mt.x + mt.w - 14, mt.y + (PHONE ? 30 : 34), 'NaOH ' + d.Vd.toFixed(2) + ' mL', PHONE ? 15 : 18, '#93c5fd', 'right', 800);
    T(mt.x + mt.w - 14, mt.y + (PHONE ? 54 : 58), '넣은 양 · 20.0 mL HCl에', PHONE ? 12.5 : 13.5, '#9ca3af', 'right', 700);
    T(mt.x + mt.w - 14, mt.y + (PHONE ? 76 : 78), d.auto ? '자동 기록 중' : '직접 기록 중', PHONE ? 12.5 : 13.5, d.auto ? '#86efac' : '#fcd34d', 'right', 800);
    // 기록표
    const tb = g.tbl;
    D.roundRect(tb.x, tb.y, tb.w, tb.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cw = (tb.w - 20) / g.cols;
    for (let c = 0; c < g.cols; c++) {
      const cx0 = tb.x + 10 + c * cw;
      T(cx0 + 6, tb.y + 21, 'V (mL)', 13, MUTED, 'left', 800); T(cx0 + cw - 14, tb.y + 21, 'pH', 13, MUTED, 'right', 800);
      if (c) { ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx0 - 2, tb.y + 8); ctx.lineTo(cx0 - 2, tb.y + tb.h - 8); ctx.stroke(); }
    }
    const n = d.pts.length;
    d.pts.forEach((p, i) => {
      const c = Math.floor(i / g.rows), r = i % g.rows, cx0 = tb.x + 10 + c * cw, yy = tb.y + 46 + r * g.rh;
      const pop = SPL.outBack(clamp((t - p.t0) / 0.35, 0, 1));
      if (t - p.t0 < 1.2) { D.roundRect(cx0 + 2, yy - 16, cw - 10, g.rh - 2, 6); ctx.fillStyle = 'rgba(251,191,36,' + 0.25 * (1 - (t - p.t0) / 1.2) + ')'; ctx.fill(); }
      ctx.save(); ctx.globalAlpha = clamp(pop, 0, 1);
      T(cx0 + 6, yy, fmtV(p.Vc), 14.5, INK, 'left', 800); T(cx0 + cw - 14, yy, p.ph.toFixed(2), 14.5, '#5b21b6', 'right', 800);
      ctx.restore();
    });
    if (!n) T(tb.x + tb.w / 2, tb.y + tb.h / 2 + 4, '“NaOH 넣기”를 누르면 기록표가 채워져요', 14, '#9a8ec0', 'center', 800);
    // 안내
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '0.100 M HCl 20.0 mL + 0.100 M NaOH', 15, '#b45309', 'left', 800);
    const body = n < 8 ? '한 방울씩 천천히 넣으면 pH 변화를 자세히 볼 수 있어요. 빠르게(+5 mL)로 먼저 넓게 보고, 당량점 가까이에서는 조금씩 넣어 보세요. 기록한 점이 ' + n + '개예요.' : '점이 ' + n + '개 모였어요. pH는 부피에 따라 일정하게 오르지 않죠? 당량점 가까이에서는 점을 촘촘히 찍어야 변화가 보여요. (용액 색은 만능 지시약이에요)';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  /* ============ ② 곡선 그리기 ============ */
  S.gr.table = [];
  const grG = () => (PHONE
    ? { r: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 236), zoom: rect(MAIN.x + 8, MAIN.y + 248, 226, 168), sl: rect(MAIN.x + 242, MAIN.y + 248, 214, 168) }
    : { r: rect(MAIN.x + 8, MAIN.y + 4, 500, MAIN.h - 8), zoom: rect(MAIN.x + 520, MAIN.y + 8, 248, 166), sl: rect(MAIN.x + 520, MAIN.y + 182, 248, 152) });
  function grPts() {
    const m = new Map();
    S.gr.table.forEach((p) => m.set(p.Vc, p)); S.dt.pts.forEach((p) => m.set(p.Vc, p));
    return Array.from(m.values()).sort((a, b) => a.Vc - b.Vc);
  }
  function grLoad() {
    const gr = S.gr; let k = 0;
    STD_V.forEach((v) => {
      const vc = Math.round(v * 100);
      if (!S.dt.pts.some((p) => p.Vc === vc) && !gr.table.some((p) => p.Vc === vc)) { gr.table.push({ Vc: vc, ph: pHr(C10, v), t0: S.t + 0.1 + k * 0.1 }); k++; }
    });
    gr.table.sort((a, b) => a.Vc - b.Vc);
    if (k) Sound.success(); updateCtl();
  }
  function grClear() { S.gr.table = []; S.gr.view = 'pts'; S.gr.lp = 0; S.gr.ov = 'none'; updateCtl(); }
  function slopeInfo(pts) {
    const segs = [];
    for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1]; segs.push({ a, b, s: (b.ph - a.ph) / ((b.Vc - a.Vc) / 100) }); }
    if (!segs.length) return { segs, best: [], eqV: null, eqPh: null, smax: 0 };
    const smax = Math.max.apply(null, segs.map((q) => q.s));
    const best = segs.filter((q) => q.s >= smax * (1 - 1e-6));
    const eqVc = best.reduce((acc, q) => acc + (q.a.Vc + q.b.Vc) / 2, 0) / best.length;
    let eqPh = null;
    for (let i = 0; i + 1 < pts.length; i++) { if (eqVc >= pts[i].Vc && eqVc <= pts[i + 1].Vc) { const f = (eqVc - pts[i].Vc) / (pts[i + 1].Vc - pts[i].Vc); eqPh = pts[i].ph + f * (pts[i + 1].ph - pts[i].ph); break; } }
    return { segs, best, eqV: eqVc / 100, eqPh, smax };
  }
  const grDone = () => {
    const pts = grPts(); return pts.length >= 12 && pts.some((p) => p.Vc <= 100) && pts.some((p) => p.Vc >= 1999 && p.Vc <= 2001) && pts.some((p) => p.Vc >= 2500) && S.gr.view === 'line';
  };
  function stepGraph(dt) { const gr = S.gr; gr.lp = ap(gr.lp, gr.view === 'line' ? 1 : 0, dt, 2.6); if (Math.abs(gr.lp - (gr.view === 'line' ? 1 : 0)) < 0.004) gr.lp = gr.view === 'line' ? 1 : 0; }
  function drawGraph(t) {
    const g = grG(), P = plotArea(g.r, VMAX), gr = S.gr, pts = grPts(), si = slopeInfo(pts);
    T(14, 26, '📈 점을 찍고 선으로 이어 pH–부피 곡선을 그려요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawAxes(P);
    if (gr.ov === 'zone') {
      ZONES.forEach((z, zi) => {
        const x0 = P.X(z[0]), x1 = P.X(Math.min(z[1], VMAX));
        ctx.fillStyle = C.rgba(z[3], 0.42); ctx.fillRect(x0, P.gy0, Math.max(1.5, x1 - x0), P.gy1 - P.gy0);
        if (zi === 2) {
          ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, P.gy0 + 44); ctx.lineTo(x0 - 18, P.gy0 + 62); ctx.stroke();
          D.label(x0 - 18, P.gy0 + 74, '급변', { size: 13, bg: '#fff', color: '#b91c1c' });
        } else T((x0 + x1) / 2, P.gy0 + 16, z[2], 13, '#475569', 'center', 800);
      });
    }
    if (S.pred != null) {
      const xp = P.X(S.pred); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xp, P.gy0); ctx.lineTo(xp, P.gy1); ctx.stroke(); ctx.setLineDash([]);
      T(xp - 6, P.gy1 - 8, '예측 ' + S.pred.toFixed(1) + ' mL', 12.5, '#14803f', 'right', 800);
    }
    // 선 연결 (왼쪽에서 오른쪽으로 그려져요)
    if (pts.length > 1 && gr.lp > 0.003) {
      ctx.save(); ctx.beginPath(); ctx.rect(P.gx0 - 4, P.gy0 - 6, (P.X(pts[pts.length - 1].Vc / 100) - P.gx0 + 8) * gr.lp, P.gy1 - P.gy0 + 12); ctx.clip();
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(P.X(p.Vc / 100), P.Y(p.ph)) : ctx.moveTo(P.X(p.Vc / 100), P.Y(p.ph)))); ctx.stroke(); ctx.restore();
    }
    // 기울기 덧그림
    if (gr.ov === 'slope' && si.segs.length) {
      si.segs.forEach((q) => {
        const f = clamp(q.s / si.smax, 0, 1), best = si.best.indexOf(q) >= 0;
        ctx.strokeStyle = best ? '#dc2626' : C.mix('#60a5fa', '#f59e0b', Math.pow(f, 0.5)); ctx.lineWidth = 2.5 + 5 * f; ctx.lineCap = 'round';
        ctx.globalAlpha = best ? 1 : 0.8; ctx.beginPath(); ctx.moveTo(P.X(q.a.Vc / 100), P.Y(q.a.ph)); ctx.lineTo(P.X(q.b.Vc / 100), P.Y(q.b.ph)); ctx.stroke(); ctx.globalAlpha = 1;
      });
      if (si.eqV != null && si.eqPh != null) {
        const ex = P.X(si.eqV), ey = P.Y(si.eqPh);
        D.ring(ex, ey, 12, t, { color: '#dc2626', width: 2.6, speed: 1.2 });
        const lx = ex + 16, ly = ey + 20;
        D.label(Math.min(lx + 66, P.gx1 - 70), ly, '기울기 최대 ≈ ' + si.eqV.toFixed(2) + ' mL', { size: 13, bg: '#fff', color: '#b91c1c' });
      }
    }
    // 점
    pts.forEach((p) => {
      const k = SPL.outBack(clamp((t - p.t0) / 0.35, 0, 1)); if (t < p.t0) return;
      D.sphere(P.X(p.Vc / 100), P.Y(p.ph), Math.max(0.1, 5 * k), '#ea580c', { gloss: false, outline: '#fff', outlineWidth: 1.6 });
    });
    if (!pts.length) T((P.gx0 + P.gx1) / 2, (P.gy0 + P.gy1) / 2, '기록한 점이 없어요. “자료표 불러오기”를 눌러요', 14.5, '#9a8ec0', 'center', 800);
    // 확대 창
    const z = g.zoom;
    D.roundRect(z.x, z.y, z.w, z.h, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; ctx.stroke();
    T(z.x + 10, z.y + 20, '🔍 19.9 ~ 20.1 mL 확대', 13.5, '#5b21b6', 'left', 800);
    const zx0 = z.x + 34, zx1 = z.x + z.w - 12, zy0 = z.y + 32, zy1 = z.y + z.h - 24;
    const ZX = (v) => zx0 + (v - 19.88) / 0.24 * (zx1 - zx0), ZY = (p) => zy1 - (p - 3) / 8 * (zy1 - zy0);
    ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1.2;
    [4, 6, 8, 10].forEach((p) => { ctx.beginPath(); ctx.moveTo(zx0, ZY(p)); ctx.lineTo(zx1, ZY(p)); ctx.stroke(); T(zx0 - 5, ZY(p) + 4.5, String(p), 12.5, MUTED, 'right', 700); });
    [19.9, 20.0, 20.1].forEach((v) => { ctx.beginPath(); ctx.moveTo(ZX(v), zy0); ctx.lineTo(ZX(v), zy1); ctx.stroke(); T(ZX(v), zy1 + 16, v.toFixed(1), 12.5, MUTED, 'center', 700); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(zx0, zy0 - 4); ctx.lineTo(zx0, zy1); ctx.lineTo(zx1, zy1); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(zx0 + 1, zy0 - 4, zx1 - zx0 - 1, zy1 - zy0 + 6); ctx.clip();
    if (gr.lp > 0.5 && pts.length > 1) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(ZX(p.Vc / 100), ZY(p.ph)) : ctx.moveTo(ZX(p.Vc / 100), ZY(p.ph)))); ctx.stroke(); }
    pts.forEach((p) => { const v = p.Vc / 100; if (v >= 19.85 && v <= 20.15 && t >= p.t0) D.sphere(ZX(v), ZY(p.ph), 4.6, '#ea580c', { gloss: false, outline: '#fff', outlineWidth: 1.4 }); });
    ctx.restore();
    // 기울기 목록
    const s = g.sl;
    D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(s.x + 10, s.y + 20, '기울기 ΔpH/ΔV 큰 구간', 13.5, INK, 'left', 800);
    const top = si.segs.slice().sort((a, b) => b.s - a.s).slice(0, 3);
    if (!top.length) T(s.x + s.w / 2, s.y + s.h / 2 + 8, '점이 2개 이상 필요해요', 13.5, '#9a8ec0', 'center', 800);
    top.forEach((q, i) => {
      const yy = s.y + 44 + i * (PHONE ? 40 : 34), bw = (s.w - 24) * clamp(q.s / si.smax, 0, 1);
      T(s.x + 10, yy, fmtV(q.a.Vc) + ' → ' + fmtV(q.b.Vc) + ' mL', 13, INK, 'left', 800);
      T(s.x + s.w - 10, yy, (q.s >= 100 ? q.s.toFixed(0) : q.s.toFixed(1)) + ' pH/mL', 13, i === 0 ? '#b91c1c' : MUTED, 'right', 800);
      D.roundRect(s.x + 10, yy + 5, Math.max(0, bw), 8, 4); ctx.fillStyle = i === 0 ? '#ef4444' : '#93c5fd'; ctx.fill();
    });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '기울기가 가장 큰 곳이 당량점이에요', 15, '#b45309', 'left', 800);
    let body = '자료표를 불러와 점을 찍고 “선 연결”로 이어 보세요. 부피가 늘어도 pH가 거의 일정하다가 20 mL 부근에서 갑자기 솟아올라요.';
    if (grDone()) body = '19.9 mL에서 20.1 mL까지 겨우 0.2 mL 사이에 pH가 3.60에서 10.40으로 6.80 올랐어요. “구간 띠”와 “기울기”를 눌러 곡선의 네 구간과 가장 가파른 곳을 확인해 보세요.';
    if (gr.ov === 'slope' && si.eqV != null) body = '이웃한 점 사이의 기울기를 구해 보니 가장 가파른 곳은 약 ' + si.eqV.toFixed(2) + ' mL' + (si.eqPh != null ? '이고 pH ' + si.eqPh.toFixed(2) : '') + '예요. 이 지점이 당량점이에요 (강산–강염기: pH 7).';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ③ 이온 모형 ============ */
  const ION_COL = { H: '#ef4444', OH: '#3b82f6', Na: '#a855f7', Cl: '#16a34a', W: '#7dd3fc' };
  const ION_LAB = { H: 'H⁺', OH: 'OH⁻', Na: 'Na⁺', Cl: 'Cl⁻', W: '' };
  const ION_OFF = { H: 0, Cl: 20, Na: 40, OH: 70, W: 80 }, ION_MAX = { H: 20, Cl: 20, Na: 30, OH: 10, W: 20 };
  const ioG = () => (PHONE
    ? { r: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 198), box: rect(MAIN.x + 8, MAIN.y + 208, MAIN.w - 16, 168), leg: rect(MAIN.x + 8, MAIN.y + 380, MAIN.w - 16, 40) }
    : { r: rect(MAIN.x + 8, MAIN.y + 4, 396, MAIN.h - 8), box: rect(MAIN.x + 416, MAIN.y + 8, 352, 252), leg: rect(MAIN.x + 416, MAIN.y + 268, 352, 66) });
  const ioCells = (() => {
    const g = ioG(), bw = g.box.w - 16, bh = g.box.h - 38;
    const cols = Math.round(Math.sqrt(105 * bw / bh)), rows = Math.ceil(105 / cols), n = cols * rows;
    const perm = Array.from({ length: n }, (_, i) => i); let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    return { cols, rows, perm };
  })();
  const ioTargets = (V) => ({ H: Math.max(0, 20 - V), OH: Math.max(0, V - 20), Na: V, Cl: 20, W: Math.min(V, 20) });
  function ioSlot(k, i) {
    const g = ioG(), bx = g.box.x + 8, by = g.box.y + 30, bw = g.box.w - 16, bh = g.box.h - 38, c = ioCells, cell = c.perm[ION_OFF[k] + i];
    const col = cell % c.cols, row = Math.floor(cell / c.cols);
    return { x: bx + (col + 0.5) * bw / c.cols, y: by + (row + 0.5) * bh / c.rows, cw: bw / c.cols, ch: bh / c.rows };
  }
  function ioSync(dt) {
    const io = S.io; io.acc -= dt;
    const tc = ioTargets(io.V);
    if (io.acc > 0) return;
    io.acc = 0.03;
    ['H', 'OH', 'Na', 'W', 'Cl'].forEach((k) => {
      const L = io.list[k], alive = L.filter((p) => !p.dying);
      if (alive.length > tc[k]) {
        const p = alive[alive.length - 1]; p.dying = true; const sl = ioSlot(k, p.i);
        if (k === 'H') io.lastH = { x: sl.x, y: sl.y }; if (k === 'W') io.lastW = { x: sl.x, y: sl.y };
        const col = k === 'H' ? ['#ef4444', '#7dd3fc'] : k === 'W' ? ['#7dd3fc', '#bae6fd'] : [ION_COL[k], '#e9d5ff'];
        parts.burst(sl.x, sl.y, { count: k === 'H' ? 10 : 6, speed: 90, size: 2.6, colors: col, life: 0.5, gravity: 60 });
      } else if (alive.length < tc[k]) {
        const used = {}; L.forEach((p) => { used[p.i] = 1; }); let i = 0; while (used[i]) i++;
        if (i >= ION_MAX[k]) return;
        const sl = ioSlot(k, i), g = ioG();
        let fx = sl.x, fy = g.box.y + 6;
        if (k === 'W' && io.lastH) { fx = io.lastH.x; fy = io.lastH.y; } else if (k === 'H' && io.lastW) { fx = io.lastW.x; fy = io.lastW.y; } else if (k !== 'Cl') { fx = sl.x; fy = g.box.y + 4; } else { fx = g.box.x + g.box.w / 2; fy = g.box.y + 4; }
        L.push({ k, i, s: 0, u: 0, fx, fy, dying: false, ph: Math.random() * 6 });
      }
    });
  }
  function stepIon(dt) {
    const io = S.io;
    if (!io.init) { io.init = true; const tc = ioTargets(io.V); Object.keys(tc).forEach((k) => { for (let i = 0; i < tc[k]; i++) io.list[k].push({ k, i, s: 1, u: 1, fx: 0, fy: 0, dying: false, ph: Math.random() * 6 }); }); }
    ioSync(dt);
    Object.keys(io.list).forEach((k) => {
      const L = io.list[k];
      for (let n = L.length - 1; n >= 0; n--) { const p = L[n]; p.s = ap(p.s, p.dying ? 0 : 1, dt, p.dying ? 14 : 8); p.u = ap(p.u, 1, dt, 6); if (p.dying && p.s < 0.03) L.splice(n, 1); }
    });
    if (RM) Object.keys(io.list).forEach((k) => io.list[k].forEach((p) => { p.s = p.dying ? 0 : 1; p.u = 1; }));
  }
  const ioCount = (k) => S.io.list[k].filter((p) => !p.dying).length;
  function ioSetV(v) {
    const nv = clamp(Math.round(v), 0, 30); if (nv === S.io.V) return;
    S.io.V = nv; if (!S.io.drag && [0, 10, 20, 25].indexOf(nv) >= 0) S.io.seen[nv] = true; Sound.tick(); updateCtl();
  }
  function ioKnown(V) {
    if (game && game.free) return true;
    if (V === 0 || V === 20) return true;
    const both = calcRows.every((r) => r.ok);
    return both || (V === 10 && calcRows[0].ok) || (V === 25 && calcRows[1].ok);
  }
  function ioInfo(V) {
    const mm = 0.1 * V;
    if (V < 20) {
      const rem = 2.0 - mm, tot = 20 + V, c = rem / tot;
      return { l1: '넣은 NaOH ' + mm.toFixed(2) + ' mmol 이 HCl 2.00 mmol 과 반응해 H⁺ ' + rem.toFixed(2) + ' mmol 이 남아요.', l2: V === 0 ? 'H⁺ = 2.00 mmol ÷ 20.0 mL = 0.100 M' : '[H⁺] = ' + rem.toFixed(2) + ' mmol ÷ ' + tot.toFixed(1) + ' mL = ' + c.toFixed(4) + ' M', ph: pHr(C10, V) };
    }
    if (V === 20) return { l1: 'H⁺ 2.00 mmol 과 OH⁻ 2.00 mmol 이 모두 H₂O 로 변했어요. 남은 이온은 Na⁺ 와 Cl⁻ 뿐이에요.', l2: 'H⁺ 와 OH⁻ 가 남지 않아 물의 자동 이온화([H⁺] = 1.0×10⁻⁷ M)만 남아요.', ph: 7.0 };
    const ex = mm - 2.0, tot = 20 + V, c = ex / tot;
    return { l1: '넣은 NaOH ' + mm.toFixed(2) + ' mmol 중 ' + ex.toFixed(2) + ' mmol 이 반응하지 못하고 OH⁻ 로 남아요.', l2: '[OH⁻] = ' + ex.toFixed(2) + ' mmol ÷ ' + tot.toFixed(1) + ' mL = ' + c.toFixed(4) + ' M', ph: pHr(C10, V) };
  }
  function drawIon(t) {
    const g = ioG(), P = plotArea(g.r, 30), io = S.io, V = io.V;
    T(14, 26, '🧩 곡선 위의 점을 끌어 이온의 수를 살펴봐요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawAxes(P);
    strokeCurve(P, 'c10', '#7c3aed', 3);
    const ph = pHof(C10, V), mx = P.X(V), my = P.Y(ph), known = ioKnown(V);
    [0, 10, 20, 25].forEach((v) => {
      const done = io.seen[v]; ctx.strokeStyle = done ? '#14a058' : '#a78bfa'; ctx.lineWidth = 2; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(P.X(v), P.Y(pHof(C10, v)), 6, 0, TAU); ctx.fill(); ctx.stroke();
      T(P.X(v) + (v === 0 ? 8 : 0), P.gy1 - 7, v + ' mL', 12.5, done ? '#14803f' : '#7c3aed', v === 0 ? 'left' : 'center', 800);
    });
    ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, P.gy1); ctx.moveTo(mx, my); ctx.lineTo(P.gx0, my); ctx.stroke(); ctx.setLineDash([]);
    D.glow(mx, my, 24, '#8b5cf6', 0.45); D.sphere(mx, my, 9, '#8b5cf6', { outline: '#fff', outlineWidth: 2.4, shadow: true });
    D.label(clamp(mx + (mx > P.gx1 - 90 ? -64 : 62), P.gx0 + 56, P.gx1 - 56), clamp(my + (my < P.gy0 + 40 ? 26 : -22), P.gy0 + 14, P.gy1 - 30), V + ' mL · pH ' + (known ? ioInfo(V).ph.toFixed(2) : '?'), { size: 13.5, bg: '#fff', color: '#5b21b6' });
    // 입자 상자
    const b = g.box;
    D.roundRect(b.x, b.y, b.w, b.h, 12); const gr2 = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); gr2.addColorStop(0, '#f4f9ff'); gr2.addColorStop(1, '#e4f0ff'); ctx.fillStyle = gr2; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2; ctx.stroke();
    T(b.x + 12, b.y + 21, '🔍 용액 속 이온 (● 1개 = 0.10 mmol)', PHONE ? 13 : 13.5, '#1e40af', 'left', 800);
    const r0 = Math.min(ioSlot('H', 0).cw, ioSlot('H', 0).ch) * 0.43;
    ['W', 'Cl', 'Na', 'H', 'OH'].forEach((k) => {
      io.list[k].forEach((p) => {
        const sl = ioSlot(k, p.i), u = SPL.outCubic(clamp(p.u, 0, 1)), w = RM ? 0 : 1.6;
        const x = p.fx + (sl.x - p.fx) * u + Math.sin(t * 1.3 + p.ph) * w, y = p.fy + (sl.y - p.fy) * u + Math.cos(t * 1.1 + p.ph * 1.7) * w;
        const r = Math.max(0.1, (k === 'W' ? r0 * 0.68 : r0) * SPL.outBack(clamp(p.s, 0, 1)));
        if (k === 'W') D.sphere(x, y, r, ION_COL.W, { gloss: false, outline: 'rgba(255,255,255,.8)', outlineWidth: 1 });
        else D.sphere(x, y, r, ION_COL[k], { gloss: true, text: ION_LAB[k], textScale: k === 'OH' ? 0.82 : 0.9 });
      });
    });
    // 범례 · 개수
    const L = g.leg, ks = ['H', 'OH', 'Na', 'Cl', 'W'], lab = { H: 'H⁺', OH: 'OH⁻', Na: 'Na⁺', Cl: 'Cl⁻', W: 'H₂O' };
    D.roundRect(L.x, L.y, L.w, L.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 1.6; ctx.stroke();
    ks.forEach((k, i) => {
      const cx = L.x + 10 + i * (L.w - 14) / 5, cy = L.y + L.h / 2;
      D.sphere(cx + 7, cy - 2, 6, ION_COL[k], { gloss: false });
      T(cx + 18, cy + 3, lab[k] + ' ' + ioCount(k), PHONE ? 13 : 14, INK, 'left', 800);
    });
    if (!PHONE) T(L.x + L.w / 2, L.y + L.h - 5, 'H₂O 는 중화로 새로 생긴 것만 세요', 11.5, MUTED, 'center', 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const inf = ioInfo(V);
    T(INFO.x + 16, INFO.y + 26, 'NaOH ' + V + ' mL 를 넣었을 때', 15, '#b45309', 'left', 800);
    let body = inf.l1 + '\n' + inf.l2;
    if (known) body += (V === 20 ? '' : '  →  ') + (V === 20 ? '' : 'pH = ' + inf.ph.toFixed(2)) + (V === 20 ? '\n그래서 pH = 7.00' : '');
    else body += '\n이 지점의 pH 는 아래 “지점별 pH 계산”에서 직접 구해 보세요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }

  /* ============ ④ 지시약 선택 ============ */
  const inG = () => (PHONE
    ? { r: rect(MAIN.x + 4, MAIN.y + 4, MAIN.w - 8, 232), fl: rect(MAIN.x + 8, MAIN.y + 244, 226, 172), res: rect(MAIN.x + 242, MAIN.y + 244, 214, 172) }
    : { r: rect(MAIN.x + 8, MAIN.y + 4, 430, MAIN.h - 8), fl: rect(MAIN.x + 450, MAIN.y + 8, 318, 196), res: rect(MAIN.x + 450, MAIN.y + 212, 318, 122) });
  const indPh = () => pHof(CONCV[S.ind.c], S.ind.V);
  const indAll = (c) => IK.every((k) => S.ind.res[c][k]);
  function indSelect(k) { const n = S.ind; if (n.run) return; n.k = k; Sound.click(); updateCtl(); }
  function indConc(c) { const n = S.ind; n.run = null; n.c = c; n.V = 0; Sound.click(); updateCtl(); }
  function indStart() {
    const n = S.ind; if (n.run) return;
    n.V = 0; n.run = { k: n.k, c: n.c, vend: vEnd(n.c, n.k) }; n.drip = 0; Sound.click(); updateCtl();
  }
  function indReset() { const n = S.ind; n.run = null; n.V = 0; Sound.click(); updateCtl(); }
  function stepInd(dt) {
    const n = S.ind; n.pulse = ap(n.pulse, 0, dt, 2.5);
    if (!n.run) return;
    const rem = n.run.vend - n.V, sp = rem > 1.0 ? 8 : rem > 0.15 ? 1.4 : 0.35;
    n.V = Math.min(n.run.vend, n.V + sp * dt);
    n.drip += dt * (rem > 1.0 ? 9 : rem > 0.15 ? 4 : 1.6);
    const g = inG(), cx = g.fl.x + (PHONE ? 62 : 90), by = g.fl.y + g.fl.h - 22, fh = PHONE ? 96 : 112, tip = by - fh - 6, surf = by - (fh * 0.68) * (0.5 + 0.12 * n.V / 30) - 6;
    while (n.drip >= 1) {
      n.drip -= 1;
      if (!RM) parts.emit({ x: cx, y: tip, vx: 0, vy: 0, life: Math.sqrt(2 * Math.max(10, surf - tip) / 700), size: 3, color: '#4a7df0', gravity: 700, fade: false, shape: 'circle' });
    }
    if (n.V >= n.run.vend - 1e-9) {
      n.V = n.run.vend; const k = n.run.k, c = n.run.c;
      n.res[c][k] = { v: n.run.vend, err: Math.round((n.run.vend - 20) * 100) / 100 };
      n.run = null; n.pulse = 1; Sound.success(); flash(cx, by - 40, [indColor(k, IND[k].hi), '#14a058', '#ffb400']); updateCtl();
    }
  }
  const sgn = (v) => (v > 0.0049 ? '+' : v < -0.0049 ? MINUS : '±') + Math.abs(v).toFixed(2);
  function drawInd(t) {
    const g = inG(), n = S.ind, P = plotArea(g.r, 30), cc = CONCV[n.c], pH = indPh();
    T(14, 26, '🎨 지시약의 변색 범위가 급변 구간 안에 있을까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    drawAxes(P);
    IK.forEach((k) => {
      const d = IND[k], y0 = P.Y(d.hi), y1 = P.Y(d.lo), sel = n.k === k;
      const gg = ctx.createLinearGradient(0, y0, 0, y1); gg.addColorStop(0, C.rgba(d.cols[2], 0.6)); gg.addColorStop(0.5, C.rgba(d.cols[1], 0.6)); gg.addColorStop(1, C.rgba(d.cols[0], 0.6));
      ctx.fillStyle = gg; ctx.fillRect(P.gx0, y0, P.gx1 - P.gx0, y1 - y0);
      ctx.strokeStyle = sel ? '#26324a' : 'rgba(38,50,74,.28)'; ctx.lineWidth = sel ? 2.4 : 1; ctx.strokeRect(P.gx0, y0, P.gx1 - P.gx0, y1 - y0);
    });
    const other = n.c === 'c10' ? 'c01' : 'c10';
    strokeCurve(P, other, '#94a3b8', 2, 0.55);
    strokeCurve(P, n.c, '#7c3aed', 3.4);
    // 급변 구간 (19.9 ~ 20.1 mL)
    const pa = pHr(cc, 19.9), pb = pHr(cc, 20.1);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]);
    [pa, pb].forEach((p) => { ctx.beginPath(); ctx.moveTo(P.gx0, P.Y(p)); ctx.lineTo(P.gx1, P.Y(p)); ctx.stroke(); });
    ctx.setLineDash([]);
    D.label(P.gx0 + (PHONE ? 74 : 84), P.Y(pb) - 12, '급변 구간 pH ' + pa.toFixed(2) + ' ~ ' + pb.toFixed(2), { size: 13, bg: '#fff', color: '#b91c1c' });
    IK.forEach((k) => { const d = IND[k]; D.label(P.gx1 - 6, (P.Y(d.hi) + P.Y(d.lo)) / 2, d.name + ' ' + d.lo.toFixed(1) + '~' + d.hi.toFixed(1), { size: 13, bg: 'rgba(255,255,255,.82)', color: n.k === k ? '#111827' : '#334155', align: 'right', pad: 5 }); });
    IK.forEach((k) => {
      const r = n.res[n.c][k]; if (!r) return;
      const x = P.X(r.v), y = P.Y(pHof(cc, r.v));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = indColor(k, IND[k].hi); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.8; ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12); ctx.restore();
    });
    const cx0 = P.X(n.V), cy0 = P.Y(pH);
    D.glow(cx0, cy0, 20, '#8b5cf6', 0.4); D.sphere(cx0, cy0, 7.5, indColor(n.k, pH), { outline: '#26324a', outlineWidth: 2 });
    if (n.pulse > 0.02) D.ring(cx0, cy0, 14 + 20 * (1 - n.pulse), t, { color: '#14a058', width: 2.6, speed: 0 });
    // 삼각 플라스크
    const f = g.fl;
    D.roundRect(f.x, f.y, f.w, f.h, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    T(f.x + 10, f.y + 20, PHONE ? '플라스크 + ' + IND[n.k].name : '플라스크 (HCl 20.0 mL + ' + IND[n.k].name + ')', PHONE ? 12.5 : 13.5, INK, 'left', 800);
    const fcx = f.x + (PHONE ? 62 : 90), fby = f.y + f.h - 22, fh = PHONE ? 96 : 112, fw = PHONE ? 104 : 124;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fcx, f.y + 28); ctx.lineTo(fcx, fby - fh - 12); ctx.stroke();
    D.flask(fcx, fby, fw, fh, { level: 0.5 + 0.12 * n.V / 30, liquid: indColor(n.k, pH), t });
    const tx = f.x + (PHONE ? 122 : 176);
    T(tx, f.y + 54, 'NaOH ' + n.V.toFixed(2) + ' mL', PHONE ? 14 : 17, '#1d4ed8', 'left', 800);
    T(tx, f.y + (PHONE ? 76 : 82), 'pH ' + pH.toFixed(2), PHONE ? 14 : 17, '#5b21b6', 'left', 800);
    T(tx, f.y + (PHONE ? 100 : 110), CONCT[n.c] + ' 적정', PHONE ? 12.5 : 14, MUTED, 'left', 800);
    const d = IND[n.k]; T(tx, f.y + (PHONE ? 120 : 134), d.note, PHONE ? 12.5 : 14, MUTED, 'left', 800);
    T(tx, f.y + (PHONE ? 140 : 158), n.run ? (PHONE ? '적정 중…' : '적정하는 중…') : (n.res[n.c][n.k] ? (PHONE ? '기록됨' : '종말점 기록됨') : '▶ 적정하기'), PHONE ? 12.5 : 14, n.run ? '#b45309' : '#14803f', 'left', 800);
    // 결과 표
    const rs = g.res;
    D.roundRect(rs.x, rs.y, rs.w, rs.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const cA = rs.x + 10, cB = rs.x + (PHONE ? 122 : 150), cC = rs.x + rs.w - 10;
    T(cA, rs.y + 20, CONCT[n.c] + (PHONE ? '' : ' 종말점'), 13, MUTED, 'left', 800); T(cB, rs.y + 20, PHONE ? 'V(mL)' : '부피(mL)', 13, MUTED, 'left', 800); T(cC, rs.y + 20, PHONE ? '차(mL)' : '당량점과 차', 13, MUTED, 'right', 800);
    IK.forEach((k, i) => {
      const yy = rs.y + 44 + i * (PHONE ? 28 : 26), r = n.res[n.c][k];
      if (n.k === k) { D.roundRect(rs.x + 4, yy - 17, rs.w - 8, 24, 7); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill(); }
      D.sphere(cA + 6, yy - 5, 6, indColor(k, IND[k].hi), { gloss: false, outline: '#26324a', outlineWidth: 1 });
      T(cA + 18, yy, IND[k].name, 13, INK, 'left', 800); T(cB, yy, r ? r.v.toFixed(2) : '—', 14, r ? INK : '#b0b8c8', 'left', 800); T(cC, yy, r ? sgn(r.err) : '—', 14, r ? (Math.abs(r.err) <= 0.05 ? '#14803f' : '#b91c1c') : '#b0b8c8', 'right', 800);
    });
    T(rs.x + rs.w / 2, rs.y + rs.h - 8, (PHONE ? '(한 방울 ≈ 0.05 mL)' : '당량점 20.00 mL 와의 차 (한 방울 ≈ 0.05 mL)'), PHONE ? 11.5 : 12.5, MUTED, 'center', 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '종말점과 당량점이 거의 같으려면?', 15, '#b45309', 'left', 800);
    let body = '지시약을 고르고 “적정하기”를 눌러요. 색이 완전히 바뀐 지점(종말점)의 부피를 당량점 20.00 mL 와 비교해 보세요. 변색 범위가 빨간 점선(급변 구간) 사이에 있어야 해요.';
    if (indAll('c10') && n.c === 'c10') body = '0.10 M 에서는 세 지시약 모두 종말점이 20.00 mL 의 ±0.05 mL(한 방울) 안이에요. 이제 0.010 M 로 바꿔 급변 구간이 좁아지면 어떻게 되는지 살펴보세요.';
    if (n.c === 'c01') body = '0.010 M 이면 급변 구간이 pH ' + pa.toFixed(2) + ' ~ ' + pb.toFixed(2) + ' 로 좁아져요. 메틸 오렌지(3.1~4.4)는 구간 아래, 페놀프탈레인(8.2~10.0)은 구간 위쪽에 걸쳐 종말점이 당량점에서 더 멀어져요.';
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, INK, 21, 700);
  }


  function onLeave(m) { if (m === 'ind') { S.ind.run = null; } if (m === 'ion') S.io.drag = false; }
  /* ---------- 포인터 (곡선 위 점 끌기) ---------- */
  const ionPlot = () => plotArea(ioG().r, 30);
  const ionX = (x) => { const P = ionPlot(); return (x - P.gx0) / (P.gx1 - P.gx0) * 30; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'ion') {
        const P = ionPlot();
        if (p.x >= P.gx0 - 12 && p.x <= P.gx1 + 12 && p.y >= P.gy0 - 12 && p.y <= P.gy1 + 16) { S.io.drag = true; ioSetV(ionX(p.x)); return true; }
      }
      return false;
    },
    move(p) { if (S.io.drag) ioSetV(ionX(p.x)); },
    up() { if (S.io.drag) { S.io.drag = false; const v = S.io.V; if ([0, 10, 20, 25].indexOf(v) >= 0) S.io.seen[v] = true; updateCtl(); } },
    hover(p) { if (S.mode === 'ion') { const P = ionPlot(); if (p.x >= P.gx0 - 12 && p.x <= P.gx1 + 12 && p.y >= P.gy0 - 12 && p.y <= P.gy1 + 16) return 'ew-resize'; } return 'default'; },
  });

  /* ---------- UI 요소 ---------- */
  makeChips($('#stSel'), STEPS, (v) => { S.dt.step = +v; updateCtl(); });
  makeChips($('#qSel'), [[0, '0 mL'], [10, '10 mL'], [20, '20 mL'], [25, '25 mL']], (v) => { ioSetV(+v); });
  makeChips($('#indSel'), IK.map((k) => [k, IND[k].name]), (v) => indSelect(v));
  const predRow = mkRow($('#predHost'), { label: '당량점의 부피 V', ans: 20.0, tol: 0.05, ph: '0.0', unit: 'mL' }, () => { S.pred = predRow.ok ? 20 : null; updateCtl(); });
  const calcRows = [
    mkRow($('#calcHost'), { label: 'NaOH 10.0 mL 일 때 pH', ans: pHr(C10, 10), tol: 0.02, ph: '0.00' }, () => updateCtl()),
    mkRow($('#calcHost'), { label: 'NaOH 25.0 mL 일 때 pH', ans: pHr(C10, 25), tol: 0.02, ph: '0.00' }, () => updateCtl()),
  ];
  const selRng = $('#selRng'), selBest = $('#selBest');
  selRng.addEventListener('change', () => { Sound.click(); updateCtl(); });
  selBest.addEventListener('change', () => { Sound.click(); updateCtl(); });
  $('#bAdd').addEventListener('click', dtAdd);
  $('#bRec').addEventListener('click', () => dtRecord(false));
  $('#bNew').addEventListener('click', dtNew);
  $$('#recSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.dt.auto = b.dataset.v === 'auto'; updateCtl(); }));
  $('#bLoad').addEventListener('click', grLoad);
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.gr.view = b.dataset.v; updateCtl(); }));
  $$('#ovSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.gr.ov = b.dataset.v; updateCtl(); }));
  const sV = $('#sV');
  sV.addEventListener('input', () => ioSetV(+sV.value));
  $('#vMinus').addEventListener('click', () => ioSetV(S.io.V - 1)); $('#vPlus').addEventListener('click', () => ioSetV(S.io.V + 1));
  $$('#cSeg button').forEach((b) => b.addEventListener('click', () => indConc(b.dataset.v)));
  $('#bRun').addEventListener('click', indStart); $('#bRst').addEventListener('click', indReset);

  function uiExtra() {
    if (typeof calcRows === 'undefined') return;
    const d = S.dt, io = S.io, n = S.ind, free = game && game.free;
    markChips($('#stSel'), String(d.step));
    $$('#recSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'auto') === d.auto));
    $('#bAdd').disabled = d.Vc >= VMAX * 100;
    const stdLeft = STD_V.some((v) => !grPts().some((p) => p.Vc === Math.round(v * 100)));
    $('#bLoad').disabled = !stdLeft; $('#bLoad').textContent = stdLeft ? '📥 자료표 불러오기' : '✅ 자료표를 불러왔어요';
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.gr.view));
    $$('#ovSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.gr.ov));
    sV.value = io.V; $('#oV').textContent = io.V + ' mL'; $('#vMinus').disabled = io.V <= 0; $('#vPlus').disabled = io.V >= 30;
    markChips($('#qSel'), io.V, io.seen);
    markChips($('#indSel'), n.k, { mo: n.res[n.c].mo, btb: n.res[n.c].btb, pp: n.res[n.c].pp });
    $$('#indSel button').forEach((b) => { b.disabled = !!n.run; });
    $$('#cSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === n.c));
    $('#bRun').disabled = !!n.run; $('#bRun').textContent = n.run ? '⏳ 적정하는 중…' : (n.res[n.c][n.k] ? '▶ 다시 적정하기' : '▶ 적정하기');
    void free;
  }

  function readouts() {
    const m = S.mode;
    if (m === 'data') { const d = S.dt; setRead('넣은 NaOH', (d.Vc / 100).toFixed(2) + ' mL', 'pH', dtPh().toFixed(2), '기록한 점', d.pts.length + ' / ' + dtCap); }
    else if (m === 'graph') { const pts = grPts(), si = slopeInfo(pts); setRead('찍은 점', pts.length + '개', '가장 가파른 구간', si.best.length ? fmtV(si.best[0].a.Vc) + ' ~ ' + fmtV(si.best[si.best.length - 1].b.Vc) + ' mL' : '—', '기울기 최대 지점', si.eqV != null ? si.eqV.toFixed(2) + ' mL' : '—'); }
    else if (m === 'ion') { const V = S.io.V, tc = ioTargets(V); setRead('넣은 NaOH', V + ' mL', 'pH', ioKnown(V) ? ioInfo(V).ph.toFixed(2) : '?', 'H⁺ · OH⁻ (개)', tc.H + ' · ' + tc.OH); }
    else { const n = S.ind, r = n.res[n.c][n.k]; setRead('지시약 · 농도', IND[n.k].name + ' · ' + CONCT[n.c], '종말점', r ? r.v.toFixed(2) + ' mL' : '—', '당량점과 차', r ? sgn(r.err) + ' mL' : '—'); }
  }

  /* ================= 미션 ================= */
  const dataCount = () => S.dt.pts.filter((p) => p.Vc <= 2000).length;
  const indOk = (c) => IK.every((k) => S.ind.res[c][k]);
  const levels = [
    {
      title: '데이터 수집: 뷰렛으로 NaOH 넣기', short: '데이터 수집', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 중화 적정에서 pH는 염기를 넣는 만큼 일정하게 오를까? 당량점은 곡선의 어디일까?</p>' +
        '<div class="si-link">🔗 <b>화학 단원에서</b> 중화 적정으로 식초의 농도를 구했어요(aMV = bM′V′). 그때는 당량점의 부피만 알았지만 이번에는 NaOH 를 넣는 동안 <b>pH 를 계속 재서</b> 곡선으로 그려 봐요.</div>' +
        '<p>0.100 M HCl 20.0 mL 에 0.100 M NaOH 를 뷰렛으로 조금씩 넣고, 부피마다 pH 미터 값을 표에 기록해요. 실험할 때는 <b>보안경과 장갑</b>을 착용하고, 남은 산·염기 용액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['data'],
      setup() { S.gate = ''; predRow.clear(); S.pred = null; dtNew(); S.gr.table = []; S.gr.view = 'pts'; S.gr.ov = 'none'; S.gr.lp = 0; setScene('data'); },
      recap: 'NaOH 를 넣는 동안 pH 는 일정하게 오르지 않아요. 처음에는 1.00 에서 천천히 오르다가 당량점(20.0 mL) 가까이에서 급격히 변해요. 당량점의 부피는 aMV = bM′V′ 로 예측할 수 있어요.',
      summary: '<ul><li>실험: 0.100 M HCl 20.0 mL + 0.100 M NaOH (25 °C), 뷰렛으로 넣으며 pH 미터로 측정</li><li>당량점의 부피: 1 × 0.100 M × 20.0 mL = 1 × 0.100 M × V → <b>V = 20.0 mL</b></li><li>측정 자료: 0 mL <b>1.00</b>, 10.0 mL <b>1.48</b>, 19.0 mL <b>2.59</b> → pH 는 일정하게 오르지 않아요.</li><li>NaOH 10.0 mL 에서 pH 가 7 이 아닌 까닭: H⁺ 가 아직 1.00 mmol 남아 있기 때문</li><li>안전: 보안경 · 장갑 착용, 폐액은 폐수 처리 기준에 따라 처리</li></ul>',
      missions: [
        {
          title: '당량점의 부피 예측하기', manual: true,
          goal: '0.100 M HCl 20.0 mL 를 0.100 M NaOH 로 중화할 때 필요한 NaOH 의 부피(당량점)를 <b>aMV = bM′V′</b> 로 구해 입력하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'HCl 과 NaOH 는 1 : 1 로 반응해요. 1 × 0.100 × 20.0 = 1 × 0.100 × V 에서 V 를 구해요.',
          setup() { S.gate = 'pred'; setScene('data'); updateCtl(); },
          check() { const v = predRow.read(); if (isNaN(v)) return '당량점의 부피를 입력하세요.'; return predRow.ok ? true : '1 × 0.100 × 20.0 = 1 × 0.100 × V 를 풀어 보세요. (단위: mL)'; },
          status: () => (predRow.ok ? '예측 20.0 mL ✅' : '예측 입력 대기'),
          explain: 'aMV = bM′V′ → 1 × 0.100 M × 20.0 mL = 1 × 0.100 M × V 이므로 <b>V = 20.0 mL</b> 예요. 이 값을 다음 단계에서 그래프에 점선으로 표시해 곡선과 비교해 볼 거예요.',
        },
        {
          title: '0 ~ 20 mL 데이터 8개 모으기',
          goal: 'NaOH 를 넣으며 <b>0 ~ 20 mL 구간에서 8개 이상</b>의 (부피, pH) 를 기록하세요.',
          hint: '“빠르게 +5 mL” 로 넓게 본 뒤 “한 방울 +0.05 mL” 나 “+0.01 mL” 로 20 mL 근처를 촘촘히 살펴보세요. 자동 기록이면 넣을 때마다 표에 기록돼요.',
          setup() { S.gate = ''; setScene('data'); },
          check: () => dataCount() >= 8, hold: 0.6,
          status: () => '0~20 mL 기록 ' + dataCount() + ' / 8 ' + mark(dataCount() >= 8),
          explain: '처음에는 NaOH 를 많이 넣어도 pH 가 조금씩만 올라요(0 mL 1.00 → 10.0 mL 1.48 → 19.0 mL 2.59). 하지만 20 mL 에 가까워지면 몇 방울만으로 pH 가 크게 변해요. 그래서 이 부근은 점을 촘촘히 찍어야 해요.',
        },
        {
          type: 'quiz', title: '10.0 mL 에서 pH 가 7 이 아닌 까닭',
          goal: 'NaOH 10.0 mL 를 넣었을 때 pH 가 <b>7 이 되지 않는</b> 까닭은?',
          setup() { S.gate = ''; setScene('data'); },
          choices: ['아직 NaOH 가 모자라서 HCl 의 H⁺ 가 절반(1.00 mmol) 남아 있기 때문이에요', 'NaOH 가 물에 잘 녹지 않기 때문이에요', '중화 반응은 pH 7 에서만 일어나기 때문이에요', 'pH 미터가 아직 안정되지 않았기 때문이에요'],
          answer: 0,
          feedback: ['', 'NaOH 는 물에 잘 녹아 완전히 이온화해요. 문제는 넣은 양이에요.', '중화 반응은 H⁺ 와 OH⁻ 가 만나면 어디서나 일어나요. pH 7 은 H⁺ 와 OH⁻ 의 양이 같아졌을 때의 값이에요.', '미터가 안정되면 pH 는 1.48 이에요. 7 이 되려면 NaOH 가 더 필요해요.'],
          explain: 'HCl 2.00 mmol 중 NaOH 10.0 mL(1.00 mmol)가 중화했으니 H⁺ 1.00 mmol 이 남아요. 남은 [H⁺] = 1.00 mmol ÷ 30.0 mL = 0.0333 M 이므로 pH <b>1.48</b> 이에요.',
        },
      ],
    },
    {
      title: '곡선 그리기: 점에서 곡선으로', short: '곡선 그리기', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> NaOH 를 넣을 때마다 pH 를 표에 기록했어요. 숫자만 봐서는 어디서 크게 변하는지 한눈에 알기 어려워요. <b>그래프</b>로 그려 볼까요?</div>' +
        '<p>가로축은 NaOH 부피, 세로축은 pH 로 점을 찍고 선으로 이어요. 곡선을 <b>네 구간</b>(초기 · 완만 · 급변 · 염기 과량)으로 나누고, <b>기울기가 가장 큰 곳</b>을 찾아 당량점을 확인해요.</p>',
      features: ['graph'],
      setup() { S.gate = ''; S.gr.view = 'pts'; S.gr.ov = 'none'; S.gr.lp = 0; selRng.value = ''; setScene('graph'); },
      recap: '적정 곡선은 초기 · 완만 · 급변 · 염기 과량의 네 구간으로 나뉘어요. 19.9 mL 에서 20.1 mL 까지 0.2 mL 사이에 pH 가 3.60 에서 10.40 으로 6.80 올라요. 기울기가 가장 큰 곳이 당량점(20.00 mL, pH 7.00)이에요.',
      summary: '<ul><li>데이터 → 점 → 선: 가로축 NaOH 부피, 세로축 pH</li><li>네 구간: <b>초기</b>(pH 약 1) → <b>완만</b>(pH 천천히 증가) → <b>급변</b>(당량점 부근) → <b>염기 과량</b>(pH 12 이상)</li><li>19.9 mL → 20.1 mL (겨우 0.2 mL): pH <b>3.60 → 10.40</b> (6.80 증가)</li><li>이웃한 점 사이의 기울기 ΔpH/ΔV 가 가장 큰 지점 = <b>당량점</b> (20.00 mL, pH <b>7.00</b>)</li><li>급변하는 까닭: 당량점 부근에서는 남은 H⁺ 또는 OH⁻ 의 양이 극히 적어서 몇 방울만으로도 pH 가 크게 변해요.</li></ul>',
      missions: [
        {
          title: '그래프 완성하기',
          goal: '<b>자료표 불러오기</b>로 점을 찍어 그래프를 완성하고 <b>선 연결</b>로 곡선을 그리세요.',
          hint: '“📥 자료표 불러오기”를 누르면 0 ~ 40 mL 의 자료가 점으로 찍혀요. 그다음 “〰 선 연결”을 눌러요.',
          setup() { S.gate = ''; setScene('graph'); },
          check: () => grDone(), hold: 0.8,
          status: () => '점 ' + grPts().length + '개 ' + mark(grPts().length >= 12) + ' &nbsp; 선 연결 ' + mark(S.gr.view === 'line'),
          explain: '점이 모두 이어지면 처음엔 완만하게 오르다가 20 mL 에서 거의 수직으로 솟고, 다시 완만해지는 <b>S 자 모양</b>의 곡선이 돼요. 오른쪽 확대 창으로 급변 부분을 자세히 볼 수 있어요.',
        },
        {
          title: 'pH 가 급변하는 구간 찾기', manual: true,
          goal: '곡선에서 pH 가 가장 크게 변하는 <b>급변 구간</b>을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“구간 띠”와 “기울기”를 눌러 보세요. 기울기가 가장 큰 곳을 찾으면 돼요. 확대 창의 점들도 힌트예요.',
          setup() { S.gate = 'rng'; setScene('graph'); updateCtl(); },
          check() { if (!selRng.value) return '하나를 골라 주세요.'; if (selRng.value === 'c') return true; return { a: '10 ~ 15 mL 에서는 pH 가 1.48 에서 1.85 로 0.37 만 올랐어요. 기울기가 훨씬 큰 곳을 찾아 보세요.', b: '15 ~ 19 mL 에서도 pH 는 1.85 에서 2.59 로 0.74 올랐을 뿐이에요.', d: '21 ~ 25 mL 에서는 11.39 에서 12.05 로 완만해져요. 급변은 그 앞에서 일어나요.' }[selRng.value]; },
          status: () => '선택 ' + (selRng.value ? $('#selRng').selectedOptions[0].textContent : '—'),
          explain: '<b>19.9 ~ 20.1 mL</b> 에서 pH 가 3.60 → 10.40 으로 6.80 올라 기울기가 가장 커요. 이 구간의 한가운데(20.00 mL, pH 7.00)가 당량점이에요.',
        },
        {
          type: 'quiz', title: '당량점 근처에서 pH 가 크게 변하는 까닭',
          goal: '당량점 앞뒤로 <b>몇 방울</b>만 넣어도 pH 가 크게 변하는 까닭은?',
          setup() { S.gate = ''; setScene('graph'); },
          choices: ['당량점 부근에서는 남은 H⁺ 또는 OH⁻ 의 양이 극히 적어서 몇 방울로도 농도가 크게 달라지기 때문이에요', 'NaOH 의 세기가 갑자기 강해지기 때문이에요', 'pH 미터가 당량점에서만 정확하기 때문이에요', 'HCl 이 물과 반응해 사라지기 때문이에요'],
          answer: 0,
          feedback: ['', 'NaOH 는 처음부터 끝까지 같은 0.100 M 예요. 달라지는 것은 용액에 남은 H⁺ 의 양이에요.', '측정은 처음부터 같은 미터로 해요. 곡선이 급해지는 것은 용액의 성질 때문이에요.', 'HCl 은 NaOH 와 만나 H⁺ 가 H₂O 로 변하는 것이지 물과 반응해 사라지지 않아요.'],
          explain: '19.99 mL 에서 남은 [H⁺] 는 약 2.5×10⁻⁵ M(pH 4.60), 20.01 mL 에서 [OH⁻] 도 약 2.5×10⁻⁵ M(pH 9.40)이에요. 이렇게 남은 양이 적을 때는 한 방울(약 0.05 mL)만 넣어도 [H⁺] 가 몇 자릿수씩 바뀌어요. pH 는 로그 눈금이라 그 변화가 크게 보여요.',
        },
      ],
    },
    {
      title: '이온 모형: 곡선 위의 입자', short: '이온 모형', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 곡선이 네 구간으로 나뉘고 당량점에서 급변하는 것을 봤어요. 곡선의 <b>각 점에서 용액 속에는 어떤 이온이 몇 개</b> 있을까요?</div>' +
        '<p>곡선 위의 점을 끌어 NaOH 의 부피를 바꾸면 H⁺, OH⁻, Na⁺, Cl⁻ 의 수가 달라져요. 입자 1개를 0.10 mmol 로 보면 처음 HCl 2.00 mmol 은 H⁺ 20개와 Cl⁻ 20개예요. 남은 이온의 몰수로 그 점의 pH 를 계산해 봐요.</p>',
      features: ['ion'],
      setup() { S.gate = ''; S.io.seen = {}; S.io.V = 10; calcRows.forEach((r) => r.clear()); setScene('ion'); },
      recap: '당량점 전에는 H⁺ 가 남아 산성, 당량점에서는 H⁺ 와 OH⁻ 가 모두 H₂O 가 되어 Na⁺ 와 Cl⁻ 만 남아 pH 7, 당량점 뒤에는 OH⁻ 가 남아 염기성이에요. 남은 이온의 몰수 ÷ 전체 부피로 농도와 pH 를 구해요.',
      summary: '<ul><li>0 mL: H⁺ 2.00 mmol, Cl⁻ 2.00 mmol → pH <b>1.00</b></li><li>10.0 mL: 남은 H⁺ = (2.00 − 1.00) mmol ÷ 30.0 mL = 0.0333 M → pH <b>1.48</b></li><li>20.0 mL: H⁺ + OH⁻ → H₂O 로 모두 소진, <b>Na⁺ 와 Cl⁻ 만</b> 남음 → pH <b>7.00</b></li><li>25.0 mL: 남은 OH⁻ = (2.50 − 2.00) mmol ÷ 45.0 mL = 0.0111 M → pOH 1.95 → pH <b>12.05</b></li><li>Na⁺ 와 Cl⁻ 는 물과 반응하지 않는 구경꾼 이온이에요.</li></ul>',
      missions: [
        {
          title: '네 지점 살펴보고 pH 계산하기',
          goal: '곡선의 점을 <b>0 · 10 · 20 · 25 mL</b> 로 옮겨 입자를 살펴보고, <b>10.0 mL</b> 와 <b>25.0 mL</b> 에서의 pH 를 계산하세요.',
          hint: '10.0 mL: 남은 H⁺ = (2.00 − 1.00) mmol, 전체 부피 30.0 mL. 25.0 mL: 남은 OH⁻ = (2.50 − 2.00) mmol, 전체 부피 45.0 mL. 농도를 구한 뒤 pH(또는 pOH → 14 − pOH)를 구해요.',
          setup() { S.gate = 'calc'; setScene('ion'); updateCtl(); },
          check: () => [0, 10, 20, 25].every((v) => S.io.seen[v]) && calcRows.every((r) => r.ok), hold: 0.5,
          status: () => '지점 ' + [0, 10, 20, 25].filter((v) => S.io.seen[v]).length + ' / 4 &nbsp; pH(10 mL) ' + mark(calcRows[0].ok) + ' pH(25 mL) ' + mark(calcRows[1].ok),
          explain: '10.0 mL: [H⁺] = 1.00 mmol ÷ 30.0 mL = 0.0333 M → pH <b>1.48</b>. 25.0 mL: [OH⁻] = 0.50 mmol ÷ 45.0 mL = 0.0111 M → pOH 1.95 → pH = 14 − 1.95 = <b>12.05</b>. 곡선의 값과 같아요.',
        },
        {
          type: 'quiz', title: '당량점의 용액에 들어 있는 것',
          goal: '당량점(NaOH 20.0 mL)의 용액에 <b>들어 있는 것</b>은?',
          setup() { S.gate = ''; setScene('ion'); },
          choices: ['Na⁺, Cl⁻ 와 물 분자 (H⁺ 와 OH⁻ 는 물의 이온화로 생긴 극소량뿐)', 'H⁺ 와 Cl⁻', 'OH⁻ 와 Na⁺', 'HCl 분자와 NaOH 분자'],
          answer: 0,
          feedback: ['', 'H⁺ 는 모두 OH⁻ 와 반응해 H₂O 가 됐어요. 20 mL 까지 남은 H⁺ 가 있었다면 pH 는 7 보다 작아요.', 'OH⁻ 는 20 mL 를 넘겨야 남아요. 당량점에서는 H⁺ 와 OH⁻ 가 같은 양이 만나 모두 소진돼요.', 'HCl 과 NaOH 는 물에서 완전히 이온화하는 강한 전해질이라 분자로는 거의 없어요.'],
          explain: '당량점에서는 H⁺ 와 OH⁻ 가 같은 몰수로 만나 모두 H₂O 가 돼요. 남는 것은 Na⁺ 와 Cl⁻ 이고, 이 이온들은 물과 반응하지 않아서 용액은 중성(pH <b>7.00</b>)이에요.',
        },
      ],
    },
    {
      title: '지시약 선택: 종말점과 당량점', short: '지시약 선택', icon: '🎨', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 당량점 부근에서 pH 가 급변하고 그 한가운데가 pH 7.00 임을 알았어요. 그럼 pH 미터 없이 <b>색깔이 변하는 지시약</b>으로 당량점을 찾으려면 어떤 지시약을 써야 할까요?</div>' +
        '<p>지시약마다 색이 변하는 pH 범위가 달라요. 메틸 오렌지 <b>3.1 ~ 4.4</b>, BTB <b>6.0 ~ 7.6</b>, 페놀프탈레인 <b>8.2 ~ 10.0</b> 이에요. 변색 범위를 곡선에 겹쳐 보고, 실제로 적정해서 <b>종말점</b>(색이 완전히 변한 지점)이 당량점과 얼마나 가까운지 비교해요.</p>',
      features: ['ind'],
      setup() { S.gate = ''; const n = S.ind; n.run = null; n.V = 0; n.c = 'c10'; n.res = { c10: { mo: null, btb: null, pp: null }, c01: { mo: null, btb: null, pp: null } }; selBest.value = ''; setScene('ind'); },
      recap: '변색 범위가 급변 구간 안에 있는 지시약을 쓰면 종말점이 당량점과 거의 같아요. 0.10 M 에서는 세 지시약 모두 한 방울(약 0.05 mL) 안이지만 0.010 M 처럼 묽으면 급변 구간이 좁아져 BTB 가 가장 가까워요.',
      summary: '<ul><li>변색 범위: 메틸 오렌지 <b>3.1 ~ 4.4</b> (빨강 → 노랑), BTB <b>6.0 ~ 7.6</b> (노랑 → 파랑), 페놀프탈레인 <b>8.2 ~ 10.0</b> (무색 → 분홍)</li><li>0.10 M: 급변 구간(19.9 ~ 20.1 mL)이 pH 3.60 ~ 10.40 이라 세 변색 범위가 모두 지나요. 종말점 오차는 모두 0.05 mL 이내예요.</li><li>0.010 M: 급변 구간이 pH 4.60 ~ 9.40 으로 좁아져요. 종말점 오차: 메틸 오렌지 −0.15 mL, BTB +0.01 mL, 페놀프탈레인 +0.41 mL → <b>BTB 가 가장 알맞아요.</b></li><li>종말점과 당량점이 거의 같으려면 지시약의 변색 범위가 <b>급변 구간 안</b>에 있어야 해요.</li></ul>',
      missions: [
        {
          title: '지시약 세 가지로 적정하기',
          goal: '0.10 M 에서 <b>메틸 오렌지 · BTB · 페놀프탈레인</b>을 차례로 골라 “적정하기”로 종말점을 구하세요.',
          hint: '지시약을 고르고 ▶ 적정하기를 눌러요. 색이 완전히 바뀌면 자동으로 종말점의 부피가 표에 기록돼요.',
          setup() { S.gate = ''; S.ind.run = null; S.ind.V = 0; S.ind.c = 'c10'; setScene('ind'); updateCtl(); },
          check: () => indOk('c10'), hold: 0.6,
          status: () => '종말점 ' + IK.filter((k) => S.ind.res.c10[k]).length + ' / 3 ' + mark(indOk('c10')),
          explain: '0.10 M 에서 종말점은 메틸 오렌지 19.99 mL, BTB 20.01 mL, 페놀프탈레인 20.05 mL 로 모두 당량점(20.00 mL)에서 한 방울(약 0.05 mL) 이내예요. 급변 구간이 세 변색 범위를 모두 지나기 때문이에요.',
        },
        {
          title: '묽은 용액에서 가장 알맞은 지시약', manual: true,
          goal: '농도를 <b>0.010 M</b> 로 바꿔 세 지시약으로 모두 적정한 뒤, 종말점이 당량점에 <b>가장 가까운</b> 지시약을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '농도 단추 0.010 M 을 누르고 지시약마다 ▶ 적정하기를 해 보세요. 표의 “당량점과 차”가 가장 작은 지시약을 찾아요.',
          setup() { S.gate = 'best'; S.ind.run = null; S.ind.V = 0; S.ind.c = 'c01'; setScene('ind'); updateCtl(); },
          check() { if (!indOk('c01')) return '먼저 0.010 M 에서 세 지시약으로 모두 적정해 보세요.'; if (!selBest.value) return '지시약을 하나 골라 주세요.'; if (selBest.value === 'btb') return true; return selBest.value === 'mo' ? '메틸 오렌지는 −0.15 mL 로 당량점에서 꽤 멀어요. 차이가 더 작은 지시약을 찾아 보세요.' : '페놀프탈레인은 +0.41 mL 로 오차가 가장 커요. 차이가 더 작은 지시약을 찾아 보세요.'; },
          status: () => '0.010 M 적정 ' + IK.filter((k) => S.ind.res.c01[k]).length + ' / 3 &nbsp; 선택 ' + (selBest.value ? IND[selBest.value].name : '—'),
          explain: '0.010 M 에서는 급변 구간이 pH 4.60 ~ 9.40 으로 좁아져요. 메틸 오렌지(3.1~4.4)는 구간 아래라 −0.15 mL, 페놀프탈레인(8.2~10.0)은 구간 위쪽에 걸쳐 +0.41 mL 어긋나지만, BTB(6.0~7.6)는 구간 안에 있어 +0.01 mL 로 가장 가까워요.',
        },
        {
          type: 'quiz', title: '종말점과 당량점이 거의 같으려면',
          goal: '종말점이 당량점과 <b>거의 같아지려면</b> 지시약은 어떤 조건을 만족해야 할까요?',
          setup() { S.gate = ''; setScene('ind'); },
          choices: ['지시약의 변색 범위가 급변 구간 안에 있어야 해요', '지시약의 색이 진할수록 좋아요', '지시약을 많이 넣을수록 정확해져요', '변색 범위가 pH 7 에서 멀수록 좋아요'],
          answer: 0,
          feedback: ['', '색의 진하기가 아니라 색이 변하는 pH 범위가 중요해요.', '지시약은 약한 산·염기라 많이 넣으면 오히려 오차가 생겨요. 몇 방울만 넣어요.', '급변 구간이 pH 7 부근을 지나므로 변색 범위가 그 구간 안에 들어와야 해요.'],
          explain: '급변 구간 안에서는 한두 방울로 pH 가 크게 변하므로, 변색 범위가 그 안에 있으면 색이 바뀌는 부피와 당량점의 부피가 거의 같아요. 구간 밖에 있으면 색이 일찍 또는 늦게 변해 오차가 커져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-titration-strong', mount: '#game', badge: '적정 곡선 박사', homeHref: '../../index.html#hr',
    featureLabels: { data: '🧪 뷰렛 · pH 기록표', graph: '📈 pH–부피 그래프', ion: '🧩 이온 입자 모형', ind: '🎨 지시약 · 종말점' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('data');
  function stepAll1(dt) { stepData(dt); stepGraph(dt); stepIon(dt); stepInd(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'data') drawData(t); else if (S.mode === 'graph') drawGraph(t); else if (S.mode === 'ion') drawIon(t); else drawInd(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, IND, IK, STD_V, pHof, pHr, vEnd, dtG, grG, ioG, inG, plotArea, predRow, calcRows, selRng, selBest, ioSlot, ioTargets, ioCount,
    dtAdd, dtRecord, dtNew, grLoad, grPts, grDone, slopeInfo, ioSetV, indSelect, indConc, indStart, indReset, indOk, setScene, uiExtra,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };


})();
