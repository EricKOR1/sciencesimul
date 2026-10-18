/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 생명 시스템의 구성 단계 (단원 2차시)
   성취기준 [12생과01-02] 세포에서부터 생태계까지 생명 시스템의 구성 단계의 특징을 바탕으로 체계적인 설명 자료를 만들 수 있다.
   ① 관찰: 세포~개체 확대  ② 분석: 개체~생태계 묶기  ③ 설명: 시스템과 박동  ④ 적용: 설명 자료
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  /* ===== 공통 도구 (화면 · 글자 · 카드 분류 · 순서 배열) ===== */
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
  /* 너비에 맞춰 글자 크기를 줄여 쓰기 */
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

  /* ---------- 특성 검사 램프 (O / △ / X) ---------- */
  const TRAITS = [['세포로 구성', '세포'], ['물질대사', '물질대사'], ['자극 반응·항상성', '자극 반응'], ['생장과 발생', '생장'], ['생식과 유전', '생식·유전'], ['적응과 진화', '적응·진화']];
  /* states: 'O' | 'X' | 'T'(비슷해 보임), lit: 0~1 배열 */
  function drawLamp(x, y, r, st, lit) {
    const on = lit > 0.02;
    if (st === 'O') {
      const col = '#22c55e';
      if (on) D.glow(x, y, r * 2.4 * lit, col, 0.55 * lit);
      D.sphere(x, y, r, on ? C.mix('#d1d5db', col, lit) : '#d1d5db', { gloss: true });
      if (on) { ctx.save(); ctx.globalAlpha = lit; ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.32); ctx.stroke(); ctx.restore(); }
    } else if (st === 'T') {
      const col = '#f59e0b';
      if (on) D.glow(x, y, r * 2.2 * lit, col, 0.4 * lit);
      D.sphere(x, y, r, on ? C.mix('#d1d5db', col, lit) : '#d1d5db', { gloss: true });
      if (on) T(x, y + r * 0.34, '≈', r * 1.5, '#fff', 'center', 900, { alpha: lit });
    } else {
      D.sphere(x, y, r, on ? C.mix('#e5e7eb', '#9ca3af', lit) : '#e5e7eb', { gloss: false });
      if (on) { ctx.save(); ctx.globalAlpha = lit; ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.38, y - r * 0.38); ctx.lineTo(x + r * 0.38, y + r * 0.38); ctx.moveTo(x + r * 0.38, y - r * 0.38); ctx.lineTo(x - r * 0.38, y + r * 0.38); ctx.stroke(); ctx.restore(); }
    }
  }
  /* 6칸 검사판. g: {x,y,w,h,cols}, states: 6글자 문자열, lit: 6개 배열 */
  function drawLampBoard(g, states, lit, o) {
    o = o || {}; const cols = g.cols || 2, rows = Math.ceil(6 / cols), gap = 8;
    const cw = (g.w - gap * (cols - 1)) / cols, chh = (g.h - gap * (rows - 1)) / rows;
    for (let i = 0; i < 6; i++) {
      const col = i % cols, row = Math.floor(i / cols), x = g.x + col * (cw + gap), y = g.y + row * (chh + gap);
      const st = states[i], l = lit[i];
      D.roundRect(x, y, cw, chh, 12); ctx.fillStyle = l > 0.3 ? (st === 'O' ? '#e8f8ee' : st === 'T' ? '#fff4d6' : '#f1f3f5') : '#f6f8f7'; ctx.fill();
      ctx.strokeStyle = l > 0.3 ? (st === 'O' ? '#86d9a6' : st === 'T' ? '#f4c66a' : '#d0d5db') : '#dbe3de'; ctx.lineWidth = 2; ctx.stroke();
      const r = Math.min(chh * 0.3, 14);
      drawLamp(x + 10 + r, y + chh / 2, r, st, l);
      TF(x + 10 + r * 2 + 8, y + chh / 2 + 5, TRAITS[i][o.short ? 1 : 0], cw - (r * 2 + 26), 13.5, 11, l > 0.3 && st === 'X' ? '#6b7280' : '#26324a', 'left', 800);
    }
  }
  const stateText = { O: '있어요', T: '비슷해 보여요', X: '없어요' };


  /* ============ 상태 ============ */
  let PT_ZOOM, PT_GROUP, PT_SYS, PT_MAKE;
  const S = { mode: 'zoom', sub: { zoom: 'zoom', group: 'view', sys: 'table', make: 'order' }, fade: 0, zm: null, grp: null, sorter: null, sys: null, mk: null };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const SCENES = {
    zoom: { label: '🔭 세포 ~ 개체', subs: [['zoom', '🔍 확대·축소'], ['order', '🧱 단계 배열']] },
    group: { label: '🌲 개체 ~ 생태계', subs: [['view', '🌲 묶어 보기'], ['sort', '🗂 단계 분류']] },
    sys: { label: '🧩 생명 시스템', subs: [['table', '📋 단계표'], ['beat', '💓 박동 모의']] },
    make: { label: '📋 설명 자료', subs: [['order', '🧱 카드 배열'], ['map', '🗺 확대 지도']] },
  };
  const viewKey = () => S.mode + ':' + S.sub[S.mode];
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
    seg.hidden = false;
    if (seg.dataset.for !== S.mode) {
      seg.dataset.for = S.mode; seg.innerHTML = '';
      sc.subs.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.sub = s[0]; b.textContent = s[1]; b.addEventListener('click', () => { Sound.click(); setScene(S.mode, s[0]); }); seg.appendChild(b); });
    }
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sub === S.sub[S.mode]));
    syncControls();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ============ 구성 단계 자료 ============ */
  const STG = ['세포', '조직', '기관', '기관계', '개체', '개체군', '군집', '생태계'];
  const COMP = ['세포막·핵·미토콘드리아 등 세포 소기관', '모양과 기능이 비슷한 세포들', '여러 조직(근육·결합·신경 조직 등)', '관련된 기능을 하는 여러 기관', '여러 기관계', '같은 종의 개체들', '여러 종의 개체군', '군집 + 비생물 환경(빛·토양·공기)'];
  const INTER = ['소기관들이 일을 나눠 맡아요', '세포들이 연결되어 신호를 주고받아요', '조직들이 한 가지 일을 위해 짜 맞춰져요', '기관들이 차례로 협력해요', '기관계들이 협력하고 조절해요', '번식·텃세·순위제 같은 상호 작용', '먹이 관계·경쟁·공생 같은 종 사이 상호 작용', '생물과 환경이 서로 영향을 주고받아요'];
  const NEWF = ['생명 활동의 기본 단위: 스스로 물질대사', '협동 기능이 나타나요: 한꺼번에 수축(박동)', '한 가지 일을 하는 장치: 혈액을 내보내는 펌프', '한 가지 생명 활동 전체: 물질 운반', '항상성 유지, 독립된 생활', '개체 수 변화, 사회 구조', '에너지 흐름, 종 다양성', '물질 순환과 에너지 흐름'];
  const EXAMPLE = ['심근 세포', '심장 근육 조직', '심장', '순환계', '달리는 사람', '같은 지역의 사람들', '공원의 모든 생물', '공원 생태계'];
  const PERM8 = { c1: [5, 2, 7, 0, 3, 6, 1, 4], c2: [3, 6, 0, 4, 1, 7, 2, 5], c3: [6, 1, 4, 7, 2, 0, 5, 3], f: [2, 5, 0, 7, 4, 1, 6, 3] };

  /* ================= ① 세포 ~ 개체 확대 ================= */
  const LV = [
    { name: '개체', ex: '사람', size: '약 1.7 m', m: 1.7, role: '여러 기관계가 협력해 몸 안을 일정하게 유지해요(항상성).' },
    { name: '기관계', ex: '순환계', size: '약 1 m (혈관 포함)', m: 1.0, role: '심장·혈관·혈액이 함께 물질을 온몸으로 운반해요.' },
    { name: '기관', ex: '심장', size: '길이 약 12 cm', m: 0.12, role: '수축해서 혈액을 내보내는 펌프예요.' },
    { name: '조직', ex: '심장 근육 조직', size: '폭 약 1 mm 조각', m: 1e-3, role: '심근 세포들이 연결되어 한꺼번에 수축해요.' },
    { name: '세포', ex: '심근 세포', size: '지름 약 20 µm', m: 2e-5, role: '하나의 세포가 수축하고 에너지를 만들어요.' },
  ];
  const ZV = PHONE ? { x: 8, y: 8, w: 464, h: 318 } : { x: 16, y: 52, w: 560, h: 332 };
  const ZC = { x: ZV.x + ZV.w / 2, y: ZV.y + ZV.h / 2 };
  function zoomOrd() {
    return new Reorder({
      items: [
        { id: 'cell', label: '세포', icon: '🔬', col: '#16a34a' }, { id: 'tissue', label: '조직', icon: '🧱', col: '#16a34a' },
        { id: 'organ', label: '기관', icon: '❤️', col: '#16a34a' }, { id: 'system', label: '기관계', icon: '🩸', col: '#16a34a' }, { id: 'body', label: '개체', icon: '🧍', col: '#16a34a' },
      ],
      slots: PHONE ? [{ x: 8, y: 150 }, { x: 244, y: 150 }, { x: 8, y: 228 }, { x: 244, y: 228 }, { x: 126, y: 306 }] : [0, 1, 2, 3, 4].map((i) => ({ x: 26 + i * 152, y: 190 })),
      cw: PHONE ? 228 : 140, ch: PHONE ? 66 : 96, solution: ['cell', 'tissue', 'organ', 'system', 'body'],
      slotNames: ['① 가장 작음', '②', '③', '④', '⑤ 가장 큼'],
      onChange: () => { if (S.zm && S.zm.ord) S.zm.ord.clearBad(); rlast = ''; },
    });
  }
  function makeZoom() { S.zm = { z: 0, tz: 0, seen: {}, ord: null }; S.zm.ord = zoomOrd(); }
  function heartPath(s) { ctx.beginPath(); ctx.moveTo(0, s * 0.9); ctx.bezierCurveTo(-s * 1.25, s * 0.1, -s * 0.85, -s * 0.95, 0, -s * 0.4); ctx.bezierCurveTo(s * 0.85, -s * 0.95, s * 1.25, s * 0.1, 0, s * 0.9); ctx.closePath(); }
  const beat = () => (RM ? 0 : Math.pow(Math.max(0, Math.sin(clock * 7.2)), 3));
  const SKIN = '#f5c9a0';
  function pic0() { // 달리는 사람
    ctx.save(); ctx.translate(0, 22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const sw = RM ? 0 : Math.sin(clock * 6) * 8;
    ctx.strokeStyle = '#2f3e5e'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(-12, 44); ctx.lineTo(-30 - sw, 100); ctx.lineTo(-18 - sw, 146); ctx.moveTo(12, 44); ctx.lineTo(34 + sw, 92); ctx.lineTo(58 + sw, 118); ctx.stroke();
    ctx.strokeStyle = SKIN; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-24, -42); ctx.lineTo(-48 + sw, -4); ctx.lineTo(-36 + sw, 24); ctx.moveTo(24, -42); ctx.lineTo(46 - sw, -14); ctx.lineTo(62 - sw, -34); ctx.stroke();
    D.shadow(() => { D.roundRect(-27, -52, 54, 100, 18); ctx.fillStyle = '#4f86f7'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(0, -74, 21, 0, TAU); ctx.fill(); ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(0, -80, 21, Math.PI, TAU); ctx.fill();
    ctx.save(); ctx.translate(-8, -22); ctx.scale(1 + 0.12 * beat(), 1 + 0.12 * beat()); heartPath(7); ctx.fillStyle = '#e0526b'; ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function vessel(pts, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i][2], pts[i][3]); ctx.stroke(); }
  function pic1() { // 순환계
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(79,134,247,.10)'; ctx.strokeStyle = 'rgba(79,134,247,.35)'; ctx.lineWidth = 2; D.roundRect(-42, -78, 84, 150, 30); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -108, 24, 0, TAU); ctx.fill(); ctx.stroke();
    const paths = [[[0, -8], [4, -60, 0, -104]], [[0, -8], [-50, -22, -76, 24]], [[0, -8], [50, -22, 76, 24]], [[0, 0], [-14, 60, -34, 150]], [[0, 0], [14, 60, 34, 150]], [[0, -8], [-24, -30, -34, -62]], [[0, -8], [24, -30, 34, -62]]];
    paths.forEach((p) => {
      ctx.strokeStyle = '#d63a52'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p[0][0] + 3, p[0][1]); ctx.quadraticCurveTo(p[1][0] + 5, p[1][1], p[1][2] + 5, p[1][3]); ctx.stroke();
      ctx.strokeStyle = '#3b6fe0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p[0][0] - 3, p[0][1] + 4); ctx.quadraticCurveTo(p[1][0] - 5, p[1][1], p[1][2] - 5, p[1][3]); ctx.stroke();
      if (!RM) for (let k = 0; k < 2; k++) { const t = (clock * 0.5 + k * 0.5 + p[1][2] * 0.003) % 1, u = 1 - t, x = u * u * p[0][0] + 2 * u * t * p[1][0] + t * t * p[1][2] + 5, y = u * u * p[0][1] + 2 * u * t * p[1][1] + t * t * p[1][3]; D.sphere(x, y, 3.4, '#ff8a9a', { gloss: false }); }
    });
    ctx.save(); ctx.translate(0, -4); ctx.scale(1 + 0.1 * beat(), 1 + 0.1 * beat()); heartPath(13); const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 16); g.addColorStop(0, '#f27c8f'); g.addColorStop(1, '#a4243b'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function pic2() { // 심장
    ctx.save(); const b = beat(); ctx.scale(1 + 0.04 * b, 1 + 0.04 * b);
    ctx.strokeStyle = '#3b6fe0'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, -56); ctx.lineTo(-40, -112); ctx.stroke();
    ctx.strokeStyle = '#d63a52'; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(10, -50); ctx.quadraticCurveTo(14, -112, 62, -104); ctx.stroke();
    D.shadow(() => { heartPath(96); const g = ctx.createRadialGradient(-30, -30, 8, 0, 6, 110); g.addColorStop(0, '#f27c8f'); g.addColorStop(0.55, '#d63a52'); g.addColorStop(1, '#8e1f33'); ctx.fillStyle = g; ctx.fill(); }, { blur: 14, y: 6 });
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -36); ctx.quadraticCurveTo(-4, 20, 2, 76); ctx.moveTo(-70, -6); ctx.quadraticCurveTo(-30, 14, 0, 4); ctx.moveTo(70, -6); ctx.quadraticCurveTo(30, 14, 0, 4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-44, -42, 24, 12, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function pic3() { // 심장 근육 조직
    const b = beat();
    for (let r = -2; r <= 2; r++) for (let c = -3; c <= 3; c++) {
      const x = (c + (r % 2 ? 0.5 : 0)) * 76, y = r * 34; if (Math.abs(x) > 140) continue;
      const w = 70 * (1 - 0.07 * b);
      ctx.save(); ctx.translate(x, y);
      const g = ctx.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, '#f8b6c1'); g.addColorStop(1, '#e8808f');
      D.roundRect(-w / 2, -14, w, 28, 12); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(160,50,70,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = 'rgba(160,50,70,.22)'; ctx.lineWidth = 1; for (let k = -w / 2 + 12; k < w / 2 - 8; k += 6) { ctx.beginPath(); ctx.moveTo(k, -9); ctx.lineTo(k, 9); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(110,30,50,.8)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -11); ctx.lineTo(-w / 2 + 3, 11); ctx.moveTo(w / 2 - 3, -11); ctx.lineTo(w / 2 - 3, 11); ctx.stroke();
      ctx.fillStyle = '#8b6fcf'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function pic4() { // 심근 세포
    const jx = RM ? 0 : Math.sin(clock * 9.1) * 1.2 + Math.sin(clock * 5.3) * 0.8, jy = RM ? 0 : Math.cos(clock * 7.7) * 0.9;
    ctx.save(); ctx.translate(jx, jy);
    D.shadow(() => { D.roundRect(-100, -42, 200, 84, 36); const g = ctx.createLinearGradient(0, -42, 0, 42); g.addColorStop(0, '#fbc3cc'); g.addColorStop(1, '#e8808f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = 'rgba(160,50,70,.6)'; ctx.lineWidth = 3; D.roundRect(-100, -42, 200, 84, 36); ctx.stroke();
    ctx.save(); D.roundRect(-100, -42, 200, 84, 36); ctx.clip(); ctx.strokeStyle = 'rgba(160,50,70,.2)'; ctx.lineWidth = 1.5; for (let k = -90; k < 96; k += 9) { ctx.beginPath(); ctx.moveTo(k, -42); ctx.lineTo(k, 42); ctx.stroke(); } ctx.restore();
    [[-62, -20], [-62, 20], [62, -20], [62, 20], [-30, -30], [30, 30], [-34, 31], [34, -31]].forEach((m, i) => { ctx.fillStyle = '#f5a25b'; ctx.strokeStyle = '#c9732f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(m[0], m[1], 14, 7, i * 0.4, 0, TAU); ctx.fill(); ctx.stroke(); });
    D.sphere(0, 0, 22, '#8b6fcf', { gloss: true }); T(0, 5, '핵', 13, '#fff', 'center', 800);
    ctx.strokeStyle = 'rgba(110,30,50,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-96, -26); ctx.lineTo(-96, 26); ctx.moveTo(96, -26); ctx.lineTo(96, 26); ctx.stroke();
    ctx.restore();
  }
  const PICS = [pic0, pic1, pic2, pic3, pic4];
  const lvAlpha = (j, z) => (j >= z ? clamp(1.3 - (j - z) * 0.35, 0, 1) : clamp(1.0 - (z - j) * 0.95, 0, 1));
  function drawRuler(Z) {
    // 크기 눈금 (로그): 10 µm ~ 1 km
    const ticks = [[1e-5, '10 µm'], [1e-3, '1 mm'], [0.1, '10 cm'], [1, '1 m'], [1000, '1 km']];
    const pos = (m) => (Math.log10(m) + 5) / 8;
    const fl = clamp(Math.floor(Z), 0, 3), fr = clamp(Z - fl, 0, 1), lm = lerp(Math.log10(LV[fl].m), Math.log10(LV[fl + 1].m), fr), mt = (lm + 5) / 8;
    if (PHONE) {
      const x0 = 28, w = 424, y = 350;
      ctx.strokeStyle = '#6b7a72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
      for (let d = -5; d <= 3; d++) { const x = x0 + w * (d + 5) / 8; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke(); }
      ticks.forEach((t) => T(x0 + w * pos(t[0]), y + 22, t[1], 11.5, '#46544d', 'center', 800));
      LV.forEach((l, j) => D.sphere(x0 + w * pos(l.m), y, 5, Math.abs(Z - j) < 0.5 ? '#16a34a' : '#9fb3a6', { gloss: false }));
      const mx = x0 + w * mt; ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(mx, y - 6); ctx.lineTo(mx - 8, y - 20); ctx.lineTo(mx + 8, y - 20); ctx.closePath(); ctx.fill();
      T(x0, y - 30, '📏 크기 (로그 눈금)', 12.5, '#46544d', 'left', 800);
    } else {
      const x = 604, y0 = 66, h = 300;
      panel(588, 52, 196, 332, 14);
      T(686, 76, '📏 크기 (로그 눈금)', 13, '#46544d', 'center', 800);
      const yy = (m) => y0 + 20 + (h - 30) * (1 - pos(m));
      ctx.strokeStyle = '#6b7a72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 14, yy(1000)); ctx.lineTo(x + 14, yy(1e-5)); ctx.stroke();
      for (let d = -5; d <= 3; d++) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, yy(Math.pow(10, d))); ctx.lineTo(x + 20, yy(Math.pow(10, d))); ctx.stroke(); }
      ticks.forEach((t) => T(x + 28, yy(t[0]) + 5, t[1], 12.5, '#46544d', 'left', 800));
      LV.forEach((l, j) => D.sphere(x + 14, yy(l.m), 5, Math.abs(Z - j) < 0.5 ? '#16a34a' : '#9fb3a6', { gloss: false }));
      const my = yy(Math.pow(10, lm)); ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(x + 2, my); ctx.lineTo(x - 14, my - 8); ctx.lineTo(x - 14, my + 8); ctx.closePath(); ctx.fill();
      const nj = clamp(Math.round(Z), 0, 4); D.label(x - 18, my, LV[nj].name, { bg: '#16a34a', size: 12.5, align: 'right' });
    }
  }
  function stepZoom(dt) {
    const Zm = S.zm;
    Zm.z = SciSim.approach(Zm.z, Zm.tz, dt, RM ? 60 : 5); if (Math.abs(Zm.z - Zm.tz) < 0.002) Zm.z = Zm.tz;
    for (let j = 0; j < 5; j++) if (Math.abs(Zm.z - j) < 0.2) { if (!Zm.seen[j]) { Zm.seen[j] = true; rlast = ''; } }
    Zm.ord.update(dt);
  }
  function drawZoom(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    const Zm = S.zm, Z = Zm.z;
    if (S.sub.zoom === 'zoom') {
      panel(ZV.x, ZV.y, ZV.w, ZV.h, 16);
      ctx.save(); D.roundRect(ZV.x, ZV.y, ZV.w, ZV.h, 16); ctx.clip();
      const g = ctx.createRadialGradient(ZC.x, ZC.y, 20, ZC.x, ZC.y, ZV.w * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e6f2ea'); ctx.fillStyle = g; ctx.fillRect(ZV.x, ZV.y, ZV.w, ZV.h);
      const k = PHONE ? 0.9 : 1;
      for (let j = 0; j < 5; j++) {
        const sc = Math.pow(3, Z - j) * k, a = lvAlpha(j, Z); if (a < 0.02 || sc > 12 || sc < 0.02) continue;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(ZC.x, ZC.y); ctx.scale(sc, sc);
        PICS[j]();
        if (j < 4 && Z - j < 0.8) { const wa = clamp(1 - Math.abs(Z - j) * 1.2, 0, 1); ctx.globalAlpha = a * wa * 0.9; ctx.setLineDash([5 / sc, 4 / sc]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5 / sc; D.roundRect(-40, -40, 80, 80, 8); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
      }
      ctx.restore();
      const nj = clamp(Math.round(Z), 0, 4), L = LV[nj];
      D.label(ZV.x + 12, ZV.y + 22, '🔭 ' + L.name + ' · ' + L.ex, { bg: '#16a34a', size: PHONE ? 13.5 : 15, align: 'left' });
      D.label(ZV.x + ZV.w - 12, ZV.y + 22, L.size, { bg: '#26324a', size: PHONE ? 12.5 : 13.5, align: 'right' });
      if (!PHONE) { drawRuler(Z); }
      else drawRuler(Z);
      // 정보 상자
      const ix = PHONE ? 8 : 16, iy = PHONE ? 396 : 396, iw = PHONE ? 464 : 560, ih = PHONE ? 236 : 152;
      panel(ix, iy, iw, ih, 14);
      LV.forEach((l, j) => {
        const cw = (iw - 24 - 4 * 6) / 5, x = ix + 12 + j * (cw + 6), on = nj === j;
        D.roundRect(x, iy + 12, cw, 30, 15); ctx.fillStyle = on ? '#16a34a' : Zm.seen[j] ? '#dcf3e4' : '#eef2f0'; ctx.fill();
        T(x + cw / 2, iy + 32, l.name, PHONE ? 12.5 : 13.5, on ? '#fff' : '#46544d', 'center', 800);
      });
      T(ix + 14, iy + 68, L.name + ': ' + L.ex, 16, '#26324a', 'left', 800);
      textBlock(ix + 14, iy + 94, iw - 28, '하는 일: ' + L.role, PHONE ? 13.5 : 14.5, '#3a465c', PHONE ? 20 : 21, 700);
      if (nj < 4) textBlock(ix + 14, iy + (PHONE ? 148 : 140), iw - 28, '↓ 더 확대하면 ' + LV[nj + 1].name + '(' + LV[nj + 1].ex + ')이 보여요.', 13, '#16a34a', 18, 800);
      else T(ix + 14, iy + (PHONE ? 148 : 140), '가장 작은 단계예요. 세포가 모여 조직을 이뤄요.', 13, '#16a34a', 'left', 800);
    } else {
      // 단계 배열
      T(VW / 2, PHONE ? 40 : 82, '작은 단계에서 큰 단계 순서로 놓아요', PHONE ? 15 : 17, '#26324a', 'center', 800);
      const o = Zm.ord; o.draw();
      if (o.solved) {
        o.o.slots.forEach((sl, s) => { const c = o.cards[o.order[s]]; T(sl.x + o.o.cw / 2, sl.y + o.o.ch + 22, LV[['body', 'system', 'organ', 'tissue', 'cell'].indexOf(c.id)].ex, 13, '#166534', 'center', 800); });
        T(VW / 2, PHONE ? 400 : 360, '✅ 작은 단계가 모여 더 큰 단계를 이뤄요', 15, '#166534', 'center', 800);
      } else T(VW / 2, PHONE ? 420 : 360, '카드를 끌어서 자리를 바꿔요', 13.5, '#7b8a80', 'center', 800);
      if (!PHONE) { ctx.strokeStyle = '#9fb3a6'; ctx.lineWidth = 3; ctx.setLineDash([2, 8]); ctx.beginPath(); ctx.moveTo(40, 320); ctx.lineTo(760, 320); ctx.stroke(); ctx.setLineDash([]); }
    }
    parts.update(dt); parts.draw(ctx);
  }
  PT_ZOOM = {
    down(p) { if (S.sub.zoom === 'order') return S.zm.ord.down(p); return false; },
    move(p) { if (S.sub.zoom === 'order') S.zm.ord.move(p); },
    up(p) { if (S.sub.zoom === 'order') S.zm.ord.up(p); },
    hover(p) { return S.sub.zoom === 'order' ? S.zm.ord.hover(p) : 'default'; },
  };

  /* ================= ② 개체 ~ 생태계 ================= */
  const SPN = { oak: '참나무', deer: '사슴', squirrel: '다람쥐', bird: '새', mushroom: '버섯' };
  const SPI = { oak: '🌳', deer: '🦌', squirrel: '🐿️', bird: '🐦', mushroom: '🍄' };
  const FV = PHONE ? { x: 8, y: 8, w: 464, h: 340 } : { x: 16, y: 52, w: 768, h: 336 };
  const ORG = [];
  [[0.10, 0.70, 1.0], [0.28, 0.64, 0.85], [0.47, 0.72, 1.1], [0.64, 0.66, 0.9], [0.80, 0.70, 1.0], [0.93, 0.64, 0.8]].forEach((a, i) => ORG.push({ id: 'oak' + i, sp: 'oak', u: a[0], v: a[1], s: a[2] }));
  [[0.20, 0.84], [0.56, 0.86], [0.86, 0.84]].forEach((a, i) => ORG.push({ id: 'deer' + i, sp: 'deer', u: a[0], v: a[1], s: 1 }));
  [[0.13, 0.64], [0.50, 0.66], [0.83, 0.62]].forEach((a, i) => ORG.push({ id: 'squirrel' + i, sp: 'squirrel', u: a[0], v: a[1], s: 1 }));
  [[0.08, 0.32], [0.30, 0.26], [0.62, 0.30], [0.90, 0.28]].forEach((a, i) => ORG.push({ id: 'bird' + i, sp: 'bird', u: a[0], v: a[1], s: 1 }));
  [[0.06, 0.95], [0.34, 0.94], [0.52, 0.96], [0.70, 0.94], [0.95, 0.95]].forEach((a, i) => ORG.push({ id: 'mushroom' + i, sp: 'mushroom', u: a[0], v: a[1], s: 1 }));
  const orgXY = (o) => ({ x: FV.x + o.u * FV.w, y: FV.y + o.v * FV.h });
  const orgR = (o) => (o.sp === 'oak' ? 44 * o.s * (PHONE ? 0.75 : 1) : PHONE ? 18 : 22);
  const GTXT = [
    ['개체', '독립적으로 생명 활동을 하는 하나의 생물이에요. (예: 참나무 한 그루, 사슴 한 마리)'],
    ['개체군', '같은 지역에 사는 같은 종의 개체들이에요. (예: 숲의 모든 참나무)'],
    ['군집', '같은 지역에 사는 여러 종의 개체군 모두예요. (예: 숲의 모든 생물)'],
    ['생태계', '군집에 빛·공기·토양·물 같은 비생물 환경을 더한, 서로 영향을 주고받는 시스템이에요.'],
  ];
  function makeGroup() { S.grp = { g: 0, sel: 'oak0', a: [1, 0, 0, 0], seen: {}, fa: 0 }; S.grp.seen[0] = true; }
  function drawTree(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (PHONE ? 0.78 : 1), s * (PHONE ? 0.78 : 1));
    const sw = RM ? 0 : Math.sin(clock * 1.2 + x) * 1.5;
    ctx.fillStyle = '#8b5a2b'; D.roundRect(-7, -52, 14, 54, 4); ctx.fill();
    [[-22, -66, 28], [20, -68, 26], [0, -92, 32], [-6, -64, 30]].forEach((c, i) => { D.sphere(c[0] + sw * (i % 2 ? 1 : -1), c[1], c[2], i === 2 ? '#3f9b4a' : '#4aa957', { gloss: true }); });
    ctx.restore();
  }
  function drawForestBase() {
    ctx.save(); D.roundRect(FV.x, FV.y, FV.w, FV.h, 16); ctx.clip();
    const sky = ctx.createLinearGradient(0, FV.y, 0, FV.y + FV.h * 0.62); sky.addColorStop(0, '#bfe3ff'); sky.addColorStop(1, '#eaf7ff'); ctx.fillStyle = sky; ctx.fillRect(FV.x, FV.y, FV.w, FV.h);
    ctx.fillStyle = '#7ec26f'; ctx.fillRect(FV.x, FV.y + FV.h * 0.62, FV.w, FV.h * 0.3);
    ctx.fillStyle = '#9a6b3f'; ctx.fillRect(FV.x, FV.y + FV.h * 0.9, FV.w, FV.h * 0.1);
    ctx.fillStyle = 'rgba(80,50,20,.25)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(FV.x + (i * 0.073 + 0.03) * FV.w, FV.y + FV.h * (0.93 + (i % 3) * 0.02), 3 + (i % 3), 0, TAU); ctx.fill(); }
    D.glow(FV.x + FV.w * 0.9, FV.y + 34, 60, '#fde68a', 0.7); D.sphere(FV.x + FV.w * 0.9, FV.y + 34, 18, '#fbbf24', { gloss: false });
    ctx.restore();
  }
  function stepGroup(dt) {
    const G = S.grp; G.a = G.a.map((a, i) => SciSim.approach(a, G.g === i ? 1 : 0, dt, 8)); G.fa = SciSim.approach(G.fa, G.g === 3 ? 1 : 0, dt, 6);
    if (S.sub.group === 'sort') S.sorter.update(dt);
  }
  function drawGroup(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    if (S.sub.group === 'sort') { drawSort(); parts.update(dt); parts.draw(ctx); return; }
    const G = S.grp, sel = ORG.find((o) => o.id === G.sel), sp = sel.sp;
    drawForestBase();
    const member = (o) => (G.g === 0 ? o.id === G.sel : G.g === 1 ? o.sp === sp : true);
    ORG.slice().sort((a, b) => a.v - b.v).forEach((o) => {
      const p = orgXY(o); ctx.save(); ctx.globalAlpha = member(o) ? 1 : 0.35;
      if (o.sp === 'oak') drawTree(p.x, p.y, o.s); else T(p.x, p.y + 10, SPI[o.sp], PHONE ? 26 : 32, '#000', 'center', 600);
      ctx.restore();
    });
    // 묶음 테두리
    const box = (list, pad) => { const xs = list.map((o) => orgXY(o).x), ys = list.map((o) => orgXY(o).y); const r = list.map(orgR); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; list.forEach((o, i) => { const p = orgXY(o); const up = o.sp === 'oak' ? r[i] * 2.3 : r[i]; x0 = Math.min(x0, p.x - r[i]); x1 = Math.max(x1, p.x + r[i]); y0 = Math.min(y0, p.y - up); y1 = Math.max(y1, p.y + (o.sp === 'oak' ? 6 : r[i] * 0.6)); }); return { x: Math.max(FV.x + 4, x0 - pad), y: Math.max(FV.y + 4, y0 - pad), w: Math.min(FV.x + FV.w - 4, x1 + pad) - Math.max(FV.x + 4, x0 - pad), h: Math.min(FV.y + FV.h - 4, y1 + pad) - Math.max(FV.y + 4, y0 - pad) }; };
    const outline = (b, col, a, label) => { if (a < 0.02) return; ctx.save(); ctx.globalAlpha = a; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(col, 0.1); ctx.fill(); ctx.setLineDash([9, 6]); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); D.label(b.x + 10, b.y + 4, label, { bg: col, size: PHONE ? 12.5 : 14, align: 'left' }); ctx.restore(); };
    outline(box(ORG.filter((o) => o.id === G.sel), 12), '#f59e0b', G.a[0], '개체 · ' + SPN[sp] + ' 1' + (sp === 'oak' ? '그루' : '마리'));
    outline(box(ORG.filter((o) => o.sp === sp), 10), '#16a34a', G.a[1], '개체군 · 모든 ' + SPN[sp] + ' (한 종)');
    outline(box(ORG, 8), '#2563eb', G.a[2], '군집 · 모든 생물 (여러 종)');
    if (G.fa > 0.02) {
      ctx.save(); ctx.globalAlpha = G.fa; ctx.setLineDash([12, 7]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 5; D.roundRect(FV.x + 3, FV.y + 3, FV.w - 6, FV.h - 6, 14); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fillRect(FV.x, FV.y, FV.w, FV.h);
      D.label(FV.x + 12, FV.y + 18, '생태계 · 군집 + 비생물 환경', { bg: '#7c3aed', size: PHONE ? 12.5 : 14, align: 'left' });
      [['☀️ 햇빛', 0.82, 0.2], ['💨 공기', 0.4, 0.12], ['🌱 토양', 0.3, 0.97], ['💧 물', 0.7, 0.55]].forEach((e, i) => { const x = FV.x + e[1] * FV.w, y = FV.y + e[2] * FV.h; D.label(x, y, e[0], { bg: '#5b21b6', size: PHONE ? 12 : 13.5 }); });
      ctx.restore();
    }
    // 선택 표시
    if (G.g === 0 || G.g === 1) { const p = orgXY(sel); ctx.save(); ctx.globalAlpha = 0.9; D.ring(p.x, p.y - (sp === 'oak' ? 30 : 6), orgR(sel) * (sp === 'oak' ? 0.8 : 0.9), clock, { color: '#f59e0b' }); ctx.restore(); }
    // 설명
    const ix = PHONE ? 8 : 16, iy = PHONE ? 358 : 398, iw = PHONE ? 464 : 768, ih = PHONE ? 270 : 150;
    panel(ix, iy, iw, ih, 14);
    for (let i = 0; i < 4; i++) { const cw = (iw - 24 - 18) / 4, x = ix + 12 + i * (cw + 6), on = G.g === i; D.roundRect(x, iy + 12, cw, 30, 15); ctx.fillStyle = on ? ['#f59e0b', '#16a34a', '#2563eb', '#7c3aed'][i] : G.seen[i] ? '#dcf3e4' : '#eef2f0'; ctx.fill(); T(x + cw / 2, iy + 32, GTXT[i][0], PHONE ? 13 : 14, on ? '#fff' : '#46544d', 'center', 800); }
    T(ix + 14, iy + 70, GTXT[G.g][0], 17, '#26324a', 'left', 800);
    textBlock(ix + 14, iy + 96, iw - 28, GTXT[G.g][1], PHONE ? 13.5 : 14.5, '#3a465c', PHONE ? 20 : 21, 700);
    const extra = ['같은 종이라도 사는 곳이 다르면 다른 개체군이에요.', '같은 종끼리만 묶어요. 다른 종(사슴·다람쥐)은 포함하지 않아요.', '생물만 묶어요. 햇빛·토양·공기는 포함하지 않아요.', '비생물 환경을 더하는 것이 군집과 다른 점이에요.'][G.g];
    textBlock(ix + 14, iy + (PHONE ? 170 : 134), iw - 28, '💡 ' + extra, PHONE ? 13 : 13.5, '#166534', 19, 800);
    if (G.g <= 1) T(ix + iw - 14, iy + 70, '숲의 생물을 눌러 골라요', 12.5, '#7b8a80', 'right', 800);
    parts.update(dt); parts.draw(ctx);
  }
  /* 단계 분류 */
  const SORT_CARDS = [
    { id: 'stomach', label: '위', short: '위', icon: '🫃', ans: 'organ' },
    { id: 'digest', label: '사람의 소화계', short: '소화계', icon: '🍽️', ans: 'system' },
    { id: 'oak1', label: '참나무 한 그루', short: '참나무 1그루', icon: '🌳', ans: 'body' },
    { id: 'oakall', label: '숲속의 모든 참나무', short: '참나무 전체', icon: '🌲', ans: 'pop' },
    { id: 'carp', label: '호수의 모든 붕어', short: '붕어 전체', icon: '🐟', ans: 'pop' },
    { id: 'pondbio', label: '연못의 모든 생물', short: '연못 생물', icon: '🐸', ans: 'comm' },
    { id: 'pondall', label: '연못 + 물·햇빛·모든 생물', short: '연못 전체', icon: '🏞️', ans: 'eco' },
    { id: 'deer1', label: '숲의 사슴 한 마리', short: '사슴 1마리', icon: '🦌', ans: 'body' },
  ];
  const SBOX = [['organ', '기관', '#ef4444'], ['system', '기관계', '#f59e0b'], ['body', '개체', '#16a34a'], ['pop', '개체군', '#0d9488'], ['comm', '군집', '#2563eb'], ['eco', '생태계', '#7c3aed']];
  function makeSorter() {
    const boxes = SBOX.map((b, i) => PHONE ? { id: b[0], label: b[1], col: b[2], x: 8 + (i % 2) * 236, y: 8 + Math.floor(i / 2) * 108, w: 228, h: 102, cols: 2, hdr: 24 } : { id: b[0], label: b[1], col: b[2], x: 16 + (i % 3) * 259, y: 52 + Math.floor(i / 3) * 150, w: 250, h: 142, cols: 2, hdr: 26 });
    S.sorter = new Sorter({
      cards: SORT_CARDS.map((c) => ({ id: c.id, label: c.label, short: c.short, icon: c.icon, col: '#16a34a' })),
      boxes, tray: (i) => (PHONE ? { x: 10 + (i % 2) * 236, y: 356 + Math.floor(i / 2) * 46 } : { x: 13 + (i % 4) * 196, y: 376 + Math.floor(i / 4) * 62 }),
      cw: PHONE ? 226 : 186, ch: PHONE ? 40 : 54, kh: PHONE ? 22 : 26, onChange: () => { rlast = ''; },
    });
  }
  function drawSort() {
    S.sorter.drawBoxes(); T(PHONE ? 12 : 16, PHONE ? 346 : 366, '👇 카드를 끌어서 알맞은 단계 상자에 넣어요', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800); S.sorter.drawCards();
  }
  PT_GROUP = {
    down(p) {
      if (S.sub.group === 'sort') return S.sorter.down(p);
      const G = S.grp; let best = null, bd = 1e9;
      ORG.forEach((o) => { const q = orgXY(o), cy = o.sp === 'oak' ? q.y - 36 * o.s * (PHONE ? 0.78 : 1) : q.y - 4, d = Math.hypot(p.x - q.x, p.y - cy), r = orgR(o) * (o.sp === 'oak' ? 1.05 : 1.3); if (d < r && d < bd) { bd = d; best = o; } });
      if (best) { G.sel = best.id; Sound.tick(); rlast = ''; }
      return false;
    },
    move(p) { if (S.sub.group === 'sort') S.sorter.move(p); },
    up(p) { if (S.sub.group === 'sort') S.sorter.up(p); },
    hover(p) { return S.sub.group === 'sort' ? S.sorter.hover(p) : 'pointer'; },
  };


  /* ================= ③ 시스템: 단계표와 박동 모의 ================= */
  const stageCol = (i) => C.mix('#16a34a', '#7c3aed', i / 7);
  function makeSys() {
    S.sys = { stage: 0, ans: STG.map(() => [-1, -1, -1]), bad: STG.map(() => [false, false, false]), ver: STG.map(() => false), K: 0, hold: 0 };
    makeBeat();
  }
  const NC = 5, NR = 4, NB = 20;
  function makeBeat() {
    const rng = mulberry(31 + Math.floor(Math.random() * 90));
    const B = S.sys.beat = { th: [], om: [], hist: [], hT: 0, r: 0, rS: 0, mean: 0, acc: 0 };
    for (let i = 0; i < NB; i++) { B.th.push(rng() * TAU); B.om.push(TAU * (1.1 + 0.2 * (rng() * 2 - 1))); }
    for (let k = 0; k < 180; k++) B.hist.push([0.3, 0.3]);
  }
  const cont = (th) => Math.max(0, Math.sin(th));
  const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(TAU * Math.random());
  function stepBeat(dt) {
    const B = S.sys.beat, Ke = S.sys.K * 6, n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
    for (let s = 0; s < n; s++) {
      const nt = B.th.slice();
      for (let i = 0; i < NB; i++) {
        const r = Math.floor(i / NC), c = i % NC; let sum = 0;
        if (c > 0) sum += Math.sin(B.th[i - 1] - B.th[i]); if (c < NC - 1) sum += Math.sin(B.th[i + 1] - B.th[i]); if (r > 0) sum += Math.sin(B.th[i - NC] - B.th[i]); if (r < NR - 1) sum += Math.sin(B.th[i + NC] - B.th[i]);
        nt[i] = B.th[i] + (B.om[i] + Ke * sum) * h + 0.6 * Math.sqrt(h) * gauss();
      }
      B.th = nt;
    }
    let x = 0, y = 0, m = 0; B.th.forEach((a) => { x += Math.cos(a); y += Math.sin(a); m += cont(a); });
    B.r = Math.hypot(x, y) / NB; B.mean = m / NB; B.rS = SciSim.approach(B.rS, B.r, dt, 6);
    B.acc += dt; while (B.acc >= 1 / 30) { B.acc -= 1 / 30; B.hist.push([cont(B.th[0]), B.mean]); B.hist.shift(); }
    const S2 = S.sys; if (B.r >= 0.9) S2.hold += dt; else S2.hold = 0;
  }
  const SY = PHONE
    ? { chip: (i) => ({ x: 8 + (i % 4) * 118, y: 8 + Math.floor(i / 4) * 46, w: 112, h: 40 }), det: { x: 8, y: 106, w: 464, h: 384 }, rows: [150, 236, 322], rh: 78 }
    : { chip: (i) => { const w = 120 + i * 14; return { x: 131 - w / 2, y: 64 + (7 - i) * 56, w, h: 48 }; }, det: { x: 262, y: 52, w: 522, h: 496 }, rows: [138, 246, 354], rh: 98 };
  const ROWN = [['🧩 구성 요소', '#0d9488', COMP], ['🔗 상호작용', '#f59e0b', INTER], ['✨ 새로 나타나는 기능', '#7c3aed', NEWF]];
  function stepSys(dt) {
    if (S.sub.sys === 'beat') stepBeat(dt); else if (S.sys.beat) { const B = S.sys.beat; /* 표 화면에서도 조금씩 */ }
  }
  function drawSysTable() {
    const Y = S.sys, det = SY.det;
    for (let i = 0; i < 8; i++) {
      const r = SY.chip(i), on = Y.stage === i, done = Y.ans[i].every((a) => a >= 0), ok = Y.ver[i];
      ctx.save(); D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = on ? stageCol(i) : '#fff'; ctx.fill(); }, { blur: on ? 9 : 4, y: 2 });
      ctx.strokeStyle = ok ? '#22c55e' : stageCol(i); ctx.lineWidth = ok || on ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      T(r.x + r.w / 2 - (done ? 8 : 0), r.y + r.h / 2 + 5, STG[i], PHONE ? 14 : 15, on ? '#fff' : '#26324a', 'center', 800);
      if (done) T(r.x + r.w - 14, r.y + r.h / 2 + 5, ok ? '✅' : '✏️', 13, '#000', 'center', 600);
      ctx.restore();
    }
    if (!PHONE) { T(131, 56, '⬆ 큰 단계', 12.5, '#7c3aed', 'center', 800); T(131, 64 + 8 * 56 + 4, '⬇ 작은 단계', 12.5, '#16a34a', 'center', 800); }
    panel(det.x, det.y, det.w, det.h, 16);
    const st = Y.stage;
    D.label(det.x + 14, det.y + 24, STG[st], { bg: stageCol(st), size: 15, align: 'left' });
    T(det.x + 90, det.y + 30, '예: ' + EXAMPLE[st], PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    ROWN.forEach((rw, k) => {
      const a = Y.ans[st][k], bad = Y.bad[st][k], rh = SY.rh;
      const yy = PHONE ? SY.rows[k] - 8 : SY.rows[k] - 20;
      D.roundRect(det.x + 12, yy, det.w - 24, rh, 12); ctx.fillStyle = bad ? '#fdeceb' : Y.ver[st] ? '#e8f8ee' : a >= 0 ? '#eef4ff' : '#f6f8f7'; ctx.fill();
      ctx.strokeStyle = bad ? '#e2464b' : Y.ver[st] ? '#22c55e' : a >= 0 ? '#8aa8e8' : '#d3ddd8'; ctx.lineWidth = 2.5; if (a < 0) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(det.x + 24, yy + 22, rw[0], 14, rw[1], 'left', 800);
      if (a >= 0) textBlock(det.x + 24, yy + (PHONE ? 46 : 52), det.w - 48, rw[2][a], PHONE ? 13.5 : 15.5, '#26324a', 20, 800);
      else T(det.x + 24, yy + (PHONE ? 50 : 56), '오른쪽(아래) 고르기 칸에서 골라요', 13, '#98a2b3', 'left', 800);
    });
    const by = det.y + det.h - (PHONE ? 52 : 36);
    textBlock(det.x + 16, by, det.w - 32, '💡 구성 요소가 상호작용하면 하위 단계에 없던 새 기능이 나타나요.', PHONE ? 13 : 13.5, '#166534', 19, 800);
    const dn = Y.ver.filter((v) => v).length;
    T(det.x + det.w - 14, det.y + 30, '확인한 단계 ' + dn + ' / 8', 13, '#7b8a80', 'right', 800);
  }
  function drawBeat(dt) {
    const Y = S.sys, B = Y.beat, K = Y.K;
    const tp = PHONE ? { x: 8, y: 8, w: 464, h: 262 } : { x: 16, y: 52, w: 520, h: 324 };
    panel(tp.x, tp.y, tp.w, tp.h, 16);
    const px = PHONE ? 88 : 92, py = PHONE ? 58 : 66, cx0 = tp.x + tp.w / 2, cy0 = tp.y + (PHONE ? 126 : 150);
    const pos = (i) => ({ x: cx0 + ((i % NC) - 2) * px, y: cy0 + (Math.floor(i / NC) - 1.5) * py });
    // 조직 윤곽
    const m = B.mean, sync = B.rS;
    D.glow(cx0, cy0, tp.w * 0.42, '#f87171', 0.1 + 0.4 * m * sync);
    ctx.save(); const sc = 1 - 0.035 * m * sync; ctx.translate(cx0, cy0); ctx.scale(sc, sc); ctx.translate(-cx0, -cy0);
    D.roundRect(cx0 - px * 2.75, cy0 - py * 2.2, px * 5.5, py * 4.4, 30); ctx.fillStyle = 'rgba(248,113,113,' + (0.08 + 0.12 * sync) + ')'; ctx.fill(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(190,60,80,.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    // 연결선
    for (let i = 0; i < NB; i++) {
      const r = Math.floor(i / NC), c = i % NC;
      [[c < NC - 1, i + 1], [r < NR - 1, i + NC]].forEach((nb) => {
        if (!nb[0]) return; const a = pos(i), b = pos(nb[1]), diff = Math.cos(B.th[i] - B.th[nb[1]]);
        ctx.strokeStyle = C.rgba(diff > 0.9 ? '#22c55e' : '#f59e0b', 0.12 + 0.75 * K * (diff > 0.9 ? 1 : 0.7)); ctx.lineWidth = 1 + 5 * K; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
    }
    for (let i = 0; i < NB; i++) {
      const p = pos(i), c = cont(B.th[i]), w = (PHONE ? 70 : 78) * (1 - 0.2 * c), h = (PHONE ? 38 : 46) * (1 + 0.14 * c);
      ctx.save(); ctx.translate(p.x, p.y);
      D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, h / 2.2); const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, C.mix('#fbc3cc', '#f87171', c)); g.addColorStop(1, C.mix('#e8808f', '#dc2626', c)); ctx.fillStyle = g; ctx.fill(); }, { blur: 5 + 5 * c, y: 2 });
      ctx.strokeStyle = 'rgba(150,40,60,.6)'; ctx.lineWidth = 2; D.roundRect(-w / 2, -h / 2, w, h, h / 2.2); ctx.stroke();
      D.sphere(0, 0, 7, '#8b6fcf', { gloss: false });
      if (i === 0) { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; D.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, h / 2); ctx.stroke(); D.label(0, -h / 2 - 14, '세포 1개', { bg: '#2563eb', size: 11.5 }); }
      ctx.restore();
    }
    T(tp.x + tp.w / 2, tp.y + tp.h - 12, K < 0.1 ? '연결이 없어서 세포마다 따로 떨려요' : sync > 0.85 ? '세포들이 한꺼번에 수축해요: 조직의 박동!' : '연결을 통해 신호를 주고받으며 맞춰 가요', PHONE ? 13 : 14, '#7a2236', 'center', 800);
    // 게이지
    const gx = PHONE ? 8 : 548, gy = PHONE ? 280 : 52, gw = PHONE ? 464 : 236;
    const bar = (x, y, w, lab, v, col, txt) => { T(x, y, lab, 13.5, '#26324a', 'left', 800); T(x + w, y, txt, 14, col, 'right', 800); D.roundRect(x, y + 8, w, 16, 8); ctx.fillStyle = '#e5ece8'; ctx.fill(); if (v > 0.005) { D.roundRect(x, y + 8, Math.max(16, w * clamp(v, 0, 1)), 16, 8); ctx.fillStyle = col; ctx.fill(); } };
    if (PHONE) { bar(gx + 4, gy + 14, 224, '세포 연결 세기', K, '#f59e0b', Math.round(K * 100) + ' %'); bar(gx + 244, gy + 14, 216, '동기화 정도', B.rS, B.rS >= 0.9 ? '#16a34a' : '#0d9488', Math.round(B.rS * 100) + ' %'); }
    else {
      panel(gx, gy, gw, 324, 16);
      bar(gx + 14, gy + 34, gw - 28, '세포 연결 세기', K, '#f59e0b', Math.round(K * 100) + ' %');
      bar(gx + 14, gy + 96, gw - 28, '동기화 정도', B.rS, B.rS >= 0.9 ? '#16a34a' : '#0d9488', Math.round(B.rS * 100) + ' %');
      textBlock(gx + 14, gy + 166, gw - 28, B.rS >= 0.9 ? '동기화 정도가 90 % 이상이에요. 세포들이 한꺼번에 수축해서 박동이 생겼어요.' : '연결을 높이면 세포들이 서로 맞춰서 수축해요. 동기화 정도를 90 % 이상으로 만들어요.', 13.5, '#3a465c', 20, 700);
      textBlock(gx + 14, gy + 262, gw - 28, '💡 세포가 많기만 해서는 안 돼요. 연결과 상호작용이 있어야 새 기능이 나타나요.', 13, '#166534', 18, 800);
    }
    // 수축 힘 그래프
    const cx = PHONE ? 8 : 16, cyy = PHONE ? 344 : 388, cw = PHONE ? 464 : 768, ch = PHONE ? 140 : 160;
    panel(cx, cyy, cw, ch, 14);
    T(cx + 14, cyy + 22, '수축 힘 (최근 6초)', 13.5, '#26324a', 'left', 800);
    D.label(cx + cw - 12, cyy + 20, '조직 전체', { bg: '#16a34a', size: 12, align: 'right' }); D.label(cx + cw - (PHONE ? 100 : 108), cyy + 20, '세포 1개', { bg: '#2563eb', size: 12, align: 'right' });
    const gx0 = cx + 14, gx1 = cx + cw - 14, gy0 = cyy + 34, gy1 = cyy + ch - 12;
    ctx.strokeStyle = '#dbe3de'; ctx.lineWidth = 1.5; ctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    [[1, 0, '#2563eb', 2], [1, 1, '#16a34a', 4]].forEach((ln) => {
      ctx.strokeStyle = ln[2]; ctx.lineWidth = ln[3]; ctx.lineJoin = 'round'; ctx.beginPath();
      B.hist.forEach((hh, k) => { const x = gx0 + (gx1 - gx0) * k / (B.hist.length - 1), v = ln[1] === 1 ? clamp((hh[1] - 0.3) / 0.7 * 0.9 + 0.05, 0, 1) * 1 : clamp(hh[0], 0, 1), y = gy1 - 4 - (gy1 - gy0 - 8) * v; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
    });
    if (S.sys.beat) { parts.update(dt); parts.draw(ctx); }
  }
  function drawSys(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    if (S.sub.sys === 'table') drawSysTable(); else drawBeat(dt);
  }
  PT_SYS = {
    down(p) {
      if (S.sub.sys !== 'table') return false;
      for (let i = 0; i < 8; i++) if (inRect(p.x, p.y, SY.chip(i))) { S.sys.stage = i; Sound.tick(); rlast = ''; syncControls(); }
      return false;
    },
    hover(p) { if (S.sub.sys !== 'table') return 'default'; for (let i = 0; i < 8; i++) if (inRect(p.x, p.y, SY.chip(i))) return 'pointer'; return 'default'; },
  };

  /* ================= ④ 설명 자료 만들기 ================= */
  const CASES = {
    run: ['심근 세포', '심장 근육 조직', '심장', '순환계', '달리는 사람 1명', '공원에 있는 모든 사람', '공원의 모든 생물', '공원 + 햇빛·토양·공기'],
    deer: ['위 상피 세포', '위 상피 조직', '위', '소화계', '숲의 사슴 1마리', '숲의 모든 사슴', '숲의 모든 생물', '숲 + 빛·토양·공기'],
  };
  const CASE_NAME = { run: '🏃 달리는 사람', deer: '🦌 숲의 사슴' };
  function makeMake(cs) {
    const old = S.mk; cs = cs || (old ? old.cs : 'run');
    const M = S.mk = { cs, ord: null, solved: false, sel: [{ s: -1, f: -1 }, { s: -1, f: -1 }, { s: -1, f: -1 }], saved: false, st: 0 };
    M.ord = new Reorder({
      items: CASES[cs].map((l, i) => ({ id: 'st' + i, label: l, col: stageCol(i), sub: '' })),
      slots: PHONE ? CASES[cs].map((l, i) => ({ x: 8, y: 62 + i * 48 })) : CASES[cs].map((l, i) => ({ x: 22 + (i % 4) * 192, y: 112 + Math.floor(i / 4) * 104 })),
      cw: PHONE ? 464 : 180, ch: PHONE ? 42 : 80, solution: CASES[cs].map((l, i) => 'st' + i),
      slotNames: ['① 가장 작음', '②', '③', '④', '⑤', '⑥', '⑦', '⑧ 가장 큼'],
      onChange: () => { M.ord.clearBad(); rlast = ''; },
    });
  }
  function stepMake(dt) { const M = S.mk; M.ord.update(dt); M.st = M.saved ? Math.min(1, M.st + dt * 2.5) : 0; }
  function drawMake(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    const M = S.mk;
    if (S.sub.make === 'order') {
      T(VW / 2, PHONE ? 30 : 48, CASE_NAME[M.cs] + ': 작은 단계에서 큰 단계 순서로 놓아요', PHONE ? 14.5 : 17, '#26324a', 'center', 800);
      if (!PHONE) T(VW / 2, 82, '8장의 카드를 끌어서 ①~⑧에 놓아요. 아래 단계가 모여 위 단계를 이뤄요.', 13.5, '#5a6679', 'center', 800);
      M.ord.draw();
      if (M.solved) T(VW / 2, PHONE ? 62 + 8 * 48 + 14 : 360, '✅ 카드 순서가 맞아요! 다음은 🗺 확대 지도에서 새 기능을 정리해요.', PHONE ? 13 : 14.5, '#166534', 'center', 800);
    } else {
      const ar = PHONE ? { x: 8, y: 8, w: 464, h: 620 } : { x: 16, y: 52, w: 768, h: 496 }, ix = PHONE ? 12 : 30, iy = PHONE ? 38 : 26;
      for (let i = 7; i >= 0; i--) {
        const k = 7 - i, x = ar.x + k * ix, y = ar.y + k * iy, w = ar.w - 2 * k * ix, h = ar.h - 2 * k * iy;
        D.roundRect(x, y, w, h, 18); ctx.fillStyle = C.rgba(stageCol(i), 0.1 + 0.02 * k); ctx.fill(); ctx.strokeStyle = C.rgba(stageCol(i), 0.8); ctx.lineWidth = 2.5; ctx.stroke();
        TF(x + 12, y + (PHONE ? 22 : 20), STG[i] + ' · ' + CASES[M.cs][i], w - 24, 13.5, 10.5, C.shade(stageCol(i), -0.4), 'left', 800);
        const as = M.sel.findIndex((q) => q.s === i && q.f >= 0);
        if (as >= 0) { const ok = M.sel[as].f === i; const lw = Math.min(w - 24, PHONE ? 300 : 340); if (w > (PHONE ? 130 : 200)) D.label(x + w - 12, y + (PHONE ? 22 : 20), '✨ ' + NEWF[M.sel[as].f].split(':')[0].slice(0, 22), { bg: M.saved ? '#16a34a' : '#7c3aed', size: 11.5, align: 'right' }); }
      }
      if (M.saved) { ctx.save(); const k = smooth(M.st); ctx.translate(ar.x + ar.w - 90, ar.y + ar.h - 56); ctx.rotate(-0.12); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.globalAlpha = k; D.roundRect(-70, -22, 140, 44, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.stroke(); T(0, 7, '💾 저장됨', 20, '#16a34a', 'center', 800); ctx.restore(); }
      if (!M.saved) { const q = PHONE ? 8 : 16; }
    }
    parts.update(dt); parts.draw(ctx);
  }
  PT_MAKE = {
    down(p) { return S.sub.make === 'order' ? S.mk.ord.down(p) : false; },
    move(p) { if (S.sub.make === 'order') S.mk.ord.move(p); },
    up(p) { if (S.sub.make === 'order') S.mk.ord.up(p); },
    hover(p) { return S.sub.make === 'order' ? S.mk.ord.hover(p) : 'default'; },
  };


  /* ================= 제어판 · 읽음 칸 ================= */
  let rlast = '';
  const sel = {};
  function fillSel(id, opts, ph) { const s = $(id); s.innerHTML = '<option value="">' + ph + '</option>' + opts.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join(''); return s; }
  function buildSelects() {
    sel.stage = fillSel('#sysStage', STG.map((s, i) => [i, s]), '— 단계 고르기 —');
    sel.c1 = fillSel('#sysC1', PERM8.c1.map((i) => [i, COMP[i]]), '— 고르기 —');
    sel.c2 = fillSel('#sysC2', PERM8.c2.map((i) => [i, INTER[i]]), '— 고르기 —');
    sel.c3 = fillSel('#sysC3', PERM8.c3.map((i) => [i, NEWF[i]]), '— 고르기 —');
    sel.stage.removeAttribute('data-ph'); sel.stage.firstChild.disabled = true;
    sel.stage.addEventListener('change', () => { if (sel.stage.value !== '') { S.sys.stage = +sel.stage.value; Sound.click(); rlast = ''; syncControls(); } });
    ['c1', 'c2', 'c3'].forEach((k, ki) => sel[k].addEventListener('change', () => {
      const Y = S.sys, v = sel[k].value; Y.ans[Y.stage][ki] = v === '' ? -1 : +v; Y.bad[Y.stage][ki] = false; Y.ver[Y.stage] = false; Sound.click(); rlast = ''; syncControls();
    }));
    [1, 2, 3].forEach((n) => {
      sel['ms' + n] = fillSel('#mkS' + n, STG.map((s, i) => [i, s]), '— 단계 —');
      sel['mf' + n] = fillSel('#mkF' + n, PERM8.f.map((i) => [i, NEWF[i]]), '— 새 기능 —');
      sel['ms' + n].addEventListener('change', () => { S.mk.sel[n - 1].s = sel['ms' + n].value === '' ? -1 : +sel['ms' + n].value; S.mk.saved = false; Sound.click(); rlast = ''; });
      sel['mf' + n].addEventListener('change', () => { S.mk.sel[n - 1].f = sel['mf' + n].value === '' ? -1 : +sel['mf' + n].value; S.mk.saved = false; Sound.click(); rlast = ''; });
    });
  }
  function syncControls() {
    if (!S.zm || !S.sys || !S.mk || !S.grp) return;
    const Zm = S.zm, Y = S.sys, M = S.mk, G = S.grp;
    $('#sZoom').value = Zm.tz; $('#sZoom').style.setProperty('--pct', (Zm.tz / 4 * 100) + '%'); $('#oZoom').textContent = LV[clamp(Math.round(Zm.tz), 0, 4)].name;
    $('#zIn').disabled = Zm.tz >= 3.99; $('#zOut').disabled = Zm.tz <= 0.01;
    $('#zoomNote').textContent = Zm.tz < 0.5 ? '아래 확대 단추를 눌러 사람의 몸속으로 들어가 봐요.' : LV[clamp(Math.round(Zm.tz), 0, 4)].role;
    $$('#grpSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.g === G.g));
    $('#grpNote').textContent = GTXT[G.g][0] + ': ' + GTXT[G.g][1];
    sel.stage.value = Y.stage; ['c1', 'c2', 'c3'].forEach((k, ki) => { sel[k].value = Y.ans[Y.stage][ki] < 0 ? '' : Y.ans[Y.stage][ki]; sel[k].classList.toggle('bad', Y.bad[Y.stage][ki]); });
    $('#sysNote').textContent = '「' + STG[Y.stage] + '」(예: ' + EXAMPLE[Y.stage] + ')의 구성 요소 · 상호작용 · 새 기능을 골라요.';
    $('#sLink').value = Math.round(Y.K * 100); $('#sLink').style.setProperty('--pct', (Y.K * 100) + '%'); $('#oLink').textContent = Math.round(Y.K * 100) + ' %';
    $$('#caseSeg button').forEach((b) => b.classList.toggle('on', b.dataset.cs === M.cs));
    [1, 2, 3].forEach((n) => { sel['ms' + n].value = M.sel[n - 1].s < 0 ? '' : M.sel[n - 1].s; sel['mf' + n].value = M.sel[n - 1].f < 0 ? '' : M.sel[n - 1].f; sel['ms' + n].classList.remove('bad'); sel['mf' + n].classList.remove('bad'); });
    $('#mkNote').textContent = M.saved ? '💾 체계도를 저장했어요!' : '서로 다른 단계 3개를 골라, 그 단계에서 새로 나타나는 기능을 짝지어요.';
  }
  $('#sZoom').addEventListener('input', (e) => { S.zm.tz = +e.target.value; rlast = ''; syncControls(); });
  $('#zIn').addEventListener('click', () => { Sound.click(); S.zm.tz = Math.min(4, Math.floor(S.zm.tz + 0.01) + 1); syncControls(); });
  $('#zOut').addEventListener('click', () => { Sound.click(); S.zm.tz = Math.max(0, Math.ceil(S.zm.tz - 0.01) - 1); syncControls(); });
  $('#bZoOrd').addEventListener('click', () => { Sound.click(); S.zm.ord = zoomOrd(); });
  $$('#grpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.grp.g = +b.dataset.g; S.grp.seen[S.grp.g] = true; rlast = ''; syncControls(); parts.burst(PHONE ? 240 : 400, 120, { count: 6, speed: 70, size: 2.6, colors: ['#16a34a', '#fbbf24'], gravity: 0, life: 0.5 }); }));
  $('#bSortReset').addEventListener('click', () => { Sound.click(); S.sorter.reset(); });
  $('#sLink').addEventListener('input', (e) => { S.sys.K = (+e.target.value) / 100; rlast = ''; syncControls(); });
  $('#bBeatReset').addEventListener('click', () => { Sound.click(); makeBeat(); });
  $$('#caseSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); makeMake(b.dataset.cs); rlast = ''; syncControls(); }));
  $('#bMkReset').addEventListener('click', () => { Sound.click(); makeMake(S.mk.cs); syncControls(); });
  function onEnterView() {
    PT = { zoom: PT_ZOOM, group: PT_GROUP, sys: PT_SYS, make: PT_MAKE }[S.mode]; rlast = '';
  }

  function readouts() {
    let a, b, c, L1, L2, L3; const sub = S.sub[S.mode];
    if (S.mode === 'zoom') {
      const Zm = S.zm, nj = clamp(Math.round(Zm.z), 0, 4);
      if (sub === 'zoom') { L1 = '지금 단계'; a = LV[nj].name; L2 = '크기'; b = LV[nj].size.replace('폭 약 ', '약 ').replace('길이 ', '').replace('지름 ', ''); L3 = '살펴본 단계'; c = Object.keys(Zm.seen).length + ' / 5'; }
      else { L1 = '맞는 자리'; a = (5 - Zm.ord.wrongIds().length) + ' / 5'; L2 = '순서'; b = '작음 → 큼'; L3 = '상태'; c = Zm.ord.solved ? '완성' : '배열 중'; }
    } else if (S.mode === 'group') {
      const G = S.grp;
      if (sub === 'view') { const sp = ORG.find((o) => o.id === G.sel).sp; L1 = '묶는 단계'; a = GTXT[G.g][0]; L2 = '고른 생물'; b = SPN[sp]; L3 = '묶인 개체 수'; c = (G.g === 0 ? 1 : G.g === 1 ? ORG.filter((o) => o.sp === sp).length : ORG.length) + '개'; }
      else { L1 = '분류한 카드'; a = S.sorter.placed + ' / 8'; L2 = '상자'; b = '6개'; L3 = '맞는 카드'; c = S.sorter.cards.filter((x) => x.zone && x.zone === SORT_CARDS.find((q) => q.id === x.id).ans).length + ' / 8'; }
    } else if (S.mode === 'sys') {
      const Y = S.sys;
      if (sub === 'table') { L1 = '고른 단계'; a = STG[Y.stage]; L2 = '채운 칸'; b = Y.ans.reduce((n, r) => n + r.filter((x) => x >= 0).length, 0) + ' / 24'; L3 = '확인한 단계'; c = Y.ver.filter((v) => v).length + ' / 8'; }
      else { L1 = '세포 연결 세기'; a = Math.round(Y.K * 100) + ' %'; L2 = '동기화 정도'; b = Math.round(Y.beat.r * 100) + ' %'; L3 = '조직의 상태'; c = Y.beat.r >= 0.9 ? '한꺼번에 수축' : Y.beat.r >= 0.5 ? '맞춰 가는 중' : '불규칙한 떨림'; }
    } else {
      const M = S.mk;
      L1 = '사례'; a = CASE_NAME[M.cs].slice(3); L2 = '카드 순서'; b = M.ord.solved ? '맞아요' : (8 - M.ord.wrongIds().length) + ' / 8 자리'; L3 = '체계도'; c = M.saved ? '저장함' : '만드는 중';
    }
    const key = [L1, a, L2, b, L3, c].join('|'); if (key === rlast) return; rlast = key; syncControls();
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '세포에서 개체까지: 확대해 보기', short: '세포~개체', icon: '🔍', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 수많은 세포가 모이면 왜 세포 하나와는 전혀 다른 일을 할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 생물의 구성 단계(세포 → 조직 → 기관 → 개체)를 배웠고, <b>통합과학</b>에서 세포가 생명 시스템의 기본 단위라는 것을 배웠어요.</div>' +
        '<p>사람 몸을 <b>개체 → 기관계 → 기관 → 조직 → 세포</b> 순서로 확대해 가며 각 단계의 이름, 크기, 하는 일을 살펴봐요. 크기 눈금은 <b>로그 눈금</b>(한 칸마다 10배)이에요.</p>',
      features: ['zoom'],
      setup() { makeZoom(); setScene('zoom', 'zoom'); },
      recap: '개체 → 기관계 → 기관 → 조직 → 세포로 확대하면 크기가 점점 작아져요. 각 단계는 아래 단계가 모여 이루어져요.',
      summary: '<ul><li>구성 단계(동물): <b>세포 → 조직 → 기관 → 기관계 → 개체</b></li><li>사례: 심근 세포(지름 약 20 µm) → 심장 근육 조직 → <b>심장(기관, 약 12 cm)</b> → <b>순환계(기관계)</b> → 사람(개체, 약 1.7 m)</li><li>심장은 <b>기관</b>, 소화계는 <b>기관계</b>예요.</li><li>크기는 <b>로그 눈금</b>(10 µm · 1 mm · 10 cm · 1 m · 1 km)으로 나타내요.</li></ul>',
      missions: [
        {
          title: '개체에서 세포까지 확대하기',
          goal: '확대 정도를 올려 <b>5단계(개체·기관계·기관·조직·세포)를 모두</b> 지나 세포까지 들어가 보세요.',
          hint: '오른쪽 확대 단추를 누르거나 슬라이더를 오른쪽으로 끌어요. 각 단계에서 잠깐 멈추면 기록돼요.',
          setup() { setScene('zoom', 'zoom'); },
          check: () => LV.every((l, j) => S.zm.seen[j]), hold: 0.5,
          status: () => LV.map((l, j) => mark(!!S.zm.seen[j]) + l.name).join(' '),
          explain: '사람(개체)을 확대하면 <b>순환계(기관계) → 심장(기관) → 심장 근육 조직 → 심근 세포</b>가 차례로 보여요. 크기는 약 1.7 m에서 약 20 µm까지 줄어들어요.',
        },
        {
          title: '구성 단계 순서 배열', manual: true,
          goal: '카드 5장을 <b>작은 단계에서 큰 단계</b> 순서로 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '세포가 모여 조직, 조직이 모여 기관을 이루어요. 가장 작은 단계는 세포예요.',
          setup() { setScene('zoom', 'order'); },
          check() { const o = S.zm.ord; if (o.solved) return true; o.markBad(o.wrongIds()); return '빨간 카드는 자리가 달라요. 아래 단계가 모여 위 단계를 이루는 순서를 생각해 보세요.'; },
          status: () => '맞는 자리 ' + (5 - S.zm.ord.wrongIds().length) + ' / 5',
          explain: '<b>세포 → 조직 → 기관 → 기관계 → 개체</b> 순서예요. 같은 일을 하는 세포가 모여 조직, 여러 조직이 모여 기관, 관련된 기관이 모여 기관계, 기관계가 모여 개체가 돼요.',
        },
        {
          type: 'quiz', title: '심장과 소화계는 어느 단계일까?',
          goal: '<b>심장</b>과 <b>소화계</b>는 각각 어느 구성 단계일까요?',
          setup() { setScene('zoom', 'zoom'); },
          choices: ['심장은 기관, 소화계는 기관계', '심장은 조직, 소화계는 기관', '심장은 기관계, 소화계는 기관', '둘 다 기관'],
          answer: 0,
          feedback: ['', '심장은 여러 조직(근육 조직 등)으로 이루어진 하나의 기관이에요. 조직보다 한 단계 위예요.', '심장 하나는 기관이고, 기관이 여러 개 모인 소화계가 기관계예요.', '소화계는 위·소장·간 등 여러 기관이 모인 기관계예요.'],
          explain: '심장은 심장 근육 조직 등이 모인 <b>기관</b>이고, 소화계는 입·위·소장·간 같은 여러 기관이 협력하는 <b>기관계</b>예요.',
        },
      ],
    },
    {
      title: '개체에서 생태계까지: 묶어 보기', short: '개체~생태계', icon: '🌲', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포가 모여 개체가 되는 것을 확대해 보았어요. 이번에는 거꾸로 <b>개체 위의 단계</b>를 숲에서 묶어 봐요.</div>' +
        '<p>같은 종끼리 묶으면 <b>개체군</b>, 모든 종을 묶으면 <b>군집</b>, 빛·토양·공기 같은 비생물 환경까지 더하면 <b>생태계</b>예요. 숲의 생물을 눌러 골라 보고, 8장의 카드를 단계 상자에 분류해요.</p>',
      features: ['group'],
      setup() { makeGroup(); makeSorter(); setScene('group', 'view'); },
      recap: '같은 종의 개체들은 개체군, 여러 종의 개체군은 군집, 군집에 비생물 환경이 더해지면 생태계예요.',
      summary: '<ul><li><b>개체군</b>: 같은 지역의 같은 종 / <b>군집</b>: 같은 지역의 여러 종(모든 생물) / <b>생태계</b>: 군집 + 비생물 환경</li><li>개체군과 군집을 가르는 기준은 <b>한 종인가, 여러 종인가</b>예요.</li><li>생태계는 군집에 <b>빛·공기·토양·물</b> 같은 비생물 환경이 더해지고 서로 영향을 주고받아요.</li><li>8단계: 세포 → 조직 → 기관 → 기관계 → 개체 → 개체군 → 군집 → 생태계</li></ul>',
      missions: [
        {
          title: '8장의 카드를 알맞은 단계에 분류하기', manual: true,
          goal: '카드를 끌어서 <b>기관 · 기관계 · 개체 · 개체군 · 군집 · 생태계</b> 상자에 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '🌲 묶어 보기 화면에서 개체군·군집·생태계의 차이를 다시 보세요. 한 종이면 개체군, 여러 종이면 군집, 비생물 환경까지 있으면 생태계예요.',
          setup() { setScene('group', 'sort'); },
          check() {
            const sd = S.sorter, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => c.zone !== SORT_CARDS.find((q) => q.id === c.id).ans);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 단계가 달라요: ' + wrong.map((c) => c.label).join(', ') + '. 한 종인지, 여러 종인지, 비생물 환경이 포함되는지 따져 보세요.';
            return true;
          },
          status: () => '분류한 카드 ' + S.sorter.placed + ' / 8',
          explain: '위 → <b>기관</b>, 사람의 소화계 → <b>기관계</b>, 참나무 한 그루·사슴 한 마리 → <b>개체</b>, 숲속의 모든 참나무·호수의 모든 붕어 → <b>개체군</b>, 연못의 모든 생물 → <b>군집</b>, 연못 + 물·햇빛·모든 생물 → <b>생태계</b>예요.',
        },
        {
          type: 'quiz', title: '생태계가 군집과 다른 점은?',
          goal: '<b>생태계</b>가 <b>군집</b>과 다른 점은 무엇일까요?',
          setup() { setScene('group', 'view'); S.grp.g = 3; syncControls(); },
          choices: ['군집에 빛·공기·토양 같은 비생물 환경이 더해져 서로 영향을 주고받는다', '군집보다 생물의 종류가 더 적다', '한 종의 생물만 포함한다', '생물의 수가 더 많기만 하면 생태계다'],
          answer: 0,
          feedback: ['', '생태계는 군집(모든 종)에 비생물 환경을 더한 것이라 종류가 줄어들지 않아요.', '한 종만 묶은 것은 개체군이에요.', '수가 아니라 비생물 환경이 포함되는지가 기준이에요.'],
          explain: '<b>군집</b>은 생물만, <b>생태계</b>는 군집에 <b>비생물 환경(빛·공기·토양·물)</b>이 더해진 시스템이에요. 생물과 환경이 서로 영향을 주고받아요.',
        },
      ],
    },
    {
      title: '생명 시스템: 부분이 모여 새 기능이 생겨요', short: '시스템', icon: '🧩', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 8개의 구성 단계를 모두 살펴봤어요. 이번에는 <b>각 단계가 왜 하나의 시스템인지</b> 정리해요.</div>' +
        '<p>각 단계는 <b>구성 요소 – 상호작용 – 새로 나타나는 기능</b>으로 설명할 수 있어요. 하위 단계에는 없던 기능이 상호작용으로 나타나는 거예요. 먼저 단계표를 채우고, 💓 박동 모의에서 세포의 연결을 바꿔 새 기능이 어떻게 생기는지 확인해요.</p>',
      features: ['sys'],
      setup() { makeSys(); setScene('sys', 'table'); },
      recap: '각 단계는 구성 요소들이 상호작용해서 하위 단계에는 없던 기능이 나타나는 시스템이에요. 세포가 많기만 해서는 안 되고 연결과 상호작용이 필요해요.',
      summary: '<ul><li>시스템 = <b>구성 요소 – 상호작용 – 새로 나타나는 기능</b> (전체는 부분의 합 이상)</li><li>예: 조직 – 연결된 세포들 – 한꺼번에 수축(박동) / 개체 – 기관계들의 협력 – 항상성 유지 / 군집 – 종 사이 먹이 관계 – 에너지 흐름</li><li>세포 1개는 불규칙하게 떨릴 뿐이지만, <b>연결된 세포들은 신호를 주고받아 한꺼번에 수축</b>해요.</li></ul>',
      missions: [
        {
          title: '단계별 구성 요소 · 상호작용 · 새 기능 채우기', manual: true,
          goal: '8단계 모두 <b>구성 요소 · 상호작용 · 새로 나타나는 기능</b>을 골라 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '단계를 누르고 오른쪽(아래) 고르기 칸에서 세 가지를 골라요. 새 기능은 그 단계에서 처음 나타나는 것이에요.',
          setup() { setScene('sys', 'table'); },
          check() {
            const Y = S.sys; let empty = 0, badStages = [];
            Y.ans.forEach((r, i) => { r.forEach((a, k) => { if (a < 0) { empty++; return; } const wrong = a !== i; Y.bad[i][k] = wrong; }); Y.ver[i] = r.every((a) => a === i); if (r.some((a, k) => a >= 0 && a !== i)) badStages.push(STG[i]); });
            if (empty) return '아직 비어 있는 칸이 ' + empty + '개 있어요.';
            if (badStages.length) return '빨간 칸을 확인해요 (' + badStages.join(', ') + '). 그 단계의 구성 요소와 상호작용, 새 기능을 다시 짝지어 보세요.';
            return true;
          },
          status: () => '채운 칸 ' + S.sys.ans.reduce((n, r) => n + r.filter((x) => x >= 0).length, 0) + ' / 24',
          explain: '예를 들어 <b>조직</b>은 모양과 기능이 비슷한 세포들이 연결되어 신호를 주고받으며 한꺼번에 수축하고, <b>개체</b>는 기관계들이 협력해 항상성을 유지해요. <b>군집</b>은 종 사이의 먹이 관계로 에너지가 흘러요.',
        },
        {
          title: '연결을 높여 박동 만들기',
          goal: '<b>세포 연결 세기</b>를 높여 <b>동기화 정도 90 % 이상</b>인 상태를 만들어 보세요.',
          hint: '연결 세기를 70 % 이상으로 올려 보세요. 잘 맞지 않으면 [🎲 다시 흩뜨리기]를 누르고 다시 해 봐요.',
          setup() { setScene('sys', 'beat'); S.sys.hold = 0; },
          check: () => S.sys.beat.r >= 0.9, hold: 1.5,
          status: () => '동기화 정도 ' + Math.round(S.sys.beat.r * 100) + ' % ' + mark(S.sys.beat.r >= 0.9),
          explain: '세포 1개는 불규칙하게 떨릴 뿐이지만, 세포들이 <b>서로 연결되어 신호를 주고받으면</b> 한꺼번에 수축해요. 이것이 <b>조직에서 새로 나타나는 기능(박동)</b>이에요.',
        },
        {
          type: 'quiz', title: '세포가 많기만 하면 조직일까?',
          goal: '심근 세포를 아무렇게나 모아 놓기만 하면 <b>심장 근육 조직</b>이 될까요?',
          setup() { setScene('sys', 'beat'); },
          choices: ['그렇다. 세포 수가 많으면 저절로 조직이다', '아니다. 세포들이 서로 연결되어 상호작용할 때 조직의 기능이 나타난다', '아니다. 조직은 세포가 아니라 물질로 이루어져 있다', '그렇다. 세포 하나가 더 큰 힘을 내기 때문이다'],
          answer: 1,
          feedback: ['방금 연결이 0 %일 때는 세포가 따로 떨리기만 했어요. 수가 아니라 연결이 중요해요.', '', '조직은 모양과 기능이 비슷한 세포들이 모인 것이에요.', '세포 하나는 약한 힘으로 불규칙하게 떨릴 뿐이에요. 합쳐진 박동은 동기화에서 나와요.'],
          explain: '조직은 세포가 많은 것이 아니라 <b>연결되어 상호작용하는 세포들</b>이에요. 상호작용 덕분에 하위 단계에는 없던 기능(박동)이 나타나요.',
        },
      ],
    },
    {
      title: '체계적인 설명 자료 만들기', short: '설명 자료', icon: '📋', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 각 단계를 구성 요소 · 상호작용 · 새 기능으로 설명했어요. 이제 하나의 <b>사례</b>를 골라 체계적인 설명 자료(확대 지도)를 만들어 봐요.</div>' +
        '<p>① 사례(달리는 사람 / 숲의 사슴)를 고르고 8장의 카드를 <b>작은 단계 → 큰 단계</b> 순서로 배열해요. ② 🗺 확대 지도에서 세 단계를 골라 <b>새로 나타나는 기능</b>을 정리하면 체계도가 저장돼요.</p>',
      features: ['make'],
      setup() { makeMake('run'); setScene('make', 'order'); },
      recap: '설명 자료는 단계 순서, 위·아래 단계의 포함 관계, 새로 나타나는 기능 세 가지를 갖추면 체계적이에요.',
      summary: '<ul><li>설명 자료 평가 기준: <b>단계 순서</b> · <b>상위 단계가 하위 단계를 포함</b> · <b>새 기능 서술 3가지</b></li><li>식물은 <b>기관계가 없고 조직계가 있어요</b>: 세포 → 조직 → 조직계 → 기관 → 개체</li><li>개체 단계의 새 기능 예: <b>항상성 유지</b></li></ul>',
      missions: [
        {
          title: '8단계 카드 배열', manual: true,
          goal: '사례를 고르고 카드 8장을 <b>작은 단계에서 큰 단계</b> 순서로 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '세포 → 조직 → 기관 → 기관계 → 개체 → 개체군 → 군집 → 생태계 순서예요. 개체군은 같은 종, 군집은 모든 생물, 생태계는 비생물 환경까지예요.',
          setup() { setScene('make', 'order'); },
          check() { const M = S.mk; if (M.ord.solved) { M.solved = true; M.ord.cards.forEach((c, i) => { c.sub = STG[+c.id.slice(2)]; }); return true; } M.ord.markBad(M.ord.wrongIds()); return '빨간 카드는 자리가 달라요. 아래 단계가 모여 위 단계를 이루는 순서인지 확인해 보세요.'; },
          status: () => '맞는 자리 ' + (8 - S.mk.ord.wrongIds().length) + ' / 8',
          explain: '위 단계는 아래 단계를 <b>포함</b>해요. 세포가 모여 조직, 조직이 모여 기관, 기관이 모여 기관계, 기관계가 모여 개체가 되고, 개체가 모여 개체군, 개체군이 모여 군집, 군집에 비생물 환경이 더해져 생태계가 돼요.',
        },
        {
          title: '새로 나타나는 기능 3가지 정리', manual: true,
          goal: '🗺 확대 지도에서 <b>서로 다른 3개 단계</b>를 고르고, 각 단계에서 <b>새로 나타나는 기능</b>을 짝지은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '조직은 협동 기능(한꺼번에 수축), 개체는 항상성 유지, 생태계는 물질 순환과 에너지 흐름처럼 단계마다 달라요.',
          setup() { setScene('make', 'map'); },
          check() {
            const M = S.mk, q = M.sel;
            if (q.some((x) => x.s < 0 || x.f < 0)) return '단계와 새 기능을 3줄 모두 골라요.';
            if (new Set(q.map((x) => x.s)).size < 3) return '서로 다른 단계 3개를 골라야 해요.';
            const bad = q.filter((x) => x.f !== x.s);
            if (bad.length) return '짝이 맞지 않는 줄이 있어요: ' + bad.map((x) => STG[x.s]).join(', ') + '. 그 단계에서 처음 나타나는 기능을 골라 보세요.';
            if (!M.saved) { M.saved = true; Sound.success(); parts.burst(PHONE ? 380 : 700, PHONE ? 580 : 500, { count: 22, speed: 160, size: 3.4, colors: ['#22c55e', '#8b5cf6', '#fbbf24'], life: 0.9 }); }
            return true;
          },
          status: () => '고른 줄 ' + S.mk.sel.filter((x) => x.s >= 0 && x.f >= 0).length + ' / 3 &nbsp; ' + mark(S.mk.saved) + ' 저장',
          explain: '각 단계의 <b>새 기능</b>은 하위 단계에는 없던 것이에요. 조직은 협동 수축(박동), 기관은 펌프 같은 한 가지 일, 기관계는 한 가지 생명 활동 전체, 개체는 항상성 유지, 생태계는 물질 순환과 에너지 흐름이에요.',
        },
        {
          type: 'quiz', title: '식물의 구성 단계',
          goal: '<b>식물</b>의 구성 단계에 대한 설명으로 옳은 것은?',
          setup() { setScene('make', 'map'); },
          choices: ['세포 → 조직 → 조직계 → 기관 → 개체 (기관계가 없어요)', '동물과 똑같이 세포 → 조직 → 기관 → 기관계 → 개체', '조직이 없고 기관만 있어요', '기관이 없이 조직계에서 바로 개체가 돼요'],
          answer: 0,
          feedback: ['', '식물에는 기관계가 없어요. 대신 조직계가 있어요.', '식물에도 뿌리·줄기·잎 같은 조직과 기관이 있어요.', '조직계가 모여 기관(뿌리·줄기·잎)을 이루고, 기관이 모여 개체가 돼요.'],
          explain: '식물은 <b>세포 → 조직 → 조직계 → 기관 → 개체</b>예요. 조직계(표피계·관다발계·기본계)가 있고 <b>기관계는 없어요</b>. 중1에서 배운 내용을 한 줄 비교로 확인했어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-life-hierarchy', mount: '#game', badge: '생명 시스템 설계자', homeHref: '../../index.html#hb',
    featureLabels: { zoom: '🔍 확대 · 크기 눈금 · 단계 배열', group: '🌲 숲 묶어 보기 · 단계 분류', sys: '📋 시스템 단계표 · 💓 박동 모의', make: '🗺 설명 자료 · 확대 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildSelects();
  makeZoom(); makeGroup(); makeSorter(); makeSys(); makeMake('run');
  setScene('zoom', 'zoom');
  let lastFree = false;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    if (S.mode === 'zoom') { stepZoom(dt); drawZoom(dt); }
    else if (S.mode === 'group') { stepGroup(dt); drawGroup(dt); }
    else if (S.mode === 'sys') { stepSys(dt); drawSys(dt); }
    else { stepMake(dt); drawMake(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, LV, STG, SORT_CARDS, CASES, ORG, orgXY, get game() { return game; }, setScene, makeMake, SY, EXAMPLE,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'zoom') stepZoom(0.02); else if (S.mode === 'group') stepGroup(0.02); else if (S.mode === 'sys') stepSys(0.02); else stepMake(0.02); } },
  };

})();
