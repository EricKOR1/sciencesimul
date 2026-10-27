/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 백신의 종류와 원리
   성취기준 [12생과02-07] 백신의 종류와 작용 원리를 조사하고 질병의 예방 측면에서 백신의 필요성을 인식하여 협력적으로 소통할 수 있다.
   ① 분석: 항체 그래프  ② 모형: 백신 원리  ③ 탐구: 백신 종류  ④ 적용: 집단 면역
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
  const S = { mode: 'gr', sub: { gr: 'plot', vac: '', kind: 'match', herd: 'sim' }, fade: 0, GP: null, GT: null, V: null, KM: null, KP: null, KC: null, H: null, CM: null };
  const SCENES = {
    gr: { label: '📈 항체 농도 그래프', subs: [['plot', '📈 곡선 그리기'], ['table', '📋 비교표']] },
    vac: { label: '💉 백신 접종 시험', subs: null },
    kind: { label: '🔎 백신 종류 조사', subs: [['match', '🔗 구성 연결'], ['pick', '🎯 알맞은 백신'], ['card', '📝 발표 카드']] },
    herd: { label: '🏘 집단 면역', subs: [['sim', '🏘 마을 시뮬'], ['claim', '💬 주장·근거']] },
  };
  const CRV = { 1: { name: '1차 반응', col: '#2563eb', D: AB1, f: ab1f }, 2: { name: '2차 반응', col: '#dc2626', D: AB2, f: ab2f } };
  const INF_U = simInfect(ab1f, 14), INF_V = simInfect(ab2f, 14);
  const symOf = (I, t) => { let n = 0; for (let i = 0; i <= Math.min(I.P.length - 1, Math.round(t / I.dt)); i++) if (I.P[i] > 20) n++; return n * I.dt; };
  const peakOf = (I, t) => { let m = 0; for (let i = 0; i <= Math.min(I.P.length - 1, Math.round(t / I.dt)); i++) m = Math.max(m, I.P[i]); return m; };
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ================= ① 항체 농도 그래프 그리기 ================= */
  const GL = PHONE
    ? { pan: { x: 8, y: 8, w: 464, h: 330 }, pl: { x: 62, y: 30, w: 394, h: 238 }, dat: { x: 8, y: 346, w: 464, h: 286 }, tab: { x: 8, y: 12, w: 464, labW: 128, headH: 46, rowH: 58 }, mini: { x: 8, y: 244, w: 464, h: 388 } }
    : { pan: { x: 16, y: 14, w: 768, h: 418 }, pl: { x: 98, y: 44, w: 650, h: 316 }, dat: { x: 16, y: 440, w: 768, h: 106 }, tab: { x: 16, y: 20, w: 768, labW: 250, headH: 46, rowH: 62 }, mini: { x: 16, y: 292, w: 768, h: 254 } };
  function gPlot(box) {
    return plotBox(box, { x0: 0, x1: 42, y0: 0, y1: 100, xt: [0, 7, 14, 21, 28, 35, 42], yt: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], xl: '항원 접촉 후 시간 (일)', yl: '항체 농도 (상대값)', ylx: PHONE ? 40 : 52 });
  }
  function makeGr() {
    S.GP = { cur: 1, pts: { 1: CRV[1].D.x.map(() => false), 2: CRV[2].D.x.map(() => false) }, draw: { 1: 0, 2: 0 }, msg: '', msgT: 0, flash: null };
    S.GT = new CellTable({
      x: GL.tab.x, y: GL.tab.y, w: GL.tab.w, labW: GL.tab.labW, headH: GL.tab.headH, rowH: GL.tab.rowH,
      cols: [{ label: '1차 반응', opts: ['약 2일', '약 7일', '약 14일'] }, { label: '2차 반응', opts: ['약 2일', '약 7일', '약 14일'] }],
      rows: PHONE ? ['잠복기', '최대 농도', '42일째 농도'] : ['잠복기 (항체가 생기기 시작할 때까지)', '최대 농도 (상대값)', '유지 (42일째 항체 농도)'], ans: [[1, 0], [0, 1], [0, 1]], onChange() { rlast = ''; },
    });
    // 행마다 보기가 달라요
    S.GT.o.rowOpts = [['약 2일', '약 7일', '약 14일'], ['약 10', '약 100', '약 1000'], ['약 2', '약 30', '약 70']];
  }
  const nextPt = (c) => S.GP.pts[c].indexOf(false);
  const plotDone = (c) => S.GP.pts[c].every(Boolean) && S.GP.draw[c] >= 1;
  function plotDown(p) {
    const G = S.GP, P = gPlot(GL.pl), c = G.cur, i = nextPt(c);
    if (i < 0 || !inRect(p.x, p.y, { x: P.b.x - 8, y: P.b.y - 8, w: P.b.w + 16, h: P.b.h + 16 })) return false;
    const D0 = CRV[c].D, tx = P.X(D0.x[i]), ty = P.Y(D0.y[i]);
    const tolX = Math.max(20, P.b.w / 42 * 1.6), tolY = Math.max(11, P.b.h / 100 * 4);
    if (Math.abs(p.x - tx) > tolX) { G.msg = '지금은 ' + D0.x[i] + '일째 점을 찍을 차례예요 (아래 표의 노란 칸).'; G.msgT = 3; G.flash = { x: tx, t: 0 }; Sound.fail(); return false; }
    if (Math.abs(p.y - ty) > tolY) { G.msg = D0.x[i] + '일째 항체 농도는 ' + D0.y[i] + '이에요. 세로 눈금에서 ' + D0.y[i] + '의 높이를 찾아 눌러 보세요 (' + (p.y < ty ? '너무 높아요' : '너무 낮아요') + ').'; G.msgT = 3.5; G.flash = { x: tx, t: 0 }; Sound.fail(); return false; }
    G.pts[c][i] = true; G.msg = ''; Sound.tick(); rlast = '';
    parts.burst(tx, ty, { count: 10, speed: 90, size: 3, colors: [CRV[c].col, '#fff', '#fde047'], gravity: 0 });
    if (G.pts[c].every(Boolean)) { Sound.success(); G.draw[c] = 0.001; }
    syncControls(); return false;
  }
  function stepGr(dt) {
    const G = S.GP; G.msgT = Math.max(0, G.msgT - dt);
    [1, 2].forEach((c) => { if (G.draw[c] > 0 && G.draw[c] < 1) { G.draw[c] = Math.min(1, G.draw[c] + dt / (RM ? 0.05 : 1.4)); if (G.draw[c] >= 1) { rlast = ''; syncControls(); } } });
    if (G.flash) { G.flash.t += dt; if (G.flash.t > 0.8) G.flash = null; }
    S.GT.update(dt);
  }
  function drawCurves(P, G, small) {
    ctx.save(); ctx.beginPath(); ctx.rect(P.b.x, P.b.y - 4, P.b.w + 2, P.b.h + 4); ctx.clip(); ctx.lineJoin = 'round';
    [1, 2].forEach((c) => {
      const k = G.draw[c]; if (k <= 0) return; const f = CRV[c].f;
      ctx.strokeStyle = CRV[c].col; ctx.lineWidth = small ? 3 : 3.8; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const d = 42 * k * i / 120, x = P.X(d), y = P.Y(f(d)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    });
    ctx.restore();
    [1, 2].forEach((c) => CRV[c].D.x.forEach((dx, i) => { if (!G.pts[c][i]) return; D.sphere(P.X(dx), P.Y(CRV[c].D.y[i]), small ? 4.5 : 6, CRV[c].col, { gloss: true, outline: '#fff', outlineWidth: 1.8 }); }));
  }
  function drawGrPlot(dt) {
    bgFill('#eef2fb', '#e2e8f4');
    const G = S.GP, pn = GL.pan; panel(pn.x, pn.y, pn.w, pn.h, 16);
    const P = gPlot(GL.pl); P.drawAxes();
    // 목표 열 표시
    const c = G.cur, i = nextPt(c);
    if (i >= 0) {
      const D0 = CRV[c].D, tx = P.X(D0.x[i]);
      ctx.fillStyle = C.rgba(CRV[c].col, 0.1); ctx.fillRect(tx - 14, P.b.y, 28, P.b.h);
      D.dashedLine(tx, P.b.y, tx, P.b.y + P.b.h, { color: CRV[c].col, width: 1.6, dash: [5, 5] });
      T(tx, P.b.y + 14, D0.x[i] + '일', 12.5, CRV[c].col, 'center', 900);
    }
    if (G.flash && !RM) { ctx.fillStyle = C.rgba('#ef4444', 0.25 * (1 - G.flash.t / 0.8)); ctx.fillRect(G.flash.x - 16, P.b.y, 32, P.b.h); }
    D.dashedLine(P.X(42), P.b.y, P.X(42), P.b.y + P.b.h, { color: '#94a3b8', width: 1.6 });
    T(P.X(42) - 4, P.Y(62), '2차: 재접촉(42일)', 11.5, '#64748b', 'right', 700);
    drawCurves(P, G, false);
    // 범례
    const lw = PHONE ? 192 : 232, lx = P.b.x + P.b.w - lw - 4, ly = P.b.y + 20;
    D.roundRect(lx - 6, ly - 14, lw, 54, 8); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    [1, 2].forEach((k, q) => { ctx.fillStyle = CRV[k].col; ctx.fillRect(lx, ly + q * 22 - 4, 18, 5); T(lx + 24, ly + q * 22 + 2, CRV[k].name + (k === 2 ? ' (재접촉일을 0일로)' : ' (첫 접촉)'), PHONE ? 11 : 12.5, '#26324a', 'left', 800); });
    if (G.msgT > 0) { D.label(pn.x + pn.w / 2, pn.y + pn.h - 14, G.msg, { bg: '#b91c1c', size: PHONE ? 11.5 : 13, pad: 10 }); }
    // 자료 표
    const dt2 = GL.dat; panel(dt2.x, dt2.y, dt2.w, dt2.h, 14);
    const nx = nextPt(G.cur);
    if (!PHONE) {
      [1, 2].forEach((k, row) => {
        const y = dt2.y + 30 + row * 36; T(dt2.x + 14, y + 5, CRV[k].name, 14, CRV[k].col, 'left', 900);
        CRV[k].D.x.forEach((dx, j) => { const x = dt2.x + 110 + j * 92, done = G.pts[k][j], now = k === G.cur && nextPt(k) === j; D.roundRect(x, y - 14, 86, 28, 14); ctx.fillStyle = done ? '#dcfce7' : now ? '#fef9c3' : '#f3f4f6'; ctx.fill(); ctx.strokeStyle = done ? '#34b36a' : now ? '#f59e0b' : '#d1d5db'; ctx.lineWidth = now ? 2.5 : 1.5; ctx.stroke(); T(x + 43, y + 5, dx + '일 · ' + CRV[k].D.y[j], 13, done ? '#166534' : '#374151', 'center', 800); });
      });
    } else {
      let yy = dt2.y + 28; T(dt2.x + 14, yy, '표의 값을 그래프에 점으로 찍어요', 14, '#26324a', 'left', 900);
      [1, 2].forEach((k) => {
        yy += 24; T(dt2.x + 14, yy, CRV[k].name, 13.5, CRV[k].col, 'left', 900); yy += 6;
        CRV[k].D.x.forEach((dx, j) => { const x = dt2.x + 14 + (j % 4) * 112, y = yy + Math.floor(j / 4) * 32, done = G.pts[k][j], now = k === G.cur && nextPt(k) === j; D.roundRect(x, y, 106, 26, 13); ctx.fillStyle = done ? '#dcfce7' : now ? '#fef9c3' : '#f3f4f6'; ctx.fill(); ctx.strokeStyle = done ? '#34b36a' : now ? '#f59e0b' : '#d1d5db'; ctx.lineWidth = now ? 2.5 : 1.5; ctx.stroke(); T(x + 53, y + 18, dx + '일 · ' + CRV[k].D.y[j], 12.5, done ? '#166534' : '#374151', 'center', 800); });
        yy += 70;
      });
      textBlock(dt2.x + 14, yy + 6, dt2.w - 28, nx >= 0 ? '다음 점: ' + CRV[G.cur].name + ' ' + CRV[G.cur].D.x[nx] + '일째, 농도 ' + CRV[G.cur].D.y[nx] : '이 곡선을 모두 그렸어요!', 13.5, '#92400e', 19, 800);
    }
    if (!PHONE) T(dt2.x + dt2.w - 14, dt2.y + dt2.h - 10, nx >= 0 ? '다음 점: ' + CRV[G.cur].name + ' ' + CRV[G.cur].D.x[nx] + '일째, 농도 ' + CRV[G.cur].D.y[nx] + ' → 그래프에서 그 높이를 눌러요' : '이 곡선을 모두 그렸어요! 다른 곡선도 그려 보세요.', 13.5, '#92400e', 'right', 800);
  }
  function drawGrTable(dt) {
    bgFill('#eef2fb', '#e2e8f4');
    const tb = S.GT;
    // 행마다 다른 보기를 쓰기 위해 열 보기를 바꿔 그려요
    const rowOpts = tb.o.rowOpts;
    const orig = tb.o.cols.map((c) => c.opts);
    // 표 그리기: 칸마다 보기 문구를 행별로 바꿔서 표시
    tb.o.cols.forEach((c) => { c.opts = ['', '', '']; });
    const val = tb.val;
    tb.draw();
    tb.o.cols.forEach((c, i) => { c.opts = orig[i]; });
    // 칸 안 글자를 직접 쓰기
    for (let r = 0; r < tb.nr; r++) for (let c = 0; c < tb.nc; c++) {
      const v = val[r][c]; if (v < 0) continue; const cr = tb.cellRect(r, c);
      const sx = tb.shk[r][c] > 0 && !RM ? Math.sin(clock * 60) * 3 * tb.shk[r][c] : 0;
      TF(cr.x + cr.w / 2 + sx, cr.y + cr.h / 2 + 5, rowOpts[r][v], cr.w - 16, 14, 10, '#26324a', 'center', 800);
    }
    const G = S.GP, mn = GL.mini; panel(mn.x, mn.y, mn.w, mn.h, 14);
    T(mn.x + 14, mn.y + 22, '내가 그린 그래프', 14, '#26324a', 'left', 900);
    const P = gPlot({ x: mn.x + (PHONE ? 54 : 90), y: mn.y + 34, w: mn.w - (PHONE ? 70 : 120), h: mn.h - (PHONE ? 90 : 88) }); P.drawAxes(); drawCurves(P, G, true);
    if (!(G.draw[1] > 0 || G.draw[2] > 0)) T(P.b.x + P.b.w / 2, P.b.y + P.b.h / 2, '(앞의 곡선 그리기를 마치면 곡선이 보여요)', 13, '#6b7280', 'center', 700);
  }
  const grTabPT = {
    down(p) {
      const tb = S.GT;
      for (let r = 0; r < tb.nr; r++) for (let c = 0; c < tb.nc; c++) if (inRect(p.x, p.y, tb.cellRect(r, c))) { tb.val[r][c] = tb.val[r][c] + 1 >= 3 ? 0 : tb.val[r][c] + 1; tb.bad[r][c] = false; Sound.click(); rlast = ''; return false; }
      return false;
    },
    hover(p) { return S.GT.hover(p); },
  };

  /* ================= ② 백신 원리: 접종 후 감염 시험 ================= */
  const VL = PHONE
    ? { L: { x: 8, y: 8, w: 228, h: 262 }, R: { x: 244, y: 8, w: 228, h: 262 }, cx: 114, cy: 150, cr: 70, gr: { x: 8, y: 278, w: 464, h: 354 }, pl: { x: 62, y: 300, w: 394, h: 218 } }
    : { L: { x: 16, y: 14, w: 380, h: 268 }, R: { x: 404, y: 14, w: 380, h: 268 }, cx: 190, cy: 158, cr: 86, gr: { x: 16, y: 290, w: 768, h: 256 }, pl: { x: 96, y: 306, w: 650, h: 178 } };
  function makeVac() { const rg = mulberry(9); S.V = { vt: -1, vacDone: false, ct: -1, chalDone: false, pp: Array.from({ length: 16 }, () => ({ a: rg() * TAU, d: Math.sqrt(rg()), ph: rg() * TAU })), ab: Array.from({ length: 40 }, () => ({ a: rg() * TAU, d: Math.sqrt(rg()), ph: rg() * TAU })) }; rlast = ''; }
  const VACT = 6, CHALT = 7; // 접종 장면 6초 = 28일, 감염 시험 7초 = 14일
  function vacStart() { const V = S.V; if (V.vacDone || (V.vt >= 0 && V.vt < VACT)) return; V.vt = 0; Sound.click(); rlast = ''; syncControls(); }
  function chalStart() { const V = S.V; if (!V.vacDone || (V.ct >= 0 && V.ct < CHALT) || V.chalDone) return; V.ct = 0; Sound.click(); rlast = ''; syncControls(); }
  function stepVac(dt) {
    const V = S.V;
    if (V.vt >= 0 && V.vt < VACT) { V.vt += dt * (RM ? 8 : 1); if (V.vt >= VACT) { V.vt = VACT; V.vacDone = true; Sound.success(); rlast = ''; syncControls(); } }
    if (V.ct >= 0 && V.ct < CHALT) { V.ct += dt * (RM ? 8 : 1); if (V.ct >= CHALT) { V.ct = CHALT; V.chalDone = true; Sound.success(); rlast = ''; syncControls(); } }
  }
  const vDay = (V) => V.ct * 2;               // 감염 후 일수
  const vacDay = (V) => (V.vt / VACT) * 28;    // 접종 후 일수
  function bloodView(cx, cy, R, o) {
    // o: {P, A, kind('tri'), naive, mem, plasmaN, tag}
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R); g.addColorStop(0, '#fff3ef'); g.addColorStop(1, '#ffd9d3'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const V = S.V;
    RBCS.slice(0, 9).forEach((q) => { drawRBC(cx + (q.u - 0.5) * R * 1.8, cy + (q.v - 0.5) * R * 1.8, R * 0.09 * q.s, q.r + clock * 0.2, { alpha: 0.4 }); });
    const rl = R * 0.2;
    for (let i = 0; i < (o.mem || 0); i++) drawCell('mem', cx - R * 0.52 + i * rl * 1.6, cy + R * 0.58, rl * 0.8, { rec: { kind: 'tri', n: 3 }, glow: o.memGlow || 0, nolabel: false });
    if (o.naive) drawCell('B', cx - R * 0.5, cy - R * 0.5, rl, { rec: { kind: 'tri', n: 3 }, glow: o.naiveGlow || 0 });
    for (let i = 0; i < (o.plasma || 0); i++) drawCell('plasma', cx - R * 0.1 + i * rl * 1.5, cy - R * 0.62, rl * 0.7, { nolabel: true });
    const nP = o.P < 0.3 ? 0 : Math.max(1, Math.round(o.P / 100 * V.pp.length));
    for (let i = 0; i < nP; i++) { const q = V.pp[i], x = cx + Math.cos(q.a + Math.sin(clock * 0.5 + q.ph) * 0.1) * q.d * R * 0.7 + R * 0.12, y = cy + Math.sin(q.a) * q.d * R * 0.7; drawBact(x, y, R * 0.085, q.ph, '#16a34a', { len: 1.4, dna: false }); drawAg('tri', x + R * 0.1, y - R * 0.06, R * 0.04, 0); }
    const nA = Math.round((o.A || 0) / 100 * V.ab.length);
    for (let i = 0; i < nA; i++) { const q = V.ab[i], x = cx + Math.cos(q.a + Math.sin(clock * 0.4 + q.ph) * 0.1) * q.d * R * 0.82, y = cy + Math.sin(q.a) * q.d * R * 0.82; drawAb(x, y + 5, R * 0.1, q.ph + clock * 0.2, 'tri', { col: '#334155' }); }
    if (o.antigens) for (let i = 0; i < o.antigens.n; i++) { const k = o.antigens.k, x = cx + lerp(-R * 0.9, -R * 0.4, (clock * 0.4 + i * 0.23) % 1) * 1, y = cy - R * 0.2 + Math.sin(i * 2 + clock) * R * 0.25; ctx.save(); ctx.globalAlpha = o.antigens.a; drawAg('tri', x, y, R * 0.07, clock + i); ctx.restore(); }
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  }
  function drawVac(dt) {
    bgFill('#eef6f2', '#e1ede6');
    const V = S.V, L = VL.L, R = VL.R;
    panel(L.x, L.y, L.w, L.h, 16); panel(R.x, R.y, R.w, R.h, 16);
    const chal = V.ct >= 0, cd = chal ? vDay(V) : 0, vd = V.vt >= 0 ? vacDay(V) : 0;
    const Pu = chal ? INF_U.at(cd) : 0, Pv = chal ? INF_V.at(cd) : 0;
    T(L.x + L.w / 2, L.y + 26, '미접종자', PHONE ? 15 : 17, '#7f1d1d', 'center', 900);
    T(R.x + R.w / 2, R.y + 26, V.vacDone || V.vt >= 0 ? '접종자 (백신 접종함)' : '접종자 (아직 안 맞음)', PHONE ? 14 : 16, '#14532d', 'center', 900);
    const cxL = L.x + L.w / 2, cxR = R.x + R.w / 2, cy = L.y + (PHONE ? 148 : 156), cr = PHONE ? 62 : 80;
    bloodView(cxL, cy, cr, { P: Pu, A: chal ? ab1f(cd) : 0, naive: true, naiveGlow: chal && ab1f(cd) >= 1 ? 0.6 + 0.3 * Math.sin(clock * 5) : 0, plasma: chal ? Math.round(ab1f(cd) / 100 * 6) : 0 });
    // 접종자: 접종 중이면 1차 반응, 시험 중이면 2차 반응
    let A2 = 0, mem = 0, pl = 0, ant = null, naiveGlow = 0;
    if (V.vt >= 0 && !chal) { A2 = ab1f(vd); mem = vd >= 12 ? 3 : (vd >= 8 ? 1 : 0); pl = Math.round(A2 / 100 * 6); naiveGlow = vd >= 4 && vd < 16 ? 0.6 + 0.3 * Math.sin(clock * 5) : 0; if (vd < 3) ant = { n: 6, k: 'tri', a: 1 }; }
    if (chal) { A2 = ab2f(cd); mem = 3; pl = Math.round(A2 / 100 * 6); }
    bloodView(cxR, cy, cr, { P: Pv, A: A2, naive: !chal && !(V.vacDone), mem, memGlow: chal && cd < 4 ? 0.5 + 0.4 * Math.sin(clock * 6) : 0, plasma: pl, antigens: ant, naiveGlow });
    // 주사기
    if (V.vt >= 0 && V.vt < 1.6) { const k = smooth(V.vt / 0.8), sx = lerp(R.x + R.w - 20, cxR + cr * 0.9, k), sy = lerp(R.y + 50, cy - cr * 0.3, k); ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.7); T(0, 8, '💉', PHONE ? 30 : 38, '#000', 'center', 600); ctx.restore(); }
    // 안내 이름표
    const msgL = chal ? '병원체 ' + Math.round(Pu) + ' (상대값)' : '병원체 없음', msgR = V.vt >= 0 && !chal ? '접종 후 ' + Math.round(vd) + '일' : chal ? '병원체 ' + (Math.round(Pv * 10) / 10) + ' (상대값)' : '';
    T(cxL, L.y + 48, msgL, PHONE ? 12.5 : 14.5, '#374151', 'center', 800); T(cxR, L.y + 48, msgR, PHONE ? 12.5 : 14.5, '#374151', 'center', 800);
    if (V.vt >= 0 && !chal) { D.label(cxR, L.y + L.h - 18, vd < 4 ? '항원만 들어가요 (병원체 아님)' : vd < 12 ? '림프구가 활성화돼요' : '기억 세포가 생겼어요 · 병은 안 걸려요', { bg: '#15803d', size: PHONE ? 11.5 : 13, pad: 8 }); }
    if (chal && V.chalDone) { D.label(cxL, L.y + L.h - 18, '증상 ' + r1(symOf(INF_U, 14)) + '일', { bg: '#b91c1c', size: PHONE ? 12 : 14, pad: 9 }); D.label(cxR, R.y + R.h - 18, symOf(INF_V, 14) < 0.05 ? '증상 없음' : '증상 ' + r1(symOf(INF_V, 14)) + '일', { bg: '#15803d', size: PHONE ? 12 : 14, pad: 9 }); }
    else if (chal) { D.label(cxL, L.y + L.h - 18, '감염 후 ' + Math.floor(cd * 10) / 10 + '일', { bg: '#475569', size: PHONE ? 11.5 : 13, pad: 8 }); }
    // 그래프
    const Gr = VL.gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 16);
    const P = plotBox(VL.pl, { x0: 0, x1: 14, y0: 0, y1: 100, xt: [0, 2, 4, 6, 8, 10, 12, 14], yt: [0, 20, 40, 60, 80, 100], xl: '병원체 침입(감염) 후 시간 (일)', yl: '병원체 수 (상대값)', ylx: PHONE ? 42 : 52 });
    P.drawAxes();
    D.dashedLine(P.b.x, P.Y(20), P.b.x + P.b.w, P.Y(20), { color: '#f59e0b', width: 2 }); T(P.b.x + P.b.w - 4, P.Y(20) - 6, '증상이 나타나는 수준 (20)', PHONE ? 11 : 12.5, '#b45309', 'right', 800);
    if (chal) {
      ctx.save(); ctx.beginPath(); ctx.rect(P.b.x, P.b.y - 4, P.b.w + 2, P.b.h + 4); ctx.lineJoin = 'round'; ctx.clip();
      [[INF_U, '#dc2626', Pu], [INF_V, '#16a34a', Pv]].forEach((q) => {
        ctx.strokeStyle = q[1]; ctx.lineWidth = 3.6; ctx.beginPath(); const n = Math.max(2, Math.ceil(cd * 20));
        for (let i = 0; i <= n; i++) { const t = cd * i / n, x = P.X(t), y = P.Y(q[0].at(t)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      });
      ctx.restore();
      D.sphere(P.X(cd), P.Y(Pu), 5.5, '#dc2626', { gloss: true, outline: '#fff', outlineWidth: 2 }); D.sphere(P.X(cd), P.Y(Pv) , 5.5, '#16a34a', { gloss: true, outline: '#fff', outlineWidth: 2 });
    }
    const lx = P.b.x + 12, ly = P.b.y + 16; D.roundRect(lx - 6, ly - 13, PHONE ? 150 : 170, 50, 8); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    [['미접종자', '#dc2626'], ['접종자', '#16a34a']].forEach((q, i) => { ctx.fillStyle = q[1]; ctx.fillRect(lx, ly + i * 20 - 4, 18, 5); T(lx + 24, ly + i * 20 + 2, q[0], PHONE ? 12 : 13, '#26324a', 'left', 800); });
    if (!PHONE) T(Gr.x + Gr.w / 2, Gr.y + Gr.h - 8, chal ? (V.chalDone ? '미접종자는 병원체가 크게 늘어 증상이 나타났지만, 접종자는 거의 늘지 못하고 사라졌어요.' : '병원체 수 곡선이 어떻게 달라지는지 보세요.') : (V.vacDone ? '② 병원체 침입 시험을 눌러요.' : '① 백신 맞기를 눌러요. 백신에는 병원체가 아니라 항원만 들어 있어요.'), 13.5, '#374151', 'center', 800);
    else textBlock(Gr.x + 14, Gr.y + Gr.h - 36, Gr.w - 28, chal ? (V.chalDone ? '미접종자는 증상이 나타났지만, 접종자는 병원체가 거의 늘지 못했어요.' : '곡선을 보세요.') : (V.vacDone ? '② 병원체 침입 시험을 눌러요.' : '① 백신 맞기를 눌러요. 백신에는 항원만 들어 있어요.'), 13, '#374151', 18, 800);
  }
  const RBCS = (() => { const rg = mulberry(99), o = []; for (let i = 0; i < 16; i++) o.push({ u: rg(), v: rg(), s: 0.5 + rg(), r: rg() * TAU, sp: 0.01 + rg() * 0.02 }); return o; })();

  /* ================= ③ 백신 종류 조사 (짝짓기 3가지) ================= */
  const VT = [
    { id: 'live', label: '약독화 생백신', desc: '독성을 약하게 만든 살아 있는 병원체', ex: '예) 홍역·풍진·BCG', note: '면역 반응이 강하지만 면역이 약한 사람은 주의' },
    { id: 'inact', label: '불활화(사) 백신', desc: '열이나 약품으로 죽인 병원체 전체', ex: '예) 일본 뇌염·불활화 독감', note: '안전하지만 추가 접종이 필요한 경우가 많아요' },
    { id: 'subunit', label: '단백질(재조합) 소단위 백신', desc: '병원체의 항원 단백질 일부만 사용', ex: '예) B형 간염', note: '병원체 전체를 쓰지 않아 비교적 안전해요' },
    { id: 'toxoid', label: '톡소이드 백신', desc: '병원체가 내놓는 독소의 독성을 없앤 것', ex: '예) 파상풍·디프테리아', note: '독소가 병의 원인일 때 써요' },
    { id: 'mrna', label: '핵산(mRNA) 백신', desc: '항원 단백질을 만드는 설계도(mRNA)를 전달', ex: '우리 세포가 항원 단백질을 만들어요', note: '유전자 정보만 알면 빠르게 설계할 수 있어요' },
    { id: 'vector', label: '바이러스 벡터 백신', desc: '무해한 바이러스에 항원 유전자를 실어 전달', ex: '우리 세포가 항원 단백질을 만들어요', note: '운반체 바이러스를 이용해요' },
  ];
  const SCN = [
    { id: 'sc1', text: '병의 원인이 병원체가 아니라 병원체가 내놓는 독소예요 (예: 파상풍).', ans: 'toxoid' },
    { id: 'sc2', text: '새 감염병이 퍼지는데 병원체의 유전자 서열을 알아냈어요. 항원 단백질의 설계도를 빠르게 만들어야 해요.', ans: 'mrna' },
    { id: 'sc3', text: '병원체 전체 대신 항원 단백질 일부만 만들어 접종하고 싶어요 (예: B형 간염).', ans: 'subunit' },
  ];
  const PCARD = [
    { id: 'pc1', label: '항원 단백질의 설계도인 mRNA를 만들어 지질 입자에 담아요', ans: 'make' },
    { id: 'pc2', label: '접종받은 사람의 세포가 mRNA로 항원을 만들고, 면역 반응이 일어나 기억 세포가 생겨요', ans: 'work' },
    { id: 'pc3', label: 'mRNA는 쉽게 분해되어 보관·운반 온도를 잘 관리해야 해요', ans: 'note' },
    { id: 'pd1', label: '병원체를 배양한 뒤 열이나 약품으로 죽여서 사용해요', ans: null },
    { id: 'pd2', label: '접종받은 사람의 DNA가 바뀌어 평생 항원을 만들어요', ans: null },
    { id: 'pd3', label: '항체를 직접 만들어 넣어서 바로 면역이 생기고 기억 세포는 생기지 않아요', ans: null },
  ];
  const shuf = (arr, seed) => { const rg = mulberry(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rg() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function makeKind() {
    const vtCards = (order) => order.map((id) => { const v = VT.find((q) => q.id === id); return { id: v.id, label: v.label, col: '#7c3aed', wrap: true, wsize: PHONE ? 13 : 14 }; });
    // 구성 연결
    S.KM = new Matcher({
      cards: vtCards(shuf(VT.map((v) => v.id), 3)),
      slots: VT.map((v, i) => {
        const y = PHONE ? 8 + i * 72 : 14 + i * 70, w = PHONE ? 464 : 540, h = PHONE ? 66 : 64;
        return { id: v.id, x: PHONE ? 8 : 16, y, w, h, col: '#7c3aed', v, card: PHONE ? { x: 266, y: y + 8, w: 198, h: 50 } : { x: 16 + 540 - 188, y: y + 6, w: 178, h: 52 } };
      }),
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 454 + Math.floor(i / 2) * 58 }) : (i) => ({ x: 574, y: 20 + i * 70 }),
      cw: PHONE ? 228 : 210, ch: PHONE ? 52 : 54, onChange() { rlast = ''; },
    });
    S.KM.slots.forEach((s) => { s.draw = (q) => { const wd = PHONE ? 246 : 330; textBlock(q.x + 12, q.y + 24, wd - 12, q.v.desc, PHONE ? 13 : 14, '#26324a', PHONE ? 17 : 19, 800); T(q.x + 12, q.y + q.h - 10, q.v.ex, PHONE ? 11.5 : 12.5, '#6d28d9', 'left', 700); }; });
    // 알맞은 백신 고르기
    S.KP = new Matcher({
      cards: vtCards(shuf(VT.map((v) => v.id), 11)),
      slots: SCN.map((c, i) => {
        const y = PHONE ? 8 + i * 118 : 14 + i * 100, w = PHONE ? 464 : 768, h = PHONE ? 112 : 92;
        return { id: c.id, x: PHONE ? 8 : 16, y, w, h, col: '#0891b2', c, card: PHONE ? { x: 120, y: y + 56, w: 240, h: 48 } : { x: 16 + 768 - 270, y: y + 20, w: 258, h: 52 } };
      }),
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 372 + Math.floor(i / 2) * 58 }) : (i) => ({ x: 16 + (i % 3) * 258, y: 328 + Math.floor(i / 3) * 64 }),
      cw: PHONE ? 228 : 250, ch: PHONE ? 52 : 54, onChange() { rlast = ''; },
    });
    S.KP.slots.forEach((s) => { s.draw = (q) => { textBlock(q.x + 14, q.y + 26, PHONE ? q.w - 28 : 440, '상황 ' + (SCN.indexOf(q.c) + 1) + ') ' + q.c.text, PHONE ? 13 : 14.5, '#26324a', PHONE ? 18 : 20, 800); }; });
    // 발표 카드
    const SL = [{ id: 'make', name: '만드는 방법' }, { id: 'work', name: '작용 원리' }, { id: 'note', name: '유의점' }];
    S.KC = new Matcher({
      cards: shuf(PCARD, 5).map((c) => ({ id: c.id, label: c.label, col: '#be185d', wrap: true, wsize: PHONE ? 12.5 : 13.5 })),
      slots: SL.map((s, i) => {
        const y = PHONE ? 52 + i * 98 : 86 + i * 84, w = PHONE ? 464 : 768, h = PHONE ? 92 : 78;
        return { id: s.id, x: PHONE ? 8 : 16, y, w, h, col: '#be185d', name: s.name, card: PHONE ? { x: 16, y: y + 26, w: 448, h: 60 } : { x: 16 + 140, y: y + 8, w: 608, h: 62 } };
      }),
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 356 + Math.floor(i / 2) * 76 }) : (i) => ({ x: 16 + (i % 2) * 388, y: 340 + Math.floor(i / 2) * 64 }),
      cw: PHONE ? 228 : 380, ch: PHONE ? 70 : 58, onChange() { rlast = ''; },
    });
    S.KC.slots.forEach((s) => { s.draw = (q) => { T(q.x + 14, q.y + (PHONE ? 20 : 34), q.name, PHONE ? 14 : 16, '#9d174d', 'left', 900); }; });
  }
  function drawKind(dt) {
    bgFill('#f3eefa', '#e6def2');
    const sub = S.sub.kind, M = sub === 'match' ? S.KM : sub === 'pick' ? S.KP : S.KC; M.update(dt); M.drawSlots();
    if (sub === 'match') {
      if (!PHONE) { T(678, 14 + 6 * 70 + 16, '← 카드를 끌어서 왼쪽 설명 칸에 넣어요', 13, '#5b21b6', 'center', 800); panel(16, 14 + 6 * 70 + 4, 540, VH - (14 + 6 * 70 + 4) - 8, 12); TF(286, 14 + 6 * 70 + 34, '공통 원리: 병원체 없이 항원을 먼저 만나 기억 세포를 만들어 둬요.', 510, 14, 11, '#26324a', 'center', 800); }
      else TF(240, 444, '↓ 백신 이름 카드를 끌어서 위 설명 칸에 넣어요', 440, 14, 11, '#5b21b6', 'center', 800);
    } else if (sub === 'pick') {
      T(PHONE ? 240 : 400, PHONE ? 364 : 322, '↓ 백신 이름 카드 6장 중에서 골라요', 13.5, '#155e75', 'center', 800);
    } else {
      const hp = PHONE ? { x: 8, y: 8, w: 464, h: 38 } : { x: 16, y: 14, w: 768, h: 62 }; panel(hp.x, hp.y, hp.w, hp.h, 12);
      T(hp.x + 14, hp.y + (PHONE ? 25 : 28), '📝 조사 발표 카드 · 핵산(mRNA) 백신', PHONE ? 14 : 16, '#9d174d', 'left', 900);
      if (!PHONE) T(hp.x + 14, hp.y + 50, '전문가 영상에서 들은 내용을 세 칸에 정리해요. 알맞은 문장 카드 3장을 골라요 (나머지 3장은 틀린 내용).', 13, '#4b5563', 'left', 700);
    }
    M.drawCards();
  }

  /* ================= ④ 집단 면역 (가상 마을 100명) ================= */
  const VULN = [7, 23, 48, 66, 91], VISIT = [44, 54, 25, 19];
  const HL = PHONE
    ? { g: { x: 8, y: 8, w: 464, h: 394 }, ox: 87, oy: 54, sp: 34, r: 12.5, info: { x: 8, y: 410, w: 464, h: 222 } }
    : { g: { x: 16, y: 14, w: 440, h: 424 }, ox: 16 + 62, oy: 14 + 62, sp: 35, r: 13, info: { x: 464, y: 14, w: 320, h: 424 }, cap: { x: 16, y: 446, w: 768, h: 100 } };
  const MAXP = 95;
  function makeHerd() {
    const rg = mulberry(10), contacts = [];
    for (let i = 0; i < 100; i++) { const s = new Set(); while (s.size < 4) { const j = Math.floor(rg() * 100); if (j !== i) s.add(j); } contacts.push([...s]); }
    const vac = []; for (let i = 0; i < 100; i++) if (VULN.indexOf(i) < 0) vac.push(i);
    for (let i = vac.length - 1; i > 0; i--) { const j = Math.floor(rg() * (i + 1)); [vac[i], vac[j]] = [vac[j], vac[i]]; }
    S.H = { contacts, vac, p: 0, t: -1, run: false, ran: {}, res: null, infShown: 0, flashes: [] };
    herdCompute();
  }
  const nVac = (p) => p, nProt = (p) => Math.round(0.9 * p);
  const reffOf = (p) => 4 * (1 - 0.9 * p / 100);
  function herdCompute() {
    const H = S.H, p = H.p, prot = new Set(H.vac.slice(0, nProt(p))), vaccd = new Set(H.vac.slice(0, nVac(p)));
    const gen = new Array(100).fill(-1), par = new Array(100).fill(-1), blocks = [];
    let cur = []; VISIT.forEach((c) => { if (!prot.has(c)) { if (gen[c] < 0) { gen[c] = 1; par[c] = -2; cur.push(c); } } else blocks.push({ g: 1, to: c, from: -2 }); });
    let g = 1;
    while (cur.length) { const nx = []; for (const i of cur) for (const c of H.contacts[i]) { if (gen[c] >= 0) continue; if (prot.has(c)) { if (!blocks.some((b) => b.to === c)) blocks.push({ g: g + 1, to: c, from: i }); continue; } gen[c] = g + 1; par[c] = i; nx.push(c); } cur = nx; g++; }
    H.res = { gen, par, prot, vaccd, blocks, total: gen.filter((x) => x >= 0).length, vul: VULN.filter((v) => gen[v] >= 0).length, maxg: Math.max(...gen) };
  }
  function herdSetP(p) { const H = S.H; p = clamp(Math.round(p), 0, MAXP); if (p === H.p) return; if (H.run) return; H.p = p; H.t = -1; herdCompute(); H.flashes = []; rlast = ''; syncControls(); }
  function herdRun() { const H = S.H; if (H.run) return; H.t = 0; H.run = true; H.flashes = []; Sound.click(); rlast = ''; syncControls(); }
  const GENT = 0.85;
  function stepHerd(dt) {
    const H = S.H; if (!H.run) return;
    const was = H.t; H.t += dt * (RM ? 4 : 1);
    const R = H.res, gNow = Math.floor(H.t / GENT) + 1, gWas = Math.floor(was / GENT) + 1;
    if (gNow !== gWas || was === 0) {
      for (let i = 0; i < 100; i++) if (R.gen[i] === gNow && !RM) { const q = hp(i), f = R.par[i]; H.flashes.push({ x: q.x, y: q.y, fx: f >= 0 ? hp(f).x : HL.g.x + 20, fy: f >= 0 ? hp(f).y : HL.g.y + 18, t: 0, kind: 'inf' }); }
      R.blocks.filter((b) => b.g === gNow).forEach((b) => { const q = hp(b.to); H.flashes.push({ x: q.x, y: q.y, t: 0, kind: 'blk' }); });
    }
    H.flashes.forEach((f) => { f.t += dt; }); H.flashes = H.flashes.filter((f) => f.t < 1.1);
    if (H.t >= (R.maxg + 1.2) * GENT) { H.run = false; H.ran[H.p] = true; Sound.success(); rlast = ''; syncControls(); if (R.total <= 12) parts.burst(HL.g.x + HL.g.w / 2, HL.g.y + HL.g.h / 2, { count: 24, speed: 210, size: 4 }); }
  }
  const hp = (i) => ({ x: HL.ox + (i % 10) * HL.sp, y: HL.oy + Math.floor(i / 10) * HL.sp });
  const infAt = (H, i) => H.res.gen[i] >= 0 && H.t >= 0 && (H.t >= (H.res.gen[i] - 1) * GENT + 0.5);
  const herdShown = (H) => { let n = 0; for (let i = 0; i < 100; i++) if (infAt(H, i) || (!H.run && H.t >= 0 && H.res.gen[i] >= 0)) n++; return n; };
  function drawHerd(dt) {
    bgFill('#eef6f2', '#e1ede6');
    const H = S.H, R = H.res, g = HL.g, p = H.p, reff = reffOf(p);
    panel(g.x, g.y, g.w, g.h, 16);
    T(g.x + 14, g.y + 26, '가상 마을 (100명)', PHONE ? 14 : 16, '#26324a', 'left', 900);
    // 마을 밖에서 온 감염자
    const vx = g.x + g.w - (PHONE ? 70 : 90), vy = g.y + 26;
    T(vx - 36, vy + 5, '🚶', 22, '#000', 'center', 600); T(vx + 8, vy + 5, '외부 감염자', PHONE ? 12 : 13, '#b91c1c', 'left', 800);
    const shownAt = (i) => (H.t < 0 ? false : H.run ? infAt(H, i) : R.gen[i] >= 0);
    for (let i = 0; i < 100; i++) {
      const q = hp(i), inf = shownAt(i), prot = R.prot.has(i), vac = R.vaccd.has(i), vul = VULN.indexOf(i) >= 0, vis = VISIT.indexOf(i) >= 0;
      if (vul) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, HL.r + 4, 0, TAU); ctx.stroke(); ctx.restore(); }
      let fill = '#cbd5e1', rim = '#94a3b8';
      if (prot) { fill = '#86efac'; rim = '#16a34a'; } else if (vac) { fill = '#d9f99d'; rim = '#65a30d'; }
      if (inf) { fill = '#f87171'; rim = '#b91c1c'; }
      D.sphere(q.x, q.y, HL.r, fill, { gloss: true, outline: rim, outlineWidth: 2 });
      if (prot && !inf) T(q.x, q.y + 5, '🛡', HL.r * 1.05, '#000', 'center', 600);
      else if (inf) T(q.x, q.y + 5, '😷', HL.r * 1.05, '#000', 'center', 600);
      else if (vul) T(q.x, q.y + 5, '🍼', HL.r * 1.0, '#000', 'center', 600);
      if (vis && H.t >= 0) { ctx.save(); ctx.strokeStyle = 'rgba(185,28,28,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(vx - 36, vy + 12); ctx.lineTo(q.x, q.y - HL.r); ctx.stroke(); ctx.restore(); }
    }
    H.flashes.forEach((f) => {
      const k = f.t / 1.1;
      if (f.kind === 'inf') { ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.fx, f.fy); ctx.lineTo(lerp(f.fx, f.x, Math.min(1, k * 3)), lerp(f.fy, f.y, Math.min(1, k * 3))); ctx.stroke(); ctx.beginPath(); ctx.arc(f.x, f.y, HL.r + k * 22, 0, TAU); ctx.stroke(); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, HL.r + 3 + k * 12, 0, TAU); ctx.stroke(); ctx.restore(); }
    });
    // 범례
    const ly = g.y + g.h - 16; const lg = PHONE ? [['#cbd5e1', '접종 안 함'], ['#86efac', '보호됨'], ['#f87171', '감염'], ['#fff', '접종 못 함(🍼)']] : [['#cbd5e1', '접종 안 함'], ['#86efac', '보호됨(🛡)'], ['#f87171', '감염'], ['#fff', '접종할 수 없음(🍼)']];
    let lx = g.x + 14; lg.forEach((q, i) => { if (i === 3) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx + 6, ly - 4, 7, 0, TAU); ctx.stroke(); ctx.restore(); } else D.sphere(lx + 6, ly - 4, 6, q[0], { gloss: false }); T(lx + 16, ly, q[1], PHONE ? 11 : 12, '#4b5563', 'left', 700); lx += PHONE ? (i === 0 ? 92 : i === 1 ? 74 : 56) : (i === 0 ? 96 : i === 1 ? 100 : 64); });
    // 정보 상자
    const I = HL.info; panel(I.x, I.y, I.w, I.h, 16);
    const ix = I.x + 14, iw = I.w - 28; let y = I.y + 28;
    T(ix, y, '실효 재생산 수 R', PHONE ? 14 : 15.5, '#26324a', 'left', 900); y += PHONE ? 24 : 28;
    TF(ix, y, 'R = 4 × (1 − 0.9 × p),  p = ' + (p / 100).toFixed(2), iw, PHONE ? 14 : 14.5, 11, '#374151', 'left', 800); y += PHONE ? 24 : 28;
    TF(ix, y, '  = 4 × (1 − ' + (0.9 * p / 100).toFixed(3) + ') = ' + reff.toFixed(2), iw, PHONE ? 15 : 16, 11, reff < 1 ? '#15803d' : '#b91c1c', 'left', 900); y += PHONE ? 14 : 18;
    // 막대
    const bx = ix, bw = iw, by = y + 4; D.roundRect(bx, by, bw, 18, 9); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    const fw = bw * clamp(reff / 4, 0, 1); if (fw > 2) { D.roundRect(bx, by, Math.max(fw, 12), 18, 9); ctx.fillStyle = reff < 1 ? '#22c55e' : '#ef4444'; ctx.fill(); }
    const m1 = bx + bw / 4; ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(m1, by - 5); ctx.lineTo(m1, by + 23); ctx.stroke(); T(m1, by + 38, 'R = 1', 12.5, '#111827', 'center', 800); T(bx, by + 38, '0', 12, '#6b7280', 'left', 700); T(bx + bw, by + 38, '4', 12, '#6b7280', 'right', 700);
    y = by + (PHONE ? 56 : 66);
    const rows = [['접종한 사람', nVac(p) + '명'], ['보호된 사람 (효과 90 %)', nProt(p) + '명'], ['감염된 사람', H.t < 0 ? '—' : herdShown(H) + ' / 100명'], ['접종 못 하는 5명 중 감염', H.t < 0 ? '—' : (H.run ? VULN.filter((v) => infAt(H, v)).length : R.vul) + '명']].slice(PHONE ? 1 : 0); if (!PHONE) rows.splice(2, 0, ['접종했지만 보호 안 됨 (연두색)', (nVac(p) - nProt(p)) + '명']);
    rows.forEach((q) => { TF(ix, y, q[0], iw - 90, PHONE ? 13 : 14, 10.5, '#4b5563', 'left', 800); T(ix + iw, y, q[1], PHONE ? 14 : 15, '#111827', 'right', 900); y += PHONE ? 23 : 28; });
    textBlock(ix, y + 2, iw, PHONE ? (p > 83.34 ? 'R < 1: 감염이 퍼지지 못해요.' : 'R < 1이 되려면 p가 83.3 %를 넘어야 해요.') : (p > 83.34 ? 'p가 83.3 %를 넘어서 R < 1이에요. 감염이 퍼지지 못하고 사라져요.' : 'R ≥ 1이면 감염이 퍼져요. R < 1이 되려면 p가 83.3 %를 넘어야 해요 (정수로는 84 %부터).'), PHONE ? 12.5 : 13.5, p > 83.34 ? '#15803d' : '#92400e', PHONE ? 17 : 19, 800);
    if (!PHONE) { const cp = HL.cap; panel(cp.x, cp.y, cp.w, cp.h, 14); textBlock(cp.x + 14, cp.y + 26, cp.w - 28, '접종률이 높으면 감염자가 이웃을 감염시킬 확률이 줄어요. 접종할 수 없는 사람(🍼)도 주변 사람이 접종하면 감염될 기회가 줄어 보호돼요 (집단 면역). 접종은 의료인과 상담해요. (교육용 모형이에요.)', 14, '#374151', 20, 700); }
  }
  const CLM = [
    { id: 'cl1', label: '백신은 접종한 개인을 보호할 뿐 아니라 지역 사회도 보호한다', ans: 'claim' },
    { id: 'cl2', label: '접종률 85 %에서 실효 R = 4 × (1 − 0.9 × 0.85) ≈ 0.94로 1보다 작아 감염 확산이 줄었다', ans: 'evid' },
    { id: 'cl3', label: '접종할 수 없는 영아·면역이 약한 사람도 주변 사람이 접종하면 감염될 기회가 줄어 보호된다', ans: 'reason' },
    { id: 'cd1', label: '백신은 접종한 사람에게만 도움이 되고 다른 사람과는 관계가 없다', ans: null },
    { id: 'cd2', label: '접종률이 0 %여도 실효 R은 1보다 작아 감염이 저절로 멈춘다', ans: null },
    { id: 'cd3', label: '백신 효과가 100 %라서 접종하면 어떤 경우에도 감염되지 않는다', ans: null },
  ];
  function makeClaim() {
    const SL = [{ id: 'claim', name: '주장' }, { id: 'evid', name: '근거 (자료)' }, { id: 'reason', name: '이유 (원리)' }];
    S.CM = new Matcher({
      cards: shuf(CLM, 8).map((c) => ({ id: c.id, label: c.label, col: '#0f766e', wrap: true, wsize: PHONE ? 12.5 : 14 })),
      slots: SL.map((s, i) => { const y = PHONE ? 8 + i * 118 : 14 + i * 106, h = PHONE ? 110 : 98; return { id: s.id, x: PHONE ? 8 : 16, y, w: PHONE ? 464 : 768, h, col: '#0f766e', name: s.name, card: PHONE ? { x: 16, y: y + 30, w: 448, h: 74 } : { x: 16 + 140, y: y + 12, w: 608, h: 74 } }; }),
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 372 + Math.floor(i / 2) * 84 }) : (i) => ({ x: 16 + (i % 2) * 388, y: 336 + Math.floor(i / 2) * 64 }),
      cw: PHONE ? 228 : 380, ch: PHONE ? 78 : 58, onChange() { rlast = ''; },
    });
    S.CM.slots.forEach((s) => { s.draw = (q) => { T(q.x + 14, q.y + (PHONE ? 22 : 40), q.name, PHONE ? 14.5 : 17, '#115e59', 'left', 900); }; });
  }
  function drawClaim(dt) {
    bgFill('#eaf6f4', '#dcece9'); const M = S.CM; M.update(dt); M.drawSlots();
    if (!PHONE) { panel(16, 336 + 3 * 64 + 4, 768, VH - (336 + 3 * 64 + 4) - 8, 10); TF(400, 336 + 3 * 64 + 28, '짝과 함께 “주장 → 근거 → 이유” 순서로 소리 내어 설명해 보세요.', 740, 14, 11, '#115e59', 'center', 800); }
    M.drawCards();
  }

  /* ============ 장면 전환 · 조작 연결 ============ */
  function onEnterView() {
    const key = viewKey(); PT = null;
    if (key === 'gr:plot') PT = { down: plotDown, hover: (p) => { const P = gPlot(GL.pl); return inRect(p.x, p.y, P.b) ? 'crosshair' : 'default'; } };
    else if (key === 'gr:table') PT = grTabPT;
    else if (key === 'kind:match') PT = S.KM; else if (key === 'kind:pick') PT = S.KP; else if (key === 'kind:card') PT = S.KC;
    else if (key === 'herd:claim') PT = S.CM;
  }
  const kindM = () => (S.sub.kind === 'match' ? S.KM : S.sub.kind === 'pick' ? S.KP : S.KC);
  function syncControls() {
    const G = S.GP, V = S.V, H = S.H;
    markSeg('#crvChips', 'k', G.cur);
    $$('#crvChips button').forEach((b) => b.classList.toggle('done', plotDone(+b.dataset.k)));
    const nx = nextPt(G.cur);
    $('#plotNote').innerHTML = '점 <b>' + (G.pts[1].filter(Boolean).length + G.pts[2].filter(Boolean).length) + ' / 14</b> · ' + (nx >= 0 ? '다음: <b>' + CRV[G.cur].name + ' ' + CRV[G.cur].D.x[nx] + '일째, 농도 ' + CRV[G.cur].D.y[nx] + '</b>. 그래프에서 그 높이를 눌러요.' : CRV[G.cur].name + ' 곡선을 모두 그렸어요!');
    $('#oVac').textContent = V.chalDone ? '시험 끝' : V.ct >= 0 ? '감염 후 ' + Math.floor(vDay(V)) + '일' : V.vacDone ? '접종 완료' : V.vt >= 0 ? '접종 후 ' + Math.floor(vacDay(V)) + '일' : '—';
    $('#bVacc').disabled = V.vt >= 0; $('#bChal').disabled = !V.vacDone || V.ct >= 0;
    $('#bVacc').textContent = V.vacDone ? '✔ ① 백신 맞기 완료' : '① 💉 백신 맞기 (항원만)'; $('#bChal').textContent = V.chalDone ? '✔ ② 감염 시험 완료' : '② 🦠 병원체 침입 시험';
    $('#vacNote').innerHTML = !V.vacDone ? '백신에는 병을 일으키지 않는 <b>항원</b>만 들어 있어요. 먼저 ①을 눌러요.' : !V.chalDone ? '기억 세포가 생겼어요. ②로 <b>같은 병원체</b>가 침입하면 어떻게 되는지 확인해요.' : '미접종자 증상 <b>' + r1(symOf(INF_U, 14)) + '일</b>, 접종자 ' + (symOf(INF_V, 14) < 0.05 ? '<b>증상 없음</b>' : '<b>' + r1(symOf(INF_V, 14)) + '일</b>') + '.';
    const M = kindM(); const nn = M ? M.cards.length : 0;
    $('#kindNote').innerHTML = S.sub.kind === 'match' ? '백신 이름 카드를 설명 칸에 넣어요. 놓은 카드 <b>' + S.KM.placed + ' / 6</b>' : S.sub.kind === 'pick' ? '상황마다 알맞은 백신 카드를 골라요. 놓은 카드 <b>' + S.KP.placed + ' / 3</b>' : '알맞은 문장 3장을 칸에 넣어요 (틀린 문장 3장은 남겨요). 놓은 카드 <b>' + S.KC.placed + ' / 3</b>'; void nn;
    $('#sP').value = H.p; $('#sP').disabled = H.run; $('#sP').style.setProperty('--pct', (H.p / 95 * 100) + '%'); $('#oP').textContent = H.p + ' %';
    $$('#pChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.p === H.p); b.classList.toggle('done', !!H.ran[b.dataset.p]); b.disabled = H.run; });
    $('#pMinus').disabled = H.run; $('#pPlus').disabled = H.run;
    $('#bHerd').disabled = H.run; $('#bHerd').textContent = H.run ? '진행 중…' : '▶ 감염 퍼뜨리기';
    $('#herdNote').innerHTML = '실행해 본 접종률: ' + [0, 50, 85].map((q) => (H.ran[q] ? '✅' : '⬜') + q + ' %').join(' ') + '<br>접종할 수 없는 5명 때문에 최대 95 %예요.';
  }
  on('#crvChips', 'click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.GP.cur = +b.dataset.k; syncControls(); });
  on('#bPlotReset', 'click', () => { Sound.click(); makeGr(); syncControls(); rlast = ''; });
  on('#bGrTabReset', 'click', () => { Sound.click(); S.GT.reset(); });
  on('#bVacc', 'click', vacStart); on('#bChal', 'click', chalStart);
  on('#bVacReset', 'click', () => { Sound.click(); makeVac(); syncControls(); });
  on('#bKindReset', 'click', () => { Sound.click(); const m = kindM(); m.reset(); syncControls(); });
  on('#sP', 'input', (e) => { herdSetP(+e.target.value); });
  on('#pMinus', 'click', () => { Sound.tick(); herdSetP(S.H.p - 1); }); on('#pPlus', 'click', () => { Sound.tick(); herdSetP(S.H.p + 1); });
  on('#pChips', 'click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); herdSetP(+b.dataset.p); } });
  on('#bHerd', 'click', herdRun);
  on('#bHerdReset', 'click', () => { Sound.click(); const ran = S.H.ran; makeHerd(); S.H.ran = ran; syncControls(); });
  on('#bClaimReset', 'click', () => { Sound.click(); S.CM.reset(); });

  function readouts() {
    const key = viewKey(), G = S.GP, V = S.V, H = S.H;
    if (key === 'gr:plot') setReadouts([['그린 점', (G.pts[1].filter(Boolean).length + G.pts[2].filter(Boolean).length) + ' / 14'], ['지금 곡선', CRV[G.cur].name], ['그래프', '농도 = 상대값']]);
    else if (key === 'gr:table') setReadouts([['채운 칸', S.GT.filled + ' / 6'], ['틀린 칸 표시', S.GT.bad.flat().filter(Boolean).length + '칸']]);
    else if (key === 'vac') { const cd = V.ct >= 0 ? vDay(V) : 0; setReadouts([['시간', V.ct >= 0 ? '감염 후 ' + r1(cd) + '일' : V.vt >= 0 ? '접종 후 ' + Math.round(vacDay(V)) + '일' : '—'], ['미접종자 병원체 수', V.ct >= 0 ? Math.round(INF_U.at(cd)) + ' (최대 ' + Math.round(peakOf(INF_U, cd)) + ')' : '—'], ['접종자 병원체 수', V.ct >= 0 ? r1(INF_V.at(cd)) + ' (최대 ' + r1(peakOf(INF_V, cd)) + ')' : '—']]); }
    else if (key.indexOf('kind') === 0) setReadouts([['놓은 카드', kindM().placed + ' / ' + (S.sub.kind === 'match' ? 6 : 3)], ['공통 원리', '항원 먼저 → 기억 세포']]);
    else if (key === 'herd:sim') setReadouts([['접종률 p', H.p + ' %'], ['실효 R', reffOf(H.p).toFixed(2)], ['감염된 사람', H.t < 0 ? '—' : herdShown(H) + ' / 100명']]);
    else setReadouts([['놓은 카드', S.CM.placed + ' / 3'], ['글의 구조', '주장 → 근거 → 이유']]);
  }

  /* ============ 시작 ============ */
  const RBCS0 = 0; void RBCS0;
  makeGr(); makeVac(); makeKind(); makeHerd(); makeClaim();

  /* ============ 단계 · 미션 ============ */
  const levels = [
    {
      title: '항체 농도 그래프: 첫 침입과 두 번째 침입', short: '항체 그래프', icon: '📈', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 병에 걸린 적이 없는데 몸이 먼저 병을 막아 내려면 어떻게 해야 할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 기억 세포가 있으면 같은 병원체가 다시 올 때 더 빠르고 강하게 반응한다고 배웠어요. 이번에는 <b>항체 농도 자료</b>를 그래프로 직접 그려서 그 차이를 숫자로 확인해요.</div>' +
        '<p>같은 항원을 처음 만났을 때(<b>1차 반응</b>)와 두 번째 만났을 때(<b>2차 반응</b>)의 항체 농도(상대값, 예시 자료)를 시간 축에 점으로 찍어 곡선을 그리고, <b>잠복기·최대 농도·유지</b> 세 가지를 비교해요.</p>',
      features: ['gr'],
      setup() { setScene('gr', 'plot'); },
      recap: '2차 반응은 1차 반응보다 항체가 더 빨리(약 7일 → 약 2일), 훨씬 많이(최대 약 10 → 약 100), 더 오래(42일째 약 2 → 약 30) 유지돼요. 기억 세포 덕분이에요.',
      summary: '<table class="mini"><tr><th></th><th>1차 반응</th><th>2차 반응</th></tr><tr><th>잠복기</th><td>약 7일</td><td>약 2일</td></tr><tr><th>최대 농도</th><td>약 10</td><td>약 100 (약 10배)</td></tr><tr><th>42일째 농도</th><td>약 2</td><td>약 30</td></tr></table>' +
        '<ul><li>항체 농도(상대값, 예시): 1차 반응 0·0·2·10·7·4·2, 2차 반응 2·20·70·100·80·50·30.</li><li>2차 반응이 빠르고 강한 까닭: <b>기억 세포</b>가 남아 있기 때문.</li></ul>',
      missions: [
        {
          title: '1차·2차 항체 곡선 그리기',
          goal: '표의 값대로 <b>1차 반응</b> 7개, <b>2차 반응</b> 7개의 점을 그래프에 찍어 두 곡선을 완성하세요.',
          hint: '노란 칸이 다음에 찍을 점이에요. 그래프에서 그 날짜 줄(세로)과 농도 높이(가로 눈금)가 만나는 곳을 눌러요.',
          setup() { makeGr(); setScene('gr', 'plot'); syncControls(); },
          check: () => plotDone(1) && plotDone(2), hold: 0.4,
          status: () => '1차 ' + S.GP.pts[1].filter(Boolean).length + ' / 7 ' + mark(plotDone(1)) + ' &nbsp; 2차 ' + S.GP.pts[2].filter(Boolean).length + ' / 7 ' + mark(plotDone(2)),
          explain: '2차 반응 곡선은 1차 반응 곡선보다 <b>훨씬 높고 빨리 올라가요</b>. 1차는 7일째에 겨우 2, 최대 약 10인 반면, 2차는 2일째에 20, 7일째에 최대 약 100이에요.',
        },
        {
          title: '두 곡선 비교표 채우기', manual: true,
          goal: '그린 그래프를 보고 <b>잠복기, 최대 농도, 42일째 농도</b>를 1차·2차 반응으로 나누어 표 6칸을 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '잠복기는 항체가 처음 생기기 시작할 때까지의 시간이에요 (1차는 7일째 2, 2차는 2일째 20). 최대 농도와 42일째 값은 그래프의 점을 읽어요.',
          setup() { S.GT.reset(); setScene('gr', 'table'); },
          check() {
            const tb = S.GT, miss = tb.total - tb.filled; if (miss) return '아직 비어 있는 칸이 ' + miss + '칸 있어요.';
            const w = tb.wrongCells(); tb.markBad(w); if (w.length) return '빨간 칸을 다시 읽어 보세요. 아래 내가 그린 그래프에서 값을 확인해요.';
            tb.ok = true; return true;
          },
          status: () => '채운 칸 ' + S.GT.filled + ' / 6',
          explain: '1차 반응은 <b>약 7일</b> 뒤에 항체가 생기고 최대 <b>약 10</b>, 42일째엔 약 2예요. 2차 반응은 <b>약 2일</b> 만에 항체가 늘고 최대 <b>약 100</b>(약 10배), 42일째에도 약 30으로 오래 유지돼요.',
        },
        {
          type: 'quiz', title: '2차 반응이 빠르고 강한 까닭',
          goal: '2차 면역 반응이 1차 반응보다 <b>빠르고 강한 까닭</b>은 무엇일까요?',
          setup() { setScene('gr', 'table'); },
          choices: ['첫 침입 때 만들어진 기억 세포가 남아 있어 빠르게 분열해 많은 항체를 만들기 때문', '첫 침입 때 만든 항체가 그대로 남아 계속 늘어나기 때문', '병원체가 두 번째에는 약해지기 때문', '선천적 면역이 두 번째에 더 강해지기 때문'],
          answer: 0,
          feedback: ['', '처음 만든 항체는 시간이 지나면 줄어들어요(1차 곡선이 내려가요). 달라진 것은 기억 세포예요.', '병원체가 약해지는 것이 아니라 우리 몸의 반응이 빨라지는 거예요.', '선천적 면역은 기억하지 못해서 두 번째라고 더 강해지지 않아요.'],
          explain: '1차 반응 때 만들어진 <b>기억 세포</b>가 오래 남아 있다가 같은 항원이 다시 오면 <b>빠르게 분열</b>해 형질 세포를 많이 만들어요. 그래서 항체가 더 일찍, 더 많이 만들어져요.',
        },
      ],
    },
    {
      title: '백신 원리: 병원체 없이 기억 세포 만들기', short: '백신 원리', icon: '💉', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기억 세포가 있으면 2차 반응이 빠르고 강하다는 것을 그래프로 확인했어요. <b>실제로 병에 걸리지 않고도</b> 기억 세포를 만들 수 있다면 어떨까요?</div>' +
        '<p><b>백신</b>은 병을 일으키지 않는 <b>항원</b>만 먼저 몸에 넣어 1차 면역 반응을 일으키고 <b>기억 세포</b>를 만들어 둬요. 이후 진짜 병원체가 침입하면 <b>2차 반응</b>이 일어나요. 접종 후 감염 시험을 해서 접종하지 않은 사람과 비교해요. (교육용 모형이에요. 접종은 의료인과 상담해요.)</p>',
      features: ['vac'],
      setup() { setScene('vac'); },
      recap: '백신을 맞으면 병에 걸리지 않고도 1차 면역 반응과 기억 세포 형성이 일어나요. 이후 진짜 병원체가 오면 2차 반응으로 병원체가 거의 늘지 못해 증상이 나타나지 않아요.',
      summary: '<ul><li><b>백신의 원리</b>: 병원체 없이 항원에 먼저 노출 → 1차 면역 반응 → <b>기억 세포</b> 형성 → 실제 감염 시 <b>2차 면역 반응</b>.</li>' +
        '<li>감염 시험(모형): 미접종자는 병원체가 크게 늘어 증상 수준(20)을 넘는 기간이 약 5.4일, 접종자는 병원체가 거의 늘지 못해 증상이 없어요.</li>' +
        '<li>백신을 맞아도 면역은 영원하지 않을 수 있어요. 시간이 지나거나 병원체가 변하면 추가 접종이 필요한 경우도 있어요.</li></ul>',
      missions: [
        {
          title: '접종 후 감염 시험과 곡선 비교',
          goal: '① <b>백신을 맞고</b> 기억 세포가 생기는 것을 본 뒤, ② <b>병원체 침입 시험</b>으로 미접종자와 접종자의 병원체 수 곡선을 비교하세요.',
          hint: '왼쪽 ① 단추를 누르고 약 6초 기다린 다음 ② 단추를 눌러요. 주황 점선(증상 수준 20)을 넘는지 보세요.',
          setup() { makeVac(); setScene('vac'); syncControls(); },
          check: () => S.V.vacDone && S.V.chalDone, hold: 0.5,
          status: () => '백신 접종 ' + mark(S.V.vacDone) + ' &nbsp; 감염 시험 ' + mark(S.V.chalDone),
          explain: '미접종자는 항체가 늦게 만들어져 병원체가 <b>최대 약 71</b>까지 늘고 증상 수준(20)을 넘는 기간이 <b>약 5.4일</b>이었어요. 접종자는 기억 세포가 빠르게 반응해 병원체 수가 <b>최대 약 1</b>로 거의 늘지 못했고 증상이 없었어요.',
        },
        {
          type: 'quiz', title: '백신을 맞으면 그 병에 걸릴까?',
          goal: '다음 중 <b>옳은 설명</b>은 무엇일까요?',
          setup() { setScene('vac'); },
          choices: ['백신에는 병을 일으키지 않도록 만든 항원 등이 들어 있어 병에 걸리지 않고 기억 세포가 만들어진다', '백신을 맞으면 반드시 그 병에 가볍게 걸려야 면역이 생긴다', '백신은 항체를 직접 넣어 주는 것이다', '백신은 병원체가 몸에 들어오지 못하게 막는 벽이다'],
          answer: 0,
          feedback: ['', '백신은 병을 일으키지 않도록 만들어요. 병에 걸리지 않고도 1차 면역 반응이 일어나 기억 세포가 생겨요.', '백신은 항원을 넣어 몸이 스스로 항체와 기억 세포를 만들게 해요. 항체를 넣어 주는 것과 달라요.', '백신은 병원체를 막는 벽이 아니라 면역 반응을 미리 연습시키는 거예요.'],
          explain: '백신은 <b>병을 일으키지 않도록 만든 항원</b>(또는 약화·사멸한 병원체, 항원의 설계도 등)을 넣어 우리 몸이 스스로 항체와 <b>기억 세포</b>를 만들게 해요. 그래서 병에 걸리지 않고도 면역이 생겨요.',
        },
        {
          type: 'quiz', title: '한 번 맞으면 평생 면역일까?',
          goal: '“백신을 한 번 맞으면 <b>항상 평생 면역</b>이 생긴다”는 말에 대해 알맞은 것은?',
          setup() { setScene('vac'); },
          choices: ['시간이 지나면 항체와 기억 세포의 반응이 약해지거나 병원체가 변해서 추가 접종이 필요한 경우도 있다', '모든 백신은 한 번만 맞으면 평생 완전한 면역을 준다', '백신을 맞으면 항체 농도가 계속 최대로 유지된다', '추가 접종은 효과가 전혀 없다'],
          answer: 0,
          feedback: ['', '백신에 따라 면역이 오래가는 정도가 달라요. 추가 접종이 필요한 백신도 있어요.', '항체 농도는 시간이 지나면 줄어들어요(그래프에서 2차 반응도 서서히 줄어요).', '추가 접종은 기억 세포를 다시 자극해 면역을 강화해 줘요.'],
          explain: '항체 농도는 시간이 지나면 줄고, 병원체가 변하면(변이) 기억 세포가 알아보지 못할 수도 있어요. 그래서 백신에 따라 <b>추가 접종</b>이 필요한 경우가 있어요. 접종 일정은 의료인과 상담해요.',
        },
      ],
    },
    {
      title: '백신 종류 조사: 어떻게 만들었을까?', short: '백신 종류', icon: '🔎', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 백신의 공통 원리(항원 먼저 → 기억 세포)를 확인했어요. 이제 <b>만드는 방법에 따라</b> 백신이 어떤 종류로 나뉘는지 조사해요.</div>' +
        '<p>백신은 <b>약독화 생백신, 불활화(사) 백신, 단백질(재조합) 소단위 백신, 톡소이드 백신, 핵산(mRNA) 백신, 바이러스 벡터 백신</b>으로 나눌 수 있어요. 통합과학의 <b>전사·번역</b>을 떠올리며 구성을 연결하고, 병원체의 특징에 맞는 백신을 고르고, 조사 발표 카드를 정리해요.</p>',
      features: ['kind'],
      setup() { setScene('kind', 'match'); },
      recap: '백신은 약독화 생백신, 불활화 백신, 소단위 백신, 톡소이드 백신, mRNA 백신, 바이러스 벡터 백신으로 나눠요. 병원체의 특징(독소가 원인인지, 유전자 서열을 아는지)에 맞게 골라요.',
      summary: '<ul><li><b>약독화 생백신</b>: 독성을 약하게 한 살아 있는 병원체(홍역·풍진·BCG). <b>불활화(사) 백신</b>: 죽인 병원체 전체(일본 뇌염 등).</li>' +
        '<li><b>단백질(재조합) 소단위 백신</b>: 항원 단백질 일부(B형 간염). <b>톡소이드 백신</b>: 독소의 독성을 없앤 것(파상풍·디프테리아).</li>' +
        '<li><b>핵산(mRNA) 백신</b>: 항원 단백질의 설계도(mRNA) 전달 → 우리 세포가 항원을 만듦. <b>바이러스 벡터 백신</b>: 무해한 바이러스에 항원 유전자를 실어 전달.</li></ul>',
      missions: [
        {
          title: '백신 6종류와 구성 연결', manual: true,
          goal: '백신 이름 카드 6장을 끌어서 알맞은 <b>구성 설명</b> 칸에 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“약독화”는 독성을 약하게, “불활화”는 죽인 것, “소단위”는 일부 단백질, “톡소이드”는 독소, “핵산”은 설계도를 뜻해요.',
          setup() { S.KM.reset(); setScene('kind', 'match'); },
          check() {
            const M = S.KM, miss = M.cards.filter((c) => !c.slot); if (miss.length) return '아직 칸에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = M.cards.filter((c) => c.slot !== c.id); M.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 다른 설명 칸이에요: ' + wrong.map((c) => c.label).join(', ') + '.';
            return true;
          },
          status: () => '놓은 카드 ' + S.KM.placed + ' / 6',
          explain: '<b>약독화 생백신</b>(살아 있는 약한 병원체), <b>불활화 백신</b>(죽인 병원체), <b>소단위 백신</b>(항원 단백질 일부), <b>톡소이드 백신</b>(독성을 없앤 독소), <b>mRNA 백신</b>(항원의 설계도), <b>바이러스 벡터 백신</b>(항원 유전자를 실은 무해한 바이러스)이에요. 생백신은 면역 반응이 강하지만 면역이 약한 사람은 주의가 필요해요.',
        },
        {
          title: '병원체 특징에 맞는 백신, 발표 카드 정리', manual: true,
          goal: '세 가지 상황에 알맞은 백신 카드를 고르고, <b>mRNA 백신 발표 카드</b>의 세 칸(만드는 방법·작용 원리·유의점)을 채운 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '위의 보기 단추로 🎯 알맞은 백신, 📝 발표 카드를 오가며 채워요. 발표 카드에서 틀린 문장 3장은 남겨 둬요.',
          setup() { S.KP.reset(); S.KC.reset(); setScene('kind', 'pick'); },
          check() {
            const P = S.KP, C = S.KC;
            if (P.cards.filter((c) => c.slot).length < 3) return '🎯 알맞은 백신 화면에서 세 상황의 백신 카드를 모두 골라요.';
            const wp = P.cards.filter((c) => c.slot && SCN.find((q) => q.id === c.slot).ans !== c.id); P.markBad(wp.map((c) => c.id));
            if (C.cards.filter((c) => c.slot).length < 3) return '📝 발표 카드 화면에서 세 칸을 모두 채워요.';
            const wc = C.cards.filter((c) => c.slot && PCARD.find((q) => q.id === c.id).ans !== c.slot); C.markBad(wc.map((c) => c.id));
            if (wp.length) return '🎯 빨간 카드는 그 상황에 맞지 않아요: ' + wp.map((c) => c.label).join(', ') + '.';
            if (wc.length) return '📝 빨간 문장은 그 칸에 맞지 않아요. mRNA 백신의 방법·원리·유의점을 떠올려요.';
            return true;
          },
          status: () => '백신 고르기 ' + S.KP.cards.filter((c) => c.slot).length + ' / 3 &nbsp; 발표 카드 ' + S.KC.cards.filter((c) => c.slot).length + ' / 3',
          explain: '독소가 병의 원인이면 <b>톡소이드 백신</b>, 새 감염병에서 유전자 서열을 빨리 알면 <b>mRNA 백신</b>, 항원 단백질 일부만 쓰려면 <b>소단위 백신</b>이 알맞아요. mRNA 백신은 설계도(mRNA)를 전달해 <b>우리 세포가 항원을 만들게</b> 해요(전사·번역). mRNA는 곧 분해되고 우리 DNA를 바꾸지 않아요.',
        },
        {
          type: 'quiz', title: '전문가 영상 메모: 맞는 문장은?',
          goal: '전문가 영상에서 mRNA 백신에 대해 메모했어요. <b>옳은 문장</b>은 어느 것일까요?',
          figure: '<svg viewBox="0 0 320 96" role="img" aria-label="전문가 영상 메모 카드"><rect x="4" y="4" width="312" height="88" rx="12" fill="#fff7ed" stroke="#fb923c" stroke-width="2"/><circle cx="34" cy="30" r="16" fill="#fb923c"/><path d="M29 22 L43 30 L29 38 Z" fill="#fff"/><text x="60" y="35" font-size="15" font-weight="800" fill="#9a3412">전문가 영상 메모</text><text x="18" y="62" font-size="13" fill="#7c2d12">mRNA 백신: 항원 단백질의 설계도를 전달해요</text><text x="18" y="80" font-size="13" fill="#7c2d12">만드는 방법 · 작용 원리 · 유의점</text></svg>',
          setup() { setScene('kind', 'card'); },
          choices: ['mRNA가 우리 세포에서 항원 단백질을 만들게 하고, mRNA는 곧 분해된다', 'mRNA가 접종받은 사람의 DNA를 바꿔 평생 항원을 만든다', 'mRNA 백신에는 죽인 병원체 전체가 들어 있다', 'mRNA 백신은 항체를 직접 만들어 넣는 것이다'],
          answer: 0,
          feedback: ['', 'mRNA는 세포질에서 단백질을 만드는 데 쓰이고 곧 분해돼요. 우리 DNA를 바꾸지 않아요.', '죽인 병원체 전체를 쓰는 것은 불활화 백신이에요.', '항체를 만들어 넣는 것이 아니라 우리 몸이 스스로 항체와 기억 세포를 만들게 해요.'],
          explain: 'mRNA 백신은 항원 단백질의 <b>설계도(mRNA)</b>를 전달해 우리 세포가 <b>번역</b>으로 항원을 만들게 해요. mRNA는 곧 분해되고 DNA를 바꾸지 않아요. 만들어진 항원에 대해 면역 반응이 일어나 기억 세포가 생겨요.',
        },
      ],
    },
    {
      title: '집단 면역: 백신은 왜 필요할까?', short: '집단 면역', icon: '🏘', phase: '적용',
      intro: '<div class="si-link">🔗 <b>통합과학2에서</b> 감염 한 명이 평균 몇 명을 감염시키는지(R)로 확산을 따져 보았어요. 이제 <b>접종률</b>이 R을 어떻게 바꾸는지 가상 마을로 확인해요.</div>' +
        '<p>한 감염자가 평균 <b>R₀ = 4</b>명을 감염시키고 백신 효과가 <b>90 %</b>일 때, 접종률 p에서의 실효 재생산 수는 <b>R = 4 × (1 − 0.9p)</b>예요. <b>R &lt; 1</b>이면 감염이 퍼지지 못해요. 접종률을 0 %, 50 %, 85 %로 바꿔 보고, 백신이 왜 필요한지 <b>주장–근거–이유</b>로 정리해요. (교육용 모형이에요.)</p>',
      features: ['herd'],
      setup() { setScene('herd', 'sim'); },
      recap: '접종률이 높아질수록 실효 R이 작아져요. 접종률이 약 83.3 %보다 크면 R < 1이 되어 감염이 퍼지지 못해요. 접종할 수 없는 사람도 집단 면역으로 보호돼요.',
      summary: '<ul><li><b>실효 R = R₀ × (1 − 0.9p)</b> (R₀ = 4, 백신 효과 90 %). p = 0 %: R = 4, p = 50 %: R = 2.2, p = 85 %: R ≈ 0.94.</li>' +
        '<li>R &lt; 1이 되려면 0.9p &gt; 0.75, 즉 p &gt; 약 83.3 % (정수로 84 % 이상).</li>' +
        '<li><b>집단 면역</b>: 접종률이 높으면 접종할 수 없는 사람(영아, 면역 저하자)도 간접적으로 보호돼요. 백신은 개인과 지역 사회를 함께 보호해요.</li></ul>',
      missions: [
        {
          title: '접종률 0 %, 50 %, 85 % 비교',
          goal: '접종률을 <b>0 %, 50 %, 85 %</b>로 맞추고 각각 ▶ 감염 퍼뜨리기를 끝까지 실행해 실효 R과 감염자 수를 비교하세요.',
          hint: '접종률 단추(0·50·85 %)를 누르거나 슬라이더·−/+로 맞춘 뒤 ▶를 눌러요. 한 번에 약 8초 걸려요.',
          setup() { const ran = {}; makeHerd(); S.H.ran = ran; setScene('herd', 'sim'); syncControls(); },
          check: () => S.H.ran[0] && S.H.ran[50] && S.H.ran[85], hold: 0.5,
          status: () => [0, 50, 85].map((q) => (S.H.ran[q] ? '✅' : '⬜') + q + ' % (R = ' + reffOf(q).toFixed(2) + ')').join(' &nbsp; '),
          explain: '접종률 0 %: R = 4 → 마을 거의 전체가 감염돼요. 50 %: R = 4 × (1 − 0.45) = 2.2 → 절반 정도가 감염돼요. 85 %: R = 4 × (1 − 0.765) ≈ 0.94 &lt; 1 → 소수만 감염되고 접종할 수 없는 사람(🍼)은 감염되지 않아요. 이것이 <b>집단 면역</b>이에요.',
        },
        {
          title: '백신이 필요한 까닭: 주장 · 근거 · 이유', manual: true,
          goal: '문장 카드를 <b>주장 → 근거 → 이유</b> 칸에 알맞게 넣고 <b>✔ 확인하기</b>를 누르세요. 틀린 문장 3장은 남겨요.',
          hint: '주장은 “백신은 …도 보호한다”, 근거는 시뮬레이션 숫자, 이유는 접종할 수 없는 사람이 보호되는 까닭이에요.',
          setup() { S.CM.reset(); setScene('herd', 'claim'); },
          check() {
            const M = S.CM, f = M.cards.filter((c) => c.slot); if (f.length < 3) return '세 칸을 모두 채워요 (주장, 근거, 이유).';
            const wrong = f.filter((c) => CLM.find((q) => q.id === c.id).ans !== c.slot); M.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 문장은 그 칸에 맞지 않아요. 시뮬레이션에서 본 숫자와 접종할 수 없는 사람(🍼)의 결과를 떠올려요.';
            return true;
          },
          status: () => '채운 칸 ' + S.CM.placed + ' / 3',
          explain: '<b>주장</b>: 백신은 개인을 보호하고 지역 사회도 보호한다. <b>근거</b>: 접종률 85 %에서 R ≈ 0.94로 1보다 작아 확산이 줄었다. <b>이유</b>: 접종할 수 없는 사람도 주변 사람이 접종하면 감염될 기회가 줄어 보호된다. 백신은 완벽하지 않으므로(효과 90 %) 접종률을 높이는 것이 중요해요. 접종은 의료인과 상담해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-vaccine', mount: '#game', badge: '백신 연구원', homeHref: '../../index.html#hb',
    featureLabels: { gr: '📈 항체 그래프 그리기 · 비교표', vac: '💉 백신 접종 후 감염 시험', kind: '🔎 백신 6종류 · 발표 카드', herd: '🏘 가상 마을 · 접종률 슬라이더' },
    onFeatures() { updateCtl(); },
    levels,
  });

  setScene('gr', 'plot');
  let lastFree = false;
  function stepAll(dt) {
    if (S.mode === 'gr' && S.sub.gr === 'plot') stepGr(dt);
    if (S.mode === 'gr' && S.sub.gr === 'table') S.GT.update(dt);
    if (S.mode === 'vac') stepVac(dt);
    if (S.mode === 'herd' && S.sub.herd === 'sim') stepHerd(dt);
  }
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    stepAll(dt);
    const key = viewKey();
    if (key === 'gr:plot') drawGrPlot(dt); else if (key === 'gr:table') drawGrTable(dt);
    else if (key === 'vac') drawVac(dt); else if (key.indexOf('kind') === 0) drawKind(dt);
    else if (key === 'herd:sim') drawHerd(dt); else drawClaim(dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,246,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, GL, VL, HL, CRV, VT, SCN, PCARD, CLM, VULN, VISIT, INF_U, INF_V, get game() { return game; }, setScene, gPlot, hp, reffOf, herdSetP, herdRun, symOf, peakOf,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) stepAll(0.02); },
  };

})();
