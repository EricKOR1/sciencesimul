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
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 시냅스 전달과 약물 (단원 3차시)
   성취기준 [12생과02-02] 시냅스를 통한 신경 신호의 전달 과정을 이해하고, 약물이 시냅스 전달에 영향을 미치는 사례를 조사하여 발표할 수 있다.
   ① 모형: 시냅스 구조  ② 탐구: 신호 전달  ③ 분석: 신호 합산  ④ 조사: 약물 조사
   ========================================================= */

/* ================= 시냅스 모형 (구조 · 전달 · 약물이 함께 쓰는 장면) ================= */
const SB = [0, 0.1, 0.3, 0.5, 0.8, 2.5, 6.0];                    // 단계가 끝날 때의 시각 (ms)
const DUR = [1.5, 2.0, 2.0, 2.3, 2.6, 3.4];                       // 단계별 재생 시간 (초)
const STAGES = [
  { n: '활동 전위 도착', d: '활동 전위(전기 신호)가 축삭 말단에 도착해 말단 막의 전위가 크게 변해요.' },
  { n: 'Ca²⁺ 유입', d: '막전위 변화로 전압 의존 Ca²⁺ 통로가 열리고, 세포 밖의 Ca²⁺이 말단 안으로 들어와요.' },
  { n: '소낭 융합', d: 'Ca²⁺이 늘면 신경전달물질이 든 시냅스 소낭이 막과 융합해요.' },
  { n: '방출·확산', d: '신경전달물질이 시냅스 틈(약 20 nm)으로 방출되어 확산해요. 지연은 약 0.5~1 ms예요.' },
  { n: '수용체 결합', d: '신경전달물질이 다음 뉴런의 수용체에 결합하면 이온 통로가 열려 Na⁺이 들어와요(화학 신호 → 전기 신호).' },
  { n: '분해·재흡수', d: '신경전달물질이 분해 효소에 분해되거나 말단으로 재흡수되어 신호가 끝나요.' },
];
function geo(R) {
  const P = (u, v) => ({ x: R.x + u * R.w, y: R.y + v * R.h });
  const g = { R, P, yc: R.y + 0.44 * R.h, ys: R.y + 0.56 * R.h, tl: R.x + 0.2 * R.w, tr: R.x + 0.8 * R.w, pl: R.x + 0.05 * R.w, pr: R.x + 0.95 * R.w };
  g.rv = clamp(Math.min(R.w, R.h) * 0.043, 10, 16);
  g.site = [0.34, 0.5, 0.66].map((u) => R.x + u * R.w);               // 소낭 융합 자리 = 수용체 위치
  g.ca = [0.42, 0.58].map((u) => R.x + u * R.w);                        // Ca²⁺ 통로
  g.tp = [0.27, 0.73].map((u) => R.x + u * R.w);                        // 재흡수 운반체
  g.mit = [{ u: 0.29, v: 0.2, rx: 0.06, ry: 0.045 }, { u: 0.71, v: 0.22, rx: 0.06, ry: 0.045 }];
  g.res = [[0.40, 0.13], [0.5, 0.24], [0.6, 0.13], [0.45, 0.30], [0.56, 0.31], [0.34, 0.27], [0.66, 0.28]].map((a) => P(a[0], a[1]));   // 저장 소낭
  g.th = 14;                                                          // 막 두께
  g.cl = g.pl + 6; g.cr = g.pr - 6;                                    // 시냅스 틈 x 범위
  return g;
}
class SynFlow {
  constructor(rect, opts) { this.R = rect; this.g = geo(rect); this.opts = opts || {}; this.reset(); }
  setRect(R) { this.R = R; this.g = geo(R); }
  reset() {
    const g = this.g;
    this.stage = 0; this.t = 0; this.simMs = 0; this.simFrom = 0; this.simTo = 0; this.auto = false; this.pause = 0;
    this.pulse = 0; this.glow = 0; this.caOpen = 0; this.fuse = [0, 0, 0]; this.ro = [0, 0, 0]; this.vPost = -70; this.hist = []; this.visited = {}; this.done = false; this.revT = -1;
    this.ca = []; this.nt = []; this.enz = []; this.na = []; this.fx = []; this.mim = []; this.blk = []; this.recycled = 0; this.broken = 0;
    this.bound = [[], [], []];
    for (let i = 0; i < 8; i++) this.ca.push({ x: rnd(g.cl + 30, g.cr - 30), y: rnd(g.yc + 8, g.ys - 8), vx: rnd(-20, 20), vy: rnd(-10, 10), mode: 'cleft', path: null, pi: 0, delay: rnd(0, 0.9) });
    for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) this.nt.push({ site: s, k, x: g.site[s], y: g.yc - g.rv - 4, vx: 0, vy: 0, state: 'ves', r: -1, fate: null, wait: 0, pi: 0, path: null });
    for (let i = 0; i < 3; i++) this.enz.push({ x: rnd(g.cl + 40, g.cr - 40), y: rnd(g.yc + 10, g.ys - 10), vx: rnd(-10, 10), vy: rnd(-6, 6) });
    if (this.opts.staticNt) for (let i = 0; i < 4; i++) { const p = g.P([0.42, 0.47, 0.58, 0.62][i], [0.49, 0.51, 0.48, 0.5][i]); this.nt.push({ site: -1, state: 'still', x: p.x, y: p.y, vx: 0, vy: 0 }); }
  }
  /* 약물 정보를 입력(바뀌면 장면을 처음으로) */
  setDrug(d) { this.drug = d || null; this.reset(); if (this.drug) { this.drugMode(); } }
  drugMode() { /* 약물 입자는 4단계에 들어올 때 만들어요 */ }
  enter(k) {
    const g = this.g; this.stage = k; this.t = 0; this.simFrom = SB[k - 1]; this.simTo = SB[k]; this.visited[k] = true; this.pause = 0;
    if (k === 1) { this.pulse = 0; this.glow = 1; }
    if (k === 4) {
      if (this.drug === 'nicotine') for (let i = 0; i < 3; i++) this.mim.push({ x: rnd(g.cl + 40, g.cr - 40), y: rnd(g.yc + 8, g.ys - 8), vx: rnd(-20, 20), vy: rnd(-10, 10), state: 'free', r: -1 });
      if (this.drug === 'curare') for (let i = 0; i < 3; i++) this.blk.push({ x: g.site[i], y: g.yc + 14, vx: 0, vy: 0, state: 'free', r: i, tx: g.site[i] });
    }
    if (k === 6) { this.nt.forEach((p) => { if (p.state === 'free' || p.state === 'bound') p.fate = this.drug === 'organo' ? 'break' : this.drug === 'ssri' ? 'take' : (Math.random() < 0.55 ? 'break' : 'take'); p.wait = rnd(0.2, 1.4); }); }
  }
  next() { if (this.stage < 6 && !this.revActive()) { this.enter(this.stage + 1); return true; } return false; }
  revActive() { return this.revT >= 0 && this.revT < 3.2; }
  startRev() { this.reset(); this.revT = 0; }
  get blocked() { return !!this.opts.block && this.opts.block(); }
  update(dt) {
    const g = this.g, st = this.stage;
    const R = this.R, drug = this.drug;
    if (this.revT >= 0) this.revT += dt;
    // 단계 진행
    if (st >= 1) {
      this.t += dt;
      this.simMs = lerp(this.simFrom, this.simTo, clamp(this.t / DUR[st - 1], 0, 1));
      if (st === 6 && this.t >= DUR[5]) this.done = true;
      if (this.auto && !this.revActive()) {
        if (this.t >= DUR[st - 1] + 0.5 && st < 6) this.enter(st + 1);
        else if (st === 6 && this.t >= DUR[5] + 1.2) { if (this.opts.loop) { const keepD = this.drug, a = this.auto; this.reset(); this.drug = keepD; this.auto = a; this.enter(1); } else this.auto = false; }
      }
    } else if (this.auto && this.stage === 0) this.enter(1);
    this.pulse = st === 1 ? clamp(this.t / 1.2, 0, 1) : (st > 1 ? 1 : 0);
    this.glow = SciSim.approach(this.glow, st === 1 && this.pulse >= 1 ? 1 : st >= 2 ? 0.0 : this.glow, dt, st === 1 ? 6 : 2.2);
    const blocked = this.blocked;
    // Ca²⁺ 통로
    const caTarget = (st === 2 || st === 3) && !blocked ? 1 : 0;
    this.caOpen = SciSim.approach(this.caOpen, caTarget, dt, 6);
    this.ca.forEach((c) => this.stepCa(c, dt, st, blocked));
    // 소낭 융합 · 방출
    const fuseGo = st >= 3 && !blocked && drug !== 'botulinum';
    for (let i = 0; i < 3; i++) {
      this.fuse[i] = fuseGo ? Math.min(1, this.fuse[i] + dt / (1.5 + i * 0.12)) : this.fuse[i];
      if (this.fuse[i] > 0.55) this.nt.forEach((p) => { if (p.site === i && p.state === 'ves') { p.state = 'free'; p.x = g.site[i] + rnd(-8, 8); p.y = g.yc + rnd(6, 12); p.vx = rnd(-30, 30); p.vy = rnd(15, 40); } });
    }
    // 입자 움직임
    this.nt.forEach((p) => this.stepNt(p, dt, st, drug));
    this.mim.forEach((p) => this.stepMim(p, dt, st));
    this.blk.forEach((p) => this.stepBlk(p, dt));
    this.enz.forEach((e) => { e.vx += rnd(-1, 1) * dt * 300; e.vy += rnd(-1, 1) * dt * 300; const sp = Math.hypot(e.vx, e.vy), tg = clamp(sp, 8, 22); e.vx *= tg / sp; e.vy *= tg / sp; e.x += e.vx * dt; e.y += e.vy * dt; this.bounceCleft(e, 6); });
    // 수용체 열림 → 막전위
    for (let r = 0; r < 3; r++) {
      const has = this.bound[r].length > 0 || this.mim.some((m) => m.state === 'bound' && m.r === r);
      this.ro[r] = SciSim.approach(this.ro[r], has ? 1 : 0, dt, 5);
    }
    const tgtV = -70 + 5 * (this.ro[0] + this.ro[1] + this.ro[2]) / 3;
    this.vPost = SciSim.approach(this.vPost, tgtV, dt, 6);
    if (st >= 1 && this.opts.hist) { const last = this.hist[this.hist.length - 1]; if (!last || this.simMs - last.t >= 0.02 || this.simMs < last.t) this.hist.push({ t: this.simMs, v: this.vPost }); }
    // Na⁺ 유입 (열린 수용체마다)
    for (let r = 0; r < 3; r++) if (this.ro[r] > 0.6 && Math.random() < dt * 5) this.na.push({ x: g.site[r] + rnd(-4, 4), y: g.ys - 22, age: 0, dx: rnd(-14, 14) });
    this.na.forEach((n) => { n.age += dt; }); this.na = this.na.filter((n) => n.age < 1.7);
    this.fx.forEach((f) => { f.t += dt; }); this.fx = this.fx.filter((f) => f.t < 1.2);
  }
  bounceCleft(p, r) { const g = this.g; if (p.x < g.cl + r) { p.x = g.cl + r; p.vx = Math.abs(p.vx); } if (p.x > g.cr - r) { p.x = g.cr - r; p.vx = -Math.abs(p.vx); } if (p.y < g.yc + g.th / 2 + r) { p.y = g.yc + g.th / 2 + r; p.vy = Math.abs(p.vy); } if (p.y > g.ys - g.th / 2 - r) { p.y = g.ys - g.th / 2 - r; p.vy = -Math.abs(p.vy); } }
  stepCa(c, dt, st, blocked) {
    const g = this.g;
    if (c.mode === 'cleft') {
      c.vx += rnd(-1, 1) * dt * 400; c.vy += rnd(-1, 1) * dt * 400; const sp = Math.hypot(c.vx, c.vy), tg = clamp(sp, 14, 36); c.vx *= tg / sp; c.vy *= tg / sp;
      c.x += c.vx * dt; c.y += c.vy * dt; this.bounceCleft(c, 5);
      if (st >= 2 && !blocked && this.caOpen > 0.5 && c.delay >= 0) { c.delay -= dt; if (c.delay < 0) { const cx = g.ca.reduce((a, b) => (Math.abs(b - c.x) < Math.abs(a - c.x) ? b : a)); c.mode = 'travel'; c.path = [{ x: cx, y: g.yc + g.th / 2 + 6 }, { x: cx, y: g.yc - g.th / 2 - 8 }, { x: cx + rnd(-30, 30), y: g.yc - rnd(18, 34) }]; c.pi = 0; } }
    } else if (c.mode === 'travel') {
      const q = c.path[c.pi], dx = q.x - c.x, dy = q.y - c.y, d = Math.hypot(dx, dy), sp = 90 * dt;
      if (d <= sp) { c.x = q.x; c.y = q.y; c.pi++; if (c.pi >= c.path.length) { c.mode = 'in'; c.vx = rnd(-14, 14); c.vy = rnd(-8, 8); } } else { c.x += dx / d * sp; c.y += dy / d * sp; }
    } else {
      c.vx += rnd(-1, 1) * dt * 300; c.vy += rnd(-1, 1) * dt * 300; const sp = Math.hypot(c.vx, c.vy), tg = clamp(sp, 10, 26); c.vx *= tg / sp; c.vy *= tg / sp;
      c.x += c.vx * dt; c.y += c.vy * dt;
      const x0 = g.tl + 14, x1 = g.tr - 14, y0 = g.yc - 62, y1 = g.yc - g.th / 2 - 6;
      if (c.x < x0) { c.x = x0; c.vx = Math.abs(c.vx); } if (c.x > x1) { c.x = x1; c.vx = -Math.abs(c.vx); } if (c.y < y0) { c.y = y0; c.vy = Math.abs(c.vy); } if (c.y > y1) { c.y = y1; c.vy = -Math.abs(c.vy); }
    }
  }
  freeRecep(r) { return this.bound[r].length < 2 && !this.blk.some((b) => b.r === r && b.state === 'sit'); }
  stepNt(p, dt, st, drug) {
    const g = this.g;
    if (p.state === 'ves' || p.state === 'still' || p.state === 'gone') return;
    if (p.state === 'free') {
      p.vx += rnd(-1, 1) * dt * 600; p.vy += rnd(-1, 1) * dt * 600 + (st >= 4 ? 8 * dt : 0);
      const sp = Math.hypot(p.vx, p.vy), tg = clamp(sp, 18, 50); p.vx *= tg / sp; p.vy *= tg / sp;
      p.x += p.vx * dt; p.y += p.vy * dt; this.bounceCleft(p, 3.2);
      // 수용체에 끌려 결합 (5단계부터)
      if (st === 5 || (st === 6 && (drug === 'ssri' || drug === 'organo'))) {
        let best = -1, bd = 1e9; for (let r = 0; r < 3; r++) if (this.freeRecep(r)) { const d = Math.hypot(p.x - g.site[r], p.y - (g.ys - 9)); if (d < bd) { bd = d; best = r; } }
        if (best >= 0) { const tx = g.site[best], ty = g.ys - 9, d = Math.max(bd, 1); p.vx += (tx - p.x) / d * dt * 260; p.vy += (ty - p.y) / d * dt * 260; if (d < 11) { p.state = 'bound'; p.r = best; this.bound[best].push(p); p.bx = (this.bound[best].length - 1) * 11 - 5; } }
      }
      // 6단계: 재흡수 운반체로
      if (st === 6 && p.fate === 'take' && p.wait <= 0 && drug !== 'ssri') this.startTake(p);
      else if (st === 6 && p.fate === 'break' && p.wait <= 0 && drug !== 'organo') { p.state = 'broken'; p.wait = 0.9; this.broken++; this.fx.push({ x: p.x, y: p.y, t: 0, txt: '분해' }); }
      if (st === 6) p.wait -= dt;
    } else if (p.state === 'bound') {
      p.x = g.site[p.r] + p.bx; p.y = g.ys - 10;
      if (st === 6) {
        p.wait -= dt;
        if (p.wait <= 0 && p.fate === 'break' && drug !== 'organo') this.breakNt(p);
        else if (p.wait <= 0 && p.fate === 'take' && drug !== 'ssri') { this.bound[p.r] = this.bound[p.r].filter((q) => q !== p); p.state = 'free'; p.r = -1; this.startTake(p); }
      }
    } else if (p.state === 'take') {
      const q = p.path[p.pi], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), sp = 80 * dt;
      if (d <= sp) { p.x = q.x; p.y = q.y; p.pi++; if (p.pi >= p.path.length) { p.state = 'gone'; this.recycled++; } } else { p.x += dx / d * sp; p.y += dy / d * sp; }
    } else if (p.state === 'broken') { p.wait -= dt; if (p.wait <= 0) p.state = 'gone'; }
  }
  startTake(p) { const g = this.g, tx = g.tp.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a)); p.state = 'take'; p.pi = 0; p.path = [{ x: tx, y: g.yc + g.th / 2 + 6 }, { x: tx, y: g.yc - g.th / 2 - 10 }, { x: tx, y: g.yc - 24 }]; }
  breakNt(p) { this.bound[p.r] = this.bound[p.r].filter((q) => q !== p); p.state = 'broken'; p.wait = 0.9; this.broken++; this.fx.push({ x: p.x, y: p.y, t: 0, txt: '분해' }); }
  stepMim(p, dt, st) {
    const g = this.g;
    if (p.state === 'free') {
      p.vx += rnd(-1, 1) * dt * 600; p.vy += rnd(-1, 1) * dt * 600; const sp = Math.hypot(p.vx, p.vy), tg = clamp(sp, 18, 50); p.vx *= tg / sp; p.vy *= tg / sp; p.x += p.vx * dt; p.y += p.vy * dt; this.bounceCleft(p, 4);
      if (st >= 5) { let best = -1, bd = 1e9; for (let r = 0; r < 3; r++) if (this.bound[r].length + this.mim.filter((m) => m.state === 'bound' && m.r === r).length < 2) { const d = Math.hypot(p.x - g.site[r], p.y - (g.ys - 9)); if (d < bd) { bd = d; best = r; } } if (best >= 0) { const tx = g.site[best], ty = g.ys - 9, d = Math.max(bd, 1); p.vx += (tx - p.x) / d * dt * 260; p.vy += (ty - p.y) / d * dt * 260; if (d < 11) { p.state = 'bound'; p.r = best; p.bx = 6 + this.mim.filter((m) => m.state === 'bound' && m.r === best).length * 11 - 5; } } }
    } else { p.x = g.site[p.r] + (p.bx || 0); p.y = g.ys - 10; }
  }
  stepBlk(p, dt) {
    const g = this.g;
    if (p.state === 'free') { const tx = g.site[p.r], ty = g.ys - 12, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp = 38 * dt; if (d <= sp) { p.x = tx; p.y = ty; p.state = 'sit'; } else { p.x += dx / d * sp; p.y += dy / d * sp; } }
  }
}

/* ================= 시냅스 그리기 ================= */
const COLNT = '#ec4899';
function drawSynapse(sf, o) {
  o = o || {};
  const g = sf.g, R = sf.R, rv = g.rv, th = g.th, st = sf.stage, drug = sf.drug, blocked = sf.blocked;
  const bob = (i) => (RM ? 0 : Math.sin(clock * 1.6 + i * 1.7) * 2);
  ctx.save();
  D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.clip();
  // 세포 밖 바탕
  const bg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); bg.addColorStop(0, '#fff8ea'); bg.addColorStop(1, '#fff3de'); ctx.fillStyle = bg; ctx.fillRect(R.x, R.y, R.w, R.h);
  // 다음 뉴런 (아래)
  const pg = ctx.createLinearGradient(0, g.ys, 0, R.y + R.h); pg.addColorStop(0, '#efe4ff'); pg.addColorStop(1, '#ddcbfb');
  ctx.beginPath(); ctx.moveTo(g.pl, R.y + R.h + 30); ctx.lineTo(g.pl, g.ys + 24); ctx.quadraticCurveTo(g.pl, g.ys, g.pl + 24, g.ys); ctx.lineTo(g.pr - 24, g.ys); ctx.quadraticCurveTo(g.pr, g.ys, g.pr, g.ys + 24); ctx.lineTo(g.pr, R.y + R.h + 30); ctx.closePath();
  ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = '#8b6bd0'; ctx.lineWidth = 3; ctx.stroke();
  // 축삭 말단 (위)
  const nx0 = R.x + 0.45 * R.w, nx1 = R.x + 0.55 * R.w;
  ctx.beginPath(); ctx.moveTo(nx0, R.y - 4); ctx.lineTo(nx0, R.y + 0.07 * R.h); ctx.bezierCurveTo(nx0, R.y + 0.15 * R.h, g.tl, R.y + 0.1 * R.h, g.tl, R.y + 0.24 * R.h); ctx.lineTo(g.tl, g.yc - 18); ctx.quadraticCurveTo(g.tl, g.yc, g.tl + 18, g.yc); ctx.lineTo(g.tr - 18, g.yc); ctx.quadraticCurveTo(g.tr, g.yc, g.tr, g.yc - 18); ctx.lineTo(g.tr, R.y + 0.24 * R.h); ctx.bezierCurveTo(g.tr, R.y + 0.1 * R.h, nx1, R.y + 0.15 * R.h, nx1, R.y + 0.07 * R.h); ctx.lineTo(nx1, R.y - 4); ctx.closePath();
  const tg = ctx.createLinearGradient(0, R.y, 0, g.yc); tg.addColorStop(0, '#e1f1ff'); tg.addColorStop(1, '#c4e0fa');
  ctx.save(); if (sf.glow > 0.05) { ctx.shadowColor = 'rgba(255,200,40,' + sf.glow + ')'; ctx.shadowBlur = 26 * sf.glow; }
  ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = sf.glow > 0.2 ? C.mix('#2f6fb3', '#f5a300', sf.glow) : '#2f6fb3'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  // 미토콘드리아
  g.mit.forEach((m) => { const c = g.P(m.u, m.v), rx = m.rx * R.w, ry = m.ry * R.h; const mg = ctx.createLinearGradient(0, c.y - ry, 0, c.y + ry); mg.addColorStop(0, '#ffc98a'); mg.addColorStop(1, '#f59a4a'); ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c2691c'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); for (let i = -2; i <= 2; i++) { const x = c.x + i * rx * 0.34; ctx.moveTo(x, c.y - ry * 0.7); ctx.lineTo(x + rx * 0.14, c.y); ctx.lineTo(x, c.y + ry * 0.7); } ctx.strokeStyle = 'rgba(194,105,28,.7)'; ctx.lineWidth = 1.5; ctx.stroke(); });
  // 막 (이중층)
  const gapsPre = g.ca.map((x) => [x - 15, x + 15]).concat(g.tp.map((x) => [x - 13, x + 13]));
  drawBilayer(g.tl + 8, g.tr - 8, g.yc, th, gapsPre);
  drawBilayer(g.pl + 4, g.pr - 4, g.ys, th, g.site.map((x) => [x - 15, x + 15]));
  // 통로 · 운반체 · 수용체
  g.ca.forEach((x) => { drawChannel(x, g.yc, 28, th + 8, sf.caOpen, COL.ca, { body: '#86b9dc' }); if (blocked) { D.sphere(x, g.yc + th / 2 + 8, 8, '#e2464b', { gloss: false, text: '✕', textScale: 1 }); } });
  g.tp.forEach((x) => { const gg = ctx.createLinearGradient(0, g.yc - th / 2 - 4, 0, g.yc + th / 2 + 4); gg.addColorStop(0, '#f1cf8c'); gg.addColorStop(1, '#d9a24a'); ctx.fillStyle = gg; ctx.strokeStyle = '#9a6a1c'; ctx.lineWidth = 1.6; D.roundRect(x - 12, g.yc - th / 2 - 4, 24, th + 8, 6); ctx.fill(); ctx.stroke(); T(x, g.yc + 5, '↑', 14, '#7a4f12', 'center', 900); if (drug === 'ssri') D.sphere(x, g.yc + th / 2 + 9, 8, '#e2464b', { gloss: false, text: '✕', textScale: 1 }); });
  g.site.forEach((x, r) => { drawChannel(x, g.ys, 28, th + 8, sf.ro[r], '#8b5cf6', { body: '#b9a6ee' }); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7d5fd0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, g.ys - th / 2 - 1, 6, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  // 저장 소낭
  g.res.forEach((p, i) => { const y = p.y + bob(i); ctx.fillStyle = '#ffeaf2'; ctx.strokeStyle = '#d45a86'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, y, rv * 0.88, 0, TAU); ctx.fill(); ctx.stroke(); [[-3, -2], [3, -2], [0, 3]].forEach((q) => { ctx.fillStyle = COLNT; ctx.beginPath(); ctx.arc(p.x + q[0] * rv / 12, y + q[1] * rv / 12, 2.4, 0, TAU); ctx.fill(); }); });
  // 막에 붙은 소낭 (융합)
  for (let i = 0; i < 3; i++) {
    const f = sf.fuse[i], x = g.site[i], cy0 = g.yc - rv - 3, cy = cy0 + f * (rv * 0.95), rr = rv * (1 - 0.18 * f);
    const alpha = f > 0.92 ? 1 - (f - 0.92) / 0.08 * 0.75 : 1;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffeaf2'; ctx.strokeStyle = '#d45a86'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, rr, 0, TAU); ctx.fill(); ctx.stroke();
    if (f > 0.4) { ctx.fillStyle = '#fff8ea'; D.roundRect(x - rr * 0.5 * Math.min(1, (f - 0.4) / 0.4), g.yc - th / 2 - 1, rr * Math.min(1, (f - 0.4) / 0.4), th + 3, 3); ctx.fill(); }
    sfNtInVes(sf, i, x, cy, rr);
    ctx.restore();
    if (drug === 'botulinum' && st >= 1) { ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(x, g.yc - rv * 0.6); ctx.lineTo(x - 7, g.yc - rv * 0.6 - 12); ctx.lineTo(x + 7, g.yc - rv * 0.6 - 12); ctx.closePath(); ctx.fill(); if (st >= 3) D.sphere(x, g.yc - rv * 2 - 12, 9, '#e2464b', { gloss: false, text: '✕', textScale: 1 }); }
  }
  ctx.restore();
  // 라벨
  T(R.x + 14, R.y + 22, '신호를 보내는 뉴런의 축삭 말단', PHONE ? 12.5 : 13.5, '#2f6fb3', 'left', 800);
  T(R.x + 14, R.y + R.h - 12, '신호를 받는 다음 뉴런', PHONE ? 12.5 : 13.5, '#6d49c0', 'left', 800);
  T(R.x + R.w - 12, (g.yc + g.ys) / 2 + 4, '시냅스 틈 (약 20 nm)', 12.5, '#a16207', 'right', 800);
  // 입자들
  sf.ca.forEach((c) => { D.sphere(c.x, c.y, 5, COL.ca, { gloss: true }); });
  sf.enz.forEach((e) => { ctx.fillStyle = '#22c55e'; ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 6.5, 0.6, TAU - 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); if (drug === 'organo') D.sphere(e.x, e.y - 11, 6, '#e2464b', { gloss: false, text: '✕', textScale: 1 }); });
  sf.blk.forEach((b) => { ctx.fillStyle = '#475569'; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-5.5, -5.5, 11, 11); ctx.restore(); });
  sf.mim.forEach((m) => { ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.2; ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-4.5, -4.5, 9, 9); ctx.strokeRect(-4.5, -4.5, 9, 9); ctx.restore(); });
  sf.nt.forEach((p) => { if (p.state === 'ves' || p.state === 'gone') return; const a = p.state === 'broken' ? clamp(p.wait / 0.9, 0, 1) : 1; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p.state === 'broken' ? '#9ca3af' : COLNT; ctx.beginPath(); ctx.arc(p.x, p.y, p.state === 'broken' ? 2.6 : 3.6, 0, TAU); ctx.fill(); if (p.state !== 'broken') { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 1.2, 0, TAU); ctx.fill(); } ctx.restore(); });
  sf.na.forEach((n) => { const y = g.ys - 22 + n.age * 45, x = n.x + (y > g.ys ? n.dx * (y - g.ys) / 60 : 0); ctx.save(); ctx.globalAlpha = n.age > 1.2 ? (1.7 - n.age) / 0.5 : 1; D.sphere(x, y, 5, COL.na, { gloss: true }); ctx.restore(); });
  sf.fx.forEach((f) => { const k = f.t / 1.2; T(f.x, f.y - 8 - k * 18, f.txt, 12.5, '#15803d', 'center', 800, { alpha: 1 - k, stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); });
  // 활동 전위 펄스 (축삭 → 말단)
  if (st === 1 && sf.pulse < 1) { const y = R.y + 0.02 * R.h + sf.pulse * (g.yc - R.y) * 0.5; D.glow(R.x + R.w / 2, y, 30, '#ffd447', 0.9); D.sphere(R.x + R.w / 2, y, 7, '#ffb400', { gloss: true }); }
  if (sf.glow > 0.3) D.label(R.x + R.w / 2, R.y + 0.15 * R.h + 14, '⚡ +30 mV', { bg: '#f59e0b', size: 13.5 });
  if (blocked && st >= 2) D.label(R.x + R.w / 2, g.yc - 54, 'Ca²⁺ 통로 차단 → 소낭이 융합하지 못해요', { bg: '#e2464b', size: PHONE ? 12 : 13.5 });
  if (sf.revT >= 0) drawReverse(sf);
  // 소낭 융합 불가 안내 (보툴리눔)
  if (drug === 'botulinum' && st >= 3) D.label(R.x + R.w / 2, g.yc - 54, '독소가 소낭 융합을 막아 분비되지 않아요', { bg: '#7c3aed', size: PHONE ? 12 : 13.5 });
  if (drug === 'curare' && st >= 5) D.label(R.x + R.w / 2, g.ys + 44, '쿠라레가 수용체를 막아 결합할 수 없어요', { bg: '#475569', size: PHONE ? 12 : 13.5 });
  if (drug === 'nicotine' && st >= 5) D.label(R.x + R.w / 2, g.ys + 44, '니코틴이 아세틸콜린 대신 수용체에 결합해요', { bg: '#f59e0b', size: PHONE ? 12 : 13.5 });
  if (drug === 'organo' && st >= 6) D.label(R.x + R.w / 2, g.ys + 44, '분해 효소가 억제되어 신경전달물질이 쌓여요', { bg: '#e2464b', size: PHONE ? 12 : 13.5 });
  if (drug === 'ssri' && st >= 6) D.label(R.x + R.w / 2, g.ys + 44, '재흡수가 억제되어 틈에 오래 남아요', { bg: '#e2464b', size: PHONE ? 12 : 13.5 });
}
function sfNtInVes(sf, i, x, y, r) {
  const mine = sf.nt.filter((p) => p.site === i && p.state === 'ves');
  mine.forEach((p, k) => { const a = [[-1, -1], [1, -1], [-1, 1], [1, 1]][k % 4]; ctx.fillStyle = COLNT; ctx.beginPath(); ctx.arc(x + a[0] * r * 0.38, y + a[1] * r * 0.34, 2.6, 0, TAU); ctx.fill(); });
}
function drawReverse(sf) {
  const g = sf.g, R = sf.R, t = sf.revT, cx = R.x + R.w / 2;
  const k = clamp(t / 2.0, 0, 1), y = lerp(R.y + R.h - 20, g.ys + 8, k);
  if (t < 2.0) { D.glow(cx, y, 30, '#ef4444', 0.8); D.sphere(cx, y, 7, '#ef4444', { gloss: true }); }
  T(cx, R.y + R.h - 34, '← 다음 뉴런에서 시작한 활동 전위', 13, '#b91c1c', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
  if (t >= 2.0) { const a = clamp((t - 2.0) / 0.4, 0, 1); ctx.save(); ctx.globalAlpha = a; D.sphere(cx, g.ys, 15, '#e2464b', { gloss: false, text: '✕', textScale: 1.1 }); ctx.restore(); D.label(cx, (g.yc + g.ys) / 2 - 30, '다음 뉴런에는 소낭이 없어서 방출할 수 없어요', { bg: '#e2464b', size: PHONE ? 12 : 13.5 }); D.label(cx, g.yc - 54, '이전 뉴런에는 수용체가 없어서 받을 수 없어요', { bg: '#64748b', size: PHONE ? 12 : 13.5 }); }
}
/* 다음 뉴런의 막전위 그래프 */
function drawPostGraph(sf, r, o) {
  o = o || {};
  panel(r.x, r.y, r.w, r.h, 14);
  T(r.x + 12, r.y + 22, '📈 다음 뉴런의 막전위', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
  const pl = { x: r.x + (o.lm || 52), y: r.y + 34, w: r.w - (o.lm || 52) - 12, h: r.h - 34 - (o.bm || 48) };
  const A = makeAxes(pl, [0, 6], [-80, -50]);
  drawAxes(A, { xt: [0, 2, 4, 6], yt: [-80, -70, -60, -50], yf: (v) => mv(v), xl: '시간 (ms)', yl: '막전위 (mV)', ylx: o.ylx || 40, fs: 12.5, bg: '#fbfcfe' });
  hline(A, -70, '#3b82f6', null); hline(A, -55, '#e2464b', '역치 −55', { lx: pl.x + pl.w - 4, dy: 13, fs: 12 });
  if (sf.hist.length > 1) {
    ctx.save(); ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    sf.hist.forEach((q, i) => { const x = A.X(q.t), y = A.Y(clamp(q.v, -80, -50)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
    const last = sf.hist[sf.hist.length - 1]; D.sphere(A.X(last.t), A.Y(clamp(last.v, -80, -50)), 5, '#7c3aed', { gloss: true });
  }
  if (o.note && sf.stage >= 4) T(pl.x + 6, pl.y + 16, '지연 약 0.5~1 ms', 12.5, '#a16207', 'left', 800);
  return A;
}

/* ================= ① 시냅스 구조: 이름 붙이기 ================= */
const ST = PHONE
  ? { Dg: { x: 8, y: 62, w: 464, h: 300 }, ty: 8, by: 370, cw: 148, ch: 46 }
  : { Dg: { x: 60, y: 62, w: 680, h: 320 }, ty: 8, by: 390, cw: 124, ch: 42 };
const SNAMES = [
  { id: 'term', label: '축삭 말단', n: 1, u: [0.23, 0.34], x: PHONE ? 8 : 70, top: true },
  { id: 'ves', label: '시냅스 소낭', n: 2, u: [0.6, 0.13], x: PHONE ? 320 : 520, top: true },
  { id: 'mito', label: '미토콘드리아', n: 3, u: [0.29, 0.2], x: PHONE ? 164 : 270, top: true },
  { id: 'cleft', label: '시냅스 틈', n: 4, u: [0.2, 0.5], x: PHONE ? 8 : 70, top: false },
  { id: 'nt', label: '신경전달물질', n: 5, u: [0.58, 0.48], x: PHONE ? 164 : 330, top: false },
  { id: 'recep', label: '수용체', n: 6, u: [0.66, 0.56], x: PHONE ? 320 : 560, top: false },
];
function newSNamer() {
  const order = [4, 1, 5, 0, 3, 2];
  return new Placer({
    chips: order.map((k) => ({ id: SNAMES[k].id, label: SNAMES[k].label, col: '#16a34a' })),
    targets: SNAMES.map((q) => ({ id: 'slot' + q.n, ans: q.id, x: q.x, y: q.top ? ST.ty : ST.by, w: ST.cw, h: ST.ch })),
    tray: (i) => (PHONE ? { x: 8 + (i % 3) * 160, y: 438 + Math.floor(i / 3) * 58 } : { x: 14 + i * 129, y: 462 }), cw: ST.cw, ch: ST.ch, onChange() {},
  });
}
function drawStructScene(dt) {
  const sf = S.sf, pl = S.nm;
  bgFill('#eef3fb', '#f7f9fd');
  sf.update(dt); drawSynapse(sf);
  SNAMES.forEach((q) => {
    const t = pl.targets.find((x) => x.id === 'slot' + q.n), p = sf.g.P(q.u[0], q.u[1]);
    const sx = t.x + t.w / 2, sy = q.top ? t.y + t.h : t.y;
    ctx.save(); ctx.strokeStyle = '#4b6b8a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4b6b8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); ctx.stroke();
  });
  pl.drawTargets();
  pl.targets.forEach((t, i) => D.sphere(t.x + 4, t.y + 4, 11, '#4b6b8a', { gloss: false, text: String(i + 1), textScale: 1.15 }));
  T(PHONE ? 8 : 14, PHONE ? 428 : 450, pl.placed < 6 ? '👇 이름표를 끌어서 번호 칸에 놓아요 (눌러서 고르고 칸을 눌러도 돼요)' : '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12 : 13.5, pl.placed < 6 ? '#5a6679' : '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
}
const PT_STRUCT = { down(p) { return S.nm.down(p); }, move(p) { S.nm.move(p); }, up(p) { S.nm.up(p); }, hover(p) { return S.nm.hover(p); } };

/* ================= ② 신호 전달 ================= */
const FLG = PHONE
  ? { Dg: { x: 8, y: 8, w: 464, h: 292 }, GR: { x: 8, y: 308, w: 464, h: 136 }, BOT: { x: 8, y: 452, w: 464, h: 180 } }
  : { Dg: { x: 14, y: 14, w: 560, h: 392 }, GR: { x: 588, y: 14, w: 198, h: 270 }, SIG: { x: 588, y: 292, w: 198, h: 114 }, BOT: { x: 14, y: 414, w: 772, h: 134 } };
const PSHORT = ['도착', 'Ca²⁺', '융합', '방출', '결합', '분해'];
function drawFlowScene(dt) {
  const sf = S.sf2;
  bgFill('#eef3fb', '#f7f9fd');
  sf.update(dt); drawSynapse(sf);
  drawPostGraph(sf, FLG.GR, { note: true, bm: PHONE ? 46 : 50 });
  // 전기 → 화학 → 전기
  if (!PHONE) {
    const s = FLG.SIG; panel(s.x, s.y, s.w, s.h, 14);
    T(s.x + 12, s.y + 22, '🔁 신호의 변환', 13.5, '#26324a', 'left', 800);
    const st = sf.stage, cur = st <= 2 ? 0 : st <= 4 ? 1 : 2, items = [['⚡', '전기 신호', '#f59e0b'], ['🧪', '화학 신호', COLNT], ['⚡', '전기 신호', '#f59e0b']];
    items.forEach((it, i) => { const x = s.x + 38 + i * 62, y = s.y + 62, on = st > 0 && cur === i; D.sphere(x, y, on ? 22 : 18, on ? it[2] : '#cbd5e1', { gloss: true }); T(x, y + 7, it[0], 20, '#000', 'center', 600); T(x, y + 42, it[1], 12, on ? '#26324a' : '#94a3b8', 'center', 800); if (i < 2) T(x + 31, y + 5, '→', 16, '#64748b', 'center', 800); });
  }
  // 아래: 6단계 진행과 설명
  const B = FLG.BOT; panel(B.x, B.y, B.w, B.h, 14);
  const nx = (i) => B.x + (i + 0.5) * B.w / 6, ny = B.y + (PHONE ? 26 : 30);
  ctx.strokeStyle = '#d5deec'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(nx(0), ny); ctx.lineTo(nx(5), ny); ctx.stroke();
  ctx.strokeStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(nx(0), ny); ctx.lineTo(nx(Math.max(0, sf.stage - 1)), ny); ctx.stroke();
  for (let i = 0; i < 6; i++) { const on = sf.stage === i + 1, done = sf.stage > i + 1 || (sf.stage === i + 1 && sf.t > DUR[i]); D.sphere(nx(i), ny, on ? 17 : 14, done ? '#16a34a' : on ? '#f59e0b' : '#cbd5e1', { gloss: true, text: String(i + 1), textScale: 1.0 }); if (on) D.ring(nx(i), ny, 20, clock, { color: '#f59e0b', width: 2.5 }); T(nx(i), ny + 34, PHONE ? PSHORT[i] : STAGES[i].n, PHONE ? 12 : 13, on ? '#26324a' : '#7b8aa3', 'center', 800); }
  const msg = sf.revActive() || sf.revT >= 0 ? '다음 뉴런에서 자극해도 신호는 앞 뉴런으로 가지 못해요. 소낭은 축삭 말단에만, 수용체는 다음 뉴런에만 있어서 신호는 한 방향으로만 전달돼요.' : sf.stage === 0 ? '▶ 다음 단계 버튼이나 자동 재생으로 시냅스 전달 과정을 따라가 봐요. 한 번의 신호가 6단계를 거쳐요.' : (STAGES[sf.stage - 1].n + ': ' + STAGES[sf.stage - 1].d + (sf.blocked && sf.stage >= 2 ? ' (Ca²⁺ 통로가 막혀서 이 단계가 일어나지 않아요.)' : ''));
  textBlock(B.x + 16, B.y + (PHONE ? 78 : 88), B.w - 32, msg, PHONE ? 13 : 14, '#26324a', PHONE ? 19 : 20, 700);
  if (sf.simMs > 0) T(B.x + B.w - 14, B.y + B.h - 10, '경과 ' + sf.simMs.toFixed(1) + ' ms', 12.5, '#5a6679', 'right', 800);
}
/* ---- 순서 배열 ---- */
function newOrder() {
  const cw = PHONE ? 420 : 222, ch = PHONE ? 52 : 70;
  const slots = PHONE ? [0, 1, 2, 3, 4, 5].map((i) => ({ x: 40, y: 64 + i * 72 })) : [0, 1, 2, 3, 4, 5].map((i) => ({ x: 44 + (i % 3) * 252, y: 110 + Math.floor(i / 3) * 124 }));
  return new Reorder({ items: STAGES.map((s, i) => ({ id: 's' + i, label: s.n, col: '#2563eb', icon: ['⚡', '🔵', '🫧', '💨', '🔑', '♻️'][i] })), slots, cw, ch, solution: STAGES.map((s, i) => 's' + i), onChange() {} });
}
function drawOrderScene(dt) {
  const od = S.od; bgFill('#eef3fb', '#f7f9fd');
  T(PHONE ? 12 : 20, PHONE ? 26 : 32, '📋 시냅스 전달 순서 카드', PHONE ? 15 : 18, '#26324a', 'left', 800);
  T(PHONE ? 12 : 20, PHONE ? 46 : 58, '카드를 끌어서 자리를 바꿔 1번부터 6번까지 순서대로 놓아요', PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
  od.update(dt); od.draw();
  if (!PHONE) T(20, 380, '👉 한 번의 활동 전위가 다음 뉴런에 전해지기까지의 순서예요', 14, '#5a6679', 'left', 800);
}
const PT_ORDER = { down(p) { return S.od.down(p); }, move(p) { S.od.move(p); }, up(p) { S.od.up(p); }, hover(p) { return S.od.hover(p); } };

/* ================= ③ 신호 합산 ================= */
const SMG = PHONE
  ? { A: { x: 8, y: 8, w: 464, h: 238 }, G1: { x: 8, y: 254, w: 226, h: 210 }, G2: { x: 246, y: 254, w: 226, h: 210 }, BOT: { x: 8, y: 472, w: 464, h: 160 } }
  : { A: { x: 14, y: 14, w: 470, h: 400 }, G1: { x: 496, y: 14, w: 290, h: 206 }, G2: { x: 496, y: 228, w: 290, h: 186 }, BOT: { x: 14, y: 422, w: 772, h: 126 } };
function apFromSum(dV) {
  // 합산 전위: dV(mV) * alpha(t). 역치(15 mV 이상 올라감)에 닿으면 그 시각부터 활동 전위 곡선
  const alpha = (t) => (t < 2 ? smooth(t / 2) : Math.exp(-(t - 2) / 3));
  let tstar = null; if (dV >= 15 - 1e-9) { for (let t = 0; t <= 10; t += 0.01) if (dV * alpha(t) >= 15 - 1e-9) { tstar = t; break; } }
  const V = (t) => (tstar != null && t >= tstar ? AP(t - tstar + 1.5) : -70 + dV * alpha(t));
  return { V, tstar };
}
function newSum() { return { E: 2, I: 1, pred: null, run: false, t: 0, res: null, combos: {}, total: 0, right: 0, flash: 0, bar: -70 }; }
const sumV = (E, I) => -70 + 5 * (E - I);
const SUM_RATE = 1 / 0.5;                        // 1 ms = 0.5 s
function startSum(pred) {
  const sm = S.sm; if (sm.run) return;
  sm.pred = pred; sm.run = true; sm.t = 0; sm.runE = sm.E; sm.runI = sm.I; sm.fn = apFromSum(5 * (sm.E - sm.I)); sm.res = null; Sound.tick(); updateCtl();
}
function stepSum(dt) {
  const sm = S.sm;
  const v = sm.run ? sumV(sm.runE, sm.runI) : sumV(sm.E, sm.I);
  sm.bar = SciSim.approach(sm.bar, v, dt, 6);
  if (!sm.run) return;
  sm.t += dt * SUM_RATE;
  if (sm.t >= 10) {
    sm.t = 10; sm.run = false; const ap = sumV(sm.runE, sm.runI) >= -55 - 1e-9; sm.res = { ap, ok: ap === (sm.pred === 'yes') };
    sm.total++; if (sm.res.ok) sm.right++; if (ap) sm.combos[sm.runE + '-' + sm.runI] = true;
    if (ap) { Sound.success(); parts.burst(SMG.A.x + SMG.A.w * 0.8, SMG.A.y + SMG.A.h * 0.5, { count: 14, speed: 140, size: 3.5, colors: ['#ffd447', '#fff', '#f59e0b'], gravity: 80 }); } else Sound.tick();
    updateCtl();
  }
}
function drawSumScene(dt) {
  const sm = S.sm, A = SMG.A;
  bgFill('#eef3fb', '#f7f9fd');
  panel(A.x, A.y, A.w, A.h, 16);
  T(A.x + 14, A.y + 24, '➕ 한 뉴런에 모이는 입력 (동시에 도착)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
  const cx = A.x + A.w * 0.46, cy = A.y + A.h * 0.55, cr = PHONE ? 34 : 56, rad = PHONE ? 86 : 132;
  const E = sm.run ? sm.runE : sm.E, I = sm.run ? sm.runI : sm.I, V = sm.run ? sm.fn.V(sm.t) : sumV(E, I);
  // 축삭 (오른쪽)
  const ax1 = A.x + A.w - 14;
  ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + cr - 4, cy); ctx.lineTo(ax1, cy); ctx.stroke(); ctx.strokeStyle = '#7fd0c8'; ctx.lineWidth = 5; ctx.stroke();
  const apOn = sm.run && sm.fn.tstar != null && sm.t > sm.fn.tstar;
  if (apOn) { const k = clamp((sm.t - sm.fn.tstar) / 4.5, 0, 1), x = lerp(cx + cr, ax1 - 8, k); D.glow(x, cy, 26, '#ffd447', 0.9); D.sphere(x, cy, 7, '#ffb400', { gloss: true }); T(ax1 - 4, cy - 22, '활동 전위!', 14, '#c2410c', 'right', 800); }
  // 입력 가지(다른 뉴런의 축삭 말단): 흥분성 8 + 억제성 8 중 켜진 만큼 활성
  for (let side = 0; side < 2; side++) {
    const exc = side === 0, n = exc ? E : I, col = exc ? COL.exc : COL.inh;
    for (let i = 0; i < 8; i++) {
      const f = i / 7, deg = exc ? -(170 - 145 * f) : (25 + 145 * f), th2 = deg * Math.PI / 180;
      const px = cx + Math.cos(th2) * rad, py = cy + Math.sin(th2) * rad, sx = cx + Math.cos(th2) * (cr + 5), sy = cy + Math.sin(th2) * (cr + 5);
      const on = i < n;
      ctx.strokeStyle = on ? C.shade(col, -0.1) : '#d5deec'; ctx.lineWidth = on ? 4 : 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
      D.sphere(px, py, PHONE ? 10 : 13, on ? col : '#dbe3ee', { gloss: on });
      if (on) T(px, py + 4.5, exc ? '+' : '−', PHONE ? 14 : 18, '#fff', 'center', 900);
      if (on && sm.run && sm.t < 2.6) { const k = clamp(sm.t / 1.2, 0, 1); const qx = lerp(px, sx, k * 0.9) + Math.sin(i + sm.t * 6) * 2, qy = lerp(py, sy, k * 0.9) + Math.cos(i + sm.t * 5) * 2; ctx.fillStyle = col; ctx.globalAlpha = 1 - k * 0.5; ctx.beginPath(); ctx.arc(qx, qy, 3.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }
  // 세포체 (막전위 색)
  const sg = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, 4, cx, cy, cr); sg.addColorStop(0, C.mix(vColor(V), '#ffffff', 0.55)); sg.addColorStop(1, C.mix(vColor(V), '#ffffff', 0.15));
  D.shadow(() => { ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
  ctx.strokeStyle = '#2f7f86'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.stroke();
  D.sphere(cx - 4, cy + 2, cr * 0.28, '#8d7fd4', { gloss: true });
  T(cx, cy + cr + 20, '막전위 ' + mv(V) + ' mV', PHONE ? 13 : 14.5, '#26324a', 'center', 800);
  T(A.x + 14, A.y + A.h - 14, '🟢 흥분성 입력 ' + E + '개 (+5 mV씩)   🔴 억제성 입력 ' + I + '개 (−5 mV씩)', PHONE ? 11.5 : 13.5, '#3a465c', 'left', 800);
  // 막대: 휴지(−70) 기준, 현재 합산 전위 (−110 ~ −30 mV)
  const G = SMG.G1; panel(G.x, G.y, G.w, G.h, 14);
  T(G.x + 12, G.y + 22, '⚖ 합산한 막전위', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
  const gx = G.x + (PHONE ? 54 : 70), gw = PHONE ? 54 : 74, gy0 = G.y + 34, gh = G.h - 46;
  const Y = (v) => gy0 + gh - (v + 110) / 80 * gh;
  ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; [-110, -90, -70, -50, -30].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx - 6, Y(v)); ctx.lineTo(gx + gw + 80, Y(v)); ctx.stroke(); T(gx - 10, Y(v) + 4, mv(v), 12, '#5a6679', 'right', 700); });
  const bv = sm.run ? clamp(sm.bar, -110, -30) : clamp(sm.bar, -110, -30), y0 = Y(-70), y1 = Y(bv);
  D.roundRect(gx, Math.min(y0, y1), gw, Math.max(Math.abs(y1 - y0), 0), 4); ctx.fillStyle = bv >= -55 - 1e-9 ? '#f59e0b' : bv >= -70 ? '#22c55e' : '#e2464b'; ctx.fill();
  ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy0, gw, gh);
  hline({ r: { x: gx - 4, y: gy0, w: gw + 90, h: gh }, Y }, -55, '#e2464b', null, { w: 2.2 }); T(gx + gw + 8, Y(-55) - 4, '역치 −55', 12.5, '#c0392b', 'left', 800);
  hline({ r: { x: gx - 4, y: gy0, w: gw + 90, h: gh }, Y }, -70, '#3b82f6', null, { w: 1.8 }); T(gx + gw + 8, Y(-70) + 14, '휴지 −70', 12.5, '#1d4ed8', 'left', 800);
  T(gx + gw / 2, Y(bv) + (bv >= -70 ? -6 : 16), mv(sumV(E, I)) + ' mV', 13, '#26324a', 'center', 800);
  // 시간 그래프
  const G2 = SMG.G2; panel(G2.x, G2.y, G2.w, G2.h, 14);
  const pl = { x: G2.x + (PHONE ? 46 : 52), y: G2.y + 30, w: G2.w - (PHONE ? 58 : 66), h: G2.h - (PHONE ? 74 : 72) }, AX = makeAxes(pl, [0, 10], [-80, 40]);
  T(G2.x + 12, G2.y + 20, '📈 막전위–시간', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
  drawAxes(AX, { xt: [0, 5, 10], yt: [-60, -20, 20], yf: (v) => mv(v), xl: '시간 (ms)', yl: '막전위 (mV)', ylx: PHONE ? 36 : 40, fs: 12.5 });
  hline(AX, -55, '#e2464b', null, { w: 1.6 }); hline(AX, -70, '#3b82f6', null, { w: 1.4 });
  if (sm.run || sm.res) { const fn = sm.fn || apFromSum(5 * (sm.E - sm.I)), tt = sm.run ? sm.t : 10; plotFn(AX, fn.V, 0, tt, 0.05, fn.tstar != null ? '#e2464b' : '#2563eb', 3); if (sm.run) { D.sphere(AX.X(tt), AX.Y(fn.V(tt)), 5, '#ffb400', { gloss: true }); } }
  // 아래 설명
  const B = SMG.BOT; panel(B.x, B.y, B.w, B.h, 14);
  const pv = sumV(sm.E, sm.I);
  T(B.x + 16, B.y + 28, '막전위 = −70 + 5 × (흥분성 − 억제성) = −70 + 5 × (' + sm.E + ' − ' + sm.I + ') = ' + mv(pv) + ' mV', PHONE ? 13 : 16, '#26324a', 'left', 800);
  const jmsg = sm.res ? (sm.res.ap ? '✅ ' + mv(sumV(sm.runE, sm.runI)) + ' mV는 역치(−55 mV) 이상이라 활동 전위가 발생했어요. ' : '❌ ' + mv(sumV(sm.runE, sm.runI)) + ' mV는 역치(−55 mV)에 못 미쳐 활동 전위가 발생하지 않았어요. ') + (sm.res.ok ? '예측이 맞았어요! 🎉' : '예측과 달랐어요. 계산을 다시 해 봐요.') : sm.run ? '입력이 모이는 중… 합산한 막전위가 역치 이상일 때만 활동 전위가 생겨요.' : '슬라이더로 입력 개수를 정하고, 활동 전위가 생길지 예측해 보세요. 예측한 뒤에 결과를 확인해요.';
  textBlock(B.x + 16, B.y + 56, B.w - 32, jmsg, PHONE ? 13 : 15, sm.res ? (sm.res.ok ? '#166534' : '#b45309') : '#3a465c', PHONE ? 19 : 22, 700);
  T(B.x + B.w - 14, B.y + B.h - 12, '예측 ' + sm.right + ' / ' + sm.total + ' 맞음', 13, '#5a6679', 'right', 800);
  parts.update(dt); parts.draw(ctx);
}

/* ================= ④ 약물 조사 ================= */
const DRUGS = {
  botulinum: { name: '보툴리눔 독소', zone: 'sA', where: 'a', change: 'down', note: 'relax', info: '아세틸콜린의 분비를 막아요(소낭이 융합하지 못해요). 근육에 신호가 가지 않아 근육이 이완·마비돼요.', short: '분비 차단' },
  curare: { name: '쿠라레', zone: 'sB', where: 'b', change: 'down', note: 'relax', info: '아세틸콜린 수용체를 막아요. 아세틸콜린이 결합하지 못해 근육이 이완돼요.', short: '수용체 차단' },
  nicotine: { name: '니코틴', zone: 'sC', where: 'c', change: 'up', note: 'dep', info: '아세틸콜린 수용체에 결합해 아세틸콜린처럼 작용해요(수용체 작용 모방). 중독·의존 위험이 있어요.', short: '수용체 모방' },
  organo: { name: '유기인계 살충제', zone: 'sD', where: 'd', change: 'up', note: 'over', info: '아세틸콜린 분해 효소를 억제해 아세틸콜린이 쌓여요. 근육이 지나치게 수축해요(독). 같은 작용 지점의 도네페질은 치료제로 쓰여요.', short: '분해 억제' },
  ssri: { name: '세로토닌 재흡수 억제제(SSRI)', zone: 'sE', where: 'e', change: 'up', note: 'mood', info: '말단으로의 세로토닌 재흡수를 억제해 틈에 세로토닌이 오래 남아요. 항우울제로 쓰이며 반드시 의사의 처방이 필요해요.', short: '재흡수 억제' },
};
const ZONES = [['sA', '분비 차단', [0.5, 0.37]], ['sB', '수용체 차단', [0.34, 0.56]], ['sC', '수용체 모방', [0.66, 0.56]], ['sD', '분해 억제', [0.24, 0.5]], ['sE', '재흡수 억제', [0.73, 0.44]]];
const DRG = PHONE
  ? { Dg: { x: 8, y: 62, w: 464, h: 250 }, pos: { sA: [8, 6], sD: [164, 6], sE: [320, 6], sB: [8, 322], sC: [320, 322] }, cw: 148, ch: 44, sw: 148, sh: 40, tray: (i) => ({ x: 8 + (i % 3) * 160, y: 384 + Math.floor(i / 3) * 54 }), INFO: { x: 8, y: 490, w: 236, h: 142 }, GR: { x: 250, y: 490, w: 222, h: 142 } }
  : { Dg: { x: 146, y: 12, w: 508, h: 334 }, pos: { sA: [14, 56], sD: [14, 150], sB: [14, 250], sE: [662, 56], sC: [662, 250] }, cw: 150, ch: 42, sw: 124, sh: 42, tray: (i) => ({ x: 14 + i * 154, y: 374 }), INFO: { x: 14, y: 424, w: 560, h: 124 }, GR: { x: 586, y: 424, w: 200, h: 124 } };
function newDrugPl() {
  const ids = ['organo', 'botulinum', 'ssri', 'nicotine', 'curare'];
  return new Placer({
    chips: ids.map((id) => ({ id, label: DRUGS[id].name, col: '#7c3aed' })),
    targets: ZONES.map((z) => ({ id: z[0], ans: Object.keys(DRUGS).find((k) => DRUGS[k].zone === z[0]), x: DRG.pos[z[0]][0], y: DRG.pos[z[0]][1], w: DRG.sw, h: DRG.sh, name: z[1] })),
    tray: DRG.tray, cw: DRG.cw, ch: DRG.ch, onChange() { drugFocusUpdate(); },
  });
}
function drugFocusUpdate() {
  const dr = S.dr; if (!dr) return;
  const pl = dr.pl; let f = null;
  pl.chips.forEach((c) => { const t = pl.slotOf(c); if (t && t.ans === c.id && dr.last === c.id) f = c.id; });
  if (!f) { const c = pl.chips.find((c) => { const t = pl.slotOf(c); return t && t.ans === c.id; }); if (c && !dr.last) f = c.id; }
  if (f !== dr.demo) { dr.demo = f; S.sf3.setDrug(f); S.sf3.opts.loop = true; if (f) { S.sf3.auto = true; S.sf3.enter(1); dr.seen[f] = true; } }
}
function drawDrugScene(dt) {
  const dr = S.dr, pl = dr.pl, sf = S.sf3;
  bgFill('#eef3fb', '#f7f9fd');
  sf.update(dt); drawSynapse(sf);
  ZONES.forEach((z) => {
    const t = pl.targets.find((x) => x.id === z[0]), p = sf.g.P(z[2][0], z[2][1]), left = t.x < sf.R.x + sf.R.w / 2;
    const sx = PHONE ? t.x + t.w / 2 : (left ? t.x + t.w : t.x), sy = PHONE ? (t.y < sf.R.y ? t.y + t.h : t.y) : t.y + t.h / 2;
    ctx.save(); ctx.strokeStyle = '#4b6b8a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
    D.ring(p.x, p.y, 9, clock, { color: '#7c3aed', width: 2.2 });
  });
  pl.drawTargets({ col: '#8b6bd0' });
  T(PHONE ? 8 : 14, DRG.tray(0).y - 7, pl.placed < 5 ? '👇 약물 카드를 끌어서 작용 지점 칸에 놓아요 (눌러서 설명 보기)' : (pl.solved ? '✨ 모두 알맞게 놓았어요!' : '✔ 확인하기를 눌러요'), PHONE ? 12 : 13.5, pl.solved ? '#166534' : '#5a6679', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  // 정보 패널
  const I = DRG.INFO; panel(I.x, I.y, I.w, I.h, 14);
  const fid = pl.drag && pl.drag.c ? pl.drag.c.id : (pl.selId || dr.last), d = fid ? DRUGS[fid] : null;
  if (d) {
    D.label(I.x + (PHONE ? 10 : 14), I.y + (PHONE ? 18 : 24), d.name.length > 10 && PHONE ? d.name.slice(0, 9) + '…' : d.name, { bg: '#7c3aed', size: PHONE ? 12 : 14, align: 'left' });
    const ok = pl.chips.find((c) => c.id === fid), t = ok && pl.slotOf(ok), placedOk = t && t.ans === fid;
    textBlock(I.x + (PHONE ? 10 : 14), I.y + (PHONE ? 44 : 50), I.w - (PHONE ? 20 : 28), d.info, PHONE ? 11 : 13, '#26324a', PHONE ? 13 : 18, 700);
    if (placedOk) T(I.x + I.w - 10, I.y + (PHONE ? 18 : 22), PHONE ? (d.change === 'up' ? '신호 ↑' : '신호 ↓') : '작용: ' + d.short + ' → 신호 ' + (d.change === 'up' ? '강해짐·길어짐 ↑' : '약해짐·사라짐 ↓'), PHONE ? 12 : 13, d.change === 'up' ? '#c2410c' : '#1d4ed8', 'right', 800);
  } else textBlock(I.x + 12, I.y + (PHONE ? 22 : 34), I.w - 24, '약물 카드를 눌러서 설명을 읽고, 어느 단계에 작용하는지 찾아 놓아요.', PHONE ? 12 : 14, '#5a6679', PHONE ? 16 : 20, 700);
  if (PHONE) textBlock(I.x + 10, I.y + I.h - 26, I.w - 20, '⚠️ 의사·약사의 지시 없이 약물을 쓰면 안 돼요. 교육용 모형이에요.', 11, '#b45309', 13, 800);
  else T(I.x + 14, I.y + I.h - 12, '⚠️ 약물은 의사·약사의 지시 없이 쓰면 안 돼요. 원리를 배우는 교육용 모형이에요.', 12.5, '#b45309', 'left', 800);
  drawPostGraph(sf, DRG.GR, { lm: PHONE ? 44 : 50, bm: PHONE ? 38 : 44, ylx: PHONE ? 34 : 38 });
}
const PT_DRUG = {
  down(p) { const pl = S.dr.pl; const r = pl.down(p); if (r && pl.drag) { S.dr.last = pl.drag.c.id; } return r; }, move(p) { S.dr.pl.move(p); },
  up(p) { const pl = S.dr.pl, c = pl.drag && pl.drag.c; pl.up(p); if (c) { S.dr.last = c.id; drugFocusUpdate(); } }, hover(p) { return S.dr.pl.hover(p); },
};

/* ============ 상태 · 화면 전환 ============ */
const S = { mode: 'struct', sub: 'play', fade: 0, sf: null, nm: null, sf2: null, od: null, sm: null, sf3: null, dr: null, fl: null };
let game = null;
const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
const SCENES = { struct: '🔬 시냅스 구조', flow: '🎬 신호 전달', sum: '➕ 신호 합산', drug: '💊 약물 조사' };
const viewKey = () => (S.mode === 'flow' ? 'flow:' + S.sub : S.mode);
function ptFor() { return S.mode === 'struct' ? PT_STRUCT : S.mode === 'flow' ? (S.sub === 'order' ? PT_ORDER : null) : S.mode === 'drug' ? PT_DRUG : null; }
function setScene(mode) {
  if (S.mode !== mode) { S.fade = 1; parts.clear(); }
  S.mode = mode; $('#tbLabel').textContent = SCENES[mode]; PT = ptFor(); updateCtl();
}
function setSub(sub) { if (S.sub !== sub) { S.fade = 1; S.sub = sub; } setScene('flow'); }
function updateCtl() {
  const key = viewKey();
  $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(key) < 0; });
  $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  setOn('#subSeg', 'data-sub', S.sub);
  if (S.fl) {
    $('#bBlock').classList.toggle('on', S.fl.block); $('#bBlock').textContent = S.fl.block ? '🚫 Ca²⁺ 통로 차단 중 (눌러서 풀기)' : '🚫 Ca²⁺ 통로 차단해 보기';
    $('#bAuto').textContent = S.sf2 && S.sf2.auto ? '⏸ 자동 재생 멈추기' : '▶ 자동 재생';
  }
  if (S.sm) {
    $('#sE').style.setProperty('--pct', (S.sm.E / 8 * 100) + '%'); $('#sI').style.setProperty('--pct', (S.sm.I / 8 * 100) + '%'); $('#oE').textContent = S.sm.E; $('#oI').textContent = S.sm.I;
    $('#bPredYes').disabled = $('#bPredNo').disabled = !!S.sm.run;
  }
  if (S.dr) $('#drugCard').hidden = !((S.dr.pl.solved || (game && game.free)) && key === 'drug');
}
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
bindSeg('#subSeg', 'data-sub', (s) => setSub(s));
$('#bStructReset').addEventListener('click', () => { Sound.click(); S.nm.reset(); });
$('#bOrderReset').addEventListener('click', () => { Sound.click(); S.od = newOrder(); if (S.mode === 'flow' && S.sub === 'order') PT = PT_ORDER; });
$('#bNext').addEventListener('click', () => { const sf = S.sf2; Sound.click(); if (sf.revT >= 0) sf.reset(); if (sf.stage >= 6) { sf.reset(); } sf.next(); updateCtl(); });
$('#bAuto').addEventListener('click', () => { const sf = S.sf2; Sound.click(); if (sf.revT >= 0 || (sf.stage >= 6 && sf.done)) sf.reset(); sf.auto = !sf.auto; updateCtl(); });
$('#bFlowReset').addEventListener('click', () => { Sound.click(); S.sf2.reset(); updateCtl(); });
$('#bBlock').addEventListener('click', () => { Sound.click(); S.fl.block = !S.fl.block; S.sf2.reset(); updateCtl(); showHint(S.fl.block ? 'Ca²⁺ 통로를 막았어요. 다음 단계로 진행하며 무슨 일이 생기는지 봐요.' : '통로를 다시 열었어요.'); });
$('#bRev').addEventListener('click', () => { Sound.click(); S.sf2.startRev(); updateCtl(); });
SciSim.bindRange($('#sE'), $('#oE'), (v) => String(v), (v) => { S.sm.E = v; updateCtl(); });
SciSim.bindRange($('#sI'), $('#oI'), (v) => String(v), (v) => { S.sm.I = v; updateCtl(); });
$('#bPredYes').addEventListener('click', () => startSum('yes'));
$('#bPredNo').addEventListener('click', () => startSum('no'));

/* ---------- 읽음 칸 ---------- */
let rlast = '';
function readouts() {
  let L1, L2, L3, a, b, c;
  if (S.mode === 'struct') { const pl = S.nm; L1 = '이름표'; a = pl.placed + ' / 6 놓음'; L2 = '맞은 칸'; b = (6 - pl.wrongIds().length) + ' / 6'; L3 = '시냅스 틈'; c = '약 20 nm'; }
  else if (S.mode === 'flow' && S.sub === 'play') { const sf = S.sf2; L1 = '단계'; a = sf.stage + ' / 6'; L2 = '경과 시간'; b = sf.simMs.toFixed(1) + ' ms'; L3 = 'Ca²⁺ 통로'; c = S.fl.block ? '차단됨' : '정상'; }
  else if (S.mode === 'flow') { const od = S.od; L1 = '맞은 자리'; a = (6 - od.wrongIds().length) + ' / 6'; L2 = '단계 수'; b = '6단계'; L3 = '시냅스 지연'; c = '약 0.5~1 ms'; }
  else if (S.mode === 'sum') { const sm = S.sm; L1 = '흥분성 / 억제성'; a = sm.E + ' / ' + sm.I; L2 = '합산 막전위'; b = mv(sumV(sm.E, sm.I)) + ' mV'; L3 = '역치(−55 mV)'; c = sumV(sm.E, sm.I) >= -55 - 1e-9 ? '이상 → 발생' : '미만 → 없음'; }
  else { const dr = S.dr; L1 = '놓은 카드'; a = dr.pl.placed + ' / 5'; L2 = '맞은 칸'; b = (5 - dr.pl.wrongIds().length) + ' / 5'; L3 = '재생 중'; c = dr.demo ? DRUGS[dr.demo].short : '—'; }
  const key = [L1, a, L2, b, L3, c].join('|');
  if (key === rlast) return; rlast = key;
  l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
}

/* ================= 미션 ================= */
const SUMROWS = [[4, 1, -55, 'yes'], [5, 3, -60, 'no'], [6, 2, -50, 'yes']];
const levels = [
  {
    title: '시냅스 구조: 뉴런과 뉴런 사이', short: '시냅스 구조', icon: '🔬', phase: '모형',
    intro: '<p class="si-q">❓ 탐구 질문: 뉴런과 뉴런 사이는 붙어 있지 않은데 신호는 어떻게 건너갈까? 약물은 이 과정을 어떻게 바꿀 수 있을까?</p>' +
      '<div class="si-link">🔗 <b>앞 차시에서</b> 활동 전위가 축삭을 따라 축삭 말단까지 한 방향으로 전도된다는 것을 배웠어요. 축삭 말단에 도착한 신호는 다음 뉴런으로 어떻게 넘어갈까요? 두 뉴런이 만나는 곳을 <b>시냅스</b>라고 해요.</div>' +
      '<p>시냅스는 <b>축삭 말단 → 시냅스 틈(약 20 nm) → 다음 뉴런의 막</b>으로 이루어져요. 먼저 시냅스의 구조를 확대해서 이름을 붙여 봐요.</p>',
    features: ['struct'],
    setup() { S.nm = newSNamer(); S.sf = new SynFlow(ST.Dg, { staticNt: true }); setScene('struct'); },
    recap: '시냅스는 축삭 말단, 시냅스 틈, 다음 뉴런의 막으로 이루어져요. 신경전달물질이 든 소낭은 축삭 말단에만, 수용체는 다음 뉴런에만 있어요.',
    summary: '<ul><li><b>축삭 말단</b>: 신경전달물질이 든 <b>시냅스 소낭</b>과 에너지를 만드는 <b>미토콘드리아</b>가 있어요.</li><li><b>시냅스 틈</b>: 두 뉴런 사이의 좁은 틈(약 20 nm). 뉴런은 서로 붙어 있지 않아요.</li><li><b>수용체</b>: 다음 뉴런의 막에 있어 신경전달물질과 결합하고, 결합하면 이온 통로가 열려요.</li><li>소낭은 <b>축삭 말단에만</b>, 수용체는 <b>다음 뉴런에만</b> 있어서 신호는 한 방향으로만 전달돼요.</li></ul>',
    missions: [
      {
        title: '시냅스 구조에 이름 붙이기', manual: true,
        goal: '시냅스 그림의 ①~⑥ 칸에 알맞은 이름표를 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '분홍색 점이 든 둥근 주머니가 시냅스 소낭, 주황색 타원은 미토콘드리아예요. 틈에 떠 있는 분홍 점은 신경전달물질, 아래쪽 막에 박힌 단백질은 수용체예요.',
        setup() { setScene('struct'); },
        check() {
          const pl = S.nm;
          if (!pl.full) return '아직 놓지 않은 이름표가 ' + (6 - pl.placed) + '개 있어요. 6칸을 모두 채워 보세요.';
          const bad = pl.wrongIds(); pl.markBad(bad);
          if (bad.length) return '빨간 이름표 ' + bad.length + '개가 틀렸어요. 연결선이 가리키는 부분을 다시 살펴보세요.';
          return true;
        },
        status: () => '이름표 ' + S.nm.placed + ' / 6 · 맞은 칸 ' + (6 - S.nm.wrongIds().length) + ' / 6',
        explain: '<b>축삭 말단</b>에는 신경전달물질이 든 <b>시냅스 소낭</b>과 <b>미토콘드리아</b>가 있어요. 두 뉴런 사이의 <b>시냅스 틈</b>으로 <b>신경전달물질</b>이 나오고, 다음 뉴런 막의 <b>수용체</b>가 이를 받아요.',
      },
      {
        type: 'quiz', title: '소낭은 어느 쪽에만?',
        goal: '신경전달물질이 든 시냅스 소낭은 시냅스를 이루는 두 뉴런 중 어느 쪽에만 있을까요?',
        setup() { setScene('struct'); },
        choices: ['신호를 보내는 뉴런의 축삭 말단에만', '신호를 받는 다음 뉴런에만', '두 뉴런 모두에 똑같이', '시냅스 틈 안에만'],
        answer: 0,
        feedback: ['', '다음 뉴런의 막에는 수용체가 있어요. 소낭은 보내는 쪽에 있어요.', '두 뉴런의 구조는 달라요. 한쪽에는 소낭, 다른 쪽에는 수용체가 있어요.', '시냅스 틈에는 방출된 신경전달물질이 떠다녀요. 소낭은 뉴런 안에 있어요.'],
        explain: '소낭은 <b>신호를 보내는 쪽(축삭 말단)</b>에만 있고, 수용체는 <b>받는 쪽</b>에만 있어요. 이 구조 때문에 시냅스 전달은 한 방향으로만 일어나요.',
      },
    ],
  },
  {
    title: '신호 전달: 전기 → 화학 → 전기', short: '신호 전달', icon: '🎬', phase: '탐구',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시냅스의 구조를 확인했어요. 이제 활동 전위가 축삭 말단에 도착한 뒤 일어나는 일을 <b>6단계</b>로 따라가 봐요.</div>' +
      '<p>① 활동 전위 도착 → ② Ca²⁺ 유입 → ③ 소낭 융합 → ④ 방출·확산 → ⑤ 수용체 결합(이온 통로 열림) → ⑥ 분해·재흡수. 신호는 <b>전기 → 화학 → 전기</b>로 바뀌어요. Ca²⁺ 통로를 막으면 어떻게 되는지, 반대 방향으로는 신호가 갈 수 있는지도 시험해 봐요.</p>',
    features: ['flow'],
    setup() { S.sf2 = new SynFlow(FLG.Dg, { hist: true, block: () => S.fl.block }); S.fl = { block: false, blockTested: false, revTested: false, fullRun: false }; S.od = newOrder(); setSub('play'); },
    recap: '활동 전위가 도착하면 Ca²⁺이 들어와 소낭이 융합하고, 신경전달물질이 틈으로 방출돼 다음 뉴런의 수용체에 결합해요. 이후 분해·재흡수로 신호가 끝나요. 한 방향으로만 전달돼요.',
    summary: '<ul><li><b>전기 → 화학 → 전기</b>: 활동 전위 → 신경전달물질 → 다음 뉴런의 막전위 변화.</li><li>순서: 활동 전위 도착 → <b>Ca²⁺ 유입</b>(전압 의존 통로) → <b>소낭 융합·방출</b>(세포 밖 방출) → <b>확산</b>(지연 약 0.5~1 ms) → <b>수용체 결합</b>·이온 통로 열림 → <b>분해·재흡수</b>.</li><li>Ca²⁺ 통로가 막히면 소낭이 융합하지 못해 신경전달물질이 방출되지 않아요.</li><li>소낭은 축삭 말단에만, 수용체는 다음 뉴런에만 있어서 <b>한 방향</b>으로만 전달돼요.</li></ul>',
    missions: [
      {
        title: '신호 전달 6단계 따라가기',
        goal: '<b>다음 ▶</b>(또는 자동 재생)으로 6단계를 끝까지 재생하고, <b>Ca²⁺ 통로 차단</b>과 <b>다음 뉴런에서 자극</b>도 한 번씩 시험하세요.',
        hint: '① 다음 ▶를 눌러 6단계까지 가요. ② “Ca²⁺ 통로 차단해 보기”를 누른 뒤 3단계까지 진행해요. ③ 통로를 다시 풀고 “다음 뉴런에서 자극”을 눌러요.',
        setup() { setSub('play'); },
        check: () => S.fl.fullRun && S.fl.blockTested && S.fl.revTested,
        hold: 0.5,
        status: () => mark(S.fl.fullRun) + ' 6단계 재생 &nbsp; ' + mark(S.fl.blockTested) + ' Ca²⁺ 통로 차단 시험 &nbsp; ' + mark(S.fl.revTested) + ' 반대 방향 시험',
        explain: '6단계를 거치며 <b>전기 신호가 화학 신호(신경전달물질)로 바뀌었다가 다시 전기 신호</b>가 돼요. Ca²⁺ 통로가 막히면 소낭이 융합하지 못해 <b>방출이 일어나지 않고</b>, 다음 뉴런에서 자극하면 소낭도 수용체도 없어 <b>전달되지 않아요</b>.',
      },
      {
        title: '순서 카드 배열하기', manual: true,
        goal: '시냅스 전달 6단계 카드를 끌어서 <b>1번부터 6번까지 순서대로</b> 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '활동 전위 도착 → Ca²⁺ 유입 → 소낭 융합 → 방출·확산 → 수용체 결합 → 분해·재흡수 순서예요.',
        setup() { setSub('order'); },
        check() {
          const od = S.od; if (od.solved) return true; od.markBad(od.wrongIds());
          return '빨간 카드의 자리가 틀렸어요. Ca²⁺이 들어와야 소낭이 융합하고, 방출된 뒤에 수용체에 결합해요.';
        },
        status: () => '맞은 자리 ' + (6 - S.od.wrongIds().length) + ' / 6',
        explain: '<b>활동 전위 도착 → Ca²⁺ 유입 → 소낭 융합 → 방출·확산 → 수용체 결합 → 분해·재흡수</b> 순서예요. 앞 단계가 일어나야 다음 단계가 일어나요.',
      },
      {
        type: 'quiz', title: '왜 한 방향으로만?',
        goal: '시냅스에서 신호가 <b>한 방향으로만</b> 전달되는 까닭은?',
        setup() { setSub('play'); },
        choices: ['신경전달물질이 소낭에서만 방출되고, 수용체는 다음 뉴런에만 있기 때문에', '활동 전위가 뒤로는 갈 수 없기 때문에', '시냅스 틈이 한쪽으로만 열려 있어서', '다음 뉴런에서는 활동 전위가 생길 수 없어서'],
        answer: 0,
        feedback: ['', '축삭을 따라가는 활동 전위가 뒤로 안 가는 것은 불응기 때문이에요. 시냅스에서 한 방향인 것은 구조 때문이에요.', '시냅스 틈은 열리고 닫히지 않아요. 신경전달물질이 확산해 가는 틈일 뿐이에요.', '다음 뉴런에서도 활동 전위가 생겨요. 다만 이전 뉴런으로 가지 못해요.'],
        explain: '<b>소낭은 축삭 말단에만, 수용체는 다음 뉴런에만</b> 있어요. 그래서 신경전달물질이 이전 뉴런으로 신호를 되돌릴 수 없고 신호는 한 방향으로만 전달돼요.',
      },
    ],
  },
  {
    title: '신호 합산: 흥분성 + 억제성 입력', short: '신호 합산', icon: '➕', phase: '분석',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 시냅스의 신호가 다음 뉴런의 막전위를 조금 바꾼다는 것을 봤어요. 그런데 한 뉴런에는 수많은 시냅스가 연결돼요. 이 입력들은 어떻게 합쳐질까요?</div>' +
      '<p><b>흥분성 입력</b>은 Na⁺이 들어와 막전위를 높이고(탈분극), <b>억제성 입력</b>은 Cl⁻ 유입 등으로 막전위를 낮춰요(과분극). 예시로 흥분성 1개 = +5 mV, 억제성 1개 = −5 mV라고 하면 <b>막전위 = −70 + 5 × (흥분성 수 − 억제성 수)</b>예요. 이 값이 역치(−55 mV) 이상일 때 활동 전위가 생겨요.</p>',
    features: ['sum'],
    setup() { S.sm = newSum(); ['inS1', 'inS2', 'inS3'].forEach((k) => { $('#' + k).value = ''; $('#' + k).classList.remove('ok', 'bad'); }); ['selS1', 'selS2', 'selS3'].forEach((k) => { $('#' + k).value = ''; $('#' + k).classList.remove('ok', 'bad'); }); $('#sE').value = 2; $('#sI').value = 1; setScene('sum'); },
    recap: '한 뉴런에 모인 흥분성(+)과 억제성(−) 입력이 합산돼요. 합산한 막전위가 역치(−55 mV) 이상일 때만 활동 전위가 생겨요.',
    summary: '<ul><li><b>흥분성 입력</b>: Na⁺ 유입 → 탈분극(예: +5 mV). <b>억제성 입력</b>: Cl⁻ 유입 등 → 과분극(예: −5 mV).</li><li>막전위 = −70 + 5 × (흥분성 수 − 억제성 수) (예시 값)</li><li>흥분성 4 + 억제성 1 → −70 + 15 = <b>−55 mV</b> ≥ 역치 → <b>활동 전위 발생</b>.</li><li>흥분성 5 + 억제성 3 → −70 + 10 = <b>−60 mV</b> &lt; 역치 → 발생하지 않아요.</li></ul>',
    missions: [
      {
        title: '활동 전위가 생기는 조합 찾기',
        goal: '입력 개수를 정하고 <b>예측 버튼</b>으로 확인해서, 활동 전위가 <b>발생하는 서로 다른 조합 2가지</b>를 찾으세요. (한 가지는 억제성 입력이 1개 이상!)',
        hint: '흥분성 수 − 억제성 수가 3 이상이면 돼요. 예) 흥분성 3 · 억제성 0, 흥분성 4 · 억제성 1.',
        setup() { setScene('sum'); },
        check() { const k = Object.keys(S.sm.combos); return k.length >= 2 && k.some((q) => +q.split('-')[1] >= 1); },
        hold: 0.5,
        status: () => { const k = Object.keys(S.sm.combos); return mark(k.length >= 2) + ' 발생 조합 ' + Math.min(2, k.length) + ' / 2 &nbsp; ' + mark(k.some((q) => +q.split('-')[1] >= 1)) + ' 억제성 입력이 있는 조합 ' + (k.length ? '(' + k.map((q) => q.replace('-', ':')).join(', ') + ')' : ''); },
        explain: '막전위 = −70 + 5 × (흥분성 − 억제성)이 <b>−55 mV 이상</b>이 되려면 (흥분성 − 억제성) ≥ 3이어야 해요. 억제성 입력이 있어도 흥분성이 더 많이 모이면 활동 전위가 생겨요.',
      },
      {
        title: '표 3줄 계산하기', manual: true,
        goal: '표의 세 줄에서 합산한 <b>막전위(mV)</b>를 계산해 쓰고, 활동 전위가 <b>생기는지</b> 골라 <b>✔ 확인하기</b>를 누르세요.',
        hint: '막전위 = −70 + 5 × (흥분성 − 억제성). 예) 흥분성 4, 억제성 1이면 −70 + 5 × 3 = −55예요. −55는 역치 이상이에요.',
        setup() { setScene('sum'); },
        check() {
          let empty = 0, bad = 0;
          SUMROWS.forEach((r, i) => { const a = $('#inS' + (i + 1)), s = $('#selS' + (i + 1)); const hasV = a.value !== '', hasS = s.value !== ''; if (!hasV || !hasS) { empty++; a.classList.remove('ok', 'bad'); s.classList.remove('ok', 'bad'); return; } const okV = Math.abs(parseFloat(a.value) - r[2]) < 1e-6, okS = s.value === r[3]; a.classList.toggle('ok', okV); a.classList.toggle('bad', !okV); s.classList.toggle('ok', okS); s.classList.toggle('bad', !okS); if (!okV || !okS) bad++; });
          if (empty) return '표의 빈칸을 모두 채워 보세요. (막전위와 발생 여부)';
          if (bad) return '빨간 칸을 다시 계산해 보세요. 막전위 = −70 + 5 × (흥분성 − 억제성)이고, 역치(−55 mV) 이상이면 발생해요.';
          return true;
        },
        status: () => '채운 줄 ' + SUMROWS.filter((r, i) => $('#inS' + (i + 1)).value !== '' && $('#selS' + (i + 1)).value !== '').length + ' / 3',
        explain: '(4, 1): −70 + 15 = <b>−55 mV</b> → 역치 이상(발생), (5, 3): −70 + 10 = <b>−60 mV</b> → 역치 미만(없음), (6, 2): −70 + 20 = <b>−50 mV</b> → 발생이에요.',
      },
      {
        type: 'quiz', title: '흥분성 5 + 억제성 3',
        goal: '한 뉴런에 <b>흥분성 입력 5개와 억제성 입력 3개</b>가 동시에 도착했어요. 결과는? (흥분성 +5 mV, 억제성 −5 mV, 휴지 −70 mV, 역치 −55 mV)',
        setup() { setScene('sum'); },
        choices: ['−60 mV로 역치 미만이라 활동 전위가 생기지 않는다', '−55 mV라서 활동 전위가 생긴다', '−45 mV라서 활동 전위가 생긴다', '억제성이 있으면 항상 활동 전위가 생기지 않는다'],
        answer: 0,
        feedback: ['', '−55 mV는 흥분성 4 + 억제성 1일 때의 값이에요. 이번에는 5 − 3 = 2예요.', '흥분성 5개만 있을 때(−45 mV)의 값이에요. 억제성 3개의 −15 mV도 더해야 해요.', '억제성이 있어도 흥분성이 훨씬 많으면(예: 6 − 2) 활동 전위가 생겨요.'],
        explain: '−70 + 5 × (5 − 3) = <b>−60 mV</b>예요. 역치(−55 mV)보다 낮아서 <b>활동 전위가 생기지 않아요</b>. 입력의 합산이 중요해요.',
      },
    ],
  },
  {
    title: '약물 조사: 어느 단계에 작용할까?', short: '약물 조사', icon: '💊', phase: '조사',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시냅스 전달의 6단계를 배웠어요. 약물이나 독이 시냅스 전달에 영향을 준다면 <b>어느 단계</b>를 바꾸는 걸까요?</div>' +
      '<p>약물 카드 5장을 시냅스 도해의 <b>작용 지점</b>에 놓아 봐요. 카드를 누르면 설명이 나오고, 맞는 칸에 놓으면 작용 모습이 재생돼요. 그다음 <b>발표 카드</b>(어디에 작용 – 신호가 어떻게 변함 – 유의점)를 만들어요.</p>' +
      '<p class="warn-note">⚠️ 약물은 의사·약사의 지시 없이 사용하면 안 돼요. 이 화면은 작용 원리를 배우는 교육용 모형이며 사용법·용량은 다루지 않아요.</p>',
    features: ['drug'],
    setup() { S.sf3 = new SynFlow(DRG.Dg, { hist: true, loop: true }); S.dr = { pl: newDrugPl(), last: null, demo: null, seen: {} }; ['selDrug', 'selWhere', 'selChange', 'selNote'].forEach((k) => { $('#' + k).value = ''; $('#' + k).classList.remove('ok', 'bad'); }); setScene('drug'); },
    recap: '약물은 시냅스 전달의 한 단계(분비, 수용체, 분해, 재흡수)에 작용해 신호를 약하게 하거나 강하게 해요. 같은 작용 지점이라도 약물에 따라 치료제나 독이 될 수 있어요.',
    summary: '<ul><li><b>분비 차단</b>: 보툴리눔 독소 → 아세틸콜린 분비 ↓ → 근육 이완·마비.</li><li><b>수용체 차단</b>: 쿠라레 → 아세틸콜린이 결합하지 못해 근육 이완.</li><li><b>수용체 작용 모방</b>: 니코틴 → 아세틸콜린 수용체에 결합.</li><li><b>분해 억제</b>: 유기인계 살충제(독), 도네페질(치료제) → 아세틸콜린이 쌓여 신호 ↑.</li><li><b>재흡수 억제</b>: 선택적 세로토닌 재흡수 억제제(항우울제) → 세로토닌이 틈에 오래 남아요.</li><li>⚠️ 약물은 의사·약사의 지시 없이 쓰면 안 돼요.</li></ul>',
    missions: [
      {
        title: '약물 카드를 작용 지점에 놓기', manual: true,
        goal: '약물 카드 5장을 시냅스 도해의 <b>알맞은 작용 지점 칸</b>에 놓고 <b>✔ 확인하기</b>를 누르세요. (맞는 칸에 놓으면 작용 모습이 재생돼요)',
        hint: '카드를 눌러 설명을 읽어요. 분비를 막으면 소낭이 융합하지 못해요. 수용체를 막거나 흉내 내는 약물, 분해 효소나 재흡수 운반체를 막는 약물이 있어요.',
        setup() { setScene('drug'); },
        check() {
          const pl = S.dr.pl;
          if (!pl.full) return '아직 놓지 않은 카드가 ' + (5 - pl.placed) + '장 있어요. 5칸을 모두 채워 보세요.';
          const bad = pl.wrongIds(); pl.markBad(bad);
          if (bad.length) return '빨간 카드 ' + bad.length + '장이 알맞지 않은 칸에 있어요. 약물 설명에서 어느 단계에 작용하는지 다시 읽어 보세요.';
          return true;
        },
        status: () => '놓은 카드 ' + S.dr.pl.placed + ' / 5 · 맞은 칸 ' + (5 - S.dr.pl.wrongIds().length) + ' / 5',
        explain: '<b>보툴리눔 독소</b>: 분비 차단, <b>쿠라레</b>: 수용체 차단, <b>니코틴</b>: 수용체 작용 모방, <b>유기인계 살충제</b>: 분해 효소 억제, <b>SSRI</b>: 재흡수 억제예요. 작용 지점에 따라 신호가 약해지거나 강해져요.',
      },
      {
        title: '발표 카드 만들기', manual: true,
        goal: '약물 하나를 골라 <b>어디에 작용 – 신호가 어떻게 변함 – 결과·유의점</b> 세 칸을 채우고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '앞 미션에서 읽은 설명을 떠올려요. 분비나 수용체를 막으면 신호가 약해지고, 분해·재흡수를 막으면 신호가 오래 가요.',
        setup() { setScene('drug'); updateCtl(); },
        check() {
          const d = $('#selDrug').value; if (!d) return '발표할 약물을 먼저 골라 보세요.';
          const D0 = DRUGS[d], items = [['selWhere', D0.where], ['selChange', D0.change], ['selNote', D0.note]]; let empty = 0, bad = 0;
          items.forEach((it) => { const e = $('#' + it[0]); if (!e.value) { empty++; e.classList.remove('ok', 'bad'); } else { const ok = e.value === it[1]; e.classList.toggle('ok', ok); e.classList.toggle('bad', !ok); if (!ok) bad++; } });
          if (empty) return '세 칸을 모두 골라 보세요.';
          if (bad) return '빨간 칸이 알맞지 않아요. ' + D0.name + '의 설명을 다시 읽어 보세요.';
          return true;
        },
        status: () => { const d = $('#selDrug').value; return d ? '발표 약물: ' + DRUGS[d].name : '⬜ 약물을 골라요'; },
        explain: '발표 카드는 <b>작용 지점 → 신호의 변화 → 결과·유의점</b> 순서로 말하면 돼요. 약물은 의사·약사의 지시 없이 사용하면 안 돼요.',
      },
      {
        type: 'quiz', title: '분해 효소를 억제하면?',
        goal: '신경전달물질을 분해하는 효소를 <b>억제하면</b> 시냅스 신호는 어떻게 될까요?',
        setup() { setScene('drug'); },
        choices: ['신경전달물질이 오래 남아 신호가 강해지고 길어진다', '신경전달물질이 더 빨리 없어져 신호가 약해진다', '신경전달물질이 더 이상 방출되지 않는다', '아무 변화가 없다'],
        answer: 0,
        feedback: ['', '분해 효소가 억제되면 오히려 분해가 느려져 물질이 오래 남아요.', '방출은 앞 단계예요. 분해 효소는 방출된 뒤의 단계에 작용해요.', '분해는 신호를 끝내는 단계라서, 억제하면 신호가 오래 가요.'],
        explain: '분해가 막히면 신경전달물질이 <b>쌓여서 수용체를 계속 자극</b>해요. 같은 작용 지점이라도 <b>유기인계 살충제는 독</b>이 되고, <b>도네페질은 치료제</b>로 쓰여요. 어떤 약물인지, 어떤 상황인지에 따라 달라요. 의사·약사의 지시 없이 약물을 사용하면 안 돼요.',
      },
    ],
  },
];

game = SciSim.game({
  simId: 'hb-synapse', mount: '#game', badge: '시냅스 박사', homeHref: '../../index.html#hb',
  featureLabels: { struct: '🔬 시냅스 도해 · 이름표', flow: '🎬 6단계 재생 · Ca²⁺ 차단 · 순서 카드', sum: '➕ 흥분성·억제성 슬라이더 · 예측-확인', drug: '💊 약물 카드 5장 · 효과 재생 · 발표 카드' },
  onFeatures() { updateCtl(); },
  levels,
});

/* ---------- 시작 ---------- */
S.nm = newSNamer(); S.sf = new SynFlow(ST.Dg, { staticNt: true });
S.fl = S.fl || { block: false, blockTested: false, revTested: false, fullRun: false };
S.sf2 = S.sf2 || new SynFlow(FLG.Dg, { hist: true, block: () => S.fl.block });
S.od = S.od || newOrder(); S.sm = S.sm || newSum();
S.sf3 = S.sf3 || new SynFlow(DRG.Dg, { hist: true, loop: true }); S.dr = S.dr || { pl: newDrugPl(), last: null, demo: null, seen: {} };
setScene(S.mode);
let lastFree = false, lastMode = '', lastSub = '';
SciSim.loop((dt, t) => {
  clock = t;
  if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
  if (S.mode !== lastMode || S.sub !== lastSub) { lastMode = S.mode; lastSub = S.sub; PT = ptFor(); updateCtl(); }
  view.apply();
  if (S.mode === 'struct') drawStructScene(dt);
  else if (S.mode === 'flow') {
    if (S.sub === 'play') {
      drawFlowScene(dt); const sf = S.sf2, fl = S.fl;
      if (fl.block && sf.stage >= 3) fl.blockTested = true;
      if (sf.revT >= 3.2) fl.revTested = true;
      if (!fl.block && sf.stage === 6 && sf.done && sf.revT < 0) fl.fullRun = true;
      if (sf.stage > 0 && sf.t < 0.05) updateCtl();
    } else drawOrderScene(dt);
  } else if (S.mode === 'sum') { stepSum(dt); drawSumScene(dt); }
  else drawDrugScene(dt);
  if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,243,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
  readouts();
});

window.__sim = {
  S, VW, VH, SynFlow, get game() { return game; }, setScene, setSub, SNAMES, ST, DRG, DRUGS, STAGES, SMG, FLG, startSum, sumV, SUMROWS, drugFocusUpdate,
  stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'flow') S.sf2.update(0.02); else if (S.mode === 'sum') stepSum(0.02); else if (S.mode === 'drug') S.sf3.update(0.02); } },
};

})();
