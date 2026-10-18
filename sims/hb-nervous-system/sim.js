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
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 사람의 신경계 (단원 4차시)
   성취기준 [12생과02-03] 사람 신경계의 구조와 기능을 이해하고 중추 신경계와 말초 신경계의 특징을 설명할 수 있다.
   ① 모형: 신경계 지도  ② 탐구: 대뇌  ③ 탐구: 뇌 줄기·소뇌  ④ 분석: 말초 신경
   ========================================================= */
const COL = { cns: '#7c3aed', pns: '#f59e0b', sym: '#2563eb', par: '#16a34a', ink: '#26324a', mut: '#5a6679' };
const LOBE = {
  fro: { name: '전두엽', col: '#ef6c6c' },
  par: { name: '두정엽', col: '#f2c14e' },
  tem: { name: '측두엽', col: '#5aa9e6' },
  occ: { name: '후두엽', col: '#a98bf0' },
};
const LOBES = ['fro', 'par', 'tem', 'occ'];

/* ============ 상태 ============ */
const S = { mode: 'map', sub: 'tree', subs: { map: 'tree', cer: 'ex', stem: 'info', per: 'auto' }, fade: 0, map: null, sit: null, cer: null, cas: null, stem: null, pair: null, per: null, tab: null };
let game = null;
const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
const SCENES = { map: '🗺️ 신경계 지도', cer: '🧠 대뇌', stem: '🔬 뇌 줄기·소뇌', per: '🫀 말초 신경' };
const viewKey = () => S.mode + ':' + S.sub;
const PT_TABLE = {};
function setScene(mode, sub) {
  const old = viewKey();
  if (sub) S.subs[mode] = sub;
  S.mode = mode; S.sub = S.subs[mode];
  if (viewKey() !== old) { S.fade = 1; parts.clear(); }
  $('#tbLabel').textContent = SCENES[mode];
  PT = PT_TABLE[viewKey()] || null;
  updateCtl();
}
function updateCtl() {
  const key = viewKey();
  $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(key) < 0; });
  $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  setOn('#subMap', 'data-sub', S.subs.map); setOn('#subCer', 'data-sub', S.subs.cer); setOn('#subStem', 'data-sub', S.subs.stem); setOn('#subPer', 'data-sub', S.subs.per);
  if (S.cer) {
    $$('#lobeChips button').forEach((b) => { b.classList.toggle('on', S.cer.sel === b.dataset.l); b.classList.toggle('done', !!S.cer.seen[b.dataset.l]); });
    setOn('#colSeg', 'data-c', S.cer.color);
    $('#bCut').classList.toggle('on', S.cer.cut); $('#bCut').textContent = S.cer.cut ? '✂️ 단면 닫기' : '✂️ 단면 보기';
  }
  if (S.stem) $$('#partChips button').forEach((b) => { b.classList.toggle('on', S.stem.sel === b.dataset.p); b.classList.toggle('done', !!S.stem.seen[b.dataset.p]); });
  if (S.per) setOn('#autoSeg', 'data-a', S.per.mode);
}
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
bindSeg('#subMap', 'data-sub', (s) => setScene('map', s));
bindSeg('#subCer', 'data-sub', (s) => setScene('cer', s));
bindSeg('#subStem', 'data-sub', (s) => setScene('stem', s));
bindSeg('#subPer', 'data-sub', (s) => setScene('per', s));

/* ============ ① 신경계 지도 ============ */
const CWT = PHONE ? 108 : 112, CHT = 42;
/* 분류 트리 칸 위치 (가운데 좌표) */
const TR = PHONE
  ? { root: [240, 36], l1: [[122, 94], [358, 94]], l2: [[64, 156], [180, 156], [296, 156], [412, 156]], sw: 112, sh: 50, tray: (i) => ({ x: 20 + (i % 3) * 150, y: 252 + Math.floor(i / 3) * 52 }) }
  : { root: [548, 52], l1: [[430, 130], [666, 130]], l2: [[366, 224], [486, 224], [610, 224], [730, 224]], sw: 120, sh: 50, tray: (i) => ({ x: 330 + (i % 3) * 152, y: 326 + Math.floor(i / 3) * 56 }) };
function newTree() {
  const names = ['뇌·척수 쪽', '온몸 쪽', '머리뼈 안', '척추뼈 안', '의식적', '무의식적'];
  const ans = ['cns', 'pns', 'brain', 'cord', 'somatic', 'auto'];
  const pos = TR.l1.concat(TR.l2);
  const targets = pos.map((p, i) => ({ id: 'slot' + i, x: p[0] - TR.sw / 2, y: p[1] - TR.sh / 2, w: TR.sw, h: TR.sh, ans: ans[i], name: names[i] }));
  const chips = [['pns', '말초 신경계', COL.pns], ['cord', '척수', COL.cns], ['cns', '중추 신경계', COL.cns], ['auto', '자율 신경계', COL.pns], ['brain', '뇌', COL.cns], ['somatic', '체성 신경계', COL.pns]]
    .map((c) => ({ id: c[0], label: c[1], col: c[2] }));
  return new Placer({ chips, targets, tray: TR.tray, cw: CWT, ch: CHT, onChange() {} });
}
/* 상황 분류: 대뇌 / 체성 / 자율 */
const BINS = [
  { id: 'cns', title: '대뇌가 하는 일', sub: '생각 · 이해 · 판단', col: '#7c3aed' },
  { id: 'som', title: '체성 신경이 근육을 움직임', sub: '골격근 (뼈대근육)', col: '#d97706' },
  { id: 'aut', title: '자율 신경이 조절', sub: '내장 기관 · 샘 · 눈', col: '#2563eb' },
];
const SITS = [
  { id: 's1', label: '책 읽기', icon: '📖', bin: 'cns' },
  { id: 's2', label: '컵을 잡음', icon: '🥤', bin: 'som' },
  { id: 's3', label: '무릎 반사', icon: '🦵', bin: 'som' },
  { id: 's4', label: '놀라서 심장이 뜀', icon: '😱', bin: 'aut' },
  { id: 's5', label: '음식 소화', icon: '🍽️', bin: 'aut' },
  { id: 's6', label: '동공이 작아짐', icon: '👁️', bin: 'aut' },
];
const SG = PHONE
  ? { bin: (i) => ({ x: 8, y: 8 + i * 124, w: 464, h: 116 }), slot: (i, k) => ({ x: 12 + k * 152, y: 8 + i * 124 + 52, w: 148, h: 56 }), tray: (i) => ({ x: 10 + (i % 3) * 156, y: 396 + Math.floor(i / 3) * 52 }), cw: 142, ch: 44 }
  : { bin: (i) => ({ x: 14 + i * 258, y: 48, w: 244, h: 224 }), slot: (i, k) => ({ x: 14 + i * 258 + 16, y: 48 + 62 + k * 54, w: 212, h: 52 }), tray: (i) => ({ x: 18 + (i % 3) * 258, y: 322 + Math.floor(i / 3) * 56 }), cw: 204, ch: 44 };
function newSit() {
  const targets = [];
  BINS.forEach((b, i) => { for (let k = 0; k < 3; k++) { const s = SG.slot(i, k); targets.push({ id: 'b' + i + k, x: s.x, y: s.y, w: s.w, h: s.h, bin: b.id }); } });
  const order = [3, 0, 5, 2, 4, 1];
  return new Placer({ chips: order.map((k) => Object.assign({}, SITS[k], { col: '#4b6b8a' })), targets, tray: SG.tray, cw: SG.cw, ch: SG.ch, onChange() {} });
}
function resetMap() { S.map = { tree: newTree(), t0: 0 }; S.sit = { pl: newSit() }; }
$('#bMapReset').addEventListener('click', () => { Sound.click(); (S.sub === 'tree' ? S.map.tree : S.sit.pl).reset(); });

/* 몸 실루엣과 신경 */
const BODY_PATHS = [
  [[0, 132], [-44, 128], [-76, 156], [-92, 226]],
  [[0, 132], [44, 128], [76, 156], [92, 226]],
  [[0, 272], [-26, 330], [-32, 476]],
  [[0, 272], [26, 330], [32, 476]],
  [[0, 160], [-16, 130]],
  [[0, 188], [12, 184]],
  [[0, 76], [-18, 52], [-17, 38]],
];
function pathPt(path, f) {
  const n = path.length - 1, x = clamp(f, 0, 0.9999) * n, i = Math.floor(x), t = x - i;
  return { x: lerp(path[i][0], path[i + 1][0], t), y: lerp(path[i][1], path[i + 1][1], t) };
}
function drawBody(ox, oy, s, tt, opt) {
  opt = opt || {};
  ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#dbe6f3'; ctx.lineWidth = 26;
  [[[-48, 104], [-82, 150], [-92, 230]], [[48, 104], [82, 150], [92, 230]]].forEach((a) => { ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]); ctx.quadraticCurveTo(a[1][0], a[1][1], a[2][0], a[2][1]); ctx.stroke(); });
  ctx.lineWidth = 32;
  [[[-22, 262], [-30, 470]], [[22, 262], [30, 470]]].forEach((a) => { ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]); ctx.lineTo(a[1][0], a[1][1]); ctx.stroke(); });
  D.shadow(() => { D.roundRect(-50, 84, 100, 190, 30); ctx.fillStyle = '#e8f0f9'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 40, 36, 0, TAU); ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.18)' });
  ctx.strokeStyle = '#c3d3e6'; ctx.lineWidth = 2; D.roundRect(-50, 84, 100, 190, 30); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 40, 36, 0, TAU); ctx.stroke();
  // 말초 신경 (주황)
  ctx.strokeStyle = COL.pns; ctx.lineWidth = 3.4;
  BODY_PATHS.forEach((p) => { ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); });
  // 중추 (보라): 뇌와 척수
  ctx.strokeStyle = COL.cns; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 62); ctx.lineTo(0, 276); ctx.stroke();
  const bg = ctx.createRadialGradient(-6, 28, 3, 0, 36, 28); bg.addColorStop(0, '#e2d6ff'); bg.addColorStop(1, '#a78bfa');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 34, 27, 22, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = COL.cns; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(124,58,237,.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-12, 28); ctx.quadraticCurveTo(-4, 20, 2, 30); ctx.quadraticCurveTo(8, 38, 16, 28); ctx.stroke();
  // 기관 그림
  T(-16, 132, '❤️', 22, '#000', 'center', 600); T(14, 196, '🍽️', 20, '#000', 'center', 600);
  T(-92, 238, '✋', 20, '#000', 'center', 600); T(92, 238, '✋', 20, '#000', 'center', 600);
  ctx.restore();
  // 신호 펄스: 바깥쪽(운동)으로 나가는 주황, 안쪽(감각)으로 들어오는 파랑
  if (!RM) BODY_PATHS.forEach((p, i) => {
    const f = ((tt * 0.42 + i * 0.173) % 1.3);
    if (f < 1) { const q = pathPt(p, f); const x = ox + q.x * s, y = oy + q.y * s; D.glow(x, y, 15 * s + 4, '#ffd447', 0.8); D.sphere(x, y, 4.2, '#ffcf3a', { gloss: false }); }
    const g = ((tt * 0.36 + i * 0.29 + 0.4) % 1.3);
    if (g < 1) { const q = pathPt(p, 1 - g); const x = ox + q.x * s, y = oy + q.y * s; D.sphere(x, y, 3.6, '#5aa9ff', { gloss: false }); }
  });
}
function drawTreeScene(dt) {
  const M = S.map, pl = M.tree;
  bgFill('#eaf6f1', '#f7fbf9');
  if (PHONE) {
    drawBody(92, 372, 0.46, clock);
    T(190, 408, '● 중추 신경계', 14, COL.cns, 'left', 800); T(190, 432, '● 말초 신경계', 14, '#b45309', 'left', 800);
    T(190, 462, '주황 알갱이: 중추 → 몸', 12.5, '#5a6679', 'left', 700); T(190, 482, '파랑 알갱이: 몸 → 중추', 12.5, '#5a6679', 'left', 700);
  } else {
    T(22, 28, '🧍 몸의 신경', 16, COL.ink, 'left', 800);
    drawBody(150, 46, 1.0, clock);
    T(244, 130, '● 중추', 13.5, COL.cns, 'left', 800); T(244, 150, '● 말초', 13.5, '#b45309', 'left', 800);
  }
  // 트리 연결선
  const rt = TR.root, h2 = TR.sh / 2;
  ctx.save(); ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  const elbow = (a, ah, b) => { const y0 = a[1] + ah, y1 = b[1] - h2, my = (y0 + y1) / 2; ctx.beginPath(); ctx.moveTo(a[0], y0); ctx.lineTo(a[0], my); ctx.lineTo(b[0], my); ctx.lineTo(b[0], y1); ctx.stroke(); };
  TR.l1.forEach((p) => elbow(rt, 20, p));
  [0, 1].forEach((k) => elbow(TR.l1[0], h2, TR.l2[k]));
  [2, 3].forEach((k) => elbow(TR.l1[1], h2, TR.l2[k]));
  ctx.restore();
  D.shadow(() => { D.roundRect(rt[0] - 62, rt[1] - 20, 124, 40, 12); ctx.fillStyle = '#26324a'; ctx.fill(); }, { blur: 6, y: 2 });
  T(rt[0], rt[1] + 6, '신경계', 17, '#fff', 'center', 800);
  pl.drawTargets();
  const tw = PHONE ? 8 : 322, ty = TR.tray(0).y - 12;
  if (pl.placed < 6) T(tw, ty, '👇 카드를 끌어서 알맞은 칸에 놓아요', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800);
  else T(tw, ty, '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 13 : 14, '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  if (!PHONE) {
    panel(322, 448, 464, 98, 14);
    T(338, 474, '중추 신경계: 정보를 모아 판단하고 명령해요.', 14.5, COL.cns, 'left', 800);
    T(338, 500, '말초 신경계: 중추와 온몸 사이에서 신호를 전달해요.', 14.5, '#b45309', 'left', 800);
    T(338, 526, '체성 신경: 의식적 움직임 · 자율 신경: 내장 기관 조절', 13.5, COL.mut, 'left', 700);
  }
}
const PT_TREE = { down(p) { return S.map.tree.down(p); }, move(p) { S.map.tree.move(p); }, up(p) { S.map.tree.up(p); }, hover(p) { return S.map.tree.hover(p); } };
PT_TABLE['map:tree'] = PT_TREE;

function drawSitScene(dt) {
  const pl = S.sit.pl;
  bgFill('#eaf6f1', '#f7fbf9');
  if (!PHONE) T(20, 34, '🧍 일어나는 일은 어느 신경 경로일까요?', 17, COL.ink, 'left', 800);
  BINS.forEach((b, i) => {
    const r = SG.bin(i);
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 7, y: 2 });
    ctx.fillStyle = b.col; ctx.globalAlpha = 0.14; D.roundRect(r.x, r.y, r.w, PHONE ? 46 : 64, 14); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = b.col; ctx.lineWidth = 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
    if (PHONE) { TF(r.x + 12, r.y + 22, b.title, 300, 15, 12, b.col, 'left', 800); T(r.x + 12, r.y + 40, b.sub, 12.5, COL.mut, 'left', 700); }
    else { TF(r.x + r.w / 2, r.y + 26, b.title, r.w - 16, 15, 12, b.col, 'center', 800); T(r.x + r.w / 2, r.y + 50, b.sub, 13, COL.mut, 'center', 700); }
  });
  pl.drawTargets({ col: '#9fb3a6' });
  const ty = SG.tray(0).y - 12;
  T(PHONE ? 10 : 18, ty, pl.placed < 6 ? '👇 상황 카드를 끌어서 알맞은 상자에 놓아요' : '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12.5 : 14, pl.placed < 6 ? '#5a6679' : '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  let y = PHONE ? 556 : 452;
  const msg = PHONE
    ? ['대뇌: 보고 이해하는 생각 · 판단', '체성 신경: 골격근(뼈대근육)에 명령 전달', '자율 신경: 내장 기관 · 샘 · 눈을 무의식적으로 조절']
    : ['대뇌: 보고 이해하는 생각 · 판단은 대뇌 겉질에서 일어나요.', '체성 신경: 골격근(뼈대근육)에 명령을 전달해요. 무릎 반사는 척수가 중추예요.', '자율 신경: 대뇌의 직접 명령 없이 간뇌 · 연수 · 중간뇌 등이 조절해요.'];
  msg.forEach((m, i) => { y += textBlock(PHONE ? 10 : 18, y, VW - (PHONE ? 20 : 36), m, PHONE ? 12.5 : 14, i === 0 ? '#6d28d9' : i === 1 ? '#b45309' : '#1d4ed8', PHONE ? 19 : 24, 700) + 2; });
}
PT_TABLE['map:sit'] = { down(p) { return S.sit.pl.down(p); }, move(p) { S.sit.pl.move(p); }, up(p) { S.sit.pl.up(p); }, hover(p) { return S.sit.pl.hover(p); } };


/* ============ ② 대뇌: 3D 모형 ============ */
const BU = 56, BV = 32, SN = 3;
const BAx = 1.0, BBt = 0.74, BBb = 0.46, BCz = 0.78;
const centralX = (sy) => 0.36 - 0.42 * sy;                 // 중심 고랑(두정엽과 전두엽의 경계)
const latY = (sx) => 0.06 - 0.3 * (sx - 0.1);              // 가쪽 고랑(측두엽의 위 경계)
function lobeOf(sx, sy) {
  if (sx < -0.58) return 'occ';
  if (sx < 0.78 && sy < latY(sx)) return 'tem';
  return sx > centralX(sy) ? 'fro' : 'par';
}
function areaOf(sx, sy, lobe) {
  if (lobe === 'fro') return (sx - centralX(sy) < 0.14 && sy > latY(sx) + 0.05) ? 'motor' : 'assoc';
  if (lobe === 'par') return (centralX(sy) - sx < 0.14) ? 'sensory' : 'assoc';
  if (lobe === 'occ') return sx < -0.75 ? 'sensory' : 'assoc';
  return (sx > -0.25 && sx < 0.35 && sy > latY(sx) - 0.28) ? 'sensory' : 'assoc';
}
const AREA = { motor: { name: '운동 영역', col: '#e8575a' }, sensory: { name: '감각 영역', col: '#4c9be8' }, assoc: { name: '연합 영역', col: '#9fc79a' } };
const sph = (u, v) => { const cv = Math.cos(v); return [cv * Math.cos(u), Math.sin(v), cv * Math.sin(u)]; };
function brainV(u, v) {
  const s = sph(u, v), sx = s[0], sy = s[1], sz = s[2], cv = Math.cos(v);
  const bump = 1 + 0.02 * Math.sin(10 * u + 4 * v) * cv + 0.016 * Math.sin(8 * v - 3 * u);
  let y = (sy >= 0 ? BBt : BBb) * sy * bump;
  y -= 0.07 * Math.exp(-(sz * sz) / 0.012) * smooth((sy - 0.15) / 0.5);                                   // 대뇌 세로 틈
  y -= 0.13 * Math.exp(-(((sx - 0.12) / 0.5) ** 2)) * smooth(-sy / 0.5) * smooth((Math.abs(sz) - 0.25) / 0.4);   // 측두엽이 아래로 볼록
  y += 0.1 * smooth((sx - 0.35) / 0.5) * smooth(-sy / 0.4);                                                 // 전두엽 아랫면은 위로
  return [BAx * sx * bump, y, BCz * sz * bump];
}
const fwOf = (sz, sy) => Math.exp(-(sz * sz) / 0.012) * smooth((sy - 0.15) / 0.5);
const BM = (function () {
  const vx = new Float32Array((BU + 1) * (BV + 1)), vy = new Float32Array((BU + 1) * (BV + 1)), vz = new Float32Array((BU + 1) * (BV + 1));
  const vi = (i, j) => i * (BV + 1) + j;
  for (let i = 0; i <= BU; i++) for (let j = 0; j <= BV; j++) {
    const p = brainV(i / BU * TAU, -Math.PI / 2 + j / BV * Math.PI); const k = vi(i, j); vx[k] = p[0]; vy[k] = p[1]; vz[k] = p[2];
  }
  const q = [];
  const uv = (i, j) => [i / BU * TAU, -Math.PI / 2 + j / BV * Math.PI];
  const cls = (u, v) => { const s = sph(u, v), l = lobeOf(s[0], s[1]); return [l, areaOf(s[0], s[1], l)]; };
  for (let i = 0; i < BU; i++) for (let j = 0; j < BV; j++) {
    const u = (i + 0.5) / BU * TAU, v = -Math.PI / 2 + (j + 0.5) / BV * Math.PI;
    const s = sph(u, v), lobe = lobeOf(s[0], s[1]), area = areaOf(s[0], s[1], lobe);
    const a = vi(i, j), b = vi(i + 1, j), c = vi(i + 1, j + 1), d = vi(i, j + 1);
    let nx = (vy[b] - vy[a]) * (vz[d] - vz[a]) - (vz[b] - vz[a]) * (vy[d] - vy[a]);
    let ny = (vz[b] - vz[a]) * (vx[d] - vx[a]) - (vx[b] - vx[a]) * (vz[d] - vz[a]);
    let nz = (vx[b] - vx[a]) * (vy[d] - vy[a]) - (vy[b] - vy[a]) * (vx[d] - vx[a]);
    const ln = Math.hypot(nx, ny, nz);
    if (ln < 1e-7) { nx = s[0]; ny = s[1]; nz = s[2]; } else { nx /= ln; ny /= ln; nz /= ln; }
    const cx = (vx[a] + vx[b] + vx[c] + vx[d]) / 4, cy = (vy[a] + vy[b] + vy[c] + vy[d]) / 4, cz = (vz[a] + vz[b] + vz[c] + vz[d]) / 4;
    if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    q.push({ i, j, v: [a, b, c, d], n: [nx, ny, nz], c: [cx, cy, cz], lobe, area, fw: fwOf(s[2], s[1]), sub: null, mixed: false, lam: 0 });
  }
  // 경계에 걸친 칸은 3x3으로 잘게 나눠 경계가 매끄럽게 보이게 해요
  const bnd = (o) => {
    const keys = []; let any = false;
    for (let a = -1; a <= SN; a++) for (let b = -1; b <= SN; b++) {
      const u = (o.i + (a + 0.5) / SN) / BU * TAU, v = clamp(-Math.PI / 2 + (o.j + (b + 0.5) / SN) / BV * Math.PI, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
      const c = cls(u, v); keys.push(c[0] + c[1]);
    }
    const first = keys[0]; return keys.some((k) => k !== first);
  };
  q.forEach((o) => {
    if (!bnd(o)) return;
    const A = o.v[0], B = o.v[1], Cc = o.v[2], Dd = o.v[3];
    const P = (s, t) => { const w = [(1 - s) * (1 - t), s * (1 - t), s * t, (1 - s) * t], I = [A, B, Cc, Dd]; let x = 0, y = 0, z = 0; for (let k = 0; k < 4; k++) { x += w[k] * vx[I[k]]; y += w[k] * vy[I[k]]; z += w[k] * vz[I[k]]; } return [x, y, z]; };
    const info = (a, b) => { const u = (o.i + (a + 0.5) / SN) / BU * TAU, v = clamp(-Math.PI / 2 + (o.j + (b + 0.5) / SN) / BV * Math.PI, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01); const c = cls(u, v); return { lobe: c[0], area: c[1] }; };
    o.sub = [];
    for (let a = 0; a < SN; a++) for (let b = 0; b < SN; b++) {
      const p = [P(a / SN, b / SN), P((a + 1) / SN, b / SN), P((a + 1) / SN, (b + 1) / SN), P(a / SN, (b + 1) / SN)];
      const me = info(a, b); let eL = 0, eA = 0;
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach((dd, k) => { const nb = info(a + dd[0], b + dd[1]); if (nb.lobe !== me.lobe) eL |= 1 << k; if (nb.lobe + nb.area !== me.lobe + me.area) eA |= 1 << k; });
      o.sub.push({ p: [p[0][0], p[0][1], p[0][2], p[1][0], p[1][1], p[1][2], p[2][0], p[2][1], p[2][2], p[3][0], p[3][1], p[3][2]], lobe: me.lobe, area: me.area, eL, eA });
    }
  });
  return { vx, vy, vz, q };
})();
const PX = new Float32Array(BM.vx.length), PY = new Float32Array(BM.vx.length);
const colCache = new Map();
function litCol(hex, lam, pulse) {
  const lv = Math.round(clamp(lam, 0, 1) * 12), pl = pulse ? Math.round(pulse * 5) : 0, key = hex + lv + '|' + pl;
  let c = colCache.get(key);
  if (!c) { let b = hex; if (pl) b = C.mix(b, '#ffffff', 0.08 * pl); c = C.shade(b, -0.3 + 0.5 * (lv / 12)); colCache.set(key, c); }
  return c;
}
const CER_DEF = { yaw: 0.14, pitch: 0.12 };
function resetCer() {
  S.cer = { sel: null, seen: {}, color: 'lobe', cut: false, cutAmt: 0, cutSeen: false, yaw: CER_DEF.yaw, pitch: CER_DEF.pitch, zoom: 1, tzoom: 1, drag: null, hits: [], capOn: false, rotated: false, cam: null };
  $('#sZoom').value = 100; $('#oZoom').textContent = '100%'; $('#sZoom').style.setProperty('--pct', '0%');
  S.cas = { pl: newCases() };
}
const CER_R = { ex: PHONE ? { x: 8, y: 8, w: 464, h: 330 } : { x: 14, y: 14, w: 536, h: 532 }, case: PHONE ? { x: 8, y: 8, w: 464, h: 232 } : { x: 14, y: 14, w: 772, h: 296 } };
const INFO_R = PHONE ? { x: 8, y: 346, w: 464, h: 286 } : { x: 560, y: 14, w: 226, h: 532 };
function brainCam(R, zoom, yaw, pitch) {
  const s = Math.min(R.w / 2.3, R.h / 1.7) * zoom;
  return { s, ox: R.x + R.w / 2, oy: R.y + R.h / 2 + 0.08 * s, cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) };
}
function proj(cam, x, y, z) {
  const x1 = x * cam.cy + z * cam.sy, z1 = -x * cam.sy + z * cam.cy;
  const X = -x1, Dd = -z1;
  return { x: cam.ox + X * cam.s, y: cam.oy - (y * cam.cp - Dd * cam.sp) * cam.s, d: y * cam.sp + Dd * cam.cp };
}
function nrmCam(cam, n) {
  const x1 = n[0] * cam.cy + n[2] * cam.sy, z1 = -n[0] * cam.sy + n[2] * cam.cy;
  const X = -x1, Dd = -z1;
  return [X, n[1] * cam.cp - Dd * cam.sp, n[1] * cam.sp + Dd * cam.cp];
}
const LIGHT = (function () { const l = [-0.35, 0.55, 0.78], m = Math.hypot(l[0], l[1], l[2]); return [l[0] / m, l[1] / m, l[2] / m]; })();
const LOBE_ANCH = { fro: [0.62, 0.42], par: [-0.22, 0.72], tem: [0.12, -0.5], occ: [-0.9, 0.05] };
function lobeAnchor(l, side) {
  const a = LOBE_ANCH[l], sz = side * Math.sqrt(Math.max(0, 1 - a[0] * a[0] - a[1] * a[1]));
  const p = brainV(Math.atan2(sz, a[0]), Math.asin(a[1]));
  return [p[0], p[1], p[2], [a[0], a[1], sz]];
}
function capRing(rr, k, q) { const th = k / 64 * TAU, sc = 1 + 0.03 * Math.sin(13 * th); return [BCz * rr * Math.cos(th) * sc * q, (Math.sin(th) >= 0 ? BBt : BBb) * rr * Math.sin(th) * sc * q]; }
const SUBE = [[0, 1], [1, 2], [2, 3], [3, 0]];
/* 대뇌를 R 안에 그려요. o: {color, sel, labels, cutX} */
function renderBrain(R, cam, o) {
  const cer = S.cer;
  ctx.save();
  D.roundRect(R.x, R.y, R.w, R.h, 18); const bg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); bg.addColorStop(0, '#dde7f4'); bg.addColorStop(1, '#f3f7fc'); ctx.fillStyle = bg; ctx.fill();
  ctx.save(); D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.clip();
  cer.cam = cam;
  const cutOn = o.cutX < BAx - 0.001, cutX = o.cutX;
  const n = BM.vx.length;
  for (let k = 0; k < n; k++) { const p = proj(cam, BM.vx[k], BM.vy[k], BM.vz[k]); PX[k] = p.x; PY[k] = p.y; }
  // 바닥 그림자
  const by = cam.oy + cam.s * (BBb + 0.12), sh = ctx.createRadialGradient(cam.ox, by, 4, cam.ox, by, cam.s * 0.95); sh.addColorStop(0, 'rgba(40,60,100,.2)'); sh.addColorStop(1, 'rgba(40,60,100,0)');
  ctx.save(); ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(cam.ox, by, cam.s * 0.95, cam.s * 0.13, 0, 0, TAU); ctx.fill(); ctx.restore();
  const vis = [], dep = new Float32Array(BM.q.length);
  BM.q.forEach((q, idx) => {
    const nc = nrmCam(cam, q.n);
    if (nc[2] < 0.01) return;
    q.mixed = false;
    if (cutOn) { let cnt = 0; for (let t = 0; t < 4; t++) if (BM.vx[q.v[t]] > cutX) cnt++; if (cnt === 4) return; q.mixed = cnt > 0; }
    dep[idx] = q.c[1] * cam.sp + (q.c[0] * cam.sy - q.c[2] * cam.cy) * cam.cp;
    q.lam = nc[0] * LIGHT[0] + nc[1] * LIGHT[1] + nc[2] * LIGHT[2];
    vis.push(idx);
  });
  vis.sort((a, b) => dep[a] - dep[b]);
  const pulse = 0.5 + 0.5 * Math.sin(clock * 5.5);
  cer.hits.length = 0;
  const actArea = (l) => (l === 'fro' ? 'motor' : 'sensory');
  const xs = [0, 0, 0, 0], ys = [0, 0, 0, 0];
  const paint = (lobe, area, q, eL, eA) => {
    let hex, pl = 0;
    if (o.color === 'area') hex = C.mix(AREA[area].col, '#ffffff', 0.12); else hex = C.mix(LOBE[lobe].col, '#ffffff', 0.18);
    if (o.sel) { if (lobe !== o.sel) hex = C.mix(hex, '#cfd6e2', 0.62); else if (area === actArea(lobe) && !RM) pl = pulse; }
    if (q.fw > 0.05) hex = C.mix(hex, '#6b4b5a', clamp(q.fw * 0.5, 0, 0.5));
    ctx.fillStyle = litCol(hex, 0.4 + 0.65 * Math.max(0, q.lam), pl);
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); ctx.lineTo(xs[1], ys[1]); ctx.lineTo(xs[2], ys[2]); ctx.lineTo(xs[3], ys[3]); ctx.closePath(); ctx.fill();
    const eg = o.color === 'area' ? eA : eL;
    if (eg) {
      ctx.strokeStyle = o.color === 'area' ? 'rgba(60,40,60,.6)' : 'rgba(70,40,60,.66)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k < 4; k++) if (eg & (1 << k)) { ctx.moveTo(xs[SUBE[k][0]], ys[SUBE[k][0]]); ctx.lineTo(xs[SUBE[k][1]], ys[SUBE[k][1]]); }
      ctx.stroke();
    }
  };
  vis.forEach((idx) => {
    const q = BM.q[idx];
    if (q.sub) {
      let drew = false;
      q.sub.forEach((c) => {
        let inN = 0;
        for (let k = 0; k < 4; k++) {
          let x = c.p[k * 3]; if (cutOn) { if (x > cutX) inN++; x = Math.min(x, cutX); }
          const p = proj(cam, x, c.p[k * 3 + 1], c.p[k * 3 + 2]); xs[k] = p.x; ys[k] = p.y;
        }
        if (inN === 4) return;
        paint(c.lobe, c.area, q, c.eL, c.eA); drew = true;
      });
      if (drew) cer.hits.push(idx);
    } else {
      for (let k = 0; k < 4; k++) { const vv = q.v[k]; if (cutOn && q.mixed) { const p = proj(cam, Math.min(BM.vx[vv], cutX), BM.vy[vv], BM.vz[vv]); xs[k] = p.x; ys[k] = p.y; } else { xs[k] = PX[vv]; ys[k] = PY[vv]; } }
      paint(q.lobe, q.area, q, 0, 0);
      cer.hits.push(idx);
    }
  });
  // 단면
  cer.capOn = false;
  if (cutOn) {
    const nc = nrmCam(cam, [1, 0, 0]);
    if (nc[2] > 0.05) {
      cer.capOn = true;
      const rr = Math.sqrt(Math.max(0, 1 - (cutX / BAx) * (cutX / BAx)));
      const ring = (q, fill, stroke, lw) => {
        ctx.beginPath();
        for (let k = 0; k <= 64; k++) { const r = capRing(rr, k, q), p = proj(cam, cutX, r[1], r[0]); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
        ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
      };
      ring(1.0, '#c3a2ab', '#8a6470', 2.4);
      ring(0.83, '#f6f1e8', 'rgba(138,100,112,.5)', 1.4);
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) { const qq = -0.64 + 1.28 * k / 20, z = BCz * rr * qq, y = rr * (0.17 + 0.07 * (1 - (qq / 0.64) * (qq / 0.64))), p = proj(cam, cutX, y, z); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.strokeStyle = '#d4a65c'; ctx.lineWidth = Math.max(5, cam.s * 0.045); ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = Math.max(2.5, cam.s * 0.022); ctx.stroke();
      const f0 = proj(cam, cutX, BBt * rr * 0.97, 0), f1 = proj(cam, cutX, rr * 0.28, 0);
      ctx.strokeStyle = '#7a5460'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y); ctx.stroke();
      const A1 = capRing(rr, 6, 0.93), A2 = [BCz * rr * 0.34, -0.1 * rr], A3 = [BCz * rr * 0.4, rr * 0.2];
      const anchors = [[A1, '겉질 (회색질): 신경 세포체', '#8a4b60'], [A2, '속질 (백색질): 축삭', '#7a6a2a'], [A3, '뇌량: 좌우 반구 연결', '#a8741e']];
      anchors.forEach((a, i) => {
        const p = proj(cam, cutX, a[0][1], a[0][0]);
        const lx = R.x + 12, ly = R.y + (PHONE ? 26 : 34) + i * (PHONE ? 30 : 36);
        const lb = D.label(lx, ly, a[1], { bg: a[2], size: PHONE ? 12.5 : 13.5, align: 'left' });
        ctx.strokeStyle = a[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lb.x + lb.w, ly); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      });
    }
  }
  // 엽 이름
  if (o.labels) {
    LOBES.forEach((l) => {
      for (const side of [-1, 1]) {
        const a = lobeAnchor(l, side), p = proj(cam, a[0], a[1], a[2]), nc = nrmCam(cam, a[3]);
        if (nc[2] < 0.38) continue;
        if (cutOn && a[0] > cutX - 0.05) continue;
        const on = o.sel === l;
        D.label(p.x, p.y, LOBE[l].name + (cer.seen[l] && o.mark ? ' ✓' : ''), { bg: on ? C.shade(LOBE[l].col, -0.25) : 'rgba(38,50,74,.82)', size: PHONE ? 12.5 : 14 });
        break;
      }
    });
  }
  ctx.restore();
  ctx.strokeStyle = '#c3d0df'; ctx.lineWidth = 2; D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.stroke();
  ctx.restore();
}
function pointInPoly(px, py, xs, ys) {
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    if (((ys[i] > py) !== (ys[j] > py)) && (px < (xs[j] - xs[i]) * (py - ys[i]) / (ys[j] - ys[i]) + xs[i])) inside = !inside;
  }
  return inside;
}
function hitLobe(p) {
  const cer = S.cer, cam = cer.cam; if (!cam) return null;
  const cutX = cutXNow(), cutOn = cutX < BAx - 0.001, xs = [0, 0, 0, 0], ys = [0, 0, 0, 0];
  for (let k = cer.hits.length - 1; k >= 0; k--) {
    const q = BM.q[cer.hits[k]];
    if (q.sub) {
      for (const c of q.sub) {
        for (let t = 0; t < 4; t++) { let x = c.p[t * 3]; if (cutOn) x = Math.min(x, cutX); const pp = proj(cam, x, c.p[t * 3 + 1], c.p[t * 3 + 2]); xs[t] = pp.x; ys[t] = pp.y; }
        if (pointInPoly(p.x, p.y, xs, ys)) return c.lobe;
      }
    } else {
      for (let t = 0; t < 4; t++) { const vv = q.v[t]; if (cutOn && q.mixed) { const pp = proj(cam, Math.min(BM.vx[vv], cutX), BM.vy[vv], BM.vz[vv]); xs[t] = pp.x; ys[t] = pp.y; } else { xs[t] = PX[vv]; ys[t] = PY[vv]; } }
      if (pointInPoly(p.x, p.y, xs, ys)) return q.lobe;
    }
  }
  return null;
}
const cutXNow = () => lerp(1.2, 0.12, S.cer.cutAmt);
const LOBE_INFO = {
  fro: { fn: ['판단 · 계획', '운동 명령을 내려요'], ex: '☝️ 손가락을 움직여요', act: '전두엽의 운동 영역이 활성화돼요.', area: '운동 영역' },
  par: { fn: ['피부 감각', '공간 인식'], ex: '🤏 손끝에 무언가 닿아요', act: '두정엽의 감각 영역이 활성화돼요.', area: '감각 영역' },
  tem: { fn: ['청각', '기억'], ex: '🔊 소리를 들어요', act: '측두엽의 청각 영역이 활성화돼요.', area: '감각 영역' },
  occ: { fn: ['시각'], ex: '👁️ 빛을 봐요', act: '후두엽의 시각 영역이 활성화돼요.', area: '감각 영역' },
};
function selectLobe(l) {
  const cer = S.cer; cer.sel = l; if (l) { cer.seen[l] = true; Sound.click(); }
  if (l) {
    const a = lobeAnchor(l, -1), cam = brainCam(CER_R.ex, 1, cer.yaw, cer.pitch), nc = nrmCam(cam, a[3]);
    if (nc[2] < 0.4 || (l !== 'fro' && cer.cut && cer.cutAmt > 0.3)) {
      if (cer.cut) { cer.cut = false; SciSim.tween(cer, { cutAmt: 0 }, { duration: 0.6, ease: 'inOutCubic' }); }
      SciSim.tween(cer, { yaw: CER_DEF.yaw, pitch: CER_DEF.pitch }, { duration: 0.7, ease: 'inOutCubic' });
    }
  }
  updateCtl();
}
function drawLobeInfo(R) {
  const cer = S.cer;
  panel(R.x, R.y, R.w, R.h, 16);
  const px = R.x + 14, pw = R.w - 28;
  let y = R.y + 30;
  if (!cer.sel) {
    T(px, y, '👆 엽을 눌러 보세요', PHONE ? 15 : 16, COL.ink, 'left', 800); y += 26;
    y += textBlock(px, y, pw, '대뇌는 신경 세포체가 모인 겉질(회색질)과 축삭이 모인 속질(백색질)로 이루어져요. 좌우 반구는 뇌량으로 연결돼요.', PHONE ? 13 : 13.5, COL.mut, PHONE ? 19 : 20, 700) + 8;
    y += textBlock(px, y, pw, '겉질은 감각 영역 · 운동 영역 · 연합 영역으로도 나눠요.', PHONE ? 13 : 13.5, COL.mut, PHONE ? 19 : 20, 700);
  } else {
    const L = LOBE[cer.sel], I = LOBE_INFO[cer.sel];
    D.label(px, y - 4, L.name, { bg: L.col, size: PHONE ? 15 : 16, align: 'left' }); y += 28;
    T(px, y, '하는 일', 13, COL.mut, 'left', 800); y += 20;
    I.fn.forEach((f) => { T(px + 8, y, '• ' + f, PHONE ? 14 : 14.5, COL.ink, 'left', 800); y += 22; });
    y += 6;
    // 활성화 장면
    const bx = px, bw = pw, bh = PHONE ? 132 : 156;
    D.roundRect(bx, y, bw, bh, 12); ctx.fillStyle = C.mix(L.col, '#ffffff', 0.84); ctx.fill(); ctx.strokeStyle = L.col; ctx.lineWidth = 2; ctx.stroke();
    textBlock(bx + 10, y + 22, bw - 20, '예 · ' + I.ex, 13.5, COL.ink, 18, 800);
    const f = RM ? 0.6 : (clock * 0.7) % 1, gx = bx + 24, gy = y + 66, ex = bx + bw - 28;
    D.sphere(gx, gy, 9, '#ffb44a', { gloss: true });
    ctx.strokeStyle = 'rgba(80,90,110,.45)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(gx + 12, gy); ctx.lineTo(ex - 14, gy); ctx.stroke(); ctx.setLineDash([]);
    const sx = lerp(gx + 12, ex - 14, f); D.glow(sx, gy, 14, '#ffd447', 0.8); D.sphere(sx, gy, 4.5, '#ffe27a', { gloss: false });
    const pul = 0.6 + 0.4 * Math.sin(clock * 6);
    D.glow(ex, gy, 24, L.col, 0.45 * pul + 0.1); D.sphere(ex, gy, 11, L.col, { gloss: true });
    textBlock(bx + 10, y + 108, bw - 20, I.act, 12.5, '#26324a', 17, 800);
    y += bh + 10;
    T(px, y + 6, '기능 영역: ' + I.area, 13.5, cer.sel === 'fro' ? AREA.motor.col : AREA.sensory.col, 'left', 800); y += 28;
    if (y < R.y + R.h - 20) textBlock(px, y, pw, cer.sel === 'fro' ? '운동 영역 앞쪽은 판단과 계획을 담당하는 연합 영역이에요.' : '이 엽의 나머지는 정보를 종합하는 연합 영역이에요.', 12.5, COL.mut, 17, 700);
  }
  // 영역 범례 (기능 영역 색 보기)
  if (cer.color === 'area') {
    const ly = R.y + R.h - (PHONE ? 74 : 92);
    ['motor', 'sensory', 'assoc'].forEach((k, i) => {
      const yy = ly + i * 24; D.roundRect(px, yy - 10, 20, 14, 4); ctx.fillStyle = AREA[k].col; ctx.fill();
      T(px + 28, yy + 2, AREA[k].name + (k === 'motor' ? ' · 운동 명령' : k === 'sensory' ? ' · 감각 정보 받음' : ' · 종합 판단'), PHONE ? 12.5 : 12, COL.ink, 'left', 800);
    });
  }
}
function drawCerScene(dt) {
  const cer = S.cer;
  bgFill('#eef3fb', '#f7f9fd');
  cer.zoom = SciSim.approach(cer.zoom, cer.tzoom, dt, 12);
  const R = CER_R.ex, cam = brainCam(R, cer.zoom, cer.yaw, cer.pitch);
  renderBrain(R, cam, { color: cer.color, sel: cer.sel, labels: true, mark: true, cutX: cutXNow() });
  if (!PHONE) T(R.x + R.w - 14, R.y + R.h - 14, '↔ 끌어서 돌려 보세요', 13, COL.mut, 'right', 800); else T(R.x + R.w - 12, R.y + R.h - 12, '↔ 끌어서 돌려요', 12.5, COL.mut, 'right', 800);
  drawLobeInfo(INFO_R);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE['cer:ex'] = {
  down(p) {
    const R = CER_R.ex; if (!inRect(p.x, p.y, R)) return false;
    const cer = S.cer; SciSim.tween(cer, { yaw: cer.yaw, pitch: cer.pitch }, { duration: 0.001 });
    cer.drag = { x: p.x, y: p.y, yaw: cer.yaw, pitch: cer.pitch, moved: false }; return true;
  },
  move(p) {
    const cer = S.cer, d = cer.drag; if (!d) return;
    if (Math.hypot(p.x - d.x, p.y - d.y) > 6) d.moved = true;
    if (d.moved) { cer.yaw = d.yaw - (p.x - d.x) * 0.012; cer.pitch = clamp(d.pitch + (p.y - d.y) * 0.01, -0.85, 0.85); cer.rotated = true; }
  },
  up(p) { const cer = S.cer, d = cer.drag; cer.drag = null; if (d && !d.moved) { const l = hitLobe(p); if (l) selectLobe(l); } },
  hover(p) { return inRect(p.x, p.y, CER_R.ex) ? (S.cer.drag ? 'grabbing' : 'grab') : 'default'; },
};
bindSeg('#lobeChips', 'data-l', (l) => selectLobe(l));
bindSeg('#colSeg', 'data-c', (c) => { S.cer.color = c; updateCtl(); });
SciSim.bindRange($('#sZoom'), $('#oZoom'), (v) => v + '%', (v) => { if (S.cer) S.cer.tzoom = v / 100; });
$('#bCut').addEventListener('click', () => {
  const cer = S.cer; Sound.click(); cer.cut = !cer.cut;
  SciSim.tween(cer, { cutAmt: cer.cut ? 1 : 0 }, { duration: RM ? 0.01 : 0.9, ease: 'inOutCubic', onDone() { if (cer.cut) cer.cutSeen = true; } });
  SciSim.tween(cer, cer.cut ? { yaw: 1.05, pitch: 0.12 } : { yaw: CER_DEF.yaw, pitch: CER_DEF.pitch }, { duration: 0.9, ease: 'inOutCubic' });
  updateCtl();
});
$('#bView').addEventListener('click', () => { const cer = S.cer; Sound.click(); SciSim.tween(cer, { yaw: cer.cut ? 1.05 : CER_DEF.yaw, pitch: cer.cut ? 0.12 : CER_DEF.pitch }, { duration: 0.6, ease: 'inOutCubic' }); });

/* ---- 환자 사례 ---- */
const CAS = [
  { id: 'c1', label: '한쪽 시야가 안 보여요', icon: '🙈', lobe: 'occ' },
  { id: 'c2', label: '계획을 세우기 어려워요', icon: '📝', lobe: 'fro' },
  { id: 'c3', label: '소리는 듣는데 말의 뜻을 이해하기 어려워요', icon: '👂', lobe: 'tem' },
  { id: 'c4', label: '손의 감각이 둔해졌어요', icon: '🤚', lobe: 'par' },
];
const CASG = PHONE
  ? { slot: (i) => ({ x: 8 + (i % 2) * 236, y: 266 + Math.floor(i / 2) * 74, w: 228, h: 54 }), tray: (i) => ({ x: 8 + (i % 2) * 236, y: 420 + Math.floor(i / 2) * 60 }), cw: 228, ch: 52 }
  : { slot: (i) => ({ x: 14 + i * 196, y: 346, w: 184, h: 66 }), tray: (i) => ({ x: 14 + i * 196, y: 452 }), cw: 184, ch: 66 };
const CASORD = ['fro', 'tem', 'par', 'occ'];       // 칸의 엽 차례
function newCases() {
  const targets = CASORD.map((l, i) => { const s = CASG.slot(i); return { id: 'lb' + l, x: s.x, y: s.y, w: s.w, h: s.h, ans: l }; });
  const order = [2, 0, 3, 1];
  return new Placer({ chips: order.map((k) => ({ id: CAS[k].lobe, label: CAS[k].label, icon: CAS[k].icon, col: LOBE[CAS[k].lobe].col })), targets, tray: CASG.tray, cw: CASG.cw, ch: CASG.ch, onChange() {} });
}
function drawCaseScene(dt) {
  const cer = S.cer, pl = S.cas.pl;
  bgFill('#eef3fb', '#f7f9fd');
  const R = CER_R.case, cam = brainCam(R, 1, CER_DEF.yaw, CER_DEF.pitch);
  renderBrain(R, cam, { color: 'lobe', sel: null, labels: true, mark: false, cutX: 1.2 });
  CASORD.forEach((l, i) => {
    const s = CASG.slot(i);
    D.label(s.x + s.w / 2, s.y - 12, LOBE[l].name, { bg: LOBE[l].col, size: PHONE ? 13 : 14.5 });
  });
  pl.drawTargets({ col: '#9fb3a6' });
  pl.targets.forEach((t) => { ctx.strokeStyle = LOBE[t.ans].col; ctx.lineWidth = 2.4; ctx.setLineDash([]); D.roundRect(t.x, t.y, t.w, t.h, 10); ctx.stroke(); });
  const ty = CASG.tray(0).y - 10;
  T(PHONE ? 10 : 18, ty, pl.placed < 4 ? '👇 증상 카드를 끌어서 알맞은 엽 칸에 놓아요 (가상 사례)' : '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12.5 : 14, pl.placed < 4 ? '#5a6679' : '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  if (!PHONE) T(18, 546, '교육용 가상 사례예요. 실제 진단이나 의학적 조언이 아니에요.', 13, COL.mut, 'left', 700); else T(10, 560, '교육용 가상 사례예요. 의학적 조언이 아니에요.', 12.5, COL.mut, 'left', 700);
}
PT_TABLE['cer:case'] = { down(p) { return S.cas.pl.down(p); }, move(p) { S.cas.pl.move(p); }, up(p) { S.cas.pl.up(p); }, hover(p) { return S.cas.pl.hover(p); } };
$('#bCaseReset').addEventListener('click', () => { Sound.click(); S.cas.pl.reset(); });


/* ============ ③ 뇌 줄기와 소뇌: 뇌의 정중 단면 ============ */
const PARTS = {
  dien: { name: '간뇌', col: '#f5a65b', c: [232, 192], fn: ['시상: 감각 신호를 대뇌로 중계해요', '시상 하부: 체온 · 혈당 · 삼투압 조절 중추', '호르몬 분비도 조절해요'], dmg: '체온 조절이 잘 안 될 수 있어요.', short: '감각 중계 · 체온·혈당 조절' },
  mid: { name: '중간뇌', col: '#2bb5a0', c: [245, 241], fn: ['눈의 움직임을 조절해요', '동공의 크기를 조절해요(동공 반사)'], dmg: '동공 반사가 일어나지 않을 수 있어요.', short: '눈 운동 · 동공 크기 조절' },
  cb: { name: '소뇌', col: '#6fc76a', c: [345, 296], fn: ['몸의 균형을 유지해요', '정교한 근육 운동을 조절해요'], dmg: '균형을 잡기 어렵고 움직임이 서툴러져요.', short: '몸의 균형 · 정교한 근육 운동' },
  med: { name: '연수', col: '#9a7fe0', c: [248, 342], fn: ['심장 박동 · 호흡 · 소화 운동 조절', '재채기 · 기침 같은 반사의 중추'], dmg: '호흡과 심장 박동 조절이 위험해져요.', short: '심장 박동 · 호흡 · 소화 운동' },
  cord: { name: '척수', col: '#6aa0dd', c: [248, 424], fn: ['뇌와 몸 사이의 신호 통로', '무릎 반사의 중추'], dmg: '뇌와 몸 사이 신호 전달이 끊겨요.', short: '뇌와 몸 사이 통로 · 무릎 반사' },
};
const PART_IDS = ['dien', 'mid', 'cb', 'med', 'cord'];
const STEM_LAY = {
  info: PHONE ? { ox: 80, oy: 8, s: 0.72 } : { ox: 30, oy: 40, s: 1.0 },
  case: PHONE ? { ox: 80, oy: 8, s: 0.72 } : { ox: 30, oy: 40, s: 1.0 },
  pair: PHONE ? { ox: 8, oy: 10, s: 0.52 } : { ox: 14, oy: 56, s: 0.82 },
};
const PLBL = { dien: [96, 276], mid: [96, 322], med: [96, 368], cord: [96, 424], cb: [356, 388] };
function resetStem() {
  S.stem = { sel: null, seen: {}, caseSel: [null, null, null, null], flash: {} };
  S.pair = { pl: newPair() };
  ['selC1', 'selC2', 'selC3', 'selC4'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); });
}
const PAIRG = PHONE
  ? { slot: (i) => ({ x: 304, y: 14 + i * 50, w: 168, h: 44 }), pill: (i) => [244, 36 + i * 50], tray: (i) => ({ x: 8 + (i % 2) * 236, y: 304 + Math.floor(i / 2) * 54 }), cw: 228, ch: 46 }
  : { slot: (i) => ({ x: 508, y: 38 + i * 64, w: 278, h: 52 }), pill: (i) => [426, 64 + i * 64], tray: (i) => ({ x: 396 + (i % 2) * 196, y: 384 + Math.floor(i / 2) * 54 }), cw: 190, ch: 46 };
const PAIR_ORD = ['dien', 'mid', 'cb', 'med', 'cord'];
function newPair() {
  const targets = PAIR_ORD.map((id, i) => { const s = PAIRG.slot(i); return { id: 'p' + id, x: s.x, y: s.y, w: s.w, h: s.h, ans: id }; });
  const order = [3, 0, 4, 1, 2];
  const chips = order.map((k) => ({ id: PAIR_ORD[k], label: PARTS[PAIR_ORD[k]].short, col: PARTS[PAIR_ORD[k]].col }));
  return new Placer({ chips, targets, tray: PAIRG.tray, cw: PAIRG.cw, ch: PAIRG.ch, onChange() {} });
}
$('#bPairReset').addEventListener('click', () => { Sound.click(); S.pair.pl.reset(); });
const lay = () => STEM_LAY[S.sub] || STEM_LAY.info;
const SX = (x, L) => L.ox + x * L.s, SY = (y, L) => L.oy + y * L.s;

function stemPath(p) { ctx.beginPath(); p.forEach((q, i) => { if (q.length === 2) (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); else ctx.bezierCurveTo(q[0], q[1], q[2], q[3], q[4], q[5]); }); ctx.closePath(); }
/* 뇌 단면 그리기 (로컬 좌표 440x470). hl: 강조할 부위 id 모음 */
function drawSagittal(L, hl, dim, tt) {
  ctx.save(); ctx.translate(L.ox, L.oy); ctx.scale(L.s, L.s);
  const alpha = (id) => (dim && !hl[id] ? 0.42 : 1);
  const glowOf = (id) => { if (hl[id]) { const c = PARTS[id].c; D.glow(c[0], c[1], id === 'cb' ? 110 : id === 'cord' ? 70 : 80, PARTS[id].col, 0.55 + 0.2 * Math.sin(tt * 5)); } };
  // 소뇌
  ctx.globalAlpha = alpha('cb'); glowOf('cb');
  { const g = ctx.createRadialGradient(325, 280, 8, 345, 296, 76); g.addColorStop(0, '#b6e9b1'); g.addColorStop(1, '#5eb85a');
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(345, 296, 70, 45, -0.12, 0, TAU); ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(20,60,20,.25)' });
    ctx.strokeStyle = 'rgba(34,110,40,.5)'; ctx.lineWidth = 1.8; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(345, 296, 62 - Math.abs(k) * 3, 8 + Math.abs(k) * 5.5, -0.12, 0.15, Math.PI - 0.15); ctx.stroke(); }
    ctx.strokeStyle = hl.cb ? '#2c8a2f' : '#3a9a3d'; ctx.lineWidth = hl.cb ? 3 : 2; ctx.beginPath(); ctx.ellipse(345, 296, 70, 45, -0.12, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 대뇌
  ctx.globalAlpha = dim ? 0.55 : 1;
  const cg = ctx.createLinearGradient(0, 10, 0, 260); cg.addColorStop(0, '#f6c9d0'); cg.addColorStop(1, '#e9a8b4');
  D.shadow(() => { ctx.fillStyle = cg; stemPath([[60, 210], [30, 120, 110, 20, 230, 18], [360, 16, 425, 100, 415, 190], [410, 230, 380, 245, 350, 240], [320, 236, 290, 236, 270, 236], [240, 262, 150, 266, 120, 238], [95, 232, 62, 236, 60, 210]]); ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(120,40,60,.25)' });
  ctx.strokeStyle = '#c47a8a'; ctx.lineWidth = 2.4; stemPath([[60, 210], [30, 120, 110, 20, 230, 18], [360, 16, 425, 100, 415, 190], [410, 230, 380, 245, 350, 240], [320, 236, 290, 236, 270, 236], [240, 262, 150, 266, 120, 238], [95, 232, 62, 236, 60, 210]]); ctx.stroke();
  ctx.strokeStyle = 'rgba(176,96,116,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  [[110, 70, 160, 40, 210, 62], [235, 52, 290, 34, 340, 66], [90, 130, 120, 100, 150, 120], [352, 120, 380, 100, 395, 140], [300, 96, 330, 120, 310, 150], [70, 180, 100, 160, 120, 176], [370, 190, 390, 176, 400, 196], [160, 90, 190, 108, 220, 92]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[2], q[3], q[4], q[5]); ctx.stroke(); });
  // 뇌량
  ctx.strokeStyle = '#d4a65c'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(122, 160); ctx.quadraticCurveTo(230, 82, 340, 160); ctx.stroke();
  ctx.strokeStyle = '#ffe3a3'; ctx.lineWidth = 6; ctx.stroke();
  ctx.globalAlpha = 1;
  // 뇌교(이름만)
  ctx.globalAlpha = alpha('mid') * 0.85;
  D.roundRect(214, 258, 64, 44, 18); ctx.fillStyle = '#c4cbd8'; ctx.fill(); ctx.strokeStyle = '#8f99ad'; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = 1;
  // 척수
  ctx.globalAlpha = alpha('cord'); glowOf('cord');
  D.roundRect(236, 372, 26, 98, 12); { const g = ctx.createLinearGradient(236, 0, 262, 0); g.addColorStop(0, '#9ec2ec'); g.addColorStop(1, '#5d93d4'); ctx.fillStyle = g; ctx.fill(); }
  ctx.strokeStyle = hl.cord ? '#2c5e9e' : '#4a7fbd'; ctx.lineWidth = hl.cord ? 3 : 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; for (let y = 384; y < 466; y += 14) { ctx.beginPath(); ctx.moveTo(240, y); ctx.lineTo(258, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 연수
  ctx.globalAlpha = alpha('med'); glowOf('med');
  { const g = ctx.createLinearGradient(222, 0, 276, 0); g.addColorStop(0, '#c8b6f4'); g.addColorStop(1, '#8c70d8'); ctx.fillStyle = g;
    stemPath([[222, 300], [276, 300], [270, 350], [262, 384], [236, 384], [226, 352]]); ctx.fill(); ctx.strokeStyle = hl.med ? '#5b3fb0' : '#7459c4'; ctx.lineWidth = hl.med ? 3 : 2; ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 중간뇌
  ctx.globalAlpha = alpha('mid'); glowOf('mid');
  D.roundRect(220, 220, 50, 42, 12); { const g = ctx.createLinearGradient(0, 220, 0, 262); g.addColorStop(0, '#6fe0cb'); g.addColorStop(1, '#1f9c88'); ctx.fillStyle = g; ctx.fill(); }
  ctx.strokeStyle = hl.mid ? '#0d6e5e' : '#1b8f7c'; ctx.lineWidth = hl.mid ? 3 : 2; ctx.stroke();
  ctx.globalAlpha = 1;
  // 간뇌 (시상 + 시상 하부)
  ctx.globalAlpha = alpha('dien'); glowOf('dien');
  { const g = ctx.createRadialGradient(222, 172, 6, 232, 186, 56); g.addColorStop(0, '#ffd29b'); g.addColorStop(1, '#ee8f2e'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(232, 180, 54, 30, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = hl.dien ? '#b3600c' : '#d97a1c'; ctx.lineWidth = hl.dien ? 3 : 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(231, 214, 28, 13, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.restore();
}
const LABEL_TXT = { dien: '간뇌', mid: '중간뇌', cb: '소뇌', med: '연수', cord: '척수' };
function drawStemLabels(L, hl, mode) {
  PART_IDS.forEach((id) => {
    const c = PARTS[id].c, l = PLBL[id]; if (!l) return;
    const tx = SX(c[0], L), ty = SY(c[1], L), lx = SX(l[0], L), ly = SY(l[1], L);
    ctx.strokeStyle = PARTS[id].col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    D.label(lx, ly, LABEL_TXT[id] + (S.stem.seen[id] && mode === 'info' ? ' ✓' : ''), { bg: hl[id] ? C.shade(PARTS[id].col, -0.25) : C.shade(PARTS[id].col, -0.12), size: PHONE ? 13 : 14.5, align: 'right' });
  });
  const L2 = { x: SX(214, L), y: SY(283, L) };
  T(L2.x - 4, L2.y + 4, '뇌교', PHONE ? 12 : 13, '#5a6679', 'right', 800);
  T(SX(46, L), SY(30, L), '← 앞', PHONE ? 12.5 : 13.5, COL.mut, 'left', 800); T(SX(430, L), SY(30, L), '뒤 →', PHONE ? 12.5 : 13.5, COL.mut, 'right', 800);
  T(SX(124, L), SY(104, L) - 4, '대뇌', PHONE ? 13 : 14.5, '#9d4b60', 'left', 800);
  T(SX(260, L), SY(98, L) - 4, '뇌량', PHONE ? 12 : 13, '#9a6c1c', 'center', 800);
}
/* 부위별 작은 장면 (정보 상자) */
function drawPartDemo(id, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2 + 4, t = clock;
  ctx.save();
  if (id === 'med') {
    const b = 1 + 0.16 * Math.max(0, Math.sin(t * 7)), br = 1 + 0.14 * Math.sin(t * 2.2);
    T(cx - 34, cy + 10, '❤️', 34 * b, '#000', 'center', 600); T(cx + 34, cy + 10, '🫁', 32 * br, '#000', 'center', 600);
  } else if (id === 'cb') {
    ctx.translate(cx, cy + 14); ctx.rotate(RM ? 0 : Math.sin(t * 2.4) * 0.22); T(0, 0, '🧍', 40, '#000', 'center', 600);
    ctx.restore(); ctx.save(); ctx.strokeStyle = '#5eb85a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 38, cy + 20); ctx.lineTo(cx + 38, cy + 20); ctx.stroke();
  } else if (id === 'dien') {
    T(cx - 20, cy + 12, '🌡️', 36, '#000', 'center', 600);
    const f = 0.5 + 0.5 * Math.sin(t * 2); ctx.fillStyle = C.mix('#3b82f6', '#ef4444', f); D.roundRect(cx + 10, cy - 14, 14, 40, 7); ctx.fill();
    ctx.fillStyle = '#26324a'; ctx.font = D.font(13, 800); ctx.textAlign = 'left'; ctx.fillText('일정하게', cx + 30, cy + 10);
  } else if (id === 'mid') {
    const pr = 5 + 5 * (0.5 + 0.5 * Math.sin(t * 2.6));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 40, 24, 0, 0, TAU); ctx.fill(); ctx.stroke();
    D.sphere(cx, cy + 4, 18, '#5b8fd6', { gloss: false }); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy + 4, pr, 0, TAU); ctx.fill();
  } else {
    const sw = RM ? 0 : Math.max(0, Math.sin(t * 5)) * 0.8;
    ctx.translate(cx - 6, cy - 10); T(0, 6, '🪑', 30, '#000', 'center', 600); ctx.translate(14, 10); ctx.rotate(sw); T(0, 18, '🦵', 32, '#000', 'center', 600);
  }
  ctx.restore();
}
function drawStemInfoPanel(R) {
  const st = S.stem;
  panel(R.x, R.y, R.w, R.h, 16);
  const px = R.x + 14, pw = R.w - 28; let y = R.y + 30;
  if (!st.sel) {
    T(px, y, '👆 부위를 눌러 보세요', PHONE ? 15 : 16, COL.ink, 'left', 800); y += 28;
    y += textBlock(px, y, pw, '간뇌 · 중간뇌 · 연수는 대뇌와 척수를 잇는 뇌의 가운데 부분이에요. (뇌 줄기는 중간뇌 · 뇌교 · 연수)', PHONE ? 13 : 13.5, COL.mut, PHONE ? 19 : 21, 700) + 8;
    textBlock(px, y, pw, '이 부위들은 대뇌의 판단 없이도 생명 활동을 조절해요. 대뇌 중심의 설명은 앞 단계에서 했어요.', PHONE ? 13 : 13.5, COL.mut, PHONE ? 19 : 21, 700);
    return;
  }
  const P = PARTS[st.sel];
  D.label(px, y - 4, P.name, { bg: P.col, size: PHONE ? 15 : 16.5, align: 'left' }); y += 26;
  const dh = PHONE ? 70 : 84; D.roundRect(px, y, pw, dh, 12); ctx.fillStyle = C.mix(P.col, '#ffffff', 0.84); ctx.fill(); ctx.strokeStyle = P.col; ctx.lineWidth = 2; ctx.stroke();
  drawPartDemo(st.sel, px, y, pw, dh); y += dh + 18;
  T(px, y, '하는 일', 13, COL.mut, 'left', 800); y += 22;
  P.fn.forEach((f) => { y += textBlock(px + 4, y, pw - 8, '• ' + f, PHONE ? 13.5 : 14, COL.ink, PHONE ? 19 : 21, 800) + 2; });
  y += 8; T(px, y, '손상되면?', 13, '#b45309', 'left', 800); y += 22;
  textBlock(px + 4, y, pw - 8, P.dmg + (PHONE ? '' : ' (가상 사례)'), PHONE ? 13.5 : 14, '#7c2d12', PHONE ? 19 : 21, 800);
}
function drawStemInfo(dt) {
  const st = S.stem, L = STEM_LAY.info;
  bgFill('#eef3fb', '#f7f9fd');
  const hl = {}; if (st.sel) hl[st.sel] = true;
  panel(PHONE ? 8 : 14, PHONE ? 8 : 14, PHONE ? 464 : 470, PHONE ? 344 : 532, 18);
  drawSagittal(L, hl, !!st.sel, clock);
  drawStemLabels(L, hl, 'info');
  T(PHONE ? 20 : 30, PHONE ? 344 : 538, PHONE ? '' : '정중 단면(몸의 가운데를 세로로 자른 모습)', 13, COL.mut, 'left', 700);
  drawStemInfoPanel(PHONE ? { x: 8, y: 362, w: 464, h: 270 } : { x: 500, y: 14, w: 286, h: 532 });
  parts.update(dt); parts.draw(ctx);
}
function stemHit(p) {
  const L = lay();
  const x = (p.x - L.ox) / L.s, y = (p.y - L.oy) / L.s;
  const ell = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  if (ell(232, 196, 62, 42)) return 'dien';
  if (x >= 214 && x <= 280 && y >= 218 && y <= 264) return 'mid';
  if (ell(345, 296, 74, 49)) return 'cb';
  if (x >= 218 && x <= 280 && y >= 300 && y <= 386) return 'med';
  if (x >= 230 && x <= 268 && y >= 386 && y <= 472) return 'cord';
  return null;
}
function selectPart(id) { S.stem.sel = id; if (id) { S.stem.seen[id] = true; Sound.click(); } updateCtl(); }
PT_TABLE['stem:info'] = { down(p) { const id = stemHit(p); if (id) selectPart(id); return false; }, hover(p) { return stemHit(p) ? 'pointer' : 'default'; } };
bindSeg('#partChips', 'data-p', (p) => selectPart(p));

function drawStemPair(dt) {
  const L = STEM_LAY.pair, pl = S.pair.pl;
  bgFill('#eef3fb', '#f7f9fd');
  panel(PHONE ? 4 : 8, PHONE ? 6 : 10, PHONE ? 236 : 372, PHONE ? 252 : 440, 16);
  const hl = {}; if (pl.hot) hl[pl.hot.ans] = true;
  drawSagittal(L, hl, !!pl.hot, clock);
  PAIR_ORD.forEach((id, i) => {
    const c = PARTS[id].c, tx = SX(c[0], L), ty = SY(c[1], L), pp = PAIRG.pill(i), s = PAIRG.slot(i);
    ctx.strokeStyle = PARTS[id].col; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(pp[0] - 4, pp[1]); ctx.lineTo(tx, ty); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, ty, 5, 0, TAU); ctx.fill(); ctx.stroke();
    D.label(pp[0], pp[1], LABEL_TXT[id], { bg: C.shade(PARTS[id].col, -0.15), size: PHONE ? 13 : 14.5, align: 'left' });
  });
  pl.drawTargets({ col: '#9fb3a6' });
  pl.targets.forEach((t) => { ctx.strokeStyle = PARTS[t.ans].col; ctx.lineWidth = 2.4; D.roundRect(t.x, t.y, t.w, t.h, 10); ctx.stroke(); });
  const ty = PAIRG.tray(0).y - 12;
  T(PHONE ? 10 : 396, ty, pl.placed < 5 ? '👇 기능 카드를 알맞은 부위 칸에 놓아요' : '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12.5 : 13.5, pl.placed < 5 ? '#5a6679' : '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  if (PHONE) { const y = 462; T(10, y + 10, '대뇌의 판단이 없어도 이 부위들은 몸을 조절해요.', 12.5, COL.mut, 'left', 700); }
}
PT_TABLE['stem:pair'] = { down(p) { return S.pair.pl.down(p); }, move(p) { S.pair.pl.move(p); }, up(p) { S.pair.pl.up(p); }, hover(p) { return S.pair.pl.hover(p); } };

/* 손상 사례 */
const SCASE = [
  { t: '① 균형을 잡기 어렵고 팔다리 움직임이 서툴러요', ans: 'cb' },
  { t: '② 숨 쉬기와 심장 박동 조절이 위험해요', ans: 'med' },
  { t: '③ 체온 조절이 잘 안 돼요', ans: 'dien' },
  { t: '④ 밝기가 변해도 동공 반사가 일어나지 않아요', ans: 'mid' },
];
function stemCaseVals() { return ['selC1', 'selC2', 'selC3', 'selC4'].map((id) => $('#' + id).value || null); }
function drawStemCase(dt) {
  const L = STEM_LAY.case, vals = stemCaseVals();
  bgFill('#eef3fb', '#f7f9fd');
  const hl = {}; vals.forEach((v) => { if (v) hl[v] = true; });
  panel(PHONE ? 8 : 14, PHONE ? 8 : 14, PHONE ? 464 : 470, PHONE ? 344 : 532, 18);
  drawSagittal(L, hl, vals.some((v) => v), clock);
  drawStemLabels(L, hl, 'case');
  const R = PHONE ? { x: 8, y: 362, w: 464, h: 270 } : { x: 500, y: 14, w: 286, h: 532 };
  panel(R.x, R.y, R.w, R.h, 16);
  let y = R.y + 28;
  T(R.x + 14, y, '🩺 가상 사례와 고른 부위', PHONE ? 14.5 : 15.5, COL.ink, 'left', 800); y += PHONE ? 14 : 18;
  SCASE.forEach((c, i) => {
    const v = vals[i];
    y += textBlock(R.x + 14, y + 12, R.w - 28, c.t, PHONE ? 12.5 : 13.5, COL.ink, PHONE ? 17 : 19, 800);
    D.label(R.x + 22, y + (PHONE ? 12 : 16), v ? '→ ' + PARTS[v].name : '→ 부위를 골라요 (오른쪽 조작판)', { bg: v ? C.shade(PARTS[v].col, -0.15) : '#9aa6b8', size: PHONE ? 12.5 : 13.5, align: 'left' });
    y += PHONE ? 38 : 50;
  });
  T(R.x + 14, R.y + R.h - 14, '교육용 가상 사례예요. 의학적 조언이 아니에요.', 12.5, COL.mut, 'left', 700);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE['stem:case'] = {};
['selC1', 'selC2', 'selC3', 'selC4'].forEach((id) => $('#' + id).addEventListener('change', () => { Sound.click(); $('#' + id).classList.remove('ok', 'bad'); }));


/* ============ ④ 말초 신경: 자율 신경 실험과 비교표 ============ */
const AUTO_VAL = {
  rest: { pupil: 12, bpm: 70, bronch: 10, gut: 1, bladder: 1 },
  sym: { pupil: 19, bpm: 120, bronch: 15, gut: 0.2, bladder: 1.14 },
  par: { pupil: 6.5, bpm: 55, bronch: 6, gut: 1.9, bladder: 0.8 },
};
const ORGANS = [
  { id: 'pupil', name: '동공', sym: '동공 확대', par: '동공 축소', rest: '보통' },
  { id: 'heart', name: '심장', sym: '박동 촉진', par: '박동 억제', rest: '보통' },
  { id: 'bronch', name: '기관지', sym: '기관지 확장', par: '기관지 수축', rest: '보통' },
  { id: 'stomach', name: '위', sym: '소화 운동 억제', par: '소화 운동 촉진', rest: '보통' },
  { id: 'gut', name: '소장', sym: '소화 운동 억제', par: '소화 운동 촉진', rest: '보통' },
  { id: 'bladder', name: '방광', sym: '방광 이완', par: '방광 수축', rest: '보통' },
];
function resetPer() {
  const v = AUTO_VAL.rest;
  S.per = { mode: 'rest', visited: {}, pupil: v.pupil, bpm: v.bpm, bronch: v.bronch, gut: v.gut, bladder: v.bladder, beat: 0, gphase: 0, bphase: 0, drip: 0 };
  S.tab = { pl: newTab() };
}
const PERG = PHONE
  ? { tops: { x: 8, y: 8, w: 464, h: 58 }, cell: (i) => ({ x: 8 + (i % 2) * 236, y: 76 + Math.floor(i / 2) * 138, w: 228, h: 130 }) }
  : { tops: { x: 14, y: 14, w: 772, h: 76 }, cell: (i) => ({ x: 14 + (i % 3) * 264, y: 100 + Math.floor(i / 3) * 172, w: 244, h: 162 }) };
function setAuto(m) {
  const p = S.per; if (p.mode === m) return; p.mode = m; if (m !== 'rest') p.visited[m] = true; Sound.click(); updateCtl();
  const s = $('#stageHint'); if (s) { /* 안내는 장면에 그려요 */ }
}
bindSeg('#autoSeg', 'data-a', (a) => setAuto(a));
const perHeartPath = (k) => { ctx.beginPath(); ctx.moveTo(0, 22 * k); ctx.bezierCurveTo(-46 * k, -4 * k, -30 * k, -38 * k, 0, -16 * k); ctx.bezierCurveTo(30 * k, -38 * k, 46 * k, -4 * k, 0, 22 * k); ctx.closePath(); };
function drawOrgan(o, r, p, dt) {
  const k = r.h / 150 > 1 ? 1 : r.h / 150, cx = r.x + r.w / 2, cy = r.y + r.h * 0.5 + 2;
  const m = p.mode, col = m === 'sym' ? COL.sym : m === 'par' ? COL.par : '#8795a8';
  D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
  ctx.strokeStyle = m === 'rest' ? '#dbe3ef' : col; ctx.lineWidth = m === 'rest' ? 1.5 : 2.6; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
  T(r.x + 12, r.y + 22, o.name, PHONE ? 14.5 : 15.5, COL.ink, 'left', 800);
  const eff = o[m];
  D.label(r.x + r.w - 10, r.y + 20, eff, { bg: m === 'rest' ? '#9aa6b8' : col, size: PHONE ? 12 : 13, align: 'right' });
  ctx.save(); ctx.beginPath(); D.roundRect(r.x + 2, r.y + 34, r.w - 4, r.h - 36, 12); ctx.clip();
  if (o.id === 'pupil') {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a465c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 62 * k + 6, 38 * k + 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    D.sphere(cx, cy + 6, 29 * k + 2, '#6a9be0', { gloss: false }); ctx.strokeStyle = 'rgba(30,60,120,.5)'; ctx.lineWidth = 1.4;
    for (let a = 0; a < 16; a++) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a / 16 * TAU) * p.pupil * k * 1.2, cy + 6 + Math.sin(a / 16 * TAU) * p.pupil * k * 1.2); ctx.lineTo(cx + Math.cos(a / 16 * TAU) * 27 * k, cy + 6 + Math.sin(a / 16 * TAU) * 27 * k); ctx.stroke(); }
    ctx.fillStyle = '#10131c'; ctx.beginPath(); ctx.arc(cx, cy + 6, p.pupil * k * 1.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(cx - 8 * k, cy - 2, 3.2 * k + 1, 0, TAU); ctx.fill();
    T(cx + 70 * k + 4, cy + 12, '', 1, '#000');
  } else if (o.id === 'heart') {
    const pulse = Math.pow(Math.max(0, Math.sin(p.beat)), 3), sc = k * (1 + 0.16 * pulse);
    ctx.save(); ctx.translate(cx - 22, cy + 8); ctx.scale(sc, sc); perHeartPath(1);
    const g = ctx.createRadialGradient(-10, -10, 4, 0, 0, 44); g.addColorStop(0, '#ff9aa8'); g.addColorStop(1, '#d6283f'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#8d1327'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    T(cx + 40 * k, cy + 4, Math.round(p.bpm) + '', PHONE ? 26 : 30, '#b91c1c', 'center', 800); T(cx + 40 * k, cy + 24, 'bpm', 13, COL.mut, 'center', 800);
  } else if (o.id === 'bronch') {
    const bw = p.bronch * k * 0.95 + 2;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#d98a8a'; ctx.lineWidth = bw + 6; ctx.beginPath(); ctx.moveTo(cx, cy - 36 * k); ctx.lineTo(cx, cy - 6 * k); ctx.stroke();
    [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.moveTo(cx, cy - 6 * k); ctx.quadraticCurveTo(cx + sd * 10 * k, cy + 2 * k, cx + sd * 46 * k, cy + 30 * k); ctx.stroke(); });
    ctx.strokeStyle = '#ffe6e6'; ctx.lineWidth = bw; ctx.beginPath(); ctx.moveTo(cx, cy - 36 * k); ctx.lineTo(cx, cy - 6 * k); ctx.stroke();
    [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.moveTo(cx, cy - 6 * k); ctx.quadraticCurveTo(cx + sd * 10 * k, cy + 2 * k, cx + sd * 46 * k, cy + 30 * k); ctx.stroke(); });
    if (!RM) for (let a = 0; a < 6; a++) { const f = ((clock * (0.5 + p.bronch / 14) + a / 6) % 1), yy = cy - 36 * k + f * 30 * k; D.sphere(cx + Math.sin(a * 2.1) * bw * 0.22, yy, 2.6, '#7cc4ff', { gloss: false }); }
    if (!RM) [-1, 1].forEach((sd) => { for (let a = 0; a < 4; a++) { const f = ((clock * (0.5 + p.bronch / 14) + a / 4) % 1); const qx = cx + sd * (10 + 36 * f) * k * (f * 0.9 + 0.1), qy = cy - 6 * k + 36 * k * f; D.sphere(qx, qy, 2.4, '#7cc4ff', { gloss: false }); } });
    T(cx, r.y + r.h - 8, '관 지름 ' + (p.bronch / 10).toFixed(1) + ' (평상시 1.0)', 12, COL.mut, 'center', 700);
  } else if (o.id === 'stomach' || o.id === 'gut') {
    const pts = []; const isSt = o.id === 'stomach';
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      if (isSt) pts.push([cx - 56 * k + f * 108 * k, cy + 8 + Math.sin(f * 2.6 + 0.4) * 22 * k - 10 * k + (f > 0.6 ? 14 * k * (f - 0.6) : 0)]);
      else pts.push([cx - 92 * k + f * 184 * k, cy + 10 + Math.sin(f * 15 + 0.6) * 20 * k]);
    }
    const base = isSt ? 36 * k : 15 * k, phase = p.gphase * (isSt ? 1 : 1.25);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const w = 0.5 + 0.5 * Math.sin(i * 0.8 - phase), amp = 0.12 + 0.3 * Math.min(1, p.gut / 1.2);
      const lw = base * (1 - amp * w * (p.gut > 0.05 ? 1 : 0)) + (isSt ? 0 : 1);
      ctx.strokeStyle = isSt ? '#e7a083' : '#e9a9a0'; ctx.lineWidth = lw + 5; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const w = 0.5 + 0.5 * Math.sin(i * 0.8 - phase), amp = 0.12 + 0.3 * Math.min(1, p.gut / 1.2);
      const lw = base * (1 - amp * w * (p.gut > 0.05 ? 1 : 0)) + (isSt ? 0 : 1);
      ctx.strokeStyle = isSt ? '#fbd6c3' : '#fbd9d4'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
    if (!RM) for (let a = 0; a < 5; a++) { const f = ((p.gphase * 0.06 + a / 5) % 1), i0 = Math.min(n - 1, Math.floor(f * n)), t = f * n - i0; D.sphere(lerp(pts[i0][0], pts[i0 + 1][0], t), lerp(pts[i0][1], pts[i0 + 1][1], t), isSt ? 5 : 3.4, '#c8873a', { gloss: false }); }
    T(cx, r.y + r.h - 8, '움직임 ' + (p.gut).toFixed(1) + '배 (평상시 1.0)', 12, COL.mut, 'center', 700);
  } else {
    const sc = p.bladder, rx = 36 * k * sc, ry = 40 * k * sc;
    const g = ctx.createRadialGradient(cx - 10, cy - 6, 5, cx, cy + 6, ry + 6); g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#f2c53a');
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy + 6, rx, ry, 0, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#b8870f'; ctx.lineWidth = 2.2 + (m === 'par' ? 2.2 : 0); ctx.beginPath(); ctx.ellipse(cx, cy + 6, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#b8870f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy + 6 + ry); ctx.lineTo(cx, cy + 6 + ry + 14 * k); ctx.stroke();
    if (m === 'par' && !RM) for (let a = 0; a < 3; a++) { const f = (p.drip + a / 3) % 1; D.sphere(cx, cy + 6 + ry + 14 * k + f * 20 * k, 3, '#f2c53a', { gloss: false }); }
    T(cx, r.y + r.h - 8, '크기 ' + sc.toFixed(2) + '배 (평상시 1.00)', 12, COL.mut, 'center', 700);
  }
  ctx.restore();
}
function stepPer(dt) {
  const p = S.per, v = AUTO_VAL[p.mode];
  p.pupil = SciSim.approach(p.pupil, v.pupil, dt, 6); p.bpm = SciSim.approach(p.bpm, v.bpm, dt, 4); p.bronch = SciSim.approach(p.bronch, v.bronch, dt, 6);
  p.gut = SciSim.approach(p.gut, v.gut, dt, 4); p.bladder = SciSim.approach(p.bladder, v.bladder, dt, 4);
  p.beat += dt * p.bpm / 60 * TAU; p.gphase += dt * (1.2 + p.gut * 3.2); p.drip += dt * 0.9;
}
function drawPerScene(dt) {
  const p = S.per, tp = PERG.tops;
  bgFill('#eef3fb', '#f7f9fd');
  // 신경 경로 (조절 중추 → 기관)
  const bx = tp.x, bw = PHONE ? 150 : 214;
  D.shadow(() => { D.roundRect(bx, tp.y, bw, tp.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
  ctx.strokeStyle = COL.cns; ctx.lineWidth = 2; D.roundRect(bx, tp.y, bw, tp.h, 14); ctx.stroke();
  TF(bx + bw / 2, tp.y + tp.h / 2 - 3, '🧠 간뇌 · 연수 · 중간뇌', bw - 12, PHONE ? 13 : 15, 11, COL.cns, 'center', 800);
  T(bx + bw / 2, tp.y + tp.h / 2 + 16, '조절 중추', PHONE ? 12 : 13, COL.mut, 'center', 700);
  const lanes = [['sym', '교감 신경', COL.sym, tp.y + tp.h * 0.3], ['par', '부교감 신경', COL.par, tp.y + tp.h * 0.74]];
  lanes.forEach((ln) => {
    const on = p.mode === ln[0], x0 = bx + bw + 4, x1 = tp.x + tp.w - 6;
    ctx.strokeStyle = on ? ln[2] : '#c6d0de'; ctx.lineWidth = on ? 5 : 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, ln[3]); ctx.lineTo(x1, ln[3]); ctx.stroke();
    D.arrow(x1 - 14, ln[3], x1 + 2, ln[3], { color: on ? ln[2] : '#c6d0de', width: 3, head: 9 });
    D.label(x0 + (PHONE ? 52 : 70), ln[3], ln[1] + (on ? ' 활발' : ''), { bg: on ? ln[2] : '#9aa6b8', size: PHONE ? 12 : 13.5 });
    if (on && !RM) for (let a = 0; a < 7; a++) { const f = ((clock * 0.5 + a / 7) % 1); D.sphere(x0 + f * (x1 - x0), ln[3], 4.2, '#ffe27a', { gloss: false }); }
  });
  ORGANS.forEach((o, i) => drawOrgan(o, PERG.cell(i), p, dt));
  const y0 = PERG.cell(5).y + PERG.cell(5).h + (PHONE ? 22 : 24);
  if (p.mode === 'rest') textBlock(PHONE ? 10 : 18, y0, VW - (PHONE ? 20 : 36), '👉 조작판에서 교감 신경 · 부교감 신경을 켜서 여섯 기관의 반응을 비교해요.', PHONE ? 13 : 14.5, COL.mut, PHONE ? 19 : 22, 800);
  else if (p.mode === 'sym') textBlock(PHONE ? 10 : 18, y0, VW - (PHONE ? 20 : 36), '교감 신경: 긴장하거나 활동할 때 작용해요. 여섯 기관이 모두 그에 맞게 변해요.', PHONE ? 13 : 14.5, COL.sym, PHONE ? 19 : 22, 800);
  else textBlock(PHONE ? 10 : 18, y0, VW - (PHONE ? 20 : 36), '부교감 신경: 쉬거나 소화할 때 작용해요. 같은 기관에 교감 신경과 반대로 작용해요(길항 작용).', PHONE ? 13 : 14.5, COL.par, PHONE ? 19 : 22, 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE['per:auto'] = {};

/* ---- 비교표 ---- */
const TBG = PHONE
  ? { hdr: [[8, 8, 228, 36], [244, 8, 228, 36]], slot: (r, c) => ({ x: 8 + c * 236, y: 52 + r * 100 + 26, w: 228, h: 56 }), rowLab: (r) => [10, 52 + r * 100 + 16], tray: (i) => ({ x: 12 + (i % 2) * 236, y: 372 + Math.floor(i / 2) * 54 }), cw: 218, ch: 46 }
  : { hdr: [[160, 46, 306, 44], [480, 46, 306, 44]], slot: (r, c) => ({ x: 164 + c * 320, y: 100 + r * 72, w: 298, h: 62 }), rowLab: (r) => [14, 138 + r * 72], tray: (i) => ({ x: 14 + (i % 3) * 262, y: 352 + Math.floor(i / 3) * 56 }), cw: 250, ch: 48 };
const TAB_ROWS = ['의식(대뇌)의 관여', '명령을 받는 곳(효과기)', '대표 사례'];
const TAB_ANS = [['conscious', 'unconscious'], ['skeletal', 'organs'], ['cup', 'heart']];
const TAB_CH = { conscious: '의식적 (대뇌의 명령)', unconscious: '무의식적 (대뇌의 직접 명령 없음)', skeletal: '골격근', organs: '내장 기관 · 샘 · 동공', cup: '컵 잡기, 글씨 쓰기', heart: '심장 박동 · 소화 운동 조절' };
function newTab() {
  const targets = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const s = TBG.slot(r, c); targets.push({ id: 't' + r + c, x: s.x, y: s.y, w: s.w, h: s.h, ans: TAB_ANS[r][c] }); }
  const order = ['organs', 'conscious', 'heart', 'skeletal', 'unconscious', 'cup'];
  return new Placer({ chips: order.map((id) => ({ id, label: TAB_CH[id], col: id === 'conscious' || id === 'skeletal' || id === 'cup' ? '#d97706' : '#2563eb' })), targets, tray: TBG.tray, cw: TBG.cw, ch: TBG.ch, onChange() {} });
}
function drawTabScene(dt) {
  const pl = S.tab.pl;
  bgFill('#eaf6f1', '#f7fbf9');
  [['체성 신경계', '#d97706'], ['자율 신경계', '#2563eb']].forEach((h, c) => {
    const r = TBG.hdr[c]; D.roundRect(r[0], r[1], r[2], r[3], 12); ctx.fillStyle = h[1]; ctx.fill();
    T(r[0] + r[2] / 2, r[1] + r[3] / 2 + 6, h[0], PHONE ? 15 : 17, '#fff', 'center', 800);
  });
  for (let r = 0; r < 3; r++) {
    const lb = TBG.rowLab(r);
    if (PHONE) T(lb[0], lb[1], TAB_ROWS[r], 13.5, COL.ink, 'left', 800);
    else { textBlock(lb[0], lb[1] - 14, 140, TAB_ROWS[r], 14, COL.ink, 19, 800); }
  }
  pl.drawTargets({ col: '#9fb3a6' });
  const ty = TBG.tray(0).y - 12;
  T(PHONE ? 10 : 14, ty, pl.placed < 6 ? '👇 카드를 끌어서 표의 칸에 놓아요' : '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12.5 : 14, pl.placed < 6 ? '#5a6679' : '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  const y0 = PHONE ? 548 : 470;
  textBlock(PHONE ? 10 : 14, y0, VW - (PHONE ? 20 : 28), '체성 신경은 골격근에 명령을 전해요(무릎 반사처럼 의식 없이 일어나는 반사도 있어요). 자율 신경은 교감 신경과 부교감 신경이 같은 기관에 길항 작용을 해요.', PHONE ? 12.5 : 13.5, COL.mut, PHONE ? 18 : 20, 700);
}
PT_TABLE['per:table'] = { down(p) { return S.tab.pl.down(p); }, move(p) { S.tab.pl.move(p); }, up(p) { S.tab.pl.up(p); }, hover(p) { return S.tab.pl.hover(p); } };
$('#bTabReset').addEventListener('click', () => { Sound.click(); S.tab.pl.reset(); });


/* ---------- 읽음 칸 ---------- */
let rlast = '';
function readouts() {
  let L1, L2, L3, a, b, c;
  const key = viewKey();
  if (key === 'map:tree') { const pl = S.map.tree; L1 = '카드'; a = pl.placed + ' / 6 놓음'; L2 = '맞은 칸'; b = (6 - pl.wrongIds().length) + ' / 6'; L3 = '중추 신경계'; c = '뇌 · 척수'; }
  else if (key === 'map:sit') { const pl = S.sit.pl; L1 = '카드'; a = pl.placed + ' / 6 놓음'; L2 = '맞은 칸'; b = (6 - pl.wrongIds().length) + ' / 6'; L3 = '경로 3가지'; c = '대뇌 · 체성 · 자율'; }
  else if (key === 'cer:ex') { const cer = S.cer; L1 = '고른 엽'; a = cer.sel ? LOBE[cer.sel].name : '—'; L2 = '살펴본 엽'; b = Object.keys(cer.seen).length + ' / 4'; L3 = '단면'; c = cer.cutSeen ? '살펴봤어요' : (cer.cut ? '보는 중' : '아직'); }
  else if (key === 'cer:case') { const pl = S.cas.pl; L1 = '증상 카드'; a = pl.placed + ' / 4 놓음'; L2 = '맞은 칸'; b = (4 - pl.wrongIds().length) + ' / 4'; L3 = '가상 사례'; c = '교육용'; }
  else if (key === 'stem:info') { const st = S.stem; L1 = '고른 부위'; a = st.sel ? PARTS[st.sel].name : '—'; L2 = '살펴본 부위'; b = Object.keys(st.seen).length + ' / 5'; L3 = '뇌 줄기'; c = '중간뇌 · 뇌교 · 연수'; }
  else if (key === 'stem:pair') { const pl = S.pair.pl; L1 = '기능 카드'; a = pl.placed + ' / 5 놓음'; L2 = '맞은 칸'; b = (5 - pl.wrongIds().length) + ' / 5'; L3 = '부위'; c = '간뇌 · 중간뇌 · 소뇌 · 연수 · 척수'; }
  else if (key === 'stem:case') { const v = stemCaseVals(); L1 = '고른 사례'; a = v.filter((x) => x).length + ' / 4'; L2 = '맞은 사례'; b = v.filter((x, i) => x === SCASE[i].ans).length + ' / 4'; L3 = '가상 사례'; c = '교육용'; }
  else if (key === 'per:auto') { const p = S.per; L1 = '켜진 신경'; a = p.mode === 'rest' ? '평상시' : p.mode === 'sym' ? '교감 신경' : '부교감 신경'; L2 = '심장 박동(예시)'; b = Math.round(p.bpm) + ' bpm'; L3 = '동공 반응'; c = p.mode === 'rest' ? '보통' : p.mode === 'sym' ? '확대' : '축소'; }
  else { const pl = S.tab.pl; L1 = '카드'; a = pl.placed + ' / 6 놓음'; L2 = '맞은 칸'; b = (6 - pl.wrongIds().length) + ' / 6'; L3 = '비교'; c = '체성 vs 자율'; }
  const k = [L1, a, L2, b, L3, c].join('|');
  if (k === rlast) return; rlast = k;
  l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
}

/* ================= 미션 ================= */
const placerCheck = (pl, n, name, hintBad) => {
  if (!pl.full) return '아직 놓지 않은 카드가 ' + (n - pl.placed) + '개 있어요. ' + n + '칸을 모두 채워 보세요.';
  const bad = pl.wrongIds(); pl.markBad(bad);
  if (bad.length) return '빨간 카드 ' + bad.length + '개가 알맞지 않아요. ' + hintBad;
  return true;
};
const SEL_OK = (id, ans) => { const el = $('#' + id); el.classList.remove('ok', 'bad'); if (el.value === '') return false; const ok = el.value === ans; el.classList.add(ok ? 'ok' : 'bad'); return ok; };

const levels = [
  {
    title: '신경계 지도: 중추와 말초는 어떻게 이어질까?', short: '신경계 지도', icon: '🗺️', phase: '모형',
    intro: '<p class="si-q">❓ 탐구 질문: 생각하고 판단하는 일과 숨 쉬고 심장이 뛰는 일은 뇌의 같은 곳에서 일어날까?</p>' +
      '<div class="si-link">🔗 <b>중학교에서</b> 뉴런의 종류, 중추 신경계와 말초 신경계, 반사를 배웠어요. 이번에는 그 구조를 반복하지 않고 <b>대뇌를 중심으로 한 뇌의 기능</b>과 <b>말초 신경계(체성·자율)의 특징</b>을 비교해요.</div>' +
      '<p>① 신경계 지도 → ② 대뇌 → ③ 뇌 줄기·소뇌 → ④ 말초 신경 순서예요. 먼저 신경계가 어떻게 나뉘는지 지도를 완성해 봐요. 이 화면은 <b>교육용 모형</b>이에요.</p>',
    features: ['map'],
    setup() { resetMap(); setScene('map', 'tree'); },
    recap: '신경계는 뇌와 척수로 된 중추 신경계와, 중추와 온몸을 잇는 말초 신경계(체성·자율)로 나뉘어요.',
    summary: '<ul><li><b>중추 신경계</b>: 뇌 + 척수. 정보를 모으고 판단하며 명령을 내려요.</li><li><b>말초 신경계</b>: 중추와 온몸을 잇는 신경. 체성 신경계와 자율 신경계로 나뉘어요.</li><li><b>체성 신경계</b>: 감각 신경 + 운동 신경. 골격근에 (대부분 의식적인) 명령을 전해요.</li><li><b>자율 신경계</b>: 교감 신경 + 부교감 신경. 내장 기관 · 샘 · 동공을 무의식적으로 조절해요.</li><li>책 읽기 같은 생각과 판단은 <b>대뇌</b>가, 심장 박동 같은 일은 대뇌의 직접 명령 없이 <b>자율 신경</b>이 맡아요.</li></ul>',
    missions: [
      {
        title: '신경계 분류 트리 완성', manual: true,
        goal: '카드를 끌어서 신경계 분류 트리의 6칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '칸의 힌트를 봐요. 뇌와 척수는 중추 신경계에 속하고, 의식적으로 움직이는 쪽이 체성 신경계, 무의식적으로 조절하는 쪽이 자율 신경계예요.',
        setup() { setScene('map', 'tree'); },
        check: () => placerCheck(S.map.tree, 6, '트리', '칸의 힌트(머리뼈 안, 의식적 …)를 다시 읽어 보세요.'),
        status: () => '카드 ' + S.map.tree.placed + ' / 6 · 맞은 칸 ' + (6 - S.map.tree.wrongIds().length) + ' / 6',
        explain: '<b>중추 신경계</b>(뇌 · 척수)와 <b>말초 신경계</b>(체성 · 자율)로 나뉘어요. 말초 신경계는 중추와 몸의 각 부분을 연결해요.',
      },
      {
        title: '상황은 어느 신경 경로?', manual: true,
        goal: '여섯 가지 상황 카드를 <b>대뇌 · 체성 신경 · 자율 신경</b> 상자에 나눠 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '컵을 잡거나 무릎 반사처럼 골격근이 움직이면 체성 신경, 심장 · 소화 · 동공처럼 내장 기관과 눈을 의식 없이 조절하면 자율 신경이에요.',
        setup() { setScene('map', 'sit'); },
        check: () => placerCheck(S.sit.pl, 6, '상황', '상자의 설명(생각, 골격근, 내장·눈)과 비교해 보세요.'),
        status: () => '카드 ' + S.sit.pl.placed + ' / 6 · 맞은 칸 ' + (6 - S.sit.pl.wrongIds().length) + ' / 6',
        explain: '<b>책 읽기</b>는 대뇌, <b>컵 잡기 · 무릎 반사</b>는 체성 신경(골격근), <b>심장 뜀 · 소화 · 동공 축소</b>는 자율 신경이 맡아요. 무릎 반사는 척수가 중추지만 효과기가 골격근이라 체성 신경이에요.',
      },
    ],
  },
  {
    title: '대뇌: 겉질과 네 개의 엽', short: '대뇌', icon: '🧠', phase: '탐구',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생각과 판단은 중추 신경계의 <b>대뇌</b>가 맡는다고 했어요. 3D 모형을 끌어 돌리고 단면도 살펴보며 대뇌의 구조와 기능을 알아봐요.</div>' +
      '<p>대뇌의 바깥은 신경 세포체가 모인 <b>겉질(회색질)</b>, 안쪽은 축삭이 모인 <b>속질(백색질)</b>이에요. 좌우 <b>반구</b>는 <b>뇌량</b>으로 이어져요. 겉질은 <b>전두엽 · 두정엽 · 측두엽 · 후두엽</b>의 4개 엽으로 나누고, 기능으로는 <b>감각 영역 · 운동 영역 · 연합 영역</b>으로 나눠요.</p>',
    features: ['cer'],
    setup() { resetCer(); setScene('cer', 'ex'); },
    recap: '대뇌 겉질은 4개의 엽으로 나뉘고, 감각 영역 · 운동 영역 · 연합 영역에서 정보를 받아들이고 판단해 명령을 내려요.',
    summary: '<ul><li><b>겉질(회색질)</b>: 신경 세포체가 모여 있어 정보를 처리해요. <b>속질(백색질)</b>: 축삭이 모여 있어요. 좌우 반구는 <b>뇌량</b>으로 연결돼요.</li><li><b>전두엽</b>: 판단 · 계획, 운동 명령(운동 영역). <b>두정엽</b>: 피부 감각, 공간 인식. <b>측두엽</b>: 청각, 기억. <b>후두엽</b>: 시각.</li><li>기능 영역: <b>감각 영역</b>(정보를 받음), <b>운동 영역</b>(운동 명령), <b>연합 영역</b>(종합 판단 · 고등 정신 활동).</li><li>대뇌의 한 엽이 손상되면 그 엽이 맡은 기능에 이상이 생길 수 있어요(교육용 가상 사례).</li></ul>',
    missions: [
      {
        title: '대뇌 3D 모형 탐색',
        goal: '모형을 돌려 보며 <b>네 개의 엽을 모두 눌러</b> 기능을 확인하고, <b>✂️ 단면 보기</b>로 겉질과 속질도 살펴보세요.',
        hint: '모형을 끌어서 돌리고 전두엽 · 두정엽 · 측두엽 · 후두엽을 차례로 눌러요. 오른쪽 조작판의 ✂️ 단면 보기를 누르면 잘린 면이 나타나요.',
        setup() { setScene('cer', 'ex'); },
        check: () => LOBES.every((l) => S.cer.seen[l]) && S.cer.cutSeen,
        hold: 0.5,
        status: () => LOBES.map((l) => mark(S.cer.seen[l]) + ' ' + LOBE[l].name).join(' &nbsp; ') + ' &nbsp; ' + mark(S.cer.cutSeen) + ' 단면',
        explain: '네 엽은 <b>전두엽</b>(판단 · 운동 명령), <b>두정엽</b>(피부 감각 · 공간 인식), <b>측두엽</b>(청각 · 기억), <b>후두엽</b>(시각)이에요. 단면에서는 바깥쪽 <b>겉질(회색질)</b>과 안쪽 <b>속질(백색질)</b>, 그리고 좌우 반구를 잇는 <b>뇌량</b>이 보여요.',
      },
      {
        title: '가상 환자의 증상 → 엽', manual: true,
        goal: '증상 카드 4장을 증상과 관련 깊은 <b>엽 칸</b>에 놓고 <b>✔ 확인하기</b>를 누르세요. (교육용 가상 사례)',
        hint: '시각은 후두엽, 판단 · 계획은 전두엽, 청각과 기억은 측두엽, 피부 감각은 두정엽이 맡아요.',
        setup() { setScene('cer', 'case'); },
        check: () => placerCheck(S.cas.pl, 4, '엽', '각 엽이 맡은 기능을 떠올려 보세요.'),
        status: () => '카드 ' + S.cas.pl.placed + ' / 4 · 맞은 칸 ' + (4 - S.cas.pl.wrongIds().length) + ' / 4',
        explain: '한쪽 시야가 안 보이면 <b>후두엽</b>(시각), 계획을 세우기 어려우면 <b>전두엽</b>(판단 · 계획), 소리는 들리는데 말의 뜻을 이해하기 어려우면 <b>측두엽</b>(청각 · 언어 이해), 손의 감각이 둔하면 <b>두정엽</b>(피부 감각)을 의심해 볼 수 있어요.',
      },
      {
        type: 'quiz', title: '겉질에 신경 세포체가 모인 까닭',
        goal: '대뇌 <b>겉질</b>에 신경 세포체가 모여 있는 까닭으로 가장 알맞은 것은?',
        setup() { setScene('cer', 'ex'); },
        choices: ['세포체에서 들어온 신호를 통합하고 판단해 명령을 내리는 정보 처리가 일어나기 때문', '축삭이 모여 신호를 빠르게 멀리 전달하기 때문', '혈액을 저장하는 곳이기 때문', '좌우 반구를 연결하는 다리이기 때문'],
        answer: 0,
        feedback: ['', '축삭이 모인 곳은 속질(백색질)이에요. 겉질은 세포체가 모인 회색질이에요.', '신경 세포체가 모이는 까닭은 정보 처리와 관련이 있어요.', '좌우 반구를 연결하는 것은 뇌량이에요.'],
        explain: '<b>신경 세포체</b>는 신호를 받아 통합 · 판단하는 곳이에요. 그래서 세포체가 모인 겉질이 <b>감각 · 운동 · 연합 영역</b>으로서 정보를 처리하고 판단해요. 축삭이 모인 속질은 신호를 전달하는 통로예요.',
      },
    ],
  },
  {
    title: '뇌 줄기와 소뇌: 대뇌 아래에서 몸을 지켜요', short: '뇌 줄기·소뇌', icon: '🔬', phase: '탐구',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대뇌가 판단과 운동 명령을 맡는다고 했어요. 그런데 숨을 쉬는 일처럼 생각하지 않아도 계속되는 일은 누가 맡을까요? 뇌의 정중 단면에서 <b>간뇌 · 중간뇌 · 소뇌 · 연수</b>와 <b>척수</b>를 간단히 살펴봐요.</div>' +
      '<p>부위를 눌러 하는 일을 읽고, 기능 카드를 짝지은 뒤, 손상 사례에서 어느 부위인지 추론해 봐요. 이 사례는 <b>교육용 가상 사례</b>예요.</p>',
    features: ['stem'],
    setup() { resetStem(); setScene('stem', 'info'); },
    recap: '간뇌는 체온 · 혈당 조절, 중간뇌는 동공 · 눈 운동, 소뇌는 균형, 연수는 심장 박동 · 호흡을 맡고, 척수는 뇌와 몸 사이의 통로예요.',
    summary: '<ul><li><b>간뇌</b>: 시상(감각 신호 중계) + 시상 하부(체온 · 혈당 · 삼투압 조절 중추).</li><li><b>중간뇌</b>: 눈의 움직임, 동공 크기 조절.</li><li><b>소뇌</b>: 몸의 균형, 정교한 근육 운동.</li><li><b>연수</b>: 심장 박동 · 호흡 · 소화 운동 조절, 재채기 · 기침의 중추.</li><li><b>척수</b>: 뇌와 몸 사이의 신호 통로, 무릎 반사의 중추.</li><li>이 부위들은 대뇌의 판단 없이도 생명 활동을 조절해요.</li></ul>',
    missions: [
      {
        title: '부위와 기능 짝짓기', manual: true,
        goal: '기능 카드 5장을 알맞은 <b>부위 칸</b>에 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '앞 화면(ℹ️ 부위 보기)에서 부위를 눌러 하는 일을 다시 읽어 보세요. 간뇌는 체온 · 혈당, 소뇌는 균형, 연수는 호흡 · 심장 박동이에요.',
        setup() { setScene('stem', 'pair'); },
        check: () => placerCheck(S.pair.pl, 5, '부위', '조작판의 ℹ️ 부위 보기에서 기능을 다시 확인해 보세요.'),
        status: () => '카드 ' + S.pair.pl.placed + ' / 5 · 맞은 칸 ' + (5 - S.pair.pl.wrongIds().length) + ' / 5',
        explain: '<b>간뇌</b>: 감각 중계 · 체온 · 혈당 조절 / <b>중간뇌</b>: 눈 운동 · 동공 크기 / <b>소뇌</b>: 균형 · 정교한 근육 운동 / <b>연수</b>: 심장 박동 · 호흡 · 소화 운동 / <b>척수</b>: 뇌와 몸 사이 통로 · 무릎 반사.',
      },
      {
        title: '손상 사례 추론', manual: true,
        goal: '가상 사례 4개에서 <b>손상된 부위</b>를 하나씩 골라 <b>✔ 확인하기</b>를 누르세요.',
        hint: '균형은 소뇌, 호흡과 심장 박동은 연수, 체온 조절은 간뇌, 동공 반사는 중간뇌가 맡아요.',
        setup() { setScene('stem', 'case'); },
        check() {
          const ans = SCASE.map((c) => c.ans), ids = ['selC1', 'selC2', 'selC3', 'selC4'];
          const r = ids.map((id, i) => SEL_OK(id, ans[i]));
          const empty = ids.filter((id) => $('#' + id).value === '').length;
          if (empty) return '아직 고르지 않은 사례가 ' + empty + '개 있어요.';
          if (r.some((x) => !x)) return '틀린 사례가 있어요(빨간 칸). 각 부위가 맡은 기능을 떠올려 보세요.';
          return true;
        },
        status: () => '고른 사례 ' + stemCaseVals().filter((x) => x).length + ' / 4',
        explain: '균형 · 정교한 운동 이상 → <b>소뇌</b>, 호흡 · 심장 박동 이상 → <b>연수</b>, 체온 조절 이상 → <b>간뇌</b>(시상 하부), 동공 반사 이상 → <b>중간뇌</b>를 의심해요. 교육용 추론이며 실제 진단이 아니에요.',
      },
      {
        type: 'quiz', title: '심장 박동 · 호흡의 조절 중추',
        goal: '심장 박동과 호흡을 <b>의식하지 않아도</b> 계속 조절하는 중추는 어디일까요?',
        setup() { setScene('stem', 'info'); },
        choices: ['대뇌 전두엽', '소뇌', '연수', '척수'],
        answer: 2,
        feedback: ['전두엽은 판단 · 계획과 운동 명령을 맡아요. 호흡은 의식하지 않아도 계속돼요.', '소뇌는 몸의 균형과 정교한 근육 운동을 맡아요.', '', '척수는 뇌와 몸 사이의 통로이고 무릎 반사 같은 반사의 중추예요.'],
        explain: '<b>연수</b>가 심장 박동 · 호흡 · 소화 운동을 조절해요. 대뇌의 판단이 없어도 조절되기 때문에, 잠잘 때나 다른 생각을 할 때도 숨을 쉴 수 있어요.',
      },
    ],
  },
  {
    title: '말초 신경: 체성 신경과 자율 신경', short: '말초 신경', icon: '🫀', phase: '분석',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연수와 간뇌 같은 부위가 대뇌의 직접 명령 없이 몸을 조절한다고 했어요. 그 명령을 기관까지 전하는 것이 말초 신경계의 <b>자율 신경</b>이에요.</div>' +
      '<p>같은 기관에 <b>교감 신경</b>과 <b>부교감 신경</b>이 반대로 작용해요(<b>길항 작용</b>). 스위치를 바꿔 가며 동공 · 심장 · 기관지 · 위 · 소장 · 방광의 반응을 비교한 뒤, 체성 신경과 자율 신경의 특징을 표로 정리해 봐요. 수치는 <b>교육용 예시</b>예요.</p>',
    features: ['per'],
    setup() { resetPer(); setScene('per', 'auto'); },
    recap: '교감 신경은 긴장 · 활동에, 부교감 신경은 휴식 · 소화에 알맞게 같은 기관에 반대로 작용해요. 체성 신경은 골격근을 의식적으로 움직여요.',
    summary: '<ul><li><b>체성 신경계</b>: 감각 신경 + 운동 신경. 골격근에 의식적인 명령(대뇌에서 출발)을 전달해요.</li><li><b>자율 신경계</b>: 교감 신경 + 부교감 신경. 내장 기관 · 샘 · 동공에 작용하고, 대뇌의 직접 명령 없이 간뇌 · 연수 등이 조절해요.</li><li><b>교감</b>: 동공 확대, 심장 박동 촉진, 기관지 확장, 소화 운동 억제, 방광 이완.</li><li><b>부교감</b>: 동공 축소, 심장 박동 억제, 기관지 수축, 소화 운동 촉진, 방광 수축.</li><li>두 신경이 같은 기관에 반대로 작용하는 <b>길항 작용</b>으로 몸의 상태를 알맞게 조절해요.</li></ul>',
    missions: [
      {
        title: '교감 · 부교감 스위치 실험',
        goal: '<b>교감 신경</b>과 <b>부교감 신경</b>을 각각 켜서 여섯 기관의 반응이 반대로 바뀌는 것을 확인하세요.',
        hint: '오른쪽 조작판의 평상시 · 교감 신경 · 부교감 신경 버튼을 번갈아 눌러 보세요. 동공 크기와 심장 박동 수가 달라져요.',
        setup() { setScene('per', 'auto'); },
        check: () => !!(S.per.visited.sym && S.per.visited.par),
        hold: 0.6,
        status: () => mark(S.per.visited.sym) + ' 교감 신경 켜 보기 &nbsp; ' + mark(S.per.visited.par) + ' 부교감 신경 켜 보기',
        explain: '교감 신경이 활발하면 <b>동공 확대 · 심장 박동 촉진 · 기관지 확장 · 소화 운동 억제 · 방광 이완</b>, 부교감 신경이 활발하면 <b>동공 축소 · 박동 억제 · 기관지 수축 · 소화 운동 촉진 · 방광 수축</b>이 나타나요. 같은 기관에 반대로 작용하는 <b>길항 작용</b>이에요.',
      },
      {
        title: '체성 신경 vs 자율 신경 비교표', manual: true,
        goal: '카드 6장을 표의 칸에 놓아 <b>체성 신경계와 자율 신경계</b>를 비교하고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '체성 신경은 골격근을 의식적으로 움직이고, 자율 신경은 내장 기관 · 샘 · 동공을 의식 없이 조절해요.',
        setup() { setScene('per', 'table'); },
        check: () => placerCheck(S.tab.pl, 6, '표', '체성 신경은 골격근, 자율 신경은 내장 기관 쪽이라는 점을 떠올려 보세요.'),
        status: () => '카드 ' + S.tab.pl.placed + ' / 6 · 맞은 칸 ' + (6 - S.tab.pl.wrongIds().length) + ' / 6',
        explain: '<b>체성 신경</b>: 의식적(대뇌의 명령), 골격근, 컵 잡기 · 글씨 쓰기. <b>자율 신경</b>: 무의식적(대뇌의 직접 명령 없음), 내장 기관 · 샘 · 동공, 심장 박동 · 소화 운동 조절.',
      },
      {
        type: 'quiz', title: '시험 직전의 긴장과 소화',
        goal: '시험 직전에 긴장해서 <b>심장이 빨리 뛰고 속이 더부룩</b>할 때, 활발한 자율 신경과 소화가 억제되는 까닭은?',
        setup() { setScene('per', 'auto'); },
        choices: ['교감 신경이 활발해요. 긴장 상태에서는 에너지를 활동에 쓰도록 심장 박동은 촉진하고 소화 운동은 억제해요.', '부교감 신경이 활발해요. 휴식 중이어서 소화 운동이 촉진돼요.', '체성 신경이 활발해요. 대뇌가 위의 움직임을 직접 막아요.', '교감 신경과 부교감 신경이 모두 멈춰요.'],
        answer: 0,
        feedback: ['', '부교감 신경은 휴식 · 소화에 알맞게 작용해요. 심장이 빨리 뛰는 긴장 상황은 교감 신경이에요.', '체성 신경은 골격근을 움직여요. 위 같은 내장 기관은 자율 신경이 조절해요.', '두 신경은 평소에도 함께 작용하며 상황에 따라 한쪽이 더 활발해져요.'],
        explain: '긴장하면 <b>교감 신경</b>이 활발해져 심장 박동이 빨라지고 <b>소화 운동은 억제</b>돼요. 소화는 당장 급하지 않으니 몸의 에너지를 근육과 뇌로 돌리는 거예요. 식사 후 쉬면 <b>부교감 신경</b>이 소화를 촉진해요.',
      },
    ],
  },
];

game = SciSim.game({
  simId: 'hb-nervous-system', mount: '#game', badge: '신경계 탐험가', homeHref: '../../index.html#hb',
  featureLabels: { map: '🗺️ 신경계 트리 · 상황 분류', cer: '🧠 3D 대뇌 모형 · 단면 · 환자 사례', stem: '🔬 뇌의 정중 단면 · 짝짓기 · 손상 사례', per: '🫀 자율 신경 스위치 · 비교표' },
  onFeatures() { updateCtl(); },
  levels,
});

/* ---------- 시작 ---------- */
resetMap(); resetCer(); resetStem(); resetPer();
setScene('map', 'tree');
let lastFree = false, lastKey = '';
SciSim.loop((dt, t) => {
  clock = t;
  if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
  const key = viewKey();
  if (key !== lastKey) { lastKey = key; updateCtl(); }
  view.apply();
  if (key === 'map:tree') drawTreeScene(dt);
  else if (key === 'map:sit') drawSitScene(dt);
  else if (key === 'cer:ex') drawCerScene(dt);
  else if (key === 'cer:case') drawCaseScene(dt);
  else if (key === 'stem:info') drawStemInfo(dt);
  else if (key === 'stem:pair') drawStemPair(dt);
  else if (key === 'stem:case') drawStemCase(dt);
  else if (key === 'per:auto') { stepPer(dt); drawPerScene(dt); }
  else { stepPer(dt); drawTabScene(dt); }
  if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,243,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
  readouts();
});

/* ---------- 디버그 (Playwright) ---------- */
function solvePl(pl) {
  pl.chips.forEach((c) => { const t = pl.targets.find((q) => (q.bin !== undefined ? q.bin === c.bin : q.ans === c.id) && !pl.chips.some((o) => o.zone === q.id)); if (t) c.zone = t.id; });
  pl.layout(true); pl.follow();
}
window.__sim = {
  S, VW, VH, PHONE, get game() { return game; }, setScene, solvePl, selectLobe, selectPart, setAuto, resetCer, BM, CER_R, INFO_R, LOBE, PARTS, TR, SG, CASG, PAIRG, TBG, PERG, STEM_LAY,
  hitLobe, stemHit, cutXNow,
  lobeScreen(l) { const cer = S.cer; for (let k = cer.hits.length - 1; k >= 0; k--) { const q = BM.q[cer.hits[k]]; if (q.lobe === l && !q.sub) { let x = 0, y = 0; q.v.forEach((i) => { x += PX[i] / 4; y += PY[i] / 4; }); if (hitLobe({ x, y }) === l) return { x, y }; } } return null; },
};

})();
