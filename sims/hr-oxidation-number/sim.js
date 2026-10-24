/* 화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 산화수와 산화·환원 [12반응02-01]
   ① 모형: 전자 장부 (Cu + Ag⁺ 전자 이동, H₂O 공유 전자쌍)  ② 탐구: 산화수 규칙 (미지 원자 계산, N 화합물 눈금)
   ③ 분석: 변화로 판별 (반응식 6개, 전자 저울)  ④ 설명: 산화제의 역할 (이름표, H₂O₂·SO₂ 모의 실험)
   분수 산화수, 불균등화, 유기 화합물 탄소의 산화수는 다루지 않아요. */
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
  const RED = '#ef4444', BLUE = '#2563eb', GRAYC = '#94a3b8', GOODC = '#14a058', WARN = '#b45309';
  const MINUS = '−';

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
      const toks = ln.match(/[가-힣][^\s가-힣]*|\s+|[^\s가-힣]+/g) || [];
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
  function textW(str, size, weight) { ctx.save(); ctx.font = D.font(size, weight || 700); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const SPL = SciSim.ease;
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;
  const oxs = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + (-n) : '0');
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subs = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };

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
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }

  /* ---------- 공통 그림 도구 ---------- */
  const ELC = { H: '#f8fafc', C: '#475569', N: '#3b82f6', O: '#ef4444', Cl: '#16a34a', Na: '#a78bfa', K: '#c084fc', S: '#facc15', Mn: '#a855f7', Cr: '#14b8a6', Fe: '#b45309', Cu: '#d97706', Ag: '#cbd5e1', Zn: '#94a3b8', Ca: '#84cc16', I: '#7c3aed', Mg: '#86efac', Pb: '#64748b', Li: '#f472b6', Co: '#2563eb' };
  function atomBall(x, y, r, el, o) {
    o = o || {};
    const c = ELC[el] || '#94a3b8', dark = el === 'H' || el === 'Ag' || el === 'S' || el === 'Mg';
    D.sphere(x, y, r, c, { text: o.text === undefined ? el : o.text, textColor: dark ? '#334155' : '#fff', textScale: o.ts || (el.length > 1 ? 0.95 : 1.1), outline: dark ? '#94a3b8' : null, outlineWidth: 1.2, gloss: r > 8, shadow: !!o.shadow });
  }
  function eBall(x, y, r) { D.sphere(x, y, r, '#fbbf24', { text: 'e⁻', textColor: '#6b3f00', textScale: 0.95, outline: '#b7791f', outlineWidth: 1, gloss: r > 7 }); }
  function pill(x, y, text, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const s = o.scale == null ? 1 : o.scale; ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 14, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad });
    ctx.restore(); return rc;
  }
  /* 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 */
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
      if (o.inside) o.inside({ x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih });
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
    return { x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih, level };
  }
  const r2 = (i) => [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
  /* 액체 안에 갇힌 입자 : 정규화 좌표(u, v)를 현재 액체 영역에 펼쳐 놓아요 (영역 밖으로 나가지 않음) */
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    const mx = Math.min(k, Math.max(0, (x1 - x0) / 2)), my = Math.min(k, Math.max(0, (y1 - y0) / 2));
    return [px + Math.sin(t * 1.3 + i * 1.9) * mx * (px > x0 && px < x1 ? 1 : 0), py + Math.cos(t * 1.1 + i * 2.3) * my * (py > y0 && py < y1 ? 1 : 0)];
  }
  function hexAdd(c1, c2, t) { return C.mix(c1, c2, clamp(t, 0, 1)); }
  /* 숫자 입력칸 도우미 */
  function bindNum(inp, onSet) {
    inp.addEventListener('input', () => onSet(parseNum(inp.value), false));
    inp.addEventListener('change', () => onSet(parseNum(inp.value), true));
  }
  const MODE_LABEL_FALLBACK = {};

  const MODE_LABEL = { ledger: '🧾 전자 장부', rules: '📏 산화수 규칙', judge: '🔍 변화로 판별', role: '🏷️ 산화제의 역할' };
  const UPC = '#dc2626', DNC = '#2563eb', OXC = '#d97706', REDC = '#059669';
  const fz = (n) => (PHONE ? n - 1 : n);

  /* ---------- 상태 ---------- */
  Object.assign(S, {
    mode: 'ledger', sub: { ledger: 'ion', rules: 'calc', role: 'tags' },
    lg: {
      ion: { p: [0, 0], started: [false, false], arrived: [false, false], run: false, t: 0, sx: [null, null], done: false, pop: [0, 0, 0], ox: [0, 1, 1] },
      h2o: { st: [0, 0], p: [0, 0], drag: null, shake: 0, hint: 0, pop: [0, 0, 0], done: false },
    },
    ru: { val: {}, solved: {}, cmp: 'hno3', cards: [], drag: null, okAll: false, wrongT: 0, pop: 0, sel: null },
    jd: { k: 0, tagT: [], ok: [], eVal: [], scT: [], shake: 0, burst: [], msg: '' },
    rl: { tags: [], ex: 0, rx: 0, bot: 'h2o2', seen: {}, bk: {}, pour: null, bp: { x: 0, y: 0, a: 0 }, wrongMsg: '' },
  });

  /* ============ ① 전자 장부 ============ */
  const LGK = ['ion', 'h2o'];
  const lgIonG = () => {
    const rc = PHONE ? 30 : 36, ra = PHONE ? 25 : 29;
    return { cu: { x: MAIN.x + MAIN.w * (PHONE ? 0.25 : 0.24), y: MAIN.y + MAIN.h * 0.48 }, ag: [{ x: MAIN.x + MAIN.w * (PHONE ? 0.76 : 0.74), y: MAIN.y + MAIN.h * 0.27 }, { x: MAIN.x + MAIN.w * (PHONE ? 0.76 : 0.74), y: MAIN.y + MAIN.h * 0.68 }], rc, ra };
  };
  function lgIonOrbit(k, t) {
    const g = lgIonG(), a = t * 1.7 + k * Math.PI;
    return { x: g.cu.x + Math.cos(a) * (g.rc + 16), y: g.cu.y + Math.sin(a) * (g.rc + 16) };
  }
  function lgIonReset() {
    const i = S.lg.ion; i.p = [0, 0]; i.started = [false, false]; i.arrived = [false, false]; i.run = false; i.t = 0; i.sx = [null, null]; i.done = false; i.pop = [0, 0, 0]; i.ox = [0, 1, 1];
    parts.clear(); updateCtl();
  }
  function lgIonGo() {
    const i = S.lg.ion; if (i.run || i.done) return; i.run = true; i.t = 0; Sound.click(); updateCtl();
  }
  function stepIon(dt) {
    const i = S.lg.ion, g = lgIonG();
    for (let q = 0; q < 3; q++) i.pop[q] = Math.max(0, i.pop[q] - dt * 2.4);
    if (!i.run) return;
    i.t += dt;
    for (let k = 0; k < 2; k++) {
      const t0 = 0.2 + k * 0.7;
      if (!i.started[k] && i.t >= t0) { i.started[k] = true; i.sx[k] = lgIonOrbit(k, S.t); i.ox[0] = Math.max(i.ox[0], 0); }
      if (i.started[k] && !i.arrived[k]) {
        i.p[k] = Math.min(1, i.p[k] + dt / 1.25);
        if (i.p[k] >= 0.5 && i.ox[0] < k + 1) { i.ox[0] = k + 1; i.pop[0] = 1; }
        if (i.p[k] >= 1) { i.arrived[k] = true; i.ox[k + 1] = 0; i.pop[k + 1] = 1; Sound.tick(); flash(g.ag[k].x, g.ag[k].y, ['#cbd5e1', '#fbbf24', '#ffffff']); }
      }
    }
    if (i.arrived[0] && i.arrived[1] && !i.done) { i.done = true; i.run = false; flash(g.cu.x, g.cu.y, ['#dc2626', '#fbbf24', '#ffffff']); updateCtl(); }
  }
  function ionPos(k, t) {
    const i = S.lg.ion, g = lgIonG();
    if (!i.started[k]) return lgIonOrbit(k, t);
    const A = i.sx[k], B = { x: g.ag[k].x - g.ra - 6, y: g.ag[k].y }, e = SPL.inOutCubic(i.p[k]);
    const cx = (A.x + B.x) / 2, cy = Math.min(A.y, B.y) - 46 - 8 * k, u = 1 - e;
    return { x: u * u * A.x + 2 * u * e * cx + e * e * B.x, y: u * u * A.y + 2 * u * e * cy + e * e * B.y };
  }

  const lgH = () => {
    const L = PHONE ? 112 : 128, rO = PHONE ? 31 : 35, rH = PHONE ? 19 : 22;
    const O = { x: MAIN.x + MAIN.w / 2, y: MAIN.y + (PHONE ? 140 : 122) };
    const a = 52.25 * Math.PI / 180;
    const H = [{ x: O.x - Math.sin(a) * L, y: O.y + Math.cos(a) * L }, { x: O.x + Math.sin(a) * L, y: O.y + Math.cos(a) * L }];
    return { L, rO, rH, O, H };
  };
  function lgPairPos(k, p) {
    const g = lgH(), H = g.H[k], dx = H.x - g.O.x, dy = H.y - g.O.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const m = { x: (g.O.x + H.x) / 2, y: (g.O.y + H.y) / 2 }, gv = { x: g.O.x + ux * (g.rO + 15), y: g.O.y + uy * (g.rO + 15) };
    return { x: m.x + (gv.x - m.x) * p, y: m.y + (gv.y - m.y) * p, ux, uy };
  }
  function h2oReset() {
    const h = S.lg.h2o; h.st = [0, 0]; h.p = [0, 0]; h.drag = null; h.shake = 0; h.pop = [0, 0, 0]; h.done = false; parts.clear(); updateCtl();
  }
  function h2oGive(k) {
    const h = S.lg.h2o; if (h.st[k]) return;
    h.st[k] = 1; h.pop[0] = 1; h.pop[k + 1] = 1; Sound.tick(); const q = lgPairPos(k, 1); flash(q.x, q.y, ['#fbbf24', '#ef4444', '#ffffff']); updateCtl();
  }
  function h2oAuto() {
    const h = S.lg.h2o; let n = 0;
    [0, 1].forEach((k) => { if (!h.st[k]) setTimeout(() => { if (S.mode === 'ledger' && S.sub.ledger === 'h2o') h2oGive(k); }, 150 + 600 * n++); });
  }
  function stepH2o(dt) {
    const h = S.lg.h2o;
    for (let q = 0; q < 3; q++) h.pop[q] = Math.max(0, h.pop[q] - dt * 2.4);
    for (let k = 0; k < 2; k++) h.p[k] = ap(h.p[k], h.st[k], dt, 7);
    h.shake = Math.max(0, h.shake - dt); h.hint = Math.max(0, h.hint - dt);
    if (h.st[0] && h.st[1] && h.p[0] > 0.97 && h.p[1] > 0.97 && !h.done) { h.done = true; const g = lgH(); flash(g.O.x, g.O.y, ['#ef4444', '#fbbf24', '#14a058']); updateCtl(); }
    if (!(h.st[0] && h.st[1]) && h.done) h.done = false;
  }
  const h2oGiven = () => S.lg.h2o.st[0] + S.lg.h2o.st[1];
  function h2oPairHit(p) {
    const h = S.lg.h2o;
    for (let k = 0; k < 2; k++) { const q = h.drag && h.drag.k === k ? h.drag : lgPairPos(k, h.p[k]); if (Math.hypot(p.x - q.x, p.y - q.y) <= 30) return k; }
    return -1;
  }

  function pairBalls(x, y, ux, uy, sc, lift) {
    const nx = -uy, ny = ux, r = (PHONE ? 8 : 9) * (sc || 1);
    D.shadow(() => { eBall(x + nx * (r + 1.5), y + ny * (r + 1.5), r); eBall(x - nx * (r + 1.5), y - ny * (r + 1.5), r); }, { blur: lift ? 10 : 3, y: lift ? 5 : 1, color: 'rgba(120,70,0,.35)' });
  }
  function oxTag(x, y, val, o) {
    o = o || {};
    const up = o.dir === 'up', dn = o.dir === 'down';
    pill(x, y, o.text != null ? o.text : '산화수 ' + oxs(val), { bg: o.bg || (up ? '#fee2e2' : dn ? '#dbeafe' : '#ffffff'), color: o.color || (up ? '#b91c1c' : dn ? '#1d4ed8' : INK), border: o.border || (up ? '#f87171' : dn ? '#60a5fa' : 'rgba(38,50,74,.35)'), size: o.size || 14, scale: 1 + 0.25 * (o.pop || 0), alpha: o.alpha });
  }

  function drawLedger(t) {
    const sub = S.sub.ledger;
    if (sub === 'ion') drawIon(t); else drawH2o(t);
  }
  function drawIon(t) {
    const i = S.lg.ion, g = lgIonG();
    T(14, 26, '🧾 Cu + 2Ag⁺ → Cu²⁺ + 2Ag : 전자는 어디로 옮겨 갈까요?', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const dep = i.started.filter(Boolean).length;
    // Cu 원자
    const rc = g.rc - i.ox[0] * 2;
    D.glow(g.cu.x, g.cu.y, rc + 30, '#fb923c', 0.18);
    D.sphere(g.cu.x, g.cu.y, rc, '#d97706', { shadow: true, text: i.ox[0] >= 2 ? 'Cu²⁺' : i.ox[0] === 1 ? 'Cu⁺' : 'Cu', textScale: 0.8 });
    // Ag
    for (let k = 0; k < 2; k++) {
      const a = g.ag[k], gone = i.arrived[k];
      D.shadow(() => { D.sphere(a.x, a.y, g.ra, gone ? '#cbd5e1' : '#e2e8f0', { text: gone ? 'Ag' : 'Ag⁺', textColor: '#334155', textScale: 0.85, outline: gone ? '#94a3b8' : '#60a5fa', outlineWidth: gone ? 1.2 : 2.4 }); }, { blur: 8, y: 3 });
    }
    // 전자
    for (let k = 0; k < 2; k++) {
      if (i.arrived[k]) continue;
      const q = ionPos(k, t), moving = i.started[k];
      if (moving) D.glow(q.x, q.y, 20, '#fbbf24', 0.45);
      eBall(q.x, q.y, PHONE ? 9 : 10.5);
    }
    // 산화수 태그
    const dirCu = i.ox[0] > 0 ? 'up' : null;
    oxTag(g.cu.x, g.cu.y - rc - (PHONE ? 52 : 56), i.ox[0], { dir: dirCu, pop: i.pop[0] });
    for (let k = 0; k < 2; k++) oxTag(g.ag[k].x, g.ag[k].y - g.ra - 28, i.ox[k + 1], { dir: i.arrived[k] ? 'down' : null, pop: i.pop[k + 1] });
    // 결과 설명
    if (i.ox[0] > 0) T(g.cu.x, g.cu.y + rc + 34, i.done ? '전자 2개를 잃음 → 산화' : '전자를 잃는 중…', 14.5, UPC, 'center', 800);
    for (let k = 0; k < 2; k++) if (i.arrived[k]) T(g.ag[k].x, g.ag[k].y + g.ra + 26, '전자 1개를 얻음 → 환원', 14, DNC, 'center', 800);
    if (i.done) {
      const mid = (g.cu.x + g.ag[0].x) / 2;
      pill(mid, g.cu.y + 60, '잃은 전자 2개 = 얻은 전자 2개', { bg: '#fff7d6', color: '#7a4a00', border: '#f59e0b', size: 14 });
    } else if (!i.run) {
      T((g.cu.x + g.ag[0].x) / 2, g.cu.y + 66, '“전자 옮기기” 단추를 눌러 보세요', 14, MUTED, 'center', 700);
    }
    // 정보 패널
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '전자 장부', 15, WARN, 'left', 800);
    const rows = [['입자', '산화수 변화', '전자', '이름'], ['Cu', i.done ? '0 → +2' : '0 → ?', i.done ? '2개 잃음' : '?', i.done ? '산화' : '?'], ['Ag⁺ ×2', i.done ? '+1 → 0' : '+1 → ?', i.done ? '1개씩 얻음' : '?', i.done ? '환원' : '?']];
    const cw = [0.2, 0.3, 0.28, 0.22], rh = PHONE ? 30 : 22;
    rows.forEach((r, ri) => {
      let x = INFO.x + 16;
      r.forEach((c, ci) => {
        const col = ri === 0 ? MUTED : ci === 3 && i.done ? (ri === 1 ? UPC : DNC) : INK;
        T(x, INFO.y + 50 + ri * rh, c, ri === 0 ? 13.5 : 14.5, col, 'left', ri === 0 ? 800 : 700);
        x += (INFO.w - 32) * cw[ci];
      });
    });
    textBlock(INFO.x + 16, INFO.y + 50 + 3 * rh + 4, INFO.w - 32, '전자를 잃으면 산화수가 커지고(산화), 얻으면 작아져요(환원). 잃은 전자 수 = 얻은 전자 수예요.', 14, MUTED, 19, 700);
  }
  function drawH2o(t) {
    const h = S.lg.h2o, g = lgH(), pr = h.p, got = h2oGiven();
    T(14, 26, '🧾 H₂O: 공유 전자쌍을 누구에게 줄까요?', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const sh = h.shake > 0 ? Math.sin(h.shake * 60) * 4 * Math.min(1, h.shake * 4) : 0;
    ctx.save(); ctx.translate(sh, 0);
    // 결합 막대
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.H[k].x, g.H[k].y); ctx.stroke();
    }
    atomBall(g.O.x, g.O.y, g.rO, 'O', { shadow: true });
    g.H.forEach((H) => atomBall(H.x, H.y, g.rH, 'H', { shadow: true }));
    // 안내 화살표 (전기 음성도 → O 쪽)
    for (let k = 0; k < 2; k++) {
      if (h.st[k]) continue;
      const q = lgPairPos(k, 0), pulse = 0.5 + 0.5 * Math.sin(t * 4 + k);
      const tx = q.x - q.ux * 30, ty = q.y - q.uy * 30;
      D.arrow(q.x - q.ux * 20 + (-q.uy) * 22, q.y - q.uy * 20 + q.ux * 22, tx + (-q.uy) * 22, ty + q.ux * 22, { color: PUR, width: 2.6, head: 10, alpha: 0.35 + 0.4 * pulse });
    }
    // 전자쌍
    for (let k = 0; k < 2; k++) {
      const d = h.drag && h.drag.k === k ? h.drag : null, q = lgPairPos(k, pr[k]);
      const x = d ? d.x : q.x, y = d ? d.y : q.y;
      if (!h.st[k] && !d) D.ring(x, y, 22, t, { color: 'rgba(139,92,246,.75)', width: 1.8, speed: 0.8 });
      pairBalls(x, y, q.ux, q.uy, d ? 1.15 : 1, !!d);
    }
    ctx.restore();
    // 전기 음성도와 산화수 태그
    const oOx = -got;
    oxTag(g.O.x, g.O.y - g.rO - 24, oOx, { text: got ? '산화수 ' + oxs(oOx) : '산화수 ?', dir: got ? 'down' : null, pop: h.pop[0] });
    T(g.O.x - g.rO - 12, g.O.y + 5, 'O 3.5', 14, '#b91c1c', 'right', 800);
    T(g.O.x - g.rO - 12, g.O.y + 22, '전기 음성도', 12.5, MUTED, 'right', 700);
    for (let k = 0; k < 2; k++) {
      oxTag(g.H[k].x, g.H[k].y + g.rH + 22, 1, { text: h.st[k] ? '산화수 +1' : '산화수 ?', dir: h.st[k] ? 'up' : null, pop: h.pop[k + 1] });
      T(g.H[k].x, g.H[k].y + g.rH + 48, 'H 2.1', 14, MUTED, 'center', 800);
    }
    if (h.hint > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, h.hint * 1.5); pill(g.O.x, MAIN.y + MAIN.h - 26, '전기 음성도가 더 큰 O에게 전자쌍을 줘야 해요', { bg: '#7c3aed', color: '#fff', border: null, size: 14 }); ctx.restore(); }
    else if (h.done) pill(g.O.x, MAIN.y + MAIN.h - 26, '산화수의 합: (−2) + (+1) + (+1) = 0', { bg: '#dcfce7', color: '#166534', border: '#4ade80', size: 14.5 });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    textBlock(INFO.x + 16, INFO.y + 26, INFO.w - 32, '산화수 = 공유 전자쌍을 전기 음성도가 큰 원자에게 모두 준 것으로 가정한 값', PHONE ? 14 : 15, WARN, 19, 800);
    const ln = [
      [got === 0, '전자쌍을 O 쪽으로 옮기면 O는 전자를 1개씩 더 가진 것으로 쳐요 (−1씩).'],
      [got >= 1, 'H는 전자쌍을 내준 것으로 쳐요 (+1씩).'],
      [h.done, 'O는 −2, H는 +1. 산화수의 합은 분자 전체의 전하 0과 같아요.'],
    ];
    let yy = INFO.y + 54;
    const lh = PHONE ? 20 : 20;
    textBlock(INFO.x + 16, yy, INFO.w - 32, '전자쌍이 O 쪽으로 쏠려 있지만 완전히 옮겨 간 것은 아니에요. 그래서 산화수는 실제 전하가 아니라 장부에 적는 숫자예요.', 14, INK, lh, 700);
    yy += wrap('전자쌍이 O 쪽으로 쏠려 있지만 완전히 옮겨 간 것은 아니에요. 그래서 산화수는 실제 전하가 아니라 장부에 적는 숫자예요.', INFO.w - 32, 14, 700).length * lh + 8;
    T(INFO.x + 16, yy + 4, h.done ? '✅ ' + ln[2][1] : got ? '⬜ ' + ln[1][1] : '⬜ ' + ln[0][1], 14, h.done ? '#166534' : MUTED, 'left', 800);
  }

  /* ============ ② 산화수 규칙 ============ */
  const RULES = [
    { t: '홑원소 물질', d: '산화수는 0 (O₂, Fe, N₂)' },
    { t: '단원자 이온', d: '이온의 전하 (Cu²⁺ +2, Cl⁻ −1)' },
    { t: '1족 · 2족 · 할로젠', d: '1족 +1, 2족 +2, F·Cl 등 −1' },
    { t: '산소와 수소', d: 'O −2 (과산화물 −1), H +1' },
    { t: '합 = 전하', d: '화합물은 합 0, 다원자 이온은 이온의 전하' },
  ];
  const CMP = [
    { id: 'hno3', f: 'HNO₃', name: 'N', q: 0, g: [['H', 1, 1], ['N', 1, null], ['O', 3, -2]], ans: 5, rules: [3, 4] },
    { id: 'kmno4', f: 'KMnO₄', name: 'Mn', q: 0, g: [['K', 1, 1], ['Mn', 1, null], ['O', 4, -2]], ans: 7, rules: [2, 3, 4] },
    { id: 'k2cr2o7', f: 'K₂Cr₂O₇', name: 'Cr', q: 0, g: [['K', 2, 1], ['Cr', 2, null], ['O', 7, -2]], ans: 6, rules: [2, 3, 4] },
    { id: 'so4', f: 'SO₄²⁻', name: 'S', q: -2, g: [['S', 1, null], ['O', 4, -2]], ans: 6, rules: [3, 4] },
    { id: 'nh4', f: 'NH₄⁺', name: 'N', q: 1, g: [['N', 1, null], ['H', 4, 1]], ans: -3, rules: [3, 4] },
    { id: 'h2o2', f: 'H₂O₂', name: 'O', q: 0, g: [['H', 2, 1], ['O', 2, null]], ans: -1, rules: [3, 4] },
  ];
  const cmpOf = (id) => CMP.find((c) => c.id === id);
  const cmpSum = (c, v) => c.g.reduce((s, q) => s + q[1] * (q[2] == null ? v : q[2]), 0);
  const solvedN = () => CMP.filter((c) => S.ru.solved[c.id]).length;
  const qStr = (q) => (q === 0 ? '0' : q > 0 ? '+' + q : MINUS + (-q));
  function ruSetVal(id, v) {
    const ru = S.ru; ru.val[id] = v;
    const c = cmpOf(id);
    if (!isNaN(v) && cmpSum(c, v) === c.q && !ru.solved[id]) {
      ru.solved[id] = true; ru.pop = 1; Sound.tick();
      const G = ruG(); flash(G.cx, G.gy, ['#14a058', '#fbbf24', '#8b5cf6']);
    }
    updateCtl();
  }
  const ruG = () => {
    const rr = PHONE ? 15 : 19;
    return { rr, cx: MAIN.x + MAIN.w / 2, gy: MAIN.y + (PHONE ? 170 : 150) };
  };
  function drawCalc(t) {
    const ru = S.ru, c = cmpOf(ru.cmp), G = ruG(), rr = G.rr;
    T(14, 26, '📏 ' + c.f + ' 속 ' + c.name + '의 산화수를 구해 봐요', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const val = ru.val[c.id], has = !isNaN(val), good = ru.solved[c.id];
    // 그룹 크기
    const cell = rr * 2 + 6, gs = c.g.map((q) => { const cols = Math.min(q[1], 4), rows = Math.ceil(q[1] / cols); return { q, cols, rows, w: Math.max(cols * cell + 14, 100), h: rows * cell + 14 }; });
    const gap = 14, qw = c.q !== 0 ? 56 : 0;
    const total = gs.reduce((s, g) => s + g.w, 0) + gap * (gs.length - 1) + qw;
    let x = G.cx - total / 2;
    const maxH = Math.max.apply(null, gs.map((g) => g.h));
    gs.forEach((g, gi) => {
      const y0 = G.gy - g.h / 2, unk = g.q[2] == null, ox = unk ? (has ? val : null) : g.q[2];
      D.roundRect(x, y0, g.w, g.h, 14); ctx.fillStyle = unk ? 'rgba(251,146,60,.12)' : 'rgba(100,116,139,.08)'; ctx.fill(); ctx.strokeStyle = unk ? 'rgba(234,88,12,.55)' : 'rgba(100,116,139,.35)'; ctx.lineWidth = unk ? 2 : 1.4; ctx.stroke();
      for (let n = 0; n < g.q[1]; n++) { const cc = n % g.cols, rw = Math.floor(n / g.cols); atomBall(x + (g.w - g.cols * cell) / 2 + cell / 2 + cc * cell, y0 + 7 + cell / 2 + rw * cell, rr, g.q[0], { shadow: true }); }
      const tx = x + g.w / 2;
      if (unk) {
        const dirc = !has ? null : (good ? null : null);
        pill(tx, G.gy - maxH / 2 - 26, has ? '산화수 ' + oxs(val) : '산화수 ?', { bg: good ? '#dcfce7' : has ? '#ffedd5' : '#fff7ed', color: good ? '#166534' : '#9a3412', border: good ? '#4ade80' : '#fb923c', size: 14, scale: 1 + 0.25 * ru.pop });
      } else pill(tx, G.gy - maxH / 2 - 26, '산화수 ' + oxs(ox), { size: 14 });
      T(tx, G.gy + maxH / 2 + 22, g.q[0] + ' 원자 ' + g.q[1] + '개', 13.5, MUTED, 'center', 700);
      x += g.w + gap;
    });
    if (c.q !== 0) {
      const tx = x - gap + 6;
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx + 4, G.gy - maxH / 2 - 4); ctx.lineTo(tx + 12, G.gy - maxH / 2 - 4); ctx.lineTo(tx + 12, G.gy + maxH / 2 + 4); ctx.lineTo(tx + 4, G.gy + maxH / 2 + 4); ctx.stroke();
      T(tx + 20, G.gy - maxH / 2 + 12, c.f.replace(/^[A-Za-z₀-₉]+/, ''), 22, INK, 'left', 800);
    }
    // 합 계산식
    const terms = c.g.map((q) => (q[2] == null ? (has ? '(' + oxs(val) + ')' : 'x') : '(' + oxs(q[2]) + ')') + '×' + q[1]);
    const eq = terms.join(' + ') + ' = ' + qStr(c.q);
    const ey = MAIN.y + MAIN.h - (PHONE ? 118 : 96);
    ctx.save(); ctx.font = D.font(fz(20), 800); const ew = ctx.measureText(eq).width; ctx.restore();
    const efs = ew > MAIN.w - 30 ? fz(20) * (MAIN.w - 30) / ew : fz(20);
    D.roundRect(MAIN.x + 14, ey - 30, MAIN.w - 28, 56, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4; ctx.stroke();
    T(MAIN.x + MAIN.w / 2, ey + 2, eq, Math.max(13, efs), INK, 'center', 800);
    const sum = has ? cmpSum(c, val) : null;
    const msg = !has ? '아래에서 ' + c.name + '의 산화수 x를 입력해 보세요' : good ? '✅ 합 = ' + qStr(sum) + ' = 전하 ' + qStr(c.q) + ' → 맞아요!' : '합 = ' + qStr(sum) + ' ≠ 전하 ' + qStr(c.q) + '  (' + (sum > c.q ? '값을 줄여 보세요' : '값을 키워 보세요') + ')';
    T(MAIN.x + MAIN.w / 2, ey + 46, msg, 14.5, good ? '#166534' : has ? '#9a3412' : MUTED, 'center', 800);
    if (c.id === 'h2o2') T(MAIN.x + MAIN.w / 2, G.gy + maxH / 2 + 46, 'O–O 결합이 있는 과산화물이에요', 13.5, '#7c3aed', 'center', 800);
    // 규칙 카드
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (!PHONE) {
      const cw = (INFO.w - 24 - 4 * 8) / 5;
      RULES.forEach((r, i) => {
        const x0 = INFO.x + 12 + i * (cw + 8), used = c.rules.indexOf(i) >= 0;
        D.roundRect(x0, INFO.y + 12, cw, INFO.h - 24, 12); ctx.fillStyle = used ? '#ede9fe' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = used ? PUR : '#cbd5e1'; ctx.lineWidth = used ? 2.4 : 1.4; ctx.stroke();
        T(x0 + 10, INFO.y + 34, (i + 1) + '. ' + r.t, 13.5, used ? '#5b21b6' : INK, 'left', 800);
        textBlock(x0 + 10, INFO.y + 56, cw - 18, r.d, 13, used ? '#4c1d95' : MUTED, 17, 700);
      });
    } else {
      RULES.forEach((r, i) => {
        const y0 = INFO.y + 10 + i * 51, used = c.rules.indexOf(i) >= 0;
        D.roundRect(INFO.x + 10, y0, INFO.w - 20, 46, 10); ctx.fillStyle = used ? '#ede9fe' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = used ? PUR : '#cbd5e1'; ctx.lineWidth = used ? 2.2 : 1.2; ctx.stroke();
        T(INFO.x + 20, y0 + 19, (i + 1) + '. ' + r.t, 13.5, used ? '#5b21b6' : INK, 'left', 800);
        T(INFO.x + 20, y0 + 38, r.d, 13, used ? '#4c1d95' : MUTED, 'left', 700);
      });
    }
  }

  /* ----- N 화합물 눈금 ----- */
  const NC = [
    { id: 'nh3', f: 'NH₃', ans: -3, tpl: 'x + 3×(+1) = 0' },
    { id: 'n2', f: 'N₂', ans: 0, tpl: '홑원소 물질' },
    { id: 'no', f: 'NO', ans: 2, tpl: 'x + (−2) = 0' },
    { id: 'no2', f: 'NO₂', ans: 4, tpl: 'x + 2×(−2) = 0' },
    { id: 'hno3', f: 'HNO₃', ans: 5, tpl: '(+1) + x + 3×(−2) = 0' },
  ];
  const scG = () => {
    const top = MAIN.y + 20, rows = 9, rh = (MAIN.h - 40) / rows;
    const x0 = MAIN.x + (PHONE ? 66 : 250), sw = PHONE ? 158 : 176;
    return { top, rh, x0, sw, cw: PHONE ? 128 : 144, ch: Math.min(32, rh - 4), tx: MAIN.x + MAIN.w - (PHONE ? 76 : 120), ty0: MAIN.y + (PHONE ? 70 : 62), tdy: PHONE ? 62 : 56 };
  };
  const scRowY = (ox, G) => G.top + (5 - ox) * G.rh + G.rh / 2;
  const scRowOf = (y, G) => { const r = Math.floor((y - G.top) / G.rh); return r >= 0 && r < 9 ? 5 - r : null; };
  function scReset() {
    const ru = S.ru, G = scG(); ru.drag = null; ru.sel = null; ru.okAll = false; ru.wrongT = 0;
    const order = [3, 0, 4, 2, 1];
    ru.cards = order.map((ni, ti) => { const n = NC[ni]; return { id: n.id, f: n.f, ans: n.ans, tpl: n.tpl, row: null, x: G.tx, y: G.ty0 + ti * G.tdy, tx: G.tx, ty: G.ty0 + ti * G.tdy, ti, s: 1, shake: 0, wrong: false, good: false }; });
    ru.order = ru.cards.map((c) => c.id); updateCtl();
  }
  const scTray = (c, G) => ({ x: G.tx, y: G.ty0 + c.ti * G.tdy });
  function scLayout() {
    const G = scG();
    S.ru.cards.forEach((c) => { if (c === (S.ru.drag && S.ru.drag.c)) return; if (c.row == null) { const p = scTray(c, G); c.tx = p.x; c.ty = p.y; } else { c.tx = G.x0 + G.sw / 2; c.ty = scRowY(c.row, G); } });
  }
  const scPlaced = () => S.ru.cards.filter((c) => c.row != null).length;
  const scRight = () => S.ru.cards.filter((c) => c.row === c.ans).length;
  function stepScale(dt) {
    const ru = S.ru;
    scLayout();
    ru.cards.forEach((c) => {
      const dg = ru.drag && ru.drag.c === c;
      if (dg) { c.x = ru.drag.x; c.y = ru.drag.y; } else { c.x = ap(c.x, c.tx, dt, 14); c.y = ap(c.y, c.ty, dt, 14); }
      c.s = ap(c.s, dg ? 1.12 : 1, dt, 16); c.shake = Math.max(0, c.shake - dt);
    });
    ru.pop = Math.max(0, ru.pop - dt * 2.4);
  }
  function nColor(ox) { const k = clamp((ox + 3) / 8, 0, 1); return k < 0.375 ? C.mix('#3b82f6', '#94a3b8', k / 0.375) : C.mix('#94a3b8', '#ef4444', (k - 0.375) / 0.625); }
  function drawScale(t) {
    const ru = S.ru, G = scG();
    T(14, 26, '📏 N의 산화수 눈금에 화합물 카드를 놓아요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 눈금
    for (let ox = 5; ox >= -3; ox--) {
      const y = scRowY(ox, G), occ = ru.cards.some((c) => c.row === ox);
      D.roundRect(G.x0, y - G.rh / 2 + 2, G.sw, G.rh - 4, 8); ctx.fillStyle = ox === 0 ? 'rgba(148,163,184,.22)' : 'rgba(148,163,184,.09)'; ctx.fill();
      ctx.strokeStyle = 'rgba(100,116,139,.3)'; ctx.lineWidth = 1.2; ctx.stroke();
      T(G.x0 - 12, y + 5, oxs(ox), 15, ox > 0 ? UPC : ox < 0 ? DNC : MUTED, 'right', 800);
      if (ru.drag) { const hov = scRowOf(ru.drag.y, G) === ox && ru.drag.x > G.x0 - 40 && ru.drag.x < G.x0 + G.sw + 40; if (hov) { D.roundRect(G.x0 - 2, y - G.rh / 2 + 1, G.sw + 4, G.rh - 2, 9); ctx.strokeStyle = PUR; ctx.lineWidth = 2.4; ctx.stroke(); } }
    }
    // 산화수 축 화살표
    D.arrow(G.x0 - 52, MAIN.y + MAIN.h - 26, G.x0 - 52, MAIN.y + 28, { color: '#cbd5e1', width: 3, head: 11 });
    T(G.x0 - 52, MAIN.y + MAIN.h - 8, 'N의 산화수', 12.5, MUTED, 'center', 800, {});
    T(MAIN.x + MAIN.w - (PHONE ? 76 : 120), MAIN.y + 36, '카드 보관함', 13.5, MUTED, 'center', 800);
    // 카드
    const order = ru.order.slice(); if (ru.drag) { const i = order.indexOf(ru.drag.c.id); order.splice(i, 1); order.push(ru.drag.c.id); }
    order.forEach((id) => {
      const c = ru.cards.find((q) => q.id === id), dg = ru.drag && ru.drag.c === c;
      ctx.save(); ctx.translate(c.x + (c.shake > 0 ? Math.sin(c.shake * 60) * 4 : 0), c.y); ctx.scale(c.s, c.s);
      D.shadow(() => { D.roundRect(-G.cw / 2, -G.ch / 2, G.cw, G.ch, 10); ctx.fillStyle = c.good ? '#dcfce7' : c.wrong ? '#fee2e2' : '#ffffff'; ctx.fill(); ctx.strokeStyle = c.good ? '#22c55e' : c.wrong ? '#ef4444' : sel(c) ? PUR : '#94a3b8'; ctx.lineWidth = c.good || c.wrong || sel(c) ? 2.4 : 1.6; ctx.stroke(); }, { blur: dg ? 14 : 5, y: dg ? 7 : 2 });
      const nOx = c.row != null ? c.row : null;
      D.sphere(-G.cw / 2 + 17, 0, 11, nOx != null ? nColor(nOx) : '#cbd5e1', { text: 'N', textColor: '#fff', textScale: 1.1, gloss: false });
      T(-G.cw / 2 + 36, 6, c.f, 17, INK, 'left', 800);
      ctx.restore();
    });
    function sel(c) { return ru.sel === c.id; }
    // 선택 카드의 계산 도움
    const sc = ru.cards.find((c) => c.id === ru.sel);
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '같은 원소라도 화합물에 따라 산화수가 달라요', 15, WARN, 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 54, INFO.w - 32, '카드를 눌러 선택하면 N의 산화수를 구하는 식이 나타나요. N의 산화수 x를 직접 계산해서 눈금에 놓아요.', 14, INK, 20, 700);
    if (sc) {
      D.roundRect(INFO.x + 16, INFO.y + INFO.h - 48, INFO.w - 32, 36, 10); ctx.fillStyle = '#f5f3ff'; ctx.fill(); ctx.strokeStyle = PUR; ctx.lineWidth = 1.6; ctx.stroke();
      T(INFO.x + INFO.w / 2, INFO.y + INFO.h - 24, sc.f + ' :  ' + sc.tpl, 16, '#5b21b6', 'center', 800);
    } else T(INFO.x + INFO.w / 2, INFO.y + INFO.h - 24, '놓은 카드 ' + scPlaced() + ' / 5', 14.5, MUTED, 'center', 800);
  }
  const scHit = (p) => {
    const G = scG(), ru = S.ru;
    for (let i = ru.order.length - 1; i >= 0; i--) { const c = ru.cards.find((q) => q.id === ru.order[i]); if (Math.abs(p.x - c.x) <= G.cw / 2 + 4 && Math.abs(p.y - c.y) <= G.ch / 2 + 6) return c; }
    return null;
  };
  function scDrop(c, p) {
    const G = scG(), ru = S.ru;
    const row = (p.x > G.x0 - 50 && p.x < G.x0 + G.sw + 50) ? scRowOf(p.y, G) : null;
    if (row == null) { c.row = null; c.wrong = false; c.good = false; if (p.x > G.x0 - 50 && p.x < G.x0 + G.sw + 50) showHint('눈금 칸(+5 ~ −3) 안에 놓아야 해요.', 2600); return; }
    const occ = ru.cards.find((q) => q !== c && q.row === row);
    if (occ) { occ.row = null; occ.wrong = false; occ.good = false; }
    c.row = row; c.wrong = false; c.good = false; Sound.tick();
  }
  function scCheck() {
    const ru = S.ru;
    if (scPlaced() < 5) return '아직 놓지 않은 카드가 있어요. 카드 5장을 모두 눈금에 놓아 주세요.';
    const bad = ru.cards.filter((c) => c.row !== c.ans);
    ru.cards.forEach((c) => { if (c.row === c.ans) { if (!c.good) { c.good = true; c.wrong = false; } } else if (!c.wrong) { c.wrong = true; c.good = false; c.shake = 0.4; } });
    if (!bad.length) { ru.okAll = true; return true; }
    return bad.length + '장이 알맞은 칸에 있지 않아요 (빨간 카드). 카드를 눌러 계산식을 보고 N의 산화수 x를 다시 구해 보세요.';
  }

  /* ============ ③ 변화로 판별 ============ */
  const sp = (co, tk, ch) => ({ co, tk, ch: ch || '' });
  const tk = (el, c, ox) => ({ el, c, ox });
  const RXN = [
    { id: 'cuag', name: 'Cu + Ag⁺', L: [sp(1, [tk('Cu', 1, 0)]), sp(2, [tk('Ag', 1, 1)], '⁺')], R: [sp(1, [tk('Cu', 1, 2)], '²⁺'), sp(2, [tk('Ag', 1, 0)])], chg: { Cu: [0, 2], Ag: [1, 0] }, redox: true, e: 2 },
    { id: 'ch4', name: 'CH₄ 연소', L: [sp(1, [tk('C', 1, -4), tk('H', 4, 1)]), sp(2, [tk('O', 2, 0)])], R: [sp(1, [tk('C', 1, 4), tk('O', 2, -2)]), sp(2, [tk('H', 2, 1), tk('O', 1, -2)])], chg: { C: [-4, 4], O: [0, -2] }, redox: true, e: 8 },
    { id: 'fe2o3', name: 'Fe₂O₃ 제련', L: [sp(1, [tk('Fe', 2, 3), tk('O', 3, -2)]), sp(3, [tk('C', 1, 2), tk('O', 1, -2)])], R: [sp(2, [tk('Fe', 1, 0)]), sp(3, [tk('C', 1, 4), tk('O', 2, -2)])], chg: { Fe: [3, 0], C: [2, 4] }, redox: true, e: 6 },
    { id: 'hclnaoh', name: 'HCl + NaOH', L: [sp(1, [tk('H', 1, 1), tk('Cl', 1, -1)]), sp(1, [tk('Na', 1, 1), tk('O', 1, -2), tk('H', 1, 1)])], R: [sp(1, [tk('Na', 1, 1), tk('Cl', 1, -1)]), sp(1, [tk('H', 2, 1), tk('O', 1, -2)])], chg: {}, redox: false, e: 0 },
    { id: 'caco3', name: 'CaCO₃ + HCl', L: [sp(1, [tk('Ca', 1, 2), tk('C', 1, 4), tk('O', 3, -2)]), sp(2, [tk('H', 1, 1), tk('Cl', 1, -1)])], R: [sp(1, [tk('Ca', 1, 2), tk('Cl', 2, -1)]), sp(1, [tk('H', 2, 1), tk('O', 1, -2)]), sp(1, [tk('C', 1, 4), tk('O', 2, -2)])], chg: {}, redox: false, e: 0 },
    { id: 'agno3', name: 'AgNO₃ + NaCl', L: [sp(1, [tk('Ag', 1, 1), tk('N', 1, 5), tk('O', 3, -2)]), sp(1, [tk('Na', 1, 1), tk('Cl', 1, -1)])], R: [sp(1, [tk('Ag', 1, 1), tk('Cl', 1, -1)]), sp(1, [tk('Na', 1, 1), tk('N', 1, 5), tk('O', 3, -2)])], chg: {}, redox: false, e: 0 },
  ];
  // 증가 · 감소 전자 수 : 반응물 쪽 원자 수 × 산화수 변화
  function rxnE(rx) {
    let lost = 0, gain = 0; const lines = [];
    Object.keys(rx.chg).forEach((el) => {
      let n = 0; rx.L.forEach((s) => s.tk.forEach((q) => { if (q.el === el) n += s.co * q.c; }));
      const d = rx.chg[el][1] - rx.chg[el][0];
      if (d > 0) lost += n * d; else gain += n * -d;
      lines.push({ el, n, from: rx.chg[el][0], to: rx.chg[el][1], d });
    });
    return { lost, gain, lines };
  }
  RXN.forEach((rx) => { rx.E = rxnE(rx); });
  const NR = RXN.length;
  const tkStr = (q) => q.el + (q.c > 1 ? subs(q.c) : '');
  const jdCur = () => RXN[S.jd.k];
  const jdOkN = () => S.jd.ok.filter(Boolean).length;
  function jdInit() { const jd = S.jd; jd.tagT = RXN.map(() => -1); jd.ok = RXN.map(() => false); jd.eVal = RXN.map(() => NaN); jd.scT = RXN.map(() => 0); jd.burst = RXN.map(() => false); jd.shake = 0; jd.msg = ''; }
  jdInit();
  function jdSel(k) {
    S.jd.k = k; S.jd.shake = 0; S.jd.msg = '';
    const e = $('#jdE'); if (e) { const v = S.jd.eVal[k]; e.value = isNaN(v) ? '' : String(v); e.classList.remove('ok', 'bad'); }
    updateCtl();
  }
  function jdTag() { const jd = S.jd; if (jd.tagT[jd.k] >= 0) return; jd.tagT[jd.k] = 0; jd.scT[jd.k] = 0; Sound.click(); updateCtl(); }
  function jdAnswer(yes) {
    const jd = S.jd, rx = jdCur(); if (jd.tagT[jd.k] < 0 || jd.ok[jd.k]) return;
    if (yes === rx.redox) { jd.ok[jd.k] = true; jd.msg = ''; Sound.tick(); flash(MAIN.x + MAIN.w / 2, MAIN.y + MAIN.h - 60, ['#14a058', '#fbbf24', '#8b5cf6']); }
    else { jd.shake = 0.45; Sound.fail && Sound.fail(); jd.msg = yes ? '산화수가 바뀐 원자가 있는지 다시 살펴보세요. 원자마다 산화수를 비교해 보면 알 수 있어요.' : '증가한 원자와 감소한 원자가 있어요. 전자가 이동한 반응이니 산화·환원 반응이에요.'; }
    updateCtl();
  }
  function stepJudge(dt) {
    const jd = S.jd;
    for (let k = 0; k < NR; k++) { if (jd.tagT[k] >= 0) { jd.tagT[k] += dt; if (jd.tagT[k] > revealEnd(RXN[k]) + 0.5) jd.scT[k] += dt; } }
    jd.shake = Math.max(0, jd.shake - dt);
  }
  const nTok = (rx) => rx.L.concat(rx.R).reduce((s, q) => s + q.tk.length, 0);
  const revealEnd = (rx) => nTok(rx) * 0.07 + 0.5;
  /* 식 배치: 두 줄 (반응물 / 생성물) */
  function rxnRow(list, cx, baseY, fs, opts) {
    // 각 항의 폭
    const cellW = PHONE ? 36 : 40, opW = 26;
    const items = list.map((s) => {
      const cw = s.co > 1 ? textW(String(s.co), fs, 800) + 4 : 0, chw = s.ch ? textW(s.ch, fs * 0.6, 800) : 0;
      return { s, cw, chw, w: cw + s.tk.length * cellW + chw };
    });
    const total = items.reduce((a, q) => a + q.w, 0) + opW * (items.length - 1);
    let x = cx - total / 2; const out = [];
    items.forEach((it, ii) => {
      let xx = x;
      if (it.cw) { out.push({ kind: 'co', x: xx, text: String(it.s.co) }); xx += it.cw; }
      out.push({ kind: 'box', x: xx - 2, w: it.s.tk.length * cellW + 4 });
      it.s.tk.forEach((q) => { out.push({ kind: 'tk', q, s: it.s, cx: xx + cellW / 2 }); xx += cellW; });
      if (it.chw) out.push({ kind: 'ch', x: xx, text: it.s.ch });
      x += it.w;
      if (ii < items.length - 1) { out.push({ kind: 'plus', cx: x + opW / 2 }); x += opW; }
    });
    return out;
  }
  function drawJudge(t) {
    const jd = S.jd, rx = jdCur(), k = jd.k, T0 = jd.tagT[k], tagged = T0 >= 0;
    T(14, 26, '🔍 산화수를 붙여서 산화·환원 반응인지 판별해요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const fs = PHONE ? 22 : 25, cx = MAIN.x + MAIN.w / 2;
    const y1 = MAIN.y + (PHONE ? 126 : 112), y2 = MAIN.y + (PHONE ? 276 : 236);
    T(MAIN.x + 14, y1 - 4, '반응물', 13, MUTED, 'left', 800); T(MAIN.x + 14, y2 - 4, '생성물', 13, MUTED, 'left', 800);
    D.arrow(cx, y1 + 22, cx, y2 - fs - 52, { color: '#94a3b8', width: 3, head: 11 });
    T(cx + 14, (y1 + y2) / 2 - 8, '반응', 13.5, MUTED, 'left', 700);
    let idx = 0;
    const drawRow = (list, baseY, side) => {
      const plan = rxnRow(list, cx, baseY, fs);
      plan.forEach((it) => {
        if (it.kind === 'box') { D.roundRect(it.x, baseY - fs - 4, it.w, fs + 14, 10); ctx.fillStyle = 'rgba(148,163,184,.13)'; ctx.fill(); }
        else if (it.kind === 'co') T(it.x, baseY, it.text, fs, '#64748b', 'left', 800);
        else if (it.kind === 'plus') T(it.cx, baseY, side === 0 || true ? '+' : '', fs * 0.9, '#94a3b8', 'center', 800);
        else if (it.kind === 'ch') T(it.x, baseY - fs * 0.45, it.text, fs * 0.62, INK, 'left', 800);
        else {
          const q = it.q, i = idx++, kk = tagged ? clamp((T0 - i * 0.07) / 0.45, 0, 1) : 0;
          const ch = rx.chg[q.el]; let dir = null;
          if (ch && tagged) { if (side === 0) dir = ch[1] > ch[0] ? 'up' : 'down'; else dir = ch[1] > ch[0] ? 'up' : 'down'; }
          const dirOn = tagged && T0 > revealEnd(rx) - 0.4 ? clamp((T0 - (revealEnd(rx) - 0.4)) / 0.4, 0, 1) : 0;
          const col = dir && dirOn > 0 ? (dir === 'up' ? UPC : DNC) : INK;
          T(it.cx, baseY, tkStr(q), fs, C.mix(INK, col, dirOn), 'center', 800);
          if (kk > 0) {
            const shown = Math.round(q.ox * sm(kk));
            const reach = kk >= 0.999;
            pill(it.cx, baseY - fs - 12, oxs(shown), { bg: dir && dirOn > 0.5 ? (dir === 'up' ? '#fee2e2' : '#dbeafe') : '#fff', color: dir && dirOn > 0.5 ? (dir === 'up' ? '#b91c1c' : '#1d4ed8') : INK, border: dir && dirOn > 0.5 ? (dir === 'up' ? '#f87171' : '#60a5fa') : 'rgba(38,50,74,.35)', size: 14, scale: 0.6 + 0.4 * SPL.outBack(kk), alpha: Math.min(1, kk * 2) });
            if (dir && dirOn > 0 && side === 0) {
              const ay = baseY - fs - 40;
              D.arrow(it.cx, dir === 'up' ? ay + 14 : ay, it.cx, dir === 'up' ? ay : ay + 14, { color: dir === 'up' ? UPC : DNC, width: 3, head: 8, alpha: dirOn });
              T(it.cx + 12, ay + 12, (ch[1] - ch[0] > 0 ? '+' : MINUS) + Math.abs(ch[1] - ch[0]), 13, dir === 'up' ? UPC : DNC, 'left', 800, { alpha: dirOn });
            }
            if (!reach) { /* 굴러가는 중 */ }
          }
        }
      });
    };
    drawRow(rx.L, y1, 0); drawRow(rx.R, y2, 1);
    // 범례
    const ly = MAIN.y + MAIN.h - 14;
    const lg = (x, c, txt) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, ly - 4, 6, 0, TAU); ctx.fill(); T(x + 11, ly, txt, 13, MUTED, 'left', 700); };
    lg(MAIN.x + 16, UPC, '산화수 증가'); lg(MAIN.x + (PHONE ? 126 : 130), DNC, '산화수 감소'); lg(MAIN.x + (PHONE ? 236 : 244), '#94a3b8', '변화 없음');
    // 판정 배너
    const by = MAIN.y + MAIN.h - 58;
    const sx = jd.shake > 0 ? Math.sin(jd.shake * 60) * 4 : 0;
    if (jd.ok[k]) {
      const txt = rx.redox ? '✅ 산화·환원 반응이에요 (산화수가 변해요)' : '✅ 산화·환원 반응이 아니에요 (산화수 변화 없음)';
      pill(cx, by, txt, { bg: rx.redox ? '#dcfce7' : '#e2e8f0', color: rx.redox ? '#166534' : '#334155', border: rx.redox ? '#4ade80' : '#94a3b8', size: 14.5 });
    } else if (tagged && T0 > revealEnd(rx)) {
      pill(cx + sx, by, jd.shake > 0 ? '다시 살펴보세요' : '증가와 감소를 살펴보고 판별하세요', { bg: jd.shake > 0 ? '#fee2e2' : '#fff7ed', color: jd.shake > 0 ? '#b91c1c' : '#9a3412', border: jd.shake > 0 ? '#f87171' : '#fdba74', size: 14 });
    } else if (!tagged) pill(cx, by, '“산화수 붙이기”를 눌러 보세요', { bg: '#f1f5f9', color: MUTED, border: '#cbd5e1', size: 14 });
    // 전자 저울 (INFO)
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    drawBalance(rx, k, t);
  }
  function drawBalance(rx, k, t) {
    const jd = S.jd, E = rx.E, sc = jd.scT[k];
    const L = E.lost * sm(clamp(sc / 1.0, 0, 1)), R = E.gain * sm(clamp((sc - 1.0) / 1.0, 0, 1));
    const bx = PHONE ? INFO.x + INFO.w / 2 : INFO.x + 170, by = INFO.y + (PHONE ? 50 : 52), hl = PHONE ? 120 : 112;
    const mx = Math.max(E.lost, E.gain, 1);
    const ang = clamp((L - R) / mx, -1, 1) * 0.22;
    // 받침대
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(bx, by + 4); ctx.lineTo(bx - 14, by + (PHONE ? 70 : 82)); ctx.lineTo(bx + 14, by + (PHONE ? 70 : 82)); ctx.closePath(); ctx.fill();
    ctx.fillRect(bx - 34, by + (PHONE ? 70 : 82), 68, 6);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-ang);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-hl, 0); ctx.lineTo(hl, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
    // 접시
    const ends = [{ x: bx - Math.cos(ang) * hl, y: by + Math.sin(ang) * hl, n: L, label: '잃은 전자 (산화수 증가 합)', col: UPC }, { x: bx + Math.cos(ang) * hl, y: by - Math.sin(ang) * hl, n: R, label: '얻은 전자 (산화수 감소 합)', col: DNC }];
    ends.forEach((e, i) => {
      const py = e.y + 26;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - 34, py); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + 34, py); ctx.stroke();
      D.roundRect(e.x - 38, py, 76, 7, 3); ctx.fillStyle = '#64748b'; ctx.fill();
      const cnt = Math.round(e.n), sh = Math.min(cnt, 8);
      for (let q = 0; q < sh; q++) { const col = q % 4, row = Math.floor(q / 4); eBall(e.x - 26 + col * 17.5, py - 8 - row * 15.5, 7.2); }
      if (cnt > 8) T(e.x + 42, py - 4, '+' + (cnt - 8), 13, MUTED, 'left', 800);
      T(e.x, py + 28, String(cnt) + '개', 15, e.col, 'center', 800);
    });
    if (!PHONE) {
      T(bx - hl, INFO.y + 20, '잃은 전자', 13, UPC, 'center', 800); T(bx + hl, INFO.y + 20, '얻은 전자', 13, DNC, 'center', 800);
    } else { T(bx - hl + 4, INFO.y + 20, '잃은 전자', 13, UPC, 'center', 800); T(bx + hl - 4, INFO.y + 20, '얻은 전자', 13, DNC, 'center', 800); }
    const eq = Math.round(L) === Math.round(R) && sc > 2.2;
    if (eq && E.lost > 0 && !jd.burst[k]) { jd.burst[k] = true; flash(bx, by, ['#fbbf24', '#14a058', '#8b5cf6']); }
    // 설명
    const tx = PHONE ? INFO.x + 16 : INFO.x + 340, ty = PHONE ? INFO.y + 166 : INFO.y + 26, tw = PHONE ? INFO.w - 32 : INFO.w - 356;
    if (jd.tagT[k] < 0) { textBlock(tx, ty, tw, '산화수를 붙이면 반응물의 어느 원자가 전자를 잃고 얻는지, 전자 저울로 확인할 수 있어요.', 14, MUTED, 20, 700); return; }
    if (!rx.redox) { textBlock(tx, ty, tw, '모든 원자의 산화수가 그대로예요. 증가 0 = 감소 0, 전자의 이동이 없어요. 산화·환원 반응이 아니에요.', 14, '#334155', 20, 800); return; }
    let yy = ty;
    E.lines.forEach((l) => {
      const up = l.d > 0, txt = (up ? '증가 ' : '감소 ') + l.el + ' ' + oxs(l.from) + ' → ' + oxs(l.to) + ' (' + l.n + '개 × ' + Math.abs(l.d) + ')  =  ' + l.n * Math.abs(l.d);
      T(tx, yy, txt, 13.5, up ? UPC : DNC, 'left', 800); yy += 22;
    });
    T(tx, yy + 4, eq ? '✅ 잃은 전자 ' + E.lost + '개 = 얻은 전자 ' + E.gain + '개' : '전자 저울이 평형을 찾는 중…', 14.5, eq ? '#166534' : MUTED, 'left', 800);
  }

  /* ============ ④ 산화제의 역할 ============ */
  const ROLE_NAME = ['', '산화제', '환원제'];
  const ROLE_COL = ['#94a3b8', OXC, REDC];
  const ROX = [
    { id: 'cuag', name: 'Cu + Ag⁺', L: [{ f: 'Cu', role: 2, chg: 'Cu  0 → +2', dir: 'up' }, { f: '2Ag⁺', role: 1, chg: 'Ag  +1 → 0', dir: 'down' }], R: ['Cu²⁺', '2Ag'] },
    { id: 'zncu', name: 'Zn + Cu²⁺', L: [{ f: 'Zn', role: 2, chg: 'Zn  0 → +2', dir: 'up' }, { f: 'Cu²⁺', role: 1, chg: 'Cu  +2 → 0', dir: 'down' }], R: ['Zn²⁺', 'Cu'] },
    { id: 'ki', name: 'I⁻ + H₂O₂', L: [{ f: '2I⁻', role: 2, chg: 'I  −1 → 0', dir: 'up' }, { f: 'H₂O₂', role: 1, chg: 'O  −1 → −2', dir: 'down' }, { f: '2H⁺', role: 0, chg: '산성 환경' }], R: ['I₂', '2H₂O'] },
    { id: 'mn', name: 'H₂O₂ + MnO₄⁻', L: [{ f: '5H₂O₂', role: 2, chg: 'O  −1 → 0', dir: 'up' }, { f: '2MnO₄⁻', role: 1, chg: 'Mn  +7 → +2', dir: 'down' }, { f: '6H⁺', role: 0, chg: '산성 환경' }], R: ['5O₂', '2Mn²⁺', '8H₂O'] },
  ];
  S.rl.tags = ROX.map((r) => r.L.map(() => 0));
  S.rl.pop = ROX.map((r) => r.L.map(() => 0));
  const roSpecies = (k, i) => ROX[k].L[i];
  const roSpecOk = (k, i) => { const q = roSpecies(k, i); return q.role > 0 && S.rl.tags[k][i] === q.role; };
  const roRxDone = (k) => ROX[k].L.every((q, i) => q.role === 0 || roSpecOk(k, i));
  const roDoneN = () => ROX.filter((r, k) => roRxDone(k)).length;
  const roG = () => {
    const bw = PHONE ? 100 : 124, gap = PHONE ? 16 : 22;
    return { bw, bh: PHONE ? 64 : 70, gap, y0: MAIN.y + (PHONE ? 100 : 92) };
  };
  function roBoxes(k) {
    const G = roG(), n = ROX[k].L.length, tot = n * G.bw + (n - 1) * G.gap, x0 = MAIN.x + MAIN.w / 2 - tot / 2;
    return ROX[k].L.map((q, i) => ({ x: x0 + i * (G.bw + G.gap), y: G.y0, w: G.bw, h: G.bh, i, q }));
  }
  function roTap(p) {
    const k = S.rl.ex; const bx = roBoxes(k).find((b) => pointInRect(p, { x: b.x, y: b.y - 28, w: b.w, h: b.h + 28 }));
    if (!bx || bx.q.role === 0) return false;
    S.rl.tags[k][bx.i] = (S.rl.tags[k][bx.i] + 1) % 3; S.rl.pop[k][bx.i] = 1; Sound.click(); updateCtl();
    if (roRxDone(k)) flash(bx.x + bx.w / 2, bx.y, ['#14a058', '#fbbf24', '#8b5cf6']);
    return true;
  }
  function roSel(k) { S.rl.ex = k; updateCtl(); }
  function roCheck() {
    for (let k = 0; k < ROX.length; k++) {
      if (!roRxDone(k)) {
        const miss = ROX[k].L.findIndex((q, i) => q.role > 0 && S.rl.tags[k][i] !== q.role);
        const q = ROX[k].L[miss], had = S.rl.tags[k][miss];
        return '“' + ROX[k].name + '” 반응이 아직 완성되지 않았어요. ' + (had ? '‘' + q.f.replace(/^\d+/, '') + '’의 이름표를 다시 생각해 보세요. 산화수가 증가하면 환원제, 감소하면 산화제예요.' : '반응 고르기 단추로 바꿔 가며 모든 물질에 이름표를 붙여 주세요.');
      }
    }
    return true;
  }
  function drawTags(t) {
    const k = S.rl.ex, rx = ROX[k], G = roG(), done = roRxDone(k);
    T(14, 26, '🏷️ 산화수의 변화를 보고 산화제 · 환원제 이름표를 붙여요', PHONE ? 13 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const boxes = roBoxes(k);
    boxes.forEach((b, i) => {
      const q = b.q, tg = S.rl.tags[k][i], ok = roSpecOk(k, i), pop = S.rl.pop[k][i];
      ctx.save();
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = q.role === 0 ? '#f1f5f9' : tg ? C.mix('#ffffff', ROLE_COL[tg], 0.12) : '#ffffff'; ctx.fill(); }, { blur: 7, y: 2 });
      D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.strokeStyle = q.role === 0 ? '#cbd5e1' : ok ? GOODC : tg ? ROLE_COL[tg] : '#94a3b8'; ctx.lineWidth = ok ? 3 : 2; if (q.role !== 0 && !tg) ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(b.x + b.w / 2, b.y + b.h / 2 + 2, q.f, PHONE ? 22 : 25, q.role === 0 ? MUTED : INK, 'center', 800);
      T(b.x + b.w / 2, b.y + b.h - 10, q.chg, 13, q.role === 0 ? MUTED : (q.dir === 'up' ? UPC : DNC), 'center', 800);
      ctx.restore();
      // 이름표
      if (q.role > 0) {
        if (tg) pill(b.x + b.w / 2, b.y - 18, ROLE_NAME[tg] + (ok ? ' ✔' : ''), { bg: ROLE_COL[tg], color: '#fff', border: null, size: 14.5, scale: 1 + 0.25 * pop });
        else T(b.x + b.w / 2, b.y - 14, '눌러서 이름표 붙이기', 13, MUTED, 'center', 700);
      }
      if (i < boxes.length - 1) T(b.x + b.w + G.gap / 2, b.y + b.h / 2 + 8, '+', 22, '#94a3b8', 'center', 800);
    });
    // 반응 화살표와 생성물
    const cx = MAIN.x + MAIN.w / 2, py = G.y0 + G.bh + 62;
    D.arrow(cx, G.y0 + G.bh + 18, cx, py - 26, { color: '#94a3b8', width: 3, head: 11 });
    T(cx + 14, G.y0 + G.bh + 40, '반응 후', 13.5, MUTED, 'left', 700);
    T(cx, py + 8, rx.R.join('  +  '), PHONE ? 22 : 25, INK, 'center', 800);
    // 하단 메시지
    const my = MAIN.y + MAIN.h - 66;
    const msgs = {
      cuag: 'Cu의 산화수는 증가 → Cu는 Ag⁺를 환원시키는 환원제',
      zncu: 'Cu²⁺의 산화수는 감소 → Cu²⁺는 Zn을 산화시키는 산화제',
      ki: 'H₂O₂의 O는 −1 → −2 로 감소 → I⁻를 산화시키는 산화제',
      mn: 'H₂O₂의 O는 −1 → 0 으로 증가 → MnO₄⁻를 환원시키는 환원제',
    };
    if (done) {
      D.roundRect(MAIN.x + 14, my - 14, MAIN.w - 28, 52, 12); ctx.fillStyle = '#ecfdf5'; ctx.fill(); ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 1.5; ctx.stroke();
      textBlock(MAIN.x + 26, my + 6, MAIN.w - 52, '✅ ' + msgs[rx.id], 14, '#166534', 19, 800);
    } else T(cx, my + 14, '산화수가 늘어난 물질은 환원제, 줄어든 물질은 산화제예요', 14, MUTED, 'center', 700);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '산화제 · 환원제는 상대에 따라 정해져요', 15, WARN, 'left', 800);
    const l1 = ROX[0].L[0], dn = roDoneN();
    const c1 = roRxDone(0), c2 = roRxDone(1), c3 = roRxDone(2), c4 = roRxDone(3);
    const ll = [
      [c1, 'Cu는 Ag⁺ 앞에서 환원제  /  Cu²⁺는 Zn 앞에서 산화제'],
      [c3 && c4, 'H₂O₂는 I⁻ 앞에서 산화제  /  MnO₄⁻ 앞에서 환원제'],
    ];
    ll[0][0] = c1 && c2;
    ll.forEach((l, i) => textBlock(INFO.x + 16, INFO.y + 56 + i * (PHONE ? 46 : 28), INFO.w - 32, (l[0] ? '✅ ' : '⬜ ') + l[1], 14, l[0] ? '#166534' : MUTED, 20, 800));
    T(INFO.x + 16, INFO.y + INFO.h - 18, '완성한 반응 ' + dn + ' / 4', 14, MUTED, 'left', 800);
  }

  /* ----- 모의 실험 ----- */
  const BOT = {
    h2o2: {
      name: 'H₂O₂', label: 'H₂O₂ 수용액', col: '#cfe8ff', note: '',
      bk: {
        A: { name: 'KI + H₂SO₄ 용액', c0: '#dbeafe', a0: 0.4, c1: '#8a4a12', a1: 0.78, role: 1, chg: 'O  −1 → −2', eq: 'H₂O₂ + 2I⁻ + 2H⁺ → I₂ + 2H₂O', sum: 'I⁻ 가 I₂ 로 산화되어 갈색이 돼요. H₂O₂의 O는 −1 → −2 로 환원 → 산화제', fx: 'none' },
        B: { name: 'KMnO₄ + H₂SO₄ 용액', c0: '#8e2bb5', a0: 0.72, c1: '#f4e4f8', a1: 0.3, role: 2, chg: 'O  −1 → 0', eq: '5H₂O₂ + 2MnO₄⁻ + 6H⁺ → 5O₂ + 2Mn²⁺ + 8H₂O', sum: 'MnO₄⁻(보라색)가 Mn²⁺로 환원되어 색이 옅어지고 O₂ 기포가 나와요. H₂O₂의 O는 −1 → 0 으로 산화 → 환원제', fx: 'bubble' },
      },
    },
    so2: {
      name: 'SO₂', label: 'SO₂ 수용액', col: '#e9f5d8', note: 'SO₂, H₂S는 독성 기체라서 모의 실험으로만 해요.',
      bk: {
        A: { name: 'H₂S 수용액', c0: '#dbeafe', a0: 0.4, c1: '#efe08a', a1: 0.62, role: 1, chg: 'S  +4 → 0', eq: 'SO₂ + 2H₂S → 3S + 2H₂O', sum: '노란색 S 알갱이가 생겨요. SO₂의 S는 +4 → 0 으로 환원 → 산화제', fx: 'dots' },
        B: { name: 'KMnO₄ + H₂SO₄ 용액', c0: '#8e2bb5', a0: 0.72, c1: '#f4e4f8', a1: 0.3, role: 2, chg: 'S  +4 → +6', eq: '5SO₂ + 2MnO₄⁻ + 2H₂O → 5SO₄²⁻ + 2Mn²⁺ + 4H⁺', sum: 'MnO₄⁻(보라색)가 Mn²⁺로 환원되어 색이 옅어져요. SO₂의 S는 +4 → +6 으로 산화 → 환원제', fx: 'none' },
      },
    },
  };
  const BOTK = ['h2o2', 'so2'];
  const LV0 = 0.46, LV1 = 0.62;
  const labG = () => {
    const bw = PHONE ? 108 : 124, bh = PHONE ? 150 : 170, floor = MAIN.y + MAIN.h - (PHONE ? 92 : 62);
    return { bw, bh, floor, cx: { A: MAIN.x + (PHONE ? 205 : 392), B: MAIN.x + (PHONE ? 357 : 604) }, bot: { x: MAIN.x + (PHONE ? 62 : 112), y: floor, h: PHONE ? 84 : 100, w: PHONE ? 54 : 62 } };
  };
  function labReset() {
    const rl = S.rl; rl.pour = null;
    rl.bk = { A: { lv: LV0, rx: 0, poured: false, done: false, pop: 0, acc: 0 }, B: { lv: LV0, rx: 0, poured: false, done: false, pop: 0, acc: 0 } };
    const G = labG(); rl.bp = { x: G.bot.x, y: G.bot.y, a: 0 }; parts.clear(); updateCtl();
  }
  labReset();
  function labPour(which) {
    const rl = S.rl; if (rl.pour || rl.bk[which].poured) return;
    rl.pour = { bk: which, t: 0 }; Sound.click(); updateCtl();
  }
  function labBot(k) { S.rl.bot = k; labReset(); }
  const labPoseOf = (which) => {
    const G = labG(), th = 1.0, h = G.bot.h, top = G.floor - G.bh;
    const mx = G.cx[which] - (PHONE ? 6 : 8), my = top - 30;
    return { x: mx - h * Math.sin(th), y: my + h * Math.cos(th), a: th };
  };
  function stepLab(dt) {
    const rl = S.rl, G = labG(), bp = rl.bp, key = rl.bot;
    let tgt = { x: G.bot.x, y: G.bot.y, a: 0 };
    const po = rl.pour;
    if (po) {
      po.t += dt;
      if (po.t < 2.5) tgt = labPoseOf(po.bk);
      const b = rl.bk[po.bk];
      if (po.t >= 0.8 && po.t < 2.3) { b.lv = LV0 + (LV1 - LV0) * sm((po.t - 0.8) / 1.5); }
      if (po.t >= 2.3) b.lv = LV1;
      if (po.t >= 0.9 && !b.poured) { b.poured = true; }
      if (po.t >= 3.1) { rl.pour = null; updateCtl(); }
      // 줄기와 물방울
      if (po.t >= 0.85 && po.t < 2.3 && !RM) {
        const bt = BOT[key].bk[po.bk], g = labG(), top = g.floor - g.bh, ly = top + 5 + (g.bh - 11) * (1 - b.lv);
        if (Math.random() < 0.5) parts.emit({ x: g.cx[po.bk] + (Math.random() - 0.5) * 6, y: ly, vx: (Math.random() - 0.5) * 50, vy: -50 - Math.random() * 40, life: 0.4, size: 2.4, color: 'rgba(120,170,230,.8)', gravity: 300, shape: 'circle' });
      }
    }
    const k = Math.min(1, dt * 8);
    bp.x += (tgt.x - bp.x) * k; bp.y += (tgt.y - bp.y) * k; bp.a += (tgt.a - bp.a) * k;
    ['A', 'B'].forEach((w) => {
      const b = rl.bk[w], bt = BOT[key].bk[w];
      b.pop = Math.max(0, b.pop - dt * 2.4);
      if (b.poured) { b.rx = Math.min(1, b.rx + dt / 3.4); if (b.rx >= 0.995 && !b.done) { b.done = true; b.pop = 1; rl.seen[key + ':' + w] = true; Sound.tick(); const g = labG(); flash(g.cx[w], g.floor - g.bh - 24, ['#fbbf24', '#14a058', '#8b5cf6']); updateCtl(); } }
      if (bt.fx === 'bubble' && b.poured && b.rx > 0.04 && b.rx < 0.97 && !RM) {
        b.acc += dt * 26;
        const g = labG(), top = g.floor - g.bh, ix = g.cx[w] - g.bw / 2 + 5, iw = g.bw - 10, ly = top + 5 + (g.bh - 11) * (1 - b.lv), bot = top + 5 + g.bh - 11;
        while (b.acc >= 1) { b.acc -= 1; const x = ix + 10 + Math.random() * (iw - 20), y = bot - 8 - Math.random() * 14, vy = 38 + Math.random() * 20; parts.emit({ x, y, vx: 0, vy: -vy, life: Math.max(0.2, (y - ly - 6) / vy), size: 2.4 + Math.random() * 2.2, color: 'rgba(255,255,255,.9)', shape: 'bubble', gravity: 0 }); }
      }
    });
  }
  function drawBottleObj(x, y, ang, w, h, liq, label, lvl) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const nw = w * 0.42, sh = h * 0.26, x0 = -w / 2, top = -h;
    const path = () => {
      ctx.beginPath(); ctx.moveTo(-nw / 2, top); ctx.lineTo(-nw / 2, top + sh * 0.55);
      ctx.quadraticCurveTo(x0, top + sh * 0.7, x0, top + sh * 1.6); ctx.lineTo(x0, -9); ctx.quadraticCurveTo(x0, 0, x0 + 9, 0);
      ctx.lineTo(x0 + w - 9, 0); ctx.quadraticCurveTo(x0 + w, 0, x0 + w, -9); ctx.lineTo(x0 + w, top + sh * 1.6);
      ctx.quadraticCurveTo(x0 + w, top + sh * 0.7, nw / 2, top + sh * 0.55); ctx.lineTo(nw / 2, top); ctx.closePath();
    };
    D.shadow(() => { path(); ctx.fillStyle = 'rgba(235,244,255,.9)'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); path(); ctx.clip(); ctx.fillStyle = C.rgba(liq, 0.75); ctx.fillRect(x0, top + h * 0.34, w, h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x0, top + h * 0.34, w, 3); ctx.restore();
    path(); ctx.strokeStyle = 'rgba(70,100,140,.85)'; ctx.lineWidth = 2.4; ctx.stroke();
    // 라벨
    D.roundRect(x0 + 5, -h * 0.5, w - 10, h * 0.26, 5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = D.font(w * 0.24, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, -h * 0.37); ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 8, top + sh * 1.8); ctx.lineTo(x0 + 8, -16); ctx.stroke();
    ctx.restore();
  }
  function drawLab(t) {
    const rl = S.rl, key = rl.bot, B = BOT[key], G = labG();
    T(14, 26, '🧪 같은 ' + B.name + '를 두 용액에 넣으면?', PHONE ? 14.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 실험대
    D.roundRect(MAIN.x + 10, G.floor + 1, MAIN.w - 20, 10, 5); ctx.fillStyle = '#cbd5e1'; ctx.fill();
    ['A', 'B'].forEach((w) => {
      const b = rl.bk[w], bt = B.bk[w], e = sm(b.rx);
      const col = C.mix(bt.c0, bt.c1, e), al = bt.a0 + (bt.a1 - bt.a0) * e;
      const x = G.cx[w] - G.bw / 2, top = G.floor - G.bh;
      const bk = beaker(x, top, G.bw, G.bh, { level: b.lv, color: col, alpha: al, inside: (g) => {
        if (bt.fx === 'dots') { const n = Math.round(26 * e); for (let q = 0; q < n; q++) { const p = ballPos(g, q + 7, 4, 2, t); ctx.fillStyle = 'rgba(230,190,30,.9)'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, TAU); ctx.fill(); } }
        if (bt.fx === 'none' && w === 'A' && key === 'h2o2') { const n = Math.round(10 * e); for (let q = 0; q < n; q++) { const p = ballPos(g, q + 3, 4, 2, t); ctx.fillStyle = 'rgba(110,60,15,.55)'; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, TAU); ctx.fill(); } }
      } });
      T(G.cx[w], G.floor + 30, bt.name, PHONE ? 13 : 14, INK, 'center', 800);
      if (b.done) pill(G.cx[w], top - 24, B.name + ' : ' + ROLE_NAME[bt.role], { bg: ROLE_COL[bt.role], color: '#fff', border: null, size: 14.5, scale: 1 + 0.25 * b.pop });
      else if (!b.poured && !rl.pour) { T(G.cx[w], top - 12, '← 눌러서 ' + B.name + ' 붓기', 13, MUTED, 'center', 700); }
    });
    // 병
    const bp = rl.bp;
    const onTop = !!rl.pour;
    drawBottleObj(bp.x, bp.y, bp.a, G.bot.w, G.bot.h, B.col, B.name, 1);
    // 줄기
    const po = rl.pour;
    if (po && po.t >= 0.8 && po.t < 2.35) {
      const th = bp.a, mx = bp.x + G.bot.h * Math.sin(th), my = bp.y - G.bot.h * Math.cos(th);
      const b = rl.bk[po.bk], top = G.floor - G.bh, ly = top + 5 + (G.bh - 11) * (1 - b.lv);
      const fa = Math.min(1, (po.t - 0.8) * 4, (2.35 - po.t) * 4);
      ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = C.rgba('#7fb4f0', 0.9); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo(mx + 8, my + 10, G.cx[po.bk] - 4, ly); ctx.stroke(); ctx.restore();
    }
    if (!po) T(G.bot.x, G.floor + 30, B.label, PHONE ? 13 : 14, INK, 'center', 800);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '같은 ' + B.name + '인데 상대에 따라 역할이 달라요', 15, WARN, 'left', 800);
    let yy = INFO.y + 54;
    ['A', 'B'].forEach((w) => {
      const b = rl.bk[w], bt = B.bk[w];
      if (b.done) {
        T(INFO.x + 16, yy, bt.eq, PHONE ? 13 : 14.5, INK, 'left', 800); yy += 20;
        yy += textBlock(INFO.x + 16, yy, INFO.w - 32, bt.sum, 13.5, ROLE_COL[bt.role], 18, 800) + 8;
      } else if (!PHONE || w === 'A') {
        T(INFO.x + 16, yy, '⬜ ' + bt.name + '에 ' + B.name + '를 부어 보세요', 14, MUTED, 'left', 700); yy += 24;
      }
    });
    if (B.note && yy < INFO.y + INFO.h - 10) T(INFO.x + 16, INFO.y + INFO.h - 14, '⚠ ' + B.note, 13, '#b45309', 'left', 800);
  }

  function onLeave(m) {
    if (m === 'ledger') S.lg.h2o.drag = null;
    if (m === 'rules') S.ru.drag = null;
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'ledger') {
        if (S.sub.ledger === 'h2o') {
          const k = h2oPairHit(p); if (k < 0) return false;
          const h = S.lg.h2o; h.drag = { k, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true;
        }
        const g = lgIonG(); if (Math.hypot(p.x - g.cu.x, p.y - g.cu.y) <= g.rc + 10) lgIonGo();
        return false;
      }
      if (S.mode === 'rules' && S.sub.rules === 'scale') {
        const c = scHit(p); if (!c) { S.ru.sel = null; return false; }
        const ru = S.ru; ru.drag = { c, x: p.x, y: p.y }; ru.sel = c.id; ru.order = ru.order.filter((i) => i !== c.id).concat(c.id); c.row = null; c.wrong = false; c.good = false; Sound.click(); updateCtl(); return true;
      }
      if (S.mode === 'role') {
        if (S.sub.role === 'tags') { roTap(p); return false; }
        const G = labG(); ['A', 'B'].forEach((w) => { if (Math.abs(p.x - G.cx[w]) <= G.bw / 2 + 6 && p.y >= G.floor - G.bh - 30 && p.y <= G.floor + 8) labPour(w); });
        return false;
      }
      return false;
    },
    move(p) {
      const h = S.lg.h2o, ru = S.ru;
      if (h.drag) { h.drag.x = p.x; h.drag.y = p.y; if (Math.hypot(p.x - h.drag.sx, p.y - h.drag.sy) > 7) h.drag.moved = true; }
      else if (ru.drag) { ru.drag.x = p.x; ru.drag.y = p.y; }
    },
    up(p) {
      const h = S.lg.h2o, ru = S.ru;
      if (h.drag) {
        const d = h.drag, k = d.k; h.drag = null; const g = lgH();
        if (!d.moved) { if (!h.st[k]) h2oGive(k); return; }
        const dO = Math.hypot(p.x - g.O.x, p.y - g.O.y), dH = Math.hypot(p.x - g.H[k].x, p.y - g.H[k].y);
        if (dO < dH - 6) { if (!h.st[k]) h2oGive(k); }
        else if (h.st[k]) { h.st[k] = 0; Sound.tick(); updateCtl(); }
        else { h.shake = 0.35; h.hint = 3; Sound.fail && Sound.fail(); }
        return;
      }
      if (ru.drag) { const d = ru.drag; ru.drag = null; scDrop(d.c, p); updateCtl(); }
    },
    hover(p) {
      if (S.mode === 'ledger' && S.sub.ledger === 'h2o') return h2oPairHit(p) >= 0 ? 'grab' : 'default';
      if (S.mode === 'rules' && S.sub.rules === 'scale') return scHit(p) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ---------- 조작 장치 ---------- */
  function setSub(mode, sub) { S.sub[mode] = sub; updateCtl(); }
  makeChips($('#lgSel'), [['ion', '🔁 Cu + Ag⁺'], ['h2o', '💧 H₂O 공유 결합']], (v) => setSub('ledger', v));
  makeChips($('#ruSel'), [['calc', '🧮 산화수 계산'], ['scale', '📶 N 화합물 눈금']], (v) => setSub('rules', v));
  makeChips($('#ruCmp'), CMP.map((c) => [c.id, c.f + ' (' + c.name + ')']), (v) => { S.ru.cmp = v; const e = $('#ruIn'); const x = S.ru.val[v]; e.value = x == null || isNaN(x) ? '' : String(x).replace('-', MINUS); updateCtl(); });
  makeChips($('#jdSel'), RXN.map((r, i) => [String(i), (i + 1) + '. ' + r.name]), (v) => jdSel(+v));
  makeChips($('#roSel'), [['tags', '🏷️ 이름표'], ['lab', '🧪 모의 실험']], (v) => setSub('role', v));
  makeChips($('#roRx'), ROX.map((r, i) => [String(i), (i + 1) + '. ' + r.name]), (v) => roSel(+v));
  makeChips($('#roBot'), [['h2o2', '🧴 H₂O₂ 병'], ['so2', '🧴 SO₂ 병']], (v) => { labBot(v); });
  $('#bLgIon').addEventListener('click', lgIonGo);
  $('#bLgIonReset').addEventListener('click', () => { Sound.click(); lgIonReset(); });
  $('#bLgGive').addEventListener('click', () => { Sound.click(); h2oAuto(); });
  $('#bLgH2oReset').addEventListener('click', () => { Sound.click(); h2oReset(); });
  const ruInput = $('#ruIn');
  function ruWrite(v) { ruSetVal(S.ru.cmp, v); }
  ruInput.addEventListener('input', () => { const v = parseNum(ruInput.value.replace(/^\+/, '')); ruWrite(isNaN(v) ? NaN : Math.round(v)); });
  ruInput.addEventListener('change', () => { const v = S.ru.val[S.ru.cmp]; ruInput.value = v == null || isNaN(v) ? '' : String(v).replace('-', MINUS); });
  const ruStep = (d) => { Sound.tick(); const v = S.ru.val[S.ru.cmp]; const nv = (v == null || isNaN(v) ? 0 : v) + d; ruInput.value = String(nv).replace('-', MINUS); ruWrite(nv); };
  $('#ruMinus').addEventListener('click', () => ruStep(-1)); $('#ruPlus').addEventListener('click', () => ruStep(1));
  $('#bScReset').addEventListener('click', () => { Sound.click(); scReset(); });
  $('#bJdTag').addEventListener('click', jdTag);
  $('#bJdYes').addEventListener('click', () => jdAnswer(true)); $('#bJdNo').addEventListener('click', () => jdAnswer(false));
  const jdE = $('#jdE');
  bindNum(jdE, (v, ch) => {
    const jd = S.jd; jd.eVal[jd.k] = isNaN(v) ? NaN : Math.round(v);
    const rx = jdCur(); const ok = !isNaN(v) && Math.round(v) === rx.E.lost && jd.tagT[jd.k] >= 0;
    jdE.classList.toggle('ok', ok); if (ok) jdE.classList.remove('bad'); else if (ch && !isNaN(v)) jdE.classList.add('bad');
    updateCtl();
  });
  $('#bPourA').addEventListener('click', () => labPour('A')); $('#bPourB').addEventListener('click', () => labPour('B'));
  $('#bPourReset').addEventListener('click', () => { Sound.click(); labReset(); });

  function uiExtra() {
    const lg = S.lg;
    markChips($('#lgSel'), S.sub.ledger, { ion: lg.ion.done, h2o: lg.h2o.done });
    $('#bLgIon').disabled = lg.ion.run || lg.ion.done;
    $('#bLgGive').disabled = lg.h2o.done;
    const ru = S.ru, c = cmpOf(ru.cmp);
    markChips($('#ruSel'), S.sub.rules, { calc: solvedN() >= 4, scale: ru.okAll });
    markChips($('#ruCmp'), ru.cmp, ru.solved);
    $('#ruUnkLab').textContent = c.f + ' 속 ' + c.name + '의 산화수 x';
    const jd = S.jd, dn = {}; RXN.forEach((r, i) => { dn[String(i)] = jd.ok[i]; });
    markChips($('#jdSel'), String(jd.k), dn);
    const tg = jd.tagT[jd.k] >= 0;
    $('#bJdTag').disabled = tg; $('#bJdYes').disabled = !tg || jd.ok[jd.k]; $('#bJdNo').disabled = !tg || jd.ok[jd.k];
    $('#jdNote').textContent = jd.msg || (jd.ok[jd.k] ? '판별을 마쳤어요. 다른 반응도 살펴보세요.' : tg ? '산화수가 변한 원자가 있는지 살펴보고 판별해요.' : '먼저 “산화수 붙이기”를 눌러요.');
    const rd = {}; ROX.forEach((r, i) => { rd[String(i)] = roRxDone(i); });
    markChips($('#roRx'), String(S.rl.ex), rd);
    markChips($('#roSel'), S.sub.role, { tags: roDoneN() === 4, lab: !!(S.rl.seen['h2o2:A'] && S.rl.seen['h2o2:B']) });
    markChips($('#roBot'), S.rl.bot, { h2o2: !!(S.rl.seen['h2o2:A'] && S.rl.seen['h2o2:B']), so2: !!(S.rl.seen['so2:A'] && S.rl.seen['so2:B']) });
    const bt = BOT[S.rl.bot];
    $('#bPourA').disabled = !!S.rl.pour || S.rl.bk.A.poured; $('#bPourB').disabled = !!S.rl.pour || S.rl.bk.B.poured;
    $('#bPourA').textContent = '→ ' + bt.bk.A.name.split(' ')[0] + ' 용액에 붓기'; $('#bPourB').textContent = '→ ' + bt.bk.B.name.split(' ')[0] + ' 용액에 붓기';
  }

  function readouts() {
    const m = S.mode;
    if (m === 'ledger' && S.sub.ledger === 'ion') { const i = S.lg.ion; setRead('Cu의 산화수', oxs(i.ox[0]), 'Ag의 산화수', oxs(i.ox[1]) + ' , ' + oxs(i.ox[2]), '옮겨 간 전자', i.arrived.filter(Boolean).length + ' 개'); }
    else if (m === 'ledger') { const h = S.lg.h2o, g = h2oGiven(); setRead('O의 산화수', g ? oxs(-g) : '?', 'H의 산화수', (h.st[0] ? '+1' : '?') + ' , ' + (h.st[1] ? '+1' : '?'), '넘겨 준 전자쌍', g + ' / 2'); }
    else if (m === 'rules' && S.sub.rules === 'calc') { const c = cmpOf(S.ru.cmp), v = S.ru.val[c.id], has = !(v == null || isNaN(v)); setRead(c.name + '의 산화수', has ? oxs(v) : '?', '산화수의 합', has ? qStr(cmpSum(c, v)) : '?', '맞힌 화합물', solvedN() + ' / 6'); }
    else if (m === 'rules') { setRead('놓은 카드', scPlaced() + ' / 5', 'N의 최고 산화수', '+5', 'N의 최저 산화수', MINUS + '3'); }
    else if (m === 'judge') { const jd = S.jd, rx = jdCur(), tg = jd.tagT[jd.k] >= 0; setRead('고른 반응', rx.name, '잃은 · 얻은 전자', tg ? rx.E.lost + ' · ' + rx.E.gain : '?', '판별을 마친 반응', jdOkN() + ' / 6'); }
    else if (S.sub.role === 'tags') { setRead('고른 반응', ROX[S.rl.ex].name, '완성한 반응', roDoneN() + ' / 4', '붙인 이름표', S.rl.tags[S.rl.ex].filter(Boolean).length + ' / ' + ROX[S.rl.ex].L.filter((q) => q.role > 0).length); }
    else { const bt = BOT[S.rl.bot]; setRead('병 속 물질', bt.name, '왼쪽 · 오른쪽 비커', (S.rl.bk.A.done ? bt.bk.A.chg.split('  ')[1] : '—') + ' · ' + (S.rl.bk.B.done ? bt.bk.B.chg.split('  ')[1] : '—'), '역할', (S.rl.bk.A.done ? ROLE_NAME[bt.bk.A.role] : '—') + ' · ' + (S.rl.bk.B.done ? ROLE_NAME[bt.bk.B.role] : '—')); }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '전자 장부: 전자가 어디로 갔을까?', short: '전자 장부', icon: '🧾', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 산소도 전자도 눈에 보이지 않는 반응에서, 어느 쪽이 전자를 잃고 얻었는지 어떻게 알아낼까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> Cu + 2Ag⁺ → Cu²⁺ + 2Ag 반응으로 전자를 잃으면 산화, 얻으면 환원이고 잃은 전자 수와 얻은 전자 수가 같다고 배웠어요. 그런데 물(H₂O)처럼 공유 결합 물질에서는 전자가 완전히 옮겨 가지 않아요.</div>' +
        '<p>먼저 Cu + Ag⁺ 반응에서 전자의 이동을 다시 보고, H₂O에서는 공유 전자쌍을 <b>전기 음성도가 큰 원자에게 모두 주었다고 가정</b>하는 ‘장부’를 써 봐요. 이 장부의 숫자가 <b>산화수</b>예요.</p>',
      features: ['ledger'],
      setup() { lgIonReset(); h2oReset(); S.sub.ledger = 'ion'; setScene('ledger'); },
      recap: '이온 반응에서는 전자를 잃으면 산화수가 커지고 얻으면 작아져요. 공유 결합에서는 공유 전자쌍을 전기 음성도가 큰 원자에게 모두 준 것으로 가정해 산화수를 정하므로, 산화수는 실제 전하가 아닌 장부상의 가상 전하예요.',
      summary: '<ul><li>Cu + 2Ag⁺ → Cu²⁺ + 2Ag : Cu <b>0 → +2</b> (전자 2개 잃음, 산화), Ag <b>+1 → 0</b> (전자 1개씩 얻음, 환원)</li><li><b>산화수</b> = 공유 전자쌍을 전기 음성도가 큰 원자에게 모두 준 것으로 가정하고(이온 결합은 이온의 전하로) 정한 원자의 <b>가상 전하</b></li><li>H₂O : 전기 음성도 O(3.5) &gt; H(2.1) → O <b>−2</b>, H <b>+1</b>, 합 = 0</li><li>산화수가 실제 전하와 같은 경우는 이온 결합 물질의 이온뿐이에요.</li></ul>',
      missions: [
        {
          title: '전자 이동과 전자쌍 장부',
          goal: 'Cu + Ag⁺ 반응에서 <b>전자 2개를 옮기고</b>, H₂O에서 <b>공유 전자쌍 2개를 O에게</b> 넘겨 산화수를 확인하세요. (반응 고르기 단추로 바꿔요)',
          hint: 'Cu + Ag⁺는 “전자 옮기기” 단추를 눌러요. H₂O는 노란 전자쌍을 끌어서 O(빨간 공)에 가져다 놓거나 자동 단추를 눌러요.',
          setup() { lgIonReset(); h2oReset(); S.sub.ledger = 'ion'; setScene('ledger'); },
          check: () => S.lg.ion.done && S.lg.h2o.done, hold: 0.6,
          status: () => 'Cu + Ag⁺ ' + mark(S.lg.ion.done) + ' &nbsp; H₂O ' + mark(S.lg.h2o.done),
          explain: 'Cu는 전자 2개를 잃어 산화수가 0 → +2, Ag⁺는 전자를 1개씩 얻어 +1 → 0이 되었어요. 물에서는 전기 음성도가 큰 O에게 전자쌍 2개를 모두 준 것으로 가정해서 O는 −2, H는 +1이에요.',
        },
        {
          type: 'quiz', title: '산화수는 실제 전하일까?',
          goal: 'H₂O에서 O의 산화수는 −2예요. 이 값은 O 원자가 실제로 가진 전하와 같을까요?',
          setup() { setScene('ledger'); },
          choices: ['같아요. O 원자가 전자 2개를 완전히 빼앗아 O²⁻ 이온이 되었어요', '달라요. 공유 전자쌍을 O에게 모두 준 것으로 가정한 가상의 전하(장부상의 숫자)예요', '달라요. 산화수는 원자의 질량으로 정해요', '같아요. 산화수는 어떤 물질에서든 실제 전하와 같아요'],
          answer: 1,
          feedback: ['H₂O는 공유 결합 물질이라 전자가 완전히 옮겨 가지 않았어요. O²⁻ 이온이 생긴 것이 아니에요.', '', '산화수는 질량과 상관없이 전자쌍을 누구에게 주느냐로 정해요.', '이온 결합 물질(NaCl의 Na⁺, Cl⁻)에서는 같지만, 공유 결합 물질에서는 달라요.'],
          explain: '공유 결합에서는 전자가 두 원자에게 공유돼요. 산화수는 전자쌍을 전기 음성도가 큰 원자에게 모두 준 것으로 가정한 <b>가상의 전하</b>라서, 전자의 이동을 장부처럼 기록하는 데 쓰여요.',
        },
      ],
    },
    {
      title: '산화수 규칙: 합이 맞도록', short: '산화수 규칙', icon: '📏', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자쌍을 전기 음성도가 큰 원자에게 모두 주어 산화수를 정했어요. 분자마다 전자쌍을 그릴 수는 없으니, 규칙 5가지로 정리해요.</div>' +
        '<p>규칙 카드를 이용해 화합물 속 <b>미지 원자의 산화수</b>를 구해 봐요. 화합물에서 산화수의 합은 0이고, 다원자 이온에서는 이온의 전하와 같아요. 같은 N도 화합물에 따라 산화수가 달라지는 것도 눈금에서 확인해요.</p>',
      features: ['rules'],
      setup() { S.sub.rules = 'calc'; setScene('rules'); },
      recap: '홑원소 물질은 0, 단원자 이온은 이온의 전하, 1족 +1 · 2족 +2 · 할로젠 −1, O는 −2 · H는 +1 이고, 화합물 속 산화수의 합은 0(다원자 이온은 이온의 전하)이에요. 같은 원소도 화합물에 따라 산화수가 달라요.',
      summary: '<ul><li>홑원소 물질 0 · 단원자 이온 = 이온의 전하 · 1족 +1 · 2족 +2 · 할로젠 −1 · O −2 · H +1</li><li><b>합 = 전하</b> : 화합물 0, 다원자 이온은 이온의 전하 (HNO₃의 N: (+1) + x + 3×(−2) = 0 → <b>+5</b>)</li><li>KMnO₄의 Mn <b>+7</b> · K₂Cr₂O₇의 Cr <b>+6</b> · SO₄²⁻의 S <b>+6</b> · NH₄⁺의 N <b>−3</b></li><li>N의 산화수 : NH₃ <b>−3</b> · N₂ <b>0</b> · NO <b>+2</b> · NO₂ <b>+4</b> · HNO₃ <b>+5</b></li><li>예외 : 과산화물 H₂O₂의 O는 <b>−1</b> (O–O 결합), 금속 수소화물의 H는 −1</li></ul>',
      missions: [
        {
          title: '미지 원자의 산화수 구하기',
          goal: '화합물 6개 중 <b>4개 이상</b>에서 미지 원자의 산화수를 구해 합이 전하와 같아지게 하세요.',
          hint: '화합물을 고르고 아래 칸에 값을 넣거나 + · − 단추를 눌러요. 식의 합이 전하와 같아지면 초록색으로 바뀌어요. 예: HNO₃는 (+1) + x + 3×(−2) = 0.',
          setup() { S.ru.val = {}; S.ru.solved = {}; S.ru.cmp = 'hno3'; $('#ruIn').value = ''; S.sub.rules = 'calc'; setScene('rules'); },
          check: () => solvedN() >= 4, hold: 0.6,
          status: () => '맞힌 화합물 ' + solvedN() + ' / 4 ' + mark(solvedN() >= 4),
          explain: '산화수의 합을 식으로 세우면 돼요. HNO₃ : (+1) + x + 3×(−2) = 0 → x = +5, KMnO₄ : (+1) + x + 4×(−2) = 0 → +7, K₂Cr₂O₇ : 2×(+1) + 2x + 7×(−2) = 0 → +6, SO₄²⁻ : x + 4×(−2) = −2 → +6, NH₄⁺ : x + 4×(+1) = +1 → −3.',
        },
        {
          title: 'N 화합물 눈금에 놓기', manual: true,
          goal: 'N이 들어 있는 카드 5장을 <b>N의 산화수</b> 눈금(+5 ~ −3)에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드를 눌러 선택하면 계산식이 나타나요. N₂는 홑원소 물질이고, 나머지는 O(−2)나 H(+1)를 이용해 합이 0이 되도록 x를 구해요.',
          setup() { S.sub.rules = 'scale'; scReset(); setScene('rules'); },
          check: () => scCheck(),
          status: () => '놓은 카드 ' + scPlaced() + ' / 5 &nbsp; 알맞은 칸 ' + scRight() + ' / 5',
          explain: 'NH₃ <b>−3</b> · N₂ <b>0</b> · NO <b>+2</b> · NO₂ <b>+4</b> · HNO₃ <b>+5</b>. 같은 질소 원자라도 어떤 원자와 결합했는지에 따라 산화수가 −3부터 +5까지 달라져요.',
        },
        {
          type: 'quiz', title: 'H₂O₂의 산소는 왜 −1?',
          goal: '산소의 산화수는 보통 −2예요. 그런데 과산화 수소(H₂O₂)에서는 <b>−1</b>이에요. 그 까닭은?',
          setup() { S.sub.rules = 'calc'; S.ru.cmp = 'h2o2'; setScene('rules'); },
          choices: ['H가 2개라서 O가 전자를 덜 가지기 때문이에요', 'O–O 결합의 전자쌍은 같은 원자끼리 나누므로 O가 H쪽 전자만 받아 −1이 돼요', '과산화 수소에는 산소 원자가 없어서요', 'O의 산화수는 어떤 화합물이든 −2로 같아요'],
          answer: 1,
          feedback: ['H의 산화수는 +1로 정해져 있어요. 2×(+1) + 2x = 0 에서 x가 −1이 돼요. 이 식이 O–O 결합 때문임을 설명하지는 않아요.', '', '과산화 수소 H₂O₂에는 산소 원자가 2개 있어요.', 'H₂O₂ 같은 과산화물이나 OF₂ 같은 예외가 있어요. 식으로 계산해 보세요.'],
          explain: 'H₂O₂의 H–O–O–H에서 O–O 결합의 전자쌍은 <b>같은 원자끼리 똑같이 나누므로</b> 한 O가 가져가는 전자는 H–O 결합에서 받은 1개뿐이에요. 그래서 O는 <b>−1</b>이고, 2×(+1) + 2×(−1) = 0이에요.',
        },
      ],
    },
    {
      title: '변화로 판별: 산화수가 변했나?', short: '변화로 판별', icon: '🔍', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산화수를 구하는 규칙을 익혔어요. 이제 반응 전후의 산화수를 비교하면, 눈에 보이지 않는 전자의 이동을 알 수 있어요.</div>' +
        '<p>반응식 6개에 원자마다 산화수를 붙여, 증가(빨강 ↑) · 감소(파랑 ↓) · 변화 없음(회색)을 살펴보세요. 산화수가 변한 반응만 <b>산화·환원 반응</b>이고, <b>잃은 전자 수 = 얻은 전자 수</b>를 전자 저울로 확인해요.</p>',
      features: ['judge'],
      setup() { jdInit(); jdSel(0); setScene('judge'); },
      recap: '산화수가 증가하면 산화(전자를 잃음), 감소하면 환원(전자를 얻음)이에요. 산화수 증가의 합과 감소의 합은 항상 같고 이동한 전자 수와 같아요. 산화수 변화가 없는 중화 · 앙금 반응은 산화·환원 반응이 아니에요.',
      summary: '<ul><li>산화 = 산화수 증가(전자를 잃음), 환원 = 산화수 감소(전자를 얻음) — 산화와 환원은 <b>동시에</b> 일어나요.</li><li>CH₄ + 2O₂ → CO₂ + 2H₂O : C −4 → +4(8 증가), O 0 → −2(4개 × 2 = 8 감소) → 전자 8개</li><li>Fe₂O₃ + 3CO → 2Fe + 3CO₂ : Fe +3 → 0(2개 × 3 = 6), C +2 → +4(3개 × 2 = 6) → 전자 <b>6개</b></li><li>HCl + NaOH, CaCO₃ + HCl, AgNO₃ + NaCl : 산화수 변화 없음 → 산화·환원 반응이 <b>아니에요</b>.</li></ul>',
      missions: [
        {
          title: '반응식 6개 판별하기', manual: true,
          goal: '반응식 6개 모두에 산화수를 붙이고, <b>산화·환원 반응인지</b> 판별하세요. 모두 맞히면 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“산화수 붙이기”를 누르면 원자마다 산화수가 나타나요. 산화수가 바뀐 원자가 하나라도 있으면 산화·환원 반응이에요.',
          setup() { jdInit(); jdSel(0); setScene('judge'); },
          check: () => (jdOkN() === NR ? true : '아직 판별하지 않은 반응이 ' + (NR - jdOkN()) + '개 있어요. 반응식 고르기에서 번호를 바꿔 가며 산화수를 붙이고 판별해 보세요.'),
          status: () => '판별 완료 ' + jdOkN() + ' / 6',
          explain: 'Cu + Ag⁺, CH₄ 연소, Fe₂O₃ 제련은 산화수가 변하는 산화·환원 반응이에요. 중화 반응(HCl + NaOH)과 앙금 · 기체 발생 반응(CaCO₃ + HCl, AgNO₃ + NaCl)은 모든 원자의 산화수가 그대로여서 산화·환원 반응이 아니에요.',
        },
        {
          title: 'Fe₂O₃ 제련에서 이동한 전자 수',
          goal: '<b>Fe₂O₃ + 3CO → 2Fe + 3CO₂</b> 에서 이동한 전자는 모두 몇 개일까요? 3번 반응을 골라 <b>이동한 전자 수</b> 칸에 쓰세요.',
          hint: 'Fe는 +3 → 0 으로 원자 2개가 각각 3씩 감소해요. C는 +2 → +4 로 원자 3개가 각각 2씩 증가해요. 전자 저울의 숫자와 같아요.',
          setup() { jdSel(2); S.jd.eVal[2] = NaN; $('#jdE').value = ''; $('#jdE').classList.remove('ok', 'bad'); setScene('judge'); },
          check: () => S.jd.eVal[2] === 6, hold: 0.6,
          status: () => '3번 반응의 전자 수 ' + (isNaN(S.jd.eVal[2]) ? '—' : S.jd.eVal[2] + '개') + ' ' + mark(S.jd.eVal[2] === 6),
          explain: 'Fe 2개가 각각 전자 3개를 얻으므로 2×3 = 6개, C 3개가 각각 전자 2개를 잃으므로 3×2 = 6개예요. 잃은 전자 수 = 얻은 전자 수 = <b>6개</b>예요.',
        },
        {
          type: 'quiz', title: '환원제인 까닭',
          goal: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂ 에서 CO의 C는 <b>+2 → +4</b>로 산화수가 증가해요. CO는 어떤 물질일까요?',
          setup() { jdSel(2); setScene('judge'); },
          choices: ['산화수가 증가했으니 환원된 물질이고 산화제예요', '산화수가 증가했으니 산화된 물질이고, Fe₂O₃를 환원시키는 환원제예요', '산화수가 변했으니 산화제예요 (변하는 쪽이 산화제)', 'CO는 환원되고 Fe₂O₃는 산화돼요'],
          answer: 1,
          feedback: ['산화수가 증가하면 환원이 아니라 산화예요. 환원은 산화수가 감소해요.', '', '산화수가 변하는 것만으로는 산화제인지 알 수 없어요. 증가했으면 산화, 감소했으면 환원이에요.', 'Fe는 +3 → 0 으로 감소했으니 Fe₂O₃가 환원돼요. 반대로 C는 증가해서 CO가 산화돼요.'],
          explain: 'CO는 자신이 <b>산화</b>되면서(C: +2 → +4) 상대인 Fe₂O₃를 <b>환원</b>시켜요. 그래서 CO는 <b>환원제</b>예요. 반대로 Fe₂O₃는 환원되면서(Fe: +3 → 0) CO를 산화시키는 <b>산화제</b>예요.',
        },
      ],
    },
    {
      title: '산화제의 역할: 상대에 따라 달라요', short: '산화제의 역할', icon: '🏷️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산화수가 증가한 쪽은 산화되고, 감소한 쪽은 환원되며, 둘은 동시에 일어난다는 것을 알았어요. 그렇다면 산화시키는 물질(산화제)과 환원시키는 물질(환원제)은 어떻게 정해질까요?</div>' +
        '<p>먼저 반응마다 <b>산화제 · 환원제 이름표</b>를 붙여 보세요. 그다음 <b>같은 H₂O₂ 한 병</b>을 KI 용액과 KMnO₄ 용액에 부어, 상대에 따라 역할이 달라지는 것을 확인해요.</p>',
      features: ['role'],
      setup() { ROX.forEach((r, k) => { S.rl.tags[k] = r.L.map(() => 0); }); S.rl.ex = 0; S.sub.role = 'tags'; setScene('role'); },
      recap: '산화제는 다른 물질을 산화시키고 자신은 환원되는 물질, 환원제는 자신이 산화되면서 상대를 환원시키는 물질이에요. 산화제 · 환원제는 물질마다 정해진 것이 아니라 상대에 따라 정해지는 상대적인 역할이에요.',
      summary: '<ul><li><b>산화제</b> = 상대를 산화시키고 자신은 환원(산화수 감소), <b>환원제</b> = 상대를 환원시키고 자신은 산화(산화수 증가)</li><li>Cu는 Ag⁺ 앞에서 환원제, Cu²⁺는 Zn 앞에서 산화제 — 같은 구리라도 상대가 달라지면 역할이 달라요.</li><li>H₂O₂ : I⁻와 반응하면 O −1 → −2 (<b>산화제</b>), MnO₄⁻와 반응하면 O −1 → 0 (<b>환원제</b>)</li><li>SO₂ : H₂S와 반응하면 S +4 → 0 (산화제), MnO₄⁻와 반응하면 S +4 → +6 (환원제)</li><li>산화제만, 또는 환원제만 따로 일어나는 반응은 없어요.</li></ul>',
      missions: [
        {
          title: '이름표 붙이기 4개', manual: true,
          goal: '반응 4개에서 반응하는 물질에 <b>산화제 · 환원제</b> 이름표를 붙이고 <b>✔ 확인하기</b>를 누르세요. (반응 고르기 단추로 바꿔요)',
          hint: '물질 아래의 산화수 변화를 보세요. 산화수가 늘면 환원제(자신이 산화), 줄면 산화제(자신이 환원)예요. 물질 상자를 누를 때마다 이름표가 바뀌어요.',
          setup() { ROX.forEach((r, k) => { S.rl.tags[k] = r.L.map(() => 0); }); S.rl.ex = 0; S.sub.role = 'tags'; setScene('role'); },
          check: () => roCheck(),
          status: () => '완성한 반응 ' + roDoneN() + ' / 4',
          explain: 'Cu(0 → +2)와 Zn(0 → +2)은 산화수가 증가한 <b>환원제</b>, Ag⁺(+1 → 0)와 Cu²⁺(+2 → 0)는 감소한 <b>산화제</b>예요. 같은 Cu가 Ag⁺ 앞에서는 환원제, Cu²⁺는 Zn 앞에서는 산화제예요. H₂O₂는 반응 3에서 산화제, 반응 4에서 환원제예요.',
        },
        {
          title: '같은 H₂O₂, 두 가지 역할',
          goal: '<b>H₂O₂ 병</b>의 용액을 <b>KI 용액</b>과 <b>KMnO₄ 용액</b>에 각각 부어, H₂O₂의 역할이 달라지는 것을 확인하세요.',
          hint: '“모의 실험” 활동에서 H₂O₂ 병을 고르고 두 비커에 차례로 부어요. 반응이 끝나면 비커 위에 이름표가 나타나요.',
          setup() { S.rl.seen = {}; S.sub.role = 'lab'; labBot('h2o2'); setScene('role'); },
          check: () => !!(S.rl.seen['h2o2:A'] && S.rl.seen['h2o2:B']), hold: 0.6,
          status: () => 'KI ' + mark(S.rl.seen['h2o2:A']) + ' &nbsp; KMnO₄ ' + mark(S.rl.seen['h2o2:B']),
          explain: 'KI 용액에서는 I⁻가 I₂로 산화되고 H₂O₂의 O는 −1 → −2 로 환원되어 H₂O₂가 <b>산화제</b>로 작용해요. KMnO₄ 용액에서는 MnO₄⁻(Mn +7)가 Mn²⁺로 환원되고 H₂O₂의 O는 −1 → 0 으로 산화되어 H₂O₂가 <b>환원제</b>로 작용해요.',
        },
        {
          type: 'quiz', title: '산화제 · 환원제는 정해져 있을까?',
          goal: '“환원제는 항상 환원제이고, 산화제는 항상 산화제이다.” 이 말이 <b>틀린 까닭</b>으로 알맞은 것은?',
          setup() { S.sub.role = 'lab'; setScene('role'); },
          choices: ['물질마다 산화제인지 환원제인지가 정해져 있어요', '산화제 · 환원제는 반응 상대에 따라 정해져요. 예: H₂O₂는 KI에는 산화제, KMnO₄에는 환원제', '환원제는 산화수가 감소하는 물질이에요', '산화제만 있으면 환원제 없이도 산화 반응이 일어나요'],
          answer: 1,
          feedback: ['그 말이 바로 오개념이에요. H₂O₂는 반응 상대에 따라 두 역할을 모두 했어요.', '', '환원제는 자신이 산화되므로 산화수가 증가해요. 산화수가 감소하는 쪽은 산화제예요.', '산화와 환원은 한쪽만 따로 일어나지 않고 동시에 일어나요. 산화제가 환원되려면 전자를 줄 환원제가 필요해요.'],
          explain: '“이 물질은 환원제이다”라는 말은 <b>무엇에 대해</b> 환원제인지가 있어야 해요. 같은 H₂O₂도 더 센 환원제(I⁻)를 만나면 산화제로, 더 센 산화제(MnO₄⁻)를 만나면 환원제로 작용해요. 산화와 환원은 항상 동시에 일어나요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-oxidation-number', mount: '#game', badge: '산화수 박사', homeHref: '../../index.html#hr',
    featureLabels: { ledger: '🧾 전자 장부 (Cu + Ag⁺ · H₂O)', rules: '📏 산화수 규칙 카드 · N 화합물 눈금', judge: '🔍 산화수 붙이기 · 전자 저울', role: '🏷️ 이름표 · H₂O₂ 모의 실험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  scReset();
  setScene('ledger');
  function stepAll1(dt) { stepIon(dt); stepH2o(dt); stepScale(dt); stepJudge(dt); stepLab(dt); S.ru.pop = Math.max(0, S.ru.pop - dt * 2.4); S.rl.pop.forEach((a) => a.forEach((v, i) => { a[i] = Math.max(0, v - dt * 2.4); })); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'ledger') drawLedger(t); else if (S.mode === 'rules') { if (S.sub.rules === 'calc') drawCalc(t); else drawScale(t); }
    else if (S.mode === 'judge') drawJudge(t); else if (S.sub.role === 'tags') drawTags(t); else drawLab(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, CMP, NC, RXN, ROX, BOT, lgIonG, lgH, lgPairPos, scG, scRowY, roBoxes, labG,
    lgIonGo, lgIonReset, h2oGive, h2oReset, h2oAuto, ruSetVal, solvedN, scReset, scPlaced, scRight, scCheck, jdTag, jdAnswer, jdSel, jdOkN, roTap, roRxDone, roDoneN, roSel, labPour, labBot, labReset, setSub,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
