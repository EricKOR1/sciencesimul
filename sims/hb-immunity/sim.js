/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 선천적·후천적 면역
   성취기준 [12생과02-05] 병원체의 종류와 특징을 이해하고 우리 몸의 방어 작용을 선천적 면역과 후천적 면역으로 구분하여 설명할 수 있다. (뒷부분: 방어 작용)
   ① 관찰: 선천적 방어  ② 모형: 림프구  ③ 분석: 기억 세포  ④ 적용: 면역 구분
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  /* ===== 공통 도구 (화면 · 글자 · 카드 · 표 · 그래프 · 세포 그림) ===== */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let clock = 0;

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef7f0' });
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
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pick = (arr, rg) => arr[Math.floor(rg() * arr.length) % arr.length];

  /* 포인터를 현재 장면의 처리기로 넘겨요 */
  let PT = null;
  SciSim.pointer(view, {
    down(p, e) { return PT && PT.down ? !!PT.down(p, e) : false; },
    move(p, e) { if (PT && PT.move) PT.move(p, e); },
    up(p, e) { if (PT && PT.up) PT.up(p, e); },
    hover(p) { return PT && PT.hover ? PT.hover(p) : 'default'; },
  });

  /* ---------- 카드 그리기 ---------- */
  function drawCard(c) {
    ctx.save();
    const w = c.w, h = c.h, cx = c.x + w / 2, cy = c.y + h / 2;
    ctx.translate(cx, cy); const s = 1 + c.lift * 0.06; ctx.scale(s, s);
    const sh = c.shake > 0 && !RM ? Math.sin(clock * 60) * 3 * c.shake : 0; ctx.translate(sh, 0);
    const r = Math.min(12, h / 2.4);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, r); ctx.fillStyle = c.bad ? '#fdeceb' : (c.sel ? '#fff8dc' : (c.fill || '#fff')); ctx.fill(); }, { blur: 5 + c.lift * 10, y: 2 + c.lift * 4 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.sel ? '#f59e0b' : C.shade(c.col || '#16a34a', 0.15); ctx.lineWidth = c.bad || c.sel ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
    const chip = h < 36;
    if (chip) {
      TF(0, 5, w > 300 ? c.label : (c.short || c.label), w - 10, clamp(h * 0.58, 11, 14), 10.5, '#26324a', 'center', 800);
    } else {
      let lx = -w / 2 + 10, maxW = w - 20;
      if (c.wrap) {
        const ls = wrap(c.label, w - 22, c.wsize || 13, 800).slice(0, Math.max(1, Math.floor((h - 12) / ((c.wsize || 13) + 4)))), lh = (c.wsize || 13) + 4, y0 = -(ls.length - 1) * lh / 2;
        ls.forEach((l, i) => T(0, y0 + i * lh + 4.5, l, c.wsize || 13, '#26324a', 'center', 800));
        ctx.restore(); return;
      }
      if (c.icon) { T(-w / 2 + 12 + 12, 7, c.icon, 22, '#26324a', 'center', 600); lx = -w / 2 + 40; maxW = w - 48; }
      if (c.sub) {
        TF(lx, -2, c.label, maxW, 14.5, 12, '#26324a', 'left', 800);
        TF(lx, 16, c.sub, maxW, 12, 10.5, '#5a6679', 'left', 700);
      } else {
        const sz = fitSize(c.label, maxW, 14.5, 12.5, 800);
        ctx.save(); ctx.font = D.font(sz, 800);
        if (ctx.measureText(c.label).width > maxW && h >= 44) {
          const ls = wrap(c.label, maxW, 12.5, 800).slice(0, 2);
          ls.forEach((l, i) => T(lx, (ls.length === 1 ? 5 : -2 + i * 15), l, 12.5, '#26324a', 'left', 800));
        } else T(lx, 5, c.label, sz, '#26324a', 'left', 800);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ================= 카드 분류기 (끌어서 상자에 넣기, 눌러서 선택) =================
     o.cards: [{id, label, short, icon, col, sub}]   o.boxes: [{id, label, col, x, y, w, h, cols, hdr}]
     o.tray(i) -> {x, y}   o.cw, o.ch: 카드 크기   o.kh: 상자 속 칩 높이   o.onTap(card)   o.onChange() */
  class Sorter {
    constructor(o) {
      this.o = o; this.boxes = o.boxes; this.seq = 0; this.drag = null; this.hot = null;
      this.cards = o.cards.map((d, i) => { const p = o.tray(i); return Object.assign({}, d, { x: p.x, y: p.y, w: o.cw, h: o.ch, zone: null, lift: 0, bad: false, shake: 0, home: p, seq: 0, sel: false }); });
    }
    boxAt(p) { for (const b of this.boxes) if (inRect(p.x, p.y, b)) return b; return null; }
    chipRect(box, k, n) {
      const cols = box.cols || 2, gap = 6, rows = Math.max(1, Math.ceil(n / cols));
      const kw = (box.w - gap * (cols + 1)) / cols, hdr = box.hdr || 26, avail = box.h - hdr - 6;
      const sp = Math.min(this.o.kh + 4, avail / rows), col = k % cols, row = Math.floor(k / cols);
      return { x: box.x + gap + col * (kw + gap), y: box.y + hdr + 1 + row * sp, w: kw, h: Math.max(18, Math.min(this.o.kh, sp - 3)) };
    }
    layout(instant) {
      this.boxes.forEach((b) => {
        const mem = this.cards.filter((c) => c.zone === b.id).sort((a, c) => a.seq - c.seq);
        mem.forEach((c, k) => { if (this.drag && this.drag.c === c) return; const r = this.chipRect(b, k, mem.length); this.moveTo(c, r.x, r.y, r.w, r.h, instant); });
      });
      this.cards.forEach((c) => { if (!c.zone && !(this.drag && this.drag.c === c)) this.moveTo(c, c.home.x, c.home.y, this.o.cw, this.o.ch, instant); });
    }
    moveTo(c, x, y, w, h, instant) {
      if (instant || RM) { c.x = x; c.y = y; c.w = w; c.h = h; return; }
      SciSim.tween(c, { x, y, w, h }, { duration: 0.35, ease: 'outBack' });
    }
    place(c, zoneId) {
      const was = c.zone; c.zone = zoneId || null; c.bad = false; if (zoneId) c.seq = ++this.seq; c.lift = 0;
      this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.layout(); this.o.onChange && this.o.onChange(); }
    get placed() { return this.cards.filter((c) => c.zone).length; }
    markBad(ids) {
      this.cards.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; });
    }
    down(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const c = this.cards[i];
        if (inRect(p.x, p.y, c)) {
          SciSim.tween(c, { x: c.x, y: c.y, w: c.w, h: c.h }, { duration: 0.0001 });
          this.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
          this.cards.splice(i, 1); this.cards.push(c); Sound.tick(); return true;
        }
      }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
      if (d.moved) { d.c.x = clamp(p.x - d.dx, 0, VW - d.c.w); d.c.y = clamp(p.y - d.dy, 0, VH - d.c.h); this.hot = this.boxAt(p); }
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null; this.hot = null; const c = d.c;
      if (!d.moved) { this.layout(); this.o.onTap && this.o.onTap(c); return; }
      const b = this.boxAt(p); this.place(c, b ? b.id : null); if (!b) this.layout();
    }
    hover(p) { return this.cards.some((c) => inRect(p.x, p.y, c)) ? 'grab' : 'default'; }
    update(dt) {
      this.cards.forEach((c) => { c.lift = SciSim.approach(c.lift, this.drag && this.drag.c === c && this.drag.moved ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); });
    }
    drawBoxes() {
      this.boxes.forEach((b) => {
        const hot = this.hot === b;
        D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(b.col, hot ? 0.28 : 0.13); ctx.fill();
        ctx.setLineDash([7, 5]); ctx.strokeStyle = C.rgba(b.col, hot ? 1 : 0.7); ctx.lineWidth = hot ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
        TF(b.x + b.w / 2, b.y + (b.hdr || 26) - 8, b.label, b.w - 16, 14.5, 12, C.shade(b.col, -0.35), 'center', 800);
      });
    }
    drawCards() { this.cards.forEach((c) => { c.sel = !!(this.o.isSel && this.o.isSel(c)); drawCard(c); }); }
    draw() { this.drawBoxes(); this.drawCards(); }
  }

  /* ================= 짝짓기 (카드 한 장씩 칸에 끼우기) =================
     o.cards: [{id,label,...}]  o.slots: [{id, x, y, w, h, card:{x,y,w,h}, label, col}]  o.tray(i) -> {x,y}  o.cw o.ch
     한 칸에는 카드 한 장. 이미 있으면 그 카드는 제자리로 돌아가요. */
  class Matcher {
    constructor(o) {
      this.o = o; this.slots = o.slots; this.drag = null; this.hot = null;
      this.cards = o.cards.map((d, i) => { const p = o.tray(i); return Object.assign({}, d, { x: p.x, y: p.y, w: o.cw, h: o.ch, slot: null, lift: 0, bad: false, shake: 0, home: p, sel: false }); });
    }
    slotAt(p) { for (const s of this.slots) if (inRect(p.x, p.y, s)) return s; return null; }
    cardIn(slotId) { return this.cards.find((c) => c.slot === slotId && !(this.drag && this.drag.c === c)) || null; }
    layout(instant) {
      this.cards.forEach((c) => {
        if (this.drag && this.drag.c === c) return;
        if (c.slot) { const s = this.slots.find((q) => q.id === c.slot); this.moveTo(c, s.card.x, s.card.y, s.card.w, s.card.h, instant); }
        else this.moveTo(c, c.home.x, c.home.y, this.o.cw, this.o.ch, instant);
      });
    }
    moveTo(c, x, y, w, h, instant) {
      if (instant || RM) { c.x = x; c.y = y; c.w = w; c.h = h; return; }
      SciSim.tween(c, { x, y, w, h }, { duration: 0.35, ease: 'outBack' });
    }
    place(c, slotId) {
      const was = c.slot;
      if (slotId) { const o = this.cards.find((q) => q !== c && q.slot === slotId); if (o) { o.slot = was && was !== slotId ? was : null; o.bad = false; } }
      c.slot = slotId || null; c.bad = false; c.lift = 0;
      this.layout(); if (was !== c.slot) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.slot = null; c.bad = false; }); this.drag = null; this.layout(); this.o.onChange && this.o.onChange(); }
    get placed() { return this.cards.filter((c) => c.slot).length; }
    markBad(ids) { this.cards.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; }); }
    down(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const c = this.cards[i];
        if (inRect(p.x, p.y, c)) {
          SciSim.tween(c, { x: c.x, y: c.y, w: c.w, h: c.h }, { duration: 0.0001 });
          this.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
          this.cards.splice(i, 1); this.cards.push(c); Sound.tick(); return true;
        }
      }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
      if (d.moved) { d.c.x = clamp(p.x - d.dx, 0, VW - d.c.w); d.c.y = clamp(p.y - d.dy, 0, VH - d.c.h); this.hot = this.slotAt(p); }
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null; this.hot = null; const c = d.c;
      if (!d.moved) { this.layout(); this.o.onTap && this.o.onTap(c); return; }
      const s = this.slotAt(p); this.place(c, s ? s.id : null); if (!s) this.layout();
    }
    hover(p) { return this.cards.some((c) => inRect(p.x, p.y, c)) ? 'grab' : 'default'; }
    update(dt) { this.cards.forEach((c) => { c.lift = SciSim.approach(c.lift, this.drag && this.drag.c === c && this.drag.moved ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); }); }
    drawSlots() {
      this.slots.forEach((s) => {
        const hot = this.hot === s, col = s.col || '#16a34a';
        D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fillStyle = C.rgba(col, hot ? 0.24 : 0.1); ctx.fill();
        ctx.strokeStyle = C.rgba(col, hot ? 1 : 0.55); ctx.lineWidth = hot ? 3 : 1.5; ctx.stroke();
        const cr = s.card;
        D.roundRect(cr.x, cr.y, cr.w, cr.h, 9); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
        ctx.setLineDash([5, 4]); ctx.strokeStyle = C.rgba(col, 0.8); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
        if (s.draw) s.draw(s);
      });
    }
    drawCards() {
      this.cards.forEach((c) => { if (!(this.drag && this.drag.c === c)) { c.sel = !!(this.o.isSel && this.o.isSel(c)); drawCard(c); } });
      if (this.drag) { this.drag.c.sel = false; drawCard(this.drag.c); }
    }
    draw() { this.drawSlots(); this.drawCards(); }
  }

  /* ================= 순서 배열기 (끌어서 칸 바꾸기) =================
     o.items: [{id, label, short, icon, col}]  o.slots: [{x, y}]  o.cw, o.ch  o.solution: [id, ...]  o.onChange() */
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
        const nm = this.o.slotNames ? this.o.slotNames[s] : String(s + 1);
        T(sl.x + this.o.cw / 2, sl.y + this.o.ch / 2 + 5, nm, 13, '#9aa7b6', 'center', 800);
      });
    }
    drawCards() { this.cards.forEach((c) => { if (!(this.drag && this.drag.c === c)) drawCard(c); }); if (this.drag) drawCard(this.drag.c); }
    draw() { this.drawSlots(); this.drawCards(); }
  }

  /* ================= 표 채우기 (칸을 눌러 보기를 돌려요) =================
     o: {x,y,w, headH, rowH, labW, cols:[{label, opts:[..]}], rows:[label], ans:[[i,..],..] (정답 보기 번호), onChange} */
  class CellTable {
    constructor(o) {
      this.o = o; this.nr = o.rows.length; this.nc = o.cols.length;
      this.val = o.rows.map(() => o.cols.map(() => -1));
      this.bad = o.rows.map(() => o.cols.map(() => false));
      this.shk = o.rows.map(() => o.cols.map(() => 0));
      this.ok = false;
    }
    cellRect(r, c) { const o = this.o, cw = (o.w - o.labW) / this.nc; return { x: o.x + o.labW + c * cw, y: o.y + o.headH + r * o.rowH, w: cw, h: o.rowH }; }
    get h() { return this.o.headH + this.nr * this.o.rowH; }
    reset() { this.val.forEach((r) => r.fill(-1)); this.bad.forEach((r) => r.fill(false)); this.ok = false; this.o.onChange && this.o.onChange(); }
    get filled() { let n = 0; this.val.forEach((r) => r.forEach((v) => { if (v >= 0) n++; })); return n; }
    get total() { return this.nr * this.nc; }
    wrongCells() { const w = []; this.val.forEach((row, r) => row.forEach((v, c) => { const a = this.o.ans[r][c]; if (v !== a) w.push([r, c]); })); return w; }
    markBad(list) {
      this.bad.forEach((row, r) => row.forEach((_, c) => { const b = list.some((q) => q[0] === r && q[1] === c); if (b && !this.bad[r][c]) this.shk[r][c] = 1; this.bad[r][c] = b; }));
    }
    down(p) {
      for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) {
        if (inRect(p.x, p.y, this.cellRect(r, c))) {
          if (this.o.locked && this.o.locked(r, c)) { this.o.onLocked && this.o.onLocked(r, c); return false; }
          const n = this.o.cols[c].opts.length; this.val[r][c] = this.val[r][c] + 1 >= n ? 0 : this.val[r][c] + 1; this.bad[r][c] = false; Sound.click(); this.o.onChange && this.o.onChange(); return false;
        }
      }
      return false;
    }
    hover(p) { for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) if (inRect(p.x, p.y, this.cellRect(r, c))) return 'pointer'; return 'default'; }
    update(dt) { this.shk.forEach((row) => row.forEach((_, c) => { row[c] = Math.max(0, row[c] - dt * 3); })); }
    draw() {
      const o = this.o;
      D.roundRect(o.x, o.y, o.w, this.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#cfd8d2'; ctx.lineWidth = 1.5; ctx.stroke();
      const cw = (o.w - o.labW) / this.nc;
      ctx.fillStyle = '#e6f3ea'; D.roundRect(o.x, o.y, o.w, o.headH, 10); ctx.fill();
      o.cols.forEach((col, c) => TF(o.x + o.labW + c * cw + cw / 2, o.y + o.headH / 2 + 5, col.label, cw - 8, 13.5, 10.5, '#14532d', 'center', 800));
      for (let r = 0; r < this.nr; r++) {
        const y = o.y + o.headH + r * o.rowH;
        ctx.strokeStyle = '#e1e8e3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(o.x + o.w, y); ctx.stroke();
        TF(o.x + 8, y + o.rowH / 2 + 5, o.rows[r], o.labW - 12, 13.5, 10.5, '#26324a', 'left', 800);
        for (let c = 0; c < this.nc; c++) {
          const cr = this.cellRect(r, c), v = this.val[r][c], bad = this.bad[r][c], locked = o.locked && o.locked(r, c);
          const sx = this.shk[r][c] > 0 && !RM ? Math.sin(clock * 60) * 3 * this.shk[r][c] : 0;
          const x = cr.x + 4 + sx, yy = cr.y + 4, w = cr.w - 8, h = cr.h - 8;
          D.roundRect(x, yy, w, h, 8);
          ctx.fillStyle = bad ? '#fdeceb' : this.ok ? '#e6f7ec' : v >= 0 ? '#fff8dc' : '#f4f7f5'; ctx.fill();
          ctx.strokeStyle = bad ? '#e2464b' : this.ok ? '#34b36a' : v >= 0 ? '#f0b429' : '#cdd6d0'; ctx.lineWidth = bad ? 2.5 : 1.8;
          if (v < 0) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
          if (v >= 0) TF(x + w / 2, yy + h / 2 + 5, o.cols[c].opts[v], w - 8, 13.5, 10, '#26324a', 'center', 800);
          else T(x + w / 2, yy + h / 2 + 5, locked ? '—' : '눌러서 고르기', locked ? 15 : 11.5, '#98a5a0', 'center', 700);
        }
      }
    }
  }

  /* ================= 그래프 도우미 =================
     const P = plotBox({x,y,w,h}, {x0,x1,y0,y1, xt:[..], yt:[..], xl:'가로 이름 (단위)', yl:'세로 이름 (단위)', xf, yf}) */
  function plotBox(b, o) {
    const P = { b, o };
    P.X = (v) => b.x + (v - o.x0) / (o.x1 - o.x0) * b.w;
    P.Y = (v) => b.y + b.h - (v - o.y0) / (o.y1 - o.y0) * b.h;
    P.vx = (px) => o.x0 + (px - b.x) / b.w * (o.x1 - o.x0);
    P.vy = (py) => o.y0 + (b.y + b.h - py) / b.h * (o.y1 - o.y0);
    P.drawAxes = function () {
      ctx.save();
      D.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      ctx.strokeStyle = '#e4ebe6'; ctx.lineWidth = 1;
      (o.yt || []).forEach((v) => { const y = P.Y(v); ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); });
      (o.xt || []).forEach((v) => { const x = P.X(v); ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); });
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
      const fs = PHONE ? 11.5 : 12.5;
      (o.xt || []).forEach((v) => T(P.X(v), b.y + b.h + 16, o.xf ? o.xf(v) : String(v), fs, '#3a4456', 'center', 700));
      (o.yt || []).forEach((v) => T(b.x - 6, P.Y(v) + 4, o.yf ? o.yf(v) : String(v), fs, '#3a4456', 'right', 700));
      if (o.xl) T(b.x + b.w / 2, b.y + b.h + 34, o.xl, PHONE ? 12 : 13, '#26324a', 'center', 800);
      if (o.yl) { ctx.translate(b.x - (o.ylx || 42), b.y + b.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, o.yl, PHONE ? 12 : 13, '#26324a', 'center', 800); }
      ctx.restore();
    };
    return P;
  }

  /* ================= 세포 · 분자 그림 ================= */
  function drawRBC(x, y, r, rot, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, o.light || '#ff8a85'); g.addColorStop(0.7, o.col || '#e2464b'); g.addColorStop(1, o.dark || '#a8242c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,30,.55)'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
    const dg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55); dg.addColorStop(0, 'rgba(130,20,30,.42)'); dg.addColorStop(1, 'rgba(130,20,30,0)');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* 항원 도형: kind 'sq' | 'tri' | 'ci' | 'di' (사각 · 삼각 · 원 · 마름모) */
  const AGCOL = { tri: '#f97316', ci: '#3b82f6', sq: '#10b981', di: '#a855f7' };
  function agPath(kind, s) {
    ctx.beginPath();
    if (kind === 'sq') { ctx.rect(-s, -s, s * 2, s * 2); }
    else if (kind === 'tri') { ctx.moveTo(0, -s * 1.15); ctx.lineTo(s * 1.1, s * 0.85); ctx.lineTo(-s * 1.1, s * 0.85); ctx.closePath(); }
    else if (kind === 'ci') { ctx.arc(0, 0, s * 1.05, 0, TAU); }
    else { ctx.moveTo(0, -s * 1.25); ctx.lineTo(s * 1.1, 0); ctx.lineTo(0, s * 1.25); ctx.lineTo(-s * 1.1, 0); ctx.closePath(); }
  }
  function drawAg(kind, x, y, s, rot, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const col = o.col || AGCOL[kind];
    agPath(kind, s); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = Math.max(1, s * 0.16); ctx.lineJoin = 'round'; ctx.stroke();
    if (o.text) { ctx.rotate(-(rot || 0)); T(0, s * 0.38, o.text, Math.max(9, s * 1.05), '#fff', 'center', 900); }
    ctx.restore();
  }
  /* 항체(Y자): (x, y) = 몸통 아래 끝, 위쪽이 결합 부위. size = 팔 길이, open = 팔이 벌어진 각도(rad). 결합 부위 끝에 항원 모양 홈 */
  function abTips(x, y, size, rot, open) {
    const a1 = rot - open, a2 = rot + open;
    const jx = x + Math.sin(rot) * size * 0.9, jy = y - Math.cos(rot) * size * 0.9;
    return [{ x: jx + Math.sin(a1) * size, y: jy - Math.cos(a1) * size, a: a1 }, { x: jx + Math.sin(a2) * size, y: jy - Math.cos(a2) * size, a: a2 }, { x: jx, y: jy }];
  }
  function drawAb(x, y, size, rot, kind, o) {
    o = o || {};
    const open = o.open != null ? o.open : 0.62, col = o.col || '#475569';
    const tips = abTips(x, y, size, rot, open), j = tips[2];
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, size * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(j.x, j.y); ctx.stroke();
    tips.slice(0, 2).forEach((t) => { ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.lineTo(t.x, t.y); ctx.stroke(); });
    tips.slice(0, 2).forEach((t) => {
      const s = size * 0.3;
      ctx.save(); ctx.translate(t.x, t.y);
      // 결합 부위: 항원 모양의 홈을 가진 머리
      ctx.fillStyle = kind ? AGCOL[kind] : col; ctx.globalAlpha *= 0.28; agPath(kind || 'sq', s * 1.5); ctx.fill(); ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      ctx.strokeStyle = kind ? AGCOL[kind] : col; ctx.lineWidth = Math.max(1.6, size * 0.12); ctx.setLineDash([size * 0.18, size * 0.14]); agPath(kind || 'sq', s * 1.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    });
    ctx.restore();
    return tips;
  }

  /* 바이러스 · 세균 · 곰팡이 등 병원체 그림 */
  function drawVirus(x, y, r, rot, col) {
    col = col || '#7c3aed';
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.strokeStyle = C.shade(col, -0.1); ctx.lineWidth = Math.max(1.2, r * 0.14);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r * 1.38, Math.sin(a) * r * 1.38); ctx.stroke(); D.sphere(Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42, Math.max(1.3, r * 0.14), C.shade(col, 0.2), { gloss: false }); }
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, C.shade(col, 0.5)); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, r * 0.13); ctx.beginPath();
    ctx.moveTo(-r * 0.45, r * 0.1); ctx.bezierCurveTo(-r * 0.2, -r * 0.5, r * 0.1, r * 0.5, r * 0.45, -r * 0.1); ctx.stroke();
    ctx.restore();
  }
  function drawBact(x, y, r, rot, col, o) {
    o = o || {};
    col = col || '#16a34a';
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    const L = r * (o.len || 1.9), sq = o.squeeze || 0;
    const body = (grow) => {
      ctx.beginPath();
      const hw = r * 0.62 * grow;
      ctx.moveTo(-L + hw, -hw); ctx.lineTo(L - hw, -hw); ctx.arc(L - hw, 0, hw, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-L + hw, hw); ctx.arc(-L + hw, 0, hw, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    };
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    // 세포벽(바깥)과 세포막(안쪽)
    body(1.0); ctx.fillStyle = C.rgba(col, 0.28); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.stroke();
    ctx.save(); ctx.scale(0.86, 0.72); body(1.0); ctx.fillStyle = C.rgba(col, 0.55); ctx.fill(); ctx.restore();
    if (sq > 0) { // 잘록해지는 분열 모습: 가운데를 하얗게 가르기
      ctx.fillStyle = 'rgba(255,255,255,.95)'; const w = r * 0.5 * sq; ctx.fillRect(-w / 2, -r * 0.9, w, r * 1.8);
    }
    if (o.dna !== false) { ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); for (let i = 0; i <= 12; i++) { const px = -L * 0.5 + (L * i) / 12, py = Math.sin(i * 1.4) * r * 0.22; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
    if (o.flagella) { ctx.strokeStyle = C.shade(col, -0.2); ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.moveTo(-L, 0); for (let i = 1; i <= 8; i++) ctx.lineTo(-L - i * r * 0.35, Math.sin(i * 1.3 + clock * 6) * r * 0.35); ctx.stroke(); }
    ctx.restore();
  }
  function drawBlob(x, y, r, col, rim, seed) { // 일반적인 세포(둥근 모양)
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU; const k = 1 + 0.05 * Math.sin(a * 3 + (seed || 0) + clock * 1.2); const px = Math.cos(a) * r * k, py = Math.sin(a) * r * k; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = C.rgba(col, 0.5); ctx.fill(); ctx.strokeStyle = rim || C.shade(col, -0.3); ctx.lineWidth = Math.max(1.4, r * 0.08); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 단순한 점등 램프 (응집 / 안 함) ---------- */
  function lamp(x, y, r, on, col) {
    if (on) D.glow(x, y, r * 2.4, col || '#ef4444', 0.55);
    D.sphere(x, y, r, on ? (col || '#ef4444') : '#d1d5db', { gloss: true });
  }

  /* ============ 장면 관리 (툴바 단추 · 보기 단추 · 조작 상자 보이기) ============ */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let game = null;
  const viewKey = () => S.mode + (SCENES[S.mode].subs ? ':' + S.sub[S.mode] : '');
  function setScene(mode, sub) {
    const changed = S.mode !== mode || (sub && S.sub[mode] !== sub);
    if (sub) S.sub[mode] = sub;
    if (changed) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = SCENES[mode].label;
    onEnterView(); updateCtl();
  }
  function updateCtl() {
    const key = viewKey();
    $$('#ctrlCard [data-v]').forEach((n) => { n.hidden = n.getAttribute('data-v').split(' ').indexOf(key) < 0; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const sc = SCENES[S.mode], seg = $('#subSeg');
    if (sc.subs) {
      seg.hidden = false;
      if (seg.dataset.for !== S.mode) {
        seg.dataset.for = S.mode; seg.innerHTML = '';
        sc.subs.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.sub = s[0]; b.textContent = s[1]; b.addEventListener('click', () => { Sound.click(); setScene(S.mode, s[0]); }); seg.appendChild(b); });
      }
      $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sub === S.sub[S.mode]));
    } else seg.hidden = true;
    syncControls();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  let rlast = '';
  function setReadouts(a) { // a: [[label, value], ...]
    const key = JSON.stringify(a);
    if (key === rlast) return; rlast = key;
    [[l1, v1], [l2, v2], [l3, v3]].forEach((p, i) => { p[0].textContent = a[i] ? a[i][0] : ''; p[1].innerHTML = a[i] ? a[i][1] : ''; p[1].parentElement.style.visibility = a[i] ? '' : 'hidden'; });
  }
  const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); return e; };
  /* 보기 단추 묶음: seg(selector, attr, getter, setter) */
  function bindSeg(sel, attr, setter) {
    $$(sel + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setter(b.dataset[attr]); syncControls(); }));
  }
  function markSeg(sel, attr, cur) { $$(sel + ' button').forEach((b) => b.classList.toggle('on', b.dataset[attr] === String(cur))); }

  /* ---------- 면역 세포 그림 ---------- */
  function starP(x, y, R, r, n) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const rad = i % 2 ? r : R, a = (i / (n * 2)) * TAU - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); }
  const CELLCOL = { B: '#60a5fa', Th: '#fb923c', Tc: '#ef4444', plasma: '#3b82f6', mem: '#38bdf8', phag: '#fcd34d', inf: '#fbb6c4' };
  const CELLNAME = { B: 'B 림프구', Th: '보조 T 림프구', Tc: '세포독성 T 림프구', plasma: '형질 세포', mem: '기억 B 세포', phag: '식세포' };
  /* kind: 'B' | 'Th' | 'Tc' | 'plasma' | 'mem' | 'phag' | 'inf'. o: {glow, rec:{kind,n}, ag:[kind,...], alpha, rot, nolabel, squash} */
  function drawCell(kind, x, y, r, o) {
    o = o || {};
    const col = CELLCOL[kind], t = clock;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow > 0.02) D.glow(x, y, r * 2.1, kind === 'Tc' ? '#fb7185' : '#fde047', clamp(o.glow, 0, 1) * 0.75);
    ctx.translate(x, y); ctx.rotate(o.rot || 0);
    if (o.squash) ctx.scale(1 + o.squash, 1 - o.squash);
    // 세포막
    ctx.beginPath();
    if (kind === 'phag' || kind === 'inf') {
      for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, k = 1 + (kind === 'phag' ? 0.11 : 0.05) * Math.sin(a * 5 + t * 1.8) + 0.05 * Math.sin(a * 3 - t * 1.1); const px = Math.cos(a) * r * k, py = Math.sin(a) * r * k; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    } else ctx.arc(0, 0, r, 0, TAU);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, C.shade(col, 0.5)); g.addColorStop(0.7, col); g.addColorStop(1, C.shade(col, -0.18));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.45); ctx.lineWidth = Math.max(1.4, r * 0.07); ctx.stroke();
    if (kind === 'plasma') { // 소포체 물결
      ctx.strokeStyle = C.rgba('#1e3a8a', 0.55); ctx.lineWidth = Math.max(1, r * 0.05);
      for (let q = 0; q < 3; q++) { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr = r * (0.66 + q * 0.11) + Math.sin(a * 6 + q) * r * 0.025; if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); }
    }
    // 핵
    if (kind === 'phag') { D.sphere(-r * 0.12, -r * 0.05, r * 0.3, '#8b5cf6', { gloss: false }); D.sphere(r * 0.22, r * 0.1, r * 0.25, '#7c3aed', { gloss: false }); }
    else if (kind === 'inf') { D.sphere(-r * 0.22, -r * 0.1, r * 0.3, '#8b5cf6', { gloss: false }); }
    else D.sphere(0, 0, r * (kind === 'plasma' ? 0.36 : 0.54), '#6d28d9', { gloss: false });
    ctx.restore();
    if (!o.nolabel && kind !== 'phag' && kind !== 'inf') {
      const lab = kind === 'B' ? 'B' : kind === 'Th' ? 'Th' : kind === 'Tc' ? 'Tc' : kind === 'mem' ? 'B' : '';
      if (lab) { ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; T(x, y + r * 0.2, lab, Math.max(11, r * 0.62), '#fff', 'center', 900); ctx.restore(); }
    }
    if (kind === 'mem') { ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.4; starP(x + r * 0.78, y - r * 0.78, r * 0.42, r * 0.18, 5); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (o.rec && o.rec.n) {
      ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      for (let i = 0; i < o.rec.n; i++) { const a = (i / o.rec.n) * TAU + (o.rot || 0) + 0.5 + (o.rec.off || 0); drawAb(x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.98, Math.max(5, r * 0.26), a + Math.PI / 2, o.rec.kind, { col: C.shade(col, -0.45), open: 0.7 }); }
      ctx.restore();
    }
    if (o.ag && o.ag.length) {
      ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      o.ag.forEach((k, i) => { const a = -0.6 + i * 0.7 + (o.rot || 0); drawAg(k, x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, Math.max(5, r * 0.24), a + Math.PI / 2); });
      ctx.restore();
    }
  }

  /* ---------- 단조 3차 보간 (그래프 곡선) ---------- */
  function monoFn(xs, ys) {
    const n = xs.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  /* 항체 농도 자료(상대값, 예시): 항원 접촉 후 일수 → 농도 */
  const AB1 = { x: [0, 4, 7, 14, 21, 28, 42], y: [0, 0, 2, 10, 7, 4, 2] };       // 1차 반응
  const AB2 = { x: [0, 2, 4, 7, 14, 28, 42], y: [2, 20, 70, 100, 80, 50, 30] };  // 2차 반응
  const ab1f = monoFn(AB1.x, AB1.y), ab2f = monoFn(AB2.x, AB2.y);
  /* 감염 모형: 병원체 수 P(상대값). 증식 r, 최대 K, 항체 효과 k */
  function simInfect(Af, days) {
    const r = 1.1, K = 100, k = 0.5, dt = 0.02, out = [];
    let P = 1;
    for (let t = 0; t <= days + 1e-9; t += dt) { out.push(P); P = Math.max(0, P + (r * P * (1 - P / K) - k * Af(t) * P) * dt); }
    return { dt, P: out, at: (t) => out[clamp(Math.round(t / dt), 0, out.length - 1)] };
  }

  /* ============ 자료 ============ */
  const S = { mode: 'inn', sub: { inn: 'barrier', lym: 'play', mem: '', cls: 'sort' }, fade: 0, BP: null, W: null, L: null, OR: null, M: null, SO: null, TB: null };
  const SCENES = {
    inn: { label: '🧱 선천적 방어', subs: [['barrier', '🧱 1차 방어'], ['wound', '🩹 식균·염증']] },
    lym: { label: '🧬 림프구의 작용', subs: [['play', '🎬 재생'], ['order', '🔢 순서']] },
    mem: { label: '⭐ 기억 세포', subs: null },
    cls: { label: '🗂 면역 구분', subs: [['sort', '🗂 분류'], ['table', '📋 비교표']] },
  };
  const PKIND = { bact: '세균', fungus: '곰팡이 포자', virus: '바이러스' };
  const BARS = [
    { id: 'skin', name: '피부', cap: '여러 겹의 각질층이 병원체를 물리적으로 막아요.' },
    { id: 'muc', name: '점막 · 섬모', cap: '끈끈한 점액이 붙잡고 섬모가 밀어내요.' },
    { id: 'tear', name: '눈물 · 침', cap: '리소자임(효소)이 세균의 세포벽을 분해해요.' },
    { id: 'acid', name: '위산', cap: '강한 산성(pH 약 2)이 병원체를 죽여요.' },
  ];
  const rngI = mulberry(2024);

  function drawPath(kind, x, y, r, rot, a) {
    ctx.save(); if (a != null) ctx.globalAlpha *= a;
    if (kind === 'bact') drawBact(x, y, r * 0.95, rot, '#16a34a', { len: 1.6, dna: false });
    else if (kind === 'virus') drawVirus(x, y, r * 0.8, rot, '#7c3aed');
    else { D.sphere(x, y, r * 0.72, '#c2863a', { gloss: true }); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + rot; D.sphere(x + Math.cos(q) * r * 0.86, y + Math.sin(q) * r * 0.86, r * 0.17, '#8b5a1b', { gloss: false }); } }
    ctx.restore();
  }

  /* ================= ① 1차 방어 장치 4가지 ================= */
  const IR = PHONE
    ? { bar: (i) => ({ x: 8 + (i % 2) * 238, y: 8 + Math.floor(i / 2) * 318, w: 226, h: 310 }), capH: 92, wound: { x: 8, y: 8, w: 464, h: 396 }, wcap: { x: 8, y: 412, w: 464, h: 220 } }
    : { bar: (i) => ({ x: 16 + (i % 2) * 388, y: 14 + Math.floor(i / 2) * 270, w: 380, h: 262 }), capH: 64, wound: { x: 16, y: 14, w: 768, h: 404 }, wcap: { x: 16, y: 426, w: 768, h: 120 } };
  function makeBar() {
    S.BP = BARS.map((b, i) => ({ t: -1, done: false, ph: [0, 1, 2, 3, 4].map((j) => ({ k: ['bact', 'virus', 'fungus', 'bact', 'virus'][j], u: 0.12 + j * 0.19, ph: j * 0.9 })) }));
    // 눈물·침의 리소자임은 세균의 세포벽을 분해해요 → 세균만 그려요
    S.BP[2].ph.forEach((p) => { p.k = 'bact'; });
  }
  function barAttack(i) { const b = S.BP[i]; if (b.t >= 0 && b.t < 3.2) return; b.t = 0; Sound.click(); }
  const barDoneN = () => S.BP.filter((b) => b.done).length;
  function stepBar(dt) { S.BP.forEach((b) => { if (b.t >= 0) { b.t += dt; if (b.t >= 3.0 && !b.done) { b.done = true; Sound.success(); rlast = ''; syncControls(); } if (b.t > 4.6) b.t = -1; } }); }
  function barArt(i, a, tt) {
    const b = S.BP[i], t = clock;
    ctx.save(); ctx.beginPath(); ctx.rect(a.x, a.y, a.w, a.h); ctx.clip();
    const sy = (f) => a.y + a.h * f;
    if (i === 0) { // 피부
      const sf = sy(0.52), eh = a.h * 0.17;
      D.roundRect(a.x, sf, a.w, a.h, 0); ctx.fillStyle = '#f9c9c0'; ctx.fill();
      for (let r = 0; r < 3; r++) for (let c = -1; c < Math.ceil(a.w / 34) + 1; c++) { const bx = a.x + c * 34 + (r % 2) * 17, by = sf + r * (eh / 3); D.roundRect(bx + 1, by + 1, 32, eh / 3 - 2, 5); ctx.fillStyle = r === 0 ? '#e8b48a' : '#efc3a0'; ctx.fill(); ctx.strokeStyle = '#c98a5e'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = '#f4a6a0'; ctx.fillRect(a.x, sf + eh, a.w, a.h);
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = 'rgba(220,60,60,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, sf + eh + 22 + k * 20); for (let q = 0; q <= 12; q++) ctx.lineTo(a.x + q * a.w / 12, sf + eh + 22 + k * 20 + Math.sin(q + k) * 4); ctx.stroke(); }
      if (tt > 0.4) { ctx.save(); ctx.globalAlpha = clamp((tt - 0.4) * 2, 0, 1) * (0.5 + 0.2 * Math.sin(t * 6)); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.x, sf - 2); ctx.lineTo(a.x + a.w, sf - 2); ctx.stroke(); ctx.restore(); }
      b.ph.forEach((p, j) => {
        const x = a.x + a.w * p.u; let y = sy(0.2) + Math.sin(t * 1.5 + p.ph) * 5, rot = t * 0.4 + j;
        if (tt >= 0) { const cyc = 0.95, ph = (((tt - 0.12 * j) % cyc) + cyc) % cyc / cyc, hmax = a.h * 0.3 * (tt < 1.6 ? 1 : Math.max(0.35, 1 - (tt - 1.6) * 0.4)); y = sf - 12 - hmax * 4 * ph * (1 - ph) * (tt > 0.12 * j ? 1 : 0) - (tt > 0.12 * j ? 0 : (sf - 12 - y)); if (ph < 0.09 && tt > 0.2 && !RM) D.glow(x, sf - 4, 22, '#22c55e', 0.55); }
        drawPath(p.k, x, y, 12, rot);
      });
      if (tt > 1.5) D.label(a.x + a.w / 2, sy(0.36), '막혔어요!', { bg: '#15803d', size: 13 });
    } else if (i === 1) { // 점막과 섬모
      const my = sy(0.62), cy0 = sy(0.82);
      ctx.fillStyle = '#fde8e1'; ctx.fillRect(a.x, cy0, a.w, a.h);
      for (let c = 0; c < Math.ceil(a.w / 28); c++) { const cx = a.x + c * 28 + 14; D.roundRect(cx - 12, cy0, 24, a.h, 6); ctx.fillStyle = '#f4b9a6'; ctx.fill(); ctx.strokeStyle = '#d98a74'; ctx.lineWidth = 1.5; ctx.stroke(); D.sphere(cx, cy0 + 22, 6, '#a78bfa', { gloss: false }); }
      // 점액
      ctx.beginPath(); ctx.moveTo(a.x, cy0); for (let q = 0; q <= 30; q++) ctx.lineTo(a.x + q * a.w / 30, my + Math.sin(q * 0.8 + t * 2) * 2.5); ctx.lineTo(a.x + a.w, cy0); ctx.closePath(); ctx.fillStyle = 'rgba(163,230,53,.38)'; ctx.fill();
      // 섬모
      ctx.strokeStyle = '#d97757'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let c = 0; c < Math.ceil(a.w / 28); c++) for (let k = -1; k <= 1; k++) { const bx = a.x + c * 28 + 14 + k * 6, sw = Math.sin(t * 7 - c * 0.9 + k) * 0.55; ctx.beginPath(); ctx.moveTo(bx, cy0); ctx.quadraticCurveTo(bx + Math.sin(sw) * 6, cy0 - 14, bx + Math.sin(sw) * 14 + 4, cy0 - 26 + Math.abs(sw) * 4); ctx.stroke(); }
      b.ph.forEach((p, j) => {
        let x = a.x + a.w * (p.u - 0.04), y = sy(0.22) + Math.sin(t * 1.5 + p.ph) * 5;
        if (tt >= 0) { const f = smooth((tt - 0.1 * j) / 1.0); y = lerp(y, my + 6 + (j % 2) * 5, f); x += Math.max(0, tt - 1.0 - 0.1 * j) * 70; }
        drawPath(p.k, x, y, 11, t * 0.5 + j);
      });
      if (tt > 1.4) { D.arrow(a.x + a.w * 0.25, my - 14, a.x + a.w * 0.8, my - 14, { color: '#65a30d', width: 3.5, head: 11 }); D.label(a.x + a.w * 0.52, sy(0.44), '섬모가 점액을 밀어내요', { bg: '#4d7c0f', size: 12.5 }); }
    } else if (i === 2) { // 눈물 · 침
      const ty = sy(0.52), cy0 = sy(0.82);
      ctx.fillStyle = '#fde8e1'; ctx.fillRect(a.x, cy0, a.w, a.h);
      for (let c = 0; c < Math.ceil(a.w / 30); c++) { D.roundRect(a.x + c * 30 + 2, cy0, 26, a.h, 8); ctx.fillStyle = '#f9c6b8'; ctx.fill(); ctx.strokeStyle = '#d98a74'; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(a.x, cy0); for (let q = 0; q <= 30; q++) ctx.lineTo(a.x + q * a.w / 30, ty + Math.sin(q * 0.7 + t * 1.6) * 2); ctx.lineTo(a.x + a.w, cy0); ctx.closePath(); ctx.fillStyle = 'rgba(125,211,252,.38)'; ctx.fill();
      // 리소자임 입자 (노란 원 + 입)
      const nL = 10;
      for (let q = 0; q < nL; q++) {
        let x = a.x + a.w * (0.08 + q * 0.093) + Math.sin(t * 0.9 + q * 2) * 8, y = ty + 16 + (q % 3) * 14 + Math.sin(t * 1.2 + q) * 4;
        if (tt >= 1.0) { const j = q % 5, tg = b.ph[j], gx = a.x + a.w * tg.u, gy = ty + 6; const f = smooth((tt - 1.0 - 0.06 * q) / 0.9); x = lerp(x, gx + (q < 5 ? -9 : 9), f); y = lerp(y, gy, f); }
        ctx.save(); ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 6.5, 0.45, TAU - 0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      b.ph.forEach((p, j) => {
        const x = a.x + a.w * p.u; let y = sy(0.2) + Math.sin(t * 1.5 + p.ph) * 5, al = 1, burst = 0;
        if (tt >= 0) { const f = smooth((tt - 0.08 * j) / 0.9); y = lerp(y, ty + 4, f); const tb = 1.9 + 0.12 * j; if (tt > tb) { burst = clamp((tt - tb) / 0.5, 0, 1); al = 1 - burst; } }
        if (al > 0.02) { drawPath('bact', x, y, 12 * (1 + burst * 0.5), t * 0.3 + j, al); }
        if (burst > 0 && burst < 1) { for (let q = 0; q < 6; q++) { const aa = q / 6 * TAU + j; D.sphere(x + Math.cos(aa) * burst * 22, y + Math.sin(aa) * burst * 22, 3 * (1 - burst), '#86efac', { gloss: false }); } }
      });
      if (tt > 2.3) D.label(a.x + a.w / 2, sy(0.34), '세포벽 분해!', { bg: '#a16207', size: 13 });
    } else { // 위산
      const py = sy(0.55);
      ctx.fillStyle = '#e8a79c'; ctx.fillRect(a.x, py - 6, a.w, a.h);
      const g = ctx.createLinearGradient(0, py, 0, a.y + a.h); g.addColorStop(0, 'rgba(253,224,71,.55)'); g.addColorStop(1, 'rgba(251,146,60,.6)');
      ctx.beginPath(); ctx.moveTo(a.x, py); for (let q = 0; q <= 30; q++) ctx.lineTo(a.x + q * a.w / 30, py + Math.sin(q * 0.9 + t * 2.2) * 2.5); ctx.lineTo(a.x + a.w, a.y + a.h); ctx.lineTo(a.x, a.y + a.h); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      for (let q = 0; q < 9; q++) { const bx = a.x + a.w * ((q * 0.137 + 0.06) % 1), by = a.y + a.h - ((t * 24 + q * 31) % (a.h - py + a.y)); D.sphere(bx, by, 2.8 + (q % 3), 'rgba(255,255,255,.7)', { gloss: false }); }
      T(a.x + a.w - 10, a.y + a.h - 12, 'pH 약 2', 14, '#7c2d12', 'right', 900);
      b.ph.forEach((p, j) => {
        const x = a.x + a.w * p.u; let y = sy(0.22) + Math.sin(t * 1.5 + p.ph) * 5, al = 1, sc = 1;
        if (tt >= 0) { const f = smooth((tt - 0.1 * j) / 1.0); y = lerp(y, py + 18 + (j % 2) * 18, f); const tb = 1.4 + 0.15 * j; if (tt > tb) { const k = clamp((tt - tb) / 1.0, 0, 1); al = 1 - k; sc = 1 - 0.6 * k; if (!RM && Math.random() < 0.3) parts.emit({ x, y, vx: rnd(-15, 15), vy: rnd(-40, -15), life: 0.5, size: 2.4, color: '#fff', shape: 'bubble' }); } }
        if (al > 0.02) drawPath(p.k, x, y, 12 * sc, t * 0.3 + j, al);
      });
      if (tt > 2.0) D.label(a.x + a.w / 2, sy(0.32), '병원체가 분해돼요', { bg: '#b45309', size: 13 });
    }
    ctx.restore();
  }
  function drawBarrier() {
    bgFill('#f3efe7', '#e8e2d6');
    S.BP.forEach((b, i) => {
      const r = IR.bar(i);
      panel(r.x, r.y, r.w, r.h, 16);
      T(r.x + 14, r.y + 26, BARS[i].name, 16, '#26324a', 'left', 900);
      T(r.x + r.w - 12, r.y + 26, b.t >= 0 && b.t < 3 ? '막는 중…' : b.done ? '✔ 막았어요' : '눌러서 침입시키기', 12.5, b.done ? '#15803d' : '#b45309', 'right', 800);
      const a = { x: r.x + 6, y: r.y + 36, w: r.w - 12, h: r.h - 36 - IR.capH - 6 };
      D.roundRect(a.x, a.y, a.w, a.h, 10); ctx.fillStyle = '#fbf8f2'; ctx.fill();
      barArt(i, a, b.t);
      D.roundRect(a.x, a.y, a.w, a.h, 10); ctx.strokeStyle = b.done ? '#34b36a' : '#d8cfbe'; ctx.lineWidth = b.done ? 3 : 1.5; ctx.stroke();
      textBlock(r.x + 12, r.y + r.h - IR.capH + 20, r.w - 24, BARS[i].cap + ' 병원체의 종류를 가리지 않아요.', PHONE ? 13 : 13.5, '#4b5563', PHONE ? 18 : 19, 700);
    });
  }

  /* ================= ① 상처 · 식균 작용 · 염증 ================= */
  const NPH = 6;
  function makeWound() {
    S.W = { type: 'bact', run: false, t: 0, dil: 0, ph: [], pg: [], eng: 0, ran: {}, leak: [], done: false, temp: 36.5 };
    const R = IR.wound, ph = [];
    // 식세포: 조직 속 2개 + 혈관 속 3개
    const vy = R.y + R.h * 0.84;
    ph.push({ x: R.x + R.w * 0.22, y: R.y + R.h * 0.56, st: 'idle', tg: null, t: 0, home: 0 }, { x: R.x + R.w * 0.78, y: R.y + R.h * 0.56, st: 'idle', tg: null, t: 0, home: 0 });
    [0.16, 0.5, 0.84].forEach((u) => ph.push({ x: R.x + R.w * u, y: vy, st: 'vessel', tg: null, t: 0, home: 1, u }));
    S.W.pg = ph;
  }
  function woundStart() {
    const W = S.W; if (W.run) return;
    const R = IR.wound, rg = mulberry(Date.now() & 0xffff);
    const ph = []; for (let i = 0; i < NPH; i++) ph.push({ x: R.x + R.w * 0.5 + (rg() - 0.5) * 50, y: R.y - 20 - i * 14, tx: R.x + R.w * (0.3 + 0.4 * rg()), ty: R.y + R.h * (0.34 + 0.2 * rg()), alive: true, eat: 0, by: null, rot: rg() * TAU, vx: 0, vy: 0, a: 1 });
    const keep = { type: W.type, ran: W.ran };
    makeWound(); Object.assign(S.W, keep); S.W.ph = ph; S.W.run = true; S.W.t = 0; Sound.click(); rlast = ''; syncControls();
  }
  function stepWound(dt) {
    const W = S.W, R = IR.wound;
    W.dil = SciSim.approach(W.dil, W.run && W.t > 1.6 ? 1 : (W.run ? W.dil : W.dil), dt, 1.3);
    if (!W.run) { W.dil = SciSim.approach(W.dil, 0, dt, 0.35); }
    W.temp = 36.5 + 1.3 * W.dil;
    W.leak.forEach((l) => { l.t += dt; l.x += l.vx * dt; l.y += l.vy * dt; });
    W.leak = W.leak.filter((l) => l.t < 1.6);
    if (W.run && W.dil > 0.3 && !RM && Math.random() < dt * 10) W.leak.push({ x: R.x + R.w * (0.15 + Math.random() * 0.7), y: R.y + R.h * 0.78, vx: rnd(-8, 8), vy: -rnd(26, 50), t: 0 });
    if (!W.run) return;
    W.t += dt;
    W.ph.forEach((p) => {
      if (!p.alive) return;
      if (p.eat > 0) return;
      p.x = SciSim.approach(p.x, p.tx, dt, 1.4); p.y = SciSim.approach(p.y, p.ty, dt, 1.4);
      if (Math.hypot(p.x - p.tx, p.y - p.ty) < 8) { p.tx = clamp(p.tx + rnd(-30, 30), R.x + 60, R.x + R.w - 60); p.ty = clamp(p.ty + rnd(-24, 24), R.y + R.h * 0.3, R.y + R.h * 0.68); }
    });
    W.pg.forEach((g) => {
      g.t += dt;
      if (g.st === 'vessel' && W.t > 2.3 + g.home * 0.2 * (W.pg.indexOf(g) - 2)) g.st = 'idle';
      if (g.st === 'idle') {
        const vis = W.t > 1.0;
        if (!vis) return;
        // 가장 가까운 병원체 찾기
        let best = null, bd = 1e9;
        W.ph.forEach((p) => { if (p.alive && !p.by && p.y > R.y + 4) { const d = Math.hypot(p.x - g.x, p.y - g.y); if (d < bd) { bd = d; best = p; } } });
        if (best) { g.tg = best; best.by = g; g.st = 'chase'; }
        else if (g.home === 1) { g.x = SciSim.approach(g.x, g.x, dt, 1); }
      } else if (g.st === 'chase') {
        const p = g.tg;
        if (!p || !p.alive) { g.st = 'idle'; g.tg = null; return; }
        const d = Math.hypot(p.x - g.x, p.y - g.y), sp = 62 * dt;
        if (d > 3) { g.x += (p.x - g.x) / d * Math.min(sp, d); g.y += (p.y - g.y) / d * Math.min(sp, d); }
        if (d < 26) { g.st = 'eat'; g.et = 0; p.eat = 0.001; }
      } else if (g.st === 'eat') {
        g.et += dt; const p = g.tg; p.eat = clamp(g.et / 1.3, 0.001, 1);
        p.x = SciSim.approach(p.x, g.x, dt, 5); p.y = SciSim.approach(p.y, g.y, dt, 5);
        if (g.et >= 1.3) { p.alive = false; W.eng++; g.st = 'idle'; g.tg = null; Sound.tick(); rlast = ''; if (!RM) parts.burst(g.x, g.y, { count: 8, speed: 70, size: 2.6, colors: ['#fde047', '#fbbf24', '#fff'], gravity: 0 }); }
      }
      // 혈관 속 식세포는 혈관을 벗어나 조직으로 이동
      if (g.home === 1 && g.st === 'vessel') { g.x += Math.sin(clock * 2 + g.u * 9) * 8 * dt; }
    });
    // 혈관 밖으로 나온 뒤 사냥 대상이 없으면 조금 위로 이동
    W.pg.forEach((g) => { if (g.home === 1 && g.st === 'idle' && !g.tg && g.y > R.y + R.h * 0.7 && W.t > 2.5) g.y = SciSim.approach(g.y, R.y + R.h * 0.64, dt, 1.2); });
    if (W.ph.every((p) => !p.alive) && !W.done) { W.done = true; W.run = false; if (W.eng >= NPH) W.ran[W.type] = true; Sound.success(); rlast = ''; syncControls(); parts.burst(R.x + R.w / 2, R.y + R.h * 0.45, { count: 20, speed: 190, size: 4 }); }
  }
  function drawWound(dt) {
    bgFill('#f6efe9', '#eadfd5');
    const W = S.W, R = IR.wound;
    panel(R.x, R.y, R.w, R.h, 16);
    ctx.save(); D.roundRect(R.x, R.y, R.w, R.h, 16); ctx.clip();
    // 표피 · 진피
    const ep = R.y + R.h * 0.04, eh = R.h * 0.1, wx = R.x + R.w / 2, ww = PHONE ? 46 : 64;
    ctx.fillStyle = '#fbe3d8'; ctx.fillRect(R.x, ep + eh, R.w, R.h);
    const swell = W.dil * 8;
    ctx.fillStyle = '#e8b48a';
    ctx.beginPath(); ctx.moveTo(R.x, ep); ctx.lineTo(wx - ww / 2, ep); ctx.lineTo(wx - ww / 2 + 8, ep + eh); ctx.lineTo(R.x, ep + eh); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R.x + R.w, ep); ctx.lineTo(wx + ww / 2, ep); ctx.lineTo(wx + ww / 2 - 8, ep + eh); ctx.lineTo(R.x + R.w, ep + eh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c98a5e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(R.x, ep + eh); ctx.lineTo(wx - ww / 2 + 8, ep + eh); ctx.moveTo(wx + ww / 2 - 8, ep + eh); ctx.lineTo(R.x + R.w, ep + eh); ctx.stroke();
    // 상처 주변이 붉어지고 부어요
    if (W.dil > 0.02) { const g = ctx.createRadialGradient(wx, ep + eh + 10, 10, wx, ep + eh + 10, R.w * 0.42 + swell * 6); g.addColorStop(0, C.rgba('#ef4444', 0.5 * W.dil)); g.addColorStop(1, C.rgba('#ef4444', 0)); ctx.fillStyle = g; ctx.fillRect(R.x, ep + eh, R.w, R.h * 0.6); }
    // 모세 혈관
    const vy = R.y + R.h * 0.84, vr = 15 + 9 * W.dil;
    D.roundRect(R.x - 6, vy - vr, R.w + 12, vr * 2, vr); ctx.fillStyle = C.mix('#fecaca', '#f87171', W.dil); ctx.fill(); ctx.strokeStyle = C.mix('#e58a8a', '#b91c1c', W.dil); ctx.lineWidth = 3.5; ctx.stroke();
    for (let q = 0; q < 14; q++) { const x = R.x + ((q * 61 + clock * (18 + 14 * W.dil)) % (R.w + 40)) - 20, y = vy + Math.sin(q * 2.3) * vr * 0.45; drawRBC(x, y, 7, q, { alpha: 0.95 }); }
    W.leak.forEach((l) => { ctx.save(); ctx.globalAlpha = clamp(1 - l.t / 1.6, 0, 1) * 0.8; D.sphere(l.x, l.y, 3.2, '#7dd3fc', { gloss: false }); ctx.restore(); });
    // 경보 신호
    if (W.run && W.t > 1.0 && W.t < 3.4 && !RM) { const k = (W.t - 1.0) / 2.4; ctx.strokeStyle = C.rgba('#f59e0b', 0.7 * (1 - k)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, ep + eh + 6, 20 + k * R.h * 0.4, 0, Math.PI); ctx.stroke(); }
    // 식세포
    W.pg.forEach((g) => { const eating = g.st === 'eat'; drawCell('phag', g.x, g.y, PHONE ? 20 : 25, { squash: eating ? 0.12 * Math.sin(clock * 12) : 0, nolabel: true, glow: eating ? 0.5 : 0 }); });
    // 병원체
    W.ph.forEach((p) => {
      if (!p.alive) return;
      const s = p.eat > 0 ? 1 - p.eat * 0.75 : 1;
      drawPath(W.type, p.x, p.y, (PHONE ? 8.5 : 10.5) * s, p.rot + clock * 0.3, p.eat > 0 ? 1 - p.eat * 0.3 : 1);
    });
    ctx.restore();
    // 라벨
    const lb = (x, y, txt, bg) => D.label(x, y, txt, { bg, size: PHONE ? 12 : 13, pad: 7 });
    lb(R.x + 66, R.y + R.h * 0.045 + 6, '피부 (표피)', '#8b5a2b');
    lb(wx, R.y + 10 + eh + 30, '상처', '#b91c1c');
    lb(R.x + R.w - (PHONE ? 70 : 90), vy + vr + (PHONE ? 20 : 20), '모세 혈관', '#b91c1c');
    if (W.dil > 0.55) {
      lb(R.x + R.w * 0.2, vy - vr - 20, '혈관 확장 → 붉어짐·열감', '#b91c1c');
      lb(R.x + R.w * 0.78, R.y + R.h * 0.2, '체액 이동 → 부음', '#0369a1');
    }
    // 온도계
    const tx = R.x + R.w - (PHONE ? 30 : 40), ty = R.y + R.h * 0.3;
    if (W.dil > 0.05 || W.run) { D.thermometer(tx, ty, 70, W.temp, 36, 39, { ticks: false, color: '#ef4444' }); T(tx, ty + 120, W.temp.toFixed(1) + ' °C', 12.5, '#b91c1c', 'center', 900); }
    if (!W.run && !W.done && W.t === 0) T(R.x + R.w / 2, R.y + R.h * 0.62, '▶ 상처로 침입시키기를 눌러요', 14, '#7c2d12', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
    // 아래 설명
    const Cp = IR.wcap; panel(Cp.x, Cp.y, Cp.w, Cp.h, 14);
    const lines = ['🩹 상처로 들어온 병원체를 식세포가 삼켜 분해해요 (식균 작용). 병원체가 세균이든 곰팡이든 바이러스든 똑같이 반응해요.', '🔥 염증 반응: 혈관이 넓어지고 혈류가 늘어 붉어지고(발적), 열이 나고(열감), 체액이 빠져나와 붓고(부종), 아파요(통증). 더 많은 식세포가 모여들어요.', '🌡 발열도 선천적 방어예요: 체온이 오르면 병원체의 증식이 느려져요.'];
    let yy = Cp.y + 24; lines.forEach((l) => { yy += textBlock(Cp.x + 14, yy, Cp.w - 28, l, PHONE ? 13 : 13.5, '#374151', PHONE ? 18 : 18.5, 700) + (PHONE ? 8 : 2); });
  }

  /* ================= ② 림프구의 작용 (체액성 · 세포성 면역) ================= */
  const LL = PHONE
    ? { sc: { x: 8, y: 8, w: 464, h: 300 }, list: { x: 8, y: 316, w: 464, h: 316 }, rs: 0.74 }
    : { sc: { x: 16, y: 14, w: 768, h: 330 }, list: { x: 16, y: 352, w: 768, h: 194 }, rs: 1 };
  const STG = {
    hum: {
      name: '🩸 혈액 속 세균 → 체액성 면역', st: [
        { t: '세균 침입', c: '혈액 속으로 세균이 침입했어요. 세균 표면에는 항원(▲)이 있어요.' },
        { t: '식균 작용', c: '식세포가 세균을 삼켜 분해해요. (선천적 면역에서도 일어나는 반응)' },
        { t: '항원 제시', c: '식세포가 분해한 세균의 항원 조각을 자기 표면에 내보여 줘요.' },
        { t: '보조 T 림프구 활성화', c: '맞는 보조 T 림프구가 항원 조각을 알아보고 활성화돼요.' },
        { t: 'B 림프구 활성화', c: '보조 T 림프구의 신호를 받은 B 림프구가 활성화돼요. 처음 만나면 약 4~7일이 걸려요.' },
        { t: '형질 세포·기억 세포', c: '활성화된 B 림프구가 분열해 형질 세포와 기억 B 세포가 돼요.' },
        { t: '항체 분비', c: '형질 세포가 항체(Y)를 분비해요. 항체가 세균에 결합해 무력화하고 제거를 도와요.' },
      ],
    },
    cell: {
      name: '🦠 세포 안 바이러스 → 세포성 면역', st: [
        { t: '바이러스 침입', c: '바이러스가 몸에 침입해 한 세포 안에서 증식하고 있어요. 감염된 세포 표면에 바이러스 항원(■)이 나타나요.' },
        { t: '식균 작용', c: '식세포가 몸속을 떠도는 바이러스를 삼켜 분해해요.' },
        { t: '항원 제시 · 보조 T 활성화', c: '식세포가 항원 조각을 보여 주면 보조 T 림프구가 활성화돼요.' },
        { t: '세포독성 T 활성화', c: '보조 T 림프구의 신호로 세포독성 T 림프구가 활성화돼요.' },
        { t: '감염 세포 찾기', c: '세포독성 T 림프구가 표면에 항원이 있는 감염 세포를 찾아가 결합해요.' },
        { t: '감염 세포 제거', c: '세포독성 T 림프구가 감염된 세포를 파괴해요. 바이러스가 증식할 곳이 사라져요.' },
      ],
    },
  };
  const POSH = {
    phag: [[.30, .55], [.21, .43], [.34, .47], [.34, .47], [.30, .55], [.30, .55], [.30, .55]],
    th: [[.56, .24], [.56, .24], [.55, .27], [.44, .38], [.50, .40], [.55, .26], [.55, .26]],
    b: [[.60, .76], [.60, .76], [.60, .76], [.60, .76], [.54, .62], [.60, .66], [.60, .66]],
  };
  const POSC = {
    phag: [[.26, .55], [.18, .43], [.34, .47], [.30, .55], [.30, .55], [.30, .55]],
    th: [[.52, .24], [.52, .24], [.45, .37], [.50, .30], [.52, .26], [.52, .26]],
    tc: [[.60, .76], [.60, .76], [.60, .76], [.58, .60], [.72, .60], [.70, .60]],
  };
  function lymKeys(kind) { return kind === 'hum' ? ['phag', 'th', 'b'] : ['phag', 'th', 'tc']; }
  function makeLym(kind) {
    const L = S.L || { done: { hum: false, cell: false }, auto: false };
    const k = kind || L.kind || 'hum';
    L.kind = k; L.stage = 0; L.t = 0; L.auto = false; L.a = {};
    const pos = k === 'hum' ? POSH : POSC;
    lymKeys(k).forEach((q) => { L.a[q] = { u: pos[q][0][0], v: pos[q][0][1] }; });
    L.pl = { u: .6, v: .66 }; L.me = { u: .6, v: .66 };
    S.L = L; rlast = '';
  }
  const lN = () => STG[S.L.kind].st.length - 1;
  function lymNext() { const L = S.L; if (L.stage < lN()) { L.stage++; L.t = 0; Sound.tick(); rlast = ''; } }
  function stepLym(dt) {
    const L = S.L, pos = L.kind === 'hum' ? POSH : POSC;
    L.t += dt;
    if (L.auto && L.stage < lN() && L.t >= 3.3) lymNext();
    if (L.stage === lN() && L.t >= 2.8 && !L.done[L.kind]) { L.done[L.kind] = true; L.auto = false; Sound.success(); rlast = ''; syncControls(); }
    lymKeys(L.kind).forEach((q) => { const tg = pos[q][L.stage], a = L.a[q]; a.u = SciSim.approach(a.u, tg[0], dt, RM ? 99 : 2.4); a.v = SciSim.approach(a.v, tg[1], dt, RM ? 99 : 2.4); });
    if (L.kind === 'hum') {
      const f = L.stage === 5 ? smooth((L.t - 0.7) / 1.2) : L.stage > 5 ? 1 : 0;
      const bp = L.a.b;
      if (L.stage < 5) { L.pl.u = bp.u; L.pl.v = bp.v; L.me.u = bp.u; L.me.v = bp.v; }
      else { L.pl.u = lerp(bp.u, 0.73, f); L.pl.v = lerp(bp.v, 0.68, f); L.me.u = lerp(bp.u, 0.91, f); L.me.v = lerp(bp.v, 0.3, f); }
    }
  }
  const lp = (u, v) => ({ x: LL.sc.x + u * LL.sc.w, y: LL.sc.y + v * LL.sc.h });
  const RBCS = (() => { const rg = mulberry(99), o = []; for (let i = 0; i < 16; i++) o.push({ u: rg(), v: rg(), s: 0.5 + rg(), r: rg() * TAU, sp: 0.01 + rg() * 0.02 }); return o; })();
  function drawLym(dt) {
    bgFill('#f7ecec', '#efe0e0');
    const L = S.L, sc = LL.sc, rs = LL.rs, s = L.stage, t = L.t, hum = L.kind === 'hum';
    panel(sc.x, sc.y, sc.w, sc.h, 16);
    ctx.save(); D.roundRect(sc.x, sc.y, sc.w, sc.h, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h); g.addColorStop(0, '#fff3ef'); g.addColorStop(1, '#ffe3de'); ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    RBCS.forEach((q) => { const u = (q.u + clock * q.sp) % 1; drawRBC(sc.x + u * sc.w, sc.y + q.v * sc.h, 11 * rs * q.s, q.r + clock * 0.2, { alpha: 0.5 }); });
    const rl = 27 * rs, rp = 36 * rs, agk = hum ? 'tri' : 'sq';
    const tag = (p, txt, dy) => D.label(p.x, p.y + (dy || 0), txt, { bg: 'rgba(255,255,255,.92)', color: '#374151', size: PHONE ? 11.5 : 12.5, pad: 6, border: '#d1d5db' });
    const P = {}; lymKeys(L.kind).forEach((q) => { P[q] = lp(L.a[q].u, L.a[q].v); });
    // ----- 병원체 -----
    const B1 = lp(0.12, 0.36), B2 = lp(0.15, 0.78), B3 = lp(0.1, 0.58), Vv = lp(0.12, 0.36);
    const bact = (p, sz, a, rot, ag) => { ctx.save(); ctx.globalAlpha *= a; drawBact(p.x, p.y, 13 * rs * sz, rot, '#16a34a', { len: 1.5, dna: false }); for (let q = 0; q < 3; q++) { const aa = rot + q * 2.1 + 0.4; drawAg('tri', p.x + Math.cos(aa) * 17 * rs * sz, p.y + Math.sin(aa) * 12 * rs * sz, 4.2 * rs * sz, aa); } ctx.restore(); };
    if (hum) {
      const f1 = s === 1 ? clamp(t / 1.8, 0, 1) : s > 1 ? 1 : 0;
      if (s <= 1) { const p = { x: lerp(B1.x, P.phag.x - 8, smooth(f1)), y: lerp(B1.y, P.phag.y, smooth(f1)) }; bact(p, 1 - smooth((f1 - 0.55) / 0.45) * 0.95, 1, 0.3 + clock * 0.2); }
      const neut = s === 6 ? clamp((t - 3.4) / 1.2, 0, 1) : 0;
      [[B2, 1], [B3, 2]].forEach((q) => { bact({ x: q[0].x + Math.sin(clock + q[1]) * 4, y: q[0].y + Math.cos(clock * 0.8 + q[1]) * 3 }, 1, 1 - neut * 0.55, q[1] * 1.4 + clock * 0.1); });
    } else {
      const f1 = s === 1 ? clamp(t / 1.8, 0, 1) : s > 1 ? 1 : 0;
      if (s <= 1) { const p = { x: lerp(Vv.x, P.phag.x - 8, smooth(f1)), y: lerp(Vv.y, P.phag.y, smooth(f1)) }; ctx.save(); const k = 1 - smooth((f1 - 0.55) / 0.45) * 0.95; drawVirus(p.x, p.y, 11 * rs * k, clock * 0.3, '#7c3aed'); drawAg('sq', p.x, p.y - 15 * rs * k, 4.2 * rs * k, 0); ctx.restore(); }
    }
    // ----- 감염된 몸 세포 (세포성 면역) -----
    if (!hum) {
      const ip = lp(0.87, 0.58), ri = 40 * rs; let jig = 0, al = 1, burst = 0;
      if (s === 5) { jig = t < 1.5 ? Math.sin(t * 30) * 2.2 * clamp(t / 0.6, 0, 1) : 0; burst = clamp((t - 1.5) / 0.9, 0, 1); al = 1 - burst * 0.7; }
      ctx.save(); ctx.globalAlpha *= al; drawCell('inf', ip.x + jig, ip.y, ri * (1 + burst * 0.25), { ag: ['sq', 'sq', 'sq', 'sq'], nolabel: true, squash: s === 5 && t > 0.6 ? 0.1 * Math.sin(t * 8) : 0 });
      if (burst < 0.5) for (let q = 0; q < 4; q++) { const aa = q * 1.7 + 0.5; drawVirus(ip.x + Math.cos(aa) * ri * 0.5 + 6, ip.y + Math.sin(aa) * ri * 0.45 + 4, 8 * rs, aa, '#7c3aed'); }
      ctx.restore();
      if (s === 5 && t > 1.5 && t < 1.62 && !RM) parts.burst(ip.x, ip.y, { count: 24, speed: 180, size: 3.6, colors: ['#8b5cf6', '#c4b5fd', '#fda4af', '#fff'], gravity: 30 });
      if (burst > 0) for (let q = 0; q < 4; q++) { const aa = q * 1.7 + 0.5, kk = smooth(burst); ctx.save(); ctx.globalAlpha = 1 - kk * 0.55; drawVirus(ip.x + Math.cos(aa) * (ri * 0.5 + kk * 40), ip.y + Math.sin(aa) * ri * 0.45 + kk * 50, 8 * rs, aa, '#9ca3af'); ctx.restore(); }
      tag(ip, burst > 0.5 ? '제거된 감염 세포' : '감염된 세포', ri + 20);
    }
    // ----- 림프구 · 식세포 -----
    const phagAg = s >= 2 ? [agk, agk, agk] : null;
    drawCell('phag', P.phag.x, P.phag.y, rp, { ag: phagAg, nolabel: true, squash: s === 1 && t > 0.9 && t < 2.1 ? 0.1 * Math.sin(t * 10) : 0 });
    tag(P.phag, '식세포', rp + 14);
    const thAct = hum ? s >= 3 : s >= 2;
    drawCell('Th', P.th.x, P.th.y, rl, { glow: thAct ? 0.6 + 0.3 * Math.sin(clock * 5) : 0, rec: { kind: agk, n: 3 } });
    tag(P.th, '보조 T 림프구', rl + 14);
    if (hum) {
      const bAct = s >= 4;
      if (s < 5 || (s === 5 && t < 0.7)) {
        const sq = s === 5 ? Math.sin(clamp(t / 0.7, 0, 1) * Math.PI / 2) * 0.28 : 0;
        drawCell('B', P.b.x, P.b.y, rl, { glow: bAct ? 0.6 + 0.3 * Math.sin(clock * 5) : 0, rec: { kind: 'tri', n: 3 }, squash: sq });
        tag(P.b, 'B 림프구', rl + 14);
        if (s === 4 && t < 1.2) { /* 신호 도착 표시 */ }
      }
      if (s >= 5 && !(s === 5 && t < 0.7)) {
        const pl = lp(L.pl.u, L.pl.v), me = lp(L.me.u, L.me.v), a0 = s === 5 ? clamp((t - 0.7) / 0.5, 0, 1) : 1;
        ctx.save(); ctx.globalAlpha *= a0;
        drawCell('plasma', pl.x, pl.y, rl * 1.2, { glow: s === 6 ? 0.5 : 0 }); tag(pl, '형질 세포', rl * 1.2 + 14);
        drawCell('mem', me.x, me.y, rl * 0.95, { rec: { kind: 'tri', n: 3 } }); tag(me, '기억 B 세포', rl * 0.95 + 14);
        ctx.restore();
      }
    } else {
      drawCell('Tc', P.tc.x, P.tc.y, rl, { glow: s >= 3 ? 0.6 + 0.3 * Math.sin(clock * 5) : 0, rec: { kind: 'sq', n: 3 } });
      tag(P.tc, '세포독성 T 림프구', rl + 14);
    }
    // ----- 신호와 효과 -----
    const sig = (a, b, label, col) => { D.arrow(a.x, a.y, b.x, b.y, { color: col || '#f59e0b', width: 3.5, head: 11, dash: [7, 5] }); const mx = (a.x + b.x) / 2 + (PHONE ? 38 : 58), my = (a.y + b.y) / 2; D.label(mx, my, label, { bg: col || '#f59e0b', size: PHONE ? 11.5 : 12.5, pad: 6 }); };
    const toward = (a, b, r1, r2) => { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return [{ x: a.x + (b.x - a.x) / d * r1, y: a.y + (b.y - a.y) / d * r1 }, { x: b.x - (b.x - a.x) / d * r2, y: b.y - (b.y - a.y) / d * r2 }]; };
    if (hum) {
      if (s === 3) { D.ring((P.phag.x + P.th.x) / 2, (P.phag.y + P.th.y) / 2, 14 * rs, clock, { color: '#f59e0b' }); D.label((P.phag.x + P.th.x) / 2, (P.phag.y + P.th.y) / 2 - 24 * rs, '항원 인식', { bg: '#d97706', size: PHONE ? 11.5 : 12.5, pad: 6 }); }
      if (s === 4) { const q = toward(P.th, P.b, rl + 4, rl + 4); sig(q[0], q[1], '활성화 신호'); if (t < 2) D.label(P.b.x + (PHONE ? 0 : 0), P.b.y + rl + 36, '⏳ 처음 만나면 약 4~7일', { bg: '#475569', size: PHONE ? 11.5 : 12.5, pad: 6 }); }
      if (s === 6) {
        const pl = lp(L.pl.u, L.pl.v), tgts = [B2, B3];
        for (let i = 0; i < 14; i++) {
          const t0 = 0.12 * i, k = smooth((t - t0) / 1.7); if (t < t0) continue;
          const tg = tgts[i % 2], aa = Math.PI * (0.35 + (i >> 1) * 0.3) + (i % 2 ? 0.7 : 0), ex = tg.x + Math.cos(aa) * 20 * rs, ey = tg.y + Math.sin(aa) * 16 * rs;
          const x = lerp(pl.x - 20, ex, k) + Math.sin(k * Math.PI) * 14 * (i % 3 - 1), y = lerp(pl.y, ey, k) - Math.sin(k * Math.PI) * 18;
          const rot = k < 1 ? Math.atan2(ey - y, ex - x) + Math.PI / 2 : aa + Math.PI / 2 + Math.PI;
          drawAb(k < 1 ? x : ex, k < 1 ? y : ey, 9 * rs, k < 1 ? rot : aa - Math.PI / 2 + Math.PI, 'tri', { col: '#334155' });
        }
        if (t > 3.4) D.label(lerp(B2.x, B3.x, 0.5) + 60 * rs, lerp(B2.y, B3.y, 0.5), '항체가 붙어 무력화!', { bg: '#15803d', size: PHONE ? 11.5 : 12.5, pad: 7 });
        if (t > 0.3 && t < 2.6 && Math.random() < dt * 8 && !RM) parts.emit({ x: pl.x - 16, y: pl.y, vx: -rnd(60, 110), vy: rnd(-25, 25), life: 0.9, size: 2.6, color: '#93c5fd', shape: 'circle' });
      }
    } else {
      if (s === 2) { D.ring((P.phag.x + P.th.x) / 2, (P.phag.y + P.th.y) / 2, 14 * rs, clock, { color: '#f59e0b' }); }
      if (s === 3) { const q = toward(P.th, P.tc, rl + 4, rl + 4); sig(q[0], q[1], '활성화 신호'); }
      if (s === 5) {
        const ip = lp(0.87, 0.58);
        if (t < 1.6) for (let i = 0; i < 6; i++) { const k = ((t * 1.6 + i / 6) % 1); const a0 = P.tc, x = lerp(a0.x + rl, ip.x - 40 * rs, k), y = lerp(a0.y, ip.y + (i - 2.5) * 5, k); D.sphere(x, y, 3, '#fb7185', { gloss: false }); }
        if (t > 0.3 && t < 1.6) D.label((P.tc.x + ip.x) / 2, P.tc.y - 30 * rs, '파괴 물질 분비', { bg: '#be123c', size: PHONE ? 11.5 : 12.5, pad: 6 });
        if (t > 2.0) D.label(ip.x - 20 * rs, ip.y - 60 * rs, '감염 세포 제거!', { bg: '#15803d', size: PHONE ? 11.5 : 12.5, pad: 7 });
      }
      if (s === 4) { const ip = lp(0.87, 0.58); D.ring(ip.x - 30 * rs, ip.y, 12, clock, { color: '#ef4444' }); }
    }
    ctx.restore();
    // ----- 단계 목록 -----
    const Li = LL.list; panel(Li.x, Li.y, Li.w, Li.h, 14);
    const sd = STG[L.kind].st;
    T(Li.x + 14, Li.y + 24, STG[L.kind].name, PHONE ? 14 : 15, '#26324a', 'left', 900);
    const lh = PHONE ? 25 : 21;
    sd.forEach((q, i) => {
      const y = Li.y + 46 + i * lh, cur = i === s, past = i < s;
      if (cur) { D.roundRect(Li.x + 8, y - 15, PHONE ? Li.w - 16 : 350, lh - 2, 8); ctx.fillStyle = '#fef3c7'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.6; ctx.stroke(); }
      D.sphere(Li.x + 24, y - 3, 8, past ? '#22c55e' : cur ? '#f59e0b' : '#d1d5db', { gloss: false }); T(Li.x + 24, y + 1.5, past ? '✓' : String(i), 10, '#fff', 'center', 900);
      TF(Li.x + 40, y + 2, q.t, (PHONE ? Li.w - 56 : 296), 13.5, 11, cur ? '#92400e' : past ? '#166534' : '#6b7280', 'left', cur ? 900 : 800);
    });
    const cx = PHONE ? Li.x + 14 : Li.x + 376, cy = PHONE ? Li.y + 46 + sd.length * lh + 10 : Li.y + 30, cw = PHONE ? Li.w - 28 : Li.w - 392;
    if (!PHONE) { ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Li.x + 366, Li.y + 14); ctx.lineTo(Li.x + 366, Li.y + Li.h - 14); ctx.stroke(); }
    T(cx, cy, '지금: ' + sd[s].t, PHONE ? 14 : 15, '#b45309', 'left', 900);
    textBlock(cx, cy + 22, cw, sd[s].c, PHONE ? 13.5 : 14, '#374151', PHONE ? 19 : 20, 700);
  }

  /* ----- 순서 배열 ----- */
  const ORD = [
    { id: 'o1', label: '식세포가 항원 조각을 보여 줘요', icon: '🛡️' },
    { id: 'o2', label: '보조 T 림프구가 활성화돼요', icon: '🟠' },
    { id: 'o3', label: 'B 림프구가 활성화돼요', icon: '🔵' },
    { id: 'o4', label: '형질 세포와 기억 B 세포로 분화해요', icon: '⭐' },
    { id: 'o5', label: '형질 세포가 항체를 분비해요', icon: '🔱' },
  ];
  function makeOrder() {
    const cw = PHONE ? 440 : 470, ch = PHONE ? 62 : 58, x0 = PHONE ? 20 : 30, y0 = PHONE ? 20 : 24, gap = PHONE ? 84 : 76;
    S.OR = new Reorder({
      items: ORD.map((o) => Object.assign({ col: '#2563eb', wrap: true, wsize: PHONE ? 14 : 14.5 }, o)),
      slots: ORD.map((_, i) => ({ x: x0, y: y0 + i * gap })), cw, ch, solution: ORD.map((o) => o.id),
      slotNames: ORD.map((_, i) => (i + 1) + '단계'), onChange() { rlast = ''; S.OR.clearBad(); },
    });
  }
  function drawOrder(dt) {
    bgFill('#eef2fb', '#e2e8f4');
    const O = S.OR; O.update(dt); O.drawSlots();
    const x0 = PHONE ? 20 : 30, cw = PHONE ? 440 : 470, gap = PHONE ? 84 : 76, ch = PHONE ? 62 : 58, y0 = PHONE ? 20 : 24;
    for (let i = 0; i < 4; i++) { const y = y0 + i * gap + ch; D.arrow(x0 + cw / 2, y + 1, x0 + cw / 2, y + (gap - ch) - 2, { color: '#94a3b8', width: 3, head: 9 }); }
    if (!PHONE) {
      const px = 530; panel(px, 14, 254, 532, 14);
      T(px + 127, 40, '세포 이름표', 15, '#26324a', 'center', 900);
      [['phag', '식세포'], ['Th', '보조 T 림프구'], ['B', 'B 림프구'], ['plasma', '형질 세포'], ['mem', '기억 B 세포']].forEach((q, i) => { const y = 84 + i * 62; drawCell(q[0], px + 40, y, q[0] === 'phag' ? 22 : 19, { nolabel: false }); T(px + 74, y + 5, q[1], 14, '#26324a', 'left', 800); });
      drawAb(px + 40, 84 + 5 * 62 + 14, 14, 0, 'tri', { col: '#334155' }); T(px + 74, 84 + 5 * 62 + 4, '항체', 14, '#26324a', 'left', 800);
      textBlock(px + 14, 84 + 6 * 62 + 4, 226, '항체를 만드는 면역(체액성)의 순서예요.', 13.5, '#4b5563', 19, 700);
    }
    O.drawCards();
  }


  /* ================= ③ 기억 세포: 1차 · 2차 면역 반응 ================= */
  const ML = PHONE
    ? { sc: { x: 8, y: 8, w: 464, h: 224 }, gr: { x: 8, y: 240, w: 464, h: 300 }, pl: { x: 66, y: 262, w: 392, h: 186 }, note: { x: 8, y: 548, w: 464, h: 84 } }
    : { sc: { x: 16, y: 14, w: 768, h: 226 }, gr: { x: 16, y: 248, w: 768, h: 298 }, pl: { x: 96, y: 270, w: 664, h: 206 }, note: null };
  const INF1 = simInfect(ab1f, 28), INF2 = simInfect(ab2f, 28);
  const EPC = { A1: '#2563eb', A2: '#dc2626', B1: '#16a34a' };
  const EPN = { A1: '병원체 A 첫 침입', A2: '병원체 A 두 번째 침입', B1: '병원체 B 첫 침입' };
  const epAf = (ep) => (ep === 'A2' ? ab2f : ab1f), epInf = (ep) => (ep === 'A2' ? INF2 : INF1);
  const symDays = (ep, day) => { const I = epInf(ep); let n = 0; for (let i = 0; i <= Math.min(I.P.length - 1, Math.round(day / I.dt)); i++) if (I.P[i] > 20) n++; return n * I.dt; };
  function makeMem() {
    const rg = mulberry(31);
    S.M = { ep: null, day: 0, run: false, done: { A1: false, A2: false, B1: false }, memA: 0, memB: 0, pop: 0, pp: Array.from({ length: 16 }, () => ({ u: 0.58 + rg() * 0.36, v: 0.14 + rg() * 0.72, ph: rg() * TAU })), ab: Array.from({ length: 44 }, () => ({ u: 0.36 + rg() * 0.58, v: 0.1 + rg() * 0.8, ph: rg() * TAU, r: rg() })) };
    rlast = '';
  }
  function memStart(ep) {
    const M = S.M; if (M.run || M.done[ep]) return; if (ep === 'A2' && !M.done.A1) return;
    M.ep = ep; M.day = 0; M.run = true; Sound.click(); rlast = ''; syncControls();
  }
  function stepMem(dt) {
    const M = S.M; M.pop = Math.max(0, M.pop - dt);
    if (!M.run) return;
    M.day = Math.min(28, M.day + dt * (RM ? 12 : 3.1));
    if (M.day >= 28) { M.run = false; M.done[M.ep] = true; if (M.ep === 'A1') M.memA = 3; if (M.ep === 'B1') M.memB = 3; M.pop = 1.5; Sound.success(); rlast = ''; syncControls(); }
  }
  const mp = (u, v) => ({ x: ML.sc.x + u * ML.sc.w, y: ML.sc.y + v * ML.sc.h });
  function drawMem(dt) {
    bgFill('#f7ecec', '#efe0e0');
    const M = S.M, sc = ML.sc, rs = PHONE ? 0.7 : 1, ep = M.ep, kA = ep === 'B1' ? 'sq' : 'tri';
    panel(sc.x, sc.y, sc.w, sc.h, 16);
    ctx.save(); D.roundRect(sc.x, sc.y, sc.w, sc.h, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h); g.addColorStop(0, '#fff3ef'); g.addColorStop(1, '#ffe3de'); ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    RBCS.forEach((q) => { const u = (q.u + clock * q.sp) % 1; drawRBC(sc.x + u * sc.w, sc.y + q.v * sc.h, 10 * rs * q.s, q.r + clock * 0.2, { alpha: 0.4 }); });
    const A = ep ? epAf(ep)(M.day) : 0, I = ep ? epInf(ep) : null, P = I ? I.at(M.day) : 0;
    const rl = 22 * rs;
    // 림프구 보관 구역 (왼쪽)
    D.roundRect(sc.x + 8, sc.y + 30, sc.w * 0.32, sc.h - 40, 12); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#d6a7a7'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    T(sc.x + 14, sc.y + 24, '림프구', 13, '#7f1d1d', 'left', 800);
    const zx = (k) => sc.x + (PHONE ? 26 : 38) + k * (PHONE ? 36 : 58), zy = (row) => sc.y + sc.h * (row ? 0.78 : 0.44);
    const memPop = M.pop > 0 ? 1 + 0.25 * Math.sin(M.pop * 8) : 1;
    drawCell('B', zx(0), zy(0) + Math.sin(clock) * 2, rl, { rec: { kind: 'tri', n: 3 }, glow: M.run && ep === 'A1' && A >= 1 ? 0.6 + 0.3 * Math.sin(clock * 5) : 0 });
    drawCell('B', zx(0), zy(1) + Math.sin(clock + 2) * 2, rl, { rec: { kind: 'sq', n: 3 }, glow: M.run && ep === 'B1' && A >= 1 ? 0.6 + 0.3 * Math.sin(clock * 5) : 0 });
    T(sc.x + 14, zy(0) - rl - 12, '▲ 항원에 맞는 림프구', PHONE ? 11 : 12.5, '#1e40af', 'left', 800); T(sc.x + 14, zy(1) - rl - 12, '■ 항원에 맞는 림프구', PHONE ? 11 : 12.5, '#047857', 'left', 800);
    for (let i = 0; i < M.memA; i++) { const boost = ep === 'A2' && M.run ? 0.5 + 0.4 * Math.sin(clock * 6 + i) : 0; drawCell('mem', zx(i + 1), zy(0), rl * 0.9 * (ep === 'A1' ? memPop : 1), { rec: { kind: 'tri', n: 3 }, glow: boost }); }
    for (let i = 0; i < M.memB; i++) drawCell('mem', zx(i + 1), zy(1), rl * 0.9 * (ep === 'B1' ? memPop : 1), { rec: { kind: 'sq', n: 3 } });
    // 병원체 · 항체 · 형질 세포
    if (ep) {
      const nP = P < 0.3 ? 0 : Math.max(1, Math.round(P / 100 * M.pp.length));
      for (let i = 0; i < nP; i++) {
        const q = M.pp[i], p = mp(q.u + Math.sin(clock * 0.8 + q.ph) * 0.012, q.v + Math.cos(clock * 0.7 + q.ph) * 0.02);
        ctx.save(); drawBact(p.x, p.y, 11 * rs, q.ph, '#16a34a', { len: 1.4, dna: false }); for (let k = 0; k < 3; k++) { const aa = q.ph + k * 2.1; drawAg(kA, p.x + Math.cos(aa) * 14 * rs, p.y + Math.sin(aa) * 10 * rs, 3.8 * rs, aa); } ctx.restore();
      }
      const nAb = Math.round(A / 100 * M.ab.length), bound = Math.min(nAb, nP * 3);
      for (let i = 0; i < nAb; i++) {
        const q = M.ab[i];
        if (i < bound) { const pp = M.pp[Math.floor(i / 3)], base = mp(pp.u, pp.v), aa = pp.ph + (i % 3) * 2.1 + Math.PI / 6; drawAb(base.x + Math.cos(aa) * 22 * rs, base.y + Math.sin(aa) * 17 * rs, 8 * rs, aa + Math.PI / 2 + Math.PI, kA, { col: '#334155' }); }
        else { const x = sc.x + sc.w * (q.u + Math.sin(clock * 0.9 + q.ph) * 0.02), y = sc.y + sc.h * (q.v + Math.cos(clock * 0.8 + q.ph) * 0.03); drawAb(x, y, 8 * rs, q.ph + clock * 0.3, kA, { col: '#334155' }); }
      }
      const nPl = Math.round(A / 100 * 6);
      for (let i = 0; i < nPl; i++) { const p = mp(0.36 + i * 0.06, 0.2 + (i % 2) * 0.08); drawCell('plasma', p.x, p.y, rl * 0.85, { nolabel: true }); }
      if (M.run && A < 1 && ep !== 'A2') { D.label(zx(0) + 90 * rs, zy(ep === 'B1' ? 1 : 0) + 4, '⏳ 활성화 대기 중…', { bg: '#475569', size: PHONE ? 11.5 : 12.5, pad: 6 }); }
      else if (M.run && ep === 'A2') D.label(mp(0.4, 0.07).x, mp(0.4, 0.07).y, '⚡ 기억 세포가 빠르게 분열!', { bg: '#b45309', size: PHONE ? 11.5 : 12.5, pad: 6 });
      else if (M.run && A >= 1 && A < 8) D.label(mp(0.4, 0.07).x, mp(0.4, 0.07).y, '항체를 만들기 시작해요', { bg: '#2563eb', size: PHONE ? 11.5 : 12.5, pad: 6 });
    } else T(sc.x + sc.w * 0.62, sc.y + sc.h * 0.5, '왼쪽 단추로 병원체를 침입시켜 보세요', 14, '#7c2d12', 'center', 800);
    ctx.restore();
    T(sc.x + sc.w - 12, sc.y + 22, ep ? (EPN[ep] + ' · ' + (Math.floor(M.day * 10) / 10) + '일째') : '혈관 속 (모형)', PHONE ? 12.5 : 14, '#374151', 'right', 900);
    // ----- 그래프 -----
    const Gr = ML.gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 16);
    const Pl = plotBox(ML.pl, { x0: 0, x1: 28, y0: 0, y1: 100, xt: [0, 7, 14, 21, 28], yt: [0, 20, 40, 60, 80, 100], xl: '병원체 침입 후 시간 (일)', yl: '항체 농도 (상대값)', ylx: PHONE ? 44 : 52 });
    Pl.drawAxes();
    ctx.save(); ctx.beginPath(); ctx.rect(Pl.b.x, Pl.b.y - 4, Pl.b.w + 2, Pl.b.h + 4); ctx.clip(); ctx.lineJoin = 'round';
    ['A1', 'A2', 'B1'].forEach((k) => {
      const dmax = M.done[k] ? 28 : (M.run && M.ep === k ? M.day : 0); if (dmax <= 0) return;
      ctx.strokeStyle = EPC[k]; ctx.lineWidth = k === 'B1' ? 3.2 : 3.6; ctx.setLineDash(k === 'B1' ? [9, 6] : []); ctx.beginPath(); const f = epAf(k);
      for (let i = 0; i <= 90; i++) { const d = dmax * i / 90, x = Pl.X(d), y = Pl.Y(f(d)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    if (M.run) { const x = Pl.X(M.day), y = Pl.Y(A); D.sphere(x, y, 6, EPC[ep], { gloss: true, outline: '#fff', outlineWidth: 2 }); }
    if (M.done.A1) { const x = Pl.X(14), y = Pl.Y(10); D.sphere(x, y, 4.5, EPC.A1, { gloss: false }); D.label(x + 8, y - 16, '최대 약 10 (14일)', { bg: EPC.A1, size: PHONE ? 11.5 : 12.5, pad: 6, align: 'left' }); }
    if (M.done.A2) { const x = Pl.X(7), y = Pl.Y(100); D.sphere(x, y, 4.5, EPC.A2, { gloss: false }); D.label(x + 8, y + 12, '최대 약 100 (7일)', { bg: EPC.A2, size: PHONE ? 11.5 : 12.5, pad: 6, align: 'left' }); }
    // 범례
    const lx = Pl.b.x + Pl.b.w - (PHONE ? 176 : 214), ly = Pl.b.y + 14;
    D.roundRect(lx - 8, ly - 12, PHONE ? 178 : 214, 66, 8); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    ['A1', 'A2', 'B1'].forEach((k, i) => { ctx.fillStyle = EPC[k]; if (k === 'B1') { ctx.fillRect(lx, ly + i * 20 - 4, 7, 5); ctx.fillRect(lx + 11, ly + i * 20 - 4, 7, 5); } else ctx.fillRect(lx, ly + i * 20 - 4, 18, 5); T(lx + 24, ly + i * 20 + 2, EPN[k], PHONE ? 11.5 : 12.5, '#26324a', 'left', 800); });
    if (!PHONE) {
      const sd = ep ? symDays(ep, M.day) : 0;
      T(Gr.x + 14, Gr.y + Gr.h - 12, ep ? '증상 수준(병원체 수 20 초과)이었던 기간: ' + (Math.round(sd * 10) / 10) + '일 · ' + (ep === 'A2' ? '기억 세포 덕분에 병원체가 거의 늘지 못했어요.' : '처음 만난 병원체라 항체가 늦게 생겼어요.') : '', 13.5, '#374151', 'left', 800);
    } else {
      const N = ML.note; panel(N.x, N.y, N.w, N.h, 14); const sd = ep ? symDays(ep, M.day) : 0;
      textBlock(N.x + 12, N.y + 26, N.w - 24, ep ? '증상 수준(병원체 수 20 초과)이었던 기간: ' + (Math.round(sd * 10) / 10) + '일. ' + (ep === 'A2' ? '기억 세포 덕분에 병원체가 거의 늘지 못했어요.' : '처음 만난 병원체라 항체가 늦게 생겼어요.') : '① → ② → ③ 순서로 침입시켜 보세요.', 13.5, '#374151', 19, 700);
    }
  }

  /* ================= ④ 면역 구분 (분류 · 비교표) ================= */
  const CLS = [
    { id: 'c1', label: '눈물의 리소자임', short: '눈물의 리소자임', icon: '💧', ans: 'inn' },
    { id: 'c2', label: '피부', short: '피부', icon: '🧴', ans: 'inn' },
    { id: 'c3', label: '위산', short: '위산', icon: '🍋', ans: 'inn' },
    { id: 'c4', label: '식균 작용', short: '식균 작용', icon: '🛡️', ans: 'inn' },
    { id: 'c5', label: '염증 반응', short: '염증 반응', icon: '🔥', ans: 'inn' },
    { id: 'c6', label: '항체 생성', short: '항체 생성', icon: '🔱', ans: 'acq' },
    { id: 'c7', label: '세포독성 T 림프구의 감염 세포 제거', short: '세포독성 T 림프구', icon: '🎯', ans: 'acq' },
    { id: 'c8', label: '홍역을 앓은 뒤 재감염 방지', short: '홍역 후 재감염 방지', icon: '🔁', ans: 'acq' },
    { id: 'c9', label: '점막의 섬모', short: '점막의 섬모', icon: '🌿', ans: 'inn' },
    { id: 'c10', label: '발열', short: '발열', icon: '🌡️', ans: 'inn' },
  ];
  function makeCls() {
    const boxes = PHONE
      ? [{ id: 'inn', label: '선천적 면역', col: '#0891b2', x: 8, y: 8, w: 226, h: 222, cols: 1, hdr: 30 }, { id: 'acq', label: '후천적 면역', col: '#9333ea', x: 246, y: 8, w: 226, h: 222, cols: 1, hdr: 30 }]
      : [{ id: 'inn', label: '선천적 면역 (비특이적)', col: '#0891b2', x: 16, y: 14, w: 380, h: 214, cols: 2, hdr: 30 }, { id: 'acq', label: '후천적 면역 (특이적)', col: '#9333ea', x: 404, y: 14, w: 380, h: 214, cols: 2, hdr: 30 }];
    S.SO = new Sorter({
      cards: CLS.map((c) => Object.assign({}, c, { col: '#475569' })), boxes,
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 240 + Math.floor(i / 2) * 51 }) : (i) => ({ x: 16 + (i % 4) * 193, y: 244 + Math.floor(i / 4) * 62 }),
      cw: PHONE ? 228 : 186, ch: PHONE ? 46 : 56, kh: PHONE ? 22 : 28, onChange() { rlast = ''; },
    });
    S.TB = new CellTable({
      x: PHONE ? 8 : 16, y: PHONE ? 12 : 20, w: PHONE ? 464 : 768, labW: PHONE ? 100 : 160, headH: 46, rowH: PHONE ? 70 : 78,
      cols: [{ label: '반응 속도', opts: ['빠르다', '느리다'] }, { label: '특이성', opts: ['비특이적', '특이적'] }, { label: '기억', opts: ['없다', '있다'] }],
      rows: ['선천적 면역', '후천적 면역'], ans: [[0, 0, 0], [1, 1, 1]], onChange() { rlast = ''; },
    });
  }
  function drawCls(dt) {
    bgFill('#f1f5f7', '#e2e9ee');
    if (S.sub.cls === 'sort') {
      const so = S.SO; so.update(dt); so.drawBoxes(); so.drawCards();
      if (!PHONE) { const ty = 244 + 3 * 62 + 4; panel(16, ty, 768, VH - ty - 12, 12); TF(400, ty + 30, '카드를 눌러 선택하거나 끌어서 상자에 넣어요. 병원체를 가리는가, 기억이 남는가를 생각해요.', 740, 14, 11, '#26324a', 'center', 800); }
    } else {
      const tb = S.TB; tb.update(dt); tb.draw();
      const TY = tb.o.y + tb.h + 16, bx = tb.o.x, bw = tb.o.w;
      panel(bx, TY, bw, VH - TY - (PHONE ? 8 : 14), 14);
      const lines = ['• 선천적 면역: 태어날 때부터 있어요. 병원체의 종류를 가리지 않고 빠르게 반응하지만 기억하지는 않아요.', '• 후천적 면역: 병원체마다 특이적이에요. 처음에는 활성화에 약 4~7일이 걸리지만 기억 세포가 남아 다음에는 빨라요.', '• 면역 세포가 제 기능을 못 하면(예: HIV는 보조 T 림프구를 파괴) 감염에 취약해져요.'];
      let yy = TY + 26; lines.forEach((l) => { yy += textBlock(bx + 14, yy, bw - 28, l, PHONE ? 13 : 14, '#374151', PHONE ? 18 : 20, 700) + 4; });
    }
  }

  /* ============ 장면 전환 · 조작 연결 ============ */
  function onEnterView() {
    const key = viewKey(); PT = null;
    if (key === 'inn:barrier') PT = { down(p) { for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, IR.bar(i))) { barAttack(i); break; } return false; }, hover(p) { for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, IR.bar(i))) return 'pointer'; return 'default'; } };
    else if (key === 'lym:order') PT = S.OR;
    else if (key === 'cls:sort') PT = S.SO;
    else if (key === 'cls:table') PT = S.TB;
  }
  function syncControls() {
    const W = S.W, L = S.L, M = S.M;
    $('#oBar').textContent = barDoneN() + ' / 4';
    $('#barNote').innerHTML = '장치를 <b>눌러서</b> 병원체를 침입시키고, 막는 모습을 관찰해요. 막은 장치: ' + BARS.map((b, i) => (S.BP[i].done ? '✅' : '⬜') + b.name).join(' ');
    markSeg('#phChips', 'k', W.type);
    $$('#phChips button').forEach((b) => { b.classList.toggle('done', !!W.ran[b.dataset.k]); b.disabled = W.run; });
    $('#bWound').disabled = W.run; $('#bWound').textContent = W.run ? '진행 중… ' + W.eng + ' / ' + NPH : '▶ 상처로 침입시키기';
    $('#woundNote').innerHTML = '식세포가 삼킨 병원체 <b>' + W.eng + ' / ' + NPH + '</b> · 끝낸 종류: ' + ['bact', 'fungus', 'virus'].map((k) => (W.ran[k] ? '✅' : '⬜') + PKIND[k]).join(' ');
    markSeg('#situChips', 'k', L.kind);
    $('#bLymPlay').textContent = L.auto ? '⏸ 멈추기' : (L.stage >= lN() ? '▶ 다시 재생' : (L.stage > 0 ? '▶ 이어서 재생' : '▶ 재생'));
    $('#bLymNext').disabled = L.stage >= lN();
    $('#lymNote').innerHTML = '단계 <b>' + L.stage + ' / ' + lN() + '</b> · 끝까지 본 경로: ' + (L.done.hum ? '✅' : '⬜') + '체액성 ' + (L.done.cell ? '✅' : '⬜') + '세포성';
    $('#oEp').textContent = M.ep ? EPN[M.ep] : '—';
    $('#bEpA1').disabled = M.run || M.done.A1; $('#bEpA2').disabled = M.run || M.done.A2 || !M.done.A1; $('#bEpB1').disabled = M.run || M.done.B1;
    $('#bEpA1').textContent = M.done.A1 ? '✔ ① 병원체 A 첫 침입' : '① 병원체 A 첫 침입'; $('#bEpA2').textContent = M.done.A2 ? '✔ ② 병원체 A 두 번째 침입' : '② 병원체 A 두 번째 침입'; $('#bEpB1').textContent = M.done.B1 ? '✔ ③ 병원체 B 첫 침입' : '③ 병원체 B 첫 침입';
    $('#memNote').innerHTML = M.run ? '진행 중… ' + (Math.floor(M.day * 10) / 10) + '일' : (!M.done.A1 ? '먼저 ①을 눌러요. ②는 ①이 끝나야 눌러요.' : '곡선을 비교해 보세요. 두 번째 침입은 어떻게 달라졌나요?');
  }
  on('#bBarReset', 'click', () => { Sound.click(); makeBar(); syncControls(); });
  on('#phChips', 'click', (e) => { const b = e.target.closest('button'); if (!b || S.W.run) return; Sound.click(); S.W.type = b.dataset.k; if (!S.W.run) { const keep = { type: S.W.type, ran: S.W.ran }; makeWound(); Object.assign(S.W, keep); } syncControls(); });
  on('#bWound', 'click', woundStart);
  on('#bWoundReset', 'click', () => { Sound.click(); const keep = { type: S.W.type, ran: S.W.ran }; makeWound(); Object.assign(S.W, keep); syncControls(); });
  on('#situChips', 'click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); makeLym(b.dataset.k); syncControls(); });
  on('#bLymPlay', 'click', () => { const L = S.L; Sound.click(); if (L.stage >= lN()) { makeLym(L.kind); L.auto = true; } else L.auto = !L.auto; if (L.auto && L.stage === 0) lymNext(); syncControls(); });
  on('#bLymNext', 'click', () => { S.L.auto = false; lymNext(); syncControls(); });
  on('#bLymReset', 'click', () => { Sound.click(); makeLym(S.L.kind); syncControls(); });
  on('#bOrdReset', 'click', () => { Sound.click(); makeOrder(); onEnterView(); rlast = ''; });
  on('#bEpA1', 'click', () => memStart('A1')); on('#bEpA2', 'click', () => memStart('A2')); on('#bEpB1', 'click', () => memStart('B1'));
  on('#bEpReset', 'click', () => { Sound.click(); makeMem(); syncControls(); });
  on('#bClsReset', 'click', () => { Sound.click(); S.SO.reset(); });
  on('#bTabReset', 'click', () => { Sound.click(); S.TB.reset(); });

  function readouts() {
    const key = viewKey(), W = S.W, L = S.L, M = S.M;
    if (key === 'inn:barrier') setReadouts([['막은 장치', barDoneN() + ' / 4'], ['진행 중', S.BP.filter((b) => b.t >= 0 && b.t < 3).length + '개'], ['특징', '종류를 가리지 않아요']]);
    else if (key === 'inn:wound') setReadouts([['삼킨 병원체', W.eng + ' / ' + NPH], ['혈관 확장', Math.round(W.dil * 100) + ' %'], ['체온', W.temp.toFixed(1) + ' °C']]);
    else if (key === 'lym:play') setReadouts([['단계', L.stage + ' / ' + lN()], ['상황', L.kind === 'hum' ? '체액성(세균)' : '세포성(바이러스)'], ['지금', STG[L.kind].st[L.stage].t]]);
    else if (key === 'lym:order') setReadouts([['맞는 자리', (5 - S.OR.wrongIds().length) + ' / 5'], ['면역', '체액성'], ['', '']].slice(0, 2));
    else if (key === 'mem') { const A = M.ep ? epAf(M.ep)(M.day) : 0; setReadouts([['침입 후 시간', (Math.floor(M.day * 10) / 10) + ' 일'], ['항체 농도', (Math.round(A * 10) / 10) + ' (상대값)'], ['증상 기간', M.ep ? (Math.round(symDays(M.ep, M.day) * 10) / 10) + ' 일' : '—']]); }
    else if (key === 'cls:sort') setReadouts([['분류한 카드', S.SO.placed + ' / 10'], ['선천적', S.SO.cards.filter((c) => c.zone === 'inn').length + '장'], ['후천적', S.SO.cards.filter((c) => c.zone === 'acq').length + '장']]);
    else setReadouts([['채운 칸', S.TB.filled + ' / 6'], ['틀린 칸 표시', S.TB.bad.flat().filter(Boolean).length + '칸'], ['', '']].slice(0, 2));
  }

  /* ============ 시작 ============ */
  makeBar(); makeWound(); makeLym('hum'); makeOrder(); makeMem(); makeCls();

  /* ============ 단계 · 미션 ============ */
  const levels = [
    {
      title: '선천적 방어: 몸의 첫 번째·두 번째 방어선', short: '선천적 방어', icon: '🧱', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 상처로 세균이 들어오면 우리 몸은 어떤 순서로 막아 낼까? 한 번 앓은 병은 왜 다시 잘 걸리지 않을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 병원체의 종류와 전염 경로를 배웠어요. 이번에는 병원체가 몸에 들어오려 할 때 <b>우리 몸이 어떻게 막는지</b> 살펴봐요.</div>' +
        '<p>몸의 방어 작용은 <b>선천적 면역</b>(병원체의 종류를 가리지 않고 빠르게 반응)과 <b>후천적 면역</b>(특정 병원체에만 반응)으로 나뉘어요. 먼저 선천적 면역의 <b>1차 방어</b>(피부·점막·눈물·위산)와 <b>2차 방어</b>(식균 작용·염증)를 관찰해요.</p>',
      features: ['inn'],
      setup() { setScene('inn', 'barrier'); },
      recap: '선천적 면역은 병원체의 종류를 가리지 않고 빠르게 막아요. 1차 방어(피부·점막·눈물·위산)를 뚫으면 식균 작용과 염증 반응이 일어나요.',
      summary: '<ul><li><b>선천적 면역</b>(비특이적): 병원체의 종류를 가리지 않고 빠르게 반응해요.</li>' +
        '<li><b>1차 방어</b>: 피부(각질층), 점막·섬모(점액으로 붙잡아 밀어냄), 눈물·침의 리소자임(세균 세포벽 분해), 위산(강한 산성).</li>' +
        '<li><b>2차 방어</b>: 식세포가 병원체를 삼켜 분해하는 <b>식균 작용</b>, 혈관이 넓어져 붉어지고 열나고 붓고 아픈 <b>염증 반응</b>, <b>발열</b>.</li></ul>',
      missions: [
        {
          title: '1차 방어 장치 4가지 찾기',
          goal: '피부·점막·눈물·위산 <b>네 장치를 모두 눌러</b> 병원체를 막는 모습을 확인하세요.',
          hint: '네 칸을 하나씩 눌러요. 약 3초 뒤에 ✔ 막았어요가 붙어요.',
          setup() { makeBar(); setScene('inn', 'barrier'); syncControls(); },
          check: () => barDoneN() === 4, hold: 0.5,
          status: () => BARS.map((b, i) => (S.BP[i].done ? '✅' : '⬜') + b.name).join(' '),
          explain: '<b>피부</b>의 각질층, <b>점막</b>의 점액과 섬모, <b>눈물·침</b>의 리소자임, <b>위산</b>은 병원체가 몸 안으로 들어오기 전에 막는 <b>1차 방어</b>예요. 병원체가 무엇이든 똑같이 막기 때문에 <b>비특이적</b>이에요.',
        },
        {
          title: '식균 작용과 염증 반응 관찰',
          goal: '상처 화면에서 <b>세균·곰팡이 포자·바이러스</b>를 차례로 침입시켜 식세포가 6개를 모두 삼키게 하세요.',
          hint: '병원체 종류를 고르고 ▶ 상처로 침입시키기를 눌러요. 한 번에 약 15초 걸려요. 세 종류를 모두 해 보세요.',
          setup() { const keep = { ran: {} }; makeWound(); Object.assign(S.W, keep); setScene('inn', 'wound'); syncControls(); },
          check: () => ['bact', 'fungus', 'virus'].every((k) => S.W.ran[k]), hold: 0.4,
          status: () => ['bact', 'fungus', 'virus'].map((k) => (S.W.ran[k] ? '✅' : '⬜') + PKIND[k]).join(' ') + ' &nbsp; 삼킨 수 ' + S.W.eng + ' / ' + NPH,
          explain: '병원체가 1차 방어를 뚫으면 <b>식세포</b>가 병원체를 삼켜 분해해요(식균 작용). 세균이든 곰팡이든 바이러스든 <b>똑같이 반응</b>해요(비특이적). 상처 주변에서는 혈관이 넓어져 식세포가 많이 모이고, 그 결과 붉어지고 열이 나고 붓고 아픈 <b>염증 반응</b>이 나타나요.',
        },
        {
          type: 'quiz', title: '염증 반응은 왜 일어날까?',
          goal: '상처 부위가 <b>붉어지고 붓고 열이 나는 염증 반응</b>의 목적은 무엇일까요?',
          setup() { setScene('inn', 'wound'); },
          choices: ['혈관을 넓혀 식세포와 체액을 상처 부위로 모아 병원체를 없애려고', '병원체가 더 빨리 증식하도록 돕기 위해', '항체를 만들어 병원체를 기억해 두려고', '상처를 붉게 해서 병원체가 몸에 들어오지 못하게 막으려고'],
          answer: 0,
          feedback: ['', '염증은 병원체를 없애려는 반응이에요. 오히려 열이 나면 병원체의 증식이 느려져요.', '병원체를 기억하는 것은 후천적 면역(기억 세포)이에요. 염증은 기억하지 않아요.', '붉어지는 것은 혈관이 넓어져 피가 많이 모였기 때문이에요. 병원체를 막는 방패는 아니에요.'],
          explain: '염증 반응에서는 <b>혈관이 확장</b>되어 혈류가 늘고(붉어짐, 열감), 체액이 빠져나와(부음) <b>식세포가 상처 부위에 모여</b> 병원체를 삼켜요. 통증은 손상을 알리는 신호예요.',
        },
      ],
    },
    {
      title: '림프구의 작용: 항체는 어떻게 만들어질까?', short: '림프구', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 식세포가 병원체를 삼켜 분해하는 것을 보았어요. 이 식세포가 다음에 <b>림프구</b>를 불러 <b>후천적 면역</b>을 시작해요.</div>' +
        '<p>후천적 면역은 <b>특정 병원체(항원)에만</b> 반응해요. <b>체액성 면역</b>(혈액 속 세균): 식세포 → 보조 T 림프구 → B 림프구 → <b>형질 세포가 항체 분비</b>. <b>세포성 면역</b>(세포 안 바이러스): <b>세포독성 T 림프구가 감염된 세포를 제거</b>. 두 경로를 재생해서 확인해요.</p>',
      features: ['lym'],
      setup() { setScene('lym', 'play'); },
      recap: '식세포가 항원을 보여 주면 보조 T 림프구가 활성화되고, 체액성 면역에서는 B 림프구가 형질 세포(항체 분비)와 기억 세포가 돼요. 세포성 면역에서는 세포독성 T 림프구가 감염된 세포를 제거해요.',
      summary: '<ul><li><b>후천적 면역</b>(특이적): 항원 제시 → 보조 T 림프구 활성화 → 체액성/세포성 면역.</li>' +
        '<li><b>체액성 면역</b>(혈액 속 병원체): B 림프구 활성화 → <b>형질 세포</b>가 <b>항체</b> 분비 + <b>기억 B 세포</b> 형성.</li>' +
        '<li><b>세포성 면역</b>(세포 안 병원체): <b>세포독성 T 림프구</b>가 감염된 세포를 찾아 제거.</li>' +
        '<li>항체의 특이성(항원–항체 반응)은 다음 차시에서 자세히 알아봐요.</li></ul>',
      missions: [
        {
          title: '체액성·세포성 면역 두 경로 재생',
          goal: '<b>혈액 속 세균</b>과 <b>세포 안 바이러스</b> 두 상황을 각각 끝까지 재생해 보세요.',
          hint: '▶ 재생을 누르면 단계가 자동으로 넘어가요. ⏭ 다음 단계로 직접 넘겨도 돼요. 위의 단추로 상황을 바꿔요.',
          setup() { S.L.done = { hum: false, cell: false }; makeLym('hum'); setScene('lym', 'play'); syncControls(); },
          check: () => S.L.done.hum && S.L.done.cell, hold: 0.4,
          status: () => (S.L.done.hum ? '✅' : '⬜') + '혈액 속 세균(체액성) &nbsp; ' + (S.L.done.cell ? '✅' : '⬜') + '세포 안 바이러스(세포성)',
          explain: '혈액 속 세균은 <b>항체</b>(체액성 면역)로, 세포 안으로 들어간 바이러스는 항체가 닿지 못하므로 <b>세포독성 T 림프구</b>가 감염된 세포를 제거해요(세포성 면역). 두 경로 모두 식세포의 <b>항원 제시</b>와 보조 T 림프구의 활성화로 시작해요.',
        },
        {
          title: '체액성 면역의 순서 배열', manual: true,
          goal: '카드 5장을 끌어서 항체가 만들어지는 <b>순서대로</b> 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '식세포가 항원 조각을 보여 주면 보조 T 림프구가 활성화돼요. 그 신호로 B 림프구가 활성화된 다음, 형질 세포가 돼요.',
          setup() { makeOrder(); setScene('lym', 'order'); },
          check() { const O = S.OR; if (O.solved) { O.clearBad(); return true; } O.markBad(O.wrongIds()); return '빨간 카드는 자리가 달라요. "누가 누구를 활성화하는지" 순서를 이어 보세요.'; },
          status: () => '맞는 자리 ' + (5 - S.OR.wrongIds().length) + ' / 5',
          explain: '식세포가 <b>항원 조각을 보여 주면</b> → <b>보조 T 림프구</b>가 활성화되고 → 그 신호로 <b>B 림프구</b>가 활성화되며 → B 림프구가 <b>형질 세포</b>(와 기억 B 세포)로 분화하고 → 형질 세포가 <b>항체를 분비</b>해요.',
        },
        {
          type: 'quiz', title: '항체는 어디서 만들어질까?',
          goal: '혈액으로 <b>항체를 분비</b>하는 세포는 무엇일까요?',
          setup() { setScene('lym', 'play'); },
          choices: ['형질 세포 (B 림프구에서 분화)', '식세포', '보조 T 림프구', '세포독성 T 림프구'],
          answer: 0,
          feedback: ['', '식세포는 병원체를 삼키고 항원을 보여 줄 뿐 항체를 만들지는 않아요.', '보조 T 림프구는 다른 림프구를 활성화하는 신호를 줘요. 항체는 만들지 않아요.', '세포독성 T 림프구는 감염된 세포를 직접 파괴해요. 항체는 형질 세포가 만들어요.'],
          explain: '항체는 <b>B 림프구가 분화한 형질 세포</b>가 만들어 분비해요. 항체는 단백질로, 항원에 특이적으로 결합해 병원체를 무력화해요.',
        },
      ],
    },
    {
      title: '기억 세포: 두 번째는 왜 빠를까?', short: '기억 세포', icon: '⭐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> B 림프구가 형질 세포와 <b>기억 B 세포</b>로 분화하는 것을 보았어요. 기억 세포가 있으면 같은 병원체가 <b>두 번째</b> 침입했을 때 어떻게 달라질까요?</div>' +
        '<p>병원체 A가 처음 침입한 뒤, 다시 침입했을 때 <b>항체 농도</b>가 시간에 따라 어떻게 변하는지 비교해요. 또 처음 보는 <b>병원체 B</b>가 오면 어떻게 되는지도 확인해요.</p>',
      features: ['mem'],
      setup() { setScene('mem'); },
      recap: '처음 만난 병원체는 항체가 늦게(약 1주) 생기고 적게(최대 약 10) 만들어져요. 기억 세포가 있으면 두 번째에는 빠르게(약 2일) 많이(최대 약 100) 만들어져 증상이 거의 없어요. 다른 병원체가 오면 처음부터 다시 시작해요.',
      summary: '<ul><li><b>1차 면역 반응</b>: 항체가 생기기까지 약 1주, 최대 농도가 낮아요(예: 약 10). 증상이 나타나요.</li>' +
        '<li><b>2차 면역 반응</b>: 기억 세포가 빠르게 분열 → 약 2일에 항체가 늘고 최대 농도가 약 10배(예: 약 100), 증상이 거의 없어요.</li>' +
        '<li>기억 세포는 <b>특정 병원체</b>만 기억해요. 다른 병원체(B)가 오면 다시 1차 반응이에요(특이성).</li></ul>',
      missions: [
        {
          title: '같은 병원체를 두 번 만나기',
          goal: '① 병원체 A 첫 침입 → ② A 두 번째 침입 → ③ 병원체 B 첫 침입을 차례로 침입시켜 세 곡선을 비교하세요.',
          hint: '왼쪽 단추를 ①, ②, ③ 순서로 눌러요. 한 번에 약 9초 걸려요. ②는 ①이 끝나야 눌러져요.',
          setup() { makeMem(); setScene('mem'); syncControls(); },
          check: () => S.M.done.A1 && S.M.done.A2 && S.M.done.B1, hold: 0.5,
          status: () => ['A1', 'A2', 'B1'].map((k) => (S.M.done[k] ? '✅' : '⬜') + EPN[k]).join(' '),
          explain: '<b>두 번째 침입(A)</b>은 첫 번째보다 항체가 <b>더 빨리(약 2일)</b>, <b>훨씬 많이(최대 약 100, 첫 침입의 약 10배)</b> 만들어져서 증상이 거의 없어요. <b>병원체 B</b>는 기억 세포가 없어서 다시 첫 침입처럼 늦고 적게 반응해요. 그래서 기억은 <b>특정 병원체에만</b> 적용돼요.',
        },
        {
          type: 'quiz', title: '홍역을 앓은 뒤 다시 걸리지 않는 까닭',
          goal: '한 번 홍역을 앓은 사람이 <b>다시 홍역에 잘 걸리지 않는 까닭</b>은?',
          setup() { setScene('mem'); },
          choices: ['홍역 바이러스에 대한 기억 세포가 남아 있어 다시 침입하면 빠르게 많은 항체를 만들기 때문', '선천적 면역이 강해져서 모든 병원체를 막기 때문', '홍역 바이러스가 약해져서 몸에 들어오지 못하기 때문', '처음에 만든 항체가 평생 그대로 혈액에 많이 남아 있기 때문'],
          answer: 0,
          feedback: ['', '선천적 면역은 기억하지 못하고 병원체마다 세지지도 않아요. 홍역만 막는 것은 후천적 면역의 기억이에요.', '병원체가 약해지는 것이 아니라 우리 몸의 반응이 빨라지는 거예요.', '항체 농도는 시간이 지나면 줄어들어요. 대신 기억 세포가 남아 있다가 빠르게 다시 만들어요.'],
          explain: '앓고 난 뒤 <b>기억 B 세포</b>가 남아 있어요. 같은 병원체가 다시 오면 기억 세포가 빠르게 분열해 <b>짧은 시간에 많은 항체</b>를 만들고(2차 면역 반응), 증상이 나타나기 전에 병원체를 없애요. 다른 병원체에는 해당하지 않아요(특이성).',
        },
      ],
    },
    {
      title: '면역 구분: 선천적일까, 후천적일까?', short: '면역 구분', icon: '🗂', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 병원체 종류를 가리지 않는 방어(선천적)와 특정 병원체를 기억하는 방어(후천적)를 모두 보았어요. 이제 여러 <b>사례</b>를 두 가지로 구분해요.</div>' +
        '<p>사례 카드 10장을 <b>선천적 면역</b>과 <b>후천적 면역</b>으로 분류하고, <b>속도·특이성·기억</b>을 비교표로 정리해요.</p>',
      features: ['cls'],
      setup() { setScene('cls', 'sort'); },
      recap: '선천적 면역은 빠르고 비특이적이며 기억이 없어요. 후천적 면역은 처음엔 느리지만 특이적이고 기억 세포가 남아요.',
      summary: '<table class="mini"><tr><th></th><th>속도</th><th>특이성</th><th>기억</th></tr><tr><th>선천적 면역</th><td>빠르다</td><td>비특이적</td><td>없다</td></tr><tr><th>후천적 면역</th><td>느리다(처음)</td><td>특이적</td><td>있다</td></tr></table>' +
        '<ul><li>선천적: 피부, 점막·섬모, 눈물의 리소자임, 위산, 식균 작용, 염증, 발열.</li><li>후천적: 항체 생성(체액성), 세포독성 T 림프구의 감염 세포 제거(세포성), 기억 세포에 의한 재감염 방지.</li>' +
        '<li>면역 세포가 제 기능을 못 하면(예: HIV는 보조 T 림프구를 파괴) 감염에 취약해져요.</li></ul>',
      missions: [
        {
          title: '사례 카드 10장 분류', manual: true,
          goal: '카드를 끌어서 <b>선천적 면역</b>과 <b>후천적 면역</b> 상자에 나누고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '병원체의 종류를 가리지 않고 빠르게 막으면 선천적, 특정 병원체에 대해 항체·기억 세포가 관여하면 후천적이에요.',
          setup() { S.SO.reset(); setScene('cls', 'sort'); },
          check() {
            const sd = S.SO, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => c.zone !== CLS.find((q) => q.id === c.id).ans);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 반대쪽 상자예요: ' + wrong.map((c) => c.short).join(', ') + '.';
            return true;
          },
          status: () => '분류한 카드 ' + S.SO.placed + ' / 10',
          explain: '<b>선천적</b>: 눈물의 리소자임, 피부, 위산, 식균 작용, 염증 반응, 점막의 섬모, 발열. <b>후천적</b>: 항체 생성, 세포독성 T 림프구의 감염 세포 제거, 홍역을 앓은 뒤 재감염 방지(기억 세포).',
        },
        {
          title: '선천적·후천적 면역 비교표', manual: true,
          goal: '<b>반응 속도, 특이성, 기억</b> 6칸을 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '칸을 누를 때마다 보기가 바뀌어요. 선천적은 빠르고 종류를 가리지 않아요. 후천적은 처음에는 약 4~7일이 걸려요.',
          setup() { S.TB.reset(); setScene('cls', 'table'); },
          check() {
            const tb = S.TB, miss = tb.total - tb.filled;
            if (miss) return '아직 비어 있는 칸이 ' + miss + '칸 있어요.';
            const w = tb.wrongCells(); tb.markBad(w);
            if (w.length) return '빨간 칸을 다시 생각해 보세요. 어느 면역이 기억 세포를 남기는지 떠올려요.';
            tb.ok = true; return true;
          },
          status: () => '채운 칸 ' + S.TB.filled + ' / 6',
          explain: '<b>선천적 면역</b>은 빠르고(수 분~수 시간) 병원체를 가리지 않으며(비특이적) 기억이 없어요. <b>후천적 면역</b>은 처음에는 느리지만(약 4~7일) 특정 병원체만 인식하고(특이적) <b>기억 세포</b>가 남아 다음에는 빨라요.',
        },
        {
          type: 'quiz', title: '선천적 면역의 이점과 한계',
          goal: '<b>선천적 면역</b>이 모든 병원체에 똑같이 반응하는 것의 이점과 한계로 알맞은 것은?',
          setup() { setScene('cls', 'table'); },
          choices: ['어떤 병원체든 빠르게 막을 수 있지만, 특정 병원체를 기억하지는 못한다', '특정 병원체만 정확히 인식해 강하게 막지만 반응이 느리다', '처음 만난 병원체에는 약 1주가 지나야 작동하지만 기억 세포가 남는다', '같은 병원체가 두 번째 오면 훨씬 빠르고 강하게 반응한다'],
          answer: 0,
          feedback: ['', '그것은 후천적 면역의 특징(특이성)이에요. 선천적 면역은 종류를 가리지 않아요.', '그것도 후천적 면역의 특징이에요. 선천적 면역은 처음부터 빠르게 작동해요.', '두 번째에 더 빠르고 강한 것은 기억 세포가 있는 후천적 면역이에요.'],
          explain: '선천적 면역은 <b>어떤 병원체든 즉시</b> 막는 것이 이점이고, <b>병원체를 기억하지 못해</b> 반복해도 더 강해지지 않는 것이 한계예요. 그래서 후천적 면역이 함께 필요해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-immunity', mount: '#game', badge: '면역 수비대', homeHref: '../../index.html#hb',
    featureLabels: { inn: '🧱 1차 방어 · 식균·염증', lym: '🧬 체액성·세포성 면역 재생 · 순서', mem: '⭐ 1차·2차 면역 반응 그래프', cls: '🗂 사례 분류 · 비교표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  setScene('inn', 'barrier');
  let lastFree = false;
  function stepAll(dt) {
    if (S.mode === 'inn' && S.sub.inn === 'barrier') stepBar(dt);
    if (S.mode === 'inn' && S.sub.inn === 'wound') stepWound(dt);
    if (S.mode === 'lym' && S.sub.lym === 'play') stepLym(dt);
    if (S.mode === 'mem') stepMem(dt);
  }
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    stepAll(dt);
    const key = viewKey();
    if (key === 'inn:barrier') drawBarrier(); else if (key === 'inn:wound') drawWound(dt);
    else if (key === 'lym:play') drawLym(dt); else if (key === 'lym:order') drawOrder(dt);
    else if (key === 'mem') drawMem(dt); else drawCls(dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, IR, LL, ML, BARS, STG, CLS, ORD, INF1, INF2, get game() { return game; }, setScene, barAttack, woundStart, lymNext, memStart, symDays, epAf, makeLym,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) stepAll(0.02); },
  };

})();
