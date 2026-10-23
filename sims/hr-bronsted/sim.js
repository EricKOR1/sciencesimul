/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 브뢴스테드-라우리 산·염기 [12반응01-01]
   ① 관찰: 정의의 한계 (NaOH vs NH₃ 지시약, HCl(g) + NH₃(g) 흰 연기)  ② 모형: 양성자 이동 (H⁺ 구슬 옮기기)
   ③ 설명: 짝산·짝염기 (정반응 · 역반응, 동적 평형)  ④ 적용: 구별하기 (카드 분류, 양쪽성 HCO₃⁻)
   루이스 산·염기, Ka 계산(다음 차시), 산화·환원은 다루지 않아요. 모든 용액은 25 °C. */
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


  const MODE_LABEL = { obs: '🔎 정의의 한계', move: '🧩 H⁺ 옮기기', pairs: '🔗 짝산·짝염기', sort: '🗂️ 산·염기 구별' };
  const SPL = SciSim.ease;

  /* ---------- 원자 · 분자 그리기 ---------- */
  const AT = { O: { c: '#ef4444', r: 21 }, N: { c: '#3b82f6', r: 21 }, Cl: { c: '#16a34a', r: 25 }, H: { c: '#f8fafc', r: 11 } };
  function atom(x, y, e, o) {
    o = o || {}; const a = AT[e];
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    D.sphere(x, y, a.r, a.c, { text: e, textColor: e === 'H' ? '#475569' : '#fff', textScale: e === 'H' ? 1.05 : 0.95, outline: e === 'H' ? '#94a3b8' : null, outlineWidth: 1.2 });
    ctx.restore();
  }
  function molecule(x, y, c, hs, o) {
    const a = AT[c];
    hs.forEach((ang) => { const rd = ang * Math.PI / 180, d = a.r + 7; atom(x + Math.cos(rd) * d, y + Math.sin(rd) * d, 'H', o); });
    atom(x, y, c, o);
  }
  function badge(x, y, ch, k) {
    if (k <= 0.01) return;
    const r = Math.max(0.1, 10.5 * SPL.outBack(clamp(k, 0, 1)));
    ctx.save(); ctx.fillStyle = ch === '+' ? '#ef4444' : '#2563eb'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; const s = r * 0.5;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); if (ch === '+') { ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); } ctx.stroke();
    ctx.restore();
  }
  function bead(x, y, lift, t, hint) {
    if (hint) { D.glow(x, y, 26 + 3 * Math.sin(t * 5), PUR, 0.35); D.ring(x, y, 17, t, { color: PUR, width: 2.2, speed: 1.1 }); }
    const s = lift ? 1.22 : 1;
    D.shadow(() => { D.sphere(x, y, 11.5 * s, '#ffffff', { text: 'H⁺', textColor: '#5b21b6', textScale: 0.95, outline: PUR, outlineWidth: 2, gloss: false }); }, { blur: lift ? 12 : 5, y: lift ? 6 : 2 });
  }
  function arcAt(A, B, t, lift) {
    const cxp = (A.x + B.x) / 2, cyp = Math.min(A.y, B.y) - lift, u = 1 - t;
    return { x: u * u * A.x + 2 * u * t * cxp + t * t * B.x, y: u * u * A.y + 2 * u * t * cyp + t * t * B.y };
  }
  function tag(x, y, text, color, k) {
    if (k <= 0.01) return;
    ctx.save(); ctx.translate(x, y); const s = SPL.outBack(clamp(k, 0, 1)); ctx.scale(s, s);
    D.label(0, 0, text, { bg: color, size: 14 }); ctx.restore();
  }

  /* ============ ① 정의의 한계 ============ */
  const OBK = ['naoh', 'nh3'];
  const obG = () => { const bw = PHONE ? 116 : 150, bh = PHONE ? 150 : 140; return { cx: [MAIN.x + MAIN.w * 0.27, MAIN.x + MAIN.w * 0.73], by: MAIN.y + 118, bw, bh }; };
  const OB_LEVEL = 0.62;
  const fmG = () => {
    const bw = PHONE ? 56 : 66, bh = PHONE ? 92 : 108, xR = MAIN.x + MAIN.w * (PHONE ? 0.76 : 0.74), xLmin = MAIN.x + MAIN.w * (PHONE ? 0.12 : 0.1), R = PHONE ? 70 : 92;
    const floor = MAIN.y + MAIN.h - 50;
    return { bw, bh, xR, xLmin, R, gMin: bw + 20, gMax: xR - xLmin, floor, hy: floor - bh - 14 };
  };
  Object.assign(S, {
    mode: 'obs', sub: { obs: 'ind' },
    ob: { view: 'ind', dye: { naoh: 0, nh3: 0 }, dyeT: { naoh: 0, nh3: 0 }, act: null, dr: { x: 0, y: 0, init: false }, drops: [], gap: 0, smoke: 0, acc: 0, pulse: 0 },
  });
  S.ob.gap = fmG().gMax;
  const obSwitch = (v) => { S.ob.view = v; S.sub.obs = v; parts.clear(); updateCtl(); };
  function obReset() { const o = S.ob; o.act = null; o.drops = []; o.dyeT = { naoh: 0, nh3: 0 }; o.dye = { naoh: 0, nh3: 0 }; o.dr.init = false; updateCtl(); }
  function obDye(key) {
    const o = S.ob; if (o.act || o.dyeT[key] >= 1) return;
    o.act = { key, phase: 0, t: 0, n: 0 }; Sound.click(); updateCtl();
  }
  function setGap(g) { const G = fmG(); S.ob.gap = clamp(g, G.gMin, G.gMax); updateCtl(); }
  const gapPct = () => { const G = fmG(); return Math.round(100 * (G.gMax - S.ob.gap) / (G.gMax - G.gMin)); };
  function emitSmoke() {
    const G = fmG(), o = S.ob, xL = G.xR - o.gap;
    for (let k = 0; k < 8; k++) {
      const x = xL - G.R + Math.random() * (o.gap + 2 * G.R - 0) * 1, y = G.hy + (Math.random() - 0.5) * 2 * G.R;
      if (Math.hypot(x - xL, y - G.hy) <= G.R * 0.94 && Math.hypot(x - G.xR, y - G.hy) <= G.R * 0.94) {
        parts.emit({ x, y, vx: (Math.random() - 0.5) * 14, vy: -12 - Math.random() * 16, life: 2.6, size: 9 + Math.random() * 6, grow: 9, color: 'rgba(255,255,255,.55)', shape: 'smoke', gravity: 0 });
        return;
      }
    }
  }
  function stepOb(dt) {
    const o = S.ob, g = obG();
    OBK.forEach((k) => { o.dye[k] = ap(o.dye[k], o.dyeT[k], dt, 2.2); if (Math.abs(o.dye[k] - o.dyeT[k]) < 0.004) o.dye[k] = o.dyeT[k]; });
    const rest = { x: MAIN.x + MAIN.w / 2, y: g.by - 48 }, a = o.act;
    let tx = rest.x, ty = rest.y;
    if (a) { tx = g.cx[OBK.indexOf(a.key)]; ty = g.by - 48; }
    if (!o.dr.init) { o.dr.init = true; o.dr.x = rest.x; o.dr.y = rest.y; }
    o.dr.x = ap(o.dr.x, tx, dt, 7); o.dr.y = ap(o.dr.y, ty, dt, 7);
    if (a) {
      if (a.phase === 0) { if (Math.abs(o.dr.x - tx) < 3 && Math.abs(o.dr.y - ty) < 3) { a.phase = 1; a.t = 0.2; } }
      else if (a.phase === 1) {
        a.t -= dt;
        if (a.t <= 0) {
          if (a.n < 3) { a.n++; a.t = 0.55; o.drops.push({ x: o.dr.x, y: o.dr.y + 12, vy: 40, key: a.key }); } else { a.phase = 2; a.t = 0.5; }
        }
      } else { a.t -= dt; if (a.t <= 0) { o.act = null; updateCtl(); } }
    }
    const surf = g.by + 5 + (g.bh - 11) * (1 - OB_LEVEL);
    for (let i = o.drops.length - 1; i >= 0; i--) {
      const d = o.drops[i]; d.vy += 520 * dt; d.y += d.vy * dt;
      if (d.y >= surf) {
        o.dyeT[d.key] = Math.min(1, o.dyeT[d.key] + 0.34);
        parts.burst(d.x, surf, { count: 7, speed: 70, size: 2.6, gravity: 220, life: 0.5, colors: ['#22c55e', '#2563eb', '#93c5fd'], shape: 'circle' });
        o.drops.splice(i, 1); updateCtl();
      }
    }
    // 흰 연기
    const G = fmG(), f = clamp((2 * G.R - o.gap) / (G.R * 1.1), 0, 1);
    o.smoke = ap(o.smoke, S.mode === 'obs' && o.view === 'fume' ? f : 0, dt, 2.5);
    if (o.view === 'fume' && S.mode === 'obs' && o.smoke > 0.04 && !RM) { o.acc += dt * 70 * o.smoke; while (o.acc >= 1) { o.acc -= 1; emitSmoke(); } }
    o.pulse += dt;
  }
  function dropper(x, y, t) {
    ctx.save();
    const th = 44;
    ctx.fillStyle = 'rgba(235,244,255,.95)'; ctx.strokeStyle = '#52627d'; ctx.lineWidth = 2;
    D.roundRect(x - 5, y - th, 10, th - 6, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y - 8); ctx.lineTo(x, y + 2); ctx.lineTo(x + 5, y - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4ade80'; ctx.fillRect(x - 3, y - 30, 6, 24);
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(x, y - th - 8, 11, 15, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - 4, y - th - 12, 3, 6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function bottle(cx, fy, w, h, liq, lines, o) {
    o = o || {};
    const nw = w * 0.44, top = fy - h, sh = h * 0.22, x0 = cx - w / 2;
    const path = () => {
      ctx.beginPath(); ctx.moveTo(cx - nw / 2, top); ctx.lineTo(cx - nw / 2, top + sh * 0.6);
      ctx.quadraticCurveTo(x0, top + sh * 0.7, x0, top + sh * 1.6); ctx.lineTo(x0, fy - 9); ctx.quadraticCurveTo(x0, fy, x0 + 9, fy);
      ctx.lineTo(x0 + w - 9, fy); ctx.quadraticCurveTo(x0 + w, fy, x0 + w, fy - 9); ctx.lineTo(x0 + w, top + sh * 1.6);
      ctx.quadraticCurveTo(x0 + w, top + sh * 0.7, cx + nw / 2, top + sh * 0.6); ctx.lineTo(cx + nw / 2, top); ctx.closePath();
    };
    D.shadow(() => { path(); ctx.fillStyle = 'rgba(235,244,255,.85)'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); path(); ctx.clip(); ctx.fillStyle = liq; ctx.fillRect(x0, top + h * 0.38, w, h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x0, top + h * 0.38, w, 3); ctx.restore();
    path(); ctx.strokeStyle = 'rgba(70,100,140,.8)'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 8, top + sh * 1.8); ctx.lineTo(x0 + 8, fy - 16); ctx.stroke();
    lines.forEach((ln, i) => T(cx, fy + 18 + i * 16, ln, 13.5, o.color || '#e2e8f0', 'center', 800));
  }
  function nh3Dot(x, y, r, a) { ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.sphere(x, y, r, '#60a5fa', { gloss: false, outline: '#2563eb', outlineWidth: 1 }); ctx.restore(); }
  function drawObs(t) {
    const o = S.ob, g = obG();
    if (o.view === 'ind') {
      T(14, 26, '🔎 같은 농도의 NaOH와 NH₃ 수용액에 BTB 용액을 넣어요', PHONE ? 13.5 : 17, INK, 'left', 800);
      panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
      const names = ['0.10 M NaOH 수용액', '0.10 M NH₃ 수용액'];
      OBK.forEach((k, i) => {
        const x = g.cx[i] - g.bw / 2, dye = o.dye[k];
        const col = C.mix('#cfe8ff', '#2f6df0', sm(dye));
        const bk = beaker(x, g.by, g.bw, g.bh, { level: OB_LEVEL, color: col, alpha: 0.7 });
        if (k === 'naoh') {
          for (let n = 0; n < 14; n++) {
            const p = ballPos(bk, n, 7, 1.8, t), q = ballPos(bk, n + 20, 7, 1.8, t);
            D.sphere(p[0], p[1], 6.6, '#a78bfa', { gloss: false });
            D.sphere(q[0], q[1], 6.6, '#f43f5e', { gloss: false });
          }
        } else {
          for (let n = 0; n < 14; n++) { const p = ballPos(bk, n, 6, 1.6, t); nh3Dot(p[0], p[1], 5.8); }
          const pa = ballPos(bk, 41, 8, 1.6, t), pb = ballPos(bk, 47, 8, 1.6, t), al = 0.35 + 0.35 * Math.sin(t * 1.7);
          ctx.save(); ctx.globalAlpha = al; D.sphere(pa[0], pa[1], 7.5, '#1d4ed8', { gloss: false }); D.sphere(pb[0], pb[1], 7.5, '#f43f5e', { gloss: false }); ctx.restore();
        }
        T(g.cx[i], g.by + g.bh + 20, names[i], PHONE ? 13.5 : 15, INK, 'center', 800);
        // BTB 색 표지
        if (dye > 0.5) D.label(g.cx[i], g.by - 12, 'BTB: 파란색 (염기성)', { bg: '#2563eb', size: 13 });
      });
      // 입자 범례
      const ly = g.by + g.bh + 40;
      const lg = (x, col, txt, a) => { D.sphere(x, ly - 4, 5.5, col, { gloss: false }); T(x + 10, ly, txt, 13, MUTED, 'left', 700); };
      lg(g.cx[0] - 62, '#a78bfa', 'Na⁺'); lg(g.cx[0] + 2, '#f43f5e', 'OH⁻');
      lg(g.cx[1] - (PHONE ? 66 : 92), '#60a5fa', 'NH₃'); lg(g.cx[1] - (PHONE ? 8 : 22), '#1d4ed8', 'NH₄⁺'); lg(g.cx[1] + (PHONE ? 46 : 46), '#f43f5e', 'OH⁻');
      // 스포이트와 방울
      dropper(o.dr.x, o.dr.y, t);
      o.drops.forEach((d) => { D.sphere(d.x, d.y, 4.5, '#4ade80', { gloss: false }); });
      // INFO
      panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
      T(INFO.x + 16, INFO.y + 26, '아레니우스 정의: 염기 = 물에 녹아 OH⁻를 내놓는 물질', 15, '#b45309', 'left', 800);
      const l1 = o.dye.naoh > 0.5, l2 = o.dye.nh3 > 0.5;
      T(INFO.x + 16, INFO.y + 56, l1 ? '✅ NaOH → Na⁺ + OH⁻  (화학식에 OH가 있어서 설명돼요)' : '⬜ NaOH에 BTB 용액을 넣어 보세요', 14.5, l1 ? '#14803f' : MUTED, 'left', 800);
      if (!PHONE) {
        T(INFO.x + 16, INFO.y + 84, l2 ? '❓ NH₃ → ?  분자 속에 OH⁻가 없는데도 BTB가 파랗게 변했어요' : '⬜ NH₃ 수용액에 BTB 용액을 넣어 보세요', 14.5, l2 ? '#b91c1c' : MUTED, 'left', 800);
        textBlock(INFO.x + 16, INFO.y + 112, INFO.w - 32, l1 && l2 ? '두 용액 모두 염기성이에요. 아레니우스 정의로 NH₃가 염기인 까닭을 설명할 수 있을까요?' : '두 용액이 모두 염기성인지 확인해 보세요.', 14, INK, 20, 700);
      } else {
        textBlock(INFO.x + 16, INFO.y + 84, INFO.w - 32, l2 ? '❓ NH₃ → ?  분자 속에 OH⁻가 없는데도 BTB가 파랗게 변했어요.' : '⬜ NH₃ 수용액에 BTB 용액을 넣어 보세요', 14.5, l2 ? '#b91c1c' : MUTED, 20, 800);
        textBlock(INFO.x + 16, INFO.y + 140, INFO.w - 32, l1 && l2 ? '두 용액 모두 염기성이에요. 아레니우스 정의로 NH₃가 염기인 까닭을 설명할 수 있을까요?' : '두 용액이 모두 염기성인지 확인해 보세요.', 14, INK, 20, 700);
      }
    } else drawFume(t);
  }
  function drawFume(t) {
    const o = S.ob, G = fmG(), xL = G.xR - o.gap;
    T(14, 26, '💨 진한 염산과 진한 암모니아수를 가까이 해 보세요', PHONE ? 13.5 : 17, INK, 'left', 800);
    D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); const bg = ctx.createLinearGradient(0, MAIN.y, 0, MAIN.y + MAIN.h); bg.addColorStop(0, '#2a3552'); bg.addColorStop(1, '#1b2338'); ctx.fillStyle = bg; ctx.fill();
    // 실험대
    ctx.fillStyle = '#3b4766'; ctx.fillRect(MAIN.x + 8, G.floor, MAIN.w - 16, 8); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(MAIN.x + 8, G.floor, MAIN.w - 16, 2);
    // 기체 구름 (반지름 R: 실제 겹침 계산에 쓰이는 값)
    const haze = (cx, col, a) => { const gr = ctx.createRadialGradient(cx, G.hy, 4, cx, G.hy, G.R); gr.addColorStop(0, C.rgba(col, a)); gr.addColorStop(1, C.rgba(col, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, G.hy, G.R, 0, TAU); ctx.fill(); };
    haze(xL, '#22c55e', 0.42); haze(G.xR, '#60a5fa', 0.46);
    // 떠다니는 기체 분자
    for (let i = 0; i < 14; i++) {
      const rr = G.R * (0.25 + 0.65 * ((i * 0.37) % 1)), ph = i * 1.7, sp = RM ? 0 : 0.5 + (i % 4) * 0.12;
      const a1 = ph + t * sp, a2 = ph + 1.3 + t * sp * 0.9;
      D.sphere(xL + Math.cos(a1) * rr, G.hy + Math.sin(a1 * 1.3) * rr * 0.9, 3.4, '#4ade80', { gloss: false });
      D.sphere(G.xR + Math.cos(a2) * rr, G.hy + Math.sin(a2 * 1.2) * rr * 0.9, 3.4, '#93c5fd', { gloss: false });
    }
    T(xL, G.hy - G.R - 4, 'HCl(g)', 13.5, '#86efac', 'center', 800); T(G.xR, G.hy - G.R - 4, 'NH₃(g)', 13.5, '#bfdbfe', 'center', 800);
    bottle(xL, G.floor, G.bw, G.bh, 'rgba(250,240,160,.75)', ['진한 염산', 'HCl 수용액']);
    bottle(G.xR, G.floor, G.bw, G.bh, 'rgba(190,225,255,.75)', ['진한 암모니아수', 'NH₃ 수용액']);
    if (S.mode === 'obs' && !S.ob.dragging && o.view === 'fume') { /* 끌기 안내 */ D.arrow(xL - 30, G.floor - G.bh * 0.45, xL - 8, G.floor - G.bh * 0.45, { color: '#c4b5fd', width: 3 }); D.arrow(xL + 30, G.floor - G.bh * 0.45, xL + 52, G.floor - G.bh * 0.45, { color: '#c4b5fd', width: 3 }); }
    // 흰 연기 표시
    if (o.smoke > 0.25) { const mx = (xL + G.xR) / 2; D.label(mx, G.hy - G.R * 0.55 - 26 * o.smoke, 'NH₄Cl(s) 흰 연기', { bg: 'rgba(255,255,255,.92)', color: '#334155', size: 13.5 }); }
    // 연기량 막대
    const bx = MAIN.x + 14, by = MAIN.y + 40, bw = PHONE ? 110 : 150;
    T(bx, by - 4, '흰 연기의 양', 13, '#cbd5e1', 'left', 800);
    D.roundRect(bx, by + 2, bw, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
    if (o.smoke > 0.003) { D.roundRect(bx, by + 2, Math.max(2, bw * o.smoke), 10, 5); ctx.fillStyle = '#f8fafc'; ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, 'HCl(g) + NH₃(g) → NH₄Cl(s)   (흰 연기)', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, o.smoke > 0.4 ? '두 기체가 만나자 흰 연기가 생겼어요. 이 반응에는 물도 수용액도 없어요. 그런데 이것도 산과 염기의 반응이에요!' : '두 병을 가까이 가져가면 두 기체가 섞이는 곳에서 흰 연기가 생겨요. 아레니우스 정의는 “수용액에서 H⁺·OH⁻를 내놓는” 물질에 대한 정의라서 이 반응은 설명하지 못해요.', 14.5, INK, 21, 700);
  }

  /* ============ ② 양성자 이동 ============ */
  const MVR = {
    a: { chip: 'HCl + H₂O', gas: false,
      d: { c: 'Cl', fixed: [], f0: 'HCl', f1: 'Cl⁻', ch: '−' }, a: { c: 'O', fixed: [60, -60], f0: 'H₂O', f1: 'H₃O⁺', ch: '+' },
      eq: ['HCl + H₂O', '→', 'Cl⁻ + H₃O⁺'], acid: 'HCl', base: 'H₂O',
      tip0: 'HCl 분자 속의 H⁺(작은 흰 공)를 끌어서 H₂O 분자에게 가져다 주세요.',
      tip1: 'HCl이 H⁺를 주고 H₂O가 H⁺를 받았어요. H⁺를 준 HCl이 산, H⁺를 받은 H₂O가 염기예요. 물이 염기로 작용했어요!' },
    b: { chip: 'H₂O + NH₃', gas: false,
      d: { c: 'O', fixed: [125], f0: 'H₂O', f1: 'OH⁻', ch: '−' }, a: { c: 'N', fixed: [90, 0, -90], f0: 'NH₃', f1: 'NH₄⁺', ch: '+' },
      eq: ['NH₃ + H₂O', '⇌', 'NH₄⁺ + OH⁻'], acid: 'H₂O', base: 'NH₃',
      tip0: 'H₂O 분자의 H⁺를 끌어서 NH₃ 분자에게 가져다 주세요.',
      tip1: 'H₂O가 H⁺를 주어 OH⁻가 되고, NH₃가 H⁺를 받아 NH₄⁺가 됐어요. NH₃에는 OH⁻가 없어도 H⁺를 받는 염기예요. 이번에는 물이 산으로 작용했어요!' },
    c: { chip: 'HCl(g) + NH₃(g)', gas: true,
      d: { c: 'Cl', fixed: [], f0: 'HCl(g)', f1: 'Cl⁻', ch: '−' }, a: { c: 'N', fixed: [90, 0, -90], f0: 'NH₃(g)', f1: 'NH₄⁺', ch: '+' },
      eq: ['HCl(g) + NH₃(g)', '→', 'NH₄Cl(s)'], acid: 'HCl', base: 'NH₃',
      tip0: '기체 상태에서도 같은 규칙이에요. HCl의 H⁺를 NH₃에게 옮겨 보세요.',
      tip1: '물이 없어도 HCl이 H⁺를 주고 NH₃가 받았어요. 생긴 NH₄⁺와 Cl⁻가 끌어당겨 NH₄Cl(흰 고체)이 돼요. 브뢴스테드-라우리 정의는 수용액이 아닌 반응도 설명해요.' },
  };
  const MVK = ['a', 'b', 'c'];
  const mvRS = () => ({ done: false, anim: null, ion: 0, pop: 0, nuc: 0 });
  S.mv = { k: 'a', r: { a: mvRS(), b: mvRS(), c: mvRS() }, drag: null, shake: 0 };
  const mvGeom = () => { const cx = MAIN.x + MAIN.w / 2, Dd = PHONE ? 236 : 330; return { cx, cy: MAIN.y + (PHONE ? 176 : 160), ax: cx - Dd / 2, bx: cx + Dd / 2, Dd }; };
  function mvPos(k) { const g = mvGeom(), r = S.mv.r[k], off = r.nuc * (g.Dd / 2 - 52); return { dx: g.ax + off, ax: g.bx - off, y: g.cy }; }
  const slotD = (k) => { const p = mvPos(k); return { x: p.dx + AT[MVR[k].d.c].r + 7, y: p.y }; };
  const slotA = (k) => { const p = mvPos(k); return { x: p.ax - AT[MVR[k].a.c].r - 7, y: p.y }; };
  function beadPos(k) {
    const r = S.mv.r[k], d = S.mv.drag;
    if (d && d.k === k) return { x: d.x, y: d.y };
    if (r.anim) {
      const an = r.anim, e = an.ease(clamp(an.t, 0, 1));
      if (an.kind === 'arc') return arcAt(an.from, slotA(k), e, 62);
      const B = slotD(k); return { x: an.from.x + (B.x - an.from.x) * e, y: an.from.y + (B.y - an.from.y) * e };
    }
    return r.done ? slotA(k) : slotD(k);
  }
  function mvAnim(k, from, kind) {
    const r = S.mv.r[k]; r.anim = { kind, from: { x: from.x, y: from.y }, t: 0, dur: RM ? 0.01 : (kind === 'arc' ? 0.7 : 0.45), ease: kind === 'arc' ? SPL.inOutCubic : SPL.outBack };
    if (kind === 'arc') Sound.tick();
  }
  function mvAuto() { const k = S.mv.k, r = S.mv.r[k]; if (r.done || r.anim || S.mv.drag) return; mvAnim(k, slotD(k), 'arc'); updateCtl(); }
  function mvReset(k) { const r = S.mv.r[k || S.mv.k]; if (S.mv.drag && S.mv.drag.k === (k || S.mv.k)) S.mv.drag = null; Object.assign(r, mvRS()); updateCtl(); }
  const mvDone = (k) => S.mv.r[k].done;
  const mvCount = () => MVK.filter(mvDone).length;
  function stepMove(dt) {
    MVK.forEach((k) => {
      const r = S.mv.r[k];
      if (r.anim) {
        const an = r.anim; an.t += dt / an.dur;
        const bp = beadPos(k); if (!RM && S.mode === 'move') parts.emit({ x: bp.x, y: bp.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.4, size: 3.4, color: 'rgba(139,92,246,.75)', shape: 'circle' });
        if (an.t >= 1) {
          r.anim = null;
          if (an.kind === 'arc') { r.done = true; r.pop = 0.001; Sound.success(); const s = slotA(k); flash(s.x, s.y, ['#8b5cf6', '#ef4444', '#3b82f6']); updateCtl(); }
        }
      }
      r.ion = ap(r.ion, r.done ? 1 : 0, dt, 5); if (Math.abs(r.ion - (r.done ? 1 : 0)) < 0.004) r.ion = r.done ? 1 : 0;
      if (r.pop > 0 && r.pop < 1) r.pop = Math.min(1, r.pop + dt * 2.6);
      if (!r.done) r.pop = 0;
      r.nuc = ap(r.nuc, MVR[k].gas && r.done && r.pop >= 0.9 ? 1 : 0, dt, 2.4); if (!MVR[k].gas || !r.done) r.nuc = 0;
    });
    const d = S.mv.drag; if (d && S.mode === 'move' && !RM && Math.random() < 0.7) parts.emit({ x: d.x, y: d.y, vx: (Math.random() - 0.5) * 24, vy: (Math.random() - 0.5) * 24, life: 0.35, size: 3, color: 'rgba(139,92,246,.7)' });
    const rr = S.mv.r[S.mv.k];
    if (S.mode === 'move' && MVR[S.mv.k].gas && rr.nuc > 0.9 && !RM && Math.random() < 0.5) { const p = mvPos(S.mv.k), mx = (p.dx + p.ax) / 2; parts.emit({ x: mx + (Math.random() - 0.5) * 40, y: p.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 12, vy: -14 - Math.random() * 10, life: 2, size: 9 + Math.random() * 4, grow: 8, color: 'rgba(120,130,150,.5)', shape: 'smoke' }); }
  }
  function drawMove(t) {
    const k = S.mv.k, m = MVR[k], r = S.mv.r[k], g = mvGeom(), P = mvPos(k), d = S.mv.drag;
    T(14, 26, '🧩 H⁺(양성자)를 옮기면 무슨 일이 일어날까요?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 용액(또는 기체) 상자
    const fx = MAIN.x + 12, fy = MAIN.y + 44, fw = MAIN.w - 24, fh = g.cy + 96 - fy;
    D.roundRect(fx, fy, fw, fh, 12);
    if (m.gas) { ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
    else { const gr = ctx.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, '#e6f2ff'); gr.addColorStop(1, '#cfe6ff'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 2; ctx.stroke(); }
    T(fx + 12, fy + 22, m.gas ? '기체 상태 (물이 없어요)' : '수용액 속 (물 분자가 있어요)', 13.5, m.gas ? MUTED : '#2f5fa8', 'left', 800);
    // 분자
    const a0 = 1 - r.ion;
    ctx.save(); ctx.globalAlpha = 1;
    molecule(P.dx, P.y, m.d.c, m.d.fixed);
    molecule(P.ax, P.y, m.a.c, m.a.fixed);
    ctx.restore();
    // 전하 배지
    const dr = AT[m.d.c].r, ar = AT[m.a.c].r;
    badge(P.dx + dr * 0.75, P.y - dr * 0.85, m.d.ch, r.pop > 0 ? r.pop : 0);
    badge(P.ax + ar * 0.75, P.y - ar * 0.85 - 6, m.a.ch, r.pop > 0 ? clamp(r.pop - 0.1, 0, 1) / 0.9 : 0);
    // 이름표
    const nameY = g.cy + (PHONE ? 70 : 66);
    const nm = (cx, f0, f1, col) => { ctx.save(); T(cx, nameY, f0, 17, INK, 'center', 800, { alpha: 1 - r.ion }); T(cx, nameY, f1, 17, col, 'center', 800, { alpha: r.ion }); ctx.restore(); };
    nm(P.dx, m.d.f0, m.d.f1, '#1d4ed8'); nm(P.ax, m.a.f0, m.a.f1, '#b91c1c');
    // 역할 이름표
    tag(P.dx, g.cy - 70, '산 · H⁺ 주개', ACID, r.pop);
    tag(P.ax, g.cy - 70, '염기 · H⁺ 받개', BASE, clamp(r.pop - 0.15, 0, 1) / 0.85);
    // H⁺ 구슬
    const bp = beadPos(k);
    if (d && d.k === k) { const dd = Math.hypot(d.x - P.ax, d.y - P.y); D.ring(P.ax, P.y, 70, t, { color: dd <= 70 ? '#14a058' : PUR, width: dd <= 70 ? 3.5 : 2, speed: 1 }); }
    else if (!r.done && !r.anim) D.ring(P.ax, P.y, 70, t, { color: 'rgba(139,92,246,.7)', width: 1.6, speed: 0.8 });
    if (r.done && !r.anim) atom(bp.x, bp.y, 'H'); else bead(bp.x, bp.y, !!(d && d.k === k), t, !r.done && !r.anim && !d);
    if (!r.done && !r.anim && !d) { D.arrow(bp.x + 16, bp.y - 30, bp.x + 56, bp.y - 30, { color: PUR, width: 3, alpha: 0.8 }); }
    // 반응식
    const ey = g.cy + (PHONE ? 126 : 124);
    const al = 0.25 + 0.75 * r.ion;
    const eqL = m.eq[0] + '  ' + m.eq[1] + '  ';
    ctx.save(); ctx.font = D.font(PHONE ? 17 : 20, 800);
    const w1 = ctx.measureText(eqL).width, w2 = ctx.measureText(m.eq[2]).width; ctx.restore();
    const ex = MAIN.x + MAIN.w / 2 - (w1 + w2) / 2;
    T(ex, ey, eqL, PHONE ? 17 : 20, INK, 'left', 800); T(ex + w1, ey, r.done ? m.eq[2] : '?', PHONE ? 17 : 20, '#5b21b6', 'left', 800, { alpha: al });
    T(MAIN.x + MAIN.w / 2, ey + 26, MVK.map((q) => (mvDone(q) ? '●' : '○')).join(' ') + '  완료한 반응 ' + mvCount() + ' / 3', 13.5, MUTED, 'center', 800);
    if (S.mv.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.mv.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, r.done ? 'H⁺를 준 쪽 = 산,  H⁺를 받은 쪽 = 염기' : '규칙: H⁺를 주고받는 입자 모형', 15, '#b45309', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, r.done ? m.tip1 : m.tip0, 14.5, INK, 21, 700);
    if (!PHONE) textBlock(INFO.x + 16, INFO.y + 112, INFO.w - 32, '브뢴스테드-라우리 정의: 산 = 양성자(H⁺) 주개, 염기 = 양성자(H⁺) 받개', 14, '#5b21b6', 20, 800);
    else textBlock(INFO.x + 16, INFO.y + 150, INFO.w - 32, '브뢴스테드-라우리 정의\n산 = 양성자(H⁺) 주개\n염기 = 양성자(H⁺) 받개', 14.5, '#5b21b6', 22, 800);
  }
  const mvHit = (p) => { const k = S.mv.k, r = S.mv.r[k]; if (r.done || r.anim) return false; const b = beadPos(k); return Math.hypot(p.x - b.x, p.y - b.y) <= 28; };

  /* ============ ③ 짝산·짝염기 ============ */
  const ROLE = { acid: '산', base: '염기', cacid: '짝산', cbase: '짝염기' };
  const ROLE_COL = { acid: '#ef6a4a', base: '#3b82f6', cacid: '#f59e8c', cbase: '#93c5fd' };
  const RX = {
    hcl: { chip: 'HCl + H₂O →', arrow: '→', rev: false,
      sp: [{ f: 'HCl', role: 'acid' }, { f: 'H₂O', role: 'base' }, { f: 'Cl⁻', role: 'cbase' }, { f: 'H₃O⁺', role: 'cacid' }], pairs: [[0, 2], [1, 3]],
      note: 'HCl은 센 산이라 거의 모두 반응해요. 짝염기 Cl⁻가 H⁺를 거의 받지 못해서 역반응은 일어나지 않는다고 보고 → 로 써요.' },
    nh3: { chip: 'NH₃ + H₂O ⇌', arrow: '⇌', rev: true,
      sp: [{ f: 'NH₃', role: 'base' }, { f: 'H₂O', role: 'acid' }, { f: 'NH₄⁺', role: 'cacid' }, { f: 'OH⁻', role: 'cbase' }], pairs: [[0, 2], [1, 3]],
      note: '정반응에서는 H₂O가 산, NH₃가 염기예요. 역반응에서는 NH₄⁺가 산, OH⁻가 염기로 H⁺를 주고받아요.' },
    ch3: { chip: 'CH₃COOH + H₂O ⇌', arrow: '⇌', rev: true,
      sp: [{ f: 'CH₃COOH', role: 'acid' }, { f: 'H₂O', role: 'base' }, { f: 'CH₃COO⁻', role: 'cbase' }, { f: 'H₃O⁺', role: 'cacid' }], pairs: [[0, 2], [1, 3]],
      note: '아세트산은 약한 산이라 정반응과 역반응이 함께 일어나는 동적 평형 상태가 돼요.' },
  };
  const RXK = ['hcl', 'nh3', 'ch3'];
  const prG = () => {
    const bw = PHONE ? 92 : 148, bh = PHONE ? 58 : 66, opW = PHONE ? 20 : 34, arW = PHONE ? 38 : 70;
    const total = 4 * bw + 2 * opW + arW, x0 = MAIN.x + (MAIN.w - total) / 2, y = MAIN.y + (PHONE ? 92 : 84);
    return { bw, bh, y, opW, arW, xs: [x0, x0 + bw + opW, x0 + 2 * bw + opW + arW, x0 + 3 * bw + 2 * opW + arW], sy: MAIN.y + (PHONE ? 214 : 196) };
  };
  const prBox = (i) => { const G = prG(); return { x: G.xs[i], y: G.y, w: G.bw, h: G.bh }; };
  S.pr = { k: 'nh3', sel: -1, lines: { hcl: [0, 0], nh3: [0, 0], ch3: [0, 0] }, linesP: { hcl: [0, 0], nh3: [0, 0], ch3: [0, 0] }, hop: null, dirShown: 'f', after: false, mix: 0, fwdN: 0, revN: 0, auto: false, cool: 0, msg: '', msgT: 0, shake: [0, 0, 0, 0], selOk: [false, false, false, false], selR: [false, false], pop: 0 };
  const pairOf = (rx, i) => { for (const pr of rx.pairs) { if (pr[0] === i) return pr[1]; if (pr[1] === i) return pr[0]; } return -1; };
  function hopInfo(k, dir) {
    const rx = RX[k], sp = rx.sp;
    const find = (side, role) => sp.findIndex((s, i) => (side === 'L' ? i < 2 : i >= 2) && s.role === role);
    const dI = dir === 'f' ? find('L', 'acid') : find('R', 'cacid'), aI = dir === 'f' ? find('L', 'base') : find('R', 'cbase');
    return { dI, aI, dA: pairOf(rx, dI), aA: pairOf(rx, aI) };
  }
  function prSet(k) {
    const s = S.pr; s.k = k; s.sel = -1; s.hop = null; s.after = false; s.mix = 0; s.dirShown = 'f'; s.auto = false; s.msg = ''; s.cool = 0; Sound.click(); updateCtl();
  }
  function prHop(dir) {
    const s = S.pr, rx = RX[s.k]; if (s.hop) return;
    if (dir === 'r' && !rx.rev) return;
    s.hop = { dir, t: 0, dur: RM ? 0.05 : 1.5, counted: false }; s.dirShown = dir; s.after = false; s.mix = 0; Sound.tick(); updateCtl();
  }
  const prLinesDone = (k) => S.pr.lines[k][0] && S.pr.lines[k][1];
  function prPick(i) {
    const s = S.pr, rx = RX[s.k];
    if (s.sel < 0) { s.sel = i; Sound.click(); return; }
    if (s.sel === i) { s.sel = -1; return; }
    const a = s.sel, b = i; s.sel = -1;
    const pi = rx.pairs.findIndex((pr) => (pr[0] === a && pr[1] === b) || (pr[0] === b && pr[1] === a));
    if (pi < 0) {
      s.shake[a] = s.shake[b] = 0.45; Sound.fail();
      s.msg = (a < 2) === (b < 2) ? '같은 쪽(반응물끼리 또는 생성물끼리)은 짝이 아니에요. 왼쪽에서 하나, 오른쪽에서 하나를 골라 보세요.' : rx.sp[a].f + ' 와(과) ' + rx.sp[b].f + '는 H⁺ 하나 차이가 아니에요. H⁺를 주고받으면 서로 바뀌는 쌍을 찾아요.';
      s.msgT = 5; return;
    }
    if (s.lines[s.k][pi]) { s.msg = '이미 이어진 짝이에요.'; s.msgT = 3; return; }
    s.lines[s.k][pi] = 1; Sound.success();
    const ba = prBox(rx.pairs[pi][0]), bb = prBox(rx.pairs[pi][1]); flash((ba.x + bb.x + bb.w) / 2, pi === 0 ? ba.y - 20 : ba.y + ba.h + 24, ['#f59e0b', '#8b5cf6', '#14a058']);
    s.msg = rx.sp[rx.pairs[pi][0]].f + ' – ' + rx.sp[rx.pairs[pi][1]].f + ': H⁺ 하나 차이인 짝산–짝염기 쌍이에요!'; s.msgT = 5; updateCtl();
  }
  function prTap(p) {
    for (let i = 0; i < 4; i++) { if (pointInRect(p, prBox(i))) { prPick(i); return; } }
    S.pr.sel = -1;
  }
  function stepPairs(dt) {
    const s = S.pr;
    RXK.forEach((k) => { for (let i = 0; i < 2; i++) { s.linesP[k][i] = ap(s.linesP[k][i], s.lines[k][i], dt, 3.2); if (Math.abs(s.linesP[k][i] - s.lines[k][i]) < 0.004) s.linesP[k][i] = s.lines[k][i]; } });
    for (let i = 0; i < 4; i++) s.shake[i] = Math.max(0, s.shake[i] - dt);
    s.msgT = Math.max(0, s.msgT - dt); if (s.msgT <= 0 && s.msg && s.msgT === 0) s.msg = '';
    s.pop = Math.max(0, s.pop - dt);
    if (s.hop) {
      const h = s.hop; h.t += dt / h.dur;
      if (h.t >= 0.62 && !h.counted) { h.counted = true; if (h.dir === 'f') s.fwdN++; else s.revN++; s.pop = 0.5; Sound.success(); updateCtl(); }
      s.mix = h.counted ? sm((h.t - 0.62) / 0.2) : 0;
      if (h.t >= 1) { s.hop = null; s.after = true; s.mix = 1; s.cool = 0.5; updateCtl(); }
    } else {
      s.mix = ap(s.mix, s.after ? 1 : 0, dt, 8);
      if (s.auto && S.mode === 'pairs') { s.cool -= dt; if (s.cool <= 0) prHop(s.dirShown === 'f' && s.after ? 'r' : 'f'); }
    }
  }
  function curve(A, Cc, B, t) { const u = 1 - t; return { x: u * u * A.x + 2 * u * t * Cc.x + t * t * B.x, y: u * u * A.y + 2 * u * t * Cc.y + t * t * B.y }; }
  function drawPairs(t) {
    const s = S.pr, k = s.k, rx = RX[k], G = prG();
    T(14, 26, '🔗 반응식에서 짝산–짝염기 쌍을 찾아요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 짝 연결선 (그려지는 효과)
    rx.pairs.forEach((pr, pi) => {
      const p = s.linesP[k][pi]; if (p <= 0.003) return;
      const a = prBox(pr[0]), b = prBox(pr[1]);
      const up = pi === 0, A = { x: a.x + a.w / 2, y: up ? a.y : a.y + a.h }, B = { x: b.x + b.w / 2, y: up ? b.y : b.y + b.h }, Cc = { x: (A.x + B.x) / 2, y: up ? A.y - 62 : A.y + 62 };
      ctx.save(); ctx.lineCap = 'round'; ctx.beginPath();
      for (let n = 0; n <= 28; n++) { const q = curve(A, Cc, B, p * n / 28); if (n) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
      ctx.strokeStyle = 'rgba(245,158,11,.28)'; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3.6; ctx.stroke(); ctx.restore();
      if (p > 0.97) { const mid = curve(A, Cc, B, 0.5); D.label(mid.x, mid.y + (up ? -2 : 2), 'H⁺ 하나 차이', { bg: '#f59e0b', size: 13 }); }
    });
    // 물질 상자
    const vis = (i) => (game && game.free) || (k === 'nh3' && s.selOk[i]);
    for (let i = 0; i < 4; i++) {
      const b = prBox(i), sp = rx.sp[i], col = vis(i) ? ROLE_COL[sp.role] : '#94a3b8', sh = s.shake[i] > 0 ? Math.sin(s.shake[i] * 60) * 4 * (s.shake[i] / 0.45) : 0;
      const act = s.hop && ((s.hop.dir === 'f' && i < 2) || (s.hop.dir === 'r' && i >= 2));
      ctx.save(); ctx.translate(sh, 0);
      if (act) D.glow(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.8, PUR, 0.35 + 0.2 * Math.sin(t * 8));
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: s.sel === i ? 14 : 6, y: s.sel === i ? 6 : 2 });
      D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.strokeStyle = s.sel === i ? PUR : col; ctx.lineWidth = s.sel === i ? 4 : 2.6; ctx.stroke();
      const len = sp.f.length, fs = PHONE ? (len > 5 ? 14.5 : 18) : (len > 5 ? 19 : 23);
      T(b.x + b.w / 2, b.y + b.h / 2 + (vis(i) ? -2 : 7), sp.f, fs, INK, 'center', 800);
      if (vis(i)) { T(b.x + b.w / 2, b.y + b.h - 10, ROLE[sp.role], 13.5, sp.role === 'acid' ? '#c2410c' : sp.role === 'base' ? '#1d4ed8' : sp.role === 'cacid' ? '#c2410c' : '#1d4ed8', 'center', 800); }
      ctx.restore();
    }
    // 연산 기호 · 화살표
    const mid = (x, w) => x + w / 2;
    T(G.xs[0] + G.bw + G.opW / 2, G.y + G.bh / 2 + 8, '+', 24, MUTED, 'center', 800);
    T(G.xs[2] + G.bw + G.opW / 2, G.y + G.bh / 2 + 8, '+', 24, MUTED, 'center', 800);
    const ax0 = G.xs[1] + G.bw + 8, ax1 = G.xs[2] - 8, ay = G.y + G.bh / 2;
    const fAct = s.hop && s.hop.dir === 'f', rAct = s.hop && s.hop.dir === 'r';
    if (rx.rev) {
      D.arrow(ax0, ay - 9, ax1, ay - 9, { color: fAct ? PUR : '#94a3b8', width: fAct ? 4.5 : 3, head: 11 });
      D.arrow(ax1, ay + 9, ax0, ay + 9, { color: rAct ? PUR : '#94a3b8', width: rAct ? 4.5 : 3, head: 11 });
    } else D.arrow(ax0, ay, ax1, ay, { color: fAct ? PUR : '#94a3b8', width: fAct ? 4.5 : 3.4, head: 12 });
    T(mid(G.xs[1] + G.bw, G.arW + 16), G.y - 8, rx.rev ? '평형' : '한 방향', 13, MUTED, 'center', 800, { alpha: PHONE ? 0 : 1 });
    // ---- H⁺ 이동 무대
    const sx = MAIN.x + 14, sw = MAIN.w - 28, sy = G.sy, sh2 = MAIN.y + MAIN.h - 12 - sy;
    D.roundRect(sx, sy, sw, sh2, 12); ctx.fillStyle = '#faf8ff'; ctx.fill(); ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.stroke();
    const dirShown = s.dirShown, hi = hopInfo(k, dirShown);
    T(sx + 12, sy + 20, dirShown === 'f' ? '정반응 (→): 반응물끼리 H⁺를 주고받아요' : '역반응 (←): 생성물끼리 H⁺를 주고받아요', 13.5, '#5b21b6', 'left', 800);
    const R = PHONE ? 33 : 36, cy = sy + sh2 / 2 + 12, dxC = MAIN.x + MAIN.w / 2 - (PHONE ? 92 : 140), axC = MAIN.x + MAIN.w / 2 + (PHONE ? 92 : 140);
    const h = s.hop, hp = h ? h.t : 0;
    const blob = (cx, idxB, idxA, role0, role1, who) => {
      const mixv = s.mix, sc = 1 + (s.pop > 0 ? 0.12 * Math.sin(clamp(s.pop / 0.5, 0, 1) * Math.PI) : 0);
      const col0 = ROLE_COL[role0], col1 = ROLE_COL[role1];
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      D.shadow(() => { D.sphere(0, 0, R, mixv < 0.5 ? col0 : col1, { gloss: true }); }, { blur: 8, y: 3 });
      const f0 = rx.sp[idxB].f, f1 = rx.sp[idxA].f, fs = (f) => (f.length > 5 ? (PHONE ? 14 : 15.5) : (PHONE ? 17 : 19));
      T(0, 6, f0, fs(f0), '#fff', 'center', 800, { alpha: 1 - mixv, stroke: 'rgba(30,41,80,.45)', strokeWidth: 3 });
      T(0, 6, f1, fs(f1), '#fff', 'center', 800, { alpha: mixv, stroke: 'rgba(30,41,80,.45)', strokeWidth: 3 });
      ctx.restore();
      const lab0 = who === 'd' ? '산 (H⁺ 주개)' : '염기 (H⁺ 받개)', lab1 = who === 'd' ? '짝염기' : '짝산';
      T(cx, cy + R + 20, lab0, 13.5, who === 'd' ? '#c2410c' : '#1d4ed8', 'center', 800, { alpha: 1 - mixv });
      T(cx, cy + R + 20, lab1, 13.5, who === 'd' ? '#1d4ed8' : '#c2410c', 'center', 800, { alpha: mixv });
    };
    blob(dxC, hi.dI, hi.dA, 'acid', 'cbase', 'd'); blob(axC, hi.aI, hi.aA, 'base', 'cacid', 'a');
    // H⁺ 구슬
    const from = { x: dxC + R + 4, y: cy }, to = { x: axC - R - 4, y: cy };
    let bp = null;
    if (h) {
      if (hp < 0.12) bp = { x: dxC, y: cy - R - 14 * sm(hp / 0.12) };
      else if (hp < 0.62) { const u = SPL.inOutCubic((hp - 0.12) / 0.5); bp = arcAt({ x: dxC, y: cy - R - 14 }, { x: axC, y: cy - R - 14 }, u, 58); if (!RM && S.mode === 'pairs') parts.emit({ x: bp.x, y: bp.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.4, size: 3.4, color: 'rgba(139,92,246,.75)' }); }
    }
    if (bp) bead(bp.x, bp.y, true, t, false);
    else if (!s.after) bead(dxC, cy - R - 14, false, t, false);
    // 설명 · 계수
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '짝산–짝염기: H⁺ 하나 차이인 산 · 염기 쌍', 15, '#b45309', 'left', 800);
    const done = prLinesDone(k);
    const body = s.msg ? s.msg : (done ? rx.note : '물질 상자를 하나 누르고 짝이 되는 상자를 눌러 선으로 이어 보세요. (선택한 상자는 보라색 테두리)');
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, body, 14.5, s.msg && s.msg.indexOf('H⁺ 하나 차이인 짝산') >= 0 ? '#14803f' : INK, 21, 700);
    if (!PHONE) textBlock(INFO.x + 16, INFO.y + 112, INFO.w - 32, '산 → (H⁺를 잃으면) → 짝염기      염기 → (H⁺를 얻으면) → 짝산      정반응: ' + s.fwdN + '회 · 역반응: ' + s.revN + '회', 14, '#5b21b6', 20, 800);
    else textBlock(INFO.x + 16, INFO.y + 150, INFO.w - 32, '산 → (H⁺를 잃으면) → 짝염기\n염기 → (H⁺를 얻으면) → 짝산\n정반응: ' + s.fwdN + '회 · 역반응: ' + s.revN + '회', 14.5, '#5b21b6', 22, 800);
  }

  /* ============ ④ 구별하기 ============ */
  const CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  const RXS = [
    'HCl + H₂O → Cl⁻ + H₃O⁺', 'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻', 'HCO₃⁻ + H₂O ⇌ CO₃²⁻ + H₃O⁺', 'HCO₃⁻ + H₂O ⇌ H₂CO₃ + OH⁻',
    'CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻', 'NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺', 'OH⁻ + HCl → H₂O + Cl⁻', 'CO₃²⁻ + H₂O ⇌ HCO₃⁻ + OH⁻',
  ];
  const CARDS = [
    { id: 'hcl', f: 'HCl', rx: 0, ans: 'acid', why: 'HCl은 H₂O에게 H⁺를 주어요.' },
    { id: 'nh3', f: 'NH₃', rx: 1, ans: 'base', why: 'NH₃는 H₂O에게서 H⁺를 받아 NH₄⁺가 돼요.' },
    { id: 'h2o1', f: 'H₂O', rx: 0, ans: 'base', why: '이 반응에서 H₂O는 HCl에게서 H⁺를 받아 H₃O⁺가 돼요.' },
    { id: 'h2o2', f: 'H₂O', rx: 1, ans: 'acid', why: '이 반응에서 H₂O는 NH₃에게 H⁺를 주어 OH⁻가 돼요.' },
    { id: 'hco3a', f: 'HCO₃⁻', rx: 2, ans: 'acid', why: '이 반응에서 HCO₃⁻는 H₂O에게 H⁺를 주어 CO₃²⁻가 돼요.' },
    { id: 'hco3b', f: 'HCO₃⁻', rx: 3, ans: 'base', why: '이 반응에서 HCO₃⁻는 H₂O에게서 H⁺를 받아 H₂CO₃가 돼요.' },
    { id: 'ac', f: 'CH₃COO⁻', rx: 4, ans: 'base', why: 'CH₃COO⁻는 H₂O에게서 H⁺를 받아 CH₃COOH가 돼요.' },
    { id: 'nh4', f: 'NH₄⁺', rx: 5, ans: 'acid', why: 'NH₄⁺는 H₂O에게 H⁺를 주어 NH₃가 돼요.' },
    { id: 'oh', f: 'OH⁻', rx: 6, ans: 'base', why: 'OH⁻는 HCl에게서 H⁺를 받아 H₂O가 돼요. H⁺가 없는 입자는 H⁺를 줄 수 없어요.' },
    { id: 'co3', f: 'CO₃²⁻', rx: 7, ans: 'base', why: 'CO₃²⁻는 H₂O에게서 H⁺를 받아 HCO₃⁻가 돼요.' },
  ];
  const soCW = PHONE ? 132 : 134, soCH = PHONE ? 42 : 44;
  function soGeom() {
    const gap = 12, bw = (MAIN.w - gap * 3) / 2, bh = PHONE ? 182 : 176, y = MAIN.y + 38;
    const boxes = { acid: { x: MAIN.x + gap, y, w: bw, h: bh }, base: { x: MAIN.x + gap * 2 + bw, y, w: bw, h: bh } };
    const cols = PHONE ? 3 : 5, trayY = y + bh + (PHONE ? 8 : 12), tw = MAIN.w - gap * 2, cellW = tw / cols;
    return { boxes, cols, trayY, cellW, gap, bw, bh };
  }
  S.so = { cards: CARDS.map((c, i) => Object.assign({ box: null, x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1, init: false, shake: 0, pop: 0, ord: i }, c)), order: CARDS.map((c) => c.id), drag: null, sel: null, wrong: [], okAll: false, hcoT: 0 };
  const soCard = (id) => S.so.cards.find((c) => c.id === id);
  function soLayout() {
    const G = soGeom(), so = S.so;
    // 상자 안
    ['acid', 'base'].forEach((bx) => {
      const list = so.cards.filter((c) => c.box === bx).sort((a, b) => a.ord - b.ord), n = list.length, cols = PHONE ? 2 : 3, rows = Math.max(1, Math.ceil(n / cols));
      const B = G.boxes[bx], slotW = (B.w - 16) / cols, rowH = Math.min(52, (B.h - 38) / Math.max(2, rows));
      const s = Math.min(PHONE ? 0.74 : 0.88, slotW / soCW, rowH / soCH);
      list.forEach((c, i) => { c.ts = s; c.tx = B.x + 8 + ((i % cols) + 0.5) * slotW; c.ty = B.y + 32 + (Math.floor(i / cols) + 0.5) * rowH; });
    });
    // 트레이
    const tray = so.cards.filter((c) => !c.box);
    tray.forEach((c, idx) => { c.ts = 1; c.tx = MAIN.x + G.gap + (idx % G.cols + 0.5) * G.cellW; c.ty = G.trayY + Math.floor(idx / G.cols) * (soCH + 6) + soCH / 2; });
  }
  function soReset() { S.so.cards.forEach((c) => { c.box = null; c.shake = 0; }); S.so.wrong = []; S.so.drag = null; S.so.okAll = false; soLayout(); updateCtl(); }
  const soPlaced = () => S.so.cards.filter((c) => c.box).length;
  const soRight = () => S.so.cards.filter((c) => c.box === c.ans).length;
  function soCheck() {
    const so = S.so, un = so.cards.filter((c) => !c.box);
    if (un.length) return '아직 상자에 넣지 않은 카드가 ' + un.length + '장 있어요.';
    const bad = so.cards.filter((c) => c.box !== c.ans);
    const ids = bad.map((c) => c.id);
    if (ids.join() !== so.wrong.join()) { so.wrong = ids; bad.forEach((c) => { c.shake = 0.45; }); }
    if (bad.length) { const c = bad[0]; return '카드 ' + bad.length + '장이 알맞은 상자가 아니에요. 예: ' + c.f + ' (반응 ' + CIRC[c.rx] + '). 반응식에서 이 입자가 H⁺를 주었는지 받았는지 살펴보세요.'; }
    so.wrong = []; return true;
  }
  function stepSort(dt) {
    const so = S.so; soLayout();
    so.cards.forEach((c) => {
      const d = so.drag && so.drag.c === c;
      if (!c.init) { c.x = c.tx; c.y = c.ty; c.s = c.ts; c.init = true; }
      const tx = d ? so.drag.x : c.tx, ty = d ? so.drag.y : c.ty, ts = d ? 1.08 : c.ts;
      c.x = ap(c.x, tx, dt, d ? 40 : 13); c.y = ap(c.y, ty, dt, d ? 40 : 13); c.s = ap(c.s, ts, dt, 14);
      c.shake = Math.max(0, c.shake - dt); c.pop = Math.max(0, c.pop - dt * 2.5);
    });
    so.hcoT = ap(so.hcoT, 0, dt, 3);
  }
  function cardDraw(c, t, ok) {
    const so = S.so, drag = so.drag && so.drag.c === c, sh = c.shake > 0 ? Math.sin(c.shake * 55) * 5 * (c.shake / 0.45) : 0;
    const w = soCW, h = soCH, inbox = !!c.box;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(c.s * (1 + c.pop * 0.1), c.s * (1 + c.pop * 0.1));
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: drag ? 14 : 4, y: drag ? 7 : 2 });
    const wrongC = so.wrong.indexOf(c.id) >= 0;
    D.roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.strokeStyle = wrongC ? '#e2464b' : ok ? '#14a058' : drag ? PUR : so.sel === c.id ? PUR : inbox ? (c.box === 'acid' ? '#f0a08a' : '#8fb4f0') : '#cbd5e1'; ctx.lineWidth = wrongC || ok || so.sel === c.id ? 3 : 2; ctx.stroke();
    ctx.fillStyle = PUR; ctx.beginPath(); ctx.arc(-w / 2 + 17, 0, 11, 0, TAU); ctx.fill();
    T(-w / 2 + 17, 5.5, String(c.rx + 1), 14, '#fff', 'center', 800);
    const fs = c.f.length > 5 ? 19 : 21;
    T(8, 7, c.f, fs, INK, 'center', 800);
    ctx.restore();
  }
  function drawSort(t) {
    const so = S.so, G = soGeom();
    T(14, 26, '🗂️ 각 반응에서 H⁺를 준 쪽은 산, 받은 쪽은 염기!', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const bx = (key, name, col, bg) => {
      const B = G.boxes[key], n = so.cards.filter((c) => c.box === key).length;
      D.roundRect(B.x, B.y, B.w, B.h, 12); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(B.x + 12, B.y + 22, name, 16, col, 'left', 800); T(B.x + B.w - 12, B.y + 22, n + '장', 14, MUTED, 'right', 800);
      if (so.drag && pointInRect(so.drag, B)) { D.roundRect(B.x + 2, B.y + 2, B.w - 4, B.h - 4, 11); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke(); }
    };
    bx('acid', '산 (H⁺ 주개)', '#c2410c', '#fff3ee'); bx('base', '염기 (H⁺ 받개)', '#1d4ed8', '#eef4ff');
    // 트레이 배경
    D.roundRect(MAIN.x + 6, G.trayY - 5, MAIN.w - 12, MAIN.y + MAIN.h - (G.trayY - 5) - 6, 10); ctx.fillStyle = '#f4f1fc'; ctx.fill();
    const order = so.order.map(soCard);
    order.forEach((c) => { if (!(so.drag && so.drag.c === c)) cardDraw(c, t, so.okAll); });
    if (so.drag) cardDraw(so.drag.c, t, false);
    // 정답 확인 뒤 양쪽성 표시
    if (so.okAll) { const hb = so.cards.filter((c) => c.f === 'HCO₃⁻'); hb.forEach((c) => { D.label(c.x, c.y - soCH * c.s * 0.5 - 8, '양쪽성', { bg: '#14a058', size: 13 }); }); }
    // 정보 패널: 반응식 목록
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const cur = so.drag ? so.drag.c : (so.sel ? soCard(so.sel) : null);
    T(INFO.x + 16, INFO.y + 24, cur ? cur.f + ' (반응 ' + CIRC[cur.rx] + ') — H⁺를 준 쪽일까, 받은 쪽일까?' : '반응식 (카드의 번호)', 14.5, '#b45309', 'left', 800);
    const colN = PHONE ? 1 : 2, rowsN = Math.ceil(8 / colN), cw2 = (INFO.w - 32) / colN, lh = PHONE ? 28 : 24;
    RXS.forEach((q, i) => {
      const col = PHONE ? 0 : Math.floor(i / rowsN), row = PHONE ? i : i % rowsN, x = INFO.x + 16 + col * cw2, y = INFO.y + 46 + row * lh;
      if (cur && cur.rx === i) { D.roundRect(x - 6, y - 17, cw2 - 8, lh - 1, 8); ctx.fillStyle = 'rgba(139,92,246,.14)'; ctx.fill(); }
      T(x, y, CIRC[i] + ' ' + q, 13.5, cur && cur.rx === i ? '#5b21b6' : INK, 'left', cur && cur.rx === i ? 800 : 700);
    });
  }
  const soHit = (p) => {
    const so = S.so;
    for (let i = so.order.length - 1; i >= 0; i--) { const c = soCard(so.order[i]); if (Math.abs(p.x - c.x) <= soCW * c.s / 2 + 4 && Math.abs(p.y - c.y) <= soCH * c.s / 2 + 4) return c; }
    return null;
  };
  const HCOZ = (G, p) => (pointInRect(p, G.boxes.acid) ? 'acid' : pointInRect(p, G.boxes.base) ? 'base' : null);

  function onLeave(m) {
    if (m === 'pairs') { S.pr.auto = false; S.pr.sel = -1; }
    if (m === 'move') S.mv.drag = null;
    if (m === 'sort') S.so.drag = null;
    if (m === 'obs') S.ob.dragging = null;
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'obs' && S.ob.view === 'fume') {
        const G = fmG(), xL = G.xR - S.ob.gap;
        if (Math.abs(p.x - xL) <= G.bw / 2 + 12 && p.y >= G.floor - G.bh - 12 && p.y <= G.floor + 8) { S.ob.dragging = { dx: xL - p.x }; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'move') { if (mvHit(p)) { S.mv.drag = { k: S.mv.k, x: p.x, y: p.y }; Sound.click(); return true; } return false; }
      if (S.mode === 'pairs') { prTap(p); return false; }
      if (S.mode === 'sort') {
        const c = soHit(p); if (!c) { S.so.sel = null; return false; }
        S.so.drag = { c, x: p.x, y: p.y }; S.so.sel = c.id; S.so.order = S.so.order.filter((i) => i !== c.id).concat(c.id); c.box = null; S.so.wrong = []; Sound.click(); updateCtl(); return true;
      }
      return false;
    },
    move(p) {
      if (S.ob.dragging && S.mode === 'obs') { const G = fmG(); setGap(G.xR - (p.x + S.ob.dragging.dx)); }
      else if (S.mv.drag) { S.mv.drag.x = p.x; S.mv.drag.y = p.y; }
      else if (S.so.drag) { S.so.drag.x = p.x; S.so.drag.y = p.y; }
    },
    up(p) {
      if (S.ob.dragging) { S.ob.dragging = null; return; }
      const d = S.mv.drag;
      if (d) {
        S.mv.drag = null; const k = d.k, P = mvPos(k), dd = Math.hypot(p.x - P.ax, p.y - P.y);
        if (dd <= 70) mvAnim(k, p, 'arc'); else { mvAnim(k, p, 'back'); S.mv.shake = 0.35; Sound.fail(); showHint(MVR[k].base + ' 분자 가까이(보라색 원 안)에 놓아야 H⁺가 옮겨 가요.', 3200); }
        updateCtl(); return;
      }
      const sd = S.so.drag;
      if (sd) {
        S.so.drag = null; const G = soGeom(), z = HCOZ(G, p), c = sd.c;
        if (z) { c.box = z; c.ord = 100 + (++soSeq); c.pop = 0.4; Sound.tick(); const B = G.boxes[z]; flash(clamp(p.x, B.x + 10, B.x + B.w - 10), clamp(p.y, B.y + 10, B.y + B.h - 10), z === 'acid' ? ['#ef6a4a', '#f59e0b'] : ['#3b82f6', '#8b5cf6']); }
        else { c.box = null; Sound.tick(); }
        soLayout(); updateCtl();
      }
    },
    hover(p) {
      if (S.mode === 'obs' && S.ob.view === 'fume') { const G = fmG(), xL = G.xR - S.ob.gap; return Math.abs(p.x - xL) <= G.bw / 2 + 12 && p.y >= G.floor - G.bh - 12 ? 'grab' : 'default'; }
      if (S.mode === 'move') return mvHit(p) ? 'grab' : 'default';
      if (S.mode === 'pairs') { for (let i = 0; i < 4; i++) if (pointInRect(p, prBox(i))) return 'pointer'; return 'default'; }
      if (S.mode === 'sort') return soHit(p) ? 'grab' : 'default';
      return 'default';
    },
  });
  let soSeq = 0;

  /* ---------- UI 요소 ---------- */
  makeChips($('#obView'), [['ind', '🧪 지시약 반응'], ['fume', '💨 흰 연기']], (v) => { obSwitch(v); });
  makeChips($('#mvSel'), MVK.map((k) => [k, MVR[k].chip]), (v) => { if (S.mv.drag) S.mv.drag = null; S.mv.k = v; updateCtl(); });
  makeChips($('#prSel'), RXK.map((k) => [k, RX[k].chip]), (v) => { prSet(v); });
  const mkSel = (host, label, opts, ans) => {
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = label;
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', label.replace(/<[^>]+>/g, ''));
    opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
    host.append(lab, sel); sel.ans = ans;
    sel.addEventListener('change', () => { Sound.click(); sel.classList.toggle('ok', sel.value === ans); sel.classList.toggle('bad', !!sel.value && sel.value !== ans); updateCtl(); });
    return sel;
  };
  const RO4 = [['', '고르기'], ['acid', '산'], ['base', '염기'], ['cacid', '짝산'], ['cbase', '짝염기']], RO2 = [['', '고르기'], ['acid', '산'], ['base', '염기']];
  const selF = [['NH₃', 'base'], ['H₂O', 'acid'], ['NH₄⁺', 'cacid'], ['OH⁻', 'cbase']].map(([f, a]) => mkSel($('#blankF'), f, RO4, a));
  const selR = [['NH₄⁺', 'acid'], ['OH⁻', 'base']].map(([f, a]) => mkSel($('#blankR'), f, RO2, a));
  const HO = [['', '고르기'], ['H2CO3', 'H₂CO₃'], ['CO3', 'CO₃²⁻'], ['CO2', 'CO₂'], ['H3O', 'H₃O⁺']];
  const selH = [['HCO₃⁻ + H₂O ⇌ □ + H₃O⁺', 'CO3'], ['HCO₃⁻ + H₂O ⇌ □ + OH⁻', 'H2CO3']].map(([f, a]) => mkSel($('#blankH'), f, HO, a));
  function clearSels(arr) { arr.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function selSync() { selF.forEach((s, i) => { S.pr.selOk[i] = s.value === s.ans; }); selR.forEach((s, i) => { S.pr.selR[i] = s.value === s.ans; }); }
  const lineCount = (k) => S.pr.lines[k][0] + S.pr.lines[k][1];

  function uiExtra() {
    if (typeof selF === 'undefined') return;
    selSync();
    markChips($('#obView'), S.ob.view);
    const o = S.ob;
    $('#bDyeN').disabled = !!o.act || o.dyeT.naoh >= 1; $('#bDyeA').disabled = !!o.act || o.dyeT.nh3 >= 1;
    $('#bDyeN').textContent = o.dyeT.naoh >= 1 ? '✅ NaOH 넣었어요' : 'NaOH에 넣기'; $('#bDyeA').textContent = o.dyeT.nh3 >= 1 ? '✅ NH₃ 넣었어요' : 'NH₃ 수용액에 넣기';
    const pct = gapPct(); $('#sGap').value = pct; $('#oGap').textContent = '병 사이 거리 ' + (o.gap * 0.05).toFixed(1) + ' cm  (가까운 정도 ' + pct + ' %)';
    $('#gFar').disabled = pct <= 0; $('#gNear').disabled = pct >= 100;
    const done = {}; MVK.forEach((k) => { done[k] = mvDone(k); });
    markChips($('#mvSel'), S.mv.k, done);
    const r = S.mv.r[S.mv.k]; $('#bMvAuto').disabled = r.done || !!r.anim || !!S.mv.drag;
    $('#mvNote').textContent = r.done ? '완료! 다른 반응도 해 보세요. 다시 하려면 “다시 하기”를 눌러요.' : '작은 흰 공(H⁺)을 끌어서 받을 분자에게 가져다 놓으세요. 끌기 어려우면 자동 단추를 눌러요.';
    const pd = {}; RXK.forEach((k) => { pd[k] = prLinesDone(k); });
    markChips($('#prSel'), S.pr.k, pd);
    const rx = RX[S.pr.k];
    $('#bFwd').disabled = !!S.pr.hop; $('#bRev').disabled = !!S.pr.hop || !rx.rev; $('#bAuto').disabled = !rx.rev;
    $('#bAuto').textContent = S.pr.auto ? '⏸ 멈추기' : '🔁 번갈아 계속하기'; $('#bAuto').classList.toggle('btn-primary', !!S.pr.auto);
    $('#prNote').textContent = rx.rev ? '정반응과 역반응을 번갈아 재생하면 동적 평형을 볼 수 있어요.' : '이 반응은 → 한 방향으로 써요. (역반응 단추는 쓸 수 없어요)';
  }
  $('#sGap').addEventListener('input', (e) => { const G = fmG(); setGap(G.gMax - (+e.target.value / 100) * (G.gMax - G.gMin)); });
  $('#gFar').addEventListener('click', () => { Sound.tick(); const G = fmG(); setGap(S.ob.gap + (G.gMax - G.gMin) * 0.1); });
  $('#gNear').addEventListener('click', () => { Sound.tick(); const G = fmG(); setGap(S.ob.gap - (G.gMax - G.gMin) * 0.1); });
  $('#bDyeN').addEventListener('click', () => obDye('naoh')); $('#bDyeA').addEventListener('click', () => obDye('nh3'));
  $('#bObReset').addEventListener('click', () => { Sound.click(); obReset(); });
  $('#bMvAuto').addEventListener('click', mvAuto); $('#bMvReset').addEventListener('click', () => { Sound.click(); mvReset(); });
  $('#bFwd').addEventListener('click', () => prHop('f')); $('#bRev').addEventListener('click', () => prHop('r'));
  $('#bAuto').addEventListener('click', () => { Sound.click(); S.pr.auto = !S.pr.auto; S.pr.cool = 0; updateCtl(); });
  $('#bSortReset').addEventListener('click', () => { Sound.click(); soReset(); });

  function readouts() {
    const m = S.mode;
    if (m === 'obs' && S.ob.view === 'ind') { const o = S.ob; setRead('BTB를 넣은 용액', (o.dye.naoh > 0.9) + (o.dye.nh3 > 0.9) + ' / 2', 'NaOH 수용액', o.dye.naoh > 0.9 ? '파란색' : '무색', 'NH₃ 수용액', o.dye.nh3 > 0.9 ? '파란색' : '무색'); }
    else if (m === 'obs') { setRead('병 사이 거리', (S.ob.gap * 0.05).toFixed(1) + ' cm', '흰 연기의 양', Math.round(S.ob.smoke * 100) + ' %', '두 기체가 만나는 곳', S.ob.smoke > 0.05 ? '연기 생성' : '—'); }
    else if (m === 'move') { const k = S.mv.k, d = mvDone(k); setRead('H⁺ 이동', d ? '완료' : '아직', '산 (H⁺ 주개)', d ? MVR[k].acid : '?', '염기 (H⁺ 받개)', d ? MVR[k].base : '?'); }
    else if (m === 'pairs') { const s = S.pr; setRead('이은 짝', lineCount(s.k) + ' / 2', '정반응', s.fwdN + ' 회', '역반응', s.revN + ' 회'); }
    else { const so = S.so; setRead('놓은 카드', soPlaced() + ' / 10', '산 상자', so.cards.filter((c) => c.box === 'acid').length + ' 장', '염기 상자', so.cards.filter((c) => c.box === 'base').length + ' 장'); }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '정의의 한계: OH⁻가 없는 염기?', short: '정의의 한계', icon: '🔎', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 분자 속에 OH⁻가 없는 암모니아(NH₃)는 왜 염기일까? 산과 염기를 더 넓게 정의할 수는 없을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 산은 물에 녹아 H⁺를 내놓는 물질, 염기는 OH⁻를 내놓는 물질(아레니우스 정의)이라고 배웠어요. 이 정의로 모든 산과 염기를 설명할 수 있을까요?</div>' +
        '<p>같은 농도의 <b>NaOH</b>와 <b>NH₃</b> 수용액에 지시약을 넣어 보고, 진한 염산과 진한 암모니아수를 가까이 해 봐요. 실험할 때는 보안경과 장갑을 착용하고, 남은 용액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['obs'],
      setup() { S.gate = ''; obReset(); obSwitch('ind'); S.ob.gap = fmG().gMax; setScene('obs'); },
      recap: 'NaOH는 OH⁻를 내놓는 염기라서 아레니우스 정의로 설명돼요. 하지만 NH₃는 분자 속에 OH⁻가 없는데도 염기성이고, 물이 없는 HCl(g) + NH₃(g) 반응도 일어나요. 더 넓은 정의가 필요해요.',
      summary: '<ul><li>0.10 M NaOH와 0.10 M NH₃ 수용액 모두 BTB가 파란색 → 둘 다 염기성</li><li><b>아레니우스 정의</b>: 산 = 수용액에서 H⁺를 내놓는 물질, 염기 = 수용액에서 OH⁻를 내놓는 물질</li><li>NaOH → Na⁺ + OH⁻ 는 설명되지만, <b>NH₃에는 OH⁻가 없어요</b>.</li><li>HCl(g) + NH₃(g) → NH₄Cl(s): 물도 용액도 없는 반응 (흰 연기) → 아레니우스 정의로는 설명이 어려워요.</li></ul>',
      missions: [
        {
          title: '두 용액에 BTB 용액 넣기',
          goal: '0.10 M <b>NaOH</b> 수용액과 0.10 M <b>NH₃</b> 수용액에 BTB 용액을 각각 넣어 색을 확인하세요.',
          hint: '“NaOH에 넣기”와 “NH₃ 수용액에 넣기” 단추를 한 번씩 눌러요. BTB는 염기성(pH 7.6 이상)에서 파란색이에요.',
          setup() { S.gate = ''; obSwitch('ind'); setScene('obs'); },
          check: () => S.ob.dye.naoh >= 0.97 && S.ob.dye.nh3 >= 0.97, hold: 0.6,
          status: () => 'NaOH ' + mark(S.ob.dye.naoh >= 0.97) + ' &nbsp; NH₃ ' + mark(S.ob.dye.nh3 >= 0.97),
          explain: '두 용액 모두 BTB가 파란색이 되었어요. 둘 다 염기성이에요. NaOH는 Na⁺와 OH⁻로 나뉘어 아레니우스 정의에 딱 맞지만, NH₃에는 OH⁻가 들어 있지 않아요.',
        },
        {
          title: '병을 가까이 해서 흰 연기 만들기',
          goal: '진한 염산과 진한 암모니아수 병을 가까이 가져가 <b>흰 연기</b>가 생기게 하세요.',
          hint: 'HCl(g)과 NH₃(g) 기체 구름(초록색, 파란색)이 겹쳐야 연기가 생겨요. 거리 슬라이더의 + 단추를 누르거나 왼쪽 병을 끌어요.',
          setup() { S.gate = ''; S.ob.gap = fmG().gMax; S.ob.smoke = 0; obSwitch('fume'); setScene('obs'); },
          check: () => S.ob.view === 'fume' && S.ob.smoke >= 0.6, hold: 1.0,
          status: () => '흰 연기의 양 ' + Math.round(S.ob.smoke * 100) + ' % ' + mark(S.ob.smoke >= 0.6),
          explain: '두 기체가 만나는 곳에서 NH₄Cl(염화 암모늄) 고체 알갱이가 생겨 흰 연기처럼 보여요. 이 반응에는 물도 용액도 없어서 “수용액에서 H⁺나 OH⁻를 내놓는다”는 아레니우스 정의로는 설명할 수 없어요.',
        },
        {
          type: 'quiz', title: 'NH₃ 수용액의 OH⁻는 어디서?',
          goal: 'NH₃ 수용액이 염기성이라는 것은 용액에 <b>OH⁻가 생긴다</b>는 뜻이에요. 그런데 NH₃ 분자에는 OH⁻가 없어요. 이 OH⁻는 어디에서 왔을까요? (다음 단계 모형에서 확인해요)',
          setup() { S.gate = ''; obSwitch('ind'); setScene('obs'); },
          choices: ['NH₃ 분자가 저절로 쪼개져서 OH⁻가 생겨요', '물(H₂O) 분자와 반응하면서 H₂O에서 OH⁻가 생겨요', 'BTB 지시약이 OH⁻를 만들어 줘요', '유리 비커에서 OH⁻가 녹아 나와요'],
          answer: 1,
          feedback: ['NH₃에는 산소(O) 원자가 없어서 스스로 OH⁻를 만들 수 없어요.', '', '지시약은 색으로 용액의 성질을 알려 줄 뿐, 용액의 성질을 바꾸지 않아요.', '비커는 반응에 참여하지 않아요.'],
          explain: 'NH₃ 수용액의 OH⁻는 <b>물 분자에서</b> 와요. NH₃가 물 분자와 만나 무엇을 주고받는지는 다음 단계에서 입자 모형으로 확인해요.',
        },
      ],
    },
    {
      title: '양성자 이동: H⁺를 주고받는 입자', short: '양성자 이동', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> OH⁻가 없는 NH₃도 염기이고, 물이 없는 기체 반응도 산·염기 반응이었어요. 이번에는 입자 모형으로 <b>H⁺(양성자)가 어떻게 옮겨 가는지</b> 볼 거예요.</div>' +
        '<p>작은 흰 공은 H⁺예요. 이것을 한 분자에서 다른 분자로 끌어 옮겨 보세요. <b>H⁺를 준 쪽</b>과 <b>H⁺를 받은 쪽</b>에는 어떤 이름이 붙을까요?</p>',
      features: ['move'],
      setup() { S.gate = ''; MVK.forEach((k) => mvReset(k)); S.mv.k = 'a'; setScene('move'); },
      recap: '브뢴스테드-라우리 정의: 산은 양성자(H⁺)를 주는 물질, 염기는 양성자를 받는 물질이에요. 물이 없는 기체 반응에도 쓸 수 있어서 아레니우스 정의보다 넓게 쓰여요.',
      summary: '<ul><li><b>브뢴스테드-라우리 산</b> = 양성자(H⁺) <b>주개</b>, <b>염기</b> = 양성자(H⁺) <b>받개</b></li><li>HCl + H₂O → Cl⁻ + H₃O⁺ : HCl이 산, H₂O가 염기</li><li>H₂O + NH₃ ⇌ OH⁻ + NH₄⁺ : H₂O가 산, NH₃가 염기 → NH₃에 OH⁻가 없어도 염기!</li><li>HCl(g) + NH₃(g) → NH₄Cl(s): 물이 없어도 H⁺가 옮겨 가요 → 정의의 <b>확장성</b></li></ul>',
      missions: [
        {
          title: 'H⁺ 옮기기 3가지',
          goal: '세 가지 반응에서 H⁺ 구슬을 <b>받을 분자</b>에게 옮겨 주세요. (반응 고르기 단추로 바꿔요)',
          hint: '보라색 원 안에 H⁺ 공을 놓으면 돼요. 끌기 어려우면 “자동으로 옮기기” 단추를 눌러도 완료로 쳐요.',
          setup() { S.gate = ''; MVK.forEach((k) => mvReset(k)); S.mv.k = 'a'; setScene('move'); },
          check: () => MVK.every(mvDone), hold: 0.5,
          status: () => 'HCl + H₂O ' + mark(mvDone('a')) + ' &nbsp; H₂O + NH₃ ' + mark(mvDone('b')) + ' &nbsp; HCl(g) + NH₃(g) ' + mark(mvDone('c')),
          explain: '세 반응 모두 H⁺ 하나가 한 입자에서 다른 입자로 옮겨 갔어요. H⁺를 내놓은 HCl · H₂O · HCl(g)이 산이고, H⁺를 받은 H₂O · NH₃ · NH₃(g)이 염기예요. 같은 H₂O가 어떤 반응에서는 염기, 어떤 반응에서는 산이 되었어요.',
        },
        {
          type: 'quiz', title: 'H⁺를 받은 입자는?',
          goal: 'H⁺를 <b>받은</b> 입자는 브뢴스테드-라우리 정의에서 무엇일까요?',
          setup() { S.gate = ''; setScene('move'); },
          choices: ['산 : H⁺를 가지게 되었으니까요', '염기 : H⁺를 받는 입자가 염기예요', '산도 염기도 아니에요', '반응 상대에 상관없이 항상 산이에요'],
          answer: 1,
          feedback: ['H⁺를 가지고 있다고 산이 되는 것이 아니에요. H⁺를 “내놓는” 쪽이 산이에요.', '', '산과 염기는 H⁺를 주느냐, 받느냐로 정해져요.', '받는 쪽은 염기예요. 산과 염기는 H⁺의 이동 방향으로 정해져요.'],
          explain: '브뢴스테드-라우리 정의에서는 <b>H⁺를 받는 입자가 염기</b>, H⁺를 주는 입자가 산이에요. NH₃가 H₂O에게서 H⁺를 받으면 NH₃가 염기예요.',
        },
      ],
    },
    {
      title: '짝산·짝염기: 정반응과 역반응', short: '짝산·짝염기', icon: '🔗', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> H⁺를 주면 산, 받으면 염기라는 것을 알았어요. 그런데 H⁺를 준 산은 어떻게 변했을까요? 반응식에서 <b>H⁺ 하나 차이인 쌍</b>을 찾아봐요.</div>' +
        '<p>H⁺를 잃은 산은 <b>짝염기</b>, H⁺를 얻은 염기는 <b>짝산</b>이 돼요. 정반응과 역반응을 번갈아 재생하면, 평형에서는 양쪽 방향으로 H⁺가 계속 오가는 것도 볼 수 있어요(동적 평형).</p>',
      features: ['pairs'],
      setup() { S.gate = ''; prSet('hcl'); setScene('pairs'); },
      recap: '산이 H⁺ 하나를 잃으면 짝염기, 염기가 H⁺ 하나를 얻으면 짝산이에요. 가역 반응에서는 정반응과 역반응에서 산·염기의 역할이 서로 바뀌며 H⁺가 양방향으로 오가요.',
      summary: '<ul><li><b>짝산–짝염기 쌍</b>: H⁺ 하나 차이인 두 물질 (HCl–Cl⁻, H₂O–H₃O⁺, NH₃–NH₄⁺, H₂O–OH⁻)</li><li>산 → H⁺를 잃으면 <b>짝염기</b> / 염기 → H⁺를 얻으면 <b>짝산</b></li><li>NH₃ + H₂O ⇌ NH₄⁺ + OH⁻ : 정반응에서 H₂O(산), NH₃(염기) / 역반응에서 NH₄⁺(산), OH⁻(염기)</li><li>평형에서는 정반응과 역반응이 모두 계속 일어나요 (동적 평형).</li><li>CH₃COOH의 짝염기는 CH₃COO⁻ (H⁺ 하나를 잃은 것)</li></ul>',
      missions: [
        {
          title: '짝산–짝염기 쌍 이어 보기',
          goal: '<b>HCl + H₂O → Cl⁻ + H₃O⁺</b>와 <b>NH₃ + H₂O ⇌ NH₄⁺ + OH⁻</b>에서 H⁺ 하나 차이인 쌍을 모두(4쌍) 선으로 이어 보세요.',
          hint: '물질 상자를 하나 누르고, 짝이 되는 상자를 눌러요. 예를 들어 HCl에서 H⁺를 잃으면 Cl⁻가 돼요. 반응 고르기 단추로 NH₃ 반응으로 바꿔요.',
          setup() { S.gate = ''; RXK.forEach((k) => { S.pr.lines[k] = [0, 0]; S.pr.linesP[k] = [0, 0]; }); prSet('hcl'); setScene('pairs'); },
          check: () => prLinesDone('hcl') && prLinesDone('nh3'), hold: 0.5,
          status: () => 'HCl 반응 ' + lineCount('hcl') + ' / 2 ' + mark(prLinesDone('hcl')) + ' &nbsp; NH₃ 반응 ' + lineCount('nh3') + ' / 2 ' + mark(prLinesDone('nh3')),
          explain: 'HCl–Cl⁻와 H₂O–H₃O⁺, NH₃–NH₄⁺와 H₂O–OH⁻는 모두 H⁺ 하나 차이예요. 같은 H₂O도 반응에 따라 H₃O⁺(짝산)의 짝이 되기도 하고 OH⁻(짝염기)의 짝이 되기도 해요.',
        },
        {
          title: '역할 이름 붙이기 (정반응 · 역반응)', manual: true,
          goal: 'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻에서 <b>정반응</b>의 산 · 염기 · 짝산 · 짝염기와, <b>역반응</b>에서의 NH₄⁺ · OH⁻ 역할을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '정반응에서 H₂O는 H⁺를 줘요. 역반응(◀ 단추)에서는 NH₄⁺가 H⁺를 OH⁻에게 줘요. ▶ ◀ 단추로 재생해 보면서 골라요.',
          setup() { S.gate = 'blank'; clearSels(selF); clearSels(selR); prSet('nh3'); S.gate = 'blank'; setScene('pairs'); updateCtl(); },
          check() {
            const f = selF.filter((s) => s.value === s.ans).length, r = selR.filter((s) => s.value === s.ans).length;
            if (selF.some((s) => !s.value) || selR.some((s) => !s.value)) return '여섯 칸을 모두 골라 주세요.';
            if (f === 4 && r === 2) return true;
            if (f < 4) return '정반응 칸 ' + (4 - f) + '개가 달라요. H⁺를 준 쪽이 산, 받은 쪽이 염기이고, 짝산·짝염기는 반응 뒤에 생긴 물질이에요.';
            return '역반응 칸이 달라요. 역반응에서는 NH₄⁺가 H⁺를 주고 OH⁻가 H⁺를 받아요.';
          },
          status: () => '정반응 ' + selF.filter((s) => s.value === s.ans).length + ' / 4 &nbsp; 역반응 ' + selR.filter((s) => s.value === s.ans).length + ' / 2',
          explain: '정반응: NH₃(염기) + H₂O(산) → NH₄⁺(짝산) + OH⁻(짝염기). 역반응: NH₄⁺가 H⁺를 OH⁻에게 줘요. 그래서 역반응에서는 <b>NH₄⁺가 산, OH⁻가 염기</b>예요. 같은 물질도 반응 방향에 따라 역할이 바뀌어요.',
        },
        {
          type: 'quiz', title: 'CH₃COOH의 짝염기는?',
          goal: '아세트산(CH₃COOH)이 산으로 작용할 때 <b>짝염기</b>는 무엇일까요?',
          setup() { S.gate = ''; prSet('ch3'); setScene('pairs'); },
          choices: ['CH₃COOH₂⁺ : H⁺ 하나를 얻은 것', 'CH₃COO⁻ : H⁺ 하나를 잃은 것', 'H₃O⁺ : 물이 H⁺를 얻은 것', 'OH⁻ : 물이 H⁺를 잃은 것'],
          answer: 1,
          feedback: ['H⁺를 얻은 것은 짝염기가 아니라 (염기의) 짝산이에요. 짝염기는 산이 H⁺를 잃은 것이에요.', '', 'H₃O⁺는 H₂O의 짝산이에요. CH₃COOH의 짝이 아니에요.', 'OH⁻는 H₂O의 짝염기예요. CH₃COOH의 짝이 아니에요.'],
          explain: '산이 H⁺ 하나를 잃고 남은 물질이 <b>짝염기</b>예요. CH₃COOH → H⁺ + CH₃COO⁻, 그래서 짝염기는 CH₃COO⁻예요.',
        },
      ],
    },
    {
      title: '구별하기: 상대에 따라 달라지는 역할', short: '구별하기', icon: '🗂️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 H₂O가 반응에 따라 산이 되기도 하고 염기가 되기도 하는 것을 봤어요. 산·염기는 <b>물질 자체가 아니라 반응에서 하는 일</b>로 정해져요.</div>' +
        '<p>여덟 가지 반응식에서 입자 카드 열 장이 <b>H⁺를 주는지, 받는지</b> 살펴서 산 상자와 염기 상자에 나누어 담아요. 양쪽성 물질 HCO₃⁻도 만나 봐요.</p>',
      features: ['sort'],
      setup() { S.gate = ''; soReset(); setScene('sort'); },
      recap: '산과 염기는 반응 상대에 따라 정해져요. H⁺를 주면 산, 받으면 염기예요. H₂O와 HCO₃⁻처럼 산으로도 염기로도 작용하는 물질을 양쪽성 물질이라고 해요.',
      summary: '<ul><li>산 : HCl, NH₄⁺, 그리고 상대에 H⁺를 주는 H₂O(NH₃와 만날 때), HCO₃⁻(H₂O에게 H⁺를 줄 때)</li><li>염기 : NH₃, OH⁻, CH₃COO⁻, CO₃²⁻, 그리고 H⁺를 받는 H₂O(HCl과 만날 때), HCO₃⁻(H₂O에게서 H⁺를 받을 때)</li><li><b>양쪽성 물질</b> : H₂O, HCO₃⁻ (상대에 따라 산 또는 염기)</li><li>HCO₃⁻ + H₂O ⇌ CO₃²⁻ + H₃O⁺ (산), HCO₃⁻ + H₂O ⇌ H₂CO₃ + OH⁻ (염기)</li><li>H⁺가 없는 입자(OH⁻, Cl⁻ 등)는 H⁺를 줄 수 없으므로 산이 될 수 없어요.</li></ul>',
      missions: [
        {
          title: '카드 10장 분류하기', manual: true,
          goal: '카드를 끌어서 <b>산</b> 상자 또는 <b>염기</b> 상자에 담고 <b>✔ 확인하기</b>를 누르세요. 카드의 번호는 아래의 반응식 번호예요.',
          hint: '반응식에서 그 입자가 H⁺를 내놓았는지(→ 산), 받았는지(→ 염기) 살펴요. H₂O와 HCO₃⁻ 카드는 반응식 번호가 서로 달라서 역할도 달라요.',
          setup() { S.gate = ''; soReset(); setScene('sort'); },
          check: () => soCheck(),
          status: () => '놓은 카드 ' + soPlaced() + ' / 10',
          explain: '산 : HCl ①, H₂O ②, HCO₃⁻ ③, NH₄⁺ ⑥. 염기 : H₂O ①, NH₃ ②, HCO₃⁻ ④, CH₃COO⁻ ⑤, OH⁻ ⑦, CO₃²⁻ ⑧. 같은 H₂O도 ①에서는 H⁺를 받아 염기, ②에서는 H⁺를 주어 산이에요. HCO₃⁻는 ③에서는 산, ④에서는 염기라서 <b>양쪽성</b>이에요.',
        },
        {
          title: 'HCO₃⁻ 반응식 완성하기', manual: true,
          goal: 'HCO₃⁻가 <b>산</b>으로 작용하는 반응과 <b>염기</b>로 작용하는 반응에서 생성되는 물질을 골라 식을 완성하세요.',
          hint: '산으로 작용하면 H⁺를 잃어요(HCO₃⁻에서 H⁺ 하나가 빠진 것). 염기로 작용하면 H⁺를 얻어요(H⁺ 하나가 더해진 것).',
          setup() { S.gate = 'hco'; clearSels(selH); setScene('sort'); updateCtl(); },
          check() {
            if (selH.some((s) => !s.value)) return '두 칸을 모두 골라 주세요.';
            const a = selH[0].value === 'CO3', b = selH[1].value === 'H2CO3';
            if (a && b) return true;
            if (!a && !b) return '두 칸 모두 다시 생각해 보세요. HCO₃⁻ ↔ CO₃²⁻은 H⁺ 하나 차이, HCO₃⁻ ↔ H₂CO₃도 H⁺ 하나 차이예요.';
            return !a ? '첫째 식에서 HCO₃⁻는 H⁺를 잃어요. H⁺ 하나가 빠진 물질은 무엇일까요?' : '둘째 식에서 HCO₃⁻는 H⁺를 얻어요. H⁺ 하나가 더해진 물질은 무엇일까요?';
          },
          status: () => '첫째 식 ' + mark(selH[0].value === 'CO3') + ' &nbsp; 둘째 식 ' + mark(selH[1].value === 'H2CO3'),
          explain: 'HCO₃⁻ + H₂O ⇌ <b>CO₃²⁻</b> + H₃O⁺ (HCO₃⁻가 H⁺를 주는 <b>산</b>), HCO₃⁻ + H₂O ⇌ <b>H₂CO₃</b> + OH⁻ (HCO₃⁻가 H⁺를 받는 <b>염기</b>). 이처럼 산으로도 염기로도 작용하는 물질이 양쪽성 물질이에요.',
        },
        {
          type: 'quiz', title: '올바른 설명 고르기',
          goal: '브뢴스테드-라우리 산·염기에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.gate = ''; setScene('sort'); },
          choices: ['물은 항상 용매일 뿐 산·염기 반응에 참여하지 않는다', 'H⁺를 가진 입자는 어떤 반응에서도 항상 산이다', 'HCO₃⁻는 반응 상대에 따라 H⁺를 주기도 하고 받기도 한다', '산이 되려면 OH⁻를 내놓아야 한다'],
          answer: 2,
          feedback: ['물도 HCl과는 염기로, NH₃와는 산으로 반응에 참여해요.', 'H⁺를 가지고 있어도 상대가 더 강한 산이면 H⁺를 받아 염기가 될 수 있어요(HCO₃⁻, H₂O).', '', 'OH⁻를 내놓는 것은 아레니우스 염기의 특징이에요. 브뢴스테드-라우리 산은 H⁺를 주는 입자예요.'],
          explain: '<b>HCO₃⁻는 양쪽성</b>이에요. 상대에 따라 H⁺를 주기도 받기도 해요. 참고로 “H⁺가 없는 입자는 산이 될 수 없다”는 말은 맞아요. 줄 H⁺가 없으니까요. 그래서 OH⁻나 Cl⁻는 산이 될 수 없어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-bronsted', mount: '#game', badge: '양성자 박사', homeHref: '../../index.html#hr',
    featureLabels: { obs: '🔎 BTB · 흰 연기 실험', move: '🧩 H⁺ 구슬 옮기기', pairs: '🔗 짝 이어 보기 · 정반응/역반응', sort: '🗂️ 산·염기 카드 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('obs');
  soLayout();
  function stepAll1(dt) { stepOb(dt); stepMove(dt); stepPairs(dt); stepSort(dt); S.mv.shake = Math.max(0, S.mv.shake - dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    if (S.mode === 'sort' && game && game.phase !== 'active' && soRight() === 10) S.so.okAll = true;
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'obs') drawObs(t); else if (S.mode === 'move') drawMove(t); else if (S.mode === 'pairs') drawPairs(t); else drawSort(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, MVR, MVK, RX, CARDS, selF, selR, selH, fmG, obG, mvGeom, mvPos, slotA, slotD, beadPos, mvAuto, mvReset, mvDone, prBox, prPick, prHop, prSet, soGeom, soCard, soLayout, soReset, soCheck, soPlaced, soRight, obDye, obReset, obSwitch, setGap, gapPct,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
