(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  /* ===== 공통 도구 (화면 · 글자 · 카드 분류) ===== */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const approach = SciSim.approach;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }
  let clock = 0;

  const BG = '#f1f6f3';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '', sp = -1;
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; sp = -1; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp).trimEnd()); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch.trim() === '' ? '' : ch; }
        sp = line.lastIndexOf(' ');
      } else { line = t; if (ch === ' ') sp = line.length - 1; }
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function callout(x1, y1, x2, y2, text, o) {
    o = o || {};
    D.dashedLine(x1, y1, x2, y2, { color: o.line || '#64748b', width: 1.6, dash: [4, 4] });
    ctx.fillStyle = o.line || '#64748b'; ctx.beginPath(); ctx.arc(x1, y1, 3, 0, TAU); ctx.fill();
    return D.label(x2, y2, text, { bg: o.bg || '#fff', color: o.color || '#1f2d44', border: o.border || '#cbd5e1', size: o.size || 13, align: o.align });
  }
  /* 시간 지연이 있는 효과(리셋 시 지울 수 있게 한 곳에서 관리) */
  const FX = { list: [] };
  FX.add = (e) => { e.age = -(e.delay || 0); FX.list.push(e); };
  FX.clear = () => { FX.list.length = 0; };
  FX.update = (dt) => { for (let i = FX.list.length - 1; i >= 0; i--) { const e = FX.list[i]; e.age += dt; if (e.age >= e.life) { FX.list.splice(i, 1); if (e.done) e.done(); } } };
  FX.draw = () => {
    FX.list.forEach((e) => {
      if (e.age < 0) return;
      const p = e.age / e.life;
      if (e.kind === 'text') {
        T(e.x, e.y - 24 * p, e.text, e.size || 15, e.color || '#16a34a', 'center', 800, { alpha: 1 - p * p, stroke: '#fff', strokeWidth: 4 });
      }
    });
  };

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
      if (c.icon) { E(c.icon, -w / 2 + 24, 1, 22); lx = -w / 2 + 40; maxW = w - 48; }
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
      if (box.slot) return box.slot;
      const cols = box.cols || 2, gap = box.gap || 6, rows = Math.max(1, Math.ceil(n / cols));
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
      if (instant || RM) { c.x = x; c.y = y; c.w = w; c.h = h; SciSim.tween(c, { x, y, w, h }, { duration: 0.0001 }); return; }   // 진행 중인 이동을 끝내요
      SciSim.tween(c, { x, y, w, h }, { duration: 0.35, ease: 'outBack' });
    }
    place(c, zoneId) {
      if (zoneId) { const bx = this.boxes.find((q) => q.id === zoneId); if (bx && bx.single) this.cards.forEach((o) => { if (o !== c && o.zone === zoneId) { o.zone = null; o.bad = false; } }); }
      const was = c.zone; c.zone = zoneId || null; c.bad = false; if (zoneId) c.seq = ++this.seq; c.lift = 0;
      this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.selected = null; this.layout(true); this.o.onChange && this.o.onChange(); }
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
      this.cards.forEach((c) => { c.lift = approach(c.lift, this.drag && this.drag.c === c && this.drag.moved ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); });
    }
    drawBoxes() {
      this.boxes.forEach((b) => {
        const hot = this.hot === b;
        D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(b.col, hot ? 0.28 : 0.13); ctx.fill();
        ctx.setLineDash([7, 5]); ctx.strokeStyle = C.rgba(b.col, hot ? 1 : 0.7); ctx.lineWidth = hot ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
        if (b.label) TF(b.x + b.w / 2, b.y + 19, b.label, b.w - 16, 14.5, 12, C.shade(b.col, -0.35), 'center', 800);
        if (b.draw) b.draw(b);
      });
    }
    drawCards() { this.cards.forEach((c) => { c.sel = !!(this.o.isSel && this.o.isSel(c)); drawCard(c); }); }
    draw() { this.drawBoxes(); this.drawCards(); }
  }

  /* 읽음 칸 (캔버스 아래 3칸) */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setReads(a) {
    const k = a.join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = a[0]; v1.textContent = a[1]; l2.textContent = a[2]; v2.textContent = a[3]; l3.textContent = a[4]; v3.textContent = a[5];
  }
  /* 수 입력칸: 숫자만 읽어요 */
  function numOf(id) { const e = $('#' + id); if (!e) return NaN; const s = String(e.value).replace(/[^0-9.\-]/g, ''); return s === '' ? NaN : parseFloat(s); }
  /* 모드 버튼 (현재 단계의 것만 보여 줘요) */
  function modeButtons(cur, lvNow, free, setModeFn) {
    $$('#modeSeg button').forEach((b) => {
      const lv = +b.dataset.lv;
      b.classList.toggle('on', b.dataset.mode === cur);
      b.classList.toggle('lv-off', !free && lv !== lvNow);
    });
  }
  function bindModeSeg(setModeFn) {
    $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); }));
  }
  /* 칩 버튼 묶음: root 안의 button[data-v] 중 하나를 on */
  function chipSet(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }


  /* ---------- 분수·퍼센트 입력 읽기: '1/4', '0.25', '25%', '4분의 1' ---------- */
  function parseFrac(s) {
    s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/,/g, '');
    if (!s) return NaN;
    let m = /^(\d+(?:\.\d+)?)분의(\d+(?:\.\d+)?)$/.exec(s);
    if (m) return +m[2] / +m[1];
    m = /^(\d+(?:\.\d+)?)[\/:](\d+(?:\.\d+)?)$/.exec(s);
    if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    m = /^(\d+(?:\.\d+)?)%$/.exec(s);
    if (m) return +m[1] / 100;
    m = /^(\d*\.?\d+)$/.exec(s);
    if (m) return +m[1];
    return NaN;
  }
  const fracIs = (s, target, tol) => { const v = parseFrac(s); return isFinite(v) && Math.abs(v - target) <= (tol == null ? 1e-3 : tol); };
  /* 모드 버튼: 현재 단계의 것만 보여 줘요 (data-lv) */
  function bindModes(setModeFn) { $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); })); }
  /* 간단한 막대 그리기 도우미: 값은 0~max 범위로 묶어요 */
  function barRect(x, base, w, v, max, hPx) { const hh = clamp(v / max, 0, 1) * hPx; return { x, y: base - hh, w, h: hh }; }
  function fmtN(n, d) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  const pct = (a, b, d) => (b > 0 ? fmtN(a / b * 100, d == null ? 0 : d) + ' %' : '—');
  function dot(x, y, r, col, o) { D.sphere(x, y, r, col, o || {}); }
  /* 염색체(막대 하나): 가운데가 잘록한 알약 모양 */
  function chromo(x, y, w, h, col, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, C.shade(col, 0.25)); g.addColorStop(0.5, col); g.addColorStop(1, C.shade(col, -0.2));
    ctx.fillStyle = g; D.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w / 2, 10)); ctx.fill();
    ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  /* 카드를 누르면 선택, 상자를 누르면 놓기 (끌기가 어려운 기기를 위해) */
  function selectable(opts) {
    let so = null;
    opts.onTap = (c) => { so.selected = so.selected === c ? null : c; Sound.click(); if (opts.afterTap) opts.afterTap(c); };
    opts.isSel = (c) => !!so && so.selected === c;
    so = new Sorter(opts); so.selected = null;
    return so;
  }
  function sorterPT(get) {
    return {
      down(p) {
        const so = get();
        if (so.selected && !so.cards.some((c) => inRect(p.x, p.y, c))) {
          const b = so.boxAt(p), c = so.selected; so.selected = null;
          so.place(c, b ? b.id : null); return false;
        }
        return so.down(p);
      },
      move: (p) => get().move(p), up: (p) => get().up(p), hover: (p) => get().hover(p),
    };
  }



  /* =========================================================
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 세포 분화와 유전자 발현 (단원 60, 5차시)
     성취기준 [12유전02-04] 생물의 발생 과정에서 세포 분화가 유전자 발현 조절 과정을 통해 일어남을 추론할 수 있다.
     ① 관찰: 같은 유전자  ② 분석: 선택 발현  ③ 모형: 핵의 능력  ④ 탐구: 분화 유도
     (검출표와 수치는 가상 자료 / 교육용 예시예요)
     ========================================================= */
  const S = { mode: 'cells', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);
  const col = (c, a) => C.rgba(c, a);

  const CELLS = [
    { id: 'rbc', n: '적혈구 전구세포', ab: '적', fn: '산소를 나르는 글로빈을 만들어요', col: '#dc2626' },
    { id: 'beta', n: '이자 β세포', ab: 'β', fn: '혈당을 낮추는 인슐린을 만들어요', col: '#2563eb' },
    { id: 'lens', n: '수정체 세포', ab: '수', fn: '투명한 크리스탈린을 가득 채워요', col: '#0891b2' },
  ];
  const GENES = [
    { id: 'glo', n: '글로빈', col: '#ef4444', specific: true },
    { id: 'ins', n: '인슐린', col: '#3b82f6', specific: true },
    { id: 'cry', n: '크리스탈린', col: '#f59e0b', specific: true },
    { id: 'resp', n: '세포호흡 효소', col: '#10b981', specific: false },
    { id: 'ribo', n: '리보솜 단백질', col: '#8b5cf6', specific: false },
  ];
  /* 가상 mRNA 검출표: 행 = 세포, 열 = 유전자 (1 있음 / 0 없음) */
  const PRES = [[1, 0, 0, 1, 1], [0, 1, 0, 1, 1], [0, 0, 1, 1, 1]];

  /* ---------- 세포 그림 ---------- */
  function drawCellShape(id, cx, cy, r, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(cx, cy);
    const c = CELLS.find((q) => q.id === id).col;
    const bob = RM ? 0 : Math.sin(t * 1.4 + cx) * 1.2;
    ctx.translate(0, bob);
    D.shadow(() => {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.25);
      g.addColorStop(0, C.shade(c, 0.78)); g.addColorStop(0.7, C.shade(c, 0.5)); g.addColorStop(1, C.shade(c, 0.2));
      ctx.fillStyle = g;
      if (id === 'rbc') { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); }
      else if (id === 'beta') { rr(-r * 1.02, -r * 0.98, r * 2.04, r * 1.96, r * 0.62); }
      else { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.38, r * 0.82, 0, 0, TAU); }
      ctx.fill(); ctx.strokeStyle = C.shade(c, -0.2); ctx.lineWidth = 2.2; ctx.stroke();
    }, { blur: 8, y: 3 });
    // 세포 속 특징: 글로빈 알갱이 / 인슐린 분비 알갱이 / 투명한 섬유
    if (id === 'rbc') {
      for (let i = 0; i < 9; i++) { const a = i * 2.4, rad = r * (0.62 + 0.12 * ((i * 7) % 3)); D.sphere(Math.cos(a) * rad, Math.sin(a) * rad, 3.2, '#b91c1c', { gloss: false }); }
    } else if (id === 'beta') {
      for (let i = 0; i < 9; i++) { const a = i * 2.2 + 0.4, rad = r * (0.6 + 0.12 * ((i * 5) % 3)); D.sphere(Math.cos(a) * rad, Math.sin(a) * rad, 3.6, '#1d4ed8', { gloss: false }); }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 1.2, i * r * 0.2); ctx.quadraticCurveTo(0, i * r * 0.2 + (i % 2 ? 3 : -3), r * 1.2, i * r * 0.2); ctx.stroke(); }
    }
    // 핵
    const nr = r * 0.4;
    D.sphere(0, 0, nr, '#fde68a', { outline: '#a16207', outlineWidth: 1.6, light: '#fffbeb', dark: '#f5c84b' });
    // 핵 속 DNA 위의 유전자 3개
    for (let j = 0; j < 3; j++) {
      const gx = (j - 1) * nr * 0.56, gy = (j === 1 ? 0.18 : -0.1) * nr;
      ctx.fillStyle = GENES[j].col; rr(gx - 3.6, gy - 3.6, 7.2, 7.2, 2); ctx.fill();
      if (o.hot === j) { D.ring(gx, gy, 9, t, { color: GENES[j].col, width: 2 }); }
    }
    ctx.restore();
  }

  /* =========================================================
     ① 같은 유전자: DNA 검사 9칸
     ========================================================= */
  const CG = PHONE
    ? { rowY0: 60, rowH: 190, cellX: 64, bx0: 128, bw: 108, gap: 6, bh: 128, hdrY: 22 }
    : { rowY0: 66, rowH: 158, cellX: 102, bx0: 262, bw: 170, gap: 8, bh: 124, hdrY: 34 };
  S.dna = { st: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], p: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], age: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], hot: [-1, -1, -1] };
  const cBox = (ci, gj) => ({ x: CG.bx0 + gj * (CG.bw + CG.gap), y: CG.rowY0 + ci * CG.rowH + (CG.rowH - CG.bh) / 2, w: CG.bw, h: CG.bh });
  const cCell = (ci) => ({ x: CG.cellX, y: CG.rowY0 + ci * CG.rowH + (PHONE ? 66 : 52), r: PHONE ? 34 : 40 });
  const dnaDone = () => { let n = 0; S.dna.st.forEach((r) => r.forEach((v) => { if (v === 2) n++; })); return n; };
  function dnaStart(ci, gj, delay) {
    const d = S.dna; if (d.st[ci][gj] !== 0) return;
    d.st[ci][gj] = 1; d.p[ci][gj] = -(delay || 0); Sound.tick();
  }
  function dnaAll() {
    let k = 0;
    for (let ci = 0; ci < 3; ci++) for (let gj = 0; gj < 3; gj++) if (S.dna.st[ci][gj] === 0) { dnaStart(ci, gj, k * 0.18); k++; }
    updateCtl();
  }
  function dnaReset() {
    S.dna = { st: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], p: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], age: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], hot: [-1, -1, -1] };
    updateCtl();
  }
  function dnaUpdate(dt) {
    const d = S.dna;
    for (let ci = 0; ci < 3; ci++) {
      d.hot[ci] = -1;
      for (let gj = 0; gj < 3; gj++) {
        if (d.st[ci][gj] === 2) { d.age[ci][gj] += dt; continue; }
        if (d.st[ci][gj] !== 1) continue;
        d.p[ci][gj] += dt / 1.1;
        if (d.p[ci][gj] > 0) d.hot[ci] = gj;
        if (d.p[ci][gj] >= 1) {
          d.p[ci][gj] = 1; d.st[ci][gj] = 2;
          const b = cBox(ci, gj); parts.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 10, speed: 120, colors: [GENES[gj].col, '#22c55e', '#fde68a'] });
          Sound.success(); updateCtl();
        }
      }
    }
  }
  function dnaDraw(dt, t) {
    dnaUpdate(dt);
    const d = S.dna, all = dnaDone() === 9;
    panel(8, 8, VW - 16, VH - 16, 16, '#fff');
    TF(PHONE ? 20 : 26, CG.hdrY, all ? '9칸 모두 ○ : DNA에는 세 유전자가 다 있어요' : 'DNA 검사 결과  (○ = 그 유전자가 DNA에 있음)', VW - 40, L(18, 14.5), 11, all ? '#15803d' : '#14532d', 'left', 800);
    for (let gj = 0; gj < 3; gj++) {
      const b = cBox(0, gj), x = b.x + b.w / 2;
      ctx.fillStyle = GENES[gj].col; rr(x - b.w / 2 + 4, CG.rowY0 - L(22, 20), b.w - 8, 5, 3); ctx.fill();
      TF(x, CG.rowY0 - L(2, 0), GENES[gj].n + ' 유전자', b.w - 6, L(15, 12.5), 10.5, '#26324a', 'center', 800);
    }
    for (let ci = 0; ci < 3; ci++) {
      const c = cCell(ci), rowTop = CG.rowY0 + ci * CG.rowH;
      if (ci > 0) { ctx.strokeStyle = '#e8edf3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(18, rowTop); ctx.lineTo(VW - 18, rowTop); ctx.stroke(); }
      drawCellShape(CELLS[ci].id, c.x, c.y, c.r, t, { hot: d.hot[ci] });
      TF(c.x, c.y + c.r + L(24, 22), CELLS[ci].n, PHONE ? 118 : 224, L(16, 12.5), 10.5, CELLS[ci].col, 'center', 800);
      if (!PHONE) { const ls = wrap(CELLS[ci].fn, 160, 12.5, 700); ls.forEach((l, k) => T(c.x, c.y + c.r + 42 + k * 15, l, 12.5, '#64748b', 'center', 700)); }
      for (let gj = 0; gj < 3; gj++) {
        const b = cBox(ci, gj), st = d.st[ci][gj], p = clamp(d.p[ci][gj], 0, 1), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        D.roundRect(b.x, b.y, b.w, b.h, 14);
        ctx.fillStyle = st === 2 ? '#ecfdf3' : st === 1 ? col(GENES[gj].col, 0.1) : '#f8fafc'; ctx.fill();
        ctx.strokeStyle = st === 2 ? '#22c55e' : col(GENES[gj].col, st === 1 ? 0.95 : 0.55); ctx.lineWidth = st === 1 ? 2.8 : 2;
        if (st === 0) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
        if (st === 0) {
          T(cx, cy - 2, '🔍', L(26, 22), '#94a3b8', 'center', 700);
          T(cx, cy + 24, '눌러서 검사', L(13.5, 12), '#94a3b8', 'center', 800);
        } else if (st === 1) {
          // 탐침 훑기: 위아래로 훑는 빛
          const sy = b.y + 10 + (b.h - 20) * (0.5 + 0.5 * Math.sin(p * Math.PI * 4));
          ctx.save(); D.roundRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8, 11); ctx.clip();
          ctx.fillStyle = col(GENES[gj].col, 0.22); ctx.fillRect(b.x, sy - 10, b.w, 20);
          ctx.restore();
          for (let k = 0; k < 6; k++) { const wx = b.x + 16 + (b.w - 32) * k / 5, wy = cy + Math.sin(k * 1.4 + t * 6) * 8; D.sphere(wx, wy, 3.2, k % 3 === 0 ? GENES[gj].col : '#94a3b8', { gloss: false }); }
          T(cx, cy + 30, p > 0 ? '검사 중 ' + Math.round(p * 100) + ' %' : '대기', L(14, 12.5), GENES[gj].col, 'center', 800);
          ctx.fillStyle = '#e2e8f0'; rr(b.x + 14, b.y + b.h - 18, b.w - 28, 6, 3); ctx.fill();
          ctx.fillStyle = GENES[gj].col; if (p > 0.01) { rr(b.x + 14, b.y + b.h - 18, (b.w - 28) * p, 6, 3); ctx.fill(); }
        } else {
          const pop = RM ? 1 : ease.outBack(clamp(d.age[ci][gj] / 0.4, 0, 1));
          D.check(cx, cy - 8, L(24, 20) * pop, clamp(d.age[ci][gj] / 0.35, 0, 1));
          T(cx, cy + L(36, 32), '있음', L(15, 13), '#15803d', 'center', 800);
        }
        if (st === 1 && p > 0) {
          const cc = cCell(ci), nr = cc.r * 0.4, gx = cc.x + (gj - 1) * nr * 0.56;
          D.dashedLine(gx, cc.y, b.x + 6, b.y + b.h / 2, { color: col(GENES[gj].col, 0.8), width: 1.8, dash: [4, 4], offset: t * 40 });
        }
      }
    }
  }

  /* =========================================================
     ② 선택 발현: mRNA 검출(전기영동) 표 + 유전자 분류
     ========================================================= */
  const GL = PHONE
    ? { gx0: 36, gw: 82, gap: 4, gy: 56, gh: 170, panel: { x: 8, y: 8, w: 464, h: 268 }, ty0: 296, hh: 26, rh: 72, lane: 20, lgap: 6 }
    : { gx0: 134, gw: 118, gap: 8, gy: 68, gh: 148, panel: { x: 14, y: 14, w: 772, h: 252 }, ty0: 282, hh: 28, rh: 66, lane: 28, lgap: 8 };
  const BAND_Y = [0.34, 0.5, 0.42, 0.62, 0.26];    // 겔 안에서 밴드가 멈추는 높이(유전자마다 mRNA 크기가 달라요)
  S.gel = { ran: [0, 0, 0, 0, 0], p: [0, 0, 0, 0, 0], mark: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], bad: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], shake: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], okAll: false };
  const gelX = (j) => GL.gx0 + j * (GL.gw + GL.gap);
  const gelRanN = () => S.gel.ran.filter((v) => v).length;
  function gelRun(j) { if (S.gel.ran[j]) return; S.gel.ran[j] = 1; S.gel.p[j] = 0; Sound.tick(); updateCtl(); }
  function gelRunAll() { for (let j = 0; j < 5; j++) if (!S.gel.ran[j]) { const jj = j; gelTimers.push(setTimeout(() => { if (game) gelRun(jj); }, j * 220)); } }
  const gelTimers = [];
  function gelReset() {
    S.gel = { ran: [0, 0, 0, 0, 0], p: [0, 0, 0, 0, 0], mark: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], bad: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], shake: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], okAll: false };
    gelTimers.forEach(clearTimeout); gelTimers.length = 0;
    updateCtl();
  }
  const gelFilled = () => S.gel.mark.reduce((a, r) => a + r.filter((v) => v).length, 0);
  function gelCheck() {
    const g = S.gel; let wrongN = 0, emptyN = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) {
      const m = g.mark[i][j], want = PRES[i][j] ? 1 : 2;
      if (!m) { emptyN++; continue; }
      const bad = m !== want ? 1 : 0;
      if (bad && !g.bad[i][j]) g.shake[i][j] = 1;
      g.bad[i][j] = bad; if (bad) wrongN++;
    }
    return { wrongN, emptyN };
  }
  function gelTap(i, j) {
    const g = S.gel;
    if (!g.ran[j]) { showHint('먼저 이 유전자의 겔을 눌러 mRNA를 검출해요.', 2600); return; }
    if (g.p[j] < 1) return;
    g.mark[i][j] = (g.mark[i][j] + 1) % 3; g.bad[i][j] = 0; Sound.click(); updateCtl();
  }
  function gelBandsDraw(j, x, t) {
    const gw = GL.gw, laneTotal = 3 * GL.lane + 2 * GL.lgap, lx0 = x + (gw - laneTotal) / 2;
    const p = S.gel.p[j], ran = S.gel.ran[j];
    ctx.save();
    D.roundRect(x, GL.gy, gw, GL.gh, 10);
    const gr = ctx.createLinearGradient(0, GL.gy, 0, GL.gy + GL.gh); gr.addColorStop(0, '#273449'); gr.addColorStop(1, '#0f172a');
    ctx.fillStyle = gr; ctx.fill(); ctx.clip();
    for (let k = 0; k < 3; k++) {
      const lx = lx0 + k * (GL.lane + GL.lgap);
      ctx.fillStyle = '#0b1220'; rr(lx, GL.gy + 6, GL.lane, 9, 3); ctx.fill();            // 홈(우물)
      ctx.fillStyle = 'rgba(148,163,184,.10)'; ctx.fillRect(lx, GL.gy + 16, GL.lane, GL.gh - 22);   // 레인
      if (ran && PRES[k][j]) {
        const e = ease.outCubic(clamp(p, 0, 1));
        const by = GL.gy + 11 + (GL.gh * BAND_Y[j] - 4) * e;
        const gl = ctx.createLinearGradient(0, by - 8, 0, by + 8); gl.addColorStop(0, 'rgba(250,204,21,0)'); gl.addColorStop(0.5, 'rgba(253,230,138,' + (0.35 + 0.65 * clamp(p * 1.4, 0, 1)) + ')'); gl.addColorStop(1, 'rgba(250,204,21,0)');
        ctx.fillStyle = gl; ctx.fillRect(lx - 2, by - 9, GL.lane + 4, 18);
        ctx.fillStyle = 'rgba(255,251,235,' + (0.55 + 0.45 * clamp(p * 1.4, 0, 1)) + ')'; rr(lx + 1, by - 3, GL.lane - 2, 6, 3); ctx.fill();
      }
    }
    if (ran && p < 1 && !RM) {   // 전기가 흐르는 동안 위에서 아래로 흐르는 점
      for (let k = 0; k < 6; k++) { const yy = GL.gy + 18 + ((t * 80 + k * 28) % (GL.gh - 24)); ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.fillRect(x + 6, yy, gw - 12, 1.5); }
    }
    ctx.restore();
    ctx.strokeStyle = ran ? '#475569' : '#94a3b8'; ctx.lineWidth = 2; if (!ran) ctx.setLineDash([6, 5]); D.roundRect(x, GL.gy, gw, GL.gh, 10); ctx.stroke(); ctx.setLineDash([]);
    if (!ran) {
      ctx.fillStyle = 'rgba(241,245,249,.82)'; D.roundRect(x + 4, GL.gy + GL.gh / 2 - 26, gw - 8, 52, 10); ctx.fill();
      T(x + gw / 2, GL.gy + GL.gh / 2 - 3, '🧪 눌러서', L(14, 12.5), '#475569', 'center', 800);
      T(x + gw / 2, GL.gy + GL.gh / 2 + 15, '검출하기', L(14, 12.5), '#475569', 'center', 800);
    }
    for (let k = 0; k < 3; k++) {
      const lx = lx0 + k * (GL.lane + GL.lgap) + GL.lane / 2;
      T(lx, GL.gy + GL.gh + L(21, 17), CELLS[k].ab, L(15, 13), CELLS[k].col, 'center', 800);
    }
  }
  function gelDraw(dt, t) {
    const g = S.gel;
    for (let j = 0; j < 5; j++) if (g.ran[j] && g.p[j] < 1) g.p[j] = Math.min(1, g.p[j] + dt / 1.5);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) g.shake[i][j] = Math.max(0, g.shake[i][j] - dt * 3);
    const pn = GL.panel;
    panel(pn.x, pn.y, pn.w, pn.h, 16, '#fff');
    TF(pn.x + 16, pn.y + 24, PHONE ? 'mRNA 검출 (겔 전기영동)' : 'mRNA 검출 (겔 전기영동) : 밴드가 보이면 그 세포에 mRNA가 있어요', pn.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    for (let j = 0; j < 5; j++) {
      const x = gelX(j);
      TF(x + GL.gw / 2, GL.gy - 7, GENES[j].n, GL.gw - 2, L(14.5, 12), 10, GENES[j].col, 'center', 800, { stroke: '#fff', strokeWidth: 3 });
      gelBandsDraw(j, x, t);
    }
    // 레인 설명
    if (!PHONE) {
      T(pn.x + 14, GL.gy + 8, '레인(줄) 번호', 13, '#64748b', 'left', 800);
      CELLS.forEach((c, k) => { const yy = GL.gy + 44 + k * 40; D.sphere(pn.x + 24, yy - 4, 10, c.col, { gloss: false, text: c.ab, textScale: 1.0 }); TF(pn.x + 40, yy, c.n.replace('적혈구 전구세포', '적혈구 전구'), 84, 13, 10, '#26324a', 'left', 800); });
    } else {
      TF(pn.x + pn.w / 2, pn.y + pn.h - 12, '적 = 적혈구 전구세포 · β = 이자 β세포 · 수 = 수정체 세포', pn.w - 20, 12.5, 10.5, '#64748b', 'center', 700);
    }
    // 결과 표
    const tp = { x: pn.x, y: GL.ty0 - L(12, 6), w: pn.w, h: VH - (GL.ty0 - L(12, 6)) - L(14, 8) };
    panel(tp.x, tp.y, tp.w, tp.h, 16, '#fff');
    T(tp.x + 14, GL.ty0 + L(18, 16), PHONE ? '표 ' : '결과 표', L(15, 13), '#14532d', 'left', 800);
    for (let j = 0; j < 5; j++) { const x = gelX(j); TF(x + GL.gw / 2, GL.ty0 + GL.hh - 8, GENES[j].n, GL.gw - 2, L(13.5, 11.5), 9.5, '#475569', 'center', 800); }
    for (let i = 0; i < 3; i++) {
      const ry = GL.ty0 + GL.hh + i * GL.rh;
      D.sphere(tp.x + L(26, 22), ry + GL.rh / 2 - 2, 7, CELLS[i].col, { gloss: false });
      if (!PHONE) TF(tp.x + 40, ry + GL.rh / 2 + 4, CELLS[i].n.replace('적혈구 전구세포', '적혈구 전구'), 84, 13, 10.5, '#26324a', 'left', 800);
      else T(tp.x + 22, ry + GL.rh / 2 + 24, CELLS[i].ab, 13, CELLS[i].col, 'center', 800);
      for (let j = 0; j < 5; j++) {
        const x = gelX(j), m = g.mark[i][j], bad = g.bad[i][j], sh = g.shake[i][j] > 0 && !RM ? Math.sin(clock * 60) * 3 * g.shake[i][j] : 0;
        const bx = x + sh, by = ry + 4, bw = GL.gw, bh = GL.rh - 8;
        D.roundRect(bx, by, bw, bh, 10);
        ctx.fillStyle = bad ? '#fdeceb' : m === 1 ? '#ecfdf3' : m === 2 ? '#f1f5f9' : '#fff'; ctx.fill();
        ctx.strokeStyle = bad ? '#e2464b' : m === 1 ? '#22c55e' : '#cbd5e1'; ctx.lineWidth = bad ? 3 : 2; if (!m) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
        const cx = bx + bw / 2, cy = by + bh / 2;
        if (m === 0) T(cx, cy + 7, g.ran[j] ? '?' : '–', 22, '#94a3b8', 'center', 800);
        else if (m === 1) { ctx.strokeStyle = bad ? '#e2464b' : '#16a34a'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(cx, cy, Math.min(13, bh * 0.28), 0, TAU); ctx.stroke(); }
        else { ctx.strokeStyle = bad ? '#e2464b' : '#64748b'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; const q = Math.min(11, bh * 0.24); ctx.beginPath(); ctx.moveTo(cx - q, cy - q); ctx.lineTo(cx + q, cy + q); ctx.moveTo(cx + q, cy - q); ctx.lineTo(cx - q, cy + q); ctx.stroke(); ctx.lineCap = 'butt'; }
      }
    }
    const yb = GL.ty0 + GL.hh + 3 * GL.rh + L(18, 22);
    if (g.okAll) {
      textBlock(tp.x + 16, yb, tp.w - 32, '인슐린 mRNA는 이자 β세포에만, 글로빈 mRNA는 적혈구 전구세포에만 있어요. 세포호흡 효소와 리보솜 단백질 mRNA는 세 세포 모두에 있어요.', L(14, 12.5), '#15803d', L(18, 16), 800);
    } else {
      textBlock(tp.x + 16, yb, tp.w - 32, '? 칸을 눌러 ○(있음) / ✕(없음)으로 바꾸고 ✔ 확인하기를 눌러요.', L(13.5, 12.5), '#94a3b8', L(18, 16), 700);
    }
  }
  function gelPT() {
    return {
      down(p) {
        for (let j = 0; j < 5; j++) {
          const x = gelX(j);
          if (p.x >= x && p.x <= x + GL.gw && p.y >= GL.gy - 20 && p.y <= GL.gy + GL.gh) { gelRun(j); return true; }
          for (let i = 0; i < 3; i++) {
            const ry = GL.ty0 + GL.hh + i * GL.rh;
            if (p.x >= x && p.x <= x + GL.gw && p.y >= ry + 4 && p.y <= ry + GL.rh - 4) { gelTap(i, j); return true; }
          }
        }
        return false;
      },
      hover(p) { for (let j = 0; j < 5; j++) { const x = gelX(j); if (p.x >= x && p.x <= x + GL.gw && p.y >= GL.gy - 20 && p.y < GL.ty0 + GL.hh + 3 * GL.rh) return 'pointer'; } return 'default'; },
    };
  }

  /* ---------- 유전자 분류 (세포 특이적 / 모든 세포에서 켜짐) ---------- */
  const SRG = PHONE
    ? { boxes: [{ id: 'sp', x: 8, y: 66, w: 228, h: 300, label: '세포 특이적 유전자', col: '#ea580c' }, { id: 'cm', x: 244, y: 66, w: 228, h: 300, label: '모든 세포에서 켜진 유전자', col: '#16a34a' }], cw: 146, ch: 44, x0: 8, y0: 400, dx: 156, dy: 54, per: 3, kh: 42 }
    : { boxes: [{ id: 'sp', x: 24, y: 76, w: 372, h: 250, label: '세포 특이적 유전자', col: '#ea580c' }, { id: 'cm', x: 404, y: 76, w: 372, h: 250, label: '모든 세포에서 켜진 유전자', col: '#16a34a' }], cw: 236, ch: 50, x0: 24, y0: 372, dx: 252, dy: 62, per: 3, kh: 44 };
  let srS = null;
  function srInit() {
    srS = selectable({
      cards: GENES.map((g) => ({ id: g.id, label: g.n, col: g.col })),
      boxes: SRG.boxes.map((b) => Object.assign({}, b, { cols: 1, hdr: 34 })),
      tray: (i) => ({ x: SRG.x0 + (i % SRG.per) * SRG.dx, y: SRG.y0 + Math.floor(i / SRG.per) * SRG.dy }),
      cw: SRG.cw, ch: SRG.ch, kh: SRG.kh, onChange: () => updateCtl(),
    });
    srS.layout(true);
  }
  function srState() {
    const bad = [], miss = [];
    GENES.forEach((g) => { const c = srS.cards.find((q) => q.id === g.id); if (!c.zone) miss.push(g.id); else if ((c.zone === 'sp') !== g.specific) bad.push(g.id); });
    return { bad, miss };
  }
  function srDraw(dt, t) {
    TF(VW / 2, PHONE ? 30 : 42, 'mRNA 검출 결과를 보고 유전자 5개를 나눠요', VW - 24, L(20, 16), 12, '#14532d', 'center', 800);
    TF(VW / 2, PHONE ? 52 : 64, '특정 세포에서만 켜지는가, 모든 세포에서 켜지는가?', VW - 24, L(15, 13), 11, '#64748b', 'center', 700);
    srS.update(dt); srS.drawBoxes(); srS.drawCards();
    T(VW / 2, VH - 12, '카드 5장 : 각 상자에 몇 장씩 들어갈까요?', 13, '#94a3b8', 'center', 700);
  }

  /* =========================================================
     ③ 핵의 능력: 핵 이식 (거던의 개구리 / 복제 양 돌리)
     ========================================================= */
  const NTG = PHONE
    ? { pn: { x: 8, y: 8, w: 464, h: 324 }, rs: { x: 8, y: 340, w: 464, h: 292 }, egg: { x: 368, y: 206, r: 70 }, don: { x: 98, y: 206 }, home: { x: 232, y: 172 }, chipY: 30, chipW: 108 }
    : { pn: { x: 14, y: 14, w: 772, h: 320 }, rs: { x: 14, y: 342, w: 772, h: 204 }, egg: { x: 612, y: 198, r: 84 }, don: { x: 152, y: 198 }, home: { x: 382, y: 168 }, chipY: 42, chipW: 182 };
  const NT_DUR = [0, 2.8, 2.6, 3.0, 4.0];
  const NT_CHIPS = PHONE ? ['① 난자 핵 제거', '② 핵 꺼내기', '③ 핵 이식', '④ 발생'] : ['① 난자의 핵 없애기', '② 분화 세포의 핵 꺼내기', '③ 핵을 난자에 넣기', '④ 발생'];
  const NT_BTN = ['난자의 핵 없애기', '분화 세포에서 핵 꺼내기', '핵을 난자에 넣기', '발생 지켜보기'];
  const mkNT = () => ({ done: 0, act: 0, t: 0, dev: 0 });
  S.nt = { frog: mkNT(), dolly: mkNT() };
  S.rate = { ok: false };
  const DOLLY = { eggs: 277, emb: 29, lamb: 1 };
  const ntOf = () => S.nt[S.mode === 'dolly' ? 'dolly' : 'frog'];
  function ntReset(which) {
    if (which) S.nt[which] = mkNT(); else S.nt = { frog: mkNT(), dolly: mkNT() };
    updateCtl();
  }
  function ntNext() {
    const n = ntOf(); if (n.act !== 0 || n.done >= 4) return;
    n.act = n.done + 1; n.t = 0; Sound.click(); updateCtl();
  }
  function ntUpdate(dt) {
    ['frog', 'dolly'].forEach((k) => {
      const n = S.nt[k];
      if (!n.act) return;
      n.t += dt;
      if (n.act === 4) n.dev = clamp(n.t / 3.6, 0, 1);
      if (n.t >= NT_DUR[n.act]) {
        n.done = n.act; n.act = 0; n.t = 0; if (n.done === 4) n.dev = 1;
        Sound.success(); const e = NTG.egg; parts.burst(e.x, e.y, { count: 14, speed: 150, colors: ['#fde68a', '#22c55e', '#fff'] });
        updateCtl();
      }
    });
  }
  const segE = (t, a, b, p0, p1, f) => { const k = clamp((t - a) / (b - a), 0, 1), e = (f || ease.inOutCubic)(k); return { x: p0.x + (p1.x - p0.x) * e, y: p0.y + (p1.y - p0.y) * e }; };
  function ntPose(which) {
    const n = S.nt[which], eg = NTG.egg, dn = NTG.don, hm = NTG.home, frog = which === 'frog';
    const eN0 = { x: eg.x - eg.r * 0.26, y: eg.y - eg.r * 0.18 }, eC = { x: eg.x, y: eg.y + 4 }, dN0 = { x: dn.x, y: dn.y + (frog ? 12 : 0) };
    const P = { tip: { x: hm.x, y: hm.y }, en: { x: eN0.x, y: eN0.y, s: 1, a: 1 }, dnu: { x: dN0.x, y: dN0.y, s: 1, a: 1 }, dim: 0, glow: 0, dev: n.dev, eggNote: n.done >= 1 };
    const d = n.done, a = n.act, t = n.t;
    if (d >= 1) P.en.a = 0;
    if (d === 2) { P.dnu = { x: hm.x, y: hm.y, s: 0.55, a: 1 }; P.dim = 1; }
    if (d >= 3) { P.dnu = { x: eC.x, y: eC.y, s: 1, a: 1 }; P.dim = 1; }
    if (a === 1) {
      P.tip = t < 1.0 ? segE(t, 0, 1.0, hm, eN0) : t < 1.5 ? eN0 : segE(t, 1.5, 2.4, eN0, hm);
      if (t < 1.0) P.en = { x: eN0.x, y: eN0.y, s: 1, a: 1 };
      else P.en = { x: P.tip.x, y: P.tip.y, s: 1 - 0.45 * clamp((t - 1.0) / 0.5, 0, 1), a: t < 2.4 ? 1 : clamp(1 - (t - 2.4) / 0.4, 0, 1) };
      P.eggNote = t > 1.0;
    } else if (a === 2) {
      P.tip = t < 1.0 ? segE(t, 0, 1.0, hm, dN0) : t < 1.4 ? dN0 : segE(t, 1.4, 2.4, dN0, hm);
      if (t < 1.0) P.dnu = { x: dN0.x, y: dN0.y, s: 1, a: 1 };
      else P.dnu = { x: P.tip.x, y: P.tip.y, s: 1 - 0.45 * clamp((t - 1.0) / 0.5, 0, 1), a: 1 };
      P.dim = ease.outCubic(clamp((t - 1.0) / 0.6, 0, 1));
    } else if (a === 3) {
      P.dim = 1;
      P.tip = t < 1.2 ? segE(t, 0, 1.2, hm, eC) : t < 1.8 ? eC : segE(t, 1.8, 2.8, eC, hm);
      if (t < 1.2) P.dnu = { x: P.tip.x, y: P.tip.y, s: 0.55, a: 1 };
      else { const q = segE(t, 1.2, 1.7, P.tip, eC, ease.outBack); P.dnu = { x: q.x, y: q.y, s: 0.55 + 0.45 * ease.outCubic(clamp((t - 1.2) / 0.5, 0, 1)), a: 1 }; }
      P.glow = t > 1.5 ? clamp((t - 1.5) / 0.6, 0, 1) : 0;
    } else if (a === 4) {
      P.dim = 1; P.dnu = { x: eC.x, y: eC.y, s: 1, a: 1 };
    }
    return P;
  }
  function drawNucleus(x, y, r, s, a, t) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    D.sphere(x, y, r * s, '#fde68a', { outline: '#a16207', outlineWidth: 1.5, light: '#fffbeb', dark: '#f5c84b' });
    if (s > 0.8) { ctx.fillStyle = '#7c3aed'; rr(x - 4, y - 2, 8, 4, 2); ctx.fill(); }
    ctx.restore();
  }
  function drawPipette(tip, t, carrying) {
    const ang = -1.2, L1 = 118, ux = Math.cos(ang), uy = Math.sin(ang);   // 끝에서 위쪽으로 뻗는 방향
    const x2 = tip.x + ux * L1, y2 = tip.y + uy * L1, nx = -uy, ny = ux;
    ctx.save();
    const pn = NTG.pn; D.roundRect(pn.x, pn.y, pn.w, pn.h, 16); ctx.clip();
    ctx.beginPath(); ctx.moveTo(tip.x + nx * 1.8, tip.y + ny * 1.8); ctx.lineTo(tip.x + ux * 40 + nx * 6, tip.y + uy * 40 + ny * 6); ctx.lineTo(x2 + nx * 11, y2 + ny * 11); ctx.lineTo(x2 - nx * 11, y2 - ny * 11); ctx.lineTo(tip.x + ux * 40 - nx * 6, tip.y + uy * 40 - ny * 6); ctx.lineTo(tip.x - nx * 1.8, tip.y - ny * 1.8); ctx.closePath();
    const g = ctx.createLinearGradient(tip.x + nx * 11, tip.y + ny * 11, tip.x - nx * 11, tip.y - ny * 11); g.addColorStop(0, 'rgba(186,230,253,.85)'); g.addColorStop(0.5, 'rgba(240,249,255,.65)'); g.addColorStop(1, 'rgba(125,180,220,.8)');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(71,100,140,.75)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  function drawEggCells(cx, cy, r, dev, glow, t) {
    const n = dev < 0.2 ? 1 : dev < 0.45 ? 2 : dev < 0.7 ? 4 : dev < 0.9 ? 8 : 16;
    const pts = [];
    if (n === 2) pts.push([-0.46, 0, 0.5], [0.46, 0, 0.5]);
    else if (n === 4) pts.push([-0.44, -0.44, 0.44], [0.44, -0.44, 0.44], [-0.44, 0.44, 0.44], [0.44, 0.44, 0.44]);
    else if (n === 8) { pts.push([0, 0, 0.3]); for (let k = 0; k < 7; k++) pts.push([Math.cos(k * TAU / 7) * 0.64, Math.sin(k * TAU / 7) * 0.64, 0.3]); }
    else if (n === 16) { pts.push([0, 0, 0.2]); for (let k = 0; k < 6; k++) pts.push([Math.cos(k * TAU / 6) * 0.38, Math.sin(k * TAU / 6) * 0.38, 0.2]); for (let k = 0; k < 9; k++) pts.push([Math.cos(k * TAU / 9 + 0.3) * 0.72, Math.sin(k * TAU / 9 + 0.3) * 0.72, 0.2]); }
    pts.forEach((q) => D.sphere(cx + q[0] * r, cy + q[1] * r, q[2] * r, '#fcd34d', { outline: '#b45309', outlineWidth: 1.4, light: '#fffbeb', dark: '#f59e0b' }));
  }
  function drawBench(which, t) {
    const P = ntPose(which), n = S.nt[which], pn = NTG.pn, eg = NTG.egg, dn = NTG.don, frog = which === 'frog';
    panel(pn.x, pn.y, pn.w, pn.h, 16, '#fff');
    // 접시
    ctx.save(); D.roundRect(pn.x + 6, pn.y + 70, pn.w - 12, pn.h - 76, 14); ctx.fillStyle = '#eef6fb'; ctx.fill(); ctx.restore();
    // 단계 칩
    const cw = NTG.chipW, gap = (pn.w - 16 - cw * 4) / 3;
    for (let k = 0; k < 4; k++) {
      const x = pn.x + 8 + k * (cw + gap), done = n.done > k, now = n.act === k + 1;
      D.roundRect(x, NTG.chipY - 15, cw, 30, 15); ctx.fillStyle = done ? '#16a34a' : now ? '#fde68a' : '#f1f5f9'; ctx.fill();
      ctx.strokeStyle = done ? '#15803d' : now ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = 1.8; ctx.stroke();
      TF(x + cw / 2, NTG.chipY + 5, (done ? '✓ ' : '') + NT_CHIPS[k], cw - 10, L(14, 12.5), 10, done ? '#fff' : '#334155', 'center', 800);
    }
    // 분화한 세포 (기증 세포)
    ctx.save(); ctx.globalAlpha = 1 - 0.42 * P.dim;
    D.shadow(() => {
      ctx.fillStyle = '#ccfbf1'; ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 2.4;
      if (frog) rr(dn.x - 40, dn.y - 58, 80, 116, 20); else { ctx.beginPath(); ctx.arc(dn.x, dn.y, 56, 0, TAU); }
      ctx.fill(); ctx.stroke();
    }, { blur: 8, y: 3 });
    if (frog) { ctx.strokeStyle = 'rgba(15,118,110,.35)'; ctx.lineWidth = 1.5; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(dn.x - 30, dn.y - 46 + k * 7); ctx.lineTo(dn.x + 30, dn.y - 46 + k * 7); ctx.stroke(); } }
    else { for (let k = 0; k < 6; k++) { const a = k * 1.1 + 0.3; D.sphere(dn.x + Math.cos(a) * 36, dn.y + Math.sin(a) * 32, 3.4, '#f8fafc', { outline: '#94a3b8', gloss: false }); } }
    ctx.restore();
    TF(dn.x, dn.y + 82, frog ? '장 상피 세포' : '유선 세포', 140, L(16, 13.5), 11, '#0f766e', 'center', 800);
    TF(dn.x, dn.y + 100, P.dim > 0.5 && n.done < 3 ? '핵을 꺼낸 세포' : '분화한 세포', 140, L(13.5, 12), 10.5, '#64748b', 'center', 700);
    // 난자
    ctx.save();
    D.shadow(() => {
      const g = ctx.createRadialGradient(eg.x - eg.r * 0.3, eg.y - eg.r * 0.35, eg.r * 0.1, eg.x, eg.y, eg.r);
      g.addColorStop(0, '#fffbeb'); g.addColorStop(0.75, '#fde9b8'); g.addColorStop(1, '#f6cf84');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(eg.x, eg.y, eg.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b7791f'; ctx.lineWidth = 2.6; ctx.stroke();
    }, { blur: 10, y: 4 });
    if (P.glow > 0) { ctx.strokeStyle = 'rgba(34,197,94,' + (0.35 + 0.3 * Math.sin(t * 6)) * P.glow + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(eg.x, eg.y, eg.r + 6, 0, TAU); ctx.stroke(); }
    ctx.restore();
    if (n.act === 4 || n.done >= 4) drawEggCells(eg.x, eg.y, eg.r * 0.92, P.dev, P.glow, t);
    TF(eg.x, eg.y + eg.r + 24, n.done >= 4 ? (frog ? '발생 중인 배아' : '발생 중인 배아') : P.eggNote ? '핵을 없앤 난자' : '난자', 200, L(16, 13.5), 11, '#b45309', 'center', 800);
    if (n.done === 3 || (n.act === 3 && n.t > 1.5)) TF(eg.x, eg.y + eg.r + 42, '분화한 세포의 핵을 가진 난자', 220, L(13.5, 12), 10.5, '#15803d', 'center', 700);
    // 핵 (유리관 끝에 매달린 것은 유리관 위에 그려요)
    const carE = n.act === 1 && n.t >= 1.0;
    const carD = (n.act === 2 && n.t >= 1.0) || n.done === 2 || (n.act === 3 && n.t < 1.2);
    if (!carE && (n.done < 1 || n.act === 1)) drawNucleus(P.en.x, P.en.y, 15, P.en.s, P.en.a, t);
    if (!carD && n.act !== 4 && n.done < 4) drawNucleus(P.dnu.x, P.dnu.y, 17, P.dnu.s, P.dnu.a, t);
    drawPipette(P.tip, t);
    if (carE) drawNucleus(P.en.x, P.en.y, 15, P.en.s, P.en.a, t);
    if (carD) drawNucleus(P.dnu.x, P.dnu.y, 17, P.dnu.s, P.dnu.a, t);
    if (n.act === 0 && n.done === 0) {
      T(eg.x - eg.r * 0.26, eg.y - eg.r * 0.18 - 24, '난자의 핵', L(13, 12), '#7c3aed', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
      T(dn.x, dn.y + (frog ? 12 : 0) - 28, '핵', L(13, 12), '#7c3aed', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
    }
  }
  /* ---------- 결과 칸 ---------- */
  const dollySet = (() => { const rnd = mulberry(277); const idx = []; while (idx.length < DOLLY.emb) { const v = Math.floor(rnd() * DOLLY.eggs); if (idx.indexOf(v) < 0) idx.push(v); } return idx; })();
  const dollyLamb = dollySet[0];
  function drawFrogResult(n, t) {
    const rs = NTG.rs; panel(rs.x, rs.y, rs.w, rs.h, 16, '#fff');
    TF(rs.x + 16, rs.y + 28, '결과 : 분화한 장 상피 세포의 핵을 넣은 난자의 발생', rs.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    const labels = ['핵 이식 난자', '2세포', '4세포', '포배', '올챙이'], k = 5, sw = (rs.w - 24) / k, cy = rs.y + L(94, 100);
    for (let i = 0; i < k; i++) {
      const cx = rs.x + 12 + sw * (i + 0.5), vis = n.dev >= i / 4 - 0.001 && (n.act === 4 || n.done >= 4);
      const a = vis ? (n.done >= 4 ? 1 : clamp((n.dev - i / 4) * 6 + 0.3, 0, 1)) : 0.18;
      ctx.save(); ctx.globalAlpha = a;
      const r = Math.min(30, sw * 0.32);
      if (i < 4) {
        ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
        if (i === 0) D.sphere(cx, cy, r * 0.32, '#fde68a', { gloss: false, outline: '#a16207' });
        const cells = i === 1 ? [[-0.5, 0, 0.46], [0.5, 0, 0.46]] : i === 2 ? [[-0.5, -0.5, 0.4], [0.5, -0.5, 0.4], [-0.5, 0.5, 0.4], [0.5, 0.5, 0.4]] : i === 3 ? (() => { const q = [[0, 0, 0.22]]; for (let m = 0; m < 6; m++) q.push([Math.cos(m * TAU / 6) * 0.52, Math.sin(m * TAU / 6) * 0.52, 0.22]); for (let m = 0; m < 6; m++) q.push([Math.cos(m * TAU / 6 + 0.5) * 0.82, Math.sin(m * TAU / 6 + 0.5) * 0.82, 0.18]); return q; })() : [];
        cells.forEach((q) => D.sphere(cx + q[0] * r, cy + q[1] * r, q[2] * r, '#fcd34d', { gloss: false, outline: '#b45309', outlineWidth: 1.2 }));
      } else {
        const wob = RM ? 0 : Math.sin(t * 7) * 3;
        ctx.fillStyle = '#4b5d3a'; ctx.strokeStyle = '#2f3d24'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx - 6, cy, r * 0.62, r * 0.46, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - 3); ctx.quadraticCurveTo(cx + r * 1.0, cy - 8 + wob, cx + r * 1.3, cy + 3 + wob); ctx.quadraticCurveTo(cx + r * 1.0, cy + 8 + wob, cx + r * 0.5, cy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        D.sphere(cx - r * 0.4, cy - r * 0.1, 3, '#fff', { gloss: false });
      }
      ctx.restore();
      TF(cx, cy + r + 24, labels[i], sw - 6, L(14, 12.5), 10.5, vis ? '#26324a' : '#94a3b8', 'center', 800);
      if (i < k - 1) D.arrow(cx + r + 6, cy, cx + sw - r - 8, cy, { color: vis ? '#16a34a' : '#cbd5e1', width: 2.2, head: 8 });
    }
    if (n.done >= 4) textBlock(rs.x + 16, rs.y + rs.h - L(48, 56), rs.w - 32, '일부 난자는 올챙이까지 발생했어요 → 분화한 세포의 핵도 개체를 만드는 데 필요한 유전 정보를 모두 가지고 있어요.', L(14, 13), '#15803d', L(19, 18), 800);
    else T(rs.x + 16, rs.y + rs.h - 16, n.act === 4 ? '발생하는 중이에요…' : '④ 발생까지 진행하면 결과가 나와요.', 13.5, '#94a3b8', 'left', 700);
  }
  function drawDollyResult(n, t) {
    const rs = NTG.rs; panel(rs.x, rs.y, rs.w, rs.h, 16, '#fff');
    TF(rs.x + 16, rs.y + 28, '결과 : 유선 세포의 핵을 이식한 난자 277개의 운명', rs.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    const dev = n.dev, cols = 28, sp = PHONE ? 14.4 : 13.8, gx = rs.x + (PHONE ? 30 : 20), gy = rs.y + (PHONE ? 46 : 46);
    const phase1 = clamp(dev / 0.3, 0, 1), phase2 = clamp((dev - 0.3) / 0.35, 0, 1), phase3 = clamp((dev - 0.65) / 0.25, 0, 1);
    const started = n.act === 4 || n.done >= 4;
    for (let i = 0; i < DOLLY.eggs; i++) {
      const x = gx + (i % cols) * sp + sp / 2, y = gy + Math.floor(i / cols) * sp + sp / 2;
      const shown = !started ? 0.16 : (i / DOLLY.eggs <= phase1 ? 1 : 0.16);
      const embIdx = dollySet.indexOf(i);
      let c = '#94a3b8', rad = sp * 0.34;
      if (started && embIdx >= 0 && embIdx / DOLLY.emb < phase2) { c = '#f59e0b'; rad = sp * 0.4; }
      if (started && i === dollyLamb && phase3 > 0) { c = '#16a34a'; rad = sp * (0.4 + 0.25 * ease.outBack(phase3)); }
      ctx.save(); ctx.globalAlpha = shown; D.sphere(x, y, rad, c, { gloss: false }); ctx.restore();
      if (started && i === dollyLamb && phase3 > 0.2) { D.ring(x, y, sp * 0.75, t, { color: '#16a34a', width: 2 }); }
    }
    const rows = Math.ceil(DOLLY.eggs / cols), ty = gy + rows * sp + 22;
    const lines = [];
    lines.push([phase1 >= 1 || n.done >= 4, '#64748b', '이식한 난자 ' + DOLLY.eggs + '개']);
    lines.push([phase2 >= 1 || n.done >= 4, '#d97706', '→ 초기 배아 ' + DOLLY.emb + '개']);
    lines.push([phase3 >= 1 || n.done >= 4, '#16a34a', '→ 새끼 양 ' + DOLLY.lamb + '마리 (돌리)']);
    const fin = n.done >= 4;
    if (!PHONE) {
      const rx = gx + cols * sp + 26, rw = rs.x + rs.w - rx - 14;
      lines.forEach((q, k) => { if (q[0]) T(rx, gy + 16 + k * 25, q[2], 16, q[1], 'left', 800); });
      if (S.rate.ok && fin) D.label(rx, gy + 16 + 3 * 25 + 8, '성공률 1 / 277 ≈ 0.4 %', { bg: '#15803d', size: 14, align: 'left' });
      if (fin) textBlock(rx, gy + 16 + 3 * 25 + 40, rw, '분화한 세포의 핵에도 모든 유전 정보가 있어요. 난자의 세포질이 발현 프로그램을 다시 써요.', 13.5, '#15803d', 18, 800);
      else T(rx, gy + 16 + 3 * 25 + 8, n.act === 4 ? '발생하는 중이에요…' : '④ 발생까지 진행하면', 13.5, '#94a3b8', 'left', 700), !n.act && T(rx, gy + 16 + 3 * 25 + 26, '결과가 나와요.', 13.5, '#94a3b8', 'left', 700);
    } else {
      const parts2 = lines.filter((q) => q[0]).map((q) => q[2]).join(' ');
      if (parts2) TF(rs.x + 16, ty - 4, parts2, rs.w - 32, 14, 11, '#26324a', 'left', 800);
      if (S.rate.ok && fin) D.label(rs.x + 16, ty + 24, '성공률 1 / 277 ≈ 0.4 %', { bg: '#15803d', size: 13.5, align: 'left' });
      if (fin) textBlock(rs.x + 16, ty + 52, rs.w - 32, '분화한 세포의 핵에도 모든 유전 정보가 있어요. 난자의 세포질이 발현 프로그램을 다시 써요.', 13, '#15803d', 17, 800);
      else T(rs.x + 16, ty + 14, n.act === 4 ? '발생하는 중이에요…' : '④ 발생까지 진행하면 결과가 나와요.', 13.5, '#94a3b8', 'left', 700);
    }
  }
  function ntDraw(dt, t) {
    const which = S.mode === 'dolly' ? 'dolly' : 'frog', n = S.nt[which];
    drawBench(which, t);
    if (which === 'frog') drawFrogResult(n, t); else drawDollyResult(n, t);
  }
  const ntDoneBoth = () => S.nt.frog.done >= 4 && S.nt.dolly.done >= 4;

  /* =========================================================
     ④ 분화 유도: 섬유아세포에 MyoD(전사 인자)를 넣으면
     ========================================================= */
  const MG = PHONE
    ? { cell: { x: 8, y: 8, w: 464, h: 196 }, ins: { x: 8, y: 212, w: 464, h: 206 }, tb: { x: 8, y: 426, w: 464, h: 206 }, cx: 232, cy: 112, hl0: 54, hl1: 138, hw0: 28, hw1: 25, gx0: 22, gdx: 112, gw: 100 }
    : { cell: { x: 14, y: 14, w: 490, h: 292 }, ins: { x: 14, y: 316, w: 490, h: 230 }, tb: { x: 516, y: 14, w: 270, h: 532 }, cx: 259, cy: 168, hl0: 78, hl1: 190, hw0: 36, hw1: 32, gx0: 30, gdx: 115, gw: 100 };
  const MD_GENES = [
    { id: 'resp', n: '세포호흡 효소', col: '#10b981' },
    { id: 'act', n: '근육 액틴', col: '#ef4444' },
    { id: 'myo', n: '미오신', col: '#f97316' },
    { id: 'myod', n: 'MyoD', col: '#2563eb' },
  ];
  const mdBox = (k) => ({ x: MG.ins.x + MG.gx0 + k * MG.gdx, y: MG.ins.y + L(128, 112), w: MG.gw, h: 46 });
  const mkMD = () => ({ view: 0, grp: -1, t: 0, m: 0, on: [1, 0, 0], lv: [1, 0, 0], myod: 0, prot: [], acc: 0, hit: [0, 0], vec: 0, ctrlDone: false, expDone: false, flash: [0, 0, 0, 0] });
  S.md = mkMD();
  function mdGo() {
    const m = S.md; if (m.grp >= 0) return;
    if ((m.view === 0 && m.ctrlDone) || (m.view === 1 && m.expDone)) return;
    // 같은 세포로 다시 시작 (대조군 → 실험군 순서로 실험해도 세포 상태는 매번 처음부터)
    const keep = { view: m.view, ctrlDone: m.ctrlDone, expDone: m.expDone };
    Object.assign(S.md, mkMD(), keep);
    S.md.grp = m.view; Sound.click(); updateCtl();
  }
  function mdReset() { S.md = mkMD(); updateCtl(); }
  function mdView(v) {
    const m = S.md; if (m.grp >= 0) return;
    if (m.view === v) return;
    const keep = { ctrlDone: m.ctrlDone, expDone: m.expDone };
    Object.assign(S.md, mkMD(), keep); S.md.view = v; Sound.click(); updateCtl();
  }
  function mdUpdate(dt) {
    const m = S.md;
    // 불빛(LED) 부드럽게
    for (let k = 0; k < 3; k++) m.lv[k] = approach(m.lv[k], m.on[k], dt, 8);
    for (let k = 0; k < 4; k++) m.flash[k] = Math.max(0, m.flash[k] - dt * 2);
    m.myod = approach(m.myod, m.grp === 1 && m.t > 0.7 ? 1 : (m.expDone && m.view === 1 ? 1 : 0), dt, 7);
    if (m.grp < 0) {
      m.m = approach(m.m, m.expDone && m.view === 1 ? 1 : 0, dt, 4);
      return;
    }
    m.t += dt;
    if (m.grp === 0) { if (m.t >= 4) { m.ctrlDone = true; m.grp = -1; Sound.success(); updateCtl(); } return; }
    // 실험군: 유전자 넣기 → MyoD 단백질 → 두 유전자 켜짐 → 세포 모양 변화
    m.vec = clamp(m.t / 0.8, 0, 1);
    if (m.t > 1.0 && m.t < 3.3) {
      m.acc += dt;
      while (m.acc > 0.16) {
        m.acc -= 0.16;
        const a = mdBox(3), tg = m.prot.length % 2 === 0 ? 1 : 2, b = mdBox(tg);
        m.prot.push({ x: a.x + a.w / 2, y: a.y - 4, tx: b.x + b.w / 2, ty: b.y - 6, k: 0, tg });
      }
    }
    for (let i = m.prot.length - 1; i >= 0; i--) {
      const q = m.prot[i]; q.k += dt / 0.9;
      if (q.k >= 1) {
        m.flash[q.tg] = 1; m.hit[q.tg - 1]++; m.prot.splice(i, 1);
      }
    }
    if (m.t >= 2.8 && !m.on[1]) { m.on[1] = 1; m.flash[1] = 1.4; Sound.success(); const b = mdBox(1); parts.burst(b.x + b.w / 2, b.y + 12, { count: 10, speed: 120, colors: ['#ef4444', '#fde68a'] }); updateCtl(); }
    if (m.t >= 3.5 && !m.on[2]) { m.on[2] = 1; m.flash[2] = 1.4; Sound.success(); const b = mdBox(2); parts.burst(b.x + b.w / 2, b.y + 12, { count: 10, speed: 120, colors: ['#f97316', '#fde68a'] }); updateCtl(); }
    if (m.t >= 3.6) m.m = approach(m.m, 1, dt, 1.3);
    if (m.t >= 3.6 && m.m > 0.97) { m.m = 1; m.expDone = true; m.grp = -1; Sound.level(); const c = MG; parts.burst(c.cx, c.cy, { count: 22, speed: 190, colors: ['#ef4444', '#f97316', '#fde68a', '#fff'] }); updateCtl(); }
  }
  function mdCellPath(cx, cy, hl, hw, e) {
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU, c = Math.cos(a), s = Math.sin(a);
      const x = cx + hl * Math.sign(c) * Math.pow(Math.abs(c), e), y = cy + hw * Math.sign(s) * Math.pow(Math.abs(s), e);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function mdDraw(dt, t) {
    mdUpdate(dt);
    const m = S.md, c = MG.cell, ins = MG.ins, tb = MG.tb;
    // --- 세포 보기 ---
    panel(c.x, c.y, c.w, c.h, 16, '#fff');
    ctx.save(); D.roundRect(c.x + 8, c.y + 40, c.w - 16, c.h - 48, 14); ctx.fillStyle = '#eef6fb'; ctx.fill(); ctx.restore();
    const showMuscle = m.m > 0.6;
    TF(c.x + 16, c.y + 26, showMuscle ? '근육 세포' : m.grp === 0 ? '대조군 : MyoD를 넣지 않고 관찰하는 중' : m.grp === 1 ? 'MyoD 유전자를 넣은 섬유아세포' : m.view === 0 ? '대조군 : MyoD를 넣지 않은 섬유아세포' : '실험군 : MyoD 유전자를 넣을 섬유아세포', c.w - 32, L(16, 13.5), 11, showMuscle ? '#b91c1c' : '#14532d', 'left', 800);
    const hl = lerp(MG.hl0, MG.hl1, ease.inOutCubic(m.m)), hw = lerp(MG.hw0, MG.hw1, m.m), e = lerp(1, 0.4, ease.inOutCubic(m.m));
    ctx.save();
    D.shadow(() => {
      mdCellPath(MG.cx, MG.cy, hl, hw, e);
      ctx.fillStyle = C.mix('#e9d5ff', '#fda4af', m.m); ctx.fill(); ctx.strokeStyle = C.mix('#7e22ce', '#be123c', m.m); ctx.lineWidth = 2.4; ctx.stroke();
    }, { blur: 9, y: 3 });
    if (m.m > 0.3) {   // 근육 섬유의 가로무늬
      ctx.save(); mdCellPath(MG.cx, MG.cy, hl, hw, e); ctx.clip();
      const a = clamp((m.m - 0.3) / 0.7, 0, 1) * 0.5;
      for (let x = MG.cx - hl; x < MG.cx + hl; x += 12) { ctx.fillStyle = 'rgba(159,18,57,' + a + ')'; ctx.fillRect(x, MG.cy - hw, 5, hw * 2); }
      ctx.restore();
    } else {   // 섬유아세포: 가는 섬유(콜라젠 섬유처럼 보이는 선)
      ctx.strokeStyle = 'rgba(126,34,206,.28)'; ctx.lineWidth = 1.4;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(MG.cx - hl * 0.8, MG.cy + k * hw * 0.28); ctx.quadraticCurveTo(MG.cx, MG.cy + k * hw * 0.28 + (k % 2 ? 4 : -4), MG.cx + hl * 0.8, MG.cy + k * hw * 0.28); ctx.stroke(); }
    }
    ctx.restore();
    // 핵
    const nr = L(22, 18);
    D.sphere(MG.cx, MG.cy, nr, '#fde68a', { outline: '#a16207', outlineWidth: 1.6, light: '#fffbeb', dark: '#f5c84b' });
    if (m.myod > 0.05) { ctx.save(); ctx.globalAlpha = m.myod; D.sphere(MG.cx - nr * 0.35, MG.cy - nr * 0.15, 6, '#2563eb', { gloss: false }); ctx.restore(); }
    if (m.grp === 1 && m.vec < 1) {   // 유전자 조각이 핵으로 들어가요
      const p = ease.inOutCubic(m.vec), sx = c.x + 50, sy = c.y + 70;
      const x = lerp(sx, MG.cx - nr * 0.35, p), y = lerp(sy, MG.cy - nr * 0.15, p);
      D.sphere(x, y, 7, '#2563eb', { outline: '#1e3a8a' });
      T(x + 12, y - 12, 'MyoD 유전자', L(13, 12), '#1d4ed8', 'left', 800, { stroke: '#fff', strokeWidth: 3 });
    }
    if (m.grp === 0) T(MG.cx, c.y + c.h - 22, '⏳ ' + Math.min(4, m.t).toFixed(1) + ' / 4.0 초 관찰', L(14, 13), '#475569', 'center', 800);
    if (m.grp < 0 && m.view === 0 && m.ctrlDone) T(MG.cx, c.y + c.h - 22, '시간이 지나도 섬유아세포 그대로 : 근육 유전자 mRNA 없음', L(14, 12.5), '#475569', 'center', 800);
    if (m.grp < 0 && m.view === 1 && !m.expDone) T(MG.cx, c.y + c.h - 22, '▶ 실험 시작을 눌러 MyoD 유전자를 넣어요', L(14, 12.5), '#475569', 'center', 800);
    if (m.expDone && m.view === 1) T(MG.cx, c.y + c.h - 22, '세포 모양이 길쭉한 근육 세포로 바뀌었어요', L(14, 12.5), '#b91c1c', 'center', 800);
    // --- 핵 속 유전자 ---
    panel(ins.x, ins.y, ins.w, ins.h, 16, '#fff');
    TF(ins.x + 16, ins.y + 26, '핵 속 DNA 확대 : 유전자 스위치', ins.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    const by = mdBox(0).y + 23;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ins.x + 14, by); ctx.lineTo(ins.x + ins.w - 14, by); ctx.stroke(); ctx.lineCap = 'butt';
    for (let k = 0; k < 4; k++) {
      const b = mdBox(k), g = MD_GENES[k];
      const sc = k === 3 ? clamp(m.myod, 0, 1) : 1;
      if (sc < 0.02) {
        D.roundRect(b.x, b.y, b.w, b.h, 10); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
        T(b.x + b.w / 2, b.y + b.h / 2 + 5, '(아직 없음)', L(13, 12), '#94a3b8', 'center', 700);
        continue;
      }
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(sc, sc); ctx.translate(-b.w / 2, -b.h / 2);
      const lv = k < 3 ? m.lv[k] : 1;
      D.shadow(() => { D.roundRect(0, 0, b.w, b.h, 10); ctx.fillStyle = k === 3 ? '#dbeafe' : C.mix('#f1f5f9', C.shade(g.col, 0.6), lv); ctx.fill(); ctx.strokeStyle = k === 3 ? '#2563eb' : C.mix('#94a3b8', g.col, lv); ctx.lineWidth = 2.4; ctx.stroke(); }, { blur: 6, y: 2 });
      if (k > 0 && k < 3) { ctx.fillStyle = '#7c3aed'; rr(-10, 12, 9, 22, 3); ctx.fill(); }   // 조절 서열
      ctx.restore();
      TF(b.x + b.w / 2, b.y + b.h / 2 + 5, g.n, b.w - 8, L(15, 13), 10.5, '#26324a', 'center', 800);
      if (k < 3) {
        // LED + mRNA
        const ledOn = m.lv[k];
        D.sphere(b.x + b.w - 14, b.y - 12, 7, ledOn > 0.5 ? '#22c55e' : '#cbd5e1', { gloss: ledOn > 0.5 });
        if (ledOn > 0.5) D.glow(b.x + b.w - 14, b.y - 12, 16, '#22c55e', 0.45 * ledOn);
        if (ledOn > 0.05) {
          ctx.save(); ctx.globalAlpha = ledOn; ctx.strokeStyle = g.col; ctx.lineWidth = 2.6; ctx.beginPath();
          for (let i = 0; i <= 24; i++) { const x = b.x + 8 + i * 3, y = b.y - L(26, 24) + Math.sin(i * 0.9 + t * 5) * 3; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.stroke(); ctx.restore();
          T(b.x + b.w - 10, b.y - L(36, 33), 'mRNA', L(12.5, 11.5), g.col, 'right', 800);
        }
        if (k > 0 && m.flash[k] > 0) { const f = clamp(m.flash[k], 0, 1); ctx.save(); ctx.strokeStyle = col(g.col, f * 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(b.x + 2, b.y + b.h / 2, 10 + (1 - f) * 14, 0, TAU); ctx.stroke(); ctx.restore(); }
      } else {
        T(b.x + b.w / 2, b.y + b.h + L(20, 18), '새로 넣은 유전자', L(13, 12), '#1d4ed8', 'center', 800);
      }
    }
    T(MG.ins.x + 14, MG.ins.y + MG.ins.h - 12, '■ 보라색 조각 = 조절 서열(전사 인자가 붙는 곳)', L(13, 12), '#7c3aed', 'left', 700);
    // MyoD 단백질 알갱이
    m.prot.forEach((q) => {
      const k = q.k, x = lerp(q.x, q.tx, k), y = lerp(q.y, q.ty, k) - Math.sin(k * Math.PI) * 38;
      D.sphere(x, y, 6, '#3b82f6', { outline: '#1e3a8a', outlineWidth: 1 });
    });
    if (m.prot.length || (m.grp === 1 && m.t > 1.0 && m.t < 3.4)) { const b = mdBox(3); T(ins.x + ins.w - 14, ins.y + 26, 'MyoD 단백질 = 전사 인자', L(14, 12.5), '#1d4ed8', 'right', 800); }
    // --- 결과 표 ---
    panel(tb.x, tb.y, tb.w, tb.h, 16, '#fff');
    TF(tb.x + 14, tb.y + 26, 'mRNA 검출 결과', tb.w - 28, L(16, 13.5), 11, '#14532d', 'left', 800);
    const tw = PHONE ? 120 : 72, nameW = tb.w - 28 - tw * 2;
    const hx = tb.x + 14 + nameW;
    T(hx + tw / 2, tb.y + 52, '도입 전', L(14, 13), '#64748b', 'center', 800);
    T(hx + tw * 1.5, tb.y + 52, m.view === 0 && m.grp !== 1 ? '대조군' : '넣은 뒤', L(14, 13), m.view === 0 && m.grp !== 1 ? '#64748b' : '#1d4ed8', 'center', 800);
    const rh = PHONE ? 36 : 54;
    for (let k = 0; k < 3; k++) {
      const y = tb.y + 64 + k * rh;
      ctx.fillStyle = k % 2 ? '#f8fafc' : '#f1f5f9'; rr(tb.x + 8, y, tb.w - 16, rh - 4, 8); ctx.fill();
      D.sphere(tb.x + 20, y + (rh - 4) / 2, 5, MD_GENES[k].col, { gloss: false });
      TF(tb.x + 30, y + (rh - 4) / 2 + 5, MD_GENES[k].n, nameW - 20, L(14, 13), 10.5, '#26324a', 'left', 800);
      const before = k === 0, now = m.on[k] === 1;
      [before, now].forEach((v, j) => {
        const cx = hx + tw * (j + 0.5), cy = y + (rh - 4) / 2;
        if (v) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, TAU); ctx.stroke(); }
        else { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8); ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx - 8, cy + 8); ctx.stroke(); ctx.lineCap = 'butt'; }
      });
    }
    const ty = tb.y + 64 + 3 * rh + 14;
    T(tb.x + 14, ty + 4, '○ 있음    ✕ 없음', 13, '#94a3b8', 'left', 700);
    if (!PHONE) {
      const msg = m.expDone && m.view === 1 ? 'MyoD 단백질은 전사 인자예요. 근육 액틴과 미오신 유전자의 조절 서열에 붙어 두 유전자를 켰어요. 그 결과 세포가 근육 세포로 바뀌었어요.' : m.ctrlDone && m.view === 0 ? '대조군은 근육 유전자 mRNA가 계속 없어요. MyoD가 없으면 섬유아세포로 남아요.' : 'MyoD 유전자를 넣으면 무엇이 달라질까요? 대조군과 실험군을 모두 해 보세요.';
      textBlock(tb.x + 14, ty + 40, tb.w - 28, msg, 14, m.expDone && m.view === 1 ? '#15803d' : '#475569', 19, 800);
      // 두 실험의 완료 표시
      const yy = tb.y + tb.h - 74;
      T(tb.x + 14, yy, (m.ctrlDone ? '✅' : '⬜') + ' 대조군 관찰', 14, '#26324a', 'left', 800);
      T(tb.x + 14, yy + 26, (m.expDone ? '✅' : '⬜') + ' 실험군 (MyoD 넣음)', 14, '#26324a', 'left', 800);
    }
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  let srPT = null;
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = m === 'gel' ? gelPT() : m === 'sort' ? srPT : m === 'cells' ? cellsPT : null;
    hideHint(); updateCtl();
  }
  const cellsPT = {
    down(p) {
      for (let ci = 0; ci < 3; ci++) for (let gj = 0; gj < 3; gj++) {
        const b = cBox(ci, gj);
        if (inRect(p.x, p.y, b)) { dnaStart(ci, gj, 0); updateCtl(); return true; }
      }
      return false;
    },
    hover(p) { for (let ci = 0; ci < 3; ci++) for (let gj = 0; gj < 3; gj++) if (inRect(p.x, p.y, cBox(ci, gj))) return 'pointer'; return 'default'; },
  };
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const dn = dnaDone();
    $('#dnaList').innerHTML = '<li class="' + (dn === 9 ? 'on' : '') + '">' + mark(dn === 9) + ' DNA 검사 ' + dn + ' / 9칸</li>';
    $('#gelList').innerHTML = '<li class="' + (gelRanN() === 5 ? 'on' : '') + '">' + mark(gelRanN() === 5) + ' 겔 ' + gelRanN() + ' / 5</li><li class="' + (gelFilled() === 15 ? 'on' : '') + '">' + mark(gelFilled() === 15) + ' 표 ' + gelFilled() + ' / 15칸 채움</li>';
    $('#gelAll').disabled = gelRanN() === 5;
    const n = ntOf(), frog = S.mode !== 'dolly';
    $('#ntHead').textContent = frog ? '🐸 거던의 개구리 핵 이식 (1962)' : '🐑 복제 양 돌리 (1996)';
    $('#ntNote').innerHTML = frog ? '개구리 <b>장 상피 세포</b>(분화한 세포)의 핵을 <b>핵을 없앤 난자</b>에 넣고 발생을 지켜봐요.' : '양의 <b>유선 세포</b>(분화한 세포)의 핵을 <b>핵을 없앤 난자</b>에 넣어요. 이식한 난자 277개의 결과를 확인해요.';
    $('#ntNext').textContent = n.done >= 4 ? '✔ 완료' : n.act ? '진행 중…' : '▶ ' + NT_BTN[n.done];
    $('#ntNext').disabled = n.done >= 4 || !!n.act;
    $('#ntRateBox').hidden = frog || n.done < 4;
    $('#ntList').innerHTML = '<li class="' + (S.nt.frog.done >= 4 ? 'on' : '') + '">' + mark(S.nt.frog.done >= 4) + ' 거던의 개구리 실험</li><li class="' + (S.nt.dolly.done >= 4 ? 'on' : '') + '">' + mark(S.nt.dolly.done >= 4) + ' 돌리 만들기</li><li class="' + (S.rate.ok ? 'on' : '') + '">' + mark(S.rate.ok) + ' 성공률 계산</li>';
    const m = S.md;
    chipSet($('#mdView'), m.view);
    $$('#mdView button').forEach((b) => { b.disabled = m.grp >= 0; b.classList.toggle('seen', (b.dataset.v === '0' && m.ctrlDone) || (b.dataset.v === '1' && m.expDone)); });
    $('#mdGo').textContent = m.grp >= 0 ? '진행 중…' : ((m.view === 0 && m.ctrlDone) || (m.view === 1 && m.expDone)) ? '✔ 완료' : '▶ 실험 시작';
    $('#mdGo').disabled = m.grp >= 0 || (m.view === 0 && m.ctrlDone) || (m.view === 1 && m.expDone);
    $('#mdList').innerHTML = '<li class="' + (m.ctrlDone ? 'on' : '') + '">' + mark(m.ctrlDone) + ' 대조군 관찰</li><li class="' + (m.expDone ? 'on' : '') + '">' + mark(m.expDone) + ' 실험군 : MyoD 넣기</li>';
  }
  bindModes(setMode);
  $('#dnaAll').addEventListener('click', () => { Sound.click(); dnaAll(); });
  $('#dnaReset').addEventListener('click', () => { Sound.click(); dnaReset(); });
  $('#gelAll').addEventListener('click', () => { Sound.click(); gelRunAll(); });
  $('#gelReset').addEventListener('click', () => { Sound.click(); gelReset(); });
  $('#srClear').addEventListener('click', () => { Sound.click(); srS.reset(); srS.markBad([]); updateCtl(); });
  $('#ntNext').addEventListener('click', ntNext);
  $('#ntReset').addEventListener('click', () => { Sound.click(); ntReset(S.mode === 'dolly' ? 'dolly' : 'frog'); if (S.mode === 'dolly') rateReset(); });
  $('#mdGo').addEventListener('click', mdGo);
  $('#mdReset').addEventListener('click', () => { Sound.click(); mdReset(); });
  $$('#mdView button').forEach((b) => b.addEventListener('click', () => mdView(+b.dataset.v)));
  function rateReset() { S.rate.ok = false; const e = $('#inRate'); e.value = ''; e.classList.remove('ok'); updateCtl(); }
  $('#inRate').addEventListener('input', () => {
    const v = numOf('inRate'), ok = isFinite(v) && v >= 0.3 && v <= 0.5; const was = S.rate.ok; S.rate.ok = ok;
    $('#inRate').classList.toggle('ok', ok); if (ok && !was) { Sound.success(); parts.burst(NTG.rs.x + NTG.rs.w / 2, NTG.rs.y + 60, { count: 14, speed: 150 }); } updateCtl();
  });

  /* ---------- 단계 · 미션 ---------- */
  const levels = [
    {
      title: '같은 유전자를 가진 세포', short: '같은 유전자', icon: '🧫', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 수정란 하나가 나뉜 모든 세포가 같은 유전자를 갖는데, 어떻게 적혈구도 되고 신경 세포도 될까?</p><p>🔗 <b>앞 차시</b>에서 진핵생물은 전사 인자의 조합에 따라 켜지는 유전자가 달라진다고 배웠어요. <b>생명과학</b>에서는 체세포 분열이 DNA를 복제해 똑같이 나눠 준다고 배웠어요.</p><p>사람 몸에는 세포가 약 <b>200종</b>, 유전자가 약 <b>2만 개</b> 있어요. 다세포 생물의 체세포는 수정란이 체세포 분열로 만든 것이라 같은 유전체를 가져요. 먼저 모양과 기능이 아주 다른 세포 3종의 <b>DNA를 검사</b>해서 정말 같은지 확인해요. (검사 결과는 가상 자료)</p>',
      features: ['cells'],
      setup() { dnaReset(); setMode('cells'); },
      recap: '적혈구 전구세포 · 이자 β세포 · 수정체 세포의 DNA에는 글로빈, 인슐린, 크리스탈린 유전자가 모두 있어요. 분화한 세포도 필요 없는 유전자를 잃지 않고, 같은 유전체를 가져요.',
      summary: '<ul><li>다세포 생물의 체세포는 수정란이 <b>체세포 분열</b>(DNA 복제 후 분배)로 만든 것이라 모두 <b>같은 유전체</b>를 가져요.</li><li>사람 몸의 세포는 약 <b>200종</b>, 유전자는 약 <b>2만 개</b>예요.</li><li>(가상 검사) 적혈구 전구세포 · 이자 β세포 · 수정체 세포의 DNA에는 <b>글로빈 · 인슐린 · 크리스탈린 유전자가 모두 있어요</b> (9칸 모두 ○).</li><li>세포가 달라 보이는 것은 유전자를 잃어서가 아니에요. <b>발현하는 유전자가 달라서</b>예요 (다음 단계).</li></ul>',
      missions: [
        {
          id: 'dna', title: 'DNA 검사 9칸 실행',
          goal: '세포 3종의 DNA에서 <b>글로빈 · 인슐린 · 크리스탈린</b> 유전자를 검사하세요. 칸을 눌러 <b>9칸</b>을 모두 검사해요.',
          hint: '표의 칸을 하나씩 눌러도 되고, 오른쪽의 ▶ 남은 칸 모두 검사 단추를 눌러도 돼요.',
          setup() { dnaReset(); setMode('cells'); },
          check: () => dnaDone() === 9, hold: 0.8,
          status: () => mark(dnaDone() === 9) + ' DNA 검사 ' + dnaDone() + ' / 9칸',
          explain: '세 세포의 DNA에서 <b>세 유전자가 모두 검출</b>됐어요(9칸 모두 ○). 적혈구 전구세포에도 인슐린 유전자가, 이자 β세포에도 글로빈 유전자가 있어요. 세포의 종류가 달라도 <b>유전체는 같아요</b>.',
        },
        {
          type: 'quiz', title: '분화한 세포는 유전자를 잃었을까',
          goal: '적혈구 전구세포에도 인슐린 유전자가 있었어요. 이를 바르게 해석한 것은?',
          setup() { setMode('cells'); },
          choices: ['분화한 세포는 필요 없는 유전자를 잃는다', '모든 체세포가 같은 유전체를 가지고, 세포마다 사용하는 유전자만 다르다', '인슐린 유전자는 이자 β세포에만 있고 검사가 틀렸다', '세포가 분화할 때 유전자가 세포마다 절반씩 나뉜다'],
          answer: 1,
          feedback: ['검사 결과는 반대예요. 적혈구 전구세포에도 인슐린 유전자가 있었어요.', '', '9칸 모두 ○였어요. 세 유전자는 세 세포 모두의 DNA에 있어요.', '체세포 분열은 DNA를 복제한 뒤 똑같이 나눠 줘서 모든 체세포가 같은 유전체를 가져요.'],
          explain: '분화는 유전자를 잃는 것이 아니에요. 모든 체세포는 <b>같은 유전체</b>를 가지고, <b>어떤 유전자를 발현하느냐</b>가 달라서 서로 다른 세포가 돼요.',
        },
      ],
    },
    {
      title: '세포마다 다른 유전자 발현', short: '선택 발현', icon: '🧪', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 세포는 같은 유전체를 가진다는 것을 확인했어요.</div><p>그런데 세포마다 만드는 단백질이 달라요. 유전자가 있어도 <b>mRNA로 전사되어야</b> 단백질이 만들어져요. 세 세포에서 mRNA를 뽑아 <b>전기영동</b>으로 검출하면 어떤 유전자가 발현 중인지 알 수 있어요. 겔에 <b>밴드</b>가 나타나면 그 mRNA가 있는 거예요. (가상 자료)</p><p>글로빈 · 인슐린 · 크리스탈린 말고도 <b>세포호흡 효소</b>와 <b>리보솜 단백질</b> 유전자를 함께 검출해 표를 완성해요.</p>',
      features: ['gel'],
      setup() { gelReset(); srS.reset(); srS.markBad([]); setMode('gel'); },
      recap: '글로빈 · 인슐린 · 크리스탈린 mRNA는 해당 세포에만 있어요(세포 특이적 발현). 세포호흡 효소와 리보솜 단백질 mRNA는 모든 세포에 있어요. 같은 유전체에서 세포마다 다른 유전자가 발현돼요.',
      summary: '<ul><li>DNA는 같아도 <b>mRNA는 세포마다 달라요</b> : 글로빈 mRNA는 적혈구 전구세포에만, 인슐린 mRNA는 이자 β세포에만, 크리스탈린 mRNA는 수정체 세포에만 있어요.</li><li><b>세포 특이적 유전자</b>: 특정 세포에서만 발현(글로빈, 인슐린, 크리스탈린). <b>모든 세포에서 켜진 유전자</b>(하우스키핑 유전자): 세포호흡 효소, 리보솜 단백질.</li><li>인슐린 유전자는 적혈구 전구세포에도 있지만 <b>전사되지 않아서</b> mRNA와 단백질이 없어요.</li><li>세포마다 단백질이 달라서 모양과 기능이 달라져요 → 분화는 <b>유전자 발현 조절</b>의 결과예요.</li></ul>',
      missions: [
        {
          id: 'gel', title: 'mRNA 검출 겔 5개 실행',
          goal: '유전자 5가지의 <b>겔을 눌러</b> 세포 3종의 mRNA를 검출하세요.',
          hint: '겔(어두운 네모)을 눌러도 되고, 오른쪽 ▶ 5가지 모두 검출 단추를 눌러도 돼요. 밴드가 모두 나타날 때까지 잠깐 기다려요.',
          setup() { gelReset(); setMode('gel'); },
          check: () => gelRanN() === 5 && S.gel.p.every((p) => p >= 1), hold: 0.6,
          status: () => mark(gelRanN() === 5) + ' 겔 ' + gelRanN() + ' / 5 &nbsp; ' + mark(S.gel.p.every((p) => p >= 1)) + ' 밴드 확인',
          explain: '겔에서 <b>밴드가 있는 레인</b>이 그 mRNA를 가진 세포예요. 글로빈은 1번 레인(적혈구 전구세포), 인슐린은 2번(이자 β세포), 크리스탈린은 3번(수정체 세포)에만 밴드가 있고, 세포호흡 효소와 리보솜 단백질은 세 레인 모두 밴드가 있어요.',
        },
        {
          id: 'table', title: '밴드 읽어 표 완성', manual: true,
          goal: '밴드를 읽고 표의 15칸을 <b>○(있음) / ✕(없음)</b>으로 채운 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '칸을 누르면 ? → ○ → ✕ 순서로 바뀌어요. 같은 줄 위쪽 겔에서 그 세포의 레인(적 · β · 수)에 밴드가 있으면 ○예요.',
          setup() { setMode('gel'); },
          check() {
            const f = gelFilled();
            if (gelRanN() < 5) return '아직 검출하지 않은 겔이 있어요. 모든 겔을 눌러 밴드를 확인해요.';
            if (f < 15) return '표에 ' + (15 - f) + '칸이 남았어요. ? 칸을 눌러 ○ 또는 ✕로 바꿔요.';
            const r = gelCheck();
            if (r.wrongN) return '빨간 칸 ' + r.wrongN + '개가 겔의 밴드와 달라요. 해당 레인(적 · β · 수)을 다시 확인해요.';
            S.gel.okAll = true; return true;
          },
          explain: '세포 특이적 유전자는 <b>해당 세포에만</b> ○예요(글로빈 - 적혈구 전구세포, 인슐린 - 이자 β세포, 크리스탈린 - 수정체 세포). 세포호흡 효소와 리보솜 단백질은 세포 3종 모두 ○예요.',
        },
        {
          id: 'sort', title: '세포 특이적 유전자와 공통 유전자', manual: true,
          goal: '유전자 5개를 <b>세포 특이적 유전자 / 모든 세포에서 켜진 유전자</b> 상자에 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '표에서 ○가 한 세포에만 있으면 세포 특이적, 세 세포 모두에 있으면 모든 세포에서 켜진 유전자예요.',
          setup() { srS.reset(); srS.markBad([]); setMode('sort'); },
          check() {
            const s = srState();
            if (s.miss.length) { srS.markBad([]); return '카드 ' + s.miss.length + '장이 아직 보관함에 있어요.'; }
            srS.markBad(s.bad);
            if (s.bad.length) return '빨간 카드는 상자가 달라요. 표에서 ○가 몇 개의 세포에 있는지 세어 보세요.';
            return true;
          },
          explain: '<b>세포 특이적 유전자</b>: 글로빈 · 인슐린 · 크리스탈린. <b>모든 세포에서 켜진 유전자</b>: 세포호흡 효소 · 리보솜 단백질 (세포가 살아가는 데 모두 필요해서 하우스키핑 유전자라고도 해요).',
        },
        {
          type: 'quiz', title: '유전자는 있는데 단백질은 없는 까닭',
          goal: '인슐린 유전자는 적혈구 전구세포의 DNA에도 있지만 이 세포에는 인슐린이 없어요. 가장 알맞은 까닭은?',
          setup() { setMode('gel'); },
          choices: ['적혈구 전구세포는 인슐린 유전자를 잃어버렸기 때문이다', '인슐린 유전자의 염기 서열이 세포마다 다르기 때문이다', '이 세포에서는 인슐린 유전자가 전사되지 않아 mRNA와 단백질이 만들어지지 않기 때문이다', '단백질은 mRNA 없이도 DNA에서 바로 만들어지기 때문이다'],
          answer: 2,
          feedback: ['앞 단계의 DNA 검사에서 적혈구 전구세포에도 인슐린 유전자가 있었어요.', '모든 세포가 같은 유전체를 가지니 염기 서열은 같아요.', '', '단백질은 전사로 만든 mRNA를 번역해서 만들어요. mRNA가 없으면 단백질도 없어요.'],
          explain: '같은 유전체를 가져도 세포마다 <b>발현(전사)되는 유전자가 달라서</b> 만들어지는 mRNA와 단백질이 달라요. 이것이 세포의 모양과 기능이 달라지는 까닭이에요.',
        },
      ],
    },
    {
      title: '분화한 세포의 핵은 무엇을 가졌나', short: '핵의 능력', icon: '🐑', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포마다 발현하는 유전자가 다르다는 것을 확인했어요. 그렇다면 분화한 세포의 핵은 <b>나머지 유전자를 아직 가지고</b> 있을까요?</div><p>이를 확인하려면 분화한 세포의 핵을 <b>핵을 없앤 난자</b>에 넣어 개체로 자라는지 보면 돼요. 거던(1962)은 <b>개구리 장 상피 세포</b>의 핵으로, 1996년 복제 양 <b>돌리</b>는 <b>유선 세포</b>의 핵으로 이 실험을 했어요. 단계마다 단추를 눌러 핵 이식을 모형으로 따라가요.</p>',
      features: ['nt'],
      setup() { ntReset(); rateReset(); setMode('frog'); },
      recap: '분화한 세포의 핵을 핵을 없앤 난자에 넣었더니 올챙이와 새끼 양(돌리)이 발생했어요. 분화한 세포의 핵에도 모든 유전 정보가 있고, 분화는 유전자를 잃는 것이 아니라 발현이 다른 거예요. 난자의 세포질이 핵의 발현 프로그램을 다시 써요.',
      summary: '<ul><li><b>핵 이식</b>: 분화한 세포에서 핵을 꺼내 핵을 없앤 난자에 넣고 발생을 지켜보는 실험이에요.</li><li><b>거던(1962)</b>: 개구리 장 상피 세포(분화한 세포)의 핵을 이식하면 일부가 올챙이까지 발생했어요.</li><li><b>복제 양 돌리(1996)</b>: 유선 세포 핵을 이식한 난자 277개 → 초기 배아 29개 → 새끼 양 1마리 (성공률 1 / 277 ≈ 0.4 %).</li><li>의미: 분화한 세포의 핵에도 개체를 만드는 <b>모든 유전 정보</b>가 있어요. 분화는 유전자를 잃는 것이 아니라 <b>발현이 다른 것</b>이에요.</li><li>난자의 세포질이 이식한 핵의 발현 프로그램을 다시 써요.</li></ul>',
      missions: [
        {
          id: 'nt', title: '핵 이식 모형 완성과 성공률 계산',
          goal: '<b>거던의 개구리</b>와 <b>복제 양 돌리</b>의 핵 이식을 4단계까지 진행하고, 돌리의 <b>성공률(%)</b>을 계산해 입력하세요.',
          hint: '위쪽 단추로 두 실험을 차례로 보고, ▶ 단추를 눌러 ①~④를 진행해요. 돌리는 1 / 277 × 100 = 약 0.4 (%)예요.',
          setup() { ntReset(); rateReset(); setMode('frog'); },
          check: () => ntDoneBoth() && S.rate.ok, hold: 0.8,
          status: () => mark(S.nt.frog.done >= 4) + ' 개구리 실험 &nbsp; ' + mark(S.nt.dolly.done >= 4) + ' 돌리 &nbsp; ' + mark(S.rate.ok) + ' 성공률',
          explain: '두 실험에서 분화한 세포의 핵을 넣은 난자가 <b>개체로 발생</b>했어요. 돌리는 이식한 난자 277개 중 새끼 양이 1마리였으므로 성공률은 1 / 277 ≈ <b>0.4 %</b>예요.',
        },
        {
          type: 'quiz', title: '돌리가 증거인 까닭',
          goal: '돌리의 성공률은 약 0.4 %로 낮았어요. 돌리는 분화한 세포의 유전 정보에 대한 증거가 될까요?',
          setup() { setMode('dolly'); },
          choices: ['성공률이 낮으므로 증거가 될 수 없다', '유선 세포 핵 하나에서 완전한 양이 발생했으므로, 분화한 세포의 핵에도 모든 유전 정보가 온전히 있다는 증거이다', '난자의 핵이 양이 되었으므로 유선 세포의 핵과는 관계가 없다', '유선 세포는 유선 유전자만 가지고 있다는 증거이다'],
          answer: 1,
          feedback: ['낮은 성공률은 실험이 어렵다는 뜻이지만, 한 번이라도 완전한 개체가 발생했다는 사실은 분명한 증거예요.', '', '난자의 핵은 미리 없앴어요. 새끼 양의 유전 정보는 이식한 유선 세포의 핵에서 왔어요.', '반대예요. 유선 세포의 핵에서 양 한 마리의 모든 형질이 나왔으니 유선 유전자만 가진 것이 아니에요.'],
          explain: '유선 세포 핵 하나만으로 <b>새끼 양 한 마리</b>가 발생했으니 그 핵에 개체를 만드는 모든 유전 정보가 온전히 있었어요. 성공률이 낮은 것은 핵의 발현 프로그램을 난자 세포질에서 다시 쓰는 일이 쉽지 않기 때문이지, 증거를 약하게 만들지 않아요.',
        },
      ],
    },
    {
      title: '전사 인자로 분화 유도하기', short: '분화 유도', icon: '💪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분화한 세포도 모든 유전자를 가지고 있고, 분화는 <b>발현의 차이</b>라는 것을 확인했어요. <b>앞 차시</b>에서는 전사 인자가 조절 서열에 붙어 유전자를 켠다고 배웠어요.</div><p>그렇다면 <b>전사 인자 하나</b>로 세포의 운명을 바꿀 수 있을까요? 1987년 실험에서 피부 결합 조직의 <b>섬유아세포</b>에 전사 인자 <b>MyoD</b> 유전자를 넣었더니, 근육 세포 특이적 유전자(근육 액틴 · 미오신)가 켜지고 세포가 <b>근육 세포</b>로 변했어요. <b>대조군</b>과 <b>실험군</b>을 비교해 확인해요.</p>',
      features: ['myod'],
      setup() { mdReset(); setMode('myod'); },
      recap: '전사 인자 MyoD가 근육 액틴과 미오신 같은 근육 특이적 유전자를 켜서 섬유아세포가 근육 세포로 바뀌었어요. 세포의 분화는 전사 인자가 어떤 유전자를 켜느냐에 따라 일어나는 유전자 발현 조절의 결과예요.',
      summary: '<ul><li><b>MyoD</b>는 전사 인자예요. 섬유아세포에 MyoD 유전자를 넣으면 MyoD 단백질이 근육 액틴 · 미오신 같은 <b>근육 세포 특이적 유전자</b>의 조절 서열에 붙어 그 유전자들을 켜요.</li><li>그 결과 mRNA와 단백질이 만들어지고 세포가 <b>근육 세포</b>으로 바뀌어요. 세포호흡 효소처럼 모든 세포에서 켜진 유전자는 그대로 켜져 있어요.</li><li><b>대조군</b>(MyoD를 넣지 않음)은 변하지 않았어요 → 변화의 원인은 MyoD예요.</li><li>정리: 같은 유전체를 가진 세포가 서로 다른 세포가 되려면 <b>서로 다른 유전자가 발현</b>돼야 하고, 이는 <b>전사 인자 조합</b>이 달라서 일어나요. 세포 분화는 유전자 발현 조절 과정을 통해 일어나요.</li></ul>',
      missions: [
        {
          id: 'myod', title: '대조군과 MyoD 실험군 비교',
          goal: '<b>대조군</b>을 관찰한 뒤 <b>실험군</b>에 MyoD를 넣고, 근육 유전자 mRNA가 어떻게 변하는지 확인하세요.',
          hint: '위쪽 두 단추 중 하나를 고르고 ▶ 실험 시작을 눌러요. 두 실험을 모두 끝까지 지켜봐요. (실험군은 약 6초)',
          setup() { mdReset(); setMode('myod'); },
          check: () => S.md.ctrlDone && S.md.expDone && S.md.on[1] === 1 && S.md.on[2] === 1, hold: 0.8,
          status: () => mark(S.md.ctrlDone) + ' 대조군 &nbsp; ' + mark(S.md.expDone) + ' 실험군 &nbsp; ' + mark(S.md.on[1] === 1 && S.md.on[2] === 1) + ' 근육 mRNA',
          explain: '대조군은 근육 액틴 · 미오신 mRNA가 계속 <b>없었고</b> 모양도 그대로였어요. MyoD를 넣은 실험군은 두 유전자가 <b>켜져</b> mRNA가 생기고 세포가 근육 세포로 바뀌었어요. 달라진 조건은 MyoD 하나뿐이니 MyoD가 원인이에요.',
        },
        {
          type: 'quiz', title: '분화를 일으킨 직접 원인',
          goal: '섬유아세포가 근육 세포로 바뀐 직접적인 원인은?',
          setup() { setMode('myod'); },
          choices: ['섬유아세포의 DNA에 근육 유전자가 새로 생겨서', '전사 인자 MyoD가 근육 세포 특이적 유전자를 켜서', '필요 없는 유전자를 모두 버려서', '세포 모양이 먼저 길어져서'],
          answer: 1,
          feedback: ['섬유아세포의 DNA에도 근육 유전자는 원래 있었어요. 꺼져 있었을 뿐이에요.', '', '유전자를 버리는 것이 아니에요. 같은 유전체에서 켜지는 유전자가 달라진 거예요.', '모양은 유전자가 켜진 결과로 바뀌어요. 먼저 일어난 일은 MyoD가 유전자를 켠 거예요.'],
          explain: '<b>전사 인자 MyoD</b>가 근육 액틴 · 미오신 같은 유전자를 켜고, 그 단백질이 만들어져 세포가 근육 세포로 바뀌어요. DNA 자체는 바뀌지 않아요.',
        },
        {
          type: 'quiz', title: '같은 유전체, 다른 세포',
          goal: '같은 유전체를 가진 두 세포가 서로 다른 종류의 세포가 되려면 무엇이 달라야 할까요?',
          setup() { setMode('myod'); },
          choices: ['유전체의 염기 서열', '유전자의 개수', '발현되는 유전자 (활성화된 전사 인자의 조합)', '핵의 개수'],
          answer: 2,
          feedback: ['같은 유전체이므로 염기 서열은 같아요.', '유전자 수도 같아요. 달라지는 것은 켜지는 유전자예요.', '', '핵의 개수는 세포 종류를 정하는 원인이 아니에요.'],
          explain: '세포의 종류는 <b>어떤 유전자가 발현되는가</b>로 정해져요. 세포마다 활성화된 <b>전사 인자의 조합</b>이 달라서 켜지는 유전자가 달라요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-cell-differentiation', mount: '#game', badge: '분화 탐정', homeHref: '../../index.html#hg',
    featureLabels: { cells: '🧫 세포 3종 DNA 검사', gel: '🧪 mRNA 검출과 분류', nt: '🐸 핵 이식 모형', myod: '💪 MyoD 실험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'cells') { const n = dnaDone(); setReads(['검사한 칸', n + ' / 9', '있음 (○)', n + '칸', '없음 (✕)', '0칸']); }
    else if (m === 'gel') setReads(['검출한 겔', gelRanN() + ' / 5', '표에 채운 칸', gelFilled() + ' / 15', '세포 특이적', S.gel.okAll ? '글로빈 · 인슐린 · 크리스탈린' : '?']);
    else if (m === 'sort') setReads(['놓은 카드', srS.cards.filter((c) => c.zone).length + ' / 5', '상자', '2개', '기준', '몇 가지 세포에서 켜질까?']);
    else if (m === 'frog' || m === 'dolly') {
      const n = ntOf();
      setReads(['핵 이식 단계', n.done + ' / 4', '분화한 세포', m === 'frog' ? '장 상피 세포' : '유선 세포', m === 'frog' ? '결과' : '성공률', m === 'frog' ? (n.done >= 4 ? '올챙이까지 발생' : '—') : (S.rate.ok ? '1 / 277 ≈ 0.4 %' : '? %')]);
    } else {
      const q = S.md;
      setReads(['대조군', q.ctrlDone ? '근육 mRNA 없음' : '—', '실험군', q.expDone ? 'MyoD → 근육 mRNA 생김' : '—', '세포 모양', q.m > 0.6 ? '근육 세포' : '섬유아세포']);
    }
  }

  /* ---------- 시작 ---------- */
  srInit(); srPT = sorterPT(() => srS);
  setMode('cells');
  let lastFree = false, lastLv = -1;
  function frameFn(dt, t) {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    ntUpdate(dt);
    switch (S.mode) {
      case 'cells': dnaDraw(dt, t); break;
      case 'gel': gelDraw(dt, t); break;
      case 'sort': srDraw(dt, t); break;
      case 'frog': case 'dolly': ntDraw(dt, t); break;
      case 'myod': mdDraw(dt, t); break;
    }
    FX.update(dt); FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  }
  SciSim.loop(frameFn);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    frameFn, S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, cBox, dnaStart, dnaAll, dnaDone, gelRun, gelRunAll, gelTap, gelCheck, gelX, GL, PRES,
    get srS() { return srS; }, srState, SRG, ntNext, ntReset, NTG, NT_DUR, mdGo, mdView, mdReset, MG, rateReset, ntDoneBoth,
  };
})();
