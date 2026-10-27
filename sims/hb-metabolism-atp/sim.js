/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 물질대사와 ATP (단원 3차시)
   성취기준 [12생과01-03] 물질대사 과정에서의 에너지 전환 과정을 바탕으로 다양한 생명 활동에서의 에너지 사용을 추론할 수 있다.
   ① 관찰: 동화와 이화  ② 분석: 에너지 전환  ③ 모형: ATP 충전  ④ 적용: 활동과 에너지
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
      if (c.wrap) {
        const ls = wrap(c.label, w - 22, 13, 800).slice(0, Math.max(1, Math.floor((h - 12) / 17))), y0 = -(ls.length - 1) * 8.5;
        ls.forEach((l, i) => T(0, y0 + i * 17 + 4.5, l, 13, '#26324a', 'center', 800));
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
  let PT_REACT, PT_ENERGY, PT_ATP, PT_APPLY;
  const S = { mode: 'react', sub: { react: 'reac', energy: '', atp: '', apply: 'sort' }, fade: 0, rx: null, en: null, at: null, ap: null, sorter: null, sorter2: null };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const SCENES = {
    react: { label: '🧪 동화와 이화', subs: [['reac', '🧪 반응 실행'], ['sort', '🗂 동화·이화 분류']] },
    energy: { label: '⚡ 에너지 전환', subs: null },
    atp: { label: '🔋 ATP 충전소', subs: null },
    apply: { label: '🏃 활동과 에너지', subs: [['sort', '🗂 에너지 형태'], ['chain', '🔗 운동 추론']] },
  };
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

  /* ================= 분자 그리기 ================= */
  const atom = (x, y, r, col, txt) => D.sphere(x, y, r, col, { gloss: r > 5, text: txt, textScale: 1.05 });
  function mol(kind, x, y, s, rot, a) {
    if (a <= 0.01 || s <= 0.01) return;
    ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(x, y); ctx.rotate(rot);
    if (kind === 'co2') { ctx.strokeStyle = '#8b95a5'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-17 * s, 0); ctx.lineTo(17 * s, 0); ctx.stroke(); atom(-17 * s, 0, 8 * s, '#ef4444', 'O'); atom(17 * s, 0, 8 * s, '#ef4444', 'O'); atom(0, 0, 9.5 * s, '#6b7280', 'C'); }
    else if (kind === 'h2o') { atom(-11 * s, 11 * s, 5.5 * s, '#e5e7eb'); atom(11 * s, 11 * s, 5.5 * s, '#e5e7eb'); atom(0, 0, 9.5 * s, '#3b82f6', 'O'); }
    else if (kind === 'o2') { ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-8 * s, 0); ctx.lineTo(8 * s, 0); ctx.stroke(); atom(-8 * s, 0, 8 * s, '#ef4444', 'O'); atom(8 * s, 0, 8 * s, '#ef4444', 'O'); }
    else if (kind === 'glu') {
      const R = 21 * s; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3 * s; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const t = i / 6 * TAU + 0.5; const px = Math.cos(t) * R, py = Math.sin(t) * R; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
      for (let i = 0; i < 6; i++) { const t = i / 6 * TAU + 0.5; const px = Math.cos(t) * R, py = Math.sin(t) * R; atom(px, py, 8 * s, i === 2 ? '#ef4444' : '#f59e0b', i === 2 ? 'O' : 'C'); atom(Math.cos(t) * (R + 15 * s), Math.sin(t) * (R + 15 * s), 4.5 * s, '#e5e7eb'); }
    }
    ctx.restore();
  }

  /* ================= ① 동화와 이화 ================= */
  const RX = PHONE ? { x: 8, y: 8, w: 464, h: 332 } : { x: 16, y: 52, w: 768, h: 332 };
  const RU = (u, v) => ({ x: RX.x + u * RX.w, y: RX.y + v * RX.h });
  const MSC = PHONE ? 0.78 : 1;
  const COLS = PHONE ? 2 : 3;
  const clusterPos = (i, v0) => RU(0.07 + (i % COLS) * (PHONE ? 0.115 : 0.085), v0 + Math.floor(i / COLS) * (PHONE ? 0.11 : 0.15));
  function makeReact() {
    S.rx = { kind: 'leaf', p: 0, run: false, ran: { leaf: false, muscle: false }, burst: false, fired: 0 };
  }
  const ctr = () => RU(0.5, 0.5);
  function agentsFor(kind) {
    const A = [], c = ctr();
    if (kind === 'leaf') {
      for (let i = 0; i < 6; i++) { A.push({ k: 'co2', a: clusterPos(i, PHONE ? 0.25 : 0.2), d: i * 0.025, mode: 'in', j: i }); A.push({ k: 'h2o', a: clusterPos(i, 0.6), d: i * 0.025 + 0.012, mode: 'in', j: i + 6 }); }
      A.push({ k: 'glu', mode: 'prod' });
      for (let i = 0; i < 6; i++) A.push({ k: 'o2', mode: 'o2', b: RU(PHONE ? 0.88 : 0.9, 0.14 + i * 0.13), d: i * 0.02 });
    } else {
      A.push({ k: 'glu', a: RU(PHONE ? 0.14 : 0.14, 0.5), mode: 'in', d: 0, j: 0 });
      for (let i = 0; i < 6; i++) A.push({ k: 'o2', a: RU(PHONE ? 0.07 : 0.06, 0.16 + i * 0.13), mode: 'in', d: 0.03 + i * 0.02, j: i });
      for (let i = 0; i < 6; i++) { A.push({ k: 'co2', mode: 'out', b: RU((PHONE ? 0.66 : 0.66) + (i % COLS) * (PHONE ? 0.13 : 0.085), (PHONE ? 0.18 : 0.2) + Math.floor(i / COLS) * (PHONE ? 0.11 : 0.15)), d: i * 0.02 }); A.push({ k: 'h2o', mode: 'out', b: RU(0.66 + (i % COLS) * (PHONE ? 0.13 : 0.085), (PHONE ? 0.52 : 0.58) + Math.floor(i / COLS) * (PHONE ? 0.11 : 0.15)), d: i * 0.02 + 0.01 }); }
    }
    return A;
  }
  const AG = { leaf: null, muscle: null };
  const eo = SciSim.ease;
  function drawAgents(kind, p) {
    if (!AG[kind]) AG[kind] = agentsFor(kind);
    const c = ctr();
    AG[kind].forEach((g) => {
      let x, y, s = MSC, a = 1;
      if (g.mode === 'in') {
        const t = eo.inOutCubic(clamp((p - 0.04 - g.d) / 0.44, 0, 1)); x = lerp(g.a.x, c.x + (g.j % 3 - 1) * 12, t); y = lerp(g.a.y, c.y + (Math.floor(g.j / 3) % 2 - 0.5) * 22, t);
        a = p < 0.5 ? 1 : clamp(1 - (p - 0.5) / 0.1, 0, 1); s *= 1 - 0.3 * clamp((p - 0.45) / 0.15, 0, 1);
      } else if (g.mode === 'prod') {
        const t = clamp((p - 0.55) / 0.25, 0, 1); s = MSC * eo.outBack(t); const m = eo.inOutCubic(clamp((p - 0.7) / 0.25, 0, 1)); const G = RU(0.72, 0.5); x = lerp(c.x, G.x, m); y = lerp(c.y, G.y, m); a = t > 0 ? 1 : 0;
      } else if (g.mode === 'o2') {
        const t0 = 0.6 + g.d, t = eo.outCubic(clamp((p - t0) / 0.35, 0, 1)); x = lerp(c.x, g.b.x, t); y = lerp(c.y, g.b.y, t); a = p < t0 ? 0 : 1; s = MSC * (0.4 + 0.6 * t);
      } else {
        const t0 = 0.58 + g.d, t = eo.outCubic(clamp((p - t0) / 0.38, 0, 1)); x = lerp(c.x, g.b.x, t); y = lerp(c.y, g.b.y, t); a = p < t0 ? 0 : 1; s = MSC * (0.4 + 0.6 * t);
      }
      mol(g.k, x, y, s, g.k === 'co2' ? 0 : (g.k === 'h2o' ? 0 : 0.2), a);
    });
  }
  function stepReact(dt) {
    const R = S.rx;
    if (R.run) {
      R.p = Math.min(1, R.p + dt / 4.6);
      if (!R.burst && R.p >= 0.52) { R.burst = true; Sound.success(); const c = ctr(); parts.burst(c.x, c.y, { count: 22, speed: 190, size: 3.4, colors: R.kind === 'leaf' ? ['#fde047', '#fbbf24', '#fff'] : ['#22c55e', '#ef4444', '#fb923c', '#fde047'], gravity: R.kind === 'leaf' ? 0 : 80, life: 0.9 }); }
      if (R.p >= 1) { R.run = false; R.ran[R.kind] = true; Sound.click(); rlast = ''; syncControls(); }
    }
    if (S.sub.react === 'sort') S.sorter.update(dt);
  }
  function drawReactStage() {
    const R = S.rx, k = R.kind, p = R.p;
    panel(RX.x, RX.y, RX.w, RX.h, 16);
    ctx.save(); D.roundRect(RX.x, RX.y, RX.w, RX.h, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, RX.y, 0, RX.y + RX.h); if (k === 'leaf') { g.addColorStop(0, '#e9f9df'); g.addColorStop(1, '#cfeec0'); } else { g.addColorStop(0, '#fdeaea'); g.addColorStop(1, '#f9cdcd'); }
    ctx.fillStyle = g; ctx.fillRect(RX.x, RX.y, RX.w, RX.h);
    // 세포 틀
    ctx.fillStyle = k === 'leaf' ? 'rgba(76,175,80,.14)' : 'rgba(220,38,38,.10)'; ctx.strokeStyle = k === 'leaf' ? 'rgba(46,125,50,.45)' : 'rgba(185,28,28,.4)'; ctx.lineWidth = 3; D.roundRect(RX.x + 14, RX.y + 44, RX.w - 28, RX.h - 62, 28); ctx.fill(); ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
    if (k === 'leaf') {
      const lit = (RM ? 0.6 : 0.5 + 0.5 * Math.sin(clock * 3)) * (R.run || p > 0 ? 1 : 0.5);
      D.glow(RX.x + 50, RX.y + 40, 70, '#fde68a', 0.6); D.sphere(RX.x + 40, RX.y + 36, 17, '#fbbf24', { gloss: false });
      for (let i = 0; i < 3; i++) { const sx = RX.x + 70 + i * 14, sy = RX.y + 56 + i * 10; D.arrow(sx, sy, sx + 70 + i * 25, sy + 70 + i * 30, { color: C.rgba('#f59e0b', 0.45 + 0.4 * lit), width: 4, head: 11 }); }
      D.label(RX.x + 100, RX.y + 24, '빛에너지 흡수', { bg: '#d97706', size: 12.5, align: 'left' });
    } else D.label(RX.x + 14 + 56, RX.y + 24, '💪 근육 세포 (산소가 필요해요)', { bg: '#b91c1c', size: 12.5, align: 'left' });
    drawAgents(k, p);
    // 섬광
    if (p > 0.48 && p < 0.66) { const f = 1 - Math.abs(p - 0.57) / 0.09; const c = ctr(); D.glow(c.x, c.y, 80 * f + 20, k === 'leaf' ? '#fde047' : '#fb923c', clamp(f, 0, 1) * 0.8); }
    // 이름표
    if (p > 0.97) {
      if (k === 'leaf') { const G = RU(0.72, 0.5); D.label(G.x, G.y + 56 * MSC + 18, '포도당 (큰 분자)', { bg: '#b45309', size: 12.5 }); const o = RU(PHONE ? 0.88 : 0.9, 0.9); D.label(o.x - 10, o.y, '산소', { bg: '#dc2626', size: 12.5 }); D.arrow(RX.x + RX.w * 0.45, RX.y + RX.h * 0.9, RX.x + RX.w * 0.62, RX.y + RX.h * 0.9, { color: '#16a34a', width: 5, label: '분자가 커져요 → 동화', labelSize: 12.5, labelOffset: -18 }); }
      else { const a = RU(0.76, 0.1); D.label(a.x, a.y, '이산화 탄소와 물 (작은 분자)', { bg: '#475569', size: 12.5 }); D.arrow(RX.x + RX.w * 0.15, RX.y + RX.h * 0.92, RX.x + RX.w * 0.4, RX.y + RX.h * 0.92, { color: '#dc2626', width: 5, label: '분자가 작아져요 → 이화', labelSize: 12.5, labelOffset: -18 }); }
    } else if (p === 0) {
      const a = RU(0.5, 0.9); T(a.x, a.y, '▶ 반응 실행을 눌러요', 14, '#46544d', 'center', 800);
    }
    if (k === 'muscle' && p > 0.52) { const tt = clamp((p - 0.52) / 0.2, 0, 1); const c = ctr(); ctx.globalAlpha = tt; D.label(c.x - 40, c.y - 80, '⚡ ATP', { bg: '#16a34a', size: 13 }); D.label(c.x + 40, c.y - 80, '🔥 열', { bg: '#dc2626', size: 13 }); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function drawEnergyLadder() {
    const R = S.rx, k = R.kind, p = R.p;
    const bx = PHONE ? 8 : 16, by = PHONE ? 348 : 392, bw = PHONE ? 464 : 768, bh = PHONE ? 280 : 156;
    panel(bx, by, bw, bh, 14);
    const eq = k === 'leaf' ? '6CO₂ + 6H₂O + 빛에너지 → C₆H₁₂O₆ + 6O₂' : 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 에너지(ATP·열)';
    TF(bx + bw / 2, by + 28, '식: ' + eq, bw - 24, PHONE ? 14 : 16, 11.5, '#26324a', 'center', 800);
    const hi = by + (PHONE ? 130 : 66), lo = by + (PHONE ? 220 : 104), lx = bx + (PHONE ? 30 : 130), rx = bx + (PHONE ? 270 : 470), pw = PHONE ? 160 : 170;
    const yL = k === 'leaf' ? lo : hi, yR = k === 'leaf' ? hi : lo;
    const prog = smooth((p - 0.5) / 0.45);
    [[lx, yL, k === 'leaf' ? '반응물 (작은 분자)' : '반응물 (큰 분자)', '#64748b'], [rx, yR, k === 'leaf' ? '생성물 (큰 분자)' : '생성물 (작은 분자)', '#16a34a']].forEach((q, i) => {
      ctx.strokeStyle = q[3]; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + pw, q[1]); ctx.stroke();
      T(q[0] + pw / 2, q[1] + (PHONE ? 24 : 20), q[2], PHONE ? 12.5 : 13.5, q[3], 'center', 800);
    });
    T(bx + (PHONE ? 14 : 24), hi - 8, '에너지 높음', 12, '#7b8a80', 'left', 800); T(bx + (PHONE ? 14 : 24), lo - 8, '에너지 낮음', 12, '#7b8a80', 'left', 800);
    const y0 = lerp(yL, yR, prog), x0 = lerp(lx + pw, rx, prog);
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + pw, yL); ctx.lineTo(rx, yR); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(x0, y0 - 11, 9, k === 'leaf' ? '#f59e0b' : '#22c55e', { gloss: true });
    if (p > 0.95) {
      const mx = (lx + pw + rx) / 2, my = (yL + yR) / 2;
      D.label(mx, my, k === 'leaf' ? '⬆ 에너지 흡수 (동화)' : '⬇ 에너지 방출 (이화)', { bg: k === 'leaf' ? '#d97706' : '#dc2626', size: PHONE ? 12.5 : 14 });
    }
    T(bx + bw / 2, by + bh - 9, k === 'leaf' ? '작은 분자를 큰 분자로 합성할 때는 에너지가 필요해요 (빛에너지 → 화학 에너지)' : '큰 분자를 작은 분자로 분해할 때는 에너지가 나와요 (화학 에너지 → ATP·열)', PHONE ? 11.5 : 13, '#46544d', 'center', 800);
  }
  /* 분류 카드 */
  const ANA_CARDS = [
    { id: 'photo', label: '광합성', short: '광합성', icon: '🌿', ans: 'ana' },
    { id: 'resp', label: '세포호흡', short: '세포호흡', icon: '🫁', ans: 'cat' },
    { id: 'digest', label: '소화', short: '소화', icon: '🍚', ans: 'cat' },
    { id: 'prot', label: '아미노산 → 단백질', short: '단백질 합성', icon: '🥩', ans: 'ana' },
    { id: 'glyco', label: '포도당 → 글리코젠', short: '글리코젠 합성', icon: '🍬', ans: 'ana' },
    { id: 'fat', label: '지방 분해', short: '지방 분해', icon: '🧈', ans: 'cat' },
    { id: 'starch', label: '녹말 합성', short: '녹말 합성', icon: '🌾', ans: 'ana' },
    { id: 'dna', label: 'DNA 복제', short: 'DNA 복제', icon: '🧬', ans: 'ana' },
  ];
  function makeSorter() {
    const boxes = PHONE ? [{ id: 'ana', label: '🧱 동화 (합성)', col: '#16a34a', x: 8, y: 8, w: 228, h: 158, cols: 1, hdr: 28 }, { id: 'cat', label: '✂️ 이화 (분해)', col: '#dc2626', x: 244, y: 8, w: 228, h: 158, cols: 1, hdr: 28 }]
      : [{ id: 'ana', label: '🧱 동화 작용 (작은 분자 → 큰 분자)', col: '#16a34a', x: 16, y: 52, w: 380, h: 214, cols: 2, hdr: 30 }, { id: 'cat', label: '✂️ 이화 작용 (큰 분자 → 작은 분자)', col: '#dc2626', x: 404, y: 52, w: 380, h: 214, cols: 2, hdr: 30 }];
    S.sorter = new Sorter({
      cards: ANA_CARDS.map((c) => ({ id: c.id, label: c.label, short: c.short, icon: c.icon, col: '#16a34a' })), boxes,
      tray: (i) => (PHONE ? { x: 10 + (i % 2) * 236, y: 196 + Math.floor(i / 2) * 46 } : { x: 13 + (i % 4) * 196, y: 304 + Math.floor(i / 4) * 62 }),
      cw: PHONE ? 226 : 186, ch: PHONE ? 40 : 54, kh: PHONE ? 26 : 32, onChange: () => { rlast = ''; },
    });
  }
  function drawSortReact() {
    S.sorter.drawBoxes(); T(PHONE ? 12 : 16, PHONE ? 186 : 292, '👇 카드를 끌어서 동화 / 이화 상자에 넣어요', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800); S.sorter.drawCards();
    const y = PHONE ? 400 : 452, w = PHONE ? 464 : 752, x = PHONE ? 8 : 24;
    panel(x, y, w, PHONE ? 224 : 96, 14);
    const row = (yy, small, big, lab, col) => {
      mol('co2', x + 40, yy, 0.7, 0, 1); mol('h2o', x + 76, yy, 0.7, 0, 1);
      T(x + 120, yy + 5, '→', 20, '#46544d', 'center', 800);
    };
    if (PHONE) { textBlock(x + 14, y + 30, w - 28, '🧱 동화: 작은 분자 → 큰 분자 (에너지 흡수)', 14, '#166534', 20, 800); textBlock(x + 14, y + 60, w - 28, '예: 광합성, 단백질·글리코젠·녹말·DNA 합성', 13, '#3a465c', 19, 700); textBlock(x + 14, y + 110, w - 28, '✂️ 이화: 큰 분자 → 작은 분자 (에너지 방출)', 14, '#b91c1c', 20, 800); textBlock(x + 14, y + 140, w - 28, '예: 세포호흡, 소화, 지방 분해', 13, '#3a465c', 19, 700); }
    else { T(x + 16, y + 30, '🧱 동화: 작은 분자 → 큰 분자 (에너지 흡수)  예: 광합성, 단백질·글리코젠·녹말·DNA 합성', 14, '#166534', 'left', 800); T(x + 16, y + 64, '✂️ 이화: 큰 분자 → 작은 분자 (에너지 방출)  예: 세포호흡, 소화, 지방 분해', 14, '#b91c1c', 'left', 800); }
  }
  function drawReact(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    if (S.sub.react === 'reac') { drawReactStage(); drawEnergyLadder(); } else drawSortReact();
    parts.update(dt); parts.draw(ctx);
  }
  PT_REACT = {
    down(p) { return S.sub.react === 'sort' ? S.sorter.down(p) : false; },
    move(p) { if (S.sub.react === 'sort') S.sorter.move(p); },
    up(p) { if (S.sub.react === 'sort') S.sorter.up(p); },
    hover(p) { return S.sub.react === 'sort' ? S.sorter.hover(p) : 'default'; },
  };

  /* ================= ② 에너지 전환 ================= */
  const rnum = (i) => Math.round((1 + 0.09 * i) * 10) / 10;
  const atpOf = (i) => Math.round(40 * rnum(i)), heatOf = (i) => Math.round(60 * rnum(i));
  const tempOf = (i) => Math.round((36.5 + 0.02 * i) * 10) / 10;
  function makeEnergy() { S.en = { i: 20, Rs: rnum(20), T: tempOf(20), seenHigh: false, acc: 0 }; }
  function stepEnergy(dt) {
    const E = S.en; E.Rs = SciSim.approach(E.Rs, rnum(E.i), dt, 4); E.T = SciSim.approach(E.T, tempOf(E.i), dt, 0.9);
    if (E.i >= 70) E.seenHigh = true;
    const cx = PHONE ? 240 : 290, cy = PHONE ? 150 : 200;
    E.acc += dt * (4 + E.Rs * 3);
    while (E.acc >= 1 && !RM) {
      E.acc -= 1;
      const q = Math.random();
      if (q < 0.4) parts.emit({ x: cx + rnd(-60, 60), y: cy - (PHONE ? 70 : 90), vx: rnd(-10, 10), vy: rnd(-70, -40), life: 1.1, size: 3.5, color: '#f87171', shape: 'circle', gravity: 0 });
      else if (q < 0.7) parts.emit({ x: cx + (PHONE ? 100 : 150), y: cy + rnd(-10, 10), vx: rnd(50, 80), vy: rnd(-6, 6), life: 0.9, size: 3.4, color: '#22c55e', shape: 'star', gravity: 0 });
      else parts.emit({ x: PHONE ? 30 : 50, y: cy + rnd(-30, 30), vx: rnd(60, 90), vy: rnd(-5, 5), life: 0.9, size: 3.2, color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444', shape: 'circle', gravity: 0 });
    }
  }
  function drawEnergy(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    const E = S.en, R = E.Rs, i = E.i, Rr = rnum(i), w = 3 + R * 0.9;
    const lp = PHONE ? { x: 8, y: 8, w: 464, h: 250 } : { x: 16, y: 52, w: 520, h: 324 };
    panel(lp.x, lp.y, lp.w, lp.h, 16);
    const cx = PHONE ? 240 : 290, cy = PHONE ? 150 : 200, cw = PHONE ? 210 : 270, ch = PHONE ? 100 : 130;
    D.glow(cx, cy, cw * 0.9, '#fecaca', 0.15 + 0.35 * (i / 100));
    D.shadow(() => { D.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 40); ctx.fillStyle = '#fde4e4'; ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = '#e57373'; ctx.lineWidth = 4; D.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 40); ctx.stroke();
    [[-0.28, -0.1], [0.12, 0.12], [0.3, -0.12]].forEach((m, k) => { ctx.save(); ctx.translate(cx + m[0] * cw, cy + m[1] * ch); ctx.rotate(k * 0.5 - 0.3); const sc = 1 + 0.04 * Math.sin(clock * (4 + R) + k); ctx.scale(sc, sc); ctx.beginPath(); ctx.ellipse(0, 0, 30, 15, 0, 0, TAU); ctx.fillStyle = '#f4a56a'; ctx.fill(); ctx.strokeStyle = '#c9732f'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-10, -9, 0, 0); ctx.quadraticCurveTo(10, 9, 20, 0); ctx.stroke(); ctx.restore(); });
    T(cx, cy + ch / 2 - 10, '세포호흡 (미토콘드리아)', PHONE ? 12.5 : 13.5, '#7f1d1d', 'center', 800);
    // 화살표
    D.arrow(lp.x + (PHONE ? 20 : 30), cy - 24, cx - cw / 2 + 8, cy - 24, { color: '#f59e0b', width: w, head: 10 + w });
    D.arrow(lp.x + (PHONE ? 20 : 30), cy + 26, cx - cw / 2 + 8, cy + 26, { color: '#ef4444', width: w, head: 10 + w });
    D.label(lp.x + (PHONE ? 50 : 70), cy - 50, '포도당', { bg: '#d97706', size: 12.5 }); D.label(lp.x + (PHONE ? 50 : 70), cy + 52, '산소', { bg: '#dc2626', size: 12.5 });
    D.arrow(cx + cw / 2 - 6, cy, cx + cw / 2 + (PHONE ? 52 : 80), cy, { color: '#16a34a', width: 3 + R * 0.36, head: 10 + R * 0.4 });
    D.label(cx + cw / 2 + (PHONE ? 38 : 56), cy - 22, 'ATP', { bg: '#16a34a', size: 13 });
    for (let k = -1; k <= 1; k++) D.arrow(cx + k * 70 * (PHONE ? 0.7 : 1), cy - ch / 2 + 6, cx + k * 70 * (PHONE ? 0.7 : 1), cy - ch / 2 - (PHONE ? 30 : 44), { color: C.rgba('#dc2626', 0.85), width: 2 + R * 0.55, head: 8 + R * 0.5 });
    D.label(cx, cy - ch / 2 - (PHONE ? 46 : 60), '열 (체온 유지)', { bg: '#dc2626', size: 12.5 });
    D.arrow(cx, cy + ch / 2 - 2, cx, cy + ch / 2 + 30, { color: '#64748b', width: 3 + R * 0.3, head: 9 }); D.label(cx + (PHONE ? 62 : 76), cy + ch / 2 + 26, 'CO₂ · H₂O', { bg: '#475569', size: 12 });
    // 읽음 상자
    const rp = PHONE ? { x: 8, y: 266, w: 464, h: 130 } : { x: 548, y: 52, w: 236, h: 324 };
    panel(rp.x, rp.y, rp.w, rp.h, 16);
    if (!PHONE) {
      D.thermometer(rp.x + 40, rp.y + 54, 190, E.T, 36, 39, { color: '#e2464b', step: 1, unit: '°C' });
      T(rp.x + 100, rp.y + 70, '체온', 13, '#46544d', 'left', 800); T(rp.x + 100, rp.y + 98, E.T.toFixed(1) + ' °C', 24, '#b91c1c', 'left', 800);
      T(rp.x + 100, rp.y + 130, '운동 강도 ' + i + ' %', 13.5, '#26324a', 'left', 800);
      T(rp.x + 14, rp.y + 300, '세포호흡 속도 R = ' + Rr.toFixed(1), 14, '#26324a', 'left', 800);
    } else {
      T(rp.x + 14, rp.y + 30, '체온 ' + E.T.toFixed(1) + ' °C', 17, '#b91c1c', 'left', 800); T(rp.x + 14, rp.y + 58, '운동 강도 ' + i + ' % · 세포호흡 속도 R = ' + Rr.toFixed(1), 13.5, '#26324a', 'left', 800);
      D.roundRect(rp.x + 14, rp.y + 70, rp.w - 28, 14, 7); ctx.fillStyle = '#e5ece8'; ctx.fill(); D.roundRect(rp.x + 14, rp.y + 70, Math.max(14, (rp.w - 28) * clamp((E.T - 36) / 3, 0, 1)), 14, 7); ctx.fillStyle = '#e2464b'; ctx.fill();
    }
    // 에너지 분배
    const bp = PHONE ? { x: 8, y: 404, w: 464, h: 228 } : { x: 16, y: 388, w: 768, h: 160 };
    panel(bp.x, bp.y, bp.w, bp.h, 14);
    T(bp.x + 14, bp.y + 28, '포도당 1단위가 분해될 때 에너지 100의 이동', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    const bw = bp.w - 28, ax = bp.x + 14, ay = bp.y + (PHONE ? 44 : 40), bh2 = PHONE ? 40 : 36, f = 1;
    D.roundRect(ax, ay, bw * 0.4, bh2, 10); ctx.fillStyle = '#22c55e'; ctx.fill(); D.roundRect(ax + bw * 0.4 + 4, ay, bw * 0.6 - 4, bh2, 10); ctx.fillStyle = '#ef4444'; ctx.fill();
    T(ax + bw * 0.2, ay + (PHONE ? 26 : 24), 'ATP에 저장 40', PHONE ? 13.5 : 15, '#fff', 'center', 800); T(ax + bw * 0.7, ay + (PHONE ? 26 : 24), '열로 방출 60', PHONE ? 13.5 : 15, '#fff', 'center', 800);
    if (PHONE) textBlock(bp.x + 14, ay + 68, bw, '포도당의 화학 에너지 100 = ATP 40 + 열 60 (에너지는 사라지지 않고 형태만 바뀌어요)', 12.5, '#46544d', 18, 800); else T(bp.x + 14, ay + 60, '포도당의 화학 에너지 100 = ATP 40 + 열 60 (에너지는 사라지지 않고 형태만 바뀌어요)', 13.5, '#46544d', 'left', 800);
    const t1 = '지금 1초에: ATP 생성 ' + atpOf(i) + ' · 열 방출 ' + heatOf(i) + ' (상대 단위, 세포호흡 속도 R = ' + Rr.toFixed(1) + ')';
    if (PHONE) textBlock(bp.x + 14, ay + 106, bw, t1, 13.5, '#166534', 19, 800); else T(bp.x + 14, ay + 82, t1, 14.5, '#166534', 'left', 800);
    textBlock(bp.x + 14, ay + (PHONE ? 148 : 104), bw, '운동 강도를 높이면 R이 커져서 ATP 생성과 열 방출이 함께 늘어요. 열은 체온을 올려요.', PHONE ? 12.5 : 13, '#46544d', 18, 700);
    parts.update(dt); parts.draw(ctx);
  }
  PT_ENERGY = {};


  /* ================= ③ ATP 충전소 ================= */
  const CELLS = {
    animal: { name: '동물 세포', site: '미토콘드리아', work: '근수축', col: '#f9a8a8' },
    plant: { name: '식물 세포', site: '미토콘드리아', work: '물질 합성', col: '#9bd8a0' },
    bact: { name: '세균', site: '세포막·세포질', work: '편모 운동', col: '#fcd9a0' },
  };
  const AP = PHONE
    ? { panel: { x: 8, y: 8, w: 464, h: 436 }, mito: { x: 240, y: 84 }, work: { x: 240, y: 372 }, pw: (i) => ({ x: 34 + (i % 2) * 40, y: 86 + Math.floor(i / 2) * 36 }), ps: (i) => ({ x: 118 + i * 48.8, y: 226 }), info: { x: 8, y: 452, w: 464, h: 176 } }
    : { panel: { x: 16, y: 52, w: 768, h: 332 }, mito: { x: 150, y: 190 }, work: { x: 640, y: 190 }, pw: (i) => ({ x: 70 + (i % 3) * 56, y: 316 + Math.floor(i / 3) * 34 }), ps: (i) => ({ x: 326 + (i % 3) * 62, y: 164 + Math.floor(i / 3) * 56 }), info: { x: 16, y: 392, w: 768, h: 156 } };
  function makeAtp(type) {
    const prev = S.at;
    const A = S.at = { type: type || (prev ? prev.type : 'animal'), resp: false, act: false, tok: [], cT: 0, aT: 0, charges: 0, cycles: 0, depleted: false, lowT: 0, types: {}, pulse: 0, beads: 0, wave: 0 };
    A.types[A.type] = true;
    for (let i = 0; i < 6; i++) { const on = i < 3; const p = on ? AP.ps(i) : AP.pw(i); A.tok.push({ id: i, st: on ? 'atp' : 'adp', x: p.x, y: p.y, f: on ? 1 : 0, t: 0 }); }
  }
  const atpCount = () => S.at.tok.filter((k) => k.st === 'atp').length;
  function stepAtp(dt) {
    const A = S.at;
    A.pulse = Math.max(0, A.pulse - dt * 2.4); A.wave += dt * (1.5 + A.pulse * 8);
    if (A.resp) A.cT += dt; if (A.act) A.aT += dt;
    if (A.resp && A.cT >= 0.8) { const k = A.tok.find((q) => q.st === 'adp'); if (k) { k.st = 'toMito'; A.cT = 0; } else A.cT = 0.8; }
    if (A.act && A.aT >= 0.9) { const k = A.tok.find((q) => q.st === 'atp'); if (k) { k.st = 'toWork'; A.aT = 0; } else A.aT = 0.9; }
    A.tok.forEach((k) => {
      let tg = null;
      if (k.st === 'adp') tg = AP.pw(k.id); else if (k.st === 'toMito') tg = AP.mito; else if (k.st === 'toStock' || k.st === 'atp') tg = AP.ps(k.id); else if (k.st === 'toWork') tg = AP.work; else if (k.st === 'toPool') tg = AP.pw(k.id);
      if (tg) { const r = RM ? 99 : 8; k.x = SciSim.approach(k.x, tg.x, dt, r); k.y = SciSim.approach(k.y, tg.y, dt, r); }
      const near = tg ? Math.hypot(k.x - tg.x, k.y - tg.y) < 3 : false;
      if (k.st === 'toMito' && near) { k.st = 'charging'; k.t = 0; }
      else if (k.st === 'charging') {
        k.t += dt; k.f = clamp(k.t / 0.6, 0, 1);
        if (!RM && Math.random() < dt * 30) parts.emit({ x: AP.mito.x + rnd(-40, 40), y: AP.mito.y + rnd(-26, 26), vx: (k.x - AP.mito.x) * 0.0 + rnd(-10, 10), vy: rnd(-30, -10), life: 0.5, size: 3, color: '#fde047', shape: 'star', gravity: 0 });
        if (k.t >= 0.6) { k.st = 'toStock'; k.f = 1; A.charges++; Sound.tick(); rlast = ''; }
      } else if (k.st === 'toStock' && near) { k.st = 'atp'; }
      else if (k.st === 'toWork' && near) { k.st = 'discharging'; k.t = 0; }
      else if (k.st === 'discharging') {
        k.t += dt; k.f = clamp(1 - k.t / 0.5, 0, 1);
        if (!RM && Math.random() < dt * 40) parts.emit({ x: AP.work.x + rnd(-14, 14), y: AP.work.y + rnd(-14, 14), vx: rnd(-40, 40), vy: rnd(-60, -20), life: 0.5, size: 3.2, color: Math.random() < 0.5 ? '#fde047' : '#fb923c', shape: 'circle', gravity: 0 });
        if (k.t >= 0.5) { k.st = 'toPool'; k.f = 0; A.cycles++; A.pulse = 1; A.beads = (A.beads + 1) % 9; Sound.click(); rlast = ''; }
      } else if (k.st === 'toPool' && near) { k.st = 'adp'; }
    });
    const n = atpCount(), busy = A.tok.some((k) => ['charging', 'toStock', 'toMito', 'toWork', 'discharging'].indexOf(k.st) >= 0);
    if (A.depleted && (A.resp || n > 0)) A.depleted = false;
    if (A.act && !A.resp && n === 0 && !busy) { A.lowT += dt; if (A.lowT > 0.8 && !A.depleted) { A.depleted = true; Sound.fail(); rlast = ''; syncControls(); } } else A.lowT = 0;
  }
  function drawBattery(x, y, f, lab, sc, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= a == null ? 1 : a;
    const w = 40, h = 22;
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 6); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(w / 2, -4, 4, 8);
    ctx.strokeStyle = f > 0.5 ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2.2; D.roundRect(-w / 2, -h / 2, w, h, 6); ctx.stroke();
    if (f > 0.02) { const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#86efac'); g.addColorStop(1, '#16a34a'); ctx.fillStyle = g; D.roundRect(-w / 2 + 3, -h / 2 + 3, (w - 6) * f, h - 6, 4); ctx.fill(); }
    T(0, 4.5, lab, 10.5, f > 0.55 ? '#fff' : '#475569', 'center', 800);
    ctx.restore();
  }
  function drawAtp(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    const A = S.at, P = AP.panel, ct = CELLS[A.type];
    panel(P.x, P.y, P.w, P.h, 16);
    // 세포 윤곽
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 16); ctx.clip();
    ctx.fillStyle = C.rgba(ct.col, 0.28); ctx.fillRect(P.x, P.y, P.w, P.h);
    const gx = P.x + 10, gy = P.y + 34, gw = P.w - 20, gh = P.h - 44;
    if (A.type === 'plant') { ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 8; D.roundRect(gx, gy, gw, gh, 10); ctx.stroke(); ctx.strokeStyle = '#a5d6a7'; ctx.lineWidth = 3; D.roundRect(gx + 8, gy + 8, gw - 16, gh - 16, 10); ctx.stroke(); }
    else if (A.type === 'bact') { ctx.strokeStyle = '#d97706'; ctx.lineWidth = 7; D.roundRect(gx, gy, gw, gh, gh / 2.4); ctx.stroke(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; D.roundRect(gx + 8, gy + 8, gw - 16, gh - 16, gh / 2.6); ctx.stroke(); }
    else { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 6; D.roundRect(gx, gy, gw, gh, gh / 2.2); ctx.stroke(); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; D.roundRect(gx, gy, gw, gh, gh / 2.2); ctx.stroke(); }
    ctx.restore();
    D.label(P.x + 12, P.y + 20, ct.name + ' · 같은 ATP를 써요', { bg: '#334155', size: PHONE ? 12.5 : 13.5, align: 'left' });
    // 세포호흡 장소
    const M = AP.mito, on = A.resp;
    if (A.type === 'bact') {
      const w = PHONE ? 200 : 210; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i <= 30; i++) { const x = M.x - w / 2 + w * i / 30, y = M.y + Math.sin(i * 0.9 + clock * (on ? 3 : 0.5)) * 5; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      for (let i = 0; i < 8; i++) D.sphere(M.x - w / 2 + 14 + i * (w - 28) / 7, M.y + (i % 2 ? -12 : 12), 5, '#f97316', { gloss: false });
      T(M.x, M.y + (PHONE ? 46 : 52), '세포막·세포질 (세포호흡)', PHONE ? 12.5 : 13.5, '#92400e', 'center', 800);
    } else {
      const sc = on && !RM ? 1 + 0.03 * Math.sin(clock * 6) : 1; ctx.save(); ctx.translate(M.x, M.y); ctx.scale(sc, sc);
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(0, 0, PHONE ? 96 : 100, PHONE ? 46 : 58, 0, 0, TAU); ctx.fillStyle = on ? '#fdba74' : '#fed7aa'; ctx.fill(); }, { blur: 10, y: 4 });
      ctx.strokeStyle = '#c9732f'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, 0, PHONE ? 96 : 100, PHONE ? 46 : 58, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.quadraticCurveTo(-52, -26, -34, 0); ctx.quadraticCurveTo(-16, 26, 2, 0); ctx.quadraticCurveTo(20, -26, 38, 0); ctx.quadraticCurveTo(56, 26, 72, 0); ctx.stroke(); ctx.restore();
      T(M.x, M.y + (PHONE ? 66 : 82), '미토콘드리아 (세포호흡)', PHONE ? 12.5 : 13.5, '#92400e', 'center', 800);
    }
    if (on && !RM && Math.random() < dt * 14) { const q = Math.random() < 0.5; parts.emit({ x: M.x + (PHONE ? -150 : -120), y: M.y + rnd(-20, 20), vx: 70, vy: rnd(-5, 5), life: 0.9, size: 3.6, color: q ? '#f59e0b' : '#ef4444', shape: 'circle', gravity: 0 }); }
    D.label(PHONE ? P.x + P.w - 12 : P.x + 16, PHONE ? P.y + 20 : M.y - 74, on ? '포도당 + 산소 ▶' : '세포호흡 멈춤', { bg: on ? '#d97706' : '#64748b', size: 12, align: PHONE ? 'right' : 'left' });
    // 활동 부위
    const W = AP.work; ctx.save(); ctx.translate(W.x, W.y);
    const pl = A.pulse;
    if (A.type === 'animal') {
      const sx = 1 - 0.18 * pl, sy = 1 + 0.2 * pl;
      D.shadow(() => { D.roundRect(-90 * sx, -34 * sy, 180 * sx, 68 * sy, 30); const g = ctx.createLinearGradient(0, -34, 0, 34); g.addColorStop(0, '#fbc3cc'); g.addColorStop(1, '#e8808f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = 'rgba(160,50,70,.5)'; ctx.lineWidth = 1.5; for (let k = -80; k < 85; k += 9) { ctx.beginPath(); ctx.moveTo(k * sx, -28 * sy); ctx.lineTo(k * sx, 28 * sy); ctx.stroke(); }
      T(0, 62, '근육 세포: 근수축', PHONE ? 12.5 : 13.5, '#7a2236', 'center', 800);
    } else if (A.type === 'plant') {
      for (let i = 0; i < 8; i++) D.sphere(-84 + i * 24, 0, i < A.beads ? 11 : 4, i < A.beads ? '#f59e0b' : '#e5e7eb', { gloss: i < A.beads });
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-84, 0); ctx.lineTo(108, 0); ctx.stroke();
      for (let i = 0; i < 8; i++) if (i < A.beads) D.sphere(-84 + i * 24, 0, 11, '#f59e0b', { gloss: true });
      T(0, 52, '물질 합성 (예: 녹말 사슬)', PHONE ? 12.5 : 13.5, '#92400e', 'center', 800);
    } else {
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const x = -100 + i * 8, y = Math.sin(i * 0.7 - A.wave * 3) * (4 + 14 * pl + (A.act ? 3 : 0)) * (i / 24); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      D.sphere(100, 0, 16, '#fbbf24', { gloss: true }); T(0, 52, '편모 운동 (움직임)', PHONE ? 12.5 : 13.5, '#92400e', 'center', 800);
    }
    ctx.restore();
    D.label(W.x + (PHONE ? 0 : 0), W.y - (PHONE ? 60 : 78), A.act ? '활동 중 (ATP 사용)' : '활동 멈춤', { bg: A.act ? '#7c3aed' : '#64748b', size: 12 });
    // 저장고
    const k0 = AP.ps(0), kx = PHONE ? 240 : 388;
    D.roundRect(PHONE ? 100 : 308, PHONE ? 196 : 138, PHONE ? 280 : 200, PHONE ? 60 : 136, 14); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
    T(kx, PHONE ? 190 : 130, '🔋 ATP 저장고 (' + atpCount() + ' / 6)', PHONE ? 13.5 : 14.5, '#166534', 'center', 800);
    // 충전 대기
    const p0 = AP.pw(0);
    T(PHONE ? 54 : 120, PHONE ? 62 : 296, 'ADP + Ⓟ', 12.5, '#475569', 'center', 800);
    // 흐름 화살표
    const arr = (a, b, col, lab) => { D.arrow(a.x, a.y, b.x, b.y, { color: col, width: 4, head: 11, dash: [7, 6], alpha: 0.8 }); };
    if (!PHONE) { arr({ x: 250, y: 190 }, { x: 304, y: 190 }, '#16a34a'); arr({ x: 506, y: 190 }, { x: 556, y: 190 }, '#7c3aed'); T(278, 176, '충전', 12.5, '#166534', 'center', 800); T(532, 176, '방전', 12.5, '#6d28d9', 'center', 800); }
    else { arr({ x: 240, y: 142 }, { x: 240, y: 190 }, '#16a34a'); arr({ x: 240, y: 262 }, { x: 240, y: 310 }, '#7c3aed'); T(274, 170, '충전', 12.5, '#166534', 'left', 800); T(274, 290, '방전', 12.5, '#6d28d9', 'left', 800); }
    // 배터리 토큰
    A.tok.forEach((k) => drawBattery(k.x, k.y, k.f, k.f > 0.55 ? 'ATP' : 'ADP', PHONE ? 0.85 : 1, 1));
    if (A.depleted) { D.label(PHONE ? 240 : 400, PHONE ? 284 : 358, '⚠️ ATP가 바닥나서 활동이 멈췄어요!', { bg: '#dc2626', size: PHONE ? 13 : 15 }); }
    // 아래 정보
    const I = AP.info; panel(I.x, I.y, I.w, I.h, 14);
    T(I.x + 14, I.y + 28, '충전: ADP + Ⓟ + 에너지(세포호흡) → ATP', PHONE ? 13.5 : 15, '#166534', 'left', 800);
    T(I.x + 14, I.y + 56, '방전: ATP → ADP + Ⓟ + 에너지(생명 활동에 사용)', PHONE ? 13.5 : 15, '#6d28d9', 'left', 800);
    textBlock(I.x + 14, I.y + 86, I.w - 28, A.type === 'bact' ? '세균은 미토콘드리아가 없어도 세포막과 세포질에서 세포호흡을 해서 같은 ATP를 만들어요.' : '식물 세포도 동물 세포와 같은 ATP를 써요. 저장량이 적어서 세포호흡으로 계속 다시 충전해요.', PHONE ? 12.5 : 13.5, '#46544d', 19, 700);
    T(I.x + 14, I.y + I.h - 14, '충전 ' + A.charges + '회 · 방전 한 바퀴 ' + A.cycles + '회', 13.5, '#26324a', 'left', 800);
    parts.update(dt); parts.draw(ctx);
  }
  PT_ATP = {};

  /* ================= ④ 활동과 에너지 ================= */
  const FORMS = [['mech', '🏃 역학', '#f97316'], ['light', '💡 빛', '#eab308'], ['elec', '⚡ 전기', '#2563eb'], ['chem', '🧪 화학', '#16a34a'], ['heat', '🔥 열', '#dc2626']];
  const FORM_CARDS = [
    { id: 'run', label: '달리기 근수축', short: '근수축', icon: '🏃', acc: ['mech'] },
    { id: 'fly', label: '반딧불이 발광', short: '반딧불이', icon: '✨', acc: ['light'] },
    { id: 'eel', label: '전기뱀장어 발전', short: '전기뱀장어', icon: '🐍', acc: ['elec'] },
    { id: 'nerve', label: '신경 신호 전도', short: '신경 신호', icon: '🧠', acc: ['elec'] },
    { id: 'prot', label: '단백질 합성', short: '단백질 합성', icon: '🥩', acc: ['chem'] },
    { id: 'div', label: '세포 분열', short: '세포 분열', icon: '🧫', acc: ['mech', 'chem'] },
    { id: 'temp', label: '체온 유지', short: '체온 유지', icon: '🌡️', acc: ['heat'] },
  ];
  function makeSorter2() {
    const boxes = FORMS.map((f, i) => PHONE
      ? { id: f[0], label: f[1], col: f[2], x: i < 3 ? 8 + i * 157 : 8 + (i - 3) * 236, y: i < 3 ? 8 : 148, w: i < 3 ? 150 : 228, h: 134, cols: 1, hdr: 26 }
      : { id: f[0], label: f[1], col: f[2], x: 16 + i * 155, y: 52, w: 147, h: 212, cols: 1, hdr: 28 });
    S.sorter2 = new Sorter({
      cards: FORM_CARDS.map((c) => ({ id: c.id, label: c.label, short: c.short, icon: c.icon, col: '#16a34a' })), boxes,
      tray: (i) => (PHONE ? { x: 10 + (i % 2) * 236, y: 316 + Math.floor(i / 2) * 46 } : { x: 13 + (i % 4) * 196, y: 304 + Math.floor(i / 4) * 62 }),
      cw: PHONE ? 226 : 186, ch: PHONE ? 40 : 54, kh: PHONE ? 26 : 28, onChange: () => { rlast = ''; },
    });
  }
  const CHAIN = [
    { id: 'c0', label: '운동 강도가 높아져요 (근수축 증가)' },
    { id: 'c1', label: '근육 세포가 ATP를 많이 써요' },
    { id: 'c2', label: '세포호흡이 활발해져 ATP를 다시 만들어요' },
    { id: 'c3', label: '산소 소비와 이산화 탄소 발생이 늘어요' },
    { id: 'c4', label: '호흡수와 심박수가 늘어 산소를 더 실어 날라요' },
  ];
  function makeChain() {
    S.ap = { bars: [0, 0, 0, 0], solved: false, t: 0 };
    S.ap.ord = new Reorder({
      items: CHAIN.map((c, i) => Object.assign({ col: '#16a34a', wrap: true }, c)),
      slots: PHONE ? CHAIN.map((c, i) => ({ x: 8, y: 54 + i * 58 })) : CHAIN.map((c, i) => ({ x: 14 + i * 156, y: 96 })),
      cw: PHONE ? 464 : 144, ch: PHONE ? 52 : 118, solution: CHAIN.map((c) => c.id),
      slotNames: ['① 처음', '②', '③', '④', '⑤'],
      onChange: () => { S.ap.ord.clearBad(); rlast = ''; },
    });
  }
  function stepApply(dt) {
    if (S.sub.apply === 'sort') S.sorter2.update(dt);
    else { const A = S.ap; A.ord.update(dt); if (A.solved) A.t += dt; A.bars = A.bars.map((b, i) => SciSim.approach(b, A.solved && A.t > i * 0.5 ? 0.3 + 0.17 * (i + 1) : 0.15, dt, 3)); }
  }
  function drawApply(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    if (S.sub.apply === 'sort') {
      S.sorter2.drawBoxes(); T(PHONE ? 12 : 16, PHONE ? 306 : 292, '👇 활동에 쓰이는 에너지 형태 상자에 카드를 넣어요', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800); S.sorter2.drawCards();
      const y = PHONE ? 520 : 440, x = PHONE ? 8 : 16, w = PHONE ? 464 : 768, h = PHONE ? 108 : 108;
      panel(x, y, w, h, 14);
      drawBattery(x + 44, y + h / 2 - 6, 1, 'ATP', 1.2, 1); T(x + 44, y + h / 2 + 30, 'ATP', 13, '#166534', 'center', 800);
      D.arrow(x + 80, y + h / 2 - 6, x + 130, y + h / 2 - 6, { color: '#16a34a', width: 5 });
      FORMS.forEach((f, i) => { const xx = x + 160 + i * ((w - 190) / 5 * 1); T(xx + 10, y + h / 2 + 2, f[1].split(' ')[0], 26, '#000', 'center', 600); T(xx + 10, y + h / 2 + 30, f[1].split(' ')[1], 12.5, '#46544d', 'center', 800); });
    } else {
      const A = S.ap;
      T(VW / 2, PHONE ? 30 : 46, '운동할 때 몸속에서 일어나는 일의 순서를 놓아요', PHONE ? 14.5 : 17, '#26324a', 'center', 800);
      A.ord.draw();
      const by = PHONE ? 360 : 260, bx = PHONE ? 20 : 40, bw = PHONE ? 440 : 720;
      if (!A.solved) T(VW / 2, PHONE ? 380 : 290, '카드를 끌어서 자리를 바꿔요', 13.5, '#7b8a80', 'center', 800);
      else {
        T(VW / 2, by + 6, '✅ 운동 → ATP 소비 ↑ → 세포호흡 ↑ → O₂ 소비·CO₂ 발생 ↑ → 호흡·심박 ↑', PHONE ? 12 : 15, '#166534', 'center', 800);
        const labs = ['ATP 소비', '세포호흡', 'O₂ 소비 · CO₂ 발생', '호흡수 · 심박수'], cols = ['#7c3aed', '#f59e0b', '#0d9488', '#ef4444'];
        labs.forEach((l, i) => { const yy = by + 34 + i * (PHONE ? 52 : 52); T(bx, yy + 14, l, 13.5, '#26324a', 'left', 800); D.roundRect(bx + (PHONE ? 140 : 180), yy, bw - (PHONE ? 140 : 180), 20, 10); ctx.fillStyle = '#e5ece8'; ctx.fill(); D.roundRect(bx + (PHONE ? 140 : 180), yy, Math.max(20, (bw - (PHONE ? 140 : 180)) * A.bars[i]), 20, 10); ctx.fillStyle = cols[i]; ctx.fill(); });
      }
    }
    parts.update(dt); parts.draw(ctx);
  }
  PT_APPLY = {
    down(p) { return S.sub.apply === 'sort' ? S.sorter2.down(p) : S.ap.ord.down(p); },
    move(p) { if (S.sub.apply === 'sort') S.sorter2.move(p); else S.ap.ord.move(p); },
    up(p) { if (S.sub.apply === 'sort') S.sorter2.up(p); else S.ap.ord.up(p); },
    hover(p) { return S.sub.apply === 'sort' ? S.sorter2.hover(p) : S.ap.ord.hover(p); },
  };


  /* ================= 제어판 · 읽음 칸 ================= */
  let rlast = '';
  function syncControls() {
    if (!S.rx || !S.en || !S.at || !S.ap) return;
    const R = S.rx, E = S.en, A = S.at;
    $$('#rxSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === R.kind));
    $('#bRxRun').disabled = R.run; $('#bRxRun').textContent = R.run ? '⏳ 반응 중…' : R.p >= 1 ? '▶ 다시 실행' : '▶ 반응 실행';
    $('#rxNote').textContent = R.kind === 'leaf' ? '식물 잎에서 이산화 탄소와 물이 합쳐져 포도당이 돼요. 분자가 커지는 동화 작용이에요.' : '근육 세포에서 포도당이 산소와 반응해 작은 분자로 분해돼요. 분자가 작아지는 이화 작용이에요.';
    $('#sInt').value = E.i; $('#sInt').style.setProperty('--pct', E.i + '%'); $('#oInt').textContent = E.i + ' %';
    $('#enNote').textContent = '운동 강도 ' + E.i + ' % → 세포호흡 속도 R = ' + rnum(E.i).toFixed(1) + ', ATP 생성 ' + atpOf(E.i) + ', 열 방출 ' + heatOf(E.i) + ' (상대 단위).';
    $$('#typeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.t === A.type));
    $('#bResp').textContent = A.resp ? '🫁 세포호흡 끄기' : '🫁 세포호흡 켜기'; $('#bResp').classList.toggle('btn-primary', !A.resp);
    $('#bAct').textContent = A.act ? '💪 활동 멈추기' : '💪 활동 시키기'; $('#bAct').classList.toggle('btn-primary', !A.act);
    $('#atpNote').textContent = 'ATP 저장량 ' + atpCount() + ' / 6 · 충전 ' + A.charges + '회 · 방전 한 바퀴 ' + A.cycles + '회' + (A.depleted ? ' · ATP가 바닥났어요!' : '');
  }
  $$('#rxSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const R = S.rx; R.kind = b.dataset.k; R.p = 0; R.run = false; R.burst = false; parts.clear(); rlast = ''; syncControls(); }));
  $('#bRxRun').addEventListener('click', () => { const R = S.rx; if (R.run) return; R.p = 0; R.burst = false; R.run = true; Sound.click(); parts.clear(); syncControls(); });
  $('#bRxReset').addEventListener('click', () => { const R = S.rx; R.p = 0; R.run = false; R.burst = false; parts.clear(); Sound.click(); syncControls(); });
  $('#bAnaReset').addEventListener('click', () => { Sound.click(); S.sorter.reset(); });
  $('#sInt').addEventListener('input', (e) => { S.en.i = +e.target.value; rlast = ''; syncControls(); });
  $$('#typeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.at.type = b.dataset.t; S.at.types[b.dataset.t] = true; rlast = ''; syncControls(); }));
  $('#bResp').addEventListener('click', () => { S.at.resp = !S.at.resp; Sound.click(); rlast = ''; syncControls(); });
  $('#bAct').addEventListener('click', () => { S.at.act = !S.at.act; Sound.click(); rlast = ''; syncControls(); });
  $('#bFormReset').addEventListener('click', () => { Sound.click(); S.sorter2.reset(); });
  $('#bChainReset').addEventListener('click', () => { Sound.click(); makeChain(); });
  function onEnterView() { PT = { react: PT_REACT, energy: PT_ENERGY, atp: PT_ATP, apply: PT_APPLY }[S.mode]; rlast = ''; }

  function readouts() {
    let a, b, c, L1, L2, L3; const sub = S.sub[S.mode];
    if (S.mode === 'react') {
      if (sub === 'reac') { const R = S.rx; L1 = '반응'; a = R.kind === 'leaf' ? '광합성 (동화)' : '세포호흡 (이화)'; L2 = '분자 크기'; b = R.p < 0.9 ? '—' : R.kind === 'leaf' ? '커졌어요' : '작아졌어요'; L3 = '에너지'; c = R.p < 0.9 ? '—' : R.kind === 'leaf' ? '흡수' : '방출'; }
      else { L1 = '분류한 카드'; a = S.sorter.placed + ' / 8'; L2 = '동화'; b = S.sorter.cards.filter((x) => x.zone === 'ana').length + '장'; L3 = '이화'; c = S.sorter.cards.filter((x) => x.zone === 'cat').length + '장'; }
    } else if (S.mode === 'energy') { const E = S.en; L1 = '운동 강도'; a = E.i + ' %'; L2 = '열 방출'; b = heatOf(E.i) + ' (ATP ' + atpOf(E.i) + ')'; L3 = '체온'; c = tempOf(E.i).toFixed(1) + ' °C'; }
    else if (S.mode === 'atp') { const A = S.at; L1 = 'ATP 저장량'; a = atpCount() + ' / 6'; L2 = '충전 · 방전 한 바퀴'; b = A.charges + ' · ' + A.cycles + '회'; L3 = '세포'; c = CELLS[A.type].name; }
    else {
      if (sub === 'sort') { L1 = '분류한 카드'; a = S.sorter2.placed + ' / 7'; L2 = '맞는 카드'; b = S.sorter2.cards.filter((x) => x.zone && FORM_CARDS.find((q) => q.id === x.id).acc.indexOf(x.zone) >= 0).length + ' / 7'; L3 = '에너지 형태'; c = '5가지'; }
      else { L1 = '맞는 자리'; a = (5 - S.ap.ord.wrongIds().length) + ' / 5'; L2 = '추론 흐름'; b = '운동 → 호흡·심박'; L3 = '상태'; c = S.ap.ord.solved ? '완성' : '배열 중'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|'); if (key === rlast) return; rlast = key; syncControls();
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '동화와 이화: 분자가 커질까, 작아질까?', short: '동화·이화', icon: '🧪', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 음식을 먹고 얻은 에너지는 몸속에서 어떤 모습으로 저장되었다가 쓰일까?</p>' +
        '<div class="si-link">🔗 <b>중학교·통합과학에서</b> 광합성과 세포호흡으로 에너지가 오가는 것, 효소가 화학 반응을 돕는 것을 배웠어요.</div>' +
        '<p><b>물질대사</b>는 생명체 안에서 일어나는 화학 반응이에요(효소가 관여해요). 간단한 물질을 복잡한 물질로 합성하면 <b>동화 작용</b>, 복잡한 물질을 간단한 물질로 분해하면 <b>이화 작용</b>이에요. 식물 잎과 근육 세포의 반응을 분자 모형으로 보고 분류해 봐요.</p>',
      features: ['react'],
      setup() { makeReact(); makeSorter(); setScene('react', 'reac'); },
      recap: '동화 작용은 작은 분자를 큰 분자로 합성하며 에너지를 흡수하고, 이화 작용은 큰 분자를 작은 분자로 분해하며 에너지를 방출해요.',
      summary: '<ul><li><b>물질대사</b> = 생명체 안에서 일어나는 화학 반응 (효소 관여)</li><li><b>동화 작용</b>: 간단한 물질 → 복잡한 물질, <b>에너지 흡수</b> (광합성, 단백질·글리코젠·녹말·DNA 합성)</li><li><b>이화 작용</b>: 복잡한 물질 → 간단한 물질, <b>에너지 방출</b> (세포호흡, 소화, 지방 분해)</li><li>광합성: 6CO₂ + 6H₂O + 빛에너지 → C₆H₁₂O₆ + 6O₂ / 세포호흡: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 에너지</li></ul>',
      missions: [
        {
          title: '두 가지 반응 실행하기',
          goal: '<b>식물 잎(광합성)</b>과 <b>근육 세포(세포호흡)</b>의 반응을 각각 끝까지 실행해 보세요.',
          hint: '위쪽 단추에서 식물 잎 / 근육 세포를 고르고 ▶ 반응 실행을 눌러요. 4~5초 걸려요.',
          setup() { setScene('react', 'reac'); },
          check: () => S.rx.ran.leaf && S.rx.ran.muscle, hold: 0.4,
          status: () => mark(S.rx.ran.leaf) + ' 광합성 &nbsp; ' + mark(S.rx.ran.muscle) + ' 세포호흡',
          explain: '광합성에서는 <b>작은 분자(CO₂, H₂O)</b>가 합쳐져 <b>큰 분자(포도당)</b>가 되며 빛에너지를 흡수해요. 세포호흡에서는 <b>큰 분자(포도당)</b>가 산소와 반응해 <b>작은 분자(CO₂, H₂O)</b>로 분해되며 에너지가 나와요.',
        },
        {
          title: '8가지 반응을 동화 / 이화로 분류', manual: true,
          goal: '카드 8장을 끌어서 <b>동화 작용</b>과 <b>이화 작용</b> 상자에 나누고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '분자가 커지는 합성 반응은 동화, 분자가 작아지는 분해 반응은 이화예요. 소화는 큰 영양소를 작게 분해해요.',
          setup() { setScene('react', 'sort'); },
          check() {
            const sd = S.sorter, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => c.zone !== ANA_CARDS.find((q) => q.id === c.id).ans);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 반대쪽 상자예요: ' + wrong.map((c) => c.label).join(', ') + '. 분자가 커지는지 작아지는지 생각해 보세요.';
            return true;
          },
          status: () => '분류한 카드 ' + S.sorter.placed + ' / 8',
          explain: '<b>동화</b>: 광합성, 아미노산 → 단백질, 포도당 → 글리코젠, 녹말 합성, DNA 복제(작은 단위를 이어 큰 분자를 만들어요). <b>이화</b>: 세포호흡, 소화, 지방 분해(큰 분자를 작게 분해해요).',
        },
        {
          type: 'quiz', title: '동화와 이화의 에너지',
          goal: '<b>동화 작용</b>과 <b>이화 작용</b>에 대한 설명으로 옳은 것은?',
          setup() { setScene('react', 'reac'); },
          choices: ['동화는 에너지를 흡수하며 합성하고, 이화는 에너지를 방출하며 분해한다', '동화는 에너지를 방출하고, 이화는 에너지를 흡수한다', '동화는 식물에서만, 이화는 동물에서만 일어난다', '동화와 이화는 모두 에너지를 방출한다'],
          answer: 0,
          feedback: ['', '반대예요. 큰 분자를 만들려면 에너지가 필요하고(동화), 큰 분자를 분해하면 에너지가 나와요(이화).', '식물도 세포호흡(이화)을 하고, 동물도 단백질을 합성(동화)해요. 모든 생물에서 둘 다 일어나요.', '동화는 에너지를 흡수해요. 광합성은 빛에너지를 흡수해요.'],
          explain: '<b>동화</b>는 작은 분자를 큰 분자로 합성하는 반응이라 <b>에너지를 흡수</b>하고, <b>이화</b>는 큰 분자를 작은 분자로 분해하는 반응이라 <b>에너지를 방출</b>해요. 두 작용은 모든 생물에서 함께 일어나요.',
        },
      ],
    },
    {
      title: '에너지 전환: 에너지는 어디로 갈까?', short: '에너지 전환', icon: '⚡', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포호흡이 이화 작용이라 에너지가 방출된다는 것을 확인했어요. 방출된 에너지가 <b>어떤 형태로 바뀌는지</b> 따라가 봐요.</div>' +
        '<p>세포호흡에서 포도당에 저장된 화학 에너지를 <b>100</b>이라고 하면 약 <b>40</b>은 <b>ATP</b>에 저장되고 약 <b>60</b>은 <b>열</b>로 방출돼요(단순화한 값). 운동 강도를 바꿔 세포호흡 속도와 체온의 변화를 관찰하세요.</p>',
      features: ['energy'],
      setup() { makeEnergy(); setScene('energy'); },
      recap: '세포호흡으로 방출된 에너지는 약 40이 ATP에 저장되고 약 60은 열로 방출돼요. 에너지는 사라지지 않고 형태만 바뀌어요.',
      summary: '<ul><li>포도당의 화학 에너지 <b>100</b> → <b>ATP 약 40</b>(화학 에너지로 저장) + <b>열 약 60</b> (단순화한 값)</li><li>에너지는 사라지지 않고 <b>형태가 바뀌어요</b> (에너지 보존).</li><li>운동 강도가 높을수록 세포호흡이 빨라져 ATP 생성과 열 방출이 함께 늘고 체온이 올라가요.</li><li>열은 <b>체온을 유지</b>하는 데 쓰여요.</li></ul>',
      missions: [
        {
          title: '운동 강도를 높여 열 방출 확인',
          goal: '<b>운동 강도를 70 % 이상</b>으로 올려서 열 방출이 <b>400 이상</b>이 되게 해 보세요.',
          hint: '오른쪽 슬라이더를 오른쪽으로 끌어요. 70 %에서 세포호흡 속도 R = 7.3, 열 방출 = 438이에요.',
          setup() { setScene('energy'); S.en.i = 20; syncControls(); },
          check: () => S.en.i >= 70 && heatOf(S.en.i) >= 400, hold: 1,
          status: () => '운동 강도 ' + S.en.i + ' % · 열 ' + heatOf(S.en.i) + ' · 체온 ' + tempOf(S.en.i).toFixed(1) + ' °C ' + mark(S.en.i >= 70 && heatOf(S.en.i) >= 400),
          explain: '운동 강도 70 %에서는 세포호흡 속도가 <b>R = 7.3</b>이라서 ATP 생성은 40 × 7.3 = <b>292</b>, 열 방출은 60 × 7.3 = <b>438</b>(상대 단위)이에요. 열이 늘어서 체온이 약 37.9 °C로 올라가요.',
        },
        {
          type: 'quiz', title: '열로 나간 60 %의 쓸모',
          goal: '세포호흡에서 에너지의 약 <b>60 %가 열</b>로 방출돼요. 이 열은 어디에 쓰일까요?',
          setup() { setScene('energy'); },
          choices: ['체온을 일정하게 유지하는 데 쓰여요', '아무 쓸모 없이 사라져 버린 에너지예요', '모두 ATP로 다시 바뀌어요', '에너지가 없어졌으니 에너지 보존이 깨졌어요'],
          answer: 0,
          feedback: ['', '열은 쓸모없는 낭비가 아니에요. 사람 같은 정온 동물은 이 열로 체온을 유지해요.', '열은 ATP로 되돌아가지 않아요. ATP로 저장된 것은 약 40 %예요.', '에너지는 사라지지 않고 열로 형태가 바뀐 거예요. 40 + 60 = 100으로 보존돼요.'],
          explain: '열로 방출된 에너지는 <b>체온을 유지</b>하는 데 쓰여요. 에너지는 사라지지 않고 <b>ATP의 화학 에너지(약 40)</b>와 <b>열(약 60)</b>로 형태만 바뀌어요.',
        },
      ],
    },
    {
      title: 'ATP 충전소: 에너지를 저장하고 건네요', short: 'ATP 충전', icon: '🔋', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포호흡의 에너지 약 40이 ATP에 저장되는 것을 보았어요. <b>ATP</b>가 어떻게 에너지를 저장하고 건네는지 모형으로 알아봐요.</div>' +
        '<p>ATP는 <b>에너지를 저장하고 전달하는 물질</b>이에요. 배터리처럼 세포호흡의 에너지로 <b>충전</b>(ADP + Ⓟ → ATP)하고, 생명 활동 부위에서 <b>방전</b>(ATP → ADP + Ⓟ)하며 에너지를 건네요. 세균·식물·동물 세포가 모두 같은 ATP를 써요.</p>',
      features: ['atp'],
      setup() { makeAtp('animal'); setScene('atp'); },
      recap: '세포호흡의 에너지로 ADP와 인산이 ATP로 충전되고, 활동 부위에서 ATP가 분해되며 에너지를 건네요. 저장량이 적어서 계속 재합성해야 해요.',
      summary: '<ul><li>ATP는 <b>에너지를 저장하고 전달</b>하는 물질이에요 (충전·방전하는 배터리).</li><li>충전: ADP + 인산 + 에너지(세포호흡) → ATP / 방전: ATP → ADP + 인산 + 에너지(생명 활동에 사용)</li><li>모든 살아 있는 세포(세균·식물·동물)는 <b>같은 ATP</b>를 써요.</li><li>세포 속 ATP 저장량은 매우 적어서 세포호흡이 멈추면 몇 초 안에 바닥나요. 그래서 <b>계속 다시 합성</b>해요. (ATP를 먹는 것이 아니라 음식으로 세포호흡을 해서 만들어요.)</li></ul>',
      missions: [
        {
          title: '충전–방전 3회전 돌리기',
          goal: '<b>세포호흡</b>과 <b>활동</b>을 모두 켜서 ATP가 <b>충전–방전 한 바퀴를 3번</b> 돌게 하고, <b>세균·식물·동물</b> 세포를 모두 한 번씩 골라 보세요.',
          hint: '아래 도구에서 🫁 세포호흡 켜기와 💪 활동 시키기를 눌러요. 세포 종류 단추를 눌러 바꿔요.',
          setup() { makeAtp(S.at.type); setScene('atp'); },
          check: () => S.at.cycles >= 3 && ['bact', 'plant', 'animal'].every((t) => S.at.types[t]), hold: 0.5,
          status: () => '한 바퀴 ' + Math.min(3, S.at.cycles) + ' / 3 ' + mark(S.at.cycles >= 3) + ' &nbsp; ' + ['bact', 'plant', 'animal'].map((t) => mark(!!S.at.types[t]) + CELLS[t].name.replace(' 세포', '')).join(' '),
          explain: '세포호흡의 에너지로 <b>ADP + 인산 → ATP(충전)</b>, 활동 부위에서 <b>ATP → ADP + 인산(방전)</b>하며 에너지를 건네요. 이 한 바퀴가 계속 돌아요. 세균도 식물도 동물도 <b>같은 ATP</b>를 써요.',
        },
        {
          title: '세포호흡을 멈추면?',
          goal: '<b>세포호흡은 끄고 활동만 켜서</b> ATP 저장량이 <b>0</b>이 되는 것을 확인하세요.',
          hint: '🫁 세포호흡 끄기를 누르고 💪 활동 시키기를 눌러요. 몇 초 안에 저장고가 비어요.',
          setup() { makeAtp(S.at.type); setScene('atp'); },
          check: () => S.at.depleted, hold: 0.4,
          status: () => 'ATP 저장량 ' + atpCount() + ' / 6 &nbsp; ' + mark(S.at.depleted) + ' 바닥남',
          explain: '세포 속 ATP 저장량은 아주 적어요. 세포호흡이 멈추면 <b>몇 초 안에 ATP가 바닥나</b> 활동이 멈춰요. 그래서 세포는 세포호흡으로 ATP를 <b>계속 다시 합성</b>해야 해요.',
        },
        {
          type: 'quiz', title: 'ATP는 어떻게 얻을까?',
          goal: '우리 몸이 <b>ATP</b>를 얻는 방법으로 옳은 것은?',
          setup() { setScene('atp'); },
          choices: ['음식을 세포호흡으로 분해해서 얻은 에너지로 세포 안에서 ATP를 합성한다', 'ATP를 직접 먹으면 바로 에너지로 쓴다', '세포에 ATP를 많이 저장해 두었다가 하루 종일 쓴다', 'ATP는 동물 세포에만 있다'],
          answer: 0,
          feedback: ['', 'ATP는 먹어서 얻는 것이 아니에요. 음식의 에너지로 세포 안에서 만들어요.', 'ATP 저장량은 아주 적어서 몇 초면 바닥나요. 계속 다시 합성해요.', '세균, 식물, 동물 모든 세포가 같은 ATP를 써요.'],
          explain: '음식물 속 포도당 등을 <b>세포호흡</b>으로 분해해 얻은 에너지로 <b>ADP + 인산 → ATP</b>를 합성해요. ATP를 먹는 것이 아니에요.',
        },
      ],
    },
    {
      title: '활동과 에너지: 몸이 ATP를 쓰는 곳', short: '활동과 에너지', icon: '🏃', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ATP가 충전되고 방전되며 에너지를 건네는 것을 보았어요. 이제 <b>다양한 생명 활동</b>이 ATP 에너지를 어떤 형태로 쓰는지 추론해요.</div>' +
        '<p>근수축은 역학 에너지, 반딧불이 발광은 빛에너지처럼 활동마다 에너지 형태가 달라요. 또 운동을 하면 ATP 소비 → 세포호흡 → 산소 소비 → 호흡·심박으로 이어지는 연쇄(중학교 동물과 에너지 연결)를 순서대로 놓아 봐요.</p>',
      features: ['apply'],
      setup() { makeSorter2(); makeChain(); setScene('apply', 'sort'); },
      recap: '다양한 생명 활동은 ATP의 에너지를 역학·빛·전기·화학·열 같은 형태로 바꿔 써요. 운동을 하면 ATP 소비가 늘고 세포호흡, 산소 소비, 호흡·심박이 함께 늘어요.',
      summary: '<ul><li>근수축·세포 분열(염색체 이동) → <b>역학 에너지</b>, 반딧불이 발광 → <b>빛에너지</b>, 전기뱀장어 발전·신경 신호 전도 → <b>전기 에너지</b>, 단백질 합성 → <b>화학 에너지</b>, 체온 유지 → <b>열에너지</b></li><li>모두 <b>같은 ATP</b>의 에너지를 써요.</li><li>운동 → ATP 소비 ↑ → 세포호흡 ↑ → O₂ 소비·CO₂ 발생 ↑ → 호흡수·심박수 ↑</li><li>세포호흡이 막히면 ATP 합성이 줄어 에너지가 많이 필요한 활동부터 멈춰요.</li></ul>',
      missions: [
        {
          title: '활동에 쓰이는 에너지 형태 연결', manual: true,
          goal: '카드 7장을 끌어서 그 활동에 쓰이는 <b>에너지 형태</b> 상자(역학·빛·전기·화학·열)에 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '근수축은 움직임(역학), 신경 신호는 전기 신호예요. 세포 분열은 두 가지 모두 괜찮아요(염색체 이동은 역학, DNA와 물질 합성은 화학).',
          setup() { setScene('apply', 'sort'); },
          check() {
            const sd = S.sorter2, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => FORM_CARDS.find((q) => q.id === c.id).acc.indexOf(c.zone) < 0);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 에너지 형태가 달라요: ' + wrong.map((c) => c.label).join(', ') + '. 그 활동에서 에너지가 어떤 모습으로 쓰이는지 생각해 보세요.';
            return true;
          },
          status: () => '분류한 카드 ' + S.sorter2.placed + ' / 7',
          explain: '달리기 근수축 → <b>역학</b>, 반딧불이 발광 → <b>빛</b>, 전기뱀장어 발전·신경 신호 전도 → <b>전기</b>, 단백질 합성 → <b>화학</b>, 체온 유지 → <b>열</b>이에요. 세포 분열은 염색체 이동(역학)과 물질 합성(화학)이 함께 일어나요. 모두 같은 ATP의 에너지를 써요.',
        },
        {
          title: '운동할 때의 연쇄 추론', manual: true,
          goal: '운동을 할 때 일어나는 일 5가지를 <b>일어나는 순서대로</b> 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '운동 강도가 높아지면 근육 세포가 ATP를 많이 써요. 그러면 ATP를 다시 만들기 위해 세포호흡이 활발해져요.',
          setup() { setScene('apply', 'chain'); },
          check() { const A = S.ap; if (A.ord.solved) { A.solved = true; A.t = 0; return true; } A.ord.markBad(A.ord.wrongIds()); return '빨간 카드는 자리가 달라요. "무엇 때문에 무엇이 늘어나는지" 원인과 결과를 이어 보세요.'; },
          status: () => '맞는 자리 ' + (5 - S.ap.ord.wrongIds().length) + ' / 5',
          explain: '운동 → <b>ATP 소비 증가</b> → <b>세포호흡 활발</b>(ATP 재합성) → <b>산소 소비·이산화 탄소 발생 증가</b> → <b>호흡수·심박수 증가</b>(산소 공급과 이산화 탄소 배출을 늘려요). 중학교에서 배운 호흡·순환과 이어져요.',
        },
        {
          type: 'quiz', title: '세포호흡을 막는 물질에 중독되면?',
          goal: '세포호흡을 막는 물질에 중독되면 <b>가장 먼저 영향을 받는 것</b>은?',
          setup() { setScene('apply', 'chain'); },
          choices: ['ATP 합성이 줄어 근수축·신경 신호 전도처럼 에너지가 많이 필요한 활동이 먼저 멈춘다', '포도당이 더 많이 쌓여 활동이 더 활발해진다', '광합성만 멈추고 동물은 영향이 없다', 'ATP는 충분히 저장되어 있어서 아무 영향이 없다'],
          answer: 0,
          feedback: ['', '세포호흡이 막히면 포도당에서 ATP를 만들지 못해요. 쌓이는 것과 활발해지는 것은 달라요.', '동물과 식물 모두 세포호흡으로 ATP를 만들어요. 동물도 큰 영향을 받아요.', 'ATP 저장량은 아주 적어서 몇 초면 바닥나요. 그래서 큰 영향이 있어요.'],
          explain: '세포호흡이 막히면 <b>ATP를 다시 만들지 못해</b> 저장된 ATP가 바로 바닥나요. 그래서 <b>에너지를 많이 쓰는 근수축, 신경 신호 전도</b> 같은 활동부터 멈춰요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-metabolism-atp', mount: '#game', badge: 'ATP 충전 기사', homeHref: '../../index.html#hb',
    featureLabels: { react: '🧪 분자 모형 반응 · 동화/이화 분류', energy: '⚡ 에너지 전환 · 운동 강도', atp: '🔋 ATP 충전소 · 세포 종류', apply: '🏃 에너지 형태 연결 · 운동 연쇄' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  makeReact(); makeSorter(); makeEnergy(); makeAtp('animal'); makeSorter2(); makeChain();
  setScene('react', 'reac');
  let lastFree = false;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    if (S.mode === 'react') { stepReact(dt); drawReact(dt); }
    else if (S.mode === 'energy') { stepEnergy(dt); drawEnergy(dt); }
    else if (S.mode === 'atp') { stepAtp(dt); drawAtp(dt); }
    else { stepApply(dt); drawApply(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, ANA_CARDS, FORM_CARDS, CHAIN, CELLS, get game() { return game; }, setScene, atpCount, rnum, atpOf, heatOf, tempOf,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'react') stepReact(0.02); else if (S.mode === 'energy') stepEnergy(0.02); else if (S.mode === 'atp') stepAtp(0.02); else stepApply(0.02); } },
  };

})();
