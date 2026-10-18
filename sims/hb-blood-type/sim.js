/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 항원-항체와 혈액형
   성취기준 [12생과02-06] 항원 항체 반응의 특이성을 이해하고, 혈액의 응집 반응 원리를 이용하여 혈액형을 판정할 수 있다.
   ① 모형: 항원-항체  ② 모형: ABO 응집  ③ 실험: 혈액형 검사  ④ 적용: 수혈 적용
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
  const S = { mode: 'ag', sub: { ag: 'match', abo: 'draw', test: '', use: 'trans' }, fade: 0, AM: null, CL: null, AD: null, MX: null, TS: null, TR: null, SO: null };
  const SCENES = {
    ag: { label: '🔑 항원-항체 반응', subs: [['match', '🔑 짝짓기'], ['clump', '🧫 응집']] },
    abo: { label: '🅰 ABO식 혈액형', subs: [['draw', '🧩 구조'], ['mix', '💧 혈청 섞기']] },
    test: { label: '🧪 혈액형 검사 (모의)', subs: null },
    use: { label: '💉 수혈과 추론', subs: [['trans', '💉 수혈 시험'], ['case', '🕵️ 사건 추론']] },
  };
  /* 항원 모양: ▲ 응집원 A · ● 응집원 B · ■ Rh 응집원(D) */
  const KN = { tri: '삼각(▲)', ci: '원(●)', sq: '사각(■)' };
  const BT = { A: { ag: ['tri'], ab: ['ci'] }, B: { ag: ['ci'], ab: ['tri'] }, AB: { ag: ['tri', 'ci'], ab: [] }, O: { ag: [], ab: ['tri', 'ci'] } };
  const BTS = ['A', 'B', 'AB', 'O'];
  const SERUM = [{ k: 'tri', name: '항A 혈청', sub: '응집소 α', tint: '#93c5fd' }, { k: 'ci', name: '항B 혈청', sub: '응집소 β', tint: '#fcd34d' }, { k: 'sq', name: '항Rh 혈청', sub: '항D', tint: '#d1d5db' }];
  const SAMPLES = [
    { id: 1, abo: 'A', rh: true }, { id: 2, abo: 'B', rh: false }, { id: 3, abo: 'AB', rh: true }, { id: 4, abo: 'O', rh: false }, { id: 5, abo: 'O', rh: true },
  ];
  const CIRC = ['①', '②', '③', '④', '⑤'];
  const antigensOf = (s) => BT[s.abo].ag.concat(s.rh ? ['sq'] : []);
  const aggl = (ags, serumKind) => ags.indexOf(serumKind) >= 0;
  const rhTxt = (rh) => (rh ? 'Rh⁺' : 'Rh⁻');

  /* ---------- 현미경 확대 상자: 적혈구가 흩어지거나 항체로 이어 붙어요 ---------- */
  const HEX = (() => { const a = [[0, 0]]; for (let k = 0; k < 6; k++) a.push([Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]); return a; })();
  class Inset {
    constructor() { this.agg = false; this.pos = HEX.map((h) => ({ x: h[0] * 0.78, y: h[1] * 0.78 })); this.ph = HEX.map((_, i) => i * 1.7); this.link = 0; }
    update(dt) {
      HEX.forEach((h, i) => {
        const f = this.agg ? 0.47 : 0.78, tx = h[0] * f + (this.agg ? 0 : Math.sin(clock * 0.8 + this.ph[i]) * 0.035), ty = h[1] * f + (this.agg ? 0 : Math.cos(clock * 0.7 + this.ph[i]) * 0.035);
        this.pos[i].x = SciSim.approach(this.pos[i].x, tx, dt, RM ? 99 : 3); this.pos[i].y = SciSim.approach(this.pos[i].y, ty, dt, RM ? 99 : 3);
      });
      this.link = SciSim.approach(this.link, this.agg ? 1 : 0, dt, RM ? 99 : 2.2);
    }
    /* ags: 세포 표면의 항원 모양들, serumK: 혈청 항체 모양 (응집이면 이어 붙임) */
    draw(cx, cy, R, ags, serumK, bg) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
      const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R); g.addColorStop(0, bg || '#fff8f0'); g.addColorStop(1, '#f1e1d4'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const rc = R * 0.2;
      // 항체로 이어 붙인 모습 (응집)
      if (this.link > 0.02) {
        const pairs = []; for (let k = 1; k <= 6; k++) { pairs.push([0, k]); pairs.push([k, k % 6 + 1]); }
        pairs.forEach((p, qi) => { const a = this.pos[p[0]], b = this.pos[p[1]], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d; if (d > 0.62) return; ctx.save(); ctx.globalAlpha = this.link; bridge(cx + a.x * R + ux * rc, cy + a.y * R + uy * rc, cx + b.x * R - ux * rc, cy + b.y * R - uy * rc, serumK, R * 0.1, qi % 2 ? 1 : -1); ctx.restore(); });
      }
      this.pos.forEach((p, i) => {
        const x = cx + p.x * R, y = cy + p.y * R;
        drawRBC(x, y, rc, i * 0.7 + clock * 0.05);
        ags.forEach((k, j) => { for (let q = 0; q < 3; q++) { const a = (j * 3 + q) * (TAU / (ags.length * 3)) + i; drawAg(k, x + Math.cos(a) * rc * 1.02, y + Math.sin(a) * rc * 1.02, Math.max(2.6, rc * 0.2), a + Math.PI / 2); } });
      });
      ctx.restore();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    }
  }
  /* 두 세포 사이를 이어 붙이는 항체 (Y자): 팔 끝 두 곳이 각각 세포의 항원에 붙어요 */
  function bridge(x1, y1, x2, y2, kind, s, side) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d * side, ny = dx / d * side;
    const jx = mx + nx * s * 0.55, jy = my + ny * s * 0.55;
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = Math.max(2, s * 0.32); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(jx, jy); ctx.lineTo(x2, y2); ctx.moveTo(jx, jy); ctx.lineTo(jx + nx * s * 0.75, jy + ny * s * 0.75); ctx.stroke();
    ctx.restore();
    drawAg(kind, x1, y1, Math.max(2.4, s * 0.34), 0, { alpha: 0.9 }); drawAg(kind, x2, y2, Math.max(2.4, s * 0.34), 0, { alpha: 0.9 });
  }

  /* ================= ① 항원-항체 짝짓기 ================= */
  const AL = PHONE
    ? { px: [88, 240, 392], py: 128, pr: 44, ay: 190, as: 13, hx: [100, 240, 380], hy: 452, sz: 28 }
    : { px: [170, 400, 630], py: 178, pr: 62, ay: 246, as: 16, hx: [170, 400, 630], hy: 492, sz: 36 };
  const PCOL = { tri: '#fdba74', ci: '#93c5fd', sq: '#6ee7b7' };
  function makeMatch() {
    const antOrder = ['ci', 'sq', 'tri'], abOrder = ['tri', 'ci', 'sq'];
    S.AM = {
      ants: antOrder.map((k, i) => ({ k, x: AL.px[i], y: AL.ay, bound: null })),
      abs: abOrder.map((k, i) => ({ k, x: AL.hx[i], y: AL.hy, bound: null, lift: 0, shake: 0, hx: AL.hx[i], hy: AL.hy })),
      drag: null, msg: '', msgT: 0, wrong: 0, right: 0, near: null,
    };
  }
  const openA = 0.62;
  const boundPose = (ant) => ({ x: ant.x + Math.sin(openA) * AL.sz, y: ant.y + 0.9 * AL.sz + Math.cos(openA) * AL.sz });
  function matchDown(p) {
    const A = S.AM;
    for (let i = A.abs.length - 1; i >= 0; i--) {
      const b = A.abs[i]; if (b.bound) continue;
      if (Math.hypot(p.x - b.x, p.y - (b.y - AL.sz * 0.9)) < AL.sz * 1.1) { SciSim.tween(b, { x: b.x, y: b.y }, { duration: 0.0001 }); A.drag = { b, dx: b.x - p.x, dy: b.y - p.y }; Sound.tick(); return true; }
    }
    return false;
  }
  function matchMove(p) { const A = S.AM, d = A.drag; if (!d) return; d.b.x = clamp(p.x + d.dx, 20, VW - 20); d.b.y = clamp(p.y + d.dy, AL.sz * 1.8, VH - 8); let n = null, bd = 1e9; A.ants.forEach((a) => { if (a.bound) return; const dd = Math.hypot(p.x - a.x, p.y - a.y); if (dd < bd) { bd = dd; n = a; } }); A.near = bd < AL.sz * 2.2 ? n : null; }
  function matchUp(p) {
    const A = S.AM, d = A.drag; if (!d) return; A.drag = null; A.near = null; const b = d.b;
    let best = null, bd = 1e9; A.ants.forEach((a) => { if (a.bound) return; const dd = Math.hypot(p.x - a.x, p.y - a.y); if (dd < bd) { bd = dd; best = a; } });
    if (best && bd < AL.sz * 2.2) {
      if (best.k === b.k) {
        const pose = boundPose(best); best.bound = b; b.bound = best; A.right++; Sound.success();
        SciSim.tween(b, { x: pose.x, y: pose.y }, { duration: 0.4, ease: 'outBack' });
        parts.burst(best.x, best.y, { count: 14, speed: 120, size: 3.2, colors: [AGCOL[best.k], '#fff', '#fde047'], gravity: 0 });
        A.msg = KN[b.k] + ' 항체의 홈이 ' + KN[best.k] + ' 항원과 꼭 맞아서 결합했어요!'; A.msgT = 4; rlast = ''; syncControls();
      } else {
        A.wrong++; b.shake = 1; Sound.fail(); rlast = '';
        A.msg = KN[b.k] + ' 항체는 ' + KN[best.k] + ' 항원과 모양이 달라서 결합하지 못해요 (특이성)'; A.msgT = 4.5;
        SciSim.tween(b, { x: b.hx, y: b.hy }, { duration: 0.45, ease: 'outBack' }); syncControls();
      }
    } else SciSim.tween(b, { x: b.hx, y: b.hy }, { duration: 0.4, ease: 'outBack' });
  }
  function stepMatch(dt) { const A = S.AM; A.msgT = Math.max(0, A.msgT - dt); A.abs.forEach((b) => { b.lift = SciSim.approach(b.lift, A.drag && A.drag.b === b ? 1 : 0, dt, 14); b.shake = Math.max(0, b.shake - dt * 3); }); }
  function drawMatch(dt) {
    bgFill('#eef6f2', '#e1ede6');
    const A = S.AM;
    TF(VW / 2, PHONE ? 28 : 34, '항체(Y)를 끌어서 항원에 붙여 보세요', VW - 24, PHONE ? 15 : 18, 12, '#26324a', 'center', 900);
    A.ants.forEach((a, i) => {
      const bx = a.x, by = AL.py;
      D.shadow(() => { ctx.fillStyle = PCOL[a.k]; ctx.beginPath(); ctx.arc(bx, by, AL.pr, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = C.shade(PCOL[a.k], -0.4); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, AL.pr, 0, TAU); ctx.stroke();
      T(bx, by + 5, '병원체 ' + '가나다'[i], PHONE ? 13 : 15, '#26324a', 'center', 800);
      // 항원이 달린 줄기
      ctx.strokeStyle = C.shade(PCOL[a.k], -0.4); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by + AL.pr); ctx.lineTo(bx, a.y - AL.as); ctx.stroke();
      if (A.near === a) D.ring(a.x, a.y, AL.as + 12, clock, { color: '#f59e0b' });
      drawAg(a.k, a.x, a.y, AL.as, 0);
      if (a.bound) D.glow(a.x, a.y, AL.as * 2.4, '#22c55e', 0.4);
    });
    A.abs.forEach((b) => { if (A.drag && A.drag.b === b) return; drawAbItem(b); });
    if (A.drag) drawAbItem(A.drag.b);
    // 이름표
    A.abs.forEach((b) => { if (!b.bound) T(b.hx, b.hy + 22, KN[b.k].replace(/\(.*\)/, '') + ' 항체', PHONE ? 12.5 : 14, '#26324a', 'center', 800); });
    if (A.msgT > 0) { const w = VW - 40; D.roundRect(20, PHONE ? 520 : 100 + 0, w, 1, 1); }
    if (A.msg) { const ok = A.msg.indexOf('꼭 맞아서') >= 0; D.label(VW / 2, PHONE ? 566 : 538, A.msg, { bg: ok ? '#15803d' : '#b91c1c', size: PHONE ? 12 : 14, pad: 12 }); }
    else T(VW / 2, PHONE ? 566 : 538, '항체 결합 부위(홈)의 모양이 항원과 같아야 결합해요', PHONE ? 12.5 : 14, '#6b7280', 'center', 800);
  }
  function drawAbItem(b) {
    const sz = AL.sz * (1 + b.lift * 0.08), sh = b.shake > 0 && !RM ? Math.sin(clock * 60) * 4 * b.shake : 0;
    ctx.save();
    D.shadow(() => { drawAb(b.x + sh, b.y, sz, 0, b.k, { open: openA, col: '#334155' }); }, { blur: 4 + b.lift * 10, y: 2 + b.lift * 5, color: 'rgba(20,40,80,.28)' });
    ctx.restore();
  }

  /* ================= ① 항체로 응집 만들기 (A형 적혈구 모형) ================= */
  const CHL = PHONE ? { x: 8, y: 8, w: 464, h: 428, r: 17 } : { x: 16, y: 14, w: 768, h: 384, r: 22 };
  function makeClump() {
    const C0 = CHL, rg = mulberry(55), cells = [];
    for (let i = 0; i < 9; i++) {
      let x, y, ok = false;
      for (let t = 0; t < 60 && !ok; t++) { x = C0.x + C0.r * 2 + rg() * (C0.w - C0.r * 4); y = C0.y + 40 + C0.r + rg() * (C0.h - 60 - C0.r * 2); ok = cells.every((c) => Math.hypot(c.x - x, c.y - y) > C0.r * 2.8); }
      cells.push({ x, y, vx: rnd(-14, 14), vy: rnd(-14, 14), rot: rg() * TAU, deg: 0 });
    }
    S.CL = { cells, links: [], free: [], sel: 'tri', wrongTried: false, matchAdded: 0, maxClump: 1, flash: 0 };
  }
  function clumpAdd() {
    const K = S.CL, C0 = CHL;
    for (let n = 0; n < 6; n++) {
      const kind = K.sel, delay = n * 0.18;
      if (kind !== 'tri') { // 맞지 않는 항체: 돌아다닐 뿐 결합하지 못해요
        K.free.push({ k: kind, x: C0.x + 30 + Math.random() * 60, y: C0.y + 50 + Math.random() * 40, vx: rnd(30, 60), vy: rnd(10, 40), t: -delay, rot: Math.random() * TAU });
        K.wrongTried = true; continue;
      }
      // 이어 붙일 두 세포 고르기: 이미 덩어리가 있으면 그 덩어리를 키워요
      const comp = clumpComps(), inComp = (i) => comp.size[comp.id[i]] > 1;
      let best = null, bd = 1e9;
      for (let i = 0; i < K.cells.length; i++) for (let j = i + 1; j < K.cells.length; j++) {
        if (K.cells[i].deg >= 3 || K.cells[j].deg >= 3) continue; if (K.links.some((l) => (l.a === i && l.b === j) || (l.a === j && l.b === i))) continue;
        if (comp.id[i] === comp.id[j] && comp.size[comp.id[i]] > 1 && Math.random() < 0.7) continue;
        const d = Math.hypot(K.cells[i].x - K.cells[j].x, K.cells[i].y - K.cells[j].y) - ((inComp(i) || inComp(j)) ? 60 : 0);
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) { K.cells[best[0]].deg++; K.cells[best[1]].deg++; K.links.push({ a: best[0], b: best[1], t: -delay, on: false, x0: C0.x + 20, y0: C0.y + 30 }); K.matchAdded++; }
    }
    Sound.click(); rlast = ''; syncControls();
  }
  function clumpComps() {
    const K = S.CL, n = K.cells.length, id = [...Array(n).keys()];
    const find = (x) => (id[x] === x ? x : (id[x] = find(id[x])));
    K.links.forEach((l) => { if (l.on) id[find(l.a)] = find(l.b); });
    const root = id.map((_, i) => find(i)), size = {};
    root.forEach((r) => { size[r] = (size[r] || 0) + 1; });
    return { id: root, size };
  }
  function stepClump(dt) {
    const K = S.CL, C0 = CHL, r = C0.r, rest = r * 2 + (PHONE ? 26 : 32);
    K.flash = Math.max(0, K.flash - dt);
    K.links.forEach((l) => { l.t += dt; if (!l.on && l.t >= 1.0) { l.on = true; if (!RM) { const a = K.cells[l.a], b = K.cells[l.b]; parts.burst((a.x + b.x) / 2, (a.y + b.y) / 2, { count: 5, speed: 50, size: 2.2, colors: ['#fde047', '#fff'], gravity: 0 }); } } });
    K.cells.forEach((c) => {
      c.vx += rnd(-1, 1) * 40 * dt * (c.deg ? 0.4 : 1); c.vy += rnd(-1, 1) * 40 * dt * (c.deg ? 0.4 : 1);
    });
    K.links.forEach((l) => { if (!l.on) return; const a = K.cells[l.a], b = K.cells[l.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - rest) * 9 * dt; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; });
    for (let i = 0; i < K.cells.length; i++) for (let j = i + 1; j < K.cells.length; j++) {
      const a = K.cells[i], b = K.cells[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, mind = r * 2 + 2;
      if (d < mind) { const f = (mind - d) * 0.5; a.x -= dx / d * f; a.y -= dy / d * f; b.x += dx / d * f; b.y += dy / d * f; }
    }
    K.cells.forEach((c) => {
      const mv = c.deg ? 110 : 40; c.vx = clamp(c.vx, -mv, mv); c.vy = clamp(c.vy, -mv, mv);
      c.vx *= Math.exp(-(c.deg ? 2.2 : 0.8) * dt); c.vy *= Math.exp(-(c.deg ? 2.2 : 0.8) * dt);
      c.x += c.vx * dt; c.y += c.vy * dt; c.rot += dt * 0.2;
      const x0 = C0.x + r + 4, x1 = C0.x + C0.w - r - 4, y0 = C0.y + 36 + r, y1 = C0.y + C0.h - r - 4;
      if (c.x < x0 || c.x > x1) { c.vx *= -1; c.x = clamp(c.x, x0, x1); } if (c.y < y0 || c.y > y1) { c.vy *= -1; c.y = clamp(c.y, y0, y1); }
    });
    K.free.forEach((f) => {
      f.t += dt; if (f.t < 0) return; f.vx += rnd(-1, 1) * 60 * dt; f.vy += rnd(-1, 1) * 60 * dt; f.vx = clamp(f.vx, -50, 50); f.vy = clamp(f.vy, -50, 50);
      f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt;
      const x0 = C0.x + 10, x1 = C0.x + C0.w - 10, y0 = C0.y + 40, y1 = C0.y + C0.h - 10;
      if (f.x < x0 || f.x > x1) { f.vx *= -1; f.x = clamp(f.x, x0, x1); } if (f.y < y0 || f.y > y1) { f.vy *= -1; f.y = clamp(f.y, y0, y1); }
      K.cells.forEach((c) => { const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy); if (d < r + 12) { f.x = c.x + dx / (d || 1) * (r + 13); f.y = c.y + dy / (d || 1) * (r + 13); f.vx = dx / (d || 1) * 40; f.vy = dy / (d || 1) * 40; f.hit = 0.6; } });
      f.hit = Math.max(0, (f.hit || 0) - dt);
    });
    const comp = clumpComps(); let m = 1; Object.keys(comp.size).forEach((k) => { m = Math.max(m, comp.size[k]); });
    if (m !== K.maxClump) { K.maxClump = m; rlast = ''; syncControls(); }
  }
  function drawClump(dt) {
    bgFill('#f7ecec', '#efe0e0');
    const K = S.CL, C0 = CHL, r = C0.r;
    panel(C0.x, C0.y, C0.w, C0.h, 16);
    ctx.save(); D.roundRect(C0.x, C0.y, C0.w, C0.h, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, C0.y, 0, C0.y + C0.h); g.addColorStop(0, '#fff4f1'); g.addColorStop(1, '#ffe6e1'); ctx.fillStyle = g; ctx.fillRect(C0.x, C0.y, C0.w, C0.h);
    // 덩어리 표시
    const comp = clumpComps();
    Object.keys(comp.size).forEach((rt) => {
      if (comp.size[rt] < 3) return; const mem = K.cells.filter((c, i) => comp.id[i] === +rt); let sx = 0, sy = 0; mem.forEach((c) => { sx += c.x; sy += c.y; }); sx /= mem.length; sy /= mem.length;
      let rad = 0; mem.forEach((c) => { rad = Math.max(rad, Math.hypot(c.x - sx, c.y - sy) + r + 10); });
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, TAU); ctx.stroke(); ctx.restore();
      D.label(sx, sy - rad - 12, '응집 덩어리 ' + comp.size[rt] + '개', { bg: '#be123c', size: PHONE ? 12 : 13, pad: 7 });
    });
    // 항체 다리
    K.links.forEach((l) => {
      const a = K.cells[l.a], b = K.cells[l.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      if (l.t < 0) return;
      if (!l.on) { const f = smooth(l.t / 1.0), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, x = lerp(l.x0, mx, f), y = lerp(l.y0, my, f); drawAb(x, y + 10, 9, f * 6, 'tri', { col: '#334155' }); }
      else bridge(a.x + ux * r, a.y + uy * r, b.x - ux * r, b.y - uy * r, 'tri', PHONE ? 11 : 15, l.a % 2 ? 1 : -1);
    });
    K.cells.forEach((c, i) => {
      drawRBC(c.x, c.y, r, c.rot);
      for (let q = 0; q < 4; q++) { const a = c.rot * 0.0 + q * (TAU / 4) + i * 0.9; drawAg('tri', c.x + Math.cos(a) * r * 1.03, c.y + Math.sin(a) * r * 1.03, r * 0.2, a + Math.PI / 2); }
    });
    K.free.forEach((f) => { if (f.t < 0) return; drawAb(f.x, f.y + 8, 9, f.rot, f.k, { col: '#334155' }); if (f.hit > 0) T(f.x, f.y - 16, '✕', 13, '#dc2626', 'center', 900); });
    ctx.restore();
    T(C0.x + 14, C0.y + 24, 'A형 적혈구가 들어 있는 모의 혈액 (표면에 ▲ 응집원 A)', PHONE ? 12.5 : 15, '#7f1d1d', 'left', 900);
    // 아래 설명
    if (!PHONE) {
      const Bp = { x: 16, y: 406, w: 768, h: 140 }; panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
      const lines = ['항체(Y)는 결합 부위가 <b>두 곳</b>이에요. 모양이 맞는 항원에만 붙어요.', '▲ 항체는 ▲ 항원이 있는 적혈구의 표면에 붙어서, 서로 다른 적혈구를 <b>이어 붙여</b> 덩어리를 만들어요 (응집).', '맞지 않는 모양의 항체(●, ■)는 적혈구에 결합하지 못하고 튕겨 나가요 → 응집이 일어나지 않아요.'];
      let yy = Bp.y + 28; lines.forEach((l) => { yy += textBlock(Bp.x + 16, yy, Bp.w - 32, l.replace(/<\/?b>/g, ''), 14.5, '#374151', 21, 700) + 6; });
    } else {
      const Bp = { x: 8, y: 444, w: 464, h: 188 }; panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
      const lines = ['항체(Y)는 결합 부위가 두 곳이에요. 모양이 맞는 항원에만 붙어요.', '▲ 항체는 ▲ 항원이 있는 적혈구들을 이어 붙여 덩어리를 만들어요 (응집).', '맞지 않는 모양의 항체(●, ■)는 결합하지 못하고 튕겨 나가요.'];
      let yy = Bp.y + 28; lines.forEach((l) => { yy += textBlock(Bp.x + 14, yy, Bp.w - 28, l, 13.5, '#374151', 19, 700) + 8; });
    }
  }

  /* ================= 용기 속 혈액 (슬라이드 칸) ================= */
  const GRAN = (() => { const rg = mulberry(7), o = []; for (let i = 0; i < 46; i++) { const a = rg() * TAU, d = Math.sqrt(rg()) * 0.7; o.push({ a, d, r: 0.045 + rg() * 0.05, ph: rg() * TAU }); } return o; })();
  /* st: {phase:'serum'|'drop'|'swirl'|'result', t, agg} */
  function drawWell(cx, cy, R, tint, st) {
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }, { blur: 5, y: 2, color: 'rgba(30,50,90,.18)' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, TAU); ctx.clip();
    const ph = st.phase, t = st.t;
    // 혈청 방울
    const sd = ph === 'serum' ? R * 0.42 : R * 0.42 * (1 - smooth(t / 0.9) * 0.2);
    if (ph === 'serum' || (ph === 'drop' && t < 0.9)) { ctx.fillStyle = C.rgba(tint, 0.85); ctx.beginPath(); ctx.arc(cx, cy, sd, 0, TAU); ctx.fill(); ctx.strokeStyle = C.shade(tint, -0.25); ctx.lineWidth = 1.6; ctx.stroke(); }
    if (ph !== 'serum') {
      const grow = ph === 'drop' ? smooth((t - 0.5) / 0.7) : 1;
      const rr = R * (0.45 + 0.4 * grow);
      const agg = st.agg && ph === 'result';
      const base = agg ? '#f5c8c3' : C.mix(tint, '#c8232c', 0.82);
      const g = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.1, cx, cy, rr); g.addColorStop(0, agg ? '#fde6e2' : C.shade(base, 0.25)); g.addColorStop(1, base);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
      if (ph === 'swirl') { ctx.strokeStyle = 'rgba(120,10,20,.4)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx, cy, rr * (0.3 + 0.22 * k), clock * 6 + k * 2, clock * 6 + k * 2 + 2.2); ctx.stroke(); } }
      if (agg) {
        const f = smooth(t / 0.9);
        GRAN.forEach((q) => { const x = cx + Math.cos(q.a + clock * 0.2 * (1 - f)) * q.d * rr * (1 - 0.1 * f), y = cy + Math.sin(q.a + clock * 0.2 * (1 - f)) * q.d * rr; ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.arc(x, y, rr * q.r * (0.6 + 0.6 * f), 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x - 1, y - 1, rr * q.r * 0.3, 0, TAU); ctx.fill(); });
      }
    }
    if (ph === 'drop' && t < 0.7) { const y = lerp(cy - R * 2.2, cy, smooth(t / 0.7)); ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(cx, y - R * 0.18); ctx.quadraticCurveTo(cx + R * 0.14, y + R * 0.06, cx, y + R * 0.14); ctx.quadraticCurveTo(cx - R * 0.14, y + R * 0.06, cx, y - R * 0.18); ctx.fill(); }
    ctx.restore();
  }

  /* ================= ② ABO식 혈액형 구조 완성 ================= */
  const DL = PHONE
    ? { card: (i) => ({ x: 8 + (i % 2) * 238, y: 8 + Math.floor(i / 2) * 266, w: 226, h: 258 }), rr: 38, rcy: 96, ys: 20, yy: 218, leg: { x: 8, y: 546, w: 464, h: 86 } }
    : { card: (i) => ({ x: 16 + i * 194, y: 14, w: 186, h: 330 }), rr: 48, rcy: 128, ys: 22, yy: 270, leg: { x: 16, y: 352, w: 768, h: 194 } };
  const BTSUB = { A: '응집원 A를 가져요', B: '응집원 B를 가져요', AB: '응집원 A와 B를 모두 가져요', O: '응집원이 없어요' };
  function makeDraw() { S.AD = { A: [0, 0, 0, 0], B: [0, 0, 0, 0], AB: [0, 0, 0, 0], O: [0, 0, 0, 0], bad: {}, shk: 0, ok: false }; }
  const slotPos = (i, k) => { // k: 0 ▲ 1 ● (세포 표면) 2 α 3 β (혈장)
    const c = DL.card(i), cx = c.x + c.w / 2;
    if (k < 2) { const a = k === 0 ? -2.2 : -0.94; return { x: cx + Math.cos(a) * (DL.rr + 1), y: c.y + DL.rcy + Math.sin(a) * (DL.rr + 1), r: PHONE ? 17 : 20 }; }
    return { x: cx + (k === 2 ? -1 : 1) * (PHONE ? 46 : 42), y: c.y + DL.yy, r: PHONE ? 26 : 28 };
  };
  const adCorrect = (t) => [BT[t].ag.indexOf('tri') >= 0, BT[t].ag.indexOf('ci') >= 0, BT[t].ab.indexOf('tri') >= 0, BT[t].ab.indexOf('ci') >= 0].map((b) => (b ? 1 : 0));
  function drawDraw(dt) {
    bgFill('#f4eef0', '#eadfe3');
    const AD = S.AD;
    BTS.forEach((t, i) => {
      const c = DL.card(i), cx = c.x + c.w / 2, cy = c.y + DL.rcy;
      panel(c.x, c.y, c.w, c.h, 16);
      const wrong = AD.bad[t];
      if (wrong) { D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.stroke(); }
      T(cx, c.y + 28, t + '형', 19, '#7f1d1d', 'center', 900);
      TF(cx, c.y + 48, BTSUB[t], c.w - 14, 12.5, 10, '#6b7280', 'center', 700);
      // 적혈구
      D.sphere(cx, cy, 0.01, '#fff', { gloss: false });
      drawRBC(cx, cy, DL.rr, 0);
      T(cx, cy + 5, '적혈구', PHONE ? 12 : 13, 'rgba(255,255,255,.95)', 'center', 800);
      // 혈장
      const py = c.y + DL.yy - (PHONE ? 38 : 44), ph = PHONE ? 78 : 92;
      D.roundRect(c.x + 10, py, c.w - 20, ph, 12); ctx.fillStyle = '#fff1bd'; ctx.fill(); ctx.strokeStyle = '#e8c55a'; ctx.lineWidth = 1.5; ctx.stroke();
      T(c.x + 18, py + 15, '혈장', 12, '#92400e', 'left', 800);
      for (let k = 0; k < 4; k++) {
        const sp = slotPos(i, k), on = AD[t][k];
        if (k < 2) {
          const kind = k === 0 ? 'tri' : 'ci';
          if (on) { drawAg(kind, sp.x, sp.y, sp.r * 0.72, 0, { text: k === 0 ? 'A' : 'B' }); }
          else { ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * 0.86, 0, TAU); ctx.stroke(); ctx.restore(); ctx.save(); ctx.globalAlpha = 0.5; drawAg(kind, sp.x, sp.y, sp.r * 0.5, 0, { col: '#fff' }); ctx.restore(); }
        } else {
          const kind = k === 2 ? 'tri' : 'ci', sz = PHONE ? 15 : 17;
          if (on) { drawAb(sp.x, sp.y + sz * 1.0, sz, 0, kind, { col: '#334155' }); }
          else { ctx.save(); ctx.globalAlpha = 0.28; drawAb(sp.x, sp.y + sz * 1.0, sz, 0, kind, { col: '#64748b' }); ctx.restore(); ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#d19b2a'; ctx.lineWidth = 1.6; D.roundRect(sp.x - sp.r * 0.8, sp.y - sp.r * 0.7, sp.r * 1.6, sp.r * 1.8, 8); ctx.stroke(); ctx.restore(); }
          T(sp.x, sp.y + sz * 1.0 + 18, k === 2 ? 'α (항A)' : 'β (항B)', PHONE ? 11.5 : 12.5, '#78350f', 'center', 800);
        }
      }
    });
    const Lg = DL.leg; panel(Lg.x, Lg.y, Lg.w, Lg.h, 14);
    if (!PHONE) {
      T(Lg.x + 16, Lg.y + 28, '그림 읽는 방법', 15.5, '#26324a', 'left', 900);
      drawAg('tri', Lg.x + 30, Lg.y + 62, 11, 0, { text: 'A' }); T(Lg.x + 52, Lg.y + 67, '응집원 A (적혈구 표면의 항원)', 14, '#374151', 'left', 800);
      drawAg('ci', Lg.x + 30, Lg.y + 94, 11, 0, { text: 'B' }); T(Lg.x + 52, Lg.y + 99, '응집원 B', 14, '#374151', 'left', 800);
      drawAb(Lg.x + 400, Lg.y + 76, 14, 0, 'tri', { col: '#334155' }); T(Lg.x + 424, Lg.y + 67, '응집소 α(항A): 응집원 A와 결합', 14, '#374151', 'left', 800);
      drawAb(Lg.x + 400, Lg.y + 108, 14, 0, 'ci', { col: '#334155' }); T(Lg.x + 424, Lg.y + 99, '응집소 β(항B): 응집원 B와 결합', 14, '#374151', 'left', 800);
      textBlock(Lg.x + 16, Lg.y + 138, Lg.w - 32, '규칙: 자기 적혈구의 응집원과 결합하는 응집소는 혈장에 없어요. 그렇지 않으면 자기 적혈구끼리 응집해 버리기 때문이에요.', 14, '#92400e', 20, 800);
    } else {
      textBlock(Lg.x + 12, Lg.y + 22, Lg.w - 24, '▲A·●B: 적혈구 표면의 응집원 / α(▲ 홈)·β(● 홈): 혈장 속 응집소. 규칙: 자기 응집원과 결합하는 응집소는 혈장에 없어요.', 13, '#92400e', 18, 800);
    }
  }
  function drawDown(p) {
    const AD = S.AD;
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
      const sp = slotPos(i, k), dx = p.x - sp.x, dy = p.y - (k < 2 ? sp.y : sp.y + 12);
      if (Math.hypot(dx, dy) < sp.r + 8) { AD[BTS[i]][k] = AD[BTS[i]][k] ? 0 : 1; AD.bad[BTS[i]] = false; AD.ok = false; Sound.click(); rlast = ''; return false; }
    }
    return false;
  }

  /* ================= ② 항A · 항B 혈청 섞기 ================= */
  const XL = PHONE
    ? { sl: { x: 8, y: 8, w: 464, h: 262 }, wx: [124, 348], wy: 92, wr: 44, ix: [124, 348], iy: 204, ir: 34, tab: { x: 8, y: 278, w: 464 }, note: { x: 8, y: 506, w: 464, h: 126 } }
    : { sl: { x: 16, y: 14, w: 500, h: 322 }, wx: [150, 382], wy: 128, wr: 60, ix: [150, 382], iy: 262, ir: 44, tab: { x: 16, y: 346, w: 768 }, info: { x: 524, y: 14, w: 260, h: 322 } };
  function makeMix() {
    S.MX = { sel: 'A', runT: -1, tested: { A: false, B: false, AB: false, O: false }, insL: new Inset(), insR: new Inset() };
    S.MX.table = new CellTable({
      x: XL.tab.x, y: XL.tab.y, w: XL.tab.w, labW: PHONE ? 120 : 200, headH: 36, rowH: PHONE ? 40 : 40,
      cols: [{ label: '항A 혈청 (α)', opts: ['응집', '응집 안 함'] }, { label: '항B 혈청 (β)', opts: ['응집', '응집 안 함'] }],
      rows: BTS.map((t) => t + '형'), ans: BTS.map((t) => [aggl(BT[t].ag, 'tri') ? 0 : 1, aggl(BT[t].ag, 'ci') ? 0 : 1]),
      locked: (r) => !S.MX.tested[BTS[r]], onLocked() { showHint('먼저 그 혈액형 모의 혈액을 섞어서 확인해요', 2200); }, onChange() { rlast = ''; },
    });
  }
  function mixSelect(t) { const M = S.MX; M.sel = t; M.runT = -1; M.insL.agg = false; M.insR.agg = false; rlast = ''; }
  function mixRun() { const M = S.MX; if (M.runT >= 0 && M.runT < 3.2) return; M.runT = 0; M.insL.agg = false; M.insR.agg = false; Sound.click(); rlast = ''; syncControls(); }
  function stepMix(dt) {
    const M = S.MX; if (M.runT >= 0 && M.runT < 3.6) { const was = M.runT; M.runT += dt; if (was < 2.2 && M.runT >= 2.2) { M.insL.agg = aggl(BT[M.sel].ag, 'tri'); M.insR.agg = aggl(BT[M.sel].ag, 'ci'); } if (was < 2.6 && M.runT >= 2.6) { M.tested[M.sel] = true; Sound.success(); rlast = ''; syncControls(); } if (was < 3.2 && M.runT >= 3.2) syncControls(); }
    M.insL.update(dt); M.insR.update(dt); M.table.update(dt);
  }
  const mixSt = (M) => (M.runT < 0 ? { phase: 'serum', t: 0 } : M.runT < 0.9 ? { phase: 'drop', t: M.runT } : M.runT < 2.2 ? { phase: 'swirl', t: M.runT - 0.9 } : { phase: 'result', t: M.runT - 2.2 });
  function drawMix(dt) {
    bgFill('#f4eef0', '#eadfe3');
    const M = S.MX, sl = XL.sl, ags = BT[M.sel].ag, st = mixSt(M);
    panel(sl.x, sl.y, sl.w, sl.h, 16);
    T(sl.x + 14, sl.y + 24, '모의 슬라이드 (교육용)', PHONE ? 13 : 15, '#26324a', 'left', 900);
    D.roundRect(sl.x + 14, sl.y + 40, sl.w - 28, PHONE ? 106 : 178, 14); ctx.fillStyle = 'rgba(203,225,240,.45)'; ctx.fill(); ctx.strokeStyle = '#a9c1d6'; ctx.lineWidth = 2; ctx.stroke();
    [0, 1].forEach((w) => {
      const sv = SERUM[w], wx = XL.wx[w], wy = XL.wy;
      TF(wx, wy - XL.wr - 10, sv.name + ' (' + sv.sub + ')', 190, PHONE ? 12.5 : 14, 10.5, '#26324a', 'center', 800);
      drawWell(wx, wy, XL.wr, sv.tint, Object.assign({ agg: w === 0 ? M.insL.agg : M.insR.agg }, st));
      (w === 0 ? M.insL : M.insR).draw(XL.ix[w], XL.iy, XL.ir, ags, sv.k);
      T(XL.ix[w], XL.iy + XL.ir + 16, '현미경 확대 (적혈구 ' + (st.phase === 'result' ? ((w === 0 ? M.insL.agg : M.insR.agg) ? '이어 붙음' : '흩어져 있음') : '') + ')', PHONE ? 11 : 12, '#4b5563', 'center', 700);
    });
    if (M.runT < 0) T(sl.x + sl.w / 2, sl.y + sl.h - 6, '▶ 혈청 섞기를 눌러요', 12.5, '#7c2d12', 'center', 800);
    // 선택한 모의 혈액 설명
    if (!PHONE) {
      const I = XL.info; panel(I.x, I.y, I.w, I.h, 16);
      T(I.x + I.w / 2, I.y + 28, M.sel + '형 모의 혈액', 17, '#7f1d1d', 'center', 900);
      const cx = I.x + I.w / 2, cy = I.y + 110;
      drawRBC(cx, cy, 46, 0);
      ags.forEach((k, j) => { for (let q = 0; q < 3; q++) { const a = (j * 3 + q) * (TAU / (ags.length * 3)) - 1.2; drawAg(k, cx + Math.cos(a) * 47, cy + Math.sin(a) * 47, 8, a + Math.PI / 2); } });
      T(cx, cy + 6, '적혈구', 12.5, 'rgba(255,255,255,.95)', 'center', 800);
      T(I.x + 14, I.y + 190, '응집원: ' + (ags.length ? ags.map((k) => (k === 'tri' ? 'A' : 'B')).join('·') : '없음'), 14, '#374151', 'left', 800);
      T(I.x + 14, I.y + 214, '응집소: ' + (BT[M.sel].ab.length ? BT[M.sel].ab.map((k) => (k === 'tri' ? 'α' : 'β')).join('·') : '없음'), 14, '#374151', 'left', 800);
      textBlock(I.x + 14, I.y + 244, I.w - 28, '항A 혈청 속 응집소 α는 응집원 A와, 항B 혈청 속 β는 응집원 B와 결합해요.', 13, '#6b7280', 18, 700);
    }
    M.table.draw();
    if (PHONE) { const N = XL.note; panel(N.x, N.y, N.w, N.h, 14); textBlock(N.x + 12, N.y + 24, N.w - 24, '항A 혈청의 α는 응집원 A와, 항B 혈청의 β는 응집원 B와 결합해 적혈구를 응집시켜요. 섞어 본 혈액형만 표를 채울 수 있어요.', 13.5, '#374151', 19, 700); }
  }

  /* ================= ③ 혈액형 검사 (모의 키트) ================= */
  const TL = PHONE
    ? { rack: { x: 8, y: 8, w: 464, h: 100 }, tx: (i) => 56 + i * 92, ty: 30, sl: { x: 8, y: 116, w: 464, h: 172 }, wx: [96, 240, 384], wy: 214, wr: 42, zm: { x: 8, y: 296, w: 464, h: 118 }, zx: 96, zy: 356, zr: 46, tab: { x: 8, y: 422, w: 464 } }
    : { rack: { x: 16, y: 14, w: 768, h: 120 }, tx: (i) => 110 + i * 140, ty: 34, sl: { x: 16, y: 142, w: 500, h: 206 }, wx: [126, 266, 406], wy: 256, wr: 50, zm: { x: 524, y: 142, w: 260, h: 206 }, zx: 654, zy: 246, zr: 62, tab: { x: 16, y: 356, w: 768 } };
  function makeTest() {
    S.TS = { loaded: null, phase: 'idle', t: 0, tested: SAMPLES.map(() => false), zoom: 0, ins: new Inset(), shakeN: 0 };
    const lampW = PHONE ? 50 : 84, labW = (PHONE ? 46 : 74) + 3 * lampW;
    S.TS.lampW = lampW; S.TS.labW = labW;
    S.TS.table = new CellTable({
      x: TL.tab.x, y: TL.tab.y, w: TL.tab.w, labW, headH: PHONE ? 34 : 36, rowH: PHONE ? 34 : 30,
      cols: [{ label: 'ABO식', opts: BTS.map((t) => t + '형') }, { label: 'Rh식', opts: ['Rh⁺', 'Rh⁻'] }],
      rows: SAMPLES.map((s, i) => '시료 ' + CIRC[i]), ans: SAMPLES.map((s) => [BTS.indexOf(s.abo), s.rh ? 0 : 1]),
      locked: (r) => !S.TS.tested[r], onLocked() { showHint('먼저 그 시료를 검사해요 (시료 선택 → 흔들기)', 2400); }, onChange() { rlast = ''; },
    });
  }
  function testPick(i) {
    const T0 = S.TS; if (T0.phase === 'drop' || T0.phase === 'shake') return;
    T0.loaded = i; T0.phase = 'drop'; T0.t = 0; T0.ins.agg = false; T0.zoom = 0; Sound.click(); rlast = ''; syncControls();
  }
  function testShake() {
    const T0 = S.TS; if (T0.loaded == null || T0.phase === 'drop' || T0.phase === 'shake' || T0.phase === 'idle') return;
    T0.phase = 'shake'; T0.t = 0; Sound.tick(); rlast = ''; syncControls();
  }
  const testRes = (i) => SERUM.map((sv) => aggl(antigensOf(SAMPLES[i]), sv.k));
  function stepTest(dt) {
    const T0 = S.TS; T0.t += dt;
    if (T0.phase === 'drop' && T0.t >= 1.5) { T0.phase = 'mixed'; T0.t = 0; rlast = ''; syncControls(); }
    if (T0.phase === 'shake' && T0.t >= 2.4) {
      T0.phase = 'read'; T0.t = 0; T0.tested[T0.loaded] = true; T0.shakeN++; Sound.success(); rlast = '';
      const rs = testRes(T0.loaded); T0.zoom = Math.max(0, rs.indexOf(true)); T0.ins.agg = rs[T0.zoom]; syncControls();
    }
    if (T0.loaded != null && T0.phase === 'read') { const rs = testRes(T0.loaded); T0.ins.agg = rs[T0.zoom]; }
    T0.ins.update(dt); T0.table.update(dt);
  }
  const testWellSt = (T0) => (T0.phase === 'idle' ? { phase: 'serum', t: 0 } : T0.phase === 'drop' ? { phase: 'drop', t: T0.t } : T0.phase === 'mixed' ? { phase: 'drop', t: 1.6 } : T0.phase === 'shake' ? { phase: 'swirl', t: T0.t } : { phase: 'result', t: T0.t });
  function drawTest(dt) {
    bgFill('#f4eef0', '#eadfe3');
    const T0 = S.TS, R0 = TL.rack;
    panel(R0.x, R0.y, R0.w, R0.h, 16);
    T(R0.x + 14, R0.y + 22, '모의 혈액 시료 (가상 · 실제 채혈 아님)', PHONE ? 12.5 : 14, '#26324a', 'left', 900);
    SAMPLES.forEach((s, i) => {
      const x = R0.x + TL.tx(i) - (PHONE ? 8 : 16), y = R0.y + TL.ty, sel = T0.loaded === i;
      if (sel) { D.roundRect(x - (PHONE ? 34 : 50), R0.y + 28, PHONE ? 68 : 100, R0.h - 34, 12); ctx.fillStyle = 'rgba(245,158,11,.16)'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); }
      D.testTube(x, y + (PHONE ? 0 : 4), PHONE ? 22 : 26, PHONE ? 54 : 64, { level: 0.7, liquid: '#b91c1c' });
      T(x, R0.y + R0.h - 8, '시료 ' + CIRC[i], PHONE ? 12.5 : 14, tested(i) ? '#15803d' : '#26324a', 'center', 800);
      if (tested(i)) T(x + (PHONE ? 20 : 30), y + 14, '✔', 15, '#15803d', 'center', 900);
    });
    // 슬라이드
    const sl = TL.sl; panel(sl.x, sl.y, sl.w, sl.h, 16);
    T(sl.x + 14, sl.y + 22, '모의 검사 슬라이드', PHONE ? 12.5 : 14, '#26324a', 'left', 900);
    T(sl.x + sl.w - 12, sl.y + 22, T0.loaded == null ? '시료를 골라요' : '시료 ' + CIRC[T0.loaded] + (T0.phase === 'drop' ? ' · 떨어뜨리는 중' : T0.phase === 'mixed' ? ' · 섞였어요 → 흔들기' : T0.phase === 'shake' ? ' · 흔드는 중…' : ' · 결과'), PHONE ? 12 : 13.5, '#b45309', 'right', 800);
    const sh = T0.phase === 'shake' && !RM ? Math.sin(clock * 20) * 5 : 0;
    ctx.save(); ctx.translate(sh, 0);
    D.roundRect(sl.x + 14, sl.y + (PHONE ? 38 : 40), sl.w - 28, sl.h - (PHONE ? 50 : 54), 14); ctx.fillStyle = 'rgba(203,225,240,.45)'; ctx.fill(); ctx.strokeStyle = '#a9c1d6'; ctx.lineWidth = 2; ctx.stroke();
    const st = testWellSt(T0), rs = T0.loaded != null ? testRes(T0.loaded) : [false, false, false];
    SERUM.forEach((sv, w) => {
      const wx = TL.wx[w], wy = TL.wy;
      TF(wx, wy - TL.wr - 22, sv.name, PHONE ? 110 : 130, PHONE ? 12.5 : 14, 10, '#26324a', 'center', 800);
      T(wx, wy - TL.wr - 7, '(' + sv.sub + ')', PHONE ? 11 : 12, '#6b7280', 'center', 700);
      drawWell(wx, wy, TL.wr, sv.tint, Object.assign({ agg: rs[w] }, st));
      if (T0.phase === 'read' && T0.loaded != null) { if (T0.zoom === w) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(wx, wy, TL.wr + 6, 0, TAU); ctx.stroke(); ctx.restore(); } T(wx, wy + TL.wr + 18, rs[w] ? '응집 ○' : '응집 안 함', PHONE ? 12 : 13.5, rs[w] ? '#b91c1c' : '#475569', 'center', 900); }
    });
    ctx.restore();
    // 확대
    const zm = TL.zm; panel(zm.x, zm.y, zm.w, zm.h, 16);
    const ags = T0.loaded != null ? antigensOf(SAMPLES[T0.loaded]) : [];
    if (T0.phase === 'read' && T0.loaded != null) { T0.ins.draw(TL.zx, TL.zy, TL.zr, ags, SERUM[T0.zoom].k); }
    else { ctx.save(); ctx.globalAlpha = 0.5; T0.ins.draw(TL.zx, TL.zy, TL.zr, [], 'tri', '#eef2f5'); ctx.restore(); }
    T(zm.x + (PHONE ? 14 : zm.w / 2), zm.y + 22, '🔍 현미경 확대', PHONE ? 13 : 14, '#26324a', PHONE ? 'left' : 'center', 900);
    const tx = PHONE ? TL.zx + TL.zr + 22 : zm.x + zm.w / 2, tw = PHONE ? zm.w - (TL.zx + TL.zr + 22 - zm.x) - 12 : zm.w - 20;
    if (T0.phase === 'read' && T0.loaded != null) { const w = SERUM[T0.zoom]; const msg = w.name + ': ' + (aggl(ags, w.k) ? '적혈구가 항체에 이어 붙어 덩어리가 됐어요' : '적혈구가 흩어져 있어요 (응집 없음)'); if (PHONE) textBlock(tx, zm.y + 48, tw, msg + ' (칸을 눌러 바꿔요)', 12.5, '#374151', 17, 700); else textBlock(zm.x + 12, zm.y + zm.h - 16 - 18, zm.w - 24, msg, 12.5, '#374151', 17, 700); }
    else if (PHONE) textBlock(tx, zm.y + 48, tw, '흔들어서 결과를 보면 여기에 확대 모습이 나와요.', 12.5, '#6b7280', 17, 700);
    // 판정표
    const tb = T0.table, o = tb.o, lw = T0.lampW, base = o.x + (PHONE ? 46 : 74);
    tb.draw();
    ctx.fillStyle = '#e6f3ea'; D.roundRect(o.x, o.y, o.labW, o.headH, 10); ctx.fill();
    TF(o.x + 8, o.y + o.headH / 2 + 5, '시료', 60, 13.5, 10, '#14532d', 'left', 800);
    SERUM.forEach((sv, w) => TF(base + w * lw + lw / 2, o.y + o.headH / 2 + 5, sv.name.replace(' 혈청', ''), lw - 6, PHONE ? 12.5 : 13.5, 10, '#14532d', 'center', 800));
    SAMPLES.forEach((s, r) => {
      const y = o.y + o.headH + r * o.rowH + o.rowH / 2;
      if (!T0.tested[r]) { SERUM.forEach((sv, w) => T(base + w * lw + lw / 2, y + 5, '—', 14, '#b8c2bc', 'center', 800)); return; }
      const rr = testRes(r); SERUM.forEach((sv, w) => { lamp(base + w * lw + lw / 2 - (PHONE ? 12 : 18), y, PHONE ? 7 : 8, rr[w], '#ef4444'); T(base + w * lw + lw / 2 + (PHONE ? 4 : 2), y + 5, rr[w] ? '응집' : '없음', PHONE ? 11 : 12.5, rr[w] ? '#b91c1c' : '#6b7280', 'left', 800); });
    });
    T(VW / 2, VH - (PHONE ? 6 : 6), '※ 교육용 모의 검사예요. 실제 채혈·혈액 검사는 하지 않고, 실험은 교사의 감독 아래서 해요.', PHONE ? 11 : 12, '#6b7280', 'center', 700);
  }
  const tested = (i) => S.TS.tested[i];

  /* ================= ④ 수혈 시험 · 사건 추론 ================= */
  const CASES = [{ rec: 'A', don: 'B' }, { rec: 'A', don: 'A' }, { rec: 'O', don: 'AB' }];
  const caseClump = (c) => BT[c.don].ag.some((k) => BT[c.rec].ab.indexOf(k) >= 0);
  const caseKind = (c) => BT[c.don].ag.find((k) => BT[c.rec].ab.indexOf(k) >= 0) || 'tri';
  const RL = PHONE
    ? { rec: { x: 8, y: 8, w: 226, h: 232 }, don: { x: 246, y: 8, w: 226, h: 232 }, mix: { x: 8, y: 248, w: 464, h: 236 }, wx: 110, wy: 372, wr: 52, ix: 360, iy: 372, ir: 54, cap: { x: 8, y: 492, w: 464, h: 140 } }
    : { rec: { x: 16, y: 14, w: 248, h: 332 }, don: { x: 536, y: 14, w: 248, h: 332 }, mix: { x: 272, y: 14, w: 256, h: 332 }, wx: 400, wy: 112, wr: 54, ix: 400, iy: 264, ir: 56, cap: { x: 16, y: 354, w: 768, h: 192 } };
  function makeTrans() { S.TR = { cs: 0, pred: [null, null, null], done: [false, false, false], ok: [false, false, false], t: -1, ins: new Inset(), msg: '' }; }
  function transRun() {
    const R = S.TR; if (R.t >= 0 && R.t < 3.2) return; if (R.pred[R.cs] == null) { showHint('먼저 결과를 예측해요 (응집할 것이다 / 응집하지 않는다)', 2600); return; }
    R.t = 0; R.ins.agg = false; Sound.click(); rlast = ''; syncControls();
  }
  function stepTrans(dt) {
    const R = S.TR;
    if (R.t >= 0 && R.t < 3.6) {
      const was = R.t; R.t += dt;
      if (was < 2.2 && R.t >= 2.2) R.ins.agg = caseClump(CASES[R.cs]);
      if (was < 3.2 && R.t >= 3.2) syncControls();
      if (was < 2.6 && R.t >= 2.6) {
        const c = CASES[R.cs], real = caseClump(c); R.done[R.cs] = true; R.ok[R.cs] = (R.pred[R.cs] === 'yes') === real; rlast = '';
        R.msg = R.ok[R.cs] ? '예측이 맞았어요!' : '예측과 달라요. 다시 예측하고 확인해 보세요.'; if (R.ok[R.cs]) Sound.success(); else Sound.fail(); syncControls();
      }
    }
    R.ins.update(dt);
  }
  function setCase(i) { const R = S.TR; if (R.t >= 0 && R.t < 3.2) return; R.cs = i; R.t = -1; R.ins.agg = false; R.msg = ''; rlast = ''; syncControls(); }
  function drawTrans(dt) {
    bgFill('#f4eef0', '#eadfe3');
    const R = S.TR, c = CASES[R.cs], st = R.t < 0 ? { phase: 'serum', t: 0 } : R.t < 0.9 ? { phase: 'drop', t: R.t } : R.t < 2.2 ? { phase: 'swirl', t: R.t - 0.9 } : { phase: 'result', t: R.t - 2.2 };
    const rp = RL.rec, dp = RL.don, mp2 = RL.mix;
    panel(rp.x, rp.y, rp.w, rp.h, 16); panel(dp.x, dp.y, dp.w, dp.h, 16); panel(mp2.x, mp2.y, mp2.w, mp2.h, 16);
    // 수혜자: 혈장 속 응집소
    T(rp.x + rp.w / 2, rp.y + 26, '수혜자 ' + c.rec + '형', 17, '#1e3a8a', 'center', 900);
    T(rp.x + rp.w / 2, rp.y + 70, '🧑', 40, '#000', 'center', 600);
    D.roundRect(rp.x + 14, rp.y + (PHONE ? 90 : 100), rp.w - 28, PHONE ? 100 : 128, 12); ctx.fillStyle = '#fff1bd'; ctx.fill(); ctx.strokeStyle = '#e8c55a'; ctx.lineWidth = 1.5; ctx.stroke();
    T(rp.x + 24, rp.y + (PHONE ? 106 : 118), '혈장 (수혜자)', 12, '#92400e', 'left', 800);
    const abs = BT[c.rec].ab;
    if (!abs.length) T(rp.x + rp.w / 2, rp.y + (PHONE ? 150 : 170), '응집소 없음', 14, '#6b7280', 'center', 800);
    abs.forEach((k, i) => { const x = rp.x + rp.w / 2 + (abs.length === 1 ? 0 : (i ? 1 : -1) * (PHONE ? 40 : 46)); drawAb(x, rp.y + (PHONE ? 168 : 190), PHONE ? 16 : 20, 0, k, { col: '#334155' }); T(x, rp.y + (PHONE ? 184 : 212), k === 'tri' ? 'α (항A)' : 'β (항B)', 12.5, '#78350f', 'center', 800); });
    T(rp.x + rp.w / 2, rp.y + rp.h - 16, '응집소: ' + (abs.length ? abs.map((k) => (k === 'tri' ? 'α' : 'β')).join('·') : '없음'), 13.5, '#374151', 'center', 800);
    // 공여자: 적혈구 속 응집원
    T(dp.x + dp.w / 2, dp.y + 26, '공여자 ' + c.don + '형', 17, '#7f1d1d', 'center', 900);
    const dc = { x: dp.x + dp.w / 2, y: dp.y + (PHONE ? 112 : 130) }, dr = PHONE ? 44 : 56;
    drawRBC(dc.x, dc.y, dr, 0); T(dc.x, dc.y + 5, '적혈구', 13, 'rgba(255,255,255,.95)', 'center', 800);
    const ags = BT[c.don].ag;
    ags.forEach((k, j) => { for (let q = 0; q < 4; q++) { const a = (j * 4 + q) * (TAU / (Math.max(1, ags.length) * 4)) - 1.3; drawAg(k, dc.x + Math.cos(a) * (dr + 3), dc.y + Math.sin(a) * (dr + 3), PHONE ? 7.5 : 9.5, a + Math.PI / 2); } });
    T(dp.x + dp.w / 2, dp.y + dp.h - 16, '응집원: ' + (ags.length ? ags.map((k) => (k === 'tri' ? 'A' : 'B')).join('·') : '없음'), 13.5, '#374151', 'center', 800);
    // 가운데: 수혜자 혈장 + 공여자 적혈구를 섞기
    T(mp2.x + mp2.w / 2, mp2.y + 26, '섞어 보기 (모의)', PHONE ? 14 : 15.5, '#26324a', 'center', 900);
    drawWell(RL.wx, RL.wy, RL.wr, '#fde68a', Object.assign({ agg: R.ins.agg }, st));
    R.ins.draw(RL.ix, RL.iy, RL.ir, ags, caseKind(c));
    T(RL.ix, RL.iy + RL.ir + 15, '🔍 현미경 확대', 12, '#4b5563', 'center', 700);
    if (!PHONE) T(RL.wx, RL.wy + RL.wr + 22, st.phase === 'result' ? (R.ins.agg ? '응집! → 위험해요' : '응집 없음 → 안전해요') : '', 14, R.ins.agg ? '#b91c1c' : '#15803d', 'center', 900);
    else T(RL.wx, RL.wy + RL.wr + 20, st.phase === 'result' ? (R.ins.agg ? '응집! 위험' : '응집 없음') : '', 13, R.ins.agg ? '#b91c1c' : '#15803d', 'center', 900);
    // 아래 설명
    const Cp = RL.cap; panel(Cp.x, Cp.y, Cp.w, Cp.h, 14);
    const lines = ['수혈할 때 공여자의 적혈구 응집원이 수혜자 혈장의 응집소와 만나면 응집이 일어나요 (위험).', '그래서 원칙은 같은 혈액형 수혈이에요. (이 모형은 Rh식은 같다고 가정해요.)', R.msg || ('사례 ' + (R.cs + 1) + ': ' + c.rec + '형 수혜자에게 ' + c.don + '형 혈액 → 결과를 먼저 예측해 보세요.')];
    let yy = Cp.y + 26; lines.forEach((l, i) => { yy += textBlock(Cp.x + 14, yy, Cp.w - 28, l, PHONE ? 13 : 14, i === 2 ? (R.ok[R.cs] ? '#15803d' : '#b45309') : '#374151', PHONE ? 18 : 20, i === 2 ? 800 : 700) + 4; });
    if (!PHONE) T(Cp.x + Cp.w - 14, Cp.y + Cp.h - 10, '교육용 모형이에요. 실제 수혈은 의료진이 검사를 거쳐 결정해요.', 12, '#6b7280', 'right', 700);
  }

  const SUS = [
    { id: 's1', label: '가 (A형)', short: '가 · A형', ans: 'keep', icon: '🧑' }, { id: 's2', label: '나 (B형)', short: '나 · B형', ans: 'ex', icon: '🧑' }, { id: 's3', label: '다 (O형)', short: '다 · O형', ans: 'ex', icon: '🧑' },
    { id: 's4', label: '라 (AB형)', short: '라 · AB형', ans: 'ex', icon: '🧑' }, { id: 's5', label: '마 (A형)', short: '마 · A형', ans: 'keep', icon: '🧑' }, { id: 's6', label: '바 (O형)', short: '바 · O형', ans: 'ex', icon: '🧑' },
  ];
  function makeCase() {
    const boxes = PHONE
      ? [{ id: 'ex', label: '혈액형이 달라서 배제할 수 있어요', col: '#0891b2', x: 8, y: 112, w: 226, h: 190, cols: 1, hdr: 40 }, { id: 'keep', label: '배제할 수 없어요 (확정도 못 해요)', col: '#be123c', x: 246, y: 112, w: 226, h: 190, cols: 1, hdr: 40 }]
      : [{ id: 'ex', label: '혈액형이 달라서 배제할 수 있어요', col: '#0891b2', x: 16, y: 122, w: 380, h: 214, cols: 2, hdr: 32 }, { id: 'keep', label: '배제할 수 없어요 (확정도 못 해요)', col: '#be123c', x: 404, y: 122, w: 380, h: 214, cols: 2, hdr: 32 }];
    S.SO = new Sorter({
      cards: SUS.map((c) => Object.assign({}, c, { col: '#475569' })), boxes,
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 316 + Math.floor(i / 2) * 56 }) : (i) => ({ x: 16 + (i % 3) * 262, y: 352 + Math.floor(i / 3) * 62 }),
      cw: PHONE ? 228 : 252, ch: PHONE ? 48 : 54, kh: PHONE ? 24 : 28, onChange() { rlast = ''; },
    });
  }
  function drawCase(dt) {
    bgFill('#f1f1f5', '#e2e3ec');
    const so = S.SO; so.update(dt);
    const hp = PHONE ? { x: 8, y: 8, w: 464, h: 96 } : { x: 16, y: 14, w: 768, h: 100 }; panel(hp.x, hp.y, hp.w, hp.h, 14);
    T(hp.x + 14, hp.y + 26, '🕵️ 가상 사건 (모의 상황)', PHONE ? 14 : 16, '#312e81', 'left', 900);
    D.roundRect(hp.x + hp.w - (PHONE ? 130 : 170), hp.y + 12, PHONE ? 118 : 156, PHONE ? 34 : 38, 10); ctx.fillStyle = '#fee2e2'; ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();
    T(hp.x + hp.w - (PHONE ? 71 : 92), hp.y + (PHONE ? 35 : 38), '현장 혈흔: A형', PHONE ? 13.5 : 15, '#991b1b', 'center', 900);
    textBlock(hp.x + 14, hp.y + (PHONE ? 52 : 56), hp.w - 28, '현장에서 발견된 혈흔의 혈액형이 A형이에요. 가상의 여섯 사람의 혈액형만으로 누구를 배제할 수 있는지 나눠 보세요.', PHONE ? 13 : 14, '#4b5563', PHONE ? 18 : 20, 700);
    so.drawBoxes(); so.drawCards();
    if (!PHONE) { const ty = 352 + 2 * 62 + 4; panel(16, ty, 768, VH - ty - 12, 12); TF(400, ty + 26, '혈액형이 다르면 그 사람의 피가 아니라고 말할 수 있지만, 같다고 해서 그 사람이라고 단정할 수는 없어요.', 740, 14, 11, '#26324a', 'center', 800); }
  }

  /* ============ 장면 전환 · 조작 연결 ============ */
  function testDown(p) {
    const T0 = S.TS, R0 = TL.rack;
    for (let i = 0; i < 5; i++) { const x = R0.x + TL.tx(i) - (PHONE ? 8 : 16) - (PHONE ? 34 : 50); if (inRect(p.x, p.y, { x, y: R0.y + 28, w: PHONE ? 68 : 100, h: R0.h - 34 })) { testPick(i); return false; } }
    if (T0.phase === 'read') for (let w = 0; w < 3; w++) if (Math.hypot(p.x - TL.wx[w], p.y - TL.wy) < TL.wr + 8) { T0.zoom = w; Sound.click(); return false; }
    return T0.table.down(p);
  }
  function testHover(p) {
    const R0 = TL.rack; for (let i = 0; i < 5; i++) { const x = R0.x + TL.tx(i) - (PHONE ? 8 : 16) - (PHONE ? 34 : 50); if (inRect(p.x, p.y, { x, y: R0.y + 28, w: PHONE ? 68 : 100, h: R0.h - 34 })) return 'pointer'; }
    return S.TS.table.hover(p);
  }
  function onEnterView() {
    const key = viewKey(); PT = null;
    if (key === 'ag:match') { PT = { down: matchDown, move: matchMove, up: matchUp, hover: (p) => (S.AM.abs.some((b) => !b.bound && Math.hypot(p.x - b.x, p.y - (b.y - AL.sz * 0.9)) < AL.sz * 1.1) ? 'grab' : 'default') }; }
    else if (key === 'abo:draw') PT = { down: drawDown, hover: (p) => { for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const sp = slotPos(i, k); if (Math.hypot(p.x - sp.x, p.y - (k < 2 ? sp.y : sp.y + 12)) < sp.r + 8) return 'pointer'; } return 'default'; } };
    else if (key === 'abo:mix') PT = S.MX.table;
    else if (key === 'test') PT = { down: testDown, hover: testHover };
    else if (key === 'use:case') PT = S.SO;
  }
  function syncControls() {
    const A = S.AM, K = S.CL, M = S.MX, T0 = S.TS, R = S.TR;
    $('#agNote').innerHTML = '붙인 짝 <b>' + A.right + ' / 3</b> · 맞지 않는 짝 시도 <b>' + A.wrong + '회</b>. 항체를 끌어서 항원 가까이에 놓아요.';
    markSeg('#abChips', 'k', K.sel);
    $('#clNote').innerHTML = '응집 덩어리(가장 큰 것) <b>' + K.maxClump + '개</b> ' + mark(K.maxClump >= 5) + ' · 맞지 않는 항체 넣어 보기 ' + mark(K.wrongTried);
    markSeg('#mixChips', 'k', M.sel);
    $$('#mixChips button').forEach((b) => b.classList.toggle('done', !!M.tested[b.dataset.k]));
    $('#bMix').disabled = M.runT >= 0 && M.runT < 3.2; $('#bMix').textContent = M.runT >= 0 && M.runT < 3.2 ? '섞는 중…' : '💧 항A·항B 혈청 섞기';
    $('#mixNote').innerHTML = '섞어 본 혈액형: ' + BTS.map((t) => (M.tested[t] ? '✅' : '⬜') + t).join(' ') + ' · 결과를 표에 채워요.';
    markSeg('#smpChips', 'k', T0.loaded == null ? '-' : T0.loaded);
    $$('#smpChips button').forEach((b) => { b.classList.toggle('done', !!T0.tested[+b.dataset.k]); b.disabled = T0.phase === 'drop' || T0.phase === 'shake'; });
    $('#bShake').disabled = !(T0.phase === 'mixed' || T0.phase === 'read'); $('#bShake').textContent = T0.phase === 'shake' ? '흔드는 중…' : '🔄 슬라이드 흔들기';
    $('#testNote').innerHTML = '검사한 시료 <b>' + T0.tested.filter(Boolean).length + ' / 5</b> · ① 시료 고르기 → ② 흔들기 → ③ 판정표에 기록. 교육용 모의 검사예요.';
    markSeg('#caseChips', 'k', R.cs);
    $$('#caseChips button').forEach((b) => { b.classList.toggle('done', !!R.ok[+b.dataset.k]); b.disabled = R.t >= 0 && R.t < 3.2; });
    markSeg('#predChips', 'k', R.pred[R.cs] || '-');
    $$('#predChips button').forEach((b) => { b.disabled = R.t >= 0 && R.t < 3.2; });
    $('#bTrans').disabled = R.t >= 0 && R.t < 3.2;
    $('#trNote').innerHTML = '맞힌 사례 <b>' + R.ok.filter(Boolean).length + ' / 3</b> · 사례 ' + (R.cs + 1) + ': ' + CASES[R.cs].rec + '형 수혜자 ← ' + CASES[R.cs].don + '형 혈액';
  }
  on('#bAgReset', 'click', () => { Sound.click(); makeMatch(); rlast = ''; syncControls(); });
  on('#abChips', 'click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.CL.sel = b.dataset.k; syncControls(); });
  on('#bAdd', 'click', () => clumpAdd());
  on('#bClReset', 'click', () => { Sound.click(); const k = S.CL.sel; makeClump(); S.CL.sel = k; rlast = ''; syncControls(); });
  on('#bDrawReset', 'click', () => { Sound.click(); makeDraw(); rlast = ''; });
  on('#mixChips', 'click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); mixSelect(b.dataset.k); syncControls(); });
  on('#bMix', 'click', mixRun);
  on('#bMixReset', 'click', () => { Sound.click(); makeMix(); onEnterView(); rlast = ''; syncControls(); });
  on('#smpChips', 'click', (e) => { const b = e.target.closest('button'); if (b) testPick(+b.dataset.k); });
  on('#bShake', 'click', testShake);
  on('#bTestReset', 'click', () => { Sound.click(); makeTest(); onEnterView(); rlast = ''; syncControls(); });
  on('#caseChips', 'click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setCase(+b.dataset.k); } });
  on('#predChips', 'click', (e) => { const b = e.target.closest('button'); if (!b || (S.TR.t >= 0 && S.TR.t < 3.2)) return; Sound.click(); S.TR.pred[S.TR.cs] = b.dataset.k; S.TR.done[S.TR.cs] = false; S.TR.ok[S.TR.cs] = false; syncControls(); });
  on('#bTrans', 'click', transRun);
  on('#bCaseReset', 'click', () => { Sound.click(); S.SO.reset(); });

  function readouts() {
    const key = viewKey(), A = S.AM, K = S.CL, M = S.MX, T0 = S.TS, R = S.TR;
    if (key === 'ag:match') setReadouts([['결합한 짝', A.right + ' / 3'], ['맞지 않는 시도', A.wrong + '회'], ['원리', '모양이 맞아야 결합']]);
    else if (key === 'ag:clump') setReadouts([['가장 큰 덩어리', K.maxClump + '개'], ['이어 붙인 항체', K.links.filter((l) => l.on).length + '개'], ['맞지 않는 항체', K.free.length + '개']]);
    else if (key === 'abo:draw') setReadouts([['맞게 채운 혈액형', BTS.filter((t) => S.AD[t].join() === adCorrect(t).join()).length + ' / 4'], ['켠 칸', BTS.reduce((s, t) => s + S.AD[t].reduce((a, b) => a + b, 0), 0) + '개'], ['규칙', '자기 응집원과 결합하는 응집소는 없어요']]);
    else if (key === 'abo:mix') setReadouts([['모의 혈액', M.sel + '형'], ['섞어 본 혈액형', BTS.filter((t) => M.tested[t]).length + ' / 4'], ['채운 칸', M.table.filled + ' / 8']]);
    else if (key === 'test') setReadouts([['검사한 시료', T0.tested.filter(Boolean).length + ' / 5'], ['지금 시료', T0.loaded == null ? '—' : '시료 ' + CIRC[T0.loaded]], ['판정표 채운 칸', T0.table.filled + ' / 10']]);
    else if (key === 'use:trans') setReadouts([['사례', (R.cs + 1) + ' / 3'], ['수혜자 ← 공여자', CASES[R.cs].rec + '형 ← ' + CASES[R.cs].don + '형'], ['맞힌 예측', R.ok.filter(Boolean).length + ' / 3']]);
    else setReadouts([['분류한 카드', S.SO.placed + ' / 6'], ['현장 혈흔', 'A형'], ['', '']].slice(0, 2));
  }

  /* ============ 시작 ============ */
  makeMatch(); makeClump(); makeDraw(); makeMix(); makeTest(); makeTrans(); makeCase();

  /* ============ 단계 · 미션 ============ */
  const adOK = (t) => S.AD[t].join() === adCorrect(t).join();
  const levels = [
    {
      title: '항원-항체 반응: 열쇠와 자물쇠', short: '항원-항체', icon: '🔑', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 피 같아 보이는데 어떻게 혈액형을 구별하고, 왜 아무 피나 수혈하면 안 될까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 항원 검사 키트는 항원과 항체의 결합으로 병원체를 알아낸다고 배웠어요. 이번에는 그 결합이 <b>아무것과나 일어나지 않는 까닭</b>(특이성)과, 이를 이용한 <b>혈액형 판정</b>을 알아봐요.</div>' +
        '<p>항체는 <b>항원과 모양이 맞는 것에만</b> 결합해요(열쇠와 자물쇠). 또 항체의 결합 부위는 <b>두 곳</b>이라서 서로 다른 세포의 항원을 이어 붙여 <b>덩어리(응집)</b>를 만들어요. 이 단계에서는 모양이 다른 항원 ▲ ● ■ 로 확인해요. (모형이에요.)</p>',
      features: ['ag'],
      setup() { setScene('ag', 'match'); },
      recap: '항체는 항원과 모양(결합 부위)이 맞는 것에만 결합해요(특이성). 항체는 결합 부위가 두 곳이라 적혈구 같은 세포를 서로 이어 붙여 응집을 일으켜요.',
      summary: '<ul><li><b>항원-항체 반응의 특이성</b>: 항체의 결합 부위는 특정 항원의 모양과만 맞아요 (열쇠와 자물쇠). 맞지 않으면 결합하지 못해요.</li>' +
        '<li>항체는 결합 부위가 <b>2개</b> → 서로 다른 세포의 항원을 연결해 <b>응집</b>(덩어리)이 생겨요.</li>' +
        '<li>항원 검사 키트(통합과학)와 혈액형 검사는 모두 이 원리를 이용해요.</li></ul>',
      missions: [
        {
          title: '항체와 항원 짝짓기',
          goal: '항체(Y)를 끌어서 항원에 붙여 <b>맞는 짝 3개</b>를 모두 결합시키고, <b>맞지 않는 짝도 한 번</b> 시도해 보세요.',
          hint: '항체의 팔 끝 홈 모양(▲ ● ■)을 보세요. 모양이 같은 항원에만 붙어요. 일부러 다른 짝에 놓아 어떻게 되는지도 보세요.',
          setup() { makeMatch(); setScene('ag', 'match'); syncControls(); },
          check: () => S.AM.right === 3 && S.AM.wrong >= 1, hold: 0.5,
          status: () => '맞는 짝 ' + S.AM.right + ' / 3 ' + mark(S.AM.right === 3) + ' &nbsp; 맞지 않는 짝 시도 ' + mark(S.AM.wrong >= 1),
          explain: '항체의 결합 부위는 한 가지 모양의 항원과만 맞아요. 삼각 홈 항체는 ▲ 항원에만, 원 홈 항체는 ● 항원에만 결합해요. 이것이 항원-항체 반응의 <b>특이성</b>이에요.',
        },
        {
          title: '항체로 응집 만들기',
          goal: '<b>▲ 항체</b>를 넣어 적혈구 <b>5개 이상</b>이 이어 붙은 덩어리를 만들고, <b>● 또는 ■ 항체</b>도 한 번 넣어 보세요.',
          hint: '항체 종류를 고르고 “6개 넣기”를 눌러요. 적혈구 표면에는 ▲ 항원이 있어요. 필요하면 두 번 눌러요.',
          setup() { makeClump(); setScene('ag', 'clump'); syncControls(); },
          check: () => S.CL.wrongTried && S.CL.maxClump >= 5, hold: 0.8,
          status: () => '▲ 항체로 덩어리 ' + S.CL.maxClump + '개 (5개 이상) ' + mark(S.CL.maxClump >= 5) + ' &nbsp; ●·■ 항체 시도 ' + mark(S.CL.wrongTried),
          explain: '▲ 항체는 ▲ 항원이 있는 적혈구 두 개를 이어 붙여요(결합 부위가 2개). 이것이 반복되면 큰 <b>응집 덩어리</b>가 생겨요. ●·■ 항체는 이 적혈구와 모양이 맞지 않아 결합하지 못하므로 응집이 일어나지 않아요.',
        },
        {
          type: 'quiz', title: '모양이 맞지 않으면?',
          goal: '항체의 결합 부위 모양이 항원의 모양과 <b>맞지 않으면</b> 어떻게 될까요?',
          setup() { setScene('ag', 'match'); },
          choices: ['결합하지 못하고, 그 항원에 대한 응집도 일어나지 않는다', '다른 모양의 항원에도 똑같이 단단히 붙는다', '항체가 항원 모양에 맞게 모양을 바꿔서 결합한다', '항체가 항원을 삼켜서 없애 버린다'],
          answer: 0,
          feedback: ['', '항체는 맞는 모양의 항원에만 결합해요. 이것이 특이성이에요.', '항체의 결합 부위 모양은 정해져 있어서 항원에 맞춰 바뀌지 않아요.', '항체는 결합해서 병원체를 무력화하고 제거를 돕지만, 삼키는 일은 식세포가 해요.'],
          explain: '항체의 결합 부위는 <b>특정 항원의 모양에만</b> 맞아요. 모양이 맞지 않으면 결합하지 못해요. 그래서 한 가지 항체로 한 가지 항원만 알아낼 수 있고, 혈액형 검사에서 항A·항B 혈청을 따로 쓰는 거예요.',
        },
      ],
    },
    {
      title: 'ABO식 혈액형: 응집원과 응집소', short: 'ABO 응집', icon: '🅰', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 항체가 맞는 항원에만 결합하고, 두 곳에서 결합해 적혈구를 응집시키는 것을 보았어요. 혈액형은 바로 <b>적혈구 표면의 항원</b>으로 정해져요.</div>' +
        '<p><b>ABO식 혈액형</b>은 적혈구 표면의 <b>응집원(항원)</b> A, B로 정해요. 혈장에는 이에 맞는 <b>응집소(항체)</b> α(항A), β(항B)가 들어 있어요. 4가지 혈액형의 구조를 완성하고, 항A·항B 혈청을 섞어 응집 여부를 확인해요.</p>',
      features: ['abo'],
      setup() { setScene('abo', 'draw'); },
      recap: 'A형은 응집원 A·응집소 β, B형은 응집원 B·응집소 α, AB형은 응집원 A와 B·응집소 없음, O형은 응집원 없음·응집소 α와 β예요. 항A 혈청은 응집원 A를, 항B 혈청은 응집원 B를 응집시켜요.',
      summary: '<table class="mini"><tr><th>혈액형</th><th>응집원(적혈구)</th><th>응집소(혈장)</th></tr><tr><td>A형</td><td>A</td><td>β</td></tr><tr><td>B형</td><td>B</td><td>α</td></tr><tr><td>AB형</td><td>A, B</td><td>없음</td></tr><tr><td>O형</td><td>없음</td><td>α, β</td></tr></table>' +
        '<ul><li>항A 혈청(응집소 α): 응집원 A가 있으면 응집 → A형, AB형. 항B 혈청(응집소 β): 응집원 B가 있으면 응집 → B형, AB형.</li></ul>',
      missions: [
        {
          title: '4가지 혈액형 구조 완성', manual: true,
          goal: '점선 칸을 눌러 각 혈액형의 <b>응집원(▲ ●)</b>과 <b>응집소(α β)</b>를 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'A형은 응집원 A, B형은 응집원 B, AB형은 둘 다, O형은 없어요. 혈장에는 자기 응집원과 결합하는 응집소가 없어요.',
          setup() { makeDraw(); setScene('abo', 'draw'); },
          check() {
            const bad = BTS.filter((t) => !adOK(t)); BTS.forEach((t) => { S.AD.bad[t] = bad.indexOf(t) >= 0; });
            if (bad.length) { S.AD.shk = 1; return '빨간 테두리의 혈액형을 다시 보세요: ' + bad.map((t) => t + '형').join(', ') + '. 자기 응집원과 결합하는 응집소가 혈장에 있으면 스스로 응집해요.'; }
            S.AD.ok = true; return true;
          },
          status: () => '맞게 채운 혈액형 ' + BTS.filter(adOK).length + ' / 4',
          explain: '<b>A형</b>: 응집원 A, 응집소 β / <b>B형</b>: 응집원 B, 응집소 α / <b>AB형</b>: 응집원 A·B, 응집소 없음 / <b>O형</b>: 응집원 없음, 응집소 α·β. 혈장에 자기 응집원과 결합하는 응집소가 있으면 자기 적혈구가 응집하므로 그런 응집소는 없어요.',
        },
        {
          title: '항A·항B 혈청 반응표 채우기', manual: true,
          goal: '혈액형마다 모의 혈액을 항A·항B 혈청과 <b>섞어 보고</b>, 결과표 8칸을 채운 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '혈액형을 고르고 💧 섞기를 눌러요. 섞어 본 혈액형만 표의 칸을 채울 수 있어요. 현미경 확대 그림에서 적혈구가 이어 붙는지 보세요.',
          setup() { makeMix(); setScene('abo', 'mix'); syncControls(); },
          check() {
            const M = S.MX, un = BTS.filter((t) => !M.tested[t]);
            if (un.length) return '아직 섞어 보지 않은 혈액형이 있어요: ' + un.map((t) => t + '형').join(', ') + '.';
            const miss = M.table.total - M.table.filled; if (miss) return '아직 비어 있는 칸이 ' + miss + '칸 있어요.';
            const w = M.table.wrongCells(); M.table.markBad(w); if (w.length) return '빨간 칸을 다시 보세요. 현미경 확대 그림에서 적혈구가 이어 붙었는지 확인해요.';
            M.table.ok = true; return true;
          },
          status: () => '섞어 본 혈액형 ' + BTS.filter((t) => S.MX.tested[t]).length + ' / 4 &nbsp; 채운 칸 ' + S.MX.table.filled + ' / 8',
          explain: '<b>A형</b>: 항A에서 응집 / <b>B형</b>: 항B에서 응집 / <b>AB형</b>: 둘 다 응집 / <b>O형</b>: 둘 다 응집 안 함. 항A 혈청의 응집소 α가 응집원 A와, 항B 혈청의 응집소 β가 응집원 B와 결합해 적혈구를 이어 붙이기 때문이에요.',
        },
        {
          type: 'quiz', title: 'AB형 혈장의 응집소',
          goal: '<b>AB형</b> 사람의 혈장에는 ABO식 응집소가 어떻게 들어 있을까요?',
          setup() { setScene('abo', 'draw'); },
          choices: ['α와 β가 모두 있다', 'α만 있다', 'β만 있다', '응집소가 없다 (α도 β도 없다)'],
          answer: 3,
          feedback: ['α와 β가 모두 있는 것은 O형이에요. AB형은 응집원 A·B가 모두 있으므로 α·β가 있으면 스스로 응집해요.', 'α만 있는 것은 B형이에요. AB형 적혈구에는 응집원 A가 있어 α와 결합해 버려요.', 'β만 있는 것은 A형이에요. AB형 적혈구에는 응집원 B가 있어 β와 결합해 버려요.', ''],
          explain: 'AB형은 적혈구에 응집원 <b>A와 B가 모두</b> 있어서, 혈장에 α나 β가 있으면 자기 적혈구가 응집해요. 그래서 AB형 혈장에는 <b>ABO식 응집소가 없어요</b>.',
        },
      ],
    },
    {
      title: '혈액형 검사: 모의 키트로 판정하기', short: '혈액형 검사', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 항A·항B 혈청에 응집하는지로 ABO식 혈액형이 정해지는 것을 확인했어요. 여기에 <b>항Rh 혈청</b>을 더하면 <b>Rh식</b>도 알 수 있어요.</div>' +
        '<p><b>모의 검사 키트</b>(슬라이드 칸 3개: 항A / 항B / 항Rh)에 <b>모의 혈액 시료 ①~⑤</b>를 차례로 넣고 흔들어 응집을 확인한 뒤 <b>판정표</b>를 채워요. Rh 응집원(D)이 있으면 <b>Rh⁺</b>, 없으면 <b>Rh⁻</b>예요. (가상의 모의 시료예요. 실제 채혈·혈액 취급은 하지 않고, 실험은 교사의 감독 아래서 해요.)</p>',
      features: ['test'],
      setup() { setScene('test'); },
      recap: '항A에서 응집하면 응집원 A, 항B에서 응집하면 응집원 B, 둘 다면 AB형, 둘 다 아니면 O형이에요. 항Rh에서 응집하면 Rh⁺, 응집하지 않으면 Rh⁻예요.',
      summary: '<table class="mini"><tr><th>항A</th><th>항B</th><th>ABO식</th></tr><tr><td>응집</td><td>없음</td><td>A형</td></tr><tr><td>없음</td><td>응집</td><td>B형</td></tr><tr><td>응집</td><td>응집</td><td>AB형</td></tr><tr><td>없음</td><td>없음</td><td>O형</td></tr></table>' +
        '<ul><li>항Rh 혈청에서 <b>응집 → Rh⁺</b>, <b>응집 안 함 → Rh⁻</b>.</li><li>모의 시료 ①~⑤: A⁺, B⁻, AB⁺, O⁻, O⁺ (모의 검사 예시).</li></ul>',
      missions: [
        {
          title: '시료 5개를 검사하고 판정표 기록', manual: true,
          goal: '시료 ①~⑤를 차례로 <b>슬라이드에 넣고 흔들어</b> 응집을 확인한 뒤, 판정표의 <b>ABO식·Rh식</b> 10칸을 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시료를 고르면 세 칸에 떨어져요. 🔄 흔들기를 눌러 응집을 보고, 표에는 검사한 시료만 기록할 수 있어요. 항A·항B·항Rh 응집 결과로 판정해요.',
          setup() { makeTest(); setScene('test'); onEnterView(); syncControls(); },
          check() {
            const T0 = S.TS, un = SAMPLES.filter((s, i) => !T0.tested[i]);
            if (un.length) return '아직 검사하지 않은 시료가 있어요: ' + un.map((s) => CIRC[s.id - 1]).join(' ') + '.';
            const miss = T0.table.total - T0.table.filled; if (miss) return '아직 비어 있는 칸이 ' + miss + '칸 있어요.';
            const w = T0.table.wrongCells(); T0.table.markBad(w); if (w.length) return '빨간 칸을 다시 판정해 보세요 (시료 ' + [...new Set(w.map((q) => CIRC[q[0]]))].join(' ') + '). 응집 결과 표시를 다시 읽어요.';
            T0.table.ok = true; return true;
          },
          status: () => '검사한 시료 ' + S.TS.tested.filter(Boolean).length + ' / 5 &nbsp; 판정표 ' + S.TS.table.filled + ' / 10',
          explain: '시료 ①은 항A·항Rh에서 응집 → <b>A형 Rh⁺</b>, ②는 항B에서만 응집 → <b>B형 Rh⁻</b>, ③은 셋 다 응집 → <b>AB형 Rh⁺</b>, ④는 모두 응집 안 함 → <b>O형 Rh⁻</b>, ⑤는 항Rh에서만 응집 → <b>O형 Rh⁺</b>예요.',
        },
        {
          type: 'quiz', title: '이 결과는 무슨 혈액형?',
          goal: '어떤 시료가 <b>항A 혈청에서는 응집</b>하고 <b>항B 혈청에서는 응집하지 않았어요</b>. ABO식 혈액형은?',
          setup() { setScene('test'); },
          choices: ['A형', 'B형', 'AB형', 'O형'],
          answer: 0,
          feedback: ['', '항B에서 응집하면 B형이에요. 이 시료는 항B에서 응집하지 않았어요.', 'AB형은 항A·항B 모두에서 응집해요.', 'O형은 항A·항B 모두에서 응집하지 않아요.'],
          explain: '항A 혈청의 응집소 α가 결합했다는 것은 <b>응집원 A</b>가 있다는 뜻이고, 항B에서는 응집하지 않았으니 응집원 B는 없어요. 그래서 <b>A형</b>이에요.',
        },
      ],
    },
    {
      title: '수혈과 추론: 혈액형을 적용해요', short: '수혈 적용', icon: '💉', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 응집 반응으로 혈액형을 판정했어요. 이제 이 원리로 <b>수혈이 왜 같은 혈액형끼리 원칙인지</b>, 그리고 혈액형 정보로 <b>무엇을 알 수 있고 무엇은 알 수 없는지</b> 생각해요.</div>' +
        '<p>수혈할 때 <b>공여자 적혈구의 응집원</b>이 <b>수혜자 혈장의 응집소</b>와 만나면 응집이 일어나 위험해요. 수혈 사례 3가지의 결과를 먼저 <b>예측</b>하고 확인해요. 또 가상 사건에서 혈액형으로 <b>배제만 가능한 까닭</b>도 생각해요. (교육용 모형이에요.)</p>',
      features: ['use'],
      setup() { setScene('use', 'trans'); },
      recap: '공여자의 응집원이 수혜자의 응집소와 만나면 응집이 일어나서 같은 혈액형 수혈이 원칙이에요. 혈액형이 다르면 그 사람을 배제할 수 있지만, 같다고 해서 단정할 수는 없어요.',
      summary: '<ul><li><b>수혈</b>: 공여자의 <b>응집원</b> + 수혜자의 <b>응집소</b>가 맞으면 응집 → 위험. 예) A형 수혜자(β)에게 B형 혈액(응집원 B) → 응집. 원칙은 <b>같은 혈액형</b> 수혈.</li>' +
        '<li><b>혈액형으로 추론</b>: 혈액형이 다르면 <b>배제</b>할 수 있지만, 같아도 같은 혈액형인 사람이 많아 <b>확정할 수 없어요</b>.</li>' +
        '<li>AB형은 ABO식 응집소가 없을 뿐, 병원체에 대한 항체는 만들 수 있어요. 혈액형 검사로 감염병을 알 수는 없어요.</li></ul>',
      missions: [
        {
          title: '수혈 사례 3가지: 예측하고 확인하기',
          goal: '사례 3가지에서 <b>응집할지 먼저 예측</b>하고 🧪 섞어서 확인해, <b>예측이 모두 맞게</b> 하세요.',
          hint: '공여자 적혈구의 응집원(▲ A, ● B)이 수혜자 혈장의 응집소(α는 ▲ 홈, β는 ● 홈)와 결합하면 응집해요. 예측을 바꿔 다시 해도 돼요.',
          setup() { makeTrans(); setScene('use', 'trans'); syncControls(); },
          check: () => S.TR.ok.every(Boolean), hold: 0.5,
          status: () => CASES.map((c, i) => (S.TR.ok[i] ? '✅' : '⬜') + '사례' + (i + 1)).join(' '),
          explain: '사례 1 (A형 ← B형): 수혜자의 β가 공여자의 응집원 B와 결합 → <b>응집</b>. 사례 2 (A형 ← A형): 맞는 응집소가 없음 → 응집 없음. 사례 3 (O형 ← AB형): 수혜자의 α·β가 공여자의 A·B와 결합 → <b>응집</b>. 그래서 원칙은 <b>같은 혈액형</b> 수혈이에요.',
        },
        {
          title: '가상 사건: 혈액형으로 배제하기', manual: true,
          goal: '현장 혈흔이 <b>A형</b>일 때, 여섯 사람 카드를 <b>배제할 수 있는 상자</b>와 <b>배제할 수 없는 상자</b>로 나누고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '혈액형이 A형이 아닌 사람은 현장 혈흔의 주인이 아니에요. A형인 사람은 같은 혈액형이라는 이유만으로는 확정할 수 없어요.',
          setup() { S.SO.reset(); setScene('use', 'case'); },
          check() {
            const sd = S.SO, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => c.zone !== SUS.find((q) => q.id === c.id).ans);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 반대쪽 상자예요: ' + wrong.map((c) => c.short).join(', ') + '. 혈액형이 다르면 배제, 같으면 배제 못 해요.';
            return true;
          },
          status: () => '분류한 카드 ' + S.SO.placed + ' / 6',
          explain: '현장 혈흔이 A형이면 <b>B형·O형·AB형인 사람은 배제</b>할 수 있어요. 하지만 <b>A형인 사람(가, 마)</b>은 A형이 많기 때문에 혈액형이 같다는 것만으로 범인이라고 <b>확정할 수 없어요</b>. 혈액형은 배제에는 쓸 수 있지만 확정의 증거로는 부족해요.',
        },
        {
          type: 'quiz', title: '혈액형과 항체에 대한 오개념',
          goal: '다음 중 <b>옳은 설명</b>은 무엇일까요?',
          setup() { setScene('use', 'trans'); },
          choices: ['AB형은 ABO식 응집소가 없을 뿐, 병원체에 대한 항체는 만들 수 있다', 'AB형은 항체가 전혀 없어서 면역 반응을 못 한다', '혈액형 검사로 감염병에 걸렸는지 알 수 있다', 'A형 혈액은 항A 혈청에서 응집하지 않는다'],
          answer: 0,
          feedback: ['', '혈장에 없는 것은 ABO식 응집소(α, β)뿐이에요. B 림프구는 병원체 항원에 대한 항체를 만들 수 있어요.', '혈액형 검사는 적혈구 표면의 응집원만 확인해요. 감염병은 병원체의 항원이나 핵산을 확인하는 검사가 필요해요.', 'A형 적혈구에는 응집원 A가 있어서 항A 혈청(α)에서 응집해요.'],
          explain: 'AB형에게 없는 것은 <b>ABO식 응집소</b>(α, β)이고, 병원체 항원에 대한 항체는 만들 수 있어요. 혈액형 검사는 응집원 A·B·Rh만 알려 주므로 <b>감염 여부</b>는 알 수 없어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-blood-type', mount: '#game', badge: '혈액형 탐정', homeHref: '../../index.html#hb',
    featureLabels: { ag: '🔑 항원-항체 짝짓기 · 응집', abo: '🅰 ABO 구조 · 혈청 섞기', test: '🧪 모의 검사 키트 · 판정표', use: '💉 수혈 시험 · 사건 추론' },
    onFeatures() { updateCtl(); },
    levels,
  });

  setScene('ag', 'match');
  let lastFree = false;
  function stepAll(dt) {
    if (S.mode === 'ag' && S.sub.ag === 'match') stepMatch(dt);
    if (S.mode === 'ag' && S.sub.ag === 'clump') stepClump(dt);
    if (S.mode === 'abo' && S.sub.abo === 'mix') stepMix(dt);
    if (S.mode === 'test') stepTest(dt);
    if (S.mode === 'use' && S.sub.use === 'trans') stepTrans(dt);
  }
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    stepAll(dt);
    const key = viewKey();
    if (key === 'ag:match') drawMatch(dt); else if (key === 'ag:clump') drawClump(dt);
    else if (key === 'abo:draw') drawDraw(dt); else if (key === 'abo:mix') drawMix(dt);
    else if (key === 'test') drawTest(dt); else if (key === 'use:trans') drawTrans(dt); else drawCase(dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,238,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, AL, CHL, DL, XL, TL, RL, BT, BTS, SAMPLES, CASES, SUS, SERUM, get game() { return game; }, setScene, slotPos, adCorrect, boundPose, testRes, caseClump, aggl, antigensOf,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) stepAll(0.02); },
  };

})();
