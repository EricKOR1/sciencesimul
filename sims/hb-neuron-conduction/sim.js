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
  get full() { return this.chips.every((c) => c.zone || c.decoy); }
  wrongIds() { return this.chips.filter((c) => { const t = this.slotOf(c); if (c.decoy) return !!t; return !t || t.ans !== c.id; }).map((c) => c.id); }
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

/* 이온 이름표(알약): ionLabel(x, y, 'Na', '+', ' 통로', 크기, 배경) */
function ionLabel(x, y, base, sup, tail, size, bg) {
  ctx.save(); ctx.font = D.font(size, 800);
  const w1 = ctx.measureText(base).width; ctx.font = D.font(size * 0.68, 800); const w2 = ctx.measureText(sup).width; ctx.font = D.font(size, 800); const w3 = tail ? ctx.measureText(tail).width : 0;
  const tw = w1 + w2 + w3 + 3, pad = 7, h = size + 9; ctx.restore();
  D.roundRect(x - tw / 2 - pad, y - h / 2, tw + pad * 2, h, h / 2); ctx.fillStyle = bg || 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,100,130,.35)'; ctx.lineWidth = 1; ctx.stroke();
  const t = IONT(x - tw / 2, y + size * 0.36, base, sup, size, '#26324a', 'left');
  if (tail) T(x - tw / 2 + t + 2, y + size * 0.36, tail, size, '#26324a', 'left', 800);
}

/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 흥분의 전도 (단원 2차시)
   성취기준 [12생과02-01] 신경 세포의 구조와 기능을 이해하고, 신경 세포에서의 전도 과정을 모식도로 표현할 수 있다. (뒷부분)
   ① 모형: 국소 전류  ② 모형: 말이집 전도  ③ 분석: 속도 계산  ④ 적용: 모식도
   ========================================================= */

const S = { mode: 'local', sub: 'diagram', fade: 0, cd: null, mc: null, ca: null, sc: null };
let game = null;
const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
const SCENES = { local: '🔌 국소 전류', myelin: '💨 말이집', calc: '🧮 속도 계산', schema: '📐 모식도' };
const viewKey = () => (S.mode === 'schema' ? 'schema:' + S.sub : S.mode);
function setScene(mode) {
  if (S.mode !== mode) { S.fade = 1; parts.clear(); }
  S.mode = mode;
  $('#tbLabel').textContent = SCENES[mode];
  PT = mode === 'local' ? PT_LOCAL : mode === 'myelin' ? null : mode === 'calc' ? PT_CALC : (S.sub === 'diagram' ? PT_SCHEMA : null);
  updateCtl();
}
function setSub(sub) { if (S.sub !== sub) { S.fade = 1; S.sub = sub; } setScene('schema'); }
function updateCtl() {
  const key = viewKey();
  $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(key) < 0; });
  $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  setOn('#subSeg', 'data-sub', S.sub);
  if (S.cd) {
    setOn('#locSeg', 'data-loc', S.cd.loc);
    const cd = S.cd; $('#bCap').disabled = !!cd.frozen; $('#bCap').textContent = cd.capPending ? '📸 포착하는 중…' : '📸 순간 포착';
    $('#capSel').hidden = !(cd.cap && viewKey() === 'local');
    $('#bResume').hidden = !cd.frozen;
  }
  if (S.mc) { setOn('#dmgSeg', 'data-d', S.mc.dmg); $('#bRace').disabled = !!S.mc.run; }
  if (S.ca) {
    setOn('#caseSeg', 'data-c', S.ca.id);
    $('#relSum').hidden = !(CASES.every((c) => S.ca.rows[c.id]) && viewKey() === 'calc');
  }
  if (S.sc) { setOn('#snapSeg', 'data-s', S.sc.snap); $('#timeBox').hidden = viewKey() !== 'schema:time'; }
}
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
bindSeg('#subSeg', 'data-sub', (s) => setSub(s));

/* ================= ① 국소 전류 (축삭 7구간) ================= */
const NSEG = 7, DELTA = 1.5, CD_RATE = 2;            // 이웃 구간이 역치에 닿기까지 1.5 ms · 1 ms = 0.5 s
const LG = PHONE
  ? { x0: 12, sw: 65, cy: 112, hh: 30, TR: { x: 8, y: 214, w: 464, h: 322 }, r0: 246, rh: 34, px: 76, pw: 388, tickY: 502, xlY: 522, LEG: { x: 8, y: 546, w: 464, h: 86 } }
  : { x0: 40, sw: 102, cy: 122, hh: 36, TR: { x: 14, y: 274, w: 772, h: 274 }, r0: 288, rh: 27, px: 90, pw: 676, tickY: 497, xlY: 518, LEG: { x: 14, y: 226, w: 772, h: 42 } };
const segX = (i) => LG.x0 + (i + 0.5) * LG.sw;
const TMAX = 20;
const cdX = (t) => LG.px + t / TMAX * LG.pw;
const segState = (s) => (s.tau == null || s.tau < 1.5 ? 'pol' : s.tau < 2 ? 'dep' : 'rep');
const STNAME = { pol: '분극', dep: '탈분극', rep: '재분극' };
function newCD(keepLoc) {
  const hist = []; for (let i = 0; i < NSEG; i++) hist.push(new Array(TMAX * 10 + 1).fill(null));
  return { seg: Array.from({ length: NSEG }, () => ({ tau: null, trig: false })), ts: 0, hist, origin: null, reached: false, loc: keepLoc || 'left', frozen: false, capPending: false, cap: null, maxFired: -1, nStim: 0, fired: new Array(NSEG).fill(false), shown: -1 };
}
function resetCD() { S.cd = newCD(S.cd && S.cd.loc); ['selCapA', 'selCapB', 'selCapC'].forEach((id) => { const e = $('#' + id); e.value = ''; e.classList.remove('ok', 'bad'); }); updateCtl(); }
const LOCI = { left: 0, mid: 3, right: 6 };
const activeSegs = () => S.cd.seg.filter((s) => s.tau != null).length;
function stimulate(i) {
  const cd = S.cd;
  if (cd.frozen) { showHint('지금은 포착한 장면을 보는 중이에요. ▶ 다시 재생을 눌러요.'); return; }
  if (cd.seg[i].tau != null) { showHint('이 구간은 방금 흥분해서 활동 중이에요. 잠깐 기다려요.'); return; }
  if (activeSegs() === 0 && cd.ts > 0) { const loc = cd.loc; S.cd = newCD(loc); }
  const c = S.cd; if (c.origin == null) c.origin = i;
  c.seg[i] = { tau: 0, trig: false }; c.nStim++; Sound.tick();
  parts.burst(segX(i), LG.cy, { count: 8, speed: 90, size: 3, colors: ['#ffd447', '#ffffff'], gravity: 0, life: 0.5 });
  updateCtl();
}
function stepCD(dt) {
  const cd = S.cd; if (cd.frozen) return;
  let rem = dt * CD_RATE;
  if (activeSegs() === 0) { return; }
  while (rem > 1e-9) {
    const h = Math.min(0.05, rem); rem -= h; cd.ts += h;
    const k = Math.round(cd.ts * 10);
    const trigList = [];
    cd.seg.forEach((s, i) => {
      if (s.tau == null) return;
      s.tau += h;
      if (!s.trig && s.tau >= DELTA) { s.trig = true; trigList.push(i); cd.fired[i] = true; cd.maxFired = Math.max(cd.maxFired, i); }
      if (s.tau >= 6) { s.tau = null; s.trig = false; }
    });
    trigList.forEach((i) => {
      if (i === NSEG - 1 && cd.origin === 0) cd.reached = true;
      [i - 1, i + 1].forEach((n) => { if (n >= 0 && n < NSEG && cd.seg[n].tau == null) cd.seg[n] = { tau: 0, trig: false }; });
    });
    if (k <= TMAX * 10) cd.seg.forEach((s, i) => { cd.hist[i][k] = s.tau == null ? -70 : AP(s.tau); });
    if (capCond()) { if (cd.capPending) doCapture(); }
    if (activeSegs() === 0) break;
  }
}
function capCond() { const st = S.cd.seg.map(segState); return st.indexOf('dep') >= 0 && st.indexOf('rep') >= 0 && st.indexOf('pol') >= 0; }
function startCapture() {
  const cd = S.cd; if (cd.frozen) return;
  if (activeSegs() === 0) { showHint('먼저 ⚡ 자극 주기로 신호를 보낸 뒤 포착해요.'); return; }
  cd.capPending = true; updateCtl();
}
function doCapture() {
  const cd = S.cd; cd.capPending = false; cd.frozen = true;
  const st = cd.seg.map(segState), pick1 = (k) => { const a = st.map((q, i) => (q === k ? i : -1)).filter((i) => i >= 0); return a[Math.floor(Math.random() * a.length)]; };
  const ids = [pick1('pol'), pick1('dep'), pick1('rep')].sort((a, b) => a - b);
  cd.cap = ids.map((i, n) => ({ seg: i, letter: 'ABC'[n], truth: st[i] }));
  Sound.success(); updateCtl();
}
function resumeCD() { const cd = S.cd; cd.frozen = false; cd.cap = null; cd.capPending = false; ['selCapA', 'selCapB', 'selCapC'].forEach((id) => { const e = $('#' + id); e.value = ''; e.classList.remove('ok', 'bad'); }); Sound.click(); updateCtl(); }
function curArrowSeg(x1, x2, y, ok, k) {
  if (ok) {
    D.arrow(x1, y, x2, y, { color: '#f59e0b', width: 4, head: 11, dash: [8, 5] });
    ctx.save(); ctx.strokeStyle = 'rgba(245,158,11,.75)'; ctx.lineWidth = 2.2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -clock * 40;
    const mx = (x1 + x2) / 2; ctx.beginPath(); ctx.moveTo(x2, LG.cy - LG.hh - 8); ctx.quadraticCurveTo(mx, LG.cy - LG.hh - 40, x1, LG.cy - LG.hh - 8); ctx.stroke(); ctx.restore();
  } else {
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo((x1 + x2) / 2, y); ctx.stroke(); ctx.restore();
    const bx = (x1 + x2) / 2; D.sphere(bx, y, 10, '#e2464b', { gloss: false, text: '✕', textScale: 1.0 });
  }
}
function drawTube(x0, cy, hh, w, n, cells) {
  // 안쪽 색 · 막(위·아래 띠) · 구간 경계
  const sw = w / n;
  ctx.save();
  D.roundRect(x0, cy - hh, w, hh * 2, 14); ctx.clip();
  cells.forEach((c, i) => { ctx.fillStyle = C.mix(vColor(c), '#ffffff', 0.38); ctx.fillRect(x0 + i * sw, cy - hh, sw + 0.5, hh * 2); });
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,120,50,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * sw, cy - hh + 5); ctx.lineTo(x0 + i * sw, cy + hh - 5); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.strokeStyle = '#e0a550'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + 10, cy - hh); ctx.lineTo(x0 + w - 10, cy - hh); ctx.moveTo(x0 + 10, cy + hh); ctx.lineTo(x0 + w - 10, cy + hh); ctx.stroke();
  ctx.strokeStyle = '#b97a2a'; ctx.lineWidth = 1.5; D.roundRect(x0, cy - hh - 3, w, hh * 2 + 6, 16); ctx.stroke();
}
function drawLocalScene(dt) {
  const cd = S.cd, cy = LG.cy, hh = LG.hh;
  bgFill('#eef3fb', '#f7f9fd');
  T(PHONE ? 12 : 20, PHONE ? 22 : 28, '🔌 축삭을 7구간으로 나눈 모형 (구간을 눌러 자극해요)', PHONE ? 13.5 : 16, '#26324a', 'left', 800);
  const Vs = cd.seg.map((s) => (s.tau == null ? -70 : AP(s.tau)));
  drawTube(LG.x0, cy, hh, LG.sw * NSEG, NSEG, Vs);
  // 전하 부호 (안쪽 · 바깥쪽)
  Vs.forEach((V, i) => {
    const a = smooth((Math.abs(V) - 6) / 24), pos = V > 0, x = segX(i);
    if (a > 0.02) { T(x, cy + 8, pos ? '+' : '−', PHONE ? 22 : 28, pos ? '#b91c1c' : '#1d4ed8', 'center', 900, { alpha: a * 0.9 }); T(x, cy - hh - 6, pos ? '−' : '+', 18, pos ? COL.neg : COL.pos, 'center', 900, { alpha: a * 0.85 }); T(x, cy + hh + 18, pos ? '−' : '+', 18, pos ? COL.neg : COL.pos, 'center', 900, { alpha: a * 0.85 }); }
    else { T(x, cy + 8, '−', PHONE ? 22 : 28, '#1d4ed8', 'center', 900, { alpha: 0.4 }); T(x, cy - hh - 6, '+', 16, COL.pos, 'center', 900, { alpha: 0.35 }); T(x, cy + hh + 18, '+', 16, COL.pos, 'center', 900, { alpha: 0.35 }); }
  });
  // 구간 번호 · 방향 이름
  for (let i = 0; i < NSEG; i++) { const x = segX(i); D.sphere(x, cy + hh + 34, 11, '#64748b', { gloss: false, text: String(i + 1), textScale: 1.1 }); }
  T(LG.x0, cy + hh + 58, '← 가지 돌기 쪽', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800); T(LG.x0 + LG.sw * NSEG, cy + hh + 58, '축삭 말단 쪽 →', PHONE ? 12.5 : 13.5, '#5a6679', 'right', 800);
  // 국소 전류 화살표
  cd.seg.forEach((s, i) => {
    if (s.tau == null || s.tau < 1.7 || s.tau > 3.3) return;
    [-1, 1].forEach((d) => {
      const n = i + d; if (n < 0 || n >= NSEG) return; const sn = cd.seg[n];
      const x1 = segX(i) + d * 22, x2 = segX(n) - d * 22;
      if (sn.tau == null || sn.tau < s.tau - 0.01) curArrowSeg(x1, x2, cy - 12, true);
      else curArrowSeg(x1, x2, cy - 12, false);
    });
  });
  // 포착 이름표
  if (cd.cap) cd.cap.forEach((c) => { const x = segX(c.seg); D.sphere(x, cy - hh - 34, 15, '#7c3aed', { gloss: true, text: c.letter, textScale: 1.1 }); D.arrow(x, cy - hh - 18, x, cy - hh - 4, { color: '#7c3aed', width: 3, head: 7 }); });
  if (cd.frozen) D.label(VW / 2, PHONE ? 214 - 18 : 214,  '⏸ 순간 포착! A·B·C 구간의 상태를 골라요', { bg: '#7c3aed', size: PHONE ? 13 : 14.5 });
  // 범례
  const G = LG.LEG;
  panel(G.x, G.y, G.w, G.h, 14);
  const gx = G.x + 16, gw = PHONE ? 200 : 260, gy = G.y + (PHONE ? 20 : 8);
  for (let i = 0; i < gw; i++) { ctx.fillStyle = C.mix(vColor(-80 + 110 * i / gw), '#ffffff', 0.38); ctx.fillRect(gx + i, gy, 2, 12); }
  ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, 12);
  T(gx, gy + 28, '−70 mV (분극)', 12.5, '#1d4ed8', 'left', 800); T(gx + gw, gy + 28, '+30 mV (탈분극)', 12.5, '#b91c1c', 'right', 800);
  const tx = gx + gw + 20; textBlock(tx, G.y + (PHONE ? 24 : 17), G.x + G.w - tx - 12, PHONE ? '안쪽 색 = 막전위. 노란 점선 화살표 = 국소 전류(양전하의 이동). ✕ = 방금 흥분해서 다시 흥분할 수 없는 구간(불응기).' : '안쪽 색 = 막전위 · 노란 점선 화살표 = 국소 전류(양전하의 이동) · ✕ = 방금 흥분해서 다시 흥분할 수 없는 구간(불응기)', PHONE ? 12 : 12.5, '#3a465c', PHONE ? 16 : 16, 700);
  // 구간별 막전위 그래프 (같은 시간 축)
  const TR = LG.TR;
  panel(TR.x, TR.y, TR.w, TR.h, 14);
  const ax = makeAxes({ x: LG.px, y: LG.r0, w: LG.pw, h: LG.rh * NSEG }, [0, TMAX], [0, 1]);
  for (let i = 0; i < NSEG; i++) {
    const y0 = LG.r0 + i * LG.rh, Y = (v) => y0 + LG.rh - 3 - (v + 90) / 130 * (LG.rh - 5);
    ctx.fillStyle = i % 2 ? '#f6f8fc' : '#fbfcfe'; ctx.fillRect(LG.px, y0, LG.pw, LG.rh);
    ctx.strokeStyle = '#c7d2e2'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(LG.px, Y(-70)); ctx.lineTo(LG.px + LG.pw, Y(-70)); ctx.stroke(); ctx.setLineDash([]);
    T(LG.px - 8, y0 + LG.rh / 2 + 5, '구간 ' + (i + 1), PHONE ? 12.5 : 13, '#26324a', 'right', 800);
    const h = cd.hist[i]; ctx.save(); ctx.beginPath(); ctx.rect(LG.px, y0, LG.pw, LG.rh); ctx.clip(); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath(); let st = false;
    for (let k = 0; k < h.length; k++) { if (h[k] == null) { st = false; continue; } const x = cdX(k / 10), y = Y(h[k]); if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.strokeRect(LG.px, LG.r0, LG.pw, LG.rh * NSEG);
  ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; [0, 4, 8, 12, 16, 20].forEach((t) => { ctx.beginPath(); ctx.moveTo(cdX(t), LG.r0); ctx.lineTo(cdX(t), LG.r0 + LG.rh * NSEG); ctx.stroke(); T(cdX(t), LG.tickY, String(t), 13, '#3a465c', 'center', 700); });
  T(LG.px + LG.pw / 2, LG.xlY, '시간 (ms) · 구간별 막전위 (−90 ~ +40 mV)', 13.5, '#26324a', 'center', 800);
  if (cd.ts > 0) { const x = cdX(Math.min(cd.ts, TMAX)); ctx.strokeStyle = 'rgba(255,170,0,.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, LG.r0); ctx.lineTo(x, LG.r0 + LG.rh * NSEG); ctx.stroke(); }
  if (cd.ts === 0 && activeSegs() === 0) T(LG.px + LG.pw / 2, LG.r0 + LG.rh * 3.5 + 5, '⚡ 구간을 눌러 자극하면 구간마다 차례로 솟아요', PHONE ? 13.5 : 16, '#8795a8', 'center', 800);
  parts.update(dt); parts.draw(ctx);
}
const PT_LOCAL = {
  down(p) {
    if (p.y < LG.cy - LG.hh - 4 || p.y > LG.cy + LG.hh + 4) return false;
    const i = Math.floor((p.x - LG.x0) / LG.sw); if (i < 0 || i >= NSEG) return false;
    S.cd.loc = i === 0 ? 'left' : i === NSEG - 1 ? 'right' : (i === 3 ? 'mid' : S.cd.loc); stimulate(i); updateCtl(); return false;
  },
  hover(p) { return p.y > LG.cy - LG.hh && p.y < LG.cy + LG.hh && p.x > LG.x0 && p.x < LG.x0 + LG.sw * NSEG ? 'pointer' : 'default'; },
};
bindSeg('#locSeg', 'data-loc', (l) => { S.cd.loc = l; updateCtl(); });
$('#bStimCd').addEventListener('click', () => stimulate(LOCI[S.cd.loc]));
$('#bCdClear').addEventListener('click', () => { Sound.click(); resetCD(); });
$('#bCap').addEventListener('click', () => { Sound.click(); startCapture(); });
$('#bResume').addEventListener('click', resumeCD);

/* ================= ② 말이집 전도 (경주) ================= */
const MG = PHONE
  ? { x0: 24, x1: 450, y1: 66, y2: 152, hh: 18, BR: { x: 8, y: 214, w: 464, h: 418 } }
  : { x0: 70, x1: 730, y1: 108, y2: 238, hh: 24, BR: { x: 14, y: 312, w: 772, h: 236 } };
const NS = 19, NODES = [0, 6, 12, 18];
const mxs = (k) => MG.x0 + k * (MG.x1 - MG.x0) / (NS - 1);
const RACE_RATE = 1 / 0.22;
const DMG_NAME = ['정상', '일부 손상', '심하게 손상'];
function newMC(dmg) {
  const rec = S.mc ? S.mc.rec : {};
  return { dmg: dmg != null ? dmg : (S.mc ? S.mc.dmg : 0), run: false, t: 0, rec, fin: {}, starts: null, fx: [] };
}
function raceStarts(dmg) {
  const un = [], my = [];
  for (let k = 0; k < NS; k++) un.push(DELTA * k);
  for (let j = 0; j < 4; j++) my.push(dmg === 2 && j >= 2 ? Infinity : DELTA * j + (dmg === 1 && j >= 2 ? 3 : 0));
  return { un, my };
}
function startRace() {
  const mc = S.mc; if (mc.run) return;
  mc.run = true; mc.t = 0; mc.fin = {}; mc.starts = raceStarts(mc.dmg); mc.fx = []; Sound.tick(); updateCtl();
}
function stepMC(dt) {
  const mc = S.mc; if (!mc.run) return;
  mc.t += dt * RACE_RATE;
  const un = mc.starts.un, my = mc.starts.my;
  const fU = un[NS - 1] + DELTA, fM = my[3] + DELTA, okM = isFinite(fM);
  if (mc.fin.un == null && mc.t >= fU) { mc.fin.un = fU; mc.rec.un = fU; Sound.tick(); }
  if (okM && mc.fin.my == null && mc.t >= fM) { mc.fin.my = fM; mc.rec['my' + mc.dmg] = fM; Sound.success(); parts.burst(mxs(18), MG.y2, { count: 12, speed: 120, size: 3.4, colors: ['#ffd447', '#16a34a', '#fff'], gravity: 100 }); }
  const endT = okM ? Math.max(fU, fM) + 1.0 : 34;
  if (mc.t >= endT) { mc.run = false; if (!okM) { mc.rec['my' + mc.dmg] = 'block'; Sound.fail(); } updateCtl(); }
}
const siteV = (t, s) => { const tau = t - s; return tau > 0 && tau < 6 ? AP(tau) : -70; };
function drawRaceScene(dt) {
  const mc = S.mc, t = mc.run || mc.starts ? mc.t : 0, st = mc.starts || raceStarts(mc.dmg);
  bgFill('#eef3fb', '#f7f9fd');
  T(PHONE ? 12 : 20, PHONE ? 22 : 28, '💨 같은 길이를 지나는 두 축삭의 경주', PHONE ? 14 : 17, '#26324a', 'left', 800);
  T(PHONE ? 12 : 20, PHONE ? 40 : 50, '(1 ms를 0.22초로 느리게 보여 줘요 · 속도 차는 모형에서 줄여 보여 줘요)', PHONE ? 11.5 : 13, '#7b8aa3', 'left', 700);
  const cw = (MG.x1 - MG.x0) / (NS - 1), hh = MG.hh;
  // ---- 무말이집
  const y1 = MG.y1;
  T(MG.x0 - (PHONE ? 12 : 56), y1 - hh - 14, '무말이집 축삭', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
  const V1 = []; for (let k = 0; k < NS; k++) V1.push(siteV(t, st.un[k]));
  drawTube(MG.x0 - cw / 2, y1, hh, cw * NS, NS, V1);
  for (let k = 0; k < NS; k++) { const V = V1[k]; if (V > -30) D.glow(mxs(k), y1, 26, '#ffd447', 0.5 * smooth((V + 30) / 60)); }
  // ---- 말이집
  const y2 = MG.y2;
  T(MG.x0 - (PHONE ? 12 : 56), y2 - hh - 14, '말이집 축삭 (랑비에 결절 4곳)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
  ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(MG.x0 - cw / 2, y2); ctx.lineTo(MG.x1 + cw / 2, y2); ctx.stroke();
  ctx.strokeStyle = '#7fd0c8'; ctx.lineWidth = 5; ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const xa = mxs(NODES[j]) + 16, xb = mxs(NODES[j + 1]) - 16, damaged = mc.dmg > 0 && j === 1;
    const g = ctx.createLinearGradient(0, y2 - hh, 0, y2 + hh); g.addColorStop(0, damaged ? '#f1e6c8' : '#fff1c4'); g.addColorStop(0.5, damaged ? '#d9c28a' : '#f6cf6b'); g.addColorStop(1, damaged ? '#bfa468' : '#d99f33');
    D.shadow(() => { D.roundRect(xa, y2 - hh + 4, xb - xa, hh * 2 - 8, 12); ctx.fillStyle = g; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = damaged ? '#9a7b3a' : '#c9962b'; ctx.lineWidth = 2; D.roundRect(xa, y2 - hh + 4, xb - xa, hh * 2 - 8, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,110,30,.45)'; ctx.lineWidth = 1.3; for (let q = 1; q < 8; q++) { const x = xa + (xb - xa) * q / 8; ctx.beginPath(); ctx.moveTo(x, y2 - hh + 7); ctx.lineTo(x, y2 + hh - 7); ctx.stroke(); }
    if (damaged) {
      ctx.strokeStyle = '#7b4a14'; ctx.lineWidth = 2.4; const mid = (xa + xb) / 2;
      ctx.beginPath(); ctx.moveTo(mid - 12, y2 - hh + 4); ctx.lineTo(mid - 3, y2 - 4); ctx.lineTo(mid - 14, y2 + 4); ctx.lineTo(mid - 4, y2 + hh - 4); ctx.moveTo(mid + 14, y2 - hh + 4); ctx.lineTo(mid + 6, y2 - 2); ctx.lineTo(mid + 16, y2 + 6); ctx.lineTo(mid + 8, y2 + hh - 4); ctx.stroke();
    }
    T((xa + xb) / 2, y2 + hh + 18, damaged ? '말이집 손상' : '말이집(이온 통로 없음)', PHONE ? 11.5 : 13, damaged ? '#b45309' : '#8a7a4a', 'center', 800);
  }
  NODES.forEach((k, j) => {
    const V = siteV(t, st.my[j]); const x = mxs(k);
    D.sphere(x, y2, 13, C.mix(vColor(V), '#ffffff', 0.15), { gloss: true, outline: '#2f7f86', outlineWidth: 2 });
    if (V > -30) D.glow(x, y2, 32, '#ffd447', 0.6 * smooth((V + 30) / 60));
    T(x, y2 + hh + 38, '결절', PHONE ? 11.5 : 12.5, '#5a6679', 'center', 700);
  });
  // 도약 (포물선 점)
  for (let j = 1; j < 4; j++) {
    const a = st.my[j - 1] + DELTA, bT = isFinite(st.my[j]) ? st.my[j] + DELTA : a + (DELTA + 3);
    const u = (t - a) / (bT - a);
    if (u > 0 && u < 1.0 && mc.starts) {
      const blocked = !isFinite(st.my[j]), uu = blocked ? Math.min(u, 0.46) : u;
      const x = lerp(mxs(NODES[j - 1]), mxs(NODES[j]), uu), y = y2 - Math.sin(Math.PI * uu) * (hh + 24);
      if (!blocked || u < 0.46) { D.glow(x, y, 20, '#ffd447', 0.85); D.sphere(x, y, 5.5, '#ffb400', { gloss: true }); }
      for (let q = 1; q < 6; q++) { const u2 = uu - q * 0.045; if (u2 > 0) { const xx = lerp(mxs(NODES[j - 1]), mxs(NODES[j]), u2), yy = y2 - Math.sin(Math.PI * u2) * (hh + 24); ctx.fillStyle = 'rgba(255,200,40,' + (0.5 - q * 0.08) + ')'; ctx.beginPath(); ctx.arc(xx, yy, 3.5 - q * 0.4, 0, TAU); ctx.fill(); } }
      if (blocked && u >= 0.46) { const xx = lerp(mxs(NODES[j - 1]), mxs(NODES[j]), 0.46), yy = y2 - Math.sin(Math.PI * 0.46) * (hh + 24); D.sphere(xx, yy, 11, '#e2464b', { gloss: false, text: '✕', textScale: 1 }); }
    } else if (u >= 1.0 && !isFinite(st.my[j]) && mc.starts) { const xx = lerp(mxs(NODES[j - 1]), mxs(NODES[j]), 0.46), yy = y2 - Math.sin(Math.PI * 0.46) * (hh + 24); D.sphere(xx, yy, 11, '#e2464b', { gloss: false, text: '✕', textScale: 1 }); T(xx, yy - 18, '전도 끊김', 13.5, '#c0392b', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); }
  }
  // 결승선과 시계
  [y1, y2].forEach((y, i) => { const fx = MG.x1 + cw / 2 + (PHONE ? 6 : 10); ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx, y - hh - 8); ctx.lineTo(fx, y + hh + 8); ctx.stroke(); ctx.restore(); T(fx + (PHONE ? -2 : 6), y - hh - 12, '🏁', 15, '#000', 'center', 600); });
  const f1 = mc.fin.un, f2 = mc.fin.my;
  D.label(PHONE ? 330 : 560, y1 - hh - 20, f1 != null ? '도착 ' + f1.toFixed(1) + ' ms' : (mc.run ? '진행 ' + Math.min(mc.t, st.un[NS - 1] + DELTA).toFixed(1) + ' ms' : '—'), { bg: f1 != null ? '#16a34a' : '#64748b', size: PHONE ? 12.5 : 14 });
  D.label(PHONE ? 330 : 560, y2 - hh - 20, mc.dmg === 2 && !mc.run && mc.t >= 34 ? '도착 못 함 ✕' : (f2 != null ? '도착 ' + f2.toFixed(1) + ' ms' : (mc.run ? '진행 ' + Math.min(mc.t, isFinite(st.my[3]) ? st.my[3] + DELTA : 99).toFixed(1) + ' ms' : '—')), { bg: f2 != null ? '#16a34a' : (mc.dmg === 2 && mc.t >= 34 ? '#e2464b' : '#64748b'), size: PHONE ? 12.5 : 14 });
  // 시간 비교 막대
  const B = MG.BR; panel(B.x, B.y, B.w, B.h, 14);
  T(B.x + 14, B.y + 24, '⏱ 기록한 도착 시간 (같은 길이를 지나는 데 걸린 시간)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
  const rows = [['un', '무말이집', '#64748b'], ['my0', '말이집 · 정상', '#16a34a'], ['my1', '말이집 · 일부 손상', '#f59e0b'], ['my2', '말이집 · 심한 손상', '#e2464b']];
  const lx = B.x + (PHONE ? 10 : 16), bx = B.x + (PHONE ? 112 : 150), bw = B.w - (bx - B.x) - 22, rh = PHONE ? 54 : 38, by0 = B.y + 44;
  const X = (v) => bx + v / 30 * bw;
  ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; [0, 10, 20, 30].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), by0 - 4); ctx.lineTo(X(v), by0 + rh * 4 - 8); ctx.stroke(); T(X(v), by0 + rh * 4 + 8, String(v), 12.5, '#5a6679', 'center', 700); });
  T(bx + bw / 2, by0 + rh * 4 + 26, '시간 (ms)', 13, '#26324a', 'center', 800);
  rows.forEach((r, i) => {
    const y = by0 + i * rh, v = mc.rec[r[0]];
    TF(lx, y + rh / 2 + 1, r[1], bx - lx - 8, PHONE ? 12.5 : 14, 11, '#26324a', 'left', 800);
    D.roundRect(bx, y + 6, bw, rh - 16, 6); ctx.fillStyle = '#f3f6fb'; ctx.fill();
    if (typeof v === 'number') { D.roundRect(bx, y + 6, Math.max(2, X(v) - bx), rh - 16, 6); ctx.fillStyle = r[2]; ctx.fill(); T(Math.min(X(v) + 8, bx + bw - 58), y + rh / 2 + 3, v.toFixed(1) + ' ms', 13, X(v) > bx + bw - 90 ? '#fff' : '#26324a', X(v) > bx + bw - 90 ? 'right' : 'left', 800, X(v) > bx + bw - 90 ? { } : {}); }
    else if (v === 'block') T(bx + 10, y + rh / 2 + 3, '✕ 신호가 끝까지 가지 못했어요', 13, '#c0392b', 'left', 800);
    else T(bx + 10, y + rh / 2 + 3, '아직 기록 없음', 12.5, '#a0abbb', 'left', 700);
  });
  if (mc.rec.un && mc.rec.my0 && typeof mc.rec.un === 'number') T(B.x + B.w - 16, B.y + 24, '무말이집 / 말이집 = ' + (mc.rec.un / mc.rec.my0).toFixed(1) + '배', PHONE ? 12 : 13.5, '#166534', 'right', 800);
  parts.update(dt); parts.draw(ctx);
}
bindSeg('#dmgSeg', 'data-d', (d) => { const keep = S.mc.rec; S.mc = newMC(+d); S.mc.rec = keep; updateCtl(); });
$('#bRace').addEventListener('click', startRace);
$('#bRaceClear').addEventListener('click', () => { Sound.click(); S.mc = newMC(0); S.mc.rec = {}; updateCtl(); });

/* ================= ③ 속도 계산 ================= */
const CASES = [
  { id: 'A', kind: '말이집 · 굵은 축삭', d: 0.30, dt: 3.0, v: 100, s1: 1.0, win: 8, tick: 1, snap: 0.5 },
  { id: 'B', kind: '말이집 · 가는 축삭', d: 0.30, dt: 6.0, v: 50, s1: 1.0, win: 12, tick: 2, snap: 0.5 },
  { id: 'C', kind: '무말이집 축삭', d: 0.03, dt: 30, v: 1, s1: 4.0, win: 40, tick: 5, snap: 1 },
];
const caseOf = (id) => CASES.find((c) => c.id === id);
const CG = PHONE
  ? { top: { x: 8, y: 8, w: 464, h: 100 }, plot: { x: 64, w: 400 }, rows: [{ y: 144, h: 80 }, { y: 230, h: 80 }], tickY: 344, xlY: 362, TB: { x: 8, y: 382, w: 464, h: 250 } }
  : { top: { x: 14, y: 8, w: 772, h: 108 }, plot: { x: 100, w: 670 }, rows: [{ y: 152, h: 84 }, { y: 242, h: 84 }], tickY: 364, xlY: 382, TB: { x: 14, y: 400, w: 772, h: 150 } };
function newCA() { return { id: 'A', rows: {}, cur: { A: 0.5, B: 1.5 }, drag: null, inDt: '', inV: '' }; }
function caseCur(ca) { const c = caseOf(ca.id); return ca.curs && ca.curs[ca.id] ? ca.curs[ca.id] : [c.win * 0.12, c.win * 0.45]; }
function setCurs(ca, a, b) { ca.curs = ca.curs || {}; ca.curs[ca.id] = [a, b]; }
const relAns = { selR1: '0', selR2: '0', selR3: 'A' };
function relOK() { let ok = true; Object.keys(relAns).forEach((id) => { const e = $('#' + id); const v = e.value; if (v === '') { e.classList.remove('ok', 'bad'); ok = false; } else { const g = v === relAns[id]; e.classList.toggle('ok', g); e.classList.toggle('bad', !g); if (!g) ok = false; } }); return ok; }
const caX = (c, t) => CG.plot.x + t / c.win * CG.plot.w;
function drawCalcScene(dt) {
  const ca = S.ca, c = caseOf(ca.id);
  bgFill('#eef3fb', '#f7f9fd');
  // 위: 축삭과 두 전극
  const tp = CG.top; panel(tp.x, tp.y, tp.w, tp.h, 14);
  const ax0 = tp.x + 84, ax1 = tp.x + tp.w - 84, ay = tp.y + (PHONE ? 56 : 62);
  ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax0 - 50, ay); ctx.lineTo(ax1 + 50, ay); ctx.stroke(); ctx.strokeStyle = '#7fd0c8'; ctx.lineWidth = 6; ctx.stroke();
  const myel = c.id !== 'C', thick = c.id === 'A';
  if (myel) for (let x = ax0 - 46; x < ax1 + 30; x += 56) { D.roundRect(x, ay - (thick ? 15 : 11), 46, (thick ? 30 : 22), 9); ctx.fillStyle = '#f6cf6b'; ctx.fill(); ctx.strokeStyle = '#c9962b'; ctx.lineWidth = 1.6; ctx.stroke(); }
  [[ax0, '#e2464b', '전극 ①', 'right'], [ax1, '#2563eb', '전극 ②', 'left']].forEach((e) => { ctx.strokeStyle = e[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e[0], ay - 6); ctx.lineTo(e[0] + 16, ay - 32); ctx.stroke(); D.sphere(e[0], ay - 6, 6, e[1], { gloss: true }); T(e[0] + (e[3] === 'right' ? -14 : 14), ay + 36, e[2], 13.5, e[1], e[3], 800); });
  D.arrow(ax0 + 6, ay + 31, ax1 - 6, ay + 31, { color: '#475569', width: 2.4, head: 9 }); D.arrow(ax1 - 6, ay + 31, ax0 + 6, ay + 31, { color: '#475569', width: 2.4, head: 9 });
  D.label((ax0 + ax1) / 2, ay + 31, 'd = ' + c.d.toFixed(2) + ' m', { bg: '#fff', color: '#26324a', border: '#94a3b8', size: PHONE ? 12.5 : 14 });
  T(tp.x + 14, tp.y + 22, '사례 ' + c.id + ' · ' + c.kind, PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
  T(tp.x + tp.w - 14, tp.y + 22, '신호 진행 →', 13.5, '#5a6679', 'right', 800);
  // 중간: 두 전극의 기록
  const panelBox = { x: CG.top.x, y: CG.rows[0].y - 28, w: CG.top.w, h: CG.xlY + 12 - (CG.rows[0].y - 28) };
  panel(panelBox.x, panelBox.y, panelBox.w, panelBox.h, 14);
  const [t1, t2] = caseCur(ca);
  CG.rows.forEach((r, i) => {
    const A = makeAxes({ x: CG.plot.x, y: r.y, w: CG.plot.w, h: r.h }, [0, c.win], [-90, 40]);
    ctx.fillStyle = '#fbfcfe'; ctx.fillRect(CG.plot.x, r.y, CG.plot.w, r.h);
    ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; for (let t = 0; t <= c.win + 1e-9; t += c.tick) { ctx.beginPath(); ctx.moveTo(caX(c, t), r.y); ctx.lineTo(caX(c, t), r.y + r.h); ctx.stroke(); }
    [-70, 30].forEach((v) => { ctx.setLineDash([3, 4]); ctx.strokeStyle = '#c7d2e2'; ctx.beginPath(); ctx.moveTo(CG.plot.x, A.Y(v)); ctx.lineTo(CG.plot.x + CG.plot.w, A.Y(v)); ctx.stroke(); ctx.setLineDash([]); });
    T(CG.plot.x - 8, A.Y(30) + 4, '+30', 12.5, '#5a6679', 'right', 700); T(CG.plot.x - 8, A.Y(-70) + 4, '−70', 12.5, '#5a6679', 'right', 700);
    const s = c.s1 + (i ? c.dt : 0), col = i ? '#2563eb' : '#e2464b';
    plotFn(A, (t) => AP(t - s), 0, c.win, c.win / 600, col, 2.8);
    ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.strokeRect(CG.plot.x, r.y, CG.plot.w, r.h);
    ctx.save(); ctx.translate(CG.plot.x - 44, r.y + r.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '전극 ' + (i ? '②' : '①') + ' (mV)', 13, col, 'center', 800); ctx.restore();
  });
  const bot = CG.rows[1].y + CG.rows[1].h;
  for (let t = 0; t <= c.win + 1e-9; t += c.tick) T(caX(c, t), CG.tickY, (+t.toFixed(1)).toString(), 13, '#3a465c', 'center', 700);
  T(CG.plot.x + CG.plot.w / 2, CG.xlY, '시간 (ms)', 14, '#26324a', 'center', 800);
  // 커서
  [[t1, '#e2464b', 't₁'], [t2, '#2563eb', 't₂']].forEach((q, i) => {
    const x = caX(c, q[0]); ctx.save(); ctx.strokeStyle = q[1]; ctx.lineWidth = 2.5; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(x, CG.rows[0].y - 4); ctx.lineTo(x, bot + 4); ctx.stroke(); ctx.restore();
    D.roundRect(x - 12, bot + 4, 24, 14, 5); ctx.fillStyle = q[1]; ctx.fill();
    D.label(clamp(x, CG.plot.x + 50, CG.plot.x + CG.plot.w - 50), CG.rows[0].y + 14 + (i ? 22 : 0), q[2] + ' = ' + q[0].toFixed(1) + ' ms', { bg: q[1], size: PHONE ? 12 : 13.5 });
  });
  T(CG.plot.x + 4, CG.rows[0].y - 12, '👆 빨간·파란 선을 끌어 봉우리에 맞춰 시각을 읽어요', PHONE ? 11.5 : 13, '#5a6679', 'left', 800);
  // 표
  const TB = CG.TB; panel(TB.x, TB.y, TB.w, TB.h, 14);
  T(TB.x + 14, TB.y + 24, '📋 결과 표', 15, '#26324a', 'left', 800);
  const fx = TB.x + TB.w - (PHONE ? 150 : 210), fy = TB.y + 20;
  T(fx - 20, fy + 5, 'v =', 16, '#26324a', 'right', 800); T(fx + 8, fy - 3, 'd', 14, '#26324a', 'center', 800); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx - 8, fy + 1); ctx.lineTo(fx + 24, fy + 1); ctx.stroke(); T(fx + 8, fy + 15, 'Δt', 14, '#26324a', 'center', 800);
  T(fx + 38, fy + 6, '(1 ms = 0.001 s)', 12.5, '#a16207', 'left', 800);
  const cols = PHONE ? [[10, '사례', 96], [106, 'd', 80], [186, 'Δt', 100], [286, 'v', 170]] : [[16, '사례', 190], [206, '거리 d', 140], [346, '시간 차 Δt', 170], [516, '전도 속도 v', 240]];
  const hy = TB.y + (PHONE ? 46 : 38); D.roundRect(TB.x + 8, hy, TB.w - 16, 24, 7); ctx.fillStyle = '#e8f3ec'; ctx.fill();
  cols.forEach((q) => T(TB.x + q[0] + q[2] / 2, hy + 17, q[1], 13.5, '#166534', 'center', 800));
  const rh = PHONE ? 54 : 28;
  CASES.forEach((r, i) => {
    const y = hy + 28 + i * rh, ok = ca.rows[r.id], cur = ca.id === r.id;
    D.roundRect(TB.x + 8, y, TB.w - 16, rh - 4, 7); ctx.fillStyle = cur ? '#fff8dc' : '#fff'; ctx.fill(); ctx.strokeStyle = cur ? '#f59e0b' : '#e3e8f0'; ctx.lineWidth = cur ? 2.2 : 1.2; ctx.stroke();
    const cy = y + (rh - 4) / 2 + 5;
    TF(TB.x + cols[0][0] + cols[0][2] / 2, cy, PHONE ? r.id : r.id + ' · ' + r.kind, cols[0][2] - 6, 14.5, 11, '#26324a', 'center', 800);
    TF(TB.x + cols[1][0] + cols[1][2] / 2, cy, r.d.toFixed(2) + ' m', cols[1][2] - 6, 14.5, 11, '#26324a', 'center', 800);
    TF(TB.x + cols[2][0] + cols[2][2] / 2, cy, ok ? r.dt + ' ms' : '?', cols[2][2] - 6, 14.5, 11, ok ? '#26324a' : '#b45309', 'center', 800);
    TF(TB.x + cols[3][0] + cols[3][2] / 2, cy, ok ? r.v + ' m/s' : '?', cols[3][2] - 40, 14.5, 11, ok ? '#166534' : '#b45309', 'center', 800);
    if (ok) D.check(TB.x + cols[3][0] + cols[3][2] - 20, cy - 5, 9, 1);
  });
  parts.update(dt); parts.draw(ctx);
}
const PT_CALC = {
  down(p) {
    const ca = S.ca, c = caseOf(ca.id), cs = caseCur(ca);
    if (p.y < CG.rows[0].y - 10 || p.y > CG.rows[1].y + CG.rows[1].h + 26) return false;
    let best = -1, bd = 22;
    cs.forEach((t, i) => { const d = Math.abs(p.x - caX(c, t)); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return false; ca.drag = best; Sound.tick(); return true;
  },
  move(p) { const ca = S.ca, c = caseOf(ca.id); if (ca.drag == null) return; const cs = caseCur(ca).slice(); let t = clamp((p.x - CG.plot.x) / CG.plot.w * c.win, 0, c.win); t = Math.round(t / c.snap) * c.snap; cs[ca.drag] = t; setCurs(ca, cs[0], cs[1]); },
  up() { S.ca.drag = null; },
  hover(p) { const ca = S.ca, c = caseOf(ca.id); return caseCur(ca).some((t) => Math.abs(p.x - caX(c, t)) < 18) && p.y > CG.rows[0].y - 10 && p.y < CG.rows[1].y + CG.rows[1].h + 24 ? 'ew-resize' : 'default'; },
};
bindSeg('#caseSeg', 'data-c', (id) => { S.ca.id = id; $('#inDt').value = ''; $('#inV').value = ''; ['inDt', 'inV'].forEach((k) => $('#' + k).classList.remove('ok', 'bad')); updateCtl(); });
$('#bCalc').addEventListener('click', () => {
  const ca = S.ca, c = caseOf(ca.id), dtv = parseFloat($('#inDt').value), vv = parseFloat($('#inV').value);
  const eDt = $('#inDt'), eV = $('#inV'); [eDt, eV].forEach((e) => e.classList.remove('ok', 'bad'));
  if (isNaN(dtv) || isNaN(vv)) { showHint('시간 차 Δt와 속도 v를 모두 입력해요.'); eDt.classList.add(isNaN(dtv) ? 'bad' : 'ok'); eV.classList.add(isNaN(vv) ? 'bad' : 'ok'); return; }
  const okDt = Math.abs(dtv - c.dt) < 1e-6, okV = Math.abs(vv - c.v) / c.v < 0.011;
  eDt.classList.add(okDt ? 'ok' : 'bad'); eV.classList.add(okV ? 'ok' : 'bad');
  if (!okDt) { Sound.fail(); showHint('Δt를 다시 읽어요. 두 봉우리의 시각 t₂ − t₁이에요.'); return; }
  if (!okV) { Sound.fail(); const wrongUnit = Math.abs(vv - c.d / c.dt) / (c.d / c.dt) < 0.02; showHint(wrongUnit ? 'ms를 s로 바꿨나요? 1 ms = 0.001 s이니까 Δt(s) = ' + (c.dt / 1000) + ' s예요.' : 'v = d / Δt예요. Δt를 초(s)로 바꿔서 계산해 보세요.'); return; }
  ca.rows[c.id] = true; Sound.success(); showHint('✅ 사례 ' + c.id + ': v = ' + c.v + ' m/s'); parts.burst(CG.TB.x + CG.TB.w - 60, CG.TB.y + 90, { count: 14, speed: 120, size: 3.4, colors: ['#ffd447', '#16a34a', '#fff'], gravity: 100 });
  const nx = CASES.find((q) => !ca.rows[q.id]); if (nx) { ca.id = nx.id; $('#inDt').value = ''; $('#inV').value = ''; [eDt, eV].forEach((e) => e.classList.remove('ok', 'bad')); }
  updateCtl();
});

/* ================= ④ 모식도 ================= */
const SG = PHONE
  ? { x0: 12, x1: 468, cy: 190, hh: 40, w1: 172, w2: 308, sw: 106, sh: 44, tray: (i) => ({ x: 6 + (i % 4) * 118, y: 420 + Math.floor(i / 4) * 54 }), cw: 106, ch: 44 }
  : { x0: 24, x1: 776, cy: 190, hh: 46, w1: 290, w2: 510, sw: 150, sh: 42, tray: (i) => ({ x: 14 + (i % 4) * 194, y: 410 + Math.floor(i / 4) * 54 }), cw: 150, ch: 42 };
const SCHEMA_CARDS = [
  { id: 'pol', label: '분극 (안쪽 −)' }, { id: 'dep', label: '탈분극 (안쪽 +)' }, { id: 'rep', label: '재분극 (K⁺ 유출)' },
  { id: 'dir', label: '전도 방향 →' }, { id: 'cur', label: '국소 전류 → 앞쪽' },
  { id: 'dir2', label: '전도 방향 ←', decoy: true }, { id: 'cur2', label: '국소 전류 ← 뒤쪽', decoy: true },
];
function slotRects(wx) {
  const sw = SG.sw, sh = SG.sh, cy = SG.cy, hh = SG.hh, off = PHONE ? 112 : 180;
  const top = cy - hh - (PHONE ? 96 : 100);
  return [
    { id: 'sFront', ans: 'pol', x: wx + off - sw / 2, y: top, w: sw, h: sh, name: '③ 앞쪽' },
    { id: 'sAct', ans: 'dep', x: wx - sw / 2, y: top, w: sw, h: sh, name: '② 가운데' },
    { id: 'sBack', ans: 'rep', x: wx - off - sw / 2, y: top, w: sw, h: sh, name: '① 뒤쪽' },
    { id: 'sCur', ans: 'cur', x: wx + (PHONE ? 6 : 14), y: cy + hh + (PHONE ? 70 : 78), w: sw, h: sh, name: '⑤ 전류' },
    { id: 'sDir', ans: 'dir', x: wx - (PHONE ? sw + 6 : sw + 14), y: cy + hh + (PHONE ? 70 : 78), w: sw, h: sh, name: '④ 방향' },
  ];
}
function newSC() {
  const wx = SG.w1;
  const pl = new Placer({ chips: SCHEMA_CARDS.map((c) => Object.assign({}, c, { col: '#7c3aed' })), targets: slotRects(wx), tray: SG.tray, cw: SG.cw, ch: SG.ch, onChange() {} });
  // 칸이 칩 크기보다 작아서 칩 크기를 칸에 맞춰요
  pl.o.cw = SG.cw;
  return { wx, wxT: wx, snap: 1, pl, seenBoth: false, seen: { 1: true }, time: { run: false, t: 0, done: false, answered: false }, tm: { ms: '', ms2: '' } };
}
function setSnap(n) { const sc = S.sc; if (sc.snap === n) return; sc.snap = n; sc.seen[n] = true; SciSim.tween(sc, { wx: n === 1 ? SG.w1 : SG.w2 }, { duration: RM ? 0.01 : 0.9, ease: 'inOutQuad' }); Sound.click(); updateCtl(); }
function drawSchemaScene(dt) {
  const sc = S.sc, cy = SG.cy, hh = SG.hh, wx = sc.wx, x0 = SG.x0, x1 = SG.x1;
  bgFill('#eef3fb', '#f7f9fd');
  T(PHONE ? 12 : 20, PHONE ? 22 : 28, '📐 시각 t' + (sc.snap === 1 ? '₁' : '₂') + '의 축삭 모식도', PHONE ? 14 : 17, '#26324a', 'left', 800);
  const hw = PHONE ? 62 : 90, bk = PHONE ? 52 : 80;           // 활동 구간 절반 폭, 뒤쪽 구간 길이
  // 구간 안쪽 색
  const regionV = (x) => (x > wx - hw && x < wx + hw ? 30 : -70);
  ctx.save(); D.roundRect(x0, cy - hh, x1 - x0, hh * 2, 16); ctx.clip();
  for (let x = x0; x < x1; x += 4) { const V = regionV(x); ctx.fillStyle = C.mix(vColor(V), '#ffffff', 0.4); ctx.fillRect(x, cy - hh, 4.5, hh * 2); }
  ctx.restore();
  ctx.strokeStyle = '#e0a550'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0 + 12, cy - hh); ctx.lineTo(x1 - 12, cy - hh); ctx.moveTo(x0 + 12, cy + hh); ctx.lineTo(x1 - 12, cy + hh); ctx.stroke();
  ctx.strokeStyle = '#b97a2a'; ctx.lineWidth = 1.5; D.roundRect(x0, cy - hh - 3, x1 - x0, hh * 2 + 6, 18); ctx.stroke();
  // 영역 경계
  ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2;
  [wx - hw, wx + hw].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, cy - hh - 8); ctx.lineTo(x, cy + hh + 8); ctx.stroke(); }); ctx.restore();
  // 전하 부호
  const sgn = (x, y, ch, col, sz) => T(x, y, ch, sz, col, 'center', 900);
  for (let x = x0 + 22; x < x1 - 10; x += PHONE ? 30 : 34) {
    const act = x > wx - hw + 6 && x < wx + hw - 6, rest = !act;
    if (act) { sgn(x, cy + 8, '+', '#b91c1c', 24); sgn(x, cy - hh - 7, '−', COL.neg, 20); sgn(x, cy + hh + 20, '−', COL.neg, 20); }
    else if (!(x > wx - hw - 4 && x < wx + hw + 4)) { sgn(x, cy + 8, '−', '#1d4ed8', 24); sgn(x, cy - hh - 7, '+', COL.pos, 20); sgn(x, cy + hh + 20, '+', COL.pos, 20); }
  }
  // Na⁺ 유입 (활동 구간), K⁺ 유출 (뒤쪽)
  for (let k = 0; k < 3; k++) { const x = wx - hw * 0.55 + k * hw * 0.55, ph = (clock * 1.2 + k * 0.33) % 1; if (!RM || ph < 0.5) D.sphere(x, cy - hh - 26 + ph * 38, 7, COL.na, { gloss: true }); }
  for (let k = 0; k < 3; k++) { const x = wx - hw - 14 - k * (bk / 3), ph = (clock * 1.0 + k * 0.4) % 1; D.sphere(x, cy + hh - 8 + ph * 34, 6.5, COL.k, { gloss: true }); }
  ionLabel(wx - hw * 0.3, cy - hh - 38, 'Na', '+', ' 유입', 13, null); ionLabel(wx - hw - 14 - bk / 3, cy + hh + 38, 'K', '+', ' 유출', 13, null);
  // 국소 전류 (안쪽: 활동 구간 → 앞쪽)
  const ax = wx + hw + 6, bx = ax + (PHONE ? 70 : 110);
  D.arrow(wx + hw - 22, cy - 4, bx, cy - 4, { color: '#f59e0b', width: 4.5, head: 12, dash: [9, 5] });
  ctx.save(); ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 2.4; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -clock * 40; ctx.beginPath(); ctx.moveTo(bx - 6, cy - hh - 10); ctx.quadraticCurveTo((wx + bx) / 2, cy - hh - 46, wx + 18, cy - hh - 10); ctx.stroke(); ctx.restore();
  D.sphere(wx + hw + 38, cy - hh - 30, 12, '#f59e0b', { gloss: false, text: '⑤', textScale: 1 });
  // 전도 방향 (t₁ → t₂)
  const dy = cy + hh + (PHONE ? 58 : 62); D.arrow(SG.w1 - 20, dy, SG.w2 + 20, dy, { color: '#7c3aed', width: 3.5, head: 11, alpha: 0.9 });
  T(SG.w1 - 20, dy - 8, 't₁', 13, '#7c3aed', 'center', 800); T(SG.w2 + 20, dy - 8, 't₂', 13, '#7c3aed', 'center', 800);
  D.sphere((SG.w1 + SG.w2) / 2, dy - 14, 12, '#7c3aed', { gloss: false, text: '④', textScale: 1 });
  // 칸 갱신 후 그리기
  const tg = slotRects(wx); sc.pl.targets.forEach((t, i) => { t.x = tg[i].x; t.y = tg[i].y; });
  sc.pl.targets.forEach((t, i) => { t.name = tg[i].name; });
  // 영역 번호
  [['①', wx - (PHONE ? 112 : 180)], ['②', wx], ['③', wx + (PHONE ? 112 : 180)]].forEach((q) => { D.sphere(q[1], cy, 12, '#475569', { gloss: false, text: q[0], textScale: 1 }); });
  sc.pl.drawTargets({ col: '#9aa7c0' });
  sc.pl.targets.forEach((t) => { if (t.y > cy) { /* 아래쪽 칸 */ } });
  if (sc.pl.placed < 5) T(PHONE ? 8 : 14, SG.tray(0).y - 10, '👇 카드를 끌어서 ①~⑤ 칸에 놓아요 (시각을 t₂로 바꿔도 같은 자리를 따라가요)', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 800);
  else T(PHONE ? 8 : 14, SG.tray(0).y - 10, '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12.5 : 14, '#166534', 'left', 800);
  sc.pl.update(dt); sc.pl.follow(); sc.pl.drawChips();
}
const PT_SCHEMA = { down(p) { return S.sc.pl.down(p); }, move(p) { S.sc.pl.move(p); }, up(p) { S.sc.pl.up(p); }, hover(p) { return S.sc.pl.hover(p); } };
bindSeg('#snapSeg', 'data-s', (n) => setSnap(+n));
$('#bSchemaReset').addEventListener('click', () => { Sound.click(); S.sc.pl.reset(); });
/* ---- 발끝 → 뇌 1.2 m 시간 비교 ---- */
const TIME_D = 1.2;
function drawTimeScene(dt) {
  const sc = S.sc, tm = sc.time;
  bgFill('#eef3fb', '#f7f9fd');
  T(PHONE ? 12 : 20, PHONE ? 22 : 28, '🦶 발끝에서 뇌까지 1.2 m, 신호가 도착하는 시간', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
  const x0 = PHONE ? 70 : 150, x1 = VW - (PHONE ? 30 : 60), lanes = [{ y: PHONE ? 110 : 120, v: 100, n: '말이집 신경 (굵음)', col: '#16a34a', ms: 12 }, { y: PHONE ? 220 : 240, v: 1, n: '무말이집 신경', col: '#64748b', ms: 1200 }];
  lanes.forEach((l, i) => {
    T(PHONE ? 8 : 20, l.y - 22, l.n + ' · v = ' + l.v + ' m/s', PHONE ? 13 : 15.5, '#26324a', 'left', 800);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, l.y); ctx.lineTo(x1, l.y); ctx.stroke();
    ctx.strokeStyle = l.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, l.y); ctx.lineTo(x1, l.y); ctx.stroke();
    T(x0 - 28, l.y + 8, '🦶', 22, '#000', 'center', 600); T(x1 + 18, l.y + 8, '🧠', 22, '#000', 'center', 600);
    const prog = tm.run || tm.done ? clamp(tm.t / l.ms, 0, 1) : 0, x = lerp(x0, x1, prog);
    if (tm.run || tm.done) { D.glow(x, l.y, 20, '#ffd447', 0.8); D.sphere(x, l.y, 7, '#ffb400', { gloss: true }); }
    const arr = tm.run || tm.done ? (prog >= 1 ? '도착!' : '') : '';
    T(x1 - 4, l.y - 22, arr, 14, '#166534', 'right', 800);
    T(x0, l.y + 30, '0 m', 12.5, '#5a6679', 'center', 700); T(x1, l.y + 30, '1.2 m', 12.5, '#5a6679', 'center', 700);
  });
  const by = PHONE ? 292 : 336;
  panel(PHONE ? 8 : 14, by, VW - (PHONE ? 16 : 28), PHONE ? 330 : 200, 14);
  textBlock(PHONE ? 22 : 30, by + 32, VW - (PHONE ? 44 : 60), '시간 = 거리 / 속도 (t = d / v). 속도의 단위가 m/s이니 시간은 초(s)로 나와요. 1 s = 1000 ms예요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 23, 700);
  textBlock(PHONE ? 22 : 30, by + (PHONE ? 100 : 92), VW - (PHONE ? 44 : 60), '▶ 재생은 느리게(1 ms = 0.005 s) 보여 줘요. 입력 칸에 ms 단위로 도달 시간을 써요.', PHONE ? 12.5 : 14, '#5a6679', PHONE ? 18 : 21, 700);
  if (tm.answered) { T(PHONE ? 22 : 30, by + (PHONE ? 220 : 160), '✅ 말이집 12 ms · 무말이집 1200 ms (100배 차이)', PHONE ? 14 : 16, '#166534', 'left', 800); }
  T(VW - 20, by + (PHONE ? 316 : 190), tm.run || tm.done ? '경과 ' + (tm.t).toFixed(0) + ' ms' : '', 13.5, '#5a6679', 'right', 800);
  parts.update(dt); parts.draw(ctx);
}
function stepTime(dt) { const tm = S.sc.time; if (!tm.run) return; tm.t += dt * 200; if (tm.t >= 1200) { tm.t = 1200; tm.run = false; tm.done = true; Sound.success(); } }
$('#bTimeRun').addEventListener('click', () => { const tm = S.sc.time; tm.run = true; tm.done = false; tm.t = 0; Sound.click(); });

/* ---------- 읽음 칸 ---------- */
let rlast = '';
function readouts() {
  let L1, L2, L3, a, b, c;
  if (S.mode === 'local') {
    const cd = S.cd; L1 = '경과 시간'; a = cd.ts.toFixed(1) + ' ms'; L2 = '활동 중인 구간'; b = activeSegs() + ' / 7'; L3 = '가장 멀리 간 구간'; c = cd.maxFired >= 0 ? (cd.maxFired + 1) + '번' : '—';
  } else if (S.mode === 'myelin') {
    const mc = S.mc; L1 = '경과 시간'; a = (mc.run || mc.t ? mc.t : 0).toFixed(1) + ' ms'; L2 = '말이집 상태'; b = DMG_NAME[mc.dmg]; L3 = '기록'; c = Object.keys(mc.rec).length + '개';
  } else if (S.mode === 'calc') {
    const ca = S.ca, cs = caseOf(ca.id), [t1, t2] = caseCur(ca); L1 = '사례 ' + ca.id + ' 거리 d'; a = cs.d.toFixed(2) + ' m'; L2 = 't₂ − t₁'; b = (t2 - t1).toFixed(1) + ' ms'; L3 = '계산한 사례'; c = CASES.filter((q) => ca.rows[q.id]).length + ' / 3';
  } else if (S.sub === 'time') {
    const tm = S.sc.time; L1 = '거리 d'; a = '1.2 m'; L2 = '경과 시간'; b = Math.round(tm.t) + ' ms'; L3 = '속도'; c = '100 m/s · 1 m/s';
  } else {
    const sc = S.sc; L1 = '보는 시각'; a = sc.snap === 1 ? 't₁' : 't₂'; L2 = '놓은 카드'; b = sc.pl.placed + ' / 5'; L3 = '맞은 칸'; c = (5 - sc.pl.wrongIds().filter((id) => !SCHEMA_CARDS.find((q) => q.id === id).decoy).length) + ' / 5';
  }
  const key = [L1, a, L2, b, L3, c].join('|');
  if (key === rlast) return; rlast = key;
  l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
}

/* ================= 미션 ================= */
const levels = [
  {
    title: '국소 전류: 신호는 어떻게 이웃으로 퍼질까?', short: '국소 전류', icon: '🔌', phase: '모형',
    intro: '<p class="si-q">❓ 탐구 질문: 발끝이 닿은 자극이 뇌에 닿기까지 왜 순식간에 일어날까? 어떤 신경이 더 빠르고 그 까닭은?</p>' +
      '<div class="si-link">🔗 <b>앞 차시에서</b> 자극이 역치(−55 mV)를 넘으면 활동 전위가 생긴다는 것을 배웠어요. 이번에는 한 곳에서 생긴 활동 전위가 축삭을 따라 <b>어떻게 퍼져 나가는지</b>(흥분의 전도)를 봐요. 앞 차시의 활동 전위 곡선이 구간마다 그대로 쓰여요.</div>' +
      '<p>축삭을 7구간으로 나눈 모형이에요. 한 구간이 흥분하면 이웃 구간으로 <b>국소 전류</b>(양전하의 이동)가 흘러 이웃도 역치에 도달하고, 활동 전위가 차례로 생겨요.</p>',
    features: ['local'],
    setup() { resetCD(); setScene('local'); },
    recap: '활동 전위가 생긴 구간에서 이웃 구간으로 국소 전류가 흘러 이웃이 차례로 흥분해요. 방금 흥분한 뒤쪽 구간은 잠깐 다시 흥분하지 못해서 신호는 한 방향으로만 가요.',
    summary: '<ul><li><b>흥분의 전도</b>: 한 지점의 탈분극 → 이웃 지점에 <b>국소 전류</b> → 이웃이 역치에 도달 → 활동 전위가 <b>차례로</b> 발생.</li><li>활동 전위의 크기는 구간마다 같아요(+30 mV). 그래프가 구간마다 시간차를 두고 솟아요.</li><li>방금 활동 전위를 낸 뒤쪽 구간은 일시적으로 다시 흥분하지 못해요(<b>불응기</b>) → 신호는 <b>한 방향</b>으로만 진행해요.</li><li>몸 안에서는 가지 돌기 쪽에서 시작하지만, 축삭 가운데를 인위적으로 자극하면 양쪽으로 퍼져요.</li></ul>',
    missions: [
      {
        title: '신호를 축삭 끝까지 전달하기',
        goal: '<b>가지 돌기 쪽 끝(구간 1)</b>을 자극해서 활동 전위가 <b>축삭 말단 쪽 끝(구간 7)</b>까지 가게 하세요.',
        hint: '구간 1을 누르거나 “왼쪽 끝” 선택 후 ⚡ 자극 주기를 눌러요. 약 8초 동안 기다리면 구간 7까지 가요.',
        setup() { setScene('local'); },
        check: () => S.cd.reached,
        hold: 0.4,
        status: () => mark(S.cd.origin === 0) + ' 구간 1 자극 &nbsp; ' + mark(S.cd.reached) + ' 구간 7 도달',
        explain: '구간 1이 흥분하면 <b>국소 전류</b>가 구간 2로 흘러 구간 2가 역치에 도달하고, 이어서 구간 3, 4 … 7까지 <b>차례로</b> 활동 전위가 생겨요. 그래프가 구간마다 조금씩 늦게 솟는 것이 그 증거예요.',
      },
      {
        title: '구간의 상태 알아맞히기', manual: true,
        goal: '신호가 지나가는 중에 <b>📸 순간 포착</b>을 눌러 장면을 멈추고, 표시된 구간 A·B·C가 <b>분극·탈분극·재분극</b> 중 무엇인지 골라 <b>✔ 확인하기</b>를 누르세요.',
        hint: '안쪽이 −이고 활동 전위가 없으면 분극, 막전위가 올라가는 중이면 탈분극(안쪽 +), 내려오는 중이면 재분극이에요. 구간별 그래프도 같이 보세요.',
        setup() { setScene('local'); if (S.cd.frozen) resumeCD(); },
        check() {
          const cd = S.cd; if (!cd.cap) return '먼저 ⚡ 자극을 준 뒤 📸 순간 포착을 눌러 장면을 멈춰 보세요.';
          let bad = 0, empty = 0;
          cd.cap.forEach((c) => { const e = $('#selCap' + c.letter); if (!e.value) { empty++; e.classList.remove('ok', 'bad'); } else { const ok = e.value === c.truth; e.classList.toggle('ok', ok); e.classList.toggle('bad', !ok); if (!ok) bad++; } });
          if (empty) return '아직 고르지 않은 구간이 있어요. A, B, C를 모두 골라요.';
          if (bad) return '빨간 칸이 틀렸어요. 그 구간의 안쪽 부호와 그래프(올라가는 중인지 내려오는 중인지)를 다시 봐요.';
          return true;
        },
        status: () => S.cd.cap ? '📸 포착 완료 · 구간 ' + S.cd.cap.map((c) => c.letter + '=' + (c.seg + 1) + '번').join(', ') : (S.cd.capPending ? '📸 알맞은 장면을 찾는 중…' : '⬜ 아직 포착 전'),
        explain: '활동 전위가 지나가는 구간은 <b>탈분극</b>(안쪽 +), 그 뒤쪽은 K⁺이 나가며 <b>재분극</b>(−로 돌아오는 중), 아직 신호가 오지 않은 앞쪽은 <b>분극</b>(안쪽 −) 상태예요. 신호가 오른쪽으로 갈 때 이 세 상태가 나란히 이어져요.',
      },
      {
        type: 'quiz', title: '신호가 뒤로 가지 않는 까닭',
        goal: '활동 전위가 생긴 구간에서는 앞쪽과 뒤쪽 이웃 구간 모두에 국소 전류가 흘러요. 그런데 신호는 왜 뒤로 되돌아가지 않을까요?',
        setup() { setScene('local'); },
        choices: ['국소 전류가 뒤쪽으로는 흐르지 않아서', '방금 활동 전위를 낸 뒤쪽 구간은 일시적으로 다시 흥분하지 못해서(불응기)', '뒤쪽 구간에는 이온이 없어서', '신경 세포체가 신호를 막아서'],
        answer: 1,
        feedback: ['국소 전류는 앞쪽과 뒤쪽 이웃 모두로 흘러요. 그림의 ✕가 있는 쪽이 뒤쪽이에요.', '', '뒤쪽 구간에도 이온은 있어요. 이온 통로가 다시 반응할 준비가 안 된 상태예요.', '세포체는 신호의 진행 방향과 관계없이 신호를 막지 않아요.'],
        explain: '뒤쪽 구간은 방금 활동 전위를 내서 <b>일시적으로 다시 흥분하지 못하는 상태(불응기)</b>예요. 그래서 국소 전류가 흘러도 반응하지 않고, 아직 흥분하지 않은 앞쪽 구간만 흥분해서 신호가 <b>한 방향</b>으로 가요.',
      },
    ],
  },
  {
    title: '말이집 전도: 건너뛰면 더 빨라요', short: '말이집', icon: '💨', phase: '모형',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 활동 전위가 이웃 구간으로 차례로 퍼지는 것을 봤어요. 그런데 신경마다 속도가 크게 달라요. 무말이집 신경은 약 0.5~2 m/s, 말이집 신경은 약 50~120 m/s예요.</div>' +
      '<p><b>말이집</b>(절연체)으로 싸인 부분에서는 이온이 드나들 수 없어요. 활동 전위는 <b>랑비에 결절</b>에서만 생기고, 결절에서 결절로 <b>건너뛰며</b> 전도돼요(<b>도약 전도</b>). 같은 길이를 지나는 두 축삭을 경주시켜 봐요.</p>',
    features: ['myelin'],
    setup() { S.mc = newMC(0); S.mc.rec = {}; setScene('myelin'); },
    recap: '말이집 신경에서는 활동 전위가 랑비에 결절에서만 생겨 결절 사이를 건너뛰어요(도약 전도). 그래서 같은 길이를 더 빨리 지나고 에너지도 적게 써요. 말이집이 손상되면 전도가 느려지거나 끊겨요.',
    summary: '<ul><li><b>무말이집 신경</b>: 막 전체에서 활동 전위가 차례로 생겨요 → 약 0.5~2 m/s.</li><li><b>말이집 신경</b>: 말이집으로 싸인 부분은 이온이 드나들지 못하고, <b>랑비에 결절</b>에서만 활동 전위가 생겨요 → <b>도약 전도</b>, 약 50~120 m/s.</li><li>활동 전위를 만드는 횟수가 줄어서 더 빠르고, 이온이 드나드는 곳이 적어 <b>에너지 소모도 적어요</b>.</li><li>말이집이 손상되면(예: 다발성 경화증) 전도가 느려지거나 끊겨요. 증상은 이 화면에서 다루지 않아요.</li></ul>',
    missions: [
      {
        title: '두 축삭 달리기 경주',
        goal: '말이집 상태를 <b>정상</b>으로 두고 <b>🏁 출발</b>을 눌러, 무말이집과 말이집 축삭이 같은 길이를 지나는 시간을 모두 기록하세요.',
        hint: '아래 막대 그래프에 두 시간이 기록되면 성공이에요. 약 7초 기다려요.',
        setup() { setScene('myelin'); },
        check: () => typeof S.mc.rec.un === 'number' && typeof S.mc.rec.my0 === 'number',
        hold: 0.5,
        status: () => mark(typeof S.mc.rec.un === 'number') + ' 무말이집 ' + (typeof S.mc.rec.un === 'number' ? S.mc.rec.un.toFixed(1) + ' ms' : '') + ' &nbsp; ' + mark(typeof S.mc.rec.my0 === 'number') + ' 말이집 ' + (typeof S.mc.rec.my0 === 'number' ? S.mc.rec.my0.toFixed(1) + ' ms' : ''),
        explain: '무말이집 축삭은 19곳을 하나씩 거치느라 <b>28.5 ms</b>, 말이집 축삭은 결절 4곳만 거쳐 <b>6.0 ms</b>가 걸려요(모형 값). 말이집 신경이 더 빠른 까닭은 건너뛰는 도약 전도 때문이에요.',
      },
      {
        title: '말이집이 손상되면?',
        goal: '말이집 상태를 <b>일부 손상</b> 또는 <b>심하게 손상</b>으로 바꾸고 경주해서 전도가 어떻게 달라지는지 기록하세요.',
        hint: '“일부 손상”을 고르고 🏁 출발을 눌러 보세요. 가운데 말이집이 손상되어 있어요.',
        setup() { setScene('myelin'); },
        check: () => S.mc.rec.my1 != null || S.mc.rec.my2 != null,
        hold: 0.5,
        status: () => mark(S.mc.rec.my1 != null) + ' 일부 손상 ' + (typeof S.mc.rec.my1 === 'number' ? S.mc.rec.my1.toFixed(1) + ' ms' : '') + ' &nbsp; ' + mark(S.mc.rec.my2 != null) + ' 심한 손상 ' + (S.mc.rec.my2 === 'block' ? '끊김' : ''),
        explain: '말이집이 손상된 구간에서는 이온이 새서 활동 전위가 다음 결절에 닿는 데 <b>더 오래 걸리고</b>(일부 손상: 6.0 → 9.0 ms), 심하면 신호가 <b>끊겨요</b>. 말이집이 신호 전달에 얼마나 중요한지 알 수 있어요.',
      },
      {
        type: 'quiz', title: '도약 전도가 빠른 까닭',
        goal: '말이집 신경이 무말이집 신경보다 빠른 까닭으로 가장 알맞은 것은?',
        setup() { setScene('myelin'); },
        choices: ['말이집이 신호를 직접 전기로 증폭해서', '결절에서 결절로 건너뛰어 활동 전위를 새로 만드는 횟수가 줄어서', '말이집 신경은 축삭이 항상 짧아서', '활동 전위의 크기가 더 커서'],
        answer: 1,
        feedback: ['말이집은 절연체예요. 신호를 증폭하지 않고, 이온이 새는 것을 막아요.', '', '길이가 같은 경주였어요. 길이가 아니라 전도 방식이 달라요.', '활동 전위의 크기는 같아요(+30 mV).'],
        explain: '말이집 구간에서는 이온이 드나들지 못해 신호가 <b>결절에서 결절로 건너뛰어요</b>. 활동 전위를 다시 만드는 곳이 적으니 더 빠르고, 이온이 드나드는 곳이 적어 에너지도 덜 써요.',
      },
    ],
  },
  {
    title: '속도 계산: v = d / Δt', short: '속도 계산', icon: '🧮', phase: '분석',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 말이집 신경이 더 빠르다는 것을 경주로 확인했어요. 이제 <b>얼마나 빠른지</b> 숫자로 구해 봐요.</div>' +
      '<p>축삭에 전극 두 개를 꽂아 활동 전위가 두 지점을 지나는 시각을 재면 <b>전도 속도 v = d / Δt</b>를 구할 수 있어요(d: 두 전극 사이 거리, Δt: 두 봉우리의 시간 차). 시간의 단위가 <b>ms</b>이니 <b>1 ms = 0.001 s</b>로 바꿔서 계산해요.</p>',
    features: ['calc'],
    setup() { S.ca = newCA(); ['inDt', 'inV'].forEach((k) => { $('#' + k).value = ''; $('#' + k).classList.remove('ok', 'bad'); }); ['selR1', 'selR2', 'selR3'].forEach((k) => { $('#' + k).value = ''; $('#' + k).classList.remove('ok', 'bad'); }); setScene('calc'); },
    recap: '전도 속도 v = d / Δt (시간은 초로 바꿔서). 말이집이 있고 굵은 축삭이 가장 빨라요(100 m/s). 말이집이 있으면 같은 굵기에서 더 빨라요(무말이집은 1 m/s).',
    summary: '<ul><li><b>전도 속도 v = d / Δt</b> (d: 두 전극 사이 거리, Δt: 활동 전위가 두 전극에 도달한 시간 차)</li><li>단위 환산: <b>1 ms = 0.001 s</b>.</li><li>A) 말이집·굵은 축삭: d = 0.30 m, Δt = 3.0 ms → <b>100 m/s</b></li><li>B) 말이집·가는 축삭: 0.30 m, 6.0 ms → <b>50 m/s</b></li><li>C) 무말이집: 0.03 m, 30 ms → <b>1 m/s</b></li><li>축삭이 굵을수록, 말이집이 있을수록 빨라요.</li></ul>',
    missions: [
      {
        title: '사례 3개의 속도 구하고 관계 정리하기',
        goal: '사례 A·B·C에서 <b>t₁, t₂ 선</b>을 봉우리에 맞춰 Δt를 읽고 <b>v = d / Δt</b>를 계산해 <b>✔ 계산 확인</b>을 누르세요. 세 사례를 모두 마치면 나타나는 <b>세 문장</b>도 완성하세요.',
        hint: '사례 A: 두 봉우리의 시각이 3.0 ms, 6.0 ms라면 Δt = 3.0 ms = 0.0030 s예요. v = 0.30 / 0.0030 = ? (단위 m/s). 문장은 세 사례의 속도 v를 비교해 골라요.',
        setup() { setScene('calc'); updateCtl(); },
        check: () => CASES.every((c) => S.ca.rows[c.id]) && relOK(),
        hold: 0.5,
        status: () => CASES.map((c) => mark(!!S.ca.rows[c.id]) + c.id).join(' &nbsp; ') + ' &nbsp; ' + mark(relOK()) + ' 관계 문장 ' + ['selR1', 'selR2', 'selR3'].filter((id) => relAns[id] === $('#' + id).value).length + ' / 3',
        explain: '<b>A</b>: 0.30 / 0.0030 = 100 m/s, <b>B</b>: 0.30 / 0.0060 = 50 m/s, <b>C</b>: 0.03 / 0.030 = 1 m/s. ms를 s로 바꾸는 것(1 ms = 0.001 s)을 잊지 않는 것이 중요해요. 같은 말이집 신경에서 <b>굵은 축삭(A)이 가는 축삭(B)보다 빠르고</b>, 말이집이 없는 C가 가장 느려요.',
      },
      {
        type: 'quiz', title: '단위 환산 문제',
        goal: '말이집 신경에서 두 전극 사이 거리가 <b>0.45 m</b>이고 활동 전위의 시간 차가 <b>4.5 ms</b>예요. 전도 속도는?',
        setup() { setScene('calc'); },
        choices: ['100 m/s', '0.1 m/s', '10 m/s', '1000 m/s'],
        answer: 0,
        feedback: ['', 'ms를 s로 바꾸지 않고 0.45 / 4.5를 계산한 값이에요. 4.5 ms = 0.0045 s예요.', '단위 환산을 한 번 더 확인해 보세요. 0.45 / 0.0045 = ?', '1000배로 너무 커요. 4.5 ms = 0.0045 s (0.0045 = 4.5 / 1000)예요.'],
        explain: 'Δt = 4.5 ms = 0.0045 s이므로 v = 0.45 / 0.0045 = <b>100 m/s</b>예요. 굵고 말이집이 있는 신경의 속도가 100 m/s 정도예요.',
      },
    ],
  },
  {
    title: '모식도: 시각별 막 상태를 그리기', short: '모식도', icon: '📐', phase: '적용',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전도 속도를 계산했어요. 이제 지금까지 배운 것을 <b>모식도</b>로 나타내고, 발끝에서 뇌까지 신호가 걸리는 시간도 비교해 봐요.</div>' +
      '<p>활동 전위가 오른쪽으로 지나가는 축삭의 한 순간을 그린 모식도예요. <b>앞쪽·가운데·뒤쪽 구간의 막 상태</b>와 <b>전도 방향, 국소 전류 방향</b>을 알맞은 카드로 표현해요.</p>',
    features: ['schema'],
    setup() { S.sc = newSC(); ['inTm1', 'inTm2'].forEach((k) => { $('#' + k).value = ''; $('#' + k).classList.remove('ok', 'bad'); }); $('#selTm').value = ''; $('#selTm').classList.remove('ok', 'bad'); setSub('diagram'); },
    recap: '활동 전위가 지나가는 구간은 안쪽이 +(탈분극), 앞쪽은 안쪽 −(분극), 뒤쪽은 K⁺이 나가며 −로 돌아오는 중(재분극)이에요. 국소 전류는 활동 구간에서 앞쪽 구간으로 흘러 신호가 한 방향으로 가요.',
    summary: '<ul><li>모식도(오른쪽으로 전도): 앞쪽 = <b>분극</b>(안쪽 −, 바깥 +), 가운데 = <b>탈분극</b>(안쪽 +, 바깥 −, Na⁺ 유입), 뒤쪽 = <b>재분극</b>(K⁺ 유출).</li><li><b>국소 전류</b>는 활동 구간에서 <b>앞쪽</b>으로 흘러 앞쪽이 역치에 도달해요. 뒤쪽은 불응기라 반응하지 않아요.</li><li>발끝~뇌 1.2 m: 말이집 신경(100 m/s)은 <b>12 ms</b>, 무말이집 신경(1 m/s)은 <b>1.2 s</b>.</li><li>말이집이 손상되면 전도 시간이 길어져요. 말이집 신경은 이온이 드나드는 곳이 적어 <b>에너지 효율</b>도 좋아요.</li></ul>',
    missions: [
      {
        title: '모식도 카드 놓기', manual: true,
        goal: '카드를 끌어서 <b>①~⑤ 칸</b>에 놓으세요. 카드 7장 중 2장은 맞지 않는 카드예요. 다 놓으면 <b>✔ 확인하기</b>를 누르세요.',
        hint: '활동 전위는 오른쪽으로 가요. 국소 전류는 활동 구간에서 아직 흥분하지 않은 앞쪽으로 흘러요. 시각 t₂를 눌러 파동이 움직이는 방향을 확인해요.',
        setup() { setSub('diagram'); },
        check() {
          const pl = S.sc.pl;
          if (!pl.full) return '아직 놓지 않은 카드가 있어요. ①~⑤ 칸을 모두 채워요.';
          const bad = pl.wrongIds(); pl.markBad(bad);
          if (bad.length) return '빨간 카드가 알맞지 않아요. 안쪽 부호와 화살표 방향을 모식도에서 다시 확인해 보세요.';
          if (!S.sc.seen[2]) return '시각을 t₂로도 바꿔 파동이 움직이는 방향을 확인해 보세요.';
          return true;
        },
        status: () => '놓은 카드 ' + S.sc.pl.placed + ' / 5 · 맞은 칸 ' + (5 - S.sc.pl.wrongIds().filter((id) => !SCHEMA_CARDS.find((q) => q.id === id).decoy).length) + ' / 5',
        explain: '활동 구간(②)은 Na⁺이 들어와 <b>안쪽이 +(탈분극)</b>, 앞쪽(③)은 아직 <b>분극(안쪽 −)</b>, 뒤쪽(①)은 K⁺이 나가는 <b>재분극</b>이에요. 파동은 t₁에서 t₂로 <b>오른쪽</b>으로 가고(④), 국소 전류는 활동 구간에서 <b>앞쪽</b>으로 흘러요(⑤).',
      },
      {
        title: '발끝에서 뇌까지 몇 ms?', manual: true,
        goal: '1.2 m를 신호가 지나는 시간을 <b>ms 단위</b>로 구해서 입력하고, 말이집이 손상된 신경과 비교한 뒤 <b>✔ 확인하기</b>를 누르세요.',
        hint: 't = d / v예요. 말이집 신경 v = 100 m/s이면 t = 1.2 / 100 = 0.012 s = 12 ms. 무말이집은 v = 1 m/s예요.',
        setup() { setSub('time'); },
        check() {
          const a = parseFloat($('#inTm1').value), b = parseFloat($('#inTm2').value), s = $('#selTm').value;
          const e1 = $('#inTm1'), e2 = $('#inTm2'), e3 = $('#selTm');
          if (isNaN(a) || isNaN(b)) return '두 시간을 모두 입력해요. (단위: ms)';
          const ok1 = Math.abs(a - 12) < 0.01, ok2 = Math.abs(b - 1200) < 0.5;
          e1.classList.toggle('ok', ok1); e1.classList.toggle('bad', !ok1); e2.classList.toggle('ok', ok2); e2.classList.toggle('bad', !ok2);
          if (!ok1 || !ok2) return (Math.abs(a - 0.012) < 0.0001 || Math.abs(b - 1.2) < 0.001) ? '초(s) 단위로 쓴 것 같아요. 이 칸은 ms 단위예요. (1 s = 1000 ms)' : 't = d / v예요. 단위를 ms로 바꿔서 입력해요.';
          if (!s) return '마지막 문장도 골라요.';
          const ok3 = s === 'long'; e3.classList.toggle('ok', ok3); e3.classList.toggle('bad', !ok3);
          if (!ok3) return '말이집이 손상되어 속도가 느려지면 도달 시간은 어떻게 될까요?';
          return true;
        },
        status: () => '말이집 신경 ' + ($('#inTm1').value || '?') + ' ms · 무말이집 ' + ($('#inTm2').value || '?') + ' ms',
        explain: '말이집 신경: 1.2 / 100 = 0.012 s = <b>12 ms</b>, 무말이집 신경: 1.2 / 1 = <b>1.2 s = 1200 ms</b>(약 100배). 말이집이 손상되면 속도가 줄어(예: 20 m/s → 60 ms) 도달 시간이 <b>길어져요</b>.',
      },
      {
        type: 'quiz', title: '말이집 신경의 에너지 효율',
        goal: '같은 굵기의 신경에서 <b>말이집이 있는 쪽이 에너지 효율이 좋은</b> 까닭은?',
        setup() { setSub('diagram'); },
        choices: ['말이집이 ATP를 만들어 주어서', '이온이 드나드는 곳이 랑비에 결절뿐이라 Na⁺–K⁺ 펌프가 되돌려야 할 이온이 적어서', '활동 전위의 크기가 훨씬 작아서', '신호가 아주 느려서'],
        answer: 1,
        feedback: ['말이집은 ATP를 만들지 않고 이온이 새는 것을 막는 절연체예요.', '', '활동 전위의 크기는 같아요(+30 mV).', '말이집 신경은 오히려 훨씬 빨라요.'],
        explain: '말이집 신경에서는 결절에서만 이온이 드나들어서, 활동 전위 한 번이 끝난 뒤 <b>Na⁺–K⁺ 펌프가 제자리로 돌려놓아야 할 이온이 훨씬 적어요</b>(ATP 절약). 빠르면서 에너지도 적게 써요.',
      },
    ],
  },
];

game = SciSim.game({
  simId: 'hb-neuron-conduction', mount: '#game', badge: '신경 전도 박사', homeHref: '../../index.html#hb',
  featureLabels: { local: '🔌 축삭 7구간 · 구간별 그래프 · 📸 순간 포착', myelin: '💨 무말이집·말이집 경주 · 말이집 손상', calc: '🧮 두 전극 기록 · 시각 선 · 계산 표', schema: '📐 축삭 모식도 · 카드 놓기 · 1.2 m 시간 비교' },
  onFeatures() { updateCtl(); },
  levels,
});

/* ---------- 시작 ---------- */
resetCD(); S.mc = newMC(0); S.ca = newCA(); S.sc = newSC();
setScene('local');
let lastFree = false, lastMode = '', lastSub = '';
SciSim.loop((dt, t) => {
  clock = t;
  if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
  if (S.mode !== lastMode || S.sub !== lastSub) { lastMode = S.mode; lastSub = S.sub; PT = S.mode === 'local' ? PT_LOCAL : S.mode === 'calc' ? PT_CALC : S.mode === 'schema' && S.sub === 'diagram' ? PT_SCHEMA : null; updateCtl(); }
  view.apply();
  if (S.mode === 'local') { stepCD(dt); drawLocalScene(dt); }
  else if (S.mode === 'myelin') { stepMC(dt); drawRaceScene(dt); }
  else if (S.mode === 'calc') drawCalcScene(dt);
  else { if (S.sub === 'diagram') drawSchemaScene(dt); else { stepTime(dt); drawTimeScene(dt); } }
  if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,243,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
  readouts();
});

window.__sim = {
  S, VW, VH, get game() { return game; }, setScene, setSub, LG, MG, CG, SG, CASES, stimulate, startRace, caX, caseCur, setCurs, setSnap, startCapture, segX, activeSegs, mxs, raceStarts,
  stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'local') stepCD(0.02); else if (S.mode === 'myelin') stepMC(0.02); } },
};

})();
