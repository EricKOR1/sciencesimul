/* 화학 Ⅳ. 역동적인 화학 반응 - 물의 자동 이온화 [12화학04-01]
   ① 관찰: 전기 흐를까 (전구 회로 vs 초민감 측정기) ② 모형: 자동 이온화 (H₂O ⇌ H⁺ + OH⁻, 동적 평형, 비율 1.8×10⁻⁹)
   ③ 탐구: Kw 규칙 ([H⁺][OH⁻] = 1.0×10⁻¹⁴) ④ 적용: 액성 판단 (+ 100 °C 순수한 물)
   pH 정의는 다음 차시에서 다뤄요. 모든 계산은 25 °C. */
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
  const fm = (v, d) => String(+v.toFixed(d == null ? 3 : d));
  const f1 = (v) => v.toFixed(1);
  const f2 = (v) => v.toFixed(2);
  const MINUS = '−';

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
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
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
  /* 보기 전환 단추: <div class="segmented" data-subsel="모드"> <button data-v="..."> */
  $$('[data-subsel]').forEach((box) => box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; Sound.click();
    S.sub[box.dataset.subsel] = b.dataset.v; S.fade = 0.5;
    $$('button', box).forEach((x) => x.classList.toggle('on', x === b));
    updateCtl();
  }));
  function syncSubsel() { $$('[data-subsel]').forEach((box) => $$('button', box).forEach((x) => x.classList.toggle('on', S.sub[box.dataset.subsel] === x.dataset.v))); }

  /* ---------- 입력 칸 (십진수 / 과학적 표기) ---------- */
  function mkRow(host, sp, onChange) {
    const w = document.createElement('div'); w.className = sp.sci ? 'sci-line' : 'row-line';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = sp.label; w.appendChild(lab);
    const box = document.createElement('div'); box.className = sp.sci ? 'sci-in' : 'in-wrap'; w.appendChild(box);
    const mk = (cls, ph, mode) => { const i = document.createElement('input'); i.type = 'text'; i.className = 'num-in ' + (cls || ''); i.inputMode = mode || 'decimal'; i.autocomplete = 'off'; i.placeholder = ph || ''; return i; };
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
  function numIn(el) { return parseNum(el.value); }

  /* ---------- 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 ---------- */
  function beaker(x, y, w, h, o) {
    o = o || {};
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11;
    const level = clamp(o.level == null ? 0 : o.level, 0, 1), ly = iy + ih * (1 - level);
    const rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    // 유리 바닥 · 그림자
    D.shadow(() => { path(x, y, w, h, rad); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    // 액체
    if (level > 0.002) {
      ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, ly, 0, iy + ih);
      const c = o.color || '#9bc8ff'; g.addColorStop(0, C.rgba(c, o.alpha != null ? o.alpha : 0.62)); g.addColorStop(1, C.rgba(C.shade(c, -0.18), Math.min(0.95, (o.alpha != null ? o.alpha : 0.62) + 0.18)));
      ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
      ctx.restore();
    }
    // 눈금
    (o.ticks || []).forEach((tk) => {
      const ty = iy + ih * (1 - tk.f);
      ctx.strokeStyle = 'rgba(70,90,120,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w - 2, ty); ctx.lineTo(x + w - (tk.long ? 20 : 12), ty); ctx.stroke();
      if (tk.label) T(x + w + 5, ty + 4.5, tk.label, 13, MUTED, 'left', 700);
    });
    // 유리 테두리 · 반사광
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
    return [px + Math.sin(t * 1.3 + i * 1.9) * k, py + Math.cos(t * 1.1 + i * 2.3) * k];
  }
  function drawBalls(g, n, r, color, t, o) {
    o = o || {};
    for (let i = 0; i < n; i++) { const p = ballPos(g, (o.off || 0) + i, r, o.wob, t); D.sphere(p[0], p[1], r, color, { gloss: r > 5 }); }
  }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  const MODE_LABEL = { obs: '🔌 전기 흐를까', model: '🔬 자동 이온화', kw: '⚖️ Kw 규칙', cls: '🧭 액성 판단' };
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const KW = 1.0e-14, KW100 = 5.1e-13;
  const C_H = '#ef6a4a', C_OH = '#3b82f6', C_NA = '#f59e0b', C_CL = '#22a06b';
  const W_MOL = 1000 / 18;                                  // 물 1 L의 몰수 (mol/L)
  const IONFRAC = 1.0e-7 / W_MOL;                           // 이온화한 비율
  const e10 = (e) => Math.pow(10, e);
  const logOf = (x) => Math.log10(x);
  const sciTxt = (x) => sci(x, 2);

  /* ---------- 상태 ---------- */
  Object.assign(S, {
    mode: 'obs', sub: { cls: 'card' },
    ob: { liq: 'salt', range: 'normal', flag: { normalW: false, sensW: false, bulbW: false }, bright: 0, mv: 10.7, cur: [0, 0] },
    md: { mol: [], ev: [], ion: 0, rec: 0, next: 1.2, speedUp: 0, ratioShown: false },
    kw: { mode: 'pure', x: 1, lh: 7, lo: 7, th: 7, to: 7, shake: 0 },
    cl: { k: 0, pick: {}, bal: 0, shake: 0, popA: 0 },
  });

  /* ================= ① 전기 흐를까 ================= */
  const LIQ = { salt: { name: '소금물 (0.1 M NaCl)', color: '#c7d2fe' }, water: { name: '증류수 (순수한 물)', color: '#dbeafe' } };
  const MV = { normal: { salt: 10.7, water: 0 }, sens: { salt: null, water: 0.055 } };    // normal: mS/cm, sens: μS/cm (null = 범위 초과)
  const currentOf = (kind) => { const l = S.ob.liq; if (kind === 0) return l === 'salt' ? 1 : 0; return l === 'salt' ? 1 : (S.ob.range === 'sens' ? 0.07 : 0); };
  const circGeom = (i) => (PHONE ? { x: MAIN.x + 8, y: MAIN.y + 6 + i * 213, w: MAIN.w - 16, h: 206 } : { x: MAIN.x + 10 + i * 384, y: MAIN.y + 12, w: 372, h: 318 });
  function circuitPath(g, i) {
    const bw = PHONE ? 96 : 124, bh = PHONE ? 76 : 104, cx = g.x + g.w / 2, by = g.y + g.h - bh - 28;
    const rt = by - (PHONE ? 26 : 54), wy = g.y + (PHONE ? 50 : 88), x1 = cx - (PHONE ? 26 : 38), x2 = cx + (PHONE ? 26 : 38);
    const dw = i === 0 ? (PHONE ? 60 : 76) : (PHONE ? 112 : 140), xo = dw / 2 + (PHONE ? 16 : 20), ty = rt - 14;
    return { cx, by, bw, bh, rt, wy, x1, x2, dw, xo, ty, path: [[x1, rt], [x1, ty], [cx - xo, ty], [cx - xo, wy], [cx - dw / 2, wy], [cx + dw / 2, wy], [cx + xo, wy], [cx + xo, ty], [x2, ty], [x2, rt]] };
  }
  function drawCircuit(i, t) {
    const g = circGeom(i), P = circuitPath(g, i), liq = LIQ[S.ob.liq], cur = S.ob.cur[i];
    panel(g.x, g.y, g.w, g.h, 14);
    T(g.x + 12, g.y + 24, i === 0 ? '① 일반 전구 회로' : PHONE ? '② 초민감 측정기 회로' : '② 초민감 전도도 측정기 회로', 14.5, INK, 'left', 800);
    // 전선 + 전류 점
    const path = P.path;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); path.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    // 건전지 (왼쪽 세로 전선 위)
    const bx = P.cx - P.xo, by2 = (P.ty + P.wy) / 2;
    ctx.fillStyle = '#f8fafc'; D.roundRect(bx - 14, by2 - 8, 28, 16, 3); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 12, by2 - 4); ctx.lineTo(bx + 12, by2 - 4); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx - 7, by2 + 5); ctx.lineTo(bx + 7, by2 + 5); ctx.stroke();
    T(bx - 22, by2 + 1, '+', 14, '#dc2626', 'center', 800); T(bx + 22, by2 + 10, '−', 14, '#2563eb', 'center', 800);   // + 는 긴 극판(위), − 는 짧은 극판(아래) 옆
    // 전류 점
    if (cur > 0.001) {
      let len = 0; const seg = []; for (let k = 0; k < path.length - 1; k++) { const l = Math.hypot(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]); seg.push(l); len += l; }
      const n = Math.max(2, Math.round(10 * cur)), sp = 60 * Math.max(cur, 0.2);
      for (let q = 0; q < n; q++) {
        let s = ((q / n) * len + (RM ? 0 : t * sp)) % len, k = 0; while (k < seg.length - 1 && s > seg[k]) { s -= seg[k]; k++; }
        const f = s / seg[k]; D.sphere(path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f, 3.6, '#facc15', { gloss: false });
      }
    }
    // 장치
    if (i === 0) {
      const b = S.ob.bright, r = PHONE ? 22 : 28, cy = P.wy - 6;
      if (b > 0.01) D.glow(P.cx, cy, r * 3.2 * b + 8, '#ffd447', 0.7 * b);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(P.cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = b > 0.05 ? C.rgba('#fde047', 0.4 + 0.6 * b) : 'rgba(0,0,0,0)'; ctx.beginPath(); ctx.arc(P.cx, cy, r - 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = b > 0.05 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(P.cx - 9, cy + r - 3); ctx.lineTo(P.cx - 9, cy + 2); ctx.quadraticCurveTo(P.cx, cy - 12, P.cx + 9, cy + 2); ctx.lineTo(P.cx + 9, cy + r - 3); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; D.roundRect(P.cx - 10, cy + r - 2, 20, 12, 3); ctx.fill();
      if (!PHONE) T(P.cx, cy - r - 12, b > 0.5 ? '불이 켜졌어요' : '불이 안 켜져요', 14, b > 0.5 ? '#b45309' : MUTED, 'center', 800);
    } else {
      const mw = P.dw, mh = PHONE ? 56 : 66, mx = P.cx - mw / 2, my = P.wy - mh / 2;
      D.shadow(() => { D.roundRect(mx, my, mw, mh, 10); ctx.fillStyle = '#e8edf6'; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.strokeStyle = '#8a97ad'; ctx.lineWidth = 2; D.roundRect(mx, my, mw, mh, 10); ctx.stroke();
      D.roundRect(mx + 8, my + 6, mw - 16, mh - 26, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
      const unit = S.ob.range === 'sens' ? 'μS/cm' : 'mS/cm', ol = S.ob.range === 'sens' && S.ob.liq === 'salt';
      const txt = ol ? 'OL' : (S.ob.range === 'sens' ? S.ob.mv.toFixed(3) : S.ob.mv.toFixed(S.ob.mv > 1 ? 1 : 3));
      T(mx + mw - 14, my + (PHONE ? 26 : 30), txt, PHONE ? 17 : 20, ol ? '#fca5a5' : '#4ade80', 'right', 800);
      T(mx + mw - 14, my + mh - 5, unit + (ol ? ' · 범위 초과' : ''), 13, '#334155', 'right', 800);
    }
    // 비커 · 전극 · 이온
    const bk = beaker(P.cx - P.bw / 2, P.by, P.bw, P.bh, { level: 0.64, color: liq.color, alpha: 0.7 });
    ['x1', 'x2'].forEach((k, n) => { ctx.fillStyle = '#475569'; D.roundRect(P[k] - 5, P.rt, 10, bk.bottom - 6 - P.rt, 3); ctx.fill(); if (!(PHONE && i === 1)) T(P[k], P.rt - 6, n ? '(−)' : '(+)', 13, n ? '#2563eb' : '#dc2626', 'center', 800); });
    if (S.ob.liq === 'salt') {
      for (let q = 0; q < 5; q++) {
        const u = r2(q + 3), wob = RM ? 0 : Math.sin(t * 1.4 + q) * 2;
        const lx = bk.ix + 12 + u[0] * (bk.iw / 2 - 22), rx = bk.ix + bk.iw / 2 + 10 + u[1] * (bk.iw / 2 - 22), y = bk.ly + 14 + u[1] * (bk.bottom - bk.ly - 28);
        D.sphere(lx + wob, y, 6, C_CL, { gloss: false }); D.sphere(rx - wob, bk.ly + 14 + u[0] * (bk.bottom - bk.ly - 28), 6, C_NA, { gloss: false });
      }
      T(P.cx, P.by + P.bh + 17, 'Na⁺ · Cl⁻가 아주 많아요', 13.5, MUTED, 'center', 800);
    } else {
      for (let q = 0; q < 14; q++) { const u = r2(q + 9), wob = RM ? 0 : Math.sin(t * 1.2 + q * 1.7) * 2; D.sphere(bk.ix + 8 + u[0] * (bk.iw - 16) + wob, bk.ly + 8 + u[1] * (bk.bottom - bk.ly - 16), 3.4, '#93c5fd', { gloss: false }); }
      if (i === 1 && S.ob.range === 'sens') {
        const pulse = RM ? 1 : 0.7 + 0.3 * Math.sin(t * 5);
        D.glow(bk.ix + 20, bk.ly + 26, 22 * pulse, C_H, 0.6); D.glow(bk.ix + bk.iw - 20, bk.ly + 26, 22 * pulse, C_OH, 0.6);
        D.sphere(bk.ix + 20, bk.ly + 26, 6, C_H, { gloss: false }); D.sphere(bk.ix + bk.iw - 20, bk.ly + 26, 6, C_OH, { gloss: false });
        T(P.cx, P.by + P.bh + 17, 'H⁺ · OH⁻가 아주 조금 있어요', 13.5, '#5b21b6', 'center', 800);
      } else T(P.cx, P.by + P.bh + 17, i === 0 ? '이온이 거의 없는 것처럼 보여요' : 'H₂O 분자 (이온은 눈금에 안 잡혀요)', 13.5, MUTED, 'center', 800);
    }
  }
  function drawObs(t) {
    T(14, 26, '🔌 같은 액체를 두 가지 회로로 시험해요: ' + LIQ[S.ob.liq].name, PHONE ? 13.5 : 17, INK, 'left', 800);
    drawCircuit(0, t); drawCircuit(1, t);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const w = S.ob.liq === 'water';
    T(INFO.x + 16, INFO.y + 26, w ? '증류수 시험 결과' : '소금물 시험 결과', 15, '#5b21b6', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, w ? '전구는 꺼져 있어요. 그런데 초민감 범위(μS/cm)에서는 0.055 μS/cm라는 아주 작은 전도도가 읽혀요. → 순수한 물에도 이온이 아주 조금 있어요.' : '이온(Na⁺, Cl⁻)이 많아서 전류가 잘 흘러 전구가 켜지고, 측정기에는 10.7 mS/cm가 읽혀요.', 14.5, INK, 21, 700);
    T(INFO.x + 16, INFO.y + INFO.h - 14, '1 mS/cm = 1000 μS/cm', 13.5, MUTED, 'left', 700);
  }
  function stepObs(dt) {
    const o = S.ob;
    o.cur[0] = ap(o.cur[0], currentOf(0), dt, 7); o.cur[1] = ap(o.cur[1], currentOf(1), dt, 7);
    o.bright = ap(o.bright, currentOf(0), dt, 8);
    const tv = o.range === 'sens' ? (o.liq === 'salt' ? 0 : MV.sens.water) : MV.normal[o.liq];
    o.mv = ap(o.mv, tv, dt, 8); if (Math.abs(o.mv - tv) < 0.0004) o.mv = tv;
  }
  /* ================= ② 자동 이온화 ================= */
  const BOX = PHONE ? { x: MAIN.x + 10, y: MAIN.y + 10, w: MAIN.w - 20, h: 236 } : { x: MAIN.x + 10, y: MAIN.y + 10, w: 462, h: MAIN.h - 20 };
  const NMOL = PHONE ? 14 : 18;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function mdInit() {
    const m = S.md; m.mol = []; m.ev = [];
    for (let i = 0; i < NMOL; i++) {
      const a = Math.random() * TAU, sp = rnd(26, 46);
      m.mol.push({ x: BOX.x + 30 + ((i * 0.618) % 1) * (BOX.w - 60), y: BOX.y + 30 + ((i * 0.382 + 0.17) % 1) * (BOX.h - 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ang: Math.random() * TAU, vr: rnd(-0.6, 0.6), type: 'w', nH: 2, busy: false });
    }
    m.ion = 0; m.rec = 0; m.next = 1.0;
  }
  const activePairs = () => S.md.mol.filter((q) => q.type === 'h3o').length;
  function startIonize() {
    const m = S.md; if (m.ev.length >= 2 || activePairs() >= 3) return false;
    const free = m.mol.filter((q) => q.type === 'w' && !q.busy); if (free.length < 2) return false;
    const a = free[Math.floor(Math.random() * free.length)];
    let b = null, bd = 1e9; free.forEach((q) => { if (q !== a) { const d = Math.hypot(q.x - a.x, q.y - a.y); if (d < bd) { bd = d; b = q; } } });
    a.busy = b.busy = true; a.vx = a.vy = b.vx = b.vy = 0;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ux = (b.x - a.x) / (bd || 1), uy = (b.y - a.y) / (bd || 1);
    const cx = clamp(mx, BOX.x + 40, BOX.x + BOX.w - 40), cy = clamp(my, BOX.y + 40, BOX.y + BOX.h - 40);
    m.ev.push({ a, b, ph: 'app', t: 0, ux: bd > 1 ? ux : 1, uy: bd > 1 ? uy : 0, cx, cy, life: rnd(2.0, 4.2) });
    return true;
  }
  function stepModel(dt) {
    const m = S.md; if (S.mode !== 'model') return;
    m.mol.forEach((q) => {
      if (!q.busy) {
        q.x += q.vx * dt; q.y += q.vy * dt; q.ang += q.vr * dt;
        if (q.x < BOX.x + 20) { q.x = BOX.x + 20; q.vx = Math.abs(q.vx); } if (q.x > BOX.x + BOX.w - 20) { q.x = BOX.x + BOX.w - 20; q.vx = -Math.abs(q.vx); }
        if (q.y < BOX.y + 20) { q.y = BOX.y + 20; q.vy = Math.abs(q.vy); } if (q.y > BOX.y + BOX.h - 20) { q.y = BOX.y + BOX.h - 20; q.vy = -Math.abs(q.vy); }
      }
    });
    // 겹치지 않게 살짝 밀어내기
    for (let i = 0; i < m.mol.length; i++) for (let j = i + 1; j < m.mol.length; j++) {
      const p = m.mol[i], q = m.mol[j]; if (p.busy && q.busy) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 30) { const f = (30 - d) / 2; if (!p.busy) { p.x -= dx / d * f; p.y -= dy / d * f; } if (!q.busy) { q.x += dx / d * f; q.y += dy / d * f; } }
    }
    m.next -= dt * (m.speedUp > 0 ? 3 : 1); m.speedUp = Math.max(0, m.speedUp - dt);
    if (m.next <= 0) { startIonize(); m.next = rnd(1.1, 2.4); }
    for (let i = m.ev.length - 1; i >= 0; i--) {
      const e = m.ev[i], a = e.a, b = e.b; e.t += dt;
      if (e.ph === 'app' || e.ph === 'app2') {
        const p = clamp(e.t / 0.8, 0, 1);
        if (e.ph === 'app') { a.x = ap(a.x, e.cx - e.ux * 17, dt, 6); a.y = ap(a.y, e.cy - e.uy * 17, dt, 6); b.x = ap(b.x, e.cx + e.ux * 17, dt, 6); b.y = ap(b.y, e.cy + e.uy * 17, dt, 6); }
        else { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; a.x = ap(a.x, mx - dx / d * 17, dt, 5); a.y = ap(a.y, my - dy / d * 17, dt, 5); b.x = ap(b.x, mx + dx / d * 17, dt, 5); b.y = ap(b.y, my + dy / d * 17, dt, 5); }
        a.ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI + 0.9; b.ang = Math.atan2(a.y - b.y, a.x - b.x) + Math.PI - 0.9;
        if (e.t >= 0.8) { e.ph = e.ph === 'app' ? 'tr' : 'tr2'; e.t = 0; if (e.ph === 'tr') { a.nH = 1; b.nH = 2; } else { b.nH = 2; a.nH = 1; } }
      } else if (e.ph === 'tr' || e.ph === 'tr2') {
        const p = clamp(e.t / 0.55, 0, 1), src = e.ph === 'tr' ? a : b, dst = e.ph === 'tr' ? b : a;
        e.hx = src.x + (dst.x - src.x) * sm(p); e.hy = src.y + (dst.y - src.y) * sm(p) - Math.sin(p * Math.PI) * 20;
        if (e.t >= 0.55) {
          if (e.ph === 'tr') {
            a.type = 'oh'; a.nH = 1; b.type = 'h3o'; b.nH = 3; m.ion++; Sound.tick();
            const sp = 46; a.vx = -e.ux * sp; a.vy = -e.uy * sp; b.vx = e.ux * sp; b.vy = e.uy * sp; a.busy = b.busy = false; e.ph = 'ion'; e.t = 0;
            flash((a.x + b.x) / 2, (a.y + b.y) / 2, ['#ef6a4a', '#3b82f6', '#fff']);
          } else {
            a.type = b.type = 'w'; a.nH = b.nH = 2; m.rec++; a.busy = b.busy = false; a.vx = rnd(-40, 40); a.vy = rnd(-40, 40); b.vx = rnd(-40, 40); b.vy = rnd(-40, 40); m.ev.splice(i, 1);
          }
        }
      } else if (e.ph === 'ion') {
        if (e.t >= e.life) { e.ph = 'app2'; e.t = 0; a.busy = b.busy = true; a.vx = a.vy = b.vx = b.vy = 0; }
      }
    }
  }
  function drawMol(q, t) {
    const o = q.type === 'w' ? '#e2464b' : q.type === 'oh' ? '#3b82f6' : '#f59e0b', r = q.type === 'w' ? 9 : 9.5;
    if (q.type !== 'w') D.glow(q.x, q.y, 30, q.type === 'oh' ? C_OH : C_H, 0.5);
    D.sphere(q.x, q.y, r, o, { gloss: true });
    const n = q.nH, dist = 12.5, base = q.ang;
    for (let i = 0; i < n; i++) {
      const a = n === 2 ? base + (i ? 0.92 : -0.92) : n === 1 ? base : base + i * TAU / 3;
      D.sphere(q.x + Math.cos(a) * dist, q.y + Math.sin(a) * dist, 5.2, '#f1f5f9', { gloss: false, outline: '#8a95a6', outlineWidth: 0.8 });
    }
    if (q.type !== 'w') T(q.x, q.y - 21, q.type === 'oh' ? 'OH⁻' : 'H₃O⁺', 13, q.type === 'oh' ? '#1d4ed8' : '#b45309', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
  }
  function drawModel(t) {
    const m = S.md;
    T(14, 26, '🔬 물 분자끼리 부딪쳐 이온이 생겨요 (크게 과장한 모형)', PHONE ? 13 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    D.roundRect(BOX.x, BOX.y, BOX.w, BOX.h, 12); ctx.fillStyle = '#eef6ff'; ctx.fill(); ctx.strokeStyle = '#9db8dc'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.save(); D.roundRect(BOX.x, BOX.y, BOX.w, BOX.h, 12); ctx.clip();
    m.mol.forEach((q) => { if (q.type === 'w') drawMol(q, t); });
    m.mol.forEach((q) => { if (q.type !== 'w') drawMol(q, t); });
    m.ev.forEach((e) => { if ((e.ph === 'tr' || e.ph === 'tr2') && e.hx != null) { D.glow(e.hx, e.hy, 16, '#fde047', 0.8); D.sphere(e.hx, e.hy, 5.6, '#fff', { gloss: false, outline: '#f59e0b', outlineWidth: 1.5 }); T(e.hx, e.hy - 12, 'H⁺', 13, '#b45309', 'center', 800, { stroke: '#fff', strokeWidth: 3 }); } });
    ctx.restore();
    // 오른쪽(또는 아래) 정보
    const pr = PHONE ? { x: MAIN.x + 10, y: MAIN.y + 254, w: MAIN.w - 20, h: 160 } : { x: MAIN.x + 482, y: MAIN.y + 10, w: MAIN.w - 492, h: MAIN.h - 20 };
    D.roundRect(pr.x, pr.y, pr.w, pr.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const pairs = activePairs(), lh = PHONE ? 22 : 26; let y = pr.y + 26;
    T(pr.x + 12, y, 'H₂O + H₂O ⇌ H₃O⁺ + OH⁻', PHONE ? 14.5 : 15.5, '#b45309', 'left', 800); y += lh - 2;
    T(pr.x + 12, y, '(간단히 H₂O ⇌ H⁺ + OH⁻)', 13.5, MUTED, 'left', 700); y += lh;
    T(pr.x + 12, y, '이온화한 횟수  ' + m.ion + '번', 14.5, INK, 'left', 800); y += lh - 4;
    T(pr.x + 12, y, '다시 합쳐진 횟수  ' + m.rec + '번', 14.5, INK, 'left', 800); y += lh - 4;
    T(pr.x + 12, y, '지금: H₃O⁺ ' + pairs + '개 · OH⁻ ' + pairs + '개 (항상 같아요)', 14, '#5b21b6', 'left', 800); y += lh;
    if (S.md.ratioShown || (game && game.free)) {
      textBlock(pr.x + 12, y, pr.w - 24, '물 1 L = 1000 g / 18 g/mol = ' + W_MOL.toFixed(1) + ' mol\n이온화: 1.0×10⁻⁷ / ' + W_MOL.toFixed(1) + ' ≈ ' + sciTxt(IONFRAC) + '\n= 약 5.6억 개 중 1개', 13.5, '#14803f', 18, 800);
    } else textBlock(pr.x + 12, y, pr.w - 24, '실제로는 물 분자 약 몇 개 중 1개만 이온화할까요? 미션에서 계산해 봐요.', 13.5, MUTED, 18, 700);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '동적 평형: 이온화(정반응) 속도 = 재결합(역반응) 속도', 15, '#5b21b6', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '물 분자 두 개가 부딪쳐 한쪽의 H⁺가 다른 쪽으로 건너가면 H₃O⁺와 OH⁻가 생기고, 곧 다시 합쳐져요. 순수한 물에서는 H⁺와 OH⁻가 늘 한 쌍씩 생기고 사라지므로 [H⁺] = [OH⁻]예요.', 14.5, INK, 21, 700);
  }

  /* ================= ③ Kw 규칙 ================= */
  const concTxt = (x) => (x === 1 ? '0.10' : x === 2 ? '0.010' : sciTxt(e10(-x)));
  function kwVals() {
    const k = S.kw; if (k.mode === 'pure') return { h: 1.0e-7, oh: 1.0e-7 };
    const c = e10(-k.x); return k.mode === 'acid' ? { h: c, oh: KW / c } : { h: KW / c, oh: c };
  }
  function kwNames() { const k = S.kw; return k.mode === 'pure' ? '순수한 물' : concTxt(k.x) + ' M ' + (k.mode === 'acid' ? 'HCl' : 'NaOH'); }
  function stepKw(dt) {
    const k = S.kw, v = kwVals(); k.th = 14 + logOf(v.h); k.to = 14 + logOf(v.oh);
    k.lh = ap(k.lh, k.th, dt, 6); k.lo = ap(k.lo, k.to, dt, 6);
    if (Math.abs(k.lh - k.th) < 0.004) k.lh = k.th; if (Math.abs(k.lo - k.to) < 0.004) k.lo = k.to;
    k.shake = Math.max(0, k.shake - dt);
  }
  const kwSettled = () => Math.abs(S.kw.lh - S.kw.th) < 0.05 && Math.abs(S.kw.lo - S.kw.to) < 0.05;
  function logBars(P, x0, x1, ys, h, lh, lo, vals, opt) {
    const xE = (e) => x0 + (x1 - x0) * (e + 14) / 14;
    // 눈금
    const ay = ys[1] + h + 12;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
    for (let e = -14; e <= 0; e += 2) { ctx.beginPath(); ctx.moveTo(xE(e), ys[0] - 14); ctx.lineTo(xE(e), ay); ctx.stroke(); }
    for (let e = -14; e <= 0; e += (PHONE ? 4 : 2)) T(xE(e + (PHONE && e === -14 ? 0 : 0)), ay + 16, '10' + supStr(e), 13, MUTED, 'center', 700);
    if (opt && opt.mid) { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#6d28d9'; ctx.beginPath(); ctx.moveTo(xE(-7), ys[0] - 20); ctx.lineTo(xE(-7), ay); ctx.stroke(); ctx.setLineDash([]); }
    [[ys[0], lh, C_H, '[H⁺] = ' + sciTxt(vals.h) + ' M'], [ys[1], lo, C_OH, '[OH⁻] = ' + sciTxt(vals.oh) + ' M']].forEach(([y, l, col, txt]) => {
      const w = (x1 - x0) * clamp(l, 0, 14) / 14;
      D.roundRect(x0, y, x1 - x0, h, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (w > 0.5) { ctx.save(); D.roundRect(x0, y, x1 - x0, h, 8); ctx.clip(); const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, C.shade(col, 0.25)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fillRect(x0, y, w, h); ctx.restore(); }
      T(x0 + 6, y - 6, txt, 14, INK, 'left', 800);
    });
  }
  function drawKw(t) {
    const k = S.kw, v = kwVals();
    T(14, 26, '⚖️ [H⁺]와 [OH⁻]를 로그 눈금 막대로 비교해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const bw = PHONE ? 84 : 120, bh = PHONE ? 112 : 176, bx = MAIN.x + (PHONE ? 26 : 34), by = MAIN.y + (PHONE ? 30 : 52);
    const col = k.mode === 'acid' ? '#fcd34d' : k.mode === 'base' ? '#93c5fd' : '#bbf7d0';
    const bk = beaker(bx, by, bw, bh, { level: 0.72, color: col, alpha: 0.7 });
    if (k.mode !== 'pure') {
      const n1 = 6, a1 = k.mode === 'acid' ? C_H : C_NA, a2 = k.mode === 'acid' ? C_CL : C_OH;
      drawBalls(bk, n1, 5, a1, t, { off: 2 }); drawBalls(bk, n1, 5, a2, t, { off: 31 });
    } else drawBalls(bk, 10, 3.6, '#93c5fd', t, { off: 4 });
    T(bx + bw / 2, by + bh + 20, kwNames(), 14, INK, 'center', 800);
    if (!PHONE) { textBlock(MAIN.x + 12, by + bh + 42, 150, k.mode === 'pure' ? 'H⁺와 OH⁻가 같은 수예요.' : (k.mode === 'acid' ? 'OH⁻는 아주 적게 남아 있어요.' : 'H⁺는 아주 적게 남아 있어요.'), 13.5, MUTED, 17, 700); }
    const P = PHONE ? { x: MAIN.x + 8, y: MAIN.y + 178, w: MAIN.w - 16, h: 240 } : { x: MAIN.x + 176, y: MAIN.y + 12, w: MAIN.w - 188, h: 318 };
    D.roundRect(P.x, P.y, P.w, P.h, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const x0 = P.x + (PHONE ? 22 : 36), x1 = P.x + P.w - (PHONE ? 22 : 36);
    const ys = PHONE ? [P.y + 52, P.y + 108] : [P.y + 66, P.y + 136], h = PHONE ? 28 : 34;
    T(P.x + 12, P.y + 24, '막대 길이 = 14 + log(농도)  (막대 끝 = 10⁰ M)', 13.5, MUTED, 'left', 800);
    logBars(P, x0, x1, ys, h, k.lh, k.lo, v, { mid: true });
    const cy = ys[1] + h + (PHONE ? 52 : 62);
    const prod = v.h * v.oh;
    T(P.x + 14, cy, '[H⁺] × [OH⁻]', 14.5, MUTED, 'left', 800);
    T(P.x + 14, cy + (PHONE ? 26 : 30), sciTxt(v.h) + ' × ' + sciTxt(v.oh) + ' = ' + sciTxt(prod), PHONE ? 16 : 20, '#5b21b6', 'left', 800);
    T(P.x + P.w - 14, cy + (PHONE ? 26 : 30), '= Kw (일정!)', PHONE ? 14 : 16, '#14803f', 'right', 800);
    T(P.x + 14, cy + (PHONE ? 52 : 58), '막대 길이의 합: ' + fm(k.th, 1) + ' + ' + fm(k.to, 1) + ' = ' + fm(k.th + k.to, 1) + ' 칸', 13.5, MUTED, 'left', 800);
    if (k.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + k.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '물의 이온화 상수 Kw = [H⁺][OH⁻] = 1.0×10⁻¹⁴ (25 °C)', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, k.mode === 'pure' ? '순수한 물: [H⁺] = [OH⁻] = 1.0×10⁻⁷ M. 곱은 1.0×10⁻¹⁴예요.' : (k.mode === 'acid' ? '산을 넣어 [H⁺]가 커지면 [OH⁻]는 같은 배수만큼 작아져서 곱이 일정해요.' : '염기를 넣어 [OH⁻]가 커지면 [H⁺]는 같은 배수만큼 작아져서 곱이 일정해요.') + '\n한쪽이 10배 커지면 다른 쪽은 1/10이 돼요. (넣은 산 · 염기에 비해 물에서 나오는 H⁺, OH⁻는 무시해요.)', 14.5, INK, 21, 700);
  }
  /* ================= ④ 액성 판단 ================= */
  const CARDS = [
    { given: 'oh', val: 0.040, gtxt: '0.040', cls: 'base' },
    { given: 'h', val: 1.0e-7, gtxt: '1.0×10⁻⁷', cls: 'neu' },
    { given: 'h', val: 1.0e-2, gtxt: '1.0×10⁻²', cls: 'acid' },
    { given: 'h', val: 4.0e-9, gtxt: '4.0×10⁻⁹', cls: 'base' },
  ];
  CARDS.forEach((c) => { c.ans = KW / c.val; c.find = c.given === 'oh' ? 'h' : 'oh'; });
  const CLSN = { acid: '산성', neu: '중성', base: '염기성' };
  const cardH = (c) => (c.given === 'h' ? c.val : c.ans), cardOH = (c) => (c.given === 'oh' ? c.val : c.ans);
  const clsOf = (h, oh) => (Math.abs(logOf(h / oh)) < 1e-6 ? 'neu' : h > oh ? 'acid' : 'base');
  CARDS.forEach((c) => { c.truth = clsOf(cardH(c), cardOH(c)); });

  /* ---------- UI 요소 ---------- */
  makeChips($('#oLiq'), [['salt', '🧂 소금물'], ['water', '💧 증류수']], (v) => { S.ob.liq = v; if (v === 'water') { S.ob.flag.bulbW = true; if (S.ob.range === 'normal') S.ob.flag.normalW = true; else S.ob.flag.sensW = true; } updateCtl(); });
  makeChips($('#oRange'), [['normal', '보통 범위 (mS/cm)'], ['sens', '초민감 범위 (μS/cm)']], (v) => { S.ob.range = v; if (S.ob.liq === 'water') { if (v === 'normal') S.ob.flag.normalW = true; else S.ob.flag.sensW = true; } updateCtl(); });
  makeChips($('#kMode'), [['pure', '💧 순수한 물'], ['acid', '🧪 HCl 넣기'], ['base', '🧴 NaOH 넣기']], (v) => { S.kw.mode = v; updateCtl(); });
  const ratioRow = mkRow($('#mdRow'), { label: '1.0×10⁻⁷ ÷ 55.6 = ? (이온화한 물 분자의 비율)', sci: true, ans: IONFRAC, rel: 0.05 }, (r) => { if (r.ok) S.md.ratioShown = true; updateCtl(); });
  const rowsA = [mkRow($('#kwRowsA'), { label: '[OH⁻] = Kw ÷ [H⁺] (mol/L)', sci: true, ans: KW / 1.0e-2, unit: 'M' }, () => updateCtl()), mkRow($('#kwRowsA'), { label: '[H⁺] × [OH⁻] (곱)', sci: true, ans: KW }, () => updateCtl())];
  const rowsB = [mkRow($('#kwRowsB'), { label: '[H⁺] = Kw ÷ [OH⁻] (mol/L)', sci: true, ans: KW / 1.0e-3, unit: 'M' }, () => updateCtl()), mkRow($('#kwRowsB'), { label: '[H⁺] × [OH⁻] (곱)', sci: true, ans: KW }, () => updateCtl())];
  const clsRows = CARDS.map((c, i) => {
    const host = document.createElement('div'); host.dataset.card = i; $('#clsRows').appendChild(host);
    return mkRow(host, { label: '카드 ' + (i + 1) + ': ' + (c.find === 'h' ? '[H⁺]' : '[OH⁻]') + ' = Kw ÷ ' + (c.given === 'h' ? '[H⁺]' : '[OH⁻]') + ' (mol/L)', sci: true, ans: c.ans, unit: 'M' }, () => updateCtl());
  });
  makeChips($('#cSel'), CARDS.map((c, i) => [String(i), '카드 ' + (i + 1)]), (v) => { S.cl.k = +v; updateCtl(); });
  makeChips($('#cChips'), [['acid', '산성'], ['neu', '중성'], ['base', '염기성']], (v) => {
    const k = S.cl.k, c = CARDS[k]; S.cl.pick[k] = v;
    if (v !== c.truth) { S.cl.shake = 0.4; showHint('[H⁺]와 [OH⁻] 중 어느 쪽이 더 큰지 비교해 보세요.', 3600); }
    updateCtl();
  });
  const cardDone = (i) => clsRows[i].ok && S.cl.pick[i] === CARDS[i].truth;
  const kwAok = () => S.kw.mode === 'acid' && S.kw.x === 2 && rowsA.every((r) => r.ok) && kwSettled();
  const kwBok = () => S.kw.mode === 'base' && S.kw.x === 3 && rowsB.every((r) => r.ok) && kwSettled();
  function uiExtra() {
    syncSubsel();
    markChips($('#oLiq'), S.ob.liq); markChips($('#oRange'), S.ob.range); markChips($('#kMode'), S.kw.mode);
    const dm = {}; CARDS.forEach((c, i) => { dm[i] = cardDone(i); }); markChips($('#cSel'), S.cl.k, dm);
    markChips($('#cChips'), S.cl.pick[S.cl.k]);
    $$('#cChips button').forEach((b) => { const p = S.cl.pick[S.cl.k]; b.classList.toggle('bad', p === b.dataset.v && p !== CARDS[S.cl.k].truth); });
    $$('#clsRows > div').forEach((n) => { n.hidden = +n.dataset.card !== S.cl.k; });
    $('#kxBox').hidden = S.kw.mode === 'pure' || S.mode !== 'kw';
    $('#oKx').textContent = concTxt(S.kw.x) + ' M ' + (S.kw.mode === 'acid' ? 'HCl' : 'NaOH'); $('#sKx').value = S.kw.x;
    $('#kMinus').disabled = S.kw.x <= 1; $('#kPlus').disabled = S.kw.x >= 5;
  }
  $('#sKx').addEventListener('input', (e) => { S.kw.x = clamp(Math.round(+e.target.value), 1, 5); updateCtl(); });
  $('#kMinus').addEventListener('click', () => { Sound.tick(); S.kw.x = clamp(S.kw.x - 1, 1, 5); updateCtl(); });
  $('#kPlus').addEventListener('click', () => { Sound.tick(); S.kw.x = clamp(S.kw.x + 1, 1, 5); updateCtl(); });
  $('#bCollide').addEventListener('click', () => { Sound.click(); if (!startIonize()) showHint('이온 쌍이 이미 충분해요. 잠시 뒤 다시 눌러 보세요.', 2400); else S.md.speedUp = 2; });
  const seesaw = (cx, base, len, ang, hTxt, ohTxt, lock) => {
    // 받침
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(cx - 22, base); ctx.lineTo(cx + 22, base); ctx.lineTo(cx, base - 44); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(cx, base - 44); ctx.rotate(ang);
    D.shadow(() => { D.roundRect(-len / 2, -7, len, 14, 7); ctx.fillStyle = '#64748b'; ctx.fill(); }, { blur: 5, y: 2 });
    [[-1, C_H, 'H⁺', hTxt], [1, C_OH, 'OH⁻', ohTxt]].forEach(([s, col, nm]) => {
      const px = s * (len / 2 - 14);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 14, -7); ctx.lineTo(px - 24, -34); ctx.moveTo(px + 14, -7); ctx.lineTo(px + 24, -34); ctx.stroke();
      ctx.save(); ctx.translate(px, -34); ctx.rotate(-ang);
      D.roundRect(-34, -8, 68, 12, 6); ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.stroke();
      D.sphere(0, -22, 15, col, { gloss: true, text: nm, textScale: 13 / 15 });
      ctx.restore();
    });
    ctx.restore();
    T(cx - len / 2 + 14, base + 24, hTxt, 14, INK, 'center', 800); T(cx + len / 2 - 14, base + 24, ohTxt, 14, INK, 'center', 800);
  };
  function drawCls(t) {
    const c = CARDS[S.cl.k], i = S.cl.k;
    T(14, 26, S.sub.cls === 'card' ? '🧭 이온 농도 카드로 액성 판단하기' : '🌡️ 온도가 달라지면 중성의 기준은?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    if (S.sub.cls === 'card') {
      const cx = MAIN.x + 12, cw = PHONE ? MAIN.w - 24 : 330, cy = MAIN.y + 12, ch = PHONE ? 178 : MAIN.h - 24;
      D.roundRect(cx, cy, cw, ch, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2.4; ctx.stroke();
      T(cx + 14, cy + 28, '용액 카드 ' + (i + 1) + ' / 4', 14.5, '#8a6d00', 'left', 800);
      T(cx + 14, cy + 62, '주어진 값', 13.5, MUTED, 'left', 700);
      T(cx + 14, cy + 90, (c.given === 'h' ? '[H⁺]' : '[OH⁻]') + ' = ' + c.gtxt + ' M', PHONE ? 20 : 24, INK, 'left', 800);
      const rw = clsRows[i];
      T(cx + 14, cy + 124, '구할 값', 13.5, MUTED, 'left', 700);
      T(cx + 14, cy + 152, (c.find === 'h' ? '[H⁺]' : '[OH⁻]') + ' = ' + (rw.ok ? sciTxt(c.ans) + ' M' : '?'), PHONE ? 20 : 24, rw.ok ? '#5b21b6' : '#9aa5b6', 'left', 800);
      if (!PHONE) { T(cx + 14, cy + 190, 'Kw = [H⁺][OH⁻] = 1.0×10⁻¹⁴', 14.5, '#b45309', 'left', 800); const p = S.cl.pick[i]; T(cx + 14, cy + 232, '액성', 13.5, MUTED, 'left', 700); T(cx + 14, cy + 262, p ? CLSN[p] + (p === c.truth ? ' ✅' : ' ❌') : '?', 22, p === c.truth ? '#14803f' : p ? '#b4231f' : '#9aa5b6', 'left', 800); }
      const sx = PHONE ? MAIN.x + MAIN.w / 2 : MAIN.x + 560, sb = PHONE ? MAIN.y + 340 : MAIN.y + 230, len = PHONE ? 300 : 340;
      const ready = rw.ok, ang = ready ? clamp(logOf(cardOH(c) / cardH(c)) / 6, -1, 1) * 0.3 : 0;
      seesaw(sx, sb, len, S.cl.bal, ready || c.given === 'h' ? (c.given === 'h' || ready ? sciTxt(cardH(c)) : '?') : '?', ready || c.given === 'oh' ? sciTxt(cardOH(c)) : '?');
      T(sx, MAIN.y + (PHONE ? 214 : 52), ready ? '[H⁺] ' + (cardH(c) > cardOH(c) ? '>' : cardH(c) < cardOH(c) ? '<' : '=') + ' [OH⁻]  →  ' + CLSN[c.truth] : '시소는 두 이온 중 더 많은 쪽으로 기울어요', 15, ready ? '#5b21b6' : MUTED, 'center', 800);
      if (PHONE) { const p = S.cl.pick[i]; T(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 14, '액성: ' + (p ? CLSN[p] + (p === c.truth ? ' ✅' : ' ❌') : '?'), 16, p === c.truth ? '#14803f' : p ? '#b4231f' : '#9aa5b6', 'center', 800); }
    } else {
      const rows = [['25 °C', KW], ['100 °C', KW100]];
      rows.forEach((r, n) => {
        const h = Math.sqrt(r[1]), y0 = MAIN.y + 14 + n * (PHONE ? 200 : 158), w = MAIN.w - 28;
        D.roundRect(MAIN.x + 14, y0, w, PHONE ? 190 : 150, 12); ctx.fillStyle = n ? '#fff5f2' : '#f2f8ff'; ctx.fill(); ctx.strokeStyle = n ? '#f2b8a8' : '#b8d2f0'; ctx.lineWidth = 2; ctx.stroke();
        T(MAIN.x + 28, y0 + 30, '순수한 물 ' + r[0], 16, INK, 'left', 800);
        T(MAIN.x + 28, y0 + 58, 'Kw = ' + sciTxt(r[1]), 15, '#b45309', 'left', 800);
        T(MAIN.x + 28, y0 + 86, '[H⁺] = [OH⁻] = ' + sciTxt(h) + ' M', 15, '#5b21b6', 'left', 800);
        T(MAIN.x + 28, y0 + 114, '[H⁺] = [OH⁻]이므로 ' + (PHONE ? '\n' : '') + '중성', 15, '#14803f', 'left', 800);
        seesaw(PHONE ? MAIN.x + MAIN.w - 120 : MAIN.x + w - 150, y0 + (PHONE ? 100 : 100), PHONE ? 180 : 220, 0, sciTxt(h), sciTxt(h));
      });
    }
    if (S.cl.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.cl.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '액성의 기준: [H⁺]와 [OH⁻]의 크기 비교', 15, '#5b21b6', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '[H⁺] > [OH⁻] 산성 · [H⁺] = [OH⁻] 중성 · [H⁺] < [OH⁻] 염기성\n온도가 올라가면 Kw가 달라지지만, 순수한 물은 늘 [H⁺] = [OH⁻]라서 중성이에요. (이 단원의 계산은 모두 25 °C)', 14.5, INK, 21, 700);
  }
  function stepCls(dt) {
    const c = CARDS[S.cl.k], tgt = clsRows[S.cl.k].ok ? clamp(logOf(cardOH(c) / cardH(c)) / 6, -1, 1) * 0.3 : 0;
    S.cl.bal = ap(S.cl.bal, tgt, dt, 6); if (Math.abs(S.cl.bal - tgt) < 0.002) S.cl.bal = tgt; S.cl.shake = Math.max(0, S.cl.shake - dt);
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'obs') {
      const o = S.ob, ol = o.range === 'sens' && o.liq === 'salt';
      setRead('액체', o.liq === 'salt' ? '소금물' : '증류수', '전구 회로', o.liq === 'salt' ? '켜짐' : '꺼짐', '측정기 값', ol ? '범위 초과' : o.range === 'sens' ? MV.sens.water.toFixed(3) + ' μS/cm' : (o.liq === 'salt' ? '10.7 mS/cm' : '0.000 mS/cm'));
    } else if (S.mode === 'model') {
      const m = S.md; setRead('이온화 / 재결합', m.ion + ' / ' + m.rec + '번', '이온 쌍', activePairs() + '쌍', 'H₃O⁺ = OH⁻ 수', activePairs() + ' = ' + activePairs());
    } else if (S.mode === 'kw') {
      const v = kwVals(); setRead('[H⁺]', sciTxt(v.h) + ' M', '[OH⁻]', sciTxt(v.oh) + ' M', '[H⁺][OH⁻]', sciTxt(v.h * v.oh));
    } else {
      const c = CARDS[S.cl.k], r = clsRows[S.cl.k]; if (S.sub.cls === 'temp') setRead('25 °C Kw', sciTxt(KW), '100 °C Kw', sciTxt(KW100), '100 °C [H⁺]', sciTxt(Math.sqrt(KW100)) + ' M (중성)');
      else setRead('카드 ' + (S.cl.k + 1), (c.given === 'h' ? '[H⁺] = ' : '[OH⁻] = ') + c.gtxt + ' M', c.find === 'h' ? '[H⁺]' : '[OH⁻]', r.ok ? sciTxt(c.ans) + ' M' : '?', '액성', S.cl.pick[S.cl.k] ? CLSN[S.cl.pick[S.cl.k]] : '?');
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '전기가 흐를까? 증류수 시험', short: '전기 흐를까', icon: '🔌', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 순수한 물에는 이온이 전혀 없을까? 산을 넣으면 OH⁻는 사라질까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 산은 물에 녹아 H⁺를 내는 물질, 염기는 OH⁻를 내는 물질이라고 배웠어요(아레니우스 정의). 이온이 있어야 전기가 흘러요. 그럼 순수한 물은 어떨까요?</div>' +
        '<p>같은 액체를 <b>일반 전구 회로</b>와 <b>초민감 전도도 측정기</b>로 시험해서 비교해요.</p>',
      features: ['obs'],
      setup() { S.gate = ''; S.ob.liq = 'salt'; S.ob.range = 'normal'; S.ob.flag = { normalW: false, sensW: false, bulbW: false }; setScene('obs'); },
      recap: '증류수는 전구를 켜지 못하지만, 초민감 측정기에서는 아주 작은 전도도(0.055 μS/cm)가 읽혀요. 순수한 물에도 이온이 극히 조금 있어요.',
      summary: '<ul><li>소금물: 이온이 많아 전구가 켜지고 전도도가 커요 (0.1 M NaCl ≈ 10.7 mS/cm).</li><li>증류수: 전구는 꺼지지만 초민감 측정기에서 <b>0.055 μS/cm</b>가 읽혀요 → 이온이 <b>아주 조금</b> 있어요.</li><li>1 mS/cm = 1000 μS/cm</li></ul>',
      missions: [
        {
          title: '증류수를 두 회로로 시험하기',
          goal: '<b>증류수</b>를 골라 전구 회로와 측정기를 보고, 측정기 범위를 <b>보통</b>과 <b>초민감</b>으로 모두 바꿔 읽으세요.',
          hint: '증류수 단추를 누른 뒤 “보통 범위”와 “초민감 범위”를 차례로 눌러요. 마지막에는 초민감 범위로 두세요.',
          setup() { S.gate = ''; S.ob.liq = 'salt'; S.ob.range = 'normal'; S.ob.flag = { normalW: false, sensW: false, bulbW: false }; setScene('obs'); },
          check: () => S.ob.liq === 'water' && S.ob.flag.normalW && S.ob.flag.sensW && S.ob.range === 'sens', hold: 0.8,
          status: () => '전구 ' + mark(S.ob.flag.bulbW) + ' 보통 범위 ' + mark(S.ob.flag.normalW) + ' 초민감 범위 ' + mark(S.ob.flag.sensW),
          explain: '증류수는 전구를 켜지 못하고 보통 범위 측정기도 0.000 mS/cm로 거의 0이에요. 하지만 초민감 범위에서는 <b>0.055 μS/cm</b>가 읽혀요. 순수한 물에도 이온이 <b>아주 조금</b> 있다는 증거예요.',
        },
        {
          type: 'quiz', title: '순수한 물에도 이온이 있을까?',
          goal: '증류수에서 전구가 켜지지 않았지만 초민감 측정기에는 값이 읽혔어요. 알 수 있는 것은?',
          setup() { S.gate = ''; S.ob.liq = 'water'; S.ob.range = 'sens'; setScene('obs'); },
          choices: ['순수한 물에는 이온이 전혀 없어요', '순수한 물에도 이온이 아주 조금 있어요', '증류수는 전기를 소금물만큼 잘 통해요', '측정기가 고장 났어요'],
          answer: 1,
          feedback: ['초민감 측정기에서 0이 아닌 값이 읽혔어요. 이온이 전혀 없다면 0이어야 해요.', '', '소금물은 약 10.7 mS/cm, 증류수는 0.055 μS/cm로 약 20만 배나 작아요.', '값은 순수한 물의 이온 때문에 생겨요. 아주 작을 뿐이에요.'],
          explain: '일반 전구는 아주 작은 전류를 알아채지 못하지만, 초민감 측정기는 읽을 수 있어요. 순수한 물에서도 물 분자의 극히 일부가 <b>H⁺와 OH⁻로 이온화</b>해 있어요.',
        },
      ],
    },
    {
      title: '자동 이온화: 물 분자의 충돌', short: '자동 이온화', icon: '🔬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 순수한 물에도 이온이 아주 조금 있다는 것을 알았어요. 이 이온은 어디서 생길까요? <b>단원 35에서 배운 평형</b>이 여기서도 나타나요.</div>' +
        '<p>물 분자 두 개가 부딪치면 한쪽의 H⁺가 다른 쪽으로 건너가 <b>H₃O⁺와 OH⁻</b>가 생기고, 곧 다시 합쳐져요. 이를 물의 <b>자동 이온화</b>라고 해요.</p>',
      features: ['model'],
      setup() { S.gate = ''; mdInit(); setScene('model'); },
      recap: '물은 H₂O + H₂O ⇌ H₃O⁺ + OH⁻(간단히 H₂O ⇌ H⁺ + OH⁻)로 이온화와 재결합이 같은 속도로 일어나는 동적 평형이에요. 이온화한 물은 약 5.6억 개 중 1개뿐이에요.',
      summary: '<ul><li>자동 이온화: H₂O + H₂O ⇌ H₃O⁺ + OH⁻ (간단히 H₂O ⇌ H⁺ + OH⁻)</li><li>정반응(이온화)과 역반응(재결합)의 속도가 같은 <b>동적 평형</b></li><li>순수한 물(25 °C): [H⁺] = [OH⁻] = 1.0×10⁻⁷ M (한 쌍씩 생기므로 같아요)</li><li>물 1 L = 1000 ÷ 18 = 55.6 mol → 이온화 비율 1.0×10⁻⁷ ÷ 55.6 ≈ <b>1.8×10⁻⁹</b> (약 5.6억 개 중 1개)</li></ul>',
      missions: [
        {
          title: '이온화와 재결합 관찰하기',
          goal: '물 분자가 부딪쳐 이온이 되었다가 다시 합쳐지는 장면을 <b>이온화 3번, 재결합 3번</b> 이상 관찰하세요.',
          hint: '“⚡ 충돌시키기”를 누르면 이온화가 더 자주 일어나요. 이온이 된 H₃O⁺와 OH⁻는 한 쌍씩 같이 생겨요.',
          setup() { S.gate = ''; setScene('model'); S.md.ion = 0; S.md.rec = 0; },
          check: () => S.md.ion >= 3 && S.md.rec >= 3, hold: 0.4,
          status: () => '이온화 ' + S.md.ion + '번 ' + mark(S.md.ion >= 3) + ' 재결합 ' + S.md.rec + '번 ' + mark(S.md.rec >= 3),
          explain: '이온이 생길 때는 H₃O⁺와 OH⁻가 <b>항상 한 쌍씩</b> 생기고, 합쳐질 때도 한 쌍씩 사라져요. 이온화와 재결합이 계속 같은 속도로 일어나므로 이온의 수는 일정하게 유지돼요(동적 평형).',
        },
        {
          title: '이온화한 물의 비율 계산', manual: true,
          goal: '1 L의 물(55.6 mol) 중 <b>1.0×10⁻⁷ mol</b>이 이온화해요. 비율 1.0×10⁻⁷ ÷ 55.6을 계산해 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '1.0×10⁻⁷ ÷ 55.6 ≈ 1.8×10⁻⁹이에요. 앞의 칸에 1.8, 뒤의 지수 칸에 −9를 써요.',
          setup() { S.gate = 'ratio'; ratioRow.clear(); S.md.ratioShown = false; setScene('model'); },
          check() { if (ratioRow.ok) return true; const v = ratioRow.read(); return isNaN(v) ? '비율을 과학적 표기(예: 1.8 × 10 ^ −9)로 써 주세요.' : '다시 계산해 보세요. 1.0×10⁻⁷ ÷ 55.6 이에요.'; },
          status: () => '비율 계산 ' + mark(ratioRow.ok),
          explain: '1.0×10⁻⁷ ÷ 55.6 ≈ <b>1.8×10⁻⁹</b>, 즉 약 <b>5.6억 개</b>(1 ÷ 1.8×10⁻⁹ ≈ 5.6×10⁸) 중 1개의 물 분자만 이온화해 있어요. 화면의 모형은 눈에 보이도록 크게 과장한 거예요.',
        },
        {
          type: 'quiz', title: '순수한 물에서 [H⁺] = [OH⁻]인 까닭',
          goal: '순수한 물에서 <b>[H⁺]와 [OH⁻]가 같은</b> 까닭은?',
          setup() { S.gate = ''; setScene('model'); },
          choices: ['H⁺가 OH⁻보다 훨씬 무거워서', '물이 이온화할 때 H⁺와 OH⁻가 하나씩 같이 생기기 때문에', '물에 산과 염기가 같은 양 들어 있어서', '물은 이온화하지 않아서'],
          answer: 1,
          feedback: ['농도는 입자의 무게와 관계없어요.', '', '순수한 물에는 산도 염기도 넣지 않았어요.', '물은 아주 조금 이온화해요. 그림에서 이온이 생기는 것을 봤어요.'],
          explain: '물 분자 하나가 이온화할 때 <b>H⁺ 하나와 OH⁻ 하나가 함께</b> 생겨요. 다른 물질을 넣지 않은 순수한 물에서는 두 이온의 수가 항상 같아서 [H⁺] = [OH⁻] = 1.0×10⁻⁷ M이에요.',
        },
      ],
    },
    {
      title: 'Kw 규칙: [H⁺][OH⁻]는 일정', short: 'Kw 규칙', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 순수한 물은 [H⁺] = [OH⁻] = 1.0×10⁻⁷ M임을 알았어요. 이제 산이나 염기를 <b>넣으면</b> 두 농도가 어떻게 달라지는지 살펴봐요.</div>' +
        '<p>HCl이나 NaOH를 넣어 보며 [H⁺]와 [OH⁻]를 <b>로그 눈금 막대</b>로 비교하고, 두 농도의 <b>곱</b>이 늘 같은지 확인해요. 물의 이온화 상수 <b>Kw = [H⁺][OH⁻]</b>예요.</p>',
      features: ['kw'],
      setup() { S.gate = ''; S.kw.mode = 'pure'; S.kw.x = 1; setScene('kw'); },
      recap: '25 °C에서 [H⁺][OH⁻] = Kw = 1.0×10⁻¹⁴예요. 한쪽이 10배 커지면 다른 쪽은 1/10이 돼요. 산성 용액에도 OH⁻가 아주 조금 있어요.',
      summary: '<ul><li><b>Kw = [H⁺][OH⁻] = 1.0×10⁻¹⁴</b> (25 °C)</li><li>0.010 M HCl: [H⁺] = 1.0×10⁻² M → [OH⁻] = 1.0×10⁻¹⁴ ÷ 1.0×10⁻² = <b>1.0×10⁻¹² M</b></li><li>1.0×10⁻³ M NaOH: [OH⁻] = 1.0×10⁻³ M → [H⁺] = <b>1.0×10⁻¹¹ M</b></li><li>산 · 염기를 넣어도 곱은 변하지 않아요. 산성 용액에도 OH⁻가 있고, 염기성 용액에도 H⁺가 있어요.</li></ul>',
      missions: [
        {
          title: '산을 넣을 때의 곱 계산',
          goal: '<b>0.010 M HCl</b>을 만들고(슬라이더), [OH⁻]와 [H⁺][OH⁻]의 값을 쓰세요.',
          hint: '“🧪 HCl 넣기”를 누르고 농도를 0.010 M로 맞춰요. [OH⁻] = 1.0×10⁻¹⁴ ÷ 1.0×10⁻² = 1.0×10⁻¹²예요. 앞 칸에 1.0, 지수 칸에 −12처럼 써요.',
          setup() { S.gate = 'kwA'; S.kw.mode = 'pure'; S.kw.x = 1; rowsA.forEach((r) => r.clear()); setScene('kw'); },
          check: () => kwAok(), hold: 0.6,
          status: () => 'HCl 0.010 M ' + mark(S.kw.mode === 'acid' && S.kw.x === 2) + ' [OH⁻] ' + mark(rowsA[0].ok) + ' 곱 ' + mark(rowsA[1].ok),
          explain: '[H⁺] = 1.0×10⁻² M이므로 [OH⁻] = Kw ÷ [H⁺] = 1.0×10⁻¹⁴ ÷ 1.0×10⁻² = <b>1.0×10⁻¹² M</b>이에요. 곱: 1.0×10⁻² × 1.0×10⁻¹² = <b>1.0×10⁻¹⁴</b> = Kw예요.',
        },
        {
          title: '염기를 넣을 때의 곱 계산',
          goal: '<b>1.0×10⁻³ M NaOH</b>를 만들고, [H⁺]와 [H⁺][OH⁻]의 값을 쓰세요.',
          hint: '“🧴 NaOH 넣기”를 누르고 1.0×10⁻³ M로 맞춰요. [H⁺] = 1.0×10⁻¹⁴ ÷ 1.0×10⁻³ = 1.0×10⁻¹¹이에요.',
          setup() { S.gate = 'kwB'; S.kw.mode = 'pure'; S.kw.x = 1; rowsB.forEach((r) => r.clear()); setScene('kw'); },
          check: () => kwBok(), hold: 0.6,
          status: () => 'NaOH 10⁻³ M ' + mark(S.kw.mode === 'base' && S.kw.x === 3) + ' [H⁺] ' + mark(rowsB[0].ok) + ' 곱 ' + mark(rowsB[1].ok),
          explain: '[OH⁻] = 1.0×10⁻³ M이므로 [H⁺] = 1.0×10⁻¹⁴ ÷ 1.0×10⁻³ = <b>1.0×10⁻¹¹ M</b>이에요. 곱 1.0×10⁻¹¹ × 1.0×10⁻³ = <b>1.0×10⁻¹⁴</b>예요.',
        },
        {
          type: 'quiz', title: '산성 용액에 OH⁻가 있을까?',
          goal: '0.010 M HCl 같은 <b>산성 용액</b>에도 OH⁻가 있을까요?',
          setup() { S.gate = ''; S.kw.mode = 'acid'; S.kw.x = 2; setScene('kw'); },
          choices: ['없어요. 산성에서는 OH⁻가 모두 사라져요', '있어요. 아주 적게 있어요 (1.0×10⁻¹² M)', '있어요. H⁺와 같은 양이에요', '있어요. H⁺보다 더 많아요'],
          answer: 1,
          feedback: ['[H⁺][OH⁻] = Kw가 일정하므로 [OH⁻]가 0이 될 수는 없어요.', '', '같은 양이면 중성이에요. 산성에서는 [H⁺]가 훨씬 커요.', '산성 용액은 [H⁺] > [OH⁻]예요.'],
          explain: '곱 [H⁺][OH⁻]는 항상 1.0×10⁻¹⁴이라서 [H⁺]가 커져도 [OH⁻]는 0이 되지 않고 <b>아주 작은 값</b>으로 남아요. 0.010 M HCl에서는 [OH⁻] = 1.0×10⁻¹² M이에요.',
        },
      ],
    },
    {
      title: '액성 판단: 산성 · 중성 · 염기성', short: '액성 판단', icon: '🧭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> [H⁺][OH⁻] = 1.0×10⁻¹⁴임을 확인했어요. 이제 한쪽 농도만 알아도 <b>다른 쪽을 구하고</b> 용액의 <b>액성</b>을 판단해 봐요.</div>' +
        '<p>용액 카드 4장에서 나머지 이온의 농도를 구하고 산성 · 중성 · 염기성으로 분류해요. 마지막에는 온도가 높아졌을 때 순수한 물이 어떻게 되는지도 살펴봐요.</p>',
      features: ['cls'],
      setup() { S.gate = ''; S.sub.cls = 'card'; S.cl.k = 0; setScene('cls'); },
      recap: '[H⁺] > [OH⁻] 산성, [H⁺] = [OH⁻] 중성, [H⁺] < [OH⁻] 염기성이에요. 100 °C의 순수한 물도 [H⁺] = [OH⁻]이므로 중성이에요.',
      summary: '<ul><li>[OH⁻] = 0.040 M → [H⁺] = 1.0×10⁻¹⁴ ÷ 0.040 = <b>2.5×10⁻¹³ M</b> (염기성)</li><li>[H⁺] = 1.0×10⁻⁷ M → [OH⁻] = 1.0×10⁻⁷ M (중성)</li><li>[H⁺] = 1.0×10⁻² M → [OH⁻] = 1.0×10⁻¹² M (산성)</li><li>[H⁺] = 4.0×10⁻⁹ M → [OH⁻] = 2.5×10⁻⁶ M (염기성)</li><li>100 °C 순수한 물: Kw ≈ 5.1×10⁻¹³, [H⁺] = [OH⁻] ≈ 7.1×10⁻⁷ M → 여전히 <b>중성</b></li></ul>',
      missions: [
        {
          title: '카드 4장의 농도 구하고 분류하기',
          goal: '카드마다 <b>나머지 이온의 농도</b>를 쓰고 <b>산성 · 중성 · 염기성</b>을 골라 4장을 모두 완성하세요.',
          hint: 'Kw ÷ (주어진 농도)로 나머지를 구해요. 카드 1: 1.0×10⁻¹⁴ ÷ 0.040 = 2.5×10⁻¹³. 시소가 기운 쪽의 이온이 더 많아요.',
          setup() { S.gate = ''; S.sub.cls = 'card'; S.cl.k = 0; S.cl.pick = {}; clsRows.forEach((r) => r.clear()); setScene('cls'); },
          check: () => CARDS.every((c, i) => cardDone(i)), hold: 0.6,
          status: () => CARDS.map((c, i) => (i + 1) + '번 ' + mark(cardDone(i))).join(' '),
          explain: '카드 1: [H⁺] = 2.5×10⁻¹³ M &lt; [OH⁻] 0.040 M → 염기성. 카드 2: [OH⁻] = 1.0×10⁻⁷ M = [H⁺] → 중성. 카드 3: [OH⁻] = 1.0×10⁻¹² M &lt; [H⁺] → 산성. 카드 4: [OH⁻] = 2.5×10⁻⁶ M &gt; [H⁺] = 4.0×10⁻⁹ M → 염기성이에요.',
        },
        {
          type: 'quiz', title: '100 °C의 순수한 물은 산성일까?',
          goal: '100 °C에서 순수한 물은 Kw ≈ 5.1×10⁻¹³이라서 [H⁺] = 7.1×10⁻⁷ M(25 °C보다 커요). <b>산성</b>일까요?',
          setup() { S.gate = ''; S.sub.cls = 'temp'; setScene('cls'); },
          choices: ['산성이에요. [H⁺]가 1.0×10⁻⁷ M보다 크니까요', '중성이에요. [H⁺] = [OH⁻]이니까요', '염기성이에요. Kw가 커졌으니까요', '온도에 따라 달라서 판단할 수 없어요'],
          answer: 1,
          feedback: ['중성의 기준은 숫자 1.0×10⁻⁷ M가 아니라 [H⁺] = [OH⁻]예요. 이 경우 [OH⁻]도 같이 커졌어요.', '', 'Kw가 커져도 [H⁺] = [OH⁻]면 염기성이 아니에요.', '[H⁺]와 [OH⁻]를 비교하면 판단할 수 있어요.'],
          explain: '액성은 [H⁺]와 [OH⁻]의 <b>크기 비교</b>로 정해요. 100 °C의 순수한 물도 H⁺와 OH⁻가 한 쌍씩 생기므로 [H⁺] = [OH⁻] ≈ 7.1×10⁻⁷ M → <b>중성</b>이에요. (이 단원의 계산은 모두 25 °C 기준이에요.)',
        },
      ],
    },
  ];

  mdInit(); setScene('obs');
  game = SciSim.game({
    simId: 'hc-water-ionization', mount: '#game', badge: '이온화 탐험가', homeHref: '../../index.html#hc',
    featureLabels: { obs: '🔌 전구 회로 · 초민감 측정기', model: '🔬 물 분자 충돌 모형', kw: '⚖️ 로그 막대 (Kw 규칙)', cls: '🧭 액성 판단 카드 · 온도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  function stepAll1(dt) { stepObs(dt); stepModel(dt); stepKw(dt); stepCls(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'obs') drawObs(t); else if (S.mode === 'model') drawModel(t); else if (S.mode === 'kw') drawKw(t); else drawCls(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, CARDS, rowsA, rowsB, clsRows, ratioRow, KW, IONFRAC, W_MOL, get game() { return game; },
    setScene, startIonize, kwVals, kwAok, kwBok, cardDone, activePairs, mdInit, kwSettled,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
