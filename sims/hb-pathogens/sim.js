/* =========================================================
   고등학교 생명과학 Ⅱ. 항상성과 몸의 조절 - 병원체의 종류
   성취기준 [12생과02-05] 병원체의 종류와 특징을 이해하고 우리 몸의 방어 작용을 선천적 면역과 후천적 면역으로 구분하여 설명할 수 있다. (앞부분: 병원체)
   ① 관찰: 병원체 비교  ② 분석: 증식과 전염  ③ 탐구: 질병 분류  ④ 적용: 예방·치료
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
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
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

  /* ============ 자료 ============ */
  const PATH = {
    virus: { name: '바이러스', col: '#7c3aed', cell: '없음', nuc: '없음', body: '세포가 아님', size: '약 0.1 µm (100 nm)', tool: '전자 현미경 ×200,000', ex: '독감, 홍역', lo: -1.3, hi: -0.52, mk: -1, szl: '약 0.1 µm', note: '단백질 껍질 속에 유전 물질(핵산)만 있어요. 세포가 아니에요.' },
    bact: { name: '세균', col: '#16a34a', cell: '있음', nuc: '없음', body: '단세포', size: '약 1~5 µm', tool: '광학 현미경 ×1,000', ex: '결핵, 식중독(살모넬라)', lo: 0, hi: 0.7, mk: null, szl: '약 1~5 µm', note: '핵막이 없는 원핵세포예요. DNA가 세포질에 있어요.' },
    fungus: { name: '곰팡이', col: '#b45309', cell: '있음', nuc: '있음', body: '다세포', size: '균사 폭 약 5 µm', tool: '광학 현미경 ×400', ex: '무좀', lo: 0.48, hi: 1.0, mk: null, szl: '균사 폭 약 5 µm', note: '실 모양의 균사로 이루어진 진핵생물(균계)이에요.' },
    proto: { name: '원생생물', col: '#0891b2', cell: '있음', nuc: '있음', body: '단세포', size: '수십 µm', tool: '광학 현미경 ×400', ex: '말라리아(원충)', lo: 1.0, hi: 2.0, mk: null, szl: '수십 µm', note: '핵막이 있는 진핵 단세포 생물이에요.' },
    worm: { name: '기생충', col: '#be185d', cell: '있음', nuc: '있음', body: '다세포', size: 'mm ~ m', tool: '맨눈·확대경 ×5', ex: '회충증', lo: 3.0, hi: 6.0, mk: null, szl: 'mm ~ m', note: '여러 세포로 이루어진 동물(동물계)이에요.' },
  };
  const KEYS = ['virus', 'bact', 'fungus', 'proto', 'worm'];
  const DIS = [
    { id: 'flu', label: '독감', short: '독감', sub: '바이러스', icon: '🤧', ans: 'virus', route: 'cough' },
    { id: 'measles', label: '홍역', short: '홍역', sub: '바이러스', icon: '🔴', ans: 'virus' },
    { id: 'tb', label: '결핵', short: '결핵', sub: '세균', icon: '🫁', ans: 'bact' },
    { id: 'food', label: '식중독', short: '식중독', sub: '세균(살모넬라)', icon: '🍗', ans: 'bact', route: 'food' },
    { id: 'tinea', label: '무좀', short: '무좀', sub: '곰팡이', icon: '🦶', ans: 'fungus', route: 'touch' },
    { id: 'malaria', label: '말라리아', short: '말라리아', sub: '원생생물', icon: '🦟', ans: 'proto', route: 'vector' },
    { id: 'ascar', label: '회충증', short: '회충증', sub: '기생충', icon: '🪱', ans: 'worm', route: 'water' },
    { id: 'diab', label: '당뇨병', short: '당뇨병', sub: '병원체 없음', icon: '🩸', ans: 'none' },
  ];
  const ROUTES = [
    { id: 'cough', label: '기침·재채기', sub: '비말·공기', ans: 'flu' },
    { id: 'water', label: '오염된 물·채소', sub: '음식·물', ans: 'ascar' },
    { id: 'vector', label: '모기에 물림', sub: '매개체', ans: 'malaria' },
    { id: 'touch', label: '악수·수건 공유', sub: '접촉', ans: 'tinea' },
    { id: 'blood', label: '혈액·체액', sub: '주사기 공유 등', ans: 'hepb' },
    { id: 'food', label: '상한 음식', sub: '음식·물', ans: 'food' },
  ];
  const ROUTE_CARDS = [
    { id: 'flu', label: '독감', sub: '열과 기침이 나는 호흡기 병', icon: '🤧' },
    { id: 'ascar', label: '회충증', sub: '장 속에 긴 벌레가 사는 병', icon: '🪱' },
    { id: 'malaria', label: '말라리아', sub: '주기적으로 열이 나는 병', icon: '🦟' },
    { id: 'tinea', label: '무좀', sub: '피부가 가렵고 갈라지는 병', icon: '🦶' },
    { id: 'hepb', label: 'B형 간염', sub: '간에 염증이 생기는 병', icon: '💉' },
    { id: 'food', label: '식중독', sub: '배탈과 설사가 나는 병', icon: '🍗' },
  ];
  const HOURS = [0, 1, 2, 3, 4, 5, 6];
  const nOf = (h) => 3 * h, cntOf = (h) => Math.pow(2, 3 * h);
  const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
  /* 감염 후 병원체 수(상대값): 처음엔 늘다가 면역 반응으로 줄어요 */
  const baseP = (t) => {
    const rise = 1 / (1 + Math.exp(-1.4 * (t - 3.2)));
    const fall = 1 - smooth((t - 7) / 4);
    return 100 * rise * fall;
  };

  /* ============ 상태 ============ */
  const S = { mode: 'obs', sub: { obs: 'scope', grow: 'bact', sort: '', apply: 'drug' }, fade: 0, O: null, G: null, V: null, R: null, SO: null, DR: null, BK: null };
  const SCENES = {
    obs: { label: '🔬 가상 현미경', subs: [['scope', '🔬 현미경'], ['table', '📋 비교표']] },
    grow: { label: '📈 증식과 전염', subs: [['bact', '🦠 세균'], ['virus', '🧫 바이러스'], ['route', '🔗 경로']] },
    sort: { label: '🗂 질병 분류', subs: null },
    apply: { label: '💊 예방·치료', subs: [['drug', '💊 항생제'], ['block', '🛡 경로 차단']] },
  };

  /* ================= ① 가상 현미경 · 로그 눈금 · 비교표 ================= */
  const LY = PHONE
    ? { fcx: 240, fcy: 138, fR: 118, info: { x: 8, y: 262, w: 464, h: 98 }, size: { x: 8, y: 368, w: 464, h: 266 }, tab: { x: 8, y: 12, w: 464, labW: 92, headH: 52, rowH: 62 } }
    : { fcx: 206, fcy: 230, fR: 180, info: { x: 16, y: 424, w: 380, h: 122 }, size: { x: 404, y: 14, w: 380, h: 532 }, tab: { x: 16, y: 20, w: 768, labW: 150, headH: 46, rowH: 62 } };
  function makeObs() {
    S.O = { cur: null, dwell: 0, seen: {}, zoom: 0, table: null };
    S.O.table = new CellTable({
      x: LY.tab.x, y: LY.tab.y, w: LY.tab.w, labW: LY.tab.labW, headH: LY.tab.headH, rowH: LY.tab.rowH,
      cols: [{ label: PHONE ? '세포\n구조' : '세포 구조', opts: ['없음', '있음'] }, { label: PHONE ? '핵\n(핵막)' : '핵 (핵막)', opts: ['없음', '있음'] }, { label: '몸 구성', opts: ['세포가 아님', '단세포', '다세포'] }],
      rows: KEYS.map((k) => PATH[k].name),
      ans: KEYS.map((k) => [PATH[k].cell === '있음' ? 1 : 0, PATH[k].nuc === '있음' ? 1 : 0, PATH[k].body === '세포가 아님' ? 0 : PATH[k].body === '단세포' ? 1 : 2]),
      onChange() { rlast = ''; },
    });
    S.O.table.o.cols.forEach((c) => { if (PHONE) c.label = c.label.replace('\n', ' '); });
  }
  function pickSample(k) {
    const O = S.O; if (O.cur === k) return;
    O.cur = k; O.dwell = 0; O.zoom = 0; Sound.click(); rlast = '';
  }
  function callout(x1, y1, x2, y2, text, col) {
    ctx.save(); ctx.strokeStyle = col || '#334155'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = col || '#334155'; ctx.beginPath(); ctx.arc(x1, y1, 3.2, 0, TAU); ctx.fill(); ctx.restore();
    D.label(x2, y2, text, { bg: 'rgba(255,255,255,.95)', color: '#1f2937', size: PHONE ? 12 : 13, border: col || '#334155', pad: 7 });
  }
  function scaleBar(cx, cy, R, px, text) {
    const x = cx + R * 0.1, y = cy + R * 0.86;
    ctx.save(); ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + px, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.moveTo(x + px, y - 5); ctx.lineTo(x + px, y + 5); ctx.stroke(); ctx.restore();
    T(x + px / 2, y - 9, text, 13, '#111827', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
  }
  function drawSpecimen(k, cx, cy, R, z) {
    const t = clock, calls = [], CL = (...a) => calls.push(a);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
    if (k === 'virus') { bg.addColorStop(0, '#d9dee3'); bg.addColorStop(1, '#8e98a3'); }
    else if (k === 'worm') { bg.addColorStop(0, '#f4f9fb'); bg.addColorStop(1, '#cfdde3'); }
    else { bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#efe3c8'); }
    ctx.fillStyle = bg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.translate(cx + Math.sin(t * 0.7) * 3, cy + Math.cos(t * 0.9) * 2.4); ctx.scale(0.55 + 0.45 * z, 0.55 + 0.45 * z); ctx.globalAlpha = clamp(z * 1.6, 0, 1);
    ctx.translate(-cx, -cy);
    const u = R / 180;
    if (k === 'virus') {
      const r = R * 0.19;
      const spots = [[-0.52, -0.38, 0.4], [0.5, -0.45, 1.6], [-0.58, 0.32, 2.3], [0.55, 0.3, 3.1], [0.05, 0.62, 4.2]];
      spots.forEach((s, i) => { const bx = cx + s[0] * R + Math.sin(t * 0.8 + s[2]) * 9, by = cy + s[1] * R + Math.cos(t * 0.7 + s[2] * 1.3) * 8; drawVirus(bx, by, r, t * 0.15 + i, '#7c3aed'); });
      // 가운데: 속이 보이는 모형
      const mx = cx, my = cy - R * 0.02;
      D.glow(mx, my, r * 2.2, '#c4b5fd', 0.45);
      drawVirus(mx, my, r * 1.0, 0.2, '#7c3aed');
      ctx.save(); ctx.strokeStyle = '#fecdd3'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU * 2.4; const rr = r * (0.18 + 0.46 * (i / 40)); const px = mx + Math.cos(a) * rr * 0.9, py = my + Math.sin(a) * rr * 0.9; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      CL(mx + r * 0.1, my - r * 0.12, cx + R * 0.0, cy - R * 0.72, '유전 물질(핵산)', '#9d174d');
      CL(mx + r * 0.85, my + r * 0.6, cx + R * 0.38, cy + R * 0.68 - 22 * u, '단백질 껍질', '#4c1d95');
      CL(mx - r * 1.35, my - r * 0.5, cx - R * 0.46, cy - R * 0.52 - 32 * u, '표면 돌기', '#334155');
      scaleBar(cx, cy, R, r * 2, '100 nm');
    } else if (k === 'bact') {
      const r = R * 0.115, pxum = r * 1.52;
      const rods = [[-0.38, -0.3, 0.3, 1], [0.32, -0.42, -0.5, 1], [-0.1, 0.12, 1.2, 1], [-0.46, 0.46, -0.2, 1], [0.42, 0.34, 0.7, 1]];
      rods.forEach((s, i) => { const bx = cx + s[0] * R + Math.sin(t * 0.9 + i) * 7, by = cy + s[1] * R + Math.cos(t * 0.8 + i * 1.7) * 6; drawBact(bx, by, r, s[2] + Math.sin(t * 0.6 + i) * 0.15, '#16a34a', { len: 1.9, flagella: i === 0 || i === 3 }); });
      // 둥근 세균 (구균)
      [[0.12, -0.66], [0.62, 0.0]].forEach((s, i) => { const bx = cx + s[0] * R + Math.sin(t + i) * 5, by = cy + s[1] * R + Math.cos(t * 0.9 + i) * 5; D.sphere(bx, by, pxum * 0.5 + 4, '#4ade80', { gloss: true }); });
      CL(cx - R * 0.38 - 6, cy - R * 0.3 - r * 0.55, cx - R * 0.58, cy - R * 0.68, '세포벽', '#14532d');
      CL(cx - R * 0.38 + r * 0.6, cy - R * 0.3 + 2, cx + R * 0.3, cy - R * 0.82 + 6 * u, 'DNA (핵막 없음)', '#1e3a8a');
      CL(cx - R * 0.46 - r * 1.8, cy + R * 0.46, cx - R * 0.45, cy + R * 0.72, '편모', '#14532d');
      scaleBar(cx, cy, R, pxum * 1, '1 µm');
    } else if (k === 'fungus') {
      const w = R * 0.085;
      const hyph = (pts, wi) => {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const path = () => { ctx.beginPath(); pts.forEach((p, i) => { const x = cx + p[0] * R, y = cy + p[1] * R; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); };
        path(); ctx.strokeStyle = '#7c4a12'; ctx.lineWidth = wi + 5; ctx.stroke();
        path(); ctx.strokeStyle = '#f0d9a8'; ctx.lineWidth = wi; ctx.stroke();
        // 가로벽(격막)
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], L = Math.hypot((b[0] - a[0]) * R, (b[1] - a[1]) * R), n = Math.floor(L / (R * 0.34));
          for (let q = 1; q <= n; q++) { const f = q / (n + 1), x = cx + (a[0] + (b[0] - a[0]) * f) * R, y = cy + (a[1] + (b[1] - a[1]) * f) * R, nx = -(b[1] - a[1]) / (L / R), ny = (b[0] - a[0]) / (L / R); ctx.strokeStyle = '#7c4a12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - nx * wi * 0.5, y - ny * wi * 0.5); ctx.lineTo(x + nx * wi * 0.5, y + ny * wi * 0.5); ctx.stroke(); D.sphere(x + (b[0] - a[0]) * R / (n + 1) * 0.5, y + (b[1] - a[1]) * R / (n + 1) * 0.5, wi * 0.3, '#7e22ce', { gloss: false }); }
        }
        ctx.restore();
      };
      hyph([[-0.8, 0.25], [-0.45, 0.1], [-0.1, 0.2], [0.3, 0.05], [0.7, -0.2]], w);
      hyph([[-0.1, 0.2], [0.05, 0.55], [0.3, 0.8]], w * 0.9);
      hyph([[-0.45, 0.1], [-0.55, -0.3], [-0.4, -0.65]], w * 0.9);
      hyph([[0.3, 0.05], [0.4, -0.35], [0.28, -0.7]], w * 0.85);
      [[-0.4, -0.7], [0.28, -0.74]].forEach((s, i) => { for (let q = 0; q < 5; q++) D.sphere(cx + s[0] * R + Math.cos(q * 1.3 + i) * 9, cy + s[1] * R + Math.sin(q * 1.3 + i) * 9, 5, '#d6a756', { gloss: false }); });
      CL(cx - R * 0.78, cy + R * 0.22, cx - R * 0.6, cy + R * 0.58, '균사', '#7c2d12');
      CL(cx - R * 0.27, cy + R * 0.15, cx - R * 0.06, cy - R * 0.42, '핵 (핵막 있음)', '#581c87');
      CL(cx + R * 0.52, cy - R * 0.06, cx + R * 0.46, cy + R * 0.48, '세포벽', '#7c2d12');
      scaleBar(cx, cy, R, w * 2, '10 µm');
    } else if (k === 'proto') {
      const r = R * 0.42;
      const px = cx - R * 0.04, py = cy - R * 0.02;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU; const k2 = 1 + 0.07 * Math.sin(a * 3 + t * 1.1) + 0.16 * Math.max(0, Math.sin(a * 2 - t * 0.7)) ** 2; const x = px + Math.cos(a) * r * k2, y = py + Math.sin(a) * r * k2 * 0.9; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath();
      const g = ctx.createRadialGradient(px - r * 0.2, py - r * 0.2, r * 0.1, px, py, r * 1.1); g.addColorStop(0, 'rgba(165,243,252,.9)'); g.addColorStop(1, 'rgba(34,159,189,.55)');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      D.sphere(px + r * 0.12, py - r * 0.05, r * 0.3, '#7c3aed', { gloss: true });
      D.sphere(px + r * 0.17, py - r * 0.1, r * 0.1, '#4c1d95', { gloss: false });
      [[-0.45, 0.25], [-0.2, 0.5], [0.45, 0.35], [0.4, -0.45]].forEach((s, i) => { D.sphere(px + s[0] * r, py + s[1] * r, r * (0.1 + 0.02 * (i % 2)), 'rgba(255,255,255,.8)', { gloss: false, outline: '#0e7490', outlineWidth: 1.5 }); });
      CL(px + r * 0.12, py - r * 0.05, px + R * 0.36, cy - R * 0.66, '핵 (핵막 있음)', '#581c87');
      CL(px - r * 0.98, py + r * 0.1, cx - R * 0.5, cy + R * 0.7, '세포막', '#155e75');
      CL(px - r * 0.45, py + r * 0.25, cx - R * 0.42, cy - R * 0.7, '세포 소기관', '#155e75');
      scaleBar(cx, cy, R, r * 2 / 40 * 10, '10 µm');
    } else {
      // 회충: 몸 일부를 확대경으로 본 모습
      const wd = R * 0.17;
      const pts = []; for (let i = 0; i <= 40; i++) { const f = i / 40; pts.push([cx - R * 0.95 + f * R * 1.9, cy + Math.sin(f * 6.3 + t * 0.6) * R * 0.28 - (f - 0.5) * R * 0.1]); }
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); };
      path(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = wd + 8; ctx.stroke();
      path(); ctx.strokeStyle = '#a3294e'; ctx.lineWidth = wd + 2; ctx.stroke();
      path(); ctx.strokeStyle = '#f9a8c4'; ctx.lineWidth = wd - 2; ctx.stroke();
      path(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = wd * 0.25; ctx.translate(0, -wd * 0.22); ctx.stroke(); ctx.translate(0, wd * 0.22);
      ctx.strokeStyle = 'rgba(163,41,78,.45)'; ctx.lineWidth = 1.6;
      for (let i = 2; i < 39; i++) { const a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; ctx.beginPath(); ctx.moveTo(pts[i][0] - nx * wd * 0.48, pts[i][1] - ny * wd * 0.48); ctx.lineTo(pts[i][0] + nx * wd * 0.48, pts[i][1] + ny * wd * 0.48); ctx.stroke(); }
      ctx.restore();
      const hp = pts[40];
      CL(pts[8][0], pts[8][1], cx - R * 0.52, cy - R * 0.62, '다세포 동물', '#831843');
      CL(pts[30][0], pts[30][1] + wd * 0.2, cx + R * 0.28, cy + R * 0.62, '몸 마디 줄무늬', '#831843');
      void hp;
      scaleBar(cx, cy, R, R * 0.32, '1 cm');
    }
    ctx.restore();
    // 렌즈 테두리
    ctx.save(); ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 4, 0.2, 1.4); ctx.stroke();
    const vg = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(z * 1.6, 0, 1); calls.forEach((a) => callout(...a)); ctx.restore();
  }
  const LOGMIN = -2, LOGMAX = 6;
  function drawSizes(sel) {
    const P = LY.size; panel(P.x, P.y, P.w, P.h, 16);
    T(P.x + P.w / 2, P.y + 26, '병원체의 크기 비교 (로그 눈금)', PHONE ? 14 : 15.5, '#1f2937', 'center', 800);
    const ax0 = P.x + 18 + (PHONE ? 58 : 0), ax1 = P.x + P.w - 18, axy = P.y + P.h - 40, top = P.y + 66;
    const X = (lg) => ax0 + (lg - LOGMIN) / (LOGMAX - LOGMIN) * (ax1 - ax0);
    const rh = (axy - top - 2) / 5;
    const tl = [[-1, '0.1µm'], [0, '1µm'], [1, '10µm'], [2, '100µm'], [3, '1mm'], [4, '1cm'], [5, '10cm'], [6, '1m']];
    ctx.save(); ctx.strokeStyle = '#e1e8ee'; ctx.lineWidth = 1;
    tl.forEach((q) => { ctx.beginPath(); ctx.moveTo(X(q[0]), top); ctx.lineTo(X(q[0]), axy); ctx.stroke(); });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax0, axy); ctx.lineTo(ax1, axy); ctx.stroke();
    tl.forEach((q) => { T(X(q[0]), axy + 17, q[1], PHONE ? 10.5 : 11.5, '#3a4456', 'center', 700); ctx.beginPath(); ctx.moveTo(X(q[0]), axy); ctx.lineTo(X(q[0]), axy + 5); ctx.stroke(); });
    T(P.x + P.w / 2, axy + 35, '길이 (눈금 한 칸 = 10배)', 12.5, '#26324a', 'center', 800);
    ctx.restore();
    [[Math.log10(7), '적혈구 약 7 µm', 'right'], [Math.log10(70), '머리카락 굵기 약 70 µm', 'left']].forEach((q) => {
      D.dashedLine(X(q[0]), P.y + 54, X(q[0]), axy, { color: '#94a3b8', width: 1.6, dash: [4, 4] });
      T(X(q[0]) + (q[2] === 'left' ? 4 : -4), P.y + 56, q[1], PHONE ? 11 : 11.5, '#64748b', q[2], 700);
    });
    KEYS.forEach((k, i) => {
      const p = PATH[k], y = top + i * rh, by = PHONE ? y + rh / 2 + 1 : y + rh - 24, on = sel === k, seen = S.O.seen[k];
      if (on) { D.roundRect(P.x + 6, y + 2, P.w - 12, rh - 2, 10); ctx.fillStyle = C.rgba(p.col, 0.1); ctx.fill(); }
      if (PHONE) T(P.x + 12, by + 5, (seen ? '✔' : '') + p.name, 13.5, on ? C.shade(p.col, -0.3) : '#26324a', 'left', 800); else T(ax0, y + 19, (seen ? '✔ ' : '') + p.name, 14, on ? C.shade(p.col, -0.3) : '#26324a', 'left', 800);
      const x0 = X(p.lo), x1 = X(p.hi);
      D.shadow(() => { D.roundRect(x0, by - 8, x1 - x0, 17, 8); ctx.fillStyle = p.col; ctx.fill(); }, { blur: on ? 8 : 3, y: 1 });
      if (p.mk != null) { ctx.fillStyle = '#fff'; ctx.fillRect(X(p.mk) - 1.5, by - 8, 3, 17); }
      const lw = (() => { ctx.save(); ctx.font = D.font(12.5, 800); const w = ctx.measureText(p.szl).width; ctx.restore(); return w; })();
      const right = x1 + 8 + lw < ax1 + 6;
      T(right ? x1 + 7 : x0 - 7, by + 5, p.szl, 12.5, '#26324a', right ? 'left' : 'right', 800);
    });
  }
  function drawObs(dt) {
    bgFill('#eef7f0', '#e3efe7');
    const O = S.O;
    if (S.sub.obs === 'scope') {
      O.zoom = SciSim.approach(O.zoom, 1, dt, RM ? 99 : 6);
      const cx = LY.fcx, cy = LY.fcy, R = LY.fR;
      if (O.cur) {
        drawSpecimen(O.cur, cx, cy, R, O.zoom);
        const p = PATH[O.cur];
        T(cx, cy - R - (PHONE ? 7 : 16), '관찰 도구: ' + p.tool, PHONE ? 13 : 14, '#26324a', 'center', 800);
      } else {
        D.roundRect(cx - R, cy - R, R * 2, R * 2, R); ctx.fillStyle = '#2b3442'; ctx.fill();
        ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.stroke();
        T(cx, cy - 6, '🔬', 46, '#fff', 'center', 600);
        T(cx, cy + 40, '시료를 골라 보세요', 16, '#cbd5e1', 'center', 800);
      }
      const I = LY.info; panel(I.x, I.y, I.w, I.h, 14);
      if (O.cur) {
        const p = PATH[O.cur];
        T(I.x + 14, I.y + 28, p.name, 18, C.shade(p.col, -0.25), 'left', 900);
        T(I.x + I.w - 14, I.y + 28, '크기 ' + p.size, PHONE ? 13 : 14, '#26324a', 'right', 800);
        const fs = PHONE ? 13 : 14;
        T(I.x + 14, I.y + 54, '세포 구조 ' + p.cell + '  ·  핵 ' + p.nuc + '  ·  ' + p.body, fs, '#26324a', 'left', 800);
        textBlock(I.x + 14, I.y + 76, I.w - 28, p.note + ' (예: ' + p.ex + ')', fs - 0.5, '#4b5563', 17, 700);
      } else textBlock(I.x + 14, I.y + 32, I.w - 28, '아래 단추에서 시료를 하나씩 눌러 가상 현미경으로 관찰하고, 구조와 크기를 비교해요.', 14, '#4b5563', 20, 700);
      drawSizes(O.cur);
    } else {
      const tb = O.table; tb.update(dt);
      const TY = tb.o.y + tb.h + 16;
      tb.draw();
      const bx = LY.tab.x, bw = LY.tab.w;
      panel(bx, TY, bw, VH - TY - (PHONE ? 8 : 14), 14);
      const lines = ['💡 세포 구조가 있는지, 핵막으로 싸인 핵이 있는지, 몸이 세포 몇 개로 되어 있는지를 비교해요.', '• 바이러스는 세포가 아니라서 세포 구조도 핵도 없어요.', '• 세균은 세포(원핵세포)이지만 핵막이 없어요. 곰팡이·원생생물·기생충은 핵막이 있는 진핵세포예요.'];
      let yy = TY + 26; lines.forEach((l) => { yy += textBlock(bx + 14, yy, bw - 28, l, PHONE ? 13 : 14, '#374151', PHONE ? 18 : 20, 700); yy += 3; });
    }
  }

  /* ================= ② 세균 증식 · 바이러스 증식 · 전염 경로 ================= */
  const GL = PHONE
    ? { dish: { x: 8, y: 8, w: 464, h: 200 }, dcx: 108, dcy: 108, dR: 88, gr: { x: 8, y: 216, w: 464, h: 300 }, pl: { x: 70, y: 236, w: 388, h: 216 }, tab: { x: 8, y: 524, w: 464, h: 108 } }
    : { dish: { x: 16, y: 14, w: 300, h: 336 }, dcx: 166, dcy: 160, dR: 126, gr: { x: 326, y: 14, w: 458, h: 410 }, pl: { x: 400, y: 40, w: 368, h: 316 }, tab: { x: 326, y: 432, w: 458, h: 114 }, formula: { x: 16, y: 358, w: 300, h: 188 } };
  function makeGrow() {
    const rg = mulberry(777), R = GL.dR - 14, pos = [];
    for (let i = 0; i < 130; i++) {
      let best = null;
      const parent = i === 0 ? null : pos[i - Math.pow(2, Math.floor(Math.log2(i)))];
      for (let tries = 0; tries < 60; tries++) {
        let x, y;
        if (parent) { const a = rg() * TAU, d = 18 + rg() * 22; x = parent.x + Math.cos(a) * d; y = parent.y + Math.sin(a) * d; }
        else { x = (rg() - 0.5) * 20; y = (rg() - 0.5) * 20; }
        if (Math.hypot(x, y) > R - 10) continue;
        if (pos.every((q) => Math.hypot(q.x - x, q.y - y) > 17)) { best = { x, y }; break; }
      }
      if (!best) { const a = rg() * TAU, d = Math.sqrt(rg()) * (R - 10); best = { x: Math.cos(a) * d, y: Math.sin(a) * d }; }
      best.rot = rg() * Math.PI; pos.push(best);
    }
    S.G = { h: 0, target: 0, run: false, pts: [{ h: 0 }], pos, split: 1, nPrev: 1, range: 6, pop: 0 };
  }
  function growReset() { makeGrow(); rlast = ''; syncControls(); }
  function growStep() {
    const G = S.G; if (G.run || G.pts.length >= 7) return;
    G.run = true; G.target = G.pts.length; Sound.click(); syncControls();
  }
  const Nnow = (G) => Math.pow(2, Math.floor(3 * G.h + 1e-9));
  function stepGrow(dt) {
    const G = S.G;
    if (G.split < 1) G.split = Math.min(1, G.split + dt / 0.55);
    G.pop = Math.max(0, G.pop - dt * 2);
    if (G.run) {
      const before = Math.floor(3 * G.h + 1e-9);
      G.h = Math.min(G.target, G.h + dt / (RM ? 0.05 : 1.5));
      const after = Math.floor(3 * G.h + 1e-9);
      if (after > before) { G.nPrev = Math.pow(2, before); G.split = RM ? 1 : 0; Sound.tick(); }
      if (G.h >= G.target - 1e-9) {
        G.h = G.target; G.run = false; G.pts.push({ h: G.target }); G.pop = 1; Sound.success(); rlast = '';
        const gx = growPlot(); parts.burst(gx.X(G.target), gx.Y(Math.min(cntOf(G.target), gx.o.y1)), { count: 12, speed: 120, size: 3, colors: ['#16a34a', '#86efac', '#facc15'] });
        syncControls();
      }
    }
  }
  function growPlot() {
    const G = S.G, z = G.range === 3;
    return plotBox(GL.pl, z
      ? { x0: 0, x1: 3, y0: 0, y1: 600, xt: [0, 1, 2, 3], yt: [0, 200, 400, 600], xl: '배양 시간 (시간)', yl: '세균 수 (개)', ylx: PHONE ? 52 : 62, yf: (v) => String(v) }
      : { x0: 0, x1: 6, y0: 0, y1: 300000, xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 100000, 200000, 300000], xl: '배양 시간 (시간)', yl: '세균 수 (개)', ylx: PHONE ? 54 : 64, yf: (v) => (v === 0 ? '0' : (v / 10000) + '만') });
  }
  function drawGrow(dt) {
    bgFill('#eef7f0', '#e3efe7');
    const G = S.G, N = Nnow(G), Dh = GL.dish;
    // 배양 접시
    panel(Dh.x, Dh.y, Dh.w, Dh.h, 16);
    const cx = GL.dcx, cy = GL.dcy, R = GL.dR;
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    const ag = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R); ag.addColorStop(0, '#fff4c9'); ag.addColorStop(1, '#f5dd8d');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c3cbd6'; ctx.lineWidth = 4; ctx.stroke();
    const showN = Math.min(N, 130);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, TAU); ctx.clip();
    for (let i = 0; i < showN; i++) {
      const q = G.pos[i]; let x = q.x, y = q.y, sq = 0;
      if (N <= 128 && i >= G.nPrev && G.split < 1) { const par = G.pos[i - G.nPrev] || G.pos[0], f = SciSim.ease.outCubic(G.split); x = par.x + (q.x - par.x) * f; y = par.y + (q.y - par.y) * f; sq = Math.sin(G.split * Math.PI); }
      else if (N <= 128 && i < G.nPrev && G.split < 1) sq = Math.sin(G.split * Math.PI);
      drawBact(cx + x, cy + y, 5.2, q.rot, '#16a34a', { len: 1.7, squeeze: sq, dna: false });
    }
    ctx.restore();
    if (N > 130) T(cx, cy + R - 12, '시야에 다 못 그려요 (일부만 표시)', 12.5, '#7c4a12', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
    T(Dh.x + Dh.w / 2, Dh.y + 24, PHONE ? '' : '배양 접시 (현미경 시야)', 14, '#26324a', 'center', 800);
    // 이분법 안내 + 수식
    if (PHONE) {
      textBlock(214, 40, 246, '세균은 이분법으로 늘어나요. 20분마다 한 마리가 두 마리가 돼요.', 14, '#26324a', 20, 800);
      T(214, 120, '1시간 = 20분 × 3회 → 8배', 14, '#16a34a', 'left', 900);
      T(214, 146, 'n = 3 × 시간 (회)', 14, '#26324a', 'left', 800);
      T(214, 172, 'N = 2ⁿ (개)', 15, '#be123c', 'left', 900);
    } else {
      const F = GL.formula; panel(F.x, F.y, F.w, F.h, 14);
      T(F.x + 14, F.y + 28, '이분법: 20분마다 2배', 16, '#14532d', 'left', 900);
      textBlock(F.x + 14, F.y + 54, F.w - 28, '세균 한 마리는 둘로 나뉘고, 그 둘이 또 나뉘어요.', 13.5, '#4b5563', 19, 700);
      T(F.x + 14, F.y + 108, '1시간 = 20분 × 3회 → 8배', 15, '#16a34a', 'left', 900);
      T(F.x + 14, F.y + 136, '분열 횟수 n = 3 × 시간', 15, '#26324a', 'left', 800);
      T(F.x + 14, F.y + 164, '세균 수 N = 2ⁿ (개)', 16, '#be123c', 'left', 900);
    }
    // 그래프
    const Gr = GL.gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 16);
    const P = growPlot(); P.drawAxes();
    ctx.save(); ctx.beginPath(); ctx.rect(P.b.x, P.b.y - 4, P.b.w + 2, P.b.h + 4); ctx.clip();
    const hmax = G.pts.length ? G.pts[G.pts.length - 1].h : 0, hcur = G.run ? G.h : hmax;
    if (hcur > 0) {
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const h = hcur * i / 120, x = P.X(h), y = P.Y(cntOf(h)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
    G.pts.forEach((p, i) => {
      const v = cntOf(p.h);
      if (p.h > P.o.x1 || v > P.o.y1) return;
      const x = P.X(p.h), y = P.Y(v), pp = i === G.pts.length - 1 ? G.pop : 0;
      D.sphere(x, y, 6 + pp * 4, '#be123c', { gloss: true, outline: '#fff', outlineWidth: 2 });
      if (v >= 8 || p.h === 0) T(x + (p.h > P.o.x1 * 0.8 ? -9 : 9), y - 9, fmtN(v), 12.5, '#9f1239', p.h > P.o.x1 * 0.8 ? 'right' : 'left', 900, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    });
    if (G.range === 3) T(P.b.x + P.b.w - 6, P.b.y + 18, '4시간 이후의 점은 이 그래프 밖에 있어요', 12, '#6b7280', 'right', 700);
    // 표
    const Tb = GL.tab; panel(Tb.x, Tb.y, Tb.w, Tb.h, 14);
    const labW = PHONE ? 74 : 92, cw = (Tb.w - labW - 10) / 7, rh = (Tb.h - 12) / 3;
    const rowsL = ['시간 (시간)', '분열 횟수 n', '세균 수 N (개)'];
    rowsL.forEach((l, r) => {
      const y = Tb.y + 6 + r * rh;
      ctx.fillStyle = r === 0 ? '#e6f3ea' : r === 1 ? '#f4f7f5' : '#fdecef'; D.roundRect(Tb.x + 6, y + 1, Tb.w - 12, rh - 2, 6); ctx.fill();
      TF(Tb.x + 12, y + rh / 2 + 5, l, labW - 10, 12.5, 10, '#26324a', 'left', 800);
      HOURS.forEach((h, c) => {
        const has = G.pts.some((p) => p.h === h), x = Tb.x + labW + c * cw + cw / 2, cur = !G.run && hmax === h;
        if (r === 0) T(x, y + rh / 2 + 5, String(h), 13, '#14532d', 'center', 800);
        else if (has) TF(x, y + rh / 2 + 5, r === 1 ? String(nOf(h)) : fmtN(cntOf(h)), cw - 3, 12.5, 9.5, r === 2 ? '#9f1239' : '#26324a', 'center', cur ? 900 : 800);
        else T(x, y + rh / 2 + 5, '·', 14, '#b8c2bc', 'center', 800);
      });
    });
  }

  /* ----- 바이러스 증식 ----- */
  const VL = PHONE
    ? { L: { x: 8, y: 8, w: 168, h: 230 }, R: { x: 184, y: 8, w: 288, h: 230 }, gr: { x: 8, y: 246, w: 464, h: 270 }, pl: { x: 68, y: 268, w: 388, h: 190 }, txt: { x: 8, y: 524, w: 464, h: 108 } }
    : { L: { x: 16, y: 14, w: 250, h: 296 }, R: { x: 276, y: 14, w: 508, h: 296 }, gr: { x: 16, y: 320, w: 768, h: 226 }, pl: { x: 92, y: 340, w: 480, h: 150 }, txt: null };
  const PROD = 3.6, YIELD = 6, RUNLEN = 12;
  function makeVirus() {
    const R = VL.R, fr = PHONE ? [[0.2, 0.28], [0.7, 0.22], [0.3, 0.7], [0.78, 0.66], [0.52, 0.46]] : [[0.17, 0.3], [0.5, 0.2], [0.84, 0.32], [0.3, 0.72], [0.7, 0.72]];
    const cr = Math.min(R.w, R.h) * (PHONE ? 0.14 : 0.13);
    S.V = {
      t: 0, run: false, done: false, cr, ser: [{ t: 0, a: 1, b: 1 }], acc: 0, inf: 0,
      cells: fr.map((f) => ({ x: R.x + f[0] * R.w, y: R.y + 30 + f[1] * (R.h - 40), st: 'h', t0: 0, claimed: false, flash: 0, ghost: 0 })),
      free: [{ x: R.x + R.w * 0.5 + 40, y: R.y + R.h - 28, vx: 0, vy: 0, tg: null, a: 0 }],
      lv: { x: VL.L.x + VL.L.w / 2, y: VL.L.y + VL.L.h / 2 + 10, vx: 14, vy: 9 },
    };
  }
  function virusAssign() {
    const V = S.V;
    V.free.forEach((v) => {
      if (v.tg && v.tg.st === 'h') return; v.tg = null;
      let best = null, bd = 1e9;
      V.cells.forEach((c) => { if (c.st === 'h' && !c.claimed) { const d = Math.hypot(c.x - v.x, c.y - v.y); if (d < bd) { bd = d; best = c; } } });
      if (best) { best.claimed = true; v.tg = best; }
    });
  }
  function virusRun() { const V = S.V; if (V.done) makeVirus(); S.V.run = true; virusAssign(); Sound.click(); rlast = ''; syncControls(); }
  const vtotal = () => S.V.free.length + S.V.cells.reduce((s, c) => s + (c.st === 'i' ? 1 + Math.floor((YIELD - 1) * clamp((S.V.t - c.t0) / PROD, 0, 1)) : 0), 0);
  function stepVirus(dt) {
    const V = S.V, R = VL.R, L = VL.L;
    V.cells.forEach((c) => { c.flash = Math.max(0, c.flash - dt * 2); if (c.st === 'd') c.ghost = Math.min(1, c.ghost + dt * 2); });
    // 왼쪽 상자: 세포 없는 배양액의 바이러스는 그냥 떠돌아다녀요
    const lv = V.lv; lv.x += lv.vx * dt; lv.y += lv.vy * dt; lv.vx += (Math.random() - 0.5) * 30 * dt; lv.vy += (Math.random() - 0.5) * 30 * dt;
    if (lv.x < L.x + 24 || lv.x > L.x + L.w - 24) lv.vx *= -1; if (lv.y < L.y + 44 || lv.y > L.y + L.h - 24) lv.vy *= -1;
    lv.x = clamp(lv.x, L.x + 24, L.x + L.w - 24); lv.y = clamp(lv.y, L.y + 44, L.y + L.h - 24);
    V.free.forEach((v) => {
      v.a = Math.min(1, v.a + dt * 3);
      if (v.tg && V.run) {
        v.x = SciSim.approach(v.x, v.tg.x, dt, RM ? 99 : 1.5); v.y = SciSim.approach(v.y, v.tg.y, dt, RM ? 99 : 1.5);
        if (Math.hypot(v.x - v.tg.x, v.y - v.tg.y) < V.cr * 0.85) { v.hit = true; }
      } else {
        v.vx += (Math.random() - 0.5) * 40 * dt; v.vy += (Math.random() - 0.5) * 40 * dt;
        v.vx = clamp(v.vx, -28, 28); v.vy = clamp(v.vy, -28, 28);
        if (V.run || v.vx || v.vy) { v.x += v.vx * dt; v.y += v.vy * dt; }
        if (v.x < R.x + 14 || v.x > R.x + R.w - 14) v.vx *= -1; if (v.y < R.y + 40 || v.y > R.y + R.h - 14) v.vy *= -1;
        v.x = clamp(v.x, R.x + 14, R.x + R.w - 14); v.y = clamp(v.y, R.y + 40, R.y + R.h - 14);
      }
    });
    if (!V.run) return;
    V.t += dt; V.acc += dt;
    // 침입
    for (let i = V.free.length - 1; i >= 0; i--) {
      const v = V.free[i];
      if (v.hit && v.tg && v.tg.st === 'h') { v.tg.st = 'i'; v.tg.t0 = V.t; v.tg.flash = 1; V.inf++; V.free.splice(i, 1); Sound.tick(); parts.burst(v.tg.x, v.tg.y, { count: 8, speed: 70, size: 2.6, colors: ['#a78bfa', '#ddd6fe'] }); }
    }
    // 터짐
    V.cells.forEach((c) => {
      if (c.st === 'i' && V.t - c.t0 >= PROD) {
        c.st = 'd'; c.flash = 1; Sound.success();
        parts.burst(c.x, c.y, { count: 22, speed: 170, size: 3.2, colors: ['#8b5cf6', '#c4b5fd', '#fda4af', '#fff'], gravity: 40 });
        for (let q = 0; q < YIELD; q++) { const a = q / YIELD * TAU + 0.3; V.free.push({ x: c.x + Math.cos(a) * V.cr * 0.5, y: c.y + Math.sin(a) * V.cr * 0.5, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, tg: null, a: 1 }); }
        virusAssign();
      }
    });
    while (V.acc >= 0.1) { V.acc -= 0.1; V.ser.push({ t: V.t, a: 1, b: vtotal() }); }
    if (V.t >= RUNLEN) { V.run = false; V.done = true; V.ser.push({ t: RUNLEN, a: 1, b: vtotal() }); rlast = ''; syncControls(); }
  }
  function drawHost(c, cr) {
    const alpha = c.st === 'd' ? 0.45 : 1;
    ctx.save(); ctx.globalAlpha = alpha;
    if (c.st === 'd') ctx.setLineDash([5, 4]);
    drawBlob(c.x, c.y, cr, c.st === 'i' ? '#fbb6c4' : '#f9c9a8', c.st === 'd' ? '#9ca3af' : '#c2410c', c.x);
    ctx.setLineDash([]);
    if (c.st !== 'd') {
      D.sphere(c.x - cr * 0.18, c.y - cr * 0.1, cr * 0.32, '#8b5cf6', { gloss: true });
      D.sphere(c.x - cr * 0.18, c.y - cr * 0.1, cr * 0.11, '#4c1d95', { gloss: false });
    }
    ctx.restore();
    if (c.st === 'i') {
      const n = 1 + Math.floor((YIELD - 1) * clamp((S.V.t - c.t0) / PROD, 0, 1));
      for (let q = 0; q < n; q++) { const a = q / YIELD * TAU + 0.6; drawVirus(c.x + cr * 0.12 + Math.cos(a) * cr * 0.5, c.y + cr * 0.1 + Math.sin(a) * cr * 0.5, cr * 0.17, a, '#7c3aed'); }
      const p = clamp((S.V.t - c.t0) / PROD, 0, 1);
      D.roundRect(c.x - cr * 0.7, c.y + cr * 1.1, cr * 1.4, 6, 3); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fill();
      D.roundRect(c.x - cr * 0.7, c.y + cr * 1.1, cr * 1.4 * p, 6, 3); ctx.fillStyle = '#8b5cf6'; ctx.fill();
    }
    if (c.flash > 0) D.glow(c.x, c.y, cr * 1.8, c.st === 'd' ? '#f43f5e' : '#a78bfa', c.flash * 0.7);
  }
  function drawVirusScene(dt) {
    bgFill('#f3effa', '#e7e1f3');
    const V = S.V, L = VL.L, R = VL.R, cr = V.cr;
    [[L, '세포 없는 배양액', '#dbe4ee'], [R, '숙주 세포가 있는 배양액', '#fdeee6']].forEach((q) => {
      const b = q[0]; D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = q[2]; ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = '#a8b3c2'; ctx.lineWidth = 2.5; D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.stroke();
      TF(b.x + b.w / 2, b.y + 26, q[1], b.w - 16, 15, 12, '#26324a', 'center', 900);
    });
    drawVirus(V.lv.x, V.lv.y, cr * 0.42, clock * 0.2, '#7c3aed');
    T(L.x + L.w / 2, L.y + L.h - 10, '증식 못 함', 13, '#6b7280', 'center', 800);
    V.cells.forEach((c) => drawHost(c, cr));
    V.free.forEach((v) => { ctx.save(); ctx.globalAlpha = v.a; drawVirus(v.x, v.y, cr * 0.42, clock * 0.3 + v.x, '#7c3aed'); ctx.restore(); });
    // 그래프
    const G = VL.gr; panel(G.x, G.y, G.w, G.h, 16);
    const P = plotBox(VL.pl, { x0: 0, x1: RUNLEN, y0: 0, y1: 30, xt: [0, 2, 4, 6, 8, 10, 12], yt: [0, 10, 20, 30], xl: '경과 시간 (가상 시간, 시간)', yl: '바이러스 수 (개)', ylx: 42 });
    P.drawAxes();
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 3;
    [['a', '#64748b'], ['b', '#7c3aed']].forEach((s) => {
      ctx.strokeStyle = s[1]; ctx.beginPath(); V.ser.forEach((p, i) => { const x = P.X(p.t), y = P.Y(p[s[0]]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    });
    ctx.restore();
    const lx = P.b.x + P.b.w + (PHONE ? -150 : 12), ly = P.b.y + (PHONE ? 14 : 12);
    if (PHONE) { D.roundRect(P.b.x + 8, P.b.y + 6, 190, 44, 8); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill(); }
    [['세포 없는 배양액', '#64748b'], ['숙주 세포가 있는 배양액', '#7c3aed']].forEach((s, i) => {
      const yy = PHONE ? P.b.y + 20 + i * 20 : ly + i * 26, xx = PHONE ? P.b.x + 16 : lx;
      ctx.fillStyle = s[1]; ctx.fillRect(xx, yy - 5, 18, 5); T(xx + 24, yy + 1, s[0], PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    });
    if (!PHONE) {
      const X0 = P.b.x + P.b.w + 14;
      textBlock(X0, P.b.y + 80, 768 + 16 - X0 - 8, V.done ? '숙주 세포가 있을 때만 바이러스가 늘었어요. 세포가 터지며 새 바이러스가 나와 다른 세포를 감염시켜요.' : '바이러스는 스스로 분열하지 못해요. 숙주 세포 안의 물질로 자기 복제본을 만들어요.', 13.5, '#4b5563', 19, 700);
    } else {
      const X = VL.txt; panel(X.x, X.y, X.w, X.h, 14);
      textBlock(X.x + 12, X.y + 26, X.w - 24, V.done ? '숙주 세포가 있을 때만 바이러스가 늘었어요. 세포가 터지며 새 바이러스가 나와 다른 세포를 감염시켜요.' : '바이러스는 스스로 분열하지 못해요. 숙주 세포 안의 물질로 자기 복제본을 만들어요.', 13.5, '#4b5563', 19, 700);
    }
    if (!V.run && !V.done && V.t === 0) T(R.x + R.w / 2, R.y + R.h - 8, '▶ 시간 흐르기를 눌러요', 13, '#7c2d12', 'center', 800);
  }

  /* ----- 전염 경로 연결 (짝짓기) ----- */
  function makeRoute() {
    const slots = ROUTES.map((r, i) => {
      if (PHONE) { const y = 8 + i * 70; return { id: r.id, x: 8, y, w: 464, h: 64, col: '#0891b2', route: r, card: { x: 240, y: y + 7, w: 224, h: 50 } }; }
      const y = 14 + i * 71; return { id: r.id, x: 16, y, w: 508, h: 65, col: '#0891b2', route: r, card: { x: 292, y: y + 6, w: 224, h: 53 } };
    });
    slots.forEach((s) => {
      s.draw = (q) => {
        TF(q.x + 12, q.y + 27, q.route.label, 150, 15.5, 12, '#0e4f5f', 'left', 900);
        T(q.x + 12, q.y + 49, q.route.sub, 13, '#4b5563', 'left', 700);
        T(q.x + (PHONE ? 220 : 270) - 4, q.y + q.h / 2 + 6, '→', 20, '#0891b2', 'center', 900);
      };
    });
    S.R = new Matcher({
      cards: ROUTE_CARDS.map((c) => Object.assign({}, c, { col: '#0891b2' })), slots,
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 446 + Math.floor(i / 2) * 63 }) : (i) => ({ x: 548, y: 20 + i * 71 }),
      cw: PHONE ? 228 : 236, ch: PHONE ? 54 : 56, onChange() { rlast = ''; },
    });
  }
  function drawRoute(dt) {
    bgFill('#eef7f5', '#e1eeeb');
    const M = S.R; M.update(dt); M.drawSlots();
    if (!PHONE) {
      T(666, 14 + 6 * 71 + 18, '← 카드를 끌어서 왼쪽 칸에 넣어요', 13, '#0e4f5f', 'center', 800);
      panel(16, 14 + 6 * 71 + 4, 508, VH - (14 + 6 * 71 + 4) - 8, 12);
      TF(270, 14 + 6 * 71 + 36, '병원체는 여러 경로로 사람에서 사람으로 옮겨져요.', 480, 14, 11, '#26324a', 'center', 800);
    } else {
      TF(240, 436, '↓ 질병 카드를 끌어서 위 칸에 넣어요', 440, 14, 11, '#0e4f5f', 'center', 800);
    }
    M.drawCards();
  }

  /* ================= ③ 질병 분류 ================= */
  const SBOX = [
    { id: 'virus', label: '바이러스', col: '#7c3aed' }, { id: 'bact', label: '세균', col: '#16a34a' }, { id: 'fungus', label: '곰팡이', col: '#b45309' },
    { id: 'proto', label: '원생생물', col: '#0891b2' }, { id: 'worm', label: '기생충', col: '#be185d' }, { id: 'none', label: '병원체 없음 (비감염성)', col: '#475569' },
  ];
  function makeSort() {
    const boxes = SBOX.map((b, i) => {
      if (PHONE) { const col = i % 2, row = Math.floor(i / 2); return Object.assign({}, b, { x: 8 + col * 238, y: 8 + row * 112, w: 226, h: 104, cols: 1, hdr: 28 }); }
      const col = i % 3, row = Math.floor(i / 3); return Object.assign({}, b, { x: 16 + col * 258, y: 14 + row * 156, w: 250, h: 148, cols: 1, hdr: 28 });
    });
    S.SO = new Sorter({
      cards: DIS.map((d) => Object.assign({}, d, { sub: null, col: '#475569' })), boxes,
      tray: PHONE ? (i) => ({ x: 8 + (i % 2) * 238, y: 364 + Math.floor(i / 2) * 54 }) : (i) => ({ x: 16 + (i % 4) * 193, y: 340 + Math.floor(i / 4) * 64 }),
      cw: PHONE ? 228 : 186, ch: PHONE ? 48 : 56, kh: PHONE ? 22 : 28, onChange() { rlast = ''; },
    });
  }
  function drawSortScene(dt) {
    bgFill('#f1f5f2', '#e3ece6');
    const so = S.SO; so.update(dt); so.drawBoxes();
    // 상자 머리에 작은 병원체 그림
    so.boxes.forEach((b) => {
      const x = b.x + 22, y = b.y + 14;
      if (b.id === 'virus') drawVirus(b.x + b.w - 20, y, 8, 0, '#7c3aed');
      else if (b.id === 'bact') drawBact(b.x + b.w - 22, y, 4.8, 0.3, '#16a34a', { len: 1.7, dna: false });
      else if (b.id === 'fungus') { ctx.strokeStyle = '#a16207'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x + b.w - 34, y + 3); ctx.lineTo(b.x + b.w - 22, y - 3); ctx.lineTo(b.x + b.w - 10, y + 3); ctx.stroke(); }
      else if (b.id === 'proto') { ctx.fillStyle = 'rgba(8,145,178,.6)'; ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(b.x + b.w - 22, y, 12, 8, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); D.sphere(b.x + b.w - 20, y, 3.4, '#7c3aed', { gloss: false }); }
      else if (b.id === 'worm') { ctx.strokeStyle = '#be185d'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const px = b.x + b.w - 38 + i * 3.2, py = y + Math.sin(i * 0.9) * 4; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
      void x;
    });
    so.drawCards();
    if (!PHONE) { const ty = 340 + 2 * 64 + 6; panel(16, ty, 768, VH - ty - 12, 12); TF(400, ty + 32, '카드는 눌러서 선택하거나 끌어서 상자에 넣을 수 있어요. 병원체가 없는 병은 마지막 상자예요.', 740, 14, 11, '#26324a', 'center', 800); }
  }

  /* ================= ④ 항생제 · 경로 차단 ================= */
  const DL = PHONE
    ? { A: { x: 8, y: 8, w: 464, h: 236 }, B: { x: 8, y: 252, w: 464, h: 236 }, strip: { x: 8, y: 496, w: 464, h: 136 }, field: [0.0, 32, 1.0, 62], pl: [66, 104, 376, 96] }
    : { A: { x: 16, y: 14, w: 380, h: 372 }, B: { x: 404, y: 14, w: 380, h: 372 }, strip: { x: 16, y: 394, w: 768, h: 152 }, field: [0.0, 34, 1.0, 120], pl: [62, 190, 292, 128] };
  function makeDrug() {
    S.DR = { day: 0, run: false, given: { A: null, B: null }, ptsA: [], ptsB: [], maxDay: 12, drops: [], sawEnd: false };
  }
  const MAXD = 12;
  function pOf(who, t) {
    const DR = S.DR, b = baseP(t);
    if (who === 'B' && DR.given.B != null && t > DR.given.B) return Math.min(b, baseP(DR.given.B) * Math.exp(-1.1 * (t - DR.given.B)));
    return b;
  }
  function drugGive(who) {
    const DR = S.DR; if (DR.given[who] != null) return;
    DR.given[who] = DR.day; Sound.success(); rlast = '';
    const f = fieldRect(who);
    for (let i = 0; i < 12; i++) DR.drops.push({ who, x: f.x + 20 + Math.random() * (f.w - 40), y: f.y - 8 - Math.random() * 30, vy: 60 + Math.random() * 30, t: 0, life: 3.5, ok: who === 'B', vx: (Math.random() - 0.5) * 20 });
    syncControls();
  }
  function fieldRect(who) {
    const Pn = who === 'A' ? DL.A : DL.B;
    return PHONE ? { x: Pn.x + 12, y: Pn.y + 34, w: Pn.w - 24, h: 62 } : { x: Pn.x + 14, y: Pn.y + 40, w: Pn.w - 28, h: 126 };
  }
  function stepDrug(dt) {
    const DR = S.DR;
    if (DR.run) {
      DR.day = Math.min(MAXD, DR.day + dt * (RM ? 8 : 1));
      if (DR.day >= MAXD) { DR.run = false; DR.sawEnd = true; syncControls(); }
    }
    ['A', 'B'].forEach((who) => {
      const arr = who === 'A' ? DR.ptsA : DR.ptsB, f = fieldRect(who);
      const want = Math.round(pOf(who, DR.day) / 100 * (PHONE ? 22 : 34));
      const alive = arr.filter((p) => !p.die);
      while (alive.length < want) { const p = { x: f.x + 14 + Math.random() * (f.w - 28), y: f.y + 14 + Math.random() * (f.h - 28), vx: rnd(-14, 14), vy: rnd(-14, 14), s: 0, rot: Math.random() * TAU, die: 0 }; arr.push(p); alive.push(p); }
      while (alive.length > want) { const p = alive.splice(Math.floor(Math.random() * alive.length), 1)[0]; p.die = 0.001; }
      arr.forEach((p) => {
        if (p.die) { p.die += dt * 2.5; p.s = Math.max(0, 1 - p.die); if (p.die > 0.99 && !RM && who === 'B') parts.burst(p.x, p.y, { count: 4, speed: 40, size: 2, colors: ['#4ade80', '#fff'], gravity: 0 }); }
        else p.s = Math.min(1, p.s + dt * 3);
        p.vx += rnd(-1, 1) * 30 * dt; p.vy += rnd(-1, 1) * 30 * dt; p.vx = clamp(p.vx, -22, 22); p.vy = clamp(p.vy, -22, 22);
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 0.4;
        if (p.x < f.x + 10 || p.x > f.x + f.w - 10) { p.vx *= -1; p.x = clamp(p.x, f.x + 10, f.x + f.w - 10); }
        if (p.y < f.y + 10 || p.y > f.y + f.h - 10) { p.vy *= -1; p.y = clamp(p.y, f.y + 10, f.y + f.h - 10); }
      });
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i].die > 1) arr.splice(i, 1);
    });
    DR.drops.forEach((d) => { d.t += dt; const f = fieldRect(d.who); d.y += d.vy * dt; d.x += d.vx * dt; if (d.y > f.y + f.h - 8) { d.vy = d.ok ? 0 : -d.vy * 0.8; d.y = Math.min(d.y, f.y + f.h - 8); if (!d.ok && d.vy === 0) d.vy = -20; } });
    DR.drops = DR.drops.filter((d) => d.t < d.life);
  }
  function drawPatient(who) {
    const DR = S.DR, Pn = who === 'A' ? DL.A : DL.B, f = fieldRect(who);
    panel(Pn.x, Pn.y, Pn.w, Pn.h, 16);
    const virusP = who === 'A', col = virusP ? '#7c3aed' : '#16a34a';
    TF(Pn.x + 14, Pn.y + 24, (virusP ? '감기 환자 · 바이러스' : '세균성 폐렴 환자 · 세균'), Pn.w - 100, 15.5, 12, C.shade(col, -0.3), 'left', 900);
    T(Pn.x + Pn.w - 12, Pn.y + 24, DR.given[who] != null ? '💊 ' + (Math.round(DR.given[who] * 10) / 10) + '일째 투여' : '항생제 안 줌', 12.5, DR.given[who] != null ? '#0369a1' : '#6b7280', 'right', 800);
    D.roundRect(f.x, f.y, f.w, f.h, 14); ctx.fillStyle = virusP ? '#f3ecff' : '#e8f7ec'; ctx.fill(); ctx.strokeStyle = C.rgba(col, 0.6); ctx.lineWidth = 2; ctx.stroke();
    const arr = virusP ? DR.ptsA : DR.ptsB;
    arr.forEach((p) => { if (p.s <= 0.02) return; ctx.save(); ctx.globalAlpha = clamp(p.s, 0, 1); if (virusP) drawVirus(p.x, p.y, 6.5 * p.s + 1, p.rot, col); else drawBact(p.x, p.y, 4.6 * p.s + 0.6, p.rot, col, { len: 1.8, dna: false }); ctx.restore(); });
    DR.drops.filter((d) => d.who === who).forEach((d) => {
      const a = clamp(1 - d.t / d.life, 0, 1); ctx.save(); ctx.globalAlpha = a;
      D.sphere(d.x, d.y, 4, '#38bdf8', { gloss: false });
      if (!d.ok && d.y > f.y + f.h - 20) T(d.x, d.y - 8, '✕', 11, '#0369a1', 'center', 900);
      ctx.restore();
    });
    // 그래프
    const pl = DL.pl, plot = plotBox({ x: Pn.x + pl[0], y: Pn.y + pl[1], w: pl[2] - (PHONE ? 0 : 0), h: pl[3] }, { x0: 0, x1: MAXD, y0: 0, y1: 120, xt: [0, 2, 4, 6, 8, 10, 12], yt: [0, 50, 100], xl: '감염 후 시간 (일)', yl: '병원체 수 (상대값)', ylx: PHONE ? 52 : 50 });
    plot.drawAxes();
    ctx.save(); ctx.beginPath(); ctx.rect(plot.b.x, plot.b.y - 4, plot.b.w + 1, plot.b.h + 4); ctx.clip();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const t = MAXD * i / 120, x = plot.X(t), y = plot.Y(baseP(t)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    const n = Math.max(2, Math.ceil(DR.day * 12));
    for (let i = 0; i <= n; i++) { const t = DR.day * i / n, x = plot.X(t), y = plot.Y(pOf(who, t)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    if (DR.given[who] != null) { const gx = plot.X(DR.given[who]); D.dashedLine(gx, plot.b.y, gx, plot.b.y + plot.b.h, { color: '#0284c7', width: 2 }); T(gx + 3, plot.b.y + 12, '💊', 13, '#0284c7', 'left', 800); }
    D.sphere(plot.X(DR.day), plot.Y(pOf(who, DR.day)), 5.5, col, { gloss: true, outline: '#fff', outlineWidth: 2 });
    T(plot.b.x + plot.b.w - 4, plot.b.y + 14, '점선: 항생제를 안 줬을 때', 11.5, '#64748b', 'right', 700);
  }
  function drawDrug(dt) {
    bgFill('#eef4f8', '#e1e9f0');
    drawPatient('A'); drawPatient('B');
    const St = DL.strip; panel(St.x, St.y, St.w, St.h, 14);
    const DR = S.DR, a = pOf('A', DR.day), b = pOf('B', DR.day);
    T(St.x + 14, St.y + 26, '지금 ' + (Math.round(DR.day * 10) / 10) + '일째', 15.5, '#26324a', 'left', 900);
    const bw = St.w - 28;
    [['감기 환자', a, '#7c3aed', 0], ['폐렴 환자', b, '#16a34a', 1]].forEach((q) => {
      const y = St.y + 44 + q[3] * 26;
      T(St.x + 14, y + 11, q[0], 13, '#26324a', 'left', 800);
      D.roundRect(St.x + 100, y, bw - 150 - 40, 14, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      const bwid = (bw - 190) * clamp(q[1] / 120, 0, 1);
      if (bwid > 1) { D.roundRect(St.x + 100, y, Math.max(bwid, 6), 14, 7); ctx.fillStyle = q[2]; ctx.fill(); }
      T(St.x + St.w - 14, y + 12, '병원체 ' + Math.round(q[1]), 13, '#26324a', 'right', 800);
    });
    const both = DR.given.A != null && DR.given.B != null, msg = both ? (DR.day >= 8 ? '항생제는 세균(폐렴)에는 듣지만, 바이러스(감기)에는 듣지 않아요.' : '항생제를 준 뒤 두 환자의 곡선이 어떻게 달라지는지 보세요.') : '시간을 흐르게 하고 3~5일째에 두 환자에게 항생제를 주어 보세요.';
    textBlock(St.x + 14, St.y + (PHONE ? 106 : 118), St.w - 28, msg, PHONE ? 13 : 14, '#0f4c75', 18, 800);
    if (!PHONE) T(St.x + St.w - 14, St.y + St.h - 10, '교육용 모형이에요. 몸이 아플 때는 의료인과 상담해요.', 12, '#6b7280', 'right', 700);
  }

  /* ----- 경로 차단 ----- */
  const BL = PHONE
    ? { px: 52, py: 300, bx: 168, lanes: [120, 300, 480], gx: 296, dx: 54, ly: 70 }
    : { px: 90, py: 280, bx: 250, lanes: [100, 280, 460], gx: 470, dx: 100, ly: 52 };
  const BKP = [{ lane: 0 }, { lane: 0 }, { lane: 0 }, { lane: 1 }, { lane: 1 }, { lane: 2 }, { lane: 2 }];
  const LANEKEY = ['mask', 'wash', 'cook'], LANENAME = ['비말·공기', '접촉', '음식·물'];
  function personPos(i) {
    const lane = BKP[i].lane, idx = BKP.slice(0, i).filter((q) => q.lane === lane).length;
    const n = BKP.filter((q) => q.lane === lane).length;
    const yoff = n === 3 ? (idx - 1) * (PHONE ? 38 : 50) : n === 2 ? (idx - 0.5) * (PHONE ? 52 : 70) : 0;
    return { x: BL.gx + idx * BL.dx * (n === 3 ? 0.7 : 0.9), y: BL.lanes[lane] + yoff };
  }
  function makeBlock() {
    S.BK = { mask: false, wash: false, cook: false, t: -1, run: false, inf: BKP.map(() => false), germs: [], acc: 0, last: null, ranNone: false, ranAll: false, emit: [0, 0, 0], block: [0, 0, 0] };
  }
  function blockRun() {
    const B = S.BK; if (B.run) return;
    B.t = 0; B.run = true; B.inf = BKP.map(() => false); B.germs = []; B.acc = 0; B.last = null; B.emit = [0, 0, 0]; B.block = [0, 0, 0]; Sound.click(); rlast = ''; syncControls();
  }
  function stepBlock(dt) {
    const B = S.BK;
    B.germs.forEach((g) => {
      g.t += dt * (RM ? 3 : 1);
      const k = clamp(g.t / g.dur, 0, 1);
      const p1 = { x: BL.bx - 30, y: BL.lanes[g.lane] }, p0 = { x: BL.px + 30, y: BL.lanes[1] };
      if (k < 0.3) { const f = k / 0.3; g.x = lerp(p0.x, p1.x, f); g.y = lerp(p0.y, p1.y, f); }
      else { const f = (k - 0.3) / 0.7; g.x = lerp(p1.x, g.x1, f); g.y = lerp(p1.y, g.y1, f) - Math.sin(f * Math.PI) * g.arc; }
      if (!g.dead && g.stop != null && g.x >= g.stop) { g.dead = true; g.rm = true; B.block[g.lane]++; if (!RM) parts.burst(g.x, g.y, { count: 5, speed: 60, size: 2.2, colors: g.lane === 2 ? ['#fb923c', '#fde047'] : ['#4ade80', '#bbf7d0'], gravity: 0 }); }
      if (!g.dead && k >= 1) { g.dead = true; g.rm = true; const pi = g.person; if (!B.inf[pi]) { B.inf[pi] = true; if (!RM) parts.burst(g.x1, g.y1, { count: 10, speed: 90, size: 3, colors: ['#ef4444', '#fca5a5'], gravity: 0 }); } }
    });
    B.germs = B.germs.filter((g) => !g.rm);
    if (!B.run) return;
    B.t += dt * (RM ? 3 : 1); B.acc += dt * (RM ? 3 : 1);
    if (B.t < 2.2) while (B.acc >= 0.16) {
      B.acc -= 0.16;
      for (let lane = 0; lane < 3; lane++) {
        const ids = BKP.map((q, i) => (q.lane === lane ? i : -1)).filter((i) => i >= 0);
        const pi = ids[B.emit[lane] % ids.length]; B.emit[lane]++;
        const pp = personPos(pi);
        B.germs.push({ lane, person: pi, t: 0, dur: 0.95 + 0.1 * (B.emit[lane] % 3), x1: pp.x - 22, y1: pp.y, x: BL.px + 30, y: BL.lanes[1], arc: lane === 0 ? 24 : 6, stop: B[LANEKEY[lane]] ? BL.bx : null });
      }
    }
    if (B.t >= 3.6) {
      B.run = false; const n = B.inf.filter(Boolean).length; B.last = n;
      if (!B.mask && !B.wash && !B.cook && n === 7) B.ranNone = true;
      if (B.mask && B.wash && B.cook && n === 0) B.ranAll = true;
      rlast = ''; syncControls();
      if (n === 0) { parts.burst(VW / 2, VH / 2, { count: 26, speed: 200, size: 4 }); Sound.success(); }
    }
  }
  function drawPerson(x, y, inf, r) {
    D.shadow(() => { ctx.fillStyle = inf ? '#fecaca' : '#d1fae5'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = inf ? '#ef4444' : '#34d399'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    T(x, y + r * 0.38, inf ? '🤒' : '🙂', r * 1.15, '#000', 'center', 600);
  }
  function drawBlock(dt) {
    bgFill('#f6f1ea', '#ebe3d6');
    const B = S.BK, r = PHONE ? 18 : 24;
    for (let lane = 0; lane < 3; lane++) {
      const y = BL.lanes[lane], band = PHONE ? 150 : 168, bx = 8, bw = VW - 16;
      D.roundRect(bx, y - band / 2 + 4, bw, band - 8, 14); ctx.fillStyle = lane === 0 ? 'rgba(125,211,252,.22)' : lane === 1 ? 'rgba(196,181,253,.22)' : 'rgba(253,186,116,.25)'; ctx.fill();
      T(PHONE ? 18 : 20, y - band / 2 + 24, ['💨', '🤝', '🍲'][lane] + ' ' + LANENAME[lane] + ' 경로', PHONE ? 13.5 : 14.5, '#26324a', 'left', 900);
      ctx.save(); ctx.setLineDash([6, 7]); ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(BL.px + 30, BL.lanes[1]); ctx.lineTo(BL.bx - 30, y); ctx.lineTo(BL.gx - 28, y); ctx.stroke(); ctx.restore();
      // 막는 장치
      const on = B[LANEKEY[lane]], bxx = BL.bx;
      if (on) D.glow(bxx, y, 44, '#22c55e', 0.5);
      D.roundRect(bxx - 22, y - 32, 44, 64, 12); ctx.fillStyle = on ? 'rgba(220,252,231,.95)' : 'rgba(255,255,255,.55)'; ctx.fill();
      ctx.setLineDash(on ? [] : [5, 4]); ctx.strokeStyle = on ? '#16a34a' : '#94a3b8'; ctx.lineWidth = on ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.4; T(bxx, y + 6, ['😷', '🧼', '🍲'][lane], 28, '#000', 'center', 600); ctx.restore();
      T(bxx, y + 46, on ? ['마스크', '손 씻기', '익히기'][lane] : '열림', 12.5, on ? '#15803d' : '#94a3b8', 'center', 900);
      for (let i = 0; i < BKP.length; i++) if (BKP[i].lane === lane) { const pp = personPos(i); drawPerson(pp.x, pp.y, B.inf[i], r); }
    }
    // 환자
    const py = BL.lanes[1];
    D.shadow(() => { ctx.fillStyle = '#fecaca'; ctx.beginPath(); ctx.arc(BL.px, py, PHONE ? 28 : 36, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(BL.px, py, PHONE ? 28 : 36, 0, TAU); ctx.stroke();
    T(BL.px, py + (PHONE ? 11 : 14), '🤒', PHONE ? 32 : 42, '#000', 'center', 600);
    T(BL.px, py + (PHONE ? 52 : 62), '환자', 14, '#9f1239', 'center', 900);
    // 세균 알갱이
    B.germs.forEach((g) => {
      const col = g.lane === 0 ? '#38bdf8' : g.lane === 1 ? '#8b5cf6' : '#f59e0b';
      D.sphere(g.x, g.y, g.lane === 0 ? 4.2 : 5, col, { gloss: false });
    });
    if (B.last != null && !B.run) {
      const msg = B.last === 0 ? '새로 감염된 사람 0명! 모든 경로를 막았어요.' : '새로 감염된 사람 ' + B.last + ' / 7명';
      D.label(VW / 2, PHONE ? 616 : 534, msg, { bg: B.last === 0 ? '#15803d' : '#b91c1c', size: 14, pad: 12 });
    } else if (B.last == null && !B.run) T(VW / 2, PHONE ? 616 : 534, '경로를 막는 방법을 켜고 ▶ 하루 보내기를 눌러요', 13.5, '#7c2d12', 'center', 800);
    if (B.last == null && !B.run && !PHONE) T(VW - 14, 20, '교육용 모형', 12, '#6b7280', 'right', 700);
  }

  /* ============ 장면 전환 · 조작 연결 ============ */
  function onEnterView() {
    const key = viewKey();
    PT = null;
    if (key === 'obs:table') PT = S.O.table;
    else if (key === 'grow:route') PT = S.R;
    else if (key === 'sort') PT = S.SO;
  }
  function syncControls() {
    const O = S.O, G = S.G, V = S.V, DR = S.DR, B = S.BK;
    markSeg('#smpChips', 'k', O.cur);
    $$('#smpChips button').forEach((b) => b.classList.toggle('done', !!O.seen[b.dataset.k]));
    $('#smpNote').innerHTML = '관찰한 시료 <b>' + KEYS.filter((k) => O.seen[k]).length + ' / 5</b> · 시료마다 약 1초씩 살펴보세요.';
    $('#oHour').textContent = (G.pts.length ? G.pts[G.pts.length - 1].h : 0) + ' 시간';
    $('#bGrow').disabled = G.run || G.pts.length >= 7; $('#bGrow').textContent = G.pts.length >= 7 ? '✔ 6시간 배양 끝' : G.run ? '배양 중…' : '▶ 1시간 배양 · 점 찍기';
    markSeg('#rngSeg', 'r', G.range);
    $('#growNote').innerHTML = '점 <b>' + G.pts.length + ' / 7</b> (0~6시간). 20분마다 2배로 늘어요.';
    $('#bVir').disabled = V.run; $('#bVir').textContent = V.run ? '진행 중…' : V.done ? '▶ 다시 보기' : '▶ 시간 흐르기';
    $('#virNote').innerHTML = V.done ? '관찰 완료! 숙주 세포 없는 쪽은 <b>그대로 1개</b>예요.' : '왼쪽(세포 없음)과 오른쪽(숙주 세포 있음)에서 바이러스 수가 어떻게 달라지는지 보세요.';
    $('#oDay').textContent = (Math.round(DR.day * 10) / 10) + ' 일';
    $('#bDrugRun').textContent = DR.run ? '⏸ 멈추기' : DR.day >= MAXD ? '▶ 다시 보기' : DR.day > 0 ? '▶ 이어서 흐르기' : '▶ 시간 흐르기';
    $('#bDrugA').disabled = DR.given.A != null; $('#bDrugB').disabled = DR.given.B != null;
    $('#bDrugA').textContent = DR.given.A != null ? '✔ 감기 환자 투여' : '💊 감기 환자'; $('#bDrugB').textContent = DR.given.B != null ? '✔ 폐렴 환자 투여' : '💊 폐렴 환자';
    $('#drugNote').innerHTML = '항생제는 <b>세균</b>에 작용하는 약이에요. 교육용 모형이며 실제 약 복용은 의료인과 상담해요.';
    markSeg('#blkChips', 'k', '-');
    $$('#blkChips button').forEach((b) => b.classList.toggle('on', !!B[b.dataset.k]));
    $('#bBlkRun').disabled = B.run; $('#bBlkRun').textContent = B.run ? '진행 중…' : '▶ 하루 보내기';
    $('#blkNote').innerHTML = '켠 방법: <b>' + (['mask', 'wash', 'cook'].filter((k) => B[k]).map((k) => ({ mask: '마스크', wash: '손 씻기', cook: '익혀 먹기' }[k])).join(', ') || '없음') + '</b>' + (B.last != null ? ' · 마지막 결과 새 감염 <b>' + B.last + '명</b>' : '');
  }
  function resetDrug() { makeDrug(); rlast = ''; syncControls(); }
  on('#smpChips', 'click', (e) => { const b = e.target.closest('button'); if (b) { pickSample(b.dataset.k); syncControls(); } });
  on('#bTabReset', 'click', () => { Sound.click(); S.O.table.reset(); });
  on('#bGrow', 'click', growStep);
  on('#bGrowReset', 'click', () => { Sound.click(); growReset(); });
  bindSeg('#rngSeg', 'r', (r) => { S.G.range = +r; });
  on('#bVir', 'click', virusRun);
  on('#bVirReset', 'click', () => { Sound.click(); makeVirus(); rlast = ''; syncControls(); });
  on('#bRouteReset', 'click', () => { Sound.click(); S.R.reset(); });
  on('#bSortReset', 'click', () => { Sound.click(); S.SO.reset(); });
  on('#bDrugRun', 'click', () => { const DR = S.DR; Sound.click(); if (DR.day >= MAXD) { const g = DR.given; makeDrug(); S.DR.given = { A: null, B: null }; void g; } S.DR.run = !S.DR.run; syncControls(); });
  on('#bDrugReset', 'click', () => { Sound.click(); resetDrug(); });
  on('#bDrugA', 'click', () => drugGive('A'));
  on('#bDrugB', 'click', () => drugGive('B'));
  on('#blkChips', 'click', (e) => { const b = e.target.closest('button'); if (!b || S.BK.run) return; Sound.click(); S.BK[b.dataset.k] = !S.BK[b.dataset.k]; syncControls(); });
  on('#bBlkRun', 'click', blockRun);
  on('#bBlkReset', 'click', () => { Sound.click(); const o = S.BK; makeBlock(); S.BK.ranNone = o.ranNone; S.BK.ranAll = o.ranAll; syncControls(); });

  function readouts() {
    const key = viewKey(), O = S.O, G = S.G, V = S.V, DR = S.DR, B = S.BK;
    if (key === 'obs:scope') {
      const p = O.cur ? PATH[O.cur] : null;
      setReadouts([['시료', p ? p.name : '—'], ['크기', p ? p.size : '—'], ['세포 구조 · 핵', p ? p.cell + ' · ' + p.nuc : '—']]);
    } else if (key === 'obs:table') setReadouts([['채운 칸', O.table.filled + ' / ' + O.table.total], ['틀린 칸 표시', O.table.bad.flat().filter(Boolean).length + '칸'], ['관찰한 시료', KEYS.filter((k) => O.seen[k]).length + ' / 5']]);
    else if (key === 'grow:bact') { const N = Nnow(G); setReadouts([['배양 시간', (Math.floor(G.h * 10) / 10) + ' 시간'], ['분열 횟수 n', Math.floor(3 * G.h + 1e-9) + ' 회'], ['세균 수 N = 2ⁿ', fmtN(N) + ' 개']]); }
    else if (key === 'grow:virus') { setReadouts([['경과 시간', (Math.floor(V.t * 10) / 10) + ' 시간'], ['숙주 세포 있는 쪽 바이러스', vtotal() + ' 개'], ['감염된 세포', V.inf + ' / ' + V.cells.length]]); }
    else if (key === 'grow:route') setReadouts([['연결한 카드', S.R.placed + ' / 6'], ['경로 칸', '6개']]);
    else if (key === 'sort') setReadouts([['분류한 카드', S.SO.placed + ' / 8'], ['상자', '6개']]);
    else if (key === 'apply:drug') setReadouts([['경과', (Math.round(DR.day * 10) / 10) + ' 일'], ['감기 환자 병원체', Math.round(pOf('A', DR.day)) + ''], ['폐렴 환자 병원체', Math.round(pOf('B', DR.day)) + '']]);
    else setReadouts([['켠 방법', ['mask', 'wash', 'cook'].filter((k) => B[k]).length + ' / 3'], ['새 감염자', B.last == null ? '—' : B.last + ' / 7명'], ['막힌 세균', B.block.reduce((a, b) => a + b, 0) + '']]);
  }

  /* ============ 시작 ============ */
  makeObs(); makeGrow(); makeVirus(); makeRoute(); makeSort(); makeDrug(); makeBlock();
  const TABLE_OK = () => S.O.table.wrongCells().length === 0 && S.O.table.filled === S.O.table.total;

  /* ============ 단계 · 미션 ============ */
  const names = (k) => KEYS.map((q) => (S.O.seen[q] ? '✅' : '⬜') + PATH[q].name).join(' ');
  const levels = [
    {
      title: '가상 현미경으로 병원체 5종 비교', short: '병원체 비교', icon: '🔬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 감기 증상이라도 어떤 때는 약이 듣고 어떤 때는 듣지 않는 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 감염병은 병원체 고유의 핵산이나 표면 단백질로 진단한다고 배웠어요. 이번에는 병원체가 <b>어떻게 생겼고 서로 어떻게 다른지</b> 비교해요.</div>' +
        '<p>감염성 질병을 일으키는 <b>병원체</b>에는 <b>바이러스, 세균, 곰팡이, 원생생물, 기생충</b>이 있어요. 가상 현미경으로 다섯 시료를 관찰하고, 크기를 <b>로그 눈금</b>으로 비교한 뒤 세포 구조·핵·몸 구성을 표로 정리해요.</p>',
      features: ['obs'],
      setup() { setScene('obs', 'scope'); },
      recap: '병원체 5종은 크기와 구조가 달라요. 바이러스는 세포가 아니고, 세균은 핵막이 없는 단세포이며, 곰팡이·원생생물·기생충은 핵막이 있는 진핵생물이에요.',
      summary: '<ul><li>병원체: <b>바이러스</b>(약 0.1 µm), <b>세균</b>(약 1~5 µm), <b>곰팡이</b>(균사 폭 약 5 µm), <b>원생생물</b>(수십 µm), <b>기생충</b>(mm~m).</li>' +
        '<li>바이러스: <b>세포 구조 없음</b>(단백질 껍질 + 핵산). 세균: 세포 구조는 있으나 <b>핵막 없음</b>(원핵생물, 단세포). 곰팡이(균계)·원생생물·기생충(동물계)은 <b>핵막이 있는 진핵생물</b>.</li>' +
        '<li>크기 차이가 아주 커서 한 그림에는 <b>로그 눈금</b>(한 칸 = 10배)을 써요.</li></ul>',
      missions: [
        {
          title: '시료 5종을 모두 관찰하기',
          goal: '가상 현미경으로 <b>바이러스·세균·곰팡이·원생생물·기생충</b>을 모두 관찰하세요.',
          hint: '아래 시료 단추를 하나씩 눌러요. 시료마다 1초쯤 살펴보면 ✔ 표시가 붙어요.',
          setup() { S.O.seen = {}; S.O.cur = null; setScene('obs', 'scope'); syncControls(); },
          check: () => KEYS.every((k) => S.O.seen[k]), hold: 0.4,
          status: () => names(),
          explain: '바이러스는 약 <b>0.1 µm</b>라서 광학 현미경으로는 볼 수 없고 <b>전자 현미경</b>이 필요해요. 세균은 1~5 µm, 원생생물은 수십 µm, 곰팡이 균사는 폭이 약 5 µm예요. 기생충은 mm~m라서 맨눈이나 확대경으로 보여요. 눈금 한 칸이 10배인 <b>로그 눈금</b>이라서 이렇게 큰 차이를 한 그림에 담을 수 있어요.',
        },
        {
          title: '병원체 비교표 채우기', manual: true,
          goal: '5종 병원체의 <b>세포 구조, 핵(핵막), 몸 구성</b>을 표에 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '칸을 누를 때마다 보기가 바뀌어요. 바이러스는 세포가 아니고, 세균은 핵막이 없다는 점을 떠올려요.',
          setup() { S.O.table.reset(); setScene('obs', 'table'); },
          check() {
            const tb = S.O.table, miss = tb.total - tb.filled;
            if (miss) return '아직 비어 있는 칸이 ' + miss + '칸 있어요.';
            const w = tb.wrongCells(); tb.markBad(w);
            if (w.length) return '빨간 칸을 다시 생각해 보세요 (' + [...new Set(w.map((q) => PATH[KEYS[q[0]]].name))].join(', ') + '). 현미경 시야에서 본 구조를 떠올려요.';
            tb.ok = true; return true;
          },
          status: () => '채운 칸 ' + S.O.table.filled + ' / ' + S.O.table.total,
          explain: '<b>바이러스</b>는 세포가 아니에요(단백질 껍질 속에 핵산). <b>세균</b>은 단세포이지만 핵막이 없는 <b>원핵생물</b>이에요. <b>곰팡이</b>(균계, 균사로 된 다세포), <b>원생생물</b>(단세포), <b>기생충</b>(동물계, 다세포)은 핵막이 있는 <b>진핵생물</b>이에요.',
        },
        {
          type: 'quiz', title: '세포 구조가 없는 병원체는?',
          goal: '다음 중 <b>세포 구조가 없는</b> 병원체는 무엇일까요?',
          setup() { setScene('obs', 'scope'); },
          choices: ['세균 — 핵이 없으니 세포 구조도 없다', '바이러스 — 단백질 껍질과 핵산만 있다', '곰팡이 — 균사로 이루어져 있다', '원생생물 — 단세포 생물이다'],
          answer: 1,
          feedback: ['세균은 핵막이 없을 뿐 세포막·세포벽·세포질이 있는 <b>세포</b>예요.', '', '곰팡이는 핵막이 있는 진핵세포로 이루어진 생물이에요.', '원생생물도 핵막이 있는 진핵 단세포 생물이라 세포 구조가 있어요.'],
          explain: '<b>바이러스</b>는 세포 구조가 없고 단백질 껍질과 핵산으로만 이루어져 있어요. 그래서 스스로 물질대사를 하지 못하고 <b>숙주 세포 안에서만</b> 증식해요.',
        },
      ],
    },
    {
      title: '증식과 전염: 어떻게 늘어나고 퍼질까?', short: '증식과 전염', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 병원체마다 구조가 다르다는 것을 확인했어요. 구조가 다르면 <b>늘어나는 방법</b>도 달라요.</div>' +
        '<p><b>세균</b>은 스스로 둘로 나뉘는 <b>이분법</b>으로 늘어나요(20분마다 2배, 예시). <b>바이러스</b>는 스스로 증식하지 못하고 <b>숙주 세포 안에서만</b> 복제돼요. 그래프와 모형으로 확인하고, 병원체가 사람 사이를 옮겨 다니는 <b>전염 경로</b>도 연결해요.</p>',
      features: ['grow'],
      setup() { setScene('grow', 'bact'); },
      recap: '세균은 이분법으로 20분마다 2배씩(지수적으로) 늘고, 바이러스는 숙주 세포 안에서만 증식해요. 병원체는 비말·접촉·음식·물·매개체·혈액 등을 통해 전염돼요.',
      summary: '<ul><li><b>세균 증식</b>: 이분법, 20분마다 2배 → 분열 횟수 n = 3 × 시간, 세균 수 N = 2ⁿ. 6시간이면 2¹⁸ = <b>262,144개</b>(예시) — 처음엔 느려 보여도 갈수록 급격히 늘어요(지수적 증가).</li>' +
        '<li><b>바이러스</b>: 세포 구조가 없어 <b>숙주 세포 안에서만</b> 증식. 세포를 감염시켜 복제본을 만들고 세포가 터지며 퍼져요.</li>' +
        '<li><b>전염 경로</b>: 비말·공기(독감), 음식·물(식중독, 회충증), 매개체(모기 → 말라리아), 접촉(무좀), 혈액·체액(B형 간염).</li></ul>',
      missions: [
        {
          title: '증식 그래프에 점 찍기',
          goal: '세균을 <b>6시간</b> 배양하며 1시간마다 점을 찍고, <b>🧫 바이러스</b> 화면에서 시간 흐르기를 끝까지 보세요.',
          hint: '▶ 1시간 배양 · 점 찍기를 6번 눌러요. 그다음 위 🧫 바이러스 보기로 바꿔 ▶ 시간 흐르기를 눌러요.',
          setup() { const r = S.G.range; growReset(); S.G.range = r; makeVirus(); setScene('grow', 'bact'); syncControls(); },
          check: () => S.G.pts.length >= 7 && S.V.done, hold: 0.6,
          status: () => '세균 점 ' + Math.min(7, S.G.pts.length) + ' / 7 ' + mark(S.G.pts.length >= 7) + ' &nbsp; 바이러스 관찰 ' + mark(S.V.done),
          explain: '세균 수는 1 → 8 → 64 → 512 → 4,096 → 32,768 → <b>262,144</b>개로, 한 시간마다 <b>8배</b>가 돼요. 그래프가 점점 가파르게 올라가는 <b>지수적 증가</b>예요. 반면 바이러스는 세포가 없는 배양액에서는 늘지 않고, <b>숙주 세포 안에서만</b> 복제돼요.',
        },
        {
          title: '전염 경로 연결', manual: true,
          goal: '질병 카드 6장을 끌어서 그 병이 <b>주로 퍼지는 경로</b> 칸에 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '모기에 물리면 말라리아, 기침·재채기로 퍼지는 독감… 병의 특징을 보고 어떻게 몸에 들어갈지 생각해요.',
          setup() { S.R.reset(); setScene('grow', 'route'); },
          check() {
            const M = S.R, miss = M.cards.filter((c) => !c.slot);
            if (miss.length) return '아직 칸에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = M.cards.filter((c) => ROUTES.find((r) => r.id === c.slot).ans !== c.id);
            M.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 다른 경로예요: ' + wrong.map((c) => c.label).join(', ') + '. 그 병원체가 어떻게 몸에 들어가는지 생각해 보세요.';
            return true;
          },
          status: () => '연결한 카드 ' + S.R.placed + ' / 6',
          explain: '독감 → <b>비말·공기</b>, 회충증 → <b>오염된 물·채소(음식·물)</b>, 말라리아 → <b>모기(매개체)</b>, 무좀 → <b>접촉</b>, B형 간염 → <b>혈액·체액</b>, 식중독 → <b>상한 음식</b>이에요. 한 병이 여러 경로로 퍼지기도 하지만, 여기서는 대표적인 경로를 골랐어요.',
        },
        {
          type: 'quiz', title: '6시간 뒤 세균은 몇 개?',
          goal: '세균 1개가 <b>20분마다 2배</b>로 늘어난다면 <b>6시간 후</b>에는 약 몇 개가 될까요?',
          setup() { setScene('grow', 'bact'); },
          choices: ['약 18개 (20분마다 1개씩 늘어난다)', '약 64개 (2⁶)', '약 26만 개 (2¹⁸ = 262,144개)', '약 360개 (360분)'],
          answer: 2,
          feedback: ['20분마다 "1개씩" 늘어나는 것이 아니라 "2배"가 거듭돼요. 곱셈이 쌓이면 훨씬 커져요.', '6시간은 분열 6번이 아니라, 20분마다 한 번이므로 3 × 6 = 18번이에요. 2⁶이 아니라 2¹⁸이에요.', '', '360은 6시간을 분으로 나타낸 값이에요. 분열은 360 / 20 = 18번 일어나요.'],
          explain: '6시간 = 360분이고 20분마다 한 번씩 분열하므로 <b>18번</b> 분열해요. 세균 수는 2¹⁸ = <b>262,144개</b>예요. 처음에는 느려 보여도 갈수록 급격히 늘어나는 것이 지수적 증가예요.',
        },
      ],
    },
    {
      title: '질병 분류: 병원체가 있을까, 없을까?', short: '질병 분류', icon: '🗂', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 병원체가 늘어나고 퍼지는 방법을 보았어요. 이제 <b>어떤 병을 어떤 병원체가 일으키는지</b> 정리해요.</div>' +
        '<p>병원체가 일으키는 병은 <b>감염성(전염성) 질병</b>이에요. 병원체 없이 유전, 생활 습관, 물질대사 이상 등으로 생기는 병은 <b>비감염성 질병</b>이에요. 질병 카드 8장을 알맞은 상자에 분류해 보세요.</p>',
      features: ['sort'],
      setup() { setScene('sort'); },
      recap: '감염성 질병은 병원체(바이러스, 세균, 곰팡이, 원생생물, 기생충)가 일으키고 전염될 수 있어요. 비감염성 질병(당뇨병 등)은 병원체가 없어 전염되지 않아요.',
      summary: '<ul><li><b>바이러스</b>: 독감, 홍역 / <b>세균</b>: 결핵, 식중독(살모넬라) / <b>곰팡이</b>: 무좀 / <b>원생생물</b>: 말라리아(모기가 매개) / <b>기생충</b>: 회충증.</li>' +
        '<li><b>비감염성 질병</b>: 병원체 없이 생겨요(유전, 생활 습관, 물질대사 이상). 예: 당뇨병, 고혈압 → 전염되지 않아요.</li>' +
        '<li>세균이 모두 병을 일으키지는 않아요. 장내 유익균처럼 이로운 세균도 많아요.</li></ul>',
      missions: [
        {
          title: '질병 카드 8장 분류', manual: true,
          goal: '카드를 끌어서 <b>병원체 5종 상자</b> 또는 <b>병원체 없음</b> 상자에 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드에 병원체가 적혀 있지 않아요. 앞 단계의 전염 경로 카드와 비교표를 떠올려 보세요. 당뇨병은 병원체가 없어요.',
          setup() { S.SO.reset(); setScene('sort'); },
          check() {
            const sd = S.SO, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => c.zone !== DIS.find((q) => q.id === c.id).ans);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 다른 상자예요: ' + wrong.map((c) => c.label).join(', ') + '.';
            return true;
          },
          status: () => '분류한 카드 ' + S.SO.placed + ' / 8',
          explain: '독감·홍역 → <b>바이러스</b>, 결핵·식중독(살모넬라) → <b>세균</b>, 무좀 → <b>곰팡이</b>, 말라리아 → <b>원생생물</b>, 회충증 → <b>기생충</b>이에요. <b>당뇨병</b>은 병원체가 없는 <b>비감염성 질병</b>이에요.',
        },
        {
          type: 'quiz', title: '병원체와 질병에 대한 오개념',
          goal: '다음 중 <b>옳은 설명</b>은 무엇일까요?',
          setup() { setScene('sort'); },
          choices: ['당뇨병은 병원체가 없어서 다른 사람에게 전염되지 않는다', '세균은 모두 사람에게 병을 일으킨다', '곰팡이는 세균과 같은 원핵생물이다', '바이러스는 스스로 분열해서 늘어난다'],
          answer: 0,
          feedback: ['', '장내 유익균처럼 몸에 도움을 주는 세균도 많아요. 병을 일으키는 세균은 일부예요.', '곰팡이는 핵막이 있는 진핵생물(균계)이고 세균은 핵막이 없는 원핵생물이에요.', '바이러스는 세포가 아니라서 스스로 분열하지 못하고 숙주 세포 안에서 복제돼요.'],
          explain: '<b>당뇨병</b>은 병원체가 없는 비감염성 질병이라 전염되지 않아요. 또 사람의 <b>장 속 유익균</b>처럼 이로운 세균도 많으니 "세균 = 병"이라고 생각하면 안 돼요.',
        },
      ],
    },
    {
      title: '예방과 치료: 병원체에 맞게 대응하기', short: '예방·치료', icon: '💊', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 병원체가 종류별로 구조와 증식 방법이 다르다는 것을 알았어요. 그래서 <b>치료법과 예방법도 병원체에 맞춰야</b> 해요.</div>' +
        '<p>시뮬레이션 두 가지를 해 봐요. ① 감기 환자(바이러스)와 세균성 폐렴 환자에게 <b>항생제</b>를 주었을 때 병원체 수가 어떻게 달라지는지, ② <b>마스크·손 씻기·익혀 먹기</b>로 전염 경로를 막으면 감염이 어떻게 달라지는지 확인해요. (교육용 모형이에요. 실제 치료는 의료인과 상담해요.)</p>',
      features: ['apply'],
      setup() { setScene('apply', 'drug'); },
      recap: '항생제는 세균에는 듣지만 바이러스에는 듣지 않아요. 전염 경로(비말, 접촉, 음식)를 마스크·손 씻기·익혀 먹기로 차단하면 감염을 막을 수 있어요.',
      summary: '<ul><li><b>항생제</b>는 세균을 없애거나 증식을 막는 약이에요. <b>바이러스에는 효과가 없어요</b> → 감기(대부분 바이러스)에는 항생제를 쓰지 않아요.</li>' +
        '<li>예방: 비말·공기 → <b>마스크</b>, 접촉 → <b>손 씻기</b>, 음식·물 → <b>익혀 먹기</b>·깨끗한 물. 경로를 끊으면 감염이 줄어요.</li>' +
        '<li>항생제를 함부로 쓰면 항생제가 듣지 않는 세균이 늘어날 수 있어요(내성 → 진화 단원에서 이어져요).</li></ul>',
      missions: [
        {
          title: '항생제 효과 비교',
          goal: '시간을 흐르게 하고 <b>6일째 이전</b>에 두 환자에게 항생제를 준 뒤, <b>10일째</b>까지 관찰하세요.',
          hint: '▶ 시간 흐르기를 누르고 3~5일째에 💊 감기 환자, 💊 폐렴 환자 단추를 눌러요. 점선은 항생제를 안 줬을 때의 곡선이에요.',
          setup() { resetDrug(); setScene('apply', 'drug'); },
          check: () => S.DR.given.A != null && S.DR.given.B != null && S.DR.given.A <= 6 && S.DR.given.B <= 6 && S.DR.day >= 10, hold: 0.6,
          status: () => '투여 ' + mark(S.DR.given.A != null) + '감기 ' + mark(S.DR.given.B != null) + '폐렴 &nbsp; 관찰 ' + (Math.floor(S.DR.day * 10) / 10) + ' / 10일 ' + mark(S.DR.day >= 10) + (S.DR.given.A != null && S.DR.given.A > 6 || S.DR.given.B != null && S.DR.given.B > 6 ? ' (6일째 이전에 줘야 해요)' : ''),
          explain: '항생제를 준 <b>폐렴 환자(세균)</b>는 병원체 수가 빠르게 줄었지만, <b>감기 환자(바이러스)</b>는 항생제를 주어도 점선과 똑같은 곡선이에요. 항생제는 <b>세균에 작용</b>하는 약이고 바이러스에는 효과가 없어요. (감기는 대부분 바이러스가 일으켜요.)',
        },
        {
          title: '경로를 막아 감염 줄이기',
          goal: '먼저 <b>아무것도 켜지 않고</b> 하루를 보낸 뒤, <b>마스크·손 씻기·익혀 먹기를 모두 켜고</b> 하루를 보내 새 감염자 0명을 만드세요.',
          hint: '🛡 경로 차단 화면에서 단추를 눌러 켜거나 꺼요. 각각 비말·공기, 접촉, 음식·물 경로를 막아요.',
          setup() { makeBlock(); setScene('apply', 'block'); syncControls(); },
          check: () => S.BK.ranNone && S.BK.ranAll, hold: 0.4,
          status: () => '아무것도 안 켠 하루 ' + mark(S.BK.ranNone) + ' (감염 7명) &nbsp; 모두 켠 하루 ' + mark(S.BK.ranAll) + ' (감염 0명)',
          explain: '아무 대비가 없으면 세 경로로 <b>7명 모두</b> 감염돼요. 마스크는 <b>비말·공기</b> 경로를, 손 씻기는 <b>접촉</b> 경로를, 익혀 먹기는 <b>음식·물</b> 경로를 막아요. 경로를 끊으면 병원체가 몸에 들어오지 못해요.',
        },
        {
          type: 'quiz', title: '감기에 항생제를 쓰지 않는 까닭',
          goal: '감기 환자에게 <b>항생제를 쓰지 않는 까닭</b>으로 알맞은 것은?',
          setup() { setScene('apply', 'drug'); },
          choices: ['감기는 대부분 바이러스가 일으키는데 항생제는 세균에 작용하기 때문이다', '항생제는 몸에 이로운 세균에게만 효과가 있기 때문이다', '감기는 병원체가 없는 비감염성 질병이기 때문이다', '항생제를 쓰면 바이러스가 더 빨리 증식하기 때문이다'],
          answer: 0,
          feedback: ['', '항생제는 병을 일으키는 세균에 쓰는 약이에요. 문제는 감기의 원인이 세균이 아니라는 점이에요.', '감기는 병원체(주로 바이러스)가 일으키는 감염성 질병이에요.', '항생제가 바이러스를 더 늘리지는 않아요. 단지 바이러스에는 효과가 없는 거예요.'],
          explain: '감기는 대부분 <b>바이러스</b>가 일으키고, 항생제는 <b>세균</b>에 작용해요. 필요 없이 항생제를 쓰면 항생제가 듣지 않는 세균이 늘어날 수 있어요(<b>내성</b>은 진화를 다루는 단원에서 이어져요). 약은 의료인과 상담해서 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-pathogens', mount: '#game', badge: '병원체 탐정', homeHref: '../../index.html#hb',
    featureLabels: { obs: '🔬 가상 현미경 · 크기 비교 · 비교표', grow: '📈 세균·바이러스 증식 · 전염 경로', sort: '🗂 질병 분류', apply: '💊 항생제 시험 · 경로 차단' },
    onFeatures() { updateCtl(); },
    levels,
  });

  setScene('obs', 'scope');
  let lastFree = false;
  function stepAll(dt) {
    const O = S.O;
    if (S.mode === 'obs' && S.sub.obs === 'scope' && O.cur && !O.seen[O.cur]) { O.dwell += dt; if (O.dwell >= 0.9) { O.seen[O.cur] = true; Sound.tick(); rlast = ''; syncControls(); } }
    if (S.mode === 'grow' && S.sub.grow === 'bact') stepGrow(dt);
    if (S.mode === 'grow' && S.sub.grow === 'virus') stepVirus(dt);
    if (S.mode === 'apply' && S.sub.apply === 'drug') stepDrug(dt);
    if (S.mode === 'apply' && S.sub.apply === 'block') stepBlock(dt);
  }
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    stepAll(dt);
    const key = viewKey();
    if (key === 'obs:scope' || key === 'obs:table') drawObs(dt);
    else if (key === 'grow:bact') drawGrow(dt);
    else if (key === 'grow:virus') drawVirusScene(dt);
    else if (key === 'grow:route') drawRoute(dt);
    else if (key === 'sort') drawSortScene(dt);
    else if (key === 'apply:drug') drawDrug(dt);
    else drawBlock(dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PATH, KEYS, DIS, ROUTES, BKP, LY, GL, VL, DL, BL, get game() { return game; }, setScene, pickSample, growStep, virusRun, drugGive, blockRun, baseP, pOf, personPos, fieldRect, growPlot,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) stepAll(0.02); },
  };

})();
