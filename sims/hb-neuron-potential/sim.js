(function () {
  'use strict';
  const SIZE_T = [800,560], SIZE_P = [480,640], BG = '#eef3fb';
/* ===== 공통 도구 (화면 · 글자 · 그래프 · 카드 놓기 · 순서 배열 · 활동 전위 곡선) ===== */
const { $, $$, clamp, Sound } = SciSim;
const C = SciSim.color;
const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
const VW = PHONE ? SIZE_P[0] : SIZE_T[0], VH = PHONE ? SIZE_P[1] : SIZE_T[1];
const RM = SciSim.reduceMotion;
const TAU = Math.PI * 2;
const mark = (b) => (b ? '✅' : '⬜');
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mv = (v) => (v < 0 ? '−' : v > 0 ? '+' : '') + Math.abs(Math.round(v));      // 막전위 표기 (부호 포함, 정수)
let clock = 0;

const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
const ctx = view.ctx;
const D = SciSim.draw(ctx);
const parts = new SciSim.Particles();
const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
function wrap(str, maxW, size, weight) {
  ctx.save(); ctx.font = D.font(size, weight || 700);
  const out = []; let line = '';
  for (const ch of str) {
    if (ch === '\n') { out.push(line); line = ''; continue; }
    const t = line + ch;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
  }
  if (line) out.push(line);
  ctx.restore(); return out;
}
function fitSize(str, maxW, size, minS, weight) {
  ctx.save(); let s = size;
  while (s > minS) { ctx.font = D.font(s, weight || 800); if (ctx.measureText(str).width <= maxW) break; s -= 0.5; }
  ctx.restore(); return s;
}
function TF(x, y, str, maxW, size, minS, color, align, weight, extra) {
  const s = fitSize(str, maxW, size, minS, weight); T(x, y, str, s, color, align, weight, extra); return s;
}
function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
  const ls = wrap(str, maxW, size, weight || 700);
  ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
  return ls.length * lh;
}
function bgFill(top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}
let hintTimer = 0;
function showHint(msg, ms) {
  const h = $('#stageHint'); if (!h) return;
  h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
}
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
/* 이온 기호 글자: IONT(x, y, 'Na', '+', 크기, 색, 정렬) — 위 첨자를 직접 그려요 */
function IONT(x, y, base, sup, size, color, align, weight) {
  ctx.save();
  const w = weight || 800;
  ctx.font = D.font(size, w); const w1 = ctx.measureText(base).width;
  ctx.font = D.font(size * 0.68, w); const w2 = ctx.measureText(sup).width;
  const tot = w1 + w2 + 1;
  const x0 = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = D.font(size, w); ctx.fillText(base, x0, y);
  ctx.font = D.font(size * 0.68, w); ctx.fillText(sup, x0 + w1 + 1, y - size * 0.38);
  ctx.restore(); return tot;
}
/* 포인터를 현재 장면의 처리기로 넘겨요 */
let PT = null;
SciSim.pointer(view, {
  down(p, e) { return PT && PT.down ? !!PT.down(p, e) : false; },
  move(p, e) { if (PT && PT.move) PT.move(p, e); },
  up(p, e) { if (PT && PT.up) PT.up(p, e); },
  hover(p) { return PT && PT.hover ? PT.hover(p) : 'default'; },
});
function bindSeg(sel, attr, fn) {
  $$(sel + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fn(b.getAttribute(attr), b); }));
}
function setOn(sel, attr, val) { $$(sel + ' button').forEach((b) => b.classList.toggle('on', b.getAttribute(attr) === String(val))); }

/* ===== 색 · 단위 ===== */
const COL = { na: '#f59e0b', k: '#8b5cf6', ca: '#06b6d4', cl: '#22c55e', nt: '#ec4899', neg: '#3b82f6', pos: '#ef4444', exc: '#16a34a', inh: '#e2464b', bio: '#16a34a', ink: '#26324a', mut: '#5a6679' };
/* 막전위 → 막 안쪽 색 (음: 파랑 · 0: 연한 회색 · 양: 빨강) */
function vColor(v) {
  if (v < 0) return C.mix('#cfe0ff', '#3b82f6', clamp(-v / 80, 0, 1));
  return C.mix('#f1f1f1', '#ef4444', clamp(v / 30, 0, 1));
}

/* ===== 활동 전위 곡선 (수업 자료 값: 0 −70, 1 −65, 1.5 −55, 2 +30, 3 0, 4 −80, 5 −75, 6 −70) =====
   단조 3차 보간(PCHIP)이라 +30, −80을 넘지 않고 자료 점을 정확히 지나요. */
const AP_T = [0, 1, 1.5, 2, 3, 4, 5, 6], AP_V = [-70, -65, -55, 30, 0, -80, -75, -70];
const AP = (function () {
  const n = AP_T.length, h = [], d = [], m = [];
  for (let i = 0; i < n - 1; i++) { h[i] = AP_T[i + 1] - AP_T[i]; d[i] = (AP_V[i + 1] - AP_V[i]) / h[i]; }
  m[0] = 0; m[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return function (tau) {
    if (tau <= 0 || tau >= 6) return -70;
    let i = 0; while (i < n - 2 && tau > AP_T[i + 1]) i++;
    const t = (tau - AP_T[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * AP_V[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * AP_V[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
})();
const AP_CROSS = (function () { let t = 2; while (t < 6 && AP(t) > -70) t += 0.001; return t; })();      // 재분극 → 과분극 경계 (≈3.9 ms)
/* 시각 τ(ms)의 활동 전위 구간: 'rest' | 'dep' | 'rep' | 'hyp' */
function apPhase(tau) { if (tau <= 0 || tau >= 6) return 'rest'; if (tau < 2) return tau < 1 ? 'rest' : 'dep'; return tau < AP_CROSS ? 'rep' : 'hyp'; }
/* 문턱 이하 자극의 국소 반응 (최대 15 mV × 세기/40) */
const THRESH = 40;
function subV(tau, s) {
  const a = 15 * clamp(s / THRESH, 0, 1);
  if (tau <= 0) return -70;
  const h = tau < 1.5 ? smooth(tau / 1.5) : Math.exp(-(tau - 1.5) / 1.2);
  return -70 + a * h;
}
/* 이온 통로 열림 정도 (0~1) */
const rampF = (t, a, b) => smooth((t - a) / (b - a));
const naOpen = (t) => clamp(rampF(t, 1.3, 1.5) - rampF(t, 2.1, 2.6), 0, 1);
const kOpen = (t) => clamp(rampF(t, 1.9, 2.5) - rampF(t, 4.4, 5.0), 0, 1);

/* ===== 그래프 도구 ===== */
function makeAxes(r, xr, yr) {
  return { r, xr, yr, X: (v) => r.x + (v - xr[0]) / (xr[1] - xr[0]) * r.w, Y: (v) => r.y + r.h - (v - yr[0]) / (yr[1] - yr[0]) * r.h,
    ix: (px) => xr[0] + (px - r.x) / r.w * (xr[1] - xr[0]) };
}
/* 눈금 · 격자 · 축 이름. o: {xt:[], yt:[], xl, yl, xf(v), yf(v), grid:true, ys(글자 크기)} */
function drawAxes(A, o) {
  const r = A.r, fs = o.fs || 13;
  ctx.save();
  D.roundRect(r.x, r.y, r.w, r.h, 4); ctx.fillStyle = o.bg || '#fbfcfe'; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = '#e3e8f0';
  (o.xt || []).forEach((v) => { const x = A.X(v); ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); });
  (o.yt || []).forEach((v) => { const y = A.Y(v); ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); });
  ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
  const tkY = o.tickY != null ? o.tickY : r.y + r.h + fs + 4;
  (o.xt || []).forEach((v) => { const x = A.X(v); T(x, tkY, o.xf ? o.xf(v) : String(v), fs, '#3a465c', 'center', 700); });
  (o.yt || []).forEach((v) => { const y = A.Y(v); T(r.x - 6, y + fs * 0.36, o.yf ? o.yf(v) : String(v), fs, '#3a465c', 'right', 700); });
  if (o.xl) T(r.x + r.w / 2, o.xlY != null ? o.xlY : r.y + r.h + fs * 2 + 12, o.xl, fs + 1, '#26324a', 'center', 800);
  if (o.yl) { ctx.translate(r.x - (o.ylx || 46), r.y + r.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, o.yl, fs + 1, '#26324a', 'center', 800); }
  ctx.restore();
}
/* 곡선 그리기: fn(x) → y 값, x0~x1 범위, 간격 dx */
function plotFn(A, fn, x0, x1, dx, color, width, o) {
  o = o || {};
  ctx.save();
  ctx.beginPath(); ctx.rect(A.r.x, A.r.y, A.r.w, A.r.h); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = width || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); let first = true;
  for (let x = x0; x <= x1 + 1e-9; x += dx) { const px = A.X(x), py = A.Y(fn(x)); if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); }
  ctx.stroke(); ctx.restore();
}
function hline(A, v, color, label, o) {
  o = o || {};
  const y = A.Y(v);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = o.w || 1.8; ctx.setLineDash(o.dash || [6, 5]);
  ctx.beginPath(); ctx.moveTo(A.r.x, y); ctx.lineTo(A.r.x + A.r.w, y); ctx.stroke(); ctx.restore();
  if (label) T(o.lx != null ? o.lx : A.r.x + A.r.w - 6, y + (o.dy != null ? o.dy : -5), label, o.fs || 13, color, o.align || 'right', 800);
}

/* ===== 카드 그리기 ===== */
function drawChip(c) {
  ctx.save();
  const w = c.w, h = c.h, cx = c.x + w / 2, cy = c.y + h / 2;
  ctx.translate(cx, cy); const s = 1 + c.lift * 0.06; ctx.scale(s, s);
  const sh = c.shake > 0 && !RM ? Math.sin(clock * 60) * 3 * c.shake : 0; ctx.translate(sh, 0);
  const r = Math.min(12, h / 2.2);
  D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, r); ctx.fillStyle = c.bad ? '#fdeceb' : (c.sel ? '#fff8dc' : (c.fill || '#fff')); ctx.fill(); }, { blur: 5 + c.lift * 10, y: 2 + c.lift * 4 });
  ctx.strokeStyle = c.bad ? '#e2464b' : c.sel ? '#f59e0b' : C.shade(c.col || '#16a34a', 0.1); ctx.lineWidth = c.bad || c.sel ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
  let lx = -w / 2 + 8, mw = w - 16;
  if (c.icon) { T(-w / 2 + 12 + 10, 6, c.icon, 20, '#26324a', 'center', 600); lx = -w / 2 + 38; mw = w - 46; }
  if (c.sub && h >= 44) {
    TF(0, -2, c.label, mw, 14, 11.5, '#26324a', 'center', 800);
    TF(0, 15, c.sub, mw, 12, 10.5, '#5a6679', 'center', 700);
  } else {
    const sz = fitSize(c.label, mw, 14.5, 11.5, 800);
    ctx.save(); ctx.font = D.font(sz, 800);
    if (ctx.measureText(c.label).width > mw && h >= 40) {
      const ls = wrap(c.label, mw, 12.5, 800).slice(0, 2);
      ls.forEach((l, i) => T(c.icon ? lx : 0, (ls.length === 1 ? 5 : -2 + i * 15), l, 12.5, '#26324a', c.icon ? 'left' : 'center', 800));
    } else T(c.icon ? lx : 0, 5, c.label, sz, '#26324a', c.icon ? 'left' : 'center', 800);
    ctx.restore();
  }
  ctx.restore();
}

/* ===== 카드 놓기 (끌어서 칸에 놓기, 눌러서 고르고 칸 누르기) =====
   o.chips: [{id, label, sub, icon, col}]   o.targets: [{id, x, y, w, h, hit?, ans}]   o.tray(i) → {x, y}
   o.cw, o.ch: 카드 크기   o.onChange()   chip.zone = 놓인 칸 id */
class Placer {
  constructor(o) {
    this.o = o; this.drag = null; this.selId = null; this.targets = o.targets;
    this.chips = o.chips.map((d, i) => { const p = o.tray(i); return Object.assign({}, d, { x: p.x, y: p.y, w: o.cw, h: o.ch, zone: null, lift: 0, bad: false, shake: 0, home: p, sel: false }); });
  }
  targetAt(p) {
    let best = null, bd = 1e9;
    for (const t of this.targets) {
      const hr = t.hit || t;
      if (inRect(p.x, p.y, { x: hr.x - 4, y: hr.y - 4, w: hr.w + 8, h: hr.h + 8 })) { const d = Math.hypot(p.x - (hr.x + hr.w / 2), p.y - (hr.y + hr.h / 2)); if (d < bd) { bd = d; best = t; } }
    }
    return best;
  }
  occ(t) { return this.chips.find((c) => c.zone === t.id) || null; }
  slotOf(c) { return this.targets.find((t) => t.id === c.zone) || null; }
  moveTo(c, x, y, instant) {
    if (instant || RM) { c.x = x; c.y = y; return; }
    SciSim.tween(c, { x, y }, { duration: 0.35, ease: 'outBack' });
  }
  layout(instant) {
    this.chips.forEach((c) => {
      if (this.drag && this.drag.c === c) return;
      const t = this.slotOf(c);
      if (t) { c.w = this.o.cw; c.h = this.o.ch; this.moveTo(c, t.x + (t.w - c.w) / 2, t.y + (t.h - c.h) / 2, instant); }
      else this.moveTo(c, c.home.x, c.home.y, instant);
    });
  }
  /* 매 프레임: 놓인 카드가 움직이는 칸을 따라가게 */
  follow() {
    this.chips.forEach((c) => { if (this.drag && this.drag.c === c) return; const t = this.slotOf(c); if (t) { c.x = t.x + (t.w - c.w) / 2; c.y = t.y + (t.h - c.h) / 2; } });
  }
  place(c, t) {
    const was = c.zone;
    if (t) { const other = this.occ(t); if (other && other !== c) other.zone = was || null; c.zone = t.id; } else c.zone = null;
    c.bad = false; c.lift = 0; this.selId = null;
    this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
  }
  reset() { this.chips.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.selId = null; this.layout(); this.o.onChange && this.o.onChange(); }
  get placed() { return this.chips.filter((c) => c.zone).length; }
  get full() { return this.chips.every((c) => c.zone); }
  wrongIds() { return this.chips.filter((c) => { const t = this.slotOf(c); return !t || t.ans !== c.id; }).map((c) => c.id); }
  get solved() { return this.wrongIds().length === 0; }
  markBad(ids) { this.chips.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; }); }
  down(p) {
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const c = this.chips[i];
      if (inRect(p.x, p.y, c)) {
        SciSim.tween(c, { x: c.x, y: c.y }, { duration: 0.0001 });
        this.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
        this.chips.splice(i, 1); this.chips.push(c); Sound.tick(); return true;
      }
    }
    // 카드를 골라 둔 상태에서 빈 칸을 누르면 거기에 놓기
    if (this.selId) { const t = this.targetAt(p); if (t) { const c = this.chips.find((x) => x.id === this.selId); if (c) { this.place(c, t); return true; } } }
    return false;
  }
  move(p) {
    const d = this.drag; if (!d) return;
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
    if (d.moved) { d.c.x = clamp(p.x - d.dx, 0, VW - d.c.w); d.c.y = clamp(p.y - d.dy, 0, VH - d.c.h); this.hot = this.targetAt(p); }
  }
  up(p) {
    const d = this.drag; if (!d) return; this.drag = null; this.hot = null; const c = d.c;
    if (!d.moved) {                       // 눌렀다 뗌: 놓인 카드는 되돌리고, 아니면 고르기
      if (c.zone) { this.place(c, null); return; }
      this.selId = this.selId === c.id ? null : c.id; this.layout(); return;
    }
    const t = this.targetAt(p);
    if (t) this.place(c, t); else { c.zone = null; this.layout(); this.o.onChange && this.o.onChange(); }
  }
  hover(p) { return this.chips.some((c) => inRect(p.x, p.y, c)) ? 'grab' : 'default'; }
  update(dt) { this.chips.forEach((c) => { c.lift = SciSim.approach(c.lift, this.drag && this.drag.c === c && this.drag.moved ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); }); }
  drawTargets(style) {
    style = style || {};
    this.targets.forEach((t, i) => {
      const hot = this.hot === t || (this.selId && !this.occ(t));
      D.roundRect(t.x, t.y, t.w, t.h, 10); ctx.fillStyle = hot ? 'rgba(245,158,11,.22)' : 'rgba(255,255,255,.7)'; ctx.fill();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = hot ? '#f59e0b' : (style.col || '#9fb3a6'); ctx.lineWidth = hot ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
      if (!this.occ(t) && t.name) T(t.x + t.w / 2, t.y + t.h / 2 + 5, t.name, 13, '#8795a8', 'center', 800);
    });
  }
  drawChips() { this.chips.forEach((c) => { c.sel = this.selId === c.id; if (!(this.drag && this.drag.c === c)) drawChip(c); }); if (this.drag) drawChip(this.drag.c); }
}

/* ===== 순서 배열기 (끌어서 칸 바꾸기) =====
   o.items: [{id, label, sub, icon, col}]  o.slots: [{x, y}]  o.cw, o.ch  o.solution: [id, ...]  o.onChange() */
class Reorder {
  constructor(o) {
    this.o = o; this.n = o.items.length; this.drag = null;
    this.cards = o.items.map((d) => Object.assign({}, d, { x: 0, y: 0, w: o.cw, h: o.ch, lift: 0, bad: false, shake: 0 }));
    const sol = o.solution.map((id) => this.cards.findIndex((c) => c.id === id));
    const n = this.n; const ord = [];
    for (let s = 0; s < n; s++) ord[s] = sol[(s + 2) % n];
    if (n > 3) { const t = ord[0]; ord[0] = ord[n - 1]; ord[n - 1] = t; }
    this.order = ord; this.snap(true);
  }
  snap(instant) {
    this.order.forEach((ci, s) => {
      const c = this.cards[ci]; if (this.drag && this.drag.c === c) return; const sl = this.o.slots[s];
      if (instant || RM) { c.x = sl.x; c.y = sl.y; } else SciSim.tween(c, { x: sl.x, y: sl.y }, { duration: 0.35, ease: 'outBack' });
    });
  }
  ids() { return this.order.map((ci) => this.cards[ci].id); }
  get solved() { const a = this.ids(), s = this.o.solution; return a.every((id, i) => id === s[i]); }
  wrongIds() { const a = this.ids(), s = this.o.solution; return a.filter((id, i) => id !== s[i]); }
  markBad(ids) { this.cards.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; }); }
  clearBad() { this.cards.forEach((c) => { c.bad = false; }); }
  down(p) {
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const c = this.cards[i];
      if (inRect(p.x, p.y, c)) {
        SciSim.tween(c, { x: c.x, y: c.y }, { duration: 0.0001 });
        this.drag = { c, dx: p.x - c.x, dy: p.y - c.y, from: this.order.indexOf(i) };
        Sound.tick(); return true;
      }
    }
    return false;
  }
  move(p) { const d = this.drag; if (!d) return; d.c.x = clamp(p.x - d.dx, 0, VW - d.c.w); d.c.y = clamp(p.y - d.dy, 0, VH - d.c.h); }
  up(p) {
    const d = this.drag; if (!d) return; this.drag = null;
    let best = -1, bd = 1e9;
    this.o.slots.forEach((sl, s) => { const dd = Math.hypot(p.x - (sl.x + this.o.cw / 2), p.y - (sl.y + this.o.ch / 2)); if (dd < bd) { bd = dd; best = s; } });
    const from = d.from;
    if (best >= 0 && best !== from && bd < Math.max(this.o.cw, this.o.ch) * 1.1) {
      const t = this.order[best]; this.order[best] = this.order[from]; this.order[from] = t; Sound.click(); this.o.onChange && this.o.onChange();
    }
    this.snap();
  }
  hover(p) { return this.cards.some((c) => inRect(p.x, p.y, c)) ? 'grab' : 'default'; }
  update(dt) { this.cards.forEach((c) => { c.lift = SciSim.approach(c.lift, this.drag && this.drag.c === c ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); }); }
  drawSlots() {
    this.o.slots.forEach((sl, s) => {
      D.roundRect(sl.x, sl.y, this.o.cw, this.o.ch, 12); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = '#9fb3a6'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      T(sl.x - 12, sl.y + this.o.ch / 2 + 5, String(s + 1), 14, '#8795a8', 'right', 800);
    });
  }
  drawCards() { this.cards.forEach((c) => { if (!(this.drag && this.drag.c === c)) drawChip(c); }); if (this.drag) drawChip(this.drag.c); }
  draw() { this.drawSlots(); this.drawCards(); }
}

/* ===== 막(인지질 이중층) 그리기: y = 막 가운데, gaps = 단백질이 차지하는 [x0, x1] 구간들 ===== */
function drawBilayer(x0, x1, y, th, gaps, o) {
  o = o || {};
  const step = 11, hr = 4.6;
  ctx.save();
  // 바탕 띠
  ctx.fillStyle = o.band || 'rgba(250,214,150,.55)';
  ctx.fillRect(x0, y - th / 2, x1 - x0, th);
  for (let x = x0 + step / 2; x < x1; x += step) {
    if (gaps && gaps.some((g) => x > g[0] - 4 && x < g[1] + 4)) continue;
    ctx.strokeStyle = '#d19b50'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - 1.6, y - th / 2 + hr); ctx.lineTo(x - 1.6, y - 1.5); ctx.moveTo(x + 1.6, y - th / 2 + hr); ctx.lineTo(x + 1.6, y - 1.5);
    ctx.moveTo(x - 1.6, y + th / 2 - hr); ctx.lineTo(x - 1.6, y + 1.5); ctx.moveTo(x + 1.6, y + th / 2 - hr); ctx.lineTo(x + 1.6, y + 1.5); ctx.stroke();
    ctx.fillStyle = '#f0b45a';
    ctx.beginPath(); ctx.arc(x, y - th / 2 + hr, hr, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + th / 2 - hr, hr, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/* 이온 통로: (cx, cy)=막 가운데, open 0~1, 폭 w(통로 단백질 전체), 높이 h(막 두께+돌출) */
function drawChannel(cx, cy, w, h, open, col, o) {
  o = o || {};
  const gap = 3 + open * Math.min(14, w * 0.4), lw = (w - gap) / 2;
  ctx.save();
  const body = o.body || '#9ca9c0';
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, C.shade(body, 0.35)); g.addColorStop(1, C.shade(body, -0.2));
  ctx.fillStyle = g; ctx.strokeStyle = C.shade(body, -0.4); ctx.lineWidth = 1.6;
  D.roundRect(cx - gap / 2 - lw, cy - h / 2, lw, h, 6); ctx.fill(); ctx.stroke();
  D.roundRect(cx + gap / 2, cy - h / 2, lw, h, 6); ctx.fill(); ctx.stroke();
  // 문(게이트): 닫히면 가운데를 막는 작은 판
  if (!o.noGate) {
    const gw = Math.max(0, gap + 2) * (1 - open) + 1;
    if (open < 0.92) { ctx.fillStyle = col || '#e2464b'; ctx.globalAlpha = 1 - open * 0.8; D.roundRect(cx - Math.max(gap / 2, 3) - 1, cy - 3.5, Math.max(gap, 6) + 2, 7, 3); ctx.fill(); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}
/* 펌프: 회전 표시 */
function drawPump(cx, cy, w, h, ang, on) {
  ctx.save();
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, '#9ad6b0'); g.addColorStop(1, '#4aa56f');
  ctx.fillStyle = g; ctx.strokeStyle = '#2f7a4d'; ctx.lineWidth = 1.8;
  D.roundRect(cx - w / 2, cy - h / 2, w, h, 9); ctx.fill(); ctx.stroke();
  ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  const r = Math.min(w, h) * 0.26;
  ctx.beginPath(); ctx.arc(0, 0, r, 0.3, Math.PI * 1.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI + 0.3, Math.PI * 2.35); ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  [0.3 + Math.PI * 1.35, 0.3 + Math.PI * 2.35].forEach((a) => { ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a - 0.5) * (r + 4), Math.sin(a - 0.5) * (r + 4)); ctx.lineTo(Math.cos(a + 0.4) * (r - 4), Math.sin(a + 0.4) * (r - 4)); ctx.closePath(); ctx.fill(); });
  ctx.restore();
}
/* 이온 입자 (반짝이는 구) */
function drawIon(x, y, r, col, sym, alpha) {
  ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
  D.sphere(x, y, r, col, { gloss: true });
  if (sym) T(x, y + r * 0.42, sym, r * 1.35, '#fff', 'center', 900);
  ctx.restore();
}
/* 선택 칩 (DOM) 켜기 */
const fmtSec = (v) => v.toFixed(1);

/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 뉴런과 활동 전위 (단원 1차시)
   성취기준 [12생과02-01] 신경 세포의 구조와 기능을 이해하고, 신경 세포에서의 전도 과정을 모식도로 표현할 수 있다. (앞부분)
   ① 관찰: 뉴런 구조  ② 실험: 휴지 전위  ③ 분석: 활동 전위  ④ 분석: 역치
   ========================================================= */

/* ============ 상태 ============ */
const S = { mode: 'neuron', sub: 'label', fade: 0, nr: null, rs: null, ap: null, th: null };
let game = null;
const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
const SCENES = { neuron: '🧬 뉴런 구조', rest: '🔋 휴지 전위', ap: '⚡ 활동 전위', thr: '🎚 역치' };
const viewKey = () => (S.mode === 'neuron' ? 'neuron:' + S.sub : S.mode);
function setScene(mode) {
  if (S.mode !== mode) { S.fade = 1; parts.clear(); }
  S.mode = mode;
  $('#tbLabel').textContent = SCENES[mode];
  PT = mode === 'neuron' ? (S.sub === 'label' ? PT_NAME : PT_TYPES) : mode === 'rest' ? PT_REST : mode === 'ap' ? PT_AP : PT_THR;
  updateCtl();
}
function setSub(sub) { if (S.sub !== sub) { S.fade = 1; S.sub = sub; } setScene('neuron'); }
function updateCtl() {
  const key = viewKey();
  $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(key) < 0; });
  $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  setOn('#subSeg', 'data-sub', S.sub);
  if (S.rs) setOn('#pumpSeg', 'data-p', S.rs.pump ? 'on' : 'off');
  if (S.nr) setOn('#typeChips', 'data-t', S.nr.type);
  if (S.ap) { const sl = $('#sStim'); sl.style.setProperty('--pct', S.ap.s + '%'); $('#oStim').textContent = S.ap.s; $('#bStim').disabled = !!S.ap.run; }
  if (S.th) {
    $$('#lvChips button').forEach((b) => { const l = +b.dataset.l; b.classList.toggle('on', l === S.th.level); b.classList.toggle('done', !!S.th.rec[l].measured); });
    $('#oCount').textContent = S.th.cv; $('#bRec').disabled = !(S.th.level != null && S.th.rec[S.th.level].measured && !S.th.run);
    $('#cMinus').disabled = S.th.cv <= 0; $('#cPlus').disabled = S.th.cv >= 40;
    const all = LV.every((q) => S.th.rec[q.s].ok);
    $('#thrSum').hidden = !(all && (viewKey() === 'thr'));
  }
}
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
bindSeg('#subSeg', 'data-sub', (s) => setSub(s));

/* ================= ① 뉴런 구조 ================= */
const NG = PHONE ? { ox: 14, s: 0.62, cy: 196 } : { ox: 30, s: 1, cy: 196 };
const NP = (u, v) => ({ x: NG.ox + u * NG.s, y: NG.cy + v * NG.s });
const NCW = PHONE ? 148 : 120, NCH = PHONE ? 44 : 40;
const NAMES = [
  { id: 'dend', label: '가지 돌기', n: 1, u: [58, -53], slot: PHONE ? [8, 40] : [30, 44] },
  { id: 'soma', label: '신경 세포체', n: 2, u: [150, -41], slot: PHONE ? [164, 40] : [190, 44] },
  { id: 'axon', label: '축삭 돌기', n: 3, u: [222, 3], slot: PHONE ? [8, 300] : [130, 304] },
  { id: 'myelin', label: '말이집', n: 4, u: [378, -13], slot: PHONE ? [320, 40] : [350, 44] },
  { id: 'node', label: '랑비에 결절', n: 5, u: [424, 3], slot: PHONE ? [164, 300] : [395, 304] },
  { id: 'term', label: '축삭 말단', n: 6, u: [706, 12], slot: PHONE ? [320, 300] : [620, 304] },
];
function neuronTray(i) { return PHONE ? { x: 8 + (i % 3) * 160, y: 396 + Math.floor(i / 3) * 56 } : { x: 18 + i * 128, y: 456 }; }
function newNamer() {
  const order = [3, 0, 5, 2, 4, 1];                     // 섞어서 늘어놓기
  return new Placer({
    chips: order.map((k) => ({ id: NAMES[k].id, label: NAMES[k].label, col: '#16a34a' })),
    targets: NAMES.map((q) => ({ id: 'slot' + q.n, x: q.slot[0], y: q.slot[1], w: NCW, h: NCH, ans: q.id })),
    tray: neuronTray, cw: NCW, ch: NCH, onChange: () => { S.nr.namedOnce = true; },
  });
}
function resetNeuron() {
  S.nr = { type: null, seen: {}, namedOnce: false, namer: null };
  S.nr.namer = newNamer();
}
function neuronBody(hl) {
  const dend = [[112, -22, 85, -48, 55, -52, 7], [55, -52, 40, -60, 22, -58, 4], [55, -52, 45, -42, 25, -38, 4],
    [108, 0, 70, 2, 30, 4, 7], [30, 4, 18, -8, 6, -12, 4], [30, 4, 16, 14, 4, 18, 4],
    [112, 22, 85, 50, 55, 60, 7], [55, 60, 40, 70, 20, 70, 4], [55, 60, 48, 48, 28, 44, 4]];
  ctx.save(); ctx.translate(NG.ox, NG.cy); ctx.scale(NG.s, NG.s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // 가지 돌기
  dend.forEach((d) => { ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = d[6] + 3; ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.quadraticCurveTo(d[2], d[3], d[4], d[5]); ctx.stroke(); });
  dend.forEach((d) => { ctx.strokeStyle = '#6fc4c0'; ctx.lineWidth = d[6]; ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.quadraticCurveTo(d[2], d[3], d[4], d[5]); ctx.stroke(); });
  // 축삭 (속 줄기)
  ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(190, 0); ctx.lineTo(612, 0); ctx.stroke();
  ctx.strokeStyle = '#6fc4c0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(190, 0); ctx.lineTo(612, 0); ctx.stroke();
  // 말이집
  [246, 338, 430, 522].forEach((x0) => {
    const g = ctx.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.5, '#f8d97a'); g.addColorStop(1, '#e0ad3c');
    D.shadow(() => { D.roundRect(x0, -16, 80, 32, 14); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#c9962b'; ctx.lineWidth = 2; D.roundRect(x0, -16, 80, 32, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,150,40,.55)'; ctx.lineWidth = 1.4;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * 13.3, -14); ctx.lineTo(x0 + i * 13.3, 14); ctx.stroke(); }
  });
  // 축삭 말단 가지와 돌기
  [[612, 0, 650, -34, 690, -38], [612, 0, 660, 0, 704, 0], [612, 0, 650, 34, 690, 38]].forEach((d) => {
    ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.quadraticCurveTo(d[2], d[3], d[4], d[5]); ctx.stroke();
    ctx.strokeStyle = '#6fc4c0'; ctx.lineWidth = 4; ctx.stroke();
    D.sphere(d[4] + 7, d[5], 11, '#ff9fb4', { gloss: true });
    ctx.fillStyle = 'rgba(255,255,255,.7)'; [[-3, -3], [3, 2], [0, 5]].forEach((o) => { ctx.beginPath(); ctx.arc(d[4] + 7 + o[0], d[5] + o[1], 2, 0, TAU); ctx.fill(); });
  });
  // 세포체와 핵
  const sg = ctx.createRadialGradient(138, -14, 6, 150, 0, 46); sg.addColorStop(0, '#d8f5ec'); sg.addColorStop(0.65, '#7fcfc4'); sg.addColorStop(1, '#3f9aa0');
  D.shadow(() => { ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(150, 0, 42, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
  ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(150, 0, 42, 0, TAU); ctx.stroke();
  D.sphere(146, 2, 17, '#8d7fd4', { gloss: true });
  D.sphere(143, -1, 5, '#5a4aa8', { gloss: false });
  ctx.restore();
}
function drawNameScene(dt) {
  const R = S.nr, pl = R.namer;
  bgFill('#eaf6f1', '#f7fbf9');
  T(PHONE ? 12 : 20, PHONE ? 24 : 28, '🧬 뉴런 한 개의 구조', PHONE ? 15 : 18, '#26324a', 'left', 800);
  neuronBody();
  // 신호 방향 펄스
  const pu = ((clock * 0.2) % 1.25) * 560 + 150, pp = NP(pu, 0);
  if (pu < 700 && !RM) { D.glow(pp.x, pp.y, 20 * NG.s + 8, '#ffd447', 0.7); D.sphere(pp.x, pp.y, 5, '#ffe27a', { gloss: false }); }
  T(NP(560, 44).x, NP(560, 44).y + 8, '신호 진행 방향 →', PHONE ? 12.5 : 13.5, '#2f7f86', 'center', 800, { alpha: 0.9 });
  // 이름표 칸과 연결선
  NAMES.forEach((q) => {
    const t = pl.targets.find((x) => x.id === 'slot' + q.n);
    const tp = NP(q.u[0], q.u[1]);
    const top = t.y < NG.cy;
    const sx = t.x + t.w / 2, sy = top ? t.y + t.h : t.y;
    ctx.save(); ctx.strokeStyle = '#4b6b8a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tp.x, tp.y); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4b6b8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, TAU); ctx.fill(); ctx.stroke();
  });
  pl.drawTargets();
  pl.targets.forEach((t, i) => { D.sphere(t.x + 4, t.y + 4, 11, '#4b6b8a', { gloss: false, text: String(i + 1), textScale: 1.15 }); });
  if (pl.placed < 6) T(PHONE ? 12 : 20, PHONE ? 378 : 446, '👇 이름표를 끌어서 번호 칸에 놓아요 (눌러서 고르고 칸을 눌러도 돼요)', PHONE ? 12.5 : 14, '#5a6679', 'left', 800);
  else T(PHONE ? 12 : 20, PHONE ? 378 : 446, '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 13 : 14.5, '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
}
const PT_NAME = {
  down(p) { return S.nr.namer.down(p); }, move(p) { S.nr.namer.move(p); }, up(p) { S.nr.namer.up(p); }, hover(p) { return S.nr.namer.hover(p); },
};

/* ---- 뉴런 3종 위치 비교 ---- */
const TYPES = {
  sens: { name: '감각 뉴런', col: '#2563eb', info: '자극을 받아들여 연합 뉴런으로 신호를 보내요. 세포체가 축삭 한쪽 곁에 붙어 있어요.' },
  assoc: { name: '연합 뉴런', col: '#7c3aed', info: '뇌와 척수 같은 중추에 있어요. 신호를 받아 판단하고 운동 뉴런에 전해요. 축삭이 짧아요.' },
  motor: { name: '운동 뉴런', col: '#e11d48', info: '중추의 명령을 근육 같은 반응 기관에 전해요. 세포체가 한쪽 끝에 있고 축삭이 길어요.' },
};
const TK = PHONE ? 0.6 : 1;
const TXY = (u, v) => ({ x: (PHONE ? 6 : 14) + u * TK, y: (PHONE ? 176 : 196) + v * TK });
function typeNeuron(k, hl) {
  const col = TYPES[k].col, on = hl;
  const P = (u, v) => TXY(u, v);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts, w) => { ctx.beginPath(); pts.forEach((q, i) => { const a = P(q[0], q[1]); i ? ctx.lineTo(a.x, a.y) : ctx.moveTo(a.x, a.y); }); ctx.lineWidth = w * TK; ctx.stroke(); };
  const soma = (u, v, r) => { const a = P(u, v); D.sphere(a.x, a.y, r * TK, col, { gloss: true }); D.sphere(a.x - r * TK * 0.1, a.y, r * TK * 0.38, C.shade(col, -0.3), { gloss: false }); };
  if (on) { const g = P(k === 'sens' ? 160 : k === 'assoc' ? 330 : 520, 0); D.glow(g.x, g.y, (k === 'motor' ? 200 : 130) * TK, col, 0.22); }
  ctx.strokeStyle = col;
  if (k === 'sens') {
    line([[40, 0], [150, 0]], 6); line([[150, 0], [260, 0]], 6); line([[150, 0], [150, -34]], 5); soma(150, -52, 20);
    line([[40, 0], [18, -14]], 4); line([[40, 0], [18, 14]], 4);
    const e = P(260, 0); D.sphere(e.x, e.y, 9 * TK, col, { gloss: true });
  } else if (k === 'assoc') {
    line([[300, -4], [325, -22]], 4); line([[300, 6], [325, 24]], 4); line([[325, -22], [345, -8]], 4);
    soma(360, 0, 22); line([[382, 0], [450, 0]], 5); const e = P(452, 0); D.sphere(e.x, e.y, 8 * TK, col, { gloss: true });
  } else {
    line([[470, -6], [490, -24]], 4); line([[470, 6], [490, 24]], 4); soma(505, 0, 22);
    line([[527, 0], [700, 0]], 6); const e = P(702, 0); D.sphere(e.x, e.y, 9 * TK, col, { gloss: true });
    [[590, 0], [620, 0], [650, 0]].forEach((q) => { const a = P(q[0], q[1]); ctx.fillStyle = '#f8d97a'; D.roundRect(a.x - 14 * TK, a.y - 8 * TK, 28 * TK, 16 * TK, 6); ctx.fill(); });
  }
  ctx.restore();
}
const TYPE_BOX = { sens: [20, -86, 270, 120], assoc: [290, -50, 180, 100], motor: [460, -50, 260, 100] };
function drawTypesScene(dt) {
  const R = S.nr;
  bgFill('#eaf6f1', '#f7fbf9');
  T(PHONE ? 12 : 20, PHONE ? 24 : 28, '🧠 뉴런 3종의 세포체 위치', PHONE ? 15 : 18, '#26324a', 'left', 800);
  // 중추 신경계 상자
  const cb = TXY(284, -78), cw = 200 * TK, ch = 156 * TK;
  D.roundRect(cb.x, cb.y, cw, ch, 14); ctx.fillStyle = 'rgba(148,163,184,.18)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  T(cb.x + cw / 2, cb.y + ch - 10, '중추 (뇌·척수)', PHONE ? 12 : 13.5, '#64748b', 'center', 800);
  // 자극 · 근육
  const sk = TXY(8, 0), mu = TXY(722, 0);
  T(sk.x + 4, sk.y + 8, '🖐', PHONE ? 22 : 30, '#000', 'center', 600); T(sk.x + 4, sk.y + (PHONE ? 30 : 40), '자극', PHONE ? 12 : 13.5, '#5a6679', 'center', 800);
  T(mu.x - 2, mu.y + 8, '💪', PHONE ? 22 : 30, '#000', 'center', 600); T(mu.x - 2, mu.y + (PHONE ? 30 : 40), '반응', PHONE ? 12 : 13.5, '#5a6679', 'center', 800);
  ['sens', 'assoc', 'motor'].forEach((k) => typeNeuron(k, R.type === k));
  // 이름표
  const lab = { sens: [150, -100], assoc: [360, -60], motor: [585, -34] };
  ['sens', 'assoc', 'motor'].forEach((k) => {
    const a = TXY(lab[k][0], lab[k][1]); const on = R.type === k;
    D.label(a.x, a.y, TYPES[k].name + (R.seen[k] ? ' ✓' : ''), { bg: on ? TYPES[k].col : C.shade(TYPES[k].col, 0.2), size: PHONE ? 13 : 14.5 });
  });
  // 신호 펄스 (감각 → 연합 → 운동)
  const ph = (clock * 0.28) % 1.2;
  const pts = [[40, 0], [150, 0], [260, 0], [300, 0], [360, 0], [450, 0], [470, 0], [505, 0], [700, 0]];
  const seg = ph / 1.2 * (pts.length - 1), i0 = Math.min(pts.length - 2, Math.floor(seg)), f = seg - i0;
  const a0 = TXY(pts[i0][0], pts[i0][1]), a1 = TXY(pts[i0 + 1][0], pts[i0 + 1][1]);
  if (!RM) { const px = lerp(a0.x, a1.x, f), py = lerp(a0.y, a1.y, f); D.glow(px, py, 18, '#ffd447', 0.8); D.sphere(px, py, 5, '#ffe27a', { gloss: false }); }
  const ar = TXY(40, 100); D.arrow(ar.x, ar.y, TXY(700, 100).x, ar.y, { color: '#64748b', width: 3, label: '신호는 한 방향으로만', labelSize: PHONE ? 12 : 13.5, labelOffset: 18 });
  // 설명 상자
  const by = PHONE ? 296 : 330, bh = PHONE ? 330 : 200;
  panel(PHONE ? 8 : 14, by, VW - (PHONE ? 16 : 28), bh, 16);
  if (R.type) {
    const q = TYPES[R.type];
    D.label((PHONE ? 22 : 30), by + 28, q.name, { bg: q.col, size: PHONE ? 14.5 : 16, align: 'left' });
    textBlock((PHONE ? 22 : 30), by + 62, VW - (PHONE ? 44 : 64), q.info, PHONE ? 14 : 16, '#26324a', PHONE ? 21 : 24, 700);
    textBlock((PHONE ? 22 : 30), by + (PHONE ? 150 : 140), VW - (PHONE ? 44 : 64), '말이집이 있는 뉴런은 신호를 훨씬 빠르게 전달해요. 왜 그런지는 다음 차시 「흥분의 전도」에서 알아봐요.', PHONE ? 13 : 14.5, '#5a6679', PHONE ? 19 : 22, 700);
  } else {
    textBlock((PHONE ? 22 : 30), by + 40, VW - (PHONE ? 44 : 64), '👆 뉴런을 눌러 보세요. 세포체의 위치와 하는 일을 비교해요.', PHONE ? 14 : 16, '#5a6679', PHONE ? 21 : 24, 800);
  }
  const seen = Object.keys(R.seen).length; T(VW - (PHONE ? 20 : 34), by + bh - 14, '살펴본 뉴런 ' + seen + ' / 3', PHONE ? 12.5 : 13.5, '#5a6679', 'right', 800);
}
function typeAt(p) {
  let best = null, bd = 1e9;
  const cx = { sens: 150, assoc: 360, motor: 520 };
  ['sens', 'assoc', 'motor'].forEach((k) => {
    const a = TXY(cx[k], k === 'sens' ? -26 : 0); const d = Math.hypot(p.x - a.x, p.y - a.y);
    const lim = (k === 'motor' ? 130 : 90) * TK; if (d < lim && d < bd) { bd = d; best = k; }
  });
  return best;
}
function selectType(k) { S.nr.type = k; if (k) S.nr.seen[k] = true; Sound.click(); updateCtl(); }
const PT_TYPES = { down(p) { const k = typeAt(p); if (k) { selectType(k); return false; } return false; }, hover(p) { return typeAt(p) ? 'pointer' : 'default'; } };
bindSeg('#typeChips', 'data-t', (t) => selectType(t));
$('#bNameReset').addEventListener('click', () => { Sound.click(); S.nr.namer.reset(); });

/* ================= ② 휴지 전위 ================= */
const RG = PHONE
  ? { A: { x: 8, y: 8, w: 464, h: 318 }, memY: 150, th: 28, M: { x: 8, y: 334, w: 228, h: 118 }, B: { x: 244, y: 334, w: 228, h: 298 }, L: { x: 8, y: 460, w: 228, h: 172 }, it: { k1: 56, nag: 126, nl: 190, k2: 254, p1: 332, p2: 406 }, pw: 40 }
  : { A: { x: 14, y: 14, w: 540, h: 416 }, memY: 196, th: 30, M: { x: 568, y: 14, w: 218, h: 134 }, B: { x: 568, y: 156, w: 218, h: 274 }, L: { x: 14, y: 438, w: 772, h: 110 }, it: { k1: 78, nag: 152, nl: 222, k2: 292, p1: 384, p2: 466 }, pw: 46 };
const outY0 = () => RG.A.y + 18, outY1 = () => RG.memY - RG.th / 2 - 5, inY0 = () => RG.memY + RG.th / 2 + 5, inY1 = () => RG.A.y + RG.A.h - 10;
const IR = 7;
const NA_TOT = 32, K_TOT = 29;
const rsTargets = (g) => { const naOut = Math.round(16 + 13 * g), kIn = Math.round(14.5 + 13.5 * g); return { naOut, naIn: NA_TOT - naOut, kIn, kOut: K_TOT - kIn }; };
const rsConc = (g) => ({ naOut: Math.round(5 * (16 + 13 * g)), naIn: Math.round(5 * (16 - 13 * g)), kIn: Math.round(5 * (14.5 + 13.5 * g)), kOut: Math.round(5 * (14.5 - 13.5 * g)) });
const rsV = (g) => Math.round(-70 * g);                  // 전압계에 보이는 값 (정수 mV)
function newIon(ion, side) {
  const A = RG.A;
  const y = side === 'out' ? rnd(outY0() + IR, outY1() - IR) : rnd(inY0() + IR, inY1() - IR);
  const a = rnd(0, TAU), sp = rnd(18, 40);
  return { ion, side, x: rnd(A.x + 14, A.x + A.w - 14), y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, mode: 'free', path: null, pi: 0, wait: 0, dest: side, fx: 0 };
}
function resetRest() {
  const rs = { g: 1, pump: true, ions: [], tm: 0.3, ang: 0, busy: 0, tip: { x: RG.A.x + (PHONE ? 90 : 120), y: RG.A.y + 62 }, drag: false, tipIn: false, fx: [], atp: 0, dragHist: 0 };
  const mk = (ion, side, n) => { for (let i = 0; i < n; i++) rs.ions.push(newIon(ion, side)); };
  mk('na', 'out', 29); mk('na', 'in', 3); mk('k', 'in', 28); mk('k', 'out', 1);
  S.rs = rs;
}
const chX = (key) => RG.A.x + RG.it[key];
function rsCnt(ion, side) { return S.rs.ions.filter((p) => p.ion === ion && (p.mode === 'free' ? p.side === side : p.dest === side)).length; }
function startTransfer(ion, from, to, kind) {
  const rs = S.rs;
  if (rs.ions.filter((p) => p.ion === ion && p.mode === 'travel').length >= 2) return;
  let X, key;
  if (kind === 'pump') key = pick(['p1', 'p2']); else key = ion === 'na' ? 'nl' : pick(['k1', 'k2']);
  X = chX(key);
  const cand = rs.ions.filter((p) => p.ion === ion && p.mode === 'free' && p.side === from);
  if (!cand.length) return;
  cand.sort((a, b) => Math.abs(a.x - X) - Math.abs(b.x - X));
  const p = cand[Math.floor(Math.random() * Math.min(3, cand.length))];
  const yo = RG.memY - RG.th / 2 - 8, yi = RG.memY + RG.th / 2 + 8;
  const A = from === 'out' ? yo : yi, B = from === 'out' ? yi : yo;
  p.mode = 'travel'; p.dest = to; p.pi = 0; p.kind = kind; p.wait = 0;
  p.path = kind === 'pump' ? [{ x: X, y: A }, { x: X, y: RG.memY, wait: 0.55 }, { x: X, y: B + (from === 'out' ? 8 : -8) }] : [{ x: X, y: A }, { x: X, y: B + (from === 'out' ? 8 : -8) }];
  if (kind === 'pump') { rs.fx.push({ x: X, y: RG.memY - RG.th / 2 - 18, t: 0, txt: 'ATP' }); rs.busy = 1.2; }
}
function stepRest(dt) {
  const rs = S.rs, A = RG.A;
  // 전위 모형: 펌프가 꺼지면 농도 차가 서서히 줄고, 켜면 다시 만들어져요
  if (rs.pump) rs.g = Math.min(1, rs.g + dt * 0.16); else rs.g = Math.max(0, rs.g - dt * 0.05);
  rs.busy = Math.max(0, rs.busy - dt);
  rs.ang += dt * (rs.pump ? (rs.busy > 0 ? 3.2 : 0.9) : 0);
  // 이온 이동 일정
  rs.tm -= dt;
  if (rs.tm <= 0) {
    rs.tm = 0.2; const tg = rsTargets(rs.g);
    const no = rsCnt('na', 'out'), ki = rsCnt('k', 'in');
    if (no > tg.naOut) startTransfer('na', 'out', 'in', 'leak'); else if (no < tg.naOut && rs.pump) startTransfer('na', 'in', 'out', 'pump');
    if (ki > tg.kIn) startTransfer('k', 'in', 'out', 'leak'); else if (ki < tg.kIn && rs.pump) startTransfer('k', 'out', 'in', 'pump');
  }
  // 이온 움직임
  const L = A.x + 12, Rr = A.x + A.w - 12;
  rs.ions.forEach((p) => {
    if (p.mode === 'free') {
      const y0 = (p.side === 'out' ? outY0() : inY0()) + IR, y1 = (p.side === 'out' ? outY1() : inY1()) - IR;
      p.vx += rnd(-1, 1) * dt * 520; p.vy += rnd(-1, 1) * dt * 520;
      const sp = Math.hypot(p.vx, p.vy), tgt = clamp(sp, 16, 46); if (sp > 0) { p.vx *= tgt / sp; p.vy *= tgt / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < L) { p.x = L; p.vx = Math.abs(p.vx); } if (p.x > Rr) { p.x = Rr; p.vx = -Math.abs(p.vx); }
      if (p.y < y0) { p.y = y0; p.vy = Math.abs(p.vy); } if (p.y > y1) { p.y = y1; p.vy = -Math.abs(p.vy); }
    } else {
      if (p.wait > 0) { p.wait -= dt; return; }
      const q = p.path[p.pi], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), sp = 105 * dt;
      if (d <= sp) { p.x = q.x; p.y = q.y; if (q.wait) p.wait = q.wait; p.pi++; if (p.pi >= p.path.length) { p.mode = 'free'; p.side = p.dest; p.vx = rnd(-30, 30); p.vy = (p.dest === 'in' ? 1 : -1) * rnd(14, 30); p.path = null; } }
      else { p.x += dx / d * sp; p.y += dy / d * sp; }
    }
  });
  // 이온끼리 겹치지 않게 살짝 밀어내기
  const arr = rs.ions;
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j]; if (a.mode !== 'free' || b.mode !== 'free' || a.side !== b.side) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = IR * 2;
    if (d2 < m * m && d2 > 0.01) { const d = Math.sqrt(d2), push = (m - d) / 2; const ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; }
  }
  rs.fx.forEach((f) => { f.t += dt; }); rs.fx = rs.fx.filter((f) => f.t < 1.1);
  rs.tipIn = rs.tip.y > RG.memY + RG.th / 2 + 1;
}
function ionLabel(x, y, base, sup, tail, size, bg) {
  ctx.save(); ctx.font = D.font(size, 800);
  const w1 = ctx.measureText(base).width; ctx.font = D.font(size * 0.68, 800); const w2 = ctx.measureText(sup).width; ctx.font = D.font(size, 800); const w3 = tail ? ctx.measureText(tail).width : 0;
  const tw = w1 + w2 + w3 + 3, pad = 7, h = size + 9; ctx.restore();
  D.roundRect(x - tw / 2 - pad, y - h / 2, tw + pad * 2, h, h / 2); ctx.fillStyle = bg || 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,100,130,.35)'; ctx.lineWidth = 1; ctx.stroke();
  const t = IONT(x - tw / 2, y + size * 0.36, base, sup, size, '#26324a', 'left');
  if (tail) T(x - tw / 2 + t + 2, y + size * 0.36, tail, size, '#26324a', 'left', 800);
}
function drawRestScene(dt) {
  const rs = S.rs, A = RG.A, my = RG.memY, th = RG.th;
  bgFill('#eaf3f8', '#f6fafc');
  // 세포 밖 · 세포 안 영역
  const g1 = ctx.createLinearGradient(0, A.y, 0, my); g1.addColorStop(0, '#fff6e2'); g1.addColorStop(1, '#ffeccb');
  D.roundRect(A.x, A.y, A.w, A.h, 16); ctx.save(); ctx.clip();
  ctx.fillStyle = g1; ctx.fillRect(A.x, A.y, A.w, my - A.y);
  const g2 = ctx.createLinearGradient(0, my, 0, A.y + A.h); g2.addColorStop(0, '#e3f0ff'); g2.addColorStop(1, '#d3e6fb');
  ctx.fillStyle = g2; ctx.fillRect(A.x, my, A.w, A.y + A.h - my);
  ctx.restore();
  ctx.strokeStyle = '#c3d0df'; ctx.lineWidth = 2; D.roundRect(A.x, A.y, A.w, A.h, 16); ctx.stroke();
  T(A.x + 14, A.y + 22, '세포 밖', PHONE ? 14 : 15.5, '#a16207', 'left', 800);
  T(A.x + 14, A.y + A.h - 14, '세포 안', PHONE ? 14 : 15.5, '#1e5aa8', 'left', 800);
  // 막
  const keys = ['k1', 'nag', 'nl', 'k2'], pk = ['p1', 'p2'];
  const gaps = keys.map((k) => [chX(k) - 14, chX(k) + 14]).concat(pk.map((k) => [chX(k) - RG.pw / 2 - 2, chX(k) + RG.pw / 2 + 2]));
  drawBilayer(A.x + 3, A.x + A.w - 3, my, th, gaps);
  drawChannel(chX('k1'), my, 30, th + 8, 0.85, COL.k); drawChannel(chX('k2'), my, 30, th + 8, 0.85, COL.k);
  drawChannel(chX('nag'), my, 32, th + 8, 0, COL.na); drawChannel(chX('nl'), my, 30, th + 8, 0.3, COL.na);
  pk.forEach((k) => drawPump(chX(k), my, RG.pw, th + 10, rs.ang, rs.pump));
  // 채널 이름표 (이웃끼리 겹치지 않게 두 줄로)
  const ly = my - th / 2 - 14, ly2 = ly - 24;
  const lab = (key, row, f) => { const x = chX(key), y = row ? ly2 : ly; if (row) { ctx.strokeStyle = 'rgba(80,100,130,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y + 11); ctx.lineTo(x, ly - 8); ctx.stroke(); } f(x, y); };
  lab('k1', 0, (x, y) => ionLabel(x, y, 'K', '+', ' 누출', 13, null));
  lab('nag', 1, (x, y) => ionLabel(x, y, 'Na', '+', ' 통로', 13, null));
  lab('nl', 0, (x, y) => ionLabel(x, y, 'Na', '+', ' 누출', 13, null));
  lab('k2', 1, (x, y) => ionLabel(x, y, 'K', '+', ' 누출', 13, null));
  pk.forEach((k, i) => { lab(k, i, (x, y) => D.label(x, y, '펌프', { bg: rs.pump ? '#2f7a4d' : '#8795a8', size: 13 })); });
  T(chX('nag'), my + th / 2 + 18, '닫힘', 13, '#a16207', 'center', 800);
  // 이온 입자
  rs.ions.forEach((p) => {
    const col = p.ion === 'na' ? COL.na : COL.k;
    ctx.save(); if (p.mode === 'travel' && p.wait > 0) ctx.globalAlpha = 0.9;
    D.sphere(p.x, p.y, IR, col, { gloss: true }); ctx.restore();
    T(p.x, p.y + 4, '+', 11, '#fff', 'center', 900);
  });
  // ATP 글자
  rs.fx.forEach((f) => { const k = f.t / 1.1; T(f.x, f.y - k * 22, 'ATP', 13, '#2f7a4d', 'center', 800, { alpha: 1 - k, stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); });
  // 전극
  drawElectrodes(rs);
  // 오른쪽(또는 아래쪽) 패널: 전압계, 농도 막대, 범례
  drawMeter(rs); drawConc(rs); drawRestLegend(rs);
}
function drawElectrodes(rs) {
  const A = RG.A, tip = rs.tip, topY = A.y + 6, topX = tip.x + (tip.y - topY) * 0.34;
  // 기준 전극 (세포 밖에 고정)
  const rx = A.x + A.w - 36, ry = A.y + 34;
  ctx.save();
  ctx.strokeStyle = '#3a465c'; ctx.lineWidth = 2.5;
  if (!PHONE) { ctx.beginPath(); ctx.moveTo(rx, A.y + 4); ctx.bezierCurveTo(rx + 20, A.y - 2, RG.M.x - 8, RG.M.y + 100, RG.M.x + 12, RG.M.y + 114); ctx.stroke(); }
  D.roundRect(rx - 5, A.y + 4, 10, ry - A.y, 4); ctx.fillStyle = '#c8d3e0'; ctx.fill(); ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.5; ctx.stroke();
  D.sphere(rx, ry + 3, 5, '#9aa8bb', { gloss: false });
  T(rx, ry + 24, '기준 전극', 12.5, '#5a6679', 'center', 800);
  // 미세 전극 (유리 관)
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(topX - 6, topY); ctx.lineTo(topX + 6, topY); ctx.closePath();
  const gg = ctx.createLinearGradient(tip.x, 0, topX + 6, 0); gg.addColorStop(0, 'rgba(190,225,250,.85)'); gg.addColorStop(1, 'rgba(150,200,240,.75)');
  ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#4f7fb0'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(topX, topY); ctx.strokeStyle = '#2f5f93'; ctx.lineWidth = 1.5; ctx.stroke();
  if (!PHONE) { ctx.strokeStyle = '#3a465c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(topX, topY); ctx.bezierCurveTo(topX + 40, A.y - 4, RG.M.x - 20, RG.M.y + 60, RG.M.x + 12, RG.M.y + 98); ctx.stroke(); }
  ctx.restore();
  D.sphere(tip.x, tip.y, 4, '#2f5f93', { gloss: false });
  if (!rs.tipIn && !rs.drag) { D.ring(tip.x, tip.y, 16, clock, { color: '#f59e0b', width: 3 }); }
  T(clamp(tip.x + 14, A.x + 40, A.x + A.w - 90), clamp(tip.y - 8, A.y + 16, A.y + A.h - 6), '미세 전극', 13, '#2f5f93', 'left', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
}
function drawMeter(rs) {
  const M = RG.M;
  panel(M.x, M.y, M.w, M.h, 16);
  T(M.x + 14, M.y + 24, '🔌 전압계 (막 안 − 막 밖)', PHONE ? 13 : 14, '#26324a', 'left', 800);
  const shown = rs.tipIn ? rsV(rs.g) : 0;
  const bx = M.x + 16, bw = M.w - 32, by = M.y + M.h - 40;
  // 눈금 막대 (−90 ~ +40 mV)
  const X = (v) => bx + (v + 90) / 130 * bw;
  D.roundRect(bx, by, bw, 12, 6); ctx.fillStyle = '#e8edf5'; ctx.fill();
  const x0 = X(0), x1 = X(clamp(shown, -90, 40));
  D.roundRect(Math.min(x0, x1), by, Math.max(Math.abs(x1 - x0), 0), 12, 4); ctx.fillStyle = vColor(shown); ctx.fill();
  ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.5; [-80, -40, 0, 40].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), by + 12); ctx.lineTo(X(v), by + 18); ctx.stroke(); T(X(v), by + 32, mv(v), 12.5, '#5a6679', 'center', 700); });
  ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.moveTo(X(clamp(shown, -90, 40)), by - 3); ctx.lineTo(X(clamp(shown, -90, 40)) - 6, by - 12); ctx.lineTo(X(clamp(shown, -90, 40)) + 6, by - 12); ctx.closePath(); ctx.fill();
  T(M.x + M.w / 2, M.y + (PHONE ? 56 : 62), (shown === 0 ? '0' : mv(shown)) + ' mV', PHONE ? 26 : 30, rs.tipIn ? '#1d4ed8' : '#8795a8', 'center', 900);
  if (!rs.tipIn) T(M.x + M.w / 2, M.y + (PHONE ? 76 : 82), '전극이 세포 밖이에요', 12.5, '#a16207', 'center', 800);
}
function drawConc(rs) {
  const B = RG.B, cc = rsConc(rs.g);
  panel(B.x, B.y, B.w, B.h, 16);
  T(B.x + 14, B.y + 24, '🧪 이온 농도 (상대값)', PHONE ? 13 : 14, '#26324a', 'left', 800);
  const top = B.y + 56, bot = B.y + B.h - (PHONE ? 62 : 58), H = bot - top;      // 150 mM이 막대 영역의 높이
  const Y = (v) => bot - v / 150 * H;
  ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; [0, 50, 100, 150].forEach((v) => { ctx.beginPath(); ctx.moveTo(B.x + 36, Y(v)); ctx.lineTo(B.x + B.w - 10, Y(v)); ctx.stroke(); T(B.x + 32, Y(v) + 4, String(v), 12, '#5a6679', 'right', 700); });
  T(B.x + 12, top - 12, 'mM', 12.5, '#5a6679', 'left', 800);
  const bars = [['na', 'out', cc.naOut, '밖'], ['na', 'in', cc.naIn, '안'], ['k', 'out', cc.kOut, '밖'], ['k', 'in', cc.kIn, '안']];
  const bw = PHONE ? 36 : 34, gap = (B.w - 46 - bw * 4) / 4;
  bars.forEach((b, i) => {
    const x = B.x + 44 + gap / 2 + i * (bw + gap), h = b[2] / 150 * H, col = b[0] === 'na' ? COL.na : COL.k;
    const gr = ctx.createLinearGradient(0, bot - h, 0, bot); gr.addColorStop(0, C.shade(col, 0.25)); gr.addColorStop(1, col);
    if (h > 0) { D.roundRect(x, bot - h, bw, h, 5); ctx.fillStyle = gr; ctx.fill(); }
    T(x + bw / 2, bot - h - 6, String(b[2]), 13, '#26324a', 'center', 800);
    IONT(x + bw / 2, bot + 20, b[0] === 'na' ? 'Na' : 'K', '+', 14, col, 'center'); T(x + bw / 2, bot + 38, b[3], 13, '#26324a', 'center', 800);
  });
}
function drawRestLegend(rs) {
  const L = RG.L;
  panel(L.x, L.y, L.w, L.h, 16);
  let y = L.y + 26;
  const sz = PHONE ? 13 : 14;
  D.sphere(L.x + 22, y - 5, 7, COL.na, { gloss: true }); IONT(L.x + 36, y, 'Na', '+', sz, '#26324a', 'left'); T(L.x + 36 + 34, y, '나트륨 이온 (1개 ≈ 5 mM)', sz - 1, '#26324a', 'left', 700);
  y += PHONE ? 22 : 24;
  D.sphere(L.x + 22, y - 5, 7, COL.k, { gloss: true }); IONT(L.x + 36, y, 'K', '+', sz, '#26324a', 'left'); T(L.x + 36 + 24, y, '칼륨 이온 (1개 ≈ 5 mM)', sz - 1, '#26324a', 'left', 700);
  y += PHONE ? 24 : 26;
  const msg = rs.pump ? (rs.g >= 0.995 ? '펌프(ATP 사용)가 Na⁺을 밖으로, K⁺을 안으로 보내 농도 차를 유지해요. K⁺이 새어 나가 막 안쪽이 음(−)이에요.' : '펌프가 다시 일해서 농도 차를 만들고 있어요.') : '펌프가 멈췄어요. 이온이 농도가 낮은 쪽으로 새면서 농도 차가 줄고, 막전위가 0에 가까워져요.';
  textBlock(L.x + 14, y, L.w - 28, msg, PHONE ? 12.5 : 13.5, rs.pump ? '#3a465c' : '#b45309', PHONE ? 17 : 19, 700);
}
const PT_REST = {
  down(p) { const t = S.rs.tip; if (Math.hypot(p.x - t.x, p.y - t.y) < 36 || (Math.abs(p.x - (t.x + (t.y - p.y) * 0.34)) < 16 && p.y < t.y && p.y > t.y - 120)) { S.rs.drag = true; S.rs.dragOff = { x: t.x - p.x, y: t.y - p.y }; S.rs.touched = true; Sound.tick(); return true; } return false; },
  move(p) { const A = RG.A, rs = S.rs; if (!rs.drag) return; rs.tip.x = clamp(p.x + rs.dragOff.x, A.x + 16, A.x + A.w - 16); rs.tip.y = clamp(p.y + rs.dragOff.y, A.y + 30, A.y + A.h - 14); },
  up() {
    const rs = S.rs; rs.drag = false; const my = RG.memY, th = RG.th;
    if (Math.abs(rs.tip.y - my) < th / 2 + 8) rs.tip.y = rs.tip.y >= my ? my + th / 2 + 12 : my - th / 2 - 12;
    if (rs.tip.y > my + th / 2) { SciSim.tween(rs.tip, { y: Math.max(rs.tip.y, my + th / 2 + 12) }, { duration: 0.2 }); if (!rs.wasIn) { Sound.success(); parts.burst(rs.tip.x, rs.tip.y, { count: 10, speed: 90, size: 3, colors: ['#3b82f6', '#8b5cf6'], gravity: 80 }); } }
    rs.wasIn = rs.tip.y > my + th / 2;
  },
  hover(p) { const t = S.rs.tip; return Math.hypot(p.x - t.x, p.y - t.y) < 36 ? 'grab' : 'default'; },
};
bindSeg('#pumpSeg', 'data-p', (v) => { S.rs.pump = v === 'on'; if (!S.rs.pump) showHint('펌프가 멈췄어요. 이온이 새면서 막전위가 변하는지 지켜봐요.'); updateCtl(); });
$('#bRsReset').addEventListener('click', () => { Sound.click(); resetRest(); updateCtl(); });

/* ================= ③ 활동 전위 ================= */
const AG = PHONE
  ? { M: { x: 8, y: 8, w: 464, h: 172 }, memY: 92, th: 26, P: { x: 8, y: 188, w: 464, h: 444 }, plot: { x: 58, y: 204, w: 396, h: 190 }, rows: [400, 418], tickY: 446, xlY: 466, tray: 484, nax: 168, kax: 258, pmx: 392, lkx: 330 }
  : { M: { x: 14, y: 12, w: 772, h: 190 }, memY: 100, th: 30, P: { x: 14, y: 208, w: 772, h: 340 }, plot: { x: 84, y: 222, w: 688, h: 192 }, rows: [418, 438], tickY: 472, xlY: 492, tray: 506, nax: 230, kax: 400, pmx: 640, lkx: 520 };
const AY = [-110, 40], AXT = [0, 7];
function apAxes() { return makeAxes(AG.plot, AXT, AY); }
function newTags() {
  const A = apAxes(), by = A.Y(-84) + 1, hh = AG.plot.y + AG.plot.h - by - 3, cw = PHONE ? 118 : 118, ch = Math.min(34, hh);
  const zone = (a, b) => ({ x: A.X(a) + 3, w: A.X(b) - A.X(a) - 6 });
  const z = { dep: zone(0, 2), rep: zone(2, AP_CROSS), hyp: zone(AP_CROSS, 6) };
  const tg = ['dep', 'rep', 'hyp'].map((id) => ({ id: 'z' + id, ans: id, x: z[id].x + (z[id].w - cw) / 2, y: by, w: cw, h: ch, hit: { x: z[id].x, y: AG.plot.y, w: z[id].w, h: AG.plot.h } }));
  return new Placer({
    chips: [{ id: 'rep', label: '재분극' }, { id: 'hyp', label: '과분극' }, { id: 'dep', label: '탈분극' }].map((c) => Object.assign(c, { col: '#2563eb' })),
    targets: tg, tray: (i) => ({ x: (PHONE ? 8 : 84) + i * (cw + (PHONE ? 6 : 14)), y: AG.tray + (PHONE ? 0 : 0) }), cw, ch, onChange() {},
  });
}
function resetAP(keepS) {
  const old = S.ap; const s = keepS && old ? old.s : 60;
  S.ap = { s, t: 0, run: false, kind: null, fired: 0, flux: [], accNa: 0, accK: 0, tagMode: false, tags: newTags(), signsK: 0, done: false, last: -70 };
}
const AP_RATE = 1 / 0.7;                  // 1 ms = 0.7 s (느리게 보기)
function startStim() {
  const a = S.ap; if (a.run) return;
  a.run = true; a.t = 0; a.done = false; a.flux.length = 0;
  a.kind = a.s >= THRESH ? 'ap' : 'sub'; Sound.tick();
  updateCtl();
}
function apNow() { const a = S.ap; return a.kind === 'ap' ? AP(a.t) : a.kind === 'sub' ? subV(a.t, a.s) : -70; }
function stepAP(dt) {
  const a = S.ap;
  if (a.run) {
    a.t += dt * AP_RATE;
    if (a.kind === 'ap') {
      const n = naOpen(a.t), k = kOpen(a.t);
      a.accNa += dt * 14 * n; a.accK += dt * 12 * k;
      while (a.accNa >= 1) { a.accNa -= 1; a.flux.push({ ion: 'na', x: AG.M.x + AG.nax + rnd(-5, 5), age: 0, dx: rnd(-14, 14), dy: rnd(0, 20) }); }
      while (a.accK >= 1) { a.accK -= 1; a.flux.push({ ion: 'k', x: AG.M.x + AG.kax + rnd(-5, 5), age: 0, dx: rnd(-14, 14), dy: rnd(0, 20) }); }
    }
    const end = a.kind === 'ap' ? 7 : 6;
    if (a.t >= end) { a.t = end; a.run = false; a.done = true; if (a.kind === 'ap') { a.fired++; Sound.success(); } updateCtl(); }
  }
  a.flux.forEach((f) => { f.age += dt; }); a.flux = a.flux.filter((f) => f.age < 2.4);
}
function drawAPStrip(a) {
  const M = AG.M, my = AG.memY, th = AG.th, V = apNow();
  D.roundRect(M.x, M.y, M.w, M.h, 16); ctx.save(); ctx.clip();
  const g1 = ctx.createLinearGradient(0, M.y, 0, my); g1.addColorStop(0, '#fff6e2'); g1.addColorStop(1, '#ffeccb'); ctx.fillStyle = g1; ctx.fillRect(M.x, M.y, M.w, my - M.y);
  const inCol = C.mix(vColor(V), '#ffffff', 0.55);
  ctx.fillStyle = inCol; ctx.fillRect(M.x, my, M.w, M.y + M.h - my);
  ctx.restore();
  ctx.strokeStyle = '#c3d0df'; ctx.lineWidth = 2; D.roundRect(M.x, M.y, M.w, M.h, 16); ctx.stroke();
  const nX = M.x + AG.nax, kX = M.x + AG.kax, lX = M.x + AG.lkx, pX = M.x + AG.pmx;
  drawBilayer(M.x + 3, M.x + M.w - 3, my, th, [[nX - 16, nX + 16], [kX - 16, kX + 16], [lX - 14, lX + 14], [pX - 24, pX + 24]]);
  const nO = a.kind === 'ap' ? naOpen(a.t) : 0, kO = a.kind === 'ap' ? kOpen(a.t) : 0;
  drawChannel(nX, my, 32, th + 8, nO, COL.na); drawChannel(kX, my, 32, th + 8, kO, COL.k); drawChannel(lX, my, 28, th + 8, 0.8, COL.k);
  drawPump(pX, my, 44, th + 10, clock * 0.9, true);
  const ly = my - th / 2 - 14;
  ionLabel(nX, ly, 'Na', '+', ' 통로', 13); ionLabel(kX, ly, 'K', '+', ' 통로', 13); ionLabel(lX, ly, 'K', '+', ' 누출', 13); D.label(pX, ly, '펌프', { bg: '#2f7a4d', size: 13 });
  T(M.x + 14, M.y + 22, '세포 밖', 13.5, '#a16207', 'left', 800); T(M.x + 14, M.y + M.h - 12, '세포 안', 13.5, '#1e5aa8', 'left', 800);
  // 전하 부호 (막 바깥쪽·안쪽)
  const sA = smooth((Math.abs(V) - 6) / 24), pos = V > 0;
  if (sA > 0.02) for (let x = M.x + 24; x < M.x + M.w - 10; x += PHONE ? 30 : 36) {
    if ([nX, kX, lX, pX].some((c) => Math.abs(x - c) < 22)) continue;
    T(x, my - th / 2 - 4 - 1, pos ? '−' : '+', 19, pos ? COL.neg : COL.pos, 'center', 900, { alpha: sA * 0.9 });
    T(x, my + th / 2 + 19, pos ? '+' : '−', 19, pos ? COL.pos : COL.neg, 'center', 900, { alpha: sA * 0.9 });
  }
  // 이온 흐름
  a.flux.forEach((f) => {
    const k = f.age / 2.4, my2 = my, tt = Math.min(1, f.age / 0.55);
    let x, y;
    const x0 = f.x;
    if (f.ion === 'na') { y = my2 - th / 2 - 26 + tt * (th + 54); x = x0; if (tt >= 1) { x = x0 + f.dx * (f.age - 0.55); y = my2 + th / 2 + 26 + f.dy * (f.age - 0.55) * 0.5; } }
    else { y = my2 + th / 2 + 26 - tt * (th + 54); x = x0; if (tt >= 1) { x = x0 + f.dx * (f.age - 0.55); y = my2 - th / 2 - 26 - f.dy * (f.age - 0.55) * 0.5; } }
    ctx.save(); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; D.sphere(x, y, 7, f.ion === 'na' ? COL.na : COL.k, { gloss: true }); T(x, y + 4, '+', 11, '#fff', 'center', 900); ctx.restore();
  });
  D.label(M.x + M.w - 14, M.y + 24, '막전위 ' + mv(V) + ' mV', { bg: vColor(V) === '' ? '#26324a' : '#26324a', size: 14.5, align: 'right' });
}
function drawAPGraph(a) {
  const P = AG.P, pl = AG.plot, A = apAxes();
  panel(P.x, P.y, P.w, P.h, 16);
  drawAxes(A, { xt: [0, 1, 2, 3, 4, 5, 6, 7], yt: [-100, -80, -60, -40, -20, 0, 20, 40], yf: (v) => mv(v), xl: '시간 (ms)', yl: '막전위 (mV)', tickY: AG.tickY, xlY: AG.xlY, ylx: PHONE ? 42 : 52, fs: 13, bg: '#fbfcfe' });
  // 구간 색띠 (탈분극·재분극·과분극)
  const showZones = tagsOn();
  [[0, 2, '#fde2e2', 'dep'], [2, AP_CROSS, '#fff0cf', 'rep'], [AP_CROSS, 6, '#dbe9ff', 'hyp']].forEach((z) => {
    if (!showZones && !(a.kind === 'ap' && a.done)) return;
    ctx.fillStyle = z[2]; ctx.globalAlpha = 0.55; ctx.fillRect(A.X(z[0]), pl.y + 1, A.X(z[1]) - A.X(z[0]), pl.h - 2); ctx.globalAlpha = 1;
  });
  if (showZones) { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 1.5; [2, AP_CROSS, 6].forEach((t) => { ctx.beginPath(); ctx.moveTo(A.X(t), pl.y); ctx.lineTo(A.X(t), pl.y + pl.h); ctx.stroke(); }); ctx.restore(); }
  hline(A, -70, '#3b82f6', '휴지 전위 −70 mV', { lx: pl.x + pl.w - 6, dy: 15 });
  hline(A, -55, '#e2464b', '역치 −55 mV', { lx: pl.x + pl.w - 6, dy: -5 });
  hline(A, 30, '#8795a8', '+30 mV', { lx: pl.x + pl.w - 6, dy: 15, dash: [3, 5], w: 1.3 });
  // 곡선: 지금까지 그려진 부분
  if (a.kind) {
    const fn = a.kind === 'ap' ? AP : (t) => subV(t, a.s);
    plotFn(A, fn, 0, a.t, 0.02, a.kind === 'ap' ? '#e2464b' : '#2563eb', 3.5);
    const cx = A.X(a.t), cy = A.Y(fn(a.t));
    if (a.run) { D.glow(cx, cy, 16, '#ffd447', 0.8); D.sphere(cx, cy, 6, '#ffb400', { gloss: true }); }
    else { ctx.fillStyle = a.kind === 'ap' ? '#e2464b' : '#2563eb'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill(); }
    if (a.kind === 'ap' && a.t >= 1.5) { const x = A.X(1.5), y = A.Y(-55); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fill(); ctx.stroke(); T(x - 8, y + 20, '역치 도달', 13, '#c0392b', 'right', 800); }
    if (a.kind === 'ap' && a.t >= 2) { const x = A.X(2), y = A.Y(30); T(x + 8, y - 3, '+30 mV', 13, '#c0392b', 'left', 800); }
    if (a.kind === 'ap' && a.t >= 4) { const x = A.X(4), y = A.Y(-80); T(x + 4, y + 18, '−80 mV', 13, '#1d4ed8', 'center', 800); }
    if (a.kind === 'sub' && a.t >= 1.5) { const x = A.X(1.5), y = A.Y(subV(1.5, a.s)); T(x + 10, y - 8, '역치 미만: ' + mv(subV(1.5, a.s)) + ' mV', 13, '#1d4ed8', 'left', 800); }
  } else T(pl.x + pl.w / 2, pl.y + pl.h / 2 - 10, '⚡ 자극 주기를 눌러 보세요', 16, '#8795a8', 'center', 800);
  // 자극 표시
  if (a.kind) { const x = A.X(0.05); D.arrow(x + 1, pl.y + 26, x + 1, pl.y + 70, { color: '#f59e0b', width: 3, head: 9 }); T(x + 8, pl.y + 24, '자극', 13, '#b45309', 'left', 800); }
  // 이온 통로 타임라인 (그래프와 같은 시간 축)
  const rows = [['na', 'Na', COL.na, naOpen], ['k', 'K', COL.k, kOpen]];
  rows.forEach((r, i) => {
    const y = AG.rows[i], h = 15;
    D.roundRect(pl.x, y, pl.w, h, 4); ctx.fillStyle = '#eef1f7'; ctx.fill();
    if (a.kind === 'ap') {
      ctx.save(); ctx.beginPath(); ctx.rect(pl.x, y, pl.w, h); ctx.clip(); ctx.fillStyle = r[2]; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(A.X(0), y + h);
      for (let t = 0; t <= a.t + 1e-9; t += 0.02) ctx.lineTo(A.X(t), y + h - r[3](t) * h);
      ctx.lineTo(A.X(a.t), y + h); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = '#b7c3d6'; ctx.lineWidth = 1.2; D.roundRect(pl.x, y, pl.w, h, 4); ctx.stroke();
    { const tw = IONT(pl.x - 8 - 36, y + 13, r[1], '+', 13, r[2], 'right'); T(pl.x - 8, y + 13, '통로', 13, r[2], 'right', 800); }
  });
  if (a.kind === 'ap') { ctx.save(); ctx.strokeStyle = 'rgba(255,180,0,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.X(a.t), pl.y); ctx.lineTo(A.X(a.t), AG.rows[1] + 15); ctx.stroke(); ctx.restore(); }
  // 구간 이름표 칸
  if (showZones) {
    const pl2 = a.tags;
    pl2.drawTargets({ col: '#6b7fa8' });
    if (pl2.placed < 3) T(PHONE ? 8 : 84, AG.tray - 8, '👇 이름표를 알맞은 구간(색띠) 아래 칸에 놓아요', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800);
    pl2.update(0.016); pl2.follow(); pl2.drawChips();
  }
}
const tagsOn = () => !!(S.ap && (S.ap.tagMode || (game && game.free)));
function drawAPScene(dt) {
  const a = S.ap;
  bgFill('#eef3fb', '#f7f9fd');
  drawAPStrip(a);
  drawAPGraph(a);
  if (PHONE) {
    const msg = a.kind === 'ap' ? (a.run ? '자극이 역치를 넘어서 Na⁺ 통로가 열렸어요!' : '활동 전위가 끝났어요. 다시 자극해 볼 수 있어요.') : a.kind === 'sub' ? '자극이 약해서 역치(−55 mV)에 못 미쳤어요.' : '자극 세기를 정하고 ⚡ 자극 주기를 눌러요.';
    textBlock(14, tagsOn() ? 552 : 530, VW - 28, msg, 13.5, '#3a465c', 19, 700);
  }
  parts.update(dt); parts.draw(ctx);
}
const PT_AP = {
  down(p) { return tagsOn() ? S.ap.tags.down(p) : false; }, move(p) { S.ap.tags.move(p); }, up(p) { S.ap.tags.up(p); }, hover(p) { return tagsOn() ? S.ap.tags.hover(p) : 'default'; },
};
SciSim.bindRange($('#sStim'), $('#oStim'), (v) => String(v), (v) => { if (S.ap) { S.ap.s = v; updateCtl(); } });
$('#bStim').addEventListener('click', startStim);
$('#bApClear').addEventListener('click', () => { Sound.click(); const keep = S.ap.s; resetAP(true); S.ap.s = keep; S.ap.tagMode = tagsFlag; updateCtl(); });
let tagsFlag = false;

/* ================= ④ 역치 ================= */
const LV = [{ s: 10, ap: false, n: 0 }, { s: 30, ap: false, n: 0 }, { s: 50, ap: true, n: 5 }, { s: 70, ap: true, n: 12 }, { s: 90, ap: true, n: 20 }];
const lvOf = (s) => LV.find((q) => q.s === s);
const plateau = (s) => -70 + 15 * s / THRESH;
function resetThr() {
  const rec = {}; LV.forEach((q) => { rec[q.s] = { measured: false, ok: false }; });
  S.th = { level: null, run: false, t: 0, cv: 0, rec, bad: 0, sel: [null, null, null] };
  ['selT1', 'selT2', 'selT3'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); });
}
const TH_RATE = 1000 / 3.8;
function thV(t, q) {
  if (!q.ap) return -70 + (plateau(q.s) + 70) * (1 - Math.exp(-t / 1.5));
  const sp = 980 / q.n; const k = Math.floor((t - 20) / sp); if (k < 0 || k >= q.n) return -70;
  return AP((t - 20) - k * sp);
}
function startRun(s) {
  const th = S.th; th.level = s; th.run = true; th.t = 0; th.done = false; th.lastSpike = -1; th.cv = 0; Sound.tick(); updateCtl();
}
function stepThr(dt) {
  const th = S.th; if (!th.run) return;
  const q = lvOf(th.level), t0 = th.t; th.t = Math.min(1000, th.t + dt * TH_RATE);
  if (q.ap) { const sp = 980 / q.n; const k0 = Math.floor((t0 - 20) / sp), k1 = Math.floor((th.t - 20) / sp); if (k1 > k0 && k1 >= 0 && k1 < q.n && th.t > 20) { const A = thAxes(); parts.burst(A.X(20 + k1 * sp), A.Y(30), { count: 4, speed: 50, size: 2.2, colors: ['#ffd447', '#ffffff'], gravity: 40, life: 0.4 }); } }
  if (th.t >= 1000) { th.run = false; th.done = true; th.rec[th.level].measured = true; Sound.success(); updateCtl(); }
}
const TG = PHONE
  ? { P: { x: 8, y: 8, w: 464, h: 250 }, plot: { x: 58, y: 24, w: 396, h: 168 }, tickY: 214, xlY: 236, TB: { x: 8, y: 266, w: 464, h: 366 } }
  : { P: { x: 14, y: 12, w: 772, h: 262 }, plot: { x: 84, y: 28, w: 684, h: 182 }, tickY: 232, xlY: 254, TB: { x: 14, y: 282, w: 772, h: 266 } };
const thAxes = () => makeAxes(TG.plot, [0, 1000], [-100, 40]);
function drawThrScene(dt) {
  const th = S.th, P = TG.P, pl = TG.plot, A = thAxes(), q = th.level != null ? lvOf(th.level) : null;
  bgFill('#eef3fb', '#f7f9fd');
  panel(P.x, P.y, P.w, P.h, 16);
  drawAxes(A, { xt: [0, 200, 400, 600, 800, 1000], yt: [-100, -80, -60, -40, -20, 0, 20, 40], yf: (v) => mv(v), xl: '시간 (ms) · 1초 동안 기록', yl: '막전위 (mV)', tickY: TG.tickY, xlY: TG.xlY, ylx: PHONE ? 42 : 52, fs: 13 });
  hline(A, -55, '#e2464b', '역치 −55 mV', { lx: pl.x + pl.w - 6, dy: -5 });
  hline(A, -70, '#3b82f6', '휴지 −70 mV', { lx: pl.x + pl.w - 6, dy: 15 });
  if (q) {
    ctx.save(); ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
    ctx.strokeStyle = q.ap ? '#e2464b' : '#2563eb'; ctx.lineWidth = q.ap ? 2.4 : 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let t = 0; t <= th.t + 1e-9; t += 0.5) { const x = A.X(t), y = A.Y(thV(t, q)); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
    const cx = A.X(th.t), cy = A.Y(thV(th.t, q));
    if (th.run) { ctx.strokeStyle = 'rgba(255,180,0,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, pl.y); ctx.lineTo(cx, pl.y + pl.h); ctx.stroke(); D.sphere(cx, cy, 5, '#ffb400', { gloss: true }); }
    T(pl.x + 10, pl.y + 20, '자극 세기 ' + q.s, 14.5, '#26324a', 'left', 800);
    if (!q.ap && th.t > 40) T(pl.x + pl.w / 2, A.Y(plateau(q.s)) - 12, '역치 미만: ' + mv(plateau(q.s)) + ' mV에서 멈춰요', 13.5, '#1d4ed8', 'center', 800);
  } else T(pl.x + pl.w / 2, pl.y + pl.h / 2, '자극 세기를 골라 1초 동안 기록해 보세요', 16, '#8795a8', 'center', 800);
  // 기록표
  const TB = TG.TB;
  panel(TB.x, TB.y, TB.w, TB.h, 16);
  const cols = PHONE ? [[16, '자극 세기', 78], [96, '활동 전위', 100], [200, '최대 막전위', 124], [326, '1초당 횟수', 120]] : [[28, '자극 세기', 150], [190, '역치(40)와 비교', 170], [370, '활동 전위', 130], [510, '최대 막전위', 120], [650, '1초당 횟수', 110]];
  const hy = TB.y + 30;
  T(TB.x + 16, TB.y + 24, '📋 기록표', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
  const rh = PHONE ? 52 : 38, ty0 = TB.y + 42;
  D.roundRect(TB.x + 8, ty0, TB.w - 16, 30, 8); ctx.fillStyle = '#e8f3ec'; ctx.fill();
  cols.forEach((c) => TF(TB.x + c[0] + c[2] / 2, ty0 + 20, c[1], c[2] - 6, 13.5, 11, '#166534', 'center', 800));
  LV.forEach((r, i) => {
    const y = ty0 + 36 + i * rh, rc = th.rec[r.s], cur = th.level === r.s;
    D.roundRect(TB.x + 8, y, TB.w - 16, rh - 6, 8); ctx.fillStyle = cur ? '#fff8dc' : (i % 2 ? '#f8fafd' : '#ffffff'); ctx.fill(); ctx.strokeStyle = cur ? '#f59e0b' : '#e3e8f0'; ctx.lineWidth = cur ? 2.5 : 1.2; ctx.stroke();
    const cy = y + (rh - 6) / 2 + 5;
    const cell = (k, txt, col) => { const c = cols[k]; TF(TB.x + c[0] + c[2] / 2, cy, txt, c[2] - 6, 15, 11.5, col || '#26324a', 'center', 800); };
    cell(0, String(r.s), '#26324a');
    if (!PHONE) cell(1, r.s >= THRESH ? '역치 이상' : '역치 미만', r.s >= THRESH ? '#c0392b' : '#1d4ed8');
    const k0 = PHONE ? 1 : 2;
    cell(k0, rc.measured ? (r.ap ? '있음' : '없음') : '—', rc.measured ? (r.ap ? '#c0392b' : '#5a6679') : '#a0abbb');
    cell(k0 + 1, rc.measured ? (r.ap ? '+30 mV' : mv(plateau(r.s)) + ' mV') : '—', rc.measured ? '#26324a' : '#a0abbb');
    const cc = cols[k0 + 2];
    if (rc.ok) { TF(TB.x + cc[0] + cc[2] / 2 - 8, cy, r.n + ' 회', cc[2] - 30, 15, 11.5, '#166534', 'center', 800); D.check(TB.x + cc[0] + cc[2] - 14, cy - 5, 9, 1); }
    else cell(k0 + 2, rc.measured ? '세어 보세요' : '—', rc.measured ? '#b45309' : '#a0abbb');
  });
  if (th.cv != null && th.level != null && th.rec[th.level].measured && !th.rec[th.level].ok) {}
  parts.update(dt); parts.draw(ctx);
}
const PT_THR = {};
$('#lvChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); startRun(+b.dataset.l); });
$('#cMinus').addEventListener('click', () => { S.th.cv = Math.max(0, S.th.cv - 1); Sound.tick(); updateCtl(); });
$('#cPlus').addEventListener('click', () => { S.th.cv = Math.min(40, S.th.cv + 1); Sound.tick(); updateCtl(); });
$('#bRec').addEventListener('click', () => {
  const th = S.th; if (th.level == null) return; const q = lvOf(th.level);
  if (th.cv === q.n) { th.rec[q.s].ok = true; Sound.success(); showHint('✅ 자극 세기 ' + q.s + ': ' + q.n + '회 기록했어요!'); }
  else { Sound.fail(); th.bad++; showHint('🤔 센 횟수가 달라요. 그래프의 뾰족한 봉우리를 하나씩 세어 보세요.'); }
  updateCtl();
});

/* ---------- 읽음 칸 ---------- */
let rlast = '';
function readouts() {
  let L1, L2, L3, a, b, c;
  if (S.mode === 'neuron') {
    const R = S.nr;
    if (S.sub === 'label') { L1 = '이름표'; a = R.namer.placed + ' / 6 놓음'; L2 = '맞은 칸'; b = (6 - R.namer.wrongIds().length) + ' / 6'; L3 = '신호 방향'; c = '가지 돌기 → 축삭 말단'; }
    else { L1 = '살펴본 뉴런'; a = Object.keys(R.seen).length + ' / 3'; L2 = '고른 뉴런'; b = R.type ? TYPES[R.type].name : '—'; L3 = '신호 방향'; c = '감각 → 연합 → 운동'; }
  } else if (S.mode === 'rest') {
    const rs = S.rs, cc = rsConc(rs.g);
    L1 = '막전위'; a = rs.tipIn ? mv(rsV(rs.g)) + ' mV' : '0 mV (전극 밖)'; L2 = '펌프'; b = rs.pump ? '작동 중 (ATP 사용)' : '멈춤'; L3 = 'Na⁺ 밖 / 안'; c = cc.naOut + ' / ' + cc.naIn + ' mM';
  } else if (S.mode === 'ap') {
    const A2 = S.ap, V = apNow(); const ph = A2.kind === 'ap' ? ({ rest: '휴지', dep: '탈분극', rep: '재분극', hyp: '과분극' })[apPhase(A2.t)] : (A2.kind === 'sub' ? '역치 미만' : '휴지');
    L1 = '막전위'; a = mv(V) + ' mV'; L2 = '시각'; b = (A2.kind ? A2.t.toFixed(1) : '0.0') + ' ms'; L3 = '구간'; c = ph;
  } else {
    const th = S.th, q = th.level != null ? lvOf(th.level) : null;
    L1 = '자극 세기'; a = q ? String(q.s) : '—'; L2 = '시각'; b = q ? Math.round(th.t) + ' ms' : '—'; L3 = '막전위'; c = q ? mv(thV(th.t, q)) + ' mV' : '—';
  }
  const key = [L1, a, L2, b, L3, c].join('|');
  if (key === rlast) return; rlast = key;
  l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
}

/* ================= 미션 ================= */
const levels = [
  {
    title: '뉴런 구조: 신호는 어디서 받고 어디로 보낼까?', short: '뉴런 구조', icon: '🧬', phase: '관찰',
    intro: '<p class="si-q">❓ 탐구 질문: 신경 세포에서 전기 신호는 어떻게 만들어질까? 약한 자극과 강한 자극은 신호가 어떻게 다를까?</p>' +
      '<div class="si-link">🔗 <b>중학교에서</b> 뉴런에는 감각·연합·운동 뉴런이 있고 자극이 한 방향으로 전달된다고 배웠어요. 이번에는 <b>말이집·랑비에 결절</b>까지 포함한 구조와, 신호의 정체인 <b>막전위</b>를 알아봐요.</div>' +
      '<p>① 뉴런 구조 → ② 휴지 전위 → ③ 활동 전위 → ④ 역치 순서예요. 신호가 축삭을 따라가는 과정(전도)은 다음 차시에서 배워요.</p>',
    features: ['neuron'],
    setup() { resetNeuron(); setSub('label'); },
    recap: '뉴런은 가지 돌기에서 자극을 받아 신경 세포체를 지나 축삭 돌기를 따라 축삭 말단으로 신호를 보내요. 말이집이 있는 뉴런에서는 말이집 사이의 틈이 랑비에 결절이에요.',
    summary: '<ul><li><b>가지 돌기</b>: 다른 뉴런이나 자극을 받아들여요.</li><li><b>신경 세포체</b>: 핵이 있는 곳으로 뉴런의 생명 활동 중심이에요.</li><li><b>축삭 돌기</b>: 신호를 멀리 보내는 긴 줄기, <b>말이집</b>은 축삭을 감싼 절연체, 말이집 사이의 틈이 <b>랑비에 결절</b>이에요.</li><li><b>축삭 말단</b>: 다음 뉴런(또는 근육)에 신호를 전해요.</li><li>신호는 가지 돌기 → 세포체 → 축삭 → 축삭 말단 <b>한 방향</b>으로 가요. 말이집이 있으면 신호가 빨라요(다음 차시).</li></ul>',
    missions: [
      {
        title: '뉴런의 구조에 이름 붙이기', manual: true,
        goal: '뉴런 그림의 ①~⑥ 칸에 알맞은 이름표를 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '신경 세포체에는 핵이 있어요. 말이집(노란색) 사이의 잘록한 틈이 랑비에 결절이고, 맨 끝의 둥근 부분이 축삭 말단이에요.',
        setup() { setSub('label'); },
        check() {
          const pl = S.nr.namer;
          if (!pl.full) return '아직 놓지 않은 이름표가 ' + (6 - pl.placed) + '개 있어요. 6칸을 모두 채워 보세요.';
          const bad = pl.wrongIds(); pl.markBad(bad);
          if (bad.length) return '빨간 이름표 ' + bad.length + '개가 틀렸어요. 연결선이 가리키는 부분을 다시 살펴보세요.';
          return true;
        },
        status: () => '이름표 ' + S.nr.namer.placed + ' / 6 · 맞은 칸 ' + (6 - S.nr.namer.wrongIds().length) + ' / 6',
        explain: '<b>가지 돌기</b>는 자극을 받고, <b>신경 세포체</b>에는 핵이 있어요. 신호는 <b>축삭 돌기</b>를 따라 <b>축삭 말단</b>으로 가요. 축삭을 감싼 <b>말이집</b> 사이의 틈이 <b>랑비에 결절</b>이에요.',
      },
      {
        type: 'quiz', title: '받는 곳과 보내는 곳',
        goal: '뉴런에서 <b>자극을 받아들이는 부분</b>과 <b>신호를 멀리 보내는 부분</b>을 차례로 고르세요.',
        setup() { setSub('types'); },
        choices: ['가지 돌기 / 축삭 돌기', '축삭 돌기 / 가지 돌기', '신경 세포체 / 말이집', '축삭 말단 / 가지 돌기'],
        answer: 0,
        feedback: ['', '순서가 거꾸로예요. 신호는 가지 돌기에서 들어와 축삭을 따라 나가요.', '신경 세포체는 핵이 있는 곳이고, 말이집은 축삭을 감싸는 절연체예요. 신호를 멀리 보내는 것은 축삭 돌기예요.', '축삭 말단은 신호를 다음 세포에 건네는 곳이에요. 신호를 받는 곳은 가지 돌기예요.'],
        explain: '자극(신호)은 <b>가지 돌기</b>에서 받고, <b>축삭 돌기</b>를 따라 멀리 전달돼요. 그래서 뉴런 안에서 신호는 한 방향으로만 흘러요.',
      },
    ],
  },
  {
    title: '휴지 전위: 막 안쪽은 왜 음(−)일까?', short: '휴지 전위', icon: '🔋', phase: '실험',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 뉴런의 구조를 살펴봤어요. 이제 뉴런의 세포막에 <b>미세 전극</b>을 꽂아 막 안팎의 전위 차(<b>막전위</b>)를 재 봐요. 통합과학에서 배운 세포막의 물질 출입과 <b>ATP</b>가 여기서 다시 쓰여요.</div>' +
      '<p>자극이 없을 때의 막전위를 <b>휴지 전위</b>라고 해요. 세포 밖에는 Na⁺이 많고(밖 약 145 mM · 안 약 15 mM), 세포 안에는 K⁺이 많아요(안 약 140 mM · 밖 약 5 mM). 이 값들은 상대적인 예시 값이에요.</p>',
    features: ['rest'],
    setup() { resetRest(); setScene('rest'); },
    recap: '휴지 상태에서 뉴런의 막 안쪽은 바깥보다 약 −70 mV예요. Na⁺–K⁺ 펌프가 ATP를 써서 농도 차를 만들고 K⁺이 새어 나가서 생겨요.',
    summary: '<ul><li><b>휴지 전위</b>: 자극이 없을 때 막 안이 밖보다 약 <b>−70 mV</b>.</li><li>Na⁺은 세포 <b>밖</b>이 높고(약 145 / 15 mM), K⁺은 세포 <b>안</b>이 높아요(약 140 / 5 mM).</li><li>휴지 상태에서는 K⁺이 새어 나가는 <b>누출 통로</b>가 주로 열려 있어 막 안쪽이 음(−)이 돼요.</li><li><b>Na⁺–K⁺ 펌프</b>: ATP를 써서 Na⁺ 3개를 밖으로, K⁺ 2개를 안으로 보내 농도 차를 유지해요.</li><li>펌프가 멈추면 농도 차가 줄고 막전위가 0에 가까워져요.</li></ul>',
    missions: [
      {
        title: '−70 mV 읽기',
        goal: '미세 전극의 끝을 끌어서 세포막을 지나 <b>세포 안</b>에 넣어요. 전압계가 <b>−70 mV</b>를 보이면 성공!',
        hint: '그림 위쪽 노란 고리가 있는 전극 끝을 눌러 아래쪽(세포 안, 파란 영역)으로 끌어다 놓으세요.',
        setup() { setScene('rest'); },
        check: () => S.rs.tipIn && S.rs.pump && rsV(S.rs.g) === -70,
        hold: 0.8,
        status: () => mark(S.rs.tipIn) + ' 전극이 세포 안 &nbsp; ' + mark(S.rs.tipIn && rsV(S.rs.g) === -70) + ' 전압계 ' + (S.rs.tipIn ? mv(rsV(S.rs.g)) : '0') + ' mV',
        explain: '전극을 세포 안에 넣으면 전압계는 막 안쪽이 바깥쪽보다 <b>약 70 mV 낮은</b> 값(−70 mV)을 보여요. 이것이 <b>휴지 전위</b>예요.',
      },
      {
        title: '펌프를 끄면?',
        goal: '전극을 세포 안에 둔 채 <b>Na⁺–K⁺ 펌프를 꺼서</b> 막전위가 <b>−35 mV보다 0에 가까워질</b> 때까지 지켜보세요.',
        hint: '오른쪽 조작판에서 펌프를 끄면 이온이 새면서 농도 차가 서서히 줄어요. 10초 정도 기다려 보세요.',
        setup() { setScene('rest'); },
        check: () => !S.rs.pump && S.rs.tipIn && rsV(S.rs.g) > -35,
        hold: 0.6,
        status: () => mark(!S.rs.pump) + ' 펌프 끔 &nbsp; ' + mark(S.rs.tipIn) + ' 전극 안 &nbsp; ' + mark(!S.rs.pump && S.rs.tipIn && rsV(S.rs.g) > -35) + ' 막전위 ' + (S.rs.tipIn ? mv(rsV(S.rs.g)) : '0') + ' mV',
        explain: '펌프가 멈추면 이온이 농도가 높은 쪽에서 낮은 쪽으로 새어, <b>Na⁺·K⁺의 농도 차가 줄고 막전위가 0에 가까워져요</b>. 농도 차를 유지하는 데에는 ATP(에너지)가 필요해요.',
      },
      {
        type: 'quiz', title: '휴지 전위가 유지되는 까닭',
        goal: '뉴런이 자극을 받지 않아도 막 안쪽이 −70 mV로 유지되는 까닭은?',
        setup() { setScene('rest'); },
        choices: ['세포 안팎의 이온 농도가 같아서', 'Na⁺–K⁺ 펌프가 ATP를 써서 농도 차를 만들고, K⁺ 누출 통로로 K⁺이 새어 나가기 때문', 'Na⁺ 통로가 활짝 열려 있어서', '세포막이 모든 이온을 완전히 통과시켜서'],
        answer: 1,
        feedback: ['농도가 같으면 막전위가 0에 가까워져요. 휴지 상태에서도 농도 차가 있어요.', '', 'Na⁺ 통로는 휴지 상태에서 닫혀 있어요. 열리면 Na⁺이 들어와 막전위가 올라가요(다음 단계).', '이온은 아무 곳으로나 통과하지 못해요. 통로와 펌프가 이동을 조절해요.'],
        explain: '<b>펌프</b>가 Na⁺은 밖에, K⁺은 안에 많게 만들고, 휴지 상태에서는 <b>K⁺ 누출 통로</b>가 열려 K⁺이 새어 나가요. 양이온이 빠져나가 막 안쪽이 음(−)이 되어 약 −70 mV가 유지돼요.',
      },
    ],
  },
  {
    title: '활동 전위: 막전위가 −70에서 +30까지', short: '활동 전위', icon: '⚡', phase: '분석',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 휴지 전위(−70 mV)와 Na⁺·K⁺의 농도 차를 확인했어요. 자극이 오면 이온 <b>통로</b>가 열려서 이 농도 차에 따라 이온이 움직이고 막전위가 급격히 변해요.</div>' +
      '<p>자극을 주면 막전위가 <b>역치(약 −55 mV)</b>에 도달할 때 Na⁺ 통로가 열려요. Na⁺ 유입 → <b>탈분극</b>(+30 mV) → Na⁺ 통로 닫힘·K⁺ 통로 열림, K⁺ 유출 → <b>재분극</b> → 잠깐 <b>과분극</b>(약 −80 mV) → 휴지 전위 회복. 이 전체 변화가 <b>활동 전위</b>예요.</p>',
    features: ['ap'],
    setup() { resetAP(false); tagsFlag = false; setScene('ap'); },
    recap: '활동 전위는 역치에서 Na⁺ 통로가 열려 탈분극(+30 mV)이 일어나고, K⁺ 통로가 열려 재분극·과분극을 거쳐 휴지 전위로 돌아오는 변화예요.',
    summary: '<ul><li>자극 → 막전위가 <b>역치(약 −55 mV)</b>에 도달하면 활동 전위가 시작돼요.</li><li><b>탈분극</b>: Na⁺ 통로가 열려 Na⁺이 <b>유입</b> → 막전위가 약 +30 mV까지 올라가요.</li><li><b>재분극</b>: Na⁺ 통로가 닫히고 K⁺ 통로가 열려 K⁺이 <b>유출</b> → 막전위가 내려가요.</li><li><b>과분극</b>: 잠깐 휴지 전위(−70 mV)보다 낮아져요(약 −80 mV) → 곧 −70 mV 회복.</li><li>시간(ms) – 막전위(mV): 0 −70 → 1 −65 → 1.5 −55 → 2 +30 → 3 0 → 4 −80 → 6 −70</li></ul>',
    missions: [
      {
        title: '활동 전위 만들기',
        goal: '자극 세기를 <b>40 이상</b>으로 두고 <b>⚡ 자극 주기</b>를 눌러 활동 전위가 끝까지 그려지게 하세요.',
        hint: '자극 세기(상대값)가 역치 40 이상이어야 활동 전위가 생겨요. 슬라이더를 40보다 크게 하고 자극 주기를 눌러요.',
        setup() { tagsFlag = false; if (S.ap) S.ap.tagMode = false; setScene('ap'); },
        check: () => S.ap.fired >= 1 && !S.ap.run,
        hold: 0.5,
        status: () => mark(S.ap.s >= THRESH) + ' 자극 세기 ' + S.ap.s + ' (역치 ' + THRESH + ') &nbsp; ' + mark(S.ap.fired >= 1) + ' 활동 전위 발생',
        explain: '자극이 역치를 넘으면 <b>Na⁺ 통로</b>가 열려 Na⁺이 들어오고(탈분극, +30 mV), 곧 <b>K⁺ 통로</b>가 열려 K⁺이 나가며(재분극) −70 mV로 돌아와요. 그래프가 −70 → −55 → +30 → −80 → −70 모양이에요.',
      },
      {
        title: '구간에 이름표 붙이기', manual: true,
        goal: '그래프의 색띠 아래 칸에 <b>탈분극 · 재분극 · 과분극</b> 이름표를 알맞게 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '탈분극은 막전위가 올라가는 구간(−70 → +30), 재분극은 내려오는 구간(+30 → −70), 과분극은 −70보다 낮은 구간이에요.',
        setup() { tagsFlag = true; S.ap.tagMode = true; S.ap.tags.reset(); setScene('ap'); },
        check() {
          const pl = S.ap.tags;
          if (!pl.full) return '이름표가 ' + (3 - pl.placed) + '개 남았어요. 3개를 모두 칸에 놓아 보세요.';
          const bad = pl.wrongIds(); pl.markBad(bad);
          if (bad.length) return '빨간 이름표가 틀렸어요. 막전위가 올라가는지(탈분극), 내려오는지(재분극), −70보다 낮은지(과분극) 곡선을 보고 정해 보세요.';
          return true;
        },
        status: () => '이름표 ' + S.ap.tags.placed + ' / 3',
        explain: '막전위가 −70에서 +30으로 <b>올라가는 구간이 탈분극</b>, +30에서 −70까지 <b>내려오는 구간이 재분극</b>, 휴지 전위(−70)보다 <b>낮아지는 구간이 과분극</b>이에요.',
      },
      {
        type: 'quiz', title: 'K⁺이 나가는 구간',
        goal: '활동 전위에서 <b>K⁺이 세포 밖으로 나가며 막전위가 내려오는 구간</b>은 어느 것일까요?',
        setup() { setScene('ap'); },
        choices: ['휴지 상태', '탈분극 구간', '재분극 구간', '역치에 도달하기 전'],
        answer: 2,
        feedback: ['휴지 상태에서는 K⁺ 누출 통로만 조금 열려 있고, 막전위 변화가 없어요.', '탈분극 구간에서는 Na⁺이 들어와요. K⁺이 나가는 구간이 아니에요.', '', '역치에 도달하기 전에는 Na⁺ 통로도 K⁺ 통로도 거의 닫혀 있어요.'],
        explain: '+30 mV에서 Na⁺ 통로가 닫히고 <b>K⁺ 통로가 열려 K⁺이 밖으로 나가요</b>. 양이온이 나가서 막전위가 내려오는 구간이 <b>재분극</b>이에요(K⁺ 통로는 과분극 때까지 조금 더 열려 있어요).',
      },
    ],
  },
  {
    title: '역치: 센 자극은 더 큰 신호를 만들까?', short: '역치', icon: '🎚', phase: '분석',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자극이 역치(−55 mV)를 넘으면 활동 전위가 생긴다는 것을 확인했어요. 그럼 자극이 <b>약할 때</b>, 그리고 <b>아주 셀 때</b> 신호는 어떻게 달라질까요?</div>' +
      '<p>자극 세기(상대값) <b>10 · 30 · 50 · 70 · 90</b>을 차례로 주고 1초 동안 막전위를 기록해요. 역치에 해당하는 세기는 <b>40</b>이에요(예시). 활동 전위가 생기는지, 크기가 어떤지, <b>1초에 몇 번</b> 생기는지 기록표를 채워 봐요.</p>',
    features: ['thr'],
    setup() { resetThr(); setScene('thr'); },
    recap: '역치보다 약한 자극은 활동 전위를 만들지 못하고, 역치 이상이면 크기가 같은(+30 mV) 활동 전위가 생겨요. 자극이 셀수록 활동 전위의 크기가 아니라 횟수가 늘어요.',
    summary: '<ul><li>역치(약 −55 mV)보다 약한 자극: <b>활동 전위가 생기지 않아요</b>(자극 세기 10, 30).</li><li>역치 이상: 활동 전위가 생기고 <b>크기는 +30 mV로 일정</b>해요(<b>실무율</b>: 있거나 없거나).</li><li>자극이 셀수록 <b>활동 전위의 크기가 아니라 발생 빈도(횟수)</b>가 늘어요: 1초당 0 · 0 · 5 · 12 · 20회(예시).</li><li>같은 뉴런은 이 <b>빈도</b>로 자극의 세기를 구별해요.</li></ul>',
    missions: [
      {
        title: '기록표 채우기', manual: true,
        goal: '자극 세기 5가지를 모두 측정하고, 그래프의 활동 전위를 직접 세어 <b>횟수</b>를 기록한 뒤 결론을 고르고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '자극 세기를 눌러 1초 기록을 본 다음, 뾰족한 봉우리 수를 세어 ➕➖로 맞추고 📝 기록을 눌러요. 다섯 줄이 모두 채워지면 결론 3문장이 나타나요.',
        setup() { setScene('thr'); },
        check() {
          const th = S.th, rec = th.rec;
          const miss = LV.filter((q) => !rec[q.s].measured);
          if (miss.length) return '아직 측정하지 않은 자극 세기가 있어요: ' + miss.map((q) => q.s).join(', ');
          const nr = LV.filter((q) => !rec[q.s].ok);
          if (nr.length) return '횟수를 기록하지 않은 줄이 있어요: ' + nr.map((q) => q.s).join(', ') + ' (그래프를 보고 센 횟수를 📝 기록해요)';
          const ans = ['0', '1', '0'], ids = ['selT1', 'selT2', 'selT3']; let bad = 0;
          ids.forEach((id, i) => { const el = $('#' + id); const ok = el.value === ans[i]; el.classList.remove('ok', 'bad'); if (el.value === '') { bad++; } else { el.classList.add(ok ? 'ok' : 'bad'); if (!ok) bad++; } });
          if (bad) return '결론 문장을 모두 알맞게 골라 보세요. (기록표의 크기와 횟수 칸을 비교해 보세요)';
          return true;
        },
        status: () => '측정 ' + LV.filter((q) => S.th.rec[q.s].measured).length + ' / 5 · 횟수 기록 ' + LV.filter((q) => S.th.rec[q.s].ok).length + ' / 5',
        explain: '자극 세기 10·30은 역치(40)보다 약해 <b>활동 전위가 없고</b>, 50·70·90은 모두 <b>+30 mV로 크기가 같아요</b>. 대신 1초당 횟수가 <b>5 → 12 → 20회</b>로 늘어요.',
      },
      {
        type: 'quiz', title: '"센 자극은 더 큰 활동 전위"?',
        goal: '"자극이 셀수록 활동 전위의 크기(최대 막전위)가 더 커진다"는 말은 맞을까요?',
        setup() { setScene('thr'); },
        choices: ['맞아요. 세기에 비례해서 +30 mV보다 훨씬 커져요.', '틀려요. 역치 이상이면 활동 전위의 크기는 일정해요.', '맞아요. 하지만 역치보다 약해도 크기가 커져요.', '틀려요. 센 자극은 활동 전위를 오히려 작게 만들어요.'],
        answer: 1,
        feedback: ['기록표를 보세요. 50·70·90에서 최대 막전위는 모두 +30 mV예요.', '', '역치보다 약한 자극은 활동 전위 자체가 없어요.', '센 자극에서도 크기는 +30 mV로 같아요. 줄어들지는 않아요.'],
        explain: '활동 전위는 <b>있거나 없거나</b>(실무율)이고, 역치 이상이면 <b>크기가 일정</b>해요. 자극 세기는 크기가 아니라 <b>횟수</b>에 반영돼요.',
      },
      {
        type: 'quiz', title: '센 자극을 구별하는 방법',
        goal: '그렇다면 같은 뉴런은 <b>약한 자극(50)과 센 자극(90)</b>을 어떻게 구별할 수 있을까요?',
        setup() { setScene('thr'); },
        choices: ['활동 전위의 크기가 더 크기 때문에', '활동 전위가 1초에 생기는 횟수(빈도)가 다르기 때문에', '활동 전위가 −55 mV에서 시작하기 때문에', '구별하지 못해요'],
        answer: 1,
        feedback: ['크기는 둘 다 +30 mV로 같아요.', '', '시작하는 값(역치)은 자극 세기와 상관없이 같아요.', '횟수가 5회와 20회로 달라서 구별할 수 있어요.'],
        explain: '센 자극일수록 활동 전위가 <b>더 자주</b> 생겨요(5회 → 20회). 뇌는 이 <b>빈도</b>로 자극의 세기를 알아차려요.',
      },
    ],
  },
];

game = SciSim.game({
  simId: 'hb-neuron-potential', mount: '#game', badge: '신경 신호 박사', homeHref: '../../index.html#hb',
  featureLabels: { neuron: '🧬 뉴런 그림 · 이름표', rest: '🔋 막 단면 · 미세 전극 · 펌프 토글', ap: '⚡ 막전위–시간 그래프 · 이온 통로', thr: '🎚 자극 세기 5단계 · 기록표' },
  onFeatures() { updateCtl(); },
  levels,
});

/* ---------- 시작 ---------- */
resetNeuron(); resetRest(); resetAP(false); resetThr();
setScene('neuron');
let lastFree = false, lastMode = '';
SciSim.loop((dt, t) => {
  clock = t;
  if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
  if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
  view.apply();
  if (S.mode === 'neuron') { if (S.sub === 'label') drawNameScene(dt); else drawTypesScene(dt); }
  else if (S.mode === 'rest') { stepRest(dt); drawRestScene(dt); parts.update(dt); parts.draw(ctx); }
  else if (S.mode === 'ap') { stepAP(dt); drawAPScene(dt); }
  else { stepThr(dt); drawThrScene(dt); }
  if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,243,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
  readouts();
});

/* ---------- 디버그 (Playwright) ---------- */
window.__sim = {
  S, VW, VH, get game() { return game; }, setScene, setSub, NAMES, LV, AP, AP_CROSS, apAxes, thAxes, RG, AG, TG, rsV, rsConc, rsTargets, startStim, startRun, resetRest, resetAP, resetThr, typeAt, TXY, NP, rsCnt,
  stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'rest') stepRest(0.02); else if (S.mode === 'ap') stepAP(0.02); else if (S.mode === 'thr') stepThr(0.02); } },
};

})();
