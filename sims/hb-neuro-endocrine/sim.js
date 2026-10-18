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
  wrongIds() { return this.chips.filter((c) => { const t = this.slotOf(c); return !t || (t.bin !== undefined ? t.bin !== c.bin : t.ans !== c.id); }).map((c) => c.id); }
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


/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 신경계와 내분비계 (단원 5차시)
   성취기준 [12생과02-04] 내분비계와 신경계 작용 원리와 상호작용의 이해를 바탕으로 우리 몸의 항상성이 유지되는 과정을 추론할 수 있다.
   ① 모형: 신경 신호  ② 모형: 호르몬 신호  ③ 분석: 비교하기  ④ 적용: 함께 일하기
   ========================================================= */
const COL = { neu: '#2563eb', hor: '#f59e0b', horD: '#b45309', ink: '#26324a', mut: '#5a6679', cell: '#8fb4e8', act: '#22c55e' };
const S = { mode: 'neu', fade: 0, neu: null, hor: null, cmp: null, tog: null };
let game = null;
const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
const SCENES = { neu: '⚡ 신경 신호', hor: '🩸 호르몬 신호', cmp: '📊 비교하기', tog: '🤝 함께 일하기' };
const PT_TABLE = {};
function setScene(mode) {
  if (S.mode !== mode) { S.fade = 1; parts.clear(); }
  S.mode = mode; $('#tbLabel').textContent = SCENES[mode];
  PT = PT_TABLE[mode] || null; updateCtl();
}
function updateCtl() {
  $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(S.mode) < 0; });
  $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  if (S.neu) $('#bPoke').disabled = !!S.neu.run;
  if (S.hor) $('#bRecep').classList.toggle('on', S.hor.showR);
  if (S.cmp) { setOn('#rngSeg', 'data-r', S.cmp.range); const o = $('#oCur'); o.textContent = curLabel(); $('#sCur').style.setProperty('--pct', (S.cmp.v / 40 * 100) + '%'); if (+$('#sCur').value !== S.cmp.v) $('#sCur').value = S.cmp.v; }
  if (S.tog) $$('#caseChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.c === S.tog.cur); b.classList.toggle('done', !!S.tog.ro[+b.dataset.c] && S.tog.ro[+b.dataset.c].solved); });
}
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

/* ============ ① 신경 신호 ============ */
const NK = PHONE ? 0.585 : 1, NO = PHONE ? 6 : 0;
const nx = (u) => u * NK + NO;
const NY = PHONE ? 172 : 172;
const NEU_DUR = 2.2;                         // 화면에서 걸리는 시간(초) = 실제 0.05초
function resetNeu() { S.neu = { run: false, t: 0, p: 0, musc: 0, count: 0, done: false, flash: [0, 0], rec: 0 }; }
function pokeNow() {
  const n = S.neu; if (n.run) return; n.run = true; n.t = 0; n.p = 0; n.done = false; n.musc = 0; n.flash = [0, 0]; Sound.tick(); updateCtl();
}
$('#bPoke').addEventListener('click', pokeNow);
$('#bPokeReset').addEventListener('click', () => { Sound.click(); resetNeu(); updateCtl(); });
function stepNeu(dt) {
  const n = S.neu;
  if (n.run) {
    n.t += dt; n.p = clamp(n.t / NEU_DUR, 0, 1);
    if (n.p > 0.36 && !n.flash[0]) { n.flash[0] = 1; parts.burst(nx(316), NY, { count: 8, speed: 50, size: 2.6, colors: ['#f59e0b', '#fde68a'], gravity: 0, life: 0.5 }); }
    if (n.p > 0.62 && !n.flash[1]) { n.flash[1] = 1; parts.burst(nx(432), NY, { count: 8, speed: 50, size: 2.6, colors: ['#f59e0b', '#fde68a'], gravity: 0, life: 0.5 }); }
    if (n.p >= 1) { n.run = false; n.done = true; n.count++; Sound.success(); parts.burst(nx(718), NY, { count: 16, speed: 120, size: 3.4, colors: ['#ef4444', '#fb923c', '#fde68a'], gravity: 80 }); updateCtl(); }
  }
  n.musc = SciSim.approach(n.musc, n.done || (n.run && n.p > 0.98) ? 1 : 0, dt, 9);
}
const neuU = (p) => lerp(110, 646, p);
function drawNeuScene(dt) {
  const n = S.neu, y = NY;
  bgFill('#eef3fb', '#f7f9fd');
  const hs = PHONE ? 12.5 : 14;
  T(PHONE ? 10 : 22, PHONE ? 26 : 34, '⚡ 신경 신호는 연결된 한 곳에만 가요', PHONE ? 15 : 18, COL.ink, 'left', 800);
  // 척수 상자
  D.roundRect(nx(296), y - 64, (432 - 296) * NK, 128, 14); ctx.fillStyle = 'rgba(148,163,184,.2)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  T(nx(364), y + 88, '척수 (중추)', hs, '#64748b', 'center', 800);
  // 뉴런 3개
  const line = (u0, u1, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(nx(u0), y); ctx.lineTo(nx(u1), y); ctx.stroke(); };
  line(100, 300, '#1e40af', 9); line(100, 300, '#60a5fa', 5);
  D.sphere(nx(230), y - 30, 15 * (PHONE ? 0.85 : 1), '#3b82f6', { gloss: true }); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(nx(230), y - 18); ctx.lineTo(nx(230), y - 4); ctx.stroke();
  line(324, 408, '#6d28d9', 9); line(324, 408, '#a78bfa', 5);
  D.sphere(nx(366), y - 24, 13 * (PHONE ? 0.85 : 1), '#8b5cf6', { gloss: true });
  line(440, 646, '#c2410c', 9); line(440, 646, '#fb923c', 5);
  D.sphere(nx(490), y - 30, 15 * (PHONE ? 0.85 : 1), '#f97316', { gloss: true }); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(nx(490), y - 18); ctx.lineTo(nx(490), y - 4); ctx.stroke();
  // 시냅스 (틈)
  [316, 432].forEach((u, i) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nx(u), y, 7, 0, TAU); ctx.fill(); ctx.stroke(); });
  T(nx(316), y + 38, '시냅스', PHONE ? 11.5 : 12.5, COL.mut, 'center', 700); T(nx(432), y + 38, '시냅스', PHONE ? 11.5 : 12.5, COL.mut, 'center', 700);
  // 이름표
  D.label(nx(205), y + 60, '감각 뉴런', { bg: '#2563eb', size: hs }); D.label(nx(366), y - 78, '연합 뉴런', { bg: '#7c3aed', size: hs }); D.label(nx(545), y + 60, '운동 뉴런', { bg: '#ea580c', size: hs });
  // 가시 + 손가락
  const rec = n.musc * 16 * NK;
  T(nx(52) - rec, y + 8, '☝️', PHONE ? 38 : 50, '#000', 'center', 600);
  T(nx(52), y + 54, '🌵', PHONE ? 24 : 30, '#000', 'center', 600); T(nx(52), y + (PHONE ? 76 : 82), '가시', hs, COL.mut, 'center', 700);
  // 팔 근육
  const mx = nx(718), mrx = lerp(60, 42, n.musc) * NK, mry = lerp(26, 38, n.musc);
  const mg = ctx.createLinearGradient(0, y - mry, 0, y + mry); mg.addColorStop(0, C.mix('#f87171', '#dc2626', n.musc)); mg.addColorStop(1, C.mix('#b91c1c', '#7f1d1d', n.musc));
  D.shadow(() => { ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(mx, y, mrx, mry, 0, 0, TAU); ctx.fill(); }, { blur: 6, y: 3 });
  ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(mx, y, mrx, mry, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(mx - mrx * 0.8, y + k * mry * 0.28); ctx.lineTo(mx + mrx * 0.8, y + k * mry * 0.28); ctx.stroke(); }
  D.label(mx, y + 60, n.musc > 0.5 ? '팔 근육 수축!' : '팔 근육', { bg: n.musc > 0.5 ? '#dc2626' : '#7f1d1d', size: hs });
  // 신호
  if (n.run || n.done) {
    const u = neuU(n.p), px = nx(u);
    ctx.save(); ctx.strokeStyle = '#ffd447'; ctx.globalAlpha = 0.55; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(nx(110), y); ctx.lineTo(px, y); ctx.stroke(); ctx.restore();
    if (n.run) { D.glow(px, y, 24, '#ffd447', 0.85); D.sphere(px, y, 7, '#ffe27a', { gloss: false }); }
  }
  // 연결되지 않은 기관들
  const oy = PHONE ? 340 : 380, ow = PHONE ? 146 : 196, ox0 = PHONE ? 8 : 14, gap = PHONE ? 11 : 24;
  [['❤️', '심장'], ['🍽️', '위'], ['🦵', '다리 근육']].forEach((o, i) => {
    const x = ox0 + i * (ow + gap), hb = i === 0 ? 1 + 0.07 * Math.max(0, Math.sin(clock * 6)) : 1;
    D.roundRect(x, oy, ow, PHONE ? 88 : 112, 14); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#b6c2d3'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    T(x + ow / 2, oy + (PHONE ? 38 : 50), o[0], (PHONE ? 30 : 38) * hb, '#000', 'center', 600);
    T(x + ow / 2, oy + (PHONE ? 60 : 76), o[1] + ' · 연결 없음', PHONE ? 12 : 13.5, COL.ink, 'center', 800); T(x + ow / 2, oy + (PHONE ? 76 : 94), '→ 반응 없음', PHONE ? 11.5 : 13, COL.mut, 'center', 800);
  });
  // 스톱워치
  const sx = PHONE ? 10 : 22, sy = PHONE ? 266 : 292, sw = PHONE ? 460 : 400, sh = 56;
  panel(sx, sy, sw, sh, 14);
  T(sx + 14, sy + 24, '⏱ 반응 시간', 13.5, COL.mut, 'left', 800);
  T(sx + 14, sy + 46, (0.05 * n.p).toFixed(3) + ' s', 22, COL.ink, 'left', 800);
  const bx = sx + (PHONE ? 140 : 150), bw = sw - (bx - sx) - 14;
  D.roundRect(bx, sy + 28, bw, 14, 7); ctx.fillStyle = '#e8eef7'; ctx.fill();
  if (n.p > 0.002) { D.roundRect(bx, sy + 28, Math.max(14, bw * n.p), 14, 7); ctx.fillStyle = '#f59e0b'; ctx.fill(); }
  T(bx + bw, sy + 22, '목표 0.050 s (천천히 보여 줘요)', 12, COL.mut, 'right', 700);
  const note = n.done ? '✅ 신경 신호가 약 0.05초 만에 팔 근육 한 곳에만 전달됐어요.' : '🌵 가시에 찔리기를 눌러 신호를 따라가 봐요.';
  T(PHONE ? 10 : 22, PHONE ? 540 : 536, note, PHONE ? 13 : 14.5, n.done ? '#166534' : COL.mut, 'left', 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE.neu = {};

/* ============ ② 호르몬 신호 ============ */
const HL = PHONE ? { cx: 252, cy: 300, w: 330, h: 220, r: 44, off: 54, cr: 23 } : { cx: 400, cy: 296, w: 540, h: 228, r: 48, off: 60, cr: 28 };
const LOOP = (function () {
  const L = HL, pts = [], w2 = L.w / 2, h2 = L.h / 2, r = L.r;
  const segs = [];
  const line = (x0, y0, x1, y1, nx_, ny_) => segs.push({ k: 'l', x0, y0, x1, y1, nx: nx_, ny: ny_, len: Math.hypot(x1 - x0, y1 - y0) });
  const arc = (cx, cy, a0, a1) => segs.push({ k: 'a', cx, cy, a0, a1, len: r * Math.abs(a1 - a0) });
  const X0 = L.cx - w2, X1 = L.cx + w2, Y0 = L.cy - h2, Y1 = L.cy + h2;
  line(X0 + r, Y0, X1 - r, Y0, 0, -1); arc(X1 - r, Y0 + r, -Math.PI / 2, 0);
  line(X1, Y0 + r, X1, Y1 - r, 1, 0); arc(X1 - r, Y1 - r, 0, Math.PI / 2);
  line(X1 - r, Y1, X0 + r, Y1, 0, 1); arc(X0 + r, Y1 - r, Math.PI / 2, Math.PI);
  line(X0, Y1 - r, X0, Y0 + r, -1, 0); arc(X0 + r, Y0 + r, Math.PI, Math.PI * 1.5);
  const total = segs.reduce((a, s) => a + s.len, 0);
  return { segs, total, at(phi) {
    let d = (((phi % 1) + 1) % 1) * total;
    for (const s of segs) {
      if (d <= s.len) {
        const f = s.len ? d / s.len : 0;
        if (s.k === 'l') return { x: lerp(s.x0, s.x1, f), y: lerp(s.y0, s.y1, f), nx: s.nx, ny: s.ny };
        const a = lerp(s.a0, s.a1, f); return { x: s.cx + Math.cos(a) * r, y: s.cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) };
      }
      d -= s.len;
    }
    const s = segs[0]; return { x: s.x0, y: s.y0, nx: 0, ny: -1 };
  } };
})();
const HCELLS = [
  { name: '①', phi: 0.115, target: false, shape: 'sq', col: '#8fb4e8' },
  { name: '②', phi: 0.25, target: true, shape: 'cup', col: '#8fb4e8' },
  { name: '③', phi: 0.46, target: false, shape: 'tri', col: '#8fb4e8' },
  { name: '④', phi: 0.66, target: true, shape: 'cup', col: '#8fb4e8' },
  { name: '⑤', phi: 0.86, target: false, shape: 'dia', col: '#8fb4e8' },
];
const HLOOP_SEC = 60;                 // 한 바퀴 = 60초 (모형 시간)
const H_SPEED = 10;                   // 화면 1초 = 모형 10초
function cellPos(i) { const p = LOOP.at(HCELLS[i].phi); return { x: p.x + p.nx * HL.off, y: p.y + p.ny * HL.off, nx: p.nx, ny: p.ny, vx: p.x, vy: p.y }; }
function resetHor() {
  S.hor = { run: false, t: 0, particles: [], first: null, mark: [false, false, false, false, false], showR: false, cells: HCELLS.map(() => ({ bound: 0, act: 0, react: false, reactT: null, nope: 0 })), rbc: [], lastNote: '', secreted: 0 };
  for (let i = 0; i < 16; i++) S.hor.rbc.push({ phi: i / 16, w: rnd(0.6, 1) });
  const nI = $('#nIn'); if (nI) { nI.value = ''; nI.classList.remove('ok', 'bad'); }
}
function secrete() {
  const h = S.hor; if (h.run && h.t < 3) return;
  // 이전 실험 정리
  h.particles.length = 0; h.cells.forEach((c) => { c.bound = 0; c.act = 0; c.react = false; c.reactT = null; });
  h.first = null; h.t = 0; h.run = true; h.secreted++;
  for (let k = 0; k < 14; k++) h.particles.push({ phi: -k * 0.0045, state: 'flow', cell: -1, f: 0, w: rnd(-1, 1) });
  const g = LOOP.at(0); parts.burst(g.x, g.y - 6, { count: 10, speed: 60, size: 3, colors: ['#f59e0b', '#fde68a'], gravity: 0, life: 0.6 });
  Sound.tick(); updateCtl();
}
$('#bSecrete').addEventListener('click', secrete);
$('#bHorReset').addEventListener('click', () => { Sound.click(); resetHor(); updateCtl(); });
$('#bRecep').addEventListener('click', () => { Sound.click(); S.hor.showR = !S.hor.showR; updateCtl(); });
function stepHor(dt) {
  const h = S.hor, dm = dt * H_SPEED;
  h.rbc.forEach((b) => { b.phi = (b.phi + dm / HLOOP_SEC * 0.9) % 1; });
  if (h.run) {
    h.t += dm;
    h.particles.forEach((p) => {
      if (p.state === 'flow') {
        const p0 = p.phi, p1 = p.phi + dm / HLOOP_SEC;
        p.phi = p1;
        HCELLS.forEach((c, i) => {
          const ph = c.phi; let hit = false;
          for (let k = Math.floor(p0) - 1; k <= Math.floor(p1) + 1; k++) { const q = ph + k; if (p0 < q && p1 >= q) hit = true; }
          const cs = h.cells[i];
          if (!hit || p.state !== 'flow') return;
          if (c.target && cs.bound < 4) { p.state = 'dock'; p.cell = i; p.f = 0; cs.bound++; if (!cs.react) { cs.react = true; cs.reactT = h.t; if (h.first == null) h.first = h.t; Sound.success(); const cp = cellPos(i); parts.burst(cp.x, cp.y, { count: 14, speed: 90, size: 3, colors: ['#22c55e', '#bbf7d0', '#fde68a'], gravity: 40 }); } }
          else if (!c.target) cs.nope = 1;
        });
      } else if (p.state === 'dock') p.f = Math.min(1, p.f + dt * 3.2);
    });
    if (h.t > 240) h.run = false;
  }
  h.cells.forEach((c) => { c.act = SciSim.approach(c.act, c.react ? 1 : 0, dt, 5); c.nope = Math.max(0, c.nope - dt * 2.5); });
}
function drawRecept(x, y, nxv, nyv, shape, size, col, filled) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(nyv, nxv) - Math.PI / 2);
  ctx.fillStyle = col; ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 2;
  ctx.beginPath();
  if (shape === 'cup') { ctx.arc(0, 0, size, Math.PI, 0); ctx.lineTo(size * 0.3, -size * 0.2); ctx.arc(0, 0, size * 0.55, 0, Math.PI, true); ctx.closePath(); }
  else if (shape === 'sq') { ctx.rect(-size * 0.8, -size * 0.2, size * 1.6, size * 0.9); ctx.rect(-size * 0.3, -size * 0.2, size * 0.6, size * 0.5); }
  else if (shape === 'tri') { ctx.moveTo(-size, size * 0.4); ctx.lineTo(0, -size * 0.8); ctx.lineTo(size, size * 0.4); ctx.closePath(); }
  else { ctx.moveTo(0, -size * 0.9); ctx.lineTo(size * 0.8, 0); ctx.lineTo(0, size * 0.9); ctx.lineTo(-size * 0.8, 0); ctx.closePath(); }
  ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawHorScene(dt) {
  const h = S.hor, hs = PHONE ? 12.5 : 14;
  bgFill('#fff6ee', '#fbfaf7');
  T(PHONE ? 10 : 22, PHONE ? 26 : 34, '🩸 호르몬은 혈액을 타고 온몸을 돌아요', PHONE ? 14.5 : 17, COL.ink, 'left', 800);
  // 혈관
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); for (let k = 0; k <= 240; k++) { const q = LOOP.at(k / 240); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.closePath(); };
  ctx.strokeStyle = '#d98b8b'; ctx.lineWidth = PHONE ? 26 : 32; path(); ctx.stroke();
  ctx.strokeStyle = '#ffe3e0'; ctx.lineWidth = PHONE ? 20 : 26; path(); ctx.stroke();
  ctx.restore();
  // 적혈구 (혈액이 흐르는 모습)
  h.rbc.forEach((b) => { const q = LOOP.at(b.phi + 0.0); ctx.fillStyle = 'rgba(214,60,70,.55)'; ctx.beginPath(); ctx.ellipse(q.x + q.ny * 4 * b.w * 0, q.y, 4.4, 3, Math.atan2(q.ny, q.nx), 0, TAU); ctx.fill(); });
  // 흐름 방향
  const a0 = LOOP.at(0.3), a1 = LOOP.at(0.3 + 0.02); D.arrow(a0.x - 20, a0.y, a0.x + 20, a0.y, { color: '#c2410c', width: 3, head: 9, alpha: 0.75 });
  T(a0.x, a0.y - (PHONE ? 22 : 26), '혈액의 흐름', 12, '#9a3412', 'center', 800);
  // 내분비샘
  const g = LOOP.at(0), gx = g.x - (PHONE ? 6 : 8), gy = g.y - (PHONE ? 56 : 66);
  ctx.save(); const gg = ctx.createRadialGradient(gx - 6, gy - 6, 4, gx, gy, 30); gg.addColorStop(0, '#fde68a'); gg.addColorStop(1, '#f59e0b');
  D.shadow(() => { ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(gx, gy, 32, 24, 0, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
  ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(gx, gy, 32, 24, 0, 0, TAU); ctx.stroke(); ctx.restore();
  [[-10, -4], [4, 4], [10, -6], [-2, 8]].forEach((o) => D.sphere(gx + o[0], gy + o[1], 4.4, '#ea580c', { gloss: false }));
  ctx.strokeStyle = '#b45309'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gx, gy + 24); ctx.lineTo(g.x, g.y - 12); ctx.stroke();
  D.label(gx + (PHONE ? 74 : 86), gy - 2, '내분비샘', { bg: '#b45309', size: hs });
  // 세포
  HCELLS.forEach((c, i) => {
    const cp = cellPos(i), cs = h.cells[i], r = HL.cr * (1 + 0.05 * cs.act * Math.sin(clock * 6));
    const base = C.mix('#9ec2f0', '#4ade80', cs.act);
    if (cs.act > 0.05) D.glow(cp.x, cp.y, r * 2.3, '#22c55e', 0.45 * cs.act);
    const sh = cs.nope > 0 && !RM ? Math.sin(clock * 50) * 2.5 * cs.nope : 0;
    D.sphere(cp.x + sh, cp.y, r, base, { gloss: true, shadow: true });
    ctx.strokeStyle = C.shade(base, -0.4); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cp.x + sh, cp.y, r, 0, TAU); ctx.stroke();
    D.sphere(cp.x + sh - r * 0.1, cp.y + r * 0.1, r * 0.34, C.shade(base, -0.28), { gloss: false });
    D.label(cp.x, cp.ny < -0.5 ? cp.y - r - 15 : cp.y + r + 15, '세포 ' + c.name, { bg: 'rgba(38,50,74,.82)', size: PHONE ? 12 : 13 });
    // 수용체
    const rx = cp.x - cp.nx * r, ry = cp.y - cp.ny * r;
    if (h.showR) drawRecept(rx, ry, -cp.nx, -cp.ny, c.shape, 8, c.target ? '#16a34a' : '#8795a8', true);
    if (cs.react) { D.check(cp.x + r * 0.9, cp.y - r * 0.9, 9, 1); }
    if (h.mark[i]) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(cp.x, cp.y, r + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); T(cp.x - r - 6, cp.y - r - 4, '🎯', 18, '#000', 'center', 600); }
  });
  // 혈관 가운데 안내
  { const cx0 = HL.cx, cy0 = HL.cy; T(cx0, cy0 - 18, '❤️ 혈액이 온몸을 한 바퀴 도는 데', PHONE ? 13 : 15, '#9a3412', 'center', 800); T(cx0, cy0 + 6, '약 1분(60초)', PHONE ? 15 : 17, '#9a3412', 'center', 800);
    if (h.showR) { T(cx0 - (PHONE ? 70 : 90), cy0 + 44, '수용체', 12.5, COL.mut, 'center', 800); drawRecept(cx0 - (PHONE ? 20 : 30), cy0 + 36, 0, 1, 'cup', 7, '#16a34a'); T(cx0 + 4, cy0 + 45, '= 호르몬 X와 맞음', 12.5, '#166534', 'left', 800); drawRecept(cx0 - (PHONE ? 20 : 30), cy0 + 62, 0, 1, 'tri', 7, '#8795a8'); T(cx0 + 4, cy0 + 71, '= 맞지 않음', 12.5, COL.mut, 'left', 800); } else T(cx0, cy0 + 40, '🔬 수용체 보기를 켜면 세포의 수용체가 보여요', 12.5, COL.mut, 'center', 700); }
  // 호르몬 입자
  h.particles.forEach((p) => {
    let x, y;
    if (p.state === 'flow') { const q = LOOP.at(p.phi); x = q.x + q.ny * p.w * 3; y = q.y - q.nx * p.w * 3; }
    else { const i = p.cell, cp = cellPos(i), q0 = LOOP.at(HCELLS[i].phi), r = HL.cr; const ex = cp.x - cp.nx * (r + 1), ey = cp.y - cp.ny * (r + 1); const f = smooth(p.f), tx = -cp.ny, ty = cp.nx; x = lerp(q0.x, ex, f) + tx * p.w * 9; y = lerp(q0.y, ey, f) + ty * p.w * 9; }
    D.sphere(x, y, 5.6, '#f59e0b', { gloss: true });
  });
  // 시계
  const px = PHONE ? 8 : 596, py = PHONE ? 38 : 12, pw = PHONE ? 464 : 190;
  if (PHONE) { T(10, 52, '분비 후 경과 시간 ' + Math.round(h.t) + ' s (10배속) · 첫 반응 ' + (h.first == null ? '—' : Math.round(h.first) + ' s'), 13, COL.horD, 'left', 800); }
  else { panel(px, py, pw, 62, 12); T(px + 12, py + 24, '⏱ 분비 후 (10배속)', 13, COL.mut, 'left', 800); T(px + 12, py + 50, Math.round(h.t) + ' s', 22, COL.horD, 'left', 800); T(px + pw - 12, py + 50, '첫 반응 ' + (h.first == null ? '—' : Math.round(h.first) + ' s'), 14.5, COL.ink, 'right', 800); }
  const note = h.first == null ? (h.run ? '호르몬이 혈액을 따라 돌고 있어요…' : '🧪 호르몬 분비를 눌러 보세요. 세포를 눌러 🎯 표적 세포로 표시해요.') : '표적 세포(수용체가 맞는 세포)만 반응했어요. 호르몬은 온몸을 돌지만 아무 세포나 반응하지는 않아요.';
  if (PHONE) textBlock(10, 556, VW - 20, note, 12.5, h.first == null ? COL.mut : '#166534', 18, 800); else T(22, 545, note, 14, h.first == null ? COL.mut : '#166534', 'left', 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE.hor = {
  down(p) {
    const h = S.hor;
    for (let i = 0; i < HCELLS.length; i++) { const cp = cellPos(i); if (Math.hypot(p.x - cp.x, p.y - cp.y) < HL.cr + 12) { h.mark[i] = !h.mark[i]; Sound.click(); return false; } }
    return false;
  },
  hover(p) { for (let i = 0; i < HCELLS.length; i++) { const cp = cellPos(i); if (Math.hypot(p.x - cp.x, p.y - cp.y) < HL.cr + 12) return 'pointer'; } return 'default'; },
};


/* ============ ③ 비교하기: 반응 시간 그래프와 비교표 ============ */
const neuralEff = (t) => (t < 0.2 ? 100 * t / 0.2 : t <= 60 ? 100 : 100 * Math.exp(-(t - 60) / 20));       // 상대값
const hormEff = (t) => (t < 30 ? 0 : t < 90 ? 100 * smooth((t - 30) / 60) : 100);
const CMP_ROWS = [
  { q: '전달 매체', opts: [{ s: '뉴런', d: '뉴런(신경 세포)' }, { s: '혈액', d: '혈액' }], ans: 0 },
  { q: '반응 속도', opts: [{ s: '느림', d: '느림 (수 분~수 시간)' }, { s: '매우 빠름', d: '매우 빠름 (수 ms~수십 ms)' }], ans: 1 },
  { q: '작용 범위', opts: [{ s: '온몸', d: '온몸 (표적 세포만 반응)' }, { s: '좁은 범위', d: '좁음 (특정 세포 · 근육)' }], ans: 1 },
  { q: '지속 시간', opts: [{ s: '짧음', d: '짧음' }, { s: '오래 지속', d: '오래 지속' }], ans: 0 },
  { q: '전달 물질', opts: [{ s: '호르몬', d: '호르몬' }, { s: '신경 전달 물질', d: '신경 전달 물질' }], ans: 1 },
];
const CG = PHONE
  ? { P: { x: 8, y: 8, w: 464, h: 304 }, plot: { x: 58, y: 50, w: 396, h: 184 }, tickY: 254, xlY: 278, TB: { x: 8, y: 320, w: 464, h: 312 } }
  : { P: { x: 14, y: 14, w: 772, h: 292 }, plot: { x: 86, y: 52, w: 676, h: 188 }, tickY: 260, xlY: 282, TB: { x: 14, y: 314, w: 772, h: 232 } };
function resetCmp() { S.cmp = { range: 'fast', v: 0, a: false, b: false, picks: [null, null, null, null, null], bad: [0, 0, 0, 0, 0], drag: false }; buildRows(); }
const cmpT = () => (S.cmp.range === 'fast' ? S.cmp.v * 0.05 : S.cmp.v * 15);
const curLabel = () => (S.cmp.range === 'fast' ? (S.cmp.v * 0.05).toFixed(2) + ' s' : (S.cmp.v * 15) + ' s');
const cmpAxes = () => makeAxes(CG.plot, S.cmp.range === 'fast' ? [0, 2] : [0, 600], [0, 125]);
function setCur(v) { const c = S.cmp; c.v = clamp(Math.round(v), 0, 40); updateCtl(); }
function buildRows() {
  const box = $('#tblRows'); if (!box) return; box.innerHTML = '';
  CMP_ROWS.forEach((r, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + r.q + ' · 신경계는?</div><div class="segmented view-seg" role="group" aria-label="' + r.q + '에서 신경계 고르기"></div>';
    const seg = row.querySelector('.segmented');
    r.opts.forEach((o, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = o.s; b.dataset.k = k; b.addEventListener('click', () => { Sound.click(); S.cmp.picks[i] = k; S.cmp.bad[i] = 0; paintRows(); }); seg.appendChild(b); });
    box.appendChild(row);
  });
  paintRows();
}
function paintRows() { $$('#tblRows .sel-row').forEach((row, i) => $$('button', row).forEach((b) => b.classList.toggle('on', S.cmp.picks[i] === +b.dataset.k))); }
bindSeg('#rngSeg', 'data-r', (r) => { S.cmp.range = r; S.cmp.v = 0; updateCtl(); });
SciSim.bindRange($('#sCur'), null, null, (v) => { if (S.cmp) { S.cmp.v = v; updateCtl(); } });
function stepCmp() {
  const c = S.cmp, t = cmpT(), n = Math.round(neuralEff(t)), h = Math.round(hormEff(t));
  if (c.range === 'fast' && n === 100 && h === 0) c.a = true;
  if (c.range === 'slow' && h === 100 && n < h) c.b = true;
}
function drawCmpScene(dt) {
  const c = S.cmp, P = CG.P, pl = CG.plot, A = cmpAxes(), t = cmpT(), fast = c.range === 'fast';
  bgFill('#eef3fb', '#f7f9fd');
  panel(P.x, P.y, P.w, P.h, 16);
  T(P.x + 16, P.y + 26, '📊 위기 상황에서 두 반응의 크기 (상대값 · 교육용 예시)', PHONE ? 13.5 : 15.5, COL.ink, 'left', 800);
  drawAxes(A, { xt: fast ? [0, 0.5, 1, 1.5, 2] : [0, 100, 200, 300, 400, 500, 600], yt: [0, 25, 50, 75, 100], xf: (v) => String(v), xl: fast ? '시간 (초) — 처음 2초' : '시간 (초) — 10분(600초)', yl: '반응의 크기', tickY: CG.tickY, xlY: CG.xlY, ylx: PHONE ? 38 : 50, fs: 13 });
  if (!fast) { ctx.save(); ctx.fillStyle = 'rgba(37,99,235,.06)'; ctx.fillRect(A.X(0), pl.y, A.X(60) - A.X(0), pl.h); ctx.restore(); }
  plotFn(A, neuralEff, 0, fast ? 2 : 600, fast ? 0.01 : 1, COL.neu, 4);
  plotFn(A, hormEff, 0, fast ? 2 : 600, fast ? 0.01 : 1, COL.hor, 4);
  // 범례
  D.label(pl.x + pl.w - 10, pl.y + 14, '● 내분비계 반응', { bg: COL.horD, size: 12.5, align: 'right' }); D.label(pl.x + pl.w - (PHONE ? 126 : 138), pl.y + 14, '● 신경계 반응', { bg: COL.neu, size: 12.5, align: 'right' });
  // 커서
  const cx = A.X(t), n = neuralEff(t), h = hormEff(t);
  ctx.save(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, pl.y); ctx.lineTo(cx, pl.y + pl.h); ctx.stroke(); ctx.restore();
  D.sphere(cx, A.Y(n), 6.5, COL.neu, { gloss: true }); D.sphere(cx, A.Y(h), 6.5, COL.hor, { gloss: true });
  D.roundRect(cx - 10, pl.y + pl.h + 3, 20, 10, 5); ctx.fillStyle = '#26324a'; ctx.fill();
  const right = cx > pl.x + pl.w * 0.62;
  const bx = right ? cx - 10 : cx + 10, al = right ? 'right' : 'left';
  const yn = A.Y(n) + (Math.abs(A.Y(n) - A.Y(h)) < 22 ? (n >= h ? -14 : 14) : 0);
  const yh = A.Y(h) + (Math.abs(A.Y(n) - A.Y(h)) < 22 ? (n >= h ? 20 : -14) : 0);
  T(bx, clamp(yn - 6, pl.y + 44, pl.y + pl.h - 6), '신경 ' + Math.round(n), 13.5, '#1d4ed8', al, 800, { stroke: '#fff', strokeWidth: 4 });
  T(bx, clamp(yh - 6, pl.y + 44, pl.y + pl.h - 6), '호르몬 ' + Math.round(h), 13.5, '#b45309', al, 800, { stroke: '#fff', strokeWidth: 4 });
  if (!fast) T(A.X(60) - 4, pl.y + pl.h - 8, '약 1분', 12, '#1d4ed8', 'right', 800);
  // 비교표
  const TB = CG.TB; panel(TB.x, TB.y, TB.w, TB.h, 16);
  const cw0 = PHONE ? 100 : 150, cw = (TB.w - cw0 - 24) / 2, rh = PHONE ? 46 : 34, hy = TB.y + 12;
  D.roundRect(TB.x + 12, hy, TB.w - 24, 30, 8); ctx.fillStyle = '#e8eefa'; ctx.fill();
  T(TB.x + 12 + cw0 / 2, hy + 21, '비교 항목', 13.5, COL.ink, 'center', 800); T(TB.x + 12 + cw0 + cw / 2, hy + 21, '신경계', 14, COL.neu, 'center', 800); T(TB.x + 12 + cw0 + cw * 1.5, hy + 21, '내분비계', 14, COL.horD, 'center', 800);
  CMP_ROWS.forEach((r, i) => {
    const y = hy + 36 + i * rh, pk = c.picks[i];
    D.roundRect(TB.x + 12, y, TB.w - 24, rh - 4, 8); ctx.fillStyle = c.bad[i] ? '#fdeceb' : (i % 2 ? '#f8fafd' : '#fff'); ctx.fill(); ctx.strokeStyle = c.bad[i] ? '#e2464b' : '#e3e8f0'; ctx.lineWidth = c.bad[i] ? 2.4 : 1.2; ctx.stroke();
    T(TB.x + 12 + cw0 / 2, y + (rh - 4) / 2 + 5, r.q, 13.5, COL.ink, 'center', 800);
    const f = (cx0, txt, col) => { const sz = fitSize(txt, cw - 12, 13.5, 10.5, 800); const ls = wrap(txt, cw - 12, sz, 800); ls.slice(0, 2).forEach((l, k) => T(cx0, y + (rh - 4) / 2 + 5 + (k - (Math.min(2, ls.length) - 1) / 2) * 14.5, l, ls.length > 1 ? 12 : sz, col, 'center', 800)); };
    if (pk == null) { f(TB.x + 12 + cw0 + cw / 2, '—', '#a0abbb'); f(TB.x + 12 + cw0 + cw * 1.5, '—', '#a0abbb'); }
    else { f(TB.x + 12 + cw0 + cw / 2, r.opts[pk].d, '#1d4ed8'); f(TB.x + 12 + cw0 + cw * 1.5, r.opts[1 - pk].d, '#b45309'); }
  });
  if (c.picks.every((p) => p != null) && !c.bad.some((b) => b)) T(TB.x + TB.w - 16, TB.y + TB.h - 8, '✔ 확인하기를 눌러요', 12.5, COL.mut, 'right', 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE.cmp = {
  down(p) { const pl = CG.plot; if (p.x >= pl.x - 10 && p.x <= pl.x + pl.w + 10 && p.y >= pl.y - 4 && p.y <= pl.y + pl.h + 22) { S.cmp.drag = true; this.move(p); return true; } return false; },
  move(p) { if (!S.cmp.drag) return; const pl = CG.plot; setCur((p.x - pl.x) / pl.w * 40); },
  up() { S.cmp.drag = false; },
  hover(p) { const pl = CG.plot; return p.x >= pl.x - 10 && p.x <= pl.x + pl.w + 10 && p.y >= pl.y && p.y <= pl.y + pl.h ? 'ew-resize' : 'default'; },
};

/* ============ ④ 함께 일하기: 순서 카드 ============ */
const STAGES = ['감각 기관', '중추 신경계', '시상 하부', '신경 · 내분비 경로', '표적 기관'];
const CASES = [
  { icon: '😱', name: '위기 상황: 심박 상승', cards: ['큰 소리를 귀가 감지', '대뇌가 위험하다고 판단', '시상 하부가 조절 명령', '교감 신경 + 부신 호르몬', '심장 박동이 빨라짐'], cap: ['귀가 큰 소리를 감지해요.', '대뇌가 위험하다고 판단해요.', '시상 하부가 교감 신경과 내분비샘에 명령해요.', '신경은 즉시, 호르몬은 혈액을 타고 오래 작용해요.', '심장이 빨리, 오래 뛰어요.'] },
  { icon: '🍚', name: '식사 후: 소화 활동', cards: ['음식 맛 · 냄새를 감지', '대뇌가 식사 상황 인지', '시상 하부와 연수 조절', '부교감 신경 + 소화 호르몬', '소화 운동 · 소화액 증가'], cap: ['음식의 맛과 냄새를 감지해요.', '대뇌가 식사 상황을 알아차려요.', '시상 하부와 연수가 소화를 조절해요.', '부교감 신경과 소화 호르몬이 함께 작용해요.', '위 · 소장의 운동과 소화액이 늘어요.'] },
  { icon: '🥶', name: '추운 곳: 체온 유지', cards: ['피부가 낮은 온도 감지', '감각 신호가 중추로 전달', '시상 하부(체온 조절 중추)', '교감 신경 + 갑상샘 호르몬', '열 발생 증가 · 체온 유지'], cap: ['피부가 낮은 온도를 감지해요.', '감각 신경이 신호를 중추로 보내요.', '시상 하부가 체온이 낮다고 판단해요.', '교감 신경과 호르몬이 열 발생을 늘려요.', '열 발생이 늘고 체온이 유지돼요.'] },
];
const TGG = PHONE
  ? { cw: 440, ch: 46, slot: (i) => ({ x: 28, y: 246 + i * 56 }), bx: (i) => 8 + i * 95, bw: 84, by: 62, bh: 58 }
  : { cw: 148, ch: 100, slot: (i) => ({ x: 14 + i * 156, y: 352 }), bx: (i) => 14 + i * 156, bw: 134, by: 70, bh: 84 };
function shuffleRo(ro) {
  const n = ro.n; for (let k = 0; k < 30 && (ro.solved || k < 2); k++) { const i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n); const t = ro.order[i]; ro.order[i] = ro.order[j]; ro.order[j] = t; }
  if (ro.solved) { const t = ro.order[0]; ro.order[0] = ro.order[1]; ro.order[1] = t; }
  ro.snap(true);
}
function newRo(ci) {
  const items = CASES[ci].cards.map((t, i) => ({ id: 's' + i, label: t, col: '#4b6b8a' }));
  const slots = [0, 1, 2, 3, 4].map((i) => TGG.slot(i));
  const ro = new Reorder({ items, slots, cw: TGG.cw, ch: TGG.ch, solution: items.map((x) => x.id), onChange() { updateCtl(); } });
  ro.solvedOnce = false; shuffleRo(ro); return ro;
}
function resetTog() { S.tog = { cur: 0, ro: [newRo(0), newRo(1), newRo(2)], t: 0 }; }
bindSeg('#caseChips', 'data-c', (c) => { S.tog.cur = +c; S.tog.t = 0; updateCtl(); });
$('#bTogReset').addEventListener('click', () => { Sound.click(); const i = S.tog.cur; S.tog.ro[i] = newRo(i); updateCtl(); });
function drawTogScene(dt) {
  const tg = S.tog, ro = tg.ro[tg.cur], cs = CASES[tg.cur], solved = ro.solved;
  tg.t += dt;
  bgFill('#eef3fb', '#f7f9fd');
  T(PHONE ? 10 : 20, PHONE ? 26 : 32, cs.icon + ' ' + cs.name, PHONE ? 15 : 18, COL.ink, 'left', 800);
  // 흐름도
  const G = TGG, bw = G.bw, bh = G.bh, by = G.by;
  const cols = ['#64748b', '#7c3aed', '#0d9488', '#2563eb', '#dc2626'];
  for (let i = 0; i < 5; i++) {
    const x = G.bx(i);
    if (i < 4) D.arrow(x + bw + 1, by + bh / 2, G.bx(i + 1) - 1, by + bh / 2, { color: '#94a3b8', width: 3, head: 8 });
    if (i === 3) {
      [['신경 (교감·부교감)', COL.neu, 0], ['내분비샘 (호르몬)', COL.hor, 1]].forEach((q) => {
        D.roundRect(x, by + q[2] * (bh / 2 + 2), bw, bh / 2 - 2, 9); ctx.fillStyle = q[1]; ctx.fill();
        TF(x + bw / 2, by + q[2] * (bh / 2 + 2) + (bh / 2 - 2) / 2 + 5, q[0], bw - 8, PHONE ? 11 : 12.5, 9.5, '#fff', 'center', 800);
      });
    } else {
      D.shadow(() => { D.roundRect(x, by, bw, bh, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 2.4; D.roundRect(x, by, bw, bh, 12); ctx.stroke();
      const ls = wrap(STAGES[i], bw - 8, PHONE ? 12 : 13.5, 800); ls.forEach((l, k) => T(x + bw / 2, by + bh / 2 + 5 + (k - (ls.length - 1) / 2) * 16, l, PHONE ? 12 : 13.5, cols[i], 'center', 800));
    }
    if (solved) { const cl = wrap(cs.cap[i], bw, PHONE ? 10.5 : 12.5, 700); cl.slice(0, PHONE ? 4 : 5).forEach((l, k) => T(x + bw / 2, by + bh + 20 + k * (PHONE ? 13 : 16), l, PHONE ? 10.5 : 12.5, COL.mut, 'center', 700)); }
  }
  // 신호 전선: 파랑(빠름) · 주황(느림)
  { const x0 = G.bx(2) + bw / 2, x1 = G.bx(4) + bw / 2, yb = by - 28, yo = by - 14;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#93c5fd'; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke(); ctx.strokeStyle = '#fcd34d'; ctx.beginPath(); ctx.moveTo(x0, yo); ctx.lineTo(x1, yo); ctx.stroke(); ctx.restore();
    T(x0 - 6, yb + 4, '신경(빠름)', PHONE ? 10.5 : 11.5, '#1d4ed8', 'right', 800); T(x0 - 6, yo + 4 + (PHONE ? 9 : 0), '호르몬(느림)', PHONE ? 10.5 : 11.5, '#b45309', 'right', 800);
    if (!RM) { const f1 = (tg.t * 0.6) % 1.5, f2 = (tg.t * 0.16) % 1.5;
      if (f1 < 1) { const x = lerp(x0, x1, f1); D.glow(x, yb, 12, '#60a5fa', 0.8); D.sphere(x, yb, 4.6, '#3b82f6', { gloss: false }); }
      if (f2 < 1) { const x = lerp(x0, x1, f2); D.glow(x, yo, 12, '#fbbf24', 0.8); D.sphere(x, yo, 4.6, '#f59e0b', { gloss: false }); } } }
  // 안내 · 카드
  const hy = PHONE ? 226 : 330;
  T(PHONE ? 10 : 20, hy - (PHONE ? 4 : 12) + (solved ? 0 : 0), solved ? '✨ 순서가 맞아요! 파랑은 빠르고 짧게, 주황은 느리지만 오래 작용해요.' : '👇 카드를 끌어서 일어나는 순서(감각 → 중추 → 시상 하부 → 경로 → 표적 기관)로 놓아요', PHONE ? 12 : 13.5, solved ? '#166534' : COL.mut, 'left', 800);
  ro.update(dt); ro.draw();
  const done = tg.ro.filter((r) => r.solved).length;
  T(PHONE ? 10 : 20, PHONE ? 626 : 540, '맞춘 사례 ' + done + ' / 3 (사례 버튼으로 바꿔요)', PHONE ? 12.5 : 14, COL.mut, 'left', 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE.tog = { down(p) { return S.tog.ro[S.tog.cur].down(p); }, move(p) { S.tog.ro[S.tog.cur].move(p); }, up(p) { S.tog.ro[S.tog.cur].up(p); }, hover(p) { return S.tog.ro[S.tog.cur].hover(p); } };


/* ---------- 읽음 칸 ---------- */
let rlast = '';
function readouts() {
  let L1, L2, L3, a, b, c;
  if (S.mode === 'neu') { const n = S.neu; L1 = '반응 시간'; a = (0.05 * n.p).toFixed(3) + ' s'; L2 = '작용 범위'; b = n.done ? '근육 한 곳' : '—'; L3 = '전달 물질'; c = '신경 전달 물질'; }
  else if (S.mode === 'hor') { const h = S.hor, tg = h.cells.filter((x) => x.react).length; L1 = '경과 시간'; a = Math.round(h.t) + ' s'; L2 = '반응한 세포'; b = tg + ' / 2'; L3 = '첫 반응까지'; c = h.first == null ? '—' : Math.round(h.first) + ' s'; }
  else if (S.mode === 'cmp') { const t = cmpT(); L1 = '시각'; a = curLabel(); L2 = '신경 반응'; b = Math.round(neuralEff(t)) + ''; L3 = '호르몬 반응'; c = Math.round(hormEff(t)) + ''; }
  else { const tg = S.tog; L1 = '사례'; a = CASES[tg.cur].icon + ' ' + CASES[tg.cur].name.split(':')[0]; L2 = '맞춘 사례'; b = tg.ro.filter((r) => r.solved).length + ' / 3'; L3 = '이 사례'; c = tg.ro[tg.cur].solved ? '순서 완성' : '배열 중'; }
  const k = [L1, a, L2, b, L3, c].join('|');
  if (k === rlast) return; rlast = k;
  l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
}

/* ================= 미션 ================= */
const TARGET_IDX = HCELLS.map((c, i) => (c.target ? i : -1)).filter((i) => i >= 0);
const levels = [
  {
    title: '신경 신호: 연결된 한 곳에 아주 빠르게', short: '신경 신호', icon: '⚡', phase: '모형',
    intro: '<p class="si-q">❓ 탐구 질문: 가시에 찔리면 순식간에 손을 떼는데, 놀란 뒤에는 한참 동안 가슴이 뛰는 까닭은 무엇일까?</p>' +
      '<div class="si-link">🔗 <b>중학교에서</b> 호르몬의 종류와 혈당 · 체온 조절을 배웠고, <b>앞 차시들</b>에서 뉴런의 신호와 시냅스를 배웠어요. 이번에는 호르몬 이름을 외우는 대신 <b>신경 신호와 호르몬 신호가 전달되는 원리</b>를 비교하고, 두 체계가 <b>함께 일하는 과정</b>을 추론해요.</div>' +
      '<p>① 신경 신호 → ② 호르몬 신호 → ③ 비교하기 → ④ 함께 일하기 순서예요. 먼저 신경 신호가 어디에 얼마나 빨리 전달되는지 확인해요.</p>',
    features: ['neu'],
    setup() { resetNeu(); setScene('neu'); },
    recap: '신경 신호는 뉴런과 시냅스로 연결된 특정 근육 · 세포 한 곳에 매우 빠르게(약 0.05초) 전달돼요.',
    summary: '<ul><li><b>신경 신호</b>: 감각 뉴런 → 연합 뉴런 → 운동 뉴런을 따라 <b>뉴런과 시냅스</b>로 전달돼요.</li><li><b>좁은 범위</b>: 신경이 연결된 특정 근육 · 세포에만 작용해요(예: 가시에 찔렸을 때 팔 근육).</li><li><b>매우 빠름</b>: 수 ms ~ 수십 ms, 가시 반사의 반응 시간은 약 0.05초(예시).</li><li>효과는 짧게 지속돼요. 전달 물질은 시냅스에서 방출되는 신경 전달 물질이에요.</li></ul>',
    missions: [
      {
        title: '가시에 찔렸을 때 근육 수축시키기',
        goal: '<b>🌵 가시에 찔리기</b>를 눌러 신호가 감각 뉴런 → 연합 뉴런 → 운동 뉴런을 따라 팔 근육까지 가서 근육이 수축하게 하세요.',
        hint: '오른쪽 조작판의 🌵 가시에 찔리기 버튼을 누르고 신호가 근육에 닿을 때까지 기다려요(약 2초).',
        setup() { setScene('neu'); },
        check: () => S.neu.count >= 1 && S.neu.done && !S.neu.run,
        hold: 0.6,
        status: () => mark(S.neu.count >= 1) + ' 신호 보내기 &nbsp; ' + mark(S.neu.done) + ' 근육 수축 &nbsp; ⏱ ' + (0.05 * S.neu.p).toFixed(3) + ' s',
        explain: '신호는 <b>감각 뉴런 → 연합 뉴런(척수) → 운동 뉴런</b>을 따라 시냅스를 건너 팔 근육에 도착해요. 전체 반응 시간은 약 <b>0.05초</b>(교육용 예시)로 아주 빨라요.',
      },
      {
        type: 'quiz', title: '신경 신호는 어디에 작용할까?',
        goal: '가시에 찔렸을 때의 신경 신호는 몸의 어느 부분에 작용했을까요?',
        setup() { setScene('neu'); },
        choices: ['신경으로 연결된 특정 근육 · 세포 한 곳', '혈액을 타고 온몸의 모든 세포', '몸의 모든 근육이 동시에', '연결과 관계없이 가까운 기관 모두'],
        answer: 0,
        feedback: ['', '혈액을 타고 온몸으로 가는 것은 호르몬이에요. 신경 신호는 뉴런을 따라 가요.', '화면에서 심장 · 위 · 다리 근육은 연결이 없어서 반응하지 않았어요.', '신경은 연결된 곳에만 신호를 전해요. 가깝다고 반응하지는 않아요.'],
        explain: '신경 신호는 뉴런이 연결된 <b>특정 근육 · 세포 한 곳</b>(좁은 범위)에만 작용해요. 그래서 빠르고 정확하지만, 효과가 몸 전체로 퍼지지는 않아요.',
      },
    ],
  },
  {
    title: '호르몬 신호: 혈액을 타고 온몸으로', short: '호르몬 신호', icon: '🩸', phase: '모형',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신경 신호는 연결된 한 곳에 매우 빠르게 작용한다고 확인했어요. 호르몬은 <b>내분비샘</b>에서 <b>혈액</b>으로 분비돼요. 어떻게 필요한 세포만 찾아 작용할까요?</div>' +
      '<p>호르몬 X(교육용 예시)를 분비하면 혈액을 따라 온몸을 돌아요(<b>전신 순환 약 1분</b>). 다섯 세포 옆을 모두 지나가지만, 호르몬과 맞는 <b>수용체</b>가 있는 <b>표적 세포</b>만 반응해요. 호르몬과 수용체는 열쇠와 자물쇠처럼 맞는 것끼리만 결합해요.</p>',
    features: ['hor'],
    setup() { resetHor(); setScene('hor'); },
    recap: '호르몬은 혈액을 타고 온몸을 돌지만, 수용체가 맞는 표적 세포만 반응해요. 반응이 나타나기까지는 신경 신호보다 오래 걸려요.',
    summary: '<ul><li><b>내분비샘</b>에서 호르몬이 <b>혈액</b>으로 분비돼요.</li><li>혈액을 타고 <b>온몸</b>을 돌아요(전신 순환 약 1분). 그래서 도착까지 시간이 걸려요(수 초 ~ 수 분 이상).</li><li>호르몬과 맞는 <b>수용체</b>가 있는 <b>표적 세포</b>만 반응해요(열쇠–자물쇠처럼 특이적).</li><li>수용체가 없는 세포 옆을 지나가도 반응하지 않아요.</li></ul>',
    missions: [
      {
        title: '표적 세포 알아내기',
        goal: '<b>🧪 호르몬 분비</b>를 누르고 호르몬 X에 <b>반응하는 세포 2개</b>를 눌러 <b>🎯 표적 세포</b>로 표시하세요.',
        hint: '호르몬 입자가 세포 옆을 지날 때 수용체가 맞는 세포는 초록색으로 바뀌고 ✔가 나타나요. 🔬 수용체 보기를 켜면 수용체 모양도 비교할 수 있어요.',
        setup() { setScene('hor'); },
        check() { const h = S.hor; return TARGET_IDX.every((i) => h.cells[i].react) && h.mark.every((m, i) => m === (HCELLS[i].target)); },
        hold: 0.6,
        status() { const h = S.hor; return mark(h.secreted > 0) + ' 분비 &nbsp; ' + mark(TARGET_IDX.every((i) => h.cells[i].react)) + ' 반응한 세포 ' + h.cells.filter((c) => c.react).length + '/2 &nbsp; ' + mark(h.mark.every((m, i) => m === HCELLS[i].target)) + ' 🎯 표시 ' + h.mark.filter((m) => m).length + '개'; },
        explain: '호르몬 X는 <b>세포 ②, ④</b>의 수용체와 맞아서 이 두 세포(<b>표적 세포</b>)만 반응했어요. 나머지 세포에도 호르몬이 지나갔지만 수용체가 맞지 않아 반응하지 않았어요.',
      },
      {
        title: '반응이 나타나기까지 걸린 시간', manual: true,
        goal: '분비한 뒤 <b>첫 표적 세포가 반응할 때까지</b> 걸린 시간(초)을 화면의 시계에서 읽어 입력하고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '화면의 「첫 반응」 칸에 시간이 표시돼요. 분비를 아직 안 했다면 🧪 호르몬 분비를 먼저 눌러요.',
        setup() { setScene('hor'); },
        check() {
          const h = S.hor, el = $('#nIn'); el.classList.remove('ok', 'bad');
          if (h.first == null) return '아직 표적 세포가 반응하지 않았어요. 🧪 호르몬 분비를 누르고 첫 반응이 나타나길 기다려요.';
          const v = parseFloat(el.value);
          if (!isFinite(v)) return '걸린 시간을 숫자로 입력해 주세요.';
          if (Math.abs(v - Math.round(h.first)) <= 2) { el.classList.add('ok'); return true; }
          el.classList.add('bad'); return '조금 달라요. 화면 오른쪽 위 「첫 반응」 칸의 시간을 다시 읽어 보세요(±2초까지 인정).';
        },
        status: () => '첫 반응 ' + (S.hor.first == null ? '—' : Math.round(S.hor.first) + ' s'),
        explain: '호르몬이 내분비샘에서 혈액을 타고 첫 표적 세포에 닿기까지 약 <b>15초</b>(10배속 화면)가 걸렸어요. 신경 신호의 <b>0.05초</b>와 비교하면 훨씬 느려요.',
      },
      {
        type: 'quiz', title: '호르몬은 표적 기관에만 직접 갈까?',
        goal: '"호르몬은 표적 세포로 가는 전용 통로를 따라 표적 세포에만 도착한다"는 말은 맞을까요?',
        setup() { setScene('hor'); },
        choices: ['틀려요. 호르몬은 혈액을 타고 온몸을 돌지만 수용체가 있는 표적 세포만 반응해요.', '맞아요. 표적 세포까지 연결된 관이 따로 있어요.', '틀려요. 호르몬이 지나가는 모든 세포가 똑같이 반응해요.', '맞아요. 호르몬은 뉴런을 따라 표적 세포로 가요.'],
        answer: 0,
        feedback: ['', '내분비샘의 호르몬은 혈액으로 분비돼요. 표적 세포까지 가는 전용 관은 없어요.', '수용체가 없는 세포는 호르몬이 지나가도 반응하지 않아요.', '뉴런을 따라 가는 것은 신경 신호예요. 호르몬은 혈액을 타요.'],
        explain: '호르몬은 <b>혈액을 타고 온몸에 도달</b>하지만, <b>수용체가 있는 표적 세포</b>만 반응해요. 특이성은 수용체가 결정해요.',
      },
    ],
  },
  {
    title: '비교하기: 속도 · 범위 · 지속 시간', short: '비교하기', icon: '📊', phase: '분석',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신경 신호는 연결된 한 곳에 아주 빠르게, 호르몬 신호는 혈액을 타고 온몸에 느리게 작용하는 것을 봤어요. 위기 상황에서 두 반응의 크기가 시간에 따라 어떻게 달라지는지 그래프로 비교해요.</div>' +
      '<p>그래프는 <b>상대값(교육용 예시)</b>이에요. 신경 효과는 0.2초 안에 올라 약 1분 뒤부터 줄고, 호르몬 효과는 약 30초 뒤부터 올라 10분 넘게 이어져요. 시간 범위를 바꿔 두 곡선을 읽고, 5가지 항목의 비교표를 완성해요.</p>',
    features: ['cmp'],
    setup() { resetCmp(); setScene('cmp'); },
    recap: '신경계는 빠르고 좁고 짧게, 내분비계는 느리고 넓고 오래 작용해요. 둘은 서로 보완해요.',
    summary: '<table class="mini"><tr><th>항목</th><th>신경계</th><th>내분비계</th></tr><tr><td>전달 매체</td><td>뉴런</td><td>혈액</td></tr><tr><td>속도</td><td>매우 빠름(수 ms~수십 ms)</td><td>느림(수 분~수 시간)</td></tr><tr><td>범위</td><td>좁음(특정 세포)</td><td>넓음(온몸, 표적 세포만 반응)</td></tr><tr><td>지속 시간</td><td>짧음</td><td>오래 지속</td></tr><tr><td>전달 물질</td><td>신경 전달 물질</td><td>호르몬</td></tr></table><p>그래프(상대값): 신경 효과는 0.2초 안에 최대 → 약 1분 후 감소, 호르몬 효과는 약 30초 후 상승 → 약 10분 유지.</p>',
    missions: [
      {
        title: '그래프에서 값 읽기',
        goal: '<b>처음 2초</b> 보기에서 신경 반응이 <b>100</b>에 이르는 시각을, <b>10분 전체</b> 보기에서 호르몬 반응이 <b>100</b>이 되어 신경 반응보다 커지는 시각을 읽어요.',
        hint: '읽을 시각 슬라이더(또는 그래프의 세로선)를 움직여요. 처음 2초 보기에서는 0.2초 이후, 10분 보기에서는 90초 이후에 호르몬 값이 100이에요.',
        setup() { setScene('cmp'); },
        check: () => S.cmp.a && S.cmp.b,
        hold: 0.5,
        status: () => mark(S.cmp.a) + ' 2초 보기: 신경 100 읽음 &nbsp; ' + mark(S.cmp.b) + ' 10분 보기: 호르몬 100 읽음',
        explain: '신경 반응은 <b>0.2초</b> 만에 최대(100)가 되지만, 호르몬 반응은 <b>약 30초</b> 뒤부터 올라 <b>약 90초</b>에 최대가 돼요. 신경 반응은 그때쯤 이미 줄어들고 있어요.',
      },
      {
        title: '비교표 완성하기', manual: true,
        goal: '5가지 항목마다 <b>신경계는 어느 쪽인지</b> 골라 비교표를 채우고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '그래프를 떠올려요. 신경은 빠르고 일찍 끝나고, 호르몬은 혈액을 타고 느리지만 오래 가요. 표적 세포가 있는 쪽은 호르몬이에요.',
        setup() { setScene('cmp'); },
        check() {
          const c = S.cmp, miss = c.picks.filter((p) => p == null).length;
          if (miss) return '아직 고르지 않은 항목이 ' + miss + '개 있어요.';
          const bad = c.picks.map((p, i) => (p === CMP_ROWS[i].ans ? 0 : 1)); c.bad = bad;
          if (bad.some((b) => b)) return '빨간 줄이 알맞지 않아요. 신경계의 특징을 그래프에서 다시 확인해 보세요.';
          return true;
        },
        status: () => '고른 항목 ' + S.cmp.picks.filter((p) => p != null).length + ' / 5',
        explain: '<b>신경계</b>: 뉴런 · 매우 빠름 · 좁은 범위 · 짧은 지속 · 신경 전달 물질. <b>내분비계</b>: 혈액 · 느림 · 온몸(표적 세포만 반응) · 오래 지속 · 호르몬.',
      },
      {
        type: 'quiz', title: '빠르게 시작하고 빨리 끝나는 쪽은?',
        goal: '그래프에서 <b>빠르게 시작하고 빨리 끝나는</b> 반응은 어느 쪽일까요?',
        setup() { setScene('cmp'); },
        choices: ['신경계', '내분비계', '두 반응이 똑같아요', '그래프만으로는 알 수 없어요'],
        answer: 0,
        feedback: ['', '내분비계 반응은 약 30초 뒤에 시작해 10분 넘게 이어져요. 느리게 시작하고 오래 가요.', '그래프에서 신경 곡선은 0.2초에 최대인데 호르몬 곡선은 30초 뒤에 올라가기 시작해요.', '시간 범위를 바꿔 두 곡선을 비교하면 알 수 있어요.'],
        explain: '<b>신경계</b>는 0.2초 안에 최대가 되고 약 1분 뒤부터 줄어요. <b>내분비계</b>는 느리게 시작해서 오래 유지돼요.',
      },
    ],
  },
  {
    title: '함께 일하기: 신경과 호르몬이 만나는 시상 하부', short: '함께 일하기', icon: '🤝', phase: '적용',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신경은 빠르고 짧게, 호르몬은 느리고 오래 작용한다는 것을 비교했어요. 실제 몸에서는 두 체계가 <b>시상 하부</b>를 중심으로 함께 일하며 항상성을 유지해요.</div>' +
      '<p>세 가지 사례에서 <b>감각 → 중추 → 시상 하부 → 교감 · 부교감 신경 / 내분비샘 → 표적 기관</b> 순서로 카드를 배열해 봐요. 호르몬 이름은 사례에서 최소한만 나와요. 이 내용은 교육용 모형이에요.</p>',
    features: ['tog'],
    setup() { resetTog(); setScene('tog'); },
    recap: '신경계와 내분비계는 시상 하부에서 만나 함께 조절해요. 신경은 즉각, 호르몬은 지속적으로 표적 기관에 작용해 항상성을 유지해요.',
    summary: '<ul><li><b>시상 하부</b>: 신경계와 내분비계를 잇는 곳. 체온 · 혈당 등을 감지하고 신경과 호르몬 경로에 명령을 내려요.</li><li>위기 상황: 감각 → 대뇌 → 시상 하부 → <b>교감 신경</b>(즉시) + <b>부신 호르몬</b>(지속) → 심장 박동 증가.</li><li>식사 후: <b>부교감 신경</b>과 소화 호르몬이 함께 소화 운동을 촉진해요.</li><li>추운 곳: 시상 하부 → <b>교감 신경</b>(떨림, 혈관 수축) + <b>갑상샘 호르몬</b>(물질대사 촉진) → 열 발생 증가.</li><li>신경과 호르몬이 함께 조절하면 빠른 반응과 오래가는 조절을 모두 할 수 있어요.</li></ul>',
    missions: [
      {
        title: '세 사례의 조절 순서 배열', manual: true,
        goal: '<b>위기 상황 · 식사 후 · 추운 곳</b> 세 사례에서 카드를 일어나는 순서대로 배열하고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '모든 사례는 감각 기관이 먼저 변화를 감지하고, 중추 → 시상 하부 → 신경·호르몬 경로 → 표적 기관 순서로 이어져요.',
        setup() { setScene('tog'); },
        check() {
          const tg = S.tog, cr = tg.ro[tg.cur];
          if (!cr.solved) cr.markBad(cr.wrongIds()); else cr.clearBad();
          for (let i = 0; i < 3; i++) if (!tg.ro[i].solved) return '「' + CASES[i].name.split(':')[0] + '」 사례의 카드 순서가 아직 맞지 않아요' + (i === tg.cur ? '(빨간 카드).' : '. 사례 버튼으로 바꿔서 확인해요.');
          return true;
        },
        status: () => '맞춘 사례 ' + S.tog.ro.filter((r) => r.solved).length + ' / 3',
        explain: '세 사례 모두 <b>감각 → 중추 → 시상 하부 → (교감/부교감 신경 + 내분비샘) → 표적 기관</b> 순서예요. 신경 경로는 즉시, 호르몬 경로는 조금 뒤에 시작해 더 오래 작용해요.',
      },
      {
        type: 'quiz', title: '함께 조절하는 이점',
        goal: '신경계와 내분비계가 <b>함께</b> 조절하면 어떤 이점이 있을까요?',
        setup() { setScene('tog'); },
        choices: ['신경은 빠른 반응을, 호르몬은 오래 가는 조절을 맡아 서로 보완해요.', '두 체계는 같은 일을 하니까 하나가 고장 나도 상관없어요.', '호르몬이 신경 신호를 대신해서 근육을 직접 움직여요.', '신경계가 있으면 내분비계는 필요 없어요.'],
        answer: 0,
        feedback: ['', '두 체계는 속도와 범위, 지속 시간이 달라서 하는 일이 달라요.', '근육을 빠르게 움직이는 것은 신경이에요. 호르몬은 혈액을 타고 느리게 작용해요.', '신경은 빠르지만 효과가 짧고 좁아요. 오래 가는 조절은 호르몬이 맡아요.'],
        explain: '<b>신경</b>은 즉각적이고 정확한 반응, <b>호르몬</b>은 온몸에 오래 지속되는 조절을 맡아요. 둘이 함께 일해서 위기에 빠르게 대응하면서도 상태를 오래 유지할 수 있어요.',
      },
      {
        type: 'quiz', title: '시상 하부의 역할',
        goal: '신경계와 내분비계 사이에서 <b>시상 하부</b>의 역할로 가장 알맞은 것은?',
        setup() { setScene('tog'); },
        choices: ['체온 · 혈당 같은 상태를 감지하고 신경과 호르몬 경로로 조절 명령을 내리는 중추', '소리와 빛을 처음 받아들이는 감각 기관', '호르몬이 작용하는 대표적인 표적 기관', '혈액을 온몸으로 보내는 기관'],
        answer: 0,
        feedback: ['', '감각 기관은 귀, 눈 같은 곳이에요. 시상 하부는 몸의 상태를 조절하는 중추예요.', '시상 하부는 표적 기관이 아니라 명령을 내려요.', '혈액을 보내는 것은 심장이에요.'],
        explain: '<b>시상 하부</b>는 간뇌에 있는 조절 중추로, 몸의 상태를 감지하고 <b>자율 신경</b>과 <b>내분비샘(뇌하수체 등)</b>을 통해 항상성을 조절해요. 신경계와 내분비계를 잇는 곳이에요.',
      },
    ],
  },
];

game = SciSim.game({
  simId: 'hb-neuro-endocrine', mount: '#game', badge: '조절 체계 탐정', homeHref: '../../index.html#hb',
  featureLabels: { neu: '⚡ 신경 신호 모형 · 스톱워치', hor: '🩸 혈액 순환 · 표적 세포 · 수용체 보기', cmp: '📊 반응 시간 그래프 · 비교표', tog: '🤝 순서 카드 배열 · 흐름도' },
  onFeatures() { updateCtl(); },
  levels,
});

/* ---------- 시작 ---------- */
resetNeu(); resetHor(); resetCmp(); resetTog();
setScene('neu');
let lastFree = false;
SciSim.loop((dt, t) => {
  clock = t;
  if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
  view.apply();
  if (S.mode === 'neu') { stepNeu(dt); drawNeuScene(dt); }
  else if (S.mode === 'hor') { stepHor(dt); drawHorScene(dt); }
  else if (S.mode === 'cmp') { stepCmp(); drawCmpScene(dt); }
  else drawTogScene(dt);
  if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,243,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
  readouts();
});

/* ---------- 디버그 (Playwright) ---------- */
window.__sim = {
  S, VW, VH, PHONE, get game() { return game; }, setScene, HCELLS, HL, cellPos, LOOP, CG, TGG, CASES, CMP_ROWS, neuralEff, hormEff, pokeNow, secrete, setCur, newRo,
  stepHor, stepNeu,
  solveRo(i) { const ro = S.tog.ro[i]; ro.order = ro.cards.map((c, k) => k); ro.order = ro.o.solution.map((id) => ro.cards.findIndex((c) => c.id === id)); ro.snap(true); updateCtl(); },
};

})();
