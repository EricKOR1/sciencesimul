/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 생물의 특성 (단원 1차시)
   성취기준 [12생과01-01] 생물 및 생명과학의 특성을 이해하고 생명과학의 성과를 협력적으로 소통할 수 있다.
   ① 관찰: 생물과 비생물 (6칸 검사판)  ② 모형: 바이러스  ③ 모형: 휴머노이드  ④ 적용: 융합 성과
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
  let PT_INSPECT, PT_VIRUS, PT_ROBOT, PT_FUSION;
  const S = { mode: 'inspect', sub: { inspect: '', virus: 'struct', robot: 'map', fusion: 'map' }, fade: 0, insp: null, vir: null, rob: null, fu: null };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const SCENES = {
    inspect: { label: '🔬 생물 판정', subs: null },
    virus: { label: '🦠 바이러스 모형', subs: [['struct', '🔬 구조'], ['size', '📏 크기'], ['host', '🧫 증식']] },
    robot: { label: '🤖 휴머노이드', subs: [['map', '🔌 대응 모식도'], ['cmp', '📋 검사판 비교']] },
    fusion: { label: '🧬 융합 성과', subs: [['map', '🗺 융합 지도'], ['board', '👥 모둠 보드']] },
  };
  const viewKey = () => S.mode + (SCENES[S.mode].subs ? ':' + S.sub[S.mode] : '');
  function setScene(mode, sub) {
    const changed = S.mode !== mode || (sub && S.sub[mode] !== sub);
    if (sub) S.sub[mode] = sub;
    if (changed) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = SCENES[mode].label;
    onEnterView();
    updateCtl();
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

  /* ================= ① 생물 판정 ================= */
  const ITEMS = [
    { id: 'dog', label: '강아지', short: '강아지', icon: '🐶', st: 'OOOOOO', bio: true, note: '세포로 이루어져 있고, 먹이를 소화해 에너지를 얻고, 자라고 새끼를 낳아요.' },
    { id: 'yeast', label: '효모 가루', short: '효모 가루', icon: '🍞', st: 'OOOOOO', bio: true, note: '효모는 단세포 생물이에요. 마른 가루는 쉬는 상태지만, 물과 설탕을 주면 물질대사가 활발해지고 번식해요.' },
    { id: 'car', label: '자동차', short: '자동차', icon: '🚗', st: 'XXXXXX', bio: false, note: '연료를 태워 움직이지만 세포가 없고, 스스로 자라거나 번식하지 못해요.' },
    { id: 'flame', label: '불꽃', short: '불꽃', icon: '🔥', st: 'XXXTXX', bio: false, note: '커지고 열과 빛을 내지만 세포도 유전 정보도 없어요. 연료가 더 타는 것일 뿐 생장이 아니에요.' },
    { id: 'salt', label: '소금 결정', short: '소금 결정', icon: '🧂', st: 'XXXTXX', bio: false, note: '물질이 표면에 쌓여 커질 뿐이에요. 세포가 없고 스스로 물질대사를 하지 않아요.' },
    { id: 'seed', label: '씨앗', short: '씨앗', icon: '🌰', st: 'OOOOOO', bio: true, note: '쉬고 있을 때도 세포로 이루어져 있고 물질대사가 아주 느리게 일어나요. 조건이 맞으면 싹이 터서 자라요.' },
    { id: 'vac', label: '로봇 청소기', short: '로봇 청소기', icon: '🧹', st: 'XXTXXX', bio: false, note: '센서로 장애물을 피하지만 세포가 없고 배터리 전기로 움직여요. 스스로 자라거나 번식하지 못해요.' },
    { id: 'moss', label: '이끼', short: '이끼', icon: '🌿', st: 'OOOOOO', bio: true, note: '작은 식물이지만 6가지 특성을 모두 갖춰요. 광합성을 하고 포자로 번식해요.' },
  ];
  const ITEM = {}; ITEMS.forEach((it) => { ITEM[it.id] = it; });
  const INS = PHONE
    ? { x: 8, y: 8, w: 464, h: 272, st: { x: 8, y: 8, w: 160, h: 272 }, lamp: { x: 178, y: 44, w: 288, h: 130, cols: 2 }, note: { x: 182, y: 190, w: 284 } }
    : { x: 16, y: 52, w: 520, h: 322, st: { x: 16, y: 52, w: 220, h: 322 }, lamp: { x: 248, y: 92, w: 280, h: 150, cols: 2 }, note: { x: 250, y: 264, w: 282 } };
  const BOXES = PHONE
    ? [{ id: 'bio', label: '🌱 생물', col: '#16a34a', x: 8, y: 288, w: 228, h: 150, cols: 2, hdr: 28 }, { id: 'non', label: '⚙️ 비생물', col: '#64748b', x: 244, y: 288, w: 228, h: 150, cols: 2, hdr: 28 }]
    : [{ id: 'bio', label: '🌱 생물', col: '#16a34a', x: 552, y: 52, w: 232, h: 152, cols: 2, hdr: 28 }, { id: 'non', label: '⚙️ 비생물', col: '#64748b', x: 552, y: 222, w: 232, h: 152, cols: 2, hdr: 28 }];
  const trayPos = (i) => PHONE ? { x: 10 + (i % 2) * 236, y: 460 + Math.floor(i / 2) * 45 } : { x: 13 + (i % 4) * 196, y: 402 + Math.floor(i / 4) * 62 };
  function makeInspect() {
    S.insp = { id: null, t: 0, lit: [0, 0, 0, 0, 0, 0], fired: [], seen: {} };
    S.sorter = new Sorter({
      cards: ITEMS.map((it) => ({ id: it.id, label: it.label, short: it.short, icon: it.icon, col: it.bio ? '#16a34a' : '#64748b' })),
      boxes: BOXES, tray: trayPos, cw: PHONE ? 226 : 186, ch: PHONE ? 40 : 52, kh: 26,
      onTap: (c) => inspectItem(c.id), isSel: (c) => S.insp && S.insp.id === c.id, onChange: () => { rlast = ''; },
    });
  }
  function inspectItem(id) {
    const I = S.insp; I.id = id; I.t = 0; I.lit = [0, 0, 0, 0, 0, 0]; I.fired = []; I.seen[id] = true; Sound.click(); rlast = '';
    // 방금 고른 카드는 제자리
    if (S.sorter) S.sorter.layout();
  }
  /* 대상 그림 (작은 장면) */
  function drawSubject(id, cx, cy, t, W) {
    const bob = RM ? 0 : Math.sin(clock * 2.4) * 3;
    ctx.save(); D.roundRect(cx - W / 2, cy - W * 0.52, W, W * 1.04, 16); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - W * 0.5, 0, cy + W * 0.5); g.addColorStop(0, '#f3faf5'); g.addColorStop(1, '#dff0e4'); ctx.fillStyle = g; ctx.fillRect(cx - W / 2, cy - W * 0.52, W, W * 1.04);
    const gy = cy + W * 0.28;
    ctx.fillStyle = 'rgba(80,110,90,.18)'; ctx.beginPath(); ctx.ellipse(cx, gy + 6, W * 0.32, 9, 0, 0, TAU); ctx.fill();
    const sz = W * 0.36;
    if (id === 'dog') { T(cx, gy - 6 + bob, '🐶', sz, '#000', 'center', 600); }
    else if (id === 'yeast') {
      T(cx, gy - 6, '🍞', sz, '#000', 'center', 600);
      for (let i = 0; i < 6; i++) { const ph = (clock * 0.5 + i * 0.17) % 1; ctx.globalAlpha = Math.sin(Math.PI * ph); ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx - W * 0.22 + i * W * 0.09, gy - sz * 0.8 - ph * W * 0.3, 4 + (i % 3), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (id === 'car') { const x = cx + (RM ? 0 : Math.sin(clock * 1.2) * W * 0.12); T(x, gy - 6, '🚗', sz, '#000', 'center', 600); }
    else if (id === 'flame') {
      ctx.fillStyle = '#92643a'; D.roundRect(cx - 50, gy - 12, 100, 16, 6); ctx.fill(); ctx.fillStyle = '#7a5230'; D.roundRect(cx - 36, gy - 26, 72, 16, 6); ctx.fill();
      const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(clock * 0.9);
      D.flame(cx, gy - 24, 52 + 46 * k, clock);
      T(cx, cy - W * 0.38, '커졌다 작아졌다 해요', 13, '#7c4a12', 'center', 800);
    } else if (id === 'salt') {
      const k = (clock * 0.12) % 1, s = 22 + 26 * k;
      ctx.fillStyle = '#cfe8ff'; D.roundRect(cx - W * 0.42, gy - 30, W * 0.84, 40, 10); ctx.fill();
      for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * s * 0.9, ss = s * (i % 2 ? 0.8 : 1); D.shadow(() => { D.roundRect(cx + ox - ss / 2, gy - 18 - ss, ss, ss, 4); ctx.fillStyle = '#f8fbff'; ctx.fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#b6c6d8'; ctx.lineWidth = 1.5; D.roundRect(cx + ox - ss / 2, gy - 18 - ss, ss, ss, 4); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(cx + ox - ss / 2 + 4, gy - 14 - ss, ss * 0.3, 3); }
      for (let i = 0; i < 6; i++) { const ph = (clock * 0.45 + i / 6) % 1, a = i * 1.1; D.sphere(cx + Math.cos(a) * (1 - ph) * W * 0.4, gy - 40 - Math.abs(Math.sin(a)) * (1 - ph) * W * 0.3, 4, i % 2 ? '#ef9a9a' : '#90caf9', { gloss: false }); }
      T(cx, cy - W * 0.38, '물질이 쌓여서 커져요', 13, '#33506f', 'center', 800);
    } else if (id === 'seed') {
      ctx.fillStyle = '#8b5e3c'; ctx.beginPath(); ctx.ellipse(cx, gy + 4, W * 0.36, 22, 0, Math.PI, 0); ctx.fill();
      const g1 = clamp((t - 1.2) / 3.2, 0, 1);
      if (g1 <= 0) { D.sphere(cx, gy - 6, 10, '#a16a3a', { gloss: true }); T(cx, cy - W * 0.38, '쉬고 있어요 (휴면)', 13, '#7c4a12', 'center', 800); }
      else {
        const h = 6 + g1 * 56; ctx.strokeStyle = '#3f9b4a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, gy); ctx.quadraticCurveTo(cx + 4, gy - h * 0.5, cx, gy - h); ctx.stroke();
        if (g1 > 0.35) { const lf = (g1 - 0.35) / 0.65; ctx.fillStyle = '#5cc06a'; ctx.beginPath(); ctx.ellipse(cx - 12 * lf, gy - h + 4, 14 * lf, 6 * lf, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 12 * lf, gy - h + 2, 14 * lf, 6 * lf, 0.5, 0, TAU); ctx.fill(); }
        T(cx, cy - W * 0.38, '물을 만나 싹이 터요 (발아)', 13, '#166534', 'center', 800);
      }
    } else if (id === 'vac') {
      const x = cx + (RM ? 0 : Math.sin(clock * 0.9) * W * 0.2);
      ctx.fillStyle = '#c7d0dc'; D.roundRect(cx + W * 0.3, gy - 38, 18, 44, 5); ctx.fill();
      D.sphere(x, gy - 18, 30, '#64748b', { gloss: true, shadow: true }); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, gy - 18, 8, 0, TAU); ctx.fill(); D.sphere(x + 17, gy - 24, 3.4, '#22d3ee', { gloss: false });
    } else if (id === 'moss') { ctx.save(); ctx.translate(cx, gy - 4); ctx.rotate(RM ? 0 : Math.sin(clock * 1.6) * 0.05); T(0, 0, '🌿', sz, '#000', 'center', 600); ctx.restore(); }
    ctx.restore();
  }
  function stepInspect(dt) {
    S.sorter.update(dt);
    const I = S.insp; I.t += dt;
    for (let i = 0; i < 6; i++) {
      const tg = I.id && I.t > 0.35 + i * 0.3 ? 1 : 0;
      I.lit[i] = SciSim.approach(I.lit[i], tg, dt, 12);
      if (tg && !I.fired[i]) {
        I.fired[i] = true; const st = ITEM[I.id].st[i];
        const col = INS.lamp, cols = 2, cw = (col.w - 8) / 2, chh = (col.h - 16) / 3, x = col.x + (i % cols) * (cw + 8), y = col.y + Math.floor(i / cols) * (chh + 8);
        if (st === 'O') { Sound.tick(); parts.burst(x + 10 + Math.min(chh * 0.3, 14), y + chh / 2, { count: 8, speed: 70, size: 2.6, colors: ['#22c55e', '#bbf7d0', '#fff'], gravity: 0, life: 0.5 }); }
      }
    }
  }
  function verdictOf(I) { const it = ITEM[I.id]; const allOn = I.lit.every((l) => l > 0.9); return allOn ? (it.bio ? 'bio' : 'non') : null; }
  function drawInspect(dt) {
    bgFill('#eef7f0', '#f7fbf8');
    const I = S.insp, g = INS;
    panel(g.x, g.y, g.w, g.h, 16);
    // 대상 그림
    const sw = g.st.w - 24, scx = g.st.x + g.st.w / 2, scy = PHONE ? g.st.y + 124 : g.st.y + 162;
    if (I.id) drawSubject(I.id, scx, scy, I.t, sw);
    else { D.roundRect(scx - sw / 2, scy - sw * 0.52, sw, sw * 1.04, 16); ctx.fillStyle = '#f3faf5'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#9fb3a6'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); textBlock(scx, scy - 6, sw - 20, '검사할 카드를 눌러요', PHONE ? 13 : 15, '#7b8a80', 20, 800, 'center'); T(scx, scy + 38, '👇', 24, '#000', 'center'); }
    // 이름
    const name = I.id ? ITEM[I.id].label : '생물의 특성 6칸 검사판';
    T(g.lamp.x + g.lamp.w / 2, g.lamp.y - (PHONE ? 12 : 22), '🔬 ' + name, PHONE ? 15 : 17, '#26324a', 'center', 800);
    drawLampBoard(g.lamp, I.id ? ITEM[I.id].st : 'XXXXXX', I.id ? I.lit : [0, 0, 0, 0, 0, 0]);
    if (I.id) {
      const v = verdictOf(I), it = ITEM[I.id];
      if (v) {
        const k = smooth((I.t - 2.3) / 0.4);
        D.label(g.note.x + 70, g.note.y - 2, v === 'bio' ? '🌱 생물이에요' : '⚙️ 비생물이에요', { bg: v === 'bio' ? '#16a34a' : '#64748b', size: PHONE ? 13.5 : 15, align: 'left' });
        ctx.globalAlpha = k; const th = textBlock(g.note.x, g.note.y + (PHONE ? 26 : 30), g.note.w, it.note, PHONE ? 12.5 : 13.5, '#3a465c', PHONE ? 16 : 19, 700);
        if (it.st.indexOf('T') >= 0) T(g.note.x, g.note.y + (PHONE ? 26 : 30) + th + 4, '≈ 는 비슷해 보이지만 생물의 특성은 아니에요', PHONE ? 11.5 : 12.5, '#a16207', 'left', 800);
        ctx.globalAlpha = 1;
      } else T(g.note.x, g.note.y + 12, '검사하는 중…', 14, '#7b8a80', 'left', 800);
    } else textBlock(g.note.x, g.note.y + 12, g.note.w, '6가지를 모두 가지면 생물이에요. 하나라도 없으면 비생물이에요.', PHONE ? 12.5 : 13.5, '#5a6679', PHONE ? 17 : 19, 700);
    // 상자와 카드
    T(PHONE ? 12 : 16, PHONE ? 452 : 394, '👇 눌러서 검사하고, 끌어서 생물/비생물 상자에 넣어요', PHONE ? 12.5 : 13.5, '#5a6679', 'left', 800);
    S.sorter.draw();
    parts.update(dt); parts.draw(ctx);
  }
  PT_INSPECT = { down: (p) => S.sorter.down(p), move: (p) => S.sorter.move(p), up: (p) => S.sorter.up(p), hover: (p) => S.sorter.hover(p) };

  /* ================= ② 바이러스 ================= */
  const FIB = []; for (let i = 0; i < 150; i++) { const y = 1 - (i + 0.5) / 150 * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; FIB.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
  const SPK = FIB.filter((p, i) => i % 6 === 0);
  function rot3(p, ay, ax) { const cy = Math.cos(ay), sy = Math.sin(ay); const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy; const cx = Math.cos(ax), sx = Math.sin(ax); return [x1, p[1] * cx - z1 * sx, p[1] * sx + z1 * cx]; }
  function spikeShape(x0, y0, x1, y1, hl, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = hl ? '#f97316' : '#e879a8'; ctx.lineWidth = hl ? 3.4 : 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    D.sphere(x1, y1, hl ? 5.4 : 4.4, hl ? '#fb923c' : '#f472b6', { gloss: false }); ctx.restore();
  }
  function drawVirusOut(cx, cy, R, ay, ax, hl) {
    const pts = SPK.map((p) => rot3(p, ay, ax));
    pts.filter((p) => p[2] < 0).forEach((p) => spikeShape(cx + p[0] * R, cy + p[1] * R, cx + p[0] * R * 1.28, cy + p[1] * R * 1.28, hl === 'spike', 0.75));
    D.shadow(() => { ctx.fillStyle = '#b8a4ee'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }, { blur: 14, y: 6 });
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R); g.addColorStop(0, '#e4daff'); g.addColorStop(0.6, '#b8a4ee'); g.addColorStop(1, '#7e66c9'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    FIB.forEach((p0) => {
      const p = rot3(p0, ay, ax); if (p[2] <= 0.02) return; const s = 0.55 + 0.45 * p[2];
      ctx.fillStyle = hl === 'capsid' ? 'rgba(251,191,36,' + (0.5 + 0.45 * p[2]) + ')' : 'rgba(255,255,255,' + (0.18 + 0.4 * p[2]) + ')';
      ctx.beginPath(); ctx.arc(cx + p[0] * R * 0.97, cy + p[1] * R * 0.97, R * 0.05 * s + 1, 0, TAU); ctx.fill();
    });
    pts.filter((p) => p[2] >= 0).forEach((p) => spikeShape(cx + p[0] * R, cy + p[1] * R, cx + p[0] * R * 1.28, cy + p[1] * R * 1.28, hl === 'spike', 1));
    ctx.strokeStyle = 'rgba(94,70,160,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  }
  function coil(cx, cy, R, t, col, w) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = i / 90 * Math.PI * 6, rr = R * (0.25 + 0.75 * (i / 90)) * (0.9 + 0.1 * Math.sin(i * 0.9 + t * 2));
      const x = cx + Math.cos(a) * rr * 1.0, y = cy + Math.sin(a * 1.0) * rr * 0.9;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }
  function drawVirusCut(cx, cy, R, t, hl) {
    for (let i = 0; i < 22; i++) { const a = i / 22 * TAU + 0.1; spikeShape(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a) * R * 1.28, cy + Math.sin(a) * R * 1.28, hl === 'spike', 1); }
    D.shadow(() => { ctx.fillStyle = '#b8a4ee'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }, { blur: 14, y: 6 });
    ctx.fillStyle = '#ede7ff'; ctx.beginPath(); ctx.arc(cx, cy, R - 15, 0, TAU); ctx.fill();
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; D.sphere(cx + Math.cos(a) * (R - 7.5), cy + Math.sin(a) * (R - 7.5), 7.5, hl === 'capsid' ? '#fbbf24' : '#9b84e0', { gloss: false }); }
    ctx.strokeStyle = 'rgba(94,70,160,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 15, 0, TAU); ctx.stroke();
    if (hl === 'nuc') D.glow(cx, cy, R * 0.8, '#fbbf24', 0.5);
    coil(cx, cy, R - 24, t, hl === 'nuc' ? '#f59e0b' : '#e0457b', 4.5);
    coil(cx + 3, cy - 2, R - 36, t + 1, hl === 'nuc' ? '#fbbf24' : '#f472b6', 3);
  }
  const VIR_LABEL = {
    spike: ['표면 단백질', '바이러스 표면의 돌기예요. 숙주 세포의 표면에 달라붙는 데 쓰여요.'],
    capsid: ['캡시드', '단백질로 된 껍질이에요. 안쪽의 핵산을 보호해요.'],
    nuc: ['핵산', '유전물질이에요. 숙주 세포 안에서 복제되고, 바이러스를 만드는 설계도가 돼요.'],
  };
  function makeVirus() {
    S.vir = {
      ay: 0.6, ax: 0.35, vay: 0, vax: 0, mode: 'out', hl: null, seen: {}, logSeen: false, scale: 0, scaleK: 0, drag: null, lit: [0, 0, 0, 0, 0, 0], litT: 0,
      hs: 0, hp: 0, auto: false, autoT: 0, hostLit: [0, 0, 0, 0, 0, 0], order: null, hostSeen: false,
    };
    S.vir.order = new Reorder({
      items: [
        { id: 'attach', label: '숙주 세포 표면에 달라붙기', short: '흡착', col: '#8b5cf6' },
        { id: 'enter', label: '핵산이 숙주 세포 안으로 들어가기', short: '침입', col: '#8b5cf6' },
        { id: 'copy', label: '핵산 복제와 단백질 합성', short: '복제·합성', col: '#8b5cf6' },
        { id: 'asm', label: '새 바이러스 입자 조립', short: '조립', col: '#8b5cf6' },
        { id: 'out', label: '세포를 터뜨리고 나와 퍼지기', short: '방출', col: '#8b5cf6' },
      ],
      slots: PHONE ? [0, 1, 2, 3, 4].map((i) => ({ x: 8, y: 474 + i * 32 })) : [0, 1, 2, 3, 4].map((i) => ({ x: 14 + i * 157, y: 440 })),
      cw: PHONE ? 464 : 150, ch: PHONE ? 28 : 64, solution: ['attach', 'enter', 'copy', 'asm', 'out'],
      onChange: () => { S.vir.order.clearBad(); },
    });
  }
  const STAGES = [
    ['① 흡착', '표면 단백질이 숙주 세포 표면에 붙어요.'],
    ['② 침입', '핵산이 숙주 세포 안으로 들어가요. 빈 껍질은 밖에 남아요.'],
    ['③ 복제와 합성', '핵산이 복제되고, 숙주의 리보솜이 바이러스 단백질을 만들어요.'],
    ['④ 조립', '복제된 핵산과 단백질이 모여 새 바이러스 입자가 만들어져요.'],
    ['⑤ 방출', '숙주 세포를 터뜨리고 나와 다른 세포로 퍼져요.'],
  ];
  function setHostStage(k) { const V = S.vir; V.hs = clamp(k, 0, 4); V.hostSeen = true; Sound.click(); syncControls(); }
  const HV = PHONE ? { x: 262, y: 140, rx: 172, ry: 84 } : { x: 304, y: 212, rx: 200, ry: 136 };
  const RIBO = (() => { const r = mulberry(7), a = []; for (let i = 0; i < 16; i++) { const t = r() * TAU, d = Math.sqrt(r()) * 0.82; a.push([Math.cos(t) * d, Math.sin(t) * d * 0.8]); } return a; })();
  const COPYPOS = [[-0.05, 0.1], [0.12, -0.12], [0.3, 0.18], [0.02, 0.38], [0.36, -0.2], [0.22, 0.4]];
  const NEWPOS = [[0.0, 0.05], [0.25, -0.12], [0.3, 0.26], [0.02, 0.38]];
  function miniVirus(x, y, r, a) { ctx.save(); ctx.globalAlpha *= a; for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; spikeShape(x + Math.cos(t) * r, y + Math.sin(t) * r, x + Math.cos(t) * r * 1.35, y + Math.sin(t) * r * 1.35, false, 1); } D.sphere(x, y, r, '#b8a4ee', { gloss: true }); ctx.restore(); }
  function drawHost(dt) {
    const V = S.vir, h = HV, s = V.hp, R = PHONE ? 20 : 24;
    const cell = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); };
    const burst = smooth(s - 3);
    // 숙주 세포
    ctx.save(); ctx.globalAlpha = 1 - 0.35 * burst;
    const cg = ctx.createRadialGradient(h.x - h.rx * 0.3, h.y - h.ry * 0.3, 10, h.x, h.y, h.rx); cg.addColorStop(0, '#fff1f4'); cg.addColorStop(1, '#fbd5df');
    D.shadow(() => { cell(h.x, h.y, h.rx, h.ry); ctx.fillStyle = cg; ctx.fill(); }, { blur: 12, y: 4 });
    ctx.lineWidth = 6 - 3 * burst; ctx.strokeStyle = '#f59e0b'; if (burst > 0.05) ctx.setLineDash([16 * (1 - burst) + 4, 6 + 18 * burst]); cell(h.x, h.y, h.rx, h.ry); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(h.x - h.rx * 0.38, h.y - h.ry * 0.3, PHONE ? 26 : 34, '#a78bfa', { gloss: true }); T(h.x - h.rx * 0.38, h.y - h.ry * 0.3 + 5, '핵', 13, '#fff', 'center', 800);
    RIBO.forEach((r) => D.sphere(h.x + r[0] * h.rx * 0.95, h.y + r[1] * h.ry, 3.2, '#e0457b', { gloss: false }));
    T(h.x + h.rx * 0.38, h.y + h.ry * 0.62, '숙주 세포', 13.5, '#9d174d', 'center', 800);
    ctx.restore();
    // 껍질(캡시드)
    const vx0 = h.x - h.rx - R * 1.05, vy0 = h.y;
    const ghost = smooth(s - 0.4) * 0.72 + (s > 3 ? 0.1 * smooth(s - 3) : 0);
    if (s < 3.9) {
      ctx.save(); ctx.globalAlpha = 1 - ghost + 0.0; if (s > 0.4) ctx.globalAlpha = Math.max(0.28, 1 - ghost);
      const cx = vx0 + 5 * smooth(s);
      for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; spikeShape(cx + Math.cos(t) * R, vy0 + Math.sin(t) * R, cx + Math.cos(t) * R * 1.35, vy0 + Math.sin(t) * R * 1.35, s < 0.5, 1); }
      D.sphere(cx, vy0, R, s > 0.4 ? '#cfc4f2' : '#b8a4ee', { gloss: s < 0.4 });
      // 핵산이 껍질 안에 있을 때
      if (s < 0.45) coil(cx, vy0, R * 0.55, clock, '#e0457b', 2.6);
      ctx.restore();
      if (s < 1.3) { const a = clamp(1 - s, 0, 1); for (let i = -1; i <= 1; i++) { ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.beginPath(); const ly = h.y + i * 18; ctx.moveTo(h.x - h.rx + 1, ly - 6); ctx.lineTo(h.x - h.rx - 8, ly); ctx.lineTo(h.x - h.rx + 1, ly + 6); ctx.stroke(); ctx.restore(); } }
    }
    // 핵산 (침입)
    const entry = [h.x - h.rx + 78, h.y + 10];
    const mv = smooth((s - 0.35) / 0.65);
    const nx = lerp(vx0 + 5, entry[0], mv), ny = lerp(vy0, entry[1], mv);
    const copies = s < 2 ? (s >= 0.35 ? 1 : 0) : 6;
    const cprog = smooth(s - 1);                      // 1 → 2 복제 진행
    const asm = smooth(s - 2);                        // 2 → 3 조립 진행
    if (s >= 0.35 && s < 3.05) {
      ctx.save(); ctx.globalAlpha = s < 0.45 ? 0 : 1 - asm;
      const nShow = s < 1 ? 1 : 1 + Math.round(5 * cprog);
      for (let i = 0; i < nShow; i++) {
        const p = i === 0 ? [nx, ny] : [h.x + COPYPOS[i][0] * h.rx * 0.8 + 20, h.y + COPYPOS[i][1] * h.ry * 0.8];
        const q = i === 0 ? p : [lerp(entry[0], p[0], cprog * 1), lerp(entry[1], p[1], cprog)];
        const xx = i === 0 && s > 1 ? lerp(nx, h.x + COPYPOS[0][0] * h.rx * 0.8 + 20, cprog) : q[0], yy = i === 0 && s > 1 ? lerp(ny, h.y + COPYPOS[0][1] * h.ry * 0.8, cprog) : q[1];
        coil(xx, yy, 13, clock + i, '#e0457b', 2.8);
      }
      ctx.restore();
    }
    // 단백질 조각 (숙주 리보솜에서 만들어져요)
    if (s > 1.4 && s < 3.05) {
      const m = Math.round(12 * smooth((s - 1.5) / 0.9)); ctx.save(); ctx.globalAlpha = 1 - asm;
      for (let i = 0; i < m; i++) { const r = RIBO[i], px = h.x + r[0] * h.rx * 0.95, py = h.y + r[1] * h.ry; const gx = h.x + 30, gy = h.y + 14; const q = asm; D.sphere(lerp(px, gx + (i % 4) * 8, q) + Math.sin(clock * 3 + i) * 2, lerp(py, gy + Math.floor(i / 4) * 8, q), 4.2, '#8b7bd8', { gloss: false }); }
      ctx.restore();
    }
    // 새 바이러스 입자
    if (s > 2.1) {
      const sc = smooth((s - 2.1) / 0.9), out = smooth(s - 3);
      NEWPOS.forEach((p, i) => {
        const ix = h.x + p[0] * h.rx * 0.8 + 20, iy = h.y + p[1] * h.ry * 0.8;
        const ox = h.x + h.rx + 36 + (i % 2) * 34 + i * 6, oy = h.y - h.ry * 0.5 + i * (h.ry * 0.38);
        miniVirus(lerp(ix, ox, out), lerp(iy, oy, out), R * 0.66 * sc, 1);
      });
    }
    if (s > 3.4) { ctx.save(); ctx.globalAlpha = smooth((s - 3.4) / 0.6); D.label(h.x + h.rx - (PHONE ? 20 : 40), h.y + h.ry + (PHONE ? 20 : 18), '새 바이러스 수백 개 (예시 값)', { bg: '#7e22ce', size: PHONE ? 12 : 13.5, align: 'right' }); ctx.restore(); }
    if (s < 0.5) D.label(vx0, vy0 - R * 1.8, '바이러스', { bg: '#7e66c9', size: 13 });
    // 단계 점
    const dy = h.y + h.ry + (PHONE ? 20 : 22);
    for (let i = 0; i < 5; i++) {
      const x = (PHONE ? 40 : 60) + i * (PHONE ? 100 : 106); const on = Math.abs(V.hs - i) < 0.5, done = V.hs > i;
      D.sphere(x, dy, 8, on ? '#7c3aed' : done ? '#a78bfa' : '#d1d5db', { gloss: false });
      T(x, dy + 22, STAGES[i][0].slice(2), PHONE ? 11.5 : 12.5, on ? '#5b21b6' : '#7b8a80', 'center', 800);
    }
  }

  /* ---------- 크기 비교 ---------- */
  const SZ = [
    { id: 'virus', name: '인플루엔자 바이러스', size: '약 100 nm', v: 100, col: '#8b5cf6' },
    { id: 'ecoli', name: '대장균', size: '약 2 µm', v: 2000, col: '#16a34a' },
    { id: 'human', name: '사람 세포', size: '약 20 µm', v: 20000, col: '#f97316' },
  ];
  const SZG = PHONE ? { x0: 24, w: 432, y0: 70, rowH: 100, axisY: 398 } : { x0: 44, w: 712, y0: 76, rowH: 84, axisY: 360 };
  const linPos = (v) => v / 22000, logPos = (v) => (Math.log10(v) - 1) / 4;
  function drawSize(dt) {
    const V = S.vir, g = SZG; V.scaleK = SciSim.approach(V.scaleK, V.scale, dt, RM ? 60 : 4);
    const k = V.scaleK;
    panel(8, PHONE ? 8 : 52, VW - 16, PHONE ? 612 : 500, 16);
    T(VW / 2, PHONE ? 36 : 80, k < 0.5 ? '📏 선형 눈금: 길이에 비례해요' : '📏 로그 눈금: 한 칸마다 10배예요', PHONE ? 15 : 17, '#26324a', 'center', 800);
    const y0 = g.y0 + (PHONE ? 12 : 22);
    SZ.forEach((it, i) => {
      const y = y0 + i * g.rowH, pos = lerp(linPos(it.v), logPos(it.v), k), bw = g.w * pos;
      TF(g.x0, y + 4, it.name + ' · ' + it.size, g.w, PHONE ? 14.5 : 15.5, 12, '#26324a', 'left', 800);
      D.roundRect(g.x0, y + 14, g.w, 28, 8); ctx.fillStyle = '#eef2f0'; ctx.fill();
      if (bw > 0.5) { ctx.save(); D.roundRect(g.x0, y + 14, g.w, 28, 8); ctx.clip(); ctx.fillStyle = it.col; ctx.fillRect(g.x0, y + 14, Math.max(0, bw), 28); ctx.restore(); }
      D.sphere(g.x0 + bw, y + 28, 8, it.col, { gloss: true, outline: '#fff', outlineWidth: 2 });
      if (bw < 40) { D.label(g.x0 + bw + 14, y + 28, (it.v === 100 ? '1' : it.v === 2000 ? '20' : '200') + '배', { bg: it.col, size: 12, align: 'left' }); }
      else { T(g.x0 + bw - 16, y + 33, (it.v === 100 ? '×1' : it.v === 2000 ? '×20' : '×200'), 13, '#fff', 'right', 800); }
    });
    // 눈금
    const ay = g.axisY; ctx.strokeStyle = '#6b7a72'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x0, ay); ctx.lineTo(g.x0 + g.w, ay); ctx.stroke();
    ctx.save(); ctx.globalAlpha = 1 - k;
    [0, 5000, 10000, 15000, 20000].forEach((v) => { const x = g.x0 + g.w * linPos(v); ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 8); ctx.stroke(); T(x, ay + 26, v === 0 ? '0' : (v / 1000) + ' µm', 12.5, '#46544d', 'center', 800); });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = k;
    [[10, '10 nm'], [100, '100 nm'], [1000, '1 µm'], [10000, '10 µm'], [100000, '100 µm']].forEach((a) => { const x = g.x0 + g.w * logPos(a[0]); ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 8); ctx.stroke(); T(Math.min(Math.max(x, g.x0 + 8), g.x0 + g.w - 8), ay + 26, a[1], 12.5, '#46544d', 'center', 800); });
    ctx.restore();
    // 설명
    const ty = ay + (PHONE ? 52 : 52);
    const ratio = '바이러스 : 대장균 : 사람 세포 = 1 : 20 : 200';
    D.label(VW / 2, ty, ratio, { bg: '#26324a', size: PHONE ? 13.5 : 15 });
    textBlock(PHONE ? 24 : 60, ty + 34, VW - (PHONE ? 48 : 120), k < 0.5 ? '선형 눈금에서는 바이러스가 거의 보이지 않아요. 너무 작아서 로그 눈금이 필요해요. (바이러스 막대의 길이도 실제 비율이에요)' : '로그 눈금에서는 한 칸이 10배예요. 길이는 크기의 비율이 아니라 자릿수를 나타내요.', PHONE ? 13 : 14, '#3a465c', PHONE ? 18 : 20, 700, 'left');
  }

  /* ---------- 바이러스 장면 전체 ---------- */
  function stepVirus(dt) {
    const V = S.vir, sub = S.sub.virus;
    if (sub === 'struct') {
      if (!V.drag) { V.ay += (RM ? 0 : 0.55) * dt + V.vay * dt; V.ax = SciSim.approach(V.ax, 0.35, dt, 1.5) + V.vax * dt; V.vay = SciSim.approach(V.vay, 0, dt, 3); V.vax = SciSim.approach(V.vax, 0, dt, 3); }
      V.litT += dt;
      for (let i = 0; i < 6; i++) { V.lit[i] = SciSim.approach(V.lit[i], V.litT > 0.5 + i * 0.28 ? 1 : 0, dt, 10); }
    }
    if (sub === 'host') {
      if (V.auto) { V.autoT += dt; if (V.autoT > 2.2) { V.autoT = 0; if (V.hs < 4) V.hs++; else { V.auto = false; syncControls(); } } }
      V.hp = SciSim.approach(V.hp, V.hs, dt, RM ? 60 : 1.6);
      if (Math.abs(V.hp - V.hs) < 0.01) V.hp = V.hs;
      const on = V.hp >= 1.95;
      for (let i = 0; i < 6; i++) V.hostLit[i] = SciSim.approach(V.hostLit[i], 1, dt, 6);
      V.order.update(dt);
    }
    if (sub === 'size' && V.scale === 1) V.logSeen = true;
  }
  const VLAMP_STRUCT = PHONE ? { x: 8, y: 344, w: 464, h: 168, cols: 2 } : { x: 384, y: 104, w: 400, h: 232, cols: 2 };
  const VLAMP_HOST = PHONE ? { x: 8, y: 356, w: 464, h: 82, cols: 3 } : { x: 560, y: 94, w: 224, h: 250, cols: 1 };
  function drawVirus(dt) {
    bgFill('#f1effa', '#f7f5fd');
    const V = S.vir, sub = S.sub.virus;
    if (sub === 'struct') {
      const cx = PHONE ? 240 : 190, cy = PHONE ? 150 : 212, R = PHONE ? 84 : 104;
      D.glow(cx, cy, R * 1.9, '#c4b5fd', 0.35);
      if (V.mode === 'out') drawVirusOut(cx, cy, R, V.ay, V.ax, V.hl); else drawVirusCut(cx, cy, R, clock, V.hl);
      if (V.hl) {
        const lab = VIR_LABEL[V.hl][0]; const a = V.hl === 'spike' ? -0.9 : V.hl === 'capsid' ? 0.7 : 2.2;
        const rr = V.hl === 'spike' ? R * 1.28 : V.hl === 'capsid' ? R : R * 0.45;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr, lx = cx + Math.cos(a) * (R * 1.7), ly = cy + Math.sin(a) * (R * 1.5);
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx, ly); ctx.stroke(); D.sphere(px, py, 4, '#7c3aed', { gloss: false });
        D.label(clamp(lx, 50, (PHONE ? VW : 340) - 50), ly, lab, { bg: '#7c3aed', size: PHONE ? 13 : 14.5 });
      }
      T(cx, PHONE ? 270 : 366, V.mode === 'out' ? '드래그해서 돌려 보세요' : '단면: 껍질 속의 핵산', 13, '#6b5fa8', 'center', 800);
      const g = VLAMP_STRUCT;
      T(g.x + g.w / 2, g.y - (PHONE ? 12 : 20), '🔬 바이러스 입자 검사판 (숙주 세포 밖)', PHONE ? 14 : 15.5, '#3b2d77', 'center', 800);
      drawLampBoard(g, 'XXXXXX', V.lit);
      if (V.lit[5] > 0.9) { textBlock(g.x + 4, g.y + g.h + (PHONE ? 22 : 30), g.w - 8, '세포막·세포질·리보솜이 없어요. 숙주 세포 밖의 입자 상태에서는 물질대사도 증식도 하지 않아요.', PHONE ? 12.5 : 13.5, '#46407a', PHONE ? 17 : 19, 700); }
    } else if (sub === 'size') drawSize(dt);
    else {
      drawHost(dt);
      const g = VLAMP_HOST, on = V.hp >= 1.95;
      T(PHONE ? VW / 2 : g.x + g.w / 2, g.y - (PHONE ? 10 : 20), '🔬 바이러스 검사판 · ' + (on ? '숙주 세포 안' : V.hp >= 0.95 ? '숙주 세포 안 · 증식 전' : '숙주 세포 밖'), PHONE ? 13.5 : 14.5, '#3b2d77', 'center', 800);
      drawLampBoard(g, on ? 'XXXXOO' : 'XXXXXX', V.hostLit, { short: PHONE || true });
      if (!PHONE) {
        textBlock(g.x, g.y + g.h + 24, g.w, on ? '숙주 안에서만 증식·변이해요. 생물과 비생물의 특성을 모두 가져요.' : V.hp >= 0.95 ? '핵산이 들어왔지만 아직 복제하기 전이라 특성이 나타나지 않아요.' : '숙주 밖에서는 아무 특성도 나타나지 않아요.', 13, '#46407a', 18, 700);
      }
      // 현재 단계 설명
      const k = clamp(Math.round(V.hs), 0, 4), cy = PHONE ? 330 : 405;
      D.label(PHONE ? 8 : 16, PHONE ? 298 : 392, STAGES[k][0], { bg: '#7c3aed', size: 13, align: 'left' });
      TF(PHONE ? 8 : 16, PHONE ? 326 : 424, STAGES[k][1], PHONE ? 460 : 530, PHONE ? 13 : 14, 11, '#46407a', 'left', 800);
      V.order.draw();
      T(PHONE ? 236 : 400, PHONE ? 466 : 523, PHONE ? '↓ 증식 과정을 순서대로 놓아요 (끌어서 바꾸기)' : '↑ 증식 과정을 순서대로 놓아요 (끌어서 자리 바꾸기)', PHONE ? 12.5 : 13.5, '#6b5fa8', 'center', 800);
    }
    parts.update(dt); parts.draw(ctx);
  }
  PT_VIRUS = {
    down(p) {
      const V = S.vir, sub = S.sub.virus;
      if (sub === 'struct') { const cx = PHONE ? 240 : 190, cy = PHONE ? 150 : 212, R = PHONE ? 84 : 104; if (Math.hypot(p.x - cx, p.y - cy) < R * 1.35) { V.drag = { x: p.x, y: p.y, ay: V.ay, ax: V.ax }; V.vay = 0; V.vax = 0; return true; } }
      if (sub === 'host') return V.order.down(p);
      return false;
    },
    move(p) { const V = S.vir; if (V.drag) { V.ay = V.drag.ay + (p.x - V.drag.x) * 0.012; V.ax = clamp(V.drag.ax + (p.y - V.drag.y) * 0.012, -1.2, 1.2); } else if (S.sub.virus === 'host') V.order.move(p); },
    up(p) { const V = S.vir; if (V.drag) { V.drag = null; } else if (S.sub.virus === 'host') V.order.up(p); },
    hover(p) { const V = S.vir; if (S.sub.virus === 'host') return V.order.hover(p); if (S.sub.virus === 'struct') { const cx = PHONE ? 240 : 190, cy = PHONE ? 150 : 212, R = PHONE ? 84 : 104; return Math.hypot(p.x - cx, p.y - cy) < R * 1.35 ? 'grab' : 'default'; } return 'default'; },
  };


  /* ================= ③ 휴머노이드 ================= */
  const ROB_L = [
    { id: 'sensor', label: '카메라·마이크 센서', icon: '📷', sub: '소리와 빛을 받아들여요' },
    { id: 'cpu', label: '프로세서(컴퓨터)', icon: '🖥️', sub: '받은 정보를 처리해요' },
    { id: 'motor', label: '모터와 관절', icon: '⚙️', sub: '움직임을 만들어요' },
    { id: 'battery', label: '배터리', icon: '🔋', sub: '전기 에너지를 공급해요' },
  ];
  const ROB_R = [
    { id: 'muscle', label: '근육', icon: '💪', sub: '움직임을 만들어요', pair: 2 },
    { id: 'sense', label: '감각 기관(눈·귀)', icon: '👁️', sub: '소리와 빛을 받아들여요', pair: 0 },
    { id: 'food', label: '음식의 물질대사', icon: '🍚', sub: '세포호흡으로 에너지를 얻어요', pair: 3 },
    { id: 'nerve', label: '신경계(뇌)', icon: '🧠', sub: '받은 정보를 처리해요', pair: 1 },
  ];
  const PAIR_TXT = [
    '카메라·마이크 ↔ 감각 기관: 바깥의 빛과 소리를 받아들이는 입구예요.',
    '프로세서 ↔ 신경계: 받은 정보를 처리하고 명령을 내려요.',
    '모터와 관절 ↔ 근육: 명령을 받아 움직임을 만들어요.',
    '배터리 ↔ 음식의 물질대사: 로봇은 전지의 전기 에너지를 쓰지만, 사람은 음식을 세포호흡으로 분해해 에너지를 얻어요.',
  ];
  const HUM = 'OOOOOO', ROBOT_ST = 'XXTXXT';
  const CMP_WHY = [
    '로봇은 금속·플라스틱·반도체 부품으로 이루어져 있어요. 세포가 없어요.',
    '배터리 전기로 움직여요. 음식을 분해해 에너지를 얻는 물질대사(효소가 관여하는 화학 반응)는 하지 않아요.',
    '센서로 소리와 빛에 반응해요. 하지만 설계된 장치의 동작일 뿐, 몸속 상태를 스스로 일정하게 유지하는 항상성은 아니에요.',
    '스스로 자라거나 발생하지 못해요. 공장에서 조립돼요.',
    '설계도 파일을 복사해 똑같은 로봇을 만들 수는 있어요. 하지만 스스로 생식하지 못해요. 설계도 복사는 유전이 아니에요.',
    '학습 알고리즘으로 행동이 좋아지는 것이 적응처럼 보여요. 하지만 세포·물질대사가 없고 세대를 거쳐 진화하지도 않아요.',
  ];
  const RL = PHONE ? { x: 8, w: 200, y: 66, h: 70, gap: 22 } : { x: 24, w: 236, y: 100, h: 64, gap: 20 };
  const RR = PHONE ? { x: 272, w: 200, y: 66, h: 70, gap: 22 } : { x: 540, w: 236, y: 100, h: 64, gap: 20 };
  const nodeRect = (side, i) => { const g = side === 'L' ? RL : RR; return { x: g.x, y: g.y + i * (g.h + g.gap), w: g.w, h: g.h }; };
  function makeRobot() {
    S.rob = { links: [-1, -1, -1, -1], bad: [false, false, false, false], drag: null, sel: null, cmpSeen: false, cmpT: 0, lit: [0, 0, 0, 0, 0, 0], row: 0, sig: 0, hover: -1, okAll: false };
  }
  const robOk = () => S.rob.links.every((r, i) => r >= 0 && ROB_R[r].pair === i);
  function setLink(li, ri) {
    const R = S.rob; R.links = R.links.map((r) => (r === ri ? -1 : r)); R.links[li] = ri; R.bad = [false, false, false, false]; R.sel = null; Sound.click();
    if (ROB_R[ri].pair === li) parts.burst(nodeRect('R', ri).x, nodeRect('R', ri).y + RR.h / 2, { count: 8, speed: 80, size: 3, colors: ['#22c55e', '#bbf7d0'], gravity: 0, life: 0.5 });
    rlast = '';
  }
  function drawRobNode(side, i, o) {
    const r = nodeRect(side, i), it = side === 'L' ? ROB_L[i] : ROB_R[i];
    const col = side === 'L' ? '#64748b' : '#16a34a';
    ctx.save();
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = o.bad ? '#fdeceb' : o.sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = o.bad ? '#e2464b' : o.sel ? '#f59e0b' : o.ok ? '#22c55e' : C.shade(col, 0.15); ctx.lineWidth = o.bad || o.sel || o.ok ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
    T(r.x + 26, r.y + r.h / 2 + 9, it.icon, 26, '#000', 'center', 600);
    TF(r.x + 50, r.y + r.h / 2 - 3, it.label, r.w - 62, PHONE ? 13.5 : 14.5, 11.5, '#26324a', 'left', 800);
    TF(r.x + 50, r.y + r.h / 2 + 16, it.sub, r.w - 58, 12, 10.5, '#5a6679', 'left', 700);
    // 연결 점
    const dx = side === 'L' ? r.x + r.w : r.x, dy = r.y + r.h / 2;
    D.sphere(dx, dy, 7, o.ok ? '#22c55e' : o.linked ? '#f59e0b' : '#9ca3af', { gloss: false, outline: '#fff', outlineWidth: 2 });
    ctx.restore();
  }
  function linkPath(li, ri, pxp) {
    const a = nodeRect('L', li), b = nodeRect('R', ri), x0 = a.x + a.w, y0 = a.y + a.h / 2, x1 = pxp ? pxp.x : b.x, y1 = pxp ? pxp.y : b.y + b.h / 2, mx = (x0 + x1) / 2;
    return [x0, y0, mx, y0, mx, y1, x1, y1];
  }
  function bez(c, t) { const u = 1 - t; return [u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6], u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7]]; }
  function stepRobot(dt) {
    const R = S.rob;
    if (S.sub.robot === 'cmp') {
      R.cmpT += dt; R.cmpSeen = true;
      for (let i = 0; i < 6; i++) R.lit[i] = SciSim.approach(R.lit[i], R.cmpT > 0.3 + i * 0.28 ? 1 : 0, dt, 10);
    }
    R.okAll = robOk(); if (R.okAll) R.sig += dt; else R.sig = 0;
  }
  function drawRobot(dt) {
    bgFill('#eef2f7', '#f6f8fb');
    const R = S.rob;
    if (S.sub.robot === 'map') {
      T(RL.x + RL.w / 2, PHONE ? 44 : 78, '🤖 휴머노이드', PHONE ? 15 : 17, '#334155', 'center', 800);
      T(RR.x + RR.w / 2, PHONE ? 44 : 78, '🧑 사람', PHONE ? 15 : 17, '#166534', 'center', 800);
      // 연결선
      R.links.forEach((ri, li) => {
        if (ri < 0) return; const c = linkPath(li, ri), good = ROB_R[ri].pair === li && R.okAll;
        ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = R.bad[li] ? '#e2464b' : good ? '#22c55e' : '#f59e0b'; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]); ctx.stroke(); ctx.restore();
        if (good && !RM) for (let k = 0; k < 3; k++) { const ph = (R.sig * 0.5 + k / 3 + li * 0.11) % 1, p = bez(c, ph); ctx.globalAlpha = Math.sin(Math.PI * ph); D.sphere(p[0], p[1], 5, '#16a34a', { gloss: false }); ctx.globalAlpha = 1; }
      });
      if (R.drag) { const c = linkPath(R.drag.from, 0, { x: R.drag.x, y: R.drag.y }); ctx.save(); ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.strokeStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]); ctx.stroke(); ctx.restore(); }
      ROB_L.forEach((_, i) => drawRobNode('L', i, { sel: R.sel === i || (R.drag && R.drag.from === i), bad: R.bad[i], ok: R.okAll, linked: R.links[i] >= 0 }));
      ROB_R.forEach((_, i) => drawRobNode('R', i, { bad: R.bad.some((b, li) => b && R.links[li] === i), ok: R.okAll, linked: R.links.indexOf(i) >= 0 }));
      // 설명 상자
      const ix = PHONE ? 8 : 24, iy = PHONE ? 440 : 444, iw = PHONE ? 464 : 752, ih = PHONE ? 192 : 104;
      panel(ix, iy, iw, ih, 14);
      const focus = R.sel != null ? R.sel : (R.links.findIndex((r, i) => r >= 0 && ROB_R[r].pair === i && R.okAll) >= 0 ? -1 : -1);
      if (R.okAll) {
        T(ix + 14, iy + 26, '✅ 구조와 기능이 서로 대응해요', PHONE ? 14 : 15, '#166534', 'left', 800);
        textBlock(ix + 14, iy + 52, iw - 28, PAIR_TXT[3] + (PHONE ? '' : ''), PHONE ? 12.5 : 13.5, '#3a465c', PHONE ? 18 : 20, 700);
      } else if (R.sel != null) {
        T(ix + 14, iy + 26, '🔌 ' + ROB_L[R.sel].label + '와 짝이 되는 사람의 부분을 눌러요', PHONE ? 13 : 14.5, '#9a6a07', 'left', 800);
      } else {
        textBlock(ix + 14, iy + 28, iw - 28, '로봇의 부분에서 사람의 짝을 향해 선을 끌어 이어요. (먼저 로봇 부분을 누르고, 사람 부분을 눌러도 돼요)', PHONE ? 13 : 14, '#3a465c', PHONE ? 19 : 21, 700);
      }
    } else {
      // 비교표
      const tx = PHONE ? 8 : 16, tw = PHONE ? 464 : 520, ty = PHONE ? 52 : 92, rh = PHONE ? 38 : 40, rg = PHONE ? 6 : 6;
      T(tx + tw - (PHONE ? 100 : 130), ty - 14, '🧑 사람', PHONE ? 13.5 : 15, '#166534', 'center', 800);
      T(tx + tw - (PHONE ? 38 : 50), ty - 14, '🤖 로봇', PHONE ? 13.5 : 15, '#334155', 'center', 800);
      for (let i = 0; i < 6; i++) {
        const y = ty + i * (rh + rg), sel = R.row === i;
        D.shadow(() => { D.roundRect(tx, y, tw, rh, 12); ctx.fillStyle = sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 8 : 4, y: 2 });
        ctx.strokeStyle = sel ? '#f59e0b' : '#d9e2dd'; ctx.lineWidth = sel ? 3 : 2; D.roundRect(tx, y, tw, rh, 12); ctx.stroke();
        TF(tx + 14, y + rh / 2 + 5, TRAITS[i][0], tw - 200, PHONE ? 14 : 15, 11.5, '#26324a', 'left', 800);
        drawLamp(tx + tw - (PHONE ? 100 : 130), y + rh / 2, 13, HUM[i], R.lit[i]);
        drawLamp(tx + tw - (PHONE ? 38 : 50), y + rh / 2, 13, ROBOT_ST[i], R.lit[i]);
      }
      const px = PHONE ? 8 : 552, py = PHONE ? 342 : 52, pw = PHONE ? 464 : 232, ph = PHONE ? 150 : 322;
      panel(px, py, pw, ph, 16);
      T(px + 14, py + 28, '🔎 ' + TRAITS[R.row][0], 15, '#26324a', 'left', 800);
      D.label(px + 14, py + 56, '로봇: ' + stateText[ROBOT_ST[R.row]], { bg: ROBOT_ST[R.row] === 'T' ? '#d97706' : '#64748b', size: 13, align: 'left' });
      textBlock(px + 14, py + 88, pw - 28, CMP_WHY[R.row], PHONE ? 13 : 13.5, '#3a465c', PHONE ? 19 : 20, 700);
      const sx = PHONE ? 8 : 16, sy = PHONE ? 504 : 384, sw = PHONE ? 464 : 520, sh = PHONE ? 128 : 160;
      panel(sx, sy, sw, sh, 14);
      T(sx + 14, sy + 26, '📝 정리', 15, '#26324a', 'left', 800);
      textBlock(sx + 14, sy + 50, sw - 28, '휴머노이드는 대화하고 움직여서 생물처럼 보여요. 하지만 세포로 이루어져 있지 않고 스스로 물질대사·생장·생식을 하지 못해요. (≈ 는 비슷해 보이는 것뿐이에요.) 줄을 눌러 이유를 읽어 보세요.', PHONE ? 12.5 : 13.5, '#3a465c', PHONE ? 18 : 20, 700);
    }
    parts.update(dt); parts.draw(ctx);
  }
  PT_ROBOT = {
    down(p) {
      const R = S.rob;
      if (S.sub.robot === 'cmp') {
        const tx = PHONE ? 8 : 16, tw = PHONE ? 464 : 520, ty = PHONE ? 52 : 92, rh = PHONE ? 38 : 40, rg = 6;
        for (let i = 0; i < 6; i++) if (inRect(p.x, p.y, { x: tx, y: ty + i * (rh + rg), w: tw, h: rh })) { R.row = i; Sound.tick(); }
        return false;
      }
      for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, nodeRect('L', i))) { R.drag = { from: i, x: p.x, y: p.y, moved: false, sx: p.x, sy: p.y }; return true; }
      for (let j = 0; j < 4; j++) if (inRect(p.x, p.y, nodeRect('R', j)) && R.sel != null) { setLink(R.sel, j); return false; }
      return false;
    },
    move(p) { const d = S.rob.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; },
    up(p) {
      const R = S.rob, d = R.drag; if (!d) return; R.drag = null;
      if (!d.moved) { R.sel = R.sel === d.from ? null : d.from; Sound.tick(); return; }
      for (let j = 0; j < 4; j++) if (inRect(p.x, p.y, nodeRect('R', j))) { setLink(d.from, j); return; }
    },
    hover(p) { if (S.sub.robot === 'cmp') return 'pointer'; for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, nodeRect('L', i))) return 'pointer'; return 'default'; },
  };

  /* ================= ④ 융합 성과 ================= */
  const ACH = [
    { id: 'crispr', label: '유전자 가위 기술', short: '유전자 가위', icon: '✂️', tags: ['chem', 'info'], persp: ['mol'], p1: 'DNA 이상으로 생기는 병', p2: 'DNA를 자르는 효소 + 정보 분석', p3: '유전병 치료 가능성, 윤리 논의' },
    { id: 'afold', label: 'AI 단백질 구조 예측', short: 'AI 단백질', icon: '🧠', tags: ['info'], persp: ['mol'], p1: '단백질 구조를 빨리 알기', p2: '서열로 구조를 계산하는 인공지능', p3: '신약·효소 개발이 빨라짐' },
    { id: 'organ', label: '인공 장기·의수', short: '인공 장기', icon: '🦾', tags: ['eng'], persp: ['body'], p1: '다친 신체 부위의 기능 회복', p2: '생체 재료 + 3D 프린팅·로봇', p3: '이식 대기·장애 불편 감소' },
    { id: 'wear', label: '웨어러블 건강 센서', short: '웨어러블', icon: '⌚', tags: ['elec'], persp: ['body'], p1: '내 몸 상태를 수시로 확인', p2: '심박·체온 센서 + 무선 통신', p3: '건강 관리·조기 발견 (개인 정보 주의)' },
    { id: 'bio', label: '생체 모방 소재', short: '생체 모방', icon: '🪷', tags: ['mat'], persp: ['evol', 'eco'], p1: '가볍고 튼튼한 방수 소재', p2: '생물의 구조를 본뜬 재료 기술', p3: '방수 옷감 등 생활 제품 개선' },
    { id: 'vax', label: '핵산 백신', short: '핵산 백신', icon: '💉', tags: ['chem', 'med'], persp: ['mol', 'body'], p1: '새 병원체에 빠른 백신', p2: '핵산을 설계·전달하는 기술', p3: '백신 개발 기간 단축' },
  ];
  const DISC = [
    { id: 'chem', label: '화학', icon: '⚗️' }, { id: 'info', label: '정보', icon: '💻' }, { id: 'eng', label: '공학', icon: '⚙️' },
    { id: 'elec', label: '전자', icon: '🔌' }, { id: 'mat', label: '재료', icon: '🧱' }, { id: 'med', label: '의학', icon: '🩺' },
  ];
  const PERSP = [['mol', '분자', 'DNA·단백질 같은 분자 수준에서 이해해요'], ['cell', '세포', '세포의 구조와 기능으로 이해해요'], ['body', '몸', '기관·기관계와 몸 전체로 이해해요'], ['eco', '생태', '생물과 환경, 생물 사이의 관계로 이해해요'], ['evol', '진화', '생물이 변하고 다양해진 과정으로 이해해요']];
  const FM = PHONE ? { cx: 240, cy: 152, R: 102, nr: 30, cr: 40, cw: 228, ch: 52 } : { cx: 520, cy: 232, R: 150, nr: 36, cr: 44, cw: 214, ch: 54 };
  const discPos = (i, m) => { const a = (-90 + i * 60) * Math.PI / 180; return { x: m.cx + Math.cos(a) * m.R, y: m.cy + Math.sin(a) * m.R }; };
  const homeOf = (i) => PHONE ? { x: 8 + (i % 2) * 236, y: 318 + Math.floor(i / 2) * 60 } : { x: 16, y: 62 + i * 66 };
  const centroid = (c, m, W, H) => {
    const pts = [{ x: m.cx, y: m.cy }].concat(c.tags.map((t) => discPos(DISC.findIndex((d) => d.id === t), m)));
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length, y = pts.reduce((s, p) => s + p.y, 0) / pts.length; return { x: x - W / 2, y: y - H / 2 };
  };
  const PERM = { p1: [3, 0, 5, 2, 4, 1], p2: [4, 2, 0, 5, 1, 3], p3: [1, 5, 3, 0, 2, 4] };
  function makeFusion() {
    S.fu = {
      sel: null, links: {}, verified: false, bad: {}, posted: false, postT: 0, mates: [], bd: { card: -1, persp: '', p1: -1, p2: -1, p3: -1 },
      cards: ACH.map((a, i) => { const h = homeOf(i); return { id: a.id, idx: i, label: a.label, short: a.short, icon: a.icon, col: '#16a34a', x: h.x, y: h.y, w: FM.cw, h: FM.ch, lift: 0, bad: false, shake: 0, sel: false, sub: '' }; }),
    };
    ACH.forEach((a) => { S.fu.links[a.id] = []; });
    fuSub();
  }
  function fuSub() { S.fu.cards.forEach((c) => { const L = S.fu.links[c.id]; c.sub = '연결: ' + (L.length ? L.map((t) => DISC.find((d) => d.id === t).label).join('·') : '아직 없음'); }); }
  function fuToggle(di) {
    const F = S.fu; if (F.verified || F.sel == null) return; const id = ACH[F.sel].id, t = DISC[di].id, L = F.links[id], k = L.indexOf(t);
    if (k >= 0) L.splice(k, 1); else L.push(t);
    F.bad = {}; F.cards.forEach((c) => { c.bad = false; }); fuSub(); Sound.click(); rlast = ''; syncControls();
  }
  function fuCardOk(i) { const a = ACH[i], L = S.fu.links[a.id]; return L.length === a.tags.length && a.tags.every((t) => L.indexOf(t) >= 0); }
  function fuVerify() {
    const F = S.fu; F.verified = true;
    const cw = PHONE ? 100 : 106, chh = PHONE ? 26 : 30;
    const pos = ACH.map((a) => centroid(a, FM, cw, chh));
    // 칩끼리, 그리고 가운데 '생명과학' 원과 겹치지 않게 밀어내요
    for (let it = 0; it < 80; it++) {
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y, ox = cw + 6 - Math.abs(dx), oy = chh + 6 - Math.abs(dy);
          if (ox > 0 && oy > 0) { if (oy < ox) { const m = (dy >= 0 ? 1 : -1) * oy / 2; pos[i].y -= m; pos[j].y += m; } else { const m = (dx >= 0 ? 1 : -1) * ox / 2; pos[i].x -= m; pos[j].x += m; } }
        }
        const qx = pos[i].x + cw / 2 - FM.cx, qy = pos[i].y + chh / 2 - FM.cy, ex = cw / 2 + FM.cr + 4 - Math.abs(qx), ey = chh / 2 + FM.cr + 4 - Math.abs(qy);
        if (Math.hypot(Math.max(Math.abs(qx) - cw / 2, 0), Math.max(Math.abs(qy) - chh / 2, 0)) < FM.cr + 4 && ex > 0 && ey > 0) {
          if (ey < ex) pos[i].y += (qy >= 0 ? 1 : -1) * ey; else pos[i].x += (qx >= 0 ? 1 : -1) * ex;
        }
      }
    }
    F.cards.forEach((c, i) => {
      const p = pos[i];
      SciSim.tween(c, { x: p.x, y: p.y, w: cw, h: chh }, { duration: 0.7, delay: i * 0.1, ease: 'outBack' });
    });
    Sound.success(); parts.burst(FM.cx, FM.cy, { count: 22, speed: 160, size: 3.4, colors: ['#22c55e', '#fbbf24', '#8b5cf6', '#fff'], life: 0.9 });
  }
  function fuReset() {
    const F = S.fu; F.verified = false; F.sel = null; F.bad = {};
    F.cards.forEach((c, i) => { const h = homeOf(i); c.bad = false; SciSim.tween(c, { x: h.x, y: h.y, w: FM.cw, h: FM.ch }, { duration: 0.4, ease: 'outCubic' }); ACH.forEach((a) => { F.links[a.id] = []; }); });
    fuSub(); rlast = '';
  }
  function stepFusion(dt) {
    const F = S.fu; F.cards.forEach((c) => { c.lift = SciSim.approach(c.lift, 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); });
    if (F.posted) F.postT += dt;
  }
  function drawDiscNode(i, m, count) {
    const p = discPos(i, m), d = DISC[i];
    D.shadow(() => { ctx.beginPath(); ctx.arc(p.x, p.y, m.nr, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = count ? '#8b5cf6' : '#c4b5d9'; ctx.lineWidth = count ? 4 : 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, m.nr, 0, TAU); ctx.stroke();
    T(p.x, p.y + 1, d.icon, m.nr * 0.7, '#000', 'center', 600);
    T(p.x, p.y + m.nr * 0.78, d.label, Math.max(11, m.nr * 0.4), '#4c1d95', 'center', 800, { baseline: 'alphabetic', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    if (count > 1) { D.sphere(p.x + m.nr * 0.75, p.y - m.nr * 0.75, 10, '#f97316', { gloss: false, text: '×' + count, textScale: 0.9 }); }
  }
  function drawFusionMapView(dt) {
    const F = S.fu, m = FM;
    D.glow(m.cx, m.cy, m.R + 60, '#ddd6fe', 0.4);
    // 연결선
    const lineFor = (c, i, x0, y0) => {
      const a = ACH[i], L = F.verified ? a.tags : F.links[a.id];
      L.forEach((t) => {
        const di = DISC.findIndex((d) => d.id === t), p = discPos(di, m);
        ctx.save(); ctx.strokeStyle = F.verified ? C.rgba('#16a34a', 0.7) : C.rgba(F.sel === i ? '#f59e0b' : '#7c3aed', F.sel === i ? 0.95 : 0.55); ctx.lineWidth = F.sel === i && !F.verified ? 4 : 2.5; ctx.lineCap = 'round';
        if (F.bad[a.id]) ctx.strokeStyle = '#e2464b';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
      });
    };
    // 중심과 학문 노드
    DISC.forEach((d, i) => { const p = discPos(i, m); ctx.strokeStyle = 'rgba(139,92,246,.25)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(m.cx, m.cy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); });
    F.cards.forEach((c, i) => { if (F.verified) { lineFor(c, i, c.x + c.w / 2, c.y + c.h / 2); ctx.strokeStyle = C.rgba('#16a34a', 0.7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(c.x + c.w / 2, c.y + c.h / 2); ctx.lineTo(m.cx, m.cy); ctx.stroke(); } else lineFor(c, i, c.x + c.w, c.y + c.h / 2); });
    const counts = DISC.map((d) => ACH.filter((a, i) => (F.verified ? a.tags : F.links[a.id]).indexOf(d.id) >= 0).length);
    DISC.forEach((d, i) => drawDiscNode(i, m, F.verified ? counts[i] : 0));
    D.sphere(m.cx, m.cy, m.cr, '#22c55e', { gloss: true, shadow: true });
    T(m.cx, m.cy - 2, '🧬', m.cr * 0.8, '#000', 'center', 600); T(m.cx, m.cy + m.cr * 0.62, '생명과학', 12.5, '#fff', 'center', 800);
    F.cards.forEach((c) => { c.sel = F.sel === c.idx && !F.verified; drawCard(c); });
    if (!F.verified) T(PHONE ? 8 : 16, PHONE ? 306 : 50, F.sel == null ? '① 카드를 누르고 ② 만나는 학문을 눌러요' : '「' + ACH[F.sel].label + '」에 쓰인 학문을 눌러요', PHONE ? 12.5 : 13.5, '#5a3fa0', 'left', 800);
    else T(PHONE ? 8 : 16, PHONE ? 306 : 50, '✅ 성과는 여러 학문이 만나서 나와요', PHONE ? 12.5 : 13.5, '#166534', 'left', 800);
  }
  /* ---------- 모둠 보드 ---------- */
  function drawBoardView(dt) {
    const F = S.fu, bd = F.bd, cardsShown = [bd.card].concat(F.posted ? F.mates : []);
    const cw = PHONE ? 464 : 252, chh = PHONE ? 96 : 266, gx = PHONE ? 8 : 16;
    const names = ['나', '모둠원 B', '모둠원 C'];
    for (let k = 0; k < 3; k++) {
      const x = PHONE ? gx : gx + k * (cw + 6), y = PHONE ? 6 + k * 102 : 52;
      const ci = k === 0 ? bd.card : (F.posted ? F.mates[k - 1] : -1), a = ci >= 0 ? ACH[ci] : null;
      const appear = k === 0 ? 1 : F.posted ? smooth((F.postT - (k - 1) * 0.35) / 0.5) : 0;
      ctx.save(); ctx.globalAlpha = k === 0 ? 1 : 0.15 + 0.85 * appear; ctx.translate(0, (1 - appear) * 14);
      panel(x, y, cw, chh, 16, k === 0 ? '#fff' : '#fbfdfc');
      ctx.strokeStyle = k === 0 ? (F.posted ? '#22c55e' : '#8b5cf6') : '#cbd5d1'; ctx.lineWidth = 2.5; D.roundRect(x, y, cw, chh, 16); ctx.stroke();
      D.label(x + 12, y + 20, (k === 0 ? '🙋 ' : '👤 ') + names[k] + (k === 0 && F.posted ? ' · 올림 ✅' : ''), { bg: k === 0 ? '#7c3aed' : '#64748b', size: 12.5, align: 'left' });
      if (!a && k > 0) T(x + cw / 2, y + chh / 2 + 6, '내 카드를 올리면 도착해요', 13.5, '#98a2b3', 'center', 800);
      else if (!a) T(x + cw / 2, y + chh / 2 + 6, '위에서 성과를 골라요', 14, '#98a2b3', 'center', 800);
      else {
        const lines = PHONE ? [[x + 12, y + 44], [x + 12, y + 64], [x + 12, y + 84]] : [[x + 14, y + 124], [x + 14, y + 176], [x + 14, y + 228]];
        if (!PHONE) { T(x + cw / 2, y + 66, a.icon, 34, '#000', 'center', 600); TF(x + cw / 2, y + 90, a.label, cw - 24, 16, 12, '#26324a', 'center', 800); }
        const sel = k === 0 ? [bd.p1, bd.p2, bd.p3] : [ci, ci, ci], keys = ['p1', 'p2', 'p3'], heads = ['🎯 해결할 문제', '🛠 쓰인 기술', '🌍 사회에 준 영향'];
        for (let j = 0; j < 3; j++) {
          const txt = sel[j] >= 0 ? ACH[sel[j]][keys[j]] : '고르는 중…', ok = sel[j] === ci;
          const lx = lines[j][0], ly = lines[j][1] + (PHONE ? 0 : 0);
          if (PHONE) {
            TF(lx + 0, ly, heads[j].slice(0, 2) + ' ' + txt, cw - 24, 12.5, 10.5, sel[j] >= 0 ? '#26324a' : '#98a2b3', 'left', 800);
          } else {
            T(lx, ly - 8, heads[j], 12.5, '#7c3aed', 'left', 800);
            textBlock(lx, ly + 12, cw - 28, txt, 13.5, sel[j] >= 0 ? '#26324a' : '#98a2b3', 18, 700);
          }
        }
        if (k === 0 && bd.persp) { const pr = PERSP.find((q) => q[0] === bd.persp); D.label(x + cw - 12, y + 20, '관점: ' + pr[1], { bg: '#0d9488', size: 12.5, align: 'right' }); }
        if (k > 0) { const pr = ACH[ci].persp[0]; D.label(x + cw - 12, y + 20, '관점: ' + PERSP.find((q) => q[0] === pr)[1], { bg: '#0d9488', size: 12.5, align: 'right' }); }
      }
      ctx.restore();
    }
    // 융합 지도
    const mm = PHONE ? { cx: 240, cy: 462, R: 82, nr: 24, cr: 30 } : { cx: 400, cy: 436, R: 84, nr: 23, cr: 28 };
    const shown = F.posted ? [bd.card].concat(F.mates) : [];
    const counts = DISC.map((d) => shown.filter((ci) => ACH[ci].tags.indexOf(d.id) >= 0).length);
    if (!PHONE) T(40, 340, '🗺 모둠 융합 지도', 15, '#26324a', 'left', 800); else T(240, 318, '🗺 모둠 융합 지도', 14, '#26324a', 'center', 800);
    DISC.forEach((d, i) => { const p = discPos(i, mm); ctx.strokeStyle = 'rgba(139,92,246,.22)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(mm.cx, mm.cy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); });
    const cols = ['#16a34a', '#2563eb', '#f97316'];
    shown.forEach((ci, k) => {
      const prog = smooth((F.postT - 0.2 - k * 0.35) / 0.6), a = ACH[ci];
      a.tags.forEach((t) => { const p = discPos(DISC.findIndex((d) => d.id === t), mm); ctx.strokeStyle = C.rgba(cols[k], 0.8 * prog); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(mm.cx, mm.cy); ctx.lineTo(mm.cx + (p.x - mm.cx) * prog, mm.cy + (p.y - mm.cy) * prog); ctx.stroke(); });
    });
    DISC.forEach((d, i) => drawDiscNode(i, mm, counts[i]));
    D.sphere(mm.cx, mm.cy, mm.cr, '#22c55e', { gloss: true, shadow: true }); T(mm.cx, mm.cy + 5, '🧬', mm.cr * 0.9, '#000', 'center', 600);
    if (!F.posted) T(PHONE ? 240 : 40, PHONE ? 600 : 366, '내 카드를 올리면 모둠 융합 지도가 완성돼요', PHONE ? 12.5 : 13.5, '#7b8a80', PHONE ? 'center' : 'left', 800);
    else {
      const sh = DISC.filter((d, i) => counts[i] >= 2).map((d) => d.label);
      textBlock(PHONE ? 20 : 40, PHONE ? 596 : 366, PHONE ? 440 : 230, sh.length ? '두 카드 이상이 함께 쓰는 학문: ' + sh.join(', ') : '서로 다른 학문이 모여 있어요', PHONE ? 12.5 : 13.5, '#3a465c', 18, 800);
      shown.forEach((ci, k) => { D.label(PHONE ? 20 + k * 150 : 560, PHONE ? 626 : 380 + k * 34, ACH[ci].icon + ' ' + ACH[ci].short, { bg: cols[k], size: 12.5, align: 'left' }); });
    }
    parts.update(dt); parts.draw(ctx);
  }
  function drawFusion(dt) {
    bgFill('#f3effb', '#f8f6fd');
    if (S.sub.fusion === 'map') { drawFusionMapView(dt); parts.update(dt); parts.draw(ctx); } else drawBoardView(dt);
  }
  PT_FUSION = {
    down(p) {
      if (S.sub.fusion !== 'map') return false; const F = S.fu;
      if (F.verified) return false;
      for (let i = 0; i < F.cards.length; i++) { const c = F.cards[i]; if (inRect(p.x, p.y, c)) { F.sel = F.sel === i ? null : i; c.lift = 1; Sound.tick(); rlast = ''; return false; } }
      for (let i = 0; i < DISC.length; i++) { const q = discPos(i, FM); if (Math.hypot(p.x - q.x, p.y - q.y) <= FM.nr + 6) { if (F.sel == null) showHint('먼저 왼쪽(아래쪽)의 성과 카드를 눌러요.'); else fuToggle(i); return false; } }
      return false;
    },
    hover(p) { if (S.sub.fusion !== 'map') return 'default'; const F = S.fu; if (F.cards.some((c) => inRect(p.x, p.y, c)) || DISC.some((d, i) => { const q = discPos(i, FM); return Math.hypot(p.x - q.x, p.y - q.y) <= FM.nr + 6; })) return 'pointer'; return 'default'; },
  };


  /* ================= 제어판 · 읽음 칸 ================= */
  let rlast = '';
  const bdSel = {};
  function buildBoardSelects() {
    const fill = (id, opts, ph) => { const s = $(id); s.innerHTML = '<option value="">' + ph + '</option>' + opts.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join(''); return s; };
    bdSel.card = fill('#bdCard', ACH.map((a, i) => [i, a.icon + ' ' + a.label]), '— 성과 고르기 —');
    bdSel.persp = fill('#bdPersp', PERSP.map((p) => [p[0], p[1] + ' — ' + p[2]]), '— 관점 고르기 —');
    ['p1', 'p2', 'p3'].forEach((k) => { bdSel[k] = fill('#bd' + k.toUpperCase(), PERM[k].map((i) => [i, ACH[i][k]]), '— 고르기 —'); });
    Object.keys(bdSel).forEach((k) => bdSel[k].addEventListener('change', () => {
      if (S.fu.posted) { syncControls(); return; }
      const v = bdSel[k].value; S.fu.bd[k] = k === 'persp' ? v : (v === '' ? -1 : +v); bdSel[k].classList.remove('bad'); Sound.click(); rlast = '';
    }));
  }
  function resetBoard() {
    const F = S.fu; F.posted = false; F.postT = 0; F.mates = []; F.bd = { card: -1, persp: '', p1: -1, p2: -1, p3: -1 };
    Object.keys(bdSel).forEach((k) => { bdSel[k].value = ''; bdSel[k].classList.remove('bad'); });
    syncControls();
  }
  function postBoard() {
    const F = S.fu, b = F.bd; if (F.posted) return;
    if (b.card < 0 || !b.persp || b.p1 < 0 || b.p2 < 0 || b.p3 < 0) { showHint('성과, 관점, 문장 세 칸을 모두 골라요.'); Sound.fail(); return; }
    const a = ACH[b.card], errs = [], bad = [];
    if (a.persp.indexOf(b.persp) < 0) { errs.push('관점'); bad.push('persp'); }
    if (b.p1 !== b.card) { errs.push('해결할 문제'); bad.push('p1'); }
    if (b.p2 !== b.card) { errs.push('쓰인 기술'); bad.push('p2'); }
    if (b.p3 !== b.card) { errs.push('사회에 준 영향'); bad.push('p3'); }
    Object.keys(bdSel).forEach((k) => bdSel[k].classList.toggle('bad', bad.indexOf(k) >= 0));
    if (errs.length) { showHint('「' + errs.join('」「') + '」 칸이 「' + a.label + '」 내용과 맞지 않아요. 다시 골라 보세요.', 5000); Sound.fail(); return; }
    F.posted = true; F.postT = 0; F.mates = [3, 5, 0, 2, 1, 4].filter((i) => i !== b.card).slice(0, 2);
    Sound.success(); parts.burst(PHONE ? 240 : 140, PHONE ? 60 : 160, { count: 20, speed: 150, size: 3.2, colors: ['#22c55e', '#8b5cf6', '#fbbf24'], life: 0.9 });
    showHint('모둠원 카드도 도착했어요! 융합 지도가 완성돼요.', 4500); syncControls(); rlast = '';
  }
  function syncControls() {
    if (!S.vir) return;
    const V = S.vir, F = S.fu;
    $$('#virChips button').forEach((b) => { b.classList.toggle('on', V.hl === b.dataset.hl); b.classList.toggle('done', !!V.seen[b.dataset.hl]); });
    $$('#virMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === V.mode));
    $$('#scaleSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.k === V.scale));
    $('#virNote').textContent = V.hl ? VIR_LABEL[V.hl][1] : '이름표를 눌러 바이러스의 각 부분을 확인해요. 모형은 끌어서 돌릴 수 있어요.';
    $('#hostPrev').disabled = V.hs <= 0; $('#hostNext').disabled = V.hs >= 4;
    $('#hostAuto').textContent = V.auto ? '⏸ 멈추기' : '▶ 자동 재생';
    $('#hostNote').textContent = STAGES[clamp(Math.round(V.hs), 0, 4)][0] + ' ' + STAGES[clamp(Math.round(V.hs), 0, 4)][1];
    if (F) {
      $$('#discChips button').forEach((b) => { const i = +b.dataset.d; const on = F.sel != null && F.links[ACH[F.sel].id].indexOf(DISC[i].id) >= 0; b.classList.toggle('on', on); b.disabled = F.sel == null || F.verified; });
      $('#fuNote').textContent = F.verified ? '모든 성과가 알맞은 학문과 연결됐어요!' : F.sel == null ? '① 성과 카드를 눌러 고른 뒤 ② 그 성과에 쓰인 학문을 눌러 연결해요.' : '「' + ACH[F.sel].label + '」에 쓰인 학문을 모두 눌러요. (생명과학은 기본으로 들어 있어요)';
      const lock = F.posted; Object.keys(bdSel).forEach((k) => { bdSel[k].disabled = lock; }); $('#bdPost').disabled = lock; $('#bdPost').textContent = lock ? '✅ 올렸어요' : '📤 모둠 보드에 올리기';
      const pr = F.bd.persp ? PERSP.find((p) => p[0] === F.bd.persp) : null;
      $('#bdNote').textContent = pr ? pr[1] + ' 관점: ' + pr[2] + '.' : '5가지 관점 — 분자·세포·몸·생태·진화 — 중 이 성과가 다루는 수준을 골라요.';
    }
    if (S.rob) $('#robNote').textContent = S.rob.okAll ? '대응이 완성됐어요. 이제 📋 검사판 비교 화면도 열어 보세요.' : '로봇 부분에서 사람의 짝을 향해 선을 끌어 이어요.';
  }
  $$('#virChips button').forEach((b) => b.addEventListener('click', () => {
    const V = S.vir, h = b.dataset.hl; V.hl = V.hl === h ? null : h; if (V.hl) { V.seen[h] = true; V.mode = h === 'nuc' ? 'cut' : V.mode; Sound.click(); parts.burst(PHONE ? 240 : 190, PHONE ? 150 : 212, { count: 8, speed: 90, size: 2.6, colors: ['#a78bfa', '#fbbf24'], gravity: 0, life: 0.5 }); } rlast = ''; syncControls();
  }));
  $$('#virMode button').forEach((b) => b.addEventListener('click', () => { S.vir.mode = b.dataset.m; Sound.click(); syncControls(); }));
  $$('#scaleSeg button').forEach((b) => b.addEventListener('click', () => { S.vir.scale = +b.dataset.k; if (S.vir.scale === 1) S.vir.logSeen = true; Sound.click(); syncControls(); rlast = ''; }));
  $('#hostPrev').addEventListener('click', () => { S.vir.auto = false; setHostStage(Math.round(S.vir.hs) - 1); rlast = ''; });
  $('#hostNext').addEventListener('click', () => { S.vir.auto = false; setHostStage(Math.round(S.vir.hs) + 1); rlast = ''; });
  $('#hostAuto').addEventListener('click', () => { const V = S.vir; V.auto = !V.auto; V.autoT = 0; V.hostSeen = true; if (V.auto && V.hs >= 4) V.hs = 0; Sound.click(); syncControls(); });
  $('#bInspReset').addEventListener('click', () => { Sound.click(); S.sorter.reset(); S.insp.id = null; S.insp.t = 0; S.insp.lit = [0, 0, 0, 0, 0, 0]; S.insp.fired = []; });
  $('#bLinkReset').addEventListener('click', () => { Sound.click(); S.rob.links = [-1, -1, -1, -1]; S.rob.bad = [false, false, false, false]; S.rob.sel = null; rlast = ''; syncControls(); });
  $('#bFuReset').addEventListener('click', () => { Sound.click(); fuReset(); syncControls(); });
  $$('#discChips button').forEach((b) => b.addEventListener('click', () => fuToggle(+b.dataset.d) || syncControls()));
  $('#bdPost').addEventListener('click', postBoard);

  function onEnterView() {
    const mode = S.mode, sub = S.sub[mode];
    PT = { inspect: PT_INSPECT, virus: PT_VIRUS, robot: PT_ROBOT, fusion: PT_FUSION }[mode];
    if (mode === 'virus' && S.vir && sub === 'struct') { S.vir.litT = 0; S.vir.lit = [0, 0, 0, 0, 0, 0]; }
    if (mode === 'virus' && S.vir && sub === 'host') { S.vir.hostLit = [0, 0, 0, 0, 0, 0]; }
    if (mode === 'robot' && S.rob && sub === 'cmp') { S.rob.cmpT = 0; S.rob.lit = [0, 0, 0, 0, 0, 0]; }
    rlast = '';
  }

  function readouts() {
    let a, b, c, L1, L2, L3; const sub = S.sub[S.mode];
    if (S.mode === 'inspect') {
      const sd = S.sorter; L1 = '검사한 카드'; a = Object.keys(S.insp.seen).length + ' / 8'; L2 = '분류한 카드'; b = sd.placed + ' / 8'; L3 = '지금 카드'; c = S.insp.id ? ITEM[S.insp.id].label : '—';
    } else if (S.mode === 'virus') {
      const V = S.vir;
      if (sub === 'struct') { L1 = '확인한 이름표'; a = Object.keys(V.seen).length + ' / 3'; L2 = '보는 방식'; b = V.mode === 'out' ? '겉모습' : '단면'; L3 = '숙주 밖에서'; c = '증식 안 함'; }
      else if (sub === 'size') { L1 = '눈금'; a = V.scale ? '로그' : '선형'; L2 = '크기 비'; b = '1 : 20 : 200'; L3 = '바이러스'; c = '약 100 nm'; }
      else { const k = clamp(Math.round(V.hs), 0, 4); L1 = '증식 단계'; a = STAGES[k][0]; L2 = '숙주 세포'; b = k >= 1 ? '안에서' : '표면에서'; L3 = '증식'; c = k >= 2 ? '일어나요' : '아직 안 해요'; }
    } else if (S.mode === 'robot') {
      const R = S.rob;
      if (sub === 'map') { L1 = '이은 짝'; a = R.links.filter((r) => r >= 0).length + ' / 4'; L2 = '맞는 짝'; b = R.links.filter((r, i) => r >= 0 && ROB_R[r].pair === i).length + ' / 4'; L3 = '에너지'; c = '전기 ↔ 음식'; }
      else { L1 = '고른 특성'; a = TRAITS[R.row][1]; L2 = '사람'; b = stateText[HUM[R.row]]; L3 = '휴머노이드'; c = stateText[ROBOT_ST[R.row]]; }
    } else {
      const F = S.fu;
      if (sub === 'map') { L1 = '고른 성과'; a = F.sel != null ? ACH[F.sel].short : '—'; L2 = '연결한 학문'; b = F.sel != null ? F.links[ACH[F.sel].id].length + '개' : '—'; L3 = '맞게 연결한 성과'; c = ACH.filter((x, i) => fuCardOk(i)).length + ' / 6'; }
      else { L1 = '내 성과'; a = F.bd.card >= 0 ? ACH[F.bd.card].short : '—'; L2 = '관점'; b = F.bd.persp ? PERSP.find((p) => p[0] === F.bd.persp)[1] : '—'; L3 = '모둠 보드'; c = F.posted ? '올렸어요' : '아직'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|'); if (key === rlast) return; rlast = key; syncControls();
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '생물과 비생물: 6칸 검사판', short: '생물과 비생물', icon: '🔬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 움직이고 말하는 로봇과 움직이지 못하는 바이러스, 어느 쪽이 생물일까?</p>' +
        '<div class="si-link">🔗 <b>중학교·통합과학에서</b> 생물을 이루는 기본 단위가 세포이고, 생물은 물질대사로 에너지를 얻는다는 것을 배웠어요.</div>' +
        '<p>생물에는 공통된 특성이 있어요: <b>① 세포로 구성 ② 물질대사 ③ 자극에 반응·항상성 ④ 생장과 발생 ⑤ 생식과 유전 ⑥ 적응과 진화</b>. 카드 8장을 <b>6칸 검사판</b>에 올려 보며 생물과 비생물을 가려 봐요.</p>',
      features: ['inspect'],
      setup() { S.sub.inspect = ''; makeInspect(); setScene('inspect'); },
      recap: '6가지 특성(세포로 구성, 물질대사, 자극 반응·항상성, 생장과 발생, 생식과 유전, 적응과 진화)을 모두 가져야 생물이에요. 겉보기에 비슷해도 하나가 없으면 비생물이에요.',
      summary: '<ul><li><b>생물의 특성 6가지</b>: 세포로 구성 · 물질대사 · 자극에 반응(항상성) · 생장과 발생 · 생식과 유전 · 적응과 진화</li><li>강아지·효모·씨앗·이끼는 6가지를 모두 가져요 → <b>생물</b> (씨앗은 쉬는 중에도 세포로 이루어져 있어요)</li><li>자동차·불꽃·소금 결정·로봇 청소기는 <b>비생물</b>이에요.</li><li><b>커지는 것</b>이 곧 생장은 아니에요. 불꽃은 연료가 타서, 소금 결정은 물질이 쌓여서 커져요.</li></ul>',
      missions: [
        {
          title: '카드 8장 모두 검사하기',
          goal: '아래 카드 <b>8장을 모두 눌러</b> 6칸 검사판의 불이 켜지는 것을 확인하세요.',
          hint: '카드를 한 번 누르면 위쪽 검사판에서 6가지 특성에 하나씩 불이 켜져요. ≈ 표시는 겉보기에만 비슷한 것이에요.',
          setup() { setScene('inspect'); },
          check: () => ITEMS.every((it) => S.insp.seen[it.id]), hold: 0.5,
          status: () => '검사한 카드 ' + Object.keys(S.insp.seen).length + ' / 8 ' + mark(Object.keys(S.insp.seen).length >= 8),
          explain: '<b>생물</b>은 6가지 특성을 모두 가져요. 불꽃과 소금 결정은 커지지만 세포가 없고 유전 정보도 없어서 진짜 생장이 아니에요. 씨앗은 쉬고 있어도 세포로 이루어져 있고, 조건이 맞으면 싹이 터요.',
        },
        {
          title: '생물 / 비생물 분류하기', manual: true,
          goal: '카드 8장을 끌어서 <b>🌱 생물</b> 상자와 <b>⚙️ 비생물</b> 상자에 나누고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '6칸에 모두 불이 켜진 카드만 생물이에요. 카드를 누르면 다시 검사판을 볼 수 있어요.',
          setup() { setScene('inspect'); S.sorter.reset(); },
          check() {
            const sd = S.sorter, miss = sd.cards.filter((c) => !c.zone);
            if (miss.length) return '아직 상자에 넣지 않은 카드가 ' + miss.length + '장 있어요.';
            const wrong = sd.cards.filter((c) => (ITEM[c.id].bio ? 'bio' : 'non') !== c.zone);
            sd.markBad(wrong.map((c) => c.id));
            if (wrong.length) return '빨간 카드는 반대쪽 상자예요: ' + wrong.map((c) => c.label).join(', ') + '. 카드를 눌러 6칸 검사판을 다시 확인해 보세요.';
            return true;
          },
          status: () => '분류한 카드 ' + S.sorter.placed + ' / 8',
          explain: '<b>생물</b>: 강아지, 효모 가루, 씨앗, 이끼. <b>비생물</b>: 자동차, 불꽃, 소금 결정, 로봇 청소기. 비생물은 커지거나 움직이거나 반응하는 것처럼 보여도 6가지 중 하나 이상이 빠져 있어요.',
        },
        {
          type: 'quiz', title: '커지면 생물일까?',
          goal: '소금물에서 소금 결정이 점점 커져요. <b>그래도 소금 결정이 생물이 아닌 까닭</b>은?',
          setup() { setScene('inspect'); inspectItem('salt'); },
          choices: ['크기가 커지는 것만으로는 생장이 아니에요. 물질이 쌓일 뿐 세포·물질대사·유전이 없어요', '결정은 움직이지 못하기 때문이에요', '소금은 물에 녹는 물질이기 때문이에요', '결정은 너무 작아서 눈에 보이지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '움직이지 못한다고 비생물인 것은 아니에요. 씨앗과 이끼도 움직이지 못하지만 생물이에요.', '물에 녹는지는 생물의 특성과 관계가 없어요. 6가지 특성이 있는지 보아요.', '눈에 보이는지는 기준이 아니에요. 아주 작은 세균도 생물이에요.'],
          explain: '생물의 <b>생장</b>은 세포가 물질대사로 몸을 만들며 자라는 것이에요. 소금 결정은 물질이 표면에 붙어서 커질 뿐이라서 세포도, 물질대사도, 유전 정보도 없어요.',
        },
      ],
    },
    {
      title: '바이러스: 생물일까, 비생물일까?', short: '바이러스', icon: '🦠', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 6가지 특성을 모두 가져야 생물이라고 판정했어요. 이번에는 판정이 어려운 <b>바이러스</b>를 입자 모형으로 살펴봐요.</div>' +
        '<p>인플루엔자 바이러스는 <b>표면 단백질</b>, 단백질 껍질인 <b>캡시드</b>, 그 속의 유전물질 <b>핵산</b>으로 이루어져 있어요. 구조와 크기를 보고, <b>숙주 세포 안에서 증식하는 과정</b>을 따라가 보세요.</p>',
      features: ['virus'],
      setup() { makeVirus(); setScene('virus', 'struct'); },
      recap: '바이러스는 세포 구조가 없고 숙주 세포 밖에서는 입자 상태예요. 숙주 세포 안에서만 증식하며(유전, 변이) 생물과 비생물의 특성을 모두 가져요.',
      summary: '<ul><li><b>바이러스 입자</b> = 표면 단백질 + 캡시드(단백질 껍질) + 핵산(유전물질). 세포막·세포질·리보솜이 없어요.</li><li>크기: 바이러스 약 100 nm : 대장균 약 2 µm : 사람 세포 약 20 µm = <b>1 : 20 : 200</b></li><li>증식 5단계: <b>흡착 → 침입 → 복제와 합성 → 조립 → 방출</b> (숙주 세포의 리보솜과 효소를 이용)</li><li>숙주 밖: 물질대사·증식 없음 / 숙주 안: 증식·유전·변이 → <b>생물과 비생물의 특성을 모두 가져요.</b></li></ul>',
      missions: [
        {
          title: '구조와 크기 살펴보기',
          goal: '<b>구조</b> 화면에서 이름표 3개(표면 단백질·캡시드·핵산)를 모두 누르고, <b>크기</b> 화면에서 <b>로그 눈금</b>으로 바꿔 보세요.',
          hint: '오른쪽 도구에서 이름표를 눌러요. 핵산은 단면으로 바뀌어요. 크기 화면은 위의 📏 크기 단추로 열어요.',
          setup() { setScene('virus', 'struct'); },
          check: () => ['spike', 'capsid', 'nuc'].every((k) => S.vir.seen[k]) && S.vir.logSeen, hold: 0.5,
          status: () => ['spike', 'capsid', 'nuc'].map((k) => mark(!!S.vir.seen[k]) + VIR_LABEL[k][0]).join(' &nbsp; ') + ' &nbsp; ' + mark(S.vir.logSeen) + ' 로그 눈금',
          explain: '바이러스는 <b>단백질 껍질(캡시드) 속에 핵산</b>이 들어 있고 바깥에 <b>표면 단백질</b>이 있어요. 크기는 사람 세포의 1/200쯤이라서 선형 눈금에는 거의 보이지 않아 <b>로그 눈금</b>으로 비교해요.',
        },
        {
          title: '증식 5단계 순서 맞추기', manual: true,
          goal: '증식 과정 카드 5장을 <b>일어나는 순서대로</b> 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '🧫 증식 화면의 ◀ ▶ 단추로 과정을 살펴봐요. 붙기 → 들어가기 → 복제와 합성 → 조립 → 나오기 순서예요.',
          setup() { setScene('virus', 'host'); },
          check() {
            const o = S.vir.order; if (o.solved) return true;
            o.markBad(o.wrongIds()); return '빨간 카드는 자리가 달라요. 위 화면의 ◀ ▶ 단추로 증식 과정을 다시 따라가 보세요.';
          },
          status: () => '맞는 자리 ' + (5 - S.vir.order.wrongIds().length) + ' / 5',
          explain: '바이러스는 <b>흡착 → 침입 → (핵산 복제와 단백질 합성) → 조립 → 방출</b> 순서로 증식해요. 복제와 단백질 합성은 <b>숙주 세포의 리보솜과 효소</b>를 이용해요.',
        },
        {
          type: 'quiz', title: '바이러스는 혼자서 증식할까?',
          goal: '<b>바이러스</b>에 대한 설명으로 옳은 것은?',
          setup() { setScene('virus', 'host'); },
          choices: ['숙주 세포 밖에서도 스스로 물질대사를 해서 혼자 증식한다', '숙주 세포 안에서만 증식하고, 밖에서는 입자 상태로 있다', '세포막과 리보솜이 있어서 스스로 단백질을 만든다', '모든 바이러스는 대장균보다 크다'],
          answer: 1,
          feedback: ['바이러스는 효소와 리보솜이 없어요. 숙주 세포 밖에서는 아무 활동도 하지 않아요.', '', '바이러스에는 세포막도 리보솜도 없어서 숙주 세포의 리보솜을 이용해요.', '바이러스(약 100 nm)는 대장균(약 2 µm)보다 훨씬 작아요.'],
          explain: '바이러스는 <b>숙주 세포 안에서만</b> 핵산을 복제하고 단백질을 합성해 증식해요. 밖에서는 입자 상태라서 물질대사도 증식도 하지 않아요. 그래서 생물과 비생물의 특성을 <b>모두</b> 가진다고 해요.',
        },
      ],
    },
    {
      title: '휴머노이드: 로봇과 사람 비교', short: '휴머노이드', icon: '🤖', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바이러스는 숙주 세포 안에서만 생물의 특성 일부를 나타냈어요. 이번에는 사람처럼 말하고 움직이는 <b>휴머노이드</b>를 사람과 비교해요.</div>' +
        '<p>먼저 로봇의 <b>센서 → 프로세서 → 모터</b>와 사람의 <b>감각 기관 → 신경계 → 근육</b>을 짝지어 구조와 기능이 대응하는 것을 확인해요. 그다음 <b>6칸 검사판</b>으로 비교해 보세요.</p>' +
        '<p>💭 <b>생각해 볼 질문</b>: 사람과 똑같이 대화하는 로봇을 ‘살아 있다’고 해야 할까요? 정답은 없어요. 6가지 특성에 비추어 이유를 말해 보세요.</p>',
      features: ['robot'],
      setup() { makeRobot(); setScene('robot', 'map'); },
      recap: '휴머노이드는 사람과 구조·기능이 비슷하게 대응하지만 세포가 없고 스스로 물질대사·생장·생식을 하지 못해요. 학습 알고리즘은 적응처럼 보일 뿐이에요.',
      summary: '<ul><li>대응: <b>센서 ↔ 감각 기관</b>, <b>프로세서 ↔ 신경계</b>, <b>모터 ↔ 근육</b>, <b>배터리(전기) ↔ 음식의 물질대사</b></li><li>휴머노이드는 <b>자극에 반응</b>하는 것처럼 보이고 학습 알고리즘이 <b>적응</b>처럼 보여요(≈).</li><li>하지만 <b>세포가 없고</b>, 스스로 <b>물질대사·생장·생식</b>을 하지 못해요. 설계도 파일을 복사하는 것은 <b>유전이 아니에요.</b></li><li>따라서 6가지 특성을 모두 갖추지 못한 <b>비생물</b>이에요.</li></ul>',
      missions: [
        {
          title: '로봇–사람 대응 모식도 완성', manual: true,
          goal: '로봇의 부분 4개를 사람의 짝과 이어요. 그다음 <b>📋 검사판 비교</b> 화면을 열어 본 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '센서는 바깥 정보를 받아들이고, 프로세서는 정보를 처리하고, 모터는 움직임을 만들어요. 배터리는 에너지 공급이에요.',
          setup() { setScene('robot', 'map'); },
          check() {
            const R = S.rob;
            if (R.links.some((r) => r < 0)) return '아직 짝을 잇지 않은 로봇 부분이 ' + R.links.filter((r) => r < 0).length + '개 있어요.';
            const bad = R.links.map((r, i) => ROB_R[r].pair !== i);
            const newBad = bad.some((b, i) => b && !R.bad[i]); R.bad = bad;
            if (bad.some((b) => b)) { if (newBad) Sound.fail(); return '빨간 선은 짝이 달라요. 각 부분이 하는 일을 떠올려 보세요.'; }
            if (!R.cmpSeen) return '대응은 완성됐어요! 위의 📋 검사판 비교 화면도 열어서 로봇과 사람의 6가지 특성을 비교해 보세요.';
            return true;
          },
          status: () => '맞는 짝 ' + S.rob.links.filter((r, i) => r >= 0 && ROB_R[r].pair === i).length + ' / 4 &nbsp; ' + mark(S.rob.cmpSeen) + ' 검사판 비교 보기',
          explain: '센서는 <b>감각 기관</b>, 프로세서는 <b>신경계(뇌)</b>, 모터는 <b>근육</b>, 배터리는 <b>음식의 물질대사</b>에 대응해요. 구조와 기능은 비슷해도 사람은 <b>세포</b>로 이루어져 몸속에서 물질대사를 하고, 로봇은 부품과 전기로 움직여요.',
        },
        {
          type: 'quiz', title: '대화하고 반응하니 생물일까?',
          goal: '사람처럼 대화하고 반응하는 휴머노이드를 <b>생물로 볼 수 없는 가장 알맞은 까닭</b>은?',
          setup() { setScene('robot', 'cmp'); },
          choices: ['대화와 반응은 설계된 장치의 동작이고, 세포로 이루어져 있지 않으며 스스로 물질대사·생장·생식을 못해서', '사람이 만들었기 때문에 어떤 경우에도 생물이 될 수 없어서', '배터리를 쓰기 때문에', '사람보다 움직임이 느려서'],
          answer: 0,
          feedback: ['', '누가 만들었는지가 기준은 아니에요. 6가지 특성을 갖추었는지가 기준이에요.', '전기를 쓰는 것 하나가 아니라 세포 구조, 물질대사, 생장, 생식 등 특성 전체를 보아야 해요.', '속도는 기준이 아니에요. 아주 느리게 사는 이끼도 생물이에요.'],
          explain: '생물인지는 <b>6가지 특성</b>으로 판단해요. 휴머노이드는 반응과 학습이 비슷해 보여도 <b>세포가 없고</b> 스스로 <b>물질대사·생장·생식</b>을 하지 못해요. 그래서 비생물이에요.',
        },
      ],
    },
    {
      title: '생명과학의 성과: 학문이 만나요', short: '융합 성과', icon: '🧬', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생물과 비생물의 특성을 비교해 보았어요. 마지막으로 <b>생명과학</b>이 다른 학문과 만나 낸 성과를 정리하고 친구와 소통해 봐요.</div>' +
        '<p>생명과학은 생명 현상을 <b>분자 · 세포 · 몸 · 생태 · 진화</b> 다섯 관점으로 연구해요. 현대의 성과는 화학·정보·공학·전자·재료·의학과 <b>결합</b>해서 나와요. 성과 카드 6장을 학문과 연결하고, 모둠 보드에 내 카드를 올려요.</p>',
      features: ['fusion'],
      setup() { makeFusion(); resetBoard(); setScene('fusion', 'map'); },
      recap: '현대 생명과학의 성과는 화학·정보·공학·전자·재료·의학 같은 여러 학문의 성과와 결합되어 나타나요. 협력해서 소통하면 융합 지도가 완성돼요.',
      summary: '<ul><li>생명과학의 5가지 관점: <b>분자 · 세포 · 몸 · 생태 · 진화</b></li><li>유전자 가위: 생명과학 + 화학 + 정보 / AI 단백질 구조 예측: 생명과학 + 정보 / 인공 장기·의수: 생명과학 + 공학 / 웨어러블 센서: 생명과학 + 전자 / 생체 모방 소재: 생명과학 + 재료 / 핵산 백신: 생명과학 + 화학 + 의학</li><li>성과를 소통할 때는 <b>해결할 문제 – 쓰인 기술 – 사회에 준 영향</b>으로 정리해요.</li><li>한 학문만으로는 나오지 않고 <b>여러 학문이 결합</b>해서 나와요.</li></ul>',
      missions: [
        {
          title: '성과 카드 6장과 학문 연결하기', manual: true,
          goal: '카드를 누르고, 그 성과에 쓰인 <b>학문</b>(화학·정보·공학·전자·재료·의학)을 눌러 연결해요. 6장을 모두 연결하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '유전자 가위는 DNA를 자르는 효소(화학)와 서열 분석(정보)이, 핵산 백신은 화학과 의학이 만나요.',
          setup() { setScene('fusion', 'map'); },
          check() {
            const F = S.fu; if (F.verified) return true;
            const miss = ACH.filter((a, i) => F.links[a.id].length === 0);
            if (miss.length) return '아직 연결하지 않은 성과가 ' + miss.length + '개 있어요.';
            const wrong = ACH.filter((a, i) => !fuCardOk(i));
            F.bad = {}; wrong.forEach((a) => { F.bad[a.id] = true; }); F.cards.forEach((c, i) => { const b = !!F.bad[ACH[i].id]; if (b && !c.bad) c.shake = 1; c.bad = b; });
            if (wrong.length) return '빨간 카드는 연결이 달라요: ' + wrong.map((a) => a.short).join(', ') + '. 어떤 기술이 쓰였는지 떠올려 보세요.';
            fuVerify(); return true;
          },
          status: () => '맞게 연결한 성과 ' + ACH.filter((a, i) => fuCardOk(i)).length + ' / 6',
          explain: '유전자 가위(<b>화학 + 정보</b>), AI 단백질 구조 예측(<b>정보</b>), 인공 장기·의수(<b>공학</b>), 웨어러블 건강 센서(<b>전자</b>), 생체 모방 소재(<b>재료</b>), 핵산 백신(<b>화학 + 의학</b>)이에요. 모두 생명과학과 다른 학문이 결합한 성과예요.',
        },
        {
          type: 'quiz', title: '왜 학문이 만나야 할까?',
          goal: '<b>유전자 가위 기술</b>이 한 학문만으로는 나올 수 없는 까닭은?',
          setup() { setScene('fusion', 'map'); },
          choices: ['생명과학이 이미 모든 문제를 혼자 해결할 수 있어서', '생명 현상의 이해에 더해 정밀하게 자르는 효소(화학)와 방대한 서열 분석(정보)이 필요해서', '다른 학문은 생명과학과 관련이 없어서', '기술 이름이 어려워서 여러 사람이 필요해서'],
          answer: 1,
          feedback: ['혼자 해결할 수 있다면 융합이라는 말이 필요 없어요. 현대 성과에는 다른 학문의 기술이 꼭 들어가요.', '', '관련이 없다면 성과가 나올 수 없어요. 화학·정보 등이 생명과학의 도구가 돼요.', '이름이 어려워서가 아니라 필요한 지식과 기술이 서로 달라서예요.'],
          explain: '유전자 가위는 <b>생명 현상의 이해(생명과학)</b>, DNA를 정확히 자르는 <b>효소의 설계(화학)</b>, 방대한 서열을 다루는 <b>분석(정보)</b>이 함께 있어야 해요. 현대 생명과학의 성과는 여러 학문과 결합해서 나와요.',
        },
        {
          title: '모둠 보드에 내 카드 올리기', manual: true,
          goal: '성과 1개와 <b>관점</b>을 고르고, <b>해결할 문제 – 쓰인 기술 – 사회에 준 영향</b> 세 칸을 채워 <b>📤 올리기</b>를 누른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '세 칸은 모두 같은 성과의 이야기여야 해요. 관점은 이 성과가 다루는 수준(분자·세포·몸·생태·진화)을 골라요.',
          setup() { resetBoard(); setScene('fusion', 'board'); },
          check: () => (S.fu.posted ? true : '먼저 오른쪽의 [📤 모둠 보드에 올리기]를 눌러 내 카드를 올려요.'),
          status: () => mark(S.fu.bd.card >= 0) + ' 성과 &nbsp; ' + mark(!!S.fu.bd.persp) + ' 관점 &nbsp; ' + mark(S.fu.bd.p1 >= 0 && S.fu.bd.p2 >= 0 && S.fu.bd.p3 >= 0) + ' 문장 &nbsp; ' + mark(S.fu.posted) + ' 올림',
          explain: '내 카드와 모둠원의 카드를 합치면 <b>융합 지도</b>가 완성돼요. 여러 카드가 같은 학문(예: 정보)을 함께 쓰는 것을 볼 수 있어요. 이렇게 <b>문제 – 기술 – 영향</b>의 순서로 정리하면 성과를 친구와 쉽게 소통할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-life-traits', mount: '#game', badge: '생물 판정관', homeHref: '../../index.html#hb',
    featureLabels: { inspect: '🔬 6칸 검사판 · 카드 분류', virus: '🦠 바이러스 모형 · 크기 비교 · 증식', robot: '🤖 로봇–사람 대응 · 검사판 비교', fusion: '🧬 융합 지도 · 모둠 보드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildBoardSelects();
  makeInspect(); makeVirus(); makeRobot(); makeFusion();
  setScene('inspect');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    if (S.mode === 'inspect') { stepInspect(dt); drawInspect(dt); }
    else if (S.mode === 'virus') { stepVirus(dt); drawVirus(dt); }
    else if (S.mode === 'robot') { stepRobot(dt); drawRobot(dt); }
    else { stepFusion(dt); drawFusion(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, ITEMS, ACH, DISC, ROB_L, ROB_R, STAGES, get game() { return game; }, setScene, inspectItem, nodeRect, discPos, FM, postBoard, fuToggle, setLink, setHostStage, resetBoard, buildBoardSelects,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'inspect') stepInspect(0.02); else if (S.mode === 'virus') stepVirus(0.02); else if (S.mode === 'robot') stepRobot(0.02); else stepFusion(0.02); } },
  };

})();
