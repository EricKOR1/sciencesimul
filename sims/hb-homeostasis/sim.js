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
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 항상성과 되먹임 (단원 6차시)
   성취기준 [12생과02-04] 내분비계와 신경계 작용 원리와 상호작용의 이해를 바탕으로 우리 몸의 항상성이 유지되는 과정을 추론할 수 있다.
   ① 모형: 되먹임  ② 실험: 혈당 조절  ③ 탐구: 체온 · 삼투압  ④ 적용: 스마트 헬스케어 (모든 수치는 교육용 가상 자료)
   ========================================================= */
const COL = { neu: '#2563eb', hor: '#f59e0b', horD: '#b45309', ink: '#26324a', mut: '#5a6679', off: '#e2464b', on: '#16a34a' };
const S = { mode: 'fb', fbSub: 'exp', smtSub: 'log', fade: 0, fb: null, pair: null, glu: null, tmp: null, smt: null, exp: null };
let game = null;
const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
const SCENES = { fb: '🔁 되먹임', glu: '🍬 혈당 조절', tmp: '🌡️ 체온·삼투압', smt: '⌚ 스마트 헬스케어' };
const PT_TABLE = {};
const viewKey = () => (S.mode === 'fb' ? 'fb:' + S.fbSub : S.mode === 'smt' ? 'smt:' + S.smtSub : S.mode);
function setScene(mode, sub) {
  const old = viewKey();
  if (sub && mode === 'fb') S.fbSub = sub; if (sub && mode === 'smt') S.smtSub = sub;
  S.mode = mode;
  if (viewKey() !== old) { S.fade = 1; parts.clear(); }
  $('#tbLabel').textContent = SCENES[mode]; PT = PT_TABLE[viewKey()] || null; updateCtl();
}
function updateCtl() {
  const key = viewKey();
  $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(key) < 0; });
  $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  setOn('#subFb', 'data-sub', S.fbSub); setOn('#subSmt', 'data-sub', S.smtSub);
  if (S.fb) { setOn('#fbSeg', 'data-f', S.fb.fb ? 'on' : 'off'); $('#bDist').disabled = !!S.fb.run.active; }
  if (S.glu) { $$('#gluScen button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.glu.scen)); setOn('#gluDis', 'data-d', S.glu.dis); $('#bGluPlay').disabled = !!S.glu.run; $$('#gluDis button').forEach((b) => { b.disabled = S.glu.scen === 'ex'; }); }
  { const ed = $('#expDesign'); if (ed) ed.hidden = !(S.exp && S.exp.q) || key !== 'smt:exp'; }
  if (S.tmp) $$('#tmpScen button').forEach((b) => { b.classList.toggle('on', +b.dataset.s === S.tmp.cur); b.classList.toggle('done', S.tmp.ro[+b.dataset.s].solved); });
}
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
bindSeg('#subFb', 'data-sub', (s) => setScene('fb', s));
bindSeg('#subSmt', 'data-sub', (s) => setScene('smt', s));

/* ============ ① 되먹임: 방과 몸의 온도 조절 ============ */
const FBP = {
  room: { name: '방', icon: '🏠', set: 22, a0: 12, a1: 2, lo: 10, hi: 24, unit: '°C', fmt: (v) => v.toFixed(1) },
  body: { name: '몸', icon: '🧍', set: 37, a0: 25, a1: 10, lo: 30, hi: 38, unit: '°C', fmt: (v) => v.toFixed(1) },
};
const FK = 0.0024, FG = 0.3, FPMAX = 0.2, FRATE = 20, FEND = 120;     // k(1/분), 되먹임 세기, 최대 열 발생, 화면 1초 = 20분
const fbP0 = (p) => FK * (p.set - p.a0);
function resetFb(keepCurves) {
  const old = S.fb;
  S.fb = { fb: true, run: { active: false, t: 0, fb: true }, room: { T: FBP.room.set, P: fbP0(FBP.room) }, body: { T: FBP.body.set, P: fbP0(FBP.body) }, curves: keepCurves && old ? old.curves : { room: { on: null, off: null }, body: { on: null, off: null } }, done: keepCurves && old ? old.done : { on: false, off: false }, dist: false, cur: { room: [], body: [] } };
}
function setFbMode(on) {
  const f = S.fb; if (f.fb === on) return; Sound.click();
  f.fb = on; cancelFbRun(); updateCtl();
}
function cancelFbRun() {      // 진행 중인 실험을 취소하고 처음 상태로
  const f = S.fb; f.run.active = false; f.run.t = 0; f.dist = false; f.cur = { room: [], body: [] };
  ['room', 'body'].forEach((k) => { f[k].T = FBP[k].set; f[k].P = fbP0(FBP[k]); });
}
function startDist() {
  const f = S.fb; if (f.run.active) return;
  cancelFbRun(); f.run.active = true; f.run.t = 0; f.run.fb = f.fb; f.dist = true; f.cur.room.push(FBP.room.set); f.cur.body.push(FBP.body.set); Sound.tick(); updateCtl();
}
bindSeg('#fbSeg', 'data-f', (v) => setFbMode(v === 'on'));
$('#bDist').addEventListener('click', startDist);
$('#bFbReset').addEventListener('click', () => { Sound.click(); resetFb(false); updateCtl(); });
function stepFb(dt) {
  const f = S.fb, r = f.run;
  if (!r.active) return;
  let rem = dt * FRATE;
  while (rem > 1e-9) {
    const h = Math.min(0.5, rem); rem -= h;
    ['room', 'body'].forEach((k) => {
      const p = FBP[k], o = f[k], P0 = fbP0(p);
      const P = r.fb ? clamp(P0 + FG * (p.set - o.T), 0, FPMAX) : P0;
      o.P = P; o.T += h * (-FK * (o.T - p.a1) + P);
    });
    const prev = Math.floor(r.t); r.t += h;
    if (Math.floor(r.t) > prev) { f.cur.room[Math.floor(r.t)] = f.room.T; f.cur.body[Math.floor(r.t)] = f.body.T; }
    if (r.t >= FEND) { r.t = FEND; break; }
  }
  if (r.t >= FEND) {
    r.active = false; const key = r.fb ? 'on' : 'off';
    f.curves.room[key] = f.cur.room.slice(); f.curves.body[key] = f.cur.body.slice(); f.done[key] = true;
    Sound.success(); updateCtl();
  }
}
/* 한 칸 (방/몸) */
const FBG = PHONE
  ? { panel: (k) => ({ x: 8, y: k === 'room' ? 8 : 320, w: 464, h: 304 }), ill: (r) => ({ x: r.x + 6, y: r.y + 34, w: 226, h: r.h - 40 }), gr: (r) => ({ x: r.x + 238, y: r.y + 34, w: 220, h: r.h - 40 }) }
  : { panel: (k) => ({ x: k === 'room' ? 14 : 406, y: 14, w: 380, h: 532 }), ill: (r) => ({ x: r.x + 8, y: r.y + 38, w: r.w - 16, h: 232 }), gr: (r) => ({ x: r.x + 8, y: r.y + 282, w: r.w - 16, h: r.h - 290 }) };
function drawFbPanel(kind, dt) {
  const p = FBP[kind], f = S.fb, R = FBG.panel(kind), I = FBG.ill(R), G = FBG.gr(R), o = f[kind];
  panel(R.x, R.y, R.w, R.h, 16);
  T(R.x + 14, R.y + 24, p.icon + ' ' + p.name + (kind === 'room' ? ' · 온도 조절 장치' : ' · 체온 조절'), PHONE ? 14 : 15.5, COL.ink, 'left', 800);
  const dist = f.dist, cold = dist ? 1 : 0;
  // 찬 바람
  if (dist && !RM) { for (let a = 0; a < 3; a++) { const ff = ((clock * 0.6 + a / 3) % 1); const xx = I.x + 6 + ff * 30, yy = I.y + 6 + a * 8; ctx.globalAlpha = 1 - ff; T(xx, yy + 8, '❄️', PHONE ? 14 : 18, '#000', 'left', 600); ctx.globalAlpha = 1; } }
  T(I.x + (PHONE ? 6 : 8), I.y + (PHONE ? 38 : 40), dist ? (kind === 'room' ? '창문을 열어 찬 바람(바깥 ' + p.a1 + ' °C)' : '추운 곳 (' + p.a1 + ' °C)') : (kind === 'room' ? '바깥 ' + p.a0 + ' °C (평소)' : '주변 ' + p.a0 + ' °C (평소)'), PHONE ? 11.5 : 13, dist ? '#1d4ed8' : COL.mut, 'left', 800);
  // 세 상자
  const names = kind === 'room' ? [['🌡️', '온도 센서', '센서'], ['🎛️', '제어기', '설정값과 비교'], ['♨️', '난방기', '열을 내요']] : [['🧑', '온도 수용기', '감지'], ['🧠', '시상 하부', '조절 중추'], ['💪', '근육 · 피부 혈관', '효과기']];
  const gap = PHONE ? 16 : 22, bw = (I.w - gap * 2) / 3, bh = PHONE ? 76 : 86, by = I.y + (PHONE ? 54 : 58);
  const pw = clamp((o.P - fbP0(p)) / (FPMAX - fbP0(p)), 0, 1), power = f.dist ? (f.run.fb ? pw : 0) : 0;
  names.forEach((n, i) => {
    const bx = I.x + i * (bw + gap);
    const col = i === 2 ? '#dc2626' : i === 1 ? '#7c3aed' : '#0d9488';
    if (i === 2 && power > 0.03) D.glow(bx + bw / 2, by + bh / 2, bw * (0.6 + power * 0.5), kind === 'room' ? '#f97316' : '#ef4444', 0.25 + 0.4 * power);
    D.shadow(() => { D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = col; ctx.lineWidth = 2.4; D.roundRect(bx, by, bw, bh, 12); ctx.stroke();
    const shake = i === 2 && kind === 'body' && power > 0.2 && !RM ? Math.sin(clock * 50) * 2.2 * power : 0;
    T(bx + bw / 2 + shake, by + (PHONE ? 30 : 34), n[0], PHONE ? 24 : 28, '#000', 'center', 600);
    TF(bx + bw / 2, by + (PHONE ? 50 : 56), n[1], bw - 6, PHONE ? 11.5 : 13, 9.5, col, 'center', 800);
    TF(bx + bw / 2, by + (PHONE ? 66 : 74), n[2], bw - 6, PHONE ? 10.5 : 11.5, 9, COL.mut, 'center', 700);
  });
  // 연결선과 신호
  for (let i = 0; i < 2; i++) {
    const x0 = I.x + i * (bw + gap) + bw, x1 = x0 + gap, yy = by + bh / 2;
    const cut = i === 1 && !f.fb;
    if (cut) { ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = '#b0b9c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 1, yy); ctx.lineTo(x1 - 1, yy); ctx.stroke(); ctx.restore(); T((x0 + x1) / 2, yy - 6, '✕', 14, COL.off, 'center', 900); }
    else { D.arrow(x0 + 1, yy, x1 - 1, yy, { color: i === 0 ? '#0d9488' : '#7c3aed', width: 3, head: 7 }); if (dist && !RM && (i === 0 || f.fb)) { const ff = (clock * 1.2 + i * 0.4) % 1; D.sphere(lerp(x0, x1, ff), yy, 3.4, '#ffd447', { gloss: false }); } }
  }
  T(I.x + I.w / 2, by + bh + 18, f.fb ? '결과가 원인을 줄여요 (음성 되먹임)' : '되먹임이 꺼져 있어요', PHONE ? 11.5 : 13, f.fb ? '#166534' : COL.off, 'center', 800);
  // 온도 게이지 (가로)
  const gy = by + bh + (PHONE ? 52 : 62), gx = I.x + 6, gw = I.w - 12;
  const X = (v) => gx + (v - p.lo) / (p.hi - p.lo) * gw;
  D.roundRect(gx, gy, gw, 14, 7); const gr = ctx.createLinearGradient(gx, 0, gx + gw, 0); gr.addColorStop(0, '#93c5fd'); gr.addColorStop(0.5, '#fde68a'); gr.addColorStop(1, '#fca5a5'); ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(34,197,94,.35)'; ctx.fillRect(X(p.set - 0.4 * (p.hi - p.lo) / 8), gy - 4, 0.8 * (p.hi - p.lo) / 8 / (p.hi - p.lo) * gw, 22);
  ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(p.set), gy - 8); ctx.lineTo(X(p.set), gy + 22); ctx.stroke();
  T(X(p.set), gy - 12, '설정값 ' + p.set + ' °C', PHONE ? 11 : 12, '#166534', 'center', 800);
  const cx = X(clamp(o.T, p.lo, p.hi)); D.sphere(cx, gy + 7, 9, '#ef4444', { gloss: true }); T(cx, gy + 38, p.fmt(o.T) + ' °C', PHONE ? 13.5 : 15.5, COL.ink, 'center', 800);
  // 그래프
  const A = makeAxes({ x: G.x + (PHONE ? 38 : 46), y: G.y + 22, w: G.w - (PHONE ? 46 : 58), h: G.h - (PHONE ? 62 : 70) }, [0, FEND], [p.lo, p.hi]);
  drawAxes(A, { xt: [0, 30, 60, 90, 120], yt: kind === 'room' ? [10, 14, 18, 22] : [30, 32, 34, 36, 38], xl: '시간 (분, 빨리 감기)', yl: '온도 (°C)', tickY: A.r.y + A.r.h + 15, xlY: A.r.y + A.r.h + 32, ylx: PHONE ? 30 : 38, fs: PHONE ? 11 : 12 });
  hline(A, p.set, '#16a34a', '설정값', { lx: A.r.x + A.r.w - 4, dy: -4, fs: 11.5 });
  const draw = (arr, col, w, dash) => { if (!arr || arr.length < 2) return; ctx.save(); ctx.beginPath(); ctx.rect(A.r.x, A.r.y, A.r.w, A.r.h); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath(); arr.forEach((v, i) => { const x = A.X(i), y = A.Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); };
  draw(f.curves[kind].off, COL.off, 3, f.run.active || true ? null : null); draw(f.curves[kind].on, COL.on, 3);
  if (f.run.active) { draw(f.cur[kind], f.run.fb ? COL.on : COL.off, 4.5); const n = f.cur[kind].length - 1; if (n >= 0) D.sphere(A.X(n), A.Y(o.T), 5.5, '#ffb400', { gloss: true }); }
  if (f.curves[kind].off) D.label(A.r.x + 8, A.r.y + A.r.h - 12, '● OFF', { bg: COL.off, size: 11.5, align: 'left' });
  if (f.curves[kind].on) D.label(A.r.x + 62, A.r.y + A.r.h - 12, '● ON', { bg: COL.on, size: 11.5, align: 'left' });
  T(G.x + 4, G.y + 12, '체온 변화 그래프' .replace('체온', kind === 'room' ? '실내 온도' : '체온'), PHONE ? 12 : 13, COL.ink, 'left', 800);
}
function drawFbScene(dt) {
  bgFill('#eef3fb', '#f7f9fd');
  drawFbPanel('room', dt); drawFbPanel('body', dt);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE['fb:exp'] = {};

/* 구성 짝짓기 */
const PRG = PHONE
  ? { row: (i) => ({ x: 8, y: 70 + i * 100, w: 150, h: 76 }), slot: (i) => ({ x: 176, y: 74 + i * 100, w: 296, h: 68 }), tray: (i) => ({ x: 8 + (i % 1) * 0, y: 382 + i * 60 }), cw: 464, ch: 50 }
  : { row: (i) => ({ x: 14, y: 80 + i * 96, w: 250, h: 78 }), slot: (i) => ({ x: 330, y: 84 + i * 96, w: 440, h: 70 }), tray: (i) => ({ x: 14 + i * 258, y: 420 }), cw: 250, ch: 64 };
const PAIR_ROWS = [
  { id: 'sens', icon: '🌡️', name: '온도 센서', desc: '방의 온도를 재요', ans: 'recv' },
  { id: 'ctrl', icon: '🎛️', name: '제어기', desc: '설정값과 비교해 명령해요', ans: 'center' },
  { id: 'heat', icon: '♨️', name: '난방기', desc: '열을 내어 온도를 올려요', ans: 'effector' },
];
function newPair() {
  const targets = PAIR_ROWS.map((r, i) => { const s = PRG.slot(i); return { id: 'r' + r.id, x: s.x, y: s.y, w: s.w, h: s.h, ans: r.ans }; });
  const chips = [['effector', '💪', '근육 · 피부 혈관 · 땀샘', '효과기'], ['recv', '🧑', '피부 · 시상 하부의 온도 수용기', '감지'], ['center', '🧠', '시상 하부', '조절 중추']].map((c) => ({ id: c[0], label: c[2], icon: c[1], col: '#4b6b8a' }));
  return new Placer({ chips, targets, tray: PRG.tray, cw: PRG.cw, ch: PRG.ch, onChange() {} });
}
$('#bPairReset').addEventListener('click', () => { Sound.click(); S.pair.pl.reset(); });
function drawPairScene(dt) {
  const pl = S.pair.pl;
  bgFill('#eaf6f1', '#f7fbf9');
  T(PHONE ? 10 : 20, PHONE ? 28 : 36, '🏠 방의 장치 ↔ 🧍 몸의 구성', PHONE ? 15 : 18, COL.ink, 'left', 800);
  T(PHONE ? 12 : 20, PHONE ? 52 : 62, '같은 역할을 하는 몸의 구성 카드를 오른쪽 칸에 놓아요', PHONE ? 12.5 : 14, COL.mut, 'left', 800);
  PAIR_ROWS.forEach((r, i) => {
    const b = PRG.row(i), s = PRG.slot(i);
    D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    T(b.x + 12 + 14, b.y + b.h / 2 + 10, r.icon, PHONE ? 26 : 30, '#000', 'center', 600);
    TF(b.x + 46, b.y + b.h / 2 - 4, r.name, b.w - 52, PHONE ? 14 : 16, 11, COL.ink, 'left', 800);
    textBlock(b.x + 46, b.y + b.h / 2 + 15, b.w - 52, r.desc, PHONE ? 11 : 12, COL.mut, PHONE ? 14 : 15, 700);
    D.arrow(b.x + b.w + 6, b.y + b.h / 2, s.x - 6, b.y + b.h / 2, { color: '#94a3b8', width: 3, head: 8, dash: [5, 4] });
  });
  pl.drawTargets({ col: '#9fb3a6' });
  const ty = PRG.tray(0).y - 10;
  T(PHONE ? 10 : 14, ty, pl.placed < 3 ? '👇 몸의 구성 카드를 끌어서 알맞은 칸에 놓아요' : '✨ 모두 놓았어요! ✔ 확인하기를 눌러요', PHONE ? 12.5 : 14, pl.placed < 3 ? COL.mut : '#166534', 'left', 800);
  pl.follow(); pl.update(dt); pl.drawChips();
  const y0 = PHONE ? 570 : 500;
  textBlock(PHONE ? 10 : 14, y0, VW - (PHONE ? 20 : 28), '감지 → 조절 중추 → 효과기로 이어져 결과가 처음 변화를 줄이는 조절이 되먹임이에요.', PHONE ? 12.5 : 14, COL.mut, PHONE ? 18 : 21, 700);
}
PT_TABLE['fb:pair'] = { down(p) { return S.pair.pl.down(p); }, move(p) { S.pair.pl.move(p); }, up(p) { S.pair.pl.up(p); }, hover(p) { return S.pair.pl.hover(p); } };

/* ============ ② 혈당 조절 ============ */
function pchip(X, Y) {
  const n = X.length, h = [], d = [], m = [];
  for (let i = 0; i < n - 1; i++) { h[i] = X[i + 1] - X[i]; d[i] = (Y[i + 1] - Y[i]) / h[i]; }
  m[0] = 0; m[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  return (x) => {
    if (x <= X[0]) return Y[0]; if (x >= X[n - 1]) return Y[n - 1];
    let i = 0; while (i < n - 2 && x > X[i + 1]) i++;
    const t = (x - X[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * Y[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * Y[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
const GLU = {
  'meal-n': { name: '식사 · 정상', col: '#16a34a', X: [0, 30, 60, 120, 180], Y: [90, 125, 140, 100, 90] },
  'meal-d': { name: '식사 · 인슐린 작용 장애', col: '#e2464b', X: [0, 30, 60, 120, 180], Y: [110, 190, 240, 200, 170] },
  'ex': { name: '운동(예시)', col: '#2563eb', X: [0, 20, 40, 70, 100, 180], Y: [90, 80, 70, 82, 90, 90] },
};
Object.keys(GLU).forEach((k) => { GLU[k].f = pchip(GLU[k].X, GLU[k].Y); });
const GSET = 90, GRATE = 20;            // 화면 1초 = 20분
const gluKey = () => (S.glu.scen === 'ex' ? 'ex' : 'meal-' + S.glu.dis);
function resetGlu() { S.glu = { scen: 'meal', dis: 'n', run: false, t: 0, done: {} }; }
const gluVal = (key, t) => GLU[key].f(t);
function setGluScen(s) { const g = S.glu; if (g.scen === s) return; Sound.click(); g.scen = s; stopGlu(); updateCtl(); }
function setGluDis(d) { const g = S.glu; if (g.dis === d || g.scen === 'ex') return; Sound.click(); g.dis = d; stopGlu(); updateCtl(); }
function stopGlu() { const g = S.glu; g.run = false; g.t = g.done[gluKey()] ? 180 : 0; updateCtl(); }
bindSeg('#gluScen', 'data-s', setGluScen); bindSeg('#gluDis', 'data-d', setGluDis);
$('#bGluPlay').addEventListener('click', () => { const g = S.glu; if (g.run) return; Sound.tick(); g.run = true; g.t = 0; updateCtl(); });
$('#bGluClear').addEventListener('click', () => { Sound.click(); S.glu.done = {}; S.glu.run = false; S.glu.t = 0; updateCtl(); });
function stepGlu(dt) {
  const g = S.glu; if (!g.run) return;
  g.t = Math.min(180, g.t + dt * GRATE);
  if (g.t >= 180) { g.run = false; g.done[gluKey()] = true; Sound.success(); updateCtl(); }
}
const GG = PHONE
  ? { lane: (i) => ({ y: 50 + i * 80, h: 64 }), nodeX: (k) => 8 + k * 118, nodeW: 108, P: { x: 8, y: 222, w: 464, h: 410 }, plot: { x: 58, y: 250, w: 396, h: 262 } }
  : { lane: (i) => ({ y: 64 + i * 82, h: 66 }), nodeX: (k) => 14 + k * 208, nodeW: 148, P: { x: 14, y: 226, w: 772, h: 322 }, plot: { x: 86, y: 254, w: 676, h: 202 } };
function drawGluScene(dt) {
  const g = S.glu, key = gluKey(), tt = g.t, v = gluVal(key, tt), dev = v - GSET;
  const hi = clamp(dev / 50, 0, 1), lo = clamp(-dev / 14, 0, 1), dis = key === 'meal-d';
  bgFill('#fff7ee', '#fbfaf7');
  T(PHONE ? 10 : 18, PHONE ? 20 : 28, '🍬 혈당은 두 경로(↑ ↓)로 설정값 근처에 유지돼요', PHONE ? 13.5 : 16.5, COL.ink, 'left', 800);
  // 경로 두 줄
  const lanes = [
    { t: '혈당이 높을 때', act: hi, nodes: [['혈당 높음 감지', '이자(이자섬)'], ['인슐린 ↑', '호르몬 (주황)'], ['간 · 근육', dis ? '흡수 ✕ (반응 저하)' : '포도당 흡수 · 저장'], ['혈당 ↓', '설정값으로']], kinds: ['sens', 'hor', 'eff', 'res'] },
    { t: '혈당이 낮을 때', act: lo, nodes: [['혈당 낮음 감지', '이자 · 시상 하부'], ['글루카곤↑ · 교감 신경↑', '호르몬 + 신경'], ['간', '글리코젠 분해'], ['혈당 ↑', '설정값으로']], kinds: ['sens', 'both', 'eff', 'res'] },
  ];
  lanes.forEach((ln, li) => {
    const L = GG.lane(li), a = ln.act;
    T(GG.nodeX(0), L.y - 4, ln.t, PHONE ? 11.5 : 13, a > 0.05 ? '#9a3412' : '#a0abbb', 'left', 800);
    ln.nodes.forEach((nd, k) => {
      const x = GG.nodeX(k), w = GG.nodeW, kind = ln.kinds[k];
      const on = a > 0.05 || (li === 0 && v > GSET - 1 && false);
      const bc = kind === 'hor' ? '#f59e0b' : kind === 'both' ? '#f59e0b' : kind === 'eff' ? '#0d9488' : kind === 'res' ? '#16a34a' : '#7c3aed';
      ctx.globalAlpha = on ? 1 : 0.55;
      D.shadow(() => { D.roundRect(x, L.y, w, L.h, 12); ctx.fillStyle = kind === 'both' ? '#fff' : '#fff'; ctx.fill(); }, { blur: on ? 7 : 3, y: 2 });
      ctx.strokeStyle = (dis && li === 0 && k === 2) ? '#e2464b' : bc; ctx.lineWidth = on ? 3 : 2; D.roundRect(x, L.y, w, L.h, 12); ctx.stroke();
      if (kind === 'both') { ctx.fillStyle = 'rgba(37,99,235,.14)'; D.roundRect(x + w / 2, L.y + 1.5, w / 2 - 1.5, L.h - 3, 10); ctx.fill(); }
      const ls1 = wrap(nd[0], w - 12, PHONE ? 11.5 : 13.5, 800); ls1.slice(0, 2).forEach((l, j) => T(x + w / 2, L.y + 20 + j * (PHONE ? 14 : 16), l, PHONE ? 11.5 : 13.5, COL.ink, 'center', 800));
      const ls2 = wrap(nd[1], w - 12, PHONE ? 10.5 : 11.5, 700); ls2.slice(0, 2).forEach((l, j) => T(x + w / 2, L.y + L.h - 22 + j * (PHONE ? 12 : 13) + (ls1.length > 1 ? 4 : 0) - (ls2.length > 1 ? 6 : 0), l, PHONE ? 10.5 : 11.5, dis && li === 0 && k === 2 ? COL.off : COL.mut, 'center', 700));
      ctx.globalAlpha = 1;
      if (k < 3) {
        const x0 = x + w + 3, x1 = GG.nodeX(k + 1) - 3, yy = L.y + L.h / 2, lw = 2 + 5 * a;
        D.arrow(x0, yy, x1, yy, { color: a > 0.05 ? (k === 1 && li === 1 ? '#f59e0b' : '#f59e0b') : '#c6d0de', width: lw, head: 7 + a * 3, dash: (dis && li === 0 && k === 2) ? [4, 3] : null });
        if (a > 0.05 && !RM) { const ff = (clock * (0.5 + a) + k * 0.3) % 1; D.sphere(lerp(x0, x1, ff), yy, 3.4 + a * 2, '#ffe27a', { gloss: false }); }
      }
    });
  });
  // 혈당 그래프
  const P = GG.P, pl = GG.plot, A = makeAxes(pl, [0, 180], [60, 260]);
  panel(P.x, P.y, P.w, P.h, 16);
  T(P.x + 14, P.y + 20, '🩸 혈당 (mg/dL, 교육용 가상 곡선)', PHONE ? 12.5 : 14.5, COL.ink, 'left', 800);
  drawAxes(A, { xt: [0, 30, 60, 90, 120, 150, 180], yt: [60, 90, 120, 160, 200, 240], xl: '시간 (분)', yl: '혈당 (mg/dL)', tickY: pl.y + pl.h + 16, xlY: pl.y + pl.h + 34, ylx: PHONE ? 38 : 50, fs: 12.5 });
  ctx.fillStyle = 'rgba(34,197,94,.16)'; ctx.fillRect(pl.x + 1, A.Y(100), pl.w - 2, A.Y(80) - A.Y(100));
  hline(A, GSET, '#16a34a', '설정값 약 90', { lx: pl.x + pl.w - 6, dy: -5, fs: 12.5 });
  Object.keys(GLU).forEach((k) => {
    if (!g.done[k] && !(k === key && (g.run || g.t > 0))) return;
    const isCur = k === key, upto = isCur ? g.t : 180, c = GLU[k];
    ctx.save(); ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip(); ctx.strokeStyle = c.col; ctx.lineWidth = isCur ? 4.2 : 2.6; ctx.globalAlpha = isCur ? 1 : 0.55; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let t = 0; t <= upto + 1e-6; t += 1) { const x = A.X(t), y = A.Y(c.f(t)); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
    if (c.X) c.X.forEach((tx, i) => { if (tx <= upto + 1e-6) { ctx.fillStyle = '#fff'; ctx.strokeStyle = c.col; ctx.lineWidth = 2; ctx.globalAlpha = isCur ? 1 : 0.6; ctx.beginPath(); ctx.arc(A.X(tx), A.Y(c.Y[i]), 4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; } });
  });
  const ccx = A.X(tt), ccy = A.Y(v);
  if (g.run || g.t > 0) { ctx.save(); ctx.strokeStyle = 'rgba(255,180,0,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ccx, pl.y); ctx.lineTo(ccx, pl.y + pl.h); ctx.stroke(); ctx.restore(); D.sphere(ccx, ccy, 6.5, '#ffb400', { gloss: true }); }
  else T(pl.x + pl.w / 2, pl.y + pl.h / 2, '▶ 3시간 재생을 눌러 보세요', 16, '#8795a8', 'center', 800);
  // 범례
  let lx = pl.x + 10; const ly = pl.y + 14;
  Object.keys(GLU).forEach((k) => { if (!g.done[k] && k !== key) return; const lb = D.label(lx, ly, '● ' + GLU[k].name, { bg: GLU[k].col, size: PHONE ? 11 : 12.5, align: 'left' }); lx += lb.w + 6; });
  // 지금 값
  const msg = !g.run && g.t === 0 ? '' : dev > 8 ? '혈당이 설정값보다 높아요 → 인슐린 ↑' + (dis ? ' (그런데 세포가 잘 반응하지 않아요)' : '') : dev < -6 ? '혈당이 설정값보다 낮아요 → 글루카곤 · 교감 신경 ↑' : '혈당이 설정값 근처예요';
  if (msg) textBlock(P.x + 14, P.y + P.h - (PHONE ? 50 : 22), P.w - 28, msg, PHONE ? 12.5 : 14, dev > 8 ? '#9a3412' : dev < -6 ? '#1d4ed8' : '#166534', PHONE ? 17 : 20, 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE.glu = {};


/* ============ ③ 체온 · 삼투압: 경로 카드 ============ */
const TSC = [
  { name: '🥶 추움', kind: 'temp', cards: ['기온이 낮아져 체온이 내려감', '피부 · 시상 하부가 낮은 온도 감지', '시상 하부가 열 발생 증가 명령', '교감 신경 + 갑상샘 호르몬', '열 발생↑ 열 방출↓ → 체온 회복'],
    cap: ['체온이 설정값(약 37 °C)보다 내려가요.', '온도 수용기가 신호를 시상 하부로 보내요.', '시상 하부가 체온 조절 중추로서 명령해요.', '교감 신경: 피부 혈관 수축 · 근육 떨림 / 호르몬: 물질대사 촉진', '열을 더 만들고 덜 잃어 체온이 회복돼요.'], tags: ['변화', '감지', '시상 하부', 'nh', '반응'],
    tgt: { vessel: 5, sweat: 0, shiver: 1, osm: 0.5, adh: 0.4, reabs: 0.5, urV: 0.5, urC: 0.5 } },
  { name: '🥵 더움', kind: 'temp', cards: ['기온이 올라 체온이 올라감', '피부 · 시상 하부가 높은 온도 감지', '시상 하부가 열 방출 증가 명령', '자율 신경: 혈관 확장 · 땀 분비↑', '열 방출↑ → 체온 회복'],
    cap: ['체온이 설정값(약 37 °C)보다 올라가요.', '온도 수용기가 신호를 시상 하부로 보내요.', '시상 하부가 열을 내보내라고 명령해요.', '자율 신경이 피부 혈관을 확장하고 땀 분비를 늘려요.', '땀이 증발하며 열이 방출돼 체온이 회복돼요.'], tags: ['변화', '감지', '시상 하부', 'n', '반응'],
    tgt: { vessel: 20, sweat: 1, shiver: 0, osm: 0.5, adh: 0.4, reabs: 0.5, urV: 0.5, urC: 0.5 } },
  { name: '💦 땀 많이 흘림', kind: 'osm', cards: ['땀을 많이 흘려 혈장 삼투압↑', '시상 하부가 삼투압 상승 감지', '뇌하수체 후엽: 항이뇨 호르몬(ADH)↑', '콩팥에서 물 재흡수↑', '오줌 양↓ · 농도↑ → 삼투압 회복'],
    cap: ['수분이 줄어 혈장 삼투압이 높아져요.', '시상 하부가 감지하고 갈증도 느껴요(신경 경로).', '뇌하수체 후엽에서 항이뇨 호르몬이 더 분비돼요.', '콩팥에서 물이 더 많이 혈액으로 되돌아가요.', '오줌은 적고 진해지며 삼투압이 내려가요.'], tags: ['변화', '감지', '시상 하부', 'h', '반응'],
    tgt: { vessel: 12, sweat: 0.1, shiver: 0, osm: 1, adh: 1, reabs: 1, urV: 0.2, urC: 1 } },
  { name: '🥤 물 많이 마심', kind: 'osm', cards: ['물을 많이 마셔 혈장 삼투압↓', '시상 하부가 삼투압 하강 감지', '뇌하수체 후엽: 항이뇨 호르몬(ADH)↓', '콩팥에서 물 재흡수↓', '오줌 양↑ · 농도↓ → 삼투압 회복'],
    cap: ['수분이 늘어 혈장 삼투압이 낮아져요.', '시상 하부가 삼투압 하강을 감지해요.', '뇌하수체 후엽에서 항이뇨 호르몬이 덜 분비돼요.', '콩팥에서 물이 덜 되돌아가요.', '오줌은 많고 묽어지며 삼투압이 올라가요.'], tags: ['변화', '감지', '시상 하부', 'h', '반응'],
    tgt: { vessel: 12, sweat: 0.1, shiver: 0, osm: 0, adh: 0, reabs: 0.15, urV: 1, urC: 0 } },
];
const TNORM = { vessel: 12, sweat: 0.1, shiver: 0, osm: 0.5, adh: 0.4, reabs: 0.5, urV: 0.5, urC: 0.5 };
const TGG = PHONE
  ? { cw: 440, ch: 46, slot: (i) => ({ x: 28, y: 262 + i * 54 }), Z: { x: 8, y: 8, w: 464, h: 226 } }
  : { cw: 148, ch: 100, slot: (i) => ({ x: 14 + i * 156, y: 338 }), Z: { x: 14, y: 14, w: 772, h: 268 } };
function shuffleRo(ro) {
  const n = ro.n; for (let k = 0; k < 30 && (ro.solved || k < 2); k++) { const i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n); const t = ro.order[i]; ro.order[i] = ro.order[j]; ro.order[j] = t; }
  if (ro.solved) { const t = ro.order[0]; ro.order[0] = ro.order[1]; ro.order[1] = t; }
  ro.snap(true);
}
function newRo(ci) {
  const items = TSC[ci].cards.map((t, i) => ({ id: 's' + i, label: t, col: '#4b6b8a' }));
  const ro = new Reorder({ items, slots: [0, 1, 2, 3, 4].map((i) => TGG.slot(i)), cw: TGG.cw, ch: TGG.ch, solution: items.map((x) => x.id), onChange() { updateCtl(); } });
  shuffleRo(ro); return ro;
}
function resetTmp() { S.tmp = { cur: 0, ro: [0, 1, 2, 3].map(newRo), v: Object.assign({}, TNORM), t: 0 }; }
bindSeg('#tmpScen', 'data-s', (s) => { const o = TSC[S.tmp.cur].kind; S.tmp.cur = +s; if (TSC[+s].kind !== o) { S.fade = 1; } updateCtl(); });
$('#bTmpReset').addEventListener('click', () => { Sound.click(); const i = S.tmp.cur; S.tmp.ro[i] = newRo(i); updateCtl(); });
function stepTmp(dt) {
  const tm = S.tmp, tg = TSC[tm.cur].tgt, v = tm.v; tm.t += dt;
  Object.keys(TNORM).forEach((k) => { v[k] = SciSim.approach(v[k], tg[k], dt, 1.6); });
}
function drawSkin(Z, v, sc) {
  const x = Z.x, y = Z.y, w = Z.w, h = Z.h, k = PHONE ? 0.85 : 1;
  ctx.save(); D.roundRect(x, y, w, h, 16); ctx.clip();
  const hot = sc.name.indexOf('더움') >= 0, cold = sc.name.indexOf('추움') >= 0;
  const ag = ctx.createLinearGradient(0, y, 0, y + h * 0.24); ag.addColorStop(0, hot ? '#ffe9b8' : cold ? '#cfe4ff' : '#e5f0ff'); ag.addColorStop(1, hot ? '#fff3d6' : cold ? '#e6f1ff' : '#f2f7ff'); ctx.fillStyle = ag; ctx.fillRect(x, y, w, h * 0.24);
  const ey = y + h * 0.24, epH = h * 0.07;
  ctx.fillStyle = '#e8b98f'; ctx.fillRect(x, ey, w, epH); ctx.fillStyle = '#f4c7c2'; ctx.fillRect(x, ey + epH, w, h * 0.4); ctx.fillStyle = '#f8e3a8'; ctx.fillRect(x, ey + epH + h * 0.4, w, h);
  ctx.strokeStyle = 'rgba(180,120,90,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, ey + epH); ctx.lineTo(x + w, ey + epH); ctx.moveTo(x, ey + epH + h * 0.4); ctx.lineTo(x + w, ey + epH + h * 0.4); ctx.stroke();
  T(x + 12, y + 24, hot ? '☀️ 더운 곳' : cold ? '❄️ 추운 곳' : '피부 단면', PHONE ? 13 : 15, COL.ink, 'left', 800);
  T(x + w - 12, y + h * 0.24 - 8, '피부 표면 (공기와 닿는 곳)', PHONE ? 11 : 12, COL.mut, 'right', 700);
  // 혈관
  const vy = ey + epH + h * 0.18, vr = v.vessel * k * 0.95;
  ctx.lineCap = 'round'; ctx.strokeStyle = '#b03a48'; ctx.lineWidth = vr + 5; ctx.beginPath(); ctx.moveTo(x + 14, vy); ctx.bezierCurveTo(x + w * 0.3, vy - 10, x + w * 0.6, vy + 10, x + w - 14, vy); ctx.stroke();
  ctx.strokeStyle = '#ef6a77'; ctx.lineWidth = vr; ctx.stroke();
  T(x + w - 14, vy + vr / 2 + 16, '피부 혈관 ' + (v.vessel < 9 ? '수축' : v.vessel > 15 ? '확장' : '보통'), PHONE ? 11.5 : 13, '#8d1327', 'right', 800);
  if (!RM) for (let a = 0; a < 10; a++) { const f = ((clock * 0.35 + a / 10) % 1), bxx = x + 14 + f * (w - 28); D.sphere(bxx, vy + Math.sin(f * 6) * 1, Math.max(1.6, vr * 0.18), '#9f1e2c', { gloss: false }); }
  // 열 방출 화살표
  const heat = clamp((v.vessel - 5) / 15 * 0.5 + v.sweat * 0.6, 0, 1);
  for (let a = 0; a < 5; a++) { const ax = x + w * (0.12 + a * 0.19), f = RM ? 0.5 : ((clock * 0.5 + a * 0.2) % 1); ctx.globalAlpha = (1 - f) * (0.25 + heat * 0.75); D.arrow(ax, vy - vr / 2 - 4 - f * 12, ax, ey - 18 - f * 16, { color: '#ef4444', width: 2 + heat * 4, head: 7 + heat * 5 }); ctx.globalAlpha = 1; }
  T(x + 12, ey - 12, '열 방출 ' + (heat > 0.65 ? '많음' : heat < 0.3 ? '적음' : '보통'), PHONE ? 11.5 : 13, '#b91c1c', 'left', 800);
  // 땀샘
  const gx = x + w * 0.58, gy = ey + epH + h * 0.33;
  ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(gx, gy - 8); for (let t = 0; t <= 1; t += 0.05) { ctx.lineTo(gx + Math.sin(t * 9) * 6, gy - 8 - t * (gy - ey + 6)); } ctx.stroke();
  ctx.fillStyle = '#9cc9f4'; ctx.strokeStyle = '#3b82c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy + 2, 12, 0, TAU); ctx.fill(); ctx.stroke();
  T(gx + 18, gy + 6, '땀샘', PHONE ? 11.5 : 12.5, '#1d5aa0', 'left', 800);
  if (v.sweat > 0.05) for (let a = 0; a < 6; a++) { const f = ((clock * (0.4 + v.sweat * 0.5) + a / 6) % 1); ctx.globalAlpha = v.sweat; D.sphere(gx + Math.sin(f * 9) * 6, gy - 8 - f * (gy - ey), 3.2, '#7cc4ff', { gloss: false }); ctx.globalAlpha = 1; }
  for (let a = 0; a < Math.round(v.sweat * 6); a++) D.sphere(gx - 22 + a * 8, ey - 2, 3, '#bfe0ff', { gloss: false });
  // 근육 떨림
  const my = ey + epH + h * 0.4 + h * 0.15;
  for (let a = 0; a < 7; a++) { const sx = x + 16 + a * (w - 32) / 6, sh = RM ? 0 : Math.sin(clock * 55 + a) * 2.4 * v.shiver; ctx.strokeStyle = '#d65a4a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sx + sh, my - 8); ctx.lineTo(sx - sh, my + 12); ctx.stroke(); }
  T(x + 12, my + h * 0.2 - 4 + 0, '골격근 ' + (v.shiver > 0.5 ? '떨림 (열 발생↑)' : '평상시'), PHONE ? 11.5 : 13, '#7f1d1d', 'left', 800);
  ctx.restore();
  ctx.strokeStyle = '#c3d0df'; ctx.lineWidth = 2; D.roundRect(x, y, w, h, 16); ctx.stroke();
}
function drawKidney(Z, v) {
  const x = Z.x, y = Z.y, w = Z.w, h = Z.h;
  ctx.save(); D.roundRect(x, y, w, h, 16); ctx.clip();
  ctx.fillStyle = '#f1f5fb'; ctx.fillRect(x, y, w, h);
  const kx = x + w * 0.3, ky = y + h * 0.54, s = h / 262;
  // 뇌하수체 후엽
  const px = x + 28 * (PHONE ? 0.8 : 1) + 20, py = y + 40;
  D.sphere(px, py, 15, '#a78bfa', { gloss: true }); T(px + 24, py + 5, '뇌하수체 후엽', PHONE ? 12 : 13.5, '#6d28d9', 'left', 800);
  if (!RM && v.adh > 0.05) for (let a = 0; a < 4; a++) { const f = ((clock * (0.25 + v.adh * 0.4) + a / 4) % 1); ctx.globalAlpha = 0.4 + v.adh * 0.6; D.sphere(lerp(px + 6, kx - 20, f), lerp(py + 14, ky - 70 * s, f), 3 + v.adh * 2, '#f59e0b', { gloss: false }); ctx.globalAlpha = 1; }
  T(x + 12, y + 18 + 0, '', 1, '#000');
  // 콩팥
  ctx.save(); ctx.translate(kx, ky); ctx.scale(s, s);
  const kg = ctx.createRadialGradient(-20, -30, 10, 0, 0, 100); kg.addColorStop(0, '#d98a8a'); kg.addColorStop(1, '#a24b55');
  D.shadow(() => { ctx.fillStyle = kg; ctx.beginPath(); ctx.moveTo(0, -78); ctx.bezierCurveTo(70, -80, 100, -10, 70, 54); ctx.bezierCurveTo(50, 92, -20, 86, -22, 44); ctx.bezierCurveTo(-8, 30, -8, -10, -22, -34); ctx.bezierCurveTo(-30, -62, -14, -76, 0, -78); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 3 });
  ctx.strokeStyle = '#7a2b36'; ctx.lineWidth = 3; ctx.stroke();
  // 세뇨관(집합관) 과 모세 혈관
  ctx.lineCap = 'round'; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(26, -50); ctx.bezierCurveTo(60, -40, 20, -10, 50, 10); ctx.bezierCurveTo(70, 30, 20, 40, 8, 66); ctx.stroke();
  ctx.strokeStyle = '#d6a537'; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(190,40,60,.65)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -60); ctx.bezierCurveTo(8, -30, 78, -26, 74, 4); ctx.bezierCurveTo(70, 34, 50, 44, 40, 70); ctx.stroke();
  ctx.restore();
  const R = (u, vv) => ({ x: kx + u * s, y: ky + vv * s });
  // 재흡수 화살표 (물이 혈관으로)
  const nR = Math.round(v.reabs * 5);
  for (let a = 0; a < 5; a++) { const p0 = R(52 + (a % 2) * 10, -30 + a * 22), act = a < nR; if (!act) continue; const f = RM ? 0.5 : ((clock * 0.7 + a * 0.2) % 1); ctx.globalAlpha = 1 - f * 0.4; D.arrow(p0.x - 10 + f * 14, p0.y, p0.x + 22 + f * 14, p0.y + 4, { color: '#2563eb', width: 2.6 + v.reabs * 1.6, head: 8 }); ctx.globalAlpha = 1; }
  T(R(98, -34).x, R(98, -34).y, '물 재흡수 ' + (v.reabs > 0.7 ? '↑' : v.reabs < 0.3 ? '↓' : '보통'), PHONE ? 12 : 14, '#1d4ed8', 'left', 800);
  // 오줌 컵
  const cx = x + w * 0.62, cy = y + h * 0.28, cw = PHONE ? 44 : 60, ch = PHONE ? 90 : 120;
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy + ch); ctx.lineTo(cx + cw - 6, cy + ch); ctx.lineTo(cx + cw, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
  const lvl = clamp(v.urV, 0, 1) * (ch - 8); ctx.fillStyle = C.mix('#fff7b0', '#d6a000', clamp(v.urC, 0, 1)); ctx.beginPath(); ctx.moveTo(cx + 6 * (1 - lvl / ch) + 2, cy + ch - lvl); ctx.lineTo(cx + 6, cy + ch - 2); ctx.lineTo(cx + cw - 6, cy + ch - 2); ctx.lineTo(cx + cw - 6 * (1 - lvl / ch) - 2, cy + ch - lvl); ctx.closePath(); ctx.fill();
  T(cx + cw / 2, cy + ch + 20, '오줌', PHONE ? 12 : 13.5, COL.ink, 'center', 800);
  T(cx + cw / 2, cy + ch + 38, (v.urV > 0.7 ? '양 많음 · 묽음' : v.urV < 0.35 ? '양 적음 · 진함' : '보통'), PHONE ? 11.5 : 12.5, COL.mut, 'center', 800);
  // 막대: 삼투압 · ADH
  const bx = x + w * 0.8, bw = w * 0.17;
  const bars = [['혈장 삼투압', v.osm, '#7c3aed', ['낮음', '높음']], ['ADH(호르몬)', v.adh, '#f59e0b', ['적음', '많음']]];
  bars.forEach((b, i) => {
    const by = y + 34 + i * (PHONE ? 74 : 84);
    T(bx, by - 8, b[0], PHONE ? 11.5 : 13, COL.ink, 'left', 800);
    D.roundRect(bx, by, bw, 14, 7); ctx.fillStyle = '#e6ebf4'; ctx.fill();
    D.roundRect(bx, by, Math.max(14, bw * b[1]), 14, 7); ctx.fillStyle = b[2]; ctx.fill();
    T(bx, by + 32, b[3][0], 11, COL.mut, 'left', 700); T(bx + bw, by + 32, b[3][1], 11, COL.mut, 'right', 700);
  });
  ctx.restore();
  ctx.strokeStyle = '#c3d0df'; ctx.lineWidth = 2; D.roundRect(x, y, w, h, 16); ctx.stroke();
}
const TAGC = { 변화: '#64748b', 감지: '#7c3aed', '시상 하부': '#0d9488', 반응: '#dc2626', nh: null, n: null, h: null };
function drawTmpScene(dt) {
  const tm = S.tmp, sc = TSC[tm.cur], ro = tm.ro[tm.cur], Z = TGG.Z, v = tm.v, solved = ro.solved;
  bgFill('#eef3fb', '#f7f9fd');
  if (sc.kind === 'temp') {
    const sw = PHONE ? 300 : 520; drawSkin({ x: Z.x, y: Z.y, w: sw, h: Z.h }, v, sc);
    const ix = Z.x + sw + 8, iw = Z.w - sw - 8; panel(ix, Z.y, iw, Z.h, 16);
    T(ix + 12, Z.y + 26, '몸의 반응', PHONE ? 13.5 : 15, COL.ink, 'left', 800);
    [['피부 혈관 지름', (v.vessel - 5) / 15, '#ef4444', '수축', '확장'], ['땀 분비', v.sweat, '#3b82f6', '적음', '많음'], ['열 발생(떨림)', v.shiver, '#f97316', '적음', '많음']].forEach((b, i) => {
      const by = Z.y + 60 + i * (PHONE ? 52 : 62);
      TF(ix + 12, by - 8, b[0], iw - 24, PHONE ? 11.5 : 13, 10, COL.ink, 'left', 800);
      D.roundRect(ix + 12, by, iw - 24, 12, 6); ctx.fillStyle = '#e6ebf4'; ctx.fill(); D.roundRect(ix + 12, by, Math.max(12, (iw - 24) * clamp(b[1], 0, 1)), 12, 6); ctx.fillStyle = b[2]; ctx.fill();
      T(ix + 12, by + 26, b[3], 11, COL.mut, 'left', 700); T(ix + iw - 12, by + 26, b[4], 11, COL.mut, 'right', 700);
    });
    T(ix + 12, Z.y + Z.h - 14, '값은 교육용 예시', 11.5, COL.mut, 'left', 700);
  } else drawKidney(Z, v);
  // 카드
  const hy = PHONE ? 252 : 326;
  T(PHONE ? 10 : 16, hy, solved ? '✨ 순서가 맞아요! 파랑은 신경, 주황은 호르몬 경로예요.' : '👇 카드를 끌어서 「' + sc.name.replace(/^\S+\s/, '') + '」 때의 조절 경로(변화 → 감지 → 시상 하부 → 효과기 → 결과) 순서로 놓아요', PHONE ? 11.5 : 13.5, solved ? '#166534' : COL.mut, 'left', 800);
  ro.update(dt); ro.draw();
  if (solved) {
    ro.o.slots.forEach((sl, i) => {
      const tag = sc.tags[i]; const ty = sl.y + (PHONE ? -2 : TGG.ch + 12);
      if (PHONE) return;
      if (tag === 'nh') { D.label(sl.x + 4, ty + 2, '신경(파랑)', { bg: COL.neu, size: 11.5, align: 'left' }); D.label(sl.x + 76, ty + 2, '호르몬(주황)', { bg: COL.horD, size: 11.5, align: 'left' }); }
      else if (tag === 'n') D.label(sl.x + 4, ty + 2, '신경(파랑)', { bg: COL.neu, size: 11.5, align: 'left' });
      else if (tag === 'h') D.label(sl.x + 4, ty + 2, '호르몬(주황) ADH', { bg: COL.horD, size: 11.5, align: 'left' });
      else D.label(sl.x + 4, ty + 2, tag, { bg: TAGC[tag], size: 11.5, align: 'left' });
      const cl = wrap(sc.cap[i], TGG.cw, 12, 700); cl.slice(0, 4).forEach((l, k) => T(sl.x + 4, ty + 26 + k * 15, l, 12, COL.mut, 'left', 700));
    });
  }
  const done = tm.ro.filter((r) => r.solved).length;
  T(PHONE ? 10 : 16, PHONE ? 626 : 546, '맞춘 시나리오 ' + done + ' / 4 (시나리오 버튼으로 바꿔요)', PHONE ? 12.5 : 13.5, COL.mut, 'left', 800);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE.tmp = { down(p) { return S.tmp.ro[S.tmp.cur].down(p); }, move(p) { S.tmp.ro[S.tmp.cur].move(p); }, up(p) { S.tmp.ro[S.tmp.cur].up(p); }, hover(p) { return S.tmp.ro[S.tmp.cur].hover(p); } };

/* ============ ④ 스마트 헬스케어 (교육용 가상 센서) ============ */
const lin = (pts) => (x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) { const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return lerp(pts[i][1], pts[i + 1][1], t); } return pts[pts.length - 1][1]; };
const HRF = lin([[0, 70], [30, 70], [33, 150], [60, 150], [61, 120], [62, 100], [65, 80], [75, 70], [420, 70]]);
const SKF = pchip([0, 30, 60, 70, 90, 120, 420], [33, 33, 34.8, 34.1, 33.4, 33.1, 33]);
const CGF = pchip([0, 60, 120, 300, 330, 360, 390, 420], [90, 88, 90, 90, 125, 150, 125, 100]);
const SENS = [
  { id: 'hr', name: '❤️ 심박수 (bpm)', f: (t) => HRF(t) + (t > 30 && t < 60 ? Math.sin(t * 2.3) * 2 : Math.sin(t * 0.9) * 0.8), lo: 50, hi: 170, ticks: [60, 100, 140], fmt: (v) => Math.round(v) + ' bpm', col: '#e11d48' },
  { id: 'sk', name: '🌡️ 피부 온도 (°C)', f: (t) => SKF(t) + Math.sin(t * 0.6) * 0.03, lo: 32.5, hi: 35.5, ticks: [33, 34, 35], fmt: (v) => v.toFixed(1) + ' °C', col: '#ea580c' },
  { id: 'cg', name: '🩸 연속 혈당 (mg/dL)', f: (t) => CGF(t), lo: 60, hi: 170, ticks: [80, 110, 140], fmt: (v) => Math.round(v) + ' mg/dL', col: '#2563eb' },
];
const hhmm = (m) => { const t = 7 * 60 + m; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
const SMG = PHONE
  ? { px: 8, pw: 464, ph: 200, py: (i) => 8 + i * 208, plotX: 58, plotW: 396 }
  : { px: 14, pw: 772, ph: 168, py: (i) => 14 + i * 178, plotX: 86, plotW: 676 };
function resetSmt() { S.smt = { t: 0, drag: false, seen: {} }; $('#sTime').value = 0; $('#oTime').textContent = hhmm(0); $('#sTime').style.setProperty('--pct', '0%'); ['selQ1', 'selQ2', 'selQ3'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); }
function setSmtT(t) { S.smt.t = clamp(Math.round(t / 5) * 5, 0, 420); S.smt.seen[Math.round(S.smt.t / 60)] = 1; $('#sTime').value = S.smt.t; $('#oTime').textContent = hhmm(S.smt.t); $('#sTime').style.setProperty('--pct', (S.smt.t / 420 * 100) + '%'); }
SciSim.bindRange($('#sTime'), $('#oTime'), (v) => hhmm(v), (v) => { if (S.smt) { S.smt.t = v; S.smt.seen[Math.round(v / 60)] = 1; } });
function drawSmtLog(dt) {
  const s = S.smt;
  bgFill('#eef3fb', '#f7f9fd');
  SENS.forEach((sn, i) => {
    const py = SMG.py(i), pl = { x: SMG.px + SMG.plotX - (PHONE ? 8 : 14) + (PHONE ? 8 : 14) - 0, y: py + 34, w: SMG.plotW, h: SMG.ph - 68 };
    pl.x = SMG.plotX; pl.y = py + (PHONE ? 34 : 36);
    panel(SMG.px, py, SMG.pw, SMG.ph, 14);
    T(SMG.px + 14, py + 22, sn.name, PHONE ? 13 : 14.5, COL.ink, 'left', 800);
    T(SMG.px + SMG.pw - 14, py + 22, hhmm(s.t) + ' · ' + sn.fmt(sn.f(s.t)), PHONE ? 13 : 15, sn.col, 'right', 800);
    const A = makeAxes({ x: pl.x, y: pl.y, w: SMG.plotW, h: SMG.ph - (PHONE ? 66 : 70) }, [0, 420], [sn.lo, sn.hi]);
    drawAxes(A, { xt: [0, 60, 120, 180, 240, 300, 360, 420], xf: (v) => hhmm(v).slice(0, 5), yt: sn.ticks, yf: (v) => String(v), tickY: A.r.y + A.r.h + 15, fs: PHONE ? 11 : 12 });
    ctx.save(); ctx.fillStyle = 'rgba(245,158,11,.18)'; ctx.fillRect(A.X(30), A.r.y + 1, A.X(60) - A.X(30), A.r.h - 2); ctx.restore();
    T(A.X(45), A.r.y + 14, '🏃 달리기', PHONE ? 11 : 12, '#b45309', 'center', 800);
    ctx.save(); ctx.strokeStyle = 'rgba(37,99,235,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(A.X(300), A.r.y); ctx.lineTo(A.X(300), A.r.y + A.r.h); ctx.stroke(); ctx.restore();
    T(A.X(300) + 4, A.r.y + 14, '🍚 점심(흰밥)', PHONE ? 11 : 12, '#1d4ed8', 'left', 800);
    plotFn(A, sn.f, 0, 420, 1, sn.col, 2.4);
    const cx = A.X(s.t), cy = A.Y(clamp(sn.f(s.t), sn.lo, sn.hi));
    ctx.save(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(cx, A.r.y); ctx.lineTo(cx, A.r.y + A.r.h); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 6, sn.col, { gloss: true });
  });
  T(PHONE ? 10 : 20, PHONE ? 634 : 558, '교육용 가상 데이터예요. 그래프를 끌어서 시각을 옮겨요.', PHONE ? 11.5 : 12.5, COL.mut, 'left', 700);
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE['smt:log'] = {
  down(p) { const x = p.x - SMG.plotX; if (x >= -10 && x <= SMG.plotW + 10 && p.y > 8) { S.smt.drag = true; this.move(p); return true; } return false; },
  move(p) { if (S.smt.drag) setSmtT((p.x - SMG.plotX) / SMG.plotW * 420); },
  up() { S.smt.drag = false; },
  hover(p) { const x = p.x - SMG.plotX; return x >= -10 && x <= SMG.plotW + 10 ? 'ew-resize' : 'default'; },
};

/* ---- 실험 설계 ---- */
const EXQ = {
  hr: { q: '운동 세기에 따라 운동 후 심박 회복 시간이 달라질까?', items: ['측정 시각', '운동 세기 (걷기 / 달리기)', '센서 (같은 기기)', '운동 시간 (30분)'], varIdx: 1, A: '걷기', B: '달리기', xlab: '운동이 끝난 뒤 시간 (분)', unit: 'bpm', lo: 60, hi: 160,
    resp: ['달리기 뒤에 심박수가 80 bpm 근처로 돌아오는 데 더 오래 걸렸어요.', '걷기 뒤에 회복하는 데 더 오래 걸렸어요.', '두 경우는 차이가 없어요.', '이 결과로는 아무것도 알 수 없어요.'], ans: 0,
    tA: [0, 1, 2, 3, 4, 5, 6], yA: [110, 92, 80, 74, 72, 71, 70], yB: [150, 120, 100, 90, 84, 80, 76] },
  glu: { q: '식사 종류에 따라 식후 혈당 반응이 달라질까?', items: ['식사 시각', '센서 (같은 기기)', '식사 종류 (흰밥 / 현미 + 채소)', '식사량 (열량)'], varIdx: 2, A: '흰밥', B: '현미 + 채소', xlab: '식사 후 시간 (분)', unit: 'mg/dL', lo: 80, hi: 170,
    resp: ['흰밥을 먹은 쪽의 최고 혈당이 더 높았어요.', '현미 + 채소 쪽의 최고 혈당이 더 높았어요.', '두 식사의 최고 혈당이 같아요.', '혈당은 식사와 관계가 없어요.'], ans: 0,
    tA: [0, 15, 30, 45, 60, 75, 90, 105, 120], yA: null, yB: null },
};
EXQ.glu.fA = pchip([0, 30, 60, 90, 120], [90, 130, 150, 125, 100]); EXQ.glu.fB = pchip([0, 30, 60, 90, 120], [90, 102, 118, 126, 108]);
EXQ.glu.yA = EXQ.glu.tA.map((t) => EXQ.glu.fA(t)); EXQ.glu.yB = EXQ.glu.tA.map((t) => EXQ.glu.fB(t));
function resetExp() {
  S.exp = { q: '', varSel: -1, ctrl: [false, false, false, false], measured: false, trial: 0, dA: null, dB: null, resp: '' };
  const x = $('#selX'); if (x) x.value = ''; $('#expDesign').hidden = true; $('#selV').innerHTML = ''; $('#ctrlChips').innerHTML = ''; $('#selR').innerHTML = '<option value="">선택하세요</option>'; $('#selR').classList.remove('ok', 'bad');
}
function noisy(arr, amp, seed) { let s = seed * 9301 + 49297; const rnd2 = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; return arr.map((v) => v + (rnd2() * 2 - 1) * amp); }
function expValid() {
  const e = S.exp; if (!e.q) return false; const Q = EXQ[e.q];
  return e.varSel === Q.varIdx && Q.items.every((_, i) => (i === Q.varIdx ? !e.ctrl[i] : e.ctrl[i]));
}
function expIssue() {
  const e = S.exp; if (!e.q) return '먼저 알아볼 질문을 골라요.'; const Q = EXQ[e.q];
  if (e.varSel < 0) return '바꿀 조건을 하나 골라요.';
  if (e.varSel !== Q.varIdx) return '바꿀 조건은 질문이 묻는 것(' + Q.items[Q.varIdx] + ')이어야 해요.';
  if (e.ctrl[Q.varIdx]) return '바꿀 조건은 같게 할 조건에서 빼요.';
  const miss = Q.items.filter((_, i) => i !== Q.varIdx && !e.ctrl[i]);
  if (miss.length) return '같게 할 조건이 빠졌어요: ' + miss.join(', ') + '.';
  return '';
}
function buildExp() {
  const e = S.exp, Q = EXQ[e.q];
  $('#expDesign').hidden = !Q || viewKey() !== 'smt:exp';
  const sv = $('#selV'); sv.innerHTML = '<option value="">선택하세요</option>' + Q.items.map((t, i) => '<option value="' + i + '">' + t + '</option>').join(''); sv.value = e.varSel >= 0 ? String(e.varSel) : '';
  const cc = $('#ctrlChips'); cc.innerHTML = '';
  Q.items.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.i = i; b.classList.toggle('on', e.ctrl[i]); b.addEventListener('click', () => { Sound.click(); e.ctrl[i] = !e.ctrl[i]; e.measured = false; b.classList.toggle('on', e.ctrl[i]); }); cc.appendChild(b); });
  const sr = $('#selR'); sr.innerHTML = '<option value="">선택하세요</option>' + Q.resp.map((t, i) => '<option value="' + i + '">' + t + '</option>').join(''); sr.value = e.resp;
}
$('#selX').addEventListener('change', () => { const e = S.exp; e.q = $('#selX').value; e.varSel = -1; e.ctrl = [false, false, false, false]; e.measured = false; e.trial = 0; e.resp = ''; if (e.q) buildExp(); else $('#expDesign').hidden = true; Sound.click(); });
$('#selV').addEventListener('change', () => { const e = S.exp; e.varSel = $('#selV').value === '' ? -1 : +$('#selV').value; e.measured = false; Sound.click(); });
$('#selR').addEventListener('change', () => { S.exp.resp = $('#selR').value; $('#selR').classList.remove('ok', 'bad'); Sound.click(); });
function measure() {
  const e = S.exp;
  if (!expValid()) { showHint(expIssue()); Sound.fail(); return; }
  e.trial++; const Q = EXQ[e.q];
  e.dA = noisy(Q.yA, e.q === 'hr' ? 3 : 4, e.trial * 7 + 1); e.dB = noisy(Q.yB, e.q === 'hr' ? 3 : 4, e.trial * 7 + 4); e.measured = true; e.anim = 0; Sound.success();
}
$('#bMeasure').addEventListener('click', measure);
$('#bRepeat').addEventListener('click', () => { if (!S.exp.measured) { showHint('먼저 📡 가상 센서로 측정해 보세요.'); return; } measure(); });
function expStats(Q, d) {
  if (S.exp.q === 'hr') { let rec = null; for (let i = 0; i < d.length; i++) if (d[i] <= 82) { rec = Q.tA[i]; break; } return { a: rec == null ? '6분 이상' : rec + '분', lab: '80 bpm 근처로 돌아온 시간', peak: Math.round(d[0]) }; }
  let mi = 0; d.forEach((v, i) => { if (v > d[mi]) mi = i; }); return { a: Math.round(d[mi]) + ' mg/dL', lab: '최고 혈당', t: Q.tA[mi] + '분' };
}
function drawExp(dt) {
  const e = S.exp;
  bgFill('#eef3fb', '#f7f9fd');
  const D1 = PHONE ? { x: 8, y: 8, w: 464, h: 196 } : { x: 14, y: 14, w: 330, h: 270 };
  const C1 = PHONE ? { x: 8, y: 212, w: 464, h: 236 } : { x: 356, y: 14, w: 430, h: 270 };
  const R1 = PHONE ? { x: 8, y: 456, w: 464, h: 176 } : { x: 14, y: 296, w: 772, h: 250 };
  panel(D1.x, D1.y, D1.w, D1.h, 16);
  T(D1.x + 14, D1.y + 24, '🧪 실험 설계 카드', PHONE ? 14 : 15.5, COL.ink, 'left', 800);
  if (!e.q) textBlock(D1.x + 14, D1.y + 54, D1.w - 28, '오른쪽 조작판에서 ① 알아볼 질문을 골라요. 그다음 바꿀 조건 하나와 같게 할 조건을 정해요.', PHONE ? 13 : 14, COL.mut, PHONE ? 19 : 21, 700);
  else {
    const Q = EXQ[e.q]; let y = D1.y + 40;
    y += textBlock(D1.x + 14, y, D1.w - 28, '질문: ' + Q.q, PHONE ? 12.5 : 13.5, COL.ink, PHONE ? 17 : 19, 800) + 6;
    Q.items.forEach((it, i) => {
      const isVar = e.varSel === i, isCtl = e.ctrl[i];
      const st = isVar ? ['바꿈', '#e2464b'] : isCtl ? ['같게', '#16a34a'] : ['미정', '#9aa6b8'];
      D.roundRect(D1.x + 12, y, D1.w - 24, PHONE ? 28 : 34, 8); ctx.fillStyle = isVar ? '#fdeceb' : isCtl ? '#e8f7ee' : '#f4f6fa'; ctx.fill();
      TF(D1.x + 22, y + (PHONE ? 19 : 22), it, D1.w - 110, PHONE ? 12.5 : 13.5, 10, COL.ink, 'left', 800);
      D.label(D1.x + D1.w - 20, y + (PHONE ? 14 : 17), st[0], { bg: st[1], size: 12, align: 'right' });
      y += PHONE ? 32 : 40;
    });
    const iss = expValid() ? '✅ 좋은 설계예요! 하나만 바꾸고 나머지는 같게 했어요.' : '⚠️ ' + expIssue();
    textBlock(D1.x + 14, y + (PHONE ? 6 : 10), D1.w - 28, iss, PHONE ? 11.5 : 12.5, expValid() ? '#166534' : '#b45309', PHONE ? 15 : 17, 800);
  }
  panel(C1.x, C1.y, C1.w, C1.h, 16);
  if (!e.measured) { T(C1.x + C1.w / 2, C1.y + C1.h / 2, '📡 설계를 마치고 측정하면 그래프가 나타나요', PHONE ? 13 : 15, '#8795a8', 'center', 800); }
  else {
    const Q = EXQ[e.q], pl = { x: C1.x + (PHONE ? 54 : 62), y: C1.y + 40, w: C1.w - (PHONE ? 68 : 80), h: C1.h - 92 };
    T(C1.x + 14, C1.y + 24, '📡 가상 센서 기록 (' + e.trial + '번째 측정)', PHONE ? 13 : 14.5, COL.ink, 'left', 800);
    const A = makeAxes(pl, [0, Q.tA[Q.tA.length - 1]], [Q.lo, Q.hi]);
    drawAxes(A, { xt: e.q === 'hr' ? [0, 1, 2, 3, 4, 5, 6] : [0, 30, 60, 90, 120], yt: e.q === 'hr' ? [60, 90, 120, 150] : [80, 100, 120, 140, 160], xl: Q.xlab, yl: Q.unit, tickY: pl.y + pl.h + 15, xlY: pl.y + pl.h + 33, ylx: PHONE ? 38 : 44, fs: 12 });
    e.anim = Math.min(1, (e.anim || 0) + dt * 1.2);
    [[e.dA, '#2563eb', Q.A], [e.dB, '#ea580c', Q.B]].forEach((s, k) => {
      const n = Math.max(2, Math.round(s[0].length * e.anim)); ctx.save(); ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip(); ctx.strokeStyle = s[1]; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = A.X(Q.tA[i]), y = A.Y(s[0][i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
      for (let i = 0; i < n; i++) { ctx.fillStyle = s[1]; ctx.beginPath(); ctx.arc(A.X(Q.tA[i]), A.Y(s[0][i]), 3.6, 0, TAU); ctx.fill(); }
      D.label(pl.x + pl.w - 8 - k * (PHONE ? 100 : 112), pl.y + 14, '● ' + s[2], { bg: s[1], size: 12, align: 'right' });
    });
  }
  panel(R1.x, R1.y, R1.w, R1.h, 16);
  T(R1.x + 14, R1.y + 24, '📋 결과', PHONE ? 14 : 15.5, COL.ink, 'left', 800);
  if (!e.measured) textBlock(R1.x + 14, R1.y + 48, R1.w - 28, '측정하면 두 조건의 결과가 표로 나타나요. 같은 설계로 여러 번 측정하면 값이 조금씩 달라지는 것도 확인해 봐요(개인차 · 센서 오차).', PHONE ? 12.5 : 14, COL.mut, PHONE ? 18 : 21, 700);
  else {
    const Q = EXQ[e.q], sa = expStats(Q, e.dA), sb = expStats(Q, e.dB);
    const cols = PHONE ? [R1.x + 14, R1.x + 150, R1.x + 310] : [R1.x + 24, R1.x + 290, R1.x + 520];
    T(cols[0], R1.y + 52, '조건', 13.5, COL.mut, 'left', 800); T(cols[1], R1.y + 52, Q.A, 14, '#1d4ed8', 'left', 800); T(cols[2], R1.y + 52, Q.B, 14, '#c2410c', 'left', 800);
    T(cols[0], R1.y + 82, sa.lab, 13.5, COL.ink, 'left', 800); T(cols[1], R1.y + 82, sa.a, 15, COL.ink, 'left', 800); T(cols[2], R1.y + 82, sb.a, 15, COL.ink, 'left', 800);
    if (e.q === 'glu') { T(cols[0], R1.y + 108, '최고점 시각', 13.5, COL.ink, 'left', 800); T(cols[1], R1.y + 108, sa.t, 15, COL.ink, 'left', 800); T(cols[2], R1.y + 108, sb.t, 15, COL.ink, 'left', 800); }
    else { T(cols[0], R1.y + 108, '운동 직후 값', 13.5, COL.ink, 'left', 800); T(cols[1], R1.y + 108, sa.peak + ' bpm', 15, COL.ink, 'left', 800); T(cols[2], R1.y + 108, sb.peak + ' bpm', 15, COL.ink, 'left', 800); }
    textBlock(R1.x + 14, R1.y + (PHONE ? 126 : 136), R1.w - 28, '⚠️ 같은 설계로 다시 측정하면 값이 조금 달라져요. 한 번의 측정값만으로 단정하지 말고, 반복 측정 · 개인차를 함께 생각해요. (교육용 가상 데이터)', PHONE ? 11.5 : 13, '#b45309', PHONE ? 15 : 18, 700);
  }
  parts.update(dt); parts.draw(ctx);
}
PT_TABLE['smt:exp'] = {};
$$('#subSmt button').forEach((b) => b.addEventListener('click', () => { if (S.exp && S.exp.q) buildExp(); }));


/* ---------- 읽음 칸 ---------- */
let rlast = '';
function readouts() {
  let L1, L2, L3, a, b, c;
  const key = viewKey();
  if (key === 'fb:exp') { const f = S.fb; L1 = '체온(몸)'; a = f.body.T.toFixed(1) + ' °C'; L2 = '실내 온도(방)'; b = f.room.T.toFixed(1) + ' °C'; L3 = '되먹임'; c = f.fb ? 'ON' : 'OFF'; }
  else if (key === 'fb:pair') { const pl = S.pair.pl; L1 = '카드'; a = pl.placed + ' / 3 놓음'; L2 = '맞은 칸'; b = (3 - pl.wrongIds().length) + ' / 3'; L3 = '조절 구조'; c = '감지 · 중추 · 효과기'; }
  else if (key === 'glu') { const g = S.glu, k = gluKey(); L1 = '시각'; a = Math.round(g.t) + ' 분'; L2 = '혈당'; b = Math.round(gluVal(k, g.t)) + ' mg/dL'; L3 = '설정값'; c = '약 ' + GSET + ' mg/dL'; }
  else if (key === 'tmp') { const tm = S.tmp; L1 = '시나리오'; a = TSC[tm.cur].name; L2 = '맞춘 시나리오'; b = tm.ro.filter((r) => r.solved).length + ' / 4'; L3 = '이 시나리오'; c = tm.ro[tm.cur].solved ? '경로 완성' : '배열 중'; }
  else if (key === 'smt:log') { const t = S.smt.t; L1 = hhmm(t) + ' 심박'; a = SENS[0].fmt(SENS[0].f(t)); L2 = '피부 온도'; b = SENS[1].fmt(SENS[1].f(t)); L3 = '혈당'; c = SENS[2].fmt(SENS[2].f(t)); }
  else { const e = S.exp; L1 = '알아볼 질문'; a = e.q ? (e.q === 'hr' ? '운동 후 심박 회복' : '식사별 혈당 반응') : '—'; L2 = '설계'; b = e.q ? (expValid() ? '알맞음' : '고치는 중') : '—'; L3 = '측정 횟수'; c = e.trial + ' 번'; }
  const k = [L1, a, L2, b, L3, c].join('|');
  if (k === rlast) return; rlast = k;
  l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
}

/* ================= 미션 ================= */
const placerCheck = (pl, n, hintBad) => {
  if (!pl.full) return '아직 놓지 않은 카드가 ' + (n - pl.placed) + '개 있어요. ' + n + '칸을 모두 채워 보세요.';
  const bad = pl.wrongIds(); pl.markBad(bad);
  if (bad.length) return '빨간 카드 ' + bad.length + '개가 알맞지 않아요. ' + hintBad;
  return true;
};
const SEL_OK = (id, ans) => { const el = $('#' + id); el.classList.remove('ok', 'bad'); if (el.value === '') return false; const ok = el.value === ans; el.classList.add(ok ? 'ok' : 'bad'); return ok; };

const levels = [
  {
    title: '되먹임: 결과가 원인을 줄여요', short: '되먹임', icon: '🔁', phase: '모형',
    intro: '<p class="si-q">❓ 탐구 질문: 센서로 몸을 24시간 지켜보면 항상성은 어떤 모양으로 나타날까?</p>' +
      '<div class="si-link">🔗 <b>중학교</b>의 혈당 · 체온 조절과 <b>앞 차시</b>의 신경계 · 내분비계를 바탕으로, 이번에는 조절을 <b>감지 → 조절 중추 → 효과기 → 변화 되돌림</b>이라는 <b>되먹임</b> 구조로 다시 봐요. 호르몬 이름은 인슐린 · 글루카곤 · 항이뇨 호르몬 정도만 나와요.</div>' +
      '<p><b>항상성</b>은 몸 안팎의 환경이 변해도 체온 · 혈당 · 삼투압 같은 체내 환경을 일정한 범위로 유지하는 성질이에요. 먼저 방의 온도 조절 장치와 몸의 체온 조절을 나란히 비교해요. 모든 수치는 <b>교육용 가상 자료</b>예요.</p>',
    features: ['fb'],
    setup() { resetFb(false); setScene('fb', 'exp'); },
    recap: '항상성은 감지 → 조절 중추 → 효과기로 이어지는 음성 되먹임으로 유지돼요. 되먹임이 없으면 변화가 커져요.',
    summary: '<ul><li><b>항상성</b>: 몸 안팎의 환경이 변해도 체내 환경(체온, 혈당, 삼투압 등)을 일정한 범위로 유지하는 성질.</li><li>조절 구조: <b>감지(수용기) → 조절 중추(시상 하부 등) → 효과기 → 변화를 되돌림</b>. 방의 <b>센서 → 제어기 → 난방기</b>와 같은 구조예요.</li><li><b>음성 되먹임</b>: 결과가 원인을 줄이는 조절. 되먹임이 ON이면 설정값 근처로 돌아오고, OFF이면 교란이 커져요.</li><li><b>양성 되먹임</b>은 결과가 원인을 키우는 조절이에요(예: 분만 때 자궁 수축이 더 강한 수축을 부름).</li></ul>',
    missions: [
      {
        title: '되먹임 ON / OFF 비교',
        goal: '<b>되먹임 OFF</b>와 <b>ON</b> 각각에서 <b>❄️ 교란 주기</b>를 눌러 끝까지(120분) 지켜보고 방과 몸의 온도 그래프를 비교하세요.',
        hint: '되먹임 OFF를 고르고 교란 주기를 눌러 끝까지 기다린 뒤, ON으로 바꿔 한 번 더 해요. 중간에 스위치를 바꾸면 실험이 처음으로 돌아가요.',
        setup() { setScene('fb', 'exp'); },
        check: () => S.fb.done.on && S.fb.done.off && !S.fb.run.active,
        hold: 0.6,
        status: () => mark(S.fb.done.off) + ' OFF 실험 &nbsp; ' + mark(S.fb.done.on) + ' ON 실험' + (S.fb.run.active ? ' &nbsp; ⏳ ' + Math.round(S.fb.run.t) + ' / ' + FEND + '분' : ''),
        explain: '되먹임이 <b>OFF</b>이면 찬 바람 때문에 온도가 계속 내려가 <b>몸은 약 33 °C</b>까지 떨어졌어요. <b>ON</b>이면 설정값보다 낮아지는 순간 효과기가 열을 더 내서 <b>몸은 약 36.8 °C</b>로 유지됐어요(교육용 예시). 결과(체온 하락)가 원인(열 부족)을 줄이는 <b>음성 되먹임</b>이에요.',
      },
      {
        title: '방의 장치 ↔ 몸의 구성 짝짓기', manual: true,
        goal: '몸의 구성 카드 3장을 <b>방의 장치와 같은 역할</b>의 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '온도를 재는 센서는 감지(수용기), 설정값과 비교해 명령하는 제어기는 조절 중추(시상 하부), 열을 내는 난방기는 효과기(근육 · 피부 혈관 등)와 같은 역할이에요.',
        setup() { setScene('fb', 'pair'); },
        check: () => placerCheck(S.pair.pl, 3, '각 장치가 하는 일(재기 · 비교하고 명령하기 · 열 내기)을 떠올려 보세요.'),
        status: () => '카드 ' + S.pair.pl.placed + ' / 3 · 맞은 칸 ' + (3 - S.pair.pl.wrongIds().length) + ' / 3',
        explain: '<b>온도 센서 = 온도 수용기(감지)</b>, <b>제어기 = 시상 하부(조절 중추)</b>, <b>난방기 = 근육 · 피부 혈관 · 땀샘(효과기)</b>예요. 몸에서는 중추가 신경과 호르몬 경로로 효과기를 조절해요.',
      },
      {
        type: 'quiz', title: '음성 되먹임이란?',
        goal: '<b>음성 되먹임</b>을 가장 알맞게 설명한 것은?',
        setup() { setScene('fb', 'exp'); },
        choices: ['결과가 원인을 줄이는 방향으로 조절해서 변화를 되돌리는 것', '결과가 원인을 더 키워서 변화를 계속 크게 만드는 것', '변화가 일어나도 조절 장치가 반응하지 않는 것', '효과기가 없어도 설정값이 유지되는 것'],
        answer: 0,
        feedback: ['', '결과가 원인을 키우는 것은 양성 되먹임이에요(분만 때 자궁 수축 등). 항상성은 대부분 음성 되먹임이에요.', '반응하지 않으면 되먹임이 OFF인 거예요. 그래프에서 체온이 계속 내려갔죠.', '효과기가 열을 내거나 줄여야 설정값으로 돌아와요.'],
        explain: '<b>음성 되먹임</b>은 변화의 결과가 원인을 <b>줄이는</b> 조절이에요. 체온이 내려가면 열 발생이 늘어 체온이 올라가고, 설정값에 가까워지면 조절이 약해져요.',
      },
    ],
  },
  {
    title: '혈당 조절: 두 경로로 설정값 유지', short: '혈당 조절', icon: '🍬', phase: '실험',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 항상성은 감지 → 조절 중추 → 효과기의 음성 되먹임이라고 했어요. 이번에는 <b>혈당</b>에서 신경 경로(파랑)와 호르몬 경로(주황)가 어떻게 쓰이는지 곡선으로 확인해요. 중3과 통합과학에서 배운 세포의 물질 출입도 떠올려 봐요.</div>' +
      '<p>식사나 운동 사건을 고르고 3시간을 재생해 혈당 곡선과 경로를 살펴봐요. <b>혈당이 높으면</b> 이자에서 <b>인슐린</b>이 늘어 간 · 근육이 포도당을 흡수하고, <b>낮으면</b> <b>글루카곤</b>과 <b>교감 신경</b>이 간의 글리코젠 분해를 늘려요. 곡선은 <b>교육용 가상 자료</b>이고 의학적 진단이 아니에요.</p>',
    features: ['glu'],
    setup() { resetGlu(); setScene('glu'); },
    recap: '혈당이 높으면 인슐린이, 낮으면 글루카곤과 교감 신경이 작용해 설정값 근처로 되돌려요. 인슐린 작용 장애에서는 혈당이 높게 유지돼요.',
    summary: '<ul><li><b>고혈당</b>: 이자에서 <b>인슐린</b>↑ → 간 · 근육에서 포도당 흡수, 글리코젠 합성 → 혈당↓ (호르몬 경로).</li><li><b>저혈당</b>: <b>글루카곤</b>↑ + <b>교감 신경</b> 활성 → 간에서 글리코젠 분해 → 혈당↑.</li><li>식후 곡선(예시): 0분 90 → 30분 125 → 60분 140 → 120분 100 → 180분 90 mg/dL, 설정값 약 90.</li><li>인슐린 작용 장애(예시): 0분 110 → 60분 240 → 180분 170으로 <b>높게 유지</b>돼요(대사성 질환 모형).</li></ul>',
    missions: [
      {
        title: '정상 · 장애 곡선 비교',
        goal: '<b>🍚 식사</b>를 <b>정상</b>과 <b>인슐린 작용 장애</b>로 각각 3시간 재생해 두 곡선을 비교하세요.',
        hint: '식사를 고르고 정상에서 ▶ 3시간 재생, 끝나면 인슐린 작용 장애로 바꿔 한 번 더 재생해요(약 9초). 재생 중에 바꾸면 처음으로 돌아가요.',
        setup() { setScene('glu'); },
        check: () => S.glu.done['meal-n'] && S.glu.done['meal-d'] && !S.glu.run,
        hold: 0.6,
        status: () => mark(S.glu.done['meal-n']) + ' 정상 곡선 &nbsp; ' + mark(S.glu.done['meal-d']) + ' 장애 곡선' + (S.glu.run ? ' &nbsp; ⏳ ' + Math.round(S.glu.t) + ' / 180분' : ''),
        explain: '정상에서는 식후 혈당이 <b>약 140 mg/dL</b>까지 오른 뒤 인슐린 작용으로 <b>약 180분에 90</b> 근처로 돌아와요. 인슐린 작용 장애에서는 혈당이 <b>약 240</b>까지 올라 <b>180분에도 170</b>으로 높게 유지돼요(교육용 예시).',
      },
      {
        type: 'quiz', title: '혈당이 낮을 때 올리는 경로',
        goal: '<b>혈당이 설정값보다 낮아졌을 때</b> 혈당을 올리는 경로로 알맞은 것은?',
        setup() { setScene('glu'); },
        choices: ['글루카곤 분비↑ + 교감 신경 활성 → 간에서 글리코젠 분해 → 혈당↑', '인슐린 분비↑ → 간 · 근육의 포도당 흡수 → 혈당↑', '부교감 신경이 혈액 속에서 포도당을 직접 만들어요', '혈당이 낮아도 아무 조절도 일어나지 않아요'],
        answer: 0,
        feedback: ['', '인슐린은 혈당을 낮추는 호르몬이에요. 포도당 흡수가 늘면 혈당이 내려가요.', '포도당은 간의 글리코젠 분해로 혈액에 더해져요. 부교감 신경이 직접 만들지 않아요.', '낮아진 혈당을 감지하면 글루카곤과 교감 신경이 작용해요(운동 곡선에서 확인해 봐요).'],
        explain: '혈당이 낮아지면 <b>글루카곤(호르몬 경로)</b>과 <b>교감 신경(신경 경로)</b>이 간의 <b>글리코젠 분해</b>를 늘려 혈당을 올려요. 높을 때는 <b>인슐린</b>이 반대로 작용해서, 두 호르몬이 혈당을 설정값 근처로 유지해요.',
      },
    ],
  },
  {
    title: '체온 · 삼투압: 시상 하부가 이끄는 조절', short: '체온·삼투압', icon: '🌡️', phase: '탐구',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혈당이 신경과 호르몬 경로로 조절되는 것을 봤어요. <b>체온</b>과 <b>삼투압</b>에서도 감지는 <b>시상 하부</b>, 효과는 <b>신경과 호르몬</b>으로 나타나요. 각 경로를 카드로 완성해 봐요.</div>' +
      '<p>🥶 추움 · 🥵 더움 · 💦 땀 많이 흘림 · 🥤 물 많이 마심, 네 시나리오를 차례로 골라 몸의 반응(피부 혈관 · 땀 · 떨림, 콩팥의 물 재흡수 · 오줌)을 보고, <b>변화 → 감지 → 시상 하부 → 효과기 → 결과</b> 순서로 카드를 배열해요.</p>',
    features: ['tmp'],
    setup() { resetTmp(); setScene('tmp'); },
    recap: '체온은 열 발생과 열 방출을, 삼투압은 항이뇨 호르몬과 콩팥의 물 재흡수를 조절해 시상 하부의 감지로 일정하게 유지돼요.',
    summary: '<ul><li><b>추울 때</b>: 시상 하부 → 교감 신경(피부 혈관 수축, 근육 떨림, 땀 분비 감소) + 호르몬(물질대사 촉진) → 열 발생↑ · 열 방출↓.</li><li><b>더울 때</b>: 피부 혈관 확장, 땀 분비 증가 → 열 방출↑.</li><li><b>삼투압↑</b>(땀을 많이 흘림): 시상 하부 감지 → 뇌하수체 후엽에서 <b>항이뇨 호르몬(ADH)</b>↑ → 콩팥 물 재흡수↑ → 오줌 양↓ · 농도↑ (갈증은 신경 경로).</li><li><b>삼투압↓</b>(물을 많이 마심): ADH↓ → 물 재흡수↓ → 오줌 양↑ · 농도↓.</li></ul>',
    missions: [
      {
        title: '네 시나리오의 조절 경로 완성', manual: true,
        goal: '시나리오 4개 모두에서 카드를 <b>변화 → 감지 → 시상 하부 → 효과기(신경 · 호르몬) → 결과</b> 순서로 배열하고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '모든 경로는 변화를 감지하고 시상 하부가 조절 명령을 낸 뒤, 신경이나 호르몬이 효과기에 작용해서 결과가 변화를 되돌리는 순서예요.',
        setup() { setScene('tmp'); },
        check() {
          const tm = S.tmp, cr = tm.ro[tm.cur];
          if (!cr.solved) cr.markBad(cr.wrongIds()); else cr.clearBad();
          for (let i = 0; i < 4; i++) if (!tm.ro[i].solved) return '「' + TSC[i].name.replace(/^\S+\s/, '') + '」 시나리오의 카드 순서가 아직 맞지 않아요' + (i === tm.cur ? '(빨간 카드).' : '. 시나리오 버튼으로 바꿔서 확인해요.');
          return true;
        },
        status: () => '맞춘 시나리오 ' + S.tmp.ro.filter((r) => r.solved).length + ' / 4',
        explain: '네 경로 모두 <b>변화 → 감지 → 시상 하부 → 효과기 → 결과</b>의 음성 되먹임이에요. 추위에서는 <b>교감 신경 + 호르몬</b>이 열 발생을 늘리고, 삼투압 조절에서는 <b>항이뇨 호르몬</b>이 콩팥의 물 재흡수를 조절해요.',
      },
      {
        type: 'quiz', title: '추울 때 피부 혈관이 수축하는 까닭',
        goal: '추울 때 <b>피부 혈관이 수축</b>하는 까닭으로 알맞은 것은?',
        setup() { setScene('tmp'); },
        choices: ['피부로 흐르는 혈액이 줄어 몸 밖으로 빠져나가는 열(열 방출)을 줄이기 위해', '피부로 더 많은 열을 내보내서 체온을 낮추기 위해', '땀을 더 많이 내기 위해', '혈당을 올리기 위해'],
        answer: 0,
        feedback: ['', '열을 내보내려면 혈관이 확장돼요(더울 때). 추울 때는 반대예요.', '추울 때는 땀 분비가 줄어요. 땀은 더울 때 열 방출을 늘려요.', '혈당 조절은 인슐린과 글루카곤이 맡고, 피부 혈관과는 관계가 적어요.'],
        explain: '피부 혈관이 <b>수축</b>하면 피부 가까이 흐르는 혈액이 줄어 <b>열 방출이 감소</b>해요. 근육 떨림과 물질대사 촉진으로 <b>열 발생</b>은 늘어나서 체온이 설정값으로 회복돼요.',
      },
      {
        type: 'quiz', title: '땀 뒤에 오줌이 진해지는 까닭',
        goal: '땀을 많이 흘린 뒤 <b>오줌이 진하고 적어지는</b> 까닭으로 알맞은 것은?',
        setup() { setScene('tmp'); },
        choices: ['삼투압이 높아져 항이뇨 호르몬(ADH)이 늘고, 콩팥에서 물 재흡수가 늘기 때문', '삼투압이 낮아져 항이뇨 호르몬이 줄기 때문', '교감 신경이 방광을 직접 수축시키기 때문', '땀과 오줌은 서로 관계가 없기 때문'],
        answer: 0,
        feedback: ['', '삼투압이 낮아질 때는 ADH가 줄고 오줌이 많고 묽어져요(물을 많이 마셨을 때).', '방광 수축은 오줌 배출과 관련이 있고, 오줌의 양과 농도는 콩팥의 물 재흡수가 결정해요.', '땀으로 수분을 잃으면 혈장 삼투압이 올라 오줌의 양과 농도에도 영향을 줘요.'],
        explain: '땀으로 수분이 줄면 <b>혈장 삼투압이 올라가고</b>, 시상 하부가 감지해 뇌하수체 후엽에서 <b>항이뇨 호르몬</b>이 더 분비돼요. 콩팥에서 <b>물 재흡수가 늘어</b> 오줌은 적고 진해져요.',
      },
    ],
  },
  {
    title: '스마트 헬스케어: 센서로 보는 항상성', short: '헬스케어', icon: '⌚', phase: '적용',
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 체온 · 혈당 · 삼투압이 되먹임으로 유지되는 과정을 살펴봤어요. 이번에는 <b>가상 웨어러블 센서</b>(심박 · 피부 온도 · 연속 혈당) 자료에서 항상성 반응을 찾고, 스스로 <b>실험을 설계</b>해 봐요. 통합과학의 과학과 미래 사회(센서 · 빅데이터)와도 이어져요.</div>' +
      '<p>모든 데이터는 <b>교육용 가상 데이터</b>이고, 개인 정보는 입력하지 않아요. 센서 값은 <b>의학적 진단이나 조언이 아니에요</b>.</p>',
    features: ['smt'],
    setup() { resetSmt(); resetExp(); setScene('smt', 'log'); },
    recap: '센서 기록에서 운동 뒤 심박수가 회복되고 피부 온도가 내려가며 식후 혈당이 올랐다 돌아오는 항상성 반응을 읽을 수 있어요. 센서 값에는 개인차와 오차가 있어요.',
    summary: '<ul><li>가상 웨어러블 3종: 심박수 · 피부 온도 · 연속 혈당(교육용 데이터).</li><li>운동 전후 심박수(예시): 안정 70 → 달리기 중 150 → 1분 뒤 120 → 2분 뒤 100 → 5분 뒤 80 bpm. 피부 온도는 운동으로 오른 뒤 <b>땀 증발(열 방출)</b>로 내려가요.</li><li>식사별 혈당(예시): 흰밥은 60분에 최고 150 mg/dL, 현미 + 채소는 90분에 최고 125 mg/dL.</li><li><b>실험 설계</b>: 바꿀 조건은 하나만, 나머지는 같게 하고 측정 · 결과를 해석해요.</li><li>센서 값에는 <b>개인차와 측정 오차</b>가 있어 한 번의 값만으로 단정하지 않아요.</li></ul>',
    missions: [
      {
        title: '하루 기록에서 항상성 반응 찾기', manual: true,
        goal: '세 센서 그래프를 읽고 <b>세 질문</b>에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
        hint: '그래프를 끌어서 시각을 옮기면 값이 보여요. 달리기는 07:30~08:00, 점심은 12:00이에요. 달리기가 끝난 시각은 08:00이에요.',
        setup() { setScene('smt', 'log'); },
        check() {
          const ids = ['selQ1', 'selQ2', 'selQ3'], ans = ['b', 'b', 'a'];
          const r = ids.map((id, i) => SEL_OK(id, ans[i]));
          const empty = ids.filter((id) => $('#' + id).value === '').length;
          if (empty) return '아직 답하지 않은 질문이 ' + empty + '개 있어요.';
          if (r.some((x) => !x)) return '틀린 질문이 있어요(빨간 칸). 그래프에서 값을 다시 읽어 보세요.';
          return true;
        },
        status: () => '답한 질문 ' + ['selQ1', 'selQ2', 'selQ3'].filter((id) => $('#' + id).value !== '').length + ' / 3',
        explain: '달리기가 끝난 08:00의 5분 뒤(08:05) 심박수는 <b>약 80 bpm</b>으로 돌아와요. 흰밥 식사 뒤 혈당은 <b>60분에 150 mg/dL</b>로 가장 높고, 달리기 뒤 피부 온도는 <b>땀 증발로 열이 방출</b>되어 내려가요. 모두 항상성의 되돌림 반응이에요.',
      },
      {
        title: '실험 설계 · 측정 · 해석', manual: true,
        goal: '<b>질문</b>을 고르고 <b>바꿀 조건 1개</b>와 <b>같게 할 조건</b>을 정한 뒤, <b>📡 가상 센서로 측정</b>해서 <b>결과를 해석</b>하고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '질문이 묻는 조건 하나만 바꾸고 나머지(시각 · 센서 · 양 등)는 모두 같게 체크해요. 측정한 뒤 두 그래프를 비교해 결과 해석을 골라요.',
        setup() { setScene('smt', 'exp'); if (S.exp && S.exp.q) buildExp(); },
        check() {
          const e = S.exp; const sr = $('#selR'); sr.classList.remove('ok', 'bad');
          if (!e.q) return '먼저 ① 알아볼 질문을 골라요.';
          if (!expValid()) return expIssue();
          if (!e.measured) return '설계가 좋아요! 이제 📡 가상 센서로 측정해 보세요.';
          if (e.resp === '') return '④ 결과 해석을 골라 보세요.';
          if (+e.resp === EXQ[e.q].ans) { sr.classList.add('ok'); return true; }
          sr.classList.add('bad'); return '그래프와 표를 다시 비교해 보세요. 두 조건의 값 차이가 어느 쪽에서 더 큰가요?';
        },
        status: () => mark(!!S.exp.q) + ' 질문 &nbsp; ' + mark(expValid()) + ' 설계 &nbsp; ' + mark(S.exp.measured) + ' 측정 &nbsp; ' + mark(S.exp.measured && S.exp.resp !== '' && +S.exp.resp === EXQ[S.exp.q].ans) + ' 해석',
        explain: '좋은 실험은 <b>하나만 바꾸고 나머지는 같게</b> 해요. 달리기는 걷기보다 심박수가 80 bpm 근처로 돌아오는 데 오래 걸렸고, 흰밥은 현미 + 채소보다 최고 혈당이 높았어요(교육용 가상 결과).',
      },
      {
        type: 'quiz', title: '센서 데이터의 한계',
        goal: '웨어러블 센서 값을 해석할 때 가장 알맞은 태도는?',
        setup() { setScene('smt', 'exp'); },
        choices: ['개인차와 측정 오차가 있어서 한 번의 값만으로 단정하지 않고, 반복 측정과 전문가의 해석을 함께 살펴본다', '센서는 항상 정확하니 하루 값만으로 몸 상태를 진단해도 된다', '다른 사람의 값과 똑같아야 정상이다', '센서 기록은 항상성과 관계가 없다'],
        answer: 0,
        feedback: ['', '같은 설계로 다시 측정해도 값이 조금씩 달라졌어요. 센서에는 오차가 있고, 이 자료는 진단용이 아니에요.', '사람마다 안정 심박수 · 혈당 반응이 달라요(개인차).', '심박수 회복, 피부 온도, 혈당 곡선 모두 항상성 반응을 보여 줘요.'],
        explain: '센서 값에는 <b>개인차</b>와 <b>측정 오차</b>가 있어요. 한 번의 값만으로 단정하지 않고 <b>반복 측정</b>하며 변화의 모양을 보고, 건강 문제는 <b>전문가와 상담</b>해요.',
      },
    ],
  },
];

game = SciSim.game({
  simId: 'hb-homeostasis', mount: '#game', badge: '항상성 탐험가', homeHref: '../../index.html#hb',
  featureLabels: { fb: '🔁 방과 몸의 온도 조절 비교 · 짝짓기', glu: '🍬 혈당 곡선 · 호르몬과 신경 경로', tmp: '🌡️ 피부 · 콩팥 장면 · 경로 카드', smt: '⌚ 가상 웨어러블 · 실험 설계' },
  onFeatures() { updateCtl(); },
  levels,
});

/* ---------- 시작 ---------- */
resetFb(false); S.pair = { pl: newPair() }; resetGlu(); resetTmp(); resetSmt(); resetExp();
setScene('fb', 'exp');
let lastFree = false, lastKey = '';
SciSim.loop((dt, t) => {
  clock = t;
  if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
  const key = viewKey();
  if (key !== lastKey) { lastKey = key; updateCtl(); }
  view.apply();
  if (key === 'fb:exp') { stepFb(dt); drawFbScene(dt); }
  else if (key === 'fb:pair') drawPairScene(dt);
  else if (key === 'glu') { stepGlu(dt); drawGluScene(dt); }
  else if (key === 'tmp') { stepTmp(dt); drawTmpScene(dt); }
  else if (key === 'smt:log') drawSmtLog(dt);
  else drawExp(dt);
  if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,243,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
  readouts();
});

/* ---------- 디버그 (Playwright) ---------- */
window.__sim = {
  S, VW, VH, PHONE, get game() { return game; }, setScene, startDist, setFbMode, FBP, GLU, gluVal, SENS, EXQ, buildExp, expValid, measure, hhmm, TSC, newRo, expIssue,
  solveRo(i) { const ro = S.tmp.ro[i]; ro.order = ro.o.solution.map((id) => ro.cards.findIndex((c) => c.id === id)); ro.snap(true); updateCtl(); },
  solvePl(pl) { pl.chips.forEach((c) => { const t = pl.targets.find((q) => q.ans === c.id && !pl.chips.some((o) => o.zone === q.id)); if (t) c.zone = t.id; }); pl.layout(true); pl.follow(); },
  fast(sec) { for (let i = 0; i < Math.ceil(sec / 0.05); i++) { if (S.mode === 'fb') stepFb(0.05); else if (S.mode === 'glu') stepGlu(0.05); } },
};

})();
